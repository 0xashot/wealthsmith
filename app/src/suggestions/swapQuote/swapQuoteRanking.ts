/**
 * swapQuoteRanking — Step 23A. Deterministic ranking of ELIGIBLE candidates only. Primary key is normalized net
 * output (higher is better). Normalized economics are ALWAYS the primary selection method: a meaningfully better
 * economic route from any provider wins first, and a candidate is never chosen merely because it is Jupiter. The
 * deterministic provider tie-break (Jupiter → Raydium → Orca, from `SWAP_PROVIDER_PRIORITY`) is consulted ONLY
 * after every preceding value is equivalent under the approved epsilon; when it decides, the top candidates are
 * "economically equivalent" and that is recorded on the result.
 *
 * Tie-break order (only after net output):
 *   1. lower estimated total-cost %   2. lower price impact   3. higher minimum output
 *   4. fresher quote (later quotedAt) 5. lower quote latency
 *   6. deterministic provider priority: Jupiter → Raydium → Orca (final, economics-equivalent only).
 */
import type { SwapQuoteCandidate } from "./swapQuoteContracts";
import type { SwapCostBreakdown } from "./swapCostMethodology";
import { SWAP_QUOTE_OPERATIONAL_POLICY, SWAP_PROVIDER_PRIORITY } from "./swapQuotePolicy";

export interface RankableCandidate {
  candidate: SwapQuoteCandidate;
  cost: SwapCostBreakdown;
}

export interface RankingResult {
  ranked: RankableCandidate[];
  /** True when the top two eligible net outputs are within epsilon (deterministic tie-break decided). */
  economicallyEquivalent: boolean;
}

const bigOrZero = (s: string | null): bigint => {
  if (s == null) return 0n;
  try {
    return BigInt(s);
  } catch {
    return 0n;
  }
};
const ms = (iso: string): number => {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
};

/** Compare two rankable candidates; negative means `a` ranks BEFORE `b` (i.e. `a` is better). */
function compare(a: RankableCandidate, b: RankableCandidate): number {
  // 1. Highest net output (primary). Null net output sinks to the bottom.
  const an = a.cost.netOutputUsd ?? -Infinity;
  const bn = b.cost.netOutputUsd ?? -Infinity;
  if (an !== bn) return bn - an;

  // 2. Lower estimated total-cost %.
  const ac = a.cost.estimatedTotalCostPct ?? Infinity;
  const bc = b.cost.estimatedTotalCostPct ?? Infinity;
  if (ac !== bc) return ac - bc;

  // 3. Lower price impact.
  const ap = a.candidate.priceImpactPct ?? Infinity;
  const bp = b.candidate.priceImpactPct ?? Infinity;
  if (ap !== bp) return ap - bp;

  // 4. Higher minimum output.
  const amo = bigOrZero(a.candidate.minimumOutputRaw);
  const bmo = bigOrZero(b.candidate.minimumOutputRaw);
  if (amo !== bmo) return amo > bmo ? -1 : 1;

  // 5. Fresher quote (later quotedAt wins).
  const aq = ms(a.candidate.quotedAt);
  const bq = ms(b.candidate.quotedAt);
  if (aq !== bq) return bq - aq;

  // 6. Lower quote latency.
  const al = a.candidate.quoteLatencyMs ?? Infinity;
  const bl = b.candidate.quoteLatencyMs ?? Infinity;
  if (al !== bl) return al - bl;

  // 7. Deterministic provider tie-break — Jupiter → Raydium → Orca, only when all economics above are equivalent.
  return SWAP_PROVIDER_PRIORITY[a.candidate.providerId] - SWAP_PROVIDER_PRIORITY[b.candidate.providerId];
}

/** Rank eligible candidates and flag economic equivalence between the top two. Non-eligible are excluded. */
export function rankEligibleCandidates(candidates: readonly RankableCandidate[], epsilon = SWAP_QUOTE_OPERATIONAL_POLICY.economicallyEquivalentEpsilon): RankingResult {
  const eligible = candidates.filter((c) => c.candidate.eligible);
  const ranked = [...eligible].sort(compare);
  let economicallyEquivalent = false;
  if (ranked.length >= 2) {
    const top = ranked[0].cost.netOutputUsd;
    const second = ranked[1].cost.netOutputUsd;
    if (top != null && second != null && top > 0) {
      economicallyEquivalent = Math.abs(top - second) / Math.max(Math.abs(top), Math.abs(second)) <= epsilon;
    }
  }
  return { ranked, economicallyEquivalent };
}
