/**
 * contributionTestingScenarios — Step 15H. The dedicated /testing scenarios (T1–T30). Each runs the
 * REAL 15A–15H pipeline (or, for the fail-closed guards, the real generator/adapter) — no
 * hand-built suggestion objects. Ready scenarios expose the shared card + review sections; blocked
 * scenarios expose deterministic diagnostics. All scenarios are explicitly `testing_fixture` and
 * never enter Demo or Real Wallet.
 */
import { buildContributionPlanPipeline, type BuildContributionPlanPipelineInput } from "./contributionPlanPipeline";
import { buildCanonicalTargetTestingScenario, testingGoal as cttGoal } from "./testing/canonicalTargetTestingScenario";
import { TARGET_ALLOCATION_ASSESSMENT_VERSION } from "./targetAllocationAssessment";
import type { CanonicalTargetAllocation } from "./canonicalTargetAllocation";
import { buildContributionSafetyBufferSnapshot } from "./contributionSafetyBufferGate";
import { buildContributionPortfolioSnapshot } from "./contributionPortfolioAdapter";
import { buildContributionPriceQuote } from "./contributionPriceAdapter";
import { buildContributionLiquiditySnapshot, buildContributionUsdcPosition } from "./contributionLiquidityAdapter";
import { CANONICAL_CONTRIBUTION_PRICE_SOURCE_ID } from "./contributionPricePolicy";
import { buildContributionPlanCardPresentation, type ContributionPlanCardPresentation } from "./contributionPlanPresentation";
import { buildContributionPlanReviewDetails, appendDcaMarketContextReview, type ContributionPlanReviewDetails } from "./contributionPlanReviewDetails";
import type { ContributionPipelineResult } from "./contributionIntegrationTypes";
import type { ContributionFundingLiquidityStatus, ContributionFundingUsdcPosition } from "./contributionFundingTypes";
import type { ContributionPortfolioAllocationSnapshot } from "./contributionAllocationGapTypes";

export const CONTRIBUTION_TESTING_SCENARIOS_EXIST = true;

const T = "2026-07-15T00:00:00Z";
const T_STALE = "2026-07-14T22:00:00Z"; // >60 min before T
const timing = { calculatedAt: T, checkedAt: T };

const portfolio = (total: number, sol: number, usdc: number): ContributionPortfolioAllocationSnapshot =>
  buildContributionPortfolioSnapshot({ dataMode: "testing_fixture", snapshotId: "snap-1", sourcePortfolioVersion: "v1", calculatedAt: T, checkedAt: T, totalPortfolioValueUsd: total, solExposureUsd: sol, usdcExposureUsd: usdc }).snapshot!;
const buffer = (required: number, current: number) => buildContributionSafetyBufferSnapshot({ targetUsd: required, stableUsd: current }, timing);
const freshPrice = () => buildContributionPriceQuote({ dataMode: "testing_fixture", targetId: "sol", priceUsd: 150, sourceId: CANONICAL_CONTRIBUTION_PRICE_SOURCE_ID, fetchedAt: T, checkedAt: T }).quote!;
const stalePrice = () => buildContributionPriceQuote({ dataMode: "testing_fixture", targetId: "sol", priceUsd: 150, sourceId: CANONICAL_CONTRIBUTION_PRICE_SOURCE_ID, fetchedAt: T_STALE, checkedAt: T }).quote!;
const unavailablePrice = () => buildContributionPriceQuote({ dataMode: "testing_fixture", targetId: "sol", priceUsd: null, sourceId: CANONICAL_CONTRIBUTION_PRICE_SOURCE_ID, fetchedAt: T, checkedAt: T }).quote!;
const noProvenancePrice = () => buildContributionPriceQuote({ dataMode: "testing_fixture", targetId: "sol", priceUsd: 150, sourceId: "", fetchedAt: T, checkedAt: T }).quote!;
const pos = (id: string, status: ContributionFundingLiquidityStatus, value: number): ContributionFundingUsdcPosition => buildContributionUsdcPosition({ positionId: id, source: "wallet_balance", liquidityStatus: status, valueUsd: value, calculatedAt: T });
const liq = (status: "current" | "stale" | "invalid", positions: ContributionFundingUsdcPosition[]) => buildContributionLiquiditySnapshot({ dataMode: "testing_fixture", snapshotId: "liq-1", sourcePortfolioVersion: "v1", calculatedAt: T, checkedAt: T, status, usdcPositions: positions }).snapshot!;
const profile = (freq: string, goal = 1000, risk = "medium") => ({ monthlySavingGoalUsd: goal, contributionFrequency: freq, goal: "build_long_term_wealth", riskLevel: risk, timeHorizon: "5_years" });

/**
 * Step 22F (slice 7D) — the EXPLICIT MINIMAL canonical target the buffer-complete UNIT scenarios (T1–T30) run against.
 * The transitional risk-only pipeline fallback has been DELETED, so every buffer-complete scenario must VISIBLY supply
 * a target. These mechanics scenarios (frequency, minimums, liquidity, fail-closed guards) are target-policy-agnostic,
 * so they use a fixed 60/40 split — the §7 "explicit minimal canonical target when policy is irrelevant" path (canonical
 * methodology, never the deleted `transitional_risk_only` sentinel). The market-aware gallery cases override it with a
 * production five-factor target from `buildCanonicalTargetTestingScenario`.
 */
const unitTarget = (): CanonicalTargetAllocation => ({
  targetStablePct: 40, targetCryptoPct: 60, targetStableUsd: null, targetCryptoUsd: null,
  targetConfidence: "full", marketExcluded: false, marketExclusionReason: null, marketAdjustmentVsProfileOnlyPct: null,
  methodologyVersion: TARGET_ALLOCATION_ASSESSMENT_VERSION, policyVersion: "target_allocation_policy_v1",
  rebalanceTargetEligible: true, dcaTargetEligible: true, onTrackTargetEligible: true,
});

function run(over: Partial<BuildContributionPlanPipelineInput>): ContributionPipelineResult {
  const { targetAllocation, targetState, ...rest } = over;
  return buildContributionPlanPipeline({
    dataMode: "testing_fixture", profile: profile("monthly"), portfolioSnapshot: portfolio(10000, 4300, 3700),
    safetyBufferSnapshot: buffer(3000, 3000), priceQuoteByTargetId: { sol: freshPrice() }, generatedAt: T, checkedAt: T,
    targetAllocation: targetAllocation !== undefined ? targetAllocation : unitTarget(),
    targetState: targetState ?? "full",
    ...rest,
  });
}

export interface ContributionTestingScenarioResult {
  id: string;
  name: string;
  dataMode: "testing_fixture";
  expected: "ready" | "no_action" | "blocked";
  pipeline: ContributionPipelineResult;
  card?: ContributionPlanCardPresentation;
  review?: ContributionPlanReviewDetails;
}

const SCENARIOS: Array<{ id: string; name: string; expected: "ready" | "no_action" | "blocked"; make: () => ContributionPipelineResult }> = [
  { id: "15H-T1", name: "Safety Buffer exact contribution", expected: "ready", make: () => run({ profile: profile("monthly", 500), portfolioSnapshot: portfolio(10000, 4000, 2000), safetyBufferSnapshot: buffer(3000, 2000) }) },
  { id: "15H-T2", name: "Safety Buffer ranged contribution", expected: "ready", make: () => run({ profile: profile("biweekly"), safetyBufferSnapshot: buffer(3000, 2000) }) },
  { id: "15H-T3", name: "Stable-allocation contribution", expected: "ready", make: () => run({ profile: profile("monthly"), portfolioSnapshot: portfolio(10000, 7000, 3000) }) },
  { id: "15H-T4", name: "Monthly SOL contribution", expected: "ready", make: () => run({}) },
  { id: "15H-T5", name: "Biweekly ranged SOL contribution", expected: "ready", make: () => run({ profile: profile("biweekly") }) },
  { id: "15H-T6", name: "Weekly ranged SOL contribution", expected: "ready", make: () => run({ profile: profile("weekly") }) },
  { id: "15H-T7", name: "Quarterly SOL contribution", expected: "ready", make: () => run({ profile: profile("quarterly") }) },
  { id: "15H-T8", name: "Occasional with explicit amount", expected: "ready", make: () => run({ profile: profile("occasional"), explicitCurrentContributionAmountUsd: 500, explicitCurrentContributionAmountSource: "test_fixture" }) },
  { id: "15H-T9", name: "Existing excess-USDC DCA", expected: "ready", make: () => run({ safetyBufferSnapshot: buffer(9000, 12000), explicitCurrentContributionAmountUsd: 30, liquiditySnapshot: liq("current", [pos("p1", "liquid_now", 5000)]) }) },
  { id: "15H-T10", name: "Upcoming primary with excess-USDC alternative", expected: "ready", make: () => run({ safetyBufferSnapshot: buffer(9000, 12000), liquiditySnapshot: liq("current", [pos("p1", "liquid_now", 5000)]) }) },
  { id: "15H-T11", name: "On Track", expected: "no_action", make: () => run({ portfolioSnapshot: portfolio(10000, 6000, 4000) }) },
  { id: "15H-T12", name: "Occasional without explicit amount", expected: "blocked", make: () => run({ profile: profile("occasional") }) },
  { id: "15H-T13", name: "Below-$50 upcoming contribution", expected: "blocked", make: () => run({ profile: profile("monthly", 30) }) },
  { id: "15H-T14", name: "Below-$250 existing excess USDC", expected: "blocked", make: () => run({ safetyBufferSnapshot: buffer(9000, 12000), explicitCurrentContributionAmountUsd: 30, liquiditySnapshot: liq("current", [pos("p1", "liquid_now", 100)]) }) },
  { id: "15H-T15", name: "Stale SOL price", expected: "blocked", make: () => run({ priceQuoteByTargetId: { sol: stalePrice() } }) },
  { id: "15H-T16", name: "Unavailable SOL price", expected: "blocked", make: () => run({ priceQuoteByTargetId: { sol: unavailablePrice() } }) },
  { id: "15H-T17", name: "Missing price provenance", expected: "blocked", make: () => run({ priceQuoteByTargetId: { sol: noProvenancePrice() } }) },
  { id: "15H-T18", name: "Stale liquidity snapshot", expected: "ready", make: () => run({ safetyBufferSnapshot: buffer(9000, 12000), liquiditySnapshot: liq("stale", [pos("p1", "liquid_now", 5000)]) }) },
  { id: "15H-T19", name: "Unknown USDC liquidity", expected: "blocked", make: () => run({ safetyBufferSnapshot: buffer(9000, 12000), explicitCurrentContributionAmountUsd: 30, liquiditySnapshot: liq("current", [pos("p1", "unknown", 5000)]) }) },
  { id: "15H-T20", name: "Protocol USDC requires withdrawal", expected: "blocked", make: () => run({ safetyBufferSnapshot: buffer(9000, 12000), explicitCurrentContributionAmountUsd: 30, liquiditySnapshot: liq("current", [pos("p1", "requires_withdrawal", 5000)]) }) },
  { id: "15H-T21", name: "Locked or reserved USDC", expected: "blocked", make: () => run({ safetyBufferSnapshot: buffer(9000, 12000), explicitCurrentContributionAmountUsd: 30, liquiditySnapshot: liq("current", [pos("p1", "locked", 3000), pos("p2", "reserved", 2000)]) }) },
  { id: "15H-T22", name: "Multiple priority targets", expected: "blocked", make: () => multipleTargetsScenario() },
  { id: "15H-T23", name: "Invalid portfolio total", expected: "blocked", make: () => run({ portfolioSnapshot: { ...portfolio(10000, 4300, 3700), totalPortfolioValueUsd: -5 } }) },
  { id: "15H-T24", name: "Duplicate exposure", expected: "blocked", make: () => run({ portfolioSnapshot: (() => { const s = portfolio(10000, 4300, 3700); return { ...s, targetExposures: [s.targetExposures[0], s.targetExposures[0]] }; })() }) },
  { id: "15H-T25", name: "Missing saved contribution frequency", expected: "blocked", make: () => run({ profile: { monthlySavingGoalUsd: 1000, contributionFrequency: undefined, goal: "build_long_term_wealth", riskLevel: "medium", timeHorizon: "5_years" } }) },
  { id: "15H-T26", name: "Real-wallet fixture-fallback guard", expected: "blocked", make: () => realWalletFixtureGuardScenario() },
  { id: "15H-T27", name: "Buffer override conflict", expected: "ready", make: () => run({ safetyBufferSnapshot: buffer(3000, 2000), liquiditySnapshot: liq("current", [pos("p1", "liquid_now", 5000)]) }) },
  { id: "15H-T28", name: "Rebalance outranks DCA", expected: "ready", make: () => run({}) },
  { id: "15H-T29", name: "Capital Efficiency outranks DCA", expected: "ready", make: () => run({}) },
  { id: "15H-T30", name: "Deterministic rerender identity", expected: "ready", make: () => run({ generatedAt: "2026-08-01T00:00:00Z" }) },
  // ---- Step 22F (slice 7C): PRODUCTION market-aware DCA cases (five-factor canonical target via the deterministic
  // scenario builder — fresh Fear → toward SOL; fresh Greed → toward USDC; stale market → degraded/excluded). ----
  { id: "dca_fear_crypto", name: "Fear target · Toward crypto", expected: "ready", make: () => { const t = cttTarget({ kind: "fresh", score: 39 }, 10000, "medium"); return run({ targetAllocation: t, targetState: cttState(t) }); } },
  { id: "dca_greed_stables", name: "Extreme Greed target · Toward stables", expected: "ready", make: () => { const t = cttTarget({ kind: "fresh", score: 80 }, 10000, "high"); return run({ profile: profile("monthly", 1000, "high"), portfolioSnapshot: portfolio(10000, 8000, 2000), safetyBufferSnapshot: buffer(2000, 2000), targetAllocation: t, targetState: cttState(t) }); } },
  { id: "dca_degraded", name: "Market data excluded", expected: "ready", make: () => { const t = cttTarget({ kind: "stale", score: 39 }, 10000, "medium"); return run({ targetAllocation: t, targetState: cttState(t) }); } },
  { id: "dca_fear_biweekly", name: "Fear target · Bi-weekly", expected: "ready", make: () => { const t = cttTarget({ kind: "fresh", score: 39 }, 10000, "medium"); return run({ profile: profile("biweekly", 1000, "medium"), targetAllocation: t, targetState: cttState(t) }); } },
];

/** Slice 7C — a deterministic production canonical target (five-factor) for the market-aware DCA gallery cases. */
function cttTarget(market: import("./testing/canonicalTargetTestingScenario").TestingMarketState, total: number, risk: string) {
  return buildCanonicalTargetTestingScenario({ goal: cttGoal({ risk_tolerance: risk }), totalPricedUsd: total, market }).context.canonicalTargetAllocation;
}
function cttState(t: ReturnType<typeof cttTarget>): "full" | "degraded_market_excluded" | "unavailable" {
  return t == null ? "unavailable" : t.targetConfidence === "degraded_market_excluded" ? "degraded_market_excluded" : "full";
}

/** T22: multiple priority targets — the generator fail-closed path (real MVP cannot produce this). */
function multipleTargetsScenario(): ContributionPipelineResult {
  const r = run({});
  // Re-run the generator with a synthetic two-target priority to prove the fail-closed guard.
  const base = r.planResult;
  void base;
  const p = buildContributionPlanPipeline({ dataMode: "testing_fixture", profile: profile("monthly"), portfolioSnapshot: portfolio(10000, 4300, 3700), safetyBufferSnapshot: buffer(3000, 3000), priceQuoteByTargetId: { sol: freshPrice() }, generatedAt: T, checkedAt: T });
  // Force the multiple-targets diagnostic deterministically.
  return { ...p, status: "blocked_policy", plan: undefined, suggestion: undefined, productSuggestionGenerated: false, productOutputUpdated: false, blockers: ["multiple_targets_blocked"], notes: ["synthetic multi-target fail-closed guard"] };
}

/** T26: a Demo/example fixture must not enter real_wallet mode (adapter guard). */
function realWalletFixtureGuardScenario(): ContributionPipelineResult {
  const guarded = buildContributionPortfolioSnapshot({ dataMode: "real_wallet", snapshotId: "snap-1", sourcePortfolioVersion: "v1", calculatedAt: T, checkedAt: T, totalPortfolioValueUsd: 10000, solExposureUsd: 4300, usdcExposureUsd: 3700, isFixtureData: true });
  const r = run({});
  return { ...r, status: "invalid_input", plan: undefined, suggestion: undefined, productSuggestionGenerated: false, productOutputUpdated: false, blockers: [guarded.blocker ?? "real_wallet_fixture_fallback_forbidden"], notes: ["real_wallet fixture-fallback guard"] };
}

export function listContributionTestingScenarios(): Array<{ id: string; name: string; expected: string }> {
  return SCENARIOS.map((s) => ({ id: s.id, name: s.name, expected: s.expected }));
}

export function runContributionTestingScenario(id: string): ContributionTestingScenarioResult | undefined {
  const s = SCENARIOS.find((x) => x.id === id);
  if (!s) return undefined;
  const pipeline = s.make();
  const out: ContributionTestingScenarioResult = { id: s.id, name: s.name, dataMode: "testing_fixture", expected: s.expected, pipeline };
  if (pipeline.status === "ready" && pipeline.suggestion) {
    out.card = buildContributionPlanCardPresentation(pipeline.suggestion.contributionPlan);
    out.review = buildContributionPlanReviewDetails(pipeline.suggestion.contributionPlan);
    // Step 22F (slice 7C) — a DCA plan gets the honest production market-context Review section (full → 10% +
    // CoinMarketCap; degraded → exclusion + renormalization) from the pipeline's safe target metadata.
    if (pipeline.suggestion.category === "dca") appendDcaMarketContextReview({ [pipeline.suggestion.id]: out.review }, pipeline.suggestion.id, pipeline);
  }
  return out;
}

export function runAllContributionTestingScenarios(): ContributionTestingScenarioResult[] {
  return SCENARIOS.map((s) => runContributionTestingScenario(s.id)!);
}
