/**
 * solLiquidStakingInfReadOnlyApproval — Step 14O. The approval gate that decides whether
 * Sanctum · INF can appear as a READ-ONLY REVIEW candidate in the product UI, based on
 * its completed 14O evidence + the INF risk score and a >= 7 threshold. Mirrors the mSOL
 * (14K/14L), JupSOL (14M), and bSOL (14N) approval modules.
 *
 * OUTCOME FOR INF: BLOCKED. INF's evidence is complete + fresh and a risk score is
 * assigned (6.95 / 10), but 6.95 is **below** the 7.0 read-only-review threshold. So the
 * approval gate does NOT pass: `getInfReadOnlyApprovalDecision()` returns `null`, INF is
 * NOT added to the read-only-review-approved list, and INF is NOT surfaced in the product
 * UI (Real Wallet / Demo / the approved "Other protocols to review" modal section). Only a
 * clearly-labelled, internal `/testing` BLOCKED evidence view is produced
 * (`getInfBlockedReviewSummary`).
 *
 * It never approves selection, replaces JitoSOL, enables multi-protocol selection, updates
 * live recommendations, or enables transactions/signatures. It never mutates the base
 * candidate registry, so `getApprovedSolLiquidStakingCandidates()` stays Jito-only.
 */
import {
  getInfRiskScoreAssignment,
  evaluateInfRiskScoreAssignmentStatus,
  INF_POOL_COMPOSITION,
  type InfPoolComposition,
} from "./solLiquidStakingInfRiskScore";
import { getSolLstFreshEvidenceRecords } from "./solLiquidStakingFreshEvidenceRecords";
import type { SolLstReviewApprovedCandidate } from "./solLiquidStakingMsolReadOnlyApproval";

export const SOL_LST_INF_READ_ONLY_APPROVAL_EXISTS = true;
/** INF's score is below threshold, so review exposure is NOT approved in this step. */
export const SOL_LST_INF_READ_ONLY_APPROVAL_APPROVES_REVIEW_EXPOSURE = false;
export const SOL_LST_INF_READ_ONLY_APPROVAL_SELECTS_PROTOCOL_WINNER = false;
export const SOL_LST_INF_READ_ONLY_APPROVAL_ENABLES_MULTI_PROTOCOL_SELECTION = false;
export const SOL_LST_INF_READ_ONLY_APPROVAL_UPDATES_LIVE_RECOMMENDATIONS = false;
export const SOL_LST_INF_READ_ONLY_APPROVAL_REPLACES_JITO = false;
export const SOL_LST_INF_READ_ONLY_APPROVAL_ENABLES_TRANSACTIONS = false;
export const SOL_LST_INF_READ_ONLY_APPROVAL_REQUIRES_WALLET_SIGNATURE = false;

/** Read-only review exposure requires a risk score at or above this threshold. */
export const INF_READ_ONLY_APPROVAL_MIN_RISK_SCORE = 7;

/** Ashot acknowledged INF's multi-LST / overlap / pool-dependency risks. */
const INF_MATERIAL_RISK_ACKNOWLEDGED = true;
const INF_READ_ONLY_APPROVAL_RECORDED = true;

export type InfReviewerRole = "founder" | "product" | "risk" | "engineering" | "compliance";

const ACKNOWLEDGED_RISKS: readonly string[] = [
  "INF is a multi-LST pool holding many underlying LSTs (all Sanctum LSTs + jitoSOL + bSOL + SOL/wSOL) and inherits their aggregate risk.",
  "Its underlying exposure OVERLAPS the selected protocol (JitoSOL) and an existing review candidate (bSOL) — not independent diversification.",
  "Added operational surface: dynamic allocation logic + dependency on Sanctum's S Controller, Pricing Program, and per-LST SOL Value Calculator programs.",
  "Swap fees vary by LST (no single published rate), reducing fee transparency relative to a flat single-LST fee.",
];

export interface InfReadOnlyApprovalDecision {
  protocolId: "sanctum";
  protocolName: "Sanctum";
  assetSymbol: "INF";

  decision: "approved_for_read_only_review";
  decisionStatus: "active";

  approvedAt: string;
  approvedBy: string;
  reviewerRole: InfReviewerRole;

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
  return score >= INF_READ_ONLY_APPROVAL_MIN_RISK_SCORE;
}

interface ApprovalOptions {
  checkedAt?: string;
}

export interface InfReadOnlyApprovalStatus {
  protocolId: "sanctum";
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
 * Evaluate whether INF is approvable for read-only review exposure at `checkedAt`.
 * Requires a risk score >= 7 (INF is 6.95 → blocked with `risk_score_below_threshold`),
 * fresh evidence, `readyForRiskGate`, acknowledged risk, and a recorded approval. Never
 * selects INF, updates live recommendations, or enables execution.
 */
export function evaluateInfReadOnlyApprovalStatus(options: ApprovalOptions = {}): InfReadOnlyApprovalStatus {
  const checkedAt = options.checkedAt ?? new Date().toISOString();
  const scoreStatus = evaluateInfRiskScoreAssignmentStatus({ checkedAt });
  const score = scoreStatus.score;

  const blockers: string[] = [];
  if (score == null) blockers.push("missing_risk_score");
  else if (!isRiskScoreAboveReadOnlyThreshold(score)) blockers.push("risk_score_below_threshold");
  if (!scoreStatus.evidenceFresh) blockers.push("evidence_stale");
  if (!scoreStatus.readyForRiskGate) blockers.push("not_ready_for_risk_gate");
  if (!INF_MATERIAL_RISK_ACKNOWLEDGED) blockers.push("material_risk_not_acknowledged");
  if (!INF_READ_ONLY_APPROVAL_RECORDED) blockers.push("approval_not_recorded");

  const approved = blockers.length === 0;
  return {
    protocolId: "sanctum",
    approvedForReadOnlyRecommendation: approved,
    approvedForReviewExposure: approved,
    ...(score != null ? { riskScore: score } : {}),
    riskScoreThreshold: INF_READ_ONLY_APPROVAL_MIN_RISK_SCORE,
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
 * The active read-only review approval for INF, or `null` when the gate is not met. INF's
 * score (6.95) is below the 7.0 threshold, so this returns `null` in this step.
 */
export function getInfReadOnlyApprovalDecision(options: ApprovalOptions = {}): InfReadOnlyApprovalDecision | null {
  const checkedAt = options.checkedAt ?? new Date().toISOString();
  const status = evaluateInfReadOnlyApprovalStatus({ checkedAt });
  const assignment = getInfRiskScoreAssignment({ checkedAt });
  if (!status.approvedForReadOnlyRecommendation || assignment == null) return null;

  return {
    protocolId: "sanctum",
    protocolName: "Sanctum",
    assetSymbol: "INF",

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
      minimumRiskScoreRequired: INF_READ_ONLY_APPROVAL_MIN_RISK_SCORE,
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

    limitations: [
      "Approval is for read-only review exposure only — it is not an endorsement.",
      "Approval does not select INF, replace JitoSOL, or enable multi-protocol selection.",
      "Approval does not enable transactions, signatures, swaps, deposits, or staking execution.",
    ],
  };
}

/**
 * The INF entry for the combined read-only-review-approved candidate list. INF is NOT
 * approved (score below threshold), so this always returns `null` in this step — INF is
 * never added to `getAllReadOnlyReviewApprovedSolLiquidStakingCandidates()`.
 */
export function getInfReviewApprovedCandidateEntry(options: ApprovalOptions = {}): SolLstReviewApprovedCandidate | null {
  const checkedAt = options.checkedAt ?? new Date().toISOString();
  // Returns an entry ONLY if INF were approved; its score (6.95) is below the 7.0
  // threshold, so `getInfReadOnlyApprovalDecision` is null and INF is never added to the
  // combined read-only-review-approved list.
  const decision = getInfReadOnlyApprovalDecision({ checkedAt });
  return decision ? {
    protocolId: "sanctum",
    protocolName: "Sanctum",
    lstSymbol: "INF",
    status: "staged_candidate",
    approvalStatus: "approved_read_only_review",
    approvedForReadOnlyRecommendation: true,
    selectedByProtocolLogic: false,
    currentWinner: false,
    riskScore: decision.basis.riskScore,
    riskScoreStatus: "assigned_for_review",
  } : null;
}

/* ------------------------------------------------------------------ *
 * Internal (NON product-facing) BLOCKED evidence view for /testing.
 *
 * INF is NOT a `ProtocolReviewCandidateDisplay` (that type is for APPROVED review
 * candidates). This is a separate, clearly-labelled blocked view: it records that INF was
 * fully evaluated (evidence complete + fresh, score 6.95) but did not clear the 7.0
 * read-only-review threshold, so it is not surfaced as an alternative protocol to review.
 * ------------------------------------------------------------------ */
function num(v: unknown): number | undefined {
  return typeof v === "number" ? v : undefined;
}
function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

export interface InfBlockedReviewSummary {
  protocolId: "sanctum";
  protocolName: "Sanctum";
  assetSymbol: "INF";

  isMultiLstPool: true;
  poolComposition: InfPoolComposition;

  reviewState: "blocked_below_threshold";
  statusLabel: string;
  productFacing: false;

  riskScore?: number;
  riskScoreThreshold: 7;
  riskScoreStatus: "assigned_for_review";

  evidenceComplete: boolean;
  evidenceFresh: boolean;

  marketData?: { tvlUsd?: number; apyPct?: number; apy30dPct?: number };
  mechanics?: { unstakeTiming?: string; directUnstakeFeePct?: number; annualManagementFeePct?: number };
  evidence?: { auditSecurity?: string; operationalRisk?: string; incidentReview?: string };

  approvedForReadOnlyRecommendation: false;
  approvedForReviewExposure: false;
  selectedByProtocolLogic: false;
  currentWinner: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;

  blockers: string[];
}

/**
 * Internal blocked-evidence summary for INF (for the clearly-labelled `/testing` blocked
 * fixture ONLY — never the product-facing approved review section). Surfaces the completed
 * evidence + the below-threshold score + the multi-LST composition/overlap, with every
 * approval/selection/transaction flag false.
 */
export function getInfBlockedReviewSummary(options: ApprovalOptions = {}): InfBlockedReviewSummary {
  const checkedAt = options.checkedAt ?? new Date().toISOString();
  const status = evaluateInfReadOnlyApprovalStatus({ checkedAt });
  const rows = getSolLstFreshEvidenceRecords({ checkedAt }).filter((r) => r.protocolId === "sanctum");
  const val = (cat: string) => rows.find((r) => r.category === cat)?.value;
  const evidenceComplete = rows.length === 10 && rows.every((r) => r.status === "accepted");

  return {
    protocolId: "sanctum",
    protocolName: "Sanctum",
    assetSymbol: "INF",

    isMultiLstPool: true,
    poolComposition: INF_POOL_COMPOSITION,

    reviewState: "blocked_below_threshold",
    statusLabel: "Not cleared for read-only review — risk score below the 7.0 threshold (internal evidence view only)",
    productFacing: false,

    ...(status.riskScore != null ? { riskScore: status.riskScore } : {}),
    riskScoreThreshold: INF_READ_ONLY_APPROVAL_MIN_RISK_SCORE,
    riskScoreStatus: "assigned_for_review",

    evidenceComplete,
    evidenceFresh: status.evidenceFresh,

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

    approvedForReadOnlyRecommendation: false,
    approvedForReviewExposure: false,
    selectedByProtocolLogic: false,
    currentWinner: false,
    transactionsEnabled: false,
    walletSignatureRequired: false,

    blockers: status.blockers,
  };
}
