/**
 * protocolRiskScoreAssignment — the explicit, auditable riskScore ASSIGNMENT
 * mechanism (Step 12Y). BLOCKED BY DEFAULT.
 *
 * A `riskScore` (0–10, higher = more evidence-supported) may be computed ONLY when
 * every gate passes: the rubric is approved, score assignment is allowed, the
 * candidate is `ready_for_review`, the rubric version matches, and every dimension
 * carries a valid reviewer-scored input with rationale + evidence sources. With the
 * default (`not_submitted`) approval decision, JitoSOL — and every candidate —
 * stays `blocked` with no score.
 *
 * MECHANISM ONLY. It:
 *  - writes NO production metadata (`productionMetadataUpdated` always false),
 *  - mutates NO evidence drafts (`evidenceDraftMutated` always false),
 *  - enables NO selection (`selectionEnabled` always false),
 *  - is never imported by any live/engine/UI file.
 *
 * The one worked example (`getQaOnlyJitoRiskScoreAssignmentInput`) is QA-ONLY test
 * input — not production-approved scores, not a recommendation, never shown to
 * users. `PROTOCOL_SELECTION_IMPLEMENTED = false`; `productionReady = false`.
 */
import type { ProtocolRiskRubricDimensionId } from "./protocolRiskRubric";
import { getProtocolRiskRubric, PROTOCOL_RISK_RUBRIC_VERSION } from "./protocolRiskRubric";
import {
  getCurrentProtocolRiskRubricApprovalDecision,
  type ProtocolRiskRubricApprovalDecision,
  type ProtocolRiskReviewerRole,
} from "./protocolRiskApprovalDecision";
import { evaluateCandidateReadinessFromGatherDecisions } from "./protocolSolLiquidStakingEvidenceGatherDecisions";

export const PROTOCOL_RISK_SCORE_ASSIGNMENT_EXISTS = true;
export const PROTOCOL_RISK_SCORE_ASSIGNMENT_APPROVES_RUBRIC_BY_DEFAULT = false;
export const PROTOCOL_RISK_SCORE_ASSIGNMENT_ASSIGNS_PRODUCTION_SCORES = false;
export const PROTOCOL_RISK_SCORE_ASSIGNMENT_AFFECTS_PRODUCTION = false;
export const PROTOCOL_RISK_SCORE_ASSIGNMENT_ENABLES_SELECTION = false;
export const PROTOCOL_RISK_SCORE_ASSIGNMENT_UPDATES_METADATA = false;
export const PROTOCOL_RISK_SCORE_ASSIGNMENT_MUTATES_EVIDENCE = false;

export type ProtocolRiskScoreAssignmentStatus = "blocked" | "ready_for_scoring" | "score_assigned" | "rejected" | "needs_review";

export type ProtocolRiskDimensionScoreStatus = "not_scored" | "scored" | "rejected" | "needs_review";

export interface ProtocolRiskDimensionScoreInput {
  protocolId: string;
  lstSymbol: string;
  dimensionId: ProtocolRiskRubricDimensionId;
  score: number;
  status: ProtocolRiskDimensionScoreStatus;
  rationale: string[];
  evidenceSourceNames: string[];
  reviewer: string;
  reviewerRole: ProtocolRiskReviewerRole;
  scoredAt: string;
}

export interface ProtocolRiskScoreAssignmentInput {
  protocolId: string;
  lstSymbol: string;
  rubricVersion: string;
  approvalDecisionId: string;
  dimensionScores: ProtocolRiskDimensionScoreInput[];
  reviewer: string;
  reviewerRole: ProtocolRiskReviewerRole;
  assignedAt: string;
}

export interface ProtocolRiskScoreBreakdown {
  dimensionId: ProtocolRiskRubricDimensionId;
  weight: number;
  score: number;
  weightedContribution: number;
  rationale: string[];
  evidenceSourceNames: string[];
}

export interface ProtocolRiskScoreAssignmentResult {
  protocolId: string;
  lstSymbol: string;
  status: ProtocolRiskScoreAssignmentStatus;
  riskScore?: number;
  rubricVersion: string;
  breakdown: ProtocolRiskScoreBreakdown[];
  blockers: string[];
  reviewer?: string;
  reviewerRole?: ProtocolRiskReviewerRole;
  assignedAt?: string;
  productionMetadataUpdated: false;
  evidenceDraftMutated: false;
  selectionEnabled: false;
}

export interface ProtocolRiskScoreAssignmentSummary {
  totalAssignments: number;
  scoreAssigned: number;
  blocked: number;
  readyForScoring: number;
  rejected: number;
  needsReview: number;
  productionMetadataUpdatedCount: 0;
  evidenceDraftMutatedCount: 0;
  selectionEnabledCount: 0;
}

export interface EvaluateRiskScoreAssignmentOptions {
  /** Override the approval decision (test/reviewer flow). Defaults to the current (not_submitted) decision. */
  approvalDecision?: ProtocolRiskRubricApprovalDecision;
  /** Freshness-aware candidate-readiness evaluation timestamp. */
  asOf?: string;
}

const RUBRIC_DIMENSIONS: readonly ProtocolRiskRubricDimensionId[] = [
  "audit_security",
  "maturity",
  "tvl_adoption",
  "withdrawal_fee_transparency",
  "operational_dependency_risk",
  "incident_history",
];

function weightFor(dimensionId: ProtocolRiskRubricDimensionId): number {
  return getProtocolRiskRubric().dimensions.find((d) => d.id === dimensionId)?.weight ?? 0;
}

/** round to 2 decimals to avoid float noise (e.g. 7.75). */
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Weighted riskScore = sum(score * weight) / 100, over the rubric dimensions.
 * Assumes inputs already validated by `validateRiskScoreDimensionInputs`.
 */
export function calculateWeightedRiskScore(dimensionScores: ProtocolRiskDimensionScoreInput[]): number {
  const total = dimensionScores.reduce((sum, d) => sum + d.score * weightFor(d.dimensionId), 0);
  return round2(total / 100);
}

/**
 * Validate the dimension-score set. Returns blocker strings (empty = valid):
 * exactly one score per rubric dimension, each 0–10, `scored`, with reviewer +
 * role + rationale + evidence sources.
 */
export function validateRiskScoreDimensionInputs(dimensionScores: ProtocolRiskDimensionScoreInput[]): string[] {
  const blockers: string[] = [];
  const seen = new Map<ProtocolRiskRubricDimensionId, number>();
  for (const d of dimensionScores) seen.set(d.dimensionId, (seen.get(d.dimensionId) ?? 0) + 1);

  for (const dim of RUBRIC_DIMENSIONS) {
    const count = seen.get(dim) ?? 0;
    if (count === 0) blockers.push(`missing_dimension_score:${dim}`);
    if (count > 1) blockers.push(`duplicate_dimension_score:${dim}`);
  }
  for (const d of dimensionScores) {
    if (!RUBRIC_DIMENSIONS.includes(d.dimensionId)) blockers.push(`unknown_dimension:${d.dimensionId}`);
    if (typeof d.score !== "number" || Number.isNaN(d.score) || d.score < 0 || d.score > 10) blockers.push(`score_out_of_range:${d.dimensionId}`);
    if (d.status !== "scored") blockers.push(`dimension_not_scored:${d.dimensionId}`);
    if (!d.reviewer || !d.reviewerRole) blockers.push(`missing_reviewer:${d.dimensionId}`);
    if (!Array.isArray(d.rationale) || d.rationale.length === 0) blockers.push(`missing_rationale:${d.dimensionId}`);
    if (!Array.isArray(d.evidenceSourceNames) || d.evidenceSourceNames.length === 0) blockers.push(`missing_evidence_sources:${d.dimensionId}`);
  }
  return blockers;
}

/** All blockers for an assignment (gate blockers first, then dimension-input blockers). */
export function getRiskScoreAssignmentBlockers(
  input: ProtocolRiskScoreAssignmentInput,
  options?: EvaluateRiskScoreAssignmentOptions
): string[] {
  const decision = options?.approvalDecision ?? getCurrentProtocolRiskRubricApprovalDecision();
  const readiness = evaluateCandidateReadinessFromGatherDecisions(input.protocolId, options?.asOf);
  const blockers: string[] = [];

  if (!decision.rubricApproved) blockers.push("rubric_not_approved");
  if (!decision.scoreAssignmentAllowed) blockers.push("score_assignment_not_allowed");
  if (!readiness.candidateReadyForReview) blockers.push("candidate_not_ready_for_review");
  if (input.rubricVersion !== PROTOCOL_RISK_RUBRIC_VERSION) blockers.push("rubric_version_mismatch");
  blockers.push(...validateRiskScoreDimensionInputs(input.dimensionScores));
  return blockers;
}

/**
 * Evaluate a riskScore assignment. Deterministic. Computes a score ONLY when every
 * gate passes; otherwise `blocked` / `needs_review` / `rejected` with no score.
 * Never writes production metadata, mutates a draft, or enables selection.
 */
export function evaluateRiskScoreAssignment(
  input: ProtocolRiskScoreAssignmentInput,
  options?: EvaluateRiskScoreAssignmentOptions
): ProtocolRiskScoreAssignmentResult {
  const shell = (
    status: ProtocolRiskScoreAssignmentStatus,
    blockers: string[],
    riskScore?: number,
    breakdown: ProtocolRiskScoreBreakdown[] = []
  ): ProtocolRiskScoreAssignmentResult => ({
    protocolId: input.protocolId,
    lstSymbol: input.lstSymbol,
    status,
    ...(riskScore != null ? { riskScore } : {}),
    rubricVersion: input.rubricVersion,
    breakdown,
    blockers,
    ...(status === "score_assigned" ? { reviewer: input.reviewer, reviewerRole: input.reviewerRole, assignedAt: input.assignedAt } : {}),
    productionMetadataUpdated: false,
    evidenceDraftMutated: false,
    selectionEnabled: false,
  });

  const decision = options?.approvalDecision ?? getCurrentProtocolRiskRubricApprovalDecision();
  const readiness = evaluateCandidateReadinessFromGatherDecisions(input.protocolId, options?.asOf);

  // Gate order: approval → allowance → readiness → version. Any failure → blocked.
  const gateBlockers: string[] = [];
  if (!decision.rubricApproved) gateBlockers.push("rubric_not_approved");
  if (!decision.scoreAssignmentAllowed) gateBlockers.push("score_assignment_not_allowed");
  if (!readiness.candidateReadyForReview) gateBlockers.push("candidate_not_ready_for_review");
  if (input.rubricVersion !== PROTOCOL_RISK_RUBRIC_VERSION) gateBlockers.push("rubric_version_mismatch");
  if (gateBlockers.length > 0) return shell("blocked", gateBlockers);

  // Dimension-input validation.
  const dimBlockers = validateRiskScoreDimensionInputs(input.dimensionScores);
  if (dimBlockers.length > 0) {
    // Out-of-range / duplicate / unknown → rejected; otherwise needs_review.
    const isReject = dimBlockers.some((b) => b.startsWith("score_out_of_range") || b.startsWith("duplicate_dimension_score") || b.startsWith("unknown_dimension"));
    return shell(isReject ? "rejected" : "needs_review", dimBlockers);
  }

  // All gates pass → compute the weighted score with breakdown.
  const breakdown: ProtocolRiskScoreBreakdown[] = RUBRIC_DIMENSIONS.map((dim) => {
    const d = input.dimensionScores.find((x) => x.dimensionId === dim)!;
    const weight = weightFor(dim);
    return {
      dimensionId: dim,
      weight,
      score: d.score,
      weightedContribution: round2((d.score * weight) / 100),
      rationale: [...d.rationale],
      evidenceSourceNames: [...d.evidenceSourceNames],
    };
  });
  const riskScore = calculateWeightedRiskScore(input.dimensionScores);
  return shell("score_assigned", [], riskScore, breakdown);
}

/**
 * Default (blocked) assignment input for a protocol: no reviewer scores. Used to
 * show that the default state produces no production score.
 */
export function getDefaultProtocolRiskScoreAssignmentInput(protocolId: string): ProtocolRiskScoreAssignmentInput {
  const lstSymbol = protocolId === "jito" ? "JitoSOL" : protocolId;
  const decision = getCurrentProtocolRiskRubricApprovalDecision();
  return {
    protocolId,
    lstSymbol,
    rubricVersion: PROTOCOL_RISK_RUBRIC_VERSION,
    approvalDecisionId: decision.decisionId,
    dimensionScores: [],
    reviewer: "",
    reviewerRole: "risk",
    assignedAt: "",
  };
}

/** QA-ONLY reviewer name/value labels — never production-approved. */
export const QA_ONLY_SCORING_LABEL = "QA_ONLY_NOT_PRODUCTION";

/**
 * QA-ONLY JitoSOL scoring input. NOT production-approved scores, NOT a
 * recommendation, never shown to users — used only to test the calculation path.
 * Weighted score = 8*.25 + 8*.20 + 9*.15 + 7*.15 + 7*.15 + 7*.10 = 7.75.
 */
export function getQaOnlyJitoRiskScoreAssignmentInput(): ProtocolRiskScoreAssignmentInput {
  const AS_OF = "2026-07-12T00:00:00Z";
  const mk = (
    dimensionId: ProtocolRiskRubricDimensionId,
    score: number,
    evidenceSourceNames: string[]
  ): ProtocolRiskDimensionScoreInput => ({
    protocolId: "jito",
    lstSymbol: "JitoSOL",
    dimensionId,
    score,
    status: "scored",
    rationale: [`QA-only test score (${QA_ONLY_SCORING_LABEL}) — proves the calculation path, not a production-approved score.`],
    evidenceSourceNames,
    reviewer: "qa-example",
    reviewerRole: "risk",
    scoredAt: AS_OF,
  });
  return {
    protocolId: "jito",
    lstSymbol: "JitoSOL",
    rubricVersion: PROTOCOL_RISK_RUBRIC_VERSION,
    approvalDecisionId: "qa-only-explicit-approval",
    reviewer: "qa-example",
    reviewerRole: "risk",
    assignedAt: AS_OF,
    dimensionScores: [
      mk("audit_security", 8, ["JitoSOL Security Overview", "JitoSOL Deployed Programs"]),
      mk("maturity", 8, ["Jito Request for Stake Pool Validators"]),
      mk("tvl_adoption", 9, ["DefiLlama pool (JitoSOL)"]),
      mk("withdrawal_fee_transparency", 7, ["JitoSOL Unstaking Overview", "JitoSOL General FAQs"]),
      mk("operational_dependency_risk", 7, ["JitoSOL Security Overview", "JitoSOL Automated Management via Stakenet"]),
      mk("incident_history", 7, ["JitoSOL official incident-history manual review"]),
    ],
  };
}

/** Whether a score can be assigned under a specific approval decision (default false today). */
export function canAssignRiskScoreWithDecision(
  protocolId: string,
  approvalDecision: ProtocolRiskRubricApprovalDecision,
  asOf?: string
): boolean {
  const input = protocolId === "jito" ? getQaOnlyJitoRiskScoreAssignmentInput() : getDefaultProtocolRiskScoreAssignmentInput(protocolId);
  return evaluateRiskScoreAssignment(input, { approvalDecision, asOf }).status === "score_assigned";
}

export function summarizeRiskScoreAssignments(
  results: ProtocolRiskScoreAssignmentResult[]
): ProtocolRiskScoreAssignmentSummary {
  const count = (s: ProtocolRiskScoreAssignmentStatus) => results.filter((r) => r.status === s).length;
  return {
    totalAssignments: results.length,
    scoreAssigned: count("score_assigned"),
    blocked: count("blocked"),
    readyForScoring: count("ready_for_scoring"),
    rejected: count("rejected"),
    needsReview: count("needs_review"),
    productionMetadataUpdatedCount: 0,
    evidenceDraftMutatedCount: 0,
    selectionEnabledCount: 0,
  };
}
