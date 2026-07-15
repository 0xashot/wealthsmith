# Contribution Plan Product Integration (Step 15H)

Connects the deterministic 15A–15G pipeline to the real product. **Engine = Brain, UI = Renderer,
Smith AI = Voice**: the engine owns every value (trigger, target, amount/range, cadence, funding
source, projection, priority, Top-Pick eligibility, guardrails); the UI only maps a structured
payload into approved templates and never recalculates. Read-only, non-custodial — no
execution/signatures.

> **Status.** This step's ENGINE layer (adapters, pipeline, plan→suggestion mapping + dedup/merge,
> presentation + review-details data, 30 /testing scenario runners, plan-ID stabilization, feature
> flags, fixtures) is complete and verified (tokens/tsc/build/fixtures green). The shared React
> card/modal wiring, the `/testing` route, the Demo/Real-Wallet hooks, and the required manual
> browser validation are the follow-up.

## Modules

- [`contributionIntegrationTypes.ts`](./contributionIntegrationTypes.ts) — versions, pipeline result, the structured `ContributionPlanSuggestionData` payload.
- [`contributionPortfolioAdapter.ts`](./contributionPortfolioAdapter.ts) — canonical portfolio → 15D snapshot.
- [`contributionLiquidityAdapter.ts`](./contributionLiquidityAdapter.ts) — canonically-classified USDC → 15F liquidity snapshot.
- [`contributionPriceAdapter.ts`](./contributionPriceAdapter.ts) — canonical price infra → 15C price quote.
- [`contributionPlanPipeline.ts`](./contributionPlanPipeline.ts) — the end-to-end orchestration.
- [`contributionPlanSuggestion.ts`](./contributionPlanSuggestion.ts) — plan → `EngineSuggestion` + dedup/merge.
- [`contributionPlanPresentation.ts`](./contributionPlanPresentation.ts) — deterministic card copy.
- [`contributionPlanReviewDetails.ts`](./contributionPlanReviewDetails.ts) — shared-modal review sections.
- [`contributionTestingScenarios.ts`](./contributionTestingScenarios.ts) — the 30 /testing scenarios.

## Plan identity stabilization

Step 15G's plan id previously mixed the refresh-prone `checkedAt`. It now uses a stable canonical
financial identity: plan policy version + priority/funding policy versions + purpose + funding
source + target id + amount cents (or range cents) + the allocation snapshot id/version + the
contribution-frequency result identity. `generatedAt`/`checkedAt` are excluded, so an ordinary UI
rerender keeps the same card id; a genuinely different portfolio snapshot (a new `sourceSnapshotId`)
intentionally changes it.

## Suggestion-family mapping

| 15G kind | Category | Reason (single primary) | Id |
|---|---|---|---|
| `safety_buffer_contribution` | `buffer` (existing family) | `buffer_low` | `top_up_buffer` |
| `stable_allocation_contribution` | `dca` (optimization tier) | `stable_target_underweight` | `contribution_stable_<t>` |
| `growth_recurring_contribution` | `dca` | `growth_target_underweight` | `contribution_dca_<t>` |
| `growth_excess_usdc_dca` | `dca` | `growth_target_underweight` | `contribution_dca_excess_<t>` |

The engine has no `optimization` category — `dca` **is** the optimization tier. Funding source is
CONTEXT in the payload, never a second primary reason (one suggestion = one primary reason).

**Buffer dedup:** the plan-backed buffer suggestion enriches/replaces the existing buffer suggestion
by category (one buffer card; category + Top-Pick behavior preserved). **DCA dedup:** the legacy
`dcaSuggestion` is dropped when a plan-backed DCA exists (one DCA per target/plan). Blocked/no-action
pipelines change the list nothing.

## Ordering & Top Pick (reused, never rebuilt)

Global priority stays `CATEGORY_PRIORITY` (buffer 1 → rebalance 2 → capital_efficiency 3 → … → dca
7). Buffer override is absolute; Rebalance and Capital Efficiency outrank DCA/contribution; the
existing `selectTopPick` sets exactly one Top Pick; the frontend does not reorder. A blocked plan
never enters Top Pick.

## Canonical adapters

- **Portfolio:** reuses `deriveValueBreakdown` (total denominator), `deriveStableValue` (USDC
  exposure), and the `duplicateExposure` SOL grouping (native stake + LSTs counted once; no
  receipt/underlying double-count). Unknown value (BONK) stays in the denominator, unassigned.
- **Liquidity:** wraps canonically-classified USDC positions; only `liquid_now` counts;
  requires-withdrawal / locked / reserved / unavailable / unknown do not; never inferred from
  symbol/protocol/source. Upcoming plans work when liquidity is unavailable; only the excess-USDC
  alternative needs a valid current snapshot.
- **Price:** builds the 15C quote from the internal token-price service / backend-normalized USD /
  same-origin payload; **no** browser provider fetch; 60-minute freshness; Safety Buffer needs no
  SOL price.

**Real Wallet** uses only real positions/profile/prices — no fixture fallback (adapters reject
fixture data in `real_wallet` mode). **Demo** uses the canonical Demo fixture only, in `demo_fixture`
mode. Missing real data yields a typed unavailable/blocked result — never a fake amount, a zero
substitute, or a false On Track.

## Card & review copy (deterministic)

Titles: "Top Up Your Safety Buffer" · "Direct Your Next Contribution to USDC" · "Gradually Build
Your SOL Allocation" · "Stage USDC Into SOL". Descriptions use engine values only; percentage-point
gaps say "percentage points". Tags: Safety First / Allocation / DCA. CTA "Review Plan" opens only the
shared review modal. No "best/guaranteed/risk-free/safest/winner", no price prediction, no promised
token quantity, no implied transfer.

The review modal (shared, not a new component) renders summary, why, cadence, a 4-step schedule with
RELATIVE labels ("Start", "Day 5", "Day 9", "Day 14") — no calendar dates, allocation impact, Safety
Buffer (with explicit "Preserved" for excess-USDC), funding source, an alternative source as context
only (no source switcher, no second plan), and material unallocated capacity ("Not allocated by this
plan"). Exact read-only notice: *"Read-only plan. WealthSmith does not move funds or request a
signature. You choose whether to continue in your wallet or another app."* Only action: "Close".

## Blocked-state suppression & Demo default

Blocked plans (stale/unavailable price, stale liquidity, occasional-without-amount, below-min,
multiple targets, invalid portfolio, duplicate exposure, missing frequency) generate no product
suggestion and never enter Top Pick; diagnostics remain available to /testing. The default Demo
(SOL $5,500 · BONK $1,200 · USDC $800; 3-month medium buffer = $3,000 required vs $800 eligible)
leaves the buffer incomplete → the buffer suggestion is enriched with the plan-backed next
contribution; **no** SOL DCA appears before the buffer completes; one buffer card only.

## Future flow

```
Step 15B contribution-frequency normalization + 15C policies + 15D gaps + 15E priority + 15F funding
→ Step 15G deterministic read-only plan
→ Step 15H product integration (this step): shared card + review modal, Demo, Real Wallet, /testing
```

Execution stays external and user-initiated. Next: Step 16 — stable USDC yield strategies, same
deterministic, versioned, read-only architecture.
