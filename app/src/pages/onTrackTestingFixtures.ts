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
import { deriveRebalanceAssessment, selectRebalanceUsdcSource, deriveNativeSolRebalanceSource, REBALANCE_NATIVE_SOL_RESERVE_POLICY, isRebalanceMaterial, isMaterialCryptoToStables, type RebalanceAssessment } from "../suggestions/rebalanceAssessment";
import { deriveCompletenessGates, type PortfolioCompletenessResult } from "../wallet/portfolioCompleteness";
import { buildCanonicalTargetTestingScenario, testingGoal, type TestingMarketState } from "../suggestions/testing/canonicalTargetTestingScenario";
import type { WalletPosition } from "../wallet/walletPosition";
import { buildOnTrackCardsFromAssessment, type OnTrackGoalContext } from "../suggestions/onTrackSuggestion";
import type { EngineSuggestion } from "../suggestions/engineTypes";
// Step 22F (slice 7D) — the visible eligible On Track card runs the REAL production Stage-A engine (§5) over a
// deterministic portfolio and surfaces the engine's OWN On Track cards, built from the ACTUAL (empty) candidate set.
import { runSuggestionEngine } from "../suggestions/engine";
import { buildSuggestionEngineInputs } from "../suggestions/engineInputAdapter";
import { buildRebalanceCardFromAssessment } from "../suggestions/rebalanceSuggestion";
import { deriveTrimAssessment } from "../suggestions/trimAssessment";
import { buildTrimCardFromAssessment } from "../suggestions/trimSuggestion";
import { derivePositionOptimizationAssessment } from "../suggestions/positionOptimizationAssessment";
import { buildPositionOptimizationCardFromAssessment } from "../suggestions/positionOptimizationSuggestion";
import { derivePortfolioAssetAccounting } from "../wallet/portfolioAssetAccounting";
import { buildSafetyBufferCardFromAssessment } from "../suggestions/bufferSuggestion";
import { deriveValueBreakdown, deriveSafetyBuffer } from "../wallet/walletSummary";
import { getSafetyBufferTargetMonths } from "../wallet/safetyBufferTarget";
import type { SavedGoal } from "../types/goal";

const GEN = 1_700_000_000_000;

// Deterministic demo saved-plan context so the gallery renders the real Goal Check + Expense Benchmark cards.
// Expenses ($1,000/mo) × the 3-month target = the $3,000 buffer these fixtures fund, so the cards are consistent.
const DEMO_GOAL_CTX: OnTrackGoalContext = { financialGoal: "retire_early", timeline: "5_years", monthlyExpensesUsd: 1000 };

const cov = (target: number, verified: number, state: SafetyBufferCoverage["coverageState"], opts: { unresolved?: number; unknownMag?: boolean } = {}): SafetyBufferCoverage => ({ requiredBufferUsd: target, recognizedStableValueUsd: verified + (opts.unresolved ?? 0), verifiedLiquidStableValueUsd: verified, delayedStableValueUsd: 0, unavailableStableValueUsd: 0, unresolvedStableValueUsd: opts.unresolved ?? 0, hasUnknownUnresolvedMagnitude: opts.unknownMag ?? false, shortfallUsd: Math.max(target - verified, 0), coverageRatio: target > 0 ? verified / target : 1, fullyFunded: state === "complete", coverageState: state, unresolvedReasons: [], sources: [] });
const sb = (coverage: SafetyBufferCoverage | null, expenses: number | null = 1000, months: number | null = 3) => deriveSafetyBufferAssessment({ coverage, monthlyExpensesUsd: expenses, targetMonths: months, generatedAt: GEN });
const ra = (delta: number | null, calc: "allowed" | "unresolved" | "blocked", opts: { material?: boolean; target?: number | null; targetConfidence?: string | null } = {}): RebalanceAssessment => ({ currentCryptoPct: opts.target === null ? null : 60 + (delta ?? 0), targetCryptoPct: opts.target === undefined ? 60 : opts.target, cryptoDeltaPct: opts.material ? 12 : delta, direction: opts.material ? "crypto_to_stables" : delta == null ? "unresolved" : delta >= 10 ? "crypto_to_stables" : delta <= -10 ? "stables_to_crypto" : "within_threshold", calculationGate: { status: calc, reasons: [] }, methodologyVersion: "rebalance_assessment_1.0.0", targetConfidence: opts.targetConfidence === undefined ? "full" : opts.targetConfidence } as unknown as RebalanceAssessment);
const comp = (o: { liab?: string; dedup?: string; unknown?: boolean } = {}) => ({ liabilitiesState: o.liab ?? "complete", deduplicationState: o.dedup ?? "complete", hasUnknownMagnitudeValue: o.unknown ?? false, netWorthState: "complete" } as unknown as PortfolioCompletenessResult);
const ctx = (actionable = 0, opts: { info?: number; state?: OnTrackCandidateContext["candidateSetState"] } = {}): OnTrackCandidateContext => ({ visibleCandidateCount: actionable + (opts.info ?? 0), visibleActionableCandidateCount: actionable, visibleInformationalCandidateCount: opts.info ?? 0, hasHigherPriorityVisibleCandidate: actionable > 0, materialSignals: [], suppressedMaterialSignals: [], filteredMaterialSignals: [], unresolvedPotentialSignals: [], candidateSetState: opts.state ?? (actionable > 0 ? "nonempty" : "empty") });
// A REAL production-coverage buffer (proves coverage classification flows through), else complete.
const sbReal = (verified: number, target = 3000) => deriveSafetyBufferAssessment({ coverage: computeSafetyBufferCoverage([{ id: "u", source: "wallet", type: "token", symbol: "USDC", name: "USD Coin", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", amount: "1", detection: "direct_wallet_balance", valueUsd: verified } as never], target), monthlyExpensesUsd: target / 3, targetMonths: 3, generatedAt: GEN });

export interface OnTrackTestingFixture {
  id: string;
  label: string;
  assessment: OnTrackAssessment;
  /** The production On Track cards (up to three) — empty for every blocked/unresolved state. */
  cards: EngineSuggestion[];
}

function fx(id: string, label: string, sbA: OnTrackAssessment extends never ? never : Parameters<typeof deriveOnTrackAssessment>[0]["safetyBufferAssessment"], raA: RebalanceAssessment | null, cc: OnTrackCandidateContext, compA: PortfolioCompletenessResult | null = comp()): OnTrackTestingFixture {
  const assessment = deriveOnTrackAssessment({ safetyBufferAssessment: sbA, rebalanceAssessment: raA, portfolioCompleteness: compA, candidateContext: cc, generatedAt: GEN });
  return { id, label, assessment, cards: buildOnTrackCardsFromAssessment(assessment, DEMO_GOAL_CTX, GEN) };
}

// The On Track eligible scenario runs on a SMALL portfolio (monthly expenses $190 → $570 buffer), so the goal-context
// cards it renders (Goal Check / Expense Benchmark) stay consistent with the scenario's own Safety Buffer.
const ON_TRACK_PROD_EXPENSES = 190;
const ON_TRACK_PROD_GOAL: SavedGoal = { financial_goal: "retire_early", risk_tolerance: "medium", timeline: "5_years", contribution_frequency: "monthly", income_monthly: 1000, expenses_monthly: ON_TRACK_PROD_EXPENSES, monthly_saving_goal: 0 } as SavedGoal;

/**
 * Step 22F (slice 7D) — the VISIBLE eligible On Track card, derived from the ACTUAL production Stage-A run (§5), NOT a
 * hand-built empty candidate context. A deterministic FUNDED, within-range portfolio is run through the SAME production
 * chain the mounted rail uses (fresh-Fear market → canonical target → Rebalance/Trim/Position-Optimization assessments
 * → the full `runSuggestionEngine` Stage-A). The engine itself builds the On Track candidate context from the REAL
 * assembled candidate set, and the visible cards are the engine's OWN On Track cards.
 *
 * The empty candidate set is GENUINE, not forced. The portfolio is calibrated so every production evaluator legitimately
 * declines: a SINGLE native staked-SOL position under the $1,000 concentration-review floor (with an APY, so no
 * low-yield/missing-data review) triggers no concentration, no shared-exposure (single position), and — being a stake,
 * not a liquid native SOL / LST / token — no staking, trim, or capital-efficiency review; the buffer is funded by a
 * fully-withdrawable PROTOCOL USDC position that counts as recognized coverage yet is not "liquid wallet stable", so the
 * legacy stable-yield rule declines; and the within-range allocation triggers no Rebalance and no DCA. Nothing is
 * disabled, no `[]` is passed, and no confidence is hand-set.
 */
function prodOnTrackEligible(): { assessment: OnTrackAssessment; cards: EngineSuggestion[] } {
  const market: TestingMarketState = { kind: "fresh", score: 39 };
  const scenario = buildCanonicalTargetTestingScenario({ goal: testingGoal({ risk_tolerance: "medium" }), totalPricedUsd: 1599, market });
  const ct = scenario.context.canonicalTargetAllocation!;
  const cryptoV = 999; // just under the $1,000 concentration-review floor → no concentration candidate
  const stableV = 600;
  const positions: WalletPosition[] = [
    { id: "stk", source: "wallet", type: "stake", symbol: "SOL", name: "Staked SOL", detection: "native_stake_account", valueUsd: cryptoV, uiAmount: cryptoV / 150, liquidValueUsd: 0, stakeLifecycleState: "active", stake: { anyUnresolved: false }, dedupeKey: "native-stake:on-track", apy: 6, apyObservedAt: "2026-07-15T00:00:00.000Z" } as unknown as WalletPosition,
    { id: "kd", source: "wallet", type: "protocol", symbol: "USDC", name: "USDC on Kamino", candidateId: "kamino_usdc_lending", existingPositionOnly: true, dedupeKey: "klend:on-track", valueUsd: stableV, recognizedValueUsd: stableV, withdrawalState: "fully_withdrawable", liquidValueUsd: stableV, mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" } as unknown as WalletPosition,
  ];
  const pricedAsOf = GEN;
  const value = deriveValueBreakdown(positions);
  const targetMonths = getSafetyBufferTargetMonths("medium");
  const bufferTargetUsd = ON_TRACK_PROD_EXPENSES * (targetMonths ?? 3);
  const bufferCoverage = computeSafetyBufferCoverage(positions, bufferTargetUsd);
  const buffer = deriveSafetyBuffer(positions, ON_TRACK_PROD_EXPENSES, targetMonths, bufferCoverage);
  const requiredBufferUsd = buffer?.targetUsd ?? bufferTargetUsd;
  const completeness = deriveCompletenessGates(positions, { requiredBufferUsd, bufferCoverage });
  const rebalanceAssessment = deriveRebalanceAssessment({ positions, portfolioCompleteness: completeness.result, safetyBufferCoverage: bufferCoverage, targetAllocation: ct, targetState: "full", requiredBufferUsd, generatedAt: pricedAsOf });
  const usdcSource = selectRebalanceUsdcSource(positions, requiredBufferUsd, pricedAsOf);
  const solPrice = positions.find((p) => p.type === "native")?.priceUsd ?? null;
  const solPriceFresh = typeof solPrice === "number";
  const nativeSolSource = deriveNativeSolRebalanceSource(positions, solPrice, solPriceFresh, REBALANCE_NATIVE_SOL_RESERVE_POLICY, completeness.result.freshnessState !== "stale", pricedAsOf);
  const rebalanceOverride = { card: buildRebalanceCardFromAssessment(rebalanceAssessment, usdcSource, nativeSolSource, solPrice, solPriceFresh, pricedAsOf), material: isRebalanceMaterial(rebalanceAssessment), materialCryptoToStables: isMaterialCryptoToStables(rebalanceAssessment) };
  const trimAssessment = deriveTrimAssessment({ positions, portfolioCompleteness: completeness.result, safetyBufferCoverage: bufferCoverage, requiredBufferUsd, generatedAt: pricedAsOf });
  const trimOverride = { candidate: buildTrimCardFromAssessment(trimAssessment, pricedAsOf), materialReviewNeed: trimAssessment.overallReadiness.status === "allowed" };
  const portfolioAccounting = derivePortfolioAssetAccounting(positions, completeness.result);
  const poAssessment = derivePositionOptimizationAssessment({ positions, portfolioCompleteness: completeness.result, safetyBufferCoverage: bufferCoverage, requiredBufferUsd, portfolioAccounting, generatedAt: pricedAsOf });
  const poOverride = { candidate: buildPositionOptimizationCardFromAssessment(poAssessment, pricedAsOf), reviewNeed: poAssessment.overallReadiness.status === "allowed" };
  const safetyBufferAssessment = deriveSafetyBufferAssessment({ coverage: bufferCoverage, monthlyExpensesUsd: ON_TRACK_PROD_EXPENSES, targetMonths, generatedAt: pricedAsOf });
  const bufferOverride = { candidate: buildSafetyBufferCardFromAssessment(safetyBufferAssessment, pricedAsOf), bufferSatisfied: safetyBufferAssessment.presentationState === "complete", blocksDownstream: safetyBufferAssessment.presentationState !== "complete" };
  const engineResult = runSuggestionEngine(
    buildSuggestionEngineInputs({ positions, pricedAsOf, savedGoal: ON_TRACK_PROD_GOAL, value: { totalUsd: value.totalUsd, anyUnpriced: value.anyUnpriced }, safetyBuffer: buffer, allocation: null }),
    pricedAsOf, null, null, completeness.gates, rebalanceOverride, trimOverride, poOverride, bufferOverride,
    { safetyBufferAssessment, rebalanceAssessment, portfolioCompleteness: completeness.result },
  );
  const cards = engineResult.suggestions.filter((s) => s.category === "on_track");
  // The assessment is re-derived from the SAME real candidate set — its actionable count comes from the actual engine
  // result (never a hand-typed 0), so the eligibility is genuine.
  const actionableCount = engineResult.suggestions.filter((s) => s.category !== "on_track").length;
  const assessment = deriveOnTrackAssessment({ safetyBufferAssessment, rebalanceAssessment, portfolioCompleteness: completeness.result, candidateContext: ctx(actionableCount), generatedAt: GEN });
  return { assessment, cards };
}

export function getOnTrackTestingFixtures(): OnTrackTestingFixture[] {
  const cmpl = () => sb(cov(3000, 3000, "complete"));
  const prodEligible = prodOnTrackEligible();
  return [
    // ---- Eligible scope ----
    // Step 22F (slice 7D) — the visible eligible card is derived from the ACTUAL production Stage-A engine run (real
    // empty candidate set), not a hand-built ctx(0). See prodOnTrackEligible.
    { id: "eligible_zero_delta", label: "Full-confidence On Track · Real Stage-A (no actionable candidates)", assessment: prodEligible.assessment, cards: prodEligible.cards },
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
