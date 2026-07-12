# SOL Liquid-Staking Selector UI Preview Shell (Step 13B)

**An internal-only preview of how the future exact SOL staking recommendation would
read — hard-disabled and never mounted in the live app.** It is not the real
Dashboard, Portfolio, or Review modal, and it is not beta-facing. Backed by
`protocolSolLiquidStakingSelectorPreview.ts`. `PROTOCOL_SELECTION_IMPLEMENTED =
false`, `getProtocolSelectionGoNoGo().productionReady = false`.

## Key properties

- **Hard-disabled:** `PROTOCOL_SOL_LST_SELECTOR_PREVIEW_ENABLED = false`; the default
  preview status is `disabled`.
- **Internal-only:** `internalOnly` always true.
- **Does not render in Dashboard / Portfolio / Review modal:**
  `showsInDashboard`/`showsInPortfolio`/`showsInReviewModal` always false; the module
  is not imported by any live/engine/UI file.
- **Does not update live suggestions:** `updatesLiveSuggestions` always false.
- **Does not enable transactions:** `transactionsEnabled` always false.

No React component is mounted anywhere; this step ships the copy model only.

## Blocked-state copy (default)

`getDefaultSolLstSelectorPreview()` returns status `disabled`, title "SOL staking
preview unavailable", blockers ("Selector preview is disabled.", "Protocol selection
is disabled.", "Production go/no-go has not passed."), and safety notes including
**"WealthSmith does not move funds for you."** No protocol is named.

`getInternalOnlySolLstSelectorPreviewExample()` shows the future copy shape (title
"Put Idle SOL to Work", label "Suggested protocol to review") tagged
`INTERNAL_PREVIEW_NOT_LIVE`, with blocked/future "why" phrasing and no selected
protocol. It uses no QA score and claims no production readiness.

## Future beta copy boundary

- Use **"Suggested protocol to review"** (a review starting point, not an endorsement).
- Always include **"WealthSmith does not move funds for you."**
- Avoid "best", "safest", "guaranteed", "risk-free", and "you should".

## Required gates before mounting anywhere

1. source re-verification complete;
2. approved rubric decision;
3. approved non-QA riskScore;
4. active production metadata;
5. production go/no-go pass;
6. product / copy / compliance approval;
7. UI readiness approval;
8. feature-flag enablement.

Until all of these are met, the preview stays disabled and no protocol is shown to
users. **Production selection remains disabled.**
