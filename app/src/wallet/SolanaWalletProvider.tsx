/**
 * SolanaWalletProvider — wraps the app in the Solana wallet-adapter context so the
 * WealthSmith prototype can connect to REAL wallets (Phantom, Solflare, Backpack,
 * and Phantom accounts backed by Ledger) for local testing.
 *
 * READ-ONLY CONNECTION ONLY (patterns/wallet-connection.md, rules/wallet-and-custody-rules.md):
 *  - No balance/token fetching, no portfolio scanning, no transactions.
 *  - No message signing and no signature request on connect (`autoConnect` is off;
 *    connection uses the wallet's connect() and the returned publicKey only).
 *  - Ledger-backed Phantom accounts are supported for read-only connection because
 *    WealthSmith does not request a signature during wallet connection — connecting
 *    through Phantom never calls signMessage / signTransaction / sendTransaction.
 *
 * Phantom and Solflare are configured via their official adapters; Backpack (and
 * Phantom/Solflare too) are also detected via the Wallet Standard, which the
 * WalletProvider auto-registers. The RPC endpoint is used for read-only balance /
 * token reads (see useWalletPortfolio) — never for transactions or signing.
 *
 * RPC endpoint (read-only): set `VITE_SOLANA_RPC_URL` (e.g. in `app/.env.local`)
 * to a dedicated endpoint. If unset, it falls back to a CORS-enabled public node
 * (`https://solana-rpc.publicnode.com`).
 *
 * IMPORTANT — why the default matters: the official `api.mainnet-beta.solana.com`
 * endpoint blocks browser requests (CORS/403), so from a web app EVERY read
 * (including `getBalance`) fails against it — that is why the wallet "couldn't be
 * read". The public-node default is CORS-enabled and reads native SOL reliably.
 * However, `getParsedTokenAccountsByOwner` is an expensive indexed method that
 * keyless public RPCs generally do NOT serve, so SPL/Token-2022 token reads may
 * still fail on the default — set `VITE_SOLANA_RPC_URL` to a dedicated RPC
 * (Helius / QuickNode / Alchemy / Triton, etc.) to read token balances too.
 * Env config is optional; local dev works without it. Never hardcode a private
 * key or a secret-bearing/paid URL in source.
 */
import { useMemo, type ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";

/**
 * CORS-enabled public node — the safe no-config default. Reads native SOL
 * reliably from the browser; token-account reads may need a dedicated RPC (see
 * VITE_SOLANA_RPC_URL). This is NOT api.mainnet-beta.solana.com, which rejects
 * browser requests and made every read fail.
 */
export const DEFAULT_PUBLIC_RPC = "https://solana-rpc.publicnode.com";

export default function SolanaWalletProvider({ children }: { children: ReactNode }) {
  // Read-only balance/token reads use this endpoint. Prefer a configured
  // dedicated RPC; otherwise use the CORS-enabled public node default.
  const endpoint = useMemo(() => {
    const configured =
      typeof import.meta.env.VITE_SOLANA_RPC_URL === "string"
        ? import.meta.env.VITE_SOLANA_RPC_URL.trim()
        : "";
    return configured.length > 0 ? configured : DEFAULT_PUBLIC_RPC;
  }, []);

  // Phantom + Solflare via official adapters. Backpack is Wallet-Standard-only
  // (no dedicated adapter export) and is auto-detected by the provider.
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      {/* autoConnect is intentionally OFF: connection is explicit and never
          triggers a signature. */}
      <WalletProvider wallets={wallets} autoConnect={false}>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
