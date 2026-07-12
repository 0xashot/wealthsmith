# Protocol Risk Evidence Review (Step 12Q)

**How to review evidence drafts — and why gathering evidence is not approval.**
This describes how a reviewer inspects the SOL liquid-staking evidence drafts
(`protocolSolLiquidStakingEvidenceDrafts.ts`), how a draft moves from
`needs_review`/`missing` to `gathered`, and what must happen before any `riskScore`
is assigned. Nothing here approves the rubric or assigns a score.
`PROTOCOL_RISK_RUBRIC_APPROVED = false`, `productionReady = false`.

## How reviewers inspect evidence drafts

For each candidate × rubric dimension:

1. Read the draft's `evidenceStatus`, `sources`, `evidenceSummary`, and
   `unresolvedQuestions`.
2. Verify each cited source is one of the allowed types — official docs, official
   security/audit page, audit report, public API docs, or a codebase reference —
   and that it actually supports the summary. Reject social-media claims, blog
   summaries (unless official), search snippets, and inferred/popularity/TVL-based
   claims as risk evidence.
3. Confirm no source URL or value was invented; unverified items must stay
   `needs_review`/`missing` with `unavailable` sources and unresolved questions.

## How a draft moves to `gathered`

A dimension becomes `gathered` only when:

- every required piece of evidence for that dimension is backed by a verified,
  cited source (see the rubric's `evidenceRequired`), and
- the `unresolvedQuestions` for that dimension are answered by those sources, and
- absence is never substituted for evidence (e.g. no sourced incident review means
  `missing`, not a clean record).

`partial` is used when some — but not all — required evidence is verified (e.g.
Sanctum/INF has a verified TVL source but no adoption evidence yet).

## What is required before assigning a riskScore

1. **All** dimensions for a candidate are `gathered` (or explicitly, documentedly
   `partial` within the approved rubric's tolerance).
2. The rubric itself is **approved** via `protocolRiskRubricApprovalPack.md`
   (`PROTOCOL_RISK_RUBRIC_APPROVED` flips true only then).
3. A separate, later step computes the score from the reviewed evidence under the
   approved rubric and records it with sources and a review date.

## Why evidence gathering does not equal risk approval

Gathering and citing evidence only makes a draft **reviewable** — it does not
approve the rubric, does not assign a score, and does not make a protocol eligible.
Approval is a distinct, human sign-off. Until it happens, `riskScore` remains
**absent**, `canAssignProtocolRiskScores()` returns false, and production protocol
selection stays blocked.

## Why riskScore remains absent until explicit approval

`riskScore` is an internal, evidence-backed eligibility input, not a rating or
endorsement. Assigning it from unreviewed or missing evidence would make
eligibility unauditable. Keeping it absent until the rubric is approved and
evidence is `gathered` is the honest, auditable default.
