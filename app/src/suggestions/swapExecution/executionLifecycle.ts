/**
 * executionLifecycle — Phase 3c. The state machine behind a confirm step.
 *
 * Deliberately NOT a React hook. The transitions are the part worth being sure about, so they are
 * a pure reducer that a hook drives. A machine you can test without mounting anything is a machine
 * you can reason about at 2am.
 *
 * The shape of the flow, and why each step exists:
 *
 *   idle → preparing → verifying → ready → signing → submitting → confirming → confirmed
 *                                     ↘ failed (at any point)
 *
 * `verifying` is its own state rather than part of `preparing` because it is the step that makes
 * the confirm screen honest, and a state you can see is a state you can prove ran. If verification
 * is ever skipped, the machine cannot reach `ready`.
 *
 * Rules the machine enforces, not the UI:
 *   • A signature is only ever requested from `ready`. There is no transition into `signing` from
 *     anywhere else, so no amount of UI haste can ask for one early.
 *   • `expire` is accepted from every pre-submission state and from none after. Once a transaction
 *     is submitted it is on-chain business; a local timer must not claim it failed.
 *   • Terminal states are terminal. Retrying means preparing a NEW plan with a fresh quote, never
 *     reusing one the user has already looked at.
 *   • Cancelling is always available before submission and always free.
 */
import type { SwapExecutionPlan, SwapExecutionOutcome } from "./executionContracts";

export type ExecutionPhase =
  | "idle"
  | "preparing"
  | "verifying"
  | "ready"
  | "signing"
  | "submitting"
  | "confirming"
  | "confirmed"
  | "failed";

/** Why a flow ended badly. Mapped to approved copy by the UI — never shown raw. */
export type ExecutionFailureKey =
  | "plan_unavailable"
  | "verification_failed"
  | "declined"
  | "expired"
  | "submit_failed"
  | "confirm_timeout"
  | "cancelled";

export interface ExecutionState {
  phase: ExecutionPhase;
  plan: SwapExecutionPlan | null;
  signature: string | null;
  failure: ExecutionFailureKey | null;
  /** Detail for analytics and logs. Never rendered. */
  failureDetail: string | null;
  /**
   * Base units actually delivered, read from the landed transaction. Only ever set alongside
   * `confirmed`, and null whenever the chain read could not produce it.
   *
   * It is kept on the machine rather than fetched by the view because it is part of the
   * OUTCOME: "the swap confirmed" and "it delivered this much" are one fact learned in one
   * read, and splitting them would let the success screen exist in a state where the first is
   * true and the second is still loading.
   */
  deliveredRaw: string | null;
  /**
   * What the chain charged, in lamports, and in USD. Set by either landed outcome.
   *
   * The reverted screen states this as a charge that already happened, so it may only ever
   * be the fee the transaction actually paid — never the conservative estimate the quote
   * disclosed beforehand, which was a different claim about a different moment.
   */
  feeLamports: string | null;
  feeUsd: number | null;
}

export const initialExecutionState: ExecutionState = {
  phase: "idle",
  plan: null,
  signature: null,
  failure: null,
  failureDetail: null,
  deliveredRaw: null,
  feeLamports: null,
  feeUsd: null,
};

export type ExecutionEvent =
  | { type: "prepare" }
  | { type: "plan_received"; plan: SwapExecutionPlan }
  | { type: "plan_failed"; detail?: string }
  | { type: "verified" }
  | { type: "verification_failed"; detail?: string }
  | { type: "sign" }
  | { type: "signed" }
  | { type: "declined" }
  | { type: "submitted"; signature: string }
  | { type: "submit_failed"; detail?: string; feeLamports?: string | null; feeUsd?: number | null }
  | { type: "confirmed"; deliveredRaw?: string | null; feeLamports?: string | null; feeUsd?: number | null }
  | { type: "confirm_timeout" }
  | { type: "expire" }
  | { type: "cancel" };

/** Phases from which a local expiry or cancellation may still end the flow. */
const PRE_SUBMISSION: ReadonlySet<ExecutionPhase> = new Set([
  "preparing",
  "verifying",
  "ready",
  "signing",
]);

const fail = (
  state: ExecutionState,
  failure: ExecutionFailureKey,
  detail: string | null = null,
  /**
   * What the chain charged on the way to this failure. Only a REVERT has one: every other
   * failure stopped before a transaction existed, and carrying a fee into those would let a
   * screen report a charge that never happened.
   */
  fee: { feeLamports?: string | null; feeUsd?: number | null } = {},
): ExecutionState => ({
  ...state,
  phase: "failed",
  failure,
  failureDetail: detail,
  feeLamports: fee.feeLamports ?? null,
  feeUsd: fee.feeUsd ?? null,
});

/**
 * The transition function. Unknown transitions return the state unchanged rather than throwing —
 * a late reply from an abandoned attempt must not resurrect a finished flow.
 */
export function executionReducer(state: ExecutionState, event: ExecutionEvent): ExecutionState {
  // Expiry and cancellation are special: they apply across several phases, and only before
  // submission. After a transaction is submitted its fate belongs to the chain, and a local timer
  // claiming otherwise would be reporting a failure we did not observe.
  if (event.type === "expire") {
    return PRE_SUBMISSION.has(state.phase) ? fail(state, "expired") : state;
  }
  if (event.type === "cancel") {
    return PRE_SUBMISSION.has(state.phase) ? fail(state, "cancelled") : state;
  }

  // RE-PREPARING, from anywhere nothing has been authorised yet.
  //
  // Handled before the switch because it is one rule about the whole machine rather than a
  // transition belonging to a phase.
  //
  // TWO KINDS, and the difference is what happens to the terms already on screen:
  //
  //   A RESTART — from `idle` or `failed` — clears everything. The reader asked for this (they
  //   pressed Refresh on an expired quote, or the flow is beginning), so there is nothing on
  //   screen worth keeping and stale figures must not survive into a new attempt.
  //
  //   A RENEWAL — from `ready` or `verifying` — KEEPS the plan while the new one is fetched.
  //   Nobody asked for it: the quote is replacing itself underneath someone who is mid-read.
  //   Clearing the plan emptied the sheet of its terms for as long as the round trip took,
  //   which in production is over a second, every twenty-five seconds. The auto-refresh exists
  //   precisely so that reading is not interrupted, and blanking the terms interrupts it far
  //   more than the expiry notice it replaced.
  //
  //   Holding the old terms is safe because they cannot be acted on: Approve exists only in
  //   `ready`, and this leaves the machine in `preparing`. The figures are replaced in place
  //   when the new plan lands, which is how a live quote behaves everywhere else.
  //
  // This was missing, and two separate things were broken by its absence, both silently:
  //   • the Refresh button offered on an expired quote dispatched `prepare` into `failed`, which
  //     returned state unchanged — the only remedy the sheet offers did nothing at all;
  //   • the quote could not renew itself at zero, because `prepare` from `ready` was dropped too.
  // A dropped event is invisible: no error, no transition, no way to tell from the outside. The
  // same shape as the `verification_failed` and `submit_failed` gaps fixed earlier.
  //
  // REFUSED from `signing` onward, which is the point of listing phases rather than allowing it
  // everywhere. Once the user has approved, the transaction is the wallet's and then the chain's;
  // replacing the plan underneath them would mean what they authorised is not what we hold.
  if (event.type === "prepare" && isRestartable(state.phase)) {
    const renewal = isRenewal(state.phase);
    return {
      ...initialExecutionState,
      phase: "preparing",
      // A renewal shows the outgoing terms until the incoming ones replace them. Everything
      // else — signature, failure, detail — is cleared either way: those describe an attempt
      // that is over.
      plan: renewal ? state.plan : null,
    };
  }

  switch (state.phase) {
    case "idle":
      return state;

    case "preparing":
      if (event.type === "plan_received") return { ...state, phase: "verifying", plan: event.plan };
      if (event.type === "plan_failed") return fail(state, "plan_unavailable", event.detail ?? null);
      // Also accepted here, and only as a FAILURE. The client validates the response before it
      // becomes a plan object — a payload carrying a signature, or whose proof was computed
      // against a different minimum, never reaches `verifying` because there is no plan to carry
      // there. That is still a verification refusal and deserves the refusal's copy, not
      // "couldn't prepare this swap", which would read as an outage.
      //
      // This adds no route to `ready`: the only transition into `ready` remains `verified` from
      // `verifying`, which SWXV-29 and SWXV-42 both hold.
      if (event.type === "verification_failed") {
        return fail(state, "verification_failed", event.detail ?? null);
      }
      return state;

    case "verifying":
      // The ONLY way to `ready`. Verification cannot be bypassed because nothing else leads here.
      if (event.type === "verified") return { ...state, phase: "ready" };
      if (event.type === "verification_failed") {
        return fail(state, "verification_failed", event.detail ?? null);
      }
      return state;

    case "ready":
      // The ONLY transition into `signing`. A signature is never requested from any other phase.
      return event.type === "sign" ? { ...state, phase: "signing" } : state;

    case "signing":
      if (event.type === "signed") return { ...state, phase: "submitting" };
      // Declining in the wallet is a normal outcome, not an error: the user said no.
      if (event.type === "declined") return fail(state, "declined");
      // A wallet that errors rather than declines fails HERE, not in `submitting`. With
      // `signAndSendTransaction` the signature and the submission are one call, so a failure
      // leaves the flow in `signing` with nothing signed and nothing sent. Without this the
      // event was dropped and the flow hung in `signing` — no error, no way out.
      //
      // Dispatching `signed` first to reach `submitting` would be the alternative, and it would
      // be a lie: it records a signature that does not exist.
      if (event.type === "submit_failed") {
        return fail(state, "submit_failed", event.detail ?? null, event);
      }
      return state;

    case "submitting":
      if (event.type === "submitted") return { ...state, phase: "confirming", signature: event.signature };
      if (event.type === "submit_failed") {
        return fail(state, "submit_failed", event.detail ?? null, event);
      }
      return state;

    case "confirming":
      if (event.type === "confirmed") {
        return {
          ...state,
          phase: "confirmed",
          deliveredRaw: event.deliveredRaw ?? null,
          feeLamports: event.feeLamports ?? null,
          feeUsd: event.feeUsd ?? null,
        };
      }
      // A timeout means we stopped watching, NOT that the transaction failed. The signature is
      // kept so the user can look it up; claiming failure for something still in flight would be
      // the worst lie this flow could tell.
      if (event.type === "confirm_timeout") return fail(state, "confirm_timeout");
      // THE CHAIN RAN IT AND IT REVERTED. `decideFromConfirmation` calls this "the ONE failure
      // confirmation may report", and the transition to receive it was never added — so the
      // event was dropped and a transaction the chain had definitively rejected sat in
      // `confirming` until the 90s deadline, then told the user it "may still complete".
      // Worse than saying nothing: a false statement about an outcome we already knew.
      //
      // Distinct from `confirm_timeout` precisely because we DO know. The signature survives
      // (`fail` spreads the state), so the sheet can show what happened and link to it.
      if (event.type === "submit_failed") {
        return fail(state, "submit_failed", event.detail ?? null, event);
      }
      return state;

    case "confirmed":
    case "failed":
      return state;

    default:
      return state;
  }
}

/**
 * Phases from which a fresh plan may be requested.
 *
 * Everything before a signature is asked for, plus `failed` — a terminal outcome the user is
 * entitled to retry, which is what the Refresh button on an expired quote is for. Retrying
 * always means a NEW quote, never reusing a plan already looked at.
 *
 * Written as an explicit list rather than `!isAfterApproval(...)` so that adding a phase to the
 * machine does not silently grant it the right to replace a live plan.
 */
/**
 * Phases where a `prepare` is the quote replacing ITSELF rather than the reader starting over.
 *
 * Exactly the states where terms are already on screen. Nobody asked for the renewal, so the
 * sheet must not empty out while it happens.
 */
export function isRenewal(phase: ExecutionPhase): boolean {
  return phase === "ready" || phase === "verifying";
}

export function isRestartable(phase: ExecutionPhase): boolean {
  return phase === "idle" || phase === "preparing" || phase === "verifying" ||
    phase === "ready" || phase === "failed";
}

/** True while the flow is doing something the user should not be able to restart. */
export function isExecutionBusy(phase: ExecutionPhase): boolean {
  return phase === "preparing" || phase === "verifying" || phase === "signing" || phase === "submitting" || phase === "confirming";
}

/** True once nothing further will happen without a brand-new plan. */
export function isExecutionTerminal(phase: ExecutionPhase): boolean {
  return phase === "confirmed" || phase === "failed";
}

/** Map a finished flow onto the reportable outcome in the execution contracts. */
export function outcomeFor(state: ExecutionState): SwapExecutionOutcome | null {
  if (state.phase === "confirmed") return "confirmed";
  if (state.phase !== "failed") return null;
  switch (state.failure) {
    case "declined":
    case "cancelled":
      return "declined";
    case "expired":
      return "expired";
    case "submit_failed":
      return "submit_failed";
    case "confirm_timeout":
      return "confirm_timeout";
    case "verification_failed":
      return "verification_failed";
    default:
      return "submit_failed";
  }
}
