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

## Status after Step 16H-H

Step 16H-G's universal blocker ("no candidate has an exact address") is **partly resolved**, and the
candidate set has been cleaned up. See [the 16H-H section](#16h-h--exact-identity-resolution--candidate-cleanup).

| | 16H-G | after 16H-H |
|---|---|---|
| Candidates with a verified exact address | 0 of 5 | **1 of 5** (`kamino_steakhouse_usdc`) |
| Kamino APY unit | assumed `fraction` | **proven `fraction`** from official evidence |
| Protocol placeholders | 5 candidates, indistinguishable | **3 explicitly `unsupported_for_mvp`**; 2 active |
| Approved products | 0 | **0** (unchanged — identity is not approval) |
| Production card | none | **none** (unchanged) |

Adapters still bind source data to a product by **exact address only**. A candidate without one fails
closed at `identity_validation` with `missing_product_address` — that remains true for
`kamino_usdc_lending`.

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

---

# 16H-H — Exact identity resolution & candidate cleanup

Resolved the real production identities from **official sources only**, and cleaned the candidate set so
a protocol-level placeholder can never again be mistaken for a real product.

**No product was approved.** `approved` remains 0, production still returns `no_plan` and renders no card.

## Official evidence used

Source hierarchy applied: official documentation → **official product registry (API)** → official SDK.
Nothing came from search snippets, community posts, aggregators, token lists, or names alone.

- Official docs index: `https://kamino.com/docs/llms.txt`
- Official API base (from the docs' own API reference): `https://api.kamino.finance`
- Official product registry: `GET /kvaults/vaults` — documented at
  `kamino.com/docs/build/api-reference/earn/vault-data/vaults-list`
- Official markets endpoint: `GET /v2/kamino-market` — documented at
  `kamino.com/docs/build/api-reference/borrow/market-data/markets-list`
- Official APY guidance: `kamino.com/docs/build/earn/get-vault-apys`
- Official SDK: `@kamino-finance/klend-sdk` v9.1.2 (installed) — ships **program IDs only**, no product
  addresses. Product addresses are chain-resolved at runtime, which is why the registry had none.

All checked **2026-07-16**.

## Identity resolved: `kamino_steakhouse_usdc`

| Field | Value | Evidence |
|---|---|---|
| Vault address | `HDsayqAsDWy3QvANGqh2yNraqcD8Fnjgh73Mhb3WRS5E` | official `/kvaults/vaults` **and** the official docs' canonical `KaminoVault` SDK example — two independent sources |
| On-chain name | `Steakhouse USDC` | `state.name` decoded from the official registry |
| Deposit asset / mint | USDC / `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | `state.tokenMint` |
| Share (receipt) mint | `7D8C5pDFxug58L9zkwK7bCiDg4kD4AygzbcZUmf5usHS` | `state.sharesMint` — the 16F position identifier |
| Product minimum | `state.minDepositAmount` = 100000 raw → **0.1 USDC** (6dp) | on-chain state |
| Chain | solana_mainnet | official registry |

The **address is the identity**; the name is only corroboration. Lifecycle is `identity_verified` —
strictly weaker than `approved`.

### The curation decision left for a human

The official registry holds **159 vaults, 89 with the USDC mint**, of which **three** carry "Steakhouse":

| Name | Address |
|---|---|
| `Steakhouse USDC` | `HDsayqAsDWy3QvANGqh2yNraqcD8Fnjgh73Mhb3WRS5E` (bound) |
| `Steakhouse High Yield USDC` | `BEEfo7xwgK2ZP13Pxo7qqTPzAteKJmXjVWtMWcXSvbn2` |
| `Steakhouse USDC Testing` | `JDmkiqvtyAqAsqrLGDgVH2GesbRAAMJCoQtqiyWx82bF` |

This entry binds the exact-name match. But choosing between "Steakhouse USDC" and "Steakhouse High Yield
USDC" is a **product decision with materially different risk profiles** — not derivable from data, and
explicitly not chosen by APY, TVL, or first-result. A human must decide in 16H-I.

## APY unit — the 16H-G blocker, now PROVEN

**Kamino returns a decimal FRACTION, and it is APY (compounding), not APR.**

- Proof: the official docs' own display code — `(vault.apy7d * 100).toFixed(2)`. The `* 100` is the proof.
- Corroboration: live official values, e.g. `apy7d: "0.040110766058785959014"` ≈ 4.01% — a plausible USDC
  rate. Read as a percent it would be an implausible 0.04%. (Magnitude was **not** used to decide; it only
  confirms the documented rule.)
- Conversion: `pct = fraction × 100`, rounded to 6dp (kills the `0.0515*100 = 5.1499999999999995` artifact).
- Guarded by fixtures against both the 100× and 0.01× errors.

### Schema finding: rates are decimal STRINGS

The live API returns rates as high-precision decimal **strings**, not numbers. The parser gained an
explicit documented-decimal-string reader **for this source only**; a string still fails everywhere else,
because elsewhere a string means the schema changed. `"5.2%"`, `""`, `"1e-2"`, `"1,000"` are all rejected.

## Why Steakhouse is still blocked (primary: `blocked_freshness`)

Verifying the source revealed three real gaps that no amount of adapter work can paper over:

1. **No source timestamp.** `/metrics` returns 34 fields and **zero** time/slot/updated fields. The 16C
   rule is that the source's own time is authoritative — with no timestamp, freshness cannot be evaluated,
   so the adapter fails closed. Needs the SDK read's slot time or a documented API timestamp.
2. **Net-vs-gross undeclared.** `/metrics` exposes 12 APY fields (`apy`, `apyTheoretical`, `apyActual`,
   `apy24h/7d/30d/90d/180d/365d`, `apyFarmRewards`, `apyIncentives`, `apyReservesIncentives`) and declares
   net-vs-gross on none. The documented **net** field is the SDK's `getAPYs().actualAPY.netAPY`, which
   needs an RPC read. Mapping a `/metrics` field onto the 16C net contract is unproven → fails closed.
3. **No capacity fields.** No cap/limit/paused field exists → capacity is `unknown`, never uncapped.

Plus: no 16D risk review exists.

## Identity NOT resolved: `kamino_usdc_lending`

The product here is the **USDC reserve**, not the market. `GET /v2/kamino-market` returns 34 lending
**markets** with addresses, but Kamino documents **no endpoint listing a market's reserves or their
addresses**. Writing a market address into the product-identity field would put the wrong identifier
there purely to satisfy the adapter — so `address` stays `undefined` and the status is `blocked_identity`.

> Reserve ≠ lending market ≠ obligation account ≠ vault ≠ token mint. The adapter must never blur these.

This candidate matters most long-term: lending is the only strategy type that is intrinsically
**buffer-lane** eligible (16A) — but a buffer plan would also need the canonical buffer-yield minimum,
which is still undefined.

## Candidate cleanup

| Candidate | Lifecycle | Reason |
|---|---|---|
| `kamino_steakhouse_usdc` | `identity_verified` | exact address proven; **not approved** |
| `kamino_usdc_lending` | `documentation_required` | reserve address not officially documented |
| `raydium_stable_usdc_strategy` | `unsupported_for_mvp` | Raydium's USDC venues are **trading pools**; a trading pair is not a deposit product. IL/depeg exposure isn't modelled by 16D or the 16H-B presentation, so it can't honestly be shown as "put excess USDC to work". |
| `meteora_stable_usdc_strategy` | `unsupported_for_mvp` | Meteora's USDC venues are **dynamic LPs**; an LP position is not a simple USDC yield account. |
| `hubble_usdc_strategy` | `unsupported_for_mvp` | **Product-model incompatibility**: a USDH CDP requires opening a debt position; Stable Yield models a direct deposit that earns without borrowing. |

All three are **retained, not deleted**, for traceability, and are excluded from the active set by
`isYieldStrategyExcluded` / `listActiveYieldStrategyCandidates`. New lifecycle states: `identity_verified`,
`unsupported_for_mvp`, `archived`.

> These are **product-model decisions**, not risk judgements. No risk score was created or altered, and
> **no name-based penalty** was applied — Hubble is not "bad" or "unsafe" here, it simply offers no product
> matching this contract. Each may be revisited on evidence.

## Risk-review handoff (16D input, not a score)

For `kamino_steakhouse_usdc` the reviewer now has: exact vault address, share mint, program ID
(`KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd` from the official SDK), product type (managed vault),
deposit asset + mint, product minimum, and fee fields exposed by the registry (`performanceFeeBps`,
`managementFeeBps`). Still missing: audit references, admin/upgradeability model, oracle dependencies,
strategy complexity, withdrawal restrictions, incident review, reviewer metadata, review date.

**No risk score was generated, recalculated, or mutated.**

## Position detection

Exact matching on the vault address `HDsay…` and/or the share mint `7D8C…`. `wallet/kaminoVaults.ts`
already reads vault-share balances keyed by exact vault address, read-only, via the official SDK — so
detection is mechanically supported once the product is approved. Symbol-only/protocol-only matches stay
rejected; multiple matches stay ambiguous; adapter failure never becomes a zero position.

## Readiness matrix

| Candidate | Active | Identity | Official source | APY field | APY unit | Freshness | Capacity | Deposit state | Bounds | Position | Risk | **Ready for approval review** | Primary blocker |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `kamino_steakhouse_usdc` | ✅ | ✅ verified | ✅ verified | ❌ net/gross undeclared | ✅ fraction | ❌ no timestamp | ❌ unknown | ❌ | ✅ min 0.1 USDC | ✅ | ❌ | **no** | `blocked_freshness` |
| `kamino_usdc_lending` | ✅ | ❌ | ❌ | ❌ | — | — | ❌ | ❌ | ❌ | ❌ | ❌ | **no** | `blocked_identity` |
| `raydium_stable_usdc_strategy` | ❌ | ❌ | — | — | — | — | — | — | — | — | ❌ | **no** | `unsupported_for_mvp` |
| `meteora_stable_usdc_strategy` | ❌ | ❌ | — | — | — | — | — | — | — | — | ❌ | **no** | `unsupported_for_mvp` |
| `hubble_usdc_strategy` | ❌ | ❌ | — | — | — | — | — | — | — | — | ❌ | **no** | `unsupported_for_mvp` |

`identity resolved` ≠ `adapter implemented` ≠ `live source verified` ≠ `risk review complete` ≠ **approved**.
`approved` is hard-coded false and unrepresentable in `StableYieldApprovalReadiness`.

Product approval remains a **separate explicit step**, and the canonical buffer-yield minimum remains a
**separate policy step**. Production renders no Stable Yield card until approval.
