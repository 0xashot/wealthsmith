/**
 * capitalEfficiencySuggestion — the deterministic "Review Idle Assets" rule
 * (category `capital_efficiency`; rules/suggestion-engine-rules.md). Pure over
 * SuggestionEngineInputs: no fetching, no pricing, no AI, no protocol/asset
 * choice, no invented APY, no sell/buy/swap advice.
 *
 * It flags meaningful LIQUID WALLET crypto that no other rule covers — NOT SOL
 * (Step 9B staking), NOT stablecoins (Step 9C stable yield), NOT LST/stake/
 * protocol positions (Step 9D position optimization). One AGGREGATED suggestion
 * is returned, never one card per asset, and it only says the assets "may not
 * be contributing" — never that an asset is bad or should be sold/swapped.
 *
 * SAFETY BUFFER COMES FIRST (engine-enforced). Category priority places this
 * above Staking/Stable Yield but below Rebalance.
 */
import type { WalletPosition } from "../wallet/walletPosition";
import { STABLE_SYMBOLS } from "../wallet/walletSummary";
import type { SuggestionEngineInputs } from "./engineInputs";
import type { EngineSuggestion, SuggestionGuardrail } from "./engineTypes";
import {
  SUGGESTION_ENGINE_VERSION,
  MIN_CAPITAL_EFFICIENCY_SUGGESTION_USD,
  CAPITAL_EFFICIENCY_PORTFOLIO_SHARE_THRESHOLD,
  GUARDRAIL_STATUS_NOT_EVALUATED,
} from "./engineThresholds";

/** Stable suggestion ID. */
export const CAPITAL_EFFICIENCY_SUGGESTION_ID = "capital_efficiency_idle_assets";

/** Exact SOL symbols handled by staking, excluded here. */
const SOL_SYMBOLS = new Set(["SOL", "WSOL"]);

/**
 * A meaningful LIQUID WALLET crypto asset NOT covered by staking/stable-yield/
 * position-optimization: a priced wallet token with a known symbol that is not
 * SOL/WSOL and not an approved stablecoin. LSTs/stake/protocol are excluded by
 * requiring type "token"; unknown tokens are excluded by name.
 */
function isEligibleIdleAsset(p: WalletPosition): boolean {
  return (
    p.source === "wallet" &&
    p.type === "token" &&
    typeof p.priceUsd === "number" &&
    typeof p.valueUsd === "number" &&
    typeof p.uiAmount === "number" &&
    p.uiAmount > 0 &&
    p.symbol.length > 0 &&
    p.name !== "Unknown token" &&
    !SOL_SYMBOLS.has(p.symbol) &&
    !STABLE_SYMBOLS.has(p.symbol)
  );
}

/**
 * Trigger: fully funded buffer ∧ pricing ∧ a priced total ∧ eligible idle
 * wallet assets whose aggregate value clears BOTH the minimum dollar amount and
 * the minimum portfolio share. Anything missing → null; nothing invented.
 */
export function deriveCapitalEfficiencySuggestion(
  inputs: SuggestionEngineInputs,
  generatedAt: number
): EngineSuggestion | null {
  const sb = inputs.safetyBuffer;
  if (!sb || !sb.fullyFunded) return null;
  if (!inputs.dataQuality.hasPricing) return null;

  const totalPricedUsd = inputs.value.totalUsd;
  if (totalPricedUsd == null || totalPricedUsd <= 0) return null;

  const eligibleIdleValueUsd = inputs.positions
    .filter(isEligibleIdleAsset)
    .reduce((s, p) => s + (p.valueUsd as number), 0);
  if (eligibleIdleValueUsd < MIN_CAPITAL_EFFICIENCY_SUGGESTION_USD) return null;

  const idleShare = eligibleIdleValueUsd / totalPricedUsd;
  if (idleShare < CAPITAL_EFFICIENCY_PORTFOLIO_SHARE_THRESHOLD) return null;

  const guardrails: SuggestionGuardrail[] = [
    { code: "pricing_available", status: "passed" },
    { code: "buffer_protection", status: "passed" },
    { code: "idle_asset_threshold", status: "passed" },
    { code: "min_trade_size", status: "passed" },
    { code: "protocol_selection", status: GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "liquidity_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "slippage_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "cost_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
  ];

  return {
    id: CAPITAL_EFFICIENCY_SUGGESTION_ID,
    category: "capital_efficiency",
    reason_codes: ["idle_assets", "idle_crypto"],

    title_key: "suggestion.capital_efficiency.title",
    description_key: "suggestion.capital_efficiency.description",

    action_kind: "review_only",
    is_actionable: true,
    is_top_pick: false, // set only by selectTopPick

    amount: {
      valueUsd: eligibleIdleValueUsd,
      label: "Idle assets to review",
    },

    scores: {
      impact: Math.min(eligibleIdleValueUsd / totalPricedUsd, 1),
      urgency: idleShare >= 0.15 ? 0.4 : 0.3,
      efficiency: 0.5,
    },
    guardrails,

    engine_version: SUGGESTION_ENGINE_VERSION,
    timestamp: generatedAt,
  };
}
