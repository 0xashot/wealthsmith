/**
 * solLiquidStakingJupsolReadOnlyApproval — Step 14M. The approval gate that decides
 * whether Jupiter · JupSOL can appear as a READ-ONLY REVIEW candidate in the product
 * UI, based on its completed 14M evidence + the JupSOL risk score (7.65) meeting a
 * >= 7 threshold, with the single-validator / Sanctum operational risks explicitly
 * acknowledged. Mirrors the mSOL approval module (14K/14L).
 *
 * LIMITED APPROVAL. It approves JupSOL to appear as an ALTERNATIVE protocol to review.
 * It does NOT make JupSOL the selected protocol or the winner, enable multi-protocol
 * selection, replace JitoSOL, update live recommendations, or enable
 * transactions/signatures. It never mutates the base candidate registry, so
 * `getApprovedSolLiquidStakingCandidates()` (selector-facing) stays Jito-only; the
 * read-only-review list is a separate, non-mutating preview. Not imported by any
 * live/UI file except the review-display path.
 */
import type { ProtocolReviewCandidateDisplay } from "./engineTypes";
import {
  getSolLiquidStakingCandidates,
  getSolLiquidStakingCandidateById,
} from "./solLiquidStakingCandidateRegistry";
import {
  getJupsolRiskScoreAssignment,
  evaluateJupsolRiskScoreAssignmentStatus,
} from "./solLiquidStakingJupsolRiskScore";
import { getSolLstFreshEvidenceRecords } from "./solLiquidStakingFreshEvidenceRecords";
import {
  getReadOnlyReviewApprovedSolLiquidStakingCandidates,
  type SolLstReviewApprovedCandidate,
} from "./solLiquidStakingMsolReadOnlyApproval";
import { getBsolReviewApprovedCandidateEntry } from "./solLiquidStakingBsolReadOnlyApproval";

export const SOL_LST_JUPSOL_READ_ONLY_APPROVAL_EXISTS = true;
export const SOL_LST_JUPSOL_READ_ONLY_APPROVAL_APPROVES_REVIEW_EXPOSURE = true;
export const SOL_LST_JUPSOL_READ_ONLY_APPROVAL_SELECTS_PROTOCOL_WINNER = false;
export const SOL_LST_JUPSOL_READ_ONLY_APPROVAL_ENABLES_MULTI_PROTOCOL_SELECTION = false;
export const SOL_LST_JUPSOL_READ_ONLY_APPROVAL_UPDATES_LIVE_RECOMMENDATIONS = false;
export const SOL_LST_JUPSOL_READ_ONLY_APPROVAL_REPLACES_JITO = false;
export const SOL_LST_JUPSOL_READ_ONLY_APPROVAL_ENABLES_TRANSACTIONS = false;
export const SOL_LST_JUPSOL_READ_ONLY_APPROVAL_REQUIRES_WALLET_SIGNATURE = false;

/** Read-only review exposure requires a risk score at or above this threshold. */
export const JUPSOL_READ_ONLY_APPROVAL_MIN_RISK_SCORE = 7;

/** Ashot acknowledged JupSOL's operational risks (single validator, Sanctum) + approved. */
const JUPSOL_OPERATIONAL_RISK_ACKNOWLEDGED = true;
const JUPSOL_READ_ONLY_APPROVAL_RECORDED = true;

export type JupsolReviewerRole = "founder" | "product" | "risk" | "engineering" | "compliance";

const ACKNOWLEDGED_RISKS: readonly string[] = [
  "SOL is delegated to a single Jupiter validator — a validator-concentration dependency.",
  "JupSOL runs on Sanctum's SPL stake-pool infrastructure, a third-party dependency in addition to Jupiter.",
  "The fee structure is multi-component: a 5% validator commission on inflation rewards plus a separate Sanctum epoch fee on base rewards.",
  "Delayed (direct) unstake timing is epoch-based (~2 days), not fixed hours; instant-swap pricing depends on DEX/market liquidity.",
  "The incident review is point-in-time: no independent incident was found, and the 'without exploits' statement is Jupiter's own.",
];

const APPROVAL_LIMITATIONS: readonly string[] = [
  "Approval is for read-only review exposure only — it is not an endorsement.",
  "Approval is not a safety claim and does not rank JupSOL above other protocols.",
  "Approval does not select JupSOL as the protocol winner, replace JitoSOL, or enable multi-protocol selection.",
  "Approval does not enable transactions, signatures, swaps, deposits, or staking execution.",
  "The score and approval hold only while the evidence remains within the 24-hour freshness window.",
];

export interface JupsolReadOnlyApprovalDecision {
  protocolId: "jupiter";
  protocolName: "Jupiter";
  assetSymbol: "JupSOL";

  decision: "approved_for_read_only_review";
  decisionStatus: "active";

  approvedAt: string;
  approvedBy: string;
  reviewerRole: JupsolReviewerRole;

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
  return score >= JUPSOL_READ_ONLY_APPROVAL_MIN_RISK_SCORE;
}

interface ApprovalOptions {
  checkedAt?: string;
}

export interface JupsolReadOnlyApprovalStatus {
  protocolId: "jupiter";
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
 * Evaluate whether JupSOL is approvable for read-only review exposure at `checkedAt`.
 * Requires: a risk score >= 7 with status `assigned_for_review`, fresh evidence,
 * `readyForRiskGate`, acknowledged operational risk, and a recorded approval. Never
 * selects JupSOL, updates live recommendations, or enables execution.
 */
export function evaluateJupsolReadOnlyApprovalStatus(options: ApprovalOptions = {}): JupsolReadOnlyApprovalStatus {
  const checkedAt = options.checkedAt ?? new Date().toISOString();
  const scoreStatus = evaluateJupsolRiskScoreAssignmentStatus({ checkedAt });
  const score = scoreStatus.score;

  const blockers: string[] = [];
  if (score == null) blockers.push("missing_risk_score");
  else if (!isRiskScoreAboveReadOnlyThreshold(score)) blockers.push("risk_score_below_threshold");
  if (!scoreStatus.evidenceFresh) blockers.push("evidence_stale");
  if (!scoreStatus.readyForRiskGate) blockers.push("not_ready_for_risk_gate");
  if (!JUPSOL_OPERATIONAL_RISK_ACKNOWLEDGED) blockers.push("operational_risk_not_acknowledged");
  if (!JUPSOL_READ_ONLY_APPROVAL_RECORDED) blockers.push("approval_not_recorded");

  const approved = blockers.length === 0;
  return {
    protocolId: "jupiter",
    approvedForReadOnlyRecommendation: approved,
    approvedForReviewExposure: approved,
    ...(score != null ? { riskScore: score } : {}),
    riskScoreThreshold: JUPSOL_READ_ONLY_APPROVAL_MIN_RISK_SCORE,
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
 * The active read-only review approval for JupSOL, or `null` when the gate is not met.
 * Never approves selection, replaces JitoSOL, or enables execution.
 */
export function getJupsolReadOnlyApprovalDecision(options: ApprovalOptions = {}): JupsolReadOnlyApprovalDecision | null {
  const checkedAt = options.checkedAt ?? new Date().toISOString();
  const status = evaluateJupsolReadOnlyApprovalStatus({ checkedAt });
  const assignment = getJupsolRiskScoreAssignment({ checkedAt });
  if (!status.approvedForReadOnlyRecommendation || assignment == null) return null;

  return {
    protocolId: "jupiter",
    protocolName: "Jupiter",
    assetSymbol: "JupSOL",

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
      minimumRiskScoreRequired: JUPSOL_READ_ONLY_APPROVAL_MIN_RISK_SCORE,
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
 * All candidates approved for READ-ONLY REVIEW exposure: the existing Jito + mSOL list
 * (from the mSOL module, unchanged) PLUS JupSOL when its read-only approval is active.
 * A non-mutating derived view — it never changes the base registry, the selector-facing
 * approved list, or selection state. The mSOL/Jito entries are produced by the mSOL
 * module verbatim, so mSOL's behavior is unaffected.
 */
export function getAllReadOnlyReviewApprovedSolLiquidStakingCandidates(options: ApprovalOptions = {}): SolLstReviewApprovedCandidate[] {
  const checkedAt = options.checkedAt ?? new Date().toISOString();
  const out: SolLstReviewApprovedCandidate[] = [...getReadOnlyReviewApprovedSolLiquidStakingCandidates({ checkedAt })];

  const decision = getJupsolReadOnlyApprovalDecision({ checkedAt });
  if (decision) {
    const base = getSolLiquidStakingCandidates().find((c) => c.protocolId === "jupiter");
    out.push({
      protocolId: "jupiter",
      protocolName: "Jupiter",
      lstSymbol: "JupSOL",
      // Base registry status is unchanged (still staged_candidate); the review approval
      // is expressed via approvalStatus + approvedForReadOnlyRecommendation.
      status: base?.status ?? "staged_candidate",
      approvalStatus: "approved_read_only_review",
      approvedForReadOnlyRecommendation: true,
      selectedByProtocolLogic: false,
      currentWinner: false,
      riskScore: decision.basis.riskScore,
      riskScoreStatus: "assigned_for_review",
    });
  }

  // Step 14N — append bSOL (built by the bSOL module) when its read-only approval is
  // active. Non-mutating; bSOL's registry status stays staged_candidate.
  const bsolEntry = getBsolReviewApprovedCandidateEntry({ checkedAt });
  if (bsolEntry) out.push(bsolEntry);

  return out;
}

/* ------------------------------------------------------------------ *
 * Read-only "alternative protocol to review" DISPLAY (Step 14M UI exposure).
 * ------------------------------------------------------------------ */
function num(v: unknown): number | undefined {
  return typeof v === "number" ? v : undefined;
}
function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

/**
 * The read-only JupSOL "alternative protocol to review" display for the UI. When the
 * evidence is fresh and the review approval is active, it renders as
 * `approved_for_review_exposure` with the sourced market/mechanics/evidence + the
 * 7.65 risk score; when the evidence is stale it renders as `stale_evidence`
 * ("Evidence needs refresh") without presenting current data. It is REVIEW-ONLY:
 * `selectedByProtocolLogic` / `currentWinner` / `transactionsEnabled` /
 * `walletSignatureRequired` are always false, and it never selects JupSOL.
 */
export function buildJupsolReadOnlyReviewCandidateDisplay(options: ApprovalOptions = {}): ProtocolReviewCandidateDisplay {
  const checkedAt = options.checkedAt ?? new Date().toISOString();
  const decision = getJupsolReadOnlyApprovalDecision({ checkedAt });
  const rows = getSolLstFreshEvidenceRecords({ checkedAt }).filter((r) => r.protocolId === "jupiter");
  const val = (cat: string) => rows.find((r) => r.category === cat)?.value;
  const base = getSolLiquidStakingCandidateById("jupiter");
  const reviewLinkUrl = base?.externalReviewLink?.url;

  const common = {
    protocolId: "jupiter",
    protocolName: "Jupiter",
    assetSymbol: "JupSOL",
    roleLabel: "Alternative protocol to review" as const,
    riskScoreStatus: "assigned_for_review" as const,
    approvalStatus: "approved_for_read_only_review" as const,
    approvedForReadOnlyRecommendation: true as const,
    approvedForReviewExposure: true as const,
    selectedByProtocolLogic: false as const,
    currentWinner: false as const,
    transactionsEnabled: false as const,
    walletSignatureRequired: false as const,
    ...(reviewLinkUrl ? { externalReviewLink: { label: "Open Jupiter staking page", url: reviewLinkUrl, opensNewTab: true as const } } : {}),
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
