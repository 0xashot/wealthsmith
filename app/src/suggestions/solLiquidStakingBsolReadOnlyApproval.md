# BlazeStake · bSOL Read-Only Review Approval + UI Exposure (Step 14N)

**The approval gate that decides whether bSOL can appear as a READ-ONLY REVIEW candidate
in the product UI, plus the display used to expose it**, based on its completed 14N evidence
and the bSOL risk score. Backed by `solLiquidStakingBsolReadOnlyApproval.ts`. Mirrors the
mSOL (14K/14L) and JupSOL (14M) approval + display modules; bSOL runs the full pipeline
(approval **and** UI exposure) in a single step.

It answers: *"can bSOL be approved for read-only review exposure — and shown as an
alternative to review — without becoming the selected protocol or enabling execution?"*

## Decision: **approved_for_read_only_review** (active)

Approved by Ashot (founder) on the basis of the completed evidence, fresh evidence state,
risk score **7.35 / 10** (≥ 7 threshold), and explicit acknowledgement of bSOL's material
risks (smallest TVL of the reviewed set, epoch-based unstake timing, broader DeFi surface).

## This is a limited approval

It approves bSOL to appear as an **alternative protocol to review**. It does **not**: select
bSOL, make it the winner, enable multi-protocol selection, replace JitoSOL, update live
recommendations, or enable transactions / signatures. It **never mutates the base candidate
registry**, so `getApprovedSolLiquidStakingCandidates()` (selector-facing) stays Jito-only.

Flags: `SOL_LST_BSOL_READ_ONLY_APPROVAL_EXISTS = true`,
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

`riskScore: 7.35`, `minimumRiskScoreRequired: 7`, `riskScoreStatus: assigned_for_review`.
`isRiskScoreAboveReadOnlyThreshold(score)` gates on `score >= 7`; a below-threshold score
is blocked (`risk_score_below_threshold`).

## Evidence basis

Requires bSOL's evidence to be **complete + fresh + `readyForRiskGate`** at `checkedAt`.
The score assignment is only produced from fresh evidence, so beyond the 24h window the
approval decision returns `null` with blockers `missing_risk_score` / `evidence_stale` /
`not_ready_for_risk_gate`. Positive basis: 7 audits by 5 firms, non-custodial design with a
Solana-Foundation-overseen upgrade multisig, fresh TVL/APY, and transparent low fees (0%
deposit / 0% epoch fee / 0.1% unstake).

## Acknowledged risks

- bSOL has the **smallest TVL** of the reviewed candidates (~$67.1M) → lower adoption and
  instant-unstake liquidity depth.
- Delayed (direct) unstake timing is epoch-based (~2-3 days via native stake-account
  deactivation) and is not published by BlazeStake as fixed hours.
- Broader DeFi feature surface (BLZE rewards, custom liquidity) beyond core staking.
- The incident review is point-in-time: no independent incident was found, which is not a
  verified clean-history claim.

## Limitations

Read-only review exposure only; not an endorsement; not a safety claim and does not rank
bSOL above other protocols; does not select bSOL as the protocol winner, replace JitoSOL, or
enable multi-protocol selection; does not enable transactions/signatures/swaps/
deposits/staking execution; holds only while the evidence stays within the 24h window.

## Registry behavior

The **base registry is unchanged** — bSOL stays `staged_candidate`,
`approvedForReadOnlyRecommendation: false`, `riskScore: undefined`. The review approval is
expressed via the combined non-mutating preview
`getAllReadOnlyReviewApprovedSolLiquidStakingCandidates()` (in the JupSOL module), which now
returns Jito + mSOL + JupSOL (all unchanged) **plus** bSOL (marked
`approved_read_only_review`, `riskScore: 7.35`, `selectedByProtocolLogic: false`,
`currentWinner: false`) when the approval is active. The bSOL entry is produced by this
module's `getBsolReviewApprovedCandidateEntry()` helper. This keeps **read-only review
approval separate from selector eligibility**.

## UI exposure (Real Wallet, Demo, /testing)

`buildBsolReadOnlyReviewCandidateDisplay({ checkedAt })` returns the read-only
`ProtocolReviewCandidateDisplay` rendered in the shared review modal's "Other protocols to
review" section, **alongside** the mSOL and JupSOL displays:

- **Fresh + approved** → `reviewState: approved_for_review_exposure`, "Approved for read-only
  review", with the sourced market/mechanics/evidence and the 7.35 risk score, plus an
  "Open BlazeStake staking page" link (`opensNewTab: true`).
- **Stale** → `reviewState: stale_evidence`, "Evidence needs refresh", with **no** presented
  market data.

It is REVIEW-ONLY: `selectedByProtocolLogic` / `currentWinner` / `transactionsEnabled` /
`walletSignatureRequired` are always `false`. Wiring: `stakingSuggestion` (Real Wallet),
`demoExactSolStakingScenario` (Demo), and `testingPageFixtures` (`/testing`) each pass the
mSOL, JupSOL, and bSOL displays into `reviewDetails.otherProtocolsToReview`. In the fixture
engine run (generation time in 2025) all three alternatives render as `stale_evidence`; in
production (generation time = now) all are fresh/approved.

## Selector behavior

Unchanged. The live selector still selects **Jito · JitoSOL only**;
`getApprovedSolLiquidStakingCandidates()` remains Jito-only; multi-protocol comparison stays
disabled. bSOL is not selected and is never the winner — it only appears for review.

## No transactions

Nothing here connects a wallet, executes, signs, swaps, deposits, stakes, approves, or moves
funds. The only outbound action is a user-clicked external link to BlazeStake's staking page
in a new tab.

## Next step

- A later **deterministic selector comparison** across approved read-only-review candidates
  (JitoSOL, mSOL, JupSOL, bSOL) — only once WealthSmith's protocol-selection logic is
  extended to weigh more than one approved candidate. That does not happen in 14N. (Sanctum ·
  INF remains a staged candidate with no fresh evidence.)
