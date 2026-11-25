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
import { useId } from "react";
import InfoPopover from "../InfoPopover";
import {
  SWAP_CONFIRM_APPROVE_LABEL,
  SWAP_CONFIRM_CANCEL_LABEL,
  SWAP_CONFIRM_DEMO_DISABLED,
  SWAP_CONFIRM_COMPLETE_TITLE,
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
  SWAP_CONFIRM_VIEW_TRANSACTION,
} from "../../state/approvedCopy";
import type { SwapExecutionTerms } from "../../suggestions/swapExecution/executionContracts";
import type { ExecutionFailureKey, ExecutionPhase } from "../../suggestions/swapExecution/executionLifecycle";
import { resolveProtocolIcon } from "../../state/iconRegistry";
import {
  failureCopy,
  ABSENT_FIGURE,
  formatApproxTokens,
  formatApproxUsd,
  formatPercent,
  isAfterApproval,
  solscanTransactionUrl,
  busyPresentationFor,
  showsExplorerLink,
} from "./swapConfirmPresentation";

export interface SwapConfirmSheetProps {
  phase: ExecutionPhase;
  terms: SwapExecutionTerms | null;
  failure: ExecutionFailureKey | null;
  /** Milliseconds of life left in the terms; null while there is no plan. */
  /** Present once the transaction is on-chain. The user's only record of it. */
  signature?: string | null;
  onCancel: () => void;
  /** Re-quote. Offered only where new terms would help. */
  onRefresh?: () => void;
  /** Phase 5. Undefined until a signer is wired — the button is then not rendered. */
  onApprove?: () => void;
  /**
   * The sheet is rendered as a SUBPAGE of the review, which supplies the heading and the back
   * control in its own header row — so the two line up with the close button and share the
   * modal's title size. The sheet then draws no title of its own; a second one directly below
   * would read as a heading for the terms rather than for the step.
   */
  subpage?: boolean;
  /**
   * Demo Mode. Approve is shown but unavailable, with the reason on hover and focus — the one
   * place this sheet renders an action that cannot be taken. See the footer for why.
   */
  demo?: boolean;
}

export default function SwapConfirmSheet(props: SwapConfirmSheetProps) {
  const { phase, terms, failure, signature, onCancel, onRefresh, onApprove, subpage = false, demo = false } = props;
  const demoTipId = useId();

  // A signature means it reached the chain, which changes what a `submit_failed` means.
  const failed = failureCopy(failure, typeof signature === "string" && signature.length > 0);
  if (phase === "failed" && failed) {
    return (
      <section className="review-modal__section swap-confirm" aria-label={SWAP_CONFIRM_TITLE}>
        <h3 className="review-modal__section-title">{failed.title}</h3>
        <p className="modal__intro">{failed.desc}</p>
        {/* A signature survives into a failure, and when it does it matters MORE here than on
            success. `confirm_timeout` means we stopped watching a transaction that may well have
            landed, and a reverted one means the chain ran it — in both cases this link is the only
            way the user can find out what became of their money. Leaving it out of this branch was
            a real omission: the gallery's timeout case showed the state with no link at all. */}
        {signature && solscanTransactionUrl(signature) && (
          <p className="swap-confirm__transaction">
            <a href={solscanTransactionUrl(signature) as string} target="_blank" rel="noopener noreferrer">
              {SWAP_CONFIRM_VIEW_TRANSACTION}
            </a>
          </p>
        )}
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
  const ready = phase === "ready";
  const confirmed = phase === "confirmed";
  const busy = busyPresentationFor(phase);
  const afterApproval = isAfterApproval(phase);
  const explorerUrl = signature ? solscanTransactionUrl(signature) : null;

  return (
    <section className="review-modal__section swap-confirm" aria-label={SWAP_CONFIRM_TITLE}>
      {!subpage && <h3 className="review-modal__section-title">{SWAP_CONFIRM_TITLE}</h3>}

      {terms && (
        <dl className="review-modal__metrics swap-confirm__terms">
          <div className="review-modal__metric">
            <dt className="review-modal__metric-label">{SWAP_CONFIRM_SELL_LABEL}</dt>
            <dd className="review-modal__metric-value">
              {terms.inputAmountTokens} {terms.inputSymbol}
              {/* The USD sits UNDER the token amount, never beside it: the swap is denominated in
                  tokens and the dollar figure is context, so it must not compete for the same
                  line. Rendered only when priced — an empty sub-line is worse than none. */}
              {formatApproxUsd(terms.inputAmountUsd) !== ABSENT_FIGURE && (
                <span className="swap-confirm__value-usd">{formatApproxUsd(terms.inputAmountUsd)}</span>
              )}
            </dd>
          </div>
          <div className="review-modal__metric">
            <dt className="review-modal__metric-label">{SWAP_CONFIRM_RECEIVE_LABEL}</dt>
            <dd className="review-modal__metric-value">
              {formatApproxTokens(terms.expectedOutputTokens, terms.outputSymbol)}
              {formatApproxUsd(terms.expectedOutputUsd) !== ABSENT_FIGURE && (
                <span className="swap-confirm__value-usd">{formatApproxUsd(terms.expectedOutputUsd)}</span>
              )}
            </dd>
          </div>

          {/* The only guaranteed figure, so it carries the emphasis and the explanation. */}
          <div className="review-modal__metric swap-confirm__metric--minimum">
            <dt className="review-modal__metric-label metric__label--with-info">
              {SWAP_CONFIRM_MINIMUM_LABEL}
              {/* `fixed` positions against the VIEWPORT rather than this metric card. The
                  sheet sits in a modal that clips its overflow, so an absolutely-positioned
                  popover was cut off at the card's edge — the explanation of the one
                  guaranteed figure, half unreadable. */}
              <InfoPopover label={SWAP_CONFIRM_MINIMUM_INFO_LABEL} align="right" strategy="fixed">
                <p className="info-popover__text">{SWAP_CONFIRM_MINIMUM_INFO}</p>
              </InfoPopover>
            </dt>
            <dd className="review-modal__metric-value swap-confirm__minimum-value">
              {terms.minimumOutputTokens} {terms.outputSymbol}
              {/* The TOKEN figure carries no tilde — it is exact and enforced on-chain. Its
                  dollar value does, because converting it needs a price and a price moves.
                  Marking only the conversion keeps the guarantee intact while still giving
                  the floor a size the reader can judge. */}
              {formatApproxUsd(terms.minimumOutputUsd) !== ABSENT_FIGURE && (
                <span className="swap-confirm__value-usd">{formatApproxUsd(terms.minimumOutputUsd)}</span>
              )}
            </dd>
          </div>

          <div className="review-modal__metric">
            <dt className="review-modal__metric-label">{SWAP_CONFIRM_PRICE_IMPACT_LABEL}</dt>
            <dd className="review-modal__metric-value">{formatPercent(terms.priceImpactPct)}</dd>
          </div>
          <div className="review-modal__metric">
            <dt className="review-modal__metric-label">{SWAP_CONFIRM_NETWORK_FEE_LABEL}</dt>
            <dd className="review-modal__metric-value">{formatApproxUsd(terms.estimatedNetworkFeeUsd)}</dd>
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


      {/* Success. No figure: reading what actually arrived needs a chain read the browser
          cannot make, and the rule is explicit that an unreadable amount is omitted rather than
          replaced with the estimate shown beforehand. */}
      {confirmed && (
        <p className="swap-confirm__complete">{SWAP_CONFIRM_COMPLETE_TITLE}</p>
      )}

      {showsExplorerLink(phase, signature) && explorerUrl && (
        <p className="swap-confirm__transaction">
          <a href={explorerUrl} target="_blank" rel="noopener noreferrer">{SWAP_CONFIRM_VIEW_TRANSACTION}</a>
        </p>
      )}

      {/* NO COUNTDOWN. The quote renews itself now, so the clock is our bookkeeping rather than
          anything the reader has to act on — and a timer on a financial confirmation pushes
          people to approve before they have finished reading, which is the opposite of what this
          step is for. Wallets that re-quote continuously show no clock for the same reason.
          The plan's life is still enforced; it is simply not the user's problem. */}

      <div className="review-modal__footer review-modal__footer--actions">
        {/* Cancel disappears once the transaction is with the wallet. Before that it is always
            available and always free; after it, there is nothing left to cancel — the
            transaction is the wallet's and then the chain's, and a Cancel button there would
            promise something we cannot do. */}
        {!afterApproval && (
          <button type="button" className="review-modal__tertiary-action" onClick={onCancel}>
            {SWAP_CONFIRM_CANCEL_LABEL}
          </button>
        )}
        {/* Rendered only when it can actually do something: the terms are checked AND a wallet
            can submit. A disabled approve button on a financial confirmation is worse than none
            — it reads as "almost" and explains nothing.

            DEMO MODE IS THE ONE EXCEPTION, and it earns it: Demo Mode exists to show people
            what the product does before they commit a wallet, so hiding the final step would
            hide the very thing they came to see. The button stays, visibly unavailable, and
            says why.

            `aria-disabled` rather than `disabled`, because a truly disabled button is removed
            from the tab order and fires no pointer events — the explanation would then be
            unreachable by keyboard and absent on hover, which is the entire point of showing
            it. The click is a no-op instead. */}
        {ready && demo && (
          <span className="swap-confirm__approve-wrap">
            <button
              type="button"
              className="review-modal__primary-action review-modal__primary-action--unavailable"
              aria-disabled="true"
              aria-describedby={demoTipId}
              onClick={(e) => e.preventDefault()}
            >
              <span>{SWAP_CONFIRM_APPROVE_LABEL}</span>
            </button>
            <span className="swap-confirm__approve-tip" role="tooltip" id={demoTipId}>
              {SWAP_CONFIRM_DEMO_DISABLED}
            </span>
          </span>
        )}
        {ready && !demo && onApprove && (
          <button type="button" className="review-modal__primary-action" onClick={onApprove}>
            <span>{SWAP_CONFIRM_APPROVE_LABEL}</span>
          </button>
        )}
        {/* AFTER APPROVE the button stays put and reports from where it was pressed, rather
            than vanishing and leaving a sentence somewhere else to explain itself. The footer
            keeping its shape matters at this moment above all others: the press has to look
            like it registered.

            `aria-disabled`, not `disabled` — the label changes here and a disabled control is
            dropped from the accessibility tree by some screen readers, taking the live update
            with it. Not focus-stealing, not clickable: there is nothing to press. */}
        {busy && (
          <button
            type="button"
            className="review-modal__primary-action review-modal__primary-action--busy"
            aria-disabled="true"
            onClick={(e) => e.preventDefault()}
          >
            <span className="swap-confirm__spinner" aria-hidden="true" />
            {/* The label is ALWAYS in the DOM, visible or not: it is the live region, so a
                screen reader hears every change even where the screen shows only a spinner,
                and it holds the button's width so the footer does not resize between states. */}
            <span role="status" aria-live="polite" className={busy.labelVisible ? undefined : "sr-only"}>
              {busy.label}
            </span>
          </button>
        )}
      </div>
    </section>
  );
}

