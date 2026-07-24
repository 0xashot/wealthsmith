/**
 * swapCostMethodology — Step 23A. The CORRECT total-cost model for ExactIn comparisons over one fixed snapshot.
 *
 * The naïve `swapFee + priceImpact + slippageTolerance + networkFee` is WRONG and double-counts. Instead:
 *   1. Slippage tolerance is NOT an expected cost — it is the maximum acceptable movement before the minimum-out
 *      protection triggers. It never enters the cost.
 *   2. A provider's `expectedOutput` ALREADY reflects pool fees, provider platform fees, and route price impact.
 *      An included fee is never subtracted again after it has reduced expected output.
 *   3. Only NON-included costs (network fee, rent, any other explicit out-of-band cost) are subtracted once.
 *
 * Primary ranking value (higher is better):
 *   netOutputUsd = expectedOutputUsd − nonIncludedNetworkFeeUsd − nonIncludedRentFeeUsd − otherNonIncludedUsd
 * Equivalent display:
 *   estimatedTotalCostUsd = inputAmountUsd − netOutputUsd
 *   estimatedTotalCostPct = estimatedTotalCostUsd / inputAmountUsd × 100
 *
 * Full precision is preserved for ranking; rounding happens only at display. Every candidate in a comparison MUST
 * use the same USD price snapshot, the same input amount, and the same slippage setting (enforced by the caller).
 */
import type { SwapQuoteCandidate } from "./swapQuoteContracts";

export const SWAP_COST_METHODOLOGY_VERSION = "swap_cost_methodology_1.0.0" as const;

export interface SwapCostBreakdown {
  /** Primary ranking value — full precision. Null when USD output is unavailable. */
  netOutputUsd: number | null;
  estimatedTotalCostUsd: number | null;
  estimatedTotalCostPct: number | null;
  /** The fees that were ALREADY reflected in expectedOutput (disclosed, never re-subtracted). */
  includedFeeUsd: number;
  /** The fees subtracted ONCE to get net output (network + rent + other out-of-band). */
  nonIncludedFeeUsd: number;
  /** True when cost % could not be computed (missing USD input or output). */
  costUnresolved: boolean;
}

const n = (v: number | null | undefined): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/**
 * Compute the normalized cost breakdown for one candidate. `inputAmountUsd` is the shared-snapshot USD value of
 * the exact input; when it or `expectedOutputUsd` is missing, cost becomes `unresolved` (never invented).
 */
export function computeSwapCostBreakdown(candidate: SwapQuoteCandidate, inputAmountUsd: number | null): SwapCostBreakdown {
  // Fees already reflected in expectedOutput — disclosed for transparency, NEVER re-subtracted.
  const includedFeeUsd = n(candidate.includedSwapFeeUsd) + n(candidate.explicitPlatformFeeUsd);
  // Out-of-band costs — subtracted exactly once.
  const nonIncludedFeeUsd = n(candidate.estimatedNetworkFeeUsd) + n(candidate.estimatedRentFeeUsd);

  const outputUsd = candidate.expectedOutputUsd;
  if (outputUsd == null || !Number.isFinite(outputUsd) || inputAmountUsd == null || !Number.isFinite(inputAmountUsd) || inputAmountUsd <= 0) {
    return { netOutputUsd: null, estimatedTotalCostUsd: null, estimatedTotalCostPct: null, includedFeeUsd, nonIncludedFeeUsd, costUnresolved: true };
  }

  const netOutputUsd = outputUsd - nonIncludedFeeUsd; // included fees are NOT re-applied
  const estimatedTotalCostUsd = inputAmountUsd - netOutputUsd;
  const estimatedTotalCostPct = (estimatedTotalCostUsd / inputAmountUsd) * 100;
  return { netOutputUsd, estimatedTotalCostUsd, estimatedTotalCostPct, includedFeeUsd, nonIncludedFeeUsd, costUnresolved: false };
}

/**
 * USD-free ranking is permitted ONLY when every candidate shares the exact same output mint AND decimals — then
 * the largest `expectedOutputRaw` is unambiguously the best. Otherwise raw outputs are not comparable and the
 * comparison must remain USD-driven (or unresolved).
 */
export function candidatesShareOutputUnit(candidates: readonly SwapQuoteCandidate[], outputDecimals: number): boolean {
  if (candidates.length === 0) return false;
  const mint = candidates[0].outputMint;
  return candidates.every((c) => c.outputMint === mint) && Number.isInteger(outputDecimals);
}

/** Compare two raw base-unit strings as BigInt (returns -1/0/1). Used for USD-free fallback ranking only. */
export function compareRaw(a: string, b: string): number {
  const av = BigInt(a);
  const bv = BigInt(b);
  return av < bv ? -1 : av > bv ? 1 : 0;
}
