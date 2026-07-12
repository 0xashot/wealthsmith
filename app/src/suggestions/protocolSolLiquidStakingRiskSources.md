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

## 12S update

A one-candidate evidence-completion workflow now exists
(`protocolSolLiquidStakingEvidenceCompletion.ts`, target Sanctum/INF). Running it
today reviews all six dimensions and gathers **0/6**: `tvl_adoption` stays
`partial` (verified TVL alone is insufficient — adoption/freshness questions
remain), and the other five stay `needs_review` (no verified source).
`readyForReview = false`, `approvedForScoring = false`, `scoreAssigned = false`; the
score-assignment gate is unchanged (`blocked`). **No candidate approved for
scoring, no score assigned.** See `protocolSolLiquidStakingEvidenceCompletion.md`.

## 12T update

A source-verification intake now exists
(`protocolSolLiquidStakingSourceVerification.ts`): reviewer-supplied DefiLlama pool
IDs and official docs URLs are classified at the SOURCE level
(`verified`/`needs_review`/`rejected`). **Source verification does not equal
gathered evidence, and does not equal score assignment.** Verified source *links*
(TVL pools for the four LSTs, withdrawal/fee/audit/operational docs) confirm source
existence only — no production value, no `auditStatus`, no `withdrawalTimeHours`,
no fees, and no `riskScore` are assigned. Incident history stays `needs_review` for
all five. `mapVerifiedSourcesToEvidenceDimensions()` never marks a dimension
`gathered`. `riskScore` stays absent; production selection stays disabled.

## 12U update

A source-VALUE confirmation intake now exists
(`protocolSolLiquidStakingSourceValueConfirmation.ts`): reviewer-confirmed values
can be recorded **only from 12T-verified sources**, with reviewer + role and (for
TVL/APY) an as-of timestamp; anything short is `needs_review`/`insufficient`.
Confirmation writes no production metadata, mutates no evidence draft, and assigns
no `riskScore`. `mapConfirmedValuesToEvidenceCompletion()` marks a dimension
gatherable only when ALL its required values are confirmed — so **no candidate is
`ready_for_review` by default** and none is `approved_for_scoring` (rubric still
unapproved). `riskScore` stays absent; production selection stays disabled.

## 12V update

A non-production real-value confirmation ledger now exists
(`protocolSolLiquidStakingRealValueConfirmations.ts`) with reviewer-confirmed
DefiLlama TVL/APY/APY-30d values (reviewer: Ashot Gyulzatyan, founder; as-of
2026-07-12):

| Candidate | TVL (USD) | APY (%) | APY 30d (%) |
| --- | --- | --- | --- |
| jupiter (JupSOL) | 409,170,000 | 5.67 | 5.60 |
| marinade (mSOL) | 184,840,000 | 4.75 | 5.87 |
| jito (JitoSOL) | 767,950,000 | 5.36 | 5.45 |
| blazestake (bSOL) | 69,750,000 | 5.27 | 5.32 |
| sanctum (INF) | needs_review / absent (no exact value supplied) | — | — |

Fresh TVL+APY+APY-30d support `tvl_adoption` only; the other five dimensions stay
incomplete, so **no candidate is `ready_for_review`**. Values are non-production
(no metadata written, no draft mutated, no `riskScore` assigned) and expire after
24h (then `stale`). INF real value stays `needs_review`/absent unless an exact
value is supplied.

## 12W update

An evidence gather-decision ledger now exists
(`protocolSolLiquidStakingEvidenceGatherDecisions.ts`): reviewer decisions that a
dimension is `gathered`, freshness-aware. **`tvl_adoption` is gathered for
JupSOL/mSOL/JitoSOL/bSOL while their 12V values are fresh** (past 24h → `stale`);
**INF `tvl_adoption` is `needs_review`** (no exact values). The other five
dimensions (audit/maturity/withdrawal-fee/operational/incident) have no gather
decision and stay incomplete, so **no candidate is `ready_for_review`** (four have
1/6 gathered, INF 0/6). Decisions mutate no base drafts and no production metadata,
and no `riskScore` is assigned.

## 12X update

**JitoSOL** now has all six rubric dimensions gathered from source-backed reviewer
confirmations (`protocolSolLiquidStakingJitoEvidenceConfirmations.ts`):
`audit_security` (SPL Stake Pool audits — Quantstamp/Neodyme/Kudelski), `maturity`
(official blog production history), `withdrawal_fee_transparency` (unstake
mechanics/timing/fees), `operational_dependency_risk` (DAO manager + StakeNet), and
`incident_history` (completed manual review, explicitly not a clean-history claim).
While TVL/APY values are fresh, **JitoSOL `ready_for_review = true`** but
**`approved_for_scoring = false`** (rubric unapproved), **no `riskScore` assigned**,
and **no protocol is selected**. Other candidates are unchanged. Stale TVL/APY
returns JitoSOL to 5/6. Recheck incident history before beta/production.
