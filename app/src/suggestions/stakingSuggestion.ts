/**
 * stakingSuggestion — the deterministic "Put Idle SOL to Work" rule (category
 * `staking`; rules/suggestion-engine-rules.md). Pure over
 * SuggestionEngineInputs: no fetching, no pricing, no AI, no protocol choice.
 *
 * SAFETY BUFFER COMES FIRST: staking is a deployment suggestion, so it only
 * exists once the Safety Buffer is fully funded (the engine's Buffer Override
 * also enforces this). It reviews only TRULY LIQUID wallet SOL — never LSTs,
 * native stake, or protocol SOL — and always keeps a small fee reserve, so it
 * never proposes staking the whole balance.
 *
 * "Actionable" is review-only. No APY, no protocol, no amount is invented; the
 * eligible value is priced SOL × the sourced SOL price.
 */
import type { WalletPosition } from "../wallet/walletPosition";
import type { SuggestionEngineInputs } from "./engineInputs";
import type { EngineSuggestion, SuggestionGuardrail } from "./engineTypes";
import {
  SUGGESTION_ENGINE_VERSION,
  SOL_FEE_RESERVE,
  MIN_STAKING_SUGGESTION_USD,
  GUARDRAIL_STATUS_NOT_EVALUATED,
} from "./engineThresholds";

/** Stable suggestion ID. */
export const STAKING_SUGGESTION_ID = "staking_idle_sol";

/** Exact liquid-SOL symbols. "Contains SOL" is NOT enough (excludes LSTs). */
const LIQUID_SOL_SYMBOLS = new Set(["SOL", "WSOL"]);

/**
 * A position is TRULY LIQUID wallet SOL only when its symbol is exactly SOL or
 * WSOL, it is a native/token wallet holding (not an LST, native stake, or
 * protocol position), and it carries a sourced price + value + amount.
 */
function isLiquidSol(p: WalletPosition): boolean {
  return (
    LIQUID_SOL_SYMBOLS.has(p.symbol) &&
    (p.type === "native" || p.type === "token") &&
    p.source === "wallet" &&
    typeof p.priceUsd === "number" &&
    typeof p.valueUsd === "number" &&
    typeof p.uiAmount === "number"
  );
}

/**
 * Trigger: fully funded Safety Buffer ∧ pricing ∧ a priced total ∧ liquid SOL
 * whose amount above the fee reserve is worth at least the minimum. Anything
 * missing → null (no invented amount; LST/stake/protocol SOL never counts).
 */
export function deriveStakingSuggestion(
  inputs: SuggestionEngineInputs,
  generatedAt: number
): EngineSuggestion | null {
  const sb = inputs.safetyBuffer;
  if (!sb || !sb.fullyFunded) return null;
  if (!inputs.dataQuality.hasPricing) return null;

  const totalPricedUsd = inputs.value.totalUsd;
  if (totalPricedUsd == null || totalPricedUsd <= 0) return null;

  const liquid = inputs.positions.filter(isLiquidSol);
  if (liquid.length === 0) return null;

  const totalLiquidSol = liquid.reduce((s, p) => s + (p.uiAmount as number), 0);
  const eligibleSol = Math.max(totalLiquidSol - SOL_FEE_RESERVE, 0);
  if (eligibleSol <= 0) return null;

  // Sourced SOL price (all liquid SOL is priced by the same SOL mint).
  const solPrice = liquid[0].priceUsd as number;
  const eligibleValueUsd = eligibleSol * solPrice;
  if (eligibleValueUsd < MIN_STAKING_SUGGESTION_USD) return null;

  const guardrails: SuggestionGuardrail[] = [
    { code: "pricing_available", status: "passed" },
    { code: "buffer_protection", status: "passed" },
    { code: "sol_fee_reserve", status: "passed" },
    { code: "min_trade_size", status: "passed" },
    // Deferred until a deterministic platform-selection rule exists.
    { code: "protocol_selection", status: GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "liquidity_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "slippage_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "cost_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
  ];

  return {
    id: STAKING_SUGGESTION_ID,
    category: "staking",
    reason_codes: ["idle_sol", "sol_not_staked", "liquid_sol_available"],

    title_key: "suggestion.staking.title",
    description_key: "suggestion.staking.description",

    action_kind: "review_only",
    is_actionable: true,
    is_top_pick: false, // set only by selectTopPick

    amount: {
      valueUsd: eligibleValueUsd,
      label: "Eligible SOL to review",
    },
    // Token side of the review (no protocol chosen — that's a later step).
    from: { symbol: "SOL", bucket: "crypto" },

    scores: {
      // Useful but lower priority than buffer/rebalance (category rank handles
      // ordering); modest fixed urgency, decent efficiency.
      impact: Math.min(eligibleValueUsd / totalPricedUsd, 1),
      urgency: 0.35,
      efficiency: 0.6,
    },
    guardrails,

    engine_version: SUGGESTION_ENGINE_VERSION,
    timestamp: generatedAt,
  };
}
