/**
 * routeCostTypes — read-only route / cost / liquidity quote shapes.
 *
 * QUOTE DATA ONLY (Step 12F). Describes what a read-only swap QUOTE can tell us
 * about route availability, price impact, and execution-cost guardrails —
 * WITHOUT building or sending a transaction. Nothing here selects a protocol,
 * ranks, or scores. HONESTY: unknown optional values stay ABSENT (never 0), and
 * no liquidity/slippage/fee/route value is ever invented.
 */
import type { DataConfidence } from "./protocolMarketData";

/** A live route input a quote guardrail needs. */
export type RouteDataRequirement =
  | "quote_route"
  | "price_impact"
  | "network_fee"
  | "liquidity"
  | "slippage"
  | "token_mint"
  | "amount";

export interface RouteQuoteRequest {
  inputMint: string;
  outputMint: string;
  /** Base-unit (atomic) input amount as a string. Read-only estimate only. */
  amountAtomic: string;
  slippageBps?: number;
}

export interface RouteQuoteResult {
  quoteAvailable: boolean;
  inputMint: string;
  outputMint: string;
  amountAtomic: string;
  outAmountAtomic?: string;
  /** Price impact as a PERCENT (e.g. 0.5 = 0.5%). Absent when the source omits it. */
  priceImpactPct?: number;
  estimatedNetworkFeeUsd?: number;
  routeSource: "jupiter";
  rawSource?: "quote_only";
  updatedAt: string;
  confidence: DataConfidence;
  missingFields: RouteDataRequirement[];
  errors?: string[];
}
