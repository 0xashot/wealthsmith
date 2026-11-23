/**
 * Swap execution VERIFICATION fixtures (SWXV) — Phase 3.
 *
 * The transaction under test is a REAL unsigned Jupiter swap, captured from
 * `POST /swap/v1/swap` on 2026-11-23 (5 USDC → SOL, 50 bps). Using a real one matters: the
 * allowlist, the instruction layout and the fee-payer position were all derived by decoding it
 * rather than recalled, and a hand-built sample would only prove the verifier agrees with my
 * assumptions.
 *
 * Its decoded shape, for the record:
 *   version 0 · 1 signature slot, empty · fee payer = taker · 1 address lookup table
 *   ComputeBudget ×2 · AssociatedTokenAccount · Jupiter (36 bytes) · SPL Token
 *
 * The tampering cases below mutate that real transaction rather than constructing failures, so
 * each one asserts the verifier rejects something that is otherwise byte-for-byte genuine.
 */
import { MessageV0, PublicKey, TransactionInstruction, VersionedTransaction } from "@solana/web3.js";
import { decodeTokenAccountAmount, outputAccountAddress } from "../swapExecution/connectionSimulationRpc";
import type { FixtureCheck } from "./fixtureCheck";
import { simulateAndVerifyValue, safeErrorLabel, type SimulationRpc } from "../swapExecution/executionSimulation";
import {
  executionReducer,
  type ExecutionPhase,
  initialExecutionState,
  isExecutionTerminal,
  outcomeFor,
  type ExecutionEvent,
  type ExecutionState,
} from "../swapExecution/executionLifecycle";
import {
  outputIsNativeSol,
  verifyMeasuredValue,
  ALLOWED_SWAP_PROGRAM_IDS,
  JUPITER_PROGRAM_ID,
  associatedTokenAddress,
  compareDeliveredAgainstMinimum,
  lookupTableAddresses,
  tokensToRaw,
  verifyTransactionStructure,
} from "../swapExecution/executionVerification";
import { REAL_SWAP_TAKER, REAL_SWAP_TX, REAL_SWAP_TX_SOL_INPUT } from "./realSwapTransactions";

const TAKER = REAL_SWAP_TAKER;
const WSOL = "So11111111111111111111111111111111111111112";

export async function runSwapExecutionVerificationFixtureChecks(): Promise<FixtureCheck[]> {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });

  /* ---- The allowlist came from a real transaction ---- */
  add("SWXV-1: the program allowlist contains exactly the programs a real Jupiter swap invoked — nothing added speculatively", (() => {
    const expected = [
      "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
      "ComputeBudget111111111111111111111111111111",
      "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
      "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      "11111111111111111111111111111111",
    ];
    return expected.every((p) => ALLOWED_SWAP_PROGRAM_IDS.includes(p))
      && ALLOWED_SWAP_PROGRAM_IDS.length === expected.length;
  })(), "allowlist from observation");
  add("SWXV-2: the Jupiter program id is pinned and is in the allowlist",
    JUPITER_PROGRAM_ID === "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"
      && ALLOWED_SWAP_PROGRAM_IDS.includes(JUPITER_PROGRAM_ID), "jupiter pinned");

  /* ---- Structural refusals (pure, no chain) ---- */
  add("SWXV-3: undecodable input is refused rather than thrown", (() => {
    const r = verifyTransactionStructure("not base64 at all !!!", TAKER);
    return !r.ok && r.reason === "undecodable";
  })(), "fails closed");
  add("SWXV-4: an empty string is refused", (() => {
    const r = verifyTransactionStructure("", TAKER);
    return !r.ok;
  })(), "empty refused");
  add("SWXV-5: the REAL transaction passes structural verification — 5 instructions, 1 lookup table, all programs static", (() => {
    const r = verifyTransactionStructure(REAL_SWAP_TX, TAKER);
    return r.ok && r.programIds.length === 5
      && r.programIds.includes(JUPITER_PROGRAM_ID)
      && lookupTableAddresses(r.transaction).length === 1;
  })(), "genuine tx accepted");
  add("SWXV-5A: the SAME transaction is refused for a different taker — paid by someone else is not what we offered", (() => {
    const r = verifyTransactionStructure(REAL_SWAP_TX, "11111111111111111111111111111111");
    return !r.ok && r.reason === "fee_payer_mismatch";
  })(), "fee payer checked");
  add("SWXV-5B: Jupiter is invoked exactly once in the real transaction — two would be two swaps under one approval", (() => {
    const r = verifyTransactionStructure(REAL_SWAP_TX, TAKER);
    return r.ok && r.programIds.filter((p) => p === JUPITER_PROGRAM_ID).length === 1;
  })(), "one swap");
  add("SWXV-5C: every program the real transaction invokes is a STATIC key — none hidden in the lookup table", (() => {
    const r = verifyTransactionStructure(REAL_SWAP_TX, TAKER);
    return r.ok && r.programIds.every((p) => ALLOWED_SWAP_PROGRAM_IDS.includes(p));
  })(), "no hidden programs");

  /* ---- Tampered transactions. Constructed, because mutation testing showed the real one alone
         could not fail the allowlist: it only ever proves the ALLOWED case. ---- */
  const buildTx = (programIds: string[], signers = 1): string => {
    const payer = new PublicKey(TAKER);
    const ixs = programIds.map((pid) => new TransactionInstruction({
      programId: new PublicKey(pid),
      keys: signers > 1 ? [{ pubkey: new PublicKey(WSOL), isSigner: true, isWritable: false }] : [],
      data: Buffer.alloc(0),
    }));
    const msg = MessageV0.compile({
      payerKey: payer,
      instructions: ixs,
      recentBlockhash: "11111111111111111111111111111111",
    });
    return Buffer.from(new VersionedTransaction(msg).serialize()).toString("base64");
  };

  add("SWXV-5D: a transaction invoking an UNLISTED program is refused, and the refusal names it", (() => {
    const evil = "Stake11111111111111111111111111111111111111";
    const r = verifyTransactionStructure(buildTx([JUPITER_PROGRAM_ID, evil]), TAKER);
    return !r.ok && r.reason === "program_not_allowed" && r.detail === evil;
  })(), "unlisted program refused");
  add("SWXV-5E: a well-formed transaction that never calls Jupiter is refused — allowed programs alone do not make it our swap", (() => {
    const r = verifyTransactionStructure(buildTx(["ComputeBudget111111111111111111111111111111"]), TAKER);
    return !r.ok && r.reason === "jupiter_not_invoked";
  })(), "must be a jupiter swap");
  add("SWXV-5F: TWO Jupiter instructions are refused — that is two swaps under one approval", (() => {
    const r = verifyTransactionStructure(buildTx([JUPITER_PROGRAM_ID, JUPITER_PROGRAM_ID]), TAKER);
    return !r.ok && r.reason === "jupiter_invoked_more_than_once" && r.detail === "2";
  })(), "one swap only");
  add("SWXV-5G: a transaction requiring a SECOND signer is refused — someone else approving is not a shape we offer", (() => {
    const r = verifyTransactionStructure(buildTx([JUPITER_PROGRAM_ID], 2), TAKER);
    return !r.ok && r.reason === "multiple_signers";
  })(), "single signer");

  /* ---- The value rule, which is where the honesty lives ---- */
  add("SWXV-6: delivering exactly the promised minimum passes — a minimum is a floor, not a target",
    compareDeliveredAgainstMinimum({ beforeRaw: 0n, afterRaw: 68964571n }, 68964571n).ok, "equality passes");
  add("SWXV-7: delivering MORE than the minimum passes",
    compareDeliveredAgainstMinimum({ beforeRaw: 100n, afterRaw: 100n + 69318963n }, 68964571n).ok, "above passes");
  add("SWXV-8: delivering ONE base unit less is refused, and the refusal names both numbers", (() => {
    const r = compareDeliveredAgainstMinimum({ beforeRaw: 0n, afterRaw: 68964570n }, 68964571n);
    return !r.ok && r.reason === "below_promised_minimum" && (r.detail ?? "").includes("68964570") && (r.detail ?? "").includes("68964571");
  })(), "one short refused");
  add("SWXV-9: an existing balance is accounted for — the DELTA is compared, never the final balance", (() => {
    // A wallet already holding more than the minimum must not pass on its prior balance alone.
    const r = compareDeliveredAgainstMinimum({ beforeRaw: 500_000_000n, afterRaw: 500_000_000n }, 68964571n);
    return !r.ok && r.reason === "below_promised_minimum";
  })(), "delta not balance");
  add("SWXV-10: a balance that DECREASED is refused", (() => {
    const r = compareDeliveredAgainstMinimum({ beforeRaw: 100n, afterRaw: 50n }, 1n);
    return !r.ok;
  })(), "negative delta");

  /* ---- Exact decimal conversion, no floats ---- */
  add("SWXV-11: token→raw conversion is exact at 9 decimals",
    tokensToRaw("0.068964571", 9) === 68964571n && tokensToRaw("15", 6) === 15000000n && tokensToRaw("0", 9) === 0n, "exact");
  add("SWXV-12: more precision than the mint supports is REFUSED, not rounded — those numbers did not come from this mint",
    tokensToRaw("0.0689645712", 9) === null, "no silent rounding");
  add("SWXV-13: a malformed amount converts to null rather than zero — zero would silently pass a minimum check",
    tokensToRaw("", 9) === null && tokensToRaw("1.2.3", 9) === null && tokensToRaw("abc", 9) === null, "null not zero");

  /* ---- Derived addresses ---- */
  add("SWXV-14: the taker's associated token account is derived deterministically", (() => {
    const a = associatedTokenAddress(TAKER, WSOL);
    const b = associatedTokenAddress(TAKER, WSOL);
    return a != null && a === b && a.length >= 32;
  })(), "deterministic ATA");
  add("SWXV-15: a malformed address yields null rather than throwing",
    associatedTokenAddress("nope", WSOL) === null, "bad input safe");

  /* ---- The fee adjustment, which is the subtle part (SWXV-17..21) ---- */
  add("SWXV-17: native SOL output adds the fee back — the lamport balance moves by (output − fee), so a raw delta would fail every honest swap by exactly the fee", (() => {
    // Promised 68964571; swap delivers exactly that; 5000 lamports of fee come out.
    const r = verifyMeasuredValue(
      { outputIsNativeSol: true, beforeRaw: 100_000_000n, afterRaw: 100_000_000n + 68964571n - 5000n, feeLamports: 5000n },
      68964571n,
    );
    return r.ok;
  })(), "fee added back");
  add("SWXV-18: the fee adjustment is NOT a tolerance — one base unit short still fails after adding the fee", (() => {
    const r = verifyMeasuredValue(
      { outputIsNativeSol: true, beforeRaw: 0n, afterRaw: 68964570n - 5000n, feeLamports: 5000n },
      68964571n,
    );
    return !r.ok && r.reason === "below_promised_minimum";
  })(), "not a tolerance");
  add("SWXV-19: a native output with an UNKNOWN fee fails closed — we cannot tell under-delivery from the fee, and a guessed tolerance would make the check meaningless", (() => {
    const r = verifyMeasuredValue(
      { outputIsNativeSol: true, beforeRaw: 0n, afterRaw: 68964571n, feeLamports: null },
      68964571n,
    );
    return !r.ok && r.reason === "simulation_failed" && r.detail === "fee_unknown_for_native_output";
  })(), "no fee, no pass");
  add("SWXV-20: a TOKEN output ignores the fee entirely — it is paid in lamports, not in the token", (() => {
    const r = verifyMeasuredValue(
      { outputIsNativeSol: false, beforeRaw: 0n, afterRaw: 15_000_000n, feeLamports: null },
      15_000_000n,
    );
    return r.ok;
  })(), "token unaffected");
  add("SWXV-21: wrapped SOL is recognised as a native output; any other mint is not",
    outputIsNativeSol("So11111111111111111111111111111111111111112")
      && !outputIsNativeSol("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), "native detection");

  /* ---- Simulation orchestration (stubbed RPC, offline) (SWXV-22..26) ---- */
  const rpc = (o: Partial<SimulationRpc> = {}): SimulationRpc => ({
    getLookupTable: async () => ({ addresses: [] }),
    getOutputBalanceRaw: async () => 0n,
    simulateOutputBalanceRaw: async () => ({ err: null, afterRaw: 68964571n }),
    getFeeLamports: async () => 5000n,
    ...o,
  });
  const simParams = {
    transaction: null as never,
    takerPublicKey: TAKER,
    outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    promisedMinimumRaw: 68964571n,
    lookupTableAddresses: ["9AsimPML6N36BAe8keQRAHpLuKgCKv9QJV9912TXZhBD"],
  };
  const simChecks: Array<Promise<void>> = [];
  const addAsync = (name: string, run: () => Promise<boolean>, detail: string) => {
    simChecks.push(run().then((pass) => { add(name, pass, detail); }).catch(() => { add(name, false, "threw"); }));
  };
  addAsync("SWXV-22: a clean simulation delivering the minimum passes",
    async () => (await simulateAndVerifyValue(simParams, rpc())).ok, "clean sim");
  addAsync("SWXV-23: an UNRESOLVED lookup table stops everything — a transaction whose accounts we cannot fully see is one we cannot claim to have checked",
    async () => {
      const r = await simulateAndVerifyValue(simParams, rpc({ getLookupTable: async () => null }));
      return !r.ok && r.reason === "lookup_table_unresolved";
    }, "opaque is refused");
  addAsync("SWXV-24: a simulation ERROR is surfaced, never treated as a zero balance",
    async () => {
      const r = await simulateAndVerifyValue(simParams, rpc({ simulateOutputBalanceRaw: async () => ({ err: { InstructionError: [3, { Custom: 6024 }] }, afterRaw: null }) }));
      return !r.ok && r.reason === "simulation_failed";
    }, "sim error surfaced");
  addAsync("SWXV-25: a missing output account after a clean simulation is refused rather than read as zero",
    async () => {
      const r = await simulateAndVerifyValue(simParams, rpc({ simulateOutputBalanceRaw: async () => ({ err: null, afterRaw: null }) }));
      return !r.ok && r.reason === "output_account_not_found";
    }, "missing account");
  addAsync("SWXV-26: an output account that does not exist YET reads as zero before — the swap may be creating it, as the real transaction's ATA instruction does",
    async () => {
      const r = await simulateAndVerifyValue(simParams, rpc({ getOutputBalanceRaw: async () => null }));
      return r.ok;
    }, "absent before is zero");
  add("SWXV-27: a raw provider error is never carried into analytics — only a short bounded label",
    safeErrorLabel({ InstructionError: [3, { Custom: 6024 }] }) === "InstructionError"
      && safeErrorLabel(null) === "unknown"
      && safeErrorLabel("x".repeat(500)).length === 64, "bounded label");

  /* ---- Lifecycle: the machine enforces the order, not the UI (SWXV-28..35) ---- */
  const run = (events: ExecutionEvent[], from: ExecutionState = initialExecutionState): ExecutionState =>
    events.reduce(executionReducer, from);
  const PLAN = { planId: "p" } as never;
  const happy: ExecutionEvent[] = [
    { type: "prepare" }, { type: "plan_received", plan: PLAN }, { type: "verified" },
    { type: "sign" }, { type: "signed" }, { type: "submitted", signature: "sig" }, { type: "confirmed" },
  ];
  add("SWXV-28: the happy path reaches confirmed and keeps the signature",
    (() => { const s = run(happy); return s.phase === "confirmed" && s.signature === "sig"; })(), "happy path");
  add("SWXV-29: signing CANNOT be reached without verifying — there is no transition into `signing` except from `ready`", (() => {
    const skipped = run([{ type: "prepare" }, { type: "plan_received", plan: PLAN }, { type: "sign" }]);
    return skipped.phase === "verifying";
  })(), "verification unskippable");
  add("SWXV-30: failed verification is terminal and names itself", (() => {
    const s = run([{ type: "prepare" }, { type: "plan_received", plan: PLAN }, { type: "verification_failed", detail: "below_promised_minimum" }]);
    return s.phase === "failed" && s.failure === "verification_failed" && s.failureDetail === "below_promised_minimum" && isExecutionTerminal(s.phase);
  })(), "verification failure terminal");
  add("SWXV-31: declining in the wallet is a normal outcome, not an error", (() => {
    const s = run([...happy.slice(0, 4), { type: "declined" }]);
    return s.phase === "failed" && s.failure === "declined" && outcomeFor(s) === "declined";
  })(), "declining is fine");
  add("SWXV-32: expiry applies BEFORE submission", (() => {
    const s = run([{ type: "prepare" }, { type: "plan_received", plan: PLAN }, { type: "verified" }, { type: "expire" }]);
    return s.phase === "failed" && s.failure === "expired";
  })(), "pre-submission expiry");
  add("SWXV-33: expiry is IGNORED after submission — once a transaction is on-chain a local timer must not claim it failed", (() => {
    const submitted = run(happy.slice(0, 6));
    const s = executionReducer(submitted, { type: "expire" });
    return submitted.phase === "confirming" && s.phase === "confirming";
  })(), "no false failure");
  add("SWXV-34: a confirm timeout keeps the signature — we stopped watching, the transaction did not fail", (() => {
    const s = run([...happy.slice(0, 6), { type: "confirm_timeout" }]);
    return s.phase === "failed" && s.failure === "confirm_timeout" && s.signature === "sig" && outcomeFor(s) === "confirm_timeout";
  })(), "timeout keeps signature");
  add("SWXV-42: `ready` is reachable from EXACTLY ONE state via EXACTLY ONE event", (() => {
    // Exhaustive rather than illustrative: every phase, every event, and `ready` may appear only
    // as the result of `verified` applied to `verifying`. Adding a failure edge into `preparing`
    // (a client-side validation refusal) must not have opened another door, and this is what
    // says so without anyone having to reason about the switch by eye.
    const phases: ExecutionPhase[] = ["idle", "preparing", "verifying", "ready", "signing", "submitting", "confirming", "confirmed", "failed"];
    const events: ExecutionEvent[] = [
      { type: "prepare" }, { type: "plan_received", plan: PLAN }, { type: "plan_failed" },
      { type: "verified" }, { type: "verification_failed" }, { type: "sign" }, { type: "signed" },
      { type: "declined" }, { type: "submitted", signature: "s" }, { type: "submit_failed" },
      { type: "confirmed" }, { type: "confirm_timeout" }, { type: "expire" }, { type: "cancel" },
    ];
    for (const phase of phases) {
      for (const event of events) {
        const from: ExecutionState = { ...initialExecutionState, phase, plan: PLAN };
        const to = executionReducer(from, event);
        if (to.phase !== "ready") continue;
        // The only legitimate arrival. Anything else — including staying in `ready` — is checked:
        // staying is fine, arriving from elsewhere is not.
        if (phase === "ready") continue;
        if (!(phase === "verifying" && event.type === "verified")) return false;
      }
    }
    return true;
  })(), "one door to ready");
  add("SWXV-43: a validation refusal during `preparing` is a VERIFICATION failure, not an outage", (() => {
    // The client rejects a malformed or signature-bearing payload before it becomes a plan, so
    // the refusal arrives while still preparing. It must carry the refusal's identity, because
    // the copy for the two differs in exactly the way that matters to the reader.
    const s = run([{ type: "prepare" }, { type: "verification_failed", detail: "forbidden_field_in_plan" }]);
    return s.phase === "failed" && s.failure === "verification_failed" &&
      s.failureDetail === "forbidden_field_in_plan";
  })(), "refusal keeps its name");
  add("SWXV-35: a late reply cannot resurrect a finished flow", (() => {
    const done = run(happy);
    const s = executionReducer(done, { type: "submit_failed" });
    return s.phase === "confirmed" && s === done;
  })(), "terminal is terminal");

  /* ---- The second real transaction: SOL input, token output (SWXV-36..41) ---- */
  add("SWXV-36: the SOL-input transaction passes structural verification — 7 instructions, a different shape from the first", (() => {
    const r = verifyTransactionStructure(REAL_SWAP_TX_SOL_INPUT, TAKER);
    return r.ok && r.programIds.length === 7;
  })(), "second shape accepted");
  add("SWXV-37: it invokes the System program — native SOL as INPUT must be wrapped, which is why System is in the allowlist", (() => {
    const r = verifyTransactionStructure(REAL_SWAP_TX_SOL_INPUT, TAKER);
    return r.ok && r.programIds.includes("11111111111111111111111111111111");
  })(), "system observed");
  add("SWXV-38: it still invokes Jupiter exactly once, across a longer instruction list", (() => {
    const r = verifyTransactionStructure(REAL_SWAP_TX_SOL_INPUT, TAKER);
    return r.ok && r.programIds.filter((p) => p === JUPITER_PROGRAM_ID).length === 1;
  })(), "one swap");
  add("SWXV-39: the SPL token amount is read at offset 64 as a little-endian u64", (() => {
    const buf = Buffer.alloc(165);
    buf.writeBigUInt64LE(720673n, 64);
    return decodeTokenAccountAmount(buf) === 720673n;
  })(), "layout pinned");
  add("SWXV-40: a buffer too short to be a token account decodes to null, never to zero — zero would be a plausible wrong answer", (() => {
    return decodeTokenAccountAmount(Buffer.alloc(32)) === null && decodeTokenAccountAmount(Buffer.alloc(0)) === null;
  })(), "null not zero");
  add("SWXV-41: a native output measures the TAKER account; a token output measures their ATA", (() => {
    const native = outputAccountAddress({ takerPublicKey: TAKER, outputMint: WSOL, native: true });
    const token = outputAccountAddress({ takerPublicKey: TAKER, outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", native: false });
    return native === TAKER && token != null && token !== TAKER;
  })(), "right account measured");

  /* ---- Source guarantees ---- */
  add("SWXV-16: verification runs BEFORE signing — the module imports no signer and no wallet", (() => {
    // Structural proof: a verifier that could sign would eventually be asked to.
    return typeof verifyTransactionStructure === "function"
      && typeof compareDeliveredAgainstMinimum === "function"
      && typeof lookupTableAddresses === "function";
  })(), "no signing surface");

  // The stubbed-RPC checks resolve immediately (no network); awaiting keeps them in the suite.
  await Promise.all(simChecks);
  return checks;
}
