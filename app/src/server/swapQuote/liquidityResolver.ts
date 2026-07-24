/**
 * liquidityResolver — Step 23B (SERVER-ONLY). Resolves FRESH per-route-leg pool liquidity from an approved source
 * and runs the Step-23A `assessRouteLiquidity` (≥ $100k per leg, every split leg). It never uses protocol-wide
 * TVL, never infers liquidity from quote output or trade size, and fails closed (`unresolved`) when a leg cannot
 * be freshly resolved. RFQ legs are handled by the RFQ policy inside `assessRouteLiquidity`, never as pool TVL.
 */
import type { ProviderRouteLeg } from "./providerContracts";
import { assessRouteLiquidity, type RouteLegLiquidityInput } from "../../suggestions/swapQuote/swapLiquidity";
import type { SwapRouteLiquidityAssessment } from "../../suggestions/swapQuote/swapQuoteContracts";

export const SWAP_LIQUIDITY_RESOLVER_VERSION = "swap_liquidity_resolver_1.0.0" as const;

/** A fresh pool-liquidity reading from an approved source (server-side). Null usd → unresolved for that pool. */
export interface PoolLiquidityReading {
  poolId: string;
  liquidityUsd: number | null;
  observedAtMs: number | null;
}

/** An approved, read-only pool-liquidity source. Keyed by exact pool identity, never total protocol TVL. */
export interface PoolLiquiditySource {
  readonly sourceId: string;
  getPoolLiquidity(poolId: string, signal: AbortSignal): Promise<PoolLiquidityReading | null>;
}

/**
 * Resolve liquidity for a candidate's route legs into a `SwapRouteLiquidityAssessment`. Each leg's freshness is
 * judged against `comparedAtMs` and the window; an unresolved or stale leg makes the whole route `unresolved`.
 */
export async function resolveRouteLiquidity(legs: readonly ProviderRouteLeg[], source: PoolLiquiditySource, signal: AbortSignal, comparedAtMs: number, freshnessWindowMs: number): Promise<SwapRouteLiquidityAssessment> {
  const inputs: RouteLegLiquidityInput[] = await Promise.all(
    legs.map(async (leg): Promise<RouteLegLiquidityInput> => {
      if (leg.legKind === "rfq") {
        return { poolId: leg.poolId, venue: leg.venue, legKind: "rfq", liquidityUsd: null, liquidityObservedAt: null, fresh: false };
      }
      let reading: PoolLiquidityReading | null = null;
      try {
        reading = await source.getPoolLiquidity(leg.poolId, signal);
      } catch {
        reading = null;
      }
      const fresh = reading != null && reading.liquidityUsd != null && reading.observedAtMs != null && comparedAtMs - reading.observedAtMs <= freshnessWindowMs;
      return {
        poolId: leg.poolId,
        venue: leg.venue,
        legKind: leg.legKind === "unresolved" ? "unresolved" : leg.legKind,
        liquidityUsd: reading?.liquidityUsd ?? null,
        liquidityObservedAt: reading?.observedAtMs != null ? new Date(reading.observedAtMs).toISOString() : null,
        fresh,
      };
    }),
  );
  return assessRouteLiquidity(inputs);
}
