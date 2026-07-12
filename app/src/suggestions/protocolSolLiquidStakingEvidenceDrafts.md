# SOL Liquid-Staking Risk Evidence Drafts (Step 12Q)

**Evidence gathering only. No riskScore is assigned. Rubric still not approved.**
This records what sourced evidence exists (or is still needed) for each SOL
liquid-staking candidate against each rubric dimension. It is **not production
metadata**: it changes no `ProtocolRiskData`/`ProtocolMarketData`, approves
nothing, and makes no protocol eligible. `PROTOCOL_RISK_RUBRIC_APPROVED = false`,
`PROTOCOL_SELECTION_IMPLEMENTED = false`,
`getProtocolSelectionGoNoGo().productionReady = false`. Backed by
`protocolSolLiquidStakingEvidenceDrafts.ts` (30 drafts = 5 candidates × 6
dimensions).

Draft statuses: `gathered` · `partial` · `missing` · `needs_review` ·
`not_reviewed`. Nothing is invented — only codebase-verifiable sources are cited;
every unverified dimension is `needs_review` (or `partial`) with unresolved
questions.

## Coverage summary

| Metric | Value |
| --- | --- |
| Total drafts | 30 |
| gathered | 0 |
| partial | 1 (Sanctum / INF — tvl_adoption) |
| missing | 0 |
| needs_review | 29 |
| not_reviewed | 0 |
| Protocols covered | 5 |
| Dimensions covered | 6 |
| **scoreAssignedCount** | **0** |

## Evidence status by candidate × dimension

| Candidate | audit_security | maturity | tvl_adoption | withdrawal_fee_transparency | operational_dependency_risk | incident_history |
| --- | --- | --- | --- | --- | --- | --- |
| Jupiter / JupSOL | needs_review | needs_review | needs_review | needs_review | needs_review | needs_review |
| Marinade / mSOL | needs_review | needs_review | needs_review | needs_review | needs_review | needs_review |
| Jito / JitoSOL | needs_review | needs_review | needs_review | needs_review | needs_review | needs_review |
| BlazeStake / bSOL | needs_review | needs_review | needs_review | needs_review | needs_review | needs_review |
| Sanctum / INF | needs_review | needs_review | **partial** | needs_review | needs_review | needs_review |

- **Only source-backed evidence today:** Sanctum / INF `tvl_adoption` is `partial`
  — the DefiLlama INF pool is verified in the codebase (TVL value fetched at
  runtime), but adoption/holder evidence is not sourced.
- The four other TVL drafts are `needs_review`: APY is code-backed, but no verified
  DefiLlama pool UUID exists for JupSOL/mSOL/JitoSOL/bSOL (not guessed).
- All audit / maturity / withdrawal-fee / operational / incident dimensions are
  `needs_review` for every candidate — no official source has been verified yet.

## Representative unresolved questions

- **audit_security:** which firm audited the deployed version, when, scope,
  unresolved critical/high findings?
- **maturity:** source-backed launch / time-in-production and maintenance status?
- **tvl_adoption:** exact DefiLlama pool UUID (for the four), source-backed TVL +
  freshness, adoption evidence?
- **withdrawal_fee_transparency:** epoch-delayed vs instant-via-pool unstake and
  exact timing; documented fee schedule; protocol-withdrawal vs swap-route
  liquidity separation.
- **operational_dependency_risk:** upgrade/admin authority + controls;
  stake-pool/validator/oracle/routing dependencies; custody model.
- **incident_history:** disclosed incidents / postmortems / advisories (absence is
  marked missing, never assumed clean).

## What this does NOT do

- No `riskScore` is assigned; every draft has `scoreAssigned: false` and no `score`
  field.
- The rubric is **still not approved**; evidence gathering is not approval.
- No production metadata changes (auditStatus stays `unknown`, no
  `withdrawalTimeHours`, no fee values, no TVL promotion into
  `DEFILLAMA_POOL_MAPPINGS`).
- **Production selection remains disabled** and no protocol appears in the UI.

See `protocolRiskEvidenceReview.md` for how reviewers move a draft from
`needs_review` to `gathered` and what is required before a score can be assigned.
