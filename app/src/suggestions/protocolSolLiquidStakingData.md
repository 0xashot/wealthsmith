# SOL Liquid-Staking Data Mapping (Step 12J)

**Mapping only. Production selection remains disabled.** This documents the
verified real-data sources for the SOL liquid-staking candidates and an internal
dry-run. It does not fetch live data here, does not select a protocol, and does
not change live suggestions or the UI. `SOL_LIQUID_STAKING_SELECTION_ENABLED =
false`, `PROTOCOL_SELECTION_IMPLEMENTED = false`. Mapped ≠ selection-enabled.

## Candidates + exact mint mappings

All mints are copied verbatim from existing app source (never inferred from
names). See `protocolSolLiquidStakingData.ts`.

| Candidate | LST | Exact mint | Source of mint |
| --- | --- | --- | --- |
| jupiter | JupSOL | `jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v` | TOKEN_REGISTRY |
| marinade | mSOL | `mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So` | TOKEN_REGISTRY / lstApy.ts |
| jito | JitoSOL | `J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn` | TOKEN_REGISTRY |
| blazestake | bSOL | `bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1` | TOKEN_REGISTRY |
| sanctum | INF | `5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm` | lstApy.ts (INF_MINT) |

## Source status per field

| Candidate | APY source | TVL source | Withdrawal | Fees | Risk |
| --- | --- | --- | --- | --- | --- |
| jupiter | on-chain SPL stake pool (`fetchLstApys`) | **missing** | missing | missing | missing |
| marinade | Marinade API (`fetchMarinadeMsolApy`) | **missing** | missing | missing | missing |
| jito | on-chain SPL stake pool | **missing** | missing | missing | missing |
| blazestake | on-chain SPL stake pool | **missing** | missing | missing | missing |
| sanctum | DefiLlama (INF pool) | DefiLlama pool `3075a746-…` (verified) | missing | missing | missing |

- **APY: mapped** to existing real helpers for all five (values are fetched by a
  caller and injected — never fabricated here).
- **TVL: mapped for sanctum only** via a verified DefiLlama pool UUID (added to
  `DEFILLAMA_POOL_MAPPINGS`, verified from `lstApy.ts`). The other four have **no
  verified DefiLlama pool UUID in the codebase** — TVL remains `missing` and no
  pool ID was guessed.
- **Withdrawal / fees: missing.** LST unstake timing and fees are not precisely
  documented in the codebase; they are left absent (never assumed instant/zero).
  Note: acquiring an LST through a swap route is separate from protocol
  withdrawal behavior.
- **Risk / audit: missing.** `riskScore` stays absent (no approved methodology);
  `auditStatus` stays `unknown`; `safetyBufferEligible` absent.

## Internal dry-run

`runSolLiquidStakingInternalDryRun()` builds a `ProtocolSelectionInput` from the
mapping (real values via injection, else `missing`), runs eligibility + the
QA-only pipeline, and reports per-candidate data availability. It never mutates
live `ProtocolSelection`, never writes to cards/modal, and never changes live
suggestions.

**Current dry-run result:** `insufficient_data` — with no injected data, every
candidate lacks APY/TVL/riskScore/withdrawal, so none is eligible. This is
correct and expected.

## Remaining blockers (before this narrow case could advance)

- real APY values fetched + injected (helpers exist; not called here);
- verified DefiLlama TVL pool UUIDs for JupSOL/mSOL/bSOL/JitoSOL;
- a documented `riskScore` methodology + curated scores;
- sourced withdrawal-behavior and fee data;
- an internal real-data dry-run (Stage 2) behind `PROTOCOL_SELECTION_ALLOW_LIVE_DATA`.

Until then, production selection stays disabled and no user-facing recommendation
exists.
