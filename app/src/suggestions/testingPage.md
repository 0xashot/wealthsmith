# Hidden `/testing` Page — Suggestion Category Visual QA (Step 13H)

**A hidden, fixture-only page at `/testing` that shows every suggestion category in
the SAME shared `SuggestionCard` + `SuggestionReviewModal` real wallet mode uses.** It
answers: *"how do all WealthSmith suggestion categories look in the real card and Review
Details modal?"* Backed by `../pages/testingPageFixtures.ts` (data + flags) and
`../pages/TestingPage.tsx` (layout wrapper only).

## Purpose

A single place for Ashot to visually verify each suggestion category — card layout,
badges, protocol display, and the Review Details modal — without needing a wallet, real
data, or a specific portfolio state. It is a QA surface, not a user feature.

## Fixture-only, read-only

- Uses deterministic fixture data only (`getTestingPageFixtures()`); **no real wallet
  data**, and it never connects a wallet or reads balances.
- **No transactions / signatures**: every fixture CTA is review-only
  (`executes_transaction` / `requires_wallet_signature` / `completion_on_click` all
  false); no `sendTransaction` / `signTransaction` / `signAllTransactions` /
  `signMessage`; no swap / deposit / withdraw / stake path.
- Does **not** mutate live suggestion behavior, Demo Mode, real wallet mode, the
  protocol selector, or Top Pick logic.

## Hidden route

- Route: **`/testing`**.
- **Not in navigation** and **not linked** from Dashboard, Portfolio, Demo Mode, or
  onboarding. Reachable only by opening the URL directly.
- Gated by `isTestingPageEnabled()`:
  - **Local:** enabled in any dev build — open `http://localhost:5173/testing`.
  - **Staging:** enable with `VITE_ENABLE_TESTING_PAGE=true` at build time.
  - **Production:** disabled by default unless `VITE_ENABLE_TESTING_PAGE=true` is set.
- When disabled, `/testing` falls back to the normal app (no separate error surface).
- `TestingPage` is imported only by `App.tsx` (the route gate) and the fixtures runner
  — never by Dashboard, Portfolio, `SuggestionRail`, or `RealWalletSuggestionsRail`.

## Shared card and modal (not testing-only copies)

The page renders each fixture through the shared `SuggestionCard`, and "Review Details"
opens the shared `SuggestionReviewModal`. There is **no** testing-only card or modal —
only a page/layout wrapper (`.testing-page`) and a category filter (All / Safety /
Allocation / Yield / Contributions / Review).

## Categories included

All nine: Safety Buffer, Rebalance (Allocation), Capital Efficiency, Trim Long-Tail,
Staking, Stable Yield, DCA, Position Optimization, and On Track. The Staking fixture
surfaces **Jito · JitoSOL** as the "Suggested protocol to review" with the verified
market data (TVL $767.95M, current APY 5.36%, 30-day APY 5.45%, direct unstake ~48h,
unstake fee 0.1%, 4% annual management fee on rewards). On Track is informational (no
CTA, never a Top Pick).

## Testing label

Every fixture carries **`TESTING_PREVIEW_NOT_LIVE`** (shown as a badge on the card and
modal and in the page header). This is distinct from `DEMO_PREVIEW_NOT_LIVE` (Demo Mode)
and `INTERNAL_PREVIEW_NOT_LIVE` (the dev-only internal preview route) — those labels are
reserved for those flows and are never used here.

## Flags (`testingPageFixtures.ts`)

`TESTING_PAGE_EXISTS = true`, `TESTING_PAGE_ROUTE = "/testing"`,
`TESTING_PAGE_VISIBLE_IN_NAV = false`, `TESTING_PAGE_USES_FIXTURE_DATA = true`,
`TESTING_PAGE_USES_REAL_WALLET_DATA = false`, `TESTING_PAGE_ENABLES_TRANSACTIONS = false`,
`TESTING_PAGE_MUTATES_LIVE_SUGGESTIONS = false` (plus `..._USES_SHARED_CARD/MODAL = true`
and `..._IMPORTED_BY_DASHBOARD/PORTFOLIO/RAIL = false`, grep-verified).

## Fixtures

`runTestingPageFixtureChecks()` (13H-A…AI) covers the route/safety flags, presence of
all nine categories, the `TESTING_PREVIEW_NOT_LIVE` label, the review-only / no-tx /
no-signature / no-completion guarantees, the JitoSOL staking fixture content, On Track
being non-actionable, the shared-card/modal usage, the hidden-route/nav guarantees, and
that Demo Mode and real wallet behavior are unchanged with no forbidden investment
claims.
