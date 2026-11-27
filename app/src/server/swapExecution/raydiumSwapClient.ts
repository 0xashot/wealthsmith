/**
 * raydiumSwapClient — (SERVER-ONLY). Asks Raydium's Trade API for an executable swap transaction.
 *
 * The second provider this lane can build for, beside `jupiterSwapClient`, and written to the
 * same contract: quote → build, FRESH terms, one transaction, no key, nothing signed, nothing
 * submitted. It exists so that the route which WON the comparison is the one executed, and so a
 * swap is still possible when Jupiter is unavailable.
 *
 * WHAT WAS OBSERVED, not assumed (2026-11-27, real responses, read-only):
 *   - `GET  /compute/swap-base-in`      → the quote: outputAmount, otherAmountThreshold (the
 *     minimum received), priceImpactPct (already in percent), routePlan.
 *   - `POST /transaction/swap-base-in`  → `data: [{ transaction }]`: ONE unsigned V0 transaction
 *     in every case tried — SOL↔USDC and seven token→USDC sales, one and two pools, classic and
 *     Token-2022. Raydium's docs allow for more than one ("if the swap requires setup"); this
 *     client REFUSES that case rather than ask the user to approve a sequence.
 *   - The transaction endpoint wants the WHOLE compute response back as `swapResponse`, and the
 *     taker's input token account unless the input is native SOL.
 *
 * WHAT THIS DOES NOT DO. It does not check that the transaction performs these terms. The handler
 * does that next — structurally (Raydium's swap instruction states the amount in and the minimum
 * out, and both must match these terms to the unit) and by simulation. Until then these are the
 * provider's claim.
 */
import { assertNoTransactionFields } from "../../suggestions/swapQuote/swapQuoteSecurityGuard";
import type { SwapExecutionTerms } from "../../suggestions/swapExecution/executionContracts";
import { SWAP_NETWORK_FEE_POLICY } from "../../suggestions/swapQuote/swapQuotePolicy";
import { WRAPPED_SOL_MINT, associatedTokenAddress } from "../../suggestions/swapExecution/executionVerification";
import { rawToTokens, type JupiterSwapRequest, type JupiterSwapResult } from "./jupiterSwapClient";

export const RAYDIUM_SWAP_ADAPTER_VERSION = "raydium_swap_adapter_1.0.0" as const;

/** The same request and result shapes as the Jupiter client: the handler treats providers alike. */
export type RaydiumSwapRequest = JupiterSwapRequest;
export type RaydiumSwapResult = JupiterSwapResult;

/** Raydium's own fee suggestion (micro-lamports per compute unit). Public, no key. */
export const RAYDIUM_PRIORITY_FEE_URL = "https://api-v3.raydium.io/main/auto-fee" as const;
/** Used when the suggestion cannot be read. The value Raydium returned for every tier when observed. */
export const RAYDIUM_DEFAULT_COMPUTE_UNIT_PRICE = 10_000;
/**
 * A ceiling on the price we will pass on, whatever the suggestion says. At ~150k compute units
 * this is about 0.00003 SOL of priority fee — far inside the flat network-fee estimate the user
 * is shown. A suggestion above it is clamped, never obeyed.
 */
export const RAYDIUM_MAX_COMPUTE_UNIT_PRICE = 200_000;
const PRIORITY_FEE_TIMEOUT_MS = 1_500;

export interface RaydiumSwapContext {
  /** The compute (quote) endpoint. The transaction endpoint is derived from it. */
  quoteEndpoint: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  now?: () => number;
  priorityFeeUrl?: string;
  /**
   * The taker's token account holding `mint`, read from the chain by the server. Raydium needs it
   * to build a sale of anything but native SOL. Null when the taker holds none.
   */
  findInputTokenAccount: (ownerPublicKey: string, mint: string) => Promise<{ address: string; amountRaw: bigint } | null>;
}

/** `/compute/swap-base-in` → `/transaction/swap-base-in`, so a host override moves both calls together. */
export function deriveRaydiumTransactionEndpoint(quoteEndpoint: string): string {
  return quoteEndpoint.replace(/\/compute\/swap-base-in(\?.*)?$/, "/transaction/swap-base-in");
}

const isDigits = (v: unknown): v is string => typeof v === "string" && /^[0-9]+$/.test(v);

/** Raydium's fee suggestion, clamped; the default on any failure. Never throws. */
export async function resolveRaydiumComputeUnitPrice(fetchImpl: typeof fetch, url: string): Promise<number> {
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), PRIORITY_FEE_TIMEOUT_MS) : null;
  try {
    const res = await fetchImpl(url, { headers: { accept: "application/json" }, ...(controller ? { signal: controller.signal } : {}) });
    if (!res.ok) return RAYDIUM_DEFAULT_COMPUTE_UNIT_PRICE;
    const body = (await res.json()) as { data?: { default?: { h?: unknown } } };
    const suggested = body?.data?.default?.h;
    if (typeof suggested !== "number" || !Number.isFinite(suggested) || suggested < 1) return RAYDIUM_DEFAULT_COMPUTE_UNIT_PRICE;
    return Math.min(Math.floor(suggested), RAYDIUM_MAX_COMPUTE_UNIT_PRICE);
  } catch {
    return RAYDIUM_DEFAULT_COMPUTE_UNIT_PRICE;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Quote, then build. Failures are isolated exactly as in the Jupiter client: a missing route is
 * `no_route`, anything else is `unavailable` with a reason, and nothing throws into the request.
 */
export async function buildRaydiumSwapTransaction(
  request: RaydiumSwapRequest,
  context: RaydiumSwapContext,
): Promise<RaydiumSwapResult> {
  const fetchImpl = context.fetchImpl ?? fetch;
  const now = context.now ?? Date.now;
  const inputIsSol = request.inputMint === WRAPPED_SOL_MINT;
  const outputIsSol = request.outputMint === WRAPPED_SOL_MINT;

  // --- 0. The taker's input account. Raydium cannot build a token sale without it. ---
  let inputAccount: string | null = null;
  if (!inputIsSol) {
    let found: { address: string; amountRaw: bigint } | null = null;
    try {
      found = await context.findInputTokenAccount(request.userPublicKey, request.inputMint);
    } catch {
      return { kind: "unavailable", reason: "input_account_unreadable" };
    }
    // Holding less than the amount is not something to build and let fail in the wallet.
    if (found == null || !isDigits(request.inputAmountRaw) || found.amountRaw < BigInt(request.inputAmountRaw)) {
      return { kind: "unavailable", reason: "input_account_insufficient" };
    }
    inputAccount = found.address;
  }
  // Where the output lands: native SOL (unwrapped), or the taker's own account for the mint.
  const outputAccount = outputIsSol ? null : associatedTokenAddress(request.userPublicKey, request.outputMint);
  if (!outputIsSol && outputAccount == null) return { kind: "unavailable", reason: "output_account_underivable" };

  // --- 1. Quote. ---
  const quoteUrl = new URL(context.quoteEndpoint);
  quoteUrl.searchParams.set("inputMint", request.inputMint);
  quoteUrl.searchParams.set("outputMint", request.outputMint);
  quoteUrl.searchParams.set("amount", request.inputAmountRaw);
  quoteUrl.searchParams.set("slippageBps", String(request.slippageBps));
  quoteUrl.searchParams.set("txVersion", "V0");

  let compute: { success?: unknown; msg?: unknown; data?: Record<string, unknown> };
  try {
    const res = await fetchImpl(quoteUrl.toString(), { signal: context.signal, headers: { accept: "application/json" } });
    if (res.status === 404) return { kind: "no_route" };
    if (!res.ok) return { kind: "unavailable", reason: `quote_http_${res.status}` };
    compute = (await res.json()) as typeof compute;
  } catch {
    return { kind: "unavailable", reason: "quote_unreachable" };
  }
  // A quote must carry no transaction — only the transaction endpoint may return one.
  try {
    assertNoTransactionFields(compute);
  } catch {
    return { kind: "unavailable", reason: "quote_returned_transaction" };
  }
  const data = compute?.data;
  if (compute?.success !== true || data == null || typeof data !== "object") {
    return /no.?route|insufficient liquidity/i.test(String(compute?.msg ?? "")) ? { kind: "no_route" } : { kind: "unavailable", reason: "quote_failed" };
  }
  const outAmount = data.outputAmount;
  const minimumOut = data.otherAmountThreshold;
  if (!isDigits(outAmount) || outAmount === "0") return { kind: "no_route" };
  // No guaranteed minimum means no honest confirm step.
  if (!isDigits(minimumOut) || minimumOut === "0") return { kind: "unavailable", reason: "no_minimum_output" };
  // The quote must be FOR what was asked: exact input, this amount, these mints.
  if (data.swapType !== "BaseIn" || data.inputAmount !== request.inputAmountRaw || data.inputMint !== request.inputMint || data.outputMint !== request.outputMint) {
    return { kind: "unavailable", reason: "quote_mismatch" };
  }
  const impact = typeof data.priceImpactPct === "number" ? data.priceImpactPct : Number.NaN;

  // --- 2. Build the transaction. ---
  const computeUnitPrice = await resolveRaydiumComputeUnitPrice(fetchImpl, context.priorityFeeUrl ?? RAYDIUM_PRIORITY_FEE_URL);
  let built: { success?: unknown; msg?: unknown; data?: unknown };
  try {
    const res = await fetchImpl(deriveRaydiumTransactionEndpoint(context.quoteEndpoint), {
      method: "POST",
      signal: context.signal,
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({
        computeUnitPriceMicroLamports: String(computeUnitPrice),
        // The whole compute response, exactly as received — that is what the endpoint takes.
        swapResponse: compute,
        txVersion: "V0",
        wallet: request.userPublicKey,
        // Native SOL in, native SOL out: the user is never left holding wrapped SOL.
        wrapSol: inputIsSol,
        unwrapSol: outputIsSol,
        ...(inputAccount != null ? { inputAccount } : {}),
        ...(outputAccount != null ? { outputAccount } : {}),
      }),
    });
    if (!res.ok) return { kind: "unavailable", reason: `swap_http_${res.status}` };
    built = (await res.json()) as typeof built;
  } catch {
    return { kind: "unavailable", reason: "swap_unreachable" };
  }
  if (built?.success !== true) return { kind: "unavailable", reason: "swap_failed" };

  // Observed shape is an array; the published schema shows a single object. Accept either — and
  // exactly one transaction in both. More than one is a sequence to approve, which this lane never offers.
  const items: unknown[] = Array.isArray(built.data) ? built.data : built.data != null ? [built.data] : [];
  if (items.length !== 1) return { kind: "unavailable", reason: items.length === 0 ? "no_transaction_returned" : "multiple_transactions" };
  const unsigned = (items[0] as { transaction?: unknown } | null)?.transaction;
  if (typeof unsigned !== "string" || unsigned.length === 0) return { kind: "unavailable", reason: "no_transaction_returned" };

  const terms: SwapExecutionTerms = {
    inputSymbol: request.inputSymbol,
    inputMint: request.inputMint,
    inputAmountRaw: request.inputAmountRaw,
    inputAmountTokens: rawToTokens(request.inputAmountRaw, request.inputDecimals),
    inputAmountUsd: null,
    outputSymbol: request.outputSymbol,
    outputMint: request.outputMint,
    expectedOutputTokens: rawToTokens(outAmount, request.outputDecimals),
    expectedOutputUsd: null,
    // otherAmountThreshold is the floor Raydium writes into the swap instruction itself; the
    // structural check compares the two to the unit.
    minimumOutputTokens: rawToTokens(minimumOut, request.outputDecimals),
    minimumOutputUsd: null,
    // Raydium reports price impact in percentage points already (0.19 = 0.19%).
    priceImpactPct: impact,
    slippageBps: request.slippageBps,
    estimatedTotalCostUsd: null,
    // The same disclosed constant the route comparison uses, for the reason given in the Jupiter client.
    estimatedNetworkFeeUsd: SWAP_NETWORK_FEE_POLICY.conservativeNetworkFeeUsd,
    providerId: "raydium",
    providerName: "Raydium",
  };

  return {
    kind: "ok",
    unsignedTransaction: unsigned,
    // Raydium does not report the blockhash's expiry height. The plan's own short lifetime bounds it.
    lastValidBlockHeight: null,
    terms,
    quotedAt: new Date(now()).toISOString(),
  };
}
