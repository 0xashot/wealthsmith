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
