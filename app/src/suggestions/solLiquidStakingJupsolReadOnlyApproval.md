# Jupiter · JupSOL Read-Only Review Approval + UI Exposure (Step 14M)

**The approval gate that decides whether JupSOL can appear as a READ-ONLY REVIEW candidate
in the product UI, plus the display used to expose it**, based on its completed 14M evidence
and the JupSOL risk score. Backed by `solLiquidStakingJupsolReadOnlyApproval.ts`. Mirrors the
mSOL approval + display modules (14K/14L); JupSOL runs the full pipeline (approval **and** UI
exposure) in a single step.

It answers: *"can JupSOL be approved for read-only review exposure — and shown as an
alternative to review — without becoming the selected protocol or enabling execution?"*

## Decision: **approved_for_read_only_review** (active)

Approved by Ashot (founder) on the basis of the completed evidence, fresh evidence state,
risk score **7.65 / 10** (≥ 7 threshold), and explicit acknowledgement of JupSOL's
operational risks (single-validator concentration + Sanctum dependency).

## This is a limited approval

It approves JupSOL to appear as an **alternative protocol to review**. It does **not**:
select JupSOL, make it the winner, enable multi-protocol selection, replace JitoSOL, update
live recommendations, or enable transactions / signatures. It **never mutates the base
candidate registry**, so `getApprovedSolLiquidStakingCandidates()` (selector-facing) stays
Jito-only.

Flags: `SOL_LST_JUPSOL_READ_ONLY_APPROVAL_EXISTS = true`,
`..._APPROVES_REVIEW_EXPOSURE = true`; `..._SELECTS_PROTOCOL_WINNER`,
`..._ENABLES_MULTI_PROTOCOL_SELECTION`, `..._UPDATES_LIVE_RECOMMENDATIONS`,
`..._REPLACES_JITO`, `..._ENABLES_TRANSACTIONS`, `..._REQUIRES_WALLET_SIGNATURE` all `false`.

## Approval scope

`approvedForReadOnlyRecommendation: true`, `approvedForReviewExposure: true`;
`approvedForProtocolSelection: false`, `selectedByProtocolLogic: false`,
`currentWinner: false`, `updatesLiveRecommendations: false`,
`enablesMultiProtocolSelection: false`, `transactionsEnabled: false`,
`walletSignatureRequired: false`.

## Risk-score basis

`riskScore: 7.65`, `minimumRiskScoreRequired: 7`, `riskScoreStatus: assigned_for_review`.
`isRiskScoreAboveReadOnlyThreshold(score)` gates on `score >= 7`; a below-threshold score
is blocked (`risk_score_below_threshold`).

## Evidence basis

Requires JupSOL's evidence to be **complete + fresh + `readyForRiskGate`** at `checkedAt`.
The score assignment (JupSOL risk score module) is only produced from fresh evidence, so
beyond the 24h window the approval decision returns `null` with blockers `missing_risk_score`
/ `evidence_stale` / `not_ready_for_risk_gate`. Positive basis: Sanctum SPL Stake Pool
Program (audited 9×, >$4B secured), 11-member multisig upgrade authority, fresh TVL/APY, and
documented withdrawal paths (instant DEX swap or ~2-day direct unstake, 0.1% pool-unwrap fee).

## Acknowledged risks

- SOL is delegated to a **single** Jupiter validator — a validator-concentration dependency.
- JupSOL runs on Sanctum's SPL stake-pool infrastructure — a third-party dependency in
  addition to Jupiter.
- Multi-component fee structure: a 5% validator commission on inflation rewards plus a
  separate Sanctum epoch fee on base rewards.
- Delayed (direct) unstake timing is epoch-based (~2 days), not fixed hours; instant-swap
  pricing depends on DEX/market liquidity.
- The incident review is point-in-time: no independent incident was found, and the "without
  exploits" statement is Jupiter's own.

## Limitations

Read-only review exposure only; not an endorsement; not a safety claim and does not rank
JupSOL above other protocols; does not select JupSOL as the protocol winner, replace JitoSOL,
or enable multi-protocol selection; does not enable transactions/signatures/swaps/
deposits/staking execution; holds only while the evidence stays within the 24h window.

## Registry behavior

The **base registry is unchanged** — JupSOL stays `staged_candidate`,
`approvedForReadOnlyRecommendation: false`, `riskScore: undefined`. The review approval is
expressed via a **separate, non-mutating** combined preview,
`getAllReadOnlyReviewApprovedSolLiquidStakingCandidates()`, which returns the existing
Jito + mSOL list (produced verbatim by the mSOL module, so mSOL's behavior is unchanged) plus
JupSOL (marked `approved_read_only_review`, `riskScore: 7.65`, `selectedByProtocolLogic:
false`, `currentWinner: false`) when the approval is active. This keeps **read-only review
approval separate from selector eligibility**.

## UI exposure (Real Wallet, Demo, /testing)

`buildJupsolReadOnlyReviewCandidateDisplay({ checkedAt })` returns the read-only
`ProtocolReviewCandidateDisplay` rendered in the shared review modal's "Other protocols to
review" section, **alongside** the mSOL display:

- **Fresh + approved** → `reviewState: approved_for_review_exposure`, "Approved for read-only
  review", with the sourced market/mechanics/evidence and the 7.65 risk score, plus an
  "Open Jupiter staking page" link (`opensNewTab: true`).
- **Stale** → `reviewState: stale_evidence`, "Evidence needs refresh", with **no** presented
  market data.

It is REVIEW-ONLY: `selectedByProtocolLogic` / `currentWinner` / `transactionsEnabled` /
`walletSignatureRequired` are always `false`. Wiring: `stakingSuggestion` (Real Wallet),
`demoExactSolStakingScenario` (Demo), and `testingPageFixtures` (`/testing`) each pass both
the mSOL and JupSOL displays into `reviewDetails.otherProtocolsToReview`. In the fixture
engine run (generation time in 2025) both alternatives render as `stale_evidence`; in
production (generation time = now) both are fresh/approved.

## Selector behavior

Unchanged. The live selector still selects **Jito · JitoSOL only**;
`getApprovedSolLiquidStakingCandidates()` remains Jito-only; multi-protocol comparison stays
disabled. JupSOL is not selected and is never the winner — it only appears for review.

## No transactions

Nothing here connects a wallet, executes, signs, swaps, deposits, stakes, approves, or moves
funds. The only outbound action is a user-clicked external link to Jupiter's staking page in
a new tab.

## Next step

- A later **deterministic selector comparison** across approved read-only-review candidates
  (JitoSOL, mSOL, JupSOL) — only once WealthSmith's protocol-selection logic is extended to
  weigh more than one approved candidate. That does not happen in 14M.
