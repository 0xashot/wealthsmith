/**
 * contributionPriorityEngine — Step 15E. The deterministic contribution-priority gate. Given the
 * canonical Safety Buffer snapshot and the Step 15D allocation-gap result, it decides the single
 * PURPOSE category with priority — Safety Buffer → stable allocation → growth allocation → On Track
 * — before any amount or funding source is chosen.
 *
 * Category priority always overrides gap size. It applies no contribution frequency, selects no
 * funding source, calculates no excess USDC / amount / residual, ranks/selects no target, and
 * generates no plan/suggestion. Registry ROLES (not hardcoded ids) discover stable and growth
 * targets, so future BTC/ETH/RWA targets work once enabled with valid policies. Fails closed.
 */
import {
  CONTRIBUTION_PRIORITY_SCHEMA_VERSION,
  CONTRIBUTION_PRIORITY_POLICY_ID,
  CONTRIBUTION_PRIORITY_POLICY_VERSION,
  type ContributionPriorityAnalysisStatus,
  type ContributionPriorityBlocker,
  type ContributionPriorityDecision,
  type ContributionPriorityGrowthContext,
  type ContributionPriorityStableContext,
  type ContributionSafetyBufferSnapshot,
} from "./contributionPriorityTypes";
import { evaluateContributionSafetyBufferGate } from "./contributionSafetyBufferGate";
import type { ContributionAllocationGapAnalysisResult, ContributionTargetAllocationGapResult } from "./contributionAllocationGapTypes";
import { validateContributionAllocationGapAnalysisResult } from "./contributionAllocationGapEngine";
import { getStableAllocationDestinations, getEnabledContributionGrowthTargets } from "./investmentTargetRegistry";

export const CONTRIBUTION_PRIORITY_ENGINE_EXISTS = true;

const isValidTimestamp = (s: unknown): boolean => typeof s === "string" && s.length > 0 && !Number.isNaN(Date.parse(s));
const isUnderweight = (c: string): boolean => c === "underweight_trigger_met" || c === "underweight_below_trigger";

export interface BuildStablePriorityContextOptions {
  /** Override the stable-allocation destination ids (fixtures only). Defaults to the registry role. */
  stableDestinationIds?: string[];
}
export interface StablePriorityContextResult {
  context: ContributionPriorityStableContext | null;
  blockers: ContributionPriorityBlocker[];
}

/**
 * Build the stable-allocation priority context from the Step 15D result. Stable destinations come
 * from the registry role `stable_allocation_destination` (USDC today). Only mapped stable targets
 * present in the valid 15D result are considered; percentages/gaps are NOT recomputed — the existing
 * classification + `underweightTriggerMet` decide the trigger. More than one enabled stable
 * destination without a versioned stable sub-allocation policy fails closed.
 */
export function buildContributionStablePriorityContext(
  allocationGapResult: ContributionAllocationGapAnalysisResult,
  options: BuildStablePriorityContextOptions = {},
): StablePriorityContextResult {
  const stableIds = options.stableDestinationIds ?? getStableAllocationDestinations().map((t) => t.targetId);
  const resultById = new Map<string, ContributionTargetAllocationGapResult>();
  for (const r of allocationGapResult.targetResults) resultById.set(r.targetId, r);

  // Only stable destinations that are actually mapped in the allocation policy / 15D result.
  const mappedStable = allocationGapResult.targetResults.filter((r) => stableIds.includes(r.targetId)).map((r) => r.targetId);

  if (mappedStable.length > 1) {
    return { context: null, blockers: ["multiple_stable_targets_require_suballocation_policy"] };
  }

  const stableTargetIds: string[] = [];
  const underweightStableTargetIds: string[] = [];
  const triggerMetStableTargetIds: string[] = [];
  // Preserve allocation-gap (target-result) order.
  for (const r of allocationGapResult.targetResults) {
    if (!stableIds.includes(r.targetId)) continue;
    stableTargetIds.push(r.targetId);
    if (isUnderweight(r.classification)) underweightStableTargetIds.push(r.targetId);
    if (r.underweightTriggerMet === true) triggerMetStableTargetIds.push(r.targetId);
  }

  return {
    context: {
      stableTargetIds,
      triggerMetStableTargetIds,
      underweightStableTargetIds,
      stableAllocationPriorityRequired: triggerMetStableTargetIds.length > 0,
    },
    blockers: [],
  };
}

export interface BuildGrowthPriorityContextOptions {
  /** Override the enabled growth target ids (fixtures only). Defaults to the registry role. */
  enabledGrowthTargetIds?: string[];
}

/**
 * Build the growth-allocation priority context from the Step 15D result. Growth targets come from
 * the enabled registry list; a target is eligible only when its 15D result is policy-ready
 * (`contributionTargetPolicyReady` and `eligibleForFutureGrowthContributionEvaluation`). Order is
 * preserved; targets are never ranked or sorted by gap size, and none is finally selected.
 */
export function buildContributionGrowthPriorityContext(
  allocationGapResult: ContributionAllocationGapAnalysisResult,
  options: BuildGrowthPriorityContextOptions = {},
): ContributionPriorityGrowthContext {
  const growthIds = options.enabledGrowthTargetIds ?? getEnabledContributionGrowthTargets().map((t) => t.targetId);

  const eligibleGrowthTargetIds: string[] = [];
  const underweightGrowthTargetIds: string[] = [];
  const triggerMetGrowthTargetIds: string[] = [];
  for (const r of allocationGapResult.targetResults) {
    if (!growthIds.includes(r.targetId)) continue;
    if (!(r.contributionTargetPolicyReady === true && r.eligibleForFutureGrowthContributionEvaluation === true)) continue;
    eligibleGrowthTargetIds.push(r.targetId);
    if (isUnderweight(r.classification)) underweightGrowthTargetIds.push(r.targetId);
    if (r.underweightTriggerMet === true) triggerMetGrowthTargetIds.push(r.targetId);
  }

  return {
    eligibleGrowthTargetIds,
    underweightGrowthTargetIds,
    triggerMetGrowthTargetIds,
    growthAllocationMayProceed: triggerMetGrowthTargetIds.length > 0,
  };
}

export interface BuildContributionPriorityDecisionInput {
  safetyBufferResult: ContributionSafetyBufferSnapshot | null | undefined;
  allocationGapResult?: ContributionAllocationGapAnalysisResult | null;
  generatedAt: string;
  checkedAt: string;
  stableOptions?: BuildStablePriorityContextOptions;
  growthOptions?: BuildGrowthPriorityContextOptions;
}

function baseDecision(
  generatedAt: string,
  checkedAt: string,
  status: ContributionPriorityAnalysisStatus,
  safetyBuffer: ContributionPriorityDecision["safetyBuffer"],
  extra: Partial<ContributionPriorityDecision> = {},
): ContributionPriorityDecision {
  return {
    schemaVersion: CONTRIBUTION_PRIORITY_SCHEMA_VERSION,
    policyId: CONTRIBUTION_PRIORITY_POLICY_ID,
    policyVersion: CONTRIBUTION_PRIORITY_POLICY_VERSION,
    status,
    generatedAt,
    checkedAt,
    safetyBuffer,
    priorityTargetIds: [],
    lowerPriorityEvaluationSuppressed: false,
    growthSuppressedBySafetyBuffer: false,
    stableAllocationSuppressedBySafetyBuffer: false,
    contributionFrequencyApplied: false,
    fundingSourceSelected: false,
    fundingAvailabilityEvaluated: false,
    excessUsdcCalculated: false,
    contributionAmountCalculated: false,
    residualAmountCalculated: false,
    targetSelected: false,
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

function sbObject(gateReq: number, gateCur: number, gateShort: number, sourceId: string, sourceVer: string, complete: boolean, overrides: boolean): ContributionPriorityDecision["safetyBuffer"] {
  return {
    evaluated: true,
    complete,
    requiredBufferUsd: Number.isFinite(gateReq) ? gateReq : 0,
    currentEligibleBufferUsd: Number.isFinite(gateCur) ? gateCur : 0,
    shortfallUsd: Number.isFinite(gateShort) ? gateShort : 0,
    sourcePolicyId: sourceId ?? "",
    sourcePolicyVersion: sourceVer ?? "",
    overridesLowerPriorities: overrides,
  };
}

/**
 * Build the deterministic priority decision. Safety Buffer first (override), then stable allocation,
 * then growth allocation, else On Track. An incomplete buffer never requires a valid allocation-gap
 * result — it cannot be overridden by a lower-priority gap.
 */
export function buildContributionPriorityDecision(input: BuildContributionPriorityDecisionInput): ContributionPriorityDecision {
  const generatedAt = input?.generatedAt ?? "";
  const checkedAt = input?.checkedAt ?? "";
  const emptySb = sbObject(0, 0, 0, "", "", false, true);

  if (!input || typeof input !== "object" || !isValidTimestamp(generatedAt) || !isValidTimestamp(checkedAt)) {
    return baseDecision(generatedAt, checkedAt, "invalid_input", emptySb, { blockers: ["timestamps_invalid"], lowerPriorityEvaluationSuppressed: true });
  }

  const gateDecision = evaluateContributionSafetyBufferGate(input.safetyBufferResult);
  const gReq = gateDecision.requiredBufferUsd ?? NaN;
  const gCur = gateDecision.currentEligibleBufferUsd ?? NaN;
  const gShort = gateDecision.shortfallUsd ?? NaN;
  const srcId = gateDecision.sourcePolicyId ?? "";
  const srcVer = gateDecision.sourcePolicyVersion ?? "";

  // (3) Buffer invalid → blocked, everything suppressed.
  if (gateDecision.status === "invalid") {
    return baseDecision(generatedAt, checkedAt, "blocked_safety_buffer", sbObject(gReq, gCur, gShort, srcId, srcVer, false, true), {
      blockers: gateDecision.blockers.length ? gateDecision.blockers : ["safety_buffer_result_invalid"],
      lowerPriorityEvaluationSuppressed: true,
      growthSuppressedBySafetyBuffer: true,
      stableAllocationSuppressedBySafetyBuffer: true,
    });
  }

  // (4) Buffer incomplete → Safety Buffer priority; NO allocation-gap result required.
  if (gateDecision.status === "incomplete") {
    return baseDecision(generatedAt, checkedAt, "complete", sbObject(gReq, gCur, gShort, srcId, srcVer, false, true), {
      purpose: "safety_buffer",
      primaryTargetCategory: "safety_buffer",
      priorityTargetIds: getSafetyBufferTargetIds(),
      safetyBufferPriorityShortfallUsd: gShort,
      lowerPriorityEvaluationSuppressed: true,
      growthSuppressedBySafetyBuffer: true,
      stableAllocationSuppressedBySafetyBuffer: true,
      warnings: ["Safety Buffer funding has priority; stable- and growth-allocation actions are suppressed. No contribution amount or funding source has been selected."],
    });
  }

  // Buffer complete → require a valid, complete allocation-gap result.
  const gap = input.allocationGapResult;
  const sbComplete = sbObject(gReq, gCur, gShort, srcId, srcVer, true, false);
  if (!gap || typeof gap !== "object") return baseDecision(generatedAt, checkedAt, "blocked_allocation_gap", sbComplete, { blockers: ["allocation_gap_result_missing"] });
  if (gap.status === "blocked_policy_readiness") return baseDecision(generatedAt, checkedAt, "blocked_policy_readiness", sbComplete, { blockers: ["growth_target_policy_not_ready"] });
  if (gap.status === "invalid_input") return baseDecision(generatedAt, checkedAt, "blocked_allocation_gap", sbComplete, { blockers: ["allocation_gap_result_invalid"] });
  if (gap.status !== "complete") return baseDecision(generatedAt, checkedAt, "blocked_allocation_gap", sbComplete, { blockers: ["allocation_gap_incomplete"] });
  if (!validateContributionAllocationGapAnalysisResult(gap).valid) return baseDecision(generatedAt, checkedAt, "blocked_allocation_gap", sbComplete, { blockers: ["allocation_gap_result_invalid"] });

  // (7) Stable context.
  const stable = buildContributionStablePriorityContext(gap, input.stableOptions);
  if (!stable.context) return baseDecision(generatedAt, checkedAt, "blocked_allocation_gap", sbComplete, { blockers: stable.blockers.length ? stable.blockers : ["stable_target_not_configured"] });

  // (8) Stable allocation priority.
  if (stable.context.stableAllocationPriorityRequired) {
    return baseDecision(generatedAt, checkedAt, "complete", sbComplete, {
      purpose: "stable_allocation",
      primaryTargetCategory: "stable_asset",
      priorityTargetIds: [...stable.context.triggerMetStableTargetIds],
      stableContext: stable.context,
      warnings: ["Stable allocation has priority before growth allocation. No contribution amount or funding source has been selected."],
    });
  }

  // (9) Growth context.
  const growth = buildContributionGrowthPriorityContext(gap, input.growthOptions);

  // (10) Growth allocation may proceed.
  if (growth.growthAllocationMayProceed) {
    return baseDecision(generatedAt, checkedAt, "complete", sbComplete, {
      purpose: "growth_allocation",
      primaryTargetCategory: "growth_asset",
      priorityTargetIds: [...growth.triggerMetGrowthTargetIds],
      stableContext: stable.context,
      growthContext: growth,
      warnings: ["Growth allocation may proceed to later funding and plan evaluation. No target is selected and no amount has been calculated."],
    });
  }

  // (11) On Track (internal contribution-priority state only).
  return baseDecision(generatedAt, checkedAt, "complete", sbComplete, {
    purpose: "on_track",
    primaryTargetCategory: "none",
    priorityTargetIds: [],
    stableContext: stable.context,
    growthContext: growth,
    notes: ["On Track is an internal contribution-allocation priority state. It does not create a user-facing card and does not suppress unrelated future suggestion families."],
  });
}

/** Canonical Safety Buffer target ids (registry role `safety_buffer_asset`; USDC today). */
function getSafetyBufferTargetIds(): string[] {
  // Registry role discovery, not a hardcoded id.
  return getStableAllocationDestinations().filter((t) => t.canServeAsSafetyBuffer && t.suggestionRoles.includes("safety_buffer_asset")).map((t) => t.targetId);
}

/* ------------------------------------------------------------------ *
 * Validators (fail closed).
 * ------------------------------------------------------------------ */
export interface PriorityValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateContributionPriorityStableContext(ctx: unknown): PriorityValidationResult {
  const errors: string[] = [];
  if (!ctx || typeof ctx !== "object") return { valid: false, errors: ["stable_context_not_an_object"] };
  const c = ctx as ContributionPriorityStableContext;
  if (!Array.isArray(c.stableTargetIds) || !Array.isArray(c.triggerMetStableTargetIds) || !Array.isArray(c.underweightStableTargetIds)) errors.push("stable_arrays_missing");
  else {
    if (c.triggerMetStableTargetIds.some((id) => !c.underweightStableTargetIds.includes(id))) errors.push("trigger_met_not_underweight");
    if (c.stableAllocationPriorityRequired !== (c.triggerMetStableTargetIds.length > 0)) errors.push("stable_required_flag_mismatch");
  }
  return { valid: errors.length === 0, errors };
}

export function validateContributionPriorityGrowthContext(ctx: unknown): PriorityValidationResult {
  const errors: string[] = [];
  if (!ctx || typeof ctx !== "object") return { valid: false, errors: ["growth_context_not_an_object"] };
  const c = ctx as ContributionPriorityGrowthContext;
  if (!Array.isArray(c.eligibleGrowthTargetIds) || !Array.isArray(c.underweightGrowthTargetIds) || !Array.isArray(c.triggerMetGrowthTargetIds)) errors.push("growth_arrays_missing");
  else {
    if (c.triggerMetGrowthTargetIds.some((id) => !c.eligibleGrowthTargetIds.includes(id))) errors.push("trigger_met_not_eligible");
    if (c.underweightGrowthTargetIds.some((id) => !c.eligibleGrowthTargetIds.includes(id))) errors.push("underweight_not_eligible");
    if (c.growthAllocationMayProceed !== (c.triggerMetGrowthTargetIds.length > 0)) errors.push("growth_proceed_flag_mismatch");
  }
  return { valid: errors.length === 0, errors };
}

export function validateContributionPriorityDecision(decision: unknown): PriorityValidationResult {
  const errors: string[] = [];
  if (!decision || typeof decision !== "object") return { valid: false, errors: ["decision_not_an_object"] };
  const d = decision as ContributionPriorityDecision;
  if (d.schemaVersion !== CONTRIBUTION_PRIORITY_SCHEMA_VERSION) errors.push("wrong_schema_version");
  if (d.policyId !== CONTRIBUTION_PRIORITY_POLICY_ID) errors.push("wrong_policy_id");
  if (d.policyVersion !== CONTRIBUTION_PRIORITY_POLICY_VERSION) errors.push("wrong_policy_version");
  const flagsFalse = d.contributionFrequencyApplied === false && d.fundingSourceSelected === false && d.fundingAvailabilityEvaluated === false && d.excessUsdcCalculated === false && d.contributionAmountCalculated === false && d.residualAmountCalculated === false && d.targetSelected === false && d.dcaPlanGenerated === false && d.suggestionGenerated === false && d.updatesProductOutput === false && d.transactionsEnabled === false && d.walletSignatureRequired === false;
  if (!flagsFalse) errors.push("capability_flag_enabled");
  if (d.safetyBuffer?.evaluated !== true) errors.push("safety_buffer_not_evaluated");

  if (d.status === "invalid_input" || d.status === "blocked_safety_buffer" || d.status === "blocked_allocation_gap" || d.status === "blocked_policy_readiness") {
    if (d.blockers.length === 0) errors.push("blocked_without_blocker");
    if (d.purpose != null) errors.push("blocked_with_purpose");
  }

  if (d.status === "complete") {
    if (!d.purpose) errors.push("complete_without_purpose");
    if (d.purpose === "safety_buffer") {
      if (!(typeof d.safetyBufferPriorityShortfallUsd === "number" && d.safetyBufferPriorityShortfallUsd > 0)) errors.push("safety_buffer_purpose_without_shortfall");
      if (d.safetyBuffer.complete !== false) errors.push("safety_buffer_purpose_but_complete");
      if (!d.growthSuppressedBySafetyBuffer || !d.stableAllocationSuppressedBySafetyBuffer) errors.push("safety_buffer_not_suppressing");
      if (d.stableContext?.stableAllocationPriorityRequired) errors.push("safety_buffer_with_stable_priority");
    }
    if (d.purpose === "stable_allocation") {
      if (d.safetyBuffer.complete !== true) errors.push("stable_priority_while_buffer_incomplete");
      if (!(d.stableContext && d.stableContext.triggerMetStableTargetIds.length > 0)) errors.push("stable_purpose_without_trigger");
      if (d.priorityTargetIds.join(",") !== (d.stableContext?.triggerMetStableTargetIds.join(",") ?? "")) errors.push("stable_priority_ids_mismatch");
      const vs = validateContributionPriorityStableContext(d.stableContext);
      if (!vs.valid) errors.push(...vs.errors);
    }
    if (d.purpose === "growth_allocation") {
      if (d.safetyBuffer.complete !== true) errors.push("growth_priority_while_buffer_incomplete");
      if (d.stableContext?.stableAllocationPriorityRequired) errors.push("growth_priority_while_stable_trigger_met");
      if (!(d.growthContext && d.growthContext.triggerMetGrowthTargetIds.length > 0)) errors.push("growth_purpose_without_trigger");
      if (d.priorityTargetIds.join(",") !== (d.growthContext?.triggerMetGrowthTargetIds.join(",") ?? "")) errors.push("growth_priority_ids_mismatch");
      const vg = validateContributionPriorityGrowthContext(d.growthContext);
      if (!vg.valid) errors.push(...vg.errors);
    }
    if (d.purpose === "on_track") {
      if (d.safetyBuffer.complete !== true) errors.push("on_track_while_buffer_incomplete");
      if (d.stableContext?.stableAllocationPriorityRequired) errors.push("on_track_while_stable_trigger_met");
      if (d.growthContext?.growthAllocationMayProceed) errors.push("on_track_while_growth_trigger_met");
      if (d.priorityTargetIds.length !== 0) errors.push("on_track_with_priority_targets");
    }
  }
  return { valid: errors.length === 0, errors };
}
