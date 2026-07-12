# SOL Liquid-Staking Source Checklist (Step 12L)

**Source status only. Production selection remains disabled.** This tracks which
data is source-backed per candidate and what still blocks eligibility. No
protocol is recommended; source status alone never creates eligibility (the
actual data VALUES must exist). `PROTOCOL_SELECTION_IMPLEMENTED = false`,
`SOL_LIQUID_STAKING_SELECTION_ENABLED = false`.

Statuses: `verified` · `partially verified` · `missing` · `not assigned` ·
`not applicable`. Backed by `protocolSolLiquidStakingSources.ts`.

| Candidate | Mint | APY | TVL | Withdrawal | Fees | Audit | RiskScore | Liquidity/Route | Current eligibility blocker |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| jupiter (JupSOL) | verified | verified | missing | missing | missing | missing | not assigned | missing / not applicable | riskScore, TVL, withdrawal, fees, live APY value |
| marinade (mSOL) | verified | verified | missing | missing | missing | missing | not assigned | missing / not applicable | riskScore, TVL, withdrawal, fees, live APY value |
| jito (JitoSOL) | verified | verified | missing | missing | missing | missing | not assigned | missing / not applicable | riskScore, TVL, withdrawal, fees, live APY value |
| blazestake (bSOL) | verified | verified | missing | missing | missing | missing | not assigned | missing / not applicable | riskScore, TVL, withdrawal, fees, live APY value |
| sanctum (INF) | verified | verified | verified | missing | missing | missing | not assigned | missing / not applicable | riskScore, withdrawal, fees, live APY value |

Notes:

- **Mint + APY source: verified** for all five (mints from app source; APY helpers
  exist in `lstApy.ts`). A *verified source* is not a *value* — live APY is fetched
  and injected by a dev caller; with no injection the value stays absent.
- **TVL: verified only for Sanctum/INF** via a verified DefiLlama pool UUID. The
  other four have no verified pool UUID in the codebase — TVL stays `missing`;
  none was guessed.
- **Withdrawal / fees / audit: missing** — not sourced; never assumed
  instant/zero, never inferred from APY, never conflated with swap-route liquidity.
- **RiskScore: not assigned** for all — awaits an approved methodology + evidence
  (`protocolRiskMethodology.md`, `protocolSolLiquidStakingRiskSources.md`).
- **Route: not applicable** — a liquid-staking deposit needs no swap route.

## Why production selection remains disabled

Even with mints + APY sources verified, every candidate is blocked by missing
`riskScore` (and TVL/withdrawal/fees for most), so the internal dry-run returns
`insufficient_data`. Selection stays disabled until those are source-backed, a
real-data dry-run passes, and the production-readiness gates
(`protocolSelectionProductionReadiness.md`) are met.

## 12O sourcing status

Step 12O adds a PROPOSAL registry (`protocolSolLiquidStakingSourceCandidates.ts`)
that tracks where to source each missing field. It changes no production status —
records now carry `hasProposedSourceCandidate: true` as a cross-link only.

| Category | Verified | Proposed / needs_review | Still missing (production) |
| --- | --- | --- | --- |
| Mint | all five | — | — |
| APY (source) | all five | — | — |
| TVL | Sanctum/INF only | JupSOL/mSOL/JitoSOL/bSOL (needs_review: exact DefiLlama UUID) | 4/5 values |
| Withdrawal | — | all five (proposed: official unstake docs) | all five |
| Fees | — | all five (proposed: official fee docs) | all five |
| Audit | — | all five (proposed: security/audit page) | all five |
| RiskScore | — | all five (evidence-gathering only) | all five (`not_assigned`) |

**Before production metadata changes:** a proposed/needs_review candidate must be
promoted to `verified` with exact evidence (e.g. a confirmed DefiLlama pool UUID,
an official unstake-timing doc, a fee schedule, an audit firm + report link) in a
later, explicit, human-reviewed step. Until then production status stays `missing`
/ `not_assigned` and `productionReady = false`.

## 12S evidence completion (Sanctum / INF)

The evidence-completion harness (`protocolSolLiquidStakingEvidenceCompletion.ts`)
reviews Sanctum/INF's rubric evidence toward `gathered`. Current result: **0/6
gathered.** Sanctum's TVL evidence stays **`partial`** — a single verified TVL
source does not complete the `tvl_adoption` dimension while adoption/freshness
requirements and unresolved questions remain. **Partial evidence remains partial
unless all rubric requirements for the dimension are satisfied.** No score is
assigned and no source is promoted into production metadata.

## 12T source verification

The source-verification intake (`protocolSolLiquidStakingSourceVerification.ts`)
classifies reviewer-supplied source links at the SOURCE level:

- **Verified (source existence):** TVL DefiLlama pools for JupSOL/mSOL/JitoSOL/bSOL
  (exact pool UUID + label + Solana), INF via the existing codebase pool, and
  official withdrawal/fee/audit/operational docs links.
- **Needs review:** incident_history for all five (no official incident/advisory
  source supplied; absence is not clean history), plus any source whose scope is
  not explicit.

Source-level `verified` is NOT production metadata: TVL pools are **not** added to
`DEFILLAMA_POOL_MAPPINGS`, `auditStatus` stays `unknown`, and no withdrawal/fee
value is assigned. Production statuses in the table above are unchanged.

## 12U value-confirmation checklist

Before a reviewer-confirmed value counts (per source, per dimension):

- [ ] source is `verified` at the source level (12T);
- [ ] the exact value is copied from that source (`confirmedValue`);
- [ ] an as-of timestamp is supplied for time-sensitive values (TVL/APY);
- [ ] a reviewer + reviewerRole are supplied;
- [ ] the dimension's unresolved questions are closed;
- [ ] **still no production metadata** is written, and no evidence draft is
      mutated.

A dimension is gatherable only when ALL its required values are confirmed; partial
confirmation stays incomplete. See
`protocolSolLiquidStakingSourceValueConfirmation.md`.

## 12V real-value ledger checklist

A reviewer-confirmed real value (non-production ledger) must carry:

- [ ] source (verified, with pool id for DefiLlama);
- [ ] the exact value copied from the source;
- [ ] an as-of timestamp;
- [ ] reviewer + reviewerRole;
- [ ] a freshness status (`confirmed` within 24h for TVL/APY, else `stale`).

**Stale values cannot support evidence gathering** and must be re-confirmed. TVL/APY
confirmations support only `tvl_adoption`, and only when fresh. Confirmed
JupSOL/mSOL/JitoSOL/bSOL TVL/APY are recorded; INF stays absent/needs_review (no
exact value supplied). See `protocolSolLiquidStakingRealValueConfirmations.md`.

## 12W gather-decision checklist

Before recording a dimension as `gathered` (in the non-production ledger):

- [ ] the required confirmed values exist (12V);
- [ ] those values are fresh (within the freshness window);
- [ ] the reviewer decision is recorded (reviewer + role + decided-at);
- [ ] the dimension's unresolved questions are closed;
- [ ] the base evidence draft is **not** mutated;
- [ ] production metadata is **not** updated.

Current: `tvl_adoption` gathered for JupSOL/mSOL/JitoSOL/bSOL (fresh), INF
`needs_review`; the other five dimensions have no decision. Stale values revert a
dimension to not-gathered. See `protocolSolLiquidStakingEvidenceGatherDecisions.md`.

## 12X JitoSOL readiness checklist

JitoSOL now has all six dimensions gathered from source-backed confirmations:

- [x] audit_security — SPL Stake Pool audits (Quantstamp/Neodyme/Kudelski), deployed programs;
- [x] maturity — official blog production history;
- [x] withdrawal_fee_transparency — unstake mechanics + ~48h + 0.1% + 4% mgmt fee;
- [x] operational_dependency_risk — DAO manager + StakeNet + addresses;
- [x] incident_history — completed manual review (not a clean-history claim);
- [x] tvl_adoption — fresh 12V TVL/APY/APY-30d.

**Stale TVL/APY must be re-confirmed** (JitoSOL drops to 5/6 when stale). The
**incident review must be rechecked before beta and before production.** JitoSOL is
`ready_for_review` but **not** `approved_for_scoring`; no `riskScore` is assigned.
See `protocolSolLiquidStakingJitoEvidenceConfirmations.md`.

## 12Y scoring checklist

Before a real (non-QA) `riskScore` can be assigned to a candidate:

- [ ] all six dimensions gathered (candidate `ready_for_review`);
- [ ] source re-verification complete (re-fetch each cited source);
- [ ] rubric approval recorded (explicit `approved` decision);
- [ ] per-dimension scores reviewed (0–10, rationale + evidence sources);
- [ ] score assignment explicitly allowed;
- [ ] production go/no-go (`getProtocolSelectionGoNoGo()`) still required before UI.

Default state is blocked; JitoSOL has no production `riskScore`. See
`protocolRiskScoreAssignment.md`.

## 12Z production metadata checklist

Before a staged production-metadata candidate can be activated (a later step):

- [ ] real approved (non-QA) `riskScore` assigned;
- [ ] source re-verification complete;
- [ ] TVL/APY fresh;
- [ ] withdrawal data present;
- [ ] fee data present;
- [ ] audit data present;
- [ ] operational + incident review present;
- [ ] production go/no-go (`getProtocolSelectionGoNoGo()`) still required.

The JitoSOL candidate is `blocked` today (no approved score, no re-verification).
See `protocolSolLiquidStakingProductionMetadata.md`.

## 13A selector checklist

Before the selector can pick a protocol for a user-facing surface:

- [ ] source re-verification complete;
- [ ] approved non-QA riskScore assigned;
- [ ] active production metadata;
- [ ] fresh data;
- [ ] production go/no-go pass;
- [ ] product / copy / UI approval;
- [ ] selector feature flag enabled.

The selector shell is hard-disabled today (`selectSolLiquidStakingProtocol()` →
`disabled`), so no protocol is selected. See `protocolSolLiquidStakingSelector.md`.
