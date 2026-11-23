/**
 * swap-execute-smoke.mjs — Phase 4. DEVELOPER-ONLY live smoke check for the EXECUTION lane's HTTP binding.
 * NOT part of the build or CI.
 *
 * It starts the real `executionServer` listener on an ephemeral port and makes real requests against it, so
 * what is exercised is the transport, the kill switch, the validator and the sanitizer together — not the
 * handler in isolation, which is all the fixtures can reach.
 *
 * It requests an UNSIGNED transaction and never signs or submits anything. The taker is a public key only.
 * The returned transaction is then put through the same structural verification the confirm step will use,
 * because a plan the server is willing to build is not yet a plan we would show anyone.
 *
 * If the network is unavailable it reports "NOT RUN" and exits 0; no live success is ever claimed.
 *
 *   Run: node scripts/swap-execute-smoke.mjs
 */
import { build } from "esbuild";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { writeFileSync } from "node:fs";
import http from "node:http";

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const WSOL = "So11111111111111111111111111111111111111112";
/** A public mainnet address used only as the fee payer / recipient in an UNSIGNED transaction. */
const TAKER = "GdxxRejTS1VWftHBxecT6nGpNzqfDKHBYk6ddfurCu9L";

async function loadServer() {
  const p = (rel) => new URL(rel, import.meta.url).pathname;
  const out = join(tmpdir(), `swap-execute-smoke-${Date.now()}.mjs`);
  const shim = join(tmpdir(), `swap-execute-smoke-shim-${Date.now()}.mjs`);
  writeFileSync(shim, [
    `export { createExecutionRequestListener } from ${JSON.stringify(p("../src/server/swapExecution/executionServer.ts"))};`,
    `export { verifyTransactionStructure, lookupTableAddresses, tokensToRaw } from ${JSON.stringify(p("../src/suggestions/swapExecution/executionVerification.ts"))};`,
    `export { resolveSwapHandoffType } from ${JSON.stringify(p("../src/suggestions/swapExecution/swapHandoffType.ts"))};`,
    `export { FORBIDDEN_EXECUTION_FIELDS } from ${JSON.stringify(p("../src/suggestions/swapExecution/executionGuard.ts"))};`,
    `export { validateExecutionPlan } from ${JSON.stringify(p("../src/suggestions/swapExecution/swapExecutionClient.ts"))};`,
  ].join("\n"));
  await build({
    entryPoints: [shim], bundle: true, platform: "node", format: "esm", outfile: out,
    loader: { ".ts": "ts", ".tsx": "tsx" }, resolveExtensions: [".ts", ".tsx", ".mjs", ".js"], logLevel: "error",
    banner: { js: "import{createRequire as ___cr}from'module';const require=___cr(import.meta.url);" },
  });
  return import(pathToFileURL(out).href);
}

/** Start a listener on an ephemeral port and return { port, close }. */
function serve(listener) {
  return new Promise((resolve) => {
    const server = http.createServer(listener);
    server.listen(0, "127.0.0.1", () => {
      resolve({ port: server.address().port, close: () => new Promise((r) => server.close(r)) });
    });
  });
}

async function post(port, path, body) {
  const res = await fetch(`http://127.0.0.1:${port}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON body is itself a finding */ }
  return { status: res.status, cacheControl: res.headers.get("cache-control"), json };
}

const PLAN_REQUEST = {
  actionId: "rebalance:smoke",
  legId: "rebalance:smoke:0",
  inputMint: WSOL,
  outputMint: USDC,
  inputSymbol: "SOL",
  outputSymbol: "USDC",
  inputDecimals: 9,
  outputDecimals: 6,
  inputAmountRaw: "10000000", // 0.01 SOL
  slippageBps: 50,
  takerPublicKey: TAKER,
};

const line = (label, value) => console.log(`  ${label.padEnd(26)}${value}`);
let failures = 0;
const check = (label, ok, detail = "") => {
  if (!ok) failures += 1;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
};

const mod = await loadServer();
const { createExecutionRequestListener, verifyTransactionStructure, lookupTableAddresses, tokensToRaw, resolveSwapHandoffType, FORBIDDEN_EXECUTION_FIELDS, validateExecutionPlan } = mod;

console.log("swap-execute live smoke — unsigned plans only, nothing is signed or submitted\n");

// --- 0. Protocol Logic's assignment is what opens the gate at all. -----------------------------
console.log("--- handoff_type assignment ---");
check("jupiter + rebalance → in_app_confirm",
  resolveSwapHandoffType({ providerId: "jupiter", suggestionCategory: "rebalance" }) === "in_app_confirm");
check("raydium + rebalance → external_new_tab",
  resolveSwapHandoffType({ providerId: "raydium", suggestionCategory: "rebalance" }) === "external_new_tab");
check("jupiter + unknown category → external_new_tab",
  resolveSwapHandoffType({ providerId: "jupiter", suggestionCategory: "stable_yield" }) === "external_new_tab");

// --- 1. The kill switch, through the transport. ------------------------------------------------
console.log("\n--- kill switch (SWAP_EXECUTION_ENABLED unset) ---");
{
  const off = await serve(createExecutionRequestListener({ env: () => undefined }));
  const res = await post(off.port, "/api/swap-execute", PLAN_REQUEST);
  check("disabled → 503", res.status === 503, `got ${res.status}`);
  check("reason is execution_disabled", res.json?.error === "execution_disabled", String(res.json?.error));
  check("no plan in the body", res.json?.unsignedTransaction == null);
  const health = await fetch(`http://127.0.0.1:${off.port}/health`);
  check("health reports disabled, 503", health.status === 503);
  await off.close();
}

// --- 2. Enabled: a real plan from live Jupiter. ------------------------------------------------
console.log("\n--- enabled: live plan construction ---");
const env = (k) => (k === "SWAP_EXECUTION_ENABLED" ? "true" : undefined);
const on = await serve(createExecutionRequestListener({ env }));

// Bad input must be refused before any provider call.
const badSlippage = await post(on.port, "/api/swap-execute", { ...PLAN_REQUEST, slippageBps: 5000 });
check("slippage above the 500bps ceiling → 400", badSlippage.status === 400, `got ${badSlippage.status}`);
const credential = await post(on.port, "/api/swap-execute", { ...PLAN_REQUEST, secretKey: "x" });
check("signer-shaped field → 400 credential_in_request", credential.json?.error === "credential_in_request");
const arbitraryUrl = await post(on.port, "/api/swap-execute", { ...PLAN_REQUEST, rpcUrl: "https://evil.example" });
check("caller-supplied rpcUrl → 400", arbitraryUrl.json?.error === "arbitrary_url_not_allowed");

let res;
try {
  res = await post(on.port, "/api/swap-execute", PLAN_REQUEST);
} catch (e) {
  console.log(`\nNOT RUN — network unavailable (${e instanceof Error ? e.message : "unknown"})`);
  await on.close();
  process.exit(0);
}

if (res.status === 503) {
  console.log("\nNOT RUN — provider unavailable (503); no live claim made");
  await on.close();
  process.exit(0);
}

check("plan returned 200", res.status === 200, `got ${res.status} ${JSON.stringify(res.json)?.slice(0, 120)}`);
check("response is no-store", res.cacheControl === "no-store", String(res.cacheControl));

const plan = res.json;
if (plan == null || typeof plan.unsignedTransaction !== "string") {
  console.log("\nFAIL — no plan body to inspect");
  await on.close();
  process.exit(1);
}

const t = plan.terms ?? {};
line("planId", plan.planId);
line("input", `${t.inputAmountTokens} ${t.inputSymbol}`);
line("expected out", `${t.expectedOutputTokens} ${t.outputSymbol}`);
line("minimum out", `${t.minimumOutputTokens} ${t.outputSymbol}`);
line("price impact %", String(t.priceImpactPct));
line("provider", `${t.providerName} (${t.providerId})`);
line("expires", plan.expiresAt);
line("tx length (base64)", String(plan.unsignedTransaction.length));

// --- 3. The terms must be internally honest. ---------------------------------------------------
console.log("\n--- terms ---");
// Terms carry token-denominated amounts but not the mint's decimals — the confirm flow gets those
// from the action context, not the plan. Use the request's own value rather than guessing one.
const outDecimals = PLAN_REQUEST.outputDecimals;
const minRaw = tokensToRaw(String(t.minimumOutputTokens), outDecimals);
const expRaw = tokensToRaw(String(t.expectedOutputTokens), outDecimals);
check("minimum and expected both parse exactly", minRaw != null && expRaw != null);
check("minimum <= expected", minRaw != null && expRaw != null && minRaw <= expRaw,
  `${minRaw} vs ${expRaw}`);
check("minimum is present and non-zero", minRaw != null && minRaw > 0n);
check("provider is jupiter", t.providerId === "jupiter", String(t.providerId));

// --- 4. The sanitizer's promise, checked on the wire. ------------------------------------------
console.log("\n--- sanitizer ---");
const flat = JSON.stringify(plan);
const leaked = (FORBIDDEN_EXECUTION_FIELDS ?? []).filter((f) => f !== "unsignedTransaction" && flat.includes(`"${f}"`));
check("no forbidden field on the wire", leaked.length === 0, leaked.join(","));

// --- 4b. The browser client's own validation, run on what actually arrived. ---------------------
console.log("\n--- client validation ---");
check("the live plan passes validateExecutionPlan", validateExecutionPlan(plan) === null,
  String(validateExecutionPlan(plan)));
check("a plan carrying a signature is refused",
  validateExecutionPlan({ ...plan, signature: "abc" }) === "forbidden_field_in_plan");
check("a plan with a second transaction is refused",
  validateExecutionPlan({ ...plan, setupTransaction: "AQAB" }) === "forbidden_field_in_plan");
check("a minimum above the expected output is refused",
  validateExecutionPlan({ ...plan, terms: { ...plan.terms, minimumOutputTokens: "999999" } }) === "invalid_plan");
check("an unparseable expiry is refused",
  validateExecutionPlan({ ...plan, expiresAt: "soon" }) === "invalid_plan");
check("an empty transaction is refused",
  validateExecutionPlan({ ...plan, unsignedTransaction: "" }) === "invalid_plan");

// --- 5. Structural verification — the check the confirm step runs before signing. --------------
console.log("\n--- structural verification ---");
const structural = verifyTransactionStructure(plan.unsignedTransaction, TAKER);
check("structure accepted", structural.ok === true, structural.ok ? "" : `${structural.reason} ${structural.detail ?? ""}`);
if (structural.ok) {
  line("programs invoked", String(structural.programIds.length));
  line("lookup tables", String(lookupTableAddresses(structural.transaction).length));
  const wrongTaker = verifyTransactionStructure(plan.unsignedTransaction, USDC.slice(0, 44));
  check("negative control: wrong taker is refused", wrongTaker.ok === false, wrongTaker.ok ? "accepted!" : wrongTaker.reason);
}

await on.close();

console.log(failures === 0
  ? "\nLIVE EXECUTE SMOKE: PASS — a real unsigned plan was built, sanitized and structurally verified."
  : `\nLIVE EXECUTE SMOKE: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
