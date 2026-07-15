# Contribution-Planning Allocation-Gap Engine (Step 15D)

A deterministic, versioned, asset-agnostic engine that compares a canonical portfolio snapshot
against the Step 15C target-allocation policy and reports, per mapped target, the **mathematical**
allocation gap and the **mathematical** caps to reach target.

Backed by:
- [`contributionAllocationGapTypes.ts`](./contributionAllocationGapTypes.ts) — versions, statuses, blockers, snapshot/result shapes.
- [`contributionAllocationGapPolicy.ts`](./contributionAllocationGapPolicy.ts) — tolerances + classification (reuses the 5-pp trigger).
- [`contributionAllocationGapEngine.ts`](./contributionAllocationGapEngine.ts) — the engine, projections, validators.
- [`contributionAllocationGapDiagnostics.ts`](./contributionAllocationGapDiagnostics.ts) — neutral, non-advisory diagnostics.

## Critical boundary

Step 15D **may** calculate mathematical allocation gaps and mathematical caps. It **must not**
calculate available funding, deployable capital, a suggested contribution, or a suggested DCA
amount — those require the LATER Safety Buffer, contribution-priority, and funding-source layers. It
selects no target, applies no contribution frequency, generates no plan/suggestion, changes no
product output, and enables no execution/signatures. Non-UI mathematical foundation only.

## Canonical portfolio denominator

The allocation denominator is the SAME total the existing portfolio engine uses (the sum of priced
positions, `deriveValueBreakdown().totalUsd` / `totalPricedUsd`). Percentages are **never** computed
from only SOL + USDC, only enabled targets, only mapped target values, or only liquid balances.
Unknown, unsupported, long-tail, manually entered, staked, and protocol-position value all remain in
`totalPortfolioValueUsd`.

```
Portfolio: SOL $4,000 · USDC $4,000 · BONK $2,000  → total $10,000
SOL current allocation = 4,000 / 10,000 = 40%   (NOT 4,000 / 8,000 = 50%)
```

The engine decomposes the denominator without dropping anything:

- `mappedTargetValueUsd` — exposure for target IDs present in the target-allocation policy.
- `registeredNonTargetValueUsd` — exposure for registry targets NOT in the policy (e.g. a disabled
  BTC holding).
- `unmappedOtherValueUsd` = total − mapped − registeredNonTarget (BONK and any asset without an
  exposure entry). May be zero; a tiny negative float clamps to zero; a materially negative value
  fails closed (`target_values_exceed_portfolio`). Its composition is never inferred and it is never
  treated as available funding.

## Economic exposure & no double-counting

The engine consumes ALREADY-aggregated `valueUsd` per target from the snapshot adapter — it never
re-derives value from raw positions. Upstream, SOL economic exposure folds liquid SOL, native stake,
and supported LSTs (JitoSOL/JupSOL/mSOL/bSOL/…) counting each position **once** (see
[`duplicateExposure.ts`](./duplicateExposure.ts) for the canonical grouping). USDC/stable exposure
may include protocol-deposited USDC when the portfolio model includes it — that does **not** make it
liquid, withdrawable, or available; funding availability stays unevaluated. Because no canonical
single "target-level economic exposure" function exists yet, the snapshot is a narrow **adapter
contract** consuming normalized values; it is not wired into product code in this step.

## Formulas

For total portfolio `P > 0`, target value `V`, target fraction `t = targetPct / 100`:

```
currentPct                        = V / P × 100
signedGapPercentagePoints         = targetPct − currentPct        (positive = underweight)
staticTargetValueAtCurrentTotal   = P × targetPct / 100
signedStaticGapAtCurrentTotal     = staticTargetValue − V
```

Classification (shared 1e-9 tolerance; **no** extra "near target" band): underweight when
`signedGap > tol`, overweight when `−signedGap > tol`, else at-target. The **5-percentage-point**
underweight trigger is reused from `dcaMinimumPolicy.ts` (`signedGap + tol >= 5`).

### Internal reallocation vs external contribution — why they differ

A transfer from an existing asset into the target keeps total value **constant**. A new external
contribution grows **both** the target value and the total. So the two gaps are not equal:

```
internalReallocationUsdToReachTarget = staticTargetValue − V        (total unchanged)
externalContributionUsdToReachTarget = (t·P − V) / (1 − t)          (total grows with new money)
```

Worked example — `P = $10,000`, `V (SOL) = $4,000`, `targetPct = 60%`:

```
Internal: ($10,000 × 60%) − $4,000 = $6,000 − $4,000 = $2,000
          → ($4,000 + $2,000) / $10,000 = 60% ✓
External: (0.60 × 10,000 − 4,000) / (1 − 0.60) = 2,000 / 0.40 = $5,000
          → ($4,000 + $5,000) / ($10,000 + $5,000) = 60% ✓
```

The static $2,000 gap is **never** used as the external-contribution amount. External results are
reconstruction-validated to hit the target within tolerance and are never rounded (rounding is a
future presentation concern).

Edge cases: at/above target → external `0`; `targetPct = 0` → no increase allowed; `targetPct = 100`
→ `0` only if already the whole portfolio, otherwise no finite external solution
(`external_target_unreachable_at_100_percent`, value left undefined).

## Mathematical caps ≠ available funding

```
maximumInternalReallocationIncreaseWithoutOvershootUsd = max(0, internalReallocationUsdToReachTarget)
maximumExternalContributionIncreaseWithoutOvershootUsd = max(0, externalContributionUsdToReachTarget)
```

These are allocation caps only — "internal-reallocation cap before target" and
"external-contribution cap before target" in diagnostics. They are never labelled available,
deployable, investable, suggested, or approved, and consider no Safety Buffer, liquid USDC,
contribution budget/frequency, fees, minimum size, priority, source liquidity, or withdrawal
restrictions.

## Empty portfolio

When `totalPortfolioValueUsd = 0`: status `empty_portfolio`, `emptyPortfolio: true`,
`currentAllocationCalculated: false`, blocker `empty_portfolio_requires_initial_allocation_plan`. No
division by zero, no meaningful 0% current, no single-target external gaps, no invented split, no SOL
selection. A later initial-contribution planner may split a NEW contribution across the target
percentages — 15D does not. A negative total is invalid.

## Hypothetical projections

`projectContributionAllocationAfterHypotheticalIncrease` runs only for an EXPLICITLY supplied amount.
External: total and target both grow by the amount. Internal: total constant, target grows, and the
amount may not exceed the aggregate value held outside the target (a mathematical bound that
identifies no source asset and confirms no liquidity). Overshoot is `projectedTargetPct > targetPct +
tol`; the exact target amount is not an overshoot. The projection preserves
`fundingAvailabilityEvaluated / safetyBufferEvaluated / sourceAssetSelected / planGenerated /
suggestionGenerated = false`.

## Targets: current & future

MVP: stable bucket → USDC, growth bucket → SOL (the only enabled growth target). SOL gap results are
marked eligible for future growth-contribution evaluation only when the Step 15C policy eligibility
is `ready_for_allocation_gap_evaluation`; otherwise the analysis is `blocked_policy_readiness`. USDC
gets a full gap context but is never a growth candidate. A calculated underweight is a mathematical
gap, never a recommendation or a selection.

The engine does not hardcode SOL and does not assume Solana-wallet holdings. Native BTC / native ETH
(native-chain asset ids, never wrapped) and specific approved RWA products become computable once a
versioned sub-allocation policy supplies their percentages; disabled targets may sit in the
denominator as holdings but never enter the trigger arrays until a future version enables and
configures them.

## No ranking / no selection

Target results follow the exact allocation-policy order; the `underweight` / `triggerMet` /
`overweight` / `atTarget` ID arrays preserve that order. The engine never sorts by gap size, never
picks the most underweight target, and selects nothing. Priority and selection come later.

## What this step does NOT do

No Safety Buffer, no excess-USDC calculation, no funding-source decision, no liquidity/availability
judgement, no target selection, no contribution frequency, no amounts, no tranches, no dates, no DCA
plan, no suggestion, no Top Pick / engine-ordering change, no cards or modal, no `/testing`, no
Demo/Real Wallet change, no price fetching, no transactions/signatures. No product-facing file
imports these modules and no product engine path invokes the engine. Feature flags:
`TARGET_ALLOCATION_GAP_ENGINE_EXISTS = true`; `…UPDATES_PRODUCT_OUTPUT / …SELECTS_TARGET /
…EVALUATES_FUNDING / …EVALUATES_SAFETY_BUFFER = false`.

## Future flow

```
Canonical portfolio valuation
+ economic-exposure aggregation
+ Step 15C target-allocation policy
+ Step 15C target readiness
→ Step 15D allocation gaps
→ Step 15E Safety Buffer and contribution priority
→ Step 15F funding-source selection
→ Step 15G deterministic contribution / DCA plan
→ Step 15H suggestion card, modal, Demo, Real Wallet, and /testing
```
