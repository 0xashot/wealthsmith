/**
 * dcaSuggestion — the deterministic "Review a DCA Plan" rule (category `dca`;
 * rules/suggestion-engine-rules.md). Pure over SuggestionEngineInputs: no
 * fetching, no pricing, no AI, no token choice, no transaction.
 *
 * It suggests reviewing whether the user's PLANNED FUTURE CONTRIBUTION could
 * gradually build crypto exposure toward target when crypto is MODESTLY under
 * target — a gap too small for Rebalance (which the engine runs first and which
 * suppresses DCA). It is contribution-funded only: it never uses Safety Buffer
 * funds, wallet/protocol stablecoins, or stable-yield positions, and never names
 * a specific token (the target is the generic `crypto` bucket).
 *
 * SAFETY BUFFER COMES FIRST (engine-enforced). Category priority places DCA
 * below Rebalance/Capital Efficiency/Staking/Stable Yield, above Position
 * Optimization.
 */
import type { SuggestionEngineInputs } from "./engineInputs";
import type { EngineSuggestion, SuggestionGuardrail } from "./engineTypes";
import {
  SUGGESTION_ENGINE_VERSION,
  MIN_DCA_SUGGESTION_USD,
  DCA_MIN_CRYPTO_UNDERWEIGHT_PCT,
  GUARDRAIL_STATUS_NOT_EVALUATED,
} from "./engineThresholds";
import { notApplicableProtocolSelection } from "./protocolSelection";
import { buildReviewDetails, usdMetric, pctMetric } from "./suggestionReviewDetails";

/** Stable suggestion ID. */
export const DCA_SUGGESTION_ID = "dca_core_exposure";

/**
 * Trigger: fully funded buffer ∧ pricing ∧ a priced total ∧ a recommended +
 * current allocation with crypto UNDER target by at least the minimum
 * underweight ∧ a planned monthly contribution at least the minimum ∧ a crypto
 * target gap at least the minimum. The engine only calls this when Rebalance
 * did not fire (larger gaps are Rebalance's job). Contribution-funded only —
 * never Safety Buffer or existing stables.
 */
export function deriveDcaSuggestion(
  inputs: SuggestionEngineInputs,
  generatedAt: number
): EngineSuggestion | null {
  const sb = inputs.safetyBuffer;
  if (!sb || !sb.fullyFunded) return null;
  if (!inputs.dataQuality.hasPricing) return null;

  const totalPricedUsd = inputs.value.totalUsd;
  if (totalPricedUsd == null || totalPricedUsd <= 0) return null;

  const alloc = inputs.allocation;
  if (
    !alloc ||
    alloc.recommendedCryptoPct == null ||
    alloc.currentCryptoUsd == null ||
    alloc.cryptoDeltaPct == null
  ) {
    return null;
  }

  // Crypto must be UNDER target (delta = current − target < 0) by at least the
  // minimum underweight. Larger gaps are handled by Rebalance (engine-gated).
  const cryptoDeltaPct = alloc.cryptoDeltaPct;
  if (cryptoDeltaPct >= 0) return null;
  const underweightFraction = -cryptoDeltaPct / 100;
  if (underweightFraction < DCA_MIN_CRYPTO_UNDERWEIGHT_PCT) return null;

  // Contribution-funded only.
  const plannedContribution = inputs.goal.monthlyContribution;
  if (plannedContribution == null || plannedContribution < MIN_DCA_SUGGESTION_USD) return null;

  const recommendedCryptoTargetUsd = totalPricedUsd * (alloc.recommendedCryptoPct / 100);
  const targetCryptoGapUsd = recommendedCryptoTargetUsd - alloc.currentCryptoUsd;
  if (targetCryptoGapUsd < MIN_DCA_SUGGESTION_USD) return null;

  // Never more than the monthly contribution, never more than the target gap.
  const suggestedDcaUsd = Math.min(plannedContribution, targetCryptoGapUsd);
  if (suggestedDcaUsd < MIN_DCA_SUGGESTION_USD) return null;

  const guardrails: SuggestionGuardrail[] = [
    { code: "pricing_available", status: "passed" },
    { code: "buffer_protection", status: "passed" },
    { code: "contribution_available", status: "passed" },
    { code: "allocation_gap", status: "passed" },
    // Deferred until a deterministic token-selection rule exists.
    { code: "token_selection", status: GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "cost_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "liquidity_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "slippage_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
  ];

  const protocolSelection = notApplicableProtocolSelection("selection_not_required");
  const reviewDetails = buildReviewDetails({
    category: "dca",
    actionKind: "review_only",
    guardrails,
    protocolSelection,
    metrics: [
      usdMetric("Planned monthly contribution", plannedContribution),
      usdMetric("Crypto target gap", targetCryptoGapUsd),
      usdMetric("Suggested contribution to review", suggestedDcaUsd),
      pctMetric("Crypto underweight", Math.round(underweightFraction * 1000) / 10),
    ],
    involvedAssets: [{ symbol: "Crypto", role: "target_bucket" }],
    calculations: [
      {
        label: "Suggested contribution",
        formula: "min(monthly contribution, crypto target gap)",
        currentValue: plannedContribution,
        targetValue: targetCryptoGapUsd,
        difference: suggestedDcaUsd,
        unit: "USD",
      },
    ],
  });

  return {
    id: DCA_SUGGESTION_ID,
    category: "dca",
    reason_codes: [
      "crypto_underweight_for_dca",
      "planned_contribution_available",
      "gradual_entry_candidate",
    ],

    title_key: "suggestion.dca.title",
    description_key: "suggestion.dca.description",

    action_kind: "review_only",
    is_actionable: true,
    is_top_pick: false, // set only by selectTopPick

    amount: {
      valueUsd: suggestedDcaUsd,
      label: "Contribution to review",
    },
    // Generic bucket target only — no token is chosen.
    to: { bucket: "crypto" },

    // Contribution-funded gradual entry — no protocol involved (token_selection
    // remains not_evaluated via its guardrail).
    protocolSelection,
    reviewDetails,

    scores: {
      impact: Math.min(suggestedDcaUsd / totalPricedUsd, 1),
      urgency: 0.3,
      efficiency: 0.45,
    },
    guardrails,

    engine_version: SUGGESTION_ENGINE_VERSION,
    timestamp: generatedAt,
  };
}
