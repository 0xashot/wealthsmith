/**
 * executionSimulation — Phase 3b. The thin IO shell around the value rule.
 *
 * Everything that decides anything lives in `executionVerification`; this only fetches. The split
 * is deliberate: the arithmetic is the half that can be quietly wrong, so it is pure and
 * fixtured, and this half is kept boring enough to read in one sitting.
 *
 * Depends on an RPC abstraction rather than a `Connection` so the orchestration can be tested
 * against a stub. The real caller passes a Connection-backed adapter.
 *
 * Nothing here signs, submits, or mutates chain state. `simulateTransaction` with
 * `sigVerify: false` executes against a snapshot and is as read-only as `getBalance`.
 */
import type { VersionedTransaction } from "@solana/web3.js";
import {
  outputIsNativeSol,
  verifyMeasuredValue,
  type ValueResult,
} from "./executionVerification";

/** The reads a value check needs. Narrow on purpose — a wider surface is a wider thing to stub. */
export interface SimulationRpc {
  /** Resolve an address lookup table; null when it cannot be read. */
  getLookupTable(address: string): Promise<{ addresses: string[] } | null>;
  /** The taker's current output balance in base units, or null when the account does not exist yet. */
  getOutputBalanceRaw(params: { takerPublicKey: string; outputMint: string; native: boolean }): Promise<bigint | null>;
  /**
   * Simulate and return the taker's output balance afterwards. `err` is the simulation's own error,
   * which must be surfaced rather than treated as a zero balance.
   */
  simulateOutputBalanceRaw(params: {
    transaction: VersionedTransaction;
    lookupTableAddresses: string[];
    takerPublicKey: string;
    outputMint: string;
    native: boolean;
  }): Promise<{ err: unknown; afterRaw: bigint | null }>;
  /** The transaction fee in lamports, needed only for a native-SOL output. */
  getFeeLamports(transaction: VersionedTransaction): Promise<bigint | null>;
}

export interface SimulateAndVerifyParams {
  transaction: VersionedTransaction;
  takerPublicKey: string;
  outputMint: string;
  promisedMinimumRaw: bigint;
  lookupTableAddresses: string[];
}

/**
 * Simulate the swap and check what it would actually deliver.
 *
 * Order matters: a lookup table we cannot resolve stops everything, because a transaction whose
 * accounts we cannot fully see is one we cannot claim to have checked. "Probably fine" is not a
 * verification result.
 */
export async function simulateAndVerifyValue(
  params: SimulateAndVerifyParams,
  rpc: SimulationRpc,
): Promise<ValueResult> {
  const native = outputIsNativeSol(params.outputMint);

  // 1. Every lookup table must resolve. An unresolved one means part of the transaction is opaque.
  for (const address of params.lookupTableAddresses) {
    let table: { addresses: string[] } | null = null;
    try {
      table = await rpc.getLookupTable(address);
    } catch {
      table = null;
    }
    if (table == null) {
      return { ok: false, reason: "lookup_table_unresolved", detail: address };
    }
  }

  // 2. Balance before. A missing account is zero, not an error — the swap may be creating it,
  //    which is exactly what the observed transaction's AssociatedTokenAccount instruction does.
  let beforeRaw: bigint;
  try {
    beforeRaw = (await rpc.getOutputBalanceRaw({
      takerPublicKey: params.takerPublicKey,
      outputMint: params.outputMint,
      native,
    })) ?? 0n;
  } catch {
    return { ok: false, reason: "simulation_failed", detail: "before_balance_unreadable" };
  }

  // 3. Simulate.
  let sim: { err: unknown; afterRaw: bigint | null };
  try {
    sim = await rpc.simulateOutputBalanceRaw({
      transaction: params.transaction,
      lookupTableAddresses: params.lookupTableAddresses,
      takerPublicKey: params.takerPublicKey,
      outputMint: params.outputMint,
      native,
    });
  } catch {
    return { ok: false, reason: "simulation_failed", detail: "simulate_threw" };
  }

  // A simulation error is the transaction telling us it will not work. Jupiter returns transactions
  // in this state — observed live — so this is a real path, not a defensive one.
  if (sim.err != null) {
    return { ok: false, reason: "simulation_failed", detail: safeErrorLabel(sim.err) };
  }
  if (sim.afterRaw == null) {
    return { ok: false, reason: "output_account_not_found", detail: null };
  }

  // 4. Fee, for a native-SOL output only — see ValueMeasurement.feeLamports for why.
  let feeLamports: bigint | null = null;
  if (native) {
    try {
      feeLamports = await rpc.getFeeLamports(params.transaction);
    } catch {
      feeLamports = null;
    }
  }

  return verifyMeasuredValue(
    { outputIsNativeSol: native, beforeRaw, afterRaw: sim.afterRaw, feeLamports },
    params.promisedMinimumRaw,
  );
}

/**
 * A short, bounded label for a simulation error.
 *
 * Never the raw object: it carries provider and chain internals, and this string reaches analytics.
 * The user sees approved copy regardless; this is for us.
 */
export function safeErrorLabel(err: unknown): string {
  if (err == null) return "unknown";
  if (typeof err === "string") return err.slice(0, 64);
  try {
    const keys = Object.keys(err as Record<string, unknown>);
    return keys.length > 0 ? keys[0].slice(0, 64) : "unknown";
  } catch {
    return "unknown";
  }
}
