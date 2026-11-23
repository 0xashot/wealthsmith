/**
 * swapQuoteOrchestrator — Step 23B (SERVER-ONLY). The fixed-snapshot comparison orchestrator. Over ONE immutable
 * `SwapActionContext` it: validates the action; resolves the approved pair class + a single shared USD price
 * snapshot; fires Jupiter/Raydium/Orca concurrently over the exact same pair/amount/slippage/window; enforces the
 * Step-23A per-provider + overall timeouts and bounded retry; resolves fresh per-leg liquidity; normalizes via the
 * 23A normalizers; runs the 23A eligibility + ranking (`compareSwapQuotes`); sanitizes; and caches ONLY the safe
 * assessment. It never mutates the action, never touches a suggestion, and never returns a raw payload.
 */
import type { SwapActionContext, SwapQuoteCandidate, SwapQuoteComparisonAssessment, SwapProviderId, SwapPlanQuoteSummary } from "../../suggestions/swapQuote/swapQuoteContracts";
import { APPROVED_SWAP_PROVIDER_IDS } from "../../suggestions/swapQuote/swapQuoteContracts";
import { compareSwapQuotes, notReadyComparison, summarizeSwapPlan } from "../../suggestions/swapQuote/swapQuoteComparison";
import { classifySwapPair } from "../../suggestions/swapQuote/swapPairRegistry";
import { DEFAULT_SWAP_QUOTE_POLICY, type SwapQuotePolicy } from "../../suggestions/swapQuote/swapQuotePolicy";
import { normalizationFailedCandidate, type SwapQuoteSnapshotContext } from "../../suggestions/swapQuote/swapQuoteNormalization";
import { rawToUsd, isRawIntegerString } from "../../suggestions/swapQuote/swapAmountMath";
import type { LiveSwapQuoteProvider, ProviderQuoteRequest, ProviderQuoteResult, ProviderRequestContext } from "./providerContracts";
import { resolveProviderConfig, nodeEnvReader, type EnvReader } from "./providerConfig";
import { jupiterQuoteClient } from "./jupiterQuoteClient";
import { raydiumQuoteClient } from "./raydiumQuoteClient";
import { orcaQuoteClient } from "./orcaQuoteClient";
import { resolvePriceSnapshot, priceOf, type PriceSource } from "./priceSnapshot";
import { resolveRouteLiquidity, type PoolLiquiditySource } from "./liquidityResolver";
import { SwapQuoteCache, buildCacheKey } from "./swapQuoteCache";
import { sanitizeAssessment } from "./responseSanitizer";
import { safeActionKeyHash, noopTelemetrySink, type TelemetrySink, type ProviderTelemetry } from "./swapQuoteLogging";
import type { RpcReadClient } from "./providerContracts";

export interface SwapQuoteOrchestratorOptions {
  slippageBps: number;
  priceSource: PriceSource;
  liquiditySource: PoolLiquiditySource;
  providers?: Partial<Record<SwapProviderId, LiveSwapQuoteProvider>>;
  policy?: SwapQuotePolicy;
  env?: EnvReader;
  now?: () => number;
  cache?: SwapQuoteCache;
  telemetry?: TelemetrySink;
  fetchImpl?: typeof fetch;
  rpcRead?: RpcReadClient;
}

const DEFAULT_PROVIDERS: Record<SwapProviderId, LiveSwapQuoteProvider> = { jupiter: jupiterQuoteClient, raydium: raydiumQuoteClient, orca: orcaQuoteClient };

/** Map a non-success provider outcome to a failed candidate with the categorizing exclusion reason. */
function failedCandidate(providerId: SwapProviderId, ctx: SwapQuoteSnapshotContext, result: Exclude<ProviderQuoteResult, { kind: "success" }>): SwapQuoteCandidate {
  const base = normalizationFailedCandidate(providerId, ctx, "normalization_failed");
  const reason = result.kind === "no_route" ? "no_route"
    : result.kind === "timeout" ? "quote_timeout"
    : result.kind === "unavailable" ? "provider_unavailable"
    : "normalization_failed"; // malformed / normalization_failed / blocked_transaction
  return { ...base, exclusionReasons: [reason] };
}

/** Run one provider with a per-provider timeout + bounded retry (policy). Never throws. */
async function runProvider(provider: LiveSwapQuoteProvider, request: ProviderQuoteRequest, makeContext: (signal: AbortSignal) => ProviderRequestContext, timeoutMs: number, maxRetries: number, overallSignal: AbortSignal, now: () => number): Promise<ProviderQuoteResult> {
  let attempt = 0;
  let last: ProviderQuoteResult = { kind: "timeout", latencyMs: 0 };
  while (attempt <= maxRetries) {
    const controller = new AbortController();
    const onOverallAbort = () => controller.abort();
    overallSignal.addEventListener("abort", onOverallAbort, { once: true });
    const started = now();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const ctx = makeContext(controller.signal);
      last = await Promise.race<ProviderQuoteResult>([
        provider.quoteExactIn(request, ctx),
        new Promise<ProviderQuoteResult>((resolve) => {
          controller.signal.addEventListener("abort", () => resolve({ kind: "timeout", latencyMs: Math.max(0, now() - started) }), { once: true });
        }),
      ]);
    } catch {
      last = { kind: "unavailable", reasonCode: "provider_threw", latencyMs: Math.max(0, now() - started) };
    } finally {
      clearTimeout(timer);
      overallSignal.removeEventListener("abort", onOverallAbort);
    }
    // Retry only transient failures (timeout / unavailable), bounded by policy.
    if ((last.kind === "timeout" || last.kind === "unavailable") && attempt < maxRetries) {
      attempt++;
      continue;
    }
    break;
  }
  return last;
}

/**
 * Compare live quotes for ONE action leg. Returns a sanitized assessment for the EXACT action key it received
 * (stale/older responses can never overwrite a newer comparison because each call is keyed by the immutable action
 * + comparisonId and validated before returning).
 */
export async function collectSwapQuoteSnapshot(action: SwapActionContext, options: SwapQuoteOrchestratorOptions): Promise<SwapQuoteComparisonAssessment> {
  const now = options.now ?? (() => Date.now());
  const policy = options.policy ?? DEFAULT_SWAP_QUOTE_POLICY;
  const env = options.env ?? nodeEnvReader;
  const comparedAtMs = now();
  const comparisonId = `${action.legId}@${comparedAtMs}`;

  // 1. Validate the immutable action.
  if (!action.inputAsset?.mint || !action.outputAsset?.mint || !isRawIntegerString(action.inputAmountRaw) || BigInt(action.inputAmountRaw) <= 0n) {
    return notReadyComparison(action.actionId, action.legId, "not_ready_for_quote", ["invalid_action_context"], comparedAtMs);
  }
  const pairClass = classifySwapPair(action.inputAsset.mint, action.outputAsset.mint);

  // 2. Cache lookup (keyed by immutable action + policy versions — no profile data).
  const cacheKey = buildCacheKey({ inputMint: action.inputAsset.mint, outputMint: action.outputAsset.mint, inputAmountRaw: action.inputAmountRaw, slippageBps: options.slippageBps });
  if (options.cache) {
    const hit = options.cache.get(cacheKey);
    if (hit) return hit;
  }

  // 3. Shared USD price snapshot (mint-aware, one per comparison).
  const overall = new AbortController();
  const overallTimer = setTimeout(() => overall.abort(), policy.operational.comparisonTimeoutMs);
  try {
    const snapshot = await resolvePriceSnapshot([action.inputAsset.mint, action.outputAsset.mint], options.priceSource, overall.signal, comparedAtMs, policy.operational.freshnessWindowMs);
    const outputUnitPriceUsd = priceOf(snapshot, action.outputAsset.mint);
    const inputUnitPriceUsd = priceOf(snapshot, action.inputAsset.mint);
    const inputAmountUsd = inputUnitPriceUsd != null ? rawToUsd(action.inputAmountRaw, action.inputAsset.decimals, inputUnitPriceUsd) : null;

    const request: ProviderQuoteRequest = {
      inputMint: action.inputAsset.mint,
      outputMint: action.outputAsset.mint,
      inputDecimals: action.inputAsset.decimals,
      outputDecimals: action.outputAsset.decimals,
      inputAmountRaw: action.inputAmountRaw,
      slippageBps: options.slippageBps,
      comparisonId,
      comparedAtMs,
      outputUnitPriceUsd,
    };
    const ctxTemplate: SwapQuoteSnapshotContext = { inputMint: request.inputMint, outputMint: request.outputMint, inputDecimals: request.inputDecimals, outputDecimals: request.outputDecimals, inputAmountRaw: request.inputAmountRaw, outputUnitPriceUsd, comparedAtMs };
    const providers = { ...DEFAULT_PROVIDERS, ...(options.providers ?? {}) };

    // 4. Fire all three concurrently over the SAME snapshot; isolate failures per provider.
    const telemetry: ProviderTelemetry[] = [];
    const results = await Promise.all(
      APPROVED_SWAP_PROVIDER_IDS.map(async (pid): Promise<SwapQuoteCandidate> => {
        const provider = providers[pid];
        const makeContext = (signal: AbortSignal): ProviderRequestContext => ({ signal, fetchImpl: options.fetchImpl, rpcRead: options.rpcRead, config: resolveProviderConfig(pid, env), requestStartMs: now() });
        const result = await runProvider(provider, request, makeContext, policy.operational.providerTimeoutMs, policy.operational.maxRetriesPerProvider, overall.signal, now);
        if (result.kind === "success") {
          // 5. Resolve fresh per-leg liquidity and attach it to the candidate.
          // Jupiter aggregates across venues; Raydium and Orca quote their own pools, so an unreadable leg
          // there is a real failure rather than a source-coverage gap. See SWAP_AGGREGATOR_POLICY.
          const liquidityAssessment = await resolveRouteLiquidity(result.routeLegs, options.liquiditySource, overall.signal, comparedAtMs, policy.operational.freshnessWindowMs, { aggregatorRoute: pid === "jupiter" });
          const candidate: SwapQuoteCandidate = { ...result.candidate, liquidityAssessment };
          telemetry.push({ providerId: pid, outcome: "success", latencyMs: result.latencyMs, eligible: false, exclusionReasons: [] });
          return candidate;
        }
        telemetry.push({ providerId: pid, outcome: result.kind, latencyMs: result.latencyMs, eligible: false, exclusionReasons: [] });
        return failedCandidate(pid, ctxTemplate, result);
      }),
    );

    // 6. Eligibility + ranking over the fixed snapshot (Step-23A engine).
    const assessment = compareSwapQuotes({
      actionId: action.actionId,
      legId: action.legId,
      inputAsset: action.inputAsset,
      outputAsset: action.outputAsset,
      requestedInputAmountRaw: action.inputAmountRaw,
      inputAmountUsd,
      candidates: results,
      comparedAtMs,
      policy,
      pairClass,
    });

    // 7. Sanitize (reject any transaction/credential field), then cache the SAFE assessment only.
    const safe = sanitizeAssessment(assessment);
    if (options.cache) {
      const priceExpiry = snapshot.observedAtMs + policy.operational.freshnessWindowMs;
      const liquidityExpiry = comparedAtMs + policy.operational.freshnessWindowMs;
      const quoteExpiry = safe.expiresAt ? Date.parse(safe.expiresAt) : null;
      options.cache.set(cacheKey, safe, [quoteExpiry, liquidityExpiry, priceExpiry]);
    }

    // 8. Telemetry (sanitized; never raw payloads / creds / profile).
    const sink: TelemetrySink = options.telemetry ?? noopTelemetrySink;
    const enriched = telemetry.map((t) => {
      const c = results.find((r) => r.providerId === t.providerId);
      return c ? { ...t, eligible: c.eligible, exclusionReasons: c.exclusionReasons } : t;
    });
    sink({ comparisonId, actionKeyHash: safeActionKeyHash(cacheKey), status: safe.status, selectedProviderId: safe.selectedProviderId, providers: enriched, policyVersion: policy.version, comparedAtMs });

    return safe;
  } finally {
    clearTimeout(overallTimer);
  }
}

/** Public alias matching the spec's requested entry name. */
export const compareLiveSwapQuotes = collectSwapQuoteSnapshot;

/** Multi-leg orchestrator (multi-source Rebalance): compare each leg independently, then summarize the plan. */
export async function collectSwapPlanSnapshot(actionId: string, legs: SwapActionContext[], options: SwapQuoteOrchestratorOptions): Promise<SwapPlanQuoteSummary> {
  const legAssessments = await Promise.all(legs.map((leg) => collectSwapQuoteSnapshot(leg, options)));
  return summarizeSwapPlan(actionId, legAssessments);
}
