# Protocol Risk Rubric v1.0.0 — **APPROVED**

> **Status: `approved`** (Step 16H-K.1)
> **approvedBy:** `ws_product_owner` (Ashot Gyulzatyan, `rubric_approver`) · **approvedAt:** `2026-07-16T12:33:58.794Z`
> **Rationale:** approved for WealthSmith MVP risk governance with mandatory blocker enforcement,
> evidence-backed scoring, deterministic aggregation, separate risk signoff, and separate product approval.
> **Artifact version:** 1.0.0 · **Rubric hash:** see `computeRubricV1Hash()` (fnv1a over material content)
>
> Claude drafted this rubric and **transcribed** the product owner's approval decision. The transition
> `proposed_for_approval → approved` was validated by `recordRubricApproval()` against the authorized
> reviewer registry.
>
> **Approving the rubric approves nothing else.** Scoring still requires an authorized human scorer per
> dimension. Steakhouse remains unscored and unapproved; production still renders no card.

## The score is INTERNAL ONLY

The numeric result is an internal **Risk Suitability Score**, used only for deterministic eligibility,
comparison, governance, approval workflows, diagnostics and auditability. It **must never** reach a
suggestion card, review drawer, dashboard, portfolio page, Smith AI answer, Qdrant answer, analytics
event, public doc, or customer-facing API — nor may its components (dimension scores, weights, the
threshold of 7, bands, reviewer confidence, blocker codes, reviewer notes), since publishing the parts
would let anyone reconstruct the whole.

Users receive **approved qualitative disclosures** only. See
[`riskScoreExposurePolicy.ts`](./riskScoreExposurePolicy.ts). Legacy field name `riskScore` is preserved
to avoid broad regressions — read it as *suitability*, where **higher = stronger evidence-supported**.

Machine-readable: [`riskGovernance.ts`](./riskGovernance.ts) → `getProposedRiskRubricV1()`.

## What you're approving

A rubric for scoring **protocol and product risk** across WealthSmith — replacing
`protocol_risk_rubric v0.1.0-draft`, which has been draft since Step 12Y and has consequently blocked
*every* candidate (including JitoSOL) from ever receiving a score.

## Score direction — please sanity-check this first

**0–10, HIGHER = MORE EVIDENCE-SUPPORTED (safer).** Integers only.

This is **kept from the existing repository**, not invented: `protocolRiskScoreAssignment.ts` states it,
and `MIN_PROTOCOL_RISK_SCORE = 7` is used as a **floor** in `protocolEligibility.ts`
(`riskScore < MIN → risk_score_below_minimum`). Inverting to "higher = riskier" would silently turn every
existing gate into a ceiling. If you want the inverse direction, that is a deliberate migration, not an
edit to this document.

## Anchors (shared by every dimension)

| Band | Range | Meaning |
|---|---|---|
| `unsupported` | 0–2 | No usable evidence, or evidence contradicts safety. **Never a default.** |
| `weak` | 3–4 | Evidence exists but is materially incomplete or unverifiable. |
| `partial` | 5–6 | Evidence covers the main risk but leaves a named, bounded gap. |
| `supported` | 7–8 | Evidence is complete and verifiable for this dimension. |
| `strongly_supported` | 9–10 | Complete, independently verifiable, defence-in-depth. |

Freeform unanchored scoring is rejected. Every score requires a **rationale** + **evidence references** +
**confidence**, or it is rejected.

## Dimensions (12, weights total 100)

| # | Dimension | Weight | v0.1.0 |
|---|---|---:|---|
| 1 | `audit_security` | 15 | retained (was 25) |
| 2 | `upgrade_admin_authority` | 15 | **new** |
| 3 | `manager_discretion` | 12 | **new** |
| 4 | `liquidity_withdrawal` | 12 | **new** |
| 5 | `strategy_complexity` | 10 | **new** |
| 6 | `maturity` | 8 | retained (was 20) |
| 7 | `composability_dependency` | 8 | **new** |
| 8 | `oracle_risk` | 8 | **new** |
| 9 | `asset_stablecoin_risk` | 5 | **new** |
| 10 | `withdrawal_fee_transparency` | 3 | retained (was 15, re-scoped) |
| 11 | `operational_dependency_risk` | 2 | retained (was 15, re-scoped) |
| 12 | `incident_history` | 2 | retained (was 10) |
| — | ~~`tvl_adoption`~~ | **0** | **removed from scoring** (was 15) |

## The three changes worth arguing about

**1. `tvl_adoption` is removed from scoring.** TVL cannot make a product safer: a full product and an
uncapped one report identical TVL, and a large pool is a *larger target*, not a safer one. Keeping it as a
scored dimension creates a standing incentive to let a live number move a reviewed score. Its one
defensible signal — "has been trusted with funds for a while" — survives inside `maturity` as an
**optional, reviewed, point-in-time snapshot** that cannot be fetched at runtime and cannot override any
blocker. The id remains in the legacy v0.1.0 type for compatibility.

**2. Six dimensions were added, and they now carry 55% of the weight.** They exist because the Steakhouse
review found risks v0.1.0 had *nowhere to record*: an active upgrade authority over user funds, an
allocation admin who can change strategy, a four-reserve managed allocation behind a "USDC vault" label,
oracle dependencies, and a withdrawal model that may be queued rather than instant.

**3. Audit weight dropped 25 → 15.** Not because audits matter less, but because v0.1.0 let a strong audit
score dominate while governance and exit risk went unscored entirely.

## Aggregation, and why a blocker can't be averaged away

1. Rubric must be **approved** — draft/proposed/superseded → no score.
2. Evidence must be **complete**.
3. **Mandatory blockers are checked BEFORE any arithmetic.** This is the whole design.
4. Every applicable dimension scored, anchored, rationalised, evidenced.
5. Weighted mean over applicable dimensions, renormalised so `n/a` doesn't deflate the result.
6. **Severe override:** any dimension in the `unsupported` band (0–2) caps the overall band at
   `unsupported`, regardless of the mean. A product cannot be "supported overall" while a pillar is
   unsupported.

`meetsMinimum` = no severe dimension **and** weighted ≥ 7 (the existing `MIN_PROTOCOL_RISK_SCORE`).

## Reviewer roles & separation of duties (also proposed)

`evidence_preparer` · `risk_scorer` · `risk_reviewer` · `risk_signoff_approver` · `rubric_approver` ·
`product_approver`. See [`riskReviewerRegistry.ts`](./riskReviewerRegistry.ts).

- Agents (**including Claude**) may **only** prepare evidence. An automated actor is rejected for every
  other role by the validator.
- One human MAY hold multiple roles in MVP — but each act is recorded separately with its own actor,
  timestamp and transition. Concentrating roles is a trade-off to make consciously.
- **The production reviewer registry is empty.** Nothing can be scored until you add a record.

## Legacy compatibility & migration

The five `assigned_for_review` staking scores (JupSOL/mSOL/bSOL/INF/native) are **untouched** and remain
usable under current approved behaviour — they aren't wired into `protocolEligibility`, so nothing breaks.
They require **explicit rescoring** under v1; they are **not** mapped across, because v1 removed a scored
dimension and added six that were never assessed. Mapping would fabricate reviewer judgement.

Full detail: [`riskScoreMigration.md`](./riskScoreMigration.md).

## Known limitations

- Anchors are qualitative; two reviewers may reasonably differ by a band.
- Weights are a judgement call, proposed for exactly this reason.
- `YieldStrategyRiskReview` still has **no reviewer/signoff fields** — that schema gap must close before
  a real review can be recorded.
- The rubric scores *evidence support*, not probability of loss. A 10 is not "safe".

## Required human decisions

1. **Approve / amend / reject this rubric.** (Proposed approver role: `rubric_approver`.)
2. **Approve / amend the separation-of-duties policy.**
3. **Add an authorized reviewer record** (`status: "active"`, real `authorizedAt`, `authorizationEvidence`).
   A proposed record for the product owner is drafted in `riskReviewerRegistry.ts` based on the existing
   "Ashot-authorized for scoring" convention in the staking modules — but a code comment is not a scoped
   authorization, so it is **not** activated.
4. **Decide whether to rescore the staking candidates** under v1, or leave them `assigned_for_review`.

---

**Approval block — to be completed by a human, not by Claude**

```
rubricId:    protocol_risk_rubric_v1
semver:      1.0.0
decision:    [ ] approve   [ ] request changes   [ ] reject
approvedBy:  ____________________   (reviewerId, must hold `rubric_approver`)
approvedAt:  ____________________   (ISO 8601)
notes:       ____________________
```
