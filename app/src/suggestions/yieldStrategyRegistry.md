# Yield Strategy Registry (Step 16B, USDC MVP)

The deterministic, versioned catalog of EXACT Yield Strategy products. It answers **"what products
exist?"** — never "which is better?". No comparison, scoring, ranking, APY/TVL, wallet/protocol
detection, plan/suggestion, UI, `/testing`, or execution (those are Steps 16C–16H).

Backed by:
- [`yieldStrategyRegistryTypes.ts`](./yieldStrategyRegistryTypes.ts) — versions, lifecycle, the generic entry shape.
- [`yieldStrategyRegistry.ts`](./yieldStrategyRegistry.ts) — the entries + read-only accessors + validators.
- [`yieldStrategyRegistryDiagnostics.ts`](./yieldStrategyRegistryDiagnostics.ts) — inventory counts (no comparison).

## Generic architecture (not a USDC-only class)

This is a **Yield Strategy Registry**, not a `StableUsdcRegistry`. The schema supports future assets,
protocols, strategy types, and risk lanes without schema changes. The current MVP simply contains
`principalAsset = USDC` (no BTC/ETH/USDY entries).

Each entry is an EXACT product (one vault / one lending market / one liquidity strategy) — never a
bare protocol name. It reuses the Step 16A `StableYieldStrategyType` (`lending` / `managed_vault` /
`staking_like_vault` / `stable_liquidity_strategy` / `future_other`) and risk lanes (`buffer_eligible`
/ `excess_only` / `unsupported`) verbatim — nothing is redefined.

## Protocol scope

Only the documented WealthSmith universe: **Kamino · Raydium · Meteora · Hubble**. Save, Marginfi,
Drift, Loopscale, Solend, and any undocumented protocol are rejected by the validator.

## Registered products (all `documentation_required`)

| strategyId | product | protocol | type | lane / risk lane | official URL | address | lifecycle |
|---|---|---|---|---|---|---|---|
| `kamino_steakhouse_usdc` | Kamino Steakhouse USDC | kamino | managed_vault | excess / excess_only | app.kamino.finance | — | documentation_required |
| `kamino_usdc_lending` | Kamino USDC Lending | kamino | lending | buffer / buffer_eligible | app.kamino.finance | — | documentation_required |
| `raydium_stable_usdc_strategy` | Raydium Stable USDC Strategy | raydium | stable_liquidity_strategy | excess / excess_only | — | — | documentation_required |
| `meteora_stable_usdc_strategy` | Meteora Stable USDC Strategy | meteora | stable_liquidity_strategy | excess / excess_only | — | — | documentation_required |
| `hubble_usdc_strategy` | Hubble Stable USDC Strategy | hubble | lending | excess / excess_only | — | — | documentation_required |

**Addresses are never fabricated.** The repository documents no exact stable-yield vault/market
addresses: Kamino vault addresses are resolved via the Kamino SDK at runtime (only the vault NAME
"Steakhouse USDC" is documented, in `wallet/kaminoVaults.ts`); Raydium/Meteora are documented
candidates with no manage URL wired; Hubble is a USDH CDP, not a deploy-into USDC yield venue. So
every product carries `address: undefined` and lifecycle `documentation_required` until an exact
address + full documentation exists.

## Registry lifecycle

`approved` · `review` · `documentation_required` · `deprecated` · `disabled` · `future`. **Only
`approved` products may proceed to Step 16C** — `approved` is not "eligible", "recommended", or
"leader". An `approved` entry is validator-required to carry a documentation URL, an official URL, and
a supported asset. **No product is `approved` today** (none has a documented address).

## Validation (fails closed)

Rejects: duplicate strategy ids / addresses / documentation ids; unsupported or forbidden protocol
ids; unsupported strategy types / risk lanes / lanes; unknown lifecycle; missing schema or registry
version; an `approved` product without documentation / official URL / supported asset; and the buffer
lane assigned to a strategy type that is not intrinsically buffer-eligible (per 16A).

## Diagnostics

Inventory only: registered / approved / review / documentation_required / deprecated / future counts,
and counts per protocol / asset / strategy type / lane. **No comparison.**

## Feature flags

Enabled: `YIELD_STRATEGY_REGISTRY_EXISTS` (and `STABLE_YIELD_REGISTRY_EXISTS`). Disabled: market data,
wallet detection, comparison, plans, suggestions, UI, testing, execution. No transaction/signature
capability.

## Future roadmap

```
16A Policy
↓
16B Registry  (this step — knows WHAT products exist)
↓
16C Market data   (APY / TVL / liquidity — per approved product)
↓
16D Eligibility
↓
16E Comparison
↓
16F Existing positions
↓
16G Plan generator
↓
16H Product integration
```
