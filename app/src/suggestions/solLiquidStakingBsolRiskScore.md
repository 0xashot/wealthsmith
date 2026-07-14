# BlazeStake · bSOL Risk Score — Assigned for Review (Step 14N)

**A deterministic, evidence-based risk score for BlazeStake · bSOL, assigned FOR REVIEW**
from its completed 14N evidence package and the existing draft risk rubric. Backed by
`solLiquidStakingBsolRiskScore.ts`. Mirrors the mSOL (14J) and JupSOL (14M) scoring modules.

It answers: *"what is bSOL's risk score, and what evidence drove that score?"*

## Score: **7.35 / 10** (`assigned_for_review`, draft rubric v0.1.0-draft)

Assigned by Ashot (founder), authorized for **score assignment only** — this is **not** a
read-only recommendation approval.

## This is score assignment only

It does **not** approve bSOL for real-wallet recommendation, select it via protocol logic,
replace JitoSOL, enable multi-protocol selection, update live recommendations, or enable
transactions/signatures. A score is assigned only when bSOL's evidence is **fresh** and
`readyForRiskGate` (else `null` / blocked). JitoSOL remains the only selected live SOL
staking protocol.

Flags: `SOL_LST_BSOL_RISK_SCORE_EXISTS = true`, `..._ASSIGNMENT_ENABLED = true`;
`..._APPROVES_READ_ONLY_RECOMMENDATION`, `..._ENABLES_MULTI_PROTOCOL_SELECTION`,
`..._UPDATES_LIVE_RECOMMENDATIONS`, `..._ENABLES_TRANSACTIONS`,
`..._REQUIRES_WALLET_SIGNATURE`, `..._REPLACES_JITO` all `false`.

## Rubric dimensions, weights, and bSOL scores

Weights come from the existing rubric (`protocolRiskRubric.ts`, total 100); the weighted
total is computed deterministically.

| Dimension | Weight | bSOL score (0–10) | Basis |
| --- | --- | --- | --- |
| Audit & security | 25% | **9** | Stake-pool contract audited 7× by 5 firms (Quantstamp, Neodyme ×4, Kudelski, Halborn, OtterSec) per BlazeStake docs |
| Maturity & production history | 20% | **7** | Established Solana LST with multi-year history; smaller adoption than Marinade/Jito, broader DeFi feature surface |
| TVL & adoption | 15% | **6** | Source-backed fresh TVL ~$67.1M — the smallest of the reviewed candidates (mSOL ~$182M, JupSOL ~$392M) |
| Withdrawal & fee transparency | 15% | **8** | 0% deposit, 0% epoch/management fee, flat 0.1% instant + 0.1% delayed unstake; delayed-unstake timing epoch-based (not published as fixed hours) |
| Operational & dependency risk | 15% | **6** | Non-custodial, multi-validator (monitored + human-reviewed), upgrade authority via a Solana-Foundation-overseen ecosystem multisig; smaller operator/DAO + DeFi surface |
| Incident history | 10% | **7** | Point-in-time review found no independent bSOL-specific incident/postmortem (not a clean-history claim); no disclosed loss event |

**Weighted:** (9·25 + 7·20 + 6·15 + 8·15 + 6·15 + 7·10) / 100 = **735 / 100 = 7.35**.
(For reference: JitoSOL 7.75, JupSOL 7.65, mSOL 7.40. bSOL is the lowest of the reviewed set
but still ≥ 7, dragged mainly by the smallest TVL; lifted by strong audits and low, fully
transparent fees.)

## Evidence used (all recorded, fresh)

Market data from the DefiLlama bSOL pool `387d6732-…` (fresh, not the stale 14B values);
mechanics/fees/audits/operational from the official BlazeStake docs
(`stake-docs.solblaze.org`); and a point-in-time incident review. `evidenceRefs` on the
assignment carries the source URLs per group. The `direct_unstake_time` is recorded as
sourced epoch-based **text** (14I dual-format): BlazeStake documents the delayed-unstake
mechanism (bSOL → native Solana stake account) but does not publish a fixed hour figure, so
the ~2-3 day / epoch-boundary basis is Solana's standard stake-deactivation cooldown — no
fixed hours are invented.

## Risk rationale

- **Positives:** stake-pool contract audited 7× by 5 firms; transparent, low fees (0%
  deposit, 0% epoch fee, 0.1% instant/delayed unstake); non-custodial design with a
  Solana-Foundation-overseen upgrade multisig; source-backed fresh TVL + APY (30-day mean
  ~5.34%).
- **Risks:** smallest TVL of the reviewed candidates (~$67.1M) → lower adoption / liquidity
  depth; epoch-based (non-fixed) delayed-unstake timing not published by BlazeStake as
  hours; broader DeFi feature surface (BLZE rewards, custom liquidity); instant-unstake
  liquidity depends on stake-pool reserves.

## Limitations

- This score is `assigned_for_review` using the **draft** rubric — an internal review input,
  not an approval.
- A risk score is not an endorsement and does not by itself qualify bSOL for real-wallet
  recommendation.
- It does not select bSOL, replace JitoSOL, enable multi-protocol selection, or move funds.
- The incident_history finding is point-in-time (no independent incident found); it is not a
  verified clean-history claim.
- Validity depends on the evidence staying within the 24-hour freshness window (stale →
  score assignment is blocked and returns `null`).

## Gate behavior

`getBsolRiskScoreAssignment({ checkedAt })` returns the assignment only when the bSOL
evidence summary is `readyForRiskGate` and fresh; otherwise `null`.
`evaluateBsolRiskScoreAssignmentStatus({ checkedAt })` reports
`{ scoreAssigned, score?, readyForRiskGate, evidenceFresh, blockers, … }` with all
approval/selection/transaction flags `false`. Beyond the 24h window the records go stale →
`scoreAssigned: false` with blockers `evidence_incomplete` / `evidence_stale` /
`not_ready_for_risk_gate`.

## Registry

The candidate registry is **unchanged**: bSOL stays `staged_candidate` /
`approvedForReadOnlyRecommendation: false` with `riskScore` still `undefined`. The read-only
review approval and UI exposure are expressed through the separate, non-mutating approval
module — never by mutating the base registry (so the selector-facing approved list stays
Jito-only).
