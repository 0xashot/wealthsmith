# Deterministic Read-Only SOL Staking Selector Comparison (Step 14W)

An internal, deterministic, **comparison-only** module. Given the Step 14V selector-ready
normalized candidates and fresh comparable data, it answers: *"Which candidate LEADS under
WealthSmith's explicit safety-first comparison policy, and exactly why?"* It identifies a
**comparison leader** with a transparent score breakdown and deterministic ranking — and never
activates it.

Backed by:
- [`solStakingSelectorPolicy.ts`](./solStakingSelectorPolicy.ts) — versioned weights + validator.
- [`solStakingSelectorTypes.ts`](./solStakingSelectorTypes.ts) — result types.
- [`solStakingSelectorComparison.ts`](./solStakingSelectorComparison.ts) — build / normalize / rank / validate / diagnostics.

## Comparison-only scope

This is **not** product selection. A "comparison leader" is **not** an activated winner. The
module never changes `selectedProtocolId`, never sets any product `currentWinner` /
`selectedByProtocolLogic`, never enables multi-protocol selection, never touches UI / Top Pick /
engine ordering, and adds no transaction/signature path. Terminology is internal only
(comparison / comparison leader / policy / score breakdown / tie-break) — no best/safest/
recommended/guaranteed claims.

## Policy — `balanced_safety_first_v1` (v1.0.0)

Explicit weights (total **1.00**):

| Dimension | Weight | Why |
| --- | --- | --- |
| reviewed_risk_score | **0.50** | Do not chase small yield differences by accepting materially weaker reviewed protocol risk. Reuses the existing reviewed score (audit/security, maturity, adoption, fee transparency, operational dependency, incident history) — never recalculated. |
| apy_30d | **0.30** | The more durable recent yield signal; outweighs current APY. From fresh normalized live data. |
| current_apy | **0.10** | Responsiveness to recent conditions; less weight because it moves faster and can diverge from recent history. |
| apy_stability | **0.10** | Absolute current-vs-30-day APY difference (lower → higher score). A transparent consistency signal only — NOT a risk score or stability guarantee. |

Explicitly **excluded from the v1 cross-type score** (kept as zero-weight descriptive context):
LST TVL, native delegated stake, annual management fee, validator commission, direct unstake
fee, immediate liquidity, epoch-based exit timing, token model — their raw units/meanings are not
genuinely comparable across candidate types.

Policy constants: `MIN_APY_RANGE = 0.25` pct pts, `MIN_STABILITY_RANGE = 0.10` pct pts,
`SCORE_PRECISION = 6`, `TIE_EPSILON = 0.000001`. `validateSolStakingSelectorPolicy` fails closed on
missing dimensions, negative/non-finite weights, weights ≠ 1.00, unsupported metrics,
non-positive ranges, invalid precision, or invalid epsilon.

## Absolute risk scoring

`reviewed_risk_score` normalized score = the existing reviewed risk score **exactly** (already
0–10). It is **not** min-max normalized across the cohort and **not** recalculated. Weighted
contribution = `score × 0.50`.

## APY cohort normalization

`normalizeHigherIsBetter(values, {minimumRange, precision})` (30-day APY, current APY):

```
cohortMin, cohortMax = min/max(values)
midpoint = (cohortMin + cohortMax) / 2
normalizationRange = max(cohortMax - cohortMin, minimumRange)
score = clamp(5 + ((value - midpoint) / normalizationRange) * 10, 0, 10)
```

Higher value → higher score; equal values → 5. The **minimum meaningful range** (0.25 pct pts)
keeps a narrow cohort from being stretched to a full 0–10 spread.

## APY stability

`normalizeLowerIsBetter(absoluteApyDeltaPctPoints, {minimumRange: 0.10, precision})` uses the same
midpoint/range formula but `5 − (...)`: **lower** absolute delta → higher score; equal → 5. It is
a transparent consistency signal, not a risk score or guarantee.

## Total-score formula

```
totalScore =
    reviewedRiskScoreNormalized * 0.50
  + apy30dNormalized            * 0.30
  + currentApyNormalized        * 0.10
  + apyStabilityNormalized      * 0.10
```

Each normalized dimension and each weighted contribution is rounded to the policy precision (6),
and the total is summed from the **rounded** contributions for stable output. No adoption / fees /
exit / token model is added; no hidden bonus; no Jito incumbent bonus; no LST bonus; no
native-staking penalty.

## Tie-break order

1. Higher `totalScore` (compared with `TIE_EPSILON`)
2. Higher reviewed risk score
3. Higher 30-day APY
4. Lower absolute APY delta
5. Higher current APY
6. **Earlier canonical candidate order** (final deterministic tie-break)

Each candidate records which tie-breakers were needed. Rank 1 becomes
`comparisonLeaderCandidateId`.

## Eligible candidate gate

Consumes only `listSelectorReadyNormalizedCandidates(normalizedSet)` (canonical order). Requires
≥2 selector-ready candidates. Status: `no_ready_candidates` (0), `insufficient_candidates` (1),
`invalid_input` (normalized-set validation fails), `complete` (≥2). When not complete, no scores,
no ranking, no leader. **Stale/partial/invalid/missing/source-error candidates and INF are never
scored.**

## Descriptive non-scored context

Every result carries adoption (LST TVL `usd/lst_only`; native delegated stake `sol/native_only`),
each fee separately (`candidate_type_specific`), exit model, and token model
(`descriptive_only`) — all with `usedInScore: false`. No adoption/fee/liquidity/exit score, no
cross-type fee or adoption comparison.

## Comparison leader vs activated winner, and current selection

`comparisonLeaderCandidateId` is rank 1 only. `currentSelectedCandidateId` is read from the Jito
beta module (`JITOSOL_BETA_PROTOCOL_ID`). `leaderDiffersFromCurrentSelection` is informational and
triggers **no** behavior. JitoSOL remains the only selected protocol; mSOL/JupSOL/bSOL/native stay
read-only review candidates; INF stays blocked. No product UI integration, no Top Pick / engine
ordering change, no execution. Flags `SOL_STAKING_SELECTOR_ACTIVATION_ENABLED`,
`..._UPDATES_SELECTED_PROTOCOL`, `..._UPDATES_TOP_PICK`, `..._UPDATES_ENGINE_ORDERING`,
`..._UPDATES_PRODUCT_UI`, `..._ENABLES_TRANSACTIONS`, `..._REQUIRES_SIGNATURE` are all `false`.

## Real-cache QA (illustrative)

Against the live Step 14U cache (`tmp/sol-staking-market-data-cache.json`, not committed) with a
fresh cache and current `checkedAt`, the formula produced: leader **marinade** (mSOL, total 7.70),
then jupiter (6.85), jito (5.37), jupiter_native_stake (4.82), blazestake (4.68) — with the
comparison result passing full validation and an independent recomputation matching. The leader
differs from the current selection (jito); this is recorded but activates nothing. (If the cache
is >24h old, QA reports insufficient/no ready candidates rather than forcing a result.)

## Future activation gate (NOT built here)

Before any step could let a comparison leader change `selectedProtocolId`: selector-policy review;
real-cache result review; sensitivity analysis (weight perturbation); a source-freshness
operational job (the Step 14U refresh on a schedule); explicit human approval to change
`selectedProtocolId`; regression QA across the suggestion engine; product-copy review (no
best/safest/guaranteed claims); and a documented rollback plan (mirroring how JitoSOL's read-only
beta was gated).
