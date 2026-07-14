/**
 * solNativeStakingBaselineReadOnlyApproval — Step 14P. The approval gate for the Native
 * SOL / Jupiter Native Stake BASELINE candidate.
 *
 * OUTCOME IN 14P: BLOCKED (incomplete evidence). Native-staking evidence is missing its
 * three market categories, so `readyForRiskGate` is false and NO risk score is assigned.
 * With no score there is nothing to compare against the 7.0 threshold, so the approval gate
 * cannot pass: `getNativeStakingBaselineReadOnlyApprovalDecision()` returns `null`, the
 * baseline is NOT surfaced in Real Wallet / Demo / the approved review section, and it is
 * NOT added to any read-only-review-approved list. Only a clearly-labelled, internal
 * `/testing` BLOCKED evidence view is produced (`getNativeStakingBaselineBlockedReviewSummary`).
 *
 * It never approves selection, replaces JitoSOL, enables the disabled selector comparison,
 * updates live recommendations, or enables transactions/signatures. This is a native stake
 * account baseline, NOT an LST and NOT JupSOL.
 */
import {
  getNativeStakingBaselineRiskScoreAssignment,
  evaluateNativeStakingBaselineRiskScoreAssignmentStatus,
  NATIVE_STAKING_RISK_RATIONALE,
} from "./solNativeStakingBaselineRiskScore";
import {
  summarizeNativeSolStakeEvidence,
  getNativeSolStakeEvidenceRecords,
  NATIVE_STAKING_BASELINE_IDENTITY,
  type NativeStakingEvidenceOptions,
  type NativeSolStakeEvidenceCategory,
} from "./solNativeStakingBaselineEvidence";

export const SOL_NATIVE_STAKING_BASELINE_READ_ONLY_APPROVAL_EXISTS = true;
/** No score is assigned (evidence incomplete), so review exposure is NOT approved. */
export const SOL_NATIVE_STAKING_BASELINE_READ_ONLY_APPROVAL_APPROVES_REVIEW_EXPOSURE = false;
export const SOL_NATIVE_STAKING_BASELINE_READ_ONLY_APPROVAL_SELECTS_PROTOCOL_WINNER = false;
export const SOL_NATIVE_STAKING_BASELINE_READ_ONLY_APPROVAL_ENABLES_SELECTOR_COMPARISON = false;
export const SOL_NATIVE_STAKING_BASELINE_READ_ONLY_APPROVAL_UPDATES_LIVE_RECOMMENDATIONS = false;
export const SOL_NATIVE_STAKING_BASELINE_READ_ONLY_APPROVAL_REPLACES_JITO = false;
export const SOL_NATIVE_STAKING_BASELINE_READ_ONLY_APPROVAL_ENABLES_TRANSACTIONS = false;
export const SOL_NATIVE_STAKING_BASELINE_READ_ONLY_APPROVAL_REQUIRES_WALLET_SIGNATURE = false;

/** Read-only review exposure requires a risk score at or above this threshold. */
export const NATIVE_STAKING_READ_ONLY_APPROVAL_MIN_RISK_SCORE = 7;

const NATIVE_STAKING_MATERIAL_RISK_ACKNOWLEDGED = true;
const NATIVE_STAKING_READ_ONLY_APPROVAL_RECORDED = true;

export type NativeStakingReviewerRole = "founder" | "product" | "risk" | "engineering" | "compliance";

export interface NativeStakingReadOnlyApprovalDecision {
  protocolId: "jupiter_native_stake";
  protocolName: "Jupiter Native Stake";
  assetSymbol: "SOL";
  candidateType: "native_staking";
  isLiquidStakingToken: false;
  decision: "approved_for_read_only_review";
  decisionStatus: "active";
  approvedAt: string;
  approvedBy: string;
  reviewerRole: NativeStakingReviewerRole;
  basis: { riskScore: number; minimumRiskScoreRequired: 7; riskScoreStatus: "assigned_for_review" };
  approvalScope: {
    approvedForReadOnlyRecommendation: true;
    approvedForReviewExposure: true;
    approvedForProtocolSelection: false;
    selectedByProtocolLogic: false;
    currentWinner: false;
    updatesLiveRecommendations: false;
    enablesMultiProtocolSelection: false;
    transactionsEnabled: false;
    walletSignatureRequired: false;
  };
  limitations: string[];
}

export function isRiskScoreAboveReadOnlyThreshold(score: number): boolean {
  return score >= NATIVE_STAKING_READ_ONLY_APPROVAL_MIN_RISK_SCORE;
}

export interface NativeStakingReadOnlyApprovalStatus {
  protocolId: "jupiter_native_stake";
  isLiquidStakingToken: false;
  approvedForReadOnlyRecommendation: boolean;
  approvedForReviewExposure: boolean;
  riskScore?: number;
  riskScoreThreshold: 7;
  evidenceFresh: boolean;
  readyForRiskGate: boolean;
  selectedByProtocolLogic: false;
  currentWinner: false;
  updatesLiveRecommendations: false;
  enablesMultiProtocolSelection: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;
  blockers: string[];
}

/**
 * Evaluate whether native staking is approvable for read-only review exposure. Requires a
 * risk score >= 7 with fresh, complete evidence. In 14P the evidence is incomplete → no
 * score → blockers include `missing_risk_score` (plus the evidence blockers). Never selects
 * or enables execution.
 */
export function evaluateNativeStakingBaselineReadOnlyApprovalStatus(options: NativeStakingEvidenceOptions = {}): NativeStakingReadOnlyApprovalStatus {
  const checkedAt = options.checkedAt ?? new Date().toISOString();
  const scoreStatus = evaluateNativeStakingBaselineRiskScoreAssignmentStatus({ checkedAt });
  const score = scoreStatus.score;

  const blockers: string[] = [];
  if (score == null) blockers.push("missing_risk_score");
  else if (!isRiskScoreAboveReadOnlyThreshold(score)) blockers.push("risk_score_below_threshold");
  if (!scoreStatus.readyForRiskGate) blockers.push("not_ready_for_risk_gate");
  if (!scoreStatus.evidenceFresh) blockers.push("evidence_incomplete_or_stale");
  if (!NATIVE_STAKING_MATERIAL_RISK_ACKNOWLEDGED) blockers.push("material_risk_not_acknowledged");
  if (!NATIVE_STAKING_READ_ONLY_APPROVAL_RECORDED) blockers.push("approval_not_recorded");

  const approved = blockers.length === 0;
  return {
    protocolId: "jupiter_native_stake",
    isLiquidStakingToken: false,
    approvedForReadOnlyRecommendation: approved,
    approvedForReviewExposure: approved,
    ...(score != null ? { riskScore: score } : {}),
    riskScoreThreshold: NATIVE_STAKING_READ_ONLY_APPROVAL_MIN_RISK_SCORE,
    evidenceFresh: scoreStatus.evidenceFresh,
    readyForRiskGate: scoreStatus.readyForRiskGate,
    selectedByProtocolLogic: false,
    currentWinner: false,
    updatesLiveRecommendations: false,
    enablesMultiProtocolSelection: false,
    transactionsEnabled: false,
    walletSignatureRequired: false,
    blockers,
  };
}

/**
 * The active read-only review approval for native staking, or `null` when the gate is not
 * met. In 14P it always returns `null` (no risk score — evidence incomplete).
 */
export function getNativeStakingBaselineReadOnlyApprovalDecision(options: NativeStakingEvidenceOptions = {}): NativeStakingReadOnlyApprovalDecision | null {
  const checkedAt = options.checkedAt ?? new Date().toISOString();
  const status = evaluateNativeStakingBaselineReadOnlyApprovalStatus({ checkedAt });
  const assignment = getNativeStakingBaselineRiskScoreAssignment({ checkedAt });
  if (!status.approvedForReadOnlyRecommendation || assignment == null) return null;

  return {
    protocolId: "jupiter_native_stake",
    protocolName: "Jupiter Native Stake",
    assetSymbol: "SOL",
    candidateType: "native_staking",
    isLiquidStakingToken: false,
    decision: "approved_for_read_only_review",
    decisionStatus: "active",
    approvedAt: checkedAt,
    approvedBy: "Ashot",
    reviewerRole: "founder",
    basis: { riskScore: assignment.score, minimumRiskScoreRequired: NATIVE_STAKING_READ_ONLY_APPROVAL_MIN_RISK_SCORE, riskScoreStatus: "assigned_for_review" },
    approvalScope: {
      approvedForReadOnlyRecommendation: true,
      approvedForReviewExposure: true,
      approvedForProtocolSelection: false,
      selectedByProtocolLogic: false,
      currentWinner: false,
      updatesLiveRecommendations: false,
      enablesMultiProtocolSelection: false,
      transactionsEnabled: false,
      walletSignatureRequired: false,
    },
    limitations: [
      "Approval is for read-only review exposure only — it is not an endorsement.",
      "Approval does not select native staking, replace JitoSOL, or enable multi-protocol selection.",
      "Approval does not enable transactions, signatures, staking, delegation, withdrawal, or execution.",
    ],
  };
}

/* ------------------------------------------------------------------ *
 * Internal (NON product-facing) BLOCKED evidence view for /testing.
 * ------------------------------------------------------------------ */
function num(v: unknown): number | undefined {
  return typeof v === "number" ? v : undefined;
}
function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

export interface NativeStakingBlockedReviewSummary {
  protocolId: "jupiter_native_stake";
  protocolName: "Jupiter Native Stake";
  assetSymbol: "SOL";
  candidateType: "native_staking";
  isLiquidStakingToken: false;

  reviewState: "blocked_incomplete_evidence";
  statusLabel: string;
  notLstLabel: string;
  productFacing: false;

  riskScore?: number;
  riskScoreThreshold: 7;

  evidenceComplete: boolean;
  evidenceFresh: boolean;
  missingCategories: NativeSolStakeEvidenceCategory[];

  mechanics?: { unstakeTiming?: string; withdrawalMechanics?: string; validatorCommissionPct?: number; annualManagementFeePct?: number };
  evidence?: { securityModel?: string; operationalRisk?: string; incidentReview?: string };

  rationale: typeof NATIVE_STAKING_RISK_RATIONALE;

  approvedForReadOnlyRecommendation: false;
  approvedForReviewExposure: false;
  selectedByProtocolLogic: false;
  currentWinner: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;

  blockers: string[];
}

/**
 * Internal blocked-evidence summary for native staking (for the clearly-labelled `/testing`
 * BLOCKED fixture ONLY — never the product-facing approved review section). Surfaces the
 * recorded mechanics/evidence + the missing market categories + the not-an-LST distinction,
 * with every approval/selection/transaction flag false.
 */
export function getNativeStakingBaselineBlockedReviewSummary(options: NativeStakingEvidenceOptions = {}): NativeStakingBlockedReviewSummary {
  const checkedAt = options.checkedAt ?? new Date().toISOString();
  const summary = summarizeNativeSolStakeEvidence({ checkedAt });
  const status = evaluateNativeStakingBaselineReadOnlyApprovalStatus({ checkedAt });
  const rows = getNativeSolStakeEvidenceRecords({ checkedAt });
  const val = (cat: NativeSolStakeEvidenceCategory) => rows.find((r) => r.category === cat)?.value;

  return {
    protocolId: "jupiter_native_stake",
    protocolName: "Jupiter Native Stake",
    assetSymbol: "SOL",
    candidateType: "native_staking",
    isLiquidStakingToken: false,

    reviewState: "blocked_incomplete_evidence",
    statusLabel: "Not cleared for read-only review — native-staking market evidence incomplete (internal evidence view only)",
    notLstLabel: "Not a liquid staking token",
    productFacing: false,

    ...(status.riskScore != null ? { riskScore: status.riskScore } : {}),
    riskScoreThreshold: NATIVE_STAKING_READ_ONLY_APPROVAL_MIN_RISK_SCORE,

    evidenceComplete: summary.readyForRiskGate,
    evidenceFresh: summary.allEvidenceFresh,
    missingCategories: summary.missingCategories,

    mechanics: {
      ...(str(val("unstake_time")) != null ? { unstakeTiming: str(val("unstake_time")) } : {}),
      ...(str(val("withdrawal_mechanics")) != null ? { withdrawalMechanics: str(val("withdrawal_mechanics")) } : {}),
      ...(num(val("validator_commission")) != null ? { validatorCommissionPct: num(val("validator_commission")) } : {}),
      ...(num(val("annual_management_fee")) != null ? { annualManagementFeePct: num(val("annual_management_fee")) } : {}),
    },
    evidence: {
      ...(str(val("security_model")) != null ? { securityModel: str(val("security_model")) } : {}),
      ...(str(val("operational_risk")) != null ? { operationalRisk: str(val("operational_risk")) } : {}),
      ...(str(val("incident_review")) != null ? { incidentReview: str(val("incident_review")) } : {}),
    },

    rationale: NATIVE_STAKING_RISK_RATIONALE,

    approvedForReadOnlyRecommendation: false,
    approvedForReviewExposure: false,
    selectedByProtocolLogic: false,
    currentWinner: false,
    transactionsEnabled: false,
    walletSignatureRequired: false,

    blockers: status.blockers,
  };
}

/** Void reference so the identity constant is available to consumers/tests. */
export const NATIVE_STAKING_BASELINE_APPROVAL_IDENTITY = NATIVE_STAKING_BASELINE_IDENTITY;
