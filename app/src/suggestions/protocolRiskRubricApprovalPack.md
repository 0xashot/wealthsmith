# Protocol riskScore Rubric — Approval Pack (Step 12P)

**For review. Nothing is approved by this document.** This pack is what reviewers
need to approve the `riskScore` rubric before any score can be assigned. **Until
sign-off:** `PROTOCOL_RISK_RUBRIC_APPROVED` stays false, **no `riskScore` can be
assigned**, production protocol selection remains blocked, and
`getProtocolSelectionGoNoGo()` remains `productionReady = false`.

## What reviewers are approving

1. The **rubric dimensions and weights** (below, total 100).
2. The **evidence requirements** per dimension.
3. The **scoring process**: evidence review → score under approved rubric →
   recorded with sources → applied as an internal eligibility input only.
4. That `riskScore` is an **internal risk input**, **not a recommendation** and not
   a user-facing rating.

## Rubric dimensions (for approval)

| Dimension | Weight |
| --- | --- |
| Audit & security review | 25 |
| Maturity & production history | 20 |
| TVL & adoption | 15 |
| Withdrawal & fee transparency | 15 |
| Operational & dependency risk | 15 |
| Incident history | 10 |

Full evidence lists and scoring guidance: `protocolRiskRubric.md` /
`protocolRiskRubric.ts`.

## Scoring process (for approval)

- One evidence review per dimension per protocol (`sufficient` / `partial` /
  `missing` / `not_reviewed`) with sourced links.
- A score is computed only under the approved rubric and only from reviewed
  evidence — never from missing/`not_reviewed` evidence.
- Scores are recorded with evidence, sources, and review date, then re-reviewed on
  a cadence. Scores remain behind all selection flags.

## Evidence requirements (must be sourced before scoring)

- **Audit & security:** official audit report/review, scope, date, audited
  version, unresolved critical/high findings if disclosed.
- **Maturity:** launch/production history, time in production, maintenance/official
  status, major protocol changes.
- **TVL & adoption:** source-backed TVL, adoption/usage evidence, TVL freshness.
- **Withdrawal & fees:** withdrawal mechanics, timing, fee schedule, and the
  protocol-withdrawal vs swap/route-liquidity distinction.
- **Operational & dependency:** admin/upgrade authority, validator/stake-pool/
  oracle/routing dependencies, custody model, external dependencies.
- **Incident history:** disclosed incidents, postmortems, advisories; a missing
  review is marked missing, never assumed clean.

## Open questions for reviewers

- Is a minimum evidence bar per dimension required before any score is computed?
- How are `partial` evidence dimensions handled (cap the score, or block)?
- What is the re-review cadence and who owns it?
- Should audit recency (audited version vs deployed version) gate eligibility
  independently of the weighted score?
- What is the disclosure/appeal process if a protocol disputes a review?

## Approval checklist

- [ ] Dimensions and weights reviewed and accepted.
- [ ] Evidence requirements reviewed and accepted.
- [ ] Scoring process reviewed and accepted.
- [ ] Confirmed `riskScore` is internal, review-only, not a recommendation.
- [ ] Confirmed missing evidence blocks scoring.
- [ ] Open questions resolved or explicitly deferred.

## Sign-off (placeholders — unsigned)

| Field | Value |
| --- | --- |
| Reviewer | _(pending)_ |
| Role | _(pending)_ |
| Date | _(pending)_ |
| Decision | _(pending: approve / reject)_ |
| Notes | _(pending)_ |

**Approval is required before scores can be assigned.** While these fields are
unsigned, `PROTOCOL_RISK_RUBRIC_APPROVED` stays false and no `riskScore` is
assigned.
