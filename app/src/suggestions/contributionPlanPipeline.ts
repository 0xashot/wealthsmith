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
import { deriveRecommendedAllocation } from "../wallet/recommendedAllocation";
import { buildGrowthTargetAllocationPolicyResult } from "./growthTargetAllocationPolicy";
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
  generatedAt: string;
  checkedAt: string;
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
  const total = input.portfolioSnapshot.totalPortfolioValueUsd;

  // (4) Safety Buffer snapshot.
  if (!input.safetyBufferSnapshot || input.safetyBufferSnapshot.status === "invalid" || input.safetyBufferSnapshot.canonicalCalculationUsed !== true) return fail("blocked_policy", ["safety_buffer_result_invalid"]);

  // (3b→4) Step 15B — contribution frequency.
  const freqNorm = normalizeContributionFrequency({ monthlySavingGoalUsd: goal, contributionFrequency: freq });
  if (freqNorm.status === "missing_frequency" || freqNorm.status === "unsupported_frequency" || freqNorm.status === "invalid_currency") return fail("blocked_frequency", ["contribution_frequency_invalid"]);
  if (freqNorm.status === "invalid_saving_goal" || freqNorm.status === "unsafe_numeric_input") return fail("unavailable_profile", ["monthly_saving_goal_missing"]);

  // (4→5) Step 15C — allocation policy + SOL policy readiness (uses the canonical price quote).
  const rec = deriveRecommendedAllocation({ riskTolerance: typeof input.profile.riskLevel === "string" ? input.profile.riskLevel : undefined, totalPricedUsd: total });
  if (!rec) return fail("blocked_policy", ["allocation_policy_invalid"]);
  const alloc = buildGrowthTargetAllocationPolicyResult({ targetStablePct: rec.stablePct, targetVolatilePct: rec.cryptoPct, sourceEngineVersion: SUGGESTION_ENGINE_VERSION });
  if (alloc.status !== "configured") return fail("blocked_policy", ["allocation_policy_invalid"]);

  const solT = getInvestmentTarget("sol")!;
  const solQuote = input.priceQuoteByTargetId?.sol;
  const priceValid = solQuote != null && validateContributionPriceQuote(solQuote).valid;
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
  const gap = buildContributionAllocationGapAnalysis({ snapshot: input.portfolioSnapshot, targetAllocationResult: alloc, policyEligibilityByTargetId: { sol: solElig }, generatedAt: input.generatedAt, checkedAt: input.checkedAt });

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
    const suggestion = buildContributionPlanSuggestion(planResult, Number.isNaN(genMs) ? 0 : genMs) ?? undefined;
    return base(dm, "ready", { planResult, plan: planResult.plan, suggestion, productSuggestionGenerated: suggestion != null, productOutputUpdated: suggestion != null });
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
