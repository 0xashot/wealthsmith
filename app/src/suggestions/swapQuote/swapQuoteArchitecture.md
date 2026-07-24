# Step 23A — Canonical Live Swap-Quote Comparison Architecture

Read-only, non-custodial. This slice adds an **execution-assistance layer** that answers only **WHERE** an
already-decided exact swap currently appears cheapest to complete. It never decides **WHAT / WHICH / HOW-MUCH**
(the Suggestion Engine owns those), and it constructs / simulates / signs / submits **nothing**.

Step 23A ships **architecture, contracts, policies, fixtures, and documentation only**. No live provider call is
made, no card changes, no transaction behavior is introduced.

## Scope decision (engineering truth update)

- **Before:** no live routing or quote comparison.
- **After:** read-only live quote comparison is *allowed* — quote requests only. Still prohibited: transaction
  construction, transaction simulation, signatures, execution, and any external execution CTA.

Protocol Decision Logic remains authoritative for: the provider set (Jupiter, Raydium, Orca), lowest-total-cost
selection, the cost limits, the price-impact limit, and the liquidity limit.

## The boundary

```
Suggestion Engine            Swap Quote Comparison             Smith AI / Frontend
──────────────────           ──────────────────────           ─────────────────────
exists? source? dest?   ──▶  receives an EXACT swap action     explains the structured
amount? Safety Buffer?       compares current routes           result later; never selects
ordering? Top Pick?          (does not change any of the        a route or computes cost.
                             left column)                       Frontend renders; never calls
                                                                 provider APIs; never infers a winner.
```

The quote layer receives an **immutable** `SwapActionContext` carrying the original `suggestionId`. It cannot
change amount, source, destination, eligibility, score, ordering, conflicts, or Top Pick — enforced by the
`Readonly` action contract and by architecture-guard fixtures (`SWQ-A*`).

## Contracts (`swapQuoteContracts.ts`)

- `SwapActionContext` — exact-in, one per **leg**; raw amounts are integer-safe strings; immutable; preserves the
  suggestion id. Multi-source actions fan out into multiple legs.
- `SwapQuoteCandidate` — normalized provider output. `executionSurface` (Jupiter/Raydium/Orca) is separate from
  `underlyingVenues` (the DEX pools beneath). A provider's raw payload never reaches this shape.
- `SwapQuoteComparisonAssessment` — one leg's outcome: status, selected route, ranked candidates with exclusion
  reasons, compared/unavailable providers, cost, expiry, methodology version.
- `SwapPlanQuoteSummary` — multi-leg roll-up (multi-source Rebalance).

## Total-cost methodology (`swapCostMethodology.ts`)

Ranking value (higher is better), full precision:

```
netOutputUsd = expectedOutputUsd − nonIncludedNetworkFeeUsd − nonIncludedRentFeeUsd − otherNonIncludedUsd
estimatedTotalCostUsd = inputAmountUsd − netOutputUsd
estimatedTotalCostPct = estimatedTotalCostUsd / inputAmountUsd × 100
```

- **Slippage tolerance is NOT a cost** — it is the max acceptable movement before the minimum-out protection
  triggers. It never enters the formula.
- **No fee double-counting** — a provider's `expectedOutput` already reflects pool + platform fees + route price
  impact; those `included` fees are disclosed but never re-subtracted. Only non-included (network, rent, other
  out-of-band) costs are subtracted once.
- **Minimum output is never used as expected output.**
- USD-free fallback: when USD is unavailable, ranking may use the largest `expectedOutputRaw` **only when every
  candidate shares the exact same output mint + decimals**; cost % becomes unavailable and cost-threshold
  validation is `unresolved` (never invented).
- Same USD snapshot, same input amount, same slippage, one comparison window for all candidates.

## Network-fee methodology

No transaction is built or simulated, so no per-route fee is derived from unsigned instructions / compute units.
A single **conservative, disclosed** Solana network-fee estimate (`SWAP_NETWORK_FEE_POLICY`) is applied
consistently to every candidate unless every provider exposes a directly comparable quote-level estimate. Fees are
marked estimated; tiny unverifiable fee differences never decide the winner (net-output dominates).

## Provider normalization (`swapQuoteNormalization.ts`)

Pure adapters over already-fetched, quote-only responses. Each rejects any transaction/instructions/signature
field (`swapQuoteSecurityGuard.ts`) and drops the raw payload.

- **Jupiter** (Swap V2 meta-aggregator, quote-only): no taker → `transaction` stays null; use `outAmount`,
  `swapUsdValue`/price snapshot, `priceImpactPct`, `platformFee`, route plan. Execution surface = Jupiter;
  underlying venues come from `routePlan[].swapInfo.label` (e.g. Raydium CLMM + Orca Whirlpool). Jupiter is **not**
  a direct liquidity venue.
- **Raydium**: `outputAmount`, `otherAmountThreshold`, `priceImpactPct`, `feeAmount`/`feeMint`, `routePlan` pool
  ids, expiry. Raydium is its own execution surface (Raydium-native routing).
- **Orca**: Whirlpools quote tooling — `estimatedAmountOut`, `minAmountOut`, `estimatedFeeAmount`, whirlpool id,
  direction, price impact where derivable. No route → `no_route` (a normal exclusion, not a system failure).

## Liquidity (`swapLiquidity.ts`)

Per **route leg**, ≥ **$100,000** fresh pool liquidity (every split leg). Not total protocol TVL; not inferred
from trade size; stale/unresolved → not eligible (fail closed). RFQ legs have no pool TVL and are **excluded**
until an explicit RFQ-liquidity policy is approved (`SWAP_RFQ_POLICY`).

## Pair classification (`swapPairRegistry.ts`)

Versioned, identity-based (exact mint pair), direction-agnostic. **Major:** SOL/USDC only. **Minor:** other
approved pairs (none enabled yet). Unknown → `unresolved` → `pair_classification_unresolved` (no valid route).
Never inferred from live market cap.

## Thresholds (`swapQuotePolicy.ts`, versioned)

| Limit | Value | Boundary |
|---|---|---|
| Major total cost | ≤ 0.30% | inclusive |
| Minor total cost | ≤ 0.50% | inclusive |
| Price impact | < 0.50% | exclusive (exactly 0.50% rejected) |
| Route-leg liquidity | ≥ $100,000 | inclusive |

## Eligibility (`swapQuoteEligibility.ts`)

Eligible only when: approved provider; exact pair match; exact input-amount match; fresh + not expired; expected
output positive; price impact available and < 0.50%; liquidity verified and ≥ $100k; total-cost % available and
within the pair threshold; no blocked intermediate / underlying venue; no unapproved RFQ; normalization
succeeded. Exclusion reasons are a closed, greppable union.

## Ranking (`swapQuoteRanking.ts`)

Normalized economics are always the **primary** selection method. Eligible only. Primary: highest `netOutputUsd`.
Tie-breaks, in order: lower total-cost % → lower price impact → higher minimum output → fresher quote → lower
latency → **deterministic provider tie-break Jupiter → Raydium → Orca**. The provider tie-break is consulted
**only** when every preceding value is equivalent under `economicallyEquivalentEpsilon` (0.05%); a meaningfully
better economic route from any provider always wins first, and Jupiter is never chosen merely for its priority.
When the provider tie-break decides, `economicallyEquivalent = true` is recorded and the basis is
`economically_equivalent_tiebreak`. The approved order lives in `SWAP_PROVIDER_PRIORITY` (versioned).

## Comparison statuses (`swapQuoteComparison.ts`)

- `selected` — ≥ 2 eligible providers compared.
- `only_route_available` — exactly one eligible provider (others returned quotes but were ineligible); **not**
  called the cheapest.
- `partial_comparison` — a winner exists but ≥ 1 provider call failed / timed out / had no route (copy discloses
  it).
- `no_valid_route` — nothing satisfies the constraints (or pair unresolved).
- `not_ready_for_quote` — exact source/destination/amount unavailable.
- `not_required` — no conversion needed.

Multi-leg Rebalance: each leg compared independently (no forced single "best platform"); the plan expires at the
**earliest selected leg** expiry; unresolved legs are counted, never silently omitted. Multi-leg UI says
"Suggested routes", not "Suggested platform".

## Suggestion lifecycle

Quotes are ephemeral; the deterministic suggestion persists independently. Provider outage, stale quote, high
cost, or no-valid-route never delete the suggestion or change Top Pick — Review just states that no route
currently meets WealthSmith's limits. The request key is action identity + exact pair/amount; an older async
response can never overwrite a newer request.

## Operational policy (`swapQuotePolicy.ts`, proposed + versioned)

| Setting | Value |
|---|---|
| Provider timeout | 2500 ms |
| Comparison timeout | 3000 ms |
| Freshness window (no provider expiry) | 20000 ms |
| Cache duration | 15000 ms |
| Retries per provider | 1 |
| Economic-equivalence epsilon | 0.05% |

Requests (when a later slice mounts them) run concurrently over one snapshot, server-side only. No client-side
provider call; no infinite retries; cancellation on pair/amount change.

## Privacy & security

Provider calls are server-side. Never exposed: API keys, provider headers, RPC credentials, raw provider
responses, or any wallet financial profile (income / expenses / risk tolerance / target factors). The quote
service receives only exact mints, exact amount, slippage, and (only if strictly required for a read-only account
check) a public wallet address — preferably none. Jupiter requests omit the taker so no transaction is returned.
`swapQuoteSecurityGuard.ts` rejects any payload carrying transaction / instructions / serializedTransaction /
swapTransaction / signedTransaction / signatureRequest.

## UI contract (future — not implemented in 23A)

Single leg: "Suggested route — Jupiter, lowest estimated total cost · $3.24 · 0.27% · est. output 998.31 USDC ·
compared Jupiter, Raydium, Orca · quote updated 12s ago", plus the disclosure that final output may change before
execution and **no transaction has been prepared**. Partial / only-route / no-route copy as specified. The
existing suggestion CTA stays **Review**. Forbidden words: Swap, Execute, Open and swap, Confirm, Sign, Connect to
execute, prepared transaction, guaranteed savings, guaranteed output.

## Current quote-readiness (from the audit)

- **Rebalance** — BOTH canonical directions can produce a valid, immutable, quote-ready `SwapActionContext` when
  their source identity is exact and transferable:
  - `stables_to_crypto`: exact source = verified excess direct-wallet **USDC** (exact mint, classic program) →
    **SOL** (the approved **Wrapped SOL** mint for the request). Amount is currently **USD**
    (`verifiedExcessValueUsd`) → exact raw base units via `usdToRaw` (integer-safe floor, shared price snapshot);
    `not_ready_for_quote` when the source isn't `selected` or the price is stale.
  - `crypto_to_stables`: exact source = direct-wallet **native SOL** using the assessment's
    `technicallyAvailableLamports` (already net of the Rebalance-owned 0.1 SOL reserve) → **USDC**. Native SOL is
    mapped to the **Wrapped SOL** mint at the quote boundary. The adapter never recomputes the reserve and never
    quotes more than the canonical source capacity.

  **"Non-mounted" clarified:** it means only that the *quote layer itself* is not yet wired into the rail/cards
  (Step 23B) and that the production `crypto_to_stables` **card** is not currently emitted — it does **not** mean
  the Rebalance direction is unsupported. Both directions are supported by the boundary adapter today and are
  proven quote-ready by fixtures `SWQ-RB1..RB9`.
- **Trim** — **Quote-ready per transferable, eligible, non-core holding**: exact mint, decimals, and **exact raw
  balance** already present; destination USDC. Multiple holdings → multiple independent legs.
- **DCA** — Quote-ready **only** for staged **excess wallet USDC → target** (on-chain source exists). Future
  recurring / stable contributions have no on-chain source → `not_ready_for_quote` (never assume USDC). USDC → USDC
  → `not_required`.

### Missing exact-action fields (gap)

Rebalance (USDC source) and DCA express the amount in **USD**, not raw base units, and do not carry token
`decimals` on the source/destination objects (Trim already carries decimals + exact raw balance). The Step 23A
adapters close this deterministically: raw is derived via `usdToRaw(amountUsd, freshUnitPrice, registryDecimals)`
(integer-safe), and native SOL destination is mapped to the **Wrapped SOL** mint for the request. When the price
is stale/absent, the leg is `not_ready_for_quote` rather than guessed.

---

# Step 23B — Live Server-Side Quote Collection (server tree, unmounted)

Step 23B adds **live read-only quote collection** for Jupiter / Raydium / Orca behind a **request-time server**.
It stays read-only: quote requests only — no transaction construction, simulation, signature, execution, or
external CTA. The service is **unmounted** from cards/Review modals until Step 23C. The **mocked fixture suite is
authoritative** (`SWS-*`, `SWG-*`); the live smoke is developer-only.

## Server runtime + location

The app is a **static Vite SPA with no request-time server**; the approved runtime choice for 23B was to **add a
request-time server**. Server-only code lives under **`src/server/swapQuote/`** (tsc-checked, kept out of the
browser bundle — no client file imports it; guard `SWG-1`). The runnable entries are `.mjs` under `scripts/`
(`swap:serve`, `swap:smoke`) that esbuild-bundle the TS at startup.

- **Entry point:** `collectSwapQuoteSnapshot(action, options)` (alias `compareLiveSwapQuotes`) + multi-leg
  `collectSwapPlanSnapshot`. HTTP: `createSwapQuoteHandler` → `POST /api/swap-quote` (via `scripts/swap-quote-serve.mjs`).

## Provider clients (server-only, versioned)

- **Jupiter** (`jupiterQuoteClient.ts`, `jupiter_quote_adapter_1.0.0`): Swap V2 quote-only, **no taker** → no
  transaction; RFQ routes detected and excluded; execution surface = Jupiter, underlying venues from routePlan.
- **Raydium** (`raydiumQuoteClient.ts`, `raydium_quote_adapter_1.0.0`): `compute/swap-base-in` quote-only; no tx
  construction; Raydium execution surface; pool ids from routePlan.
- **Orca** (`orcaQuoteClient.ts`, `orca_quote_adapter_1.0.0`): read-only Whirlpools via an approved server RPC +
  injected `WhirlpoolQuoteComputer` over an approved pool registry (`orcaWhirlpoolRegistry.ts`); no instructions,
  no signer, no submit. No route / no RPC → `no_route` / `unavailable` (never a global failure).

Endpoints + adapter versions live in `providerConfig.ts` (not scattered). Secrets are server-only env vars (plain
names, never `VITE_`-prefixed — `detectLeakedSwapEnv` refuses to run under a leaked `VITE_` swap secret). A missing
secret marks **that** provider unavailable (`configured:false`) — never a crash, never a client-side fallback.

## Orchestration

Concurrent over one snapshot: shared USD price snapshot (`priceSnapshot.ts`, mint-keyed, one per comparison) →
same pair/amount/slippage/window to all three → per-provider `AbortController` + `providerTimeoutMs` (2500) + one
overall controller + `comparisonTimeoutMs` (3000) + bounded retry (1) → fresh per-leg liquidity
(`liquidityResolver.ts`, ≥ $100k, fail-closed) → 23A normalize → 23A eligibility + ranking (`compareSwapQuotes`) →
sanitize → cache. Provider failures are isolated. Reuses Step-23A policy constants (no duplication; guard `SWG-6`).

- **Price unavailable:** cost `unresolved` → candidates needing cost-threshold validation **fail closed**
  (`total_cost_unresolved`); raw-output ranking never bypasses cost validation (`SWS-17`). No USD is invented.

## Caching, concurrency, sanitization

- **Cache** (`swapQuoteCache.ts`): keyed by pair + amount + slippage + every policy/adapter/snapshot version;
  **no profile data**. Stores only the sanitized assessment. TTL 15 s. Effective expiry = earliest of TTL / quote
  / liquidity / price expiry; never served past it.
- **Stale-response protection:** each comparison is keyed by the immutable action + a `comparisonId` embedding
  `comparedAtMs`; an older async response can't overwrite a newer request.
- **Sanitizer** (`responseSanitizer.ts`): extends the 23A transaction-field scan with execution/credential terms
  (`execute`, `sendTransaction`, `recentBlockhash`, `signer`, `keypair`, `secretKey`, `apiKey`, `rpcUrl`, …) and
  **rejects** (throws) rather than strips. No raw provider payload, header, credential, or transaction ever
  leaves the server. Telemetry (`swapQuoteLogging.ts`) records only safe operational facts.

## HTTP boundary

`httpHandler.ts` validates a small safe request (approved category, mint format, integer positive raw amount,
approved slippage, approved pair, no arbitrary provider/RPC URL, no wallet-private field) and returns **only** a
sanitized `SwapQuoteComparisonAssessment` (or a safe error — never a stack trace).

## Live smoke

`npm run swap:smoke` — developer-only, read-only, USDC↔SOL small amounts, no taker/no transaction, sanitized
output. When network/credentials/price source are unavailable it prints **"NOT RUN"** and the mocked suite
remains authoritative; no live success is ever claimed.

## Provider-overlap disclosure (RFQ + underlying venues)

Jupiter may route through Raydium/Orca pools. Candidates are preserved as **execution-surface** alternatives with
their **underlying venues** disclosed; correlated-route suppression is not introduced in 23B (overlap is reported,
not collapsed). RFQ legs are excluded until an approved RFQ-liquidity policy.

---

# Step 23B.1 — Operationalized Live Service (approved sources, real smoke, deployment)

The request-time service is now **operational**, not merely interface-complete. A real mainnet read-only
comparison returns an eligible sanitized route.

## Deployment target + topology

- **Target:** a small **Node web service** (selected: **Render**; portable to Railway / Fly.io). `render.yaml`
  pins `buildCommand: npm run swap:build-server`, `startCommand: node dist-server/swap-quote-server.mjs`,
  `healthCheckPath: /health`.
- **Production entry:** `src/server/swapQuote/serverMain.ts` → pre-bundled by `swap:build-server` into
  `dist-server/swap-quote-server.mjs` (node:http; **no esbuild per request**).
- **Local dev:** `npm run swap:serve` (build once, then run). The Vite SPA reaches it through a **dev-only**
  proxy (`/api/swap-quote` → `localhost:8787`, in `vite.config.ts` `server.proxy`). The SPA stays static; no
  server-rendered framework. Production SPA will use `VITE_SWAP_QUOTE_API_BASE` (a public base URL, not a secret)
  in Step 23C.
- **Endpoints:** `POST /api/swap-quote` (sanitized assessment only), `GET /health` (ready/degraded/unavailable).

## Approved sources (pinned)

| Concern | Source | Version | Notes |
|---|---|---|---|
| Jupiter quote | `api.jup.ag/swap/v1/quote` | `jupiter_quote_adapter_1.1.0` | v6 host retired; quote-only, no taker |
| Raydium quote | `transaction-v1.raydium.io/compute/swap-base-in` | `raydium_quote_adapter_1.0.0` | compute-only |
| Orca quote | Whirlpools via server RPC | `orca_quote_adapter_1.0.0` | needs `SOLANA_RPC_URL`; else unavailable |
| Shared USD price | Jupiter Price v3 `api.jup.ag/price/v3` | `swap_price_snapshot_1.0.0` | mint-keyed; USDC **sourced**, not hard-coded $1 |
| Liquidity | Raydium `api-v3.raydium.io/pools/info/ids` (`tvl`) | `swap_liquidity_resolver_1.0.0` | see metric note |

**Liquidity metric:** `tvl` is the pool's **total** locked value — an approved **pool-depth approximation**, NOT
active-tick executable depth. Documented as such; a stricter active-liquidity methodology can replace it later
without changing the interface. Every route leg (split / multi-hop) must independently be ≥ $100k fresh; one
unresolved/below-minimum leg makes the candidate ineligible. Jupiter route legs whose underlying pool is not a
resolvable approved pool fail closed (`liquidity_unresolved`).

**Price/USDC:** one shared snapshot per comparison, same input+output prices for every candidate; USDC is
freshness-checked like any asset (no blind $1). Prices unavailable/stale → cost `unresolved` → fail closed; no
route selected, no invented USD.

## Health, rate limits, CORS, logging

- **Health** (`serviceHealth.ts`): `ready` (price+liquidity+all providers), `degraded` (price+liquidity+≥1
  provider — valid partial possible), `unavailable` (required evidence missing / VITE_ secret leak). Payload has
  only booleans + safe reason codes — no secret/URL/header.
- **Rate limiting** (`rateLimit.ts`, versioned): max body 4096 B, per-caller burst 8 + 30/min, global concurrency
  16, provider concurrency 8; safe `429` with `retry-after`.
- **CORS:** echoes the Origin only when it equals the single approved `SWAP_ALLOWED_ORIGIN`; otherwise denied.
- **Logging** (`swapQuoteLogging.ts`): comparison id, safe action-key hash, provider id/status/latency, exclusion
  codes, selected provider, policy version. Never raw payload / key / RPC URL / profile / transaction.

## Runbook

1. Set server-only env (never `VITE_`): optionally `SOLANA_RPC_URL` (enables Orca), `SWAP_ALLOWED_ORIGIN`, `PORT`.
2. `npm run swap:build-server` → `dist-server/swap-quote-server.mjs`; start with `node dist-server/swap-quote-server.mjs`.
3. `GET /health` should report `ready` (all providers) or `degraded` (no Orca RPC).
4. `npm run swap:smoke` for a developer-only read-only mainnet check (SOL↔USDC small amounts). Prints sanitized
   status; on no network → **NOT RUN** (no false success claim).
5. **Provider outage:** isolated per provider — a failed/timed-out provider is `unavailable`; a winner among the
   rest yields `partial_comparison`; the underlying financial suggestion is never removed or reordered.

## Live smoke result (this environment)

`USDC→SOL (15 USDC)` → `partial_comparison`, **selected = Raydium**, cost **0.081%**, price impact **0%**,
liquidity **verified** (min-leg ~$331k), fresh, forbidden-field scan **CLEAN**. Orca unavailable (no RPC in this
env). SOL→USDC failed closed here (thin route / non-Raydium Jupiter venue) — acceptable; one eligible direction
proves operational readiness.

## No-transaction guarantee

Quote-only throughout: no taker, no transaction/instructions/serialized/signed payload, no simulation, no signer,
no submission. The extended sanitizer rejects (throws on) any such field before a response leaves the server. The
browser never receives a provider secret, raw payload, or provider request code.

---

# Step 23C — Read-only "Suggested route" mounted in the Review modal

The sanitized comparison is now shown inside the existing Review modal for **Rebalance / Trim / eligible funded
DCA** — supplemental execution information only. The card face is unchanged (CTA stays **Review**); nothing here
changes the financial suggestion, and no transaction is ever prepared.

## Raydium price-impact unit (hard gate, §1)

Verified empirically against live mainnet quotes: **Raydium `priceImpactPct` is percentage points** (0.93 = 0.93%);
**Jupiter is a decimal fraction** (0.0000816 = 0.00816%). The ambiguous `≤1 → ×100` heuristic is **removed**;
`swapQuoteNormalization.ts` now applies explicit per-provider conversions (`SWAP_NORMALIZATION_VERSION = 2.0.0`;
Raydium adapter → `1.1.0`). The exclusive `< 0.50%` threshold is unchanged; exactly 0.50% stays ineligible. After
the correction the live smoke returns eligible routes in **both** directions.

## Data flow

Suggestion Engine result → Review opens → immutable `SwapActionContext` derived → browser client
(`swapQuoteClient.ts`) POSTs to `/api/swap-quote` (dev proxy → local service; prod → `VITE_SWAP_QUOTE_API_BASE`)
→ sanitized `SwapQuoteComparisonAssessment` validated client-side (rejects malformed / transaction-bearing) →
`quotePresentation.ts` maps it to an honest view → components render. Quotes are requested only when the modal is
open; one request per leg; cancelled on close/action change; session-cached while fresh; a safe **Refresh**
re-requests only. No prefetch on dashboard load, no polling, no persistence.

## States + honesty rules

`selected` (≥2 eligible → "Lowest estimated total cost"), `partial_comparison` (discloses unverified platforms;
never "cheapest across all"), `only_route_available` ("Only eligible route found" — never "cheapest"),
`economically_equivalent` ("Similar estimated cost" + tie-break note), `no_valid_route`, `not_ready_for_quote`
(DCA funded-contribution copy), `not_required`, `unavailable`/`expired` (safe refresh). Execution surface
(provider) is shown separately from **underlying venues** ("Route uses Raydium CLMM"); overlapping venues are
disclosed. Liquidity is labelled a **pool-TVL proxy**, never executable depth. No "guaranteed" anywhere. No Swap
/ Execute / Confirm / Sign / Open-Platform CTA.

## Components (`src/components/swapQuote/`)

`SwapQuoteComparisonSection` (orchestrates via `useSwapQuoteComparison`), `SwapQuoteLoadingState`,
`SwapQuoteSelectedState`, `SwapQuoteAlternatives` (collapsed "Compared routes" with mapped exclusion copy),
`SwapQuoteUnavailableState`, `SwapPlanQuoteSummary` (multi-leg → "Suggested routes", per-leg, earliest expiry).
All reuse the design-system review-modal classes; server tree / provider clients / SDK / RPC are never imported.

## Deployment gate (§2)

Mount when `/health` is `ready`, or `degraded` **only** when price + liquidity work and ≥1 provider can produce
eligible comparisons and unavailable providers are disclosed (never implying all three compared). `unavailable`
fails closed in the UI. Requires `SOLANA_RPC_URL` (server-only, for Orca) + `SWAP_ALLOWED_ORIGIN` +
`VITE_SWAP_QUOTE_API_BASE` (public base, not a secret) configured for production.

## /testing gallery

`swapQuoteTestingFixtures.tsx` renders the **production** component across all required states with **deterministic
mocked sanitized** assessments (no live providers); the Rebalance/Trim modals also thread a preset so the in-modal
placement is demonstrated. No standalone "Swap Quotes" suggestion category is added.

---

# Step 23C.1 — Product hookup + responsive close-out

The real-wallet + Demo rails now derive and pass the exact `SwapActionReadiness` into Review, and the responsive
pass is complete. The route layer stays supplemental — it cannot change any financial suggestion.

- **Derivation** (`railSwapActions.ts`, `useRailSuggestions`): `deriveRailSwapActions` maps each Rebalance / Trim /
  eligible-DCA card to a readiness via the Step-23A adapters ONLY (no financial recalculation; USDC funding uses
  the coverage's $1 basis; native SOL uses the fresh price with the 0.1 SOL reserve already netted). Buffer /
  staking / stable-yield cards get no entry (no route section, no request). Exposed as `rail.swapActionById`.
- **Rail → modal**: `RealWalletSuggestionsRail` passes `swapAction` + `swapQuoteIsDca` + `swapQuoteFetcher` to
  BOTH the contribution (DCA) and details (Rebalance/Trim) modals. Real wallet leaves the fetcher undefined →
  live `/api/swap-quote` client. The section fetches only when the modal is open (no dashboard prefetch).
- **DCA readiness**: funded staged-excess USDC → ready (live comparison on open); future/unfunded → `not_ready`
  (no request, source never assumed USDC); USDC→USDC → `not_required` (no request).
- **Demo** (`demoSwapQuote.ts`): all Demo rails carry a DETERMINISTIC offline `swapQuoteFetcher` (Raydium
  selected, validated through the production client validator) — Demo never calls a provider or the service.
  Demo's current scenarios (Safety Buffer / SOL staking / Stable Yield) contain no swap-requiring suggestion, so
  no route section renders in Demo today; the deterministic Rebalance/Trim/DCA route states live in `/testing`.
- **Responsive**: verified at 375 / 390 / 430 / 768 / 1024 / 1280 px — no horizontal overflow (body scrollWidth ==
  clientWidth), 0 px section overflow, alternatives expand cleanly. `/testing` gallery uses production components
  with deterministic mocked sanitized data (no live calls).
