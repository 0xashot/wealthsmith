/**
 * demoConfirmTerms — the confirm sheet's terms in Demo Mode.
 *
 * WHY THIS EXISTS. Demo Mode has no wallet, so the real flow cannot run: there is nobody to
 * build a transaction for, nothing to simulate, and nothing to sign. Without this the confirm
 * step simply did not render, and someone evaluating the product reached the route comparison
 * and then a dead end exactly where the interesting part begins.
 *
 * WHAT IT IS, AND IS NOT. A PREVIEW built from the demo quote already on screen. It is not a
 * plan: no transaction exists, nothing was simulated, and the lifecycle machine is not involved
 * at all. The sheet is rendered presentationally, the way the gallery renders it, and Approve
 * is shown unavailable with the reason. Nothing here can reach the execution endpoint, because
 * nothing here calls it.
 *
 * That separation is deliberate. Driving the real machine into `ready` without a verification
 * would make the phase mean two different things — one where terms were checked and one where
 * they were invented — and the whole point of `ready` is that it cannot be reached unchecked.
 *
 * Returns null when the demo quote is missing anything the sheet must show. A partial
 * confirmation is not worth rendering: better to fall back to the ordinary hand-off footer than
 * to show a sample swap with a blank where its guaranteed minimum should be.
 */
import { rawToTokens } from "../swapQuote/swapAmountMath";
import type {
  SwapActionContext,
  SwapQuoteCandidate,
  SwapQuoteComparisonAssessment,
} from "../swapQuote/swapQuoteContracts";
import type { SwapExecutionTerms } from "./executionContracts";

/** The selected candidate, or null when the comparison chose nobody. */
export function selectedCandidate(
  assessment: SwapQuoteComparisonAssessment | null,
): SwapQuoteCandidate | null {
  if (assessment == null || assessment.selectedProviderId == null) return null;
  return assessment.candidates.find((c) => c.providerId === assessment.selectedProviderId) ?? null;
}

export function demoConfirmTerms(
  action: SwapActionContext,
  assessment: SwapQuoteComparisonAssessment | null,
  slippageBps: number,
): SwapExecutionTerms | null {
  const candidate = selectedCandidate(assessment);
  if (candidate == null) return null;

  // The guaranteed figure is the one term the sheet may never fake or omit. If the demo quote
  // has no floor, there is no honest confirmation to show.
  if (candidate.minimumOutputRaw == null) return null;
  const minimumOutputTokens = rawToTokens(candidate.minimumOutputRaw, action.outputAsset.decimals);
  if (minimumOutputTokens == null) return null;

  return {
    inputSymbol: action.inputAsset.symbol,
    inputMint: action.inputAsset.mint,
    inputAmountRaw: action.inputAmountRaw,
    inputAmountTokens: action.inputAmountTokens,
    inputAmountUsd: action.inputAmountUsd,
    outputSymbol: action.outputAsset.symbol,
    outputMint: action.outputAsset.mint,
    expectedOutputTokens: candidate.expectedOutputTokens,
    expectedOutputUsd: candidate.expectedOutputUsd,
    minimumOutputTokens,
    // Derived from the candidate's own expected-output valuation, so the two dollar figures in
    // the column cannot imply two different prices for one token.
    minimumOutputUsd:
      candidate.expectedOutputUsd != null && Number(candidate.expectedOutputTokens) > 0
        ? (Number(minimumOutputTokens) / Number(candidate.expectedOutputTokens)) * candidate.expectedOutputUsd
        : null,
    // Absent figures stay absent. The sheet renders "—" for these, which is the truth about a
    // demo quote that could not price them, and is the same thing it would do for a real one.
    priceImpactPct: candidate.priceImpactPct ?? Number.NaN,
    slippageBps,
    estimatedTotalCostUsd: null,
    estimatedNetworkFeeUsd: candidate.estimatedNetworkFeeUsd,
    providerId: candidate.providerId,
    providerName: candidate.providerName,
  };
}
