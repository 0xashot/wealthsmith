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

/**
 * What the review's footer shows BEFORE the confirm step is open.
 *
 * One answer for every state, so the footer is never empty and never a link out:
 *   swap               — the Swap button. `refreshFirst` says the comparison has expired and must
 *                        be re-run before any terms are shown.
 *   loading            — the Swap button, spinning: a comparison is in flight and has not answered.
 *   wallet_unavailable — a swap could be offered, but no wallet here can sign it.
 *   unavailable        — no swap can be offered for this route. Close is the only control.
 */
export type SwapEntry =
  | { kind: "swap"; refreshFirst: boolean }
  | { kind: "loading" }
  | { kind: "wallet_unavailable" }
  | { kind: "unavailable" };

export interface SwapEntryInput {
  offer: ExecutionOffer;
  assessment: SwapQuoteComparisonAssessment | null;
  /** A comparison request is in flight (the first, or a refresh). */
  comparisonLoading: boolean;
  /** A wallet is connected that can sign for this session. Always true in Demo Mode. */
  walletReady: boolean;
  nowMs: number;
}

/**
 * Decide the entry footer.
 *
 * AN AGED COMPARISON DOES NOT WITHDRAW THE BUTTON. The Boundary refuses a quote with under ten
 * seconds left (`quote_expired`), which was written when the confirm step showed the
 * comparison's own terms. It no longer does: pressing Swap builds a PLAN, with its own fresh
 * quote, its own verification and its own expiry, and those are the terms someone approves. So
 * the comparison's age is not a reason to take the button away from a reader who has changed
 * nothing — which is what happened about ten seconds after every review opened, leaving no
 * control at all.
 *
 * Age still counts for what the comparison DOES decide: which route. So when it has actually
 * expired, Swap re-runs it first (`refreshFirst`) and continues only if a swap is still
 * offered. Inside its validity it is used as it stands — the server would hand back the same
 * cached answer anyway.
 *
 * Every OTHER refusal stands. A route that lost its comparison, an unverified pool, a provider
 * we cannot build for: none of those become a Swap button here.
 */
export function deriveSwapEntry(input: SwapEntryInput): SwapEntry {
  const { offer, assessment, comparisonLoading, walletReady, nowMs } = input;
  const agedOnly =
    !offer.offered && offer.blockReasons.length === 1 && offer.blockReasons[0] === "quote_expired";

  if (offer.offered || agedOnly) {
    if (!walletReady) return { kind: "wallet_unavailable" };
    const expiry = assessment?.expiresAt != null ? Date.parse(assessment.expiresAt) : NaN;
    const expired = !Number.isFinite(expiry) || expiry <= nowMs;
    return { kind: "swap", refreshFirst: agedOnly && expired };
  }
  return comparisonLoading ? { kind: "loading" } : { kind: "unavailable" };
}
