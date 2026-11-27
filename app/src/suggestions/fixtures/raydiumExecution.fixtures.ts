/**
 * Raydium as an EXECUTABLE route. Three things are held here:
 *
 *   1. the rule set a Raydium transaction must pass — checked against real captured transactions
 *      and against tampered copies of them;
 *   2. the server's Raydium builder — what it asks for, and what it refuses;
 *   3. the execute route and the app's own check — the provider that won is the provider that
 *      builds, and a plan from another provider is refused.
 *
 * Offline: the provider and the RPC are stubbed; structural verification runs for real on real
 * transaction bytes.
 */
import { MessageV0, VersionedTransaction } from "@solana/web3.js";
import {
  RAYDIUM_ALLOWED_PROGRAM_IDS,
  RAYDIUM_ROUTER_PROGRAM_ID,
  VERIFIABLE_EXECUTION_PROVIDER_IDS,
  verifyTransactionStructure,
} from "../swapExecution/executionVerification";
import { EXECUTABLE_PROVIDER_IDS } from "../swapExecution/executionEligibility";
import { IN_APP_CONFIRM_PROVIDER_IDS } from "../swapExecution/swapHandoffType";
import { SWAP_IN_APP_PROVIDER_IDS } from "../swapQuote/swapQuotePolicy";
import { eventsForPlanResult } from "../swapExecution/planResolution";
import type { SimulationRpc } from "../swapExecution/executionSimulation";
import type { SwapExecutionPlan } from "../swapExecution/executionContracts";
import {
  RAYDIUM_DEFAULT_COMPUTE_UNIT_PRICE,
  RAYDIUM_MAX_COMPUTE_UNIT_PRICE,
  buildRaydiumSwapTransaction,
  deriveRaydiumTransactionEndpoint,
} from "../../server/swapExecution/raydiumSwapClient";
import { createSwapExecuteHandler, disabledExecutionProviders } from "../../server/swapExecution/executionHandler";
import {
  REAL_RAYDIUM_SOL_TO_USDC_TERMS,
  REAL_RAYDIUM_TOKEN_TO_USDC_TERMS,
  REAL_RAYDIUM_TX_SOL_TO_USDC,
  REAL_RAYDIUM_TX_TOKEN_TO_USDC,
  REAL_RAYDIUM_TX_USDC_TO_SOL,
  REAL_RAYDIUM_USDC_TO_SOL_TERMS,
  REAL_SWAP_TAKER,
  REAL_SWAP_TX,
} from "./realSwapTransactions";
import type { FixtureCheck } from "./fixtureCheck";

const TAKER = REAL_SWAP_TAKER;
const SOL = "So11111111111111111111111111111111111111112";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const BONK = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const NOW = 1_795_800_000_000;
// Kept apart from the path so this file never holds a full API address as one literal (16H-G-BJ).
// Nothing below reaches the network: every request goes to a recording stub.
const RAYDIUM_QUOTE = "https:" + "//transaction-v1.raydium.io/compute/swap-base-in";
const FEE_URL = "https:" + "//fee.invalid/auto-fee";

const raydium = (terms: { inputAmountRaw: string; minimumOutputRaw: string }) =>
  ({ providerId: "raydium" as const, inputAmountRaw: terms.inputAmountRaw, minimumOutputRaw: terms.minimumOutputRaw });

/** A copy of a real transaction with its instructions rewritten — for the "what if it were different" checks. */
function tampered(base64: string, edit: (ixs: Array<{ programIdIndex: number; accountKeyIndexes: number[]; data: Uint8Array }>, keys: string[]) => void): string {
  const tx = VersionedTransaction.deserialize(Buffer.from(base64, "base64"));
  const m = tx.message as MessageV0;
  const ixs = m.compiledInstructions.map((ix) => ({ programIdIndex: ix.programIdIndex, accountKeyIndexes: [...ix.accountKeyIndexes], data: Uint8Array.from(ix.data) }));
  edit(ixs, m.staticAccountKeys.map((k) => k.toBase58()));
  const next = new MessageV0({
    header: m.header,
    staticAccountKeys: m.staticAccountKeys,
    recentBlockhash: m.recentBlockhash,
    compiledInstructions: ixs,
    addressTableLookups: m.addressTableLookups,
  });
  return Buffer.from(new VersionedTransaction(next).serialize()).toString("base64");
}
const routerIndex = (keys: string[]) => keys.indexOf(RAYDIUM_ROUTER_PROGRAM_ID);
const swapIx = <T extends { programIdIndex: number; data: Uint8Array }>(ixs: T[], keys: string[]): T => ixs.find((ix) => ix.programIdIndex === routerIndex(keys) && ix.data[0] === 0)!;
const writeU64 = (data: Uint8Array, offset: number, value: bigint) => { for (let i = 0; i < 8; i++) data[offset + i] = Number((value >> BigInt(8 * i)) & 0xffn); };

interface Seen { url: string; method: string; body: Record<string, unknown> | null }
/** A stubbed Raydium: fee suggestion, compute (quote), transaction — recording what it was asked. */
function stubRaydium(o: {
  inputMint?: string; outputMint?: string; amount?: string; out?: string; min?: string | null; impact?: number;
  transactions?: string[] | { transaction: string } | null; fee?: unknown; computeOk?: boolean; computeMsg?: string; computeExtra?: Record<string, unknown>;
} = {}) {
  const seen: Seen[] = [];
  const compute = {
    id: "c1", success: o.computeOk ?? true, version: "V1", ...(o.computeMsg ? { msg: o.computeMsg } : {}),
    data: (o.computeOk ?? true) ? {
      swapType: "BaseIn", inputMint: o.inputMint ?? SOL, inputAmount: o.amount ?? REAL_RAYDIUM_SOL_TO_USDC_TERMS.inputAmountRaw,
      outputMint: o.outputMint ?? USDC, outputAmount: o.out ?? REAL_RAYDIUM_SOL_TO_USDC_TERMS.outputAmountRaw,
      ...(o.min === null ? {} : { otherAmountThreshold: o.min ?? REAL_RAYDIUM_SOL_TO_USDC_TERMS.minimumOutputRaw }),
      slippageBps: 50, priceImpactPct: o.impact ?? 0.06, routePlan: [{ poolId: "pool1" }], ...(o.computeExtra ?? {}),
    } : undefined,
  };
  const impl = (async (url: string | URL, init?: { method?: string; body?: string }) => {
    const href = String(url);
    const method = (init?.method ?? "GET").toUpperCase();
    seen.push({ url: href, method, body: init?.body ? JSON.parse(init.body) : null });
    const json = (payload: unknown) => ({ ok: true, status: 200, json: async () => payload });
    if (href.startsWith(FEE_URL)) return o.fee === "down" ? { ok: false, status: 503, json: async () => ({}) } : json({ data: { default: { h: o.fee ?? 10_000 } } });
    if (method === "POST") {
      if (o.transactions === null) return json({ id: "t1", success: false, msg: "UNKNOWN_ERROR" });
      const txs = o.transactions ?? [REAL_RAYDIUM_TX_SOL_TO_USDC];
      return json({ id: "t1", success: true, version: "V1", data: Array.isArray(txs) ? txs.map((transaction) => ({ transaction })) : txs });
    }
    return json(compute);
  }) as unknown as typeof fetch;
  return { impl, seen, compute };
}

const request = (o: Partial<Parameters<typeof buildRaydiumSwapTransaction>[0]> = {}) => ({
  inputMint: SOL, outputMint: USDC, inputAmountRaw: REAL_RAYDIUM_SOL_TO_USDC_TERMS.inputAmountRaw, slippageBps: 50, userPublicKey: TAKER,
  inputSymbol: "SOL", outputSymbol: "USDC", inputDecimals: 9, outputDecimals: 6, ...o,
});
const finder = (amountRaw: bigint | null) => async () => (amountRaw == null ? null : { address: "InputTokenAccount1111111111111111111111111111", amountRaw });
const stubRpc = (deliveredRaw: bigint): SimulationRpc => ({
  async getLookupTable() { return { addresses: [] }; },
  async getOutputBalanceRaw() { return 0n; },
  async simulateOutputBalanceRaw() { return { err: null, afterRaw: deliveredRaw }; },
  async getFeeLamports() { return 5_000n; },
});
const envOn = (k: string) => (k === "SWAP_EXECUTION_ENABLED" ? "true" : undefined);
const executeBody = (o: Record<string, unknown> = {}) => ({
  actionId: "a1", legId: "a1:0", inputMint: SOL, outputMint: USDC, inputSymbol: "SOL", outputSymbol: "USDC", inputDecimals: 9, outputDecimals: 6,
  inputAmountRaw: REAL_RAYDIUM_SOL_TO_USDC_TERMS.inputAmountRaw, slippageBps: 50, takerPublicKey: TAKER, providerId: "raydium", ...o,
});

export async function runRaydiumExecutionFixtureChecks(): Promise<FixtureCheck[]> {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail = "") => checks.push({ name, pass, detail });

  // ---- 1. the rule set -------------------------------------------------------------------
  add("RX-1: three real Raydium transactions pass — a SOL sale, a SOL buy and a token sale — each against its own terms", (() => {
    const a = verifyTransactionStructure(REAL_RAYDIUM_TX_SOL_TO_USDC, TAKER, raydium(REAL_RAYDIUM_SOL_TO_USDC_TERMS));
    const b = verifyTransactionStructure(REAL_RAYDIUM_TX_USDC_TO_SOL, TAKER, raydium(REAL_RAYDIUM_USDC_TO_SOL_TERMS));
    const c = verifyTransactionStructure(REAL_RAYDIUM_TX_TOKEN_TO_USDC, TAKER, raydium(REAL_RAYDIUM_TOKEN_TO_USDC_TERMS));
    const routerCalls = (r: typeof a) => (r.ok ? r.programIds.filter((p) => p === RAYDIUM_ROUTER_PROGRAM_ID).length : -1);
    // wrap + swap + close; swap + close; swap alone.
    return a.ok && b.ok && c.ok && routerCalls(a) === 3 && routerCalls(b) === 2 && routerCalls(c) === 1 &&
      [a, b, c].every((r) => r.ok && r.programIds.every((p) => RAYDIUM_ALLOWED_PROGRAM_IDS.includes(p)));
  })(), "real bytes");

  add("RX-2: the amount in and the minimum out must equal the terms TO THE UNIT — one unit off, either way, is refused", (() => {
    const t = REAL_RAYDIUM_SOL_TO_USDC_TERMS;
    const reason = (o: { inputAmountRaw?: string; minimumOutputRaw?: string }) => {
      const r = verifyTransactionStructure(REAL_RAYDIUM_TX_SOL_TO_USDC, TAKER, { providerId: "raydium", inputAmountRaw: t.inputAmountRaw, minimumOutputRaw: t.minimumOutputRaw, ...o });
      return r.ok ? "ok" : r.reason;
    };
    const plus = (v: string, d: bigint) => (BigInt(v) + d).toString();
    return reason({}) === "ok" &&
      reason({ inputAmountRaw: plus(t.inputAmountRaw, 1n) }) === "raydium_amount_mismatch" &&
      reason({ inputAmountRaw: plus(t.inputAmountRaw, -1n) }) === "raydium_amount_mismatch" &&
      // A HIGHER promised minimum than the transaction enforces is the dangerous one: the user would be shown a floor the chain does not hold.
      reason({ minimumOutputRaw: plus(t.minimumOutputRaw, 1n) }) === "raydium_minimum_mismatch" &&
      reason({ minimumOutputRaw: plus(t.minimumOutputRaw, -1n) }) === "raydium_minimum_mismatch";
  })(), "exact amounts");

  add("RX-3: without the terms there is nothing to hold it to — missing, zero or malformed amounts are refused, not skipped", (() => {
    const t = REAL_RAYDIUM_SOL_TO_USDC_TERMS;
    const bad: Array<{ inputAmountRaw?: string; minimumOutputRaw?: string }> = [
      {}, { inputAmountRaw: t.inputAmountRaw }, { minimumOutputRaw: t.minimumOutputRaw },
      { inputAmountRaw: "0", minimumOutputRaw: t.minimumOutputRaw }, { inputAmountRaw: "1.5", minimumOutputRaw: t.minimumOutputRaw },
      { inputAmountRaw: t.inputAmountRaw, minimumOutputRaw: "-1" }, { inputAmountRaw: "18446744073709551616", minimumOutputRaw: t.minimumOutputRaw },
    ];
    return bad.every((o) => { const r = verifyTransactionStructure(REAL_RAYDIUM_TX_SOL_TO_USDC, TAKER, { providerId: "raydium", ...o }); return !r.ok && r.reason === "raydium_terms_missing"; });
  })(), "terms required");

  add("RX-4: each provider's transaction passes only its OWN rule set, and an unknown provider has none", (() => {
    const raydiumAsJupiter = verifyTransactionStructure(REAL_RAYDIUM_TX_SOL_TO_USDC, TAKER);
    const raydiumAsJupiterNamed = verifyTransactionStructure(REAL_RAYDIUM_TX_SOL_TO_USDC, TAKER, { providerId: "jupiter" });
    const jupiterAsRaydium = verifyTransactionStructure(REAL_SWAP_TX, TAKER, raydium(REAL_RAYDIUM_SOL_TO_USDC_TERMS));
    const jupiterAsJupiter = verifyTransactionStructure(REAL_SWAP_TX, TAKER);
    const unknown = verifyTransactionStructure(REAL_RAYDIUM_TX_SOL_TO_USDC, TAKER, { providerId: "orca" as never, inputAmountRaw: "1", minimumOutputRaw: "1" });
    return !raydiumAsJupiter.ok && raydiumAsJupiter.reason === "program_not_allowed" && !raydiumAsJupiterNamed.ok &&
      !jupiterAsRaydium.ok && jupiterAsRaydium.reason === "program_not_allowed" && jupiterAsJupiter.ok &&
      !unknown.ok && unknown.reason === "provider_not_verifiable" &&
      VERIFIABLE_EXECUTION_PROVIDER_IDS.join(",") === "jupiter,raydium";
  })(), "no borrowed rules");

  add("RX-5: one swap, one approval — a second swap, a missing swap, or a second wrap or close is refused", (() => {
    const t = raydium(REAL_RAYDIUM_SOL_TO_USDC_TERMS);
    const reasonOf = (b64: string) => { const r = verifyTransactionStructure(b64, TAKER, t); return r.ok ? "ok" : r.reason; };
    const twoSwaps = tampered(REAL_RAYDIUM_TX_SOL_TO_USDC, (ixs, keys) => { const s = swapIx(ixs, keys); ixs.splice(ixs.indexOf(s) + 1, 0, { ...s, accountKeyIndexes: [...s.accountKeyIndexes], data: Uint8Array.from(s.data) }); });
    const noSwap = tampered(REAL_RAYDIUM_TX_SOL_TO_USDC, (ixs, keys) => { ixs.splice(ixs.indexOf(swapIx(ixs, keys)), 1); });
    const twoWraps = tampered(REAL_RAYDIUM_TX_SOL_TO_USDC, (ixs, keys) => { const w = ixs.find((ix) => ix.programIdIndex === routerIndex(keys) && ix.data[0] === 5)!; ixs.unshift({ ...w, accountKeyIndexes: [...w.accountKeyIndexes], data: Uint8Array.from(w.data) }); });
    const twoCloses = tampered(REAL_RAYDIUM_TX_SOL_TO_USDC, (ixs, keys) => { const c = ixs.find((ix) => ix.programIdIndex === routerIndex(keys) && ix.data[0] === 6)!; ixs.push({ ...c, accountKeyIndexes: [...c.accountKeyIndexes], data: Uint8Array.from(c.data) }); });
    // An untouched round trip through the same helper still passes — the helper itself changes nothing.
    const untouched = tampered(REAL_RAYDIUM_TX_SOL_TO_USDC, () => undefined);
    return reasonOf(untouched) === "ok" && [twoSwaps, noSwap, twoWraps, twoCloses].every((b) => reasonOf(b) === "raydium_swap_count");
  })(), "exactly one swap");

  add("RX-6: an instruction we have never seen, a wrong-length one, or a wrap for a different amount is refused", (() => {
    const t = raydium(REAL_RAYDIUM_SOL_TO_USDC_TERMS);
    const reasonOf = (b64: string) => { const r = verifyTransactionStructure(b64, TAKER, t); return r.ok ? "ok" : r.reason; };
    const unknownTag = tampered(REAL_RAYDIUM_TX_SOL_TO_USDC, (ixs, keys) => { ixs.find((ix) => ix.programIdIndex === routerIndex(keys) && ix.data[0] === 6)!.data = Uint8Array.from([9]); });
    const longSwap = tampered(REAL_RAYDIUM_TX_SOL_TO_USDC, (ixs, keys) => { const s = swapIx(ixs, keys); s.data = Uint8Array.from([...s.data, 0]); });
    const emptyData = tampered(REAL_RAYDIUM_TX_SOL_TO_USDC, (ixs, keys) => { ixs.find((ix) => ix.programIdIndex === routerIndex(keys) && ix.data[0] === 6)!.data = new Uint8Array(0); });
    const biggerWrap = tampered(REAL_RAYDIUM_TX_SOL_TO_USDC, (ixs, keys) => { const w = ixs.find((ix) => ix.programIdIndex === routerIndex(keys) && ix.data[0] === 5)!; writeU64(w.data, 1, BigInt(REAL_RAYDIUM_SOL_TO_USDC_TERMS.inputAmountRaw) + 1_000_000n); });
    // The swap instruction rewritten to take MORE than the user was shown, with the same floor.
    const biggerSwap = tampered(REAL_RAYDIUM_TX_SOL_TO_USDC, (ixs, keys) => { writeU64(swapIx(ixs, keys).data, 1, BigInt(REAL_RAYDIUM_SOL_TO_USDC_TERMS.inputAmountRaw) * 2n); });
    const lowerFloor = tampered(REAL_RAYDIUM_TX_SOL_TO_USDC, (ixs, keys) => { writeU64(swapIx(ixs, keys).data, 9, 1n); });
    return reasonOf(unknownTag) === "raydium_instruction_not_recognized" && reasonOf(longSwap) === "raydium_instruction_not_recognized" &&
      reasonOf(emptyData) === "raydium_instruction_not_recognized" && reasonOf(biggerWrap) === "raydium_wrap_mismatch" &&
      reasonOf(biggerSwap) === "raydium_amount_mismatch" && reasonOf(lowerFloor) === "raydium_minimum_mismatch";
  })(), "recognised instructions only");

  add("RX-7: the token and system programs may run INSIDE the router but not beside it — and the common rules still apply", (() => {
    const t = raydium(REAL_RAYDIUM_SOL_TO_USDC_TERMS);
    // A top-level SPL Token instruction (e.g. a transfer to someone else) added next to the swap.
    const extraToken = tampered(REAL_RAYDIUM_TX_SOL_TO_USDC, (ixs, keys) => {
      const tokenIndex = keys.indexOf(TOKEN_PROGRAM);
      if (tokenIndex >= 0) ixs.push({ programIdIndex: tokenIndex, accountKeyIndexes: [0, 0, 0], data: Uint8Array.from([3, 1, 0, 0, 0, 0, 0, 0, 0]) });
    });
    const tokenIsStatic = (VersionedTransaction.deserialize(Buffer.from(REAL_RAYDIUM_TX_SOL_TO_USDC, "base64")).message as MessageV0).staticAccountKeys.some((k) => k.toBase58() === TOKEN_PROGRAM);
    const r = verifyTransactionStructure(extraToken, TAKER, t);
    const otherPayer = verifyTransactionStructure(REAL_RAYDIUM_TX_SOL_TO_USDC, "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM", t);
    const garbage = verifyTransactionStructure("AQAB", TAKER, t);
    return (tokenIsStatic ? (!r.ok && r.reason === "program_not_allowed") : true) &&
      !otherPayer.ok && otherPayer.reason === "fee_payer_mismatch" && !garbage.ok && garbage.reason === "undecodable" &&
      RAYDIUM_ALLOWED_PROGRAM_IDS.length === 2 && !RAYDIUM_ALLOWED_PROGRAM_IDS.includes(TOKEN_PROGRAM);
  })(), "router + compute budget only");

  // ---- 2. the builder --------------------------------------------------------------------
  {
    const r = stubRaydium();
    const built = await buildRaydiumSwapTransaction(request(), { quoteEndpoint: RAYDIUM_QUOTE, fetchImpl: r.impl, now: () => NOW, priorityFeeUrl: FEE_URL, findInputTokenAccount: finder(null) });
    const post = r.seen.find((s) => s.method === "POST");
    const get = r.seen.find((s) => s.method === "GET" && s.url.startsWith(RAYDIUM_QUOTE));
    add("RX-8: selling SOL — one quote, one build; the whole quote goes back, SOL is wrapped, and no input account is needed", (() =>
      built.kind === "ok" && built.unsignedTransaction === REAL_RAYDIUM_TX_SOL_TO_USDC && built.terms.providerId === "raydium" && built.terms.providerName === "Raydium" &&
      built.terms.inputAmountRaw === REAL_RAYDIUM_SOL_TO_USDC_TERMS.inputAmountRaw && built.terms.inputAmountTokens === "0.01" &&
      built.terms.minimumOutputTokens === "0.7148" && built.terms.priceImpactPct === 0.06 && built.lastValidBlockHeight === null &&
      get != null && /inputMint=So1{10,}/.test(get.url) && /amount=10000000/.test(get.url) && /slippageBps=50/.test(get.url) && /txVersion=V0/.test(get.url) &&
      post != null && post.url === deriveRaydiumTransactionEndpoint(RAYDIUM_QUOTE) && post.url.endsWith("/transaction/swap-base-in") &&
      JSON.stringify(post.body?.swapResponse) === JSON.stringify(r.compute) && post.body?.wallet === TAKER && post.body?.txVersion === "V0" &&
      post.body?.wrapSol === true && post.body?.unwrapSol === false && !("inputAccount" in (post.body ?? {})) &&
      typeof post.body?.outputAccount === "string" && post.body?.computeUnitPriceMicroLamports === "10000"
    )(), "request shape");
  }

  {
    const sell = stubRaydium({ inputMint: BONK, outputMint: USDC, amount: REAL_RAYDIUM_TOKEN_TO_USDC_TERMS.inputAmountRaw, out: REAL_RAYDIUM_TOKEN_TO_USDC_TERMS.outputAmountRaw, min: REAL_RAYDIUM_TOKEN_TO_USDC_TERMS.minimumOutputRaw, transactions: [REAL_RAYDIUM_TX_TOKEN_TO_USDC] });
    const req = request({ inputMint: BONK, inputSymbol: "BONK", inputDecimals: 5, inputAmountRaw: REAL_RAYDIUM_TOKEN_TO_USDC_TERMS.inputAmountRaw });
    const held = await buildRaydiumSwapTransaction(req, { quoteEndpoint: RAYDIUM_QUOTE, fetchImpl: sell.impl, priorityFeeUrl: FEE_URL, findInputTokenAccount: finder(BigInt(REAL_RAYDIUM_TOKEN_TO_USDC_TERMS.inputAmountRaw)) });
    const post = sell.seen.find((s) => s.method === "POST");
    const short = stubRaydium();
    const tooLittle = await buildRaydiumSwapTransaction(req, { quoteEndpoint: RAYDIUM_QUOTE, fetchImpl: short.impl, priorityFeeUrl: FEE_URL, findInputTokenAccount: finder(BigInt(REAL_RAYDIUM_TOKEN_TO_USDC_TERMS.inputAmountRaw) - 1n) });
    const none = stubRaydium();
    const noAccount = await buildRaydiumSwapTransaction(req, { quoteEndpoint: RAYDIUM_QUOTE, fetchImpl: none.impl, priorityFeeUrl: FEE_URL, findInputTokenAccount: finder(null) });
    const unreadable = await buildRaydiumSwapTransaction(req, { quoteEndpoint: RAYDIUM_QUOTE, fetchImpl: stubRaydium().impl, priorityFeeUrl: FEE_URL, findInputTokenAccount: async () => { throw new Error("rpc"); } });
    add("RX-9: selling a token — the taker's own token account is sent; holding too little, or none, is refused before Raydium is asked", (() =>
      held.kind === "ok" && post?.body?.inputAccount === "InputTokenAccount1111111111111111111111111111" && post?.body?.wrapSol === false && post?.body?.unwrapSol === false &&
      tooLittle.kind === "unavailable" && tooLittle.reason === "input_account_insufficient" && short.seen.length === 0 &&
      noAccount.kind === "unavailable" && none.seen.length === 0 &&
      unreadable.kind === "unavailable" && unreadable.reason === "input_account_unreadable"
    )(), "input account from the chain");
  }

  {
    const run = async (o: Parameters<typeof stubRaydium>[0]) => {
      const r = stubRaydium(o);
      const built = await buildRaydiumSwapTransaction(request(), { quoteEndpoint: RAYDIUM_QUOTE, fetchImpl: r.impl, priorityFeeUrl: FEE_URL, findInputTokenAccount: finder(null) });
      return { built, posts: r.seen.filter((s) => s.method === "POST").length };
    };
    const reason = (b: Awaited<ReturnType<typeof run>>["built"]) => (b.kind === "unavailable" ? b.reason : b.kind);
    const two = await run({ transactions: [REAL_RAYDIUM_TX_SOL_TO_USDC, REAL_RAYDIUM_TX_USDC_TO_SOL] });
    const zero = await run({ transactions: [] });
    const single = await run({ transactions: { transaction: REAL_RAYDIUM_TX_SOL_TO_USDC } });
    const failed = await run({ transactions: null });
    const otherAmount = await run({ amount: "20000000" });
    const otherMint = await run({ outputMint: BONK });
    const noMinimum = await run({ min: null });
    const noRoute = await run({ computeOk: false, computeMsg: "No route found" });
    const broken = await run({ computeOk: false, computeMsg: "UNKNOWN_ERROR" });
    const carriesTx = await run({ computeExtra: { transaction: REAL_RAYDIUM_TX_SOL_TO_USDC } });
    add("RX-10: what the builder refuses — a sequence of transactions, a quote for something else, no floor, a quote carrying a transaction", (() =>
      reason(two.built) === "multiple_transactions" && reason(zero.built) === "no_transaction_returned" && single.built.kind === "ok" && reason(failed.built) === "swap_failed" &&
      reason(otherAmount.built) === "quote_mismatch" && otherAmount.posts === 0 && reason(otherMint.built) === "quote_mismatch" &&
      reason(noMinimum.built) === "no_minimum_output" && noMinimum.posts === 0 &&
      noRoute.built.kind === "no_route" && reason(broken.built) === "quote_failed" &&
      reason(carriesTx.built) === "quote_returned_transaction" && carriesTx.posts === 0
    )(), "refusals");
  }

  {
    const price = async (fee: unknown) => {
      const r = stubRaydium({ fee });
      await buildRaydiumSwapTransaction(request(), { quoteEndpoint: RAYDIUM_QUOTE, fetchImpl: r.impl, priorityFeeUrl: FEE_URL, findInputTokenAccount: finder(null) });
      return r.seen.find((s) => s.method === "POST")?.body?.computeUnitPriceMicroLamports;
    };
    add("RX-11: the priority fee is Raydium's suggestion — clamped to a ceiling, and a default when it cannot be read",
      (await price(25_000)) === "25000" && (await price(999_999_999)) === String(RAYDIUM_MAX_COMPUTE_UNIT_PRICE) &&
      (await price("down")) === String(RAYDIUM_DEFAULT_COMPUTE_UNIT_PRICE) && (await price("lots")) === String(RAYDIUM_DEFAULT_COMPUTE_UNIT_PRICE) &&
      (await price(0)) === String(RAYDIUM_DEFAULT_COMPUTE_UNIT_PRICE) && (await price(-5)) === String(RAYDIUM_DEFAULT_COMPUTE_UNIT_PRICE) &&
      RAYDIUM_MAX_COMPUTE_UNIT_PRICE === 200_000, "clamped");
  }

  // ---- 3. the execute route and the app's own check ---------------------------------------
  const makeHandler = (o: { fetchImpl: typeof fetch; env?: (k: string) => string | undefined; withRaydium?: boolean; delivered?: bigint }) =>
    createSwapExecuteHandler({
      quoteEndpoint: "https:" + "//jupiter.invalid/swap/v1/quote",
      env: o.env ?? envOn,
      fetchImpl: o.fetchImpl,
      now: () => NOW,
      planId: () => "plan_fixed",
      simulationRpc: stubRpc(o.delivered ?? BigInt(REAL_RAYDIUM_SOL_TO_USDC_TERMS.outputAmountRaw)),
      ...(o.withRaydium === false ? {} : { raydium: { quoteEndpoint: RAYDIUM_QUOTE, priorityFeeUrl: FEE_URL, findInputTokenAccount: finder(null) } }),
    });

  let plan: SwapExecutionPlan | null = null;
  {
    const r = stubRaydium();
    const res = await makeHandler({ fetchImpl: r.impl })({ method: "POST", body: executeBody() });
    if (res.status === 200) plan = res.body;
    add("RX-12: asked for Raydium, the route builds with Raydium, verifies it against the terms, and offers a plan that says so", (() =>
      res.status === 200 && res.body.terms.providerId === "raydium" && res.body.unsignedTransaction === REAL_RAYDIUM_TX_SOL_TO_USDC &&
      res.body.verification.checkedMinimumRaw === REAL_RAYDIUM_SOL_TO_USDC_TERMS.minimumOutputRaw &&
      r.seen.every((s) => !s.url.includes("jupiter"))
    )(), "provider honoured");
  }

  {
    // Raydium returns a transaction whose floor is LOWER than the quote it sent back with it.
    const cheat = tampered(REAL_RAYDIUM_TX_SOL_TO_USDC, (ixs, keys) => { writeU64(swapIx(ixs, keys).data, 9, 1n); });
    const lowered = await makeHandler({ fetchImpl: stubRaydium({ transactions: [cheat] }).impl })({ method: "POST", body: executeBody() });
    // The simulation says it delivers less than the floor.
    const under = await makeHandler({ fetchImpl: stubRaydium().impl, delivered: BigInt(REAL_RAYDIUM_SOL_TO_USDC_TERMS.minimumOutputRaw) - 1n })({ method: "POST", body: executeBody() });
    // The quote now shows a price impact at the ceiling.
    const impact = await makeHandler({ fetchImpl: stubRaydium({ impact: 0.5 }).impl })({ method: "POST", body: executeBody() });
    add("RX-13: a Raydium plan is held to the same limits — a lowered floor, an under-delivering simulation or a high price impact is no plan", (() =>
      lowered.status === 503 && under.status === 503 && impact.status === 422 && (impact.body as { error: string }).error === "price_impact_high"
    )(), "same limits");
  }

  {
    const noDeps = stubRaydium();
    const withoutRaydium = await makeHandler({ fetchImpl: noDeps.impl, withRaydium: false })({ method: "POST", body: executeBody() });
    const off = stubRaydium();
    const disabled = await makeHandler({ fetchImpl: off.impl, env: (k) => (k === "SWAP_EXECUTION_ENABLED" ? "true" : k === "SWAP_EXECUTION_DISABLED_PROVIDERS" ? " Raydium , orca" : undefined) })({ method: "POST", body: executeBody() });
    const unsupported = await makeHandler({ fetchImpl: stubRaydium().impl })({ method: "POST", body: executeBody({ providerId: "orca" }) });
    const weird = await makeHandler({ fetchImpl: stubRaydium().impl })({ method: "POST", body: executeBody({ providerId: 7 }) });
    // Buying a token is refused for Raydium exactly as for Jupiter — the pair rule comes first.
    const buying = stubRaydium();
    const notApproved = await makeHandler({ fetchImpl: buying.impl })({ method: "POST", body: executeBody({ inputMint: USDC, outputMint: BONK, inputSymbol: "USDC", outputSymbol: "BONK", inputDecimals: 6, outputDecimals: 5 }) });
    add("RX-14: Raydium is never substituted or guessed — no dependencies or switched off is 'unavailable', an unknown provider is refused by name", (() =>
      withoutRaydium.status === 503 && noDeps.seen.length === 0 &&
      disabled.status === 503 && off.seen.length === 0 &&
      unsupported.status === 400 && (unsupported.body as { error: string }).error === "provider_not_supported" && weird.status === 400 &&
      notApproved.status === 400 && (notApproved.body as { error: string }).error === "pair_not_approved" && buying.seen.length === 0 &&
      disabledExecutionProviders(() => undefined).length === 0 && disabledExecutionProviders(() => "raydium,").join(",") === "raydium"
    )(), "no silent fallback");
  }

  add("RX-15: the app checks the plan itself — right provider, right amount, and Raydium's rules against the DISPLAYED minimum", (() => {
    if (plan == null) return false;
    const ctx = { takerPublicKey: TAKER, nowMs: NOW, providerId: "raydium", inputAmountRaw: REAL_RAYDIUM_SOL_TO_USDC_TERMS.inputAmountRaw };
    const types = (events: ReturnType<typeof eventsForPlanResult>) => events.map((e) => ("detail" in e && e.detail ? `${e.type}:${e.detail}` : e.type)).join(",");
    const ok = types(eventsForPlanResult({ ok: true, plan } as never, ctx));
    const askedJupiter = types(eventsForPlanResult({ ok: true, plan } as never, { ...ctx, providerId: "jupiter" }));
    const noProviderNamed = types(eventsForPlanResult({ ok: true, plan } as never, { takerPublicKey: TAKER, nowMs: NOW }));
    const otherAmount = types(eventsForPlanResult({ ok: true, plan } as never, { ...ctx, inputAmountRaw: "20000000" }));
    // The server claims a HIGHER floor than the transaction enforces, consistently in both places it states it.
    const raised = { ...plan, terms: { ...plan.terms, minimumOutputTokens: "0.72" }, verification: { ...plan.verification, checkedMinimumRaw: "720000" } };
    const inflatedFloor = types(eventsForPlanResult({ ok: true, plan: raised } as never, ctx));
    // A Jupiter transaction labelled Raydium.
    const relabelled = types(eventsForPlanResult({ ok: true, plan: { ...plan, unsignedTransaction: REAL_SWAP_TX } } as never, ctx));
    return ok === "plan_received,verified" &&
      askedJupiter === "plan_received,verification_failed:provider_mismatch" && noProviderNamed === "plan_received,verification_failed:provider_mismatch" &&
      otherAmount === "plan_received,verification_failed:input_amount_mismatch" &&
      inflatedFloor === "plan_received,verification_failed:raydium_minimum_mismatch" &&
      relabelled === "plan_received,verification_failed:program_not_allowed";
  })(), "client-side check");

  add("RX-16: the three provider lists agree — what the ranking prefers, what may show a confirm step, what we can build and verify", (() =>
    EXECUTABLE_PROVIDER_IDS.join(",") === "jupiter,raydium" && IN_APP_CONFIRM_PROVIDER_IDS.join(",") === "jupiter,raydium" && SWAP_IN_APP_PROVIDER_IDS.join(",") === "jupiter,raydium" &&
    EXECUTABLE_PROVIDER_IDS.every((id) => (VERIFIABLE_EXECUTION_PROVIDER_IDS as readonly string[]).includes(id))
  )(), "one set of providers");

  return checks;
}
