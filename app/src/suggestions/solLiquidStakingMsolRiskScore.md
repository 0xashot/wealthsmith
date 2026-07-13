# Marinade · mSOL Risk Score — Assigned for Review (Step 14J)

**A deterministic, evidence-based risk score for Marinade · mSOL, assigned FOR REVIEW**
from its completed 14F–14I evidence package and the existing draft risk rubric. Backed by
`solLiquidStakingMsolRiskScore.ts`.

It answers: *"what is mSOL's risk score, and what evidence drove that score?"*

## Score: **7.40 / 10** (`assigned_for_review`, draft rubric v0.1.0-draft)

Assigned by Ashot (founder), authorized for **score assignment only** — this is **not** a
read-only recommendation approval.

## This is score assignment only

It does **not** approve mSOL for real-wallet recommendation, select it via protocol logic,
replace JitoSOL, enable multi-protocol selection, update live recommendations, or enable
transactions/signatures. The module is not imported by `stakingSuggestion` or any live/UI
file. A score is assigned only when mSOL's evidence is **fresh** and `readyForRiskGate`
(else `null` / blocked). JitoSOL remains the only selected live SOL staking protocol.

Flags: `SOL_LST_MSOL_RISK_SCORE_EXISTS = true`, `..._ASSIGNMENT_ENABLED = true`;
`..._APPROVES_READ_ONLY_RECOMMENDATION`, `..._ENABLES_MULTI_PROTOCOL_SELECTION`,
`..._UPDATES_LIVE_RECOMMENDATIONS`, `..._ENABLES_TRANSACTIONS`,
`..._REQUIRES_WALLET_SIGNATURE`, `..._REPLACES_JITO` all `false`.

## Rubric dimensions, weights, and mSOL scores

Weights come from the existing rubric (`protocolRiskRubric.ts`, total 100); the weighted
total is computed deterministically.

| Dimension | Weight | mSOL score (0–10) | Basis |
| --- | --- | --- | --- |
| Audit & security | 25% | **9** | 4 independent audits (Kudelski, Ackee, Neodyme, Sec3) + SOC 2 Type I/II |
| Maturity & production history | 20% | **8** | Multi-year production history, continued audits |
| TVL & adoption | 15% | **7** | Source-backed fresh TVL ~$182.8M (mid-tier), verified APY |
| Withdrawal & fee transparency | 15% | **8** | Documented mechanics; 0.2% direct-unstake fee; 0% reward fee; epoch-based timing is a minor uncertainty |
| Operational & dependency risk | 15% | **6** | SAM delegation, stake pool, LP/Jupiter dependency, 13-party/6-signer multisig admin |
| Incident history | 10% | **4** | Disclosed SAM unstake-priority logic bug (~28% missed rewards, epochs 652–777); criticized response |

**Weighted:** (9·25 + 8·20 + 7·15 + 8·15 + 6·15 + 4·10) / 100 = **740 / 100 = 7.40**.
(For reference, JitoSOL's approved score is 7.75; mSOL is slightly lower, driven mainly by
incident history.)

## Evidence used (all recorded, fresh)

Market data (DefiLlama pool), withdrawal mechanics + fees (Marinade FAQ / docs), audit list
(Marinade audits page), operational dependencies (What is mSOL?), and the incident review
(Marinade community forum). `evidenceRefs` on the assignment carries the source URLs per
group.

## Risk rationale

- **Positives:** independent audits + SOC 2; established multi-year history; source-backed
  fresh TVL + APY; documented unstake mechanics and fees (0.2% direct unstake, no reward fee).
- **Risks:** the disclosed SAM unstake-priority logic bug (~37,000 SOL / ~28% of advertised
  rewards missed over epochs 652–777); operational dependencies (SAM, stake pool,
  LP/Jupiter, multisig admin); epoch-based (non-fixed) unstake timing; market-dependent
  instant-unstake pricing.

## Limitations

- This score is `assigned_for_review` using the **draft** rubric — an internal review input,
  not an approval.
- A risk score is not an endorsement and does not by itself qualify mSOL for real-wallet
  recommendation.
- It does not select mSOL, replace JitoSOL, enable multi-protocol selection, or move funds.
- Validity depends on the evidence staying within the 24-hour freshness window (stale →
  score assignment is blocked and returns `null`).

## Gate behavior

`getMsolRiskScoreAssignment({ checkedAt })` returns the assignment only when the mSOL
evidence summary is `readyForRiskGate` and fresh; otherwise `null`.
`evaluateMsolRiskScoreAssignmentStatus({ checkedAt })` reports
`{ scoreAssigned, score?, readyForRiskGate, evidenceFresh, blockers, … }` with all
approval/selection/transaction flags `false`. Beyond the 24h window the records go stale →
`scoreAssigned: false` with blockers `evidence_incomplete` / `evidence_stale` /
`not_ready_for_risk_gate`.

## Registry

The candidate registry is **unchanged**: mSOL stays `staged_candidate` /
`approvedForReadOnlyRecommendation: false` with `riskScore` still `undefined`. Writing the
score into the registry belongs to the later **read-only recommendation approval** step, not
to score assignment.

## Next steps

1. **Read-only recommendation approval gate** (weigh this score + the incident finding).
2. Then **UI exposure** of mSOL as a review candidate (real wallet + Demo + `/testing`).
3. Then a later **deterministic selector comparison** across approved candidates (only once
   more than one is approved). None of these happen in 14J.
