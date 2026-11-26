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
 *
 * ONE ADJUSTMENT AFTER THE SORT — the in-app preference. If the top route cannot be approved inside
 * WealthSmith and another eligible route can, AND that route's net output is within the equivalence
 * epsilon of the top, the in-app route is selected instead and `decidedBy` records `in_app_execution`.
 * Outside the epsilon nothing changes: a meaningfully better route wins on its economics. See
 * `SWAP_IN_APP_PROVIDER_IDS` for the measurement behind it.
 */
import type { SwapQuoteCandidate } from "./swapQuoteContracts";
import type { SwapCostBreakdown } from "./swapCostMethodology";
import { SWAP_QUOTE_OPERATIONAL_POLICY, SWAP_PROVIDER_PRIORITY, SWAP_IN_APP_PROVIDER_IDS } from "./swapQuotePolicy";

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
  /** The economic order was a near-tie, and the route that can be approved in-app was selected. */
  | "in_app_execution"
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

const isInApp = (c: RankableCandidate): boolean => SWAP_IN_APP_PROVIDER_IDS.includes(c.candidate.providerId);

/** Net outputs within `epsilon` of the larger. False when either is unpriced: an unknown is not a tie. */
function withinEpsilon(a: RankableCandidate, b: RankableCandidate, epsilon: number): boolean {
  const x = a.cost.netOutputUsd;
  const y = b.cost.netOutputUsd;
  if (x == null || y == null) return false;
  const larger = Math.max(Math.abs(x), Math.abs(y));
  if (!(larger > 0)) return false;
  return Math.abs(x - y) / larger <= epsilon;
}

/** Rank eligible candidates and flag economic equivalence between the top two. Non-eligible are excluded. */
export function rankEligibleCandidates(candidates: readonly RankableCandidate[], epsilon = SWAP_QUOTE_OPERATIONAL_POLICY.economicallyEquivalentEpsilon): RankingResult {
  const eligible = candidates.filter((c) => c.candidate.eligible);
  const ranked = [...eligible].sort(compare);

  // The in-app preference. Only when the economic winner cannot be approved here, and only for
  // a route inside the equivalence band of that winner — the best such route, since `ranked` is
  // already in economic order. Everything else keeps its order.
  let promotedInApp = false;
  if (ranked.length >= 2 && !isInApp(ranked[0])) {
    const index = ranked.findIndex((c) => isInApp(c) && withinEpsilon(ranked[0], c, epsilon));
    if (index > 0) {
      const [inApp] = ranked.splice(index, 1);
      ranked.unshift(inApp);
      promotedInApp = true;
    }
  }

  const economicallyEquivalent = ranked.length >= 2 && withinEpsilon(ranked[0], ranked[1], epsilon);
  const decidedBy: SwapDecidingFactor =
    ranked.length < 2 ? null : promotedInApp ? "in_app_execution" : decidingFactor(ranked[0], ranked[1]);
  return { ranked, economicallyEquivalent, decidedBy };
}
