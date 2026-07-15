# Contribution-Planning Policies (Step 15C)

Deterministic, versioned POLICY layers that configure the generic investment-target registry so a
LATER allocation-gap engine can evaluate a target. They answer *"is the target's policy
configuration complete enough to be evaluated?"* — never *"should this user buy SOL now?"*.

Backed by:
- [`contributionPlanningPolicyTypes.ts`](./contributionPlanningPolicyTypes.ts) — versions, IDs, statuses, blockers.
- [`growthTargetAllocationPolicy.ts`](./growthTargetAllocationPolicy.ts) — stable/growth bucket adapter.
- [`dcaMinimumPolicy.ts`](./dcaMinimumPolicy.ts) — minimum-size + trigger policy.
- [`contributionTargetSuitability.ts`](./contributionTargetSuitability.ts) — profile-level suitability.
- [`contributionPricePolicy.ts`](./contributionPricePolicy.ts) — price contract + freshness.
- [`contributionTargetPolicyEligibility.ts`](./contributionTargetPolicyEligibility.ts) — combined readiness.

## Existing target-allocation engine is the source of truth

Target allocation is owned by the EXISTING engine `wallet/recommendedAllocation.ts`
(`deriveRecommendedAllocation` → `RecommendedAllocation.stablePct/cryptoPct`, risk-based, engine
version `suggestion-engine-mvp-v1`). This step does NOT reproduce the allocation matrices and does
NOT recalculate — `growthTargetAllocationPolicy` consumes the engine's exact percentages and maps:

- **stable bucket → USDC**
- **growth bucket → the single enabled growth contribution target (SOL today)**

Example: engine `targetStablePct 40 / targetVolatilePct 60` → `usdc: 40`, `sol: 60`. Values are
preserved exactly (never rounded); invalid engine output fails closed.

### Why the mapping is temporary + versioned

SOL is currently the ONLY enabled growth contribution target, so the MVP policy maps the whole
growth bucket to SOL. This is **not** "SOL owns 100% of growth forever." When BTC, ETH, or a
specific approved RWA becomes enabled, a NEW versioned growth sub-allocation policy is required. If
more than one growth target is enabled without such a policy, the adapter **fails closed**
(`multiple_growth_targets_require_suballocation_policy`) — it never divides the bucket equally or
invents weights.

## Safety Buffer is a separate dollar floor

The Safety Buffer is NOT part of this percentage adapter. It is a separate minimum-dollar floor a
LATER contribution planner must preserve before deploying to SOL. Step 15C evaluates no buffer.

## DCA minimum + trigger policy (`dca_minimum_v1`)

- **$50 absolute minimum** meaningful suggestion (`DCA_ABSOLUTE_MINIMUM_SUGGESTION_USD`, equal to
  the existing engine constant `MIN_DCA_SUGGESTION_USD`; the engine already suppresses sub-$50, e.g.
  a $30 amount).
- **$250 excess-USDC DCA trigger** (`DCA_EXCESS_USDC_TRIGGER_USD`) — a separate check for
  excess-USDC plans.
- **5-percentage-point underweight trigger** (`DCA_UNDERWEIGHT_TRIGGER_PERCENTAGE_POINTS`).
- **Zero target overshoot** (`DCA_MAX_TARGET_OVERSHOOT_PERCENTAGE_POINTS`).

The evaluator accepts a hypothetical amount for fixtures/diagnostics only; it reads no portfolio,
evaluates no buffer/gap, and generates no plan.

### The older "$50 OR 0.25% of portfolio" reference

A repository search found NO canonical implementation of a 0.25%-of-portfolio rule. It is
documented here as an UNRESOLVED execution/materiality rule that Step 15C does **not** enforce and
does **not** reinterpret as `max($50, 0.25%)` / `min($50, 0.25%)` or a replacement for the $250
excess-USDC trigger. `DCA_QUARTER_PERCENT_RULE_ENFORCED = false`.

## SOL suitability without duplicating allocation logic (`sol_growth_suitability_v1`)

`contributionTargetSuitability` reuses the existing allocation result — it does NOT add a second
risk matrix and does NOT independently ban Very Low risk / short (6-month) horizon / Big Purchase
goal. The existing stable/volatile engine already reduces growth exposure for those inputs. When the
engine returns a POSITIVE growth allocation for the target, and the profile inputs resolve to the
recognized onboarding IDs, the target is `suitable_for_gap_evaluation` — meaning ONLY "the later
allocation-gap engine may consider it," never "buy SOL". A zero growth allocation, an unrecognized
profile, or a disabled target fails closed. BTC/ETH remain disabled and fail closed; each future
target needs its own suitability policy key.

## Price contract + freshness (`contribution_price_freshness_v1`)

`contributionPricePolicy` defines a validated price-quote shape and evaluates freshness/provenance —
it fetches nothing. **Price source order** (approved, non-browser-provider): (1) the
backend-normalized portfolio/token USD valuation, (2) the canonical internal token-price service
(`wallet/tokenPrices.ts`, behind which DefiLlama/Jupiter sit — never called from React for
contribution pricing), (3) a same-origin sanitized runtime payload. The canonical SOL source id is
`token_price_service`. A SOL price must be finite, > 0, from an approved source, with valid
`fetchedAt`/`checkedAt`, not in the future beyond a small clock-skew tolerance, and no older than
**60 minutes** (`SOL_CONTRIBUTION_PRICE_MAX_AGE_MS`; there is no stricter canonical constant to
reuse). A browser-fetched external-provider price is rejected. **USDC** funding uses the portfolio's
existing normalized USD valuation — it is not blindly hardcoded to $1 when a real normalized price
exists, and does not require a separate growth-target price to classify USDC as a funding source.

## Combined policy readiness

`contributionTargetPolicyEligibility` combines technical eligibility (15A) + allocation + suitability
+ price + minimum policy in strict gate order: invalid input → technical readiness → target
allocation → suitability → price → minimum policy → `ready_for_allocation_gap_evaluation`. Even
`ready_for_allocation_gap_evaluation` does NOT make the target eligible for a suggestion, selected
for a contribution, approved for a DCA plan, or approved for execution. It evaluates no Safety
Buffer, no gap, no amount.

## What this step does NOT do; no product change

No allocation-gap calculation, no underweight determination, no excess-USDC inspection, no
contribution destination decision, no amount, no tranches, no dates, no DCA plan, no suggestion, no
UI, no /testing card, no execution/signatures. It does not change the existing target-allocation
output, Safety Buffer, suggestions, SOL staking, Top Pick, engine ordering, or `selectedProtocolId`.
No product-facing file imports these modules. Feature flags: the five policy layers exist;
`CONTRIBUTION_LIVE_PRICE_FETCH_ENABLED = false`, `CONTRIBUTION_POLICY_UPDATES_PRODUCT_OUTPUT = false`,
and planning/priority/allocation-gap/DCA all remain disabled.

## Future flow

```
Existing target-allocation engine
+ investment-target registry (15A)
+ contribution-planning policies (15C)
+ fresh target prices
+ normalized onboarding contribution frequency (15B)
→ policy-ready investment targets
→ allocation-gap engine (15D)
→ contribution-priority engine
→ funding-source selection
→ deterministic DCA plan
→ suggestion card + modal
→ dedicated /testing scenarios
```
