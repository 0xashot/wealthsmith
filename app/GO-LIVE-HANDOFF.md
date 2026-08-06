# WealthSmith — Go-Live / Backend Handoff

Audience: the full-stack engineer taking this prototype to production. Everything
below is grounded in the current repo state — file paths are real, and every
"exists today" claim is verifiable in the tree.

## 1. What the product is (one paragraph)

A **read-only, non-custodial** Solana portfolio advisor. It connects a wallet via
wallet-adapter, reads balances/positions/prices over RPC and public feeds, and
renders suggestions (Safety Buffer, Rebalance, Trim, staking/yield reviews,
contribution plans). It **never** constructs, simulates, or signs a transaction —
external actions are handoffs to the venue's own page (Kamino, Moonpay, a DEX).
That stance is enforced by fixture guards and must survive go-live unchanged.

## 2. Architecture today (what exists, where)

| Piece | Location | Runs where today |
| --- | --- | --- |
| Frontend (Vite + React + TS) | `src/` | Browser; `npm run build` → static bundle |
| Wallet reads (RPC) | `src/wallet/useWalletPortfolio.ts` (fetch) + `src/wallet/portfolioPositionDerivation.ts` (pure derivation) | Browser, direct to RPC |
| Suggestion engine | `src/suggestions/` — pure, no I/O (`deriveRailSuggestions` is callable headless) | Browser |
| Swap-quote comparison service | `src/server/swapQuote/` (orchestrator, Jupiter/Orca/Raydium clients, rate limit, cache, sanitizer, health) + `scripts/build-swap-server.mjs` + `nodeServerEntry.ts` | **Built but not deployed** — a complete Node HTTP service |
| Market-conditions cache | `scripts/refresh-market-conditions.mjs` → `public/generated/market-conditions-cache.json`; scheduled GH Action exists (`.github/workflows/refresh-market-conditions.yml`) | Action is inert until the repo secret is set (§3.3); manual until then |
| Stable-yield market cache | `scripts/refresh-stable-yield-market-data.mjs` + publish script → `public/generated/stable-yield-market-cache.json` | Manual |
| SOL-staking market cache | `scripts/refresh-sol-staking-market-data.mjs` + publish script → `public/generated/sol-staking-market-cache.json` | Manual |
| Goal / onboarding persistence | `src/state/goalState.ts`, `src/state/onboardingState.ts` | Browser localStorage |
| Secrets | `app/.env` (gitignored): `COINMARKETCAP_API_KEY` — **server/offline only, never `VITE_`-prefixed** | Local only |
| Tests | `npm test` → 8,156 deterministic fixture checks (`scripts/run-fixtures.mjs`); `npm run deadcode` (knip) | CI-ready, not yet in CI |

Key property to preserve: **the engine is pure and the caches are inputs.** The
frontend never fetches market data itself; it reads the published JSON caches.
Anything with an API key runs offline/server-side.

## 3. Go-live workstreams

### 3.1 Static frontend hosting (small)
- `npm run build` produces a static bundle; host on any static platform
  (Vercel/Netlify/CloudFront). No SSR requirement.
- Build-time flags: `VITE_ENABLE_TESTING_PAGE` and
  `VITE_INTERNAL_SOL_LST_PREVIEW` must be **unset** in production — the /testing
  gallery and internal previews are gated on them and fail closed
  (`src/pages/internalTestingRoute.ts`).

### 3.2 RPC provider (small, required)
- `VITE_SOLANA_RPC_URL` (see `src/wallet/SolanaWalletProvider.tsx`) must point at
  a dedicated CORS-enabled endpoint (Helius/Triton/QuickNode). The keyless public
  fallback does not reliably serve `getParsedTokenAccountsByOwner` from browsers.
- The RPC URL is public by nature (it ships in the bundle); use a provider that
  supports per-origin restrictions + rate limits rather than trying to hide it.

### 3.3 Scheduled market-cache refresh (small — the job already exists)
The market-conditions job is **already built**:
`.github/workflows/refresh-market-conditions.yml` runs twice daily (06:00/18:00
UTC), refreshes + validates the cache, and commits only when the market *reading*
changed. It is currently inert for one reason: **the repository secret is not
set**. One-time admin step:
> GitHub → Settings → Secrets and variables → Actions → New repository secret →
> `COINMARKETCAP_API_KEY` (never `VITE_`-prefixed).

Remaining work on this workstream:
- Confirm the deploy pipeline picks up the workflow's cache commits (if hosting
  builds on push to main, this is automatic).
- Add the same treatment for the stable-yield and sol-staking refresh scripts on
  their documented cadences (see each script's header) — same pattern, same
  secret handling.
- Add failure alerting (the workflow failing silently recreates today's problem:
  cache expiry is fail-closed and invisible in the app by design).

### 3.4 Swap-quote service deployment (medium)
- `src/server/swapQuote/` is a finished Node service: provider orchestration with
  timeouts (`providerConfig.ts` policy), response sanitization (strips any
  transaction/credential fields — `responseSanitizer.ts`), rate limiting, TTL
  cache, `serviceHealth.ts`. Build with `scripts/build-swap-server.mjs`; smoke
  with `scripts/swap-quote-smoke.mjs`.
- Deploy as a single small Node process (Fly/Railway/ECS). Point the frontend at
  it (the quote layer's base URL), same-origin proxy or CORS-allowlisted.
- It holds no keys today (public quote APIs); keep it that way if possible.

### 3.5 Goal/profile persistence (decision needed)
Today `SavedGoal` + onboarding state live in localStorage — fine for a
single-device MVP, lost on device change, no auth needed.
- **Option A (ship as-is):** keep localStorage; zero backend. Honest MVP.
- **Option B (accounts):** wallet-signature auth (sign-in-with-Solana) + a tiny
  API (goal CRUD only) + Postgres/Firestore. Keep the payload the existing
  `SavedGoal` shape (`src/types/goal.ts`) so the frontend contract is unchanged.
- Recommendation: A for launch, B when multi-device sync is asked for. Nothing in
  the engine depends on where the goal is stored.

### 3.6 CI (done — `.github/workflows/ci.yml`)
- Every push/PR runs `npx tsc --noEmit` + `npm test` (8,156 deterministic,
  offline checks) + `npm run build` + `npm run deadcode`. No network, no secrets.
- The fixture suite's structure and conventions are documented in
  `src/suggestions/fixtures/README.md`; the env contract in `.env.example`.

## 4. Security / product invariants (do not regress)

1. Read-only, non-custodial: no transaction construction/signing anywhere,
   including the swap-quote server (sanitizer enforces; fixtures pin it).
2. No invented numbers: unavailable data renders "—"/fail-closed states, never a
   fabricated value.
3. Secrets never reach the browser: no `VITE_` prefix on anything sensitive.
4. Manually added assets (BTC/ETH) stay display-only — out of the engine, buffer,
   and completeness.
5. Suggestion engine changes require explicit product approval; the fixture suite
   is the contract.

## 5. Suggested order of execution

1. Set the `COINMARKETCAP_API_KEY` repository secret (§3.3 — five minutes, ends
   the silent cache-expiry problem).
2. RPC provider + static hosting (a day; the app is live read-only; CI already
   guards every push).
3. Stable-yield/sol-staking refresh workflows + failure alerting.
4. Swap-quote service deployment (unlocks live route comparison in modals).
5. Goal persistence decision (only if multi-device is a launch requirement).

## 6. Known intentional deferrals

- BTC/ETH as Rebalance destinations: deliberately out (registry is USDC/SOL
  only); two scoped paths exist if the product decides to expand.
- Remaining readSrc→behavioral fixture migrations (component-source pins would
  need React rendering in the suite — a deliberate design decision, not debt).
  The fixtures monolith itself is fully dissolved (18 domain files + shared
  harness + a 250-line aggregator — see `src/suggestions/fixtures/README.md`).
