/**
 * raydiumQuoteClient — Step 23B (SERVER-ONLY). Live Raydium exact-input QUOTE-ONLY (compute) path. It requests
 * only the swap COMPUTATION — never transaction construction, serialized transaction data, or signing
 * instructions, and it submits nothing. Raydium is its own execution surface; underlying venues identify the
 * actual Raydium pools used. A no-route response is returned as such (never a global comparison failure), and any
 * transaction-bearing payload is rejected.
 */
import type { LiveSwapQuoteProvider, ProviderQuoteRequest, ProviderRequestContext, ProviderQuoteResult, ProviderRouteLeg } from "./providerContracts";
import { normalizeRaydiumQuote, type RaydiumRawQuote } from "../../suggestions/swapQuote/swapQuoteNormalization";
import { scanForTransactionFields } from "../../suggestions/swapQuote/swapQuoteSecurityGuard";

interface RaydiumComputeResponse {
  success?: boolean;
  data?: RaydiumRawQuote & { routePlan?: Array<{ poolId?: string; ammLabel?: string; type?: string }>; };
  msg?: string;
}

function classifyLeg(type: string | undefined, label: string | undefined): ProviderRouteLeg["legKind"] {
  const s = `${type ?? ""} ${label ?? ""}`.toLowerCase();
  if (/concentrated|clmm/.test(s)) return "clmm_pool";
  return "amm_pool";
}

export const raydiumQuoteClient: LiveSwapQuoteProvider = {
  providerId: "raydium",
  async quoteExactIn(request: ProviderQuoteRequest, context: ProviderRequestContext): Promise<ProviderQuoteResult> {
    const started = context.requestStartMs;
    const latency = () => Math.max(0, Date.now() - started);
    if (!context.config.configured || !context.config.quoteEndpoint) return { kind: "unavailable", reasonCode: context.config.missingConfigReasons[0] ?? "not_configured", latencyMs: latency() };
    const fetchImpl = context.fetchImpl ?? fetch;
    const url = new URL(context.config.quoteEndpoint);
    url.searchParams.set("inputMint", request.inputMint);
    url.searchParams.set("outputMint", request.outputMint);
    url.searchParams.set("amount", request.inputAmountRaw);
    url.searchParams.set("slippageBps", String(request.slippageBps));
    url.searchParams.set("txVersion", "V0"); // compute-only; NO transaction is requested from this endpoint

    let body: unknown;
    try {
      const res = await fetchImpl(url.toString(), { signal: context.signal, headers: { accept: "application/json" } });
      if (!res.ok) {
        if (res.status === 404) return { kind: "no_route", latencyMs: latency() };
        return { kind: "unavailable", reasonCode: `http_${res.status}`, latencyMs: latency() };
      }
      try {
        body = await res.json();
      } catch {
        return { kind: "malformed", latencyMs: latency() };
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return { kind: "timeout", latencyMs: latency() };
      return { kind: "unavailable", reasonCode: "transport_error", latencyMs: latency() };
    }

    if (!scanForTransactionFields(body).clean) return { kind: "blocked_transaction", latencyMs: latency() };
    const resp = body as RaydiumComputeResponse;
    const data = resp.data;
    if (resp.success === false || !data) return { kind: /no.?route/i.test(resp.msg ?? "") ? "no_route" : "unavailable", reasonCode: "compute_failed", latencyMs: latency() } as ProviderQuoteResult;
    if (!data.outputAmount) return { kind: "no_route", latencyMs: latency() };

    const plan = (data.routePlan ?? []) as Array<{ poolId?: string; ammLabel?: string; type?: string }>;
    const routeLegs: ProviderRouteLeg[] = plan.map((r) => ({
      poolId: r.poolId ?? "",
      venue: r.ammLabel ?? "Raydium",
      legKind: classifyLeg(r.type, r.ammLabel),
    }));

    const candidate = normalizeRaydiumQuote(data, new Date(request.comparedAtMs).toISOString(), {
      ctx: { inputMint: request.inputMint, outputMint: request.outputMint, inputDecimals: request.inputDecimals, outputDecimals: request.outputDecimals, inputAmountRaw: request.inputAmountRaw, outputUnitPriceUsd: request.outputUnitPriceUsd, comparedAtMs: request.comparedAtMs },
    });
    if (candidate.exclusionReasons.includes("normalization_failed")) return { kind: "normalization_failed", latencyMs: latency() };
    return { kind: "success", candidate: { ...candidate, quoteLatencyMs: latency() }, routeLegs, latencyMs: latency() };
  },
};
