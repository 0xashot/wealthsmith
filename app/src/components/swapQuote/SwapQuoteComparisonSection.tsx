/**
 * SwapQuoteComparisonSection — Step 23C. The read-only "Suggested route" section mounted INSIDE the Review modal
 * (after the financial recommendation, before final disclosures) for Rebalance / Trim / eligible funded DCA. It
 * derives the exact quote-ready action from the engine result (never recalculating amount/source/dest/reserve),
 * requests the sanitized comparison only when the modal is open, and renders the honest state. It never mounts a
 * platform on the card face, never prepares/executes a transaction, and never changes the financial suggestion.
 *
 * Data source is pluggable: real client by default; the /testing gallery passes `presetAssessments` (or a preset
 * status) so gallery cases are deterministic and never call live providers.
 */
import type { SwapActionReadiness, SwapActionContext, SwapQuoteComparisonAssessment } from "../../suggestions/swapQuote/swapQuoteContracts";
import { presentSwapQuote, notReadyView, notRequiredView, unavailableView, isEligibleResultKind, type QuoteView } from "../../suggestions/swapQuote/quotePresentation";
import type { SwapQuoteFetcher } from "../../suggestions/swapQuote/swapQuoteClient";
import { useSwapQuoteComparison } from "./useSwapQuoteComparison";
import SwapQuoteLoadingState from "./SwapQuoteLoadingState";
import SwapQuoteSelectedState from "./SwapQuoteSelectedState";
import SwapQuoteUnavailableState from "./SwapQuoteUnavailableState";
import SwapPlanQuoteSummary from "./SwapPlanQuoteSummary";

function renderView(view: QuoteView, onRefresh?: () => void, headingOverride?: string) {
  return isEligibleResultKind(view.kind)
    ? <SwapQuoteSelectedState view={view} headingOverride={headingOverride} />
    : <SwapQuoteUnavailableState view={view} onRefresh={view.showRefresh ? onRefresh : undefined} />;
}

export interface SwapQuoteComparisonSectionProps {
  /** The exact quote-ready readiness derived from the engine result (ready legs / not-ready / not-required). */
  readiness: SwapActionReadiness;
  /** Whether the section should request quotes (true while the Review modal is open). */
  enabled: boolean;
  /** True for DCA (drives the not-ready copy). */
  isDca?: boolean;
  slippageBps?: number;
  /** Injected fetcher (real client by default). */
  fetcher?: SwapQuoteFetcher;
  /** Deterministic gallery override: a preset assessment per legId (no live fetch). */
  presetAssessments?: Record<string, SwapQuoteComparisonAssessment>;
  /** Deterministic gallery override: force loading. */
  presetLoading?: boolean;
  nowMs?: number;
}

export default function SwapQuoteComparisonSection(props: SwapQuoteComparisonSectionProps) {
  const { readiness, enabled, isDca } = props;
  const legs: SwapActionContext[] = readiness.status === "ready" ? readiness.legs : [];
  const multiLeg = legs.length > 1;

  // Always call the hook (stable order); it no-ops when disabled / no legs (e.g. presets or not-ready).
  const usePreset = props.presetAssessments != null || props.presetLoading === true;
  const { phase, legResults, refresh } = useSwapQuoteComparison(legs, { enabled: enabled && readiness.status === "ready" && !usePreset, slippageBps: props.slippageBps, fetcher: props.fetcher });

  // Not-ready / not-required are decided by the boundary adapter — no request is made.
  if (readiness.status === "not_ready_for_quote") return renderView(notReadyView(isDca));
  if (readiness.status === "not_required") return renderView(notRequiredView());

  // Deterministic gallery preset.
  if (usePreset) {
    if (props.presetLoading) return <SwapQuoteLoadingState />;
    const presets = props.presetAssessments ?? {};
    if (multiLeg) return <SwapPlanQuoteSummary legs={legs} assessments={presets} nowMs={props.nowMs} />;
    const a = presets[legs[0]?.legId];
    return a ? renderView(presentSwapQuote(a, { nowMs: props.nowMs }), refresh) : renderView(unavailableView(), refresh);
  }

  if (phase === "idle" || phase === "loading") return <SwapQuoteLoadingState />;

  // Multi-leg: summarize per leg (earliest expiry, unresolved legs preserved).
  if (multiLeg) {
    const assessments: Record<string, SwapQuoteComparisonAssessment> = {};
    for (const lr of legResults) if (lr.result.ok) assessments[lr.legId] = lr.result.assessment;
    return <SwapPlanQuoteSummary legs={legs} assessments={assessments} onRefresh={refresh} nowMs={props.nowMs} />;
  }

  // Single leg.
  const lr = legResults[0];
  if (!lr) return renderView(unavailableView(), refresh);
  if (!lr.result.ok) return renderView(unavailableView(), refresh);
  return renderView(presentSwapQuote(lr.result.assessment, { nowMs: props.nowMs }), refresh);
}
