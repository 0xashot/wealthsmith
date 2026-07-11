# Protocol Data-Source Matrix (Step 12C)

**Selection is NOT implemented.** This matrix documents, per data source, what it
*can* and *cannot* provide toward a future protocol-selection engine, and whether
it is sufficient on its own. Nothing here is wired into selection, scoring, or the
UI. See `protocolSelectionAudit.md` (Step 12B) for the readiness conclusion and
`protocolRegistry.ts` for the static candidate list + adapter interface contracts.

**Marker:** `PROTOCOL_SELECTION_IMPLEMENTED === false` in `protocolRegistry.ts`.

---

## Matrix

| Source | Can provide | Cannot provide | Freshness | Reliability concerns | Enough for selection? |
| --- | --- | --- | --- | --- | --- |
| **DefiLlama** (`coins.llama.fi`, `yields.llama.fi`) | Protocol TVL, yield-pool APY (per endpoint), APY history | User eligibility, route/quote cost, exact withdrawal behavior, protocol-specific risk judgement | Minutes–hours (cached feed) | Pool coverage varies; pool→our-candidate mapping must be curated; occasional gaps | **No** — needs candidate registry + risk layer |
| **Kamino** (SDK + `api.kamino.finance`) | Vault APY (net of fees), TVL, the user's own position data | Broader/external risk scoring, cross-protocol comparison | Per read (SDK) | SDK is heavy (dynamic import); single-protocol only | **No** — one protocol; no comparison/risk |
| **Jupiter** (`lite-api.jup.ag`) | Token price; (future) swap **quote / route / slippage / price impact** via quote-api | Protocol yield, vault APY, staking risk | Seconds (price) | Quote-api NOT yet integrated (only price v3 today) | **No** — price only today; quote/route unbuilt |
| **Sanctum** (LST list CDN) | LST metadata/list; (future) LST metrics if endpoints accessible | Full risk scoring, route/cost model | Static list + on-chain | Multi-LST; needs adapter to resolve specific LST metrics | **No** — metadata only today |
| **On-chain stake pools** (`@solana/spl-stake-pool`) + Marinade API | Real staking **APY** for LSTs (exchange-rate growth); mSOL APY | TVL, liquidity depth, unstake timing, risk, fees (folded), candidate comparison | Per read / 30d (Marinade) | Requires per-pool reads; no cross-pool ranking | **Partial** — best APY source; still missing TVL/withdrawal/risk |
| **Manual WealthSmith risk registry** (does NOT exist yet) | Curated audit status, risk score, withdrawal class, Safety-Buffer eligibility | Live APY/TVL (needs adapters) | Manual review cadence | Must be maintained; subjectivity in scoring | **No alone** — pairs with adapters |
| **RPC / on-chain reads** (Helius `VITE_SOLANA_RPC_URL`) | User holdings, stake/token accounts, protocol **position detection** | Protocol-wide candidate scoring, TVL, risk, route | Live | Read-only by design (no signing) | **No** — detects held positions, not candidates |

---

## Per-strategy sufficiency (today)

- **SOL staking / liquid staking:** APY `available` (on-chain), candidate names `available` (registry), manage URLs `available`. Missing: **TVL/liquidity, withdrawal/unstake behavior, risk metadata, explicit fees, deterministic scoring.** → **Not selectable.**
- **Stable yield:** APY `partially_available` (held Kamino vaults only). Missing: **candidate-universe metrics, TVL, utilization, risk, withdrawal, fees.** → **Not selectable.**
- **LP / vault:** valuation only. Missing: **pool APY, IL exposure, TVL, risk, route, fees, liquidity.** → **Not selectable.**

---

## What still blocks selection

1. **Market-data adapter** producing `ProtocolMarketData` (APY, TVL, liquidity, withdrawal, fees) per candidate — interface defined in `protocolRegistry.ts`, unimplemented.
2. **Risk registry** producing `ProtocolRiskData` (risk score, audit status, buffer eligibility) — interface defined, no data yet.
3. **Quote/route guardrail data** (cost / liquidity / slippage) — no adapter; these stay `not_evaluated`.
4. **Deterministic scoring rule** — none exists; must be added and QA'd (mock + mainnet simulation) before any `selected` output.

Until (1)–(4) exist and pass QA, protocol selection stays `not_evaluated`. The
candidate registry is metadata only and is **not** a recommendation.

---

## Step 12D — read-only adapters now in the codebase

**12D adds data collection/normalization only. It does NOT implement protocol
selection.** These are a service layer — the Suggestion Engine never imports or
calls them, and running one never changes a suggestion. `confidence` +
`missingFields` record exactly what is known; nothing is invented.

| File | Provides | Missing / status | Confidence |
| --- | --- | --- | --- |
| `protocolMarketData.ts` | Normalized `ProtocolMarketData` / `ProtocolRiskData` / `ProtocolQuoteData` / `ProtocolSelectionInput` types + `missingMarketData()` (no fake zeros) | — (contracts + constructors) | n/a |
| `protocolRiskRegistry.ts` | Curated static notes, `auditStatus`/`withdrawalClass` = "unknown" | **No `riskScore`** (deferred to 12E), `safetyBufferEligible` absent | `partial` |
| `protocolDataAdapters.ts` | `ProtocolDataAdapter` contract + `buildProtocolSelectionInput` (sync, network-free merge) | Selects/scores nothing | n/a |
| `protocolDataAdapters.defillama.ts` | Read-only pool APY/TVL **only via VERIFIED exact mappings** | Mapping table is **empty** (none verified) → returns `missing`; no fuzzy matching | `missing` today |
| `protocolDataAdapters.kamino.ts` | Stub returning `partial` + reason | Existing Kamino APY/TVL is per-HELD-vault only; a vault-catalog + candidate-market adapter is still needed | `partial` |
| `protocolDataAdapters.jupiter.ts` | `getReadOnlyQuoteEstimate` **contract-only** | `quoteAvailable: false`; no route/slippage/cost; **never builds/sends a tx or requests a signature** | `missing` today |

**Known mapping limitations:** DefiLlama pool UUIDs are volatile and must be
verified per candidate before use — an empty mapping table is the honest state,
not a blocker. Kamino market data is position-scoped, not candidate-scoped.

**Why still not enough for selection:** no verified market data yet (empty
DefiLlama mappings, Kamino stub), no risk score (12E), no eligibility/route
guardrail data, and no scoring model. `PROTOCOL_SELECTION_IMPLEMENTED` stays
`false`.

---

## Eligibility data required before selection (Step 12E)

`evaluateProtocolEligibility` (see protocolRiskMethodology.md) gates a candidate
to "eligible to evaluate". Each input below must be **present and pass** — a
missing value yields `insufficient_data`, never `eligible`:

| Input | Source (future) | Gate |
| --- | --- | --- |
| TVL | DefiLlama `/pools` (verified mapping) | `≥ MIN_PROTOCOL_TVL_USD` ($1M) |
| APY | on-chain / DefiLlama / SDK | must be present |
| riskScore | **curated (12E methodology)** — absent today | `≥ MIN_PROTOCOL_RISK_SCORE` (7) |
| auditStatus | published audits (curated) | not `unknown` |
| withdrawal behavior | protocol docs (hours or class) | known; `≤ 24h` buffer / `≤ 168h` general |
| Safety-Buffer eligibility | curated | required `true` in buffer context |
| liquidity | DefiLlama / on-chain (route context) | `≥ MIN_LIQUIDITY_USD` ($100k) |
| route / quote | Jupiter quote (12F) | required when `requiresRoute` |
| fees | protocol / SDK | known for net-yield comparison |
| source freshness (`updatedAt`) | each adapter | recorded per record |
| `lastReviewedAt` (curated risk) | manual review cadence | recorded per entry |

Eligibility is separate from selection: even a fully `eligible` set of
candidates is NOT chosen among until 12F/12G/12H land.

---

## Step 12F — read-only route / cost / liquidity guardrails

**Step 12F adds data collection + guardrail evaluation only. It does NOT
implement protocol selection or execution.** New utilities: a read-only Jupiter
quote adapter (`getReadOnlyJupiterQuote`) and a route-guardrail evaluator
(`evaluateRouteGuardrails`). Neither is wired into the Suggestion Engine.

**Quote-only boundary — Jupiter adapter:**

- **No** swap, **no** swap/execution endpoint, **no** wallet/publicKey, **no**
  signature, **no** `sendTransaction`/`signTransaction`/`signAllTransactions`/
  `signMessage`, **no** transaction payload. It only issues a read-only GET quote.
- Live network is **disabled** behind `JUPITER_LIVE_QUOTE_IMPLEMENTED = false`;
  the adapter hits the network only when a test injects `fetchImpl`. Failures and
  network-unavailable resolve to `error`/`missing` results and never throw.
- `JUPITER_QUOTE_BUILDS_TRANSACTIONS = false`.

**What data MAY become available (from a real quote):**

- `quoteAvailable` (route exists), `priceImpactPct` (normalized to percent),
  `outAmountAtomic`, route source; possibly `estimatedNetworkFeeUsd` **only if a
  source provides it** (a bare quote does not).

**What remains missing:**

- true protocol **liquidity** depth, **risk**, **withdrawal behavior**, action
  **eligibility**, **transaction simulation**, and execution success/failure —
  none of which a quote provides. These stay `missing`/`not_evaluated`.

**Future guardrail mapping (documented, NOT wired):**
`cost_available` ← quote route + fee/network estimate · `liquidity_available` ←
`liquidityUsd` or reliable proxy · `slippage_available` ← `priceImpactPct`. Live
suggestion guardrails remain `not_evaluated`.

**Why this still does not enable selection:** a route quote answers "can this
move be routed and at what price impact?", not "which protocol is right". Even a
`passed` route guardrail is one input; selection still needs 12G deterministic
scoring and 12H narrow-case QA, with `PROTOCOL_SELECTION_IMPLEMENTED = false`.

---

## Scoring data requirements (Step 12G)

`protocolScoring.ts` ranks ONLY fully eligible candidates and never selects. Each
input below must be present from a real source; anything missing keeps the
candidate `insufficient_data` (never scored, never defaulted to 0):

| Requirement | Needed for | Notes |
| --- | --- | --- |
| eligibility result = `eligible` | scoring at all | runs before scoring |
| APY | yieldScore | capped at `MAX_APY_FOR_SCORE` |
| TVL | tvlScore | saturates toward `TARGET_TVL_FOR_FULL_SCORE_USD` |
| riskScore | riskScore | **curated (12E)** — absent today |
| withdrawal behavior | withdrawalScore | hours; buffer vs general thresholds |
| fees (when applicable) | costScore | missing fees never assumed zero |
| liquidity (route context) | liquidityScore | ≥ `MIN_LIQUIDITY_USD` |
| quote / price impact (route context) | costScore | ≤ `MAX_PRICE_IMPACT_PCT` |
| freshness (`updatedAt`) | trust | per record |
| source attribution (`dataSources`/`sources`) | audit | per record |

**Until these fields are populated from real sources, candidates remain
`insufficient_data`** — scoring produces no ranking today, and selection stays
disabled.

---

## 12H QA-only selection status

- **QA can select** a deterministic winner for SOL liquid staking **from complete
  FIXTURE/mainnet-simulated data** (`protocolSelectionQa.ts`, see
  `protocolSelectionQa.md`).
- **Production cannot select**: real adapters do not yet provide complete
  market/risk/route data. Current live data remains `insufficient_data`.
- **No user-facing recommendation is enabled.** Live suggestions keep
  `protocolSelection.status = not_evaluated`, and
  `PROTOCOL_SELECTION_IMPLEMENTED = false`. The QA result is `qaOnly` and never
  reaches cards/modals.

---

## Production-readiness gaps (Step 12I)

Before real selection can advance past `qa_only` (see
`protocolSelectionProductionReadiness.md`), these gaps must close:

- Real **DefiLlama pool mappings are empty** (no verified candidate→pool links).
- The **Kamino candidate-market adapter is stubbed** (per-held-vault only).
- The **Jupiter live quote is disabled** (`JUPITER_LIVE_QUOTE_IMPLEMENTED = false`).
- **`riskScore` is absent** (no approved 12E methodology yet).
- **Withdrawal behavior** is `unknown` for all candidates.
- **Fee data** is unknown / not itemized.
- **Liquidity data** is mostly absent.
- A **real-data dry-run** (Stage 2) is not implemented.
- The **feature flag is not enabled** (all flags default OFF).

Until these are closed and every readiness gate passes, current live data remains
`insufficient_data` and no user-facing recommendation is enabled.

---

## 12J — SOL liquid-staking data mapping status

The first narrow case now has verified mappings (`protocolSolLiquidStakingData.ts`,
`protocolSolLiquidStakingData.md`):

- **Mapped (exact mints for all 5 candidates):** JupSOL/mSOL/JitoSOL/bSOL/INF —
  copied from existing source, no fuzzy matching.
- **APY: mapped** to existing real helpers (on-chain SPL stake pool for
  JupSOL/bSOL/JitoSOL, Marinade API for mSOL, DefiLlama for INF). Values are
  fetched by a caller and injected — never fabricated in the mapping module.
- **TVL: mapped for sanctum only** via a verified DefiLlama pool UUID (now in
  `DEFILLAMA_POOL_MAPPINGS`); the other four remain `missing` (no verified pool
  UUID in the codebase — none guessed).
- **Still missing:** TVL for 4/5 candidates, `riskScore` (all), withdrawal
  behavior (all), fees (all).
- **Why this still does not enable UI recommendations:** the internal dry-run
  returns `insufficient_data` (no injected values, no TVL/risk/withdrawal), and
  `PROTOCOL_SELECTION_IMPLEMENTED` / `SHOW_IN_UI` stay false. The mapping module is
  not imported by any live/engine/UI file.
- **Next real-data blockers:** verified DefiLlama TVL pools for the remaining 4,
  a `riskScore` methodology + curated scores, and sourced withdrawal/fee data.

---

## 12K — SOL liquid-staking dry-run + risk sourcing status

`protocolSolLiquidStakingDryRun.ts` (dev-only) reports real-data coverage per
candidate; `protocolSolLiquidStakingRiskSources.md` tracks risk sourcing.

| Candidate | APY | TVL | riskScore | withdrawal | fees |
| --- | --- | --- | --- | --- | --- |
| jupiter | mappable (on-chain) | missing | not_assigned | missing | missing |
| marinade | mappable (Marinade API) | missing | not_assigned | missing | missing |
| jito | mappable (on-chain) | missing | not_assigned | missing | missing |
| blazestake | mappable (on-chain) | missing | not_assigned | missing | missing |
| sanctum | mappable (DefiLlama) | mappable (verified pool) | not_assigned | missing | missing |

Data remains **insufficient for production selection**: `riskScore` is
`not_assigned` for all, withdrawal/fees are missing, and TVL is verified for only
1/5. The dry-run returns `insufficient_data`. `PROTOCOL_SELECTION_IMPLEMENTED` /
`SHOW_IN_UI` / `ALLOW_TRANSACTIONS` stay false; `PROTOCOL_SELECTION_ALLOW_LIVE_DATA`
remains false globally (dry-run live mode is a per-call opt-in only).

---

## 12L — verified source completion

`protocolSolLiquidStakingSources.ts` centralizes source-backed status; the full
matrix is in `protocolSolLiquidStakingSourceChecklist.md`.

- **Newly verified:** mint + APY *sources* for all five (code-backed); TVL source
  for Sanctum/INF (verified DefiLlama pool).
- **Still missing:** verified DefiLlama TVL pools for JupSOL/mSOL/JitoSOL/bSOL
  (none guessed); withdrawal, fees, audit for all; **`riskScore` not assigned** for
  all; live APY *values* (fetched + injected, not fabricated).
- **Why production selection remains disabled:** a verified *source* is not a
  *value*, and eligibility still needs `riskScore` + TVL + withdrawal; the dry-run
  stays `insufficient_data` and all flags stay false.

---

## 12M — Stage-2 real-data dry-run report

`protocolSolLiquidStakingStage2DryRun.ts` injects the real values we can source
today and runs the full pipeline, reporting per-candidate data coverage. Current
coverage:

- **APY source coverage:** verified (code-backed) for all five; values injected.
- **TVL:** verified for Sanctum / INF only (the other four stay missing — none
  guessed).
- **Withdrawal:** missing for all five.
- **Fees:** missing for all five.
- **Audit:** unknown for all five.
- **RiskScore:** absent (`not_assigned`) for all five.

Result: `candidatesEligible = 0`, `insufficient_data` — correct and expected.
Complete injected data for one candidate can make it `eligible` in the report, but
`canSelectForProduction` stays `false`. **Production remains disabled:**
`PROTOCOL_SELECTION_IMPLEMENTED` / `SHOW_IN_UI` / `ALLOW_TRANSACTIONS` false, and
the module is not imported by any live/engine/UI file.
