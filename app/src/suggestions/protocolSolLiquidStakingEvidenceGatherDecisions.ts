/**
 * protocolSolLiquidStakingEvidenceGatherDecisions — an auditable, non-production
 * ledger of explicit REVIEWER decisions that a rubric dimension is `gathered`,
 * based on confirmed values + source evidence (Step 12W).
 *
 * LEDGER ONLY. Recording that a dimension is gathered here:
 *  - writes NO production metadata (never `DEFILLAMA_POOL_MAPPINGS` /
 *    `ProtocolMarketData` / `ProtocolRiskData`),
 *  - mutates NO base evidence drafts,
 *  - assigns NO `riskScore` and approves no rubric,
 *  - marks no candidate `approved_for_scoring`, selects no protocol.
 *
 * Freshness-aware: a `gathered` decision built on time-sensitive real values
 * (TVL/APY/APY-30d) is only EFFECTIVE while those 12V confirmations are fresh;
 * otherwise it degrades to `stale` and does not count. `PROTOCOL_SELECTION_IMPLEMENTED
 * = false`; `productionReady = false`. No value is invented here.
 */
import type { ProtocolRiskRubricDimensionId } from "./protocolRiskRubric";
import type { ProtocolRealValueReviewerRole } from "./protocolSolLiquidStakingRealValueConfirmations";
import {
  getConfirmedRealValues,
} from "./protocolSolLiquidStakingRealValueConfirmations";

export const PROTOCOL_EVIDENCE_GATHER_DECISIONS_EXIST = true;
export const PROTOCOL_EVIDENCE_GATHER_DECISIONS_APPROVE_RUBRIC = false;
export const PROTOCOL_EVIDENCE_GATHER_DECISIONS_ASSIGN_SCORES = false;
export const PROTOCOL_EVIDENCE_GATHER_DECISIONS_AFFECT_PRODUCTION = false;
export const PROTOCOL_EVIDENCE_GATHER_DECISIONS_ENABLE_SELECTION = false;
export const PROTOCOL_EVIDENCE_GATHER_DECISIONS_UPDATE_METADATA = false;
export const PROTOCOL_EVIDENCE_GATHER_DECISIONS_MUTATE_EVIDENCE = false;

export type ProtocolEvidenceGatherDecisionStatus = "gathered" | "not_gathered" | "needs_review" | "stale" | "rejected";

export type ProtocolEvidenceGatherDecisionSourceKind =
  | "real_value_confirmation"
  | "source_verification"
  | "manual_review"
  | "evidence_draft";

export interface ProtocolEvidenceGatherDecision {
  protocolId: string;
  lstSymbol: string;
  dimensionId: ProtocolRiskRubricDimensionId;
  status: ProtocolEvidenceGatherDecisionStatus;
  decidedAt: string;
  reviewer: string;
  reviewerRole: ProtocolRealValueReviewerRole;
  sourceKinds: ProtocolEvidenceGatherDecisionSourceKind[];
  basedOnCategories: string[];
  basedOnSourceNames: string[];
  reasons: string[];
  unresolvedQuestions: string[];
  productionMetadataUpdated: false;
  evidenceDraftMutated: false;
  scoreAssigned: false;
}

export interface ProtocolEvidenceGatherDecisionSummary {
  totalDecisions: number;
  gathered: number;
  notGathered: number;
  needsReview: number;
  stale: number;
  rejected: number;
  productionMetadataUpdatedCount: 0;
  evidenceDraftMutatedCount: 0;
  scoreAssignedCount: 0;
  protocolsCovered: string[];
  dimensionsCovered: ProtocolRiskRubricDimensionId[];
}

export interface ProtocolEvidenceGatherDecisionEvaluation {
  protocolId: string;
  lstSymbol: string;
  gatheredDimensions: ProtocolRiskRubricDimensionId[];
  missingDimensions: ProtocolRiskRubricDimensionId[];
  staleDimensions: ProtocolRiskRubricDimensionId[];
  candidateReadyForReview: boolean;
  approvedForScoring: false;
  scoreAssigned: false;
  productionAffected: false;
}

export const ALL_RUBRIC_DIMENSIONS: readonly ProtocolRiskRubricDimensionId[] = [
  "audit_security",
  "maturity",
  "tvl_adoption",
  "withdrawal_fee_transparency",
  "operational_dependency_risk",
  "incident_history",
];

/** Real-value categories a `tvl_adoption` gather decision depends on. */
const TVL_ADOPTION_REQUIRED_CATEGORIES = ["tvl", "apy", "apy_30d_average"] as const;

const REVIEWER = "Ashot Gyulzatyan";
const REVIEWER_ROLE: ProtocolRealValueReviewerRole = "founder";
const DECIDED_AT = "2026-07-12T00:00:00Z";

function gatheredTvlDecision(protocolId: string, lstSymbol: string): ProtocolEvidenceGatherDecision {
  return {
    protocolId,
    lstSymbol,
    dimensionId: "tvl_adoption",
    status: "gathered",
    decidedAt: DECIDED_AT,
    reviewer: REVIEWER,
    reviewerRole: REVIEWER_ROLE,
    sourceKinds: ["real_value_confirmation"],
    basedOnCategories: ["tvl", "apy", "apy_30d_average"],
    basedOnSourceNames: [`DefiLlama pool (${lstSymbol})`],
    reasons: ["Fresh reviewer-confirmed TVL, APY, and APY-30d values exist in the non-production real value-confirmation ledger."],
    unresolvedQuestions: [],
    productionMetadataUpdated: false,
    evidenceDraftMutated: false,
    scoreAssigned: false,
  };
}

/**
 * The gather-decision ledger. Only `tvl_adoption` decisions exist (from the 12V
 * real-value ledger). INF is `needs_review` (no exact real values confirmed). The
 * other five dimensions have NO decision and remain incomplete.
 */
export const SOL_LST_EVIDENCE_GATHER_DECISIONS: readonly ProtocolEvidenceGatherDecision[] = [
  gatheredTvlDecision("jupiter", "JupSOL"),
  gatheredTvlDecision("marinade", "mSOL"),
  gatheredTvlDecision("jito", "JitoSOL"),
  gatheredTvlDecision("blazestake", "bSOL"),
  {
    protocolId: "sanctum",
    lstSymbol: "INF",
    dimensionId: "tvl_adoption",
    status: "needs_review",
    decidedAt: DECIDED_AT,
    reviewer: REVIEWER,
    reviewerRole: REVIEWER_ROLE,
    sourceKinds: ["real_value_confirmation"],
    basedOnCategories: [],
    basedOnSourceNames: [],
    reasons: ["Exact real TVL/APY/APY-30d values are not confirmed in the 12V ledger."],
    unresolvedQuestions: ["Supply exact reviewer-confirmed INF TVL/APY/APY-30d values."],
    productionMetadataUpdated: false,
    evidenceDraftMutated: false,
    scoreAssigned: false,
  },
];

export function getSolLstEvidenceGatherDecisions(protocolId?: string): ProtocolEvidenceGatherDecision[] {
  return protocolId == null
    ? [...SOL_LST_EVIDENCE_GATHER_DECISIONS]
    : SOL_LST_EVIDENCE_GATHER_DECISIONS.filter((d) => d.protocolId === protocolId);
}

export function getGatherDecisionsByDimension(dimensionId: ProtocolRiskRubricDimensionId): ProtocolEvidenceGatherDecision[] {
  return SOL_LST_EVIDENCE_GATHER_DECISIONS.filter((d) => d.dimensionId === dimensionId);
}

export function getGatherDecisionsByStatus(status: ProtocolEvidenceGatherDecisionStatus): ProtocolEvidenceGatherDecision[] {
  return SOL_LST_EVIDENCE_GATHER_DECISIONS.filter((d) => d.status === status);
}

/**
 * Freshness-aware EFFECTIVE status of a decision at `asOf`. A `gathered`
 * `tvl_adoption` decision is only effective while all required real-value
 * confirmations are still `confirmed` (fresh); otherwise `stale` or `needs_review`.
 */
export function validateEvidenceGatherDecision(
  decision: ProtocolEvidenceGatherDecision,
  asOf?: string
): ProtocolEvidenceGatherDecisionStatus {
  if (decision.status !== "gathered") return decision.status;
  // A gathered tvl_adoption decision depends on the fresh 12V confirmations.
  if (decision.dimensionId === "tvl_adoption") {
    const confirmedCats = new Set(getConfirmedRealValues(decision.protocolId, undefined, asOf).map((c) => c.category));
    const allFreshConfirmed = TVL_ADOPTION_REQUIRED_CATEGORIES.every((cat) => confirmedCats.has(cat as never));
    if (allFreshConfirmed) return "gathered";
    // Distinguish "was confirmed but went stale" from "never confirmed".
    const anyLedgerRow = getSolLstEvidenceGatherDecisions(decision.protocolId).length > 0;
    return anyLedgerRow ? "stale" : "needs_review";
  }
  return decision.status;
}

/** Decisions with their freshness-aware effective status applied. */
export function getEffectiveGatherDecisions(protocolId?: string, asOf?: string): ProtocolEvidenceGatherDecision[] {
  return getSolLstEvidenceGatherDecisions(protocolId).map((d) => ({ ...d, status: validateEvidenceGatherDecision(d, asOf) }));
}

export function summarizeSolLstEvidenceGatherDecisions(asOf?: string): ProtocolEvidenceGatherDecisionSummary {
  const effective = getEffectiveGatherDecisions(undefined, asOf);
  const count = (s: ProtocolEvidenceGatherDecisionStatus) => effective.filter((d) => d.status === s).length;
  return {
    totalDecisions: effective.length,
    gathered: count("gathered"),
    notGathered: count("not_gathered"),
    needsReview: count("needs_review"),
    stale: count("stale"),
    rejected: count("rejected"),
    productionMetadataUpdatedCount: 0,
    evidenceDraftMutatedCount: 0,
    scoreAssignedCount: 0,
    protocolsCovered: [...new Set(effective.map((d) => d.protocolId))],
    dimensionsCovered: [...new Set(effective.map((d) => d.dimensionId))],
  };
}

/**
 * Per-candidate readiness from the gather-decision ledger (freshness-aware).
 * `candidateReadyForReview` requires ALL six rubric dimensions `gathered`.
 * Never mutates drafts, approves scoring, assigns a score, or affects production.
 */
export function evaluateEvidenceGatherDecisionCoverage(
  protocolId: string,
  asOf?: string
): ProtocolEvidenceGatherDecisionEvaluation {
  return evaluateCandidateReadinessFromGatherDecisions(protocolId, asOf);
}

/** Alias with the spec's name; identical behavior. */
export function evaluateCandidateReadinessFromGatherDecisions(
  protocolId: string,
  asOf?: string
): ProtocolEvidenceGatherDecisionEvaluation {
  const effective = getEffectiveGatherDecisions(protocolId, asOf);
  const lstSymbol = effective[0]?.lstSymbol ?? SOL_LST_EVIDENCE_GATHER_DECISIONS.find((d) => d.protocolId === protocolId)?.lstSymbol ?? protocolId;

  const gatheredDimensions = ALL_RUBRIC_DIMENSIONS.filter((dim) =>
    effective.some((d) => d.dimensionId === dim && d.status === "gathered")
  );
  const staleDimensions = ALL_RUBRIC_DIMENSIONS.filter((dim) =>
    effective.some((d) => d.dimensionId === dim && d.status === "stale")
  );
  const missingDimensions = ALL_RUBRIC_DIMENSIONS.filter((dim) => !gatheredDimensions.includes(dim));

  return {
    protocolId,
    lstSymbol,
    gatheredDimensions,
    missingDimensions,
    staleDimensions,
    candidateReadyForReview: gatheredDimensions.length === ALL_RUBRIC_DIMENSIONS.length,
    approvedForScoring: false,
    scoreAssigned: false,
    productionAffected: false,
  };
}
