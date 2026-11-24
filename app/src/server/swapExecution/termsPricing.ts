/**
 * termsPricing — the USD sub-lines under the confirm sheet's two token amounts (SERVER-ONLY).
 *
 * WHY THE SERVER. The amounts come from the provider's quote; the prices must come from the same
 * moment, or the dollar figure under a number would describe a slightly different trade than the
 * number itself. Resolving both here, from ONE snapshot taken alongside the quote, is the only
 * arrangement where the two cannot drift apart. The browser has no price source in production
 * anyway — see the portfolio snapshot route for the same reasoning.
 *
 * WHAT A USD FIGURE IS AND IS NOT. It is a convenience for judging size at a glance. It is NOT a
 * term of the trade: nothing is guaranteed in dollars, the swap is denominated in tokens, and the
 * minimum deliberately gets no USD line at all so the one guaranteed figure stays visually
 * distinct from the estimated ones.
 *
 * FAILING IS ALLOWED. Pricing is best-effort and must never cost someone their swap: an unpriced
 * mint, a slow source or a thrown request all yield null, the sheet renders "—", and the plan is
 * offered exactly as it would have been. A swap that works is worth more than a dollar sign.
 */
import { priceOf, resolvePriceSnapshot, type PriceSource } from "../swapQuote/priceSnapshot";
import type { SwapExecutionTerms } from "../../suggestions/swapExecution/executionContracts";

/**
 * How stale a price may be and still be used, in milliseconds.
 *
 * Generous on purpose. This figure is decoration beside the token amounts, so a price a minute
 * old is far better than a dash, and nothing is decided by it.
 */
export const TERMS_PRICE_FRESHNESS_WINDOW_MS = 120_000;

/** Bounds the price lookup so it cannot hold up a plan whose own life is 25 seconds. */
export const TERMS_PRICE_TIMEOUT_MS = 2_500;

/**
 * Multiply a decimal token-amount string by a USD price.
 *
 * `Number()` on the amount is safe in a way it is NOT for the amounts themselves: this result is
 * display-only and never compared, summed or signed against. The exact arithmetic stays in base
 * units where it matters, in `executionVerification`.
 */
export function usdValueOf(tokenAmount: string, usdPrice: number | null): number | null {
  if (usdPrice == null || !Number.isFinite(usdPrice) || usdPrice <= 0) return null;
  const amount = Number(tokenAmount);
  if (!Number.isFinite(amount) || amount < 0) return null;
  const value = amount * usdPrice;
  return Number.isFinite(value) ? value : null;
}

/**
 * The decision, as a pure function: which USD figures these terms get from this snapshot.
 *
 * Split out from the async wrapper for the same reason the reducer is split from its hook — the
 * fixture suite is synchronous and offline, and a rule that can only be exercised through a
 * network call is a rule that gets checked by reading it. A null snapshot (the source failed)
 * and a snapshot that could not price a mint both yield null, because to the reader they are
 * the same thing: we do not know.
 */
export function usdTermsFromSnapshot(
  terms: SwapExecutionTerms,
  snapshot: Parameters<typeof priceOf>[0] | null,
): Pick<SwapExecutionTerms, "inputAmountUsd" | "expectedOutputUsd"> {
  if (snapshot == null) return { inputAmountUsd: null, expectedOutputUsd: null };
  return {
    inputAmountUsd: usdValueOf(terms.inputAmountTokens, priceOf(snapshot, terms.inputMint)),
    expectedOutputUsd: usdValueOf(terms.expectedOutputTokens, priceOf(snapshot, terms.outputMint)),
  };
}

export interface PriceTermsDeps {
  source: PriceSource;
  now?: () => number;
  signal?: AbortSignal;
}

/**
 * Return the terms with both USD sub-lines filled, or unchanged when they cannot be.
 *
 * Never throws and never rejects. The caller offers the plan either way.
 */
export async function priceTerms(
  terms: SwapExecutionTerms,
  deps: PriceTermsDeps,
): Promise<SwapExecutionTerms> {
  const now = deps.now ?? Date.now;
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), TERMS_PRICE_TIMEOUT_MS);
  // An upstream abort (the request went away) must also stop this.
  const onAbort = () => timeout.abort();
  deps.signal?.addEventListener("abort", onAbort, { once: true });

  try {
    const snapshot = await resolvePriceSnapshot(
      [terms.inputMint, terms.outputMint],
      deps.source,
      timeout.signal,
      now(),
      TERMS_PRICE_FRESHNESS_WINDOW_MS,
    );
    return { ...terms, ...usdTermsFromSnapshot(terms, snapshot) };
  } catch {
    // Including the abort. Unpriced is a state the sheet already renders honestly.
    return { ...terms, ...usdTermsFromSnapshot(terms, null) };
  } finally {
    clearTimeout(timer);
    deps.signal?.removeEventListener("abort", onAbort);
  }
}
