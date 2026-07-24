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
  deriveSafetyBuffer,
} from "../wallet/walletSummary";
import { getSafetyBufferTargetMonths } from "../wallet/safetyBufferTarget";
import { buildSuggestionEngineInputs } from "./engineInputAdapter";
import { runSuggestionEngine } from "./engine";
import { deriveCompletenessGates, type PortfolioCompletenessResult } from "../wallet/portfolioCompleteness";
import { computeSafetyBufferCoverage } from "../wallet/safetyBufferCoverage";
import { deriveSafetyBufferAssessment, type SafetyBufferContributionPlanInput } from "./safetyBufferAssessment";
import { deriveBufferPositionReview } from "./bufferPositionVetting";
import { buildSafetyBufferCardFromAssessment, BUFFER_SUGGESTION_ID } from "./bufferSuggestion";
import { deriveRailSwapActions } from "./swapQuote/railSwapActions";
import type { SwapActionReadiness } from "./swapQuote/swapQuoteContracts";
import type { SwapQuoteFetcher } from "./swapQuote/swapQuoteClient";
import type { ContributionPlanSuggestion } from "./contributionIntegrationTypes";
import { deriveRebalanceAssessment, selectRebalanceUsdcSource, isRebalanceMaterial, isMaterialCryptoToStables, deriveNativeSolRebalanceSource, REBALANCE_NATIVE_SOL_RESERVE_POLICY, type RebalanceTargetState } from "./rebalanceAssessment";
import type { CanonicalTargetAllocation } from "./canonicalTargetAllocation";
import { buildRebalanceCardFromAssessment } from "./rebalanceSuggestion";
import { deriveTrimAssessment } from "./trimAssessment";
import { buildTrimCardFromAssessment } from "./trimSuggestion";
import { derivePositionOptimizationAssessment } from "./positionOptimizationAssessment";
import { buildPositionOptimizationCardFromAssessment } from "./positionOptimizationSuggestion";
import { derivePortfolioAssetAccounting } from "../wallet/portfolioAssetAccounting";
import { toSuggestionCards, warningsToNotice } from "./toSuggestionCard";
import { deriveContributionSuggestion } from "./contributionProductInput";
import { deriveStableYieldPlanSuggestion } from "./stableYieldProductInput";
import { evaluateDirectLendingForRail, type RuntimeSuppressionReason } from "./directUsdcLendingRuntimeAdapter";
import { KLEND_DIRECT_USDC_IDENTITY, toRuntimeMarketInput, capacityCoversAmount, type KlendDirectUsdcMarketSnapshot } from "./klendDirectUsdcMarketData";
import { deriveDirectLendingExcessUsd, deriveDirectLendingSuitability } from "./directUsdcLendingRailInputs";
import type { StableYieldReviewPresentation } from "./yieldStrategyPlanPresentationTypes";
import { CANONICAL_CONTRIBUTION_PRICE_SOURCE_ID } from "./contributionPricePolicy";
import type { ContributionPlanReviewDetails } from "./contributionPlanReviewDetails";
import { buildRailTargetContext, type RailTargetContext, type MarketConditionsCacheState } from "./railTargetContext";
import { useMarketConditionsCache } from "./useMarketConditionsCache";

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
  /**
   * Step 23C.1 — the exact, read-only `SwapActionReadiness` per card (Rebalance / Trim / eligible DCA), derived
   * from the production assessments via the Step-23A boundary adapters. The Review modal passes it to the
   * "Suggested route" section (fetched only when the modal opens). Cards with no swap have no entry. It NEVER
   * changes the financial suggestion. Absent for callers that don't derive it.
   */
  swapActionById?: Record<string, SwapActionReadiness>;
  /**
   * Step 23C.1 — an optional injected quote fetcher. Demo supplies a DETERMINISTIC sanitized fetcher (no live
   * providers); real wallet leaves it undefined so the modal uses the live `/api/swap-quote` client.
   */
  swapQuoteFetcher?: SwapQuoteFetcher;
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
  /**
   * Step 22F (slice 2) — the ONE shared canonical-target context per refresh (real-wallet only): the single
   * MarketConditionAssessment + five-factor TargetAllocationAssessment + canonical target-adapter result. NOT yet
   * consumed by any suggestion category, the dashboard, or the review modals — it is the seam that Slices 3–5 read.
   * Absent for Demo (which never loads the real cache) and for callers that pass no cache state.
   */
  targetContext?: RailTargetContext;
  /**
   * Step 22F (slice 5) — the MINIMUM safe canonical-target summary for the dashboard allocation display. It carries
   * the SAME shared target Rebalance + DCA consume, so the dashboard shows identical percentages. Never the raw
   * TargetAllocationAssessment, market cache, income/expenses, factor weights, or provider payload. Absent (undefined)
   * for callers with no target context (e.g. Demo/testing) so the dashboard keeps its existing display there.
   */
  targetSummary?: RailTargetSummary;
  /**
   * Step 22F (slice 6) — the minimum safe market-display summary for the dashboard Market Conditions surface.
   * Absent (undefined) for Demo/testing and callers with no target context.
   */
  marketSummary?: RailMarketSummary;
}

/** The minimum safe target fields the dashboard consumes (Step 22F slice 5). */
export interface RailTargetSummary {
  /** `full`/`degraded_market_excluded` carry percentages; `unavailable`/`blocked`/`unresolved`/`loading` do not. */
  state: RebalanceTargetState;
  targetCryptoPct: number | null;
  targetStablePct: number | null;
  /** True only for a degraded (market-excluded) target — drives the minimal renormalization disclosure. */
  marketExcluded: boolean;
}

export type RailMarketSummaryState = "loading" | "full" | "degraded" | "stale" | "unavailable" | "blocked";
/**
 * Step 22F (slice 6) — the MINIMUM safe market-display summary for the dashboard Market Conditions surface. Derived
 * ONCE from the already-shared MarketConditionAssessment + canonical target (no recompute of score/band/freshness/
 * target). Score/band/observedAt/attribution appear ONLY in the `full` state; every excluded/blocked/loading state
 * carries nulls so the UI never shows a stale score/band or a fake Neutral. Never the raw assessment/cache,
 * retrievedAt, validUntil, provider endpoint/payload, income/expenses, or an API key.
 */
export interface RailMarketSummary {
  state: RailMarketSummaryState;
  score: number | null;
  band: string | null;
  bandLabel: string | null;
  /** ISO — the approved observedAt, only in the `full` state (never retrievedAt/validUntil). */
  observedAt: string | null;
  sourceName: "CoinMarketCap" | null;
  scopeLabel: string | null;
  targetWeightPct: 10;
  marketIncluded: boolean;
  marketExcluded: boolean;
  marketAdjustmentVsProfileOnlyPct: number | null;
  targetConfidence: string | null;
}

/** Derive the safe market-display summary from the ONE shared target context (never recomputes anything). */
function deriveRailMarketSummary(ctx: RailTargetContext): RailMarketSummary {
  const mca = ctx.marketConditionAssessment;
  const ct = ctx.canonicalTargetAllocation;
  const confidence = ctx.targetAllocationAssessment.targetConfidence;
  let state: RailMarketSummaryState;
  if (ctx.targetLoadingState === "loading") state = "loading";
  else
    switch (mca.overallReadiness) {
      case "full": state = "full"; break;
      case "excluded_market_stale": state = "stale"; break;
      case "excluded_market_unavailable":
      case "excluded_market_failed": state = "degraded"; break;
      case "excluded_market_unapproved":
      case "blocked_invalid_score":
      case "blocked_methodology_mismatch": state = "blocked"; break;
      default: state = "unavailable"; // unresolved
    }
  const full = state === "full";
  return {
    state,
    score: full ? mca.score : null,
    band: full ? mca.band : null,
    bandLabel: full ? mca.displayBand : null,
    observedAt: full ? mca.observedAt : null,
    sourceName: full ? "CoinMarketCap" : null,
    scopeLabel: full ? "Broad crypto-market sentiment" : null,
    targetWeightPct: 10,
    marketIncluded: full,
    marketExcluded: state === "degraded" || state === "stale",
    marketAdjustmentVsProfileOnlyPct: full ? (ct?.marketAdjustmentVsProfileOnlyPct ?? null) : null,
    targetConfidence: confidence,
  };
}

/** The lifted rail payload (adds the live-read loading flag). */
export interface RailSuggestions extends RailSuggestionsData {
  loading: boolean;
}

/**
 * Step 21C — normalize a plan-backed BUFFER contribution suggestion into the assessment's contribution input.
 * Reads only the plan's SOURCE amount/cadence (never recomputes the buffer). Non-buffer suggestions → null.
 */
function normalizeBufferContributionPlan(
  sug: { category?: string; amount?: { valueUsd?: number } | null; contributionPlan?: { amountKind?: string; exactAmountUsd?: number; minimumAmountUsd?: number; maximumAmountUsd?: number; contributionFrequencyId?: string } } | null | undefined
): SafetyBufferContributionPlanInput | null {
  if (!sug || sug.category !== "buffer") return null;
  const p = sug.contributionPlan;
  const planned = typeof sug.amount?.valueUsd === "number" ? sug.amount.valueUsd : p?.exactAmountUsd ?? p?.maximumAmountUsd ?? null;
  return {
    planIsReady: true,
    planIsRange: p?.amountKind === "range",
    plannedContributionUsd: typeof planned === "number" ? planned : null,
    plannedContributionMinUsd: p?.minimumAmountUsd ?? null,
    plannedContributionMaxUsd: p?.maximumAmountUsd ?? null,
    cadence: p?.contributionFrequencyId ?? null,
  };
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
  /**
   * Step 22F (slice 2) — the published market-conditions cache read by the component-layer hook
   * (`useMarketConditionsCache`), passed in like `klendMarketSnapshot`. The pure rail NEVER fetches. When
   * `marketConditionsCacheState` is provided (real-wallet), the rail derives the ONE shared target context; when
   * absent (Demo / callers without the cache), no context is derived and behavior is byte-identical to before.
   */
  marketConditionsCacheInput?: unknown | null;
  marketConditionsCacheState?: MarketConditionsCacheState;
  targetGeneratedAt?: number;
}): RailSuggestionsData {
  const { positions, pricedAsOf, goal, klendMarketSnapshot, directLendingExcessUsd, directLendingSuitability } = args;
  const dataMode = args.dataMode ?? "real_wallet";
  // Step 22F (slice 7D) — the canonical target path is UNCONDITIONAL now (the transitional branch is deleted). This
  // flag governs only whether the rail EXPOSES the dashboard target/market SUMMARIES: real-wallet ALWAYS exposes them
  // (fail-closed unresolved when it has no cache), and Demo/testing expose them only when they supply a DETERMINISTIC
  // governed cache. Demo/testing WITHOUT a cache expose no summary (the dashboard keeps its existing display) yet still
  // fail closed on the target itself — there is no risk-only fallback in any mode.
  const canonicalSummaryEligible = dataMode === "real_wallet" || args.marketConditionsCacheState !== undefined;

  const value = deriveValueBreakdown(positions);

  // Step 21C — ONE canonical SafetyBufferCoverage per refresh, shared by the Safety Buffer summary, the
  // SafetyBufferAssessment, completeness, Rebalance, Trim, and Position Optimization. The risk-based target is
  // computed once; coverage is computed once against it (no second deriveSafetyBuffer reclassification).
  const bufferTargetMonths = getSafetyBufferTargetMonths(goal?.risk_tolerance);
  const monthlyExpensesUsd = goal?.expenses_monthly ?? null;
  const bufferTargetUsd =
    pricedAsOf != null && typeof monthlyExpensesUsd === "number" && monthlyExpensesUsd > 0 && typeof bufferTargetMonths === "number" && bufferTargetMonths > 0
      ? monthlyExpensesUsd * bufferTargetMonths
      : 0;
  const bufferCoverage = computeSafetyBufferCoverage(positions, bufferTargetUsd);
  // Risk-based Safety Buffer summary (only once priced, so a 0 reserve is real). Reuses the shared coverage.
  const buffer =
    pricedAsOf != null
      ? deriveSafetyBuffer(positions, goal?.expenses_monthly, bufferTargetMonths, bufferCoverage)
      : null;

  // Current allocation total (bucket-level), from sourced value only — sizes the canonical target context below.
  const total = value.totalUsd ?? 0;
  const showAllocation = value.totalUsd != null && total > 0;
  // Step 22F (slice 7D) — the legacy risk-only allocation input is REMOVED: the engine no longer has a legacy DCA
  // fallback, so there is no `allocation` to feed it. DCA comes ONLY from the canonical contribution pipeline
  // (`planDca`). The engine `allocation` input is always null now.
  const allocationInput = null;

  // Step 22F (slice 2) — the ONE shared canonical-target context per refresh. Derived here (real-wallet only, and
  // only when the component-layer hook has provided a cache state) so Slices 3–5 can read a single
  // MarketConditionAssessment + TargetAllocationAssessment + canonical target. NOT consumed by any suggestion,
  // the dashboard, or the modals yet — the legacy risk-only path above is untouched, and there is NO risk-only
  // fallback in this canonical path. Demo passes no cache state → no context → behavior is byte-identical.
  const targetContext: RailTargetContext | undefined =
    args.marketConditionsCacheState !== undefined
      ? buildRailTargetContext({
          goal,
          cacheInput: args.marketConditionsCacheInput ?? null,
          cacheState: args.marketConditionsCacheState,
          generatedAt: args.targetGeneratedAt ?? pricedAsOf ?? Date.now(),
          totalPricedUsd: showAllocation ? total : null,
        })
      : undefined;

  // Step 22F (slice 3.1/4/7D) — the ONE shared five-factor canonical target per refresh, resolved ONCE and consumed by
  // BOTH Rebalance and DCA/contribution (§5 "one shared target"). EVERY mode (real-wallet, Demo, testing) uses the
  // canonical path UNCONDITIONALLY: missing cache state, missing targetContext, or a null canonical target FAIL CLOSED
  // (unresolved/loading/unavailable/blocked → no Rebalance and no target-based DCA), with NO risk-only fallback and no
  // risk-only flicker. The transitional risk-only target has been DELETED — there is no non-canonical branch.
  let rebalanceTarget: CanonicalTargetAllocation | null;
  let rebalanceTargetState: RebalanceTargetState;
  if (!targetContext) {
    // No cache state / no context (real-wallet with an omitted cache, or Demo/testing without a deterministic market
    // input) → fail closed, NEVER transitional.
    rebalanceTarget = null;
    rebalanceTargetState = "unresolved";
  } else if (targetContext.targetLoadingState === "loading") {
    // Loading → no card, and no transient risk-only render.
    rebalanceTarget = null;
    rebalanceTargetState = "loading";
  } else {
    rebalanceTarget = targetContext.canonicalTargetAllocation ?? null;
    rebalanceTargetState = targetContext.targetAllocationAssessment.targetConfidence as RebalanceTargetState;
  }

  // Step 15H / 22F(slice 4/7D) — the deterministic plan-backed contribution suggestion from REAL wallet state (never
  // fixtures). ALL modes consume the SAME shared canonical target (fail closed on any non-usable state); the target is
  // ALWAYS passed (a null canonical target → the pipeline fails closed, never a risk-only fallback). Merged into the
  // engine BEFORE its sort/Top-Pick pass so ordering is engine-owned. Real-wallet positions are priced exclusively
  // through the canonical token-price service, so `token_price_service` is a DEMONSTRABLE provenance (not fabricated).
  const contribution = deriveContributionSuggestion({
    dataMode, positions, pricedAsOf, goal, buffer,
    priceProvenance: { sourceId: CANONICAL_CONTRIBUTION_PRICE_SOURCE_ID },
    targetAllocation: rebalanceTarget, targetState: rebalanceTargetState,
  });

  // Step 16H-D — the shared Stable Yield orchestration prepares the optional 16G plan decision → 16H-A
  // suggestion. Real Wallet uses the production pipeline (no approved product → no_plan → null); Demo
  // uses injected demo-only data. Merged into the engine BEFORE its sort/Top-Pick pass (never marked
  // Top Pick here). The presentation review is keyed by the SAME suggestion id the card uses.
  const stableYield = deriveStableYieldPlanSuggestion({ dataMode, positions, pricedAsOf, goal, buffer });

  // Step 17H.1 — the canonical portfolio-completeness gates, computed ONCE over the SAME final merged
  // positions + the production Safety Buffer target. Passed to the engine to NARROW (never enable) the
  // On Track / staking / DCA / direct-lending candidates; the completeness result + blockingIssues/warnings
  // are returned for the dashboard + Smith AI to consume without recomputing.
  // Step 18D/21C — the shared canonical coverage (computed ONCE above) feeds completeness AND the Rebalance /
  // Trim / Position Optimization assessments (same positions + same requiredBufferUsd; no recomputation).
  const requiredBufferUsd = buffer?.targetUsd ?? bufferTargetUsd;
  const completeness = deriveCompletenessGates(positions, { requiredBufferUsd, bufferCoverage });

  // Step 18C/22F — one authoritative Rebalance result from the canonical assessment, computed ONCE over the same
  // merged positions + mounted completeness + the SAME canonical coverage object, consuming the canonical target
  // above. `material` preserves conflict suppression even without a card.
  const rebalanceAssessment = deriveRebalanceAssessment({
    positions, portfolioCompleteness: completeness.result, safetyBufferCoverage: bufferCoverage,
    targetAllocation: rebalanceTarget, targetState: rebalanceTargetState, requiredBufferUsd, generatedAt: pricedAsOf ?? Date.now(),
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

  // Step 20C — ONE canonical Position Optimization assessment per refresh over the SAME merged positions +
  // shared completeness + shared SafetyBufferCoverage + the SHARED gross-asset accounting (no second wallet
  // aggregation / completeness / buffer / accounting derivation, no RPC). Production uses the canonical APY
  // freshness-policy registry (fixture-only approved policies are NEVER injected here). Coexists with all.
  const portfolioAccounting = derivePortfolioAssetAccounting(positions, completeness.result);
  const positionOptimizationAssessment = derivePositionOptimizationAssessment({
    positions, portfolioCompleteness: completeness.result, safetyBufferCoverage: bufferCoverage,
    requiredBufferUsd, portfolioAccounting, generatedAt: pricedAsOf ?? Date.now(),
  });
  const positionOptimizationOverride = {
    candidate: buildPositionOptimizationCardFromAssessment(positionOptimizationAssessment, pricedAsOf ?? 0),
    reviewNeed: positionOptimizationAssessment.overallReadiness.status === "allowed",
  };

  // Step 21C — ONE canonical SafetyBufferAssessment per refresh over the SHARED coverage. The plan-backed buffer's
  // SOURCE plan is normalized into the assessment (never injected as a prebuilt engine candidate). The ONE buffer
  // card comes from `buildSafetyBufferCardFromAssessment` behind the `top_up_buffer` contract. `blocksDownstream`
  // is true for every non-complete state (definite / below-minimum / unresolved / unavailable), so downstream
  // deployment and On Track stay suppressed until coverage is proven complete. Coverage is unavailable before pricing.
  const bufferContributionPlan = normalizeBufferContributionPlan(contribution.suggestion);
  const safetyBufferAssessment = deriveSafetyBufferAssessment({
    coverage: pricedAsOf != null ? bufferCoverage : null,
    monthlyExpensesUsd,
    targetMonths: bufferTargetMonths,
    contributionPlan: bufferContributionPlan,
    // Step 22 — a detected USDC lending position not yet vetted for Safety Buffer use (already excluded from coverage).
    bufferPositionReview: pricedAsOf != null ? deriveBufferPositionReview(bufferCoverage, positions) : null,
    generatedAt: pricedAsOf ?? Date.now(),
  });
  const bufferOverride = {
    candidate: buildSafetyBufferCardFromAssessment(safetyBufferAssessment, pricedAsOf ?? 0),
    bufferSatisfied: safetyBufferAssessment.presentationState === "complete",
    blocksDownstream: safetyBufferAssessment.presentationState !== "complete",
  };
  // The plan-backed BUFFER candidate is now normalized into the assessment above — do not also pass it to the
  // engine as a contributionSuggestion (that path only carries the DCA plan candidate now).
  const contributionCandidate = contribution.suggestion?.category === "buffer" ? null : contribution.suggestion;

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
    contributionCandidate,
    stableYield.suggestion,
    completeness.gates,
    rebalanceOverride,
    trimOverride,
    positionOptimizationOverride,
    bufferOverride,
    // Step 21E — the canonical On Track inputs. The engine derives ONE OnTrackAssessment in Stage B (after the
    // actual candidate set is assembled) from the SHARED Safety Buffer + Rebalance assessments + completeness;
    // the legacy bucket-allocation On Track rule is no longer mounted. No second calculation is introduced.
    { safetyBufferAssessment, rebalanceAssessment, portfolioCompleteness: completeness.result }
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
  // Step 22F (slice 5) — the dashboard allocation summary consumes the SAME shared canonical target as Rebalance/DCA
  // (real-wallet only). Percentages appear only for a usable target (full/degraded); every non-usable state
  // (unavailable/blocked/unresolved/loading) carries null percentages so the dashboard shows a safe state, never a
  // risk-only fallback. Demo/testing get no summary (undefined) → the dashboard keeps its existing display.
  const targetSummary: RailTargetSummary | undefined =
    canonicalSummaryEligible
      ? {
          state: rebalanceTarget != null ? (rebalanceTarget.targetConfidence as RebalanceTargetState) : rebalanceTargetState,
          targetCryptoPct: rebalanceTarget?.targetCryptoPct ?? null,
          targetStablePct: rebalanceTarget?.targetStablePct ?? null,
          marketExcluded: rebalanceTarget?.marketExcluded ?? false,
        }
      : undefined;
  // Step 22F (slice 6/7) — the safe market-display summary (canonical path; derived ONCE from the shared context).
  const marketSummary: RailMarketSummary | undefined =
    canonicalSummaryEligible && targetContext ? deriveRailMarketSummary(targetContext) : undefined;
  // The plan-backed BUFFER contribution shares the buffer card's id (`top_up_buffer`) and is folded into the
  // SafetyBufferAssessment, so it is never rendered as its own card. When the buffer surfaces the specific
  // "unvetted USDC position" review, the authoritative modal is the buffer card's own reviewDetails ("Move Your
  // Safety Buffer USDC"); the contribution review would otherwise SHADOW it (the rail resolves contribution reviews
  // before reviewDetails), opening the wrong "Directing $X from your next contribution" modal. Drop it in that case.
  const contributionReviewById = { ...contribution.reviewById };
  if (safetyBufferAssessment.bufferPositionReview != null) delete contributionReviewById[BUFFER_SUGGESTION_ID];
  // Step 23C.1 — exact quote-ready swap actions per card, derived ONLY through the Step-23A boundary adapters
  // (no financial recalculation here). USDC funding uses the coverage's $1 basis; native SOL uses the fresh SOL
  // price; the 0.1 SOL reserve is already enforced inside `nativeSolSource.technicallyAvailableLamports`.
  const swapActionById = deriveRailSwapActions({
    cards,
    generatedAt: new Date(pricedAsOf ?? Date.now()).toISOString(),
    rebalance: { assessment: rebalanceAssessment, usdcSource, nativeSolSource, usdcUnitPriceUsd: 1, solUnitPriceUsd: solPrice },
    trimHoldings: trimAssessment.candidateHoldings,
    contributionSuggestion: (contribution.suggestion as ContributionPlanSuggestion | null),
  });
  return {
    cards,
    reviewDetailsById,
    contributionReviewById,
    stableYieldReviewById: stableYield.reviewById,
    swapActionById,
    notice: warningsToNotice(engineResult.warnings),
    available: cards.length > 0,
    directLendingSuppression,
    // 17H.1 — canonical completeness for the dashboard + Smith AI (computed once; never recomputed).
    portfolioCompleteness: completeness.result,
    // 22F slice 2 — the shared canonical-target context (real-wallet only; undefined otherwise).
    ...(targetContext ? { targetContext } : {}),
    // 22F slice 5 — the minimum safe target summary for the dashboard allocation display.
    ...(targetSummary ? { targetSummary } : {}),
    // 22F slice 6 — the minimum safe market-display summary for the dashboard Market Conditions surface.
    ...(marketSummary ? { marketSummary } : {}),
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
}): { portfolioCompleteness?: PortfolioCompletenessResult; targetSummary?: RailTargetSummary; marketSummary?: RailMarketSummary } {
  const { positions, pricedAsOf, goal, loading, onSuggestions, klendMarketSnapshot } = args;
  // Step 22F (slice 2) — load the published, same-origin market-conditions cache (real-wallet path only; the hook
  // never calls CoinMarketCap and holds no key). The parsed artifact + state feed the pure rail, which derives the
  // ONE shared target context. Nothing consumes it yet, so no user-facing behavior changes.
  const marketCache = useMarketConditionsCache();
  // `targetContext` is derived inside deriveRailSuggestions (available to Slices 3–5 + fixtures); the hook does not
  // read it yet — nothing consumes the canonical target in Slice 2, so it is intentionally not lifted to the page.
  const { cards, reviewDetailsById, contributionReviewById, stableYieldReviewById, swapActionById, notice, available, portfolioCompleteness, targetSummary, marketSummary } = deriveRailSuggestions({
    positions,
    pricedAsOf,
    goal,
    klendMarketSnapshot: klendMarketSnapshot ?? undefined,
    marketConditionsCacheInput: marketCache.cacheInput,
    marketConditionsCacheState: marketCache.cacheState,
    targetGeneratedAt: pricedAsOf ?? undefined,
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
    // Slice 5 — a target-state/percentage change lifts a fresh payload so the dashboard summary updates once.
    targetSummary: targetSummary ?? null,
    // Slice 6 — a market-state/score/band change lifts a fresh payload so the Market Conditions surface updates once.
    marketSummary: marketSummary ?? null,
  });
  const lastSignature = useRef<string | null>(null);
  useEffect(() => {
    if (!onSuggestions) return;
    if (signature === lastSignature.current) return;
    lastSignature.current = signature;
    onSuggestions({ cards, reviewDetailsById, contributionReviewById, stableYieldReviewById, swapActionById, notice, available, loading, portfolioCompleteness, ...(targetSummary ? { targetSummary } : {}), ...(marketSummary ? { marketSummary } : {}) });
    // Signature gates the update; card objects are intentionally omitted from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, onSuggestions]);

  // Step 17H.2 — expose the SAME already-computed completeness result to the portfolio body (banner +
  // position reasons + On Track UI). No second computation: it is destructured from deriveRailSuggestions.
  // Slice 5/6 — also return the shared canonical target + market summaries for the dashboard (real-wallet only).
  return { portfolioCompleteness, ...(targetSummary ? { targetSummary } : {}), ...(marketSummary ? { marketSummary } : {}) };
}
