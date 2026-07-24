/**
 * swapQuotePolicy — Step 23A. The single VERSIONED source of truth for every operational + threshold constant
 * the Live Swap-Quote Comparison layer uses. Nothing is hard-coded at a call site; every limit lives here with
 * an explicit version so it is reviewable and can change under governance without touching engine logic.
 *
 * READ-ONLY: these values gate a quote comparison. They never authorize a transaction, simulation, or signature.
 */
import { APPROVED_SWAP_PROVIDER_IDS, type SwapProviderId } from "./swapQuoteContracts";

export const SWAP_QUOTE_POLICY_VERSION = "swap_quote_policy_1.0.0" as const;

/**
 * The APPROVED deterministic provider tie-break order: Jupiter → Raydium → Orca (lower number ranks first).
 * This is a DETERMINISTIC ordering, not a preference. It is consulted ONLY after every economic tie-break
 * (net output → cost % → price impact → minimum output → freshness → latency) is equivalent under the epsilon —
 * a meaningfully better economic route from ANY provider always wins first, and Jupiter is never chosen merely
 * for having the highest priority. Versioned so the order is reviewable.
 */
export const SWAP_PROVIDER_PRIORITY: Record<SwapProviderId, number> = { jupiter: 0, raydium: 1, orca: 2 };
export const SWAP_PROVIDER_PRIORITY_ORDER: readonly SwapProviderId[] = ["jupiter", "raydium", "orca"] as const;

/* ------------------------------------------------------------------ *
 * Cost + risk thresholds (documented Protocol Decision Logic — authoritative, not inferred).
 * ------------------------------------------------------------------ */
export const SWAP_COST_THRESHOLDS = {
  /** Estimated total cost ≤ 0.30% for MAJOR pairs (inclusive boundary — exactly 0.30% is accepted). */
  majorMaxTotalCostPct: 0.3,
  /** Estimated total cost ≤ 0.50% for MINOR pairs (inclusive boundary — exactly 0.50% is accepted). */
  minorMaxTotalCostPct: 0.5,
  /** Price impact must be strictly BELOW 0.50% (exclusive — exactly 0.50% is rejected). */
  maxPriceImpactPctExclusive: 0.5,
  /** Every on-chain pool route leg must have ≥ $100,000 fresh liquidity (inclusive — exactly $100k accepted). */
  minRouteLegLiquidityUsd: 100_000,
} as const;

/* ------------------------------------------------------------------ *
 * Freshness + concurrency operational policy. Values are proposed defaults; they are versioned so they can be
 * tuned under governance. All provider requests (when a later slice mounts them) run concurrently over ONE
 * action snapshot; nothing here permits a client-side provider call.
 * ------------------------------------------------------------------ */
export const SWAP_QUOTE_OPERATIONAL_POLICY = {
  /** Per-provider request budget. A provider slower than this is excluded as `quote_timeout` (not a system error). */
  providerTimeoutMs: 2_500,
  /** Overall comparison budget across all three providers (concurrent, so ≈ the slowest permitted provider). */
  comparisonTimeoutMs: 3_000,
  /**
   * A quote with no provider `expiresAt` is usable only while younger than this window; older → `stale`.
   * When the provider DOES supply `expiresAt`, that value wins over this window.
   */
  freshnessWindowMs: 20_000,
  /** How long a completed comparison result may be reused before a refresh is required. */
  cacheDurationMs: 15_000,
  /** No infinite retries. At most this many transport retries per provider within the timeout budget. */
  maxRetriesPerProvider: 1,
  /**
   * Two eligible candidates whose net output is within this fraction of the larger are "economically equivalent";
   * the deterministic provider tie-break decides and `economicallyEquivalent` is recorded. 0.0005 == 0.05%.
   */
  economicallyEquivalentEpsilon: 0.0005,
} as const;

/* ------------------------------------------------------------------ *
 * Network-fee methodology. WealthSmith constructs/simulates NO transaction, so it never derives a per-route fee
 * from unsigned instructions or compute units. A single conservative, disclosed estimate is applied CONSISTENTLY
 * to every candidate unless every provider exposes a directly-comparable quote-level network estimate. Tiny,
 * unverifiable fee differences must never decide the winner (net-output ranking dominates).
 * ------------------------------------------------------------------ */
export const SWAP_NETWORK_FEE_POLICY = {
  /** Conservative flat Solana network-fee estimate applied to all candidates when comparable data is absent. */
  conservativeNetworkFeeUsd: 0.01,
  /** Rent is not incurred by a read-only quote comparison; modeled as 0 unless a provider discloses otherwise. */
  conservativeRentFeeUsd: 0,
  /** Marks that the applied network fee is an ESTIMATE (never a simulated/measured value). */
  networkFeeIsEstimated: true,
  methodologyVersion: "swap_network_fee_1.0.0",
} as const;

/* ------------------------------------------------------------------ *
 * RFQ disposition. For the first implementation RFQ routers are EXCLUDED (they have no pool TVL, so the pool-depth
 * rule cannot be applied honestly). They become eligible only after an explicit approved RFQ-liquidity policy.
 * ------------------------------------------------------------------ */
export const SWAP_RFQ_POLICY = {
  rfqRoutesApproved: false,
  reason: "RFQ routes have no pool TVL; the $100k pool-depth rule cannot be applied. Excluded until a dedicated RFQ-liquidity policy is approved.",
  methodologyVersion: "swap_rfq_1.0.0",
} as const;

/**
 * Blocked intermediate assets / underlying venues (deny-list, versioned). An eligible route may not hop through
 * a blocked intermediate mint or draw liquidity from a blocked venue. Empty by default; entries require review.
 */
export const SWAP_BLOCKED_INTERMEDIATE_MINTS: readonly string[] = [] as const;
export const SWAP_BLOCKED_UNDERLYING_VENUES: readonly string[] = [] as const;

/** The immutable, versioned policy bundle passed into eligibility/ranking (never mutated at a call site). */
export interface SwapQuotePolicy {
  version: string;
  approvedProviderIds: readonly SwapProviderId[];
  thresholds: typeof SWAP_COST_THRESHOLDS;
  operational: typeof SWAP_QUOTE_OPERATIONAL_POLICY;
  networkFee: typeof SWAP_NETWORK_FEE_POLICY;
  rfq: typeof SWAP_RFQ_POLICY;
  blockedIntermediateMints: readonly string[];
  blockedUnderlyingVenues: readonly string[];
}

export const DEFAULT_SWAP_QUOTE_POLICY: SwapQuotePolicy = {
  version: SWAP_QUOTE_POLICY_VERSION,
  approvedProviderIds: APPROVED_SWAP_PROVIDER_IDS,
  thresholds: SWAP_COST_THRESHOLDS,
  operational: SWAP_QUOTE_OPERATIONAL_POLICY,
  networkFee: SWAP_NETWORK_FEE_POLICY,
  rfq: SWAP_RFQ_POLICY,
  blockedIntermediateMints: SWAP_BLOCKED_INTERMEDIATE_MINTS,
  blockedUnderlyingVenues: SWAP_BLOCKED_UNDERLYING_VENUES,
};
