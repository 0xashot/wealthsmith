# Marinade · mSOL Read-Only Recommendation Approval Gate (Step 14K)

**The approval gate that decides whether mSOL can appear as a READ-ONLY REVIEW candidate
in the product UI**, based on its completed evidence and the 14J risk score. Backed by
`solLiquidStakingMsolReadOnlyApproval.ts`.

It answers: *"can mSOL be approved for read-only review exposure without becoming the
selected protocol or enabling execution?"*

## Decision: **approved_for_read_only_review** (active)

Approved by Ashot (founder) on the basis of the completed evidence, fresh evidence state,
risk score **7.40 / 10** (≥ 7 threshold), and explicit acknowledgement of the SAM
unstake-priority bug.

## This is a limited approval

It approves mSOL to appear as an **alternative protocol to review**. It does **not**:
select mSOL, make it the winner, enable multi-protocol selection, replace JitoSOL, update
live recommendations, expose mSOL in the UI (a later step), or enable transactions /
signatures. It **never mutates the base candidate registry**, so
`getApprovedSolLiquidStakingCandidates()` (selector-facing) stays Jito-only.

Flags: `SOL_LST_MSOL_READ_ONLY_APPROVAL_EXISTS = true`,
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

`riskScore: 7.40`, `minimumRiskScoreRequired: 7`, `riskScoreStatus: assigned_for_review`.
`isRiskScoreAboveReadOnlyThreshold(score)` gates on `score >= 7`; a below-threshold score
is blocked (`risk_score_below_threshold`).

## Evidence basis

Requires mSOL's evidence to be **complete + fresh + `readyForRiskGate`** at `checkedAt`.
The score assignment (14J) is only produced from fresh evidence, so beyond the 24h window
the approval decision returns `null` with blockers `missing_risk_score` /
`evidence_stale` / `not_ready_for_risk_gate`. Positive basis: independent audits + SOC 2,
fresh TVL/APY, documented unstake mechanics and fees (0.2% direct unstake, 0% reward fee),
and an explicitly reviewed incident history.

## Acknowledged risks

- The Stake Auction Market unstake-priority logic bug caused missed advertised rewards
  over epochs 652–777.
- Operational dependencies: SAM, stake pool mechanics, LP/Jupiter instant-liquidity
  dependency, and multisig governance.
- Delayed unstake timing is epoch-based, not fixed hours.
- Instant unstake can involve variable market pricing / liquidity.

## Limitations

Read-only review exposure only; not an endorsement; not a safety claim and does not rank
mSOL above other protocols; does not select mSOL as the protocol winner, replace JitoSOL,
or enable multi-protocol selection; does not enable transactions/signatures/swaps/
deposits/staking execution; holds only while the evidence stays within the 24h window.

## Registry behavior

The **base registry is unchanged** — mSOL stays `staged_candidate`,
`approvedForReadOnlyRecommendation: false`, `riskScore: undefined`. The review approval is
expressed via a **separate, non-mutating preview**,
`getReadOnlyReviewApprovedSolLiquidStakingCandidates()`, which returns JitoSOL plus mSOL
(marked `approved_read_only_review`, `riskScore: 7.40`, `selectedByProtocolLogic: false`,
`currentWinner: false`) when the approval is active. This keeps **read-only review
approval separate from selector eligibility**.

## Selector behavior

Unchanged. The live selector still selects **Jito · JitoSOL only**;
`getApprovedSolLiquidStakingCandidates()` remains Jito-only; multi-protocol comparison
stays disabled. mSOL is not selected and does not appear in real-wallet recommendations.

## No UI exposure yet / no transactions

mSOL is **not** shown in the UI in this step; nothing here connects a wallet, executes,
signs, or moves funds.

## Next step

- **14L** — add approved mSOL to Demo, `/testing`, and Real Wallet as a **read-only review
  candidate**, keeping JitoSOL selected and with **no selector comparison** yet.
