# WealthSmith Canonical Target Allocation Policy

> **Policy ID:** `target_allocation_policy_v1`
> **Version:** `1.0.0`
> **Status:** `approved` — **authorized, NOT YET mounted** (mount is Step 22C)
> **Methodology version:** `target_allocation_methodology_1.0.0`
> **Effective date:** 2026-07-22
> **Approver:** Product owner — all 11 checklist items authorized (Step 22B approval, this session)
> **Change rationale:** Initial specification (Step 22B), approved in full by the product owner. Establishes the documented five-factor target as one reviewable, machine-validated policy. Approval authorizes Step 22C to mount it; it does NOT itself change any production behavior.

This document is the single authoritative product-policy specification for WealthSmith's future **canonical `TargetAllocationAssessment`**. It defines every factor matrix, the exact weights, Net Cash Flow semantics, missing/degraded-data behavior, target-confidence states, downstream-consumer rules, deterministic boundaries, and governance.

**No production calculation is mounted by this document.** The mounted target today remains **risk-only** (`app/src/wallet/recommendedAllocation.ts` → `deriveRecommendedAllocation`). The constants and structural validators for this policy live, **non-mounted**, in `app/src/suggestions/targetAllocationPolicy.ts` and are imported by nothing in the engine.

---

## 1. Purpose and scope

WealthSmith target allocation must be **deterministic, explainable, auditable**, and free of emotional market timing. This policy governs how five profile/market factors combine into a single stable/volatile target mix. It does **not** authorize any suggestion, transaction, route, quote, or Smith AI behavior.

The market-conditions (Fear & Greed) factor is an **allocation input only** — never a standalone buy/sell/timing signal. See §17 (Prohibited interpretations).

---

## 2. Single output convention

Every factor outputs **one** value:

```
stableTargetPct ∈ [0, 100]        // higher = more stable allocation
volatileTargetPct = 100 − stableTargetPct
```

The policy never mixes conventions. It does **not** use crypto/stable, volatile/stable, internal risk scores, or internal suitability scores as a factor output. All five matrices are expressed as **stable-target percentage**.

---

## 3. Factor weights (documented, fixed)

| Factor | Weight |
|---|---|
| Risk tolerance | **0.35** |
| Time horizon | **0.20** |
| Financial goal | **0.20** |
| Net cash flow | **0.15** |
| Market conditions | **0.10** |
| **Total** | **1.00** |

Validated by `validateWeightsSumToOne()`. No hidden factor; no duplicated factor; no risk-score exposure.

---

## 4. Risk matrix (mounted — unchanged)

Exact existing slugs (`RISK_OPTIONS`), documented in stable-target terms. These mirror the mounted `RISK_TARGET_ALLOCATION.stablePct` and **are not changed** by this policy.

| Risk slug | Display | stableTargetPct | Rationale |
|---|---|---|---|
| `very_low` | Very Low | **80** | Capital preservation priority |
| `low` | Low | **60** | Conservative growth |
| `medium` | Medium | **40** | Balanced (product default philosophy) |
| `high` | High | **20** | Growth priority |
| `very_high` | Very High | **10** | Maximal growth tolerance |

- **Missing risk** → component **unavailable** (no invented default).
- **Unsupported risk value** → component **blocked**.

---

## 5. Time Horizon matrix (approved)

Exact existing slugs (`TIMELINE_OPTIONS`). Monotonic: shorter horizon → higher stable target. No interpolation, no age assumptions, no market dependency. `not_sure_yet` is an explicit conservative-neutral value, never silently treated as a specific duration.

| Timeline slug | Display | stableTargetPct | Rationale |
|---|---|---|---|
| `6_months` | 6 Months | **90** | Very near-term; volatility can't recover in time |
| `1_year` | 1 Year | **80** | Near-term; low drawdown tolerance |
| `2_years` | 2 Years | **65** | Short-medium; limited recovery window |
| `5_years` | 5 Years | **40** | Medium; can absorb a market cycle |
| `10_plus_years` | 10+ Years | **20** | Long; maximal time to recover volatility |
| `not_sure_yet` | Not Sure Yet | **55** | Explicit conservative-neutral (slightly above 50/50) |

Monotonicity check (excluding `not_sure_yet`): 90 > 80 > 65 > 40 > 20. ✅

---

## 6. Financial Goal matrix (approved)

Exact existing slugs (`FINANCIAL_GOAL_OPTIONS`). Reflects the goal's inherent tolerance for allocation volatility — **not** age, **not** horizon (separately weighted at 0.20), **not** the risk factor (separately weighted at 0.35). `not_sure_yet` is an explicit neutral value.

| Goal slug | Display | stableTargetPct | Rationale |
|---|---|---|---|
| `retire_early` | Retire Early | **35** | Accumulation goal; high growth tolerance |
| `build_long_term_wealth` | Build Long-Term Wealth | **40** | Balanced growth |
| `generate_passive_income` | Generate Passive Income | **60** | Income/yield orientation → moderately stable |
| `save_for_big_purchase` | Save For Big Purchase | **75** | Near-term security → high stable |
| `not_sure_yet` | Not Sure Yet | **50** | Explicit neutral |

Notes: no age assumptions; no horizon embedded (`retire_early` is scored for its accumulation character, not an assumed timeline — the horizon factor carries the timeline separately); no duplication of the risk factor.

---

## 7. Net Cash Flow — semantics and matrix (approved)

### 7.1 Definition

```
NetCashFlowUsd = monthlyIncomeUsd − monthlyExpensesUsd
```

Monthly **contribution** (`monthly_saving_goal`) is **NOT** net cash flow. Net cash flow represents financial **capacity**; the contribution represents the user's intended **deployment**. Using the contribution here and in DCA would circularly reuse one decision as two factors.

> **Discrepancy carried from Step 22A (resolved here):** external product docs may have implied "contribution amount = available cash flow." This policy rejects that and defines cash flow as income − expenses. Approved by the product owner on 2026-07-22 (checklist §20 item 4).

### 7.2 Normalization

```
SavingsRate = NetCashFlowUsd / monthlyIncomeUsd        // a fraction, not dollars
```

### 7.3 Bands (savings rate → stable %)

Ordered ascending; select the **first** band whose inclusive upper bound ≥ `SavingsRate`. Higher savings rate → more capacity for volatility → lower stable target.

| Band | SavingsRate range | stableTargetPct |
|---|---|---|
| Non-positive | `s ≤ 0` | **80** |
| Low | `0 < s ≤ 0.10` | **65** |
| Moderate | `0.10 < s ≤ 0.20` | **50** |
| Strong | `0.20 < s ≤ 0.35` | **35** |
| High | `s > 0.35` | **20** |

Domain tiling: `(−∞, 0] ∪ (0, 0.10] ∪ (0.10, 0.20] ∪ (0.20, 0.35] ∪ (0.35, +∞)` — complete, no gaps, no overlap (validated by `validateCashFlowBandContinuity()`).

### 7.4 Input behavior

- Income **missing** → component **unavailable**.
- Expenses **missing** → component **unavailable**.
- Income `≤ 0` → component **unavailable** (savings rate undefined; never divide by zero).
- Expenses `< 0` → **blocked** (malformed).
- Net cash flow `≤ 0` (with valid positive income) → **valid** non-positive band (80% stable).
- Savings rate `> 100%` → **valid** (falls in the `> 35%` band) unless inputs are malformed.
- Contribution amount → **not used** in this factor.
- No raw-dollar bands; no contribution-based fallback; no rounding before band selection.

---

## 8. Market Conditions matrix (documented, fixed)

Score is the 0–100 Fear & Greed index. Contrarian deterministic ALLOCATION input (higher greed → higher stable target). **Not a trade signal.** Boundaries inclusive as documented.

| Score range | Band | stableTargetPct |
|---|---|---|
| `0–24` | Extreme Fear | **20** |
| `25–49` | Fear | **35** |
| `50–59` | Neutral | **50** |
| `60–74` | Greed | **65** |
| `75–100` | Extreme Greed | **80** |

- `0` valid (Extreme Fear); `100` valid (Extreme Greed).
- Out-of-range / non-finite / NaN → **invalid** (market component unavailable → degraded, §11–12).
- **No rounding** unless the approved upstream methodology defines integer scores; band on the raw value.
- Coverage 0–100, inclusive integer boundaries, no gaps/overlap (validated by `validateMarketBandContinuity()`).

**Cross-band swing (key safety property):** with all other factors held constant, the target difference between the **Extreme Fear** and **Extreme Greed** market states is `(80 − 20) × 0.10 = ` **6 percentage points**. That is **below** the ±10pp Rebalance material threshold — **market conditions can never single-handedly force a Rebalance**. (This is a same-profile cross-band swing, **not** the full-vs-degraded difference: the degraded calculation renormalizes the other 90%, so that difference depends on the profile-only target.)

### 8.1 Approved market source (Step 22E — CoinMarketCap)

| Field | Value |
|---|---|
| **Provider** | CoinMarketCap |
| **Source id** | `coinmarketcap_crypto_fear_greed` |
| **Index id** | `cmc_crypto_fear_greed` |
| **Display name** | CMC Crypto Fear & Greed Index |
| **Market scope** | `broad_crypto_large_cap_composite` |
| **Methodology** | `cmc_crypto_fear_greed_composite` (`cmc_fng_methodology_2026_1`) |
| **Endpoint** | `GET https://pro-api.coinmarketcap.com/v3/fear-and-greed/latest` (the `/latest` observation via `update_time`; `/historical` lags a day) |
| **Auth** | server/offline env `COINMARKETCAP_API_KEY` via the `X-CMC_PRO_API_KEY` header (never `VITE_`, never a query param, never in a cache/log) |
| **Approval** | `approved` · 2026-07-22 · `product_owner` |

**Scope (approved interpretation):** a **broad crypto-market sentiment proxy** — a large-cap/composite index whose methodology combines broad-market and large-cap inputs with important **BTC/ETH-weighted** components. It is **not** Solana-specific sentiment, **not** an equal-weighted all-token score, **not** per-asset or portfolio-specific, and **not** a prediction. There is **no automatic fallback source** (Alternative.me is intentionally absent).

**Freshness policy (source-specific):** signal `source_observed_at`; **maximum observation age 36 hours** (daily publication interval + operational grace, `gracePeriodMs 0`). `observedAt` alone determines freshness — `retrievedAt` is provenance only, and a current refresh never refreshes an old observation. `validUntil = observedAt + 36h`. Changing the provider methodology requires a **new policy version**.

**Ingestion (offline only):** `npm run market:refresh-conditions` → provider adapter (`scripts/providers/coinmarketcapFearGreedProvider.mjs`) fetches → pure parse/select-latest/validate (`coinmarketcapFearGreed.ts`) → build + validate cache → last-known-valid publish decision → **atomic** write to `public/generated/market-conditions-cache.json`. The app consumes the published artifact via `marketConditionCacheLoader.ts`; **nothing fetches CoinMarketCap from React, the SuggestionCard, or the suggestion engine.** The provider's `value_classification` is retained only as evidence — WealthSmith **always recomputes the canonical band** from the numeric score.

**Degraded behavior:** missing / stale / failed / unapproved market data → market component **excluded** and the remaining 90% renormalized (§12). No score is invented; Neutral is never substituted.

**Attribution (future UI, no card added here):** "Data source: CoinMarketCap — CMC Crypto Fear & Greed Index (broad crypto-market sentiment)." Never claim equal-weighting of every coin, Solana-specific sentiment, price prediction, or that CoinMarketCap recommends WealthSmith's allocation.

**Product limitations:** CMC market sentiment is **one 10% input** to the target; it does **not** directly produce suggestions; On Track still requires a **full-confidence** target after mounting; and the **production target remains risk-only until Step 22F**.

---

## 9. Full canonical calculation

```
weightedStableTargetPct =
    riskStablePct     × 0.35
  + horizonStablePct  × 0.20
  + goalStablePct     × 0.20
  + cashFlowStablePct × 0.15
  + marketStablePct   × 0.10

weightedVolatileTargetPct = 100 − weightedStableTargetPct
```

- **Full precision** for all logic. No component rounded before weighting. No final target rounded before trigger comparisons (±10pp / $50).
- Display may round per UI conventions (component parity with the engine's `round2` display helper).
- Output clamped to `[0, 100]` only as a **defensive assertion**, never normal behavior (weighted convex combination of `[0,100]` values is already in range).
- Each component value, weight, and weighted contribution is retained for explanation (§16).

---

## 10. Target confidence states

| State | Meaning |
|---|---|
| `full` | All five components valid; market source approved **and** fresh. |
| `degraded_market_excluded` | Risk, Horizon, Goal, Net Cash Flow valid; market unavailable/stale/failed/unapproved → market omitted and remaining weights renormalized (§12); target explicitly marked degraded. |
| `unavailable` | One or more **required non-market** components missing → **no target emitted**. |
| `blocked` | Malformed/invalid/unsupported/contradictory input prevents a safe result. |

**No component is ever silently replaced with a neutral value.** In particular, missing market data is never substituted with the Neutral (50%) matrix value.

---

## 11. Missing / degraded input matrix

| Input state | Behavior |
|---|---|
| Missing risk | component unavailable → **unavailable** target |
| Unsupported risk | **blocked** |
| Missing horizon | component unavailable → **unavailable** target |
| Uncertain horizon (`not_sure_yet`) | valid → 55% stable (§5) |
| Missing goal | component unavailable → **unavailable** target |
| Uncertain goal (`not_sure_yet`) | valid → 50% stable (§6) |
| Missing income or expenses | cash-flow unavailable → **unavailable** target |
| Income ≤ 0 | cash-flow unavailable → **unavailable** target |
| Expenses < 0 | **blocked** |
| Net cash flow ≤ 0 | valid non-positive band (80% stable) |
| Missing / failed market | **degraded_market_excluded** (§12) — never Neutral substitution |
| Stale market (outside approved freshness) | **degraded_market_excluded** — never stale reuse |
| Unapproved market source | **degraded_market_excluded** |

Rationale for asymmetry: the four **profile** factors are user-provided and required (their absence means the target is genuinely unknowable → `unavailable`). The **market** factor is external and small (0.10), so its absence degrades gracefully rather than blocking the whole target — but only with an explicit `degraded_market_excluded` label, never a fabricated score.

---

## 12. Degraded-market calculation (market excluded)

When **only** the market component is unavailable/stale/unapproved and all four profile components are valid:

```
degradedStableTargetPct =
    ( riskStablePct     × 0.35
    + horizonStablePct  × 0.20
    + goalStablePct     × 0.20
    + cashFlowStablePct × 0.15 ) / 0.90

degradedVolatileTargetPct = 100 − degradedStableTargetPct
```

- Denominator is exactly `1 − marketWeight = 0.90` (validated by `validateDegradedDenominator()`).
- Status = `degraded_market_excluded`; warnings include `market_component_unavailable`.
- **No** fake market score, **no** Neutral substitution, **no** stale reuse outside an approved freshness policy.
- Analytics must distinguish `full` from `degraded_market_excluded` targets (§16, and Step 22A §37).

_Approved by the product owner on 2026-07-22 (checklist §20 item 8)._

---

## 13. Downstream use by confidence state

### Safety Buffer
Completely independent, unchanged, always highest priority. Market fear cannot reduce required buffer months; market greed cannot increase deployment before the buffer is complete; no volatile deployment while the buffer is incomplete/unresolved/unavailable; market never overrides the buffer.

### Rebalance
- **Full target** → eligible under existing canonical rules (±10pp, $50, verified source capacity, read-only, no route/transaction).
- **Degraded (market-excluded)** → may be used **if this policy is approved**; the review details must disclose that market data was unavailable. Existing thresholds unchanged.
- **Unavailable / blocked** → no Rebalance assessment/card.
- Market conditions change the **target**; they do **not** independently force a Rebalance.

### DCA / contribution allocation
- **Full target** → eligible under existing rules.
- **Degraded (market-excluded)** → may be used **if approved**; the explanation must disclose the excluded market component.
- **Unavailable / blocked** → no target-based DCA allocation.
- No "buy the fear" / FOMO copy.

### Staking and direct lending
No direct market trigger. Eligibility/amount continue to defer to the **canonical Rebalance / material-allocation signal** as conflict authority. No standalone sentiment triggers.

### On Track
- **Requires target confidence `full`.** A `degraded_market_excluded`, `unavailable`, or `blocked` target must **not** emit On Track.
- Therefore missing / stale / unapproved market data **blocks** the scoped On Track card. This protects On Track's "allocation within review range" claim from being made against an incomplete target.

### Top Pick
Unchanged. On Track is never Top Pick; Rebalance remains Top-Pick-eligible. A market-adjusted target can change which suggestion is Top Pick only indirectly, via existing material thresholds — no new Top Pick rules.

---

## 14. `not_sure_yet` and missing-input treatment (summary)

| Enum / input | Treatment | Rationale |
|---|---|---|
| Goal `not_sure_yet` | explicit neutral **50%** (valid component) | Uncertainty ≠ a specific posture; neutral is honest |
| Horizon `not_sure_yet` | explicit conservative-neutral **55%** (valid component) | Slightly conservative without assuming a duration |
| Risk **missing** | **unavailable** (not neutral) | Risk is the heaviest factor; absence is not neutral |
| Market **missing** | **degraded_market_excluded** (not Neutral) | Never invent a market score |

Uncertainty is never silently mapped to a highly specific investment posture.

---

## 15. Versioning and governance

- **Status:** `draft | approved | deprecated` (currently **`approved`**, effective 2026-07-22).
- **Policy version:** `1.0.0`. **Methodology version:** `target_allocation_methodology_1.0.0`.
- Any change to **factor values, bands, weights, missing-data behavior, or target-confidence rules** requires a **new policy version** and updated regression fixtures.
- Governance metadata (approver, rationale, internal scores) is **never** exposed in user-facing cards.

---

## 16. Explanation fields (future `TargetAllocationAssessment`)

Retain: `riskStablePct`, `horizonStablePct`, `goalStablePct`, `cashFlowStablePct`, `marketStablePct` (or `market_excluded`), each component's `weight`, each factor's `weightedContribution`, `weightedStableTargetPct`, `weightedVolatileTargetPct`, `targetConfidence`, `warnings`, `methodologyVersion`.

**Safe user explanation:** "Market conditions represent 10% of the full target calculation. Your Safety Buffer remains independent. The index does not directly produce buy or sell recommendations."

Never expose internal risk or governance scores.

---

## 17. Prohibited interpretations

The market-conditions factor must **never** produce or imply:

- buy because the market is fearful; sell because the market is greedy;
- market top / market bottom; time to buy / time to sell;
- bullish prediction / bearish prediction; the market will rise / fall;
- guaranteed future performance;
- Fear & Greed overriding the user's risk profile;
- Fear & Greed overriding the Safety Buffer;
- a standalone Fear & Greed suggestion category.

Neutral vocabulary only: *market-condition adjustment, current sentiment band, target-allocation input, increases/decreases the stable target, does not override your Safety Buffer or risk profile.*

---

## 18. Worked examples (deterministic)

**Reference profile P** (unless noted): risk `medium` (40), horizon `5_years` (40), goal `build_long_term_wealth` (40), income `$4,000`, expenses `$1,000` → NetCashFlow `$3,000`, SavingsRate `0.75` → `> 35%` band → **20**.

### A. Full five-factor target — Neutral market (score 55 → 50 stable)
```
0.35×40 + 0.20×40 + 0.20×40 + 0.15×20 + 0.10×50
= 14.0 + 8.0 + 8.0 + 3.0 + 5.0
= 38.0 stable  →  62.0 volatile      (confidence: full)
```

### B. Market unavailable (same profile P) — degraded
```
(0.35×40 + 0.20×40 + 0.20×40 + 0.15×20) / 0.90
= (14.0 + 8.0 + 8.0 + 3.0) / 0.90
= 33.0 / 0.90
= 36.6667 stable (full precision)  →  63.3333 volatile
confidence: degraded_market_excluded; warning: market_component_unavailable; On Track: INELIGIBLE
```

### C. Extreme Fear vs Extreme Greed (profile P held constant)
```
Extreme Fear  (score 12 → 20 stable): 14+8+8+3 + 0.10×20 = 35.0 stable → 65.0 volatile
Extreme Greed (score 82 → 80 stable): 14+8+8+3 + 0.10×80 = 41.0 stable → 59.0 volatile
Difference: 6.0 pp stable — BELOW the ±10pp material threshold.
```
Neither result is a buy or sell instruction; the swing alone cannot force a Rebalance.

### D. Missing non-market factor (income missing)
Cash-flow component unavailable → **no target emitted** (confidence `unavailable`). No Rebalance, DCA target, or On Track.

### E. Boundary cases
- Market: `24`→Extreme Fear(20), `25`→Fear(35), `49`→Fear(35), `50`→Neutral(50), `59`→Neutral(50), `60`→Greed(65), `74`→Greed(65), `75`→Extreme Greed(80), `0`→20, `100`→80.
- Cash-flow: `s=0`→80, `s=0.10`→65, `s=0.10000001`→50, `s=0.20`→50, `s=0.35`→35, `s=0.35000001`→20, `s=−0.5`→80, `s=1.5`→20.
- Enum mapping: exactly per §4–§6; unknown slug → component unavailable/blocked (never a default).

---

## 19. Policy validation

Structural validators (non-mounted, `app/src/suggestions/targetAllocationPolicy.ts`), exercised by the fixture suite:

- weights sum to 1 (`validateWeightsSumToOne`);
- degraded denominator = 0.90 (`validateDegradedDenominator`);
- every enum value covered exactly, no extras (`validateEnumCoverage`);
- every stable % ∈ [0, 100] (`validateStablePctRanges`);
- market bands tile 0–100, inclusive, no gap/overlap (`validateMarketBandContinuity`);
- cash-flow bands tile the reals, ascending, last open, no gap/overlap (`validateCashFlowBandContinuity`);
- single output convention (stable-target %); no silent default of a missing input;
- On Track requires `full`; Safety Buffer independent (asserted in policy fixtures + doc, mounted in 22D).

No second production target calculator is added. The mounted risk-only path is unchanged.

---

## 20. Approval checklist

All 11 items were **approved** by the product owner on **2026-07-22** (Step 22B approval, this session). Approval locks the values below and authorizes Step 22C to mount them; it does **not** by itself change any production behavior.

| # | Decision | Status |
|---|---|---|
| 1 | Risk matrix (§4, unchanged mounted values) | **approved** |
| 2 | Horizon matrix (§5) | **approved** |
| 3 | Financial Goal matrix (§6) | **approved** |
| 4 | Net Cash Flow definition = income − expenses (§7.1) | **approved** |
| 5 | Net Cash Flow / savings-rate matrix (§7.3) | **approved** |
| 6 | Market matrix (§8) | **approved** |
| 7 | Factor weights (§3) | **approved** |
| 8 | Degraded-market (exclude + renormalize) policy (§12) | **approved** |
| 9 | On Track full-confidence requirement (§13) | **approved** |
| 10 | Rebalance degraded-target use (§13) | **approved** |
| 11 | DCA degraded-target use (§13) | **approved** |

Legend: `approved` / `rejected` / `pending`. Any future change to a value, band, weight, missing-data behavior, or confidence rule requires a **new policy version** and updated regression fixtures (§15).

---

## 21. Non-goals (this policy does not)

Mount any calculation; change `deriveRecommendedAllocation`, Rebalance, DCA, On Track, or Safety Buffer; add an API source or cache-refresh script; create a market widget or Fear & Greed suggestion; modify Smith AI; or add any route/quote/transaction/simulation/signature behavior. Those are later, separately-approved steps (22C → 22E).
