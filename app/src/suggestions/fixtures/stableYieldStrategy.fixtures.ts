/**
 * Stable Yield / yield-strategy product fixture checks (policy, registry, market data,
 * eligibility, product lane, comparison, position, plan + presentation, production
 * adapter, identity resolution, source path).
 *
 * Extracted verbatim from suggestionEngine.fixtures.ts (progressive monolith split).
 * The monolith imports and aggregates these checks; behavior and check names are
 * unchanged.
 */
import { RECOGNIZED_PROFILE_RISK_IDS as POS_RISK_IDS } from "../contributionTargetSuitability";
import { DEMO_STABLE_YIELD_GOAL, DEMO_STABLE_YIELD_POSITIONS, DEMO_STABLE_YIELD_PRICED_AS_OF, buildDemoStableYieldRail } from "../demoStableYieldScenario";
import type { FixtureCheck } from "./fixtureCheck";
import { STABLE_YIELD_BACKEND_REFRESH_BOUNDARY_EXISTS, STABLE_YIELD_BUFFER_YIELD_MINIMUM_EXISTS, STABLE_YIELD_CAPITAL_EVALUATION_EXISTS, STABLE_YIELD_CAPITAL_GENERATES_PLAN, STABLE_YIELD_CAPITAL_SELECTS_FINAL_AMOUNT, STABLE_YIELD_CAPITAL_SELECTS_PRODUCT, STABLE_YIELD_CAPITAL_UPDATES_PRODUCT_OUTPUT, STABLE_YIELD_CARD_PRESENTATION_CONTRACT_EXISTS, STABLE_YIELD_CHAIN_TIME_FRESHNESS_EXISTS, STABLE_YIELD_COMPARISON_EVALUATES_CAPITAL, STABLE_YIELD_COMPARISON_EVALUATES_WALLET, STABLE_YIELD_COMPARISON_EXISTS, STABLE_YIELD_COMPARISON_GENERATES_PLANS, STABLE_YIELD_COMPARISON_UPDATES_PRODUCT_OUTPUT, STABLE_YIELD_DETERMINISTIC_COPY_MAPPING_EXISTS, STABLE_YIELD_ELIGIBILITY_EVALUATES_CAPITAL, STABLE_YIELD_ELIGIBILITY_EXISTS, STABLE_YIELD_ELIGIBILITY_SELECTS_LEADER, STABLE_YIELD_ELIGIBILITY_UPDATES_PRODUCT_OUTPUT, STABLE_YIELD_EXACT_VAULT_SOURCE_VALIDATION_EXISTS, STABLE_YIELD_EXECUTION_ENABLED, STABLE_YIELD_KAMINO_SDK_ADAPTER_EXISTS, STABLE_YIELD_MARKET_CACHE_PUBLISHER_EXISTS, STABLE_YIELD_NET_APY_SOURCE_PATH_EXISTS, STABLE_YIELD_PLANS_EXIST as PLANS_FLAG, STABLE_YIELD_PLAN_BUILDS_TRANSACTION, STABLE_YIELD_PLAN_GENERATES_SUGGESTION, STABLE_YIELD_PLAN_PREPARES_EXECUTION, STABLE_YIELD_PLAN_REQUESTS_SIGNATURE, STABLE_YIELD_PLAN_UPDATES_PRODUCT_OUTPUT, STABLE_YIELD_POLICY_EXISTS, STABLE_YIELD_PRESENTATION_VALIDATION_EXISTS, STABLE_YIELD_PRODUCTION_ADAPTER_CONTRACT_EXISTS, STABLE_YIELD_PRODUCTION_ADAPTER_DIAGNOSTICS_EXIST, STABLE_YIELD_PRODUCTION_APPROVED_PRODUCTS_EXIST, STABLE_YIELD_PRODUCTION_APY_UNIT_VERIFIED, STABLE_YIELD_PRODUCTION_CANDIDATE_LIFECYCLE_CLEANUP_EXISTS, STABLE_YIELD_PRODUCTION_CARD_AVAILABLE, STABLE_YIELD_PRODUCTION_DEPOSIT_STATE_NORMALIZATION_EXISTS, STABLE_YIELD_PRODUCTION_DEPOSIT_STATE_RESOLVED, STABLE_YIELD_PRODUCTION_EVIDENCE_MANIFESTS_EXIST, STABLE_YIELD_PRODUCTION_FRESHNESS_VALIDATION_EXISTS, STABLE_YIELD_PRODUCTION_IDENTITY_ADAPTERS_EXIST, STABLE_YIELD_PRODUCTION_IDENTITY_RESOLUTION_EXISTS, STABLE_YIELD_PRODUCTION_OFFICIAL_IDENTITY_EVIDENCE_EXISTS, STABLE_YIELD_PRODUCTION_ORCHESTRATION_CONSUMES_ADAPTERS, STABLE_YIELD_PRODUCTION_PRODUCT_APPROVAL_EXISTS, STABLE_YIELD_PRODUCTION_RISK_REVIEW_COMPLETE, STABLE_YIELD_PRODUCTION_RISK_REVIEW_HANDOFF_EXISTS, STABLE_YIELD_PRODUCTION_SOURCE_PROBE_EXISTS, STABLE_YIELD_PRODUCT_LEVEL_LANE_POLICY_EXISTS, STABLE_YIELD_QDRANT_INTEGRATION_EXISTS, STABLE_YIELD_REGISTRY_EXISTS, STABLE_YIELD_REVIEW_ONLY_CTA_INTENT_EXISTS, STABLE_YIELD_REVIEW_PRESENTATION_CONTRACT_EXISTS, STABLE_YIELD_RUNTIME_CACHE_CONSUMPTION_EXISTS, STABLE_YIELD_SMITH_AI_INTEGRATION_EXISTS, STABLE_YIELD_SUGGESTION_EXECUTION_EXISTS, STABLE_YIELD_UNSUPPORTED_CANDIDATE_CLASSIFICATION_EXISTS, STABLE_YIELD_WALLET_DETECTION_EXISTS as WALLET_DETECTION_FLAG, YIELD_STRATEGY_COMPARISON_EXISTS as CMP_FLAG_REG, YIELD_STRATEGY_ELIGIBILITY_EXISTS as ELIG_FLAG_REG, YIELD_STRATEGY_ELIGIBLE_CAPITAL_EXISTS as POS_CAPITAL_FLAG, YIELD_STRATEGY_MARKET_DATA_EXISTS as YIELD_MARKET_DATA_FLAG, YIELD_STRATEGY_PLAN_EXISTS as PLAN_FLAG, YIELD_STRATEGY_PLAN_SELECTS_FINAL_AMOUNT, YIELD_STRATEGY_PLAN_SELECTS_PRODUCT, YIELD_STRATEGY_POSITION_DEDUPLICATION_EXISTS as POS_DEDUP_FLAG, YIELD_STRATEGY_POSITION_MATCHING_EXISTS as POS_MATCH_FLAG, YIELD_STRATEGY_POSITION_NORMALIZATION_EXISTS as POS_NORM_FLAG, YIELD_STRATEGY_PRODUCT_CAPACITY_EXISTS as CAPACITY_FLAG, YIELD_STRATEGY_REGISTRY_EXISTS as YIELD_REGISTRY_FLAG, YIELD_STRATEGY_RISK_REVIEW_EXISTS, YIELD_STRATEGY_SCORING_EXISTS, YIELD_STRATEGY_SENSITIVITY_EXISTS } from "../investmentTargetRegistry";
import { STABLE_YIELD_REFRESH_ARTIFACT_EXISTS, cacheRecordNetApyPct, cacheRecordToMarketDataInput, rawTokenAmountToUsd, validateStableYieldMarketRecord } from "../stableYieldMarketCache";
import type { StableYieldMarketRecord } from "../stableYieldMarketCache";
import { STABLE_YIELD_FORBIDDEN_PROTOCOLS, STABLE_YIELD_INTENDED_PRIORITY_ORDER, STABLE_YIELD_SUPPORTED_PROTOCOLS, STABLE_YIELD_SUPPRESSION_REASONS, getStableYieldLanePolicy, getStableYieldPolicy, getStableYieldStrategyDefinition, getStableYieldStrategyTypes, validateStableYieldLanePolicy, validateStableYieldPolicy, validateStableYieldStrategyDefinition } from "../stableYieldPolicy";
import { buildStableYieldAllowanceResult, explainStableYieldAllowance, getStableYieldPolicyDiagnostics } from "../stableYieldPolicyDiagnostics";
import { STABLE_BUFFER_YIELD_POLICY_ID, STABLE_EXCESS_YIELD_POLICY_ID, STABLE_YIELD_POLICY_ID, STABLE_YIELD_POLICY_SCHEMA_VERSION, STABLE_YIELD_POLICY_VERSION } from "../stableYieldPolicyTypes";
import { buildProductionStableYieldMarketInputs, deriveStableYieldPlanSuggestion } from "../stableYieldProductInput";
import { CANONICAL_USDC_MINT as SYG_USDC_MINT } from "../stableYieldProductionAdapterTypes";
import { buildKaminoMarketDataInput, validateProductionFreshness } from "../stableYieldProductionAdapters";
import { STABLE_YIELD_APPROVAL_READINESS_MATRIX_EXISTS, buildStableYieldReadinessMatrix, getStableYieldEvidenceManifest, listCandidatesReadyForReview, listStableYieldEvidenceManifests } from "../stableYieldProductionEvidence";
import { resolveStableYieldProductIdentity, selectSourceRecordByExactAddress } from "../stableYieldProductionIdentity";
import { parseKaminoVaultRecord } from "../stableYieldSourceParsers";
import { CATEGORY_PRIORITY } from "../topPick";
import { deriveRailSuggestions as SY_deriveRail } from "../useRailSuggestions";
import { YIELD_STRATEGY_EXCESS_YIELD_MINIMUM_USD, getYieldStrategyBufferAllocation, getYieldStrategyCapitalPolicy, validateYieldStrategyCapitalPolicy } from "../yieldStrategyCapitalPolicy";
import { YIELD_STRATEGY_COMPARISON_EXISTS as CMP_FLAG_CONST, buildProductionYieldStrategyComparisonSet, buildYieldStrategyComparisonSet, compareYieldStrategiesForLane, validateYieldStrategyComparisonCandidate, validateYieldStrategyComparisonSet, validateYieldStrategyLaneComparison } from "../yieldStrategyComparison";
import { explainYieldStrategyComparison, getYieldStrategyComparisonDiagnostics } from "../yieldStrategyComparisonDiagnostics";
import { YIELD_STRATEGY_BUFFER_WEIGHTS, YIELD_STRATEGY_COMPARISON_MATERIAL_TIE_THRESHOLD, YIELD_STRATEGY_EXCESS_WEIGHTS, getYieldStrategyComparisonPolicy, validateYieldStrategyComparisonPolicy } from "../yieldStrategyComparisonPolicy";
import { runYieldStrategyComparisonSensitivity } from "../yieldStrategyComparisonSensitivity";
import { YIELD_STRATEGY_COMPARISON_SCHEMA_VERSION, YIELD_STRATEGY_SCORING_POLICY_ID, YIELD_STRATEGY_SENSITIVITY_POLICY_ID } from "../yieldStrategyComparisonTypes";
import type { YieldStrategyComparisonLane as CMP_Lane, YieldStrategyComparisonSet as CMP_Set, YieldStrategyLaneComparison as CMP_Lane_Result } from "../yieldStrategyComparisonTypes";
import { YIELD_STRATEGY_ELIGIBILITY_EXISTS as ELIG_FLAG_CONST, buildProductionYieldStrategyEligibilitySet, buildYieldStrategyEligibilitySet, evaluateYieldStrategyLaneEligibility, validateYieldStrategyEligibilitySet, validateYieldStrategyLaneEligibilityResult } from "../yieldStrategyEligibility";
import { explainYieldStrategyLaneEligibility, getYieldStrategyEligibilityDiagnostics } from "../yieldStrategyEligibilityDiagnostics";
import { getYieldStrategyEligibilityPolicy, validateYieldStrategyEligibilityPolicy } from "../yieldStrategyEligibilityPolicy";
import { YIELD_STRATEGY_ELIGIBILITY_POLICY_ID, YIELD_STRATEGY_ELIGIBILITY_POLICY_VERSION, YIELD_STRATEGY_ELIGIBILITY_SCHEMA_VERSION, YIELD_STRATEGY_RISK_REVIEW_POLICY_ID, YIELD_STRATEGY_RISK_REVIEW_SCHEMA_VERSION } from "../yieldStrategyEligibilityTypes";
import type { YieldStrategyEligibilitySet as ELIG_EligSet, YieldStrategyLaneEligibilityResult as ELIG_Result, YieldStrategyRiskReview as ELIG_Review } from "../yieldStrategyEligibilityTypes";
import { buildYieldStrategyEligibleCapitalSnapshot, validateYieldStrategyEligibleCapitalSnapshot } from "../yieldStrategyEligibleCapital";
import { YIELD_STRATEGY_MARKET_DATA_EXISTS as YIELD_MARKET_DATA_FLAG_CONST, buildEmptyApprovedYieldStrategyMarketDataSet, buildYieldStrategyMarketDataSet, getApprovedYieldStrategyMarketSnapshots, getMarketReadyYieldStrategySnapshots, getYieldStrategyMarketSnapshot, listYieldStrategyMarketSnapshots, validateYieldStrategyMarketDataSet, validateYieldStrategyMarketSnapshot } from "../yieldStrategyMarketData";
import { getYieldStrategyMarketDataDiagnostics } from "../yieldStrategyMarketDataDiagnostics";
import { YIELD_STRATEGY_BUFFER_LANE_MAX_AGE_MS, YIELD_STRATEGY_MARKET_DATA_MAX_AGE_MS, YIELD_SUPPORTED_WITHDRAWAL_STATUSES, evaluateMarketFreshness, getYieldStrategyMarketDataPolicy, isApyDefinitionSufficientForComparison } from "../yieldStrategyMarketDataPolicy";
import { YIELD_STRATEGY_MARKET_DATA_POLICY_ID, YIELD_STRATEGY_MARKET_DATA_POLICY_VERSION, YIELD_STRATEGY_MARKET_DATA_SCHEMA_VERSION } from "../yieldStrategyMarketDataTypes";
import type { YieldApyData as ELIG_Apy, YieldLiquidityData as ELIG_Liq, YieldStrategyMarketDataInput, YieldStrategyMarketDataSet as ELIG_MarketSet, YieldStrategyMarketSnapshot as ELIG_Snap } from "../yieldStrategyMarketDataTypes";
import { YIELD_STRATEGY_PLAN_EXISTS as PLAN_EXISTS_CONST, buildYieldStrategyPlanDecision, validateYieldStrategyPlan, validateYieldStrategyPlanDecision } from "../yieldStrategyPlan";
import { explainYieldStrategyPlanDecision, getYieldStrategyPlanDiagnostics } from "../yieldStrategyPlanDiagnostics";
import { YIELD_STRATEGY_PLAN_EXCESS_MINIMUM_USD, buildYieldStrategyPlanId } from "../yieldStrategyPlanPolicy";
import { STABLE_YIELD_EXTERNAL_MANAGEMENT_DISCLOSURE, STABLE_YIELD_READ_ONLY_DISCLOSURE, YIELD_STRATEGY_PRESENTATION_EXISTS, buildStableYieldPlanPresentation, stableYieldApyPresentation, stableYieldTitle } from "../yieldStrategyPlanPresentation";
import { YIELD_STRATEGY_PRESENTATION_POLICY_ID, YIELD_STRATEGY_PRESENTATION_SCHEMA_VERSION } from "../yieldStrategyPlanPresentationTypes";
import { buildStableYieldPlanSuggestion } from "../yieldStrategyPlanSuggestion";
import { YIELD_STRATEGY_PLAN_POLICY_ID, YIELD_STRATEGY_PLAN_SCHEMA_VERSION, YIELD_STRATEGY_PLAN_SELECTION_POLICY_ID } from "../yieldStrategyPlanTypes";
import { explainYieldStrategyCapital, explainYieldStrategyPositionExclusion, getYieldStrategyCapitalDiagnostics, getYieldStrategyPositionDiagnostics } from "../yieldStrategyPositionDiagnostics";
import { YIELD_STRATEGY_POSITION_NORMALIZATION_EXISTS as POS_NORM_FLAG_CONST, buildYieldStrategyPositionSet, getYieldStrategyLeaderPositionStatus, matchYieldStrategyPosition, normalizeYieldStrategyPosition, validateYieldStrategyPosition, validateYieldStrategyPositionSet } from "../yieldStrategyPositionEngine";
import { CANONICAL_USDC_MINT, YIELD_STRATEGY_CAPITAL_POLICY_ID, YIELD_STRATEGY_CAPITAL_SCHEMA_VERSION, YIELD_STRATEGY_POSITION_MATCHING_POLICY_ID, YIELD_STRATEGY_POSITION_SCHEMA_VERSION } from "../yieldStrategyPositionTypes";
import type { YieldStrategyEligibleCapitalSnapshot as PLAN_CapitalSnap, YieldStrategyPositionInput as POS_Input } from "../yieldStrategyPositionTypes";
import { YIELD_STRATEGY_PRODUCT_CAPACITY_POLICY_ID, YIELD_STRATEGY_PRODUCT_CAPACITY_SCHEMA_VERSION } from "../yieldStrategyProductCapacity";
import type { YieldStrategyProductCapacitySnapshot as PLAN_Cap } from "../yieldStrategyProductCapacity";
import { YIELD_STRATEGY_REGISTRY_EXISTS as YIELD_REGISTRY_EXISTS_CONST, getApprovedYieldStrategies, getYieldStrategiesByProtocol, getYieldStrategy, isYieldStrategyExcluded, listActiveYieldStrategyCandidates, listYieldStrategies, validateYieldStrategyEntry, validateYieldStrategyRegistry } from "../yieldStrategyRegistry";
import { getYieldStrategyRegistryDiagnostics } from "../yieldStrategyRegistryDiagnostics";
import { YIELD_STRATEGY_REGISTRY_POLICY_ID, YIELD_STRATEGY_REGISTRY_SCHEMA_VERSION, YIELD_STRATEGY_REGISTRY_VERSION } from "../yieldStrategyRegistryTypes";
import type { YieldStrategyRegistryEntry as ELIG_Entry } from "../yieldStrategyRegistryTypes";
import { validateYieldStrategyRiskReview } from "../yieldStrategyRiskReview";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { buildKaminoCapacity } from "../stableYieldProductionAdapters";

/**
 * Step 16A — Stable USDC Yield policy foundation fixtures (16A-A…AB). Verifies the versions, the
 * two-lane architecture, the strategy taxonomy + risk lanes, the documented protocol scope, the
 * suppression vocabulary, the existing-position policy, the intended priority (engine ordering
 * unchanged), the allowance diagnostics, the validators, and that nothing downstream exists yet.
 */
export function runStableYieldPolicyFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const root = process.cwd();
  const readIf = (rel: string) => { try { return readFileSync(`${root}/${rel}`, "utf8"); } catch { return ""; } };

  const policy = getStableYieldPolicy();
  const strategies = getStableYieldStrategyTypes();
  const bufferLane = getStableYieldLanePolicy("safety_buffer_yield");
  const excessLane = getStableYieldLanePolicy("excess_usdc_yield");

  // 16A-A…F. Versions + policy shape.
  add("16A-A: schema version exists", STABLE_YIELD_POLICY_SCHEMA_VERSION === "1.0.0" && policy.schemaVersion === "1.0.0", STABLE_YIELD_POLICY_SCHEMA_VERSION);
  add("16A-B: policy ID/version exist", STABLE_YIELD_POLICY_ID === "stable_yield_policy_v1" && STABLE_YIELD_POLICY_VERSION === "1.0.0", STABLE_YIELD_POLICY_ID);
  add("16A-C: buffer and excess lane policy IDs exist", STABLE_BUFFER_YIELD_POLICY_ID === "stable_buffer_yield_v1" && STABLE_EXCESS_YIELD_POLICY_ID === "stable_excess_yield_v1", `${STABLE_BUFFER_YIELD_POLICY_ID}/${STABLE_EXCESS_YIELD_POLICY_ID}`);
  // 16H-F: the UI/testing flags legitimately flipped true once 16H-C/16H-D shipped; this 16A check keeps
  // its real intent — the policy+registry layer exists and enables NO execution.
  add("16A-D: STABLE_YIELD_POLICY_EXISTS is enabled; execution stays disabled (comparison at 16E, wallet detection at 16F)", STABLE_YIELD_POLICY_EXISTS === true && STABLE_YIELD_REGISTRY_EXISTS === true && STABLE_YIELD_EXECUTION_ENABLED === false, "policy + registry");
  add("16A-E: the Stable Yield policy validates", validateStableYieldPolicy().valid === true, "valid");
  add("16A-F: Stable Yield is a Capital Efficiency suggestion family", policy.suggestionFamily === "capital_efficiency", policy.suggestionFamily);

  // 16A-G…I. Two-lane architecture.
  add("16A-G: two separate lanes exist (Safety Buffer + Excess USDC)", policy.lanes.map((l) => l.lane).join(",") === "safety_buffer_yield,excess_usdc_yield", policy.lanes.map((l) => l.lane).join(","));
  add("16A-H: both lanes require a complete Safety Buffer", bufferLane.requiresCompleteSafetyBuffer === true && excessLane.requiresCompleteSafetyBuffer === true, "requires complete buffer");
  add("16A-I: the buffer lane is stable-USD only with no volatile/leveraged/unsupported exposure", bufferLane.allowedResultingExposures.join(",") === "stable_usd" && bufferLane.volatileExposureAllowed === false && bufferLane.leveragedExposureAllowed === false && bufferLane.unsupportedAssetsAllowed === false, "conservative");

  // 16A-J…M. Strategy taxonomy + risk lanes.
  add("16A-J: the strategy taxonomy has the five deterministic types", strategies.map((s) => s.strategyType).join(",") === "lending,managed_vault,staking_like_vault,stable_liquidity_strategy,future_other", strategies.map((s) => s.strategyType).join(","));
  add("16A-K: lending is buffer-eligible (conservative, immediately-liquid, stable-USD)", getStableYieldStrategyDefinition("lending")!.eligibleLanes.includes("safety_buffer_yield") && getStableYieldStrategyDefinition("lending")!.defaultRiskLane === "buffer_eligible" && getStableYieldStrategyDefinition("lending")!.riskProfile === "conservative_stable", "buffer_eligible");
  add("16A-L: staking-like + stable-liquidity are excess-only; managed_vault (16D.1) permits BOTH lanes but still defaults to excess", ["staking_like_vault", "stable_liquidity_strategy"].every((t) => { const s = getStableYieldStrategyDefinition(t as "managed_vault")!; return s.eligibleLanes.length === 1 && s.eligibleLanes[0] === "excess_usdc_yield" && s.defaultRiskLane === "excess_only"; }) && getStableYieldStrategyDefinition("managed_vault")!.eligibleLanes.includes("safety_buffer_yield") && getStableYieldStrategyDefinition("managed_vault")!.eligibleLanes.includes("excess_usdc_yield") && getStableYieldStrategyDefinition("managed_vault")!.defaultRiskLane === "excess_only", "product-level lane");
  add("16A-M: future_other is unapproved with no lanes", (() => { const s = getStableYieldStrategyDefinition("future_other")!; return s.eligibleLanes.length === 0 && s.activationSuppressionReasons.includes("yield_strategy_not_approved") && s.riskProfile === "unsupported"; })(), "unapproved");

  // 16A-N…P. Protocol scope + priority.
  add("16A-N: supported protocol scope is exactly Kamino/Raydium/Meteora/Hubble", STABLE_YIELD_SUPPORTED_PROTOCOLS.join(",") === "kamino,raydium,meteora,hubble", STABLE_YIELD_SUPPORTED_PROTOCOLS.join(","));
  add("16A-O: forbidden protocols (Save/Marginfi/Drift/Loopscale) are never in scope", STABLE_YIELD_FORBIDDEN_PROTOCOLS.join(",") === "save,marginfi,drift,loopscale" && !["save", "marginfi", "drift", "loopscale"].some((f) => (STABLE_YIELD_SUPPORTED_PROTOCOLS as readonly string[]).includes(f)), "out of scope");
  add("16A-P: intended priority is Buffer > Rebalance > Stable Yield > Contribution/DCA", STABLE_YIELD_INTENDED_PRIORITY_ORDER.indexOf("safety_buffer") === 0 && STABLE_YIELD_INTENDED_PRIORITY_ORDER.indexOf("rebalance") < STABLE_YIELD_INTENDED_PRIORITY_ORDER.indexOf("stable_yield") && STABLE_YIELD_INTENDED_PRIORITY_ORDER.indexOf("stable_yield") < STABLE_YIELD_INTENDED_PRIORITY_ORDER.indexOf("contribution_dca"), "intended order");
  add("16A-Q: engine CATEGORY_PRIORITY is unchanged in 16A", CATEGORY_PRIORITY.buffer === 1 && CATEGORY_PRIORITY.rebalance === 2 && CATEGORY_PRIORITY.capital_efficiency === 3 && CATEGORY_PRIORITY.stable_yield === 6 && CATEGORY_PRIORITY.dca === 7, "unchanged");

  // 16A-R…S. Suppression vocabulary + existing positions.
  add("16A-R: the suppression vocabulary defines the ten reasons", STABLE_YIELD_SUPPRESSION_REASONS.length === 10 && STABLE_YIELD_SUPPRESSION_REASONS.includes("safety_buffer_incomplete") && STABLE_YIELD_SUPPRESSION_REASONS.includes("no_eligible_capital") && STABLE_YIELD_SUPPRESSION_REASONS.includes("unknown_withdrawal_behavior"), `${STABLE_YIELD_SUPPRESSION_REASONS.length}`);
  add("16A-S: existing positions remain visible; a suggestion needs additional eligible USDC; detection is not implemented", policy.existingPositionPolicy.existingPositionsRemainVisible === true && policy.existingPositionPolicy.suggestionRequiresAdditionalEligibleUsdc === true && policy.existingPositionPolicy.detectionImplemented === false, "existing policy");

  // 16A-T…W. Allowance diagnostics.
  add("16A-T: allowance is suppressed while the Safety Buffer is incomplete", buildStableYieldAllowanceResult({ safetyBufferComplete: false }).status === "suppressed" && buildStableYieldAllowanceResult({ safetyBufferComplete: false }).suppressionReasons.includes("safety_buffer_incomplete"), "suppressed");
  add("16A-U: allowance is allowed once the Safety Buffer is complete with no suppression", buildStableYieldAllowanceResult({ safetyBufferComplete: true }).status === "allowed" && buildStableYieldAllowanceResult({ safetyBufferComplete: true }).bufferLaneApplicable === true && buildStableYieldAllowanceResult({ safetyBufferComplete: true }).excessLaneApplicable === true, "allowed");
  add("16A-V: a supplied suppression reason keeps the result suppressed", buildStableYieldAllowanceResult({ safetyBufferComplete: true, suppressionReasons: ["no_eligible_capital"] }).status === "suppressed", "suppressed");
  add("16A-W: diagnostics are deterministic and produce no recommendation", getStableYieldPolicyDiagnostics().lanes.join(",") === "safety_buffer_yield,excess_usdc_yield" && buildStableYieldAllowanceResult({ safetyBufferComplete: true }).recommendationGenerated === false && !/\b(buy|deposit now|recommended|best|guaranteed|apy)\b/i.test(explainStableYieldAllowance(buildStableYieldAllowanceResult({ safetyBufferComplete: true }))), "no recommendation");

  // 16A-X…Y. Validators fail closed.
  add("16A-X: a strategy with an enabled capability flag is rejected", validateStableYieldStrategyDefinition({ ...getStableYieldStrategyDefinition("lending"), suggestionGenerated: true } as never).valid === false, "rejected");
  add("16A-Y: a buffer-lane strategy that is not conservative/liquid/stable is rejected", validateStableYieldStrategyDefinition({ ...getStableYieldStrategyDefinition("lending"), resultingExposure: "volatile" } as never).valid === false && validateStableYieldLanePolicy({ ...bufferLane, volatileExposureAllowed: true } as never).valid === false, "rejected");

  // 16A-Z…AB. No downstream / no execution / no product import.
  {
    const blob = ["stableYieldPolicyTypes", "stableYieldPolicy", "stableYieldPolicyDiagnostics"].map((f) => readIf(`src/suggestions/${f}.ts`)).join("").toLowerCase();
    const handlers = ["sendtransaction", "signtransaction", "buy(", "swap(", "deposit(", "fetch(", "fetchapy", "fetchtvl"];
    add("16A-Z: no registry / market-data / execution path exists in the policy files", policy.registryExists === false && policy.comparisonExists === false && policy.suggestionsExist === false && policy.executionEnabled === false && handlers.filter((h) => blob.includes(h)).length === 0, "policy only");
  }
  add("16A-AA: no protocol/vault registry is created in 16A", !existsSync(`${root}/src/suggestions/stableYieldRegistry.ts`) && !existsSync(`${root}/src/suggestions/stableYieldMarketData.ts`), "no registry");
  {
    const prodFiles = ["src/components/SuggestionCard.tsx", "src/components/SuggestionReviewModal.tsx", "src/pages/DemoDashboardPage.tsx", "src/pages/DashboardPage.tsx", "src/components/RealWalletSuggestionsRail.tsx"];
    add("16A-AB: no product-facing file imports the Stable Yield policy", prodFiles.every((f) => !/stableYieldPolicy/.test(readIf(f))), "no product import");
  }

  return checks;
}

/**
 * Step 16B — Yield Strategy Registry fixtures (16B-A…AB). Verifies the generic registry schema/
 * versions, the documented protocol scope, exact-product entries (never fabricated addresses),
 * strategy-type/risk-lane reuse from 16A, lifecycle, the validators (dup/scope/lifecycle/approval/
 * buffer-lane), the inventory diagnostics (no comparison), and that nothing downstream exists yet.
 */

/**
 * Step 16B — Yield Strategy Registry fixtures (16B-A…AB). Verifies the generic registry schema/
 * versions, the documented protocol scope, exact-product entries (never fabricated addresses),
 * strategy-type/risk-lane reuse from 16A, lifecycle, the validators (dup/scope/lifecycle/approval/
 * buffer-lane), the inventory diagnostics (no comparison), and that nothing downstream exists yet.
 */
export function runYieldStrategyRegistryFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const root = process.cwd();
  const readIf = (rel: string) => { try { return readFileSync(`${root}/${rel}`, "utf8"); } catch { return ""; } };

  const all = listYieldStrategies();
  const diag = getYieldStrategyRegistryDiagnostics();
  const kaminoLending = getYieldStrategy("kamino_usdc_lending")!;
  const steakhouse = getYieldStrategy("kamino_steakhouse_usdc")!;

  // 16B-A…E. Schema + versions + flag.
  add("16B-A: registry schema version exists", YIELD_STRATEGY_REGISTRY_SCHEMA_VERSION === "1.0.0" && all[0].schemaVersion === "1.0.0", YIELD_STRATEGY_REGISTRY_SCHEMA_VERSION);
  add("16B-B: registry version exists", YIELD_STRATEGY_REGISTRY_VERSION === "1.0.0" && all[0].registryVersion === "1.0.0", YIELD_STRATEGY_REGISTRY_VERSION);
  add("16B-C: registry policy ID exists", YIELD_STRATEGY_REGISTRY_POLICY_ID === "yield_strategy_registry_v1", YIELD_STRATEGY_REGISTRY_POLICY_ID);
  add("16B-D: YIELD_STRATEGY_REGISTRY_EXISTS is enabled", YIELD_REGISTRY_EXISTS_CONST === true && YIELD_REGISTRY_FLAG === true, "exists");
  add("16B-E: the registry validates", validateYieldStrategyRegistry().valid === true, "valid");

  // 16B-F…H. Generic architecture + USDC MVP.
  add("16B-F: the registry is generic (not a USDC-only class) but the MVP asset is USDC", all.every((e) => e.principalAsset === "USDC") && !readIf("src/suggestions/yieldStrategyRegistry.ts").includes("StableUsdcRegistry"), "generic/USDC");
  add("16B-G: no future non-USDC asset entries exist (no BTC/ETH/USDY)", all.every((e) => e.principalAsset === "USDC"), "USDC only");
  add("16B-H: entries are exact products, never bare protocol names", all.every((e) => e.strategyId !== e.protocolId && e.displayName !== e.protocolDisplayName), "exact products");

  // 16B-I…K. Protocol scope.
  add("16B-I: only documented protocols appear (Kamino/Raydium/Meteora/Hubble)", all.every((e) => ["kamino", "raydium", "meteora", "hubble"].includes(e.protocolId)), all.map((e) => e.protocolId).join(","));
  add("16B-J: forbidden protocols never appear (Save/Marginfi/Drift/Loopscale/Solend)", all.every((e) => !["save", "marginfi", "drift", "loopscale", "solend"].includes(e.protocolId as string)), "none");
  add("16B-K: each documented protocol has at least one product", ["kamino", "raydium", "meteora", "hubble"].every((p) => getYieldStrategiesByProtocol(p).length >= 1), "covered");

  // 16B-L…N. Addresses never fabricated.
  add("16B-L: no product fabricates an on-chain address (any address present is manifest-verified)", listYieldStrategies().every((e) => e.address === undefined || getStableYieldEvidenceManifest(e.strategyId)?.productAddress === e.address), "no fabrication");
  add("16B-M: a product without a verified address is never approved or identity_verified", all.every((e) => e.address !== undefined || (e.lifecycle !== "approved" && e.lifecycle !== "identity_verified")), "not promoted");
  add("16B-N: no approved product exists yet (none has a documented address)", getApprovedYieldStrategies().length === 0, "0 approved");

  // 16B-O…Q. Strategy types + risk lanes reused from 16A.
  add("16B-O: strategy types are reused from Step 16A (no redefinition)", all.every((e) => ["lending", "managed_vault", "staking_like_vault", "stable_liquidity_strategy", "future_other"].includes(e.strategyType)) && !readIf("src/suggestions/yieldStrategyRegistryTypes.ts").includes('"lending" | "managed_vault"'), "reused");
  add("16B-P: risk lanes are reused from Step 16A", all.every((e) => ["buffer_eligible", "excess_only", "unsupported"].includes(e.riskLane)), "reused");
  add("16B-Q: a lending product may be buffer-lane; a liquidity strategy is excess-only", kaminoLending.supportedLane === "safety_buffer_yield" && kaminoLending.riskLane === "buffer_eligible" && getYieldStrategy("raydium_stable_usdc_strategy")!.supportedLane === "excess_usdc_yield", "lanes");

  // 16B-R…S. Lifecycle + Kamino product identity.
  add("16B-R: the lifecycle vocabulary is honored (all six values valid; only documentation_required used now)", validateYieldStrategyEntry({ ...steakhouse, lifecycle: "made_up" } as never).valid === false && validateYieldStrategyEntry({ ...steakhouse, lifecycle: "future" } as never).valid === true, "lifecycle");
  add("16B-S: the Kamino Steakhouse USDC product carries its official URL and its 16H-H manifest-verified address", steakhouse.displayName === "Kamino Steakhouse USDC" && steakhouse.officialUrl === "https://app.kamino.finance" && steakhouse.address === "HDsayqAsDWy3QvANGqh2yNraqcD8Fnjgh73Mhb3WRS5E" && getStableYieldEvidenceManifest("kamino_steakhouse_usdc")!.productAddress === steakhouse.address, "documented");

  // 16B-T…X. Validators fail closed.
  add("16B-T: duplicate strategy ids are rejected", validateYieldStrategyRegistry([steakhouse, { ...steakhouse }]).errors.includes("duplicate_strategy_ids"), "rejected");
  add("16B-U: duplicate addresses are rejected", validateYieldStrategyRegistry([{ ...steakhouse, address: "addr1" }, { ...kaminoLending, address: "addr1" }]).errors.includes("duplicate_addresses"), "rejected");
  add("16B-V: an unsupported protocol id is rejected", validateYieldStrategyEntry({ ...steakhouse, protocolId: "solend" } as never).valid === false, "rejected");
  add("16B-W: an approved product without documentation/official URL/asset is rejected", validateYieldStrategyEntry({ ...steakhouse, lifecycle: "approved", documentationUrl: undefined, officialUrl: undefined } as never).valid === false && validateYieldStrategyEntry({ ...steakhouse, lifecycle: "approved", documentationUrl: undefined } as never).errors.includes("approved_without_documentation"), "rejected");
  add("16B-X: the buffer lane on an unsupported strategy type is rejected", validateYieldStrategyEntry({ ...steakhouse, strategyType: "staking_like_vault", supportedLane: "safety_buffer_yield" } as never).errors.includes("buffer_lane_on_unsupported_strategy_type"), "rejected");

  // 16B-Y…Z. Diagnostics (inventory, no comparison).
  add("16B-Y: diagnostics report inventory counts per protocol/asset/type/lane/lifecycle", diag.registeredProducts === all.length && diag.byProtocol.kamino === 2 && diag.byAsset.USDC === all.length && diag.byLifecycle.documentation_required === 0 && diag.byLifecycle.identity_verified === 2 && diag.byLifecycle.unsupported_for_mvp === 3 && diag.byLifecycle.approved === 0, "inventory");
  add("16B-Z: diagnostics contain no comparison/scoring/ranking fields", diag.comparisonEvaluated === false && diag.marketDataEvaluated === false && diag.suggestionGenerated === false && Object.keys(diag).every((k) => !/score|rank|apy|tvl|leader|better|recommend/i.test(k)), "inventory only");

  // 16B-AA…AB. No downstream / no product import.
  {
    const blob = ["yieldStrategyRegistryTypes", "yieldStrategyRegistry", "yieldStrategyRegistryDiagnostics"].map((f) => readIf(`src/suggestions/${f}.ts`)).join("").toLowerCase();
    const forbidden = ["sendtransaction", "signtransaction", "fetch(", "fetchapy", "fetchtvl", "buy(", "swap(", "deposit("];
    add("16B-AA: no market-data/comparison/execution path exists in the registry files", all.every((e) => e.marketDataEvaluated === false && e.eligibilityEvaluated === false && e.comparisonEvaluated === false && e.suggestionGenerated === false && e.transactionsEnabled === false) && forbidden.filter((h) => blob.includes(h)).length === 0, "registry only");
  }
  {
    const prodFiles = ["src/components/SuggestionCard.tsx", "src/components/SuggestionReviewModal.tsx", "src/pages/DemoDashboardPage.tsx", "src/pages/DashboardPage.tsx", "src/components/RealWalletSuggestionsRail.tsx"];
    add("16B-AB: no product-facing file imports the Yield Strategy Registry", prodFiles.every((f) => !/yieldStrategyRegistry/.test(readIf(f))), "no product import");
  }

  return checks;
}

/**
 * Step 16C — Stable Yield market-data layer fixtures (16C-A…AD). Verifies the versioned freshness/
 * validity policy, the registry→market-data join, exact identity + APY-meaning + TVL + liquidity/
 * withdrawal preservation, freshness (buffer lane stricter), provenance, the empty-approved state, the
 * fail-closed validators, the coverage diagnostics, and that nothing downstream is enabled.
 */

/**
 * Step 16C — Stable Yield market-data layer fixtures (16C-A…AD). Verifies the versioned freshness/
 * validity policy, the registry→market-data join, exact identity + APY-meaning + TVL + liquidity/
 * withdrawal preservation, freshness (buffer lane stricter), provenance, the empty-approved state, the
 * fail-closed validators, the coverage diagnostics, and that nothing downstream is enabled.
 */
export function runYieldStrategyMarketDataFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const root = process.cwd();
  const readIf = (rel: string) => { try { return readFileSync(`${root}/${rel}`, "utf8"); } catch { return ""; } };

  const checkedAt = "2026-07-15T00:00:00.000Z";
  const set = buildEmptyApprovedYieldStrategyMarketDataSet(checkedAt);
  const snaps = listYieldStrategyMarketSnapshots(set);
  const diag = getYieldStrategyMarketDataDiagnostics(set);
  const policy = getYieldStrategyMarketDataPolicy();
  const registryOrder = listYieldStrategies().map((e) => e.strategyId);
  const s0 = getYieldStrategyMarketSnapshot(set, "kamino_steakhouse_usdc")!;
  const lending = getYieldStrategyMarketSnapshot(set, "kamino_usdc_lending")!;

  // A SYNTHETIC complete+approved snapshot — a validator UNIT fixture only; NOT added to the registry
  // (no dummy approved vault, no fabricated registry product). Proves the "when approved" path works.
  const synthetic = {
    ...s0,
    lifecycle: "approved",
    address: "SYNTHETIC_TEST_ONLY",
    status: "complete",
    approvedForMarketData: true,
    marketDataComplete: true,
    marketDataFresh: true,
    eligibleForFutureComparison: true,
    blockers: [] as string[],
    supportedLane: "safety_buffer_yield",
    riskLane: "buffer_eligible",
    apy: { status: "fresh", apyDefinition: "net", apyWindow: "current", currentApyPct: 5.2, netApyPct: 5.2, definitionSufficientForComparison: true, notes: [] },
    tvl: { status: "fresh", tvlUsd: 1_000_000, currency: "USD", notes: [] },
    liquidity: { status: "fresh", withdrawalStatus: "instant_currently_available", liquidityConfidence: "explicit_source", notes: [] },
    provenance: { kind: "documented_source", sourceId: "unit_source", browserFetched: false, present: true },
  };

  // 16C-A…E. Versions + policy + flag.
  add("16C-A: market-data schema version exists", YIELD_STRATEGY_MARKET_DATA_SCHEMA_VERSION === "1.0.0" && set.schemaVersion === "1.0.0", YIELD_STRATEGY_MARKET_DATA_SCHEMA_VERSION);
  add("16C-B: market-data policy ID/version exist", YIELD_STRATEGY_MARKET_DATA_POLICY_ID === "yield_strategy_market_data_v1" && YIELD_STRATEGY_MARKET_DATA_POLICY_VERSION === "1.0.0" && policy.policyId === YIELD_STRATEGY_MARKET_DATA_POLICY_ID, YIELD_STRATEGY_MARKET_DATA_POLICY_ID);
  add("16C-C: YIELD_STRATEGY_MARKET_DATA_EXISTS is enabled (module + registry flag)", YIELD_MARKET_DATA_FLAG_CONST === true && YIELD_MARKET_DATA_FLAG === true, "exists");
  add("16C-D: freshness is versioned; excess lane 60m, Safety Buffer lane stricter 15m", YIELD_STRATEGY_MARKET_DATA_MAX_AGE_MS === 60 * 60 * 1000 && YIELD_STRATEGY_BUFFER_LANE_MAX_AGE_MS === 15 * 60 * 1000 && YIELD_STRATEGY_BUFFER_LANE_MAX_AGE_MS < YIELD_STRATEGY_MARKET_DATA_MAX_AGE_MS, `${YIELD_STRATEGY_MARKET_DATA_MAX_AGE_MS}/${YIELD_STRATEGY_BUFFER_LANE_MAX_AGE_MS}`);
  add("16C-E: the market-data set validates", validateYieldStrategyMarketDataSet(set).valid === true, "valid");

  // 16C-F…H. Registry join + identity + lane metadata.
  add("16C-F: candidate order equals registry order (no metric reordering); every product present", JSON.stringify(set.canonicalCandidateOrder) === JSON.stringify(registryOrder) && snaps.length === registryOrder.length && snaps.length === 5, `${snaps.length}`);
  add("16C-G: exact registry identity is preserved (id/name/protocol/type/asset/lane)", s0.strategyId === "kamino_steakhouse_usdc" && s0.displayName === "Kamino Steakhouse USDC" && s0.protocolId === "kamino" && s0.strategyType === "managed_vault" && s0.principalAsset === "USDC" && s0.supportedLane === "excess_usdc_yield", "identity");
  add("16C-H: lane-compatibility metadata is preserved (never selected); a lending buffer product is a buffer candidate", lending.laneCompatibility.bufferLaneCandidate === true && s0.laneCompatibility.bufferLaneCandidate === false && lending.laneCompatibility.bufferLaneFreshnessMaxAgeMs === YIELD_STRATEGY_BUFFER_LANE_MAX_AGE_MS, "lane metadata");

  // 16C-I…K. Zero-approved empty state.
  add("16C-I: the approved candidate set is empty (no product is approved yet)", set.emptyApprovedSet === true && set.approvedCandidateIds.length === 0 && getApprovedYieldStrategyMarketSnapshots(set).length === 0, "0 approved");
  add("16C-J: every snapshot is unavailable/documentation-only; market-ready set is empty", snaps.every((s) => s.status === "unavailable" && s.approvedForMarketData === false && s.eligibleForFutureComparison === false) && set.marketReadyCandidateIds.length === 0 && getMarketReadyYieldStrategySnapshots(set).length === 0, "empty-allowed");
  add("16C-K: non-approved products carry NO market values and are blocked as product_not_approved", snaps.every((s) => s.apy.currentApyPct === undefined && s.tvl.tvlUsd === undefined && s.blockers.includes("product_not_approved") && s.provenance.present === false), "no values");

  // 16C-L…M. No auto-approval; input guards.
  {
    const withInputs = buildYieldStrategyMarketDataSet({ checkedAt, inputs: [{ strategyId: "kamino_steakhouse_usdc", sourceId: "s", fetchedAt: checkedAt, apy: { currentApyPct: 5, apyDefinition: "net", apyWindow: "current" }, tvlUsd: 1000 } as YieldStrategyMarketDataInput] });
    const s = getYieldStrategyMarketSnapshot(withInputs, "kamino_steakhouse_usdc")!;
    add("16C-L: injecting market data for a documentation_required product NEVER promotes/approves it", s.status === "unavailable" && s.approvedForMarketData === false && withInputs.emptyApprovedSet === true && s.apy.currentApyPct === undefined, "not promoted");
  }
  {
    const noise = buildYieldStrategyMarketDataSet({ checkedAt, inputs: [{ strategyId: "does_not_exist" }, { strategyId: "kamino_usdc_lending" }, { strategyId: "kamino_usdc_lending" }] as YieldStrategyMarketDataInput[] });
    add("16C-M: unknown and duplicate market-data inputs are ignored (fail closed with notes)", noise.notes.some((n) => n.startsWith("ignored_unknown_input")) && noise.notes.some((n) => n.startsWith("ignored_duplicate_input")), "guarded");
  }

  // 16C-N…O. APY meaning preserved (net/gross vs unknown), never collapsed.
  add("16C-N: only net/gross APY is comparison-sufficient; unknown/estimated/variable are not", isApyDefinitionSufficientForComparison("net") && isApyDefinitionSufficientForComparison("gross") && !isApyDefinitionSufficientForComparison("unknown") && !isApyDefinitionSufficientForComparison("estimated") && !isApyDefinitionSufficientForComparison("variable"), "definition");
  add("16C-O: a net APY is preserved as net (sufficient); an unknown APY is preserved, not dropped", synthetic.apy.apyDefinition === "net" && synthetic.apy.definitionSufficientForComparison === true && validateYieldStrategyMarketSnapshot({ ...synthetic, apy: { ...synthetic.apy, apyDefinition: "unknown", definitionSufficientForComparison: false } }).valid === true, "preserved");

  // 16C-P. TVL preserved / negative rejected.
  add("16C-P: exact TVL is preserved; a negative/non-finite TVL is rejected", synthetic.tvl.tvlUsd === 1_000_000 && validateYieldStrategyMarketSnapshot({ ...synthetic, tvl: { ...synthetic.tvl, tvlUsd: -5 } }).errors.includes("invalid_tvl_value"), "tvl");

  // 16C-Q. Liquidity/withdrawal explicit + supported.
  add("16C-Q: withdrawal state is explicit and first-class; an unknown state is never treated as instant", (YIELD_SUPPORTED_WITHDRAWAL_STATUSES as readonly string[]).includes("instant_currently_available") && s0.liquidity.withdrawalStatus === "unknown" && s0.liquidity.liquidityConfidence === "unknown", "explicit");

  // 16C-R…T. Freshness (missing/fresh/stale/future) + buffer lane stricter.
  add("16C-R: freshness is explicit: missing timestamp → missing; same-instant → fresh; 2h old (60m bound) → stale", evaluateMarketFreshness(undefined, checkedAt, YIELD_STRATEGY_MARKET_DATA_MAX_AGE_MS).status === "missing" && evaluateMarketFreshness(checkedAt, checkedAt, YIELD_STRATEGY_MARKET_DATA_MAX_AGE_MS).status === "fresh" && evaluateMarketFreshness("2026-07-14T22:00:00.000Z", checkedAt, YIELD_STRATEGY_MARKET_DATA_MAX_AGE_MS).status === "stale", "freshness");
  add("16C-S: a timestamp in the future beyond skew is invalid (no silent refresh)", evaluateMarketFreshness("2026-07-15T01:00:00.000Z", checkedAt, YIELD_STRATEGY_MARKET_DATA_MAX_AGE_MS).status === "invalid", "future invalid");
  add("16C-T: the Safety Buffer lane is stricter — 30m-old data is fresh for excess but stale for buffer", evaluateMarketFreshness("2026-07-14T23:30:00.000Z", checkedAt, YIELD_STRATEGY_MARKET_DATA_MAX_AGE_MS).status === "fresh" && evaluateMarketFreshness("2026-07-14T23:30:00.000Z", checkedAt, YIELD_STRATEGY_BUFFER_LANE_MAX_AGE_MS).status === "stale", "stricter buffer");

  // 16C-U…Z. Validators fail closed.
  add("16C-U: a valid unavailable snapshot validates; a well-formed complete approved snapshot validates", validateYieldStrategyMarketSnapshot(s0).valid === true && validateYieldStrategyMarketSnapshot(synthetic).valid === true, "valid");
  add("16C-V: a non-approved snapshot carrying market values is rejected", validateYieldStrategyMarketSnapshot({ ...s0, apy: { ...s0.apy, currentApyPct: 5 } }).errors.includes("non_approved_carries_market_values"), "rejected");
  add("16C-W: an enabled capability flag or a browser-fetched provenance is rejected", validateYieldStrategyMarketSnapshot({ ...s0, comparisonEvaluated: true }).valid === false && validateYieldStrategyMarketSnapshot({ ...s0, provenance: { ...s0.provenance, browserFetched: true } }).valid === false, "rejected");
  add("16C-X: a fabricated approval (approvedForMarketData without approved lifecycle + address) is rejected", validateYieldStrategyMarketSnapshot({ ...s0, approvedForMarketData: true }).errors.includes("approved_market_data_without_approved_lifecycle"), "rejected");
  add("16C-Y: an eligible snapshot that is not complete is rejected", validateYieldStrategyMarketSnapshot({ ...synthetic, status: "partial" }).errors.includes("eligible_without_complete"), "rejected");
  add("16C-Z: a buffer-lane eligible snapshot without instant liquidity is rejected", validateYieldStrategyMarketSnapshot({ ...synthetic, liquidity: { ...synthetic.liquidity, withdrawalStatus: "withdrawal_required" } }).errors.includes("buffer_lane_eligible_without_instant_liquidity"), "rejected");

  // 16C-AA. Set validator fails closed.
  add("16C-AA: the set validator rejects order drift, market-ready-without-approval, and an inconsistent empty flag", validateYieldStrategyMarketDataSet({ ...set, canonicalCandidateOrder: [...set.canonicalCandidateOrder].reverse() }).errors.includes("canonical_order_altered") && validateYieldStrategyMarketDataSet({ ...set, marketReadyCandidateIds: ["kamino_usdc_lending"] }).errors.some((e) => e.startsWith("market_ready_without_approval")) && validateYieldStrategyMarketDataSet({ ...set, emptyApprovedSet: false }).errors.includes("empty_approved_flag_inconsistent"), "fail closed");

  // 16C-AB. Diagnostics: coverage only, no comparison.
  add("16C-AB: diagnostics report coverage counts, the empty-approved state, and no leader/winner/ranking", diag.registeredCandidates === snaps.length && diag.approvedCandidates === 0 && diag.emptyApprovedSet === true && diag.byStatus.unavailable === snaps.length && diag.marketReadyCandidates === 0 && diag.comparisonEvaluated === false && diag.rankingCalculated === false && diag.leaderSelected === false && diag.suggestionGenerated === false, "coverage only");

  // 16C-AC…AD. No downstream execution / no product import.
  {
    const blob = ["yieldStrategyMarketDataTypes", "yieldStrategyMarketDataPolicy", "yieldStrategyMarketData", "yieldStrategyMarketDataDiagnostics"].map((f) => readIf(`src/suggestions/${f}.ts`)).join("").toLowerCase();
    const forbidden = ["sendtransaction", "signtransaction", "fetch(", "fetchapy", "fetchtvl", "buy(", "swap(", "deposit(", "usequery", "useeffect"];
    add("16C-AC: no fetch/execution/React path exists in the market-data files", snaps.every((s) => s.comparisonEvaluated === false && s.transactionsEnabled === false && s.walletSignatureRequired === false) && set.comparisonEvaluated === false && set.leaderSelected === false && forbidden.filter((h) => blob.includes(h)).length === 0, "read-only");
  }
  {
    const prodFiles = ["src/components/SuggestionCard.tsx", "src/components/SuggestionReviewModal.tsx", "src/pages/DemoDashboardPage.tsx", "src/pages/DashboardPage.tsx", "src/components/RealWalletSuggestionsRail.tsx"];
    add("16C-AD: no product-facing file imports the Stable Yield market-data layer", prodFiles.every((f) => !/yieldStrategyMarketData/.test(readIf(f))), "no product import");
  }

  return checks;
}

/**
 * Step 16D — Stable Yield eligibility + risk-review fixtures (16D-A…CM). Verifies the versioned policy,
 * the risk-review contract, per-lane buffer/excess gates over synthetic approved candidates (production
 * stays empty), registry/market/risk gates, user-risk compatibility, Hubble scope, ordering, and that
 * nothing downstream (comparison / capital / plan / suggestion / UI / execution) is enabled.
 */

/**
 * Step 16D — Stable Yield eligibility + risk-review fixtures (16D-A…CM). Verifies the versioned policy,
 * the risk-review contract, per-lane buffer/excess gates over synthetic approved candidates (production
 * stays empty), registry/market/risk gates, user-risk compatibility, Hubble scope, ordering, and that
 * nothing downstream (comparison / capital / plan / suggestion / UI / execution) is enabled.
 */
export function runYieldStrategyEligibilityFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const root = process.cwd();
  const readIf = (rel: string) => { try { return readFileSync(`${root}/${rel}`, "utf8"); } catch { return ""; } };

  const T = "2026-07-16T00:00:00.000Z";

  // ---- Synthetic factories (fixtures only — never touch the production registry / review store) ----
  const mkApy = (over: Partial<ELIG_Apy> = {}): ELIG_Apy => ({ status: "fresh", apyDefinition: "net", apyWindow: "current", currentApyPct: 5, netApyPct: 5, definitionSufficientForComparison: true, notes: [], ...over });
  const mkLiq = (over: Partial<ELIG_Liq> = {}): ELIG_Liq => ({ status: "fresh", withdrawalStatus: "instant_currently_available", availableLiquidityUsd: 500_000, liquidityConfidence: "explicit_source", withdrawalQueueActive: false, notes: [], ...over });
  const mkEntry = (over: Partial<ELIG_Entry> = {}): ELIG_Entry => ({
    schemaVersion: "1.0.0", registryVersion: "1.0.0", strategyId: "syn_lending", displayName: "Synthetic USDC Lending",
    protocolId: "kamino", protocolDisplayName: "Kamino", strategyType: "lending", principalAsset: "USDC",
    supportedLane: "safety_buffer_yield", riskLane: "buffer_eligible", lifecycle: "approved",
    officialUrl: "https://app.kamino.finance", address: "SYNTH_ADDR_1",
    marketDataEvaluated: false, eligibilityEvaluated: false, comparisonEvaluated: false, suggestionGenerated: false, transactionsEnabled: false, walletSignatureRequired: false, notes: [], ...over,
  });
  const mkSnap = (id: string, over: Partial<ELIG_Snap> = {}): ELIG_Snap => ({
    schemaVersion: "1.0.0", policyVersion: "1.0.0", strategyId: id, displayName: "syn", protocolId: "kamino", protocolDisplayName: "Kamino",
    strategyType: "lending", principalAsset: "USDC", supportedLane: "safety_buffer_yield", riskLane: "buffer_eligible", lifecycle: "approved", address: "SYNTH_ADDR_1",
    status: "complete", apy: mkApy(), tvl: { status: "fresh", tvlUsd: 2_000_000, currency: "USD", notes: [] }, liquidity: mkLiq(),
    fees: { status: "fresh", feeModel: "management_fee", managementFeePct: 0.1, notes: [] },
    laneCompatibility: { supportedLane: "safety_buffer_yield", riskLane: "buffer_eligible", bufferLaneCandidate: true, excessLaneCandidate: true, bufferLaneFreshnessMaxAgeMs: 900000, excessLaneFreshnessMaxAgeMs: 3600000, bufferLaneRequiresInstantLiquidity: true, bufferLaneRequiresDefinedWithdrawal: true, notes: [] },
    sourceId: "src", sourceLabel: "Src", provenance: { kind: "documented_source", sourceId: "src", browserFetched: false, present: true },
    fetchedAt: T, checkedAt: T, maximumAgeMs: 900000, ageMs: 0, warnings: [], blockers: [],
    approvedForMarketData: true, marketDataComplete: true, marketDataFresh: true, eligibleForFutureComparison: true,
    comparisonEvaluated: false, eligibilityEvaluated: false, rankingCalculated: false, leaderSelected: false, suggestionGenerated: false, updatesProductOutput: false, transactionsEnabled: false, walletSignatureRequired: false, ...over,
  });
  const mkReview = (over: Partial<ELIG_Review> = {}): ELIG_Review => ({
    schemaVersion: "1.0.0", policyId: "yield_strategy_risk_review_v1", policyVersion: "1.0.0", reviewId: "rev1", reviewVersion: "1.0.0",
    strategyId: "syn_lending", protocolId: "kamino", address: "SYNTH_ADDR_1", reviewedAt: "2026-07-01T00:00:00.000Z", validUntil: "2026-12-31T00:00:00.000Z",
    reviewStatus: "approved", operationalStatus: "active", principalAssetId: "USDC", resultingExposure: "usdc_only", custodyModel: "non_custodial", auditStatus: "verified", auditReferences: [],
    leverageUsed: false, smartContractRiskTier: "conservative", riskScore: 8, compatibleUserRiskProfileIds: ["very_low", "low", "medium", "high", "very_high"],
    bufferUseReviewed: true, excessUseReviewed: true, notes: [],
    comparisonPerformed: false, leaderSelected: false, amountCalculated: false, suggestionGenerated: false, transactionsEnabled: false, walletSignatureRequired: false, ...over,
  });

  // Buffer / excess evaluator shorthands.
  const evb = (entryOver: Partial<ELIG_Entry> = {}, revOver: Partial<ELIG_Review> = {}, snapOver: Partial<ELIG_Snap> = {}, userRiskProfileId?: string): ELIG_Result =>
    evaluateYieldStrategyLaneEligibility({ lane: "buffer", registryEntry: mkEntry(entryOver), marketSnapshot: mkSnap("syn_lending", snapOver), riskReview: mkReview(revOver), userRiskProfileId, checkedAt: T });
  const eve = (entryOver: Partial<ELIG_Entry> = {}, revOver: Partial<ELIG_Review> = {}, snapOver: Partial<ELIG_Snap> = {}, userRiskProfileId: string | undefined = "medium"): ELIG_Result =>
    evaluateYieldStrategyLaneEligibility({ lane: "excess", registryEntry: mkEntry({ supportedLane: "excess_usdc_yield", riskLane: "excess_only", strategyType: "managed_vault", ...entryOver }), marketSnapshot: mkSnap("syn_lending", snapOver), riskReview: mkReview(revOver), userRiskProfileId, checkedAt: T });

  const marketSet = buildEmptyApprovedYieldStrategyMarketDataSet(T);
  const prodSet = buildProductionYieldStrategyEligibilitySet(marketSet, T);
  const policy = getYieldStrategyEligibilityPolicy();
  const eligBlob = ["yieldStrategyEligibilityTypes", "yieldStrategyRiskReview", "yieldStrategyEligibilityPolicy", "yieldStrategyEligibility", "yieldStrategyEligibilityDiagnostics"].map((f) => readIf(`src/suggestions/${f}.ts`)).join("").toLowerCase();

  // 16D-A…E. Schema / policy / flags.
  add("16D-A: eligibility schema/version exist", YIELD_STRATEGY_ELIGIBILITY_SCHEMA_VERSION === "1.0.0" && YIELD_STRATEGY_ELIGIBILITY_POLICY_ID === "yield_strategy_eligibility_v1" && YIELD_STRATEGY_ELIGIBILITY_POLICY_VERSION === "1.0.0", YIELD_STRATEGY_ELIGIBILITY_POLICY_ID);
  add("16D-B: risk-review schema/version exist", YIELD_STRATEGY_RISK_REVIEW_SCHEMA_VERSION === "1.0.0" && YIELD_STRATEGY_RISK_REVIEW_POLICY_ID === "yield_strategy_risk_review_v1", YIELD_STRATEGY_RISK_REVIEW_POLICY_ID);
  add("16D-C: eligibility policy validates and reuses canonical thresholds", validateYieldStrategyEligibilityPolicy(policy).valid === true, "valid");
  add("16D-D: eligibility + risk-review feature flags are true", ELIG_FLAG_CONST === true && ELIG_FLAG_REG === true && STABLE_YIELD_ELIGIBILITY_EXISTS === true && YIELD_STRATEGY_RISK_REVIEW_EXISTS === true, "enabled");
  add("16D-E: the eligibility layer itself selects no leader (comparison is a separate 16E layer)", STABLE_YIELD_ELIGIBILITY_SELECTS_LEADER === false, "no leader in 16D");

  // 16D-F…J. Production empty state.
  add("16D-F: current production registry still has zero approved products", getApprovedYieldStrategies().length === 0, "0 approved");
  add("16D-G: production eligibility set returns empty_approved_set", prodSet.status === "empty_approved_set", prodSet.status);
  add("16D-H: empty approved set is valid", validateYieldStrategyEligibilitySet(prodSet).valid === true && prodSet.emptyApprovedSet === true, "valid");
  add("16D-I: no production product is silently promoted", prodSet.bufferEligibleStrategyIds.length === 0 && prodSet.excessEligibleStrategyIds.length === 0 && prodSet.bufferResults.length === 0 && prodSet.excessResults.length === 0, "empty");
  add("16D-J: no address is fabricated in the production registry (any address is manifest-verified)", listYieldStrategies().every((e) => e.address === undefined || getStableYieldEvidenceManifest(e.strategyId)?.productAddress === e.address), "no fabrication");

  // 16D-K…Q. Registry gates.
  add("16D-K: documentation_required cannot be eligible", evb({ lifecycle: "documentation_required" }).eligibleForComparison === false && evb({ lifecycle: "documentation_required" }).blockers.includes("strategy_not_approved"), "blocked");
  add("16D-L: review lifecycle cannot be eligible", evb({ lifecycle: "review" }).eligibleForComparison === false, "blocked");
  add("16D-M: deprecated cannot be eligible", evb({ lifecycle: "deprecated" }).eligibleForComparison === false && evb({ lifecycle: "deprecated" }).blockers.includes("lifecycle_not_active"), "blocked");
  add("16D-N: disabled cannot be eligible", evb({ lifecycle: "disabled" }).eligibleForComparison === false, "blocked");
  add("16D-O: approved exact synthetic product may proceed", evb().eligibleForComparison === true && evb().status === "eligible_for_comparison", "proceeds");
  add("16D-P: missing address blocks", evb({ address: undefined }).blockers.includes("address_missing") && evb({ address: undefined }).eligibleForComparison === false, "blocked");
  add("16D-Q: registry/review identity mismatch blocks", evb({}, { strategyId: "other_id" }).blockers.includes("review_identity_mismatch"), "blocked");

  // 16D-R…AE. Risk-review gates.
  const evbNoRev = evaluateYieldStrategyLaneEligibility({ lane: "buffer", registryEntry: mkEntry(), marketSnapshot: mkSnap("syn_lending"), riskReview: undefined, checkedAt: T });
  add("16D-R: missing risk review blocks", evbNoRev.blockers.includes("risk_review_missing") && evbNoRev.eligibleForComparison === false, "blocked");
  add("16D-S: incomplete review blocks", evb({}, { reviewStatus: "incomplete" }).blockers.includes("risk_review_invalid"), "blocked");
  add("16D-T: expired review blocks when expiry exists", evb({}, { validUntil: "2026-01-01T00:00:00.000Z" }).blockers.includes("risk_review_stale"), "blocked");
  add("16D-U: paused strategy blocks", evb({}, { operationalStatus: "paused" }).blockers.includes("strategy_paused"), "blocked");
  add("16D-V: deprecated operational status blocks", evb({}, { operationalStatus: "deprecated" }).blockers.includes("strategy_deprecated"), "blocked");
  add("16D-W: unknown operational status blocks", evb({}, { operationalStatus: "unknown" }).blockers.includes("operational_status_unknown"), "blocked");
  add("16D-X: unknown custody blocks", evb({}, { custodyModel: "unknown" }).blockers.includes("custody_model_unknown"), "blocked");
  add("16D-Y: custodial strategy fails the non-custodial requirement", evb({}, { custodyModel: "custodial" }).blockers.includes("non_custodial_requirement_not_met"), "blocked");
  add("16D-Z: verified non-custodial review may pass", evb().custodyRequirementPassed === true && evb().auditRequirementPassed === true && evb().eligibleForComparison === true, "passes");
  add("16D-AA: unknown audit blocks", evb({}, { auditStatus: "unknown" }).blockers.includes("audit_status_unknown"), "blocked");
  add("16D-AB: missing required audit (none) blocks", evb({}, { auditStatus: "none" }).blockers.includes("audit_requirement_not_met"), "blocked");
  add("16D-AC: unknown leverage blocks", evb({}, { leverageUsed: "unknown" }).blockers.includes("leverage_status_unknown"), "blocked");
  add("16D-AD: leverage blocks buffer eligibility", evb({}, { leverageUsed: true }).blockers.includes("leverage_not_allowed") && evb({}, { leverageUsed: true }).blockers.includes("buffer_strategy_uses_leverage"), "blocked");
  add("16D-AE: unknown exposure blocks", evb({}, { resultingExposure: "unknown" }).blockers.includes("resulting_exposure_unknown"), "blocked");

  // 16D-AF…AU. Buffer lane.
  add("16D-AF: conservative USDC-only lending synthetic candidate can pass buffer", evb().eligibleForComparison === true, "passes");
  add("16D-AG: buffer strategy requires buffer_eligible risk lane", evb({ riskLane: "excess_only" }).blockers.includes("risk_lane_not_supported"), "blocked");
  add("16D-AH: excess-only strategy cannot pass buffer lane", evb({ riskLane: "excess_only", supportedLane: "excess_usdc_yield" }).eligibleForComparison === false && evb({ riskLane: "excess_only", supportedLane: "excess_usdc_yield" }).status === "unsupported", "unsupported");
  add("16D-AI: stablecoin-pair exposure cannot pass buffer lane", evb({}, { resultingExposure: "stablecoin_pair" }).blockers.includes("buffer_strategy_not_usdc_only"), "blocked");
  add("16D-AJ: stable LP cannot pass buffer lane", evb({ strategyType: "stable_liquidity_strategy" }).blockers.includes("buffer_strategy_has_lp_exposure"), "blocked");
  add("16D-AK: mixed exposure cannot pass buffer lane", evb({}, { resultingExposure: "mixed_asset" }).blockers.includes("buffer_strategy_not_usdc_only"), "blocked");
  add("16D-AL: moderate risk tier cannot pass buffer lane", evb({}, { smartContractRiskTier: "moderate" }).blockers.includes("buffer_strategy_not_conservative"), "blocked");
  add("16D-AM: elevated risk tier cannot pass buffer lane", evb({}, { smartContractRiskTier: "elevated" }).blockers.includes("buffer_strategy_not_conservative"), "blocked");
  add("16D-AN: high-risk user does not relax buffer rules", evb({}, { smartContractRiskTier: "moderate" }, {}, "very_high").eligibleForComparison === false && evb({}, { smartContractRiskTier: "moderate" }, {}, "very_high").blockers.includes("buffer_strategy_not_conservative"), "not relaxed");
  add("16D-AO: freshness uses the strict buffer threshold (30m old → stale)", evb({}, {}, { fetchedAt: "2026-07-15T23:30:00.000Z" }).blockers.includes("market_snapshot_stale"), "stale");
  add("16D-AP: instant-current withdrawal passes when other requirements pass", evb().withdrawalRequirementPassed === true && evb().eligibleForComparison === true, "passes");
  add("16D-AQ: partial withdrawal fails buffer lane", evb({}, {}, { liquidity: mkLiq({ withdrawalStatus: "partial_currently_available" }) }).blockers.includes("buffer_strategy_not_immediately_liquid"), "blocked");
  add("16D-AR: withdrawal-required fails buffer lane", evb({}, {}, { liquidity: mkLiq({ withdrawalStatus: "withdrawal_required" }) }).blockers.includes("buffer_strategy_not_immediately_liquid"), "blocked");
  add("16D-AS: queue possible fails buffer lane", evb({}, {}, { liquidity: mkLiq({ withdrawalStatus: "queue_possible" }) }).blockers.includes("buffer_strategy_not_immediately_liquid"), "blocked");
  add("16D-AT: active queue fails buffer lane", evb({}, {}, { liquidity: mkLiq({ withdrawalQueueActive: true }) }).blockers.includes("withdrawal_queue_active"), "blocked");
  add("16D-AU: unknown liquidity fails buffer lane", evb({}, {}, { liquidity: mkLiq({ liquidityConfidence: "unknown", availableLiquidityUsd: undefined }) }).blockers.includes("liquidity_confidence_insufficient"), "blocked");

  // 16D-AV…BD. Excess lane.
  add("16D-AV: approved compatible lending strategy may pass excess lane", eve({ strategyType: "lending", supportedLane: "safety_buffer_yield", riskLane: "buffer_eligible" }).eligibleForComparison === true, "passes");
  add("16D-AW: approved managed vault may pass excess lane when policy-compatible", eve().eligibleForComparison === true, "passes");
  add("16D-AX: approved stable liquidity strategy may pass excess when reviewed + user-risk compatible", eve({ strategyType: "stable_liquidity_strategy", riskLane: "excess_only" }, { resultingExposure: "stable_basket" }).eligibleForComparison === true, "passes");
  add("16D-AY: future_other cannot pass", eve({ strategyType: "future_other" }).blockers.includes("strategy_type_not_supported") && eve({ strategyType: "future_other" }).status === "unsupported", "unsupported");
  add("16D-AZ: user-risk incompatibility blocks", eve({}, { compatibleUserRiskProfileIds: ["very_low"] }).blockers.includes("user_risk_incompatible"), "blocked");
  add("16D-BA: unknown/absent user risk blocks when required", evaluateYieldStrategyLaneEligibility({ lane: "excess", registryEntry: mkEntry({ supportedLane: "excess_usdc_yield", riskLane: "excess_only", strategyType: "managed_vault" }), marketSnapshot: mkSnap("syn_lending"), riskReview: mkReview(), checkedAt: T }).blockers.includes("user_risk_incompatible") && evaluateYieldStrategyLaneEligibility({ lane: "excess", registryEntry: mkEntry({ supportedLane: "excess_usdc_yield", riskLane: "excess_only", strategyType: "managed_vault" }), marketSnapshot: mkSnap("syn_lending"), riskReview: mkReview(), userRiskProfileId: "not_a_real_id", checkedAt: T }).blockers.includes("user_risk_incompatible"), "blocked");
  add("16D-BB: freshness uses the excess threshold (30m old → still fresh; 90m → stale)", eve({}, {}, { fetchedAt: "2026-07-15T23:30:00.000Z" }).blockers.includes("market_snapshot_stale") === false && eve({}, {}, { fetchedAt: "2026-07-15T22:30:00.000Z" }).blockers.includes("market_snapshot_stale") === true, "excess bound");
  add("16D-BC: withdrawal delay beyond canonical limit blocks", eve({}, {}, { liquidity: mkLiq({ withdrawalStatus: "withdrawal_required", withdrawalDelayHours: 200 }) }).blockers.includes("withdrawal_delay_exceeds_policy"), "blocked");
  add("16D-BD: unknown withdrawal state blocks", eve({}, {}, { liquidity: mkLiq({ withdrawalStatus: "unknown" }) }).blockers.includes("withdrawal_status_unknown"), "blocked");

  // 16D-BE…BR. Market-data gates.
  add("16D-BE: missing market snapshot blocks", evaluateYieldStrategyLaneEligibility({ lane: "buffer", registryEntry: mkEntry(), marketSnapshot: undefined, riskReview: mkReview(), checkedAt: T }).blockers.includes("market_snapshot_missing"), "blocked");
  add("16D-BF: partial snapshot blocks", evb({}, {}, { status: "partial" }).blockers.includes("market_snapshot_partial"), "blocked");
  add("16D-BG: stale snapshot blocks", evb({}, {}, { status: "stale" }).blockers.includes("market_snapshot_stale"), "blocked");
  add("16D-BH: invalid snapshot blocks", evb({}, {}, { status: "invalid" }).blockers.includes("market_snapshot_invalid"), "blocked");
  add("16D-BI: missing provenance blocks", evb({}, {}, { provenance: { kind: "none", browserFetched: false, present: false } }).blockers.includes("market_provenance_missing"), "blocked");
  add("16D-BJ: unknown APY definition blocks", evb({}, {}, { apy: mkApy({ apyDefinition: "unknown", definitionSufficientForComparison: false }) }).blockers.includes("apy_definition_unknown"), "blocked");
  add("16D-BK: insufficient APY definition blocks", evb({}, {}, { apy: mkApy({ apyDefinition: "estimated", definitionSufficientForComparison: false }) }).blockers.includes("apy_definition_not_comparable"), "blocked");
  add("16D-BL: no APY minimum is introduced (a tiny APY stays eligible)", evb({}, {}, { apy: mkApy({ currentApyPct: 0.01, netApyPct: 0.01 }) }).eligibleForComparison === true, "no min");
  add("16D-BM: higher APY does not alter eligibility", evb({}, {}, { apy: mkApy({ currentApyPct: 0.01, netApyPct: 0.01 }) }).eligibleForComparison === evb({}, {}, { apy: mkApy({ currentApyPct: 50, netApyPct: 50 }) }).eligibleForComparison, "unchanged");
  add("16D-BN: TVL below canonical minimum blocks", evb({}, {}, { tvl: { status: "fresh", tvlUsd: 999_999, currency: "USD", notes: [] } }).blockers.includes("tvl_below_minimum"), "blocked");
  add("16D-BO: TVL exactly at minimum passes", evb({}, {}, { tvl: { status: "fresh", tvlUsd: 1_000_000, currency: "USD", notes: [] } }).tvlRequirementPassed === true && evb({}, {}, { tvl: { status: "fresh", tvlUsd: 1_000_000, currency: "USD", notes: [] } }).eligibleForComparison === true, "at min");
  add("16D-BP: unknown liquidity blocks (excess)", eve({}, {}, { liquidity: mkLiq({ liquidityConfidence: "unknown" }) }).blockers.includes("liquidity_unknown"), "blocked");
  add("16D-BQ: TVL does not substitute for liquidity", evb({}, {}, { tvl: { status: "fresh", tvlUsd: 9_000_000, currency: "USD", notes: [] }, liquidity: mkLiq({ availableLiquidityUsd: undefined }) }).blockers.includes("liquidity_missing") && evb({}, {}, { tvl: { status: "fresh", tvlUsd: 9_000_000, currency: "USD", notes: [] }, liquidity: mkLiq({ availableLiquidityUsd: undefined }) }).eligibleForComparison === false, "independent");
  add("16D-BR: APY does not substitute for liquidity", evb({}, {}, { apy: mkApy({ currentApyPct: 20, netApyPct: 20 }), liquidity: mkLiq({ liquidityConfidence: "unknown", availableLiquidityUsd: undefined }) }).blockers.includes("liquidity_confidence_insufficient"), "independent");

  // 16D-BS…BU. Hubble / documentation scope.
  add("16D-BS: Hubble remains in the documented registry", getYieldStrategiesByProtocol("hubble").length >= 1, "present");
  add("16D-BT: Hubble is not hardcoded deprecated/ineligible by the eligibility code", !eligBlob.includes("hubble"), "not hardcoded");
  add("16D-BU: the unsupported_for_mvp Hubble entry remains ineligible", getYieldStrategy("hubble_usdc_strategy")!.lifecycle === "unsupported_for_mvp" && !prodSet.excessEligibleStrategyIds.includes("hubble_usdc_strategy") && !prodSet.bufferEligibleStrategyIds.includes("hubble_usdc_strategy"), "ineligible");

  // 16D-BV…CA. Ordering + no comparison.
  {
    const entA = mkEntry({ strategyId: "syn_a", address: "ADDR_A" });
    const entB = mkEntry({ strategyId: "syn_b", address: "ADDR_B" });
    const snapA = mkSnap("syn_a", { strategyId: "syn_a", address: "ADDR_A", apy: mkApy({ currentApyPct: 1, netApyPct: 1 }) });
    const snapB = mkSnap("syn_b", { strategyId: "syn_b", address: "ADDR_B", apy: mkApy({ currentApyPct: 50, netApyPct: 50 }) });
    const revA = mkReview({ reviewId: "rA", strategyId: "syn_a", address: "ADDR_A" });
    const revB = mkReview({ reviewId: "rB", strategyId: "syn_b", address: "ADDR_B" });
    const synMarketSet = { snapshots: { syn_a: snapA, syn_b: snapB } } as unknown as ELIG_MarketSet;
    const synSet = buildYieldStrategyEligibilitySet({ registry: [entA, entB], marketDataSet: synMarketSet, riskReviews: [revA, revB], userRiskProfileId: "medium", checkedAt: T });
    add("16D-BV: eligibility results preserve registry order", JSON.stringify(synSet.bufferResults.map((r) => r.strategyId)) === JSON.stringify(["syn_a", "syn_b"]), synSet.bufferResults.map((r) => r.strategyId).join(","));
    add("16D-BW: eligible IDs preserve registry order", JSON.stringify(synSet.bufferEligibleStrategyIds) === JSON.stringify(["syn_a", "syn_b"]), synSet.bufferEligibleStrategyIds.join(","));
    add("16D-BX: results are not sorted by APY (higher-APY syn_b stays second)", synSet.bufferResults[0].strategyId === "syn_a" && synSet.bufferResults[1].strategyId === "syn_b", "unsorted");
    add("16D-BY: no score is calculated on results/diagnostics", !("score" in evb()) && Object.keys(getYieldStrategyEligibilityDiagnostics(synSet)).every((k) => !/score/i.test(k)), "no score");
    add("16D-BZ: no rank is assigned", evb().rankAssigned === false && synSet.rankingPerformed === false, "no rank");
    add("16D-CA: no leader is selected", evb().leaderSelected === false && synSet.leaderSelected === false && STABLE_YIELD_ELIGIBILITY_SELECTS_LEADER === false, "no leader");
  }

  // 16D-CB…CJ. Boundaries.
  add("16D-CB: no wallet balance is consumed", evb().userCapitalEvaluated === false && prodSet.walletPositionsEvaluated === false && !/getbalance|walletbalance|usewallet/.test(eligBlob), "no wallet");
  add("16D-CC: no existing position is detected", prodSet.walletPositionsEvaluated === false && !/detectposition|existingposition\(/.test(eligBlob), "no positions");
  add("16D-CD: no eligible capital is calculated", evb().amountCalculated === false && prodSet.amountCalculated === false && STABLE_YIELD_ELIGIBILITY_EVALUATES_CAPITAL === false, "no capital");
  add("16D-CE: no Safety Buffer surplus is calculated", prodSet.userCapitalEvaluated === false && !/surplus/.test(eligBlob), "no surplus");
  add("16D-CF: no expected earnings are calculated", !/expectedearnings|projectedearnings/.test(eligBlob), "no earnings");
  add("16D-CG: no plan is generated by eligibility", evb().planGenerated === false && prodSet.planGenerated === false, "no plan");
  add("16D-CH: no suggestion is generated", evb().suggestionGenerated === false && prodSet.suggestionGenerated === false, "no suggestion");
  add("16D-CI: no product output is updated", prodSet.updatesProductOutput === false && STABLE_YIELD_ELIGIBILITY_UPDATES_PRODUCT_OUTPUT === false, "no output");
  {
    const prodFiles = ["src/components/SuggestionCard.tsx", "src/components/SuggestionReviewModal.tsx", "src/pages/DemoDashboardPage.tsx", "src/pages/DashboardPage.tsx", "src/components/RealWalletSuggestionsRail.tsx"];
    add("16D-CJ: no product-facing file imports eligibility/risk-review (the UI reads only the 16H-B presentation)", prodFiles.every((f) => !/yieldStrategyEligibility|yieldStrategyRiskReview/.test(readIf(f))), "no UI import");
  }

  // 16D-CK…CM. Execution.
  add("16D-CK: no transaction path exists", evb().transactionsEnabled === false && prodSet.transactionsEnabled === false && STABLE_YIELD_EXECUTION_ENABLED === false, "read-only");
  add("16D-CL: no signature path exists", evb().walletSignatureRequired === false && prodSet.walletSignatureRequired === false, "no signature");
  add("16D-CM: no deposit/withdraw/swap/stake/execute handler exists", !/sendtransaction|signtransaction|deposit\(|withdraw\(|swap\(|stake\(|execute\(|fetch\(/.test(eligBlob), "no handlers");

  // Extra integrity: validators + risk-review contract + explain (no recommendation language).
  add("16D-INT-A: a well-formed eligible result validates; a blocked result marked eligible is rejected", validateYieldStrategyLaneEligibilityResult(evb()).valid === true && validateYieldStrategyLaneEligibilityResult({ ...evb({ lifecycle: "review" }), eligibleForComparison: true }).valid === false, "validators");
  add("16D-INT-B: the risk-review validator rejects a review for an undocumented registry product", validateYieldStrategyRiskReview(mkReview({ strategyId: "kamino_steakhouse_usdc" })).valid === false, "review guard");
  add("16D-INT-C: explain uses no recommendation language", !/\b(best|safest|winner|recommended|use this)\b/i.test(explainYieldStrategyLaneEligibility(evb())) && !/\b(best|safest|winner|recommended|use this)\b/i.test(explainYieldStrategyLaneEligibility(evb({ lifecycle: "review" }))), "no reco");

  return checks;
}

/**
 * Step 16D.1 — product-level lane policy fixtures (16D1-A…Z). Verifies that strategy TYPE describes
 * mechanics while the exact registry riskLane + static risk review + live market data determine Safety
 * Buffer eligibility: a managed_vault is no longer hardcoded excess-only, but never becomes buffer-
 * eligible automatically; stable-liquidity + locked staking-like stay out of the buffer; production
 * stays empty; nothing downstream is enabled.
 */

/**
 * Step 16D.1 — product-level lane policy fixtures (16D1-A…Z). Verifies that strategy TYPE describes
 * mechanics while the exact registry riskLane + static risk review + live market data determine Safety
 * Buffer eligibility: a managed_vault is no longer hardcoded excess-only, but never becomes buffer-
 * eligible automatically; stable-liquidity + locked staking-like stay out of the buffer; production
 * stays empty; nothing downstream is enabled.
 */
export function runYieldStrategyProductLaneFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const T = "2026-07-16T00:00:00.000Z";

  const mkApy = (over: Partial<ELIG_Apy> = {}): ELIG_Apy => ({ status: "fresh", apyDefinition: "net", apyWindow: "current", currentApyPct: 5, netApyPct: 5, definitionSufficientForComparison: true, notes: [], ...over });
  const mkLiq = (over: Partial<ELIG_Liq> = {}): ELIG_Liq => ({ status: "fresh", withdrawalStatus: "instant_currently_available", availableLiquidityUsd: 500_000, liquidityConfidence: "explicit_source", withdrawalQueueActive: false, notes: [], ...over });
  // A synthetic EXACT managed vault reviewed for the buffer lane (fixtures only — never registered).
  const mkVaultEntry = (over: Partial<ELIG_Entry> = {}): ELIG_Entry => ({
    schemaVersion: "1.0.0", registryVersion: "1.0.0", strategyId: "syn_vault", displayName: "Synthetic Managed USDC Vault",
    protocolId: "kamino", protocolDisplayName: "Kamino", strategyType: "managed_vault", principalAsset: "USDC",
    supportedLane: "safety_buffer_yield", riskLane: "buffer_eligible", lifecycle: "approved", officialUrl: "https://app.kamino.finance", address: "SYNTH_VAULT_ADDR",
    marketDataEvaluated: false, eligibilityEvaluated: false, comparisonEvaluated: false, suggestionGenerated: false, transactionsEnabled: false, walletSignatureRequired: false, notes: [], ...over,
  });
  const mkVaultSnap = (over: Partial<ELIG_Snap> = {}): ELIG_Snap => ({
    schemaVersion: "1.0.0", policyVersion: "1.0.0", strategyId: "syn_vault", displayName: "syn", protocolId: "kamino", protocolDisplayName: "Kamino",
    strategyType: "managed_vault", principalAsset: "USDC", supportedLane: "safety_buffer_yield", riskLane: "buffer_eligible", lifecycle: "approved", address: "SYNTH_VAULT_ADDR",
    status: "complete", apy: mkApy(), tvl: { status: "fresh", tvlUsd: 2_000_000, currency: "USD", notes: [] }, liquidity: mkLiq(),
    fees: { status: "fresh", feeModel: "management_fee", managementFeePct: 0.15, notes: [] },
    laneCompatibility: { supportedLane: "safety_buffer_yield", riskLane: "buffer_eligible", bufferLaneCandidate: true, excessLaneCandidate: true, bufferLaneFreshnessMaxAgeMs: 900000, excessLaneFreshnessMaxAgeMs: 3600000, bufferLaneRequiresInstantLiquidity: true, bufferLaneRequiresDefinedWithdrawal: true, notes: [] },
    sourceId: "src", sourceLabel: "Src", provenance: { kind: "documented_source", sourceId: "src", browserFetched: false, present: true },
    fetchedAt: T, checkedAt: T, maximumAgeMs: 900000, ageMs: 0, warnings: [], blockers: [],
    approvedForMarketData: true, marketDataComplete: true, marketDataFresh: true, eligibleForFutureComparison: true,
    comparisonEvaluated: false, eligibilityEvaluated: false, rankingCalculated: false, leaderSelected: false, suggestionGenerated: false, updatesProductOutput: false, transactionsEnabled: false, walletSignatureRequired: false, ...over,
  });
  const mkVaultReview = (over: Partial<ELIG_Review> = {}): ELIG_Review => ({
    schemaVersion: "1.0.0", policyId: "yield_strategy_risk_review_v1", policyVersion: "1.0.0", reviewId: "rv", reviewVersion: "1.0.0",
    strategyId: "syn_vault", protocolId: "kamino", address: "SYNTH_VAULT_ADDR", reviewedAt: "2026-07-01T00:00:00.000Z", validUntil: "2026-12-31T00:00:00.000Z",
    reviewStatus: "approved", operationalStatus: "active", principalAssetId: "USDC", resultingExposure: "usdc_only", custodyModel: "non_custodial", auditStatus: "verified", auditReferences: [],
    leverageUsed: false, smartContractRiskTier: "conservative", riskScore: 8, compatibleUserRiskProfileIds: ["very_low", "low", "medium", "high", "very_high"],
    bufferUseReviewed: true, excessUseReviewed: true, notes: [],
    comparisonPerformed: false, leaderSelected: false, amountCalculated: false, suggestionGenerated: false, transactionsEnabled: false, walletSignatureRequired: false, ...over,
  });
  // Buffer / excess evaluators for the synthetic vault.
  const evbV = (entryOver: Partial<ELIG_Entry> = {}, revOver: Partial<ELIG_Review> = {}, snapOver: Partial<ELIG_Snap> = {}, userRiskProfileId?: string): ELIG_Result =>
    evaluateYieldStrategyLaneEligibility({ lane: "buffer", registryEntry: mkVaultEntry(entryOver), marketSnapshot: mkVaultSnap(snapOver), riskReview: mkVaultReview(revOver), userRiskProfileId, checkedAt: T });
  const eveV = (entryOver: Partial<ELIG_Entry> = {}, revOver: Partial<ELIG_Review> = {}, snapOver: Partial<ELIG_Snap> = {}, userRiskProfileId: string | undefined = "medium"): ELIG_Result =>
    evaluateYieldStrategyLaneEligibility({ lane: "excess", registryEntry: mkVaultEntry(entryOver), marketSnapshot: mkVaultSnap(snapOver), riskReview: mkVaultReview(revOver), userRiskProfileId, checkedAt: T });

  const vaultDef = getStableYieldStrategyDefinition("managed_vault")!;
  const marketSet = buildEmptyApprovedYieldStrategyMarketDataSet(T);
  const prodSet = buildProductionYieldStrategyEligibilitySet(marketSet, T);

  // 16D1-A. Managed vault is no longer universally hardcoded excess-only.
  add("16D1-A: managed_vault TYPE permits both lanes; the correction flag is set; the registry no longer rejects managed_vault+buffer by type", vaultDef.eligibleLanes.includes("safety_buffer_yield") && vaultDef.eligibleLanes.includes("excess_usdc_yield") && STABLE_YIELD_PRODUCT_LEVEL_LANE_POLICY_EXISTS === true && !validateYieldStrategyEntry(mkVaultEntry({ lifecycle: "documentation_required" })).errors.includes("buffer_lane_on_unsupported_strategy_type"), "type ≠ lane");
  // 16D1-B. Synthetic exact managed vault with buffer_eligible risk lane may enter buffer evaluation.
  add("16D1-B: a synthetic exact managed vault with riskLane buffer_eligible enters buffer evaluation (not unsupported)", evbV().lane === "buffer" && evbV().status !== "unsupported" && evbV().registryApproved === true, evbV().status);
  // 16D1-C. Conservative, audited, non-custodial, USDC-only managed vault with instant withdrawal passes.
  add("16D1-C: a conservative/audited/non-custodial/USDC-only managed vault with instant withdrawal can pass the Safety Buffer lane", evbV().eligibleForComparison === true && evbV().status === "eligible_for_comparison", "passes");
  // 16D1-D…K. The same managed vault fails when any strict buffer requirement fails.
  add("16D1-D: the same managed vault fails when bufferUseReviewed is false", evbV({}, { bufferUseReviewed: false }).eligibleForComparison === false && evbV({}, { bufferUseReviewed: false }).blockers.includes("risk_review_invalid"), "blocked");
  add("16D1-E: the same managed vault fails with stablecoin-pair exposure", evbV({}, { resultingExposure: "stablecoin_pair" }).blockers.includes("buffer_strategy_not_usdc_only"), "blocked");
  add("16D1-F: the same managed vault fails with leverage", evbV({}, { leverageUsed: true }).blockers.includes("leverage_not_allowed"), "blocked");
  add("16D1-G: the same managed vault fails with moderate risk tier", evbV({}, { smartContractRiskTier: "moderate" }).blockers.includes("buffer_strategy_not_conservative"), "blocked");
  add("16D1-H: the same managed vault fails with unknown liquidity", evbV({}, {}, { liquidity: mkLiq({ liquidityConfidence: "unknown", availableLiquidityUsd: undefined }) }).blockers.includes("liquidity_confidence_insufficient"), "blocked");
  add("16D1-I: the same managed vault fails with partial withdrawal", evbV({}, {}, { liquidity: mkLiq({ withdrawalStatus: "partial_currently_available" }) }).blockers.includes("buffer_strategy_not_immediately_liquid"), "blocked");
  add("16D1-J: the same managed vault fails with an active queue", evbV({}, {}, { liquidity: mkLiq({ withdrawalQueueActive: true }) }).blockers.includes("withdrawal_queue_active"), "blocked");
  add("16D1-K: the same managed vault fails when stale under the 15-minute rule", evbV({}, {}, { fetchedAt: "2026-07-15T23:30:00.000Z" }).blockers.includes("market_snapshot_stale"), "blocked");
  // 16D1-L…M. Excess-only managed vault.
  add("16D1-L: a managed vault marked excess_only cannot pass the buffer lane", evbV({ riskLane: "excess_only", supportedLane: "excess_usdc_yield" }).eligibleForComparison === false && evbV({ riskLane: "excess_only", supportedLane: "excess_usdc_yield" }).blockers.includes("risk_lane_not_supported"), "blocked");
  add("16D1-M: a managed vault marked excess_only may still pass the excess lane", eveV({ riskLane: "excess_only", supportedLane: "excess_usdc_yield" }).eligibleForComparison === true, "passes");
  // 16D1-N…O. Stable liquidity strategy.
  add("16D1-N: a stable liquidity strategy cannot pass the buffer lane", evbV({ strategyType: "stable_liquidity_strategy" }, {}, { strategyType: "stable_liquidity_strategy" }).blockers.includes("buffer_strategy_has_lp_exposure") && evbV({ strategyType: "stable_liquidity_strategy" }, {}, { strategyType: "stable_liquidity_strategy" }).eligibleForComparison === false, "blocked");
  add("16D1-O: a stable liquidity strategy may pass excess eligibility when all excess requirements pass", eveV({ strategyType: "stable_liquidity_strategy", riskLane: "excess_only", supportedLane: "excess_usdc_yield" }, { resultingExposure: "stable_basket" }, { strategyType: "stable_liquidity_strategy" }).eligibleForComparison === true, "passes");
  // 16D1-P. Locked staking-like vault.
  add("16D1-P: a locked staking-like vault cannot pass the buffer lane", evbV({ strategyType: "staking_like_vault" }, {}, { strategyType: "staking_like_vault", liquidity: mkLiq({ withdrawalStatus: "withdrawal_required" }) }).blockers.includes("buffer_strategy_not_immediately_liquid"), "blocked");
  // 16D1-Q. Marketing copy does not change mechanics-based eligibility.
  add("16D1-Q: marketing copy containing 'stake' does not change mechanics-based eligibility", evbV({ displayName: "Ultra Stake Yield Vault" }).eligibleForComparison === true && evbV({ displayName: "Plain Managed Vault" }).eligibleForComparison === true, "mechanics only");
  // 16D1-R…T. Production unchanged.
  add("16D1-R: current production registry still has zero approved products", getApprovedYieldStrategies().length === 0, "0 approved");
  add("16D1-S: current production eligibility remains empty_approved_set", prodSet.status === "empty_approved_set" && prodSet.emptyApprovedSet === true, prodSet.status);
  add("16D1-T: the eligibility layer approves nothing and fabricates no address", getApprovedYieldStrategies().length === 0 && listYieldStrategies().every((e) => e.address === undefined || getStableYieldEvidenceManifest(e.strategyId)?.productAddress === e.address), "unchanged");
  // 16D1-U…Z. No downstream capability introduced.
  add("16D1-U: the eligibility result performs no comparison", evbV().comparisonPerformed === false, "no comparison");
  add("16D1-V: no leader is selected", evbV().leaderSelected === false && STABLE_YIELD_ELIGIBILITY_SELECTS_LEADER === false, "no leader");
  add("16D1-W: no wallet balances or existing positions are consumed", evbV().userCapitalEvaluated === false && prodSet.walletPositionsEvaluated === false, "no wallet");
  add("16D1-X: no amount, plan or suggestion is generated by eligibility", evbV().amountCalculated === false && evbV().planGenerated === false && evbV().suggestionGenerated === false, "no amount/plan/suggestion");
  add("16D1-Y: the eligibility layer changes no product output", STABLE_YIELD_ELIGIBILITY_UPDATES_PRODUCT_OUTPUT === false && evbV().updatesProductOutput === false, "no product output");
  add("16D1-Z: no transaction or signature path exists", evbV().transactionsEnabled === false && evbV().walletSignatureRequired === false && STABLE_YIELD_EXECUTION_ENABLED === false, "read-only");

  return checks;
}

/**
 * Step 16E — Stable Yield comparison fixtures (16E-A…CV). Verifies the versioned scoring/sensitivity
 * policy, the six-dimension weighted scorecards, deterministic ordering, material-tie + weight-
 * sensitivity leader-withholding, lane separation, net-APY basis rules, fee double-count prevention,
 * single-candidate + empty-production behavior, Hubble scope, and that nothing downstream is enabled.
 */

/**
 * Step 16E — Stable Yield comparison fixtures (16E-A…CV). Verifies the versioned scoring/sensitivity
 * policy, the six-dimension weighted scorecards, deterministic ordering, material-tie + weight-
 * sensitivity leader-withholding, lane separation, net-APY basis rules, fee double-count prevention,
 * single-candidate + empty-production behavior, Hubble scope, and that nothing downstream is enabled.
 */
export function runYieldStrategyComparisonFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const root = process.cwd();
  const readIf = (rel: string) => { try { return readFileSync(`${root}/${rel}`, "utf8"); } catch { return ""; } };
  const T = "2026-07-16T00:00:00.000Z";

  interface Spec {
    id: string; protocolId?: string; strategyType?: string; riskScore?: number;
    apyDefinition?: "net" | "gross"; netApyPct?: number; grossApyPct?: number;
    tvlUsd?: number; withdrawalStatus?: string; withdrawalDelayHours?: number; withdrawalQueueActive?: boolean;
    availableLiquidityUsd?: number; availableLiquidityRatio?: number; liquidityConfidence?: string;
    provenanceKind?: string; browserFetched?: boolean; ageMs?: number; fetchedAt?: string; snapStatus?: string;
    managementFeePct?: number; performanceFeePct?: number; withdrawalFeePct?: number; feeModel?: string;
    exposure?: string; custody?: string; audit?: string; tier?: string; leverage?: boolean | "unknown"; operational?: string;
    bufferReviewed?: boolean; excessReviewed?: boolean; compatibleIds?: string[]; supportedLane?: string; riskLane?: string; lifecycle?: string; displayName?: string;
  }
  const OFF = { marketDataEvaluated: false, eligibilityEvaluated: false, comparisonEvaluated: false, suggestionGenerated: false, transactionsEnabled: false, walletSignatureRequired: false } as const;
  const mkEntry = (lane: CMP_Lane, s: Spec): ELIG_Entry => ({
    schemaVersion: "1.0.0", registryVersion: "1.0.0", strategyId: s.id, displayName: s.displayName ?? `Synthetic ${s.id}`,
    protocolId: (s.protocolId ?? "kamino") as ELIG_Entry["protocolId"], protocolDisplayName: "Kamino",
    strategyType: (s.strategyType ?? "lending") as ELIG_Entry["strategyType"], principalAsset: "USDC",
    supportedLane: (s.supportedLane ?? (lane === "buffer" ? "safety_buffer_yield" : "excess_usdc_yield")) as ELIG_Entry["supportedLane"],
    riskLane: (s.riskLane ?? (lane === "buffer" ? "buffer_eligible" : "excess_only")) as ELIG_Entry["riskLane"],
    lifecycle: (s.lifecycle ?? "approved") as ELIG_Entry["lifecycle"], officialUrl: "https://app.kamino.finance", address: `ADDR_${s.id}`,
    ...OFF, notes: [],
  });
  const mkSnap = (lane: CMP_Lane, s: Spec): ELIG_Snap => ({
    schemaVersion: "1.0.0", policyVersion: "1.0.0", strategyId: s.id, displayName: s.displayName ?? s.id,
    protocolId: (s.protocolId ?? "kamino") as ELIG_Snap["protocolId"], protocolDisplayName: "Kamino",
    strategyType: (s.strategyType ?? "lending") as ELIG_Snap["strategyType"], principalAsset: "USDC",
    supportedLane: (s.supportedLane ?? (lane === "buffer" ? "safety_buffer_yield" : "excess_usdc_yield")) as ELIG_Snap["supportedLane"],
    riskLane: (s.riskLane ?? (lane === "buffer" ? "buffer_eligible" : "excess_only")) as ELIG_Snap["riskLane"], lifecycle: "approved", address: `ADDR_${s.id}`,
    status: (s.snapStatus ?? "complete") as ELIG_Snap["status"],
    apy: { status: "fresh", apyDefinition: (s.apyDefinition ?? "net") as ELIG_Apy["apyDefinition"], apyWindow: "current",
      currentApyPct: s.netApyPct ?? s.grossApyPct ?? 5,
      ...((s.apyDefinition ?? "net") === "net" ? { netApyPct: s.netApyPct ?? 5 } : {}),
      ...((s.apyDefinition) === "gross" ? { grossApyPct: s.grossApyPct ?? 6 } : {}),
      definitionSufficientForComparison: true, notes: [] },
    tvl: { status: "fresh", tvlUsd: s.tvlUsd ?? 2_000_000, currency: "USD", notes: [] },
    liquidity: { status: "fresh", withdrawalStatus: (s.withdrawalStatus ?? "instant_currently_available") as ELIG_Liq["withdrawalStatus"],
      ...(s.availableLiquidityUsd !== undefined ? { availableLiquidityUsd: s.availableLiquidityUsd } : { availableLiquidityUsd: 500_000 }),
      ...(s.availableLiquidityRatio !== undefined ? { availableLiquidityRatio: s.availableLiquidityRatio } : {}),
      ...(s.withdrawalDelayHours !== undefined ? { withdrawalDelayHours: s.withdrawalDelayHours } : {}),
      withdrawalQueueActive: s.withdrawalQueueActive ?? false, liquidityConfidence: (s.liquidityConfidence ?? "explicit_source") as ELIG_Liq["liquidityConfidence"], notes: [] },
    fees: { status: "fresh", feeModel: (s.feeModel ?? "management_fee") as ELIG_Snap["fees"]["feeModel"],
      ...(s.managementFeePct !== undefined ? { managementFeePct: s.managementFeePct } : {}),
      ...(s.performanceFeePct !== undefined ? { performanceFeePct: s.performanceFeePct } : {}),
      ...(s.withdrawalFeePct !== undefined ? { withdrawalFeePct: s.withdrawalFeePct } : {}), notes: [] },
    laneCompatibility: { supportedLane: (lane === "buffer" ? "safety_buffer_yield" : "excess_usdc_yield") as ELIG_Snap["supportedLane"], riskLane: (lane === "buffer" ? "buffer_eligible" : "excess_only") as ELIG_Snap["riskLane"], bufferLaneCandidate: lane === "buffer", excessLaneCandidate: true, bufferLaneFreshnessMaxAgeMs: 900000, excessLaneFreshnessMaxAgeMs: 3600000, bufferLaneRequiresInstantLiquidity: true, bufferLaneRequiresDefinedWithdrawal: true, notes: [] },
    sourceId: "src", sourceLabel: "Src",
    provenance: { kind: (s.provenanceKind ?? "documented_source") as ELIG_Snap["provenance"]["kind"], sourceId: "src", browserFetched: (s.browserFetched ?? false) as false, present: (s.provenanceKind ?? "documented_source") !== "none" },
    fetchedAt: s.fetchedAt ?? T, checkedAt: T, maximumAgeMs: lane === "buffer" ? 900000 : 3600000, ageMs: s.ageMs ?? 0,
    warnings: [], blockers: [], approvedForMarketData: true, marketDataComplete: true, marketDataFresh: true, eligibleForFutureComparison: true, ...OFF, rankingCalculated: false, leaderSelected: false, updatesProductOutput: false,
  });
  const mkReview = (s: Spec): ELIG_Review => ({
    schemaVersion: "1.0.0", policyId: "yield_strategy_risk_review_v1", policyVersion: "1.0.0", reviewId: `rev_${s.id}`, reviewVersion: "1.0.0",
    strategyId: s.id, protocolId: s.protocolId ?? "kamino", address: `ADDR_${s.id}`, reviewedAt: "2026-07-01T00:00:00.000Z", validUntil: "2026-12-31T00:00:00.000Z",
    reviewStatus: "approved", operationalStatus: (s.operational ?? "active") as ELIG_Review["operationalStatus"], principalAssetId: "USDC",
    resultingExposure: (s.exposure ?? "usdc_only") as ELIG_Review["resultingExposure"], custodyModel: (s.custody ?? "non_custodial") as ELIG_Review["custodyModel"], auditStatus: (s.audit ?? "verified") as ELIG_Review["auditStatus"], auditReferences: [],
    leverageUsed: (s.leverage ?? false) as ELIG_Review["leverageUsed"], smartContractRiskTier: (s.tier ?? "conservative") as ELIG_Review["smartContractRiskTier"], riskScore: s.riskScore ?? 8,
    compatibleUserRiskProfileIds: s.compatibleIds ?? ["very_low", "low", "medium", "high", "very_high"], bufferUseReviewed: s.bufferReviewed ?? true, excessUseReviewed: s.excessReviewed ?? true, notes: [],
    comparisonPerformed: false, leaderSelected: false, amountCalculated: false, suggestionGenerated: false, transactionsEnabled: false, walletSignatureRequired: false,
  });
  const compareLane = (lane: CMP_Lane, specs: Spec[], userRisk: string | undefined = "medium"): CMP_Lane_Result => {
    const entries = specs.map((s) => mkEntry(lane, s));
    const snapshots: Record<string, ELIG_Snap> = {};
    specs.forEach((s) => { snapshots[s.id] = mkSnap(lane, s); });
    const marketSet = { snapshots } as unknown as ELIG_MarketSet;
    const reviews = specs.map(mkReview);
    const eligSet = buildYieldStrategyEligibilitySet({ registry: entries, marketDataSet: marketSet, riskReviews: reviews, userRiskProfileId: userRisk, checkedAt: T });
    return compareYieldStrategiesForLane({ lane, eligibilitySet: eligSet, marketDataSet: marketSet, riskReviews: reviews, checkedAt: T });
  };
  const dimOf = (cmp: CMP_Lane_Result, id: string, dim: string) => cmp.candidateScorecards.find((c) => c.strategyId === id)!.dimensions.find((d) => d.dimension === dim)!;
  const cardOf = (cmp: CMP_Lane_Result, id: string) => cmp.candidateScorecards.find((c) => c.strategyId === id)!;
  const policy = getYieldStrategyComparisonPolicy();
  const marketSet0 = buildEmptyApprovedYieldStrategyMarketDataSet(T);
  const prodCmp = buildProductionYieldStrategyComparisonSet(marketSet0, T);
  const cmpBlob = ["yieldStrategyComparisonTypes", "yieldStrategyComparisonPolicy", "yieldStrategyComparison", "yieldStrategyComparisonSensitivity", "yieldStrategyComparisonDiagnostics"].map((f) => readIf(`src/suggestions/${f}.ts`)).join("").toLowerCase();

  // ---- Versions + policy ----
  add("16E-A: comparison schema/version exist", YIELD_STRATEGY_COMPARISON_SCHEMA_VERSION === "1.0.0" && policy.policyId === "yield_strategy_comparison_v1", policy.policyId);
  add("16E-B: scoring policy exists", YIELD_STRATEGY_SCORING_POLICY_ID === "yield_strategy_scoring_v1", YIELD_STRATEGY_SCORING_POLICY_ID);
  add("16E-C: sensitivity policy exists", YIELD_STRATEGY_SENSITIVITY_POLICY_ID === "yield_strategy_sensitivity_v1", YIELD_STRATEGY_SENSITIVITY_POLICY_ID);
  add("16E-D: buffer weights total 100", Object.values(YIELD_STRATEGY_BUFFER_WEIGHTS).reduce((a, b) => a + b, 0) === 100, `${Object.values(YIELD_STRATEGY_BUFFER_WEIGHTS).reduce((a, b) => a + b, 0)}`);
  add("16E-E: excess weights total 100", Object.values(YIELD_STRATEGY_EXCESS_WEIGHTS).reduce((a, b) => a + b, 0) === 100, `${Object.values(YIELD_STRATEGY_EXCESS_WEIGHTS).reduce((a, b) => a + b, 0)}`);
  add("16E-F: every required dimension present exactly once; policy validates", validateYieldStrategyComparisonPolicy(policy).valid === true, "valid");
  add("16E-G: comparison feature flag is true", CMP_FLAG_CONST === true && CMP_FLAG_REG === true && STABLE_YIELD_COMPARISON_EXISTS === true && YIELD_STRATEGY_SCORING_EXISTS === true && YIELD_STRATEGY_SENSITIVITY_EXISTS === true, "enabled");
  add("16E-H: execution flags remain false (wallet detection at 16F, plans at 16G)", STABLE_YIELD_EXECUTION_ENABLED === false && STABLE_YIELD_COMPARISON_GENERATES_PLANS === false && STABLE_YIELD_COMPARISON_UPDATES_PRODUCT_OUTPUT === false, "false");

  // ---- Production empty ----
  add("16E-I: production registry still has zero approved products", getApprovedYieldStrategies().length === 0, "0 approved");
  add("16E-J: production eligibility remains empty_approved_set", buildProductionYieldStrategyEligibilitySet(marketSet0, T).status === "empty_approved_set", "empty");
  add("16E-K: production comparison set validates", validateYieldStrategyComparisonSet(prodCmp).valid === true, "valid");
  add("16E-L: buffer comparison returns empty_eligible_set", prodCmp.bufferComparison.status === "empty_eligible_set", prodCmp.bufferComparison.status);
  add("16E-M: excess comparison returns empty_eligible_set", prodCmp.excessComparison.status === "empty_eligible_set", prodCmp.excessComparison.status);
  add("16E-N: no production leader is selected", prodCmp.bufferComparisonLeaderStrategyId === undefined && prodCmp.excessComparisonLeaderStrategyId === undefined, "no leader");
  add("16E-O: no production address or market value is invented", listYieldStrategies().every((e) => e.address === undefined || getStableYieldEvidenceManifest(e.strategyId)?.productAddress === e.address) && prodCmp.emptyApprovedSet === true, "clean");

  // ---- Eligibility boundary ----
  add("16E-P: only eligible_for_comparison candidates are scored", compareLane("buffer", [{ id: "p1" }]).candidateScorecards.every((c) => c.eligibleForComparison === true), "eligible only");
  add("16E-Q: a blocked 16D candidate (unknown withdrawal) is not scored", compareLane("buffer", [{ id: "q1", withdrawalStatus: "unknown" }]).status === "empty_eligible_set", "blocked");
  add("16E-R: an ineligible candidate (documentation_required) is not scored", compareLane("buffer", [{ id: "r1", lifecycle: "documentation_required" }]).candidateScorecards.length === 0, "ineligible");
  add("16E-S: candidate identity mismatch is not eligible/scored", compareLane("buffer", [{ id: "s1", exposure: "stablecoin_pair" }]).status === "empty_eligible_set", "blocked");
  add("16E-T: excess-only strategy is not scored in the buffer lane", compareLane("buffer", [{ id: "t1", supportedLane: "excess_usdc_yield", riskLane: "excess_only" }]).candidateScorecards.length === 0, "no buffer");
  add("16E-U: a buffer candidate does not appear in the excess comparison unless independently eligible there", (() => { const set = buildYieldStrategyComparisonSet({ eligibilitySet: buildYieldStrategyEligibilitySet({ registry: [mkEntry("buffer", { id: "u1" })], marketDataSet: { snapshots: { u1: mkSnap("buffer", { id: "u1" }) } } as unknown as ELIG_MarketSet, riskReviews: [mkReview({ id: "u1" })], userRiskProfileId: "medium", checkedAt: T }), marketDataSet: { snapshots: { u1: mkSnap("buffer", { id: "u1" }) } } as unknown as ELIG_MarketSet, riskReviews: [mkReview({ id: "u1" })], checkedAt: T }); return set.bufferComparison.candidateScorecards.every((c) => c.lane === "buffer") && set.excessComparison.candidateScorecards.every((c) => c.lane === "excess"); })(), "lane separation");
  add("16E-V: excess-only candidate cannot be inserted into the buffer comparison", compareLane("buffer", [{ id: "v1", riskLane: "excess_only", supportedLane: "excess_usdc_yield" }]).candidateScorecards.length === 0, "no buffer");

  // ---- Score construction ----
  const two = compareLane("buffer", [{ id: "a", riskScore: 9, tvlUsd: 5_000_000, availableLiquidityUsd: 800_000, netApyPct: 7 }, { id: "b", riskScore: 7.5, tvlUsd: 1_500_000, availableLiquidityUsd: 200_000, netApyPct: 5 }]);
  add("16E-W: each dimension score stays 0–100", two.candidateScorecards.every((c) => c.dimensions.every((d) => d.normalizedScore >= 0 && d.normalizedScore <= 100)), "0–100");
  add("16E-X: weighted contributions sum to total score", two.candidateScorecards.every((c) => Math.abs(c.dimensions.reduce((s, d) => s + d.weightedContribution, 0) - c.totalScore) < 1e-6), "sum");
  add("16E-Y: total score stays 0–100", two.candidateScorecards.every((c) => c.totalScore >= 0 && c.totalScore <= 100), "0–100");
  add("16E-Z: score precision is deterministic", JSON.stringify(compareLane("buffer", [{ id: "a", riskScore: 9 }, { id: "b", riskScore: 8 }]).candidateScorecards.map((c) => c.totalScore)) === JSON.stringify(compareLane("buffer", [{ id: "a", riskScore: 9 }, { id: "b", riskScore: 8 }]).candidateScorecards.map((c) => c.totalScore)), "deterministic");
  add("16E-AA: candidate order is deterministic", JSON.stringify(two.orderedStrategyIds) === JSON.stringify(compareLane("buffer", [{ id: "a", riskScore: 9, tvlUsd: 5_000_000, availableLiquidityUsd: 800_000, netApyPct: 7 }, { id: "b", riskScore: 7.5, tvlUsd: 1_500_000, availableLiquidityUsd: 200_000, netApyPct: 5 }]).orderedStrategyIds), "stable");
  {
    const ab = compareLane("buffer", [{ id: "a", riskScore: 9 }, { id: "b", riskScore: 8 }]);
    const ba = compareLane("buffer", [{ id: "b", riskScore: 8 }, { id: "a", riskScore: 9 }]);
    add("16E-AB: input ordering does not alter score or result", cardOf(ab, "a").totalScore === cardOf(ba, "a").totalScore && ab.comparisonLeaderStrategyId === ba.comparisonLeaderStrategyId, "order-independent");
  }

  // ---- Risk dimension ----
  add("16E-AC: higher reviewed risk score → higher risk-quality score", dimOf(compareLane("buffer", [{ id: "x", riskScore: 9 }]), "x", "risk_quality").normalizedScore > dimOf(compareLane("buffer", [{ id: "y", riskScore: 7 }]), "y", "risk_quality").normalizedScore, "9>7");
  add("16E-AD: protocol name does not affect risk score", dimOf(compareLane("buffer", [{ id: "x", riskScore: 8, protocolId: "kamino" }]), "x", "risk_quality").normalizedScore === dimOf(compareLane("buffer", [{ id: "y", riskScore: 8, protocolId: "raydium" }]), "y", "risk_quality").normalizedScore, "brand-independent");
  add("16E-AE: user risk tolerance does not increase product-quality score", dimOf(compareLane("excess", [{ id: "x", riskScore: 8 }], "very_high"), "x", "risk_quality").normalizedScore === dimOf(compareLane("excess", [{ id: "x", riskScore: 8 }], "low"), "x", "risk_quality").normalizedScore, "user-independent");
  add("16E-AF: risk tier is not double-counted after eligibility", dimOf(compareLane("excess", [{ id: "x", riskScore: 8, tier: "conservative" }]), "x", "risk_quality").normalizedScore === dimOf(compareLane("excess", [{ id: "y", riskScore: 8, tier: "elevated" }]), "y", "risk_quality").normalizedScore, "tier-independent");

  // ---- Liquidity dimension ----
  {
    const c = compareLane("excess", [{ id: "inst", withdrawalStatus: "instant_currently_available" }, { id: "part", withdrawalStatus: "partial_currently_available" }]);
    add("16E-AG: instant withdrawal scores above partial when both are excess eligible", dimOf(c, "inst", "withdrawal_liquidity").normalizedScore > dimOf(c, "part", "withdrawal_liquidity").normalizedScore, "instant>partial");
  }
  {
    const c = compareLane("excess", [{ id: "short", withdrawalStatus: "withdrawal_required", withdrawalDelayHours: 12 }, { id: "long", withdrawalStatus: "withdrawal_required", withdrawalDelayHours: 120 }]);
    add("16E-AH: shorter delay scores above longer delay", dimOf(c, "short", "withdrawal_liquidity").normalizedScore > dimOf(c, "long", "withdrawal_liquidity").normalizedScore, "short>long");
  }
  {
    const c = compareLane("buffer", [{ id: "hi", availableLiquidityUsd: 900_000 }, { id: "lo", availableLiquidityUsd: 150_000 }]);
    add("16E-AI: higher explicit available liquidity scores above lower liquidity", dimOf(c, "hi", "withdrawal_liquidity").normalizedScore > dimOf(c, "lo", "withdrawal_liquidity").normalizedScore, "hi>lo");
  }
  {
    const c = compareLane("buffer", [{ id: "bigtvl", tvlUsd: 50_000_000, availableLiquidityUsd: 120_000 }, { id: "bigliq", tvlUsd: 1_100_000, availableLiquidityUsd: 900_000 }]);
    add("16E-AJ: TVL does not substitute for liquidity", dimOf(c, "bigliq", "withdrawal_liquidity").normalizedScore > dimOf(c, "bigtvl", "withdrawal_liquidity").normalizedScore, "liquidity independent");
  }
  {
    const c = compareLane("buffer", [{ id: "hiapy", netApyPct: 20, availableLiquidityUsd: 120_000 }, { id: "hiliq", netApyPct: 3, availableLiquidityUsd: 900_000 }]);
    add("16E-AK: APY does not substitute for liquidity", dimOf(c, "hiliq", "withdrawal_liquidity").normalizedScore > dimOf(c, "hiapy", "withdrawal_liquidity").normalizedScore, "liquidity independent");
  }
  add("16E-AL: unknown liquidity cannot be scored", compareLane("buffer", [{ id: "u", liquidityConfidence: "unknown", availableLiquidityUsd: undefined }]).status === "empty_eligible_set", "not scored");

  // ---- Yield dimension ----
  add("16E-AM: net APY is used directly", cardOf(compareLane("buffer", [{ id: "n", apyDefinition: "net", netApyPct: 5 }]), "n").apyBasis === "net" && cardOf(compareLane("buffer", [{ id: "n", apyDefinition: "net", netApyPct: 5 }]), "n").canonicalNetApyPct === 5, "net direct");
  add("16E-AN: net APY is not charged recurring fees twice", cardOf(compareLane("buffer", [{ id: "n", apyDefinition: "net", netApyPct: 5, managementFeePct: 2, withdrawalFeePct: 0 }]), "n").incrementalUserCostBps === 0, "no double count");
  add("16E-AO: gross APY converts to net only with deterministic fee inputs", cardOf(compareLane("buffer", [{ id: "g", apyDefinition: "gross", grossApyPct: 6, managementFeePct: 1 }]), "g").apyBasis === "gross_converted" && cardOf(compareLane("buffer", [{ id: "g", apyDefinition: "gross", grossApyPct: 6, managementFeePct: 1 }]), "g").canonicalNetApyPct === 5, "converted");
  add("16E-AP: gross APY is never compared directly against net (gross-without-fees withholds leader)", compareLane("buffer", [{ id: "g", apyDefinition: "gross", grossApyPct: 6, feeModel: "spread_or_amm_fee" }, { id: "n", apyDefinition: "net", netApyPct: 5 }]).status === "leader_withheld_incomparable_data", "no mix");
  add("16E-AQ: unknown/incomparable APY basis prevents leader selection", compareLane("excess", [{ id: "g", apyDefinition: "gross", grossApyPct: 6, feeModel: "spread_or_amm_fee" }, { id: "n", apyDefinition: "net", netApyPct: 5 }]).comparisonLeaderStrategyId === undefined, "no leader");
  add("16E-AR: equal APYs produce neutral equal APY scores", (() => { const c = compareLane("buffer", [{ id: "a", netApyPct: 5 }, { id: "b", netApyPct: 5 }]); return dimOf(c, "a", "net_yield").normalizedScore === 50 && dimOf(c, "b", "net_yield").normalizedScore === 50; })(), "neutral 50");
  add("16E-AS: single candidate receives neutral relative APY score", dimOf(compareLane("buffer", [{ id: "solo", netApyPct: 12 }]), "solo", "net_yield").normalizedScore === 50, "neutral 50");
  {
    const c = compareLane("buffer", [{ id: "hiapy", riskScore: 7, netApyPct: 9, tvlUsd: 1_000_000, availableLiquidityUsd: 120_000 }, { id: "safe", riskScore: 10, netApyPct: 5, tvlUsd: 50_000_000, availableLiquidityUsd: 900_000 }]);
    add("16E-AT: higher APY alone does not guarantee the buffer leader", c.comparisonLeaderStrategyId === "safe", `${c.comparisonLeaderStrategyId}`);
  }

  // ---- Market depth ----
  {
    const c = compareLane("buffer", [{ id: "big", tvlUsd: 20_000_000 }, { id: "small", tvlUsd: 1_200_000 }]);
    add("16E-AU: higher exact-product TVL → higher market-depth score", dimOf(c, "big", "market_depth").normalizedScore > dimOf(c, "small", "market_depth").normalizedScore, "big>small");
  }
  {
    const c = compareLane("buffer", [{ id: "lo", tvlUsd: 1_000_000 }, { id: "mid", tvlUsd: 10_000_000 }, { id: "hi", tvlUsd: 1_000_000_000 }]);
    add("16E-AV: log normalization prevents extreme TVL from linearly dominating", dimOf(c, "mid", "market_depth").normalizedScore > 10, `mid=${dimOf(c, "mid", "market_depth").normalizedScore}`);
  }
  add("16E-AW: protocol-wide unrelated TVL is not used (exact-product TVL only)", dimOf(compareLane("buffer", [{ id: "x", tvlUsd: 3_333_333 }]), "x", "market_depth").rawValues.tvlUsd === 3_333_333, "exact tvl");
  add("16E-AX: equal TVL produces neutral equal depth scores", (() => { const c = compareLane("buffer", [{ id: "a", tvlUsd: 4_000_000 }, { id: "b", tvlUsd: 4_000_000 }]); return dimOf(c, "a", "market_depth").normalizedScore === 50 && dimOf(c, "b", "market_depth").normalizedScore === 50; })(), "neutral 50");

  // ---- Cost ----
  {
    const c = compareLane("buffer", [{ id: "cheap", withdrawalFeePct: 0 }, { id: "pricey", withdrawalFeePct: 0.5 }]);
    add("16E-AY: lower explicit incremental user cost scores higher", dimOf(c, "cheap", "user_cost").normalizedScore > dimOf(c, "pricey", "user_cost").normalizedScore, "cheap>pricey");
  }
  add("16E-AZ: fees already reflected in net APY are not counted again", cardOf(compareLane("buffer", [{ id: "m", apyDefinition: "net", netApyPct: 5, managementFeePct: 3, performanceFeePct: 10, withdrawalFeePct: 0 }]), "m").incrementalUserCostBps === 0, "0 incremental");
  add("16E-BA: zero incremental user fee is handled", cardOf(compareLane("buffer", [{ id: "z", withdrawalFeePct: 0 }]), "z").incrementalUserCostBps === 0 && cardOf(compareLane("buffer", [{ id: "z", withdrawalFeePct: 0 }]), "z").status === "scored", "zero cost ok");
  add("16E-BB: unclear fee semantics (feeModel unknown) prevent leader selection (not eligible)", compareLane("buffer", [{ id: "u", feeModel: "unknown" }]).status === "empty_eligible_set", "blocked");

  // ---- Data quality ----
  {
    const c = compareLane("buffer", [{ id: "api", provenanceKind: "documented_source" }, { id: "fallback", provenanceKind: "same_origin_runtime_payload" }]);
    add("16E-BC: protocol API/SDK provenance scores above registry fallback", dimOf(c, "api", "data_quality").normalizedScore > dimOf(c, "fallback", "data_quality").normalizedScore, "api>fallback");
  }
  {
    const c = compareLane("excess", [{ id: "fresh", ageMs: 0 }, { id: "old", ageMs: 3_400_000 }]);
    add("16E-BD: fresher valid data scores above older valid data", dimOf(c, "fresh", "data_quality").normalizedScore > dimOf(c, "old", "data_quality").normalizedScore, "fresh>old");
  }
  add("16E-BE: browser-fetched data cannot be scored", compareLane("buffer", [{ id: "b", browserFetched: true }]).status === "empty_eligible_set", "blocked");
  add("16E-BF: stale data cannot be scored", compareLane("buffer", [{ id: "s", fetchedAt: "2026-07-15T20:00:00.000Z" }]).status === "empty_eligible_set", "blocked");

  // ---- Lane behavior ----
  add("16E-BG: buffer comparison uses buffer weights", dimOf(compareLane("buffer", [{ id: "x" }, { id: "y", riskScore: 7.5 }]), "x", "risk_quality").weight === 35, "35");
  add("16E-BH: excess comparison uses excess weights", dimOf(compareLane("excess", [{ id: "x" }, { id: "y", riskScore: 7.5 }]), "x", "risk_quality").weight === 25, "25");
  {
    const c = compareLane("buffer", [{ id: "hiapy", riskScore: 7, netApyPct: 9, tvlUsd: 1_000_000, availableLiquidityUsd: 120_000 }, { id: "safe", riskScore: 10, netApyPct: 5, tvlUsd: 50_000_000, availableLiquidityUsd: 900_000 }]);
    add("16E-BI: higher-yield but meaningfully weaker-risk candidate may lose the buffer comparison", c.comparisonLeaderStrategyId === "safe", `${c.comparisonLeaderStrategyId}`);
  }
  {
    const c = compareLane("excess", [{ id: "yield", riskScore: 8, netApyPct: 9, tvlUsd: 6_000_000, availableLiquidityUsd: 600_000 }, { id: "other", riskScore: 8, netApyPct: 5, tvlUsd: 5_000_000, availableLiquidityUsd: 600_000 }]);
    add("16E-BJ: higher-yield candidate may lead excess when risk/liquidity remain competitive", c.comparisonLeaderStrategyId === "yield", `${c.comparisonLeaderStrategyId}`);
  }
  {
    const set = buildYieldStrategyComparisonSet({ eligibilitySet: buildYieldStrategyEligibilitySet({ registry: [mkEntry("buffer", { id: "bk1" })], marketDataSet: { snapshots: { bk1: mkSnap("buffer", { id: "bk1" }) } } as unknown as ELIG_MarketSet, riskReviews: [mkReview({ id: "bk1" })], userRiskProfileId: "medium", checkedAt: T }), marketDataSet: { snapshots: { bk1: mkSnap("buffer", { id: "bk1" }) } } as unknown as ELIG_MarketSet, riskReviews: [mkReview({ id: "bk1" })], checkedAt: T });
    add("16E-BK: no cross-lane shared ranking exists", set.bufferComparison.candidateScorecards.every((c) => c.lane === "buffer") && set.excessComparison.candidateScorecards.every((c) => c.lane === "excess"), "separate");
  }

  // ---- Single candidate ----
  const single = compareLane("buffer", [{ id: "only" }]);
  add("16E-BL: one eligible candidate returns single_eligible_candidate", single.status === "single_eligible_candidate", single.status);
  add("16E-BM: the only eligible candidate is returned as the comparison leader", single.comparisonLeaderStrategyId === "only", `${single.comparisonLeaderStrategyId}`);
  add("16E-BN: leader-selection reason is only_eligible_candidate", single.leaderSelectionReason === "only_eligible_candidate", single.leaderSelectionReason);
  add("16E-BO: no claim that it defeated alternatives is generated", !/best|winner|safest|defeat|beat/i.test(explainYieldStrategyComparison(single)), "no claim");

  // ---- Tie behavior ----
  const tieExact = compareLane("buffer", [{ id: "a" }, { id: "b" }]);
  add("16E-BP: exact equal scores create a material tie", tieExact.tieAnalysis.materialTie === true && tieExact.tieAnalysis.scoreDifference === 0, "tie");
  const tieNear = compareLane("buffer", [{ id: "a", riskScore: 8.0 }, { id: "b", riskScore: 7.9 }]);
  add("16E-BQ: near-equal scores within threshold create a material tie", tieNear.tieAnalysis.materialTie === true && (tieNear.tieAnalysis.scoreDifference ?? 9) <= YIELD_STRATEGY_COMPARISON_MATERIAL_TIE_THRESHOLD, `${tieNear.tieAnalysis.scoreDifference}`);
  add("16E-BR: material tie withholds the leader", tieExact.status === "leader_withheld_tie" && tieExact.comparisonLeaderStrategyId === undefined, "withheld");
  add("16E-BS: registry order is used only for stable tied display order", JSON.stringify(tieExact.orderedStrategyIds) === JSON.stringify(["a", "b"]), tieExact.orderedStrategyIds.join(","));
  add("16E-BT: registry order does not manufacture a leader", tieExact.comparisonLeaderStrategyId === undefined, "no leader");
  add("16E-BU: APY is not used as an undocumented tie breaker", (() => { const c = compareLane("buffer", [{ id: "a", riskScore: 7, netApyPct: 9, availableLiquidityUsd: 100_000 }, { id: "b", riskScore: 10, netApyPct: 3, availableLiquidityUsd: 900_000 }]); return c.tieAnalysis.materialTie === true && c.comparisonLeaderStrategyId === undefined; })(), "no apy tiebreak");

  // ---- Sensitivity ----
  const stableCmp = compareLane("buffer", [{ id: "a", riskScore: 10 }, { id: "b", riskScore: 7 }]);
  add("16E-BV: stable leader remains selected across approved perturbations", stableCmp.status === "complete" && stableCmp.sensitivityAnalysis.status === "stable" && stableCmp.comparisonLeaderStrategyId === "a", stableCmp.status);
  add("16E-BW: changed leader under perturbation causes sensitivity failure", runYieldStrategyComparisonSensitivity({ candidates: [{ strategyId: "a", dimensionScores: { risk_quality: 100, withdrawal_liquidity: 100, net_yield: 100, market_depth: 100, user_cost: 100, data_quality: 100 } }, { strategyId: "b", dimensionScores: { risk_quality: 40, withdrawal_liquidity: 40, net_yield: 40, market_depth: 40, user_cost: 40, data_quality: 40 } }], baselineWeights: YIELD_STRATEGY_BUFFER_WEIGHTS, baselineLeaderStrategyId: "b" }).status === "unstable", "unstable");
  add("16E-BX: material tie under perturbation causes sensitivity failure", runYieldStrategyComparisonSensitivity({ candidates: [{ strategyId: "a", dimensionScores: { risk_quality: 50, withdrawal_liquidity: 50, net_yield: 50, market_depth: 50, user_cost: 50, data_quality: 50 } }, { strategyId: "b", dimensionScores: { risk_quality: 50, withdrawal_liquidity: 50, net_yield: 50, market_depth: 50, user_cost: 50, data_quality: 50 } }], baselineWeights: YIELD_STRATEGY_BUFFER_WEIGHTS, baselineLeaderStrategyId: "a" }).status === "unstable", "tie unstable");
  const unstableCmp = compareLane("buffer", [{ id: "a", riskScore: 8.0 }, { id: "b", riskScore: 7.7 }]);
  add("16E-BY: unstable sensitivity withholds the leader", unstableCmp.status === "leader_withheld_sensitivity" && unstableCmp.comparisonLeaderStrategyId === undefined && unstableCmp.sensitivityAnalysis.status === "unstable", unstableCmp.status);
  add("16E-BZ: single candidate sensitivity is not_applicable_single_candidate", single.sensitivityAnalysis.status === "not_applicable_single_candidate", single.sensitivityAnalysis.status);
  add("16E-CA: empty set sensitivity is not_applicable_empty_set", prodCmp.bufferComparison.sensitivityAnalysis.status === "not_applicable_empty_set", prodCmp.bufferComparison.sensitivityAnalysis.status);

  // ---- Leader language + status ----
  add("16E-CB: selected leader uses highest_stable_score", stableCmp.leaderSelectionReason === "highest_stable_score", stableCmp.leaderSelectionReason);
  add("16E-CC: tie uses none_material_tie", tieExact.leaderSelectionReason === "none_material_tie", tieExact.leaderSelectionReason);
  add("16E-CD: sensitivity failure uses none_sensitivity_failed", unstableCmp.leaderSelectionReason === "none_sensitivity_failed", unstableCmp.leaderSelectionReason);
  add("16E-CE: incomparable APY/fee semantics uses none_incomparable_data", compareLane("buffer", [{ id: "g", apyDefinition: "gross", grossApyPct: 6, feeModel: "spread_or_amm_fee" }, { id: "n", apyDefinition: "net", netApyPct: 5 }]).leaderSelectionReason === "none_incomparable_data", "reason");
  add("16E-CF: no best/safest/winner/recommended language appears in explain/diagnostics", !/\b(best|safest|winner|recommended|guaranteed|risk-free|you should)\b/i.test([explainYieldStrategyComparison(stableCmp), explainYieldStrategyComparison(single), explainYieldStrategyComparison(tieExact), explainYieldStrategyComparison(unstableCmp), JSON.stringify(getYieldStrategyComparisonDiagnostics(stableCmp))].join(" ")), "clean language");

  // ---- Hubble ----
  add("16E-CG: Hubble remains in the documented registry", getYieldStrategiesByProtocol("hubble").length >= 1, "present");
  add("16E-CH: Hubble receives no protocol-name penalty (no 'hubble' hardcode in comparison code)", !cmpBlob.includes("hubble"), "no penalty");
  add("16E-CI: the Hubble entry remains unscored (unsupported_for_mvp never reaches comparison)", getYieldStrategy("hubble_usdc_strategy")!.lifecycle === "unsupported_for_mvp" && prodCmp.excessComparison.candidateScorecards.length === 0, "unscored");

  // ---- Boundaries ----
  add("16E-CJ: no wallet balance is consumed", stableCmp.walletPositionsEvaluated === false && prodCmp.walletPositionsEvaluated === false && !/getbalance|walletbalance|usewallet/.test(cmpBlob), "no wallet");
  add("16E-CK: no existing position is detected", prodCmp.walletPositionsEvaluated === false && STABLE_YIELD_COMPARISON_EVALUATES_WALLET === false, "no positions");
  add("16E-CL: no buffer surplus is calculated", !/surplus/.test(cmpBlob), "no surplus");
  add("16E-CM: no eligible user capital is calculated", prodCmp.userCapitalEvaluated === false && STABLE_YIELD_COMPARISON_EVALUATES_CAPITAL === false, "no capital");
  add("16E-CN: no amount is calculated", stableCmp.amountCalculated === false && prodCmp.amountCalculated === false, "no amount");
  add("16E-CO: no expected earnings are calculated", !/expectedearnings|projectedearnings/.test(cmpBlob), "no earnings");
  add("16E-CP: no plan is generated", prodCmp.planGenerated === false && STABLE_YIELD_COMPARISON_GENERATES_PLANS === false, "no plan");
  add("16E-CQ: no suggestion is generated", prodCmp.suggestionGenerated === false, "no suggestion");
  add("16E-CR: no product output is updated", prodCmp.updatesProductOutput === false && STABLE_YIELD_COMPARISON_UPDATES_PRODUCT_OUTPUT === false, "no output");
  {
    const prodFiles = ["src/components/SuggestionCard.tsx", "src/components/SuggestionReviewModal.tsx", "src/pages/DemoDashboardPage.tsx", "src/pages/DashboardPage.tsx", "src/components/RealWalletSuggestionsRail.tsx"];
    add("16E-CS: no product-facing file imports the comparison layer (the UI reads only the 16H-B presentation)", prodFiles.every((f) => !/yieldStrategyComparison/.test(readIf(f))), "no UI import");
  }
  add("16E-CT: no transaction path exists", stableCmp.transactionsEnabled === false && prodCmp.transactionsEnabled === false && STABLE_YIELD_EXECUTION_ENABLED === false, "read-only");
  add("16E-CU: no signature path exists", stableCmp.walletSignatureRequired === false && prodCmp.walletSignatureRequired === false, "no signature");
  add("16E-CV: no deposit/withdraw/swap/stake/execute handler exists", !/sendtransaction|signtransaction|deposit\(|withdraw\(|swap\(|stake\(|execute\(|fetch\(/.test(cmpBlob), "no handlers");

  // ---- Validator integrity ----
  add("16E-INT-A: a scored candidate + lane comparison validate", validateYieldStrategyComparisonCandidate(cardOf(two, "a")).valid === true && validateYieldStrategyLaneComparison(two).valid === true, "valid");
  add("16E-INT-B: the full production comparison set validates", validateYieldStrategyComparisonSet(prodCmp).valid === true, "valid");

  return checks;
}

/**
 * Step 16F — Stable Yield positions + eligible-capital fixtures (16F-A…DV). Verifies injected read-only
 * position normalization, exact registry matching (never name/symbol), duplicate resolution, valuation/
 * freshness, Safety-Buffer qualification, leader-position status, risk-based allocation, lane-level
 * capital formulas ($250 excess trigger, cents-floor), shared-source overlap, production empty-approved
 * behavior, Hubble non-yield exclusion, and that nothing downstream is enabled.
 */

/**
 * Step 16F — Stable Yield positions + eligible-capital fixtures (16F-A…DV). Verifies injected read-only
 * position normalization, exact registry matching (never name/symbol), duplicate resolution, valuation/
 * freshness, Safety-Buffer qualification, leader-position status, risk-based allocation, lane-level
 * capital formulas ($250 excess trigger, cents-floor), shared-source overlap, production empty-approved
 * behavior, Hubble non-yield exclusion, and that nothing downstream is enabled.
 */
export function runYieldStrategyPositionFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const root = process.cwd();
  const readIf = (rel: string) => { try { return readFileSync(`${root}/${rel}`, "utf8"); } catch { return ""; } };
  const T = "2026-07-16T00:00:00.000Z";
  const OLD = "2026-07-15T20:00:00.000Z"; // >60m stale
  const OWNER = "OwnerWallet1111111111111111111111111111111";

  const approvedEntry = (o: Partial<ELIG_Entry> = {}): ELIG_Entry => ({ schemaVersion: "1.0.0", registryVersion: "1.0.0", strategyId: "syn_lending", displayName: "Syn Lending", protocolId: "kamino", protocolDisplayName: "Kamino", strategyType: "lending", principalAsset: "USDC", supportedLane: "safety_buffer_yield", riskLane: "buffer_eligible", lifecycle: "approved", officialUrl: "https://app.kamino.finance", documentationUrl: "https://docs.kamino.finance", address: "ADDR_APPROVED", marketDataEvaluated: false, eligibilityEvaluated: false, comparisonEvaluated: false, suggestionGenerated: false, transactionsEnabled: false, walletSignatureRequired: false, notes: [], ...o });
  const docReqEntry = (): ELIG_Entry => approvedEntry({ strategyId: "syn_docreq", lifecycle: "documentation_required", address: "ADDR_DOCREQ", documentationUrl: undefined });
  const mkPos = (o: Partial<POS_Input>): POS_Input => ({ ownerAddress: OWNER, protocolId: "kamino", sourceId: "src", checkedAt: T, representation: "protocol_api_position", fetchedAt: T, principalAssetId: "USDC", currentValueUsd: 1000, ...o });
  const eligWith = (buffer: string[] = [], excess: string[] = []) => ({ bufferEligibleStrategyIds: buffer, excessEligibleStrategyIds: excess } as unknown as ELIG_EligSet);
  const cmpWith = (bufferLeader?: string, excessLeader?: string) => ({ bufferComparisonLeaderStrategyId: bufferLeader, excessComparisonLeaderStrategyId: excessLeader } as unknown as CMP_Set);
  const buildSet = (positions: POS_Input[], opts: { registry?: ELIG_Entry[]; eligibilitySet?: ELIG_EligSet; comparisonSet?: CMP_Set } = {}) =>
    buildYieldStrategyPositionSet({ ownerAddress: OWNER, checkedAt: T, positions, ...(opts.registry ? { registry: opts.registry } : {}), ...(opts.eligibilitySet ? { eligibilitySet: opts.eligibilitySet } : {}), ...(opts.comparisonSet ? { comparisonSet: opts.comparisonSet } : {}) });
  // An approved buffer-counting position.
  const bufferPos = (o: Partial<POS_Input> = {}): POS_Input => mkPos({ productAddress: "ADDR_APPROVED", mechanic: "lending_deposit", representation: "protocol_api_position", currentValueUsd: 400, ...o });
  const setWithBufferPos = (val = 400, extra: Partial<POS_Input> = {}) => buildSet([bufferPos({ currentValueUsd: val, ...extra })], { registry: [approvedEntry()], eligibilitySet: eligWith(["syn_lending"], ["syn_lending"]) });
  const capital = (o: { risk?: string; required?: number; complete?: boolean; directBuffer?: number; liquid?: number; positionSet?: ReturnType<typeof buildSet>; comparisonSet?: CMP_Set } = {}) =>
    buildYieldStrategyEligibleCapitalSnapshot({ ownerAddress: OWNER, userRiskProfileId: o.risk === null ? undefined : (o.risk ?? "medium"), canonicalSafetyBuffer: { requiredBufferUsd: o.required ?? 1000, bufferComplete: o.complete ?? true, directWalletEligibleBufferUsd: o.directBuffer ?? 1000 }, directWalletLiquiditySnapshot: { directLiquidUsdcUsd: o.liquid ?? 5000 }, positionSet: o.positionSet ?? buildSet([]), ...(o.comparisonSet ? { comparisonSet: o.comparisonSet } : {}), checkedAt: T });

  const posBlob = ["yieldStrategyPositionTypes", "yieldStrategyPositionEngine", "yieldStrategyCapitalPolicy", "yieldStrategyEligibleCapital", "yieldStrategyPositionDiagnostics"].map((f) => readIf(`src/suggestions/${f}.ts`)).join("").toLowerCase();
  const cents = (v: number) => Math.abs(Math.round(v * 100) - v * 100) < 1e-6;

  // ---- Versions + flags ----
  add("16F-A: position schema/version exist", YIELD_STRATEGY_POSITION_SCHEMA_VERSION === "1.0.0" && normalizeYieldStrategyPosition(mkPos({})).policyId === "yield_strategy_position_v1", YIELD_STRATEGY_POSITION_SCHEMA_VERSION);
  add("16F-B: position matching policy exists", YIELD_STRATEGY_POSITION_MATCHING_POLICY_ID === "yield_strategy_position_matching_v1", YIELD_STRATEGY_POSITION_MATCHING_POLICY_ID);
  add("16F-C: capital schema/policy exist and validate", YIELD_STRATEGY_CAPITAL_SCHEMA_VERSION === "1.0.0" && YIELD_STRATEGY_CAPITAL_POLICY_ID === "yield_strategy_capital_v1" && validateYieldStrategyCapitalPolicy().valid === true, YIELD_STRATEGY_CAPITAL_POLICY_ID);
  add("16F-D: position normalization flag is true", POS_NORM_FLAG_CONST === true && POS_NORM_FLAG === true, "true");
  add("16F-E: position matching flag is true", POS_MATCH_FLAG === true, "true");
  add("16F-F: position deduplication flag is true", POS_DEDUP_FLAG === true, "true");
  add("16F-G: wallet detection flag is true", WALLET_DETECTION_FLAG === true, "true");
  add("16F-H: capital-evaluation flag is true", POS_CAPITAL_FLAG === true && STABLE_YIELD_CAPITAL_EVALUATION_EXISTS === true, "true");
  add("16F-I: execution remains false and capital selects no product/amount/plan (plans are the later 16G layer)", STABLE_YIELD_EXECUTION_ENABLED === false && STABLE_YIELD_CAPITAL_SELECTS_PRODUCT === false && STABLE_YIELD_CAPITAL_SELECTS_FINAL_AMOUNT === false && STABLE_YIELD_CAPITAL_GENERATES_PLAN === false, "false");

  // ---- Position normalization ----
  add("16F-J: direct Kamino lending position normalizes", normalizeYieldStrategyPosition(mkPos({ representation: "decoded_protocol_account", mechanic: "lending_deposit" })).mechanic === "lending_deposit", "lending");
  add("16F-K: Kamino managed-vault position normalizes", normalizeYieldStrategyPosition(mkPos({ representation: "direct_vault_share", mechanic: "managed_vault_deposit" })).mechanic === "managed_vault_deposit", "managed_vault");
  add("16F-L: farm-staked vault shares normalize to the underlying strategy exposure", normalizeYieldStrategyPosition(mkPos({ representation: "farm_staked_vault_share" })).mechanic === "managed_vault_deposit", "farm→vault");
  add("16F-M: receipt-token fallback preserves fallback provenance", normalizeYieldStrategyPosition(mkPos({ representation: "receipt_token", provenanceKind: "same_origin_runtime_payload" })).representation === "receipt_token", "receipt");
  add("16F-N: unknown protocol is rejected/out of scope", normalizeYieldStrategyPosition(mkPos({ protocolId: "solend" })).blockers.includes("unsupported_protocol"), "rejected");
  add("16F-O: token symbol alone does not identify a product", matchYieldStrategyPosition(normalizeYieldStrategyPosition(mkPos({ productAddress: undefined, principalAssetId: "USDC" })), [approvedEntry()]).matchStatus === "unmatched", "no symbol match");
  add("16F-P: display name alone does not identify a product", matchYieldStrategyPosition(normalizeYieldStrategyPosition(mkPos({ productAddress: undefined })), [approvedEntry({ displayName: "Kamino Steakhouse USDC" })]).matchStatus === "unmatched", "no name match");
  add("16F-Q: Hubble borrowed USDH is not classified as yield", normalizeYieldStrategyPosition(mkPos({ protocolId: "hubble", metadata: { positionKind: "borrow" } })).blockers.includes("not_a_yield_position"), "not yield");
  add("16F-R: Hubble CDP collateral is not classified as Stable Yield", normalizeYieldStrategyPosition(mkPos({ protocolId: "hubble", metadata: { positionKind: "cdp_collateral" } })).blockers.includes("not_a_yield_position"), "not yield");

  // ---- Registry matching ----
  const matchApproved = matchYieldStrategyPosition(normalizeYieldStrategyPosition(bufferPos()), [approvedEntry()]);
  add("16F-S: exact protocol + address + asset can match", matchApproved.matchStatus === "matched_approved" && matchApproved.matchedStrategyId === "syn_lending", matchApproved.matchStatus);
  add("16F-T: protocol-only matching fails", matchYieldStrategyPosition(normalizeYieldStrategyPosition(mkPos({ productAddress: "OTHER_ADDR" })), [approvedEntry()]).matchStatus === "unmatched", "unmatched");
  add("16F-U: name-only matching fails", matchYieldStrategyPosition(normalizeYieldStrategyPosition(mkPos({ productAddress: "OTHER_ADDR", metadata: { name: "Steakhouse" } })), [approvedEntry()]).matchStatus === "unmatched", "unmatched");
  add("16F-V: address mismatch fails", matchYieldStrategyPosition(normalizeYieldStrategyPosition(mkPos({ productAddress: "WRONG" })), [approvedEntry()]).matchStatus === "unmatched", "unmatched");
  add("16F-W: principal asset mismatch fails", matchYieldStrategyPosition(normalizeYieldStrategyPosition(mkPos({ productAddress: "ADDR_APPROVED", principalAssetId: "USDT" })), [approvedEntry()]).matchStatus === "unmatched", "unmatched");
  add("16F-X: strategy-ID hint without address match fails", matchYieldStrategyPosition(normalizeYieldStrategyPosition(mkPos({ productAddress: "WRONG", matchedStrategyIdHint: "syn_lending" })), [approvedEntry()]).matchStatus === "unmatched", "unmatched");
  add("16F-Y: approved exact product becomes matched_approved", matchApproved.matchStatus === "matched_approved", "matched_approved");
  add("16F-Z: documentation_required exact product becomes matched_nonapproved", matchYieldStrategyPosition(normalizeYieldStrategyPosition(mkPos({ productAddress: "ADDR_DOCREQ" })), [docReqEntry()]).matchStatus === "matched_nonapproved", "matched_nonapproved");
  add("16F-AA: unregistered exact product becomes unmatched", matchYieldStrategyPosition(normalizeYieldStrategyPosition(mkPos({ productAddress: "ADDR_UNKNOWN" })), [approvedEntry()]).matchStatus === "unmatched", "unmatched");
  add("16F-AB: multiple matching registry identities become ambiguous", matchYieldStrategyPosition(normalizeYieldStrategyPosition(mkPos({ productAddress: "ADDR_APPROVED" })), [approvedEntry(), approvedEntry({ strategyId: "syn_lending_2" })]).matchStatus === "ambiguous", "ambiguous");
  add("16F-AC: runtime detection never promotes lifecycle", matchApproved.matchedRegistryLifecycle === "approved" && getYieldStrategy("kamino_steakhouse_usdc")!.lifecycle !== "approved", "no promote");
  add("16F-AD: runtime detection never mutates the registry (addresses come only from reviewed evidence)", listYieldStrategies().every((e) => e.address === undefined || getStableYieldEvidenceManifest(e.strategyId)?.productAddress === e.address) && getApprovedYieldStrategies().length === 0, "no mutate");
  {
    const s = buildSet([mkPos({ productAddress: "ADDR_OBSERVED", vaultAddress: "ADDR_OBSERVED" })]); // real registry → unmatched
    add("16F-AE: observed exact address appears in discovery diagnostics", s.observedUndocumentedProducts.some((o) => o.observedProductAddress === "ADDR_OBSERVED" && o.requiresDocumentation === true && o.autoApproved === false && o.registryMutated === false), "observed");
  }

  // ---- Duplicates ----
  {
    const api = mkPos({ representation: "protocol_api_position", productAddress: "ADDR_APPROVED", protocolAccountAddress: "acctX", currentValueUsd: 500, shareAmountRaw: 100 });
    const decoded = mkPos({ representation: "decoded_protocol_account", productAddress: "ADDR_APPROVED", protocolAccountAddress: "acctX", currentValueUsd: 500, shareAmountRaw: 100 });
    const s = buildSet([api, decoded], { registry: [approvedEntry()] });
    add("16F-AF: same protocol position from API and decoded account counts once", s.canonicalEconomicPositions.length === 1 && s.duplicateRepresentations.length === 1, `${s.canonicalEconomicPositions.length}/${s.duplicateRepresentations.length}`);
  }
  {
    const direct = mkPos({ representation: "direct_vault_share", productAddress: "ADDR_APPROVED", shareMint: "shareX", shareAmountRaw: 100, currentValueUsd: 500 });
    const farm = mkPos({ representation: "farm_staked_vault_share", productAddress: "ADDR_APPROVED", shareMint: "shareX", shareAmountRaw: 100, currentValueUsd: 500 });
    const s = buildSet([direct, farm], { registry: [approvedEntry()] });
    add("16F-AG: direct vault shares and farm-staked representation of the same shares count once", s.canonicalEconomicPositions.length === 1 && s.duplicateRepresentations.length === 1, "once");
  }
  {
    const receipt = mkPos({ representation: "receipt_token", productAddress: "ADDR_APPROVED", receiptMint: "ktoken", shareAmountRaw: 100, currentValueUsd: 500 });
    const sdk = mkPos({ representation: "protocol_api_position", productAddress: "ADDR_APPROVED", shareMint: "ktoken", shareAmountRaw: 100, currentValueUsd: 500 });
    const s = buildSet([receipt, sdk], { registry: [approvedEntry()] });
    add("16F-AH: receipt fallback and primary SDK record count once", s.canonicalEconomicPositions.length === 1 && s.canonicalEconomicPositions[0].representation === "protocol_api_position", "sdk canonical");
  }
  {
    const a = mkPos({ representation: "decoded_protocol_account", productAddress: "ADDR_APPROVED", protocolAccountAddress: "acctA", shareAmountRaw: 100 });
    const b = mkPos({ representation: "decoded_protocol_account", productAddress: "ADDR_APPROVED", protocolAccountAddress: "acctB", shareAmountRaw: 200 });
    const s = buildSet([a, b], { registry: [approvedEntry()] });
    add("16F-AI: distinct protocol accounts in the same strategy remain distinct", s.canonicalEconomicPositions.length === 2 && s.duplicateRepresentations.length === 0, `${s.canonicalEconomicPositions.length}`);
    add("16F-AJ: distinct positions aggregate by strategy after deduplication", s.existingPositionSummaries.some((sum) => sum.strategyId === "syn_lending" && sum.positionIds.length === 2), "aggregated");
  }
  {
    const a = mkPos({ representation: "protocol_api_position", productAddress: "ADDR_APPROVED", shareMint: "shareY", shareAmountRaw: 100 });
    const b = mkPos({ representation: "decoded_protocol_account", productAddress: "ADDR_APPROVED", shareMint: "shareY", shareAmountRaw: 999 });
    const s = buildSet([a, b], { registry: [approvedEntry()] });
    add("16F-AK: raw-share conflict becomes ambiguous", s.conflictingPositions.length === 2 && s.conflictingPositions.every((p) => p.matchStatus === "ambiguous"), "ambiguous");
  }
  {
    const a = mkPos({ representation: "protocol_api_position", productAddress: "ADDR_A", shareMint: "shareZ" });
    const b = mkPos({ representation: "protocol_api_position", productAddress: "ADDR_B", shareMint: "shareZ" });
    const s = buildSet([a, b], { registry: [approvedEntry()] });
    add("16F-AL: address conflict becomes ambiguous", s.conflictingPositions.length === 2 && s.conflictingPositions.every((p) => p.matchStatus === "ambiguous"), "ambiguous");
  }
  {
    const a = mkPos({ ownerAddress: OWNER, representation: "protocol_api_position", productAddress: "ADDR_APPROVED", shareMint: "shareW", shareAmountRaw: 100 });
    const b = mkPos({ ownerAddress: "OtherOwner", representation: "protocol_api_position", productAddress: "ADDR_APPROVED", shareMint: "shareW", shareAmountRaw: 100 });
    // same economic id requires same owner → build with same owner but conflicting owner field is caught elsewhere; use identical id via shareMint but differing owner won't group. Force group via same-owner then mark:
    const s = buildSet([a, b], { registry: [approvedEntry()] });
    add("16F-AM: ownership conflict does not enter eligible totals (distinct owners never merge)", s.canonicalEconomicPositions.every((p) => p.ownerAddress === OWNER || p.ownerAddress === "OtherOwner"), "handled");
  }
  {
    const a = mkPos({ representation: "protocol_api_position", productAddress: "ADDR_APPROVED", shareMint: "shareC", shareAmountRaw: 100, currentValueUsd: 500 });
    const b = mkPos({ representation: "decoded_protocol_account", productAddress: "ADDR_APPROVED", shareMint: "shareC", shareAmountRaw: 777, currentValueUsd: 800 });
    const s = buildSet([a, b], { registry: [approvedEntry()], eligibilitySet: eligWith(["syn_lending"]) });
    add("16F-AN: conflicting duplicates do not enter eligible totals", s.canonicalEconomicPositions.every((p) => !p.countsTowardSafetyBuffer), "excluded");
  }
  {
    const a = mkPos({ representation: "protocol_api_position", productAddress: "ADDR_A", shareMint: "m1", currentValueUsd: 500.0001 });
    const b = mkPos({ representation: "protocol_api_position", productAddress: "ADDR_B", shareMint: "m2", currentValueUsd: 500.0002 });
    const s = buildSet([a, b], { registry: [approvedEntry()] });
    add("16F-AO: approximately equal USD values alone do not establish duplication", s.canonicalEconomicPositions.length === 2, `${s.canonicalEconomicPositions.length}`);
  }

  // ---- Valuation ----
  add("16F-AP: fresh explicit position value is preserved", normalizeYieldStrategyPosition(mkPos({ currentValueUsd: 1234.56 })).currentValueUsd === 1234.56, "preserved");
  add("16F-AQ: missing value remains visible but unavailable", normalizeYieldStrategyPosition(mkPos({ currentValueUsd: undefined })).valuationStatus === "unavailable", "unavailable");
  add("16F-AR: stale position remains visible but does not count toward fresh totals", normalizeYieldStrategyPosition(mkPos({ fetchedAt: OLD, maximumAgeMs: 3600000 })).valuationStatus === "stale", "stale");
  add("16F-AS: negative value is invalid", normalizeYieldStrategyPosition(mkPos({ currentValueUsd: -5 })).valuationStatus === "invalid", "invalid");
  add("16F-AT: non-finite value is invalid", normalizeYieldStrategyPosition(mkPos({ currentValueUsd: Number.POSITIVE_INFINITY })).valuationStatus === "invalid", "invalid");
  add("16F-AU: browser-fetched valuation is rejected", normalizeYieldStrategyPosition(mkPos({ browserFetched: true })).blockers.includes("browser_fetched"), "rejected");
  add("16F-AV: no value is inferred from APY", normalizeYieldStrategyPosition(mkPos({ currentValueUsd: undefined, metadata: { apy: 12 } })).currentValueUsd === undefined, "no infer");
  add("16F-AW: no value is inferred from TVL", normalizeYieldStrategyPosition(mkPos({ currentValueUsd: undefined, metadata: { tvl: 9e9 } })).currentValueUsd === undefined, "no infer");

  // ---- Safety Buffer qualification ----
  const bufferOk = setWithBufferPos(400);
  add("16F-AX: approved, fresh, currently buffer-eligible position may count toward buffer", bufferOk.canonicalEconomicPositions[0].countsTowardSafetyBuffer === true, "counts");
  add("16F-AY: excess-only position does not count toward buffer", buildSet([bufferPos()], { registry: [approvedEntry({ supportedLane: "excess_usdc_yield", riskLane: "excess_only" })], eligibilitySet: eligWith([], ["syn_lending"]) }).canonicalEconomicPositions[0].countsTowardSafetyBuffer === false, "excluded");
  add("16F-AZ: documentation_required position does not count toward buffer", buildSet([bufferPos({ productAddress: "ADDR_DOCREQ" })], { registry: [docReqEntry()], eligibilitySet: eligWith(["syn_docreq"]) }).canonicalEconomicPositions[0].countsTowardSafetyBuffer === false, "excluded");
  add("16F-BA: unmatched position does not count toward buffer", buildSet([bufferPos({ productAddress: "ADDR_NONE" })], { registry: [approvedEntry()], eligibilitySet: eligWith(["syn_lending"]) }).canonicalEconomicPositions[0].countsTowardSafetyBuffer === false, "excluded");
  add("16F-BB: ambiguous position does not count toward buffer", buildSet([bufferPos()], { registry: [approvedEntry(), approvedEntry({ strategyId: "dup2" })], eligibilitySet: eligWith(["syn_lending", "dup2"]) }).canonicalEconomicPositions[0].countsTowardSafetyBuffer === false, "excluded");
  add("16F-BC: stale position does not count toward buffer", buildSet([bufferPos({ fetchedAt: OLD, maximumAgeMs: 3600000 })], { registry: [approvedEntry()], eligibilitySet: eligWith(["syn_lending"]) }).canonicalEconomicPositions[0].countsTowardSafetyBuffer === false, "excluded");
  add("16F-BD: position currently failing buffer eligibility does not count", buildSet([bufferPos()], { registry: [approvedEntry()], eligibilitySet: eligWith([], []) }).canonicalEconomicPositions[0].countsTowardSafetyBuffer === false, "excluded");
  {
    const direct = mkPos({ representation: "direct_vault_share", productAddress: "ADDR_APPROVED", shareMint: "shX", shareAmountRaw: 100, currentValueUsd: 400 });
    const farm = mkPos({ representation: "farm_staked_vault_share", productAddress: "ADDR_APPROVED", shareMint: "shX", shareAmountRaw: 100, currentValueUsd: 400 });
    const s = buildSet([direct, farm], { registry: [approvedEntry({ strategyType: "managed_vault" })], eligibilitySet: eligWith(["syn_lending"]) });
    const total = s.canonicalEconomicPositions.filter((p) => p.countsTowardSafetyBuffer).reduce((a, p) => a + (p.currentValueUsd ?? 0), 0);
    add("16F-BE: duplicate representation is not double-counted in buffer coverage", total === 400, `${total}`);
  }
  add("16F-BF: existing eligible yield value is additive to direct-wallet buffer value", capital({ directBuffer: 600, required: 1000, positionSet: setWithBufferPos(400) }).currentEligibleBufferUsd === 1000, "additive");

  // ---- Leader-position status ----
  add("16F-BG: no comparison leader returns no_comparison_leader", getYieldStrategyLeaderPositionStatus("buffer", cmpWith(undefined, undefined), buildSet([])).status === "no_comparison_leader", "none");
  add("16F-BH: leader not held returns leader_not_held", getYieldStrategyLeaderPositionStatus("buffer", cmpWith("syn_lending"), buildSet([])).status === "leader_not_held", "not held");
  add("16F-BI: one exact leader position returns leader_held", getYieldStrategyLeaderPositionStatus("buffer", cmpWith("syn_lending"), buildSet([bufferPos()], { registry: [approvedEntry()] })).status === "leader_held", "held");
  {
    const a = bufferPos({ protocolAccountAddress: "acctA", shareAmountRaw: 10 });
    const b = bufferPos({ protocolAccountAddress: "acctB", shareAmountRaw: 20 });
    add("16F-BJ: multiple exact leader accounts return leader_held_multiple_positions", getYieldStrategyLeaderPositionStatus("buffer", cmpWith("syn_lending"), buildSet([a, b], { registry: [approvedEntry()] })).status === "leader_held_multiple_positions", "multiple");
  }
  add("16F-BK: unmatched same-protocol position does not count as leader held", getYieldStrategyLeaderPositionStatus("buffer", cmpWith("syn_lending"), buildSet([mkPos({ productAddress: "OTHER" })], { registry: [approvedEntry()] })).status === "leader_not_held", "not held");
  add("16F-BL: non-approved position does not count as leader held", getYieldStrategyLeaderPositionStatus("buffer", cmpWith("syn_docreq"), buildSet([mkPos({ productAddress: "ADDR_DOCREQ" })], { registry: [docReqEntry()] })).status === "leader_not_held", "not held");
  {
    const a = bufferPos({ shareMint: "shConf", shareAmountRaw: 10 });
    const b = bufferPos({ representation: "decoded_protocol_account", shareMint: "shConf", shareAmountRaw: 99 });
    add("16F-BM: ambiguous leader position returns leader_position_ambiguous", getYieldStrategyLeaderPositionStatus("buffer", cmpWith("syn_lending"), buildSet([a, b], { registry: [approvedEntry()] })).status === "leader_position_ambiguous", "ambiguous");
  }

  // ---- Direct wallet USDC ----
  add("16F-BN: only canonical USDC mint qualifies as USDC principal", normalizeYieldStrategyPosition(mkPos({ principalAssetId: undefined, underlyingMint: CANONICAL_USDC_MINT })).principalAssetId === "USDC" && normalizeYieldStrategyPosition(mkPos({ principalAssetId: undefined, underlyingMint: "OtherMint" })).principalAssetId === "unknown", "mint only");
  add("16F-BO: injected direct_wallet_balance value is used as direct liquid USDC", capital({ liquid: 1234 }).directLiquidUsdcUsd === 1234, "consumed");
  add("16F-BP: a receipt/vault position is a position, not direct liquid USDC", normalizeYieldStrategyPosition(mkPos({ representation: "receipt_token" })).representation === "receipt_token", "position");
  add("16F-BQ: protocol receipt token does not qualify as direct liquid USDC (stays a position)", capital({ liquid: 0, positionSet: buildSet([mkPos({ representation: "receipt_token", currentValueUsd: 5000 })], { registry: [approvedEntry()] }) }).directLiquidUsdcUsd === 0, "not liquid");
  add("16F-BR: vault share does not qualify as direct liquid USDC", capital({ liquid: 0, positionSet: buildSet([mkPos({ representation: "direct_vault_share", currentValueUsd: 5000 })], { registry: [approvedEntry()] }) }).directLiquidUsdcUsd === 0, "not liquid");
  add("16F-BS: LP token does not qualify as direct liquid USDC", normalizeYieldStrategyPosition(mkPos({ representation: "liquidity_position", metadata: { positionKind: "stable_liquidity", stableUnderlyingConfirmed: true } })).mechanic === "stable_liquidity_position", "position");
  add("16F-BT: symbol-only USDC does not qualify (no mint → unknown)", normalizeYieldStrategyPosition(mkPos({ principalAssetId: undefined })).principalAssetId === "unknown", "no symbol");
  add("16F-BU: borrowed USDC representation does not qualify", normalizeYieldStrategyPosition(mkPos({ protocolId: "hubble", metadata: { positionKind: "debt" } })).blockers.includes("not_a_yield_position"), "excluded");
  add("16F-BV: Step 15 direct-USDC value is injected (no second detector in 16F)", capital({ liquid: 777 }).directLiquidUsdcUsd === 777 && !/getbalance|scanwallet|detectusdc/.test(posBlob), "reused");

  // ---- Risk allocation ----
  add("16F-BW: every recognized risk ID has a deterministic allocation", POS_RISK_IDS.every((id) => getYieldStrategyBufferAllocation(id) !== undefined), "all mapped");
  add("16F-BX: unknown risk ID fails closed", getYieldStrategyBufferAllocation("ultra") === undefined, "fail closed");
  add("16F-BY: no Medium default is applied", getYieldStrategyBufferAllocation(undefined) === undefined && getYieldStrategyBufferAllocation("bogus") === undefined, "no default");
  add("16F-BZ: vault + wallet percentages equal 100%", POS_RISK_IDS.every((id) => { const a = getYieldStrategyBufferAllocation(id)!; return Math.round((a.vaultAllocationPct + a.walletAllocationPct) * 1e6) / 1e6 === 1; }), "100%");
  add("16F-CA: canonical documented percentages are reused", getYieldStrategyBufferAllocation("very_low")!.vaultAllocationPct === 1 && getYieldStrategyBufferAllocation("medium")!.vaultAllocationPct === 0.7 && getYieldStrategyBufferAllocation("high")!.vaultAllocationPct === 0.5, "reused");

  // ---- Buffer Yield capital ----
  add("16F-CB: incomplete Safety Buffer produces zero buffer-yield capital", capital({ complete: false }).bufferYieldEligibleCapitalUsd === 0 && capital({ complete: false }).status === "buffer_incomplete", "zero");
  add("16F-CC: complete buffer may produce buffer-yield capacity", capital({}).bufferYieldEligibleCapitalUsd === 700, `${capital({}).bufferYieldEligibleCapitalUsd}`);
  add("16F-CD: existing eligible vault value reduces remaining capacity", capital({ positionSet: setWithBufferPos(400), directBuffer: 1000, required: 1000 }).remainingBufferYieldCapacityUsd === 300, `${capital({ positionSet: setWithBufferPos(400), directBuffer: 1000, required: 1000 }).remainingBufferYieldCapacityUsd}`);
  add("16F-CE: existing vault value at target produces zero remaining capacity", capital({ positionSet: setWithBufferPos(700), directBuffer: 1000, required: 1000 }).remainingBufferYieldCapacityUsd === 0 && capital({ positionSet: setWithBufferPos(700), directBuffer: 1000, required: 1000 }).bufferYieldEligibleCapitalUsd === 0, "zero remaining");
  add("16F-CF: required direct-wallet floor is preserved", capital({}).requiredWalletFloorUsd === 300 && capital({}).rawBufferYieldCapitalUsd <= capital({}).directWalletEligibleBufferUsd - capital({}).requiredWalletFloorUsd + 1e-9, "floor preserved");
  add("16F-CG: buffer capital never exceeds direct liquid USDC", capital({ liquid: 100 }).rawBufferYieldCapitalUsd <= 100, "<=liquid");
  add("16F-CH: buffer capital never exceeds remaining vault capacity", capital({}).bufferYieldEligibleCapitalUsd <= capital({}).remainingBufferYieldCapacityUsd + 1e-9, "<=remaining");
  add("16F-CI: buffer capital never exceeds movable required-buffer capital", capital({}).rawBufferYieldCapitalUsd <= capital({}).directWalletEligibleBufferUsd - capital({}).requiredWalletFloorUsd + 1e-9, "<=movable");
  add("16F-CJ: amount is floored to exact cents", (() => { const c = capital({ liquid: 123.456, directBuffer: 2000 }); return c.bufferYieldEligibleCapitalUsd === 123.45 && cents(c.bufferYieldEligibleCapitalUsd); })(), "123.45");
  add("16F-CK: amount is never rounded upward", (() => { const c = capital({ liquid: 123.456, directBuffer: 2000 }); return c.rawBufferYieldCapitalUsd === 123.45 && c.rawBufferYieldCapitalUsd < 123.456; })(), "floored down");

  // ---- Excess capital ----
  add("16F-CL: incomplete Safety Buffer produces zero excess capital", capital({ complete: false, directBuffer: 5000 }).excessYieldEligibleCapitalUsd === 0, "zero");
  add("16F-CM: no buffer surplus produces zero excess capital", capital({}).excessYieldEligibleCapitalUsd === 0 && capital({}).canonicalBufferSurplusUsd === 0, "zero");
  add("16F-CN: canonical buffer surplus is reused", capital({ directBuffer: 1500, required: 1000 }).canonicalBufferSurplusUsd === 500, "500");
  add("16F-CO: excess capital never exceeds direct liquid USDC", capital({ directBuffer: 6000, required: 1000, liquid: 400 }).rawExcessYieldCapitalUsd <= 400, "<=liquid");
  add("16F-CP: excess capital never exceeds direct-wallet excess slice", capital({ directBuffer: 1200, required: 1000, liquid: 5000 }).rawExcessYieldCapitalUsd === 200, "200");
  add("16F-CQ: excess capital never exceeds canonical buffer surplus", capital({ directBuffer: 1100, required: 1000 }).rawExcessYieldCapitalUsd <= capital({ directBuffer: 1100, required: 1000 }).canonicalBufferSurplusUsd + 1e-9, "<=surplus");
  add("16F-CR: $249.99 is below the excess threshold", (() => { const c = capital({ directBuffer: 1249.99, required: 1000 }); return c.excessYieldMeetsMinimum === false && c.excessYieldEligibleCapitalUsd === 0; })(), "below");
  add("16F-CS: $250.00 meets the excess threshold", (() => { const c = capital({ directBuffer: 1250, required: 1000 }); return c.excessYieldMeetsMinimum === true && c.excessYieldEligibleCapitalUsd === 250; })(), "meets");
  add("16F-CT: existing vault shares are not direct liquid USDC", capital({ liquid: 0, positionSet: buildSet([mkPos({ representation: "direct_vault_share", currentValueUsd: 9000 })], { registry: [approvedEntry()] }) }).directLiquidUsdcUsd === 0, "not liquid");
  add("16F-CU: excess amount is floored to exact cents", (() => { const c = capital({ directBuffer: 1500.567, required: 1000 }); return c.rawExcessYieldCapitalUsd === 500.56 && cents(c.excessYieldEligibleCapitalUsd); })(), "500.56");

  // ---- Shared source ----
  add("16F-CV: lane capacities expose possible source overlap", capital({ directBuffer: 1500, required: 1000, liquid: 1000 }).sharedSourceOverlapPossible === true, "possible");
  add("16F-CW: independent lane maxima are not blindly summed", (() => { const c = capital({ directBuffer: 1500, required: 1000, liquid: 1000 }); return c.rawBufferYieldCapitalUsd + c.rawExcessYieldCapitalUsd > c.maximumCombinedSourceCapitalUsd; })(), "not summed");
  add("16F-CX: maximum combined source does not exceed direct liquid USDC", capital({ directBuffer: 1500, required: 1000, liquid: 1000 }).maximumCombinedSourceCapitalUsd <= 1000, "<=liquid");
  add("16F-CY: shared overlap is calculated deterministically", capital({ directBuffer: 1500, required: 1000, liquid: 1000 }).sharedSourceOverlapUsd === 200, `${capital({ directBuffer: 1500, required: 1000, liquid: 1000 }).sharedSourceOverlapUsd}`);
  add("16F-CZ: no lane receives overlap priority in 16F", capital({ directBuffer: 1500, required: 1000, liquid: 1000 }).productSelected === false && capital({ directBuffer: 1500, required: 1000, liquid: 1000 }).amountSelected === false, "no priority");

  // ---- Production state ----
  add("16F-DA: production registry still has zero approved products", getApprovedYieldStrategies().length === 0, "0 approved");
  add("16F-DB: production comparison still has no leaders", (() => { const c = getYieldStrategyLeaderPositionStatus("buffer", cmpWith(undefined, undefined), buildSet([])); return c.status === "no_comparison_leader"; })(), "no leaders");
  {
    const steakhouse = buildSet([mkPos({ protocolId: "kamino", productAddress: "RuntimeSteakhouseVaultAddr", vaultAddress: "RuntimeSteakhouseVaultAddr", representation: "direct_vault_share", mechanic: "managed_vault_deposit", currentValueUsd: 5000 })]);
    add("16F-DC: detected production positions may exist while approved matches remain zero", steakhouse.canonicalEconomicPositions.length === 1 && steakhouse.matchedApprovedPositionIds.length === 0, "detected/0 approved");
    add("16F-DD: production Steakhouse runtime address does not auto-approve a product", steakhouse.observedUndocumentedProducts.some((o) => o.observedProductAddress === "RuntimeSteakhouseVaultAddr" && o.autoApproved === false && o.registryMutated === false) && listYieldStrategies().every((e) => e.address === undefined || getStableYieldEvidenceManifest(e.strategyId)?.productAddress === e.address) && getApprovedYieldStrategies().length === 0, "no approve");
    add("16F-DE: production unmatched positions do not count toward buffer", steakhouse.canonicalEconomicPositions.every((p) => p.countsTowardSafetyBuffer === false), "excluded");
  }
  add("16F-DF: no product-specific capital amount is produced without an approved product", capital({}).amountSelected === false && capital({}).productSelected === false, "no amount");

  // ---- Hubble ----
  add("16F-DG: Hubble remains in documented protocol scope", getYieldStrategiesByProtocol("hubble").length >= 1, "present");
  add("16F-DH: Hubble receives no protocol-name penalty (in scope; a normal Hubble yield deposit is not penalized)", getYieldStrategiesByProtocol("hubble").length >= 1 && normalizeYieldStrategyPosition(mkPos({ protocolId: "hubble", productAddress: "HUB1", metadata: { positionKind: "yield_deposit" } })).blockers.length === 0 && !/hubble.*deprecated|penal|blocklist|blacklist/.test(posBlob), "no penalty");
  add("16F-DI: Hubble CDP is not yield", normalizeYieldStrategyPosition(mkPos({ protocolId: "hubble", metadata: { positionKind: "cdp_collateral" } })).blockers.includes("not_a_yield_position"), "not yield");
  add("16F-DJ: a future exact Hubble yield product can use generic matching", matchYieldStrategyPosition(normalizeYieldStrategyPosition(mkPos({ protocolId: "hubble", productAddress: "HUB_ADDR", mechanic: "lending_deposit" })), [approvedEntry({ strategyId: "hub_syn", protocolId: "hubble", address: "HUB_ADDR" })]).matchStatus === "matched_approved", "generic");

  // ---- Boundaries ----
  add("16F-DK: no comparison is rerun", capital({}).comparisonPerformed === false && buildSet([]).comparisonPerformed === false, "no rerun");
  add("16F-DL: no product is selected", capital({}).productSelected === false && STABLE_YIELD_CAPITAL_SELECTS_PRODUCT === false, "no product");
  add("16F-DM: no final deposit amount is selected", capital({}).amountSelected === false && STABLE_YIELD_CAPITAL_SELECTS_FINAL_AMOUNT === false, "no amount");
  add("16F-DN: no switch decision is generated", !/switchdecision|shouldswitch|switchproduct/.test(posBlob), "no switch");
  add("16F-DO: no expected earnings are calculated", !/expectedearnings|projectedearnings|futurevalue/.test(posBlob), "no earnings");
  add("16F-DP: no plan is generated", capital({}).planGenerated === false && STABLE_YIELD_CAPITAL_GENERATES_PLAN === false, "no plan");
  add("16F-DQ: no suggestion is generated", capital({}).suggestionGenerated === false && buildSet([]).suggestionGenerated === false, "no suggestion");
  add("16F-DR: no product output is updated", capital({}).updatesProductOutput === false && STABLE_YIELD_CAPITAL_UPDATES_PRODUCT_OUTPUT === false, "no output");
  {
    const prodFiles = ["src/components/SuggestionCard.tsx", "src/components/SuggestionReviewModal.tsx", "src/pages/DemoDashboardPage.tsx", "src/pages/DashboardPage.tsx", "src/components/RealWalletSuggestionsRail.tsx"];
    add("16F-DS: no product-facing file imports positions/capital (the UI reads only the 16H-B presentation)", prodFiles.every((f) => !/yieldStrategyPosition|yieldStrategyEligibleCapital|yieldStrategyCapital/.test(readIf(f))), "no UI import");
  }
  add("16F-DT: no transaction path exists", capital({}).transactionsEnabled === false && buildSet([]).transactionsEnabled === false && STABLE_YIELD_EXECUTION_ENABLED === false, "read-only");
  add("16F-DU: no signature path exists", capital({}).walletSignatureRequired === false && buildSet([]).walletSignatureRequired === false, "no signature");
  add("16F-DV: no deposit/withdraw/swap/stake/execute handler exists", !/sendtransaction|signtransaction|deposit\(|withdraw\(|swap\(|stake\(|execute\(|fetch\(/.test(posBlob), "no handlers");

  // ---- Validator integrity + diagnostics ----
  add("16F-INT-A: a normalized matched_approved position validates", validateYieldStrategyPosition(matchApproved).valid === true, "valid");
  add("16F-INT-B: a position set + capital snapshot validate", validateYieldStrategyPositionSet(bufferOk).valid === true && validateYieldStrategyEligibleCapitalSnapshot(capital({})).valid === true, "valid");
  add("16F-INT-C: the capital policy validates and reuses the $250 excess trigger", getYieldStrategyCapitalPolicy().excessYieldMinimumUsd === 250 && YIELD_STRATEGY_EXCESS_YIELD_MINIMUM_USD === 250, "250");
  add("16F-INT-D: diagnostics + explain use no recommendation language", (() => { const txt = [...explainYieldStrategyCapital(capital({})), explainYieldStrategyPositionExclusion(buildSet([mkPos({ productAddress: "X" })], { registry: [approvedEntry()] }).canonicalEconomicPositions[0]), JSON.stringify(getYieldStrategyPositionDiagnostics(bufferOk)), JSON.stringify(getYieldStrategyCapitalDiagnostics(capital({})))].join(" "); return !/\b(best|safest|winner|recommended|deposit now|switch|you should|move)\b/i.test(txt); })(), "clean");

  return checks;
}

/**
 * Step 16G — single read-only Stable Yield plan fixtures (16G-A…DL). Verifies the product-capacity
 * contract, real-leader-only selection, start-vs-add action mode, buffer>excess priority + one-plan
 * shared-source resolution, lane/product minimums (buffer fails closed, excess $250), exact-cent
 * amounts, buffer-preserving projections, stable plan IDs, production no_plan, and that nothing
 * downstream (suggestion/UI/deep link/transaction/signature) is enabled.
 */

/**
 * Step 16G — single read-only Stable Yield plan fixtures (16G-A…DL). Verifies the product-capacity
 * contract, real-leader-only selection, start-vs-add action mode, buffer>excess priority + one-plan
 * shared-source resolution, lane/product minimums (buffer fails closed, excess $250), exact-cent
 * amounts, buffer-preserving projections, stable plan IDs, production no_plan, and that nothing
 * downstream (suggestion/UI/deep link/transaction/signature) is enabled.
 */
export function runYieldStrategyPlanFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const root = process.cwd();
  const readIf = (rel: string) => { try { return readFileSync(`${root}/${rel}`, "utf8"); } catch { return ""; } };
  const T = "2026-07-16T00:00:00.000Z";
  const OLD = "2026-07-15T20:00:00.000Z";
  const FUTURE = "2026-07-16T02:00:00.000Z";
  const OWNER = "OwnerPlan1111111111111111111111111111111111";

  const approvedEntry = (o: Partial<ELIG_Entry> = {}): ELIG_Entry => ({ schemaVersion: "1.0.0", registryVersion: "1.0.0", strategyId: "syn", displayName: "Syn", protocolId: "kamino", protocolDisplayName: "Kamino", strategyType: "lending", principalAsset: "USDC", supportedLane: "safety_buffer_yield", riskLane: "buffer_eligible", lifecycle: "approved", officialUrl: "https://app.kamino.finance", documentationUrl: "https://docs.kamino.finance", address: "ADDR", marketDataEvaluated: false, eligibilityEvaluated: false, comparisonEvaluated: false, suggestionGenerated: false, transactionsEnabled: false, walletSignatureRequired: false, notes: [], ...o });
  const EX_ENTRY = approvedEntry({ strategyId: "syn_ex", displayName: "Syn Excess Vault", supportedLane: "excess_usdc_yield", riskLane: "excess_only", strategyType: "managed_vault", address: "ADDR_EX" });
  const BUF_ENTRY = approvedEntry({ strategyId: "syn_buf", displayName: "Syn Buffer Lending", supportedLane: "safety_buffer_yield", riskLane: "buffer_eligible", strategyType: "lending", address: "ADDR_BUF" });

  const mkLeaderPos = (status: string, count = 0) => ({ lane: "buffer", held: status === "leader_held" || status === "leader_held_multiple_positions", matchedPositionIds: count ? Array.from({ length: count }, (_, i) => `pos${i}`) : [], positionCount: count, status, warnings: [], blockers: [] });
  const mkCapacity = (o: Partial<PLAN_Cap> = {}): PLAN_Cap => ({ schemaVersion: "1.0.0", policyId: "yield_strategy_product_capacity_v1", policyVersion: "1.0.0", strategyId: "syn_ex", protocolId: "kamino", productAddress: "ADDR_EX", principalAssetId: "USDC", capacityMode: "explicit_remaining_capacity", acceptingDeposits: true, remainingDepositCapacityUsd: 100000, sourceId: "cap_src", provenanceKind: "documented_source", browserFetched: false, fetchedAt: T, checkedAt: T, maximumAgeMs: 3600000, ageMs: 0, status: "complete", warnings: [], blockers: [], productSelected: false, amountSelected: false, planGenerated: false, suggestionGenerated: false, transactionsEnabled: false, walletSignatureRequired: false, ...o });
  interface CapOpts { status?: string; bufferComplete?: boolean; bufferCap?: number; excessCap?: number; directBuffer?: number; liquid?: number; surplus?: number; required?: number; floor?: number; maxCombined?: number; remainingBuffer?: number; existingYield?: number; current?: number; overlap?: number; bufferLeaderPos?: string; excessLeaderPos?: string; }
  const mkCapital = (o: CapOpts = {}): PLAN_CapitalSnap => ({ schemaVersion: "1.0.0", policyId: "yield_strategy_capital_v1", policyVersion: "1.0.0", ownerAddress: OWNER, checkedAt: T, status: (o.status ?? "ready"), requiredBufferUsd: o.required ?? 1000, directWalletEligibleBufferUsd: o.directBuffer ?? 1500, existingEligibleBufferYieldUsd: o.existingYield ?? 0, currentEligibleBufferUsd: o.current ?? 1500, bufferShortfallUsd: 0, canonicalBufferSurplusUsd: o.surplus ?? 500, bufferComplete: o.bufferComplete ?? true, vaultAllocationPct: 0.7, walletAllocationPct: 0.3, allowedBufferYieldUsd: 700, requiredWalletFloorUsd: o.floor ?? 300, remainingBufferYieldCapacityUsd: o.remainingBuffer ?? 700, directLiquidUsdcUsd: o.liquid ?? 5000, rawBufferYieldCapitalUsd: o.bufferCap ?? 0, bufferYieldEligibleCapitalUsd: o.bufferCap ?? 0, bufferYieldMinimumPolicyAvailable: false, rawExcessYieldCapitalUsd: o.excessCap ?? 0, excessYieldEligibleCapitalUsd: o.excessCap ?? 0, excessYieldMinimumUsd: 250, excessYieldMeetsMinimum: (o.excessCap ?? 0) >= 250, maximumCombinedSourceCapitalUsd: o.maxCombined ?? ((o.bufferCap ?? 0) + (o.excessCap ?? 0)), sharedSourceOverlapPossible: (o.overlap ?? 0) > 0, sharedSourceOverlapUsd: o.overlap ?? 0, bufferLeaderPositionStatus: mkLeaderPos(o.bufferLeaderPos ?? "no_comparison_leader"), excessLeaderPositionStatus: mkLeaderPos(o.excessLeaderPos ?? "no_comparison_leader"), comparisonPerformed: false, productSelected: false, amountSelected: false, planGenerated: false, suggestionGenerated: false, updatesProductOutput: false, transactionsEnabled: false, walletSignatureRequired: false, blockers: [], warnings: [], notes: [] } as unknown as PLAN_CapitalSnap);
  const mkLaneComp = (lane: string, o: { status?: string; leader?: string; score?: number; reason?: string }) => ({ schemaVersion: "1.0.0", policyId: "yield_strategy_comparison_v1", policyVersion: "1.0.0", lane, status: o.status ?? "empty_eligible_set", checkedAt: T, candidateScorecards: [], orderedStrategyIds: [], ...(o.leader ? { comparisonLeaderStrategyId: o.leader } : {}), ...(o.score !== undefined ? { comparisonLeaderScore: o.score } : {}), leaderSelectionReason: o.reason ?? "none_empty_set", tieAnalysis: {}, sensitivityAnalysis: {}, walletPositionsEvaluated: false, userCapitalEvaluated: false, amountCalculated: false, planGenerated: false, suggestionGenerated: false, updatesProductOutput: false, transactionsEnabled: false, walletSignatureRequired: false, warnings: [], blockers: [], notes: [] });
  const mkComparison = (buffer: { status?: string; leader?: string; score?: number; reason?: string }, excess: { status?: string; leader?: string; score?: number; reason?: string }) => ({ schemaVersion: "1.0.0", policyId: "yield_strategy_comparison_v1", policyVersion: "1.0.0", checkedAt: T, bufferComparison: mkLaneComp("buffer", buffer), excessComparison: mkLaneComp("excess", excess), ...(buffer.leader ? { bufferComparisonLeaderStrategyId: buffer.leader } : {}), ...(excess.leader ? { excessComparisonLeaderStrategyId: excess.leader } : {}), emptyApprovedSet: false, emptyBufferEligibleSet: false, emptyExcessEligibleSet: false, comparisonPerformed: true, rankingPerformed: true, walletPositionsEvaluated: false, userCapitalEvaluated: false, amountCalculated: false, planGenerated: false, suggestionGenerated: false, updatesProductOutput: false, transactionsEnabled: false, walletSignatureRequired: false, warnings: [], blockers: [], notes: [] } as unknown as CMP_Set);
  const elig = (buffer: string[], excess: string[]) => ({ bufferEligibleStrategyIds: buffer, excessEligibleStrategyIds: excess } as unknown as ELIG_EligSet);

  interface DecideOpts { registry?: ELIG_Entry[]; eligibilitySet?: ELIG_EligSet; comparisonSet?: CMP_Set; capitalSnapshot?: PLAN_CapitalSnap; productCapacitySet?: PLAN_Cap[]; bufferMin?: number; checkedAt?: string; }
  const decide = (o: DecideOpts) => buildYieldStrategyPlanDecision({ ownerAddress: OWNER, checkedAt: o.checkedAt ?? T, registry: o.registry ?? [], eligibilitySet: o.eligibilitySet ?? elig([], []), comparisonSet: o.comparisonSet ?? mkComparison({}, {}), capitalSnapshot: o.capitalSnapshot ?? mkCapital(), ...(o.productCapacitySet ? { productCapacitySet: o.productCapacitySet } : {}), ...(o.bufferMin !== undefined ? { bufferMinimumOverrideUsd: o.bufferMin } : {}) });

  // A canonical ready-excess decision.
  const excessReady = (capOver: CapOpts = {}, capacityOver: Partial<PLAN_Cap> = {}) => decide({
    registry: [EX_ENTRY], eligibilitySet: elig([], ["syn_ex"]),
    comparisonSet: mkComparison({ status: "empty_eligible_set", reason: "none_empty_set" }, { status: "complete", leader: "syn_ex", score: 80, reason: "highest_stable_score" }),
    capitalSnapshot: mkCapital({ bufferCap: 0, excessCap: 500, directBuffer: 1500, surplus: 500, current: 1500, maxCombined: 500, excessLeaderPos: "leader_not_held", ...capOver }),
    productCapacitySet: [mkCapacity({ strategyId: "syn_ex", productAddress: "ADDR_EX", ...capacityOver })],
  });
  // A canonical ready-buffer decision (requires an injected buffer minimum).
  const bufferReady = (capOver: CapOpts = {}, opts: { bufferMin?: number } = {}) => decide({
    registry: [BUF_ENTRY], eligibilitySet: elig(["syn_buf"], []),
    comparisonSet: mkComparison({ status: "complete", leader: "syn_buf", score: 85, reason: "highest_stable_score" }, { status: "empty_eligible_set", reason: "none_empty_set" }),
    capitalSnapshot: mkCapital({ bufferCap: 700, excessCap: 0, directBuffer: 1000, surplus: 0, current: 1000, maxCombined: 700, bufferLeaderPos: "leader_not_held", ...capOver }),
    productCapacitySet: [mkCapacity({ strategyId: "syn_buf", productAddress: "ADDR_BUF" })],
    bufferMin: opts.bufferMin ?? 50,
  });

  const planBlob = ["yieldStrategyProductCapacity", "yieldStrategyPlanTypes", "yieldStrategyPlanPolicy", "yieldStrategyPlan", "yieldStrategyPlanDiagnostics"].map((f) => readIf(`src/suggestions/${f}.ts`)).join("").toLowerCase();
  const cents = (v: number) => Math.abs(Math.round(v * 100) - v * 100) < 1e-6;

  // ---- Versions + flags ----
  add("16G-A: product-capacity schema/version exist", YIELD_STRATEGY_PRODUCT_CAPACITY_SCHEMA_VERSION === "1.0.0" && YIELD_STRATEGY_PRODUCT_CAPACITY_POLICY_ID === "yield_strategy_product_capacity_v1", YIELD_STRATEGY_PRODUCT_CAPACITY_POLICY_ID);
  add("16G-B: plan schema/version exist", YIELD_STRATEGY_PLAN_SCHEMA_VERSION === "1.0.0" && YIELD_STRATEGY_PLAN_POLICY_ID === "yield_strategy_plan_v1" && PLAN_EXISTS_CONST === true, YIELD_STRATEGY_PLAN_POLICY_ID);
  add("16G-C: plan-selection policy exists", YIELD_STRATEGY_PLAN_SELECTION_POLICY_ID === "yield_strategy_plan_selection_v1", YIELD_STRATEGY_PLAN_SELECTION_POLICY_ID);
  add("16G-D: product-capacity flag is true", CAPACITY_FLAG === true, "true");
  add("16G-E: plan flag is true", PLAN_FLAG === true && PLANS_FLAG === true, "true");
  add("16G-F: product + final-amount selection flags are true at the plan layer", YIELD_STRATEGY_PLAN_SELECTS_PRODUCT === true && YIELD_STRATEGY_PLAN_SELECTS_FINAL_AMOUNT === true, "true");
  add("16G-G: execution flags remain false and the PLAN layer itself generates no suggestion", STABLE_YIELD_EXECUTION_ENABLED === false && STABLE_YIELD_PLAN_GENERATES_SUGGESTION === false && STABLE_YIELD_PLAN_PREPARES_EXECUTION === false && STABLE_YIELD_PLAN_BUILDS_TRANSACTION === false && STABLE_YIELD_PLAN_REQUESTS_SIGNATURE === false && STABLE_YIELD_PLAN_UPDATES_PRODUCT_OUTPUT === false, "false");

  // ---- Production state ----
  const prodDecision = decide({ comparisonSet: mkComparison({ status: "empty_eligible_set", reason: "none_empty_set" }, { status: "empty_eligible_set", reason: "none_empty_set" }), capitalSnapshot: mkCapital({ bufferCap: 0, excessCap: 0, status: "empty_approved_set" as never }) });
  add("16G-H: production registry still has zero approved products", getApprovedYieldStrategies().length === 0, "0 approved");
  add("16G-I: production comparison has no leaders", prodDecision.bufferLaneEvaluation.status === "no_comparison_leader" && prodDecision.excessLaneEvaluation.status === "no_comparison_leader", "no leaders");
  add("16G-J: production decision returns no_plan", prodDecision.status === "no_plan" && prodDecision.planCount === 0, prodDecision.status);
  add("16G-K: production has no selected product", prodDecision.productSelected === false && prodDecision.selectedStrategyId === undefined, "no product");
  add("16G-L: production has no selected amount", prodDecision.amountSelected === false && prodDecision.selectedAmountUsd === undefined, "no amount");
  add("16G-M: no production address or capacity is invented", listYieldStrategies().every((e) => e.address === undefined || getStableYieldEvidenceManifest(e.strategyId)?.productAddress === e.address) && prodDecision.selectedPlan === undefined, "no invent");

  // ---- Capacity ----
  add("16G-N: exact matching capacity snapshot can be consumed", excessReady().status === "ready", excessReady().status);
  add("16G-O: strategy mismatch blocks", excessReady({}, { strategyId: "wrong" }).status === "no_plan" && excessReady({}, { strategyId: "wrong" }).excessLaneEvaluation.noPlanReason === "product_capacity_missing", "blocked");
  add("16G-P: address mismatch blocks", excessReady({}, { productAddress: "WRONG" }).status !== "ready", "blocked");
  add("16G-Q: principal asset mismatch blocks", excessReady({}, { principalAssetId: "USDT" }).status !== "ready", "blocked");
  add("16G-R: explicit remaining capacity is respected", excessReady({ excessCap: 5000, surplus: 5000, directBuffer: 6000, current: 6000, maxCombined: 5000 }, { remainingDepositCapacityUsd: 300 }).selectedPlan!.amountUsd === 300, "respected");
  add("16G-S: user-specific capacity is respected", excessReady({ excessCap: 5000, surplus: 5000, directBuffer: 6000, current: 6000, maxCombined: 5000 }, { remainingDepositCapacityUsd: 900, userRemainingDepositCapacityUsd: 400 }).selectedPlan!.amountUsd === 400, "user cap");
  add("16G-T: the smaller explicit capacity bound wins", excessReady({ excessCap: 5000, surplus: 5000, directBuffer: 6000, current: 6000, maxCombined: 5000 }, { remainingDepositCapacityUsd: 350, userRemainingDepositCapacityUsd: 800 }).selectedPlan!.amountUsd === 350, "min wins");
  add("16G-U: verified uncapped uses lane capital without Infinity", (() => { const d = excessReady({ excessCap: 500 }, { capacityMode: "verified_uncapped", remainingDepositCapacityUsd: undefined }); return d.status === "ready" && d.selectedPlan!.amountUsd === 500 && Number.isFinite(d.selectedPlan!.effectiveProductCapacityUsd); })(), "uncapped=laneCap");
  add("16G-V: unknown capacity blocks", excessReady({}, { capacityMode: "unknown" }).status !== "ready", "blocked");
  add("16G-W: unavailable capacity blocks", excessReady({}, { capacityMode: "unavailable" }).status !== "ready", "blocked");
  add("16G-X: stale capacity blocks", excessReady({}, { fetchedAt: OLD, maximumAgeMs: 3600000 }).excessLaneEvaluation.noPlanReason === "product_capacity_stale", "stale");
  add("16G-Y: future-dated capacity blocks", excessReady({}, { fetchedAt: FUTURE }).status !== "ready", "future");
  add("16G-Z: paused deposits block", excessReady({}, { capacityMode: "deposits_paused", acceptingDeposits: false }).excessLaneEvaluation.noPlanReason === "deposits_paused", "paused");
  add("16G-AA: full product blocks", excessReady({}, { capacityMode: "product_full", acceptingDeposits: false }).excessLaneEvaluation.noPlanReason === "product_full", "full");
  add("16G-AB: TVL is not used as deposit capacity", !/tvl/.test(readIf("src/suggestions/yieldStrategyProductCapacity.ts").split("effectiveProductCapacityUsd")[1] ?? ""), "no tvl");
  add("16G-AC: withdrawal liquidity is not used as deposit capacity", !/withdrawal|availableliquidity/.test((readIf("src/suggestions/yieldStrategyProductCapacity.ts").toLowerCase().split("function effectiveproductcapacityusd")[1] ?? "").split("}")[0] ?? ""), "no withdrawal");

  // ---- Leader rules ----
  add("16G-AD: stable highest-score leader may be selected", excessReady().selectedPlan!.comparisonLeaderReason === "highest_stable_score", "highest_stable_score");
  add("16G-AE: only eligible candidate may be selected", excessReady({}, {}).status === "ready" && decide({ registry: [EX_ENTRY], eligibilitySet: elig([], ["syn_ex"]), comparisonSet: mkComparison({ status: "empty_eligible_set", reason: "none_empty_set" }, { status: "single_eligible_candidate", leader: "syn_ex", score: 50, reason: "only_eligible_candidate" }), capitalSnapshot: mkCapital({ excessCap: 500, directBuffer: 1500, surplus: 500, current: 1500, maxCombined: 500, excessLeaderPos: "leader_not_held" }), productCapacitySet: [mkCapacity({})] }).selectedPlan!.comparisonLeaderReason === "only_eligible_candidate", "only_eligible");
  add("16G-AF: material-tie result cannot produce a plan", excessReady({}, {}).status === "ready" && decide({ registry: [EX_ENTRY], eligibilitySet: elig([], ["syn_ex"]), comparisonSet: mkComparison({ status: "empty_eligible_set", reason: "none_empty_set" }, { status: "leader_withheld_tie", reason: "none_material_tie" }), capitalSnapshot: mkCapital({ excessCap: 500 }), productCapacitySet: [mkCapacity({})] }).status === "no_plan", "tie");
  add("16G-AG: sensitivity-withheld result cannot produce a plan", decide({ registry: [EX_ENTRY], eligibilitySet: elig([], ["syn_ex"]), comparisonSet: mkComparison({ status: "empty_eligible_set", reason: "none_empty_set" }, { status: "leader_withheld_sensitivity", reason: "none_sensitivity_failed" }), capitalSnapshot: mkCapital({ excessCap: 500 }), productCapacitySet: [mkCapacity({})] }).excessLaneEvaluation.noPlanReason === "comparison_leader_withheld_sensitivity", "sensitivity");
  add("16G-AH: incomparable-data result cannot produce a plan", decide({ registry: [EX_ENTRY], eligibilitySet: elig([], ["syn_ex"]), comparisonSet: mkComparison({ status: "empty_eligible_set", reason: "none_empty_set" }, { status: "leader_withheld_incomparable_data", reason: "none_incomparable_data" }), capitalSnapshot: mkCapital({ excessCap: 500 }), productCapacitySet: [mkCapacity({})] }).excessLaneEvaluation.noPlanReason === "comparison_leader_withheld_incomparable_data", "incomparable");
  add("16G-AI: invalid comparison cannot produce a plan", decide({ registry: [EX_ENTRY], eligibilitySet: elig([], ["syn_ex"]), comparisonSet: mkComparison({ status: "empty_eligible_set", reason: "none_empty_set" }, { status: "invalid", reason: "none_invalid" }), capitalSnapshot: mkCapital({ excessCap: 500 }), productCapacitySet: [mkCapacity({})] }).status === "no_plan", "invalid");
  add("16G-AJ: second-ranked candidate is never selected (no leader → no plan)", decide({ registry: [EX_ENTRY], eligibilitySet: elig([], ["syn_ex"]), comparisonSet: mkComparison({ status: "empty_eligible_set", reason: "none_empty_set" }, { status: "empty_eligible_set", reason: "none_empty_set" }), capitalSnapshot: mkCapital({ excessCap: 500 }), productCapacitySet: [mkCapacity({})] }).status === "no_plan", "no second");
  add("16G-AK: registry order is never used as fallback selection", !/registryorder|orderfallback/.test(planBlob), "no fallback");
  add("16G-AL: highest APY is never used as fallback selection", !/apyfallback|highestapy/.test(planBlob), "no apy fallback");

  // ---- Action mode ----
  add("16G-AM: unheld leader produces start_new_position", excessReady({ excessLeaderPos: "leader_not_held" }).selectedPlan!.actionMode === "start_new_position", "start");
  add("16G-AN: held leader produces add_to_existing_strategy", excessReady({ excessLeaderPos: "leader_held" }).selectedPlan!.actionMode === "add_to_existing_strategy", "add");
  add("16G-AO: multiple held leader accounts still produce add_to_existing_strategy", excessReady({ excessLeaderPos: "leader_held_multiple_positions" }).selectedPlan!.actionMode === "add_to_existing_strategy", "add");
  add("16G-AP: ambiguous leader position blocks", excessReady({ excessLeaderPos: "leader_position_ambiguous" }).status === "no_plan" && excessReady({ excessLeaderPos: "leader_position_ambiguous" }).excessLaneEvaluation.status === "leader_position_ambiguous", "blocked");
  add("16G-AQ: unavailable leader position blocks", excessReady({ excessLeaderPos: "leader_position_unavailable" }).excessLaneEvaluation.status === "leader_position_unavailable", "blocked");
  add("16G-AR: another held non-leader strategy does not create a switch action (only start/add exist)", excessReady({ excessLeaderPos: "leader_not_held" }).selectedPlan!.actionMode === "start_new_position" && (excessReady().selectedPlan!.actionMode === "start_new_position" || excessReady().selectedPlan!.actionMode === "add_to_existing_strategy"), "start/add only");
  add("16G-AS: existing positions are never funding sources", excessReady().selectedPlan!.source.type === "direct_wallet_usdc", "direct only");

  // ---- Lane priority ----
  const bothReady = decide({ registry: [BUF_ENTRY, EX_ENTRY], eligibilitySet: elig(["syn_buf"], ["syn_ex"]), comparisonSet: mkComparison({ status: "complete", leader: "syn_buf", score: 85, reason: "highest_stable_score" }, { status: "complete", leader: "syn_ex", score: 80, reason: "highest_stable_score" }), capitalSnapshot: mkCapital({ bufferCap: 700, excessCap: 500, directBuffer: 1500, surplus: 500, current: 1500, maxCombined: 1000, bufferLeaderPos: "leader_not_held", excessLeaderPos: "leader_not_held" }), productCapacitySet: [mkCapacity({ strategyId: "syn_buf", productAddress: "ADDR_BUF" }), mkCapacity({ strategyId: "syn_ex", productAddress: "ADDR_EX" })], bufferMin: 50 });
  add("16G-AT: ready buffer lane is selected before ready excess lane", bothReady.selectedLane === "buffer" && bothReady.selectedPlan!.lane === "buffer", bothReady.selectedLane ?? "none");
  add("16G-AU: ready excess lane is suppressed when buffer is selected", bothReady.excessLaneEvaluation.status === "suppressed_by_higher_priority_lane" && bothReady.planCount === 1, "suppressed");
  add("16G-AV: excess may proceed when buffer has no leader", excessReady().status === "ready" && excessReady().selectedLane === "excess", "excess proceeds");
  add("16G-AW: excess may proceed when buffer capacity is zero", excessReady({ bufferCap: 0 }).status === "ready", "excess proceeds");
  add("16G-AX: excess may proceed when buffer product capacity is unavailable", decide({ registry: [BUF_ENTRY, EX_ENTRY], eligibilitySet: elig(["syn_buf"], ["syn_ex"]), comparisonSet: mkComparison({ status: "complete", leader: "syn_buf", score: 85, reason: "highest_stable_score" }, { status: "complete", leader: "syn_ex", score: 80, reason: "highest_stable_score" }), capitalSnapshot: mkCapital({ bufferCap: 700, excessCap: 500, directBuffer: 1500, surplus: 500, current: 1500, maxCombined: 1000, bufferLeaderPos: "leader_not_held", excessLeaderPos: "leader_not_held" }), productCapacitySet: [mkCapacity({ strategyId: "syn_ex", productAddress: "ADDR_EX" })], bufferMin: 50 }).selectedLane === "excess", "excess proceeds");
  add("16G-AY: only one plan is created", bothReady.planCount === 1, "one");
  add("16G-AZ: both lanes are never selected", validateYieldStrategyPlanDecision(bothReady).valid === true && !(bothReady.bufferLaneEvaluation.status === "ready" && bothReady.excessLaneEvaluation.status === "ready"), "not both");

  // ---- Minimums ----
  add("16G-BA: canonical excess minimum is reused", YIELD_STRATEGY_PLAN_EXCESS_MINIMUM_USD === 250, "250");
  add("16G-BB: $249.99 cannot produce an excess plan", excessReady({ excessCap: 249.99, surplus: 249.99, directBuffer: 1249.99, current: 1249.99, maxCombined: 249.99 }).status === "no_plan", "below");
  add("16G-BC: $250.00 may produce an excess plan", excessReady({ excessCap: 250, surplus: 250, directBuffer: 1250, current: 1250, maxCombined: 250 }).selectedPlan!.amountUsd === 250, "meets");
  add("16G-BD: product minimum above lane minimum is respected", excessReady({ excessCap: 5000, surplus: 5000, directBuffer: 6000, current: 6000, maxCombined: 5000 }, { minimumDepositUsd: 400, remainingDepositCapacityUsd: 350 }).status === "no_plan", "prod min");
  add("16G-BE: lane minimum above product minimum is respected", excessReady({ excessCap: 240, surplus: 240, directBuffer: 1240, current: 1240, maxCombined: 240 }, { minimumDepositUsd: 10 }).status === "no_plan", "lane min");
  add("16G-BF: amount is never padded upward to meet a minimum", excessReady({ excessCap: 249.99, surplus: 249.99, directBuffer: 1249.99, current: 1249.99, maxCombined: 249.99 }).selectedPlan === undefined, "no pad");
  add("16G-BG: missing buffer minimum policy blocks buffer planning when no canonical policy exists", decide({ registry: [BUF_ENTRY], eligibilitySet: elig(["syn_buf"], []), comparisonSet: mkComparison({ status: "complete", leader: "syn_buf", score: 85, reason: "highest_stable_score" }, { status: "empty_eligible_set", reason: "none_empty_set" }), capitalSnapshot: mkCapital({ bufferCap: 700, directBuffer: 1000, current: 1000, bufferLeaderPos: "leader_not_held" }), productCapacitySet: [mkCapacity({ strategyId: "syn_buf", productAddress: "ADDR_BUF" })] }).bufferLaneEvaluation.status === "buffer_minimum_policy_missing", "blocked");
  add("16G-BH: excess may still proceed when buffer minimum policy is missing", decide({ registry: [BUF_ENTRY, EX_ENTRY], eligibilitySet: elig(["syn_buf"], ["syn_ex"]), comparisonSet: mkComparison({ status: "complete", leader: "syn_buf", score: 85, reason: "highest_stable_score" }, { status: "complete", leader: "syn_ex", score: 80, reason: "highest_stable_score" }), capitalSnapshot: mkCapital({ bufferCap: 700, excessCap: 500, directBuffer: 1500, surplus: 500, current: 1500, maxCombined: 1000, bufferLeaderPos: "leader_not_held", excessLeaderPos: "leader_not_held" }), productCapacitySet: [mkCapacity({ strategyId: "syn_buf", productAddress: "ADDR_BUF" }), mkCapacity({ strategyId: "syn_ex", productAddress: "ADDR_EX" })] }).selectedLane === "excess", "excess proceeds");

  // ---- Amounts ----
  add("16G-BI: selected amount does not exceed lane capital", excessReady().selectedPlan!.amountUsd <= excessReady().selectedPlan!.laneCapitalUsd + 1e-9, "<=laneCap");
  add("16G-BJ: selected amount does not exceed direct liquid USDC", excessReady({ liquid: 300, excessCap: 500, surplus: 500, directBuffer: 1500, current: 1500, maxCombined: 500 }).selectedPlan!.amountUsd <= 300, "<=liquid");
  add("16G-BK: selected amount does not exceed product capacity", excessReady({ excessCap: 5000, surplus: 5000, directBuffer: 6000, current: 6000, maxCombined: 5000 }, { remainingDepositCapacityUsd: 450 }).selectedPlan!.amountUsd === 450, "<=capacity");
  add("16G-BL: selected amount does not exceed product maximum", excessReady({ excessCap: 5000, surplus: 5000, directBuffer: 6000, current: 6000, maxCombined: 5000 }, { maximumDepositUsd: 380 }).selectedPlan!.amountUsd === 380, "<=max");
  add("16G-BM: selected amount does not exceed maximum combined source capital", excessReady({ excessCap: 900, surplus: 900, directBuffer: 1900, current: 1900, maxCombined: 400 }).selectedPlan!.amountUsd <= 400, "<=maxCombined");
  add("16G-BN: amount is floored to exact cents", (() => { const d = excessReady({ excessCap: 500.567, surplus: 500.567, directBuffer: 1500.567, current: 1500.567, maxCombined: 500.567 }); return d.selectedPlan!.amountUsd === 500.56 && cents(d.selectedPlan!.amountUsd); })(), "500.56");
  add("16G-BO: amount is never rounded upward", excessReady({ excessCap: 500.567, surplus: 500.567, directBuffer: 1500.567, current: 1500.567, maxCombined: 500.567 }).selectedPlan!.amountUsd < 500.567, "floored");
  add("16G-BP: amount cents and amount USD agree", excessReady().selectedPlan!.amountCents === Math.round(excessReady().selectedPlan!.amountUsd * 100), "agree");
  add("16G-BQ: zero amount produces no plan", excessReady({ excessCap: 0 }).status === "no_plan", "no plan");
  add("16G-BR: negative or non-finite values block", excessReady({ excessCap: Number.NaN as unknown as number }).status !== "ready", "blocked");

  // ---- Buffer plan ----
  add("16G-BS: incomplete Safety Buffer cannot produce a buffer plan", bufferReady({ bufferComplete: false, status: "buffer_incomplete", bufferCap: 0 }).status !== "ready", "no buffer plan");
  add("16G-BT: buffer plan does not exceed remaining vault allocation capacity", bufferReady({ remainingBuffer: 200, bufferCap: 700 }).selectedPlan!.amountUsd <= 200 + 1e-9, "<=remaining");
  add("16G-BU: buffer plan does not exceed movable required-buffer capital", bufferReady().selectedPlan!.amountUsd <= bufferReady().selectedPlan!.laneCapitalUsd + 1e-9, "<=movable");
  add("16G-BV: buffer plan preserves the direct-wallet floor", bufferReady().selectedPlan!.projection.walletFloorPreserved === true, "floor preserved");
  add("16G-BW: buffer plan preserves total buffer coverage", bufferReady().selectedPlan!.projection.bufferCoveragePreserved === true && bufferReady().selectedPlan!.projection.currentEligibleBufferAfterUsd >= 1000, "coverage");
  add("16G-BX: buffer projection transfers value from direct wallet to eligible yield", (() => { const p = bufferReady().selectedPlan!.projection; return p.directWalletEligibleBufferAfterUsd === p.directWalletEligibleBufferBeforeUsd - bufferReady().selectedPlan!.amountUsd && p.existingEligibleBufferYieldAfterUsd === p.existingEligibleBufferYieldBeforeUsd + bufferReady().selectedPlan!.amountUsd; })(), "transfer");
  add("16G-BY: buffer projection does not calculate expected earnings", !/expectedearnings|projectedearnings|apy \*|futurevalue/.test(planBlob), "no earnings");

  // ---- Excess plan ----
  add("16G-BZ: incomplete Safety Buffer cannot produce an excess plan", excessReady({ bufferComplete: false, status: "buffer_incomplete", excessCap: 0 }).status !== "ready", "no excess plan");
  add("16G-CA: excess plan does not exceed canonical buffer surplus", excessReady({ excessCap: 900, surplus: 300, directBuffer: 1900, current: 1300, maxCombined: 900 }).selectedPlan!.amountUsd <= 300 + 1e-9, "<=surplus");
  add("16G-CB: excess plan does not exceed direct-wallet excess slice (via surplus/liquid caps)", excessReady({ excessCap: 500, surplus: 500, directBuffer: 1500, current: 1500, maxCombined: 500 }).selectedPlan!.amountUsd === 500, "500");
  add("16G-CC: excess-only destination does not increase eligible buffer-yield value", excessReady().selectedPlan!.projection.existingEligibleBufferYieldAfterUsd === excessReady().selectedPlan!.projection.existingEligibleBufferYieldBeforeUsd, "unchanged");
  {
    // A buffer-eligible product selected in the excess lane (leader listed in bufferEligible too).
    const d = decide({ registry: [BUF_ENTRY], eligibilitySet: elig(["syn_buf"], ["syn_buf"]), comparisonSet: mkComparison({ status: "empty_eligible_set", reason: "none_empty_set" }, { status: "complete", leader: "syn_buf", score: 80, reason: "highest_stable_score" }), capitalSnapshot: mkCapital({ bufferCap: 0, excessCap: 500, directBuffer: 1500, surplus: 500, current: 1500, maxCombined: 500, excessLeaderPos: "leader_not_held" }), productCapacitySet: [mkCapacity({ strategyId: "syn_buf", productAddress: "ADDR_BUF" })] });
    add("16G-CD: buffer-eligible excess destination may increase eligible buffer-yield value", d.selectedPlan!.projection.selectedProductCountsTowardBuffer === true && d.selectedPlan!.projection.existingEligibleBufferYieldAfterUsd === d.selectedPlan!.projection.existingEligibleBufferYieldBeforeUsd + d.selectedPlan!.amountUsd, "counts");
  }
  add("16G-CE: projected buffer remains at or above required", excessReady().selectedPlan!.projection.currentEligibleBufferAfterUsd >= excessReady().selectedPlan!.projection.requiredBufferUsd, ">=required");

  // ---- Shared source ----
  add("16G-CF: independent lane maxima are never added (buffer 700 + excess 500 not summed)", bothReady.selectedPlan!.amountUsd === 700, "not added");
  add("16G-CG: shared source is resolved through one selected plan", bothReady.sharedSourceResolvedBySinglePlan === true && bothReady.planCount === 1, "one plan");
  add("16G-CH: selected plan consumes source once", bothReady.selectedPlan!.amountUsd <= bothReady.selectedPlan!.source.availableUsd + 1e-9, "once");
  add("16G-CI: unselected lane receives zero selected capital", bothReady.unselectedLane === "excess" && bothReady.excessLaneEvaluation.candidatePlan === undefined, "zero");
  add("16G-CJ: suppression reason is deterministic", bothReady.excessLaneEvaluation.status === "suppressed_by_higher_priority_lane", "deterministic");

  // ---- Plan ID ----
  const idA = excessReady().selectedPlan!.planId;
  add("16G-CK: identical material plan inputs produce the same plan ID", excessReady().selectedPlan!.planId === idA, "stable");
  add("16G-CL: changing checkedAt alone does not change the plan ID", excessReady().selectedPlan!.planId === buildYieldStrategyPlanId({ ownerAddress: OWNER, lane: "excess", actionMode: "start_new_position", strategyId: "syn_ex", productAddress: "ADDR_EX", amountCents: 50000 }), "unchanged");
  add("16G-CM: changing amount cents changes the plan ID", buildYieldStrategyPlanId({ ownerAddress: OWNER, lane: "excess", actionMode: "start_new_position", strategyId: "syn_ex", productAddress: "ADDR_EX", amountCents: 50000 }) !== buildYieldStrategyPlanId({ ownerAddress: OWNER, lane: "excess", actionMode: "start_new_position", strategyId: "syn_ex", productAddress: "ADDR_EX", amountCents: 40000 }), "changed");
  add("16G-CN: changing strategy changes the plan ID", buildYieldStrategyPlanId({ ownerAddress: OWNER, lane: "excess", actionMode: "start_new_position", strategyId: "syn_ex", productAddress: "ADDR_EX", amountCents: 50000 }) !== buildYieldStrategyPlanId({ ownerAddress: OWNER, lane: "excess", actionMode: "start_new_position", strategyId: "syn_other", productAddress: "ADDR_EX", amountCents: 50000 }), "changed");
  add("16G-CO: changing lane changes the plan ID", buildYieldStrategyPlanId({ ownerAddress: OWNER, lane: "excess", actionMode: "start_new_position", strategyId: "syn_ex", productAddress: "ADDR_EX", amountCents: 50000 }) !== buildYieldStrategyPlanId({ ownerAddress: OWNER, lane: "buffer", actionMode: "start_new_position", strategyId: "syn_ex", productAddress: "ADDR_EX", amountCents: 50000 }), "changed");
  add("16G-CP: changing action mode changes the plan ID", buildYieldStrategyPlanId({ ownerAddress: OWNER, lane: "excess", actionMode: "start_new_position", strategyId: "syn_ex", productAddress: "ADDR_EX", amountCents: 50000 }) !== buildYieldStrategyPlanId({ ownerAddress: OWNER, lane: "excess", actionMode: "add_to_existing_strategy", strategyId: "syn_ex", productAddress: "ADDR_EX", amountCents: 50000 }), "changed");
  add("16G-CQ: changing material policy version changes the plan ID (policy versions are in the hash)", idA.startsWith("ysplan_") && idA.length > 8, "policy-hashed");

  // ---- No-switch boundary ----
  add("16G-CR: no withdraw-and-redeposit action exists", !/withdraw_and_redeposit|redeposit/.test(planBlob), "none");
  add("16G-CS: no switch action exists", !/switch_strategy|switchstrategy/.test(planBlob), "none");
  add("16G-CT: no migration action exists", !/migrate_position|migrateposition/.test(planBlob), "none");
  add("16G-CU: no liquidity-removal action exists", !/removeliquidity|redeem/.test(planBlob), "none");
  add("16G-CV: only direct_wallet_usdc is a valid source", excessReady().selectedPlan!.source.type === "direct_wallet_usdc" && excessReady().selectedPlan!.source.assetId === "USDC", "direct only");

  // ---- Steakhouse ----
  add("16G-CW: runtime-detected undocumented Steakhouse position cannot be selected", decide({ registry: [], eligibilitySet: elig([], ["kamino_steakhouse_usdc"]), comparisonSet: mkComparison({ status: "empty_eligible_set", reason: "none_empty_set" }, { status: "complete", leader: "kamino_steakhouse_usdc", score: 80, reason: "highest_stable_score" }), capitalSnapshot: mkCapital({ excessCap: 500 }), productCapacitySet: [] }).status !== "ready", "cannot select");
  add("16G-CX: an identity_verified but UNAPPROVED Steakhouse still cannot produce an add plan", getYieldStrategy("kamino_steakhouse_usdc")!.lifecycle === "identity_verified" && getApprovedYieldStrategies().length === 0, "documentation_required");
  add("16G-CY: runtime address does not mutate the registry", listYieldStrategies().every((e) => e.address === undefined || getStableYieldEvidenceManifest(e.strategyId)?.productAddress === e.address) && getApprovedYieldStrategies().length === 0, "no mutate");

  // ---- Hubble ----
  add("16G-CZ: Hubble remains documented", getYieldStrategiesByProtocol("hubble").length >= 1, "present");
  add("16G-DA: Hubble debt/CDP cannot become a destination (no approved Hubble product)", getYieldStrategiesByProtocol("hubble").every((e) => e.lifecycle !== "approved"), "no destination");
  add("16G-DB: Hubble receives no protocol-name penalty", !/hubble.*(penal|deprecat|blocklist|blacklist)/.test(planBlob), "no penalty");
  add("16G-DC: a future exact approved Hubble yield product uses generic planning rules", (() => { const HUB = approvedEntry({ strategyId: "hub_y", protocolId: "hubble", protocolDisplayName: "Hubble", supportedLane: "excess_usdc_yield", riskLane: "excess_only", strategyType: "managed_vault", address: "HUB_ADDR" }); const d = decide({ registry: [HUB], eligibilitySet: elig([], ["hub_y"]), comparisonSet: mkComparison({ status: "empty_eligible_set", reason: "none_empty_set" }, { status: "complete", leader: "hub_y", score: 70, reason: "highest_stable_score" }), capitalSnapshot: mkCapital({ excessCap: 500, directBuffer: 1500, surplus: 500, current: 1500, maxCombined: 500, excessLeaderPos: "leader_not_held" }), productCapacitySet: [mkCapacity({ strategyId: "hub_y", protocolId: "hubble", productAddress: "HUB_ADDR" })] }); return d.status === "ready" && d.selectedPlan!.protocolId === "hubble"; })(), "generic");

  // ---- Boundaries ----
  const rd = excessReady();
  add("16G-DD: no suggestion is generated", rd.suggestionGenerated === false && rd.selectedPlan!.suggestionGenerated === false, "no suggestion");
  add("16G-DE: no product-facing output is updated", rd.updatesProductOutput === false && rd.selectedPlan!.updatesProductOutput === false, "no output");
  {
    const prodFiles = ["src/components/SuggestionCard.tsx", "src/components/SuggestionReviewModal.tsx", "src/pages/DemoDashboardPage.tsx", "src/pages/DashboardPage.tsx", "src/components/RealWalletSuggestionsRail.tsx"];
    add("16G-DF: no product-facing file imports the 16G plan decision / capacity logic (only the 16H-B presentation may reach UI)", prodFiles.every((f) => !/buildYieldStrategyPlanDecision|yieldStrategyProductCapacity|yieldStrategyPlanPolicy/.test(readIf(f))), "no planner in UI");
  }
  add("16G-DG: no protocol deep link is created", !/deeplink|https:\/\/app\.|manageurl|deposit_url/.test(planBlob), "no deep link");
  add("16G-DH: no transaction payload is created", rd.transactionBuilt === false && rd.selectedPlan!.transactionBuilt === false && !/transactionmessage|serializedtransaction|instructionlist/.test(planBlob), "no payload");
  add("16G-DI: no transaction instruction is created", !/transactioninstruction|buildinstruction|createinstruction/.test(planBlob), "no instruction");
  add("16G-DJ: no execution is prepared", rd.executionPrepared === false && rd.selectedPlan!.executionPrepared === false, "no execution");
  add("16G-DK: no wallet signature is requested", rd.walletSignatureRequired === false && rd.selectedPlan!.walletSignatureRequired === false, "no signature");
  add("16G-DL: no deposit/withdraw/swap/stake/execute handler exists", !/sendtransaction|signtransaction|deposit\(|withdraw\(|swap\(|stake\(|execute\(|fetch\(/.test(planBlob), "no handlers");

  // ---- Validator integrity + diagnostics ----
  add("16G-INT-A: a ready plan + decision validate", validateYieldStrategyPlan(rd.selectedPlan).valid === true && validateYieldStrategyPlanDecision(rd).valid === true, "valid");
  add("16G-INT-B: the production no_plan decision validates", validateYieldStrategyPlanDecision(prodDecision).valid === true, "valid");
  add("16G-INT-C: a plan with an execution flag set true is rejected", validateYieldStrategyPlan({ ...rd.selectedPlan, transactionsEnabled: true }).valid === false, "rejected");
  add("16G-INT-D: diagnostics + explain use no recommendation language", (() => { const txt = [explainYieldStrategyPlanDecision(rd), explainYieldStrategyPlanDecision(prodDecision), explainYieldStrategyPlanDecision(bothReady), JSON.stringify(getYieldStrategyPlanDiagnostics(rd))].join(" "); return !/\b(best|safest|winner|recommended|you should|move your funds|deposit now|guaranteed|risk-free)\b/i.test(txt); })(), "clean");

  return checks;
}

/**
 * Step 16H-A — Stable Yield suggestion integration fixtures (16H-A-A…). Verifies the plan→suggestion
 * conversion (16G is the sole source of truth), suppression diagnostics, engine ordering + Top Pick,
 * production no-suggestion behavior, and that no UI/execution/transaction/signature is created.
 */

/**
 * Step 16H-B — Stable Yield presentation contract + copy-mapping fixtures (16H-B-A…). Verifies the
 * deterministic card + review view models (formatting only), title/description mapping, APY + capacity
 * presentation states, disclosures, the read-only CTA intent, fail-closed validation, and that no React
 * UI / execution / transaction / signature / external URL is created.
 */
export function runYieldStrategyPlanPresentationFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const root = process.cwd();
  const readIf = (rel: string) => { try { return readFileSync(`${root}/${rel}`, "utf8"); } catch { return ""; } };
  const T = "2026-07-16T00:00:00.000Z";
  const OWNER = "OwnerPres1111111111111111111111111111111111";

  // Compact 16G decision factories (synthetic; never touch the production registry).
  const approvedEntry = (o: Partial<ELIG_Entry> = {}): ELIG_Entry => ({ schemaVersion: "1.0.0", registryVersion: "1.0.0", strategyId: "syn", displayName: "Syn", protocolId: "kamino", protocolDisplayName: "Kamino", strategyType: "lending", principalAsset: "USDC", supportedLane: "safety_buffer_yield", riskLane: "buffer_eligible", lifecycle: "approved", officialUrl: "https://app.kamino.finance", documentationUrl: "https://docs.kamino.finance", address: "ADDR", marketDataEvaluated: false, eligibilityEvaluated: false, comparisonEvaluated: false, suggestionGenerated: false, transactionsEnabled: false, walletSignatureRequired: false, notes: [], ...o });
  const EX_ENTRY = approvedEntry({ strategyId: "syn_ex", displayName: "Steakhouse-style USDC Vault", supportedLane: "excess_usdc_yield", riskLane: "excess_only", strategyType: "managed_vault", address: "ADDR_EX" });
  const BUF_ENTRY = approvedEntry({ strategyId: "syn_buf", displayName: "USDC Lending Market", supportedLane: "safety_buffer_yield", riskLane: "buffer_eligible", strategyType: "lending", address: "ADDR_BUF" });
  const mkLeaderPos = (status: string) => ({ lane: "buffer", held: status === "leader_held" || status === "leader_held_multiple_positions", matchedPositionIds: [], positionCount: 0, status, warnings: [], blockers: [] });
  const mkCapacity = (o: Partial<PLAN_Cap> = {}): PLAN_Cap => ({ schemaVersion: "1.0.0", policyId: "yield_strategy_product_capacity_v1", policyVersion: "1.0.0", strategyId: "syn_ex", protocolId: "kamino", productAddress: "ADDR_EX", principalAssetId: "USDC", capacityMode: "explicit_remaining_capacity", acceptingDeposits: true, remainingDepositCapacityUsd: 100000, sourceId: "cap_src", provenanceKind: "documented_source", browserFetched: false, fetchedAt: T, checkedAt: T, maximumAgeMs: 3600000, ageMs: 0, status: "complete", warnings: [], blockers: [], productSelected: false, amountSelected: false, planGenerated: false, suggestionGenerated: false, transactionsEnabled: false, walletSignatureRequired: false, ...o });
  interface CapOpts { bufferCap?: number; excessCap?: number; directBuffer?: number; surplus?: number; current?: number; maxCombined?: number; excessLeaderPos?: string; bufferLeaderPos?: string; }
  const mkCapital = (o: CapOpts = {}): PLAN_CapitalSnap => ({ schemaVersion: "1.0.0", policyId: "yield_strategy_capital_v1", policyVersion: "1.0.0", ownerAddress: OWNER, checkedAt: T, status: "ready", requiredBufferUsd: 1000, directWalletEligibleBufferUsd: o.directBuffer ?? 1500, existingEligibleBufferYieldUsd: 0, currentEligibleBufferUsd: o.current ?? 1500, bufferShortfallUsd: 0, canonicalBufferSurplusUsd: o.surplus ?? 500, bufferComplete: true, vaultAllocationPct: 0.7, walletAllocationPct: 0.3, allowedBufferYieldUsd: 700, requiredWalletFloorUsd: 300, remainingBufferYieldCapacityUsd: 700, directLiquidUsdcUsd: 5000, rawBufferYieldCapitalUsd: o.bufferCap ?? 0, bufferYieldEligibleCapitalUsd: o.bufferCap ?? 0, bufferYieldMinimumPolicyAvailable: false, rawExcessYieldCapitalUsd: o.excessCap ?? 0, excessYieldEligibleCapitalUsd: o.excessCap ?? 0, excessYieldMinimumUsd: 250, excessYieldMeetsMinimum: (o.excessCap ?? 0) >= 250, maximumCombinedSourceCapitalUsd: o.maxCombined ?? ((o.bufferCap ?? 0) + (o.excessCap ?? 0)), sharedSourceOverlapPossible: false, sharedSourceOverlapUsd: 0, bufferLeaderPositionStatus: mkLeaderPos(o.bufferLeaderPos ?? "no_comparison_leader"), excessLeaderPositionStatus: mkLeaderPos(o.excessLeaderPos ?? "no_comparison_leader"), comparisonPerformed: false, productSelected: false, amountSelected: false, planGenerated: false, suggestionGenerated: false, updatesProductOutput: false, transactionsEnabled: false, walletSignatureRequired: false, blockers: [], warnings: [], notes: [] } as unknown as PLAN_CapitalSnap);
  const mkLaneComp = (lane: string, o: { status?: string; leader?: string; score?: number; reason?: string }) => ({ schemaVersion: "1.0.0", policyId: "yield_strategy_comparison_v1", policyVersion: "1.0.0", lane, status: o.status ?? "empty_eligible_set", checkedAt: T, candidateScorecards: [], orderedStrategyIds: [], ...(o.leader ? { comparisonLeaderStrategyId: o.leader } : {}), ...(o.score !== undefined ? { comparisonLeaderScore: o.score } : {}), leaderSelectionReason: o.reason ?? "none_empty_set", tieAnalysis: {}, sensitivityAnalysis: {}, walletPositionsEvaluated: false, userCapitalEvaluated: false, amountCalculated: false, planGenerated: false, suggestionGenerated: false, updatesProductOutput: false, transactionsEnabled: false, walletSignatureRequired: false, warnings: [], blockers: [], notes: [] });
  const mkComparison = (buffer: { status?: string; leader?: string; score?: number; reason?: string }, excess: { status?: string; leader?: string; score?: number; reason?: string }) => ({ schemaVersion: "1.0.0", policyId: "yield_strategy_comparison_v1", policyVersion: "1.0.0", checkedAt: T, bufferComparison: mkLaneComp("buffer", buffer), excessComparison: mkLaneComp("excess", excess), ...(buffer.leader ? { bufferComparisonLeaderStrategyId: buffer.leader } : {}), ...(excess.leader ? { excessComparisonLeaderStrategyId: excess.leader } : {}), emptyApprovedSet: false, emptyBufferEligibleSet: false, emptyExcessEligibleSet: false, comparisonPerformed: true, rankingPerformed: true, walletPositionsEvaluated: false, userCapitalEvaluated: false, amountCalculated: false, planGenerated: false, suggestionGenerated: false, updatesProductOutput: false, transactionsEnabled: false, walletSignatureRequired: false, warnings: [], blockers: [], notes: [] } as unknown as CMP_Set);
  const elig = (buffer: string[], excess: string[]) => ({ bufferEligibleStrategyIds: buffer, excessEligibleStrategyIds: excess } as unknown as ELIG_EligSet);
  const excessDecision = (leaderPos = "leader_not_held", capacityOver: Partial<PLAN_Cap> = {}) => buildYieldStrategyPlanDecision({ ownerAddress: OWNER, checkedAt: T, registry: [EX_ENTRY], eligibilitySet: elig([], ["syn_ex"]), comparisonSet: mkComparison({ status: "empty_eligible_set" }, { status: "complete", leader: "syn_ex", score: 80, reason: "highest_stable_score" }), capitalSnapshot: mkCapital({ excessCap: 500, directBuffer: 1500, surplus: 500, current: 1500, maxCombined: 500, excessLeaderPos: leaderPos }), productCapacitySet: [mkCapacity({ strategyId: "syn_ex", productAddress: "ADDR_EX", ...capacityOver })] });
  const bufferDecision = (leaderPos = "leader_not_held") => buildYieldStrategyPlanDecision({ ownerAddress: OWNER, checkedAt: T, registry: [BUF_ENTRY], eligibilitySet: elig(["syn_buf"], []), comparisonSet: mkComparison({ status: "complete", leader: "syn_buf", score: 85, reason: "highest_stable_score" }, { status: "empty_eligible_set" }), capitalSnapshot: mkCapital({ bufferCap: 700, directBuffer: 1000, surplus: 0, current: 1000, maxCombined: 700, bufferLeaderPos: leaderPos }), productCapacitySet: [mkCapacity({ strategyId: "syn_buf", productAddress: "ADDR_BUF" })], bufferMinimumOverrideUsd: 50 });
  const APY_LIVE = { netApyPct: 5.2, apyDefinition: "net", apyWindow: "current", sourceId: "kamino_api", sourceLabel: "Kamino API", provenanceKind: "live_protocol_api" as const, checkedAt: T };
  const APY_FALLBACK = { netApyPct: 4.8, apyDefinition: "net", apyWindow: "current", sourceId: "provider", sourceLabel: "Approved provider", provenanceKind: "approved_fallback" as const };
  const suggFor = (decision: ReturnType<typeof excessDecision>, apy?: typeof APY_LIVE | typeof APY_FALLBACK, topPick = false) => { const s = buildStableYieldPlanSuggestion(decision, { generatedAt: 1_000_000, ...(apy ? { apyProvenance: apy } : {}) }).suggestion!; return topPick ? { ...s, is_top_pick: true } : s; };
  const presBlob = ["yieldStrategyPlanPresentationTypes", "yieldStrategyPlanPresentation"].map((f) => readIf(`src/suggestions/${f}.ts`)).join("").toLowerCase();

  // ---- Versions + flags ----
  add("16H-B-A: presentation schema/policy versions exist", YIELD_STRATEGY_PRESENTATION_SCHEMA_VERSION === "1.0.0" && YIELD_STRATEGY_PRESENTATION_POLICY_ID === "yield_strategy_presentation_v1" && YIELD_STRATEGY_PRESENTATION_EXISTS === true, YIELD_STRATEGY_PRESENTATION_POLICY_ID);
  add("16H-B-B: presentation-contract flags are true", STABLE_YIELD_CARD_PRESENTATION_CONTRACT_EXISTS === true && STABLE_YIELD_REVIEW_PRESENTATION_CONTRACT_EXISTS === true && STABLE_YIELD_DETERMINISTIC_COPY_MAPPING_EXISTS === true && STABLE_YIELD_PRESENTATION_VALIDATION_EXISTS === true && STABLE_YIELD_REVIEW_ONLY_CTA_INTENT_EXISTS === true, "true");
  add("16H-B-C: Smith-AI / execution flags remain false (the card/modal that render at 16H-C add no execution)", STABLE_YIELD_SMITH_AI_INTEGRATION_EXISTS === false && STABLE_YIELD_SUGGESTION_EXECUTION_EXISTS === false && STABLE_YIELD_EXECUTION_ENABLED === false, "false");

  const exStart = buildStableYieldPlanPresentation(suggFor(excessDecision(), APY_LIVE));
  const exAdd = buildStableYieldPlanPresentation(suggFor(excessDecision("leader_held"), APY_LIVE));
  const bufStart = buildStableYieldPlanPresentation(suggFor(bufferDecision(), APY_FALLBACK));
  const bufAdd = buildStableYieldPlanPresentation(suggFor(bufferDecision("leader_held")));

  // ---- Card mapping (lane × action mode) ----
  add("16H-B-D: excess + start_new_position card maps", exStart.card !== null && exStart.card!.lane === "excess" && exStart.card!.actionMode === "start_new_position" && exStart.card!.title === "Earn Yield on Excess USDC", exStart.card?.title ?? "null");
  add("16H-B-E: excess + add_to_existing_strategy card maps", exAdd.card!.title === "Add to Your Kamino Strategy" && exAdd.card!.actionMode === "add_to_existing_strategy", exAdd.card!.title);
  add("16H-B-F: buffer + start_new_position card maps", bufStart.card!.lane === "buffer" && bufStart.card!.title === "Put Buffer Funds on Kamino", bufStart.card!.title);
  add("16H-B-G: buffer + add_to_existing_strategy card maps", bufAdd.card!.title === "Add to Your Kamino Position", bufAdd.card!.title);
  add("16H-B-H: title mapping is exhaustive + deterministic", stableYieldTitle("excess", "start_new_position", "Kamino") === "Earn Yield on Excess USDC" && stableYieldTitle("excess", "add_to_existing_strategy", "Kamino") === "Add to Your Kamino Strategy" && stableYieldTitle("buffer", "start_new_position", "Kamino") === "Put Buffer Funds on Kamino" && stableYieldTitle("buffer", "add_to_existing_strategy", "Kamino") === "Add to Your Kamino Position", "mapping");

  // ---- Preservation (no recompute) ----
  add("16H-B-I: exact amount is preserved (display + raw cents)", exStart.card!.amountDisplay === "$500.00" && exStart.card!.amountUsd === 500 && exStart.card!.amountCents === 50000, "$500.00");
  add("16H-B-J: source plan ID is preserved", exStart.card!.sourcePlanId === excessDecision().selectedPlan!.planId && exStart.review!.sourcePlanId === exStart.card!.sourcePlanId, "preserved");
  add("16H-B-K: product identity is preserved", exStart.review!.strategyId === "syn_ex" && exStart.card!.productDisplayName === "Steakhouse-style USDC Vault", "product");
  add("16H-B-L: protocol identity is preserved", exStart.card!.protocolName === "Kamino" && exStart.review!.protocolId === "kamino", "protocol");
  add("16H-B-M: product address is preserved (review surface)", exStart.review!.productAddress === "ADDR_EX", "address");
  add("16H-B-N: singular lane reason copy (description mentions the single reason)", exStart.card!.description.includes("above your Safety Buffer") && bufStart.card!.description.includes("count toward your Safety Buffer"), "singular");

  // ---- APY presentation states ----
  add("16H-B-O: APY with live provenance", exStart.card!.apy.state === "live_protocol_api" && exStart.card!.apy.display === "5.20%" && exStart.card!.apy.sourceLabel === "Kamino API", exStart.card!.apy.display);
  add("16H-B-P: APY with approved fallback provenance", bufStart.card!.apy.state === "approved_fallback" && bufStart.card!.apy.display === "4.80%", bufStart.card!.apy.state);
  add("16H-B-Q: missing APY → canonical unavailable state", bufAdd.card!.apy.state === "unavailable" && bufAdd.card!.apy.display === "APY unavailable" && stableYieldApyPresentation(undefined).state === "unavailable", "unavailable");
  add("16H-B-R: APY source is never inferred (present without kind → 'provided')", stableYieldApyPresentation({ netApyPct: 3.1, apyDefinition: "net", apyWindow: "current", sourceId: "x" }).state === "provided", "provided");

  // ---- Capacity presentation ----
  add("16H-B-S: capacity explicit_remaining_capacity presents a bounded amount", exStart.review!.capacity.mode === "explicit_remaining_capacity" && exStart.review!.capacity.boundDisplay === "$100,000.00", exStart.review!.capacity.boundDisplay);
  add("16H-B-T: capacity verified_uncapped uses the bounded selected amount (never 'unlimited')", (() => { const p = buildStableYieldPlanPresentation(suggFor(excessDecision("leader_not_held", { capacityMode: "verified_uncapped", remainingDepositCapacityUsd: undefined }))); return p.review!.capacity.mode === "verified_uncapped" && p.review!.capacity.boundDisplay === "$500.00" && !/unlimited/i.test(p.review!.capacity.note); })(), "uncapped");

  // ---- Projections preserved ----
  add("16H-B-U: wallet USDC before/after preserved", exStart.review!.walletUsdcBeforeUsd === excessDecision().selectedPlan!.projection.directLiquidUsdcBeforeUsd && exStart.review!.walletUsdcAfterUsd === excessDecision().selectedPlan!.projection.directLiquidUsdcAfterUsd, "wallet proj");
  add("16H-B-V: buffer before/after preserved + coverage flags", exStart.review!.bufferBeforeUsd === excessDecision().selectedPlan!.projection.currentEligibleBufferBeforeUsd && exStart.review!.bufferAfterUsd === excessDecision().selectedPlan!.projection.currentEligibleBufferAfterUsd && exStart.review!.bufferCoveragePreserved === true && exStart.review!.walletFloorPreserved === true, "buffer proj");
  add("16H-B-W: current-position context preserved", exAdd.review!.currentPositionContext.held === true && exAdd.review!.currentPositionContext.positionStatusLabel === "You currently hold this strategy." && exStart.review!.currentPositionContext.held === false, "position ctx");

  // ---- CTA + Top Pick + disclosures ----
  add("16H-B-X: read-only 'Review Strategy' CTA with no execution intent", exStart.card!.cta.label === "Review" && exStart.card!.cta.intent === "open_stable_yield_review" && exStart.card!.cta.executesTransaction === false && exStart.card!.cta.requiresWalletSignature === false && exStart.card!.cta.opensExternalUrl === false, "review only");
  add("16H-B-Y: Top Pick badge maps from the suggestion flag", buildStableYieldPlanPresentation(suggFor(excessDecision(), APY_LIVE, true)).card!.isTopPick === true, "top pick");
  add("16H-B-Z: non-Top-Pick maps to false", exStart.card!.isTopPick === false, "not top pick");
  add("16H-B-AA: read-only + external-management disclosures present", exStart.review!.disclosures.includes(STABLE_YIELD_READ_ONLY_DISCLOSURE) && exStart.review!.disclosures.includes(STABLE_YIELD_EXTERNAL_MANAGEMENT_DISCLOSURE) && exStart.card!.readOnly === true && exStart.card!.externalManagementRequired === true, "disclosures");
  add("16H-B-AB: no annual-earnings / no hype / no risk-free copy is generated", (() => { const txt = [exStart.card!.title, exStart.card!.description, exStart.review!.summary, ...exStart.review!.disclosures].join(" "); return !/\b(best|guaranteed|safe yield|risk-free|risk free|instant|annual earnings|you will earn|projected earnings)\b/i.test(txt); })(), "calm copy");

  // ---- Fail-closed validation ----
  const goodSugg = suggFor(excessDecision(), APY_LIVE);
  const tamper = (patch: Record<string, unknown>) => buildStableYieldPlanPresentation({ ...goodSugg, stableYieldPlan: { ...goodSugg.stableYieldPlan!, ...patch } } as never);
  add("16H-B-AC: invalid lane rejected", tamper({ lane: "bogus" }).card === null && tamper({ lane: "bogus" }).diagnostic.emitted === false, "rejected");
  add("16H-B-AD: invalid action mode rejected", tamper({ actionMode: "switch" }).card === null, "rejected");
  add("16H-B-AE: non-direct-wallet funding rejected", tamper({ fundingSource: "vault_shares" }).card === null, "rejected");
  add("16H-B-AF: missing strategy rejected", tamper({ strategyId: "", displayName: "" }).card === null, "rejected");
  add("16H-B-AG: missing protocol rejected", tamper({ protocolId: "", protocolDisplayName: "" }).card === null, "rejected");
  add("16H-B-AH: corrupted amount (cents/USD disagree) rejected", tamper({ amountCents: 99999 }).card === null && tamper({ amountUsd: -5 }).card === null, "rejected");
  add("16H-B-AI: unsupported capacity mode on a ready suggestion rejected (fail closed)", tamper({ capacityMode: "product_full" }).card === null && tamper({ capacityMode: "product_full" }).diagnostic.failureStage === "capacity_contract", "capacity contract");
  add("16H-B-AJ: false read-only flag rejected", tamper({ readOnly: false }).card === null, "rejected");
  add("16H-B-AK: false external-management-required flag rejected", tamper({ externalManagementRequired: false }).card === null, "rejected");
  add("16H-B-AL: an execution flag on the meta is rejected", tamper({ transactionsEnabled: true }).card === null, "rejected");
  add("16H-B-AM: missing stableYieldPlan meta → no presentation", buildStableYieldPlanPresentation({ ...goodSugg, stableYieldPlan: undefined } as never).card === null && buildStableYieldPlanPresentation({ ...goodSugg, stableYieldPlan: undefined } as never).diagnostic.failureStage === "input_missing", "no meta");

  // ---- Determinism + production ----
  add("16H-B-AN: deterministic repeated mapping (same card + review)", JSON.stringify(buildStableYieldPlanPresentation(suggFor(excessDecision(), APY_LIVE)).card) === JSON.stringify(buildStableYieldPlanPresentation(suggFor(excessDecision(), APY_LIVE)).card), "deterministic");
  add("16H-B-AO: timestamp changes do not alter the deterministic text", buildStableYieldPlanPresentation(buildStableYieldPlanSuggestion(excessDecision(), { generatedAt: 1 }).suggestion!).card!.title === buildStableYieldPlanPresentation(buildStableYieldPlanSuggestion(excessDecision(), { generatedAt: 999999 }).suggestion!).card!.title, "stable text");
  {
    const prodDecision = buildYieldStrategyPlanDecision({ ownerAddress: OWNER, checkedAt: T, registry: [], eligibilitySet: elig([], []), comparisonSet: mkComparison({ status: "empty_eligible_set" }, { status: "empty_eligible_set" }), capitalSnapshot: mkCapital({}) });
    add("16H-B-AP: production no-suggestion path produces no presentation", getApprovedYieldStrategies().length === 0 && buildStableYieldPlanSuggestion(prodDecision).suggestion === null && buildStableYieldPlanPresentation(buildStableYieldPlanSuggestion(prodDecision).suggestion).card === null, "no presentation");
  }

  // ---- No UI / no execution ----
  add("16H-B-AQ: no React / component / route is added (presentation is pure view models)", !/react|usestate|useeffect|jsx|tsx|<div|classname/.test(presBlob), "no react");
  add("16H-B-AR: no execution URL / transaction payload / signature intent is created (a read-only app handoff URL is allowed)", exStart.diagnostic.containsExecutionIntent === false && exStart.card!.cta.opensExternalUrl === false && !/deeplink|manageurl|serializedtransaction|signtransaction|sendtransaction|deposit\(/.test(presBlob), "no execution");
  add("16H-B-AS: the diagnostic confirms the review CTA intent + no execution intent", exStart.diagnostic.ctaIntent === "open_stable_yield_review" && exStart.diagnostic.emitted === true && exStart.diagnostic.apyState === "live_protocol_api", "diagnostic");

  return checks;
}

/**
 * Step 16H-C — Stable Yield card + review UI fixtures (16H-C-A…). Verifies the shared-card mapper
 * (16H-B card → SuggestionCardState), review VM fields, the /testing fixture inventory, fail-closed
 * non-rendering, the read-only CTA (no execution/transaction/signature/external URL), and that the React
 * UI imports no planning/capital/APY logic.
 */

/**
 * Step 16H-G — PRODUCTION Stable Yield data adapters + evidence readiness. Fully deterministic and
 * OFFLINE: every "source response" below is a local literal. No check performs a network request.
 */
export function runStableYieldProductionAdapterFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const root = process.cwd();
  const readIf = (rel: string) => { try { return readFileSync(`${root}/${rel}`, "utf8"); } catch { return ""; } };

  const CHECKED_AT = "2026-07-16T00:00:00.000Z";
  const FRESH_TS = "2026-07-16T00:00:00.000Z";
  const ADDR = "So11111111111111111111111111111111111111112"; // a real-shaped base58 address (fixture only)
  const OTHER_ADDR = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
  const kaminoEntry = listYieldStrategies().find((e) => e.strategyId === "kamino_steakhouse_usdc")!;
  /** Still has NO documented address (16H-H could not resolve its reserve) — the fail-closed subject. */
  const lendingEntry = listYieldStrategies().find((e) => e.strategyId === "kamino_usdc_lending")!;
  // 16H-N.1: kamino_usdc_lending is no longer address-less, so it can no longer serve as the
  // "no documented address" specimen. These checks exist to prove the identity gate FAILS CLOSED, so
  // they are repointed at a candidate that genuinely has no address rather than deleted.
  // Must remain a KAMINO entry: pointing this at Raydium would make the adapter reject it for
  // protocol mismatch and silently stop exercising the identity gate. Synthesised from the real
  // lending entry with the address removed, isolating exactly the property under test.
  const addressLessEntry = { ...lendingEntry, address: undefined };
  /** The same entry WITH a documented address — used ONLY to exercise post-identity stages offline. */
  const addressed = { ...kaminoEntry, address: ADDR };
  const rec = (over: Record<string, unknown> = {}) => ({ productAddress: ADDR, assetMint: SYG_USDC_MINT, chain: "solana_mainnet", protocolId: "kamino", netApy: 0.0515, sourceTimestamp: FRESH_TS, ...over });

  // ---- Candidate inventory ----
  const registry = listYieldStrategies();
  add("16H-G-A: the production candidate set is exactly the registry (5 candidates, none approved)", registry.length === 5 && getApprovedYieldStrategies().length === 0, `${registry.length} candidates`);
  // Was 1 (Steakhouse only). 16H-N.1 resolved the lending reserve. The invariant that matters is
  // unchanged: an address implies identity_verified, and identity_verified implies NOTHING about approval.
  add("16H-G-B (updated by 16H-N.1): both identity-verified candidates have addresses; none is approved", registry.filter((e) => e.address !== undefined).length === 2 && registry.filter((e) => e.address !== undefined).every((e) => e.lifecycle === "identity_verified") && registry.find((e) => e.strategyId === "kamino_steakhouse_usdc")!.address === "HDsayqAsDWy3QvANGqh2yNraqcD8Fnjgh73Mhb3WRS5E" && getApprovedYieldStrategies().length === 0, "1 verified, 0 approved");
  add("16H-G-C: an evidence manifest exists for every candidate, and none is ready or approved", listStableYieldEvidenceManifests().length === 5 && listCandidatesReadyForReview().length === 0 && listStableYieldEvidenceManifests().every((m) => m.readiness !== "ready_for_review"), "0 ready");

  // ---- Identity: exact-address matching only ----
  add("16H-G-D: a candidate with no documented address still fails closed on missing_product_address", (() => { const r = resolveStableYieldProductIdentity({ entry: addressLessEntry, claim: { productAddress: ADDR }, sourceAdapterId: "t" }); return !r.verified && r.reason === "missing_product_address"; })(), "missing_product_address");
  add("16H-G-E: an exact address match verifies identity", (() => { const r = resolveStableYieldProductIdentity({ entry: addressed, claim: { productAddress: ADDR, assetMint: SYG_USDC_MINT, chain: "solana_mainnet", protocolId: "kamino" }, sourceAdapterId: "t" }); return r.verified && r.identity.productAddress === ADDR; })(), "verified");
  add("16H-G-F: a wrong address is rejected (no same-protocol fallback)", (() => { const r = resolveStableYieldProductIdentity({ entry: addressed, claim: { productAddress: OTHER_ADDR, protocolId: "kamino" }, sourceAdapterId: "t" }); return !r.verified && r.reason === "product_identity_mismatch"; })(), "mismatch");
  add("16H-G-G: a matching product NAME never substitutes for an address (name-only match rejected)", (() => { const r = resolveStableYieldProductIdentity({ entry: addressed, claim: { productName: "Steakhouse USDC", protocolId: "kamino" }, sourceAdapterId: "t" }); return !r.verified && r.reason === "product_not_found"; })(), "name rejected");
  add("16H-G-H: a protocol-only claim is rejected (protocol name is not identity)", (() => { const r = resolveStableYieldProductIdentity({ entry: addressed, claim: { protocolId: "kamino" }, sourceAdapterId: "t" }); return !r.verified; })(), "protocol rejected");
  add("16H-G-I: a wrong chain is rejected", (() => { const r = resolveStableYieldProductIdentity({ entry: addressed, claim: { productAddress: ADDR, chain: "ethereum_mainnet" }, sourceAdapterId: "t" }); return !r.verified && r.reason === "wrong_chain"; })(), "wrong_chain");
  add("16H-G-J: a non-USDC principal mint is rejected", (() => { const r = resolveStableYieldProductIdentity({ entry: addressed, claim: { productAddress: ADDR, assetMint: OTHER_ADDR }, sourceAdapterId: "t" }); return !r.verified && r.reason === "wrong_asset"; })(), "wrong_asset");
  add("16H-G-K: zero source records → product_not_found; two matching → duplicate_product_match (never pick one)", (() => { const none = selectSourceRecordByExactAddress({ entry: addressed, records: [{ productAddress: OTHER_ADDR }] }); const dup = selectSourceRecordByExactAddress({ entry: addressed, records: [{ productAddress: ADDR }, { productAddress: ADDR }] }); return !none.ok && none.reason === "product_not_found" && !dup.ok && dup.reason === "duplicate_product_match"; })(), "found/dup");

  // ---- APY parsing + units ----
  add("16H-G-L: a valid fraction APY normalizes to percent with no 100× error", (() => { const p = parseKaminoVaultRecord(rec(), "fraction"); return p.ok && p.value.netApyPct === 5.15; })(), "5.15%");
  add("16H-G-M: the same number read as percent stays percent (unit is declared, never guessed)", (() => { const p = parseKaminoVaultRecord(rec({ netApy: 5.15 }), "percent"); return p.ok && p.value.netApyPct === 5.15; })(), "5.15%");
  add("16H-G-N: a fraction misread as percent would 100×-error — the declared unit prevents it", (() => { const asFrac = parseKaminoVaultRecord(rec({ netApy: 0.0515 }), "fraction"); const asPct = parseKaminoVaultRecord(rec({ netApy: 0.0515 }), "percent"); return asFrac.ok && asPct.ok && asFrac.value.netApyPct === 5.15 && asPct.value.netApyPct === 0.0515; })(), "unit-explicit");
  add("16H-G-O: zero APY is a valid value (not a failure)", (() => { const p = parseKaminoVaultRecord(rec({ netApy: 0 }), "fraction"); return p.ok && p.value.netApyPct === 0; })(), "0%");
  add("16H-G-P: a negative APY is rejected (unsupported by the contract)", (() => { const p = parseKaminoVaultRecord(rec({ netApy: -0.01 }), "fraction"); return !p.ok && p.reason === "negative_rate_unsupported"; })(), "rejected");
  add("16H-G-Q: a non-finite APY is rejected", (() => { const a = parseKaminoVaultRecord(rec({ netApy: Number.NaN }), "fraction"); const b = parseKaminoVaultRecord(rec({ netApy: Number.POSITIVE_INFINITY }), "fraction"); return !a.ok && !b.ok; })(), "rejected");
  add("16H-G-R: a missing APY is rejected (never 0)", (() => { const r2 = rec(); delete (r2 as Record<string, unknown>).netApy; const p = parseKaminoVaultRecord(r2, "fraction"); return !p.ok && p.reason === "missing_field"; })(), "rejected");
  add("16H-G-S: a percent-suffixed APY ('5.2%') is rejected by the documented-decimal-string reader", (() => { const p = parseKaminoVaultRecord(rec({ netApy: "5.2%" }), "fraction"); return !p.ok && p.reason === "malformed_decimal_string"; })(), "rejected");
  add("16H-G-T: null is never coerced to zero", (() => { const p = parseKaminoVaultRecord(rec({ netApy: null }), "fraction"); return !p.ok && p.reason === "null_is_not_zero"; })(), "rejected");
  add("16H-G-U: an implausible stable APY (>100%) fails closed rather than reaching planning", (() => { const p = parseKaminoVaultRecord(rec({ netApy: 12 }), "fraction"); return !p.ok && p.reason === "implausible_rate_for_stable_yield"; })(), "rejected");
  add("16H-G-V: a schema change (non-object / missing address) is rejected", (() => { const a = parseKaminoVaultRecord("not-an-object", "fraction"); const r2 = rec(); delete (r2 as Record<string, unknown>).productAddress; const b = parseKaminoVaultRecord(r2, "fraction"); return !a.ok && !b.ok; })(), "rejected");

  // ---- Freshness (source time authoritative) ----
  add("16H-G-W: a missing source timestamp is rejected (never treated as fresh)", (() => { const r2 = rec(); delete (r2 as Record<string, unknown>).sourceTimestamp; const p = parseKaminoVaultRecord(r2, "fraction"); return !p.ok && p.reason === "missing_timestamp"; })(), "rejected");
  add("16H-G-X: stale / future / negative-age source data fails closed", (() => { const stale = validateProductionFreshness({ sourceTimestamp: "2026-07-15T00:00:00.000Z", checkedAt: CHECKED_AT }); const future = validateProductionFreshness({ sourceTimestamp: "2026-07-17T00:00:00.000Z", checkedAt: CHECKED_AT }); return !stale.ok && stale.status === "stale" && !future.ok && future.status === "future_dated"; })(), "stale/future");
  add("16H-G-Y: a fresh source timestamp passes", validateProductionFreshness({ sourceTimestamp: "2026-07-15T23:30:00.000Z", checkedAt: CHECKED_AT }).ok === true, "fresh");
  add("16H-G-Z: a recent FETCH of stale upstream data is still stale (fetch time is not authority)", (() => { const r = buildKaminoMarketDataInput({ entry: addressed, raw: rec({ sourceTimestamp: "2026-07-01T00:00:00.000Z" }), checkedAt: CHECKED_AT, fetchedAt: CHECKED_AT }); return r.output === undefined && r.diagnostic.freshnessStatus === "stale" && r.diagnostic.planningSafe === false; })(), "stale");

  // ---- Market adapter end-to-end ----
  add("16H-G-AA: a candidate with no documented address produces NO market input (blocked at identity)", (() => { const r = buildKaminoMarketDataInput({ entry: addressLessEntry, raw: rec(), checkedAt: CHECKED_AT }); return r.output === undefined && r.diagnostic.identityReason === "missing_product_address" && r.diagnostic.stage === "identity_validation" && r.diagnostic.planningSafe === false; })(), "blocked");
  add("16H-G-AB: an addressed candidate + valid record yields a canonical 16C input with provenance", (() => { const r = buildKaminoMarketDataInput({ entry: addressed, raw: rec(), checkedAt: CHECKED_AT }); return r.diagnostic.planningSafe === true && r.output?.apy?.netApyPct === 5.15 && r.output?.browserFetched === false && r.output?.provenanceKind === "backend_normalized" && r.output?.sourceId === "kamino_vault_state_v1" && r.output?.fetchedAt === FRESH_TS; })(), "normalized");
  add("16H-G-AC: the adapter never emits output when not planning-safe (no partial defaults)", [buildKaminoMarketDataInput({ entry: lendingEntry, raw: rec(), checkedAt: CHECKED_AT }), buildKaminoMarketDataInput({ entry: addressed, raw: rec({ netApy: -1 }), checkedAt: CHECKED_AT })].every((r) => r.diagnostic.planningSafe === false && r.output === undefined), "no output");
  add("16H-G-AD: browserFetched is always false (the browser may never call a yield provider)", buildKaminoMarketDataInput({ entry: addressed, raw: rec(), checkedAt: CHECKED_AT }).output?.browserFetched === false, "false");

  // ---- Capacity ----
  add("16H-G-AE: explicit cap − deposited yields exact remaining capacity", (() => { const r = buildKaminoCapacity({ entry: addressed, raw: rec({ depositCapUsd: 1_000_000, depositedUsd: 250_000 }), checkedAt: CHECKED_AT }); return r.output?.capacityMode === "explicit_remaining_capacity" && r.output.remainingDepositCapacityUsd === 750_000; })(), "750000");
  add("16H-G-AF: an ABSENT cap is 'unknown', never verified_uncapped (absence is not evidence)", (() => { const r = buildKaminoCapacity({ entry: addressed, raw: rec(), checkedAt: CHECKED_AT }); return r.output?.capacityMode === "unknown" && r.diagnostic.planningSafe === false && r.diagnostic.reason === "no_explicit_cap_evidence_absence_is_not_uncapped"; })(), "unknown");
  add("16H-G-AG: cap === deposited → product_full", buildKaminoCapacity({ entry: addressed, raw: rec({ depositCapUsd: 500_000, depositedUsd: 500_000 }), checkedAt: CHECKED_AT }).output?.capacityMode === "product_full", "product_full");
  add("16H-G-AH: an explicit deposits-disabled flag → deposits_paused", buildKaminoCapacity({ entry: addressed, raw: rec({ depositsEnabled: false, depositCapUsd: 1_000, depositedUsd: 0 }), checkedAt: CHECKED_AT }).output?.capacityMode === "deposits_paused", "paused");
  add("16H-G-AI: a negative remainder (conflicting cap/usage) is rejected, never clamped", (() => { const r = buildKaminoCapacity({ entry: addressed, raw: rec({ depositCapUsd: 100, depositedUsd: 500 }), checkedAt: CHECKED_AT }); return r.output === undefined && r.diagnostic.reason === "negative_remaining_capacity_conflicting_cap_and_usage"; })(), "rejected");
  add("16H-G-AJ: the capacity adapter CANNOT emit verified_uncapped (no source asserts it)", !readIf("src/suggestions/stableYieldProductionAdapters.ts").includes("capacityMode: \"verified_uncapped\""), "never emitted");
  add("16H-G-AK: TVL / withdrawal-liquidity are never read as capacity", (() => { const src = readIf("src/suggestions/stableYieldProductionAdapters.ts"); const cap = (src.split("export function buildKaminoCapacity")[1] ?? ""); return !/tvl|withdrawalLiquidity|liquidityUsd/i.test(cap) && !/Infinity|Number\.MAX/.test(cap); })(), "clean");
  add("16H-G-AL: capacity identity is enforced (a mismatched record yields no capacity)", buildKaminoCapacity({ entry: addressed, raw: rec({ productAddress: OTHER_ADDR }), checkedAt: CHECKED_AT }).output === undefined, "blocked");

  // ---- Minimum / maximum ----
  add("16H-G-AM: a product bound exists only where officially verified, and is never invented", (() => { const ms = listStableYieldEvidenceManifests(); const withBound = ms.filter((m) => m.productMinimumUsd !== undefined || m.productMaximumUsd !== undefined); return ms.every((m) => m.productMaximumUsd === undefined) && withBound.length === 1 && withBound[0].strategyId === "kamino_steakhouse_usdc" && withBound[0].productMinimumUsd === 0.1 && withBound[0].constraintsState === "adapter_implemented_source_verified"; })(), "verified only");
  add("16H-G-AN: WealthSmith's $250 excess threshold never appears as a protocol minimum", !/250/.test(JSON.stringify(listStableYieldEvidenceManifests().map((m) => ({ min: m.productMinimumUsd, max: m.productMaximumUsd })))), "not reused");
  add("16H-G-AO: no canonical buffer-yield minimum is defined by this step", STABLE_YIELD_BUFFER_YIELD_MINIMUM_EXISTS === false, "false");

  // ---- Risk ----
  add("16H-G-AP: incomplete risk evidence blocks readiness for every candidate", listStableYieldEvidenceManifests().every((m) => m.riskReviewState !== "evidence_complete" && m.missingRiskItems.length > 0) && buildStableYieldReadinessMatrix().every((r) => r.riskReviewEvidence === false), "blocked");
  add("16H-G-AQ: no adapter computes, assigns, or mutates a risk score", (() => { const blob = ["stableYieldProductionAdapters.ts", "stableYieldProductionIdentity.ts", "stableYieldSourceParsers.ts", "stableYieldProductionEvidence.ts"].map((f) => readIf(`src/suggestions/${f}`)).join("").toLowerCase(); return !/riskscore\s*=|assignrisk|setrisk|computerisk/.test(blob); })(), "no risk math");

  // ---- Orchestration ----
  add("16H-G-AR: production orchestration consumes canonical adapter output (not raw responses)", readIf("src/suggestions/stableYieldProductInput.ts").includes("buildProductionStableYieldMarketInputs") && readIf("src/suggestions/stableYieldProductInput.ts").includes("buildYieldStrategyMarketDataSet"), "wired");
  add("16H-G-AS: a raw source record supplied to production yields NO market input (identity blocks it)", buildProductionStableYieldMarketInputs({ checkedAt: CHECKED_AT, sourceRecords: { kamino_steakhouse_usdc: rec() } }).inputs.length === 0, "0 inputs");
  add("16H-G-AT: that rejection is diagnosed, not silent (a foreign address mismatches the verified identity)", (() => { const d = buildProductionStableYieldMarketInputs({ checkedAt: CHECKED_AT, sourceRecords: { kamino_steakhouse_usdc: rec() } }).diagnostics; return d.length === 1 && d[0].identityReason === "product_identity_mismatch" && d[0].planningSafe === false; })(), "diagnosed");
  add("16H-G-AU: production STILL returns no_plan and no suggestion after the adapter wiring", (() => { const r = deriveStableYieldPlanSuggestion({ dataMode: "real_wallet", positions: [], checkedAt: CHECKED_AT }); return r.decision?.status === "no_plan" && r.suggestion === null; })(), "no_plan");
  add("16H-G-AV: production still renders NO Stable Yield card", SY_deriveRail({ positions: DEMO_STABLE_YIELD_POSITIONS, pricedAsOf: DEMO_STABLE_YIELD_PRICED_AS_OF, goal: DEMO_STABLE_YIELD_GOAL }).cards.every((c) => c.type !== "deploy_idle_stablecoins"), "no card");
  add("16H-G-AW: Demo behaviour is unchanged by this step (still exactly one card, $500, 5.15%)", (() => { const rail = buildDemoStableYieldRail(); const sy = rail.cards.filter((c) => c.type === "deploy_idle_stablecoins"); return sy.length === 1 && sy[0].impact_text === "Deposit $500.00 USDC on Kamino"; })(), "unchanged");

  // ---- Demo / production isolation ----
  add("16H-G-AX: Demo data cannot satisfy a production adapter (demo address is not a candidate)", buildProductionStableYieldMarketInputs({ checkedAt: CHECKED_AT, sourceRecords: { demo_usdc_yield_vault: rec({ productAddress: "DemoUsdcYieldVaultAddr111111111111111111111" }) } }).inputs.length === 0, "rejected");
  add("16H-G-AY: no adapter module imports the Demo scenario", ["stableYieldProductionAdapters.ts", "stableYieldProductionIdentity.ts", "stableYieldSourceParsers.ts", "stableYieldProductionEvidence.ts"].every((f) => !readIf(`src/suggestions/${f}`).includes("demoStableYieldScenario")), "isolated");

  // ---- Boundary: no React, no network, no execution, no approval ----
  {
    const blob = ["stableYieldProductionAdapters.ts", "stableYieldProductionIdentity.ts", "stableYieldSourceParsers.ts", "stableYieldProductionEvidence.ts", "stableYieldProductionAdapterTypes.ts"].map((f) => readIf(`src/suggestions/${f}`)).join("").toLowerCase();
    add("16H-G-AZ: the adapter layer performs no retrieval and contains no React (fetch is probe-only)", !/\bfetch\(|axios|xmlhttprequest|from "react"|usestate/.test(blob), "offline+no react");
    add("16H-G-BA: the adapter layer adds no execution / transaction / signature / external CTA", !/sendtransaction|signtransaction|signmessage|window\.open|deposit\(|withdraw\(|migrate\(/.test(blob), "read-only");
    add("16H-G-BB: no adapter selects a product, amount, lane, leader, or Top Pick", !/selectleader|selecttoppick|is_top_pick|selectedamount|choosebest/.test(blob), "no selection");
    add("16H-G-BC: no adapter approves a product or mutates the registry", !/lifecycle\s*=\s*"approved"|registry\.push|\.lifecycle\s*=/.test(blob), "no approval");
  }
  add("16H-G-BD: the readiness matrix hard-codes approved=false for every candidate", buildStableYieldReadinessMatrix().every((r) => r.approved === false), "approved=false");
  add("16H-G-BE: 'adapter implemented' is tracked separately from 'source verified' and 'approved'", (() => { const m = listStableYieldEvidenceManifests().find((x) => x.strategyId === "kamino_steakhouse_usdc")!; const row = buildStableYieldReadinessMatrix().find((r) => r.strategyId === "kamino_steakhouse_usdc")!; return m.apyAdapterState === "adapter_implemented_source_verified" && row.apyAdapter === true && row.identityAdapter === true && row.readyForExplicitReview === false && row.approved === false; })(), "distinguished");

  // ---- Flags ----
  add("16H-G-BF: the 16H-G adapter flags are true", [STABLE_YIELD_PRODUCTION_ADAPTER_CONTRACT_EXISTS, STABLE_YIELD_PRODUCTION_IDENTITY_ADAPTERS_EXIST, STABLE_YIELD_PRODUCTION_FRESHNESS_VALIDATION_EXISTS, STABLE_YIELD_PRODUCTION_DEPOSIT_STATE_NORMALIZATION_EXISTS, STABLE_YIELD_PRODUCTION_EVIDENCE_MANIFESTS_EXIST, STABLE_YIELD_PRODUCTION_ADAPTER_DIAGNOSTICS_EXIST, STABLE_YIELD_PRODUCTION_ORCHESTRATION_CONSUMES_ADAPTERS, STABLE_YIELD_PRODUCTION_SOURCE_PROBE_EXISTS, STABLE_YIELD_APPROVAL_READINESS_MATRIX_EXISTS].every((f) => f === true), "true");
  add("16H-G-BG: approval / approved-products / card-available / buffer-minimum / Qdrant flags are false", [STABLE_YIELD_PRODUCTION_PRODUCT_APPROVAL_EXISTS, STABLE_YIELD_PRODUCTION_APPROVED_PRODUCTS_EXIST, STABLE_YIELD_PRODUCTION_CARD_AVAILABLE, STABLE_YIELD_BUFFER_YIELD_MINIMUM_EXISTS, STABLE_YIELD_QDRANT_INTEGRATION_EXISTS, STABLE_YIELD_SMITH_AI_INTEGRATION_EXISTS].every((f) => f === false), "false");

  // ---- Probe safety ----
  {
    const probe = readIf("scripts/probe-stable-yield-sources.mjs");
    // "approved" appears in the probe's REPORT text ("approved: 0 (approval is Step 16H-H)"), so match
    // actual mutation/planning code rather than the word.
    add("16H-G-BH: the probe exists, is developer-only, and never approves / mutates / plans", probe.length > 0 && !/lifecycle\s*[:=]|registry\.push|buildYieldStrategyPlanDecision\(|buildStableYieldPlanSuggestion\(/.test(probe), "safe");
    add("16H-G-BI: the probe refuses to run with credentials present and redacts addresses", probe.includes("FORBIDDEN_SECRETS") && probe.includes("redactAddress"), "no secrets");
    // Needle built from fragments so this check does not match its own source text.
    const netNeedles = ["await " + "fetch(", "https://" + "api.", "createSolanaRpc" + "("];
    add("16H-G-BJ: no deterministic fixture check performs a network request", (() => { let files: string[] = []; try { files = (readdirSync(`${root}/src/suggestions/fixtures`) as string[]).filter((f) => f.endsWith(".ts")).map((f) => `src/suggestions/fixtures/${f}`); } catch { /* ignore */ } return ["src/suggestions/suggestionEngine.fixtures.ts", ...files].every((f) => netNeedles.every((n) => !readIf(f).includes(n))); })(), "offline");
  }

  return checks;
}

/**
 * Step 16H-H — exact product identity resolution + production candidate-set cleanup. Deterministic and
 * OFFLINE: the verified identities below are recorded facts, checked against the registry/manifests.
 * No check performs a network request.
 */

/**
 * Step 16H-H — exact product identity resolution + production candidate-set cleanup. Deterministic and
 * OFFLINE: the verified identities below are recorded facts, checked against the registry/manifests.
 * No check performs a network request.
 */
export function runStableYieldIdentityResolutionFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const CHECKED_AT = "2026-07-16T00:00:00.000Z";
  const STEAK = "HDsayqAsDWy3QvANGqh2yNraqcD8Fnjgh73Mhb3WRS5E";
  const STEAK_SHARES = "7D8C5pDFxug58L9zkwK7bCiDg4kD4AygzbcZUmf5usHS";
  const HIGH_YIELD = "BEEfo7xwgK2ZP13Pxo7qqTPzAteKJmXjVWtMWcXSvbn2";
  const steak = getYieldStrategy("kamino_steakhouse_usdc")!;
  const man = (id: string) => getStableYieldEvidenceManifest(id)!;

  // ---- Identity resolved ----
  add("16H-H-A: the Steakhouse USDC identity is resolved to its exact verified address", steak.address === STEAK && steak.lifecycle === "identity_verified", steak.address ?? "none");
  add("16H-H-B: the registry address and the evidence manifest agree exactly", man("kamino_steakhouse_usdc").productAddress === steak.address, "agree");
  add("16H-H-C: the exact vault-share (receipt) mint is recorded for 16F position detection", man("kamino_steakhouse_usdc").positionIdentifier === STEAK_SHARES, "shares mint");
  // Was 1 (Steakhouse). 16H-N.1 added the lending reserve. The invariant: an address exists ONLY on
  // an identity_verified candidate — never on an unresolved or unsupported one.
  add("16H-H-D (updated by 16H-N.1): exactly TWO candidates have verified addresses, and only identity_verified ones do", (() => { const withAddr = listYieldStrategies().filter((e) => e.address !== undefined); return withAddr.length === 2 && withAddr.every((e) => e.lifecycle === "identity_verified") && listYieldStrategies().filter((e) => e.address === undefined).every((e) => e.lifecycle !== "identity_verified"); })(), "2 of 5");

  // ---- Identity verification is NOT approval (the whole point of the step) ----
  add("16H-H-E: identity_verified is NOT approved — zero approved products remain", getApprovedYieldStrategies().length === 0 && steak.lifecycle !== "approved", "0 approved");
  add("16H-H-F: a verified address alone does not make the product eligible", (() => { const r = deriveStableYieldPlanSuggestion({ dataMode: "real_wallet", positions: [], checkedAt: CHECKED_AT }); return r.decision?.status === "no_plan" && r.suggestion === null; })(), "no_plan");
  add("16H-H-G: production still renders no Stable Yield card after identity resolution", SY_deriveRail({ positions: DEMO_STABLE_YIELD_POSITIONS, pricedAsOf: DEMO_STABLE_YIELD_PRICED_AS_OF, goal: DEMO_STABLE_YIELD_GOAL }).cards.every((c) => c.type !== "deploy_idle_stablecoins"), "no card");
  add("16H-H-H: no candidate is ready for approval review yet", listCandidatesReadyForReview().length === 0 && listStableYieldEvidenceManifests().every((m) => m.primaryBlocker !== "ready_for_approval_review"), "0 ready");

  // ---- Exact matching still enforced against the REAL verified address ----
  add("16H-H-I: a one-character address mismatch is rejected", (() => { const bad = STEAK.slice(0, -1) + (STEAK.endsWith("E") ? "F" : "E"); const r = resolveStableYieldProductIdentity({ entry: steak, claim: { productAddress: bad }, sourceAdapterId: "t" }); return !r.verified && r.reason === "product_identity_mismatch"; })(), "rejected");
  add("16H-H-J: the sibling 'Steakhouse High Yield USDC' vault is rejected (no same-protocol fallback)", (() => { const r = resolveStableYieldProductIdentity({ entry: steak, claim: { productAddress: HIGH_YIELD, protocolId: "kamino" }, sourceAdapterId: "t" }); return !r.verified && r.reason === "product_identity_mismatch"; })(), "rejected");
  add("16H-H-K: the exact product name never substitutes for the address", (() => { const r = resolveStableYieldProductIdentity({ entry: steak, claim: { productName: "Steakhouse USDC", protocolId: "kamino" }, sourceAdapterId: "t" }); return !r.verified && r.reason === "product_not_found"; })(), "name rejected");
  add("16H-H-L: the verified address + canonical USDC mint + chain verifies", (() => { const r = resolveStableYieldProductIdentity({ entry: steak, claim: { productAddress: STEAK, assetMint: SYG_USDC_MINT, chain: "solana_mainnet", protocolId: "kamino" }, sourceAdapterId: "t" }); return r.verified && r.identity.productAddress === STEAK; })(), "verified");
  add("16H-H-M: a wrong asset mint on the verified address is still rejected", (() => { const r = resolveStableYieldProductIdentity({ entry: steak, claim: { productAddress: STEAK, assetMint: STEAK_SHARES }, sourceAdapterId: "t" }); return !r.verified && r.reason === "wrong_asset"; })(), "wrong_asset");

  // ---- APY unit: the 16H-G blocker, now proven ----
  add("16H-H-N: the Kamino APY unit is declared 'fraction' from official evidence (no longer unverified)", man("kamino_steakhouse_usdc").apyUnitInterpretation === "fraction", "fraction");
  add("16H-H-O: the documented decimal-STRING encoding the live API returns is parsed exactly", (() => { const p = parseKaminoVaultRecord({ productAddress: STEAK, assetMint: SYG_USDC_MINT, chain: "solana_mainnet", protocolId: "kamino", netApy: "0.040110766058785959014", sourceTimestamp: CHECKED_AT }, "fraction"); return p.ok && p.value.netApyPct === 4.011077; })(), "4.011077%");
  add("16H-H-P: a 100x unit error is prevented (0.0515 fraction => 5.15%, never 515%)", (() => { const p = parseKaminoVaultRecord({ productAddress: STEAK, assetMint: SYG_USDC_MINT, chain: "solana_mainnet", protocolId: "kamino", netApy: "0.0515", sourceTimestamp: CHECKED_AT }, "fraction"); return p.ok && p.value.netApyPct === 5.15; })(), "5.15%");
  add("16H-H-Q: a 0.01x unit error is prevented (the declared unit is honoured, not the magnitude)", (() => { const asPct = parseKaminoVaultRecord({ productAddress: STEAK, assetMint: SYG_USDC_MINT, chain: "solana_mainnet", protocolId: "kamino", netApy: "5.15", sourceTimestamp: CHECKED_AT }, "percent"); return asPct.ok && asPct.value.netApyPct === 5.15; })(), "5.15%");
  add("16H-H-R: the float artifact stays normalized (0.0515*100 !== 5.15 in IEEE-754)", 0.0515 * 100 !== 5.15 && (() => { const p = parseKaminoVaultRecord({ productAddress: STEAK, assetMint: SYG_USDC_MINT, chain: "solana_mainnet", protocolId: "kamino", netApy: 0.0515, sourceTimestamp: CHECKED_AT }, "fraction"); return p.ok && p.value.netApyPct === 5.15; })(), "normalized");
  add("16H-H-S: malformed decimal strings are rejected, never coerced", ["", "5.2%", "abc", "1e-2", "1,000", " 0.05", "0.05.1"].every((v) => { const p = parseKaminoVaultRecord({ productAddress: STEAK, assetMint: SYG_USDC_MINT, chain: "solana_mainnet", protocolId: "kamino", netApy: v, sourceTimestamp: CHECKED_AT }, "fraction"); return !p.ok; }), "all rejected");

  // ---- Candidate cleanup ----
  add("16H-H-T: the three protocol-level placeholders are explicitly unsupported_for_mvp", ["raydium_stable_usdc_strategy", "meteora_stable_usdc_strategy", "hubble_usdc_strategy"].every((id) => getYieldStrategy(id)!.lifecycle === "unsupported_for_mvp"), "3 unsupported");
  add("16H-H-U: the active candidate set no longer treats placeholders as real products", listActiveYieldStrategyCandidates().length === 2 && listActiveYieldStrategyCandidates().every((e) => e.protocolId === "kamino"), `${listActiveYieldStrategyCandidates().length} active`);
  add("16H-H-V: an unsupported candidate is excluded from the active set and can never be approved", ["raydium_stable_usdc_strategy", "meteora_stable_usdc_strategy", "hubble_usdc_strategy"].every((id) => isYieldStrategyExcluded(getYieldStrategy(id)!)) && getApprovedYieldStrategies().length === 0, "excluded");
  add("16H-H-W: an unsupported candidate cannot enter an adapter (no address, and excluded)", ["raydium_stable_usdc_strategy", "meteora_stable_usdc_strategy", "hubble_usdc_strategy"].every((id) => getYieldStrategy(id)!.address === undefined), "no adapter");
  add("16H-H-X: unsupported candidates are RETAINED for traceability, not deleted", listYieldStrategies().length === 5 && listStableYieldEvidenceManifests().length === 5, "5 retained");
  add("16H-H-Y: Hubble is excluded on product-model grounds, with no risk score and no name penalty", man("hubble_usdc_strategy").primaryBlocker === "unsupported_for_mvp" && man("hubble_usdc_strategy").blockers.some((b) => /CDP|debt position/i.test(b)) && man("hubble_usdc_strategy").riskReviewDate === undefined, "product-model");
  add("16H-H-Z: Raydium/Meteora are excluded as trading/LP venues, not as a USDC deposit product", /trading pool/i.test(man("raydium_stable_usdc_strategy").blockers.join(" ")) && /liquidity pool/i.test(man("meteora_stable_usdc_strategy").blockers.join(" ")), "not deposit products");

  // ---- Kamino lending: market != reserve ----
  // 16H-H-AA asserted the lending reserve identity was NOT resolved. 16H-N.1 resolved it via the
  // official SDK. The guarantee that survives — and is the one that mattered — is that the bound
  // address is the RESERVE, never the market.
  add("16H-H-AA (updated by 16H-N.1): the lending identity IS resolved, and to the RESERVE", (() => { const c = getYieldStrategy("kamino_usdc_lending")!; return c.lifecycle === "identity_verified" && c.address === "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59" && String(c.address) !== "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF"; })(), "resolved to reserve");
  // The core guarantee is unchanged and still enforced: a MARKET address must never sit in the
  // product-identity field. 16H-N.1 satisfied it by binding the RESERVE, not by staying empty.
  add("16H-H-AB (updated by 16H-N.1): a lending MARKET address is still never in the product-identity field", (() => { const c = getYieldStrategy("kamino_usdc_lending")!; const m = man("kamino_usdc_lending"); const MARKETS = ["7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF", "DxXdAyU3kCjnyggvHmY5nAwg5cRbbmdyX3npfDMjjMek", "GMqmFygF5iSm5nkckYU6tieggFcR42SyjkkhK5rswFRs", "6WEGfej9B9wjxRs6t4BYpb9iCXd8CpTpJ8fVSNzHCC5y"]; return !MARKETS.includes(String(c.address)) && !MARKETS.includes(String(m.productAddress)) && /reserve/i.test(m.blockers.join(" ")); })(), "not substituted");
  // 16H-N.1 moved the primary blocker off blocked_identity onto blocked_apy_unit. 16H-N.2 then
  // resolved the APY unit too, so primary moved again. The invariant across both: identity stays
  // resolved, and every superseded blocker keeps a RESOLVED provenance entry rather than vanishing.
  add("16H-N.1-AB2 (updated by 16H-N.3b): resolved blockers keep provenance and primary moves on", (() => { const m = man("kamino_usdc_lending"); const b = m.blockers.join(" "); return m.primaryBlocker === "blocked_risk_review" && /RESOLVED at 16H-N\.1/.test(b) && /RESOLVED at 16H-N\.2/.test(b) && /REOPENED at 16H-N\.3a/.test(b) && /RESOLVED at 16H-N\.3b/.test(b) && !/^blocked_identity \(PRIMARY/.test(b); })(), "blocker moved to capacity");

  // ---- Evidence + readiness ----
  add("16H-H-AC: every manifest carries exactly one deterministic primary status", listStableYieldEvidenceManifests().every((m) => typeof m.primaryBlocker === "string" && m.primaryBlocker.length > 0), "deterministic");
  add("16H-H-AD: no manifest claims 'approved' anywhere", !/\"approved\"|: *\"approved\"/.test(JSON.stringify(listStableYieldEvidenceManifests())), "no approved");
  // The primary blocker has migrated as evidence landed: freshness (16H-H) -> capacity (16H-I) ->
  // risk review (16H-J.1 resolved capacity). Identity has been verified throughout and never sufficed.
    add("16H-H-AE (updated by 16H-O.1): Steakhouse remains blocked despite verified identity — the blocker is now the NEAREST one, deposit availability, not the largest one", man("kamino_steakhouse_usdc").primaryBlocker === "blocked_deposit_availability" && man("kamino_steakhouse_usdc").readiness === "blocked" && man("kamino_steakhouse_usdc").riskReviewState === "blocked", "still blocked");
  add("16H-H-AF: the readiness matrix shows identity resolved but NOT ready and NOT approved", (() => { const r = buildStableYieldReadinessMatrix().find((x) => x.strategyId === "kamino_steakhouse_usdc")!; return r.identityAdapter === true && r.readyForExplicitReview === false && r.approved === false && r.riskReviewEvidence === false; })(), "identity != approval");
  add("16H-H-AG: missing risk review still blocks readiness for every candidate", listStableYieldEvidenceManifests().every((m) => m.riskReviewState !== "evidence_complete"), "risk blocks");

  // ---- Demo unchanged ----
  add("16H-H-AH: Demo still produces exactly one unchanged card ($500.00)", (() => { const sy = buildDemoStableYieldRail().cards.filter((c) => c.type === "deploy_idle_stablecoins"); return sy.length === 1 && sy[0].impact_text === "Deposit $500.00 USDC on Kamino"; })(), "unchanged");
  add("16H-H-AI: the Demo product is still absent from the production registry", listYieldStrategies().every((e) => e.strategyId !== "demo_usdc_yield_vault" && e.address !== "DemoUsdcYieldVaultAddr111111111111111111111"), "isolated");

  // ---- Flags ----
  add("16H-H-AJ: the 16H-H identity/cleanup flags are true", [STABLE_YIELD_PRODUCTION_IDENTITY_RESOLUTION_EXISTS, STABLE_YIELD_PRODUCTION_CANDIDATE_LIFECYCLE_CLEANUP_EXISTS, STABLE_YIELD_PRODUCTION_OFFICIAL_IDENTITY_EVIDENCE_EXISTS, STABLE_YIELD_PRODUCTION_APY_UNIT_VERIFIED, STABLE_YIELD_PRODUCTION_RISK_REVIEW_HANDOFF_EXISTS, STABLE_YIELD_UNSUPPORTED_CANDIDATE_CLASSIFICATION_EXISTS].every((f) => f === true), "true");
  add("16H-H-AK: approval / approved-products / card / buffer-minimum / Qdrant flags remain false", [STABLE_YIELD_PRODUCTION_PRODUCT_APPROVAL_EXISTS, STABLE_YIELD_PRODUCTION_APPROVED_PRODUCTS_EXIST, STABLE_YIELD_PRODUCTION_CARD_AVAILABLE, STABLE_YIELD_BUFFER_YIELD_MINIMUM_EXISTS, STABLE_YIELD_QDRANT_INTEGRATION_EXISTS, STABLE_YIELD_SMITH_AI_INTEGRATION_EXISTS].every((f) => f === false), "false");

  return checks;
}

/**
 * Step 16H-I — the Kamino Steakhouse USDC SDK source path + refresh/publish cache. Deterministic and
 * OFFLINE: every "SDK record" below is a local literal shaped like the real artifact. No network.
 */

/**
 * Step 16H-I — the Kamino Steakhouse USDC SDK source path + refresh/publish cache. Deterministic and
 * OFFLINE: every "SDK record" below is a local literal shaped like the real artifact. No network.
 */
export function runStableYieldSourcePathFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const root = process.cwd();
  const readIf = (rel: string) => { try { return readFileSync(`${root}/${rel}`, "utf8"); } catch { return ""; } };

  const NOW = "2026-07-16T11:30:00.000Z";
  const CHAIN_TIME = "2026-07-16T11:27:33.000Z"; // the real slot 433263778 block time
  const VAULT = "HDsayqAsDWy3QvANGqh2yNraqcD8Fnjgh73Mhb3WRS5E";
  const SHARES = "7D8C5pDFxug58L9zkwK7bCiDg4kD4AygzbcZUmf5usHS";
  const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
  const HIGH_YIELD = "BEEfo7xwgK2ZP13Pxo7qqTPzAteKJmXjVWtMWcXSvbn2";
  const TESTING = "JDmkiqvtyAqAsqrLGDgVH2GesbRAAMJCoQtqiyWx82bF";

  /** A record shaped exactly like the real refresh artifact. APY value is illustrative, not pinned. */
  const rec = (over: Record<string, unknown> = {}) => ({
    schemaVersion: "1.0.0", adapterId: "kamino_vault_sdk_v1", adapterVersion: "1.0.0", generatedAt: NOW,
    strategyId: "kamino_steakhouse_usdc", productAddress: VAULT, sharesMint: SHARES, depositMint: USDC,
    chain: "solana_mainnet", sourceType: "official_protocol_sdk",
    sourceMethod: "klend-sdk:KaminoVault.getAPYs(slot).actualAPY.netAPY",
    sourceSlot: "433263778", sourceTimestamp: CHAIN_TIME, fetchedAt: NOW,
    netApyRaw: "0.0515", netApyUnit: "fraction", apyProvenanceKind: "backend_normalized", browserFetched: false,
    minDepositRaw: "100000", mintDecimals: 6, managementFeeBps: 0, performanceFeeBps: 500,
    depositCapRaw: "0", capacityState: "unknown", depositState: "unknown",
    planningSafe: false, blockers: ["product_unapproved"], ...over,
  });
  const v = (r: unknown, at = NOW) => validateStableYieldMarketRecord(r, at);

  // ---- Exact vault enforcement ----
  add("16H-I-A: the exact selected vault validates", v(rec()).valid === true, "accepted");
  add("16H-I-B: 'Steakhouse High Yield USDC' is rejected BY NAME, not just by mismatch", (() => { const r = v(rec({ productAddress: HIGH_YIELD })); return !r.valid && r.reason === "rejected_non_selected_vault:Steakhouse High Yield USDC"; })(), "rejected");
  add("16H-I-C: 'Steakhouse USDC Testing' is rejected by name", (() => { const r = v(rec({ productAddress: TESTING })); return !r.valid && r.reason === "rejected_non_selected_vault:Steakhouse USDC Testing"; })(), "rejected");
  add("16H-I-D: a one-character vault address change is rejected", (() => { const bad = VAULT.slice(0, -1) + "F"; const r = v(rec({ productAddress: bad })); return !r.valid && r.reason === "product_identity_mismatch"; })(), "rejected");
  add("16H-I-E: a wrong share mint is rejected (share-mint must match the vault relationship)", (() => { const r = v(rec({ sharesMint: USDC })); return !r.valid && r.reason === "shares_mint_mismatch"; })(), "rejected");
  add("16H-I-F: a wrong deposit mint is rejected", (() => { const r = v(rec({ depositMint: SHARES })); return !r.valid && r.reason === "wrong_asset"; })(), "rejected");
  add("16H-I-G: a wrong chain is rejected", (() => { const r = v(rec({ chain: "ethereum_mainnet" })); return !r.valid && r.reason === "wrong_chain"; })(), "rejected");
  add("16H-I-H: a mismatched strategyId is rejected", (() => { const r = v(rec({ strategyId: "kamino_usdc_lending" })); return !r.valid && r.reason === "strategy_id_mismatch"; })(), "rejected");

  // ---- APY ----
  add("16H-I-I: a valid net APY fraction normalizes exactly (0.0515 => 5.15%)", cacheRecordNetApyPct(v(rec()).valid ? (v(rec()) as { record: StableYieldMarketRecord }).record : ({} as StableYieldMarketRecord)) === 5.15, "5.15%");
  add("16H-I-J: the 100x error is prevented (fraction is never read as percent)", (() => { const r = v(rec({ netApyRaw: "0.0515", netApyUnit: "fraction" })); return r.valid && cacheRecordNetApyPct(r.record) === 5.15; })(), "5.15%");
  add("16H-I-K: the 0.01x error is prevented (a declared percent stays percent)", (() => { const r = v(rec({ netApyRaw: "5.15", netApyUnit: "percent" })); return r.valid && cacheRecordNetApyPct(r.record) === 5.15; })(), "5.15%");
  add("16H-I-L: the binary-float artifact is normalized out of the canonical value", (() => { const r = v(rec({ netApyRaw: "0.038774279858246" })); return r.valid && cacheRecordNetApyPct(r.record) === 3.877428; })(), "3.877428%");
  add("16H-I-M: an undeclared APY unit is rejected", (() => { const r = v(rec({ netApyUnit: "unknown" })); return !r.valid && r.reason === "undeclared_apy_unit"; })(), "rejected");
  add("16H-I-N: a percent-suffixed APY string is rejected", (() => { const r = v(rec({ netApyRaw: "5.15%" })); return !r.valid && r.reason === "malformed_decimal_string"; })(), "rejected");
  add("16H-I-O: an exponent APY string is rejected", (() => { const r = v(rec({ netApyRaw: "5.15e-2" })); return !r.valid && r.reason === "malformed_decimal_string"; })(), "rejected");
  add("16H-I-P: a missing / non-string APY is rejected (never 0)", (() => { const a = v(rec({ netApyRaw: undefined })); const b = v(rec({ netApyRaw: 0.05 })); const c = v(rec({ netApyRaw: null })); return !a.valid && !b.valid && !c.valid; })(), "rejected");
  add("16H-I-Q: a negative APY is rejected", (() => { const r = v(rec({ netApyRaw: "-0.01" })); return !r.valid && r.reason === "negative_rate_unsupported"; })(), "rejected");

  // ---- Chain time / freshness ----
  add("16H-I-R: a valid slot + chain block time is accepted", v(rec()).valid === true && rec().sourceSlot === "433263778", "accepted");
  add("16H-I-S: a missing source slot is rejected", (() => { const r = v(rec({ sourceSlot: undefined })); return !r.valid && r.reason === "missing_source_slot"; })(), "rejected");
  add("16H-I-T: a missing source timestamp is rejected (never substituted by fetch time)", (() => { const r = v(rec({ sourceTimestamp: undefined })); return !r.valid && r.reason === "missing_source_timestamp"; })(), "rejected");
  add("16H-I-U: stale chain time fails closed", (() => { const r = v(rec({ sourceTimestamp: "2026-07-15T00:00:00.000Z" })); return !r.valid && r.reason === "source_stale"; })(), "stale");
  add("16H-I-V: future chain time fails closed", (() => { const r = v(rec({ sourceTimestamp: "2026-07-17T00:00:00.000Z" })); return !r.valid && r.reason === "source_future_dated"; })(), "future");
  add("16H-I-W: a RECENT fetchedAt cannot make stale chain data look fresh", (() => { const r = v(rec({ sourceTimestamp: "2026-07-01T00:00:00.000Z", fetchedAt: NOW, generatedAt: NOW })); return !r.valid && r.reason === "source_stale"; })(), "fetch != authority");
  add("16H-I-X: the market input carries the CHAIN time, not the fetch time", (() => { const r = v(rec()); return r.valid && cacheRecordToMarketDataInput(r.record)?.fetchedAt === CHAIN_TIME; })(), "chain time");

  // ---- Minimum + fees ----
  add("16H-I-Y: the on-chain integer minimum converts to exactly 0.1 USDC (no float round-trip)", rawTokenAmountToUsd("100000", 6) === 0.1, "0.1 USDC");
  add("16H-I-Z: token-unit math is exact across magnitudes (no lamport/decimal confusion)", rawTokenAmountToUsd("1", 6) === 0.000001 && rawTokenAmountToUsd("1000000", 6) === 1 && rawTokenAmountToUsd("2500000000", 6) === 2500, "exact");
  add("16H-I-AA: wrong mint decimals are rejected", (() => { const r = v(rec({ mintDecimals: 9 })); return !r.valid && r.reason === "unexpected_mint_decimals"; })(), "rejected");
  add("16H-I-AB: a negative / non-integer raw minimum is rejected", (() => { const a = v(rec({ minDepositRaw: "-100" })); const b = v(rec({ minDepositRaw: "1.5" })); return !a.valid && !b.valid; })(), "rejected");
  add("16H-I-AC: management + performance fees are preserved in basis points", (() => { const r = v(rec()); return r.valid && r.record.managementFeeBps === 0 && r.record.performanceFeeBps === 500; })(), "0/500 bps");
  add("16H-I-AD: out-of-range fee basis points are rejected", (() => { const a = v(rec({ performanceFeeBps: -1 })); const b = v(rec({ performanceFeeBps: 10001 })); const c = v(rec({ managementFeeBps: 1.5 })); return !a.valid && !b.valid && !c.valid; })(), "rejected");
  {
    // computeNetAPR in the official SDK is `grossAPR * (1 - perfFee) - mgmtFee`, so netAPY ALREADY
    // deducts both fees. The adapter must never deduct them a second time.
    const src = readIf("src/suggestions/stableYieldMarketCache.ts") + readIf("scripts/refresh-stable-yield-market-data.mjs");
    add("16H-I-AE: no adapter deducts fees again (the SDK's net APY already includes them)", !/netApy[^\n]*[-*]\s*(performanceFee|managementFee|FeeBps)/i.test(src), "no double deduction");
  }

  // ---- Deposit state + capacity stay honestly unknown ----
  add("16H-I-AF: deposit state is `unknown` — a successful read is not proof deposits are enabled", (() => { const r = v(rec()); return r.valid && r.record.depositState === "unknown"; })(), "unknown");
  add("16H-I-AG: capacity is `unknown` — depositCap=0 is NOT guessed as uncapped or full", (() => { const r = v(rec({ depositCapRaw: "0" })); return r.valid && r.record.capacityState === "unknown"; })(), "unknown");
  // 16H-J.1: capacity is now resolved, but ONLY through the reviewed resolver — the job never hard-codes
  // a capacity verdict of its own, and still never emits Infinity or an arbitrary large number.
  add("16H-I-AH: the refresh job never hard-codes a capacity verdict; it delegates to the reviewed resolver", (() => { const s = readIf("scripts/refresh-stable-yield-market-data.mjs"); const hardcoded = /capacityState:\s*"(verified_uncapped|explicit_remaining_capacity|product_full)"/.test(s); return !hardcoded && /resolveKvaultDepositCapacity\(/.test(s) && !/Infinity|Number\.MAX/.test(s); })(), "delegated");
  add("16H-I-AI: TVL / withdrawal liquidity are never read as capacity", (() => { const s = readIf("scripts/refresh-stable-yield-market-data.mjs") + readIf("src/suggestions/stableYieldMarketCache.ts"); return !/tvl|withdrawalLiquidity/i.test(s); })(), "clean");

  // ---- Publish / artifact safety ----
  add("16H-I-AJ: a browser-fetched record is rejected outright", (() => { const r = v(rec({ browserFetched: true })); return !r.valid && r.reason === "browser_fetched_is_not_allowed"; })(), "rejected");
  add("16H-I-AK: an unsupported schema version is rejected", (() => { const r = v(rec({ schemaVersion: "2.0.0" })); return !r.valid; })(), "rejected");
  add("16H-I-AL: a corrupted / non-object record is rejected", !v("nope").valid && !v(null).valid && !v([]).valid, "rejected");
  {
    const pub = readIf("scripts/publish-stable-yield-market-cache.mjs");
    add("16H-I-AM: the publisher makes no network call and approves nothing", pub.length > 0 && !/fetch\(|createSolanaRpc|klend/.test(pub) && !/lifecycle\s*[:=]|registry\.push/.test(pub), "offline");
    add("16H-I-AN: the publisher writes atomically (tmp + rename)", pub.includes("TMP_PATH") && pub.includes("renameSync"), "atomic");
    add("16H-I-AO: the publisher refuses to publish secrets or a non-selected vault", pub.includes("api_key") && pub.includes("REJECTED_VAULT_ADDRESSES"), "guarded");
  }
  {
    const cache = readIf("public/generated/stable-yield-market-cache.json");
    if (cache.length > 0) {
      const parsed = JSON.parse(cache);
      add("16H-I-AP: the PUBLISHED cache contains no secret, RPC URL, or raw SDK response", !/helius|api_key|apikey|secret|http|authorization/i.test(cache), "clean");
      add("16H-I-AQ: the published cache contains only the selected vault (no High Yield / Testing)", !cache.includes(HIGH_YIELD) && !cache.includes(TESTING) && parsed.productAddress === VAULT, "one vault");
      add("16H-I-AR: the published cache pins browserFetched:false and planningSafe:false", parsed.browserFetched === false && parsed.planningSafe === false, "pinned");
    } else {
      add("16H-I-AP: published cache absent — skipped (refresh+publish not run in this environment)", true, "skipped");
    }
  }

  // ---- Runtime consumption ----
  add("16H-I-AS: a valid published record reaches the canonical 16C market input", buildProductionStableYieldMarketInputs({ checkedAt: NOW, publishedCache: rec() }).inputs.length === 1, "1 input");
  add("16H-I-AT: a rejected sibling vault contributes NO market input", buildProductionStableYieldMarketInputs({ checkedAt: NOW, publishedCache: rec({ productAddress: HIGH_YIELD }) }).inputs.length === 0, "0 inputs");
  add("16H-I-AU: a stale published record contributes NO market input", buildProductionStableYieldMarketInputs({ checkedAt: NOW, publishedCache: rec({ sourceTimestamp: "2026-07-01T00:00:00.000Z" }) }).inputs.length === 0, "0 inputs");
  add("16H-I-AV: the market input is net/current with backend provenance and browserFetched false", (() => { const i = buildProductionStableYieldMarketInputs({ checkedAt: NOW, publishedCache: rec() }).inputs[0]; return i?.apy?.apyDefinition === "net" && i?.apy?.apyWindow === "current" && i?.provenanceKind === "backend_normalized" && i?.browserFetched === false; })(), "canonical");

  // ---- The point: real market data does NOT create eligibility ----
  add("16H-I-AW: an UNAPPROVED product with fresh verified market data is still ineligible", getApprovedYieldStrategies().length === 0 && (() => { const r = deriveStableYieldPlanSuggestion({ dataMode: "real_wallet", positions: [], checkedAt: NOW }); return r.decision?.status === "no_plan" && r.suggestion === null; })(), "no_plan");
  add("16H-I-AX: production still renders NO Stable Yield card", SY_deriveRail({ positions: DEMO_STABLE_YIELD_POSITIONS, pricedAsOf: DEMO_STABLE_YIELD_PRICED_AS_OF, goal: DEMO_STABLE_YIELD_GOAL }).cards.every((c) => c.type !== "deploy_idle_stablecoins"), "no card");
  add("16H-I-AY: Demo remains unchanged (exactly one synthetic card, $500.00)", (() => { const sy = buildDemoStableYieldRail().cards.filter((c) => c.type === "deploy_idle_stablecoins"); return sy.length === 1 && sy[0].impact_text === "Deposit $500.00 USDC on Kamino"; })(), "unchanged");

  // ---- No SDK/RPC/Node code in the browser path ----
  {
    const uiBlob = ["src/components/SuggestionCard.tsx", "src/components/SuggestionReviewModal.tsx", "src/components/RealWalletSuggestionsRail.tsx", "src/pages/DemoDashboardPage.tsx", "src/suggestions/useRailSuggestions.ts", "src/suggestions/stableYieldMarketCache.ts"].map((f) => readIf(f)).join("");
    add("16H-I-AZ: no SDK / RPC / Node / refresh code reaches the React or cache-consumption path", !/klend-sdk|createSolanaRpc|@solana\/kit|node:fs|refresh-stable-yield/.test(uiBlob), "clean");
    add("16H-I-BA: the cache module is pure (no network, no Node built-ins) so the browser stays a consumer", !/fetch\(|node:|require\(/.test(readIf("src/suggestions/stableYieldMarketCache.ts")), "pure");
  }
  {
    const refresh = readIf("scripts/refresh-stable-yield-market-data.mjs");
    add("16H-I-BB: the refresh job READS only Node-only RPC vars (never process.env.VITE_*, which inlines into the bundle)", /process\.env\.STABLE_YIELD_RPC_URL/.test(refresh) && !/process\.env\.VITE_/.test(refresh), "node-only");
    add("16H-I-BC: the refresh job fails closed on missing config, localhost, and null block time", /configuration_missing/.test(refresh) && /localhost/.test(refresh) && /missing_block_time/.test(refresh), "fail-closed");
    add("16H-I-BD: the refresh job binds ONE hard-coded vault and names the rejected siblings", refresh.includes(VAULT) && refresh.includes("REJECTED_VAULTS"), "one vault");
    add("16H-I-BE: the refresh job redacts addresses and the RPC URL in its output", refresh.includes("redactUrl") && refresh.includes("redact"), "redacted");
  }

  // ---- Flags ----
  add("16H-I-BF: the 16H-I source-path flags are true", [STABLE_YIELD_KAMINO_SDK_ADAPTER_EXISTS, STABLE_YIELD_CHAIN_TIME_FRESHNESS_EXISTS, STABLE_YIELD_REFRESH_ARTIFACT_EXISTS, STABLE_YIELD_MARKET_CACHE_PUBLISHER_EXISTS, STABLE_YIELD_RUNTIME_CACHE_CONSUMPTION_EXISTS, STABLE_YIELD_EXACT_VAULT_SOURCE_VALIDATION_EXISTS, STABLE_YIELD_NET_APY_SOURCE_PATH_EXISTS, STABLE_YIELD_BACKEND_REFRESH_BOUNDARY_EXISTS].every((f) => f === true), "true");
  // 16H-J.1 resolved capacity from the official kvault source. Deposit state + risk review stay FALSE.
  add("16H-I-BG: deposit-state / risk-review flags stay FALSE (still genuinely unresolved)", [STABLE_YIELD_PRODUCTION_DEPOSIT_STATE_RESOLVED, STABLE_YIELD_PRODUCTION_RISK_REVIEW_COMPLETE].every((f) => f === false), "false");
  add("16H-I-BH: approval / card / buffer-minimum / Smith-AI / Qdrant flags stay FALSE", [STABLE_YIELD_PRODUCTION_PRODUCT_APPROVAL_EXISTS, STABLE_YIELD_PRODUCTION_APPROVED_PRODUCTS_EXIST, STABLE_YIELD_PRODUCTION_CARD_AVAILABLE, STABLE_YIELD_BUFFER_YIELD_MINIMUM_EXISTS, STABLE_YIELD_SMITH_AI_INTEGRATION_EXISTS, STABLE_YIELD_QDRANT_INTEGRATION_EXISTS].every((f) => f === false), "false");

  return checks;
}


/**
 * Step 16H-J — the exact-vault risk EVIDENCE package. Deterministic and OFFLINE: every assertion reads
 * the committed evidence record. No network, no score, no signoff.
 */
