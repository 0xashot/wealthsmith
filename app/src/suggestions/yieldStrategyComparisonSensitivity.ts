/**
 * yieldStrategyComparisonSensitivity — Step 16E. Deterministic weight-sensitivity analysis for one
 * lane's comparison. It perturbs ONLY the dimension weights (never eligibility, raw market values,
 * registry data, or risk-review data): each dimension weight is moved ±10% relative, the other weights
 * are rebalanced proportionally to preserve a total of 100, and every candidate's total is recomputed.
 * The baseline leader is "stable" only if it remains first — with no material tie emerging — in EVERY
 * approved scenario. This is deliberately stricter than the SOL selector's retention-rate rule.
 */
import {
  YIELD_STRATEGY_COMPARISON_MATERIAL_TIE_THRESHOLD,
  YIELD_STRATEGY_COMPARISON_SCORE_PRECISION,
  YIELD_STRATEGY_COMPARISON_SENSITIVITY_PERTURBATION_PCT,
  roundScore,
} from "./yieldStrategyComparisonPolicy";
import {
  YIELD_STRATEGY_COMPARISON_DIMENSIONS,
  YIELD_STRATEGY_SENSITIVITY_POLICY_ID,
  YIELD_STRATEGY_SENSITIVITY_POLICY_VERSION,
  type YieldStrategyComparisonDimensionKey,
  type YieldStrategySensitivityAnalysis,
  type YieldStrategySensitivityScenario,
} from "./yieldStrategyComparisonTypes";

export const YIELD_STRATEGY_SENSITIVITY_EXISTS = true;

export interface SensitivityCandidateInput {
  strategyId: string; // in canonical registry order
  dimensionScores: Record<YieldStrategyComparisonDimensionKey, number>;
}

export interface RunSensitivityInput {
  candidates: SensitivityCandidateInput[];
  baselineWeights: Record<YieldStrategyComparisonDimensionKey, number>;
  baselineLeaderStrategyId?: string;
  materialTieThreshold?: number;
  perturbationPct?: number;
  precision?: number;
}

/** Rebalance the other weights proportionally so the total stays 100 after one weight changes. */
function rebalance(weights: Record<YieldStrategyComparisonDimensionKey, number>, dim: YieldStrategyComparisonDimensionKey, factor: number): Record<YieldStrategyComparisonDimensionKey, number> {
  const original = weights[dim];
  const perturbed = original * factor;
  const othersTotal = 100 - original;
  const remaining = 100 - perturbed;
  const out = {} as Record<YieldStrategyComparisonDimensionKey, number>;
  for (const d of YIELD_STRATEGY_COMPARISON_DIMENSIONS) {
    if (d === dim) out[d] = perturbed;
    else out[d] = othersTotal > 0 ? weights[d] * (remaining / othersTotal) : weights[d];
  }
  return out;
}

function totalFor(cand: SensitivityCandidateInput, weights: Record<YieldStrategyComparisonDimensionKey, number>, precision: number): number {
  let total = 0;
  for (const d of YIELD_STRATEGY_COMPARISON_DIMENSIONS) total += roundScore(cand.dimensionScores[d] * weights[d] / 100, precision);
  return roundScore(total, precision);
}

/** Pick the leader from totals in canonical order; detect a material tie among the top two. */
function pickLeader(totals: { strategyId: string; score: number }[], threshold: number): { leaderStrategyId?: string; materialTie: boolean } {
  if (totals.length === 0) return { materialTie: false };
  const sorted = [...totals].sort((a, b) => b.score - a.score); // stable: preserves canonical order on ties
  const top = sorted[0];
  if (sorted.length === 1) return { leaderStrategyId: top.strategyId, materialTie: false };
  const diff = top.score - sorted[1].score;
  return { leaderStrategyId: top.strategyId, materialTie: diff <= threshold };
}

/** Run the deterministic weight-sensitivity analysis for one lane. */
export function runYieldStrategyComparisonSensitivity(input: RunSensitivityInput): YieldStrategySensitivityAnalysis {
  const threshold = input.materialTieThreshold ?? YIELD_STRATEGY_COMPARISON_MATERIAL_TIE_THRESHOLD;
  const perturbationPct = input.perturbationPct ?? YIELD_STRATEGY_COMPARISON_SENSITIVITY_PERTURBATION_PCT;
  const precision = input.precision ?? YIELD_STRATEGY_COMPARISON_SCORE_PRECISION;
  const base = {
    policyId: YIELD_STRATEGY_SENSITIVITY_POLICY_ID,
    policyVersion: YIELD_STRATEGY_SENSITIVITY_POLICY_VERSION,
    baselineLeaderStrategyId: input.baselineLeaderStrategyId,
    perturbationPct,
    scenariosEvaluated: 0,
    scenariosLeaderRetained: 0,
    scenarios: [] as YieldStrategySensitivityScenario[],
  };

  if (input.candidates.length === 0) return { ...base, status: "not_applicable_empty_set", notes: ["No eligible candidates; sensitivity not applicable."] };
  if (input.candidates.length === 1) return { ...base, status: "not_applicable_single_candidate", notes: ["Single eligible candidate; multi-candidate sensitivity was not applicable."] };
  if (!input.baselineLeaderStrategyId) return { ...base, status: "invalid", notes: ["No baseline leader to test."] };

  const scenarios: YieldStrategySensitivityScenario[] = [];
  let retained = 0;
  for (const dim of YIELD_STRATEGY_COMPARISON_DIMENSIONS) {
    for (const direction of ["up", "down"] as const) {
      const factor = direction === "up" ? 1 + perturbationPct : 1 - perturbationPct;
      const weights = rebalance(input.baselineWeights, dim, factor);
      const totals = input.candidates.map((c) => ({ strategyId: c.strategyId, score: totalFor(c, weights, precision) }));
      const { leaderStrategyId, materialTie } = pickLeader(totals, threshold);
      const leaderRetained = leaderStrategyId === input.baselineLeaderStrategyId && !materialTie;
      if (leaderRetained) retained += 1;
      scenarios.push({ scenarioId: `${dim}_${direction}`, dimension: dim, direction, perturbationPct, scenarioLeaderStrategyId: leaderStrategyId, leaderRetained, materialTieEmerged: materialTie });
    }
  }

  const status = retained === scenarios.length ? "stable" : "unstable";
  return {
    ...base,
    status,
    scenariosEvaluated: scenarios.length,
    scenariosLeaderRetained: retained,
    scenarios,
    notes: [status === "stable" ? "Baseline leader held in every ±10% weight scenario." : "Baseline leader changed or a material tie emerged under an approved ±10% weight scenario."],
  };
}

export interface SensitivityValidationResult {
  valid: boolean;
  errors: string[];
}

/** Validate a sensitivity analysis. Fails closed. */
export function validateYieldStrategySensitivityAnalysis(analysis: unknown): SensitivityValidationResult {
  const errors: string[] = [];
  if (!analysis || typeof analysis !== "object") return { valid: false, errors: ["analysis_not_an_object"] };
  const a = analysis as YieldStrategySensitivityAnalysis;
  if (a.policyId !== YIELD_STRATEGY_SENSITIVITY_POLICY_ID) errors.push("wrong_policy_id");
  if (!["stable", "unstable", "not_applicable_single_candidate", "not_applicable_empty_set", "invalid"].includes(a.status)) errors.push("invalid_status");
  if (a.status === "stable" && a.scenariosLeaderRetained !== a.scenariosEvaluated) errors.push("stable_without_full_retention");
  if (a.status === "unstable" && a.scenariosLeaderRetained === a.scenariosEvaluated) errors.push("unstable_with_full_retention");
  return { valid: errors.length === 0, errors };
}
