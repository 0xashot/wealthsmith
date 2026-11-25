/**
 * confirmationPolling — Phase 6. Watching a submitted swap, and knowing when to stop.
 *
 * The client half of confirmation: the fetch, and the pure rules about how long to wait and
 * what each answer means. The chain read itself is server-side, because the browser has no RPC.
 *
 * WE STOP WATCHING; THE TRANSACTION DOES NOT STOP. Everything here is written around that
 * distinction. A deadline expiring means we gave up looking, and the copy, the state and the
 * outcome all have to say exactly that — the transaction is on-chain and may still land. The
 * only thing allowed to report failure is the chain itself saying the transaction reverted.
 */
import type { ExecutionEvent } from "./executionLifecycle";

/**
 * How long to watch before giving up.
 *
 * Generous: a congested network can take well over a minute, and stopping early produces a
 * "still confirming" message for a swap that was about to succeed — technically true, and
 * unhelpful. Stopping late costs nothing but a spinner.
 */
export const CONFIRMATION_DEADLINE_MS = 90_000;

/** Gap between reads. Frequent enough to feel live, sparse enough not to hammer an RPC. */
export const CONFIRMATION_POLL_INTERVAL_MS = 2_000;

export type ConfirmationState = "confirmed" | "pending" | "failed";

export type ConfirmationFetchResult =
  | {
      ok: true;
      state: ConfirmationState;
      /**
       * Base units the taker actually received, when the service could read them. Null is the
       * normal case for anything but a confirmed swap, and remains possible even then.
       */
      deliveredRaw?: string | null;
      /**
       * What the chain charged, read from the landed transaction. Present on BOTH landed
       * outcomes — a reverted swap moved no tokens and still cost money, and that is the
       * figure its screen reports.
       */
      feeLamports?: string | null;
      /** That fee in USD, priced server-side from the same source the terms used. */
      feeUsd?: number | null;
    }
  /** We could not ask. Indistinguishable from `pending` to the caller, and treated as such. */
  | { ok: false };

/**
 * What to do with one read.
 *
 * `keep_waiting` is returned for every answer that is not a definite outcome, including a
 * failed request: not being able to ask is not evidence about the transaction.
 */
export type PollDecision =
  | { action: "stop"; events: ExecutionEvent[] }
  | { action: "keep_waiting" };

export function decideFromConfirmation(result: ConfirmationFetchResult): PollDecision {
  if (!result.ok) return { action: "keep_waiting" };
  switch (result.state) {
    case "confirmed":
      // The delivered figure travels WITH the outcome rather than being fetched afterwards:
      // one read, one event, and no window in which the sheet says a swap completed while a
      // second request decides what it completed with.
      return {
        action: "stop",
        events: [{
          type: "confirmed",
          deliveredRaw: result.deliveredRaw ?? null,
          feeLamports: result.feeLamports ?? null,
          feeUsd: result.feeUsd ?? null,
        }],
      };
    case "failed":
      // The chain ran it and it reverted. This is the ONE failure confirmation may report, and
      // it is a different event from giving up — the user's funds did not move, and we know it
      // rather than merely not knowing.
      return {
        action: "stop",
        events: [{
          type: "submit_failed",
          detail: "transaction_reverted",
          // The one failure that costs money. The screen says so with a figure, so the figure
          // travels with the outcome rather than being fetched after it.
          feeLamports: result.feeLamports ?? null,
          feeUsd: result.feeUsd ?? null,
        }],
      };
    case "pending":
      return { action: "keep_waiting" };
  }
}

/**
 * Whether to give up, given when watching started.
 *
 * Separate from the decision above so the deadline is testable without a clock and so "we
 * stopped" can never be confused with "it failed" — they come from different functions.
 */
export function hasPassedDeadline(startedAtMs: number, nowMs: number): boolean {
  return nowMs - startedAtMs >= CONFIRMATION_DEADLINE_MS;
}

/** The event for giving up. Not a failure of the transaction, and the machine keeps the signature. */
export function timeoutEvent(): ExecutionEvent {
  return { type: "confirm_timeout" };
}

export interface FetchConfirmationOptions {
  fetchImpl?: typeof fetch;
  apiBase?: string;
  signal?: AbortSignal;
  /**
   * Where to read what arrived: the taker's public key and the output mint.
   *
   * Omitted, the service answers with the state alone and the success screen shows no figure.
   * Both are public and both are already on the confirm sheet, so sending them discloses
   * nothing the signature did not.
   */
  delivery?: { owner: string; mint: string } | null;
}

/** Resolve the execute service base — the same variable the plan request uses. */
function resolveBase(): string {
  try {
    const base = import.meta.env.VITE_SWAP_EXECUTE_API_BASE as string | undefined;
    return typeof base === "string" ? base.replace(/\/$/, "") : "";
  } catch {
    return "";
  }
}

/**
 * Ask the service what became of a signature.
 *
 * Never throws: every failure becomes `{ ok: false }`, which the decision above reads as "keep
 * waiting". A network blip must not end up looking like an outcome.
 */
export async function fetchConfirmationState(
  signature: string,
  opts: FetchConfirmationOptions = {},
): Promise<ConfirmationFetchResult> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const base = opts.apiBase ?? resolveBase();
  try {
    const query = new URLSearchParams({ signature });
    if (opts.delivery) {
      query.set("owner", opts.delivery.owner);
      query.set("mint", opts.delivery.mint);
    }
    const res = await fetchImpl(`${base}/api/swap-execute/status?${query.toString()}`, {
      method: "GET",
      signal: opts.signal,
    });
    if (!res.ok) return { ok: false };
    const json = (await res.json()) as {
      state?: unknown; deliveredRaw?: unknown; feeLamports?: unknown; feeUsd?: unknown;
    };
    const state = json?.state;
    // Base units or nothing. A malformed figure is dropped rather than shown: the one number
    // on the success screen may not be something we failed to parse.
    const deliveredRaw =
      typeof json?.deliveredRaw === "string" && /^[0-9]+$/.test(json.deliveredRaw) ? json.deliveredRaw : null;
    const feeLamports =
      typeof json?.feeLamports === "string" && /^[0-9]+$/.test(json.feeLamports) ? json.feeLamports : null;
    const feeUsd =
      typeof json?.feeUsd === "number" && Number.isFinite(json.feeUsd) && json.feeUsd >= 0 ? json.feeUsd : null;
    if (state === "confirmed" || state === "pending" || state === "failed") {
      return { ok: true, state, deliveredRaw, feeLamports, feeUsd };
    }
    return { ok: false };
  } catch {
    return { ok: false };
  }
}
