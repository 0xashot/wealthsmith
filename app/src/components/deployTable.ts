/**
 * deployTable — shared formatting/link helpers for the Asset Deployment Overview
 * table cards (Liquid Assets / Staked Assets / Yield Strategies). No values are
 * computed here beyond display formatting of SOURCED numbers.
 */
import type { WalletPosition } from "../wallet/walletPosition";

/**
 * Solscan's native-SOL token page id (all 1s). Distinct from the wrapped-SOL
 * mint (…112): native SOL and native stake are NOT wSOL holdings, so their
 * explorer link goes to the native SOL page.
 */
const NATIVE_SOL_ID = "So11111111111111111111111111111111111111111";

/** Whole-dollar USD, e.g. "$22,800". */
export const usd0 = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/** On-chain amount + symbol, rounded for display, e.g. "0.11 SOL", "15,224.51 USDC". */
export function formatAmount(p: WalletPosition): string {
  const amount =
    p.uiAmount != null
      ? p.uiAmount.toLocaleString("en-US", { maximumFractionDigits: 2 })
      : p.amount;
  return `${amount} ${p.symbol}`;
}

/**
 * Whole-token amount + symbol, e.g. "30 SOL", "15,255 USDC" — the fractional part
 * is dropped (truncated, so the figure never rounds up past the real balance).
 * Used for the simplified mobile earning tables; the precise amount stays on
 * desktop and via the asset's explorer link.
 */
export function formatAmountWhole(p: WalletPosition): string {
  const amount =
    p.uiAmount != null ? Math.trunc(p.uiAmount).toLocaleString("en-US") : p.amount;
  return `${amount} ${p.symbol}`;
}

/**
 * Block-explorer page for the row. A position that carries its own explorer wins
 * (a manually added BTC/ETH holding lives on its own chain, not Solana);
 * otherwise Solscan by mint (native SOL / native stake → the native SOL page).
 */
export function explorerUrl(p: WalletPosition): string | undefined {
  if (p.explorerUrl) return p.explorerUrl;
  const mint = p.type === "native" || p.type === "stake" ? NATIVE_SOL_ID : p.mint;
  return mint ? `https://solscan.io/token/${mint}` : undefined;
}

/**
 * Official protocol app pages for the review-only Manage handoff (patterns/
 * portfolio-overview.md — Manage Link Behavior). Static, approved destinations
 * only; a protocol not listed here gets NO Manage link (never invented).
 */
export const PROTOCOL_MANAGE_URLS: Record<string, string> = {
  Marinade: "https://app.marinade.finance",
  Jito: "https://www.jito.network/staking/",
  BlazeStake: "https://stake.solblaze.org",
  Jupiter: "https://jup.ag",
  Sanctum: "https://app.sanctum.so",
  Kamino: "https://app.kamino.finance",
};

/**
 * Review-only Manage destination for a position: an explicit sourced URL on the
 * position wins (e.g. native stake → its validator's explorer page); otherwise
 * the approved protocol app page; otherwise none (button hidden, not invented).
 */
export function manageUrlFor(p: WalletPosition): string | undefined {
  if (p.manageUrl) return p.manageUrl;
  const key = Object.keys(PROTOCOL_MANAGE_URLS).find(
    (name) => p.protocol === name || p.source === name.toLowerCase()
  );
  return key ? PROTOCOL_MANAGE_URLS[key] : undefined;
}
