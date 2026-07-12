# Protocol Risk Approval Decision Gate (Step 12R)

**The explicit human decision gate before a riskScore can ever be assigned.**
This models the reviewer approval decision and the per-candidate score-assignment
gate. It approves nothing by default and assigns no score.
`PROTOCOL_RISK_APPROVAL_DECISION_APPROVED = false`,
`PROTOCOL_RISK_RUBRIC_APPROVED = false`, `PROTOCOL_SELECTION_IMPLEMENTED = false`,
`getProtocolSelectionGoNoGo().productionReady = false`. Backed by
`protocolRiskApprovalDecision.ts`.

## Purpose

Answer: *"what exact decision is required before the draft rubric can be approved
and risk scores can ever be assigned?"* The approval decision is a **human /
product / risk / compliance / legal / engineering** review — not implementation
work. It is the input the approval pack (`protocolRiskRubricApprovalPack.md`) feeds
into.

## Current decision

`getCurrentProtocolRiskRubricApprovalDecision()` returns:

- `status: not_submitted`
- `rubricApproved: false`
- `scoreAssignmentAllowed: false`

No reviewer, role, or date is recorded. Evidence gathering does not equal approval:
collecting drafts (Step 12Q) never advances this decision.

## When a candidate can become `approved_for_scoring`

`evaluateProtocolRiskCandidateScoreAssignmentGate(protocolId)` returns a status of
`blocked` / `evidence_incomplete` / `ready_for_review` / `approved_for_scoring` /
`rejected`. A candidate can only become `approved_for_scoring` when ALL of:

1. the **rubric is approved** (`rubricApproved === true`),
2. **all six evidence dimensions are `gathered`** for that candidate,
3. the **reviewer decision explicitly allows scoring**
   (`scoreAssignmentAllowed === true`),
4. the **score-assignment process is auditable** (recorded reviewer, role, date,
   and evidence links).

## Current result

- Every candidate gate is **`blocked`** today: the rubric is not approved and all
  six evidence dimensions are not gathered (`missingDimensions.length === 6`).
- Sanctum/INF has `partial` TVL evidence, but **`partial` is not `gathered`** and
  does not qualify.
- `anyCandidateReadyForScoring = false`, `anyScoreAssigned = false`,
  `productionAffected = false`. `canAssignRiskScoreToProtocol()` returns `false`
  for all five.

## Non-goals

`scoreAssigned` / `anyScoreAssigned` / `productionAffected` are always false. There
is no `riskScore` field, no selected-protocol field, and no recommendation field. A
`riskScore` is an **internal risk input** used only to decide eligibility to
evaluate — never a rating or endorsement. **Production selection remains disabled.**
Changing the approval status requires a recorded human review decision and must not
be done as part of normal implementation work.
