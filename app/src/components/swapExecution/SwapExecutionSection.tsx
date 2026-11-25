/**
 * SwapExecutionSection — Phase 6. The confirm step, mounted.
 *
 * Everything before this was inert. This is the container that joins the offer, the wallet, the
 * hook and the sheet, and it is the first code path by which a user can approve a transaction.
 *
 * TWO STEPS, ON PURPOSE. A plan lives 25 seconds. Preparing one the moment a review modal opens
 * would start that clock while someone is still reading, and they would meet an expiry notice
 * for no reason other than that they read carefully. So the review shows the route as before,
 * and the plan is fetched when the user signals intent. The countdown then measures what it is
 * supposed to measure: the time between seeing the terms and approving them.
 *
 * It renders NOTHING unless the offer stands. No wallet, no permitted rail, an expired quote, a
 * provider we cannot build for — any of them and this is absent, and the modal keeps its
 * ordinary handoff footer. That is the fallback working, not a degraded state.
 */
import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import type { SwapActionContext, SwapQuoteComparisonAssessment } from "../../suggestions/swapQuote/swapQuoteContracts";
import { deriveExecutionOffer } from "../../suggestions/swapExecution/executionOffer";
import { useSwapExecutionPlan } from "./useSwapExecutionPlan";
import { useWalletSwapSubmitter } from "./useWalletSwapSubmitter";
import SwapConfirmSheet from "./SwapConfirmSheet";
import { SWAP_CONFIRM_CHECKING, SWAP_CONFIRM_CONTINUE_LABEL } from "../../state/approvedCopy";
import { demoConfirmTerms } from "../../suggestions/swapExecution/demoConfirmTerms";
import type { SwapExecutionEmitter } from "../../suggestions/swapExecution/swapExecutionEvents";

export interface SwapExecutionSectionProps {
  action: SwapActionContext;
  assessment: SwapQuoteComparisonAssessment | null;
  slippageBps?: number;
  nowMs?: number;
  /** Closes the whole review. Cancelling the confirm step alone returns here instead. */
  onClose: () => void;
  /** Receives funnel events. Absent emits none. */
  emit?: SwapExecutionEmitter;
  /**
   * The quote gave up after refreshing its full allowance in front of a visible reader.
   *
   * The host closes the review and raises a toast saying so — see SWAP_CONFIRM_EXPIRED_TOAST.
   * Passed up rather than handled here because closing the review is the page's decision, and
   * because every OTHER expiry still leaves the expired card in place with its Refresh button.
   * Absent keeps that card for this case too, which is the behaviour this replaced.
   */
  onExpiredGiveUp?: () => void;
  /**
   * Reports whether the confirm step is open, so the review can stand aside for it.
   *
   * The step is a SUBPAGE: while it is open the review hides its own heading and body, and
   * this sheet's back control returns them. Reported rather than assumed, because the review
   * owns its own layout and this component should not reach into it.
   */
  onStepChange?: (step: { active: boolean; onBack: () => void }) => void;
  /**
   * Demo Mode. The confirm step still renders and still fetches nothing real: Approve is shown
   * unavailable with the reason, so someone evaluating the product sees the whole flow through
   * to its last step instead of hitting a dead end where the interesting part should be.
   */
  demo?: boolean;
}

export default function SwapExecutionSection(props: SwapExecutionSectionProps) {
  const { action, assessment, onClose } = props;
  const { publicKey } = useWallet();
  const submit = useWalletSwapSubmitter();
  const [started, setStarted] = useState(false);

  // Report the step to the review, which hides its own content while it is open.
  const onStepChange = props.onStepChange;
  // The back handler travels with the report, because the review draws the control but only
  // this component knows how to leave the step.
  const leaveStep = useCallback(() => setStarted(false), []);
  useEffect(() => { onStepChange?.({ active: started, onBack: leaveStep }); }, [started, onStepChange, leaveStep]);
  // Leaving the review entirely must not leave it hidden behind a step that is gone.
  useEffect(() => () => onStepChange?.({ active: false, onBack: leaveStep }), [onStepChange, leaveStep]);

  const offer = deriveExecutionOffer({
    action,
    assessment,
    nowMs: props.nowMs ?? Date.now(),
  });

  const takerPublicKey = publicKey?.toBase58() ?? null;

  const execution = useSwapExecutionPlan({
    action,
    // Only an offered route reaches the hook, and an offer requires a selected provider, so the
    // fallback is unreachable rather than a default anyone relies on.
    provider: assessment?.selectedProviderId ?? "jupiter",
    emit: props.emit,
    takerPublicKey,
    slippageBps: props.slippageBps ?? 50,
    enabled: started,
    submit,
    onGaveUp: props.onExpiredGiveUp,
  });

  // DEMO MODE. There is no wallet, so the real flow cannot run — but the confirm step is the
  // part someone evaluating the product most needs to see, and the wallet check below would
  // render nothing at all. So the sheet is shown as a PREVIEW built from the demo quote: no
  // plan, no transaction, no simulation, and the lifecycle machine untouched. `phase="ready"`
  // is passed presentationally, exactly as the gallery passes it; nothing here can reach the
  // execution endpoint because nothing here calls it.
  if (props.demo) {
    const demoTerms = demoConfirmTerms(action, assessment, props.slippageBps ?? 50);
    // A demo quote missing its guaranteed minimum is not worth previewing — fall back to the
    // modal's ordinary hand-off footer rather than show a sample swap with a blank floor.
    // `!started` on the offer check, not the whole branch: the route quote has a TTL, and once
    // someone is reading the preview it must not evaporate underneath them. The offer decides
    // whether to OFFER, not whether to keep what was already opened.
    if ((!offer.offered && !started) || demoTerms == null) return null;
    if (!started) return <ContinueFooter onClose={onClose} onContinue={() => setStarted(true)} />;
    return (
      <SwapConfirmSheet
        demo
        phase="ready"
        terms={demoTerms}
        failure={null}
        signature={null}
        subpage
        // Cancel LEAVES; back returns to the review. Two exits, because they answer different
        // questions: "not this swap" and "let me re-read why you suggested it".
        onCancel={onClose}
      />
    );
  }

  // The Boundary said no, or there is no wallet to sign with. Render nothing; the modal's
  // existing handoff footer is the answer, and it is already there.
  //
  // THE OFFER GATES ENTRY ONLY. It is recomputed every render from the route comparison, which
  // has a TTL of its own — so checking it unconditionally meant the whole confirm section
  // unmounted the moment that quote aged out, however far the user had got. In the live path
  // that could happen with the wallet already open: the sheet, the "Confirming" state and the
  // explorer link would all disappear while their transaction was in flight, leaving them with
  // no record of a swap that was still happening.
  //
  // Once `started`, the flow owns itself. The PLAN's expiry governs from there, and it renews
  // itself; the route comparison that got us here has done its job.
  if ((!offer.offered && !started) || takerPublicKey == null || submit == null) return null;

  // THE FOOTER HOLDS THE FIRST WAIT, rather than the sheet opening empty.
  //
  // Building the first plan takes over a second in production — a provider round trip plus a
  // chain simulation. Mounting the sheet immediately meant a near-empty card (a title, a status
  // line, a Cancel) that then tripled in height when the terms landed, shoving the page down
  // right after the reader committed. So the Continue button keeps its place and spins, and the
  // sheet appears once it has something to say.
  //
  // `execution.plan == null` rather than the phase, because a RENEWAL also passes through
  // `preparing` — and by then the sheet is open with terms on screen and must stay that way.
  // A failure has no plan either, but it has something to show, so it is excluded explicitly.
  const awaitingFirstPlan = started && execution.plan == null && execution.phase !== "failed";

  if (!started || awaitingFirstPlan) {
    return (
      <ContinueFooter
        onClose={onClose}
        busy={awaitingFirstPlan}
        onContinue={() => {
          setStarted(true);
          execution.prepare();
        }}
      />
    );
  }

  return (
    <SwapConfirmSheet
      demo={props.demo}
      phase={execution.phase}
      terms={execution.plan?.terms ?? null}
      failure={execution.failure}
      signature={execution.signature}
      subpage
      onApprove={execution.approve}
      onRefresh={() => execution.prepare()}
      onCancel={() => {
        // Abandon anything in flight first — nothing is submitted at this stage, so leaving
        // costs the user nothing — then close the review entirely. The back control is what
        // returns them to the suggestion; Cancel is the way out.
        execution.cancel();
        onClose();
      }}
    />
  );
}

/**
 * The two-step entry footer, shared by the live and Demo paths so they cannot drift apart.
 *
 * The step exists because a plan lives 25 seconds: preparing one when the review opens would
 * start that clock while someone is still reading. In Demo Mode there is no clock, but the
 * same two steps are shown — the point of the demo is that the flow looks like the real one.
 */
function ContinueFooter({
  onClose,
  onContinue,
  busy = false,
}: {
  onClose: () => void;
  onContinue: () => void;
  /** Terms are being fetched. The button holds the wait in place of an empty sheet. */
  busy?: boolean;
}) {
  return (
    <div className="review-modal__footer review-modal__footer--actions">
      <button type="button" className="review-modal__tertiary-action" onClick={onClose}>
        Cancel
      </button>
      {busy ? (
        // Same button, same place, same label — only now it spins and cannot be pressed twice.
        // `aria-disabled` so the label change is still announced; see SwapConfirmSheet's busy
        // button for why a real `disabled` loses that.
        <button
          type="button"
          className="review-modal__primary-action review-modal__primary-action--busy"
          aria-disabled="true"
          onClick={(e) => e.preventDefault()}
        >
          <span className="swap-confirm__spinner" aria-hidden="true" />
          {/* Spinner only. Nothing is at stake while terms are fetched — no transaction, and
              nothing approved — so words would narrate our plumbing. The label stays in the
              DOM as the live region, and `sr-only` keeps it off screen. */}
          <span role="status" aria-live="polite" className="sr-only">{SWAP_CONFIRM_CHECKING}</span>
        </button>
      ) : (
        <button type="button" className="review-modal__primary-action" onClick={onContinue}>
          <span>{SWAP_CONFIRM_CONTINUE_LABEL}</span>
        </button>
      )}
    </div>
  );
}
