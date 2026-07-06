/**
 * walletSummary — derives ONLY safe, non-financial facts from the read-only
 * WalletPosition[] returned by useWalletPortfolio, for the real connected-wallet
 * Dashboard summary.
 *
 * These are counts and on-chain balances that come straight from wallet reads.
 * Per rules/financial-logic-boundaries.md this derives NO USD portfolio value, NO
 * allocation percentages, NO projected growth, NO Safety Buffer, and NO
 * suggestions — those require pricing/product logic that does not exist yet, so
 * the UI shows safe "unavailable" states instead of fixture values.
 */
import type { WalletPosition } from "./walletPosition";

export interface WalletSummary {
  /** Total detected positions (native SOL + non-zero token accounts). */
  assetsDetected: number;
  /** Native SOL uiAmount, or null if not read. */
  nativeSol: number | null;
  /** Count of plain SPL tokens (non-native, non-LST). */
  tokenCount: number;
  /** Count of recognized LST / staked tokens. */
  lstCount: number;
  /** Recognized underlying protocols (LSTs / Jupiter / Kamino), de-duplicated. */
  protocols: string[];
}

export function deriveWalletSummary(positions: WalletPosition[]): WalletSummary {
  const native = positions.find((p) => p.type === "native");
  const tokenCount = positions.filter((p) => p.type === "token").length;
  const lstCount = positions.filter((p) => p.type === "lst").length;

  const protocols: string[] = [];
  const add = (name: string) => {
    if (!protocols.includes(name)) protocols.push(name);
  };
  for (const p of positions) {
    // Native stake shows once as "Native staking" rather than per-validator.
    if (p.type === "stake") add("Native staking");
    else if (p.protocol) add(p.protocol);
  }

  return {
    assetsDetected: positions.length,
    nativeSol: native?.uiAmount ?? null,
    tokenCount,
    lstCount,
    protocols,
  };
}
