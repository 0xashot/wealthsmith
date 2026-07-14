/**
 * solStakingSelectorSensitivity — Step 14X. Deterministic sensitivity analysis over the Step
 * 14W comparison: runs policy-weight, normalization-range, market-perturbation, and
 * data-availability scenarios (plus real historical snapshots) through the EXISTING Step 14W
 * comparison engine, and aggregates leader-retention / margin / knife-edge / sensitivity
 * metrics. It is comparison-only: it never mutates the base policy, the normalized set, reviewed
 * risk, approval, the market cache, or evidence, and it activates nothing.
 */
import {
  buildSolStakingSelectorComparison,
} from "./solStakingSelectorComparison";
import { SOL_STAKING_SELECTOR_POLICY } from "./solStakingSelectorPolicy";
import { validateNormalizedSolStakingCandidateSet } from "./solStakingCandidateNormalization";
import type { NormalizedSolStakingCandidateSet } from "./solStakingCandidateNormalizationTypes";
import {
  SOL_STAKING_SELECTOR_SENSITIVITY_SCHEMA_VERSION,
  SOL_STAKING_SENSITIVITY_MIN_LEADER_RETENTION_RATE,
  SOL_STAKING_SENSITIVITY_MIN_BASELINE_MARGIN,
  SOL_STAKING_SENSITIVITY_KNIFE_EDGE_MARGIN,
  SOL_STAKING_SENSITIVITY_MAX_KNIFE_EDGE_RATE,
  SOL_STAKING_SENSITIVITY_MIN_RETENTION_ELIGIBLE_SCENARIOS,
  SOL_STAKING_ACTIVATION_MIN_HISTORY_SNAPSHOTS,
  SOL_STAKING_ACTIVATION_MIN_HISTORY_SPAN_HOURS,
  SENSITIVITY_TARGET_ALL,
  SENSITIVITY_TARGET_BASELINE_LEADER,
  SENSITIVITY_TARGET_BASELINE_RUNNER_UP,
  SENSITIVITY_TARGET_HIGHEST_RISK,
  buildSolStakingSelectorPolicyWithOverrides,
  isSupportedSensitivityScenarioClass,
  listDefaultSolStakingSensitivityScenarios,
} from "./solStakingSelectorSensitivityPolicy";
import type {
  SolStakingHistoricalSensitivityAnalysis,
  SolStakingHistoricalSensitivityInput,
  SolStakingSelectorSensitivityResult,
  SolStakingSensitivityScenario,
  SolStakingSensitivityScenarioResult,
} from "./solStakingSelectorSensitivityTypes";

export const SOL_STAKING_SELECTOR_SENSITIVITY_EXISTS = true;
export const SOL_STAKING_SELECTOR_SENSITIVITY_ACTIVATION_PERFORMED = false;
export const SOL_STAKING_SELECTOR_SENSITIVITY_UPDATES_PRODUCT_UI = false;
export const SOL_STAKING_SELECTOR_SENSITIVITY_ENABLES_TRANSACTIONS = false;

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;
const round4 = (n: number) => Math.round(n * 1e4) / 1e4;
const cloneSet = (set: NormalizedSolStakingCandidateSet): NormalizedSolStakingCandidateSet => JSON.parse(JSON.stringify(set));

/* ------------------------------------------------------------------ *
 * Market overrides (never mutate the source).
 * ------------------------------------------------------------------ */
export interface MarketOverrideResolvers {
  baselineLeaderId?: string;
  baselineRunnerUpId?: string;
  highestRiskId?: string;
}
export interface MarketOverrideResult {
  set: NormalizedSolStakingCandidateSet;
  appliedTo: string[];
  skipped: boolean;
  skipReason?: string;
}

/**
 * Apply a scenario's market overrides to a CLONED normalized set. Only current APY / 30-day
 * APY / readiness are altered; the transparent APY delta is recomputed; reviewed risk, approval,
 * adoption, fees, exit, token model, and evidence are untouched. APY is floored at 0. Modified
 * values are labeled synthetic in notes. Symbolic targets resolve from the baseline.
 */
export function applySolStakingSensitivityMarketOverrides(
  normalizedSet: NormalizedSolStakingCandidateSet,
  scenario: SolStakingSensitivityScenario,
  resolvers: MarketOverrideResolvers,
): MarketOverrideResult {
  const clone = cloneSet(normalizedSet);
  const appliedTo: string[] = [];
  if (!scenario.marketOverrides) return { set: clone, appliedTo, skipped: false };

  // Resolve symbolic keys → concrete candidate ids.
  const resolved: Record<string, NonNullable<SolStakingSensitivityScenario["marketOverrides"]>[string]> = {};
  for (const [key, ov] of Object.entries(scenario.marketOverrides)) {
    let ids: string[];
    if (key === SENSITIVITY_TARGET_ALL) ids = [...normalizedSet.selectorReadyCandidateIds];
    else if (key === SENSITIVITY_TARGET_BASELINE_LEADER) ids = resolvers.baselineLeaderId ? [resolvers.baselineLeaderId] : [];
    else if (key === SENSITIVITY_TARGET_BASELINE_RUNNER_UP) ids = resolvers.baselineRunnerUpId ? [resolvers.baselineRunnerUpId] : [];
    else if (key === SENSITIVITY_TARGET_HIGHEST_RISK) ids = resolvers.highestRiskId ? [resolvers.highestRiskId] : [];
    else ids = [key];
    if (ids.length === 0) return { set: clone, appliedTo, skipped: true, skipReason: `unresolved_target:${key}` };
    for (const id of ids) resolved[id] = ov;
  }

  for (const [id, ov] of Object.entries(resolved)) {
    const cand = clone.candidates[id];
    if (!cand) continue;
    if (ov.markCandidateStale || ov.markCandidatePartial || ov.excludeCandidate) {
      const reason = ov.markCandidateStale ? "stale_live_market_data" : ov.markCandidatePartial ? "incomplete_live_market_data" : "excluded_by_scenario";
      clone.selectorReadyCandidateIds = clone.selectorReadyCandidateIds.filter((x) => x !== id);
      if (!clone.excludedCandidateIds.includes(id)) clone.excludedCandidateIds.push(id);
      clone.exclusions[id] = [...(clone.exclusions[id] ?? []), reason];
      cand.readiness.eligibleForFutureSelectorInput = false;
      if (!cand.readiness.blockers.includes(reason)) cand.readiness.blockers.push(reason);
      cand.liveMarket.sourceSnapshotStatus = ov.markCandidateStale ? "stale" : ov.markCandidatePartial ? "partial" : cand.liveMarket.sourceSnapshotStatus;
      cand.readiness.warnings = [...cand.readiness.warnings, `SYNTHETIC_SENSITIVITY_INPUT: candidate marked ${reason} by scenario ${scenario.scenarioId}.`];
      appliedTo.push(id);
      continue;
    }
    const origCur = cand.yield.currentApyPct.value ?? 0;
    const origD30 = cand.yield.apy30dPct.value ?? 0;
    let cur = origCur;
    let d30 = origD30;
    if (ov.replaceCurrentApyWith30d) cur = origD30;
    if (ov.currentApyDeltaPctPoints != null) cur = Math.max(0, cur + ov.currentApyDeltaPctPoints);
    if (ov.apy30dDeltaPctPoints != null) d30 = Math.max(0, d30 + ov.apy30dDeltaPctPoints);
    cur = round6(cur);
    d30 = round6(d30);
    cand.yield.currentApyPct.value = cur;
    cand.yield.currentApyPct.status = "available";
    cand.yield.currentApyPct.notes = [...cand.yield.currentApyPct.notes, `SYNTHETIC_SENSITIVITY_INPUT: current APY baseline ${origCur} → ${cur} (scenario ${scenario.scenarioId}).`];
    cand.yield.apy30dPct.value = d30;
    cand.yield.apy30dPct.status = "available";
    cand.yield.apy30dPct.notes = [...cand.yield.apy30dPct.notes, `SYNTHETIC_SENSITIVITY_INPUT: 30-day APY baseline ${origD30} → ${d30} (scenario ${scenario.scenarioId}).`];
    const delta = round4(cur - d30);
    cand.yield.apyDeltaPctPoints.value = delta;
    cand.yield.apyDeltaPctPoints.status = "available";
    cand.yield.absoluteApyDeltaPctPoints.value = round4(Math.abs(cur - d30));
    cand.yield.absoluteApyDeltaPctPoints.status = "available";
    cand.yield.absoluteApyDeltaPctPoints.notes = [...cand.yield.absoluteApyDeltaPctPoints.notes, "SYNTHETIC_SENSITIVITY_INPUT: APY delta recalculated from perturbed APY."];
    appliedTo.push(id);
  }
  return { set: clone, appliedTo, skipped: false };
}

/* ------------------------------------------------------------------ *
 * Scenario runner.
 * ------------------------------------------------------------------ */
export interface RunSensitivityOptions {
  checkedAt: string;
  generatedAt?: string;
  scenarios?: SolStakingSensitivityScenario[];
}

function scenarioResultFrom(scenario: SolStakingSensitivityScenario, cmp: ReturnType<typeof buildSolStakingSelectorComparison>, baselineLeaderId?: string): SolStakingSensitivityScenarioResult {
  const status = cmp.status === "complete" || cmp.status === "insufficient_candidates" || cmp.status === "invalid_input" ? cmp.status : "insufficient_candidates";
  const candidateScores: Record<string, number> = {};
  for (const id of Object.keys(cmp.candidateResults)) candidateScores[id] = cmp.candidateResults[id].totalScore;
  const leaderId = cmp.comparisonLeaderCandidateId;
  const runnerUpId = cmp.rankedCandidateIds[1];
  const leaderScore = leaderId ? candidateScores[leaderId] : undefined;
  const runnerUpScore = runnerUpId ? candidateScores[runnerUpId] : undefined;
  const leaderMargin = leaderScore != null && runnerUpScore != null ? round6(leaderScore - runnerUpScore) : undefined;
  const baselineLeaderRank = baselineLeaderId ? cmp.candidateResults[baselineLeaderId]?.rank : undefined;
  return {
    scenarioId: scenario.scenarioId,
    scenarioName: scenario.scenarioName,
    scenarioClass: scenario.scenarioClass,
    syntheticScenario: scenario.syntheticScenario,
    status,
    eligibleCandidateIds: cmp.eligibleCandidateIds,
    excludedCandidateIds: cmp.excludedCandidateIds,
    rankedCandidateIds: cmp.rankedCandidateIds,
    ...(leaderId ? { comparisonLeaderCandidateId: leaderId } : {}),
    baselineLeaderRetained: baselineLeaderId != null && leaderId === baselineLeaderId,
    ...(baselineLeaderRank != null ? { baselineLeaderRank } : {}),
    ...(leaderScore != null ? { leaderScore } : {}),
    ...(runnerUpId ? { runnerUpCandidateId: runnerUpId } : {}),
    ...(runnerUpScore != null ? { runnerUpScore } : {}),
    ...(leaderMargin != null ? { leaderMargin } : {}),
    candidateScores,
    blockers: cmp.status !== "complete" ? [cmp.status] : [],
    notes: scenario.syntheticScenario ? ["Synthetic scenario — not observed market history."] : [],
  };
}

/**
 * Run the deterministic sensitivity analysis. Runs the unchanged baseline, resolves dynamic
 * targets from it, then runs every scenario through the Step 14W comparison engine (no scoring
 * logic duplicated), and aggregates retention / margin / knife-edge / sensitivity metrics.
 */
export function runSolStakingSelectorSensitivityAnalysis(
  normalizedSet: NormalizedSolStakingCandidateSet,
  options: RunSensitivityOptions,
): SolStakingSelectorSensitivityResult {
  const checkedAt = options.checkedAt;
  const generatedAt = options.generatedAt ?? checkedAt;
  const scenarios = options.scenarios ?? listDefaultSolStakingSensitivityScenarios();
  const base = SOL_STAKING_SELECTOR_POLICY;

  const setValid = validateNormalizedSolStakingCandidateSet(normalizedSet).valid;

  // Baseline.
  const baselineCmp = buildSolStakingSelectorComparison(normalizedSet, { checkedAt, policy: base });
  const baselineLeaderId = baselineCmp.comparisonLeaderCandidateId;
  const baselineRunnerUpId = baselineCmp.rankedCandidateIds[1];
  // Highest reviewed-risk selector-ready candidate (tie → earlier canonical order).
  let highestRiskId: string | undefined;
  {
    let best = -1;
    let bestIdx = Number.POSITIVE_INFINITY;
    for (const id of baselineCmp.eligibleCandidateIds) {
      const c = baselineCmp.candidateResults[id];
      const rv = c.dimensions.reviewedRiskScore.rawValue;
      if (rv > best || (rv === best && c.canonicalOrderIndex < bestIdx)) { best = rv; bestIdx = c.canonicalOrderIndex; highestRiskId = id; }
    }
  }
  const resolvers: MarketOverrideResolvers = { baselineLeaderId, baselineRunnerUpId, highestRiskId };

  const scenarioResults: SolStakingSensitivityScenarioResult[] = [];
  const scenarioById = new Map(scenarios.map((s) => [s.scenarioId, s]));

  for (const scenario of scenarios) {
    // Policy.
    let policy = base;
    if (scenario.policyOverrides) {
      const built = buildSolStakingSelectorPolicyWithOverrides(scenario.policyOverrides);
      if (!built.valid || !built.policy) {
        scenarioResults.push({ ...scenarioResultFrom(scenario, buildSolStakingSelectorComparison({ ...normalizedSet, schemaVersion: "bad" } as never, { checkedAt }), baselineLeaderId), status: "invalid_input", blockers: ["policy_invalid", ...built.errors] });
        continue;
      }
      policy = built.policy;
    }
    // Market.
    let scenarioSet = normalizedSet;
    if (scenario.marketOverrides) {
      const applied = applySolStakingSensitivityMarketOverrides(normalizedSet, scenario, resolvers);
      if (applied.skipped) {
        scenarioResults.push({ scenarioId: scenario.scenarioId, scenarioName: scenario.scenarioName, scenarioClass: scenario.scenarioClass, syntheticScenario: scenario.syntheticScenario, status: "skipped", eligibleCandidateIds: [], excludedCandidateIds: [], rankedCandidateIds: [], baselineLeaderRetained: false, candidateScores: {}, blockers: [applied.skipReason ?? "skipped"], notes: ["Scenario skipped — a dynamic target could not be resolved."] });
        continue;
      }
      scenarioSet = applied.set;
    }
    const cmp = buildSolStakingSelectorComparison(scenarioSet, { checkedAt, policy });
    scenarioResults.push(scenarioResultFrom(scenario, cmp, baselineLeaderId));
  }

  // Aggregation.
  const isIncluded = (r: SolStakingSensitivityScenarioResult) => scenarioById.get(r.scenarioId)?.includedInLeaderRetentionRate === true;
  const completed = scenarioResults.filter((r) => r.status === "complete");
  const completedScenarioCount = completed.length;
  const retentionEligible = completed.filter(isIncluded);
  const retentionEligibleScenarioCount = retentionEligible.length;
  const retainedEligible = retentionEligible.filter((r) => r.baselineLeaderRetained);
  const leaderRetentionRate = retentionEligibleScenarioCount > 0 ? round6(retainedEligible.length / retentionEligibleScenarioCount) : undefined;

  const ranksOfBaseline = retentionEligible.map((r) => r.baselineLeaderRank).filter((n): n is number => typeof n === "number");
  const baselineLeaderAverageRank = ranksOfBaseline.length > 0 ? round6(ranksOfBaseline.reduce((a, b) => a + b, 0) / ranksOfBaseline.length) : undefined;
  const baselineLeaderWorstRank = ranksOfBaseline.length > 0 ? Math.max(...ranksOfBaseline) : undefined;

  const margins = completed.map((r) => r.leaderMargin).filter((n): n is number => typeof n === "number");
  const minimumLeaderMargin = margins.length > 0 ? Math.min(...margins) : undefined;
  const medianLeaderMargin = margins.length > 0 ? (() => { const s = [...margins].sort((a, b) => a - b); const mid = Math.floor(s.length / 2); return s.length % 2 ? s[mid] : round6((s[mid - 1] + s[mid]) / 2); })() : undefined;
  const knifeEdgeScenarioCount = completed.filter((r) => typeof r.leaderMargin === "number" && r.leaderMargin < SOL_STAKING_SENSITIVITY_KNIFE_EDGE_MARGIN).length;
  const leaderSwitchScenarioCount = retentionEligible.filter((r) => !r.baselineLeaderRetained).length;

  const leaderFrequency: Record<string, number> = {};
  for (const r of completed) if (r.comparisonLeaderCandidateId) leaderFrequency[r.comparisonLeaderCandidateId] = (leaderFrequency[r.comparisonLeaderCandidateId] ?? 0) + 1;
  const uniqueLeaderCandidateIds = Object.keys(leaderFrequency);

  const byClass = (cls: string) => completed.filter((r) => r.scenarioClass === cls);
  const policyScenarios = byClass("policy_weights");
  const policyRetentionRate = policyScenarios.length > 0 ? policyScenarios.filter((r) => r.baselineLeaderRetained).length / policyScenarios.length : 1;
  const policySensitive = policyScenarios.some((r) => !r.baselineLeaderRetained) || policyRetentionRate < SOL_STAKING_SENSITIVITY_MIN_LEADER_RETENTION_RATE;
  const marketScenarios = byClass("market_perturbation");
  const marketSwitches = marketScenarios.filter((r) => !r.baselineLeaderRetained).length;
  const marketRetentionRate = marketScenarios.length > 0 ? marketScenarios.filter((r) => r.baselineLeaderRetained).length / marketScenarios.length : 1;
  const marketSensitive = marketSwitches >= 2 || marketRetentionRate < SOL_STAKING_SENSITIVITY_MIN_LEADER_RETENTION_RATE;
  const availabilityScenarios = scenarioResults.filter((r) => r.scenarioClass === "data_availability");
  const dataAvailabilitySensitive = availabilityScenarios.some((r) => r.status === "complete" && r.eligibleCandidateIds.length < 2) || availabilityScenarios.filter((r) => r.status !== "complete").length > 1;

  const baselineResult = scenarioResults.find((r) => r.scenarioId === "baseline");
  const baselineComplete = baselineResult?.status === "complete";
  const baselineMargin = baselineResult?.leaderMargin;
  const knifeEdgeRate = completedScenarioCount > 0 ? knifeEdgeScenarioCount / completedScenarioCount : 1;
  const noInvalidScenario = scenarioResults.every((r) => r.status !== "invalid_input");
  const leaderStable = Boolean(
    baselineComplete &&
    typeof baselineMargin === "number" && baselineMargin >= SOL_STAKING_SENSITIVITY_MIN_BASELINE_MARGIN &&
    typeof leaderRetentionRate === "number" && leaderRetentionRate >= SOL_STAKING_SENSITIVITY_MIN_LEADER_RETENTION_RATE &&
    knifeEdgeRate <= SOL_STAKING_SENSITIVITY_MAX_KNIFE_EDGE_RATE &&
    retentionEligibleScenarioCount >= SOL_STAKING_SENSITIVITY_MIN_RETENTION_ELIGIBLE_SCENARIOS &&
    noInvalidScenario,
  );

  const blockers: string[] = [];
  const warnings: string[] = [];
  if (!setValid) blockers.push("invalid_normalized_input");
  if (!baselineComplete) blockers.push("baseline_not_complete");
  if (!leaderStable) blockers.push("leader_unstable");
  if (policySensitive) blockers.push("policy_sensitive");
  if (marketSensitive) blockers.push("market_sensitive");
  if (dataAvailabilitySensitive) warnings.push("data_availability_sensitive");
  if (typeof baselineMargin === "number" && baselineMargin < SOL_STAKING_SENSITIVITY_MIN_BASELINE_MARGIN) warnings.push("baseline_margin_below_threshold");
  if (knifeEdgeScenarioCount > 0) warnings.push(`knife_edge_scenarios:${knifeEdgeScenarioCount}`);

  return {
    schemaVersion: SOL_STAKING_SELECTOR_SENSITIVITY_SCHEMA_VERSION,
    generatedAt,
    checkedAt,
    sourceSelectorPolicyId: base.policyId,
    sourceSelectorPolicyVersion: base.policyVersion,
    ...(baselineLeaderId ? { baselineLeaderCandidateId: baselineLeaderId } : {}),
    scenarios: scenarioResults,
    completedScenarioCount,
    retentionEligibleScenarioCount,
    ...(leaderRetentionRate != null ? { leaderRetentionRate } : {}),
    ...(baselineLeaderAverageRank != null ? { baselineLeaderAverageRank } : {}),
    ...(baselineLeaderWorstRank != null ? { baselineLeaderWorstRank } : {}),
    ...(minimumLeaderMargin != null ? { minimumLeaderMargin } : {}),
    ...(medianLeaderMargin != null ? { medianLeaderMargin } : {}),
    knifeEdgeScenarioCount,
    leaderSwitchScenarioCount,
    uniqueLeaderCandidateIds,
    leaderFrequency,
    policySensitive,
    marketSensitive,
    dataAvailabilitySensitive,
    leaderStable,
    scoreCalculated: true,
    activationPerformed: false,
    selectedProtocolIdChanged: false,
    updatesLiveRecommendations: false,
    transactionsEnabled: false,
    walletSignatureRequired: false,
    blockers,
    warnings,
    notes: ["Sensitivity analysis only. Synthetic scenarios are stress tests, not market history. Nothing is activated."],
  };
}

/* ------------------------------------------------------------------ *
 * Historical snapshot analysis.
 * ------------------------------------------------------------------ */
export interface AnalyzeHistoryOptions {
  checkedAt: string;
  baselineLeaderId?: string;
}

/**
 * Analyze REAL supplied historical snapshots (never synthesized). Rejects duplicate IDs and
 * malformed timestamps, sorts by cacheGeneratedAt, runs each through the Step 14W comparison,
 * and reports coverage/span/leader-retention. Empty history → coverage insufficient.
 */
export function analyzeSolStakingSelectorHistory(
  inputs: SolStakingHistoricalSensitivityInput[],
  options: AnalyzeHistoryOptions,
): SolStakingHistoricalSensitivityAnalysis {
  const blockers: string[] = [];
  const notes: string[] = [];
  if (!Array.isArray(inputs) || inputs.length === 0) {
    return { validSnapshotCount: 0, invalidSnapshotCount: 0, historySpanHours: 0, leaderPerSnapshot: {}, leaderFrequency: {}, sameLeaderAsBaselineCount: 0, scoreMargins: [], sourceErrorSnapshotCount: 0, staleSnapshotCount: 0, historyRequirementsPass: false, blockers: ["historical_coverage_insufficient"], notes: ["No historical snapshots supplied — history not fabricated."] };
  }

  const seen = new Set<string>();
  const usable: SolStakingHistoricalSensitivityInput[] = [];
  let invalidSnapshotCount = 0;
  for (const snap of inputs) {
    if (!snap || typeof snap.snapshotId !== "string") { invalidSnapshotCount++; continue; }
    if (seen.has(snap.snapshotId)) { blockers.push(`duplicate_snapshot_id:${snap.snapshotId}`); invalidSnapshotCount++; continue; }
    if (Number.isNaN(Date.parse(snap.cacheGeneratedAt)) || Number.isNaN(Date.parse(snap.checkedAt))) { blockers.push(`malformed_timestamp:${snap.snapshotId}`); invalidSnapshotCount++; continue; }
    seen.add(snap.snapshotId);
    usable.push(snap);
  }
  usable.sort((a, b) => Date.parse(a.cacheGeneratedAt) - Date.parse(b.cacheGeneratedAt));

  const leaderPerSnapshot: Record<string, string | undefined> = {};
  const leaderFrequency: Record<string, number> = {};
  const scoreMargins: number[] = [];
  let validSnapshotCount = 0;
  let sameLeaderAsBaselineCount = 0;
  let sourceErrorSnapshotCount = 0;
  let staleSnapshotCount = 0;

  for (const snap of usable) {
    const statuses = Object.values(snap.normalizedSet.candidates ?? {}).map((c) => c.liveMarket?.sourceSnapshotStatus);
    if (statuses.includes("source_error")) sourceErrorSnapshotCount++;
    if (statuses.includes("stale")) staleSnapshotCount++;
    const cmp = buildSolStakingSelectorComparison(snap.normalizedSet, { checkedAt: snap.checkedAt, policy: SOL_STAKING_SELECTOR_POLICY });
    if (cmp.status === "complete" && cmp.comparisonLeaderCandidateId) {
      validSnapshotCount++;
      const leader = cmp.comparisonLeaderCandidateId;
      leaderPerSnapshot[snap.snapshotId] = leader;
      leaderFrequency[leader] = (leaderFrequency[leader] ?? 0) + 1;
      if (options.baselineLeaderId && leader === options.baselineLeaderId) sameLeaderAsBaselineCount++;
      const runnerUp = cmp.rankedCandidateIds[1];
      if (runnerUp) scoreMargins.push(round6(cmp.candidateResults[leader].totalScore - cmp.candidateResults[runnerUp].totalScore));
    } else {
      invalidSnapshotCount++;
      leaderPerSnapshot[snap.snapshotId] = undefined;
    }
  }

  const first = usable[0]?.cacheGeneratedAt;
  const last = usable[usable.length - 1]?.cacheGeneratedAt;
  const historySpanHours = first && last ? round6((Date.parse(last) - Date.parse(first)) / 3_600_000) : 0;
  const historicalLeaderRetentionRate = validSnapshotCount > 0 ? round6(sameLeaderAsBaselineCount / validSnapshotCount) : undefined;
  const historyRequirementsPass = validSnapshotCount >= SOL_STAKING_ACTIVATION_MIN_HISTORY_SNAPSHOTS && historySpanHours >= SOL_STAKING_ACTIVATION_MIN_HISTORY_SPAN_HOURS;
  if (!historyRequirementsPass) blockers.push("historical_coverage_insufficient");
  notes.push(`Analyzed ${usable.length} supplied snapshots (${validSnapshotCount} usable) spanning ${historySpanHours}h. Real snapshots only; none fabricated.`);

  return {
    validSnapshotCount,
    invalidSnapshotCount,
    ...(first ? { firstSnapshotAt: first } : {}),
    ...(last ? { lastSnapshotAt: last } : {}),
    historySpanHours,
    leaderPerSnapshot,
    leaderFrequency,
    sameLeaderAsBaselineCount,
    ...(historicalLeaderRetentionRate != null ? { historicalLeaderRetentionRate } : {}),
    scoreMargins,
    sourceErrorSnapshotCount,
    staleSnapshotCount,
    historyRequirementsPass,
    blockers,
    notes,
  };
}

/* ------------------------------------------------------------------ *
 * Validation.
 * ------------------------------------------------------------------ */
export interface SensitivityValidationResult {
  valid: boolean;
  errors: string[];
}

/** Validate one scenario definition. */
export function validateSolStakingSensitivityScenario(scenario: unknown): SensitivityValidationResult {
  const errors: string[] = [];
  if (!scenario || typeof scenario !== "object") return { valid: false, errors: ["scenario_not_an_object"] };
  const s = scenario as SolStakingSensitivityScenario;
  if (!s.scenarioId) errors.push("missing_scenario_id");
  if (!isSupportedSensitivityScenarioClass(s.scenarioClass)) errors.push("unsupported_scenario_class");
  if (typeof s.syntheticScenario !== "boolean") errors.push("missing_synthetic_flag");
  if (s.policyOverrides) {
    const built = buildSolStakingSelectorPolicyWithOverrides(s.policyOverrides);
    if (!built.valid) errors.push(`invalid_policy_overrides:${built.errors.join("/")}`);
  }
  return { valid: errors.length === 0, errors };
}

/** Validate the sensitivity result — recompute key aggregates and confirm activation flags false. */
export function validateSolStakingSensitivityResult(result: unknown): SensitivityValidationResult {
  const errors: string[] = [];
  if (!result || typeof result !== "object") return { valid: false, errors: ["result_not_an_object"] };
  const r = result as SolStakingSelectorSensitivityResult;
  if (r.activationPerformed !== false || r.selectedProtocolIdChanged !== false || r.transactionsEnabled !== false || r.walletSignatureRequired !== false || r.updatesLiveRecommendations !== false) errors.push("activation_flag_enabled");
  const ids = r.scenarios.map((s) => s.scenarioId);
  if (new Set(ids).size !== ids.length) errors.push("duplicate_scenario_ids");
  const completed = r.scenarios.filter((s) => s.status === "complete");
  if (r.completedScenarioCount !== completed.length) errors.push("completed_count_mismatch");
  const freqTotal = Object.values(r.leaderFrequency).reduce((a, b) => a + b, 0);
  if (freqTotal !== completed.filter((s) => s.comparisonLeaderCandidateId).length) errors.push("leader_frequency_total_mismatch");
  const knife = completed.filter((s) => typeof s.leaderMargin === "number" && s.leaderMargin < SOL_STAKING_SENSITIVITY_KNIFE_EDGE_MARGIN).length;
  if (r.knifeEdgeScenarioCount !== knife) errors.push("knife_edge_count_mismatch");
  // synthetic scenarios must be labeled synthetic.
  for (const s of r.scenarios) if (s.scenarioClass !== "baseline" && s.scenarioClass !== "historical_snapshot" && s.syntheticScenario !== true) errors.push(`synthetic_not_labeled:${s.scenarioId}`);
  return { valid: errors.length === 0, errors };
}

/** Validate the historical analysis. */
export function validateSolStakingHistoricalSensitivityAnalysis(analysis: unknown): SensitivityValidationResult {
  const errors: string[] = [];
  if (!analysis || typeof analysis !== "object") return { valid: false, errors: ["analysis_not_an_object"] };
  const a = analysis as SolStakingHistoricalSensitivityAnalysis;
  if (!(Number.isInteger(a.validSnapshotCount) && a.validSnapshotCount >= 0)) errors.push("invalid_valid_count");
  if (a.historySpanHours < 0) errors.push("negative_span");
  const freqTotal = Object.values(a.leaderFrequency).reduce((x, y) => x + y, 0);
  if (freqTotal > a.validSnapshotCount) errors.push("leader_frequency_exceeds_valid");
  const pass = a.validSnapshotCount >= SOL_STAKING_ACTIVATION_MIN_HISTORY_SNAPSHOTS && a.historySpanHours >= SOL_STAKING_ACTIVATION_MIN_HISTORY_SPAN_HOURS;
  if (a.historyRequirementsPass !== pass) errors.push("history_requirements_mismatch");
  return { valid: errors.length === 0, errors };
}

/* ------------------------------------------------------------------ *
 * Diagnostics.
 * ------------------------------------------------------------------ */
export function listSolStakingSensitivityScenarioResults(result: SolStakingSelectorSensitivityResult): SolStakingSensitivityScenarioResult[] {
  return result.scenarios;
}

export function explainSolStakingSensitivityScenario(result: SolStakingSelectorSensitivityResult, scenarioId: string): SolStakingSensitivityScenarioResult | undefined {
  return result.scenarios.find((s) => s.scenarioId === scenarioId);
}

export interface SensitivityDiagnostics {
  scenarioId: string;
  scenarioClass: string;
  synthetic: boolean;
  status: string;
  leader?: string;
  runnerUp?: string;
  leaderMargin?: number;
  baselineLeaderRetained: boolean;
  eligibleCount: number;
  blockers: string[];
}

export function getSolStakingSensitivityDiagnostics(result: SolStakingSelectorSensitivityResult): SensitivityDiagnostics[] {
  return result.scenarios.map((s) => ({
    scenarioId: s.scenarioId,
    scenarioClass: s.scenarioClass,
    synthetic: s.syntheticScenario,
    status: s.status,
    ...(s.comparisonLeaderCandidateId ? { leader: s.comparisonLeaderCandidateId } : {}),
    ...(s.runnerUpCandidateId ? { runnerUp: s.runnerUpCandidateId } : {}),
    ...(s.leaderMargin != null ? { leaderMargin: s.leaderMargin } : {}),
    baselineLeaderRetained: s.baselineLeaderRetained,
    eligibleCount: s.eligibleCandidateIds.length,
    blockers: s.blockers,
  }));
}
