/**
 * protocolRiskRubric — the auditable rubric + approval workflow for a FUTURE
 * protocol `riskScore`. It defines HOW a score will be assigned and WHAT evidence
 * is required — it assigns NO score.
 *
 * DRAFT, NOT APPROVED. This module:
 *  - assigns no `riskScore` (all drafts keep `score` absent, `scoreAssigned:false`),
 *  - is not approved (`approvalStatus: "draft"`, `isProtocolRiskRubricApproved()` → false),
 *  - changes no `ProtocolRiskData`, eligibility, scoring, or the UI,
 *  - is never imported by any live/engine/UI file.
 *
 * A `riskScore` is an INTERNAL eligibility input, not user-facing marketing copy
 * and not a claim that a protocol is safe. `PROTOCOL_SELECTION_IMPLEMENTED` stays
 * false; `productionReady` stays false. No value is invented here.
 */

/** The rubric exists (this step) but is explicitly NOT approved and assigns nothing. */
export const PROTOCOL_RISK_RUBRIC_EXISTS = true;
export const PROTOCOL_RISK_RUBRIC_APPROVED = false;
export const PROTOCOL_RISK_RUBRIC_ASSIGNS_SCORES = false;
export const PROTOCOL_RISK_RUBRIC_AFFECTS_PRODUCTION = false;

export const PROTOCOL_RISK_RUBRIC_VERSION = "0.1.0-draft";

export type ProtocolRiskRubricDimensionId =
  | "audit_security"
  | "maturity"
  | "tvl_adoption"
  | "withdrawal_fee_transparency"
  | "operational_dependency_risk"
  | "incident_history";

export type ProtocolRiskRubricEvidenceStatus = "sufficient" | "partial" | "missing" | "not_reviewed";

export type ProtocolRiskRubricApprovalStatus = "draft" | "in_review" | "approved" | "rejected";

export interface ProtocolRiskRubricDimension {
  id: ProtocolRiskRubricDimensionId;
  label: string;
  weight: number;
  evidenceRequired: string[];
  scoringGuidance: string[];
}

export interface ProtocolRiskRubric {
  version: string;
  approvalStatus: ProtocolRiskRubricApprovalStatus;
  approvedAt?: string;
  approvedBy?: string;
  dimensions: ProtocolRiskRubricDimension[];
  totalWeight: number;
}

export interface ProtocolRiskEvidenceReview {
  protocolId: string;
  dimensionId: ProtocolRiskRubricDimensionId;
  evidenceStatus: ProtocolRiskRubricEvidenceStatus;
  sources: string[];
  notes: string[];
}

export interface ProtocolRiskScoreDraft {
  protocolId: string;
  /** Absent until the rubric is approved AND evidence is reviewed — never invented. */
  score?: number;
  approvalStatus: ProtocolRiskRubricApprovalStatus;
  evidenceReviews: ProtocolRiskEvidenceReview[];
  /** Always false in this step — no score is assigned. */
  scoreAssigned: false;
}

/**
 * The rubric dimensions + weights (total 100). Weights and evidence are the
 * REVIEWABLE proposal; nothing is scored. `scoringGuidance` describes how a
 * reviewer would reason about evidence, never a fixed number.
 */
const RUBRIC_DIMENSIONS: readonly ProtocolRiskRubricDimension[] = [
  {
    id: "audit_security",
    label: "Audit & security review",
    weight: 25,
    evidenceRequired: [
      "official audit report or security review",
      "audit scope",
      "audit date",
      "audited program / contract version",
      "unresolved critical/high findings if disclosed",
    ],
    scoringGuidance: [
      "Higher evidence when independent audits cover the deployed version with findings remediated.",
      "Missing or out-of-scope audits reduce confidence; absence of a report is not a pass.",
    ],
  },
  {
    id: "maturity",
    label: "Maturity & production history",
    weight: 20,
    evidenceRequired: [
      "launch or production history",
      "time in production",
      "maintenance activity or official status",
      "major protocol changes if relevant",
    ],
    scoringGuidance: [
      "Longer, continuous production history with active maintenance supports higher confidence.",
      "Recent launches or major rewrites carry more uncertainty until re-reviewed.",
    ],
  },
  {
    id: "tvl_adoption",
    label: "TVL & adoption",
    weight: 15,
    evidenceRequired: [
      "source-backed TVL",
      "adoption / holder / pool usage evidence if available",
      "TVL source freshness",
    ],
    scoringGuidance: [
      "Source-backed, fresh TVL and broad adoption support higher confidence.",
      "TVL alone is never treated as proof of safety or audit status.",
    ],
  },
  {
    id: "withdrawal_fee_transparency",
    label: "Withdrawal & fee transparency",
    weight: 15,
    evidenceRequired: [
      "withdrawal mechanics",
      "withdrawal timing",
      "fee schedule",
      "distinction between protocol withdrawal and swap/route liquidity",
    ],
    scoringGuidance: [
      "Documented unstake mechanics, timing, and fees support higher confidence.",
      "Swap-route liquidity is not protocol withdrawal; fees are never assumed zero.",
    ],
  },
  {
    id: "operational_dependency_risk",
    label: "Operational & dependency risk",
    weight: 15,
    evidenceRequired: [
      "admin / upgrade authority notes where available",
      "validator / stake-pool / oracle / routing dependencies",
      "custody model",
      "external protocol dependencies",
    ],
    scoringGuidance: [
      "Minimized admin authority, transparent dependencies, and non-custodial design support higher confidence.",
      "Opaque upgrade authority or heavy external dependencies increase uncertainty.",
    ],
  },
  {
    id: "incident_history",
    label: "Incident history",
    weight: 10,
    evidenceRequired: [
      "disclosed incidents if any",
      "official postmortems if any",
      "security advisories",
      "absence of a sourced incident review is marked missing, not treated as clean history",
    ],
    scoringGuidance: [
      "A reviewed history with disclosed, well-handled incidents can still support confidence.",
      "No sourced incident review means evidence is missing — never assume a clean record.",
    ],
  },
];

/** The current rubric — DRAFT, not approved. Deterministic and pure. */
export function getProtocolRiskRubric(): ProtocolRiskRubric {
  const dimensions = RUBRIC_DIMENSIONS.map((d) => ({ ...d, evidenceRequired: [...d.evidenceRequired], scoringGuidance: [...d.scoringGuidance] }));
  return {
    version: PROTOCOL_RISK_RUBRIC_VERSION,
    approvalStatus: "draft",
    dimensions,
    totalWeight: dimensions.reduce((sum, d) => sum + d.weight, 0),
  };
}

export function getProtocolRiskRubricDimensions(): ProtocolRiskRubricDimension[] {
  return getProtocolRiskRubric().dimensions;
}

/** Approval is false until the approval pack is signed off. */
export function isProtocolRiskRubricApproved(): false {
  return false;
}

/** Scores may be assigned only after approval — false today. */
export function canAssignProtocolRiskScores(): false {
  return false;
}

/**
 * An empty score draft for a protocol: `score` absent, `scoreAssigned:false`,
 * approval `draft`, and every rubric dimension marked `not_reviewed`. Never
 * assigns or invents a score.
 */
export function createEmptyProtocolRiskScoreDraft(protocolId: string): ProtocolRiskScoreDraft {
  return {
    protocolId,
    approvalStatus: "draft",
    scoreAssigned: false,
    evidenceReviews: RUBRIC_DIMENSIONS.map((d) => ({
      protocolId,
      dimensionId: d.id,
      evidenceStatus: "not_reviewed",
      sources: [],
      notes: [],
    })),
  };
}

/** True only when the rubric weights total exactly 100 (validated in fixtures). */
export function validateProtocolRiskRubricWeights(): boolean {
  return RUBRIC_DIMENSIONS.reduce((sum, d) => sum + d.weight, 0) === 100;
}

/**
 * Dimensions still lacking sufficient evidence for a protocol. With no evidence
 * reviewed yet, every dimension is returned — i.e. nothing is score-ready.
 */
export function getMissingRiskEvidenceForProtocol(protocolId: string): ProtocolRiskRubricDimensionId[] {
  const draft = createEmptyProtocolRiskScoreDraft(protocolId);
  return draft.evidenceReviews
    .filter((r) => r.evidenceStatus !== "sufficient")
    .map((r) => r.dimensionId);
}
