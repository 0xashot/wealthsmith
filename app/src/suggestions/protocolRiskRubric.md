# Protocol riskScore Rubric (Step 12P)

**Draft rubric. Not approved. No score assigned.** This defines HOW a future
protocol `riskScore` will be assigned and WHAT evidence each dimension requires. It
assigns no score, approves nothing, and changes no production behavior.
`PROTOCOL_RISK_RUBRIC_APPROVED = false`, `PROTOCOL_SELECTION_IMPLEMENTED = false`,
`getProtocolSelectionGoNoGo().productionReady = false`. Backed by
`protocolRiskRubric.ts`.

## Purpose

Give a single, auditable, deterministic method for a **risk review** to turn
documented evidence into an `riskScore` (0–10) later — so eligibility stays
reproducible and no number is ever a guess. A `riskScore` is an **internal risk
input** used only to decide whether a protocol is **eligible to evaluate**. It is
**not a recommendation**, not marketing copy, and not a claim that a protocol is
free of risk.

- Version: `0.1.0-draft`
- Approval status: **draft / not approved**
- Assigns scores: **no**

## Dimensions and weights (total 100)

| Dimension | Weight | Evidence required (summary) |
| --- | --- | --- |
| Audit & security review | 25 | audit report/review, scope, date, audited version, unresolved critical/high findings |
| Maturity & production history | 20 | launch/production history, time in production, maintenance/official status, major changes |
| TVL & adoption | 15 | source-backed TVL, adoption/holder/pool-usage evidence, TVL source freshness |
| Withdrawal & fee transparency | 15 | withdrawal mechanics, timing, fee schedule, protocol-withdrawal vs swap/route distinction |
| Operational & dependency risk | 15 | admin/upgrade authority, validator/stake-pool/oracle/routing deps, custody model, external deps |
| Incident history | 10 | disclosed incidents, postmortems, advisories; absent review = missing, not clean |

Weights are validated to total 100 (`validateProtocolRiskRubricWeights()`).

## How future score assignment should work

1. For each candidate, a reviewer completes a `ProtocolRiskScoreDraft`: one
   `ProtocolRiskEvidenceReview` per dimension with `evidenceStatus`
   (`sufficient` / `partial` / `missing` / `not_reviewed`) and sourced links.
2. A score is computed under the **approved** rubric only when evidence is
   `sufficient` (or explicitly, documentedly `partial`) across the required
   dimensions — never from missing evidence.
3. The score is recorded with its evidence, sources, and review date, then applied
   as an eligibility input — still behind all selection flags.

## Why missing evidence blocks score assignment

Missing or `not_reviewed` evidence never yields a score. Absence is never treated
as a pass — e.g. no sourced incident review means **evidence missing**, not a clean
record. `getMissingRiskEvidenceForProtocol()` returns every not-yet-sufficient
dimension; today that is all six for every candidate, so nothing is score-ready.

## Why riskScore is internal, not user-facing

`riskScore` is an internal, evidence-backed eligibility input. It is never shown as
a rating, badge, or endorsement, and a higher score never means a protocol has no
risk — only that more evidence supported eligibility to evaluate. This keeps the
product review-only and non-custodial.

## Why approval is required first

Until the approval pack (`protocolRiskRubricApprovalPack.md`) is signed off,
`PROTOCOL_RISK_RUBRIC_APPROVED` stays false and `canAssignProtocolRiskScores()`
returns false. No `riskScore` may be assigned, and production protocol selection
stays blocked.
