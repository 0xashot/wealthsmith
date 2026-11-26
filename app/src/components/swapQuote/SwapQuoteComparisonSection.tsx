/**
 * SwapQuoteComparisonSection — Step 23C. The read-only "Suggested route" section mounted INSIDE the Review modal
 * (after the financial recommendation, before final disclosures) for Rebalance / Trim / eligible funded DCA. It
 * derives the exact quote-ready action from the engine result (never recalculating amount/source/dest/reserve),
 * requests the sanitized comparison only when the modal is open, and renders the honest state. It never mounts a
 * platform on the card face, never prepares/executes a transaction, and never changes the financial suggestion.
 *
 * It reports the single-leg QUOTE STATE up to the modal via `onExecutionContext` — the action, its assessment
 * (null until one exists), whether a request is in flight, and a quiet refresh. The modal's footer is drawn from
 * that and nothing else: there is no "Swap on <provider>" link out any more, so this section no longer builds one.
 * Multi-leg plans report nothing (no single transaction to approve).
 *
 * Data source is pluggable: real client by default; the /testing gallery passes `presetAssessments` (or a preset
 * status) so gallery cases are deterministic and never call live providers.
 */
import { useLayoutEffect } from "react";
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
  /**
   * Phase 6 — reports the single-leg action and the state of its comparison, so the modal can
   * ask whether a confirm step may be offered. Reporting the INPUTS rather than a verdict keeps
   * the Boundary's answer in one place: this section does not decide, it supplies.
   */
  onExecutionContext?: (ctx: SwapQuoteState | null) => void;
}

/** What the footer needs to know about the route comparison. */
export interface SwapQuoteState {
  action: SwapActionContext;
  /** Null until a comparison has answered, and null again if the latest one failed. */
  assessment: SwapQuoteComparisonAssessment | null;
  /** A request is in flight — the first one, or a refresh of either kind. */
  loading: boolean;
  /** Re-request WITHOUT blanking the route on screen. For the Swap button's own use. */
  refresh: () => void;
}

export default function SwapQuoteComparisonSection(props: SwapQuoteComparisonSectionProps) {
  const { readiness, enabled, isDca, onExecutionContext } = props;
  const legs: SwapActionContext[] = readiness.status === "ready" ? readiness.legs : [];
  const multiLeg = legs.length > 1;
  const usePreset = props.presetAssessments != null || props.presetLoading === true;

  // Always call the hook (stable order); it no-ops when disabled / no legs (e.g. presets or not-ready).
  const { phase, legResults, refresh, refreshing } = useSwapQuoteComparison(legs, { enabled: enabled && readiness.status === "ready" && !usePreset, slippageBps: props.slippageBps, fetcher: props.fetcher });

  // Resolve the single-leg assessment (preset or live) for the handoff + render.
  const singleLeg = !multiLeg ? legs[0] : undefined;
  const singleAssessment: SwapQuoteComparisonAssessment | null = singleLeg
    ? (usePreset ? (props.presetAssessments?.[singleLeg.legId] ?? null) : (legResults[0]?.result.ok ? legResults[0].result.assessment : null))
    : null;
  // THE ROUTE ON SCREEN DOES NOT AGE OUT. A comparison lives about twenty seconds; presenting it against the
  // wall clock turned a decided route into "unavailable right now" on the next re-render after that, under a
  // reader who had changed nothing. So the view is presented as of the moment the comparison was made. Its
  // age still matters, and is handled where it matters: pressing Swap refreshes an aged comparison before any
  // terms are shown, and the terms someone approves are the plan's own, fetched then. (`props.nowMs` is the
  // gallery's fixed clock and keeps precedence, so its "expired" case still renders.)
  const comparedAtMs = singleAssessment ? Date.parse(singleAssessment.comparedAt) : NaN;
  const viewNowMs = props.nowMs ?? (Number.isFinite(comparedAtMs) ? comparedAtMs : undefined);
  const singleView = singleAssessment ? presentSwapQuote(singleAssessment, { nowMs: viewNowMs }) : null;

  // The quote state, for whoever draws the footer and asks the Boundary. Single-leg only: a
  // multi-leg plan has no single transaction to approve, and the Boundary would refuse it anyway.
  //
  // Reported from the FIRST render, before any comparison has answered, so the footer has an
  // owner the whole time the review is open. It used to be reported only once an assessment
  // existed, and in the gap the modal showed a different footer that was then replaced.
  const quoteLoading = usePreset ? props.presetLoading === true : phase !== "done" || refreshing;
  const quietRefresh = () => refresh({ quiet: true });
  // The reader's own Refresh blanks the section on purpose: they asked for a new answer and should see it arrive.
  const loudRefresh = () => refresh();
  const executionCtx: SwapQuoteState | null =
    singleLeg && readiness.status === "ready"
      ? { action: singleLeg, assessment: singleAssessment, loading: quoteLoading, refresh: quietRefresh }
      : null;
  const executionKey = executionCtx
    ? `${executionCtx.action.legId}|${executionCtx.action.inputAmountRaw}|${executionCtx.assessment?.comparedAt ?? "none"}|${quoteLoading}`
    : null;
  // A LAYOUT effect: the footer is drawn from this report, and a passive effect would let one
  // frame paint with the previous report — a Swap button spinning for a comparison that has
  // already answered.
  useLayoutEffect(() => {
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
    return singleView ? renderView(singleView, loudRefresh) : renderView(unavailableView(), loudRefresh);
  }

  if (phase === "idle" || phase === "loading") return <SwapQuoteLoadingState />;

  if (multiLeg) {
    const assessments: Record<string, SwapQuoteComparisonAssessment> = {};
    for (const lr of legResults) if (lr.result.ok) assessments[lr.legId] = lr.result.assessment;
    return <SwapPlanQuoteSummary legs={legs} assessments={assessments} onRefresh={loudRefresh} nowMs={props.nowMs} />;
  }

  const lr = legResults[0];
  if (!lr || !lr.result.ok) return renderView(unavailableView(), loudRefresh);
  return singleView ? renderView(singleView, loudRefresh) : renderView(unavailableView(), loudRefresh);
}
