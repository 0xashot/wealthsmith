/**
 * demoOutcomes — the endings a review surface can be driven to, without a wallet.
 *
 * WHY A WHOLE OUTCOME AND NOT A FAILURE KEY. The first version of this passed one
 * `ExecutionFailureKey`, which could reach exactly the endings that are nothing but a failure
 * key. Four could not be reached at all, and they are the four that happen AFTER the user
 * approves — the moment the product stops being a preview and starts being money:
 *
 *   success                   a phase, not a failure, and it carries a signature.
 *   the swap wasn't sent      `submit_failed` with NO signature.
 *   the swap didn't go through `submit_failed` WITH one. Same key, different event, different
 *                             copy, and the sheet decides which from the signature alone.
 *   still pending             `confirm_timeout`, which also needs a signature, because the
 *                             explorer link is the reader's only recourse.
 *
 * So the unit here is the resting state the sheet would actually be in: phase, failure and
 * signature together. Passing the three separately would let a reviewer configure a
 * combination the live path cannot produce — a `confirmed` with no signature, a revert with
 * none — and then approve copy for a screen no user will ever see.
 *
 * NOTHING HERE EXECUTES. This is display state handed to a presentational sheet. The demo
 * branch of SwapExecutionSection returns before the hook's plan is touched, so no part of this
 * can fetch, sign or submit; see SWDM-3.
 */
import type { ExecutionFailureKey, ExecutionPhase } from "./executionLifecycle";

/**
 * A resting state. Not every phase qualifies: the busy ones pass through in milliseconds and
 * are reviewed as the button's loading state, not as destinations.
 */
export interface DemoExecutionOutcome {
  phase: Extract<ExecutionPhase, "ready" | "confirmed" | "failed">;
  failure: ExecutionFailureKey | null;
  /** Present exactly where the live path would have one, and null everywhere else. */
  signature: string | null;
  /**
   * The fee the chain took, for the two endings where a transaction landed. Lamports, like
   * the real read, so the review surface exercises the same conversion the live path does.
   */
  feeLamports?: string | null;
  feeUsd?: number | null;
  /**
   * The chain read produced nothing — no RPC, a pruned transaction, an output that is not an
   * SPL balance. The swap's OUTCOME is unaffected; only the figures are missing, and the
   * screens say so instead of printing a number they did not read.
   *
   * One flag for both figures because in production there is one cause: a single
   * `getTransaction` yields the delivered amount and the fee together, so when it fails,
   * both are absent. Splitting them here would let a reviewer approve a screen the live
   * path cannot produce.
   */
  chainReadFailed?: boolean;
  /**
   * REVIEW SURFACE ONLY. Pressing Swap raises the give-up toast and closes the review,
   * instead of opening the confirm step.
   *
   * The real behaviour is unchanged and lives in `useSwapExecutionPlan`: a quote renews
   * itself a bounded number of times with the modal in front of a visible reader, and only
   * when that allowance is spent does it give up. Demo Mode never calls anything, so it has
   * no expiry, no renewals and no way to reach that ending — which left the toast's copy
   * the one surface nobody had ever seen. This short-circuit exists to show it, and is read
   * exclusively inside `if (props.demo)`.
   */
  gaveUp?: boolean;
}

/**
 * The stand-in signature.
 *
 * Valid base58 and the right length, so the sheet's explorer link renders exactly as it would
 * in production — the layout, the placement and the decision to show it at all are part of
 * what is being reviewed. It resolves to nothing on Solscan, which is the truthful outcome:
 * no such transaction exists, because nothing was submitted. It reads as a sample on sight so
 * nobody mistakes it for a real one.
 *
 * It must never travel anywhere a real signature would. This is a review surface only.
 */
export const DEMO_SIGNATURE =
  "DemoSwapWa1kthroughSamp1eSignatureNotARea1TransactionNothingWasSubmittedDemoDemoDemoDemo";

export interface DemoOutcomeChoice {
  key: string;
  label: string;
  /** What the reviewer is looking at, and why the screen is shaped this way. */
  note: string;
  outcome: DemoExecutionOutcome;
}

/**
 * Every ending a reader can reach, in the order they occur in the flow: the terms, then the
 * things that stop the swap before approval, then the four that happen after it.
 *
 * `cancelled` is absent on purpose — it is in the failure union but never renders, because
 * cancelling leaves the step rather than resting in it. SWCS-5g holds this list to that:
 * adding a reachable ending without a way to review it should fail, which is how the four
 * post-approval endings went unreviewed in the first place.
 */
export const DEMO_OUTCOMES: DemoOutcomeChoice[] = [
  {
    key: "ready",
    label: "Terms",
    note: "The terms, then an Approve that Demo Mode cannot press.",
    outcome: { phase: "ready", failure: null, signature: null },
  },
  {
    key: "unavailable",
    label: "Couldn't prepare",
    note: "The provider is down, or execution is switched off. Nothing was attempted.",
    outcome: { phase: "failed", failure: "plan_unavailable", signature: null },
  },
  {
    key: "verification",
    label: "Couldn't verify",
    note: "The transaction we were handed does not match the terms we would show. We refuse on the user's behalf.",
    outcome: { phase: "failed", failure: "verification_failed", signature: null },
  },
  {
    key: "expired",
    label: "Quote expired",
    note: "The quote ran out before it was approved. A new quote is offered, because that is the remedy — and the mark is the primary-coloured clock, not the amber alert: nothing went wrong here.",
    outcome: { phase: "failed", failure: "expired", signature: null },
  },
  {
    key: "declined",
    label: "Declined",
    note: "Said no in the wallet. The reader's own decision, so the screen stops asking: a danger-red cross, no hand-off to another venue, and one button that closes.",
    outcome: { phase: "failed", failure: "declined", signature: null },
  },
  {
    key: "confirmed",
    label: "Succeeded",
    note: "Approved, submitted and confirmed on-chain. No received figure: reading what actually arrived needs a chain read the browser cannot make, and the rule is to omit it rather than reprint the estimate as if it were fact.",
    outcome: {
      phase: "confirmed", failure: null, signature: DEMO_SIGNATURE,
      feeLamports: "75000", feeUsd: 0.0138,
    },
  },
  {
    key: "confirmed-unreadable",
    label: "Succeeded, amount unread",
    note: "The swap confirmed, but the chain read produced no figure. The rule is to omit the amount rather than reprint the quote's estimate as though it were the outcome — so the screen says where the exact number is. Reachable in production whenever the RPC is down or the transaction has been pruned, which is exactly when nobody is watching the copy.",
    outcome: { phase: "confirmed", failure: null, signature: DEMO_SIGNATURE, chainReadFailed: true },
  },
  {
    key: "not-sent",
    label: "Wasn't sent",
    note: "The wallet or the network refused to broadcast it. No signature, no fee, funds untouched — so no explorer link, and the one ending that offers Try Again, because nothing happened that a second attempt could duplicate.",
    outcome: { phase: "failed", failure: "submit_failed", signature: null },
  },
  {
    key: "reverted",
    label: "Didn't go through",
    note: "Same failure key as the one above, and a different event: this one WAS sent, ran on-chain and failed. There is a signature, the fee it took is stated as fact (read from the transaction, not from the quote's estimate), and Try Again carries a warning that another attempt may cost again.",
    // 5,000 lamports base + a priority fee, which is what a Jupiter swap typically pays.
    outcome: {
      phase: "failed", failure: "submit_failed", signature: DEMO_SIGNATURE,
      feeLamports: "75000", feeUsd: 0.0138,
    },
  },
  {
    key: "reverted-unreadable",
    label: "Failed, fee unread",
    note: "Same revert, with no fee figure. The sentence keeps the fact and drops the number: naming a fee we did not read would be wrong, and omitting that one was taken would be incomplete.",
    outcome: { phase: "failed", failure: "submit_failed", signature: DEMO_SIGNATURE, chainReadFailed: true },
  },
  {
    key: "pending",
    label: "Still pending",
    note: "We stopped watching. It may still land, so this must not read as failure — the same primary clock as an expiry, no hand-off that could start a second swap beside the first, and the explorer link as the way to check.",
    outcome: { phase: "failed", failure: "confirm_timeout", signature: DEMO_SIGNATURE },
  },
  {
    key: "gave-up",
    label: "Quote gave up",
    note: "The quote renewed its full allowance with the modal open and still had no decision, so the review closes itself and a toast says what happened. Press Swap to see it. The real ending needs several real expiries, which Demo Mode has none of — this is the review surface short-circuiting to the toast, not a change to the behaviour.",
    outcome: { phase: "ready", failure: null, signature: null, gaveUp: true },
  },
];
