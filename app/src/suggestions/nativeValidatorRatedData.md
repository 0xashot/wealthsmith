# Rated 30-day Delegator APY — Jupiter Native Stake (Step 14S)

**Combines validator-specific market data into a COMPLETE native-staking package**, using
**Rated** for the one field 14R couldn't source: the validator-specific **30-day delegator
APY**. Backed by `nativeValidatorRatedData.ts` (+ the Rated parser in
`nativeValidatorMarketData.ts`).

## Outcome in 14S: parser + script + fixtures shipped; native staking STILL BLOCKED

`RATED_API_KEY` was **not available** in this environment, so no real Rated value was
fetched. Per the guardrails, nothing was invented — the native evidence array is unchanged
(**7/10**), so the baseline **stays blocked** (no score, no approval, no product-facing UI).
This step delivers the Rated **parser**, the server-side **fetch script**, the **combine
builder**, and **fixtures**; a run with the secret configured completes the package.

## Sources (hybrid, validator-specific)

- **Stakewiz** (`api.stakewiz.com/validator/{vote}`) → activated (delegated) stake,
  commission, **current APY** (the 14R real source).
- **Rated** single-validator summary → **30-day delegator APY** (window=30d):

  ```
  GET https://api.rated.network/v1/solana/validators/CatzoSMUkTRidT5DwBxAC2pEtnwMBTpkCepHkFgZDiqb/summary?window=30d
  Authorization: Bearer $RATED_API_KEY
  ```

## Rated parser — `parseNativeValidatorApyFromRatedSummary(payload, options?)`

Validator-specific and defensive:

- requires an **exact vote-account match** and `timeWindow === "30d"`;
- reads **`delegatorApy`** (net of commission) — **never** substitutes `validatorApy`;
- converts Rated decimal **ratios → percentages** (`0.0523 → 5.23%`) deterministically;
- extracts `validatorApy`, `voteCommissionRate`, `mevCommissionRate`, `totalStake`,
  `effectiveness`, `stakeAccountCount` when present;
- **rejects** a network-overview payload / mismatched validator or window / missing or
  invalid delegator APY. Blockers: `rated_payload_invalid`, `rated_vote_account_mismatch`,
  `rated_window_mismatch`, `rated_delegator_apy_missing`, `rated_delegator_apy_invalid`,
  `rated_total_stake_invalid`, `rated_schema_unrecognized`.

## Combine builder — `buildJupiterNativeStakeMarketPackage(input)`

Combines a fresh **Stakewiz** snapshot (stake, commission, current APY) with **Rated**'s
fresh 30-day delegator APY:

- `status: "complete"` only when both sources are valid **and fresh** (24h). If **Stakewiz is
  stale**, fresh Rated data is **not** combined with it → `stale`.
- Sets `stakeSource: "stakewiz"`, `currentApySource: "stakewiz"`, `apy30dSource: "rated"`.
- **Cross-checks** Rated `totalStake` vs Stakewiz `activated_stake` — records both + the % diff
  in notes, and flags a meaningful discrepancy for review; it never silently overwrites one
  with the other, and it does not block on small timing/methodology differences.

`convertNativeValidatorMarketDataToEvidenceInputs()` then produces the 3 native evidence
inputs with **per-field source attribution** — `delegated_stake_or_tvl` + `current_apy` →
Stakewiz, `apy_30d` → Rated (noted as "30-day delegator APY, net of validator commission").

## Server-side fetch script — `scripts/fetch-rated-jupiter-native-stake.mjs`

Run with `RATED_API_KEY=<secret> npm run native:fetch-rated`.

- **Secret handling:** reads the key **only** from `process.env.RATED_API_KEY` (never
  `VITE_RATED_API_KEY`); never hardcoded, never logged, never written to disk.
- **Server-side only:** not part of the frontend build, never imported by browser code, no
  source-file mutation.
- **Robust:** handles 401/403, 404, 429, 5xx, invalid JSON, and timeout with clear exit codes;
  exits safely with a clear message when the key is missing.
- **Sanitized output:** writes only the whitelisted fields (`voteAccount`, `timeWindow`,
  `delegatorApy`, `validatorApy`, `voteCommissionRate`, `mevCommissionRate`, `totalStake`,
  `effectiveness`, `stakeAccountCount`, `fetchedAt`) to `tmp/rated-jupiter-native-stake.json`
  (git-ignored).

## Native-vs-JupSOL / network-wide safeguards

Validator-specific only: `isLiquidStakingToken: false`, `splTokenMint: null`, `assetSymbol
"SOL"`; uses `delegatorApy` not `validatorApy`; never reuses JupSOL APY/TVL; never uses a
network-wide APY (a network-overview Rated payload is rejected). It never approves, selects,
updates live recommendations, or enables any transaction/signature path.

## Next step

Configure `RATED_API_KEY` locally and run `npm run native:fetch-rated` → feed the sanitized
Rated payload (with a fresh Stakewiz snapshot) through `buildJupiterNativeStakeMarketPackage`
→ if `status === "complete"`, append the 3 converted records to
`NATIVE_SOL_STAKE_EVIDENCE_INPUTS`. That flips `readyForRiskGate` to true and unblocks the
deterministic **score → approval (if ≥ 7) → "Baseline to review" UI** for Jupiter Native Stake.
