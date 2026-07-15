/**
 * yieldStrategyComparisonTypes — Step 16E. The versioned type contract for the deterministic Stable
 * Yield COMPARISON engine. It answers one question per lane: "among the strategies already eligible for
 * this exact lane (16D), which currently leads WealthSmith's deterministic comparison?".
 *
 * It NEVER answers how much USDC the user has, how much to deposit, whether to move a position, whether
 * to switch products, whether to suggest, or whether to move funds. It is exact-product based,
 * deterministic, versioned, lane-specific, wallet-independent, amount-independent, suggestion-free,
 * UI-free, and execution-free. Buffer and Excess are compared SEPARATELY — a buffer candidate is never
 * ranked against an excess-only candidate. A zero-eligible production set is valid (empty comparison).
 *
 * SCALE / TIE / SENSITIVITY vs the SOL staking selector: the SOL selector scores on a 0–10 cohort scale
 * with a numeric tie epsilon (1e-6) and a retention-rate sensitivity framework. Stable Yield uses an
 * explicit 0–100 additive weighted score, a human-meaningful 1.00-point MATERIAL-tie band, and a strict
 * ±10% single-weight perturbation set (leader must hold in EVERY approved scenario). The difference is
 * deliberate and documented: Stable Yield deploys principal, so its leader must survive a stricter,
 * simpler, directly-interpretable stability test than the statistical SOL retention rule.
 */
import type { YieldStrategyEligibilityLane } from "./yieldStrategyEligibilityTypes";

export const YIELD_STRATEGY_COMPARISON_SCHEMA_VERSION = "1.0.0";
export const YIELD_STRATEGY_COMPARISON_POLICY_ID = "yield_strategy_comparison_v1";
export const YIELD_STRATEGY_COMPARISON_POLICY_VERSION = "1.0.0";
export const YIELD_STRATEGY_SCORING_POLICY_ID = "yield_strategy_scoring_v1";
export const YIELD_STRATEGY_SCORING_POLICY_VERSION = "1.0.0";
export const YIELD_STRATEGY_SENSITIVITY_POLICY_ID = "yield_strategy_sensitivity_v1";
export const YIELD_STRATEGY_SENSITIVITY_POLICY_VERSION = "1.0.0";

/** Reuse the 16D lane identifiers (no competing enum). Each comparison run evaluates exactly one lane. */
export type YieldStrategyComparisonLane = YieldStrategyEligibilityLane;

/** The six deterministic comparison dimensions. */
export type YieldStrategyComparisonDimensionKey = "risk_quality" | "withdrawal_liquidity" | "net_yield" | "market_depth" | "user_cost" | "data_quality";

export type YieldStrategyComparisonDimensionStatus = "scored" | "neutral" | "unavailable" | "invalid";

/** One scored dimension for one candidate. `weightedContribution = normalizedScore × weight / 100`. */
export interface YieldStrategyComparisonDimension {
  dimension: YieldStrategyComparisonDimensionKey;
  status: YieldStrategyComparisonDimensionStatus;
  rawValues: Record<string, string | number | boolean | null>;
  normalizedScore: number;
  weight: number;
  weightedContribution: number;
  warnings: string[];
  blockers: string[];
  explanationFacts: string[];
}

export type YieldStrategyComparisonCandidateStatus = "scored" | "excluded_not_eligible" | "blocked_missing_comparable_data" | "invalid";

/** The canonical net-APY basis used for the net_yield dimension. Gross is only converted deterministically. */
export type YieldStrategyApyBasis = "net" | "gross_converted" | "incomparable";

/** One exact product's per-lane scorecard. */
export interface YieldStrategyComparisonCandidate {
  schemaVersion: "1.0.0";
  policyId: string;
  policyVersion: "1.0.0";

  lane: YieldStrategyComparisonLane;
  strategyId: string;
  displayName: string;
  protocolId: string;
  protocolDisplayName: string;
  address?: string;
  strategyType: string;
  principalAsset: string;

  status: YieldStrategyComparisonCandidateStatus;

  dimensions: YieldStrategyComparisonDimension[];

  rawTotalScore: number;
  totalScore: number;
  scorePrecision: number;

  /** The canonical net-APY basis + preserved gross/conversion inputs (never hidden). */
  apyBasis: YieldStrategyApyBasis;
  canonicalNetApyPct?: number;
  reportedGrossApyPct?: number;
  incrementalUserCostBps?: number;

  eligibleForComparison: true;

  comparisonPerformed: true;
  rankAssigned: false;
  leaderSelected: false;

  walletPositionsEvaluated: false;
  userCapitalEvaluated: false;
  amountCalculated: false;
  planGenerated: false;
  suggestionGenerated: false;
  updatesProductOutput: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;

  warnings: string[];
  blockers: string[];
  notes: string[];
}

/** Deterministic material-tie analysis for one lane. */
export interface YieldStrategyTieAnalysis {
  topStrategyId?: string;
  secondStrategyId?: string;
  scoreDifference?: number;
  materialTie: boolean;
  tieThreshold: number;
  tiedStrategyIds: string[];
}

export type YieldStrategySensitivityStatus = "stable" | "unstable" | "not_applicable_single_candidate" | "not_applicable_empty_set" | "invalid";

/** One perturbation scenario's outcome (weights perturbed; raw values never touched). */
export interface YieldStrategySensitivityScenario {
  scenarioId: string;
  dimension: YieldStrategyComparisonDimensionKey;
  direction: "up" | "down";
  perturbationPct: number;
  scenarioLeaderStrategyId?: string;
  leaderRetained: boolean;
  materialTieEmerged: boolean;
}

export interface YieldStrategySensitivityAnalysis {
  policyId: string;
  policyVersion: string;
  status: YieldStrategySensitivityStatus;
  baselineLeaderStrategyId?: string;
  perturbationPct: number;
  scenariosEvaluated: number;
  scenariosLeaderRetained: number;
  scenarios: YieldStrategySensitivityScenario[];
  notes: string[];
}

export type YieldStrategyLaneComparisonStatus =
  | "complete"
  | "empty_eligible_set"
  | "single_eligible_candidate"
  | "leader_withheld_tie"
  | "leader_withheld_sensitivity"
  | "leader_withheld_incomparable_data"
  | "invalid";

export type YieldStrategyLeaderSelectionReason =
  | "highest_stable_score"
  | "only_eligible_candidate"
  | "none_empty_set"
  | "none_material_tie"
  | "none_sensitivity_failed"
  | "none_incomparable_data"
  | "none_invalid";

/** One lane's full comparison result. */
export interface YieldStrategyLaneComparison {
  schemaVersion: "1.0.0";
  policyId: string;
  policyVersion: "1.0.0";

  lane: YieldStrategyComparisonLane;
  status: YieldStrategyLaneComparisonStatus;
  checkedAt: string;

  candidateScorecards: YieldStrategyComparisonCandidate[];
  orderedStrategyIds: string[];

  comparisonLeaderStrategyId?: string;
  comparisonLeaderScore?: number;
  leaderSelectionReason: YieldStrategyLeaderSelectionReason;

  tieAnalysis: YieldStrategyTieAnalysis;
  sensitivityAnalysis: YieldStrategySensitivityAnalysis;

  walletPositionsEvaluated: false;
  userCapitalEvaluated: false;
  amountCalculated: false;
  planGenerated: false;
  suggestionGenerated: false;
  updatesProductOutput: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;

  warnings: string[];
  blockers: string[];
  notes: string[];
}

/** The whole comparison set across both lanes. */
export interface YieldStrategyComparisonSet {
  schemaVersion: "1.0.0";
  policyId: string;
  policyVersion: "1.0.0";

  checkedAt: string;

  bufferComparison: YieldStrategyLaneComparison;
  excessComparison: YieldStrategyLaneComparison;

  bufferComparisonLeaderStrategyId?: string;
  excessComparisonLeaderStrategyId?: string;

  emptyApprovedSet: boolean;
  emptyBufferEligibleSet: boolean;
  emptyExcessEligibleSet: boolean;

  comparisonPerformed: true;
  rankingPerformed: true;
  walletPositionsEvaluated: false;
  userCapitalEvaluated: false;
  amountCalculated: false;
  planGenerated: false;
  suggestionGenerated: false;
  updatesProductOutput: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;

  warnings: string[];
  blockers: string[];
  notes: string[];
}

export interface YieldStrategyComparisonValidationResult {
  valid: boolean;
  errors: string[];
}

export const YIELD_STRATEGY_COMPARISON_DIMENSIONS: readonly YieldStrategyComparisonDimensionKey[] = ["risk_quality", "withdrawal_liquidity", "net_yield", "market_depth", "user_cost", "data_quality"];
