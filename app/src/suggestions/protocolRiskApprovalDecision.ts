/**
 * protocolRiskApprovalDecision — models the FUTURE human decision that would
 * approve the risk rubric and permit `riskScore` assignment.
 *
 * DECISION GATE ONLY. It approves nothing by default and assigns no score:
 *  - the current decision is `not_submitted` (`rubricApproved:false`,
 *    `scoreAssignmentAllowed:false`),
 *  - every candidate gate resolves to `blocked`/`evidence_incomplete` today,
 *  - `scoreAssigned` / `anyScoreAssigned` / `productionAffected` are always false,
 *  - it computes no `riskScore`, changes no production metadata, and is never
 *    imported by any live/engine/UI file.
 *
 * Flipping the decision to `approved` is a HUMAN review action, never normal
 * implementation work. `PROTOCOL_SELECTION_IMPLEMENTED` stays false;
 * `productionReady` stays false.
 */
import { PROTOCOL_RISK_RUBRIC_VERSION, isProtocolRiskRubricApproved } from "./protocolRiskRubric";
import type { ProtocolRiskRubricDimensionId } from "./protocolRiskRubric";
import { getSolLiquidStakingEvidenceDrafts } from "./protocolSolLiquidStakingEvidenceDrafts";
import { evaluateCandidateReadinessFromGatherDecisions } from "./protocolSolLiquidStakingEvidenceGatherDecisions";

/** The decision model exists (this step) but approves nothing and scores nothing. */
export const PROTOCOL_RISK_APPROVAL_DECISION_EXISTS = true;
export const PROTOCOL_RISK_APPROVAL_DECISION_APPROVED = false;
export const PROTOCOL_RISK_APPROVAL_DECISION_ASSIGN_SCORES = false;
export const PROTOCOL_RISK_APPROVAL_DECISION_AFFECTS_PRODUCTION = false;

export type ProtocolRiskApprovalDecisionStatus =
  | "not_submitted"
  | "pending_review"
  | "approved"
  | "rejected"
  | "changes_requested";

export type ProtocolRiskReviewerRole =
  | "founder"
  | "product"
  | "risk"
  | "compliance"
  | "legal"
  | "engineering";

export interface ProtocolRiskRubricApprovalDecision {
  decisionId: string;
  rubricVersion: string;
  status: ProtocolRiskApprovalDecisionStatus;
  reviewer?: string;
  reviewerRole?: ProtocolRiskReviewerRole;
  decidedAt?: string;
  notes: string[];
  rubricApproved: boolean;
  scoreAssignmentAllowed: boolean;
}

export type ProtocolRiskCandidateApprovalStatus =
  | "blocked"
  | "evidence_incomplete"
  | "ready_for_review"
  | "approved_for_scoring"
  | "rejected";

export interface ProtocolRiskCandidateScoreAssignmentGate {
  protocolId: string;
  lstSymbol: string;
  status: ProtocolRiskCandidateApprovalStatus;
  requiredDimensions: ProtocolRiskRubricDimensionId[];
  gatheredDimensions: ProtocolRiskRubricDimensionId[];
  missingDimensions: ProtocolRiskRubricDimensionId[];
  blockers: string[];
  scoreAssignmentAllowed: boolean;
  /** Always false in 12R — no score is ever assigned here. */
  scoreAssigned: false;
}

export interface ProtocolRiskApprovalGateResult {
  rubricDecision: ProtocolRiskRubricApprovalDecision;
  candidateGates: ProtocolRiskCandidateScoreAssignmentGate[];
  anyCandidateReadyForScoring: boolean;
  anyScoreAssigned: false;
  productionAffected: false;
  checkedAt: string;
}

/** The six rubric dimensions every candidate must have `gathered` before scoring. */
const REQUIRED_DIMENSIONS: readonly ProtocolRiskRubricDimensionId[] = [
  "audit_security",
  "maturity",
  "tvl_adoption",
  "withdrawal_fee_transparency",
  "operational_dependency_risk",
  "incident_history",
];

const SOL_LIQUID_STAKING_PROTOCOL_IDS = ["jupiter", "marinade", "jito", "blazestake", "sanctum"] as const;
const LST_SYMBOL: Record<string, string> = {
  jupiter: "JupSOL",
  marinade: "mSOL",
  jito: "JitoSOL",
  blazestake: "bSOL",
  sanctum: "INF",
};

/**
 * The current rubric approval decision. NOT submitted, NOT approved — scoring is
 * not allowed. This is the honest default until a human review is recorded.
 */
export function getCurrentProtocolRiskRubricApprovalDecision(): ProtocolRiskRubricApprovalDecision {
  return {
    decisionId: "sol-lst-risk-rubric-v0",
    rubricVersion: PROTOCOL_RISK_RUBRIC_VERSION,
    status: "not_submitted",
    notes: [
      "No reviewer decision recorded. Approval is a human review action, not implementation work.",
      "rubricApproved and scoreAssignmentAllowed stay false until an explicit, recorded decision.",
    ],
    rubricApproved: false,
    scoreAssignmentAllowed: false,
  };
}

/**
 * Evaluate one candidate's score-assignment gate from its evidence drafts and the
 * current approval decision. Never computes or returns a score.
 *
 * - `gatheredDimensions`: dimensions whose evidence is exactly `gathered`.
 * - `missingDimensions`: every required dimension not yet `gathered` (partial /
 *   needs_review / missing all count as not gathered).
 * - `ready_for_review` requires ALL six dimensions `gathered`.
 * - `approved_for_scoring` additionally requires the rubric decision to allow it.
 */
export function evaluateProtocolRiskCandidateScoreAssignmentGate(
  protocolId: string
): ProtocolRiskCandidateScoreAssignmentGate {
  const lstSymbol = LST_SYMBOL[protocolId] ?? protocolId;
  const decision = getCurrentProtocolRiskRubricApprovalDecision();
  const drafts = getSolLiquidStakingEvidenceDrafts(protocolId);

  const gatheredDimensions = REQUIRED_DIMENSIONS.filter((dim) =>
    drafts.some((d) => d.dimensionId === dim && d.evidenceStatus === "gathered")
  );
  const missingDimensions = REQUIRED_DIMENSIONS.filter((dim) => !gatheredDimensions.includes(dim));

  const blockers: string[] = [];
  if (missingDimensions.length > 0) blockers.push(`evidence_incomplete: ${missingDimensions.length}/${REQUIRED_DIMENSIONS.length} dimensions not gathered`);
  if (!decision.rubricApproved) blockers.push("rubric_not_approved");
  if (!decision.scoreAssignmentAllowed) blockers.push("score_assignment_not_allowed");

  // Determine status. Evidence completeness is required first; only then does the
  // reviewer decision gate scoring. Nothing here can reach approved_for_scoring today.
  let status: ProtocolRiskCandidateApprovalStatus;
  if (missingDimensions.length > 0) {
    status = decision.rubricApproved ? "evidence_incomplete" : "blocked";
  } else if (!decision.rubricApproved || !decision.scoreAssignmentAllowed) {
    status = "ready_for_review";
  } else {
    status = "approved_for_scoring";
  }

  const scoreAssignmentAllowed =
    status === "approved_for_scoring" && decision.rubricApproved && decision.scoreAssignmentAllowed;

  return {
    protocolId,
    lstSymbol,
    status,
    requiredDimensions: [...REQUIRED_DIMENSIONS],
    gatheredDimensions,
    missingDimensions,
    blockers,
    scoreAssignmentAllowed,
    scoreAssigned: false,
  };
}

/**
 * Non-production variant of the score-assignment gate that ADDITIONALLY counts
 * dimensions marked `gathered` in the 12W gather-decision ledger (freshness-aware).
 * It reuses the same status logic, never mutates base evidence drafts, never
 * approves scoring, and never assigns a `riskScore`. Not wired into production,
 * engine, UI, or live suggestions.
 */
export function evaluateProtocolRiskCandidateScoreAssignmentGateWithGatherDecisions(
  protocolId: string,
  asOf?: string
): ProtocolRiskCandidateScoreAssignmentGate {
  const lstSymbol = LST_SYMBOL[protocolId] ?? protocolId;
  const decision = getCurrentProtocolRiskRubricApprovalDecision();
  const base = evaluateProtocolRiskCandidateScoreAssignmentGate(protocolId);
  const gatherEval = evaluateCandidateReadinessFromGatherDecisions(protocolId, asOf);

  // Union of draft-gathered and ledger-gathered dimensions.
  const gatheredDimensions = REQUIRED_DIMENSIONS.filter(
    (dim) => base.gatheredDimensions.includes(dim) || gatherEval.gatheredDimensions.includes(dim)
  );
  const missingDimensions = REQUIRED_DIMENSIONS.filter((dim) => !gatheredDimensions.includes(dim));

  const blockers: string[] = [];
  if (missingDimensions.length > 0) blockers.push(`evidence_incomplete: ${missingDimensions.length}/${REQUIRED_DIMENSIONS.length} dimensions not gathered`);
  if (!decision.rubricApproved) blockers.push("rubric_not_approved");
  if (!decision.scoreAssignmentAllowed) blockers.push("score_assignment_not_allowed");

  let status: ProtocolRiskCandidateApprovalStatus;
  if (missingDimensions.length > 0) {
    status = decision.rubricApproved ? "evidence_incomplete" : "blocked";
  } else if (!decision.rubricApproved || !decision.scoreAssignmentAllowed) {
    status = "ready_for_review";
  } else {
    status = "approved_for_scoring";
  }

  return {
    protocolId,
    lstSymbol,
    status,
    requiredDimensions: [...REQUIRED_DIMENSIONS],
    gatheredDimensions,
    missingDimensions,
    blockers,
    scoreAssignmentAllowed: false,
    scoreAssigned: false,
  };
}

/** Evaluate the full approval gate across all five SOL LST candidates. */
export function evaluateProtocolRiskApprovalGate(): ProtocolRiskApprovalGateResult {
  const rubricDecision = getCurrentProtocolRiskRubricApprovalDecision();
  const candidateGates = SOL_LIQUID_STAKING_PROTOCOL_IDS.map((id) => evaluateProtocolRiskCandidateScoreAssignmentGate(id));
  return {
    rubricDecision,
    candidateGates,
    anyCandidateReadyForScoring: candidateGates.some((g) => g.status === "approved_for_scoring"),
    anyScoreAssigned: false,
    productionAffected: false,
    checkedAt: new Date().toISOString(),
  };
}

/**
 * Whether a `riskScore` may be assigned to a protocol today. False for every
 * candidate: the rubric is not approved and no candidate's evidence is complete.
 */
export function canAssignRiskScoreToProtocol(protocolId: string): false {
  const gate = evaluateProtocolRiskCandidateScoreAssignmentGate(protocolId);
  // Defensive: even if a future state flipped a flag, this step must never return true.
  if (gate.scoreAssignmentAllowed || isProtocolRiskRubricApproved()) {
    // Unreachable today; kept as an explicit guard so 12R can never permit scoring.
    return false as const;
  }
  return false;
}
