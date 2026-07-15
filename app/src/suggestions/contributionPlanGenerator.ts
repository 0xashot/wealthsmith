/**
 * contributionPlanGenerator — Step 15G. Builds ONE deterministic, read-only contribution plan from
 * Step 15E priority + Step 15F primary funding source + Step 15D caps/projections + Step 15B cadence
 * + Step 15C minimums + registry target identity. It selects exactly one final target (fails closed
 * on multiple), uses the full capped primary capacity, floors cap-constrained amounts, projects
 * post-plan allocation / Safety Buffer progress, and stages existing-excess-USDC DCA into 4 tranches
 * over 14 days. It never combines sources, generates an alternative plan, routes a residual, selects
 * a route/protocol, estimates fees/slippage, prepares a transaction, or generates a suggestion.
 */
import {
  CONTRIBUTION_PLAN_SCHEMA_VERSION,
  CONTRIBUTION_PLAN_POLICY_ID,
  CONTRIBUTION_PLAN_POLICY_VERSION,
  type ContributionPlan,
  type ContributionPlanAmount,
  type ContributionPlanBlocker,
  type ContributionPlanGenerationResult,
  type ContributionPlanGenerationStatus,
  type ContributionPlanKind,
  type ContributionPlanProjection,
  type ContributionPlanProjectionPoint,
  type ContributionPlanStep,
} from "./contributionPlanTypes";
import { buildContributionPlanAmountFromSourceOption, buildContributionPlanCadence, buildExactPlanTranches, calculateUnallocatedSourceCapacity, validateContributionPlanAmount, validateContributionPlanCadence } from "./contributionPlanAmount";
import { buildSafetyBufferPlanProjection, buildExternalContributionPlanProjection, buildInternalReallocationPlanProjection, validateContributionPlanProjectionPoint } from "./contributionPlanProjection";
import { EXCESS_USDC_DCA_TRANCHE_COUNT, getExcessUsdcDcaRelativeDayOffsets } from "./contributionPlanPolicy";
import type { ContributionPriorityDecision } from "./contributionPriorityTypes";
import { validateContributionPriorityDecision } from "./contributionPriorityEngine";
import type { ContributionFundingSelectionResult } from "./contributionFundingTypes";
import { validateContributionFundingSelectionResult } from "./contributionFundingSelection";
import { getTargetGapResult } from "./contributionFundingAvailability";
import type { ContributionAllocationGapAnalysisResult } from "./contributionAllocationGapTypes";
import type { ContributionFrequencyNormalizationResult } from "./contributionFrequencyTypes";
import { getInvestmentTarget } from "./investmentTargetRegistry";

export const CONTRIBUTION_PLAN_GENERATOR_EXISTS = true;

const isValidTimestamp = (s: unknown): boolean => typeof s === "string" && s.length > 0 && !Number.isNaN(Date.parse(s));

/** Deterministic FNV-1a hash → 8 hex chars. No randomness, no wall-clock entropy. */
function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/**
 * Stable plan id from the CANONICAL FINANCIAL identity — never `generatedAt` and never the
 * refresh-prone `checkedAt` (Step 15H: an ordinary UI rerender that only bumps checkedAt must not
 * mint a new card id). Uses policy versions + purpose + funding source + target + amount cents +
 * the allocation snapshot id/version + the contribution-frequency result identity. A genuinely
 * different portfolio snapshot (a new `sourceSnapshotId`/version) intentionally changes the id.
 */
function buildPlanId(
  purpose: string,
  fundingSourceId: string,
  targetId: string,
  amount: ContributionPlanAmount,
  allocationGapResult: ContributionAllocationGapAnalysisResult | null | undefined,
  priority: ContributionPriorityDecision,
  funding: ContributionFundingSelectionResult,
  frequencyNormalization: ContributionFrequencyNormalizationResult | undefined,
): string {
  const amountKey = amount.kind === "exact" ? `e:${amount.exactAmountCents}` : `r:${amount.minimumAmountCents}-${amount.maximumAmountCents}`;
  const snapKey = allocationGapResult ? `${allocationGapResult.sourceSnapshotId ?? ""}:${allocationGapResult.sourcePortfolioVersion ?? ""}` : "no-snapshot";
  const freqKey = frequencyNormalization ? `${frequencyNormalization.schemaVersion}:${frequencyNormalization.canonicalFrequencyId ?? ""}` : "no-freq";
  return `plan_${fnv1a([CONTRIBUTION_PLAN_POLICY_VERSION, priority.policyVersion, funding.policyVersion, purpose, fundingSourceId, targetId, amountKey, snapKey, freqKey].join("|"))}`;
}

export interface BuildContributionPlanInput {
  priorityDecision: ContributionPriorityDecision;
  fundingSelection: ContributionFundingSelectionResult;
  allocationGapResult?: ContributionAllocationGapAnalysisResult | null;
  frequencyNormalization?: ContributionFrequencyNormalizationResult;
  generatedAt: string;
  checkedAt: string;
}

function result(generatedAt: string, checkedAt: string, status: ContributionPlanGenerationStatus, extra: Partial<ContributionPlanGenerationResult> = {}): ContributionPlanGenerationResult {
  return {
    schemaVersion: CONTRIBUTION_PLAN_SCHEMA_VERSION,
    policyId: CONTRIBUTION_PLAN_POLICY_ID,
    policyVersion: CONTRIBUTION_PLAN_POLICY_VERSION,
    status,
    generatedAt,
    checkedAt,
    planGenerated: false,
    contributionPlanGenerated: false,
    dcaPlanGenerated: false,
    finalTargetSelected: false,
    finalPlanAmountCalculated: false,
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

export function buildContributionPlan(input: BuildContributionPlanInput): ContributionPlanGenerationResult {
  const generatedAt = input?.generatedAt ?? "";
  const checkedAt = input?.checkedAt ?? "";
  const fail = (status: ContributionPlanGenerationStatus, blockers: ContributionPlanBlocker[]) => result(generatedAt, checkedAt, status, { blockers });

  if (!input || typeof input !== "object" || !isValidTimestamp(generatedAt) || !isValidTimestamp(checkedAt)) return fail("invalid_input", ["timestamps_invalid"]);
  const priority = input.priorityDecision;
  const funding = input.fundingSelection;
  if (!priority || typeof priority !== "object") return fail("invalid_input", ["priority_result_missing"]);
  if (!funding || typeof funding !== "object") return fail("invalid_input", ["funding_result_missing"]);
  if (!validateContributionPriorityDecision(priority).valid) return fail("invalid_input", ["priority_result_invalid"]);
  if (!validateContributionFundingSelectionResult(funding).valid) return fail("invalid_input", ["funding_result_invalid"]);

  if (priority.status !== "complete") return fail("blocked_priority", ["priority_result_invalid"]);
  const purpose = priority.purpose;

  // On Track — no corrective plan.
  if (purpose === "on_track" || funding.status === "no_action_required") {
    return result(generatedAt, checkedAt, "no_action_required", { noActionReason: "contribution_allocation_on_track", notes: ["On Track: no contribution-allocation correction is prioritized, so no plan is generated."] });
  }
  if (!purpose) return fail("invalid_input", ["priority_result_invalid"]);

  // Exactly one target — a structural priority check, before funding eligibility.
  const targetIds = priority.priorityTargetIds ?? [];
  if (targetIds.length === 0) return fail("invalid_input", ["priority_target_missing"]);
  if (targetIds.length > 1) return fail("blocked_multiple_targets", ["multiple_priority_targets_require_suballocation_policy"]);
  const targetId = targetIds[0];

  // Funding must have selected a source.
  if (funding.status !== "source_selected" || !funding.primaryFundingSourceId) return fail("blocked_funding", ["funding_source_not_selected"]);
  const primaryId = funding.primaryFundingSourceId;
  const primaryOpt = funding.sourceOptions.find((o) => o.sourceId === primaryId);
  if (!primaryOpt) return fail("blocked_funding", ["primary_source_option_missing"]);
  if (primaryOpt.status !== "eligible_exact" && primaryOpt.status !== "eligible_range") return fail("blocked_funding", ["primary_source_not_eligible"]);

  const target = getInvestmentTarget(targetId);
  if (!target) return fail("invalid_input", ["target_not_registered"]);

  // Role validation by purpose.
  if (purpose === "safety_buffer") {
    if (!(target.canServeAsSafetyBuffer && target.suggestionRoles.includes("safety_buffer_asset"))) return fail("invalid_input", ["target_role_invalid"]);
    if (primaryId !== "upcoming_contribution") return fail("blocked_funding", ["source_target_pair_invalid"]);
  } else if (purpose === "stable_allocation") {
    if (!(target.canReceiveStableAllocation && target.suggestionRoles.includes("stable_allocation_destination"))) return fail("invalid_input", ["target_role_invalid"]);
    if (primaryId !== "upcoming_contribution") return fail("blocked_funding", ["source_target_pair_invalid"]);
  } else {
    // growth_allocation
    if (!target.suggestionRoles.includes("contribution_growth_target")) return fail("invalid_input", ["target_role_invalid"]);
    const gapForRole = getTargetGapResult(input.allocationGapResult, targetId);
    if (!input.allocationGapResult) return fail("invalid_input", ["allocation_gap_result_missing"]);
    if (!gapForRole) return fail("invalid_input", ["target_result_missing"]);
    if (!(gapForRole.contributionTargetPolicyReady === true && gapForRole.eligibleForFutureGrowthContributionEvaluation === true)) return fail("invalid_input", ["target_role_invalid"]);
  }

  // Final plan amount from the full capped primary capacity.
  const amountRes = buildContributionPlanAmountFromSourceOption(primaryOpt);
  if (!amountRes.ok || !amountRes.amount) return fail("blocked_funding", [amountRes.blocker ?? "amount_invalid"]);
  const amount = amountRes.amount;

  const usdcAssetId = getInvestmentTarget("usdc")?.assetId;

  // Build projection + steps per branch.
  let kind: ContributionPlanKind;
  let projection: ContributionPlanProjection;
  let steps: ContributionPlanStep[];
  let sourceAssetId: string | undefined;
  let dca = false;

  const stepPurpose = purpose === "safety_buffer" ? "increase_safety_buffer" : purpose === "stable_allocation" ? "increase_stable_allocation" : "increase_growth_allocation";
  const oneStep = (a: ContributionPlanAmount): ContributionPlanStep => ({ stepIndex: 0, amount: a, sourceId: primaryId, ...(sourceAssetId ? { sourceAssetId } : {}), targetId, targetAssetId: target.assetId, purpose: stepPurpose, executionStatus: "read_only_plan", routeSelected: false, protocolSelected: false, transactionPrepared: false, transactionSubmitted: false, walletSignatureRequired: false });

  const projPointsOk = (pts: (ContributionPlanProjectionPoint | null)[], mode: "external" | "internal" | "safety_buffer"): { ok: boolean; blocker?: ContributionPlanBlocker } => {
    for (const p of pts) {
      if (!p) return { ok: false, blocker: "projection_invalid" };
      const v = validateContributionPlanProjectionPoint(p, mode);
      if (!v.valid) return { ok: false, blocker: v.errors.includes("projection_overshoots_target") ? "projection_overshoots_target" : v.errors.includes("safety_buffer_not_preserved") ? "safety_buffer_not_preserved" : mode === "safety_buffer" ? "safety_buffer_projection_invalid" : "projection_invalid" };
    }
    return { ok: true };
  };

  if (purpose === "safety_buffer") {
    kind = "safety_buffer_contribution";
    const cur = priority.safetyBuffer.currentEligibleBufferUsd;
    const req = priority.safetyBuffer.requiredBufferUsd;
    if (amount.kind === "exact") {
      const pt = buildSafetyBufferPlanProjection(cur, req, amount.exactAmountUsd as number);
      const chk = projPointsOk([pt], "safety_buffer");
      if (!chk.ok) return fail("blocked_projection", [chk.blocker!]);
      projection = { kind: "exact", exact: pt };
    } else {
      const lo = buildSafetyBufferPlanProjection(cur, req, amount.minimumAmountUsd as number);
      const hi = buildSafetyBufferPlanProjection(cur, req, amount.maximumAmountUsd as number);
      const chk = projPointsOk([lo, hi], "safety_buffer");
      if (!chk.ok) return fail("blocked_projection", [chk.blocker!]);
      projection = { kind: "range", minimum: lo, maximum: hi };
    }
    steps = [oneStep(amount)];
  } else if (purpose === "stable_allocation" || (purpose === "growth_allocation" && primaryId === "upcoming_contribution")) {
    kind = purpose === "stable_allocation" ? "stable_allocation_contribution" : "growth_recurring_contribution";
    const gap = getTargetGapResult(input.allocationGapResult, targetId);
    if (!gap) return fail("invalid_input", ["target_result_missing"]);
    if (amount.kind === "exact") {
      const pt = buildExternalContributionPlanProjection(gap, amount.exactAmountUsd as number);
      const chk = projPointsOk([pt], "external");
      if (!chk.ok) return fail("blocked_projection", [chk.blocker!]);
      projection = { kind: "exact", exact: pt! };
    } else {
      const lo = buildExternalContributionPlanProjection(gap, amount.minimumAmountUsd as number);
      const hi = buildExternalContributionPlanProjection(gap, amount.maximumAmountUsd as number);
      const chk = projPointsOk([lo, hi], "external");
      if (!chk.ok) return fail("blocked_projection", [chk.blocker!]);
      projection = { kind: "range", minimum: lo!, maximum: hi! };
    }
    steps = [oneStep(amount)];
  } else {
    // growth_allocation + existing_excess_usdc → staged DCA.
    kind = "growth_excess_usdc_dca";
    dca = true;
    if (amount.kind !== "exact") return fail("blocked_funding", ["amount_invalid"]);
    if (!usdcAssetId) return fail("invalid_input", ["target_not_registered"]);
    sourceAssetId = usdcAssetId;
    if (sourceAssetId === target.assetId) return fail("invalid_input", ["source_target_pair_invalid"]);
    const gap = getTargetGapResult(input.allocationGapResult, targetId);
    if (!gap) return fail("invalid_input", ["target_result_missing"]);
    const tr = buildExactPlanTranches(amount.exactAmountCents as number, EXCESS_USDC_DCA_TRANCHE_COUNT);
    if (!tr.ok || !tr.tranches) return fail("blocked_funding", [tr.error ?? "tranche_amount_invalid"]);
    const offsets = getExcessUsdcDcaRelativeDayOffsets();
    const pt = buildInternalReallocationPlanProjection(gap, amount.exactAmountUsd as number, primaryOpt.safetyBufferPreserved);
    const chk = projPointsOk([pt], "internal");
    if (!chk.ok) return fail("blocked_projection", [chk.blocker!]);
    if (!primaryOpt.safetyBufferPreserved) return fail("blocked_projection", ["safety_buffer_not_preserved"]);
    projection = { kind: "exact", exact: pt! };
    steps = tr.tranches.map((cents, i): ContributionPlanStep => ({
      stepIndex: i,
      relativeDayOffset: offsets[i],
      amount: { kind: "exact", exactAmountCents: cents, exactAmountUsd: cents / 100, sourceCapacityCapped: amount.sourceCapacityCapped, roundingMode: "exact_cents", allocationCapUsd: amount.allocationCapUsd, minimumPolicyApplied: amount.minimumPolicyApplied, minimumPassed: true },
      sourceId: "existing_excess_usdc",
      sourceAssetId,
      targetId,
      targetAssetId: target.assetId,
      purpose: "increase_growth_allocation",
      executionStatus: "read_only_plan",
      routeSelected: false,
      protocolSelected: false,
      transactionPrepared: false,
      transactionSubmitted: false,
      walletSignatureRequired: false,
    }));
  }

  const status: "ready_exact" | "ready_range" = amount.kind === "range" ? "ready_range" : "ready_exact";
  const fundingTiming = primaryOpt.timing;
  const plan: ContributionPlan = {
    planId: buildPlanId(purpose, primaryId, targetId, amount, input.allocationGapResult, priority, funding, input.frequencyNormalization),
    schemaVersion: CONTRIBUTION_PLAN_SCHEMA_VERSION,
    policyId: CONTRIBUTION_PLAN_POLICY_ID,
    policyVersion: CONTRIBUTION_PLAN_POLICY_VERSION,
    status,
    kind,
    generatedAt,
    checkedAt,
    priorityPurpose: purpose,
    fundingSourceId: primaryId,
    fundingTiming,
    selectedTargetId: targetId,
    selectedTargetAssetId: target.assetId,
    ...(sourceAssetId ? { sourceAssetId } : {}),
    amount,
    cadence: buildContributionPlanCadence(funding, input.frequencyNormalization, primaryId),
    steps,
    projection,
    unallocatedSourceCapacity: calculateUnallocatedSourceCapacity(primaryOpt, amount),
    alternativeFundingSourceIds: [...funding.alternativeFundingSourceIds],
    sourcePriorityPolicyId: priority.policyId,
    sourcePriorityPolicyVersion: priority.policyVersion,
    sourceFundingPolicyId: funding.policyId,
    sourceFundingPolicyVersion: funding.policyVersion,
    ...(input.allocationGapResult ? { sourceAllocationPolicyId: input.allocationGapResult.policyId, sourceAllocationPolicyVersion: input.allocationGapResult.policyVersion } : {}),
    sourcePlanPolicyId: CONTRIBUTION_PLAN_POLICY_ID,
    sourcePlanPolicyVersion: CONTRIBUTION_PLAN_POLICY_VERSION,
    planGenerated: true,
    finalTargetSelected: true,
    finalPlanAmountCalculated: true,
    exactExecutionAmountResolved: amount.kind === "exact",
    mixedFundingUsed: false,
    alternativePlanGenerated: false,
    residualRouted: false,
    routeEvaluated: false,
    costEvaluated: false,
    slippageEvaluated: false,
    liquidityRouteEvaluated: false,
    protocolEvaluated: false,
    executionReady: false,
    automationEnabled: false,
    suggestionGenerated: false,
    updatesProductOutput: false,
    transactionsEnabled: false,
    walletSignatureRequired: false,
    blockers: [],
    warnings: [],
    notes: [],
  };

  const pv = validateContributionPlan(plan);
  if (!pv.valid) return result(generatedAt, checkedAt, "invalid_input", { blockers: ["plan_inconsistent"], warnings: pv.errors });

  return result(generatedAt, checkedAt, status, {
    plan,
    planGenerated: true,
    contributionPlanGenerated: true,
    dcaPlanGenerated: dca,
    finalTargetSelected: true,
    finalPlanAmountCalculated: true,
  });
}

/* ------------------------------------------------------------------ *
 * Validators (fail closed).
 * ------------------------------------------------------------------ */
export interface PlanValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateContributionPlanStep(step: unknown): PlanValidationResult {
  const errors: string[] = [];
  if (!step || typeof step !== "object") return { valid: false, errors: ["step_not_an_object"] };
  const s = step as ContributionPlanStep;
  if (s.executionStatus !== "read_only_plan") errors.push("step_not_read_only");
  const flagsFalse = s.routeSelected === false && s.protocolSelected === false && s.transactionPrepared === false && s.transactionSubmitted === false && s.walletSignatureRequired === false;
  if (!flagsFalse) errors.push("step_execution_flag_enabled");
  if (!s.targetId || !s.targetAssetId) errors.push("step_missing_target");
  const av = validateContributionPlanAmount(s.amount);
  if (!av.valid) errors.push(...av.errors);
  return { valid: errors.length === 0, errors };
}

export function validateContributionPlan(plan: unknown): PlanValidationResult {
  const errors: string[] = [];
  if (!plan || typeof plan !== "object") return { valid: false, errors: ["plan_not_an_object"] };
  const p = plan as ContributionPlan;
  if (p.schemaVersion !== CONTRIBUTION_PLAN_SCHEMA_VERSION) errors.push("wrong_schema_version");
  if (p.policyId !== CONTRIBUTION_PLAN_POLICY_ID) errors.push("wrong_policy_id");
  if (p.policyVersion !== CONTRIBUTION_PLAN_POLICY_VERSION) errors.push("wrong_policy_version");

  const flagsFalse = p.mixedFundingUsed === false && p.alternativePlanGenerated === false && p.residualRouted === false && p.routeEvaluated === false && p.costEvaluated === false && p.slippageEvaluated === false && p.liquidityRouteEvaluated === false && p.protocolEvaluated === false && p.executionReady === false && p.automationEnabled === false && p.suggestionGenerated === false && p.updatesProductOutput === false && p.transactionsEnabled === false && p.walletSignatureRequired === false;
  if (!flagsFalse) errors.push("capability_flag_enabled");

  if (p.status === "ready_exact" && (p.amount.kind !== "exact" || !p.exactExecutionAmountResolved)) errors.push("ready_exact_without_exact");
  if (p.status === "ready_range" && (p.amount.kind !== "range" || p.exactExecutionAmountResolved)) errors.push("ready_range_without_range");

  const av = validateContributionPlanAmount(p.amount);
  if (!av.valid) errors.push(...av.errors.map((e) => `amount_${e}`));
  const cv = validateContributionPlanCadence(p.cadence);
  if (!cv.valid) errors.push(...cv.errors.map((e) => `cadence_${e}`));

  // Kind ↔ role/source pairing.
  if (p.kind === "safety_buffer_contribution" && (p.priorityPurpose !== "safety_buffer" || p.fundingSourceId !== "upcoming_contribution")) errors.push("buffer_kind_mismatch");
  if (p.kind === "stable_allocation_contribution" && (p.priorityPurpose !== "stable_allocation" || p.fundingSourceId !== "upcoming_contribution")) errors.push("stable_kind_mismatch");
  if (p.kind === "growth_recurring_contribution" && (p.priorityPurpose !== "growth_allocation" || p.fundingSourceId !== "upcoming_contribution")) errors.push("growth_recurring_kind_mismatch");
  if (p.kind === "growth_excess_usdc_dca") {
    if (p.priorityPurpose !== "growth_allocation" || p.fundingSourceId !== "existing_excess_usdc") errors.push("dca_kind_mismatch");
    if (p.steps.length !== EXCESS_USDC_DCA_TRANCHE_COUNT) errors.push("dca_without_four_tranches");
    if (p.cadence.mode !== "staged_existing_capital") errors.push("dca_without_staged_cadence");
    if ((p.cadence.relativeDayOffsets ?? []).join(",") !== "0,5,9,14") errors.push("dca_wrong_offsets");
    if (p.sourceAssetId === p.selectedTargetAssetId) errors.push("dca_source_equals_target");
    const totalCents = p.steps.reduce((s, st) => s + (st.amount.exactAmountCents ?? 0), 0);
    if (totalCents !== (p.amount.exactAmountCents ?? -1)) errors.push("tranche_total_mismatch");
    const per = p.steps.map((st) => st.amount.exactAmountCents ?? 0);
    if (Math.max(...per) - Math.min(...per) > 1) errors.push("tranche_spread_gt_one_cent");
    if (per.some((c) => c / 100 < 49.995)) errors.push("tranche_below_minimum");
  } else {
    // Non-DCA plans must be a single step and not split into tranches.
    if (p.steps.length !== 1) errors.push("non_dca_not_single_step");
    if (p.cadence.trancheCount != null) errors.push("recurring_split_into_tranches");
  }

  for (const s of p.steps) {
    const sv = validateContributionPlanStep(s);
    if (!sv.valid) errors.push(...sv.errors.map((e) => `step_${e}`));
  }

  // Projection ↔ amount kind + mode.
  const mode: "external" | "internal" | "safety_buffer" = p.kind === "safety_buffer_contribution" ? "safety_buffer" : p.kind === "growth_excess_usdc_dca" ? "internal" : "external";
  if (p.projection.kind !== (p.amount.kind === "range" ? "range" : "exact")) errors.push("projection_kind_mismatch");
  const pts = p.projection.kind === "exact" ? [p.projection.exact] : [p.projection.minimum, p.projection.maximum];
  for (const pt of pts) {
    if (!pt) { errors.push("projection_point_missing"); continue; }
    const ppv = validateContributionPlanProjectionPoint(pt, mode);
    if (!ppv.valid) errors.push(...ppv.errors.map((e) => `projection_${e}`));
  }
  if (p.unallocatedSourceCapacity.routed !== false || p.unallocatedSourceCapacity.nextPurposeSelected !== false) errors.push("unallocated_routed");
  return { valid: errors.length === 0, errors };
}

export function validateContributionPlanGenerationResult(res: unknown): PlanValidationResult {
  const errors: string[] = [];
  if (!res || typeof res !== "object") return { valid: false, errors: ["result_not_an_object"] };
  const r = res as ContributionPlanGenerationResult;
  if (r.schemaVersion !== CONTRIBUTION_PLAN_SCHEMA_VERSION) errors.push("wrong_schema_version");
  const flagsFalse = r.suggestionGenerated === false && r.updatesProductOutput === false && r.transactionsEnabled === false && r.walletSignatureRequired === false;
  if (!flagsFalse) errors.push("capability_flag_enabled");
  if (r.status === "ready_exact" || r.status === "ready_range") {
    if (!r.plan) errors.push("ready_without_plan");
    else {
      const pv = validateContributionPlan(r.plan);
      if (!pv.valid) errors.push(...pv.errors);
      if (r.status !== r.plan.status) errors.push("result_plan_status_mismatch");
    }
    if (!r.finalTargetSelected || !r.finalPlanAmountCalculated) errors.push("ready_without_finalization");
  } else if (r.status === "no_action_required") {
    if (r.plan) errors.push("no_action_with_plan");
    if (r.finalTargetSelected || r.finalPlanAmountCalculated) errors.push("no_action_with_finalization");
  } else {
    if (r.plan) errors.push("blocked_with_plan");
    if (r.blockers.length === 0) errors.push("blocked_without_blocker");
  }
  return { valid: errors.length === 0, errors };
}
