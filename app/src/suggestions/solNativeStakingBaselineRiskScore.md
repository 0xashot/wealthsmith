# Native SOL / Jupiter Native Stake — Baseline Risk Score (Step 14P)

**The risk-score module for the Native SOL / Jupiter Native Stake BASELINE candidate**,
adapted from the shared draft rubric. Backed by `solNativeStakingBaselineRiskScore.ts`.

## Outcome: NO SCORE ASSIGNED (evidence incomplete)

Native-staking evidence is **incomplete** — the three market categories (delegated stake /
current APY / 30-day APY) are missing (see
[solNativeStakingBaselineEvidence.md](./solNativeStakingBaselineEvidence.md)). So
`readyForRiskGate` is false and `getNativeStakingBaselineRiskScoreAssignment()` returns
`null`. No dimension scores are fabricated for the missing market/adoption evidence.

This module still defines the **native-adapted rubric mapping** and the **qualitative risk
rationale** (which is knowable independent of the missing market data), so a deterministic
score can be assigned in a later step once the market evidence is recorded.

## This is not an LST (and not JupSOL)

The candidate is native SOL staking — a native Solana stake account of delegated SOL. Flags:
`SOL_NATIVE_STAKING_BASELINE_RISK_SCORE_EXISTS = true`, `..._IS_LST = false`;
`..._APPROVES_READ_ONLY_RECOMMENDATION`, `..._ENABLES_SELECTOR_COMPARISON`,
`..._UPDATES_LIVE_RECOMMENDATIONS`, `..._ENABLES_TRANSACTIONS`,
`..._REQUIRES_WALLET_SIGNATURE`, `..._REPLACES_JITO` all `false`.

## Native-adapted rubric (mapped onto the shared rubric weights)

`getNativeStakingRubricDimensions()` maps the shared draft rubric (`protocolRiskRubric.ts`,
25/20/15/15/15/10 = 100) onto native-staking labels:

| Native dimension | Weight | Shared rubric id |
| --- | --- | --- |
| Security / custody / protocol model | 25% | `audit_security` |
| Maturity / adoption | 20% | `maturity` |
| Delegated stake / validator adoption | 15% | `tvl_adoption` |
| Withdrawal / fee transparency | 15% | `withdrawal_fee_transparency` |
| Operational / validator dependency | 15% | `operational_dependency_risk` |
| Incident history | 10% | `incident_history` |

`computeNativeStakingWeightedScore(dimensionScores)` computes the deterministic weighted
total (0–10) from these weights — e.g. an all-7s dimension set yields exactly 7.00. It is not
invoked with live scores in 14P because the market-dependent dimensions cannot be finalized
without the missing evidence.

## Risk rationale (`NATIVE_STAKING_RISK_RATIONALE`)

Defined now (required by spec), knowable without the market data:

- **Not an LST:** "This is native SOL staking … NOT a liquid staking token — it is not
  JupSOL/mSOL/bSOL/INF and has no SPL LST mint."
- **Positives:** non-custodial (you own the stake account, no LST contract wrapper); security
  rests on the base Solana staking program (no LST token-contract exploit surface; no
  slashing currently); transparent, simple fee model (5% inflation commission, 0% MEV, no
  management fee).
- **Risks:** **validator / delegation exposure** (single Jupiter validator; performance /
  downtime / commission-change risk); **epoch-based unstake timing** (deactivate + wait to
  epoch end, ~2 days, no rewards during deactivation; no instant liquidity); **lower DeFi
  composability than LSTs** (native stake is not a liquid token); it is **not an LST** (no LST
  liquidity token / instant-swap exit).
- **Limitations:** internal review input, not an approval; native staking is not selected,
  does not replace JitoSOL, and moves no funds; market/adoption evidence is not yet available,
  so no score is assigned in this step.

## Gate behavior

`getNativeStakingBaselineRiskScoreAssignment({ checkedAt })` → `null` while
`readyForRiskGate` is false (always in 14P).
`evaluateNativeStakingBaselineRiskScoreAssignmentStatus({ checkedAt })` →
`{ scoreAssigned: false, readyForRiskGate: false, blockers: [market_data_incomplete,
missing_categories, not_ready_for_risk_gate], … }` with every approval/selection/transaction
flag `false`.

## Scoring limitations

A risk score is not approval, not an endorsement, does not mean safe, does not mean selected,
and moves no funds. (Moot in 14P, since no score is assigned.)
