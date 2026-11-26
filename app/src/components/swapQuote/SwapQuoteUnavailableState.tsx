/**
 * SwapQuoteUnavailableState — Step 23C. Renders the non-eligible views IN PLACE: no-valid-route, not-ready,
 * not-required, unavailable, expired. The underlying financial suggestion is unchanged.
 *
 * IN A SINGLE-SWAP REVIEW IT CARRIES NO CONTROL, and is usually not rendered at all: the notice is shown as a
 * banner under the review's title (see `SwapQuoteState.notice`) and re-running the comparison is the review's
 * primary action, "Check Again", in the footer. It used to end in a "Refresh comparison" text button here, at
 * the bottom of the body — below the fold on most screens.
 *
 * `onRefresh` remains for the MULTI-LEG summary only. A plan of several swaps has no single transaction to
 * approve and so no footer action to carry the re-run; its legs keep a safe, keyboard-accessible Refresh that
 * may ONLY repeat the read-only quote request — it never opens a provider, prepares a transaction, connects a
 * wallet, or executes anything.
 */
import type { QuoteView } from "../../suggestions/swapQuote/quotePresentation";

export default function SwapQuoteUnavailableState({ view, onRefresh }: { view: QuoteView; onRefresh?: () => void }) {
  return (
    <section className="review-modal__section swap-quote__section" aria-label="Suggested route">
      <h3 className="review-modal__section-title">{view.heading}</h3>
      {view.body && <p className="modal__intro">{view.body}</p>}
      {view.unavailableProviderNames.length > 0 && (
        <p className="review-modal__guardrail-hint">Unavailable: {view.unavailableProviderNames.join(", ")}</p>
      )}
      {view.showRefresh && onRefresh && (
        <button type="button" className="review-modal__tertiary-action swap-quote__refresh" onClick={onRefresh}>
          Refresh comparison
        </button>
      )}
    </section>
  );
}
