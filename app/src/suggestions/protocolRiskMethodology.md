# Protocol Risk & Eligibility Methodology (Step 12E)

**Eligibility is NOT a recommendation, and NOT a selection.** This document
defines *when a protocol is eligible to be evaluated* — never *which protocol a
user should use*. There is no ranking, no score-as-advice, and no "safe" or
"best" language anywhere. Marker: `ELIGIBILITY_IMPLIES_RECOMMENDATION === false`
(protocolEligibility.ts); `PROTOCOL_SELECTION_IMPLEMENTED === false`.

## Why risk is curated and deterministic

Risk metadata is **curated** (documented evidence, reviewed by a human) and
applied by **deterministic gates** (`evaluateProtocolEligibility`). No AI, no
dynamic guesswork, same inputs → same result. This keeps eligibility auditable
and prevents a live feed from silently making a protocol "eligible to evaluate".

## Missing data never passes

If a required input is missing or unknown, the result is **`insufficient_data`**,
never `eligible`. A gate only returns **`ineligible`** when present data *fails*
a threshold (e.g. TVL below the minimum). We never treat absence as a pass, and
we never substitute 0 or a default for an unknown value.

- `insufficient_data`: we cannot yet judge (missing market/risk data, missing
  TVL/APY/withdrawal, unknown audit status, missing Safety-Buffer eligibility).
- `ineligible`: present data violates a gate (TVL below min, risk score below
  min, withdrawal too long, Safety-Buffer-ineligible, unsupported asset/strategy,
  not a registry candidate).

## Eligibility is separate from selection

Passing eligibility means only "eligible to evaluate". Choosing among eligible
protocols needs later steps: **12F** quote/liquidity/cost guardrails, **12G**
deterministic scoring, **12H** narrow-case selection QA. Nothing here selects.

## riskScore is not populated yet

`riskScore` stays **absent** until this methodology is approved. Eligibility that
depends on `riskScore` therefore returns `insufficient_data` today — by design.

### Evidence needed before assigning a riskScore

A `riskScore` (0–10) may be assigned only from documented evidence, e.g.:

- audit history and scope (who, when, findings, remediation);
- time in production and TVL history;
- oracle/dependency and admin-key / upgrade-authority risk;
- incident history;
- withdrawal/liquidity behavior under stress.

The scoring rubric itself must be written down and reviewed before any number is
stored. `MIN_PROTOCOL_RISK_SCORE = 7` is the eligibility gate, not a score.

### The rubric now exists in DRAFT (Step 12P)

The rubric is now written down in `protocolRiskRubric.ts` /
`protocolRiskRubric.md`, with an approval pack in
`protocolRiskRubricApprovalPack.md`. It defines six weighted dimensions (total
100) — audit & security (25), maturity (20), TVL & adoption (15), withdrawal & fee
transparency (15), operational & dependency risk (15), incident history (10) —
each with required, source-backed evidence. **It is `draft` and NOT approved**
(`PROTOCOL_RISK_RUBRIC_APPROVED = false`, `canAssignProtocolRiskScores()` → false).
`riskScore` therefore **remains absent** for every protocol until the rubric is
approved and per-dimension evidence is sourced; missing/`not_reviewed` evidence
never yields a score.

### The approval decision gate (Step 12R)

`protocolRiskApprovalDecision.ts` models the explicit human decision that must
happen before any score is assigned, plus a per-candidate score-assignment gate.
The current decision is `not_submitted` (`rubricApproved = false`,
`scoreAssignmentAllowed = false`). A candidate becomes `approved_for_scoring` ONLY
when (1) the rubric is approved, (2) all six evidence dimensions are `gathered`,
(3) the reviewer decision explicitly allows scoring, and (4) the assignment is
auditable. **Today every candidate gate is `blocked`** (rubric unapproved,
evidence incomplete), so no score is assigned. See
`protocolRiskScoreAssignmentGate.md`. Evidence gathering (12Q) is not approval.

## How each curated field is sourced

- **auditStatus** (`audited` / `partially_audited` / `unknown`): from the
  protocol's published audits (firm + report link in `sources`). Default
  `unknown` — never assumed audited.
- **withdrawalClass** (`instant` / `same_day` / `delayed` / `unknown`): from the
  protocol's documented unstake/withdrawal mechanics (e.g. LST unstake cooldown).
  Default `unknown`.
- **safetyBufferEligible** (`true`/`false`/absent): assigned `true` only for a
  documented, conservative, all-stable, promptly-withdrawable venue that
  preserves buffer semantics; `false` when documented ineligible; **absent** when
  undocumented (→ `insufficient_data` in Safety-Buffer context).
- **lastReviewedAt** + **sources**: every curated entry must carry the review
  date and its evidence links, and be re-reviewed on a set cadence.

## Ineligible vs insufficient_data (summary)

| Situation | Result |
| --- | --- |
| Not a registry candidate / unsupported asset or strategy | `ineligible` |
| TVL present but `< MIN_PROTOCOL_TVL_USD` | `ineligible` |
| riskScore present but `< MIN_PROTOCOL_RISK_SCORE` | `ineligible` |
| withdrawal hours present but over the context max (24h buffer / 168h general) | `ineligible` |
| `safetyBufferEligible === false` in buffer context | `ineligible` |
| liquidity present but below min (route context) | `ineligible` |
| any required market/risk field missing or unknown (incl. missing riskScore, unknown audit, missing Safety-Buffer eligibility) | `insufficient_data` |
| LP/vault (impermanent-loss exposure not modeled yet) | `insufficient_data` |
| all required present and passing | `eligible` (eligible to *evaluate* only) |
