# Native SOL / Jupiter Native Stake — Baseline Evidence Model (Step 14P)

**A separate evidence model for the Native SOL / Jupiter Native Stake BASELINE candidate.**
Backed by `solNativeStakingBaselineEvidence.ts`. This is deliberately **not** the LST
evidence model — native staking is a native Solana **stake account** (delegated SOL), not an
SPL liquid-staking token, and must never be confused with JupSOL.

It answers: *"can WealthSmith compare liquid-staking options against a native SOL staking
baseline later, without confusing native stake accounts with LST tokens?"*

## Identity (NOT an LST, NOT JupSOL)

`NATIVE_STAKING_BASELINE_IDENTITY`: `protocolId "jupiter_native_stake"`, `protocolName
"Jupiter Native Stake"`, `assetSymbol "SOL"`, `candidateType "native_staking"`,
`isLiquidStakingToken: false`, `splTokenMint: null`.

Flags: `SOL_NATIVE_STAKING_BASELINE_EVIDENCE_EXISTS = true`,
`SOL_NATIVE_STAKING_BASELINE_IS_LST = false`;
`..._ENABLES_SELECTOR_COMPARISON`, `..._UPDATES_LIVE_RECOMMENDATIONS`,
`..._ENABLES_TRANSACTIONS`, `..._REQUIRES_WALLET_SIGNATURE` all `false`.

## Detection clarification — native stake vs JupSOL

| | **Native SOL staking (this module)** | **JupSOL (the LST)** |
| --- | --- | --- |
| What it is | native Solana **stake account** of delegated SOL | **SPL token** (reward-bearing liquid token) |
| Detected via | Solana **stake accounts** | an **SPL token mint** |
| Token mint | **none** (`splTokenMint: null`) | a specific SPL mint |
| Liquidity | **not liquid** by default (epoch-based exit) | liquid; instant-swap exit |
| DeFi composability | **lower** (native stake; usable as Jupiter Lend collateral) | high; broad DeFi use |
| Classification | should appear under **Staked Assets** | Liquid/Staked Assets depending on classification |

**Do not confuse the two.** Native staking is the validator-delegation baseline; JupSOL is a
liquid staking token that delegates to the same Jupiter validator but wraps it in an SPL
token. They are separate candidates with separate evidence.

## Evidence categories (10)

- **Market/adoption:** `delegated_stake_or_tvl`, `current_apy`, `apy_30d` (numeric).
- **Mechanics/fees:** `withdrawal_mechanics` (text), `unstake_time` (DUAL-format: numeric
  hours OR sourced epoch text), `validator_commission` (numeric), `annual_management_fee`
  (numeric).
- **Evidence/risk:** `security_model`, `operational_risk`, `incident_review` (text).

Each accepted record requires `value` + `unit` + `sourceName` + `sourceUrl` + `confirmedAt` +
`confirmedBy` + `reviewerRole` + `notes`, and must be within the 24h freshness window. Text
timing is allowed for epoch-based unstake (no fixed hours are invented); empty text and
type-mismatched values are rejected.

## Current state — INCOMPLETE (7 / 10), baseline BLOCKED at the evidence gate

Founder-authorized public-source collection (2026-07-14) recorded **7** categories from
authoritative Jupiter docs (FAQ) + the Solana native-staking model:

| Category | Value | Source |
| --- | --- | --- |
| withdrawal_mechanics | native stake account; deactivate → withdraw at epoch end; non-custodial | Jupiter FAQ |
| unstake_time | epoch-based text (~2 days / end of epoch; no rewards during deactivation) | Jupiter FAQ |
| validator_commission | **5%** on inflation rewards (0% MEV) | Jupiter FAQ |
| annual_management_fee | **0%** (you own the stake account; no pool/management fee) | Jupiter FAQ |
| security_model | non-custodial; native stake account (NOT an SPL LST token like JupSOL); base Solana stake program | Jupiter FAQ |
| operational_risk | single-validator delegation, epoch lockup, lower composability, not an LST | Jupiter FAQ / Solana |
| incident_review | point-in-time; base staking program, no slashing; not a clean-history claim | Jupiter / Solana |

The **three market categories** (`delegated_stake_or_tvl`, `current_apy`, `apy_30d`) are
**MISSING**: Jupiter's docs do not publish an exact native-staking APY / 30-day APY /
delegated stake, and the validator stats page is JS-rendered (not reliably verifiable via
fetch). Per the spec they were left **missing** rather than invented or **reused from
JupSOL** — so `marketDataComplete` is false and `readyForRiskGate` is false.

**Note on a resolved source conflict:** a public search snippet claimed the Jupiter validator
has "0% commission"; the authoritative Jupiter FAQ (5% on inflation rewards, 0% MEV) resolves
that conflict, and the FAQ value is what is recorded.

## Summary helper

`summarizeNativeSolStakeEvidence({ checkedAt })` returns
`{ marketDataComplete, mechanicsComplete, evidenceComplete, allEvidenceFresh,
readyForRiskGate, missingCategories, blockers, … }`. In 14P: `mechanicsComplete: true`,
`evidenceComplete: true`, `marketDataComplete: false`, `readyForRiskGate: false`, blockers
`market_data_incomplete` + `missing_categories`.

## Consequence

Because evidence is incomplete: **no** risk score is assigned, the baseline is **not**
approved, and it is **not** surfaced in Real Wallet / Demo / the approved review section. Its
only UI presence is a clearly-labelled internal `/testing` BLOCKED evidence card. It is never
selected, never the winner, and has no transaction/signature/stake/delegate/withdraw path.

## How the baseline completes later

A later step that records the three missing market categories (an authoritative Jupiter
native-staking APY / 30-day APY / delegated stake) would flip `readyForRiskGate` to true,
enabling the deterministic risk score → approval → UI-exposure path.

## Market-data adapter (Step 14Q)

The bridge for those three missing categories is the **native validator market-data adapter**,
[nativeValidatorMarketData.md](./nativeValidatorMarketData.md) — a hybrid of Solana RPC
`getVoteAccounts` (delegated stake + commission, source of truth) and a validator analytics
provider (Stakewiz → Solana Compass → Validators.app) for current + 30-day APY. Its
`convertNativeValidatorMarketDataToEvidenceInputs()` produces exactly the three missing native
evidence inputs **when the market data is complete and fresh** — but 14Q only builds the
adapter (parsers/builder/bridge + fixtures) and does **not** fill this evidence array, so the
baseline stays blocked. It never reuses JupSOL APY/TVL, never uses a network-wide APY, and
never approves native staking.
