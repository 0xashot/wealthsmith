/**
 * swapLiquidity — Step 23A. Route-leg liquidity assessment. The documented rule is ≥ $100,000 FRESH liquidity on
 * EVERY underlying on-chain pool leg (split routes: every split leg). Rules that keep this honest:
 *   • liquidity is per-POOL-leg, never total protocol TVL;
 *   • unresolved / stale liquidity is NOT eligible (fail closed);
 *   • liquidity is never inferred from trade size;
 *   • RFQ legs have no pool TVL — they are handled by a separate approved RFQ policy (excluded for the first
 *     implementation), never scored against the pool-depth rule;
 *   • aggregator legs route through venues no approved source can read — handled by SWAP_AGGREGATOR_POLICY
 *     (price-impact ceiling + on-chain-enforced minimum output), never scored against the pool-depth rule, and
 *     never counted toward the route's reported minimum depth.
 * This module only ASSESSES already-fetched pool-liquidity inputs; it performs no fetching.
 */
import type { SwapRouteLegLiquidity, SwapRouteLiquidityAssessment, SwapLiquidityStatus } from "./swapQuoteContracts";
import { SWAP_AGGREGATOR_POLICY, SWAP_COST_THRESHOLDS, SWAP_RFQ_POLICY } from "./swapQuotePolicy";

export const SWAP_LIQUIDITY_VERSION = "swap_liquidity_1.0.0" as const;

/** A fresh pool-liquidity reading for one underlying route leg (supplied by an approved source, never invented). */
export interface RouteLegLiquidityInput {
  poolId: string;
  venue: string;
  legKind: SwapRouteLegLiquidity["legKind"];
  liquidityUsd: number | null;
  liquidityObservedAt: string | null;
  /** True when the reading is within the approved freshness window (caller-determined). */
  fresh: boolean;
}

/**
 * Assess a route's legs against the $100k minimum. The route status is the WEAKEST leg:
 *   unresolved  — any leg has null/stale liquidity, or an RFQ leg while RFQ is unapproved;
 *   below_minimum — every leg resolved but some on-chain pool leg is < $100k;
 *   unavailable — no legs supplied;
 *   verified    — every on-chain pool leg ≥ $100k and fresh (and no unapproved RFQ leg).
 * The binding constraint (`minimumRouteLegLiquidityUsd`) is the smallest resolved on-chain pool leg.
 */
export function assessRouteLiquidity(legs: readonly RouteLegLiquidityInput[], minLiquidityUsd = SWAP_COST_THRESHOLDS.minRouteLegLiquidityUsd): SwapRouteLiquidityAssessment {
  const outLegs: SwapRouteLegLiquidity[] = legs.map((l) => ({
    poolId: l.poolId,
    venue: l.venue,
    liquidityUsd: l.liquidityUsd,
    liquidityObservedAt: l.liquidityObservedAt,
    legKind: l.legKind,
  }));
  if (legs.length === 0) return { status: "unavailable", minimumRouteLegLiquidityUsd: null, legs: outLegs };

  let status: SwapLiquidityStatus = "verified";
  let minPool: number | null = null;

  for (const l of legs) {
    if (l.legKind === "rfq") {
      // RFQ has no pool TVL: excluded until an explicit RFQ-liquidity policy is approved → unresolved (fail closed).
      if (!SWAP_RFQ_POLICY.rfqRoutesApproved) return { status: "unresolved", minimumRouteLegLiquidityUsd: minPool, legs: outLegs };
      continue;
    }
    if (l.legKind === "aggregator") {
      // An aggregator leg through a venue no approved source can read. Governed by SWAP_AGGREGATOR_POLICY —
      // the price-impact ceiling and the on-chain-enforced minimum output — not by pool depth. It contributes
      // NO depth to minimumRouteLegLiquidityUsd, so a route's reported minimum stays a statement about legs we
      // actually read. If the policy is ever withdrawn this falls closed, exactly like RFQ.
      if (!SWAP_AGGREGATOR_POLICY.aggregatorRoutesApproved) {
        return { status: "unresolved", minimumRouteLegLiquidityUsd: minPool, legs: outLegs };
      }
      continue;
    }
    if (l.legKind === "unresolved" || l.liquidityUsd == null || !Number.isFinite(l.liquidityUsd) || !l.fresh) {
      return { status: "unresolved", minimumRouteLegLiquidityUsd: minPool, legs: outLegs };
    }
    minPool = minPool == null ? l.liquidityUsd : Math.min(minPool, l.liquidityUsd);
    if (l.liquidityUsd < minLiquidityUsd) status = "below_minimum";
  }
  return { status, minimumRouteLegLiquidityUsd: minPool, legs: outLegs };
}
