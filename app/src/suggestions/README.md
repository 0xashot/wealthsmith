# Suggestion Engine (MVP)

Deterministic product logic that decides what recommendation exists for the
user's REAL wallet state. The MVP is live: three states — **Top Up Safety
Buffer**, **Rebalance** (bucket-level), and **On Track** — plus **Top Pick
selection**, the **UI card mapper**, and the shared real-wallet Suggestions rail
on both the **Dashboard and Portfolio**. Step 9A additionally **contracts** four
future categories (capital_efficiency, staking, stable_yield,
position_optimization) — types, ordering, mapper, and copy only, with **no
trigger logic yet**.

## Layer responsibilities (hard rules)

| Layer | Owns | Must not |
| --- | --- | --- |
| Suggestion Engine (here) | Deciding what suggestions exist, their reasons, scores, guardrails | Use AI, invent prices/amounts, import UI or demo fixtures |
| Top Pick Logic (later step) | Marking exactly one valid actionable suggestion `is_top_pick` | Be decided by the UI, Smith AI, or card order |
| UI (`SuggestionRail` / `SuggestionCard`) | Rendering structured output | Generate, rank, or reorder suggestions |
| Smith AI | **Explaining** engine output via reason codes | Creating, changing, or re-ranking suggestions |

Source of truth: `rules/suggestion-engine-rules.md`, `rules/top-pick-rules.md`,
`rules/financial-logic-boundaries.md`, `content/suggestion-card-copy.md`,
`checklists/suggestion-top-pick-checklist.md`.

## Files

- `engineTypes.ts` — canonical engine OUTPUT contract (`EngineSuggestion`,
  `SuggestionEngineResult`). The UI's `SuggestionCardState`
  (`app/src/types/dashboard.ts`) stays a separate rendering type; a mapper
  (engine output → approved copy templates → card state) is a later step.
- `engineInputs.ts` — canonical INPUT snapshot (`SuggestionEngineInputs`),
  referencing existing sourced derivations (positions, value breakdown,
  Safety Buffer, allocation + deltas, SavedGoal). Adapter comes later.
- `engineThresholds.ts` — approved MVP constants (engine version, min
  suggestion size, rebalance delta). Deliberately NO buffer-month constant.
- `engineInputAdapter.ts` — deterministic adapter from live app data
  (positions, value breakdown, derived risk-based Safety Buffer, SavedGoal) to
  `SuggestionEngineInputs`. Real-wallet data only, never demo fixtures.
- `bufferSuggestion.ts` — the Top Up Safety Buffer rule
  (`deriveBufferSuggestion`): underfunded buffer → review-only suggestion
  sized to the shortfall; shortfall under the $50 minimum → disabled
  suggestion with a failed `min_trade_size` guardrail. Consumes the derived
  risk-based target; never defines buffer months.
- `rebalanceSuggestion.ts` — the bucket-level Rebalance rule
  (`deriveRebalanceSuggestion`): only when the Safety Buffer is FULLY FUNDED and
  the crypto allocation deviates from its risk-based target by ≥ ±10%. Crypto
  overweight → move crypto→stables (amount = total × |delta|); crypto
  underweight → move stables→crypto, capped at the stablecoins ABOVE the buffer
  target (never the buffer itself); no excess → no suggestion. Bucket-level
  only — no token selection, no "sell/buy" language. Below-$50 amounts →
  disabled with a failed `min_trade_size` guardrail.
- `onTrackSuggestion.ts` — the informational On Track state
  (`deriveOnTrackSuggestion`): appears only when the buffer is fully funded AND
  the crypto allocation is within the ±10% threshold, i.e. neither actionable
  rule fires. No CTA, no amount, `is_actionable: false`, and never a Top Pick.
- `topPick.ts` — deterministic Top Pick selector (`selectTopPick`). Pure, no
  input mutation; returns new suggestion objects with `is_top_pick` recomputed.
  Eligible = actionable + `review_only` + not `on_track`. Ranks by category
  (Buffer > Rebalance), then impact ↓, urgency ↓, efficiency ↓ (null = 0), then
  id ↑. Marks exactly one winner, or none when no eligible candidate exists.
- `toSuggestionCard.ts` — deterministic mapper `EngineSuggestion →
  SuggestionCardState` (`toSuggestionCard`, `toSuggestionCards`). Reads
  title/description from `SUGGESTION_COPY` by key (missing key → safe fallback,
  never invented); preserves `is_top_pick` exactly; PRESERVES INPUT ORDER (a
  plain map — no sort, no Top-Pick reordering); CTA is always non-transactional.
  `warningsToNotice` maps `partial_pricing` → the approved notice string (the
  rail decides whether to show it in Step 7B). Imports the card TYPE only — no
  UI components, no demo fixtures.
- `engine.ts` — `runSuggestionEngine(inputs, generatedAt?)` ordering: Safety
  Buffer first; if underfunded, buffer suggestion ONLY (Buffer Override); if
  funded, Rebalance if it fires, else On Track — then `selectTopPick` marks at
  most one. Adds the `partial_pricing` warning and reports `missing_data` when
  required inputs are absent.
- `suggestionEngine.fixtures.ts` — executable fixture scenarios A–F (no test
  framework in this app); run with
  `npx esbuild src/suggestions/suggestionEngine.fixtures.ts --bundle --format=esm --platform=node --outfile=/tmp/fixtures.mjs && node -e "import('/tmp/fixtures.mjs').then(m => m.printFixtureResults())"`.

## Approved MVP decisions (recorded Step 2)

1. **Safety Buffer target comes from the existing risk-based product logic.**
   The engine consumes the DERIVED Safety Buffer state (targetMonths,
   targetUsd, stableUsd, shortfallUsd, riskTolerance) through
   `SuggestionEngineInputs.safetyBuffer` — already computed before the engine
   runs. The engine does not define target months, and there is no fixed
   3-month MVP constant.
2. **Rebalance is bucket-level** (Crypto ↔ Stables): "Reduce crypto exposure" /
   "Increase crypto exposure". No `sell_token`/`buy_token` in MVP — token-level
   selection requires a later approved token-selection rule. (The copy system's
   fallback title path already covers token-less rebalance.)
3. **Missing guardrail data is honest** (see the guardrail model below): cost,
   liquidity, and slippage have no data source in this prototype (no quote/route
   infrastructure), so those guardrails are reported as `not_evaluated` — never
   invented, never silently passed.

## Guardrail model (Step 9I)

Every suggestion carries a list of `SuggestionGuardrail` (`{ code, status, message? }`).
Statuses are standardized and, critically, **honest** — a status is only `passed`
when the engine actually has the data to check it. Constructors live in
[`guardrails.ts`](./guardrails.ts) so every rule emits the same shape.

| Status | Meaning |
| --- | --- |
| `passed` | Evaluated against real data and satisfied. |
| `failed` | Evaluated and violated (e.g. below `min_trade_size`). Suggestion is disabled. |
| `warning` | Evaluated with a non-blocking concern. |
| `not_evaluated` | The check is relevant but **no data source exists yet** — the honest state for the market-execution guardrails today. |
| `not_applicable` | The check does not apply to this suggestion at all (e.g. informational On Track proposes no action). |

**Evaluated today** (real inputs): `min_trade_size`, `buffer_protection`,
`pricing_available`, `allocation_delta`, plus each category's own threshold
codes (`idle_asset_threshold`, `token_scope`, `contribution_available`,
`allocation_gap`, `sol_fee_reserve`, `position_value_threshold`,
`apy_data_review`, `concentration_review`, …).

**Execution guardrails — `not_evaluated` today** (`cost_available`,
`liquidity_available`, `slippage_available`): these depend on quote/route data
the app does not have. `engine.ts` calls `ensureExecutionGuardrails` after Top
Pick selection so **every** suggestion carries all three; any a rule omitted are
appended as `not_evaluated`. On Track instead marks them `not_applicable`
(it proposes no action). These are the ONLY guardrails a rule may leave for the
helper to fill — nothing here ever becomes `passed` until real data is wired in.

**What data unlocks them later:** a swap/route quote (e.g. Jupiter) provides the
expected **cost** (fees + price impact), on-chain **liquidity** depth for the
route, and the resulting **slippage** vs. a reference price. Only then may the
engine emit `passed`/`failed`/`warning` for `cost_available` /
`liquidity_available` / `slippage_available`, feed a real `efficiency` score,
and let those guardrails influence Top Pick ranking. Until then Top Pick ranks
on category priority → impact → urgency → (null efficiency) → id, unaffected by
the `not_evaluated` execution guardrails.

Raw guardrail codes/statuses are **engine-internal**: the card mapper
(`toSuggestionCard`) drops the `guardrails` field entirely, so cards never
surface `cost_available`, `not_evaluated`, etc.

## Protocol / platform selection (Step 9J)

Every suggestion carries an optional `protocolSelection` ([`ProtocolSelection`](./engineTypes.ts))
describing whether a specific protocol/platform has — or could ever have — been
chosen to carry it out. Constructors live in
[`protocolSelection.ts`](./protocolSelection.ts). **No protocol is ever chosen
yet**: this prototype has no reliable protocol data source, so selection is only
`not_evaluated` or `not_applicable`.

| Status | Meaning | Emitted today? |
| --- | --- | --- |
| `not_evaluated` | Selection is RELEVANT but no data source exists yet — a protocol *will* be chosen later. | Yes (staking, stable_yield) |
| `not_applicable` | Selection does not apply to this suggestion at all (review-only / bucket-level / informational). | Yes (all other categories) |
| `unavailable` | Selection attempted, no eligible protocol / required data found. | **No — reserved** |
| `selected` | A protocol was deterministically chosen from real data. | **No — reserved** |

`selectedProtocolId` / `selectedProtocolName` are present **only** when
`status === "selected"`; the constructors enforce this and no rule sets
`selected`. The `selected` and `unavailable` paths exist in the contract only.

**By category:**

- `not_evaluated` (a protocol will eventually be chosen): **staking**
  (reasons: missing apy/tvl/risk/lockup data), **stable_yield** (reasons:
  missing apy/tvl/risk/liquidity/lockup data).
- `not_applicable` (`selection_not_required`): **buffer**, **rebalance**,
  **capital_efficiency**, **trim**, **dca**, **position_optimization**
  (review-only — proposes no new protocol), **on_track** (informational).

**Guardrail link (single source of truth):** the `protocol_selection` guardrail
is derived centrally in `engine.ts` via `reconcileProtocolGuardrail`, mirroring
the model — `not_evaluated → not_evaluated`, `not_applicable → not_applicable`,
`unavailable → warning`, `selected → passed`. Category rules set the
`protocolSelection` model and never hand-set this guardrail, so the two can't
drift. It is never `passed` without a real `selected` selection.

**Not on cards:** the mapper drops `protocolSelection` (and all guardrails), so
cards keep saying "Put Idle SOL to Work" / "Put Stablecoins to Work" / "Review
Existing Yield Positions" — never "use Kamino/Jupiter/Marinade/Jito", "best
protocol", "highest APY", or "safest vault".

**Data required before `selected` is allowed** (until then selection stays
`not_evaluated`; nothing below is ever invented):

- *Staking / liquid staking:* eligible asset · APY · TVL / liquidity ·
  withdrawal (unstake) behavior · validator or LST risk metadata · fees ·
  supported wallet/action route · protocol availability.
- *Stable yield:* stable-asset support · APY · TVL · utilization · risk score ·
  audit / security data · withdrawal lockup · deposit/withdraw fees · historical
  reliability (if available).
- *LP / vault:* supported pair/assets · APY range · impermanent-loss exposure ·
  TVL · withdrawal behavior · pool risk · fee/reward structure · liquidity depth.

## Review details (Step 10A — data model only)

Each suggestion carries an optional structured `reviewDetails`
([`SuggestionReviewDetails`](./engineTypes.ts)) that explains *why* it fired and
*what* was measured — the data a future **Review drawer (Step 10B)** will render.
**Step 10A adds DATA ONLY: no drawer UI, no visible change, cards stay simple.**

`reviewDetails` is **engine-owned** and built deterministically by each rule via
[`buildReviewDetails`](./suggestionReviewDetails.ts). It has:

- `summary` — approved `title` / `reason` / `categoryLabel` (never AI-generated).
- `metrics` — only values backed by engine inputs (allocations, amounts, counts).
- `involvedAssets` / `involvedPositions` — real detected assets/positions and
  their role; never unknown/unpriced assets, never invented protocol/APY data.
- `calculations` — simple user-facing formulas (current vs target vs threshold).
- `guardrailSummary` — guardrails grouped into **user-facing labels** (Checked /
  Not evaluated yet / Not applicable). Raw codes (`cost_available`,
  `protocol_selection`, …) are NEVER exposed; cost/liquidity/slippage stay "Not
  evaluated yet"; protocol selection follows the model.
- `limitations` — what WealthSmith has *not* done (route cost / liquidity /
  slippage not evaluated, protocol not selected, review-only). On Track gets none.
- `safetyNotes` — review-only / no transaction / no signature / will not move
  funds for you. On Track uses informational notes only.

The card mapper (`toSuggestionCard`) does **not** read `reviewDetails`, so cards
are unchanged and never leak it. Nothing here adds transactions, signatures,
protocol selection, or invented APY/TVL/risk/liquidity/slippage/route/cost data.

**Step 10B renders this in a modal.** `useRailSuggestions` also returns
`reviewDetailsById` (keyed by the same stable suggestion id as the cards). The
shared [`RealWalletSuggestionsRail`](../components/RealWalletSuggestionsRail.tsx)
owns the open state, and clicking **Review** on a real-wallet card opens
[`SuggestionReviewModal`](../components/SuggestionReviewModal.tsx), which renders
the sections above (summary, metrics, involved assets/positions, calculations,
grouped guardrails, limitations, safety notes). The modal is **read-only**: no
transaction, signature, fund movement, protocol handoff, or AI — it only renders
engine-owned data, with guardrails shown as friendly labels (never raw codes).
Dashboard and Portfolio share the exact same behavior via this one rail. Demo
Mode uses `SuggestionRail` directly and is untouched.

## MVP scope and step plan

- Step 2 (done): contracts/types/thresholds/docs.
- Step 3 (done): **Top Up Safety Buffer** rule + input adapter + engine shell
  + executable fixtures. All engine actions are review-only or disabled —
  never a transaction.
- Step 4 (done): **Rebalance** rule (bucket-level Crypto ↔ Stables). Token-level
  sell/buy selection is NOT implemented. The Safety Buffer blocks Rebalance
  until fully funded. Still no Top Pick, no UI cards, no transactions.
- Step 5 (done): **On Track** informational state — appears only when Buffer and
  Rebalance do not trigger. Not actionable, not a Top Pick, no CTA.
- Step 6 (done): **Top Pick selection** (`selectTopPick`) — deterministic, not
  chosen by UI or AI. On Track and disabled suggestions are never Top Pick;
  exactly one actionable suggestion is marked when eligible (Buffer > Rebalance,
  then impact → urgency → efficiency → id).
- Step 7A (done): **UI card mapper** (`toSuggestionCard`). Maps only — it does
  not generate, rank, select Top Pick, or sort; it preserves engine order.
- Step 7B (done): **wired into the real-wallet Dashboard rail**. The placeholder
  is replaced only when the engine can run; otherwise a polished unavailable
  state. Partial-pricing warning shows as a soft notice above the cards. CTAs
  are review-only and non-transactional. `SuggestionCard` renders
  `status: "disabled"` as a non-actionable (dimmed, disabled-button + reason)
  card.
- Step 7C (done): **Portfolio wired to the SAME rail**. Both pages now use the
  shared `useRailSuggestions` hook (derive inputs → `runSuggestionEngine` →
  `toSuggestionCards` + signature-gated lift) and the shared
  `RealWalletSuggestionsRail` renderer, so Dashboard and Portfolio show
  identical suggestions (title, amount, Top Pick, disabled state, notice, order)
  for the same wallet + saved goal. No Portfolio-specific suggestion logic,
  ranking, Top Pick, or ordering. `savedGoal` is threaded App → PortfolioPage →
  RealWalletPortfolio; each page reuses its own single wallet read (no extra
  read for suggestions). The **Smith AI chatbot is out of scope** — only the
  right-side suggestions rail is wired. **Demo Mode remains fixture-based and
  untouched.**
- Step 9A (done): **contracts for the full category set** — added
  capital_efficiency / staking / stable_yield / position_optimization to the
  category + reason-code unions, the `CATEGORY_PRIORITY` map, Top Pick
  eligibility, the mapper (category/type maps + safe fallback), and placeholder
  copy keys.
- Step 9B (done): **idle-SOL staking trigger** (`deriveStakingSuggestion`,
  category `staking`). Fires only when the Safety Buffer is fully funded and the
  wallet holds TRULY LIQUID SOL (exact `SOL`/`WSOL`, native/token, wallet
  source, priced) whose amount above a 0.1 SOL fee reserve is worth ≥ $50 —
  never LSTs, native stake, or protocol SOL, never the full balance, no invented
  APY/protocol. Engine order when funded: Rebalance, then Staking (On Track only
  when neither fires). Fixtures 9B-A…J cover Buffer Override, Top Pick ordering,
  reserve/min-size, LST/unpriced exclusion, WSOL, partial pricing, and mapping.
- Step 9C (done): **stablecoin yield trigger** (`deriveStableYieldSuggestion`,
  category `stable_yield`, "Put Stablecoins to Work"). PRODUCT RULE: approved
  conservative stablecoin yield stays Safety-Buffer-eligible, so this does NOT
  require stables above the buffer/allocation — it fires when the buffer is fully
  funded, **Rebalance does not apply**, and LIQUID WALLET stablecoins (approved
  STABLE_SYMBOLS, wallet source, priced — never protocol/yield/LP/unknown/USDY)
  total ≥ $100. Eligible amount = the FULL liquid wallet stable value. Safety
  Buffer accounting (`walletSummary.stableValueOf`) already counts liquid wallet
  stables AND all-stable no-debt protocol positions (e.g. USDC on Kamino) as
  buffer-eligible, excluding volatile-LP/debt/unpriced. Engine order when funded:
  Rebalance → Staking → Stable Yield (Stable Yield suppressed if Rebalance
  fired). Copy: "stablecoin/conservative yield", never "stake USDC". Fixtures
  9C-A…J.
- Step 9D (done): **position-optimization review trigger**
  (`derivePositionOptimizationSuggestion`, category `position_optimization`,
  "Review Existing Yield Positions"). Reviews only EXISTING DEPLOYED positions
  (LST / native stake / protocol, priced) that meet a deterministic condition —
  missing sourced APY (≥ $100), low sourced APY (< 1%, ≥ $100), or
  over-concentration (≥ $1,000 AND ≥ 50% of the priced portfolio). Returns ONE
  aggregated suggestion (flagged total value, unique reason codes) — never one
  card per position, never names a replacement protocol or calls a position bad.
  Lowest-priority actionable candidate; may coexist with Rebalance/Staking/Stable
  Yield. Fixtures 9D-A…K.
- Step 9E (done): **capital efficiency / idle assets trigger**
  (`deriveCapitalEfficiencySuggestion`, category `capital_efficiency`, "Review
  Idle Assets"). Flags meaningful LIQUID WALLET crypto NOT covered by other rules
  — priced wallet tokens excluding SOL/WSOL (staking), stablecoins (stable
  yield), and LST/stake/protocol (position optimization) and unknown tokens.
  Aggregate eligible value must clear BOTH ≥ $100 and ≥ 2% of the priced
  portfolio. One aggregated suggestion; never names/sells/swaps an asset. Ranks
  **above** Staking/Stable Yield, **below** Rebalance; funded-buffer engine order
  is now Rebalance → Capital Efficiency → Staking → Stable Yield → Position
  Optimization → On Track. Fixtures 9E-A…L.

- Step 9G (done): **DCA trigger** (`deriveDcaSuggestion`, category `dca`,
  "Review a DCA Plan"). Fires when the buffer is funded, **Rebalance does not
  apply**, crypto is modestly under target (≥ 2 points, below the Rebalance
  threshold), and a planned monthly contribution ≥ $50 exists. Amount =
  min(monthly contribution, crypto target gap), ≥ $50 — **contribution-funded
  only** (never Safety Buffer/wallet/protocol stables) and **no token chosen**
  (generic `crypto` bucket). Category priority 6 (position_optimization → 7);
  funded-buffer order: Rebalance → Capital Efficiency → Staking → Stable Yield →
  DCA → Position Optimization → On Track. Fixtures 9G-A…L.

- Step 9H (done): **Trim Long-Tail trigger** (`deriveTrimSuggestion`, category
  `trim`, "Review Long-Tail Assets"). Flags NON-CORE liquid wallet tokens (an
  explicit `CORE_TOKEN_SYMBOLS` allowlist = SOL/WSOL + stablecoins; excludes
  LST/stake/protocol/unknown) that hit any of: aggregate long-tail ≥ $100 AND
  ≥ 5% of portfolio; a single non-core token ≥ 10%; or ≥ 3 small (≤ $50) tokens
  combining ≥ $100. One aggregated review suggestion — never sell/swap, never
  "bad/unsafe", never asserts illiquidity (`liquidity_not_evaluated`). Category
  priority 4; funded-buffer order: Rebalance → Capital Efficiency → Trim →
  Staking → Stable Yield → DCA → Position Optimization → On Track. Trim and
  Capital Efficiency answer different questions and MAY both fire (neither
  suppresses the other). Fixtures 9H-A…N. Realistic max rail count is now 5.

- Step 9I (done): **cost / liquidity guardrail standardization**. Added the
  `not_applicable` status and a shared [`guardrails.ts`](./guardrails.ts) helper
  (`passed`/`failed`/`warning`/`notEvaluated`/`notApplicable` constructors +
  `ensureExecutionGuardrails`). `engine.ts` now guarantees every suggestion
  carries `cost_available`/`liquidity_available`/`slippage_available` (appended
  as `not_evaluated` when a rule omits them); On Track marks them
  `not_applicable`. No execution guardrail is ever `passed` (no quote data), Top
  Pick ranking is unchanged, and the card mapper still hides all raw codes. See
  **Guardrail model** above for what unlocks these later. Fixtures 9I-A…G.

- Step 9J (done): **protocol / platform selection contracts**. Added the
  `ProtocolSelection` model + [`protocolSelection.ts`](./protocolSelection.ts)
  constructors and an optional `protocolSelection` on every suggestion. Staking
  and Stable Yield are `not_evaluated` (a protocol will be chosen once real
  APY/TVL/risk/liquidity/lockup data exists); every other category is
  `not_applicable`. `engine.ts` derives the `protocol_selection` guardrail
  centrally from the model (`reconcileProtocolGuardrail`). **No protocol is
  selected yet** — `selected`/`unavailable` are reserved; no rule names a
  protocol, invents APY/TVL/risk/audit/lockup, adds a transaction/signature/
  handoff, or exposes selection on cards. See **Protocol / platform selection**
  above for the data required first. Fixtures 9J-A…I.

- Step 10A (done): **structured review details (data model only)**. Added
  `SuggestionReviewDetails` + [`suggestionReviewDetails.ts`](./suggestionReviewDetails.ts)
  and populated `reviewDetails` deterministically in all 9 rules (summary,
  metrics, involved assets/positions, calculations, grouped guardrail summary,
  limitations, safety notes). No drawer UI, no visible change, cards unchanged
  and never expose it; no transactions/signatures/protocol selection; nothing
  invents APY/TVL/risk/liquidity/slippage/route/cost. Guardrails are shown as
  user-facing labels, never raw codes. See **Review details** above. Unblocks the
  Step 10B Review modal. Fixtures 10A-A…M.

- Step 10B (done): **Review Details modal**. `useRailSuggestions` now also returns
  `reviewDetailsById`; the shared `RealWalletSuggestionsRail` opens
  [`SuggestionReviewModal`](../components/SuggestionReviewModal.tsx) when Review is
  clicked on a real-wallet card. Read-only (no transaction/signature/handoff/AI),
  renders engine-owned details with grouped guardrail labels (never raw codes),
  and Dashboard + Portfolio behave identically. Demo Mode (which renders
  `SuggestionRail` directly) is untouched. Fixtures 10B-A…F.

All suggestion categories are implemented. `duplicate_exposure` remains
contracted but not emitted (pending duplicate-position detection).

## Suggestion display order

The **engine owns display order**; the UI renders the array as given and must
NOT re-sort. The mapper is a plain `map` that preserves input order, and Top
Pick selection marks importance without changing order.

**Full category priority** (single source of truth: `CATEGORY_PRIORITY` in
`topPick.ts`) — drives Top Pick and the intended engine display order:

```text
1. Safety Buffer          (buffer)                  — implemented, highest override
2. Rebalance              (rebalance)               — implemented
3. Capital Efficiency     (capital_efficiency)      — CONTRACTED (Step 9A, no trigger yet)
4. Staking                (staking)                 — CONTRACTED
5. Stable Yield           (stable_yield)            — CONTRACTED
6. Position Optimization  (position_optimization)   — CONTRACTED
7. On Track               (on_track, priority 99)   — implemented, informational, last, never Top Pick
```

Hard rules that survive the expansion: Safety Buffer is the highest-priority
override (underfunded buffer → no deployment/yield suggestions); Rebalance stays
above capital-efficiency/yield; On Track is last and appears only when no
actionable/useful suggestion exists; the UI renders engine order and never
sorts; Top Pick is a badge, not a sorting rule.

Status (Step 9A): the four future categories exist in the CONTRACTS ONLY —
`SuggestionCategory`/reason-code unions, `CATEGORY_PRIORITY`, Top Pick
eligibility, the mapper (category/type maps + copy keys), and copy strings. **No
trigger logic emits them yet** (`engine.ts` still runs only Buffer/Rebalance/On
Track); triggers arrive in Step 9B+. AI/chatbot never generates suggestions.

Demo Mode keeps its own fixture order and is unaffected by the engine/mapper.

## Safety invariants

- Read-only, Ledger-safe: no transactions, no signatures, no fund movement.
  MVP card click is at most an approved protocol page in a new tab.
- Sourced values only: no invented prices, amounts, APY, or recommendations.
- **Demo suggestions are fixtures** (`examples/demo-mode/demo-suggestions.json`
  → `demoDashboardState`) and must NEVER enter real-wallet mode; engine files
  must never import them.
- Insufficient inputs → empty result with `unavailable_reason`, never a
  fabricated fallback suggestion.
