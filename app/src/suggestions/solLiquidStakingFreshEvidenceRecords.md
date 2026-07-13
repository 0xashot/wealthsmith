# Real Fresh Evidence Records for Staged SOL LST Candidates (Step 14E)

**Where real, freshly verified evidence for the staged SOL liquid-staking candidates
(mSOL / JupSOL / bSOL / INF) is recorded, using the 14D intake format.** Backed by
`solLiquidStakingFreshEvidenceRecords.ts`.

It answers: *"which staged candidates now have fresh verified evidence, and which still
remain blocked before risk scoring?"*

## This is manually verified evidence only

It does **not** assign a risk score, approve a candidate, enable multi-protocol
selection, update a live recommendation, or replace Jito as the selected protocol. It
does not change Demo Mode or `/testing`, and adds no transaction/signature path. The
module is not imported by `stakingSuggestion` or any live/UI file — only by docs and
fixtures. **JitoSOL remains the only real-wallet selected SOL LST protocol.**

Flags: `SOL_LST_FRESH_EVIDENCE_RECORDS_EXISTS = true`; `..._ASSIGN_RISK_SCORES`,
`..._APPROVE_CANDIDATES`, `..._ENABLE_MULTI_PROTOCOL_SELECTION`,
`..._UPDATE_LIVE_RECOMMENDATIONS`, `..._ENABLE_TRANSACTIONS`,
`..._REQUIRE_WALLET_SIGNATURE` all `false`.

## Current state — Mode A (empty/partial)

**No fresh verified values are available to record yet.** Per the critical rule (do not
invent values; do not reuse the stale 14B values as fresh), the four per-candidate input
arrays are **empty**, so every staged candidate stays **blocked** and none is
`readyForRiskGate`. This is exactly the intake's supported empty/partial mode.

| Candidate | Fresh records | Status |
| --- | --- | --- |
| Marinade · mSOL | none | blocked — all categories missing |
| Jupiter · JupSOL | none | blocked — all categories missing |
| BlazeStake · bSOL | none | blocked — all categories missing |
| Sanctum · INF | none | blocked — all categories missing |

## Required categories per candidate

Each candidate needs a fresh **accepted** record in all ten categories before it can be
`readyForRiskGate`:

- **Market:** `tvl`, `current_apy`, `apy_30d`
- **Mechanics / fees:** `withdrawal_mechanics`, `direct_unstake_time`,
  `direct_unstake_fee`, `annual_management_fee`
- **Evidence:** `audit_security`, `operational_risk`, `incident_review`

## How to add records

Append a fully populated `SolLstFreshEvidenceInput` to the matching array
(`MARINADE_MSOL_FRESH_EVIDENCE_INPUTS`, etc.). Every record must carry **value + unit +
sourceName + sourceUrl + confirmedAt (valid ISO) + confirmedBy + reviewerRole + notes** —
for example:

```ts
{
  protocolId: "marinade",
  category: "tvl",
  value: 184840000,           // a REAL, freshly verified value — not a placeholder
  unit: "usd",
  sourceName: "DefiLlama pool (mSOL)",
  sourceUrl: "https://defillama.com/yields/pool/…",
  confirmedAt: "2026-07-13T09:00:00Z",
  confirmedBy: "Ashot",
  reviewerRole: "founder",
  notes: ["Fresh source value verified for staged SOL LST evidence intake."],
}
```

Partial arrays are fine — missing categories stay missing. **Do not** add a record with a
placeholder or stale value; the intake would mark it `incomplete`/`stale`, not accepted.

## How freshness works

The 14D intake accepts a record only when it is complete **and** its `confirmedAt` is
within **24h** of the evaluation time; otherwise it is `stale`/`incomplete`/`rejected`. So
a candidate becomes `readyForRiskGate` only once every required category has a fresh
accepted record.

## What remains blocked after evidence is recorded

Even when a candidate's value/evidence records are complete, the non-live
`getSolLstFreshEvidenceRiskGatePreview` shows `wouldClearValueAndEvidenceBlockers: true`
but **`stillRequiresRubricApproval: true`** and **`stillRequiresRiskApprovalDecision:
true`** — no score is assigned and no candidate is approved.

## No risk scoring / approval / live change / transactions

`summarizeSolLstFreshEvidenceRecordStatus` reports `assignsRiskScores`,
`approvesCandidates`, `updatesLiveRecommendations`, `transactionsEnabled` all `false`.
mSOL/JupSOL/bSOL/INF do not appear in real wallet recommendations.

## Marinade · mSOL (Step 14F)

**Status: still blocked — 0 of 10 categories recorded.** No fresh mSOL value/evidence
could be recorded this step with valid human-reviewer provenance:

- No verified values + verification timestamp were supplied for mSOL.
- The **stale 14B** mSOL figures (TVL 184,840,000 / APY 4.75 / APY30d 5.87, confirmed
  2026-07-12) must **not** be reused as fresh — reusing them would fail the freshness
  rule and misrepresent provenance.
- No value may be invented, no placeholder or TEST_ONLY value used, and verification
  cannot be attributed to a reviewer who did not actually confirm it.

So `MARINADE_MSOL_FRESH_EVIDENCE_INPUTS` stays **empty**, and mSOL is **not**
`readyForRiskGate`. No score is assigned, mSOL is not approved, and it does not appear in
real wallet mode.

### Categories needing manual verification (and where to source them)

| # | Category | Suggested source |
| --- | --- | --- |
| 1 | `tvl` | DefiLlama mSOL pool (`.../yields/pool/b3f93865-5ec8-4662-90a0-11808e0aa2bd`) |
| 2 | `current_apy` | DefiLlama mSOL pool |
| 3 | `apy_30d` | DefiLlama mSOL pool |
| 4 | `withdrawal_mechanics` | Official Marinade docs (unstake/withdrawal) |
| 5 | `direct_unstake_time` | Official Marinade docs |
| 6 | `direct_unstake_fee` | Official Marinade docs |
| 7 | `annual_management_fee` | Official Marinade docs |
| 8 | `audit_security` | Official Marinade security/audit page |
| 9 | `operational_risk` | Official Marinade docs / documented manual review |
| 10 | `incident_review` | Marinade incident/security page or documented review |

To fill: after a reviewer verifies each value within 24h, append fully populated inputs
(value + unit + sourceName + sourceUrl + real `confirmedAt` + `confirmedBy` +
`reviewerRole` + notes) to `MARINADE_MSOL_FRESH_EVIDENCE_INPUTS`. Once all ten are fresh
and accepted, mSOL becomes `readyForRiskGate` — but the preview still shows rubric
approval and the risk approval decision are required, and no score is assigned here.

## Next steps

- Provide **fresh real** records (all ten categories, within 24h) for a candidate.
- **14F** — approve the risk rubric / risk approval decision if not already.
- **14G** — assign risk scores only to candidates whose gate reports `readyForRiskGate`
  (and, later, a separately gated read-only approval).
