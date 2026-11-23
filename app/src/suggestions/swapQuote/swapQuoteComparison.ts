/**
 * swapQuoteComparison — Step 23A. The pure comparison engine: over a FIXED snapshot of already-normalized
 * candidates for ONE action leg, it evaluates eligibility, ranks eligible routes by normalized net output, and
 * returns a `SwapQuoteComparisonAssessment` with a transparent status, the selected route, and every alternative
 * with its exclusion reasons. It NEVER fetches, mutates the action, or touches a suggestion's amount/eligibility.
 *
 * Status precedence (deterministic):
 *   pair unresolved            → no_valid_route (pair_classification_unresolved)
 *   0 eligible                 → no_valid_route
 *   ≥1 eligible + a hard failure→ partial_comparison   (a provider call failed / timed out / no route)
 *   exactly 1 eligible         → only_route_available   (others returned quotes but were ineligible)
 *   ≥2 eligible                → selected
 */
import type {
  SwapQuoteCandidate,
  SwapQuoteComparisonAssessment,
  SwapProviderId,
  SwapPairClass,
  SwapAsset,
  SwapComparisonStatus,
  SwapSelectionBasis,
  SwapPlanQuoteSummary,
} from "./swapQuoteContracts";
import { SWAP_QUOTE_METHODOLOGY_VERSION, APPROVED_SWAP_PROVIDER_IDS } from "./swapQuoteContracts";
import { classifySwapPair } from "./swapPairRegistry";
import { evaluateCandidateEligibility } from "./swapQuoteEligibility";
import { rankEligibleCandidates, type RankableCandidate } from "./swapQuoteRanking";
import { rawToTokens } from "./swapAmountMath";
import { DEFAULT_SWAP_QUOTE_POLICY, type SwapQuotePolicy, SWAP_QUOTE_OPERATIONAL_POLICY } from "./swapQuotePolicy";

export interface SwapQuoteComparisonInput {
  actionId: string;
  legId: string;
  inputAsset: SwapAsset;
  outputAsset: SwapAsset;
  requestedInputAmountRaw: string;
  inputAmountUsd: number | null;
  /** The snapshot of normalized candidates (one per attempted provider; absent provider == unavailable). */
  candidates: SwapQuoteCandidate[];
  comparedAtMs: number;
  policy?: SwapQuotePolicy;
  /** Optional override; otherwise derived from the exact mint pair. */
  pairClass?: SwapPairClass;
}

/** Reasons that mean a provider did NOT return a usable, comparable quote (a hard failure / no route). */
const FAILURE_REASONS = new Set(["provider_unavailable", "quote_timeout", "no_route", "normalization_failed"]);

const toMsOrNull = (iso: string | null): number | null => {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
};

/** Build a not-ready / not-required assessment for a leg the action layer could not make quote-ready. */
export function notReadyComparison(actionId: string, legId: string, status: "not_ready_for_quote" | "not_required" | "unresolved", reasons: string[], comparedAtMs = Date.now()): SwapQuoteComparisonAssessment {
  return {
    status,
    actionId,
    legId,
    pairClass: "unresolved",
    comparedAt: new Date(comparedAtMs).toISOString(),
    expiresAt: null,
    decidedBy: null,
    selectedProviderId: null,
    selectionBasis: null,
    candidates: [],
    comparedProviders: [],
    unavailableProviders: [],
    estimatedTotalCostUsd: null,
    estimatedTotalCostPct: null,
    expectedOutputTokens: null,
    minimumOutputTokens: null,
    economicallyEquivalent: false,
    warnings: [],
    blockingReasons: reasons,
    methodologyVersion: SWAP_QUOTE_METHODOLOGY_VERSION,
  };
}

export function compareSwapQuotes(input: SwapQuoteComparisonInput): SwapQuoteComparisonAssessment {
  const policy = input.policy ?? DEFAULT_SWAP_QUOTE_POLICY;
  const pairClass: SwapPairClass = input.pairClass ?? classifySwapPair(input.inputAsset.mint, input.outputAsset.mint);
  const comparedAt = new Date(input.comparedAtMs).toISOString();

  // Evaluate eligibility for every candidate (never mutates the inputs).
  const evaluated: RankableCandidate[] = input.candidates.map((c) => {
    const r = evaluateCandidateEligibility({
      candidate: c,
      inputAsset: input.inputAsset,
      outputAsset: input.outputAsset,
      requestedInputAmountRaw: input.requestedInputAmountRaw,
      inputAmountUsd: input.inputAmountUsd,
      pairClass,
      policy,
    });
    return { candidate: r.candidate, cost: r.cost };
  });

  // Provider availability categorization (over the APPROVED set — a missing provider == unavailable).
  const byProvider = new Map<SwapProviderId, RankableCandidate>();
  for (const e of evaluated) if (!byProvider.has(e.candidate.providerId)) byProvider.set(e.candidate.providerId, e);
  const comparedProviders: SwapProviderId[] = [];
  const unavailableProviders: SwapProviderId[] = [];
  for (const pid of APPROVED_SWAP_PROVIDER_IDS) {
    const e = byProvider.get(pid);
    const failed = !e || e.candidate.exclusionReasons.some((r) => FAILURE_REASONS.has(r));
    if (failed) unavailableProviders.push(pid);
    else comparedProviders.push(pid);
  }
  const hardFailure = unavailableProviders.length > 0;

  const { ranked, economicallyEquivalent, decidedBy } = rankEligibleCandidates(evaluated);
  const orderedCandidates: SwapQuoteCandidate[] = [
    ...ranked.map((r) => r.candidate),
    ...evaluated.filter((e) => !e.candidate.eligible).map((e) => e.candidate),
  ];

  // Determine status.
  let status: SwapComparisonStatus;
  let selectionBasis: SwapSelectionBasis = null;
  const blockingReasons: string[] = [];
  const warnings: string[] = [];

  if (pairClass === "unresolved") {
    status = "no_valid_route";
    blockingReasons.push("pair_classification_unresolved");
  } else if (ranked.length === 0) {
    status = "no_valid_route";
    // Surface the distinct exclusion reasons observed across candidates for transparency.
    const seen = new Set<string>();
    for (const e of evaluated) for (const r of e.candidate.exclusionReasons) seen.add(r);
    if (hardFailure && seen.size === 0) seen.add("provider_unavailable");
    blockingReasons.push(...[...seen]);
  } else if (hardFailure) {
    status = "partial_comparison";
    selectionBasis = ranked.length >= 2 ? (economicallyEquivalent ? "narrow_margin" : "lowest_estimated_total_cost") : "only_eligible_route";
    warnings.push(`Only ${comparedProviders.map((p) => p).join(", ") || "some providers"} returned a valid quote; ${unavailableProviders.join(", ")} did not.`);
  } else if (ranked.length === 1) {
    status = "only_route_available";
    selectionBasis = "only_eligible_route";
    warnings.push("Only one eligible route was available; the lowest-cost option could not be verified against alternatives.");
  } else {
    status = "selected";
    selectionBasis = economicallyEquivalent ? "narrow_margin" : "lowest_estimated_total_cost";
  }

  const winner = ranked[0];
  /**
   * When this comparison stops being usable — the earliest of:
   *   • any provider-supplied expiry among the ELIGIBLE candidates, and
   *   • the policy freshness window from `comparedAt`.
   *
   * The window is not a fallback invented here: `computeFreshness` already judges a quote with no provider
   * expiry as stale past exactly this point, so the comparison was already dead then. Previously that fact
   * was implicit and `expiresAt` stayed null, which read as "never expires" to anything downstream — including
   * a caller trying to decide whether there is time to sign against it.
   *
   * Candidates keep `expiresAt: null` when their provider supplied none; that stays literally true. This field
   * is the comparison's own lifetime, which is ours to state.
   */
  const providerExpiries = ranked.map((r) => toMsOrNull(r.candidate.expiresAt)).filter((t): t is number => t != null);
  const windowExpiry = input.comparedAtMs + SWAP_QUOTE_OPERATIONAL_POLICY.freshnessWindowMs;
  const expiresAt = ranked.length === 0
    ? null
    : new Date(Math.min(windowExpiry, ...providerExpiries)).toISOString();

  return {
    status,
    actionId: input.actionId,
    legId: input.legId,
    pairClass,
    comparedAt,
    expiresAt,
    decidedBy,
    selectedProviderId: winner ? winner.candidate.providerId : null,
    selectionBasis,
    candidates: orderedCandidates,
    comparedProviders,
    unavailableProviders,
    estimatedTotalCostUsd: winner ? winner.cost.estimatedTotalCostUsd : null,
    estimatedTotalCostPct: winner ? winner.cost.estimatedTotalCostPct : null,
    expectedOutputTokens: winner ? winner.candidate.expectedOutputTokens : null,
    minimumOutputTokens: winner && winner.candidate.minimumOutputRaw ? rawToTokens(winner.candidate.minimumOutputRaw, input.outputAsset.decimals) : null,
    economicallyEquivalent,
    warnings,
    blockingReasons,
    methodologyVersion: SWAP_QUOTE_METHODOLOGY_VERSION,
  };
}

/* ------------------------------------------------------------------ *
 * Multi-leg plan summary (multi-source Rebalance). Each leg is compared independently — no single "best
 * platform" is forced across legs. The plan expires when its EARLIEST selected leg expires, and no partial leg
 * is silently omitted (unresolved legs are counted).
 * ------------------------------------------------------------------ */
export function summarizeSwapPlan(actionId: string, legAssessments: SwapQuoteComparisonAssessment[]): SwapPlanQuoteSummary {
  const SELECTED: SwapComparisonStatus[] = ["selected", "only_route_available", "partial_comparison"];
  const selected = legAssessments.filter((l) => SELECTED.includes(l.status));
  const selectedLegCount = selected.length;
  const unresolvedLegCount = legAssessments.length - selectedLegCount;

  let estimatedPlanCostUsd: number | null = 0;
  for (const l of selected) {
    if (l.estimatedTotalCostUsd == null) {
      estimatedPlanCostUsd = null;
      break;
    }
    estimatedPlanCostUsd += l.estimatedTotalCostUsd;
  }

  // Plan cost % is only defined when every selected leg has a % (same-snapshot); otherwise null.
  let planInputUsd: number | null = 0;
  let planPctResolvable = selected.length > 0;
  for (const l of selected) {
    if (l.estimatedTotalCostUsd == null || l.estimatedTotalCostPct == null || l.estimatedTotalCostPct === 0) {
      planPctResolvable = false;
      break;
    }
    // Recover the leg's input USD from cost + pct (cost = input × pct/100).
    planInputUsd = (planInputUsd ?? 0) + (l.estimatedTotalCostUsd / (l.estimatedTotalCostPct / 100));
  }
  const estimatedPlanCostPct = planPctResolvable && estimatedPlanCostUsd != null && planInputUsd && planInputUsd > 0 ? (estimatedPlanCostUsd / planInputUsd) * 100 : null;

  const expiries = selected.map((l) => (l.expiresAt ? Date.parse(l.expiresAt) : NaN)).filter((t) => Number.isFinite(t));
  const expiresAt = expiries.length > 0 ? new Date(Math.min(...expiries)).toISOString() : null;

  return {
    actionId,
    legAssessments,
    selectedLegCount,
    unresolvedLegCount,
    estimatedPlanCostUsd,
    estimatedPlanCostPct,
    expiresAt,
    methodologyVersion: SWAP_QUOTE_METHODOLOGY_VERSION,
  };
}
