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
import { computeSwapCostBreakdown } from "./swapCostMethodology";

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const WSOL = "So11111111111111111111111111111111111111112";

/* Fixed DEMO economics. These are the fixture's only invented inputs; every
 * displayed figure below is DERIVED from them plus the real action, so the modal
 * can never show a cost that contradicts the amount above it. (It previously
 * hardcoded `$0.03 · 0.09%` — values authored for a ~$15 swap — which then
 * appeared unchanged under a $605 suggestion, and were not even consistent with
 * each other at the original size.) */
const DEMO_POOL_FEE_PCT = 0.05;      // reflected in expectedOutput, like a real AMM fee
const DEMO_PRICE_IMPACT_PCT = 0.02;  // also already reflected in expectedOutput
const DEMO_NETWORK_FEE_USD = 0.01;   // out-of-band, subtracted once
const DEMO_SLIPPAGE_PCT = 0.5;       // minimum-out protection, never a cost
/** Demo SOL price. Matches the /testing rebalance fixtures' SOL_PRICE so the route's
 *  output tokens agree with the Send/Receive figures above them in the modal. */
const DEMO_SOL_PRICE_USD = 250;

/** USD per whole token for the demo pair. Null for anything else (fails closed). */
function demoPriceUsd(mint: string): number | null {
  if (mint === USDC) return 1;
  if (mint === WSOL) return DEMO_SOL_PRICE_USD;
  return null;
}

/** Whole-token decimal string from a raw integer amount, at the asset's decimals. */
function tokensFromRaw(raw: string, decimals: number): string {
  try {
    const v = BigInt(raw);
    const scale = 10n ** BigInt(decimals);
    const whole = v / scale;
    const frac = (v % scale).toString().padStart(decimals, "0").replace(/0+$/, "");
    return frac ? `${whole}.${frac}` : `${whole}`;
  } catch {
    return "0";
  }
}

function demoAssessment(action: SwapActionContext, nowMs: number): SwapQuoteComparisonAssessment | null {
  const quotedAt = new Date(nowMs - 8_000).toISOString();
  const expiresAt = new Date(nowMs + 40_000).toISOString();

  // Everything scales off the ACTION's own USD notional. Without it the demo
  // cannot state a consistent cost, so it fails closed rather than inventing one.
  const inputUsd = action.inputAmountUsd;
  if (inputUsd == null || !Number.isFinite(inputUsd) || inputUsd <= 0) return null;

  // expectedOutput already reflects the pool fee + price impact (methodology §2).
  const outUsd = inputUsd * (1 - (DEMO_POOL_FEE_PCT + DEMO_PRICE_IMPACT_PCT) / 100);
  const outDecimals = action.outputAsset.decimals;
  // Token amount = USD ÷ the output asset's own price. Deriving it from the input
  // token count instead would silently assume both sides cost the same per token.
  const outPrice = demoPriceUsd(action.outputAsset.mint);
  if (outPrice == null || outPrice <= 0) return null;
  const impliedOutTokens = outUsd / outPrice;
  const scale = 10 ** outDecimals;
  const expectedOutputRaw = BigInt(Math.max(0, Math.round(impliedOutTokens * scale))).toString();
  const minimumOutputRaw = BigInt(Math.max(0, Math.round(impliedOutTokens * (1 - DEMO_SLIPPAGE_PCT / 100) * scale))).toString();

  const c = (providerId: "jupiter" | "raydium" | "orca", venues: string[], eligible: boolean): SwapQuoteCandidate => ({
    providerId, providerName: SWAP_PROVIDER_NAME[providerId],
    executionSurface: providerId, underlyingVenues: venues, inputMint: action.inputAsset.mint, outputMint: action.outputAsset.mint,
    inputAmountRaw: action.inputAmountRaw, expectedOutputRaw, minimumOutputRaw,
    expectedOutputTokens: tokensFromRaw(expectedOutputRaw, outDecimals), expectedOutputUsd: outUsd, quotedAt, expiresAt, quoteLatencyMs: 210,
    priceImpactPct: DEMO_PRICE_IMPACT_PCT, includedSwapFeeUsd: (inputUsd * DEMO_POOL_FEE_PCT) / 100, explicitPlatformFeeUsd: null,
    estimatedNetworkFeeUsd: DEMO_NETWORK_FEE_USD, estimatedRentFeeUsd: 0,
    liquidityAssessment: { status: "verified" as const, minimumRouteLegLiquidityUsd: 331_000, legs: [] }, freshness: "fresh" as const, eligible, exclusionReasons: [] as never[],
  });

  // JUPITER WINS the demo comparison, and that is not cosmetic: `in_app_confirm` is assigned
  // to Jupiter alone, so a demo that selected anyone else could never reach the confirm step —
  // the Boundary would correctly refuse it and the demo would stop at the hand-off, hiding the
  // part of the product a demo most needs to show. Raydium and Orca still appear as real
  // compared candidates, so the comparison story is unchanged.
  const selected = c("jupiter", ["Raydium CLMM"], true);
  // The SAME production methodology the live path uses — the fixture states no
  // cost of its own, so the displayed $ and % are consistent by construction.
  const cost = computeSwapCostBreakdown(selected, inputUsd);

  return {
    status: "selected", actionId: action.actionId, legId: action.legId, pairClass: "major", comparedAt: quotedAt, expiresAt,
    selectedProviderId: "jupiter", selectionBasis: "lowest_estimated_total_cost", decidedBy: "net_output",
    candidates: [selected, c("raydium", ["Raydium CLMM"], true), c("orca", ["Orca Whirlpool"], true)],
    comparedProviders: ["jupiter", "raydium", "orca"], unavailableProviders: [],
    estimatedTotalCostUsd: cost.estimatedTotalCostUsd, estimatedTotalCostPct: cost.estimatedTotalCostPct,
    expectedOutputTokens: selected.expectedOutputTokens, minimumOutputTokens: tokensFromRaw(minimumOutputRaw, outDecimals),
    economicallyEquivalent: false, warnings: [], blockingReasons: [], methodologyVersion: "swap_quote_methodology_1.0.0",
  };
}

/** Deterministic Demo fetcher — offline, sanitized, validated. Never calls a provider or the WealthSmith service. */
export const demoSwapQuoteFetcher: SwapQuoteFetcher = async (action): Promise<SwapQuoteClientResult> => {
  // Only produce a route for the SOL/USDC major pair (the only demo-relevant pair); otherwise fail closed.
  const pair = [action.inputAsset.mint, action.outputAsset.mint];
  if (!(pair.includes(USDC) && pair.includes(WSOL))) return { ok: false, error: "unavailable" };
  const built = demoAssessment(action, Date.now());
  if (!built) return { ok: false, error: "unavailable" };
  const assessment = validateSanitizedAssessment(built);
  return assessment ? { ok: true, assessment } : { ok: false, error: "invalid_response" };
};
