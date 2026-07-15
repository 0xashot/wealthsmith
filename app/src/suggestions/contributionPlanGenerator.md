# Contribution & DCA Plan Generator (Step 15G)

A deterministic, read-only planning layer that combines Steps 15B–15F into ONE structured
contribution plan. It is the first layer allowed to select the single final target, calculate the
final planned USD amount/range, stage an existing-excess-USDC DCA schedule, and project post-plan
allocation + Safety Buffer progress.

Backed by:
- [`contributionPlanTypes.ts`](./contributionPlanTypes.ts) — versions, statuses, blockers, plan/step/projection shapes.
- [`contributionPlanPolicy.ts`](./contributionPlanPolicy.ts) — plan flags + the v1 staged-DCA policy (offsets [0,5,9,14]).
- [`contributionPlanAmount.ts`](./contributionPlanAmount.ts) — capped capacity → cents, tranches, cadence, unused capacity.
- [`contributionPlanProjection.ts`](./contributionPlanProjection.ts) — external/internal (reused 15D helper) + Safety Buffer projections.
- [`contributionPlanGenerator.ts`](./contributionPlanGenerator.ts) — target selection, orchestration, plan id, validators.
- [`contributionPlanDiagnostics.ts`](./contributionPlanDiagnostics.ts) — neutral, non-advisory diagnostics.

## Source layers

Priority + Safety Buffer (15E), primary funding source + capped capacity (15F), allocation caps +
projection helper (15D), contribution cadence (15B), and $50/$250 minimums (15C) are consumed and
never re-derived. No second allocation-gap / funding-selection / Safety Buffer / frequency-normalizer
/ minimum-size engine is created.

## One deterministic primary plan

The plan uses ONLY the Step 15F primary funding source — never combined with the alternative, never a
second/alternative plan (`alternativePlanGenerated = false`, `mixedFundingUsed = false`). The
alternative funding source ids are copied for a future UI to explain, but do not alter the primary
plan. Same semantic input → same plan (including a deterministic FNV-1a `planId` built from
policy version + purpose + funding source + target + amount cents + source checked-at timestamps;
`generatedAt` is deliberately excluded so identical financial inputs share an id).

## Final target selection

Exactly one target is selected — `priorityTargetIds` must contain exactly one id. Multiple ids fail
closed (`blocked_multiple_targets`, `multiple_priority_targets_require_suballocation_policy`): never
the first id, never split equally, never ranked, never the largest gap, never registry order as an
implicit policy. Roles are validated by purpose: Safety Buffer → `safety_buffer_asset` (USDC); stable
→ `stable_allocation_destination` (USDC); growth → `contribution_growth_target` **and** the 15D
result policy-ready + eligible. A disabled/not-ready growth target is rejected. Future BTC/ETH/specific
approved RWA become selectable via the same role + 15D-eligibility gate; generic RWA stays forbidden.

## Amounts — full capped capacity, floored for caps

The plan uses the FULL capped primary capacity (never a nicer round number, never below the cap,
never above gross capacity or the allocation cap). Exact whole-cent values are preserved; a
cap-constrained fractional-cent value is **floored** (`floor_to_cents_for_cap`) so rounding can never
overshoot the target. A range (base…base+1¢) is preserved; if flooring collapses the bounds to one
cent it becomes exact. Unused source capacity is reported as context only — never routed, no next
purpose selected (`residualRouted = false`).

## Plans by priority

- **Safety Buffer** (`safety_buffer_contribution`): USDC target, upcoming contribution, amount =
  `min(capacity, shortfall)`, no $50 minimum, one step, no tranches, no allocation-gap required.
  Projection is DOLLAR-FLOOR: `projectedEligible = min(required, current + amount)`, shortfall
  recomputed; no amount above the shortfall is routed.
- **Stable allocation** (`stable_allocation_contribution`): stable target, upcoming contribution,
  full capped capacity ($50 already enforced upstream), one step, external-contribution
  (denominator-growing) projection, no overshoot; existing USDC is never the source.
- **Growth recurring** (`growth_recurring_contribution`): growth target, upcoming contribution, full
  capped capacity, one step. The onboarding cadence IS the DCA structure — the individual weekly /
  biweekly / monthly / quarterly / explicit-occasional contribution is **not** split into four extra
  purchases. External projection; no overshoot.
- **Growth excess USDC** (`growth_excess_usdc_dca`): growth target, USDC source, exact capped total
  (already ≥ $250), staged into **4 tranches over 14 days** at relative day offsets **[0, 5, 9, 14]**.
  Internal-reallocation (denominator-constant) projection; Safety Buffer preserved. USD-denominated
  only — no future token quantity, swap output, slippage, fee, route, or protocol.
- **On Track**: `no_action_required` — no plan, no target, no amount, no schedule.

## Staged-DCA policy (v1)

No canonical implemented tranche policy existed, so this formalizes the documented MVP rule:
`EXCESS_USDC_DCA_TRANCHE_COUNT = 4`, `EXCESS_USDC_DCA_DURATION_DAYS = 14`, offsets =
`round(i · 14 / 3)` → `[0, 5, 9, 14]` (start, ~⅓, ~⅔, end). No calendar dates, timezone,
market-timing, or volatility logic — actual calendar anchoring belongs to a later layer. Exact
whole-cent decomposition: `base = floor(total/4)`, the earliest `total % 4` tranches get one extra
cent (e.g. $1,000.01 → $250.01 + $250 + $250 + $250); tranches sum exactly, differ by ≤ 1¢, and each
is ≥ $50 (reused `DCA_ABSOLUTE_MINIMUM_SUGGESTION_USD`).

## Projections

External / internal projections reuse the Step 15D
`projectContributionAllocationAfterHypotheticalIncrease` helper (full precision, no presentation
rounding). External grows the denominator; internal keeps it constant. Ranges are evaluated at both
bounds and the maximum bound may not overshoot. The Safety Buffer projection is **separate**
dollar-floor progress — never portfolio-percentage — even though it also targets USDC.

## Readiness & boundaries

`ready_exact` (one target, one source, exact amount, projections valid) or `ready_range` (valid
eligible range, both bounds valid, exact amount unresolved). Occasional reaches a ready plan only via
an explicit current amount. No suggestion, card/modal copy, Top Pick / engine-ordering change, Demo /
Real Wallet / `/testing` change, price fetch, route/protocol selection, fee/slippage estimate,
transaction, signature, fund reservation/movement, or automation. No product-facing file imports
these modules; no product engine path invokes them. Feature flags: `CONTRIBUTION_PLANNING_EXISTS`,
`DCA_PLAN_GENERATION_EXISTS`, `CONTRIBUTION_PLAN_GENERATOR_EXISTS`, `…_TARGET_SELECTION_EXISTS`,
`…_AMOUNT_CALCULATION_EXISTS`, `…_PROJECTION_EXISTS`, `…_STAGED_DCA_EXISTS = true`; the
suggestion / product-output / execution / automation / mixed-funding / residual / calendar-date flags
stay `false`, and product-facing `CONTRIBUTION_TARGET_SELECTION_ENABLED` / `DCA_SUGGESTION_ENABLED`
stay `false` until Step 15H.

## Future flow

```
Step 15B contribution-frequency normalization
+ Step 15C policies
+ Step 15D allocation gaps
+ Step 15E contribution priority
+ Step 15F funding-source selection
→ Step 15G deterministic read-only plan
→ Step 15H user-facing card, review modal, Demo, Real Wallet, and /testing scenarios
```
