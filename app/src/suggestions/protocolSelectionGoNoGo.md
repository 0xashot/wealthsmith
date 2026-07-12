# Protocol Selection — Go/No-Go Checklist (Step 12N)

**Checklist only. This step enables nothing.** It answers one question:
*"Can WealthSmith safely expose selected protocols to users right now?"* The
deterministic answer is **No — `productionReady = false`.** Backed by
`protocolSelectionGoNoGo.ts`; `PROTOCOL_SELECTION_IMPLEMENTED = false`.

## What Step 12N is

A machine-checkable go/no-go gate over the whole protocol-selection foundation
(registry → adapters → eligibility → route guardrails → scoring → QA-only
selection → Stage-2 dry-run). `getProtocolSelectionGoNoGo()` returns a per-gate
status plus stable, evidence-backed blocker IDs. It is the single place a future
step must consult before any selection flag is flipped.

## Current result: productionReady = false

`getProtocolSelectionGoNoGo()` returns `productionReady: false`, `canShowInUi:
false`, `canSelectProtocol: false`, `canUseTransactions: false`, with no
selected-protocol id/name and no recommendation field. `isProtocolSelectionGo()`
returns `false`; `assertProtocolSelectionCannotRunInProduction()` returns `true`
(production is correctly blocked).

## Why this is correct

Mechanism gates are complete (eligibility, scoring, fallback, transaction
boundary, QA fixtures), but the **data and review gates are not**: TVL is
verifiable for only 1 of 5 candidates, riskScore is unassigned, audit/withdrawal/
fee data are missing, no real-data Stage-2 dry-run has passed, and product/copy/
compliance review has not happened. Any one of these blocks a go.

## Per-gate status

| Gate | Status | Why |
| --- | --- | --- |
| feature_flags | blocked | Production flags are OFF by design (must be intentionally flipped last). |
| market_data | blocked | APY sources exist, but no live values are populated in a production feed. |
| tvl_mapping | blocked | Only Sanctum / INF has a verified TVL pool; the other four are missing. |
| risk_methodology | blocked | riskScore rubric not production-approved. |
| risk_scores | not_started | riskScore absent for all five. |
| audit_status | blocked | auditStatus unknown for all five. |
| withdrawal_data | blocked | withdrawal mechanics absent for all five. |
| fee_data | blocked | fee schedules absent for all five. |
| route_liquidity_cost | not_started | Live quote disabled; no production route/liquidity/cost data. |
| eligibility | pass | Deterministic gates exist and are enforced. |
| scoring | pass | Deterministic scoring/ranking exists; only complete eligible data scores. |
| stage_2_dry_run | blocked | Report exists, but current data → insufficient_data; no complete real-data run. |
| qa_regression | pass | Fixture suite passes. |
| product_copy_compliance | blocked | Copy / compliance / UI-display review not completed. |
| fallback_behavior | pass | Missing/stale/failing data stays not_evaluated — enforced and tested. |
| transaction_boundary | pass | No transaction / signature / trade-execution path exists. |
| ui_readiness | blocked | SHOW_IN_UI is false; no protocol-selection UI approved. |

## Exact current blockers (stable IDs)

- `selection_implemented_false`, `show_in_ui_disabled`, `transactions_disabled` (warning)
- `market_values_not_populated`
- `missing_tvl_jupsol`, `missing_tvl_msol`, `missing_tvl_jitosol`, `missing_tvl_bsol`
- `risk_methodology_not_production_approved`, `risk_scores_not_assigned`
- `audit_status_unknown`, `withdrawal_data_missing`, `fee_data_missing`
- `route_liquidity_cost_missing`
- `stage_2_real_data_dry_run_not_complete`
- `copy_review_not_complete`, `compliance_review_not_complete`, `ui_display_not_approved` (warning)
- `ui_readiness_blocked`

## What must happen before production can be enabled

1. Verified DefiLlama TVL pools for JupSOL / mSOL / JitoSOL / bSOL.
2. An approved riskScore methodology with sourced per-protocol scores.
3. Sourced audit status, withdrawal mechanics, and fee schedules for all five.
4. A real-data Stage-2 dry-run that reaches at least one eligible/scored candidate.
5. Product, copy, and legal/compliance review of any user-facing surface.
6. A designed, approved selection UI — then, and only then, the flags may advance
   one rollout stage at a time.

## Explicit non-goals

No transactions, no wallet signatures, no protocol recommendations, no UI
exposure, and no selected protocol in live suggestions — in this step or as a
consequence of the checklist. The module selects nothing, is not imported by any
live/engine/UI file, and has no transaction/signature/trade path.
