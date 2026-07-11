/**
 * protocolSolLiquidStakingSources — source-backed metadata for the SOL liquid-
 * staking candidates: exactly what data is VERIFIED (with its source), what is
 * partially verified, and what is missing.
 *
 * METADATA ONLY. Source records never imply a recommendation, never create
 * eligibility by themselves (eligibility still needs the actual data VALUES), and
 * never assign a `riskScore`. Nothing here enables production selection —
 * `PROTOCOL_SELECTION_IMPLEMENTED` stays false. No value is invented.
 */

export type SolLiquidStakingSourceStatus = "verified" | "partially_verified" | "missing" | "not_applicable";

export type SolLiquidStakingSourceCategory =
  | "mint"
  | "apy"
  | "tvl"
  | "withdrawal"
  | "fees"
  | "audit"
  | "risk_score"
  | "liquidity"
  | "route";

export interface SolLiquidStakingSourceRecord {
  protocolId: string;
  lstSymbol: string;
  category: SolLiquidStakingSourceCategory;
  status: SolLiquidStakingSourceStatus;
  sourceName?: string;
  sourceUrl?: string;
  sourceType?: "codebase" | "official_docs" | "public_api" | "manual_review";
  lastReviewedAt: string;
  notes: string[];
}

const REVIEWED = "2026-07-11";

/** APY sources CONFIRMED in the codebase (wallet/lstApy.ts). */
const APY_SOURCE: Record<string, { sourceName: string; sourceType: SolLiquidStakingSourceRecord["sourceType"]; sourceUrl?: string }> = {
  jupiter: { sourceName: "On-chain SPL stake-pool exchange rate (lstApy.ts fetchLstApys)", sourceType: "codebase" },
  marinade: { sourceName: "Marinade API (lstApy.ts fetchMarinadeMsolApy)", sourceType: "codebase", sourceUrl: "https://api.marinade.finance/msol/apy/30d" },
  jito: { sourceName: "On-chain SPL stake-pool exchange rate (lstApy.ts fetchLstApys)", sourceType: "codebase" },
  blazestake: { sourceName: "On-chain SPL stake-pool exchange rate (lstApy.ts fetchLstApys)", sourceType: "codebase" },
  sanctum: { sourceName: "DefiLlama yields (lstApy.ts DEFILLAMA_POOL[INF])", sourceType: "codebase" },
};

/** LST symbol per candidate. */
const LST_SYMBOL: Record<string, string> = {
  jupiter: "JupSOL",
  marinade: "mSOL",
  jito: "JitoSOL",
  blazestake: "bSOL",
  sanctum: "INF",
};

function buildRecords(protocolId: string): SolLiquidStakingSourceRecord[] {
  const lstSymbol = LST_SYMBOL[protocolId];
  const rec = (
    category: SolLiquidStakingSourceCategory,
    status: SolLiquidStakingSourceStatus,
    extra: Partial<SolLiquidStakingSourceRecord> = {}
  ): SolLiquidStakingSourceRecord => ({ protocolId, lstSymbol, category, status, lastReviewedAt: REVIEWED, notes: [], ...extra });

  const isSanctum = protocolId === "sanctum";
  return [
    rec("mint", "verified", { sourceName: "TOKEN_REGISTRY / lstApy.ts", sourceType: "codebase", notes: ["Exact mint copied verbatim from app source."] }),
    rec("apy", "verified", { ...APY_SOURCE[protocolId], notes: ["APY helper exists in code (values fetched + injected — never fabricated)."] }),
    rec("tvl", isSanctum ? "verified" : "missing", isSanctum
      ? { sourceName: "DefiLlama pool 3075a746-bdd1-4aac-bcd5-b035abee2622", sourceType: "public_api", notes: ["Verified pool UUID (from lstApy.ts)."] }
      : { notes: ["No verified DefiLlama pool UUID in the codebase; not guessed."] }),
    rec("withdrawal", "missing", { notes: ["Unstake/withdrawal timing not sourced. NOTE: swap liquidity is NOT protocol withdrawal."] }),
    rec("fees", "missing", { notes: ["Fee schedule not sourced; never assumed zero, never inferred from APY."] }),
    rec("audit", "missing", { notes: ["Audit status not directly sourced yet."] }),
    rec("risk_score", "missing", { notes: ["riskScore not assigned pending an approved methodology + evidence."] }),
    rec("liquidity", "missing", { notes: ["Protocol liquidity depth not sourced."] }),
    rec("route", "not_applicable", { notes: ["Liquid-staking deposit does not require a swap route."] }),
  ];
}

/** All source records for the five SOL liquid-staking candidates. */
export const SOL_LIQUID_STAKING_SOURCE_RECORDS: readonly SolLiquidStakingSourceRecord[] = [
  "jupiter",
  "marinade",
  "jito",
  "blazestake",
  "sanctum",
].flatMap(buildRecords);

export function getSolLiquidStakingSourceRecords(protocolId?: string): SolLiquidStakingSourceRecord[] {
  return protocolId == null
    ? [...SOL_LIQUID_STAKING_SOURCE_RECORDS]
    : SOL_LIQUID_STAKING_SOURCE_RECORDS.filter((r) => r.protocolId === protocolId);
}

export function getSolLiquidStakingSourceStatus(
  protocolId: string,
  category: SolLiquidStakingSourceCategory
): SolLiquidStakingSourceStatus | undefined {
  return SOL_LIQUID_STAKING_SOURCE_RECORDS.find((r) => r.protocolId === protocolId && r.category === category)?.status;
}

export function getMissingSolLiquidStakingSourceCategories(protocolId: string): SolLiquidStakingSourceCategory[] {
  return getSolLiquidStakingSourceRecords(protocolId)
    .filter((r) => r.status === "missing")
    .map((r) => r.category);
}
