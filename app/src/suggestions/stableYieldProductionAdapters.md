# Stable Yield Production Data Adapters (Step 16H-G)

The production data-adapter layer and the **evidence package** a later, explicit approval decision
(Step 16H-H) will review.

**This step approves no product.** Production still emits no Stable Yield suggestion and renders no
card. The canonical buffer-yield minimum is **not** defined here either. Both remain separate steps.

Backed by:
- [`stableYieldProductionAdapterTypes.ts`](./stableYieldProductionAdapterTypes.ts) — the adapter contract, stages, diagnostics, identity.
- [`stableYieldProductionIdentity.ts`](./stableYieldProductionIdentity.ts) — exact-address identity resolution.
- [`stableYieldSourceParsers.ts`](./stableYieldSourceParsers.ts) — strict, source-specific parsers.
- [`stableYieldProductionAdapters.ts`](./stableYieldProductionAdapters.ts) — normalization + validation → canonical 16C/16G inputs.
- [`stableYieldProductionEvidence.ts`](./stableYieldProductionEvidence.ts) — versioned evidence manifests + readiness matrix.
- `scripts/probe-stable-yield-sources.mjs` — developer-only probe (`npm run probe:stable-yield`).

## The headline finding

> **Every current production candidate is blocked on one thing: no exact product address is documented.**

[`yieldStrategyRegistry.ts`](./yieldStrategyRegistry.ts) contains 5 candidates. All 5 carry
`address: undefined` and `lifecycle: "documentation_required"`, because the repository documents no
exact stable-yield vault/market address and **fabricates none**.

Adapters bind source data to a product by **exact address only**. With no address there is nothing to
bind to and no source query to make — so every candidate fails closed at `identity_validation` with
`missing_product_address`, and the probe makes **zero network requests**.

This is the correct fail-closed result, and it is the first task of Step 16H-H.

## Architecture

Five separable stages — never one function:

```
A. retrieval   → developer-only Node probe (or a future backend). NEVER the browser, NEVER this layer.
B. parse       → stableYieldSourceParsers.ts   (strict, no `any`, no coercion)
C. normalize   → stableYieldProductionAdapters.ts
D. validate    → identity + units + freshness  (fails closed)
E. planning    → the EXISTING 16C→16G pipeline, unchanged
```

The adapter layer **never**: approves a product, selects a leader/plan/amount/lane, decides Top Pick,
writes card copy, builds a presentation, creates a fallback product, or turns missing data into valid
data. It contains no React, performs no retrieval, and adds no execution/transaction/signature path.

### Why retrieval is not in this layer

The 16C contract pins `browserFetched: false` — *the browser must never call an external yield-data
provider*. Production data can therefore only arrive **pre-normalized** from a backend or refresh job.
**No such backend exists** (see Infrastructure blockers), so nothing feeds runtime today.

## Exact identity rules

Identity is `strategyId + protocolId + asset + assetMint + chain + productAddress`. Every field must be
proven; there is deliberately no partial identity type — a partially-known product is unverified.

Rejected, always: protocol-name matching · ticker/symbol matching · **product-name matching** · fuzzy
or substring matching · registry-position matching ("first USDC vault") · falling back to another vault
from the same protocol or another product with the same symbol.

**A product name is not an identity.** The registry documents the name "Steakhouse USDC", but names are
non-unique and mutable on-chain, so matching on one would let a source silently rebind a product.

Diagnostics: `product_not_found` · `product_identity_mismatch` · `duplicate_product_match` ·
`unsupported_product_identity` · `missing_product_address` · `wrong_chain` · `wrong_asset`.

Asset identity **is** anchored: the canonical Solana USDC mint is documented in `wallet/walletPosition.ts`.
Product identity is not. That distinction is the whole blocker.

## Source hierarchy

1. official protocol API → 2. official protocol SDK / on-chain account data → 3. official documented
endpoint → 4. an explicitly approved external provider already used by WealthSmith → 5. no adapter.

Only **Kamino** reaches tier 2: `wallet/kaminoVaults.ts` already reads vault state read-only via the
official `@kamino-finance/klend-sdk`. Raydium/Meteora/Hubble have no identified product, so they get no
adapter — an in-scope *protocol* is not a *product*.

No marketing copy is scraped. No unreviewed aggregator is a silent source of truth.

## APY: source, field, units

One selected field: the Kamino SDK's **net vault yield**. The adapter never averages rates, never picks
the highest field, never infers an APY definition, and never derives APY from an APR.

**Units are declared per source, never guessed.** `0.0515` is a plausible 0.05% and `5.15` a plausible
515% — magnitude proves nothing. The parser is *told* `fraction` or `percent`; ambiguity fails closed.
The canonical stored unit is percent (`5.15` ≡ 5.15%).

> Fraction→percent multiplies by 100, and `0.0515 * 100` is `5.1499999999999995` in binary floating
> point. Left raw, that artifact reaches the UI as a rate that never equals the source's. The adapter
> rounds to 6dp — finer than any APY is meaningfully quoted, enough to erase the artifact.

Rejected: string APY (`"5.2%"`), `null`→0, `""`→0, missing→0, non-finite, negative, and any stable-USDC
rate >100% (a unit error or incentive artifact, not a rate to hand to planning).

## Freshness

The **source's own timestamp is authoritative** — never our local fetch time. A recent fetch of a stale
upstream value is still stale. Reuses the canonical 16C max age (1h); no new constant. Stale ·
future-dated · missing-timestamp · negative-age all fail closed. Timestamps never affect plan identity.

## Approved fallback

The 16C contract has an `approved_fallback` provenance kind. **This step creates no fallback value.**
Doing so would mean minting a permanent "reviewed" APY out of a single live observation, which is
exactly the invented-evidence failure mode. When the live source is unavailable, APY stays unavailable.
Product approval must never depend on an invented fallback.

## Capacity semantics

Canonical modes only: `explicit_remaining_capacity` · `verified_uncapped` · `deposits_paused` ·
`product_full` · `unavailable` · `unknown` · `invalid`.

- **explicit_remaining_capacity** = `depositCapUsd − depositedUsd`, same product, same unit, both
  explicit, result finite and non-negative. A negative remainder means cap and usage disagree → **reject,
  never clamp**.
- **verified_uncapped** requires an explicit source assertion that no cap applies. The Kamino adapter
  **cannot emit it** — vault state exposes an optional cap field, not an "uncapped" assertion, and
  inferring uncapped from a missing field is precisely the forbidden inference.
- **deposits_paused** requires an explicit deposit-enabled flag. A *withdrawal* pause is a different
  field and is never read as a deposit pause. An absent flag is `unknown`, never "enabled".
- An **absent cap is `unknown`** — the single most important line in the adapter.

### Why TVL and withdrawal liquidity are never capacity

They answer different questions. **TVL** is how much is already deposited — a full product and an
uncapped one can report identical TVL, so it carries no information about whether *your* deposit fits.
**Withdrawal liquidity** is how much can currently exit; a product can be deeply liquid to exit and
simultaneously closed to new deposits. Using either as capacity would invent headroom that the protocol
never offered. Also never used: protocol-wide capacity for a product-specific plan, another product's
cap, `Infinity`, an arbitrary large number, or lane capital as proof of product capacity.

16G may still apply its own finite capital ceiling to `verified_uncapped` — that is the plan layer's
existing rule, not a capacity inference.

## Minimum / maximum

**No minimum or maximum is invented for any candidate.** Missing bounds follow existing contract
behaviour. Never inferred from gas economics, wallet balance, or a UI-suggested amount. WealthSmith's
$250 excess threshold is **not** a protocol minimum. The canonical buffer-yield minimum is out of scope.

## Risk-review evidence

No risk score is generated, recalculated, or mutated here — not for APY changes, TVL growth, protocol
popularity, Demo presence, or another product from the same protocol being reviewed. The manifests list
each candidate's **missing** review items. Incomplete risk evidence ⇒ not ready for approval.

## Current-position recognition

16F matches by exact product identity. `wallet/kaminoVaults.ts` reads vault-share balances keyed by
**exact vault address** — but via `getUserSharesBalanceAllVaults(owner)`, which is **owner-scoped
position detection, not product discovery**. It cannot supply a canonical address for a product the user
does not hold. Symbol-only and protocol-only matches stay rejected; multiple matches stay ambiguous; an
adapter failure never becomes a zero position.

## Demo / production isolation

No adapter module imports the Demo scenario. Demo records cannot satisfy a production adapter: the demo
address is not a registry candidate, so it fails identity. Demo behaviour is unchanged by this step.

## Manual source probe

`npm run probe:stable-yield` (add `-- --write-snapshot` for a redacted `tmp/` snapshot).

Developer-only. Bundles the **real** adapters via esbuild (no logic duplication), refuses to run if
credential env vars are present, redacts addresses, and never mutates the registry, approves a product,
plans, or writes live values into source. It is not a runtime dependency, is not part of the fixture
suite, and never runs during build. **The deterministic suite requires no network.**

## Candidate readiness matrix

`adapter implemented` ≠ `source verified` ≠ `evidence complete` ≠ **approved**. `approved` is hard-coded
`false` and `StableYieldApprovalReadiness` has no `approved` member — this layer cannot approve.

| Candidate | Identity | APY | Capacity | Deposit state | Min/Max | Risk | Position | Ready | Approved |
|---|---|---|---|---|---|---|---|---|---|
| `kamino_steakhouse_usdc` | ❌ no address | ⚙️ impl, unverified | ⚙️ impl, unverified | ❌ | ❌ | ❌ | ⚙️ impl, unverified | **no** | no |
| `kamino_usdc_lending` | ❌ no address | ❌ no adapter | ❌ | ❌ | ❌ | ❌ | ❌ | **no** | no |
| `raydium_stable_usdc_strategy` | ❌ no product | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **no** | no |
| `meteora_stable_usdc_strategy` | ❌ no product | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **no** | no |
| `hubble_usdc_strategy` | ❌ not a yield venue | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **unsupported** | no |

⚙️ = adapter implemented, source schema **not** verified against a live response.

Hubble is `unsupported` (documented as a USDH CDP, not a USDC deposit venue) — a documentation-backed
category observation, **not** a risk judgement and **not** a name-based penalty. Steakhouse remains
unapproved.

## Blockers for Step 16H-H

1. **Document each product's exact on-chain address** from its official source. Unblocks everything.
2. **Verify the klend-sdk net-APY field's unit** (fraction vs percent) against a live response.
3. **Complete a 16D risk review** per candidate.
4. **Identify concrete Raydium/Meteora products**, or drop them from the candidate set.
5. **Infrastructure:** no backend/refresh job exists to deliver `browserFetched: false` normalized data
   to runtime. The existing precedent is a local Node job publishing a cache
   (`refresh-sol-staking-market-data.mjs` → `publish-sol-staking-market-cache.mjs`). This step
   implements the contract and the fail-closed boundary and reports the dependency honestly rather than
   fabricating a client-side solution.
