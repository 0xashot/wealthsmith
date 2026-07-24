/**
 * orcaQuoteClient — Step 23B (SERVER-ONLY). Read-only Orca Whirlpools QUOTE adapter. It resolves the approved
 * Whirlpool for the exact pair, reads its on-chain account state via an approved server-only RPC (bounded,
 * read-only), and computes an exact-input quote via an injected `WhirlpoolQuoteComputer`. It constructs NO
 * instructions, NO transaction, NO signer, and NEVER submits or simulates. No approved Whirlpool / no computable
 * route → `no_route` (never a system failure). RPC unavailable → `unavailable`. Transaction-bearing compute
 * output is rejected.
 *
 * Injecting the computer keeps the module import-safe (no heavy SDK at load) and fully deterministic under test.
 * The default computer returns null (→ no_route) and documents that the real @orca-so/whirlpools-core computation
 * is wired only when an approved RPC + registry are configured.
 */
import type { LiveSwapQuoteProvider, ProviderQuoteRequest, ProviderRequestContext, ProviderQuoteResult, ProviderRouteLeg } from "./providerContracts";
import { normalizeOrcaQuote, type OrcaRawQuote } from "../../suggestions/swapQuote/swapQuoteNormalization";
import { scanForTransactionFields } from "../../suggestions/swapQuote/swapQuoteSecurityGuard";
import { resolveApprovedWhirlpool } from "./orcaWhirlpoolRegistry";

/** Reads approved Whirlpool account state + computes an exact-in quote. Read-only; returns raw quote or null. */
export type WhirlpoolQuoteComputer = (input: {
  whirlpoolId: string;
  accountData: Uint8Array;
  request: ProviderQuoteRequest;
}) => OrcaRawQuote | null;

/** Default computer: not wired to the SDK here → no computable route (reported honestly as no_route). */
export const defaultWhirlpoolQuoteComputer: WhirlpoolQuoteComputer = () => null;

export function createOrcaQuoteClient(deps: { compute?: WhirlpoolQuoteComputer } = {}): LiveSwapQuoteProvider {
  const compute = deps.compute ?? defaultWhirlpoolQuoteComputer;
  return {
    providerId: "orca",
    async quoteExactIn(request: ProviderQuoteRequest, context: ProviderRequestContext): Promise<ProviderQuoteResult> {
      const started = context.requestStartMs;
      const latency = () => Math.max(0, Date.now() - started);
      if (!context.config.configured || !context.config.rpcEndpoint || !context.rpcRead) return { kind: "unavailable", reasonCode: context.config.missingConfigReasons[0] ?? "rpc_not_configured", latencyMs: latency() };

      const pool = resolveApprovedWhirlpool(request.inputMint, request.outputMint);
      if (!pool) return { kind: "no_route", latencyMs: latency() };

      let accountData: Uint8Array | null;
      try {
        accountData = await context.rpcRead.getAccountData(pool.whirlpoolId, context.signal);
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return { kind: "timeout", latencyMs: latency() };
        return { kind: "unavailable", reasonCode: "rpc_error", latencyMs: latency() };
      }
      if (!accountData) return { kind: "unavailable", reasonCode: "rpc_no_account", latencyMs: latency() };

      let rawQuote: OrcaRawQuote | null;
      try {
        rawQuote = compute({ whirlpoolId: pool.whirlpoolId, accountData, request });
      } catch {
        return { kind: "malformed", latencyMs: latency() };
      }
      if (!rawQuote) return { kind: "no_route", latencyMs: latency() };
      if (!scanForTransactionFields(rawQuote).clean) return { kind: "blocked_transaction", latencyMs: latency() };

      const routeLegs: ProviderRouteLeg[] = [{ poolId: pool.whirlpoolId, venue: "Orca Whirlpool", legKind: "clmm_pool" }];
      const candidate = normalizeOrcaQuote({ ...rawQuote, whirlpoolAddress: pool.whirlpoolId }, new Date(request.comparedAtMs).toISOString(), {
        ctx: { inputMint: request.inputMint, outputMint: request.outputMint, inputDecimals: request.inputDecimals, outputDecimals: request.outputDecimals, inputAmountRaw: request.inputAmountRaw, outputUnitPriceUsd: request.outputUnitPriceUsd, comparedAtMs: request.comparedAtMs },
      });
      if (candidate.exclusionReasons.includes("normalization_failed")) return { kind: "normalization_failed", latencyMs: latency() };
      return { kind: "success", candidate: { ...candidate, quoteLatencyMs: latency() }, routeLegs, latencyMs: latency() };
    },
  };
}

/** The default Orca client (SDK computer not wired here → live Orca needs an approved RPC + computer injection). */
export const orcaQuoteClient: LiveSwapQuoteProvider = createOrcaQuoteClient();
