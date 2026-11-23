/**
 * swapQuoteContracts — Step 23A. The canonical, provider-neutral CONTRACTS for the read-only Live Swap-Quote
 * Comparison layer (Jupiter / Raydium / Orca) that sits AFTER the Suggestion Engine.
 *
 * SCOPE (read-only, non-custodial): these are TYPES + enums only. Nothing here fetches a quote, builds/simulates/
 * signs/submits a transaction, mounts a card, or changes any financial suggestion. The Suggestion Engine remains
 * the sole authority for WHAT/ WHICH/ HOW-MUCH; this layer only ever answers WHERE an already-decided exact swap
 * currently appears cheapest to complete, over a FIXED quote snapshot.
 *
 * HARD BOUNDARIES encoded by these contracts:
 *   • exact-in only — raw amounts are integer-safe strings (never float); provider request amounts never lose
 *     precision;
 *   • the action input (`SwapActionContext`) is immutable and carries the ORIGINAL suggestionId, so a quote can
 *     never alter amount/source/destination/eligibility/score/ordering/Top Pick;
 *   • a provider's raw payload NEVER appears in any contract here — only normalized, disclosed fields;
 *   • no field in any contract may carry a transaction/instructions/serializedTransaction/swapTransaction/
 *     signedTransaction/signatureRequest (see `swapQuoteSecurityGuard.ts`).
 */

/** Bumped whenever the cost/ranking/eligibility methodology changes. Stamped on every comparison result. */
import type { SwapDecidingFactor } from "./swapQuoteRanking";

export const SWAP_QUOTE_METHODOLOGY_VERSION = "swap_quote_methodology_1.0.0" as const;
export const SWAP_QUOTE_CONTRACTS_VERSION = "1.0.0" as const;

/** The approved comparison set. Provider identity is a closed union — an unknown provider can never be compared. */
export type SwapProviderId = "jupiter" | "raydium" | "orca";
export type SwapProviderName = "Jupiter" | "Raydium" | "Orca";
export const APPROVED_SWAP_PROVIDER_IDS: readonly SwapProviderId[] = ["jupiter", "raydium", "orca"] as const;
export const SWAP_PROVIDER_NAME: Record<SwapProviderId, SwapProviderName> = {
  jupiter: "Jupiter",
  raydium: "Raydium",
  orca: "Orca",
};

export type SuggestionSwapCategory = "rebalance" | "trim" | "dca";

/** Where the funds physically are when the swap is decided. Only `wallet_transferable` is quote-ready as-is. */
export type SwapSourceAvailability =
  | "wallet_transferable"
  | "protocol_withdrawable"
  | "locked"
  | "unresolved";

/** An exact asset identity for a swap leg. `mint` is ALWAYS the on-chain SPL mint used for the quote request. */
export interface SwapAsset {
  /** Display symbol (never used to resolve the mint — identity is the mint). */
  symbol: string;
  /** Exact on-chain mint. Native SOL is represented by Wrapped SOL (So111…112) for quote requests. */
  mint: string;
  /** Exact token decimals (from the approved registry) — required for integer-safe raw⇄token conversion. */
  decimals: number;
}

/**
 * The immutable, exact swap action handed to the quote layer. One `SwapActionContext` == exactly one swap LEG.
 * A multi-source action becomes multiple independent contexts that all share `suggestionId` (and `actionId`).
 * `Readonly` on the whole shape is intentional — the quote layer must never write back into it.
 */
export interface SwapActionContext {
  /** Stable per-action id (one action may fan out into multiple legs). */
  actionId: string;
  /** The ORIGINAL Suggestion Engine id. Preserved through every leg; never rewritten by the quote layer. */
  suggestionId: string;
  suggestionCategory: SuggestionSwapCategory;

  /** Stable per-leg id (unique within the action). */
  legId: string;
  legIndex: number;
  totalLegs: number;

  inputAsset: SwapAsset;
  outputAsset: SwapAsset;

  /** Exact input amount in raw smallest units — integer-safe string (BigInt-compatible). Never a float. */
  inputAmountRaw: string;
  /** Exact input amount in whole tokens — decimal string for display/disclosure only (never for the request). */
  inputAmountTokens: string;
  /** USD value of the input at the shared snapshot price, or null when USD is unavailable. */
  inputAmountUsd: number | null;

  sourceAvailability: SwapSourceAvailability;

  /** ISO timestamp of the underlying suggestion snapshot this leg was built from. */
  generatedAt: string;
}

/** Why a swap action is NOT ready to be quoted (source/destination/amount unavailable), or requires no swap. */
export type SwapActionReadiness =
  | { status: "ready"; legs: SwapActionContext[] }
  | { status: "not_ready_for_quote"; reasons: string[] }
  | { status: "not_required"; reasons: string[] };

/* ------------------------------------------------------------------ *
 * Normalized provider candidate.
 * ------------------------------------------------------------------ */

export type SwapLiquidityStatus = "verified" | "below_minimum" | "unavailable" | "unresolved";
export type SwapQuoteFreshness = "fresh" | "stale" | "expired" | "unresolved";

export interface SwapRouteLiquidityAssessment {
  status: SwapLiquidityStatus;
  /** The SMALLEST per-leg pool liquidity across the route (the binding constraint), or null when unresolved. */
  minimumRouteLegLiquidityUsd: number | null;
  /** One entry per underlying route leg (pool id + its fresh liquidity), for transparency. Never total TVL. */
  legs: SwapRouteLegLiquidity[];
}

export interface SwapRouteLegLiquidity {
  poolId: string;
  venue: string;
  liquidityUsd: number | null;
  liquidityObservedAt: string | null;
  /** RFQ legs have no pool TVL — they are assessed under a separate approved RFQ policy, never the pool rule. */
  /**
   * `aggregator` — a leg an aggregator routed through whose pool depth no approved source can read.
   * Distinct from `unresolved`, which means a leg we SHOULD have been able to read and could not.
   * The difference matters: one is a known limit of the source set, the other is a failure.
   */
  legKind: "amm_pool" | "clmm_pool" | "rfq" | "aggregator" | "unresolved";
}

/**
 * A normalized, provider-neutral quote candidate. EVERY economic field is normalized + disclosed; the provider's
 * raw response never reaches this shape (it is dropped at the adapter boundary). `executionSurface` is the venue
 * the user would open (Jupiter/Raydium/Orca); `underlyingVenues` are the DEXes actually providing liquidity
 * beneath it (a Jupiter candidate may route through Raydium/Orca — they are NOT independent economic routes).
 */
export interface SwapQuoteCandidate {
  providerId: SwapProviderId;
  providerName: SwapProviderName;

  executionSurface: SwapProviderId;
  underlyingVenues: string[];

  inputMint: string;
  outputMint: string;
  inputAmountRaw: string;
  expectedOutputRaw: string;
  /** Provider minimum-out (slippage-protected floor). NEVER used as expected output for ranking. */
  minimumOutputRaw: string | null;

  expectedOutputTokens: string;
  expectedOutputUsd: number | null;

  quotedAt: string;
  expiresAt: string | null;
  quoteLatencyMs: number | null;

  priceImpactPct: number | null;

  /** Fees ALREADY reflected in expectedOutput (pool + provider platform fees) — never re-subtracted. */
  includedSwapFeeUsd: number | null;
  explicitPlatformFeeUsd: number | null;
  /** Non-included costs (paid separately) — subtracted once from expected output for net value. */
  estimatedNetworkFeeUsd: number | null;
  estimatedRentFeeUsd: number | null;

  liquidityAssessment: SwapRouteLiquidityAssessment;
  freshness: SwapQuoteFreshness;

  eligible: boolean;
  exclusionReasons: SwapExclusionReason[];
}

/** The closed set of candidate exclusion reasons (deterministic, greppable). */
export type SwapExclusionReason =
  | "provider_unavailable"
  | "no_route"
  | "quote_timeout"
  | "quote_stale"
  | "quote_expired"
  | "pair_mismatch"
  | "amount_mismatch"
  | "output_unresolved"
  | "price_impact_unresolved"
  | "price_impact_high"
  | "liquidity_unresolved"
  | "liquidity_low"
  | "total_cost_unresolved"
  | "estimated_cost_high"
  | "blocked_intermediate_asset"
  | "blocked_underlying_venue"
  | "rfq_not_approved"
  | "normalization_failed";

/* ------------------------------------------------------------------ *
 * Comparison-level result.
 * ------------------------------------------------------------------ */

export type SwapComparisonStatus =
  | "selected"
  | "partial_comparison"
  | "only_route_available"
  | "no_valid_route"
  | "not_ready_for_quote"
  | "not_required"
  | "unresolved";

/**
 * WHY the winner was selected, in terms of the margin.
 *
 * `narrow_margin` replaced `economically_equivalent_tiebreak`, which was actively misleading: it named a
 * tie-break, but it is set purely from the epsilon comparison of the top two net outputs and says nothing
 * about which comparison chose the winner. The winner still won on net output. For the MECHANISM, read
 * `decidedBy`.
 */
export type SwapSelectionBasis =
  | "lowest_estimated_total_cost"
  | "only_eligible_route"
  /** The winner beat the runner-up, but by less than the approved epsilon. A margin, not a mechanism. */
  | "narrow_margin"
  | null;

export type SwapPairClass = "major" | "minor" | "unresolved";

/**
 * One leg's comparison outcome over a FIXED snapshot of candidates. The financial suggestion is untouched — this
 * only reports the currently-cheapest eligible route, transparent alternatives, and every exclusion reason.
 */
export interface SwapQuoteComparisonAssessment {
  status: SwapComparisonStatus;

  actionId: string;
  legId: string;

  pairClass: SwapPairClass;
  comparedAt: string;
  /** Earliest provider/route expiry across the eligible candidates; the whole comparison expires here. */
  expiresAt: string | null;

  selectedProviderId: SwapProviderId | null;
  selectionBasis: SwapSelectionBasis;

  /** Every candidate considered, ranked (eligible first, by net value), each with its exclusion reasons. */
  candidates: SwapQuoteCandidate[];

  comparedProviders: SwapProviderId[];
  unavailableProviders: SwapProviderId[];

  estimatedTotalCostUsd: number | null;
  estimatedTotalCostPct: number | null;
  expectedOutputTokens: string | null;
  minimumOutputTokens: string | null;

  /** True when the top two eligible net outputs were within the approved epsilon. A statement about the MARGIN. */
  economicallyEquivalent: boolean;

  /**
   * Which comparison actually separated the winner from the runner-up: net_output, total_cost,
   * price_impact, minimum_output, freshness, latency, or provider_priority. Null when fewer than two
   * eligible candidates.
   *
   * Recorded so "did the provider tie-break ever choose the winner?" is answerable from data. It is
   * step 7 of 7 and reached only on exact equality of every economic value, so the expected answer is
   * never — but expected is not the same as verified.
   */
  decidedBy: SwapDecidingFactor;

  warnings: string[];
  blockingReasons: string[];

  methodologyVersion: string;
}

/* ------------------------------------------------------------------ *
 * Multi-leg plan summary (multi-source Rebalance).
 * ------------------------------------------------------------------ */

export interface SwapPlanQuoteSummary {
  actionId: string;
  legAssessments: SwapQuoteComparisonAssessment[];
  selectedLegCount: number;
  unresolvedLegCount: number;
  estimatedPlanCostUsd: number | null;
  estimatedPlanCostPct: number | null;
  /** The plan expires when its EARLIEST selected leg expires (see swapQuoteComparison.summarizeSwapPlan). */
  expiresAt: string | null;
  methodologyVersion: string;
}
