/**
 * solLiquidStakingBsolReadOnlyApproval — Step 14N. The approval gate that decides
 * whether BlazeStake · bSOL can appear as a READ-ONLY REVIEW candidate in the product
 * UI, based on its completed 14N evidence + the bSOL risk score (7.35) meeting a >= 7
 * threshold, with the smaller-TVL / DeFi-surface operational risks explicitly
 * acknowledged. Mirrors the mSOL (14K/14L) and JupSOL (14M) approval modules.
 *
 * LIMITED APPROVAL. It approves bSOL to appear as an ALTERNATIVE protocol to review.
 * It does NOT make bSOL the selected protocol or the winner, enable multi-protocol
 * selection, replace JitoSOL, update live recommendations, or enable
 * transactions/signatures. It never mutates the base candidate registry, so
 * `getApprovedSolLiquidStakingCandidates()` (selector-facing) stays Jito-only; the
 * read-only-review list is a separate, non-mutating preview.
 */
import type { ProtocolReviewCandidateDisplay } from "./engineTypes";
import {
  getSolLiquidStakingCandidates,
  getSolLiquidStakingCandidateById,
} from "./solLiquidStakingCandidateRegistry";
import {
  getBsolRiskScoreAssignment,
  evaluateBsolRiskScoreAssignmentStatus,
} from "./solLiquidStakingBsolRiskScore";
import { getSolLstFreshEvidenceRecords } from "./solLiquidStakingFreshEvidenceRecords";
import type { SolLstReviewApprovedCandidate } from "./solLiquidStakingMsolReadOnlyApproval";

export const SOL_LST_BSOL_READ_ONLY_APPROVAL_EXISTS = true;
export const SOL_LST_BSOL_READ_ONLY_APPROVAL_APPROVES_REVIEW_EXPOSURE = true;
export const SOL_LST_BSOL_READ_ONLY_APPROVAL_SELECTS_PROTOCOL_WINNER = false;
export const SOL_LST_BSOL_READ_ONLY_APPROVAL_ENABLES_MULTI_PROTOCOL_SELECTION = false;
export const SOL_LST_BSOL_READ_ONLY_APPROVAL_UPDATES_LIVE_RECOMMENDATIONS = false;
export const SOL_LST_BSOL_READ_ONLY_APPROVAL_REPLACES_JITO = false;
export const SOL_LST_BSOL_READ_ONLY_APPROVAL_ENABLES_TRANSACTIONS = false;
export const SOL_LST_BSOL_READ_ONLY_APPROVAL_REQUIRES_WALLET_SIGNATURE = false;

/** Read-only review exposure requires a risk score at or above this threshold. */
export const BSOL_READ_ONLY_APPROVAL_MIN_RISK_SCORE = 7;

/** Ashot acknowledged bSOL's operational risks (smaller TVL, DeFi surface) + approved. */
const BSOL_OPERATIONAL_RISK_ACKNOWLEDGED = true;
const BSOL_READ_ONLY_APPROVAL_RECORDED = true;

export type BsolReviewerRole = "founder" | "product" | "risk" | "engineering" | "compliance";

const ACKNOWLEDGED_RISKS: readonly string[] = [
  "bSOL has the smallest TVL of the reviewed candidates (~$67.1M), implying lower adoption and instant-unstake liquidity depth.",
  "Delayed (direct) unstake timing is epoch-based (~2-3 days via native stake-account deactivation) and is not published by BlazeStake as fixed hours.",
  "BlazeStake carries a broader DeFi feature surface (BLZE rewards, custom liquidity) beyond core staking.",
  "The incident review is point-in-time: no independent incident was found, which is not a verified clean-history claim.",
];

const APPROVAL_LIMITATIONS: readonly string[] = [
  "Approval is for read-only review exposure only — it is not an endorsement.",
  "Approval is not a safety claim and does not rank bSOL above other protocols.",
  "Approval does not select bSOL as the protocol winner, replace JitoSOL, or enable multi-protocol selection.",
  "Approval does not enable transactions, signatures, swaps, deposits, or staking execution.",
  "The score and approval hold only while the evidence remains within the 24-hour freshness window.",
];

export interface BsolReadOnlyApprovalDecision {
  protocolId: "blazestake";
  protocolName: "BlazeStake";
  assetSymbol: "bSOL";

  decision: "approved_for_read_only_review";
  decisionStatus: "active";

  approvedAt: string;
  approvedBy: string;
  reviewerRole: BsolReviewerRole;

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
  return score >= BSOL_READ_ONLY_APPROVAL_MIN_RISK_SCORE;
}

interface ApprovalOptions {
  checkedAt?: string;
}

export interface BsolReadOnlyApprovalStatus {
  protocolId: "blazestake";
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
 * Evaluate whether bSOL is approvable for read-only review exposure at `checkedAt`.
 * Requires: a risk score >= 7 with status `assigned_for_review`, fresh evidence,
 * `readyForRiskGate`, acknowledged operational risk, and a recorded approval. Never
 * selects bSOL, updates live recommendations, or enables execution.
 */
export function evaluateBsolReadOnlyApprovalStatus(options: ApprovalOptions = {}): BsolReadOnlyApprovalStatus {
  const checkedAt = options.checkedAt ?? new Date().toISOString();
  const scoreStatus = evaluateBsolRiskScoreAssignmentStatus({ checkedAt });
  const score = scoreStatus.score;

  const blockers: string[] = [];
  if (score == null) blockers.push("missing_risk_score");
  else if (!isRiskScoreAboveReadOnlyThreshold(score)) blockers.push("risk_score_below_threshold");
  if (!scoreStatus.evidenceFresh) blockers.push("evidence_stale");
  if (!scoreStatus.readyForRiskGate) blockers.push("not_ready_for_risk_gate");
  if (!BSOL_OPERATIONAL_RISK_ACKNOWLEDGED) blockers.push("operational_risk_not_acknowledged");
  if (!BSOL_READ_ONLY_APPROVAL_RECORDED) blockers.push("approval_not_recorded");

  const approved = blockers.length === 0;
  return {
    protocolId: "blazestake",
    approvedForReadOnlyRecommendation: approved,
    approvedForReviewExposure: approved,
    ...(score != null ? { riskScore: score } : {}),
    riskScoreThreshold: BSOL_READ_ONLY_APPROVAL_MIN_RISK_SCORE,
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
 * The active read-only review approval for bSOL, or `null` when the gate is not met.
 * Never approves selection, replaces JitoSOL, or enables execution.
 */
export function getBsolReadOnlyApprovalDecision(options: ApprovalOptions = {}): BsolReadOnlyApprovalDecision | null {
  const checkedAt = options.checkedAt ?? new Date().toISOString();
  const status = evaluateBsolReadOnlyApprovalStatus({ checkedAt });
  const assignment = getBsolRiskScoreAssignment({ checkedAt });
  if (!status.approvedForReadOnlyRecommendation || assignment == null) return null;

  return {
    protocolId: "blazestake",
    protocolName: "BlazeStake",
    assetSymbol: "bSOL",

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
      minimumRiskScoreRequired: BSOL_READ_ONLY_APPROVAL_MIN_RISK_SCORE,
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

/**
 * The bSOL entry for the combined read-only-review-approved candidate list, or `null`
 * when bSOL is not approved. A non-mutating derived view — the base registry status is
 * unchanged (still `staged_candidate`); the review approval is expressed via
 * `approvalStatus` + `approvedForReadOnlyRecommendation`. Consumed by the JupSOL
 * module's `getAllReadOnlyReviewApprovedSolLiquidStakingCandidates()` so the full list
 * grows without mutating the registry or the selector-facing approved list.
 */
export function getBsolReviewApprovedCandidateEntry(options: ApprovalOptions = {}): SolLstReviewApprovedCandidate | null {
  const checkedAt = options.checkedAt ?? new Date().toISOString();
  const decision = getBsolReadOnlyApprovalDecision({ checkedAt });
  if (!decision) return null;
  const base = getSolLiquidStakingCandidates().find((c) => c.protocolId === "blazestake");
  return {
    protocolId: "blazestake",
    protocolName: "BlazeStake",
    lstSymbol: "bSOL",
    status: base?.status ?? "staged_candidate",
    approvalStatus: "approved_read_only_review",
    approvedForReadOnlyRecommendation: true,
    selectedByProtocolLogic: false,
    currentWinner: false,
    riskScore: decision.basis.riskScore,
    riskScoreStatus: "assigned_for_review",
  };
}

/* ------------------------------------------------------------------ *
 * Read-only "alternative protocol to review" DISPLAY (Step 14N UI exposure).
 * ------------------------------------------------------------------ */
function num(v: unknown): number | undefined {
  return typeof v === "number" ? v : undefined;
}
function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

/**
 * The read-only bSOL "alternative protocol to review" display for the UI. When the
 * evidence is fresh and the review approval is active, it renders as
 * `approved_for_review_exposure` with the sourced market/mechanics/evidence + the
 * 7.35 risk score; when the evidence is stale it renders as `stale_evidence`
 * ("Evidence needs refresh") without presenting current data. It is REVIEW-ONLY:
 * `selectedByProtocolLogic` / `currentWinner` / `transactionsEnabled` /
 * `walletSignatureRequired` are always false, and it never selects bSOL.
 */
export function buildBsolReadOnlyReviewCandidateDisplay(options: ApprovalOptions = {}): ProtocolReviewCandidateDisplay {
  const checkedAt = options.checkedAt ?? new Date().toISOString();
  const decision = getBsolReadOnlyApprovalDecision({ checkedAt });
  const rows = getSolLstFreshEvidenceRecords({ checkedAt }).filter((r) => r.protocolId === "blazestake");
  const val = (cat: string) => rows.find((r) => r.category === cat)?.value;
  const base = getSolLiquidStakingCandidateById("blazestake");
  const reviewLinkUrl = base?.externalReviewLink?.url;

  const common = {
    protocolId: "blazestake",
    protocolName: "BlazeStake",
    assetSymbol: "bSOL",
    roleLabel: "Alternative protocol to review" as const,
    riskScoreStatus: "assigned_for_review" as const,
    approvalStatus: "approved_for_read_only_review" as const,
    approvedForReadOnlyRecommendation: true as const,
    approvedForReviewExposure: true as const,
    selectedByProtocolLogic: false as const,
    currentWinner: false as const,
    transactionsEnabled: false as const,
    walletSignatureRequired: false as const,
    ...(reviewLinkUrl ? { externalReviewLink: { label: "Open BlazeStake staking page", url: reviewLinkUrl, opensNewTab: true as const } } : {}),
  };

  if (!decision) {
    // No active approval (evidence stale/not ready). Do not present current data.
    return {
      ...common,
      reviewState: rows.length > 0 ? "stale_evidence" : "missing_evidence",
      statusLabel: rows.length > 0 ? "Evidence needs refresh" : "Evidence missing",
    };
  }

  return {
    ...common,
    reviewState: "approved_for_review_exposure",
    statusLabel: "Approved for read-only review",
    sourceStatusLabel: "Evidence complete",
    marketData: {
      ...(num(val("tvl")) != null ? { tvlUsd: num(val("tvl")) } : {}),
      ...(num(val("current_apy")) != null ? { apyPct: num(val("current_apy")) } : {}),
      ...(num(val("apy_30d")) != null ? { apy30dPct: num(val("apy_30d")) } : {}),
    },
    mechanics: {
      ...(str(val("direct_unstake_time")) != null ? { unstakeTiming: str(val("direct_unstake_time")) } : {}),
      ...(num(val("direct_unstake_fee")) != null ? { directUnstakeFeePct: num(val("direct_unstake_fee")) } : {}),
      ...(num(val("annual_management_fee")) != null ? { annualManagementFeePct: num(val("annual_management_fee")) } : {}),
    },
    evidence: {
      ...(str(val("audit_security")) != null ? { auditSecurity: str(val("audit_security")) } : {}),
      ...(str(val("operational_risk")) != null ? { operationalRisk: str(val("operational_risk")) } : {}),
      ...(str(val("incident_review")) != null ? { incidentReview: str(val("incident_review")) } : {}),
    },
    riskScore: decision.basis.riskScore,
  };
}
