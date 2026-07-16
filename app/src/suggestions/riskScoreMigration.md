# Risk Score Migration Report (Step 16H-K)

Machine-readable: [`steakhouseReviewerWorksheet.ts`](./steakhouseReviewerWorksheet.ts) →
`getRiskScoreMigrationReport()`.

**Nothing was migrated.** This is a report. Reinterpreting an old score under new dimension definitions
would invent a judgement the reviewer never gave.

> **Product-owner decision (16H-K.1):** existing SOL staking scores remain **legacy reviewed inputs**.
> No automatic migration occurred; no reinterpretation under rubric v1 occurred. **Explicit v1 rescoring
> is DEFERRED until after the Stable Yield MVP critical path.** Legacy provenance limitations remain
> documented below, and selector ordering, eligibility and ranking are unchanged. Deferring migration does
> **not** invalidate the prior reviewed staking work.

| Subject | Rubric | Score state | Classification | Usable today? | Needs v1 review? |
|---|---|---|---|:---:|:---:|
| JupSOL, mSOL, bSOL, INF, native baseline | v0.1.0-**draft** | `assigned_for_review` | `requires_rescoring` | ✅ | ✅ |
| JitoSOL | v0.1.0-**draft** | **blocked — no score** | `blocked_missing_reviewer_provenance` | ✅ | ✅ |
| `kamino_steakhouse_usdc` | none | **no score** (`undefined`, not 0) | `blocked_missing_evidence` | ❌ | ✅ |
| Stable Yield 16D production reviews | `yield_strategy_risk_review_v1` | **empty (zero records)** | `compatible_with_v1` | ✅ | — |
| Stable Yield synthetic reviews | contract | fixture scores | `fixture_only` | ✅ | — |

## The staking scores

Recorded provenance: the module headers say **"Ashot-authorized for scoring"**. That is a real,
traceable convention — but it is a code comment authorizing *scoring* for *those candidates* under the
*draft* rubric, and the modules themselves state the result is **"not a final production score"**.

**Nothing breaks.** These scores are `assigned_for_review` and are **not** wired into
`protocolEligibility` — no production path consumes them. Their status is already honest.

**They are not mapped onto v1.** v1 removed `tvl_adoption` from scoring and added six dimensions
(upgrade/admin, manager discretion, strategy complexity, composability, oracle, liquidity/withdrawal)
that were **never assessed** for these candidates. A mapping would be fabrication, so each requires
explicit rescoring — if and when you decide it's worth the effort.

## JitoSOL

There is nothing to migrate: it has **no score**. The 12Y gate's default (`not_submitted`) plus the draft
rubric left the most-developed candidate unscored. That is the gate working as designed.

## Compatibility guarantees (fixture-asserted)

- Existing staking risk modules are **untouched** and import nothing from the new governance layer.
- No staking score is moved onto the proposed v1 rubric.
- The legacy draft rubric remains at `v0.1.0-draft`, unapproved.
- Comparison ordering and selector readiness are unchanged — this step touched no ranking code.
