# Contribution-Priority & Safety Buffer Gate (Step 15E)

A deterministic, versioned gate that decides the single PURPOSE category with priority before any
contribution amount or funding source is chosen — in the fixed order **Safety Buffer → stable
allocation → growth allocation → On Track**.

Backed by:
- [`contributionPriorityTypes.ts`](./contributionPriorityTypes.ts) — versions, statuses, blockers, the Safety Buffer adapter, contexts, decision shape.
- [`contributionPriorityPolicy.ts`](./contributionPriorityPolicy.ts) — the priority order + tolerances (reuses the 5-pp trigger).
- [`contributionSafetyBufferGate.ts`](./contributionSafetyBufferGate.ts) — the canonical Safety Buffer gate + adapter.
- [`contributionPriorityEngine.ts`](./contributionPriorityEngine.ts) — stable/growth context + the decision + validators.
- [`contributionPriorityDiagnostics.ts`](./contributionPriorityDiagnostics.ts) — neutral, non-advisory diagnostics.

It answers "what category has priority?" — never "how much to invest?", "which balance funds it?",
"how many DCA tranches?", or "what transaction to execute?".

## Canonical Safety Buffer is the source of truth

The Safety Buffer requirement is the existing WealthSmith calculation — risk-based months
(`wallet/safetyBufferTarget.ts`, `RISK_BUFFER_TARGET_MONTHS`) × monthly expenses, via
`deriveSafetyBuffer` (`wallet/walletSummary.ts`). Step 15E **recomputes none of it** and redefines
no qualifying holding. Because the canonical `SafetyBuffer` type carries no policy id/version, a
NARROW adapter (`ContributionSafetyBufferSnapshot`) is populated FROM the canonical result by
`buildContributionSafetyBufferSnapshot`:

```
requiredBufferUsd       ← canonical targetUsd
currentEligibleBufferUsd ← canonical stableUsd
shortfallUsd            ← canonical shortfallUsd ?? max(0, required − current)
status                  ← complete when shortfall ≤ tolerance, else incomplete
sourcePolicyId/Version  ← "wealthsmith_safety_buffer" / "1.0.0"
canonicalCalculationUsed = true
```

No income/expenses/months/coverage math is repeated here, and which holdings qualify for coverage is
unchanged (still the canonical stablecoin + no-debt stablecoin-protocol rule in `deriveStableValue`).

## Priority order & the two kinds of target

`CONTRIBUTION_PRIORITY_ORDER = [safety_buffer, stable_allocation, growth_allocation, on_track]`.

- **Safety Buffer** is a minimum DOLLAR floor and **always overrides** stable and growth allocation.
- **Stable allocation** (USDC) is a percentage portfolio target, evaluated only after the buffer is
  complete.
- **Growth allocation** (SOL today) is a percentage portfolio target, evaluated only after the
  buffer is complete AND no stable target meets the trigger.

Both stable and growth reuse the existing **5-percentage-point** underweight trigger via the Step
15D `underweightTriggerMet` field — no second trigger and no "near target" state is introduced.
**Category priority always overrides gap size**: the engine never compares the largest USD or
percentage gap to decide priority.

## The gate

`evaluateContributionSafetyBufferGate(snapshot)`:

- **incomplete** (`shortfall > tol`) → `lowerPriorityEvaluationAllowed / stableAllocationAllowed /
  growthAllocationAllowed = false`.
- **complete** (`shortfall ≤ tol`) → all allowed.
- **invalid** → fails closed, everything suppressed.

The shortfall must reconcile to `max(0, required − current)`; a complete gate may not carry a
material shortfall; an incomplete gate must carry a positive one.

## Decision tree

| Case | Condition | Purpose |
|---|---|---|
| A | Buffer incomplete | `safety_buffer` (stable + growth suppressed; exact canonical shortfall exposed) |
| B | Buffer complete, stable target meets 5-pt trigger | `stable_allocation` |
| C | Buffer complete, no stable trigger, growth meets 5-pt trigger | `growth_allocation` |
| D | Buffer complete, nothing meets the trigger | `on_track` |

When the buffer is incomplete the engine does **not** require a valid allocation-gap result — an
invalid/missing lower-priority gap can never override the buffer. Worked example: required $9,000,
current $4,000 → $5,000 shortfall → `safety_buffer`, `priorityTargetIds = ["usdc"]` (the canonical
buffer asset, discovered by registry role), `safetyBufferPriorityShortfallUsd = 5000`.

`priorityTargetIds` preserves deterministic allocation-policy order and is **not** a ranking or a
final selection: stable → the trigger-met stable targets; growth → the trigger-met eligible growth
targets; On Track → empty.

## Stable & growth target discovery (registry roles, not hardcoded ids)

Stable destinations come from the registry role `stable_allocation_destination` (USDC today); the
Safety Buffer asset from `safety_buffer_asset` (also USDC). Growth targets come from the enabled
contribution-growth list, and a growth target is eligible only when its 15D result is policy-ready
(`contributionTargetPolicyReady` + `eligibleForFutureGrowthContributionEvaluation`). Percentages and
gaps are never recomputed — the existing classification + `underweightTriggerMet` decide the trigger.

More than one enabled stable destination without a versioned stable sub-allocation policy fails
closed (`multiple_stable_targets_require_suballocation_policy`) — the stable bucket is never split
equally or chosen arbitrarily. Future native BTC / native ETH / specific approved RWA growth targets
appear in the growth context once enabled with valid policies; multiple valid growth ids are
preserved in policy order without ranking. Generic RWA placeholders remain forbidden.

## On Track

`on_track` is an INTERNAL contribution-priority state: the buffer is complete and no stable/eligible
growth target meets the trigger. It creates no user-facing card and does **not** suppress unrelated
future suggestion families — it only means no contribution-allocation correction is currently
prioritized.

## Boundaries — what 15E does NOT do

No contribution frequency is consumed (Step 15B output is not read here); no weekly/biweekly/monthly/
quarterly amount is calculated and Occasional is not inferred. No funding source is selected
(upcoming contribution vs existing excess USDC), no funding availability or excess USDC is
calculated, and no residual is routed after buffer funding. The exact Safety Buffer shortfall may be
exposed (it comes from the canonical result) but no liquid/available/deployable amount is. No final
target is selected, no amount calculated, no DCA plan or suggestion generated, no Top Pick / engine
ordering / Demo / Real Wallet / `/testing` change, and no transactions/signatures. No product-facing
file imports these modules and no product engine path invokes them. Feature flags:
`CONTRIBUTION_PRIORITY_ENGINE_EXISTS = true`, `CONTRIBUTION_SAFETY_BUFFER_GATE_EXISTS = true`; the
priority engine's product-output / funding-source / amount / plan / suggestion flags stay `false`.

## Future flow

```
Canonical Safety Buffer result
+ Step 15D allocation gaps
+ investment-target registry roles
→ Step 15E contribution priority
→ Step 15F funding-source selection and funding availability
→ Step 15G deterministic contribution / DCA plan
→ Step 15H card, modal, Demo, Real Wallet, and /testing scenarios
```
