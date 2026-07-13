# Demo Mode Exact SOL Staking Scenario (Step 13E)

**A Demo Mode exact SOL staking scenario that renders through the SAME shared UI and
behavior real wallet mode will use.** Same mapper shape, same `SuggestionCard`, same
`SuggestionReviewModal`, same action model, same guardrail rendering — the only
difference is the data source (fake demo wallet vs. a live wallet). Backed by
`demoExactSolStakingScenario.ts`. `PROTOCOL_SELECTION_IMPLEMENTED = false`,
`getProtocolSelectionGoNoGo().productionReady = false`.

## Purpose

Answer *"how will the exact SOL staking recommendation look in the real WealthSmith
suggestion card and Review Details modal when Demo Mode uses fake wallet data?"* —
by rendering fixture data through the shared real-wallet rail/card/modal.

## Same UI and behavior as real wallet mode

Real wallet mode is the source of truth. Demo Mode's SOL Staking scenario builds a
shared `RailSuggestions` payload (`buildDemoExactSolStakingRail()`) — a
`SuggestionCardState` card + a `SuggestionReviewDetails` — and renders it through the
same `RealWalletSuggestionsRail` → `SuggestionCard` → `SuggestionReviewModal`. There
is **no separate demo-only card, modal, or layout**. Optional protocol-display fields
were added to the shared card + review-details models; real wallet mode does not
populate them yet.

## Fake wallet values (not real wallet data)

| Field | Value |
| --- | --- |
| Total liquid SOL | 12.5 SOL |
| Fee reserve | 0.1 SOL |
| Eligible to review | 12.4 SOL |
| SOL price | $150 (fake) |
| Eligible (USD) | $1,860 |

Suggested protocol to review: **Jito · JitoSOL**, labeled **`DEMO_PREVIEW_NOT_LIVE`**
(Demo Mode uses `DEMO_PREVIEW_NOT_LIVE`, never `INTERNAL_PREVIEW_NOT_LIVE` — that
label is only for the dev-only internal route).

## Verified JitoSOL market data (Demo Mode, Step 13F)

The shared Review Details modal shows verified JitoSOL market data via
`protocolSelectionDisplay.marketData` (source status **"Verified source data · Demo
preview"**):

| Field | Value |
| --- | --- |
| TVL | $767.95M |
| Current APY | 5.36% |
| 30-day APY | 5.45% |
| Direct unstake | ~48 hours |
| Direct unstake fee | 0.1% |
| Annual management fee | 4% on rewards |

The demo guardrail now reads "Protocol selection (verified for demo)" instead of
"needs market data WealthSmith doesn't have yet". This is a **shared** modal section
(real wallet mode will use the same section once production selection is enabled) and
renders only when `marketData` exists. `productionStatus.realWalletSelectionEnabled`
and `.transactionsEnabled` are false; the limitations still state production selection
is disabled and real wallet mode needs the approval gates. No production flag changes,
no transaction/signature path.

## Not production selection

- This is not real wallet data and not production selector output.
- It does not enable the selector, real protocol selection, or transactions
  (review-only; `transactionsEnabled`/`requiresWalletSignature`/`completionOnClick`
  all false).
- It does not update real-wallet suggestions or activate production metadata.
- No transaction / signature / swap / deposit / withdraw path.

## Required gates before real wallet use

1. source re-verification recorded;
2. approved rubric decision;
3. real (non-QA) riskScore;
4. active production metadata;
5. production go/no-go pass;
6. product / copy / compliance sign-off;
7. real-wallet QA.

Until then, this stays a Demo Mode fixture and real wallet mode shows no exact
protocol recommendation.
