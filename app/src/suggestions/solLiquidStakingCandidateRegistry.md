# SOL Liquid-Staking Candidate Registry (Step 14A)

**A read-only, data-model-only registry of the MVP SOL liquid-staking candidates and
the data each still needs before it could become eligible for an exact read-only
recommendation.** Backed by `solLiquidStakingCandidateRegistry.ts`.

It answers: *"what SOL liquid-staking candidates can WealthSmith evaluate next, and what
data is required before each can become eligible for exact recommendation?"*

## This changes nothing live

This is registry/data-model work only. It does **not** change the selected protocol,
make non-Jito protocols appear in real wallet mode, alter JitoSOL live behavior, enable
multi-protocol selection, enable transactions/signatures, or change Demo Mode / `/testing`.
The module is **not** imported by `stakingSuggestion` or any live/UI file — only by docs
and fixtures. **JitoSOL remains the only selected protocol after 14A.**

Registry flags: `SOL_LST_CANDIDATE_REGISTRY_EXISTS = true`;
`..._ENABLES_MULTI_PROTOCOL_SELECTION`, `..._UPDATES_LIVE_RECOMMENDATIONS`,
`..._ENABLES_TRANSACTIONS`, `..._REQUIRES_WALLET_SIGNATURE` all `false`.

## Candidate list

Jito · JitoSOL · Marinade · mSOL · Jupiter · JupSOL · BlazeStake · bSOL · Sanctum · INF.

## Current status

| Protocol · LST | Status | Approval | Risk score | External review link | Market/mechanics data |
| --- | --- | --- | --- | --- | --- |
| Jito · JitoSOL | `active_read_only_beta` | `approved_read_only` | 7.75 (approved) | Enabled → jito.network/staking | Verified |
| Marinade · mSOL | `staged_candidate` | `pending_review` | missing | Known URL, **disabled** | `needs_review` |
| Jupiter · JupSOL | `staged_candidate` | `pending_review` | missing | Known URL, **disabled** | `needs_review` |
| BlazeStake · bSOL | `staged_candidate` | `pending_review` | missing | Known URL, **disabled** | `needs_review` |
| Sanctum · INF | `staged_candidate` | `pending_review` | missing | Known URL, **disabled** | `needs_review` |

Summary: `totalCandidates: 5`, `approvedReadOnlyCandidates: 1`, `stagedCandidates: 4`,
`transactionsEnabledCandidates: 0`, `walletSignatureCandidates: 0`.

### JitoSOL — active read-only beta

JitoSOL carries the verified market data + mechanics (reused from
`jitoSolBetaActivation.ts`: TVL $767.95M, APY 5.36% / 30-day 5.45%, direct unstake ~48h,
0.1% unstake fee, 4% annual management fee on rewards), the **approved** risk score 7.75,
verified audit/operational/incident evidence, and the enabled read-only external review
link (`https://www.jito.network/staking/`). Still read-only: transactions / wallet
signatures / auto-execution all false.

### mSOL / JupSOL / bSOL / INF — staged only

Staged candidates are conservative by construction: not approved, **no risk score**
(`riskScoreStatus: "missing"`), market/mechanics/evidence all `needs_review`, and
`sourceReverificationRequired: true`. **No TVL/APY/fee/unstake value is invented.**
Reviewer-confirmed (non-production) DefiLlama values for JupSOL/mSOL/bSOL exist in the
confirmation ledger (`protocolSolLiquidStakingRealValueConfirmations.ts`) — and INF has
none — but they are **not** carried in as verified here; they stay `needs_review` until
Step 14B re-verifies them. Each staged candidate carries blockers:
`source_reverification_required`, `approved_risk_score_missing`,
`read_only_approval_missing`. Their external review links record the known official URL
but stay **disabled** (candidate not approved; page not yet vetted as the exact review
surface).

## Data required before a candidate can be approved

For any staged candidate to move toward read-only recommendation eligibility:

- TVL
- current APY
- 30-day APY
- withdrawal mechanics (direct unstake time)
- fees (unstake fee, annual management fee)
- audit / security evidence
- operational risk review
- incident review
- an approved `riskScore` (rubric-based)
- a source timestamp (`asOf`) with staleness handling

## No transaction / signature boundary

Nothing in the registry executes, signs, swaps, deposits, stakes, or moves funds; every
candidate has `transactionsEnabled` / `walletSignaturesEnabled` / `autoExecutionEnabled`
false. Staged candidates never appear in real wallet mode.

## Source/value confirmation (Step 14B)

Staged-candidate source values are now recorded and freshness-checked in
[solLiquidStakingSourceValueConfirmation.md](solLiquidStakingSourceValueConfirmation.md)
(`solLiquidStakingSourceValueConfirmation.ts`). Prior DefiLlama values for
JupSOL/mSOL/bSOL are recorded with a 24h freshness rule (currently **stale**); INF has no
value (`missing`); mechanics/evidence stay `needs_review`. No candidate is approved or
scored, and the registry above is unchanged — 14B is a confirmation ledger only.

## mSOL read-only review approval (Step 14K)

mSOL has completed evidence (14F–14I) and a risk score of 7.40 (14J), and is now
**approved for read-only review exposure** (14K) — see
[solLiquidStakingMsolReadOnlyApproval.md](solLiquidStakingMsolReadOnlyApproval.md). This
**does not mutate the base registry above**: mSOL stays `staged_candidate` /
`approvedForReadOnlyRecommendation: false` / `riskScore: undefined`, and
`getApprovedSolLiquidStakingCandidates()` (selector-facing) stays Jito-only. The review
approval is a **separate, non-mutating** view,
`getReadOnlyReviewApprovedSolLiquidStakingCandidates()`, which lists JitoSOL plus mSOL
(marked `approved_read_only_review`, `riskScore 7.40`, not selected, not winner) while the
approval is active. Read-only review approval ≠ selector eligibility.

## Future steps

- **14B** — ✅ source / value confirmation for staged candidates (TVL/APY re-verification
  with a 24h freshness rule). See above.
- **14C** — risk scoring for staged candidates (rubric-based approved `riskScore`).
- **14D** — selector comparison across approved candidates (only once more than one is
  approved for read-only recommendation).
