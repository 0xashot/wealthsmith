/**
 * contributionFundingSelection — Step 15F. Orchestrates the deterministic funding-source selection:
 * evaluates the upcoming-contribution source and (for growth) the existing-excess-USDC source,
 * preserves the deterministic source order (upcoming first), selects the first eligible source as
 * primary, and retains any later eligible source as an alternative. Mixed funding is disabled and no
 * sources are combined. It selects no final target, calculates no final amount, routes no residual,
 * and generates no plan/suggestion. Fails closed.
 */
import {
  CONTRIBUTION_FUNDING_SCHEMA_VERSION,
  CONTRIBUTION_FUNDING_POLICY_ID,
  CONTRIBUTION_FUNDING_POLICY_VERSION,
  type ContributionFundingAnalysisStatus,
  type ContributionFundingBlocker,
  type ContributionFundingLiquiditySnapshot,
  type ContributionFundingSelectionResult,
  type ContributionFundingSourceOption,
} from "./contributionFundingTypes";
import { CONTRIBUTION_FUNDING_SOURCE_ORDER, CONTRIBUTION_FUNDING_ABSOLUTE_MINIMUM_USD, CONTRIBUTION_FUNDING_EXCESS_USDC_TRIGGER_USD, CONTRIBUTION_FUNDING_VALUE_TOLERANCE_USD as TOL } from "./contributionFundingPolicy";
import {
  evaluateUpcomingContributionFunding,
  evaluateExistingExcessUsdcFunding,
  calculateExcessLiquidUsdcAboveSafetyBuffer,
} from "./contributionFundingAvailability";
import type { ContributionPriorityDecision } from "./contributionPriorityTypes";
import { validateContributionPriorityDecision } from "./contributionPriorityEngine";
import type { ContributionFrequencyNormalizationResult } from "./contributionFrequencyTypes";
import type { ContributionAllocationGapAnalysisResult } from "./contributionAllocationGapTypes";

export const CONTRIBUTION_FUNDING_SOURCE_SELECTION_EXISTS = true;

const finiteNum = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
const isValidTimestamp = (s: unknown): boolean => typeof s === "string" && s.length > 0 && !Number.isNaN(Date.parse(s));
const ELIGIBLE = new Set(["eligible_exact", "eligible_range"]);

export interface BuildContributionFundingSelectionInput {
  priorityDecision: ContributionPriorityDecision;
  allocationGapResult?: ContributionAllocationGapAnalysisResult | null;
  frequencyNormalization?: ContributionFrequencyNormalizationResult;
  explicitCurrentContributionAmountUsd?: number;
  explicitCurrentContributionAmountSource?: "user_entered" | "detected" | "test_fixture";
  liquiditySnapshot?: ContributionFundingLiquiditySnapshot | null;
  generatedAt: string;
  checkedAt: string;
}

function baseResult(generatedAt: string, checkedAt: string, status: ContributionFundingAnalysisStatus, extra: Partial<ContributionFundingSelectionResult> = {}): ContributionFundingSelectionResult {
  return {
    schemaVersion: CONTRIBUTION_FUNDING_SCHEMA_VERSION,
    policyId: CONTRIBUTION_FUNDING_POLICY_ID,
    policyVersion: CONTRIBUTION_FUNDING_POLICY_VERSION,
    status,
    generatedAt,
    checkedAt,
    priorityTargetIds: [],
    sourceOptions: [],
    alternativeFundingSourceIds: [],
    mixedFundingAllowed: false,
    mixedFundingSelected: false,
    upcomingContributionEvaluated: false,
    existingExcessUsdcEvaluated: false,
    contributionFrequencyApplied: false,
    liquidityEvaluated: false,
    excessUsdcCalculated: false,
    sourceSelected: false,
    fundingAvailabilityEvaluated: false,
    finalContributionAmountCalculated: false,
    residualAmountCalculated: false,
    finalTargetSelected: false,
    targetAllocationAcrossIdsCalculated: false,
    dcaPlanGenerated: false,
    suggestionGenerated: false,
    updatesProductOutput: false,
    transactionsEnabled: false,
    walletSignatureRequired: false,
    blockers: [],
    warnings: [],
    notes: [],
    ...extra,
  };
}

/** Build the deterministic funding-source selection. */
export function buildContributionFundingSelection(input: BuildContributionFundingSelectionInput): ContributionFundingSelectionResult {
  const generatedAt = input?.generatedAt ?? "";
  const checkedAt = input?.checkedAt ?? "";
  if (!input || typeof input !== "object" || !isValidTimestamp(generatedAt) || !isValidTimestamp(checkedAt)) {
    return baseResult(generatedAt, checkedAt, "invalid_input", { blockers: ["timestamps_invalid"] });
  }

  const priority = input.priorityDecision;
  if (!priority || typeof priority !== "object") return baseResult(generatedAt, checkedAt, "invalid_input", { blockers: ["priority_result_missing"] });
  if (!validateContributionPriorityDecision(priority).valid) return baseResult(generatedAt, checkedAt, "invalid_input", { blockers: ["priority_result_invalid"] });
  if (priority.status !== "complete") return baseResult(generatedAt, checkedAt, "blocked_priority", { blockers: ["priority_status_blocked"], priorityPurpose: priority.purpose, priorityTargetIds: [...priority.priorityTargetIds] });

  const purpose = priority.purpose;
  const priorityTargetIds = [...priority.priorityTargetIds];

  // On Track — no corrective source.
  if (purpose === "on_track") {
    return baseResult(generatedAt, checkedAt, "no_action_required", { priorityPurpose: "on_track", priorityTargetIds, sourceSelected: false, notes: ["On Track: no corrective funding source is selected and no funding capacity is proposed."] });
  }

  // Evaluate upcoming contribution (all corrective purposes).
  const upcoming = evaluateUpcomingContributionFunding({
    priorityDecision: priority,
    frequencyNormalization: input.frequencyNormalization,
    explicitCurrentContributionAmountUsd: input.explicitCurrentContributionAmountUsd,
    explicitCurrentContributionAmountSource: input.explicitCurrentContributionAmountSource,
    allocationGapResult: input.allocationGapResult,
    checkedAt,
  });
  const sourceOptions: ContributionFundingSourceOption[] = [upcoming];

  // Evaluate existing excess USDC (documented for every corrective purpose; only growth can qualify).
  const existing = evaluateExistingExcessUsdcFunding({ priorityDecision: priority, allocationGapResult: input.allocationGapResult, liquiditySnapshot: input.liquiditySnapshot, checkedAt });
  sourceOptions.push(existing);

  // Growth-only liquidity/excess numbers.
  let liquidityEvaluated = false;
  let excessUsdcCalculated = false;
  const excessFields: Partial<ContributionFundingSelectionResult> = {};
  if (purpose === "growth_allocation" && input.liquiditySnapshot) {
    const ex = calculateExcessLiquidUsdcAboveSafetyBuffer({ liquiditySnapshot: input.liquiditySnapshot, priorityDecision: priority });
    liquidityEvaluated = true;
    if (ex.valid) {
      excessUsdcCalculated = true;
      excessFields.liquidUsdcAvailableNowUsd = ex.liquidUsdcAvailableNowUsd;
      excessFields.canonicalBufferSurplusUsd = ex.canonicalBufferSurplusUsd;
      excessFields.excessLiquidUsdcAboveBufferUsd = ex.excessLiquidUsdcAboveBufferUsd;
      excessFields.projectedEligibleBufferAfterMaximumExcessUseUsd = ex.projectedEligibleBufferAfterMaximumExcessUseUsd;
    }
  }

  // Selection — preserve source order; first eligible is primary.
  const ordered = [...sourceOptions].sort((a, b) => CONTRIBUTION_FUNDING_SOURCE_ORDER.indexOf(a.sourceId) - CONTRIBUTION_FUNDING_SOURCE_ORDER.indexOf(b.sourceId));
  const eligible = ordered.filter((o) => ELIGIBLE.has(o.status));
  const primary = eligible[0];
  const alternatives = eligible.slice(1).map((o) => o.sourceId);

  const contributionFrequencyApplied = input.explicitCurrentContributionAmountUsd == null && upcoming.sourceCapacityCalculated;

  const common: Partial<ContributionFundingSelectionResult> = {
    priorityPurpose: purpose,
    priorityTargetIds,
    sourceOptions,
    upcomingContributionEvaluated: true,
    existingExcessUsdcEvaluated: true,
    contributionFrequencyApplied,
    liquidityEvaluated,
    excessUsdcCalculated,
    fundingAvailabilityEvaluated: true,
    ...excessFields,
    ...(priorityTargetIds.length > 1 ? { blockers: ["multiple_priority_targets_require_plan_allocation"] as ContributionFundingBlocker[] } : {}),
  };

  if (primary) {
    return baseResult(generatedAt, checkedAt, "source_selected", {
      ...common,
      primaryFundingSourceId: primary.sourceId,
      alternativeFundingSourceIds: alternatives,
      sourceSelected: true,
      mixedFundingSelected: false,
      notes: ["A primary funding source is identified. No final amount, target, residual, plan, or suggestion is produced."],
    });
  }

  // No eligible source — classify the reason deterministically.
  const upFreqBlocked = upcoming.blockers.some((b) => b === "contribution_frequency_missing" || b === "contribution_frequency_invalid");
  const liqBlocked = existing.blockers.some((b) => b === "liquidity_snapshot_missing" || b === "liquidity_snapshot_stale" || b === "liquidity_snapshot_invalid");
  let status: ContributionFundingAnalysisStatus = "no_eligible_source";
  if (upFreqBlocked) status = "blocked_frequency";
  else if (purpose === "growth_allocation" && liqBlocked) status = "blocked_liquidity";
  return baseResult(generatedAt, checkedAt, status, { ...common, sourceSelected: false });
}

/* ------------------------------------------------------------------ *
 * Validators (fail closed).
 * ------------------------------------------------------------------ */
export interface FundingValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateContributionFundingSourceOption(option: unknown): FundingValidationResult {
  const errors: string[] = [];
  if (!option || typeof option !== "object") return { valid: false, errors: ["option_not_an_object"] };
  const o = option as ContributionFundingSourceOption;
  const flagsFalse = o.finalPlanAmountCalculated === false && o.residualAmountCalculated === false && o.targetAllocationAcrossIdsCalculated === false && o.planGenerated === false && o.suggestionGenerated === false && o.transactionsEnabled === false && o.walletSignatureRequired === false;
  if (!flagsFalse) errors.push("capability_flag_enabled");
  const minUsd = o.minimumPolicyApplied === "absolute_50" ? CONTRIBUTION_FUNDING_ABSOLUTE_MINIMUM_USD : o.minimumPolicyApplied === "excess_usdc_250" ? CONTRIBUTION_FUNDING_EXCESS_USDC_TRIGGER_USD : 0;

  if (o.status === "eligible_exact") {
    if (!(finiteNum(o.cappedSourceCapacityUsd) && (o.cappedSourceCapacityUsd as number) >= minUsd - TOL)) errors.push("eligible_exact_below_minimum");
    if (finiteNum(o.mathematicalPlanningCapUsd) && finiteNum(o.cappedSourceCapacityUsd) && (o.cappedSourceCapacityUsd as number) > (o.mathematicalPlanningCapUsd as number) + TOL) errors.push("capped_above_cap");
    if (!o.minimumPassed && minUsd > 0) errors.push("eligible_without_minimum_passed");
  } else if (o.status === "eligible_range") {
    if (!(finiteNum(o.minimumCappedSourceCapacityUsd) && finiteNum(o.maximumCappedSourceCapacityUsd))) errors.push("eligible_range_missing_bounds");
    else if (minUsd > 0 && !((o.minimumCappedSourceCapacityUsd as number) >= minUsd - TOL && (o.maximumCappedSourceCapacityUsd as number) >= minUsd - TOL)) errors.push("range_eligible_straddles_minimum");
  } else if (o.status === "ineligible_below_minimum") {
    if (o.minimumPassed) errors.push("below_minimum_but_passed");
  }
  // Existing excess must always preserve the Safety Buffer when eligible.
  if (o.sourceId === "existing_excess_usdc" && ELIGIBLE.has(o.status) && o.safetyBufferPreserved !== true) errors.push("excess_usdc_eligible_without_buffer_preserved");
  return { valid: errors.length === 0, errors };
}

export function validateContributionFundingSelectionResult(result: unknown): FundingValidationResult {
  const errors: string[] = [];
  if (!result || typeof result !== "object") return { valid: false, errors: ["result_not_an_object"] };
  const r = result as ContributionFundingSelectionResult;
  if (r.schemaVersion !== CONTRIBUTION_FUNDING_SCHEMA_VERSION) errors.push("wrong_schema_version");
  if (r.policyId !== CONTRIBUTION_FUNDING_POLICY_ID) errors.push("wrong_policy_id");
  if (r.policyVersion !== CONTRIBUTION_FUNDING_POLICY_VERSION) errors.push("wrong_policy_version");
  const flagsFalse = r.mixedFundingAllowed === false && r.mixedFundingSelected === false && r.finalContributionAmountCalculated === false && r.residualAmountCalculated === false && r.finalTargetSelected === false && r.targetAllocationAcrossIdsCalculated === false && r.dcaPlanGenerated === false && r.suggestionGenerated === false && r.updatesProductOutput === false && r.transactionsEnabled === false && r.walletSignatureRequired === false;
  if (!flagsFalse) errors.push("capability_flag_enabled");

  for (const o of r.sourceOptions) {
    const ov = validateContributionFundingSourceOption(o);
    if (!ov.valid) errors.push(`source_${o.sourceId}:${ov.errors.join("/")}`);
  }

  if (r.status === "source_selected") {
    if (!r.primaryFundingSourceId) errors.push("selected_without_primary");
    if (!r.sourceSelected) errors.push("selected_flag_false");
    // Order: existing_excess_usdc may not be primary while upcoming_contribution is eligible.
    const upcoming = r.sourceOptions.find((o) => o.sourceId === "upcoming_contribution");
    if (r.primaryFundingSourceId === "existing_excess_usdc" && upcoming && ELIGIBLE.has(upcoming.status)) errors.push("existing_primary_while_upcoming_eligible");
    // Safety Buffer / stable never select existing excess.
    if ((r.priorityPurpose === "safety_buffer" || r.priorityPurpose === "stable_allocation") && r.primaryFundingSourceId === "existing_excess_usdc") errors.push("excess_selected_for_non_growth");
    if ((r.priorityPurpose === "safety_buffer" || r.priorityPurpose === "stable_allocation") && r.alternativeFundingSourceIds.includes("existing_excess_usdc")) errors.push("excess_alternative_for_non_growth");
  } else {
    if (r.sourceSelected) errors.push("unselected_with_source_selected");
    if (r.primaryFundingSourceId != null) errors.push("unselected_with_primary");
  }
  if (r.status === "no_action_required" && r.priorityPurpose !== "on_track") errors.push("no_action_without_on_track");
  // Excess-USDC formula sanity when present.
  if (finiteNum(r.excessLiquidUsdcAboveBufferUsd) && finiteNum(r.liquidUsdcAvailableNowUsd) && finiteNum(r.canonicalBufferSurplusUsd)) {
    const expected = Math.min(r.liquidUsdcAvailableNowUsd as number, r.canonicalBufferSurplusUsd as number);
    if (Math.abs((r.excessLiquidUsdcAboveBufferUsd as number) - expected) > 1e-6) errors.push("excess_formula_mismatch");
    if ((r.excessLiquidUsdcAboveBufferUsd as number) > (r.liquidUsdcAvailableNowUsd as number) + TOL) errors.push("excess_exceeds_liquid");
    if ((r.excessLiquidUsdcAboveBufferUsd as number) > (r.canonicalBufferSurplusUsd as number) + TOL) errors.push("excess_exceeds_surplus");
  }
  return { valid: errors.length === 0, errors };
}
