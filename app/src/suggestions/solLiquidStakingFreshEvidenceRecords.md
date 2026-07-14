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
| Marinade · mSOL | 10 / 10 (see 14F–14I below) | `readyForRiskGate` while fresh — scored 7.40, approved for read-only review (14J/14K/14L) |
| Jupiter · JupSOL | 10 / 10 (Step 14M) | `readyForRiskGate` while fresh — scored 7.65, approved for read-only review (14M) |
| BlazeStake · bSOL | 10 / 10 (Step 14N) | `readyForRiskGate` while fresh — scored 7.35, approved for read-only review (14N) |
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

## Marinade · mSOL (Steps 14F + 14G + 14H + 14I)

**Status: COMPLETE — 10 of 10 categories verified & accepted; mSOL is
`readyForRiskGate: true` *while fresh* (within the 24h window).** Founder-authorized
public-source fetches on **2026-07-13** (`confirmedBy: "Ashot"`, `reviewerRole: "founder"`).
The stale 14B figures were not reused and nothing was invented. **Still no `riskScore`, not
approved, absent from real wallet mode** — rubric approval + risk-approval decision remain
separate later gates.

### Recorded (accepted)

| # | Category | Value | Source |
| --- | --- | --- | --- |
| 1 | `tvl` | $182,837,237 | [DefiLlama mSOL pool](https://yields.llama.fi/chart/b3f93865-5ec8-4662-90a0-11808e0aa2bd) (point 2026-07-13T12:01Z) |
| 2 | `current_apy` | 4.73658% (point-in-time snapshot) | DefiLlama mSOL pool |
| 3 | `apy_30d` | 5.84% (mean of last 30 daily points, range 4.69–7.07%) | DefiLlama mSOL pool |
| 4 | `withdrawal_mechanics` | Delayed unstake → claim ticket (~1–2 epochs); instant unstake via Jupiter LP route | [Marinade FAQ](https://docs.marinade.finance/marinade-protocol/faq) |
| 6 | `direct_unstake_fee` | 0.2% (direct/delayed path; instant path priced via LP/Jupiter, no fixed fee) | [Marinade FAQ](https://docs.marinade.finance/marinade-protocol/faq) |
| 8 | `audit_security` | Audited by Kudelski, Ackee, Neodyme, Sec3; SOC 2 Type I/II | [Marinade Audits](https://docs.marinade.finance/marinade-protocol/security/audits) |
| 7 | `annual_management_fee` | 0% on rewards — Marinade docs state "No performance fees on staking rewards" (verbatim); revenue via the SAM validator model; supersedes historical ~6% | [Marinade docs (full export)](https://docs.marinade.finance/llms-full.txt) |
| 9 | `operational_risk` | Delegation via SAM, stake pool, LP/Jupiter dependency, 13-party/6-signer multisig program control | [What is mSOL?](https://docs.marinade.finance/marinade-protocol/protocol-overview/marinade-liquid/what-is-msol) |
| 10 | `incident_review` | Documented SAM unstake-priority logic bug: ~37,000 SOL / ~28% missed rewards over epochs 652–777 (program logic bug, not a principal drain) | [Marinade forum incident report](https://forum.marinade.finance/t/incident-report-37-000-sol-in-losses-a-call-for-investigation-and-action/1853) |
| 5 | `direct_unstake_time` | **Text (14I):** "Claimable after epoch n+1; may become n+2 when unstaking in an epoch's final 4 hours" — recorded as sourced epoch-based text, not fixed hours | [Marinade FAQ](https://docs.marinade.finance/marinade-protocol/faq) |

> Notes: mSOL's DefiLlama APY snapshot oscillates day-to-day with the Solana epoch boundary
> (`apy === apyBase`, range ~4.7–7.1%); `current_apy` is the latest snapshot, `apy_30d` the
> deterministically computed 30-day mean. `direct_unstake_fee` = 0.2% is the direct/delayed
> path (FAQ verbatim); the instant path adds no Marinade protocol fee but is priced by the
> LP/Jupiter route. `annual_management_fee` = 0 records "No performance fees on staking
> rewards" (Marinade docs verbatim). `direct_unstake_time` is recorded as **epoch-based
> text** (Step 14I dual-format) — no hours were invented for an epoch-based protocol.
> `incident_review` is a point-in-time community-forum finding, **not** a clean-history
> claim, and concerns the SAM rewards mechanism, not staked principal.

All ten categories are accepted while fresh, so `getSolLstFreshEvidenceSummaries()` reports
mSOL `marketDataComplete: true`, `mechanicsComplete: true`, `evidenceComplete: true`,
**`readyForRiskGate: true`** (blockers: none) **within the 24h window**; beyond it the
records go `stale` and `readyForRiskGate` returns to `false`. The preview shows
`wouldClearValueAndEvidenceBlockers: true` but still `stillRequiresRubricApproval: true` /
`stillRequiresRiskApprovalDecision: true`; **no score is assigned and mSOL is not approved.**

Next for mSOL: rubric approval + risk-approval decision (a separate gate), then risk
scoring — none of which happen here.

## Next steps

- Provide **fresh real** records (all ten categories, within 24h) for a candidate.
- **14F** — approve the risk rubric / risk approval decision if not already.
- **14G** — assign risk scores only to candidates whose gate reports `readyForRiskGate`
  (and, later, a separately gated read-only approval).
