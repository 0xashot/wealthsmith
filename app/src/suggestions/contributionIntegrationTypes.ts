/**
 * contributionIntegrationTypes — Step 15H. The product-integration contract that connects the
 * deterministic 15A–15G pipeline to the actual suggestion engine, Demo Mode, Real Wallet, the shared
 * card / review modal, and /testing. Engine = Brain, UI = Renderer, Smith AI = Voice: the engine
 * owns every value; the UI only maps a structured payload into approved templates and never
 * recalculates. Read-only, non-custodial — no execution/signatures.
 */
import type { ContributionPlan, ContributionPlanGenerationResult } from "./contributionPlanTypes";
import type { EngineSuggestion } from "./engineTypes";

export const CONTRIBUTION_PRODUCT_INTEGRATION_SCHEMA_VERSION = "1.0.0";
export const CONTRIBUTION_PRODUCT_INTEGRATION_POLICY_ID = "contribution_product_integration_v1";
export const CONTRIBUTION_PRODUCT_INTEGRATION_POLICY_VERSION = "1.0.0";

/** Data provenance. Normal production data is never called "testing". */
export type ContributionProductDataMode = "demo_fixture" | "real_wallet" | "testing_fixture";

export type ContributionPipelineStatus =
  | "ready"
  | "no_action_required"
  | "unavailable_profile"
  | "unavailable_portfolio"
  | "unavailable_price"
  | "unavailable_liquidity"
  | "blocked_frequency"
  | "blocked_policy"
  | "blocked_plan"
  | "invalid_input";

export type ContributionPipelineBlocker =
  | "profile_missing"
  | "profile_invalid"
  | "monthly_saving_goal_missing"
  | "contribution_frequency_missing"
  | "contribution_frequency_invalid"
  | "portfolio_snapshot_missing"
  | "portfolio_snapshot_invalid"
  | "portfolio_snapshot_stale"
  | "portfolio_total_unavailable"
  | "target_exposure_unavailable"
  | "duplicate_exposure_detected"
  | "price_quote_missing"
  | "price_quote_invalid"
  | "price_quote_stale"
  | "price_provenance_missing"
  | "liquidity_snapshot_missing"
  | "liquidity_snapshot_invalid"
  | "liquidity_snapshot_stale"
  | "liquidity_classification_unknown"
  | "safety_buffer_result_invalid"
  | "allocation_policy_invalid"
  | "allocation_gap_invalid"
  | "contribution_priority_invalid"
  | "funding_selection_invalid"
  | "contribution_plan_invalid"
  | "multiple_targets_blocked"
  | "existing_suggestion_conflict"
  | "real_wallet_fixture_fallback_forbidden";

export type ContributionPlanSuggestionPlanKind = "safety_buffer" | "stable_contribution" | "recurring_dca" | "staged_excess_usdc_dca";

/**
 * Structured payload attached to the engine suggestion. The presentation + review layers consume
 * THIS — React never reads the raw plan and never recreates a calculation.
 */
export interface ContributionPlanSuggestionData {
  planId: string;
  planKind: ContributionPlanSuggestionPlanKind;

  fundingSourceId: "upcoming_contribution" | "existing_excess_usdc";
  fundingTiming: "expected_future" | "available_now";

  targetId: string;
  targetAssetId: string;
  targetSymbol: string;

  sourceAssetId?: string;
  sourceAssetSymbol?: string;

  amountKind: "exact" | "range";

  exactAmountUsd?: number;
  minimumAmountUsd?: number;
  maximumAmountUsd?: number;

  contributionFrequencyId?: "weekly" | "biweekly" | "monthly" | "quarterly" | "occasional";
  contributionsPerYear?: number;
  amountVariesByOneCent?: boolean;

  trancheCount?: number;
  durationDays?: number;

  steps: Array<{ index: number; relativeDayOffset?: number; amountUsd?: number; minimumAmountUsd?: number; maximumAmountUsd?: number }>;

  currentTargetPct?: number;
  projectedTargetPct?: number;
  minimumProjectedTargetPct?: number;
  maximumProjectedTargetPct?: number;
  targetPct?: number;
  gapPercentagePoints?: number;

  requiredBufferUsd?: number;
  currentBufferUsd?: number;
  projectedBufferUsd?: number;
  minimumProjectedBufferUsd?: number;
  maximumProjectedBufferUsd?: number;
  currentBufferShortfallUsd?: number;
  projectedBufferShortfallUsd?: number;

  alternativeFundingSourceIds: Array<"upcoming_contribution" | "existing_excess_usdc">;

  unallocatedSourceCapacityUsd?: number;
  minimumUnallocatedSourceCapacityUsd?: number;
  maximumUnallocatedSourceCapacityUsd?: number;

  readOnly: true;
  fundsMoved: false;
  fundsReserved: false;
  executionAvailable: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;
}

/** The plan-backed engine suggestion: a normal EngineSuggestion carrying the structured payload. */
export interface ContributionPlanSuggestion extends EngineSuggestion {
  contributionPlan: ContributionPlanSuggestionData;
}

export interface ContributionPipelineResult {
  schemaVersion: "1.0.0";
  policyId: "contribution_product_integration_v1";
  policyVersion: "1.0.0";

  dataMode: ContributionProductDataMode;
  status: ContributionPipelineStatus;

  planResult?: ContributionPlanGenerationResult;
  plan?: ContributionPlan;

  suggestion?: ContributionPlanSuggestion;

  productSuggestionGenerated: boolean;
  existingSuggestionEnriched: boolean;

  realWalletDataUsed: boolean;
  demoFixtureDataUsed: boolean;
  testingFixtureDataUsed: boolean;

  fixtureFallbackUsed: false;

  productOutputUpdated: boolean;

  transactionsEnabled: false;
  walletSignatureRequired: false;

  blockers: ContributionPipelineBlocker[];
  warnings: string[];
  notes: string[];
}
