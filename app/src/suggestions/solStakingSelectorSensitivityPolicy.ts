/**
 * solStakingSelectorSensitivityPolicy — Step 14X. The versioned thresholds, the deterministic
 * scenario catalog, and the safe policy-override builder for the sensitivity + activation layer.
 *
 * The stability thresholds gate whether the Step 14W comparison lead is "robust"; the historical
 * thresholds gate whether there is enough real operational history to CONSIDER activation review.
 * Historical thresholds gate activation review only — they never prevent running sensitivity
 * analysis on the current snapshot. Nothing here activates anything.
 */
import {
  SOL_STAKING_SELECTOR_POLICY,
  validateSolStakingSelectorPolicy,
  type SolStakingSelectorPolicy,
} from "./solStakingSelectorPolicy";
import type { SolStakingSensitivityScenario, SolStakingSensitivityScenarioClass } from "./solStakingSelectorSensitivityTypes";

export const SOL_STAKING_SELECTOR_SENSITIVITY_SCHEMA_VERSION = "1.0.0";
export const SOL_STAKING_SELECTOR_SENSITIVITY_POLICY_ID = "balanced_safety_first_v1_sensitivity";
export const SOL_STAKING_SELECTOR_SENSITIVITY_POLICY_VERSION = "1.0.0";

/* ---- Stability thresholds ---- */
export const SOL_STAKING_SENSITIVITY_MIN_LEADER_RETENTION_RATE = 0.7;
export const SOL_STAKING_SENSITIVITY_MIN_BASELINE_MARGIN = 0.25;
export const SOL_STAKING_SENSITIVITY_KNIFE_EDGE_MARGIN = 0.1;
export const SOL_STAKING_SENSITIVITY_MAX_KNIFE_EDGE_RATE = 0.25;
export const SOL_STAKING_SENSITIVITY_MIN_RETENTION_ELIGIBLE_SCENARIOS = 8;

/* ---- Historical activation thresholds ---- */
export const SOL_STAKING_ACTIVATION_MIN_HISTORY_SNAPSHOTS = 12;
export const SOL_STAKING_ACTIVATION_MIN_HISTORY_SPAN_HOURS = 72;
export const SOL_STAKING_ACTIVATION_MIN_CONSECUTIVE_REFRESH_SUCCESSES = 3;
export const SOL_STAKING_ACTIVATION_MAX_REFRESH_INTERVAL_HOURS = 6;

/** Symbolic scenario targets resolved from the baseline at run time. */
export const SENSITIVITY_TARGET_BASELINE_LEADER = "$baseline_leader";
export const SENSITIVITY_TARGET_BASELINE_RUNNER_UP = "$baseline_runner_up";
export const SENSITIVITY_TARGET_HIGHEST_RISK = "$highest_risk";
export const SENSITIVITY_TARGET_ALL = "$all";

const SUPPORTED_SCENARIO_CLASSES: SolStakingSensitivityScenarioClass[] = [
  "baseline",
  "policy_weights",
  "normalization_ranges",
  "market_perturbation",
  "data_availability",
  "historical_snapshot",
];

export interface SolStakingSensitivityPolicyConfig {
  policyId: string;
  policyVersion: string;
  minLeaderRetentionRate: number;
  minBaselineMargin: number;
  knifeEdgeMargin: number;
  maxKnifeEdgeRate: number;
  minRetentionEligibleScenarios: number;
  minHistorySnapshots: number;
  minHistorySpanHours: number;
  minConsecutiveRefreshSuccesses: number;
  maxRefreshIntervalHours: number;
}

export const SOL_STAKING_SELECTOR_SENSITIVITY_POLICY: SolStakingSensitivityPolicyConfig = {
  policyId: SOL_STAKING_SELECTOR_SENSITIVITY_POLICY_ID,
  policyVersion: SOL_STAKING_SELECTOR_SENSITIVITY_POLICY_VERSION,
  minLeaderRetentionRate: SOL_STAKING_SENSITIVITY_MIN_LEADER_RETENTION_RATE,
  minBaselineMargin: SOL_STAKING_SENSITIVITY_MIN_BASELINE_MARGIN,
  knifeEdgeMargin: SOL_STAKING_SENSITIVITY_KNIFE_EDGE_MARGIN,
  maxKnifeEdgeRate: SOL_STAKING_SENSITIVITY_MAX_KNIFE_EDGE_RATE,
  minRetentionEligibleScenarios: SOL_STAKING_SENSITIVITY_MIN_RETENTION_ELIGIBLE_SCENARIOS,
  minHistorySnapshots: SOL_STAKING_ACTIVATION_MIN_HISTORY_SNAPSHOTS,
  minHistorySpanHours: SOL_STAKING_ACTIVATION_MIN_HISTORY_SPAN_HOURS,
  minConsecutiveRefreshSuccesses: SOL_STAKING_ACTIVATION_MIN_CONSECUTIVE_REFRESH_SUCCESSES,
  maxRefreshIntervalHours: SOL_STAKING_ACTIVATION_MAX_REFRESH_INTERVAL_HOURS,
};

export interface SensitivityPolicyValidationResult {
  valid: boolean;
  errors: string[];
}

/** Validate the sensitivity policy config. Fails closed on impossible thresholds. */
export function validateSolStakingSelectorSensitivityPolicy(config: unknown): SensitivityPolicyValidationResult {
  const errors: string[] = [];
  if (!config || typeof config !== "object") return { valid: false, errors: ["config_not_an_object"] };
  const c = config as SolStakingSensitivityPolicyConfig;
  const rate = (v: number) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;
  if (!rate(c.minLeaderRetentionRate)) errors.push("invalid_min_leader_retention_rate");
  if (!rate(c.maxKnifeEdgeRate)) errors.push("invalid_max_knife_edge_rate");
  if (!(typeof c.minBaselineMargin === "number" && c.minBaselineMargin >= 0)) errors.push("negative_min_baseline_margin");
  if (!(typeof c.knifeEdgeMargin === "number" && c.knifeEdgeMargin > 0)) errors.push("invalid_knife_edge_margin");
  if (!(Number.isInteger(c.minRetentionEligibleScenarios) && c.minRetentionEligibleScenarios > 0)) errors.push("invalid_min_retention_eligible_scenarios");
  if (!(Number.isInteger(c.minHistorySnapshots) && c.minHistorySnapshots > 0)) errors.push("non_positive_min_history_snapshots");
  if (!(typeof c.minHistorySpanHours === "number" && c.minHistorySpanHours > 0)) errors.push("non_positive_min_history_span");
  if (!(Number.isInteger(c.minConsecutiveRefreshSuccesses) && c.minConsecutiveRefreshSuccesses > 0)) errors.push("non_positive_min_consecutive_refreshes");
  if (!(typeof c.maxRefreshIntervalHours === "number" && c.maxRefreshIntervalHours > 0)) errors.push("non_positive_max_refresh_interval");
  return { valid: errors.length === 0, errors };
}

/** Validate that a scenario class is supported (used by scenario validation). */
export function isSupportedSensitivityScenarioClass(scenarioClass: string): boolean {
  return SUPPORTED_SCENARIO_CLASSES.includes(scenarioClass as SolStakingSensitivityScenarioClass);
}

/* ------------------------------------------------------------------ *
 * Safe policy-override builder — never mutates the Step 14W base policy.
 * ------------------------------------------------------------------ */
export interface SelectorPolicyOverrides {
  reviewedRiskWeight?: number;
  apy30dWeight?: number;
  currentApyWeight?: number;
  apyStabilityWeight?: number;
  apyMinimumRangePctPoints?: number;
  stabilityMinimumRangePctPoints?: number;
}

export interface PolicyOverrideResult {
  policy?: SolStakingSelectorPolicy;
  valid: boolean;
  errors: string[];
}

/**
 * Build a NEW selector policy with weight/range overrides applied over a base policy (default:
 * the Step 14W base). Never mutates the base. Validates the result (weights must total 1.00).
 */
export function buildSolStakingSelectorPolicyWithOverrides(
  overrides: SelectorPolicyOverrides,
  basePolicy: SolStakingSelectorPolicy = SOL_STAKING_SELECTOR_POLICY,
): PolicyOverrideResult {
  const w = basePolicy.weights;
  const candidate: SolStakingSelectorPolicy = {
    policyId: basePolicy.policyId,
    policyVersion: basePolicy.policyVersion,
    weights: {
      reviewed_risk_score: overrides.reviewedRiskWeight ?? w.reviewed_risk_score,
      apy_30d: overrides.apy30dWeight ?? w.apy_30d,
      current_apy: overrides.currentApyWeight ?? w.current_apy,
      apy_stability: overrides.apyStabilityWeight ?? w.apy_stability,
    },
    minApyRangePctPoints: overrides.apyMinimumRangePctPoints ?? basePolicy.minApyRangePctPoints,
    minStabilityRangePctPoints: overrides.stabilityMinimumRangePctPoints ?? basePolicy.minStabilityRangePctPoints,
    scorePrecision: basePolicy.scorePrecision,
    tieEpsilon: basePolicy.tieEpsilon,
  };
  const v = validateSolStakingSelectorPolicy(candidate);
  if (!v.valid) return { valid: false, errors: v.errors };
  return { policy: candidate, valid: true, errors: [] };
}

/* ------------------------------------------------------------------ *
 * Deterministic scenario catalog.
 * ------------------------------------------------------------------ */
/** The default, deterministic sensitivity scenario catalog. Never invented from results. */
export function listDefaultSolStakingSensitivityScenarios(): SolStakingSensitivityScenario[] {
  const policyScenario = (id: string, name: string, risk: number, a30: number, cur: number, stab: number, desc: string): SolStakingSensitivityScenario => ({
    scenarioId: id,
    scenarioName: name,
    scenarioClass: "policy_weights",
    description: desc,
    syntheticScenario: true,
    includedInLeaderRetentionRate: true,
    policyOverrides: { reviewedRiskWeight: risk, apy30dWeight: a30, currentApyWeight: cur, apyStabilityWeight: stab },
    notes: ["SYNTHETIC policy-weight stress test — NOT observed market history."],
  });

  return [
    // 1. Baseline.
    { scenarioId: "baseline", scenarioName: "Baseline", scenarioClass: "baseline", description: "Unchanged Step 14W policy and market values.", syntheticScenario: false, includedInLeaderRetentionRate: true, notes: ["Real baseline comparison — no overrides."] },

    // 2–6. Policy weights.
    policyScenario("risk_heavier", "Risk heavier", 0.6, 0.25, 0.05, 0.1, "Reviewed risk weighted more heavily."),
    policyScenario("risk_strict", "Risk strict", 0.7, 0.2, 0.05, 0.05, "Reviewed risk dominant."),
    policyScenario("yield_balanced", "Yield balanced", 0.4, 0.35, 0.15, 0.1, "More weight to yield."),
    policyScenario("durable_yield", "Durable yield", 0.5, 0.4, 0.0, 0.1, "Only 30-day APY among yield signals."),
    policyScenario("low_current_signal", "Low current signal", 0.5, 0.35, 0.05, 0.1, "Down-weight current APY."),

    // 7–8. Normalization ranges.
    { scenarioId: "narrower_normalization_ranges", scenarioName: "Narrower normalization ranges", scenarioClass: "normalization_ranges", description: "Smaller minimum cohort ranges.", syntheticScenario: true, includedInLeaderRetentionRate: true, policyOverrides: { apyMinimumRangePctPoints: 0.15, stabilityMinimumRangePctPoints: 0.05 }, notes: ["SYNTHETIC normalization-range stress test."] },
    { scenarioId: "wider_normalization_ranges", scenarioName: "Wider normalization ranges", scenarioClass: "normalization_ranges", description: "Larger minimum cohort ranges.", syntheticScenario: true, includedInLeaderRetentionRate: true, policyOverrides: { apyMinimumRangePctPoints: 0.5, stabilityMinimumRangePctPoints: 0.2 }, notes: ["SYNTHETIC normalization-range stress test."] },

    // 9–14. Market perturbations.
    { scenarioId: "baseline_leader_current_mean_reversion", scenarioName: "Baseline leader current mean reversion", scenarioClass: "market_perturbation", description: "Baseline leader current APY becomes its 30-day APY.", syntheticScenario: true, includedInLeaderRetentionRate: true, marketOverrides: { [SENSITIVITY_TARGET_BASELINE_LEADER]: { replaceCurrentApyWith30d: true } }, notes: ["SYNTHETIC market stress test — NOT observed market history."] },
    { scenarioId: "all_candidates_current_mean_reversion", scenarioName: "All candidates current mean reversion", scenarioClass: "market_perturbation", description: "Every current APY becomes its own 30-day APY.", syntheticScenario: true, includedInLeaderRetentionRate: true, marketOverrides: { [SENSITIVITY_TARGET_ALL]: { replaceCurrentApyWith30d: true } }, notes: ["SYNTHETIC market stress test — NOT observed market history."] },
    { scenarioId: "baseline_leader_yield_down_0_25", scenarioName: "Baseline leader yield down 0.25", scenarioClass: "market_perturbation", description: "Baseline leader current + 30-day APY −0.25 pct pts (floored at 0).", syntheticScenario: true, includedInLeaderRetentionRate: true, marketOverrides: { [SENSITIVITY_TARGET_BASELINE_LEADER]: { currentApyDeltaPctPoints: -0.25, apy30dDeltaPctPoints: -0.25 } }, notes: ["SYNTHETIC market stress test."] },
    { scenarioId: "runner_up_yield_up_0_25", scenarioName: "Runner-up yield up 0.25", scenarioClass: "market_perturbation", description: "Baseline runner-up current + 30-day APY +0.25 pct pts.", syntheticScenario: true, includedInLeaderRetentionRate: true, marketOverrides: { [SENSITIVITY_TARGET_BASELINE_RUNNER_UP]: { currentApyDeltaPctPoints: 0.25, apy30dDeltaPctPoints: 0.25 } }, notes: ["SYNTHETIC market stress test."] },
    { scenarioId: "baseline_leader_down_runner_up_up", scenarioName: "Leader down, runner-up up", scenarioClass: "market_perturbation", description: "Leader −0.15, runner-up +0.15 on current + 30-day APY.", syntheticScenario: true, includedInLeaderRetentionRate: true, marketOverrides: { [SENSITIVITY_TARGET_BASELINE_LEADER]: { currentApyDeltaPctPoints: -0.15, apy30dDeltaPctPoints: -0.15 }, [SENSITIVITY_TARGET_BASELINE_RUNNER_UP]: { currentApyDeltaPctPoints: 0.15, apy30dDeltaPctPoints: 0.15 } }, notes: ["SYNTHETIC market stress test."] },
    { scenarioId: "all_current_apy_minus_0_20", scenarioName: "All current APY −0.20", scenarioClass: "market_perturbation", description: "Every current APY −0.20 pct pts (floored at 0).", syntheticScenario: true, includedInLeaderRetentionRate: true, marketOverrides: { [SENSITIVITY_TARGET_ALL]: { currentApyDeltaPctPoints: -0.2 } }, notes: ["SYNTHETIC market stress test."] },

    // 15–18. Data availability (fail-closed; excluded from retention rate).
    { scenarioId: "baseline_leader_stale", scenarioName: "Baseline leader stale", scenarioClass: "data_availability", description: "Baseline leader excluded as stale.", syntheticScenario: true, includedInLeaderRetentionRate: false, marketOverrides: { [SENSITIVITY_TARGET_BASELINE_LEADER]: { markCandidateStale: true } }, notes: ["SYNTHETIC availability test — deliberately changes the cohort."] },
    { scenarioId: "runner_up_stale", scenarioName: "Runner-up stale", scenarioClass: "data_availability", description: "Baseline runner-up excluded as stale.", syntheticScenario: true, includedInLeaderRetentionRate: false, marketOverrides: { [SENSITIVITY_TARGET_BASELINE_RUNNER_UP]: { markCandidateStale: true } }, notes: ["SYNTHETIC availability test."] },
    { scenarioId: "highest_risk_candidate_stale", scenarioName: "Highest-risk candidate stale", scenarioClass: "data_availability", description: "Selector-ready candidate with highest reviewed risk excluded as stale.", syntheticScenario: true, includedInLeaderRetentionRate: false, marketOverrides: { [SENSITIVITY_TARGET_HIGHEST_RISK]: { markCandidateStale: true } }, notes: ["SYNTHETIC availability test."] },
    { scenarioId: "native_candidate_stale", scenarioName: "Native candidate stale", scenarioClass: "data_availability", description: "Jupiter Native Stake excluded as stale.", syntheticScenario: true, includedInLeaderRetentionRate: false, marketOverrides: { jupiter_native_stake: { markCandidateStale: true } }, notes: ["SYNTHETIC availability test."] },
  ];
}
