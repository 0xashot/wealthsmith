/**
 * swapQuoteEligibility — Step 23A. Deterministic per-candidate eligibility. A candidate is eligible ONLY when
 * every documented constraint passes; otherwise it is excluded with transparent, greppable reasons. This never
 * mutates the action and never selects — it only labels each candidate eligible/ineligible for ranking.
 */
import type {
  SwapQuoteCandidate,
  SwapExclusionReason,
  SwapPairClass,
  SwapAsset,
} from "./swapQuoteContracts";
import { computeSwapCostBreakdown, type SwapCostBreakdown } from "./swapCostMethodology";
import type { SwapQuotePolicy } from "./swapQuotePolicy";

export interface EligibilityInput {
  candidate: SwapQuoteCandidate;
  /** The exact requested input asset + amount from the immutable action leg (for pair/amount match). */
  inputAsset: SwapAsset;
  outputAsset: SwapAsset;
  requestedInputAmountRaw: string;
  inputAmountUsd: number | null;
  pairClass: SwapPairClass;
  policy: SwapQuotePolicy;
}

export interface EligibilityResult {
  candidate: SwapQuoteCandidate; // a copy with `eligible` + `exclusionReasons` populated
  cost: SwapCostBreakdown;
}

/** Evaluate one candidate. Returns a NEW candidate object (input candidate is not mutated). */
export function evaluateCandidateEligibility(input: EligibilityInput): EligibilityResult {
  const { candidate: c, policy } = input;
  const reasons: SwapExclusionReason[] = [];
  const cost = computeSwapCostBreakdown(c, input.inputAmountUsd);

  // Provider approval.
  if (!policy.approvedProviderIds.includes(c.providerId)) reasons.push("provider_unavailable");

  // Exact pair + amount match against the immutable action leg (never trust the provider echo alone).
  if (c.inputMint !== input.inputAsset.mint || c.outputMint !== input.outputAsset.mint) reasons.push("pair_mismatch");
  if (c.inputAmountRaw !== input.requestedInputAmountRaw) reasons.push("amount_mismatch");

  // Freshness.
  if (c.freshness === "expired") reasons.push("quote_expired");
  else if (c.freshness === "stale") reasons.push("quote_stale");
  else if (c.freshness === "unresolved") reasons.push("quote_stale");

  // Expected output positive.
  const outPositive = (() => {
    try {
      return BigInt(c.expectedOutputRaw) > 0n;
    } catch {
      return false;
    }
  })();
  if (!outPositive) reasons.push("output_unresolved");

  // Price impact available + strictly below the exclusive threshold.
  if (c.priceImpactPct == null || !Number.isFinite(c.priceImpactPct)) reasons.push("price_impact_unresolved");
  else if (c.priceImpactPct >= policy.thresholds.maxPriceImpactPctExclusive) reasons.push("price_impact_high");

  // Liquidity verified + ≥ minimum (assessRouteLiquidity already applied the per-leg minimum).
  const liq = c.liquidityAssessment.status;
  if (liq === "unresolved" || liq === "unavailable") reasons.push("liquidity_unresolved");
  else if (liq === "below_minimum") reasons.push("liquidity_low");

  // Blocked venues.
  if (c.underlyingVenues.some((v) => policy.blockedUnderlyingVenues.includes(v))) reasons.push("blocked_underlying_venue");

  // RFQ disposition (any RFQ leg while RFQ unapproved → excluded).
  if (!policy.rfq.rfqRoutesApproved && c.liquidityAssessment.legs.some((l) => l.legKind === "rfq")) reasons.push("rfq_not_approved");

  // Pair classification must resolve to a threshold.
  if (input.pairClass === "unresolved") reasons.push("total_cost_unresolved");

  // Total cost: available + within the pair threshold.
  if (cost.costUnresolved || cost.estimatedTotalCostPct == null) {
    reasons.push("total_cost_unresolved");
  } else {
    const limit = input.pairClass === "major" ? policy.thresholds.majorMaxTotalCostPct : policy.thresholds.minorMaxTotalCostPct;
    if (input.pairClass !== "unresolved" && cost.estimatedTotalCostPct > limit) reasons.push("estimated_cost_high");
  }

  // Carry through any normalization/no-route reasons already stamped by the adapter.
  for (const r of c.exclusionReasons) if (!reasons.includes(r)) reasons.push(r);

  const dedup = [...new Set(reasons)];
  return { candidate: { ...c, eligible: dedup.length === 0, exclusionReasons: dedup }, cost };
}
