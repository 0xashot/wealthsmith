# Contribution Plan Product Integration (Step 15H)

Connects the deterministic 15A–15G pipeline to the real product. **Engine = Brain, UI = Renderer,
Smith AI = Voice**: the engine owns every value (trigger, target, amount/range, cadence, funding
source, projection, priority, Top-Pick eligibility, guardrails); the UI only maps a structured
payload into approved templates and never recalculates. Read-only, non-custodial — no
execution/signatures.

> **Status — Step 15 product-complete (read-only MVP).** Engine layer, UI wiring, AND the Demo
> dashboard are complete and browser-validated. Real Wallet: `deriveRailSuggestions(dataMode:
> "real_wallet")` → `deriveContributionSuggestion` → `runSuggestionEngine(inputs, at,
> contributionSuggestion)` → shared card + modal. Demo: `DemoDashboardPage` → `buildDemoContributionRail`
> → the SAME `deriveRailSuggestions(dataMode: "demo_fixture")` against the canonical Demo state →
> exactly one plan-backed Safety Buffer card (Top Pick, "Top Up Your Safety Buffer"), no SOL DCA.
> `/testing` renders all 30 scenarios. Connected-wallet balance/modal QA was NOT performed (no
> connected read-only wallet was available in this environment); all fail-closed integration paths are
> complete (see the manual checklist below).

## Demo dashboard wiring (Step 15H finalization)

- `DemoDashboardPage` default scenario renders `RealWalletSuggestionsRail rail={buildDemoContributionRail()}`.
- `demoContributionScenario.buildDemoContributionRail()` pins the canonical Demo profile
  (Build Long-Term Wealth · Medium · 5-year · income $4,000 · expenses $1,000 · saving goal $1,000 ·
  Monthly) and portfolio (SOL $5,500 · BONK $1,200 · USDC $800) and runs them through the SAME
  `deriveRailSuggestions(dataMode: "demo_fixture")`. The canonical Demo is buffer-incomplete (3-month
  $3,000 target vs $800 eligible → $2,200 shortfall), so the buffer override yields ONE plan-backed
  buffer card (Top Pick). Browser-verified: card + modal show required $3,000 / current $800 / shortfall
  $2,200 / contribution $1,000 / projected shortfall $1,200; Close only; no execution/wallet buttons; no
  TEST FIXTURE badge; no horizontal overflow at 375px. The static `d.right_rail` (BONK trim, Kamino
  yield) is intentionally superseded by the deterministic engine (buffer override).
- Fixture isolation: `demoContributionScenario` imports NO /testing scenarios; adapters reject fixture
  data in `real_wallet` mode; `demo_fixture` price/liquidity classification stays in the demo path.

## Real Wallet price provenance (audit)

Provenance is NEVER assumed from a bare `priceUsd`. `deriveContributionSuggestion` takes an explicit
`priceProvenance.sourceId`; when absent the SOL quote is built with `sourceId: ""` → the evaluator flags
`price_provenance_missing` and the GROWTH pipeline fails closed, while the Safety Buffer plan is
unaffected and no false-zero is produced. `useRailSuggestions` passes `token_price_service` because
real-wallet positions are priced exclusively through `wallet/tokenPrices.ts` (DefiLlama/Jupiter behind
it) — a demonstrable provenance, not a fabricated one.

## Direct-wallet USDC classification (audit)

`isDirectWalletUsdc` classifies USDC `liquid_now` ONLY via the canonical `detection ===
"direct_wallet_balance"` on a `type: "token"` USDC row (never a `protocol` receipt, an `lst`, a stake,
or an unknown/renamed token). The USDC symbol alone never qualifies; anything else is left `unknown`
and is excluded from excess-USDC funding. Upcoming-contribution plans remain usable when liquidity is
unknown; existing-excess-USDC DCA requires explicit `liquid_now` USDC.

## Connected-wallet manual QA checklist (not run in this environment)

Connect a read-only wallet and confirm: real balances only (no fixtures/invented prices); unavailable
data suppresses the plan (never shown as $0); no false On Track; unknown protocol USDC not counted as
liquid; direct wallet USDC classified only via the canonical adapter; Review Plan requests no
signature and prepares no transaction; opening/closing the modal changes no wallet state.

## UI wiring (Step 15H UI turn)

- **Engine merge point:** `runSuggestionEngine(inputs, generatedAt, contributionSuggestion?)` merges a
  `buffer`-category plan (enriches/replaces the buffer suggestion) or a `dca`-category plan (takes the
  DCA slot, suppresses legacy DCA) BEFORE the existing sort + `selectTopPick`. The frontend receives
  already-ordered output and never re-sorts.
- **Real Wallet entry:** `useRailSuggestions.deriveRailSuggestions` builds the plan from live state via
  `contributionProductInput.deriveContributionSuggestion({ dataMode: "real_wallet", … })` and returns
  `contributionReviewById` alongside `reviewDetailsById`.
- **Card:** `toSuggestionCard` detects a plan-backed suggestion (`"contributionPlan" in s`) and renders
  deterministic copy from `buildContributionPlanCardPresentation` (title/description/impact/tag/accessible
  CTA). `SuggestionCard.tsx` renders `card.tag` (neutral badge) and the accessible CTA name; it does no
  arithmetic.
- **Modal:** the shared `SuggestionReviewModal` gained an optional `contributionReview` prop; when set it
  renders the `contributionPlanReviewDetails` sections (summary, why, cadence, a semantic-list 4-step
  schedule with Start/Day 5/Day 9/Day 14, allocation impact, Safety Buffer, funding, alternative-source
  context, unallocated context, exact read-only notice, Close). No new modal component.
- **Direct wallet USDC** is classified `liquid_now` (`detection === "direct_wallet_balance"`); everything
  else is omitted (not claimed liquid). **SOL price** comes from the sourced position `priceUsd` +
  `pricedAsOf` (no browser fetch).
- **Browser validation (dev server, /testing):** 30 scenarios render; T1 "Top Up Your Safety Buffer"
  (Safety First), T3 "Direct Your Next Contribution to USDC" (Allocation), T4/T5 "Gradually Build Your SOL
  Allocation" (DCA), T9 "Stage USDC Into SOL" (DCA); On Track (T11) and blocked (T15/T22) show no card.
  The T9 modal shows the 4-step $425.00 schedule (Start/Day 5/Day 9/Day 14), Safety Buffer "Preserved",
  the exact read-only notice, and Close only (no execution controls); the T5 modal shows the
  "$461.53–$461.54" range. `role="dialog"`/`aria-modal`, Escape closes, one modal at a time. No
  horizontal overflow at 375px; existing staking modal unchanged. Zero console errors.

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
