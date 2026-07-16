# Stable Yield Suggestion Integration (Step 16H-A)

Converts a **Step 16G ready plan** into a deterministic, read-only Suggestion Engine suggestion
(category `stable_yield`) and wires it into engine ordering + Top Pick. **Engine-only** — no card, review
modal, Demo/Real-Wallet UI, or Smith AI yet (later 16H steps).

Backed by:
- [`yieldStrategyPlanSuggestionTypes.ts`](./yieldStrategyPlanSuggestionTypes.ts) — versions, the metadata contract, the diagnostic.
- [`yieldStrategyPlanSuggestion.ts`](./yieldStrategyPlanSuggestion.ts) — `buildStableYieldPlanSuggestion(decision, opts)` + validator.
- `engine.ts` (4th optional param), `engineTypes.ts` (reason codes + optional `stableYieldPlan` field).

## 16G plan is the sole source of truth

The converter re-selects no product, recalculates no amount, chooses no lane/strategy, falls back to no
second-place candidate, and infers no APY/capacity/minimum. It never alters the plan ID or a projection,
generates no user-facing copy (only copy KEYS), and creates no execution data. Every material value —
lane, action mode, exact product identity, amount (USD + cents), funding source, capacity, before/after
projection, comparison-leader reason, policy versions — is copied **verbatim** from the plan into the
suggestion's `stableYieldPlan` metadata.

## Plan → suggestion mapping

| Plan field | Suggestion |
|---|---|
| `planId` | `stableYieldPlan.sourcePlanId`; suggestion `id = sy_plan_<planId>` (stable across timestamps) |
| `lane` | `stableYieldPlan.lane`; reason code `stable_yield_buffer_lane_ready` / `stable_yield_excess_lane_ready` |
| `actionMode` | `stableYieldPlan.actionMode` (start / add) |
| strategy/protocol/address/asset | preserved verbatim |
| `amountUsd` / `amountCents` | `amount.valueUsd` + `stableYieldPlan.amount*` |
| `source` | `from.bucket = "stables"`, `fundingSource = "direct_wallet_usdc"` |
| `projection` | copied verbatim (buffer + wallet-floor preservation flags) |
| capacity mode / bounds | preserved verbatim |
| APY | present **only** when `apyProvenance` is supplied from approved upstream data (never inferred) |

## Primary reason (singular)

Exactly one reason code per lane — buffer: *buffer funds can earn yield while preserving the required
buffer*; excess: *excess direct-wallet USDC is eligible for a vetted stable-yield strategy*. Reasons are
never stacked.

## Suppression (no suggestion) + diagnostics

A suggestion is emitted **only** for `decision.status === "ready"` with a valid selected plan. Every
other case (no_plan / blocked / no leader / tie / sensitivity / incomparable / stale / missing capacity /
paused / full / unknown / invalid capacity / missing buffer minimum / below $250 / ambiguous or
unavailable leader position / no approved product) returns `suggestion: null` with a deterministic
`StableYieldSuggestionDiagnostic` recording `emitted`, `suppressionStage` (`planning` /
`suggestion_conversion` / `none`), the most specific `reason`, both lane statuses, actionability, and
Top-Pick eligibility. Diagnostics are structured — never surfaced directly as user copy.

## Ranking category & Top Pick

The suggestion uses the canonical **`stable_yield` category (CATEGORY_PRIORITY = 6)** for both lanes; the
lane (buffer vs excess) is recorded in metadata. Resulting placement: `buffer(1) > rebalance(2) >
capital_efficiency(3) > trim(4) > staking(5) > stable_yield(6) > dca(7) > position_optimization(8)`. So
an underfunded-buffer correction (the engine's buffer override) and any rebalance both continue to
outrank Stable Yield, and Rebalance suppresses Stable Yield exactly as the legacy rule does (the
plan-backed suggestion occupies the same `!rebalance` slot and **suppresses the legacy "Put Stablecoins
to Work" rule** — one stable-yield card per run). `selectTopPick` marks exactly one eligible actionable
winner; a non-actionable suggestion is never Top Pick; the same input always yields the same order + Top
Pick.

## Read-only / non-custodial boundary

`action_kind: "review_only"`, `readOnly: true`, `externalManagementRequired: true`. No execution payload,
transaction, prepared transaction, signature request, deposit/withdrawal execution, migration, switching,
automatic routing, one-click action, or custody. `updatesProductOutput` / `executionPrepared` /
`transactionBuilt` / `transactionsEnabled` / `walletSignatureRequired` all false. No misleading CTA.

## Production behavior

No Stable Yield products are approved → Step 16G returns `no_plan` → the converter returns
`suggestion: null` → the engine caller passes `null` → **no Stable Yield suggestion is emitted**, and the
production registry is never mutated. Fixtures inject synthetic approved products/leaders/capacities.

## Feature flags

True: `STABLE_YIELD_SUGGESTIONS_EXIST`, `STABLE_YIELD_SUGGESTION_CONTRACT_EXISTS`,
`STABLE_YIELD_PLAN_TO_SUGGESTION_EXISTS`, `STABLE_YIELD_SUGGESTION_PARTICIPATES_IN_ORDERING`,
`STABLE_YIELD_SUGGESTION_TOP_PICK_ELIGIBLE`. False: card / review modal / UI integration / Demo UI /
Real-Wallet UI / Smith-AI / execution / transaction construction / signature flow. (The **plan** layer
still generates no suggestion — the converter does — so `STABLE_YIELD_PLAN_GENERATES_SUGGESTION` stays
false.)

## Remaining 16H work

- **16H-B** — shared suggestion card + review modal rendering of `stableYieldPlan` (the card mapper).
- Demo Mode + Real Wallet wiring; `/testing` scenarios.
- Smith AI explanation keyed off the reason codes (never generating suggestions).

## Flow

```
16A–16F → 16G ready plan → 16H-A read-only stable_yield suggestion (engine) → 16H-B card/modal → Demo/Real Wallet → Smith AI
```
