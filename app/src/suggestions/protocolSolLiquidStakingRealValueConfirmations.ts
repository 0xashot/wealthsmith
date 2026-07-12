/**
 * protocolSolLiquidStakingRealValueConfirmations — a non-production, auditable
 * LEDGER of reviewer-confirmed source values for the SOL liquid-staking candidates.
 *
 * Step 12V records the exact values a reviewer read from VERIFIED sources (starting
 * with DefiLlama TVL/APY), with who confirmed them and when. LEDGER ONLY:
 *  - writes NO production metadata (never `DEFILLAMA_POOL_MAPPINGS` /
 *    `ProtocolMarketData` / `ProtocolRiskData`),
 *  - mutates NO evidence drafts,
 *  - assigns NO `riskScore` and approves no rubric,
 *  - selects no protocol and makes no recommendation.
 *
 * Values here are reviewer-supplied, not invented and not fetched at runtime. A
 * value only supports evidence gathering while it is FRESH (see the freshness
 * windows). `PROTOCOL_SELECTION_IMPLEMENTED = false`; `productionReady = false`.
 */

export const PROTOCOL_REAL_VALUE_CONFIRMATIONS_EXIST = true;
export const PROTOCOL_REAL_VALUE_CONFIRMATIONS_APPROVE_RUBRIC = false;
export const PROTOCOL_REAL_VALUE_CONFIRMATIONS_ASSIGN_SCORES = false;
export const PROTOCOL_REAL_VALUE_CONFIRMATIONS_AFFECT_PRODUCTION = false;
export const PROTOCOL_REAL_VALUE_CONFIRMATIONS_ENABLE_SELECTION = false;
export const PROTOCOL_REAL_VALUE_CONFIRMATIONS_UPDATE_METADATA = false;
export const PROTOCOL_REAL_VALUE_CONFIRMATIONS_MUTATE_EVIDENCE = false;

/** Time-sensitive values (TVL/APY) are fresh only within this window. */
export const TIME_SENSITIVE_VALUE_MAX_AGE_HOURS = 24;
/** Static-doc values (mechanics, fee schedule, audit) are fresh within this window. */
export const STATIC_DOC_VALUE_MAX_AGE_DAYS = 90;

export type ProtocolRealValueCategory =
  | "tvl"
  | "apy"
  | "apy_30d_average"
  | "withdrawal_time"
  | "withdrawal_mechanics"
  | "fees"
  | "audit_scope"
  | "audit_date"
  | "audit_firm"
  | "operational_dependency"
  | "incident_history";

export type ProtocolRealValueStatus = "confirmed" | "stale" | "insufficient" | "needs_review" | "rejected";

export type ProtocolRealValueSourceKind =
  | "defillama_pool"
  | "official_docs"
  | "official_support"
  | "audit_report"
  | "security_page"
  | "manual_review";

export type ProtocolRealValueType = "number_usd" | "percent" | "hours" | "text" | "date" | "boolean" | "none";

export type ProtocolRealValueReviewerRole = "founder" | "product" | "risk" | "compliance" | "legal" | "engineering";

export interface ProtocolRealValueConfirmation {
  protocolId: string;
  lstSymbol: string;
  category: ProtocolRealValueCategory;
  sourceName: string;
  sourceUrl?: string;
  sourceKind: ProtocolRealValueSourceKind;
  sourcePoolId?: string;
  confirmedValue: string;
  confirmedValueType: ProtocolRealValueType;
  confirmedAsOf: string;
  reviewer: string;
  reviewerRole: ProtocolRealValueReviewerRole;
  status: ProtocolRealValueStatus;
  notes: string[];
  unresolvedQuestions: string[];
  productionMetadataUpdated: false;
  evidenceDraftMutated: false;
  scoreAssigned: false;
}

export interface ProtocolRealValueConfirmationSummary {
  totalConfirmations: number;
  confirmed: number;
  stale: number;
  insufficient: number;
  needsReview: number;
  rejected: number;
  productionMetadataUpdatedCount: 0;
  evidenceDraftMutatedCount: 0;
  scoreAssignedCount: 0;
  protocolsCovered: string[];
  categoriesCovered: ProtocolRealValueCategory[];
}

/** Categories whose freshness uses the short (TVL/APY) window. */
export const TIME_SENSITIVE_REAL_VALUE_CATEGORIES: ReadonlySet<ProtocolRealValueCategory> = new Set([
  "tvl",
  "apy",
  "apy_30d_average",
]);

const REVIEWER = "Ashot Gyulzatyan";
const REVIEWER_ROLE: ProtocolRealValueReviewerRole = "founder";
/** Explicit, easy-to-update confirmation timestamp (implementation date). */
const CONFIRMED_AS_OF = "2026-07-12T00:00:00Z";

interface RawLedgerRow {
  protocolId: string;
  lstSymbol: string;
  sourcePoolId: string;
  tvl: string;
  apy: string;
  apy30d: string;
}

/** Reviewer-confirmed DefiLlama TVL/APY values (non-production ledger). */
const RAW_LEDGER: RawLedgerRow[] = [
  { protocolId: "jupiter", lstSymbol: "JupSOL", sourcePoolId: "52bd72a7-9e81-4112-abb4-71673e8de9bf", tvl: "409170000", apy: "5.67", apy30d: "5.60" },
  { protocolId: "marinade", lstSymbol: "mSOL", sourcePoolId: "b3f93865-5ec8-4662-90a0-11808e0aa2bd", tvl: "184840000", apy: "4.75", apy30d: "5.87" },
  { protocolId: "jito", lstSymbol: "JitoSOL", sourcePoolId: "0e7d0722-9054-4907-8593-567b353c0900", tvl: "767950000", apy: "5.36", apy30d: "5.45" },
  { protocolId: "blazestake", lstSymbol: "bSOL", sourcePoolId: "387d6732-59f0-4ae0-8a88-aba75a5cbe4a", tvl: "69750000", apy: "5.27", apy30d: "5.32" },
];

const LEDGER_NOTE = "Reviewer-confirmed from DefiLlama pool page. Non-production confirmation ledger only.";

function buildRows(row: RawLedgerRow): ProtocolRealValueConfirmation[] {
  const sourceUrl = `https://defillama.com/yields/pool/${row.sourcePoolId}`;
  const common = {
    protocolId: row.protocolId,
    lstSymbol: row.lstSymbol,
    sourceName: `DefiLlama pool (${row.lstSymbol})`,
    sourceUrl,
    sourceKind: "defillama_pool" as const,
    sourcePoolId: row.sourcePoolId,
    confirmedAsOf: CONFIRMED_AS_OF,
    reviewer: REVIEWER,
    reviewerRole: REVIEWER_ROLE,
    status: "confirmed" as ProtocolRealValueStatus,
    notes: [LEDGER_NOTE],
    unresolvedQuestions: [],
    productionMetadataUpdated: false as const,
    evidenceDraftMutated: false as const,
    scoreAssigned: false as const,
  };
  return [
    { ...common, category: "tvl", confirmedValue: row.tvl, confirmedValueType: "number_usd" },
    { ...common, category: "apy", confirmedValue: row.apy, confirmedValueType: "percent" },
    { ...common, category: "apy_30d_average", confirmedValue: row.apy30d, confirmedValueType: "percent" },
  ];
}

/**
 * The SOL LST real-value ledger. JupSOL/mSOL/JitoSOL/bSOL carry reviewer-confirmed
 * DefiLlama TVL/APY/APY-30d. INF is intentionally ABSENT: no exact current INF
 * TVL/APY value was supplied and none is invented — INF stays source-verified only.
 */
export const SOL_LST_REAL_VALUE_CONFIRMATIONS: readonly ProtocolRealValueConfirmation[] =
  RAW_LEDGER.flatMap(buildRows);

export function getSolLstRealValueConfirmations(protocolId?: string): ProtocolRealValueConfirmation[] {
  return protocolId == null
    ? [...SOL_LST_REAL_VALUE_CONFIRMATIONS]
    : SOL_LST_REAL_VALUE_CONFIRMATIONS.filter((c) => c.protocolId === protocolId);
}

export function getRealValueConfirmationsByCategory(
  category: ProtocolRealValueCategory
): ProtocolRealValueConfirmation[] {
  return SOL_LST_REAL_VALUE_CONFIRMATIONS.filter((c) => c.category === category);
}

/** Is a confirmation fresh at `asOf` (default now), per its category's window? */
export function isRealValueFresh(confirmation: ProtocolRealValueConfirmation, asOf?: string): boolean {
  if (!confirmation.confirmedAsOf) return false;
  const confirmedTime = Date.parse(confirmation.confirmedAsOf);
  const evalTime = asOf ? Date.parse(asOf) : Date.now();
  if (Number.isNaN(confirmedTime) || Number.isNaN(evalTime)) return false;
  const ageMs = evalTime - confirmedTime;
  if (ageMs < 0) return false;
  const maxMs = TIME_SENSITIVE_REAL_VALUE_CATEGORIES.has(confirmation.category)
    ? TIME_SENSITIVE_VALUE_MAX_AGE_HOURS * 60 * 60 * 1000
    : STATIC_DOC_VALUE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  return ageMs <= maxMs;
}

/**
 * Validate a confirmation at `asOf`. Deterministic. Never writes production
 * metadata, mutates a draft, or assigns a score.
 * - missing reviewer/role → needs_review
 * - missing confirmedValue (non-'none') → insufficient
 * - missing confirmedAsOf → insufficient
 * - DefiLlama pool without a pool id → needs_review
 * - time-sensitive but not fresh → stale
 * - otherwise → confirmed
 */
export function validateRealValueConfirmation(
  confirmation: ProtocolRealValueConfirmation,
  asOf?: string
): ProtocolRealValueStatus {
  if (!confirmation.reviewer || !confirmation.reviewerRole) return "needs_review";
  if (confirmation.confirmedValueType !== "none" && (confirmation.confirmedValue == null || confirmation.confirmedValue.trim() === "")) {
    return "insufficient";
  }
  if (!confirmation.confirmedAsOf || confirmation.confirmedAsOf.trim() === "") return "insufficient";
  if (confirmation.sourceKind === "defillama_pool" && (confirmation.sourcePoolId == null || confirmation.sourcePoolId.trim() === "")) {
    return "needs_review";
  }
  if (TIME_SENSITIVE_REAL_VALUE_CATEGORIES.has(confirmation.category) && !isRealValueFresh(confirmation, asOf)) {
    return "stale";
  }
  return "confirmed";
}

export function getConfirmedRealValues(
  protocolId?: string,
  category?: ProtocolRealValueCategory,
  asOf?: string
): ProtocolRealValueConfirmation[] {
  return getSolLstRealValueConfirmations(protocolId).filter(
    (c) => validateRealValueConfirmation(c, asOf) === "confirmed" && (category == null || c.category === category)
  );
}

export function getStaleRealValues(asOf?: string): ProtocolRealValueConfirmation[] {
  return SOL_LST_REAL_VALUE_CONFIRMATIONS.filter((c) => validateRealValueConfirmation(c, asOf) === "stale");
}

export function summarizeSolLstRealValueConfirmations(asOf?: string): ProtocolRealValueConfirmationSummary {
  const rows = SOL_LST_REAL_VALUE_CONFIRMATIONS;
  const statuses = rows.map((c) => validateRealValueConfirmation(c, asOf));
  const count = (s: ProtocolRealValueStatus) => statuses.filter((x) => x === s).length;
  return {
    totalConfirmations: rows.length,
    confirmed: count("confirmed"),
    stale: count("stale"),
    insufficient: count("insufficient"),
    needsReview: count("needs_review"),
    rejected: count("rejected"),
    productionMetadataUpdatedCount: 0,
    evidenceDraftMutatedCount: 0,
    scoreAssignedCount: 0,
    protocolsCovered: [...new Set(rows.map((c) => c.protocolId))],
    categoriesCovered: [...new Set(rows.map((c) => c.category))],
  };
}
