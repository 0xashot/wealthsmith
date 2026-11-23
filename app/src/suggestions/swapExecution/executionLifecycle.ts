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
}

export const initialExecutionState: ExecutionState = {
  phase: "idle",
  plan: null,
  signature: null,
  failure: null,
  failureDetail: null,
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
  | { type: "submit_failed"; detail?: string }
  | { type: "confirmed" }
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
): ExecutionState => ({ ...state, phase: "failed", failure, failureDetail: detail });

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

  switch (state.phase) {
    case "idle":
      return event.type === "prepare" ? { ...initialExecutionState, phase: "preparing" } : state;

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
      return state;

    case "submitting":
      if (event.type === "submitted") return { ...state, phase: "confirming", signature: event.signature };
      if (event.type === "submit_failed") return fail(state, "submit_failed", event.detail ?? null);
      return state;

    case "confirming":
      if (event.type === "confirmed") return { ...state, phase: "confirmed" };
      // A timeout means we stopped watching, NOT that the transaction failed. The signature is
      // kept so the user can look it up; claiming failure for something still in flight would be
      // the worst lie this flow could tell.
      if (event.type === "confirm_timeout") return fail(state, "confirm_timeout");
      return state;

    case "confirmed":
    case "failed":
      return state;

    default:
      return state;
  }
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
