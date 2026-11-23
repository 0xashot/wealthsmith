/**
 * executionOffer — Phase 6. May this review offer a confirm step?
 *
 * One function joining the two layers that were deliberately kept apart: Protocol Logic's
 * permission (`swapHandoffType`) and the Execution Boundary (`executionEligibility`). They stay
 * separate modules because they answer different questions; this is the single place that asks
 * both, so no component has to remember the order or that there are two.
 *
 * Deny by default, and it returns reasons rather than a boolean — a surface that cannot say why
 * it withheld a confirm step will eventually show one it cannot justify.
 */
import type {
  SwapActionContext,
  SwapQuoteComparisonAssessment,
} from "../swapQuote/swapQuoteContracts";
import type { ExecutionBlockReason } from "./executionContracts";
import { deriveExecutionEligibility } from "./executionEligibility";
import { resolveSwapHandoffType } from "./swapHandoffType";

export interface ExecutionOfferInput {
  action: SwapActionContext;
  assessment: SwapQuoteComparisonAssessment | null;
  nowMs: number;
}

export type ExecutionOffer =
  | { offered: true; action: SwapActionContext }
  | { offered: false; blockReasons: ExecutionBlockReason[] };

/**
 * Decide whether to offer in-app approval for this leg.
 *
 * The handoff type is resolved from the SELECTED provider and the suggestion's category — never
 * from whether the quote happens to look good. A rail is permitted or it is not, and a good
 * quote cannot promote one that is not.
 */
export function deriveExecutionOffer(input: ExecutionOfferInput): ExecutionOffer {
  const { action, assessment, nowMs } = input;
  if (assessment == null) return { offered: false, blockReasons: ["no_selected_route"] };

  const handoffType = resolveSwapHandoffType({
    providerId: assessment.selectedProviderId,
    suggestionCategory: action.suggestionCategory,
  });

  const eligibility = deriveExecutionEligibility({
    assessment,
    handoffType,
    totalLegs: action.totalLegs,
    nowMs,
  });

  return eligibility.executable
    ? { offered: true, action }
    : { offered: false, blockReasons: eligibility.blockReasons };
}
