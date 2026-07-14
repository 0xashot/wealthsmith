# Sanctum · INF Risk Score — Assigned for Review (Step 14O)

**A deterministic, evidence-based risk score for Sanctum · INF, assigned FOR REVIEW** from
its completed 14O evidence package and the existing draft risk rubric. Backed by
`solLiquidStakingInfRiskScore.ts`. Mirrors the mSOL (14J), JupSOL (14M), and bSOL (14N)
scoring modules — but INF is a **MULTI-LST / shared-liquidity POOL**, so its rationale and
`poolComposition` explicitly capture the underlying-LST exposure and the OVERLAP with other
candidates (no independent-diversification benefit is implied).

It answers: *"what is INF's risk score, and what evidence drove that score?"*

## Score: **6.95 / 10** (`assigned_for_review`, draft rubric v0.1.0-draft)

Assigned by Ashot (founder), authorized for **score assignment only**. **6.95 is BELOW the
7.0 read-only-review threshold** — so INF does NOT clear the approval gate (see
[solLiquidStakingInfReadOnlyApproval.md](./solLiquidStakingInfReadOnlyApproval.md)).

## This is score assignment only

It does **not** approve INF for real-wallet recommendation, select it via protocol logic,
replace JitoSOL, enable multi-protocol selection, update live recommendations, or enable
transactions/signatures. A score is assigned only when INF's evidence is **fresh** and
`readyForRiskGate` (else `null` / blocked).

Flags: `SOL_LST_INF_RISK_SCORE_EXISTS = true`, `..._ASSIGNMENT_ENABLED = true`,
`SOL_LST_INF_IS_MULTI_LST_POOL = true`; `..._APPROVES_READ_ONLY_RECOMMENDATION`,
`..._ENABLES_MULTI_PROTOCOL_SELECTION`, `..._UPDATES_LIVE_RECOMMENDATIONS`,
`..._ENABLES_TRANSACTIONS`, `..._REQUIRES_WALLET_SIGNATURE`, `..._REPLACES_JITO` all `false`.

## INF is a multi-LST pool (composition + overlap)

`poolComposition` (also carried on the assignment):

- **poolType:** Multi-LST pool (shared liquidity).
- **underlyingExposure:** INF holds multiple underlying LSTs — all Sanctum LSTs plus
  non-Sanctum **jitoSOL and bSOL**, plus SOL/wSOL — with dynamic allocation (excess SOL
  staked to top-performing Sanctum LSTs; underperformers unstaked), not fixed weights.
- **overlapNote:** Underlying exposure **OVERLAPS** the currently selected protocol
  (JitoSOL) and an existing review candidate (bSOL): holding INF is partial exposure to the
  same underlying assets plus Sanctum pool/program risk, so it is **NOT** independent
  diversification.

## Rubric dimensions, weights, and INF scores

Weights come from the existing rubric (`protocolRiskRubric.ts`, total 100); the weighted
total is computed deterministically.

| Dimension | Weight | INF score (0–10) | Basis |
| --- | --- | --- | --- |
| Audit & security | 25% | **8** | Infinity program audited 3× (OtterSec, Sec3, Neodyme) + base SPL stake pool 5×; but INF adds S Controller / pricing / per-LST value-calculator surface |
| Maturity & production history | 20% | **7** | Established Sanctum platform; INF has run ~1 year (per Sanctum) |
| TVL & adoption | 15% | **7** | Source-backed fresh pool TVL ~$152.6M (upper-mid; > mSOL/bSOL, < JupSOL) |
| Withdrawal & fee transparency | 15% | **7** | Clear 0.2% withdrawal fee + no management fee, but swap fees "vary by LST" (no single published rate) and a 90/10 pool-fee split |
| Operational & dependency risk | 15% | **5** | **Multi-LST basket** (inherits aggregate component risk) + dynamic allocation + S Controller/pricing/value-calculator dependency + **overlap** with JitoSOL/bSOL |
| Incident history | 10% | **7** | Point-in-time review found no independent INF-specific incident/postmortem (not a clean-history claim) |

**Weighted:** (8·25 + 7·20 + 7·15 + 7·15 + 5·15 + 7·10) / 100 = **695 / 100 = 6.95**.
(For reference: JitoSOL 7.75, JupSOL 7.65, mSOL 7.40, bSOL 7.35. INF lands **below** the
single-LST cohort — its higher pool-structure complexity, added program surface, variable
swap-fee transparency, and non-independent overlap outweigh its solid TVL and audits.)

## Evidence used (all recorded, fresh)

Market data from the DefiLlama INF pool `3075a746-…` (fresh raw JSON, not stale prior
values); composition/mechanics/fees/audits/operational from official Sanctum docs
(`learn.sanctum.so`); and a point-in-time incident review. `evidenceRefs` carries the source
URLs per group. `direct_unstake_time` is recorded as sourced **text** (14I dual-format): INF
has no per-LST holder unstake cooldown — RemoveLiquidity redemption is instant — so no fixed
hours are invented.

## Risk rationale

- **Positives:** Infinity program audited 3× on top of the 5×-audited base stake pool
  (issues remediated); instant pool redemption + clear 0.2% withdrawal fee + no
  management/performance fee on rewards at the pool level; source-backed fresh TVL (~$152.6M)
  + 30-day APY ~5.95%; established Sanctum platform (~1 year of Infinity operation).
- **Risks:** **multi-LST basket** inheriting aggregate component risk; **overlap** with
  JitoSOL and bSOL (not independent diversification); added operational surface (dynamic
  allocation + S Controller/pricing/value-calculator dependency); swap fees vary by LST
  (reduced fee transparency).

## Limitations

- This score is `assigned_for_review` using the **draft** rubric — an internal review input,
  not an approval; INF's 6.95 is below the 7.0 threshold, so it is **not** approved.
- A risk score is not an endorsement and does not qualify INF for real-wallet recommendation.
- It does not select INF, replace JitoSOL, enable multi-protocol selection, or move funds.
- The incident_history finding is point-in-time (no independent incident found); not a
  verified clean-history claim.
- Validity depends on the evidence staying within the 24-hour freshness window (stale →
  `null`).

## Gate behavior

`getInfRiskScoreAssignment({ checkedAt })` returns the assignment only when the INF evidence
summary is `readyForRiskGate` and fresh; otherwise `null`.
`evaluateInfRiskScoreAssignmentStatus({ checkedAt })` reports the status with all
approval/selection/transaction flags `false`.

## Registry

The candidate registry is **unchanged**: INF stays `staged_candidate` /
`approvedForReadOnlyRecommendation: false` with `riskScore` still `undefined`. Because the
score is below threshold, INF is not surfaced in the product UI and is not added to the
combined read-only-review-approved list.
