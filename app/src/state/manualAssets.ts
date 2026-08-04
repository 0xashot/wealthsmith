/**
 * manualAssets — the addable non-Solana assets (BTC / ETH) for the Portfolio
 * External Holdings section, plus the pure validator for a manually entered
 * amount.
 *
 * Pure data + validation only: no React, no assets, no side effects — so the
 * rules are unit-testable by the fixture suite. Amounts here are MANUALLY STATED
 * by the user; nothing is read from a chain, so nothing in this module implies a
 * verified balance, and none of it feeds portfolio totals or the Suggestion Engine.
 */
import {
  EXT_ADD_BTC_TITLE,
  EXT_ADD_ETH_TITLE,
  EXT_MANAGE_BTC_TITLE,
  EXT_MANAGE_ETH_TITLE,
  EXT_BTC_AMOUNT_LABEL,
  EXT_ETH_AMOUNT_LABEL,
  extDecimalsError,
  GOAL_ERR_REQUIRED_AMOUNT,
  GOAL_ERR_INVALID_AMOUNT,
  GOAL_ERR_POSITIVE_AMOUNT,
} from "./approvedCopy";

/**
 * Per-chain modal copy, that chain's own decimal precision, and its canonical
 * block explorer.
 *
 * `explorer` is the single source for BOTH the External Holdings table and the
 * Liquid Assets row link. It must be each asset's OWN chain explorer — the
 * Solana rows link to Solscan by mint, which would be meaningless for native
 * BTC/ETH held outside the connected wallet.
 */
export const MANUAL_ASSET_CHAINS = {
  btc: { title: EXT_ADD_BTC_TITLE, manageTitle: EXT_MANAGE_BTC_TITLE, label: EXT_BTC_AMOUNT_LABEL, symbol: "BTC", name: "Bitcoin", decimals: 8, explorer: "https://mempool.space" },
  eth: { title: EXT_ADD_ETH_TITLE, manageTitle: EXT_MANAGE_ETH_TITLE, label: EXT_ETH_AMOUNT_LABEL, symbol: "ETH", name: "Ethereum", decimals: 18, explorer: "https://etherscan.io" },
} as const;

export type ManualAssetChain = keyof typeof MANUAL_ASSET_CHAINS;

/** Decimal places in a raw amount string (0 when there is no fractional part). */
function decimalPlaces(raw: string): number {
  const dot = raw.indexOf(".");
  return dot < 0 ? 0 : raw.length - dot - 1;
}

/**
 * Validate a manually entered token amount. Returns the approved error message,
 * or undefined when the amount is usable. Fails closed on anything unparseable:
 * blank, non-numeric (including exponent/sign forms), non-positive, or more
 * decimal places than the chain supports.
 *
 * `allowZero` is set when MANAGING an already-added asset: 0 is a valid entry
 * there and means "I no longer hold this", which clears the holding. Adding a
 * brand-new asset still requires a positive amount.
 */
export function manualAmountError(
  raw: string,
  decimals: number,
  chainName: string,
  allowZero = false
): string | undefined {
  const trimmed = raw.trim().replace(/[,\s]/g, "");
  if (trimmed === "") return GOAL_ERR_REQUIRED_AMOUNT;
  // A plain decimal number only — no exponents, signs, or stray characters.
  if (!/^\d*\.?\d*$/.test(trimmed) || trimmed === ".") return GOAL_ERR_INVALID_AMOUNT;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return GOAL_ERR_INVALID_AMOUNT;
  if (n < 0 || (n === 0 && !allowZero)) return GOAL_ERR_POSITIVE_AMOUNT;
  if (decimalPlaces(trimmed) > decimals) return extDecimalsError(chainName, decimals);
  return undefined;
}

/** True when a validated amount means "clear this holding" (managing → 0). */
export function isClearingAmount(raw: string): boolean {
  return Number(raw.trim().replace(/[,\s]/g, "")) === 0;
}

/** Strip display separators from a validated amount before storing it. */
export function normalizeManualAmount(raw: string): string {
  return raw.trim().replace(/[,\s]/g, "");
}
