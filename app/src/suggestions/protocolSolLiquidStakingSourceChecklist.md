# SOL Liquid-Staking Source Checklist (Step 12L)

**Source status only. Production selection remains disabled.** This tracks which
data is source-backed per candidate and what still blocks eligibility. No
protocol is recommended; source status alone never creates eligibility (the
actual data VALUES must exist). `PROTOCOL_SELECTION_IMPLEMENTED = false`,
`SOL_LIQUID_STAKING_SELECTION_ENABLED = false`.

Statuses: `verified` · `partially verified` · `missing` · `not assigned` ·
`not applicable`. Backed by `protocolSolLiquidStakingSources.ts`.

| Candidate | Mint | APY | TVL | Withdrawal | Fees | Audit | RiskScore | Liquidity/Route | Current eligibility blocker |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| jupiter (JupSOL) | verified | verified | missing | missing | missing | missing | not assigned | missing / not applicable | riskScore, TVL, withdrawal, fees, live APY value |
| marinade (mSOL) | verified | verified | missing | missing | missing | missing | not assigned | missing / not applicable | riskScore, TVL, withdrawal, fees, live APY value |
| jito (JitoSOL) | verified | verified | missing | missing | missing | missing | not assigned | missing / not applicable | riskScore, TVL, withdrawal, fees, live APY value |
| blazestake (bSOL) | verified | verified | missing | missing | missing | missing | not assigned | missing / not applicable | riskScore, TVL, withdrawal, fees, live APY value |
| sanctum (INF) | verified | verified | verified | missing | missing | missing | not assigned | missing / not applicable | riskScore, withdrawal, fees, live APY value |

Notes:

- **Mint + APY source: verified** for all five (mints from app source; APY helpers
  exist in `lstApy.ts`). A *verified source* is not a *value* — live APY is fetched
  and injected by a dev caller; with no injection the value stays absent.
- **TVL: verified only for Sanctum/INF** via a verified DefiLlama pool UUID. The
  other four have no verified pool UUID in the codebase — TVL stays `missing`;
  none was guessed.
- **Withdrawal / fees / audit: missing** — not sourced; never assumed
  instant/zero, never inferred from APY, never conflated with swap-route liquidity.
- **RiskScore: not assigned** for all — awaits an approved methodology + evidence
  (`protocolRiskMethodology.md`, `protocolSolLiquidStakingRiskSources.md`).
- **Route: not applicable** — a liquid-staking deposit needs no swap route.

## Why production selection remains disabled

Even with mints + APY sources verified, every candidate is blocked by missing
`riskScore` (and TVL/withdrawal/fees for most), so the internal dry-run returns
`insufficient_data`. Selection stays disabled until those are source-backed, a
real-data dry-run passes, and the production-readiness gates
(`protocolSelectionProductionReadiness.md`) are met.

## 12O sourcing status

Step 12O adds a PROPOSAL registry (`protocolSolLiquidStakingSourceCandidates.ts`)
that tracks where to source each missing field. It changes no production status —
records now carry `hasProposedSourceCandidate: true` as a cross-link only.

| Category | Verified | Proposed / needs_review | Still missing (production) |
| --- | --- | --- | --- |
| Mint | all five | — | — |
| APY (source) | all five | — | — |
| TVL | Sanctum/INF only | JupSOL/mSOL/JitoSOL/bSOL (needs_review: exact DefiLlama UUID) | 4/5 values |
| Withdrawal | — | all five (proposed: official unstake docs) | all five |
| Fees | — | all five (proposed: official fee docs) | all five |
| Audit | — | all five (proposed: security/audit page) | all five |
| RiskScore | — | all five (evidence-gathering only) | all five (`not_assigned`) |

**Before production metadata changes:** a proposed/needs_review candidate must be
promoted to `verified` with exact evidence (e.g. a confirmed DefiLlama pool UUID,
an official unstake-timing doc, a fee schedule, an audit firm + report link) in a
later, explicit, human-reviewed step. Until then production status stays `missing`
/ `not_assigned` and `productionReady = false`.
