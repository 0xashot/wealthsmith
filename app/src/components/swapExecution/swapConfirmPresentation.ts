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
  swapConfirmRevertedDesc,
  SWAP_CONFIRM_REVERTED_RETRY_NOTE,
  SWAP_CONFIRM_REVERTED_TITLE,
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
 * Thousands separators for a token amount, WITHOUT touching its precision.
 *
 * Done on the string, digit by digit, rather than through `Number` or `toLocaleString`: a
 * minimum like `30453.030446` is the exact figure the chain enforces, and passing it through a
 * float to make it prettier is how a guarantee quietly becomes `30,453.03`. Only the integer
 * part is grouped; the fraction is copied through untouched, however long it is.
 *
 * Anything that is not a plain decimal is returned unchanged — a formatter is not the place to
 * decide what an unrecognised amount means.
 */
export function groupTokenAmount(amount: string): string {
  const [whole, fraction] = amount.split(".");
  if (!/^\d+$/.test(whole ?? "")) return amount;
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction == null ? grouped : `${grouped}.${fraction}`;
}

/** An exact token amount: grouped, with its symbol, and no approximation mark. */
export function formatTokens(amount: string | null | undefined, symbol: string): string {
  if (typeof amount !== "string" || amount.length === 0) return ABSENT;
  return `${groupTokenAmount(amount)} ${symbol}`;
}

/**
 * An estimated token amount, same rule. Never applied to the minimum: that figure is exact and
 * enforced on-chain, and a tilde there would contradict the only promise the sheet makes.
 */
export function formatApproxTokens(amount: string | null | undefined, symbol: string): string {
  const exact = formatTokens(amount, symbol);
  return exact === ABSENT ? ABSENT : `~${exact}`;
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
export type BusyPresentation = {
  /** Always set. Shown or merely announced, depending on `labelVisible`. */
  label: string;
  /**
   * Whether the label is on screen, or only read out.
   *
   * QUIET while we fetch terms. Nothing is at stake there: no transaction exists, nothing is in
   * flight, the reader has approved nothing. A spinner is the whole message, and words would
   * narrate our plumbing at the one moment it does not concern them.
   *
   * STATED after Approve, because those two states are not interchangeable: "Waiting for
   * wallet" means nothing has been sent and closing the tab costs nothing, while "Confirming"
   * means the transaction is already on the chain and closing the tab will not stop it. A bare
   * spinner cannot tell those apart, and the difference is the user's, not ours.
   */
  labelVisible: boolean;
};

export function busyPresentationFor(phase: ExecutionPhase): BusyPresentation | null {
  switch (phase) {
    case "preparing":
    case "verifying":
      return { label: SWAP_CONFIRM_CHECKING, labelVisible: false };
    case "signing":
      return { label: SWAP_CONFIRM_AWAITING_WALLET, labelVisible: true };
    case "submitting":
    case "confirming":
      // Deliberately the same for both. The difference between "sent" and "being confirmed" is
      // ours, not the user's, and narrating it would imply a precision about where their
      // transaction is that we do not have.
      return { label: SWAP_CONFIRM_SUBMITTING, labelVisible: true };
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
  return busyPresentationFor(phase)?.label ?? null;
}

/** Whether the flow has passed the point where cancelling is possible or meaningful. */
export function isAfterApproval(phase: ExecutionPhase): boolean {
  return phase === "signing" || phase === "submitting" || phase === "confirming" || phase === "confirmed";
}

/** Title and body for a terminal failure. `cancelled` has none — the sheet simply closes. */
export function failureCopy(
  failure: ExecutionFailureKey | null,
  /**
   * Whether the transaction reached the chain, i.e. whether a signature exists.
   *
   * `submit_failed` covers two outcomes that are not the same thing for the user. The wallet
   * refusing to send means nothing left their machine: no signature, no fee. A revert means it
   * was sent, ran, and failed: there IS a signature, the explorer link is on screen, and a fee
   * was charged. Telling someone their swap "wasn't sent" directly above a link to the
   * transaction that was sent is the one place this sheet said something untrue.
   *
   * Taken from the signature rather than from `failureDetail`, which is documented as never
   * being rendered and must stay that way.
   */
  reachedChain = false,
  /**
   * What the chain charged, already formatted. Only a revert uses it, and only when the
   * landed transaction could be read — see `swapConfirmRevertedDesc`.
   */
  fee: { sol: string; usd: string | null } | null = null,
): { title: string; desc: string; note?: string } | null {
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
      return reachedChain
        ? {
            title: SWAP_CONFIRM_REVERTED_TITLE,
            desc: swapConfirmRevertedDesc(fee),
            // A separate paragraph, not a third sentence: what happened and what to do next
            // are different things to read, and the second one carries a cost warning that
            // must not be buried at the end of a line about tokens.
            note: SWAP_CONFIRM_REVERTED_RETRY_NOTE,
          }
        : { title: SWAP_CONFIRM_SUBMIT_FAILED_TITLE, desc: SWAP_CONFIRM_SUBMIT_FAILED_DESC };
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
  // Any busy phase. `signing` has no signature yet, so this only ever excludes `submitting`
  // and `confirming` in practice.
  if (busyPresentationFor(phase) != null) return false;
  return true;
}

/**
 * Which mark, if any, belongs above a failure's description — and what KIND of mark it is.
 *
 * NOT every ending gets one, and the ones that do must not share an icon. This returns a kind
 * rather than a boolean because the colour carries meaning the glyph alone cannot:
 *
 *   "warning"   amber alert. Something went wrong and the user did not choose it — we could
 *               not prepare a swap, we refused terms we could not verify, or it failed to
 *               send. The reader needs to know their intent did not happen.
 *   "clock"     primary clock. Two endings, and neither is a failure. A quote aged out,
 *               which is the system working as designed and a new quote fixes. Or a
 *               confirmation outran OUR deadline while the transaction carried on — which
 *               must never read as failure, because it may still land. Amber on either would
 *               say something broke; a clock says something is about time, true of both.
 *   "cross"     danger cross. The user rejected the request in their wallet. The red is doing
 *               a different job from the amber one: it does not say "a problem occurred", it
 *               confirms a refusal, which is the convention every wallet uses for a rejected
 *               request and the fastest way for a reader to see their No landed. The COPY
 *               carries the tone — "Swap Canceled", not an error — and the mark only has to
 *               be unmistakable at a glance.
 *   null        `cancelled` alone, which never reaches a rendered state.
 *
 * An icon that appears for everything, in one colour, stops meaning anything.
 */
/**
 * Whether a failure should offer a retry.
 *
 * BOTH halves of `submit_failed` qualify, and they qualify for different reasons.
 *
 * A send that never left cost nothing and the terms were fine, so a second attempt is simply
 * the remedy. A REVERT is the harder case: the transaction reached the chain, ran, failed and
 * took a fee, so a retry can cost money again for a swap that may fail the same way.
 *
 * The answer is disclosure, not withholding. Someone whose swap reverted still wants the swap;
 * removing the button would not protect them, it would only send them to find the same retry
 * somewhere with no warning attached. So the button stays and the copy says what it may cost
 * — see SWAP_CONFIRM_REVERTED_RETRY_NOTE — which is the same trade this product makes
 * everywhere else: state the cost and let the person decide.
 *
 * `plan_unavailable` is the other one. We could not load a quote — an outage, a timeout — and
 * nothing was built, shown or sent, so asking again risks nothing and is the only remedy
 * there is. It used to hand off to the provider's own page instead; that link is gone (a swap
 * WealthSmith suggests is approved here or not at all), and without a retry the screen was a
 * dead end for a fault that usually clears in seconds.
 *
 * Every other ending either has a better remedy (a new quote) or nothing to retry at all: a
 * refused verification will be refused again, a decline was the user's own choice, and a
 * confirmation we stopped watching may still land.
 *
 * The retry RE-QUOTES rather than resending: terms that failed are older than the ones the
 * user would be agreeing to now, which is also why the note says "review a new quote".
 */
export function offersRetry(failure: ExecutionFailureKey | null, _reachedChain: boolean): boolean {
  return failure === "submit_failed" || failure === "plan_unavailable";
}

/**
 * Named after the MARK, not the ending, because endings share marks: an expired quote and a
 * confirmation we stopped watching are different events that want the same clock.
 */
export type FailureMarkKind = "warning" | "clock" | "cross";

export function failureMarkFor(failure: ExecutionFailureKey | null): FailureMarkKind | null {
  switch (failure) {
    case "plan_unavailable":
    case "verification_failed":
    case "submit_failed":
      return "warning";
    case "expired":
    case "confirm_timeout":
      return "clock";
    case "declined":
      return "cross";
    case "cancelled":
    case null:
      return null;
  }
}

/**
 * Base units → a decimal token string. No float anywhere on the path.
 *
 * The same arithmetic as the server's `rawToTokens`, repeated here rather than imported
 * because that module is server-only and importing it into a component would pull the
 * execution adapter into the browser bundle.
 */
export function rawToTokenString(raw: string, decimals: number): string | null {
  if (!/^[0-9]+$/.test(raw)) return null;
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) return null;
  if (decimals === 0) return raw;
  const padded = raw.padStart(decimals + 1, "0");
  const whole = padded.slice(0, padded.length - decimals);
  const frac = padded.slice(padded.length - decimals).replace(/0+$/, "");
  return frac.length > 0 ? `${whole}.${frac}` : whole;
}

/**
 * How many decimals a FIGURE gets when it is the headline of a finished swap.
 *
 * The terms table prints amounts in full, because before a swap every digit is part of what
 * is being agreed to. Afterwards the job changes: the reader wants to recognise a number, not
 * audit it, and `30606.06075 USDC` is harder to read at a glance than `30,606.06`.
 *
 * So: two decimals from a thousand up, four below it. That is not a stylistic preference, it
 * is where the digits stop carrying information — four decimals of a thousand-unit balance is
 * a millionth of a percent, and two decimals of a fractional token is nothing at all.
 *
 * NEVER TO ZERO. A small balance that rounds away would state that nothing arrived, so a
 * figure that would render as 0 keeps enough decimals to show four significant digits
 * instead. Rounding is a reading aid; it may not change what the number says.
 */
export function displayDecimalsFor(value: number): number {
  if (!Number.isFinite(value)) return 2;
  const magnitude = Math.abs(value);
  if (magnitude >= 1000) return 2;
  if (magnitude >= 0.0001 || magnitude === 0) return 4;
  // Four significant digits for anything smaller, capped so the string stays readable.
  return Math.min(12, Math.ceil(-Math.log10(magnitude)) + 3);
}

/**
 * The headline figure for a completed swap: grouped, rounded for reading, never a bare float
 * artefact. Returns null for anything it cannot parse, so the caller omits rather than prints
 * a dash where an amount should be.
 */
export function formatSettledAmount(tokens: string): string | null {
  const value = Number(tokens);
  if (!Number.isFinite(value)) return null;
  const decimals = displayDecimalsFor(value);
  return value.toLocaleString("en-US", {
    minimumFractionDigits: Math.min(2, decimals),
    maximumFractionDigits: decimals,
  });
}

/**
 * A network fee in dollars, as the parenthetical after its SOL amount.
 *
 * Its own formatter because a fee lives where the ordinary one cannot go. Real Solana fees
 * are a fraction of a cent — the swaps measured on 2026-11-26 paid $0.0013 to $0.0035 — and
 * a two-decimal format renders every one of them as "$0.00". On the screen that tells
 * someone a fee WAS charged, "(≈$0.00)" reads as "nothing was charged", directly contradicting
 * the sentence it sits in.
 *
 * So a positive amount under a cent is "<$0.01": true, and unmistakably not zero. From a cent
 * up it is approximate and says so. The returned string carries its own mark, so the sentence
 * adds none — one mark per figure, which the "(≈~$0.01)" rendering once got wrong.
 */
export function formatFeeUsd(usd: number | null | undefined): string | null {
  if (typeof usd !== "number" || !Number.isFinite(usd) || usd <= 0) return null;
  if (usd < 0.01) return "<$0.01";
  const formatted = formatUsd(usd);
  return formatted === ABSENT ? null : `\u2248${formatted}`;
}
