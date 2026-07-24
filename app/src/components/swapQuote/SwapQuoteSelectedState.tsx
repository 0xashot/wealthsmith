/**
 * SwapQuoteSelectedState — Step 23C. Renders an eligible-result view (selected / partial / only-route /
 * equivalent). Execution surface (provider) is separated from underlying venues. Liquidity is disclosed as a
 * pool-TVL PROXY, never executable depth. Honest disclosures per state; never "guaranteed" / "cheapest across all
 * platforms" when a provider failed. No transaction is ever prepared.
 */
import type { QuoteView } from "../../suggestions/swapQuote/quotePresentation";
import { VENUE_OVERLAP_NOTE } from "../../suggestions/swapQuote/quotePresentation";
import { resolveProtocolIcon } from "../../state/iconRegistry";
import SwapQuoteAlternatives from "./SwapQuoteAlternatives";

/** The selected execution surface's approved logo (Jupiter / Raydium / Orca), or null → text-only fallback. */
function providerLogo(providerId: QuoteView["selectedProviderId"]): string | null {
  return providerId ? resolveProtocolIcon(`${providerId}.svg`) : null;
}

export default function SwapQuoteSelectedState({ view, headingOverride }: { view: QuoteView; headingOverride?: string }) {
  return (
    <section className="review-modal__section swap-quote__section" aria-label="Suggested route">
      <h3 className="review-modal__section-title">{headingOverride ?? view.heading}</h3>
      {view.providerLabel && (
        <p className="swap-quote__provider">
          {(() => { const logo = providerLogo(view.selectedProviderId); return logo ? <img className="swap-quote__provider-logo" src={logo} alt="" width={20} height={20} aria-hidden="true" /> : null; })()}
          <strong>{view.providerLabel}</strong>
        </p>
      )}
      {view.body && <p className="modal__intro">{view.body}</p>}

      {view.metrics.length > 0 && (
        <dl className="review-modal__metrics">
          {view.metrics.map((m) => (
            <div key={m.label} className="review-modal__metric">
              <dt className="review-modal__metric-label">{m.label}</dt>
              <dd className="review-modal__metric-value">{m.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {view.selectedVenues.length > 0 && (
        <p className="review-modal__guardrail-hint">Route uses {view.selectedVenues.join(", ")}</p>
      )}
      {view.venueOverlap && <p className="review-modal__guardrail-hint">{VENUE_OVERLAP_NOTE}</p>}

      {(view.comparedProviderNames.length > 0 || view.unavailableProviderNames.length > 0) && (
        <p className="review-modal__guardrail-hint">
          Compared: {view.comparedProviderNames.join(", ") || "none"}
          {view.unavailableProviderNames.length > 0 && ` · Unavailable: ${view.unavailableProviderNames.join(", ")}`}
        </p>
      )}

      <SwapQuoteAlternatives alternatives={view.alternatives} />

      {view.liquidityProxyNote && <p className="review-modal__guardrail-hint">{view.liquidityProxyNote}</p>}
      {view.disclosure && <p className="review-modal__guardrail-hint">{view.disclosure}</p>}
    </section>
  );
}
