# Contribution Funding-Source Selection & Availability (Step 15F)

A deterministic, versioned layer that decides, for the current Step 15E priority, which funding
source is usable, each source's mathematical capacity after the Safety Buffer / allocation cap /
minimum policy, and the deterministic primary + alternative source.

Backed by:
- [`contributionFundingTypes.ts`](./contributionFundingTypes.ts) — versions, statuses, blockers, source/liquidity shapes.
- [`contributionFundingPolicy.ts`](./contributionFundingPolicy.ts) — source order + tolerances (reuses the $50/$250 minimums).
- [`contributionFundingAvailability.ts`](./contributionFundingAvailability.ts) — upcoming capacity, liquidity, excess USDC, existing-excess source.
- [`contributionFundingSelection.ts`](./contributionFundingSelection.ts) — orchestration + validators.
- [`contributionFundingDiagnostics.ts`](./contributionFundingDiagnostics.ts) — neutral, non-advisory diagnostics.

It calculates NO final contribution/DCA amount, NO tranches/dates, NO residual routing, NO
allocation across targets, NO final target, NO plan/suggestion, and NO product UI.

## Two sources, two timings

- **Upcoming contribution** (`timing: expected_future`) — planned future funding from the user's
  onboarding contribution frequency (Step 15B) or an explicit current amount. It is NOT available
  now, liquid now, or a wallet balance.
- **Existing excess USDC** (`timing: available_now`) — currently liquid USDC above the canonical
  Safety Buffer, from the canonical liquidity snapshot.

Neither source is moved or reserved by Step 15F. Source order is fixed —
`[upcoming_contribution, existing_excess_usdc]` — because WealthSmith follows the user's onboarding
contribution size/frequency before considering existing capital. Mixed funding is disabled; sources
are never combined.

## Upcoming-contribution capacity

From an explicit current amount (finite, ≥ 0, ≤ 2 decimals; carries a `user_entered` / `detected` /
`test_fixture` note and is never treated as transferred), or the Step 15B normalization:

- **Fixed, zero-cent remainder** → exact capacity (e.g. monthly $1,000 → $1,000; quarterly $3,000).
- **Fixed, non-zero remainder** → a `base…base+1¢` **range** (e.g. biweekly $461.53–$461.54, weekly
  $230.76–$230.77); Step 15F never picks which contribution gets the extra cent and never invents an
  exact amount.
- **Occasional without an explicit amount** → `requires_explicit_amount` (no invented capacity).

The gross is then **capped** by the priority cap and tested against the minimum.

## Canonical liquidity classification

Liquidity comes from a narrow adapter snapshot populated by canonical upstream classification — never
inferred from token symbols or protocol names, never fetched here. Only `liquid_now` USDC counts as
available now; `requires_withdrawal`, `locked`, `reserved`, `unavailable`, and `unknown` do not. A
`wallet_balance` position is not automatically liquid, and a `protocol_position` may be `liquid_now`
only when upstream says so. Position IDs must be unique; a stale/invalid snapshot fails closed. No
withdrawal is initiated.

## Buffer surplus & excess liquid USDC

Using only the canonical values Step 15E preserved (never recomputing which holdings qualify):

```
canonicalBufferSurplusUsd = max(0, currentEligibleBufferUsd − requiredBufferUsd)
excessLiquidUsdcAboveBufferUsd = min(liquidUsdcAvailableNowUsd, canonicalBufferSurplusUsd)
projectedEligibleBufferAfterMaximumExcessUseUsd = currentEligibleBufferUsd − excess   (≥ required)
```

This is **NOT** `liquidUsdc − requiredBuffer`, which is wrong when the eligible buffer holds other
qualifying stable positions (non-liquid buffer positions support the floor without becoming funding).
Worked: $12k eligible / $9k required / $5k liquid → surplus $3,000, excess $3,000; with $1k liquid →
excess $1,000; $9k eligible / $9k required → excess $0.

## Per-priority source behavior

| Priority | Upcoming contribution | Existing excess USDC |
|---|---|---|
| **Safety Buffer** | capped at the canonical shortfall; **no** $50 minimum; any positive capacity eligible | not applicable — no excess exists while the buffer is incomplete |
| **Stable allocation** | capped by the stable target's Step 15D external cap; $50 minimum | not applicable — moving USDC→USDC can't correct a USDC shortfall (`same_asset_cannot_correct_allocation`) |
| **Growth allocation** | capped by the external cap; $50 minimum; **primary** | excess above buffer capped by the Step 15D internal cap; $250 threshold; **alternative** |
| **On Track** | not selected | not selected |

Caps are applied without residual routing: when gross exceeds the cap it is capped and a
`source_capacity_exceeds_priority_cap` warning is set — no unused amount, remainder, or next
destination is computed. The exact-target cap is not treated as an overshoot.

### Minimum (exact vs range)

Exact capacity is compared directly to the minimum. For a range: both capped bounds pass →
`eligible_range`; both fail → `ineligible_below_minimum`; lower fails while upper passes →
`requires_exact_amount` (`contribution_amount_requires_exact_resolution`) — the larger amount is
never assumed. Example: $49.99–$50.00 against $50 → `requires_exact_amount`.

## Deterministic selection

The first eligible source in order becomes primary; later eligible sources are alternatives. For
Safety Buffer and stable allocation only the upcoming contribution can be primary. For growth, the
upcoming contribution is primary when eligible and existing excess USDC is retained as an
alternative; existing excess USDC becomes primary only when the upcoming contribution is
unresolved/ineligible and the capped excess passes $250. Largest capacity and highest liquidity never
override source order. On Track selects no source (`no_action_required`).

## Multiple priority targets

The source may be recognized, but Step 15F never allocates it across targets: `applicableTargetIds`
are preserved in policy order, `multiple_priority_targets_require_plan_allocation` is added, and
`targetAllocationAcrossIdsCalculated` stays `false`. No equal weights, no chosen target — the final
allocation belongs to Step 15G.

## Boundaries & future

No final contribution/DCA amount, no residual, no tranches, no dates, no final target, no plan, no
suggestion, no Top Pick / engine-ordering change, no Demo / Real Wallet / `/testing`, no price
fetching, no transactions/signatures. Sources are discovered generically (no hardcoded SOL), so
future native BTC / native ETH / specific approved RWA growth targets consume the same source model
once enabled; generic RWA remains forbidden. No product-facing file imports these modules and no
product engine path invokes them. Feature flags:
`CONTRIBUTION_FUNDING_SOURCE_SELECTION_EXISTS = true`, `CONTRIBUTION_FUNDING_AVAILABILITY_EXISTS =
true`; the mixed-sources / final-amount / residual / plan / suggestion / product-output flags stay
`false`.

## Future flow

```
Step 15B normalized contribution frequency
+ explicit current amount when needed
+ canonical liquid-USDC classification
+ Step 15D mathematical caps
+ Step 15E priority and Safety Buffer
→ Step 15F funding-source selection
→ Step 15G deterministic contribution / DCA plan
→ Step 15H suggestion card, modal, Demo, Real Wallet, and /testing scenarios
```
