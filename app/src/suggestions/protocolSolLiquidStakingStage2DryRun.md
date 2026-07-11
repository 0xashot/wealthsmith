# SOL Liquid-Staking Stage-2 Dry-Run Report (Step 12M)

**Internal dry-run only. This is NOT production selection.** Stage 2 answers one
engineering question: *"when we inject the real data we currently have, what does
the full pipeline report?"* It produces a structured, per-candidate **data
coverage** report and runs eligibility (and ranking only when eligibility allows).
It never selects a protocol for production, never changes live suggestions, and is
never shown in the UI. `PROTOCOL_SELECTION_IMPLEMENTED = false`,
`SOL_LIQUID_STAKING_STAGE_2_CAN_SELECT_PRODUCTION = false`.

Backed by `protocolSolLiquidStakingStage2DryRun.ts`.

## What "Stage 2" means

- **Stage 1** (Steps 12J–12L): map WHERE each candidate's data comes from and
  record source status — no live values pulled.
- **Stage 2** (this step): take the *real* values we can currently source and
  inject them into the full pipeline (eligibility → ranking) to see the honest
  result. Still **internal dry-run**, still **not production selection**.

## Current data coverage

| Candidate | APY | TVL | Withdrawal | Fees | RiskScore |
| --- | --- | --- | --- | --- | --- |
| jupiter (JupSOL) | source verified (value injected) | missing | missing | missing | missing |
| marinade (mSOL) | source verified (value injected) | missing | missing | missing | missing |
| jito (JitoSOL) | source verified (value injected) | missing | missing | missing | missing |
| blazestake (bSOL) | source verified (value injected) | missing | missing | missing | missing |
| sanctum (INF) | source verified (value injected) | verified (DefiLlama pool) | missing | missing | missing |

A *verified source* is not a *value*: APY values are fetched by a dev caller and
injected. TVL is verifiable only for Sanctum/INF. Withdrawal, fees, and riskScore
are still `missing`/`blocked` for every candidate — never assumed instant, zero,
or audited.

## How to run the report internally

Network-free, dependency-injected (no UI, no wallet, no transactions):

```ts
import { buildSolLiquidStakingStage2DryRunReport } from "./protocolSolLiquidStakingStage2DryRun";

// Inject only the real values you have sourced. Everything else stays absent.
const report = buildSolLiquidStakingStage2DryRunReport({
  apyByProtocolId: { jupiter: 8.2, marinade: 7.5, jito: 8.8, blazestake: 7.0, sanctum: 9.5 },
  tvlByProtocolId: { sanctum: 900_000_000 }, // only Sanctum/INF is verifiable today
  fetchedAt: new Date().toISOString(),
});
console.log(report.summary, report.blockers);
```

For a live-opt-in run, a dev caller wires the existing read-only helpers
(`wallet/lstApy.ts` `fetchLstApys`, a DefiLlama pool read) OUTSIDE the module,
awaits them, and injects the results:

```ts
import { buildSolLiquidStakingStage2DryRunFromLiveSources } from "./protocolSolLiquidStakingStage2DryRun";

const report = buildSolLiquidStakingStage2DryRunFromLiveSources({
  allowLiveData: true, // strong opt-in; without it the report is `blocked` (live_data_disabled)
  liveDataProvider: () => ({ apyByProtocolId, tvlByProtocolId }), // already-fetched, read-only
});
```

The module itself never fetches, never touches a wallet/`publicKey`, and never
signs. Any provider error is caught and surfaced as a `source_error` blocker — it
never throws into the engine.

## Expected current result

With today's coverage the report is **insufficient_data by design**:

- No injected values → `candidatesWithApy/Tvl/Withdrawal/Fees/RiskScore = 0`,
  `candidatesEligible = 0`, `anyFullyEligible = false`, `anyScored = false`.
- APY injected for all five → `candidatesWithApy = 5` but `candidatesEligible = 0`
  (TVL/withdrawal/fees/riskScore still missing).
- APY + verified Sanctum TVL → `candidatesWithTvl = 1`, still `candidatesEligible
  = 0` (risk/withdrawal/fees missing).

Only when *complete* data is injected for a candidate (APY, TVL ≥ minimum,
withdrawal, fees, riskScore ≥ minimum, audited) does that candidate reach
`eligible` in the report — and even then `canSelectForProduction` stays `false`.

## Why insufficient_data is correct

Eligibility requires the actual VALUES, not just verified sources. Missing
riskScore, withdrawal behavior, fees, and TVL (for 4/5) each block eligibility.
`blocked` marks the live-opt-in path when live data is not permitted. Reporting
`insufficient_data` is the honest state — nothing is defaulted, assumed, or
invented.

## Why this does not enable production selection

- `qaOnly: true`, `productionSelectionEnabled: false`, `showInUi: false`,
  `canSelectForProduction: false` on every report.
- No top-level `selectedProtocolId` / `selectedProtocolName`.
- The module is imported only by the fixtures; no engine/UI/suggestion-derivation
  file imports it. Live `protocolSelection.status` stays `not_evaluated`.
- No transaction/signature/swap path.

## Next blockers (before this narrow case could advance)

- verified TVL pools for JupSOL / mSOL / JitoSOL / bSOL;
- documented withdrawal mechanics (instant-via-pool vs. epoch cooldown);
- fee schedules (deposit/withdraw/performance/management);
- audit status per protocol (firm + report link);
- a `riskScore` methodology and sourced per-protocol scores;
- a live-data dry-run wiring the real read-only adapters (dev harness, logs only).

Until then production selection stays disabled and no user-facing recommendation
exists.
