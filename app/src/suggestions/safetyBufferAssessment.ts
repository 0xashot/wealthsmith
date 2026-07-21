/**
 * safetyBufferAssessment — Step 21B. The canonical, NON-MOUNTED projection of the existing Safety Buffer
 * coverage (walletSummary.deriveSafetyBuffer → wallet/safetyBufferCoverage.computeSafetyBufferCoverage) into an
 * honest readiness model. It emits NO suggestion and is not wired into the engine/rail (mounting is Step 21C).
 *
 * It changes NO methodology: it does not re-run stable-asset identity, verified-liquidity classification, or the
 * interval reasoning — it consumes the canonical `SafetyBufferCoverage` result and the risk-based target
 * (`monthlyExpensesUsd × targetMonths`) as given. Its only job is to make the audit's two P0 honesty facts
 * explicit and structured:
 *   1. an UNRESOLVED coverage state has NO proven shortfall (recognized-but-unresolved stable value might close
 *      the target) — `verifiedOnly` shortfall is only the WORST case, never "the shortfall";
 *   2. the target, verified minimum, maximum-possible coverage, proven-minimum vs worst-case shortfall,
 *      below-$50 semantics, and contribution context are separate, non-ambiguous fields.
 *
 * Existing canonical coverage remains the single source of truth for identity + liquidity + interval state.
 */
import type { SafetyBufferCoverage, SafetyBufferCoverageState } from "../wallet/safetyBufferCoverage";
import { MIN_SUGGESTION_AMOUNT_USD } from "./engineThresholds";

export const SAFETY_BUFFER_ASSESSMENT_VERSION = "safety_buffer_assessment_1.0.0";

/** Whether the risk-based target could be derived (and why not). */
export type SbTargetState =
  | "available"
  | "unavailable_missing_risk"
  | "unavailable_missing_expenses"
  | "unavailable_invalid_expenses"
  | "unavailable_invalid_target_months"
  | "unresolved";

/** Confidence in the coverage classification (interval reasoning), never re-derived here. */
export type SbCoverageConfidence =
  | "verified_complete"
  | "verified_incomplete"
  | "unresolved_may_be_complete"
  | "unresolved_unknown_magnitude"
  | "unavailable";

export type SbGateState = "allowed" | "blocked" | "unresolved";
export type SbReadiness = "allowed" | "blocked" | "unresolved";

/** Deterministic assessment-level state (NOT a card; the 21C mapper decides which become cards). */
export type SbPresentationState =
  | "complete"
  | "definite_shortfall"
  | "definite_shortfall_below_minimum"
  | "coverage_unresolved"
  | "target_unavailable"
  | "coverage_unavailable";

/** Future display modes (not mounted in 21B). */
export type SbDisplayMode =
  | "none"
  | "generic_definite_shortfall"
  | "plan_backed_definite_shortfall"
  | "informational_below_minimum"
  | "informational_unresolved_coverage"
  | "informational_target_unavailable";

export type SbContributionPlanState = "none" | "ready" | "partial" | "not_ready" | "unavailable";

/** Normalized, optional contribution-plan context. The buffer allocation engine is NOT invoked here. */
export interface SafetyBufferContributionPlanInput {
  planIsReady: boolean;
  planIsRange: boolean;
  /** The point (exact) planned contribution, or the range max when a range. */
  plannedContributionUsd?: number | null;
  plannedContributionMinUsd?: number | null;
  plannedContributionMaxUsd?: number | null;
  cadence?: string | null;
}

export interface SafetyBufferAssessmentInput {
  /** The canonical coverage result (already derived; positions are NOT re-classified here). */
  coverage: SafetyBufferCoverage | null;
  monthlyExpensesUsd: number | null;
  targetMonths: number | null;
  contributionPlan?: SafetyBufferContributionPlanInput | null;
  generatedAt?: number;
  methodologyVersion?: string;
}

export interface SafetyBufferContributionAssessment {
  contributionPlanState: SbContributionPlanState;
  presentationMode: SbDisplayMode;
  plannedContributionUsd: number | null;
  plannedContributionMinUsd: number | null;
  plannedContributionMaxUsd: number | null;
  cadence: string | null;
  planIsRange: boolean;
  planIsReady: boolean;
  planIsPartial: boolean;
  /** Only meaningful when a PROVEN shortfall exists (incomplete). Never claims completion for unresolved coverage. */
  planCouldFullyCoverProvenShortfall: boolean;
  remainingProvenShortfallAfterPlanUsd: number | null;
  remainingVerifiedOnlyShortfallAfterPlanUsd: number | null;
  contributionWarnings: string[];
}

export interface SafetyBufferAssessment {
  // ---- Target ----
  monthlyExpensesUsd: number | null;
  targetMonths: number | null;
  targetUsd: number | null;
  targetState: SbTargetState;
  // ---- Canonical coverage projection (NOT reclassified) ----
  verifiedLiquidStableValueUsd: number | null;
  unresolvedStableValueUsd: number | null;
  maximumPossibleCoverageUsd: number | null;
  maximumCoverageIsOpen: boolean;
  coverageState: SafetyBufferCoverageState | null;
  fullyFunded: boolean;
  coveragePctVerified: number | null;
  monthsCoveredVerified: number | null;
  monthsCoveredMaximum: number | null;
  observedAt: string | null;
  // ---- Shortfall as an explicit range (never one ambiguous "possibleShortfall") ----
  verifiedOnlyShortfallUsd: number | null;
  provenMinimumShortfallUsd: number | null;
  maximumPossibleShortfallUsd: number | null;
  shortfallRangeUsd: { minimum: number; maximum: number; maximumIsOpen: boolean } | null;
  // ---- Confidence + gates ----
  coverageConfidence: SbCoverageConfidence;
  targetGate: SbGateState;
  coverageGate: SbGateState;
  coverageConfidenceGate: SbGateState;
  contributionGate: SbGateState;
  reviewConfidenceGate: SbGateState;
  overallReadiness: SbReadiness;
  // ---- Presentation (assessment-level, not a card) ----
  presentationState: SbPresentationState;
  displayMode: SbDisplayMode;
  belowMinimum: boolean;
  minimumReviewAmountUsd: number;
  // ---- Contribution context ----
  contribution: SafetyBufferContributionAssessment;
  // ---- Meta ----
  blockingReasons: string[];
  warnings: string[];
  evaluatedDimensions: string[];
  unresolvedDimensions: string[];
  generatedAt: number;
  methodologyVersion: string;
}

const isFiniteNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const round2 = (n: number): number => Math.round(n * 100) / 100;

function emptyContribution(state: SbContributionPlanState): SafetyBufferContributionAssessment {
  return {
    contributionPlanState: state,
    presentationMode: "none",
    plannedContributionUsd: null,
    plannedContributionMinUsd: null,
    plannedContributionMaxUsd: null,
    cadence: null,
    planIsRange: false,
    planIsReady: false,
    planIsPartial: false,
    planCouldFullyCoverProvenShortfall: false,
    remainingProvenShortfallAfterPlanUsd: null,
    remainingVerifiedOnlyShortfallAfterPlanUsd: null,
    contributionWarnings: [],
  };
}

/**
 * Derive the canonical, non-mounted Safety Buffer assessment. Pure and deterministic. Emits no suggestion.
 */
export function deriveSafetyBufferAssessment(input: SafetyBufferAssessmentInput): SafetyBufferAssessment {
  const generatedAt = input.generatedAt ?? 0;
  const methodologyVersion = input.methodologyVersion ?? SAFETY_BUFFER_ASSESSMENT_VERSION;
  const minAmount = MIN_SUGGESTION_AMOUNT_USD;
  const blockingReasons: string[] = [];
  const warnings: string[] = [];
  const evaluatedDimensions: string[] = [];
  const unresolvedDimensions: string[] = [];

  const expenses = input.monthlyExpensesUsd;
  const targetMonths = input.targetMonths;

  // ---- Target availability (never invents a target; never defaults risk; no pre-rounding). ----
  let targetState: SbTargetState;
  let targetUsd: number | null = null;
  if (expenses == null) targetState = "unavailable_missing_expenses";
  else if (!isFiniteNum(expenses) || expenses <= 0) targetState = "unavailable_invalid_expenses";
  else if (targetMonths == null || !isFiniteNum(targetMonths) || targetMonths <= 0) targetState = "unavailable_invalid_target_months";
  else {
    targetState = "available";
    targetUsd = expenses * targetMonths; // no rounding before the multiplication or the shortfall math
  }
  evaluatedDimensions.push("target");

  const targetGate: SbGateState = targetState === "available" ? "allowed" : "blocked";

  const base = {
    monthlyExpensesUsd: expenses ?? null,
    targetMonths: targetMonths ?? null,
    targetUsd,
    targetState,
    verifiedLiquidStableValueUsd: null as number | null,
    unresolvedStableValueUsd: null as number | null,
    maximumPossibleCoverageUsd: null as number | null,
    maximumCoverageIsOpen: false,
    coverageState: null as SafetyBufferCoverageState | null,
    fullyFunded: false,
    coveragePctVerified: null as number | null,
    monthsCoveredVerified: null as number | null,
    monthsCoveredMaximum: null as number | null,
    observedAt: null as string | null,
    verifiedOnlyShortfallUsd: null as number | null,
    provenMinimumShortfallUsd: null as number | null,
    maximumPossibleShortfallUsd: null as number | null,
    shortfallRangeUsd: null as SafetyBufferAssessment["shortfallRangeUsd"],
    targetGate,
    minimumReviewAmountUsd: minAmount,
    generatedAt,
    methodologyVersion,
  };

  // ---- Target unavailable → no financial amount, no coverage math. ----
  if (targetState !== "available") {
    blockingReasons.push(`target_${targetState.replace("unavailable_", "")}`);
    unresolvedDimensions.push("target");
    return {
      ...base,
      coverageConfidence: "unavailable",
      coverageGate: "blocked",
      coverageConfidenceGate: "blocked",
      contributionGate: "blocked",
      reviewConfidenceGate: "blocked",
      overallReadiness: "blocked",
      presentationState: "target_unavailable",
      displayMode: "informational_target_unavailable",
      belowMinimum: false,
      contribution: emptyContribution("unavailable"),
      blockingReasons,
      warnings,
      evaluatedDimensions,
      unresolvedDimensions,
    };
  }

  // ---- Coverage authoritative? ----
  const coverage = input.coverage;
  if (coverage == null) {
    blockingReasons.push("coverage_unavailable");
    unresolvedDimensions.push("coverage");
    return {
      ...base,
      coverageConfidence: "unavailable",
      coverageGate: "unresolved",
      coverageConfidenceGate: "blocked",
      contributionGate: "blocked",
      reviewConfidenceGate: "unresolved",
      overallReadiness: "unresolved",
      presentationState: "coverage_unavailable",
      displayMode: "none",
      belowMinimum: false,
      contribution: emptyContribution("unavailable"),
      blockingReasons,
      warnings,
      evaluatedDimensions,
      unresolvedDimensions,
    };
  }

  // ---- Project canonical coverage (no reclassification). ----
  const verified = coverage.verifiedLiquidStableValueUsd;
  const unresolved = coverage.unresolvedStableValueUsd;
  const unknownMagnitude = coverage.hasUnknownUnresolvedMagnitude === true;
  const coverageState = coverage.coverageState;
  const fullyFunded = coverage.fullyFunded === true;
  const t = targetUsd as number;
  evaluatedDimensions.push("verified_liquid_coverage", "unresolved_coverage", "shortfall_range");

  // Canonical coverage was computed against coverage.requiredBufferUsd; surface a warning if the assessment's
  // risk-based target disagrees (they are identical on the mounted path — same target passed to both).
  if (isFiniteNum(coverage.requiredBufferUsd) && Math.abs(coverage.requiredBufferUsd - t) > 1e-6) {
    warnings.push("target_coverage_requiredBuffer_mismatch");
  }

  const maximumCoverageIsOpen = unknownMagnitude;
  const maximumPossibleCoverageUsd = maximumCoverageIsOpen ? null : round2(verified + unresolved);
  const coveragePctVerified = t > 0 ? Math.min(100, (verified / t) * 100) : null;
  const monthsCoveredVerified = isFiniteNum(expenses) && (expenses as number) > 0 ? verified / (expenses as number) : null;
  const monthsCoveredMaximum = maximumCoverageIsOpen
    ? null
    : isFiniteNum(expenses) && (expenses as number) > 0
      ? (verified + unresolved) / (expenses as number)
      : null;

  // Shortfall range. verifiedOnly = worst case (no unresolved usable); provenMinimum = definitely missing even
  // under the best supported case; when max coverage is open, nothing is definitely missing → provenMinimum = 0.
  const verifiedOnlyShortfallUsd = round2(Math.max(t - verified, 0));
  const provenMinimumShortfallUsd = maximumCoverageIsOpen
    ? 0
    : round2(Math.max(t - (verified + unresolved), 0));
  const maximumPossibleShortfallUsd = verifiedOnlyShortfallUsd; // worst case
  const shortfallRangeUsd = { minimum: provenMinimumShortfallUsd, maximum: verifiedOnlyShortfallUsd, maximumIsOpen: false };

  // ---- Coverage confidence + presentation state, driven by the CANONICAL coverageState (never re-derived). ----
  let coverageConfidence: SbCoverageConfidence;
  let presentationState: SbPresentationState;
  let displayMode: SbDisplayMode;
  let overallReadiness: SbReadiness;
  let coverageConfidenceGate: SbGateState;
  let belowMinimum = false;

  if (coverageState === "complete") {
    coverageConfidence = "verified_complete";
    presentationState = "complete";
    displayMode = "none";
    overallReadiness = "allowed";
    coverageConfidenceGate = "allowed";
  } else if (coverageState === "incomplete") {
    // Proven shortfall: definitely non-zero even under the best supported case.
    coverageConfidence = "verified_incomplete";
    belowMinimum = provenMinimumShortfallUsd > 0 && provenMinimumShortfallUsd < minAmount;
    presentationState = belowMinimum ? "definite_shortfall_below_minimum" : "definite_shortfall";
    const planReady = input.contributionPlan?.planIsReady === true;
    displayMode = belowMinimum
      ? "informational_below_minimum"
      : planReady
        ? "plan_backed_definite_shortfall"
        : "generic_definite_shortfall";
    overallReadiness = "allowed"; // a proven review amount (or a below-min informational state) exists
    coverageConfidenceGate = "allowed";
    if (belowMinimum) warnings.push("definite_shortfall_below_minimum");
  } else {
    // "unresolved": verified minimum below target, but unresolved value might close the gap.
    coverageConfidence = unknownMagnitude ? "unresolved_unknown_magnitude" : "unresolved_may_be_complete";
    presentationState = "coverage_unresolved";
    displayMode = "informational_unresolved_coverage";
    overallReadiness = "unresolved";
    coverageConfidenceGate = "unresolved";
    warnings.push("coverage_unresolved");
    if (unknownMagnitude) warnings.push("unresolved_unknown_magnitude");
    unresolvedDimensions.push("coverage_completion");
    if (unknownMagnitude) unresolvedDimensions.push("coverage_magnitude");
  }

  // ---- Contribution context (normalized; buffer allocation engine NOT invoked). ----
  const contribution = deriveContribution(input.contributionPlan ?? null, {
    coverageState,
    provenMinimumShortfallUsd,
    verifiedOnlyShortfallUsd,
    minAmount,
  });
  evaluatedDimensions.push("contribution_plan");

  // ---- Remaining gates. ----
  const coverageGate: SbGateState = "allowed"; // coverage authoritative (present + target available)
  const contributionGate: SbGateState =
    coverageState === "unresolved" ? "unresolved" : "allowed"; // never "required to close" for unresolved
  const reviewConfidenceGate: SbGateState =
    coverageState === "unresolved" ? "unresolved" : "allowed";

  return {
    ...base,
    verifiedLiquidStableValueUsd: verified,
    unresolvedStableValueUsd: unresolved,
    maximumPossibleCoverageUsd,
    maximumCoverageIsOpen,
    coverageState,
    fullyFunded,
    coveragePctVerified,
    monthsCoveredVerified,
    monthsCoveredMaximum,
    observedAt: null, // canonical coverage carries no observation timestamp
    verifiedOnlyShortfallUsd,
    provenMinimumShortfallUsd,
    maximumPossibleShortfallUsd,
    shortfallRangeUsd,
    coverageConfidence,
    coverageGate,
    coverageConfidenceGate,
    contributionGate,
    reviewConfidenceGate,
    overallReadiness,
    presentationState,
    displayMode,
    belowMinimum,
    contribution,
    blockingReasons,
    warnings,
    evaluatedDimensions,
    unresolvedDimensions,
  };
}

function deriveContribution(
  plan: SafetyBufferContributionPlanInput | null,
  ctx: { coverageState: SafetyBufferCoverageState; provenMinimumShortfallUsd: number; verifiedOnlyShortfallUsd: number; minAmount: number },
): SafetyBufferContributionAssessment {
  if (plan == null) return emptyContribution("none");

  const planned = isFiniteNum(plan.plannedContributionUsd)
    ? (plan.plannedContributionUsd as number)
    : isFiniteNum(plan.plannedContributionMaxUsd)
      ? (plan.plannedContributionMaxUsd as number)
      : null;
  const warningsC: string[] = [];

  // Complete → no contribution review required.
  if (ctx.coverageState === "complete") {
    return {
      ...emptyContribution(plan.planIsReady ? "ready" : "not_ready"),
      presentationMode: "none",
      plannedContributionUsd: planned,
      plannedContributionMinUsd: plan.plannedContributionMinUsd ?? null,
      plannedContributionMaxUsd: plan.plannedContributionMaxUsd ?? null,
      cadence: plan.cadence ?? null,
      planIsRange: plan.planIsRange === true,
      planIsReady: plan.planIsReady === true,
    };
  }

  // Unresolved → a plan may be retained as metadata but is never "required to close" or "completes" the buffer.
  if (ctx.coverageState === "unresolved") {
    warningsC.push("unresolved_coverage_plan_non_definite");
    return {
      contributionPlanState: plan.planIsReady ? "ready" : "not_ready",
      presentationMode: "informational_unresolved_coverage",
      plannedContributionUsd: planned,
      plannedContributionMinUsd: plan.plannedContributionMinUsd ?? null,
      plannedContributionMaxUsd: plan.plannedContributionMaxUsd ?? null,
      cadence: plan.cadence ?? null,
      planIsRange: plan.planIsRange === true,
      planIsReady: plan.planIsReady === true,
      planIsPartial: false,
      planCouldFullyCoverProvenShortfall: false, // no proven shortfall to cover
      remainingProvenShortfallAfterPlanUsd: null,
      remainingVerifiedOnlyShortfallAfterPlanUsd: planned != null ? round2(Math.max(ctx.verifiedOnlyShortfallUsd - planned, 0)) : null,
      contributionWarnings: warningsC,
    };
  }

  // Incomplete → a proven shortfall exists; assess the plan against the PROVEN shortfall.
  const provable = ctx.provenMinimumShortfallUsd;
  const planCouldFullyCoverProvenShortfall = planned != null && planned >= provable;
  const remainingProven = planned != null ? round2(Math.max(provable - planned, 0)) : null;
  const remainingVerifiedOnly = planned != null ? round2(Math.max(ctx.verifiedOnlyShortfallUsd - planned, 0)) : null;
  const planIsPartial = planned != null && planned < provable;
  if (planned != null && planned < ctx.minAmount) warningsC.push("planned_below_minimum");
  if (planned != null && planned > provable) warningsC.push("planned_exceeds_proven_shortfall");

  return {
    contributionPlanState: !plan.planIsReady ? "not_ready" : planIsPartial ? "partial" : "ready",
    presentationMode: plan.planIsReady ? "plan_backed_definite_shortfall" : "none",
    plannedContributionUsd: planned,
    plannedContributionMinUsd: plan.plannedContributionMinUsd ?? null,
    plannedContributionMaxUsd: plan.plannedContributionMaxUsd ?? null,
    cadence: plan.cadence ?? null,
    planIsRange: plan.planIsRange === true,
    planIsReady: plan.planIsReady === true,
    planIsPartial,
    planCouldFullyCoverProvenShortfall,
    remainingProvenShortfallAfterPlanUsd: remainingProven,
    remainingVerifiedOnlyShortfallAfterPlanUsd: remainingVerifiedOnly,
    contributionWarnings: warningsC,
  };
}
