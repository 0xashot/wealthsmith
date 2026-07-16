# Stable Yield Plan (Step 16G)

The final pure-engine step: it produces **one** deterministic, read-only Stable Yield plan (or one
deterministic no-plan result) by consuming 16C–16F. It selects **one lane, one exact approved
comparison-leader product, and one exact amount** funded **only** by direct liquid USDC. It generates
**no** suggestion, card, modal, deep link, transaction/instruction/route, or signature, and updates
**no** product output.

Backed by:
- [`yieldStrategyProductCapacity.ts`](./yieldStrategyProductCapacity.ts) — the exact-product deposit-capacity contract + validators.
- [`yieldStrategyPlanTypes.ts`](./yieldStrategyPlanTypes.ts) — plan / decision / lane-evaluation / projection types.
- [`yieldStrategyPlanPolicy.ts`](./yieldStrategyPlanPolicy.ts) — lane priority, minimums, effective bounds, exact-cent floor, stable plan-ID.
- [`yieldStrategyPlan.ts`](./yieldStrategyPlan.ts) — lane evaluation, decision builder, validators.
- [`yieldStrategyPlanDiagnostics.ts`](./yieldStrategyPlanDiagnostics.ts) — diagnostics + recommendation-free explanations.

## Exact comparison-leader requirement (no fallback)

A product is selected only when the 16E lane comparison has a real leader:
`single_eligible_candidate` (reason `only_eligible_candidate`) or `complete` (reason
`highest_stable_score`). A tied / sensitivity-withheld / incomparable / empty / invalid comparison
produces **no plan**. There is **no fallback**: never the second-ranked, registry order, highest APY,
the currently-held product, a protocol default, or the legacy `selectedProtocolId`. The exact leader
identity must agree across registry, eligibility, and product capacity or the lane is blocked.

## Separate product deposit-capacity contract

Deposit capacity is **not** 16C withdrawal liquidity / TVL / APY / position value. It is an injected
`yield_strategy_product_capacity_v1` snapshot matched to the exact product (protocol + address + asset),
with modes `explicit_remaining_capacity` / `verified_uncapped` / `deposits_paused` / `product_full` /
`unavailable` / `unknown` / `invalid`. `verified_uncapped` uses **lane capital** as the ceiling (never
serializes Infinity). Capacity freshness reuses the lane market-data bounds (buffer 15m / excess 60m);
stale/future/missing/unknown/paused/full fail closed. Capacity never approves a product, alters
eligibility, or changes the comparison leader.

## Deterministic lane priority & one plan

Both lanes are evaluated independently; priority is **Safety Buffer Yield > Excess USDC Yield**. If the
buffer lane is plan-ready it is selected and an otherwise-ready excess lane is
`suppressed_by_higher_priority_lane`. If buffer is not ready, excess may proceed independently (a missing
buffer leader / unavailable buffer product / tied buffer comparison does **not** block a valid excess
plan; an incomplete Safety Buffer blocks both via the 16F capital snapshot). At most **one** plan is
created; lane capacities share the same direct-wallet USDC source and are **never added** —
`sharedSourceResolvedBySinglePlan: true`.

## Start vs add

From the 16F leader-position status: `leader_not_held` → `start_new_position`; `leader_held` /
`leader_held_multiple_positions` → `add_to_existing_strategy` (multiple accounts noted, none selected);
`leader_position_ambiguous` / `leader_position_unavailable` → the lane is blocked. No-switch policy: the
only funding source is `direct_wallet_usdc` — an existing position is never withdrawn, migrated,
consolidated, or used as funding (switching is Step 19).

## Minimums

Excess reuses the canonical **$250** (`DCA_EXCESS_USDC_TRIGGER_USD`): $250.00 qualifies, $249.99 does
not; a product minimum may require more. **No canonical Safety-Buffer-Yield deposit minimum exists** —
the repo's $50 is contribution/DCA-scoped and is **not** reused — so the buffer lane fails closed with
`buffer_yield_minimum_policy_missing` (excess planning still proceeds) unless a future canonical buffer
minimum is explicitly supplied.

## Amount constraints & flooring

`effectiveMaximumUsd = min(laneCapital, directLiquidUsdc, maximumCombinedSourceCapital, lane sub-caps,
effective product capacity, product maximum)`; `effectiveMinimumUsd = max(laneMinimum, productMinimum)`;
`candidateAmountUsd = floorToExactCents(effectiveMaximumUsd)` (reused Step-15 cents floor, never rounds
up). A plan is ready only when `candidateAmountUsd >= effectiveMinimumUsd`. Buffer sub-caps:
`remainingBufferYieldCapacityUsd`; excess sub-caps: `canonicalBufferSurplusUsd`. Existing vault shares
are never funding.

## Projection & Safety Buffer preservation

Deterministic before/after only — no expected earnings / APY multiplication / future value. Buffer plan:
direct-wallet eligible buffer ↓ by amount, existing eligible buffer-yield ↑ by amount, current eligible
buffer unchanged. Excess plan: if the leader is (16D) buffer-eligible its value may count toward eligible
buffer yield; if excess-only it does not — and projected current eligible buffer must stay ≥ required.
Validators reject any plan projecting the Safety Buffer below required or the direct wallet below the
required floor.

## Stable plan IDs

`ysplan_<fnv1a>` over the canonical decision identity — plan/selection/comparison/capital/capacity policy
versions + owner + lane + action mode + strategy id + exact product address + amount cents. Excludes
`generatedAt`/`checkedAt`/`ageMs`/warnings/diagnostics/UI copy: the same material plan re-evaluated
yields the same id; a material change (lane / action / strategy / product / amount cents / policy
version) changes it. No random UUIDs.

## Production, Steakhouse, Hubble

Production has zero approved products / zero comparison leaders, so the decision is **no_plan** (no
product, no amount, no invented address/capacity). A runtime-detected undocumented Steakhouse position
cannot be selected, cannot produce an add plan, and does not mutate the registry. Hubble stays in scope
with no name penalty; its debt/CDP is never a destination; a future exact approved Hubble yield product
plans only through this same pipeline.

## Boundaries

No suggestion · no product-output update · no UI/`/testing` · no deep link · no transaction payload /
instruction · no execution prepared · no wallet signature.

## Full flow

```
16A policy + 16B registry + 16C market data + 16D eligibility + 16E comparison + 16F positions & capital
+ 16G deterministic read-only plan
→ 16H product integration
```
