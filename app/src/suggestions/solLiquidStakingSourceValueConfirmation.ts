/**
 * solLiquidStakingSourceValueConfirmation — Step 14B. Records and freshness-checks
 * source values for the STAGED SOL liquid-staking candidates (mSOL / JupSOL / bSOL /
 * INF), so they can move from `needs_review` toward `verified` market/mechanics data.
 *
 * CONFIRMATION LEDGER ONLY. This does NOT approve candidates, assign risk scores,
 * enable multi-protocol selection, update live recommendations, or replace Jito as
 * the selected protocol. No transaction/signature path. It is not imported by
 * `stakingSuggestion` or any live/UI file — only by docs and fixtures.
 *
 * HONESTY: prior reviewer-confirmed DefiLlama values (from the 12V ledger) are
 * recorded here, but they are NOT treated as fresh — a value is `verified` only when
 * `checkedAt` is within 24h of `confirmedAt`, otherwise `stale`. INF has no value and
 * none is invented (`missing`). Mechanics and evidence stay `needs_review` (no
 * verified source-value confirmation exists yet); nothing is fabricated.
 */

/* ------------------------------------------------------------------ *
 * Flags (all live-affecting capabilities OFF).
 * ------------------------------------------------------------------ */
export const SOL_LST_SOURCE_VALUE_CONFIRMATION_EXISTS = true;
export const SOL_LST_SOURCE_VALUE_CONFIRMATION_UPDATES_LIVE_RECOMMENDATIONS = false;
export const SOL_LST_SOURCE_VALUE_CONFIRMATION_APPROVES_CANDIDATES = false;
export const SOL_LST_SOURCE_VALUE_CONFIRMATION_ASSIGNS_RISK_SCORES = false;
export const SOL_LST_SOURCE_VALUE_CONFIRMATION_ENABLES_MULTI_PROTOCOL_SELECTION = false;
export const SOL_LST_SOURCE_VALUE_CONFIRMATION_ENABLES_TRANSACTIONS = false;
export const SOL_LST_SOURCE_VALUE_CONFIRMATION_REQUIRES_WALLET_SIGNATURE = false;

/** Time-sensitive market values are fresh only within this window. */
export const SOL_LST_CONFIRMED_VALUE_MAX_AGE_HOURS = 24;

/* ------------------------------------------------------------------ *
 * Types.
 * ------------------------------------------------------------------ */
export type SolLstConfirmedValueStatus =
  | "verified"
  | "stale"
  | "needs_review"
  | "missing"
  | "source_exists_value_pending";

export type SolLstConfirmedValueCategory =
  | "tvl"
  | "current_apy"
  | "apy_30d"
  | "withdrawal_mechanics"
  | "direct_unstake_time"
  | "direct_unstake_fee"
  | "annual_management_fee"
  | "audit_security"
  | "operational_risk"
  | "incident_review";

export type SolLstConfirmedValueUnit = "usd" | "pct" | "hours" | "text" | "boolean";
export type SolLstReviewerRole = "founder" | "product" | "risk" | "engineering" | "compliance";

export interface SolLstConfirmedValue {
  protocolId: string;
  protocolName: string;
  lstSymbol: string;
  category: SolLstConfirmedValueCategory;
  status: SolLstConfirmedValueStatus;
  value?: number | string | boolean;
  unit?: SolLstConfirmedValueUnit;
  sourceName?: string;
  sourceUrl?: string;
  confirmedAt?: string;
  confirmedBy?: string;
  reviewerRole?: SolLstReviewerRole;
  notes: string[];
}

export interface SolLstCandidateValueConfirmationSummary {
  protocolId: string;
  protocolName: string;
  lstSymbol: string;
  confirmedValues: SolLstConfirmedValue[];
  marketDataStatus: SolLstConfirmedValueStatus;
  mechanicsStatus: SolLstConfirmedValueStatus;
  evidenceStatus: SolLstConfirmedValueStatus;
  missingCategories: SolLstConfirmedValueCategory[];
  staleCategories: SolLstConfirmedValueCategory[];
  readyForRiskScoring: boolean;
  blockers: string[];
}

/* ------------------------------------------------------------------ *
 * Prior reviewer-confirmed market values (from the 12V DefiLlama ledger).
 * Recorded here with their original confirmation timestamp — freshness is derived,
 * never assumed. INF is intentionally absent (no value supplied; none invented).
 * ------------------------------------------------------------------ */
const CONFIRMED_AT = "2026-07-12T00:00:00Z";
const REVIEWER = "Ashot Gyulzatyan";
const REVIEWER_ROLE: SolLstReviewerRole = "founder";
const LEDGER_NOTE = "Reviewer-confirmed from DefiLlama pool page (12V). Non-production ledger; freshness derived, not assumed.";

interface PriorMarketRow {
  protocolId: string;
  protocolName: string;
  lstSymbol: string;
  poolId: string;
  tvl: number;
  apy: number;
  apy30d: number;
}

const PRIOR_MARKET: PriorMarketRow[] = [
  { protocolId: "marinade", protocolName: "Marinade", lstSymbol: "mSOL", poolId: "b3f93865-5ec8-4662-90a0-11808e0aa2bd", tvl: 184840000, apy: 4.75, apy30d: 5.87 },
  { protocolId: "jupiter", protocolName: "Jupiter", lstSymbol: "JupSOL", poolId: "52bd72a7-9e81-4112-abb4-71673e8de9bf", tvl: 409170000, apy: 5.67, apy30d: 5.60 },
  { protocolId: "blazestake", protocolName: "BlazeStake", lstSymbol: "bSOL", poolId: "387d6732-59f0-4ae0-8a88-aba75a5cbe4a", tvl: 69750000, apy: 5.27, apy30d: 5.32 },
];

/** Sanctum · INF has no confirmed market value in the prior ledger. */
const NO_VALUE_CANDIDATES = [{ protocolId: "sanctum", protocolName: "Sanctum", lstSymbol: "INF" }];

const MARKET_CATEGORIES: SolLstConfirmedValueCategory[] = ["tvl", "current_apy", "apy_30d"];
const MECHANICS_CATEGORIES: SolLstConfirmedValueCategory[] = [
  "withdrawal_mechanics",
  "direct_unstake_time",
  "direct_unstake_fee",
  "annual_management_fee",
];
const EVIDENCE_CATEGORIES: SolLstConfirmedValueCategory[] = ["audit_security", "operational_risk", "incident_review"];

/** Is a value confirmed at `confirmedAt` still fresh at `checkedAt` (24h window)? */
export function isConfirmedValueFresh(confirmedAt: string, checkedAt: string): boolean {
  const c = Date.parse(confirmedAt);
  const e = Date.parse(checkedAt);
  if (Number.isNaN(c) || Number.isNaN(e)) return false;
  const ageMs = e - c;
  if (ageMs < 0) return false;
  return ageMs <= SOL_LST_CONFIRMED_VALUE_MAX_AGE_HOURS * 60 * 60 * 1000;
}

interface ConfirmationOptions {
  checkedAt?: string;
  includeStaleValues?: boolean;
}

function marketValue(row: PriorMarketRow, category: SolLstConfirmedValueCategory, value: number, unit: SolLstConfirmedValueUnit, checkedAt: string): SolLstConfirmedValue {
  const status: SolLstConfirmedValueStatus = isConfirmedValueFresh(CONFIRMED_AT, checkedAt) ? "verified" : "stale";
  return {
    protocolId: row.protocolId,
    protocolName: row.protocolName,
    lstSymbol: row.lstSymbol,
    category,
    status,
    value,
    unit,
    sourceName: `DefiLlama pool (${row.lstSymbol})`,
    sourceUrl: `https://defillama.com/yields/pool/${row.poolId}`,
    confirmedAt: CONFIRMED_AT,
    confirmedBy: REVIEWER,
    reviewerRole: REVIEWER_ROLE,
    notes: [LEDGER_NOTE],
  };
}

function pendingValue(base: { protocolId: string; protocolName: string; lstSymbol: string }, category: SolLstConfirmedValueCategory, status: SolLstConfirmedValueStatus, note: string): SolLstConfirmedValue {
  return { ...base, category, status, notes: [note] };
}

/**
 * All source/value confirmations for the four staged candidates at `checkedAt`
 * (default: now). Market values carry the prior DefiLlama figures but are `verified`
 * only within 24h of confirmation, else `stale`; INF market data is `missing`.
 * Mechanics and evidence are `needs_review` (no verified confirmation yet). Nothing
 * is invented, approved, or scored. `includeStaleValues: false` drops stale rows.
 */
export function getSolLstStagedCandidateValueConfirmations(options: ConfirmationOptions = {}): SolLstConfirmedValue[] {
  const checkedAt = options.checkedAt ?? new Date().toISOString();
  const out: SolLstConfirmedValue[] = [];

  for (const row of PRIOR_MARKET) {
    out.push(marketValue(row, "tvl", row.tvl, "usd", checkedAt));
    out.push(marketValue(row, "current_apy", row.apy, "pct", checkedAt));
    out.push(marketValue(row, "apy_30d", row.apy30d, "pct", checkedAt));
    for (const cat of MECHANICS_CATEGORIES) out.push(pendingValue(row, cat, "needs_review", "Mechanics value not freshly confirmed for this staged candidate."));
    for (const cat of EVIDENCE_CATEGORIES) out.push(pendingValue(row, cat, "needs_review", "Evidence not freshly reviewed for this staged candidate."));
  }

  for (const base of NO_VALUE_CANDIDATES) {
    for (const cat of MARKET_CATEGORIES) out.push(pendingValue(base, cat, "missing", "No confirmed value in the prior ledger; none invented."));
    for (const cat of MECHANICS_CATEGORIES) out.push(pendingValue(base, cat, "needs_review", "Mechanics value not freshly confirmed for this staged candidate."));
    for (const cat of EVIDENCE_CATEGORIES) out.push(pendingValue(base, cat, "needs_review", "Evidence not freshly reviewed for this staged candidate."));
  }

  return options.includeStaleValues === false ? out.filter((v) => v.status !== "stale") : out;
}

/* ------------------------------------------------------------------ *
 * Per-candidate summaries.
 * ------------------------------------------------------------------ */
function rollUp(statuses: SolLstConfirmedValueStatus[]): SolLstConfirmedValueStatus {
  if (statuses.length === 0) return "missing";
  if (statuses.every((s) => s === "verified")) return "verified";
  if (statuses.some((s) => s === "missing")) return "missing";
  if (statuses.some((s) => s === "stale")) return "stale";
  return "needs_review";
}

/**
 * Per-candidate confirmation summary at `checkedAt`. `readyForRiskScoring` is true
 * ONLY when market, mechanics, and evidence are all `verified` — impossible today
 * (mechanics/evidence stay `needs_review`, and market is stale/missing outside the
 * 24h window). Never approves or scores.
 */
export function summarizeSolLstCandidateValueConfirmations(options: ConfirmationOptions = {}): SolLstCandidateValueConfirmationSummary[] {
  const all = getSolLstStagedCandidateValueConfirmations({ checkedAt: options.checkedAt });
  const ids = [...new Set(all.map((v) => v.protocolId))];

  return ids.map((protocolId) => {
    const rows = all.filter((v) => v.protocolId === protocolId);
    const first = rows[0];
    const statusOf = (cats: SolLstConfirmedValueCategory[]) => rollUp(rows.filter((r) => cats.includes(r.category)).map((r) => r.status));

    const marketDataStatus = statusOf(MARKET_CATEGORIES);
    const mechanicsStatus = statusOf(MECHANICS_CATEGORIES);
    const evidenceStatus = statusOf(EVIDENCE_CATEGORIES);

    const missingCategories = rows.filter((r) => r.status === "missing").map((r) => r.category);
    const staleCategories = rows.filter((r) => r.status === "stale").map((r) => r.category);

    const blockers: string[] = [];
    if (marketDataStatus === "stale") blockers.push("stale_market_data");
    if (marketDataStatus === "missing" || marketDataStatus === "needs_review") blockers.push("missing_market_data");
    if (mechanicsStatus !== "verified") blockers.push("mechanics_review_required");
    if (evidenceStatus !== "verified") blockers.push("evidence_review_required");
    blockers.push("approved_risk_score_missing");

    const readyForRiskScoring =
      marketDataStatus === "verified" && mechanicsStatus === "verified" && evidenceStatus === "verified";

    return {
      protocolId,
      protocolName: first.protocolName,
      lstSymbol: first.lstSymbol,
      confirmedValues: rows,
      marketDataStatus,
      mechanicsStatus,
      evidenceStatus,
      missingCategories,
      staleCategories,
      readyForRiskScoring,
      blockers,
    };
  });
}

/* ------------------------------------------------------------------ *
 * Optional non-live preview merge (never mutates the base registry).
 * ------------------------------------------------------------------ */
export interface SolLstCandidateWithConfirmations {
  protocolId: string;
  protocolName: string;
  lstSymbol: string;
  /** Undefined for Jito (already approved/verified); present for staged candidates. */
  valueConfirmation?: SolLstCandidateValueConfirmationSummary;
}

/**
 * A NON-LIVE preview pairing each staged candidate with its confirmation summary.
 * Does not mutate the registry, approve/select candidates, or assign risk scores;
 * staged candidates stay staged, and Jito is unchanged.
 */
export function buildSolLstCandidateRegistryWithConfirmedValues(
  options: ConfirmationOptions = {}
): SolLstCandidateWithConfirmations[] {
  const summaries = summarizeSolLstCandidateValueConfirmations({ checkedAt: options.checkedAt });
  return summaries.map((s) => ({
    protocolId: s.protocolId,
    protocolName: s.protocolName,
    lstSymbol: s.lstSymbol,
    valueConfirmation: s,
  }));
}
