/**
 * solLiquidStakingInfRiskScore — Step 14O. Assigns a deterministic, evidence-based risk
 * score to Sanctum · INF FOR REVIEW, from its completed 14O evidence package and the
 * existing draft risk rubric. Mirrors the mSOL (14J), JupSOL (14M), and bSOL (14N)
 * scoring modules, but INF is a MULTI-LST / shared-liquidity POOL — its rationale and
 * `poolComposition` explicitly capture the underlying-LST exposure and the OVERLAP with
 * the selected protocol (JitoSOL) and existing review candidates (bSOL), so no
 * independent-diversification benefit is implied.
 *
 * SCORE ASSIGNMENT ONLY (Ashot-authorized for scoring if evidence is complete + fresh).
 * It does NOT approve INF for real-wallet recommendation, select it via protocol logic,
 * replace JitoSOL, enable multi-protocol selection, update live recommendations, or
 * enable transactions / signatures. The score is `assigned_for_review` (using the DRAFT
 * rubric v0.1.0), not a final production score. It is only assigned when INF's evidence
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

export const SOL_LST_INF_RISK_SCORE_EXISTS = true;
/** Ashot authorized risk-score assignment from the completed evidence, if fresh. */
export const SOL_LST_INF_RISK_SCORE_ASSIGNMENT_ENABLED = true;
export const SOL_LST_INF_RISK_SCORE_APPROVES_READ_ONLY_RECOMMENDATION = false;
export const SOL_LST_INF_RISK_SCORE_ENABLES_MULTI_PROTOCOL_SELECTION = false;
export const SOL_LST_INF_RISK_SCORE_UPDATES_LIVE_RECOMMENDATIONS = false;
export const SOL_LST_INF_RISK_SCORE_ENABLES_TRANSACTIONS = false;
export const SOL_LST_INF_RISK_SCORE_REQUIRES_WALLET_SIGNATURE = false;
export const SOL_LST_INF_RISK_SCORE_REPLACES_JITO = false;

/** INF is a multi-LST pool, so its exposure OVERLAPS other candidates. */
export const SOL_LST_INF_IS_MULTI_LST_POOL = true;

/**
 * Narrowly-scoped approval: Ashot authorized ASSIGNING INF a risk score for review from
 * the completed evidence. This is NOT a read-only recommendation approval.
 */
export const INF_RISK_SCORE_ASSIGNMENT_APPROVAL = {
  scope: "risk_score_assignment_only" as const,
  approvedBy: "Ashot",
  reviewerRole: "founder" as const,
  approvesReadOnlyRecommendation: false as const,
} as const;

export type InfReviewerRole = "founder" | "product" | "risk" | "engineering" | "compliance";

/** INF-specific multi-LST / shared-liquidity pool composition + overlap disclosure. */
export interface InfPoolComposition {
  isMultiLstPool: true;
  poolType: string;
  underlyingExposure: string;
  overlapNote: string;
}

export interface InfRiskScoreAssignment {
  protocolId: "sanctum";
  protocolName: "Sanctum";
  assetSymbol: "INF";

  isMultiLstPool: true;
  poolComposition: InfPoolComposition;

  score: number;
  scoreStatus: "assigned_for_review";
  scoreScale: "0_to_10";

  readyForRiskGate: boolean;
  evidenceFresh: boolean;

  assignedAt: string;
  assignedBy: string;
  reviewerRole: InfReviewerRole;

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

/** INF's multi-LST composition + overlap disclosure (never framed as diversification). */
export const INF_POOL_COMPOSITION: InfPoolComposition = {
  isMultiLstPool: true,
  poolType: "Multi-LST pool (shared liquidity)",
  underlyingExposure:
    "INF is a shared-liquidity pool that holds multiple underlying LSTs — all Sanctum LSTs plus non-Sanctum jitoSOL and bSOL, plus SOL/wSOL — with dynamic allocation (excess SOL staked to top-performing Sanctum LSTs; underperformers unstaked), not fixed weights.",
  overlapNote:
    "Underlying exposure OVERLAPS with the currently selected protocol (JitoSOL) and an existing review candidate (bSOL): holding INF is partial exposure to the same underlying assets plus Sanctum pool/program risk, so it is NOT independent diversification.",
};

/* ------------------------------------------------------------------ *
 * Deterministic dimension scores (0–10) for INF, each tied to recorded evidence.
 * These are reviewer judgments; the weighted aggregation below is computed from the
 * rubric weights so the result is reproducible. See the .md for full rationale.
 * ------------------------------------------------------------------ */
const INF_DIMENSION_SCORES: Record<ProtocolRiskRubricDimensionId, number> = {
  // Infinity program audited 3× (OtterSec, Sec3, Neodyme) + base SPL stake pool audited
  // 5×; strong, but INF adds its own program surface (S Controller, pricing, per-LST
  // value calculators) beyond a single stake pool.
  audit_security: 8,
  // Sanctum is an established Solana staking platform; INF has run ~1 year. Moderate
  // maturity for a multi-LST pool product.
  maturity: 7,
  // Source-backed fresh pool TVL ~$152.6M (upper-mid; larger than mSOL/bSOL, below JupSOL).
  tvl_adoption: 7,
  // Withdrawal fee is a clear 0.2% and there is no management fee, but swap fees "vary by
  // LST" (no single published rate) and the pool fee model (90/10 split) adds complexity.
  withdrawal_fee_transparency: 7,
  // HIGHER operational surface than a single LST: multi-LST basket (inherits aggregate
  // component risk), dynamic allocation mechanism, dependency on S Controller + Pricing +
  // per-LST SOL Value Calculator programs, and OVERLAP with JitoSOL/bSOL (not independent).
  operational_dependency_risk: 5,
  // Point-in-time review found no independent INF-specific incident/postmortem (not a
  // clean-history claim); Sanctum's "over a year without issues" is its own statement.
  incident_history: 7,
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** The deterministic weighted score (0–10) from the rubric weights. */
function computeWeightedScore(): number {
  const dims = getProtocolRiskRubricDimensions();
  const totalWeight = dims.reduce((s, d) => s + d.weight, 0);
  const weighted = dims.reduce((s, d) => s + INF_DIMENSION_SCORES[d.id] * d.weight, 0) / totalWeight;
  return round2(weighted);
}

interface InfRiskScoreOptions {
  checkedAt?: string;
}

function getInfSummary(checkedAt: string) {
  return getSolLstFreshEvidenceSummaries({ checkedAt }).find((s) => s.protocolId === "sanctum");
}

function evidenceRefsFor(checkedAt: string): InfRiskScoreAssignment["evidenceRefs"] {
  const rows = getSolLstFreshEvidenceRecords({ checkedAt }).filter((r) => r.protocolId === "sanctum");
  const urls = (cats: string[]) => [...new Set(rows.filter((r) => cats.includes(r.category)).map((r) => r.sourceUrl).filter((u): u is string => !!u))];
  return {
    marketData: urls(["tvl", "current_apy", "apy_30d"]),
    mechanics: urls(["withdrawal_mechanics", "direct_unstake_fee", "annual_management_fee", "direct_unstake_time"]),
    security: urls(["audit_security"]),
    operationalRisk: urls(["operational_risk"]),
    incidentReview: urls(["incident_review"]),
  };
}

export interface InfRiskScoreAssignmentStatus {
  protocolId: "sanctum";
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
 * The gate for INF score assignment. A score may be assigned only when INF's evidence is
 * complete AND fresh (readyForRiskGate). Never approves or selects.
 */
export function evaluateInfRiskScoreAssignmentStatus(options: InfRiskScoreOptions = {}): InfRiskScoreAssignmentStatus {
  const checkedAt = options.checkedAt ?? new Date().toISOString();
  const summary = getInfSummary(checkedAt);
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
    protocolId: "sanctum",
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
 * The INF risk-score assignment (FOR REVIEW), or `null` when evidence is not fresh / not
 * `readyForRiskGate`. Deterministic; assigns no approval and selects nothing. Carries the
 * multi-LST `poolComposition` + overlap disclosure.
 */
export function getInfRiskScoreAssignment(options: InfRiskScoreOptions = {}): InfRiskScoreAssignment | null {
  const checkedAt = options.checkedAt ?? new Date().toISOString();
  const status = evaluateInfRiskScoreAssignmentStatus({ checkedAt });
  if (!status.scoreAssigned) return null;

  const weightedScore = computeWeightedScore();
  return {
    protocolId: "sanctum",
    protocolName: "Sanctum",
    assetSymbol: "INF",

    isMultiLstPool: true,
    poolComposition: INF_POOL_COMPOSITION,

    score: weightedScore,
    scoreStatus: "assigned_for_review",
    scoreScale: "0_to_10",

    readyForRiskGate: status.readyForRiskGate,
    evidenceFresh: status.evidenceFresh,

    assignedAt: checkedAt,
    assignedBy: INF_RISK_SCORE_ASSIGNMENT_APPROVAL.approvedBy,
    reviewerRole: INF_RISK_SCORE_ASSIGNMENT_APPROVAL.reviewerRole,

    rubricVersion: PROTOCOL_RISK_RUBRIC_VERSION,

    dimensionScores: {
      auditSecurity: INF_DIMENSION_SCORES.audit_security,
      maturityAdoption: INF_DIMENSION_SCORES.maturity,
      tvlLiquidity: INF_DIMENSION_SCORES.tvl_adoption,
      withdrawalFeeTransparency: INF_DIMENSION_SCORES.withdrawal_fee_transparency,
      operationalDependency: INF_DIMENSION_SCORES.operational_dependency_risk,
      incidentHistory: INF_DIMENSION_SCORES.incident_history,
    },

    weightedScore,

    rationale: {
      positives: [
        "Infinity program audited 3× (OtterSec, Sec3, Neodyme) on top of the 5×-audited base SPL stake-pool program; issues reported remediated.",
        "Instant pool redemption (RemoveLiquidity) — no per-LST unstake cooldown for the holder — plus a clear 0.2% withdrawal fee and no management/performance fee on rewards at the pool level.",
        "Source-backed fresh pool TVL (~$152.6M) and verified current + 30-day APY (30-day mean ~5.95%).",
        "Established Sanctum platform; Infinity has operated for roughly a year (per Sanctum).",
      ],
      risks: [
        "INF is a MULTI-LST pool: it holds many underlying LSTs (all Sanctum LSTs + jitoSOL + bSOL + SOL/wSOL) and inherits the aggregate risk of its components.",
        "OVERLAP — its underlying exposure overlaps the selected protocol (JitoSOL) and an existing review candidate (bSOL), so it is NOT independent diversification but partial exposure to the same assets plus pool risk.",
        "Added operational surface vs a single LST: dynamic allocation logic and dependency on Sanctum's S Controller, Pricing Program, and per-LST SOL Value Calculator programs for correct valuation.",
        "Swap fees vary by LST (no single published rate), reducing fee transparency relative to a flat single-LST fee.",
      ],
      limitations: [
        "This risk score is assigned FOR REVIEW using the draft rubric (v0.1.0) — an internal review input, not an approval.",
        "A risk score is not an endorsement and does not by itself qualify INF for real-wallet recommendation.",
        "It does not select INF, replace JitoSOL, enable multi-protocol selection, or move funds.",
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
