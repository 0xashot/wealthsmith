/**
 * onTrackSuggestion — the canonical production On Track card mapper (Step 21E).
 *
 * `buildOnTrackCardFromAssessment` is the ONE authoritative On Track builder. It renders the existing `on_track`
 * informational card from the canonical `OnTrackAssessment` (onTrackAssessment.ts), which reuses the canonical
 * Safety Buffer + Rebalance + completeness results and the ACTUAL post-Stage-A candidate context. The card makes
 * only a SCOPED claim — the Safety Buffer is verified complete and the canonical crypto allocation is inside the
 * current ±10pp review range — and never implies overall plan/portfolio health, goal/contribution progress,
 * "no changes needed", or that any unevaluated dimension is healthy.
 *
 * It is informational: no CTA, no amount, no modal, priority 99, never a Top Pick. The pre-canonical direct rule
 * was relocated in Step 21E and DELETED in Step 21F, and is no longer reachable from any mounted path.
 */
import type { EngineSuggestion, SuggestionGuardrail } from "./engineTypes";
import { SUGGESTION_ENGINE_VERSION } from "./engineThresholds";
import { notApplicableProtocolSelection } from "./protocolSelection";
import type { OnTrackAssessment } from "./onTrackAssessment";

/** Stable suggestion ID (IDs must not change across runs/copy updates). */
export const ON_TRACK_SUGGESTION_ID = "on_track";

/**
 * Build the canonical `on_track` informational card from an OnTrackAssessment, or `null` unless the fallback is
 * eligible under the narrow verified scope. NEVER re-checks financial formulas — it trusts the canonical gates.
 */
export function buildOnTrackCardFromAssessment(a: OnTrackAssessment, generatedAt: number): EngineSuggestion | null {
  // Eligible ONLY under the fully-verified narrow scope. Any block/unresolved state ⇒ no card (fail closed).
  if (a.presentationState !== "eligible_scoped_status") return null;
  if (a.displayMode !== "scoped_informational") return null;
  if (a.fallbackEligibilityGate !== "allowed" || a.overallReadiness !== "allowed") return null;
  if (a.claimConfidence !== "verified_narrow_scope" || a.claimScope !== "safety_buffer_and_allocation") return null;
  if (a.visibleActionableCandidateCount !== 0) return null;
  if (a.materialRebalanceNeed || a.hasProvenHiddenMaterialSignal) return null;

  // Informational — proposes no action, so market-execution guardrails do not apply (never a fake "passed").
  const guardrails: SuggestionGuardrail[] = [
    { code: "pricing_available", status: "passed" },
    { code: "buffer_protection", status: "passed" },
    { code: "coverage_confidence", status: "passed" },
    { code: "allocation_delta", status: "passed" },
    { code: "cost_available", status: "not_applicable" },
    { code: "liquidity_available", status: "not_applicable" },
    { code: "slippage_available", status: "not_applicable" },
  ];

  return {
    id: ON_TRACK_SUGGESTION_ID,
    category: "on_track",
    // `portfolio_aligned` kept for analytics compatibility; the scoped code states only the proven claim.
    reason_codes: ["portfolio_aligned", "buffer_and_allocation_within_range"],
    title_key: "suggestion.on_track.title",
    description_key: "suggestion.on_track.description",
    action_kind: "informational",
    is_actionable: false,
    is_top_pick: false, // set only by selectTopPick; On Track is never eligible
    // Safe scoped informational data only (no amount, no CTA, no modal, no raw internals).
    delta_percent: a.cryptoDeltaPct ?? undefined,
    post_buffer_months: a.bufferTargetMonths ?? undefined,
    protocolSelection: notApplicableProtocolSelection("selection_not_required"),
    // No reviewDetails — On Track has no Review control and opens no modal (no dead/unreachable calculations).
    scores: { impact: 0, urgency: 0, efficiency: null },
    guardrails,
    engine_version: SUGGESTION_ENGINE_VERSION,
    timestamp: generatedAt,
  };
}
