/**
 * swapQuoteFixtures — Step 23A. Deterministic fixtures proving the Live Swap-Quote Comparison architecture:
 * contracts, cost methodology (no double-count, slippage-not-cost), normalization, eligibility boundaries,
 * ranking, liquidity, DCA/Rebalance/Trim readiness, and the read-only / no-transaction security guarantees.
 * Pure — no live provider call. Registered into `printFixtureResults()` in suggestionEngine.fixtures.ts.
 */
import type {
  SwapQuoteCandidate,
  SwapAsset,
  SwapRouteLiquidityAssessment,
} from "./swapQuoteContracts";
import { classifySwapPair } from "./swapPairRegistry";
import { DEFAULT_SWAP_QUOTE_POLICY, SWAP_COST_THRESHOLDS, SWAP_QUOTE_OPERATIONAL_POLICY } from "./swapQuotePolicy";
import { computeSwapCostBreakdown } from "./swapCostMethodology";
import { evaluateCandidateEligibility } from "./swapQuoteEligibility";
import { rankEligibleCandidates } from "./swapQuoteRanking";
import { assessRouteLiquidity } from "./swapLiquidity";
import { compareSwapQuotes, summarizeSwapPlan } from "./swapQuoteComparison";
import { buildRebalanceSwapAction, buildTrimSwapAction, buildDcaSwapAction, SWAP_USDC, SWAP_WSOL, NATIVE_SOL_QUOTE_ASSET } from "./swapActionContext";
import { normalizeJupiterQuote, normalizeRaydiumQuote, normalizeOrcaQuote } from "./swapQuoteNormalization";
import { scanForTransactionFields } from "./swapQuoteSecurityGuard";
import { usdToRaw, tokensToRaw, rawToTokens } from "./swapAmountMath";
import { SWAP_PROVIDER_PRIORITY_ORDER } from "./swapQuotePolicy";
import type { WalletPosition } from "../../wallet/walletPosition";
import { deriveNativeSolRebalanceSource, REBALANCE_NATIVE_SOL_RESERVE_POLICY } from "../rebalanceAssessment";
import { readFileSync } from "node:fs";
import type { SwapQuoteComparisonAssessment, SwapComparisonStatus } from "./swapQuoteContracts";
import { presentSwapQuote, notReadyView, notRequiredView, unavailableView, EXCLUSION_REASON_COPY, LOADING_VIEW } from "./quotePresentation";
import { validateSanitizedAssessment, swapQuoteRequestKey } from "./swapQuoteClient";
import { deriveRailSwapActions } from "./railSwapActions";
import { CARD_TYPE, CARD_CATEGORY } from "../toSuggestionCard";
import type { SuggestionCategory } from "../engineTypes";
import type { SuggestionCardState } from "../../types/dashboard";
import { buildProviderSwapUrl, buildSwapHandoff } from "./providerSwapLinks";

export interface SwapFixtureCheck { name: string; pass: boolean; detail: string; }

const USDC = SWAP_USDC.mint;
const WSOL = SWAP_WSOL.mint;
const COMPARED_AT = Date.parse("2026-07-24T00:00:00.000Z");
const QUOTED_AT = "2026-07-24T00:00:00.000Z";

const verifiedLiquidity = (min = 250_000): SwapRouteLiquidityAssessment => ({
  status: "verified",
  minimumRouteLegLiquidityUsd: min,
  legs: [{ poolId: "PoolA", venue: "Orca Whirlpool", liquidityUsd: min, liquidityObservedAt: QUOTED_AT, legKind: "clmm_pool" }],
});

/** A normalized, otherwise-eligible USDC→SOL candidate; override any field for a specific case. */
function cand(over: Partial<SwapQuoteCandidate> = {}): SwapQuoteCandidate {
  return {
    providerId: "jupiter",
    providerName: "Jupiter",
    executionSurface: "jupiter",
    underlyingVenues: ["Orca Whirlpool"],
    inputMint: USDC,
    outputMint: WSOL,
    inputAmountRaw: "1000000000", // 1000 USDC
    expectedOutputRaw: "6000000000", // 6 SOL
    minimumOutputRaw: "5970000000",
    expectedOutputTokens: "6",
    expectedOutputUsd: 997.01, // → net 997.00, cost 3.00, pct 0.30 with input $1000
    quotedAt: QUOTED_AT,
    expiresAt: null,
    quoteLatencyMs: 120,
    priceImpactPct: 0.1,
    includedSwapFeeUsd: null,
    explicitPlatformFeeUsd: null,
    estimatedNetworkFeeUsd: 0.01,
    estimatedRentFeeUsd: 0,
    liquidityAssessment: verifiedLiquidity(),
    freshness: "fresh",
    eligible: false,
    exclusionReasons: [],
    ...over,
  };
}

const INPUT_USDC: SwapAsset = { symbol: "USDC", mint: USDC, decimals: 6 };
const OUTPUT_SOL: SwapAsset = { symbol: "SOL", mint: WSOL, decimals: 9 };

function elig(c: SwapQuoteCandidate, pairClass: "major" | "minor" | "unresolved" = "major", inputUsd: number | null = 1000) {
  return evaluateCandidateEligibility({
    candidate: c,
    inputAsset: INPUT_USDC,
    outputAsset: OUTPUT_SOL,
    requestedInputAmountRaw: "1000000000",
    inputAmountUsd: inputUsd,
    pairClass,
    policy: DEFAULT_SWAP_QUOTE_POLICY,
  });
}

export function runSwapQuoteFixtureChecks(): SwapFixtureCheck[] {
  const checks: SwapFixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });

  /* ---------------- Architecture guards ---------------- */
  add("SWQ-A1: SwapActionContext legs preserve the ORIGINAL suggestionId and stay separate (multi-leg Trim)", (() => {
    const r = buildTrimSwapAction({ actionId: "act1", suggestionId: "trim_long_tail_assets", generatedAt: QUOTED_AT, holdings: [
      { holdingId: "h1", mint: "Mint111111111111111111111111111111111111111", decimals: 6, rawBalance: "5000000", uiAmount: 5, recognizedValueUsd: 200, symbol: "BONK", reviewEligibilityState: "eligible", actionabilityState: "transferable", coreAssetState: "non_core" },
      { holdingId: "h2", mint: "Mint222222222222222222222222222222222222222", decimals: 9, rawBalance: "7000000000", uiAmount: 7, recognizedValueUsd: 150, symbol: "WIF", reviewEligibilityState: "eligible", actionabilityState: "transferable", coreAssetState: "non_core" },
    ] });
    return r.status === "ready" && r.legs.length === 2 && r.legs.every((l) => l.suggestionId === "trim_long_tail_assets") && r.legs[0].legId !== r.legs[1].legId && r.legs[0].totalLegs === 2;
  })(), "legs separate + id preserved");

  add("SWQ-A2: raw integer amount is preserved EXACTLY (Trim uses the holding's exact rawBalance, no float)", (() => {
    const r = buildTrimSwapAction({ actionId: "a", suggestionId: "trim", generatedAt: QUOTED_AT, holdings: [
      { holdingId: "h", mint: "Mint111111111111111111111111111111111111111", decimals: 6, rawBalance: "123456789", uiAmount: 123.456789, recognizedValueUsd: 10, symbol: "X", reviewEligibilityState: "eligible", actionabilityState: "transferable", coreAssetState: "non_core" },
    ] });
    return r.status === "ready" && r.legs[0].inputAmountRaw === "123456789";
  })(), "raw preserved");

  add("SWQ-A3: comparison NEVER mutates the input candidate (eligibility is written to a copy)", (() => {
    const c = cand();
    const before = c.eligible;
    elig(c);
    compareSwapQuotes({ actionId: "a", legId: "l", inputAsset: INPUT_USDC, outputAsset: OUTPUT_SOL, requestedInputAmountRaw: "1000000000", inputAmountUsd: 1000, candidates: [c], comparedAtMs: COMPARED_AT });
    return before === false && c.eligible === false && c.exclusionReasons.length === 0;
  })(), "input immutable");

  add("SWQ-A4: the quote layer imports NOTHING that could change a suggestion — contracts carry no score/ordering/topPick field", (() => {
    const c = cand();
    const keys = Object.keys(c);
    return !keys.some((k) => /score|ordering|topPick|top_pick|isTopPick|eligibility(?!Assessment)/i.test(k));
  })(), "no engine fields");

  /* ---------------- Cost methodology ---------------- */
  add("SWQ-C1: total-cost formula — net = expectedOutputUsd − nonIncludedFees; cost = input − net; pct = cost/input×100", (() => {
    const b = computeSwapCostBreakdown(cand(), 1000);
    return b.netOutputUsd === 997 && b.estimatedTotalCostUsd === 3 && Math.abs((b.estimatedTotalCostPct ?? 0) - 0.3) < 1e-9;
  })(), "cost math");

  add("SWQ-C2: included fees are NOT double-counted (an includedSwapFeeUsd already in expectedOutput is not re-subtracted)", (() => {
    const withIncluded = computeSwapCostBreakdown(cand({ includedSwapFeeUsd: 5, explicitPlatformFeeUsd: 2 }), 1000);
    const without = computeSwapCostBreakdown(cand(), 1000);
    return withIncluded.netOutputUsd === without.netOutputUsd && withIncluded.includedFeeUsd === 7;
  })(), "no double count");

  add("SWQ-C3: slippage tolerance is NOT a cost — a far-lower minimumOutputRaw does not change the cost", (() => {
    const tight = computeSwapCostBreakdown(cand({ minimumOutputRaw: "5999000000" }), 1000);
    const loose = computeSwapCostBreakdown(cand({ minimumOutputRaw: "1000000000" }), 1000);
    return tight.estimatedTotalCostUsd === loose.estimatedTotalCostUsd;
  })(), "slippage not cost");

  add("SWQ-C4: minimum output is never used as expected output (cost uses expectedOutputUsd)", (() => {
    const b = computeSwapCostBreakdown(cand(), 1000);
    return b.netOutputUsd === 997; // from expectedOutputUsd 997.01, not from minimumOutputRaw
  })(), "expected not minimum");

  add("SWQ-C5: USD-unavailable → cost unresolved (never invented)", (() => {
    const b = computeSwapCostBreakdown(cand({ expectedOutputUsd: null }), 1000);
    const b2 = computeSwapCostBreakdown(cand(), null);
    return b.costUnresolved && b.estimatedTotalCostPct === null && b2.costUnresolved;
  })(), "cost unresolved");

  /* ---------------- Eligibility boundaries ---------------- */
  add("SWQ-E1: major-pair 0.30% boundary is INCLUSIVE (exactly 0.30% accepted)", elig(cand()).candidate.eligible === true, "major 0.30 ok");
  add("SWQ-E2: major-pair just above 0.30% → estimated_cost_high", (() => { const r = elig(cand({ expectedOutputUsd: 996.99 })); return !r.candidate.eligible && r.candidate.exclusionReasons.includes("estimated_cost_high"); })(), "major over");
  add("SWQ-E3: minor-pair 0.50% boundary INCLUSIVE (exactly 0.50% accepted)", elig(cand({ expectedOutputUsd: 995.01 }), "minor").candidate.eligible === true, "minor 0.50 ok");
  add("SWQ-E4: minor-pair just above 0.50% → estimated_cost_high", (() => { const r = elig(cand({ expectedOutputUsd: 994.99 }), "minor"); return r.candidate.exclusionReasons.includes("estimated_cost_high"); })(), "minor over");
  add("SWQ-E5: price impact < 0.50% accepted (0.49)", elig(cand({ priceImpactPct: 0.49 })).candidate.eligible === true, "pi 0.49 ok");
  add("SWQ-E6: price impact EXACTLY 0.50% rejected (exclusive) → price_impact_high", (() => { const r = elig(cand({ priceImpactPct: 0.5 })); return r.candidate.exclusionReasons.includes("price_impact_high"); })(), "pi 0.50 reject");
  add("SWQ-E7: price impact unresolved → price_impact_unresolved", elig(cand({ priceImpactPct: null })).candidate.exclusionReasons.includes("price_impact_unresolved"), "pi unresolved");
  add("SWQ-E8: liquidity exactly $100,000 accepted (inclusive)", elig(cand({ liquidityAssessment: verifiedLiquidity(100_000) })).candidate.eligible === true, "liq 100k ok");
  add("SWQ-E9: liquidity below $100,000 rejected → liquidity_low", (() => { const r = elig(cand({ liquidityAssessment: { status: "below_minimum", minimumRouteLegLiquidityUsd: 99_999, legs: [] } })); return r.candidate.exclusionReasons.includes("liquidity_low"); })(), "liq low");
  add("SWQ-E10: liquidity unresolved rejected → liquidity_unresolved", elig(cand({ liquidityAssessment: { status: "unresolved", minimumRouteLegLiquidityUsd: null, legs: [] } })).candidate.exclusionReasons.includes("liquidity_unresolved"), "liq unresolved");
  add("SWQ-E11: stale quote rejected → quote_stale", elig(cand({ freshness: "stale" })).candidate.exclusionReasons.includes("quote_stale"), "stale");
  add("SWQ-E12: expired quote rejected → quote_expired", elig(cand({ freshness: "expired" })).candidate.exclusionReasons.includes("quote_expired"), "expired");
  add("SWQ-E13: pair mismatch → pair_mismatch", elig(cand({ outputMint: "OtherMint1111111111111111111111111111111111" })).candidate.exclusionReasons.includes("pair_mismatch"), "pair mismatch");
  add("SWQ-E14: amount mismatch → amount_mismatch", elig(cand({ inputAmountRaw: "999999999" })).candidate.exclusionReasons.includes("amount_mismatch"), "amount mismatch");
  add("SWQ-E15: unresolved pair class → total_cost_unresolved (no valid threshold)", elig(cand(), "unresolved").candidate.exclusionReasons.includes("total_cost_unresolved"), "pair class unresolved");
  add("SWQ-E16: blocked underlying venue → blocked_underlying_venue", (() => {
    const policy = { ...DEFAULT_SWAP_QUOTE_POLICY, blockedUnderlyingVenues: ["Orca Whirlpool"] };
    const r = evaluateCandidateEligibility({ candidate: cand(), inputAsset: INPUT_USDC, outputAsset: OUTPUT_SOL, requestedInputAmountRaw: "1000000000", inputAmountUsd: 1000, pairClass: "major", policy });
    return r.candidate.exclusionReasons.includes("blocked_underlying_venue");
  })(), "blocked venue");
  add("SWQ-E17: RFQ leg rejected until approved → rfq_not_approved", (() => {
    const r = elig(cand({ liquidityAssessment: { status: "unresolved", minimumRouteLegLiquidityUsd: null, legs: [{ poolId: "rfq", venue: "RFQ", liquidityUsd: null, liquidityObservedAt: null, legKind: "rfq" }] } }));
    return r.candidate.exclusionReasons.includes("rfq_not_approved");
  })(), "rfq blocked");

  /* ---------------- Liquidity assessment ---------------- */
  add("SWQ-L1: assessRouteLiquidity — every pool leg ≥ $100k → verified; binding = smallest leg", (() => {
    const a = assessRouteLiquidity([
      { poolId: "p1", venue: "Orca", legKind: "clmm_pool", liquidityUsd: 500_000, liquidityObservedAt: QUOTED_AT, fresh: true },
      { poolId: "p2", venue: "Raydium", legKind: "amm_pool", liquidityUsd: 120_000, liquidityObservedAt: QUOTED_AT, fresh: true },
    ]);
    return a.status === "verified" && a.minimumRouteLegLiquidityUsd === 120_000;
  })(), "verified split");
  add("SWQ-L2: one split leg below $100k → below_minimum", assessRouteLiquidity([{ poolId: "p", venue: "v", legKind: "amm_pool", liquidityUsd: 90_000, liquidityObservedAt: QUOTED_AT, fresh: true }]).status === "below_minimum", "below");
  add("SWQ-L3: stale pool liquidity → unresolved (fail closed)", assessRouteLiquidity([{ poolId: "p", venue: "v", legKind: "amm_pool", liquidityUsd: 500_000, liquidityObservedAt: QUOTED_AT, fresh: false }]).status === "unresolved", "stale liq");
  add("SWQ-L4: RFQ leg (unapproved) → unresolved (never scored against pool TVL)", assessRouteLiquidity([{ poolId: "rfq", venue: "RFQ", legKind: "rfq", liquidityUsd: null, liquidityObservedAt: null, fresh: false }]).status === "unresolved", "rfq unresolved");

  /* ---------------- Ranking ---------------- */
  add("SWQ-R1: highest net output wins (primary), never provider identity", (() => {
    const jup = elig(cand({ providerId: "jupiter", providerName: "Jupiter", executionSurface: "jupiter", expectedOutputUsd: 997.5 }));
    const ray = elig(cand({ providerId: "raydium", providerName: "Raydium", executionSurface: "raydium", expectedOutputUsd: 998.5 }));
    const r = rankEligibleCandidates([jup, ray]);
    return r.ranked[0].candidate.providerId === "raydium";
  })(), "net output wins");
  add("SWQ-R2: economically equivalent within epsilon → deterministic provider tie-break (Jupiter first)", (() => {
    const jup = elig(cand({ providerId: "jupiter", expectedOutputUsd: 997.5 }));
    const ray = elig(cand({ providerId: "raydium", providerName: "Raydium", executionSurface: "raydium", expectedOutputUsd: 997.5 }));
    const r = rankEligibleCandidates([ray, jup]);
    return r.economicallyEquivalent && r.ranked[0].candidate.providerId === "jupiter";
  })(), "equiv tiebreak");
  add("SWQ-R3: only eligible candidates are ranked (ineligible excluded)", (() => {
    const ok = elig(cand({ providerId: "jupiter" }));
    const bad = elig(cand({ providerId: "orca", providerName: "Orca", executionSurface: "orca", priceImpactPct: 0.9 }));
    const r = rankEligibleCandidates([ok, bad]);
    return r.ranked.length === 1 && r.ranked[0].candidate.providerId === "jupiter";
  })(), "eligible only");
  add("SWQ-R4: epsilon is versioned in policy (0.05%)", SWAP_QUOTE_OPERATIONAL_POLICY.economicallyEquivalentEpsilon === 0.0005, "epsilon");
  add("SWQ-R5: approved provider tie-break order is exactly Jupiter → Raydium → Orca", SWAP_PROVIDER_PRIORITY_ORDER[0] === "jupiter" && SWAP_PROVIDER_PRIORITY_ORDER[1] === "raydium" && SWAP_PROVIDER_PRIORITY_ORDER[2] === "orca", SWAP_PROVIDER_PRIORITY_ORDER.join("→"));
  add("SWQ-R6: Raydium wins when it has meaningfully better net output than Jupiter (economics beat priority)", (() => {
    const jup = elig(cand({ providerId: "jupiter", expectedOutputUsd: 997.0 }));
    const ray = elig(cand({ providerId: "raydium", providerName: "Raydium", executionSurface: "raydium", expectedOutputUsd: 998.5 }));
    const r = rankEligibleCandidates([jup, ray]);
    return r.ranked[0].candidate.providerId === "raydium" && r.economicallyEquivalent === false;
  })(), "raydium better");
  add("SWQ-R7: Orca wins when it has meaningfully better net output than Jupiter AND Raydium (lowest priority still wins on economics)", (() => {
    const jup = elig(cand({ providerId: "jupiter", expectedOutputUsd: 996.5 }));
    const ray = elig(cand({ providerId: "raydium", providerName: "Raydium", executionSurface: "raydium", expectedOutputUsd: 997.2 }));
    const orc = elig(cand({ providerId: "orca", providerName: "Orca", executionSurface: "orca", expectedOutputUsd: 998.4 }));
    const r = rankEligibleCandidates([jup, ray, orc]);
    return r.ranked[0].candidate.providerId === "orca" && r.economicallyEquivalent === false;
  })(), "orca better");
  add("SWQ-R8: Jupiter wins ONLY when economically equivalent and all preceding tie-breaks are equal → economically_equivalent=true", (() => {
    const jup = elig(cand({ providerId: "jupiter", expectedOutputUsd: 997.5 }));
    const ray = elig(cand({ providerId: "raydium", providerName: "Raydium", executionSurface: "raydium", expectedOutputUsd: 997.5 }));
    const orc = elig(cand({ providerId: "orca", providerName: "Orca", executionSurface: "orca", expectedOutputUsd: 997.5 }));
    const r = rankEligibleCandidates([orc, ray, jup]);
    return r.economicallyEquivalent && r.ranked[0].candidate.providerId === "jupiter";
  })(), "jupiter equiv only");
  add("SWQ-R9: Raydium wins the final tie-break when Jupiter is ABSENT and Raydium/Orca are otherwise equivalent", (() => {
    const ray = elig(cand({ providerId: "raydium", providerName: "Raydium", executionSurface: "raydium", expectedOutputUsd: 997.5 }));
    const orc = elig(cand({ providerId: "orca", providerName: "Orca", executionSurface: "orca", expectedOutputUsd: 997.5 }));
    const r = rankEligibleCandidates([orc, ray]);
    return r.economicallyEquivalent && r.ranked[0].candidate.providerId === "raydium";
  })(), "raydium tiebreak no-jupiter");
  add("SWQ-R10: Orca wins when it is the only eligible provider", (() => {
    const orc = elig(cand({ providerId: "orca", providerName: "Orca", executionSurface: "orca" }));
    const jupBad = elig(cand({ providerId: "jupiter", priceImpactPct: 0.9 }));
    const r = rankEligibleCandidates([jupBad, orc]);
    return r.ranked.length === 1 && r.ranked[0].candidate.providerId === "orca";
  })(), "orca only");
  add("SWQ-R11: provider priority NEVER overrides a meaningful cost difference — Jupiter (highest priority) loses on worse economics", (() => {
    const jup = elig(cand({ providerId: "jupiter", expectedOutputUsd: 997.0 })); // cost 0.30%
    const ray = elig(cand({ providerId: "raydium", providerName: "Raydium", executionSurface: "raydium", expectedOutputUsd: 998.2 })); // cost 0.18%
    const r = rankEligibleCandidates([jup, ray]);
    return r.ranked[0].candidate.providerId === "raydium";
  })(), "priority no override");

  /* ---------------- Comparison statuses ---------------- */
  const mk = (over: Partial<SwapQuoteCandidate>) => cand(over);
  add("SWQ-S1: ≥2 eligible providers → selected, basis lowest_estimated_total_cost", (() => {
    const cs = [mk({ providerId: "jupiter", expectedOutputUsd: 998.2 }), mk({ providerId: "raydium", providerName: "Raydium", executionSurface: "raydium", expectedOutputUsd: 997.6 }), mk({ providerId: "orca", providerName: "Orca", executionSurface: "orca", expectedOutputUsd: 997.4 })];
    const a = compareSwapQuotes({ actionId: "a", legId: "l", inputAsset: INPUT_USDC, outputAsset: OUTPUT_SOL, requestedInputAmountRaw: "1000000000", inputAmountUsd: 1000, candidates: cs, comparedAtMs: COMPARED_AT });
    return a.status === "selected" && a.selectedProviderId === "jupiter" && a.selectionBasis === "lowest_estimated_total_cost" && a.comparedProviders.length === 3;
  })(), "selected");
  add("SWQ-S2: exactly one eligible (others ineligible, no failure) → only_route_available (not called cheapest)", (() => {
    const cs = [mk({ providerId: "jupiter", expectedOutputUsd: 998 }), mk({ providerId: "raydium", providerName: "Raydium", executionSurface: "raydium", priceImpactPct: 0.9 }), mk({ providerId: "orca", providerName: "Orca", executionSurface: "orca", priceImpactPct: 0.9 })];
    const a = compareSwapQuotes({ actionId: "a", legId: "l", inputAsset: INPUT_USDC, outputAsset: OUTPUT_SOL, requestedInputAmountRaw: "1000000000", inputAmountUsd: 1000, candidates: cs, comparedAtMs: COMPARED_AT });
    return a.status === "only_route_available" && a.selectionBasis === "only_eligible_route";
  })(), "only route");
  add("SWQ-S3: a provider call failed (no_route) but a winner exists → partial_comparison (disclosed)", (() => {
    const cs = [mk({ providerId: "jupiter", expectedOutputUsd: 998 }), mk({ providerId: "raydium", providerName: "Raydium", executionSurface: "raydium", expectedOutputUsd: 997.6 }), mk({ providerId: "orca", providerName: "Orca", executionSurface: "orca", eligible: false, exclusionReasons: ["no_route"], expectedOutputRaw: "0", expectedOutputUsd: null })];
    const a = compareSwapQuotes({ actionId: "a", legId: "l", inputAsset: INPUT_USDC, outputAsset: OUTPUT_SOL, requestedInputAmountRaw: "1000000000", inputAmountUsd: 1000, candidates: cs, comparedAtMs: COMPARED_AT });
    return a.status === "partial_comparison" && a.unavailableProviders.includes("orca") && a.warnings.length > 0;
  })(), "partial");
  add("SWQ-S4: all providers above limits → no_valid_route", (() => {
    const cs = [mk({ providerId: "jupiter", priceImpactPct: 0.9 }), mk({ providerId: "raydium", providerName: "Raydium", executionSurface: "raydium", priceImpactPct: 0.9 }), mk({ providerId: "orca", providerName: "Orca", executionSurface: "orca", priceImpactPct: 0.9 })];
    const a = compareSwapQuotes({ actionId: "a", legId: "l", inputAsset: INPUT_USDC, outputAsset: OUTPUT_SOL, requestedInputAmountRaw: "1000000000", inputAmountUsd: 1000, candidates: cs, comparedAtMs: COMPARED_AT });
    return a.status === "no_valid_route" && a.selectedProviderId === null && a.blockingReasons.includes("price_impact_high");
  })(), "no valid route");
  add("SWQ-S5: all providers unavailable → no_valid_route with unavailableProviders populated", (() => {
    const a = compareSwapQuotes({ actionId: "a", legId: "l", inputAsset: INPUT_USDC, outputAsset: OUTPUT_SOL, requestedInputAmountRaw: "1000000000", inputAmountUsd: 1000, candidates: [], comparedAtMs: COMPARED_AT });
    return a.status === "no_valid_route" && a.unavailableProviders.length === 3;
  })(), "all unavailable");
  add("SWQ-S6: unresolved pair class → no_valid_route (pair_classification_unresolved)", (() => {
    const other: SwapAsset = { symbol: "BONK", mint: "Mint333333333333333333333333333333333333333", decimals: 5 };
    const a = compareSwapQuotes({ actionId: "a", legId: "l", inputAsset: other, outputAsset: OUTPUT_SOL, requestedInputAmountRaw: "1", inputAmountUsd: 100, candidates: [cand({ inputMint: other.mint })], comparedAtMs: COMPARED_AT });
    return a.status === "no_valid_route" && a.blockingReasons.includes("pair_classification_unresolved");
  })(), "pair unresolved");

  /* ---------------- Multi-leg plan ---------------- */
  add("SWQ-P1: multi-leg plan — earliest selected-leg expiry drives plan expiry; unresolved legs counted", (() => {
    const legA = compareSwapQuotes({ actionId: "a", legId: "a:0", inputAsset: INPUT_USDC, outputAsset: OUTPUT_SOL, requestedInputAmountRaw: "1000000000", inputAmountUsd: 1000, candidates: [cand({ expiresAt: "2026-07-24T00:00:30.000Z" }), cand({ providerId: "raydium", providerName: "Raydium", executionSurface: "raydium", expiresAt: "2026-07-24T00:00:40.000Z", expectedOutputUsd: 997.4 })], comparedAtMs: COMPARED_AT });
    const legB = compareSwapQuotes({ actionId: "a", legId: "a:1", inputAsset: INPUT_USDC, outputAsset: OUTPUT_SOL, requestedInputAmountRaw: "1000000000", inputAmountUsd: 1000, candidates: [cand({ expiresAt: "2026-07-24T00:00:10.000Z" }), cand({ providerId: "orca", providerName: "Orca", executionSurface: "orca", expiresAt: "2026-07-24T00:00:20.000Z", expectedOutputUsd: 997.4 })], comparedAtMs: COMPARED_AT });
    const legC = compareSwapQuotes({ actionId: "a", legId: "a:2", inputAsset: INPUT_USDC, outputAsset: OUTPUT_SOL, requestedInputAmountRaw: "1000000000", inputAmountUsd: 1000, candidates: [cand({ priceImpactPct: 0.9 })], comparedAtMs: COMPARED_AT });
    const plan = summarizeSwapPlan("a", [legA, legB, legC]);
    return plan.selectedLegCount === 2 && plan.unresolvedLegCount === 1 && plan.expiresAt === "2026-07-24T00:00:10.000Z";
  })(), "plan expiry");

  /* ---------------- Rebalance readiness ---------------- */
  add("SWQ-RB1: Rebalance stables_to_crypto with selected USDC excess → quote-ready USDC→SOL (exact raw)", (() => {
    const r = buildRebalanceSwapAction({ actionId: "rb", suggestionId: "rebalance_to_plan", generatedAt: QUOTED_AT, requiredCorrectionUsd: 1_000_000, direction: "stables_to_crypto", usdcSource: { verifiedExcessValueUsd: 500, selectionState: "selected", usdcUnitPriceUsd: 1 } });
    return r.status === "ready" && r.legs[0].inputAsset.mint === USDC && r.legs[0].outputAsset.mint === WSOL && r.legs[0].inputAmountRaw === "500000000";
  })(), "rb ready");
  add("SWQ-RB1c: the swap is CAPPED at the correction — never the whole balance", (() => {
    // The bug this replaces: the adapter swapped everything available, so a wallet holding
    // 600 SOL with a $30,628 correction produced a confirm sheet for 599.9 SOL ($89,985) under
    // a card that said "Swap $30,628 of excess SOL" — nearly three times as much. The on-chain
    // minimum would have protected that faithfully: a minimum guards a swap's PRICE, not its
    // SIZE, so nothing downstream would have caught it.
    const correction = 30_628;
    const r = buildRebalanceSwapAction({
      actionId: "rb", suggestionId: "rebalance_to_plan", generatedAt: QUOTED_AT,
      direction: "crypto_to_stables", requiredCorrectionUsd: correction,
      nativeSolSource: { technicallyAvailableLamports: 599_900_000_000, sourceEligibilityState: "eligible", solUnitPriceUsd: 150 },
    });
    if (r.status !== "ready") return false;
    const leg = r.legs[0];
    // 30,628 / 150 = 204.187 SOL, not the 599.9 available.
    const lamports = Number(leg.inputAmountRaw);
    return Math.abs(lamports / 1e9 - correction / 150) < 1e-6 &&
      Math.abs((leg.inputAmountUsd ?? 0) - correction) < 0.01 &&
      lamports < 599_900_000_000;
  })(), "capped at the correction");
  add("SWQ-RB1d: when the correction exceeds what is available, available wins", (() => {
    // The cap is a minimum of the two, not a replacement: a wallet that cannot cover the whole
    // correction swaps everything it has, which is what a partial rebalance means.
    const r = buildRebalanceSwapAction({
      actionId: "rb", suggestionId: "rebalance_to_plan", generatedAt: QUOTED_AT,
      direction: "crypto_to_stables", requiredCorrectionUsd: 1_000_000,
      nativeSolSource: { technicallyAvailableLamports: 2_000_000_000, sourceEligibilityState: "eligible", solUnitPriceUsd: 150 },
    });
    return r.status === "ready" && r.legs[0].inputAmountRaw === "2000000000";
  })(), "partial rebalance still swaps all it can");
  add("SWQ-RB1e: the SAME cap applies to stables_to_crypto — both directions, one rule", (() => {
    const r = buildRebalanceSwapAction({
      actionId: "rb", suggestionId: "rebalance_to_plan", generatedAt: QUOTED_AT,
      direction: "stables_to_crypto", requiredCorrectionUsd: 200,
      usdcSource: { verifiedExcessValueUsd: 5_000, selectionState: "selected", usdcUnitPriceUsd: 1 },
    });
    // $200 of the $5,000 excess, not all of it.
    return r.status === "ready" && r.legs[0].inputAmountRaw === "200000000" && r.legs[0].inputAmountUsd === 200;
  })(), "both directions capped");
  add("SWQ-RB1f: with no SOL price the correction cannot be sized, so NOTHING is offered", (() => {
    // Falling back to "all of it" is exactly the failure being fixed; an unpriced swap of a
    // whole position is worse than no in-app swap at all.
    const r = buildRebalanceSwapAction({
      actionId: "rb", suggestionId: "rebalance_to_plan", generatedAt: QUOTED_AT,
      direction: "crypto_to_stables", requiredCorrectionUsd: 1000,
      nativeSolSource: { technicallyAvailableLamports: 2_000_000_000, sourceEligibilityState: "eligible", solUnitPriceUsd: null },
    });
    return r.status === "not_ready_for_quote";
  })(), "no price, no swap");
  add("SWQ-RB2: Rebalance within_threshold → not_required", buildRebalanceSwapAction({ actionId: "rb", suggestionId: "s", generatedAt: QUOTED_AT, requiredCorrectionUsd: 1_000_000, direction: "within_threshold" }).status === "not_required", "rb not required");
  add("SWQ-RB3: Rebalance USDC source not selected → not_ready_for_quote (no locked/abstract quote)", buildRebalanceSwapAction({ actionId: "rb", suggestionId: "s", generatedAt: QUOTED_AT, requiredCorrectionUsd: 1_000_000, direction: "stables_to_crypto", usdcSource: { verifiedExcessValueUsd: 0, selectionState: "no_excess", usdcUnitPriceUsd: 1 } }).status === "not_ready_for_quote", "rb not ready");
  add("SWQ-RB3b: Kamino-sourced Rebalance (requiresPriorWithdrawal) → not_ready_for_quote; NEVER quoted as in-wallet funds", (() => { const r = buildRebalanceSwapAction({ actionId: "rb", suggestionId: "rebalance_to_plan", generatedAt: QUOTED_AT, requiredCorrectionUsd: 1_000_000, direction: "stables_to_crypto", usdcSource: { verifiedExcessValueUsd: 500, selectionState: "selected", usdcUnitPriceUsd: 1, requiresPriorWithdrawal: true } }); return r.status === "not_ready_for_quote" && (r as { reasons?: string[] }).reasons?.includes("usdc_source_requires_prior_withdrawal") === true; })(), "withdraw first");
  add("SWQ-RB4: Rebalance crypto_to_stables uses exact native-SOL lamports → SOL→USDC", (() => {
    const r = buildRebalanceSwapAction({ actionId: "rb", suggestionId: "s", generatedAt: QUOTED_AT, requiredCorrectionUsd: 1_000_000, direction: "crypto_to_stables", nativeSolSource: { technicallyAvailableLamports: 2_000_000_000, sourceEligibilityState: "eligible", solUnitPriceUsd: 150 } });
    return r.status === "ready" && r.legs[0].inputAmountRaw === "2000000000" && r.legs[0].inputAsset.mint === WSOL && r.legs[0].outputAsset.mint === USDC;
  })(), "rb c2s");
  add("SWQ-RB5: stables_to_crypto action context carries EXACT USDC mint + decimals + raw + wrapped-SOL destination + wallet_transferable", (() => {
    const r = buildRebalanceSwapAction({ actionId: "rb", suggestionId: "rebalance_to_plan", generatedAt: QUOTED_AT, requiredCorrectionUsd: 1_000_000, direction: "stables_to_crypto", usdcSource: { verifiedExcessValueUsd: 500, selectionState: "selected", usdcUnitPriceUsd: 1 } });
    if (r.status !== "ready") return false;
    const l = r.legs[0];
    return l.inputAsset.mint === USDC && l.inputAsset.decimals === 6 && l.inputAmountRaw === "500000000" && l.outputAsset.mint === SWAP_WSOL.mint && l.outputAsset.decimals === 9 && l.sourceAvailability === "wallet_transferable" && l.suggestionId === "rebalance_to_plan";
  })(), "s2c full identity");
  add("SWQ-RB6: crypto_to_stables reserve is OWNED BY THE ASSESSMENT — the REAL deriveNativeSolRebalanceSource nets the 0.1 SOL reserve and the adapter quotes exactly that (2.1 SOL recognized → 2.0 SOL quoted)", (() => {
    const solPos = { id: "sol", type: "native", amount: "2100000000", symbol: "SOL", name: "Solana", detection: "direct_wallet_balance", source: "wallet", valueUsd: 315 } as unknown as WalletPosition;
    const src = deriveNativeSolRebalanceSource([solPos], 150, true, REBALANCE_NATIVE_SOL_RESERVE_POLICY, true, COMPARED_AT);
    if (src.sourceEligibilityState !== "eligible" || src.recognizedLamports !== 2_100_000_000 || src.technicallyAvailableLamports !== 2_000_000_000) return false;
    const r = buildRebalanceSwapAction({ actionId: "rb", suggestionId: "rebalance_to_plan", generatedAt: QUOTED_AT, requiredCorrectionUsd: 1_000_000, direction: "crypto_to_stables", nativeSolSource: { technicallyAvailableLamports: src.technicallyAvailableLamports, sourceEligibilityState: src.sourceEligibilityState, solUnitPriceUsd: 150 } });
    return r.status === "ready" && r.legs[0].inputAmountRaw === "2000000000" && r.legs[0].inputAmountRaw === String(src.technicallyAvailableLamports) && r.legs[0].inputAmountRaw !== String(src.recognizedLamports);
  })(), "reserve owned by assessment");
  add("SWQ-RB7: adapter does NOT recompute the reserve — it uses technicallyAvailableLamports verbatim (no second 0.1 SOL subtraction)", (() => {
    const r = buildRebalanceSwapAction({ actionId: "rb", suggestionId: "s", generatedAt: QUOTED_AT, requiredCorrectionUsd: 1_000_000, direction: "crypto_to_stables", nativeSolSource: { technicallyAvailableLamports: 2_000_000_000, sourceEligibilityState: "eligible", solUnitPriceUsd: 150 } });
    // If the adapter wrongly re-subtracted 0.1 SOL, the raw would be 1_900_000_000.
    return r.status === "ready" && r.legs[0].inputAmountRaw === "2000000000";
  })(), "no reserve recompute");
  add("SWQ-RB8: adapter never quotes MORE than the canonical source capacity (quoted raw === technicallyAvailableLamports, never above)", (() => {
    const avail = 1_234_567_890;
    const r = buildRebalanceSwapAction({ actionId: "rb", suggestionId: "s", generatedAt: QUOTED_AT, requiredCorrectionUsd: 1_000_000, direction: "crypto_to_stables", nativeSolSource: { technicallyAvailableLamports: avail, sourceEligibilityState: "eligible", solUnitPriceUsd: 150 } });
    return r.status === "ready" && BigInt(r.legs[0].inputAmountRaw) === BigInt(avail);
  })(), "no over-quote");
  add("SWQ-RB9: EXPLICIT native-SOL → Wrapped-SOL mapping — crypto_to_stables input mint is wSOL (symbol SOL), and NATIVE_SOL_QUOTE_ASSET is the wrapped mint", (() => {
    const r = buildRebalanceSwapAction({ actionId: "rb", suggestionId: "s", generatedAt: QUOTED_AT, requiredCorrectionUsd: 1_000_000, direction: "crypto_to_stables", nativeSolSource: { technicallyAvailableLamports: 2_000_000_000, sourceEligibilityState: "eligible", solUnitPriceUsd: 150 } });
    return r.status === "ready" && r.legs[0].inputAsset.mint === SWAP_WSOL.mint && r.legs[0].inputAsset.symbol === "SOL" && r.legs[0].inputAsset.decimals === 9 && NATIVE_SOL_QUOTE_ASSET.mint === SWAP_WSOL.mint;
  })(), "native→wrapped mapping");
  add("SWQ-RB10: BOTH canonical directions produce a valid, immutable, quote-ready action context from transferable sources", (() => {
    const s2c = buildRebalanceSwapAction({ actionId: "rb", suggestionId: "rebalance_to_plan", generatedAt: QUOTED_AT, requiredCorrectionUsd: 1_000_000, direction: "stables_to_crypto", usdcSource: { verifiedExcessValueUsd: 400, selectionState: "selected", usdcUnitPriceUsd: 1 } });
    const c2s = buildRebalanceSwapAction({ actionId: "rb", suggestionId: "rebalance_to_plan", generatedAt: QUOTED_AT, requiredCorrectionUsd: 1_000_000, direction: "crypto_to_stables", nativeSolSource: { technicallyAvailableLamports: 3_000_000_000, sourceEligibilityState: "eligible", solUnitPriceUsd: 150 } });
    return s2c.status === "ready" && c2s.status === "ready" && s2c.legs[0].inputAsset.mint === USDC && s2c.legs[0].outputAsset.mint === WSOL && c2s.legs[0].inputAsset.mint === WSOL && c2s.legs[0].outputAsset.mint === USDC && s2c.legs[0].sourceAvailability === "wallet_transferable" && c2s.legs[0].sourceAvailability === "wallet_transferable";
  })(), "both directions ready");

  /* ---------------- Trim readiness ---------------- */
  add("SWQ-T1: Trim exact non-core transferable token → USDC leg", (() => {
    const r = buildTrimSwapAction({ actionId: "t", suggestionId: "trim_long_tail_assets", generatedAt: QUOTED_AT, holdings: [{ holdingId: "h", mint: "Mint111111111111111111111111111111111111111", decimals: 6, rawBalance: "5000000", uiAmount: 5, recognizedValueUsd: 200, symbol: "BONK", reviewEligibilityState: "eligible", actionabilityState: "transferable", coreAssetState: "non_core" }] });
    return r.status === "ready" && r.legs[0].outputAsset.mint === USDC && r.legs[0].inputAmountRaw === "5000000";
  })(), "trim leg");
  add("SWQ-T2: Trim unavailable (non-transferable) source → not_ready_for_quote", buildTrimSwapAction({ actionId: "t", suggestionId: "s", generatedAt: QUOTED_AT, holdings: [{ holdingId: "h", mint: "Mint111111111111111111111111111111111111111", decimals: 6, rawBalance: "5000000", uiAmount: 5, recognizedValueUsd: 200, symbol: "X", reviewEligibilityState: "eligible", actionabilityState: "unavailable", coreAssetState: "non_core" }] }).status === "not_ready_for_quote", "trim unavailable");

  /* ---------------- DCA readiness ---------------- */
  add("SWQ-D1: DCA staged excess wallet USDC → SOL is quote-ready", (() => {
    const r = buildDcaSwapAction({ actionId: "d", suggestionId: "contribution_dca_excess_sol", generatedAt: QUOTED_AT, planKind: "staged_excess_usdc_dca", sourceAssetId: "usdc", sourceUnitPriceUsd: 1, targetAssetId: WSOL, targetSymbol: "SOL", targetDecimals: 9, amountUsd: 300 });
    return r.status === "ready" && r.legs[0].inputAsset.mint === USDC && r.legs[0].outputAsset.mint === WSOL && r.legs[0].inputAmountRaw === "300000000";
  })(), "dca ready");
  add("SWQ-D2: DCA future contribution (no on-chain source) → not_ready_for_quote; source never assumed USDC", buildDcaSwapAction({ actionId: "d", suggestionId: "s", generatedAt: QUOTED_AT, planKind: "recurring_dca", targetAssetId: WSOL, targetSymbol: "SOL", targetDecimals: 9, amountUsd: 300 }).status === "not_ready_for_quote", "dca future");
  add("SWQ-D3: DCA USDC → USDC (no conversion) → not_required", buildDcaSwapAction({ actionId: "d", suggestionId: "s", generatedAt: QUOTED_AT, planKind: "staged_excess_usdc_dca", sourceAssetId: "usdc", sourceUnitPriceUsd: 1, targetAssetId: "usdc", targetSymbol: "USDC", targetDecimals: 6, amountUsd: 300 }).status === "not_required", "dca not required");

  /* ---------------- Normalization + provider surface ---------------- */
  const snap = { inputMint: USDC, outputMint: WSOL, inputDecimals: 6, outputDecimals: 9, inputAmountRaw: "1000000000", outputUnitPriceUsd: 150, comparedAtMs: COMPARED_AT };
  add("SWQ-N1: Jupiter normalization — execution surface Jupiter, underlying venues from routePlan (not a direct venue)", (() => {
    const c = normalizeJupiterQuote({ outAmount: "6000000000", otherAmountThreshold: "5970000000", priceImpactPct: "0.1", routePlan: [{ swapInfo: { label: "Raydium CLMM" } }, { swapInfo: { label: "Orca Whirlpool" } }] }, QUOTED_AT, { ctx: snap, liquidity: verifiedLiquidity() });
    return c.executionSurface === "jupiter" && c.underlyingVenues.includes("Raydium CLMM") && c.underlyingVenues.includes("Orca Whirlpool") && c.expectedOutputRaw === "6000000000";
  })(), "jupiter norm");
  add("SWQ-N2: Raydium normalization — Raydium is its own execution surface", (() => {
    const c = normalizeRaydiumQuote({ outputAmount: "5990000000", otherAmountThreshold: "5960000000", priceImpactPct: 0.12, routePlan: [{ poolId: "PoolXYZ123" }] }, QUOTED_AT, { ctx: snap, liquidity: verifiedLiquidity() });
    return c.executionSurface === "raydium" && c.expectedOutputRaw === "5990000000";
  })(), "raydium norm");
  add("SWQ-N3: Orca normalization — no route → no_route (not a system failure)", (() => {
    const c = normalizeOrcaQuote({ estimatedAmountOut: "" }, QUOTED_AT, { ctx: snap });
    return c.exclusionReasons.includes("no_route") && !c.eligible;
  })(), "orca no route");
  add("SWQ-N4: normalized candidate carries NO provider raw payload (no routePlan/raw/transaction keys)", (() => {
    const c = normalizeJupiterQuote({ outAmount: "6000000000", routePlan: [{ swapInfo: { label: "Orca Whirlpool" } }] }, QUOTED_AT, { ctx: snap, liquidity: verifiedLiquidity() });
    const forbidden = new Set(["routePlan", "swapInfo", "rawQuote", "rawResponse", "raw", "rawSource", "transaction", "instructions", "ammKey"]);
    return Object.keys(c).every((k) => !forbidden.has(k));
  })(), "no raw payload");

  /* ---------------- 23C §1: Raydium price-impact UNIT (documented percentage points; heuristic removed) ---------------- */
  const rayImpact = (v: string | number) => normalizeRaydiumQuote({ outputAmount: "6000000000", otherAmountThreshold: "5970000000", priceImpactPct: v, routePlan: [{ poolId: "P" }] }, QUOTED_AT, { ctx: snap, liquidity: verifiedLiquidity() }).priceImpactPct;
  add("SWQ-RU1: Raydium priceImpactPct is percentage points (0.93 → 0.93%, NOT 93%) — heuristic removed", rayImpact(0.93) === 0.93 && rayImpact(0.01) === 0.01 && rayImpact(0) === 0, `0.93→${rayImpact(0.93)}`);
  add("SWQ-RU2: Raydium small impact stays small (0.1 → 0.1%, not 10%)", rayImpact(0.1) === 0.1, `0.1→${rayImpact(0.1)}`);
  add("SWQ-RU3: Raydium 0.49% is eligible (below the exclusive 0.50% limit)", elig(cand({ providerId: "raydium", providerName: "Raydium", executionSurface: "raydium", priceImpactPct: rayImpact(0.49) })).candidate.exclusionReasons.includes("price_impact_high") === false, `pi=${rayImpact(0.49)}`);
  add("SWQ-RU4: Raydium EXACTLY 0.50% remains ineligible (exclusive threshold unchanged) → price_impact_high", elig(cand({ providerId: "raydium", providerName: "Raydium", executionSurface: "raydium", priceImpactPct: rayImpact(0.5) })).candidate.exclusionReasons.includes("price_impact_high"), `pi=${rayImpact(0.5)}`);
  add("SWQ-RU5: Raydium above 0.50% (0.93%) is ineligible → price_impact_high", elig(cand({ providerId: "raydium", providerName: "Raydium", executionSurface: "raydium", priceImpactPct: rayImpact(0.93) })).candidate.exclusionReasons.includes("price_impact_high"), `pi=${rayImpact(0.93)}`);
  add("SWQ-RU6: Raydium malformed impact → null → price_impact_unresolved (fail closed, no guess)", rayImpact("not-a-number") === null && elig(cand({ providerId: "raydium", providerName: "Raydium", executionSurface: "raydium", priceImpactPct: null })).candidate.exclusionReasons.includes("price_impact_unresolved"), "malformed");
  add("SWQ-RU7: Jupiter priceImpactPct is a fraction (0.001 → 0.1%); the two providers use DIFFERENT documented units", normalizeJupiterQuote({ outAmount: "6000000000", priceImpactPct: 0.001, routePlan: [] }, QUOTED_AT, { ctx: snap, liquidity: verifiedLiquidity() }).priceImpactPct === 0.1, "jup fraction");

  /* ---------------- Security: no transaction / signature ---------------- */
  add("SWQ-SEC1: scanForTransactionFields detects a transaction field at any depth", (() => {
    const s = scanForTransactionFields({ outAmount: "1", nested: { data: { swapTransaction: "base64==" } } });
    return !s.clean && s.foundFields.includes("swapTransaction");
  })(), "detects tx");
  add("SWQ-SEC2: a provider payload carrying a transaction is rejected → normalization_failed (fails closed)", (() => {
    const c = normalizeJupiterQuote({ outAmount: "6000000000", transaction: "AABB==", routePlan: [] } as never, QUOTED_AT, { ctx: snap, liquidity: verifiedLiquidity() });
    return c.exclusionReasons.includes("normalization_failed") && !c.eligible;
  })(), "reject tx payload");
  add("SWQ-SEC3: no comparison output contains a transaction/instruction/signature field", (() => {
    const a = compareSwapQuotes({ actionId: "a", legId: "l", inputAsset: INPUT_USDC, outputAsset: OUTPUT_SOL, requestedInputAmountRaw: "1000000000", inputAmountUsd: 1000, candidates: [cand(), cand({ providerId: "raydium", providerName: "Raydium", executionSurface: "raydium", expectedOutputUsd: 997.4 })], comparedAtMs: COMPARED_AT });
    return scanForTransactionFields(a).clean;
  })(), "output clean");
  add("SWQ-SEC4: no policy/contract exposes an API key or provider header field", (() => {
    const blob = JSON.stringify(DEFAULT_SWAP_QUOTE_POLICY) + JSON.stringify(cand());
    return !/apiKey|api_key|authorization|bearer|x-api-key|secret/i.test(blob);
  })(), "no keys");

  /* ---------------- Amount math (integer-safe) ---------------- */
  add("SWQ-M1: usdToRaw floors to exact base units (never float authority)", usdToRaw(500, 1, 6) === "500000000" && usdToRaw(333.333333, 1, 6) === "333333333", "usdToRaw");
  add("SWQ-M2: tokensToRaw refuses more fractional digits than decimals (no rounding)", tokensToRaw("1.1234567", 6) === null && tokensToRaw("1.123456", 6) === "1123456", "tokensToRaw");
  add("SWQ-M3: rawToTokens is exact and trims trailing zeros", rawToTokens("1123456", 6) === "1.123456" && rawToTokens("5000000", 6) === "5", "rawToTokens");
  add("SWQ-M4: pair registry classifies SOL/USDC major (direction-agnostic), unknown → unresolved", classifySwapPair(USDC, WSOL) === "major" && classifySwapPair(WSOL, USDC) === "major" && classifySwapPair(USDC, "Mint333333333333333333333333333333333333333") === "unresolved", "pair class");
  add("SWQ-M5: liquidity minimum is the documented $100,000", SWAP_COST_THRESHOLDS.minRouteLegLiquidityUsd === 100_000, "liq min");

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 23C — UI presentation, client adapter, copy, and browser-boundary guards. Sync (pure presentation +
 * validators + source scans). Async client lifecycle is covered in swapQuoteServerFixtures (SWS-C*).
 * ------------------------------------------------------------------ */
export function runSwapQuoteUiFixtureChecks(): SwapFixtureCheck[] {
  const checks: SwapFixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const readSrc = (rel: string) => { try { return readFileSync(`${process.cwd()}/${rel}`, "utf8"); } catch { return ""; } };
  const NOW = Date.parse("2026-07-24T00:00:20.000Z");
  const QUOTED = "2026-07-24T00:00:08.000Z";
  const EXPIRES = "2026-07-24T00:00:50.000Z";
  const cand = (providerId: "jupiter" | "raydium" | "orca", o: Partial<SwapQuoteCandidate>): SwapQuoteCandidate => ({ providerId, providerName: providerId === "jupiter" ? "Jupiter" : providerId === "raydium" ? "Raydium" : "Orca", executionSurface: providerId, underlyingVenues: ["Raydium CLMM"], inputMint: USDC, outputMint: WSOL, inputAmountRaw: "15000000", expectedOutputRaw: "197901045", minimumOutputRaw: "196911540", expectedOutputTokens: "0.197901", expectedOutputUsd: 14.98, quotedAt: QUOTED, expiresAt: EXPIRES, quoteLatencyMs: 780, priceImpactPct: 0.02, includedSwapFeeUsd: null, explicitPlatformFeeUsd: null, estimatedNetworkFeeUsd: 0.01, estimatedRentFeeUsd: 0, liquidityAssessment: { status: "verified", minimumRouteLegLiquidityUsd: 331643, legs: [] }, freshness: "fresh", eligible: true, exclusionReasons: [], ...o });
  const mk = (status: SwapComparisonStatus, o: Partial<SwapQuoteComparisonAssessment>): SwapQuoteComparisonAssessment => ({ status, actionId: "a", legId: "a:0", pairClass: "major", comparedAt: QUOTED, expiresAt: EXPIRES, selectedProviderId: null, selectionBasis: null, decidedBy: null, candidates: [], comparedProviders: [], unavailableProviders: [], estimatedTotalCostUsd: null, estimatedTotalCostPct: null, expectedOutputTokens: null, minimumOutputTokens: null, economicallyEquivalent: false, warnings: [], blockingReasons: [], methodologyVersion: "swap_quote_methodology_1.0.0", ...o });

  const selected = mk("selected", { selectedProviderId: "raydium", selectionBasis: "lowest_estimated_total_cost", comparedProviders: ["jupiter", "raydium", "orca"], estimatedTotalCostUsd: 0.03, estimatedTotalCostPct: 0.09, expectedOutputTokens: "0.197901", candidates: [cand("raydium", {}), cand("jupiter", {}), cand("orca", {})] });
  const partial = mk("partial_comparison", { selectedProviderId: "raydium", selectionBasis: "only_eligible_route", comparedProviders: ["jupiter", "raydium"], unavailableProviders: ["orca"], estimatedTotalCostPct: 0.09, expectedOutputTokens: "0.197901", candidates: [cand("raydium", {}), cand("jupiter", { eligible: false, exclusionReasons: ["liquidity_unresolved"] }), cand("orca", { eligible: false, exclusionReasons: ["provider_unavailable"] })] });
  const onlyRoute = mk("only_route_available", { selectedProviderId: "raydium", selectionBasis: "only_eligible_route", comparedProviders: ["jupiter", "raydium", "orca"], estimatedTotalCostPct: 0.09, expectedOutputTokens: "0.197901", candidates: [cand("raydium", {})] });
  const equivalent = mk("selected", { selectedProviderId: "jupiter", selectionBasis: "narrow_margin", economicallyEquivalent: true, comparedProviders: ["jupiter", "raydium", "orca"], estimatedTotalCostPct: 0.09, expectedOutputTokens: "0.197901", candidates: [cand("jupiter", {}), cand("raydium", {})] });
  const noRoute = mk("no_valid_route", { comparedProviders: ["jupiter", "raydium"], unavailableProviders: ["orca"], blockingReasons: ["estimated_cost_high"], candidates: [cand("raydium", { eligible: false, exclusionReasons: ["estimated_cost_high"] })] });

  // ---- Status → view kind + honest copy ----
  add("SWC-1: selected → 'Suggested route' + 'Lowest estimated total cost' + base disclosure", (() => { const v = presentSwapQuote(selected, { nowMs: NOW }); return v.kind === "selected" && v.heading === "Suggested route" && v.providerLabel === "Raydium — Lowest estimated total cost" && /No transaction has been prepared/.test(v.disclosure ?? ""); })(), "selected copy");
  add("SWC-2: partial → discloses incomplete comparison; NEVER 'cheapest across all'", (() => { const v = presentSwapQuote(partial, { nowMs: NOW }); return v.kind === "partial" && v.incompleteComparison && /could not verify every supported platform/.test(v.disclosure ?? "") && !/cheapest across|lowest total cost across all|best overall/i.test(JSON.stringify(v)); })(), "partial copy");
  add("SWC-3: only route → 'Only eligible route found'; never 'cheapest'/'lowest estimated total cost'", (() => { const v = presentSwapQuote(onlyRoute, { nowMs: NOW }); return v.kind === "only_route" && /Only eligible route found/.test(v.providerLabel ?? "") && !/cheapest|lowest estimated total cost/i.test(v.providerLabel ?? ""); })(), "only route copy");
  add("SWC-4: economically equivalent → 'Similar estimated cost' + tie-break disclosure", (() => { const v = presentSwapQuote(equivalent, { nowMs: NOW }); return v.kind === "equivalent" && /Similar estimated cost/.test(v.providerLabel ?? "") && /deterministic platform tie-break/.test(v.body ?? ""); })(), "equivalent copy");
  add("SWC-5: no valid route → limits heading, suggestion unchanged, no fallback/CTA", (() => { const v = presentSwapQuote(noRoute, { nowMs: NOW }); return v.kind === "no_valid_route" && /No route currently meets/.test(v.heading) && v.providerLabel === null; })(), "no route copy");
  add("SWC-6: not-ready (DCA) → funded-contribution copy; not-ready (generic) → exact-source copy", notReadyView(true).body!.includes("present in your wallet") && notReadyView(false).body!.includes("exact transferable source"), "not ready copy");
  add("SWC-6b: not-ready (withdraw-first) → 'Withdraw the USDC from Kamino first' copy; never a quoted route", (() => { const v = notReadyView(false, ["usdc_source_requires_prior_withdrawal"]); return v.kind === "not_ready_for_quote" && v.body!.includes("Withdraw the USDC from Kamino first") && v.metrics.length === 0 && v.showRefresh === false; })(), "withdraw-first copy");
  add("SWC-7: not-required → 'No swap route is needed'", notRequiredView().body === "No swap route is needed for this contribution.", "not required copy");
  add("SWC-8: unavailable → suggestion unchanged + safe refresh", (() => { const v = unavailableView(); return v.kind === "unavailable" && v.showRefresh && /suggestion is unchanged/.test(v.body ?? ""); })(), "unavailable copy");
  add("SWC-9: expired selected result → expired state with refresh (never a stale winner)", presentSwapQuote(selected, { nowMs: Date.parse(EXPIRES) + 1000 }).kind === "expired", "expired");
  add("SWC-10: loading copy — 'Comparing available routes' + 'No transaction is being prepared'", LOADING_VIEW.heading === "Comparing available routes" && /No transaction is being prepared/.test(LOADING_VIEW.disclosure ?? ""), "loading copy");

  // ---- Terminology + liquidity proxy ----
  add("SWC-11: liquidity is disclosed as a pool-TVL PROXY, never executable/available depth", (() => { const v = presentSwapQuote(selected, { nowMs: NOW }); return /pool-level TVL as a liquidity proxy/.test(v.liquidityProxyNote ?? "") && !/executable depth|available liquidity|guaranteed/i.test(JSON.stringify(v)); })(), "liquidity proxy");
  add("SWC-12: no 'guaranteed' anywhere in any presented state", [selected, partial, onlyRoute, equivalent, noRoute].every((a) => !/guaranteed/i.test(JSON.stringify(presentSwapQuote(a, { nowMs: NOW })))), "no guaranteed");
  add("SWC-13: execution surface (provider) separated from underlying venues (Route uses …)", presentSwapQuote(selected, { nowMs: NOW }).selectedVenues.length > 0 && presentSwapQuote(selected, { nowMs: NOW }).providerLabel!.startsWith("Raydium"), "surface vs venue");
  add("SWC-14: exclusion codes map to user copy (no raw enum surfaces)", EXCLUSION_REASON_COPY.liquidity_low.includes("below") && EXCLUSION_REASON_COPY.price_impact_high.includes("price impact") && EXCLUSION_REASON_COPY.rfq_not_approved.includes("not currently supported") && (() => { const v = presentSwapQuote(partial, { nowMs: NOW }); return v.alternatives.every((alt) => !/liquidity_low|price_impact_high|rfq_not_approved|provider_unavailable/.test(alt.reasonCopy ?? "")); })(), "reason copy");

  // ---- Financial boundary: presentation is read-only ----
  add("SWC-15: presentSwapQuote does NOT mutate the assessment (read-only)", (() => { const before = JSON.stringify(selected); presentSwapQuote(selected, { nowMs: NOW }); return JSON.stringify(selected) === before; })(), "no mutation");

  // ---- Client adapter validation ----
  add("SWC-16: client accepts a valid sanitized assessment", validateSanitizedAssessment(selected) != null, "valid ok");
  add("SWC-17: client rejects a wrong-shape response (missing status/candidates)", validateSanitizedAssessment({ foo: 1 }) === null && validateSanitizedAssessment({ status: "selected" }) === null, "reject shape");
  add("SWC-18: client rejects a transaction-bearing response (defense in depth)", validateSanitizedAssessment({ ...selected, candidates: [{ ...selected.candidates[0], swapTransaction: "AA==" }] }) === null, "reject tx");
  add("SWC-19: request key is stable for identical action + slippage", (() => { const a = { actionId: "a", suggestionId: "s", suggestionCategory: "rebalance" as const, legId: "a:0", legIndex: 0, totalLegs: 1, inputAsset: INPUT_USDC, outputAsset: OUTPUT_SOL, inputAmountRaw: "1000000000", inputAmountTokens: "1000", inputAmountUsd: null, sourceAvailability: "wallet_transferable" as const, generatedAt: QUOTED_AT }; return swapQuoteRequestKey(a, 50) === swapQuoteRequestKey(a, 50) && swapQuoteRequestKey(a, 50) !== swapQuoteRequestKey(a, 100); })(), "request key");

  // ---- Browser-boundary + no-execution-CTA guards ----
  const clientSrc = readSrc("src/suggestions/swapQuote/swapQuoteClient.ts");
  add("SWC-20: the browser client talks ONLY to /api/swap-quote — no provider host / RPC / server import", /\/api\/swap-quote/.test(clientSrc) && !/api\.jup\.ag|raydium\.io|api-v3\.raydium|solana-rpc|SOLANA_RPC|server\/swapQuote/.test(clientSrc), "client boundary");
  const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/^\s*\/\/.*$/gm, "");
  const compFiles = ["src/components/swapQuote/SwapQuoteComparisonSection.tsx", "src/components/swapQuote/SwapQuoteSelectedState.tsx", "src/components/swapQuote/SwapQuoteUnavailableState.tsx", "src/components/swapQuote/useSwapQuoteComparison.ts", "src/components/SuggestionReviewModal.tsx"].map((f) => stripComments(readSrc(f))).join("\n");
  add("SWC-21: UI components import NO server tree / provider client / SDK / RPC", !/server\/swapQuote|jupiterQuoteClient|raydiumQuoteClient|orcaQuoteClient|@orca-so|@solana\/web3|SOLANA_RPC/.test(compFiles), "no server/provider import");
  add("SWC-22: UI code performs NO IN-APP execution (no sign/send/simulate/build-transaction/wallet-adapter/execute) and makes no guaranteed/executable-depth claim (comments stripped)", !/signTransaction|signAllTransactions|sendTransaction|simulateTransaction|new Transaction|VersionedTransaction|@solana\/wallet-adapter|\.execute\(|Connect to execute/i.test(compFiles) && !/guaranteed|executable depth/i.test(compFiles), "no in-app execution");
  add("SWC-23: Refresh control only re-requests (no wallet connect / provider open / transaction) — code, comments stripped", (() => { const u = stripComments(readSrc("src/components/swapQuote/SwapQuoteUnavailableState.tsx")); return /Refresh comparison/.test(u) && !/connect|signTransaction|sendTransaction|window\.open/i.test(u); })(), "refresh safe");
  add("SWC-24: the section is placed INSIDE the Review modal (SuggestionReviewModal renders SwapQuoteComparisonSection)", /SwapQuoteComparisonSection/.test(readSrc("src/components/SuggestionReviewModal.tsx")), "in modal");
  add("SWC-25: the suggestion CARD face does NOT render the route section (card unchanged)", !/SwapQuoteComparisonSection/.test(readSrc("src/components/SuggestionCard.tsx")), "card unchanged");
  add("SWC-26: the view exposes the SELECTED provider id (for the logo) on eligible states, null otherwise", presentSwapQuote(selected, { nowMs: NOW }).selectedProviderId === "raydium" && presentSwapQuote(equivalent, { nowMs: NOW }).selectedProviderId === "jupiter" && presentSwapQuote(noRoute, { nowMs: NOW }).selectedProviderId === null, "selected provider id");
  add("SWC-27: the selected-route logo is decorative (aria-hidden) — the provider NAME is in text, never conveyed by icon alone", (() => { const s = readSrc("src/components/swapQuote/SwapQuoteSelectedState.tsx"); return /swap-quote__provider-logo/.test(s) && /aria-hidden="true"/.test(s) && /SWAP_PROVIDER_NAME/.test(s) && /<span>\{providerName\}<\/span>/.test(s) && /resolveProtocolIcon/.test(s); })(), "logo a11y");

  // ---- 23C.2: read-only "Swap on <provider>" handoff ----
  add("SWC-28: handoff links out to the SELECTED provider's OWN swap page (per-provider URL), reflecting the live winner", (() => {
    const ray = buildSwapHandoff("raydium", USDC, WSOL, "1000"); const jup = buildSwapHandoff("jupiter", USDC, WSOL, "1000"); const orc = buildSwapHandoff("orca", USDC, WSOL, "1000");
    return ray?.providerName === "Raydium" && /raydium\.io\/swap/.test(ray?.swapUrl ?? "") && jup?.providerName === "Jupiter" && /jup\.ag\/swap/.test(jup?.swapUrl ?? "") && /orca\.so/.test(orc?.swapUrl ?? "") && buildSwapHandoff(null, USDC, WSOL) === null;
  })(), "provider handoff url");
  // SWC-29/30 pinned a "Swap on <provider>" link out as the modal's footer. That link is gone: a swap
  // WealthSmith suggests is approved in the review (Swap → terms → the user's own wallet), and where no
  // swap can be offered the review says so. They now pin its ABSENCE, and what replaced it.
  add("SWC-29: the review modal carries NO 'Swap on <provider>' link; the shared footer component is still a read-only link-out for the reviews that have one", (() => {
    const m = readSrc("src/components/SuggestionReviewModal.tsx");
    const f = readSrc("src/components/ModalActionsFooter.tsx");
    return !/Swap on /.test(stripComments(m)) && !/swapHandoff/.test(stripComments(m))
      // Staking / lending / withdrawal reviews still hand off, read-only, through the shared footer.
      && /target: "_blank", rel: "noopener noreferrer"/.test(f) && /secondaryLabel = "Cancel"/.test(f)
      && !/signTransaction|sendTransaction|Connect to execute/i.test(stripComments(m))
      && !/signTransaction|sendTransaction|Connect to execute/i.test(stripComments(f));
  })(), "no swap link-out");
  add("SWC-30: the route section reports QUOTE STATE for a single-leg ready action only (multi-leg + not-ready report nothing), and builds no handoff", (() => {
    const s = stripComments(readSrc("src/components/swapQuote/SwapQuoteComparisonSection.tsx"));
    return /singleLeg && readiness\.status === "ready"\s*\? \{ action: singleLeg, assessment: singleAssessment, loading: quoteLoading, refresh: quietRefresh \}\s*: null/.test(s)
      && /onExecutionContext\?\.\(null\)/.test(s) && !/buildSwapHandoff|onHandoff/.test(s);
  })(), "quote state single-leg");
  // --- decidedBy: the MECHANISM, not the margin (SWC-35..39) -----------------
  // selectionBasis describes how close the win was; it was previously named
  // "economically_equivalent_tiebreak", which read as "the provider tie-break chose this" and is not what
  // it means. These pin the distinction so the two can never be confused again from the data alone.
  add("SWC-35: a clear win on net output reports decidedBy=net_output, NOT a tie-break", (() => {
    const a = rankEligibleCandidates([
      { candidate: cand("jupiter", {}), cost: { netOutputUsd: 100, estimatedTotalCostPct: 0.1 } as never },
      { candidate: cand("raydium", {}), cost: { netOutputUsd: 90, estimatedTotalCostPct: 0.1 } as never },
    ]);
    return a.decidedBy === "net_output" && a.ranked[0].candidate.providerId === "jupiter" && !a.economicallyEquivalent;
  })(), "net output decides");
  add("SWC-36: a NARROW win still reports decidedBy=net_output — a small margin is not a tie-break", (() => {
    const a = rankEligibleCandidates([
      { candidate: cand("jupiter", {}), cost: { netOutputUsd: 100.0, estimatedTotalCostPct: 0.1 } as never },
      { candidate: cand("raydium", {}), cost: { netOutputUsd: 99.99, estimatedTotalCostPct: 0.1 } as never },
    ]);
    // economicallyEquivalent flags the margin; decidedBy still names the mechanism.
    return a.decidedBy === "net_output" && a.economicallyEquivalent === true;
  })(), "margin vs mechanism");
  add("SWC-37: provider_priority decides ONLY when every economic value is exactly equal — and then it does", (() => {
    const same = { netOutputUsd: 100, estimatedTotalCostPct: 0.1 } as never;
    const a = rankEligibleCandidates([
      { candidate: cand("raydium", {}), cost: same },
      { candidate: cand("jupiter", {}), cost: same },
    ]);
    return a.decidedBy === "provider_priority" && a.ranked[0].candidate.providerId === "jupiter";
  })(), "exact tie only");
  // SWC-38 used to say ANY economic difference decides, down to a millionth of a dollar. Measured in
  // production that selected on noise: two quotes $0.0002–$0.0009 apart on a $4 swap traded places
  // between consecutive comparisons, flipping the suggested route between one the user can approve
  // here and one they cannot. The rule now has a band — the equivalence epsilon, 0.05% — and these
  // pin both sides of it.
  add("SWC-38: OUTSIDE the equivalence band an economic difference still wins — for a provider that cannot execute in-app too", (() => {
    const a = rankEligibleCandidates([
      { candidate: cand("jupiter", {}), cost: { netOutputUsd: 99.9, estimatedTotalCostPct: 0.1 } as never },
      { candidate: cand("raydium", {}), cost: { netOutputUsd: 100, estimatedTotalCostPct: 0.1 } as never },
    ]);
    // 0.1% better: twice the band. Raydium wins on its economics and nothing promotes Jupiter.
    return a.ranked[0].candidate.providerId === "raydium" && a.decidedBy === "net_output" && !a.economicallyEquivalent;
  })(), "economics win");
  add("SWC-40: INSIDE the band, the route that can be approved in-app is selected, and the result says so", (() => {
    const a = rankEligibleCandidates([
      { candidate: cand("jupiter", {}), cost: { netOutputUsd: 99.999999, estimatedTotalCostPct: 0.1 } as never },
      { candidate: cand("raydium", {}), cost: { netOutputUsd: 100, estimatedTotalCostPct: 0.1 } as never },
    ]);
    return a.ranked[0].candidate.providerId === "jupiter" && a.ranked[1].candidate.providerId === "raydium" &&
      a.decidedBy === "in_app_execution" && a.economicallyEquivalent === true;
  })(), "near-tie → in-app");
  add("SWC-41: the band's edge is the policy epsilon — just inside promotes, just outside does not", (() => {
    const eps = SWAP_QUOTE_OPERATIONAL_POLICY.economicallyEquivalentEpsilon;
    const pair = (jup: number) => rankEligibleCandidates([
      { candidate: cand("jupiter", {}), cost: { netOutputUsd: jup, estimatedTotalCostPct: 0.1 } as never },
      { candidate: cand("raydium", {}), cost: { netOutputUsd: 100, estimatedTotalCostPct: 0.1 } as never },
    ]);
    const inside = pair(100 * (1 - eps * 0.9));
    const outside = pair(100 * (1 - eps * 1.1));
    return inside.ranked[0].candidate.providerId === "jupiter" && inside.decidedBy === "in_app_execution" &&
      outside.ranked[0].candidate.providerId === "raydium" && outside.decidedBy === "net_output";
  })(), "band edge");
  add("SWC-42: the preference never reorders anything else — an in-app winner is untouched, and a three-way keeps the rest in economic order", (() => {
    const inAppAlreadyWins = rankEligibleCandidates([
      { candidate: cand("jupiter", {}), cost: { netOutputUsd: 100, estimatedTotalCostPct: 0.1 } as never },
      { candidate: cand("raydium", {}), cost: { netOutputUsd: 99.99, estimatedTotalCostPct: 0.1 } as never },
    ]);
    const threeWay = rankEligibleCandidates([
      { candidate: cand("orca", {}), cost: { netOutputUsd: 100, estimatedTotalCostPct: 0.1 } as never },
      { candidate: cand("raydium", {}), cost: { netOutputUsd: 99.99, estimatedTotalCostPct: 0.1 } as never },
      { candidate: cand("jupiter", {}), cost: { netOutputUsd: 99.98, estimatedTotalCostPct: 0.1 } as never },
    ]);
    return inAppAlreadyWins.decidedBy === "net_output" && inAppAlreadyWins.ranked[0].candidate.providerId === "jupiter" &&
      threeWay.ranked.map((r) => r.candidate.providerId).join(">") === "jupiter>orca>raydium" && threeWay.decidedBy === "in_app_execution";
  })(), "minimal reorder");
  add("SWC-43: an unpriced route is never 'within the band' — an unknown is not a tie", (() => {
    const a = rankEligibleCandidates([
      { candidate: cand("jupiter", {}), cost: { netOutputUsd: null, estimatedTotalCostPct: 0.1 } as never },
      { candidate: cand("raydium", {}), cost: { netOutputUsd: 100, estimatedTotalCostPct: 0.1 } as never },
    ]);
    return a.ranked[0].candidate.providerId === "raydium" && a.decidedBy !== "in_app_execution" && !a.economicallyEquivalent;
  })(), "unknown is not a tie");
  add("SWC-39: decidedBy is null with fewer than two eligible candidates — nothing was decided", (() => {
    const a = rankEligibleCandidates([{ candidate: cand("jupiter", {}), cost: { netOutputUsd: 100 } as never }]);
    return a.decidedBy === null;
  })(), "nothing to decide");

  add("SWC-31: buildProviderSwapUrl maps native SOL to the wrapped-SOL alias for Raydium and includes the amount when supported", (() => { const u = buildProviderSwapUrl("raydium", WSOL, USDC, "5"); return /inputMint=sol/.test(u) && /inputAmount=5/.test(u); })(), "sol alias + amount");

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 23C.1 — rail wiring: exact SwapActionReadiness derived per card from production assessments, and Demo
 * determinism. Sync (deriveRailSwapActions is pure). Demo-fetcher async checks live in swapQuoteServerFixtures.
 * ------------------------------------------------------------------ */
export function runRailSwapActionFixtureChecks(): SwapFixtureCheck[] {
  const checks: SwapFixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  // Build the stub card with the REAL card vocabulary, taken from the mapper itself
  // rather than written out again here. These stubs used to carry only the ENGINE
  // category and no `type` at all, so they agreed with the bug in deriveRailSwapActions
  // (which compared engine category names a card never carries) and every check below
  // passed while the feature produced nothing in the app.
  const card = (id: string, engineCategory: SuggestionCategory) =>
    ({ id, type: CARD_TYPE[engineCategory], category: CARD_CATEGORY[engineCategory] } as unknown as SuggestionCardState);
  const gen = QUOTED_AT;

  // Rebalance stables_to_crypto → ready USDC→SOL.
  const rb = deriveRailSwapActions({ cards: [card("rebalance_to_plan", "rebalance")], generatedAt: gen, rebalance: { assessment: { direction: "stables_to_crypto", requiredCorrectionUsd: 1_000_000 } as never, usdcSource: { verifiedExcessValueUsd: 500, selectionState: "selected" } as never, nativeSolSource: { technicallyAvailableLamports: null, sourceEligibilityState: "unavailable" } as never, usdcUnitPriceUsd: 1, solUnitPriceUsd: 150 } });
  add("SWR-1: real-wallet Rebalance card → exact ready USDC→SOL SwapActionContext (via 23A adapter)", (() => { const a = rb["rebalance_to_plan"]; return a?.status === "ready" && a.legs[0].inputAsset.mint === USDC && a.legs[0].outputAsset.mint === WSOL && a.legs[0].inputAmountRaw === "500000000"; })(), "rb ready");
  // Rebalance crypto_to_stables → SOL→USDC using reserve-netted lamports.
  const rb2 = deriveRailSwapActions({ cards: [card("rebalance_to_plan", "rebalance")], generatedAt: gen, rebalance: { assessment: { direction: "crypto_to_stables", requiredCorrectionUsd: 1_000_000 } as never, usdcSource: { verifiedExcessValueUsd: 0, selectionState: "no_excess" } as never, nativeSolSource: { technicallyAvailableLamports: 2_000_000_000, sourceEligibilityState: "eligible" } as never, usdcUnitPriceUsd: 1, solUnitPriceUsd: 150 } });
  add("SWR-2: Rebalance crypto_to_stables → SOL→USDC using reserve-netted lamports (no UI reserve recompute)", (() => { const a = rb2["rebalance_to_plan"]; return a?.status === "ready" && a.legs[0].inputAsset.mint === WSOL && a.legs[0].outputAsset.mint === USDC && a.legs[0].inputAmountRaw === "2000000000"; })(), "rb c2s");
  // Trim → token→USDC.
  const trim = deriveRailSwapActions({ cards: [card("trim_long_tail_assets", "trim")], generatedAt: gen, trimHoldings: [{ holdingId: "h", mint: "Mint111111111111111111111111111111111111111", decimals: 6, rawBalance: "5000000", uiAmount: 5, recognizedValueUsd: 200, symbol: "BONK", reviewEligibilityState: "eligible", actionabilityState: "transferable", coreAssetState: "non_core" } as never] });
  add("SWR-3: real-wallet Trim card → exact ready token→USDC action (exact raw balance)", (() => { const a = trim["trim_long_tail_assets"]; return a?.status === "ready" && a.legs[0].outputAsset.mint === USDC && a.legs[0].inputAmountRaw === "5000000"; })(), "trim ready");
  // Funded DCA → ready.
  const dcaSug = (planKind: string, sourceAssetId: string | undefined, targetAssetId: string, targetSymbol: string) => ({ id: "dca", category: "dca", amount: { valueUsd: 300 }, contributionPlan: { planKind, sourceAssetId, targetAssetId, targetId: "sol", targetSymbol, amountKind: "exact", exactAmountUsd: 300 } }) as never;
  const dcaFunded = deriveRailSwapActions({ cards: [card("dca", "dca")], generatedAt: gen, contributionSuggestion: dcaSug("staged_excess_usdc_dca", "usdc", WSOL, "SOL") });
  add("SWR-4: funded DCA (staged excess USDC → SOL) → ready action", dcaFunded["dca"]?.status === "ready" && dcaFunded["dca"].status === "ready" && dcaFunded["dca"].legs[0].outputAsset.mint === WSOL, "dca funded");
  const dcaFuture = deriveRailSwapActions({ cards: [card("dca", "dca")], generatedAt: gen, contributionSuggestion: dcaSug("recurring_dca", undefined, WSOL, "SOL") });
  add("SWR-5: unfunded future DCA → not_ready_for_quote (NO network; source never assumed)", dcaFuture["dca"]?.status === "not_ready_for_quote", `status=${dcaFuture["dca"]?.status}`);
  const dcaUsdc = deriveRailSwapActions({ cards: [card("dca", "dca")], generatedAt: gen, contributionSuggestion: dcaSug("staged_excess_usdc_dca", "usdc", "usdc", "USDC") });
  add("SWR-6: DCA USDC → USDC → not_required (no swap, no request)", dcaUsdc["dca"]?.status === "not_required", `status=${dcaUsdc["dca"]?.status}`);
  // Buffer / staking cards → no swap entry.
  const nonSwap = deriveRailSwapActions({ cards: [card("top_up_buffer", "buffer"), card("stake_idle_sol", "staking")], generatedAt: gen });
  add("SWR-7: buffer / staking cards → NO swap action entry (no route section, no request)", nonSwap["top_up_buffer"] === undefined && nonSwap["stake_idle_sol"] === undefined, "non-swap none");
  // Immutability: derivation does not mutate its inputs.
  const cardsIn = [card("rebalance_to_plan", "rebalance")];
  const before = JSON.stringify(cardsIn);
  deriveRailSwapActions({ cards: cardsIn, generatedAt: gen, rebalance: { assessment: { direction: "stables_to_crypto", requiredCorrectionUsd: 1_000_000 } as never, usdcSource: { verifiedExcessValueUsd: 500, selectionState: "selected" } as never, nativeSolSource: { technicallyAvailableLamports: null, sourceEligibilityState: "unavailable" } as never, usdcUnitPriceUsd: 1, solUnitPriceUsd: 150 } });
  add("SWR-8: deriveRailSwapActions does NOT mutate cards/assessments (read-only)", JSON.stringify(cardsIn) === before, "no mutation");

  // Wiring guards (source scans).
  const readSrc = (rel: string) => { try { return readFileSync(`${process.cwd()}/${rel}`, "utf8"); } catch { return ""; } };
  const rail = readSrc("src/components/RealWalletSuggestionsRail.tsx");
  add("SWR-9: the shared rail passes the SNAPSHOT's swapAction + isDca + fetcher to BOTH the contribution (DCA) and details (Rebalance/Trim) modals", (rail.match(/swapAction=\{opened\??\.swapAction\}/g) ?? []).length >= 2 && (rail.match(/swapQuoteFetcher=\{opened\??\.swapQuoteFetcher\}/g) ?? []).length >= 2 && /swapQuoteIsDca=\{selectedCard\?\.type === "dca_buy"\}/.test(rail)
    // Pin the DISCRIMINATOR, not just the prop: this assertion used to require the
    // expression `selectedCard?.category === "dca"`, which a card never satisfies
    // (its category is "contribution_plan"), so the test enforced the dead check.
    && !/selectedCard\?\.category === "(dca|rebalance|trim|buffer|stable_yield|staking)"/.test(rail), "rail wiring");
  // SWR-10 said no request happens before the review OPENS. The review now opens with its route already
  // chosen, so the request moved to the PRESS of Review — still never earlier: not on render, not on hover,
  // not for a card nobody asked about.
  add("SWR-10: no quote request occurs before Review is PRESSED — the prefetch is called only from the review handler, and the hook loads only when enabled", (() => {
    const hook = readSrc("src/components/swapQuote/useSwapQuoteComparison.ts");
    const modal = readSrc("src/components/SuggestionReviewModal.tsx");
    const handler = rail.slice(rail.indexOf("const onReviewSuggestion = "), rail.indexOf("const selectedCard = "));
    const railCode = rail.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    const everywhere = (railCode.match(/prefetchSwapQuoteComparison\(/g) ?? []).length;
    return /if \(!enabled\b/.test(hook) && /swapAction &&[^\n]*\? \(/.test(modal) && everywhere === 1 && /prefetchSwapQuoteComparison\(/.test(handler);
  })(), "request on press only");
  // SWR-14 — pin the id match, so a later change cannot quietly start quoting a
  // contribution that has not arrived. A split contribution renders TWO dca_buy cards
  // whose ids cannot both equal the single suggestion's; those legs carry no funding
  // source, so they must produce no action rather than a guessed one.
  add("SWR-14: a dca_buy card whose id does NOT match the contribution suggestion gets NO swap action (split legs are unfunded; source never assumed)", (() => {
    const out = deriveRailSwapActions({
      cards: [card("contribution_split_sol", "dca"), card("contribution_split_usdc", "dca")],
      generatedAt: gen,
      contributionSuggestion: dcaSug("staged_excess_usdc_dca", "usdc", WSOL, "SOL"),
    });
    return Object.keys(out).length === 0;
  })(), "split legs unquoted");

  // SWR-12/13 — the vocabulary guard. Every check above builds its own stub card, so
  // none of them can catch deriveRailSwapActions matching a value the MAPPER never
  // emits. These two assert against the mapper's real output instead: that is the only
  // thing that would have caught the original bug, where the function returned {} for
  // every real rail while all of SWR-1..7 passed.
  add("SWR-12: the card vocabulary the mapper emits is DISJOINT from the engine's for the swap families", (() => {
    const engineNames = ["rebalance", "trim", "dca"] as const;
    return engineNames.every((c) => CARD_CATEGORY[c] !== (c as string) && CARD_TYPE[c] !== (c as string));
  })(), "disjoint");
  add("SWR-13: a card carrying the MAPPER's own type/category still derives a swap action (guards against matching engine names)", (() => {
    const real = { id: "x", type: CARD_TYPE.rebalance, category: CARD_CATEGORY.rebalance } as unknown as SuggestionCardState;
    const out = deriveRailSwapActions({ cards: [real], generatedAt: gen, rebalance: { assessment: { direction: "stables_to_crypto", requiredCorrectionUsd: 1_000_000 } as never, usdcSource: { verifiedExcessValueUsd: 500, selectionState: "selected" } as never, nativeSolSource: { technicallyAvailableLamports: null, sourceEligibilityState: "unavailable" } as never, usdcUnitPriceUsd: 1, solUnitPriceUsd: 150 } });
    return out["x"]?.status === "ready";
  })(), "mapper vocabulary matches");
  add("SWR-11: Demo rails carry a DETERMINISTIC fetcher (offline) — never the live client", /swapQuoteFetcher: demoSwapQuoteFetcher/.test(readSrc("src/pages/DemoDashboardPage.tsx")) && /Never calls a provider or the WealthSmith service/.test(readSrc("src/suggestions/swapQuote/demoSwapQuote.ts")), "demo offline");

  return checks;
}
