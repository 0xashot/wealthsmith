/**
 * nodeServerEntry — Step 23B (SERVER-ONLY). The request-time server wiring. It exposes a framework-agnostic
 * request LISTENER that parses a small JSON body, runs the sanitized `createSwapQuoteHandler`, and writes only a
 * sanitized `SwapQuoteComparisonAssessment` (or a safe error). The actual `node:http` binding lives in the
 * `scripts/swap-quote-serve.mjs` runner (kept out of tsc/browser). Live provider clients + default price/liquidity
 * sources are wired here; a request never carries wallet-private data, arbitrary URLs, or credentials.
 */
import { createSwapQuoteHandler, type SwapQuoteHttpRequest, type SwapQuoteHttpResponse } from "./httpHandler";
import { createJupiterPriceSource, JUPITER_PRICE_V3_URL } from "./jupiterPriceSource";
import { createRaydiumLiquiditySource, RAYDIUM_POOLS_INFO_URL } from "./raydiumLiquiditySource";
import { SwapQuoteCache } from "./swapQuoteCache";
import { nodeEnvReader, detectLeakedSwapEnv, type EnvReader } from "./providerConfig";
import { SWAP_QUOTE_OPERATIONAL_POLICY } from "../../suggestions/swapQuote/swapQuotePolicy";
import type { RpcReadClient } from "./providerContracts";

export const APPROVED_DEFAULT_SLIPPAGE_BPS = 50;

export interface NodeServerDeps {
  env?: EnvReader;
  fetchImpl?: typeof fetch;
  rpcRead?: RpcReadClient;
  now?: () => number;
}

/** Build the sanitized request handler with live provider clients + approved price/liquidity sources + cache. */
export function createSwapQuoteRequestHandler(deps: NodeServerDeps = {}) {
  const env = deps.env ?? nodeEnvReader;
  const leaked = detectLeakedSwapEnv(env);
  if (leaked.length > 0) throw new Error(`swap_quote_env_leak: ${leaked.join(",")}`);
  const fetchImpl = deps.fetchImpl ?? fetch;
  const cache = new SwapQuoteCache(SWAP_QUOTE_OPERATIONAL_POLICY.cacheDurationMs, deps.now);
  // Approved production sources: Jupiter Price v3 (shared USD snapshot) + Raydium pool-TVL (per-leg liquidity).
  // A server env var may point at an approved mirror; otherwise the canonical public endpoints are used.
  const priceSource = createJupiterPriceSource(fetchImpl, env("SWAP_PRICE_URL") ?? JUPITER_PRICE_V3_URL);
  const liquiditySource = createRaydiumLiquiditySource(fetchImpl, env("SWAP_LIQUIDITY_URL") ?? RAYDIUM_POOLS_INFO_URL);
  return createSwapQuoteHandler({
    // slippageBps is per-request; the handler injects req.slippageBps into the orchestrator.
    priceSource,
    liquiditySource,
    env,
    fetchImpl,
    rpcRead: deps.rpcRead,
    cache,
    now: deps.now,
  });
}

/** A minimal, transport-agnostic listener: takes a parsed request body → sanitized response object. */
export async function handleParsedRequest(body: unknown, deps: NodeServerDeps = {}): Promise<SwapQuoteHttpResponse> {
  const handler = createSwapQuoteRequestHandler(deps);
  if (body == null || typeof body !== "object") return { status: 400, body: { error: "invalid_body" } };
  return handler(body as SwapQuoteHttpRequest);
}
