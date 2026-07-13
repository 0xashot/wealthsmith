/**
 * solLiquidStakingRiskScoringGate — Step 14C. A GATE (not scoring) that decides
 * which staged SOL liquid-staking candidates are blocked from risk scoring, and
 * exactly why. It never assigns a risk score, approves a candidate, enables
 * multi-protocol selection, updates a live recommendation, or replaces Jito as the
 * selected protocol. No transaction/signature path. It is not imported by
 * `stakingSuggestion` or any live/UI file — only by docs and fixtures.
 *
 * A staged candidate is `ready_for_scoring` only when its market, mechanics, and
 * evidence are all verified (14B), source re-verification is cleared, and the risk
 * rubric + approval decision permit scoring. Today none are — every staged
 * candidate is `blocked` with explicit reasons.
 */
import { getSolLiquidStakingCandidateById } from "./solLiquidStakingCandidateRegistry";
import { summarizeSolLstCandidateValueConfirmations } from "./solLiquidStakingSourceValueConfirmation";
import { isProtocolRiskRubricApproved } from "./protocolRiskRubric";
import { getCurrentProtocolRiskRubricApprovalDecision } from "./protocolRiskApprovalDecision";

export const SOL_LST_RISK_SCORING_GATE_EXISTS = true;
/** Correctly-spelled flag. The gate NEVER assigns a score. */
export const SOL_LST_RISK_SCORING_GATE_ASSIGNS_SCORES = false;
export const SOL_LST_RISK_SCORING_GATE_APPROVES_CANDIDATES = false;
export const SOL_LST_RISK_SCORING_GATE_ENABLES_MULTI_PROTOCOL_SELECTION = false;
export const SOL_LST_RISK_SCORING_GATE_UPDATES_LIVE_RECOMMENDATIONS = false;
export const SOL_LST_RISK_SCORING_GATE_ENABLES_TRANSACTIONS = false;
export const SOL_LST_RISK_SCORING_GATE_REQUIRES_WALLET_SIGNATURE = false;

export type SolLstRiskScoringGateStatus =
  | "blocked"
  | "ready_for_scoring"
  | "not_candidate"
  | "already_approved";

export type SolLstRiskScoringBlocker =
  | "candidate_not_found"
  | "candidate_not_staged"
  | "already_approved_read_only"
  | "market_data_missing"
  | "market_data_stale"
  | "mechanics_review_required"
  | "evidence_review_required"
  | "approved_rubric_missing"
  | "risk_approval_decision_missing"
  | "source_reverification_required"
  | "value_confirmation_missing"
  | "risk_score_already_exists"
  | "unsupported_protocol";

export interface SolLstRiskScoringGateResult {
  protocolId: string;
  protocolName?: string;
  lstSymbol?: string;
  status: SolLstRiskScoringGateStatus;
  blockers: SolLstRiskScoringBlocker[];
  missingCategories: string[];
  staleCategories: string[];
  readyForRiskScoring: boolean;
  canAssignRiskScore: boolean;
  scoreAssigned: false;
  candidateApproved: false;
  liveRecommendationsUpdated: false;
  transactionsEnabled: false;
  checkedAt: string;
}

export interface SolLstRiskScoringGateOptions {
  checkedAt?: string;
  requireApprovedRubric?: boolean;
  requireApprovalDecision?: boolean;
}

/** The four staged candidates the gate evaluates, in stable order. */
export const STAGED_SOL_LST_GATE_PROTOCOL_IDS = ["marinade", "jupiter", "blazestake", "sanctum"] as const;

function baseResult(protocolId: string, checkedAt: string): Omit<SolLstRiskScoringGateResult, "status" | "blockers" | "missingCategories" | "staleCategories" | "readyForRiskScoring" | "canAssignRiskScore"> {
  return {
    protocolId,
    scoreAssigned: false,
    candidateApproved: false,
    liveRecommendationsUpdated: false,
    transactionsEnabled: false,
    checkedAt,
  };
}

/**
 * Evaluate the risk-scoring gate for one candidate. Deterministic and read-only:
 * it reads the candidate registry (14A), the source/value confirmations (14B), and
 * the risk rubric + approval decision — and never writes, scores, or approves.
 */
export function evaluateSolLstRiskScoringGate(
  protocolId: string,
  options: SolLstRiskScoringGateOptions = {}
): SolLstRiskScoringGateResult {
  const checkedAt = options.checkedAt ?? new Date().toISOString();
  const requireApprovedRubric = options.requireApprovedRubric ?? true;
  const requireApprovalDecision = options.requireApprovalDecision ?? true;
  const base = baseResult(protocolId, checkedAt);

  const candidate = getSolLiquidStakingCandidateById(protocolId);
  if (!candidate) {
    return { ...base, status: "not_candidate", blockers: ["candidate_not_found"], missingCategories: [], staleCategories: [], readyForRiskScoring: false, canAssignRiskScore: false };
  }

  const named = { ...base, protocolName: candidate.protocolName, lstSymbol: candidate.lstSymbol };

  // Already approved (Jito) — it already carries an approved risk score; the gate
  // does not re-score it.
  if (candidate.approvedForReadOnlyRecommendation === true || candidate.status === "active_read_only_beta") {
    const blockers: SolLstRiskScoringBlocker[] = ["already_approved_read_only"];
    if (candidate.risk.riskScore != null) blockers.push("risk_score_already_exists");
    return { ...named, status: "already_approved", blockers, missingCategories: [], staleCategories: [], readyForRiskScoring: false, canAssignRiskScore: false };
  }

  // Not a staged candidate → cannot be scored via this path.
  if (candidate.status !== "staged_candidate") {
    return { ...named, status: "blocked", blockers: ["candidate_not_staged"], missingCategories: [], staleCategories: [], readyForRiskScoring: false, canAssignRiskScore: false };
  }

  // Staged: gather prerequisites.
  const summary = summarizeSolLstCandidateValueConfirmations({ checkedAt }).find((s) => s.protocolId === protocolId);
  const decision = getCurrentProtocolRiskRubricApprovalDecision();
  // `isProtocolRiskRubricApproved()` is a literal-false today; read as boolean so the
  // gate stays correct once the rubric can be approved.
  const rubricApproved = (isProtocolRiskRubricApproved() as boolean) === true;
  const scoreDecisionAllowed = decision.scoreAssignmentAllowed === true;

  const blockers: SolLstRiskScoringBlocker[] = [];
  const missingCategories: string[] = [];
  const staleCategories: string[] = [];

  if (!summary) {
    blockers.push("value_confirmation_missing");
  } else {
    missingCategories.push(...summary.missingCategories);
    staleCategories.push(...summary.staleCategories);
    if (summary.marketDataStatus === "missing" || summary.marketDataStatus === "needs_review") blockers.push("market_data_missing");
    if (summary.marketDataStatus === "stale") blockers.push("market_data_stale");
    if (summary.mechanicsStatus !== "verified") blockers.push("mechanics_review_required");
    if (summary.evidenceStatus !== "verified") blockers.push("evidence_review_required");
  }

  if (candidate.evidence.sourceReverificationRequired === true) blockers.push("source_reverification_required");
  if (requireApprovedRubric && !rubricApproved) blockers.push("approved_rubric_missing");
  if (requireApprovalDecision && !scoreDecisionAllowed) blockers.push("risk_approval_decision_missing");

  const allVerified =
    summary?.marketDataStatus === "verified" &&
    summary?.mechanicsStatus === "verified" &&
    summary?.evidenceStatus === "verified";
  const ready =
    allVerified === true &&
    candidate.evidence.sourceReverificationRequired === false &&
    (!requireApprovedRubric || rubricApproved) &&
    (!requireApprovalDecision || scoreDecisionAllowed) &&
    blockers.length === 0;

  return {
    ...named,
    status: ready ? "ready_for_scoring" : "blocked",
    blockers,
    missingCategories: [...new Set(missingCategories)],
    staleCategories: [...new Set(staleCategories)],
    readyForRiskScoring: ready,
    canAssignRiskScore: ready,
  };
}

/** Gate results for all four staged candidates, in stable order. */
export function evaluateAllStagedSolLstRiskScoringGates(
  options: SolLstRiskScoringGateOptions = {}
): SolLstRiskScoringGateResult[] {
  return STAGED_SOL_LST_GATE_PROTOCOL_IDS.map((id) => evaluateSolLstRiskScoringGate(id, options));
}

export interface SolLstRiskScoringGateSummary {
  totalStagedCandidates: number;
  readyForScoringCount: number;
  blockedCount: number;
  alreadyApprovedCount: number;
  canAssignRiskScoreCount: number;
  liveRecommendationsUpdated: false;
  transactionsEnabled: false;
  checkedAt: string;
}

export function summarizeSolLstRiskScoringGates(
  options: SolLstRiskScoringGateOptions = {}
): SolLstRiskScoringGateSummary {
  const checkedAt = options.checkedAt ?? new Date().toISOString();
  const results = evaluateAllStagedSolLstRiskScoringGates({ ...options, checkedAt });
  return {
    totalStagedCandidates: results.length,
    readyForScoringCount: results.filter((r) => r.status === "ready_for_scoring").length,
    blockedCount: results.filter((r) => r.status === "blocked").length,
    alreadyApprovedCount: results.filter((r) => r.status === "already_approved").length,
    canAssignRiskScoreCount: results.filter((r) => r.canAssignRiskScore === true).length,
    liveRecommendationsUpdated: false,
    transactionsEnabled: false,
    checkedAt,
  };
}

/**
 * FIXTURE-ONLY. Returns an artificial `ready_for_scoring` gate result (all
 * prerequisites satisfied) to prove the gate CAN return ready when prerequisites
 * are met. It does not mutate the registry, assign a score, approve a candidate, or
 * update any live recommendation — `scoreAssigned` / `candidateApproved` stay false.
 */
export function buildSolLstRiskScoringGateReadyFixture(protocolId: string): SolLstRiskScoringGateResult {
  const candidate = getSolLiquidStakingCandidateById(protocolId);
  return {
    protocolId,
    protocolName: candidate?.protocolName,
    lstSymbol: candidate?.lstSymbol,
    status: "ready_for_scoring",
    blockers: [],
    missingCategories: [],
    staleCategories: [],
    readyForRiskScoring: true,
    canAssignRiskScore: true,
    scoreAssigned: false,
    candidateApproved: false,
    liveRecommendationsUpdated: false,
    transactionsEnabled: false,
    checkedAt: "fixture-only",
  };
}
