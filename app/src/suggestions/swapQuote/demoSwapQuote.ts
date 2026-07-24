/**
 * demoSwapQuote — Step 23C.1. DETERMINISTIC, sanitized quote behavior for Demo. Demo must NEVER depend on live
 * providers, price APIs, pool-liquidity APIs, or network access. This fetcher returns a fixed sanitized
 * `SwapQuoteComparisonAssessment` (economics-first, Raydium selected) built fresh relative to `Date.now()` so
 * freshness/expiry read correctly, and validated through the SAME production client validator the real path uses.
 *
 * Note: the current Demo scenarios (Safety Buffer / SOL staking / Stable Yield) contain NO swap-requiring
 * suggestion, so no route section renders in Demo today. This fetcher is the governance guarantee that IF a demo
 * card ever carries a swap action, the comparison stays deterministic and offline. `/testing` provides the
 * deterministic Rebalance/Trim/DCA route-state coverage with the production components.
 */
import type { SwapActionContext, SwapQuoteComparisonAssessment, SwapQuoteCandidate } from "./swapQuoteContracts";
import { SWAP_PROVIDER_NAME } from "./swapQuoteContracts";
import type { SwapQuoteFetcher, SwapQuoteClientResult } from "./swapQuoteClient";
import { validateSanitizedAssessment } from "./swapQuoteClient";

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const WSOL = "So11111111111111111111111111111111111111112";

function demoAssessment(action: SwapActionContext, nowMs: number): SwapQuoteComparisonAssessment {
  const quotedAt = new Date(nowMs - 8_000).toISOString();
  const expiresAt = new Date(nowMs + 40_000).toISOString();
  const c = (providerId: "jupiter" | "raydium" | "orca", venues: string[], eligible: boolean): SwapQuoteCandidate => ({
    providerId, providerName: SWAP_PROVIDER_NAME[providerId],
    executionSurface: providerId, underlyingVenues: venues, inputMint: action.inputAsset.mint, outputMint: action.outputAsset.mint,
    inputAmountRaw: action.inputAmountRaw, expectedOutputRaw: "197901045", minimumOutputRaw: "196911540",
    expectedOutputTokens: "0.197901", expectedOutputUsd: 14.98, quotedAt, expiresAt, quoteLatencyMs: 210,
    priceImpactPct: 0.02, includedSwapFeeUsd: null, explicitPlatformFeeUsd: null, estimatedNetworkFeeUsd: 0.01, estimatedRentFeeUsd: 0,
    liquidityAssessment: { status: "verified" as const, minimumRouteLegLiquidityUsd: 331_000, legs: [] }, freshness: "fresh" as const, eligible, exclusionReasons: [] as never[],
  });
  return {
    status: "selected", actionId: action.actionId, legId: action.legId, pairClass: "major", comparedAt: quotedAt, expiresAt,
    selectedProviderId: "raydium", selectionBasis: "lowest_estimated_total_cost",
    candidates: [c("raydium", ["Raydium CLMM"], true), c("jupiter", ["Orca Whirlpool"], true), c("orca", ["Orca Whirlpool"], true)],
    comparedProviders: ["jupiter", "raydium", "orca"], unavailableProviders: [],
    estimatedTotalCostUsd: 0.03, estimatedTotalCostPct: 0.09, expectedOutputTokens: "0.197901", minimumOutputTokens: "0.196911",
    economicallyEquivalent: false, warnings: [], blockingReasons: [], methodologyVersion: "swap_quote_methodology_1.0.0",
  };
}

/** Deterministic Demo fetcher — offline, sanitized, validated. Never calls a provider or the WealthSmith service. */
export const demoSwapQuoteFetcher: SwapQuoteFetcher = async (action): Promise<SwapQuoteClientResult> => {
  // Only produce a route for the SOL/USDC major pair (the only demo-relevant pair); otherwise fail closed.
  const pair = [action.inputAsset.mint, action.outputAsset.mint];
  if (!(pair.includes(USDC) && pair.includes(WSOL))) return { ok: false, error: "unavailable" };
  const assessment = validateSanitizedAssessment(demoAssessment(action, Date.now()));
  return assessment ? { ok: true, assessment } : { ok: false, error: "invalid_response" };
};
