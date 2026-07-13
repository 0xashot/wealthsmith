/**
 * solLiquidStakingMsolRiskScore — Step 14J. Assigns a deterministic, evidence-based
 * risk score to Marinade · mSOL FOR REVIEW, from its completed 14F–14I evidence
 * package and the existing draft risk rubric.
 *
 * SCORE ASSIGNMENT ONLY (Ashot-approved for scoring). It does NOT approve mSOL for
 * real-wallet recommendation, select it via protocol logic, replace JitoSOL, enable
 * multi-protocol selection, update live recommendations, or enable transactions /
 * signatures. The score is `assigned_for_review` (using the DRAFT rubric v0.1.0), not
 * a final production score. It is only assigned when mSOL's evidence is fresh and
 * `readyForRiskGate` (else null / blocked). Not imported by any live/UI file.
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

export const SOL_LST_MSOL_RISK_SCORE_EXISTS = true;
/** Ashot approved proceeding with risk-score assignment from the completed evidence. */
export const SOL_LST_MSOL_RISK_SCORE_ASSIGNMENT_ENABLED = true;
export const SOL_LST_MSOL_RISK_SCORE_APPROVES_READ_ONLY_RECOMMENDATION = false;
export const SOL_LST_MSOL_RISK_SCORE_ENABLES_MULTI_PROTOCOL_SELECTION = false;
export const SOL_LST_MSOL_RISK_SCORE_UPDATES_LIVE_RECOMMENDATIONS = false;
export const SOL_LST_MSOL_RISK_SCORE_ENABLES_TRANSACTIONS = false;
export const SOL_LST_MSOL_RISK_SCORE_REQUIRES_WALLET_SIGNATURE = false;
export const SOL_LST_MSOL_RISK_SCORE_REPLACES_JITO = false;

/**
 * Narrowly-scoped approval: Ashot authorized ASSIGNING mSOL a risk score for review
 * from the completed evidence. This is NOT a read-only recommendation approval.
 */
export const MSOL_RISK_SCORE_ASSIGNMENT_APPROVAL = {
  scope: "risk_score_assignment_only" as const,
  approvedBy: "Ashot",
  reviewerRole: "founder" as const,
  approvesReadOnlyRecommendation: false as const,
} as const;

export type MsolReviewerRole = "founder" | "product" | "risk" | "engineering" | "compliance";

export interface MsolRiskScoreAssignment {
  protocolId: "marinade";
  protocolName: "Marinade";
  assetSymbol: "mSOL";

  score: number;
  scoreStatus: "assigned_for_review";
  scoreScale: "0_to_10";

  readyForRiskGate: boolean;
  evidenceFresh: boolean;

  assignedAt: string;
  assignedBy: string;
  reviewerRole: MsolReviewerRole;

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
 * Deterministic dimension scores (0–10) for mSOL, each tied to recorded evidence.
 * These are reviewer judgments; the weighted aggregation below is computed from the
 * rubric weights so the result is reproducible. See the .md for full rationale.
 * ------------------------------------------------------------------ */
const MSOL_DIMENSION_SCORES: Record<ProtocolRiskRubricDimensionId, number> = {
  // 4 independent audits (Kudelski, Ackee, Neodyme, Sec3) + SOC 2 Type I/II.
  audit_security: 9,
  // Established multi-year production history with continued audits.
  maturity: 8,
  // Source-backed fresh TVL ~$182.8M (mid-tier); verified APY.
  tvl_adoption: 7,
  // Documented unstake mechanics + 0.2% direct-unstake fee + 0% reward fee; the
  // delayed-unstake timing is epoch-based (not fixed hours) — minor uncertainty.
  withdrawal_fee_transparency: 8,
  // Dependencies: SAM delegation, stake pool, LP/Jupiter for instant liquidity, and a
  // 13-party/6-signer multisig admin authority — documented but non-trivial.
  operational_dependency_risk: 6,
  // Disclosed SAM unstake-priority logic bug: ~37,000 SOL / ~28% missed rewards over
  // epochs 652–777; community-forum disclosure (no official postmortem), criticized.
  incident_history: 4,
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** The deterministic weighted score (0–10) from the rubric weights. */
function computeWeightedScore(): number {
  const dims = getProtocolRiskRubricDimensions();
  const totalWeight = dims.reduce((s, d) => s + d.weight, 0);
  const weighted = dims.reduce((s, d) => s + MSOL_DIMENSION_SCORES[d.id] * d.weight, 0) / totalWeight;
  return round2(weighted);
}

interface MsolRiskScoreOptions {
  checkedAt?: string;
}

function getMsolSummary(checkedAt: string) {
  return getSolLstFreshEvidenceSummaries({ checkedAt }).find((s) => s.protocolId === "marinade");
}

function evidenceRefsFor(checkedAt: string): MsolRiskScoreAssignment["evidenceRefs"] {
  const rows = getSolLstFreshEvidenceRecords({ checkedAt }).filter((r) => r.protocolId === "marinade");
  const urls = (cats: string[]) => [...new Set(rows.filter((r) => cats.includes(r.category)).map((r) => r.sourceUrl).filter((u): u is string => !!u))];
  return {
    marketData: urls(["tvl", "current_apy", "apy_30d"]),
    mechanics: urls(["withdrawal_mechanics", "direct_unstake_fee", "annual_management_fee", "direct_unstake_time"]),
    security: urls(["audit_security"]),
    operationalRisk: urls(["operational_risk"]),
    incidentReview: urls(["incident_review"]),
  };
}

export interface MsolRiskScoreAssignmentStatus {
  protocolId: "marinade";
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
 * The gate for mSOL score assignment. A score may be assigned only when mSOL's
 * evidence is complete AND fresh (readyForRiskGate). Never approves or selects.
 */
export function evaluateMsolRiskScoreAssignmentStatus(options: MsolRiskScoreOptions = {}): MsolRiskScoreAssignmentStatus {
  const checkedAt = options.checkedAt ?? new Date().toISOString();
  const summary = getMsolSummary(checkedAt);
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
    protocolId: "marinade",
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
 * The mSOL risk-score assignment (FOR REVIEW), or `null` when evidence is not fresh /
 * not `readyForRiskGate`. Deterministic; assigns no approval and selects nothing.
 */
export function getMsolRiskScoreAssignment(options: MsolRiskScoreOptions = {}): MsolRiskScoreAssignment | null {
  const checkedAt = options.checkedAt ?? new Date().toISOString();
  const status = evaluateMsolRiskScoreAssignmentStatus({ checkedAt });
  if (!status.scoreAssigned) return null;

  const weightedScore = computeWeightedScore();
  return {
    protocolId: "marinade",
    protocolName: "Marinade",
    assetSymbol: "mSOL",

    score: weightedScore,
    scoreStatus: "assigned_for_review",
    scoreScale: "0_to_10",

    readyForRiskGate: status.readyForRiskGate,
    evidenceFresh: status.evidenceFresh,

    assignedAt: checkedAt,
    assignedBy: MSOL_RISK_SCORE_ASSIGNMENT_APPROVAL.approvedBy,
    reviewerRole: MSOL_RISK_SCORE_ASSIGNMENT_APPROVAL.reviewerRole,

    rubricVersion: PROTOCOL_RISK_RUBRIC_VERSION,

    dimensionScores: {
      auditSecurity: MSOL_DIMENSION_SCORES.audit_security,
      maturityAdoption: MSOL_DIMENSION_SCORES.maturity,
      tvlLiquidity: MSOL_DIMENSION_SCORES.tvl_adoption,
      withdrawalFeeTransparency: MSOL_DIMENSION_SCORES.withdrawal_fee_transparency,
      operationalDependency: MSOL_DIMENSION_SCORES.operational_dependency_risk,
      incidentHistory: MSOL_DIMENSION_SCORES.incident_history,
    },

    weightedScore,

    rationale: {
      positives: [
        "Audited by four independent firms (Kudelski, Ackee, Neodyme, Sec3) with SOC 2 Type I/II.",
        "Established protocol with multi-year production history and continued audits.",
        "Source-backed fresh TVL (~$182.8M) and verified current + 30-day APY.",
        "Documented unstake mechanics and fees: 0.2% direct/delayed unstake fee, and no performance/management fee on staking rewards.",
      ],
      risks: [
        "Disclosed Stake Auction Market unstake-priority logic bug caused ~37,000 SOL / ~28% of advertised rewards missed over epochs 652-777 (incident_review).",
        "Operational dependencies: SAM delegation, stake pool, LP/Jupiter for instant liquidity, and a 13-party/6-signer multisig admin authority.",
        "Delayed-unstake timing is epoch-based (claimable after epoch n+1), not a deterministic fixed-hours value.",
        "Instant-unstake pricing depends on market / LP liquidity conditions.",
      ],
      limitations: [
        "This risk score is assigned FOR REVIEW using the draft rubric (v0.1.0) — an internal review input, not an approval.",
        "A risk score is not an endorsement and does not by itself qualify mSOL for real-wallet recommendation.",
        "It does not select mSOL, replace JitoSOL, enable multi-protocol selection, or move funds.",
        "Score validity depends on the underlying evidence remaining within the 24-hour freshness window.",
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
