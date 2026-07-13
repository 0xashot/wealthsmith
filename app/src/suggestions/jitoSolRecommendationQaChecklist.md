# JitoSOL Recommendation — QA Checklist (Step 13J)

**Status: Pending final funded-wallet QA.**

> Note: Real-wallet external-link verification will be completed after the wallet is
> funded. Ashot will fund the wallet later and run final real-wallet QA at the end.
> Until then, real-wallet behavior is covered by fixtures only, and UI is verified in
> Demo Mode and `/testing`.

Scope of the recommendation under test: the read-only JitoSOL idle-SOL staking
recommendation — Suggested protocol (Jito · JitoSOL) + verified market data (13G),
read-only route/liquidity/slippage checks (13I), and the read-only "Open Jito staking
page" external link (13J). Boundary throughout: review-only, no transaction, no
signature, no auto-open, no fund movement.

## 1. Demo Mode → SOL Staking Demo  ✅ Verified (this step)

- [x] Review Details button exists.
- [x] "Open Jito staking page" button exists (in Review Details).
- [x] Button opens `https://www.jito.network/staking/` in a new tab (`target="_blank"`, `rel="noopener noreferrer"`).
- [x] No wallet prompt.
- [x] No transaction prompt.
- [x] `DEMO_PREVIEW_NOT_LIVE` remains visible.

## 2. /testing → Staking  ✅ Verified (this step)

- [x] Review Details button exists.
- [x] "Open Jito staking page" button exists (in Review Details).
- [x] Button opens `https://www.jito.network/staking/` in a new tab (`target="_blank"`, `rel="noopener noreferrer"`).
- [x] No wallet prompt.
- [x] No transaction prompt.
- [x] `TESTING_PREVIEW_NOT_LIVE` remains visible.

## 3. Real wallet (idle SOL)  ⏳ Pending final funded-wallet QA — do not run now

Covered by fixtures now (13J-H/K/L/M and the 13G/13I real-wallet checks); browser
verification is deferred until the wallet is funded.

- [ ] Real wallet with idle SOL shows the JitoSOL recommendation.
- [ ] Review Details button exists (no Demo/Testing label).
- [ ] "Open Jito staking page" button exists and opens `https://www.jito.network/staking/` in a new tab.
- [ ] Suggested protocol (Jito · JitoSOL) + verified market data render.
- [ ] Route and execution checks render (route cost checked for review; liquidity/slippage not applicable).
- [ ] No wallet signature prompt.
- [ ] No transaction prompt.
- [ ] No page/route is auto-opened.

## 4. Read-only boundary (all surfaces)

- [x] `actionKind = review_only`; card CTA `executes_transaction` / `requires_wallet_signature` / `completion_on_click` all false (fixtures 13J-K/L/M).
- [x] External link is a plain anchor opened only on user click — never auto-opened (`JITOSOL_EXTERNAL_LINK_AUTO_OPENS = false`).
- [x] No `sendTransaction` / `signTransaction` / `signAllTransactions` / `signMessage` path (fixtures 13J-O; grep-verified).
- [x] No forbidden investment / auto-open claims in copy (fixtures 13J-P).
- [x] Global production flags stay off (`PROTOCOL_SELECTION_IMPLEMENTED`, `..._SHOW_IN_UI`, `..._ALLOW_TRANSACTIONS`, go/no-go `productionReady`, `PROTOCOL_SOL_LST_SELECTOR_ENABLED`).

## Automated coverage

`npm run tokens` · `tsc --noEmit` · `vite build` · suggestion fixtures (incl. the
real-wallet JitoSOL checks) all pass. Real-wallet fixture checks are **not** removed —
they keep real-wallet behavior covered while browser QA is pending.
