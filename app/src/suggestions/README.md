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
