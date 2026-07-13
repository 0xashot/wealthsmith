# Staged SOL LST Candidate — Source/Value Confirmation (Step 14B)

**Records and freshness-checks source values for the staged SOL liquid-staking
candidates (mSOL / JupSOL / bSOL / INF)**, so they can move from `needs_review` toward
`verified` market/mechanics data. Backed by
`solLiquidStakingSourceValueConfirmation.ts`.

It answers: *"what verified values do we have for each staged SOL LST candidate, and what
is still missing before risk scoring?"*

## This changes nothing live

Source/value confirmation only. It does **not** approve candidates, assign risk scores,
enable multi-protocol selection, update live recommendations, replace Jito as the
selected protocol, or add a transaction/signature path. It does not change Demo Mode or
`/testing`. The module is not imported by `stakingSuggestion` or any live/UI file —
only by docs and fixtures. **JitoSOL remains the only real-wallet selected SOL LST
protocol.**

Flags: `SOL_LST_SOURCE_VALUE_CONFIRMATION_EXISTS = true`;
`..._UPDATES_LIVE_RECOMMENDATIONS`, `..._APPROVES_CANDIDATES`, `..._ASSIGNS_RISK_SCORES`,
`..._ENABLES_MULTI_PROTOCOL_SELECTION`, `..._ENABLES_TRANSACTIONS`,
`..._REQUIRES_WALLET_SIGNATURE` all `false`.

## Staged candidates covered

Marinade · mSOL, Jupiter · JupSOL, BlazeStake · bSOL, Sanctum · INF.

## Value freshness rule: 24 hours

`SOL_LST_CONFIRMED_VALUE_MAX_AGE_HOURS = 24`. A time-sensitive market value is
**`verified`** only when the evaluation time (`checkedAt`) is within 24h of its
`confirmedAt`; otherwise it is **`stale`**. Freshness is *derived*, never assumed — old
values are never silently promoted to verified.

## Prior values and stale behavior

Reviewer-confirmed (non-production) DefiLlama values from the 12V ledger, recorded with
their original `confirmedAt` of **2026-07-12T00:00:00Z** (reviewer: founder):

| LST | TVL (USD) | Current APY | 30-day APY |
| --- | --- | --- | --- |
| JupSOL | 409,170,000 | 5.67% | 5.60% |
| mSOL | 184,840,000 | 4.75% | 5.87% |
| bSOL | 69,750,000 | 5.27% | 5.32% |

These are `verified` only when `checkedAt` is within 24h of 2026-07-12T00:00:00Z, and
`stale` beyond it. As of the current implementation date they are **stale** and must be
re-confirmed before use.

## INF missing values

Sanctum · INF has **no** confirmed market value in the prior ledger; its TVL / current
APY / 30-day APY are `missing` and **none is invented**.

## Categories still required before risk scoring

For every staged candidate, `readyForRiskScoring` is true only when market **and**
mechanics **and** evidence are all `verified`. Today none are:

- **Market** (`tvl`, `current_apy`, `apy_30d`): stale (mSOL/JupSOL/bSOL) or missing (INF).
- **Mechanics** (`withdrawal_mechanics`, `direct_unstake_time`, `direct_unstake_fee`,
  `annual_management_fee`): `needs_review` — no freshly confirmed value.
- **Evidence** (`audit_security`, `operational_risk`, `incident_review`): `needs_review`.

Each summary carries blockers such as `stale_market_data` / `missing_market_data`,
`mechanics_review_required`, `evidence_review_required`, and `approved_risk_score_missing`.

## Helpers

- `getSolLstStagedCandidateValueConfirmations({ checkedAt?, includeStaleValues? })` —
  every confirmation for the four staged candidates at `checkedAt`.
- `summarizeSolLstCandidateValueConfirmations({ checkedAt? })` — per-candidate market /
  mechanics / evidence status, missing/stale categories, blockers, `readyForRiskScoring`.
- `buildSolLstCandidateRegistryWithConfirmedValues({ checkedAt? })` — a **non-live**
  preview pairing each staged candidate with its confirmation summary; it never mutates
  the registry, approves/selects candidates, or assigns scores.

## No approval / no selector / no live recommendation changes

No candidate becomes approved; the registry stays as in 14A (staged / pending_review, no
risk score). Nothing here selects a protocol or updates any live recommendation.

## Next steps

- **14C** — risk evidence / risk-score assignment for candidates with verified values.
- **14D** — selector comparison, only after more than one candidate is approved for
  read-only recommendation.
