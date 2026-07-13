# JitoSOL Read-Only Route / Liquidity / Slippage Evaluation (Step 13I)

**Read-only evaluation of route cost, liquidity depth, and slippage for the approved
JitoSOL recommendation — without enabling transactions.** Backed by
`jitoSolReadOnlyRouteEvaluation.ts`, surfaced in the shared Review Details modal as a
"Route and execution checks" section for the real-wallet recommendation, the Demo Mode
SOL Staking scenario, and the `/testing` Staking fixture.

It answers: *"can WealthSmith evaluate whether the reviewed JitoSOL path looks
reasonable from a route/liquidity/slippage perspective, while staying read-only?"*

## Read-only boundary

This is **evaluation only**. It is **not** a swap, **not** a staking transaction,
**not** a route-execution feature, **not** a deposit, **not** wallet signing. It never:
builds/prefills/sends a transaction, calls `signMessage` / `signTransaction` /
`signAllTransactions` / `sendTransaction`, auto-opens an external route, marks execution
as ready, or completes a suggestion on click. The suggestion stays
`actionKind = review_only` with `executes_transaction` / `requires_wallet_signature` /
`completion_on_click` / `transactionsEnabled` all false.

## Direct protocol path vs. swap route path

Idle SOL → JitoSOL is a **direct protocol stake** (the Jito stake pool), not a DEX swap:

| Check | Direct protocol path | Why |
| --- | --- | --- |
| Route cost | **Checked for review** | The direct protocol route is reviewed; no transaction is created by WealthSmith. |
| Liquidity depth | **Not applicable** | DEX liquidity depth is not required for the direct protocol path. |
| Slippage | **Not applicable** | Slippage is not applicable to the direct protocol path. |

The **swap route path** (`evaluateJitoSolSwapRoute`) only reports values from a real
read-only quote. Without a fresh quote it stays **`insufficient_data`** — route cost,
liquidity depth, and slippage are **never invented**. When a quote is present, only its
real values pass through (e.g. price impact → slippage). The recommendation is never
blocked by a missing swap quote, because the direct protocol review can still be shown.

## Why liquidity / slippage can be "not applicable"

Direct liquid staking mints JitoSOL from the stake pool at the pool's exchange rate — it
does not route through a DEX order book or AMM, so there is no DEX liquidity depth to
check and no swap slippage. Marking them **not applicable** (rather than "not evaluated")
is the honest status for this path.

## Model (`jitoSolReadOnlyRouteEvaluation.ts`)

`JitoSolRouteEvaluation` carries `status`
(`checked_for_review` | `not_applicable` | `insufficient_data` | `stale` | `unavailable`),
`routeType`, `inputAsset: "SOL"`, `outputAsset: "JitoSOL"`, `inputAmountSol`, optional
`routeCostLabel` / `liquidityDepthLabel` / `slippageLabel` / `priceImpactPct` /
`estimatedOutputJitoSol`, `sourceStatusLabel`, `checkedAt`, `limitations`, and
`transactionsEnabled: false` / `requiresWalletSignature: false`.
`buildJitoSolRouteEvaluationDisplay()` projects it into the modal's grouped
`RouteEvaluationDisplay` (Checked for review / Not applicable / Insufficient data).

Flags: `JITOSOL_READ_ONLY_ROUTE_EVALUATION_EXISTS = true`,
`..._ENABLED = true`, `..._USES_READ_ONLY_QUOTES = true`,
`..._ENABLES_TRANSACTIONS = false`, `..._REQUIRES_WALLET_SIGNATURE = false`,
`..._PREFILLS_ROUTE = false`.

## Modal behavior

The shared `SuggestionReviewModal` renders `details.routeEvaluation` as a dedicated
**"Route and execution checks"** section (source label + grouped chips + a read-only
explanation: *"These checks are informational only. WealthSmith does not create
transactions or move funds."*). When a route evaluation is present, the execution
guardrails are removed from the generic **"Not evaluated yet"** group — so the JitoSOL
recommendation no longer shows *"these need market data WealthSmith doesn't have yet"*
for route cost / liquidity / slippage. Other suggestions are unchanged.

The raw engine guardrails (`cost_available` / `liquidity_available` /
`slippage_available`) intentionally stay `not_evaluated` (we have not evaluated them for
**execution**); the route section is a separate, read-only review lens and never claims
execution readiness.

## Where it appears

- **Real wallet:** the JitoSOL recommendation shows the route section when the beta
  selector selected JitoSOL. Review-only, no transaction button, no wallet prompt, no
  signature, no external route opening. No Demo/Testing label.
- **Demo Mode** (SOL Staking Demo): same section, `DEMO_PREVIEW_NOT_LIVE` label.
- **`/testing`** (Staking fixture): same section, `TESTING_PREVIEW_NOT_LIVE` label.

## Future work

- Wire a **live read-only Jupiter quote** for the swap-route path (`getReadOnlyJupiterQuote`,
  currently disabled) to populate route cost / slippage from real data.
- **Stale quote handling** (`status: "stale"`) with a route source timestamp.
- **Amount-based price impact** for larger inputs.
- A visible **route source timestamp** (`checkedAt`) in the modal.
