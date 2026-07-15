/**
 * contributionFundingAvailability — Step 15F. Evaluates each funding source's mathematical capacity:
 * the upcoming-contribution source (from the Step 15B normalization or an explicit current amount,
 * capped by the Step 15D external cap / the canonical Safety Buffer shortfall and the Step 15C
 * minimum), the canonical liquid-USDC snapshot, the excess liquid USDC above the Safety Buffer, and
 * the existing-excess-USDC source (capped by the Step 15D internal cap and the $250 threshold).
 *
 * It reuses upstream results and recomputes none of them. It calculates NO final amount, routes NO
 * residual, selects NO target, and moves/reserves NO funds. Fails closed.
 */
import {
  CONTRIBUTION_FUNDING_VALUE_TOLERANCE_USD as TOL,
  CONTRIBUTION_FUNDING_ABSOLUTE_MINIMUM_USD as MIN_50,
  CONTRIBUTION_FUNDING_EXCESS_USDC_TRIGGER_USD as MIN_250,
} from "./contributionFundingPolicy";
import type {
  ContributionFundingBlocker,
  ContributionFundingLiquiditySnapshot,
  ContributionFundingSourceOption,
  ContributionFundingUsdcPosition,
} from "./contributionFundingTypes";
import type { ContributionPriorityDecision } from "./contributionPriorityTypes";
import type { ContributionFrequencyNormalizationResult } from "./contributionFrequencyTypes";
import { validateContributionFrequencyNormalizationResult } from "./contributionFrequencyNormalization";
import type { ContributionAllocationGapAnalysisResult, ContributionTargetAllocationGapResult } from "./contributionAllocationGapTypes";

export const CONTRIBUTION_FUNDING_AVAILABILITY_EXISTS = true;

const finiteNonNeg = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0;
const isValidTimestamp = (s: unknown): boolean => typeof s === "string" && s.length > 0 && !Number.isNaN(Date.parse(s));

export type ContributionFundingPurpose = "safety_buffer" | "stable_allocation" | "growth_allocation";

function baseOption(
  sourceId: ContributionFundingSourceOption["sourceId"],
  timing: ContributionFundingSourceOption["timing"],
  purpose: ContributionFundingPurpose,
  targetIds: string[],
  minimumPolicyApplied: ContributionFundingSourceOption["minimumPolicyApplied"],
): ContributionFundingSourceOption {
  return {
    sourceId,
    timing,
    status: "ineligible_no_capacity",
    capacityKind: "unresolved",
    applicablePriorityPurpose: purpose,
    applicableTargetIds: [...targetIds],
    minimumPolicyApplied,
    minimumPassed: false,
    safetyBufferPreserved: true,
    exactCurrentAmountKnown: false,
    sourceCapacityCalculated: false,
    finalPlanAmountCalculated: false,
    residualAmountCalculated: false,
    targetAllocationAcrossIdsCalculated: false,
    planGenerated: false,
    suggestionGenerated: false,
    blockers: [],
    warnings: [],
    transactionsEnabled: false,
    walletSignatureRequired: false,
  };
}

/** Validate an explicit current contribution amount (finite, non-negative, ≤ 2 decimals). */
export function validateExplicitContributionAmount(amount: unknown): { ok: boolean; blocker?: ContributionFundingBlocker } {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return { ok: false, blocker: "contribution_amount_invalid" };
  if (amount < 0) return { ok: false, blocker: "contribution_amount_invalid" };
  const scaled = amount * 100;
  if (Math.abs(scaled - Math.round(scaled)) > 1e-6) return { ok: false, blocker: "contribution_amount_invalid" };
  return { ok: true };
}

export function getTargetGapResult(allocationGapResult: ContributionAllocationGapAnalysisResult | null | undefined, targetId: string): ContributionTargetAllocationGapResult | undefined {
  if (!allocationGapResult || allocationGapResult.status !== "complete" || !Array.isArray(allocationGapResult.targetResults)) return undefined;
  return allocationGapResult.targetResults.find((t) => t.targetId === targetId);
}

export interface EvaluateUpcomingContributionInput {
  priorityDecision: ContributionPriorityDecision;
  frequencyNormalization?: ContributionFrequencyNormalizationResult;
  explicitCurrentContributionAmountUsd?: number;
  explicitCurrentContributionAmountSource?: "user_entered" | "detected" | "test_fixture";
  allocationGapResult?: ContributionAllocationGapAnalysisResult | null;
  checkedAt: string;
}

/**
 * Evaluate the upcoming-contribution source. Gross capacity comes from an explicit current amount or
 * the Step 15B normalization (exact for a zero-remainder fixed frequency, a base…base+1¢ range
 * otherwise, requires-explicit for Occasional). The gross is capped by the priority cap (Safety
 * Buffer shortfall, or the Step 15D external cap for stable/growth) and tested against the minimum
 * ($50 for stable/growth; none for the Safety Buffer). Never picks which contribution gets the cent.
 */
export function evaluateUpcomingContributionFunding(input: EvaluateUpcomingContributionInput): ContributionFundingSourceOption {
  const purpose = input.priorityDecision.purpose as ContributionFundingPurpose;
  const targetIds = input.priorityDecision.priorityTargetIds ?? [];
  const minimumPolicyApplied = purpose === "safety_buffer" ? "none" : "absolute_50";
  const opt = baseOption("upcoming_contribution", "expected_future", purpose, targetIds, minimumPolicyApplied);

  // --- Gross capacity ---
  let grossMin: number | undefined;
  let grossMax: number | undefined;
  if (input.explicitCurrentContributionAmountUsd != null) {
    const v = validateExplicitContributionAmount(input.explicitCurrentContributionAmountUsd);
    if (!v.ok) { opt.status = "blocked_invalid_data"; opt.blockers.push(v.blocker!); return opt; }
    const amount = input.explicitCurrentContributionAmountUsd;
    opt.capacityKind = "exact";
    opt.grossSourceCapacityUsd = amount;
    opt.exactCurrentAmountKnown = true;
    grossMin = amount; grossMax = amount;
    const src = input.explicitCurrentContributionAmountSource ?? "user_entered";
    opt.warnings.push(`explicit_current_amount_source:${src}`);
    opt.warnings.push("An explicit current contribution amount is a planned source amount; it has NOT been transferred, reserved, or moved.");
  } else {
    const fn = input.frequencyNormalization;
    if (!fn) { opt.status = "blocked_invalid_data"; opt.blockers.push("contribution_frequency_missing"); return opt; }
    if (!validateContributionFrequencyNormalizationResult(fn).valid) { opt.status = "blocked_invalid_data"; opt.blockers.push("contribution_frequency_invalid"); return opt; }
    if (fn.status === "normalized_occasional") { opt.status = "requires_explicit_amount"; opt.blockers.push("contribution_amount_requires_exact_resolution"); opt.warnings.push("Occasional frequency: no individual contribution amount is inferred. An explicit current amount is required."); return opt; }
    if (fn.status !== "normalized_fixed" || !fn.centDecomposition) { opt.status = "blocked_invalid_data"; opt.blockers.push(fn.status === "no_saving_goal" ? "contribution_amount_missing" : "contribution_frequency_invalid"); return opt; }
    const d = fn.centDecomposition;
    if (d.remainderCents === 0) {
      opt.capacityKind = "exact";
      opt.grossSourceCapacityUsd = d.baseContributionAmountUsd;
      opt.exactCurrentAmountKnown = true;
      grossMin = d.baseContributionAmountUsd; grossMax = d.baseContributionAmountUsd;
    } else {
      opt.capacityKind = "range";
      opt.minimumGrossSourceCapacityUsd = d.baseContributionAmountUsd;
      opt.maximumGrossSourceCapacityUsd = d.basePlusOneCentContributionAmountUsd;
      opt.exactCurrentAmountKnown = false;
      grossMin = d.baseContributionAmountUsd; grossMax = d.basePlusOneCentContributionAmountUsd;
    }
  }
  opt.sourceCapacityCalculated = true;

  // --- Multiple priority targets: recognize the source but do NOT allocate across targets. ---
  if (targetIds.length > 1) {
    opt.blockers.push("multiple_priority_targets_require_plan_allocation");
    opt.status = "ineligible_not_applicable";
    return opt;
  }

  // --- Priority cap ---
  let cap: number | undefined;
  if (purpose === "safety_buffer") {
    cap = input.priorityDecision.safetyBuffer.shortfallUsd;
    opt.safetyBufferPreserved = true;
  } else {
    const targetId = targetIds[0];
    if (!targetId) { opt.status = "blocked_invalid_data"; opt.blockers.push("priority_target_result_missing"); return opt; }
    const gap = getTargetGapResult(input.allocationGapResult, targetId);
    if (!input.allocationGapResult) { opt.status = "blocked_invalid_data"; opt.blockers.push("allocation_gap_result_missing"); return opt; }
    if (!gap) { opt.status = "blocked_invalid_data"; opt.blockers.push("priority_target_result_missing"); return opt; }
    cap = gap.maximumExternalContributionIncreaseWithoutOvershootUsd;
    if (!finiteNonNeg(cap)) { opt.status = "blocked_invalid_data"; opt.blockers.push("allocation_cap_missing"); return opt; }
    opt.safetyBufferPreserved = true; // new external money never reduces the buffer
  }
  if (!finiteNonNeg(cap)) { opt.status = "blocked_invalid_data"; opt.blockers.push("allocation_cap_invalid"); return opt; }
  opt.mathematicalPlanningCapUsd = cap;

  // --- Cap the gross capacity ---
  const cappedMin = Math.min(grossMin as number, cap);
  const cappedMax = Math.min(grossMax as number, cap);
  if ((grossMax as number) > cap + TOL) opt.warnings.push("source_capacity_exceeds_priority_cap");
  if (opt.capacityKind === "exact") opt.cappedSourceCapacityUsd = cappedMax;
  else { opt.minimumCappedSourceCapacityUsd = cappedMin; opt.maximumCappedSourceCapacityUsd = cappedMax; }

  // --- Minimum policy ---
  const minimumUsd = purpose === "safety_buffer" ? 0 : MIN_50;
  if (minimumUsd === 0) {
    // Safety Buffer: any positive capped capacity is eligible.
    if (cappedMax <= TOL) { opt.status = "ineligible_no_capacity"; opt.blockers.push("capped_capacity_below_minimum"); return opt; }
    opt.minimumPassed = true;
    opt.status = opt.capacityKind === "range" ? "eligible_range" : "eligible_exact";
    return opt;
  }
  const passLo = cappedMin >= minimumUsd - TOL;
  const passHi = cappedMax >= minimumUsd - TOL;
  if (opt.capacityKind === "exact") {
    if (passHi) { opt.minimumPassed = true; opt.status = "eligible_exact"; }
    else { opt.status = "ineligible_below_minimum"; opt.blockers.push("capped_capacity_below_minimum"); }
    return opt;
  }
  // Range.
  if (passLo && passHi) { opt.minimumPassed = true; opt.status = "eligible_range"; }
  else if (!passLo && !passHi) { opt.status = "ineligible_below_minimum"; opt.blockers.push("capped_capacity_below_minimum"); }
  else { opt.status = "requires_exact_amount"; opt.blockers.push("contribution_amount_requires_exact_resolution"); }
  return opt;
}

/* ------------------------------------------------------------------ *
 * Liquidity snapshot + excess USDC.
 * ------------------------------------------------------------------ */
export interface LiquiditySnapshotEvaluation {
  valid: boolean;
  status: "current" | "stale" | "invalid";
  liquidUsdcAvailableNowUsd?: number;
  requiresWithdrawalUsd: number;
  lockedUsd: number;
  reservedUsd: number;
  unavailableUsd: number;
  unknownUsd: number;
  blockers: ContributionFundingBlocker[];
}

export function validateContributionFundingUsdcPosition(position: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!position || typeof position !== "object") return { valid: false, errors: ["position_not_an_object"] };
  const p = position as ContributionFundingUsdcPosition;
  if (!p.positionId || typeof p.positionId !== "string") errors.push("missing_position_id");
  if (!["wallet_balance", "protocol_position", "other_canonical_source"].includes(p.source)) errors.push("invalid_source");
  if (!["liquid_now", "requires_withdrawal", "locked", "reserved", "unavailable", "unknown"].includes(p.liquidityStatus)) errors.push("invalid_liquidity_status");
  if (!finiteNonNeg(p.valueUsd)) errors.push("liquidity_position_value_invalid");
  if (p.canonicalClassificationUsed !== true) errors.push("canonical_classification_not_used");
  return { valid: errors.length === 0, errors };
}

/** Sum only `liquid_now` USDC; report diagnostic totals for every other status. Fails closed. */
export function evaluateContributionFundingLiquiditySnapshot(snapshot: ContributionFundingLiquiditySnapshot | null | undefined): LiquiditySnapshotEvaluation {
  const empty: LiquiditySnapshotEvaluation = { valid: false, status: "invalid", requiresWithdrawalUsd: 0, lockedUsd: 0, reservedUsd: 0, unavailableUsd: 0, unknownUsd: 0, blockers: [] };
  if (!snapshot || typeof snapshot !== "object") return { ...empty, blockers: ["liquidity_snapshot_missing"] };
  if (!snapshot.snapshotId || !snapshot.sourcePortfolioVersion || !isValidTimestamp(snapshot.calculatedAt) || !isValidTimestamp(snapshot.checkedAt)) return { ...empty, blockers: ["liquidity_snapshot_invalid"] };
  if (snapshot.status === "stale") return { ...empty, status: "stale", blockers: ["liquidity_snapshot_stale"] };
  if (snapshot.status !== "current") return { ...empty, blockers: ["liquidity_snapshot_invalid"] };
  if (!Array.isArray(snapshot.usdcPositions)) return { ...empty, blockers: ["liquidity_snapshot_invalid"] };

  const ids = snapshot.usdcPositions.map((p) => p?.positionId);
  if (new Set(ids).size !== ids.length) return { ...empty, blockers: ["duplicate_liquidity_position"] };
  for (const p of snapshot.usdcPositions) {
    if (!validateContributionFundingUsdcPosition(p).valid) return { ...empty, blockers: ["liquidity_position_value_invalid"] };
  }

  let liquid = 0, req = 0, locked = 0, reserved = 0, unavailable = 0, unknown = 0;
  for (const p of snapshot.usdcPositions) {
    switch (p.liquidityStatus) {
      case "liquid_now": liquid += p.valueUsd; break;
      case "requires_withdrawal": req += p.valueUsd; break;
      case "locked": locked += p.valueUsd; break;
      case "reserved": reserved += p.valueUsd; break;
      case "unavailable": unavailable += p.valueUsd; break;
      default: unknown += p.valueUsd; break;
    }
  }
  return { valid: true, status: "current", liquidUsdcAvailableNowUsd: liquid, requiresWithdrawalUsd: req, lockedUsd: locked, reservedUsd: reserved, unavailableUsd: unavailable, unknownUsd: unknown, blockers: [] };
}

export interface ExcessLiquidUsdcResult {
  valid: boolean;
  liquidUsdcAvailableNowUsd?: number;
  canonicalBufferSurplusUsd?: number;
  excessLiquidUsdcAboveBufferUsd?: number;
  projectedEligibleBufferAfterMaximumExcessUseUsd?: number;
  blockers: ContributionFundingBlocker[];
}

/**
 * Excess liquid USDC that can be removed while preserving canonical buffer coverage:
 * `surplus = max(0, currentEligible − required)`, `excess = min(liquidNow, surplus)`. NEVER
 * `liquidUsdc − required` (which is wrong when the eligible buffer holds other qualifying stables).
 * Uses only the canonical values Step 15E preserved; redefines no qualifying holding.
 */
export function calculateExcessLiquidUsdcAboveSafetyBuffer(input: { liquiditySnapshot: ContributionFundingLiquiditySnapshot | null | undefined; priorityDecision: ContributionPriorityDecision }): ExcessLiquidUsdcResult {
  const liq = evaluateContributionFundingLiquiditySnapshot(input.liquiditySnapshot);
  if (!liq.valid || !finiteNonNeg(liq.liquidUsdcAvailableNowUsd)) return { valid: false, blockers: liq.blockers.length ? liq.blockers : ["liquid_usdc_missing"] };
  const sb = input.priorityDecision?.safetyBuffer;
  const required = sb?.requiredBufferUsd;
  const current = sb?.currentEligibleBufferUsd;
  if (!finiteNonNeg(required) || !finiteNonNeg(current)) return { valid: false, blockers: ["buffer_values_invalid"] };
  const liquidNow = liq.liquidUsdcAvailableNowUsd as number;
  const canonicalBufferSurplusUsd = Math.max(0, current - required);
  const excessLiquidUsdcAboveBufferUsd = Math.min(liquidNow, canonicalBufferSurplusUsd);
  const projectedEligibleBufferAfterMaximumExcessUseUsd = current - excessLiquidUsdcAboveBufferUsd;
  const blockers: ContributionFundingBlocker[] = [];
  if (projectedEligibleBufferAfterMaximumExcessUseUsd + TOL < required) blockers.push("safety_buffer_would_be_reduced_below_requirement");
  return { valid: blockers.length === 0, liquidUsdcAvailableNowUsd: liquidNow, canonicalBufferSurplusUsd, excessLiquidUsdcAboveBufferUsd, projectedEligibleBufferAfterMaximumExcessUseUsd, blockers };
}

export interface EvaluateExistingExcessUsdcInput {
  priorityDecision: ContributionPriorityDecision;
  allocationGapResult?: ContributionAllocationGapAnalysisResult | null;
  liquiditySnapshot?: ContributionFundingLiquiditySnapshot | null;
  checkedAt: string;
}

/**
 * Evaluate the existing-excess-USDC source. Applicable only to growth allocation: excess liquid USDC
 * above the buffer, capped by the Step 15D internal-reallocation cap, tested against the $250
 * threshold. Not applicable to the Safety Buffer (no excess exists while incomplete) or to a USDC
 * stable-allocation shortfall (same asset cannot correct it). Always preserves the Safety Buffer.
 */
export function evaluateExistingExcessUsdcFunding(input: EvaluateExistingExcessUsdcInput): ContributionFundingSourceOption {
  const purpose = input.priorityDecision.purpose as ContributionFundingPurpose;
  const targetIds = input.priorityDecision.priorityTargetIds ?? [];
  const opt = baseOption("existing_excess_usdc", "available_now", purpose, targetIds, "excess_usdc_250");

  if (purpose === "safety_buffer") {
    opt.status = "ineligible_not_applicable";
    opt.blockers.push("funding_source_not_applicable");
    opt.warnings.push("Existing USDC is not classified as 'excess' while the Safety Buffer is incomplete.");
    return opt;
  }
  if (purpose === "stable_allocation") {
    opt.status = "ineligible_not_applicable";
    opt.blockers.push("same_asset_cannot_correct_allocation");
    opt.warnings.push("Moving USDC into USDC does not change USDC/stable exposure; a future stable target needs a separate conversion/sub-allocation policy.");
    return opt;
  }
  // growth_allocation
  if (targetIds.length > 1) {
    opt.status = "ineligible_not_applicable";
    opt.blockers.push("multiple_priority_targets_require_plan_allocation");
    return opt;
  }
  const targetId = targetIds[0];
  if (!targetId) { opt.status = "blocked_invalid_data"; opt.blockers.push("priority_target_result_missing"); return opt; }

  const ex = calculateExcessLiquidUsdcAboveSafetyBuffer({ liquiditySnapshot: input.liquiditySnapshot, priorityDecision: input.priorityDecision });
  if (!ex.valid || !finiteNonNeg(ex.excessLiquidUsdcAboveBufferUsd)) { opt.status = "blocked_invalid_data"; opt.blockers.push(...(ex.blockers.length ? ex.blockers : ["liquidity_snapshot_invalid" as ContributionFundingBlocker])); return opt; }

  const gap = getTargetGapResult(input.allocationGapResult, targetId);
  if (!input.allocationGapResult) { opt.status = "blocked_invalid_data"; opt.blockers.push("allocation_gap_result_missing"); return opt; }
  if (!gap) { opt.status = "blocked_invalid_data"; opt.blockers.push("priority_target_result_missing"); return opt; }
  const cap = gap.maximumInternalReallocationIncreaseWithoutOvershootUsd;
  if (!finiteNonNeg(cap)) { opt.status = "blocked_invalid_data"; opt.blockers.push("allocation_cap_missing"); return opt; }

  const excess = ex.excessLiquidUsdcAboveBufferUsd as number;
  opt.capacityKind = "exact";
  opt.grossSourceCapacityUsd = excess;
  opt.exactCurrentAmountKnown = true;
  opt.mathematicalPlanningCapUsd = cap;
  const capped = Math.min(excess, cap);
  if (excess > cap + TOL) opt.warnings.push("source_capacity_exceeds_priority_cap");
  opt.cappedSourceCapacityUsd = capped;
  opt.sourceCapacityCalculated = true;
  opt.safetyBufferPreserved = (ex.projectedEligibleBufferAfterMaximumExcessUseUsd as number) + TOL >= (input.priorityDecision.safetyBuffer.requiredBufferUsd);

  if (capped < MIN_250 - TOL) {
    opt.status = "ineligible_below_minimum";
    opt.blockers.push("excess_usdc_below_trigger");
  } else {
    opt.status = "eligible_exact";
    opt.minimumPassed = true;
  }
  return opt;
}
