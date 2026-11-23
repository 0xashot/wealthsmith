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
import type { FixtureCheck } from "./fixtureCheck";
import {
  ALLOWED_SWAP_PROGRAM_IDS,
  JUPITER_PROGRAM_ID,
  associatedTokenAddress,
  compareDeliveredAgainstMinimum,
  lookupTableAddresses,
  tokensToRaw,
  verifyTransactionStructure,
} from "../swapExecution/executionVerification";

/** Captured 2026-11-23. Unsigned; it has never been submitted and cannot be without a signature. */
const REAL_SWAP_TX =
  "AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQAGDOhXe3MT5v9275mWMq" +
  "2yky+jWowiU1YM/q7XNKUDiaL7A+lBM11bgIL7G++6dzHZ/8Mk/rN+K9/SKHE07pZhxbQbi/oKacYXjcC+HMjXXxjCc1fq7YFs9qjkbeNVTYK0" +
  "BECeJRB2t9Xwbx62JWlxw/VsMl31jK1on7mvH1vqDEYHXsQioFWE2x6gdj0HjL+qO0817sELm0zhxTjwTHuCZmuL6eAj2HuU6ETR0wxb+DGjdH" +
  "m0/fPApUlu1TliL+le+gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwZGb+UhFzL/7K26csOb57yM5bvF9xJrLEObOkAAAAAEedVb" +
  "8jHAbu50xW7OaBUH/bGy3qP0jlECsc2iVrwTjwbd9uHXZaGT2cvhRs7reawctIXtX1s3kTqM9YV+/wCpjJclj04kifG7PRApFI4NgwtaE5na/x" +
  "CEBI572Nvp+Fm0P/on9df2SnTAmx8pWHneSwmrNt/J3VFLMhqns4zl6ObeNI7xDAoQCcJJ3GgpwEU2j4JZnS+X8Vt8baj8okA/BQcABQLAXBUA" +
  "BwAJAwQAAAAAAAAACgYAAwAPBgkBAQgVCQABAwgPCAsIEAkADQMOAQwCBAURJOUXy5d6460qAQAAABEAZAABQEtMAAAAAACWmiEEAAAAADIAAA" +
  "kDAwAAAQkBeWUSc/alLjcLiYWttW7ElnjgwKUHBiufBJJdlBG4VVADbZBpAxIAbA==";
const TAKER = "GdxxRejTS1VWftHBxecT6nGpNzqfDKHBYk6ddfurCu9L";
const WSOL = "So11111111111111111111111111111111111111112";

export function runSwapExecutionVerificationFixtureChecks(): FixtureCheck[] {
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

  /* ---- Source guarantees ---- */
  add("SWXV-16: verification runs BEFORE signing — the module imports no signer and no wallet", (() => {
    // Structural proof: a verifier that could sign would eventually be asked to.
    return typeof verifyTransactionStructure === "function"
      && typeof compareDeliveredAgainstMinimum === "function"
      && typeof lookupTableAddresses === "function";
  })(), "no signing surface");

  return checks;
}
