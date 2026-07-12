# JitoSOL Remaining Evidence Confirmations (Step 12X)

**An internal evidence-readiness milestone for one candidate: JitoSOL. Not a
protocol recommendation, not user-facing, not production selection.** This gathers
the five remaining rubric dimensions for JitoSOL from source-backed reviewer
confirmations, so JitoSOL can reach `ready_for_review` while values are fresh —
**still not `approved_for_scoring`, no `riskScore` assigned, `productionReady =
false`.** Backed by `protocolSolLiquidStakingJitoEvidenceConfirmations.ts`.

## Why JitoSOL is targeted first

JitoSOL already had `tvl_adoption` gathered (12W) from fresh reviewer-confirmed
DefiLlama values, and Jito publishes official docs, FAQs, a security overview, and
a deployed-programs page — making it the practical first candidate to complete the
evidence chain. This is an ordering choice, **not** a statement that JitoSOL is a
superior or endorsed protocol.

## Confirmed evidence by dimension

Reviewer: **Ashot Gyulzatyan** (founder). As-of: **2026-07-12**. Reviewer-supplied
from official Jito sources (recorded verbatim, not fetched at runtime).

| Dimension | Evidence (summary) | Sources |
| --- | --- | --- |
| audit_security | Built on Solana Labs SPL Stake Pool program (non-custodial); Quantstamp / Neodyme / Kudelski audit reports listed for the stake-pool program; deployed program `SPoo1Ku8…` | Security Overview; Deployed Programs |
| maturity | Official blog (2022-12-14): JitoSOL launched early November, became 4th-largest Solana staking pool with 300k+ SOL | Request for Stake Pool Validators |
| withdrawal_fee_transparency | Two exit methods (instant swap via Jupiter vs direct protocol unstake); direct unstake ~48h; 0.1% direct-unstake fee; 4% annual management fee on rewards | Unstaking Overview; General FAQs |
| operational_dependency_risk | Jito DAO manager role (limited); validator selection via StakeNet; on-chain + off-chain keepers; token `J1toso1u…` / pool `Jito4APy…` | Security Overview; Automated Management; Technical FAQs |
| incident_history | Manual review found no official incident/advisory/postmortem in the reviewed sources as of 2026-07-12 | manual review |

## Source list

- Security Overview — `…/security/overview/`
- Deployed Programs — `…/security/deployed-programs/`
- Request for Stake Pool Validators — `…/blog/request-for-stake-pool-validators/`
- Unstaking Overview — `…/unstaking-jitosol-flow/unstaking-overview/`
- General FAQs — `…/faqs/general-faqs/`
- Automated Management via Stakenet — `…/stake-pool-operations/automated-management/`
- Technical FAQs — `…/faqs/technical-faqs/`

## Readiness result

With fresh TVL/APY values, JitoSOL has **all six dimensions gathered** →
`candidateReadyForReview = true`. The gate wrapper
(`evaluateProtocolRiskCandidateScoreAssignmentGateWithGatherDecisions("jito")`)
reports status `ready_for_review`, `scoreAssignmentAllowed = false`,
`scoreAssigned = false`. No other candidate is `ready_for_review`.

## Stale-data behavior

`tvl_adoption` depends on the 12V TVL/APY confirmations, which are fresh for 24h.
Past that window, `tvl_adoption` becomes `stale`, JitoSOL drops to 5/6 gathered,
and `candidateReadyForReview` returns to false until the values are re-confirmed.

## Incident-history caveat

The incident-history confirmation is a **completed manual review that found no
sourced incident** — it explicitly states this is **not a clean-history claim**,
that absence of a found incident is not proof of none, and that it **must be
rechecked before beta and before production**.

## Why ready_for_review is not approved_for_scoring

`ready_for_review` means all six dimensions are gathered. `approved_for_scoring`
additionally requires the human rubric approval decision to allow scoring — which
stays `not_submitted` / unapproved. So JitoSOL is `ready_for_review` but **not
`approved_for_scoring`**.

## Why no riskScore is assigned, and why production selection remains disabled

No `riskScore` is assigned (`scoreAssigned` always false); the rubric and approval
decision stay unapproved; no production metadata is written (auditStatus stays
`unknown`, no `withdrawalTimeHours`/fees); base evidence drafts are not mutated; and
`getProtocolSelectionGoNoGo()` stays `productionReady = false`. All selection flags
stay false and no protocol appears in the UI.
