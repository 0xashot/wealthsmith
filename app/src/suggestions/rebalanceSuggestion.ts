/**
 * rebalanceSuggestion — the canonical production Rebalance card mapper (Steps 18C/18D/18F).
 *
 * `buildRebalanceCardFromAssessment` is the ONE authoritative card builder. It renders BOTH supported
 * directions behind the same `rebalance_to_plan` contract, from the canonical `RebalanceAssessment` plus the
 * direction-specific verified source (direct-wallet USDC for stables→crypto; direct-wallet native SOL for
 * crypto→stables). Amounts are capped by both the required correction and the verified source; review-only;
 * no route/quote/transaction/signature/execution behavior.
 *
 * The pre-canonical bucket calculation was relocated to `rebalanceSuggestionLegacy.ts` (Step 18G) and is no
 * longer reachable from any mounted/Demo/testing-production path — the engine no longer falls back to it.
 */
import type { EngineSuggestion, SuggestionGuardrail } from "./engineTypes";
import {
  SUGGESTION_ENGINE_VERSION,
  MIN_SUGGESTION_AMOUNT_USD,
  REBALANCE_DELTA_THRESHOLD_PCT,
  GUARDRAIL_STATUS_NOT_EVALUATED,
} from "./engineThresholds";
import { notApplicableProtocolSelection } from "./protocolSelection";
import { buildReviewDetails, usdMetric, pctMetric, metric } from "./suggestionReviewDetails";
import type { RebalanceAssessment, RebalanceUsdcSource, NativeSolRebalanceSourceAssessment } from "./rebalanceAssessment";
import { cryptoToStablesSourceGate } from "./rebalanceAssessment";

const LAMPORTS_PER_SOL = 1_000_000_000;

/** Stable suggestion ID (IDs must not change across runs/copy updates). */
export const REBALANCE_SUGGESTION_ID = "rebalance_to_plan";

/**
 * Step 18C/18F — the PHASE-ONE production Rebalance card, built from the canonical RebalanceAssessment behind
 * the SAME `rebalance_to_plan` contract (id/category/title/review-only unchanged). Emits a card for the two
 * fully-verifiable directions:
 *   • stables_to_crypto — selected direct-wallet USDC source above the Safety Buffer → native SOL (18C/18D);
 *   • crypto_to_stables — available direct-wallet native SOL (minus the approved 0.1 SOL operating reserve)
 *     → canonical wallet USDC (18F).
 * Both are capped by BOTH the required correction and verified source availability, ≥ $50, read-only. Never
 * falls back to the legacy uncapped bucket amount; never emits for `within_threshold` / `unresolved`. No
 * route, quote, swap venue, slippage, execution fee, or received-amount is ever computed.
 */
export function buildRebalanceCardFromAssessment(
  assessment: RebalanceAssessment,
  usdcSource: RebalanceUsdcSource,
  nativeSolSource: NativeSolRebalanceSourceAssessment,
  solPriceUsd: number | null,
  solPriceFresh: boolean,
  generatedAt: number
): EngineSuggestion | null {
  if (assessment.calculationGate.status !== "allowed") return null;
  if (assessment.destinationEligibilityGate.status !== "allowed") return null;
  if (assessment.direction === "stables_to_crypto") return buildStablesToCryptoCard(assessment, usdcSource, solPriceUsd, solPriceFresh, generatedAt);
  if (assessment.direction === "crypto_to_stables") return buildCryptoToStablesCard(assessment, nativeSolSource, solPriceUsd, solPriceFresh, generatedAt);
  return null;
}

/** 18C/18D — verified excess direct-wallet USDC → native SOL (unchanged output). */
function buildStablesToCryptoCard(
  assessment: RebalanceAssessment,
  source: RebalanceUsdcSource,
  solPriceUsd: number | null,
  solPriceFresh: boolean,
  generatedAt: number
): EngineSuggestion | null {
  if (source.selectionState !== "selected") return null;
  const requiredCorrectionUsd = assessment.requiredCorrectionUsd;
  // Cap by BOTH required correction and verified USDC excess (never the Safety Buffer, never negative).
  const suggestedAmountUsd = Math.min(requiredCorrectionUsd, source.verifiedExcessValueUsd);
  if (suggestedAmountUsd < MIN_SUGGESTION_AMOUNT_USD) return null;
  const partial = suggestedAmountUsd < requiredCorrectionUsd;
  const dest = assessment.proposedDestination; // native SOL (registry-bound)
  const solOk = solPriceFresh && typeof solPriceUsd === "number" && solPriceUsd > 0;
  const estimatedDestinationSol = solOk ? suggestedAmountUsd / (solPriceUsd as number) : null;
  const delta = assessment.cryptoDeltaPct ?? 0;
  const ratio = Math.min(Math.abs(delta) / 100, 1);

  const guardrails: SuggestionGuardrail[] = [
    { code: "pricing_available", status: "passed" },
    { code: "buffer_protection", status: "passed" }, // source is excess ABOVE the buffer; buffer untouched
    { code: "allocation_delta", status: "passed" },
    { code: "min_trade_size", status: "passed" },
    { code: "cost_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "liquidity_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "slippage_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
  ];
  const protocolSelection = notApplicableProtocolSelection("selection_not_required");
  const reviewDetails = buildReviewDetails({
    category: "rebalance",
    actionKind: "review_only",
    guardrails,
    protocolSelection,
    reason: "Your stablecoin allocation is above your target; excess direct-wallet USDC could move toward SOL while the Safety Buffer stays covered.",
    metrics: [
      pctMetric("Current crypto allocation", assessment.currentCryptoPct ?? 0),
      pctMetric("Target crypto allocation", assessment.targetCryptoPct ?? 0),
      pctMetric("Current stablecoin allocation", assessment.currentStablePct ?? 0),
      pctMetric("Target stablecoin allocation", assessment.targetStablePct ?? 0),
      pctMetric("Allocation delta", delta),
      usdMetric("Required correction", requiredCorrectionUsd),
      usdMetric("Verified excess USDC (above buffer)", source.verifiedExcessValueUsd),
      usdMetric("Suggested review amount", suggestedAmountUsd),
      ...(estimatedDestinationSol !== null ? [metric("Approx. SOL (informational)", estimatedDestinationSol, "token_amount", "SOL")] : []),
    ],
    involvedAssets: [
      { symbol: "USDC", role: "source_asset", valueUsd: source.verifiedExcessValueUsd },
      { symbol: dest?.native ? "SOL" : "Crypto", role: "target_bucket" },
    ],
    calculations: [
      { label: "Allocation drift", formula: "current − target", currentValue: assessment.currentCryptoPct ?? 0, targetValue: assessment.targetCryptoPct ?? 0, difference: delta, threshold: REBALANCE_DELTA_THRESHOLD_PCT, unit: "%" },
      { label: "Safety Buffer protected", formula: "only direct-wallet USDC above the buffer is used", currentValue: source.verifiedTransferableValueUsd, targetValue: source.reservedForSafetyBufferUsd, difference: source.verifiedExcessValueUsd, unit: "USD" },
      { label: "Amount capped to verified source", formula: "min(required correction, verified excess USDC)", currentValue: requiredCorrectionUsd, targetValue: source.verifiedExcessValueUsd, difference: suggestedAmountUsd, unit: "USD" },
    ],
  });

  return {
    id: REBALANCE_SUGGESTION_ID,
    category: "rebalance",
    reason_codes: ["crypto_underweight"], // full/partial is conveyed via review details, not a new code
    title_key: "suggestion.rebalance.title",
    // 18D — source/destination/buffer + full-vs-partial are communicated in the PRIMARY card copy.
    description_key: partial
      ? "suggestion.rebalance.stables_to_crypto.partial.description"
      : "suggestion.rebalance.stables_to_crypto.full.description",
    action_kind: "review_only",
    is_actionable: true,
    is_top_pick: false,
    amount: { valueUsd: suggestedAmountUsd, label: partial ? "Suggested partial rebalance amount" : "Suggested rebalance amount" },
    from: { bucket: "stables" },
    to: { bucket: "crypto" },
    delta_percent: delta,
    protocolSelection,
    reviewDetails,
    scores: { impact: ratio * 0.9, urgency: ratio, efficiency: null },
    guardrails,
    engine_version: SUGGESTION_ENGINE_VERSION,
    timestamp: generatedAt,
  };
}

/**
 * Step 18F — available direct-wallet native SOL (minus the approved fixed 0.1 SOL operating reserve) →
 * canonical wallet USDC. A card requires: crypto_to_stables direction, calc gate allowed, canonical USDC
 * destination allowed, native-SOL source gate allowed, a fresh authoritative SOL price, technically-available
 * source value ≥ $50, and a suggested amount ≥ $50. The suggested amount is capped by BOTH the required
 * correction and the verified source value; the approximate source SOL is additionally capped in EXACT
 * lamports so it can never exceed the available (post-reserve) balance. The 0.1 SOL reserve is never part of
 * the source. NO route/quote/swap-venue/slippage/execution-fee/received-USDC amount is computed — review-only.
 */
function buildCryptoToStablesCard(
  assessment: RebalanceAssessment,
  nativeSol: NativeSolRebalanceSourceAssessment,
  solPriceUsd: number | null,
  solPriceFresh: boolean,
  generatedAt: number
): EngineSuggestion | null {
  // Source gate: reserve approved + wallet fresh + price fresh + ≥ $50 available (fail-closed otherwise).
  if (cryptoToStablesSourceGate(nativeSol).status !== "allowed") return null;
  const solOk = solPriceFresh && typeof solPriceUsd === "number" && solPriceUsd > 0;
  if (!solOk) return null; // a fresh authoritative SOL price is REQUIRED for a crypto→stables card
  const availableValueUsd = nativeSol.technicallyAvailableValueUsd ?? 0;
  if (availableValueUsd < MIN_SUGGESTION_AMOUNT_USD) return null;

  const requiredCorrectionUsd = assessment.requiredCorrectionUsd;
  // Cap by BOTH required correction and verified available native-SOL value (never negative, never the reserve).
  const suggestedAmountUsd = Math.min(requiredCorrectionUsd, availableValueUsd);
  if (suggestedAmountUsd < MIN_SUGGESTION_AMOUNT_USD) return null;
  const partial = availableValueUsd < requiredCorrectionUsd; // available cannot cover the whole correction

  // Approximate source SOL for the informational metric — capped in EXACT lamports so it never exceeds the
  // available (post-reserve) balance. Deterministic floor when converting USD→SOL→lamports.
  const availableLamports = nativeSol.technicallyAvailableLamports ?? 0;
  const rawApproxLamports = BigInt(Math.floor((suggestedAmountUsd / (solPriceUsd as number)) * LAMPORTS_PER_SOL));
  const cappedApproxLamports = rawApproxLamports < BigInt(availableLamports) ? rawApproxLamports : BigInt(availableLamports);
  const approximateSourceSol = Number(cappedApproxLamports) / LAMPORTS_PER_SOL;

  const delta = assessment.cryptoDeltaPct ?? 0;
  const ratio = Math.min(Math.abs(delta) / 100, 1);
  const dest = assessment.proposedDestination; // canonical wallet USDC (registry-bound)

  const guardrails: SuggestionGuardrail[] = [
    { code: "pricing_available", status: "passed" },
    { code: "buffer_protection", status: "passed" }, // Safety Buffer governed separately; still gated by calc
    { code: "allocation_delta", status: "passed" },
    { code: "min_trade_size", status: "passed" },
    // No route/quote/slippage infrastructure is used — honestly not_evaluated (never invented).
    { code: "cost_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "liquidity_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "slippage_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
  ];
  const protocolSelection = notApplicableProtocolSelection("selection_not_required");
  const reviewDetails = buildReviewDetails({
    category: "rebalance",
    actionKind: "review_only",
    guardrails,
    protocolSelection,
    reason: "Your crypto allocation is above your target; available direct-wallet SOL could move toward USDC while 0.1 SOL is kept for wallet operations.",
    metrics: [
      pctMetric("Current crypto allocation", assessment.currentCryptoPct ?? 0),
      pctMetric("Target crypto allocation", assessment.targetCryptoPct ?? 0),
      pctMetric("Current stablecoin allocation", assessment.currentStablePct ?? 0),
      pctMetric("Target stablecoin allocation", assessment.targetStablePct ?? 0),
      pctMetric("Allocation delta", delta),
      usdMetric("Required correction", requiredCorrectionUsd),
      metric("Recognized wallet SOL", nativeSol.recognizedSol ?? 0, "token_amount", "SOL"),
      metric("Operating reserve (kept)", nativeSol.requiredNativeReserveSol ?? 0, "token_amount", "SOL"),
      metric("Available SOL after reserve", nativeSol.technicallyAvailableSol ?? 0, "token_amount", "SOL"),
      usdMetric("Available SOL value (source)", availableValueUsd),
      usdMetric("Suggested review amount", suggestedAmountUsd),
      metric("Approx. SOL to move (informational)", approximateSourceSol, "token_amount", "SOL"),
    ],
    involvedAssets: [
      { symbol: "SOL", role: "source_asset", ...(nativeSol.technicallyAvailableValueUsd !== null ? { valueUsd: nativeSol.technicallyAvailableValueUsd } : {}) },
      { symbol: dest?.assetId === "usdc" ? "USDC" : "Stablecoins", role: "target_bucket" },
    ],
    calculations: [
      { label: "Allocation drift", formula: "current − target", currentValue: assessment.currentCryptoPct ?? 0, targetValue: assessment.targetCryptoPct ?? 0, difference: delta, threshold: REBALANCE_DELTA_THRESHOLD_PCT, unit: "%" },
      { label: "Wallet operating reserve protected", formula: "0.1 SOL is withheld from source capacity", currentValue: nativeSol.recognizedSol ?? 0, targetValue: nativeSol.requiredNativeReserveSol ?? 0, difference: nativeSol.technicallyAvailableSol ?? 0, unit: "SOL" },
      { label: "Amount capped to available source", formula: "min(required correction, available SOL value)", currentValue: requiredCorrectionUsd, targetValue: availableValueUsd, difference: suggestedAmountUsd, unit: "USD" },
    ],
  });

  return {
    id: REBALANCE_SUGGESTION_ID,
    category: "rebalance",
    reason_codes: ["crypto_overweight"], // full/partial is conveyed via review details, not a new code
    title_key: "suggestion.rebalance.title",
    description_key: partial
      ? "suggestion.rebalance.crypto_to_stables.partial.description"
      : "suggestion.rebalance.crypto_to_stables.full.description",
    action_kind: "review_only",
    is_actionable: true,
    is_top_pick: false,
    amount: { valueUsd: suggestedAmountUsd, label: partial ? "Suggested partial rebalance amount" : "Suggested rebalance amount" },
    from: { bucket: "crypto" },
    to: { bucket: "stables" },
    delta_percent: delta,
    protocolSelection,
    reviewDetails,
    scores: { impact: ratio * 0.9, urgency: ratio, efficiency: null },
    guardrails,
    engine_version: SUGGESTION_ENGINE_VERSION,
    timestamp: generatedAt,
  };
}
