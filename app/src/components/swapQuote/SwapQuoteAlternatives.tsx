/**
 * SwapQuoteAlternatives — Step 23C. The collapsed "Compared routes" disclosure. Each row shows the execution
 * surface, its eligibility, expected output, price impact, and (when ineligible) user-readable exclusion copy.
 * No raw payloads, provider error bodies, pool-account data, headers, RPC details, or internal enums. Keyboard-
 * accessible via native <details>/<summary>; status/eligibility is conveyed by TEXT, not color alone.
 */
import type { QuoteAlternative } from "../../suggestions/swapQuote/quotePresentation";

export default function SwapQuoteAlternatives({ alternatives }: { alternatives: QuoteAlternative[] }) {
  if (alternatives.length === 0) return null;
  return (
    <details className="review-modal__section swap-quote__alternatives">
      <summary className="review-modal__section-title">Compared routes</summary>
      <ul className="review-modal__list">
        {alternatives.map((alt) => (
          <li key={alt.provider} className="review-modal__calc">
            <span className="review-modal__calc-label">
              {alt.providerName} — {alt.eligible ? "Eligible" : "Not eligible"}
            </span>
            <span className="review-modal__calc-values">
              {alt.expectedOutput && <span>Estimated output {alt.expectedOutput}</span>}
              {alt.priceImpact && <span>Price impact {alt.priceImpact}</span>}
              {!alt.eligible && alt.reasonCopy && <span>{alt.reasonCopy}</span>}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
