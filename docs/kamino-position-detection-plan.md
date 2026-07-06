# Kamino Position Detection — read-only

Status: **implemented (read-only).** Two Kamino products are detected:

- **Lend markets** (`app/src/wallet/protocolPositions.ts`, REST + on-chain reserve
  reads) — supplied/borrowed positions across all markets.
- **Earn Vaults incl. farm-staked shares** (`app/src/wallet/kaminoVaults.ts`, via
  the official `@kamino-finance/klend-sdk`) — e.g. the "Steakhouse USDC" vault.
  This is required because vault shares staked in a Kamino farm are **not** held in
  the wallet as tokens, and Kamino's public `/portfolio/{wallet}` API only returns
  data for wallets it has already indexed (it does not index on demand).

No USD value or APY is invented.

## Earn Vault detection (SDK)

`fetchKaminoVaultPositions(rpcUrl, owner)`:
1. `new KaminoVaultClient(rpc, ...).getUserSharesBalanceAllVaults(owner)` returns
   `{ unstakedShares, stakedShares, totalShares }` per vault (the SDK reads the
   wallet's share ATA **and** its farm stake).
2. For vaults with shares, `KaminoVault.getState()` gives the vault `tokenMint`
   (e.g. USDC) and name (e.g. "Steakhouse USDC"), mapped to a symbol via the
   registry.
3. Emitted as `WalletPosition { source: "kamino", type: "protocol", side:
   "supplied", detection: "protocol_api" }`.
4. **Amount** = `totalShares × getTokensPerShareSingleVault` (on-chain exchange
   rate → underlying token amount). **APY** = `getVaultActualAPY().netAPY × 100`
   (SDK, net of vault fees). Both are sourced, best-effort (fallback "—").

Positions carry `apy` (percent) shown in the Live Wallet Assets table, sourced only:
- **Kamino vault** — SDK `getVaultActualAPY().netAPY`.
- **Native SOL stake** — last epoch's on-chain inflation reward
  (`getInflationReward`) annualized (`app/src/wallet/protocolPositions.ts`).
- **LSTs (JupSOL/bSOL/JitoSOL)** — on-chain stake-pool exchange-rate growth over the
  last epoch (`app/src/wallet/lstApy.ts`, via `@solana/spl-stake-pool`, searching the
  SPL + Sanctum stake-pool programs). Jupiter's public API exposes only price (no
  APY) and Sanctum's APY endpoint returns 0, so this on-chain method is used. mSOL
  (Marinade, different program) is not covered yet → "—".

Every provider position should show amount + sourced APY (never invented).

Bundling notes (Vite): the SDK is CJS + pulls a top-level-await WASM dep
(`@orca-so/whirlpools-core` via kliquidity). It is loaded via **dynamic import**
(code-split, ~10 MB chunk, off the main bundle), with `vite-plugin-wasm` +
`vite-plugin-top-level-await`, `optimizeDeps.include: ['@kamino-finance/klend-sdk']`
+ `exclude: ['@orca-so/whirlpools-core']`, an npm override pinning
`@kamino-finance/farms-sdk` to `3.2.24`, and a `process` shim in `main.tsx`.
READ-ONLY: SDK read calls only; no signing/transactions.

## Lend market detection (REST)

1. Fetch the lending markets list from Kamino's public REST API
   (`GET https://api.kamino.finance/kamino-market`) — CORS-enabled, no API key.
2. For each market, read the user's obligations
   (`GET /kamino-market/{market}/users/{owner}/obligations`) and collect non-zero
   `deposits[].depositReserve` (supplied) and `borrows[].borrowReserve` (borrowed).
3. Resolve each reserve's underlying token **on-chain**: read the reserve account
   (owned by the K-Lend program) via `getMultipleAccountsInfo` and take the
   liquidity-mint pubkey at the fixed reserve offset (128), then map that mint to a
   symbol via the approved mint registry (`walletPosition.ts`). Unknown mints show
   as a short mint.
4. Emit `WalletPosition { source: "kamino", type: "protocol", side:
   "supplied"|"borrowed", detection: "protocol_api", valueUsd: null, apy: null }`.

READ-ONLY: HTTP GETs + `getMultipleAccountsInfo` only. No signing/transactions.

## Known limitations / next steps

- Only markets returned by `/kamino-market` are scanned (currently the primary
  market, where USDC lending lives). Additional markets (JLP, Altcoin, etc.) would
  need to be enumerated separately.
- The on-chain `depositedAmount` is in cToken (collateral) units, so a precise
  underlying token amount and USD value are **not** shown (would need the reserve
  exchange rate / an approved pricing source). Positions are shown as detected
  supplied/borrowed. Adding amounts/APY later would use the Kamino SDK
  (`@kamino-finance/klend-sdk`) or reserve-state parsing + an approved price source.

## Constraints (unchanged)

- Read-only. Connected `publicKey` + RPC/protocol read APIs only.
- **No** `signMessage` / `signTransaction` / `signAllTransactions` / `sendTransaction`.
- No deposits/withdrawals/borrows/repayments/claims — detection only.
- No invented positions, USD values, or APY.
- Phantom-on-Ledger must keep working (no on-device approval for reads).

## What Kamino positions look like

Kamino exposes several position types that a read-only client would surface:

- **Lending (K-Lend) obligations** — supplied collateral, borrowed amounts, and
  the resulting positions for a wallet.
- **Liquidity / vaults (kVaults, Automated Liquidity)** — vault share balances /
  strategy positions.
- **Multiply / Leverage** — derived from lending obligations.

Kamino share/receipt tokens (e.g. kTokens / vault shares) are SPL tokens, but their
**mints are strategy-specific** and there is no small fixed mapping. So token-level
detection alone is not reliable for Kamino — it needs protocol reads.

## Preferred approach (official SDK/API)

Use Kamino's official read-only SDK against the same RPC `Connection` and the
connected `publicKey`:

- **`@kamino-finance/klend-sdk`** — `KaminoMarket.load(...)` then
  `market.getObligationByWallet(owner, ...)` / `getAllUserObligations(owner)` to
  read supplied/borrowed positions (K-Lend).
- **`@kamino-finance/kliquidity-sdk`** (Kamino) — load strategies/vaults and read
  the connected wallet's share balances / positions.

All of these are **read/derive-only** calls (no instructions are sent). Map the
results into the existing `WalletPosition` model:

```
type: "protocol"
source: "kamino"
protocol: "Kamino"
detection: "protocol_api"
valueUsd: null   // until an approved pricing source exists
apy: null        // until an approved APY source exists
```

and surface them in the Portfolio "Assets Deployment" / "Yield" area (or the Live
Wallet Assets table) with Status "Detected".

## Exact next calls (implementation checklist)

1. Add `@kamino-finance/klend-sdk` (+ `kliquidity-sdk` if vaults are in scope);
   verify browser/Vite compatibility and Buffer polyfill coverage.
2. Use the app's existing `Connection` (from `ConnectionProvider`) and the
   connected `publicKey`.
3. K-Lend: load the main market and call `getAllUserObligations(owner)` (or the
   per-market obligation read); map deposits/borrows to `WalletPosition`s.
4. Vaults/liquidity: enumerate strategies and read the wallet's share positions.
5. Handle empty (no obligations), loading, and RPC/SDK errors safely; keep it
   read-only and cancel on disconnect (same pattern as `useWalletPortfolio`).
6. Only then consider approved pricing/APY sources for `valueUsd`/`apy`.

Until this is implemented, the app must **not** claim Kamino positions are
detected, and must not infer Kamino positions from unrelated token balances.
