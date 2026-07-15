# Stable Yield Eligibility & Risk Gates (Step 16D)

The deterministic, versioned layer that answers **one** question per lane:

> "May this **exact** strategy proceed to a later (16E) comparison for the Safety Buffer lane, the
> Excess-USDC lane, both, or neither?"

It does **not** answer which strategy is better, which is the leader, how much USDC to allocate, whether
to move an existing position, or whether to generate a suggestion. Those are 16E–16H.

Backed by:
- [`yieldStrategyEligibilityTypes.ts`](./yieldStrategyEligibilityTypes.ts) — versions, lanes, statuses, the blocker vocabulary, the risk-review + result + set contracts.
- [`yieldStrategyRiskReview.ts`](./yieldStrategyRiskReview.ts) — the static product risk-review contract + validators.
- [`yieldStrategyEligibilityPolicy.ts`](./yieldStrategyEligibilityPolicy.ts) — per-lane rules that reuse the canonical thresholds.
- [`yieldStrategyEligibility.ts`](./yieldStrategyEligibility.ts) — the evaluator, the set builder, and the fail-closed validators.
- [`yieldStrategyEligibilityDiagnostics.ts`](./yieldStrategyEligibilityDiagnostics.ts) — diagnostics + `explain` (no recommendation language).

## Four separate concerns

| Layer | Question | File |
|---|---|---|
| Registry (16B) | "What exact product is this?" | `yieldStrategyRegistry.ts` |
| Market data (16C) | "What are its current APY / TVL / liquidity / withdrawal?" | `yieldStrategyMarketData.ts` |
| **Risk review (16D)** | "What are the product's reviewed structural + operational risks?" | `yieldStrategyRiskReview.ts` |
| **Eligibility (16D)** | "Does it satisfy the deterministic requirements for a specific lane?" | `yieldStrategyEligibility.ts` |

Comparison is **16E**, and it is not performed here.

## Strategy type describes mechanics; the exact product determines the lane (16D.1)

**Strategy TYPE describes how a product works; the exact registry riskLane and reviewed exact-product
metadata determine which use-case lane it may enter.** A managed vault is therefore no longer hardcoded
excess-only — a conservative, USDC-only, instantly liquid, non-custodial, audited managed vault **may**
eventually be Safety-Buffer eligible, while a higher-risk managed vault stays excess-only. This never
happens automatically: a managed vault defaults to `excess_only`, and buffer eligibility still requires
the exact registry riskLane `buffer_eligible`, `bufferUseReviewed`, and **every** strict buffer gate
below to pass. A stablecoin LP (`stable_liquidity_strategy`) remains excess-only (LP exposure), and a
locked/epoch staking-like product remains excess-only (not instantly liquid). Eligibility depends on
mechanics, never on a marketing word like "stake" or a protocol's name.

## Exact-product requirement

Eligibility evaluates one **exact** product (one vault / market), never a protocol brand. A product must
carry an **approved** registry lifecycle **and** a documented exact address; a review's
strategyId/protocolId/address must match the registry. No later successful check erases an earlier
blocker (blockers accumulate in a fixed gate order).

## Production empty-approved-set behavior

The production registry has **zero approved products** (no exact address is documented). Therefore the
production eligibility set is **empty** (`status: "empty_approved_set"`, `emptyApprovedSet: true`), and
this is a **valid** state that validators and diagnostics accept. No production product is silently
promoted; no address or product metadata is invented. There are **no production risk reviews** — the
review array is empty, because a review may not approve an undocumented product. Synthetic approved
candidates and synthetic reviews are used **only in fixtures**; they never touch the production
registry or review store.

## Canonical thresholds reused (never re-invented)

| Requirement | Source | Value |
|---|---|---|
| TVL floor | `MIN_PROTOCOL_TVL_USD` (12E) | 1,000,000 USD |
| Min risk score | `MIN_PROTOCOL_RISK_SCORE` (12E) | 7 / 10 |
| Buffer withdrawal delay | `MAX_WITHDRAWAL_HOURS_FOR_SAFETY_BUFFER` (12E) | 24 h |
| Excess withdrawal delay | `MAX_WITHDRAWAL_HOURS_FOR_GENERAL_YIELD` (12E) | 168 h |
| Min available liquidity | `MIN_LIQUIDITY_USD` (12E) | 100,000 USD |
| Buffer freshness | `YIELD_STRATEGY_BUFFER_LANE_MAX_AGE_MS` (16C) | 15 min |
| Excess freshness | `YIELD_STRATEGY_MARKET_DATA_MAX_AGE_MS` (16C) | 60 min |
| APY comparability | 16C `net`/`gross` only | — |

No canonical **product-review freshness** max-age is documented; 16D does **not** invent one
(`reviewFreshnessPolicyResolved: false`) and relies on the review's explicit `validUntil` — an expired
review fails closed.

## Safety Buffer eligibility (strict)

Registry: approved · supportedLane `safety_buffer_yield` · riskLane `buffer_eligible` · USDC · exact
address. Mechanics: strategy type allowed by 16A buffer policy · reviewed exposure **usdc_only** (no
stablecoin pair, no LP, no mixed) · `leverageUsed === false` · non-custodial · verified audit ·
**conservative** risk tier · risk score ≥ 7 · `bufferUseReviewed`. Market: complete · fresh under the
**15-minute** rule · provenance present · APY finite + sufficiently defined · TVL ≥ floor ·
`withdrawalStatus === instant_currently_available` · no active queue · delay ≤ 24 h · **explicit**
liquidity confidence with available liquidity ≥ 100,000 · fee model defined.

The strict buffer policy is **never weakened** because another product has a higher APY.

## Excess-USDC eligibility

Registry: approved · riskLane `buffer_eligible` or `excess_only` · USDC · exact address. Mechanics: not
`future_other` · `excessUseReviewed` · operational status **active** · verified audit · non-custodial ·
leverage `false` (no documented policy permits leverage) · reviewed exposure allowed
(`usdc_only`/`stablecoin_pair`/`stable_basket`) · **user risk level listed in
`compatibleUserRiskProfileIds`**. Market: complete · fresh under the **60-minute** rule · provenance ·
APY sufficiently defined · TVL ≥ floor · withdrawal known + not unavailable · delay ≤ 168 h · liquidity
confidence not unknown · fees defined.

## User-risk compatibility

The canonical onboarding ids (`RECOGNIZED_PROFILE_RISK_IDS = very_low / low / medium / high / very_high`)
are reused — no competing enum. **Buffer** eligibility never depends on the user's risk level: a
High-risk user does not make a moderate/elevated strategy buffer-eligible. **Excess** eligibility uses
the reviewed `compatibleUserRiskProfileIds` exactly — no fuzzy mapping, no default; an unknown or absent
user risk id fails closed.

## Audit / custody / leverage / exposure gates

Verified audit required (unknown → blocked; partial/none → requirement not met). Non-custodial required
(unknown → blocked; custodial/hybrid → requirement not met). Leverage must be `false` (unknown →
blocked; `true` → not allowed, and specifically blocks the buffer lane). Exposure must be in the lane's
allow-list; `unknown` fails closed; a `stable_liquidity_strategy` can never be buffer-eligible (LP).

## APY readiness without APY ranking

APY is a **readiness** requirement, not a winner rule. A snapshot needs a finite APY, a sufficiently
defined interpretation (net/gross), freshness, and provenance. 16D introduces **no APY minimum**, does
not prefer higher APY, does not score APY, does not calculate expected earnings, does not annualize a
partial APY, does not re-subtract fees on an already-net source, and does not convert gross↔net (16E+).

## TVL, liquidity vs withdrawal

TVL must meet the canonical floor (exactly at the floor passes). **Liquidity and withdrawal are separate
checks** and neither is inferred from the other, from TVL, from APY, or from the protocol name. For the
buffer lane, unknown/partial withdrawal, an active queue, or insufficient liquidity confidence all fail
closed. For excess, unknown withdrawal state remains blocked and an unknown queue state is never
silently allowed.

## Hubble treatment

Hubble stays in the documented registry. Eligibility is **not** hardcoded to deprecate or reject Hubble
on reputation — it depends only on the exact product's registry lifecycle, exact address, current risk
review, live market data, and lane policy. The current Hubble entry is `documentation_required`, so it
cannot become eligible; no Hubble USDC product is invented.

## Boundaries (what 16D never does)

No wallet balance / position consumed · no eligible capital / Safety-Buffer surplus / expected earnings
calculated · no comparison · no rank · no leader · no amount · no plan · no suggestion · no product
output update · no UI / `/testing` card · no transaction / signature path.

## Feature flags

Enabled: `YIELD_STRATEGY_RISK_REVIEW_EXISTS`, `YIELD_STRATEGY_ELIGIBILITY_EXISTS`,
`STABLE_YIELD_ELIGIBILITY_EXISTS` (plus the 16A–16C flags). Disabled: comparison, wallet detection,
plans, suggestions, UI, testing, execution — and `STABLE_YIELD_ELIGIBILITY_{UPDATES_PRODUCT_OUTPUT,
EVALUATES_CAPITAL,SELECTS_LEADER}` all false.

## Future flow

```
16A policy + 16B registry + 16C market data + 16D risk review & eligibility
→ 16E deterministic comparison (over lane-eligible strategies)
→ 16F existing positions & eligible capital
→ 16G read-only yield plan
→ 16H product integration
```
