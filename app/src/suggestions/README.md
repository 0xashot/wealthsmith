# Suggestion Engine (MVP)

Deterministic product logic that decides what recommendation exists for the
user's REAL wallet state. This directory is the engine's home; as of Step 2 it
contains **contracts only** — no suggestion logic runs yet, and nothing here is
imported by the app.

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

- Step 2 (this): contracts/types/thresholds/docs only.
- Step 3+: engine rules for **Top Up Safety Buffer**, **Rebalance**,
  **On Track**; then the input adapter and copy mapper.
- **Top Pick after core suggestions** — Buffer Override first (buffer not
  satisfied → only buffer suggestions, buffer Top Pick), category priority,
  then impact → urgency → efficiency ranking.

## Safety invariants

- Read-only, Ledger-safe: no transactions, no signatures, no fund movement.
  MVP card click is at most an approved protocol page in a new tab.
- Sourced values only: no invented prices, amounts, APY, or recommendations.
- **Demo suggestions are fixtures** (`examples/demo-mode/demo-suggestions.json`
  → `demoDashboardState`) and must NEVER enter real-wallet mode; engine files
  must never import them.
- Insufficient inputs → empty result with `unavailable_reason`, never a
  fabricated fallback suggestion.
