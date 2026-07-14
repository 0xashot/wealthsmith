# Live SOL Staking Market-Data Refresh + Cache (Step 14U)

A **production-ready refresh + last-known-good cache** for the eligible SOL staking candidates.
It answers: *"Can WealthSmith produce a fresh, validated, source-attributed market snapshot for
every eligible SOL staking candidate without changing approval evidence, UI, or selector
behavior?"* — yes.

Backed by:
- [`solStakingMarketDataTypes.ts`](./solStakingMarketDataTypes.ts) — the live-cache data model.
- [`solStakingMarketDataSources.ts`](./solStakingMarketDataSources.ts) — per-candidate source
  responsibilities + freshness policy.
- [`solStakingMarketDataRefresh.ts`](./solStakingMarketDataRefresh.ts) — pure parsers +
  per-candidate builders + `buildSolStakingMarketCache`.
- [`solStakingMarketDataCache.ts`](./solStakingMarketDataCache.ts) — validate / merge / read /
  fresh-approved listing.
- [`../../scripts/refresh-sol-staking-market-data.mjs`](../../scripts/refresh-sol-staking-market-data.mjs)
  — the server-side/local refresh job (`npm run market:refresh-staking`).

## Evidence snapshot vs live market cache — the critical separation

| | **Approval evidence** | **Live market cache** |
| --- | --- | --- |
| What | Point-in-time reviewed records | Periodically refreshed market snapshots |
| Drives | Risk score + read-only approval | Later normalization (14V) + selector (14W) |
| Freshness | Fixed at review time | Can go stale / partial / unavailable |
| Mutated by refresh? | **Never** | Yes (that is its job) |
| Files | `solLiquidStakingFreshEvidenceRecords` / `solNativeStakingBaselineEvidence` | this layer |

The refresh **never** overwrites evidence records with live values, never re-runs approval from
market values, and never changes a risk score. Approval on each snapshot **reflects the existing
deterministic decision** (the approval modules), read as a static flag — not recomputed.

## Candidate set

| Candidate | id | Type | Approved | Selector-eligible |
| --- | --- | --- | --- | --- |
| Jito · JitoSOL | `jito` | liquid_staking_token | yes (selected) | yes (data-ready gate) |
| Jupiter · JupSOL | `jupiter` | liquid_staking_token | yes | yes |
| Marinade · mSOL | `marinade` | liquid_staking_token | yes | yes |
| BlazeStake · bSOL | `blazestake` | liquid_staking_token | yes | yes |
| Jupiter Native Stake | `jupiter_native_stake` | native_staking | yes (baseline) | yes |
| Sanctum · INF | `sanctum` | liquid_staking_token | **no (blocked 6.95)** | **never** — monitored only |

INF is refreshed for monitoring but stays `approvedForReadOnlyReview: false`,
`blockedByRiskApproval: true`, `eligibleForFutureComparison: false` unless separately re-approved.

## Exact source responsibility per candidate

- **JitoSOL / JupSOL / mSOL / bSOL / INF** → **DefiLlama public yields feed**
  `GET https://yields.llama.fi/pools`, matched by the EXACT stored pool UUID (verified in
  `protocolSolLiquidStakingRealValueConfirmations.ts` / `protocolDataAdapters.defillama.ts`):
  - jito `0e7d0722-9054-4907-8593-567b353c0900`
  - jupiter `52bd72a7-9e81-4112-abb4-71673e8de9bf`
  - marinade `b3f93865-5ec8-4662-90a0-11808e0aa2bd`
  - blazestake `387d6732-59f0-4ae0-8a88-aba75a5cbe4a`
  - sanctum `3075a746-bdd1-4aac-bcd5-b035abee2622`

  Fields: `apy` → current APY, `apyMean30d` → 30-day APY, `tvlUsd` → TVL. The parser matches
  ONLY that pool id, requires `chain === "Solana"` (when present), can require `project` (only
  when a descriptor sets it), and requires finite non-negative values. It never falls back to
  another pool.
- **Jupiter Native Stake** → reuses the Step 14T native pipeline (no duplication):
  - **Stakewiz** `GET https://api.stakewiz.com/validator/{vote}` → delegated stake, current APY,
    commission, delinquency, epoch (`parseStakewizValidatorSummary`).
  - **Marinade validators API** → trailing-30-day APY via the exact 14T duration-weighted method
    (`parseJupiterValidatorHistoryFromMarinade` + `buildJupiterNativeStakeMarketPackage`).
  Required live fields: `delegatedStakeSol`, `currentApyPct`, `apy30dPct`,
  `validatorCommissionPct`, `validatorDelinquent`, `sourceEpoch`. Exact Jupiter vote account
  required; a delinquent validator or stale/insufficient history makes it ineligible (without
  revoking approval or mutating its risk score).

**No source requires an API key, paid subscription, VITE secret, or browser credentials.** The
Step 14T-removed paid provider and Blockdaemon are explicitly denylisted.

## Field-level source attribution

Each `SolStakingMarketField` carries its own `sourceName`, `sourceUrl`, `fetchedAt`,
`sourceAsOf`, optional `sourceEpoch`, per-field `status`, and notes. For native staking the
current fields are attributed to Stakewiz and the 30-day APY to Marinade — sources are not
blurred.

## Freshness policy

`SOL_STAKING_MARKET_CACHE_SCHEMA_VERSION = "1.0.0"`,
`SOL_STAKING_CURRENT_MARKET_MAX_AGE_HOURS = 24`,
`SOL_STAKING_MARKET_REFRESH_INTERVAL_HOURS = 6`,
`SOL_STAKING_MARKET_HARD_STALE_HOURS = 24`. Marinade history uses a 96h latest-epoch window
(epoch cadence ~2 days). All fixture-sensitive functions take an explicit `checkedAt` — no
`Date.now()` inside pure logic.

Snapshot status: **complete** (all required fields valid + fresh), **partial** (some present,
≥1 required missing), **stale** (present but past max age), **invalid** (present but fails
validation), **missing** (none present), **source_error** (fetch failed / non-success).
`eligibleForFutureComparison` is DATA-READINESS ONLY (approved + complete + fresh + not
delinquent) and does **not** enable the selector.

## Last-known-good behavior

`mergeSolStakingMarketRefresh(previous, attempted, { checkedAt })`:
- A candidate that refreshed successfully uses the new snapshot.
- A candidate whose refresh **failed** (source_error / missing) keeps the **previous** snapshot
  as last-known-good, re-stamped for freshness at the new `checkedAt` — its original `fetchedAt`
  and values are unchanged, and data older than 24h becomes `stale` (never re-labelled fresh).
- A failed refresh never overwrites a valid previous snapshot with empty values; every failure
  is recorded in `failedCandidateIds` + notes. Stale last-known-good values are ineligible.

`validateSolStakingMarketCache` fails closed on a missing/mismatched schema version or malformed
shape, and ignores unknown candidate IDs (they never enter the canonical set). Candidate order
is always canonical. `listFreshApprovedMarketSnapshots` filters approved + complete + fresh in
canonical order and **never sorts by performance, ranks, or chooses a winner**.

## Refresh script + atomic writes

`npm run market:refresh-staking` runs `scripts/refresh-sol-staking-market-data.mjs`
(server-side/local Node only — no browser runtime, no API keys, no secrets; it refuses to run if
a forbidden secret env var is present). It bundles the REAL builders with esbuild (no logic
duplication), fetches each public endpoint independently with a per-request timeout, handles
non-200 and invalid JSON, merges over the previous last-known-good cache, and **atomically**
writes `tmp/sol-staking-market-data-cache.json` (temp file → validate serialized JSON → rename;
a corrupt final file is never left behind). Output is sanitized (source summaries, not full raw
payloads). `checkedAt` is captured after the fetches so freshly-fetched data never reads as
stale. It exits `0` when ≥1 candidate refresh succeeds and output validates, non-zero otherwise.
`tmp/` is git-ignored — the cache is not committed.

## What this step does NOT do

No selector, no ranking, no winner, no JitoSOL replacement, no Top Pick / ordering change, no
risk-score change, no approval re-computation, no wallet-reading change, no browser provider
calls, and no transaction/signature/staking/delegation/withdrawal/execution path. Every snapshot
pins `selectedByProtocolLogic`, `currentWinner`, `updatesLiveRecommendations`,
`transactionsEnabled`, `walletSignatureRequired` to `false`. No product-facing UI changed.

## Production architecture (recommended)

Public protocol/analytics sources → WealthSmith scheduled **server-side** refresh job (every 6h)
→ source-specific parsing → schema validation → normalized cache (retain last-known-good) →
freshness gate → **Step 14V candidate normalization** → **Step 14W deterministic selector** →
frontend. Serve only validated cache; mark values stale after 24h; alert on repeated source
failures; **never** make one external API request per browser user.
