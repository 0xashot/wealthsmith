/**
 * jupiterSwapClient — Phase 2 (SERVER-ONLY). The only module in the codebase that asks a provider
 * for an executable transaction.
 *
 * It lives in its own tree beside the quote server rather than inside it, so the quote lane's
 * promise — "this code path never requests a transaction" — stays literally true and greppable.
 * `server/swapQuote/` still omits the taker on every call it makes; the taker appears here and
 * only here.
 *
 * WHY IT RE-QUOTES. The quote lane normalizes and discards the provider's raw response, and
 * Jupiter's /swap endpoint needs that exact raw object back. More importantly, a quote the user
 * saw thirty seconds ago is not the quote they would be signing. So this performs its own
 * quote → swap round trip, and the terms it returns are the FRESH ones. The rail's displayed
 * comparison decides whether a confirm step may be offered; it never supplies the numbers that
 * get signed.
 *
 * WHAT THIS DOES NOT DO. It does not verify that the returned transaction actually performs the
 * swap these terms describe. That check belongs to Phase 3 and happens client-side, before
 * signing, because the user's wallet is the only place the transaction can be meaningfully
 * compared with what they were shown. Until then, treat these terms as the provider's claim.
 *
 * Holds no key, signs nothing, submits nothing. `userPublicKey` is public by definition.
 */
import { assertNoTransactionFields } from "../../suggestions/swapQuote/swapQuoteSecurityGuard";
import type { SwapExecutionTerms } from "../../suggestions/swapExecution/executionContracts";
import { SWAP_NETWORK_FEE_POLICY } from "../../suggestions/swapQuote/swapQuotePolicy";

export const JUPITER_SWAP_ADAPTER_VERSION = "jupiter_swap_adapter_1.0.0" as const;

/** Derived from the configured quote endpoint so a host override moves both calls together. */
export function deriveSwapEndpoint(quoteEndpoint: string): string {
  return quoteEndpoint.replace(/\/quote(\?.*)?$/, "/swap");
}

export interface JupiterSwapRequest {
  inputMint: string;
  outputMint: string;
  inputAmountRaw: string;
  slippageBps: number;
  /** The wallet that will sign and receive. Public key only. */
  userPublicKey: string;
  inputSymbol: string;
  outputSymbol: string;
  inputDecimals: number;
  outputDecimals: number;
}

export interface JupiterSwapContext {
  quoteEndpoint: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  now?: () => number;
}

export type JupiterSwapResult =
  | {
      kind: "ok";
      unsignedTransaction: string;
      lastValidBlockHeight: number | null;
      terms: SwapExecutionTerms;
      quotedAt: string;
    }
  | { kind: "no_route" }
  | { kind: "unavailable"; reason: string };

/** Integer base units → a decimal token string, without going through a float. */
export function rawToTokens(raw: string, decimals: number): string {
  if (!/^[0-9]+$/.test(raw)) return "";
  if (decimals <= 0) return raw;
  const padded = raw.padStart(decimals + 1, "0");
  const whole = padded.slice(0, padded.length - decimals);
  const frac = padded.slice(padded.length - decimals).replace(/0+$/, "");
  return frac.length > 0 ? `${whole}.${frac}` : whole;
}

/** Jupiter reports price impact as a decimal fraction string; the UI shows percentage points. */
function impactToPercent(raw: unknown): number {
  const n = typeof raw === "string" ? Number(raw) : typeof raw === "number" ? raw : NaN;
  return Number.isFinite(n) ? n * 100 : NaN;
}

/**
 * Quote, then build. Both failures are isolated: a missing route is `no_route`, anything else is
 * `unavailable` with a reason. Neither ever throws into the caller's request handling, because a
 * failed execution attempt must degrade to a handoff, never to an error page.
 */
export async function buildJupiterSwapTransaction(
  request: JupiterSwapRequest,
  context: JupiterSwapContext,
): Promise<JupiterSwapResult> {
  const fetchImpl = context.fetchImpl ?? fetch;
  const now = context.now ?? Date.now;

  // --- 1. Quote WITH the taker. This is the line the quote lane deliberately does not have. ---
  const quoteUrl = new URL(context.quoteEndpoint);
  quoteUrl.searchParams.set("inputMint", request.inputMint);
  quoteUrl.searchParams.set("outputMint", request.outputMint);
  quoteUrl.searchParams.set("amount", request.inputAmountRaw);
  quoteUrl.searchParams.set("slippageBps", String(request.slippageBps));
  quoteUrl.searchParams.set("swapMode", "ExactIn");
  quoteUrl.searchParams.set("onlyDirectRoutes", "false");

  let rawQuote: Record<string, unknown>;
  try {
    const res = await fetchImpl(quoteUrl.toString(), {
      signal: context.signal,
      headers: { accept: "application/json" },
    });
    if (!res.ok) return { kind: "unavailable", reason: `quote_http_${res.status}` };
    rawQuote = (await res.json()) as Record<string, unknown>;
  } catch {
    return { kind: "unavailable", reason: "quote_unreachable" };
  }

  // A Jupiter QUOTE must still carry no transaction — only /swap may return one. If it does, the
  // wrong endpoint was called and we refuse rather than proceed with a payload we did not expect.
  try {
    assertNoTransactionFields(rawQuote);
  } catch {
    return { kind: "unavailable", reason: "quote_returned_transaction" };
  }

  const outAmount = rawQuote.outAmount;
  const minimumOut = rawQuote.otherAmountThreshold;
  if (typeof outAmount !== "string" || outAmount.length === 0) return { kind: "no_route" };
  // No guaranteed minimum means no honest confirm step — the Boundary requires the one number
  // the user is actually promised, and we would rather hand off than show an expectation as a floor.
  if (typeof minimumOut !== "string" || minimumOut.length === 0) {
    return { kind: "unavailable", reason: "no_minimum_output" };
  }

  // --- 2. Build the transaction. ---
  let swapBody: Record<string, unknown>;
  try {
    const res = await fetchImpl(deriveSwapEndpoint(context.quoteEndpoint), {
      method: "POST",
      signal: context.signal,
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({
        quoteResponse: rawQuote,
        userPublicKey: request.userPublicKey,
        // Native SOL is handled by the route itself; the user should not be left holding wSOL.
        wrapAndUnwrapSol: true,
        // Let the provider size compute and priority fee. A hand-tuned constant here ages badly
        // and silently: too low and transactions expire, too high and the user overpays.
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: "auto",
      }),
    });
    if (!res.ok) return { kind: "unavailable", reason: `swap_http_${res.status}` };
    swapBody = (await res.json()) as Record<string, unknown>;
  } catch {
    return { kind: "unavailable", reason: "swap_unreachable" };
  }

  // Jupiter simulates before returning, and reports the result in `simulationError`. It still hands
  // back a fully-formed transaction when that simulation failed — observed 2026-11-23, where a swap
  // from a wallet holding none of the input token came back with a valid transaction and
  // `{"errorCode":"TRANSACTION_ERROR","error":"...custom program error: 0x1788"}`.
  //
  // Presenting a confirm screen over a transaction the provider already knows will fail would spend
  // the user's attention and then their network fee for nothing. If the provider ran a simulation and
  // it failed, we refuse. (A null/absent field means no simulation was reported, not a passing one —
  // the value check in executionVerification is what covers that case.)
  if (swapBody.simulationError != null) {
    return { kind: "unavailable", reason: "provider_simulation_failed" };
  }

  const unsigned = swapBody.swapTransaction;
  if (typeof unsigned !== "string" || unsigned.length === 0) {
    return { kind: "unavailable", reason: "no_transaction_returned" };
  }

  const lastValid =
    typeof swapBody.lastValidBlockHeight === "number" && Number.isFinite(swapBody.lastValidBlockHeight)
      ? swapBody.lastValidBlockHeight
      : null;

  const terms: SwapExecutionTerms = {
    inputSymbol: request.inputSymbol,
    inputMint: request.inputMint,
    inputAmountRaw: request.inputAmountRaw,
    inputAmountTokens: rawToTokens(request.inputAmountRaw, request.inputDecimals),
    // Left null here and filled by the handler, which owns the price snapshot. This adapter's job
    // is the provider round trip; pricing is not the provider's claim and should not look like it.
    inputAmountUsd: null,
    outputSymbol: request.outputSymbol,
    outputMint: request.outputMint,
    expectedOutputTokens: rawToTokens(outAmount, request.outputDecimals),
    expectedOutputUsd: null,
    // otherAmountThreshold IS the guaranteed floor for an ExactIn swap at this slippage.
    minimumOutputTokens: rawToTokens(minimumOut, request.outputDecimals),
    priceImpactPct: impactToPercent(rawQuote.priceImpactPct),
    slippageBps: request.slippageBps,
    estimatedTotalCostUsd: null,
    // The SAME disclosed constant the route comparison above this sheet uses. Deriving a
    // per-route fee here would be defensible — unlike the quote lane we do hold a transaction —
    // but then the two sections of one modal would quote different fees for one swap, which is
    // the exact class of bug that two price-impact formatters already caused once.
    estimatedNetworkFeeUsd: SWAP_NETWORK_FEE_POLICY.conservativeNetworkFeeUsd,
    providerId: "jupiter",
    providerName: "Jupiter",
  };

  return {
    kind: "ok",
    unsignedTransaction: unsigned,
    lastValidBlockHeight: lastValid,
    terms,
    quotedAt: new Date(now()).toISOString(),
  };
}
