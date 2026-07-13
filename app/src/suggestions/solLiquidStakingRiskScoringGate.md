# Risk Scoring Gate for Staged SOL LST Candidates (Step 14C)

**A gate — not scoring.** It decides which staged SOL liquid-staking candidates are
blocked from risk scoring, and exactly why, by requiring verified source/value/evidence
prerequisites plus an approved rubric and approval decision before scoring could ever be
allowed. Backed by `solLiquidStakingRiskScoringGate.ts`.

It answers: *"which staged SOL LST candidates are blocked from risk scoring, and exactly
why?"*

## This is a gate, not scoring

It does **not** assign a risk score, approve a candidate, enable multi-protocol
selection, update a live recommendation, or replace Jito as the selected protocol. It
does not change Demo Mode or `/testing`, and adds no transaction/signature path. Every
result carries `scoreAssigned: false`, `candidateApproved: false`,
`liveRecommendationsUpdated: false`, `transactionsEnabled: false`. The module is not
imported by `stakingSuggestion` or any live/UI file — only by docs and fixtures.

Flags: `SOL_LST_RISK_SCORING_GATE_EXISTS = true`; `..._ASSIGNS_SCORES`,
`..._APPROVES_CANDIDATES`, `..._ENABLES_MULTI_PROTOCOL_SELECTION`,
`..._UPDATES_LIVE_RECOMMENDATIONS`, `..._ENABLES_TRANSACTIONS`,
`..._REQUIRES_WALLET_SIGNATURE` all `false`.

## Candidates covered

Marinade · mSOL, Jupiter · JupSOL, BlazeStake · bSOL, Sanctum · INF. (Jito · JitoSOL
returns `already_approved` — it already carries an approved risk score and is not
re-scored here.)

## Current blockers by candidate

Evaluated with the stale (beyond-24h) source values from 14B and the current
draft/unapproved rubric + approval decision:

| Candidate | Status | Blockers |
| --- | --- | --- |
| mSOL / JupSOL / bSOL | `blocked` | `market_data_stale`, `mechanics_review_required`, `evidence_review_required`, `source_reverification_required`, `approved_rubric_missing`, `risk_approval_decision_missing` |
| INF | `blocked` | `market_data_missing`, `mechanics_review_required`, `evidence_review_required`, `source_reverification_required`, `approved_rubric_missing`, `risk_approval_decision_missing` |

Summary (default): `totalStagedCandidates: 4`, `readyForScoringCount: 0`,
`blockedCount: 4`, `canAssignRiskScoreCount: 0`.

## Gate rules

`evaluateSolLstRiskScoringGate(protocolId, { checkedAt?, requireApprovedRubric?,
requireApprovalDecision? })` (both requirements default `true`):

- unknown protocol → `not_candidate` + `candidate_not_found`;
- Jito (approved) → `already_approved` (+ `risk_score_already_exists`), `canAssignRiskScore` false;
- non-staged candidate → `blocked` + `candidate_not_staged`;
- staged candidate → collects blockers from the 14B confirmation summary
  (market missing/stale, mechanics/evidence review), the registry evidence
  (`source_reverification_required`), and the rubric/approval-decision state
  (`approved_rubric_missing`, `risk_approval_decision_missing`).

`ready_for_scoring` (and `canAssignRiskScore: true`) only when a staged candidate has
market **and** mechanics **and** evidence all `verified`, source re-verification cleared,
and rubric + approval decision permitting scoring — with **no** blockers. `scoreAssigned`
stays false regardless (14C never scores). Batch: `evaluateAllStagedSolLstRiskScoringGates`;
counts: `summarizeSolLstRiskScoringGates`.

## Ready-state fixture

`buildSolLstRiskScoringGateReadyFixture(protocolId)` is **fixture-only**: it returns an
artificial `ready_for_scoring` result to prove the gate can return ready when
prerequisites are met, without mutating the registry, scoring, approving, or updating any
live recommendation (`scoreAssigned` / `candidateApproved` stay false).

## No live behavior changes / no transactions

JitoSOL remains the only real-wallet selected SOL LST protocol; mSOL/JupSOL/bSOL/INF do
not appear in real wallet recommendations; no transaction/signature/swap/deposit path
exists.

## Next steps

To unblock a staged candidate for scoring: (1) refresh market data within the 24h window;
(2) confirm mechanics/fees; (3) confirm audit/security, operational risk, and incident
review; (4) approve the rubric and the risk approval decision. Then **14D** assigns scores
only for candidates the gate reports as `ready_for_scoring`. Selector comparison stays
deferred until more than one candidate is approved for read-only recommendation.
