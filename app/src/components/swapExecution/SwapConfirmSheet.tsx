/**
 * SwapConfirmSheet — Phase 4. The first thing in the execution lane anyone can see.
 *
 * It renders the terms of ONE swap and, once they have been checked, offers approval. Everything
 * it shows comes from the plan; nothing is recomputed here, and no number is ever derived for
 * display. A figure we do not have renders as “—” rather than as a plausible substitute.
 *
 * Copy is `content/ui-copy-rules.md` → Swap Confirmation Copy, via `state/approvedCopy.ts`. The
 * five terms are the ones the Execution Boundary requires before anyone may approve: what is
 * sold, what is received, the minimum after slippage, price impact, and fees.
 *
 * WHAT THIS COMPONENT DOES NOT DO, deliberately:
 *   - It does not decide whether the swap may be executed. That is the Boundary's answer, taken
 *     upstream, and a sheet that could overrule it would be the UI granting itself permission.
 *   - It does not verify anything. The hook does, and the sheet shows `ready` only because the
 *     machine reached it — there is no prop that forces the approve button to appear.
 *   - It does not sign or submit. `approve` is undefined until Phase 5 wires a signer, and the
 *     button is not rendered at all in that case rather than rendered and inert.
 *
 * The minimum is the only figure the user is guaranteed, so it carries the emphasis and the
 * explanation. Everything else is an expectation and says so in its own label.
 */
import InfoPopover from "../InfoPopover";
import {
  SWAP_CONFIRM_APPROVE_LABEL,
  SWAP_CONFIRM_CANCEL_LABEL,
  SWAP_CONFIRM_CHECKING,
  SWAP_CONFIRM_CHECK_PASSED,
  SWAP_CONFIRM_MINIMUM_INFO,
  SWAP_CONFIRM_MINIMUM_INFO_LABEL,
  SWAP_CONFIRM_MINIMUM_LABEL,
  SWAP_CONFIRM_NETWORK_FEE_LABEL,
  SWAP_CONFIRM_PRICE_IMPACT_LABEL,
  SWAP_CONFIRM_RECEIVE_LABEL,
  SWAP_CONFIRM_REFRESH_LABEL,
  SWAP_CONFIRM_ROUTE_LABEL,
  SWAP_CONFIRM_SELL_LABEL,
  SWAP_CONFIRM_TITLE,
  swapConfirmExpiresIn,
} from "../../state/approvedCopy";
import type { SwapExecutionTerms } from "../../suggestions/swapExecution/executionContracts";
import type { ExecutionFailureKey, ExecutionPhase } from "../../suggestions/swapExecution/executionLifecycle";
import { resolveProtocolIcon } from "../../state/iconRegistry";
import {
  failureCopy,
  formatCountdown,
  formatPercent,
  formatUsd,
} from "./swapConfirmPresentation";

export interface SwapConfirmSheetProps {
  phase: ExecutionPhase;
  terms: SwapExecutionTerms | null;
  failure: ExecutionFailureKey | null;
  /** Milliseconds of life left in the terms; null while there is no plan. */
  msUntilExpiry: number | null;
  onCancel: () => void;
  /** Re-quote. Offered only where new terms would help. */
  onRefresh?: () => void;
  /** Phase 5. Undefined until a signer is wired — the button is then not rendered. */
  onApprove?: () => void;
}

export default function SwapConfirmSheet(props: SwapConfirmSheetProps) {
  const { phase, terms, failure, msUntilExpiry, onCancel, onRefresh, onApprove } = props;

  const failed = failureCopy(failure);
  if (phase === "failed" && failed) {
    return (
      <section className="review-modal__section swap-confirm" aria-label={SWAP_CONFIRM_TITLE}>
        <h3 className="review-modal__section-title">{failed.title}</h3>
        <p className="modal__intro">{failed.desc}</p>
        <div className="review-modal__footer review-modal__footer--actions">
          <button type="button" className="review-modal__tertiary-action" onClick={onCancel}>
            {SWAP_CONFIRM_CANCEL_LABEL}
          </button>
          {/* Offered only when fresh terms are the actual remedy. A refresh after a verification
              refusal would invite someone to retry until a check happens to pass. */}
          {onRefresh && failure === "expired" && (
            <button type="button" className="review-modal__primary-action" onClick={onRefresh}>
              <span>{SWAP_CONFIRM_REFRESH_LABEL}</span>
            </button>
          )}
        </div>
      </section>
    );
  }

  const providerIconUrl = terms ? resolveProtocolIcon(`${terms.providerId}.svg`) : null;
  const checking = phase === "preparing" || phase === "verifying";
  const ready = phase === "ready";

  return (
    <section className="review-modal__section swap-confirm" aria-label={SWAP_CONFIRM_TITLE}>
      <h3 className="review-modal__section-title">{SWAP_CONFIRM_TITLE}</h3>

      {terms && (
        <dl className="review-modal__metrics swap-confirm__terms">
          <div className="review-modal__metric">
            <dt className="review-modal__metric-label">{SWAP_CONFIRM_SELL_LABEL}</dt>
            <dd className="review-modal__metric-value">{terms.inputAmountTokens} {terms.inputSymbol}</dd>
          </div>
          <div className="review-modal__metric">
            <dt className="review-modal__metric-label">{SWAP_CONFIRM_RECEIVE_LABEL}</dt>
            <dd className="review-modal__metric-value">{terms.expectedOutputTokens} {terms.outputSymbol}</dd>
          </div>

          {/* The only guaranteed figure, so it carries the emphasis and the explanation. */}
          <div className="review-modal__metric swap-confirm__metric--minimum">
            <dt className="review-modal__metric-label metric__label--with-info">
              {SWAP_CONFIRM_MINIMUM_LABEL}
              <InfoPopover label={SWAP_CONFIRM_MINIMUM_INFO_LABEL} align="right">
                <p className="info-popover__text">{SWAP_CONFIRM_MINIMUM_INFO}</p>
              </InfoPopover>
            </dt>
            <dd className="review-modal__metric-value swap-confirm__minimum-value">
              {terms.minimumOutputTokens} {terms.outputSymbol}
            </dd>
          </div>

          <div className="review-modal__metric">
            <dt className="review-modal__metric-label">{SWAP_CONFIRM_PRICE_IMPACT_LABEL}</dt>
            <dd className="review-modal__metric-value">{formatPercent(terms.priceImpactPct)}</dd>
          </div>
          <div className="review-modal__metric">
            <dt className="review-modal__metric-label">{SWAP_CONFIRM_NETWORK_FEE_LABEL}</dt>
            <dd className="review-modal__metric-value">{formatUsd(terms.estimatedNetworkFeeUsd)}</dd>
          </div>
          <div className="review-modal__metric">
            <dt className="review-modal__metric-label">{SWAP_CONFIRM_ROUTE_LABEL}</dt>
            <dd className="review-modal__metric-value swap-quote__route-value">
              {providerIconUrl && (
                <img className="swap-quote__provider-logo" src={providerIconUrl} alt="" width={20} height={20} aria-hidden="true" />
              )}
              <span>{terms.providerName}</span>
            </dd>
          </div>
        </dl>
      )}

      {/* The check's state. `aria-live` because it changes without the user acting, and because
          whether it has passed is the thing a person is waiting on before approving. */}
      <p className="swap-confirm__check" role="status" aria-live="polite">
        {checking ? SWAP_CONFIRM_CHECKING : ready ? SWAP_CONFIRM_CHECK_PASSED : ""}
      </p>

      {ready && msUntilExpiry != null && (
        <p className="swap-confirm__expiry" role="note">{swapConfirmExpiresIn(formatCountdown(msUntilExpiry))}</p>
      )}

      <div className="review-modal__footer review-modal__footer--actions">
        {/* Cancelling is available at every point before submission, and costs nothing. */}
        <button type="button" className="review-modal__tertiary-action" onClick={onCancel}>
          {SWAP_CONFIRM_CANCEL_LABEL}
        </button>
        {/* Rendered only when it can actually do something: the terms are checked AND a signer
            exists. A disabled approve button on a financial confirmation is worse than none —
            it reads as "almost" and explains nothing. */}
        {ready && onApprove && (
          <button type="button" className="review-modal__primary-action" onClick={onApprove}>
            <span>{SWAP_CONFIRM_APPROVE_LABEL}</span>
          </button>
        )}
      </div>
    </section>
  );
}
