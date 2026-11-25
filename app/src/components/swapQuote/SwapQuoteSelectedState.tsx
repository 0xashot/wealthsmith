/**
 * SwapQuoteSelectedState — Step 23C (compact redesign 24J). Renders an eligible-result view (selected / partial /
 * only-route / equivalent) as the read-only "Swap Route" section. Execution surface (provider) is shown with its
 * approved logo. The compact section surfaces only the execution-relevant figures — Estimated total cost, Price
 * impact, Quote updated — plus a time-sensitivity banner. The underlying honest view model (venues, compared
 * providers, liquidity proxy, alternatives) is preserved upstream in `quotePresentation`; this compact surface
 * simply does not render them. No transaction is ever prepared.
 */
import type { QuoteView, QuoteMetric } from "../../suggestions/swapQuote/quotePresentation";
import { SWAP_PROVIDER_NAME } from "../../suggestions/swapQuote/swapQuoteContracts";
import { resolveProtocolIcon } from "../../state/iconRegistry";

/** The compact Swap Route section shows only these figures, in this order. */
const COMPACT_METRIC_LABELS = ["Estimated total cost", "Price impact"] as const;

/** The selected execution surface's approved logo (Jupiter / Raydium / Orca), or null → text-only fallback. */
function providerLogo(providerId: QuoteView["selectedProviderId"]): string | null {
  return providerId ? resolveProtocolIcon(`${providerId}.svg`) : null;
}

export default function SwapQuoteSelectedState({ view, headingOverride }: { view: QuoteView; headingOverride?: string }) {
  const compactMetrics: QuoteMetric[] = COMPACT_METRIC_LABELS
    .map((label) => view.metrics.find((m) => m.label === label))
    .filter((m): m is QuoteMetric => m != null);
  const providerName = view.selectedProviderId ? SWAP_PROVIDER_NAME[view.selectedProviderId] : null;
  const providerIconUrl = providerLogo(view.selectedProviderId);

  return (
    <section className="review-modal__section swap-quote__section" aria-label="Swap Route">
      <h3 className="review-modal__section-title">{headingOverride ?? "Swap Route"}</h3>
      {view.body && <p className="modal__intro">{view.body}</p>}

      <dl className="review-modal__metrics">
        {providerName && (
          <div className="review-modal__metric">
            <dt className="review-modal__metric-label">Suggested Route</dt>
            <dd className="review-modal__metric-value swap-quote__route-value">
              {providerIconUrl && <img className="swap-quote__provider-logo" src={providerIconUrl} alt="" width={20} height={20} aria-hidden="true" />}
              <span>{providerName}</span>
            </dd>
          </div>
        )}
        {compactMetrics.map((m) => (
          <div key={m.label} className="review-modal__metric">
            <dt className="review-modal__metric-label">{m.label}</dt>
            <dd className="review-modal__metric-value">{m.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
