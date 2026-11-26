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
 * IT ALWAYS RENDERS A FOOTER. Swap while a swap can be offered — including when the wallet link
 * has to be reopened first, which pressing Swap does; Reconnect Wallet when that did not work;
 * Close and Check Again when the comparison offers nothing.
 * There is no link out to a provider anywhere in it — not before the step, and not on its
 * failure screens.
 */
import { useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import type { SwapActionContext, SwapQuoteComparisonAssessment } from "../../suggestions/swapQuote/swapQuoteContracts";
import { deriveExecutionOffer, deriveSwapEntry, type SwapEntry } from "../../suggestions/swapExecution/executionOffer";
import { useSwapExecutionPlan } from "./useSwapExecutionPlan";
import { useWalletSwapSubmitter } from "./useWalletSwapSubmitter";
import { SwapExecutionSeamContext } from "./swapExecutionSeam";
import { useWalletReconnect } from "./useWalletReconnect";
import { SwapFlowEventsContext } from "./swapFlowEvents";
import SwapConfirmSheet from "./SwapConfirmSheet";
import {
  SWAP_CONFIRM_CHECKING,
  SWAP_CONFIRM_CLOSE_LABEL,
  SWAP_CONFIRM_COMPLETE_TITLE,
  SWAP_CONFIRM_CONTINUE_LABEL,
  SWAP_CONFIRM_SUBPAGE_TITLE,
  SWAP_ENTRY_CHECK_AGAIN_LABEL,
  SWAP_ENTRY_CHECKING_AGAIN,
  SWAP_ENTRY_CONNECT_LABEL,
  SWAP_ENTRY_RECONNECT_LABEL,
  SWAP_ENTRY_RECONNECTING,
  SWAP_ENTRY_WALLET_TOOLTIP,
} from "../../state/approvedCopy";
import { failureCopy, rawToTokenString } from "./swapConfirmPresentation";
import { demoConfirmTerms } from "../../suggestions/swapExecution/demoConfirmTerms";
import type { SwapExecutionEmitter } from "../../suggestions/swapExecution/swapExecutionEvents";
import type { DemoExecutionOutcome } from "../../suggestions/swapExecution/demoOutcomes";
import type { ExecutionFailureKey } from "../../suggestions/swapExecution/executionLifecycle";

export interface SwapExecutionSectionProps {
  action: SwapActionContext;
  assessment: SwapQuoteComparisonAssessment | null;
  slippageBps?: number;
  nowMs?: number;
  /**
   * The route comparison is being fetched — the first time, or a refresh. While it is and no
   * swap can be offered yet, the Swap button holds its place and spins.
   */
  comparisonLoading?: boolean;
  /**
   * Re-run the route comparison without blanking what is on screen. Pressing Swap calls it
   * when the comparison has expired, and continues once it answers; Check Again calls it when
   * the comparison offered nothing. Absent where there is nothing to re-run (the gallery's
   * presets) — Swap then proceeds on what is shown, and a blocked review offers only Close.
   */
  onRefreshComparison?: () => void;
  /** Closes the whole review. Cancelling the confirm step alone returns here instead. */
  onClose: () => void;
  /**
   * Opens the app's own Connect Wallet dialog (the host closes the review first).
   *
   * Offered when a swap could be made but no wallet is known to reconnect to — the session's
   * wallet is not installed in this browser. Absent, that state keeps a greyed Swap with the
   * reason on hover, because a button that opens nothing is worse than none.
   */
  onConnectWallet?: () => void;
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
  onStepChange?: (step: { active: boolean; onBack: () => void; title: string }) => void;
  /**
   * Demo Mode only: rest the sheet in a given ENDING instead of the terms preview.
   *
   * The live path reaches these by actually happening — a provider outage, a refused
   * verification, a wallet rejection, a revert. Demo Mode cannot, because it never calls
   * anything, so without this the only outcome anyone could walk through was the one that
   * works. Reviewing a confirm step by its happy path alone is how its failure copy goes
   * unread until a user is the first to meet it.
   *
   * A whole outcome rather than a failure key, because four of the endings — success, a
   * refusal to broadcast, a revert, and a timeout — are distinguished by phase and by the
   * presence of a signature, not by the key. See `demoOutcomes.ts`.
   *
   * Ignored outside Demo Mode, so it can never alter a real flow's outcome.
   */
  demoOutcome?: DemoExecutionOutcome | null;
  /**
   * Demo Mode. The confirm step still renders and still fetches nothing real: Approve is shown
   * unavailable with the reason, so someone evaluating the product sees the whole flow through
   * to its last step instead of hitting a dead end where the interesting part should be.
   */
  demo?: boolean;
  /**
   * The entry button's label. "Swap" by default; a Trim review says "Trim" — it is the same
   * step (see the terms, then approve), named by what the user came to do.
   */
  continueLabel?: string;
  /**
   * ONE STEP OF A SEQUENCE. The three below turn this section into the per-token step of a
   * multi-token Trim: the user has already chosen to sell this token, so the step starts by
   * itself, is judged as the single transaction it is, and reports how it ended instead of
   * resting on a result screen.
   *
   * `perLegApproval` — judge this leg alone (see `deriveExecutionOffer`).
   * `autoStart`      — begin as if Swap had been pressed, including reopening the wallet link.
   * `onSettled`      — called ONCE when the step is over: the swap landed, it failed, or it
   *                    could not be offered. The host moves on; this section then draws nothing.
   */
  perLegApproval?: boolean;
  autoStart?: boolean;
  onSettled?: (result: SwapSettled) => void;
}

/** How one step of a sequence ended. */
export type SwapSettled =
  | { status: "confirmed"; receivedTokens: string | null; signature: string | null }
  | { status: "failed"; failure: ExecutionFailureKey; signature: string | null }
  /** No swap could be offered for this leg right now — nothing was requested or sent. */
  | { status: "not_offered" };

/** How long a landed swap may wait for its delivered amount before it is reported without one. */
export const SETTLED_FACTS_GRACE_MS = 4_000;

/** How long a reconnect may go unanswered before the button stops spinning and offers a retry. */
export const WALLET_RECONNECT_CAP_MS = 30_000;

export default function SwapExecutionSection(props: SwapExecutionSectionProps) {
  const { action, assessment, onClose } = props;
  const comparisonLoading = props.comparisonLoading === true;
  const { publicKey } = useWallet();
  const walletSubmit = useWalletSwapSubmitter();
  // The walkthrough's stand-ins, when it provides them. With a seam present the real wallet's
  // key and submitter are not used at all — see swapExecutionSeam.ts.
  const seam = useContext(SwapExecutionSeamContext);
  const flowEmit = useContext(SwapFlowEventsContext);
  const submit = seam ? seam.submit : walletSubmit;
  const [started, setStarted] = useState(false);
  /**
   * Demo Mode only: the chosen failure has been refreshed past.
   *
   * The expired card's copy says "Refresh to get current terms", and without a handler it said
   * so above no such button — copy pointing at a control that does not exist. In a demo a
   * refresh yields the terms, because there is nothing real to re-fetch.
   */
  const [demoRefreshed, setDemoRefreshed] = useState(false);

  /**
   * What the review's header shows while the step is open.
   *
   * A FAILURE names itself — "Couldn't Prepare Your Swap" rather than "Review Swap" above a
   * body explaining why there is nothing to review. The heading is the step's one title, so a
   * failed step must not be announced as a review of terms it does not have.
   */
  const demoChosen = demoRefreshed ? null : props.demoOutcome ?? null;
  const activeOutcome = props.demo ? demoChosen : null;
  const activeFailure = activeOutcome?.failure ?? null;

  // Report the step to the review, which hides its own content while it is open.
  const onStepChange = props.onStepChange;
  // The back handler travels with the report, because the review draws the control but only
  // this component knows how to leave the step.
  const leaveStep = useCallback(() => { setStarted(false); setDemoRefreshed(false); }, []);

  const perLegApproval = props.perLegApproval === true;
  const continueLabel = props.continueLabel ?? SWAP_CONFIRM_CONTINUE_LABEL;
  const offer = deriveExecutionOffer({
    action,
    assessment,
    nowMs: props.nowMs ?? Date.now(),
    perLegApproval,
  });

  const takerPublicKey = seam ? seam.takerPublicKey : publicKey?.toBase58() ?? null;
  // Demo Mode has no wallet and needs none: its confirm step is a preview that cannot submit.
  const walletReady = props.demo === true || (takerPublicKey != null && submit != null);
  // Reopens the wallet link on request. The wallet name is the adapter's own selection here; a
  // host with its own session passes the wallet that session signed in with.
  const walletLink = useWalletReconnect(null, seam);
  // What the footer shows before the step is open. See `deriveSwapEntry` for why an aged
  // comparison keeps the button and every other refusal does not.
  const entry: SwapEntry = deriveSwapEntry({
    offer,
    assessment,
    comparisonLoading,
    walletReady,
    nowMs: props.nowMs ?? Date.now(),
  });

  const execution = useSwapExecutionPlan({
    action,
    // Only an offered route reaches the hook, and an offer requires a selected provider, so the
    // fallback is unreachable rather than a default anyone relies on.
    provider: assessment?.selectedProviderId ?? "jupiter",
    // The caller's emitter, or the host app's (see swapFlowEvents). Neither → nothing is emitted.
    emit: props.emit ?? flowEmit ?? undefined,
    takerPublicKey,
    slippageBps: props.slippageBps ?? 50,
    enabled: started,
    submit,
    onGaveUp: props.onExpiredGiveUp,
    ...(seam ? { fetcher: seam.planFetcher, confirmationFetcher: seam.confirmationFetcher } : {}),
  });

  const liveFailure = props.demo ? null : execution.failure;
  const shownFailure = activeFailure ?? liveFailure;
  // The signature decides WHICH `submit_failed` this is, so the header has to read it from the
  // same place the sheet does — otherwise a revert is titled as a swap that was never sent.
  const shownSignature = props.demo ? activeOutcome?.signature ?? null : execution.signature;
  const shownPhase = props.demo ? activeOutcome?.phase ?? "ready" : execution.phase;
  const stepTitle =
    (shownFailure ? failureCopy(shownFailure, shownSignature != null)?.title : null) ??
    // A finished swap is not a review of terms. The step's heading is its one title, and
    // leaving it at "Review Swap" told the reader to go on deciding something already done.
    (shownPhase === "confirmed" ? SWAP_CONFIRM_COMPLETE_TITLE : SWAP_CONFIRM_SUBPAGE_TITLE);

  // THE BUTTON HOLDS THE FIRST WAIT, and the review stays exactly as it is until then.
  //
  // Building the first plan takes over a second in production — a provider round trip plus a
  // chain simulation. `execution.plan == null` rather than the phase, because a RENEWAL also
  // passes through `preparing`, and by then the sheet is open with terms on screen and must
  // stay that way. A failure has no plan either, but it has something to show.
  const awaitingFirstPlan =
    props.demo !== true && started && execution.plan == null && execution.phase !== "failed";
  // The step is reported OPEN only once it has something to show. Reporting it on the click
  // swapped the review's heading and hid its body while the footer was still spinning — a
  // near-empty modal titled "Review Swap" with nothing to review yet.
  const stepOpen = started && !awaitingFirstPlan;

  useEffect(() => {
    onStepChange?.({ active: stepOpen, onBack: leaveStep, title: stepTitle });
  }, [stepOpen, onStepChange, leaveStep, stepTitle]);

  /**
   * Pressing Swap.
   *
   * Decided at the moment of the press, not from the last render: the review may have been
   * open for minutes, and what was true when it was drawn is not what is true now.
   *
   * When the comparison has EXPIRED it is re-run first, quietly, with the button spinning in
   * place; the effect below continues once it answers. Opening the step is all that is needed
   * to start the plan — `useSwapExecutionPlan` requests it when `enabled` turns true.
   *
   * CHECK AGAIN is the same re-run asked for by name, from a review that could offer nothing.
   * It differs only in what happens next: Swap continues into the step, Check Again stops and
   * lets the footer and the notice redraw from the new answer. One mechanism for both, so the
   * wait is held the same way — the pressed button spins where it is and nothing else moves.
   */
  const [awaitingRefresh, setAwaitingRefresh] = useState<"swap" | "check" | null>(null);
  const awaitingQuote = awaitingRefresh === "swap";
  const checkingAgain = awaitingRefresh === "check";
  const awaitingQuoteRef = useRef<{ comparedAt: string | null; sawLoading: boolean } | null>(null);
  const entryNow = useCallback((): SwapEntry => {
    const nowMs = props.nowMs ?? Date.now();
    return deriveSwapEntry({
      offer: deriveExecutionOffer({ action, assessment, nowMs, perLegApproval }),
      assessment,
      comparisonLoading: false,
      walletReady,
      nowMs,
    });
  }, [action, assessment, walletReady, props.nowMs, perLegApproval]);

  /**
   * THE WALLET LINK IS REOPENED BY THE PRESS THAT NEEDS IT.
   *
   * After a page refresh the session is still signed in and the header still names the wallet,
   * but the adapter's live connection is gone (auto-connect is off by design). Greying Swap and
   * asking someone who looks connected to "reconnect" was true and useless. So Swap stays a
   * working button: pressing it reopens the link — spinning in place, like every other wait
   * here — and then carries on exactly as a press with a wallet would.
   *
   * If that does not produce a wallet that can sign (declined in the wallet, a different
   * account, nothing within the cap), the button becomes Reconnect Wallet, which tries again
   * and does NOT continue into the swap by itself.
   */
  const [awaitingWallet, setAwaitingWallet] = useState<"swap" | "reconnect" | null>(null);
  const [walletFailed, setWalletFailed] = useState(false);
  const startReconnect = (then: "swap" | "reconnect") => {
    if (!walletLink.canReconnect || awaitingWallet != null) return;
    setAwaitingWallet(then);
    walletLink.reconnect();
  };
  const onReconnect = () => startReconnect("reconnect");

  const onRefreshComparison = props.onRefreshComparison;
  const onSwap = () => {
    const at = entryNow();
    if (at.kind === "wallet_unavailable") { startReconnect("swap"); return; }
    if (at.kind !== "swap") return;
    if (at.refreshFirst && onRefreshComparison) {
      awaitingQuoteRef.current = { comparedAt: assessment?.comparedAt ?? null, sawLoading: false };
      setAwaitingRefresh("swap");
      onRefreshComparison();
      return;
    }
    setStarted(true);
  };
  const onCheckAgain = () => {
    if (!onRefreshComparison || awaitingRefresh != null) return;
    awaitingQuoteRef.current = { comparedAt: assessment?.comparedAt ?? null, sawLoading: false };
    setAwaitingRefresh("check");
    onRefreshComparison();
  };

  // A LAYOUT effect: the notice and the route above are redrawn from the new answer before
  // paint, and the footer has to change in that same frame — otherwise one frame shows a found
  // route beside a Check Again that is still spinning.
  useLayoutEffect(() => {
    const waiting = awaitingQuoteRef.current;
    if (awaitingRefresh == null || waiting == null) return;
    if (comparisonLoading) { waiting.sawLoading = true; return; }
    // Not loading — but is that "answered" or "not started yet"? The refresh reaches this
    // component a render after it was asked for, so until a load has been SEEN, or the answer
    // has visibly changed, there is nothing to conclude.
    const changed = (assessment?.comparedAt ?? null) !== waiting.comparedAt;
    if (!waiting.sawLoading && !changed) return;
    const was = awaitingRefresh;
    awaitingQuoteRef.current = null;
    setAwaitingRefresh(null);
    // Check Again ends here: the footer and the notice redraw from the new answer, and if it
    // found a route the reader sees it and presses Swap themselves.
    if (was !== "swap") return;
    // Swap continues only if the fresh comparison still offers this swap outright. If it does
    // not, the footer redraws from the new answer and the notice says why.
    const at = entryNow();
    if (at.kind === "swap" && !at.refreshFirst) setStarted(true);
  }, [awaitingRefresh, comparisonLoading, assessment, entryNow]);

  // How a reconnect ends. A LAYOUT effect, so the press that asked for it carries straight on:
  // a passive one would paint a frame of an idle Swap between the wallet arriving and the
  // spinner resuming for the terms.
  const walletLinkStatus = walletLink.status;
  useLayoutEffect(() => {
    if (awaitingWallet == null) return;
    if (walletReady) {
      const was = awaitingWallet;
      setAwaitingWallet(null);
      setWalletFailed(false);
      // Only a pressed Swap continues. Reconnect Wallet stops here and Swap returns.
      if (was === "swap") onSwap();
      return;
    }
    // "connected" without a ready wallet is a wallet on a different account from the session's.
    if (walletLinkStatus === "failed" || walletLinkStatus === "connected") {
      setAwaitingWallet(null);
      setWalletFailed(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [awaitingWallet, walletReady, walletLinkStatus]);
  // A wallet prompt left unanswered must not leave the button spinning for good.
  useEffect(() => {
    if (awaitingWallet == null) return;
    const timer = setTimeout(() => { setAwaitingWallet(null); setWalletFailed(true); }, WALLET_RECONNECT_CAP_MS);
    return () => clearTimeout(timer);
  }, [awaitingWallet]);
  // A wallet that turns up by itself (the account was switched in the extension) clears it.
  useEffect(() => {
    if (walletReady && walletFailed) setWalletFailed(false);
  }, [walletReady, walletFailed]);

  // A wallet that goes away before there is anything to show takes the step back to its entry
  // footer, which says so. Without this the button would spin for a plan nobody can request.
  useEffect(() => {
    if (started && awaitingFirstPlan && !walletReady) setStarted(false);
  }, [started, awaitingFirstPlan, walletReady]);

  // A STEP OF A SEQUENCE STARTS ITSELF. The user chose this token on the previous screen, so
  // asking them to press Swap again would be a second confirmation of the same decision. It
  // waits for the comparison's first answer, then does exactly what a press would — or reports
  // that there is nothing to offer, so the sequence can move on.
  const onSettled = props.onSettled;
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (props.autoStart !== true || autoStartedRef.current) return;
    const at = entryNow();
    if (at.kind === "swap" || at.kind === "wallet_unavailable") { autoStartedRef.current = true; onSwap(); return; }
    if (comparisonLoading) return;
    autoStartedRef.current = true;
    onSettled?.({ status: "not_offered" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.autoStart, props.demo, comparisonLoading, assessment, walletReady]);

  // …AND SAYS HOW IT ENDED, once. A landed swap waits a moment for the amount the chain says
  // arrived — the confirmation and the delivered figure are read separately — and is reported
  // without one rather than held up for it.
  const settledRef = useRef(false);
  const livePhase = props.demo ? null : execution.phase;
  const settledFailure = execution.failure;
  const liveDelivered = execution.deliveredRaw;
  const liveSignature = execution.signature;
  const outputDecimals = execution.plan?.verification.outputDecimals ?? null;
  useEffect(() => {
    if (onSettled == null || settledRef.current) return;
    if (livePhase === "failed" && settledFailure != null) {
      settledRef.current = true;
      onSettled({ status: "failed", failure: settledFailure, signature: liveSignature });
      return;
    }
    if (livePhase !== "confirmed") return;
    const report = () => {
      if (settledRef.current) return;
      settledRef.current = true;
      onSettled({
        status: "confirmed",
        receivedTokens: liveDelivered != null && outputDecimals != null ? rawToTokenString(liveDelivered, outputDecimals) : null,
        signature: liveSignature,
      });
    };
    if (liveDelivered != null) { report(); return; }
    const timer = setTimeout(report, SETTLED_FACTS_GRACE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [livePhase, settledFailure, liveDelivered, liveSignature, outputDecimals]);

  // The footer before the step is open — never nothing.
  const entryFooter = () => {
    // First, because a re-run passes through "loading": the button that was pressed keeps the
    // wait, instead of the footer turning into a spinning Swap for the length of the request.
    if (checkingAgain) return <CheckAgainFooter onClose={onClose} busy onCheckAgain={onCheckAgain} />;
    if (entry.kind === "swap") {
      return <ContinueFooter onClose={onClose} busy={awaitingQuote || props.autoStart === true} onContinue={onSwap} label={continueLabel} />;
    }
    if (entry.kind === "loading") return <ContinueFooter onClose={onClose} busy onContinue={onSwap} label={continueLabel} />;
    if (entry.kind === "wallet_unavailable") {
      // Swap itself reopens the link — see `awaitingWallet`.
      if (walletLink.canReconnect && !walletFailed) {
        return <ContinueFooter onClose={onClose} busy={awaitingWallet === "swap" || props.autoStart === true} onContinue={onSwap} label={continueLabel} />;
      }
      // That was tried and did not work: the remedy takes Swap's place.
      if (walletLink.canReconnect) {
        return <ReconnectFooter onClose={onClose} busy={awaitingWallet === "reconnect"} onReconnect={onReconnect} />;
      }
      // No wallet is known here to reconnect to, so the way forward is choosing one: the app's
      // own Connect Wallet dialog. Without a host to open it, greyed, with the reason on hover.
      if (props.onConnectWallet) return <ConnectWalletFooter onClose={onClose} onConnectWallet={props.onConnectWallet} />;
      return <ContinueFooter onClose={onClose} unavailableTooltip={SWAP_ENTRY_WALLET_TOOLTIP} onContinue={onSwap} label={continueLabel} />;
    }
    // Nothing to offer. Asking again is the one thing that can change that, so it is the
    // primary action — unless there is nothing to ask (the gallery's presets).
    return onRefreshComparison
      ? <CheckAgainFooter onClose={onClose} onCheckAgain={onCheckAgain} />
      : <CloseFooter onClose={onClose} />;
  };
  /**
   * REVIEW SURFACE ONLY. The chosen demo outcome is the give-up ending, so pressing Swap
   * does what a spent renewal allowance does in the live flow: raise the toast, close the
   * review.
   *
   * Guarded on `props.demo` like every other demo affordance, so a real flow can never take
   * this path — the live give-up is decided by `useSwapExecutionPlan` from actual expiries
   * and renewals, and nothing here touches that. It exists because Demo Mode has no expiry
   * at all, which left the toast's copy the one surface nobody had ever seen on screen.
   */
  const demoGaveUp = props.demo && started && (activeOutcome?.gaveUp ?? false);
  const onExpiredGiveUp = props.onExpiredGiveUp;
  useEffect(() => {
    if (!demoGaveUp) return;
    onExpiredGiveUp?.();
    onClose();
  }, [demoGaveUp, onExpiredGiveUp, onClose]);

  // Leaving the review entirely must not leave it hidden behind a step that is gone.
  useEffect(() => () => onStepChange?.({ active: false, onBack: leaveStep, title: SWAP_CONFIRM_SUBPAGE_TITLE }), [onStepChange, leaveStep]);

  // DEMO MODE. There is no wallet, so the real flow cannot run — but the confirm step is the
  // part someone evaluating the product most needs to see, and the wallet check below would
  // render nothing at all. So the sheet is shown as a PREVIEW built from the demo quote: no
  // plan, no transaction, no simulation, and the lifecycle machine untouched. `phase="ready"`
  // is passed presentationally, exactly as the gallery passes it; nothing here can reach the
  // execution endpoint because nothing here calls it.
  if (props.demo) {
    const demoTerms = demoConfirmTerms(action, assessment, props.slippageBps ?? 50);
    // A demo quote missing its guaranteed minimum is not worth previewing — the footer offers
    // Close rather than a sample swap with a blank floor.
    // `!started` on the offer check, not the whole branch: the route quote has a TTL, and once
    // someone is reading the preview it must not evaporate underneath them. The offer decides
    // whether to OFFER, not whether to keep what was already opened.
    if (demoTerms == null) return <CloseFooter onClose={onClose} />;
    if (!started) return entryFooter();
    // The give-up effect above is closing this review; showing a confirm step for the frame
    // in between would be a flash of a screen that is not the outcome being demonstrated.
    if (demoGaveUp) return null;
    return (
      <SwapConfirmSheet
        demo
        phase={activeOutcome?.phase ?? "ready"}
        terms={demoTerms}
        failure={activeOutcome?.failure ?? null}
        // Null unless the chosen ending is one the live path would have reached WITH a
        // signature. The sheet reads it to decide the explorer link and which `submit_failed`
        // copy to use, so a sample here is the only way those two are reviewable at all.
        signature={activeOutcome?.signature ?? null}
        // Demo Mode has no chain to read, so a settled preview shows the sample quote's own
        // output figure. The LIVE screen shows what the transaction actually delivered — see
        // `deliveredRaw` below — and will not print this estimate in its place.
        receivedTokens={
          activeOutcome?.phase === "confirmed" && !activeOutcome.chainReadFailed
            ? demoTerms.expectedOutputTokens
            : null
        }
        onDone={onClose}
        // A sample fee, so the revert screen can be reviewed with its figures in place. The
        // live screen reads the real one off the transaction.
        fee={activeOutcome?.feeLamports != null && !activeOutcome.chainReadFailed
          ? { lamports: activeOutcome.feeLamports, usd: activeOutcome.feeUsd ?? null }
          : null}
        onRefresh={() => setDemoRefreshed(true)}
        subpage
        // Cancel LEAVES; back returns to the review. Two exits, because they answer different
        // questions: "not this swap" and "let me re-read why you suggested it".
        onCancel={onClose}
      />
    );
  }

  // THE OFFER GATES ENTRY ONLY. It is recomputed every render from the route comparison, which
  // has a TTL of its own — so checking it once the step is open would unmount the confirm
  // section the moment that quote aged out, however far the user had got: with the wallet
  // already open, the sheet, the "Confirming" state and the explorer link would all disappear
  // while their transaction was in flight.
  //
  // Once `started`, the flow owns itself. The PLAN's expiry governs from there, and it renews
  // itself; the route comparison that got us here has done its job.
  if (!started) return entryFooter();

  // Same button, same place, spinning — until the first plan is here. See `awaitingFirstPlan`.
  if (awaitingFirstPlan) return <ContinueFooter onClose={onClose} busy onContinue={onSwap} label={continueLabel} />;

  // In a sequence the result belongs to the host: it records it and moves to the next token.
  // Resting on "Swap Completed" with a Done button here would stop the sequence after one.
  if (onSettled != null && (execution.phase === "confirmed" || execution.phase === "failed")) return null;

  return (
    <SwapConfirmSheet
      demo={props.demo}
      phase={execution.phase}
      terms={execution.plan?.terms ?? null}
      failure={execution.failure}
      signature={execution.signature}
      // What the chain says arrived, converted with the plan's OWN output decimals — the same
      // number the verification was checked against, so the figure on screen and the figure
      // we guaranteed cannot be denominated differently.
      receivedTokens={
        execution.deliveredRaw != null && execution.plan != null
          ? rawToTokenString(execution.deliveredRaw, execution.plan.verification.outputDecimals)
          : null
      }
      onDone={onClose}
      // Read from the landed transaction, so the revert screen states a charge that actually
      // happened rather than the conservative estimate the quote disclosed beforehand.
      fee={
        execution.feeLamports != null
          ? { lamports: execution.feeLamports, usd: execution.feeUsd }
          : null
      }
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
  label = SWAP_CONFIRM_CONTINUE_LABEL,
  busy = false,
  unavailableTooltip,
}: {
  onClose: () => void;
  onContinue: () => void;
  /** The button's label. Defaults to "Swap". */
  label?: string;
  /** Terms are being fetched. The button holds the wait in place of an empty sheet. */
  busy?: boolean;
  /**
   * Swap cannot be pressed, and this says why — as a tooltip on the button itself, on hover and
   * on focus. The button stays, greyed, in its place, so the footer is the same footer.
   */
  unavailableTooltip?: string;
}) {
  const tipId = useId();
  return (
    <div className="review-modal__footer review-modal__footer--actions">
      <button type="button" className="review-modal__tertiary-action" onClick={onClose}>
        Cancel
      </button>
      {unavailableTooltip ? (
        // The same construction as Approve in Demo Mode: `aria-disabled`, not `disabled`. A truly
        // disabled button leaves the tab order and fires no pointer events, so its tooltip
        // would be unreachable by keyboard, by touch, and in some browsers by hover too.
        <span className="swap-confirm__approve-wrap">
          <button
            type="button"
            className="review-modal__primary-action review-modal__primary-action--disabled"
            aria-disabled="true"
            aria-describedby={tipId}
            onClick={(e) => e.preventDefault()}
          >
            <span>{label}</span>
          </button>
          <span className="swap-confirm__approve-tip" role="tooltip" id={tipId}>
            {unavailableTooltip}
          </span>
        </span>
      ) : busy ? (
        // Same button, same place, same label — only now it spins and cannot be pressed twice.
        // `aria-disabled` so the label change is still announced; see SwapConfirmSheet's busy
        // button for why a real `disabled` loses that.
        <button
          type="button"
          className="review-modal__primary-action review-modal__primary-action--busy cta-hold"
          aria-disabled="true"
          onClick={(e) => e.preventDefault()}
        >
          {/* The label stays, invisible, so the button is exactly the size "Swap" was and the
              footer does not move when it starts or stops spinning. */}
          <span className="cta-hold__label" aria-hidden="true">{label}</span>
          <span className="swap-confirm__spinner cta-hold__spinner" aria-hidden="true" />
          {/* Spinner only. Nothing is at stake while terms are fetched — no transaction, and
              nothing approved — so words would narrate our plumbing. The label stays in the
              DOM as the live region, and `sr-only` keeps it off screen. */}
          <span role="status" aria-live="polite" className="sr-only">{SWAP_CONFIRM_CHECKING}</span>
        </button>
      ) : (
        <button type="button" className="review-modal__primary-action" onClick={onContinue}>
          <span>{label}</span>
        </button>
      )}
    </div>
  );
}

/**
 * No swap can be offered right now, and asking again might change that.
 *
 * Close, and Check Again as the primary action — not a greyed Swap, which would present a
 * rejected quote as something nearly executable, and not a link out to a provider. The banner
 * under the review's title says what happened. While the re-run is in flight the button spins
 * in place, exactly as Swap does, and the review does not change until the answer is in.
 */
function CheckAgainFooter({
  onClose,
  onCheckAgain,
  busy = false,
}: {
  onClose: () => void;
  onCheckAgain: () => void;
  busy?: boolean;
}) {
  return (
    <div className="review-modal__footer review-modal__footer--actions">
      <button type="button" className="review-modal__tertiary-action" onClick={onClose}>
        {SWAP_CONFIRM_CLOSE_LABEL}
      </button>
      {busy ? (
        <button
          type="button"
          className="review-modal__primary-action review-modal__primary-action--busy cta-hold"
          aria-disabled="true"
          onClick={(e) => e.preventDefault()}
        >
          <span className="cta-hold__label" aria-hidden="true">{SWAP_ENTRY_CHECK_AGAIN_LABEL}</span>
          <span className="swap-confirm__spinner cta-hold__spinner" aria-hidden="true" />
          <span role="status" aria-live="polite" className="sr-only">{SWAP_ENTRY_CHECKING_AGAIN}</span>
        </button>
      ) : (
        <button type="button" className="review-modal__primary-action" onClick={onCheckAgain}>
          <span>{SWAP_ENTRY_CHECK_AGAIN_LABEL}</span>
        </button>
      )}
    </div>
  );
}

/**
 * A swap could be offered, but pressing Swap could not reopen the wallet link.
 *
 * Reconnect Wallet in Swap's place — not a greyed Swap with the remedy in a tooltip: the next
 * useful action is the button. It spins in place while the wallet is asked, and when a wallet
 * that can sign is connected the footer is Cancel and Swap again.
 */
function ReconnectFooter({
  onClose,
  onReconnect,
  busy = false,
}: {
  onClose: () => void;
  onReconnect: () => void;
  busy?: boolean;
}) {
  return (
    <div className="review-modal__footer review-modal__footer--actions">
      <button type="button" className="review-modal__tertiary-action" onClick={onClose}>
        Cancel
      </button>
      {busy ? (
        <button
          type="button"
          className="review-modal__primary-action review-modal__primary-action--busy cta-hold"
          aria-disabled="true"
          onClick={(e) => e.preventDefault()}
        >
          <span className="cta-hold__label" aria-hidden="true">{SWAP_ENTRY_RECONNECT_LABEL}</span>
          <span className="swap-confirm__spinner cta-hold__spinner" aria-hidden="true" />
          <span role="status" aria-live="polite" className="sr-only">{SWAP_ENTRY_RECONNECTING}</span>
        </button>
      ) : (
        <button type="button" className="review-modal__primary-action" onClick={onReconnect}>
          <span>{SWAP_ENTRY_RECONNECT_LABEL}</span>
        </button>
      )}
    </div>
  );
}

/**
 * A swap could be offered, but there is no wallet here to reconnect to.
 *
 * Connect Wallet in Swap's place. It leaves the review: choosing a wallet signs a session in,
 * possibly for a different wallet than this review was drawn for, so the review is closed
 * rather than kept open over amounts that may no longer be this wallet's.
 */
function ConnectWalletFooter({ onClose, onConnectWallet }: { onClose: () => void; onConnectWallet: () => void }) {
  return (
    <div className="review-modal__footer review-modal__footer--actions">
      <button type="button" className="review-modal__tertiary-action" onClick={onClose}>
        Cancel
      </button>
      <button type="button" className="review-modal__primary-action" onClick={onConnectWallet}>
        <span>{SWAP_ENTRY_CONNECT_LABEL}</span>
      </button>
    </div>
  );
}

/**
 * Nothing to offer and nothing to re-run (the gallery's fixed presets, a demo quote with no
 * guaranteed minimum). Close, alone — not Cancel beside a dead button.
 */
function CloseFooter({ onClose }: { onClose: () => void }) {
  return (
    <div className="review-modal__footer review-modal__footer--actions">
      {/* The same lone Close the confirm sheet uses when there is nothing left to decide. */}
      <button type="button" className="review-modal__tertiary-action" onClick={onClose}>
        {SWAP_CONFIRM_CLOSE_LABEL}
      </button>
    </div>
  );
}
