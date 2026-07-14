# Native SOL / Jupiter Native Stake — Read-Only Review Approval Gate (Step 14P)

**The approval gate for the Native SOL / Jupiter Native Stake BASELINE candidate.** Backed by
`solNativeStakingBaselineReadOnlyApproval.ts`.

## Decision: BLOCKED (incomplete evidence — no risk score)

Native-staking evidence is missing its three market categories, so `readyForRiskGate` is
false and **no risk score is assigned**. With no score there is nothing to compare against the
7.0 threshold, so the approval gate cannot pass:

- `getNativeStakingBaselineReadOnlyApprovalDecision()` returns **`null`**.
- `evaluateNativeStakingBaselineReadOnlyApprovalStatus()` reports
  `approvedForReviewExposure: false` with blockers **`missing_risk_score`** +
  `not_ready_for_risk_gate` + `evidence_incomplete_or_stale`.
- The baseline is **NOT** surfaced in Real Wallet / Demo / the approved "Other protocols to
  review" section, and is **NOT** added to any read-only-review-approved list.

Flags: `SOL_NATIVE_STAKING_BASELINE_READ_ONLY_APPROVAL_EXISTS = true`,
`..._APPROVES_REVIEW_EXPOSURE = false`; `..._SELECTS_PROTOCOL_WINNER`,
`..._ENABLES_SELECTOR_COMPARISON`, `..._UPDATES_LIVE_RECOMMENDATIONS`, `..._REPLACES_JITO`,
`..._ENABLES_TRANSACTIONS`, `..._REQUIRES_WALLET_SIGNATURE` all `false`.

## Threshold gate

`NATIVE_STAKING_READ_ONLY_APPROVAL_MIN_RISK_SCORE = 7`;
`isRiskScoreAboveReadOnlyThreshold(score)` gates on `score >= 7`. Because no score exists, the
gate is blocked on `missing_risk_score` (not on the threshold itself).

## Internal (non product-facing) BLOCKED evidence view

`getNativeStakingBaselineBlockedReviewSummary({ checkedAt })` returns a clearly-labelled
internal `NativeStakingBlockedReviewSummary` (its own type — **not** a
`ProtocolReviewCandidateDisplay`, which is for approved LST candidates). It records the
recorded mechanics/evidence + the missing market categories + the not-an-LST distinction:
`reviewState: "blocked_incomplete_evidence"`, `notLstLabel: "Not a liquid staking token"`,
`isLiquidStakingToken: false`, `productFacing: false`, every approval/selection/transaction
flag `false`. It drives the clearly-labelled `/testing` BLOCKED card
(`testing_native_stake_blocked`) — the only place native staking appears in the UI.

## UI exposure

**None (product-facing).** Because native staking is not approved:

- Real Wallet staking review details — **absent** (only JitoSOL selected + mSOL/JupSOL/bSOL as
  approved LST alternatives).
- Demo Mode — **absent**.
- `/testing` — a dedicated **BLOCKED** internal card ("Native SOL Staking — Baseline
  (Blocked)") clearly labels it as incomplete, states it is a native stake account **not a
  liquid staking token / not JupSOL**, shows the recorded mechanics/security + the missing
  market categories, and is **not** in any approved "Other protocols to review" section.
  Review-only; no execution CTA.

## Selector behavior

Unchanged. The live selector still selects **Jito · JitoSOL only**;
`getApprovedSolLiquidStakingCandidates()` remains Jito-only; the read-only-review-approved LST
list remains Jito + mSOL + JupSOL + bSOL; multi-protocol comparison stays disabled. Native
staking is a **baseline** to compare against later — it is not selected, not the winner, and
not added to the LST approved list.

## No transactions

Nothing here connects a wallet, executes, signs, stakes, delegates, withdraws, swaps,
deposits, approves, or moves funds.

## Next step

Record the three missing market categories (an authoritative Jupiter native-staking APY /
30-day APY / delegated stake) → `readyForRiskGate` true → deterministic risk score → approval
(if `>= 7`) → UI exposure as a **baseline to review**. Then the deferred **deterministic
selector comparison** can weigh the approved LST candidates against this native-staking
baseline.

## Step 14T update — COMPLETED and APPROVED

The three market categories are now recorded from public, no-API-key validator data
(Stakewiz stake/current APY + Marinade duration-weighted 30-day APY = 5.40%; see
[nativeValidatorMarinadeData.md](./nativeValidatorMarinadeData.md)). Evidence is now **10/10
fresh** → `readyForRiskGate` → a deterministic **risk score of 7.10** (audit 8, maturity 7,
delegated-stake 8, fee-transparency 7, operational 5, incident 7) → **read-only approval**
(score ≥ 7). Jupiter Native Stake is surfaced as a **"Baseline to review"** in Real Wallet,
Demo, and `/testing` — validator-specific, not an LST (`isLiquidStakingToken: false`,
`splTokenMint: null`), never selected/winner, no execution path. Any earlier "blocked /
incomplete" wording above is superseded by this outcome.
