/**
 * swap-quote-smoke.mjs — Step 23B.1. DEVELOPER-ONLY live read-only smoke check against mainnet quote/price data.
 * NOT part of the build or CI. Makes small real quote-only requests for SOL→USDC and USDC→SOL (no taker wallet,
 * no transaction, no execution) and prints a SANITIZED availability/normalization report — never a raw provider
 * response. If network is unavailable it reports "NOT RUN" and exits 0; no live success is ever claimed.
 *
 *   Run: node scripts/swap-quote-smoke.mjs
 */
import { build } from "esbuild";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { writeFileSync } from "node:fs";

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const WSOL = "So11111111111111111111111111111111111111112";

async function loadServer() {
  const p = (rel) => new URL(rel, import.meta.url).pathname;
  const out = join(tmpdir(), `swap-quote-smoke-${Date.now()}.mjs`);
  const shim = join(tmpdir(), `swap-quote-smoke-shim-${Date.now()}.mjs`);
  writeFileSync(shim, [
    `export { collectSwapQuoteSnapshot } from ${JSON.stringify(p("../src/server/swapQuote/swapQuoteOrchestrator.ts"))};`,
    `export { createJupiterPriceSource } from ${JSON.stringify(p("../src/server/swapQuote/jupiterPriceSource.ts"))};`,
    `export { createRaydiumLiquiditySource } from ${JSON.stringify(p("../src/server/swapQuote/raydiumLiquiditySource.ts"))};`,
    `export { nodeEnvReader, detectLeakedSwapEnv } from ${JSON.stringify(p("../src/server/swapQuote/providerConfig.ts"))};`,
    `export { scanForForbiddenServerFields } from ${JSON.stringify(p("../src/server/swapQuote/responseSanitizer.ts"))};`,
  ].join("\n"));
  await build({ entryPoints: [shim], bundle: true, platform: "node", format: "esm", outfile: out, loader: { ".ts": "ts", ".tsx": "tsx" }, resolveExtensions: [".ts", ".tsx", ".mjs", ".js"], logLevel: "error", banner: { js: "import{createRequire as ___cr}from'module';const require=___cr(import.meta.url);" } });
  return import(pathToFileURL(out).href);
}

function actionFor(inMint, inDec, outMint, outDec, rawAmount) {
  return {
    actionId: "smoke", suggestionId: "smoke", suggestionCategory: "rebalance",
    legId: "smoke:0", legIndex: 0, totalLegs: 1,
    inputAsset: { symbol: "IN", mint: inMint, decimals: inDec },
    outputAsset: { symbol: "OUT", mint: outMint, decimals: outDec },
    inputAmountRaw: rawAmount, inputAmountTokens: "0", inputAmountUsd: null,
    sourceAvailability: "wallet_transferable", generatedAt: new Date().toISOString(),
  };
}

const mod = await loadServer();
const env = mod.nodeEnvReader;
const leaked = mod.detectLeakedSwapEnv(env);
if (leaked.length > 0) { console.error(`REFUSING TO RUN — leaked VITE_ swap secret(s): ${leaked.join(",")}`); process.exit(1); }

const hasNetwork = typeof fetch === "function";
const options = {
  slippageBps: 50,
  priceSource: mod.createJupiterPriceSource(),      // Jupiter Price v3 (shared USD snapshot)
  liquiditySource: mod.createRaydiumLiquiditySource(), // Raydium pool TVL (per-leg liquidity)
  env,
  // No rpcRead → Orca is unavailable in this environment (degraded, expected). Jupiter + Raydium compared.
};

async function probe(label, action) {
  try {
    const r = await mod.collectSwapQuoteSnapshot(action, options);
    const forbidden = mod.scanForForbiddenServerFields(r);
    const sel = r.candidates.find((c) => c.providerId === r.selectedProviderId);
    console.log(`--- ${label} ---`);
    console.log(`  status=${r.status} selected=${r.selectedProviderId ?? "none"} basis=${r.selectionBasis ?? "n/a"}`);
    console.log(`  compared=[${r.comparedProviders.join(",")}] unavailable=[${r.unavailableProviders.join(",")}]`);
    console.log(`  cost%=${r.estimatedTotalCostPct != null ? r.estimatedTotalCostPct.toFixed(4) : "n/a"} expectedOut=${r.expectedOutputTokens ?? "n/a"} expiresAt=${r.expiresAt ?? "n/a"}`);
    if (sel) console.log(`  selected priceImpact%=${sel.priceImpactPct ?? "n/a"} liquidity=${sel.liquidityAssessment.status} minLegLiqUsd=${sel.liquidityAssessment.minimumRouteLegLiquidityUsd ?? "n/a"} venues=[${sel.underlyingVenues.join(", ")}]`);
    for (const c of r.candidates) console.log(`    ${c.providerId}: eligible=${c.eligible} freshness=${c.freshness} reasons=[${c.exclusionReasons.join(",")}] latency=${c.quoteLatencyMs ?? "n/a"}ms`);
    console.log(`  forbiddenFieldScan=${forbidden.clean ? "CLEAN" : "FOUND:" + forbidden.foundFields.join(",")}`);
    return r.status;
  } catch (e) {
    console.log(`--- ${label} --- error (sanitized): ${e instanceof Error ? e.message.slice(0, 80) : "unknown"}`);
    return "error";
  }
}

console.log(`swap-quote live smoke — network=${hasNetwork} price=jupiter_price_v3 liquidity=raydium_pool_tvl_v3 orca=unavailable(no_rpc)`);
if (!hasNetwork) {
  console.log("LIVE SMOKE: NOT RUN — no network. Mocked fixture suite remains authoritative. No live success claimed.");
  process.exit(0);
}
const s1 = await probe("SOL→USDC (0.1 SOL)", actionFor(WSOL, 9, USDC, 6, "100000000"));
const s2 = await probe("USDC→SOL (15 USDC)", actionFor(USDC, 6, WSOL, 9, "15000000"));
const ok = [s1, s2].some((s) => s === "selected" || s === "partial_comparison" || s === "only_route_available");
console.log(ok ? "LIVE SMOKE: PASS — at least one direction returned an eligible sanitized route." : "LIVE SMOKE: NO ELIGIBLE ROUTE — failed closed for every provider (not operational readiness).");
process.exit(0);
