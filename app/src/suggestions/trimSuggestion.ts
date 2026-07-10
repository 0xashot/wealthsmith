/**
 * trimSuggestion — the deterministic "Review Long-Tail Assets" rule (category
 * `trim`; rules/suggestion-engine-rules.md). Pure over SuggestionEngineInputs:
 * no fetching, no pricing, no AI, no token/replacement choice.
 *
 * It flags NON-CORE liquid wallet tokens (not SOL/WSOL, not stablecoins, not
 * LST/stake/protocol) that reach a meaningful long-tail / concentration / noise
 * threshold, so the user can REVIEW that exposure. It never says to sell/swap,
 * never claims a token is bad/unsafe, and never asserts illiquidity — liquidity
 * is not evaluated (there is no real liquidity data), which is surfaced via the
 * `liquidity_not_evaluated` reason code and the `not_evaluated` guardrail.
 *
 * Trim is INTENTIONALLY separate from Capital Efficiency (broad "put idle assets
 * to work"): they answer different questions and may both fire; neither
 * suppresses the other.
 *
 * SAFETY BUFFER COMES FIRST (engine-enforced). Category priority: below
 * Rebalance/Capital Efficiency, above Staking.
 */
import type { WalletPosition } from "../wallet/walletPosition";
import { STABLE_SYMBOLS } from "../wallet/walletSummary";
import type { SuggestionEngineInputs } from "./engineInputs";
import type {
  EngineSuggestion,
  SuggestionGuardrail,
  SuggestionReasonCode,
} from "./engineTypes";
import {
  SUGGESTION_ENGINE_VERSION,
  MIN_TRIM_SUGGESTION_USD,
  TRIM_PORTFOLIO_SHARE_THRESHOLD,
  TRIM_SINGLE_TOKEN_CONCENTRATION_THRESHOLD,
  TRIM_SMALL_POSITION_COUNT_THRESHOLD,
  TRIM_SMALL_POSITION_MAX_USD,
  GUARDRAIL_STATUS_NOT_EVALUATED,
} from "./engineThresholds";
import { notApplicableProtocolSelection } from "./protocolSelection";
import {
  buildReviewDetails,
  usdMetric,
  pctMetric,
  metric,
} from "./suggestionReviewDetails";
import type { ReviewAsset } from "./engineTypes";

/** Stable suggestion ID. */
export const TRIM_SUGGESTION_ID = "trim_long_tail_assets";

/**
 * Approved MVP core-token allowlist: SOL/WSOL + the recognized stablecoins.
 * Anything outside this set (and priced, wallet-held, non-deployed) is "non
 * core" long-tail exposure. An explicit allowlist — never inferred from name.
 */
const CORE_TOKEN_SYMBOLS = new Set<string>(["SOL", "WSOL", ...STABLE_SYMBOLS]);

/** A priced, liquid wallet token that is NOT core (and not an LST/stake/protocol). */
function isNonCoreLiquidToken(p: WalletPosition): boolean {
  return (
    p.source === "wallet" &&
    p.type === "token" &&
    typeof p.priceUsd === "number" &&
    typeof p.valueUsd === "number" &&
    typeof p.uiAmount === "number" &&
    p.uiAmount > 0 &&
    p.symbol.length > 0 &&
    p.name !== "Unknown token" &&
    !CORE_TOKEN_SYMBOLS.has(p.symbol)
  );
}

/**
 * Trigger: fully funded buffer ∧ pricing ∧ a priced total ∧ eligible non-core
 * tokens that hit at least one review rule — aggregate long-tail exposure,
 * single-token concentration, or small-position cleanup. One aggregated
 * suggestion; nothing invented, no token chosen.
 */
export function deriveTrimSuggestion(
  inputs: SuggestionEngineInputs,
  generatedAt: number
): EngineSuggestion | null {
  const sb = inputs.safetyBuffer;
  if (!sb || !sb.fullyFunded) return null;
  if (!inputs.dataQuality.hasPricing) return null;

  const totalPricedUsd = inputs.value.totalUsd;
  if (totalPricedUsd == null || totalPricedUsd <= 0) return null;

  const eligible = inputs.positions.filter(isNonCoreLiquidToken);
  if (eligible.length === 0) return null;

  const totalEligibleTrimValueUsd = eligible.reduce((s, p) => s + (p.valueUsd as number), 0);
  const reasons = new Set<SuggestionReasonCode>();

  // A. Aggregate long-tail exposure.
  if (
    totalEligibleTrimValueUsd >= MIN_TRIM_SUGGESTION_USD &&
    totalEligibleTrimValueUsd / totalPricedUsd >= TRIM_PORTFOLIO_SHARE_THRESHOLD
  ) {
    reasons.add("long_tail_exposure");
    reasons.add("non_core_token_exposure");
  }
  // B. Single-token concentration.
  const concentrated = eligible.some(
    (p) => (p.valueUsd as number) / totalPricedUsd >= TRIM_SINGLE_TOKEN_CONCENTRATION_THRESHOLD
  );
  if (concentrated) {
    reasons.add("token_concentration_review");
    reasons.add("non_core_token_exposure");
  }
  // C. Small-position cleanup.
  const small = eligible.filter((p) => (p.valueUsd as number) <= TRIM_SMALL_POSITION_MAX_USD);
  const smallCombined = small.reduce((s, p) => s + (p.valueUsd as number), 0);
  if (
    small.length >= TRIM_SMALL_POSITION_COUNT_THRESHOLD &&
    smallCombined >= MIN_TRIM_SUGGESTION_USD
  ) {
    reasons.add("small_position_cleanup");
    reasons.add("non_core_token_exposure");
  }

  if (reasons.size === 0) return null;
  // Liquidity is never inferred — always surface that it was not evaluated.
  reasons.add("liquidity_not_evaluated");

  // Deterministic reason-code order.
  const reasonOrder: SuggestionReasonCode[] = [
    "long_tail_exposure",
    "non_core_token_exposure",
    "token_concentration_review",
    "small_position_cleanup",
    "liquidity_not_evaluated",
  ];
  const reason_codes = reasonOrder.filter((c) => reasons.has(c));

  const flaggedTrimValueUsd = totalEligibleTrimValueUsd;
  const hasConcentration = reasons.has("token_concentration_review");
  const hasLongTail = reasons.has("long_tail_exposure");

  const guardrails: SuggestionGuardrail[] = [
    { code: "pricing_available", status: "passed" },
    { code: "buffer_protection", status: "passed" },
    { code: "token_scope", status: "passed" },
    { code: "concentration_review", status: hasConcentration ? "passed" : GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "liquidity_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "slippage_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "cost_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "token_selection", status: GUARDRAIL_STATUS_NOT_EVALUATED },
  ];

  const triggers: string[] = [];
  if (hasLongTail) triggers.push("aggregate long-tail exposure");
  if (hasConcentration) triggers.push("single-token concentration");
  if (reasons.has("small_position_cleanup")) triggers.push("small-position cleanup");
  const involvedAssets: ReviewAsset[] = eligible.map((p) => ({
    symbol: p.symbol,
    name: p.name,
    valueUsd: p.valueUsd as number,
    amount: p.uiAmount as number,
    role: "long_tail_asset",
  }));
  const protocolSelection = notApplicableProtocolSelection("selection_not_required");
  const reviewDetails = buildReviewDetails({
    category: "trim",
    actionKind: "review_only",
    guardrails,
    protocolSelection,
    reason: `Flagged for review: ${triggers.join(", ")}.`,
    metrics: [
      usdMetric("Long-tail assets to review", flaggedTrimValueUsd),
      metric("Token count", eligible.length, "count"),
      pctMetric("Portfolio share", Math.round((flaggedTrimValueUsd / totalPricedUsd) * 1000) / 10),
    ],
    involvedAssets,
    calculations: [
      {
        label: "Long-tail exposure vs portfolio",
        formula: "long-tail value ÷ portfolio value",
        currentValue: flaggedTrimValueUsd,
        targetValue: totalPricedUsd,
        threshold: Math.round(TRIM_PORTFOLIO_SHARE_THRESHOLD * 1000) / 10,
        unit: "USD",
      },
    ],
  });

  return {
    id: TRIM_SUGGESTION_ID,
    category: "trim",
    reason_codes,

    title_key: "suggestion.trim.title",
    description_key: "suggestion.trim.description",

    action_kind: "review_only",
    is_actionable: true,
    is_top_pick: false, // set only by selectTopPick

    amount: {
      valueUsd: flaggedTrimValueUsd,
      label: "Long-tail assets to review",
    },

    // Long-tail review — proposes no protocol (token selection is also deferred).
    protocolSelection,
    reviewDetails,

    scores: {
      impact: Math.min(flaggedTrimValueUsd / totalPricedUsd, 1),
      urgency: hasConcentration ? 0.45 : hasLongTail ? 0.35 : 0.25,
      efficiency: 0.45,
    },
    guardrails,

    engine_version: SUGGESTION_ENGINE_VERSION,
    timestamp: generatedAt,
  };
}
