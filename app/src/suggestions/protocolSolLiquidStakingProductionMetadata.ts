/**
 * protocolSolLiquidStakingProductionMetadata — the production-readable protocol
 * metadata layer for SOL liquid staking, starting with a STAGED JitoSOL candidate
 * (Step 12Z).
 *
 * INACTIVE BY DEFAULT. This defines the shape production metadata will take and
 * stages JitoSOL from already-confirmed evidence (12V values, 12X evidence) — but:
 *  - `productionReady` / `selectionEnabled` / `liveSuggestionsUpdated` /
 *    `transactionsEnabled` are ALWAYS false,
 *  - `riskScore` stays ABSENT unless a REAL, approved, non-QA score is supplied,
 *  - it writes nothing to `protocolRiskRegistry.ts` / `DEFILLAMA_POOL_MAPPINGS` /
 *    `ProtocolMarketData`, and is never imported by any live/engine/UI file.
 *
 * The QA-only 7.75 score (12Y) is NEVER accepted as production. No value is
 * invented — every figure traces to a prior reviewer confirmation.
 * `PROTOCOL_SELECTION_IMPLEMENTED = false`; `productionReady = false`.
 */
import { getConfirmedRealValues } from "./protocolSolLiquidStakingRealValueConfirmations";
import {
  getCurrentProtocolRiskRubricApprovalDecision,
  type ProtocolRiskRubricApprovalDecision,
} from "./protocolRiskApprovalDecision";
import type { ProtocolRiskScoreAssignmentResult } from "./protocolRiskScoreAssignment";
import { QA_ONLY_SCORING_LABEL } from "./protocolRiskScoreAssignment";

export const PROTOCOL_SOL_LST_PRODUCTION_METADATA_EXISTS = true;
export const PROTOCOL_SOL_LST_PRODUCTION_METADATA_ACTIVE = false;
export const PROTOCOL_SOL_LST_PRODUCTION_METADATA_ENABLES_SELECTION = false;
export const PROTOCOL_SOL_LST_PRODUCTION_METADATA_UPDATES_LIVE_SUGGESTIONS = false;
export const PROTOCOL_SOL_LST_PRODUCTION_METADATA_ALLOWS_TRANSACTIONS = false;
export const PROTOCOL_SOL_LST_PRODUCTION_METADATA_USES_QA_SCORE = false;

export type SolLstProductionMetadataStatus = "inactive" | "staged" | "blocked" | "active" | "rejected";

export type SolLstProductionDataFreshnessStatus = "fresh" | "stale" | "missing" | "needs_review";

export type SolLstProductionRiskScoreStatus = "absent" | "qa_only" | "approved" | "rejected" | "needs_review";

export interface SolLstProductionMetadataSource {
  sourceName: string;
  sourceUrl?: string;
  sourceKind:
    | "defillama_pool"
    | "official_docs"
    | "official_faq"
    | "official_blog"
    | "security_page"
    | "audit_report"
    | "manual_review";
  confirmedAsOf?: string;
  notes: string[];
}

export interface SolLstProductionFeeMetadata {
  directUnstakeFeePct?: number;
  annualManagementFeePct?: number;
  feeSummary: string;
  sourceNames: string[];
  status: SolLstProductionDataFreshnessStatus;
}

export interface SolLstProductionWithdrawalMetadata {
  withdrawalMechanics: string;
  withdrawalTimeHours?: number;
  instantExitIsSwapRoute: boolean;
  sourceNames: string[];
  status: SolLstProductionDataFreshnessStatus;
}

export interface SolLstProductionAuditMetadata {
  auditStatus: "unknown" | "reviewed" | "needs_review";
  auditFirms: string[];
  auditScopeSummary: string;
  sourceNames: string[];
  status: SolLstProductionDataFreshnessStatus;
}

export interface SolLstProductionRiskMetadata {
  riskScore?: number;
  riskScoreStatus: SolLstProductionRiskScoreStatus;
  rubricVersion?: string;
  approvalDecisionId?: string;
  scoreAssignmentStatus?: string;
  sourceNames: string[];
}

export interface SolLstProductionMetadataCandidate {
  protocolId: string;
  lstSymbol: string;
  protocolName: string;
  status: SolLstProductionMetadataStatus;

  tvlUsd?: number;
  apyPct?: number;
  apy30dPct?: number;
  valueAsOf?: string;
  dataFreshnessStatus: SolLstProductionDataFreshnessStatus;

  withdrawal: SolLstProductionWithdrawalMetadata;
  fees: SolLstProductionFeeMetadata;
  audit: SolLstProductionAuditMetadata;
  risk: SolLstProductionRiskMetadata;

  operationalSummary: string;
  incidentReviewSummary: string;

  sources: SolLstProductionMetadataSource[];
  blockers: string[];

  productionReady: false;
  selectionEnabled: false;
  liveSuggestionsUpdated: false;
  transactionsEnabled: false;
}

export interface SolLstProductionMetadataSummary {
  totalCandidates: number;
  active: number;
  staged: number;
  blocked: number;
  inactive: number;
  withApprovedRiskScore: number;
  productionReadyCount: 0;
  selectionEnabledCount: 0;
  liveSuggestionsUpdatedCount: 0;
  transactionsEnabledCount: 0;
}

export interface BuildProductionMetadataOptions {
  asOf?: string;
  approvalDecision?: ProtocolRiskRubricApprovalDecision;
  /** A completed score assignment (12Y). Accepted ONLY when real, approved, non-QA. */
  riskScoreAssignmentResult?: ProtocolRiskScoreAssignmentResult;
  /** Reviewer confirmation that sources were re-verified for beta (must be explicit). */
  sourceReVerifiedForBeta?: boolean;
}

const JITO_SOURCES: SolLstProductionMetadataSource[] = [
  { sourceName: "DefiLlama pool (JitoSOL)", sourceUrl: "https://defillama.com/yields/pool/0e7d0722-9054-4907-8593-567b353c0900", sourceKind: "defillama_pool", confirmedAsOf: "2026-07-12T00:00:00Z", notes: ["TVL/APY/APY-30d reviewer-confirmed in the 12V ledger."] },
  { sourceName: "JitoSOL Unstaking Overview", sourceUrl: "https://www.jito.network/docs/jitosol/get-started/unstaking-jitosol-flow/unstaking-overview/", sourceKind: "official_docs", notes: ["Withdrawal mechanics + timing (12X)."] },
  { sourceName: "JitoSOL General FAQs", sourceUrl: "https://www.jito.network/docs/jitosol/faqs/general-faqs/", sourceKind: "official_faq", notes: ["Fees (12X)."] },
  { sourceName: "JitoSOL Deployed Programs", sourceUrl: "https://www.jito.network/docs/jitosol/jitosol-liquid-staking/security/deployed-programs/", sourceKind: "audit_report", notes: ["Audit firms + program scope (12X)."] },
  { sourceName: "JitoSOL Security Overview", sourceUrl: "https://www.jito.network/docs/jitosol/jitosol-liquid-staking/security/overview/", sourceKind: "security_page", notes: ["Operational dependencies (12X)."] },
  { sourceName: "JitoSOL official incident-history manual review", sourceKind: "manual_review", notes: ["Point-in-time review, not a clean-history claim (12X)."] },
];

/**
 * Is a supplied score assignment a REAL, approved, non-QA production score? The
 * QA-only 7.75 (rationale tagged QA_ONLY_NOT_PRODUCTION) is always rejected.
 */
function isRealApprovedScore(
  result: ProtocolRiskScoreAssignmentResult | undefined,
  approvalDecision: ProtocolRiskRubricApprovalDecision
): boolean {
  if (!result) return false;
  if (result.status !== "score_assigned" || result.riskScore == null) return false;
  if (approvalDecision.status !== "approved" || !approvalDecision.rubricApproved || !approvalDecision.scoreAssignmentAllowed) return false;
  if (result.selectionEnabled !== false) return false;
  // Reject anything QA-tagged anywhere in the assignment JSON.
  if (JSON.stringify(result).includes(QA_ONLY_SCORING_LABEL)) return false;
  return true;
}

/**
 * Build the staged JitoSOL production-metadata candidate from confirmed evidence.
 * Blocked by default: no real approved riskScore and no source re-verification →
 * status `blocked`, `riskScoreStatus` `absent`, all production/selection flags false.
 */
export function buildJitoSolProductionMetadataCandidate(
  options: BuildProductionMetadataOptions = {}
): SolLstProductionMetadataCandidate {
  const asOf = options.asOf;
  const decision = options.approvalDecision ?? getCurrentProtocolRiskRubricApprovalDecision();

  // TVL/APY from the 12V ledger — only when the confirmations are still fresh.
  const confirmed = getConfirmedRealValues("jito", undefined, asOf);
  const catVal = (cat: string) => confirmed.find((c) => c.category === cat)?.confirmedValue;
  const tvlStr = catVal("tvl");
  const apyStr = catVal("apy");
  const apy30Str = catVal("apy_30d_average");
  const allFresh = tvlStr != null && apyStr != null && apy30Str != null;
  const dataFreshnessStatus: SolLstProductionDataFreshnessStatus = allFresh ? "fresh" : "stale";
  const dataStatusForDoc: SolLstProductionDataFreshnessStatus = allFresh ? "fresh" : "needs_review";

  const withdrawal: SolLstProductionWithdrawalMetadata = {
    withdrawalMechanics: "Direct protocol unstaking and instant swap/route exit are separate paths.",
    withdrawalTimeHours: 48,
    instantExitIsSwapRoute: true,
    sourceNames: ["JitoSOL Unstaking Overview"],
    status: dataStatusForDoc,
  };
  const fees: SolLstProductionFeeMetadata = {
    directUnstakeFeePct: 0.1,
    annualManagementFeePct: 4,
    feeSummary: "Direct unstake fee and annual management fee are source-backed from Jito docs.",
    sourceNames: ["JitoSOL General FAQs"],
    status: dataStatusForDoc,
  };
  const audit: SolLstProductionAuditMetadata = {
    auditStatus: "reviewed",
    auditFirms: ["Quantstamp", "Neodyme", "Kudelski"],
    auditScopeSummary: "SPL Stake Pool program / deployed program scope, not a blanket claim over every Jito component.",
    sourceNames: ["JitoSOL Deployed Programs", "JitoSOL Security Overview"],
    status: dataStatusForDoc,
  };

  // Risk: absent by default. A real, approved, non-QA score may set it (still not productionReady).
  const realScore = isRealApprovedScore(options.riskScoreAssignmentResult, decision);
  const risk: SolLstProductionRiskMetadata = realScore
    ? {
        riskScore: options.riskScoreAssignmentResult!.riskScore,
        riskScoreStatus: "approved",
        rubricVersion: options.riskScoreAssignmentResult!.rubricVersion,
        approvalDecisionId: decision.decisionId,
        scoreAssignmentStatus: options.riskScoreAssignmentResult!.status,
        sourceNames: ["approved riskScore assignment (12Y)"],
      }
    : {
        riskScoreStatus: options.riskScoreAssignmentResult != null ? "needs_review" : "absent",
        sourceNames: [],
      };

  const blockers: string[] = [];
  if (!decision.rubricApproved) blockers.push("rubric_not_approved");
  if (!realScore) blockers.push("production_risk_score_absent");
  if (options.sourceReVerifiedForBeta !== true) blockers.push("source_reverification_required_before_beta");
  blockers.push("protocol_selection_disabled");
  blockers.push("go_no_go_not_passed");
  if (!allFresh) blockers.push("tvl_apy_not_fresh");

  // Status: blocked while any hard precondition is unmet (always true in 12Z).
  const status: SolLstProductionMetadataStatus = "blocked";

  return {
    protocolId: "jito",
    lstSymbol: "JitoSOL",
    protocolName: "Jito",
    status,
    ...(allFresh ? { tvlUsd: Number(tvlStr), apyPct: Number(apyStr), apy30dPct: Number(apy30Str), valueAsOf: "2026-07-12T00:00:00Z" } : {}),
    dataFreshnessStatus,
    withdrawal,
    fees,
    audit,
    risk,
    operationalSummary: "Jito DAO holds a limited manager role; validator selection runs via StakeNet (on-chain programs + off-chain keepers); JitoSOL token and stake-pool addresses are documented.",
    incidentReviewSummary: "Point-in-time manual review found no sourced incident as of 2026-07-12; this is not a clean-history claim and must be rechecked before beta/production.",
    sources: JITO_SOURCES,
    blockers,
    productionReady: false,
    selectionEnabled: false,
    liveSuggestionsUpdated: false,
    transactionsEnabled: false,
  };
}

export interface SolLstProductionMetadataValidation {
  status: "blocked" | "staged" | "rejected";
  blockers: string[];
  warnings: string[];
  productionReady: false;
  selectionEnabled: false;
}

/**
 * Validate a production-metadata candidate. In 12Z the result is `blocked` unless a
 * real approved riskScore AND explicit source re-verification are supplied — and
 * even then `productionReady` stays false (12Z never activates a candidate).
 */
export function validateSolLstProductionMetadataCandidate(
  candidate: SolLstProductionMetadataCandidate,
  options: BuildProductionMetadataOptions = {}
): SolLstProductionMetadataValidation {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!candidate.protocolId) blockers.push("missing_protocol_id");
  if (!candidate.lstSymbol) blockers.push("missing_lst_symbol");
  if (candidate.dataFreshnessStatus !== "fresh" || candidate.tvlUsd == null || candidate.apyPct == null) blockers.push("tvl_apy_not_fresh");
  if (!candidate.withdrawal.withdrawalMechanics) blockers.push("missing_withdrawal_metadata");
  if (candidate.fees.directUnstakeFeePct == null && candidate.fees.annualManagementFeePct == null) blockers.push("missing_fee_metadata");
  if (candidate.audit.auditFirms.length === 0) blockers.push("missing_audit_metadata");
  if (!candidate.operationalSummary) blockers.push("missing_operational_summary");
  if (!candidate.incidentReviewSummary) blockers.push("missing_incident_review_summary");

  // riskScore may exist ONLY when approved; it must be a real (non-QA) 0–10 value.
  if (candidate.risk.riskScore != null) {
    if (candidate.risk.riskScoreStatus !== "approved") blockers.push("risk_score_not_approved");
    if (candidate.risk.riskScoreStatus === "qa_only") blockers.push("qa_only_score_not_allowed");
    if (candidate.risk.riskScore < 0 || candidate.risk.riskScore > 10) blockers.push("risk_score_out_of_range");
  } else {
    blockers.push("production_risk_score_absent");
  }
  if (options.sourceReVerifiedForBeta !== true) blockers.push("source_reverification_required_before_beta");

  // Selection/production must stay disabled.
  if (candidate.selectionEnabled !== false) blockers.push("selection_must_be_disabled");
  if (candidate.productionReady !== false) blockers.push("production_ready_must_be_false");

  warnings.push("Step 12Z stages metadata only; a candidate is never activated here.");

  const status: SolLstProductionMetadataValidation["status"] = blockers.length > 0 ? "blocked" : "staged";
  return { status, blockers, warnings, productionReady: false, selectionEnabled: false };
}

export function getJitoSolProductionMetadataCandidate(
  options?: BuildProductionMetadataOptions
): SolLstProductionMetadataCandidate {
  return buildJitoSolProductionMetadataCandidate(options);
}

export function getSolLstProductionMetadataCandidates(
  options?: BuildProductionMetadataOptions
): SolLstProductionMetadataCandidate[] {
  return [buildJitoSolProductionMetadataCandidate(options)];
}

export function getProductionMetadataBlockers(protocolId: string, options?: BuildProductionMetadataOptions): string[] {
  if (protocolId !== "jito") return ["no_production_metadata_candidate"];
  return buildJitoSolProductionMetadataCandidate(options).blockers;
}

export function hasActiveSolLstProductionMetadata(protocolId?: string): boolean {
  return getSolLstProductionMetadataCandidates()
    .filter((c) => protocolId == null || c.protocolId === protocolId)
    .some((c) => c.status === "active");
}

export function summarizeSolLstProductionMetadata(
  candidates: SolLstProductionMetadataCandidate[] = getSolLstProductionMetadataCandidates()
): SolLstProductionMetadataSummary {
  const count = (s: SolLstProductionMetadataStatus) => candidates.filter((c) => c.status === s).length;
  return {
    totalCandidates: candidates.length,
    active: count("active"),
    staged: count("staged"),
    blocked: count("blocked"),
    inactive: count("inactive"),
    withApprovedRiskScore: candidates.filter((c) => c.risk.riskScoreStatus === "approved" && c.risk.riskScore != null).length,
    productionReadyCount: 0,
    selectionEnabledCount: 0,
    liveSuggestionsUpdatedCount: 0,
    transactionsEnabledCount: 0,
  };
}
