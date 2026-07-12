/**
 * protocolSolLiquidStakingEvidenceDrafts — reviewable EVIDENCE DRAFTS for the SOL
 * liquid-staking candidates against each risk-rubric dimension.
 *
 * EVIDENCE GATHERING ONLY. These drafts record what sourced evidence exists (or is
 * still needed) per candidate × dimension. They:
 *  - assign NO `riskScore` (`scoreAssigned: false`, no `score` field),
 *  - do NOT approve the rubric and do NOT make any protocol eligible,
 *  - change NO production metadata (`ProtocolRiskData` / `ProtocolMarketData` /
 *    `DEFILLAMA_POOL_MAPPINGS` are untouched),
 *  - are never imported by any live/engine/UI file.
 *
 * Nothing is invented: only codebase-verifiable sources are cited; every unverified
 * dimension is `needs_review` (or `partial`) with unresolved questions, never a
 * guessed audit date, launch date, TVL, fee, timing, or incident. Absence of a
 * sourced review is never treated as a clean record.
 * `PROTOCOL_RISK_RUBRIC_APPROVED = false`, `productionReady = false`.
 */
import type { ProtocolRiskRubricDimensionId } from "./protocolRiskRubric";

/** Drafts exist (this step) but approve nothing and assign nothing. */
export const PROTOCOL_RISK_EVIDENCE_DRAFTS_EXIST = true;
export const PROTOCOL_RISK_EVIDENCE_DRAFTS_APPROVED = false;
export const PROTOCOL_RISK_EVIDENCE_DRAFTS_ASSIGN_SCORES = false;
export const PROTOCOL_RISK_EVIDENCE_DRAFTS_AFFECT_PRODUCTION = false;

export type ProtocolRiskEvidenceSourceType =
  | "official_docs"
  | "audit_report"
  | "security_page"
  | "public_api"
  | "codebase"
  | "manual_review"
  | "unavailable";

export interface ProtocolRiskEvidenceSource {
  sourceName: string;
  sourceUrl?: string;
  sourceType: ProtocolRiskEvidenceSourceType;
  retrievedAt?: string;
  notes: string[];
}

export type ProtocolRiskEvidenceDraftStatus = "gathered" | "partial" | "missing" | "needs_review" | "not_reviewed";

export interface ProtocolRiskEvidenceDraft {
  protocolId: string;
  lstSymbol: string;
  dimensionId: ProtocolRiskRubricDimensionId;
  evidenceStatus: ProtocolRiskEvidenceDraftStatus;
  sources: ProtocolRiskEvidenceSource[];
  evidenceSummary: string;
  unresolvedQuestions: string[];
  reviewerNotes: string[];
  /** Always false — evidence gathering never assigns a score. */
  scoreAssigned: false;
}

const REVIEWED = "2026-07-12";
/** Public read-only endpoint already referenced in the codebase (not guessed). */
const DEFILLAMA_YIELDS_URL = "https://yields.llama.fi/pools";

const RUBRIC_DIMENSIONS: readonly ProtocolRiskRubricDimensionId[] = [
  "audit_security",
  "maturity",
  "tvl_adoption",
  "withdrawal_fee_transparency",
  "operational_dependency_risk",
  "incident_history",
];

const LST_SYMBOL: Record<string, string> = {
  jupiter: "JupSOL",
  marinade: "mSOL",
  jito: "JitoSOL",
  blazestake: "bSOL",
  sanctum: "INF",
};

const SOL_LIQUID_STAKING_PROTOCOL_IDS = ["jupiter", "marinade", "jito", "blazestake", "sanctum"] as const;

/** Dimension-level unresolved questions (evidence a reviewer must still source). */
const DIMENSION_QUESTIONS: Record<ProtocolRiskRubricDimensionId, string[]> = {
  audit_security: [
    "Which firm(s) audited the deployed program/version, and on what date?",
    "Is the audit scope covering the current on-chain program?",
    "Are there unresolved critical/high findings disclosed?",
  ],
  maturity: [
    "What is the source-backed launch / production date?",
    "Is the protocol actively maintained per official status?",
    "Have there been major program changes since launch?",
  ],
  tvl_adoption: [
    "What is the source-backed TVL and its freshness at review time?",
    "Is adoption / holder / pool-usage evidence available?",
  ],
  withdrawal_fee_transparency: [
    "Is direct unstake epoch-delayed or instant-via-pool, and what is the exact timing?",
    "What is the documented fee schedule (deposit / unstake / management / performance)?",
    "Are protocol withdrawal and swap-route liquidity clearly separated?",
  ],
  operational_dependency_risk: [
    "Who holds upgrade / admin authority, and under what controls?",
    "What stake-pool / validator / oracle / routing dependencies exist?",
    "What is the custody model and external-dependency surface?",
  ],
  incident_history: [
    "Are there disclosed incidents or official postmortems?",
    "Are there security advisories affecting the deployed version?",
  ],
};

function buildDraft(protocolId: string, dimensionId: ProtocolRiskRubricDimensionId): ProtocolRiskEvidenceDraft {
  const lstSymbol = LST_SYMBOL[protocolId];
  const displayName = protocolId.charAt(0).toUpperCase() + protocolId.slice(1);
  const base = {
    protocolId,
    lstSymbol,
    dimensionId,
    unresolvedQuestions: [...DIMENSION_QUESTIONS[dimensionId]],
    reviewerNotes: [] as string[],
    scoreAssigned: false as const,
  };

  // The only codebase-verifiable dimension today is TVL for Sanctum/INF.
  if (dimensionId === "tvl_adoption") {
    if (protocolId === "sanctum") {
      return {
        ...base,
        evidenceStatus: "partial",
        sources: [
          {
            sourceName: "DefiLlama pool 3075a746-bdd1-4aac-bcd5-b035abee2622 (INF)",
            sourceUrl: DEFILLAMA_YIELDS_URL,
            sourceType: "codebase",
            retrievedAt: REVIEWED,
            notes: ["Verified in DEFILLAMA_POOL_MAPPINGS / lstApy.ts. TVL value fetched at runtime; adoption/holder evidence not sourced."],
          },
        ],
        evidenceSummary: "TVL source is verified (DefiLlama INF pool); adoption/holder evidence is not sourced yet.",
      };
    }
    return {
      ...base,
      evidenceStatus: "needs_review",
      sources: [
        {
          sourceName: `DefiLlama yields API — filter by project + ${lstSymbol}`,
          sourceUrl: DEFILLAMA_YIELDS_URL,
          sourceType: "public_api",
          notes: [`No verified DefiLlama pool UUID for ${lstSymbol} yet; APY is code-backed but TVL pool must be confirmed (see 12O source candidates). Not guessed.`],
        },
      ],
      evidenceSummary: `APY source is code-backed, but no verified DefiLlama TVL pool UUID exists for ${lstSymbol} yet.`,
    };
  }

  // All other dimensions: no verified external source yet → needs_review, no sources.
  const summaryByDimension: Record<Exclude<ProtocolRiskRubricDimensionId, "tvl_adoption">, string> = {
    audit_security: `No official audit report or security-page source has been verified for ${displayName} yet.`,
    maturity: `Launch date and time-in-production for ${displayName} are not source-backed yet.`,
    withdrawal_fee_transparency: `Unstake mechanics, timing, and fee schedule for ${displayName} are not source-backed yet; swap-route liquidity is not protocol withdrawal.`,
    operational_dependency_risk: `Admin/upgrade authority, dependencies, and custody model for ${displayName} are not source-backed yet.`,
    incident_history: `No sourced incident review exists for ${displayName}; absence of evidence is not treated as a clean history.`,
  };
  return {
    ...base,
    evidenceStatus: "needs_review",
    sources: [],
    evidenceSummary: summaryByDimension[dimensionId as Exclude<ProtocolRiskRubricDimensionId, "tvl_adoption">],
  };
}

/** All 30 evidence drafts (5 candidates × 6 dimensions). */
export const SOL_LIQUID_STAKING_EVIDENCE_DRAFTS: readonly ProtocolRiskEvidenceDraft[] =
  SOL_LIQUID_STAKING_PROTOCOL_IDS.flatMap((id) => RUBRIC_DIMENSIONS.map((dim) => buildDraft(id, dim)));

export function getSolLiquidStakingEvidenceDrafts(protocolId?: string): ProtocolRiskEvidenceDraft[] {
  return protocolId == null
    ? [...SOL_LIQUID_STAKING_EVIDENCE_DRAFTS]
    : SOL_LIQUID_STAKING_EVIDENCE_DRAFTS.filter((d) => d.protocolId === protocolId);
}

export function getSolLiquidStakingEvidenceDraft(
  protocolId: string,
  dimensionId: ProtocolRiskRubricDimensionId
): ProtocolRiskEvidenceDraft | undefined {
  return SOL_LIQUID_STAKING_EVIDENCE_DRAFTS.find((d) => d.protocolId === protocolId && d.dimensionId === dimensionId);
}

export function getEvidenceDraftsByStatus(status: ProtocolRiskEvidenceDraftStatus): ProtocolRiskEvidenceDraft[] {
  return SOL_LIQUID_STAKING_EVIDENCE_DRAFTS.filter((d) => d.evidenceStatus === status);
}

/** Dimensions for a protocol that are not yet fully gathered (still need evidence). */
export function getMissingEvidenceDraftsForProtocol(protocolId: string): ProtocolRiskEvidenceDraft[] {
  return getSolLiquidStakingEvidenceDrafts(protocolId).filter((d) => d.evidenceStatus !== "gathered");
}

export interface ProtocolRiskEvidenceCoverageSummary {
  totalDrafts: number;
  gathered: number;
  partial: number;
  missing: number;
  needsReview: number;
  notReviewed: number;
  protocolsCovered: number;
  dimensionsCovered: number;
  scoreAssignedCount: number;
}

export function summarizeEvidenceCoverage(): ProtocolRiskEvidenceCoverageSummary {
  const drafts = SOL_LIQUID_STAKING_EVIDENCE_DRAFTS;
  const countStatus = (s: ProtocolRiskEvidenceDraftStatus) => drafts.filter((d) => d.evidenceStatus === s).length;
  return {
    totalDrafts: drafts.length,
    gathered: countStatus("gathered"),
    partial: countStatus("partial"),
    missing: countStatus("missing"),
    needsReview: countStatus("needs_review"),
    notReviewed: countStatus("not_reviewed"),
    protocolsCovered: new Set(drafts.map((d) => d.protocolId)).size,
    dimensionsCovered: new Set(drafts.map((d) => d.dimensionId)).size,
    // scoreAssigned is the literal `false` for every draft — this count is always 0.
    scoreAssignedCount: drafts.filter((d) => d.scoreAssigned as boolean).length,
  };
}
