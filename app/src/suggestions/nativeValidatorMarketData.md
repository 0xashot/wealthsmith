# Native Validator Market-Data Adapter — Jupiter Native Stake (Step 14Q)

**A market-data ADAPTER (parsers + builder + evidence-conversion bridge)** for the Native
SOL / Jupiter Native Stake baseline. Backed by `nativeValidatorMarketData.ts`. It is the
plumbing that can, later, supply the three market fields (`delegated_stake_or_tvl`,
`current_apy`, `apy_30d`) that leave the native-staking baseline **blocked** in 14P.

## Purpose

Answer: *"can WealthSmith fetch validator-specific market data for Jupiter Native Stake
without confusing it with JupSOL or inventing APY?"* — yes, via a deterministic,
fixture-driven adapter that keeps the native-vs-JupSOL distinction and never invents values.

## Option C — hybrid source model

- **Solana RPC `getVoteAccounts` = source of truth** for the validator's **activated
  (delegated) stake** and **commission** (`NATIVE_VALIDATOR_MARKET_DATA_USES_RPC_FOR_STAKE`).
- **Validator analytics provider = source for APY** (current + 30-day history):
  primary **Stakewiz**, fallback **Solana Compass**, optional **Validators.app** (only if a
  token is available) (`NATIVE_VALIDATOR_MARKET_DATA_USES_ANALYTICS_FOR_APY`).

Target validator: vote account `CatzoSMUkTRidT5DwBxAC2pEtnwMBTpkCepHkFgZDiqb`
(`JUPITER_NATIVE_STAKE_VOTE_ACCOUNT`), `protocolId "jupiter_native_stake"`, `assetSymbol
"SOL"`, `candidateType "native_staking"`.

## Why JupSOL APY/TVL must NOT be reused (native-vs-JupSOL)

JupSOL is an **SPL LST token** (detected via a token mint; its DeFiLlama pool has its own TVL
and APY). Native staking is a **native Solana stake account** (delegated SOL; detected via
stake accounts; **no SPL mint**). They delegate to the same Jupiter validator but are
different instruments. Reusing JupSOL's APY/TVL for the native baseline would misrepresent it,
so the adapter hard-codes `NATIVE_VALIDATOR_MARKET_DATA_USES_JUPSOL_APY = false` and
`..._USES_JUPSOL_TVL = false`, and every `NativeValidatorMarketData` keeps
`isLiquidStakingToken: false` and `splTokenMint: null`.

## Parsers

- **`parseJupiterNativeStakeVoteAccountFromGetVoteAccounts(response, options?)`** — finds the
  vote account in `result.current` / `result.delinquent`, converts `activatedStake` lamports →
  SOL, reads the integer `commission` as a percent, and flags `vote_account_not_found` or
  `validator_delinquent`. It never computes APY.
- **`parseNativeValidatorApyFromAnalytics(provider, payload, options?)`** — defensive,
  provider-agnostic. Finds the validator by vote key across common envelope shapes (`[...]`,
  `{validators:[...]}`, `{data:[...]}`, or a single object; vote key from
  `vote_identity`/`voteAccount`/`vote_account`/`account`/`votePubkey`), reads current APY
  (`apy_estimate`/`apy`/`current_apy`), and computes the **30-day mean deterministically** from
  the last up-to-30 history values (`apy_history`/`apyHistory`/`history`). It **fails safely**:
  a **network-wide-only** payload is recognized but **not used** to unblock the candidate; an
  unrecognized schema returns `source_schema_unrecognized`; missing history leaves `apy30dPct`
  missing. It never invents APY.

## Builder — `buildNativeValidatorMarketData(input)`

Combines RPC stake/commission with analytics APY. `delegatedStakeUsd = activatedStakeSol *
solPriceUsd` **only** when both are present. Status:

- **complete** — `activatedStakeSol`, `commissionPct`, `currentApyPct`, `apy30dPct` all present
  and fresh.
- **partial** — some present, not all. **missing** — none. **stale** — `fetchedAt` older than
  24h (`NATIVE_VALIDATOR_MARKET_DATA_MAX_AGE_HOURS`).

Blockers: `vote_account_not_found`, `validator_delinquent`, `missing_current_apy`,
`missing_apy_30d`, `missing_activated_stake`, `missing_commission`,
`analytics_source_unavailable`, `source_schema_unrecognized`, `stale_market_data`. Every
record keeps `updatesLiveRecommendations` / `enablesSelectorComparison` / `transactionsEnabled`
/ `walletSignatureRequired` **false**.

## Fetcher shell (NOT wired into runtime)

`fetchNativeValidatorMarketData(deps, options?)` is a documented adapter **contract** for a
later **backend/job** — a caller injects `rpcGetVoteAccounts`, `fetchAnalytics`, and an
optional `getSolPriceUsd`. It is **not called from the app/UI** (the project has no approved
production fetch pattern for this), adds **no secrets**, and does **not require a
Validators.app token**. Live fetching stays out of the UI; the parsers/builder are the tested
surface.

## Evidence bridge — `convertNativeValidatorMarketDataToEvidenceInputs(marketData, options?)`

Converts **complete, fresh** market data into the 3 missing native evidence inputs
(`delegated_stake_or_tvl` — USD if a SOL price was supplied, else SOL; `current_apy`;
`apy_30d`), each with `value` + `unit` + `sourceName` + `sourceUrl` + `confirmedAt` +
`confirmedBy` + `reviewerRole` + `notes`. For **partial/stale/missing** data it returns **no**
inputs and explains the blockers. It **never mutates** `NATIVE_SOL_STAKE_EVIDENCE_INPUTS` (a
later step must explicitly append the returned inputs) and **never approves** native staking.

## Freshness

24h window on `fetchedAt` (checked against `checkedAt`); beyond it the market data is `stale`
and the conversion refuses to produce evidence.

## Scope / safeguards

Adapter only: it does **not** approve native staking, assign a risk score, enable the selector
comparison, replace JitoSOL, update live recommendations, or add any
staking/delegation/withdrawal/signature/transaction handler. In 14Q the native evidence array
is **not** filled, so the baseline stays **blocked** and no product-facing UI changes.

## Next step

Either (a) a backend/job calls the real endpoints (Solana RPC `getVoteAccounts`, Stakewiz
validators endpoint, Solana Compass API), feeds the raw payloads through the builder, and — if
`status === "complete"` — appends the converted inputs to complete the native evidence
(unblocking the deterministic score → approval → UI-exposure path); or (b) proceed to a live
market-data refresh layer for the already-approved LST candidates.

## Marinade + Stakewiz providers (Step 14T)

The `NativeValidatorApyProvider` union is `stakewiz | solana_compass | validators_app |
marinade`. This module adds `parseStakewizValidatorSummary` (current stake / APY / commission /
delinquency / epoch), and the `NativeValidatorMarketData` type carries `currentApySource` and
`apy30dSource` so a package can source current data from Stakewiz and 30-day history from
Marinade. `convertNativeValidatorMarketDataToEvidenceInputs` attributes each of the three
records to its correct per-field source. The Marinade validator-history parser and the
Stakewiz+Marinade combine builder live in
[nativeValidatorMarinadeData.md](./nativeValidatorMarinadeData.md).
