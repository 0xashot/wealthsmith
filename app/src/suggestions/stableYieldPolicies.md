# Stable USDC Yield Policies (Step 16A)

The deterministic, versioned POLICY foundation for the new **Stable USDC Yield** suggestion family.
16A defines policy only — it builds no registry, fetches no APY/TVL, detects no wallet/protocol
positions, computes no eligibility/comparison, generates no plan/suggestion, and adds no UI / Demo /
Real Wallet / `/testing` / execution (those are Steps 16B–16H).

Backed by:
- [`stableYieldPolicyTypes.ts`](./stableYieldPolicyTypes.ts) — versions, lanes, strategy taxonomy, risk lanes, suppression vocabulary, existing-position types.
- [`stableYieldPolicy.ts`](./stableYieldPolicy.ts) — the strategy catalog, the two lane policies, the protocol scope, the intended priority, and validators.
- [`stableYieldPolicyDiagnostics.ts`](./stableYieldPolicyDiagnostics.ts) — deterministic allowance/lane diagnostics (no recommendation).

## Purpose

Stable Yield is a **Capital Efficiency** intent: it improves returns on IDLE USDC and never
increases portfolio risk. It always preserves the Safety Buffer, determinism, and the read-only
architecture. The engine thinks in terms of a generic **yield strategy** — the specific product (not
the protocol) is the strategy.

## Two-lane architecture

Both lanes require a **complete** Safety Buffer before they may activate.

- **Lane 1 — Safety Buffer Yield** (`stable_buffer_yield_v1`): allow part of an already-complete
  Safety Buffer to earn yield while preserving the required reserve/coverage. Stable-USD only; no
  volatile, leveraged, or unsupported exposure; only conservative, immediately-liquid strategies.
- **Lane 2 — Excess USDC Yield** (`stable_excess_yield_v1`): deploy liquid USDC ABOVE the Safety
  Buffer into an approved stable strategy. The exact excess amount is determined later.

## Strategy taxonomy

Five deterministic strategy TYPES (no products/protocols assigned in 16A). Each documents its
principal asset, resulting exposure, withdrawal model, liquidity model, fee model, and risk profile:

| Type | Exposure | Withdrawal | Liquidity | Default lane |
|---|---|---|---|---|
| `lending` | stable_usd | immediate | liquid | **buffer_eligible** (both lanes) |
| `managed_vault` | stable_usd | requires_withdrawal | semi_liquid | excess_only |
| `staking_like_vault` | stable_usd | epoch_or_lockup | locked | excess_only |
| `stable_liquidity_strategy` | stable_lp | requires_withdrawal | semi_liquid | excess_only |
| `future_other` | unknown | unknown | unknown | unsupported (not approved) |

Only a `lending`-shaped strategy (conservative, immediately-liquid, stable-USD) may serve the buffer
lane; the validator enforces this. `future_other` carries no lanes and is never approved by 16A.

### Risk lanes

`buffer_eligible` · `excess_only` · `unsupported`. The registry (16B) later decides which specific
product belongs where.

## Supported protocol scope

Only the documented WealthSmith universe is in scope: **Kamino · Raydium · Meteora · Hubble**.
Forbidden / out of scope: Save · Marginfi · Drift · Loopscale (never introduced). No products are
assigned in 16A — this is identity scope only.

## Suppression rules (vocabulary only)

The policy defines the reasons Stable Yield may be suppressed; 16A implements NO checks:
`safety_buffer_incomplete`, `price_data_unavailable`, `protocol_data_unavailable`,
`risk_policy_unavailable`, `yield_strategy_not_approved`, `unknown_strategy`, `unknown_asset`,
`unknown_liquidity`, `unknown_withdrawal_behavior`, `no_eligible_capital`.

## Existing positions vs new deployment

Existing deployed positions remain visible; a Stable Yield suggestion is created only when
ADDITIONAL eligible USDC exists. Detection is not implemented in 16A.

## Priority (documented — engine ordering unchanged)

Intended order once integrated: **1 Safety Buffer · 2 Rebalance · 3 Stable Yield · 4
Contribution/DCA · 5 Trim · 6 Other optimization.** 16A does NOT change engine ordering — `topPick.ts`
`CATEGORY_PRIORITY` is untouched (Stable Yield maps to the existing Capital Efficiency tier). Stable
Yield never overrides Safety Buffer or Rebalance; Contribution/DCA stays below Stable Yield.

## Feature flags

Enabled: `STABLE_YIELD_POLICY_EXISTS`. Disabled: `STABLE_YIELD_REGISTRY_EXISTS`,
`…_COMPARISON_EXISTS`, `…_WALLET_DETECTION_EXISTS`, `…_SUGGESTIONS_EXIST`, `…_UI_ENABLED`,
`…_TESTING_EXISTS`, `…_EXECUTION_ENABLED`. No transaction/signature capability exists.

## Future pipeline

```
16A Policy  (this step)
↓
16B Registry
↓
16C Market data
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
