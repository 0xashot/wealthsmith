/**
 * onTrackTestingFixtures — Step 21E. Deterministic, RPC-independent On Track states for the /testing gallery.
 * Each fixture runs the PRODUCTION canonical Safety Buffer + Rebalance projections into the PRODUCTION
 * `deriveOnTrackAssessment`, then the PRODUCTION `buildOnTrackCardFromAssessment`. The gallery renders the
 * production SuggestionCard. On Track is informational (no CTA, no modal): eligible states render the scoped card;
 * every blocked/unresolved state shows the deterministic no-card reason. No hand-built card, no testing-only logic.
 *
 * The card claims ONLY that the Safety Buffer is verified complete and the canonical crypto allocation is inside the
 * current ±10pp review range — never overall plan/portfolio health, goal/contribution progress, or "no changes needed".
 */
import { computeSafetyBufferCoverage, type SafetyBufferCoverage } from "../wallet/safetyBufferCoverage";
import { deriveSafetyBufferAssessment } from "../suggestions/safetyBufferAssessment";
import { deriveOnTrackAssessment, type OnTrackAssessment, type OnTrackCandidateContext } from "../suggestions/onTrackAssessment";
import type { RebalanceAssessment } from "../suggestions/rebalanceAssessment";
import type { PortfolioCompletenessResult } from "../wallet/portfolioCompleteness";
import { buildOnTrackCardFromAssessment } from "../suggestions/onTrackSuggestion";
import type { EngineSuggestion } from "../suggestions/engineTypes";

const GEN = 1_700_000_000_000;

const cov = (target: number, verified: number, state: SafetyBufferCoverage["coverageState"], opts: { unresolved?: number; unknownMag?: boolean } = {}): SafetyBufferCoverage => ({ requiredBufferUsd: target, recognizedStableValueUsd: verified + (opts.unresolved ?? 0), verifiedLiquidStableValueUsd: verified, delayedStableValueUsd: 0, unavailableStableValueUsd: 0, unresolvedStableValueUsd: opts.unresolved ?? 0, hasUnknownUnresolvedMagnitude: opts.unknownMag ?? false, shortfallUsd: Math.max(target - verified, 0), coverageRatio: target > 0 ? verified / target : 1, fullyFunded: state === "complete", coverageState: state, unresolvedReasons: [], sources: [] });
const sb = (coverage: SafetyBufferCoverage | null, expenses: number | null = 1000, months: number | null = 3) => deriveSafetyBufferAssessment({ coverage, monthlyExpensesUsd: expenses, targetMonths: months, generatedAt: GEN });
const ra = (delta: number | null, calc: "allowed" | "unresolved" | "blocked", opts: { material?: boolean; target?: number | null } = {}): RebalanceAssessment => ({ currentCryptoPct: opts.target === null ? null : 60 + (delta ?? 0), targetCryptoPct: opts.target === undefined ? 60 : opts.target, cryptoDeltaPct: opts.material ? 12 : delta, direction: opts.material ? "crypto_to_stables" : delta == null ? "unresolved" : delta >= 10 ? "crypto_to_stables" : delta <= -10 ? "stables_to_crypto" : "within_threshold", calculationGate: { status: calc, reasons: [] }, methodologyVersion: "rebalance_assessment_1.0.0" } as unknown as RebalanceAssessment);
const comp = (o: { liab?: string; dedup?: string; unknown?: boolean } = {}) => ({ liabilitiesState: o.liab ?? "complete", deduplicationState: o.dedup ?? "complete", hasUnknownMagnitudeValue: o.unknown ?? false, netWorthState: "complete" } as unknown as PortfolioCompletenessResult);
const ctx = (actionable = 0, opts: { info?: number; state?: OnTrackCandidateContext["candidateSetState"] } = {}): OnTrackCandidateContext => ({ visibleCandidateCount: actionable + (opts.info ?? 0), visibleActionableCandidateCount: actionable, visibleInformationalCandidateCount: opts.info ?? 0, hasHigherPriorityVisibleCandidate: actionable > 0, materialSignals: [], suppressedMaterialSignals: [], filteredMaterialSignals: [], unresolvedPotentialSignals: [], candidateSetState: opts.state ?? (actionable > 0 ? "nonempty" : "empty") });
// A REAL production-coverage buffer (proves coverage classification flows through), else complete.
const sbReal = (verified: number, target = 3000) => deriveSafetyBufferAssessment({ coverage: computeSafetyBufferCoverage([{ id: "u", source: "wallet", type: "token", symbol: "USDC", name: "USD Coin", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", amount: "1", detection: "direct_wallet_balance", valueUsd: verified } as never], target), monthlyExpensesUsd: target / 3, targetMonths: 3, generatedAt: GEN });

export interface OnTrackTestingFixture {
  id: string;
  label: string;
  assessment: OnTrackAssessment;
  card: EngineSuggestion | null;
}

function fx(id: string, label: string, sbA: OnTrackAssessment extends never ? never : Parameters<typeof deriveOnTrackAssessment>[0]["safetyBufferAssessment"], raA: RebalanceAssessment | null, cc: OnTrackCandidateContext, compA: PortfolioCompletenessResult | null = comp()): OnTrackTestingFixture {
  const assessment = deriveOnTrackAssessment({ safetyBufferAssessment: sbA, rebalanceAssessment: raA, portfolioCompleteness: compA, candidateContext: cc, generatedAt: GEN });
  return { id, label, assessment, card: buildOnTrackCardFromAssessment(assessment, GEN) };
}

export function getOnTrackTestingFixtures(): OnTrackTestingFixture[] {
  const cmpl = () => sb(cov(3000, 3000, "complete"));
  return [
    // ---- Eligible scope ----
    fx("eligible_zero_delta", "1. Verified complete buffer + 0% allocation delta → scoped On Track", cmpl(), ra(0, "allowed"), ctx(0)),
    fx("eligible_inside_plus", "2. Just inside +10 (+9.999) → eligible", cmpl(), ra(9.999, "allowed"), ctx(0)),
    fx("eligible_inside_minus", "3. Just inside −10 (−9.999) → eligible", cmpl(), ra(-9.999, "allowed"), ctx(0)),
    fx("eligible_buffer_above", "4. Complete buffer above target → eligible", sb(cov(3000, 4200, "complete")), ra(3, "allowed"), ctx(0)),
    fx("eligible_no_candidates", "5. No visible actionable candidates → eligible (yield/Trim unevaluated, not claimed healthy)", cmpl(), ra(1, "allowed"), ctx(0)),
    fx("eligible_info_candidate", "6. Informational-only candidate context → eligible (no actionable visible)", cmpl(), ra(1, "allowed"), ctx(0, { info: 1 })),

    // ---- Allocation blocked ----
    fx("blocked_exact_plus10", "7. Exact +10 → material drift → no card", cmpl(), ra(10, "allowed", { material: true }), ctx(0)),
    fx("blocked_exact_minus10", "8. Exact −10 → material drift → no card", cmpl(), ra(-10, "allowed", { material: true }), ctx(0)),
    fx("blocked_outside", "9. Outside ±10 (+15) → material drift → no card", cmpl(), ra(15, "allowed", { material: true }), ctx(0)),
    fx("blocked_material_no_card", "10. Canonical material Rebalance with candidate null → no On Track", cmpl(), ra(null, "allowed", { material: true }), ctx(0)),
    fx("blocked_alloc_unresolved", "11. Allocation unresolved (accounting gate not allowed) → no card", cmpl(), ra(2, "unresolved"), ctx(0)),
    fx("blocked_target_unavailable", "12. Target allocation unavailable → no card", cmpl(), ra(null, "allowed", { target: null }), ctx(0)),

    // ---- Safety Buffer blocked ----
    fx("blocked_definite_shortfall", "13. Definite Safety Buffer shortfall → no On Track", sb(cov(3000, 2000, "incomplete")), ra(2, "allowed"), ctx(0)),
    fx("blocked_below_min", "14. Below-minimum shortfall → no On Track", sb(cov(3000, 2960, "incomplete")), ra(2, "allowed"), ctx(0)),
    fx("blocked_coverage_unresolved", "15. Coverage unresolved → no On Track", sb(cov(3000, 2000, "unresolved", { unresolved: 1000 })), ra(2, "allowed"), ctx(0)),
    fx("blocked_target_unavail_buffer", "16. Buffer target unavailable → no On Track", sb(cov(3000, 2000, "incomplete"), null, 3), ra(2, "allowed"), ctx(0)),
    fx("blocked_coverage_unavail", "17. Buffer coverage unavailable → no On Track", sb(null, 1000, 3), ra(2, "allowed"), ctx(0)),

    // ---- Accounting blocked ----
    fx("blocked_liab_unresolved", "18. Liabilities unresolved → accounting unresolved → no On Track", cmpl(), ra(2, "allowed"), ctx(0), comp({ liab: "unresolved" })),
    fx("blocked_unknown_magnitude", "19. Unknown-magnitude asset → accounting unresolved → no On Track", cmpl(), ra(2, "allowed"), ctx(0), comp({ unknown: true })),
    fx("blocked_dedup_invalid", "20. Duplicate-invalid economic position → accounting blocked → no On Track", cmpl(), ra(2, "allowed"), ctx(0), comp({ dedup: "invalid" })),
    fx("blocked_stale_denominator", "21. Stale/unresolved denominator (calc gate) → no On Track", cmpl(), ra(2, "unresolved"), ctx(0)),

    // ---- Visible actionable candidates ----
    fx("blocked_one_candidate", "22. One visible actionable candidate → no On Track (even if buffer+allocation healthy)", cmpl(), ra(1, "allowed"), ctx(1)),
    fx("blocked_many_candidates", "23. Multiple actionable candidates → no On Track", cmpl(), ra(1, "allowed"), ctx(3)),
    fx("blocked_candidate_unresolved", "24. Candidate context unresolved (could hide a material need) → no On Track", cmpl(), ra(2, "allowed"), ctx(0, { state: "unresolved" })),

    // ---- Coverage classes flow through (real production coverage) ----
    fx("real_complete_usdc", "25. Real coverage: $3,200 direct USDC → complete → eligible", sbReal(3200), ra(2, "allowed"), ctx(0)),
    fx("real_incomplete_usdc", "26. Real coverage: $2,000 direct USDC → definite shortfall → no On Track", sbReal(2000), ra(2, "allowed"), ctx(0)),

    // ---- Scope / claim verification ----
    fx("scope_narrow_only", "27. Eligible card claims ONLY buffer + allocation (goal/yield/protocol-risk unevaluated)", cmpl(), ra(0, "allowed"), ctx(0)),
    fx("scope_no_broad_claim", "28. No broad plan-health / 'no changes needed' claim", cmpl(), ra(1, "allowed"), ctx(0)),
  ];
}
