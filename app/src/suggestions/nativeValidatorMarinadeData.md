# Marinade Validator History + Stakewiz — Jupiter Native Stake (Step 14T)

**Validator-specific historical APY for the Jupiter native validator, from Marinade's public
validators API**, plus the combine builder that fuses it with the fresh Stakewiz snapshot into
a complete native-staking market package. Backed by `nativeValidatorMarinadeData.ts`.

## Purpose

Complete the three market fields that left Jupiter Native Stake blocked, using **public,
no-API-key** validator data — without confusing it with JupSOL, mSOL, or network-wide data.

## Verified endpoints (2026-07-14, no authentication)

- **Stakewiz** — `GET https://api.stakewiz.com/validator/{voteAccount}` → current
  `activated_stake` (SOL), `commission` (hundredths, e.g. 500 → 5%), `apy_estimate`, `identity`,
  `delinquent`, `epoch`.
- **Marinade validators API** —
  `GET https://validators-api.marinade.finance/validators?limit=1&query_vote_accounts={voteAccount}&epochs=18`
  → `{ validators: [ { vote_account, identity, info_name, avg_apy, epochs_count, epoch_stats: [
  { epoch, apy, apr, activated_stake, commission_effective, epoch_start_at, epoch_end_at } … ] } ] }`.
  Both are public GETs; **no key, no token, no plan gate.**

## Marinade schema + metric definition

`epoch_stats[].apy` is the **per-epoch validator APY, delegator-facing (net of commission)**, a
decimal ratio; the in-progress current epoch has `apy: null` and is **ignored**. Cross-checked
against Trillium (`api.trillium.so/validator_rewards/{vote}`): epoch 1000 = **5.2523% (Marinade)
vs 5.2462% (Trillium delegator_compound_total_apy)**. Stake cross-checks within 0.07% across
Stakewiz / Marinade / Trillium.

## 30-day methodology (`parseJupiterValidatorHistoryFromMarinade`)

**Duration-weighted 30-day average of Marinade completed per-epoch validator APY observations**
(delegator-facing, net of commission). It sorts + de-dupes observations by epoch, ignores the
in-progress epoch, selects completed epochs whose `epoch_end_at` falls in the trailing 30-day
window, and weights each by epoch duration. This is a **30-day average of per-epoch realized
APY**, explicitly **not** described as a single "realized 30-day yield". For Jupiter: **5.40%**
over completed epochs 986–1000, coverage **30.13 days** (2026-06-12 → 2026-07-12).

## Responsibilities

- **Stakewiz** → `delegated_stake_or_tvl`, `current_apy`, commission, delinquency, epoch.
- **Marinade** → `apy_30d` (30-day history) only.

## Freshness + coverage rules

- Stakewiz snapshot must be within 24h; **stale Stakewiz is never combined with fresh
  Marinade** (`status: "stale"`).
- Marinade history: coverage must reach **≥ 28 days** into the trailing-30-day window, with
  ≥ 5 in-window epochs; the latest completed epoch must end within **96h** of `checkedAt`
  (epoch cadence ~2 days), else `marinade_data_stale`.

## Source-disagreement behavior

The combine builder cross-checks Marinade's latest stake/commission against Stakewiz, records
both and the % difference in notes, and **never silently overwrites** the primary Stakewiz
values. Small timing/provider differences do not block; a **material** stake discrepancy
(> 5%) or a commission mismatch (> 1pp) raises a review blocker.

## Blockers

`marinade_payload_invalid`, `marinade_schema_unrecognized`, `marinade_vote_account_mismatch`,
`marinade_history_missing`, `marinade_history_insufficient`, `marinade_apy_invalid`,
`marinade_timestamps_missing`, `marinade_coverage_insufficient`, `marinade_data_stale`,
`marinade_msol_data_rejected`, `marinade_network_data_rejected`.

## No mSOL / JupSOL / network-wide substitution

Flags: `NATIVE_VALIDATOR_MARINADE_USES_MSOL_APY = false`, `..._USES_JUPSOL_APY = false`,
`..._USES_NETWORK_APY = false`. The parser **rejects** the mSOL `/msol/apy` series shape
(`marinade_msol_data_rejected`), network aggregates (`marinade_network_data_rejected`), and any
other validator (`marinade_vote_account_mismatch`). It requires the exact Jupiter vote account
(`CatzoSMUk…`) and cross-checks the identity (`JUPiTERr…`). The forbidden endpoint
`api.marinade.finance/msol/apy` is documented as never used.

## Fail-closed + scope

`buildJupiterNativeStakeMarketPackage` yields `complete` only when both sources are valid and
fresh, the validator is not delinquent, all current fields exist, and the 30-day history passes
coverage + freshness. It performs no network I/O (parsers only), no selector comparison, no
live-recommendation update, and no transaction/signature path;
`NATIVE_VALIDATOR_MARINADE_ENABLES_SELECTOR` / `..._ENABLES_TRANSACTIONS` /
`..._REQUIRES_SIGNATURE` are all `false`.

## Production architecture (recommended, not built here)

Stakewiz + Marinade public validator APIs → a **WealthSmith server-side refresh job** (current
Stakewiz data every 6–12h; Marinade history once per epoch or every 6–12h) → schema validation
→ normalized cache/history (keep WealthSmith's own successful snapshots as backup) → selector
data layer → frontend. **Fail closed** on stale/malformed data; store successful snapshots;
**never** fetch separately for every browser user. Do not build a large custom public API.

## Next step

The three market records are now appended to `NATIVE_SOL_STAKE_EVIDENCE_INPUTS`, so Jupiter
Native Stake is complete (10/10), scored (7.10), approved, and surfaced as a "Baseline to
review". The natural next step is the long-deferred deterministic multi-candidate selector
comparison across JitoSOL + the approved review candidates (mSOL/JupSOL/bSOL) + this native
baseline.
