/**
 * contributionPlanPipeline — Step 15H. Runs the full deterministic 15B–15G pipeline from canonical
 * product state and converts a ready plan into a product suggestion. It reuses every existing layer
 * (no re-implementation), fails closed on invalid/stale/incomplete data, never invents a value, and
 * never falls back to fixtures in real_wallet mode. Safety Buffer priority short-circuits ahead of
 * growth: it needs no SOL price and no liquidity; growth-with-excess-USDC needs a fresh price + a
 * valid current liquidity snapshot with a preserved buffer.
 */
import {
  CONTRIBUTION_PRODUCT_INTEGRATION_SCHEMA_VERSION,
  CONTRIBUTION_PRODUCT_INTEGRATION_POLICY_ID,
  CONTRIBUTION_PRODUCT_INTEGRATION_POLICY_VERSION,
  type ContributionPipelineBlocker,
  type ContributionPipelineResult,
  type ContributionPipelineStatus,
  type ContributionProductDataMode,
} from "./contributionIntegrationTypes";
import { normalizeContributionFrequency } from "./contributionFrequencyNormalization";
import { buildGrowthTargetAllocationPolicyResult } from "./growthTargetAllocationPolicy";
import type { CanonicalTargetAllocation } from "./canonicalTargetAllocation";
import type { RebalanceTargetState } from "./rebalanceAssessment";
import { TARGET_ALLOCATION_ASSESSMENT_VERSION } from "./targetAllocationAssessment";
import { evaluateInvestmentTargetTechnicalEligibility, type InvestmentTargetTechnicalContext } from "./investmentTargetEligibility";
import { evaluateContributionTargetSuitability } from "./contributionTargetSuitability";
import { evaluateContributionTargetPolicyEligibility } from "./contributionTargetPolicyEligibility";
import { getDcaMinimumPolicy } from "./dcaMinimumPolicy";
import { buildContributionAllocationGapAnalysis, validateContributionPortfolioAllocationSnapshot } from "./contributionAllocationGapEngine";
import { buildContributionPriorityDecision } from "./contributionPriorityEngine";
import { buildContributionFundingSelection } from "./contributionFundingSelection";
import { buildContributionPlan } from "./contributionPlanGenerator";
import { getInvestmentTarget } from "./investmentTargetRegistry";
import { SUGGESTION_ENGINE_VERSION } from "./engineThresholds";
import { buildContributionPlanSuggestion } from "./contributionPlanSuggestion";
import type { ContributionPortfolioAllocationSnapshot } from "./contributionAllocationGapTypes";
import type { ContributionSafetyBufferSnapshot } from "./contributionPriorityTypes";
import type { ContributionPriceQuote } from "./contributionPricePolicy";
import type { ContributionFundingLiquiditySnapshot } from "./contributionFundingTypes";
import { validateContributionPriceQuote } from "./contributionPricePolicy";

export const CONTRIBUTION_PLAN_PIPELINE_EXISTS = true;

export interface ContributionProfile {
  monthlySavingGoalUsd?: unknown;
  contributionFrequency?: unknown;
  goal?: unknown;
  riskLevel?: unknown;
  timeHorizon?: unknown;
}

export interface BuildContributionPlanPipelineInput {
  dataMode: ContributionProductDataMode;
  profile: ContributionProfile;
  portfolioSnapshot: ContributionPortfolioAllocationSnapshot;
  safetyBufferSnapshot: ContributionSafetyBufferSnapshot;
  priceQuoteByTargetId?: Record<string, ContributionPriceQuote>;
  liquiditySnapshot?: ContributionFundingLiquiditySnapshot | null;
  explicitCurrentContributionAmountUsd?: number;
  explicitCurrentContributionAmountSource?: "user_entered" | "detected" | "test_fixture";
  /**
   * Step 22F (slice 4) — the shared five-factor CANONICAL target (the SAME object Rebalance receives). When
   * PROVIDED (mounted real-wallet, or an explicit fixture target) it is the SOLE target-allocation source and the
   * pipeline recalculates no target; a non-usable target fails closed (`targetState`) with NO risk-only fallback.
   * When OMITTED (`undefined`): real-wallet fails closed; Demo/testing fall back to the explicitly-named transitional
   * risk-only target (removed in Slice 7). Never pass a raw market score/cache/observation or profile factors here.
   */
  targetAllocation?: CanonicalTargetAllocation | null;
  targetState?: RebalanceTargetState;
  generatedAt: string;
  checkedAt: string;
}

/** Slice 4 — the minimum safe target metadata surfaced on the pipeline result for the DCA Review. */
interface PipelineTargetMeta {
  targetConfidence: string | null;
  targetMethodologyVersion: string | null;
  marketIncluded: boolean;
  marketExclusionReason: string | null;
  marketAdjustmentVsProfileOnlyPct: number | null;
  profileOnlyTargetStablePct: number | null;
  finalTargetStablePct: number;
  finalTargetCryptoPct: number;
}
const round2Pct = (n: number): number => Math.round(n * 100) / 100;
function canonicalTargetMeta(ct: CanonicalTargetAllocation): PipelineTargetMeta {
  const marketIncluded = ct.targetConfidence === "full" && ct.methodologyVersion === TARGET_ALLOCATION_ASSESSMENT_VERSION;
  const profileOnlyTargetStablePct = marketIncluded && ct.marketAdjustmentVsProfileOnlyPct != null ? round2Pct(ct.targetStablePct - ct.marketAdjustmentVsProfileOnlyPct) : null;
  return { targetConfidence: ct.targetConfidence, targetMethodologyVersion: ct.methodologyVersion, marketIncluded, marketExclusionReason: ct.marketExclusionReason, marketAdjustmentVsProfileOnlyPct: ct.marketAdjustmentVsProfileOnlyPct, profileOnlyTargetStablePct, finalTargetStablePct: ct.targetStablePct, finalTargetCryptoPct: ct.targetCryptoPct };
}

function base(dataMode: ContributionProductDataMode, status: ContributionPipelineStatus, extra: Partial<ContributionPipelineResult> = {}): ContributionPipelineResult {
  return {
    schemaVersion: CONTRIBUTION_PRODUCT_INTEGRATION_SCHEMA_VERSION,
    policyId: CONTRIBUTION_PRODUCT_INTEGRATION_POLICY_ID,
    policyVersion: CONTRIBUTION_PRODUCT_INTEGRATION_POLICY_VERSION,
    dataMode,
    status,
    productSuggestionGenerated: false,
    existingSuggestionEnriched: false,
    realWalletDataUsed: dataMode === "real_wallet",
    demoFixtureDataUsed: dataMode === "demo_fixture",
    testingFixtureDataUsed: dataMode === "testing_fixture",
    fixtureFallbackUsed: false,
    productOutputUpdated: false,
    transactionsEnabled: false,
    walletSignatureRequired: false,
    blockers: [],
    warnings: [],
    notes: [],
    ...extra,
  };
}

export function buildContributionPlanPipeline(input: BuildContributionPlanPipelineInput): ContributionPipelineResult {
  const dm = input?.dataMode;
  const fail = (status: ContributionPipelineStatus, blockers: ContributionPipelineBlocker[]) => base(dm, status, { blockers });
  if (!input || (dm !== "demo_fixture" && dm !== "real_wallet" && dm !== "testing_fixture")) return base(dm ?? "testing_fixture", "invalid_input", { blockers: ["profile_invalid"] });

  // (2) Profile.
  const goal = input.profile?.monthlySavingGoalUsd;
  const freq = input.profile?.contributionFrequency;
  if (!input.profile || typeof input.profile !== "object") return fail("unavailable_profile", ["profile_missing"]);
  if (goal == null) return fail("unavailable_profile", ["monthly_saving_goal_missing"]);
  if (freq == null || (typeof freq === "string" && freq.trim() === "")) return fail("blocked_frequency", ["contribution_frequency_missing"]);

  // (3) Portfolio snapshot.
  const psv = validateContributionPortfolioAllocationSnapshot(input.portfolioSnapshot);
  if (!psv.valid) {
    const stale = psv.errors.includes("portfolio_snapshot_stale");
    return fail("unavailable_portfolio", [stale ? "portfolio_snapshot_stale" : "portfolio_snapshot_invalid"]);
  }

  // (4) Safety Buffer snapshot.
  if (!input.safetyBufferSnapshot || input.safetyBufferSnapshot.status === "invalid" || input.safetyBufferSnapshot.canonicalCalculationUsed !== true) return fail("blocked_policy", ["safety_buffer_result_invalid"]);

  // (3b→4) Step 15B — contribution frequency.
  const freqNorm = normalizeContributionFrequency({ monthlySavingGoalUsd: goal, contributionFrequency: freq });
  if (freqNorm.status === "missing_frequency" || freqNorm.status === "unsupported_frequency" || freqNorm.status === "invalid_currency") return fail("blocked_frequency", ["contribution_frequency_invalid"]);
  if (freqNorm.status === "invalid_saving_goal" || freqNorm.status === "unsafe_numeric_input") return fail("unavailable_profile", ["monthly_saving_goal_missing"]);

  // (4→5) Step 15C / 22F(slice 4.1) — target allocation. The GROWTH/DCA path needs the canonical target ONLY when the
  // Safety Buffer is COMPLETE. An INCOMPLETE buffer SHORT-CIRCUITS to the Safety-Buffer priority path BEFORE any
  // target is derived: NO risk-only allocation, NO canonical adapter, NO growth/stable split — the buffer
  // contribution candidate flows through with a "growth allocation not evaluated" gap (which the priority
  // buffer-override ignores). For the growth/DCA path a SUPPLIED canonical target (mounted real-wallet, or an explicit
  // fixture target) is the SOLE source and fails closed on any non-usable state — NEVER a risk-only fallback. Only
  // demo/testing growth uses the explicitly-named transitional risk-only target (Slice 7 removes it); the real-wallet
  // DCA path never does.
  const solT = getInvestmentTarget("sol")!;
  const solQuote = input.priceQuoteByTargetId?.sol;
  const priceValid = solQuote != null && validateContributionPriceQuote(solQuote).valid;
  const bufferComplete = input.safetyBufferSnapshot.status === "complete";
  let gap: ReturnType<typeof buildContributionAllocationGapAnalysis>;
  let targetMeta: PipelineTargetMeta | undefined;
  if (!bufferComplete) {
    // Safety-Buffer short-circuit — NO target is derived. The priority engine's incomplete-buffer branch requires no
    // allocation gap, so pass a typed "growth allocation not evaluated" (blocked) gap; the buffer plan is preserved.
    gap = buildContributionAllocationGapAnalysis({ snapshot: input.portfolioSnapshot, targetAllocationResult: buildGrowthTargetAllocationPolicyResult({ targetStablePct: 0, targetVolatilePct: 0, sourceEngineVersion: SUGGESTION_ENGINE_VERSION }), policyEligibilityByTargetId: {}, generatedAt: input.generatedAt, checkedAt: input.checkedAt });
  } else {
    let targetStablePct: number;
    let targetVolatilePct: number;
    // Step 22F (slice 7D) — the SUPPLIED canonical target is the SOLE growth/DCA target source in EVERY mode
    // (real-wallet, Demo, testing). A missing (`undefined`) or non-usable target FAILS CLOSED — the transitional
    // legacy risk-only fallback branch has been DELETED; there is no mode-based fallback.
    if (input.targetAllocation === undefined) {
      return fail("blocked_policy", ["target_unresolved"]);
    }
    const ct = input.targetAllocation;
    const usable = ct != null && (ct.targetConfidence === "full" || ct.targetConfidence === "degraded_market_excluded") && Number.isFinite(ct.targetStablePct) && Number.isFinite(ct.targetCryptoPct);
    if (!usable) {
      const st = input.targetState ?? "unresolved";
      const blocker: ContributionPipelineBlocker = st === "blocked" ? "target_blocked" : st === "unavailable" ? "target_unavailable" : "target_unresolved";
      return fail("blocked_policy", [blocker]);
    }
    targetStablePct = ct.targetStablePct;
    targetVolatilePct = ct.targetCryptoPct;
    targetMeta = canonicalTargetMeta(ct);
    // With BTC/ETH now enabled growth targets, the allocation policy needs to know which
    // growth assets this user actually HOLDS (and their risk level) to apply the versioned
    // sub-allocation. Held = the snapshot's non-stable target exposures with real value, so a
    // SOL-only portfolio still maps the whole growth bucket to SOL exactly as before.
    const heldGrowthTargetIds = input.portfolioSnapshot.targetExposures
      .filter((e) => e.targetId !== "usdc" && typeof e.valueUsd === "number" && e.valueUsd > 0)
      .map((e) => e.targetId);
    const alloc = buildGrowthTargetAllocationPolicyResult(
      { targetStablePct, targetVolatilePct, sourceEngineVersion: SUGGESTION_ENGINE_VERSION },
      { riskLevel: typeof input.profile.riskLevel === "string" ? input.profile.riskLevel : null, heldGrowthTargetIds },
    );
    if (alloc.status !== "configured") return fail("blocked_policy", ["allocation_policy_invalid"]);

    const techCtx: InvestmentTargetTechnicalContext = {
      checkedAt: input.checkedAt,
      availableHoldingSources: ["connected_wallet", "protocol_position"],
      priceStatusByTargetId: { sol: { available: priceValid, ...(solQuote?.fetchedAt ? { fetchedAt: solQuote.fetchedAt } : {}) } },
      configuredAllocationPolicyKeys: ["growth_target_allocation_v1"],
      configuredMinimumPolicyKeys: ["dca_minimum_v1"],
      configuredSuitabilityPolicyKeys: ["sol_growth_suitability_v1"],
      approvedTargetIds: [],
    };
    const techElig = evaluateInvestmentTargetTechnicalEligibility(solT, techCtx);
    const suit = evaluateContributionTargetSuitability(solT, { checkedAt: input.checkedAt, targetId: "sol", profile: { goal: input.profile.goal, riskLevel: input.profile.riskLevel, timeHorizon: input.profile.timeHorizon }, targetAllocationResult: alloc });
    const solElig = evaluateContributionTargetPolicyEligibility({ targetId: "sol", checkedAt: input.checkedAt, technicalEligibility: techElig, targetAllocationResult: alloc, suitabilityResult: suit, ...(solQuote ? { priceQuote: solQuote } : {}), minimumPolicy: getDcaMinimumPolicy() });

    // (6) Step 15D — allocation gap.
    gap = buildContributionAllocationGapAnalysis({ snapshot: input.portfolioSnapshot, targetAllocationResult: alloc, policyEligibilityByTargetId: { sol: solElig }, generatedAt: input.generatedAt, checkedAt: input.checkedAt });
  }

  // (7) Step 15E — priority (buffer override may proceed without a valid gap).
  const priority = buildContributionPriorityDecision({ safetyBufferResult: input.safetyBufferSnapshot, allocationGapResult: gap, generatedAt: input.generatedAt, checkedAt: input.checkedAt });
  if (priority.status === "blocked_safety_buffer") return fail("blocked_policy", ["contribution_priority_invalid"]);
  if (priority.status === "blocked_policy_readiness") {
    // Buffer complete but growth target not price-ready → surface the specific price cause.
    const b: ContributionPipelineBlocker = solQuote == null ? "price_quote_missing" : !priceValid ? (solQuote.status === "stale" ? "price_quote_stale" : "price_quote_invalid") : "allocation_gap_invalid";
    return fail(b === "price_quote_stale" || b === "price_quote_missing" || b === "price_quote_invalid" ? "unavailable_price" : "blocked_policy", [b]);
  }
  if (priority.status === "blocked_allocation_gap") return fail("unavailable_portfolio", ["allocation_gap_invalid"]);
  if (priority.status !== "complete") return fail("blocked_policy", ["contribution_priority_invalid"]);

  // (8) Step 15F — funding selection.
  const funding = buildContributionFundingSelection({ priorityDecision: priority, allocationGapResult: gap, frequencyNormalization: freqNorm, ...(input.explicitCurrentContributionAmountUsd != null ? { explicitCurrentContributionAmountUsd: input.explicitCurrentContributionAmountUsd, explicitCurrentContributionAmountSource: input.explicitCurrentContributionAmountSource } : {}), ...(input.liquiditySnapshot ? { liquiditySnapshot: input.liquiditySnapshot } : {}), generatedAt: input.generatedAt, checkedAt: input.checkedAt });

  // (9) Step 15G — plan.
  const planResult = buildContributionPlan({ priorityDecision: priority, fundingSelection: funding, allocationGapResult: gap, frequencyNormalization: freqNorm, generatedAt: input.generatedAt, checkedAt: input.checkedAt });

  // (10/11) Map or return typed no-action/blocked.
  if (planResult.status === "no_action_required") {
    return base(dm, "no_action_required", { planResult, notes: ["On Track: no contribution suggestion generated."] });
  }
  if (planResult.status === "ready_exact" || planResult.status === "ready_range") {
    const genMs = Date.parse(input.generatedAt);
    // Sourced unit price of the plan's target asset (valid quote only) → lets the review show the approx token amount.
    const targetQuote = input.priceQuoteByTargetId?.[planResult.plan?.selectedTargetId ?? ""];
    const targetPriceUsd = targetQuote != null && validateContributionPriceQuote(targetQuote).valid ? targetQuote.priceUsd : undefined;
    const suggestion = buildContributionPlanSuggestion(planResult, Number.isNaN(genMs) ? 0 : genMs, targetPriceUsd) ?? undefined;
    return base(dm, "ready", { planResult, plan: planResult.plan, suggestion, productSuggestionGenerated: suggestion != null, productOutputUpdated: suggestion != null, ...(targetMeta ?? {}) });
  }

  // Blocked plan → typed status with an accurate diagnostic; no product suggestion.
  const fb = funding.blockers.join(",");
  const notes = [`plan_status:${planResult.status}`, `funding_blockers:${fb}`];
  if (planResult.status === "blocked_multiple_targets") return base(dm, "blocked_policy", { planResult, blockers: ["multiple_targets_blocked"], notes });
  if (planResult.status === "blocked_priority") return base(dm, "blocked_policy", { planResult, blockers: ["contribution_priority_invalid"], notes });
  if (planResult.status === "invalid_input") return base(dm, "invalid_input", { planResult, blockers: ["contribution_plan_invalid"], notes });
  if (planResult.status === "blocked_projection") return base(dm, "blocked_plan", { planResult, blockers: ["contribution_plan_invalid"], notes });

  // blocked_funding — surface the true cause without letting a missing optional liquidity snapshot mask it.
  const upcoming = funding.sourceOptions.find((o) => o.sourceId === "upcoming_contribution");
  const upcomingEligible = upcoming != null && (upcoming.status === "eligible_exact" || upcoming.status === "eligible_range");
  const liqProvided = input.liquiditySnapshot != null;
  const liqStale = liqProvided && input.liquiditySnapshot!.status !== "current";
  if (upcoming?.status === "requires_explicit_amount") {
    return base(dm, "blocked_frequency", { planResult, blockers: ["contribution_frequency_invalid"], notes: [...notes, "explicit_amount_required"] });
  }
  if (liqStale && !upcomingEligible) {
    const b: ContributionPipelineBlocker = input.liquiditySnapshot!.status === "stale" ? "liquidity_snapshot_stale" : "liquidity_snapshot_invalid";
    return base(dm, "unavailable_liquidity", { planResult, blockers: [b], notes });
  }
  // Below-minimum upcoming / below-$250 excess / other funding block.
  return base(dm, "blocked_plan", { planResult, blockers: ["contribution_plan_invalid"], notes });
}
