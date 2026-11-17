/**
 * railSwapActions — Step 23C.1. Derives the exact quote-ready `SwapActionReadiness` per mounted suggestion card
 * from the PRODUCTION assessments, using ONLY the Step-23A boundary adapters. It owns no financial logic: source,
 * destination, amount, transferability, reserve, and eligibility all come from the assessments; this maps them to
 * exact mints/decimals/raw + native→wrapped-SOL. It never derives a mint from a symbol and never recalculates a
 * USD/raw amount or reserve. A card with no swap (buffer / staking / stable yield) gets no entry.
 */
import type { SuggestionCardState } from "../../types/dashboard";
import type { SwapActionReadiness } from "./swapQuoteContracts";
import { buildRebalanceSwapAction, buildTrimSwapAction, buildDcaSwapAction } from "./swapActionContext";
import type { RebalanceAssessment, RebalanceUsdcSource, NativeSolRebalanceSourceAssessment } from "../rebalanceAssessment";
import type { TrimTokenHolding } from "../trimAssessment";
import type { ContributionPlanSuggestion } from "../contributionIntegrationTypes";

const SOL_MINT = "So11111111111111111111111111111111111111112";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
/** Exact registry decimals for the current DCA targets (never inferred). */
const TARGET_DECIMALS: Record<string, number> = { [SOL_MINT]: 9, [USDC_MINT]: 6, sol: 9, usdc: 6 };

export interface RailSwapActionInputs {
  cards: SuggestionCardState[];
  generatedAt: string;
  rebalance?: { assessment: RebalanceAssessment; usdcSource: RebalanceUsdcSource; nativeSolSource: NativeSolRebalanceSourceAssessment; usdcUnitPriceUsd: number | null; solUnitPriceUsd: number | null } | null;
  trimHoldings?: TrimTokenHolding[] | null;
  contributionSuggestion?: ContributionPlanSuggestion | null;
}

/** Map production assessments → { cardId: SwapActionReadiness } for Rebalance / Trim / eligible DCA cards. */
export function deriveRailSwapActions(input: RailSwapActionInputs): Record<string, SwapActionReadiness> {
  const out: Record<string, SwapActionReadiness> = {};
  for (const card of input.cards) {
    // Match on the card TYPE, not its category. `category` is the card vocabulary
    // ("allocation" / "portfolio_health" / "contribution_plan") and it is LOSSY —
    // trim, position_optimization and on_track all collapse to "portfolio_health",
    // so a category match would fire the Trim branch for unrelated cards. `type` is
    // one stable id per family. These previously compared against the ENGINE
    // category names, which a card never carries, so no branch ever matched and
    // this function always returned {}.
    if (card.type === "rebalance_to_plan" && input.rebalance) {
      const r = input.rebalance;
      out[card.id] = buildRebalanceSwapAction({
        actionId: card.id,
        suggestionId: card.id,
        generatedAt: input.generatedAt,
        direction: r.assessment.direction,
        usdcSource: { verifiedExcessValueUsd: r.usdcSource.verifiedExcessValueUsd, selectionState: r.usdcSource.selectionState, usdcUnitPriceUsd: r.usdcUnitPriceUsd, requiresPriorWithdrawal: r.usdcSource.requiresPriorWithdrawal },
        nativeSolSource: { technicallyAvailableLamports: r.nativeSolSource.technicallyAvailableLamports, sourceEligibilityState: r.nativeSolSource.sourceEligibilityState, solUnitPriceUsd: r.solUnitPriceUsd },
      });
    } else if (card.type === "trim_long_tail" && input.trimHoldings) {
      out[card.id] = buildTrimSwapAction({
        actionId: card.id,
        suggestionId: card.id,
        generatedAt: input.generatedAt,
        holdings: input.trimHoldings.map((h) => ({
          holdingId: h.holdingId,
          mint: h.mint,
          decimals: h.decimals,
          rawBalance: h.rawBalance,
          uiAmount: h.uiAmount,
          recognizedValueUsd: h.recognizedValueUsd,
          symbol: h.symbol,
          reviewEligibilityState: h.reviewEligibilityState,
          actionabilityState: h.actionabilityState,
          coreAssetState: h.coreAssetState,
        })),
      });
    // The id match is deliberate, and it is why SPLIT contribution cards
    // (contribution_split_sol / _usdc) get no entry: they describe a FUTURE monthly
    // contribution, the allocation split carries USD amounts and target legs but no
    // funding source (ContributionAllocationSplit has no sourceAssetId), and the money
    // is not in the wallet yet. Wiring them in could therefore only ever produce
    // `not_ready_for_quote` — the state SWR-5 pins for unfunded DCA, where a source is
    // never assumed. Do NOT "fix" this by inventing a source for a contribution that
    // has not arrived. Only a funded plan (staged_excess_usdc_dca) has a real one.
    } else if (card.type === "dca_buy" && input.contributionSuggestion && input.contributionSuggestion.id === card.id) {
      const sug = input.contributionSuggestion;
      const p = sug.contributionPlan;
      const amountUsd = typeof sug.amount?.valueUsd === "number" ? sug.amount.valueUsd : (p.amountKind === "exact" ? p.exactAmountUsd : p.maximumAmountUsd) ?? 0;
      const targetDecimals = TARGET_DECIMALS[p.targetAssetId] ?? TARGET_DECIMALS[p.targetId] ?? 9;
      out[card.id] = buildDcaSwapAction({
        actionId: card.id,
        suggestionId: card.id,
        generatedAt: input.generatedAt,
        planKind: p.planKind,
        sourceAssetId: p.sourceAssetId,
        sourceUnitPriceUsd: p.sourceAssetId ? 1 : null, // USDC funding source, sourced at the coverage's $1 basis
        targetAssetId: p.targetAssetId,
        targetSymbol: p.targetSymbol,
        targetDecimals,
        amountUsd: typeof amountUsd === "number" ? amountUsd : 0,
      });
    }
  }
  return out;
}
