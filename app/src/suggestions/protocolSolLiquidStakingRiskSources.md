# SOL Liquid-Staking Risk Sources (Step 12K)

**Risk sourcing in progress. No `riskScore` is assigned.** This records the
current sourcing status for the five SOL liquid-staking candidates. No number,
audit claim, or withdrawal timing is invented, and no protocol is described with
superlatives or absolute-safety language. Selection stays disabled
(`PROTOCOL_SELECTION_IMPLEMENTED = false`).

Statuses: `sourced` · `partially_sourced` · `missing` · `not_assigned`.

| Candidate | riskScore | auditStatus | withdrawalClass | withdrawalTime | fees | source status |
| --- | --- | --- | --- | --- | --- | --- |
| jupiter (JupSOL) | not_assigned | missing (unknown) | missing (unknown) | missing | missing | pending |
| marinade (mSOL) | not_assigned | missing (unknown) | missing (unknown) | missing | missing | pending |
| jito (JitoSOL) | not_assigned | missing (unknown) | missing (unknown) | missing | missing | pending |
| blazestake (bSOL) | not_assigned | missing (unknown) | missing (unknown) | missing | missing | pending |
| sanctum (INF) | not_assigned | missing (unknown) | missing (unknown) | missing | missing | pending |

- **riskScore = `not_assigned`** for every candidate — it will remain absent
  until the risk methodology (`protocolRiskMethodology.md`) is approved and
  per-protocol evidence is gathered. Eligibility that depends on `riskScore`
  therefore returns `insufficient_data` (by design).
- **auditStatus = `unknown`** — not directly sourced from existing code/docs yet.
  Will be set only from a protocol's published audits (firm + report link).
- **withdrawalClass / withdrawalTime = `missing`** — LST unstake mechanics are not
  precisely documented in the codebase. NOTE: acquiring an LST via a swap route is
  **not** the same as protocol withdrawal/unstake behavior; the two must be
  sourced separately.
- **fees = `missing`** — not itemized in existing source; never assumed zero.
- `lastReviewedAt` (recorded in `protocolRiskRegistry.ts`) marks that this review
  happened; it does not imply any value was assigned.

## Remaining evidence needed

- A written, approved `riskScore` rubric (audit history/scope, time in prod, TVL
  history, admin-key/upgrade authority, oracle/dependency risk, incidents).
- Published audit references per protocol → `auditStatus` + `sources`.
- Documented unstake/withdrawal mechanics (instant-via-pool vs. epoch cooldown) →
  `withdrawalClass` / `withdrawalTimeHours`.
- Fee schedules (deposit/withdraw/performance/management) → `fees`.

Until these exist, the internal dry-run correctly returns `insufficient_data`.

## 12L update

Source-status tracking now lives in `protocolSolLiquidStakingSources.ts` and
`protocolSolLiquidStakingSourceChecklist.md`. Confirmed this review: **mint + APY
sources verified** for all five; **TVL verified for Sanctum/INF only**; audit,
withdrawal, fees still `missing`; **`riskScore` still `not_assigned`** for all.
No value was invented and production selection stays disabled.

## 12O update

A proposal registry (`protocolSolLiquidStakingSourceCandidates.ts`) now drafts the
**risk evidence requirements** (`SOL_LIQUID_STAKING_RISK_EVIDENCE_REQUIREMENTS`)
for a future `riskScore`: audit/security history + scope; time in production and
TVL/adoption history; withdrawal and fee transparency; operational risk (admin-key/
upgrade authority, oracle/dependency); and incident history. This is
evidence-gathering ONLY — **no `riskScore` is assigned in 12O**, `auditStatus`
stays `unknown`, and the risk rubric approval is deferred to **12P**. Production
selection stays disabled (`productionReady = false`).

## 12P update

The `riskScore` rubric now exists in DRAFT (`protocolRiskRubric.ts`,
`protocolRiskRubric.md`) with an approval pack (`protocolRiskRubricApprovalPack.md`).
**It is not approved** (`PROTOCOL_RISK_RUBRIC_APPROVED = false`), so **`riskScore`
remains `not_assigned`** for all five SOL LST candidates. Per-dimension evidence
still required for every candidate (JupSOL, mSOL, JitoSOL, bSOL, INF):

| Dimension (weight) | Evidence still required |
| --- | --- |
| Audit & security (25) | official audit report/review + scope + date + audited version |
| Maturity (20) | production history + time in production + maintenance/official status |
| TVL & adoption (15) | source-backed TVL (verified only for INF today) + adoption + freshness |
| Withdrawal & fee transparency (15) | unstake mechanics + timing + fee schedule (all missing) |
| Operational & dependency (15) | admin/upgrade authority + stake-pool/oracle deps + custody model |
| Incident history (10) | disclosed incidents / postmortems / advisories (absent review = missing) |

No dimension is `sufficient` for any candidate yet, so
`getMissingRiskEvidenceForProtocol()` returns all six for each. `riskScore` stays
absent; production selection stays disabled.

## 12Q update

Reviewable **evidence drafts** now exist in
`protocolSolLiquidStakingEvidenceDrafts.ts` (+
`protocolSolLiquidStakingEvidenceDrafts.md`) — 30 drafts (5 candidates × 6
dimensions). Coverage: **0 gathered, 1 partial** (Sanctum/INF `tvl_adoption`, from
the verified DefiLlama pool), **29 needs_review**, **scoreAssignedCount 0**. No
official audit/maturity/withdrawal-fee/operational/incident source is verified yet;
each carries unresolved questions. **No `riskScore` is assigned**, the rubric is
still not approved, `auditStatus` stays `unknown`, and no production metadata
changed. See `protocolRiskEvidenceReview.md` for the review workflow.

## 12R update

The reviewer approval + score-assignment decision gate now exists
(`protocolRiskApprovalDecision.ts`). Current candidate scoring-gate status:

| Candidate | Gate status | scoreAssignmentAllowed |
| --- | --- | --- |
| jupiter (JupSOL) | blocked | false |
| marinade (mSOL) | blocked | false |
| jito (JitoSOL) | blocked | false |
| blazestake (bSOL) | blocked | false |
| sanctum (INF) | blocked | false |

The rubric approval decision is `not_submitted`, so **no candidate is
`approved_for_scoring`** and **no score is assigned** (all six evidence dimensions
are not `gathered` for any candidate; Sanctum's `partial` TVL does not qualify).
`riskScore` stays absent; production selection stays disabled.
