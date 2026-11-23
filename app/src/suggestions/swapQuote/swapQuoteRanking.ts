/**
 * swapQuoteRanking — Step 23A. Deterministic ranking of ELIGIBLE candidates only. Primary key is normalized net
 * output (higher is better). Normalized economics are ALWAYS the primary selection method: a meaningfully better
 * economic route from any provider wins first, and a candidate is never chosen merely because it is Jupiter. The
 * deterministic provider tie-break (Jupiter → Raydium → Orca, from `SWAP_PROVIDER_PRIORITY`) is consulted ONLY
 * after every preceding value is EXACTLY equal — not merely within the epsilon. Since net output is compared
 * exactly, two providers reaching step 7 is vanishingly rare, and `decidedBy` on the result records which
 * comparison actually chose the winner so this is a measured fact rather than an inference.
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

/**
 * Which comparison actually chose the winner over the runner-up.
 *
 * Recorded because it was otherwise unanswerable. `selectionBasis` describes the MARGIN, not the
 * mechanism, and reading it as the mechanism led to the wrong conclusion about whether the provider
 * tie-break was favouring Jupiter. With this, "has provider_priority ever decided a comparison?" is
 * a query rather than an argument about float equality.
 */
export type SwapDecidingFactor =
  | "net_output"
  | "total_cost"
  | "price_impact"
  | "minimum_output"
  | "freshness"
  | "latency"
  | "provider_priority"
  | null;

export interface RankingResult {
  ranked: RankableCandidate[];
  /** True when the top two eligible net outputs are within epsilon. A statement about the MARGIN. */
  economicallyEquivalent: boolean;
  /** Which comparison separated the top two. Null when fewer than two eligible candidates. */
  decidedBy: SwapDecidingFactor;
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

/**
 * The ordered comparisons, highest priority first. The comparator and `decidingFactor` are BOTH derived
 * from this list, so the recorded reason can never drift from the actual ordering — which is the whole
 * point of recording it.
 */
const COMPARISONS: ReadonlyArray<{ factor: Exclude<SwapDecidingFactor, null>; cmp: (a: RankableCandidate, b: RankableCandidate) => number }> = [
  // 1. Highest net output (primary). Null net output sinks to the bottom.
  { factor: "net_output", cmp: (a, b) => (b.cost.netOutputUsd ?? -Infinity) - (a.cost.netOutputUsd ?? -Infinity) },
  // 2. Lower estimated total-cost %.
  { factor: "total_cost", cmp: (a, b) => (a.cost.estimatedTotalCostPct ?? Infinity) - (b.cost.estimatedTotalCostPct ?? Infinity) },
  // 3. Lower price impact.
  { factor: "price_impact", cmp: (a, b) => (a.candidate.priceImpactPct ?? Infinity) - (b.candidate.priceImpactPct ?? Infinity) },
  // 4. Higher minimum output.
  { factor: "minimum_output", cmp: (a, b) => {
    const amo = bigOrZero(a.candidate.minimumOutputRaw);
    const bmo = bigOrZero(b.candidate.minimumOutputRaw);
    return amo === bmo ? 0 : amo > bmo ? -1 : 1;
  } },
  // 5. Fresher quote (later quotedAt wins).
  { factor: "freshness", cmp: (a, b) => ms(b.candidate.quotedAt) - ms(a.candidate.quotedAt) },
  // 6. Lower quote latency.
  { factor: "latency", cmp: (a, b) => (a.candidate.quoteLatencyMs ?? Infinity) - (b.candidate.quoteLatencyMs ?? Infinity) },
  // 7. Deterministic provider tie-break — reached only when every economic value above is EXACTLY equal.
  //    In practice net output alone separates two providers, so this is a determinism guarantee rather
  //    than a selection rule. `decidedBy` is what proves that, rather than leaving it to be reasoned about.
  { factor: "provider_priority", cmp: (a, b) => SWAP_PROVIDER_PRIORITY[a.candidate.providerId] - SWAP_PROVIDER_PRIORITY[b.candidate.providerId] },
];

/** Compare two rankable candidates; negative means `a` ranks BEFORE `b` (i.e. `a` is better). */
function compare(a: RankableCandidate, b: RankableCandidate): number {
  for (const { cmp } of COMPARISONS) {
    const r = cmp(a, b);
    if (r !== 0) return r;
  }
  return 0;
}

/** The first comparison that separates `a` from `b`, or null when they are identical throughout. */
export function decidingFactor(a: RankableCandidate, b: RankableCandidate): SwapDecidingFactor {
  for (const { factor, cmp } of COMPARISONS) {
    if (cmp(a, b) !== 0) return factor;
  }
  return null;
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
  const decidedBy = ranked.length >= 2 ? decidingFactor(ranked[0], ranked[1]) : null;
  return { ranked, economicallyEquivalent, decidedBy };
}
