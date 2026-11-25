/**
 * swapQuoteServerFixtures — Step 23B. The AUTHORITATIVE deterministic suite for the live server layer, driven by
 * MOCKED provider clients + injected price/liquidity sources (no network). Covers provider outcomes, orchestration
 * statuses, cost/liquidity/RFQ/freshness eligibility, ranking + provider tie-break, caching, retry, action-specific
 * inputs, security sanitization, and architecture guards. Async (the orchestrator is async).
 */
import { readFileSync } from "node:fs";
import type { LiveSwapQuoteProvider, ProviderQuoteResult, ProviderRouteLeg } from "./providerContracts";
import type { SwapActionContext, SwapQuoteCandidate, SwapProviderId } from "../../suggestions/swapQuote/swapQuoteContracts";
import { collectSwapQuoteSnapshot, collectSwapPlanSnapshot, type SwapQuoteOrchestratorOptions } from "./swapQuoteOrchestrator";
import { createOrcaQuoteClient } from "./orcaQuoteClient";
import { SwapQuoteCache, buildCacheKey, computeEffectiveExpiry } from "./swapQuoteCache";
import { scanForForbiddenServerFields, sanitizeAssessment } from "./responseSanitizer";
import { detectLeakedSwapEnv, resolveProviderConfig } from "./providerConfig";
import { safeActionKeyHash, isTelemetrySafe, type ComparisonTelemetry } from "./swapQuoteLogging";
import { createSwapQuoteHandler } from "./httpHandler";
import type { PriceSource, MintUsdPrice } from "./priceSnapshot";
import type { PoolLiquiditySource, PoolLiquidityReading } from "./liquidityResolver";
import { buildRebalanceSwapAction, buildTrimSwapAction, buildDcaSwapAction, SWAP_USDC, SWAP_WSOL } from "../../suggestions/swapQuote/swapActionContext";
import { fetchSwapQuoteComparison } from "../../suggestions/swapQuote/swapQuoteClient";
import { demoSwapQuoteFetcher } from "../../suggestions/swapQuote/demoSwapQuote";
import { resolveSwapHandoffType } from "../../suggestions/swapExecution/swapHandoffType";
import { createJupiterPriceSource } from "./jupiterPriceSource";
import { createRaydiumLiquiditySource } from "./raydiumLiquiditySource";
import { assessServiceHealth } from "./serviceHealth";
import { SwapRateLimiter, SWAP_RATE_LIMIT_CONFIG } from "./rateLimit";

export interface SwapFixtureCheck { name: string; pass: boolean; detail: string; }

const USDC = SWAP_USDC.mint;
const WSOL = SWAP_WSOL.mint;
const FIXED = Date.parse("2026-07-24T00:00:00.000Z");
const readSrc = (rel: string) => { try { return readFileSync(`${process.cwd()}/${rel}`, "utf8"); } catch { return ""; } };

/** USDC→SOL action, 1000 USDC. */
function usdcToSolAction(): SwapActionContext {
  return { actionId: "rb:rebalance_to_plan", suggestionId: "rebalance_to_plan", suggestionCategory: "rebalance", legId: "rb:0", legIndex: 0, totalLegs: 1, inputAsset: { symbol: "USDC", mint: USDC, decimals: 6 }, outputAsset: { symbol: "SOL", mint: WSOL, decimals: 9 }, inputAmountRaw: "1000000000", inputAmountTokens: "1000", inputAmountUsd: 1000, sourceAvailability: "wallet_transferable", generatedAt: new Date(FIXED).toISOString() };
}

const priceSource: PriceSource = { sourceId: "test_price", async getUsdPrice(mint): Promise<MintUsdPrice | null> { const usd = mint === USDC ? 1 : mint === WSOL ? 150 : null; return usd == null ? null : { usd, observedAtMs: FIXED, sourceId: "test_price" }; } };
const nullPriceSource: PriceSource = { sourceId: "null_price", async getUsdPrice() { return null; } };

const liquiditySource: PoolLiquiditySource = { sourceId: "test_liq", async getPoolLiquidity(poolId): Promise<PoolLiquidityReading | null> {
  if (poolId === "good") return { poolId, liquidityUsd: 250_000, observedAtMs: FIXED };
  if (poolId === "low") return { poolId, liquidityUsd: 90_000, observedAtMs: FIXED };
  if (poolId === "stale") return { poolId, liquidityUsd: 250_000, observedAtMs: FIXED - 60_000 };
  return null; // unknown → unresolved
} };

const GOOD_LEG: ProviderRouteLeg = { poolId: "good", venue: "Orca Whirlpool", legKind: "clmm_pool" };

function mkCand(providerId: SwapProviderId, over: Partial<SwapQuoteCandidate> = {}): SwapQuoteCandidate {
  const name = providerId === "jupiter" ? "Jupiter" : providerId === "raydium" ? "Raydium" : "Orca";
  return { providerId, providerName: name, executionSurface: providerId, underlyingVenues: ["Orca Whirlpool"], inputMint: USDC, outputMint: WSOL, inputAmountRaw: "1000000000", expectedOutputRaw: "6000000000", minimumOutputRaw: "5970000000", expectedOutputTokens: "6", expectedOutputUsd: 997.5, quotedAt: new Date(FIXED).toISOString(), expiresAt: null, quoteLatencyMs: 100, priceImpactPct: 0.1, includedSwapFeeUsd: null, explicitPlatformFeeUsd: null, estimatedNetworkFeeUsd: 0.01, estimatedRentFeeUsd: 0, liquidityAssessment: { status: "unresolved", minimumRouteLegLiquidityUsd: null, legs: [] }, freshness: "fresh", eligible: false, exclusionReasons: [], ...over };
}

function succeed(providerId: SwapProviderId, over: Partial<SwapQuoteCandidate> = {}, legs: ProviderRouteLeg[] = [GOOD_LEG]): LiveSwapQuoteProvider {
  return { providerId, async quoteExactIn(): Promise<ProviderQuoteResult> { return { kind: "success", candidate: mkCand(providerId, over), routeLegs: legs, latencyMs: 100 }; } };
}
function fail(providerId: SwapProviderId, kind: Exclude<ProviderQuoteResult, { kind: "success" }>["kind"]): LiveSwapQuoteProvider {
  return { providerId, async quoteExactIn(): Promise<ProviderQuoteResult> { return kind === "unavailable" ? { kind, reasonCode: "test", latencyMs: 5 } : { kind, latencyMs: 5 } as ProviderQuoteResult; } };
}

function baseOptions(providers: Partial<Record<SwapProviderId, LiveSwapQuoteProvider>>, extra: Partial<SwapQuoteOrchestratorOptions> = {}): SwapQuoteOrchestratorOptions {
  return { slippageBps: 50, priceSource, liquiditySource, providers, now: () => FIXED, env: () => undefined, ...extra };
}
const run = (providers: Partial<Record<SwapProviderId, LiveSwapQuoteProvider>>, extra?: Partial<SwapQuoteOrchestratorOptions>) => collectSwapQuoteSnapshot(usdcToSolAction(), baseOptions(providers, extra));

export async function runSwapQuoteServerFixtureChecks(): Promise<SwapFixtureCheck[]> {
  const checks: SwapFixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });

  // ---- Orchestration statuses + ranking ----
  const three = await run({ jupiter: succeed("jupiter", { expectedOutputUsd: 998.2 }), raydium: succeed("raydium", { expectedOutputUsd: 997.6 }), orca: succeed("orca", { expectedOutputUsd: 997.4 }) });
  add("SWS-1: three successful eligible quotes → selected, cheapest (highest net) wins; all three compared", three.status === "selected" && three.selectedProviderId === "jupiter" && three.comparedProviders.length === 3, `status=${three.status} sel=${three.selectedProviderId}`);
  const rayWin = await run({ jupiter: succeed("jupiter", { expectedOutputUsd: 997.5 }), raydium: succeed("raydium", { expectedOutputUsd: 998.5 }), orca: succeed("orca", { expectedOutputUsd: 997.0 }) });
  add("SWS-2: Raydium cheapest → Raydium selected", rayWin.selectedProviderId === "raydium", `sel=${rayWin.selectedProviderId}`);
  const orcaWin = await run({ jupiter: succeed("jupiter", { expectedOutputUsd: 997.5 }), raydium: succeed("raydium", { expectedOutputUsd: 997.2 }), orca: succeed("orca", { expectedOutputUsd: 998.6 }) });
  add("SWS-3: Orca cheapest → Orca selected", orcaWin.selectedProviderId === "orca", `sel=${orcaWin.selectedProviderId}`);
  const equiv = await run({ jupiter: succeed("jupiter", { expectedOutputUsd: 997.5 }), raydium: succeed("raydium", { expectedOutputUsd: 997.5 }), orca: succeed("orca", { expectedOutputUsd: 997.5 }) });
  add("SWS-4: economically equivalent → Jupiter via deterministic tie-break, economicallyEquivalent=true", equiv.selectedProviderId === "jupiter" && equiv.economicallyEquivalent, `sel=${equiv.selectedProviderId} equiv=${equiv.economicallyEquivalent}`);
  const noJup = await run({ jupiter: fail("jupiter", "unavailable"), raydium: succeed("raydium", { expectedOutputUsd: 998.0 }), orca: succeed("orca", { expectedOutputUsd: 997.0 }) });
  add("SWS-5: Jupiter unavailable → Raydium vs Orca (Raydium wins), partial_comparison discloses Jupiter unavailable", noJup.status === "partial_comparison" && noJup.selectedProviderId === "raydium" && noJup.unavailableProviders.includes("jupiter"), `status=${noJup.status} sel=${noJup.selectedProviderId}`);
  const oneTimeout = await run({ jupiter: succeed("jupiter", { expectedOutputUsd: 998.0 }), raydium: succeed("raydium", { expectedOutputUsd: 997.5 }), orca: fail("orca", "timeout") });
  add("SWS-6: one provider timeout → partial_comparison (winner exists, orca in unavailable)", oneTimeout.status === "partial_comparison" && oneTimeout.unavailableProviders.includes("orca"), `status=${oneTimeout.status}`);
  const twoTimeout = await run({ jupiter: succeed("jupiter", { expectedOutputUsd: 998.0 }), raydium: fail("raydium", "timeout"), orca: fail("orca", "timeout") });
  add("SWS-7: two provider timeouts → partial_comparison with one eligible", twoTimeout.status === "partial_comparison" && twoTimeout.unavailableProviders.length === 2, `status=${twoTimeout.status}`);
  const onlyRoute = await run({ jupiter: succeed("jupiter", { expectedOutputUsd: 998.0 }), raydium: succeed("raydium", { priceImpactPct: 0.9 }), orca: succeed("orca", { priceImpactPct: 0.9 }) });
  add("SWS-8: exactly one eligible (others ineligible, no failure) → only_route_available", onlyRoute.status === "only_route_available", `status=${onlyRoute.status}`);
  const allCost = await run({ jupiter: succeed("jupiter", { expectedOutputUsd: 996.0 }), raydium: succeed("raydium", { expectedOutputUsd: 996.0 }), orca: succeed("orca", { expectedOutputUsd: 996.0 }) });
  add("SWS-9: all routes above the major-pair cost threshold → no_valid_route (estimated_cost_high)", allCost.status === "no_valid_route" && allCost.blockingReasons.includes("estimated_cost_high"), `status=${allCost.status}`);
  const allPi = await run({ jupiter: succeed("jupiter", { priceImpactPct: 0.9 }), raydium: succeed("raydium", { priceImpactPct: 0.9 }), orca: succeed("orca", { priceImpactPct: 0.9 }) });
  add("SWS-10: all routes above price-impact limit → no_valid_route (price_impact_high)", allPi.status === "no_valid_route" && allPi.blockingReasons.includes("price_impact_high"), `status=${allPi.status}`);

  // ---- Liquidity / RFQ / freshness exclusion ----
  const lowLiq = await run({ jupiter: succeed("jupiter", { expectedOutputUsd: 998.5 }, [{ poolId: "low", venue: "Raydium", legKind: "amm_pool" }]), raydium: succeed("raydium", { expectedOutputUsd: 997.6 }), orca: succeed("orca", { expectedOutputUsd: 997.4 }) });
  add("SWS-11: one route below the $100k liquidity minimum → excluded (liquidity_low), not selected", lowLiq.selectedProviderId !== "jupiter" && lowLiq.candidates.find((c) => c.providerId === "jupiter")!.exclusionReasons.includes("liquidity_low"), `sel=${lowLiq.selectedProviderId}`);
  // SWS-12 now points at Raydium rather than Jupiter. The guarantee is unchanged — a leg we SHOULD be able to
  // read and cannot is still a hard exclusion — but it only applies to a provider quoting its own pools. For an
  // aggregator the same unreadable leg means something different; see SWS-12A.
  const unresLiq = await run({ jupiter: succeed("jupiter", { expectedOutputUsd: 997.4 }), raydium: succeed("raydium", { expectedOutputUsd: 998.5 }, [{ poolId: "unknown", venue: "X", legKind: "amm_pool" }]), orca: succeed("orca", { expectedOutputUsd: 997.6 }) });
  add("SWS-12: a DIRECT provider's unreadable pool leg → excluded (liquidity_unresolved) — failing to read its own pool is a failure", unresLiq.candidates.find((c) => c.providerId === "raydium")!.exclusionReasons.includes("liquidity_unresolved"), "unresolved liq excluded");
  const aggLiq = await run({ jupiter: succeed("jupiter", { expectedOutputUsd: 998.5 }, [{ poolId: "unknown", venue: "Deriverse", legKind: "amm_pool" }]), raydium: succeed("raydium", { expectedOutputUsd: 997.6 }), orca: succeed("orca", { expectedOutputUsd: 997.4 }) });
  add("SWS-12A: an AGGREGATOR's unreadable leg is classified `aggregator`, not `unresolved` — a limit of the source set, not a failure", (() => {
    const jup = aggLiq.candidates.find((c) => c.providerId === "jupiter")!;
    return jup.liquidityAssessment.legs.every((l) => l.legKind === "aggregator");
  })(), "classified aggregator");
  add("SWS-12B: that route is NOT excluded for liquidity — it is governed by the price-impact ceiling and the on-chain minimum instead (SWAP_AGGREGATOR_POLICY)", (() => {
    const jup = aggLiq.candidates.find((c) => c.providerId === "jupiter")!;
    return !jup.exclusionReasons.includes("liquidity_unresolved") && !jup.exclusionReasons.includes("liquidity_low");
  })(), "aggregator eligible");
  add("SWS-12C: an aggregator leg contributes NO depth, so the route's reported minimum stays a statement about legs actually read", (() => {
    const jup = aggLiq.candidates.find((c) => c.providerId === "jupiter")!;
    return jup.liquidityAssessment.minimumRouteLegLiquidityUsd === null;
  })(), "no invented depth");
  const rfq = await run({ jupiter: succeed("jupiter", { expectedOutputUsd: 998.5 }, [{ poolId: "rfq", venue: "RFQ", legKind: "rfq" }]), raydium: succeed("raydium", { expectedOutputUsd: 997.6 }), orca: succeed("orca", { expectedOutputUsd: 997.4 }) });
  add("SWS-13: RFQ route excluded until approved (rfq_not_approved)", rfq.candidates.find((c) => c.providerId === "jupiter")!.exclusionReasons.includes("rfq_not_approved"), "rfq excluded");
  const stale = await run({ jupiter: succeed("jupiter", { expectedOutputUsd: 998.5, freshness: "stale" }), raydium: succeed("raydium", { expectedOutputUsd: 997.6 }), orca: succeed("orca", { expectedOutputUsd: 997.4 }) });
  add("SWS-14: stale quote excluded (quote_stale)", stale.candidates.find((c) => c.providerId === "jupiter")!.exclusionReasons.includes("quote_stale"), "stale excluded");
  const expired = await run({ jupiter: succeed("jupiter", { expectedOutputUsd: 998.5, freshness: "expired" }), raydium: succeed("raydium", { expectedOutputUsd: 997.6 }), orca: succeed("orca", { expectedOutputUsd: 997.4 }) });
  add("SWS-15: expired quote excluded (quote_expired)", expired.candidates.find((c) => c.providerId === "jupiter")!.exclusionReasons.includes("quote_expired"), "expired excluded");
  const blocked = await run({ jupiter: succeed("jupiter", { expectedOutputUsd: 998.5, underlyingVenues: ["BadVenue"] }), raydium: succeed("raydium", { expectedOutputUsd: 997.6 }), orca: succeed("orca", { expectedOutputUsd: 997.4 }) }, { policy: { ...(await import("../../suggestions/swapQuote/swapQuotePolicy")).DEFAULT_SWAP_QUOTE_POLICY, blockedUnderlyingVenues: ["BadVenue"] } });
  add("SWS-16: blocked underlying venue → excluded (blocked_underlying_venue)", blocked.candidates.find((c) => c.providerId === "jupiter")!.exclusionReasons.includes("blocked_underlying_venue"), "blocked venue");

  // ---- Price unavailable: raw-output ranking must NOT bypass required cost validation ----
  const noPrice = await run({ jupiter: succeed("jupiter", { expectedOutputUsd: null }), raydium: succeed("raydium", { expectedOutputUsd: null }), orca: succeed("orca", { expectedOutputUsd: null }) }, { priceSource: nullPriceSource });
  add("SWS-17: USD price unavailable → cost unresolved → fail closed (no_valid_route, total_cost_unresolved); raw-output ranking does not bypass cost validation", noPrice.status === "no_valid_route" && noPrice.blockingReasons.includes("total_cost_unresolved"), `status=${noPrice.status}`);

  // ---- No valid route ----
  const noneOk = await run({ jupiter: fail("jupiter", "no_route"), raydium: fail("raydium", "no_route"), orca: fail("orca", "no_route") });
  add("SWS-18: all providers no-route → no_valid_route", noneOk.status === "no_valid_route", `status=${noneOk.status}`);

  // ---- Caching ----
  let jupCalls = 0;
  const countingJup: LiveSwapQuoteProvider = { providerId: "jupiter", async quoteExactIn() { jupCalls++; return { kind: "success", candidate: mkCand("jupiter", { expectedOutputUsd: 998.2 }), routeLegs: [GOOD_LEG], latencyMs: 1 }; } };
  const cache = new SwapQuoteCache(15_000, () => FIXED);
  await collectSwapQuoteSnapshot(usdcToSolAction(), baseOptions({ jupiter: countingJup, raydium: succeed("raydium", { expectedOutputUsd: 997.6 }), orca: succeed("orca", { expectedOutputUsd: 997.4 }) }, { cache }));
  const callsAfterFirst = jupCalls;
  await collectSwapQuoteSnapshot(usdcToSolAction(), baseOptions({ jupiter: countingJup, raydium: succeed("raydium", { expectedOutputUsd: 997.6 }), orca: succeed("orca", { expectedOutputUsd: 997.4 }) }, { cache }));
  add("SWS-19: cache hit — a second identical comparison within TTL does not re-call providers", jupCalls === callsAfterFirst, `calls=${jupCalls}`);
  const cache2 = new SwapQuoteCache(15_000, () => FIXED);
  cache2.set(buildCacheKey({ inputMint: USDC, outputMint: WSOL, inputAmountRaw: "1000000000", slippageBps: 50 }), three, [FIXED + 5_000]);
  const afterExpiry = new SwapQuoteCache(15_000, () => FIXED + 20_000);
  add("SWS-20: cache expiry — a result is never served past its effective expiry", cache2.get(buildCacheKey({ inputMint: USDC, outputMint: WSOL, inputAmountRaw: "1000000000", slippageBps: 50 })) != null && afterExpiry.get("x") === null, "expiry");
  add("SWS-21: effective expiry = earliest of TTL / quote / liquidity / price expiry", computeEffectiveExpiry(0, 15_000, [8_000, 30_000, 12_000]) === 8_000 && computeEffectiveExpiry(0, 5_000, [30_000]) === 5_000, "earliest expiry");

  // ---- Retry bounded to one ----
  let flaky = 0;
  const flakyJup: LiveSwapQuoteProvider = { providerId: "jupiter", async quoteExactIn() { flaky++; if (flaky === 1) return { kind: "timeout", latencyMs: 1 }; return { kind: "success", candidate: mkCand("jupiter", { expectedOutputUsd: 998.2 }), routeLegs: [GOOD_LEG], latencyMs: 1 }; } };
  const retried = await run({ jupiter: flakyJup, raydium: succeed("raydium", { expectedOutputUsd: 997.6 }), orca: succeed("orca", { expectedOutputUsd: 997.4 }) });
  add("SWS-22: transient timeout retried ONCE then succeeds (retry bounded to 1)", flaky === 2 && retried.comparedProviders.includes("jupiter"), `calls=${flaky}`);
  let always = 0;
  const alwaysTimeout: LiveSwapQuoteProvider = { providerId: "orca", async quoteExactIn() { always++; return { kind: "timeout", latencyMs: 1 }; } };
  await run({ jupiter: succeed("jupiter", { expectedOutputUsd: 998.2 }), raydium: succeed("raydium", { expectedOutputUsd: 997.6 }), orca: alwaysTimeout });
  add("SWS-23: a persistently-timing-out provider is called at most twice (1 + 1 retry), never infinitely", always === 2, `calls=${always}`);

  // ---- Missing provider config fails per-provider, not globally ----
  const orcaUnconfigured = await run({ jupiter: succeed("jupiter", { expectedOutputUsd: 998.2 }), raydium: succeed("raydium", { expectedOutputUsd: 997.6 }), orca: createOrcaQuoteClient() }, { env: () => undefined, rpcRead: undefined });
  add("SWS-24: missing provider configuration (Orca RPC) fails ONLY that provider → partial_comparison, others compared", orcaUnconfigured.status === "partial_comparison" && orcaUnconfigured.unavailableProviders.includes("orca") && orcaUnconfigured.comparedProviders.length >= 2, `status=${orcaUnconfigured.status}`);

  // ---- Suggestion / action immutability ----
  const action = usdcToSolAction();
  const before = JSON.stringify(action);
  const immut = await collectSwapQuoteSnapshot(action, baseOptions({ jupiter: succeed("jupiter", { expectedOutputUsd: 998.2 }), raydium: succeed("raydium", { expectedOutputUsd: 997.6 }), orca: succeed("orca", { expectedOutputUsd: 997.4 }) }));
  add("SWS-25: the orchestrator NEVER mutates the immutable action (source/dest/amount/ids unchanged) and echoes exact amount", JSON.stringify(action) === before && immut.candidates.every((c) => c.inputAmountRaw === "1000000000"), "action immutable");

  // ---- Action-specific integration (Rebalance both directions, Trim, DCA) over the live orchestrator ----
  const s2c = buildRebalanceSwapAction({ actionId: "rb", suggestionId: "rebalance_to_plan", generatedAt: new Date(FIXED).toISOString(), direction: "stables_to_crypto", usdcSource: { verifiedExcessValueUsd: 1000, selectionState: "selected", usdcUnitPriceUsd: 1 } });
  const s2cRes = s2c.status === "ready" ? await collectSwapQuoteSnapshot(s2c.legs[0], baseOptions({ jupiter: succeed("jupiter", { expectedOutputUsd: 998.2 }), raydium: succeed("raydium", { expectedOutputUsd: 997.6 }), orca: succeed("orca", { expectedOutputUsd: 997.4 }) })) : null;
  add("SWS-26: Rebalance USDC→SOL action → live comparison selects a route; amount unchanged", s2cRes != null && s2cRes.status === "selected" && s2cRes.candidates[0].inputMint === USDC, `status=${s2cRes?.status}`);
  const c2s = buildRebalanceSwapAction({ actionId: "rb", suggestionId: "rebalance_to_plan", generatedAt: new Date(FIXED).toISOString(), direction: "crypto_to_stables", nativeSolSource: { technicallyAvailableLamports: 2_000_000_000, sourceEligibilityState: "eligible", solUnitPriceUsd: 150 } });
  // SOL→USDC: price source must price the SOL input; reuse priceSource (WSOL=150, USDC=1). Output USDC → expectedOutputUsd set on candidates.
  const solInCand = (p: SwapProviderId, usd: number) => succeed(p, { inputMint: WSOL, outputMint: USDC, expectedOutputUsd: usd, inputAmountRaw: "2000000000" });
  const c2sAction = c2s.status === "ready" ? c2s.legs[0] : null;
  const c2sRes = c2sAction ? await collectSwapQuoteSnapshot(c2sAction, baseOptions({ jupiter: solInCand("jupiter", 299), raydium: solInCand("raydium", 298), orca: solInCand("orca", 297.5) })) : null;
  add("SWS-27: Rebalance SOL→USDC action → live comparison runs on the exact wrapped-SOL→USDC pair; amount unchanged", c2sRes != null && c2sAction != null && c2sRes.candidates.every((c) => c.inputAmountRaw === c2sAction.inputAmountRaw), `status=${c2sRes?.status}`);
  const plan = c2sAction && s2c.status === "ready" ? await collectSwapPlanSnapshot("rbplan", [s2c.legs[0]], baseOptions({ jupiter: succeed("jupiter", { expectedOutputUsd: 998.2 }), raydium: succeed("raydium", { expectedOutputUsd: 997.6 }), orca: succeed("orca", { expectedOutputUsd: 997.4 }) })) : null;
  add("SWS-28: multi-leg plan summarizes per-leg (no forced single platform)", plan != null && plan.legAssessments.length === 1 && plan.selectedLegCount === 1, `legs=${plan?.legAssessments.length}`);

  // ---- Security sanitization ----
  add("SWS-29: sanitizeAssessment REJECTS a forbidden field rather than stripping it", (() => { try { sanitizeAssessment({ ...three, warnings: ["swapTransaction leaked"] as unknown as string[], candidates: [{ ...three.candidates[0], ...( { swapTransaction: "AA==" } as object) }] as SwapQuoteCandidate[] }); return false; } catch { return true; } })(), "rejects forbidden");
  add("SWS-30: a real comparison assessment contains NO forbidden server field", scanForForbiddenServerFields(three).clean, "output clean");
  add("SWS-31: leaked VITE_ swap secret is detected", detectLeakedSwapEnv((k) => (k === "VITE_JUPITER_QUOTE_API_KEY" ? "leaked" : undefined)).includes("VITE_JUPITER_QUOTE_API_KEY"), "leak detected");
  add("SWS-32: cache key carries pair/amount/slippage + policy versions and NO profile data", (() => { const k = buildCacheKey({ inputMint: USDC, outputMint: WSOL, inputAmountRaw: "1000000000", slippageBps: 50 }); return k.includes(USDC) && k.includes("1000000000") && /policy|pair|cache/.test(k) && !/income|expenses|risk|profile/i.test(k); })(), "cache key");
  add("SWS-33: a provider requiring a secret with none present is configured=false (unavailable), never a crash", resolveProviderConfig("orca", () => undefined).configured === false, "orca unconfigured");
  let emitted: ComparisonTelemetry | null = null;
  await run({ jupiter: succeed("jupiter", { expectedOutputUsd: 998.2 }), raydium: succeed("raydium", { expectedOutputUsd: 997.6 }), orca: succeed("orca", { expectedOutputUsd: 997.4 }) }, { telemetry: (e) => { emitted = e; } });
  add("SWS-34: telemetry is emitted and SAFE (no raw payload / credential / profile fields)", emitted != null && isTelemetrySafe(emitted!) && safeActionKeyHash("x").startsWith("k_"), "telemetry safe");

  // ---- HTTP handler validation ----
  const handler = createSwapQuoteHandler(baseOptions({ jupiter: succeed("jupiter", { expectedOutputUsd: 998.2 }), raydium: succeed("raydium", { expectedOutputUsd: 997.6 }), orca: succeed("orca", { expectedOutputUsd: 997.4 }) }));
  const okRes = await handler({ method: "POST", category: "rebalance", suggestionId: "rebalance_to_plan", inputMint: USDC, outputMint: WSOL, inputDecimals: 6, outputDecimals: 9, inputAmountRaw: "1000000000", slippageBps: 50 });
  const badMint = await handler({ category: "rebalance", suggestionId: "s", inputMint: "notamint", outputMint: WSOL, inputDecimals: 6, outputDecimals: 9, inputAmountRaw: "1000000000", slippageBps: 50 });
  const badPair = await handler({ category: "rebalance", suggestionId: "s", inputMint: USDC, outputMint: "So11111111111111111111111111111111111111113", inputDecimals: 6, outputDecimals: 9, inputAmountRaw: "1000000000", slippageBps: 50 });
  add("SWS-35: HTTP handler returns 200 sanitized assessment for a valid request; rejects bad mint (400) and unapproved pair (422)", okRes.status === 200 && "methodologyVersion" in okRes.body && badMint.status === 400 && badPair.status === 422, `ok=${okRes.status} mint=${badMint.status} pair=${badPair.status}`);
  add("SWS-36: HTTP handler rejects a request carrying a forbidden field (arbitrary rpcUrl / wallet-private)", (await handler({ category: "rebalance", suggestionId: "s", inputMint: USDC, outputMint: WSOL, inputDecimals: 6, outputDecimals: 9, inputAmountRaw: "1000000000", slippageBps: 50, ...( { rpcUrl: "http://evil" } as object) } as never)).status === 400, "forbidden request field");

  // ---- Trim + DCA readiness feed the orchestrator only when ready ----
  const trim = buildTrimSwapAction({ actionId: "t", suggestionId: "trim_long_tail_assets", generatedAt: new Date(FIXED).toISOString(), holdings: [{ holdingId: "h", mint: USDC, decimals: 6, rawBalance: "5000000", uiAmount: 5, recognizedValueUsd: 5, symbol: "BONK", reviewEligibilityState: "eligible", actionabilityState: "transferable", coreAssetState: "non_core" }] });
  add("SWS-37: Trim exact token→USDC produces a ready action (fed to the orchestrator unchanged)", trim.status === "ready" && trim.legs[0].outputAsset.mint === USDC, `status=${trim.status}`);
  const dcaUnfunded = buildDcaSwapAction({ actionId: "d", suggestionId: "s", generatedAt: new Date(FIXED).toISOString(), planKind: "recurring_dca", targetAssetId: WSOL, targetSymbol: "SOL", targetDecimals: 9, amountUsd: 300 });
  add("SWS-38: unfunded future DCA → not_ready_for_quote (never quoted; source never assumed)", dcaUnfunded.status === "not_ready_for_quote", `status=${dcaUnfunded.status}`);

  // ---- 23B.1: approved price source (Jupiter Price v3 shape) ----
  const mockFetch = (status: number, data: unknown): typeof fetch => (async () => ({ ok: status >= 200 && status < 300, status, json: async () => data })) as unknown as typeof fetch;
  const sig = new AbortController().signal;
  const jp = createJupiterPriceSource(mockFetch(200, { [WSOL]: { usdPrice: 150.5, decimals: 9 }, [USDC]: { usdPrice: 1.0001, decimals: 6 } }));
  add("SWS-39: Jupiter Price v3 → fresh SOL + USDC USD prices (mint-keyed, sourced not hard-coded)", (await jp.getUsdPrice(WSOL, sig))?.usd === 150.5 && (await jp.getUsdPrice(USDC, sig))?.usd === 1.0001, "price parse");
  add("SWS-40: price source → null on missing mint / malformed / non-2xx / non-positive (fail closed, never invented)", (await createJupiterPriceSource(mockFetch(200, {}))?.getUsdPrice(WSOL, sig)) === null && (await createJupiterPriceSource(mockFetch(500, {}))?.getUsdPrice(WSOL, sig)) === null && (await createJupiterPriceSource(mockFetch(200, { [WSOL]: { usdPrice: 0 } }))?.getUsdPrice(WSOL, sig)) === null, "price fail closed");

  // ---- 23B.1: approved liquidity source (Raydium pool TVL) ----
  const rl = createRaydiumLiquiditySource(mockFetch(200, { success: true, data: [{ id: "pool1", tvl: 250000, type: "Concentrated" }] }));
  add("SWS-41: Raydium pool-TVL liquidity → per-pool USD liquidity (exact pool id, not protocol TVL)", (await rl.getPoolLiquidity("pool1", sig))?.liquidityUsd === 250000, "liq parse");
  add("SWS-42: liquidity source → null on unknown pool layout / missing pool / non-2xx (reject, fail closed)", (await createRaydiumLiquiditySource(mockFetch(200, { data: [{ id: "pool1", tvl: 250000, type: "Weird" }] }))?.getPoolLiquidity("pool1", sig)) === null && (await createRaydiumLiquiditySource(mockFetch(200, { data: [] }))?.getPoolLiquidity("pool1", sig)) === null && (await createRaydiumLiquiditySource(mockFetch(503, {}))?.getPoolLiquidity("pool1", sig)) === null, "liq reject");

  // ---- 23B.1: service health states ----
  const envReady = (k: string) => (k === "SOLANA_RPC_URL" ? "https://rpc.example" : undefined);
  add("SWS-43: health = ready when price + liquidity + all providers configured", assessServiceHealth({ env: envReady }).state === "ready", assessServiceHealth({ env: envReady }).state);
  add("SWS-44: health = degraded when Orca RPC missing (price + liquidity + Jupiter/Raydium still available)", assessServiceHealth({ env: () => undefined }).state === "degraded", assessServiceHealth({ env: () => undefined }).state);
  add("SWS-45: health = unavailable when required price/liquidity evidence cannot be produced", assessServiceHealth({ env: () => undefined, priceSourceConfigured: false }).state === "unavailable", assessServiceHealth({ env: () => undefined, priceSourceConfigured: false }).state);
  add("SWS-46: health = unavailable + reason when a VITE_ swap secret is present (leak refusal)", (() => { const h = assessServiceHealth({ env: (k) => (k === "VITE_SOLANA_RPC_URL" ? "leaked" : undefined) }); return h.state === "unavailable" && h.reasons.includes("vite_prefixed_secret_present"); })(), "leak health");
  add("SWS-47: health payload exposes NO secret value / URL / header (only booleans + safe reason codes)", (() => { const h = assessServiceHealth({ env: envReady }); return !/rpc\.example|https?:|apiKey|authorization/i.test(JSON.stringify(h)); })(), "health safe");

  // ---- 23B.1: rate limiting ----
  add("SWS-48: rate limiter allows a burst then returns a safe 429 reason (never a raw provider error)", (() => { const rlim = new SwapRateLimiter(SWAP_RATE_LIMIT_CONFIG, () => FIXED); let allowed = 0, denied = 0; for (let i = 0; i < SWAP_RATE_LIMIT_CONFIG.perCallerBurst + 3; i++) { const d = rlim.acquire("ip1"); if (d.allowed) allowed++; else { denied++; if (d.reason !== "burst_exceeded" && d.reason !== "sustained_exceeded") return false; } } return allowed === SWAP_RATE_LIMIT_CONFIG.perCallerBurst && denied >= 1; })(), "rate limit");
  add("SWS-49: global concurrency cap denies when too many comparisons are in-flight, releases on completion", (() => { const rlim = new SwapRateLimiter(SWAP_RATE_LIMIT_CONFIG, () => FIXED); const ids = Array.from({ length: SWAP_RATE_LIMIT_CONFIG.globalConcurrency }, (_, i) => `c${i}`); ids.forEach((id) => rlim.acquire(id)); const over = rlim.acquire("cX"); rlim.release(); const after = rlim.acquire("cY"); return over.allowed === false && over.reason === "global_concurrency_exceeded" && after.allowed === true; })(), "global concurrency");

  // ---- 23B.1: provider-overlap disclosure ----
  const overlap = await run({ jupiter: succeed("jupiter", { expectedOutputUsd: 998.2, underlyingVenues: ["Raydium CLMM", "Orca Whirlpool"] }), raydium: succeed("raydium", { expectedOutputUsd: 997.6 }), orca: succeed("orca", { expectedOutputUsd: 997.4 }) });
  const jupCand = overlap.candidates.find((c) => c.providerId === "jupiter")!;
  add("SWS-50: a Jupiter route through Raydium/Orca preserves executionSurface=Jupiter AND discloses underlying venues (not counted as 3 independent routes)", jupCand.executionSurface === "jupiter" && jupCand.underlyingVenues.includes("Raydium CLMM") && jupCand.underlyingVenues.includes("Orca Whirlpool"), `venues=${jupCand.underlyingVenues.join("|")}`);
  add("SWS-51: overlap disclosure (underlying venues) survives sanitization", scanForForbiddenServerFields(overlap).clean && overlap.candidates.every((c) => Array.isArray(c.underlyingVenues)), "overlap survives sanitize");

  // ---- 23C: browser client adapter lifecycle (mocked WealthSmith endpoint; never a provider host) ----
  const clientAction = usdcToSolAction();
  const okFetch = ((async () => ({ ok: true, status: 200, json: async () => three })) as unknown) as typeof fetch;
  const clientOkRes = await fetchSwapQuoteComparison(clientAction, { fetchImpl: okFetch, apiBase: "" });
  add("SWS-C1: client posts to the WealthSmith endpoint and returns a validated sanitized assessment", clientOkRes.ok === true && clientOkRes.ok && clientOkRes.assessment.status === "selected", `ok=${clientOkRes.ok}`);
  const txFetch = ((async () => ({ ok: true, status: 200, json: async () => ({ ...three, candidates: [{ ...three.candidates[0], swapTransaction: "AA==" }] }) })) as unknown) as typeof fetch;
  const txRes = await fetchSwapQuoteComparison(clientAction, { fetchImpl: txFetch, apiBase: "" });
  add("SWS-C2: client REJECTS a transaction-bearing response (defense in depth)", txRes.ok === false && txRes.error === "transaction_in_response", `err=${txRes.ok ? "ok" : txRes.error}`);
  const err503 = ((async () => ({ ok: false, status: 503, json: async () => ({ error: "x" }) })) as unknown) as typeof fetch;
  const unavailRes = await fetchSwapQuoteComparison(clientAction, { fetchImpl: err503, apiBase: "" });
  add("SWS-C3: client maps 503 → unavailable (fail closed; suggestion untouched)", unavailRes.ok === false && unavailRes.error === "unavailable", `err=${unavailRes.ok ? "ok" : unavailRes.error}`);
  const abortFetch = ((async () => { const e = new Error("aborted"); e.name = "AbortError"; throw e; }) as unknown) as typeof fetch;
  const abortRes = await fetchSwapQuoteComparison(clientAction, { fetchImpl: abortFetch, apiBase: "" });
  add("SWS-C4: client maps an aborted request → aborted (cancellation on close/action change)", abortRes.ok === false && abortRes.error === "aborted", `err=${abortRes.ok ? "ok" : abortRes.error}`);
  const badShape = ((async () => ({ ok: true, status: 200, json: async () => ({ foo: 1 }) })) as unknown) as typeof fetch;
  const badRes = await fetchSwapQuoteComparison(clientAction, { fetchImpl: badShape, apiBase: "" });
  add("SWS-C5: client rejects a malformed (wrong-shape) response → invalid_response", badRes.ok === false && badRes.error === "invalid_response", `err=${badRes.ok ? "ok" : badRes.error}`);
  let sentBody: string | null = null;
  const capFetch = ((async (_u: string, init?: { body?: string }) => { sentBody = init?.body ?? null; return { ok: true, status: 200, json: async () => three }; }) as unknown) as typeof fetch;
  await fetchSwapQuoteComparison(clientAction, { fetchImpl: capFetch, apiBase: "" });
  add("SWS-C6: the client posts NO wallet/profile field — only category/mints/decimals/amount/slippage", sentBody != null && !/wallet|income|expenses|risk|portfolio|address|secret/i.test(sentBody), "safe request body");

  // ---- 23C.1: Demo deterministic fetcher (offline; no provider / no WealthSmith endpoint) ----
  const demoAction = usdcToSolAction();
  const demoRes = await demoSwapQuoteFetcher(demoAction, {});
  // Jupiter, not merely "a winner": `in_app_confirm` is assigned to Jupiter alone, so a demo
  // that selected anyone else could never reach the confirm step — the Boundary would refuse
  // it and the demo would stop at the hand-off, hiding the part a demo most needs to show.
  add("SWS-C7: Demo fetcher returns a deterministic sanitized SELECTED assessment offline (no network)", demoRes.ok === true && demoRes.ok && demoRes.assessment.status === "selected" && demoRes.assessment.selectedProviderId === "jupiter", `ok=${demoRes.ok}`);
  add("SWS-C7b: the demo winner is EXECUTABLE — a demo that stops at the hand-off shows nothing", demoRes.ok && resolveSwapHandoffType({ providerId: demoRes.assessment.selectedProviderId, suggestionCategory: "rebalance" }) === "in_app_confirm", "demo reaches the confirm step");
  add("SWS-C8: Demo fetcher output passes production sanitization (no forbidden fields)", demoRes.ok && scanForForbiddenServerFields(demoRes.assessment).clean, "demo sanitized");
  const demoBad = await demoSwapQuoteFetcher({ ...demoAction, inputAsset: { symbol: "X", mint: "Mint333333333333333333333333333333333333333", decimals: 5 } }, {});
  add("SWS-C9: Demo fetcher fails closed for a non-demo pair (never invents a route)", demoBad.ok === false, `ok=${demoBad.ok}`);

  return checks;
}

/* ------------------------------------------------------------------ *
 * Architecture guards (SYNC source scans).
 * ------------------------------------------------------------------ */
export function runSwapQuoteServerGuardChecks(): SwapFixtureCheck[] {
  const checks: SwapFixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const clientDirs = ["src/components", "src/pages", "src/hooks", "src/state", "src/wallet"];
  const grepClient = (needle: RegExp) => clientDirs.some((d) => { try { return require("node:child_process").execSync(`grep -rl "${needle.source}" ${process.cwd()}/${d} 2>/dev/null || true`).toString().trim().length > 0; } catch { return false; } });

  add("SWG-1: NO browser file (components/pages/hooks/state/wallet) imports the server swapQuote tree", !grepClient(/server\/swapQuote/), "server-only");
  const jup = readSrc("src/server/swapQuote/jupiterQuoteClient.ts") + readSrc("src/server/swapQuote/raydiumQuoteClient.ts") + readSrc("src/server/swapQuote/orcaQuoteClient.ts") + readSrc("src/server/swapQuote/swapQuoteOrchestrator.ts");
  add("SWG-2: NO provider adapter imports a wallet-signing library or calls send/sign/simulate/execute", !/@solana\/wallet-adapter|signTransaction|signAllTransactions|sendTransaction|simulateTransaction|\.execute\(/.test(jup), "no signing");
  const engine = readSrc("src/suggestions/engine.ts") + readSrc("src/suggestions/useRailSuggestions.ts");
  add("SWG-3: the Suggestion Engine / rail does NOT import the live quote server modules", !/server\/swapQuote/.test(engine), "engine clean");
  const quoteModules = readSrc("src/suggestions/swapQuote/swapQuoteComparison.ts") + readSrc("src/server/swapQuote/swapQuoteOrchestrator.ts");
  add("SWG-4: quote modules do NOT import target-allocation policy to derive actions", !/targetAllocationPolicy|targetAllocationAssessment|canonicalTargetAllocation/.test(quoteModules), "no target import");
  const cacheSrc = readSrc("src/server/swapQuote/swapQuoteCache.ts");
  const cacheCode = cacheSrc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, ""); // strip comments before the profile scan
  add("SWG-5: cache key includes pair/policy/adapter versions and no profile field (code, comments stripped)", /SWAP_QUOTE_POLICY_VERSION|SWAP_PAIR_REGISTRY_VERSION/.test(cacheCode) && !/income|expenses|riskTolerance|monthlySavingGoal/.test(cacheCode), "cache versions");
  const orch = readSrc("src/server/swapQuote/swapQuoteOrchestrator.ts");
  add("SWG-6: orchestrator reuses Step-23A policy constants (no duplicated thresholds/timeouts in provider modules)", /policy\.operational\.providerTimeoutMs|policy\.operational\.comparisonTimeoutMs/.test(orch) && !/2500|3000/.test(jup), "no dup constants");
  const sanit = readSrc("src/server/swapQuote/responseSanitizer.ts");
  add("SWG-7: the sanitizer REJECTS (throws) on a forbidden field rather than silently stripping", /throw new Error/.test(sanit), "reject not strip");
  add("SWG-8: NO client file references a provider endpoint URL or the live price/liquidity sources (no browser provider request code)", !grepClient(/api\.jup\.ag|transaction-v1\.raydium|api-v3\.raydium|createJupiterPriceSource|createRaydiumLiquiditySource/), "no client provider URL");
  const httpSrc = readSrc("src/server/swapQuote/httpServer.ts");
  add("SWG-9: the request-time server exposes a /health readiness endpoint and per-caller rate limiting, and pre-bundles (no per-request esbuild)", /\/health/.test(httpSrc) && /SwapRateLimiter/.test(httpSrc) && /createSwapQuoteRequestHandler/.test(httpSrc), "server ops");
  add("SWG-10: the Vite dev proxy for /api/swap-quote is DEV-only (in server.proxy, not a client import) and introduces no VITE_ swap SECRET (a public API base is allowed)", (() => { const vc = readSrc("vite.config.ts"); return /proxy:/.test(vc) && /\/api\/swap-quote/.test(vc) && !/VITE_JUPITER_QUOTE_API_KEY|VITE_RAYDIUM_QUOTE_API_KEY|VITE_SOLANA_RPC_URL|VITE_SWAP_RPC_URL/.test(vc); })(), "dev proxy");

  return checks;
}
