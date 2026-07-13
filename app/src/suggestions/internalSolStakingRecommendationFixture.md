# Internal Fake-Token SOL Staking Recommendation Fixture (Step 13D)

**Dev-only fake-token data for previewing how an exact SOL staking recommendation
could look in a WealthSmith-style card.** It renders only inside the dev-only
preview route. Backed by `internalSolStakingRecommendationFixture.ts` +
`SolStakingRecommendationFixture.tsx`. `PROTOCOL_SELECTION_IMPLEMENTED = false`,
`getProtocolSelectionGoNoGo().productionReady = false`.

## Purpose

Answer *"how will the exact SOL staking recommendation look in the real card/review
pattern when the user has idle SOL?"* — using fake internal data, without touching
any live flow.

## Fake wallet data (not live, not real)

| Field | Value |
| --- | --- |
| Total SOL | 12.5 SOL |
| Fee reserve | 0.1 SOL |
| Eligible to review | 12.4 SOL |
| SOL price | ~$150 (clearly-fake internal value, not a live price) |
| Eligible (USD) | ~$1,860 (at the fake price) |

Suggested protocol to review: **Jito · JitoSOL**, shown only as an
`INTERNAL_PREVIEW_NOT_LIVE` example.

## What this is NOT

- **This is not Demo Mode.** It never touches the Demo Mode fixture suggestions.
- **This is not real wallet data.** Amounts and price are hardcoded fake values.
- **This is not production**, not beta-facing, and makes no recommendation to users.
- It does not update live suggestions, enable the selector, or enable transactions.

## Behavior

- `getInternalSolStakingRecommendationFixture()` returns the fake wallet +
  recommendation copy; `updatesLiveSuggestions` and `transactionsEnabled` are always
  false.
- The component renders the fake wallet summary, a recommendation card, why/blocked
  gates, safety notes, and action buttons. The buttons are disabled ("Open official
  protocol page", "View evidence"); they never navigate and there is no
  wallet/transaction code.
- It is never imported by `stakingSuggestion` / `engine` / `toSuggestionCard` /
  Dashboard / Portfolio / Review modal — only by the dev-only preview route.

## Required gates before any real use

1. source re-verification;
2. approved rubric decision;
3. real (non-QA) riskScore;
4. active production metadata;
5. production go/no-go pass;
6. product / copy / compliance sign-off.

Until all of these are met, this stays a dev-only fake-token preview and no protocol
is shown to users.
