/**
 * protocolMarketData — normalized data contracts for the future protocol-
 * selection engine, plus honest "missing" constructors.
 *
 * DATA COLLECTION SHAPES ONLY (Step 12D). Nothing here selects, ranks, or scores
 * a protocol. HONESTY RULES:
 *  - optional fields stay ABSENT when unknown — never 0, never a placeholder;
 *  - `confidence` + `missingFields` record exactly what is / isn't known;
 *  - no APY/TVL/risk/fee/lockup/liquidity/slippage/route value is ever invented.
 */
import type { ProtocolStrategyType } from "./engineTypes";
import type { ProtocolDataRequirement } from "./protocolRegistry";

export type DataConfidence = "available" | "partial" | "missing" | "unreliable";

export interface ProtocolMarketData {
  protocolId: string;
  strategyType: ProtocolStrategyType;
  assetSymbol: string;
  assetMint?: string;
  /** Sourced APY (percent). Absent when unknown — never 0-as-unknown. */
  apy?: number;
  tvlUsd?: number;
  liquidityUsd?: number;
  withdrawalTimeHours?: number;
  fees?: {
    depositBps?: number;
    withdrawBps?: number;
    performanceBps?: number;
    managementBps?: number;
  };
  route?: {
    quoteAvailable?: boolean;
    priceImpactPct?: number;
    estimatedNetworkFeeUsd?: number;
    source?: string;
  };
  dataSources: string[];
  /** ISO timestamp of when this snapshot was produced (real, not invented). */
  updatedAt: string;
  confidence: DataConfidence;
  /** The live inputs still missing for this record. */
  missingFields: ProtocolDataRequirement[];
}

export interface ProtocolRiskData {
  protocolId: string;
  /** Absent until a documented 12E scoring methodology exists — never invented. */
  riskScore?: number;
  auditStatus?: "audited" | "partially_audited" | "unknown";
  /** Absent unless documented (buffer eligibility is a per-position property today). */
  safetyBufferEligible?: boolean;
  withdrawalClass?: "instant" | "same_day" | "delayed" | "unknown";
  notes: string[];
  sources: string[];
  lastReviewedAt?: string;
  confidence: DataConfidence;
  missingFields: ProtocolDataRequirement[];
}

/** Read-only quote estimate shape (Jupiter, future). Contract-only in 12D. */
export interface ProtocolQuoteData {
  protocolId?: string;
  assetSymbol?: string;
  /** False until a real read-only quote adapter is wired in. */
  quoteAvailable: boolean;
  priceImpactPct?: number;
  estimatedNetworkFeeUsd?: number;
  source?: string;
  notes: string[];
}

export interface ProtocolSelectionInput {
  candidateProtocolIds: string[];
  assetSymbol: string;
  strategyType: ProtocolStrategyType;
  marketDataByProtocolId: Record<string, ProtocolMarketData>;
  riskDataByProtocolId: Record<string, ProtocolRiskData>;
}

/** Every live market input a selection would need (used as the "all missing" set). */
export const ALL_MARKET_REQUIREMENTS: readonly ProtocolDataRequirement[] = [
  "apy",
  "tvl",
  "liquidity",
  "withdrawal_behavior",
  "fees",
  "slippage",
  "quote_route",
  "eligibility",
];

/**
 * An honest "we have no market data yet" record: every value ABSENT (never 0),
 * confidence `missing`, and all requirements listed as missing. Optionally carry
 * partial fields a caller genuinely sourced (then set confidence `partial`).
 */
export function missingMarketData(
  protocolId: string,
  strategyType: ProtocolStrategyType,
  assetSymbol: string,
  opts: { dataSources?: string[]; updatedAt?: string; assetMint?: string } = {}
): ProtocolMarketData {
  return {
    protocolId,
    strategyType,
    assetSymbol,
    ...(opts.assetMint ? { assetMint: opts.assetMint } : {}),
    dataSources: opts.dataSources ?? [],
    updatedAt: opts.updatedAt ?? new Date().toISOString(),
    confidence: "missing",
    missingFields: [...ALL_MARKET_REQUIREMENTS],
  };
}
