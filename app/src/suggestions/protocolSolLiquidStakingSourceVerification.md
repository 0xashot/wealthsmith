# SOL Liquid-Staking Source Verification Intake (Step 12T)

**Source-level review only. Not production metadata. Not risk approval. Not score
assignment. Not a protocol recommendation.** This classifies reviewer-supplied
source candidates as `verified` / `rejected` / `needs_review` at the SOURCE level —
"verified" means the source *link* is a legitimate source of the right kind, not
that any production value is confirmed. Backed by
`protocolSolLiquidStakingSourceVerification.ts`. `PROTOCOL_SELECTION_IMPLEMENTED =
false`, `getProtocolSelectionGoNoGo().productionReady = false`.

## Purpose

Answer: *"can reviewer-supplied source candidates be reviewed, accepted, rejected,
or kept as needs_review without assigning riskScore or enabling protocol
selection?"* Yes — as a source-existence classification that writes nothing to
production and mutates no evidence drafts.

## What this is NOT

- **Source verification is not production metadata.** No TVL/APY/withdrawal/fee
  value, and no `auditStatus`, is written. `productionMetadataUpdated` is always
  false.
- **Source verification is not score assignment.** No `riskScore` is assigned;
  `scoreAssigned` is always false.
- **Source verification is not risk approval.** The rubric and approval decision
  stay unapproved.
- **Source verification is not a protocol recommendation** and does not select or
  endorse any candidate.

## Candidates by protocol / category

Reviewer-supplied candidates (proposals for verification):

| Protocol / LST | tvl | withdrawal | fees | audit_security | operational_dependency | incident_history |
| --- | --- | --- | --- | --- | --- | --- |
| Jupiter / JupSOL | DefiLlama pool | docs + FAQ | support + docs | docs + FAQ (scope unclear) | docs + FAQ | none supplied |
| Marinade / mSOL | DefiLlama pool | instant-unstake docs | fees + unstake docs | audits + security | mSOL token + security | none supplied |
| Jito / JitoSOL | DefiLlama pool | unstaking overview | unstaking + FAQs | security overview | security overview | none supplied |
| BlazeStake / bSOL | DefiLlama pool | docs | docs + fees | audits | docs + audits | none supplied |
| Sanctum / INF | codebase pool (existing) | Infinity + swap-vs-unstake | LSTs + Infinity | LSTs docs | Infinity + LSTs | none supplied |

## What was verified (as source existence)

- **TVL:** the four DefiLlama pool candidates (JupSOL/mSOL/JitoSOL/bSOL) are
  `verified` as source candidates because each carries an exact pool UUID + expected
  LST symbol + Solana chain label. INF is `verified` via the existing
  codebase-verified pool. **None is promoted to `DEFILLAMA_POOL_MAPPINGS`** and no
  TVL value is assigned.
- **Withdrawal / fees / audit / operational:** official source links are `verified`
  as source existence — the link is a legitimate official source of the right
  category. **No production value is assigned** (see below).

## What remains needs_review

- **Incident history:** `needs_review` for all five. No official
  incident/advisory/postmortem source was supplied, and absence of known incidents
  is never treated as a clean record.
- The Jupiter audit_security docs whose scope is not explicit stay `needs_review`.

## Why links do not yet assign production values

- **Withdrawal links** do not assign `withdrawalTimeHours` — a verified link is not
  a confirmed unstake timing, and swap-route liquidity is not protocol withdrawal.
- **Fee links** do not assign fee values — never inferred, never assumed zero.
- **Audit links** do not change `auditStatus` from `unknown` — that needs a
  confirmed firm + report scope in a later manual review.

Every verified result carries the unresolved question: *confirm the exact
value/mechanics from this source in a later manual review before any production
use.*

## Mapping to evidence dimensions (non-mutating)

`mapVerifiedSourcesToEvidenceDimensions(protocolId)` reports which rubric
dimensions now have at least one verified source. It **mutates no evidence drafts**
and **`canMarkAnyDimensionGathered` is always false** — a verified source *link* is
necessary but not sufficient; a dimension becomes `gathered` only when its evidence
VALUES are confirmed under the approved rubric.

## Why production selection remains disabled

No production value is written, no `riskScore` is assigned, the rubric and approval
decision stay unapproved, and `getProtocolSelectionGoNoGo()` stays `productionReady
= false`. All selection flags stay false and no protocol appears in the UI.
