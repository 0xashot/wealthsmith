/**
 * SwapQuoteComparisonSection — Step 23C. The read-only "Suggested route" section mounted INSIDE the Review modal
 * (after the financial recommendation, before final disclosures) for Rebalance / Trim / eligible funded DCA. It
 * derives the exact quote-ready action from the engine result (never recalculating amount/source/dest/reserve),
 * requests the sanitized comparison only when the modal is open, and renders the honest state. It never mounts a
 * platform on the card face, never prepares/executes a transaction, and never changes the financial suggestion.
 *
 * 23C.2 — when a single-leg ELIGIBLE route is selected, it reports a READ-ONLY handoff (selected provider + swap
 * page URL) up to the modal via `onHandoff`, which renders the sticky "Swap on <provider>" footer. Multi-leg
 * routes report no handoff (no single platform for a multi-leg plan). The handoff is a link out only.
 *
 * Data source is pluggable: real client by default; the /testing gallery passes `presetAssessments` (or a preset
 * status) so gallery cases are deterministic and never call live providers.
 */
import { useEffect } from "react";
import type { SwapActionReadiness, SwapActionContext, SwapQuoteComparisonAssessment } from "../../suggestions/swapQuote/swapQuoteContracts";
import { presentSwapQuote, notReadyView, notRequiredView, unavailableView, isEligibleResultKind, type QuoteView } from "../../suggestions/swapQuote/quotePresentation";
import type { SwapQuoteFetcher } from "../../suggestions/swapQuote/swapQuoteClient";
import { buildSwapHandoff, type SwapHandoff } from "../../suggestions/swapQuote/providerSwapLinks";
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
  /** 23C.2 — reports the read-only handoff for the modal's sticky "Swap on <provider>" footer (null = none). */
  onHandoff?: (handoff: SwapHandoff | null) => void;
  /**
   * Phase 6 — reports the single-leg action and its resolved assessment, so the modal can ask
   * whether a confirm step may be offered. Reporting the INPUTS rather than a verdict keeps the
   * Boundary's answer in one place: this section does not decide, it supplies.
   */
  onExecutionContext?: (ctx: { action: SwapActionContext; assessment: SwapQuoteComparisonAssessment } | null) => void;
}

export default function SwapQuoteComparisonSection(props: SwapQuoteComparisonSectionProps) {
  const { readiness, enabled, isDca, onHandoff, onExecutionContext } = props;
  const legs: SwapActionContext[] = readiness.status === "ready" ? readiness.legs : [];
  const multiLeg = legs.length > 1;
  const usePreset = props.presetAssessments != null || props.presetLoading === true;

  // Always call the hook (stable order); it no-ops when disabled / no legs (e.g. presets or not-ready).
  const { phase, legResults, refresh } = useSwapQuoteComparison(legs, { enabled: enabled && readiness.status === "ready" && !usePreset, slippageBps: props.slippageBps, fetcher: props.fetcher });

  // Resolve the single-leg assessment (preset or live) for the handoff + render.
  const singleLeg = !multiLeg ? legs[0] : undefined;
  const singleAssessment: SwapQuoteComparisonAssessment | null = singleLeg
    ? (usePreset ? (props.presetAssessments?.[singleLeg.legId] ?? null) : (legResults[0]?.result.ok ? legResults[0].result.assessment : null))
    : null;
  const singleView = singleAssessment ? presentSwapQuote(singleAssessment, { nowMs: props.nowMs }) : null;

  // READ-ONLY handoff — only for a single-leg ELIGIBLE selected route (multi-leg → no single platform button).
  const handoff: SwapHandoff | null = singleLeg && singleView && isEligibleResultKind(singleView.kind) && singleView.selectedProviderId
    ? buildSwapHandoff(singleView.selectedProviderId, singleLeg.inputAsset.mint, singleLeg.outputAsset.mint, singleLeg.inputAmountTokens)
    : null;
  const handoffKey = handoff ? `${handoff.providerId}|${handoff.swapUrl}` : null;
  useEffect(() => {
    onHandoff?.(handoff);
    return () => onHandoff?.(null); // clear on close / action change / unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handoffKey]);

  // The execution INPUTS, for whoever asks the Boundary. Single-leg only: a multi-leg plan has
  // no single transaction to approve, and the Boundary would refuse it anyway.
  const executionCtx = singleLeg && singleAssessment ? { action: singleLeg, assessment: singleAssessment } : null;
  const executionKey = executionCtx ? `${executionCtx.action.legId}|${executionCtx.assessment.comparedAt}` : null;
  useEffect(() => {
    onExecutionContext?.(executionCtx);
    return () => onExecutionContext?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executionKey]);

  // ---- render ----
  if (readiness.status === "not_ready_for_quote") return renderView(notReadyView(isDca, readiness.reasons));
  if (readiness.status === "not_required") return renderView(notRequiredView());

  if (usePreset) {
    if (props.presetLoading) return <SwapQuoteLoadingState />;
    if (multiLeg) return <SwapPlanQuoteSummary legs={legs} assessments={props.presetAssessments ?? {}} nowMs={props.nowMs} />;
    return singleView ? renderView(singleView, refresh) : renderView(unavailableView(), refresh);
  }

  if (phase === "idle" || phase === "loading") return <SwapQuoteLoadingState />;

  if (multiLeg) {
    const assessments: Record<string, SwapQuoteComparisonAssessment> = {};
    for (const lr of legResults) if (lr.result.ok) assessments[lr.legId] = lr.result.assessment;
    return <SwapPlanQuoteSummary legs={legs} assessments={assessments} onRefresh={refresh} nowMs={props.nowMs} />;
  }

  const lr = legResults[0];
  if (!lr || !lr.result.ok) return renderView(unavailableView(), refresh);
  return singleView ? renderView(singleView, refresh) : renderView(unavailableView(), refresh);
}
