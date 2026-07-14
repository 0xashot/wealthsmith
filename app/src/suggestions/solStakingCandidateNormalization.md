# SOL Staking Candidate Normalization (Step 14V)

One shared, **deterministic comparison model** for JitoSOL, JupSOL, mSOL, bSOL, and Jupiter
Native Stake (plus blocked INF for diagnostics). It answers: *"Can WealthSmith represent these
candidates in one comparison-ready format without pretending incompatible concepts — LST TVL vs
native delegated stake — are identical?"* — yes.

Backed by:
- [`solStakingCandidateNormalizationTypes.ts`](./solStakingCandidateNormalizationTypes.ts) — the model.
- [`solStakingCandidateStaticFacts.ts`](./solStakingCandidateStaticFacts.ts) — reviewed-facts adapter.
- [`solStakingCandidateNormalization.ts`](./solStakingCandidateNormalization.ts) — normalizer + set builder + validators + diagnostics.

## Why normalization is separate from scoring

Normalization **aligns field names and preserves semantics**. It does not score, weight, rank,
sort, or select. Step 14W (a later, separate step) is the only place a selector may compute
anything. Keeping them apart means the comparison model can never accidentally imply a winner.

## Canonical candidate set

Reuses the Step 14U canonical IDs + order (no duplicates): `jito`, `jupiter`, `marinade`,
`blazestake`, `jupiter_native_stake`, `sanctum`. INF (`sanctum`) is normalized for diagnostics
but is always excluded from `selectorReadyCandidateIds` (blocked, 6.95 < 7.0).

## Live market data vs reviewed evidence

Two data classes feed each record and stay visibly distinct via `dataClass`:
- **`live_market`** — current APY, 30-day APY, adoption (from the Step 14U cache).
- **`reviewed_evidence`** — reviewed risk score, fees, exit mechanics, operational/incident
  summaries (from the existing evidence/score/approval modules; read at a review-era anchor so
  the reviewed scores resolve deterministically — **not recalculated**).
- **`derived_transparent`** — the APY delta (see below).
- **`descriptive_static`** — descriptive exit text.

## Common APY fields

`current_apy_pct` and `apy_30d_pct` are copied **exactly** from the live snapshot with full
source provenance (name, url, fetchedAt, asOf, epoch) and methodology preserved. Both are
`comparisonScope: all_candidates` — same unit (`pct`) and meaning.

## Transparent APY delta

`apy_delta_pct_points = current_apy_pct − apy_30d_pct` (and its absolute value), unit
`pct_points`, `dataClass: derived_transparent`, `comparisonScope: all_candidates`. It is
**transparent arithmetic only** — explicitly NOT a stability score, not ranked, not weighted,
and not interpreted as better/worse here. If either APY is missing/stale/invalid, the derived
metric is missing/stale accordingly (never computed from stale values).

## Adoption-unit differences — LST TVL vs native delegated stake

Adoption is preserved as **unlike units**, never flattened:
- LST → `metricKind: tvl_usd`, unit `usd`, `comparisonScope: lst_only`. TVL = capital held in
  the liquid-staking pool/token.
- Native → `metricKind: delegated_stake_sol`, unit `sol`, `comparisonScope: native_only`.
  Delegated stake = SOL delegated to the validator.

`directlyComparableAcrossAllCandidates` is `false`. **12M SOL is never compared directly with
$700M TVL.** No SOL price source is introduced in 14V, no adoption score, no percentiles, no
ranking.

## Fee-model differences — management fee vs validator commission

Each fee is preserved **separately** (`comparisonScope: candidate_type_specific`):
- LST → `feeModel: lst_protocol_fee_model`; `annualManagementFeePct` + `directUnstakeFeePct`
  preserved; `validatorCommissionPct` is `not_applicable`.
- Native → `feeModel: native_validator_commission_model`; `validatorCommissionPct` preserved;
  `annualManagementFeePct` may be `0` only because it is explicitly recorded.

No synthetic total fee is created; a management fee and a validator commission are never
equated; a 5% validator commission (a cut of rewards) is never translated into a 5% loss of
principal; fees are never ranked.

## Exit-mechanics differences

`comparisonScope: descriptive_only`. LSTs → `liquidityClass: liquid_token`,
`delayModel: market_or_instant`, instant + delayed routes preserved. Native →
`liquidityClass: native_stake_account`, `immediateExitAvailable: false`,
`delayModel: epoch_based`, epoch-based description preserved. **No fixed hours are invented** for
epoch-based/variable timing.

## Reviewed-risk-score reuse

`risk.reviewedRiskScore` carries the already-approved score from the exported score module
(JitoSOL 7.75, JupSOL 7.65, mSOL 7.40, bSOL 7.35, Jupiter Native Stake 7.10, INF 6.95),
`comparisonScope: all_candidates`, with the source module named in notes.
`riskScoreRecalculatedByNormalization` is `false`. Operational/incident summaries are carried as
descriptive text only.

## Comparison scopes (summary)

| Metric | scope |
| --- | --- |
| current APY / 30-day APY / APY delta | all_candidates |
| reviewed risk score | all_candidates |
| LST TVL | lst_only |
| native delegated stake | native_only |
| LST fee model / native validator commission | candidate_type_specific |
| exit mechanics / token model | descriptive_only |

A field is `all_candidates` only when its unit and meaning are genuinely comparable.

## Readiness vs selection

`readiness.eligibleForFutureSelectorInput` is **DATA-READINESS ONLY** — it neither runs nor
enables the selector. It is `true` only when the candidate is approved, not blocked, its Step 14U
snapshot is `eligibleForFutureComparison`, live market is complete + fresh, a reviewed risk score
exists, required static mechanics exist, and there are no critical blockers.

- **Stale** approved candidate → stays approved + normalized; excluded with
  `stale_live_market_data`; approval not revoked.
- **Partial** approved candidate → stays approved; excluded with `incomplete_live_market_data`.
- **Missing** reviewed score or required mechanics → excluded with an explicit blocker; nothing
  invented.
- **INF** → normalized for diagnostics; excluded with `not_approved_for_read_only_review` /
  `blocked_by_risk_approval`; never selector-ready.

## Canonical ordering, no ranking, no winner, no weights, no UI, no execution

`candidates`, `selectorReadyCandidateIds`, and `listSelectorReadyNormalizedCandidates` all
preserve canonical registry order and are **never** sorted by APY, risk, TVL, stake, fees, or
exit. No selector score, no weights, no winner, no `selectedProtocolId` change. Not wired into
`stakingSuggestion`, `suggestionReviewDetails`, the modal, Demo, Real Wallet, or Top Pick. Every
capability flag is `false`; no transaction/signature/staking/delegation/withdrawal path exists.

## Step 14W contract

**14W MAY consume:** `selectorReadyCandidateIds`; current APY; 30-day APY; the transparent APY
delta; the reviewed risk score; candidate type; the separate fee components; exit mechanics; the
adoption metric **with its comparison scope**; and full source provenance.

**14W MUST NOT assume:** that TVL (USD) equals delegated stake (SOL); that a validator commission
equals an LST management fee; that immediate market liquidity equals native epoch exit; or that a
larger raw adoption number is universally better. It must respect every `comparisonScope` — only
`all_candidates` metrics are directly comparable across the whole set.
