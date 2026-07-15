/**
 * contributionPlanSuggestion — Step 15H. Converts a READY Step 15G plan into a deterministic engine
 * suggestion (a normal `EngineSuggestion` carrying the structured `ContributionPlanSuggestionData`
 * payload) and provides the dedup/merge layer. Family mapping: safety_buffer_contribution → the
 * existing buffer family (one buffer card); stable_allocation_contribution → dca category, reason
 * `stable_target_underweight`; growth_recurring_contribution & growth_excess_usdc_dca → dca category,
 * reason `growth_target_underweight` (funding source is CONTEXT, never a second primary reason). It
 * sets no Top Pick, calculates no new numbers, and enables no execution.
 */
import type { EngineSuggestion, SuggestionCategory, SuggestionGuardrail, SuggestionReasonCode } from "./engineTypes";
import type { ContributionPlan, ContributionPlanGenerationResult, ContributionPlanProjectionPoint } from "./contributionPlanTypes";
import type { ContributionPlanSuggestion, ContributionPlanSuggestionData, ContributionPlanSuggestionPlanKind, ContributionPipelineResult } from "./contributionIntegrationTypes";
import { SUGGESTION_ENGINE_VERSION } from "./engineThresholds";
import { notApplicableProtocolSelection } from "./protocolSelection";
import { getInvestmentTarget } from "./investmentTargetRegistry";
import { BUFFER_SUGGESTION_ID } from "./bufferSuggestion";

export const CONTRIBUTION_PLAN_SUGGESTION_EXISTS = true;

interface KindMapping {
  category: SuggestionCategory;
  planKind: ContributionPlanSuggestionPlanKind;
  reason: SuggestionReasonCode;
  id: string;
  titleKey: string;
  descKey: string;
  toBucket: "stables" | "crypto";
}

function mapKind(plan: ContributionPlan): KindMapping {
  switch (plan.kind) {
    case "safety_buffer_contribution":
      return { category: "buffer", planKind: "safety_buffer", reason: "buffer_low", id: BUFFER_SUGGESTION_ID, titleKey: "suggestion.buffer.title", descKey: "suggestion.buffer.description", toBucket: "stables" };
    case "stable_allocation_contribution":
      return { category: "dca", planKind: "stable_contribution", reason: "stable_target_underweight", id: `contribution_stable_${plan.selectedTargetId}`, titleKey: "suggestion.contribution.stable.title", descKey: "suggestion.contribution.stable.description", toBucket: "stables" };
    case "growth_recurring_contribution":
      return { category: "dca", planKind: "recurring_dca", reason: "growth_target_underweight", id: `contribution_dca_${plan.selectedTargetId}`, titleKey: "suggestion.contribution.dca.title", descKey: "suggestion.contribution.dca.description", toBucket: "crypto" };
    default:
      return { category: "dca", planKind: "staged_excess_usdc_dca", reason: "growth_target_underweight", id: `contribution_dca_excess_${plan.selectedTargetId}`, titleKey: "suggestion.contribution.dca.excess.title", descKey: "suggestion.contribution.dca.excess.description", toBucket: "crypto" };
  }
}

function amountUsdOf(plan: ContributionPlan): number {
  return plan.amount.kind === "exact" ? (plan.amount.exactAmountUsd as number) : (plan.amount.maximumAmountUsd as number);
}

function point(plan: ContributionPlan, which: "exact" | "minimum" | "maximum"): ContributionPlanProjectionPoint | undefined {
  return which === "exact" ? plan.projection.exact : which === "minimum" ? plan.projection.minimum : plan.projection.maximum;
}

/** Build the structured payload from the plan (engine values only — the UI never recalculates). */
function buildPayload(plan: ContributionPlan, planKind: ContributionPlanSuggestionPlanKind): ContributionPlanSuggestionData {
  const target = getInvestmentTarget(plan.selectedTargetId);
  const source = plan.sourceAssetId ? getInvestmentTarget("usdc") : undefined;
  const exact = point(plan, "exact");
  const min = point(plan, "minimum");
  const max = point(plan, "maximum");
  const allocPoint = exact ?? max;
  const isBuffer = plan.kind === "safety_buffer_contribution";

  return {
    planId: plan.planId,
    planKind,
    fundingSourceId: plan.fundingSourceId,
    fundingTiming: plan.fundingTiming,
    targetId: plan.selectedTargetId,
    targetAssetId: plan.selectedTargetAssetId,
    targetSymbol: target?.symbol ?? plan.selectedTargetId.toUpperCase(),
    ...(plan.sourceAssetId ? { sourceAssetId: plan.sourceAssetId, sourceAssetSymbol: source?.symbol ?? "USDC" } : {}),
    amountKind: plan.amount.kind,
    ...(plan.amount.kind === "exact" ? { exactAmountUsd: plan.amount.exactAmountUsd } : { minimumAmountUsd: plan.amount.minimumAmountUsd, maximumAmountUsd: plan.amount.maximumAmountUsd }),
    ...(plan.cadence.contributionFrequencyId ? { contributionFrequencyId: plan.cadence.contributionFrequencyId } : {}),
    ...(plan.cadence.contributionsPerYear != null ? { contributionsPerYear: plan.cadence.contributionsPerYear } : {}),
    ...(plan.cadence.amountVariesByOneCent != null ? { amountVariesByOneCent: plan.cadence.amountVariesByOneCent } : {}),
    ...(plan.cadence.trancheCount != null ? { trancheCount: plan.cadence.trancheCount } : {}),
    ...(plan.cadence.durationDays != null ? { durationDays: plan.cadence.durationDays } : {}),
    steps: plan.steps.map((s) => ({ index: s.stepIndex, relativeDayOffset: s.relativeDayOffset, ...(s.amount.kind === "exact" ? { amountUsd: s.amount.exactAmountUsd } : { minimumAmountUsd: s.amount.minimumAmountUsd, maximumAmountUsd: s.amount.maximumAmountUsd }) })),
    // Allocation projection (non-buffer).
    ...(!isBuffer && allocPoint ? { currentTargetPct: allocPoint.sourceTargetPct, targetPct: allocPoint.targetPct, gapPercentagePoints: allocPoint.targetPct != null && allocPoint.sourceTargetPct != null ? allocPoint.targetPct - allocPoint.sourceTargetPct : undefined } : {}),
    ...(!isBuffer && exact ? { projectedTargetPct: exact.projectedTargetPct } : {}),
    ...(!isBuffer && min && max ? { minimumProjectedTargetPct: min.projectedTargetPct, maximumProjectedTargetPct: max.projectedTargetPct } : {}),
    // Safety Buffer projection.
    ...(isBuffer && (exact ?? max) ? (() => { const p = (exact ?? max)!; return { requiredBufferUsd: p.requiredBufferUsd, currentBufferUsd: p.sourceEligibleBufferUsd, projectedBufferUsd: p.projectedEligibleBufferUsd, currentBufferShortfallUsd: p.requiredBufferUsd != null && p.sourceEligibleBufferUsd != null ? Math.max(0, p.requiredBufferUsd - p.sourceEligibleBufferUsd) : undefined, projectedBufferShortfallUsd: p.projectedBufferShortfallUsd }; })() : {}),
    ...(isBuffer && min && max ? { minimumProjectedBufferUsd: min.projectedEligibleBufferUsd, maximumProjectedBufferUsd: max.projectedEligibleBufferUsd } : {}),
    alternativeFundingSourceIds: [...plan.alternativeFundingSourceIds],
    ...(plan.unallocatedSourceCapacity.calculated ? { unallocatedSourceCapacityUsd: plan.unallocatedSourceCapacity.exactUnusedUsd, minimumUnallocatedSourceCapacityUsd: plan.unallocatedSourceCapacity.minimumUnusedUsd, maximumUnallocatedSourceCapacityUsd: plan.unallocatedSourceCapacity.maximumUnusedUsd } : {}),
    readOnly: true,
    fundsMoved: false,
    fundsReserved: false,
    executionAvailable: false,
    transactionsEnabled: false,
    walletSignatureRequired: false,
  };
}

/** Deterministic scores (reuse existing families): buffer = shortfall/required; contribution/DCA = amount/total. */
function scoresFor(plan: ContributionPlan): { impact: number; urgency: number; efficiency: number | null } {
  if (plan.kind === "safety_buffer_contribution") {
    const p = plan.projection.exact ?? plan.projection.maximum;
    const req = p?.requiredBufferUsd ?? 0;
    const cur = p?.sourceEligibleBufferUsd ?? 0;
    const ratio = req > 0 ? Math.min(Math.max(0, req - cur) / req, 1) : 0;
    return { impact: ratio, urgency: ratio, efficiency: null };
  }
  const p = plan.projection.exact ?? plan.projection.maximum;
  const total = p?.sourceTotalPortfolioValueUsd ?? 0;
  const impact = total > 0 ? Math.min(amountUsdOf(plan) / total, 1) : 0;
  return { impact, urgency: 0.3, efficiency: 0.45 };
}

/** Build the plan-backed engine suggestion, or null when the plan result is not ready. */
export function buildContributionPlanSuggestion(planResult: ContributionPlanGenerationResult, generatedAtMs: number): ContributionPlanSuggestion | null {
  if (!planResult.plan || (planResult.status !== "ready_exact" && planResult.status !== "ready_range")) return null;
  const plan = planResult.plan;
  const m = mapKind(plan);
  const payload = buildPayload(plan, m.planKind);
  const guardrails: SuggestionGuardrail[] = [
    { code: "pricing_available", status: "passed" },
    { code: "buffer_protection", status: "passed" },
  ];
  const base: EngineSuggestion = {
    id: m.id,
    category: m.category,
    reason_codes: [m.reason], // ONE primary reason; funding source is context in the payload, not a reason.
    title_key: m.titleKey,
    description_key: m.descKey,
    action_kind: "review_only",
    is_actionable: true,
    is_top_pick: false,
    amount: { valueUsd: amountUsdOf(plan), label: plan.amount.kind === "range" ? "Contribution range (max)" : "Planned contribution" },
    to: { bucket: m.toBucket },
    ...(m.category === "buffer" ? { post_buffer_months: undefined } : {}),
    protocolSelection: notApplicableProtocolSelection("selection_not_required"),
    scores: scoresFor(plan),
    guardrails,
    engine_version: SUGGESTION_ENGINE_VERSION,
    timestamp: generatedAtMs,
  };
  return { ...base, contributionPlan: payload };
}

/* ------------------------------------------------------------------ *
 * Dedup / merge into an existing engine suggestion list.
 * ------------------------------------------------------------------ */
export interface MergeContributionSuggestionResult {
  suggestions: EngineSuggestion[];
  merged: boolean;
  existingSuggestionEnriched: boolean;
  conflict: boolean;
}

/**
 * Merge a ready plan-backed suggestion into the existing engine list deterministically. Exactly one
 * buffer suggestion and one DCA suggestion survive; the legacy DCA is dropped when a plan-backed DCA
 * exists. Blocked / no-action pipelines change nothing. Same plan id / target+source+purpose dedup.
 */
export function mergeContributionPlanSuggestion(existing: EngineSuggestion[], pipelineResult: ContributionPipelineResult): MergeContributionSuggestionResult {
  const sug = pipelineResult.suggestion;
  if (pipelineResult.status !== "ready" || !sug) return { suggestions: existing, merged: false, existingSuggestionEnriched: false, conflict: false };

  if (sug.category === "buffer") {
    const idx = existing.findIndex((s) => s.category === "buffer");
    if (idx >= 0) {
      // Enrich/replace the existing buffer suggestion (preserve its category + Top Pick eligibility).
      const next = existing.slice();
      next[idx] = sug;
      return { suggestions: next, merged: true, existingSuggestionEnriched: true, conflict: false };
    }
    return { suggestions: [...existing, sug], merged: true, existingSuggestionEnriched: false, conflict: false };
  }
  // dca category — drop any legacy/duplicate DCA, then add the one plan-backed DCA.
  const withoutDca = existing.filter((s) => s.category !== "dca");
  return { suggestions: [...withoutDca, sug], merged: true, existingSuggestionEnriched: false, conflict: false };
}
