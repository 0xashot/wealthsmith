/**
 * protocolDataAdapters.defillama — read-only DefiLlama market-data adapter.
 *
 * Public read-only endpoints only (no API key, no wallet data, no transactions).
 * CONSERVATIVE MAPPING: it only reads a pool when the candidate has an EXPLICIT,
 * verified DefiLlama pool mapping — no fuzzy/name matching that could attach the
 * wrong pool. With no verified mapping it returns `missing` (never guessed data).
 * Failures resolve to `status: "error"` and never throw into any caller.
 *
 * NOT wired into the Suggestion Engine. Collecting data ≠ selecting a protocol.
 */
import type { ProtocolCandidateRequest, ProtocolDataAdapter, ProtocolDataAdapterResult } from "./protocolDataAdapters";
import { missingMarketData, type ProtocolMarketData } from "./protocolMarketData";

/** Public read-only yields feed (TVL + APY per pool). */
const DEFILLAMA_POOLS_URL = "https://yields.llama.fi/pools";

/**
 * VERIFIED pool mappings ONLY. Each entry must be a manually confirmed
 * candidate→pool link (exact DefiLlama pool UUID + matching asset). EMPTY until
 * each is verified — an empty table is the honest state, not a blocker.
 */
export const DEFILLAMA_POOL_MAPPINGS: Record<
  string,
  { assetSymbol: string; poolId: string; note: string }
> = {
  // Verified from existing app source (wallet/lstApy.ts DEFILLAMA_POOL[INF_MINT]) —
  // exact pool UUID, not fuzzy. Sanctum's INF LST APY/TVL.
  sanctum: { assetSymbol: "SOL", poolId: "3075a746-bdd1-4aac-bcd5-b035abee2622", note: "Sanctum INF (SOL LST) — verified in lstApy.ts" },
  // Others (JupSOL/mSOL/bSOL/JitoSOL) have no verified DefiLlama pool UUID in the
  // codebase (their APY comes from on-chain/Marinade) — do NOT guess pool IDs.
};

/** Exact mapping lookup (protocolId + asset). No fuzzy matching. */
export function resolveDefiLlamaMapping(
  protocolId: string,
  assetSymbol: string
): { assetSymbol: string; poolId: string; note: string } | undefined {
  const m = DEFILLAMA_POOL_MAPPINGS[protocolId];
  if (!m) return undefined;
  if (m.assetSymbol.toUpperCase() !== assetSymbol.toUpperCase()) return undefined;
  return m;
}

export function defiLlamaMissingResult(protocolId: string, reason: string): ProtocolDataAdapterResult {
  return { protocolId, status: "missing", errors: [reason], updatedAt: new Date().toISOString() };
}

export function defiLlamaErrorResult(protocolId: string, error: unknown): ProtocolDataAdapterResult {
  const msg = error instanceof Error ? error.message : String(error);
  return { protocolId, status: "error", errors: [msg], updatedAt: new Date().toISOString() };
}

interface DefiLlamaPool {
  pool: string;
  apy?: number;
  tvlUsd?: number;
}

/** Normalize a matched DefiLlama pool into ProtocolMarketData (apy/tvl only). */
function normalizePool(candidate: ProtocolCandidateRequest, pool: DefiLlamaPool): ProtocolMarketData {
  const base = missingMarketData(candidate.protocolId, candidate.strategyType, candidate.assetSymbol, {
    dataSources: ["defillama"],
  });
  const apy = typeof pool.apy === "number" ? pool.apy : undefined;
  const tvlUsd = typeof pool.tvlUsd === "number" ? pool.tvlUsd : undefined;
  const missingFields = base.missingFields.filter(
    (f) => !(f === "apy" && apy != null) && !(f === "tvl" && tvlUsd != null)
  );
  return {
    ...base,
    ...(apy != null ? { apy } : {}),
    ...(tvlUsd != null ? { tvlUsd } : {}),
    confidence: apy != null || tvlUsd != null ? "partial" : "missing",
    missingFields,
  };
}

/**
 * Read-only fetch. Only fetches when a VERIFIED mapping exists; otherwise it
 * short-circuits to `missing` WITHOUT any network call. `fetchImpl` is injectable
 * so tests never hit the network. Never throws — errors become `status: "error"`.
 */
export async function fetchDefiLlamaMarketData(
  candidate: ProtocolCandidateRequest,
  fetchImpl?: typeof fetch
): Promise<ProtocolDataAdapterResult> {
  const mapping = resolveDefiLlamaMapping(candidate.protocolId, candidate.assetSymbol);
  if (!mapping) {
    return defiLlamaMissingResult(candidate.protocolId, "No verified DefiLlama pool mapping — not guessed.");
  }
  try {
    const doFetch = fetchImpl ?? fetch;
    const res = await doFetch(DEFILLAMA_POOLS_URL);
    if (!res.ok) return defiLlamaErrorResult(candidate.protocolId, `HTTP ${res.status}`);
    const json = (await res.json()) as { data?: DefiLlamaPool[] };
    const pool = (json.data ?? []).find((p) => p.pool === mapping.poolId);
    if (!pool) return defiLlamaMissingResult(candidate.protocolId, "Verified pool not found in feed.");
    const marketData = normalizePool(candidate, pool);
    return {
      protocolId: candidate.protocolId,
      marketData,
      status: marketData.confidence === "partial" ? "partial" : "missing",
      updatedAt: marketData.updatedAt,
    };
  } catch (e) {
    return defiLlamaErrorResult(candidate.protocolId, e);
  }
}

/** The adapter (read-only). Delegates to `fetchDefiLlamaMarketData`. */
export const defiLlamaAdapter: ProtocolDataAdapter = {
  id: "defillama",
  sourceName: "DefiLlama",
  supportedProtocolIds: Object.keys(DEFILLAMA_POOL_MAPPINGS),
  fetchMarketData: (candidate) => fetchDefiLlamaMarketData(candidate),
};
