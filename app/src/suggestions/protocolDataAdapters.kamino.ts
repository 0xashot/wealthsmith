/**
 * protocolDataAdapters.kamino — Kamino market-data adapter STUB.
 *
 * The app already computes real Kamino APY/TVL, but ONLY for the user's HELD
 * vaults (kaminoVaults.ts, via the heavy SDK at position-detection time). There
 * is no candidate-level "Kamino USDC market APY/TVL" feed decoupled from the
 * user's positions, and pulling the SDK here would be heavy and position-scoped.
 *
 * So this is a contract/stub: it returns `partial` with a clear reason and does
 * NOT invent apy/tvl. A real candidate-market adapter (a Kamino vault catalog +
 * per-vault APY/TVL) is still needed — see protocolDataSources.md. Read-only, no
 * transactions, not wired into the Suggestion Engine.
 */
import type { ProtocolCandidateRequest, ProtocolDataAdapter, ProtocolDataAdapterResult } from "./protocolDataAdapters";
import { missingMarketData } from "./protocolMarketData";

export const kaminoAdapter: ProtocolDataAdapter = {
  id: "kamino",
  sourceName: "Kamino",
  supportedProtocolIds: ["kamino"],
  async fetchMarketData(candidate: ProtocolCandidateRequest): Promise<ProtocolDataAdapterResult> {
    // Honest missing record — real per-held-vault APY exists in kaminoVaults.ts,
    // but there is no candidate-level market feed yet.
    const marketData = missingMarketData(candidate.protocolId, candidate.strategyType, candidate.assetSymbol, {
      dataSources: ["kamino"],
    });
    return {
      protocolId: candidate.protocolId,
      marketData,
      status: "partial",
      errors: [
        "Kamino candidate-market APY/TVL not available: existing code sources APY per HELD vault only. A vault-catalog + market adapter is still needed.",
      ],
      updatedAt: marketData.updatedAt,
    };
  },
};
