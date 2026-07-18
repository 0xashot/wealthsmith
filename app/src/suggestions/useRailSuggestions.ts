/**
 * useRailSuggestions — the SINGLE real-wallet Suggestion Engine entry point for
 * the UI. Both the Dashboard (DashboardBody) and the Portfolio
 * (RealWalletPortfolio) call this hook with their own already-read wallet data,
 * so Dashboard and Portfolio show identical deterministic suggestions for the
 * same wallet + saved goal — no per-page suggestion logic, ranking, Top Pick, or
 * ordering is duplicated.
 *
 * `deriveRailSuggestions` is the pure computation: from live positions +
 * pricedAsOf + savedGoal it derives the priced value, the RISK-BASED Safety
 * Buffer, and the bucket-level allocation (all via the existing approved
 * helpers), runs `runSuggestionEngine`, and maps the result with
 * `toSuggestionCards` — recalculating no pricing, buffer target, allocation
 * target, or Top Pick. The hook wraps it with a signature-gated lift so the
 * consuming page's setState only fires when a value-bearing display field
 * changes (never a render loop, never a stale amount).
 *
 * Never uses demo data — real-wallet positions only.
 */
import { useEffect, useRef } from "react";
import type { WalletPosition } from "../wallet/walletPosition";
import type { SavedGoal } from "../types/goal";
import type { SuggestionCardState } from "../types/dashboard";
import type { SuggestionReviewDetails } from "./engineTypes";
import {
  deriveValueBreakdown,
  deriveStableValue,
  deriveSafetyBuffer,
} from "../wallet/walletSummary";
import {
  deriveRecommendedAllocation,
  deriveAllocationDeltas,
} from "../wallet/recommendedAllocation";
import { getSafetyBufferTargetMonths } from "../wallet/safetyBufferTarget";
import { buildSuggestionEngineInputs } from "./engineInputAdapter";
import { runSuggestionEngine } from "./engine";
import { toSuggestionCards, warningsToNotice } from "./toSuggestionCard";
import { deriveContributionSuggestion } from "./contributionProductInput";
import { deriveStableYieldPlanSuggestion } from "./stableYieldProductInput";
import { evaluateDirectLendingForRail, type RuntimeSuppressionReason } from "./directUsdcLendingRuntimeAdapter";
import type { StableYieldReviewPresentation } from "./yieldStrategyPlanPresentationTypes";
import { CANONICAL_CONTRIBUTION_PRICE_SOURCE_ID } from "./contributionPricePolicy";
import type { ContributionPlanReviewDetails } from "./contributionPlanReviewDetails";

/** Engine cards + partial-pricing notice for the right rail (engine order). */
export interface RailSuggestionsData {
  cards: SuggestionCardState[];
  /**
   * Structured Review Details keyed by suggestion id (Step 10A/10B). The Review
   * modal renders these; cards themselves never carry them. Engine-owned.
   */
  reviewDetailsById: Record<string, SuggestionReviewDetails>;
  /**
   * Step 15H — plan-backed contribution review sections keyed by suggestion id. The shared review
   * modal renders these for a plan-backed card; other cards use `reviewDetailsById`. Engine-owned.
   */
  contributionReviewById: Record<string, ContributionPlanReviewDetails>;
  /**
   * Step 16H-D — plan-backed Stable Yield review presentations keyed by suggestion id. The shared
   * review modal renders these for a Stable Yield card; engine-owned, never recalculated in React.
   */
  stableYieldReviewById: Record<string, StableYieldReviewPresentation>;
  notice?: string;
  /** True when the engine produced at least one card. */
  available: boolean;
  /**
   * Step 16H-S.3 — the exact machine-readable reason the Kamino Direct USDC-lending suggestion was
   * suppressed this run (null when it emitted). Internal diagnostic; never rendered as user copy and
   * never carries a score or threshold.
   */
  directLendingSuppression?: RuntimeSuppressionReason | null;
}

/** The lifted rail payload (adds the live-read loading flag). */
export interface RailSuggestions extends RailSuggestionsData {
  loading: boolean;
}

/**
 * Pure: live wallet data + saved goal → engine cards. All inputs are derived
 * here via the approved helpers; the engine recalculates nothing.
 */
export function deriveRailSuggestions(args: {
  positions: WalletPosition[];
  pricedAsOf?: number | null;
  goal?: SavedGoal | null;
  /**
   * Step 15H — data provenance. Defaults to `real_wallet` (the Dashboard/Portfolio path). The Demo
   * dashboard passes `demo_fixture` so the SAME shared engine runs against the canonical Demo state
   * with explicitly fixture-scoped price/liquidity classification.
   */
  dataMode?: "real_wallet" | "demo_fixture";
}): RailSuggestionsData {
  const { positions, pricedAsOf, goal } = args;
  const dataMode = args.dataMode ?? "real_wallet";

  const value = deriveValueBreakdown(positions);

  // Risk-based Safety Buffer (only once priced, so a 0 reserve is real).
  const bufferTargetMonths = getSafetyBufferTargetMonths(goal?.risk_tolerance);
  const buffer =
    pricedAsOf != null
      ? deriveSafetyBuffer(positions, goal?.expenses_monthly, bufferTargetMonths)
      : null;

  // Current + recommended allocation (bucket-level), from sourced value only.
  const total = value.totalUsd ?? 0;
  const stableUsd = deriveStableValue(positions);
  const cryptoUsd = Math.max(0, total - stableUsd);
  const cryptoPct = total > 0 ? (cryptoUsd / total) * 100 : 0;
  const stablePct = total > 0 ? (stableUsd / total) * 100 : 0;
  const showAllocation = value.totalUsd != null && total > 0;
  const recommended = deriveRecommendedAllocation({
    riskTolerance: goal?.risk_tolerance,
    totalPricedUsd: showAllocation ? total : null,
  });
  const deltas =
    showAllocation && recommended
      ? deriveAllocationDeltas({
          current: { cryptoUsd, stableUsd, cryptoPct, stablePct },
          recommended,
        })
      : null;
  const allocationInput =
    showAllocation && recommended && deltas
      ? {
          currentCryptoPct: cryptoPct,
          currentStablesPct: stablePct,
          currentCryptoUsd: cryptoUsd,
          currentStablesUsd: stableUsd,
          recommendedCryptoPct: recommended.cryptoPct,
          recommendedStablesPct: recommended.stablePct,
          cryptoDeltaPct: deltas.cryptoDeltaPct,
          stablesDeltaPct: deltas.stableDeltaPct,
        }
      : null;

  // Step 15H — the deterministic plan-backed contribution suggestion from REAL wallet state (never
  // fixtures). Merged into the engine BEFORE its sort/Top-Pick pass so ordering is engine-owned.
  // Real-wallet positions are priced exclusively through the canonical token-price service
  // (`wallet/tokenPrices.ts`), so `token_price_service` is a DEMONSTRABLE provenance (not fabricated).
  const contribution = deriveContributionSuggestion({ dataMode, positions, pricedAsOf, goal, buffer, priceProvenance: { sourceId: CANONICAL_CONTRIBUTION_PRICE_SOURCE_ID } });

  // Step 16H-D — the shared Stable Yield orchestration prepares the optional 16G plan decision → 16H-A
  // suggestion. Real Wallet uses the production pipeline (no approved product → no_plan → null); Demo
  // uses injected demo-only data. Merged into the engine BEFORE its sort/Top-Pick pass (never marked
  // Top Pick here). The presentation review is keyed by the SAME suggestion id the card uses.
  const stableYield = deriveStableYieldPlanSuggestion({ dataMode, positions, pricedAsOf, goal, buffer });

  const engineResult = runSuggestionEngine(
    buildSuggestionEngineInputs({
      positions,
      pricedAsOf,
      savedGoal: goal ?? null,
      value: { totalUsd: value.totalUsd, anyUnpriced: value.anyUnpriced },
      safetyBuffer: buffer,
      allocation: allocationInput,
    }),
    pricedAsOf ?? 0,
    contribution.suggestion,
    stableYield.suggestion
  );
  const cards = toSuggestionCards(engineResult.suggestions);

  // Step 16H-S.3 — the approved Kamino Direct USDC-lending suggestion, evaluated through the SAME
  // deterministic runtime adapter the /testing page uses. Governance is derived from the activation
  // record (never hardcoded); the KLend market feed (APY/availability/capacity), verified liquid
  // buffer coverage, and the deterministic excess amount are not plumbed into the pure rail yet, so
  // in real-wallet mode the adapter FAIL-CLOSES and appends no card (production output unchanged).
  // Demo mode never emits (real-wallet-only path). Appended last → never Top Pick, never reorders.
  let directLendingSuppression: RuntimeSuppressionReason | null = null;
  if (dataMode === "real_wallet") {
    const dl = evaluateDirectLendingForRail({
      canonicalUsdcMint: null,
      canonicalUsdcRawUnits: null,
      pricesFresh: pricedAsOf != null,
      bufferRequiredResolved: buffer != null,
      bufferSufficiencyResolved: buffer != null,
      bufferFullyFundedByLiquidCoverage: buffer?.fullyFunded === true,
      excessDeterministicAmountUsd: null, // deterministic excess feed not yet wired into the pure rail
      suitability: { profileComplete: goal != null, suitableForCategory: false, prohibitsDefiLending: false },
      holdsExactCToken: false,
      approvedTopUpRulePasses: false,
    });
    if (dl.emit) cards.push(dl.card);
    else directLendingSuppression = dl.suppressionReason;
  }

  // Engine-owned review details, keyed by the SAME stable suggestion id the
  // cards use, so the rail can open the Review modal without re-running anything.
  const reviewDetailsById: Record<string, SuggestionReviewDetails> = {};
  for (const s of engineResult.suggestions) {
    if (s.reviewDetails) reviewDetailsById[s.id] = s.reviewDetails;
  }
  return {
    cards,
    reviewDetailsById,
    contributionReviewById: contribution.reviewById,
    stableYieldReviewById: stableYield.reviewById,
    notice: warningsToNotice(engineResult.warnings),
    available: cards.length > 0,
    directLendingSuppression,
  };
}

/**
 * Derive + lift the rail payload to the page. `onSuggestions` fires only when a
 * value-bearing display field changes (signature-gated) so the parent setState
 * never loops and the rail never shows a stale value.
 */
export function useRailSuggestions(args: {
  positions: WalletPosition[];
  pricedAsOf?: number | null;
  goal?: SavedGoal | null;
  loading: boolean;
  onSuggestions?: (data: RailSuggestions) => void;
}): void {
  const { positions, pricedAsOf, goal, loading, onSuggestions } = args;
  const { cards, reviewDetailsById, contributionReviewById, stableYieldReviewById, notice, available } = deriveRailSuggestions({
    positions,
    pricedAsOf,
    goal,
  });

  const signature = JSON.stringify({
    cards: cards.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      impact_text: c.impact_text,
      is_top_pick: c.is_top_pick,
      status: c.status,
      actionability: c.actionability,
      disabled_reason_text: c.disabled_reason_text ?? "",
      cta: c.cta.label,
    })),
    // Include review details so a details-only change (same card display) still
    // lifts a fresh payload for the modal. The rail has ≤5 cards, so this stays small.
    reviewDetailsById,
    notice: notice ?? "",
    loading,
  });
  const lastSignature = useRef<string | null>(null);
  useEffect(() => {
    if (!onSuggestions) return;
    if (signature === lastSignature.current) return;
    lastSignature.current = signature;
    onSuggestions({ cards, reviewDetailsById, contributionReviewById, stableYieldReviewById, notice, available, loading });
    // Signature gates the update; card objects are intentionally omitted from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, onSuggestions]);
}
