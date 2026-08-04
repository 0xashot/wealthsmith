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
  GUARDRAIL_STATUS_NOT_EVALUATED,
} from "./engineThresholds";
import { notApplicableProtocolSelection } from "./protocolSelection";
import { buildReviewDetails, pctMetric, metric } from "./suggestionReviewDetails";
import type { RebalanceAssessment, RebalanceUsdcSource, NativeSolRebalanceSourceAssessment } from "./rebalanceAssessment";
import { cryptoToStablesSourceGate } from "./rebalanceAssessment";

const LAMPORTS_PER_SOL = 1_000_000_000;

/** Percent display: 1-decimal, trailing .0 dropped (e.g. 10 → "10", 70.5 → "70.5"). Matches the allocation cards. */
const pctText = (n: number): string => (Math.round(n * 10) / 10).toLocaleString("en-US", { maximumFractionDigits: 1 });

/**
 * Step 24J — the market-INCLUDED disclosure ("Current market conditions are included as 10% …" + CoinMarketCap
 * attribution) was removed from the Rebalance review body per product copy. The market factor is still used in the
 * target calculation; only its explanatory paragraph is gone. The DEGRADED-exclusion disclosure is retained: when
 * market data was stale/unavailable it honestly explains the exclusion + renormalization. Never timing/score/band.
 */
function marketReviewSuffix(a: RebalanceAssessment): string {
  if (a.targetConfidence === "degraded_market_excluded") {
    return " Market data was unavailable or outside its approved freshness window. The market component was excluded, and the remaining profile factors were renormalized.";
  }
  return "";
}

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
  const solOk = solPriceFresh && typeof solPriceUsd === "number" && solPriceUsd > 0;
  const estimatedDestinationSol = solOk ? suggestedAmountUsd / (solPriceUsd as number) : null;
  const delta = assessment.rawCryptoDeltaPct ?? 0; // Slice 3.1 — raw magnitude drives scoring; display rounding never scores.
  const ratio = Math.min(Math.abs(delta) / 100, 1);

  // 24J — plain-language card/modal copy + a focused before/after-swap card set. The "after swap" allocation is
  // derived deterministically from how much of the required correction the suggested amount covers (a full swap
  // reaches the target; a partial swap moves proportionally toward it). Stable falls by exactly what crypto rises.
  const curCrypto = assessment.currentCryptoPct ?? 0;
  const tgtCrypto = assessment.targetCryptoPct ?? 0;
  const curStable = assessment.currentStablePct ?? 0;
  const swapFraction = requiredCorrectionUsd > 0 ? Math.min(suggestedAmountUsd / requiredCorrectionUsd, 1) : 0;
  const swapUsdText = `$${Math.round(suggestedAmountUsd).toLocaleString("en-US")}`;
  const afterCrypto = curCrypto + swapFraction * (tgtCrypto - curCrypto);
  const afterStable = curStable - (afterCrypto - curCrypto);
  const goalClause = partial ? "to move closer to your target" : "to reach your target";
  // "USDC above your Safety Buffer" states the source AND the protection in one
  // phrase — the old copy said "excess USDC … while keeping your Safety Buffer
  // fully funded", which spent a clause restating what "above your buffer"
  // already means. The buffer guarantee is unchanged: the source is still only
  // ever the excess above it (see the buffer_protection guardrail below).
  const cardBody =
    `Crypto makes up ${pctText(curCrypto)}% of your portfolio, below your ${pctText(tgtCrypto)}% target. ` +
    `Swap ${swapUsdText} of USDC above your Safety Buffer into SOL ${goalClause}.`;

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
    // Modal reason is the plain-language card body (+ a degraded-market exclusion note only when applicable).
    reason: cardBody + marketReviewSuffix(assessment),
    hideMetricsHeading: true,
    hideGuardrails: true,
    metrics: [
      { ...metric("Send", `${Math.round(suggestedAmountUsd).toLocaleString("en-US")} USDC`, "count"), subValue: swapUsdText },
      ...(estimatedDestinationSol !== null ? [{ ...metric("Receive", `~${pctText(estimatedDestinationSol)} SOL`, "count"), subValue: swapUsdText }] : []),
      pctMetric("Current crypto allocation", curCrypto),
      pctMetric("Crypto allocation after swap", afterCrypto),
      pctMetric("Current stablecoin allocation", curStable),
      pctMetric("Stablecoin allocation after swap", afterStable),
    ],
    // No "How this was calculated" section for Rebalance — the before/after cards carry the source→target context;
    // the read-only "Swap Route" section carries the execution figures.
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
    descriptionOverride: cardBody,
    action_kind: "review_only",
    is_actionable: true,
    is_top_pick: false,
    amount: { valueUsd: suggestedAmountUsd, label: partial ? "Suggested partial rebalance" : "Suggested rebalance" },
    // 23C.1 — direct, direction-aware card line (source → destination). Read-only: the CTA stays "Review".
    impactTextOverride: `Swap $${Math.round(suggestedAmountUsd).toLocaleString("en-US")} of USDC to SOL`,
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

  const delta = assessment.rawCryptoDeltaPct ?? 0; // Slice 3.1 — raw magnitude drives scoring; display rounding never scores.
  const ratio = Math.min(Math.abs(delta) / 100, 1);

  // 24J — mirror of the USDC→SOL card: plain-language copy + a focused before/after-swap card set. Crypto falls by
  // how much of the required correction the suggested amount covers (full → target); stable rises by the same amount.
  const curCrypto = assessment.currentCryptoPct ?? 0;
  const tgtCrypto = assessment.targetCryptoPct ?? 0;
  const curStable = assessment.currentStablePct ?? 0;
  const swapFraction = requiredCorrectionUsd > 0 ? Math.min(suggestedAmountUsd / requiredCorrectionUsd, 1) : 0;
  const swapUsdText = `$${Math.round(suggestedAmountUsd).toLocaleString("en-US")}`;
  const afterCrypto = curCrypto - swapFraction * (curCrypto - tgtCrypto);
  const afterStable = curStable + (curCrypto - afterCrypto);
  const cardBody =
    `Your crypto allocation is above target. ` +
    `Swap $${Math.round(suggestedAmountUsd).toLocaleString("en-US")} of excess SOL to USDC to move closer to your target ` +
    `while keeping 0.1 SOL available for fees and wallet activity.`;

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
    // Modal reason is the plain-language card body (+ a degraded-market exclusion note only when applicable).
    reason: cardBody + marketReviewSuffix(assessment),
    hideMetricsHeading: true,
    hideGuardrails: true,
    metrics: [
      { ...metric("Send", `~${pctText(approximateSourceSol)} SOL`, "count"), subValue: swapUsdText },
      { ...metric("Receive", `~${Math.round(suggestedAmountUsd).toLocaleString("en-US")} USDC`, "count"), subValue: swapUsdText },
      pctMetric("Current crypto allocation", curCrypto),
      pctMetric("Crypto allocation after swap", afterCrypto),
      pctMetric("Current stablecoin allocation", curStable),
      pctMetric("Stablecoin allocation after swap", afterStable),
    ],
    // No "How this was calculated" section — the before/after cards carry the source→target context; the read-only
    // "Swap Route" section carries the execution figures.
  });

  return {
    id: REBALANCE_SUGGESTION_ID,
    category: "rebalance",
    reason_codes: ["crypto_overweight"], // full/partial is conveyed via review details, not a new code
    title_key: "suggestion.rebalance.title",
    description_key: partial
      ? "suggestion.rebalance.crypto_to_stables.partial.description"
      : "suggestion.rebalance.crypto_to_stables.full.description",
    descriptionOverride: cardBody,
    action_kind: "review_only",
    is_actionable: true,
    is_top_pick: false,
    amount: { valueUsd: suggestedAmountUsd, label: partial ? "Suggested partial rebalance" : "Suggested rebalance" },
    // 23C.1 — direct, direction-aware card line (source → destination). Read-only: the CTA stays "Review".
    impactTextOverride: `Swap $${Math.round(suggestedAmountUsd).toLocaleString("en-US")} of SOL to USDC`,
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
