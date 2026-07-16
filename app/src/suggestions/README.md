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

- Step 10C (done): **asset/position-specific detail refinement**. Rebalance
  source/target buckets now carry concrete USD values and (when underweight) a
  "Safety Buffer protected" calculation showing only stables above the buffer
  target are used. Position Optimization surfaces the detected protocol label
  (`protocol`/source) separately from the vault name and asset, with the
  concentration reason spelled out ("… % of portfolio"). Stable Yield shows the
  funded Safety Buffer reserve. All from detected data only — no invented
  APY/TVL/risk/liquidity, no sell/buy/swap language, no raw codes. Fixtures
  10C-A…E.

- Step 10D (done): **Review modal UX polish** (presentation only — no engine or
  reviewDetails changes). Header eyebrow (category + Top Pick badge) over the
  title; metrics as compact cards; guardrails grouped into tinted Checked (✓) /
  Not evaluated yet (with an honesty hint: "…not failures") / Not applicable;
  calm ✓ safety box; single-column metrics + internal scroll on narrow widths
  (the separate app-shell mobile scaling is out of scope). Accessibility
  unchanged. No new fixtures (data unchanged); all 158 still pass.

- Step 12A (done): **duplicate_exposure inside Position Optimization**. The
  Position Optimization rule now also flags when multiple deployed positions
  share an underlying exposure group (SOL / stablecoin / same token), via
  [`duplicateExposure.ts`](./duplicateExposure.ts) (`getUnderlyingExposureGroup`
  + `findDuplicateExposureGroups`). It stays ONE aggregated `position_optimization`
  card (no new category, priority, or card type); a position touched by several
  reasons is counted once (flagged-value de-duplication). Thresholds:
  per-position ≥ $50, group ≥ $250, group share ≥ 5%. Grouping uses detected
  fields only (type/symbol/mint/legs), never vague names, and returns null when
  uncertain; liquid wallet SOL/stables are excluded (handled by Staking / Stable
  Yield). Review-only — never bad/unsafe, never sell/swap/unwind. Guardrail
  `exposure_grouping` is `passed` when grouping fired, else `not_evaluated`.
  Fixtures 12A-A…N.

- Step 12C (done): **static protocol registry + data-source matrix (foundation
  only — NO selection)**. Added [`protocolRegistry.ts`](./protocolRegistry.ts)
  (curated candidate protocols with static facts only, query helpers, and
  unimplemented adapter interface contracts `ProtocolMarketData` /
  `ProtocolRiskData` / `ProtocolSelectionInput`) and
  [`protocolDataSources.md`](./protocolDataSources.md). Staking and Stable Yield
  now attach `candidateProtocolIds` (registry-order metadata, **not** a
  recommendation). **No protocol is selected or recommended:**
  `protocolSelection.status` stays `not_evaluated` for staking/stable_yield, the
  `protocol_selection` guardrail stays `not_evaluated`, `selectedProtocolId/Name`
  are never set, candidates are never ranked/scored, and no protocol name is
  surfaced in cards or the modal (`PROTOCOL_SELECTION_IMPLEMENTED === false`).
  Real selection still requires: candidate registry (done) + market-data
  adapters + risk registry + quote/route guardrails + a deterministic scoring
  model + QA with mock & mainnet simulation. Fixtures 12C-A…L.

- Step 12D (done): **read-only protocol market-data adapters (collection only —
  NO selection)**. Added `protocolMarketData.ts` (normalized market/risk/quote/
  input contracts + honest `missingMarketData` with no fake zeros),
  `protocolRiskRegistry.ts` (curated static skeleton — **no `riskScore`**, audit/
  withdrawal = "unknown"), `protocolDataAdapters.ts` (`ProtocolDataAdapter`
  contract + synchronous network-free `buildProtocolSelectionInput`),
  `protocolDataAdapters.defillama.ts` (read-only, verified-mapping-only — empty
  table, no fuzzy matching), `protocolDataAdapters.kamino.ts` (stub — existing
  APY is per-held-vault only), and `protocolDataAdapters.jupiter.ts` (contract-
  only quote; **never builds/sends a tx or requests a signature**). This is a
  SERVICE LAYER — the Suggestion Engine never imports or calls it, so
  suggestions/cards/modal/Demo are unchanged. No protocol is selected or scored;
  `PROTOCOL_SELECTION_IMPLEMENTED` stays `false`, `protocolSelection.status` and
  the `protocol_selection` guardrail stay `not_evaluated`, and no
  `selectedProtocolId/Name` is ever set. Real selection is still blocked until:
  **12E** risk methodology, **12F** eligibility/guardrails, **12G** scoring, and
  **12H** narrow-case selection QA (mock + mainnet). Fixtures 12D-A…N.

- Step 12E (done): **protocol risk & eligibility methodology (gates only — NO
  selection)**. Added `protocolEligibility.ts` (`evaluateProtocolEligibility` +
  `evaluateProtocolSelectionEligibility` returning `eligible` /
  `ineligible` / `insufficient_data`), eligibility thresholds in
  engineThresholds.ts, and `protocolRiskMethodology.md`. **Missing data never
  passes** — it yields `insufficient_data` (never `eligible`); only present data
  that violates a gate is `ineligible`. Eligibility answers "eligible to
  *evaluate*", never "which to use": no ranking, no score-as-advice, no
  selection. `riskScore` stays **absent** until the methodology is approved, so
  score-dependent eligibility is `insufficient_data` today. Pure helper —
  **not wired** into any suggestion/card/modal/Top Pick; suggestions unchanged,
  `PROTOCOL_SELECTION_IMPLEMENTED` stays `false`, `protocolSelection.status` and
  the `protocol_selection` guardrail stay `not_evaluated`, no `selectedProtocolId/
  Name`. Real selection still blocked until **12F** quote/liquidity/cost
  guardrails, **12G** deterministic scoring, **12H** narrow-case selection QA.
  Fixtures 12E-A…T.

- Step 12F (done): **read-only route / cost / liquidity guardrails (utilities
  only — NO selection, NO execution)**. Added `routeCostTypes.ts`
  (`RouteQuoteRequest`/`RouteQuoteResult`), a read-only Jupiter quote adapter
  (`getReadOnlyJupiterQuote` + `parseJupiterQuote`/`validateRouteQuoteRequest`/
  error+missing constructors + `normalizeRouteQuoteToMarketDataRoute`), and
  `protocolRouteGuardrails.ts` (`evaluateRouteGuardrails` →
  `passed`/`failed`/`insufficient_data`; missing data never passes). **Quote-only
  boundary:** no swap/execution endpoint, no wallet/publicKey, **no
  `sendTransaction`/`signTransaction`/`signAllTransactions`/`signMessage`**, no
  transaction payload; live network disabled behind
  `JUPITER_LIVE_QUOTE_IMPLEMENTED = false` (tests inject `fetchImpl`; failures →
  error/missing, never throw). **Not wired** into any suggestion/card/modal/Top
  Pick — `cost_available`/`liquidity_available`/`slippage_available` and
  `protocol_selection` stay `not_evaluated`, `PROTOCOL_SELECTION_IMPLEMENTED`
  stays `false`, no `selectedProtocolId/Name`. Real selection still blocked until
  **12G** deterministic scoring and **12H** narrow-case selection QA. Fixtures
  12F-A…S.

- Step 12G (done): **deterministic protocol scoring model (ranking only — NO
  selection)**. Added `protocolScoring.ts` (`scoreProtocolCandidate` +
  `rankProtocolCandidates` + `compareCandidateScores`, 0–100 component scores,
  fixed per-strategy weights each totaling 100) and
  `protocolScoringMethodology.md`. Scores **only fully eligible** candidates;
  **missing data never scores** (→ `insufficient_data`, never a default/0); APY
  is capped and risk outweighs yield; **LP scoring disabled** until impermanent
  loss is modeled. **Ranking is not selection:** `selectionMade` is always
  `false`, no `selectedProtocolId/Name`, no ranking/scores in the UI. Pure helper
  — **not wired** into any suggestion/card/modal/Top Pick; suggestions unchanged,
  `protocolSelection.status` + `protocol_selection` guardrail stay
  `not_evaluated`, `PROTOCOL_SELECTION_IMPLEMENTED` stays `false`. Real selection
  still blocked until **12H** narrow-case QA, validated real data adapters, and an
  explicit product decision to expose a selected protocol. Fixtures 12G-A…V.

- Step 12H (done): **QA-only protocol selection — SOL liquid staking**. Added
  `protocolSelectionQa.ts` (`runProtocolSelectionQa` + fixture-only mock data for
  the five SOL LST candidates) and `protocolSelectionQa.md`. Proves that, given
  complete mock/mainnet-simulated data, the pipeline (eligibility → scoring →
  ranking) deterministically identifies **one** selected candidate (risk-weighted
  — the highest-APY candidate does not automatically win; below-threshold /
  withdrawal-too-long candidates are ineligible). **QA-only:** `qaOnly: true`,
  every other strategy/asset is `disabled`, the result is never written to
  `ProtocolSelection` or shown in the UI, and the utility is not imported by any
  live/engine/UI file. No transactions/signatures/swaps. Live staking/stable_yield
  keep `protocolSelection.status = not_evaluated`, no `selectedProtocolId/Name`,
  `protocol_selection` guardrail `not_evaluated`, `PROTOCOL_SELECTION_IMPLEMENTED
  = false`. Next: **12I** feature-flagged production-readiness decision (real
  adapters + product/UI/legal review). Fixtures 12H-A…T.

- Step 12I (done): **production-readiness checklist + feature-flag plan (planning
  only — enables nothing)**. Added `protocolSelectionFeatureFlags.ts`
  (`PROTOCOL_SELECTION_QA_ONLY=true`, `PROTOCOL_SELECTION_SHOW_IN_UI=false`,
  `PROTOCOL_SELECTION_ALLOW_LIVE_DATA=false`,
  `PROTOCOL_SELECTION_ALLOW_TRANSACTIONS=false`, re-exporting the single-source
  `PROTOCOL_SELECTION_IMPLEMENTED=false`; a 9-gate readiness checklist +
  `isProtocolSelectionProductionReady()` → `false`; and the rollout ladder
  `disabled → qa_only → internal_dry_run → internal_ui_preview → limited_beta →
  production`) and `protocolSelectionProductionReadiness.md`. **Production
  selection stays disabled:** live staking/stable_yield remain `not_evaluated`,
  no `selectedProtocolId/Name`, `protocol_selection` guardrail `not_evaluated`,
  no UI recommendation; the flags module is not imported by any live/engine/UI
  file, and there is no transaction/signature/swap path. QA can still select a
  fixture-only candidate (Stage 1) — that is not a production selection. Next:
  **12J** real data-adapter mapping for the first narrow case (SOL liquid
  staking). Fixtures 12I-A…T.

- Step 12J (done): **real-data mapping for SOL liquid staking (internal dry-run
  only)**. Added `protocolSolLiquidStakingData.ts` (exact verified mints for all
  five LST candidates + source mapping + `buildSolLiquidStakingMarketDataFrom
  ExistingSources` + `runSolLiquidStakingInternalDryRun`) and
  `protocolSolLiquidStakingData.md`; added the one **verified** DefiLlama pool
  UUID (Sanctum/INF, from `lstApy.ts`) to `DEFILLAMA_POOL_MAPPINGS`. **APY is
  mapped** to existing real helpers (on-chain stake pools / Marinade / DefiLlama)
  and **TVL is mapped for Sanctum only**; withdrawal/fees/riskScore remain
  **missing** (no fabricated values — network-free, dependency-injected). The
  internal dry-run correctly returns `insufficient_data` today. **Selection stays
  disabled:** `SOL_LIQUID_STAKING_SELECTION_ENABLED = false`, live suggestions
  `not_evaluated`, no `selectedProtocolId/Name`, module not imported by any
  live/engine/UI file, no transaction/signature/swap path,
  `PROTOCOL_SELECTION_IMPLEMENTED`/`SHOW_IN_UI`/`ALLOW_TRANSACTIONS` all false.
  Next: **12K** real-data dry-run hardening / risk-registry sourcing. Fixtures
  12J-A…V.

- Step 12K (done): **SOL liquid-staking dry-run hardening + risk-registry
  sourcing (dev-only)**. Added `protocolSolLiquidStakingDryRun.ts`
  (`runSolLiquidStakingDryRun` with `fixture` / `injected` / `live_opt_in` modes —
  network-free, dependency-injected; `live_opt_in` without `allowLiveData` →
  `live_data_disabled`; per-candidate report; never throws → `source_error`;
  `qaOnly` + `selectionEnabled = false`; no top-level `selectedProtocolId`) and
  `protocolSolLiquidStakingRiskSources.md`. Recorded SOL-LST risk sourcing in
  `protocolRiskRegistry.ts` (`lastReviewedAt` + notes) — **`riskScore` stays
  `not_assigned`**, audit/withdrawal `unknown`, nothing invented. Current dry-run
  result is **`insufficient_data`** (risk/withdrawal/most-TVL missing) — correct.
  **Selection stays disabled:** module not imported by any live/engine/UI file, no
  transaction/signature/swap path, live suggestions `not_evaluated`, no
  `selectedProtocolId/Name`, `PROTOCOL_SELECTION_IMPLEMENTED`/`SHOW_IN_UI`/
  `ALLOW_TRANSACTIONS` all false, `ALLOW_LIVE_DATA` false globally. Next: **12L**
  verified TVL/withdrawal source completion or Stage-2 dry-run report. Fixtures
  12K-A…Z.

- Step 12L (done): **verified source completion + risk evidence for SOL liquid
  staking (metadata only)**. Added `protocolSolLiquidStakingSources.ts`
  (`SolLiquidStakingSourceRecord` per candidate×category + status helpers) and
  `protocolSolLiquidStakingSourceChecklist.md`; enriched the dry-run report with
  `sourceStatusByCategory` (internal only). **Verified:** exact mints + APY
  *sources* (code-backed) for all five, and the TVL source for Sanctum/INF
  (verified DefiLlama pool). **Still missing (not guessed/invented):** DefiLlama
  TVL pools for the other four, withdrawal, fees, audit — and **`riskScore` stays
  `not_assigned`** for all. A verified source is not a value: eligibility still
  fails and the dry-run stays `insufficient_data`. Source metadata never creates
  eligibility, is not imported by any live/engine/UI file, and has no transaction
  path. Live suggestions `not_evaluated`, no `selectedProtocolId/Name`, all
  selection flags false. Next: **12M** Stage-2 real-data dry-run report / risk
  methodology completion. Fixtures 12L-A…W.
- Step 12M (done): **Stage-2 real-data dry-run REPORT for SOL liquid staking
  (internal, no UI, no production selection)**. Added
  `protocolSolLiquidStakingStage2DryRun.ts` +
  `protocolSolLiquidStakingStage2DryRun.md`: `buildSolLiquidStakingStage2DryRunReport`
  injects the real values we can source today and runs the full pipeline
  (eligibility → ranking only when eligibility allows), reporting per-candidate
  **data coverage** (`available`/`partial`/`missing`/`blocked`) + a summary +
  blockers. A live-opt-in helper
  (`buildSolLiquidStakingStage2DryRunFromLiveSources`) is a dependency-injected
  stub: it requires `allowLiveData === true` (else a `blocked` /
  `live_data_disabled` report) and catches provider errors into `source_error`
  blockers — never fetches, never throws, no wallet/`publicKey`/signing. **Current
  result stays `insufficient_data`** (APY-only → 5 with APY, 0 eligible; +Sanctum
  TVL → still 0 eligible; withdrawal/fees/riskScore missing). Complete injected
  data for one candidate makes IT `eligible` in the report while
  `canSelectForProduction` stays `false`. Not imported by any live/engine/UI file;
  no top-level `selectedProtocolId/Name`; live suggestions `not_evaluated`; all
  selection flags false. Fixtures 12M-A…AF (+32). Next: **12N** final handoff /
  go-no-go checklist.
- Step 12N (done): **final go/no-go checklist for protocol-selection production
  readiness (checklist only)**. Added `protocolSelectionGoNoGo.ts` +
  `protocolSelectionGoNoGo.md`: `getProtocolSelectionGoNoGo()` reports 17 gates
  (feature_flags, market_data, tvl_mapping, risk_methodology, risk_scores,
  audit_status, withdrawal_data, fee_data, route_liquidity_cost, eligibility,
  scoring, stage_2_dry_run, qa_regression, product_copy_compliance,
  fallback_behavior, transaction_boundary, ui_readiness) with stable,
  evidence-backed blocker IDs. **`productionReady` is the literal `false`**
  (`canShowInUi`/`canSelectProtocol`/`canUseTransactions` all false; no
  selected-protocol id/name; no recommendation field). Helpers:
  `getProtocolSelectionBlockingReasons()`, `isProtocolSelectionGo()` → false,
  `assertProtocolSelectionCannotRunInProduction()` → true. Mechanism gates
  (eligibility, scoring, fallback, transaction boundary, QA) pass; data/review
  gates (TVL 1/5, riskScore/audit/withdrawal/fees, real-data dry-run, copy/
  compliance, UI) are blocked. Not imported by any live/engine/UI file; live
  suggestions `not_evaluated`; all selection flags false. **Protocol-selection
  safe foundation is complete and remains disabled.** Fixtures 12N-A…AK (+35).
  Next action: pause and reassess, or separately continue data sourcing (verified
  TVL pools, riskScore methodology + scores, withdrawal/fee/audit sourcing) —
  the go/no-go must pass before any flag changes.
- Step 12O (done): **SOL liquid-staking data sourcing pack (proposals only — data
  sourcing, not production selection)**. Added
  `protocolSolLiquidStakingSourceCandidates.ts` +
  `protocolSolLiquidStakingDataSourcingPack.md`: a PROPOSAL registry (25
  candidates across tvl/withdrawal/fees/audit/risk_score × five candidates) naming
  the exact sources needed to close each go/no-go blocker, with statuses
  `proposed`/`verified`/`rejected`/`needs_review`. TVL for the four missing LSTs →
  `needs_review` (exact DefiLlama UUID to confirm; **not** added to
  `DEFILLAMA_POOL_MAPPINGS`); withdrawal/fees/audit → `proposed` (official docs);
  riskScore → evidence requirements drafted, **no score assigned**. A proposal
  never changes production data: `proposedValue` is review text only, and
  `ProtocolMarketData`/`ProtocolRiskData`/source statuses are unchanged (source
  records only gain a `hasProposedSourceCandidate` cross-link). `getProtocolSelectionGoNoGo().productionReady`
  stays `false`; tvl_mapping/risk_scores/audit/withdrawal/fees gates unchanged.
  Not imported by any live/engine/UI file; live suggestions `not_evaluated`; all
  selection flags false. Fixtures 12O-B…Z (+24). Next: **12P** risk rubric
  approval pack.
- Step 12P (done): **protocol riskScore rubric approval pack (draft, not
  approved)**. Added `protocolRiskRubric.ts` + `protocolRiskRubric.md` +
  `protocolRiskRubricApprovalPack.md`: an auditable rubric with six weighted
  dimensions totaling 100 (audit_security 25, maturity 20, tvl_adoption 15,
  withdrawal_fee_transparency 15, operational_dependency_risk 15, incident_history
  10), each with required source-backed evidence, plus reviewer sign-off
  placeholders. Constants `PROTOCOL_RISK_RUBRIC_EXISTS = true`, `..._APPROVED =
  false`, `..._ASSIGNS_SCORES = false`, `..._AFFECTS_PRODUCTION = false`. Helpers:
  `getProtocolRiskRubric()`, `isProtocolRiskRubricApproved()` → false,
  `canAssignProtocolRiskScores()` → false, `createEmptyProtocolRiskScoreDraft()`
  (score absent, `scoreAssigned:false`, all dimensions `not_reviewed`),
  `validateProtocolRiskRubricWeights()`, `getMissingRiskEvidenceForProtocol()`.
  **No `riskScore` assigned** — absent for all five (12P-Q/R); rubric not approved;
  auditStatus unchanged. The go/no-go risk_methodology blocker now names the draft
  rubric but `productionReady` stays `false` and risk_scores stays `not_started`.
  Not imported by any live/engine/UI file; live suggestions `not_evaluated`; all
  selection flags false. Fixtures 12P-A…AD (+28). Next: **12Q** evidence gathering
  and sourced risk metadata.
- Step 12Q (done): **SOL liquid-staking risk evidence drafts (gathering only — no
  score, no approval)**. Added `protocolSolLiquidStakingEvidenceDrafts.ts` +
  `protocolSolLiquidStakingEvidenceDrafts.md` + `protocolRiskEvidenceReview.md`: 30
  reviewable evidence drafts (5 candidates × 6 rubric dimensions), each with
  `evidenceStatus` (`gathered`/`partial`/`missing`/`needs_review`/`not_reviewed`),
  cited `sources[]`, `evidenceSummary`, `unresolvedQuestions[]`, `reviewerNotes[]`,
  and `scoreAssigned: false` (no `score` field). Constants
  `PROTOCOL_RISK_EVIDENCE_DRAFTS_EXIST = true`, `..._APPROVED`/`..._ASSIGN_SCORES`/
  `..._AFFECT_PRODUCTION = false`. Helpers: `getSolLiquidStakingEvidenceDrafts()`,
  `getSolLiquidStakingEvidenceDraft()`, `getEvidenceDraftsByStatus()`,
  `getMissingEvidenceDraftsForProtocol()`, `summarizeEvidenceCoverage()`. Coverage:
  **0 gathered, 1 partial** (Sanctum/INF TVL, from the verified DefiLlama pool),
  **29 needs_review, scoreAssignedCount 0**. Nothing invented — only
  codebase-verifiable sources cited; **no `riskScore` assigned**, rubric still
  unapproved, and no production metadata changed. `productionReady` stays `false`;
  risk_scores/audit/withdrawal/fees gates unchanged. Not imported by any
  live/engine/UI file; live suggestions `not_evaluated`; all selection flags false.
  Fixtures 12Q-A…AC (+27). Next: **12R** reviewer approval / score-assignment
  decision.
- Step 12R (done): **reviewer approval / riskScore assignment decision gate (no
  approval, no score by default)**. Added `protocolRiskApprovalDecision.ts` +
  `protocolRiskApprovalDecision.md` + `protocolRiskScoreAssignmentGate.md`: models
  the human `ProtocolRiskRubricApprovalDecision` (status `not_submitted` →
  `rubricApproved:false`, `scoreAssignmentAllowed:false`) and a per-candidate
  `ProtocolRiskCandidateScoreAssignmentGate`. Constants
  `PROTOCOL_RISK_APPROVAL_DECISION_EXISTS = true`, `..._APPROVED`/`..._ASSIGN_SCORES`/
  `..._AFFECTS_PRODUCTION = false`. Helpers:
  `getCurrentProtocolRiskRubricApprovalDecision()`,
  `evaluateProtocolRiskCandidateScoreAssignmentGate()`,
  `evaluateProtocolRiskApprovalGate()`, `canAssignRiskScoreToProtocol()` → false.
  A candidate reaches `approved_for_scoring` only when the rubric is approved, all
  six evidence dimensions are `gathered`, and the reviewer explicitly allows
  scoring — **today every candidate gate is `blocked`** (rubric unapproved,
  evidence incomplete; Sanctum's `partial` TVL does not qualify).
  `anyCandidateReadyForScoring`/`anyScoreAssigned`/`productionAffected` all false;
  **no `riskScore` assigned**. The go/no-go risk_methodology blocker now names the
  unsubmitted decision but `productionReady` stays `false`. Not imported by any
  live/engine/UI file; live suggestions `not_evaluated`; all selection flags false.
  Fixtures 12R-A…AG (+31). Next: **12S** evidence completion or reviewer approval
  process.
- Step 12S (done): **evidence completion harness for one candidate (Sanctum/INF —
  no approval, no score)**. Added `protocolSolLiquidStakingEvidenceCompletion.ts` +
  `protocolSolLiquidStakingEvidenceCompletion.md`: a pure, read-only workflow that
  reviews one candidate's rubric evidence toward `gathered`. Constants
  `PROTOCOL_EVIDENCE_COMPLETION_EXISTS = true`, `..._APPROVES_RUBRIC`/
  `..._ASSIGNS_SCORES`/`..._AFFECTS_PRODUCTION = false`, target `sanctum`/`INF`.
  `runEvidenceCompletionForCandidate("sanctum")` reviews all six dimensions;
  `runSanctumEvidenceCompletionGateCheck()` shows the score-assignment gate before/
  after. A dimension reaches `gathered` only when every required source is
  `verified` with no unresolved questions. **Current result: 0/6 gathered** — TVL
  stays `partial` (verified TVL alone is insufficient), the rest `needs_review`;
  `readyForReview`/`approvedForScoring`/`scoreAssigned`/`productionAffected` all
  false. Mutates no base drafts and no production metadata; Sanctum gate unchanged
  (`blocked`, `canAssignScore` false). `ready_for_review` ≠ `approved_for_scoring`.
  Not imported by any live/engine/UI file; live suggestions `not_evaluated`; all
  selection flags false; `productionReady` stays `false`. Fixtures 12S-A…AD (+28).
  Next: gather actual verified sources across all six dimensions, or pause for the
  human rubric-approval review.
- Step 12T (done): **source-verification intake for SOL liquid staking (source
  level only — no production values, no score, no selection)**. Added
  `protocolSolLiquidStakingSourceVerification.ts` +
  `protocolSolLiquidStakingSourceVerification.md`: classifies reviewer-supplied
  source candidates (exact DefiLlama pool IDs for JupSOL/mSOL/JitoSOL/bSOL, INF via
  the existing codebase pool, official withdrawal/fee/audit/operational docs URLs)
  as `verified`/`needs_review`/`rejected`. "Verified" = the source LINK is
  legitimate, **not** a confirmed production value. Constants
  `PROTOCOL_SOURCE_VERIFICATION_EXISTS = true`, `..._APPROVES_RUBRIC`/
  `..._ASSIGNS_SCORES`/`..._AFFECTS_PRODUCTION`/`..._ENABLES_SELECTION = false`.
  Helpers: `verifySolLiquidStakingSourceCandidate()`,
  `summarizeSolLiquidStakingSourceVerification()`, `getVerified/NeedsReview/
  RejectedSourceResults()`, `mapVerifiedSourcesToEvidenceDimensions()` (non-mutating,
  `canMarkAnyDimensionGathered` always false). Incident history stays
  `needs_review` for all five (absence is not clean history). **Nothing promoted to
  production:** TVL pools not added to `DEFILLAMA_POOL_MAPPINGS`, `auditStatus`
  stays `unknown`, no `withdrawalTimeHours`/fees/`riskScore` assigned, evidence
  drafts unmutated. Not imported by any live/engine/UI file; live suggestions
  `not_evaluated`; all selection flags false; `productionReady` stays `false`.
  Fixtures 12T-A…AM (+36). Next: **12U** map verified sources to
  evidence-completion decisions, or conduct the human rubric-approval review.
- Step 12U (done): **source-value confirmation intake for SOL liquid staking (no
  production, no draft mutation, no score)**. Added
  `protocolSolLiquidStakingSourceValueConfirmation.ts` +
  `protocolSolLiquidStakingSourceValueConfirmation.md`: records reviewer-confirmed
  VALUES read from 12T-verified sources. `confirmSourceValue()` returns `confirmed`
  only when the source is verified, `confirmedValue` is present (unless type
  `none`), an as-of timestamp exists for TVL/APY, and reviewer + reviewerRole are
  supplied; else `insufficient`/`needs_review`. Constants
  `PROTOCOL_SOURCE_VALUE_CONFIRMATION_EXISTS = true`, `..._APPROVES_RUBRIC`/
  `..._ASSIGNS_SCORES`/`..._AFFECTS_PRODUCTION`/`..._ENABLES_SELECTION`/
  `..._UPDATES_METADATA = false`. Helpers: `getExampleSourceValueConfirmations()`
  (QA-ONLY `QA_ONLY_NOT_LIVE` placeholders), `getSourceValueConfirmationResults()`,
  `summarizeSourceValueConfirmations()`, `getConfirmed/NeedsReview/
  InsufficientSourceValues()`, plus `mapConfirmedValuesToEvidenceCompletion()`
  (added to the evidence-completion module, non-mutating). A dimension is gatherable
  only when ALL its required values are confirmed — a TVL-only confirmation never
  gathers `tvl_adoption`; no candidate is `ready_for_review` and
  `approvedForScoring` stays false. **No production metadata written, no evidence
  draft mutated, no `riskScore` assigned.** Not imported by any live/engine/UI file;
  live suggestions `not_evaluated`; all selection flags false; `productionReady`
  stays `false`. Fixtures 12U-A…AP (+39). Next: **12V** evidence-dimension gathering
  decision, or the human rubric-approval package.
- Step 12V (done): **real value-confirmation ledger for SOL liquid staking
  (non-production; no score, no draft mutation, no production metadata)**. Added
  `protocolSolLiquidStakingRealValueConfirmations.ts` +
  `protocolSolLiquidStakingRealValueConfirmations.md`: a non-production ledger of
  reviewer-confirmed DefiLlama TVL/APY/APY-30d values for JupSOL/mSOL/JitoSOL/bSOL
  (reviewer Ashot Gyulzatyan, founder; as-of 2026-07-12); INF absent (no exact value
  supplied, not invented). Constants `PROTOCOL_REAL_VALUE_CONFIRMATIONS_EXIST =
  true`, `..._APPROVE_RUBRIC`/`..._ASSIGN_SCORES`/`..._AFFECT_PRODUCTION`/
  `..._ENABLE_SELECTION`/`..._UPDATE_METADATA`/`..._MUTATE_EVIDENCE = false`, plus
  `TIME_SENSITIVE_VALUE_MAX_AGE_HOURS = 24` / `STATIC_DOC_VALUE_MAX_AGE_DAYS = 90`.
  Helpers: `getSolLstRealValueConfirmations()`, `getConfirmedRealValues()`,
  `getStaleRealValues()`, `isRealValueFresh()`, `validateRealValueConfirmation()`,
  `summarizeSolLstRealValueConfirmations()`, plus non-mutating
  `mapRealValuesToEvidenceCompletion()`. Fresh TVL+APY+APY-30d support only
  `tvl_adoption`; stale values (past 24h) support nothing; the other five dimensions
  stay incomplete so **no candidate is `ready_for_review`**. **No production metadata
  written, no evidence draft mutated, no `riskScore` assigned.** Not imported by any
  live/engine/UI file; live suggestions `not_evaluated`; all selection flags false;
  `productionReady` stays `false`. Fixtures 12V-A…AX (+47). Next: **12W**
  gather-decision ledger for `tvl_adoption` and the remaining dimensions.
- Step 12W (done): **evidence gather-decision ledger for SOL liquid staking
  (non-production; no score, no draft mutation, no metadata)**. Added
  `protocolSolLiquidStakingEvidenceGatherDecisions.ts` +
  `protocolSolLiquidStakingEvidenceGatherDecisions.md`: reviewer decisions that a
  rubric dimension is `gathered`, freshness-aware. Constants
  `PROTOCOL_EVIDENCE_GATHER_DECISIONS_EXIST = true`, `..._APPROVE_RUBRIC`/
  `..._ASSIGN_SCORES`/`..._AFFECT_PRODUCTION`/`..._ENABLE_SELECTION`/
  `..._UPDATE_METADATA`/`..._MUTATE_EVIDENCE = false`. Helpers:
  `getSolLstEvidenceGatherDecisions()`, `getGatherDecisionsByDimension/Status()`,
  `validateEvidenceGatherDecision()`, `getEffectiveGatherDecisions()`,
  `summarizeSolLstEvidenceGatherDecisions()`,
  `evaluateCandidateReadinessFromGatherDecisions()`, plus
  `mapGatherDecisionsToEvidenceCompletion()` (evidence-completion module) and a
  non-production gate wrapper
  `evaluateProtocolRiskCandidateScoreAssignmentGateWithGatherDecisions()` (approval-
  decision module). **`tvl_adoption` gathered for JupSOL/mSOL/JitoSOL/bSOL while
  their 12V values are fresh** (past 24h → `stale`, not gathered); **INF
  `needs_review`**; the other five dimensions have no decision. Four candidates =
  1/6 gathered + 5 missing; INF = 0/6; **no candidate `ready_for_review` or
  `approved_for_scoring`**, gate wrapper status `blocked`. **No base draft mutated,
  no production metadata, no `riskScore` assigned.** Not imported by any
  live/engine/UI file; live suggestions `not_evaluated`; all selection flags false;
  `productionReady` stays `false`. Fixtures 12W-A…BA (+50). Next: confirm + gather
  the remaining dimensions (withdrawal/fees/audit/operational/incident) and the
  human rubric-approval review.
- Step 12X (done): **JitoSOL remaining evidence gathering + `ready_for_review`
  milestone (source-backed; no score, no approval, no production)**. Added
  `protocolSolLiquidStakingJitoEvidenceConfirmations.ts` +
  `protocolSolLiquidStakingJitoEvidenceConfirmations.md`: 11 source-backed reviewer
  confirmations (reviewer Ashot Gyulzatyan, founder) from official Jito
  docs/FAQs/security/blog for the five remaining dimensions — audit_security (SPL
  Stake Pool audits: Quantstamp/Neodyme/Kudelski), maturity (blog production
  history), withdrawal_fee_transparency (unstake mechanics + ~48h + 0.1% + 4% mgmt
  fee), operational_dependency_risk (DAO manager + StakeNet + addresses),
  incident_history (completed manual review, explicitly not a clean-history claim,
  recheck before beta/production). Constants
  `PROTOCOL_JITOSOL_EVIDENCE_CONFIRMATIONS_EXIST = true` + six `false` guards +
  target `jito`/`JitoSOL`. Added five JitoSOL `gathered` decisions to the 12W
  ledger. **With fresh TVL/APY, JitoSOL = 6/6 gathered → `candidateReadyForReview =
  true`; gate status `ready_for_review`** — the first candidate — but
  **`approved_for_scoring = false`**, `scoreAssignmentAllowed = false`, **no
  `riskScore` assigned**; stale TVL/APY drops it to 5/6. No other candidate
  advances; base drafts unmutated; no production metadata (auditStatus/withdrawal/
  fees unchanged). Not imported by any live/engine/UI file; live suggestions
  `not_evaluated`; all selection flags false; `productionReady` stays `false`.
  Fixtures 12X-A…BA (+50, and 12W-M…Q/Y reworded). Next: **12Y** human rubric
  approval + riskScore assignment mechanism.
- Step 12Y (done): **human rubric approval + riskScore assignment mechanism
  (blocked by default; QA-only calculation path; no production, no selection)**.
  Added `protocolRiskScoreAssignment.ts` + `protocolRiskScoreAssignment.md` +
  `protocolRiskApprovalAndScoring.md`, and `createExplicitProtocolRiskApprovalDecision()`
  (approval-decision module, does not change the `not_submitted` default). Scoring:
  `riskScore = sum(dimensionScore * weight) / 100` (0–10) over the rubric weights,
  computed ONLY when all gates pass — rubric approved, score assignment allowed,
  candidate `ready_for_review` (freshness-aware), rubric version matches, and every
  dimension has a valid 0–10 reviewer score with rationale + evidence sources; any
  failure → `blocked`/`needs_review`/`rejected` with no score. Constants
  `PROTOCOL_RISK_SCORE_ASSIGNMENT_EXISTS = true` + six `false` guards. Helpers:
  `calculateWeightedRiskScore()`, `validateRiskScoreDimensionInputs()`,
  `getRiskScoreAssignmentBlockers()`, `getDefaultProtocolRiskScoreAssignmentInput()`,
  `getQaOnlyJitoRiskScoreAssignmentInput()` (QA-ONLY, `QA_ONLY_NOT_PRODUCTION`
  labels), `canAssignRiskScoreWithDecision()`, `summarizeRiskScoreAssignments()`.
  **Blocked by default** (approval `not_submitted`): JitoSOL has no production
  `riskScore`; a QA-only explicit-approval path computes the demonstration score
  **7.75** to prove the calculation, with `productionMetadataUpdated`/
  `evidenceDraftMutated`/`selectionEnabled` all false. Stale TVL/APY blocks
  assignment. `protocolRiskRegistry.ts` unchanged; `riskScore` absent for all five.
  Not imported by any live/engine/UI file; live suggestions `not_evaluated`; all
  selection flags false; `productionReady` stays `false`. Fixtures 12Y-A…AT (+43).
  Next: **12Z** production metadata registry for a beta candidate.
- Step 12Z (done): **production metadata registry for the JitoSOL beta candidate
  (staged + blocked by default; no selection, no production riskScore)**. Added
  `protocolSolLiquidStakingProductionMetadata.ts` +
  `protocolSolLiquidStakingProductionMetadata.md`: a production-readable metadata
  model + a staged JitoSOL candidate built from confirmed 12V/12X evidence (TVL
  767.95M / APY 5.36% / 30d 5.45% when fresh; withdrawal ~48h + swap-route-is-not-
  withdrawal; fees 0.1% direct-unstake + 4% annual mgmt; audit reviewed —
  Quantstamp/Neodyme/Kudelski, SPL Stake Pool scope; operational DAO+StakeNet;
  incident point-in-time caveat). Constants
  `PROTOCOL_SOL_LST_PRODUCTION_METADATA_EXISTS = true`, `..._ACTIVE`/
  `..._ENABLES_SELECTION`/`..._UPDATES_LIVE_SUGGESTIONS`/`..._ALLOWS_TRANSACTIONS`/
  `..._USES_QA_SCORE = false`. Helpers: `buildJitoSolProductionMetadataCandidate()`,
  `validateSolLstProductionMetadataCandidate()`, `getSolLstProductionMetadataCandidates()`,
  `summarizeSolLstProductionMetadata()`, `getProductionMetadataBlockers()`,
  `hasActiveSolLstProductionMetadata()`. **Blocked by default:** `riskScore`
  **absent** (`riskScoreStatus: absent`; the QA-only 7.75 is rejected — never
  production), status `blocked` with `rubric_not_approved` /
  `production_risk_score_absent` / `source_reverification_required_before_beta` /
  `protocol_selection_disabled` / `go_no_go_not_passed`. `productionReady`/
  `selectionEnabled`/`liveSuggestionsUpdated`/`transactionsEnabled` always false;
  stale TVL/APY → `dataFreshnessStatus: stale` + no values. Nothing written to
  `protocolRiskRegistry.ts` / `DEFILLAMA_POOL_MAPPINGS`. Not imported by any
  live/engine/UI file; live suggestions `not_evaluated`; all selection flags false;
  `productionReady` stays `false`. Fixtures 12Z-A…AX (+47). Next: **13A** exact SOL
  staking selector behind an internal flag.
- Step 13A (done): **exact SOL liquid-staking selector shell (hard-disabled,
  internal-only; no selection, no UI, no live change)**. Added
  `protocolSolLiquidStakingSelector.ts` + `protocolSolLiquidStakingSelector.md`.
  Constants `PROTOCOL_SOL_LST_SELECTOR_EXISTS = true`, `..._ENABLED = false`,
  `..._INTERNAL_ONLY = true`, `..._SHOWS_UI`/`..._USES_QA_SCORE`/
  `..._ENABLES_TRANSACTIONS`/`..._UPDATES_LIVE_SUGGESTIONS = false`,
  `..._USES_PRODUCTION_METADATA = true`. `selectSolLiquidStakingProtocol()` returns
  `status: "disabled"` with `selector_disabled` and **no** `selectedProtocolId`/
  `Name`/`LstSymbol`; input validation still flags `unsupported_asset` (USDC) and
  `eligible_amount_too_small`. `dryRunSolLstSelector()` evaluates JitoSOL as
  **blocked** (selector_disabled, protocol_selection_feature_disabled,
  go_no_go_not_passed, production_metadata_inactive/not_ready,
  approved_risk_score_missing, source_reverification_missing) with no
  selectedProtocolId. `previewSolLstSelectorReadiness().canSelect = false` +
  nextRequiredActions (approve rubric, assign approved non-QA riskScore, source
  re-verification, activate metadata, pass go/no-go, enable flag, approve UI/copy).
  Future selection is deterministic (approved riskScore → TVL → withdrawal → APY-30d
  → id). Never uses the QA-only 7.75; mutates no metadata/registry/mappings/drafts.
  Not imported by any live/engine/UI file; live suggestions `not_evaluated`; all
  selection flags false; `productionReady` stays `false`. Fixtures 13A-A…AS (+42).
  Next: **13B** internal UI preview shell, or the human approval / source
  re-verification.
- Step 13B (done): **internal UI preview shell for the exact SOL staking
  recommendation (hard-disabled, unmounted; copy model only)**. Added
  `protocolSolLiquidStakingSelectorPreview.ts` +
  `protocolSolLiquidStakingSelectorPreview.md` (no React component mounted — copy
  model only, to remove any live-mount risk). Constants
  `PROTOCOL_SOL_LST_SELECTOR_PREVIEW_EXISTS = true`, `..._ENABLED = false`,
  `..._INTERNAL_ONLY = true`, `..._SHOWS_IN_DASHBOARD`/`..._SHOWS_IN_PORTFOLIO`/
  `..._SHOWS_IN_REVIEW_MODAL`/`..._UPDATES_LIVE_SUGGESTIONS`/`..._ENABLES_TRANSACTIONS
  = false`, plus `INTERNAL_PREVIEW_NOT_LIVE`. `getDefaultSolLstSelectorPreview()` →
  status `disabled`, no protocol named, safety note "WealthSmith does not move funds
  for you."; `getInternalOnlySolLstSelectorPreviewExample()` → future copy shape
  ("Put Idle SOL to Work" / "Suggested protocol to review") tagged
  `INTERNAL_PREVIEW_NOT_LIVE`, no selected protocol, no QA score, no
  production-readiness claim. Preview shape absent from staking/engine/card/modal
  output; not imported by any live/engine/UI file; live suggestions `not_evaluated`;
  all selection flags false; `productionReady` stays `false`. Fixtures 13B-A…AI (+33).
  Next: **human approval / source re-verification**, or mounting the preview behind a
  dev-only route.
- Step 13C (done): **dev-only mounted preview route for the exact SOL staking
  recommendation (unreachable in production/normal dev)**. Added
  `app/src/components/internal/internalPreviewFlags.ts` (route flags +
  `isInternalSolLstPreviewRouteEnabled()` — true only under `import.meta.env.DEV` +
  `VITE_INTERNAL_SOL_LST_PREVIEW="true"`), `InternalPreviewGate.tsx`,
  `SolLstSelectorPreview.tsx` (disabled-button preview component), and
  `solLstSelectorPreview.css` (scoped under `.internal-sol-lst-preview`), plus
  `protocolSolLiquidStakingSelectorPreviewRoute.md`. Added
  `getInternalOnlySolLstSelectedPreviewExample()` (future selected-state copy;
  JitoSOL only as `INTERNAL_PREVIEW_NOT_LIVE`, no `selectedProtocolId`, no QA score,
  disabled actions, "WealthSmith does not move funds for you."). `App.tsx` gains a
  dev-only guarded branch (wrapping `MainApp`) rendering the preview ONLY at
  `/internal/sol-lst-preview` when the dev flag is set — every normal/production flow
  is unchanged. Route flags all false/dev-gated by default;
  `isInternalSolLstPreviewRouteEnabled()` false by default. Preview absent from
  Dashboard/Portfolio/Card/modal/engine output; live suggestions `not_evaluated`; all
  selection/selector flags false; `productionReady` stays `false`. Run:
  `VITE_INTERNAL_SOL_LST_PREVIEW=true npm run dev` → `/internal/sol-lst-preview`.
  Fixtures 13C-A…AJ (+34). Next: **human approval / source re-verification** before
  any real enablement.
- Step 13D (done): **dev-only fake-token exact SOL staking recommendation UI fixture
  (not Demo Mode, not real wallet, not live)**. Added
  `internalSolStakingRecommendationFixture.ts`/`.md`,
  `SolStakingRecommendationFixture.tsx`, `solStakingRecommendationFixture.css`; added
  a `showFixturePanel` prop to `SolLstSelectorPreview.tsx` (rendered once, on the
  dev-only route via App). Fake wallet: **12.5 SOL total, 0.1 SOL reserve, 12.4 SOL
  eligible** (~$1,860 at a clearly-fake ~$150 price); Jito · JitoSOL shown only as
  `INTERNAL_PREVIEW_NOT_LIVE`; disabled buttons. Constants
  `INTERNAL_SOL_STAKING_RECOMMENDATION_FIXTURE_EXISTS = true`,
  `..._ENABLED_BY_DEFAULT = false`, `..._FAKE_DATA = true`,
  `..._UPDATES_LIVE_SUGGESTIONS`/`..._ENABLES_SELECTION`/`..._ENABLES_TRANSACTIONS =
  false`. Fixture module/component not imported by `stakingSuggestion`/`engine`/
  `toSuggestionCard`/Dashboard/Portfolio/modal; no fixture copy in any live/engine/
  card/modal output; live suggestions `not_evaluated`; Demo Mode unchanged; all
  selection/selector flags false; `productionReady` stays `false`. Fixtures 13D-A…AK
  (+34). Next: **human approval / source re-verification** before any real enablement.
- Step 13E (done): **Demo Mode exact SOL staking scenario via the SHARED UI (product
  decision: risk direction confirmed + JitoSOL source verified for UI/demo — NOT
  production activation)**. Added `demoExactSolStakingScenario.ts`/`.md`: builds a
  shared `RailSuggestions` (`SuggestionCardState` + `SuggestionReviewDetails`) rendered
  through the SAME `RealWalletSuggestionsRail` → `SuggestionCard` →
  `SuggestionReviewModal` real wallet mode uses — no separate demo-only card/modal/
  layout. Added optional protocol-display fields to the shared card +
  review-details models (real wallet does not populate them). `DemoDashboardPage`
  gains a "Default Demo / SOL Staking Demo" switch (Default Demo unchanged). Fake
  wallet: **12.5 total / 0.1 reserve / 12.4 eligible SOL** ($150 fake → $1,860); Jito ·
  JitoSOL labeled **`DEMO_PREVIEW_NOT_LIVE`** (never `INTERNAL_PREVIEW_NOT_LIVE`).
  Review-only, no transaction/signature; scenario not imported by `stakingSuggestion`/
  `engine`/`toSuggestionCard`; real-wallet staking `not_evaluated` with no
  selectedProtocolId/Name; all selection/selector flags false; `productionReady` stays
  `false`. Fixtures 13E-A…AL (+35). Next: **human approval / source re-verification**
  before any real-wallet enablement.
- Step 13F (done): **verified JitoSOL market data in the Demo exact SOL staking
  scenario (Demo Mode only)**. Extended the shared `ProtocolSelectionDisplay`
  (`engineTypes.ts`) with optional `sourceStatusLabel` + `marketData` +
  `productionStatus`; the shared `SuggestionReviewModal` renders a market-data section
  when `marketData` is present. Demo scenario shows: TVL **$767.95M**, current APY
  **5.36%**, 30-day APY **5.45%**, direct unstake **~48h**, unstake fee **0.1%**, **4%**
  annual management fee on rewards, source status **"Verified source data · Demo
  preview"**; the demo guardrail reads "Protocol selection (verified for demo)" instead
  of "needs market data". Shared section (real wallet mode uses it later), gated on
  `marketData`. Demo label stays `DEMO_PREVIEW_NOT_LIVE` (never
  `INTERNAL_PREVIEW_NOT_LIVE`). **No production enablement:**
  `productionStatus.realWalletSelectionEnabled`/`.transactionsEnabled` false;
  real-wallet staking `not_evaluated` with no selectedProtocolId/Name; all
  selection/selector flags false; `productionReady` stays `false`; no
  transaction/signature path. Fixtures 13F-A…Z (+26). Next: **human approval /
  source re-verification** before any real-wallet enablement.

All suggestion categories and reason codes are implemented. Every documented
suggestion path — including `duplicate_exposure` — now emits. Protocol selection
is a QA-proven-but-DISABLED pipeline behind default-off feature flags (registry +
adapters + eligibility + route guardrails + scoring + QA-only narrow-case
selection + production-readiness plan + first-case real-data mapping + hardened
internal dry-run + verified source completion + Stage-2 real-data dry-run report +
machine-checkable go/no-go checklist + data sourcing pack + draft riskScore rubric +
risk evidence drafts + reviewer approval decision gate + one-candidate evidence
completion harness + source-verification intake + source-value confirmation intake +
real value-confirmation ledger + evidence gather-decision ledger + JitoSOL
ready-for-review evidence package + gated riskScore assignment mechanism + staged
JitoSOL production metadata + hard-disabled selector shell + internal UI preview
shell + dev-only preview route + fake-token recommendation fixture); production
selection remains not evaluated / not implemented, and the go/no-go reports
`productionReady = false`.

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

## JitoSOL read-only recommendation (Step 13G)

The exact SOL staking recommendation for **JitoSOL** is enabled in real wallet mode
behind a read-only beta flag — see [jitoSolBetaActivation.md](jitoSolBetaActivation.md).
When on, the live "Put Idle SOL to Work" suggestion names **Jito · JitoSOL** as the
"Suggested protocol to review" (mode `production`, no DEMO/INTERNAL label) with verified
market data in Review Details. It is **read-only**: no transaction, no signature, no
fund movement, review-only CTA. Execution guardrails (cost/liquidity/slippage) stay not
evaluated. Only SOL staking is affected; stable-yield selection stays `not_evaluated`.
Global flags (`PROTOCOL_SELECTION_IMPLEMENTED`, `..._SHOW_IN_UI`,
`..._ALLOW_TRANSACTIONS`, go/no-go `productionReady`, `PROTOCOL_SOL_LST_SELECTOR_ENABLED`)
stay `false`; rollback is a single flag flip back to `not_evaluated`.

## Hidden `/testing` page for visual QA (Step 13H)

A hidden, fixture-only page at `/testing` renders **every** suggestion category through
the SAME shared `SuggestionCard` + `SuggestionReviewModal` real wallet mode uses — see
[testingPage.md](testingPage.md). It is for visually verifying how each category looks
in the real card and Review Details modal. It is **not in navigation**, not linked from
any page, reachable only by opening the URL (gated by `isTestingPageEnabled()`: dev, or
`VITE_ENABLE_TESTING_PAGE=true`), uses deterministic fixtures labeled
`TESTING_PREVIEW_NOT_LIVE`, connects no wallet, enables no transactions, and mutates no
live/Demo behavior. `TestingPage` is imported only by `App.tsx`'s route gate.

## Read-only route / liquidity / slippage evaluation (Step 13I)

The JitoSOL recommendation now shows a **read-only** "Route and execution checks" section
in Review Details — see [jitoSolReadOnlyRouteEvaluation.md](jitoSolReadOnlyRouteEvaluation.md).
Idle SOL → JitoSOL is a **direct protocol stake**, so route cost is *checked for review*
and DEX liquidity depth / slippage are *not applicable*; a swap-route path stays
*insufficient data* until a real read-only quote exists (values are never invented). It
is evaluation only — no swap, no transaction, no signature, no route execution — and the
suggestion stays `review_only` with all execution booleans false. The section replaces
the generic "not evaluated yet" route rows for this recommendation (real wallet, Demo,
and `/testing`); other suggestions are unchanged.

## Read-only "Open Jito staking page" link (Step 13J)

Review Details for the JitoSOL recommendation includes a read-only **"Open Jito staking
page"** link that opens `https://www.jito.network/staking/` in a new tab on user click
(`target="_blank"`, `rel="noopener noreferrer"`). WealthSmith never auto-opens it,
executes a transaction, requests a signature, or completes the suggestion — the user
chooses to continue externally. It appears on real wallet, Demo (`DEMO_PREVIEW_NOT_LIVE`),
and `/testing` (`TESTING_PREVIEW_NOT_LIVE`) via the shared modal, and the card keeps its
separate "Review" button (the link never becomes the CTA). Testing scope + QA status:
[jitoSolRecommendationQaChecklist.md](jitoSolRecommendationQaChecklist.md) — **real-wallet
browser QA is pending a funded wallet**; real-wallet behavior stays covered by fixtures.

## Multi-protocol SOL LST candidate registry (Step 14A)

A read-only, **data-model-only** registry of the MVP SOL liquid-staking candidates and the
data each still needs before it could become eligible — see
[solLiquidStakingCandidateRegistry.md](solLiquidStakingCandidateRegistry.md). Five
candidates: **Jito · JitoSOL** (`active_read_only_beta`, approved, risk 7.75, verified data)
and **Marinade · mSOL / Jupiter · JupSOL / BlazeStake · bSOL / Sanctum · INF**
(`staged_candidate` only — not approved, no risk score, `needs_review` data,
`source_reverification_required`). It changes **nothing live**: JitoSOL stays the only
selected protocol, staged candidates never appear in real wallet mode, and no
transaction/signature/selection is enabled (the module is not imported by any live/UI file).
Future: 14B source/value confirmation, 14C risk scoring, 14D selector comparison.

## Staged-candidate source/value confirmation (Step 14B)

Source values for the staged candidates (mSOL/JupSOL/bSOL/INF) are recorded and
freshness-checked in
[solLiquidStakingSourceValueConfirmation.md](solLiquidStakingSourceValueConfirmation.md).
Prior DefiLlama TVL/APY/30-day values for JupSOL/mSOL/bSOL are recorded with a **24h
freshness rule** — `verified` only within 24h of confirmation, else `stale` (currently
stale); INF market data is `missing` (none invented); mechanics/evidence are
`needs_review`. `readyForRiskScoring` is false for all four. It changes **nothing live**:
no approval, no risk score, no selection, no live-recommendation change, no
transaction/signature — the module is not imported by any live/UI file. JitoSOL stays the
only selected protocol.

## Risk scoring gate for staged candidates (Step 14C)

A **gate, not scoring** — see [solLiquidStakingRiskScoringGate.md](solLiquidStakingRiskScoringGate.md).
`evaluateSolLstRiskScoringGate(protocolId, options?)` reports each staged candidate as
`blocked` with exact reasons (mSOL/JupSOL/bSOL: `market_data_stale` + mechanics/evidence
review + source re-verification + `approved_rubric_missing` + `risk_approval_decision_missing`;
INF: `market_data_missing` + the same). `ready_for_scoring` requires all prerequisites
verified — **none qualify today** (`readyForScoringCount: 0`, `blockedCount: 4`). Jito
returns `already_approved`; unknown protocols `not_candidate`. It **assigns no scores,
approves no candidates**, and changes nothing live (no selection, no live recommendation,
no transaction/signature; not imported by any live/UI file). Next: 14E assigns scores only
for `ready_for_scoring` candidates.

## Fresh source/evidence intake for staged candidates (Step 14D)

An **intake + validation** layer for recording fresh market/mechanics/evidence for
mSOL/JupSOL/bSOL/INF before scoring — see
[solLiquidStakingFreshEvidenceIntake.md](solLiquidStakingFreshEvidenceIntake.md).
`validateSolLstFreshEvidenceInput` / `createSolLstFreshEvidenceRecord` accept a record only
with value + sourceName + sourceUrl + confirmedAt + confirmedBy + reviewerRole and within
the 24h window (else `stale`/`incomplete`/`rejected`); type mismatches and unsupported
protocols/categories are rejected. `summarizeSolLstFreshEvidenceRecords` reports
`marketDataComplete`/`mechanicsComplete`/`evidenceComplete`/`readyForRiskGate`, and a
non-live `previewSolLstRiskGateWithFreshEvidence` shows that even a complete package
**still requires rubric + risk-approval decision**. It **invents no values**, assigns no
scores, approves nothing, and changes nothing live (not imported by any live/UI file).

## Real fresh-evidence records for staged candidates (Step 14E)

Where real, freshly verified evidence is recorded via the 14D intake — see
[solLiquidStakingFreshEvidenceRecords.md](solLiquidStakingFreshEvidenceRecords.md).
**Current state: Mode A (empty/partial)** — no fresh verified values are available yet, so
the per-candidate input arrays are empty and **all four candidates remain blocked** (none
`readyForRiskGate`); the stale 14B values are not reused as fresh and nothing is invented.
`getSolLstFreshEvidenceRecords` / `getSolLstFreshEvidenceSummaries` /
`summarizeSolLstFreshEvidenceRecordStatus` report the roll-up (all counts 0). Add records
by appending fully populated inputs to the matching array; a candidate becomes ready only
with all ten categories fresh + accepted, and even then still needs rubric + risk-approval
decision. No scores, no approval, no live/Demo/testing change, no transaction/signature.

**Steps 14F–14I — Marinade · mSOL:** founder-authorized public-source fetches recorded **all
10** categories (accepted): market data (`tvl`/`current_apy`/`apy_30d`, DefiLlama pool) +
`withdrawal_mechanics` + `audit_security` (14F); `direct_unstake_fee` (0.2% direct/delayed
path, FAQ verbatim), `operational_risk`, `incident_review` (documented SAM unstake-priority
logic bug — not a clean-history claim) (14G); `annual_management_fee` = 0 (Marinade docs
verbatim "No performance fees on staking rewards") (14H); and `direct_unstake_time` as
sourced **epoch-based text** (14I — the intake now accepts `direct_unstake_time` as numeric
hours OR text, so no hours are invented for an epoch-based protocol). mSOL is now
**`readyForRiskGate: true` while fresh** (stale beyond 24h). No stale 14B value reused,
nothing invented.

## mSOL risk score — assigned for review (Step 14J)

Marinade · mSOL is assigned a deterministic, evidence-based **risk score of 7.40 / 10**
(`assigned_for_review`, draft rubric) — see
[solLiquidStakingMsolRiskScore.md](solLiquidStakingMsolRiskScore.md). Dimension scores
(audit 9, maturity 8, TVL 7, withdrawal/fee transparency 8, operational 6, incident 4) are
weighted by the existing rubric; the score is assigned only when the evidence is fresh +
`readyForRiskGate` (stale → `null`/blocked). The rationale weighs the disclosed SAM
unstake-priority bug as real risk signal and the audits/TVL as positive signals. **It is
score assignment only:** mSOL stays `staged_candidate` with `approvedForReadOnlyRecommendation:
false`, `selectedByProtocolLogic: false`, `currentWinner: false`, the registry `riskScore`
stays `undefined`, JitoSOL remains the only selected live protocol, and there is no live/Demo/
testing change and no transaction/signature. Next: read-only recommendation approval → UI
exposure → later selector comparison.

## mSOL read-only review approval (Step 14K)

mSOL is **approved for read-only review exposure** — see
[solLiquidStakingMsolReadOnlyApproval.md](solLiquidStakingMsolReadOnlyApproval.md). The gate
requires a risk score ≥ 7 (mSOL: 7.40), fresh evidence + `readyForRiskGate`, and the SAM
incident acknowledged; below-threshold or stale → blocked/`null`. The decision approves mSOL
to appear as an **alternative protocol to review** — `approvedForReviewExposure: true` — but
`approvedForProtocolSelection: false`, `selectedByProtocolLogic: false`, `currentWinner:
false`, and no live-recommendation/transaction/signature change. It **does not mutate the
base registry** (mSOL stays staged/unapproved/unscored there; the selector-facing
`getApprovedSolLiquidStakingCandidates()` stays Jito-only); the review approval is a separate
non-mutating preview (`getReadOnlyReviewApprovedSolLiquidStakingCandidates()`, JitoSOL +
mSOL). mSOL is **not shown in the UI yet** (that's 14L) and JitoSOL remains the only selected
live protocol.

## mSOL surfaced as read-only alternative to review (Step 14L)

Approved mSOL is now shown as a read-only **"Other protocols to review"** section in the
shared `SuggestionReviewModal` across real wallet, Demo Mode, and `/testing` (a dedicated
"mSOL Review Candidate" card). `buildMsolReadOnlyReviewCandidateDisplay({checkedAt})` renders
it: **fresh** → `approved_for_review_exposure` with TVL/APY/mechanics/evidence + risk score
**7.40/10**; **stale** → `stale_evidence` ("Evidence needs refresh"), no current data. It is
review-only — `selectedByProtocolLogic`/`currentWinner`/`transactionsEnabled`/
`walletSignatureRequired` are always false, there is no execution CTA, and the modal states
"Not selected by protocol logic yet.", "Final protocol selection will happen later through
deterministic WealthSmith protocol logic.", and "Review only — WealthSmith will not move funds
for you." **JitoSOL stays the selected protocol** (via `ProtocolReviewCandidateDisplay` +
`SuggestionReviewDetails.otherProtocolsToReview`); mSOL never becomes `selectedProtocolId`,
never affects Top Pick/ordering, and the multi-protocol selector comparison stays deferred.

## Jupiter · JupSOL onboarded through the full read-only pipeline (Step 14M)

Jupiter · JupSOL is run through the **same gated pipeline** as mSOL, end-to-end in one step:
**(1) fresh evidence** — founder-authorized public-source fetches recorded **all 10**
categories (DefiLlama JupSOL pool `52bd72a7-…`: TVL ~$391.9M, current APY 5.68777%, 30-day mean
5.60%; Jupiter docs: instant DEX swap **or** ~2-day/one-epoch delayed unstake recorded as
epoch-based **text**, 0.1% pool-unwrap fee, 5% inflation commission recorded as
`annual_management_fee` with the separate Sanctum epoch fee disclosed in notes, Sanctum SPL
Stake Pool Program audited 9× / >$4B secured, single-validator + 11-member-multisig
operational risk, and a point-in-time incident review that is **not** a clean-history claim);
**(2) risk score 7.65/10** (`assigned_for_review`, draft rubric) — see
[solLiquidStakingJupsolRiskScore.md](./solLiquidStakingJupsolRiskScore.md), only assigned when
evidence is complete + fresh; **(3) read-only review approval** (score ≥ 7, risks
acknowledged) — see
[solLiquidStakingJupsolReadOnlyApproval.md](./solLiquidStakingJupsolReadOnlyApproval.md);
**(4) UI exposure** via `buildJupsolReadOnlyReviewCandidateDisplay({checkedAt})`, shown in the
modal's "Other protocols to review" section **alongside mSOL** in real wallet, Demo, and
`/testing` (fresh → `approved_for_review_exposure` with data + 7.65 score; stale →
`stale_evidence`, no data). JupSOL is **review-only**: it never becomes `selectedProtocolId`,
never the winner, never affects Top Pick/ordering, has **no execution path**, and the base
registry stays Jito-only for the selector. The combined non-mutating preview
`getAllReadOnlyReviewApprovedSolLiquidStakingCandidates()` returns Jito + mSOL (verbatim from
the mSOL module, unchanged) + JupSOL when fresh. **JitoSOL remains the only selected protocol**
and the multi-protocol selector comparison stays deferred.

## BlazeStake · bSOL onboarded through the full read-only pipeline (Step 14N)

BlazeStake · bSOL is run through the **same gated pipeline** as mSOL and JupSOL, end-to-end in
one step: **(1) fresh evidence** — founder-authorized public-source fetches recorded **all 10**
categories (DefiLlama bSOL pool `387d6732-…`: TVL ~$67.1M, current APY 5.59573%, 30-day mean
5.34% — fresh, not the stale 14B values; BlazeStake docs: instant reserve-pull unstake **or**
delayed unstake that converts bSOL to a native Solana stake account, `direct_unstake_time`
recorded as epoch-based **text** — mechanism from BlazeStake docs, ~2-3 day / epoch-boundary
basis from Solana's standard stake-deactivation cooldown, no fixed hours invented; 0.1%
instant/delayed unstake fee; `annual_management_fee` 0% ("Epoch fee: 0%"); audited 7× by 5
firms — Quantstamp, Neodyme ×4, Kudelski, Halborn, OtterSec; non-custodial + Solana-Foundation-
overseen upgrade multisig operational risk; and a point-in-time incident review that is **not**
a clean-history claim); **(2) risk score 7.35/10** (`assigned_for_review`, draft rubric) — see
[solLiquidStakingBsolRiskScore.md](./solLiquidStakingBsolRiskScore.md), only assigned when
evidence is complete + fresh (lowest of the reviewed set, dragged by the smallest TVL, lifted
by strong audits + transparent low fees); **(3) read-only review approval** (score ≥ 7, risks
acknowledged) — see
[solLiquidStakingBsolReadOnlyApproval.md](./solLiquidStakingBsolReadOnlyApproval.md);
**(4) UI exposure** via `buildBsolReadOnlyReviewCandidateDisplay({checkedAt})`, shown in the
modal's "Other protocols to review" section **alongside mSOL and JupSOL** in real wallet, Demo,
and `/testing` (fresh → `approved_for_review_exposure` with data + 7.35 score; stale →
`stale_evidence`, no data). bSOL is **review-only**: it never becomes `selectedProtocolId`,
never the winner, never affects Top Pick/ordering, has **no execution path**, and the base
registry stays Jito-only for the selector. `getAllReadOnlyReviewApprovedSolLiquidStakingCandidates()`
now returns Jito + mSOL + JupSOL (all unchanged) + bSOL when fresh (the bSOL entry is built by
the bSOL module's `getBsolReviewApprovedCandidateEntry()`). **JitoSOL remains the only selected
protocol** and the multi-protocol selector comparison stays deferred. (Sanctum · INF remains a
staged candidate with no fresh evidence.)

## Sanctum · INF run through the pipeline — BLOCKED below threshold (Step 14O)

Sanctum · INF — a **multi-LST / shared-liquidity pool**, not a single LST — is run through the
same gated pipeline. **(1) fresh evidence** — founder-authorized public-source fetches recorded
**all 10** categories (DefiLlama INF pool `3075a746-…`: TVL ~$152.6M, current APY 5.83868%,
30-day mean 5.95% from raw JSON; Sanctum docs: INF is a shared-liquidity pool that HOLDS many
underlying LSTs — all Sanctum LSTs plus non-Sanctum **jitoSOL and bSOL** plus SOL/wSOL — with
dynamic allocation; RemoveLiquidity redemption is instant so `direct_unstake_time` is sourced
**text** with no invented hours; 0.2% withdrawal fee; 0% pool-level management fee; Infinity
program audited 3× (OtterSec/Sec3/Neodyme) + base SPL stake pool 5×; and a point-in-time
incident review that is **not** a clean-history claim). Crucially, `operational_risk` records
the **OVERLAP** — INF's underlying exposure overlaps JitoSOL (selected) and bSOL (a review
candidate), so it is explicitly **not** framed as independent diversification. **(2) risk score
6.95/10** (`assigned_for_review`) — see
[solLiquidStakingInfRiskScore.md](./solLiquidStakingInfRiskScore.md); its multi-LST structure,
added program surface, variable swap-fee transparency, and non-independent overlap place it just
**below** the single-LST cohort. **(3) read-only review approval — BLOCKED:** 6.95 is below the
7.0 threshold, so `getInfReadOnlyApprovalDecision()` is `null` with blocker
`risk_score_below_threshold` (see
[solLiquidStakingInfReadOnlyApproval.md](./solLiquidStakingInfReadOnlyApproval.md)). **(4) UI
exposure — none product-facing:** INF is NOT surfaced in Real Wallet / Demo / the approved
"Other protocols to review" section, and is NOT added to
`getAllReadOnlyReviewApprovedSolLiquidStakingCandidates()` (still Jito + mSOL + JupSOL + bSOL).
Its only UI presence is a clearly-labelled **internal `/testing` BLOCKED** card
(`testing_inf_blocked`, driven by `getInfBlockedReviewSummary`) that documents the completed
evidence + below-threshold score + multi-LST/overlap, review-only with no execution CTA. mSOL,
JupSOL, and bSOL review behavior are unchanged, and JitoSOL remains the only selected protocol.
This is the gate working as intended — a complete, well-audited candidate can still fall short
of the review-exposure bar. All five staged SOL LST candidates are now processed (4 approved for
read-only review, INF blocked); the natural next step is the deterministic multi-candidate
selector comparison across the approved review candidates.

## Native SOL / Jupiter Native Stake baseline added — BLOCKED, incomplete (Step 14P)

A **Native SOL / Jupiter Native Stake BASELINE** candidate is added before the selector
comparison — deliberately as a **separate** module set
([solNativeStakingBaselineEvidence.ts](./solNativeStakingBaselineEvidence.ts) /
[RiskScore.ts](./solNativeStakingBaselineRiskScore.ts) /
[ReadOnlyApproval.ts](./solNativeStakingBaselineReadOnlyApproval.ts)), because it is **not an
LST and not JupSOL**: it is a native Solana **stake account** of delegated SOL (`protocolId
"jupiter_native_stake"`, `assetSymbol "SOL"`, `candidateType "native_staking"`,
`isLiquidStakingToken: false`, `splTokenMint: null`). **Detection distinction** (see
[solNativeStakingBaselineEvidence.md](./solNativeStakingBaselineEvidence.md)): native staking
is detected via **Solana stake accounts** (no SPL mint, not liquid by default, Staked Assets),
whereas JupSOL is detected via an **SPL token mint** (liquid, DeFi-composable) — the two are
never conflated.

**Outcome: BLOCKED (incomplete evidence).** Founder-authorized collection recorded **7 of 10**
categories from authoritative Jupiter FAQ docs + the Solana native-staking model (withdrawal
mechanics; epoch-based unstake ~2 days; **5% validator commission** on inflation / 0% MEV —
resolving a search-snippet "0% commission" conflict via the authoritative doc; 0% management
fee; non-custodial security model; validator/delegation + lower-composability operational
risk; point-in-time incident review). The **3 market categories** (delegated stake / current
APY / 30-day APY) are **not published by Jupiter** and the validator stats page is JS-rendered,
so they were left **missing** rather than invented or reused from JupSOL → `readyForRiskGate:
false` → **no risk score** → **not approved** → **no product-facing UI**. The risk-score module
still defines the native-adapted rubric mapping + qualitative rationale (not-an-LST,
validator/delegation risk, epoch unstake timing, lower composability) so a score can be
assigned once the market evidence is completed. Native staking's only UI presence is a
clearly-labelled internal `/testing` BLOCKED card (`testing_native_stake_blocked`). JitoSOL
remains the only selected protocol; mSOL/JupSOL/bSOL review behavior and INF's blocked state
are unchanged; the selector comparison stays disabled. The baseline is now in place to compare
the approved LST candidates against native staking once its evidence completes.

## Native validator market-data adapter (Step 14Q)

The bridge for native staking's three missing market fields is
[nativeValidatorMarketData.ts](./nativeValidatorMarketData.ts) — a **hybrid** adapter (Option
C): **Solana RPC `getVoteAccounts`** is the source of truth for delegated stake + commission,
and a **validator analytics provider** (Stakewiz → Solana Compass → Validators.app) supplies
current + 30-day APY. It provides `parseJupiterNativeStakeVoteAccountFromGetVoteAccounts`
(stake/commission; flags `vote_account_not_found` / `validator_delinquent`),
`parseNativeValidatorApyFromAnalytics` (defensive, fixture-driven; computes the 30-day mean
from the last ≤30 validator-specific history values; refuses a network-wide-only payload;
fails safely on an unknown schema), `buildNativeValidatorMarketData` (combines them →
`complete` / `partial` / `missing` / `stale`; `delegatedStakeUsd` only with a SOL price), a
documented (un-wired) `fetchNativeValidatorMarketData` contract, and
`convertNativeValidatorMarketDataToEvidenceInputs` (turns **complete** data into the 3 missing
native evidence inputs). **Safeguards baked in:** never reuses JupSOL APY/TVL
(`..._USES_JUPSOL_APY`/`..._USES_JUPSOL_TVL` false), never uses a network-wide APY to unblock
the candidate, never approves native staking, never enables the selector comparison, never
updates live recommendations, and has no transaction/signature path; every record keeps
`isLiquidStakingToken: false` / `splTokenMint: null`. 14Q ships the **adapter + fixtures only**
— it does not live-fetch or fill the evidence array, so the native baseline stays **blocked**,
JitoSOL stays the only selected protocol, and the LST candidates + INF are unchanged. A later
backend/job can feed real payloads through the builder to complete the evidence.

## Jupiter Native Stake completed with Stakewiz + Marinade (Step 14T)

Jupiter Native Stake is now a fully **approved read-only "Baseline to review"** candidate,
completed with **public, no-API-key validator data**. Its three market evidence records come from:

- **Stakewiz** (`api.stakewiz.com/validator/{vote}`) — delegated stake (~12,500,954 SOL),
  current APY (5.23%), commission (5%), identity, delinquency, epoch.
- **Marinade validators API** (`validators-api.marinade.finance/validators?query_vote_accounts={vote}`,
  see [nativeValidatorMarinadeData.md](./nativeValidatorMarinadeData.md)) — per-epoch validator
  APY history → a **duration-weighted 30-day average = 5.40%** over 15 completed epochs
  (30.13-day coverage; cross-checked against Trillium, epoch 1000: 5.2523% vs 5.2462%).

All three are validator-specific (vote `CatzoSMUk…`, identity `JUPiTERr…`): **not** JupSOL,
**not** mSOL, **not** network-wide, and Marinade's `/msol/apy` endpoint is explicitly rejected.
With 10/10 fresh evidence → `readyForRiskGate` → a deterministic **risk score of 7.10** (audit
8, maturity 7, delegated-stake 8, fee-transparency 7, operational 5, incident 7) → read-only
approval (>= 7). It renders as a **"Baseline to review"** in Real Wallet, Demo, and `/testing`,
alongside the mSOL/JupSOL/bSOL alternatives, showing "Not a liquid staking token · Native SOL
stake-account based", delegated stake (SOL), current + 30-day APY (with methodology), validator
commission, epoch-based unstake timing, and the 7.10 score — never selected, never the winner,
no execution path. JitoSOL stays the only selected protocol; mSOL/JupSOL/bSOL review behavior
and INF's blocked state are unchanged; the multi-protocol selector comparison stays deferred.

**Production architecture** (not built here): Stakewiz + Marinade public validator APIs → a
WealthSmith server-side refresh job (current data every 6–12h; Marinade history once per epoch
or every 6–12h) → schema validation → normalized cache/history (WealthSmith keeps its own
snapshots as backup) → selector data layer → frontend. Fail closed on stale/malformed data;
never fetch per browser user.

## 14U — live SOL staking market-data refresh + cache

A production **refresh + last-known-good cache** layer for the eligible SOL staking candidates,
SEPARATE from point-in-time approval evidence (see
[solStakingMarketDataRefresh.md](./solStakingMarketDataRefresh.md)). LSTs (JitoSOL/JupSOL/mSOL/
bSOL/INF) refresh from the DefiLlama public yields feed by exact verified pool UUID; Jupiter
Native Stake reuses the 14T Stakewiz + Marinade pipeline. Each candidate snapshot is marked
complete/partial/stale/invalid/missing/source_error honestly, carries field-level source
attribution, and fails closed. `npm run market:refresh-staking` runs the server-side job (no API
keys, no browser fetch, atomic write to git-ignored `tmp/sol-staking-market-data-cache.json`,
merging over the previous last-known-good cache). Approval reflects the EXISTING decision (never
recomputed); `eligibleForFutureComparison` is data-readiness only and does not enable anything.
No selector/ranking/winner, no risk-score or evidence mutation, no JitoSOL/Top-Pick/ordering
change, INF stays blocked, no transaction/signature path, no product-facing UI change. Next:
14V normalization → 14W deterministic selector.

## 14V — normalized SOL staking comparison model

One deterministic, comparison-ready model over the Step 14U live cache + reviewed static facts
(see [solStakingCandidateNormalization.md](./solStakingCandidateNormalization.md)). It aligns
field names while PRESERVING semantics via a per-metric `comparisonScope`: APY (current / 30-day
/ transparent delta) and reviewed risk score are `all_candidates`; LST TVL is `lst_only`; native
delegated stake is `native_only`; fees are `candidate_type_specific`; exit + token model are
`descriptive_only`. LST TVL (USD) and native delegated stake (SOL) are never marked directly
comparable, no synthetic total fee is created, reviewed risk scores are carried (not
recalculated), and no fixed hours are invented for epoch exits. `eligibleForFutureSelectorInput`
is data-readiness only. Stale/partial approved candidates stay approved but excluded; INF is
normalized for diagnostics but never selector-ready. No selector score/weights/ranking/winner, no
`selectedProtocolId` change, no product UI, no execution. Real-cache QA: selector-ready = jito,
jupiter, marinade, blazestake, jupiter_native_stake; excluded = sanctum. Next: 14W deterministic
selector.

## 14W — deterministic read-only SOL staking selector comparison

An internal, comparison-only module (see
[solStakingSelectorComparison.md](./solStakingSelectorComparison.md)) that scores the Step 14V
selector-ready candidates under the explicit `balanced_safety_first_v1` policy: reviewed risk
score 0.50 (used exactly, never recalculated), 30-day APY 0.30, current APY 0.10, APY stability
0.10 (weights total 1.00). APY dimensions use midpoint cohort normalization with minimum
meaningful ranges (0.25 / 0.10 pct pts) so narrow cohorts are not stretched to a full 0–10 spread;
stability is a transparent consistency signal, not a risk score. Adoption, fees, exit, and token
model stay zero-weight descriptive context (LST TVL vs native delegated stake never cross-type
compared). Deterministic tie-break: total → risk → 30d APY → lower abs delta → current APY →
canonical order. It identifies a "comparison leader" (rank 1) and NEVER activates it: no
`selectedProtocolId` change, no product `currentWinner`, no multi-protocol selection, no
UI/Top-Pick/engine-ordering change, no execution; JitoSOL stays selected, INF stays blocked.
Real-cache QA leader = marinade (validated, independent recompute matches). Future activation is
gated behind policy/result review, sensitivity analysis, a scheduled refresh job, explicit
approval, regression QA, product-copy review, and a rollback plan.

## 14X — selector sensitivity + activation gate

A deterministic sensitivity + activation-REVIEW layer (see
[solStakingSelectorActivationReview.md](./solStakingSelectorActivationReview.md)) over the Step 14W
comparison. It runs 18 deterministic scenarios (baseline + 5 policy-weight + 2 normalization-range
+ 6 market-perturbation + 4 data-availability) through the existing 14W engine — never mutating the
base policy, the normalized set, reviewed risk, approval, the cache, or evidence — and aggregates
leader retention, margins, knife-edge, and policy/market/data-availability sensitivity. Historical
analysis uses only real supplied snapshots (≥12 spanning ≥72h to pass; empty → insufficient).
`evaluateSolStakingSelectorActivationGate` combines comparison + sensitivity + history + truthful
operational readiness into an activation-review decision in strict gate order; even
`ready_for_human_activation_review` activates nothing (no selectedProtocolId change, no product
winner, no UI/Top-Pick/ordering change, no execution). Current real-cache outcome: leader mSOL is
policy-robust but market-sensitive; activation is blocked on historical coverage (and operational
readiness + human approval). Jito stays selected, INF stays blocked/unscored.

## 14Y — "Top protocol to review right now" (read-only dynamic display)

Surfaces the current Step 14W comparison leader to users as a READ-ONLY, DYNAMIC "Top protocol to
review right now" (see [solStakingSelectorPresentation.md](./solStakingSelectorPresentation.md)). A
separate DISPLAY gate (distinct from the Step 14X activation gate) shows the leader only when the
comparison is complete, fresh (cache ≤24h), valid, and has ≥2 selector-ready candidates — it does
NOT require historical coverage, sensitivity pass, operational readiness, or human approval (those
gate automatic selectedProtocolId changes only). The browser fetches ONLY the sanitized same-origin
`/generated/sol-staking-market-cache.json` (published by `npm run market:refresh-and-publish-staking`,
git-ignored) — never public providers. The presentation consumes the exact Step 14W ranking
(preserving scores/breakdown/APY/risk), with deterministic copy (never best/safest/guaranteed/
recommended, never the engine "Top Pick"), a four-dimension "why it leads" explanation, and
zero-weight adoption/fee/exit context. INF stays absent from the ranking; native appears when
eligible. Rendered in the review modal's "Current comparison" section (browser-verified on /testing).
No selectedProtocolId change, no product winner, no Top Pick/ordering change, no execution; JitoSOL
stays the underlying selection and Step 14X activation stays blocked.

## 14Z — Demo + Real Wallet comparison integration

Wires the dynamic Step 14W comparison leader into the Demo and Real Wallet staking cards + review
modal with a deterministic "Why this protocol currently leads" explanation (see
[solStakingSelectorProductIntegration.md](./solStakingSelectorProductIntegration.md)). One
`useSolStakingSelectorPresentation()` call at the shared `RealWalletSuggestionsRail` feeds both Demo
(`sol_staking`) and Real Wallet the SAME presentation. The card shows a compact "Top protocol to
review right now" summary; the modal shows the leader header, strongest advantages, trade-offs,
"Compared with the runner-up" (exact score difference), non-scored "Other considerations", and the
exact Step 14W ranking (INF excluded). `buildSolStakingLeaderComparisonExplanation` uses only the
four scored dimensions with exact weights/contributions (leader − runner-up), deterministic
(`aiGenerated: false`), and updates automatically when the leader/runner-up changes (works for mSOL/
JupSOL/JitoSOL/bSOL/native leaders). Displayed protocol follows `topProtocol`, never
`selectedProtocolId`; JitoSOL stays the internal default; no automatic switching, no Top Pick/order
change, no execution. Browser-verified live on /testing (no console errors).

## 15A — investment-target registry (DCA / contribution planning foundation)

A deterministic, versioned, asset-agnostic registry describing what each investment target is
allowed to do (see [investmentTargetRegistry.md](./investmentTargetRegistry.md)). MVP targets
(canonical order usdc, sol, btc, eth — display determinism, not ranking): SOL is the only enabled
growth-contribution target; USDC funds plans / protects the buffer / receives stable allocation
(not a growth DCA target); native BTC and ETH are modeled-not-enabled (native-chain assetIds
`bitcoin:native`/`ethereum:native`, never wrapped, manual-entry only, fail closed). No generic RWA
entry exists — RWA support is proven via the type system + a synthetic fixture, and each future RWA
must be a specific reviewed product (own pricing/liquidity/lockup/jurisdiction/minimum/risk).
`evaluateInvestmentTargetTechnicalEligibility` checks technical readiness only (enabled + holding
source + fresh price + configured allocation/suitability/minimum policy keys) and fails closed; it
never evaluates user suitability, computes an allocation gap/amount, or generates a suggestion. No
product-facing file imports the registry; no execution/signatures. Contribution planning, rhythm
normalization, allocation-gap, and DCA generation all remain disabled.

## 15B — contribution-frequency normalization

A deterministic, versioned, non-UI layer converting a monthly saving goal + the onboarding
contribution frequency into an annual saving budget and (for fixed frequencies) an exact whole-cent
per-contribution decomposition (see [contributionFrequencyNormalization.md](./contributionFrequencyNormalization.md)).
Source of truth is onboarding (`state/goalState.ts` CONTRIBUTION_OPTIONS / `contribution_frequency`):
weekly=52, biweekly=**26** (every two weeks, never twice-monthly/24), monthly=12, quarterly=4,
occasional=irregular. Internal totals are integer cents (no premature rounding); the display average
rounds to 2 decimals. Occasional yields `normalized_occasional` with the annual budget but no
invented count/amount/dates. Fixed results with a remainder warn
`average_amount_requires_cent_distribution`; occasional warns
`contribution_amount_requires_future_user_input`. Fails closed on invalid goal/frequency/currency.
No target selection, allocation gap, safety-buffer, suitability, plan, DCA, suggestion, dates, UI,
or execution; no product-facing import. `CONTRIBUTION_RHYTHM_NORMALIZATION_EXISTS` /
`CONTRIBUTION_FREQUENCY_NORMALIZATION_EXISTS` = true; planning/priority/allocation-gap/DCA remain
disabled.

## 15C — contribution-planning policies (allocation / minimum / suitability / price)

Deterministic, versioned POLICY layers configuring the Step 15A registry so a later allocation-gap
engine can evaluate a target (see [contributionPlanningPolicies.md](./contributionPlanningPolicies.md)).
`growthTargetAllocationPolicy` reuses the EXISTING engine `wallet/recommendedAllocation.ts`
(`deriveRecommendedAllocation`, risk-based; no matrix duplicated), mapping stable bucket → USDC and
growth bucket → the single enabled growth target (SOL); fails closed on >1 growth target without a
sub-allocation policy. `dcaMinimumPolicy` formalizes $50 absolute minimum (= `MIN_DCA_SUGGESTION_USD`),
$250 excess-USDC trigger, 5pp underweight, 0 overshoot; the older "0.25% of portfolio" reference has
no canonical implementation and is NOT enforced. `contributionTargetSuitability` reuses the
allocation result (no duplicate risk matrix; Very Low / 6-month / Big Purchase are reflected through
allocation, not independent bans) → `suitable_for_gap_evaluation` (never "buy SOL").
`contributionPricePolicy` defines a price contract + 60-min freshness with approved non-browser
sources (canonical `token_price_service` = `wallet/tokenPrices.ts`); browser-provider prices
rejected; USDC uses normalized valuation, not hardcoded $1. `contributionTargetPolicyEligibility`
combines them → `ready_for_allocation_gap_evaluation` (activates nothing). SOL's registry keys
migrated from `_v_future` to v1. No gap/amount/plan/suggestion/UI/execution; no product-facing
import; product behavior unchanged.

## 15D — contribution-planning allocation-gap engine

The deterministic, versioned, asset-agnostic allocation-gap engine
([contributionAllocationGapEngine.md](./contributionAllocationGapEngine.md)). It compares a canonical
portfolio snapshot against the Step 15C target-allocation policy and computes, per mapped target:
current USD exposure, current %, target %, signed pp gap, underweight/at-target/overweight
classification, the reused 5-pp trigger, the static current-total USD gap, the internal-reallocation
cap, and the external-contribution cap — plus a hypothetical projection only when an amount is
explicitly supplied. `buildContributionAllocationGapAnalysis` reuses the canonical portfolio total as
the denominator (unknown/non-target/BONK value stays in it), consumes already-aggregated economic
exposure (SOL LSTs + native stake counted once; no double-counting), and fails closed on invalid
totals, duplicate/negative/oversized exposures, invalid policies, or stale snapshots. The internal
(total constant) and external (`(t·P − V)/(1 − t)`, total grows) gaps are distinct — the $10k/$4k/60%
example yields $2,000 internal and $5,000 external. Empty portfolios return `empty_portfolio` (no
divide-by-zero, no invented split). Caps are mathematical only — never "available"/"suggested". No
ranking, no selection, no Safety Buffer/funding/frequency/amount/plan/suggestion; no product-facing
import; product behavior unchanged. `TARGET_ALLOCATION_GAP_ENGINE_EXISTS = true`; the gap engine's
product-output / target-selection / funding / Safety-Buffer flags stay `false`.

## 15E — contribution-priority + Safety Buffer gate

The deterministic priority gate ([contributionPriorityEngine.md](./contributionPriorityEngine.md))
that decides the single purpose category — Safety Buffer → stable allocation → growth allocation →
On Track — before any amount or funding source is chosen. `buildContributionPriorityDecision` reuses
the canonical WealthSmith Safety Buffer (risk-based months × expenses, `deriveSafetyBuffer`) through
a narrow adapter (`buildContributionSafetyBufferSnapshot`; recomputes nothing, redefines no
qualifying asset). An incomplete buffer always overrides and suppresses stable/growth (exposing only
the canonical shortfall — $5,000 in the $9,000/$4,000 example) and does not require a valid
allocation-gap result. When complete, a stable target (USDC) meeting the reused 5-pt trigger takes
priority over growth (SOL) even when growth has a larger gap; growth proceeds only when no stable
target triggers; otherwise On Track (internal state, no card). Stable/growth targets are discovered
by registry ROLE (not hardcoded ids), so future BTC/ETH/RWA work once enabled; multiple stable
destinations without a versioned sub-allocation policy fail closed. No contribution frequency,
funding source, excess-USDC, amount, residual, target selection, DCA plan, or suggestion; no
product-facing import; product behavior unchanged. `CONTRIBUTION_PRIORITY_ENGINE_EXISTS = true`,
`CONTRIBUTION_SAFETY_BUFFER_GATE_EXISTS = true`; funding/amount/plan/suggestion flags stay `false`.

## 15F — contribution funding-source selection + availability

The deterministic funding layer ([contributionFundingSelection.md](./contributionFundingSelection.md))
that decides, for the Step 15E priority, which source is usable and each source's mathematical
capacity. `buildContributionFundingSelection` prefers the **upcoming contribution** (from the Step
15B normalization — exact for zero-remainder fixed frequencies, a base…base+1¢ range otherwise,
requires-explicit for Occasional; or an explicit current amount) over **existing excess USDC**
(growth-only alternative). Liquidity uses a narrow adapter classified upstream — only `liquid_now`
USDC counts; protocol/locked/reserved/unavailable/unknown do not. Excess above the buffer is
`min(liquidNow, max(0, currentEligible − required))` (never `liquid − required`), preserving canonical
coverage. Upcoming capacity is capped by the Step 15D external cap (or the buffer shortfall) and the
$50 minimum; existing excess by the internal cap and the $250 threshold. Ranges that straddle the
minimum → `requires_exact_amount`. Source order (never largest capacity) picks the primary; existing
excess is the alternative when both qualify; sources are never combined; On Track selects none.
Multiple targets are preserved without allocation. No final amount/target/residual/tranches/dates,
no plan/suggestion; no product-facing import; product behavior unchanged.
`CONTRIBUTION_FUNDING_SOURCE_SELECTION_EXISTS`/`…AVAILABILITY_EXISTS = true`; mixed/amount/residual/
plan/suggestion/product-output flags stay `false`.

## 15G — contribution + DCA plan generator

The deterministic, read-only planning layer ([contributionPlanGenerator.md](./contributionPlanGenerator.md))
that combines Steps 15B–15F into ONE structured plan. `buildContributionPlan` selects exactly one
final target (fails closed on multiple — `blocked_multiple_targets`), uses the full Step 15F capped
primary capacity (floors cap-constrained fractional cents so rounding can't overshoot), and emits one
of four kinds: `safety_buffer_contribution` (min(capacity, shortfall), dollar-floor projection),
`stable_allocation_contribution` / `growth_recurring_contribution` (one step, external projection;
the onboarding cadence IS the DCA structure — not re-split), or `growth_excess_usdc_dca` (USDC→growth,
exact total ≥ $250 staged into 4 tranches over 14 days at offsets [0,5,9,14], internal projection,
Safety Buffer preserved). Projections reuse the Step 15D helper; ranges keep base…base+1¢ and the max
bound never overshoots. Deterministic FNV-1a `planId` (excludes `generatedAt`). Only the primary
source is used — no mixed funding, no alternative plan, no residual routing. On Track →
`no_action_required`. No suggestion / route / protocol / fee / slippage / transaction / signature /
calendar date; no product-facing import; product behavior unchanged.
`CONTRIBUTION_PLANNING_EXISTS`/`DCA_PLAN_GENERATION_EXISTS`/`CONTRIBUTION_PLAN_*_EXISTS = true`;
suggestion / product-facing target-selection / execution flags stay `false` until Step 15H.

## 15H — contribution/DCA product integration (engine layer)

Connects the 15A–15G pipeline to the product ([contributionPlanIntegration.md](./contributionPlanIntegration.md)).
`buildContributionPlanPipeline` runs 15B→15G from canonical state via three fail-closed adapters
(portfolio → reuses the canonical total + `deriveStableValue` + `duplicateExposure` SOL grouping, no
double-count; liquidity → only canonically-classified `liquid_now` USDC; price → internal
token-price service, 60-min freshness, no browser fetch), then `buildContributionPlanSuggestion` maps
a ready plan to an `EngineSuggestion` carrying a structured payload (buffer→existing buffer family;
stable/growth→`dca` with one primary reason; funding source is context).
`mergeContributionPlanSuggestion` dedups (one buffer, one DCA — legacy DCA dropped); ordering/Top
Pick reuse `CATEGORY_PRIORITY`/`selectTopPick` (buffer override absolute; Rebalance/Capital
Efficiency outrank DCA). Deterministic card copy (`contributionPlanPresentation`) + shared-modal
review sections (`contributionPlanReviewDetails`, relative "Start/Day 5/9/14" schedule, exact
read-only notice) consume the payload — the UI never recalculates. Plan id stabilized (snapshot
identity, not `checkedAt`). 30 `/testing` scenarios run the real pipeline. Real Wallet never falls
back to fixtures; blocked/stale plans are suppressed. `DCA_SUGGESTION_ENABLED`,
`CONTRIBUTION_TARGET_SELECTION_ENABLED`, `CONTRIBUTION_PLAN_UPDATES_PRODUCT_OUTPUT`,
`CONTRIBUTION_PLAN_GENERATES_SUGGESTION`, and the integration/UI/pipeline flags are `true`; execution/
automation/calendar-date flags stay `false`. Shared React card/modal + `/testing` route + Demo/Real
hooks + browser validation are the follow-up.

### 15H UI turn — shared card/modal + /testing wired

The plan-backed pipeline is now wired into the product UI. `runSuggestionEngine(inputs, generatedAt,
contributionSuggestion?)` merges the plan suggestion (buffer→enriches buffer; dca→DCA slot,
suppresses legacy) BEFORE the existing sort/`selectTopPick`. Real Wallet: `deriveRailSuggestions`
builds it from live state via `contributionProductInput.deriveContributionSuggestion({ dataMode:
"real_wallet" })` and returns `contributionReviewById`. `toSuggestionCard` renders plan-backed cards
from `contributionPlanPresentation` (title/description/impact/**tag**/accessible CTA);
`SuggestionCard` renders the tag badge + accessible CTA (no arithmetic). The shared
`SuggestionReviewModal` gained an optional `contributionReview` prop rendering the review sections
(semantic-list Start/Day 5/9/14 schedule, "Preserved" buffer, exact read-only notice, Close only —
no new modal). `/testing` renders all 30 scenarios through the shared card + modal. **Browser-validated**
(dev server): correct titles/tags, ready→card, blocked/On-Track→no card, T9 4-step $425 schedule, T5
$461.53–$461.54 range, Escape/one-modal/`role=dialog`, no 375px overflow, staking modal unchanged,
zero console errors. Remaining: wiring the Demo *dashboard* through the same `demo_fixture` path.

### 15H finalization — Demo dashboard + provenance audit (Step 15 complete)

The canonical Demo dashboard now runs the shared engine: `DemoDashboardPage` →
`buildDemoContributionRail()` → `deriveRailSuggestions(dataMode: "demo_fixture")` against the pinned
Demo profile/portfolio → one plan-backed Safety Buffer card (Top Pick, buffer override; no DCA).
Browser-verified (Demo + /testing). Real Wallet price **provenance** is explicit:
`deriveContributionSuggestion` never assumes it from a bare `priceUsd` — missing provenance →
`price_provenance_missing` blocks growth (Safety Buffer unaffected, no false zero); `useRailSuggestions`
passes `token_price_service` because real-wallet prices flow through `wallet/tokenPrices.ts`. Direct
wallet USDC is `liquid_now` only via `detection === "direct_wallet_balance"` (symbol alone / protocol
receipts never qualify; unknown → excluded). Flags: `CONTRIBUTION_DEMO_PIPELINE_ENABLED` /
`…_REAL_WALLET_PIPELINE_ENABLED` truthfully `true`; execution/automation/live-price/dates/mixed-funding/
residual flags `false`. **Step 15 is product-complete for the read-only MVP** (pending connected-wallet
manual QA, which needs a live wallet).

## 16A — Stable USDC Yield policy foundation

The deterministic, versioned POLICY layer for the new Stable USDC Yield family
([stableYieldPolicies.md](./stableYieldPolicies.md)). Policy ONLY — no registry, market data,
eligibility, comparison, detection, plan/suggestion, UI, or execution. Stable Yield is a Capital
Efficiency intent (improves returns on idle USDC, never raises risk) with two lanes that both require
a COMPLETE Safety Buffer: `stable_buffer_yield_v1` (conservative, immediately-liquid, stable-USD only)
and `stable_excess_yield_v1` (liquid USDC above the buffer). Five generic strategy types (lending →
buffer-eligible; managed_vault / staking_like_vault / stable_liquidity_strategy → excess-only;
future_other → unapproved) with a documented protocol scope (Kamino/Raydium/Meteora/Hubble; Save/
Marginfi/Drift/Loopscale forbidden). A 10-reason suppression vocabulary, an existing-position policy
(visible; suggestion needs additional eligible USDC; detection not implemented), and deterministic
allowance diagnostics. Intended priority Buffer > Rebalance > Stable Yield > Contribution/DCA is
documented but engine ordering (`topPick.ts`) is unchanged. `STABLE_YIELD_POLICY_EXISTS = true`; all
downstream flags `false`.

## 16B — Yield Strategy Registry (USDC MVP)

The deterministic catalog of EXACT yield products ([yieldStrategyRegistry.md](./yieldStrategyRegistry.md))
— generic (`yield_strategy_registry_v1`, supports future assets; MVP `principalAsset = USDC`), not a
USDC-only class. It answers "what products exist?", never "which is better?" (no comparison/scoring/
ranking/APY/TVL). Five entries across the documented scope (Kamino Steakhouse USDC, Kamino USDC Lending,
Raydium/Meteora/Hubble Stable USDC Strategy), reusing the 16A strategy types + risk lanes. **No address
is fabricated** — the repo documents no exact vault/market addresses (Kamino resolves via SDK at
runtime; Raydium/Meteora have no manage URL; Hubble is a USDH CDP), so every product is
`documentation_required` with `address: undefined`; none is `approved` yet. Validators reject
duplicate ids/addresses/doc-ids, unsupported/forbidden protocols, unknown lifecycle/type/lane, an
approved product missing documentation/URL/asset, and the buffer lane on a non-buffer-eligible type.
Diagnostics are inventory counts only. `YIELD_STRATEGY_REGISTRY_EXISTS`/`STABLE_YIELD_REGISTRY_EXISTS =
true`; market-data/comparison/detection/suggestions/UI/testing/execution stay `false`.

## 16C — Stable Yield market-data layer

The deterministic live-market contract ([yieldStrategyMarketData.md](./yieldStrategyMarketData.md),
`yield_strategy_market_data_v1`). It joins the 16B registry (candidate identity) to injected, documented
market-data inputs and produces one per-product snapshot: APY (definition + window preserved, never
collapsed; only net/gross is comparison-sufficient), TVL (exact USD), liquidity/withdrawal (explicit
`withdrawalStatus`, never inferred), fees (each separate), plus freshness + provenance
(`browserFetched: false`; never fetched from React). Versioned freshness: excess lane 60m (the stricter
canonical price bound), Safety-Buffer lane stricter still at 15m. **The approved candidate set is empty**
— no 16B product is `approved`, so every snapshot is a documentation-only `unavailable` state,
`emptyApprovedSet = true`, and market-ready is empty; injecting data for a `documentation_required`
product never promotes it. Validators fail closed on fabricated approval, browser-fetched provenance,
non-approved products carrying values, order drift, and negative/non-finite magnitudes. Diagnostics are
coverage counts only. `YIELD_STRATEGY_MARKET_DATA_EXISTS = true`; comparison/eligibility/detection/
suggestions/UI/testing/execution stay `false`.

## 16D — Stable Yield eligibility & risk gates

The deterministic eligibility layer ([yieldStrategyEligibility.md](./yieldStrategyEligibility.md),
`yield_strategy_eligibility_v1` + `yield_strategy_risk_review_v1`). It answers only "may this **exact**
product proceed to a later (16E) comparison for the buffer lane, the excess lane, both, or neither?" —
never which is better, the leader, how much to allocate, or whether to suggest. It adds a **static risk
review** contract (operational status, exposure, custody, audit, leverage, risk tier/score, user-risk
compatibility) kept separate from identity (16B) and live data (16C), and runs a fixed 21-gate order
that combines registry lifecycle + address, the 16A lane policy, the 16C market snapshot, and the
review. Thresholds are **reused, never re-invented**: `MIN_PROTOCOL_TVL_USD` (1M), `MIN_PROTOCOL_RISK_
SCORE` (7), `MAX_WITHDRAWAL_HOURS_FOR_{SAFETY_BUFFER,GENERAL_YIELD}` (24/168), `MIN_LIQUIDITY_USD` (100k)
from 12E, plus the 16C 15m/60m freshness. The **buffer lane is strict** (usdc_only, conservative,
non-custodial, verified audit, instant liquidity, no leverage/LP) and is never relaxed by a higher-risk
user or a higher APY; the **excess lane** additionally requires the user's onboarding risk id
(`very_low…very_high`) to be listed in the reviewed `compatibleUserRiskProfileIds`. APY is a readiness
gate only — **no APY minimum, no ranking**. Liquidity and withdrawal are independent checks (neither
inferred from the other, from TVL, from APY, or from a protocol name). Hubble stays documented and is
not hardcoded ineligible; its `documentation_required` entry simply cannot pass. **Production has zero
approved products, so the eligibility set is empty** (`empty_approved_set`) and there are no production
risk reviews — synthetic candidates/reviews live only in fixtures. `YIELD_STRATEGY_ELIGIBILITY_EXISTS`/
`YIELD_STRATEGY_RISK_REVIEW_EXISTS`/`STABLE_YIELD_ELIGIBILITY_EXISTS = true`; comparison/wallet-detection/
plans/suggestions/UI/testing/execution stay `false`.

### 16D.1 — product-level lane policy

Corrects a too-restrictive type-level rule: **strategy TYPE describes mechanics; the exact registry
riskLane + reviewed exact-product metadata determine Safety Buffer eligibility.** `managed_vault` is no
longer hardcoded excess-only — the 16A TYPE now permits both lanes (a TYPE may permit the buffer lane
only when its principal is stable-USD and it is not intrinsically LP/locked/epoch, so
`stable_liquidity_strategy` and `staking_like_vault` still cannot), and the 16B registry validator
accordingly accepts `managed_vault` + `buffer_eligible`. A managed vault **never** becomes buffer-eligible
automatically: it defaults to excess, and every strict 16D buffer gate (conservative tier, non-custodial,
verified audit, USDC-only, no leverage, `bufferUseReviewed`, instant withdrawal, ≤15m freshness,
TVL/liquidity floors) must still pass on the exact product. No product is promoted — production stays
`documentation_required` with empty eligibility. Marker flag
`STABLE_YIELD_PRODUCT_LEVEL_LANE_POLICY_EXISTS = true`; all other feature-state truth is unchanged.

## 16E — Stable Yield comparison engine

The deterministic comparison engine ([yieldStrategyComparison.md](./yieldStrategyComparison.md),
`yield_strategy_comparison_v1` + `yield_strategy_scoring_v1` + `yield_strategy_sensitivity_v1`). It
scores the exact 16D-eligible products of one lane on **six dimensions** — `risk_quality`,
`withdrawal_liquidity`, `net_yield`, `market_depth`, `user_cost`, `data_quality` — with lane-specific v1
weights (buffer 35/30/15/10/5/5, excess 25/20/25/15/10/5, each totalling 100; priority
Safety > Yield > Cost > Convenience). Buffer and excess are compared **separately** (no cross-lane
ranking). Risk = reviewed `riskScore×10` (never brand/APY/name); net-yield uses one comparable **net**
basis (gross converts only with deterministic fee inputs; unknown basis withholds the leader; **no APY
minimum, no earnings**); market-depth = log10(exact-product TVL); user-cost counts only fees **not**
already in net APY (no double-count); data-quality = provenance + freshness (reusing 16C's provenance
vocab). Ordering is score-descending with canonical registry order only for genuine ties; a ≤1.00-point
top-two gap is a **material tie** (leader withheld), and a **±10% weight-sensitivity** check withholds
the leader if it changes under any scenario — a leader is named only as `highest_stable_score`. A single
eligible candidate returns `single_eligible_candidate` (only_eligible_candidate); **production is empty**
(`empty_eligible_set`, no leaders, set validates). These scale/tie/sensitivity choices intentionally
differ from the SOL selector (0–10 / epsilon / retention) — documented because Stable Yield deploys
principal. Hubble gets no protocol penalty and its `documentation_required` entry is unscored.
`YIELD_STRATEGY_COMPARISON_EXISTS`/`STABLE_YIELD_COMPARISON_EXISTS = true`; wallet/plans/suggestions/UI/
testing/execution stay `false`.

## 16F — Stable Yield positions & eligible capital

The existing-position + eligible-capital layer
([yieldStrategyPositionsAndCapital.md](./yieldStrategyPositionsAndCapital.md), `yield_strategy_position_v1`
+ `yield_strategy_position_matching_v1` + `yield_strategy_capital_v1`). It normalizes **injected
read-only** wallet positions, matches them to **exact** registry products (protocol + exact address +
principal asset + mechanic — never name/symbol/brand), resolves duplicate economic positions (one
canonical value record; direct + farm-staked of the same shares counted once; conflicts → ambiguous;
ownership conflict → invalid; approx-equal USD never dedups), and aggregates by strategy. Non-yield usage
is excluded (Hubble borrow/CDP/debt, volatile LP, unconfirmed stable LP). Runtime detection **never**
promotes a lifecycle or mutates the registry; an observed exact address surfaces as an
`ObservedYieldStrategyProduct` (`requiresDocumentation`, `autoApproved:false`). A position counts toward
the Safety Buffer only when `matched_approved` + `buffer_eligible` + currently 16D-buffer-eligible + fresh
(15m) + non-duplicate. It reports current 16E-leader holdings (never rerunning comparison) and reuses the
injected canonical direct-liquid-USDC + Safety Buffer. Risk→buffer allocation (very_low/low 100/0, medium
70/30, high/very_high 50/50) is encoded as v1 (unknown risk fails closed, never defaults to Medium);
lane-level capacities are floored to exact cents (never up), excess uses the canonical **$250** trigger,
and shared-source overlap is exposed but not allocated (16G decides). Production may show detected
positions with zero approved matches / zero buffer-qualified / zero held leaders (valid). Flags:
`YIELD_STRATEGY_POSITION_*`/`YIELD_STRATEGY_ELIGIBLE_CAPITAL_EXISTS`/`STABLE_YIELD_WALLET_DETECTION_EXISTS`/
`STABLE_YIELD_CAPITAL_EVALUATION_EXISTS = true`; plans/suggestions/UI/testing/execution and all
capital-`SELECTS_*`/`GENERATES_PLAN` stay `false`.

## 16G — Stable Yield read-only plan

The final pure-engine step ([yieldStrategyPlan.md](./yieldStrategyPlan.md), `yield_strategy_plan_v1` +
`yield_strategy_plan_selection_v1` + `yield_strategy_product_capacity_v1`). It produces **one**
deterministic read-only plan (or one no-plan result): one lane, one exact approved comparison-leader
product, one exact amount funded **only** by direct liquid USDC. A separate injected product
deposit-capacity contract (distinct from TVL / withdrawal liquidity; `verified_uncapped` ceilinged by
lane capital, never Infinity; 15m/60m freshness) gates deposits. A **real 16E leader is required — no
fallback** (never second place / registry order / highest APY / held product / protocol default). Lane
priority is **buffer > excess**: a ready buffer plan suppresses an otherwise-ready excess lane; the
lanes share one direct-wallet USDC source and are never added (one plan, `sharedSourceResolvedBySingle
Plan`). Start-vs-add comes from the 16F leader-position status; existing positions are never funding
(no switch/withdraw — that's Step 19). Excess reuses the canonical **$250**; **no canonical buffer
deposit minimum exists** (the $50 is contribution-scoped, not reused) so the buffer lane fails closed
with `buffer_yield_minimum_policy_missing` unless a future canonical minimum is supplied. Amounts floor
to exact cents (never up), preserve the Safety Buffer + wallet floor (validated projection), and carry a
stable `fnv1a` plan ID excluding volatile timestamps. Production → `no_plan` (zero approved products /
leaders). Flags: `YIELD_STRATEGY_PRODUCT_CAPACITY_EXISTS`/`YIELD_STRATEGY_PLAN_EXISTS`/`_SELECTION_EXISTS`/
`_AMOUNT_SELECTION_EXISTS`/`_SELECTS_PRODUCT`/`_SELECTS_FINAL_AMOUNT`/`STABLE_YIELD_PLANS_EXIST = true`;
suggestions/UI/testing/execution and all plan-`GENERATES_SUGGESTION`/`UPDATES_PRODUCT_OUTPUT`/
`PREPARES_EXECUTION`/`BUILDS_TRANSACTION`/`REQUESTS_SIGNATURE` stay `false`.

## 16H-A — Stable Yield suggestion integration

Converts a Step 16G ready plan into a deterministic, read-only `stable_yield` engine suggestion
([yieldStrategyPlanSuggestion.md](./yieldStrategyPlanSuggestion.md), `yield_strategy_suggestion_v1`). The
16G plan is the **sole source of truth** — `buildStableYieldPlanSuggestion` re-selects nothing,
recalculates no amount, infers no APY/capacity/minimum, and preserves the plan id / identity / amount /
projection / capacity verbatim in a `stableYieldPlan` metadata block on `EngineSuggestion`. Emits **only**
for a ready decision; every suppressed case returns `null` + a structured diagnostic (stage + reason).
Uses the canonical **`stable_yield` category (priority 6)** for both lanes (lane in metadata), so
buffer corrections and rebalance still outrank yield, and it occupies the `!rebalance` slot, suppressing
the legacy "Put Stablecoins to Work" rule (one stable-yield card). `runSuggestionEngine` gains an
optional 4th param; `selectTopPick` marks ≤1 winner. Read-only / non-custodial (`review_only`,
`externalManagementRequired`, all execution/transaction/signature flags false); no UI/Smith-AI. Production
still emits none (no approved product → `no_plan`). Flags: `STABLE_YIELD_SUGGESTIONS_EXIST` +
`STABLE_YIELD_SUGGESTION_CONTRACT_EXISTS`/`_PLAN_TO_SUGGESTION_EXISTS`/`_PARTICIPATES_IN_ORDERING`/
`_TOP_PICK_ELIGIBLE = true`; card/modal/UI/Demo/Real-Wallet/Smith-AI/execution/transaction/signature
`false`.

## 16H-B — Stable Yield presentation contract & copy mapping

Deterministic **card + review view models** for a 16H-A suggestion
([yieldStrategyPlanPresentation.md](./yieldStrategyPlanPresentation.md), `yield_strategy_presentation_v1`)
— **formatting only**, no React. `buildStableYieldPlanPresentation(suggestion)` maps the `stableYieldPlan`
metadata into fixed title/description templates (keyed on lane × action mode), formatted amounts/APY/
projections from **supplied values only** (raw kept alongside), canonical disclosures, and a read-only
`"Review Strategy"` CTA intent (`open_stable_yield_review` — never a URL/transaction/signature). APY
states: `live_protocol_api`/`approved_fallback`/`provided`/`unavailable` (source never inferred);
capacity: `explicit_remaining_capacity`/`verified_uncapped` only (never "unlimited"). It re-evaluates
nothing, calculates no amount/APY/earnings, decides no Top Pick, and **fails closed** (no view model + a
diagnostic) on any contract breach (invalid lane/action/funding/amount, missing identity/projection,
execution flags, false read-only/external-management, unsupported capacity mode). Production null →
no presentation. Flags: `STABLE_YIELD_CARD_PRESENTATION_CONTRACT_EXISTS`/`_REVIEW_PRESENTATION_CONTRACT_
EXISTS`/`_DETERMINISTIC_COPY_MAPPING_EXISTS`/`_PRESENTATION_VALIDATION_EXISTS`/`_REVIEW_ONLY_CTA_INTENT_
EXISTS = true`; rendered card/modal, `/testing` visual fixtures, Demo/Real-Wallet/Smith-AI, execution
`false`.

## 16H-C — Stable Yield card + review UI

Renders the 16H-B view models through the **canonical shared UI**. `toSuggestionCard` gains a
`stableYieldPlan` branch → `SuggestionCardState` (via `buildStableYieldPlanPresentation`), rendered by
`<SuggestionCard>`; `SuggestionReviewModal` gains a `stableYieldReview` prop rendering six read-only
sections (Recommendation / Strategy / Why this fits your plan / Before and after / Yield and capacity /
Important information) through the same accessible modal shell (role=dialog, aria-modal, focus trap,
Escape, focus restore). `stableYieldTestingFixtures.ts` injects 16 card + 11 review + 4 fail-closed
deterministic fixtures (built from synthetic 16G decisions — the registry is never mutated) into a
dedicated **Stable Yield** `/testing` section. The "Review Strategy" CTA opens the drawer only —
`executes_transaction`/`requires_wallet_signature`/`opens_external_url`/`completion_on_click` all false;
no external protocol URL, deposit, or signature. React computes no finance (integrity-scanned: no
planner/leader/capital/APY/`usdToPlanCents` imports in UI). Verified in-browser (desktop + 320px):
distinct copy, APY/Top-Pick states, drawer open/Escape-close/focus-restore, capacity never "unlimited",
no overflow. Production renders no card (no approved product). Flags: `STABLE_YIELD_RENDERED_CARD_EXISTS`/
`_RENDERED_REVIEW_MODAL_EXISTS`/`_TESTING_VISUAL_FIXTURES_EXIST`/`_SHARED_CARD_MAPPER_EXISTS`/`_REVIEW_UI_
EXISTS`/`_ACCESSIBILITY_BEHAVIOR_EXISTS = true`; Demo/Real-Wallet/Smith-AI/external-CTA/execution/
transaction/signature `false`.

### Step 16H-D — Stable Yield in the Demo Mode + Real Wallet product flows

One shared, deterministic, React-free orchestration boundary — `deriveStableYieldPlanSuggestion`
([`stableYieldProductInput.ts`](./stableYieldProductInput.ts)) — prepares the optional 16G decision passed
as `runSuggestionEngine`'s 4th param (`stableYieldPlanSuggestion`), mirroring the 15H contribution
3rd-param pattern. It duplicates no 16E/16F/16G finance; it orchestrates the existing modules and fails
closed on anything but a ready plan. It branches only on `dataMode` for the data **source**: `real_wallet`
runs the production pipeline (production registry + empty market/risk/capacity data → `no_plan` → no
suggestion → **no card**, the correct production state); `demo_fixture` injects DEMO-ONLY inputs
([`demoStableYieldScenario.ts`](./demoStableYieldScenario.ts)) — a synthetic approved
`demo_usdc_yield_vault`, capacity, comparison leader, capital snapshot, and a funded-buffer SOL $9,000 /
USDC $6,000 portfolio — that flow through the REAL `buildYieldStrategyPlanDecision` on a synthetic demo
registry (never `listYieldStrategies()`) to one ready excess-lane plan ($500, `direct_wallet_usdc`).
`deriveRailSuggestions` merges the suggestion into the engine before its sort/Top-Pick pass (never marked
Top Pick in the UI), lifts a `stableYieldReviewById` map keyed by the SAME suggestion id the card uses, and
`RealWalletSuggestionsRail` opens the shared `SuggestionReviewModal` via `stableYieldReview` — no separate
Demo/Real components. Legacy "Put Stablecoins to Work" is suppressed when the plan-backed suggestion is
present (one plan → one card; buffer/excess maxima never summed). `DemoDashboardPage` gains a **"Stable
Yield Demo"** scenario button rendering `buildDemoStableYieldRail()`. Read-only throughout: only "Review
Strategy"; no Smith AI, execution, transaction, signature, or external protocol navigation. Verified
in-browser (Demo, desktop + 320px): one "Put Excess USDC to Work" card ($500, APY 5.15%), the six-section
drawer + four disclosures, Escape-close/focus-restore, no console errors, no overflow; Real Wallet shows no
plan-backed card while unrelated suggestions render. Flags `STABLE_YIELD_DEMO_MODE_INTEGRATION_EXISTS`/
`_REAL_WALLET_INTEGRATION_EXISTS`/`_SHARED_PRODUCT_ORCHESTRATION_EXISTS`/`_PRODUCT_ORCHESTRATION_EXISTS =
true`; Smith-AI/external-CTA/execution/signature `false`.

### Step 16H-F — Stable Yield release gate (current status)

Stable Yield is **release-ready and read-only**. The canonical status, in one place:

- **Read-only / non-custodial.** The only CTA is "Review Strategy", which opens the shared review drawer.
  No execution, transaction, signature, deposit, withdrawal, switching, migration, custody, external
  protocol CTA, or deep link exists anywhere in the Stable Yield surface (statically gated by the release
  checks). `readOnly` / `externalManagementRequired` are true; `executesTransaction` /
  `requiresWalletSignature` / `opensExternalUrl` / `completionOnClick` are false.
- **Demo** has exactly ONE synthetic scenario ("Stable Yield Demo") using a demo-only approved product; it
  renders exactly one card through the full pipeline.
- **Production has no approved Stable Yield product**, so Real Wallet is *wired but renders no card today*
  (`no_plan`). That is the correct, expected production state — not a defect.
- **One plan → one Stable Yield suggestion.** Both lanes rank under the canonical `stable_yield`
  category (priority 6, below buffer/rebalance/capital_efficiency); the lane is metadata only.
- **16G selects the exact amount.** The UI performs no financial logic — it renders 16H-B strings only.
- **Smith AI is deferred.** No Stable Yield suggestion context reaches the chat UI, and no LLM-generated
  Stable Yield copy exists — all copy is deterministic and owned by 16H-B. Stable Yield explanatory
  content is handled in the separate **Qdrant knowledge-base workstream**; Step 16H touched no Qdrant file
  or Smith AI prompt. `STABLE_YIELD_SMITH_AI_INTEGRATION_EXISTS` stays false.
- **Execution remains out of scope** for the entire 16H series.

16H-F reconciled seven stale flags (aliases left `false` after the UI shipped) and hardened
`buildStableYieldPlanSuggestion` to fail closed on a corrupted source plan / a decision whose mirrored
fields conflict with its selected plan. The `runStableYieldReleaseGateFixtureChecks` block asserts the
whole release contract. See [yieldStrategyPlanPresentation.md](./yieldStrategyPlanPresentation.md#16h-f--release-gate-and-the-smith-ai--qdrant-deferral).

### Step 16H-G — production data adapters + evidence readiness

The production data-adapter layer and the evidence package for a later explicit approval decision. It
**approves no product**, defines **no buffer-yield minimum**, and production still renders **no card**.
Full detail: [stableYieldProductionAdapters.md](./stableYieldProductionAdapters.md).

**Headline finding: all 5 production candidates are blocked on one thing — no exact product address is
documented.** Every registry entry is `documentation_required` with `address: undefined`. Adapters bind
source data to products by exact address only, so there is nothing to bind to and no query to make; every
candidate fails closed at `identity_validation` with `missing_product_address`, and the probe issues zero
network requests. That is the correct result and the first task of Step 16H-H.

Five separable stages — retrieval (developer-only Node probe; never the browser, since 16C pins
`browserFetched: false`) → strict source parse → canonical normalize → identity/unit/freshness validate →
the existing 16C→16G pipeline. Implemented: the adapter contract + diagnostics, exact-address identity
resolution (name/ticker/protocol/fuzzy/position matching all rejected — a product *name* is not an
identity), a strict Kamino vault-state parser, market/APY + capacity adapters, freshness validation
(source time authoritative; a fresh fetch of stale upstream data is still stale), versioned evidence
manifests, the readiness matrix, and `npm run probe:stable-yield`.

Capacity never uses TVL or withdrawal liquidity — they answer different questions (TVL says what is
already deposited; a full and an uncapped product report identical TVL). An absent cap is `unknown`,
never `verified_uncapped`; the Kamino adapter cannot emit `verified_uncapped` at all, because vault state
asserts no such thing. No product minimum/maximum is invented, and WealthSmith's $250 excess threshold is
never a protocol minimum.

`adapter implemented` ≠ `source verified` ≠ `evidence complete` ≠ **approved**. `approved` is hard-coded
false and unrepresentable in the readiness type. Flags true: `STABLE_YIELD_PRODUCTION_ADAPTER_CONTRACT_EXISTS`,
`_IDENTITY_ADAPTERS_EXIST`, `_FRESHNESS_VALIDATION_EXISTS`, `_DEPOSIT_STATE_NORMALIZATION_EXISTS`,
`_EVIDENCE_MANIFESTS_EXIST`, `_ADAPTER_DIAGNOSTICS_EXIST`, `_ORCHESTRATION_CONSUMES_ADAPTERS`,
`_SOURCE_PROBE_EXISTS`, `STABLE_YIELD_APPROVAL_READINESS_MATRIX_EXISTS`. False:
`_PRODUCT_APPROVAL_EXISTS`, `_APPROVED_PRODUCTS_EXIST`, `_CARD_AVAILABLE`,
`STABLE_YIELD_BUFFER_YIELD_MINIMUM_EXISTS`, `STABLE_YIELD_QDRANT_INTEGRATION_EXISTS`.

### Step 16H-H — exact product identity resolution + candidate cleanup

Resolved the real production identities from **official sources only** and cleaned up the candidate set.
Full evidence: [stableYieldProductionAdapters.md](./stableYieldProductionAdapters.md#16h-h--exact-identity-resolution--candidate-cleanup).
**No product was approved**; production still returns `no_plan` and renders no card; Demo is unchanged.

**One identity resolved.** `kamino_steakhouse_usdc` → vault `HDsayqAsDWy3QvANGqh2yNraqcD8Fnjgh73Mhb3WRS5E`,
verified from two independent official sources (Kamino's official product registry `GET /kvaults/vaults`,
whose on-chain `state.name` decodes to exactly "Steakhouse USDC" with the canonical USDC mint; and the
official docs' canonical `KaminoVault` SDK example, which uses the same address). Share mint
`7D8C5pDFxug58L9zkwK7bCiDg4kD4AygzbcZUmf5usHS` (the 16F position identifier); product minimum 0.1 USDC
from on-chain `state.minDepositAmount`. Lifecycle `identity_verified` — strictly weaker than `approved`.

**The APY unit blocker from 16H-G is proven, not assumed:** Kamino returns a decimal **fraction**, and it
is APY not APR — proven by the official docs' own display code `(vault.apy7d * 100).toFixed(2)`.
A schema finding came with it: the live API returns rates as high-precision decimal **strings**, so the
parser gained a documented-decimal-string reader for that source only.

**Still blocked** (primary `blocked_freshness`): the official `/metrics` endpoint returns **no timestamp**
(so 16C freshness, which treats source time as authoritative, cannot be evaluated), declares net-vs-gross
on none of its 12 APY fields, and exposes no capacity field. No risk review exists. And a **human curation
decision** remains: three USDC vaults carry "Steakhouse" — picking between "Steakhouse USDC" and
"Steakhouse High Yield USDC" is a product decision with different risk profiles, not a derivable one.

`kamino_usdc_lending` stays `documentation_required`: the product is the USDC **reserve**, and no official
endpoint lists a market's reserves. A market address was **not** substituted into the product-identity field.

**Cleanup.** Raydium and Meteora are `unsupported_for_mvp` — their USDC venues are trading/LP pools, not
deposit products, carrying IL/depeg exposure that 16D and the 16H-B presentation do not model. Hubble is
`unsupported_for_mvp` on product-model grounds — a USDH CDP requires opening a debt position, while Stable
Yield models a direct deposit that earns without borrowing. All three are **retained for traceability**,
excluded via `isYieldStrategyExcluded`/`listActiveYieldStrategyCandidates`. These are product-model
decisions, **not** risk judgements: no risk score was created or altered and no name-based penalty applied.

New lifecycle states: `identity_verified`, `unsupported_for_mvp`, `archived`. Flags true:
`STABLE_YIELD_PRODUCTION_IDENTITY_RESOLUTION_EXISTS`, `_CANDIDATE_LIFECYCLE_CLEANUP_EXISTS`,
`_OFFICIAL_IDENTITY_EVIDENCE_EXISTS`, `_APY_UNIT_VERIFIED`, `_RISK_REVIEW_HANDOFF_EXISTS`,
`STABLE_YIELD_UNSUPPORTED_CANDIDATE_CLASSIFICATION_EXISTS`. Unchanged false: product approval, approved
products, card available, buffer-yield minimum, execution, Smith AI, Qdrant.
