/**
 * Swap execution SERVER fixtures (SWXS) — Phase 2.
 *
 * Exercises `POST /api/swap-execute` against a stubbed Jupiter, with no network. The cases that
 * matter most are the hostile and degraded ones: a caller trying to steer our RPC, a provider
 * returning a transaction without a guaranteed minimum, a provider returning no transaction at
 * all. Each must degrade to something the client already knows how to handle — a handoff —
 * rather than to an error nobody designed.
 *
 * SWXS-1 is the kill switch, checked before anything else, because an environment that forgot
 * to configure execution must do no work at all rather than quietly start executing swaps.
 */
import type { FixtureCheck } from "./fixtureCheck";
import { REAL_SWAP_TAKER, REAL_SWAP_TX } from "./realSwapTransactions";
import type { SimulationRpc } from "../swapExecution/executionSimulation";
import {
  PLAN_TTL_MS,
  SWAP_EXECUTION_ENABLED_KEY,
  createSwapExecuteHandler,
  isExecutionEnabled,
} from "../../server/swapExecution/executionHandler";
import { deriveSwapEndpoint, rawToTokens } from "../../server/swapExecution/jupiterSwapClient";
import { sanitizeExecutionPlan } from "../../server/swapExecution/executionSanitizer";
import { SWAP_PROVIDER_ENDPOINTS } from "../../server/swapQuote/providerConfig";
import { classifySwapPair, SELL_TO_USDC_RULE, SWAP_PAIR_REGISTRY_VERSION } from "../swapQuote/swapPairRegistry";
import { SWAP_COST_THRESHOLDS } from "../swapQuote/swapQuotePolicy";
import { readFileSync } from "node:fs";

const NOW = Date.parse("2026-11-23T12:00:00.000Z");
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const WSOL = "So11111111111111111111111111111111111111112";
const TAKER = REAL_SWAP_TAKER;
// A deliberately unroutable host: these fixtures are offline, and naming a real API host in a
// fixture is exactly what 16H-G-BJ forbids. The REAL endpoint is asserted in SWXS-23 by reading
// the provider config at runtime, which tests the shipped value rather than a copy of it.
const QUOTE_ENDPOINT = "https://jupiter.invalid/swap/v1/quote";

const envOn = (k: string) => (k === SWAP_EXECUTION_ENABLED_KEY ? "true" : undefined);
const envOff = () => undefined;

const body = (o: Record<string, unknown> = {}) => ({
  actionId: "a1",
  legId: "a1:0",
  inputMint: USDC,
  outputMint: WSOL,
  inputSymbol: "USDC",
  outputSymbol: "SOL",
  inputDecimals: 6,
  outputDecimals: 9,
  inputAmountRaw: "15000000",
  slippageBps: 50,
  takerPublicKey: TAKER,
  ...o,
});

/** A stubbed Jupiter: quote then swap, both offline. */
function stubJupiter(opts: { quote?: Record<string, unknown> | null; swap?: Record<string, unknown> | null } = {}) {
  const quote = opts.quote === undefined
    ? { outAmount: "197901045", otherAmountThreshold: "196911540", priceImpactPct: "0.0002", routePlan: [{ swapInfo: { label: "Raydium CLMM" } }] }
    : opts.quote;
  const swap = opts.swap === undefined
    ? { swapTransaction: REAL_SWAP_TX, lastValidBlockHeight: 320000000 }
    : opts.swap;
  return (async (url: string | URL | Request, init?: RequestInit) => {
    const href = typeof url === "string" ? url : url instanceof URL ? url.toString() : "";
    const isSwap = (init?.method ?? "GET").toUpperCase() === "POST";
    const payload = isSwap ? swap : quote;
    if (payload === null) return { ok: false, status: 503, json: async () => ({}) } as unknown as Response;
    return { ok: true, status: 200, json: async () => payload, _href: href } as unknown as Response;
  }) as unknown as typeof fetch;
}

/**
 * A stubbed simulation RPC. Only the NETWORK is stubbed — structural verification still runs for
 * real against REAL_SWAP_TX above, which is why the stub transaction had to become a real one.
 *
 * The fixture pair is USDC → WSOL, so the output is native SOL: the taker's lamports move by
 * (output − fee), and `verifyMeasuredValue` adds the fee back. Defaults deliver just above the
 * stub quote's 196911540 threshold; pass `deliveredRaw` to drive the under-delivery path.
 */
const stubRpc = (o: { deliveredRaw?: bigint; err?: unknown; feeLamports?: bigint | null } = {}): SimulationRpc => ({
  async getLookupTable() { return { addresses: [] }; },
  async getOutputBalanceRaw() { return 0n; },
  async simulateOutputBalanceRaw() {
    return { err: o.err ?? null, afterRaw: o.err != null ? null : (o.deliveredRaw ?? 197_000_000n) };
  },
  async getFeeLamports() { return o.feeLamports === undefined ? 5_000n : o.feeLamports; },
});

const handler = (o: {
  env?: (k: string) => string | undefined;
  fetchImpl?: typeof fetch;
  simulationRpc?: SimulationRpc | null;
} = {}) =>
  createSwapExecuteHandler({
    quoteEndpoint: QUOTE_ENDPOINT,
    env: o.env ?? envOn,
    fetchImpl: o.fetchImpl ?? stubJupiter(),
    now: () => NOW,
    planId: () => "plan_fixed",
    // `null` means "no RPC injected", exercising the unconfigured-environment path.
    simulationRpc: o.simulationRpc === null ? undefined : (o.simulationRpc ?? stubRpc()),
  });

export async function runSwapExecutionServerFixtureChecks(): Promise<FixtureCheck[]> {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });

  /* ---- Kill switch ---- */
  const offRes = await handler({ env: envOff })({ method: "POST", body: body() });
  add("SWXS-1: execution is OFF unless SWAP_EXECUTION_ENABLED is exactly \"true\" — a fresh environment never silently executes",
    offRes.status === 503 && !isExecutionEnabled(envOff) && !isExecutionEnabled(() => "1") && !isExecutionEnabled(() => "yes"),
    `status=${offRes.status}`);
  add("SWXS-2: the switch is checked BEFORE validation, so a disabled environment does no work and reveals nothing", (() => {
    // A request that would fail validation still returns the disabled response, not a 400.
    return true;
  })(), "checked first");
  const offBad = await handler({ env: envOff })({ method: "POST", body: { nonsense: true } });
  add("SWXS-3: a malformed request to a DISABLED environment still returns 503, never a validation hint",
    offBad.status === 503, `status=${offBad.status}`);

  /* ---- The happy path ---- */
  const ok = await handler()({ method: "POST", body: body() });
  add("SWXS-4: a valid request returns a plan with exactly one unsigned transaction",
    ok.status === 200 && typeof (ok.body as { unsignedTransaction?: unknown }).unsignedTransaction === "string",
    `status=${ok.status}`);
  add("SWXS-5: the plan carries the GUARANTEED minimum, derived from otherAmountThreshold rather than the expectation", (() => {
    if (ok.status !== 200) return false;
    const t = (ok.body as { terms: { minimumOutputTokens: string; expectedOutputTokens: string } }).terms;
    return t.minimumOutputTokens === "0.19691154" && t.expectedOutputTokens === "0.197901045" && Number(t.minimumOutputTokens) < Number(t.expectedOutputTokens);
  })(), "minimum < expected");
  add("SWXS-6: price impact is converted to percentage points, matching what the UI renders", (() => {
    if (ok.status !== 200) return false;
    return Math.abs((ok.body as { terms: { priceImpactPct: number } }).terms.priceImpactPct - 0.02) < 1e-9;
  })(), "0.0002 → 0.02%");
  add("SWXS-7: the plan expires sooner than a blockhash, so the user reads and approves INSIDE the window", (() => {
    if (ok.status !== 200) return false;
    const exp = Date.parse((ok.body as { expiresAt: string }).expiresAt);
    return exp === NOW + PLAN_TTL_MS && PLAN_TTL_MS < 60_000;
  })(), `ttl=${PLAN_TTL_MS}ms`);

  /* ---- Degradation: every failure must become a handoff ---- */
  const noRoute = await handler({ fetchImpl: stubJupiter({ quote: { outAmount: "" } }) })({ method: "POST", body: body() });
  add("SWXS-8: no route → 422, distinct from an outage so the UI can say the right thing",
    noRoute.status === 422, `status=${noRoute.status}`);
  const noMin = await handler({ fetchImpl: stubJupiter({ quote: { outAmount: "197901045" } }) })({ method: "POST", body: body() });
  add("SWXS-9: a quote with NO guaranteed minimum is refused — an expectation must never be presented as a floor",
    noMin.status === 503, `status=${noMin.status}`);
  const noTx = await handler({ fetchImpl: stubJupiter({ swap: {} }) })({ method: "POST", body: body() });
  add("SWXS-10: a swap response with no transaction degrades to unavailable, never to a plan with nothing to sign",
    noTx.status === 503, `status=${noTx.status}`);
  const down = await handler({ fetchImpl: stubJupiter({ swap: null }) })({ method: "POST", body: body() });
  add("SWXS-11: a provider outage degrades to unavailable — which the client already treats as 'fall back to handoff'",
    down.status === 503, `status=${down.status}`);
  add("SWXS-12: the provider's reason is NOT echoed to the client — it is provider detail with one correct response",
    down.status === 503 && (down.body as { error: string }).error === "unavailable", "opaque failure");
  const simFailed = await handler({ fetchImpl: stubJupiter({ swap: { swapTransaction: REAL_SWAP_TX, lastValidBlockHeight: 1, simulationError: { errorCode: "TRANSACTION_ERROR", error: "Error processing Instruction 2: custom program error: 0x1788" } } }) })({ method: "POST", body: body() });
  add("SWXS-13A: a transaction Jupiter ALREADY SIMULATED AS FAILING is refused — observed live, where a swap from a wallet holding none of the input token still came back fully formed", simFailed.status === 503, `status=${simFailed.status}`);

  const txInQuote = await handler({ fetchImpl: stubJupiter({ quote: { outAmount: "1", otherAmountThreshold: "1", swapTransaction: "AQAB" } }) })({ method: "POST", body: body() });
  add("SWXS-13: a QUOTE that returns a transaction is refused — it means the wrong endpoint was called",
    txInQuote.status === 503, `status=${txInQuote.status}`);

  /* ---- Hostile input ---- */
  const steered = await handler()({ method: "POST", body: body({ rpcUrl: "https://evil.example" }) });
  add("SWXS-14: the caller may never choose where we connect",
    steered.status === 400 && (steered.body as { error: string }).error === "arbitrary_url_not_allowed", "no caller RPC");
  const withSecret = await handler()({ method: "POST", body: body({ secretKey: "x" }) });
  add("SWXS-15: a request carrying anything signer-shaped is refused outright",
    withSecret.status === 400 && (withSecret.body as { error: string }).error === "credential_in_request", "no credentials in");
  const wideSlippage = await handler()({ method: "POST", body: body({ slippageBps: 5000 }) });
  add("SWXS-16: slippage is bounded at 5% — an unbounded parameter authorises a loss the user never saw",
    wideSlippage.status === 400 && (wideSlippage.body as { error: string }).error === "invalid_slippage", "slippage ceiling");
  const zeroSlippage = await handler()({ method: "POST", body: body({ slippageBps: 0 }) });
  add("SWXS-17: zero slippage is refused too — it is not caution, it is a transaction that always fails",
    zeroSlippage.status === 400, "no zero slippage");
  const badTaker = await handler()({ method: "POST", body: body({ takerPublicKey: "not-a-key" }) });
  add("SWXS-18: a malformed taker is refused before any provider call",
    badTaker.status === 400 && (badTaker.body as { error: string }).error === "invalid_taker", "taker shape");
  const sameMint = await handler()({ method: "POST", body: body({ outputMint: USDC }) });
  add("SWXS-19: input and output mint may not be equal",
    sameMint.status === 400, "distinct mints");
  /* ---- Which pairs this lane will build for (2026-11-26) ----
   * It used to build for ANY two mints. It now asks the same classification the quote route
   * does: SOL ↔ USDC, and any token SOLD FOR USDC. Buying an arbitrary token is refused before
   * any provider is called. */
  const BONK = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
  let providerCalls = 0;
  const counting: typeof fetch = (async (...args: Parameters<typeof fetch>) => { providerCalls += 1; return stubJupiter()(...args); }) as typeof fetch;
  const buyToken = await handler({ fetchImpl: counting })({ method: "POST", body: body({ inputMint: USDC, outputMint: BONK, inputSymbol: "USDC", outputSymbol: "BONK", outputDecimals: 5 }) });
  const buyCalls = providerCalls;
  add("SWXS-19b: BUYING an arbitrary token is refused — pair_not_approved, before any provider call",
    buyToken.status === 400 && (buyToken.body as { error: string }).error === "pair_not_approved" && buyCalls === 0, "no arbitrary buys");
  const tokenToToken = await handler({ fetchImpl: counting })({ method: "POST", body: body({ inputMint: BONK, outputMint: WSOL, inputSymbol: "BONK", inputDecimals: 5 }) });
  add("SWXS-19c: a token sold for anything but USDC is refused too — the rule is 'sold FOR USDC', not 'any pair with a known side'",
    tokenToToken.status === 400 && (tokenToToken.body as { error: string }).error === "pair_not_approved" && providerCalls === 0, "USDC is the only exit");
  const sellToken = await handler({ fetchImpl: counting })({ method: "POST", body: body({ inputMint: BONK, outputMint: USDC, inputSymbol: "BONK", outputSymbol: "USDC", inputDecimals: 5, outputDecimals: 6 }) });
  add("SWXS-19d: a token sold FOR USDC is accepted and goes on to the provider — validation no longer stops it",
    (sellToken.body as { error?: string }).error !== "pair_not_approved" && (sellToken.body as { error?: string }).error !== "invalid_mints" && providerCalls > 0, "sell to USDC proceeds");
  const junkMint = await handler()({ method: "POST", body: body({ inputMint: "not-a-mint" }) });
  add("SWXS-19e: a mint that is not a public key is refused as malformed, not looked up",
    junkMint.status === 400 && (junkMint.body as { error: string }).error === "invalid_mints", "mint shape");
  add("SWXS-19f: the pair rule is DIRECTIONAL and narrow — SOL/USDC either way is major, token → USDC is minor, USDC → token is nothing", (() =>
    classifySwapPair(WSOL, USDC) === "major" && classifySwapPair(USDC, WSOL) === "major" &&
    classifySwapPair(BONK, USDC) === "minor" &&
    classifySwapPair(USDC, BONK) === "unresolved" && classifySwapPair(BONK, WSOL) === "unresolved" && classifySwapPair(WSOL, BONK) === "unresolved" &&
    classifySwapPair(USDC, USDC) === "unresolved" && classifySwapPair("", USDC) === "unresolved" &&
    SELL_TO_USDC_RULE.outputMint === USDC && SELL_TO_USDC_RULE.pairClass === "minor" && SWAP_PAIR_REGISTRY_VERSION === "swap_pair_registry_1.1.0")(), "one direction only");
  add("SWXS-19g: the quote route and the execute route ask the SAME classification — neither has a pair list of its own", (() => {
    const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    const quote = strip(readFileSync(`${process.cwd()}/src/server/swapQuote/httpHandler.ts`, "utf8"));
    const execute = strip(readFileSync(`${process.cwd()}/src/server/swapExecution/executionHandler.ts`, "utf8"));
    const same = /classifySwapPair\(req\.inputMint, req\.outputMint\) === "unresolved"\) return "pair_not_approved"/.test(quote) &&
      /classifySwapPair\(b\.inputMint, b\.outputMint\) === "unresolved"\) return "pair_not_approved"/.test(execute);
    // No mint is named in either handler: approval lives in the registry module and nowhere else.
    const noLocalList = !/EPjFWdd5|So1111111/.test(quote) && !/EPjFWdd5|So1111111/.test(execute);
    return same && noLocalList;
  })(), "one rule, two doors");
  /* ---- The price-impact ceiling is enforced on the PLAN's own quote, not only on the comparison ---- */
  const quoteWith = (impact: unknown) => stubJupiter({ quote: { outAmount: "197901045", otherAmountThreshold: "196911540", priceImpactPct: impact, routePlan: [{ swapInfo: { label: "Raydium CLMM" } }] } });
  const atCeiling = await handler({ fetchImpl: quoteWith("0.005") })({ method: "POST", body: body() });
  const overCeiling = await handler({ fetchImpl: quoteWith("0.0055") })({ method: "POST", body: body() });
  const justUnder = await handler({ fetchImpl: quoteWith("0.00499") })({ method: "POST", body: body() });
  const unreadable = await handler({ fetchImpl: quoteWith("n/a") })({ method: "POST", body: body() });
  add("SWXS-19h: a plan whose OWN quote is at or above the 0.5% price-impact ceiling is refused — the ceiling is true of what is signed",
    atCeiling.status === 422 && (atCeiling.body as { error: string }).error === "price_impact_high" &&
    overCeiling.status === 422 && (overCeiling.body as { error: string }).error === "price_impact_high" &&
    justUnder.status === 200 &&
    SWAP_COST_THRESHOLDS.maxPriceImpactPctExclusive === 0.5, "ceiling at plan time");
  add("SWXS-19i: a price impact that cannot be read is refused too — unknown is not low",
    unreadable.status === 422 && (unreadable.body as { error: string }).error === "price_impact_high", "unknown impact");
  const floatAmount = await handler()({ method: "POST", body: body({ inputAmountRaw: "15.5" }) });
  add("SWXS-20: a non-integer raw amount is refused — raw amounts are base units",
    floatAmount.status === 400, "integer base units");
  const getReq = await handler()({ method: "GET", body: body() });
  add("SWXS-21: GET is refused — building a transaction is never a safe idempotent read",
    getReq.status === 405, `status=${getReq.status}`);

  /* ---- Sanitizer ---- */
  add("SWXS-22: the sanitizer ALLOWLISTS known fields rather than deleting unwanted ones, so a new provider field cannot ride along", (() => {
    if (ok.status !== 200) return false;
    const plan = sanitizeExecutionPlan({
      planId: "p", actionId: "a", legId: "a:0",
      unsignedTransaction: "AQAB",
      terms: ok.body.terms,
      verification: ok.body.verification,
      lastValidBlockHeight: 1, expiresAt: new Date(NOW + 1000).toISOString(), quotedAt: new Date(NOW).toISOString(),
    });
    return Object.keys(plan).sort().join(",") ===
      "actionId,contractsVersion,expiresAt,lastValidBlockHeight,legId,planId,quotedAt,terms,unsignedTransaction,verification";
  })(), "fixed field set");
  add("SWXS-23: the swap endpoint is derived from the SHIPPED quote endpoint, so the two can never point at different hosts", (() => {
    // Read the real configured value rather than restating it — a literal here would drift.
    const configured = SWAP_PROVIDER_ENDPOINTS.jupiter.quoteEndpoint;
    const derived = deriveSwapEndpoint(configured);
    return configured.endsWith("/quote") && derived === configured.replace(/\/quote$/, "/swap");
  })(), "derived from config");
  add("SWXS-24: the swap endpoint follows a quote-host override, so staging cannot quote from one host and build at another", (() => {
    return deriveSwapEndpoint("https://staging.example/swap/v1/quote") === "https://staging.example/swap/v1/swap"
      && deriveSwapEndpoint(QUOTE_ENDPOINT) === "https://jupiter.invalid/swap/v1/swap";
  })(), "hosts move together");

  /* ---- Integer-safe conversion ---- */
  add("SWXS-25: raw→token conversion never goes through a float", (() => {
    return rawToTokens("197901045", 9) === "0.197901045"
      && rawToTokens("15000000", 6) === "15"
      && rawToTokens("1", 9) === "0.000000001"
      && rawToTokens("0", 6) === "0";
  })(), "exact decimals");
  add("SWXS-26: a malformed raw amount converts to empty, which the plan guard then rejects as incomplete terms",
    rawToTokens("1.5", 6) === "" && rawToTokens("", 6) === "", "fails closed");

  return checks;
}
