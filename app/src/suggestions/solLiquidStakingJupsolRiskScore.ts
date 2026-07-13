/**
 * solLiquidStakingJupsolRiskScore — Step 14M. Assigns a deterministic, evidence-based
 * risk score to Jupiter · JupSOL FOR REVIEW, from its completed 14M evidence package
 * and the existing draft risk rubric. Mirrors the mSOL scoring module (14J) so both
 * candidates share the same gate, rubric weights, and score semantics.
 *
 * SCORE ASSIGNMENT ONLY (Ashot-authorized for scoring if evidence is complete + fresh).
 * It does NOT approve JupSOL for real-wallet recommendation, select it via protocol
 * logic, replace JitoSOL, enable multi-protocol selection, update live recommendations,
 * or enable transactions / signatures. The score is `assigned_for_review` (using the
 * DRAFT rubric v0.1.0), not a final production score. It is only assigned when JupSOL's
 * evidence is fresh and `readyForRiskGate` (else null / blocked). Not imported by any
 * live/UI file.
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

export const SOL_LST_JUPSOL_RISK_SCORE_EXISTS = true;
/** Ashot authorized risk-score assignment from the completed evidence, if fresh. */
export const SOL_LST_JUPSOL_RISK_SCORE_ASSIGNMENT_ENABLED = true;
export const SOL_LST_JUPSOL_RISK_SCORE_APPROVES_READ_ONLY_RECOMMENDATION = false;
export const SOL_LST_JUPSOL_RISK_SCORE_ENABLES_MULTI_PROTOCOL_SELECTION = false;
export const SOL_LST_JUPSOL_RISK_SCORE_UPDATES_LIVE_RECOMMENDATIONS = false;
export const SOL_LST_JUPSOL_RISK_SCORE_ENABLES_TRANSACTIONS = false;
export const SOL_LST_JUPSOL_RISK_SCORE_REQUIRES_WALLET_SIGNATURE = false;
export const SOL_LST_JUPSOL_RISK_SCORE_REPLACES_JITO = false;

/**
 * Narrowly-scoped approval: Ashot authorized ASSIGNING JupSOL a risk score for review
 * from the completed evidence. This is NOT a read-only recommendation approval.
 */
export const JUPSOL_RISK_SCORE_ASSIGNMENT_APPROVAL = {
  scope: "risk_score_assignment_only" as const,
  approvedBy: "Ashot",
  reviewerRole: "founder" as const,
  approvesReadOnlyRecommendation: false as const,
} as const;

export type JupsolReviewerRole = "founder" | "product" | "risk" | "engineering" | "compliance";

export interface JupsolRiskScoreAssignment {
  protocolId: "jupiter";
  protocolName: "Jupiter";
  assetSymbol: "JupSOL";

  score: number;
  scoreStatus: "assigned_for_review";
  scoreScale: "0_to_10";

  readyForRiskGate: boolean;
  evidenceFresh: boolean;

  assignedAt: string;
  assignedBy: string;
  reviewerRole: JupsolReviewerRole;

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
 * Deterministic dimension scores (0–10) for JupSOL, each tied to recorded evidence.
 * These are reviewer judgments; the weighted aggregation below is computed from the
 * rubric weights so the result is reproducible. See the .md for full rationale.
 * ------------------------------------------------------------------ */
const JUPSOL_DIMENSION_SCORES: Record<ProtocolRiskRubricDimensionId, number> = {
  // Built on Sanctum's SPL Stake Pool Program (audited 9 times per Jupiter docs;
  // program secured >$4B across the ecosystem). Strong audit posture.
  audit_security: 9,
  // JupSOL is a newer LST product on a well-established stake-pool program; Jupiter is a
  // major protocol, but the JupSOL token itself has a shorter track record than mSOL.
  maturity: 7,
  // Source-backed fresh TVL ~$391.9M (upper-mid tier, larger than mSOL); verified APY.
  tvl_adoption: 8,
  // Documented mechanics: instant swap or ~2-day delayed unstake, 0.1% pool-unwrap fee,
  // 5% inflation commission (0% MEV). Fees are transparent but multi-component (a
  // separate Sanctum epoch fee also applies) — slight added complexity.
  withdrawal_fee_transparency: 8,
  // Dependencies: SOL delegated to a SINGLE Jupiter validator (concentration), Sanctum
  // SPL stake-pool infra, and an 11-member multisig upgrade authority — documented but
  // single-validator concentration is a non-trivial dependency.
  operational_dependency_risk: 6,
  // No independent JupSOL-specific incident/postmortem found in this review window;
  // Jupiter's docs state the underlying program has run without exploits (a protocol
  // statement, not an independent verification). No disclosed loss event to date.
  incident_history: 7,
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** The deterministic weighted score (0–10) from the rubric weights. */
function computeWeightedScore(): number {
  const dims = getProtocolRiskRubricDimensions();
  const totalWeight = dims.reduce((s, d) => s + d.weight, 0);
  const weighted = dims.reduce((s, d) => s + JUPSOL_DIMENSION_SCORES[d.id] * d.weight, 0) / totalWeight;
  return round2(weighted);
}

interface JupsolRiskScoreOptions {
  checkedAt?: string;
}

function getJupsolSummary(checkedAt: string) {
  return getSolLstFreshEvidenceSummaries({ checkedAt }).find((s) => s.protocolId === "jupiter");
}

function evidenceRefsFor(checkedAt: string): JupsolRiskScoreAssignment["evidenceRefs"] {
  const rows = getSolLstFreshEvidenceRecords({ checkedAt }).filter((r) => r.protocolId === "jupiter");
  const urls = (cats: string[]) => [...new Set(rows.filter((r) => cats.includes(r.category)).map((r) => r.sourceUrl).filter((u): u is string => !!u))];
  return {
    marketData: urls(["tvl", "current_apy", "apy_30d"]),
    mechanics: urls(["withdrawal_mechanics", "direct_unstake_fee", "annual_management_fee", "direct_unstake_time"]),
    security: urls(["audit_security"]),
    operationalRisk: urls(["operational_risk"]),
    incidentReview: urls(["incident_review"]),
  };
}

export interface JupsolRiskScoreAssignmentStatus {
  protocolId: "jupiter";
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
 * The gate for JupSOL score assignment. A score may be assigned only when JupSOL's
 * evidence is complete AND fresh (readyForRiskGate). Never approves or selects.
 */
export function evaluateJupsolRiskScoreAssignmentStatus(options: JupsolRiskScoreOptions = {}): JupsolRiskScoreAssignmentStatus {
  const checkedAt = options.checkedAt ?? new Date().toISOString();
  const summary = getJupsolSummary(checkedAt);
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
    protocolId: "jupiter",
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
 * The JupSOL risk-score assignment (FOR REVIEW), or `null` when evidence is not fresh /
 * not `readyForRiskGate`. Deterministic; assigns no approval and selects nothing.
 */
export function getJupsolRiskScoreAssignment(options: JupsolRiskScoreOptions = {}): JupsolRiskScoreAssignment | null {
  const checkedAt = options.checkedAt ?? new Date().toISOString();
  const status = evaluateJupsolRiskScoreAssignmentStatus({ checkedAt });
  if (!status.scoreAssigned) return null;

  const weightedScore = computeWeightedScore();
  return {
    protocolId: "jupiter",
    protocolName: "Jupiter",
    assetSymbol: "JupSOL",

    score: weightedScore,
    scoreStatus: "assigned_for_review",
    scoreScale: "0_to_10",

    readyForRiskGate: status.readyForRiskGate,
    evidenceFresh: status.evidenceFresh,

    assignedAt: checkedAt,
    assignedBy: JUPSOL_RISK_SCORE_ASSIGNMENT_APPROVAL.approvedBy,
    reviewerRole: JUPSOL_RISK_SCORE_ASSIGNMENT_APPROVAL.reviewerRole,

    rubricVersion: PROTOCOL_RISK_RUBRIC_VERSION,

    dimensionScores: {
      auditSecurity: JUPSOL_DIMENSION_SCORES.audit_security,
      maturityAdoption: JUPSOL_DIMENSION_SCORES.maturity,
      tvlLiquidity: JUPSOL_DIMENSION_SCORES.tvl_adoption,
      withdrawalFeeTransparency: JUPSOL_DIMENSION_SCORES.withdrawal_fee_transparency,
      operationalDependency: JUPSOL_DIMENSION_SCORES.operational_dependency_risk,
      incidentHistory: JUPSOL_DIMENSION_SCORES.incident_history,
    },

    weightedScore,

    rationale: {
      positives: [
        "Built on Sanctum's SPL Stake Pool Program, which per Jupiter docs is audited 9 times and has secured over $4B in staked SOL across the ecosystem.",
        "Program upgrade authority is held by an 11-member multisig, and the Sanctum management authority cannot access user funds.",
        "Source-backed fresh TVL (~$391.9M) and verified current + 30-day APY, with a stable last-30 APY range (~5.55%-5.69%).",
        "Documented withdrawal paths: instant DEX swap anytime, or a delayed (~2-day / one-epoch) direct unstake with a 0.1% pool-unwrap fee.",
      ],
      risks: [
        "SOL is delegated to a SINGLE Jupiter validator, a validator-concentration dependency (operational_risk).",
        "Runs on Sanctum's SPL stake-pool infrastructure — a third-party dependency in addition to Jupiter.",
        "Fee structure is multi-component: a 5% validator commission on inflation rewards plus a separate Sanctum epoch fee on base rewards (annual_management_fee note).",
        "Delayed-unstake timing is epoch-based (~2 days), not a deterministic fixed-hours value; instant-swap pricing depends on DEX/market liquidity.",
      ],
      limitations: [
        "This risk score is assigned FOR REVIEW using the draft rubric (v0.1.0) — an internal review input, not an approval.",
        "A risk score is not an endorsement and does not by itself qualify JupSOL for real-wallet recommendation.",
        "It does not select JupSOL, replace JitoSOL, enable multi-protocol selection, or move funds.",
        "The incident_history finding is point-in-time (no independent incident found); the 'without exploits' statement is Jupiter's own, not independent verification.",
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
