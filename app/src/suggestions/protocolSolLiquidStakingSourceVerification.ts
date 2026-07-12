/**
 * protocolSolLiquidStakingSourceVerification — reviewer source-verification INTAKE
 * for the SOL liquid-staking candidates.
 *
 * Classifies reviewer-supplied source candidates as `verified` / `rejected` /
 * `needs_review` at the SOURCE level only. "verified" means the source LINK is a
 * legitimate source of the right kind (e.g. an exact DefiLlama pool, or an official
 * docs URL) — it does NOT confirm a production value.
 *
 * INTAKE ONLY. This module:
 *  - writes NO production metadata (no TVL/withdrawal/fee/audit values),
 *  - assigns NO `riskScore` and approves no rubric,
 *  - marks no candidate `approved_for_scoring` and selects no protocol,
 *  - mutates NO evidence drafts.
 *
 * Nothing is invented: DefiLlama pool IDs / official URLs here are reviewer inputs;
 * their CONTENT is confirmed by a separate manual review. Incident history stays
 * `needs_review` (absence of known incidents is never a clean record).
 * `PROTOCOL_SELECTION_IMPLEMENTED = false`; `productionReady = false`.
 */
import type { ProtocolRiskRubricDimensionId } from "./protocolRiskRubric";
import { getSolLiquidStakingEvidenceDrafts } from "./protocolSolLiquidStakingEvidenceDrafts";

export const PROTOCOL_SOURCE_VERIFICATION_EXISTS = true;
export const PROTOCOL_SOURCE_VERIFICATION_APPROVES_RUBRIC = false;
export const PROTOCOL_SOURCE_VERIFICATION_ASSIGNS_SCORES = false;
export const PROTOCOL_SOURCE_VERIFICATION_AFFECTS_PRODUCTION = false;
export const PROTOCOL_SOURCE_VERIFICATION_ENABLES_SELECTION = false;

export type ProtocolSourceVerificationCategory =
  | "tvl"
  | "apy"
  | "withdrawal"
  | "fees"
  | "audit_security"
  | "operational_dependency"
  | "incident_history";

export type ProtocolSourceVerificationStatus = "verified" | "rejected" | "needs_review";

export type ProtocolSourceVerificationEvidenceType =
  | "defillama_pool"
  | "official_docs"
  | "official_support"
  | "audit_report"
  | "security_page"
  | "codebase"
  | "manual_review";

export interface ProtocolSourceVerificationCandidate {
  protocolId: string;
  lstSymbol: string;
  category: ProtocolSourceVerificationCategory;
  sourceName: string;
  sourceUrl?: string;
  sourceType: ProtocolSourceVerificationEvidenceType;
  /** Reviewer text (e.g. an expected DefiLlama label). Never a production value. */
  proposedValue?: string;
  notes: string[];
}

export interface ProtocolSourceVerificationResult {
  protocolId: string;
  lstSymbol: string;
  category: ProtocolSourceVerificationCategory;
  sourceName: string;
  sourceUrl?: string;
  sourceType: ProtocolSourceVerificationEvidenceType;
  status: ProtocolSourceVerificationStatus;
  /** Left ABSENT in 12T — source verification never assigns a production value. */
  verifiedValue?: string;
  reviewedAt?: string;
  reviewer?: string;
  reasons: string[];
  unresolvedQuestions: string[];
  /** Always false — intake never writes production metadata. */
  productionMetadataUpdated: false;
  /** Always false — intake never assigns a score. */
  scoreAssigned: false;
}

export interface ProtocolSourceVerificationSummary {
  totalCandidates: number;
  verified: number;
  rejected: number;
  needsReview: number;
  productionMetadataUpdatedCount: 0;
  scoreAssignedCount: 0;
  protocolsCovered: string[];
  categoriesCovered: ProtocolSourceVerificationCategory[];
}

const REVIEWED = "2026-07-12";
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
/** Existing codebase-verified DefiLlama INF pool (from lstApy.ts / mappings). */
const INF_CODEBASE_POOL = "3075a746-bdd1-4aac-bcd5-b035abee2622";

const LST_SYMBOL: Record<string, string> = {
  jupiter: "JupSOL",
  marinade: "mSOL",
  jito: "JitoSOL",
  blazestake: "bSOL",
  sanctum: "INF",
};

interface RawCandidate {
  category: ProtocolSourceVerificationCategory;
  sourceName: string;
  sourceUrl?: string;
  sourceType: ProtocolSourceVerificationEvidenceType;
  proposedValue?: string;
  notes?: string[];
}

/** Reviewer-supplied source candidates per protocol (proposals for verification). */
const RAW_CANDIDATES: Record<string, RawCandidate[]> = {
  jupiter: [
    { category: "tvl", sourceName: "DefiLlama pool (JupSOL)", sourceUrl: "https://defillama.com/yields/pool/52bd72a7-9e81-4112-abb4-71673e8de9bf", sourceType: "defillama_pool", proposedValue: "JUPSOL — Jupiter Staked SOL — Solana" },
    { category: "withdrawal", sourceName: "Jupiter — JupSOL staking docs", sourceUrl: "https://docs.jup.ag/user-docs/earn/stake-sol/jupsol", sourceType: "official_docs" },
    { category: "withdrawal", sourceName: "Jupiter — JupSOL FAQ", sourceUrl: "https://docs.jup.ag/user-docs/earn/stake-sol/faq", sourceType: "official_docs" },
    { category: "fees", sourceName: "Jupiter — JupSOL fees (support)", sourceUrl: "https://jupiverse.zendesk.com/hc/en-us/articles/22619715170972-What-are-the-fees-associated-with-JupSOL", sourceType: "official_support" },
    { category: "fees", sourceName: "Jupiter — JupSOL staking docs", sourceUrl: "https://docs.jup.ag/user-docs/earn/stake-sol/jupsol", sourceType: "official_docs" },
    { category: "audit_security", sourceName: "Jupiter — JupSOL staking docs", sourceUrl: "https://docs.jup.ag/user-docs/earn/stake-sol/jupsol", sourceType: "security_page", notes: ["Likely depends on Sanctum / SPL Stake Pool security model; keep needs_review unless scope is explicit."] },
    { category: "audit_security", sourceName: "Jupiter — JupSOL FAQ", sourceUrl: "https://docs.jup.ag/user-docs/earn/stake-sol/faq", sourceType: "security_page", notes: ["Audit scope not explicit here."] },
    { category: "operational_dependency", sourceName: "Jupiter — JupSOL staking docs", sourceUrl: "https://docs.jup.ag/user-docs/earn/stake-sol/jupsol", sourceType: "official_docs" },
    { category: "operational_dependency", sourceName: "Jupiter — JupSOL FAQ", sourceUrl: "https://docs.jup.ag/user-docs/earn/stake-sol/faq", sourceType: "official_docs" },
    { category: "incident_history", sourceName: "No official incident/advisory source supplied", sourceType: "manual_review" },
  ],
  marinade: [
    { category: "tvl", sourceName: "DefiLlama pool (mSOL)", sourceUrl: "https://defillama.com/yields/pool/b3f93865-5ec8-4662-90a0-11808e0aa2bd", sourceType: "defillama_pool", proposedValue: "MSOL — Marinade Liquid Staking — Solana" },
    { category: "withdrawal", sourceName: "Marinade — instant unstake", sourceUrl: "https://docs.marinade.finance/marinade-protocol/protocol-overview/marinade-instant-unstake", sourceType: "official_docs" },
    { category: "fees", sourceName: "Marinade — fees and pricing", sourceUrl: "https://docs.marinade.finance/marinade-protocol/protocol-overview/fees-and-pricing", sourceType: "official_docs" },
    { category: "fees", sourceName: "Marinade — instant unstake", sourceUrl: "https://docs.marinade.finance/marinade-protocol/protocol-overview/marinade-instant-unstake", sourceType: "official_docs" },
    { category: "audit_security", sourceName: "Marinade — audits", sourceUrl: "https://docs.marinade.finance/marinade-protocol/security/audits", sourceType: "audit_report" },
    { category: "audit_security", sourceName: "Marinade — security", sourceUrl: "https://docs.marinade.finance/marinade-protocol/security", sourceType: "security_page" },
    { category: "operational_dependency", sourceName: "Marinade — mSOL token", sourceUrl: "https://docs.marinade.finance/marinade-protocol/protocol-overview/marinade-liquid/msol-token", sourceType: "official_docs" },
    { category: "operational_dependency", sourceName: "Marinade — security", sourceUrl: "https://docs.marinade.finance/marinade-protocol/security", sourceType: "security_page" },
    { category: "incident_history", sourceName: "No official incident/advisory source supplied", sourceType: "manual_review" },
  ],
  jito: [
    { category: "tvl", sourceName: "DefiLlama pool (JitoSOL)", sourceUrl: "https://defillama.com/yields/pool/0e7d0722-9054-4907-8593-567b353c0900", sourceType: "defillama_pool", proposedValue: "JITOSOL — Jito Liquid Staking — Solana" },
    { category: "withdrawal", sourceName: "Jito — unstaking overview", sourceUrl: "https://www.jito.network/docs/jitosol/get-started/unstaking-jitosol-flow/unstaking-overview/", sourceType: "official_docs" },
    { category: "fees", sourceName: "Jito — unstaking overview", sourceUrl: "https://www.jito.network/docs/jitosol/get-started/unstaking-jitosol-flow/unstaking-overview/", sourceType: "official_docs" },
    { category: "fees", sourceName: "Jito — general FAQs", sourceUrl: "https://www.jito.network/docs/jitosol/faqs/general-faqs/", sourceType: "official_docs" },
    { category: "audit_security", sourceName: "Jito — security overview", sourceUrl: "https://www.jito.network/docs/jitosol/jitosol-liquid-staking/security/overview/", sourceType: "security_page" },
    { category: "operational_dependency", sourceName: "Jito — security overview", sourceUrl: "https://www.jito.network/docs/jitosol/jitosol-liquid-staking/security/overview/", sourceType: "security_page" },
    { category: "incident_history", sourceName: "No official incident/advisory source supplied", sourceType: "manual_review" },
  ],
  blazestake: [
    { category: "tvl", sourceName: "DefiLlama pool (bSOL)", sourceUrl: "https://defillama.com/yields/pool/387d6732-59f0-4ae0-8a88-aba75a5cbe4a", sourceType: "defillama_pool", proposedValue: "BSOL — BlazeStake — Solana" },
    { category: "withdrawal", sourceName: "BlazeStake — docs", sourceUrl: "https://stake-docs.solblaze.org/", sourceType: "official_docs" },
    { category: "fees", sourceName: "BlazeStake — docs", sourceUrl: "https://stake-docs.solblaze.org/", sourceType: "official_docs" },
    { category: "fees", sourceName: "BlazeStake — fees", sourceUrl: "https://stake-docs.solblaze.org/protocol/fees", sourceType: "official_docs" },
    { category: "audit_security", sourceName: "BlazeStake — audits", sourceUrl: "https://stake-docs.solblaze.org/protocol/audits", sourceType: "audit_report" },
    { category: "operational_dependency", sourceName: "BlazeStake — docs", sourceUrl: "https://stake-docs.solblaze.org/", sourceType: "official_docs" },
    { category: "operational_dependency", sourceName: "BlazeStake — audits", sourceUrl: "https://stake-docs.solblaze.org/protocol/audits", sourceType: "audit_report" },
    { category: "incident_history", sourceName: "No official incident/advisory source supplied", sourceType: "manual_review" },
  ],
  sanctum: [
    { category: "tvl", sourceName: "DefiLlama INF pool (codebase-verified)", sourceUrl: `https://defillama.com/yields/pool/${INF_CODEBASE_POOL}`, sourceType: "codebase", proposedValue: "INF — Sanctum Infinity — Solana", notes: ["Existing codebase-verified pool in DEFILLAMA_POOL_MAPPINGS / lstApy.ts. Not duplicated or changed."] },
    { category: "withdrawal", sourceName: "Sanctum — Infinity docs", sourceUrl: "https://learn.sanctum.so/docs/technical-documentation/infinity", sourceType: "official_docs" },
    { category: "withdrawal", sourceName: "Sanctum — swap vs unstake", sourceUrl: "https://sanctum.so/blog/swap-vs-unstake-sol-lst-cheapest-exit", sourceType: "official_docs", notes: ["Distinguishes swap-route liquidity from protocol unstake — do not conflate."] },
    { category: "fees", sourceName: "Sanctum — LSTs docs", sourceUrl: "https://learn.sanctum.so/docs/technical-documentation/sanctum-lsts", sourceType: "official_docs" },
    { category: "fees", sourceName: "Sanctum — Infinity docs", sourceUrl: "https://learn.sanctum.so/docs/technical-documentation/infinity", sourceType: "official_docs" },
    { category: "audit_security", sourceName: "Sanctum — LSTs docs", sourceUrl: "https://learn.sanctum.so/docs/technical-documentation/sanctum-lsts", sourceType: "security_page" },
    { category: "operational_dependency", sourceName: "Sanctum — Infinity docs", sourceUrl: "https://learn.sanctum.so/docs/technical-documentation/infinity", sourceType: "official_docs" },
    { category: "operational_dependency", sourceName: "Sanctum — LSTs docs", sourceUrl: "https://learn.sanctum.so/docs/technical-documentation/sanctum-lsts", sourceType: "official_docs" },
    { category: "incident_history", sourceName: "No official incident/advisory source supplied", sourceType: "manual_review" },
  ],
};

const SOL_LIQUID_STAKING_PROTOCOL_IDS = ["jupiter", "marinade", "jito", "blazestake", "sanctum"] as const;

/** All reviewer-supplied verification candidates (proposals, not production truth). */
export const SOL_LIQUID_STAKING_SOURCE_VERIFICATION_CANDIDATES: readonly ProtocolSourceVerificationCandidate[] =
  SOL_LIQUID_STAKING_PROTOCOL_IDS.flatMap((protocolId) =>
    RAW_CANDIDATES[protocolId].map((c) => ({
      protocolId,
      lstSymbol: LST_SYMBOL[protocolId],
      category: c.category,
      sourceName: c.sourceName,
      ...(c.sourceUrl ? { sourceUrl: c.sourceUrl } : {}),
      sourceType: c.sourceType,
      ...(c.proposedValue ? { proposedValue: c.proposedValue } : {}),
      notes: c.notes ?? [],
    }))
  );

export function getSolLiquidStakingSourceVerificationCandidates(
  protocolId?: string
): ProtocolSourceVerificationCandidate[] {
  return protocolId == null
    ? [...SOL_LIQUID_STAKING_SOURCE_VERIFICATION_CANDIDATES]
    : SOL_LIQUID_STAKING_SOURCE_VERIFICATION_CANDIDATES.filter((c) => c.protocolId === protocolId);
}

const VALUE_CONFIRM_QUESTION = "Confirm the exact value/mechanics from this source in a later manual review before any production use.";

/**
 * Classify one candidate. Deterministic and source-level only — never assigns a
 * production value, score, or auditStatus.
 *
 * - incident_history → always `needs_review` (absence is not a clean record).
 * - tvl: `verified` when codebase, or when a DefiLlama pool has an exact pool UUID
 *   + expected LST symbol + Solana chain in its label; else `needs_review`.
 * - other categories: `verified` as SOURCE EXISTENCE when an acceptable official
 *   source link is present; the production value stays unconfirmed.
 */
export function verifySolLiquidStakingSourceCandidate(
  candidate: ProtocolSourceVerificationCandidate
): ProtocolSourceVerificationResult {
  const base = {
    protocolId: candidate.protocolId,
    lstSymbol: candidate.lstSymbol,
    category: candidate.category,
    sourceName: candidate.sourceName,
    ...(candidate.sourceUrl ? { sourceUrl: candidate.sourceUrl } : {}),
    sourceType: candidate.sourceType,
    reviewedAt: REVIEWED,
    productionMetadataUpdated: false as const,
    scoreAssigned: false as const,
  };

  if (candidate.category === "incident_history") {
    return {
      ...base,
      status: "needs_review",
      reasons: ["No official incident/advisory/postmortem source supplied. Absence of known incidents is not evidence of a clean history."],
      unresolvedQuestions: ["Provide a verified official incident/advisory/postmortem source, or a documented manual incident-review result."],
    };
  }

  if (candidate.category === "tvl") {
    if (candidate.sourceType === "codebase") {
      return {
        ...base,
        status: "verified",
        reasons: ["Existing codebase-verified DefiLlama INF pool. Source-level only; no TVL value assigned here."],
        unresolvedQuestions: [],
      };
    }
    const hasPoolId = candidate.sourceUrl != null && UUID_RE.test(candidate.sourceUrl);
    const label = (candidate.proposedValue ?? "").toUpperCase();
    const hasSymbol = label.includes(candidate.lstSymbol.toUpperCase());
    const hasChain = label.includes("SOLANA");
    if (candidate.sourceType === "defillama_pool" && hasPoolId && hasSymbol && hasChain) {
      return {
        ...base,
        status: "verified",
        reasons: ["Exact DefiLlama pool UUID + expected LST symbol + Solana chain present. Verified as a source candidate only; no TVL value assigned and NOT promoted to DEFILLAMA_POOL_MAPPINGS."],
        unresolvedQuestions: ["Confirm the pool label/asset matches on DefiLlama before any production use."],
      };
    }
    return {
      ...base,
      status: "needs_review",
      reasons: ["DefiLlama TVL source lacks an exact pool UUID, expected symbol, or Solana chain label."],
      unresolvedQuestions: [VALUE_CONFIRM_QUESTION],
    };
  }

  // withdrawal / fees / audit_security / operational_dependency.
  const acceptable: ProtocolSourceVerificationEvidenceType[] = ["official_docs", "official_support", "audit_report", "security_page", "codebase"];
  const auditScopeUnclear = candidate.notes.some((n) => n.toLowerCase().includes("needs_review") || n.toLowerCase().includes("not explicit"));
  if (candidate.sourceUrl != null && acceptable.includes(candidate.sourceType) && !auditScopeUnclear) {
    const categoryNote =
      candidate.category === "audit_security"
        ? "Source link verified as existence only; auditStatus stays unknown (no firm/report scope confirmed)."
        : candidate.category === "withdrawal"
          ? "Source link verified as existence only; withdrawalTimeHours stays unset."
          : candidate.category === "fees"
            ? "Source link verified as existence only; fee values stay unset."
            : "Source link verified as existence only; operational values stay unset.";
    return {
      ...base,
      status: "verified",
      reasons: [categoryNote, ...candidate.notes],
      unresolvedQuestions: [VALUE_CONFIRM_QUESTION],
    };
  }

  return {
    ...base,
    status: "needs_review",
    reasons: ["Source scope not explicit or source type not sufficient for source-level verification.", ...candidate.notes],
    unresolvedQuestions: [VALUE_CONFIRM_QUESTION],
  };
}

export function getSolLiquidStakingSourceVerificationResults(
  protocolId?: string
): ProtocolSourceVerificationResult[] {
  return getSolLiquidStakingSourceVerificationCandidates(protocolId).map(verifySolLiquidStakingSourceCandidate);
}

export function summarizeSolLiquidStakingSourceVerification(): ProtocolSourceVerificationSummary {
  const results = getSolLiquidStakingSourceVerificationResults();
  const countStatus = (s: ProtocolSourceVerificationStatus) => results.filter((r) => r.status === s).length;
  return {
    totalCandidates: results.length,
    verified: countStatus("verified"),
    rejected: countStatus("rejected"),
    needsReview: countStatus("needs_review"),
    productionMetadataUpdatedCount: 0,
    scoreAssignedCount: 0,
    protocolsCovered: [...new Set(results.map((r) => r.protocolId))],
    categoriesCovered: [...new Set(results.map((r) => r.category))],
  };
}

export function getVerifiedSourceResults(
  protocolId?: string,
  category?: ProtocolSourceVerificationCategory
): ProtocolSourceVerificationResult[] {
  return getSolLiquidStakingSourceVerificationResults(protocolId).filter(
    (r) => r.status === "verified" && (category == null || r.category === category)
  );
}

export function getNeedsReviewSourceResults(
  protocolId?: string,
  category?: ProtocolSourceVerificationCategory
): ProtocolSourceVerificationResult[] {
  return getSolLiquidStakingSourceVerificationResults(protocolId).filter(
    (r) => r.status === "needs_review" && (category == null || r.category === category)
  );
}

export function getRejectedSourceResults(
  protocolId?: string,
  category?: ProtocolSourceVerificationCategory
): ProtocolSourceVerificationResult[] {
  return getSolLiquidStakingSourceVerificationResults(protocolId).filter(
    (r) => r.status === "rejected" && (category == null || r.category === category)
  );
}

/** Verification category → rubric evidence dimension. */
const CATEGORY_TO_DIMENSION: Record<ProtocolSourceVerificationCategory, ProtocolRiskRubricDimensionId> = {
  tvl: "tvl_adoption",
  apy: "tvl_adoption",
  withdrawal: "withdrawal_fee_transparency",
  fees: "withdrawal_fee_transparency",
  audit_security: "audit_security",
  operational_dependency: "operational_dependency_risk",
  incident_history: "incident_history",
};

const ALL_RUBRIC_DIMENSIONS: readonly ProtocolRiskRubricDimensionId[] = [
  "audit_security",
  "maturity",
  "tvl_adoption",
  "withdrawal_fee_transparency",
  "operational_dependency_risk",
  "incident_history",
];

export interface VerifiedSourceToEvidenceMap {
  protocolId: string;
  lstSymbol: string;
  dimensionsWithVerifiedSources: ProtocolRiskRubricDimensionId[];
  dimensionsStillNeedsReview: ProtocolRiskRubricDimensionId[];
  /** False by default — verified source EXISTENCE never satisfies all rubric requirements. */
  canMarkAnyDimensionGathered: false;
  productionAffected: false;
  scoreAssigned: false;
}

/**
 * Non-mutating cross-reference: which rubric dimensions have at least one verified
 * SOURCE for a protocol. It never mutates evidence drafts and never marks a
 * dimension `gathered` — a verified source link is necessary but not sufficient
 * (the dimension's evidence VALUES must still be confirmed), so
 * `canMarkAnyDimensionGathered` is always false here.
 */
export function mapVerifiedSourcesToEvidenceDimensions(protocolId: string): VerifiedSourceToEvidenceMap {
  const lstSymbol = LST_SYMBOL[protocolId] ?? protocolId;
  // Read-only: touch the drafts to make the non-mutation contract explicit.
  void getSolLiquidStakingEvidenceDrafts(protocolId);
  const verified = getVerifiedSourceResults(protocolId);
  const dimsWithVerified = new Set<ProtocolRiskRubricDimensionId>();
  for (const r of verified) dimsWithVerified.add(CATEGORY_TO_DIMENSION[r.category]);

  const dimensionsWithVerifiedSources = ALL_RUBRIC_DIMENSIONS.filter((d) => dimsWithVerified.has(d));
  const dimensionsStillNeedsReview = ALL_RUBRIC_DIMENSIONS.filter((d) => !dimsWithVerified.has(d));

  return {
    protocolId,
    lstSymbol,
    dimensionsWithVerifiedSources,
    dimensionsStillNeedsReview,
    canMarkAnyDimensionGathered: false,
    productionAffected: false,
    scoreAssigned: false,
  };
}
