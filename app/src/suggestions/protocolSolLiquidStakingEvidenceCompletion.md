# SOL Liquid-Staking Evidence Completion (Step 12S)

**One-candidate evidence-completion workflow. No approval, no score, no
production change.** This exercises the "evidence → gathered" edge of the risk gate
for a single candidate without approving the rubric or assigning a score. Backed by
`protocolSolLiquidStakingEvidenceCompletion.ts`. `PROTOCOL_RISK_RUBRIC_APPROVED =
false`, `PROTOCOL_SELECTION_IMPLEMENTED = false`,
`getProtocolSelectionGoNoGo().productionReady = false`.

## Why 12S exists

Step 12R proved every candidate gate is `blocked` because no dimension is
`gathered`. 12S builds the pure workflow that would move one candidate's evidence
from `needs_review`/`partial` toward `gathered` — and shows, honestly, that it
cannot get there yet because verified sources do not exist.

## Target candidate: Sanctum / INF

Chosen only because it already has one source-backed TVL data point (the verified
DefiLlama INF pool), making it the natural place to test the workflow. **This does
not mean Sanctum is selected or endorsed.**

## What evidence completion means

`runEvidenceCompletionForCandidate("sanctum")` reads the existing evidence drafts,
reviews each dimension's sources, and reports the status each dimension *would*
have. A dimension can reach `gathered` ONLY when every required source is
`verified` and there are no unresolved questions. A source is treated as `verified`
only if it is already codebase-verified; unverified pointers stay `needs_review`.

## What evidence completion does NOT mean

- It does **not** approve the rubric or the approval decision.
- It does **not** assign a `riskScore` (`scoreAssigned` always false).
- It does **not** make a candidate `approved_for_scoring`.
- It does **not** mutate base evidence drafts or any production metadata.
- `ready_for_review` is different from `approved_for_scoring`: reaching
  `ready_for_review` would only mean all six dimensions are `gathered`; scoring
  still needs the rubric approved and the reviewer decision to allow it.

## Dimension-by-dimension status (Sanctum / INF)

| Dimension | previous | next (would-be) | canMarkGathered |
| --- | --- | --- | --- |
| audit_security | needs_review | needs_review | false |
| maturity | needs_review | needs_review | false |
| tvl_adoption | partial | **partial** | false |
| withdrawal_fee_transparency | needs_review | needs_review | false |
| operational_dependency_risk | needs_review | needs_review | false |
| incident_history | needs_review | needs_review | false |

Result: `status = in_progress`, `dimensionsGathered = 0/6`, `readyForReview =
false`, `approvedForScoring = false`, `scoreAssigned = false`.

## Why partial TVL evidence alone is insufficient

Sanctum/INF has a verified TVL source, but the `tvl_adoption` dimension also
requires adoption/holder evidence and source freshness, and its unresolved
questions are not answered. Verified TVL alone is `partial`, and **`partial` never
becomes `gathered`**. One data point does not complete a dimension.

## Gate check

`runSanctumEvidenceCompletionGateCheck()` returns the score-assignment gate before
and after running completion. Because the harness mutates nothing, the gate is
unchanged — Sanctum stays `blocked`, `scoreAssignmentAllowed = false`,
`canAssignScore = false`. This proves completion alone cannot make a candidate
`approved_for_scoring`.

## Why production selection remains disabled

No dimension is `gathered`, the rubric is unapproved, the approval decision is
`not_submitted`, and `getProtocolSelectionGoNoGo()` stays `productionReady = false`.
All selection flags stay false and no protocol appears in the UI.
