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

export type StructuralFailure =
  | "undecodable"
  | "not_versioned"
  | "already_signed"
  | "multiple_signers"
  | "fee_payer_mismatch"
  | "program_not_allowed"
  | "program_hidden_in_lookup_table"
  | "jupiter_not_invoked"
  | "jupiter_invoked_more_than_once";

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
): StructuralResult {
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
