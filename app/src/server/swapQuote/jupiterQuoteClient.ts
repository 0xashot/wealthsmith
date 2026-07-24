/**
 * jupiterQuoteClient — Step 23B (SERVER-ONLY). Live Jupiter Swap V2 meta-aggregator, QUOTE-ONLY. It requests a
 * quote/order WITHOUT a taker wallet, so the response carries NO transaction. It never calls build/execute/swap,
 * never simulates, never signs, and never persists an execution request id. RFQ routes are detected and excluded
 * under the unapproved-RFQ policy. Any transaction-bearing payload is rejected (blocked_transaction), not stripped.
 * The raw response never leaves this module — only a normalized `SwapQuoteCandidate` (via the 23A normalizer).
 */
import type { LiveSwapQuoteProvider, ProviderQuoteRequest, ProviderRequestContext, ProviderQuoteResult, ProviderRouteLeg } from "./providerContracts";
import { normalizeJupiterQuote, type JupiterRawQuote } from "../../suggestions/swapQuote/swapQuoteNormalization";
import { scanForTransactionFields } from "../../suggestions/swapQuote/swapQuoteSecurityGuard";

function classifyLeg(label: string | undefined): ProviderRouteLeg["legKind"] {
  const l = (label ?? "").toLowerCase();
  if (/rfq/.test(l)) return "rfq";
  if (/clmm|whirlpool|concentrated/.test(l)) return "clmm_pool";
  if (l.length > 0) return "amm_pool";
  return "unresolved";
}

/** Extract auditable route legs from Jupiter's routePlan (poolId = ammKey, venue = label). */
function extractRouteLegs(raw: JupiterRawQuote): ProviderRouteLeg[] {
  return (raw.routePlan ?? []).map((r) => ({
    poolId: r.swapInfo?.ammKey ?? "",
    venue: r.swapInfo?.label ?? "unknown",
    legKind: classifyLeg(r.swapInfo?.label),
  }));
}

export const jupiterQuoteClient: LiveSwapQuoteProvider = {
  providerId: "jupiter",
  async quoteExactIn(request: ProviderQuoteRequest, context: ProviderRequestContext): Promise<ProviderQuoteResult> {
    const started = context.requestStartMs;
    const latency = () => Math.max(0, Date.now() - started);
    if (!context.config.configured || !context.config.quoteEndpoint) return { kind: "unavailable", reasonCode: context.config.missingConfigReasons[0] ?? "not_configured", latencyMs: latency() };
    const fetchImpl = context.fetchImpl ?? fetch;
    // Quote-only: exact-in, no taker, no transaction. Never request instructions/swap/execute.
    const url = new URL(context.config.quoteEndpoint);
    url.searchParams.set("inputMint", request.inputMint);
    url.searchParams.set("outputMint", request.outputMint);
    url.searchParams.set("amount", request.inputAmountRaw);
    url.searchParams.set("slippageBps", String(request.slippageBps));
    url.searchParams.set("swapMode", "ExactIn");
    url.searchParams.set("onlyDirectRoutes", "false");

    let raw: unknown;
    try {
      const res = await fetchImpl(url.toString(), { signal: context.signal, headers: { accept: "application/json" } });
      if (!res.ok) {
        if (res.status === 404 || res.status === 422) return { kind: "no_route", latencyMs: latency() };
        return { kind: "unavailable", reasonCode: `http_${res.status}`, latencyMs: latency() };
      }
      try {
        raw = await res.json();
      } catch {
        return { kind: "malformed", latencyMs: latency() };
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return { kind: "timeout", latencyMs: latency() };
      return { kind: "unavailable", reasonCode: "transport_error", latencyMs: latency() };
    }

    // Reject transaction-bearing payloads rather than silently dropping them.
    if (!scanForTransactionFields(raw).clean) return { kind: "blocked_transaction", latencyMs: latency() };
    const q = raw as JupiterRawQuote & { error?: string; routerName?: string };
    if (typeof q.error === "string" && /no.?route/i.test(q.error)) return { kind: "no_route", latencyMs: latency() };
    if (!q.outAmount) return { kind: "no_route", latencyMs: latency() };

    const routeLegs = extractRouteLegs(q);
    // RFQ detection: an explicit RFQ router or any RFQ route leg. Excluded downstream under SWAP_RFQ_POLICY.
    if (/rfq/i.test(q.routerName ?? "") && routeLegs.every((l) => l.legKind !== "rfq")) routeLegs.push({ poolId: "rfq", venue: q.routerName ?? "RFQ", legKind: "rfq" });

    const candidate = normalizeJupiterQuote(q, new Date(request.comparedAtMs).toISOString(), {
      ctx: { inputMint: request.inputMint, outputMint: request.outputMint, inputDecimals: request.inputDecimals, outputDecimals: request.outputDecimals, inputAmountRaw: request.inputAmountRaw, outputUnitPriceUsd: request.outputUnitPriceUsd, comparedAtMs: request.comparedAtMs },
    });
    if (candidate.exclusionReasons.includes("normalization_failed")) return { kind: "normalization_failed", latencyMs: latency() };
    return { kind: "success", candidate: { ...candidate, quoteLatencyMs: latency() }, routeLegs, latencyMs: latency() };
  },
};
