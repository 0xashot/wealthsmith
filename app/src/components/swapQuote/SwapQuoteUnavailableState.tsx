/**
 * SwapQuoteUnavailableState — Step 23C. Renders the non-eligible views: no-valid-route, not-ready, not-required,
 * unavailable, expired. The underlying financial suggestion is unchanged. A safe "Refresh comparison" control
 * (keyboard-accessible) may ONLY repeat the read-only quote request — it never opens a provider, prepares a
 * transaction, connects a wallet, or executes anything.
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
