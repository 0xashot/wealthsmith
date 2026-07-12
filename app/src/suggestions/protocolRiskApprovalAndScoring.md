# Protocol Risk Approval & Scoring — End-to-End Flow (Step 12Y)

**How evidence becomes an auditable riskScore — and why nothing is enabled by
default.** This ties together the approval decision and the scoring mechanism.
`productionReady = false`; no production selection.

## End-to-end flow

1. **Evidence gathered** — per-dimension source-backed confirmations recorded
   (12Q–12X), never mutating base drafts or production metadata.
2. **Candidate ready_for_review** — all six rubric dimensions gathered
   (freshness-aware); JitoSOL reached this in 12X.
3. **Human approves the rubric** — a reviewer records an explicit approval decision
   (`createExplicitProtocolRiskApprovalDecision`, status `approved`). The default
   `getCurrentProtocolRiskRubricApprovalDecision()` stays `not_submitted`.
4. **Human allows score assignment** — the same decision sets
   `scoreAssignmentAllowed = true` (only valid when `approved`).
5. **Dimension scores recorded** — one reviewer score (0–10) per dimension, with
   rationale and evidence source names.
6. **Weighted riskScore calculated** — `sum(score * weight) / 100`, only when every
   gate passes; otherwise blocked/needs_review/rejected with no score.
7. **Production go/no-go still required** — `getProtocolSelectionGoNoGo()`
   (production TVL mappings, withdrawal/fee/audit production data, real-data
   dry-run, product/copy/compliance, UI readiness) must pass before any protocol is
   surfaced to users.

## Current state

- **JitoSOL is `ready_for_review`** (6/6 dimensions gathered while values are fresh).
- **Default approval decision is `not_submitted`** — `rubricApproved` and
  `scoreAssignmentAllowed` are false.
- **No production score is assigned** — the scoring mechanism is `blocked` by
  default; `riskScore` stays absent in `protocolRiskRegistry.ts`.
- **Production selection is disabled** — all selection flags false,
  `productionReady = false`.

## Source re-verification requirement before beta

The JitoSOL evidence (12X) was recorded from reviewer-supplied official-source
values and has not been independently re-fetched.
**Source re-verification is required before beta.**
Each cited Jito source must be re-checked (values current, audit scope accurate, and
the incident-history review re-run, since "no incident found" is not a clean-history
guarantee) as part of the human approval decision, before any real (non-QA) score is
assigned.
