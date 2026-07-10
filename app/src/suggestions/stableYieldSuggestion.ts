/**
 * stableYieldSuggestion — the deterministic "Put Stablecoins to Work" rule
 * (category `stable_yield`; rules/suggestion-engine-rules.md). Pure over
 * SuggestionEngineInputs: no fetching, no pricing, no AI, no protocol choice,
 * no invented APY.
 *
 * PRODUCT RULE: approved conservative stablecoin-yield positions remain Safety
 * Buffer-eligible, so this suggestion does NOT require stablecoins ABOVE the
 * buffer or the target allocation — a fully funded buffer held in liquid USDC
 * can still be reviewed for yield. It reviews only LIQUID WALLET stablecoins
 * (approved symbols, wallet source, priced) — never protocol/yield/LP/unknown
 * positions, which are excluded because reviewing them would double-suggest
 * already-deployed stables.
 *
 * Safety Buffer accounting (walletSummary.stableValueOf): the buffer already
 * counts liquid wallet stablecoins AND all-stable, no-debt protocol positions
 * (e.g. USDC supplied to Kamino) as buffer-eligible; it never counts LP with
 * volatile legs, debt legs, or unpriced positions. So deploying liquid USDC
 * into an approved stable-yield position keeps it supporting the buffer.
 *
 * SAFETY BUFFER COMES FIRST; the engine also suppresses this when Rebalance
 * applies (allocation action takes precedence).
 */
import type { WalletPosition } from "../wallet/walletPosition";
import { isStablecoin } from "../wallet/walletSummary";
import type { SuggestionEngineInputs } from "./engineInputs";
import type { EngineSuggestion, SuggestionGuardrail } from "./engineTypes";
import {
  SUGGESTION_ENGINE_VERSION,
  MIN_STABLE_YIELD_SUGGESTION_USD,
  GUARDRAIL_STATUS_NOT_EVALUATED,
} from "./engineThresholds";
import { notEvaluatedProtocolSelection } from "./protocolSelection";
import { buildReviewDetails, usdMetric, metric } from "./suggestionReviewDetails";
import type { ReviewAsset } from "./engineTypes";

/** Stable suggestion ID. */
export const STABLE_YIELD_SUGGESTION_ID = "stable_yield_wallet_stables";

/**
 * A LIQUID WALLET stablecoin: an approved-symbol stable token held directly in
 * the wallet (not a protocol/yield/LP position), priced, with a non-zero
 * amount. `isStablecoin` already requires type "token", an approved
 * STABLE_SYMBOL, and a known (non-"Unknown token") name — so USDY/RWA/unknown
 * stable-like tokens never count.
 */
function isLiquidWalletStable(p: WalletPosition): boolean {
  return (
    isStablecoin(p) &&
    p.source === "wallet" &&
    typeof p.priceUsd === "number" &&
    typeof p.valueUsd === "number" &&
    typeof p.uiAmount === "number" &&
    p.uiAmount > 0
  );
}

/**
 * Trigger: fully funded buffer ∧ pricing ∧ a priced total ∧ liquid wallet
 * stablecoins worth at least the minimum. The eligible amount is the FULL
 * liquid wallet stable value (buffer funds stay buffer-eligible after
 * deployment). The Rebalance conflict is enforced by the engine (this rule is
 * only called when Rebalance did not fire).
 */
export function deriveStableYieldSuggestion(
  inputs: SuggestionEngineInputs,
  generatedAt: number
): EngineSuggestion | null {
  const sb = inputs.safetyBuffer;
  if (!sb || !sb.fullyFunded) return null;
  if (!inputs.dataQuality.hasPricing) return null;

  const totalPricedUsd = inputs.value.totalUsd;
  if (totalPricedUsd == null || totalPricedUsd <= 0) return null;

  // Eligible = full liquid wallet stable value (no buffer/allocation subtraction).
  const eligibleStables = inputs.positions.filter(isLiquidWalletStable);
  const liquidEligibleStableUsd = eligibleStables.reduce((s, p) => s + (p.valueUsd as number), 0);
  if (liquidEligibleStableUsd < MIN_STABLE_YIELD_SUGGESTION_USD) return null;

  const guardrails: SuggestionGuardrail[] = [
    { code: "pricing_available", status: "passed" },
    // Approved stable yield stays buffer-eligible → the buffer is protected.
    { code: "buffer_protection", status: "passed" },
    { code: "min_trade_size", status: "passed" },
    // protocol_selection guardrail is derived centrally from protocolSelection.
    { code: "liquidity_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "slippage_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "cost_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
  ];

  const involvedAssets: ReviewAsset[] = eligibleStables.map((p) => ({
    symbol: p.symbol,
    name: p.name,
    valueUsd: p.valueUsd as number,
    amount: p.uiAmount as number,
    role: "stablecoin",
  }));
  const protocolSelection = notEvaluatedProtocolSelection([
    "missing_apy_data",
    "missing_tvl_data",
    "missing_risk_data",
    "missing_liquidity_data",
    "missing_lockup_data",
  ]);
  const reviewDetails = buildReviewDetails({
    category: "stable_yield",
    actionKind: "review_only",
    guardrails,
    protocolSelection,
    reason:
      "You have liquid stablecoins that may be eligible for conservative yield review while still supporting your Safety Buffer.",
    metrics: [
      usdMetric("Liquid stablecoins to review", liquidEligibleStableUsd),
      metric("Stablecoin count", eligibleStables.length, "count"),
      // Concrete evidence the buffer stays funded (target already covered).
      usdMetric("Safety Buffer reserve", sb.stableUsd),
    ],
    involvedAssets,
    calculations: [
      {
        label: "Eligible stablecoins",
        formula: "liquid wallet stablecoins",
        currentValue: liquidEligibleStableUsd,
        threshold: MIN_STABLE_YIELD_SUGGESTION_USD,
        unit: "USD",
      },
    ],
  });

  return {
    id: STABLE_YIELD_SUGGESTION_ID,
    category: "stable_yield",
    reason_codes: [
      "stable_yield_available",
      "conservative_yield_candidate",
      "buffer_eligible_stable_yield",
    ],

    title_key: "suggestion.stable_yield.title",
    description_key: "suggestion.stable_yield.description",

    action_kind: "review_only",
    is_actionable: true,
    is_top_pick: false, // set only by selectTopPick

    amount: {
      valueUsd: liquidEligibleStableUsd,
      label: "Eligible stablecoins to review",
    },
    from: { bucket: "stables" },

    // A yield protocol WILL be chosen once real data exists (APY/TVL/risk/
    // liquidity/withdrawal); no data source yet, so selection stays not_evaluated.
    protocolSelection,
    reviewDetails,

    scores: {
      impact: Math.min(liquidEligibleStableUsd / totalPricedUsd, 1),
      urgency: 0.25,
      efficiency: 0.55,
    },
    guardrails,

    engine_version: SUGGESTION_ENGINE_VERSION,
    timestamp: generatedAt,
  };
}
