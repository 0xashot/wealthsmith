/**
 * SwapQuoteLoadingState — Step 23C. The bounded loading treatment shown while the read-only comparison is in
 * flight. Announced politely to assistive tech (aria-live="polite"). Shows no fake route values and no fake
 * winner; it never blocks modal close (Escape still works — the modal owns key handling).
 */
import { LOADING_VIEW } from "../../suggestions/swapQuote/quotePresentation";

export default function SwapQuoteLoadingState() {
  return (
    <section className="review-modal__section swap-quote__section" aria-label="Suggested route">
      <h3 className="review-modal__section-title">{LOADING_VIEW.heading}</h3>
      <p className="modal__intro" role="status" aria-live="polite">{LOADING_VIEW.body}</p>
      <p className="review-modal__guardrail-hint">{LOADING_VIEW.disclosure}</p>
    </section>
  );
}
