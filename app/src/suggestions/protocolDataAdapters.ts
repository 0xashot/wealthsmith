/**
 * protocolDataAdapters — read-only adapter CONTRACTS + the merge aggregator.
 *
 * SERVICE LAYER ONLY (Step 12D). The Suggestion Engine never imports or calls
 * anything here — running an adapter must never block or change suggestions.
 * Adapters collect/normalize data; they do NOT select, rank, or score, and they
 * never invent values. `buildProtocolSelectionInput` is a pure, synchronous
 * merge that fills honest "missing" records for candidates without data.
 */
import type { ProtocolStrategyType } from "./engineTypes";
import type {
  ProtocolMarketData,
  ProtocolRiskData,
  ProtocolSelectionInput,
} from "./protocolMarketData";
import { missingMarketData } from "./protocolMarketData";
import { getProtocolRiskData } from "./protocolRiskRegistry";

/** A single candidate's data request handed to an adapter. */
export interface ProtocolCandidateRequest {
  protocolId: string;
  assetSymbol: string;
  strategyType: ProtocolStrategyType;
}

export interface ProtocolDataAdapterResult {
  protocolId: string;
  marketData?: ProtocolMarketData;
  riskData?: ProtocolRiskData;
  status: "available" | "partial" | "missing" | "error";
  errors?: string[];
  updatedAt: string;
}

export interface ProtocolDataAdapter {
  id: string;
  sourceName: string;
  supportedProtocolIds: string[];
  /** Read-only. Must resolve (never throw) — errors become `status: "error"`. */
  fetchMarketData(candidate: ProtocolCandidateRequest): Promise<ProtocolDataAdapterResult>;
}

/**
 * Merge candidate market + risk data into a ProtocolSelectionInput. SYNCHRONOUS
 * and NETWORK-FREE: it never calls adapters itself — callers inject any
 * already-fetched market data. Candidates without market data get an honest
 * `missing` record; risk comes from the static curated registry.
 *
 * It NEVER selects, sorts, ranks, or scores, and returns no selected protocol.
 */
export function buildProtocolSelectionInput(args: {
  candidateProtocolIds: string[];
  assetSymbol: string;
  strategyType: ProtocolStrategyType;
  /** Optionally inject already-fetched market data (e.g. from an adapter run). */
  marketDataByProtocolId?: Record<string, ProtocolMarketData>;
}): ProtocolSelectionInput {
  const marketDataByProtocolId: Record<string, ProtocolMarketData> = {};
  const riskDataByProtocolId: Record<string, ProtocolRiskData> = {};

  for (const id of args.candidateProtocolIds) {
    marketDataByProtocolId[id] =
      args.marketDataByProtocolId?.[id] ??
      missingMarketData(id, args.strategyType, args.assetSymbol);
    riskDataByProtocolId[id] = getProtocolRiskData(id);
  }

  return {
    candidateProtocolIds: args.candidateProtocolIds,
    assetSymbol: args.assetSymbol,
    strategyType: args.strategyType,
    marketDataByProtocolId,
    riskDataByProtocolId,
  };
}
