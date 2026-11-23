/**
 * submitResolution — Phase 5. What the wallet's answer means, as a pure function.
 *
 * The same split as `planResolution`: the decisions live here so they can be run in a fixture,
 * and the hook that talks to the wallet adapter is wiring.
 *
 * WHO SUBMITS, AND WHY IT MATTERS. Both registered adapters implement `sendTransaction` by
 * calling the wallet's own `signAndSendTransaction` — verified by reading the installed
 * packages, not from memory. For a VersionedTransaction neither touches our `Connection` except
 * to read `commitment`, a local property. So the wallet signs AND submits through its own
 * infrastructure:
 *
 *   - WealthSmith never holds a signed transaction. Not briefly, not in memory, not in transit.
 *   - Submission needs no RPC of ours, which is just as well, since the browser has none.
 *
 * That is a better custody story than the alternative and it fell out of how the wallets already
 * work, so there is nothing to defend here beyond not undoing it.
 *
 * SIGNING AND SUBMITTING COLLAPSE INTO ONE CALL. The machine keeps `signing` and `submitting` as
 * separate states because they are separate events and a future adapter may expose them apart.
 * With `signAndSendTransaction` they resolve together, so both are dispatched from one answer.
 */
import type { ExecutionEvent } from "./executionLifecycle";

/** What the wallet did. Deliberately small — anything richer would be provider detail. */
export type SubmitOutcome =
  | { kind: "submitted"; signature: string }
  | { kind: "declined" }
  | { kind: "failed"; detail: string };

/**
 * Classify an error thrown by a wallet adapter.
 *
 * BIASED TOWARDS `failed`, on purpose. Telling someone "you declined" when their wallet actually
 * errored is a false statement about something they just did, and it stops them retrying. The
 * reverse mistake — calling a decline a failure — is milder: the funds are equally untouched and
 * the copy still says nothing was sent. So only an explicit rejection signal counts as a decline.
 */
export function classifyWalletError(error: unknown): SubmitOutcome {
  const name = typeof (error as { name?: unknown })?.name === "string" ? (error as { name: string }).name : "";
  const message = typeof (error as { message?: unknown })?.message === "string" ? (error as { message: string }).message : "";
  const code = (error as { code?: unknown })?.code;

  // EIP-1193-style user rejection, used by Phantom and Solflare, plus the adapter's own error
  // name and the wording wallets put in the message. Any ONE of these is explicit enough.
  const rejected =
    code === 4001 ||
    name === "WalletUserRejectedError" ||
    /user rejected|user declined|request rejected|rejected the request/i.test(message);

  if (rejected) return { kind: "declined" };
  // Bounded, and never the raw message: it reaches analytics and carries provider internals.
  return { kind: "failed", detail: (name || "wallet_error").slice(0, 64) };
}

/**
 * The events a submit outcome produces, in order.
 *
 * `signed` then `submitted` for a success: the wallet did both, and the machine records both
 * rather than skipping a state it genuinely passed through.
 */
export function eventsForSubmitOutcome(outcome: SubmitOutcome): ExecutionEvent[] {
  switch (outcome.kind) {
    case "submitted":
      return [{ type: "signed" }, { type: "submitted", signature: outcome.signature }];
    case "declined":
      // A decline happens IN the wallet, before anything is sent, so the flow never reaches
      // `submitting`. The machine accepts `declined` from `signing`, which is where it is.
      return [{ type: "declined" }];
    case "failed":
      // Also from `signing`: nothing was submitted, so `submit_failed` has to be reachable from
      // there. It is dispatched after `signed` only when a signature actually exists.
      return [{ type: "submit_failed", detail: outcome.detail }];
  }
}

/**
 * A signature is only ever a non-empty string.
 *
 * A wallet returning an empty or non-string signature has not told us a transaction landed, and
 * treating that as success would show a completed swap with no transaction behind it.
 */
export function isUsableSignature(signature: unknown): signature is string {
  return typeof signature === "string" && signature.length > 0;
}
