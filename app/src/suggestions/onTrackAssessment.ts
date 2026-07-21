/**
 * onTrackAssessment — Step 21D. The canonical, NON-MOUNTED readiness model for the informational On Track
 * fallback. It emits NO suggestion and is not wired into the engine/rail (mounting + copy narrowing is Step 21E).
 *
 * It reuses canonical results ONLY — it never re-derives allocation, never re-runs Safety Buffer coverage, and
 * never treats "no emitted candidate" as proof of plan health. It answers a deliberately NARROW question: can
 * WealthSmith honestly say the Safety Buffer is verified complete AND the canonical crypto allocation is inside the
 * current ±10pp review range, over authoritative accounting, with no proven material Rebalance need and no visible
 * higher-priority suggestion? Every other financial-plan dimension (goal / savings / contribution pace / horizon /
 * yield / diversification / protocol risk / debt) is recorded as UNEVALUATED — never as "healthy".
 */
import type { SafetyBufferAssessment } from "./safetyBufferAssessment";
import { type RebalanceAssessment, isRebalanceMaterial } from "./rebalanceAssessment";
import type { PortfolioCompletenessResult } from "../wallet/portfolioCompleteness";
import { REBALANCE_DELTA_THRESHOLD_PCT } from "./engineThresholds";

export const ON_TRACK_ASSESSMENT_VERSION = "on_track_assessment_1.0.0";

export type OtGateState = "allowed" | "blocked" | "unresolved";
export type OtBufferState = "verified_complete" | "incomplete" | "unresolved" | "unavailable";
export type OtAllocationState = "within_review_range" | "material_drift" | "unresolved" | "unavailable";
export type OtAccountingState = "authoritative" | "unresolved" | "blocked";
export type OtCandidateSetState = "empty" | "nonempty" | "unresolved";
export type OtClaimScope = "safety_buffer_and_allocation" | "unavailable" | "unresolved";
export type OtClaimConfidence = "verified_narrow_scope" | "unresolved" | "unavailable";
export type OtFallbackState =
  | "eligible"
  | "blocked_visible_candidate"
  | "blocked_material_rebalance"
  | "blocked_buffer"
  | "blocked_allocation"
  | "blocked_accounting"
  | "unresolved"
  | "unavailable";
export type OtPresentationState =
  | "eligible_scoped_status"
  | "hidden_actionable_candidate_present"
  | "hidden_material_rebalance"
  | "buffer_not_complete"
  | "allocation_outside_range"
  | "accounting_unresolved"
  | "allocation_unresolved"
  | "target_unavailable"
  | "fallback_unavailable";
export type OtDisplayMode = "scoped_informational" | "none";
export type OtDimension = "safety_buffer" | "portfolio_allocation" | "portfolio_accounting" | "liabilities" | "candidate_visibility";
export type OtDimensionState = "satisfied" | "not_satisfied" | "unresolved" | "unavailable" | "not_evaluated";

/** A material (or potentially-material) signal from a suggestion category, kept separate from the claim truth. */
export interface OnTrackMaterialSignal {
  category: string;
  state: string;
  material: boolean;
  candidateAvailable: boolean;
  candidateVisible: boolean;
  suppressionReason: string | null;
  sourceAssessment: string;
  confidence: "proven" | "unproven" | "unsupported";
}

export interface OnTrackDimensionAssessment {
  dimension: OtDimension;
  state: OtDimensionState;
  evaluated: boolean;
  source: string;
  evidence: string[];
  blocking: boolean;
  warnings: string[];
}

export interface OnTrackCandidateContext {
  visibleCandidateCount: number;
  visibleActionableCandidateCount: number;
  visibleInformationalCandidateCount: number;
  hasHigherPriorityVisibleCandidate: boolean;
  materialSignals: OnTrackMaterialSignal[];
  suppressedMaterialSignals: OnTrackMaterialSignal[];
  filteredMaterialSignals: OnTrackMaterialSignal[];
  unresolvedPotentialSignals: OnTrackMaterialSignal[];
  candidateSetState: OtCandidateSetState;
}

export interface OnTrackAssessmentInput {
  /** The canonical Safety Buffer assessment (21C). Buffer completion is read from here, not a legacy `fullyFunded`. */
  safetyBufferAssessment: SafetyBufferAssessment | null;
  /** The canonical Rebalance assessment (18). Allocation + material-need are read from here, never re-derived. */
  rebalanceAssessment: RebalanceAssessment | null;
  /** The shared completeness result (liabilities / dedup / unknown-magnitude support the accounting dimension). */
  portfolioCompleteness?: PortfolioCompletenessResult | null;
  candidateContext: OnTrackCandidateContext;
  generatedAt?: number;
  methodologyVersion?: string;
}

/** Future copy recommendations (metadata only — NOT mounted in 21D; production copy is unchanged). */
export const ON_TRACK_RECOMMENDED_TITLE = "Your Safety Buffer and Allocation Are Within Range";
export const ON_TRACK_RECOMMENDED_DESCRIPTION =
  "Your Safety Buffer is fully funded, and your crypto allocation is within the current review range.";

/** The dimensions WealthSmith cannot currently evaluate — recorded as UNEVALUATED (never "healthy"/"failed"). */
export const ON_TRACK_UNEVALUATED_DIMENSIONS: readonly string[] = [
  "goal_progress",
  "savings_progress",
  "contribution_progress",
  "time_horizon_progress",
  "income_sustainability",
  "debt_ratio",
  "yield_performance",
  "APY_freshness",
  "protocol_risk",
  "diversification",
  "tax",
  "future_market_performance",
];

export interface OnTrackAssessment {
  // ---- Safety Buffer dimension (canonical) ----
  safetyBufferState: OtBufferState;
  bufferTargetMonths: number | null;
  verifiedBufferValueUsd: number | null;
  bufferTargetUsd: number | null;
  // ---- Allocation dimension (canonical Rebalance; never recomputed) ----
  allocationState: OtAllocationState;
  currentCryptoPct: number | null;
  targetCryptoPct: number | null;
  cryptoDeltaPct: number | null;
  absoluteCryptoDeltaPct: number | null;
  reviewThresholdPct: number;
  materialRebalanceNeed: boolean;
  allocationMethodologyVersion: string | null;
  // ---- Accounting ----
  accountingState: OtAccountingState;
  // ---- Candidate visibility (separate from claim truth) ----
  candidateSetState: OtCandidateSetState;
  visibleActionableCandidateCount: number;
  hasProvenHiddenMaterialSignal: boolean;
  // ---- Dimensions + scope ----
  dimensions: OnTrackDimensionAssessment[];
  evaluatedDimensions: OtDimension[];
  unevaluatedDimensions: string[];
  unresolvedDimensions: OtDimension[];
  claimScope: OtClaimScope;
  claimConfidence: OtClaimConfidence;
  // ---- Gates ----
  bufferGate: OtGateState;
  accountingGate: OtGateState;
  allocationGate: OtGateState;
  materialNeedGate: OtGateState;
  candidateVisibilityGate: OtGateState;
  claimConfidenceGate: OtGateState;
  fallbackEligibilityGate: OtGateState;
  overallReadiness: OtGateState;
  // ---- Fallback + presentation (not mounted) ----
  fallbackState: OtFallbackState;
  presentationState: OtPresentationState;
  displayMode: OtDisplayMode;
  // ---- Future copy recommendation (metadata) ----
  recommendedTitle: string;
  recommendedDescription: string;
  broadPlanHealthyClaimSafe: false;
  noChangesNeedReviewClaimSafe: false;
  // ---- Meta ----
  blockingReasons: string[];
  warnings: string[];
  generatedAt: number;
  methodologyVersion: string;
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Derive the canonical, non-mounted On Track readiness assessment. Pure + deterministic; emits no suggestion. */
export function deriveOnTrackAssessment(input: OnTrackAssessmentInput): OnTrackAssessment {
  const generatedAt = input.generatedAt ?? 0;
  const methodologyVersion = input.methodologyVersion ?? ON_TRACK_ASSESSMENT_VERSION;
  const reviewThresholdPct = REBALANCE_DELTA_THRESHOLD_PCT;
  const blockingReasons: string[] = [];
  const warnings: string[] = [];
  const cc = input.candidateContext;

  // ---- Safety Buffer dimension (canonical assessment; never a legacy fullyFunded object). ----
  const sb = input.safetyBufferAssessment;
  let safetyBufferState: OtBufferState;
  if (sb == null) safetyBufferState = "unavailable";
  else if (sb.presentationState === "complete") safetyBufferState = "verified_complete";
  else if (sb.presentationState === "definite_shortfall" || sb.presentationState === "definite_shortfall_below_minimum") safetyBufferState = "incomplete";
  else if (sb.presentationState === "coverage_unresolved" || sb.presentationState === "coverage_unavailable") safetyBufferState = "unresolved";
  else safetyBufferState = "unavailable"; // target_unavailable
  const bufferTargetUnavailable = sb != null && sb.presentationState === "target_unavailable";
  const bufferGate: OtGateState = safetyBufferState === "verified_complete" ? "allowed" : safetyBufferState === "unresolved" ? "unresolved" : "blocked";

  // ---- Allocation dimension (canonical Rebalance; NEVER recomputed from value/stable/net-worth). ----
  const ra = input.rebalanceAssessment;
  const currentCryptoPct = ra?.currentCryptoPct ?? null;
  const targetCryptoPct = ra?.targetCryptoPct ?? null;
  const cryptoDeltaPct = ra?.cryptoDeltaPct ?? null;
  const absoluteCryptoDeltaPct = isNum(cryptoDeltaPct) ? Math.abs(cryptoDeltaPct) : null;
  const materialRebalanceNeed = ra != null ? isRebalanceMaterial(ra) : false;
  const rebalanceCalcAllowed = ra != null && ra.calculationGate.status === "allowed";
  const allocationMethodologyVersion = ra?.methodologyVersion ?? null;

  let allocationState: OtAllocationState;
  if (ra == null || targetCryptoPct == null) allocationState = "unavailable";
  else if (!rebalanceCalcAllowed || cryptoDeltaPct == null) allocationState = "unresolved";
  else if (materialRebalanceNeed) allocationState = "material_drift";
  else allocationState = "within_review_range"; // calc allowed + |delta| < threshold (direction within_threshold)
  const allocationGate: OtGateState = allocationState === "within_review_range" ? "allowed" : allocationState === "unresolved" ? "unresolved" : "blocked";

  // ---- Accounting dimension (reuse the canonical Rebalance calculation gate; corroborate with completeness). ----
  const comp = input.portfolioCompleteness ?? null;
  const liabilitiesComplete = comp == null ? null : comp.liabilitiesState === "complete";
  const dedupInvalid = comp?.deduplicationState === "invalid";
  const unknownMagnitude = comp?.hasUnknownMagnitudeValue === true;
  let accountingState: OtAccountingState;
  if (ra == null) accountingState = "unresolved";
  else if (ra.calculationGate.status === "blocked" || dedupInvalid) accountingState = "blocked";
  else if (ra.calculationGate.status === "allowed" && liabilitiesComplete !== false && !unknownMagnitude) accountingState = "authoritative";
  else accountingState = "unresolved";
  const accountingGate: OtGateState = accountingState === "authoritative" ? "allowed" : accountingState === "blocked" ? "blocked" : "unresolved";

  // ---- Candidate visibility (separate from claim truth). ----
  const visibleActionableCandidateCount = cc.visibleActionableCandidateCount;
  const candidateVisibilityGate: OtGateState =
    cc.candidateSetState === "unresolved" ? "unresolved"
      : visibleActionableCandidateCount === 0 && !cc.hasHigherPriorityVisibleCandidate ? "allowed" : "blocked";

  // ---- Material need (canonical Rebalance is authoritative; hidden/suppressed/filtered proven signals also block). ----
  const contextProvenMaterial = [...cc.materialSignals, ...cc.suppressedMaterialSignals, ...cc.filteredMaterialSignals]
    .some((s) => s.material === true && s.confidence === "proven");
  const hasProvenHiddenMaterialSignal = contextProvenMaterial;
  const provenMaterial = materialRebalanceNeed || contextProvenMaterial;
  const materialNeedGate: OtGateState =
    cc.candidateSetState === "unresolved" ? "unresolved" : provenMaterial ? "blocked" : "allowed";

  // ---- Claim confidence: verified_narrow_scope only when buffer + accounting + allocation all pass. ----
  const claimConfidenceGate: OtGateState =
    bufferGate === "allowed" && accountingGate === "allowed" && allocationGate === "allowed" ? "allowed"
      : bufferGate === "blocked" || accountingGate === "blocked" || allocationGate === "blocked" ? "blocked" : "unresolved";
  const claimConfidence: OtClaimConfidence =
    claimConfidenceGate === "allowed" ? "verified_narrow_scope" : claimConfidenceGate === "unresolved" ? "unresolved" : "unavailable";

  // ---- Fallback eligibility. ----
  const allAllowed =
    bufferGate === "allowed" && accountingGate === "allowed" && allocationGate === "allowed" &&
    materialNeedGate === "allowed" && candidateVisibilityGate === "allowed" && claimConfidenceGate === "allowed";
  const anyUnresolved =
    bufferGate === "unresolved" || accountingGate === "unresolved" || allocationGate === "unresolved" ||
    materialNeedGate === "unresolved" || candidateVisibilityGate === "unresolved" || claimConfidenceGate === "unresolved";
  const fallbackEligibilityGate: OtGateState =
    allAllowed && visibleActionableCandidateCount === 0 && !materialRebalanceNeed && allocationState === "within_review_range"
      ? "allowed"
      : anyUnresolved ? "unresolved" : "blocked";
  const overallReadiness = fallbackEligibilityGate;

  // ---- Presentation state (precedence: visible candidate → material → buffer → allocation → accounting). ----
  let presentationState: OtPresentationState;
  let fallbackState: OtFallbackState;
  if (fallbackEligibilityGate === "allowed") {
    presentationState = "eligible_scoped_status"; fallbackState = "eligible";
  } else if (candidateVisibilityGate === "blocked") {
    presentationState = "hidden_actionable_candidate_present"; fallbackState = "blocked_visible_candidate"; blockingReasons.push("visible_actionable_candidate");
  } else if (materialNeedGate === "blocked") {
    presentationState = "hidden_material_rebalance"; fallbackState = "blocked_material_rebalance"; blockingReasons.push("material_rebalance_need");
  } else if (bufferTargetUnavailable) {
    presentationState = "target_unavailable"; fallbackState = "unavailable"; blockingReasons.push("buffer_target_unavailable");
  } else if (bufferGate !== "allowed") {
    // Not verified complete: incomplete/unavailable block; unresolved coverage is unresolved (never a false "on track").
    presentationState = "buffer_not_complete";
    fallbackState = bufferGate === "unresolved" ? "unresolved" : "blocked_buffer";
    blockingReasons.push("safety_buffer_not_verified_complete");
  } else if (allocationState === "material_drift") {
    presentationState = "allocation_outside_range"; fallbackState = "blocked_allocation"; blockingReasons.push("allocation_material_drift");
  } else if (allocationState === "unavailable") {
    presentationState = "target_unavailable"; fallbackState = "unavailable"; blockingReasons.push("target_allocation_unavailable");
  } else if (accountingGate === "unresolved") {
    presentationState = "accounting_unresolved"; fallbackState = "unresolved"; blockingReasons.push("accounting_unresolved");
  } else if (allocationGate === "unresolved") {
    presentationState = "allocation_unresolved"; fallbackState = "unresolved"; blockingReasons.push("allocation_unresolved");
  } else {
    presentationState = "fallback_unavailable"; fallbackState = "unavailable"; blockingReasons.push("fallback_unavailable");
  }
  const displayMode: OtDisplayMode = presentationState === "eligible_scoped_status" ? "scoped_informational" : "none";

  // ---- Claim scope. ----
  const claimScope: OtClaimScope =
    fallbackEligibilityGate === "allowed" ? "safety_buffer_and_allocation" : anyUnresolved ? "unresolved" : "unavailable";

  // ---- Dimensions. ----
  const dim = (dimension: OtDimension, state: OtDimensionState, evaluated: boolean, source: string, evidence: string[], blocking: boolean): OnTrackDimensionAssessment =>
    ({ dimension, state, evaluated, source, evidence, blocking, warnings: [] });
  const bufDimState: OtDimensionState = safetyBufferState === "verified_complete" ? "satisfied" : safetyBufferState === "unresolved" ? "unresolved" : safetyBufferState === "unavailable" ? "unavailable" : "not_satisfied";
  const allocDimState: OtDimensionState = allocationState === "within_review_range" ? "satisfied" : allocationState === "unresolved" ? "unresolved" : allocationState === "unavailable" ? "unavailable" : "not_satisfied";
  const acctDimState: OtDimensionState = accountingState === "authoritative" ? "satisfied" : accountingState === "unresolved" ? "unresolved" : "not_satisfied";
  const liabDimState: OtDimensionState = comp == null ? "not_evaluated" : liabilitiesComplete ? "satisfied" : comp.liabilitiesState === "unresolved" ? "unresolved" : "not_satisfied";
  const candDimState: OtDimensionState = candidateVisibilityGate === "allowed" ? "satisfied" : candidateVisibilityGate === "unresolved" ? "unresolved" : "not_satisfied";
  const dimensions: OnTrackDimensionAssessment[] = [
    dim("safety_buffer", bufDimState, true, "SafetyBufferAssessment", [`presentationState=${sb?.presentationState ?? "null"}`], bufferGate !== "allowed"),
    dim("portfolio_allocation", allocDimState, true, "RebalanceAssessment", [`delta=${cryptoDeltaPct ?? "null"}`, `threshold=${reviewThresholdPct}`, `material=${materialRebalanceNeed}`], allocationGate !== "allowed"),
    dim("portfolio_accounting", acctDimState, true, "RebalanceAssessment.calculationGate", [`calc=${ra?.calculationGate.status ?? "null"}`, `dedupInvalid=${dedupInvalid}`, `unknownMagnitude=${unknownMagnitude}`], accountingGate !== "allowed"),
    dim("liabilities", liabDimState, comp != null, "PortfolioCompletenessResult", [`liabilitiesState=${comp?.liabilitiesState ?? "unknown"}`], liabDimState === "not_satisfied"),
    dim("candidate_visibility", candDimState, true, "OnTrackCandidateContext", [`visibleActionable=${visibleActionableCandidateCount}`, `candidateSetState=${cc.candidateSetState}`], candidateVisibilityGate === "blocked"),
  ];
  const evaluatedDimensions: OtDimension[] = ["safety_buffer", "portfolio_allocation", "portfolio_accounting", "liabilities", "candidate_visibility"];
  const unresolvedDimensions: OtDimension[] = dimensions.filter((d) => d.state === "unresolved").map((d) => d.dimension);

  if (safetyBufferState === "unresolved") warnings.push("safety_buffer_unresolved");
  if (allocationState === "unresolved") warnings.push("allocation_unresolved");
  if (accountingState === "unresolved") warnings.push("accounting_unresolved");
  if (cc.candidateSetState === "unresolved") warnings.push("candidate_context_unresolved");

  return {
    safetyBufferState,
    bufferTargetMonths: sb?.targetMonths ?? null,
    verifiedBufferValueUsd: sb?.verifiedLiquidStableValueUsd ?? null,
    bufferTargetUsd: sb?.targetUsd ?? null,
    allocationState,
    currentCryptoPct,
    targetCryptoPct,
    cryptoDeltaPct,
    absoluteCryptoDeltaPct,
    reviewThresholdPct,
    materialRebalanceNeed,
    allocationMethodologyVersion,
    accountingState,
    candidateSetState: cc.candidateSetState,
    visibleActionableCandidateCount,
    hasProvenHiddenMaterialSignal,
    dimensions,
    evaluatedDimensions,
    unevaluatedDimensions: [...ON_TRACK_UNEVALUATED_DIMENSIONS],
    unresolvedDimensions,
    claimScope,
    claimConfidence,
    bufferGate,
    accountingGate,
    allocationGate,
    materialNeedGate,
    candidateVisibilityGate,
    claimConfidenceGate,
    fallbackEligibilityGate,
    overallReadiness,
    fallbackState,
    presentationState,
    displayMode,
    recommendedTitle: ON_TRACK_RECOMMENDED_TITLE,
    recommendedDescription: ON_TRACK_RECOMMENDED_DESCRIPTION,
    broadPlanHealthyClaimSafe: false,
    noChangesNeedReviewClaimSafe: false,
    blockingReasons,
    warnings,
    generatedAt,
    methodologyVersion,
  };
}
