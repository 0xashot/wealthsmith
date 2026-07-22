/**
 * targetAllocationAssessment — Step 22D. The pure, deterministic, NON-MOUNTED five-factor Target Allocation
 * assessment. It reuses the APPROVED policy constants (`targetAllocationPolicy.ts`) — every matrix + weight — and
 * CONSUMES the governed `MarketConditionAssessment` (Step 22C) without recalculating the market band. It produces
 * ONLY target percentages + explanation/readiness metadata; it emits no suggestion, reads no wallet positions,
 * computes no target-dollar amounts, and never treats the monthly contribution as Net Cash Flow.
 *
 * Nothing in the mounted engine imports this module — the mounted target stays risk-only. Missing values are never
 * substituted; a missing/excluded market component degrades (renormalizes the other 90%) but is never Neutral.
 */
import {
  TARGET_ALLOCATION_POLICY_ID,
  TARGET_ALLOCATION_POLICY_VERSION,
  TARGET_ALLOCATION_FACTOR_WEIGHTS,
  RISK_STABLE_TARGET_PCT,
  HORIZON_STABLE_TARGET_PCT,
  GOAL_STABLE_TARGET_PCT,
  CASH_FLOW_STABLE_BANDS,
} from "./targetAllocationPolicy";
import type { MarketConditionAssessment } from "./marketConditionAssessment";

export const TARGET_ALLOCATION_ASSESSMENT_VERSION = "target_allocation_assessment_1.0.0";

export type TargetAllocationFactorId = "risk" | "horizon" | "financial_goal" | "net_cash_flow" | "market_conditions";
export type TargetAllocationFactorState = "available" | "excluded" | "unavailable" | "blocked" | "unresolved";
export type TargetAllocationConfidence = "full" | "degraded_market_excluded" | "unavailable" | "blocked" | "unresolved";

export interface TargetAllocationFactorAssessment {
  factorId: TargetAllocationFactorId;
  /** Short classification of the raw input (present / missing / unsupported / non_finite / negative / from_market). */
  inputState: string;
  /** Normalized input used for the matrix (slug for enum factors, savings rate for cash flow, score for market). */
  normalizedInput: string | number | null;
  stableTargetPct: number | null;
  volatileTargetPct: number | null;
  weight: number;
  weightedStableContributionPct: number | null;
  state: TargetAllocationFactorState;
  source: string;
  policyVersion: string;
  warnings: string[];
  blockingReasons: string[];
  /** Net-cash-flow-only internal detail (never surfaced on a user-facing card). */
  cashFlow?: { monthlyIncomeUsd: number; monthlyExpensesUsd: number; netCashFlowUsd: number; savingsRate: number };
}

export interface TargetAllocationAssessmentInput {
  riskTolerance: string | null;
  timeline: string | null;
  financialGoal: string | null;
  monthlyIncomeUsd: number | null;
  monthlyExpensesUsd: number | null;
  marketConditionAssessment: MarketConditionAssessment | null;
  generatedAt: number;
  methodologyVersion?: string;
}

export interface TargetAllocationAssessment {
  factors: TargetAllocationFactorAssessment[];
  weights: typeof TARGET_ALLOCATION_FACTOR_WEIGHTS;
  profileWeightedStableSubtotalPct: number | null;
  profileOnlyRenormalizedStableTargetPct: number | null;
  marketWeightedContributionPct: number | null;
  finalStableTargetPct: number | null;
  finalVolatileTargetPct: number | null;
  /** Full confidence only: finalStable − profileOnlyRenormalized. NOT bounded to ±6pp (see policy §8). */
  marketAdjustmentVsProfileOnlyPct: number | null;
  targetConfidence: TargetAllocationConfidence;
  marketExclusionReason: string | null;
  unavailableFactors: TargetAllocationFactorId[];
  unresolvedFactors: TargetAllocationFactorId[];
  warnings: string[];
  blockingReasons: string[];
  // Downstream-readiness metadata (metadata only — never mounted).
  rebalanceTargetEligible: boolean;
  dcaTargetEligible: boolean;
  onTrackTargetEligible: boolean;
  safetyBufferIndependent: true;
  targetExplanationAvailable: boolean;
  policyId: string;
  policyVersion: string;
  methodologyVersion: string;
  generatedAt: number;
}

/** Denominator for the degraded (market-excluded) renormalization — imported from the approved weights, never hard-coded. */
const DEGRADED_DENOMINATOR = 1 - TARGET_ALLOCATION_FACTOR_WEIGHTS.market; // = 0.90

const inRange = (n: number): boolean => Number.isFinite(n) && n >= 0 && n <= 100;

/** Evaluate an enum factor (risk / horizon / goal) against its approved matrix. No default, no normalization. */
function enumFactor(
  factorId: TargetAllocationFactorId,
  slug: string | null,
  matrix: Record<string, number>,
  weight: number,
  source: string,
): TargetAllocationFactorAssessment {
  const base = { factorId, weight, source, policyVersion: TARGET_ALLOCATION_POLICY_VERSION, warnings: [] as string[], blockingReasons: [] as string[], volatileTargetPct: null as number | null, weightedStableContributionPct: null as number | null };
  if (slug == null) {
    return { ...base, inputState: "missing", normalizedInput: null, stableTargetPct: null, state: "unavailable" };
  }
  const pct = matrix[slug];
  if (pct == null) {
    return { ...base, inputState: "unsupported", normalizedInput: slug, stableTargetPct: null, state: "blocked", blockingReasons: [`${factorId}_unsupported_slug`] };
  }
  if (!inRange(pct)) {
    return { ...base, inputState: "invalid_policy", normalizedInput: slug, stableTargetPct: null, state: "blocked", blockingReasons: [`${factorId}_stable_pct_out_of_range`] };
  }
  return { ...base, inputState: "present", normalizedInput: slug, stableTargetPct: pct, volatileTargetPct: 100 - pct, weightedStableContributionPct: pct * weight, state: "available" };
}

/** Net Cash Flow factor. NetCashFlow = income − expenses; SavingsRate = NetCashFlow / income. Contribution is never read. */
function cashFlowFactor(income: number | null, expenses: number | null): TargetAllocationFactorAssessment {
  const weight = TARGET_ALLOCATION_FACTOR_WEIGHTS.netCashFlow;
  const base = { factorId: "net_cash_flow" as const, weight, source: "target_allocation_policy_v1:cash_flow", policyVersion: TARGET_ALLOCATION_POLICY_VERSION, warnings: [] as string[], blockingReasons: [] as string[], volatileTargetPct: null as number | null, weightedStableContributionPct: null as number | null };
  // Income gating.
  if (income == null) return { ...base, inputState: "missing", normalizedInput: null, stableTargetPct: null, state: "unavailable" };
  if (!Number.isFinite(income)) return { ...base, inputState: "non_finite", normalizedInput: null, stableTargetPct: null, state: "blocked", blockingReasons: ["income_non_finite"] };
  if (income <= 0) return { ...base, inputState: "non_positive_income", normalizedInput: null, stableTargetPct: null, state: "unavailable" };
  // Expense gating.
  if (expenses == null) return { ...base, inputState: "missing", normalizedInput: null, stableTargetPct: null, state: "unavailable" };
  if (!Number.isFinite(expenses)) return { ...base, inputState: "non_finite", normalizedInput: null, stableTargetPct: null, state: "blocked", blockingReasons: ["expenses_non_finite"] };
  if (expenses < 0) return { ...base, inputState: "negative", normalizedInput: null, stableTargetPct: null, state: "blocked", blockingReasons: ["expenses_negative"] };
  // Valid → savings rate (no rounding before band selection).
  const netCashFlowUsd = income - expenses;
  const savingsRate = netCashFlowUsd / income;
  const band = CASH_FLOW_STABLE_BANDS.find((b) => b.upperInclusive == null || savingsRate <= b.upperInclusive);
  const pct = band?.stableTargetPct ?? null;
  if (pct == null || !inRange(pct)) return { ...base, inputState: "invalid_policy", normalizedInput: savingsRate, stableTargetPct: null, state: "blocked", blockingReasons: ["cash_flow_band_unresolved"] };
  return { ...base, inputState: "present", normalizedInput: savingsRate, stableTargetPct: pct, volatileTargetPct: 100 - pct, weightedStableContributionPct: pct * weight, state: "available", cashFlow: { monthlyIncomeUsd: income, monthlyExpensesUsd: expenses, netCashFlowUsd, savingsRate } };
}

/** Market factor — CONSUMES the governed MarketConditionAssessment; never recalculates score/band/freshness. */
function marketFactor(mca: MarketConditionAssessment | null): TargetAllocationFactorAssessment {
  const weight = TARGET_ALLOCATION_FACTOR_WEIGHTS.market;
  const base = { factorId: "market_conditions" as const, weight, source: "market_condition_assessment_1.0.0", policyVersion: TARGET_ALLOCATION_POLICY_VERSION, warnings: [] as string[], blockingReasons: [] as string[], volatileTargetPct: null as number | null, weightedStableContributionPct: null as number | null };
  if (mca == null) {
    return { ...base, inputState: "missing", normalizedInput: null, stableTargetPct: null, state: "excluded", warnings: ["market_observation_missing"] };
  }
  switch (mca.componentAvailability) {
    case "available_full": {
      const pct = mca.marketStableTargetPct;
      if (pct == null || !inRange(pct)) return { ...base, inputState: "from_market", normalizedInput: mca.score, stableTargetPct: null, state: "blocked", blockingReasons: ["market_stable_pct_invalid"] };
      return { ...base, inputState: "from_market", normalizedInput: mca.score, stableTargetPct: pct, volatileTargetPct: 100 - pct, weightedStableContributionPct: pct * weight, state: "available" };
    }
    case "excluded_degraded":
      return { ...base, inputState: "from_market", normalizedInput: mca.score, stableTargetPct: null, state: "excluded", warnings: [`market_${mca.overallReadiness}`] };
    case "blocked":
      return { ...base, inputState: "from_market", normalizedInput: mca.score, stableTargetPct: null, state: "blocked", blockingReasons: [`market_${mca.overallReadiness}`] };
    default: // "unresolved"
      return { ...base, inputState: "from_market", normalizedInput: mca.score, stableTargetPct: null, state: "unresolved", warnings: ["market_unresolved"] };
  }
}

/**
 * Derive the pure five-factor target allocation. Precedence: blocked → unavailable → (all four profile available) →
 * market available ⇒ full, market excluded ⇒ degraded_market_excluded, market unresolved ⇒ unresolved.
 */
export function deriveTargetAllocationAssessment(input: TargetAllocationAssessmentInput): TargetAllocationAssessment {
  const w = TARGET_ALLOCATION_FACTOR_WEIGHTS;
  const risk = enumFactor("risk", input.riskTolerance, RISK_STABLE_TARGET_PCT, w.risk, "target_allocation_policy_v1:risk");
  const horizon = enumFactor("horizon", input.timeline, HORIZON_STABLE_TARGET_PCT, w.horizon, "target_allocation_policy_v1:horizon");
  const goal = enumFactor("financial_goal", input.financialGoal, GOAL_STABLE_TARGET_PCT, w.goal, "target_allocation_policy_v1:financial_goal");
  const cashFlow = cashFlowFactor(input.monthlyIncomeUsd, input.monthlyExpensesUsd);
  const market = marketFactor(input.marketConditionAssessment);
  const profile = [risk, horizon, goal, cashFlow];
  const factors = [risk, horizon, goal, cashFlow, market];

  const warnings: string[] = [];
  const blockingReasons: string[] = [];
  for (const f of factors) { warnings.push(...f.warnings); blockingReasons.push(...f.blockingReasons); }
  const unavailableFactors = profile.filter((f) => f.state === "unavailable").map((f) => f.factorId);
  const unresolvedFactors = factors.filter((f) => f.state === "unresolved").map((f) => f.factorId);
  const marketExclusionReason = market.state === "excluded" ? (market.warnings[0] ?? "market_excluded") : null;

  // Explanation subtotals available whenever all four profile factors are available.
  const profileAvailable = profile.every((f) => f.state === "available");
  const profileWeightedStableSubtotalPct = profileAvailable
    ? profile.reduce((sum, f) => sum + (f.weightedStableContributionPct as number), 0)
    : null;
  const profileOnlyRenormalizedStableTargetPct = profileWeightedStableSubtotalPct != null
    ? profileWeightedStableSubtotalPct / DEGRADED_DENOMINATOR
    : null;

  // ---- Confidence precedence ----
  let targetConfidence: TargetAllocationConfidence;
  if (factors.some((f) => f.state === "blocked")) targetConfidence = "blocked";
  else if (profile.some((f) => f.state === "unavailable")) targetConfidence = "unavailable";
  else if (market.state === "available") targetConfidence = "full";
  else if (market.state === "excluded") targetConfidence = "degraded_market_excluded";
  else targetConfidence = "unresolved"; // market unresolved (profile all available)

  let finalStableTargetPct: number | null = null;
  let marketWeightedContributionPct: number | null = null;
  let marketAdjustmentVsProfileOnlyPct: number | null = null;

  if (targetConfidence === "full") {
    marketWeightedContributionPct = market.weightedStableContributionPct;
    finalStableTargetPct = factors.reduce((sum, f) => sum + (f.weightedStableContributionPct as number), 0);
    marketAdjustmentVsProfileOnlyPct =
      profileOnlyRenormalizedStableTargetPct != null ? finalStableTargetPct - profileOnlyRenormalizedStableTargetPct : null;
  } else if (targetConfidence === "degraded_market_excluded") {
    finalStableTargetPct = profileOnlyRenormalizedStableTargetPct; // = subtotal / 0.90, market contributes nothing
  }
  const finalVolatileTargetPct = finalStableTargetPct == null ? null : 100 - finalStableTargetPct;

  // ---- Downstream-readiness metadata (never mounted) ----
  const full = targetConfidence === "full";
  const degraded = targetConfidence === "degraded_market_excluded";
  return {
    factors,
    weights: w,
    profileWeightedStableSubtotalPct,
    profileOnlyRenormalizedStableTargetPct,
    marketWeightedContributionPct,
    finalStableTargetPct,
    finalVolatileTargetPct,
    marketAdjustmentVsProfileOnlyPct,
    targetConfidence,
    marketExclusionReason,
    unavailableFactors,
    unresolvedFactors,
    warnings,
    blockingReasons,
    rebalanceTargetEligible: full || degraded,
    dcaTargetEligible: full || degraded,
    onTrackTargetEligible: full, // On Track requires FULL confidence — degraded/unavailable/blocked/unresolved ⇒ false
    safetyBufferIndependent: true,
    targetExplanationAvailable: full || degraded,
    policyId: TARGET_ALLOCATION_POLICY_ID,
    policyVersion: TARGET_ALLOCATION_POLICY_VERSION,
    methodologyVersion: input.methodologyVersion ?? TARGET_ALLOCATION_ASSESSMENT_VERSION,
    generatedAt: input.generatedAt,
  };
}
