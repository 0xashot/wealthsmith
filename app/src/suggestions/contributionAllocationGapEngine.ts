/**
 * contributionAllocationGapEngine — Step 15D. The deterministic, versioned, asset-agnostic
 * allocation-gap engine. Given a canonical portfolio snapshot and the Step 15C target-allocation
 * policy, it computes per mapped target: current USD exposure, current %, target %, signed pp gap,
 * classification, the reused 5-pp trigger, the static current-total USD gap, the internal-
 * reallocation cap, the external-contribution cap (which correctly accounts for the denominator
 * growing with new money), and — only when explicitly supplied — a hypothetical projection.
 *
 * It calculates MATHEMATICAL gaps and caps only. It never computes available funding / deployable
 * capital / a suggested contribution or DCA amount, never evaluates the Safety Buffer or a funding
 * source, never applies a contribution frequency, never ranks or selects a target, never generates
 * a plan or suggestion, never touches product output, and never enables execution/signatures.
 * Fails closed.
 */
import {
  CONTRIBUTION_ALLOCATION_GAP_SCHEMA_VERSION,
  CONTRIBUTION_ALLOCATION_GAP_POLICY_ID,
  CONTRIBUTION_ALLOCATION_GAP_POLICY_VERSION,
  type ContributionAllocationGapAnalysisResult,
  type ContributionAllocationGapAnalysisStatus,
  type ContributionAllocationGapBlocker,
  type ContributionAllocationHypotheticalInput,
  type ContributionAllocationProjection,
  type ContributionPortfolioAllocationSnapshot,
  type ContributionPortfolioTargetExposure,
  type ContributionTargetAllocationGapResult,
} from "./contributionAllocationGapTypes";
import {
  CONTRIBUTION_ALLOCATION_PERCENTAGE_TOLERANCE as PCT_TOL,
  CONTRIBUTION_ALLOCATION_VALUE_TOLERANCE_USD as VAL_TOL,
  CONTRIBUTION_ALLOCATION_UNDERWEIGHT_TRIGGER_PERCENTAGE_POINTS as UNDERWEIGHT_TRIGGER,
  classifyContributionAllocationGap,
} from "./contributionAllocationGapPolicy";
import {
  validateGrowthTargetAllocationPolicyResult,
  type GrowthTargetAllocationPolicyResult,
} from "./growthTargetAllocationPolicy";
import type { ContributionTargetPolicyEligibility } from "./contributionTargetPolicyEligibility";
import { getInvestmentTarget } from "./investmentTargetRegistry";

export const TARGET_ALLOCATION_GAP_ENGINE_EXISTS = true;

const finiteNum = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
const isValidTimestamp = (s: unknown): boolean => typeof s === "string" && s.length > 0 && !Number.isNaN(Date.parse(s));

/** True only for a CURRENTLY enabled growth contribution target (SOL today) per the registry. */
export function isEnabledGrowthContributionTarget(targetId: string): boolean {
  const t = getInvestmentTarget(targetId);
  return !!t && t.lifecycleStatus === "enabled" && t.enabledForMvp === true && t.canBeContributionTarget === true && t.suggestionRoles.includes("contribution_growth_target");
}

export interface BuildContributionAllocationGapAnalysisInput {
  snapshot: ContributionPortfolioAllocationSnapshot;
  targetAllocationResult: GrowthTargetAllocationPolicyResult;
  policyEligibilityByTargetId?: Record<string, ContributionTargetPolicyEligibility | undefined>;
  hypotheticalInputs?: ContributionAllocationHypotheticalInput[];
  generatedAt: string;
  checkedAt: string;
}

function baseAnalysis(
  generatedAt: string,
  checkedAt: string,
  status: ContributionAllocationGapAnalysisStatus,
  extra: Partial<ContributionAllocationGapAnalysisResult> = {},
): ContributionAllocationGapAnalysisResult {
  return {
    schemaVersion: CONTRIBUTION_ALLOCATION_GAP_SCHEMA_VERSION,
    policyId: CONTRIBUTION_ALLOCATION_GAP_POLICY_ID,
    policyVersion: CONTRIBUTION_ALLOCATION_GAP_POLICY_VERSION,
    status,
    generatedAt,
    checkedAt,
    targetResults: [],
    underweightTargetIds: [],
    triggerMetTargetIds: [],
    overweightTargetIds: [],
    atTargetIds: [],
    emptyPortfolio: false,
    currentAllocationCalculated: false,
    fundingSourceEvaluated: false,
    fundingAvailabilityEvaluated: false,
    safetyBufferEvaluated: false,
    contributionFrequencyApplied: false,
    contributionPriorityEvaluated: false,
    contributionAmountCalculated: false,
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

function baseTargetResult(targetId: string, assetId: string, currentValueUsd: number, totalPortfolioValueUsd: number, targetPct: number): ContributionTargetAllocationGapResult {
  return {
    targetId,
    assetId,
    currentValueUsd,
    totalPortfolioValueUsd,
    targetPct,
    classification: "not_evaluable",
    underweightTriggerPercentagePoints: UNDERWEIGHT_TRIGGER,
    underweightTriggerMet: false,
    eligibleForFutureGrowthContributionEvaluation: false,
    contributionTargetPolicyReady: false,
    fundingSourceEvaluated: false,
    fundingAvailabilityEvaluated: false,
    safetyBufferEvaluated: false,
    contributionFrequencyApplied: false,
    contributionAmountCalculated: false,
    targetSelected: false,
    planGenerated: false,
    suggestionGenerated: false,
    blockers: [],
    warnings: [],
    transactionsEnabled: false,
    walletSignatureRequired: false,
  };
}

/**
 * External-contribution amount to reach `targetPct` when ALL new external money goes to this target
 * and no other holding changes: (t·P − V) / (1 − t), t = targetPct/100. Because new money also
 * grows the denominator, this is strictly larger than the static gap. Returns undefined at
 * targetPct = 100 (no finite solution unless already at total). Never rounds.
 */
export function computeExternalContributionToReachTarget(
  totalPortfolioValueUsd: number,
  currentTargetValueUsd: number,
  targetPct: number,
): { amount?: number; blocker?: ContributionAllocationGapBlocker } {
  const P = totalPortfolioValueUsd;
  const V = currentTargetValueUsd;
  const t = targetPct / 100;
  if (Math.abs(targetPct - 100) <= PCT_TOL) {
    if (Math.abs(V - P) <= VAL_TOL) return { amount: 0 };
    return { blocker: "external_target_unreachable_at_100_percent" };
  }
  if (t >= 1) return { blocker: "external_target_unreachable_at_100_percent" };
  const amount = (t * P - V) / (1 - t);
  if (!Number.isFinite(amount) || amount < -VAL_TOL) return { blocker: "calculation_inconsistent" };
  const clamped = Math.max(0, amount);
  // Reconstruct: the projected percentage after adding `clamped` must equal targetPct within tol.
  const projPct = ((V + clamped) / (P + clamped)) * 100;
  if (Math.abs(projPct - targetPct) > 1e-6) return { blocker: "calculation_inconsistent" };
  return { amount: clamped };
}

function computeTargetResult(
  targetId: string,
  assetId: string,
  exposure: ContributionPortfolioTargetExposure | undefined,
  P: number,
  targetPct: number,
  policyEligibility: ContributionTargetPolicyEligibility | undefined,
): ContributionTargetAllocationGapResult {
  const valueUsd = exposure?.valueUsd ?? 0;
  const r = baseTargetResult(targetId, assetId, valueUsd, P, targetPct);

  const currentPct = (valueUsd / P) * 100;
  r.currentPct = currentPct;
  const cls = classifyContributionAllocationGap(currentPct, targetPct);
  r.signedGapPercentagePoints = cls.signedGapPercentagePoints;
  r.classification = cls.classification;
  r.underweightTriggerMet = cls.underweightTriggerMet;

  const staticTargetValue = (P * targetPct) / 100;
  r.staticTargetValueAtCurrentTotalUsd = staticTargetValue;
  r.signedStaticGapAtCurrentTotalUsd = staticTargetValue - valueUsd;

  if (cls.underweight) {
    r.underweightPercentagePoints = cls.signedGapPercentagePoints;
    const internal = staticTargetValue - valueUsd;
    r.internalReallocationUsdToReachTarget = internal;
    r.maximumInternalReallocationIncreaseWithoutOvershootUsd = Math.max(0, internal);
    const ext = computeExternalContributionToReachTarget(P, valueUsd, targetPct);
    if (ext.blocker) {
      r.blockers.push(ext.blocker);
    } else if (ext.amount != null) {
      r.externalContributionUsdToReachTarget = ext.amount;
      r.maximumExternalContributionIncreaseWithoutOvershootUsd = Math.max(0, ext.amount);
    }
  } else if (cls.overweight) {
    r.overweightPercentagePoints = -(cls.signedGapPercentagePoints as number);
    r.currentOverweightUsdAtCurrentTotal = valueUsd - staticTargetValue;
    r.externalContributionUsdToReachTarget = 0;
    r.maximumExternalContributionIncreaseWithoutOvershootUsd = 0;
    r.maximumInternalReallocationIncreaseWithoutOvershootUsd = 0;
  } else {
    // at_target (or not_evaluable, though P>0 guarantees a percentage here).
    r.externalContributionUsdToReachTarget = 0;
    r.maximumExternalContributionIncreaseWithoutOvershootUsd = 0;
    r.maximumInternalReallocationIncreaseWithoutOvershootUsd = 0;
  }

  // Growth-target readiness gate (Step 15C). Only CURRENTLY enabled growth targets are gated; a
  // stable target (USDC) or a disabled/synthetic-future target is computed but never marked eligible.
  if (isEnabledGrowthContributionTarget(targetId)) {
    const ready = policyEligibility != null && policyEligibility.status === "ready_for_allocation_gap_evaluation" && policyEligibility.readyForAllocationGapEvaluation === true;
    if (ready) {
      r.eligibleForFutureGrowthContributionEvaluation = true;
      r.contributionTargetPolicyReady = true;
      r.warnings.push("An underweight gap here is a MATHEMATICAL gap only. It is not a recommendation, an available amount, or a selected contribution.");
    } else {
      r.blockers.push("contribution_target_policy_not_ready");
    }
  }

  return r;
}

/**
 * Project the allocation after an EXPLICIT hypothetical increase. External money grows both the
 * target and the total; internal reallocation keeps the total constant and cannot exceed the value
 * held outside the target (an aggregate mathematical bound — it identifies no source asset and
 * confirms no liquidity). Amount must be finite and non-negative. Fails closed.
 */
export function projectContributionAllocationAfterHypotheticalIncrease(
  targetGapResult: Pick<ContributionTargetAllocationGapResult, "currentValueUsd" | "totalPortfolioValueUsd" | "targetPct">,
  input: ContributionAllocationHypotheticalInput,
): { valid: boolean; projection?: ContributionAllocationProjection; blockers: ContributionAllocationGapBlocker[] } {
  if (!input || (input.mode !== "external_contribution" && input.mode !== "internal_reallocation")) {
    return { valid: false, blockers: ["hypothetical_amount_invalid"] };
  }
  const amount = input.amountUsd;
  if (!finiteNum(amount) || amount < 0) return { valid: false, blockers: ["hypothetical_amount_invalid"] };

  const P = targetGapResult.totalPortfolioValueUsd;
  const V = targetGapResult.currentValueUsd;
  const targetPct = targetGapResult.targetPct;
  if (!finiteNum(P) || P <= 0 || !finiteNum(V) || V < 0) return { valid: false, blockers: ["hypothetical_amount_invalid"] };

  let projTotal: number;
  let projTarget: number;
  if (input.mode === "external_contribution") {
    projTotal = P + amount;
    projTarget = V + amount;
  } else {
    const nonTargetValue = P - V;
    if (amount > nonTargetValue + VAL_TOL) return { valid: false, blockers: ["hypothetical_amount_exceeds_non_target_value"] };
    projTotal = P;
    projTarget = V + amount;
  }
  const projectedTargetPct = projTotal > 0 ? (projTarget / projTotal) * 100 : 0;
  const wouldOvershootTarget = projectedTargetPct > targetPct + PCT_TOL;

  const projection: ContributionAllocationProjection = {
    mode: input.mode,
    amountUsd: amount,
    sourceTotalPortfolioValueUsd: P,
    sourceTargetValueUsd: V,
    sourceTargetPct: (V / P) * 100,
    projectedTotalPortfolioValueUsd: projTotal,
    projectedTargetValueUsd: projTarget,
    projectedTargetPct,
    targetPct,
    projectedGapPercentagePoints: targetPct - projectedTargetPct,
    wouldOvershootTarget,
    withinTargetWithoutOvershoot: !wouldOvershootTarget,
    fundingAvailabilityEvaluated: false,
    safetyBufferEvaluated: false,
    sourceAssetSelected: false,
    planGenerated: false,
    suggestionGenerated: false,
  };
  return { valid: true, projection, blockers: [] };
}

/* ------------------------------------------------------------------ *
 * Validators (fail closed).
 * ------------------------------------------------------------------ */
export interface GapValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateContributionPortfolioTargetExposure(exposure: unknown): GapValidationResult {
  const errors: string[] = [];
  if (!exposure || typeof exposure !== "object") return { valid: false, errors: ["exposure_not_an_object"] };
  const e = exposure as ContributionPortfolioTargetExposure;
  if (!e.targetId || typeof e.targetId !== "string") errors.push("missing_target_id");
  if (typeof e.assetId !== "string") errors.push("missing_asset_id");
  if (!finiteNum(e.valueUsd)) errors.push("target_value_invalid");
  else if (e.valueUsd < 0) errors.push("target_value_negative");
  if (typeof e.valuationReady !== "boolean") errors.push("missing_valuation_ready");
  if (!Array.isArray(e.holdingSources)) errors.push("missing_holding_sources");
  return { valid: errors.length === 0, errors };
}

export function validateContributionPortfolioAllocationSnapshot(snapshot: unknown): GapValidationResult {
  const errors: string[] = [];
  if (!snapshot || typeof snapshot !== "object") return { valid: false, errors: ["portfolio_snapshot_missing"] };
  const s = snapshot as ContributionPortfolioAllocationSnapshot;
  if (!s.snapshotId || typeof s.snapshotId !== "string") errors.push("portfolio_snapshot_missing");
  if (!s.sourcePortfolioVersion || typeof s.sourcePortfolioVersion !== "string") errors.push("missing_source_portfolio_version");
  if (!isValidTimestamp(s.calculatedAt) || !isValidTimestamp(s.checkedAt)) errors.push("invalid_timestamp");
  if (s.valuationStatus !== "current") errors.push(s.valuationStatus === "stale" ? "portfolio_snapshot_stale" : "portfolio_total_invalid");
  if (s.totalPortfolioValueUsd == null) errors.push("portfolio_total_missing");
  else if (!finiteNum(s.totalPortfolioValueUsd)) errors.push("portfolio_total_invalid");
  else if (s.totalPortfolioValueUsd < 0) errors.push("portfolio_total_negative");
  if (!Array.isArray(s.targetExposures)) errors.push("target_values_missing");
  else {
    const ids = s.targetExposures.map((e) => e?.targetId);
    if (new Set(ids).size !== ids.length) errors.push("duplicate_target_value");
    for (const e of s.targetExposures) {
      const v = validateContributionPortfolioTargetExposure(e);
      if (!v.valid) errors.push(...v.errors);
      if (finiteNum(e?.valueUsd) && finiteNum(s.totalPortfolioValueUsd) && e.valueUsd > s.totalPortfolioValueUsd + VAL_TOL) errors.push("target_value_exceeds_portfolio");
    }
  }
  return { valid: errors.length === 0, errors };
}

export function validateContributionAllocationProjection(projection: unknown): GapValidationResult {
  const errors: string[] = [];
  if (!projection || typeof projection !== "object") return { valid: false, errors: ["projection_not_an_object"] };
  const p = projection as ContributionAllocationProjection;
  const flagsFalse = p.fundingAvailabilityEvaluated === false && p.safetyBufferEvaluated === false && p.sourceAssetSelected === false && p.planGenerated === false && p.suggestionGenerated === false;
  if (!flagsFalse) errors.push("capability_flag_enabled");
  const expectedTotal = p.mode === "external_contribution" ? p.sourceTotalPortfolioValueUsd + p.amountUsd : p.sourceTotalPortfolioValueUsd;
  const expectedTarget = p.sourceTargetValueUsd + p.amountUsd;
  if (Math.abs(p.projectedTotalPortfolioValueUsd - expectedTotal) > 1e-6) errors.push("projected_total_mismatch");
  if (Math.abs(p.projectedTargetValueUsd - expectedTarget) > 1e-6) errors.push("projected_target_mismatch");
  const expectedPct = expectedTotal > 0 ? (expectedTarget / expectedTotal) * 100 : 0;
  if (Math.abs(p.projectedTargetPct - expectedPct) > 1e-6) errors.push("projected_pct_mismatch");
  if (p.withinTargetWithoutOvershoot === p.wouldOvershootTarget) errors.push("overshoot_flags_inconsistent");
  return { valid: errors.length === 0, errors };
}

export function validateContributionTargetAllocationGapResult(result: unknown): GapValidationResult {
  const errors: string[] = [];
  if (!result || typeof result !== "object") return { valid: false, errors: ["result_not_an_object"] };
  const r = result as ContributionTargetAllocationGapResult;
  const flagsFalse = r.fundingSourceEvaluated === false && r.fundingAvailabilityEvaluated === false && r.safetyBufferEvaluated === false && r.contributionFrequencyApplied === false && r.contributionAmountCalculated === false && r.targetSelected === false && r.planGenerated === false && r.suggestionGenerated === false && r.transactionsEnabled === false && r.walletSignatureRequired === false;
  if (!flagsFalse) errors.push("capability_flag_enabled");
  if (r.underweightTriggerPercentagePoints !== UNDERWEIGHT_TRIGGER) errors.push("wrong_underweight_trigger");

  if (finiteNum(r.currentPct) && finiteNum(r.targetPct) && finiteNum(r.totalPortfolioValueUsd) && r.totalPortfolioValueUsd > 0) {
    const expectedCurrentPct = (r.currentValueUsd / r.totalPortfolioValueUsd) * 100;
    if (Math.abs((r.currentPct as number) - expectedCurrentPct) > 1e-6) errors.push("current_pct_mismatch");
    const cls = classifyContributionAllocationGap(r.currentPct, r.targetPct);
    if (cls.classification !== r.classification) errors.push("classification_mismatch");
    if (cls.underweightTriggerMet !== r.underweightTriggerMet) errors.push("trigger_mismatch");
    const expectedStatic = (r.totalPortfolioValueUsd * r.targetPct) / 100;
    if (finiteNum(r.staticTargetValueAtCurrentTotalUsd) && Math.abs((r.staticTargetValueAtCurrentTotalUsd as number) - expectedStatic) > 1e-6) errors.push("static_target_mismatch");
    if (cls.underweight && finiteNum(r.internalReallocationUsdToReachTarget)) {
      if (Math.abs((r.internalReallocationUsdToReachTarget as number) - (expectedStatic - r.currentValueUsd)) > 1e-6) errors.push("internal_reallocation_mismatch");
    }
    if (cls.underweight && finiteNum(r.externalContributionUsdToReachTarget) && (r.externalContributionUsdToReachTarget as number) > 0) {
      const ext = r.externalContributionUsdToReachTarget as number;
      const projPct = ((r.currentValueUsd + ext) / (r.totalPortfolioValueUsd + ext)) * 100;
      if (Math.abs(projPct - r.targetPct) > 1e-6) errors.push("external_contribution_mismatch");
    }
    if (cls.overweight && finiteNum(r.currentOverweightUsdAtCurrentTotal) && Math.abs((r.currentOverweightUsdAtCurrentTotal as number) - (r.currentValueUsd - expectedStatic)) > 1e-6) errors.push("overweight_value_mismatch");
  }

  // Eligibility may be true only for a currently enabled growth target that is policy-ready.
  if (r.eligibleForFutureGrowthContributionEvaluation) {
    if (!isEnabledGrowthContributionTarget(r.targetId)) errors.push("non_growth_target_marked_eligible");
    if (!r.contributionTargetPolicyReady) errors.push("eligible_without_policy_ready");
    if (r.blockers.includes("contribution_target_policy_not_ready")) errors.push("eligible_with_blocker");
  }
  if (r.hypotheticalProjection) {
    const pv = validateContributionAllocationProjection(r.hypotheticalProjection);
    if (!pv.valid) errors.push(...pv.errors.map((e) => `projection_${e}`));
  }
  return { valid: errors.length === 0, errors };
}

export function validateContributionAllocationGapAnalysisResult(result: unknown): GapValidationResult {
  const errors: string[] = [];
  if (!result || typeof result !== "object") return { valid: false, errors: ["result_not_an_object"] };
  const r = result as ContributionAllocationGapAnalysisResult;
  if (r.schemaVersion !== CONTRIBUTION_ALLOCATION_GAP_SCHEMA_VERSION) errors.push("wrong_schema_version");
  if (r.policyId !== CONTRIBUTION_ALLOCATION_GAP_POLICY_ID) errors.push("wrong_policy_id");
  if (r.policyVersion !== CONTRIBUTION_ALLOCATION_GAP_POLICY_VERSION) errors.push("wrong_policy_version");
  const flagsFalse = r.fundingSourceEvaluated === false && r.fundingAvailabilityEvaluated === false && r.safetyBufferEvaluated === false && r.contributionFrequencyApplied === false && r.contributionPriorityEvaluated === false && r.contributionAmountCalculated === false && r.targetSelected === false && r.dcaPlanGenerated === false && r.suggestionGenerated === false && r.updatesProductOutput === false && r.transactionsEnabled === false && r.walletSignatureRequired === false;
  if (!flagsFalse) errors.push("capability_flag_enabled");

  if (r.status === "empty_portfolio") {
    if (!r.emptyPortfolio) errors.push("empty_without_flag");
    if (r.currentAllocationCalculated) errors.push("empty_portfolio_marked_calculated");
    if (!r.blockers.includes("empty_portfolio_requires_initial_allocation_plan")) errors.push("empty_without_blocker");
  }
  if (r.status === "invalid_input" && r.blockers.length === 0) errors.push("invalid_without_blocker");

  if (r.status === "complete" || r.status === "blocked_policy_readiness") {
    // Denominator reconciliation.
    if (finiteNum(r.totalPortfolioValueUsd) && finiteNum(r.mappedTargetValueUsd) && finiteNum(r.registeredNonTargetValueUsd) && finiteNum(r.unmappedOtherValueUsd)) {
      const sum = (r.mappedTargetValueUsd as number) + (r.registeredNonTargetValueUsd as number) + (r.unmappedOtherValueUsd as number);
      if (Math.abs(sum - (r.totalPortfolioValueUsd as number)) > 1e-6) errors.push("denominator_does_not_reconcile");
      if ((r.unmappedOtherValueUsd as number) < -VAL_TOL) errors.push("unmapped_other_negative");
    }
    // Aggregate arrays must match target-result order + classification.
    const uw = r.targetResults.filter((t) => t.classification === "underweight_trigger_met" || t.classification === "underweight_below_trigger").map((t) => t.targetId);
    const trig = r.targetResults.filter((t) => t.classification === "underweight_trigger_met").map((t) => t.targetId);
    const ow = r.targetResults.filter((t) => t.classification === "overweight").map((t) => t.targetId);
    const at = r.targetResults.filter((t) => t.classification === "at_target").map((t) => t.targetId);
    if (r.underweightTargetIds.join(",") !== uw.join(",")) errors.push("underweight_ids_mismatch");
    if (r.triggerMetTargetIds.join(",") !== trig.join(",")) errors.push("trigger_ids_mismatch");
    if (r.overweightTargetIds.join(",") !== ow.join(",")) errors.push("overweight_ids_mismatch");
    if (r.atTargetIds.join(",") !== at.join(",")) errors.push("at_target_ids_mismatch");
    for (const t of r.targetResults) {
      const tv = validateContributionTargetAllocationGapResult(t);
      if (!tv.valid) errors.push(`target_${t.targetId}:${tv.errors.join("/")}`);
    }
    if (r.status === "blocked_policy_readiness" && !r.blockers.includes("contribution_target_policy_not_ready")) errors.push("blocked_readiness_without_blocker");
  }
  return { valid: errors.length === 0, errors };
}

/* ------------------------------------------------------------------ *
 * Engine entry point.
 * ------------------------------------------------------------------ */
export function buildContributionAllocationGapAnalysis(input: BuildContributionAllocationGapAnalysisInput): ContributionAllocationGapAnalysisResult {
  const generatedAt = input?.generatedAt ?? "";
  const checkedAt = input?.checkedAt ?? "";
  const fail = (blockers: ContributionAllocationGapBlocker[], extra: Partial<ContributionAllocationGapAnalysisResult> = {}) =>
    baseAnalysis(generatedAt, checkedAt, "invalid_input", { blockers, ...extra });

  if (!input || typeof input !== "object" || !input.snapshot) return fail(["portfolio_snapshot_missing"]);

  // Validate the Step 15C target-allocation policy.
  const alloc = input.targetAllocationResult;
  if (!alloc || typeof alloc !== "object") return fail(["allocation_policy_missing"]);
  if (alloc.status !== "configured") return fail(["allocation_policy_not_configured"]);
  if (!validateGrowthTargetAllocationPolicyResult(alloc).valid) return fail(["allocation_policy_invalid"]);

  const policyMap = alloc.targetPctByInvestmentTargetId ?? {};
  const targetIds = Object.keys(policyMap);
  if (targetIds.length === 0) return fail(["allocation_policy_not_configured"]);
  for (const id of targetIds) {
    const pct = policyMap[id];
    if (!finiteNum(pct) || pct < 0 || pct > 100) return fail(["target_percentage_invalid"]);
  }
  const mappedTargetPctTotal = targetIds.reduce((s, id) => s + policyMap[id], 0);
  if (Math.abs(mappedTargetPctTotal - 100) > PCT_TOL) return fail(["target_percentages_do_not_total_100"]);

  // Validate the snapshot.
  const snap = input.snapshot;
  const sv = validateContributionPortfolioAllocationSnapshot(snap);
  if (!sv.valid) {
    const known: ContributionAllocationGapBlocker[] = ["portfolio_snapshot_missing", "portfolio_total_missing", "portfolio_total_invalid", "portfolio_total_negative", "portfolio_snapshot_stale", "target_values_missing", "duplicate_target_value", "target_value_invalid", "target_value_negative", "target_value_exceeds_portfolio"];
    const blockers = sv.errors.filter((e): e is ContributionAllocationGapBlocker => (known as string[]).includes(e));
    return fail(blockers.length ? [...new Set(blockers)] : ["portfolio_total_invalid"]);
  }

  const P = snap.totalPortfolioValueUsd;

  // Every exposure must reference a REGISTERED target (unknown assets stay in the denominator with
  // no exposure entry — they are never smuggled in as a target).
  for (const e of snap.targetExposures) {
    if (!getInvestmentTarget(e.targetId)) return fail(["unknown_target"]);
  }

  // Empty portfolio: no division, no invented allocation.
  if (Math.abs(P) <= VAL_TOL) {
    return baseAnalysis(generatedAt, checkedAt, "empty_portfolio", {
      sourceSnapshotId: snap.snapshotId,
      sourcePortfolioVersion: snap.sourcePortfolioVersion,
      sourceAllocationPolicyId: alloc.policyId,
      sourceAllocationPolicyVersion: alloc.policyVersion,
      totalPortfolioValueUsd: 0,
      emptyPortfolio: true,
      currentAllocationCalculated: false,
      blockers: ["empty_portfolio_requires_initial_allocation_plan"],
      notes: ["A later initial-contribution planner may split a NEW contribution across the target percentages. Step 15D does not invent that allocation."],
    });
  }

  const exposureByTarget = new Map<string, ContributionPortfolioTargetExposure>();
  for (const e of snap.targetExposures) exposureByTarget.set(e.targetId, e);

  // Denominator decomposition — all non-target and unknown value stays in the total.
  let mappedTargetValueUsd = 0;
  let registeredNonTargetValueUsd = 0;
  for (const e of snap.targetExposures) {
    if (Object.prototype.hasOwnProperty.call(policyMap, e.targetId)) mappedTargetValueUsd += e.valueUsd;
    else registeredNonTargetValueUsd += e.valueUsd;
  }
  let unmappedOtherValueUsd = P - mappedTargetValueUsd - registeredNonTargetValueUsd;
  if (unmappedOtherValueUsd < -VAL_TOL) return fail(["target_values_exceed_portfolio"]);
  if (unmappedOtherValueUsd < 0) unmappedOtherValueUsd = 0; // clamp tiny floating error

  const policyElig = input.policyEligibilityByTargetId ?? {};

  // Per-target results IN ALLOCATION-POLICY ORDER (no ranking, no sorting).
  const targetResults = targetIds.map((id) => {
    const registryTarget = getInvestmentTarget(id);
    const assetId = exposureByTarget.get(id)?.assetId ?? registryTarget?.assetId ?? id;
    return computeTargetResult(id, assetId, exposureByTarget.get(id), P, policyMap[id], policyElig[id]);
  });

  // Optional hypothetical projections (explicit only).
  let hypotheticalInvalid: ContributionAllocationGapBlocker | undefined;
  for (const h of input.hypotheticalInputs ?? []) {
    const target = targetResults.find((t) => t.targetId === h.targetId);
    if (!target) {
      hypotheticalInvalid = "unknown_target";
      continue;
    }
    const proj = projectContributionAllocationAfterHypotheticalIncrease(target, h);
    if (proj.valid && proj.projection) target.hypotheticalProjection = proj.projection;
    else {
      hypotheticalInvalid = proj.blockers[0] ?? "hypothetical_amount_invalid";
      target.blockers.push(...proj.blockers);
    }
  }
  if (hypotheticalInvalid) {
    return baseAnalysis(generatedAt, checkedAt, "invalid_input", {
      sourceSnapshotId: snap.snapshotId,
      totalPortfolioValueUsd: P,
      targetResults,
      blockers: [hypotheticalInvalid],
    });
  }

  // Aggregate arrays preserve target-result order.
  const underweightTargetIds: string[] = [];
  const triggerMetTargetIds: string[] = [];
  const overweightTargetIds: string[] = [];
  const atTargetIds: string[] = [];
  let readinessBlocked = false;
  for (const t of targetResults) {
    if (t.classification === "underweight_trigger_met" || t.classification === "underweight_below_trigger") underweightTargetIds.push(t.targetId);
    if (t.classification === "underweight_trigger_met") triggerMetTargetIds.push(t.targetId);
    if (t.classification === "overweight") overweightTargetIds.push(t.targetId);
    if (t.classification === "at_target") atTargetIds.push(t.targetId);
    if (t.blockers.includes("contribution_target_policy_not_ready")) readinessBlocked = true;
  }

  const status: ContributionAllocationGapAnalysisStatus = readinessBlocked ? "blocked_policy_readiness" : "complete";

  return baseAnalysis(generatedAt, checkedAt, status, {
    sourceSnapshotId: snap.snapshotId,
    sourcePortfolioVersion: snap.sourcePortfolioVersion,
    sourceAllocationPolicyId: alloc.policyId,
    sourceAllocationPolicyVersion: alloc.policyVersion,
    totalPortfolioValueUsd: P,
    mappedTargetValueUsd,
    registeredNonTargetValueUsd,
    unmappedOtherValueUsd,
    mappedTargetPctTotal,
    targetResults,
    underweightTargetIds,
    triggerMetTargetIds,
    overweightTargetIds,
    atTargetIds,
    emptyPortfolio: false,
    currentAllocationCalculated: true,
    ...(readinessBlocked ? { blockers: ["contribution_target_policy_not_ready"] } : {}),
    notes: ["Mathematical allocation gaps and caps only. No available funding, Safety Buffer, funding source, contribution frequency, amount, plan, or suggestion is evaluated."],
  });
}
