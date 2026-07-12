# Protocol riskScore Assignment Gate (Step 12R)

**Why riskScore assignment is blocked today, candidate by candidate.** This is the
reference for the score-assignment gate produced by
`evaluateProtocolRiskApprovalGate()` in `protocolRiskApprovalDecision.ts`. No score
is assigned; `productionReady = false`.

## Why assignment is blocked today

Two independent conditions both fail:

1. **Rubric not approved** — the approval decision is `not_submitted`
   (`rubricApproved = false`, `scoreAssignmentAllowed = false`).
2. **Evidence incomplete** — no candidate has all six rubric dimensions
   `gathered`; 29/30 evidence drafts are `needs_review`, 1 is `partial`.

Either one alone blocks scoring; both are unmet.

## Candidate-by-candidate gate status

| Candidate | Status | Gathered dimensions | Missing dimensions | scoreAssignmentAllowed |
| --- | --- | --- | --- | --- |
| Jupiter / JupSOL | blocked | 0 | all 6 | false |
| Marinade / mSOL | blocked | 0 | all 6 | false |
| Jito / JitoSOL | blocked | 0 | all 6 | false |
| BlazeStake / bSOL | blocked | 0 | all 6 | false |
| Sanctum / INF | blocked | 0 | all 6 | false |

Sanctum/INF has `partial` TVL evidence, but `partial` is not `gathered`, so its
gathered-dimension count is 0 like the rest.

## What must be true before a score can be assigned

- All six dimensions `gathered` for the candidate (audit_security, maturity,
  tvl_adoption, withdrawal_fee_transparency, operational_dependency_risk,
  incident_history), each backed by verified, cited sources.
- The rubric approved via a recorded human decision
  (`protocolRiskRubricApprovalPack.md` → `protocolRiskApprovalDecision.ts`).
- The reviewer decision explicitly allows scoring, and the assignment is auditable.

## Score assignment is not a recommendation, and not production selection

A `riskScore` is an internal eligibility input; assigning one is not a protocol
endorsement, and score assignment alone does not enable production selection. Even
after scores exist, `getProtocolSelectionGoNoGo()` must still pass (TVL mappings,
withdrawal/fee/audit data, real-data dry-run, product/copy/compliance, UI
readiness) before any protocol could appear in the UI. All selection flags stay
false today.
