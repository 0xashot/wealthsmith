# SOL Liquid-Staking Source-Value Confirmation Intake (Step 12U)

**Records reviewer-confirmed values from verified sources. Not production
metadata. Not evidence mutation. Not risk approval. Not score assignment. Not a
protocol recommendation.** Step 12T verified that a source LINK exists; 12U records
the exact value a reviewer read from it. Backed by
`protocolSolLiquidStakingSourceValueConfirmation.ts`.
`PROTOCOL_SELECTION_IMPLEMENTED = false`,
`getProtocolSelectionGoNoGo().productionReady = false`.

## Purpose

Answer: *"when a reviewer reads a verified source, how do we record the exact
confirmed value without turning it into a recommendation or production selection?"*
A confirmation captures a reviewer-supplied value plus its source and as-of date —
and nothing else changes.

## Source verification vs. value confirmation

- **Source verification (12T):** the source LINK is legitimate and of the right
  kind. No value.
- **Value confirmation (12U):** a reviewer read a specific value FROM that verified
  source and recorded it. Still non-production.

## What value confirmation is NOT

- **Not production metadata** — `productionMetadataUpdated` is always false; nothing
  is written to `DEFILLAMA_POOL_MAPPINGS`, `ProtocolMarketData`, or
  `ProtocolRiskData`.
- **Not evidence mutation** — `evidenceDraftMutated` is always false; base evidence
  drafts are untouched.
- **Not risk approval** — the rubric and approval decision stay unapproved.
- **Not score assignment** — `scoreAssigned` is always false; no `riskScore`.
- **Not a protocol recommendation** — no protocol is selected or endorsed.

## Reviewer-required fields

A value is `confirmed` ONLY when all hold; otherwise it is `needs_review` or
`insufficient` (never confirmed):

- the source is `verified` in 12T (else `needs_review`);
- `reviewer` and `reviewerRole` are present (else `needs_review`);
- `confirmedValue` is present unless `confirmedValueType` is `none` (else
  `insufficient`);
- `confirmedAsOf` is present for time-sensitive values — TVL / APY (else
  `insufficient`).

## Examples of acceptable confirmed values

- **TVL value** with source + as-of timestamp (e.g. a DefiLlama pool figure and the
  date it was read).
- **Withdrawal timing** with an official unstake doc (epoch-delay vs instant, exact
  time).
- **Fee value** with an official fee page.
- **Audit firm / date / scope** with an audit report.
- **Incident review** with an official advisory/postmortem or a documented manual
  review result.

## QA-only examples

`getExampleSourceValueConfirmations()` returns QA-ONLY inputs whose value is the
literal `QA_ONLY_NOT_LIVE` placeholder — never a live value or current market data.
They exist only to prove the confirmation logic (a valid case, an `insufficient`
case missing as-of, a `needs_review` case missing reviewer, and an unverified
source).

## What remains blocked

- A confirmed value **does not** mark an evidence dimension `gathered`.
  `mapConfirmedValuesToEvidenceCompletion()` marks a dimension gatherable only when
  ALL of its required confirmation categories are confirmed; partial confirmation
  is never enough (a TVL value alone does not gather `tvl_adoption`).
- `candidateReadyForReview` is true only if all six dimensions are gatherable —
  false today.
- `approvedForScoring` stays false because the rubric approval stays false.

## Why production selection remains disabled

No production value is written, no evidence draft is mutated, no `riskScore` is
assigned, the rubric and approval decision stay unapproved, and
`getProtocolSelectionGoNoGo()` stays `productionReady = false`. All selection flags
stay false and no protocol appears in the UI.
