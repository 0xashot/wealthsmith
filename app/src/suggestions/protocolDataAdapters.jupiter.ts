/**
 * protocolDataAdapters.jupiter — Jupiter read-only QUOTE adapter (CONTRACT-ONLY).
 *
 * Prepares for future liquidity / slippage / route-cost guardrails. Step 12D is
 * contract-only: `getReadOnlyQuoteEstimate` returns `quoteAvailable: false` and
 * computes nothing. It NEVER builds a swap, calls a swap endpoint, requests a
 * signature, or sends a transaction. Not wired into the Suggestion Engine, and
 * quote data is never used to rank or select a protocol.
 */
import type { ProtocolQuoteData } from "./protocolMarketData";

/** Explicit marker: the Jupiter quote adapter is not implemented (contract-only). */
export const JUPITER_QUOTE_ADAPTER_IMPLEMENTED = false;

export interface ReadOnlyQuoteParams {
  inputMint?: string;
  outputMint?: string;
  /** Base-unit amount to quote. Read-only estimate only — never executed. */
  amount?: number;
  assetSymbol?: string;
}

/**
 * Contract stub for a future read-only Jupiter quote. Returns
 * `quoteAvailable: false` — no route/slippage/cost is computed, and nothing is
 * ever executed. Wiring the real quote-api call is a later step.
 */
export function getReadOnlyQuoteEstimate(params: ReadOnlyQuoteParams = {}): ProtocolQuoteData {
  return {
    ...(params.assetSymbol ? { assetSymbol: params.assetSymbol } : {}),
    quoteAvailable: false,
    source: "jupiter",
    notes: [
      "Quote adapter is contract-only (Step 12D): no route/slippage/cost computed.",
      "Never builds or sends transactions and never requests a signature.",
    ],
  };
}
