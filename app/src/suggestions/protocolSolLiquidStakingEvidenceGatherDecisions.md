# SOL Liquid-Staking Evidence Gather-Decision Ledger (Step 12W)

**An auditable, non-production ledger of explicit reviewer decisions that a rubric
dimension is `gathered`.** Gather decisions do not mutate base evidence drafts, no
score is assigned, and production selection remains disabled. Backed by
`protocolSolLiquidStakingEvidenceGatherDecisions.ts`.
`PROTOCOL_SELECTION_IMPLEMENTED = false`,
`getProtocolSelectionGoNoGo().productionReady = false`.

## Purpose

Answer: *"when reviewer-confirmed values fully satisfy a rubric dimension, how do
we record that the dimension is gathered without mutating base evidence drafts,
assigning riskScore, or enabling protocol selection?"* — by recording an explicit,
freshness-aware reviewer decision in a separate ledger.

## The four layers (each strictly non-production)

1. **Evidence draft (12Q):** what evidence a dimension needs, per candidate.
2. **Source verification (12T):** the source LINK is legitimate.
3. **Value confirmation / real-value ledger (12U–12V):** a reviewer read a specific
   value from a verified source, with an as-of date.
4. **Gather decision (12W, this step):** a reviewer decides a dimension is
   `gathered`, citing the confirmed values — recorded in a ledger, not the drafts.

## Current gather decisions

Reviewer: **Ashot Gyulzatyan** (founder). Decided-at: **2026-07-12T00:00:00Z**.

| Candidate | Dimension | Status | Based on |
| --- | --- | --- | --- |
| Jupiter / JupSOL | tvl_adoption | gathered | tvl, apy, apy_30d_average (12V) |
| Marinade / mSOL | tvl_adoption | gathered | tvl, apy, apy_30d_average (12V) |
| Jito / JitoSOL | tvl_adoption | gathered | tvl, apy, apy_30d_average (12V) |
| BlazeStake / bSOL | tvl_adoption | gathered | tvl, apy, apy_30d_average (12V) |
| Sanctum / INF | tvl_adoption | needs_review | exact real values not confirmed |

There are **no** gather decisions for `audit_security`, `maturity`,
`withdrawal_fee_transparency`, `operational_dependency_risk`, or `incident_history`
— those dimensions remain incomplete for every candidate.

## Freshness-aware / stale value behavior

A `gathered` `tvl_adoption` decision is EFFECTIVE only while its underlying 12V
TVL/APY/APY-30d confirmations are still fresh (within 24h of `confirmedAsOf`).
Evaluated past that window, `validateEvidenceGatherDecision()` returns `stale`, and
the dimension does not count as gathered until the values are re-confirmed.

## INF remains needs_review

No exact real TVL/APY/APY-30d values are confirmed for INF in the 12V ledger (none
invented), so its gather decision is `needs_review` — INF has 0 gathered dimensions.

## Why no candidate is ready_for_review

`candidateReadyForReview` requires ALL six rubric dimensions `gathered`. With fresh
values, JupSOL/mSOL/JitoSOL/bSOL each have **1 gathered** (`tvl_adoption`) and **5
missing** dimensions; INF has 0 gathered and 6 missing. So no candidate is
`ready_for_review`.

## Why no candidate is approved_for_scoring, and no score is assigned

`approved_for_scoring` additionally requires the rubric approval decision to allow
scoring — it stays `not_submitted` / unapproved. `scoreAssigned` is always false;
no `riskScore` is assigned. The gate wrapper
(`evaluateProtocolRiskCandidateScoreAssignmentGateWithGatherDecisions`) shows the
four candidates with `tvl_adoption` gathered but status `blocked`/`evidence_incomplete`
(5 dimensions still missing), `scoreAssignmentAllowed = false`.

## Why production selection remains disabled

No production metadata is written, no evidence draft is mutated, no `riskScore` is
assigned, the rubric and approval decision stay unapproved, and
`getProtocolSelectionGoNoGo()` stays `productionReady = false`. All selection flags
stay false and no protocol appears in the UI.
