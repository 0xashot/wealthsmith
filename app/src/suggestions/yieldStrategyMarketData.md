# Stable Yield Market Data (Step 16C)

The deterministic, versioned **live-market contract** for Yield Strategies. It answers **"what are this
exact product's current APY / TVL / liquidity / withdrawal state, how fresh is it, and where did it come
from?"** — never "which product is better?". No comparison, ranking, leader, eligibility decision,
suggestion, wallet/protocol detection, UI, Demo / Real Wallet wiring, or execution (those are Steps
16D–16H).

Backed by:
- [`yieldStrategyMarketDataTypes.ts`](./yieldStrategyMarketDataTypes.ts) — versions, statuses, the snapshot / set / input contracts.
- [`yieldStrategyMarketDataPolicy.ts`](./yieldStrategyMarketDataPolicy.ts) — freshness bounds, supported APY windows/definitions/withdrawal statuses, and the field-freshness + APY-sufficiency evaluators.
- [`yieldStrategyMarketData.ts`](./yieldStrategyMarketData.ts) — the registry→market-data join (normalizer), the empty-approved helper, accessors, and the fail-closed validators.
- [`yieldStrategyMarketDataDiagnostics.ts`](./yieldStrategyMarketDataDiagnostics.ts) — coverage counts (no comparison).

## Why market data is separate from the registry

The [Yield Strategy Registry](./yieldStrategyRegistry.md) (16B) knows **what products exist** and is a
stable, reviewed catalog. Market data is **live, volatile, and can go stale / partial / invalid /
unavailable**. Keeping them apart means a refresh can never mutate product identity, and the registry
stays the single source of candidate identity. This mirrors the SOL-staking split (reviewed static facts
vs the live market cache).

## Core architecture

```
Yield Strategy Registry (16B, identity)
→ injected documented market-data inputs (never fetched here, never from React)
→ per-product normalized market snapshot (APY / TVL / liquidity / withdrawal / fees / freshness / provenance)
→ validators (fail closed)
→ coverage diagnostics
```

The normalizer iterates the registry **in canonical order** and, for each product:
- **approved** lifecycle **+ a documented exact address + a matching input** → a normalized snapshot;
- anything else → a **documentation-only, `unavailable`** snapshot (never auto-approved, never fabricated).

## How APY meaning is preserved

Sources do **not** share one APY definition. A snapshot preserves the source's meaning via
`apyDefinition` (`net` / `gross` / `estimated` / `current` / `variable` / `unknown`) and `apyWindow`
(`spot` / `current` / `7d` / `30d` / `unknown`), alongside the raw values (`currentApyPct`,
`sevenDayApyPct?`, `thirtyDayApyPct?`, `grossApyPct?`, `netApyPct?`). APY is **never collapsed** to a
single number. `definitionSufficientForComparison` is `true` **only** for `net`/`gross`; an `unknown`
(or estimated/variable) definition is preserved but marks the value **not** comparison-ready, so a later
comparison step (16E) fails closed rather than comparing incompatible definitions.

## How TVL and liquidity are preserved

- **TVL** — the exact source numeric value, in USD, with snapshot-level freshness + provenance. Never
  synthesized.
- **Liquidity / withdrawal** — **explicit only**. `withdrawalStatus` is a first-class field
  (`instant_currently_available` / `partial_currently_available` / `withdrawal_required` /
  `queue_possible` / `unavailable` / `unknown`) because the Safety Buffer lane depends on it. Liquidity
  is **never** inferred from TVL, APY, protocol name, or product category — absent source data →
  `unknown` with `liquidityConfidence: "unknown"`.
- **Fees** — each fee (`managementFeePct`, `performanceFeePct`, `withdrawalFeePct`) preserved
  separately; no synthetic total.

## Why provenance matters

Every snapshot carries provenance: `sourceId`, `sourceLabel`, `sourceUrl?`, a provenance `kind`
(`documented_source` / `backend_normalized` / `same_origin_runtime_payload` / `none`), and
`browserFetched: false`. A browser-fetched external-provider value is **rejected** — the engine never
fetches yield data from React. Missing provenance is a blocker.

## Why freshness matters (versioned policy `yield_strategy_market_data_v1`)

Freshness is **explicit** and stale data **stays stale** — there is no silent refresh. The repo's
precedents are 60 minutes for price data (`SOL_CONTRIBUTION_PRICE_MAX_AGE_MS`) and a looser 24 hours for
the SOL-staking market cache. Because a Stable Yield decision deploys USDC **principal**, this policy
adopts the **stricter** 60-minute bound for the Excess-USDC lane and a **stricter still 15-minute**
bound for the Safety-Buffer lane (which touches reserve capital). A future timestamp beyond a small skew
is `invalid`; a missing timestamp is `missing`.

## Snapshot status

`complete` (approved + all required fields present, valid, fresh) · `partial` · `stale` · `invalid` ·
`unavailable` (non-approved / no documented address / no input — the documentation-only state). Only a
`complete` snapshot on an approved product with no blockers is marked `eligibleForFutureComparison` —
and that is **data-readiness only**; it enables nothing.

## How the empty approved set is handled

Because 16B currently has **zero approved products** (no exact address is documented for any product),
the market-data set is built with an **empty approved candidate list**. This is a **valid, deterministic
state**: every product is an `unavailable` documentation-only snapshot, `emptyApprovedSet` is `true`, the
market-ready list is empty, diagnostics still report full coverage counts, and the validators still pass.
Injecting market data for a `documentation_required` product **never** promotes or approves it. When a
product is later promoted to `approved` with a documented address, its injected data will normalize
automatically — no code change here.

## Buffer lane vs excess lane (metadata only)

Each snapshot carries `laneCompatibility` (buffer/excess candidacy + the lane-specific freshness bounds +
the buffer lane's instant-liquidity / defined-withdrawal expectations). 16C **preserves** this metadata;
it never performs lane **selection** — that is a later step.

## Validation (fails closed)

Snapshot validation rejects: enabled capability flags; browser-fetched provenance; a fabricated approval
(`approvedForMarketData` without an approved lifecycle **and** a documented address); a non-approved
product that is not `unavailable` or that carries market values; an `eligibleForFutureComparison`
snapshot that is not `complete`/approved or that has blockers; a buffer-lane eligible snapshot without
instant liquidity; unsupported APY definition/window or withdrawal status; and negative/non-finite
APY/TVL/liquidity values. Set validation additionally rejects duplicate ids, canonical-order drift
(vs the live registry), a market-ready id that is not approved, and an inconsistent `emptyApprovedSet`.

## Diagnostics

Coverage only: registered / approved / documentation_required counts, snapshot-status distribution, and
coverage of APY / APY-definition-sufficiency / 7d / 30d / TVL / liquidity / defined-withdrawal /
provenance / freshness, plus the empty-approved state. **No comparison, ranking, or recommendation.**

## Feature flags

Enabled: `YIELD_STRATEGY_MARKET_DATA_EXISTS`. Disabled: comparison, eligibility, wallet detection,
suggestions, UI, testing, execution. No transaction/signature capability.

## Future roadmap

```
16A Policy
↓
16B Registry  (WHAT products exist)
↓
16C Market data  (this step — APY / TVL / liquidity / withdrawal per approved product; empty-allowed)
↓
16D Eligibility        (which approved+fresh candidates qualify per lane)
↓
16E Comparison         (net-vs-net, same-window; fail closed on undefined APY definitions)
↓
16F Existing positions (detect already-deployed USDC yield positions)
↓
16G Plan generator     (deterministic deploy/keep plan)
↓
16H Product integration
```
