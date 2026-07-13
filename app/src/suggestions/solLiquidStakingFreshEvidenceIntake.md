# Fresh Source & Evidence Confirmation Intake (Step 14D)

**An intake + validation layer for recording fresh verified market data, mechanics,
fees, and audit/security/operational/incident evidence for the staged SOL liquid-staking
candidates (mSOL / JupSOL / bSOL / INF) before risk scoring.** Backed by
`solLiquidStakingFreshEvidenceIntake.ts`.

It answers: *"how do we record fresh verified market data, mechanics, fees, audit/security
evidence, operational risk evidence, and incident review for mSOL/JupSOL/bSOL/INF before
risk scoring?"*

## This is evidence intake only

It does **not** assign a risk score, approve a candidate, enable multi-protocol
selection, update a live recommendation, or replace Jito as the selected protocol. It
does not change Demo Mode or `/testing`, and adds no transaction/signature path. The
module is not imported by `stakingSuggestion` or any live/UI file — only by docs and
fixtures. **JitoSOL remains the only real-wallet selected SOL LST protocol.**

Flags: `SOL_LST_FRESH_EVIDENCE_INTAKE_EXISTS = true`; `..._ASSIGNS_RISK_SCORES`,
`..._APPROVES_CANDIDATES`, `..._ENABLES_MULTI_PROTOCOL_SELECTION`,
`..._UPDATES_LIVE_RECOMMENDATIONS`, `..._ENABLES_TRANSACTIONS`,
`..._REQUIRES_WALLET_SIGNATURE` all `false`.

## Required evidence categories

- **Market:** `tvl`, `current_apy`, `apy_30d` (numeric).
- **Mechanics:** `withdrawal_mechanics` (text), `direct_unstake_time`,
  `direct_unstake_fee`, `annual_management_fee` (numeric).
- **Evidence:** `audit_security`, `operational_risk`, `incident_review` (text).

## Freshness rule: 24 hours

`SOL_LST_FRESH_EVIDENCE_MAX_AGE_HOURS = 24`. A record is `accepted` only when its
`confirmedAt` is within 24h of the evaluation time; otherwise `stale`.

## Validation rules

`validateSolLstFreshEvidenceInput(input, checkedAt?)` → status. Every input must supply
**value + sourceName + sourceUrl + confirmedAt (valid ISO) + confirmedBy + reviewerRole**;
numeric categories require a number, text categories a string. Outcomes:

- `unsupported_protocol` — protocolId not one of marinade/jupiter/blazestake/sanctum.
- `invalid_category` — category not one of the ten above.
- `rejected` — a value whose type is wrong for the category (`invalid_value_type`).
- `incomplete` — a required field is missing (`missing_value` / `missing_source_name` /
  `missing_source_url` / `missing_confirmed_at` / `missing_confirmed_by` /
  `missing_reviewer_role`).
- `stale` — all fields valid but `confirmedAt` older than 24h (`stale_evidence`).
- `accepted` — all fields valid and fresh.

`createSolLstFreshEvidenceRecord(input, checkedAt?)` returns a record with the registry
`protocolName`/`lstSymbol`, the source/value/reviewer fields, its status, and blockers.

## Candidate summary

`summarizeSolLstFreshEvidenceRecords(records)` → per candidate:
`marketDataComplete` (accepted `tvl` + `current_apy` + `apy_30d`), `mechanicsComplete`
(all four mechanics), `evidenceComplete` (all three evidence), `allEvidenceFresh` (all
required accepted and none stale/incomplete), and `readyForRiskGate` (all four true).
Blockers: `market_data_incomplete`, `mechanics_incomplete`, `evidence_incomplete`,
`stale_evidence`, `incomplete_records`.

## Example complete evidence package (fixture-only)

`getSolLstFreshEvidenceFixtureInputs({ protocolId?, confirmedAt? })` returns a complete
set of **TEST_ONLY** inputs for one candidate (default `marinade`), each noted
*"Fixture-only value for intake validation; not production evidence."* It exists only to
exercise the intake — it does **not** update the registry, approve the candidate, assign a
score, or affect the live selector. Do not use its values as production evidence.

## Risk-gate preview

`previewSolLstRiskGateWithFreshEvidence(records)` is a NON-LIVE preview: when a candidate's
records would clear the value/evidence blockers it returns
`wouldClearValueAndEvidenceBlockers: true`, but **`stillRequiresRubricApproval: true`** and
**`stillRequiresRiskApprovalDecision: true`** (both currently unapproved). It mutates
nothing, assigns no score (`scoreAssigned: false`), and approves nothing
(`candidateApproved: false`).

## No risk scores / no approval / no selector / no transactions

Nothing here scores, approves, selects, updates a live recommendation, or moves funds.
mSOL/JupSOL/bSOL/INF do not appear in real wallet recommendations.

## Next steps

- Provide **fresh real** evidence records (all ten categories, within 24h) for a candidate.
- Approve the risk rubric and the risk approval decision.
- **14E** assigns scores only when the 14C gate reports a candidate `ready_for_scoring`.
