# Engineering Handoff — Live Wallet Connection & Protocol Detection

**Scope:** Real Solana wallet connection + read-only live wallet asset discovery + multi-protocol position detection, as built in the `app/` prototype of the WealthSmith design-system repo.

**Audience:** Engineers porting this into the production app.

**Status:** Committed to `wealthsmith-design-system` (branch `main`, ahead of `origin/main`). All code under `app/`. Related design docs: [`patterns/wallet-connection.md`](../patterns/wallet-connection.md), [`rules/wallet-and-custody-rules.md`](../rules/wallet-and-custody-rules.md), [`docs/wallet-ledger-connection-handoff.md`](./wallet-ledger-connection-handoff.md), [`docs/kamino-position-detection-plan.md`](./kamino-position-detection-plan.md).

> **One rule above all:** every path here is **READ-ONLY**. Nothing signs, sends, or moves funds. No `signMessage` / `signTransaction` / `signAllTransactions` / `sendTransaction` is ever called — not on connect, not on read. See §5 and §11.

---

## 1. Executive Summary

What was built:

- **Real Solana wallet connection** via `@solana/wallet-adapter` — replaces mock/demo-only connection.
- **Phantom, Solflare, and Backpack** support. Phantom + Solflare via official adapters; Backpack via the Wallet Standard (auto-detected, no dedicated adapter export).
- **Phantom Ledger-safe connection** — a Ledger-backed Phantom account connects with no on-device approval because we request **no signature at connect time** (§5).
- **Read-only live wallet asset discovery** — the connected `publicKey` is read via RPC; balances/positions are normalized into a `WalletPosition[]` model and rendered in the Live Wallet Assets table.
- **SPL token detection** (Token program + Token-2022 program).
- **LST / staked-asset detection** — recognized liquid-staking tokens (JupSOL, mSOL, bSOL, JitoSOL) + the full Sanctum LST universe, plus native stake accounts, with real on-chain/sourced APY.
- **Protocol detection** — Kamino (lending + Earn vaults), Jito Restaking, Hubble (USDH loans), Meteora (DLMM + DAMM), Orca (Whirlpools), Raydium (CLMM + classic AMM/CPMM), Ondo (USDY). Details in §8.
- **Real-wallet mode separated from demo fixtures** — a connected real wallet NEVER shows the demo `$15,500`-style fixture data; it shows only live read-only facts and safe "unavailable" states (§7).

---

## 2. Installation / Packages

All packages are **runtime/production dependencies** unless marked dev. Package manager: **npm** (there is a committed `package-lock.json`). Everything is already in `app/package.json` — this section explains *why* each exists and *where* it is used.

### Wallet connection (core, eager — in the main bundle)

| Package | Why | Where used | Prod/Dev |
|---|---|---|---|
| `@solana/wallet-adapter-react` | React context (`ConnectionProvider`, `WalletProvider`, `useWallet`, `useConnection`) | `wallet/SolanaWalletProvider.tsx`, `useWalletDisplay.ts`, `useWalletPortfolio.ts`, `App.tsx` | Prod |
| `@solana/wallet-adapter-base` | Adapter base types/enums | wallet-adapter peer surface | Prod |
| `@solana/wallet-adapter-wallets` | `PhantomWalletAdapter`, `SolflareWalletAdapter` | `wallet/SolanaWalletProvider.tsx` | Prod |
| `@solana/wallet-adapter-react-ui` | Modal/UI primitives from the adapter UI kit | `components/ConnectWalletModal.tsx` | Prod |
| `@solana/web3.js` (v1) | `Connection`, `PublicKey`, RPC reads (`getBalance`, `getParsedTokenAccountsByOwner`, `getParsedProgramAccounts`) | `useWalletPortfolio.ts`, all detectors | Prod |
| `buffer` | Browser `Buffer` polyfill web3.js/adapters need | `main.tsx` (runtime shim) | Prod |

### Protocol detection SDKs (all **lazy / dynamically imported** — code-split out of the main bundle)

| Package | Why | Where used | Prod/Dev |
|---|---|---|---|
| `@solana/spl-stake-pool` | Stake-pool exchange-rate math → real LST APY | `wallet/lstApy.ts` | Prod |
| `@kamino-finance/klend-sdk` | Kamino Earn Vault shares (incl. farm-staked) | `wallet/kaminoVaults.ts` | Prod |
| `@solana/kit` | Modern Solana kit used by Kamino SDK chain | transitive via Kamino | Prod |
| `@jito-foundation/vault-sdk` | Decode Jito Restaking vaults → VRT→underlying map | `wallet/jitoRestaking.ts` | Prod |
| `@hubbleprotocol/hubble-sdk` | Hubble USDH loans (`getUserLoans`) with redistribution-adjusted debt | `wallet/hubble.ts` | Prod |
| `@meteora-ag/dlmm` | Meteora DLMM bin position amounts | `wallet/meteoraDlmm.ts` | Prod |
| `@meteora-ag/dynamic-amm-sdk` | Meteora DAMM reserves + LP supply | `wallet/meteoraDamm.ts` | Prod |
| `@orca-so/whirlpools-core` | WASM CLMM math (`decreaseLiquidityQuote`) — reused for Orca **and** Raydium CLMM valuation | `wallet/orcaWhirlpools.ts`, `wallet/raydiumClmm.ts` | Prod |

> Orca Whirlpools, Raydium CLMM, Raydium AMM/CPMM, and Sanctum LST recognition use **no dedicated SDK** — they read accounts directly (web3.js) + public HTTP APIs (§8). `@orca-so/whirlpools-core` is only the framework-agnostic WASM math kernel.

### UI / framework (context)

`react`, `react-dom`, `lottie-react` (onboarding animation). Dev: `typescript`, `vite`, `@vitejs/plugin-react`, `vite-plugin-wasm`, `vite-plugin-top-level-await`, `@types/react`, `@types/react-dom`.

### Install commands

The whole set installs with a plain `npm install` (they are already in `package.json`). If porting piecemeal:

```bash
# Wallet connection (eager)
npm i @solana/wallet-adapter-react @solana/wallet-adapter-base \
      @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets \
      @solana/web3.js buffer

# Protocol detection (lazy-loaded at runtime)
npm i @solana/spl-stake-pool @kamino-finance/klend-sdk @solana/kit \
      @jito-foundation/vault-sdk @hubbleprotocol/hubble-sdk \
      @meteora-ag/dlmm @meteora-ag/dynamic-amm-sdk @orca-so/whirlpools-core

# Vite plugins for the WASM/TLA SDKs
npm i -D vite-plugin-wasm vite-plugin-top-level-await
```

### Exact `package.json` changes

`dependencies` added for this work:

```jsonc
"@hubbleprotocol/hubble-sdk": "^8.0.4",
"@jito-foundation/vault-sdk": "1.0.0",
"@kamino-finance/klend-sdk": "9.1.2",
"@meteora-ag/dlmm": "1.9.11",
"@meteora-ag/dynamic-amm-sdk": "1.4.1",
"@orca-so/whirlpools-core": "2.0.0",
"@solana/kit": "^2.3.0",
"@solana/spl-stake-pool": "1.1.8",
"@solana/wallet-adapter-base": "^0.9.27",
"@solana/wallet-adapter-react": "^0.15.39",
"@solana/wallet-adapter-react-ui": "^0.9.39",
"@solana/wallet-adapter-wallets": "^0.19.38",
"@solana/web3.js": "^1.98.4",
"buffer": "^6.0.3"
```

`overrides` (critical — see peer-dependency notes):

```jsonc
"overrides": {
  "@kamino-finance/farms-sdk": "3.2.24",
  "@solana/web3.js": "$@solana/web3.js"
}
```

`devDependencies` added: `vite-plugin-wasm`, `vite-plugin-top-level-await`.

### Lockfile changes

`app/package-lock.json` is committed and must be kept in sync. The Hubble SDK alone pulls ~400 transitive packages; the Kamino chain pulls the largest set. Always commit the lockfile with dependency changes.

### Peer-dependency notes (important)

- **`@solana/web3.js` must be deduped to a single copy.** `@meteora-ag/dynamic-amm-sdk` pinned an *exact* web3.js version, which produced a **second nested copy** → duplicate `Connection`/`PublicKey` types (a `tsc` TS2345 error) and a runtime `instanceof` hazard across copies. The override `"@solana/web3.js": "$@solana/web3.js"` forces every dependent onto the app's single version. Keep this override.
- **`@kamino-finance/farms-sdk` pinned to `3.2.24`** to keep the Kamino SDK chain resolvable.
- **web3.js v1, not v2/kit-v5.** Detectors standardize on web3.js v1 `Connection`. The modern `@solana/kit` (v2) is only present transitively (Kamino). Do not mix kit-v5 `Rpc` objects into the v1 detectors.

### Known bundle-size warnings

All protocol SDKs are **dynamically imported**, so they are code-split into separate chunks fetched **only after a wallet connects** (phase 3 of the read). The **main bundle does not contain them.** Representative `vite build` chunk sizes (gzipped):

| Lazy chunk | Raw | gzip |
|---|---|---|
| `kaminoVaults` | ~10.2 MB | ~1.35 MB |
| `hubble` | ~2.4 MB | ~510 KB |
| `meteoraDamm` | ~1.49 MB | ~270 KB |
| `meteoraDlmm` | ~418 KB | ~85 KB |
| `jitoRestaking` | ~102 KB | ~12 KB |
| main `index` | ~1.22 MB | ~293 KB |

Vite prints a ">500 kB chunk" warning for the heavy SDK chunks. This is expected and acceptable for lazy chunks. For production, consider `build.rollupOptions.output.manualChunks` tuning and/or gating the heaviest detectors behind a feature flag.

---

## 3. Environment Variables

| Var | Required? | Purpose |
|---|---|---|
| `VITE_SOLANA_RPC_URL` | Optional (strongly recommended) | Dedicated Solana RPC endpoint for read-only balance/token/account reads |

There are **no protocol API keys.** All protocol HTTP APIs used are public and keyless (Kamino, Raydium, Orca, Marinade, DefiLlama, Sanctum CDN) — see §8. The only configurable endpoint is the Solana RPC.

- **Where the env file lives:** `app/.env.local` (gitignored — `.env` and `.env.local` are in `.gitignore`).
- **Template:** `app/.env.example` is committed. Copy it to `.env.local` and fill in the URL.
- **Restart required?** Yes. Vite inlines `import.meta.env.*` at dev-server start / build time. Changing `.env.local` requires restarting `npm run dev` (a hot reload is not enough).

### Example `app/.env.local`

```bash
# Local-only RPC config (gitignored — never committed). Read-only reads only.
VITE_SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY_HERE
```

> The real dev key lives only in the gitignored `app/.env.local`. **Never** commit a secret-bearing/paid RPC URL or a private key.

### What happens if no dedicated RPC is provided

`SolanaWalletProvider.tsx` falls back to `DEFAULT_PUBLIC_RPC = "https://solana-rpc.publicnode.com"`, a CORS-enabled public node. Consequences:

- **Native SOL** (`getBalance`) reads **reliably** on the default.
- **SPL / Token-2022** reads use `getParsedTokenAccountsByOwner`, an expensive **indexed** method that keyless public RPCs generally do **not** serve → token reads may fail on the default (surfaces as a partial-read warning, not a hard error — §6).
- Most **protocol detectors** need the same indexed/account methods and will silently return nothing on a weak RPC.

### Why public mainnet RPC is not production-grade

- `https://api.mainnet-beta.solana.com` **blocks browser requests** (CORS/403) — every read fails from a web app. That is exactly why the default is `solana-rpc.publicnode.com` instead.
- Public nodes are heavily rate-limited and typically **do not serve** `getParsedTokenAccountsByOwner` / `getProgramAccounts` at the volume protocol detection needs.
- **Production must use a dedicated RPC** (Helius / QuickNode / Alchemy / Triton) with a key, set via `VITE_SOLANA_RPC_URL`.

---

## 4. Wallet Connection Architecture

| Concern | File |
|---|---|
| Wallet provider (context wrapper) | `app/src/wallet/SolanaWalletProvider.tsx` |
| Connect modal (UI) | `app/src/components/ConnectWalletModal.tsx` |
| App-state integration (mode) | `app/src/App.tsx` |
| Wallet display (pill) | `app/src/wallet/useWalletDisplay.ts` |
| App bootstrap + shims | `app/src/main.tsx` |

- **Provider setup** (`SolanaWalletProvider.tsx`): wraps the app in `<ConnectionProvider endpoint={…}><WalletProvider wallets={[Phantom, Solflare]} autoConnect={false}>`. `autoConnect` is **off** so connection is always explicit and never triggers a signature. Backpack is auto-registered via Wallet Standard. Mounted in `main.tsx` above `<App/>`.
- **Connected `publicKey` storage/read:** there is no custom store — the wallet-adapter's `useWallet()` is the single source of truth. `App.tsx` reads `const { connected, publicKey, disconnect } = useWallet()` and derives `walletConnected = connected && !!publicKey`. Reads use `publicKey.toBase58()`.
- **Wallet name display:** `useWalletDisplay()` returns `{ providerId, name, address, addressShort, label }` from `wallet.adapter.name` + `publicKey.toBase58()`. Pill label format: `"{name} • {last4}"` (e.g. `Phantom • 6fQ9`). `providerIdFromName()` maps the adapter name to an icon id (`phantom`/`solflare`/`backpack`/`wallet`).
- **Disconnect:** `App.tsx` calls the adapter's `disconnect()`; this clears `connected`/`publicKey`, which flips mode back to `disconnected`, shows a toast, and returns to the Dashboard. No fake connected state is preserved. `useWalletPortfolio` also clears its state and cancels any in-flight read on disconnect (§6).
- **Onboarding reaction:** `onboarding_active = mode !== "demo" && (disconnected || !goalCompleted)`. On load there's no wallet → disconnected onboarding. Connecting a wallet flips `mode` to `connected` (see below) and advances the flow.
- **Real-wallet mode detection:** `AppMode = "connected" | "demo" | "disconnected"`, computed as `demoActive ? "demo" : walletConnected ? "connected" : "disconnected"`. Demo Mode takes precedence; otherwise a live wallet drives `connected`.

---

## 5. Ledger-Safe Rules

**Phantom Ledger works because we never request a signature during connection.** A Ledger-backed Phantom account connects as a normal account with **no on-device approval prompt**, because WealthSmith asks for none.

At connect time the app calls **only** the adapter's `connect()` and reads the returned `publicKey`. It does **NOT** call:

- ❌ `signMessage` (no SIWS / Sign-In-With-Solana, no ownership proof)
- ❌ `signTransaction`
- ❌ `signAllTransactions`
- ❌ `sendTransaction`
- ❌ any transaction build/simulate/broadcast

Model: **publicKey-only, read-only.** `autoConnect={false}`; the connection yields an address, and every subsequent operation is a read of that address via RPC.

**When signatures may be added later:** only for an **explicit, user-approved action** (e.g. a future deposit/withdraw the user initiates and confirms) — **never** as part of connection, session establishment, or portfolio reads. Adding a signature to the connect path would break Ledger-safe behavior and violate [`rules/wallet-and-custody-rules.md`](../rules/wallet-and-custody-rules.md).

---

## 6. Live Wallet Read Architecture

**Hook:** `app/src/wallet/useWalletPortfolio.ts` → `useWalletPortfolio(): { status, positions, error?, warning?, refresh }`.
**Model:** `app/src/wallet/walletPosition.ts` (`WalletPosition`, `TOKEN_REGISTRY`).
**Rendered by:** `app/src/components/LiveWalletAssets.tsx` (in `app/src/pages/PortfolioPage.tsx`).
**Derived summary:** `app/src/wallet/walletSummary.ts` (safe non-financial facts for the Dashboard).

### Read phases (all reads independent, time-boxed, best-effort)

- **Phase 1 — native SOL:** `connection.getBalance(owner)` (10s timeout). Renders immediately so the balance appears fast while token/protocol reads continue.
- **Phase 2 — tokens + core protocols** via `Promise.allSettled` (8–12s timeouts each):
  - **SPL tokens:** `getParsedTokenAccountsByOwner(owner, { programId: TOKEN_PROGRAM_ID })`
  - **Token-2022:** same call with `TOKEN_2022_PROGRAM_ID`
  - native stake, Kamino lending, Kamino vaults, Jito VRT map, Sanctum LST map
- **Phase 3 — enrichment + LP/loan detection** via `Promise.allSettled`, then one merged `setState`:
  - LST/Ondo APY, Orca, Raydium CLMM, Raydium AMM, Meteora DLMM, Meteora DAMM, Hubble loans
  - LP rows can replace an "Unknown token" row (the held LP mint resolved to a pool); Hubble loans append as standalone protocol rows.

### Behaviors

- **Loading state:** `status: "loading"` while keeping any prior positions visible (retry does not blank the table).
- **Refresh:** `refresh()` bumps a key that re-runs the effect. No polling — manual refresh only.
- **Error handling:** hard `status: "error"` **only when all three core reads fail** (native + SPL + Token-2022). Otherwise the table renders what succeeded.
- **Partial success:** a `warning` is set matching which read failed (`LIVE_WALLET_WARNING_TOKENS` / `LIVE_WALLET_WARNING_TOKEN2022` from `state/approvedCopy.ts`). One failed protocol read simply omits that provider's rows — never an error.
- **RPC diagnostics:** in `import.meta.env.DEV`, a structured `console.info("[wallet-read]", …)` logs per-read ok/failed status, error text, endpoint, publicKey, and count. Never shown to users.
- **Disconnect clearing:** on disconnect (or no `publicKey`), `reqId` is bumped to invalidate any in-flight read and state resets to `{ status: "idle", positions: [] }`. Stale/duplicate fetches are guarded by comparing `myReq !== reqId.current`.

### The exact `WalletPosition` model

```ts
export interface WalletPosition {
  id: string;
  source:
    | "wallet"
    | "jupiter"
    | "kamino"
    | "jito"
    | "sanctum"
    | "ondo"
    | "orca"
    | "raydium"
    | "meteora"
    | "hubble";
  type: "native" | "token" | "lst" | "stake" | "protocol";
  symbol: string;
  name?: string;
  mint?: string;
  amount: string;              // raw or human-readable string (see §9)
  uiAmount?: number;
  decimals?: number;
  logoUri?: string;
  icon?: string;               // approved local icon path (assets/icons/token/*.svg)
  protocol?: string;           // display-only, e.g. "Marinade", "Hubble"
  detection:
    | "direct_wallet_balance"
    | "recognized_lst_mint"
    | "protocol_api"
    | "native_stake";
  valueUsd?: null;             // ALWAYS null — USD value is never invented
  apy?: number | null;         // PERCENT (5.24 = 5.24%) from an authoritative source only; else null → "—"
  side?: "supplied" | "borrowed"; // for protocol positions (collateral vs debt)
}
```

**Invariants:** `valueUsd` stays `null` (no invented USD). `apy` is a sourced percent or `null` (rendered `—`). Some rows correctly have **no APY** and the `—` must not be "fixed": Hubble USDH loans (interest-free), USDH the token (non-yield stablecoin), and Jito Restaking rows (no clean read source yet).

---

## 7. Data Mode Separation

Defined in `app/src/state/portfolioDataSource.ts` → `PortfolioDataSource = "demo_fixture" | "real_wallet" | "example_fixture"`, mapped from `AppMode` by `portfolioDataSourceForMode(mode)`.

| Mode | Trigger | Data shown |
|---|---|---|
| **Disconnected onboarding** | No wallet, not demo | Onboarding / empty states own this surface — no portfolio data source |
| **Demo fixture mode** (`demo_fixture`) | Demo Mode active | Sample fixtures + sample Smith-AI suggestions (the `$15,500`-style demo data) |
| **Real connected wallet** (`real_wallet`) | Real wallet connected | **Live read-only wallet facts only** + safe "unavailable" states — **no fixture values** |

Clarifications (enforced, per [`rules/financial-logic-boundaries.md`](../rules/financial-logic-boundaries.md) Demo Mode Boundary):

- Demo fixtures are **only** for Demo Mode.
- Real wallet mode **must not** show dummy `$15,500` fixture data.
- Real wallet mode shows only live read-only wallet facts and safe unavailable states.
- The `example_fixture` source (`examples/dashboard/dashboard-connected-wallet-state.json`) is **dev/test/storybook/reference ONLY** — never the normal real-wallet flow.

> **Port note:** in the prototype the connected Dashboard/Goal/Support pages are still fixture-backed for layout; only the wallet **pill** and the **Live Wallet Assets** table are live. In production, the real-wallet surfaces must be fully live or explicitly show "unavailable" — never fixtures.

---

## 8. Protocol Detection Inventory

Legend — **Detection kind:** `direct` = held-token balance, `lst_mint` = recognized LST mint, `api/sdk` = protocol API or SDK. **Needs:** `RPC` and/or `API`. **APY source** noted where present. Every detector is READ-ONLY, best-effort, and lazy-loaded unless it's plain token parsing.

### Jupiter (JupSOL)
- **Detection:** recognized LST mint (`jupSoLaHXQ…`). **Kind:** `lst_mint`. **Needs:** RPC.
- **Input:** `publicKey`'s SPL token accounts.
- **File:** `walletPosition.ts` (registry) + `useWalletPortfolio.ts` (classification) + `lstApy.ts` (APY).
- **Output:** `type:"lst"`, `source:"jupiter"`, real amount, APY.
- **APY:** on-chain stake-pool exchange-rate growth over last epoch (`@solana/spl-stake-pool`).
- **Limitations:** APY needs the stake-pool account read. **Test:** hold JupSOL, or run `lstApy.ts` against the mint.

### Marinade (mSOL)
- **Detection:** recognized LST mint (`mSoLzYCx…`). **Kind:** `lst_mint`. **Needs:** RPC + API (APY).
- **File:** `walletPosition.ts` + `lstApy.ts`.
- **Output:** `type:"lst"`, `source:"wallet"`, `protocol:"Marinade"`, amount, APY.
- **APY:** `https://api.marinade.finance/msol/apy/30d` (public, keyless). **Verified:** ~5.90%.
- **Limitations:** APY depends on Marinade API uptime. **Test:** hold mSOL.

### Jito — JitoSOL (LST) and Jito Restaking (VRT)
- **JitoSOL:** recognized LST mint (`J1toso1u…`), `lst_mint`, APY from on-chain stake pool. **Verified:** 65,498 JitoSOL holder.
- **Restaking VRT:** **Kind:** `api/sdk`. **File:** `wallet/jitoRestaking.ts` (`@jito-foundation/vault-sdk`). Enumerates Jito vaults on-chain → VRT-mint→underlying map; a held VRT becomes "Restaked on Jito" denominated in the underlying (e.g. JitoSOL) via the vault exchange rate. **Needs:** RPC.
- **APY:** JitoSOL = stake-pool APY; **restaking-reward APY has no clean read source → `—`** (do not invent).
- **Test:** hold JitoSOL and/or a Jito VRT.

### Sanctum (full LST universe)
- **Detection:** recognize any of ~245 Sanctum LST mints. **Kind:** `lst_mint` (registry from CDN). **Needs:** API (list) + RPC (APY).
- **File:** `wallet/sanctumLsts.ts` (fetches/caches the list) + `lstApy.ts`.
- **Source list:** `https://cdn.jsdelivr.net/gh/igneous-labs/sanctum-lst-list/...` (TOML, keyless).
- **Output:** `type:"lst"`, `source:"sanctum"`, `protocol:"Sanctum"`, amount, APY.
- **APY:** on-chain stake-pool math (searches SPL + Sanctum stake-pool programs). Special-cased: **INF** via DefiLlama. **Verified:** INF ~5.83%.
- **Limitations:** APY only for pools whose stake-pool account is found. **Test:** hold any Sanctum LST (e.g. INF).

### Kamino — Lending and Earn Vaults
- **Lending:** **Kind:** `api/sdk`. **File:** `wallet/protocolPositions.ts`. Reads obligations from Kamino's public REST API `https://api.kamino.finance` (`/v2/kamino-market` lists all ~33 markets; then `/kamino-market/{market}/users/{owner}/obligations`), and resolves each reserve's underlying mint **on-chain** (reserve liquidity-mint offset). **Needs:** RPC + API.
- **Earn Vaults:** **Kind:** `api/sdk`. **File:** `wallet/kaminoVaults.ts` (`@kamino-finance/klend-sdk`, takes `rpcUrl`). Detects vault shares **including farm-staked shares** (not held in-wallet as tokens). **Needs:** RPC (heavy).
- **Output:** `source:"kamino"`, `type:"protocol"`, `side:"supplied"|"borrowed"`, amount. **Verified:** Steakhouse USDC 15,220.28 USDC @ 3.64%.
- **Limitations:** vault SDK is the heaviest chunk (~10 MB). **Test:** hold a Kamino deposit/borrow or vault position.

### Hubble (USDH loans / CDP)
- **Detection:** owner-based loans via `@hubbleprotocol/hubble-sdk` `getUserLoans`. **Kind:** `api/sdk`. **File:** `wallet/hubble.ts`. **Needs:** RPC.
- **What:** collateral (SOL, mSOL, ETH, BTC…) + minted USDH debt → a "Hubble Loan" borrow row, e.g. `13,752.54 USDH debt · 335.5 SOL`.
- **Why the SDK (not raw decode):** the on-chain debt field **understates** true debt — liquidation losses are redistributed pro-rata via the borrowing-market state; the SDK returns the redistribution-adjusted debt. **Verified:** raw 12,916 → true 13,752 USDH.
- **APY:** `—` (interest-free borrow, one-time fee, no ongoing APR). USDH the token is registered separately (`source:"hubble"`, non-yield, no APY).
- **Limitations:** deprecated protocol (~147 active loans); SDK is heavy (~2.4 MB chunk). **Test:** module-test against a known borrower (see §Appendix).

### Meteora — DLMM and DAMM
- **DLMM:** **Kind:** `api/sdk`, owner-based. **File:** `wallet/meteoraDlmm.ts` (`@meteora-ag/dlmm`, `getAllLbPairPositionsByUser`). Aggregates bin amounts per pair. **Verified:** SOL/USDC 0.3971 + 153.85. **APY:** `—`.
- **DAMM:** **Kind:** `api/sdk`, held fungible LP tokens. **File:** `wallet/meteoraDamm.ts`. No API lookup-by-LP-mint (80k+ pools), so the pool is found **on-chain** (`Pool.lp_mint` @ offset 8) then valued with `@meteora-ag/dynamic-amm-sdk` (`AmmImpl`) → `yourLP / lpSupply × reserves`. **Verified:** MAGA/USDC 170.4M + 4.76M. **APY:** `—`.
- **Needs:** RPC. **Limitations:** DAMM requires the web3.js dedupe override (§2).

### Orca (Whirlpools — CLMM)
- **Detection:** on-chain Position accounts (incl. position bundles) from held NFT mints; valued with `@orca-so/whirlpools-core` WASM (`decreaseLiquidityQuote`). **Kind:** `api/sdk`. **File:** `wallet/orcaWhirlpools.ts`. **Needs:** RPC + API (APR).
- **Output:** `source:"orca"`, `type:"protocol"`, `symA/symB` amounts. **Verified:** SOL/USDC 0.0087 + 0.7048, plus a bundle SOL/$michi.
- **APY:** pool fee APR from `https://api.mainnet.orca.so/v1/whirlpool/list`.
- **Test:** hold an Orca Whirlpool position (or a bundle).

### Raydium — CLMM and classic AMM/CPMM
- **CLMM:** **Kind:** `api/sdk`. **File:** `wallet/raydiumClmm.ts`. On-chain `PersonalPositionState` (program `CAMMCzo5…`) + reuse Orca WASM math for amounts; pool meta from `https://api-v3.raydium.io/pools/info/ids`. **Verified:** 4 pairs.
- **AMM/CPMM:** **Kind:** `api/sdk`, held fungible LP tokens. **File:** `wallet/raydiumAmm.ts`. Resolves LP token via `https://api-v3.raydium.io/pools/info/lps?lps=` → `yourLP / lpSupply × reserves`. **Verified:** 20,870 Old Slerf + 3.99 WSOL.
- **Needs:** RPC + API. **APY:** pool APR available from the Raydium API where returned; else `—`.
- **Test:** hold a Raydium CLMM position or a classic LP token.

### Ondo (USDY)
- **Detection:** recognized token mint (`A1KLoBrK…`). **Kind:** `direct`/`lst_mint`-style token. **Needs:** RPC + API (APY).
- **File:** `walletPosition.ts` (registry, `source:"ondo"`) + `lstApy.ts`.
- **Output:** `type:"token"`, `protocol:"Ondo"`, amount, APY.
- **APY:** DefiLlama `https://yields.llama.fi/chart/{poolId}` (USDY pool id). **Verified:** ~3.55%. (USDY **is** yield-bearing — contrast with USDH.)
- **Test:** hold USDY.

### Native SOL & Native Stake (baseline, not a third-party protocol)
- **Native SOL:** `getBalance` → `type:"native"`.
- **Native stake:** `wallet/protocolPositions.ts` — `getParsedProgramAccounts` on the Stake program (`Stake111…`) filtered by the wallet's withdraw authority (offset 44); merges accounts. **Kind:** `native_stake`. **Verified:** 6 accounts merged → 30.79 SOL @ 5.24%.

> **Not implemented / not detected** (do not claim support): raw perps/futures positions, lending on protocols other than Kamino, NFT valuation, non-Solana chains, USD valuation of any position. See §11.

---

## 9. Token / LST Registry

- **Location:** `app/src/wallet/walletPosition.ts` → `TOKEN_REGISTRY: Record<mint, TokenInfo>` + `lookupMint()` + `shortMint()`.
- **Supported tokens:** USDC, USDT, BONK, wSOL, **USDH** (Hubble stablecoin, non-yield), **USDY** (Ondo, yield-bearing).
- **Supported LSTs (explicit):** **JupSOL, mSOL, bSOL, JitoSOL** — each `type:"lst"` with a `protocol` and `source`. The **full Sanctum LST universe** (~245) is recognized dynamically at runtime via `wallet/sanctumLsts.ts` (not hardcoded in the registry).
- **How JupSOL / mSOL / bSOL / JitoSOL are classified:** registry entry `type:"lst"` → `detection:"recognized_lst_mint"` → shows real symbol/name and picks up on-chain stake-pool APY in phase 3. Classification is **only** from this mapping (or the Sanctum map) — an unrecognized mint is **never** inferred as an LST.
- **Unknown tokens:** rendered safely as `symbol: shortMint(mint)`, `name:"Unknown token"`, `source:"wallet"`, `type:"token"` — never guessed as an LST/protocol asset. In phase 3, an unknown **fungible** token may be resolved into a Raydium/Meteora LP row (and the unknown row removed); 0-decimal unknowns are treated as NFT candidates for Orca/Raydium CLMM.
- **Adding a new token:** add a `TOKEN_REGISTRY[mint]` entry (`symbol`, `name`, `type`, optional `icon`, `protocol`, `source`). If it introduces a new `source`, add that string to **both** union types in `walletPosition.ts` (`WalletPosition.source` and `TokenInfo.source`) **and** to `SOURCE_LABEL` in `components/LiveWalletAssets.tsx` (TypeScript will flag omissions). If yield-bearing, wire an APY source in `lstApy.ts`.
- **Icons/logos:** approved local SVGs at `assets/icons/token/*.svg`, resolved via `app/src/state/iconRegistry.ts`. `icon` is optional and falls back to a generic token icon — no remote logo fetching.
- **Decimals/amounts:** `amount` is the raw base-unit string from the token account; `uiAmount`/`decimals` come from the parsed account. Protocol detectors that compute human-readable amounts store a formatted string in `amount` (e.g. `"335.5 SOL"`). The UI formats display; `valueUsd` is always `null`.

---

## Local Setup Instructions

```bash
# 1. Clone
git clone <repo-url> wealthsmith-design-system
cd wealthsmith-design-system/app

# 2. Install (npm — a package-lock.json is committed)
npm install

# 3. RPC config
cp .env.example .env.local
#    then edit .env.local:
#    VITE_SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY

# 4. Run dev server (predev runs `npm run tokens` automatically)
npm run dev            # http://localhost:5173

# Validation commands
npm run tokens         # rebuild design tokens (scripts/build-tokens.mjs)
npx tsc --noEmit       # typecheck
npm run build          # tsc --noEmit && vite build (prebuild runs tokens)
```

**Manual QA:**
1. **Connect Phantom** — open the app, Connect Wallet → Phantom, approve the connection. No signature prompt should appear.
2. **Connect Phantom Ledger** — select a Ledger-backed Phantom account. It should connect with **no on-device approval**. If Ledger asks to sign, a signature crept into the connect path — regression (§5).
3. **Portfolio** — go to the Portfolio page; the Live Wallet Assets table should show native SOL immediately, then tokens/LSTs/protocol positions as phases 2–3 resolve. With a weak/default RPC you may see a partial-read warning (expected).
4. **Demo Mode** — enable Demo Mode; confirm fixtures show there **and only there** (real wallet mode must never show `$15,500`-style data).
5. **Disconnect** — confirm the table clears and mode returns to disconnected.

> **Restart** the dev server after editing `.env.local` (Vite inlines env at start).

---

## 10. What Developers Should Port

Port these files/patterns into the production app, preserving the read-only contract:

| Concern | Port from |
|---|---|
| Provider setup | `wallet/SolanaWalletProvider.tsx` (+ `main.tsx` Buffer/process shims, `vite.config.ts` wasm/TLA/dedupe) |
| Wallet modal | `components/ConnectWalletModal.tsx` |
| **No-signature connection rule** | `autoConnect={false}` + publicKey-only usage everywhere (§5) — treat as a hard invariant |
| Wallet read hook | `wallet/useWalletPortfolio.ts` (3-phase, timeouts, allSettled, diagnostics) |
| Position model | `wallet/walletPosition.ts` (`WalletPosition`, `TOKEN_REGISTRY`) |
| Protocol detectors | `wallet/{protocolPositions,kaminoVaults,jitoRestaking,sanctumLsts,lstApy,hubble,meteoraDlmm,meteoraDamm,orcaWhirlpools,raydiumClmm,raydiumAmm}.ts` |
| Data mode separation | `state/portfolioDataSource.ts` + `App.tsx` mode derivation |
| Live Wallet Assets UI | `components/LiveWalletAssets.tsx` (+ `pages/PortfolioPage.tsx`) + `wallet/walletSummary.ts` |
| Wallet display pill | `wallet/useWalletDisplay.ts` |
| Error handling / diagnostics | `useWalletPortfolio.ts` timeouts + `[wallet-read]` DEV log + `state/approvedCopy.ts` warning copy |
| Env config | `.env.example`, `VITE_SOLANA_RPC_URL` handling in `SolanaWalletProvider.tsx` |

---

## 11. Known Limitations

- **No USD valuation.** `valueUsd` is always `null` by design — no pricing source is wired.
- **APY coverage is partial and source-gated.** Only LSTs (stake-pool math), mSOL (Marinade API), INF/USDY (DefiLlama), and some Orca/Raydium pools have APY. LP positions (Meteora, most Raydium/Orca), Jito Restaking rewards, and Hubble loans show `—`. These `—`s are **honest** and must not be backfilled with estimates.
- **RPC-dependent.** Token/account/program reads need a dedicated RPC. On the public default, token reads and most protocol detectors return nothing (partial warning, not error).
- **Bundle weight.** The Kamino (~10 MB) and Hubble (~2.4 MB) chunks are heavy (lazy-loaded, but large). Consider feature-flagging the heaviest detectors.
- **Hubble is a deprecated protocol** (~147 active loans). Kept for completeness.
- **Prototype surfaces still fixture-backed.** Only the wallet pill + Live Wallet Assets are live; connected Dashboard/Goal/Support are fixture layouts in the prototype (§7 port note).
- **Web3.js single-copy dependency** on the override; a future SDK pinning a different web3.js version could reintroduce the duplicate-`Connection` hazard.
- **No transaction capability at all** — deposits/withdrawals/swaps are out of scope by design (§5).
- **Best-effort detection** — a slow/rate-limited RPC can time out an individual protocol read, silently omitting those rows.

---

## 12. Appendix

### File map (`app/src/`)

```
wallet/
  SolanaWalletProvider.tsx   Provider + RPC endpoint selection (+ DEFAULT_PUBLIC_RPC)
  useWalletPortfolio.ts      Read hook (3-phase, timeouts, merge, diagnostics)
  walletPosition.ts          WalletPosition model + TOKEN_REGISTRY + lookupMint/shortMint
  walletSummary.ts           Safe non-financial summary for the Dashboard
  useWalletDisplay.ts         Pill display (name • last4, provider icon id)
  protocolPositions.ts       Native stake + Kamino lending
  kaminoVaults.ts            Kamino Earn Vaults (klend-sdk, incl. farm-staked)
  jitoRestaking.ts           Jito Restaking VRT→underlying (vault-sdk)
  sanctumLsts.ts             Sanctum LST universe (CDN registry)
  lstApy.ts                  LST/token APY (stake-pool math, Marinade, DefiLlama)
  hubble.ts                  Hubble USDH loans (hubble-sdk getUserLoans)
  meteoraDlmm.ts             Meteora DLMM (owner-based, dlmm SDK)
  meteoraDamm.ts             Meteora DAMM (on-chain pool + dynamic-amm-sdk)
  orcaWhirlpools.ts          Orca Whirlpool CLMM (+ bundles, WASM math)
  raydiumClmm.ts             Raydium CLMM (on-chain + WASM math + API)
  raydiumAmm.ts              Raydium classic AMM/CPMM (fungible LP + API)
components/
  ConnectWalletModal.tsx     Read-only connect modal
  LiveWalletAssets.tsx       Positions table (+ SOURCE_LABEL)
pages/PortfolioPage.tsx      Renders LiveWalletAssets
state/
  portfolioDataSource.ts     demo_fixture | real_wallet | example_fixture
  approvedCopy.ts            Warning/error copy
  iconRegistry.ts            Token icon resolution
App.tsx                      AppMode (connected|demo|disconnected) + disconnect
main.tsx                     Buffer/process shims + provider mount
vite.config.ts               wasm + TLA plugins, optimizeDeps, global alias
```

### Dependency map

- Eager (main bundle): `@solana/wallet-adapter-*`, `@solana/web3.js`, `buffer`.
- Lazy (per-detector chunk): `@solana/spl-stake-pool`, `@kamino-finance/klend-sdk` (+`@solana/kit`), `@jito-foundation/vault-sdk`, `@hubbleprotocol/hubble-sdk`, `@meteora-ag/dlmm`, `@meteora-ag/dynamic-amm-sdk`, `@orca-so/whirlpools-core`.
- Build: `vite-plugin-wasm`, `vite-plugin-top-level-await`.
- Overrides: `@kamino-finance/farms-sdk@3.2.24`, `@solana/web3.js: $@solana/web3.js`.

### Protocol → detector map

| Protocol | File(s) | Detection kind | Needs | APY source |
|---|---|---|---|---|
| Jupiter (JupSOL) | walletPosition + lstApy | lst_mint | RPC | stake-pool (on-chain) |
| Marinade (mSOL) | walletPosition + lstApy | lst_mint | RPC+API | marinade.finance |
| Jito (JitoSOL) | walletPosition + lstApy | lst_mint | RPC | stake-pool (on-chain) |
| Jito Restaking (VRT) | jitoRestaking | api/sdk | RPC | — |
| Sanctum (LSTs) | sanctumLsts + lstApy | lst_mint | API+RPC | stake-pool; INF via DefiLlama |
| Kamino lending | protocolPositions | api/sdk | RPC+API | (as reported) |
| Kamino vaults | kaminoVaults | api/sdk | RPC | (as reported) |
| Hubble (USDH loan) | hubble | api/sdk | RPC | — (interest-free) |
| Meteora DLMM | meteoraDlmm | api/sdk | RPC | — |
| Meteora DAMM | meteoraDamm | api/sdk | RPC | — |
| Orca Whirlpools | orcaWhirlpools | api/sdk | RPC+API | orca.so pool APR |
| Raydium CLMM | raydiumClmm | api/sdk | RPC+API | raydium.io |
| Raydium AMM/CPMM | raydiumAmm | api/sdk | RPC+API | raydium.io |
| Ondo (USDY) | walletPosition + lstApy | direct token | RPC+API | DefiLlama |
| Native SOL | useWalletPortfolio | direct | RPC | n/a |
| Native stake | protocolPositions | native_stake | RPC | on-chain |

### Env var map

| Var | File that reads it | Default if unset |
|---|---|---|
| `VITE_SOLANA_RPC_URL` | `wallet/SolanaWalletProvider.tsx` | `https://solana-rpc.publicnode.com` (native SOL only) |

### External HTTP endpoints (all public, keyless)

`api.kamino.finance` · `api.marinade.finance` · `api-v3.raydium.io` · `api.mainnet.orca.so` · `yields.llama.fi` (DefiLlama) · `cdn.jsdelivr.net/gh/igneous-labs/sanctum-lst-list`.

### Manual test accounts (public on-chain addresses — read-only, safe)

These are public mainnet addresses used to verify module-level detection (pass to a detector's `owner` argument; you don't need to own them):

- **Hubble borrower:** `5a2txJm7SvQvTUcFfYvvrjzZWNz2TWG4rV7Z4uf82Hkr` — two loans (13,752.54 USDH / 335.5 SOL; 13,530.05 USDH / 335.15 mSOL).

For live end-to-end testing (connect via Phantom), use your own wallet holding the relevant asset. To reproduce protocol rows without holding positions, find current holders via `getTokenLargestAccounts`/bounded `getProgramAccounts` (the method used during development).

### Related local docs

- [`patterns/wallet-connection.md`](../patterns/wallet-connection.md) — per-provider detection notes (source of truth).
- [`rules/wallet-and-custody-rules.md`](../rules/wallet-and-custody-rules.md) — read-only / custody rules.
- [`docs/wallet-ledger-connection-handoff.md`](./wallet-ledger-connection-handoff.md) — Ledger connection handoff.
- [`docs/kamino-position-detection-plan.md`](./kamino-position-detection-plan.md) — Kamino detection plan.
- [`rules/protocol-selection-rules.md`](../rules/protocol-selection-rules.md) — protocol selection rules.
