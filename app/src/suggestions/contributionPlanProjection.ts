/**
 * contributionPlanProjection — Step 15G. Deterministic post-plan projections. External-contribution
 * and internal-reallocation projections REUSE the Step 15D helper
 * (`projectContributionAllocationAfterHypotheticalIncrease`) — no formula is re-derived. The Safety
 * Buffer projection is separate DOLLAR-FLOOR progress (not portfolio-percentage), capped at the
 * required buffer because no residual is routed. Full precision internally; no presentation rounding.
 */
import { projectContributionAllocationAfterHypotheticalIncrease } from "./contributionAllocationGapEngine";
import type { ContributionTargetAllocationGapResult } from "./contributionAllocationGapTypes";
import type { ContributionPlanProjectionPoint } from "./contributionPlanTypes";
import { CONTRIBUTION_ALLOCATION_PERCENTAGE_TOLERANCE as PCT_TOL } from "./contributionAllocationGapPolicy";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Safety Buffer dollar-floor projection: `projectedEligible = min(required, current + amount)`. */
export function buildSafetyBufferPlanProjection(currentEligibleBufferUsd: number, requiredBufferUsd: number, amountUsd: number): ContributionPlanProjectionPoint {
  const projectedEligibleBufferUsd = Math.min(requiredBufferUsd, currentEligibleBufferUsd + amountUsd);
  const projectedBufferShortfallUsd = Math.max(0, requiredBufferUsd - projectedEligibleBufferUsd);
  return {
    amountCents: Math.round(amountUsd * 100),
    amountUsd,
    sourceEligibleBufferUsd: currentEligibleBufferUsd,
    projectedEligibleBufferUsd,
    requiredBufferUsd,
    projectedBufferShortfallUsd,
    // New contribution money never reduces the buffer; the plan routes no amount above the shortfall.
    safetyBufferPreserved: true,
    wouldOvershootTarget: false,
  };
}

/** External-contribution allocation projection (total grows), reusing the Step 15D helper. */
export function buildExternalContributionPlanProjection(gap: ContributionTargetAllocationGapResult, amountUsd: number): ContributionPlanProjectionPoint | null {
  const r = projectContributionAllocationAfterHypotheticalIncrease({ currentValueUsd: gap.currentValueUsd, totalPortfolioValueUsd: gap.totalPortfolioValueUsd, targetPct: gap.targetPct }, { targetId: gap.targetId, mode: "external_contribution", amountUsd });
  if (!r.valid || !r.projection) return null;
  const p = r.projection;
  return {
    amountCents: Math.round(amountUsd * 100),
    amountUsd,
    sourceTotalPortfolioValueUsd: p.sourceTotalPortfolioValueUsd,
    projectedTotalPortfolioValueUsd: p.projectedTotalPortfolioValueUsd,
    sourceTargetValueUsd: p.sourceTargetValueUsd,
    projectedTargetValueUsd: p.projectedTargetValueUsd,
    sourceTargetPct: p.sourceTargetPct,
    projectedTargetPct: p.projectedTargetPct,
    targetPct: p.targetPct,
    projectedGapPercentagePoints: p.projectedGapPercentagePoints,
    wouldOvershootTarget: p.wouldOvershootTarget,
    safetyBufferPreserved: true,
  };
}

/** Internal-reallocation allocation projection (total constant), reusing the Step 15D helper. */
export function buildInternalReallocationPlanProjection(gap: ContributionTargetAllocationGapResult, amountUsd: number, safetyBufferPreserved: boolean): ContributionPlanProjectionPoint | null {
  const r = projectContributionAllocationAfterHypotheticalIncrease({ currentValueUsd: gap.currentValueUsd, totalPortfolioValueUsd: gap.totalPortfolioValueUsd, targetPct: gap.targetPct }, { targetId: gap.targetId, mode: "internal_reallocation", amountUsd });
  if (!r.valid || !r.projection) return null;
  const p = r.projection;
  return {
    amountCents: Math.round(amountUsd * 100),
    amountUsd,
    sourceTotalPortfolioValueUsd: p.sourceTotalPortfolioValueUsd,
    projectedTotalPortfolioValueUsd: p.projectedTotalPortfolioValueUsd,
    sourceTargetValueUsd: p.sourceTargetValueUsd,
    projectedTargetValueUsd: p.projectedTargetValueUsd,
    sourceTargetPct: p.sourceTargetPct,
    projectedTargetPct: p.projectedTargetPct,
    targetPct: p.targetPct,
    projectedGapPercentagePoints: p.projectedGapPercentagePoints,
    wouldOvershootTarget: p.wouldOvershootTarget,
    safetyBufferPreserved,
  };
}

export interface PlanProjectionValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateContributionPlanProjectionPoint(point: unknown, mode: "external" | "internal" | "safety_buffer"): PlanProjectionValidationResult {
  const errors: string[] = [];
  if (!point || typeof point !== "object") return { valid: false, errors: ["point_not_an_object"] };
  const p = point as ContributionPlanProjectionPoint;
  const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

  if (mode === "safety_buffer") {
    if (!finite(p.sourceEligibleBufferUsd) || !finite(p.requiredBufferUsd) || !finite(p.projectedEligibleBufferUsd)) errors.push("safety_buffer_projection_invalid");
    else {
      const expected = Math.min(p.requiredBufferUsd as number, (p.sourceEligibleBufferUsd as number) + p.amountUsd);
      if (Math.abs((p.projectedEligibleBufferUsd as number) - expected) > 1e-6) errors.push("safety_buffer_projection_mismatch");
      if ((p.projectedEligibleBufferUsd as number) + 1e-9 < (p.sourceEligibleBufferUsd as number)) errors.push("safety_buffer_not_preserved");
      // Safety Buffer projection must be dollar-floor progress, not allocation percentage.
      if (p.projectedTargetPct != null) errors.push("safety_buffer_uses_allocation_percentage");
    }
    if (p.safetyBufferPreserved !== true) errors.push("safety_buffer_not_preserved");
    return { valid: errors.length === 0, errors };
  }

  // Allocation projections.
  if (!finite(p.sourceTotalPortfolioValueUsd) || !finite(p.projectedTotalPortfolioValueUsd) || !finite(p.projectedTargetPct) || !finite(p.targetPct)) errors.push("projection_invalid");
  else {
    if (mode === "external") {
      if (Math.abs((p.projectedTotalPortfolioValueUsd as number) - ((p.sourceTotalPortfolioValueUsd as number) + p.amountUsd)) > 1e-6) errors.push("external_projection_preserves_denominator");
    } else {
      if (Math.abs((p.projectedTotalPortfolioValueUsd as number) - (p.sourceTotalPortfolioValueUsd as number)) > 1e-6) errors.push("internal_projection_grows_denominator");
    }
    if ((p.projectedTargetPct as number) > (p.targetPct as number) + PCT_TOL) errors.push("projection_overshoots_target");
    if (p.wouldOvershootTarget) errors.push("projection_overshoots_target");
  }
  return { valid: errors.length === 0, errors };
}

/** Deterministic diagnostic value (rounded for display only). */
export const round2ForDisplay = round2;
