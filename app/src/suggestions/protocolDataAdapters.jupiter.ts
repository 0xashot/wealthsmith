/**
 * protocolDataAdapters.jupiter — Jupiter read-only QUOTE adapter.
 *
 * QUOTE-ONLY (Step 12F). It reads route/price-impact estimates for future
 * guardrails and NEVER: builds a swap, calls a swap/execution endpoint, passes a
 * wallet/publicKey, requests a signature, or sends a transaction. The live quote
 * call is gated behind `JUPITER_LIVE_QUOTE_IMPLEMENTED = false` (no network in
 * production/tests); an injectable `fetchImpl` lets tests exercise parsing. Not
 * wired into the Suggestion Engine — quote data never ranks or selects anything.
 */
import type { ProtocolQuoteData, ProtocolMarketData } from "./protocolMarketData";
import type { RouteQuoteRequest, RouteQuoteResult, RouteDataRequirement } from "./routeCostTypes";

/** Explicit marker: the Jupiter quote adapter is not implemented (contract-only). */
export const JUPITER_QUOTE_ADAPTER_IMPLEMENTED = false;

/** Live network quote is DISABLED — the adapter never hits the network unless a
 *  test injects `fetchImpl`. Flip only when the read-only call is fully vetted. */
export const JUPITER_LIVE_QUOTE_IMPLEMENTED = false;

/** Explicit marker: this adapter never builds or returns transactions. */
export const JUPITER_QUOTE_BUILDS_TRANSACTIONS = false;

/** Public read-only quote endpoint (GET, no wallet). Used only when a fetch is provided. */
const JUPITER_QUOTE_ENDPOINT = "https://lite-api.jup.ag/swap/v1/quote";

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

/* ------------------------------------------------------------------ *
 * Step 12F — read-only route quote (quote-only, no transactions).
 * ------------------------------------------------------------------ */

const now = () => new Date().toISOString();
const isPositiveIntString = (s: string) => /^[1-9][0-9]*$/.test(s);

/** Base "missing" quote result — no fake values, unknown fields absent. */
function baseMissing(
  request: RouteQuoteRequest,
  missingFields: RouteDataRequirement[],
  extra?: Partial<RouteQuoteResult>
): RouteQuoteResult {
  return {
    quoteAvailable: false,
    inputMint: request.inputMint,
    outputMint: request.outputMint,
    amountAtomic: request.amountAtomic,
    routeSource: "jupiter",
    updatedAt: now(),
    confidence: "missing",
    missingFields,
    ...extra,
  };
}

/**
 * Validate a quote request. Returns a `missing` RouteQuoteResult when invalid
 * (never a fake quote), or null when the request is well-formed.
 */
export function validateRouteQuoteRequest(request: RouteQuoteRequest): RouteQuoteResult | null {
  const missing: RouteDataRequirement[] = [];
  if (!request.inputMint || !request.outputMint) missing.push("token_mint");
  if (!request.amountAtomic || !isPositiveIntString(request.amountAtomic)) missing.push("amount");
  if (missing.length === 0) return null;
  return baseMissing(request, missing, { errors: ["Invalid route request."] });
}

/** Result when the live quote is disabled and no fetch was injected (no network). */
export function notImplementedQuoteResult(request: RouteQuoteRequest): RouteQuoteResult {
  return baseMissing(request, ["quote_route", "price_impact", "network_fee", "liquidity"], {
    errors: ["Live Jupiter quote disabled (JUPITER_LIVE_QUOTE_IMPLEMENTED=false)."],
  });
}

/** Error/normalized result on any failure — never throws to the caller. */
export function jupiterQuoteErrorResult(request: RouteQuoteRequest, error: unknown): RouteQuoteResult {
  const msg = error instanceof Error ? error.message : String(error);
  return {
    ...baseMissing(request, ["quote_route", "price_impact", "network_fee", "liquidity"]),
    confidence: "unreliable",
    errors: [msg],
  };
}

interface RawJupiterQuote {
  outAmount?: string | number;
  /** Jupiter returns this as a decimal FRACTION string (0.001 = 0.1%). */
  priceImpactPct?: string | number;
}

/**
 * Parse a raw Jupiter quote into a RouteQuoteResult. Reads ONLY the quote fields
 * needed for read-only guardrails (out amount, price impact). Never reads or
 * builds a transaction payload. Network fee + protocol liquidity are NOT in a
 * quote, so they stay `missing` (never invented).
 */
export function parseJupiterQuote(request: RouteQuoteRequest, raw: RawJupiterQuote): RouteQuoteResult {
  const outAmount = raw?.outAmount;
  const quoteAvailable = outAmount != null && String(outAmount).length > 0;
  const piRaw = raw?.priceImpactPct;
  const priceImpactPct =
    piRaw != null && String(piRaw).length > 0 && Number.isFinite(Number(piRaw))
      ? Number(piRaw) * 100 // fraction → percent
      : undefined;

  const missingFields: RouteDataRequirement[] = [];
  if (!quoteAvailable) missingFields.push("quote_route");
  if (priceImpactPct == null) missingFields.push("price_impact");
  // A quote never carries a USD network fee or protocol liquidity depth.
  missingFields.push("network_fee", "liquidity");

  return {
    quoteAvailable,
    inputMint: request.inputMint,
    outputMint: request.outputMint,
    amountAtomic: request.amountAtomic,
    ...(quoteAvailable ? { outAmountAtomic: String(outAmount) } : {}),
    ...(priceImpactPct != null ? { priceImpactPct } : {}),
    routeSource: "jupiter",
    rawSource: "quote_only",
    updatedAt: now(),
    confidence: quoteAvailable ? (priceImpactPct != null ? "available" : "partial") : "missing",
    missingFields,
  };
}

/**
 * Read-only Jupiter quote. QUOTE-ONLY: no wallet, no publicKey, no signature, no
 * transaction. Never throws — failures resolve to an error/missing result. The
 * live call is disabled unless `options.fetchImpl` is injected (tests) or
 * `JUPITER_LIVE_QUOTE_IMPLEMENTED` is flipped on after vetting.
 */
export async function getReadOnlyJupiterQuote(
  request: RouteQuoteRequest,
  options: { fetchImpl?: typeof fetch; endpoint?: string; timeoutMs?: number } = {}
): Promise<RouteQuoteResult> {
  const invalid = validateRouteQuoteRequest(request);
  if (invalid) return invalid;

  const doFetch = options.fetchImpl ?? (JUPITER_LIVE_QUOTE_IMPLEMENTED ? fetch : undefined);
  if (!doFetch) return notImplementedQuoteResult(request);

  try {
    const endpoint = options.endpoint ?? JUPITER_QUOTE_ENDPOINT;
    const params = new URLSearchParams({
      inputMint: request.inputMint,
      outputMint: request.outputMint,
      amount: request.amountAtomic,
      ...(request.slippageBps != null ? { slippageBps: String(request.slippageBps) } : {}),
    });
    // READ-ONLY GET. No wallet/publicKey is ever sent.
    const res = await doFetch(`${endpoint}?${params.toString()}`);
    if (!res.ok) return jupiterQuoteErrorResult(request, `HTTP ${res.status}`);
    const raw = (await res.json()) as RawJupiterQuote;
    return parseJupiterQuote(request, raw);
  } catch (e) {
    return jupiterQuoteErrorResult(request, e);
  }
}

/**
 * Normalize a route quote into `ProtocolMarketData["route"]`. Only real values
 * pass through; nothing is invented (no fake liquidity/fee estimate).
 */
export function normalizeRouteQuoteToMarketDataRoute(
  quote: RouteQuoteResult
): NonNullable<ProtocolMarketData["route"]> {
  return {
    quoteAvailable: quote.quoteAvailable,
    ...(quote.priceImpactPct != null ? { priceImpactPct: quote.priceImpactPct } : {}),
    ...(quote.estimatedNetworkFeeUsd != null ? { estimatedNetworkFeeUsd: quote.estimatedNetworkFeeUsd } : {}),
    source: "jupiter",
  };
}
