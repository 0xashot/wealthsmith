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
import { deriveCompletenessGates, type PortfolioCompletenessResult } from "../wallet/portfolioCompleteness";
import { computeSafetyBufferCoverage } from "../wallet/safetyBufferCoverage";
import { deriveRebalanceAssessment, selectRebalanceUsdcSource, isRebalanceMaterial, isMaterialCryptoToStables, deriveNativeSolRebalanceSource, REBALANCE_NATIVE_SOL_RESERVE_POLICY } from "./rebalanceAssessment";
import { buildRebalanceCardFromAssessment } from "./rebalanceSuggestion";
import { deriveTrimAssessment } from "./trimAssessment";
import { buildTrimCardFromAssessment } from "./trimSuggestion";
import { toSuggestionCards, warningsToNotice } from "./toSuggestionCard";
import { deriveContributionSuggestion } from "./contributionProductInput";
import { deriveStableYieldPlanSuggestion } from "./stableYieldProductInput";
import { evaluateDirectLendingForRail, type RuntimeSuppressionReason } from "./directUsdcLendingRuntimeAdapter";
import { KLEND_DIRECT_USDC_IDENTITY, toRuntimeMarketInput, capacityCoversAmount, type KlendDirectUsdcMarketSnapshot } from "./klendDirectUsdcMarketData";
import { deriveDirectLendingExcessUsd, deriveDirectLendingSuitability } from "./directUsdcLendingRailInputs";
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
  /**
   * Step 17H.1 — the canonical portfolio-completeness result, computed ONCE over the final merged
   * positions. The dashboard reads `blockingIssues`/`warnings`; Smith AI reads the dimension states. Never
   * recomputed by the UI. Optional so non-real-wallet callers omit it.
   */
  portfolioCompleteness?: PortfolioCompletenessResult;
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
  /**
   * Step 16H-S.4 — optional LIVE Kamino Direct inputs supplied by the component layer (a hook that
   * reads the reserve via the existing RPC provider builds the snapshot; the deterministic excess
   * amount comes from the 16F eligible-capital snapshot; suitability from the user profile). When any
   * is absent the direct-lending adapter fail-closes and appends no card. The pure rail never fetches.
   */
  klendMarketSnapshot?: KlendDirectUsdcMarketSnapshot;
  directLendingExcessUsd?: number | null;
  directLendingSuitability?: { profileComplete: boolean; suitableForCategory: boolean; prohibitsDefiLending: boolean };
}): RailSuggestionsData {
  const { positions, pricedAsOf, goal, klendMarketSnapshot, directLendingExcessUsd, directLendingSuitability } = args;
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

  // Step 17H.1 — the canonical portfolio-completeness gates, computed ONCE over the SAME final merged
  // positions + the production Safety Buffer target. Passed to the engine to NARROW (never enable) the
  // On Track / staking / DCA / direct-lending candidates; the completeness result + blockingIssues/warnings
  // are returned for the dashboard + Smith AI to consume without recomputing.
  // Step 18D — ONE canonical SafetyBufferCoverage per refresh, shared by completeness AND the Rebalance
  // assessment (same positions + same requiredBufferUsd; no methodology change, no recomputation).
  const requiredBufferUsd = buffer?.targetUsd ?? 0;
  const bufferCoverage = computeSafetyBufferCoverage(positions, requiredBufferUsd);
  const completeness = deriveCompletenessGates(positions, { requiredBufferUsd, bufferCoverage });

  // Step 18C — one authoritative Rebalance result from the canonical assessment (phase-one:
  // stables_to_crypto only), computed ONCE over the same merged positions + mounted completeness +
  // the SAME canonical coverage object. `material` preserves conflict suppression even without a card.
  const rebalanceAssessment = deriveRebalanceAssessment({
    positions, portfolioCompleteness: completeness.result, safetyBufferCoverage: bufferCoverage,
    riskTolerance: goal?.risk_tolerance, requiredBufferUsd, generatedAt: pricedAsOf ?? Date.now(),
  });
  const usdcSource = selectRebalanceUsdcSource(positions, requiredBufferUsd, pricedAsOf ?? Date.now());
  const solPrice = positions.find((p) => p.type === "native")?.priceUsd ?? null;
  const solPriceFresh = pricedAsOf != null && typeof solPrice === "number";
  // Step 18F — ONE canonical native-SOL source derivation per refresh (over the SAME merged positions),
  // with the APPROVED fixed 0.1 SOL Rebalance operating reserve. Wallet freshness reuses the shared
  // completeness result (no new portfolio/buffer/completeness derivation). No RPC.
  const walletFresh = completeness.result.freshnessState !== "stale";
  const nativeSolSource = deriveNativeSolRebalanceSource(positions, solPrice, solPriceFresh, REBALANCE_NATIVE_SOL_RESERVE_POLICY, walletFresh, pricedAsOf ?? Date.now());
  const rebalanceCard = buildRebalanceCardFromAssessment(rebalanceAssessment, usdcSource, nativeSolSource, solPrice, solPriceFresh, pricedAsOf ?? 0);
  // Step 18E — a PROVEN material crypto_to_stables need (calculation allowed) suppresses new staking.
  const rebalanceOverride = {
    card: rebalanceCard,
    material: isRebalanceMaterial(rebalanceAssessment),
    materialCryptoToStables: isMaterialCryptoToStables(rebalanceAssessment),
  };

  // Step 19C — ONE canonical Trim assessment per refresh over the SAME merged positions + shared completeness +
  // shared SafetyBufferCoverage (no second wallet aggregation, no second completeness/buffer derivation). The
  // card is built from the canonical assessment behind the existing trim_long_tail_assets contract; the engine
  // never invokes the legacy symbol-based rule in production. Trim coexists with Rebalance and Capital Efficiency.
  const trimAssessment = deriveTrimAssessment({
    positions, portfolioCompleteness: completeness.result, safetyBufferCoverage: bufferCoverage,
    requiredBufferUsd, generatedAt: pricedAsOf ?? Date.now(),
  });
  const trimOverride = {
    candidate: buildTrimCardFromAssessment(trimAssessment, pricedAsOf ?? 0),
    materialReviewNeed: trimAssessment.overallReadiness.status === "allowed",
  };

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
    stableYield.suggestion,
    completeness.gates,
    rebalanceOverride,
    trimOverride
  );
  const cards = toSuggestionCards(engineResult.suggestions);

  // Step 16H-S.3/S.4 — the approved Kamino Direct USDC-lending suggestion, evaluated through the SAME
  // deterministic runtime adapter the /testing page uses. Governance is derived from the activation
  // record (never hardcoded). LIVE inputs wired here: exact-canonical-USDC raw balance (16H-S.4),
  // verified liquid Safety Buffer coverage, and — when supplied by the caller's live market hook — the
  // on-chain KLend APY/availability/capacity snapshot. The deterministic excess amount (16F
  // eligible-capital) and the live market snapshot are supplied by the component layer; when absent
  // the adapter FAIL-CLOSES and appends no card (production output unchanged). Demo never emits
  // (real-wallet-only path). Appended last → never Top Pick, never reorders other suggestions.
  let directLendingSuppression: RuntimeSuppressionReason | null = null;
  if (dataMode === "real_wallet") {
    // Exact-mint canonical USDC only (16H-S.4): aggregate direct wallet balances of the exact mint —
    // never symbol matches, never cTokens/vault shares/bridged/receipt tokens.
    let canonicalUsdcRawUnits: bigint | null = null;
    let canonicalUsdcUsd = 0;
    for (const p of positions) {
      if (p.mint === KLEND_DIRECT_USDC_IDENTITY.liquidityMint && p.type === "token" && p.detection === "direct_wallet_balance") {
        try { canonicalUsdcRawUnits = (canonicalUsdcRawUnits ?? 0n) + BigInt(p.amount); } catch { /* malformed base units → ignore leg */ }
        if (typeof p.uiAmount === "number" && typeof p.priceUsd === "number") canonicalUsdcUsd += p.uiAmount * p.priceUsd;
      }
    }
    const checkedAt = pricedAsOf != null ? new Date(pricedAsOf).toISOString() : new Date().toISOString();
    // Deterministic excess via the EXISTING 16F builder (component override wins if supplied).
    const excessUsd = directLendingExcessUsd !== undefined
      ? directLendingExcessUsd
      : deriveDirectLendingExcessUsd({ buffer, canonicalUsdcUsd, bufferCountedUsdcUsd: buffer?.stableUsd ?? 0, pricesFresh: pricedAsOf != null, checkedAt });
    // Suitability via the EXISTING rule (fail-closed; no invented questionnaire).
    const suitability = directLendingSuitability ?? deriveDirectLendingSuitability(goal);
    const market: KlendDirectUsdcMarketSnapshot | undefined = klendMarketSnapshot;
    const capacityCovers = market != null && excessUsd != null ? capacityCoversAmount(market, excessUsd) : false;
    const marketInput = market ? toRuntimeMarketInput(market) : undefined;
    const dl = evaluateDirectLendingForRail({
      canonicalUsdcMint: canonicalUsdcRawUnits != null ? KLEND_DIRECT_USDC_IDENTITY.liquidityMint : null,
      canonicalUsdcRawUnits: canonicalUsdcRawUnits != null ? Number(canonicalUsdcRawUnits) : null,
      pricesFresh: pricedAsOf != null,
      bufferRequiredResolved: buffer != null,
      bufferSufficiencyResolved: buffer != null,
      bufferFullyFundedByLiquidCoverage: buffer?.fullyFunded === true,
      excessDeterministicAmountUsd: excessUsd,
      suitability,
      // 17A — read the canonical mounted existing-position (never an independent cToken scan that can drift).
      holdsExactCToken: positions.some((p) => p.candidateId === "kamino_usdc_lending" && p.existingPositionOnly === true),
      approvedTopUpRulePasses: false,
      klendMarket: marketInput && capacityCovers
        ? { apy: marketInput.apy, availability: marketInput.availability, capacity: { fresh: marketInput.capacity.fresh, sufficientForAmount: capacityCovers } }
        : marketInput, // when capacity does not cover the amount, keep the snapshot's own (insufficient) capacity
    });
    // 17H.1 — AND-narrow with the completeness direct-lending gate (never enables; only suppresses).
    if (dl.emit && completeness.gates.directLending === "allowed") cards.push(dl.card);
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
    // 17H.1 — canonical completeness for the dashboard + Smith AI (computed once; never recomputed).
    portfolioCompleteness: completeness.result,
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
  /** Step 16H-S.5 — the live Kamino Direct market snapshot from useKlendDirectUsdcMarketSnapshot (fresh or null). */
  klendMarketSnapshot?: KlendDirectUsdcMarketSnapshot | null;
}): { portfolioCompleteness?: PortfolioCompletenessResult } {
  const { positions, pricedAsOf, goal, loading, onSuggestions, klendMarketSnapshot } = args;
  const { cards, reviewDetailsById, contributionReviewById, stableYieldReviewById, notice, available, portfolioCompleteness } = deriveRailSuggestions({
    positions,
    pricedAsOf,
    goal,
    klendMarketSnapshot: klendMarketSnapshot ?? undefined,
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
    onSuggestions({ cards, reviewDetailsById, contributionReviewById, stableYieldReviewById, notice, available, loading, portfolioCompleteness });
    // Signature gates the update; card objects are intentionally omitted from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, onSuggestions]);

  // Step 17H.2 — expose the SAME already-computed completeness result to the portfolio body (banner +
  // position reasons + On Track UI). No second computation: it is destructured from deriveRailSuggestions.
  return { portfolioCompleteness };
}
