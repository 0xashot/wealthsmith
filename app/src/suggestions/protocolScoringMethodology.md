# Protocol Scoring Methodology (Step 12G)

**Scoring is a utility, not a recommendation. Ranking is not selection.** This
document defines how *fully eligible* candidates with *complete real data* would
be ranked deterministically for future evaluation — never which protocol a user
should use now. Markers: `SCORING_IS_RECOMMENDATION === false`,
`RANKING_IS_SELECTION === false`, `PROTOCOL_SELECTION_IMPLEMENTED === false`.

## Order of operations

1. **Eligibility first** (`protocolEligibility.ts`) — a candidate is scored only
   when `status === "eligible"`. Ineligible → not scored (`ineligible`);
   `insufficient_data` eligibility → not scored.
2. **Scoring** (`protocolScoring.ts`) — deterministic 0–100 component scores,
   combined by fixed per-strategy weights into a `totalScore`.
3. **Ranking** — scored candidates ordered by a deterministic comparator. No
   protocol is chosen; `selectionMade` is always `false`.

## Priorities: safety > risk > liquidity > yield

Weights are fixed and never tuned toward a desired outcome. **Risk always
outweighs yield**, and **APY is capped** (`MAX_APY_FOR_SCORE = 15`) so extreme
yield can't dominate. A higher-APY / lower-risk candidate does **not** rank above
a lower-APY / higher-risk-score candidate in stable-yield scoring.

## Component scores (0–100)

| Component | Input | Rule |
| --- | --- | --- |
| yieldScore | `marketData.apy` | `clamp(apy / 15 × 100, 0, 100)` (capped) |
| riskScore | `riskData.riskScore` (0–10) | `clamp(riskScore / 10 × 100, 0, 100)` |
| tvlScore | `marketData.tvlUsd` | saturates from `MIN_PROTOCOL_TVL_USD` → `TARGET_TVL_FOR_FULL_SCORE_USD` ($100M) |
| withdrawalScore | `withdrawalTimeHours` | buffer: full ≤1h, zero at 24h · general: full ≤24h, zero at 168h |
| liquidityScore | `liquidityUsd` (route context) | saturates `MIN_LIQUIDITY_USD` → `TARGET_LIQUIDITY_FOR_FULL_SCORE_USD` ($5M); neutral when route not required |
| costScore | `route.priceImpactPct` / fees | route: `(MAX_PRICE_IMPACT_PCT − impact)/MAX × 100`; non-route: neutral 100 **only if fees known** |

### Strategy weights (each totals 100 — validated in fixtures)

| | risk | tvl | withdrawal | yield | liquidity | cost |
| --- | --- | --- | --- | --- | --- | --- |
| stable_yield / lending | 35 | 20 | 20 | 15 | 5 | 5 |
| liquid_staking / staking | 30 | 25 | 20 | 15 | 5 | 5 |
| vault | 35 | 20 | 15 | 15 | 10 | 5 |
| lp | — scoring disabled until impermanent-loss risk is modeled — |

## Missing data never scores

Any absent required input → `insufficient_data`, never a default or 0:

- absent APY / TVL / riskScore / withdrawal → `insufficient_data`
- absent fees (when needed) / liquidity (route) / route price impact (route) → `insufficient_data`

Never default missing APY/TVL/riskScore/fees/liquidity to 0, and never default
missing withdrawal to instant. Values are never inferred from a protocol name.

## LP / impermanent loss

LP scoring is **disabled** (`lp_risk_not_modeled`) until impermanent-loss
exposure is modeled. LP candidates always return `insufficient_data`.

## Ranking tie-breakers (deterministic)

`totalScore` desc → `riskScore` desc → `tvlScore` desc → `withdrawalScore` desc →
`protocolId` asc.

## Still not selection

A ranked list of **eligible candidates** is not a selection and not a
recommendation. The UI must not show scores, ranks, or candidate names. A real
`selected` protocol stays disabled until **12H narrow-case QA**, validated real
data adapters, and an explicit product decision to expose it —
`PROTOCOL_SELECTION_IMPLEMENTED` remains `false`.
