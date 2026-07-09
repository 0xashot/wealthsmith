# Suggestion Engine (MVP)

Deterministic product logic that decides what recommendation exists for the
user's REAL wallet state. As of Step 7A the engine implements three MVP states —
**Top Up Safety Buffer**, **Rebalance** (bucket-level), and **On Track**
(informational) — plus **deterministic Top Pick selection** and a **UI card
mapper** (engine output → card shape). The mapper is not yet wired into the
Dashboard (Step 7B); nothing here is imported by app UI code yet — no cards
render from the engine.

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
3. **Missing guardrail data is honest**: cost, liquidity, and slippage have no
   data source in this prototype (no quote/route infrastructure), so those
   guardrails are reported as `not_evaluated` — never invented, never silently
   passed. Evaluable today: min trade size, buffer protection, pricing
   availability, allocation delta.

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
- Step 7B (done): **wired into the real-wallet Dashboard rail**. `DashboardBody`
  (which owns the single wallet read) builds inputs via the adapter, runs
  `runSuggestionEngine`, maps with `toSuggestionCards`, and lifts the result to
  `DashboardPage`, which renders it in `SuggestionRail` in ENGINE ORDER (no
  re-sort, no Top Pick reselection). The placeholder is replaced only when the
  engine can run; otherwise a polished unavailable state. Partial-pricing
  warning shows as a soft notice above the cards. CTAs are review-only and
  non-transactional. `SuggestionCard` now renders `status: "disabled"` as a
  non-actionable (dimmed, disabled-button + reason) card. **Demo Mode is
  untouched — it still renders its own fixtures.**
- Pending — Portfolio rail wiring: `PortfolioPage` does not receive `savedGoal`
  yet, so the real-wallet Portfolio rail is not wired. TODO: thread `savedGoal`
  into `PortfolioPage` and reuse the same engine + mapper there.

## Suggestion display order

The **engine owns display order**; the UI renders the array as given and must
NOT re-sort. The mapper is a plain `map` that preserves input order, and Top
Pick selection marks importance without changing order.

MVP display order:

```text
1. Safety Buffer
2. Rebalance
3. On Track   (informational — only when no actionable MVP suggestion exists)
```

Future category order (when more suggestion types ship):

```text
1. Safety Buffer
2. Rebalance
3. Capital Efficiency / idle assets
4. Yield / protocol optimization
5. On Track / informational
```

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
