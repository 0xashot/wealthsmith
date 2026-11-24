/**
 * swapConfirmPresentation — Phase 4. The confirm sheet's pure display rules.
 *
 * Separate from the component for the same reason the reducer is separate from the hook: the
 * fixture suite runs in Node, and `SwapConfirmSheet` imports the icon registry, which uses
 * Vite's `import.meta.glob` and cannot load there. Logic left inside the component could only
 * ever be source-scanned.
 *
 * So the rules that decide what a person actually reads — what an absent figure looks like, how
 * a countdown is written, which copy a failure gets — live here, where they are tested by
 * running them.
 */
import {
  SWAP_CONFIRM_AWAITING_WALLET,
  SWAP_CONFIRM_CHECKING,
  SWAP_CONFIRM_DECLINED_DESC,
  SWAP_CONFIRM_DECLINED_TITLE,
  SWAP_CONFIRM_EXPIRED_DESC,
  SWAP_CONFIRM_EXPIRED_TITLE,
  SWAP_CONFIRM_SUBMITTING,
  SWAP_CONFIRM_SUBMIT_FAILED_DESC,
  SWAP_CONFIRM_SUBMIT_FAILED_TITLE,
  SWAP_CONFIRM_TIMEOUT_DESC,
  SWAP_CONFIRM_TIMEOUT_TITLE,
  SWAP_CONFIRM_UNAVAILABLE_DESC,
  SWAP_CONFIRM_UNAVAILABLE_TITLE,
  SWAP_CONFIRM_VERIFICATION_FAILED_DESC,
  SWAP_CONFIRM_VERIFICATION_FAILED_TITLE,
} from "../../state/approvedCopy";
import type { ExecutionFailureKey, ExecutionPhase } from "../../suggestions/swapExecution/executionLifecycle";
import { pct, usd } from "../../suggestions/swapQuote/quotePresentation";

/** The placeholder for a figure we do not have. Never a zero, never a guess. */
const ABSENT = "—";

/**
 * Exported so a caller can ask "is this figure absent?" without re-deriving the dash.
 *
 * The USD sub-lines need it: an unpriced amount omits its line entirely rather than printing a
 * dash under the token figure, which would read as a missing term rather than missing context.
 */
export const ABSENT_FIGURE = ABSENT;

/** mm:ss for the expiry countdown. Clamped at zero; a negative countdown is not a countdown. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Percent and USD for display, delegating to the quote lane's formatters.
 *
 * Deliberately not reimplemented. The route section and this sheet render in the same modal, and
 * a second formatter here showed the same price impact as "0.01%" where the route section said
 * "0.008%". A swap's impact is routinely far below 0.01%, so that rounding was not a cosmetic
 * difference — it was a different number.
 *
 * The only thing added is the absent rule: null, undefined and NaN render as “—”, never a figure.
 */
export function formatPercent(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return ABSENT;
  return pct(value) ?? ABSENT;
}

export function formatUsd(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return ABSENT;
  return usd(value) ?? ABSENT;
}

/**
 * An estimated figure, marked with a leading `~` on the VALUE.
 *
 * The mark belongs on the number rather than only in the label so that it travels with the
 * figure: someone comparing the values down the column sees which are approximate without
 * reading across to the labels, and the one figure with no tilde is the guaranteed one.
 *
 * An ABSENT value is returned untouched. "~—" would be marking the precision of a figure we do
 * not have, which is worse than saying nothing.
 */
export function formatApproxUsd(value: number | null | undefined): string {
  const formatted = formatUsd(value);
  return formatted === ABSENT ? ABSENT : `~${formatted}`;
}

/**
 * An estimated token amount, same rule. Never applied to the minimum: that figure is exact and
 * enforced on-chain, and a tilde there would contradict the only promise the sheet makes.
 */
export function formatApproxTokens(amount: string | null | undefined, symbol: string): string {
  if (typeof amount !== "string" || amount.length === 0) return ABSENT;
  return `~${amount} ${symbol}`;
}

/**
 * The one line of status under the terms, for every phase.
 *
 * Written as a total function over the phase rather than a chain of ternaries in the component,
 * because the gallery found the gap this closes: after Approve the sheet rendered a blank line.
 * The states existed in the machine and nowhere on screen, and a person who had just authorised
 * a transaction was shown nothing. A total function cannot have that hole.
 *
 * `confirmed` returns null because success is its own block, not a status line.
 */
/**
 * What the sheet says while the user is waiting on us, and it always says it IN THE BUTTON.
 *
 * There used to be a second place — a status line under the terms, for everything before
 * Approve. Two places meant the reader had to know where to look, and a renewal put a sentence
 * under the figures while the button underneath said nothing at all. The primary button is the
 * one thing on this sheet that is always about what happens next, so every waiting state now
 * lives there: Approve when there is something to approve, and a spinner with a word when
 * there is not.
 *
 * That also removes the layout problem the line created. The button slot is occupied in every
 * phase before completion, so nothing appears, disappears, or shifts underneath a reader who
 * is about to press it.
 *
 * `confirmed` and `failed` return null: success has its own block, and a failure replaces the
 * sheet's whole body with its own title and remedy.
 */
export type BusyPresentation = { where: "button"; label: string };

export function busyPresentationFor(phase: ExecutionPhase): BusyPresentation | null {
  switch (phase) {
    case "preparing":
    case "verifying":
      return { where: "button", label: SWAP_CONFIRM_CHECKING };
    case "signing":
      return { where: "button", label: SWAP_CONFIRM_AWAITING_WALLET };
    case "submitting":
    case "confirming":
      // Deliberately the same for both. The difference between "sent" and "being confirmed" is
      // ours, not the user's, and narrating it would imply a precision about where their
      // transaction is that we do not have.
      return { where: "button", label: SWAP_CONFIRM_SUBMITTING };
    case "ready":
      // The resting state: terms on screen, Approve available, nothing happening. Narrating it
      // put the word "Success" above an unpressed button, where it read as though the swap had
      // already gone through — and the screen that really does succeed says "Swap complete".
      return null;
    case "idle":
    case "confirmed":
    case "failed":
      return null;
  }
}


/** The button's busy label, or null when the button is not in a busy state. */
export function busyButtonLabelFor(phase: ExecutionPhase): string | null {
  const busy = busyPresentationFor(phase);
  return busy?.where === "button" ? busy.label : null;
}

/** Whether the flow has passed the point where cancelling is possible or meaningful. */
export function isAfterApproval(phase: ExecutionPhase): boolean {
  return phase === "signing" || phase === "submitting" || phase === "confirming" || phase === "confirmed";
}

/** Title and body for a terminal failure. `cancelled` has none — the sheet simply closes. */
export function failureCopy(failure: ExecutionFailureKey | null): { title: string; desc: string } | null {
  switch (failure) {
    case "declined":
      return { title: SWAP_CONFIRM_DECLINED_TITLE, desc: SWAP_CONFIRM_DECLINED_DESC };
    case "expired":
      // Its OWN title. Pairing "These terms expired" with "Couldn't prepare this swap" read as
      // an outage, which it is not — the terms were fine and simply ran out of time.
      return { title: SWAP_CONFIRM_EXPIRED_TITLE, desc: SWAP_CONFIRM_EXPIRED_DESC };
    case "verification_failed":
      return { title: SWAP_CONFIRM_VERIFICATION_FAILED_TITLE, desc: SWAP_CONFIRM_VERIFICATION_FAILED_DESC };
    case "submit_failed":
      return { title: SWAP_CONFIRM_SUBMIT_FAILED_TITLE, desc: SWAP_CONFIRM_SUBMIT_FAILED_DESC };
    case "confirm_timeout":
      return { title: SWAP_CONFIRM_TIMEOUT_TITLE, desc: SWAP_CONFIRM_TIMEOUT_DESC };
    case "plan_unavailable":
      return { title: SWAP_CONFIRM_UNAVAILABLE_TITLE, desc: SWAP_CONFIRM_UNAVAILABLE_DESC };
    case "cancelled":
      return null;
    default:
      return null;
  }
}

/**
 * A public explorer link for a submitted transaction.
 *
 * Offered on a completed or still-pending swap because the signature is the user's only record
 * of it, and on a timeout it is the only way they can find out what happened. Solscan is a
 * third-party explorer and the link says where it goes.
 */
export function solscanTransactionUrl(signature: string): string | null {
  if (typeof signature !== "string" || signature.length === 0) return null;
  return `https://solscan.io/tx/${encodeURIComponent(signature)}`;
}

/**
 * Whether to offer the explorer link for a signature in this phase.
 *
 * HIDDEN WHILE WE ARE STILL WATCHING. During `submitting` and `confirming` the sheet is already
 * polling the chain on the reader's behalf and will say what happened. Putting a link to a block
 * explorer beside a spinner invites them to go and do that job themselves, in another tab, at
 * the one moment they have nothing to decide — and whatever they find there mid-flight is more
 * likely to confuse than to inform.
 *
 * SHOWN THE MOMENT WE STOP. On success it is their record. On a timeout or a reverted
 * transaction it is their only recourse, and the failure branch renders it for exactly that
 * reason. So nothing is withheld: the link is deferred for as long as we are answering the
 * question ourselves, and appears as soon as we are not.
 */
export function showsExplorerLink(phase: ExecutionPhase, signature: string | null | undefined): boolean {
  if (typeof signature !== "string" || signature.length === 0) return false;
  // `signing` has no signature yet, so this only ever excludes `submitting` and `confirming`.
  if (busyPresentationFor(phase)?.where === "button") return false;
  return true;
}
