/**
 * protocolSolLiquidStakingEvidenceCompletion — a pure, reviewable workflow for
 * moving ONE candidate's rubric evidence from needs_review/partial toward
 * `gathered`. Target: Sanctum / INF (it already has one source-backed TVL point —
 * this does NOT mean Sanctum is selected or endorsed).
 *
 * WORKFLOW ONLY. It:
 *  - approves no rubric, assigns no score, makes no candidate approved_for_scoring,
 *  - mutates NO base evidence drafts and NO production metadata,
 *  - only reports what each dimension WOULD need before it could be `gathered`.
 *
 * A dimension can reach `gathered` ONLY when its required evidence is backed by
 * VERIFIED sources with no unresolved questions. Today no dimension qualifies
 * (Sanctum's TVL is `partial`, not sufficient alone), so `readyForReview` is false.
 * `approvedForScoring`/`scoreAssigned`/`productionAffected` are always false.
 * `PROTOCOL_SELECTION_IMPLEMENTED = false`; `productionReady = false`.
 */
import type { ProtocolRiskRubricDimensionId } from "./protocolRiskRubric";
import {
  getSolLiquidStakingEvidenceDrafts,
  type ProtocolRiskEvidenceDraftStatus,
  type ProtocolRiskEvidenceSourceType,
} from "./protocolSolLiquidStakingEvidenceDrafts";
import {
  evaluateProtocolRiskCandidateScoreAssignmentGate,
  canAssignRiskScoreToProtocol,
  type ProtocolRiskCandidateScoreAssignmentGate,
} from "./protocolRiskApprovalDecision";
import type {
  ProtocolSourceValueConfirmationResult,
  ProtocolSourceValueCategory,
} from "./protocolSolLiquidStakingSourceValueConfirmation";

/** The harness exists (this step) but approves nothing and scores nothing. */
export const PROTOCOL_EVIDENCE_COMPLETION_EXISTS = true;
export const PROTOCOL_EVIDENCE_COMPLETION_APPROVES_RUBRIC = false;
export const PROTOCOL_EVIDENCE_COMPLETION_ASSIGNS_SCORES = false;
export const PROTOCOL_EVIDENCE_COMPLETION_AFFECTS_PRODUCTION = false;
export const PROTOCOL_EVIDENCE_COMPLETION_TARGET_PROTOCOL_ID = "sanctum";
export const PROTOCOL_EVIDENCE_COMPLETION_TARGET_SYMBOL = "INF";

export type ProtocolEvidenceCompletionStatus =
  | "not_started"
  | "in_progress"
  | "partially_complete"
  | "complete"
  | "blocked";

export type ProtocolEvidenceCompletionDimensionStatus =
  | "gathered"
  | "partial"
  | "needs_review"
  | "missing"
  | "blocked";

export type ProtocolEvidenceCompletionSourceReviewStatus = "verified" | "rejected" | "needs_review";

export interface ProtocolEvidenceCompletionSourceReview {
  sourceName: string;
  sourceUrl?: string;
  sourceType: ProtocolRiskEvidenceSourceType;
  reviewStatus: ProtocolEvidenceCompletionSourceReviewStatus;
  reviewedAt?: string;
  reviewedBy?: string;
  notes: string[];
}

export interface ProtocolEvidenceCompletionDimensionResult {
  protocolId: string;
  lstSymbol: string;
  dimensionId: ProtocolRiskRubricDimensionId;
  previousStatus: ProtocolRiskEvidenceDraftStatus;
  nextStatus: ProtocolEvidenceCompletionDimensionStatus;
  sourceReviews: ProtocolEvidenceCompletionSourceReview[];
  unresolvedQuestions: string[];
  canMarkGathered: boolean;
  reason: string;
}

export interface ProtocolEvidenceCompletionResult {
  protocolId: string;
  lstSymbol: string;
  status: ProtocolEvidenceCompletionStatus;
  dimensionResults: ProtocolEvidenceCompletionDimensionResult[];
  dimensionsGathered: ProtocolRiskRubricDimensionId[];
  dimensionsStillMissing: ProtocolRiskRubricDimensionId[];
  readyForReview: boolean;
  /** Always false — completion never approves scoring. */
  approvedForScoring: false;
  /** Always false — completion never assigns a score. */
  scoreAssigned: false;
  /** Always false — completion never affects production. */
  productionAffected: false;
  checkedAt: string;
}

const REQUIRED_DIMENSIONS: readonly ProtocolRiskRubricDimensionId[] = [
  "audit_security",
  "maturity",
  "tvl_adoption",
  "withdrawal_fee_transparency",
  "operational_dependency_risk",
  "incident_history",
];

/**
 * Review the sources on a draft. A source is only `verified` when it is already
 * codebase-verified (sourceType "codebase"); everything else is `needs_review`.
 * We never upgrade an unverified/public pointer to verified, and never fabricate.
 */
function reviewSources(
  sources: { sourceName: string; sourceUrl?: string; sourceType: ProtocolRiskEvidenceSourceType; notes: string[] }[]
): ProtocolEvidenceCompletionSourceReview[] {
  return sources.map((s) => ({
    sourceName: s.sourceName,
    ...(s.sourceUrl ? { sourceUrl: s.sourceUrl } : {}),
    sourceType: s.sourceType,
    // Only an already-codebase-verified source counts as verified here.
    reviewStatus: s.sourceType === "codebase" ? "verified" : "needs_review",
    notes: [...s.notes],
  }));
}

/**
 * Map a reviewed dimension to its completion status. `gathered` requires: the
 * draft already `gathered` OR all required sources verified AND no unresolved
 * questions. Partial evidence (e.g. Sanctum TVL alone) never becomes `gathered`.
 */
function completeDimension(
  protocolId: string,
  lstSymbol: string,
  dimensionId: ProtocolRiskRubricDimensionId
): ProtocolEvidenceCompletionDimensionResult {
  const draft = getSolLiquidStakingEvidenceDrafts(protocolId).find((d) => d.dimensionId === dimensionId);
  const previousStatus: ProtocolRiskEvidenceDraftStatus = draft?.evidenceStatus ?? "not_reviewed";
  const sourceReviews = reviewSources(draft?.sources ?? []);
  const unresolvedQuestions = [...(draft?.unresolvedQuestions ?? [])];

  const hasVerifiedSource = sourceReviews.some((r) => r.reviewStatus === "verified");
  const allSourcesVerified = sourceReviews.length > 0 && sourceReviews.every((r) => r.reviewStatus === "verified");
  const noOpenQuestions = unresolvedQuestions.length === 0;

  // A dimension may only be marked gathered with fully-verified sources AND no
  // open questions. Absence of evidence is never a pass.
  const canMarkGathered = allSourcesVerified && noOpenQuestions;

  let nextStatus: ProtocolEvidenceCompletionDimensionStatus;
  let reason: string;
  if (canMarkGathered) {
    nextStatus = "gathered";
    reason = "All required sources verified and no unresolved questions.";
  } else if (previousStatus === "partial" || hasVerifiedSource) {
    nextStatus = "partial";
    reason = "Some evidence is verified, but required evidence or open questions remain — partial is not gathered.";
  } else if (sourceReviews.length > 0) {
    nextStatus = "needs_review";
    reason = "Source pointer(s) exist but are unverified; a reviewer must verify them before this can be gathered.";
  } else {
    nextStatus = "needs_review";
    reason = "No verified source yet; official evidence must be sourced and reviewed.";
  }

  return {
    protocolId,
    lstSymbol,
    dimensionId,
    previousStatus,
    nextStatus,
    sourceReviews,
    unresolvedQuestions,
    canMarkGathered,
    reason,
  };
}

/**
 * Run the evidence-completion workflow for one candidate. Pure and read-only:
 * reads existing drafts, reviews each dimension, and reports what each would need
 * to become `gathered`. Never mutates drafts, approves the rubric, assigns a
 * score, or writes to protocolRiskRegistry.
 */
export function runEvidenceCompletionForCandidate(
  protocolId: string = PROTOCOL_EVIDENCE_COMPLETION_TARGET_PROTOCOL_ID
): ProtocolEvidenceCompletionResult {
  const lstSymbol = getSolLiquidStakingEvidenceDrafts(protocolId)[0]?.lstSymbol ?? protocolId;
  const dimensionResults = REQUIRED_DIMENSIONS.map((dim) => completeDimension(protocolId, lstSymbol, dim));

  const dimensionsGathered = dimensionResults.filter((r) => r.nextStatus === "gathered").map((r) => r.dimensionId);
  const dimensionsStillMissing = REQUIRED_DIMENSIONS.filter((d) => !dimensionsGathered.includes(d));
  const readyForReview = dimensionsGathered.length === REQUIRED_DIMENSIONS.length;

  let status: ProtocolEvidenceCompletionStatus;
  if (readyForReview) status = "complete";
  else if (dimensionsGathered.length > 0) status = "partially_complete";
  else if (dimensionResults.some((r) => r.nextStatus === "partial")) status = "in_progress";
  else status = "not_started";

  return {
    protocolId,
    lstSymbol,
    status,
    dimensionResults,
    dimensionsGathered,
    dimensionsStillMissing,
    readyForReview,
    approvedForScoring: false,
    scoreAssigned: false,
    productionAffected: false,
    checkedAt: new Date().toISOString(),
  };
}

export interface SanctumEvidenceCompletionGateCheck {
  completionResult: ProtocolEvidenceCompletionResult;
  candidateGateBefore: ProtocolRiskCandidateScoreAssignmentGate;
  candidateGateAfter: ProtocolRiskCandidateScoreAssignmentGate;
  canAssignScore: false;
}

/**
 * Run the completion workflow for Sanctum/INF and show the score-assignment gate
 * before and after. The harness never mutates drafts, so the gate is unchanged —
 * this proves completion alone cannot make a candidate approved_for_scoring.
 */
export function runSanctumEvidenceCompletionGateCheck(): SanctumEvidenceCompletionGateCheck {
  const target = PROTOCOL_EVIDENCE_COMPLETION_TARGET_PROTOCOL_ID;
  const candidateGateBefore = evaluateProtocolRiskCandidateScoreAssignmentGate(target);
  const completionResult = runEvidenceCompletionForCandidate(target);
  const candidateGateAfter = evaluateProtocolRiskCandidateScoreAssignmentGate(target);
  // Guard: canAssignRiskScoreToProtocol is always false today; keep the literal.
  const _cannotAssign = canAssignRiskScoreToProtocol(target);
  void _cannotAssign;
  return {
    completionResult,
    candidateGateBefore,
    candidateGateAfter,
    canAssignScore: false,
  };
}

/* ------------------------------------------------------------------ *
 * Step 12U — map reviewer-confirmed values (12U) to evidence completion.
 * Non-mutating; a dimension is only gatherable when ALL its required values are
 * confirmed. It never mutates drafts, approves scoring, or assigns a score.
 * ------------------------------------------------------------------ */

/** Confirmation category → rubric dimension it supports. */
const VALUE_CATEGORY_TO_DIMENSION: Record<ProtocolSourceValueCategory, ProtocolRiskRubricDimensionId> = {
  tvl: "tvl_adoption",
  apy: "tvl_adoption",
  withdrawal_time: "withdrawal_fee_transparency",
  withdrawal_mechanics: "withdrawal_fee_transparency",
  fees: "withdrawal_fee_transparency",
  audit_scope: "audit_security",
  audit_date: "audit_security",
  audit_firm: "audit_security",
  operational_dependency: "operational_dependency_risk",
  incident_history: "incident_history",
};

/**
 * The confirmed-value categories a dimension needs before it could be gathered.
 * `maturity` has no confirmable value category, so it can never be gathered from
 * value confirmations alone (empty list → never gatherable). `tvl_adoption`
 * requires BOTH a TVL value and an APY/freshness confirmation, so a TVL-only
 * confirmation never gathers it.
 */
const DIMENSION_REQUIRED_VALUE_CATEGORIES: Record<ProtocolRiskRubricDimensionId, ProtocolSourceValueCategory[]> = {
  audit_security: ["audit_firm", "audit_scope", "audit_date"],
  maturity: [],
  tvl_adoption: ["tvl", "apy"],
  withdrawal_fee_transparency: ["withdrawal_time", "withdrawal_mechanics", "fees"],
  operational_dependency_risk: ["operational_dependency"],
  incident_history: ["incident_history"],
};

const ALL_DIMENSIONS: readonly ProtocolRiskRubricDimensionId[] = [
  "audit_security",
  "maturity",
  "tvl_adoption",
  "withdrawal_fee_transparency",
  "operational_dependency_risk",
  "incident_history",
];

export interface ConfirmedValuesToEvidenceMap {
  protocolId: string;
  lstSymbol: string;
  dimensionsWithConfirmedValues: ProtocolRiskRubricDimensionId[];
  dimensionsStillIncomplete: ProtocolRiskRubricDimensionId[];
  canMarkDimensionsGathered: ProtocolRiskRubricDimensionId[];
  candidateReadyForReview: boolean;
  approvedForScoring: false;
  scoreAssigned: false;
  productionAffected: false;
}

/**
 * Non-mutating cross-reference from reviewer-confirmed values (12U) to evidence
 * dimensions. A dimension is `canMarkDimensionsGathered` only when EVERY required
 * confirmation category has a `confirmed` result for this protocol. Partial
 * confirmation is never enough. Never mutates drafts, approves scoring, assigns a
 * score, or affects production.
 */
export function mapConfirmedValuesToEvidenceCompletion(
  protocolId: string,
  confirmations: ProtocolSourceValueConfirmationResult[]
): ConfirmedValuesToEvidenceMap {
  const lstSymbol = getSolLiquidStakingEvidenceDrafts(protocolId)[0]?.lstSymbol ?? protocolId;
  // Read-only: touch drafts to make the non-mutation contract explicit.
  void getSolLiquidStakingEvidenceDrafts(protocolId);

  const confirmedForProtocol = confirmations.filter((c) => c.protocolId === protocolId && c.status === "confirmed");
  const confirmedCategories = new Set(confirmedForProtocol.map((c) => c.category));

  const dimsWithConfirmed = new Set<ProtocolRiskRubricDimensionId>();
  for (const c of confirmedForProtocol) dimsWithConfirmed.add(VALUE_CATEGORY_TO_DIMENSION[c.category]);

  const canMarkDimensionsGathered = ALL_DIMENSIONS.filter((dim) => {
    const required = DIMENSION_REQUIRED_VALUE_CATEGORIES[dim];
    return required.length > 0 && required.every((cat) => confirmedCategories.has(cat));
  });

  const dimensionsWithConfirmedValues = ALL_DIMENSIONS.filter((d) => dimsWithConfirmed.has(d));
  const dimensionsStillIncomplete = ALL_DIMENSIONS.filter((d) => !canMarkDimensionsGathered.includes(d));

  return {
    protocolId,
    lstSymbol,
    dimensionsWithConfirmedValues,
    dimensionsStillIncomplete,
    canMarkDimensionsGathered,
    candidateReadyForReview: canMarkDimensionsGathered.length === ALL_DIMENSIONS.length,
    approvedForScoring: false,
    scoreAssigned: false,
    productionAffected: false,
  };
}
