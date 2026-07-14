# Sanctum · INF Read-Only Review Approval Gate — BLOCKED (Step 14O)

**The approval gate that decides whether Sanctum · INF can appear as a READ-ONLY REVIEW
candidate in the product UI**, based on its completed 14O evidence and the INF risk score
against a `>= 7` threshold. Backed by `solLiquidStakingInfReadOnlyApproval.ts`. Mirrors the
mSOL (14K/14L), JupSOL (14M), and bSOL (14N) approval modules.

It answers: *"can INF be approved for read-only review exposure without becoming the selected
protocol or enabling execution?"*

## Decision: **BLOCKED** — not approved

INF's evidence is **complete + fresh** and a risk score is assigned (**6.95 / 10**), but
**6.95 is below the 7.0 read-only-review threshold**. So the approval gate does **not** pass:

- `getInfReadOnlyApprovalDecision()` returns **`null`**.
- `evaluateInfReadOnlyApprovalStatus()` reports `approvedForReviewExposure: false` with
  blocker **`risk_score_below_threshold`**.
- INF is **NOT** added to `getAllReadOnlyReviewApprovedSolLiquidStakingCandidates()`
  (`getInfReviewApprovedCandidateEntry()` returns `null`).
- INF is **NOT** surfaced in Real Wallet, Demo, or the approved "Other protocols to review"
  modal section.

Flags: `SOL_LST_INF_READ_ONLY_APPROVAL_EXISTS = true`,
`..._APPROVES_REVIEW_EXPOSURE = false`; `..._SELECTS_PROTOCOL_WINNER`,
`..._ENABLES_MULTI_PROTOCOL_SELECTION`, `..._UPDATES_LIVE_RECOMMENDATIONS`,
`..._REPLACES_JITO`, `..._ENABLES_TRANSACTIONS`, `..._REQUIRES_WALLET_SIGNATURE` all `false`.

## Why blocked (honest assessment)

INF is a **multi-LST / shared-liquidity pool**, not a single LST. Its risk score lands just
below the single-LST cohort (JitoSOL 7.75 / JupSOL 7.65 / mSOL 7.40 / bSOL 7.35) because:

- it is a **basket** that inherits the aggregate risk of every underlying LST it holds;
- its underlying exposure **OVERLAPS** the selected protocol (JitoSOL) and an existing
  review candidate (bSOL) — so it is **not independent diversification**;
- it adds operational surface (dynamic allocation + S Controller / pricing / per-LST
  SOL-value-calculator dependency);
- its swap fees vary by LST (reduced fee transparency).

The gate is doing its job: a complete, well-audited candidate can still fall short of the
review-exposure bar on genuine risk-adjusted merits.

## Threshold gate

`INF_READ_ONLY_APPROVAL_MIN_RISK_SCORE = 7`; `isRiskScoreAboveReadOnlyThreshold(6.95)` is
`false`. Fresh evidence, `readyForRiskGate`, acknowledged risk, and a recorded approval are
all present — the **only** failing gate is the score threshold, so the single blocker is
`risk_score_below_threshold`.

## Internal (non product-facing) BLOCKED evidence view

`getInfBlockedReviewSummary({ checkedAt })` returns a clearly-labelled internal summary — its
own `InfBlockedReviewSummary` type, **not** a `ProtocolReviewCandidateDisplay` (that type is
for APPROVED candidates). It records that INF was fully evaluated (evidence complete + fresh,
score 6.95, multi-LST composition + overlap) but did not clear the threshold:
`reviewState: "blocked_below_threshold"`, `productFacing: false`, every
approval/selection/transaction flag `false`. It drives the clearly-labelled `/testing`
BLOCKED fixture (`testing_inf_blocked`) — the only place INF appears in the UI.

## UI exposure

**None (product-facing).** Because INF is not approved:

- Real Wallet staking review details — **INF absent** (only JitoSOL selected + mSOL/JupSOL/
  bSOL as approved alternatives).
- Demo Mode — **INF absent**.
- `/testing` — a dedicated **BLOCKED** internal card ("INF Review Candidate — Blocked")
  clearly labels it as below-threshold, shows the completed evidence + the 6.95 score + the
  multi-LST composition/overlap, and is **not** in any approved "Other protocols to review"
  section. Review-only; no execution CTA.

## Selector behavior

Unchanged. The live selector still selects **Jito · JitoSOL only**;
`getApprovedSolLiquidStakingCandidates()` remains Jito-only;
`getAllReadOnlyReviewApprovedSolLiquidStakingCandidates()` remains Jito + mSOL + JupSOL +
bSOL (no INF); multi-protocol comparison stays disabled.

## No transactions

Nothing here connects a wallet, executes, signs, swaps, deposits, stakes, approves, or moves
funds.

## Next step / how INF could clear later

INF would need a risk score `>= 7` — e.g. if its operational/fee-transparency evidence
improved or the rubric were revised (and approved) — at which point the approval decision and
UI-exposure wiring would follow the same path as mSOL/JupSOL/bSOL. That does not happen in
14O. With all five staged candidates now processed (4 approved for review, INF blocked), the
natural next step is the **deterministic multi-candidate selector comparison** across the
approved review candidates.
