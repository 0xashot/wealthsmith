# SOL Liquid-Staking Production Metadata (Step 12Z)

**The production-readable metadata layer — STAGED and BLOCKED by default.** This
begins the production metadata structure with one staged JitoSOL candidate built
from already-confirmed evidence, but it activates nothing.
`PROTOCOL_SOL_LST_PRODUCTION_METADATA_ACTIVE = false`,
`PROTOCOL_SELECTION_IMPLEMENTED = false`,
`getProtocolSelectionGoNoGo().productionReady = false`. Backed by
`protocolSolLiquidStakingProductionMetadata.ts`.

## Purpose

Answer: *"how will WealthSmith store production-readable protocol metadata for
JitoSOL once human approval and real scoring are complete, without enabling
selection yet?"* This defines the shape and stages the data — it is not activation.

## Why production metadata is needed before exact recommendations

Before a protocol can ever be surfaced, its data must live in a single, auditable,
production-readable place (TVL/APY freshness, withdrawal, fees, audit, operational,
incident review, and an approved riskScore). 12Z creates that place; later steps
gate what fills and activates it.

## JitoSOL staged metadata

Built from confirmed evidence (12V values, 12X evidence). Status: **`blocked`**.

| Field | Value | Source |
| --- | --- | --- |
| TVL (USD) | 767,950,000 | DefiLlama pool (12V, fresh) |
| APY / APY-30d | 5.36% / 5.45% | DefiLlama pool (12V, fresh) |
| Withdrawal | direct unstake ~48h; instant exit is a swap route | Unstaking Overview (12X) |
| Fees | 0.1% direct-unstake, 4% annual mgmt | General FAQs (12X) |
| Audit | reviewed — Quantstamp / Neodyme / Kudelski (SPL Stake Pool scope) | Deployed Programs (12X) |
| Operational | DAO manager (limited) + StakeNet; documented addresses | Security Overview (12X) |
| Incident | point-in-time manual review, no sourced incident found | manual review (12X) |
| **riskScore** | **absent** | — (no real approved score) |

## Which values are populated vs. still blocked

- **Populated (source-backed):** TVL/APY (while fresh), withdrawal, fees, audit,
  operational summary, incident review summary.
- **Blocked:** the **riskScore is absent** (`riskScoreStatus: absent`), and the
  candidate is `blocked` with: `rubric_not_approved`, `production_risk_score_absent`,
  `source_reverification_required_before_beta`, `protocol_selection_disabled`,
  `go_no_go_not_passed`.

## Why the QA-only 7.75 score is not production

The 12Y QA path computes 7.75 to prove the calculation, but its inputs are tagged
`QA_ONLY_NOT_PRODUCTION`. `buildJitoSolProductionMetadataCandidate` rejects any
QA-tagged score, so it is **never** written as a production riskScore.

## Why real approval is still required

A production riskScore is accepted only from a real, `approved`, non-QA score
assignment under an `approved` decision with `scoreAssignmentAllowed = true` and
`selectionEnabled` false — none of which is true by default.

## Why source re-verification is still required before beta

The JitoSOL evidence was reviewer-supplied and not independently re-fetched.
`source re-verification is required before beta`: the candidate stays `blocked`
until an explicit re-verification flag is supplied.

## Why productionReady remains false, and why protocol selection remains disabled

`productionReady` / `selectionEnabled` / `liveSuggestionsUpdated` /
`transactionsEnabled` are always false; nothing is written to
`protocolRiskRegistry.ts` / `DEFILLAMA_POOL_MAPPINGS` / `ProtocolMarketData`; the
module is not imported by any live/engine/UI file; and `getProtocolSelectionGoNoGo()`
must still pass. **Production selection remains disabled** and no protocol appears in
the UI.

## Step 13G — JitoSOL read-only beta is a SEPARATE, approved record

The strict staged candidate above stays `blocked` (full production go/no-go still
false). The real-wallet **read-only** JitoSOL recommendation is powered by a distinct,
founder-approved record in `jitoSolBetaActivation.ts` —
see [jitoSolBetaActivation.md](jitoSolBetaActivation.md). That record marks JitoSOL
active for read-only recommendation with an approved risk score, while
`transactionsEnabled` stays false and full production readiness is **not** claimed
(`getJitoSolReadOnlyBetaGoNoGo().productionReady = false`). This module's staged
candidate is unchanged.
