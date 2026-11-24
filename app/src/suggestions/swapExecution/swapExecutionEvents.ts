/**
 * swapExecutionEvents — Phase 6. What the confirm step is allowed to report.
 *
 * The same privacy boundary as `analytics/events.ts`, expressed as its own union because that
 * module lives on an unmerged branch and this lane must not wait for it. When the two meet, the
 * binding is one adapter function; until then these events are emitted through an injected
 * emitter and nothing here knows what PostHog is.
 *
 * NEVER A PROPERTY, for any reason: a USD amount, a token amount, a balance, a price impact, a
 * slippage figure, or a wallet address. Counts, categories, enum labels and durations only.
 *
 * AND NEVER A TRANSACTION SIGNATURE. This one is not obvious and deserves stating: a signature
 * is a public identifier that resolves, in one lookup, to the signing wallet and to every amount
 * in the transaction. Sending it would hand an analytics vendor the exact figures the rest of
 * this boundary exists to withhold, by reference instead of by value. It is the user's record
 * and it belongs on their screen, not in our funnel.
 *
 * What we are actually trying to learn is where people stop: how many reach a confirm step, how
 * many approve, how many decline, and how often we refuse on their behalf. None of that needs a
 * figure.
 */
import type { SuggestionSwapCategory, SwapProviderId } from "../swapQuote/swapQuoteContracts";
import type { ExecutionFailureKey, ExecutionPhase } from "./executionLifecycle";

export type SwapExecutionEvent =
  /** A confirm step was offered and the user asked for terms. The top of this funnel. */
  | { name: "swap_confirm_opened"; provider: SwapProviderId; category: SuggestionSwapCategory }
  /** Terms were fetched and checked; the approve button became available. */
  | { name: "swap_terms_ready"; provider: SwapProviderId }
  /** The user pressed Approve. Not yet a swap — the wallet may still refuse or fail. */
  | { name: "swap_approved"; provider: SwapProviderId }
  /** The wallet accepted and sent it. No signature — see the note above. */
  | { name: "swap_submitted"; provider: SwapProviderId }
  /** It landed. `durationMs` is from approval to confirmation, which is a duration, not a figure. */
  | { name: "swap_confirmed"; provider: SwapProviderId; durationMs: number }
  /** The user said no in their wallet. A normal outcome, and worth knowing how often. */
  | { name: "swap_declined"; provider: SwapProviderId }
  /** We stopped watching. The transaction may still have landed. */
  | { name: "swap_confirm_timeout"; provider: SwapProviderId }
  /**
   * We refused on the user's behalf, or could not offer terms. `reason` is one of our own
   * failure keys — never a provider message, which would be unbounded and could carry detail.
   */
  | { name: "swap_not_offered"; provider: SwapProviderId; reason: ExecutionFailureKey };

export type SwapExecutionEventName = SwapExecutionEvent["name"];

/** Receives events. Injected, so this lane never imports an analytics transport. */
export type SwapExecutionEmitter = (event: SwapExecutionEvent) => void;

export interface TransitionContext {
  provider: SwapProviderId;
  category: SuggestionSwapCategory;
  failure: ExecutionFailureKey | null;
  /** Milliseconds since Approve was pressed. Only read for `confirmed`. */
  sinceApprovalMs: number | null;
  /**
   * The quote is replacing itself, rather than the reader arriving at a confirm step.
   *
   * A renewal runs the same `ready → preparing → verifying → ready` path as the first fetch, so
   * without this the funnel counted a fresh "opened" and "terms ready" every time — seven of
   * each for someone who read for three minutes. Since the approve rate is approvals divided by
   * opens, that pushed the rate toward zero for exactly the most careful readers, which is the
   * opposite of what the number is for.
   *
   * The two events it suppresses are the ones that describe ARRIVING somewhere. Everything
   * after Approve happens at most once per flow and is unaffected.
   */
  renewal: boolean;
}

/**
 * The event for one phase change, or null.
 *
 * Pure, and driven by the transition rather than called from scattered places, so the funnel
 * cannot drift out of step with the machine: a state the flow reaches is a state that reports
 * itself, and one it cannot reach reports nothing.
 */
export function swapEventForTransition(
  previous: ExecutionPhase,
  next: ExecutionPhase,
  ctx: TransitionContext,
): SwapExecutionEvent | null {
  if (previous === next) return null;
  const { provider } = ctx;

  switch (next) {
    case "preparing":
      // Reached a confirm step — once per flow, however many quotes it burns through.
      return ctx.renewal ? null : { name: "swap_confirm_opened", provider, category: ctx.category };
    case "ready":
      return ctx.renewal ? null : { name: "swap_terms_ready", provider };
    case "signing":
      return { name: "swap_approved", provider };
    case "confirming":
      return { name: "swap_submitted", provider };
    case "confirmed":
      return { name: "swap_confirmed", provider, durationMs: Math.max(0, ctx.sinceApprovalMs ?? 0) };
    case "failed":
      return failureEvent(provider, ctx.failure);
    default:
      // `idle`, `verifying` and `submitting` are internal steps with no decision in them.
      // Reporting each would add rows without adding an answer.
      return null;
  }
}

function failureEvent(
  provider: SwapProviderId,
  failure: ExecutionFailureKey | null,
): SwapExecutionEvent | null {
  switch (failure) {
    case "declined":
      return { name: "swap_declined", provider };
    case "confirm_timeout":
      return { name: "swap_confirm_timeout", provider };
    case "cancelled":
      // Leaving a sheet is not an outcome worth a row of its own; the absence of an approval
      // after `swap_confirm_opened` already says it, without inventing a second way to count it.
      return null;
    case null:
      return null;
    default:
      return { name: "swap_not_offered", provider, reason: failure };
  }
}

/**
 * Every property value any of these events can carry, for the guard that proves the boundary.
 *
 * A fixture walks this rather than trusting the types, because a type keeps a number out of a
 * string field and nothing more — it cannot tell a duration from a dollar amount.
 */
export function eventPropertyValues(event: SwapExecutionEvent): unknown[] {
  return Object.entries(event)
    .filter(([key]) => key !== "name")
    .map(([, value]) => value);
}
