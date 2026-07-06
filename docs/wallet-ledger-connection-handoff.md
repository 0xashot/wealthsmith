# Wallet / Ledger Connection Handoff

Status: **current.** This documents how a real wallet connects (including Ledger)
and how the app renders data once connected, so the read-only, non-custodial
contract is preserved and fixture data is never shown as real wallet data.

## Connection (read-only, no signature)

- Connection uses wallet-adapter `connect()` and the returned `publicKey` only.
- **No** `signMessage` / `signTransaction` / `signAllTransactions` / `sendTransaction`
  at connect or for any read. Proof-of-ownership signing is out of scope for MVP.
- Because connecting requires no on-device approval, **Phantom-on-Ledger connects
  and reads with no Ledger prompt**. Do not add a signature step to the connect or
  portfolio-read flow — it would break Ledger.
- See `app/src/components/ConnectWalletModal.tsx`,
  `app/src/wallet/SolanaWalletProvider.tsx`, and
  `rules/wallet-and-custody-rules.md` (Read-Only MVP Rule, Ledger and Hardware
  Wallet Rules).

## After connection — data mode separation

Once a real wallet is connected the app is in **real_wallet** mode and must show
live read-only data + safe unavailable states, never fixtures. The three modes:

- `demo_fixture` — Demo Mode sample fixtures + suggestions (Demo banner visible).
- `real_wallet` — live read-only wallet reads; safe "unavailable" states for
  anything needing pricing/product logic (USD value, APY, allocation, suggestions).
- `example_fixture` — the connected-wallet reference fixture
  (`examples/dashboard/dashboard-connected-wallet-state.json`) for dev/tests only.

See `app/src/state/portfolioDataSource.ts` and `patterns/wallet-connection.md`
(Data Mode Separation).

## RPC endpoint (why reads fail, and how to fix)

- The official `https://api.mainnet-beta.solana.com` **blocks browser requests**
  (CORS/403), so from a web app **every** read fails against it — including
  `getBalance`. Do not use it as the browser default.
- Default is a **CORS-enabled public node** (`https://solana-rpc.publicnode.com`)
  that reads native SOL reliably from the browser.
- `getParsedTokenAccountsByOwner` (SPL / Token-2022) is an expensive indexed method
  that keyless public RPCs generally do not serve, so token reads may still fail on
  the default and show a partial-read warning (SOL still shows). Set
  **`VITE_SOLANA_RPC_URL`** (`app/.env.local`) to a dedicated RPC (Helius /
  QuickNode / Alchemy / Triton) to read token balances. Never commit a key.
- See `app/src/wallet/SolanaWalletProvider.tsx` and `app/.env.example`.

## Read-only reads used after connect

- `getBalance(publicKey)` → native SOL.
- `getParsedTokenAccountsByOwner(publicKey, { programId })` → SPL + Token-2022.
- The three reads run **independently** (`Promise.allSettled`), so a failing token
  read never hides a successful SOL read — see `app/src/wallet/useWalletPortfolio.ts`.
- Recognized LST mints (JupSOL, mSOL, bSOL, JitoSOL) classified via the approved
  registry; unknown mints shown as generic tokens. No USD/APY invented.
- Protocol positions (Kamino, native Jupiter stake) require protocol reads and are
  deferred — see [`docs/kamino-position-detection-plan.md`](kamino-position-detection-plan.md).

## Disconnect

- Clears live wallet state and cancels any in-flight read; returns to the
  disconnected onboarding surface. No copy implies funds moved; saved goal
  settings persist.
