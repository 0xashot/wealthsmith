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

---

# 16H-I — Kamino Steakhouse SDK source path + refresh/publish cache

Replaced the incomplete REST metrics path with the **official Kamino SDK over RPC**, and built the
backend-style refresh/publish infrastructure. **Live-verified 2026-07-16.**

**Two of 16H-H's blockers are resolved.** Still no approval, still no card.

## The selected product (human decision, Step 16H-H)

Only `HDsayqAsDWy3QvANGqh2yNraqcD8Fnjgh73Mhb3WRS5E` — "Steakhouse USDC" — is in scope.
**Excluded, by name, in code:** `BEEfo7…` ("Steakhouse High Yield USDC") and `JDmki…`
("Steakhouse USDC Testing"). Nothing is chosen dynamically, and never by APY/TVL/registry order.

## Source path (verified against the installed SDK, not assumed)

```
getSlot()  →  KaminoVault(rpc, VAULT).getState()  →  identity checks  →  getAPYs(slot)
           →  getBlockTime(slot)  →  normalize  →  tmp artifact  →  publish  →  runtime cache
```

`klend-sdk` **v9.1.2**. The real signature is `getAPYs(slot: Slot): Promise<VaultAPYs>` — it takes a
**slot** (the prompt's assumed zero-arg `getAPYs()` does not exist), and returns
`{ theoreticalAPY, actualAPY }` where each is `{ grossAPY: Decimal; netAPY: Decimal }` — **Decimal**, not
number. That slot argument is what makes freshness solvable: the same slot feeds `getBlockTime(slot)`.

## Net APY — proven from the SDK's own source

Selected field: **`getAPYs(slot).actualAPY.netAPY`**. Both properties are proven, not assumed:

- **Net**: `computeNetAPR(grossAPR, vault) = grossAPR × (1 − performanceFeeBps/10000) − managementFeeBps/10000`.
  Both fees are already deducted ⇒ **no adapter may deduct them again**.
- **APY, not APR**: `calculateAPYFromAPR(apr) = (1 + apr/SLOTS_PER_YEAR)^SLOTS_PER_YEAR − 1` — the
  standard compounding formula, which is only coherent for a **fraction** and returns a fraction.

Normalization: `percent = fraction × 100`, rounded to 6dp (kills the `0.0515×100 = 5.1499999999999995`
artifact). No averaging, no highest-field selection, no REST fallback, no High-Yield-vault APY.

## Authoritative time — chain, not our clock

`slot` is read **first**, then passed to both `getAPYs(slot)` and `getBlockTime(slot)`, so the APY and the
timestamp describe the same chain state. `getBlockTime` returning `null` (slot older than the node's
history) **fails closed** — local `fetchedAt` is retrieval metadata only and can never make stale chain
data look fresh. Freshness reuses the canonical 16C max age; no competing threshold. If RPC nodes lag,
the block time is simply older and the record goes stale — which is the correct outcome.

## Live verification — 2026-07-16 (Helius mainnet, redacted)

| | |
|---|---|
| Vault name (on-chain `state.name`) | **"Steakhouse USDC"** — a *third* independent identity confirmation |
| Identity | `tokenMint`=USDC ✓ · `sharesMint` ✓ · decimals=6 ✓ |
| Source slot / chain block time | `433263778` / `2026-07-16T11:27:33Z` |
| `actualAPY.netAPY` | `0.038774279858246` (fraction) → **3.877428 %** |
| `minDepositAmount` | `100000` raw @ 6dp → **0.1 USDC** (integer math) |
| Fees | mgmt **0 bps**, perf **500 bps** (already inside netAPY) |
| `depositCap` | **`0`** |
| Deposit state | no field exists on-chain |

> The APY is **not** pinned as a fixture expectation — it changes. Fixtures assert shape and rules.

## Capacity — still `unknown`, and that is deliberate

`VaultState.depositCap` exists and reads **`0`**. The official SDK **never reads it**, and no official
source documents whether `0` means "no cap" or "closed", nor which field is the matching *used*
counterpart. Both guesses are dangerous in opposite directions: "uncapped" would invent headroom the
protocol never offered; "full" would wrongly block. So it stays `unknown` — **this is now the primary
blocker**. (Note the SDK *does* use `U64_MAX` as an uncapped sentinel for *reserve* `depositLimit`, which
is a different field on a different account — evidence that a cap sentinel convention exists, but not
evidence about this field.)

## Deposit state — still `unknown`

The on-chain `VaultState` exposes **no** pause/enabled/halt field. A successful read is not proof
deposits are enabled; TVL and UI availability are not proof either. Fails closed.

## Refresh / publish / consume

| Command | Does | Never |
|---|---|---|
| `npm run refresh:stable-yield-market-data` | Node + SDK + RPC → `tmp/stable-yield-market-refresh.json` (atomic) | browser, secrets in output, registry mutation, approval |
| `npm run publish:stable-yield-market-cache` | revalidates → `public/generated/stable-yield-market-cache.json` (tmp+rename) | **any network call**, planning, approval |
| `npm run validate:stable-yield-market-cache` | validate only, writes nothing | — |

RPC comes from the **Node-only** `STABLE_YIELD_RPC_URL` / `SOLANA_RPC_URL`. It is deliberately **not**
read from `VITE_SOLANA_RPC_URL`: `VITE_`-prefixed vars are inlined into the browser bundle, so a
key-bearing URL must never live there. Missing config, localhost, and null block time all exit non-zero.
No public-proxy fallback.

**Runtime** consumes only the published, same-origin, already-normalized record — revalidating identity
and freshness, because a file on disk is untrusted input. `browserFetched` stays `false`. No SDK/RPC/Node
code enters the React bundle (asserted by fixtures).

> **This is a scheduled-job precursor, not a backend.** Today a human runs the refresh; a real deployment
> needs a scheduled job. The browser is not, and never becomes, the backend.

## Why fresh market data still changes nothing

The product is **unapproved**, so the 16C join refuses to build a snapshot for it. A validated market
record can be perfectly fresh and still not be planning-safe: `planningSafe: false`, blockers
`product_unapproved`, `capacity_unknown`, `deposit_state_unknown`, `risk_review_incomplete`.

**Data about a product is not permission to plan with it.** Production still returns `no_plan` and renders
no card; Demo is unchanged; the buffer-yield minimum remains undefined.

---

# 16H-J — Steakhouse USDC risk evidence package

Assembled the exact-vault risk evidence for a human 16D review.
Backed by [`steakhouseUsdcRiskEvidence.ts`](./steakhouseUsdcRiskEvidence.ts).

**Result: `evidence_incomplete` / awaiting human signoff. No score assigned. No approval.**

## Why no score exists — the repository's own gates

This is not a judgement call; it is what the repo already encodes:

- `protocolRiskRubric.ts` is **v0.1.0-draft**, `approvalStatus: "draft"`, `PROTOCOL_RISK_RUBRIC_APPROVED = false`, `PROTOCOL_RISK_RUBRIC_ASSIGNS_SCORES = false`.
- `protocolRiskScoreAssignment.ts` (Step 12Y) gates every 0–10 score on an **approved rubric** *plus*
  **per-dimension reviewer-scored input with rationale + sources**. Its default is `not_submitted`, so
  every candidate — including the far more mature JitoSOL work — stays `blocked` with no score.
- `YieldStrategyRiskReview` has **no reviewer field**, and the repository holds no authorized reviewer record.

Claude assembled evidence and may run deterministic rubric mechanics, but **is not an authorized human
reviewer** and does not represent itself as one. `riskScore` is `undefined` — not `0`, which would be a claim.

## Evidence established (on-chain, 2026-07-16)

| Dimension | Finding |
|---|---|
| Program identity | Vault owned by `KvauGMspG5k…`; on-chain name "Steakhouse USDC"; canonical USDC mint; share mint `7D8C…` ✓ |
| **Upgrade/admin** | Program is **UPGRADEABLE** (`BPFLoaderUpgradeab1e…`) with an **ACTIVE** upgrade authority `GzFgdRJXmaw…` — not immutable |
| **Deployment age** | `lastDeployedSlot 432874668` — upgraded **~2 days** before the read |
| Manager | `vaultAdminAuthority 9ceRgz…`; `allocationAdmin CuEC7J…` — **separate** accounts controlling admin vs strategy |
| **Strategy exposure** | Allocates USDC across **four** Kamino lending reserves (~74.2% / ~23.0% / ~1.8% / ~1.0%), changeable by `allocationAdmin` |
| Audits | Kamino Earn Vaults: Offside Labs 2025-04-12, Sec3 2025-02-06, OtterSec 2024-12-09 + formal verification, fuzzing, $1.5M ImmuneFi bounty |
| Oracles | Scope aggregator (multi-provider, 3 audits) — protocol-level |
| Withdrawal | `minWithdrawAmount` 0.001 USDC; SDK models `queuedForWithdrawalForReserves` ⇒ **instant liquidity must not be assumed** |
| Fees | perf **500 bps**, mgmt **0 bps** — both already inside the SDK's net APY |
| Stablecoin | Canonical Circle USDC, not bridged/wrapped |

### Two findings that most affect suitability

1. **Audit linkage is unproven.** Audits exist and are substantial — but no audited commit is published,
   and the deployed bytecode changed ~2 days ago. What is running today cannot be tied to what was audited.
2. **This is not a plain USDC deposit.** It is a *managed, multi-reserve lending allocation* whose
   composition an admin can change. "USDC vault" ≠ pure USDC lending.

## Open evidence gaps (all block approval review)

`sh-mgr-02` admin/allocation permission set + timelocks · `sh-exp-02` the four reserves' markets,
collateral, oracles, liquidation params · `sh-aud-02` audited-version↔deployed-version linkage ·
`sh-liq-02` exact withdrawal model, fees, emergency behaviour · `sh-inc-01` sourced incident review.

Per the repo's own rubric guidance, **absence of a discovered incident is missing evidence, not a clean record.**

## Capacity — RESOLVED (16H-J.1) from the official program source

**`deposit_cap = 0` means UNCAPPED.** Proven from the kvault program's own deposit path, not inferred:

```
repo    github.com/Kamino-Finance/kvault   release/v2.2.2
commit  1d146d7087a76edbbadc14d848ae14295c0745a4  (2026-07-08)
file    programs/kvault/src/operations/vault_operations.rs
fn      common::get_max_depositable_in_vault  (L1003-1012)

    let deposit_cap = if vault.deposit_cap == 0 { u64::MAX } else { vault.deposit_cap };
    deposit_cap.saturating_sub(holdings_aum_rounded_up)
```

- `0` is an **explicit branch** mapping to `u64::MAX`, not an absent field.
- `init_vault` writes `deposit_cap = u64::MAX` (L44), so `0` is the **legacy zero-initialised encoding**
  kept for backward compatibility.
- Remaining capacity is `cap − dynamically computed AUM`. There is **no stored used-counterpart**, and an
  uncapped vault needs none — exactly as the program itself needs none.

> **This supersedes the earlier 16H-J speculation** that `0` might mean "closed". That reasoning came from
> `tokenAllocationCap`'s `U64_MAX` sentinel — a *different field on a different account* — and is refuted
> by the deposit path. Both `0` and `u64::MAX` mean uncapped for `deposit_cap`.

**Scope is deliberately narrow.** [`kaminoVaultCapacitySemantics.ts`](./kaminoVaultCapacitySemantics.ts)
gates on the kvault **mainnet program id** + `managed_vault` type. Any other program, product type, or
unrecognised encoding still **fails closed** to `unknown`. A proof about kvault is not a proof about
lending reserves or LP pools. A genuinely capped vault still requires AUM, or it fails closed.

`verified_uncapped` is the one mode asserting a semantic claim, so the cache validator **rejects it
without a reviewed source commit** — an uncited claim is an inference, and inferences fail closed.

### Capacity is not deposit state

`verified_uncapped` says only that **no cap constrains a deposit**. It says nothing about whether deposits
are *enabled*. That is a separate gate with a separate field, none exists on this vault's state, and the
resolver never emits a deposit-state verdict. **Deposit state remains `unknown`.**

## Re-review triggers

Program upgrade · upgrade-authority change · admin/allocationAdmin change · material strategy/reserve
change · withdrawal-model change · fee change · critical incident · mint change · vault migration · audit
scope change. **APY changes alone never invalidate the risk score** (there is no live data in this module).

## State

`evidence_complete` ≠ `rubric score complete` ≠ `human signoff complete` ≠ `eligible for approval review`
≠ `approved`. All are false or absent here. Production still returns `no_plan` and renders no card; Demo
unchanged; capacity fail-closed; buffer-yield minimum still undefined.

---

# 16H-L — Steakhouse evidence closure

Closed every gap that primary sources could close, and preserved the rest precisely.
Backed by [`steakhouseEvidenceClosure.ts`](./steakhouseEvidenceClosure.ts). Live read-only mainnet
evidence, cutoff **2026-07-16T12:40Z**, slot **433291120**.

**Readiness: `blocked_pending_protocol_confirmation`.** No score assigned, worksheet still empty,
product still unapproved, production still renders no card.

## Gaps CLOSED

**Authority control model — resolved, and it matters.** Each authority account's *owner program* is the
decisive evidence: a Squads multisig is owned by the Squads program; a governance authority by SPL
Governance; a PDA by its program. All three privileged authorities are owned by the **System Program
with zero data bytes** — plain keypair accounts:

| Role | Address | Owner | Model |
|---|---|---|---|
| Program upgrade authority | `GzFgdRJXmaw…` | System Program | **EOA — no on-chain multisig** |
| Vault admin | `9ceRgz…` | System Program | **EOA — no on-chain multisig** |
| Allocation admin | `CuEC7J…` (~11.9 SOL) | System Program | **EOA — no on-chain multisig** |
| Base vault authority | `AyY6VC…` | (uninitialised) | PDA signing authority |

> **The limit of this evidence, stated plainly:** this proves there is no *on-chain* multisig gating
> these keys. It does **not** prove a single human holds them — an off-chain MPC/threshold arrangement
> (Fireblocks, Turnkey, a shared HSM) is **indistinguishable from a single keypair on-chain**. Only
> Kamino can settle that, which is why this is `blocked`, not `unsuitable`.

**Reserve exposure — enumerated.** 4 active of 25 slots, all supplying canonical USDC:

| Reserve | Market | Share |
|---|---|---|
| `D6q6wuQ…` | **SOL/BTC Market** | 69.37% |
| `Ga4rZyt…` | **JLP Market** | 29.37% |
| `Atj6URE…` | *(unresolved)* | 1.26% |
| `9FRZvAs…` | **Bitcoin Market** | 0% (inactive) |

> **The vault holds only USDC — but it *lends* that USDC into markets whose borrowers post JLP, SOL/BTC
> and Bitcoin as collateral.** The credit risk is exposure to those collateral markets: if collateral
> collapses and liquidations fail, the USDC suppliers bear the bad debt. Four USDC reserves are **not**
> equivalent.

**Allocation is dynamic — now proven, not asserted.** Weights moved between two reads with no user
action: 16H-J (slot 433263778) `23.0 / 74.2 / 1.8 / 1.0` → 16H-L (slot 433291120) `29.37 / 69.37 / 0 /
1.26`. A snapshot is a point in time, not a commitment.

**Deposit-state mechanism — resolved.** An exhaustive search of the reviewed source for
pause/enabled/halt/shutdown/emergency/status returns **zero hits**: the program has **no deposit-state
control**. A deposit can fail only on cap reached, below minimum, zero shares, a shares-out slippage
guard, or ordinary account/CPI failure. **But that answers a different question than "will a deposit
succeed now?"** — the absence of a switch is not proof the light is on, and Kamino could still restrict
deposits operationally or by upgrading the program (which one key can do). Current availability stays
`unknown`. No transaction was constructed or simulated.

## Gap OPENED — a third fee

`get_withdrawal_penalty(vault, global_config, amount)` = `max(amount × penalty_bps / FULL_BPS,
penalty_lamports)`. This is an **exit cost sourced partly from a protocol-level `GlobalConfig`**, and the
SDK's net APY does **not** include it. Our earlier "fees are already inside the net APY" was true of
management and performance fees only. **Current penalty value: unresolved** — the GlobalConfig account
was not read.

## Gaps REMAINING (each needs Kamino)

`audit_deployment_linkage_unverified` — no audited commit is published, and the bytecode changed ~2 days
before the cutoff. A matching program name and a plausible date are **not** linkage.
`withdrawal_model_incomplete` — queue conditions, partial fulfilment, farm-staked behaviour, penalty
value. **Instant liquidity is not proven.**
`incident_review_incomplete` — no official incident/postmortem index located. **A null result from an
incomplete search is missing evidence, not a clean record.**
`upgrade_authority_control_unknown` · `allocation_admin_control_unknown` · `deposit_state_unknown` ·
`reserve_market_identity_unknown` (4th reserve) · `oracle_dependency_unknown` (collateral-side).

## Readiness rule

`unsuitable_to_continue_review` requires **verified evidence of a disqualifying condition** — missing
evidence can never produce it, however much is missing. That distinction is enforced in
`evaluateReviewReadiness()` and fixture-locked: forcing every dimension to `blocked` still yields
`blocked_pending_protocol_confirmation`.

## Kamino questionnaire

Six sections, ≤2 questions each, every one bound to the exact vault/share mint/program:
upgrade & governance · vault & allocation admin · audit linkage · withdrawals · deposit state ·
incidents. Ready to send. **Not sent.**
