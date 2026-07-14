/**
 * solLiquidStakingBsolRiskScore — Step 14N. Assigns a deterministic, evidence-based
 * risk score to BlazeStake · bSOL FOR REVIEW, from its completed 14N evidence package
 * and the existing draft risk rubric. Mirrors the mSOL (14J) and JupSOL (14M) scoring
 * modules so all candidates share the same gate, rubric weights, and score semantics.
 *
 * SCORE ASSIGNMENT ONLY (Ashot-authorized for scoring if evidence is complete + fresh).
 * It does NOT approve bSOL for real-wallet recommendation, select it via protocol logic,
 * replace JitoSOL, enable multi-protocol selection, update live recommendations, or
 * enable transactions / signatures. The score is `assigned_for_review` (using the DRAFT
 * rubric v0.1.0), not a final production score. It is only assigned when bSOL's evidence
 * is fresh and `readyForRiskGate` (else null / blocked). Not imported by any live/UI file.
 *
 * Determinism: dimension scores are reviewer judgments tied to specific recorded
 * evidence (documented below); the weighted total is computed from the rubric's own
 * weights, so the same evidence always yields the same score.
 */
import {
  getSolLstFreshEvidenceSummaries,
  getSolLstFreshEvidenceRecords,
} from "./solLiquidStakingFreshEvidenceRecords";
import {
  getProtocolRiskRubricDimensions,
  PROTOCOL_RISK_RUBRIC_VERSION,
  type ProtocolRiskRubricDimensionId,
} from "./protocolRiskRubric";

export const SOL_LST_BSOL_RISK_SCORE_EXISTS = true;
/** Ashot authorized risk-score assignment from the completed evidence, if fresh. */
export const SOL_LST_BSOL_RISK_SCORE_ASSIGNMENT_ENABLED = true;
export const SOL_LST_BSOL_RISK_SCORE_APPROVES_READ_ONLY_RECOMMENDATION = false;
export const SOL_LST_BSOL_RISK_SCORE_ENABLES_MULTI_PROTOCOL_SELECTION = false;
export const SOL_LST_BSOL_RISK_SCORE_UPDATES_LIVE_RECOMMENDATIONS = false;
export const SOL_LST_BSOL_RISK_SCORE_ENABLES_TRANSACTIONS = false;
export const SOL_LST_BSOL_RISK_SCORE_REQUIRES_WALLET_SIGNATURE = false;
export const SOL_LST_BSOL_RISK_SCORE_REPLACES_JITO = false;

/**
 * Narrowly-scoped approval: Ashot authorized ASSIGNING bSOL a risk score for review
 * from the completed evidence. This is NOT a read-only recommendation approval.
 */
export const BSOL_RISK_SCORE_ASSIGNMENT_APPROVAL = {
  scope: "risk_score_assignment_only" as const,
  approvedBy: "Ashot",
  reviewerRole: "founder" as const,
  approvesReadOnlyRecommendation: false as const,
} as const;

export type BsolReviewerRole = "founder" | "product" | "risk" | "engineering" | "compliance";

export interface BsolRiskScoreAssignment {
  protocolId: "blazestake";
  protocolName: "BlazeStake";
  assetSymbol: "bSOL";

  score: number;
  scoreStatus: "assigned_for_review";
  scoreScale: "0_to_10";

  readyForRiskGate: boolean;
  evidenceFresh: boolean;

  assignedAt: string;
  assignedBy: string;
  reviewerRole: BsolReviewerRole;

  rubricVersion: string;

  dimensionScores: {
    auditSecurity: number;
    maturityAdoption: number;
    tvlLiquidity: number;
    withdrawalFeeTransparency: number;
    operationalDependency: number;
    incidentHistory: number;
  };

  weightedScore: number;

  rationale: {
    positives: string[];
    risks: string[];
    limitations: string[];
  };

  evidenceRefs: {
    marketData: string[];
    mechanics: string[];
    security: string[];
    operationalRisk: string[];
    incidentReview: string[];
  };

  approvedForReadOnlyRecommendation: false;
  selectedByProtocolLogic: false;
  currentWinner: false;

  transactionsEnabled: false;
  walletSignatureRequired: false;
}

/* ------------------------------------------------------------------ *
 * Deterministic dimension scores (0–10) for bSOL, each tied to recorded evidence.
 * These are reviewer judgments; the weighted aggregation below is computed from the
 * rubric weights so the result is reproducible. See the .md for full rationale.
 * ------------------------------------------------------------------ */
const BSOL_DIMENSION_SCORES: Record<ProtocolRiskRubricDimensionId, number> = {
  // Stake-pool contract audited 7× by 5 firms (Quantstamp, Neodyme ×4, Kudelski,
  // Halborn, OtterSec) per BlazeStake docs. Strong audit posture.
  audit_security: 9,
  // Established Solana LST with multi-year history, but smaller adoption than
  // Marinade/Jito and a broader DeFi feature surface.
  maturity: 7,
  // Source-backed fresh TVL ~$67.1M — the smallest of the reviewed candidates
  // (mSOL ~$182M, JupSOL ~$392M); lower-mid tier.
  tvl_adoption: 6,
  // Transparent, low fees: 0% deposit, 0% epoch fee, 0.1% instant + 0.1% delayed
  // unstake. Delayed-unstake timing is epoch-based (not published as fixed hours by
  // BlazeStake) — a minor documentation gap.
  withdrawal_fee_transparency: 8,
  // Non-custodial, multi-validator (monitored + human-reviewed), upgrade authority via
  // a Solana-Foundation-overseen ecosystem multisig; smaller operator/DAO + DeFi
  // integration surface keep this mid.
  operational_dependency_risk: 6,
  // Point-in-time review found no independent bSOL-specific incident/postmortem (not a
  // clean-history claim); no disclosed loss event to date.
  incident_history: 7,
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** The deterministic weighted score (0–10) from the rubric weights. */
function computeWeightedScore(): number {
  const dims = getProtocolRiskRubricDimensions();
  const totalWeight = dims.reduce((s, d) => s + d.weight, 0);
  const weighted = dims.reduce((s, d) => s + BSOL_DIMENSION_SCORES[d.id] * d.weight, 0) / totalWeight;
  return round2(weighted);
}

interface BsolRiskScoreOptions {
  checkedAt?: string;
}

function getBsolSummary(checkedAt: string) {
  return getSolLstFreshEvidenceSummaries({ checkedAt }).find((s) => s.protocolId === "blazestake");
}

function evidenceRefsFor(checkedAt: string): BsolRiskScoreAssignment["evidenceRefs"] {
  const rows = getSolLstFreshEvidenceRecords({ checkedAt }).filter((r) => r.protocolId === "blazestake");
  const urls = (cats: string[]) => [...new Set(rows.filter((r) => cats.includes(r.category)).map((r) => r.sourceUrl).filter((u): u is string => !!u))];
  return {
    marketData: urls(["tvl", "current_apy", "apy_30d"]),
    mechanics: urls(["withdrawal_mechanics", "direct_unstake_fee", "annual_management_fee", "direct_unstake_time"]),
    security: urls(["audit_security"]),
    operationalRisk: urls(["operational_risk"]),
    incidentReview: urls(["incident_review"]),
  };
}

export interface BsolRiskScoreAssignmentStatus {
  protocolId: "blazestake";
  scoreAssigned: boolean;
  score?: number;
  readyForRiskGate: boolean;
  evidenceFresh: boolean;
  approvedForReadOnlyRecommendation: false;
  selectedByProtocolLogic: false;
  updatesLiveRecommendations: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;
  blockers: string[];
}

/**
 * The gate for bSOL score assignment. A score may be assigned only when bSOL's evidence
 * is complete AND fresh (readyForRiskGate). Never approves or selects.
 */
export function evaluateBsolRiskScoreAssignmentStatus(options: BsolRiskScoreOptions = {}): BsolRiskScoreAssignmentStatus {
  const checkedAt = options.checkedAt ?? new Date().toISOString();
  const summary = getBsolSummary(checkedAt);
  const readyForRiskGate = summary?.readyForRiskGate === true;
  const evidenceFresh = summary ? summary.allEvidenceFresh === true : false;

  const blockers: string[] = [];
  if (!summary) {
    blockers.push("no_evidence");
  } else {
    if (!summary.marketDataComplete || !summary.mechanicsComplete || !summary.evidenceComplete) blockers.push("evidence_incomplete");
    if (summary.staleCount > 0 || !evidenceFresh) blockers.push("evidence_stale");
    if (!readyForRiskGate) blockers.push("not_ready_for_risk_gate");
  }

  const scoreAssigned = readyForRiskGate && evidenceFresh && blockers.length === 0;
  return {
    protocolId: "blazestake",
    scoreAssigned,
    ...(scoreAssigned ? { score: computeWeightedScore() } : {}),
    readyForRiskGate,
    evidenceFresh,
    approvedForReadOnlyRecommendation: false,
    selectedByProtocolLogic: false,
    updatesLiveRecommendations: false,
    transactionsEnabled: false,
    walletSignatureRequired: false,
    blockers,
  };
}

/**
 * The bSOL risk-score assignment (FOR REVIEW), or `null` when evidence is not fresh /
 * not `readyForRiskGate`. Deterministic; assigns no approval and selects nothing.
 */
export function getBsolRiskScoreAssignment(options: BsolRiskScoreOptions = {}): BsolRiskScoreAssignment | null {
  const checkedAt = options.checkedAt ?? new Date().toISOString();
  const status = evaluateBsolRiskScoreAssignmentStatus({ checkedAt });
  if (!status.scoreAssigned) return null;

  const weightedScore = computeWeightedScore();
  return {
    protocolId: "blazestake",
    protocolName: "BlazeStake",
    assetSymbol: "bSOL",

    score: weightedScore,
    scoreStatus: "assigned_for_review",
    scoreScale: "0_to_10",

    readyForRiskGate: status.readyForRiskGate,
    evidenceFresh: status.evidenceFresh,

    assignedAt: checkedAt,
    assignedBy: BSOL_RISK_SCORE_ASSIGNMENT_APPROVAL.approvedBy,
    reviewerRole: BSOL_RISK_SCORE_ASSIGNMENT_APPROVAL.reviewerRole,

    rubricVersion: PROTOCOL_RISK_RUBRIC_VERSION,

    dimensionScores: {
      auditSecurity: BSOL_DIMENSION_SCORES.audit_security,
      maturityAdoption: BSOL_DIMENSION_SCORES.maturity,
      tvlLiquidity: BSOL_DIMENSION_SCORES.tvl_adoption,
      withdrawalFeeTransparency: BSOL_DIMENSION_SCORES.withdrawal_fee_transparency,
      operationalDependency: BSOL_DIMENSION_SCORES.operational_dependency_risk,
      incidentHistory: BSOL_DIMENSION_SCORES.incident_history,
    },

    weightedScore,

    rationale: {
      positives: [
        "Stake-pool smart contract audited seven times by five separate firms (Quantstamp, Neodyme ×4, Kudelski, Halborn, OtterSec) per BlazeStake docs.",
        "Transparent, low fees: 0% deposit, 0% epoch/management fee, and a flat 0.1% instant or delayed unstake fee.",
        "Non-custodial design (docs state not even the pool operator can withdraw user-owned funds), with upgrade authority under a Solana-Foundation-overseen ecosystem multisig.",
        "Source-backed fresh TVL (~$67.1M) and verified current + 30-day APY (30-day mean ~5.34%).",
      ],
      risks: [
        "Smallest TVL of the reviewed candidates (~$67.1M vs mSOL ~$182M / JupSOL ~$392M) — lower adoption/liquidity depth.",
        "Delayed-unstake timing is epoch-based (~2-3 days via native stake-account deactivation) and is not published by BlazeStake as a fixed-hours figure.",
        "Broader DeFi feature surface (BLZE rewards, custom liquidity) adds integration surface area beyond core staking.",
        "Instant-unstake liquidity depends on stake-pool reserves.",
      ],
      limitations: [
        "This risk score is assigned FOR REVIEW using the draft rubric (v0.1.0) — an internal review input, not an approval.",
        "A risk score is not an endorsement and does not by itself qualify bSOL for real-wallet recommendation.",
        "It does not select bSOL, replace JitoSOL, enable multi-protocol selection, or move funds.",
        "The incident_history finding is point-in-time (no independent incident found); it is not a verified clean-history claim.",
      ],
    },

    evidenceRefs: evidenceRefsFor(checkedAt),

    approvedForReadOnlyRecommendation: false,
    selectedByProtocolLogic: false,
    currentWinner: false,

    transactionsEnabled: false,
    walletSignatureRequired: false,
  };
}
