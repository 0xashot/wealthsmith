/**
 * swapAmountMath — Step 23A. Integer-safe raw⇄token⇄USD helpers. Provider REQUEST amounts must be exact raw
 * base units with NO floating-point authority, so all raw math is BigInt. USD is derived only at the presentation
 * boundary (never fed back into a request). These are the only sanctioned conversions in the quote layer.
 */

/** True when `s` is a non-negative base-10 integer string (safe for BigInt raw amounts). */
export function isRawIntegerString(s: string): boolean {
  return typeof s === "string" && /^[0-9]+$/.test(s) && s.length > 0;
}

/**
 * Convert an exact whole-token DECIMAL string to raw base units (integer-safe, no float). Rejects anything with
 * more fractional digits than `decimals`, negative values, or malformed input — returns null (never rounds).
 */
export function tokensToRaw(tokens: string, decimals: number): string | null {
  if (typeof tokens !== "string" || !Number.isInteger(decimals) || decimals < 0 || decimals > 36) return null;
  if (!/^[0-9]+(\.[0-9]+)?$/.test(tokens)) return null;
  const [whole, frac = ""] = tokens.split(".");
  if (frac.length > decimals) return null; // would require rounding — refuse
  const padded = frac.padEnd(decimals, "0");
  const raw = `${whole}${padded}`.replace(/^0+(?=\d)/, "");
  try {
    return BigInt(raw).toString();
  } catch {
    return null;
  }
}

/** Convert raw base units to a whole-token decimal string (exact, trailing zeros trimmed). Null on bad input. */
export function rawToTokens(raw: string, decimals: number): string | null {
  if (!isRawIntegerString(raw) || !Number.isInteger(decimals) || decimals < 0 || decimals > 36) return null;
  const v = BigInt(raw);
  if (decimals === 0) return v.toString();
  const s = v.toString().padStart(decimals + 1, "0");
  const whole = s.slice(0, s.length - decimals);
  const frac = s.slice(s.length - decimals).replace(/0+$/, "");
  return frac.length > 0 ? `${whole}.${frac}` : whole;
}

/**
 * Convert an exact USD amount to raw base units using a fresh unit price, integer-safe. Used to derive the exact
 * `inputAmountRaw` for a USD-denominated action (e.g. Rebalance/DCA USDC source). Requires a positive fresh price
 * and non-negative USD; returns null otherwise (caller then marks the leg not_ready_for_quote). The intermediate
 * token amount is computed in float ONLY to locate the base-unit magnitude, then FLOORED to an exact integer —
 * the request amount itself never carries float precision.
 */
export function usdToRaw(amountUsd: number, unitPriceUsd: number, decimals: number): string | null {
  if (!Number.isFinite(amountUsd) || amountUsd < 0) return null;
  if (!Number.isFinite(unitPriceUsd) || unitPriceUsd <= 0) return null;
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) return null;
  const tokens = amountUsd / unitPriceUsd;
  if (!Number.isFinite(tokens)) return null;
  // Scale to base units and FLOOR to an exact integer (conservative — never quote more than is available).
  const scaled = Math.floor(tokens * Math.pow(10, decimals));
  if (!Number.isSafeInteger(scaled)) {
    // Fall back to string scaling for large magnitudes, still floored (no rounding up).
    const fixed = tokens.toFixed(decimals);
    return tokensToRaw(fixed, decimals);
  }
  return BigInt(scaled).toString();
}

/** Multiply raw base units by a USD unit price into a USD number (presentation only; never fed to a request). */
export function rawToUsd(raw: string, decimals: number, unitPriceUsd: number | null): number | null {
  if (unitPriceUsd == null || !Number.isFinite(unitPriceUsd) || unitPriceUsd < 0) return null;
  const tokens = rawToTokens(raw, decimals);
  if (tokens == null) return null;
  const n = Number(tokens);
  if (!Number.isFinite(n)) return null;
  return n * unitPriceUsd;
}
