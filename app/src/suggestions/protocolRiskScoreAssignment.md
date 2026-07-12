# Protocol riskScore Assignment Mechanism (Step 12Y)

**The explicit, auditable riskScore assignment mechanism — BLOCKED BY DEFAULT.**
riskScore assignment is not a protocol recommendation, is not user-facing, and does
not enable production selection. Backed by `protocolRiskScoreAssignment.ts`.
`PROTOCOL_SELECTION_IMPLEMENTED = false`,
`getProtocolSelectionGoNoGo().productionReady = false`.

## Purpose

Answer: *"when a candidate is ready_for_review, how can a human reviewer approve the
rubric and assign an auditable riskScore — without enabling production selection by
default?"* — through a gated scoring function that computes a score only when every
condition is met, and stays blocked otherwise.

## riskScore scale and rubric weights

- Scale: **0 to 10**, higher = more evidence-supported (never a guarantee).
- Rubric weights (total 100): audit_security 25, maturity 20, tvl_adoption 15,
  withdrawal_fee_transparency 15, operational_dependency_risk 15, incident_history 10.

## Scoring formula

`riskScore = sum(dimensionScore * weight) / 100`, over the six rubric dimensions.

## Required gates (all must pass, or no score)

1. rubric is approved (`rubricApproved`);
2. score assignment is allowed (`scoreAssignmentAllowed`);
3. candidate is `ready_for_review` (freshness-aware);
4. rubric version matches;
5. every rubric dimension has exactly one score, each 0–10, `scored`, with reviewer
   + role + rationale + evidence source names.

Any failure → `blocked` / `needs_review` / `rejected` with **no** riskScore.

## Why the default state is blocked

The default approval decision is `not_submitted`
(`getCurrentProtocolRiskRubricApprovalDecision()` stays `not_submitted` / false /
false), so `evaluateRiskScoreAssignment()` returns `blocked` with
`rubric_not_approved` + `score_assignment_not_allowed` — JitoSOL and every candidate
have **no riskScore** by default.

## QA-only example

`getQaOnlyJitoRiskScoreAssignmentInput()` returns QA-ONLY dimension scores
(audit_security 8, maturity 8, tvl_adoption 9, withdrawal_fee_transparency 7,
operational_dependency_risk 7, incident_history 7), each rationale tagged
`QA_ONLY_NOT_PRODUCTION`. Weighted = `8*.25 + 8*.20 + 9*.15 + 7*.15 + 7*.15 + 7*.10
= 7.75`. This is **not** production metadata, **not** approved, **not** shown to
users — it exists only to test the calculation path via an explicit QA approval
decision (`createExplicitProtocolRiskApprovalDecision`, which does not change any
default).

## Why riskScore assignment is not a protocol recommendation

A `riskScore` is an internal, evidence-backed eligibility input. Assigning one says
nothing about whether a user should use a protocol; it is not a rating, badge, or
endorsement. `selectionEnabled` is always false.

## Why riskScore assignment does not enable production selection

Even a computed score writes no production metadata
(`productionMetadataUpdated`/`evidenceDraftMutated`/`selectionEnabled` always
false), and `getProtocolSelectionGoNoGo()` (production TVL mappings, withdrawal/fee/
audit production data, real-data dry-run, product/copy/compliance, UI readiness)
must still pass before anything reaches users. All selection flags stay false.

## Why production metadata is not updated

This step is the scoring MECHANISM only. It never writes to
`protocolRiskRegistry.ts`, `ProtocolMarketData`, or `DEFILLAMA_POOL_MAPPINGS`, and
never mutates base evidence drafts. A future step handles production metadata under
its own gates.
