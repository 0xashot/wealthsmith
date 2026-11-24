/**
 * confirmationStatus — Phase 6 (SERVER-ONLY). Did the transaction land?
 *
 * The wallet submits and hands back a signature. Finding out what became of it needs a chain
 * read, and in production the browser has no RPC — the same constraint that put the simulation
 * on the server puts this here too.
 *
 * READ-ONLY, and narrower than anything else in this lane. It takes a signature and returns one
 * of three words. It cannot submit, cannot re-send, cannot cancel, and is not given the means
 * to: nothing in this module constructs a transaction.
 *
 * NOT KNOWING IS ITS OWN ANSWER. `pending` covers both "still working" and "we could not read
 * it", and the caller treats them the same — keep waiting, then stop waiting. Neither is
 * allowed to become `failed`, because a transaction we cannot see is not a transaction that
 * did not happen, and telling someone their swap failed when it is about to land is the worst
 * thing this flow could say.
 */
import { Connection } from "@solana/web3.js";
import type { EnvReader } from "../swapQuote/providerConfig";
import { EXECUTION_RPC_ENV_KEY } from "./planVerification";

/** Base58, 64 bytes — 86 to 88 characters. Shape only; the chain decides if it is real. */
const SIGNATURE_RE = /^[1-9A-HJ-NP-Za-km-z]{86,88}$/;

export type ConfirmationState =
  /** Landed and succeeded. The only state that may be shown as a completed swap. */
  | "confirmed"
  /** In flight, or unreadable. Keep waiting; never report as failure. */
  | "pending"
  /** Landed and the transaction itself errored. The chain said no — this is a real failure. */
  | "failed";

export interface ConfirmationResult {
  state: ConfirmationState;
}

/** The read this needs. Narrow on purpose, so the stub in a fixture is the whole surface. */
export interface SignatureStatusRpc {
  getStatus(signature: string): Promise<{ confirmed: boolean; err: unknown } | null>;
}

export function isSignatureShaped(signature: unknown): signature is string {
  return typeof signature === "string" && SIGNATURE_RE.test(signature);
}

/** Build the RPC-backed reader, or null when no RPC is configured. */
export function resolveSignatureStatusRpc(env: EnvReader): SignatureStatusRpc | null {
  const url = env(EXECUTION_RPC_ENV_KEY);
  if (typeof url !== "string" || url.length === 0) return null;
  const connection = new Connection(url, "confirmed");
  return {
    async getStatus(signature) {
      const res = await connection.getSignatureStatuses([signature], { searchTransactionHistory: true });
      const value = res.value?.[0];
      if (value == null) return null;
      // `confirmed` and `finalized` both mean it landed. `processed` does not: it can still be
      // dropped, and showing a completed swap that later vanishes is not recoverable.
      const status = value.confirmationStatus;
      return { confirmed: status === "confirmed" || status === "finalized", err: value.err };
    },
  };
}

/**
 * Decide the state from one read. Pure, so the rule is testable without a chain.
 *
 * A null read means the node has not seen it, which early on is entirely normal — it is
 * `pending`, not missing and not failed.
 */
export function stateFromStatus(status: { confirmed: boolean; err: unknown } | null): ConfirmationState {
  if (status == null) return "pending";
  // An error on a landed transaction is the chain reporting that it ran and reverted. That IS
  // a failure, and the only one this module is allowed to report.
  if (status.err != null) return "failed";
  return status.confirmed ? "confirmed" : "pending";
}

export function createConfirmationChecker(deps: { env: EnvReader; rpc?: SignatureStatusRpc }) {
  return async function checkConfirmation(signature: string): Promise<ConfirmationResult | null> {
    if (!isSignatureShaped(signature)) return null;
    const rpc = deps.rpc ?? resolveSignatureStatusRpc(deps.env);
    // No RPC means we cannot tell. `pending` rather than an error: the caller keeps waiting and
    // eventually stops, which is exactly right for "we do not know".
    if (rpc == null) return { state: "pending" };
    try {
      return { state: stateFromStatus(await rpc.getStatus(signature)) };
    } catch {
      return { state: "pending" };
    }
  };
}
