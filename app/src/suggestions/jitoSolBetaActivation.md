# JitoSOL Exact SOL Staking — Read-Only Beta Activation (Step 13G)

**Enables the exact SOL staking recommendation for JitoSOL in REAL wallet mode, behind
a read-only beta flag.** When the flag is on and the wallet holds idle SOL above the
minimum, the live "Put Idle SOL to Work" suggestion surfaces **Jito · JitoSOL** as the
"Suggested protocol to review", with verified market data in Review Details. Backed by
`jitoSolBetaActivation.ts` and wired into `stakingSuggestion.ts` via
`selectJitoSolReadOnlyBeta()` (in `protocolSolLiquidStakingSelector.ts`).

Product decision (recorded): the founder verified and approved the JitoSOL source data,
risk scoring, and the required gates for enabling this **read-only** real-wallet
recommendation.

## This is READ-ONLY — it is not execution

- This is a read-only protocol **recommendation to review**.
- It is **not** staking execution, **not** a transaction feature, **not** a deposit
  feature, **not** wallet signing.
- The card CTA stays review-only: `executes_transaction`,
  `requires_wallet_signature`, and `completion_on_click` are all false.
- No `sendTransaction` / `signTransaction` / `signAllTransactions` / `signMessage`.
- No swap / deposit / stake / unstake / withdraw flow, and WealthSmith does not move
  funds for you.
- Clicking the suggestion does not open an external protocol page automatically and
  does not complete anything.

## Flags (`jitoSolBetaActivation.ts`)

| Flag | Value | Meaning |
| --- | --- | --- |
| `JITOSOL_BETA_READ_ONLY_RECOMMENDATION_ENABLED` | `true` | Read-only recommendation is ON |
| `JITOSOL_BETA_TRANSACTIONS_ENABLED` | `false` | Never build/submit a transaction |
| `JITOSOL_BETA_WALLET_SIGNATURES_ENABLED` | `false` | Never request a signature |
| `JITOSOL_BETA_AUTO_EXECUTION_ENABLED` | `false` | Never auto-execute |
| `JITOSOL_BETA_EXTERNAL_NAVIGATION_ENABLED` | `false` | Never auto-open external pages |

Rollback: set `JITOSOL_BETA_READ_ONLY_RECOMMENDATION_ENABLED = false`. Real-wallet
staking then returns to `protocolSelection.status = not_evaluated` with no
`selectedProtocolId` / `selectedProtocolName` / `selectedLstSymbol`.
`selectJitoSolReadOnlyBeta(input, { betaEnabled: false })` returns `disabled` and names
no protocol.

## What the beta selects

`selectJitoSolReadOnlyBeta(input)` returns `selected` **only** when the beta is enabled
and the input is SOL above `MIN_SELECTOR_STAKE_SOL` (0.1). It rejects non-SOL assets
(e.g. USDC) and at/below-minimum amounts. On selection it names:

- `selectedProtocolId = "jito"`, `selectedProtocolName = "Jito"`,
  `selectedLstSymbol = "JitoSOL"`, with a candidate carrying the approved
  `riskScore` (7.75) and the verified market data below.

`stakingSuggestion.ts` then sets `protocolSelection` via `selectedProtocolSelection(...)`
(the only path that may set a selected protocol), attaches a production
`protocolSelectionDisplay`, and swaps in read-only safety-note copy. The generic
selector `selectSolLiquidStakingProtocol` stays hard-disabled
(`PROTOCOL_SOL_LST_SELECTOR_ENABLED = false`); this beta is a separate, approved path.

## Verified JitoSOL market data (source-approved)

Shown in the shared Review Details modal via `protocolSelectionDisplay.marketData`
(source status **"Verified source data"**, mode **`production`**):

| Field | Value |
| --- | --- |
| TVL | $767.95M |
| Current APY | 5.36% |
| 30-day APY | 5.45% |
| Direct unstake | ~48 hours |
| Direct unstake fee | 0.1% |
| Annual management fee | 4% on rewards |

`productionStatus.realWalletSelectionEnabled = true` (read-only selection), while
`productionStatus.transactionsEnabled = false`.

## Same shared UI as Demo Mode

Real wallet mode is the source of truth. It renders through the same
`RealWalletSuggestionsRail` → `SuggestionCard` → `SuggestionReviewModal` path as the
[Demo Mode exact SOL staking scenario](demoExactSolStakingScenario.md). The card shows
**Jito · JitoSOL** with mode `production` and **no** `DEMO_PREVIEW_NOT_LIVE` /
`INTERNAL_PREVIEW_NOT_LIVE` label; the modal shows the verified market data. Only the
verified-data source label differs from Demo Mode ("Verified source data" vs. "Verified
source data · Demo preview").

## Boundaries that stay put

- Execution guardrails (route cost, liquidity depth, slippage) remain
  **not evaluated** — there is no quote/route data, so they are never "passed".
- Global flags stay at safe defaults: `PROTOCOL_SELECTION_IMPLEMENTED = false`,
  `PROTOCOL_SELECTION_SHOW_IN_UI = false`,
  `PROTOCOL_SELECTION_ALLOW_TRANSACTIONS = false`,
  `getProtocolSelectionGoNoGo().productionReady = false`,
  `PROTOCOL_SOL_LST_SELECTOR_ENABLED = false`.
- Only SOL staking is affected. Stable-yield selection stays `not_evaluated`.
- No forbidden investment claims (best / safest / optimal / guaranteed / risk-free /
  recommended / "you should" / "highest APY").

## Go / no-go

`getJitoSolReadOnlyBetaGoNoGo()` → `{ readOnlyBetaReady: true, productionReady: false,
transactionsReady: false }`. This beta is read-only-ready; **full public production and
transactions are not.** Full production still requires the complete production go/no-go
(`getProtocolSelectionGoNoGo().productionReady`), which stays false.

## Fixtures

`runJitoSolBetaActivationFixtureChecks()` (13G-A…AJ) covers the flags, the selector
selection/rejection, the live staking suggestion becoming `selected` with the
production display + market data, the read-only boundary, Demo Mode being unchanged, the
no-DEMO/no-INTERNAL-label guarantee, the rollback path, and the absence of forbidden
claims. Earlier steps' fixtures that asserted the pre-beta `not_evaluated` invariant for
real-wallet staking were updated to the approved `selected` behavior (non-staking
categories still name no protocol).
