/**
 * SwapPlanQuoteSummary — Step 23C. Multi-leg (multi-source Rebalance) route summary. Heading is "Suggested
 * routes" (plural). Each leg is compared independently — no single false "best platform" for the whole plan. An
 * unresolved leg is shown, never silently omitted. The financial plan/amount is unchanged by any quote outcome.
 */
import type { SwapActionContext, SwapQuoteComparisonAssessment } from "../../suggestions/swapQuote/swapQuoteContracts";
import { presentSwapQuote, unavailableView, isEligibleResultKind } from "../../suggestions/swapQuote/quotePresentation";
import SwapQuoteSelectedState from "./SwapQuoteSelectedState";
import SwapQuoteUnavailableState from "./SwapQuoteUnavailableState";

export default function SwapPlanQuoteSummary({ legs, assessments, onRefresh, nowMs }: { legs: SwapActionContext[]; assessments: Record<string, SwapQuoteComparisonAssessment>; onRefresh?: () => void; nowMs?: number }) {
  return (
    <section className="review-modal__section swap-quote__plan" aria-label="Suggested routes">
      <h3 className="review-modal__section-title">Suggested routes</h3>
      <p className="review-modal__guardrail-hint">Each swap leg is compared independently; different legs may use different platforms.</p>
      {legs.map((leg, i) => {
        const a = assessments[leg.legId];
        const view = a ? presentSwapQuote(a, { nowMs }) : unavailableView();
        const heading = `Leg ${i + 1} of ${legs.length} — ${leg.inputAsset.symbol} → ${leg.outputAsset.symbol}`;
        return (
          <div key={leg.legId} className="swap-quote__plan-leg">
            {isEligibleResultKind(view.kind)
              ? <SwapQuoteSelectedState view={view} headingOverride={heading} />
              : <SwapQuoteUnavailableState view={{ ...view, heading }} onRefresh={view.showRefresh ? onRefresh : undefined} />}
          </div>
        );
      })}
    </section>
  );
}
