/**
 * solLiquidStakingMsolReadOnlyApproval — Step 14K. The approval gate that decides
 * whether Marinade · mSOL can appear as a READ-ONLY REVIEW candidate in the product
 * UI, based on its completed evidence + the 14J risk score (7.40) meeting a >= 7
 * threshold, with the SAM incident risk explicitly acknowledged.
 *
 * LIMITED APPROVAL. It approves mSOL to appear as an ALTERNATIVE protocol to review.
 * It does NOT make mSOL the selected protocol or the winner, enable multi-protocol
 * selection, replace JitoSOL, update live recommendations, expose mSOL in the UI (a
 * later step), or enable transactions/signatures. It never mutates the base candidate
 * registry, so `getApprovedSolLiquidStakingCandidates()` (selector-facing) stays
 * Jito-only; the read-only-review list is a separate, non-mutating preview. Not
 * imported by any live/UI file.
 */
import {
  getSolLiquidStakingCandidates,
  getSolLiquidStakingCandidateById,
} from "./solLiquidStakingCandidateRegistry";
import {
  getMsolRiskScoreAssignment,
  evaluateMsolRiskScoreAssignmentStatus,
} from "./solLiquidStakingMsolRiskScore";

export const SOL_LST_MSOL_READ_ONLY_APPROVAL_EXISTS = true;
export const SOL_LST_MSOL_READ_ONLY_APPROVAL_APPROVES_REVIEW_EXPOSURE = true;
export const SOL_LST_MSOL_READ_ONLY_APPROVAL_SELECTS_PROTOCOL_WINNER = false;
export const SOL_LST_MSOL_READ_ONLY_APPROVAL_ENABLES_MULTI_PROTOCOL_SELECTION = false;
export const SOL_LST_MSOL_READ_ONLY_APPROVAL_UPDATES_LIVE_RECOMMENDATIONS = false;
export const SOL_LST_MSOL_READ_ONLY_APPROVAL_REPLACES_JITO = false;
export const SOL_LST_MSOL_READ_ONLY_APPROVAL_ENABLES_TRANSACTIONS = false;
export const SOL_LST_MSOL_READ_ONLY_APPROVAL_REQUIRES_WALLET_SIGNATURE = false;

/** Read-only review exposure requires a risk score at or above this threshold. */
export const MSOL_READ_ONLY_APPROVAL_MIN_RISK_SCORE = 7;

/** Ashot explicitly acknowledged the SAM incident + operational risks, and approved. */
const MSOL_INCIDENT_RISK_ACKNOWLEDGED = true;
const MSOL_READ_ONLY_APPROVAL_RECORDED = true;

export type MsolReviewerRole = "founder" | "product" | "risk" | "engineering" | "compliance";

const ACKNOWLEDGED_RISKS: readonly string[] = [
  "The Stake Auction Market unstake-priority logic bug caused missed advertised rewards over epochs 652-777.",
  "Operational dependencies include the Stake Auction Market, stake pool mechanics, an LP/Jupiter instant-liquidity dependency, and multisig governance.",
  "Delayed unstake timing is epoch-based, not fixed hours.",
  "Instant unstake can involve variable market pricing / liquidity.",
];

const APPROVAL_LIMITATIONS: readonly string[] = [
  "Approval is for read-only review exposure only — it is not an endorsement.",
  "Approval is not a safety claim and does not rank mSOL above other protocols.",
  "Approval does not select mSOL as the protocol winner, replace JitoSOL, or enable multi-protocol selection.",
  "Approval does not enable transactions, signatures, swaps, deposits, or staking execution.",
  "The score and approval hold only while the evidence remains within the 24-hour freshness window.",
];

export interface MsolReadOnlyApprovalDecision {
  protocolId: "marinade";
  protocolName: "Marinade";
  assetSymbol: "mSOL";

  decision: "approved_for_read_only_review";
  decisionStatus: "active";

  approvedAt: string;
  approvedBy: string;
  reviewerRole: MsolReviewerRole;

  basis: {
    evidenceComplete: true;
    evidenceFresh: true;
    readyForRiskGate: true;
    riskScore: number;
    minimumRiskScoreRequired: 7;
    riskScoreStatus: "assigned_for_review";
  };

  acknowledgedRisks: string[];

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

/** A risk score qualifies for read-only review exposure only at/above the threshold. */
export function isRiskScoreAboveReadOnlyThreshold(score: number): boolean {
  return score >= MSOL_READ_ONLY_APPROVAL_MIN_RISK_SCORE;
}

interface ApprovalOptions {
  checkedAt?: string;
}

export interface MsolReadOnlyApprovalStatus {
  protocolId: "marinade";
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
 * Evaluate whether mSOL is approvable for read-only review exposure at `checkedAt`.
 * Requires: a risk score >= 7 with status `assigned_for_review`, fresh evidence,
 * `readyForRiskGate`, an acknowledged incident risk, and a recorded approval. Never
 * selects mSOL, updates live recommendations, or enables execution.
 */
export function evaluateMsolReadOnlyApprovalStatus(options: ApprovalOptions = {}): MsolReadOnlyApprovalStatus {
  const checkedAt = options.checkedAt ?? new Date().toISOString();
  const scoreStatus = evaluateMsolRiskScoreAssignmentStatus({ checkedAt });
  const score = scoreStatus.score;

  const blockers: string[] = [];
  if (score == null) blockers.push("missing_risk_score");
  else if (!isRiskScoreAboveReadOnlyThreshold(score)) blockers.push("risk_score_below_threshold");
  if (!scoreStatus.evidenceFresh) blockers.push("evidence_stale");
  if (!scoreStatus.readyForRiskGate) blockers.push("not_ready_for_risk_gate");
  if (!MSOL_INCIDENT_RISK_ACKNOWLEDGED) blockers.push("incident_risk_not_acknowledged");
  if (!MSOL_READ_ONLY_APPROVAL_RECORDED) blockers.push("approval_not_recorded");

  const approved = blockers.length === 0;
  return {
    protocolId: "marinade",
    approvedForReadOnlyRecommendation: approved,
    approvedForReviewExposure: approved,
    ...(score != null ? { riskScore: score } : {}),
    riskScoreThreshold: MSOL_READ_ONLY_APPROVAL_MIN_RISK_SCORE,
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
 * The active read-only review approval for mSOL, or `null` when the gate is not met.
 * Never approves selection, replaces JitoSOL, or enables execution.
 */
export function getMsolReadOnlyApprovalDecision(options: ApprovalOptions = {}): MsolReadOnlyApprovalDecision | null {
  const checkedAt = options.checkedAt ?? new Date().toISOString();
  const status = evaluateMsolReadOnlyApprovalStatus({ checkedAt });
  const assignment = getMsolRiskScoreAssignment({ checkedAt });
  if (!status.approvedForReadOnlyRecommendation || assignment == null) return null;

  return {
    protocolId: "marinade",
    protocolName: "Marinade",
    assetSymbol: "mSOL",

    decision: "approved_for_read_only_review",
    decisionStatus: "active",

    approvedAt: checkedAt,
    approvedBy: "Ashot",
    reviewerRole: "founder",

    basis: {
      evidenceComplete: true,
      evidenceFresh: true,
      readyForRiskGate: true,
      riskScore: assignment.score,
      minimumRiskScoreRequired: MSOL_READ_ONLY_APPROVAL_MIN_RISK_SCORE,
      riskScoreStatus: "assigned_for_review",
    },

    acknowledgedRisks: [...ACKNOWLEDGED_RISKS],

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

    limitations: [...APPROVAL_LIMITATIONS],
  };
}

/* ------------------------------------------------------------------ *
 * Non-live read-only-review preview. This is SEPARATE from selector eligibility:
 * the base registry + `getApprovedSolLiquidStakingCandidates()` stay Jito-only, and
 * this preview additionally includes mSOL (marked review-approved) when the approval
 * is active — without mutating the registry or selecting anything.
 * ------------------------------------------------------------------ */
export interface SolLstReviewApprovedCandidate {
  protocolId: string;
  protocolName: string;
  lstSymbol: string;
  status: string;
  approvalStatus: string;
  approvedForReadOnlyRecommendation: boolean;
  selectedByProtocolLogic: false;
  currentWinner: false;
  riskScore?: number;
  riskScoreStatus: string;
}

/**
 * Candidates approved for READ-ONLY REVIEW exposure: JitoSOL (already active) plus
 * mSOL when its read-only approval is active. A non-mutating derived view — it never
 * changes the base registry, the selector-facing approved list, or selection state.
 */
export function getReadOnlyReviewApprovedSolLiquidStakingCandidates(options: ApprovalOptions = {}): SolLstReviewApprovedCandidate[] {
  const checkedAt = options.checkedAt ?? new Date().toISOString();
  const out: SolLstReviewApprovedCandidate[] = [];

  const jito = getSolLiquidStakingCandidateById("jito");
  if (jito) {
    out.push({
      protocolId: jito.protocolId,
      protocolName: jito.protocolName,
      lstSymbol: jito.lstSymbol,
      status: jito.status,
      approvalStatus: jito.approvalStatus,
      approvedForReadOnlyRecommendation: true,
      selectedByProtocolLogic: false,
      currentWinner: false,
      ...(jito.risk.riskScore != null ? { riskScore: jito.risk.riskScore } : {}),
      riskScoreStatus: jito.risk.riskScoreStatus,
    });
  }

  const decision = getMsolReadOnlyApprovalDecision({ checkedAt });
  if (decision) {
    const base = getSolLiquidStakingCandidates().find((c) => c.protocolId === "marinade");
    out.push({
      protocolId: "marinade",
      protocolName: "Marinade",
      lstSymbol: "mSOL",
      // Base registry status is unchanged (still staged_candidate); the review
      // approval is expressed via approvalStatus + approvedForReadOnlyRecommendation.
      status: base?.status ?? "staged_candidate",
      approvalStatus: "approved_read_only_review",
      approvedForReadOnlyRecommendation: true,
      selectedByProtocolLogic: false,
      currentWinner: false,
      riskScore: decision.basis.riskScore,
      riskScoreStatus: "assigned_for_review",
    });
  }

  return out;
}
