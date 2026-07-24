/**
 * providerContracts — Step 23B (SERVER-ONLY). The common contract every live swap-quote provider client
 * implements. These types live only in the server tree (`src/server/swapQuote/`); no browser code imports them
 * (enforced by an architecture-guard fixture). A provider client performs a QUOTE-ONLY request and returns a
 * discriminated result — it never builds/simulates/signs/submits a transaction and never leaks a raw payload.
 */
import type { SwapProviderId, SwapQuoteCandidate } from "../../suggestions/swapQuote/swapQuoteContracts";
import type { RouteLegLiquidityInput } from "../../suggestions/swapQuote/swapLiquidity";

/** Everything a provider needs to request an exact-input quote. Contains NO profile / URL / wallet-private data. */
export interface ProviderQuoteRequest {
  inputMint: string;
  outputMint: string;
  inputDecimals: number;
  outputDecimals: number;
  /** Exact raw base units (integer string) — the immutable action amount. */
  inputAmountRaw: string;
  slippageBps: number;
  /** Deterministic comparison identity (also the request key). */
  comparisonId: string;
  /** ms epoch the comparison window opened (freshness/expiry judged against this). */
  comparedAtMs: number;
  /** USD unit price of the OUTPUT token from the shared snapshot (null → expectedOutputUsd unavailable). */
  outputUnitPriceUsd: number | null;
}

/** Server-side execution context. Credentials/RPC are injected here and NEVER logged or returned to the client. */
export interface ProviderRequestContext {
  signal: AbortSignal;
  /** Injectable transport (defaults to global fetch) — lets tests supply deterministic mock responses. */
  fetchImpl?: typeof fetch;
  /** Injectable read-only RPC reader for on-chain quote adapters (Orca). Server-only; never a signer. */
  rpcRead?: RpcReadClient;
  /** Server-only provider secret/endpoint config (never exposed downstream). */
  config: ProviderRuntimeConfig;
  requestStartMs: number;
}

/** A minimal read-only account-state reader (Orca Whirlpools). Deliberately has NO signing/sending capability. */
export interface RpcReadClient {
  getAccountData(address: string, signal: AbortSignal): Promise<Uint8Array | null>;
}

/** Server-only per-provider runtime config (endpoint + version + optional secret presence flag). */
export interface ProviderRuntimeConfig {
  providerId: SwapProviderId;
  adapterVersion: string;
  quoteEndpoint: string | null;
  rpcEndpoint: string | null;
  /** True when a required secret is present (the secret VALUE never travels in this struct). */
  configured: boolean;
  missingConfigReasons: string[];
}

/** Route legs a client extracted from the raw route, for the orchestrator to resolve fresh liquidity against. */
export type ProviderRouteLeg = Pick<RouteLegLiquidityInput, "poolId" | "venue" | "legKind">;

/**
 * A provider's quote outcome. Every non-success case is DISTINCT so the orchestrator can categorize
 * compared-vs-unavailable providers and report sanitized status — never a raw error body.
 */
export type ProviderQuoteResult =
  | { kind: "success"; candidate: SwapQuoteCandidate; routeLegs: ProviderRouteLeg[]; latencyMs: number }
  | { kind: "no_route"; latencyMs: number }
  | { kind: "timeout"; latencyMs: number }
  | { kind: "unavailable"; reasonCode: string; latencyMs: number }
  | { kind: "malformed"; latencyMs: number }
  | { kind: "normalization_failed"; latencyMs: number }
  | { kind: "blocked_transaction"; latencyMs: number };

export interface LiveSwapQuoteProvider {
  readonly providerId: SwapProviderId;
  quoteExactIn(request: ProviderQuoteRequest, context: ProviderRequestContext): Promise<ProviderQuoteResult>;
}
