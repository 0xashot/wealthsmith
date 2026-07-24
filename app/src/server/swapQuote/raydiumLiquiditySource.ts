/**
 * raydiumLiquiditySource — Step 23B.1 (SERVER-ONLY). Pool-level liquidity resolver backed by Raydium's public
 * pool-info API (`https://api-v3.raydium.io/pools/info/ids?ids=<poolId>`). It resolves EXACT pool ids to a
 * pool-level liquidity figure — the pool's total TVL (`tvl`) — NOT protocol-wide TVL and NOT inferred from trade
 * size. It resolves Raydium-native pools AND Jupiter route legs whose underlying pool is a Raydium pool; any pool
 * id Raydium does not return is `null` → unresolved → the candidate fails closed on liquidity.
 *
 * DISCLOSED METRIC: `tvl` is the pool's TOTAL locked value (an approved pool-depth APPROXIMATION), not
 * active-tick executable depth. This is documented in swapQuoteArchitecture.md; a stricter active-liquidity
 * methodology can replace it later without changing the interface.
 */
import type { PoolLiquiditySource, PoolLiquidityReading } from "./liquidityResolver";

export const RAYDIUM_POOLS_INFO_URL = "https://api-v3.raydium.io/pools/info/ids" as const;
export const RAYDIUM_LIQUIDITY_SOURCE_ID = "raydium_pool_tvl_v3" as const;

interface RaydiumPoolInfo { id?: string; tvl?: number; type?: string }
interface RaydiumPoolsResponse { success?: boolean; data?: Array<RaydiumPoolInfo | null> }

/** Approved Raydium pool types (exact). Unknown layouts are rejected (null → unresolved). */
const APPROVED_RAYDIUM_POOL_TYPES = new Set(["Standard", "Concentrated"]);

export function createRaydiumLiquiditySource(fetchImpl: typeof fetch = fetch, baseUrl: string = RAYDIUM_POOLS_INFO_URL): PoolLiquiditySource {
  return {
    sourceId: RAYDIUM_LIQUIDITY_SOURCE_ID,
    async getPoolLiquidity(poolId, signal): Promise<PoolLiquidityReading | null> {
      if (!poolId) return null;
      try {
        const url = new URL(baseUrl);
        url.searchParams.set("ids", poolId);
        const res = await fetchImpl(url.toString(), { signal, headers: { accept: "application/json" } });
        if (!res.ok) return null;
        const body = (await res.json()) as RaydiumPoolsResponse;
        const info = (body?.data ?? []).find((p) => p && p.id === poolId) ?? null;
        if (!info || typeof info.tvl !== "number" || !Number.isFinite(info.tvl)) return null;
        if (info.type && !APPROVED_RAYDIUM_POOL_TYPES.has(info.type)) return null; // reject unknown pool layouts
        return { poolId, liquidityUsd: info.tvl, observedAtMs: Date.now() };
      } catch {
        return null;
      }
    },
  };
}
