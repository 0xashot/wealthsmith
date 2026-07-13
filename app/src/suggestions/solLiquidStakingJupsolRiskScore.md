# Jupiter · JupSOL Risk Score — Assigned for Review (Step 14M)

**A deterministic, evidence-based risk score for Jupiter · JupSOL, assigned FOR REVIEW**
from its completed 14M evidence package and the existing draft risk rubric. Backed by
`solLiquidStakingJupsolRiskScore.ts`. Mirrors the mSOL scoring module (14J).

It answers: *"what is JupSOL's risk score, and what evidence drove that score?"*

## Score: **7.65 / 10** (`assigned_for_review`, draft rubric v0.1.0-draft)

Assigned by Ashot (founder), authorized for **score assignment only** — this is **not** a
read-only recommendation approval.

## This is score assignment only

It does **not** approve JupSOL for real-wallet recommendation, select it via protocol logic,
replace JitoSOL, enable multi-protocol selection, update live recommendations, or enable
transactions/signatures. A score is assigned only when JupSOL's evidence is **fresh** and
`readyForRiskGate` (else `null` / blocked). JitoSOL remains the only selected live SOL
staking protocol.

Flags: `SOL_LST_JUPSOL_RISK_SCORE_EXISTS = true`, `..._ASSIGNMENT_ENABLED = true`;
`..._APPROVES_READ_ONLY_RECOMMENDATION`, `..._ENABLES_MULTI_PROTOCOL_SELECTION`,
`..._UPDATES_LIVE_RECOMMENDATIONS`, `..._ENABLES_TRANSACTIONS`,
`..._REQUIRES_WALLET_SIGNATURE`, `..._REPLACES_JITO` all `false`.

## Rubric dimensions, weights, and JupSOL scores

Weights come from the existing rubric (`protocolRiskRubric.ts`, total 100); the weighted
total is computed deterministically.

| Dimension | Weight | JupSOL score (0–10) | Basis |
| --- | --- | --- | --- |
| Audit & security | 25% | **9** | Sanctum SPL Stake Pool Program, audited 9× per Jupiter docs; program secured >$4B across the ecosystem |
| Maturity & production history | 20% | **7** | Newer LST product on a well-established stake-pool program; shorter token track record than mSOL |
| TVL & adoption | 15% | **8** | Source-backed fresh TVL ~$391.9M (upper-mid tier, larger than mSOL), verified APY |
| Withdrawal & fee transparency | 15% | **8** | Documented: instant swap or ~2-day delayed unstake, 0.1% pool-unwrap fee, 5% inflation commission (0% MEV); multi-component fee adds slight complexity |
| Operational & dependency risk | 15% | **6** | **Single** Jupiter validator (concentration) + Sanctum SPL stake-pool infra + 11-member multisig upgrade authority |
| Incident history | 10% | **7** | No independent JupSOL-specific incident found this window; "without exploits" is Jupiter's own statement, not independent verification |

**Weighted:** (9·25 + 7·20 + 8·15 + 8·15 + 6·15 + 7·10) / 100 = **765 / 100 = 7.65**.
(For reference: JitoSOL 7.75, mSOL 7.40. JupSOL sits between them — higher than mSOL mainly
on TVL and the absence of a disclosed loss event, offset by single-validator concentration.)

## Evidence used (all recorded, fresh)

Market data (DefiLlama JupSOL pool `52bd72a7-…`), withdrawal mechanics + fees + audit +
operational dependencies (official Jupiter docs: `jupsol.md` and the stake-sol FAQ), and a
point-in-time incident review. `evidenceRefs` on the assignment carries the source URLs per
group. The `annual_management_fee` records the Jupiter validator commission (5% on inflation
rewards, 0% MEV); a **separate** Sanctum epoch fee on base rewards is disclosed in the record
notes and reflected in the risk rationale rather than double-counted as a single number.

## Risk rationale

- **Positives:** Sanctum SPL Stake Pool Program (audited 9×, >$4B secured); 11-member
  multisig upgrade authority and a management authority that cannot access user funds;
  source-backed fresh TVL + a stable 30-day APY (~5.55%–5.69%); documented withdrawal paths
  (instant DEX swap or ~2-day direct unstake, 0.1% pool-unwrap fee).
- **Risks:** **single-validator concentration**; Sanctum infrastructure dependency;
  multi-component fee structure (5% inflation commission + a separate Sanctum epoch fee);
  epoch-based (non-fixed) delayed-unstake timing; market-dependent instant-swap pricing.

## Limitations

- This score is `assigned_for_review` using the **draft** rubric — an internal review input,
  not an approval.
- A risk score is not an endorsement and does not by itself qualify JupSOL for real-wallet
  recommendation.
- It does not select JupSOL, replace JitoSOL, enable multi-protocol selection, or move funds.
- The incident_history finding is point-in-time (no independent incident found); the
  "without exploits" statement is Jupiter's own, not independent verification.
- Validity depends on the evidence staying within the 24-hour freshness window (stale →
  score assignment is blocked and returns `null`).

## Gate behavior

`getJupsolRiskScoreAssignment({ checkedAt })` returns the assignment only when the JupSOL
evidence summary is `readyForRiskGate` and fresh; otherwise `null`.
`evaluateJupsolRiskScoreAssignmentStatus({ checkedAt })` reports
`{ scoreAssigned, score?, readyForRiskGate, evidenceFresh, blockers, … }` with all
approval/selection/transaction flags `false`. Beyond the 24h window the records go stale →
`scoreAssigned: false` with blockers `evidence_incomplete` / `evidence_stale` /
`not_ready_for_risk_gate`.

## Registry

The candidate registry is **unchanged**: JupSOL stays `staged_candidate` /
`approvedForReadOnlyRecommendation: false` with `riskScore` still `undefined`. The read-only
review approval and UI exposure are expressed through the separate, non-mutating approval
module — never by mutating the base registry (so the selector-facing approved list stays
Jito-only).
