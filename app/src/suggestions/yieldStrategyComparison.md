# Stable Yield Comparison Engine (Step 16E)

The deterministic, versioned engine that answers **one** question per lane:

> "Among the strategies already **eligible** (16D) for this exact lane, which currently **leads**
> WealthSmith's deterministic comparison?"

It does **not** answer how much USDC the user has, how much to deposit, whether to change or switch a
position, whether to suggest anything, or whether to move funds. Those are 16F–16H.

Backed by:
- [`yieldStrategyComparisonTypes.ts`](./yieldStrategyComparisonTypes.ts) — versions, dimensions, scorecard, tie, sensitivity, lane comparison, set.
- [`yieldStrategyComparisonPolicy.ts`](./yieldStrategyComparisonPolicy.ts) — score scale/precision, material-tie threshold, lane weights, source-quality map, helpers, validator.
- [`yieldStrategyComparison.ts`](./yieldStrategyComparison.ts) — candidate scorecards, per-lane comparison, the set, and fail-closed validators.
- [`yieldStrategyComparisonSensitivity.ts`](./yieldStrategyComparisonSensitivity.ts) — the ±10% weight-sensitivity analysis.
- [`yieldStrategyComparisonDiagnostics.ts`](./yieldStrategyComparisonDiagnostics.ts) — diagnostics + `explain` (no recommendation language).

## Inputs & architecture

```
16D eligibility set + 16C market snapshots + 16D risk reviews
→ lane-specific comparison candidates (only eligible_for_comparison)
→ six normalized dimensions → weighted 0–100 score
→ deterministic ordering → material-tie + weight-sensitivity analysis
→ comparison leader, or a withheld-leader result
```

**Buffer and Excess are compared separately.** A buffer candidate is never ranked against an
excess-only candidate; there is no cross-lane shared ranking.

## Exact-product comparison

Only exact 16D-eligible products are scored. 16E never overrides 16D: a strategy blocked or ineligible
in 16D can never become scoreable here. Identity (strategyId / protocolId / address) must match across
the eligibility result, market snapshot, and risk review.

## Six dimensions & lane weights (v1)

| Dimension | Buffer weight | Excess weight | Basis |
|---|---|---|---|
| `risk_quality` | 35 | 25 | reviewed risk score × 10 (absolute) |
| `withdrawal_liquidity` | 30 | 20 | status 40% / delay 30% / liquidity 30% (absolute) |
| `net_yield` | 15 | 25 | net-APY min-max within the lane cohort (relative) |
| `market_depth` | 10 | 15 | log10(exact-product TVL) min-max (relative) |
| `user_cost` | 5 | 10 | incremental exit cost, lower scores higher (relative) |
| `data_quality` | 5 | 5 | provenance 60% / freshness-remaining 40% (absolute) |

Each set totals **100**. Canonical priority: **Safety > Yield > Cost > Convenience**. APY never
dominates the Safety Buffer comparison. Scores are 0–100 per dimension and per candidate;
`weightedContribution = normalizedScore × weight / 100`, and the total is their sum.

**Why these differ from the SOL selector:** the SOL staking selector scores on a 0–10 cohort scale with
a numeric tie epsilon (1e-6) and a retention-rate sensitivity framework. Stable Yield uses a 0–100
additive score, a human-meaningful **1.00-point material-tie band**, and a strict **±10% single-weight**
sensitivity set (leader must hold in every scenario). The difference is deliberate: Stable Yield deploys
principal, so its leader must survive a stricter, directly-interpretable stability test. Score precision
reuses the SOL selector's 6-dp rounding behavior.

## Score normalization

- **Risk** — reviewed `riskScore × 10`, clamped 0–100. Never inferred from protocol brand, APY, TVL, or
  display name. User risk tolerance is an eligibility gate (16D), never a product-quality boost; risk
  tier is not double-counted once the reviewed score is used.
- **Withdrawal/liquidity** — `withdrawalStatus` sub-score (instant 100 … unavailable 0; unknown is
  invalid), delay decaying to 0 at the lane's canonical max (`MAX_WITHDRAWAL_HOURS_FOR_*`), and explicit
  available liquidity (ratio, or USD relative to `MIN_LIQUIDITY_USD`: min→50, 2×→100). Liquidity is
  never inferred from TVL, and withdrawal is never inferred from a protocol name.
- **Net yield** — one comparable **net-APY** basis. Source **net** APY is used directly (fees not
  re-subtracted). Source **gross** APY converts to net only with deterministic fee inputs
  (`net = gross − management − performance`), preserving the gross value + inputs. Unknown/ambiguous APY
  is incomparable and **withholds the leader**. Normalized min-max within the lane cohort; equal or
  single → neutral **50** (no relative distinction — not "good"). Never compares gross against net,
  never invents a net APY, never calculates user earnings.
- **Market depth** — `log10(TVL)` min-max so one huge product cannot linearly dominate; exact-product
  TVL only (never protocol-wide TVL or token market cap); equal/single → 50.
- **User cost** — `incrementalUserCostBps` = only explicit costs **not** already in net APY (the exit
  fee); recurring management/performance fees already in net (or used in gross→net conversion) are never
  counted twice. Lower cost scores higher; equal costs → 50; unclear fee semantics withhold the leader.
- **Data quality** — provenance (reusing 16C's `YieldMarketProvenanceKind`: documented_source 100,
  backend_normalized 70, same_origin_runtime_payload 50; `none`/browser-fetched invalid) + freshness
  remaining `100 × (1 − ageMs/maxAgeMs)`. It distinguishes quality within the already-valid range.

## Deterministic ordering, ties, sensitivity

Ordered by total score descending; genuinely equal scores keep canonical registry order for stable
display (never to manufacture a leader). A top-two gap ≤ **1.00** point is a **material tie** →
`leader_withheld_tie` (no APY / fee / brand / registry / address tie-breaker). Otherwise sensitivity
perturbs each weight ±10% (rebalancing the rest to 100) and recomputes; if the leader changes or a
material tie emerges in any scenario → `leader_withheld_sensitivity`. A leader is named only as
`highest_stable_score`.

## Single-candidate & empty behavior

One eligible candidate → `single_eligible_candidate`, leader = the only candidate, reason
`only_eligible_candidate`, sensitivity `not_applicable_single_candidate` — described as "the only
currently eligible strategy", never as having defeated alternatives. **Production has zero eligible
candidates**, so both lanes return `empty_eligible_set`, no leaders, and the set validates.

## Hubble

Hubble stays in the documented registry, receives no protocol-name penalty and no protocol-specific
score, is not hardcoded deprecated, and is not invented as a USDC product. The current
`documentation_required` Hubble entry cannot be scored; a future approved Hubble product would be
compared with the same dimensions and weights as any other.

## Boundaries

No wallet balance / existing position consumed · no buffer surplus / eligible capital / amount /
expected earnings calculated · no plan · no suggestion · no product-output update · no UI / `/testing`
· no transaction / signature path.

## Approved language

"comparison leader" · "currently leads WealthSmith's comparison" · "only currently eligible strategy" ·
"leader withheld". Never: best, safest, winner, recommended, guaranteed, risk-free.

## Feature flags

Enabled: `YIELD_STRATEGY_COMPARISON_EXISTS`, `YIELD_STRATEGY_SCORING_EXISTS`,
`YIELD_STRATEGY_SENSITIVITY_EXISTS`, `STABLE_YIELD_COMPARISON_EXISTS` (plus 16A–16D.1). Disabled: wallet
detection, plans, suggestions, UI, testing, execution — and `STABLE_YIELD_COMPARISON_EVALUATES_WALLET /
_CAPITAL / GENERATES_PLANS / UPDATES_PRODUCT_OUTPUT` all false.

## Future flow

```
16A policy + 16B registry + 16C market data + 16D eligibility + 16E comparison
→ 16F existing positions & eligible capital
→ 16G read-only yield plan
→ 16H product integration
```
