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
import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import type { SwapActionContext, SwapQuoteComparisonAssessment } from "../../suggestions/swapQuote/swapQuoteContracts";
import { deriveExecutionOffer } from "../../suggestions/swapExecution/executionOffer";
import { useSwapExecutionPlan } from "./useSwapExecutionPlan";
import { useWalletSwapSubmitter } from "./useWalletSwapSubmitter";
import SwapConfirmSheet from "./SwapConfirmSheet";
import { SWAP_CONFIRM_CONTINUE_LABEL } from "../../state/approvedCopy";

export interface SwapExecutionSectionProps {
  action: SwapActionContext;
  assessment: SwapQuoteComparisonAssessment | null;
  slippageBps?: number;
  nowMs?: number;
  /** Closes the whole review. Cancelling the confirm step alone returns here instead. */
  onClose: () => void;
}

export default function SwapExecutionSection(props: SwapExecutionSectionProps) {
  const { action, assessment, onClose } = props;
  const { publicKey } = useWallet();
  const submit = useWalletSwapSubmitter();
  const [started, setStarted] = useState(false);

  const offer = deriveExecutionOffer({
    action,
    assessment,
    nowMs: props.nowMs ?? Date.now(),
  });

  const takerPublicKey = publicKey?.toBase58() ?? null;

  const execution = useSwapExecutionPlan({
    action,
    takerPublicKey,
    slippageBps: props.slippageBps ?? 50,
    enabled: started,
    submit,
  });

  // The Boundary said no, or there is no wallet to sign with. Render nothing; the modal's
  // existing handoff footer is the answer, and it is already there.
  if (!offer.offered || takerPublicKey == null || submit == null) return null;

  if (!started) {
    return (
      <div className="review-modal__footer review-modal__footer--actions">
        <button type="button" className="review-modal__tertiary-action" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="review-modal__primary-action"
          onClick={() => {
            setStarted(true);
            execution.prepare();
          }}
        >
          <span>{SWAP_CONFIRM_CONTINUE_LABEL}</span>
        </button>
      </div>
    );
  }

  return (
    <SwapConfirmSheet
      phase={execution.phase}
      terms={execution.plan?.terms ?? null}
      failure={execution.failure}
      msUntilExpiry={execution.msUntilExpiry}
      signature={execution.signature}
      onApprove={execution.approve}
      onRefresh={() => execution.prepare()}
      onCancel={() => {
        execution.cancel();
        // Back to the review, not out of it. Cancelling an approval is not cancelling the
        // suggestion, and closing the whole modal would throw away what they came to read.
        setStarted(false);
      }}
    />
  );
}
