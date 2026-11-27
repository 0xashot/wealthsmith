/**
 * executionVerification — Phase 3. What makes the confirm screen honest rather than decorative.
 *
 * Showing a user terms and asking them to approve a transaction are two different claims unless
 * something checks that the transaction performs those terms. This module is that check. It runs
 * BEFORE any signature is requested, and a failure falls back to the handoff — never to "sign it
 * anyway and hope".
 *
 * TWO LAYERS, and the distinction is deliberate:
 *
 *   Structural (pure, no network) — is this the shape of transaction we asked for? One unsigned
 *     signature slot, the user as fee payer, and every invoked program in an allowlist derived
 *     from observing a real Jupiter swap. Cheap, total, and catches the gross substitutions.
 *
 *   Value (needs an RPC) — does it actually deliver what we said? Simulated, with the user's
 *     output-token balance delta compared against the promised minimum. This is the layer that
 *     turns "Jupiter told us" into "we checked".
 *
 * Structural verification is NOT value verification. A transaction can be perfectly well-formed,
 * invoke only allowed programs, and still hand the user less than they were promised. Passing
 * layer one alone must never be presented as having verified the terms.
 */
import { PublicKey, VersionedTransaction } from "@solana/web3.js";

export const SWAP_EXECUTION_VERIFICATION_VERSION = "swap_execution_verification_1.0.0" as const;

/**
 * Programs a Jupiter swap transaction may invoke.
 *
 * Derived by decoding a real `POST /swap/v1/swap` response on 2026-11-23, not from memory: that
 * transaction invoked ComputeBudget (twice), the Associated Token Account program, Jupiter, and
 * the SPL Token program. System is included because wrapping native SOL requires it on routes
 * that do so; the observed USDC→SOL route unwrapped via Token::closeAccount instead.
 *
 * An unlisted program is a hard refusal. If Jupiter adds one, execution falls back to the handoff
 * until someone looks at why — which is the correct failure direction for a list like this.
 */
export const ALLOWED_SWAP_PROGRAM_IDS: readonly string[] = [
  "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4", // Jupiter aggregator
  "ComputeBudget111111111111111111111111111111", // compute unit limit + price
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL", // associated token account
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", // SPL token
  "11111111111111111111111111111111", // system (native SOL wrapping)
] as const;

export const JUPITER_PROGRAM_ID = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4" as const;

/**
 * RAYDIUM. Programs a Raydium Trade API swap transaction may invoke at the top level.
 *
 * Derived by decoding real `POST /transaction/swap-base-in` responses on 2026-11-27 — SOL→USDC,
 * USDC→SOL and seven token→USDC sales, one and two pools, classic and Token-2022: every one was
 * a single V0 transaction whose only top-level programs were Raydium's router and ComputeBudget
 * (twice). The pool programs (CLMM, AMM v4, CPMM), the token programs, the associated-token
 * program and System all ran INSIDE the router, so none of them is allowed at the top level.
 * The router's address is the one Raydium publishes (docs.raydium.io/reference/program-addresses:
 * "if a program ID in the wild does not match the table below, do not sign the transaction").
 */
export const RAYDIUM_ROUTER_PROGRAM_ID = "routeUGWgWzqBWFcrCfv8tritsqukccJPu3q5GPP3xS" as const;
export const RAYDIUM_ALLOWED_PROGRAM_IDS: readonly string[] = [
  RAYDIUM_ROUTER_PROGRAM_ID,
  "ComputeBudget111111111111111111111111111111", // compute unit limit + price
] as const;

/**
 * The router instructions a swap transaction may contain, by their first data byte. Observed,
 * not assumed: 5 wraps native SOL for the swap (tag + amount), 0 is the swap itself (tag +
 * amount in + minimum out), 6 closes the temporary wrapped-SOL account (tag only). Anything else
 * is an instruction we have never seen and is refused.
 */
export const RAYDIUM_ROUTER_INSTRUCTION = {
  swap: { tag: 0, dataLength: 17 },
  wrapSol: { tag: 5, dataLength: 9 },
  closeWrappedSol: { tag: 6, dataLength: 1 },
} as const;

/** The providers whose transactions this module knows how to check. */
export type ExecutionProviderId = "jupiter" | "raydium";
export const VERIFIABLE_EXECUTION_PROVIDER_IDS: readonly ExecutionProviderId[] = ["jupiter", "raydium"] as const;

/**
 * What the transaction is supposed to be. The provider decides which rule set applies; for
 * Raydium the amounts are part of the structure, because its swap instruction states them.
 */
export interface StructuralExpectation {
  providerId: ExecutionProviderId;
  /** The exact input amount the user was shown, in base units. Required for Raydium. */
  inputAmountRaw?: string;
  /** The exact minimum output the user was promised, in base units. Required for Raydium. */
  minimumOutputRaw?: string;
}

export type StructuralFailure =
  | "undecodable"
  | "not_versioned"
  | "already_signed"
  | "multiple_signers"
  | "fee_payer_mismatch"
  | "program_not_allowed"
  | "program_hidden_in_lookup_table"
  | "jupiter_not_invoked"
  | "jupiter_invoked_more_than_once"
  | "provider_not_verifiable"
  | "raydium_terms_missing"
  | "raydium_instruction_not_recognized"
  | "raydium_swap_count"
  | "raydium_amount_mismatch"
  | "raydium_minimum_mismatch"
  | "raydium_wrap_mismatch";

export type StructuralResult =
  | { ok: true; transaction: VersionedTransaction; programIds: string[] }
  | { ok: false; reason: StructuralFailure; detail: string | null };

/**
 * Layer one. Pure: no RPC, no clock, no wallet.
 *
 * `takerPublicKey` is checked as the fee payer because a transaction paid for by someone else is
 * not the transaction we offered, whatever else it contains.
 */
export function verifyTransactionStructure(
  unsignedTransactionBase64: string,
  takerPublicKey: string,
  // Jupiter by default: every caller written before Raydium existed means Jupiter.
  expectation: StructuralExpectation = { providerId: "jupiter" },
): StructuralResult {
  if (!VERIFIABLE_EXECUTION_PROVIDER_IDS.includes(expectation.providerId)) {
    return { ok: false, reason: "provider_not_verifiable", detail: String(expectation.providerId) };
  }

  let tx: VersionedTransaction;
  try {
    tx = VersionedTransaction.deserialize(Buffer.from(unsignedTransactionBase64, "base64"));
  } catch {
    return { ok: false, reason: "undecodable", detail: null };
  }

  const message = tx.message;
  if (message == null || typeof message.header?.numRequiredSignatures !== "number") {
    return { ok: false, reason: "not_versioned", detail: null };
  }

  // Exactly one signer: the user. A second required signature means someone else must also
  // approve, which is not a shape we ever offer.
  if (message.header.numRequiredSignatures !== 1) {
    return { ok: false, reason: "multiple_signers", detail: String(message.header.numRequiredSignatures) };
  }

  // Must arrive unsigned. A pre-filled signature is not something to reason about, it is something
  // to refuse.
  const anySigned = tx.signatures.some((sig) => sig.some((b) => b !== 0));
  if (anySigned) return { ok: false, reason: "already_signed", detail: null };

  const feePayer = message.staticAccountKeys[0];
  if (feePayer == null || feePayer.toBase58() !== takerPublicKey) {
    return { ok: false, reason: "fee_payer_mismatch", detail: feePayer?.toBase58() ?? null };
  }

  // Every invoked program must be a STATIC key. A program id reachable only through an address
  // lookup table cannot be checked without resolving that table, and a transaction that hides
  // which programs it calls is refused rather than investigated at signing time.
  const staticCount = message.staticAccountKeys.length;
  const programIds: string[] = [];
  for (const ix of message.compiledInstructions) {
    if (ix.programIdIndex >= staticCount) {
      return { ok: false, reason: "program_hidden_in_lookup_table", detail: String(ix.programIdIndex) };
    }
    programIds.push(message.staticAccountKeys[ix.programIdIndex].toBase58());
  }

  if (expectation.providerId === "raydium") {
    return verifyRaydiumInstructions(tx, programIds, expectation);
  }

  const disallowed = programIds.find((id) => !ALLOWED_SWAP_PROGRAM_IDS.includes(id));
  if (disallowed != null) {
    return { ok: false, reason: "program_not_allowed", detail: disallowed };
  }

  const jupiterCalls = programIds.filter((id) => id === JUPITER_PROGRAM_ID).length;
  if (jupiterCalls === 0) return { ok: false, reason: "jupiter_not_invoked", detail: null };
  // One swap, one Jupiter instruction. Two would be two swaps under one approval.
  if (jupiterCalls > 1) return { ok: false, reason: "jupiter_invoked_more_than_once", detail: String(jupiterCalls) };

  return { ok: true, transaction: tx, programIds };
}

const U64_MAX = (1n << 64n) - 1n;
function readU64LE(data: Uint8Array, offset: number): bigint {
  let value = 0n;
  for (let i = 7; i >= 0; i--) value = (value << 8n) | BigInt(data[offset + i]);
  return value;
}
function parseRaw(value: string | undefined): bigint | null {
  if (typeof value !== "string" || !/^[0-9]+$/.test(value)) return null;
  const n = BigInt(value);
  return n > 0n && n <= U64_MAX ? n : null;
}

/**
 * The Raydium rule set. Stricter than Jupiter's in one respect and for a reason: Raydium's swap
 * instruction carries the amount in and the minimum out as plain numbers, so the transaction can
 * be checked against the terms WITHOUT a simulation. The transaction must contain
 *
 *   - only the router and ComputeBudget at the top level;
 *   - exactly ONE swap instruction, whose amount in is the amount the user was shown and whose
 *     minimum out is the minimum they were promised — to the unit;
 *   - at most one "wrap SOL" for exactly that amount, and at most one "close wrapped SOL";
 *   - nothing else from the router.
 *
 * A second swap, a different amount, a lower floor, or an instruction we have never seen is a
 * refusal. The value simulation still runs after this; this is the half that needs no chain.
 */
function verifyRaydiumInstructions(
  tx: VersionedTransaction,
  programIds: string[],
  expectation: StructuralExpectation,
): StructuralResult {
  const expectedIn = parseRaw(expectation.inputAmountRaw);
  const expectedMin = parseRaw(expectation.minimumOutputRaw);
  // Without the terms there is nothing to hold the instruction to, and "it has a swap in it" is
  // not a check.
  if (expectedIn == null || expectedMin == null) {
    return { ok: false, reason: "raydium_terms_missing", detail: null };
  }

  const disallowed = programIds.find((id) => !RAYDIUM_ALLOWED_PROGRAM_IDS.includes(id));
  if (disallowed != null) {
    return { ok: false, reason: "program_not_allowed", detail: disallowed };
  }

  const kinds = RAYDIUM_ROUTER_INSTRUCTION;
  let swaps = 0, wraps = 0, closes = 0;
  tx.message.compiledInstructions.forEach((ix, i) => {
    if (programIds[i] !== RAYDIUM_ROUTER_PROGRAM_ID) return;
    const data = ix.data;
    const tag = data.length > 0 ? data[0] : -1;
    if (tag === kinds.swap.tag && data.length === kinds.swap.dataLength) swaps += 1;
    else if (tag === kinds.wrapSol.tag && data.length === kinds.wrapSol.dataLength) wraps += 1;
    else if (tag === kinds.closeWrappedSol.tag && data.length === kinds.closeWrappedSol.dataLength) closes += 1;
    else swaps = Number.NaN; // an instruction we do not recognise poisons the count
  });
  if (Number.isNaN(swaps)) {
    return { ok: false, reason: "raydium_instruction_not_recognized", detail: null };
  }
  // One swap, one approval. None is not a swap; two is two swaps under one signature.
  if (swaps !== 1 || wraps > 1 || closes > 1) {
    return { ok: false, reason: "raydium_swap_count", detail: `${swaps}/${wraps}/${closes}` };
  }

  const routerInstructions = tx.message.compiledInstructions.filter((_, i) => programIds[i] === RAYDIUM_ROUTER_PROGRAM_ID);
  // The swap first: its two numbers are the terms.
  const swap = routerInstructions.find((ix) => ix.data[0] === kinds.swap.tag);
  if (swap != null) {
    const amountIn = readU64LE(swap.data, 1);
    const minimumOut = readU64LE(swap.data, 9);
    if (amountIn !== expectedIn) {
      return { ok: false, reason: "raydium_amount_mismatch", detail: `${amountIn.toString()} != ${expectedIn.toString()}` };
    }
    if (minimumOut !== expectedMin) {
      return { ok: false, reason: "raydium_minimum_mismatch", detail: `${minimumOut.toString()} != ${expectedMin.toString()}` };
    }
  }
  // Then the wrap: wrapping more SOL than the swap spends would leave the user's SOL somewhere
  // they did not ask for it to go.
  const wrap = routerInstructions.find((ix) => ix.data[0] === kinds.wrapSol.tag);
  if (wrap != null) {
    const wrapped = readU64LE(wrap.data, 1);
    if (wrapped !== expectedIn) {
      return { ok: false, reason: "raydium_wrap_mismatch", detail: `${wrapped.toString()} != ${expectedIn.toString()}` };
    }
  }

  return { ok: true, transaction: tx, programIds };
}

/* ------------------------------------------------------------------ *
 * Layer two — value verification by simulation.
 * ------------------------------------------------------------------ */

export type ValueFailure =
  | "simulation_failed"
  | "output_account_not_found"
  | "below_promised_minimum"
  | "lookup_table_unresolved";

export interface SimulatedBalances {
  /** The taker's output-token balance before and after, in base units. */
  beforeRaw: bigint;
  afterRaw: bigint;
}

export type ValueResult =
  | { ok: true; deliveredRaw: bigint; promisedMinimumRaw: bigint }
  | { ok: false; reason: ValueFailure; detail: string | null };

/**
 * Compare a simulated balance change against what the user was promised.
 *
 * Separated from the simulation itself so the comparison — the part with the actual rule in it —
 * is pure and testable without a chain. The caller supplies the balances; this decides.
 *
 * The rule is deliberately one-sided: delivering MORE than the minimum is fine (that is what a
 * minimum means), delivering less is a refusal. Equality passes.
 */
export function compareDeliveredAgainstMinimum(
  balances: SimulatedBalances,
  promisedMinimumRaw: bigint,
): ValueResult {
  const delivered = balances.afterRaw - balances.beforeRaw;
  if (delivered < promisedMinimumRaw) {
    return {
      ok: false,
      reason: "below_promised_minimum",
      detail: `${delivered.toString()} < ${promisedMinimumRaw.toString()}`,
    };
  }
  return { ok: true, deliveredRaw: delivered, promisedMinimumRaw };
}

/** Convert a decimal token string back to base units exactly, without a float. */
export function tokensToRaw(tokens: string, decimals: number): bigint | null {
  if (!/^[0-9]+(\.[0-9]+)?$/.test(tokens)) return null;
  const [whole, frac = ""] = tokens.split(".");
  if (frac.length > decimals) {
    // More precision than the mint supports means these numbers did not come from this mint.
    return null;
  }
  try {
    return BigInt(whole + frac.padEnd(decimals, "0"));
  } catch {
    return null;
  }
}

/**
 * Native SOL is the output whenever the mint is wrapped SOL and the route unwraps — which Jupiter
 * does by default (`wrapAndUnwrapSol`). The observed USDC→SOL transaction ended with a
 * Token::closeAccount, returning lamports to the taker rather than leaving a token balance.
 */
export const WRAPPED_SOL_MINT = "So11111111111111111111111111111111111111112" as const;

export interface ValueMeasurement {
  /** True when the output lands as native lamports rather than in a token account. */
  outputIsNativeSol: boolean;
  /** The taker's output balance before and after, in base units (lamports for native SOL). */
  beforeRaw: bigint;
  afterRaw: bigint;
  /**
   * The transaction fee in lamports. Required for a native-SOL output and ignored otherwise.
   *
   * This is not a rounding allowance. For a native-SOL output the taker's lamport balance moves by
   * (output − fee), so comparing the raw delta against the promised minimum would fail every honest
   * swap by exactly the fee. Adding it back measures what the SWAP delivered, which is what the user
   * was promised. A token-account output is unaffected: the fee is paid in lamports, not in the token.
   */
  feeLamports: bigint | null;
}

/**
 * Decide whether a simulated swap delivered what was promised.
 *
 * Pure. The simulation, the lookup-table resolution and the balance reads happen in the caller;
 * the RULE lives here so it can be tested without a chain, which is the half that can be wrong in
 * a way nobody notices.
 */
export function verifyMeasuredValue(
  measurement: ValueMeasurement,
  promisedMinimumRaw: bigint,
): ValueResult {
  const rawDelta = measurement.afterRaw - measurement.beforeRaw;

  if (measurement.outputIsNativeSol) {
    if (measurement.feeLamports == null) {
      // Without the fee we cannot separate "the swap under-delivered" from "the fee was deducted",
      // and guessing a tolerance would make the check meaningless. Fail closed.
      return { ok: false, reason: "simulation_failed", detail: "fee_unknown_for_native_output" };
    }
    const delivered = rawDelta + measurement.feeLamports;
    return compareDeliveredAgainstMinimum({ beforeRaw: 0n, afterRaw: delivered }, promisedMinimumRaw);
  }

  return compareDeliveredAgainstMinimum(
    { beforeRaw: measurement.beforeRaw, afterRaw: measurement.afterRaw },
    promisedMinimumRaw,
  );
}

/** Whether a swap's output will arrive as native lamports rather than in a token account. */
export function outputIsNativeSol(outputMint: string): boolean {
  return outputMint === WRAPPED_SOL_MINT;
}

/** The address lookup tables a transaction depends on, for the caller to resolve. */
export function lookupTableAddresses(tx: VersionedTransaction): string[] {
  return tx.message.addressTableLookups.map((l) => l.accountKey.toBase58());
}

/** The taker's associated token account for a mint — where a swap's output lands. */
export function associatedTokenAddress(ownerBase58: string, mintBase58: string): string | null {
  try {
    const owner = new PublicKey(ownerBase58);
    const mint = new PublicKey(mintBase58);
    const [ata] = PublicKey.findProgramAddressSync(
      [owner.toBuffer(), new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").toBuffer(), mint.toBuffer()],
      new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
    );
    return ata.toBase58();
  } catch {
    return null;
  }
}
