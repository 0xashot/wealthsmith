# SOL Liquid-Staking Data Sourcing Pack (Step 12O)

**Sourcing plan only. Production selection remains disabled.** This pack answers:
*"what exact external or codebase sources do we need to close the current go/no-go
blockers?"* It proposes WHERE to source each missing field — it assigns no value,
verifies nothing on its own, and changes no production metadata.
`PROTOCOL_SELECTION_IMPLEMENTED = false`, `getProtocolSelectionGoNoGo()`
still returns `productionReady = false`.

Source-candidate proposals live in `protocolSolLiquidStakingSourceCandidates.ts`
(statuses: `proposed` · `verified` · `rejected` · `needs_review`). Verified
production status stays in `protocolSolLiquidStakingSources.ts`.

## Per-candidate source status

Statuses: `verified` · `partially_verified` · `missing` · `not_assigned` ·
`not_applicable`.

### Jupiter / JupSOL
| Field | Status | Source / plan |
| --- | --- | --- |
| Mint | verified | TOKEN_REGISTRY (`jupSoLaHXQ…`) |
| APY | verified | on-chain SPL stake-pool exchange rate (lstApy.ts) |
| TVL | missing | needs_review: exact DefiLlama pool UUID (project + JupSOL) |
| Withdrawal | missing | proposed: official Jupiter staking/unstake docs |
| Fee schedule | missing | proposed: official Jupiter fee docs |
| Audit / security | missing (unknown) | proposed: official security page + audit report |
| RiskScore | not_assigned | evidence-gathering only (rubric pending, 12P) |
| Liquidity / route | not_applicable | liquid-staking stake needs no swap route |
| **Eligibility blocker** | | TVL, withdrawal, fees, audit, riskScore, live APY value |

### Marinade / mSOL
| Field | Status | Source / plan |
| --- | --- | --- |
| Mint | verified | TOKEN_REGISTRY / lstApy.ts (`mSoLzYCx…`) |
| APY | verified | Marinade API (lstApy.ts `fetchMarinadeMsolApy`) |
| TVL | missing | needs_review: exact DefiLlama pool UUID (project + mSOL) |
| Withdrawal | missing | proposed: official Marinade unstake docs (delayed vs instant-unstake) |
| Fee schedule | missing | proposed: official Marinade fee docs |
| Audit / security | missing (unknown) | proposed: official security page + audit report |
| RiskScore | not_assigned | evidence-gathering only (rubric pending, 12P) |
| Liquidity / route | not_applicable | liquid-staking stake needs no swap route |
| **Eligibility blocker** | | TVL, withdrawal, fees, audit, riskScore, live APY value |

### Jito / JitoSOL
| Field | Status | Source / plan |
| --- | --- | --- |
| Mint | verified | TOKEN_REGISTRY (`J1toso1u…`) |
| APY | verified | on-chain SPL stake-pool exchange rate (lstApy.ts) |
| TVL | missing | needs_review: exact DefiLlama pool UUID (project + JitoSOL) |
| Withdrawal | missing | proposed: official Jito staking/unstake docs |
| Fee schedule | missing | proposed: official Jito fee docs |
| Audit / security | missing (unknown) | proposed: official security page + audit report |
| RiskScore | not_assigned | evidence-gathering only (rubric pending, 12P) |
| Liquidity / route | not_applicable | liquid-staking stake needs no swap route |
| **Eligibility blocker** | | TVL, withdrawal, fees, audit, riskScore, live APY value |

### BlazeStake / bSOL
| Field | Status | Source / plan |
| --- | --- | --- |
| Mint | verified | TOKEN_REGISTRY (`bSo13r4T…`) |
| APY | verified | on-chain SPL stake-pool exchange rate (lstApy.ts) |
| TVL | missing | needs_review: exact DefiLlama pool UUID (project + bSOL) |
| Withdrawal | missing | proposed: official BlazeStake staking/unstake docs |
| Fee schedule | missing | proposed: official BlazeStake fee docs |
| Audit / security | missing (unknown) | proposed: official security page + audit report |
| RiskScore | not_assigned | evidence-gathering only (rubric pending, 12P) |
| Liquidity / route | not_applicable | liquid-staking stake needs no swap route |
| **Eligibility blocker** | | TVL, withdrawal, fees, audit, riskScore, live APY value |

### Sanctum / INF
| Field | Status | Source / plan |
| --- | --- | --- |
| Mint | verified | lstApy.ts INF_MINT (`5oVNBeEE…`) |
| APY | verified | DefiLlama (INF pool) |
| TVL | verified | DefiLlama pool `3075a746-bdd1-4aac-bcd5-b035abee2622` |
| Withdrawal | missing | proposed: official Sanctum unstake docs |
| Fee schedule | missing | proposed: official Sanctum fee docs |
| Audit / security | missing (unknown) | proposed: official security page + audit report |
| RiskScore | not_assigned | evidence-gathering only (rubric pending, 12P) |
| Liquidity / route | not_applicable | liquid-staking stake needs no swap route |
| **Eligibility blocker** | | withdrawal, fees, audit, riskScore, live APY value |

## Sourcing workflow

`proposed / needs_review → verified → production metadata → dry-run → go/no-go`.
A source candidate never advances itself: promotion to `verified` and any write to
`protocolSolLiquidStakingSources.ts` / `DEFILLAMA_POOL_MAPPINGS` /
`ProtocolMarketData` / `ProtocolRiskData` requires a later, explicit,
human-reviewed step with exact evidence.

## RiskScore evidence requirements (no score assigned)

Per `SOL_LIQUID_STAKING_RISK_EVIDENCE_REQUIREMENTS` and
`protocolRiskMethodology.md`, a future `riskScore` must be built from: audit/
security history + scope; time in production and TVL/adoption history; withdrawal
and fee transparency; operational risk (admin-key/upgrade authority, oracle/
dependency); and incident history. **`riskScore` stays absent in 12O.**

## Evidence drafts (Step 12Q)

Reviewable evidence drafts for the risk rubric now exist in
`protocolSolLiquidStakingEvidenceDrafts.ts` (+
`protocolSolLiquidStakingEvidenceDrafts.md`): 30 drafts (5 candidates × 6
dimensions), status `gathered`/`partial`/`missing`/`needs_review`/`not_reviewed`.
Current coverage: 1 partial (Sanctum/INF TVL), 29 needs_review, 0 gathered,
`scoreAssignedCount = 0`. These are evidence drafts only — **the proposed sources
here are still not production metadata**, no `riskScore` is assigned, and nothing is
promoted into `protocolSolLiquidStakingSources.ts` / `DEFILLAMA_POOL_MAPPINGS` /
`ProtocolRiskData`. Production selection stays disabled.

## Source verification intake (Step 12T)

Reviewer-supplied source candidates (exact DefiLlama pool IDs for JupSOL/mSOL/
JitoSOL/bSOL, INF via the existing codebase pool, and official withdrawal/fee/
audit/operational docs URLs) are now classified at the SOURCE level in
`protocolSolLiquidStakingSourceVerification.ts`. Verification status:

- **Verified (source existence only):** the four DefiLlama TVL pools (exact UUID +
  label + Solana), INF codebase pool, and official docs links.
- **Needs review:** incident_history for all five; any source with unclear scope.

**No production metadata is promoted.** TVL pools are not added to
`DEFILLAMA_POOL_MAPPINGS`; `auditStatus` stays `unknown`; no withdrawal/fee value
and no `riskScore` is assigned. See `protocolSolLiquidStakingSourceVerification.md`.

## Source value confirmation (Step 12U)

`protocolSolLiquidStakingSourceValueConfirmation.ts` records reviewer-confirmed
VALUES read from 12T-verified sources (with reviewer + as-of). **Source
verification (link exists) versus value confirmation (a reviewer read a value):**
both are non-production. A confirmed value is still **not promoted to production
metadata** — nothing is written to `DEFILLAMA_POOL_MAPPINGS`/`ProtocolMarketData`/
`ProtocolRiskData`, no evidence draft is mutated, and no `riskScore` is assigned.

## Real value confirmation ledger (Step 12V)

`protocolSolLiquidStakingRealValueConfirmations.ts` stores reviewer-confirmed
DefiLlama TVL/APY/APY-30d values for JupSOL/mSOL/JitoSOL/bSOL (reviewer: Ashot
Gyulzatyan, founder; as-of 2026-07-12) in a **non-production confirmation ledger**.
INF stays absent (no exact value supplied; not invented). Values expire after 24h
(then `stale`) and support only `tvl_adoption` when fresh. **No promotion to
production metadata:** nothing is written to `DEFILLAMA_POOL_MAPPINGS` /
`ProtocolMarketData`, no evidence draft is mutated, and no `riskScore` is assigned.

## Gather-decision ledger (Step 12W)

`protocolSolLiquidStakingEvidenceGatherDecisions.ts` records reviewer decisions
that a dimension is `gathered` (freshness-aware). `tvl_adoption` is gathered for
JupSOL/mSOL/JitoSOL/bSOL while fresh; INF is `needs_review`; the other five
dimensions have no decision. **Gather decisions are non-production:** they mutate no
base evidence drafts and promote no production metadata (`DEFILLAMA_POOL_MAPPINGS` /
`ProtocolMarketData` untouched), and no `riskScore` is assigned.

## JitoSOL evidence package (Step 12X)

`protocolSolLiquidStakingJitoEvidenceConfirmations.ts` adds source-backed reviewer
confirmations for JitoSOL's five remaining dimensions (audit/maturity/withdrawal-fee/
operational/incident), from official Jito docs/FAQs/security/blog sources. Combined
with fresh 12V TVL/APY, **JitoSOL reaches `ready_for_review` (6/6 gathered)** — but
**still not production metadata:** nothing is promoted to `DEFILLAMA_POOL_MAPPINGS` /
`ProtocolMarketData`, `auditStatus`/`withdrawalTimeHours`/fees stay unset, no base
draft is mutated, and no `riskScore` is assigned. JitoSOL is not `approved_for_scoring`.

## riskScore assignment mechanism (Step 12Y)

`protocolRiskScoreAssignment.ts` adds the gated, auditable riskScore assignment
mechanism (weighted 0–10 over the rubric). It is **blocked by default** (approval
`not_submitted`), so **no production `riskScore` is assigned** and nothing is
promoted to production metadata (`protocolRiskRegistry.ts` / `ProtocolMarketData` /
`DEFILLAMA_POOL_MAPPINGS` untouched). A QA-only path proves the calculation (JitoSOL
7.75) without production effect. See `protocolRiskScoreAssignment.md`.

## Rules honored

- No pool UUID, APY, TVL, withdrawal time, fee, audit status, or riskScore is
  invented; missing stays missing; unknown stays unknown.
- Proposed TVL sources are NOT added to `DEFILLAMA_POOL_MAPPINGS`.
- Swap-route liquidity is kept separate from protocol withdrawal.
- Fees are never assumed zero and never inferred from APY.
- **Production selection remains disabled; `productionReady = false`.**
