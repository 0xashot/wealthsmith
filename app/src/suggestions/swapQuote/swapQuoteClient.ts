/**
 * swapQuoteClient — Step 23C. The BROWSER-SAFE client adapter. It talks ONLY to the WealthSmith endpoint
 * (`/api/swap-quote`, dev proxy → local service; prod → `VITE_SWAP_QUOTE_API_BASE`). It never imports a provider
 * client, never calls Jupiter/Raydium/Orca directly, never receives credentials/RPC/raw payloads, and never
 * builds a transaction. It validates the sanitized response shape and REJECTS a malformed or transaction-bearing
 * response client-side as defense in depth.
 */
import type { SwapActionContext, SwapQuoteComparisonAssessment, SwapComparisonStatus } from "./swapQuoteContracts";
import { scanForTransactionFields } from "./swapQuoteSecurityGuard";

export type SwapQuoteClientResult =
  | { ok: true; assessment: SwapQuoteComparisonAssessment }
  | { ok: false; error: "unavailable" | "invalid_response" | "transaction_in_response" | "aborted" | "http_error" };

const VALID_STATUSES: readonly SwapComparisonStatus[] = ["selected", "partial_comparison", "only_route_available", "no_valid_route", "not_ready_for_quote", "not_required", "unresolved"];

/** Resolve the WealthSmith API base. Empty (same-origin) in dev → the Vite proxy forwards /api/swap-quote. */
export function resolveApiBase(): string {
  try {
    const base = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SWAP_QUOTE_API_BASE;
    return typeof base === "string" ? base.replace(/\/$/, "") : "";
  } catch {
    return "";
  }
}

/** A stable per-leg request key (immutable action identity + amount + slippage). */
export function swapQuoteRequestKey(action: SwapActionContext, slippageBps: number): string {
  return `${action.legId}|${action.inputAsset.mint}|${action.outputAsset.mint}|${action.inputAmountRaw}|${slippageBps}`;
}

/** Validate a sanitized assessment shape (defensive) — rejects wrong shape or any transaction-bearing field. */
export function validateSanitizedAssessment(body: unknown): SwapQuoteComparisonAssessment | null {
  if (body == null || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.status !== "string" || !VALID_STATUSES.includes(b.status as SwapComparisonStatus)) return null;
  if (typeof b.methodologyVersion !== "string" || !Array.isArray(b.candidates)) return null;
  if (!scanForTransactionFields(body).clean) return null; // client-side defense in depth
  return body as SwapQuoteComparisonAssessment;
}

export interface FetchSwapQuoteOptions {
  slippageBps?: number;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  apiBase?: string;
}

/**
 * Request a sanitized comparison for one immutable action leg. Browser-safe: posts only the exact
 * category/mints/decimals/amount/slippage — never wallet/profile/URL fields.
 */
export async function fetchSwapQuoteComparison(action: SwapActionContext, opts: FetchSwapQuoteOptions = {}): Promise<SwapQuoteClientResult> {
  const slippageBps = opts.slippageBps ?? 50;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const base = opts.apiBase ?? resolveApiBase();
  const body = {
    category: action.suggestionCategory,
    suggestionId: action.suggestionId,
    inputSymbol: action.inputAsset.symbol,
    outputSymbol: action.outputAsset.symbol,
    inputMint: action.inputAsset.mint,
    outputMint: action.outputAsset.mint,
    inputDecimals: action.inputAsset.decimals,
    outputDecimals: action.outputAsset.decimals,
    inputAmountRaw: action.inputAmountRaw,
    slippageBps,
  };
  try {
    const res = await fetchImpl(`${base}/api/swap-quote`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: opts.signal });
    if (res.status === 503) return { ok: false, error: "unavailable" };
    if (!res.ok) return { ok: false, error: "http_error" };
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      return { ok: false, error: "invalid_response" };
    }
    if (json != null && typeof json === "object" && "error" in (json as object)) return { ok: false, error: "unavailable" };
    const assessment = validateSanitizedAssessment(json);
    if (!assessment) {
      // Distinguish a transaction-bearing response from a merely-malformed one (both are refused).
      if (json != null && typeof json === "object" && !scanForTransactionFields(json).clean) return { ok: false, error: "transaction_in_response" };
      return { ok: false, error: "invalid_response" };
    }
    return { ok: true, assessment };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") return { ok: false, error: "aborted" };
    return { ok: false, error: "unavailable" };
  }
}

/** A fetcher signature the UI depends on (real client by default; the /testing gallery injects a mock). */
export type SwapQuoteFetcher = (action: SwapActionContext, opts: FetchSwapQuoteOptions) => Promise<SwapQuoteClientResult>;
