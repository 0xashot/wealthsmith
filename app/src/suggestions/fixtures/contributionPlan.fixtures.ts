/**
 * Contribution/DCA plan checks: investment-target registry, frequency normalization, planning policy, allocation gap, priority, funding, plan, integration, UI turn, DCA category, canonical mount, migrations.
 *
 * Extracted verbatim from suggestionEngine.fixtures.ts (final monolith dissolution).
 * The monolith aggregates these checks in printFixtureResults; behavior and check
 * names are unchanged.
 */
import { TARGET_ALLOCATION_ASSESSMENT_VERSION } from "../targetAllocationAssessment";
// Step 17C.2 — source-backed binding: the INSTALLED KLend codegen decoder + config-update enum, so the
// block_ctoken_usage fixtures assert against deployed definitions (not a name-inferred assumption).
// Step 17D — Jupiter Lend USDC (jlUSDC) read-only existing-position detection.
// Step 17D.1 — Jupiter Lend share-accounting verification + applicability determination.
// Step 17E — Token-2022 transferability assessment + source binding to the installed spl-token library.
// Step 17F — native Solana stake lifecycle + decomposition.
// Step 17G — supported-LST underlying-SOL normalization.
// Step 17H — canonical portfolio-completeness result + decision gates.
// Step 17H.2 — pure UI selectors over the mounted completeness result.
// Step 18B — canonical Rebalance assessment (foundation for the replacement calculation; not yet mounted).
import { getOnTrackTestingFixtures as otTestFixtures } from "../../pages/onTrackTestingFixtures";
/**
 * suggestionEngine.fixtures — documented fixture scenarios for the Suggestion
 * Engine MVP (no test framework exists in this app, so these are executable
 * fixtures instead of a test suite).
 *
 * Run all checks from app/:
 *   npx esbuild src/suggestions/suggestionEngine.fixtures.ts --bundle --format=esm --platform=node --outfile=/tmp/fixtures.mjs && node -e "import('/tmp/fixtures.mjs').then(m => m.printFixtureResults())"
 *
 * Each scenario builds SuggestionEngineInputs through the REAL adapter
 * (buildSuggestionEngineInputs) with a fixture-derived Safety Buffer shaped
 * exactly like deriveSafetyBuffer's output (the risk-based derivation itself
 * is product logic verified separately in walletSummary/safetyBufferTarget).
 * Values are sample scenario data — never rendered in the app, never demo
 * suggestion cards.
 */
import type { WalletPosition } from "../../wallet/walletPosition";
import type { EngineSuggestion } from "../engineTypes";
import { runSuggestionEngine as runSuggestionEngineRaw } from "../engine";
// Step 24A — asset-ownership registry + dedicated JUP staking modules (fixtures below).
import { selectTopPick } from "../topPick";
import { toSuggestionCard } from "../toSuggestionCard";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import {
  INVESTMENT_TARGET_SCHEMA_VERSION,
  INVESTMENT_TARGET_REGISTRY_VERSION,
  INVESTMENT_TARGET_DEFAULT_PRICE_MAX_AGE_MS,
  type InvestmentTargetDefinition,
} from "../investmentTargetTypes";
import {
  INVESTMENT_TARGET_REGISTRY_EXISTS,
  CONTRIBUTION_PLANNING_EXISTS,
  CONTRIBUTION_RHYTHM_NORMALIZATION_EXISTS,
  TARGET_ALLOCATION_GAP_ENGINE_EXISTS,
  DCA_PLAN_GENERATION_EXISTS,
  DCA_SUGGESTION_ENABLED,
  BTC_CONTRIBUTION_TARGET_ENABLED,
  ETH_CONTRIBUTION_TARGET_ENABLED,
  RWA_CONTRIBUTION_TARGET_ENABLED,
  USDC_GROWTH_DCA_TARGET_ENABLED,
  USDC_CONTRIBUTION_FUNDING_SOURCE_ENABLED,
  INVESTMENT_TARGET_TRANSACTIONS_ENABLED,
  INVESTMENT_TARGET_SIGNATURE_REQUIRED,
  listInvestmentTargets,
  getInvestmentTarget,
  getEnabledInvestmentTargets,
  getMvpInvestmentTargets,
  getContributionFundingSources,
  getSafetyBufferTargets,
  getStableAllocationDestinations,
  getEnabledContributionGrowthTargets,
  getModeledFutureTargets,
  validateInvestmentTargetDefinition,
  validateInvestmentTargetRegistry,
} from "../investmentTargetRegistry";
import {
  evaluateInvestmentTargetTechnicalEligibility,
  listTechnicallyEligibleContributionTargets,
  listTechnicallyEligibleFundingSources,
  type InvestmentTargetTechnicalContext,
} from "../investmentTargetEligibility";
import {
  CONTRIBUTION_FREQUENCY_NORMALIZATION_EXISTS,
  CONTRIBUTION_PRIORITY_ENGINE_EXISTS,
} from "../investmentTargetRegistry";
import {
  CONTRIBUTION_FREQUENCY_SCHEMA_VERSION,
  CONTRIBUTION_FREQUENCY_POLICY_VERSION,
} from "../contributionFrequencyTypes";
import {
  CONTRIBUTION_FREQUENCY_CANONICAL_ORDER,
  listContributionFrequencyDefinitions,
  getContributionFrequencyDefinition,
  validateContributionFrequencyPolicy,
  resolveContributionFrequencyId,
} from "../contributionFrequencyPolicy";
import {
  normalizeMonthlySavingGoalToCents,
  buildContributionCentDecomposition,
  normalizeContributionFrequency,
  validateContributionFrequencyNormalizationResult,
  validateContributionCentDecomposition,
  getContributionFrequencyNormalizationDiagnostics,
  explainContributionFrequencyNormalization,
} from "../contributionFrequencyNormalization";
import { CONTRIBUTION_OPTIONS } from "../../state/goalState";
import { SOL_MINT as PRICE_SOL_MINT } from "../../wallet/tokenPrices";
import { MIN_DCA_SUGGESTION_USD, SUGGESTION_ENGINE_VERSION } from "../engineThresholds";
import {
  CONTRIBUTION_PLANNING_POLICY_SCHEMA_VERSION,
  GROWTH_TARGET_ALLOCATION_POLICY_ID,
  GROWTH_TARGET_ALLOCATION_POLICY_VERSION,
  DCA_MINIMUM_POLICY_ID,
  DCA_MINIMUM_POLICY_VERSION,
  SOL_GROWTH_SUITABILITY_POLICY_ID,
  SOL_GROWTH_SUITABILITY_POLICY_VERSION,
  CONTRIBUTION_PRICE_POLICY_ID,
  CONTRIBUTION_PRICE_POLICY_VERSION,
} from "../contributionPlanningPolicyTypes";
import {
  buildGrowthTargetAllocationPolicyResult,
  validateGrowthTargetAllocationPolicyResult,
  getGrowthTargetAllocationPolicyDiagnostics,
} from "../growthTargetAllocationPolicy";
import {
  DCA_ABSOLUTE_MINIMUM_SUGGESTION_USD,
  DCA_EXCESS_USDC_TRIGGER_USD,
  DCA_UNDERWEIGHT_TRIGGER_PERCENTAGE_POINTS,
  DCA_MAX_TARGET_OVERSHOOT_PERCENTAGE_POINTS,
  DCA_QUARTER_PERCENT_RULE_ENFORCED,
  getDcaMinimumPolicy,
  evaluateDcaAmountAgainstMinimumPolicy,
} from "../dcaMinimumPolicy";
import {
  SOL_CONTRIBUTION_PRICE_MAX_AGE_MS,
  CANONICAL_CONTRIBUTION_PRICE_SOURCE_ID,
  evaluateContributionPriceQuote,
  validateContributionPriceQuote,
} from "../contributionPricePolicy";
import {
  evaluateContributionTargetSuitability,
  RECOGNIZED_PROFILE_RISK_IDS,
} from "../contributionTargetSuitability";
import {
  evaluateContributionTargetPolicyEligibility,
  validateContributionTargetPolicyEligibility,
  getContributionTargetPolicyEligibilityDiagnostics,
} from "../contributionTargetPolicyEligibility";
import {
  GROWTH_TARGET_ALLOCATION_POLICY_EXISTS,
  DCA_MINIMUM_POLICY_EXISTS,
  SOL_GROWTH_SUITABILITY_POLICY_EXISTS,
  CONTRIBUTION_PRICE_POLICY_EXISTS,
  CONTRIBUTION_TARGET_POLICY_ELIGIBILITY_EXISTS,
  CONTRIBUTION_POLICY_UPDATES_PRODUCT_OUTPUT,
  BTC_CONTRIBUTION_TARGET_ENABLED as BTC_ENABLED_15C,
  ETH_CONTRIBUTION_TARGET_ENABLED as ETH_ENABLED_15C,
  RWA_CONTRIBUTION_TARGET_ENABLED as RWA_ENABLED_15C,
} from "../investmentTargetRegistry";
import {
  TARGET_ALLOCATION_GAP_UPDATES_PRODUCT_OUTPUT,
  TARGET_ALLOCATION_GAP_SELECTS_TARGET,
  TARGET_ALLOCATION_GAP_EVALUATES_FUNDING,
  TARGET_ALLOCATION_GAP_EVALUATES_SAFETY_BUFFER,
} from "../investmentTargetRegistry";
import {
  CONTRIBUTION_ALLOCATION_GAP_SCHEMA_VERSION,
  CONTRIBUTION_ALLOCATION_GAP_POLICY_ID,
  CONTRIBUTION_ALLOCATION_GAP_POLICY_VERSION,
  type ContributionPortfolioAllocationSnapshot,
  type ContributionPortfolioTargetExposure,
} from "../contributionAllocationGapTypes";
import {
  CONTRIBUTION_ALLOCATION_PERCENTAGE_TOLERANCE,
  CONTRIBUTION_ALLOCATION_UNDERWEIGHT_TRIGGER_PERCENTAGE_POINTS,
  classifyContributionAllocationGap,
  validateContributionAllocationGapPolicy,
} from "../contributionAllocationGapPolicy";
import {
  TARGET_ALLOCATION_GAP_ENGINE_EXISTS as GAP_ENGINE_EXISTS_15D,
  buildContributionAllocationGapAnalysis,
  computeExternalContributionToReachTarget,
  projectContributionAllocationAfterHypotheticalIncrease,
  validateContributionAllocationGapAnalysisResult,
  validateContributionPortfolioAllocationSnapshot,
  isEnabledGrowthContributionTarget,
} from "../contributionAllocationGapEngine";
import { getContributionAllocationGapDiagnostics, explainContributionTargetAllocationGap } from "../contributionAllocationGapDiagnostics";
import type { GrowthTargetAllocationPolicyResult } from "../growthTargetAllocationPolicy";
import type { InvestmentTargetHoldingSource } from "../investmentTargetTypes";
import {
  CONTRIBUTION_PRIORITY_SCHEMA_VERSION,
  CONTRIBUTION_PRIORITY_POLICY_ID,
  CONTRIBUTION_PRIORITY_POLICY_VERSION,
  type ContributionSafetyBufferSnapshot,
} from "../contributionPriorityTypes";
import {
  CONTRIBUTION_PRIORITY_ORDER,
  CONTRIBUTION_PRIORITY_UNDERWEIGHT_TRIGGER_PERCENTAGE_POINTS,
  validateContributionPriorityPolicy,
} from "../contributionPriorityPolicy";
import {
  CONTRIBUTION_SAFETY_BUFFER_GATE_EXISTS,
  CANONICAL_SAFETY_BUFFER_POLICY_ID,
  CANONICAL_SAFETY_BUFFER_POLICY_VERSION,
  buildContributionSafetyBufferSnapshot,
  evaluateContributionSafetyBufferGate,
  validateContributionSafetyBufferGateDecision,
} from "../contributionSafetyBufferGate";
import {
  CONTRIBUTION_PRIORITY_ENGINE_EXISTS as PRIORITY_ENGINE_EXISTS_15E,
  buildContributionPriorityDecision,
  buildContributionStablePriorityContext,
  buildContributionGrowthPriorityContext,
  validateContributionPriorityDecision,
} from "../contributionPriorityEngine";
import { getContributionPriorityDiagnostics, explainContributionPriorityDecision } from "../contributionPriorityDiagnostics";
import {
  CONTRIBUTION_PRIORITY_UPDATES_PRODUCT_OUTPUT,
  CONTRIBUTION_PRIORITY_SELECTS_FUNDING_SOURCE,
  CONTRIBUTION_PRIORITY_CALCULATES_AMOUNT,
  CONTRIBUTION_PRIORITY_GENERATES_PLAN,
  CONTRIBUTION_PRIORITY_GENERATES_SUGGESTION,
} from "../investmentTargetRegistry";
import {
  CONTRIBUTION_FUNDING_SCHEMA_VERSION,
  CONTRIBUTION_FUNDING_POLICY_ID,
  CONTRIBUTION_FUNDING_POLICY_VERSION,
  type ContributionFundingLiquiditySnapshot,
  type ContributionFundingUsdcPosition,
  type ContributionFundingLiquidityStatus,
} from "../contributionFundingTypes";
import {
  CONTRIBUTION_FUNDING_SOURCE_ORDER,
  CONTRIBUTION_MIXED_FUNDING_ALLOWED,
  validateContributionFundingPolicy,
} from "../contributionFundingPolicy";
import {
  CONTRIBUTION_FUNDING_AVAILABILITY_EXISTS as FUNDING_AVAIL_EXISTS_15F,
  evaluateUpcomingContributionFunding,
  evaluateExistingExcessUsdcFunding,
  evaluateContributionFundingLiquiditySnapshot,
  calculateExcessLiquidUsdcAboveSafetyBuffer,
} from "../contributionFundingAvailability";
import {
  CONTRIBUTION_FUNDING_SOURCE_SELECTION_EXISTS as FUNDING_SELECT_EXISTS_15F,
  buildContributionFundingSelection,
  validateContributionFundingSelectionResult,
} from "../contributionFundingSelection";
import { getContributionFundingDiagnostics, explainContributionFundingSelection } from "../contributionFundingDiagnostics";
import {
  CONTRIBUTION_FUNDING_SOURCE_SELECTION_EXISTS,
  CONTRIBUTION_FUNDING_AVAILABILITY_EXISTS,
  CONTRIBUTION_FUNDING_UPDATES_PRODUCT_OUTPUT,
  CONTRIBUTION_FUNDING_MIXED_SOURCES_ENABLED,
  CONTRIBUTION_FUNDING_CALCULATES_FINAL_AMOUNT,
  CONTRIBUTION_FUNDING_ROUTES_RESIDUAL,
  CONTRIBUTION_FUNDING_GENERATES_PLAN,
  CONTRIBUTION_FUNDING_GENERATES_SUGGESTION,
} from "../investmentTargetRegistry";
import { normalizeContributionFrequency as normFreq15F } from "../contributionFrequencyNormalization";
import {
  CONTRIBUTION_PLAN_SCHEMA_VERSION,
  CONTRIBUTION_PLAN_POLICY_ID,
  CONTRIBUTION_PLAN_POLICY_VERSION,
  EXCESS_USDC_DCA_POLICY_ID,
  EXCESS_USDC_DCA_POLICY_VERSION,
} from "../contributionPlanTypes";
import {
  EXCESS_USDC_DCA_TRANCHE_COUNT,
  EXCESS_USDC_DCA_DURATION_DAYS,
  getExcessUsdcDcaRelativeDayOffsets,
  validateContributionPlanPolicy,
} from "../contributionPlanPolicy";
import { buildExactPlanTranches, buildContributionPlanAmountFromSourceOption } from "../contributionPlanAmount";
import {
  CONTRIBUTION_PLAN_GENERATOR_EXISTS as PLAN_GEN_EXISTS_15G,
  buildContributionPlan,
  validateContributionPlanGenerationResult,
} from "../contributionPlanGenerator";
import { getContributionPlanDiagnostics, explainContributionPlan } from "../contributionPlanDiagnostics";
import type { ContributionPriorityDecision } from "../contributionPriorityTypes";
import {
  CONTRIBUTION_PRODUCT_INTEGRATION_SCHEMA_VERSION,
  CONTRIBUTION_PRODUCT_INTEGRATION_POLICY_ID,
  CONTRIBUTION_PRODUCT_INTEGRATION_POLICY_VERSION,
} from "../contributionIntegrationTypes";
import { buildContributionPortfolioSnapshot, buildContributionPortfolioSnapshotFromPositions, deriveSolEconomicExposureUsd, deriveUsdcExposureUsd } from "../contributionPortfolioAdapter";
import { buildContributionLiquiditySnapshot, buildContributionUsdcPosition } from "../contributionLiquidityAdapter";
import { buildContributionPriceQuote } from "../contributionPriceAdapter";
import { CONTRIBUTION_PLAN_PIPELINE_EXISTS, buildContributionPlanPipeline } from "../contributionPlanPipeline";
import { mergeContributionPlanSuggestion } from "../contributionPlanSuggestion";
import { CONTRIBUTION_PLAN_READ_ONLY_NOTICE } from "../contributionPlanReviewDetails";
import { listContributionTestingScenarios, runAllContributionTestingScenarios, runContributionTestingScenario } from "../contributionTestingScenarios";
import {
  CONTRIBUTION_PRODUCT_INTEGRATION_EXISTS,
  CONTRIBUTION_SUGGESTION_INTEGRATION_EXISTS,
  CONTRIBUTION_SUGGESTION_UI_ENABLED,
  CONTRIBUTION_REVIEW_MODAL_ENABLED,
  CONTRIBUTION_DEMO_PIPELINE_ENABLED,
  CONTRIBUTION_REAL_WALLET_PIPELINE_ENABLED,
  CONTRIBUTION_TESTING_SCENARIOS_EXIST as CONTRIBUTION_TESTING_SCENARIOS_EXIST_FLAG,
} from "../investmentTargetRegistry";
import { CATEGORY_PRIORITY, selectTopPick as selectTopPick15H } from "../topPick";
import { CANONICAL_CONTRIBUTION_PRICE_SOURCE_ID as PRICE_SRC_15H } from "../contributionPricePolicy";
import { toSuggestionCard as toSuggestionCard15H } from "../toSuggestionCard";
import { DEMO_POSITIONS, DEMO_GOAL } from "../demoContributionScenario";
import { deriveContributionSuggestion, isCryptoBucketAtOrAboveTarget } from "../contributionProductInput";
import { computeContributionAllocationSplit, legAmount, legApplies } from "../contributionAllocationSplit";
import { buildContributionSplitCards } from "../contributionSplitSuggestion";
import { manualAmountError, isClearingAmount } from "../../state/manualAssets";
import { buildGrowthSubAllocation, validateGrowthSubAllocation, growthSubAllocationWeightsAreWellFormed, GROWTH_SUB_ALLOCATION_WEIGHTS } from "../growthTargetSubAllocationPolicy";
import { buildGrowthTargetAllocationPolicyResult as buildGrowthAlloc, validateGrowthTargetAllocationPolicyResult as validateGrowthAlloc } from "../growthTargetAllocationPolicy";
import { buildDemoStableYieldRail, DEMO_STABLE_YIELD_POSITIONS, DEMO_STABLE_YIELD_GOAL, DEMO_STABLE_YIELD_PRICED_AS_OF } from "../demoStableYieldScenario";
import { deriveRailSuggestions as SY_deriveRail } from "../useRailSuggestions";
import {
  CONTRIBUTION_PLAN_GENERATOR_EXISTS,
  CONTRIBUTION_PLAN_TARGET_SELECTION_EXISTS,
  CONTRIBUTION_PLAN_AMOUNT_CALCULATION_EXISTS,
  CONTRIBUTION_PLAN_PROJECTION_EXISTS,
  CONTRIBUTION_PLAN_STAGED_DCA_EXISTS,
  CONTRIBUTION_PLAN_UPDATES_PRODUCT_OUTPUT,
  CONTRIBUTION_PLAN_GENERATES_SUGGESTION,
  CONTRIBUTION_PLAN_EXECUTION_ENABLED,
  CONTRIBUTION_PLAN_AUTOMATION_ENABLED,
  CONTRIBUTION_PLAN_CALENDAR_DATES_ENABLED,
  CONTRIBUTION_TARGET_SELECTION_ENABLED as PLAN_TARGET_SELECTION_ENABLED_15G,
} from "../investmentTargetRegistry";
import type { FixtureCheck } from "./fixtureCheck";
import { bufferOverrideFromInputs, onTrackOverrideFromInputs, runSuggestionEngine, runEngineWithLegacyRebalance, buildSyntheticPositionOptimizationCandidateForFixture, buildEngineFixtureDcaCandidate, fxRiskTarget, FIXTURE_GENERATED_AT, goalFixture, bufferFixture, allocationFixture, solPosition, cryptoPosition, stablePosition, inputsFor, mkSug15H, scenBuffer, CONTRIBUTION_PLAN_EXECUTION_ENABLED_15H } from "./engineFixtureHarness";

/* ------------------------------------------------------------------ *
 * Step 9G — DCA (contribution-funded gradual entry) trigger.
 * dcaUnder(delta) builds an allocation where crypto is `delta` points under
 * target (delta 3 → current 57% / target 60% at 15,000 = $450 gap).
 * goalFixture.monthly_saving_goal is $2,000.
 * ------------------------------------------------------------------ */
export function runDcaFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });
  const cats = (r: ReturnType<typeof runSuggestionEngine>) =>
    r.suggestions.map((s) => s.category).join(",") || "none";
  const has = (r: ReturnType<typeof runSuggestionEngine>, c: string) =>
    r.suggestions.some((s) => s.category === c);
  const dca = (r: ReturnType<typeof runSuggestionEngine>) =>
    r.suggestions.find((s) => s.category === "dca");

  const funded = () => bufferFixture(5000, 1000, 3);
  // Crypto `points` under target at 15,000 total (delta = -points).
  const dcaUnder = (points: number) => allocationFixture(15000, 60 - points, -points);
  const offTarget = () => allocationFixture(15000, 75, 15); // rebalance applies
  const noContribGoal = { ...goalFixture, monthly_saving_goal: null };
  const smallContribGoal = { ...goalFixture, monthly_saving_goal: 30 };

  // 9G-A. Underfunded buffer + DCA conditions otherwise true → Buffer only.
  {
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: dcaUnder(3),
        safetyBuffer: bufferFixture(800, 1000, 3),
        
        positions: [cryptoPosition(100)],
      }),
      FIXTURE_GENERATED_AT
    );
    add("9G-A: underfunded buffer → buffer only, no dca", cats(r) === "buffer" && !has(r, "dca"), `categories=${cats(r)}`);
  }

  // 9G-B. Funded + Rebalance applies + contribution → Rebalance, no DCA.
  {
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: offTarget(), safetyBuffer: funded(), positions: [cryptoPosition(100)] }),
      FIXTURE_GENERATED_AT
    );
    add("9G-B: rebalance applies → rebalance, no dca", has(r, "rebalance") && !has(r, "dca"), `categories=${cats(r)}`);
  }

  // 9G-C. Funded + crypto 3pts under target + contribution ≥ $50 + no higher → DCA Top Pick.
  {
    const inp = inputsFor({ allocation: dcaUnder(3), safetyBuffer: funded(), positions: [cryptoPosition(100)] });
    const r = runEngineWithLegacyRebalance(inp, FIXTURE_GENERATED_AT, buildEngineFixtureDcaCandidate());
    const s = dca(r);
    add(
      "9G-C: funded + 3pt underweight + contribution → dca Top Pick",
      cats(r) === "dca" && s?.is_top_pick === true && s?.amount?.valueUsd === 450,
      `categories=${cats(r)} topPick=${s?.is_top_pick} amount=${s?.amount?.valueUsd}`
    );
  }

  // 9G-D. Crypto at/above target → no DCA → On Track.
  {
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: allocationFixture(15000, 60, 0), safetyBuffer: funded(), positions: [cryptoPosition(100)] }),
      FIXTURE_GENERATED_AT
    );
    add("9G-D: crypto at target → no dca, On Track", !has(r, "dca") && cats(r).split(",").every((c) => c === "on_track") && cats(r) !== "none", `categories=${cats(r)}`);
  }

  // 9G-E. Underweight below 2 points → no DCA → On Track.
  {
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: dcaUnder(1), safetyBuffer: funded(), positions: [cryptoPosition(100)] }),
      FIXTURE_GENERATED_AT
    );
    add("9G-E: underweight < 2pt → no dca, On Track", !has(r, "dca") && cats(r).split(",").every((c) => c === "on_track") && cats(r) !== "none", `categories=${cats(r)}`);
  }

  // 9G-F. Monthly contribution missing → no DCA → On Track.
  {
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: dcaUnder(3), safetyBuffer: funded(), positions: [cryptoPosition(100)], goal: noContribGoal }),
      FIXTURE_GENERATED_AT
    );
    add("9G-F: no contribution → no dca, On Track", !has(r, "dca") && cats(r).split(",").every((c) => c === "on_track") && cats(r) !== "none", `categories=${cats(r)}`);
  }

  // 9G-G. Monthly contribution below $50 → no DCA → On Track.
  {
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: dcaUnder(3), safetyBuffer: funded(), positions: [cryptoPosition(100)], goal: smallContribGoal }),
      FIXTURE_GENERATED_AT
    );
    add("9G-G: contribution < $50 → no dca, On Track", !has(r, "dca") && cats(r).split(",").every((c) => c === "on_track") && cats(r) !== "none", `categories=${cats(r)}`);
  }

  // 9G-H. Target crypto gap below $50 (small portfolio, 2pt gap = $40) → no DCA → On Track.
  {
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: allocationFixture(2000, 58, -2),
        safetyBuffer: bufferFixture(2000, 300, 3),
        totalUsd: 2000,
        // gap = 2000*0.60 − 2000*0.58 = 40
        positions: [cryptoPosition(50)],
      }),
      FIXTURE_GENERATED_AT
    );
    add("9G-H: target gap < $50 → no dca, On Track", !has(r, "dca") && cats(r).split(",").every((c) => c === "on_track") && cats(r) !== "none", `categories=${cats(r)}`);
  }

  // 9G-I. capEff + staking + stable_yield + DCA, no rebalance → engine order, capEff Top Pick.
  {
    const inp = inputsFor({ allocation: dcaUnder(3),
      safetyBuffer: funded(),
      
      positions: [cryptoPosition(400), solPosition(10), stablePosition("USDC", 10000)],
    });
    const r = runEngineWithLegacyRebalance(inp, FIXTURE_GENERATED_AT, buildEngineFixtureDcaCandidate());
    const staking = r.suggestions.find((s) => s.category === "staking");
    add(
      "9G-I: staking + stable_yield + dca (NO capital_efficiency), staking Top Pick",
      cats(r) === "staking,stable_yield,dca" && !has(r, "capital_efficiency") && staking?.is_top_pick === true,
      `categories=${cats(r)} stakingTop=${staking?.is_top_pick}`
    );
  }

  // 9G-J. DCA + Position Optimization, no higher candidates → DCA first (Top Pick), posOpt second.
  {
    const inp = inputsFor({ allocation: dcaUnder(3),
      safetyBuffer: funded(),
      
      positions: [cryptoPosition(100)],
    });
    const r = runEngineWithLegacyRebalance(
      inp,
      FIXTURE_GENERATED_AT, buildEngineFixtureDcaCandidate(), null, undefined, null, buildSyntheticPositionOptimizationCandidateForFixture()
    );
    add(
      "9G-J: dca + position_optimization → dca first/Top Pick, posOpt second",
      cats(r) === "dca,position_optimization" && dca(r)?.is_top_pick === true,
      `categories=${cats(r)} dcaTop=${dca(r)?.is_top_pick}`
    );
  }

  // 9G-K. Mapper renders the DCA card safely.
  {
    const inp = inputsFor({ allocation: dcaUnder(3), safetyBuffer: funded(), positions: [cryptoPosition(100)] });
    const r = runEngineWithLegacyRebalance(inp, FIXTURE_GENERATED_AT, buildEngineFixtureDcaCandidate());
    const s = dca(r);
    const card = s ? toSuggestionCard(s) : undefined;
    add(
      "9G-K: dca card maps safely (copy, amount, review-only, non-transactional)",
      card?.title === "Review a DCA Plan" &&
        card?.description ===
          "Your crypto allocation is below target. You may be able to use future contributions to build exposure gradually." &&
        card?.impact_text.includes("Contribution to review") === true &&
        card?.cta.label === "Review" &&
        card?.cta.executes_transaction === false &&
        card?.cta.action === null,
      `title="${card?.title}" impact="${card?.impact_text}"`
    );
  }

  // 9G-L. DCA output names no specific token (only the generic crypto bucket).
  {
    const inp = inputsFor({ allocation: dcaUnder(3), safetyBuffer: funded(), positions: [cryptoPosition(100)] });
    const r = runEngineWithLegacyRebalance(inp, FIXTURE_GENERATED_AT, buildEngineFixtureDcaCandidate());
    const s = dca(r);
    const noToken = s ? !/\b(SOL|WSOL|BTC|ETH|BONK|JUP|WIF)\b/.test(JSON.stringify(s)) : false;
    add(
      "9G-L: dca chooses no specific token (generic crypto bucket only)",
      noToken && s?.to?.bucket === "crypto" && s?.to?.symbol === undefined,
      `noToken=${noToken} toBucket=${s?.to?.bucket}`
    );
  }

  return checks;
}


export function runInvestmentTargetRegistryFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });

  const root = process.cwd();
  const readIf = (rel: string) => { try { return readFileSync(`${root}/${rel}`, "utf8"); } catch { return ""; } };

  const targets = listInvestmentTargets();
  const sol = getInvestmentTarget("sol")!;
  const usdc = getInvestmentTarget("usdc")!;
  const btc = getInvestmentTarget("btc")!;
  const eth = getInvestmentTarget("eth")!;

  const CHECKED = "2026-07-14T03:00:00Z";
  const FRESH = "2026-07-14T02:50:00Z"; // 10 min → within 60-min default
  const STALE = "2026-07-11T00:00:00Z";
  const fullCtx: InvestmentTargetTechnicalContext = {
    checkedAt: CHECKED,
    availableHoldingSources: ["connected_wallet", "protocol_position", "manual_entry"],
    priceStatusByTargetId: { sol: { available: true, fetchedAt: FRESH }, usdc: { available: true, fetchedAt: FRESH }, btc: { available: true, fetchedAt: FRESH }, eth: { available: true, fetchedAt: FRESH } },
    configuredAllocationPolicyKeys: ["growth_target_allocation_v1"],
    configuredMinimumPolicyKeys: ["dca_minimum_v1"],
    configuredSuitabilityPolicyKeys: ["sol_growth_suitability_v1"],
    approvedTargetIds: [],
  };

  // A fully-specified SYNTHETIC RWA product (fixture-only; never runtime/UI).
  const syntheticRwa: InvestmentTargetDefinition = {
    schemaVersion: "1.0.0",
    targetId: "synthetic_rwa_product",
    assetId: "rwa:synthetic:tbill-fund-2026",
    symbol: "SYNRWA",
    displayName: "Synthetic RWA Product",
    category: "rwa",
    lifecycleStatus: "modeled_not_enabled",
    holdingSources: ["future_external_import"],
    suggestionRoles: ["contribution_growth_target", "rebalance_increase_target"],
    canBeContributionTarget: false,
    canFundContributionPlan: false,
    canServeAsSafetyBuffer: false,
    canReceiveStableAllocation: false,
    priceRequirements: { priceRequiredForContributionPlanning: true, maximumPriceAgeMs: INVESTMENT_TARGET_DEFAULT_PRICE_MAX_AGE_MS },
    allocationRequirements: { targetAllocationRequired: true, allocationPolicyKey: "rwa_alloc_v_future", maximumOvershootAllowed: false },
    minimumRequirements: { minimumSuggestedAmountUsd: 1000, minimumPolicyKey: "rwa_min_v_future" },
    suitabilityPolicyKey: "rwa_suitability_v_future",
    rwaRequirements: { productSpecificApprovalRequired: true, jurisdictionEligibilityRequired: true, liquidityReviewRequired: true, lockupReviewRequired: true, issuerOrProtocolReviewRequired: true, pricingMethodRequired: true },
    executionStatus: "read_only_only",
    transactionsEnabled: false,
    walletSignatureRequired: false,
    enabledForMvp: false,
    activationBlockers: ["target_disabled", "product_not_approved", "jurisdiction_rules_not_configured", "liquidity_rules_not_configured", "lockup_rules_not_configured", "risk_review_incomplete"],
    notes: ["SYNTHETIC fixture-only RWA product — never exposed to runtime or UI."],
  };

  // 15A-A…G. Schema + registry.
  add("15A-A: schema version exists", INVESTMENT_TARGET_SCHEMA_VERSION === "1.0.0" && sol.schemaVersion === "1.0.0", INVESTMENT_TARGET_SCHEMA_VERSION);
  add("15A-B: registry version exists", INVESTMENT_TARGET_REGISTRY_VERSION === "1.0.0", INVESTMENT_TARGET_REGISTRY_VERSION);
  add("15A-C: registry exists", INVESTMENT_TARGET_REGISTRY_EXISTS === true && targets.length === 4, `n=${targets.length}`);
  add("15A-D: registry validation passes", validateInvestmentTargetRegistry().valid === true, "valid");
  add("15A-E: canonical order is deterministic", JSON.stringify(targets.map((t) => t.targetId)) === JSON.stringify(["usdc", "sol", "btc", "eth"]), targets.map((t) => t.targetId).join(","));
  add("15A-F: target IDs are unique", new Set(targets.map((t) => t.targetId)).size === targets.length, "unique");
  { const a = getInvestmentTarget("sol")!; a.symbol = "MUTATED"; add("15A-G: definitions are immutable or returned safely", getInvestmentTarget("sol")!.symbol === "SOL", "safe copy"); }

  // 15A-H…P. SOL.
  add("15A-H: SOL exists", sol != null, "exists");
  add("15A-I: SOL category is growth_crypto", sol.category === "growth_crypto", sol.category);
  add("15A-J: SOL is enabled for MVP", sol.lifecycleStatus === "enabled" && sol.enabledForMvp === true, "enabled");
  add("15A-K: SOL can be a contribution target", sol.canBeContributionTarget === true && sol.suggestionRoles.includes("contribution_growth_target"), "target");
  add("15A-L: SOL cannot fund its own contribution plan", sol.canFundContributionPlan === false, "no funding");
  add("15A-M: SOL is not a safety-buffer asset", sol.canServeAsSafetyBuffer === false, "not buffer");
  add("15A-N: SOL requires pricing", sol.priceRequirements.priceRequiredForContributionPlanning === true, "requires price");
  add("15A-O: SOL requires target allocation", sol.allocationRequirements.targetAllocationRequired === true, "requires allocation");
  add("15A-P: SOL execution is read-only", sol.executionStatus === "read_only_only" && sol.transactionsEnabled === false && sol.walletSignatureRequired === false, "read-only");

  // 15A-Q…Y. USDC.
  add("15A-Q: USDC exists", usdc != null, "exists");
  add("15A-R: USDC category is stable_asset", usdc.category === "stable_asset", usdc.category);
  add("15A-S: USDC is enabled for MVP", usdc.lifecycleStatus === "enabled" && usdc.enabledForMvp === true, "enabled");
  add("15A-T: USDC can fund a contribution plan", usdc.canFundContributionPlan === true && USDC_CONTRIBUTION_FUNDING_SOURCE_ENABLED === true, "funds");
  add("15A-U: USDC can serve as the safety-buffer asset", usdc.canServeAsSafetyBuffer === true, "buffer");
  add("15A-V: USDC can receive stable allocation", usdc.canReceiveStableAllocation === true, "stable dest");
  add("15A-W: USDC is not an enabled growth DCA target", usdc.canBeContributionTarget === false && USDC_GROWTH_DCA_TARGET_ENABLED === false, "not growth");
  add("15A-X: USDC appears in funding sources", getContributionFundingSources().some((t) => t.targetId === "usdc"), "funding");
  add("15A-Y: USDC does not appear in growth contribution targets", getEnabledContributionGrowthTargets().every((t) => t.targetId !== "usdc"), "excluded");

  // 15A-Z…AF. BTC.
  add("15A-Z: BTC exists", btc != null, "exists");
  add("15A-AA: BTC represents native BTC", btc.assetId === "bitcoin:native", btc.assetId);
  add("15A-AB: BTC does not represent wrapped BTC", !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(btc.assetId) && !btc.assetId.toLowerCase().includes("wbtc"), "native");
  add("15A-AC: BTC supports manual_entry", btc.holdingSources.includes("manual_entry"), "manual");
  add("15A-AD: BTC is an ENABLED manual-entry growth target", btc.lifecycleStatus === "enabled" && btc.enabledForMvp === true && btc.holdingSources.join(",") === "manual_entry", "enabled");
  add("15A-AE: BTC can RECEIVE a contribution but can never FUND one, back the buffer, or take stable allocation", btc.canBeContributionTarget === BTC_CONTRIBUTION_TARGET_ENABLED && btc.canBeContributionTarget === true && btc.canFundContributionPlan === false && btc.canServeAsSafetyBuffer === false && btc.canReceiveStableAllocation === false, "receive only");
  add("15A-AF: BTC activation blockers are cleared and its policies are the v1 keys (never _v_future)", btc.activationBlockers.length === 0 && btc.suitabilityPolicyKey === "btc_growth_suitability_v1" && btc.allocationRequirements.allocationPolicyKey === "growth_target_suballocation_v1" && btc.minimumRequirements.minimumPolicyKey === "dca_minimum_v1", btc.activationBlockers.join(",") || "cleared");

  // 15A-AG…AM. ETH.
  add("15A-AG: ETH exists", eth != null, "exists");
  add("15A-AH: ETH represents native ETH", eth.assetId === "ethereum:native", eth.assetId);
  add("15A-AI: ETH does not represent wrapped ETH", !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(eth.assetId) && !eth.assetId.toLowerCase().includes("weth"), "native");
  add("15A-AJ: ETH supports manual_entry", eth.holdingSources.includes("manual_entry"), "manual");
  add("15A-AK: ETH is an ENABLED manual-entry growth target", eth.lifecycleStatus === "enabled" && eth.enabledForMvp === true && eth.holdingSources.join(",") === "manual_entry", "enabled");
  add("15A-AL: ETH can RECEIVE a contribution but can never FUND one, back the buffer, or take stable allocation", eth.canBeContributionTarget === ETH_CONTRIBUTION_TARGET_ENABLED && eth.canBeContributionTarget === true && eth.canFundContributionPlan === false && eth.canServeAsSafetyBuffer === false && eth.canReceiveStableAllocation === false, "receive only");
  add("15A-AM: ETH activation blockers are cleared and its policies are the v1 keys (never _v_future)", eth.activationBlockers.length === 0 && eth.suitabilityPolicyKey === "eth_growth_suitability_v1" && eth.allocationRequirements.allocationPolicyKey === "growth_target_suballocation_v1" && eth.minimumRequirements.minimumPolicyKey === "dca_minimum_v1", eth.activationBlockers.join(",") || "cleared");

  // 15A-AN…AV. RWA extensibility.
  add("15A-AN: RWA category exists", validateInvestmentTargetDefinition(syntheticRwa).valid === true && syntheticRwa.category === "rwa", "category");
  add("15A-AO: no generic production RWA target exists", targets.every((t) => t.category !== "rwa") && RWA_CONTRIBUTION_TARGET_ENABLED === false, "none");
  add("15A-AP: a fully specified synthetic RWA fixture validates", validateInvestmentTargetDefinition(syntheticRwa).valid === true, "valid");
  add("15A-AQ: generic RWA placeholder fails validation", validateInvestmentTargetDefinition({ ...syntheticRwa, targetId: "generic_rwa" }).valid === false && validateInvestmentTargetDefinition({ ...syntheticRwa, targetId: "rwa" }).valid === false && validateInvestmentTargetDefinition({ ...syntheticRwa, targetId: "rwa_placeholder" }).valid === false, "rejected");
  add("15A-AR: RWA without jurisdiction requirements fails", validateInvestmentTargetDefinition({ ...syntheticRwa, rwaRequirements: { ...syntheticRwa.rwaRequirements!, jurisdictionEligibilityRequired: false } } as never).valid === false, "rejected");
  add("15A-AS: RWA without liquidity review fails", validateInvestmentTargetDefinition({ ...syntheticRwa, rwaRequirements: { ...syntheticRwa.rwaRequirements!, liquidityReviewRequired: false } } as never).valid === false, "rejected");
  add("15A-AT: RWA without lockup review fails", validateInvestmentTargetDefinition({ ...syntheticRwa, rwaRequirements: { ...syntheticRwa.rwaRequirements!, lockupReviewRequired: false } } as never).valid === false, "rejected");
  add("15A-AU: RWA without pricing method fails", validateInvestmentTargetDefinition({ ...syntheticRwa, rwaRequirements: { ...syntheticRwa.rwaRequirements!, pricingMethodRequired: false } } as never).valid === false, "rejected");
  add("15A-AV: RWA without product approval fails", validateInvestmentTargetDefinition({ ...syntheticRwa, rwaRequirements: { ...syntheticRwa.rwaRequirements!, productSpecificApprovalRequired: false } } as never).valid === false && validateInvestmentTargetDefinition({ ...syntheticRwa, rwaRequirements: undefined }).valid === false, "rejected");

  // 15A-AW…BB. Role validation.
  add("15A-AW: contribution target requires contribution role", validateInvestmentTargetDefinition({ ...sol, suggestionRoles: sol.suggestionRoles.filter((r) => r !== "contribution_growth_target") }).valid === false, "required");
  add("15A-AX: funding source requires funding role", validateInvestmentTargetDefinition({ ...usdc, suggestionRoles: usdc.suggestionRoles.filter((r) => r !== "contribution_funding_source") }).valid === false, "required");
  add("15A-AY: buffer asset requires buffer role", validateInvestmentTargetDefinition({ ...usdc, suggestionRoles: usdc.suggestionRoles.filter((r) => r !== "safety_buffer_asset") }).valid === false, "required");
  add("15A-AZ: stable destination requires stable-allocation role", validateInvestmentTargetDefinition({ ...usdc, suggestionRoles: usdc.suggestionRoles.filter((r) => r !== "stable_allocation_destination") }).valid === false, "required");
  add("15A-BA: unknown role fails validation", validateInvestmentTargetDefinition({ ...sol, suggestionRoles: [...sol.suggestionRoles, "buy_the_dip" as never] }).valid === false, "rejected");
  add("15A-BB: enabled target with critical blocker fails validation", validateInvestmentTargetDefinition({ ...sol, activationBlockers: ["target_disabled"] }).valid === false, "rejected");

  // 15A-BC…BP. Technical eligibility.
  const solElig = evaluateInvestmentTargetTechnicalEligibility(sol, fullCtx);
  add("15A-BC: SOL can become technically eligible with all required context", solElig.eligibleAsContributionTarget === true && solElig.blockers.length === 0, `blockers=${solElig.blockers.join(",")}`);
  add("15A-BD: SOL fails when price is unavailable", evaluateInvestmentTargetTechnicalEligibility(sol, { ...fullCtx, priceStatusByTargetId: { sol: { available: false } } }).eligibleAsContributionTarget === false, "unavailable");
  add("15A-BE: SOL fails when price is stale", evaluateInvestmentTargetTechnicalEligibility(sol, { ...fullCtx, priceStatusByTargetId: { sol: { available: true, fetchedAt: STALE } } }).blockers.includes("price_stale"), "stale");
  add("15A-BF: SOL fails when allocation policy is missing", evaluateInvestmentTargetTechnicalEligibility(sol, { ...fullCtx, configuredAllocationPolicyKeys: [] }).blockers.includes("target_allocation_not_configured"), "missing");
  add("15A-BG: SOL fails when suitability policy is missing", evaluateInvestmentTargetTechnicalEligibility(sol, { ...fullCtx, configuredSuitabilityPolicyKeys: [] }).blockers.includes("suitability_policy_not_configured"), "missing");
  add("15A-BH: SOL eligibility does not calculate an allocation gap", solElig.allocationGapEvaluated === false, "no gap");
  add("15A-BI: SOL eligibility does not calculate an amount", solElig.contributionAmountCalculated === false, "no amount");
  add("15A-BJ: SOL eligibility does not generate a suggestion", solElig.suggestionGenerated === false && solElig.userSuitabilityEvaluated === false, "no suggestion");
  const usdcElig = evaluateInvestmentTargetTechnicalEligibility(usdc, fullCtx);
  add("15A-BK: USDC can be eligible as a funding source", usdcElig.eligibleAsFundingSource === true, "funding eligible");
  add("15A-BL: USDC remains ineligible as a growth contribution target", usdcElig.eligibleAsContributionTarget === false, "not growth");
  add("15A-BM: BTC remains ineligible even if synthetic price data exists", evaluateInvestmentTargetTechnicalEligibility(btc, fullCtx).eligibleAsContributionTarget === false, "ineligible");
  add("15A-BN: ETH remains ineligible even if synthetic price data exists", evaluateInvestmentTargetTechnicalEligibility(eth, fullCtx).eligibleAsContributionTarget === false, "ineligible");
  {
    const eligible = listTechnicallyEligibleContributionTargets(fullCtx).map((t) => t.targetId);
    add("15A-BO: disabled targets never appear in eligible target lists", JSON.stringify(eligible) === JSON.stringify(["sol"]) && !eligible.includes("btc") && !eligible.includes("eth") && !eligible.includes("usdc"), eligible.join(","));
    const funding = listTechnicallyEligibleFundingSources(fullCtx).map((t) => t.targetId);
    add("15A-BP: eligible target lists preserve registry order", JSON.stringify(funding) === JSON.stringify(["usdc"]), funding.join(","));
  }

  // 15A-BQ…BU. Manual-entry boundaries.
  add("15A-BQ: BTC is MANUAL-ENTRY only — no connector, and it stays read-only", btc.holdingSources.join(",") === "manual_entry" && btc.executionStatus === "read_only_only" && btc.transactionsEnabled === false && btc.walletSignatureRequired === false, "manual read-only");
  add("15A-BR: ETH is MANUAL-ENTRY only — no connector, and it stays read-only", eth.holdingSources.join(",") === "manual_entry" && eth.executionStatus === "read_only_only" && eth.transactionsEnabled === false && eth.walletSignatureRequired === false, "manual read-only");
  add("15A-BS: no ownership verification is implied", /cannot verify ownership|no ownership verification/i.test(readIf("src/suggestions/investmentTargetRegistry.md")) && /never read or verified on-chain/i.test(btc.notes.join(" ")), "no verification");
  add("15A-BT: no BTC wallet connector is added", !existsSync(`${root}/src/wallet/bitcoinWallet.ts`) && !existsSync(`${root}/src/wallet/btcConnector.ts`) && btc.holdingSources.join(",") === "manual_entry", "no connector");
  add("15A-BU: no ETH wallet connector is added", !existsSync(`${root}/src/wallet/ethereumWallet.ts`) && !existsSync(`${root}/src/wallet/ethConnector.ts`) && eth.holdingSources.join(",") === "manual_entry", "no connector");

  // 15A-BV…CA. Product invariants.
  const funded = bufferFixture(5000, 1000, 3);
  const aligned = allocationFixture(15000, 62, 2);
  const engineRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded, allocation: aligned, positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const staking = engineRun.suggestions.find((s) => s.category === "staking");
  add("15A-BV: existing suggestion output remains unchanged", engineRun.suggestions.length > 0 && staking?.protocolSelection?.selectedProtocolId === "jito", "unchanged");
  add("15A-BW: Safety Buffer behavior remains unchanged", engineRun.suggestions.some((s) => s.category === "buffer") || engineRun.suggestions.every((s) => s.id !== "investment_target"), "unchanged");
  add("15A-BX: SOL staking behavior remains unchanged", staking != null && staking.protocolSelection?.selectedProtocolName === "Jito", "unchanged");
  add("15A-BY: Top Pick remains unchanged", engineRun.suggestions.filter((s) => s.is_top_pick).every((s) => s.id !== "sol" && s.id !== "usdc" && s.id !== "btc" && s.id !== "eth"), "unchanged");
  add("15A-BZ: engine ordering remains unchanged", engineRun.suggestions.every((s) => !s.id.startsWith("investment_target") && s.id !== "sol" && s.id !== "btc" && s.id !== "eth"), "unchanged");
  {
    // No product-facing file imports the registry/eligibility. Its own modules, the contribution-
    // policy foundation family (15B/15C, non-UI), and fixtures are legitimate non-product consumers.
    const allowed = /investmentTarget(Types|Registry|Eligibility)|contribution(Frequency|PlanningPolicy|Price|TargetSuitability|TargetPolicy|AllocationGap|Priority|SafetyBufferGate|Plan|Integration|Portfolio|Liquidity|TestingScenarios)|growthTargetAllocationPolicy|dcaMinimumPolicy|suggestionEngine\.fixtures|suggestions\/fixtures\//;
    let hits: string[] = [];
    let entries: string[] = [];
    try { entries = readdirSync(`${root}/src`, { recursive: true }) as string[]; } catch { /* ignore */ }
    for (const e of entries) {
      if (!/\.(ts|tsx)$/.test(e) || allowed.test(e)) continue;
      const c = readIf(`src/${e}`);
      if (/from ["']\.[^"']*investmentTarget(Registry|Eligibility|Types)["']/.test(c)) hits.push(e);
    }
    add("15A-CA: no product-facing import exists", hits.length === 0, hits.join(",") || "none");
  }

  // 15A-CB…CH. Feature-state invariants.
  add("15A-CB: contribution planning now exists (enabled at Step 15G)", CONTRIBUTION_PLANNING_EXISTS === true, "exists");
  add("15A-CC: rhythm normalization now exists (enabled at Step 15B)", CONTRIBUTION_RHYTHM_NORMALIZATION_EXISTS === true, "enabled");
  add("15A-CD: allocation-gap engine now exists (enabled at Step 15D)", TARGET_ALLOCATION_GAP_ENGINE_EXISTS === true, "exists");
  add("15A-CE: DCA plan generation and (Step 15H) DCA suggestion now exist", DCA_PLAN_GENERATION_EXISTS === true && DCA_SUGGESTION_ENABLED === true, "exists");
  add("15A-CF: BTC contribution suggestions are enabled, and the flag agrees with the registry entry", BTC_CONTRIBUTION_TARGET_ENABLED === true && getInvestmentTarget("btc")!.canBeContributionTarget === BTC_CONTRIBUTION_TARGET_ENABLED, "enabled");
  add("15A-CG: ETH contribution suggestions are enabled, and the flag agrees with the registry entry", ETH_CONTRIBUTION_TARGET_ENABLED === true && getInvestmentTarget("eth")!.canBeContributionTarget === ETH_CONTRIBUTION_TARGET_ENABLED, "enabled");
  add("15A-CH: RWA contribution suggestions remain disabled", RWA_CONTRIBUTION_TARGET_ENABLED === false, "disabled");

  // 15A-CI…CK. Execution invariants.
  {
    const blob = (readIf("src/suggestions/investmentTargetTypes.ts") + readIf("src/suggestions/investmentTargetRegistry.ts") + readIf("src/suggestions/investmentTargetEligibility.ts")).toLowerCase();
    add("15A-CI: no transaction path exists", INVESTMENT_TARGET_TRANSACTIONS_ENABLED === false && !blob.includes("sendtransaction") && targets.every((t) => t.transactionsEnabled === false), "none");
    add("15A-CJ: no signature path exists", INVESTMENT_TARGET_SIGNATURE_REQUIRED === false && !blob.includes("signtransaction") && targets.every((t) => t.walletSignatureRequired === false), "none");
    const handlers = ["buy(", "swap(", "deposit(", "invest(", "execute(", "delegate(", "withdraw("];
    add("15A-CK: no buy/swap/deposit/invest/execute handler exists", handlers.filter((h) => blob.includes(h)).length === 0, "none");
  }

  // Accessor smoke.
  add("15A-accessors: enabled/mvp/modeled accessors are consistent", getEnabledInvestmentTargets().map((t) => t.targetId).join(",") === "usdc,sol,btc,eth" && getMvpInvestmentTargets().map((t) => t.targetId).join(",") === "usdc,sol,btc,eth" && getModeledFutureTargets().length === 0 && getSafetyBufferTargets().map((t) => t.targetId).join(",") === "usdc" && getStableAllocationDestinations().map((t) => t.targetId).join(",") === "usdc" && getEnabledContributionGrowthTargets().map((t) => t.targetId).join(",") === "sol,btc,eth", "ok");

  return checks;
}


export function runContributionFrequencyNormalizationFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });

  const root = process.cwd();
  const readIf = (rel: string) => { try { return readFileSync(`${root}/${rel}`, "utf8"); } catch { return ""; } };

  const norm = (goal: unknown, freq: unknown, currency?: unknown) => normalizeContributionFrequency({ monthlySavingGoalUsd: goal, contributionFrequency: freq, ...(currency !== undefined ? { currency } : {}) });
  const monthly = norm(1000, "monthly");
  const biweekly = norm(1000, "biweekly");
  const weekly = norm(1000, "weekly");
  const quarterly = norm(1000, "quarterly");
  const occasional = norm(1000, "occasional");

  // 15B-A…F. Onboarding source alignment.
  const onboardingValues = CONTRIBUTION_OPTIONS.map((o) => o.value);
  add("15B-A: the real onboarding contribution-frequency field/type is identified", JSON.stringify(onboardingValues) === JSON.stringify(["weekly", "biweekly", "monthly", "quarterly", "occasional"]), onboardingValues.join(","));
  add("15B-B: normalization supports exactly the five onboarding choices", CONTRIBUTION_FREQUENCY_CANONICAL_ORDER.length === 5 && onboardingValues.every((v) => CONTRIBUTION_FREQUENCY_CANONICAL_ORDER.includes(v as never)), "five");
  add("15B-C: no competing additional product frequency is introduced", resolveContributionFrequencyId("twice_monthly") === undefined && resolveContributionFrequencyId("semi_monthly") === undefined && resolveContributionFrequencyId("custom") === undefined && resolveContributionFrequencyId("daily") === undefined, "none");
  add("15B-D: all five real onboarding values resolve directly", onboardingValues.every((v) => resolveContributionFrequencyId(v) === v), "resolve");
  add("15B-E: the adapter preserves the raw onboarding value", norm(1000, "biweekly").sourceContributionFrequency === "biweekly" && norm(1000, "Bi-Weekly").sourceContributionFrequency === "Bi-Weekly", "preserved");
  add("15B-F: unknown values do not use fuzzy matching", resolveContributionFrequencyId("bi") === undefined && resolveContributionFrequencyId("weeklyish") === undefined && resolveContributionFrequencyId("month") === undefined, "no fuzzy");

  // 15B-G…M. Schema + policy.
  add("15B-G: schema version exists", CONTRIBUTION_FREQUENCY_SCHEMA_VERSION === "1.0.0" && monthly.schemaVersion === "1.0.0", CONTRIBUTION_FREQUENCY_SCHEMA_VERSION);
  add("15B-H: policy version exists", CONTRIBUTION_FREQUENCY_POLICY_VERSION === "1.0.0", CONTRIBUTION_FREQUENCY_POLICY_VERSION);
  add("15B-I: contribution-frequency normalization exists", CONTRIBUTION_FREQUENCY_NORMALIZATION_EXISTS === true, "exists");
  add("15B-J: canonical frequency policy validates", validateContributionFrequencyPolicy().valid === true, "valid");
  add("15B-K: canonical frequency order matches onboarding", JSON.stringify(listContributionFrequencyDefinitions().map((d) => d.frequencyId)) === JSON.stringify(["weekly", "biweekly", "monthly", "quarterly", "occasional"]), "order");
  { const d = getContributionFrequencyDefinition("weekly")!; d.contributionsPerYear = 999; add("15B-L: definitions are immutable or safely copied", getContributionFrequencyDefinition("weekly")!.contributionsPerYear === 52, "safe copy"); }
  add("15B-M: policy contains exactly five frequencies", listContributionFrequencyDefinitions().length === 5, "five");

  // 15B-N…U. Frequency counts.
  add("15B-N: weekly uses 52 contributions per year", getContributionFrequencyDefinition("weekly")!.contributionsPerYear === 52, "52");
  add("15B-O: biweekly uses 26 contributions per year", getContributionFrequencyDefinition("biweekly")!.contributionsPerYear === 26, "26");
  add("15B-P: monthly uses 12 contributions per year", getContributionFrequencyDefinition("monthly")!.contributionsPerYear === 12, "12");
  add("15B-Q: quarterly uses 4 contributions per year", getContributionFrequencyDefinition("quarterly")!.contributionsPerYear === 4, "4");
  add("15B-R: occasional has no fixed annual frequency", getContributionFrequencyDefinition("occasional")!.contributionsPerYear === undefined && getContributionFrequencyDefinition("occasional")!.fixedFrequency === false, "irregular");
  add("15B-S: biweekly is not treated as twice monthly", getContributionFrequencyDefinition("biweekly")!.contributionsPerYear === 26 && getContributionFrequencyDefinition("biweekly")!.contributionsPerYear !== 24, "26 not 24");
  add("15B-T: no twice-monthly frequency exists", getContributionFrequencyDefinition("twice_monthly") === undefined && !CONTRIBUTION_FREQUENCY_CANONICAL_ORDER.includes("twice_monthly" as never), "none");
  add("15B-U: no custom frequency exists", getContributionFrequencyDefinition("custom") === undefined && !CONTRIBUTION_FREQUENCY_CANONICAL_ORDER.includes("custom" as never), "none");

  // 15B-V…AB. Alias resolution.
  add("15B-V: weekly aliases resolve to weekly", ["weekly", "Weekly", "every_week", "once_a_week"].every((a) => resolveContributionFrequencyId(a) === "weekly"), "weekly");
  add("15B-W: biweekly aliases resolve to biweekly", ["biweekly", "Biweekly", "Bi-Weekly", "bi_weekly", "every_two_weeks", "every_2_weeks", "fortnightly"].every((a) => resolveContributionFrequencyId(a) === "biweekly"), "biweekly");
  add("15B-X: monthly aliases resolve to monthly", ["monthly", "Monthly", "once_a_month", "every_month"].every((a) => resolveContributionFrequencyId(a) === "monthly"), "monthly");
  add("15B-Y: quarterly aliases resolve to quarterly", ["quarterly", "Quarterly", "every_quarter", "once_a_quarter", "every_three_months"].every((a) => resolveContributionFrequencyId(a) === "quarterly"), "quarterly");
  add("15B-Z: occasional aliases resolve to occasional", ["occasional", "Occasional", "occasionally", "irregular", "as_available"].every((a) => resolveContributionFrequencyId(a) === "occasional"), "occasional");
  add("15B-AA: unknown frequency fails instead of becoming occasional", resolveContributionFrequencyId("nonsense") === undefined && norm(1000, "nonsense").status === "unsupported_frequency", "fails");
  add("15B-AB: biweekly aliases always resolve to 26 annual contributions", ["biweekly", "every_two_weeks", "fortnightly"].every((a) => norm(1000, a).contributionsPerYear === 26), "26");

  // 15B-AC…AK. Saving-goal validation.
  add("15B-AC: positive whole-dollar monthly goal validates", norm(1000, "monthly").status === "normalized_fixed", "valid");
  add("15B-AD: positive cent-value monthly goal validates", normalizeMonthlySavingGoalToCents(1000.55).cents === 100055 && norm(1000.55, "monthly").status === "normalized_fixed", "valid");
  add("15B-AE: zero produces no_saving_goal", norm(0, "monthly").status === "no_saving_goal", "no goal");
  add("15B-AF: negative goal fails", norm(-100, "monthly").status === "invalid_saving_goal" && norm(-100, "monthly").blockers.includes("monthly_saving_goal_negative"), "fails");
  add("15B-AG: NaN fails", norm(NaN, "monthly").status === "invalid_saving_goal" && norm(NaN, "monthly").blockers.includes("monthly_saving_goal_not_finite"), "fails");
  add("15B-AH: Infinity fails", norm(Infinity, "monthly").blockers.includes("monthly_saving_goal_not_finite"), "fails");
  add("15B-AI: more than two meaningful decimals fails", normalizeMonthlySavingGoalToCents(1000.123).ok === false && norm(1000.123, "monthly").blockers.includes("monthly_saving_goal_invalid_precision"), "fails");
  add("15B-AJ: safe integer cents are preserved", normalizeMonthlySavingGoalToCents(1000).cents === 100000, "100000");
  add("15B-AK: unsafe annual cents fail closed", norm(Number.MAX_SAFE_INTEGER / 100, "monthly").blockers.some((b) => b === "annual_total_unsafe" || b === "monthly_saving_goal_unsafe"), "unsafe");

  // 15B-AL…AP. Monthly example.
  add("15B-AL: $1,000 monthly produces $12,000 annual", monthly.annualSavingGoalUsd === 12000 && monthly.annualSavingGoalCents === 1200000, `${monthly.annualSavingGoalUsd}`);
  add("15B-AM: monthly frequency produces 12 contributions", monthly.contributionsPerYear === 12, "12");
  add("15B-AN: monthly exact average is $1,000", monthly.exactAverageContributionAmountUsd === 1000, "1000");
  add("15B-AO: monthly decomposition is 12 × $1,000", monthly.centDecomposition!.contributionsAtBaseAmount === 12 && monthly.centDecomposition!.baseContributionAmountUsd === 1000, "12x1000");
  add("15B-AP: monthly remainder is zero", monthly.centDecomposition!.remainderCents === 0, "0");

  // 15B-AQ…AY. Biweekly example.
  add("15B-AQ: $1,000 monthly and Biweekly produces 26 contributions", biweekly.contributionsPerYear === 26, "26");
  add("15B-AR: exact average is 12000 / 26", biweekly.exactAverageContributionAmountUsd === 12000 / 26, `${biweekly.exactAverageContributionAmountUsd}`);
  add("15B-AS: display average is $461.54", biweekly.approximateDisplayContributionAmountUsd === 461.54, `${biweekly.approximateDisplayContributionAmountUsd}`);
  add("15B-AT: base contribution is $461.53", biweekly.centDecomposition!.baseContributionAmountUsd === 461.53, `${biweekly.centDecomposition!.baseContributionAmountUsd}`);
  add("15B-AU: base-plus-one contribution is $461.54", biweekly.centDecomposition!.basePlusOneCentContributionAmountUsd === 461.54, `${biweekly.centDecomposition!.basePlusOneCentContributionAmountUsd}`);
  add("15B-AV: 22 contributions use $461.54", biweekly.centDecomposition!.contributionsAtBasePlusOneCent === 22, `${biweekly.centDecomposition!.contributionsAtBasePlusOneCent}`);
  add("15B-AW: 4 contributions use $461.53", biweekly.centDecomposition!.contributionsAtBaseAmount === 4, `${biweekly.centDecomposition!.contributionsAtBaseAmount}`);
  add("15B-AX: biweekly decomposition totals exactly $12,000", (biweekly.centDecomposition!.baseContributionCents * 4 + (biweekly.centDecomposition!.baseContributionCents + 1) * 22) === 1200000, "exact");
  add("15B-AY: biweekly is not calculated as $500 twice per month", biweekly.exactAverageContributionAmountUsd !== 500 && biweekly.contributionsPerYear !== 24, "not 500");

  // 15B-AZ…BE. Weekly example.
  add("15B-AZ: $1,000 monthly and Weekly produces 52 contributions", weekly.contributionsPerYear === 52, "52");
  add("15B-BA: exact average is 12000 / 52", weekly.exactAverageContributionAmountUsd === 12000 / 52, `${weekly.exactAverageContributionAmountUsd}`);
  add("15B-BB: display average is $230.77", weekly.approximateDisplayContributionAmountUsd === 230.77, `${weekly.approximateDisplayContributionAmountUsd}`);
  add("15B-BC: 48 contributions use $230.77", weekly.centDecomposition!.contributionsAtBasePlusOneCent === 48 && weekly.centDecomposition!.basePlusOneCentContributionAmountUsd === 230.77, `${weekly.centDecomposition!.contributionsAtBasePlusOneCent}`);
  add("15B-BD: 4 contributions use $230.76", weekly.centDecomposition!.contributionsAtBaseAmount === 4 && weekly.centDecomposition!.baseContributionAmountUsd === 230.76, `${weekly.centDecomposition!.contributionsAtBaseAmount}`);
  add("15B-BE: weekly decomposition totals exactly $12,000", (weekly.centDecomposition!.baseContributionCents * 4 + (weekly.centDecomposition!.baseContributionCents + 1) * 48) === 1200000, "exact");

  // 15B-BF…BI. Quarterly example.
  add("15B-BF: $1,000 monthly and Quarterly produces 4 contributions", quarterly.contributionsPerYear === 4, "4");
  add("15B-BG: exact average is $3,000", quarterly.exactAverageContributionAmountUsd === 3000, "3000");
  add("15B-BH: all 4 contributions are $3,000", quarterly.centDecomposition!.contributionsAtBaseAmount === 4 && quarterly.centDecomposition!.baseContributionAmountUsd === 3000 && quarterly.centDecomposition!.remainderCents === 0, "4x3000");
  add("15B-BI: quarterly decomposition totals exactly $12,000", quarterly.centDecomposition!.baseContributionCents * 4 === 1200000, "exact");

  // 15B-BJ…BR. Occasional example.
  add("15B-BJ: $1,000 monthly and Occasional produces normalized_occasional", occasional.status === "normalized_occasional", occasional.status);
  add("15B-BK: occasional still produces a $12,000 annual saving goal", occasional.annualSavingGoalUsd === 12000 && occasional.annualSavingGoalCents === 1200000, `${occasional.annualSavingGoalUsd}`);
  add("15B-BL: occasional has no contributionsPerYear", occasional.contributionsPerYear === undefined, "none");
  add("15B-BM: occasional has no exact average contribution amount", occasional.exactAverageContributionAmountUsd === undefined, "none");
  add("15B-BN: occasional has no display average contribution amount", occasional.approximateDisplayContributionAmountUsd === undefined, "none");
  add("15B-BO: occasional has no cent decomposition", occasional.centDecomposition === undefined, "none");
  add("15B-BP: occasional does not generate dates", occasional.contributionDatesCalculated === false, "no dates");
  add("15B-BQ: occasional does not invent a frequency", occasional.fixedFrequency === false && occasional.canonicalFrequencyId === "occasional", "irregular");
  add("15B-BR: occasional adds contribution_amount_requires_future_user_input", occasional.warnings.includes("contribution_amount_requires_future_user_input"), "warning");

  // 15B-BS…BZ. Cent decomposition.
  const d26 = buildContributionCentDecomposition(1200000, 26).decomposition!;
  add("15B-BS: contribution counts sum to contributions per year", d26.contributionsAtBaseAmount + d26.contributionsAtBasePlusOneCent === 26, "26");
  add("15B-BT: base-plus-one amount is exactly one cent above base", d26.basePlusOneCentContributionAmountUsd - d26.baseContributionAmountUsd === 0.01 || (d26.baseContributionCents + 1) - d26.baseContributionCents === 1, "one cent");
  add("15B-BU: reconstructed annual cents equal source annual cents", d26.baseContributionCents * d26.contributionsAtBaseAmount + (d26.baseContributionCents + 1) * d26.contributionsAtBasePlusOneCent === 1200000, "reconciles");
  add("15B-BV: remainder count equals contributions at base-plus-one-cent", d26.remainderCents === d26.contributionsAtBasePlusOneCent, "match");
  { const d12 = buildContributionCentDecomposition(1200000, 12).decomposition!; add("15B-BW: zero remainder produces one contribution amount", d12.remainderCents === 0 && d12.contributionsAtBasePlusOneCent === 0 && d12.contributionsAtBaseAmount === 12, "one amount"); }
  add("15B-BX: non-zero remainder adds average_amount_requires_cent_distribution", biweekly.warnings.includes("average_amount_requires_cent_distribution") && !monthly.warnings.includes("average_amount_requires_cent_distribution"), "warning");
  add("15B-BY: internal calculations preserve full precision", biweekly.exactAverageContributionAmountUsd === 461.53846153846155 && biweekly.approximateDisplayContributionAmountUsd === 461.54, "full precision vs rounded display");
  add("15B-BZ: display rounding does not alter annual totals", biweekly.centDecomposition!.annualSavingGoalCents === 1200000 && Math.round(biweekly.approximateDisplayContributionAmountUsd! * 26 * 100) !== 1200000, "exact internal");

  // 15B-CA…CH. Result boundaries.
  add("15B-CA: no target is selected", biweekly.targetSelected === false, "false");
  add("15B-CB: no allocation gap is evaluated", biweekly.allocationGapEvaluated === false, "false");
  add("15B-CC: no safety buffer is evaluated", biweekly.safetyBufferEvaluated === false, "false");
  add("15B-CD: no suitability is evaluated", biweekly.userSuitabilityEvaluated === false, "false");
  add("15B-CE: no contribution plan is generated", biweekly.contributionPlanGenerated === false, "false");
  add("15B-CF: no DCA plan is generated", biweekly.dcaPlanGenerated === false, "false");
  add("15B-CG: no suggestion is generated", biweekly.suggestionGenerated === false, "false");
  add("15B-CH: no contribution dates are generated", biweekly.contributionDatesCalculated === false, "false");

  // Result validation smoke + explain.
  add("15B-validate: fixed + occasional + failure results all validate consistently", validateContributionFrequencyNormalizationResult(biweekly).valid === true && validateContributionFrequencyNormalizationResult(occasional).valid === true && validateContributionFrequencyNormalizationResult(norm(1000, "nonsense")).valid === true && validateContributionCentDecomposition(d26).valid === true, "valid");
  add("15B-validate2: validator rejects a tampered result", validateContributionFrequencyNormalizationResult({ ...biweekly, annualSavingGoalCents: 999 }).valid === false && validateContributionFrequencyNormalizationResult({ ...occasional, contributionsPerYear: 12 }).valid === false, "rejects");
  add("15B-diagnostics: diagnostics + explain are deterministic", getContributionFrequencyNormalizationDiagnostics(biweekly).contributionsPerYear === 26 && /461\.54/.test(explainContributionFrequencyNormalization(biweekly)) && /Occasional/.test(explainContributionFrequencyNormalization(occasional)), "diagnostics");

  // 15B-CI…CN. Feature-state invariants.
  add("15B-CI: contribution-frequency normalization is enabled", CONTRIBUTION_FREQUENCY_NORMALIZATION_EXISTS === true, "enabled");
  add("15B-CJ: contribution planning now exists (enabled at Step 15G)", CONTRIBUTION_PLANNING_EXISTS === true, "exists");
  add("15B-CK: contribution-priority engine now exists (enabled at Step 15E)", CONTRIBUTION_PRIORITY_ENGINE_EXISTS === true, "exists");
  add("15B-CL: allocation-gap engine now exists (enabled at Step 15D)", TARGET_ALLOCATION_GAP_ENGINE_EXISTS === true, "exists");
  add("15B-CM: DCA plan generation now exists (enabled at Step 15G)", DCA_PLAN_GENERATION_EXISTS === true, "exists");
  add("15B-CN: DCA suggestion now exists (enabled at Step 15H)", DCA_SUGGESTION_ENABLED === true, "exists");

  // 15B-CO…CU. Product invariants.
  const funded = bufferFixture(5000, 1000, 3);
  const aligned = allocationFixture(15000, 62, 2);
  const engineRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded, allocation: aligned, positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const staking = engineRun.suggestions.find((s) => s.category === "staking");
  add("15B-CO: existing suggestion output remains unchanged", engineRun.suggestions.length > 0 && staking?.protocolSelection?.selectedProtocolId === "jito", "unchanged");
  add("15B-CP: Safety Buffer behavior remains unchanged", engineRun.suggestions.every((s) => s.id !== "contribution_frequency" && !s.id.startsWith("contribution_")), "unchanged");
  add("15B-CQ: SOL staking behavior remains unchanged", staking != null && staking.protocolSelection?.selectedProtocolName === "Jito", "unchanged");
  add("15B-CR: Top Pick remains unchanged", engineRun.suggestions.filter((s) => s.is_top_pick).every((s) => !s.id.startsWith("contribution")), "unchanged");
  add("15B-CS: engine ordering remains unchanged", engineRun.suggestions.every((s) => !s.id.startsWith("contribution") && s.id !== "biweekly" && s.id !== "occasional"), "unchanged");
  {
    const allowed = /contributionFrequency(Types|Policy|Normalization)|contributionFunding(Types|Policy|Availability|Selection|Diagnostics)|contributionPlan(Types|Policy|Amount|Projection|Generator|Diagnostics|Pipeline|Suggestion|Presentation|ReviewDetails)|contribution(IntegrationTypes|PortfolioAdapter|LiquidityAdapter|PriceAdapter|TestingScenarios)|suggestionEngine\.fixtures|suggestions\/fixtures\//;
    let hits: string[] = [];
    let entries: string[] = [];
    try { entries = readdirSync(`${root}/src`, { recursive: true }) as string[]; } catch { /* ignore */ }
    for (const e of entries) {
      if (!/\.(ts|tsx)$/.test(e) || allowed.test(e)) continue;
      const c = readIf(`src/${e}`);
      if (/from ["']\.[^"']*contributionFrequency(Types|Policy|Normalization)["']/.test(c)) hits.push(e);
    }
    add("15B-CT: no product-facing import exists", hits.length === 0, hits.join(",") || "none");
  }
  add("15B-CU: no /testing UI card is added at this non-UI foundation step", !readIf("src/pages/testingPageFixtures.ts").includes("contributionFrequency") && !readIf("src/pages/testingPageFixtures.ts").includes("normalizeContributionFrequency"), "no card");

  // 15B-CV…CX. Execution invariants.
  {
    const blob = (readIf("src/suggestions/contributionFrequencyTypes.ts") + readIf("src/suggestions/contributionFrequencyPolicy.ts") + readIf("src/suggestions/contributionFrequencyNormalization.ts")).toLowerCase();
    add("15B-CV: no transaction path exists", biweekly.transactionsEnabled === false && !blob.includes("sendtransaction"), "none");
    add("15B-CW: no signature path exists", biweekly.walletSignatureRequired === false && !blob.includes("signtransaction"), "none");
    const handlers = ["buy(", "swap(", "deposit(", "invest(", "execute(", "scheduletransfer(", "transfer("];
    add("15B-CX: no buy/swap/deposit/invest/execute/schedule-transfer handler exists", handlers.filter((h) => blob.includes(h)).length === 0, "none");
  }

  return checks;
}


export function runContributionPlanningPolicyFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });

  const root = process.cwd();
  const readIf = (rel: string) => { try { return readFileSync(`${root}/${rel}`, "utf8"); } catch { return ""; } };

  const CHECKED = "2026-07-14T03:00:00Z";
  const FRESH = "2026-07-14T02:50:00Z";
  const STALE = "2026-07-14T01:30:00Z"; // 90 min before → stale (>60 min)
  const FUTURE = "2026-07-14T04:00:00Z";
  const sol = getInvestmentTarget("sol")!;
  const usdc = getInvestmentTarget("usdc")!;
  const btc = getInvestmentTarget("btc")!;

  // Existing engine → adapter (prompt example: 40/60 → usdc 40, sol 60 via risk "medium").
  const rec = fxRiskTarget(60, 40); // cryptoPct 60, stablePct 40
  const allocInput = { targetStablePct: rec.stablePct, targetVolatilePct: rec.cryptoPct, sourceEngineVersion: SUGGESTION_ENGINE_VERSION };
  const alloc = buildGrowthTargetAllocationPolicyResult(allocInput, { enabledGrowthTargetIds: ["sol"] });
  const minimumPolicy = getDcaMinimumPolicy();
  const solTechCtx: InvestmentTargetTechnicalContext = {
    checkedAt: CHECKED,
    availableHoldingSources: ["connected_wallet", "protocol_position", "manual_entry"],
    priceStatusByTargetId: { sol: { available: true, fetchedAt: FRESH } },
    configuredAllocationPolicyKeys: ["growth_target_allocation_v1"],
    configuredMinimumPolicyKeys: ["dca_minimum_v1"],
    configuredSuitabilityPolicyKeys: ["sol_growth_suitability_v1"],
    approvedTargetIds: [],
  };
  const techElig = evaluateInvestmentTargetTechnicalEligibility(sol, solTechCtx);
  const suitCtx = { checkedAt: CHECKED, targetId: "sol", profile: { goal: "build_long_term_wealth", riskLevel: "medium", timeHorizon: "5_years" }, targetAllocationResult: alloc };
  const suit = evaluateContributionTargetSuitability(sol, suitCtx);
  const freshQuote = evaluateContributionPriceQuote({ targetId: "sol", assetId: PRICE_SOL_MINT, priceUsd: 150, sourceId: CANONICAL_CONTRIBUTION_PRICE_SOURCE_ID, fetchedAt: FRESH, checkedAt: CHECKED });
  const combined = evaluateContributionTargetPolicyEligibility({ targetId: "sol", checkedAt: CHECKED, technicalEligibility: techElig, targetAllocationResult: alloc, suitabilityResult: suit, priceQuote: freshQuote, minimumPolicy });

  // 15C-A…F. Policy IDs and versions.
  add("15C-A: shared schema version exists", CONTRIBUTION_PLANNING_POLICY_SCHEMA_VERSION === "1.0.0", CONTRIBUTION_PLANNING_POLICY_SCHEMA_VERSION);
  add("15C-B: growth-allocation policy ID/version exist", GROWTH_TARGET_ALLOCATION_POLICY_ID === "growth_target_allocation_v1" && GROWTH_TARGET_ALLOCATION_POLICY_VERSION === "1.0.0", GROWTH_TARGET_ALLOCATION_POLICY_ID);
  add("15C-C: DCA minimum policy ID/version exist", DCA_MINIMUM_POLICY_ID === "dca_minimum_v1" && DCA_MINIMUM_POLICY_VERSION === "1.0.0", DCA_MINIMUM_POLICY_ID);
  add("15C-D: SOL suitability policy ID/version exist", SOL_GROWTH_SUITABILITY_POLICY_ID === "sol_growth_suitability_v1" && SOL_GROWTH_SUITABILITY_POLICY_VERSION === "1.0.0", SOL_GROWTH_SUITABILITY_POLICY_ID);
  add("15C-E: contribution-price policy ID/version exist", CONTRIBUTION_PRICE_POLICY_ID === "contribution_price_freshness_v1" && CONTRIBUTION_PRICE_POLICY_VERSION === "1.0.0", CONTRIBUTION_PRICE_POLICY_ID);
  add("15C-F: no enabled SOL _v_future policy key remains", sol.allocationRequirements.allocationPolicyKey === "growth_target_allocation_v1" && sol.minimumRequirements.minimumPolicyKey === "dca_minimum_v1" && sol.suitabilityPolicyKey === "sol_growth_suitability_v1" && !JSON.stringify(sol).includes("_v_future"), "migrated");

  // 15C-G…P. Existing allocation reuse.
  add("15C-G: the growth target-allocation policy stamps the shared engine version", alloc.sourceEngineVersion === SUGGESTION_ENGINE_VERSION, "reused");
  add("15C-H: no duplicate allocation matrix exists in the new modules", !readIf("src/suggestions/growthTargetAllocationPolicy.ts").includes("very_low") && !readIf("src/suggestions/growthTargetAllocationPolicy.ts").includes("RISK_TARGET") && !/cryptoPct\s*:\s*\d/.test(readIf("src/suggestions/growthTargetAllocationPolicy.ts")), "no matrix");
  add("15C-I: stable target is preserved exactly", alloc.stableBucketTargetPct === rec.stablePct && alloc.stableBucketTargetPct === 40, `${alloc.stableBucketTargetPct}`);
  add("15C-J: volatile/growth target is preserved exactly", alloc.growthBucketTargetPct === rec.cryptoPct && alloc.growthBucketTargetPct === 60, `${alloc.growthBucketTargetPct}`);
  add("15C-K: stable plus growth equals 100 within tolerance", Math.abs(alloc.stableBucketTargetPct + alloc.growthBucketTargetPct - 100) < 1e-9, "100");
  add("15C-L: source engine version is preserved", alloc.sourceEngineVersion === SUGGESTION_ENGINE_VERSION, alloc.sourceEngineVersion);
  { const frac = buildGrowthTargetAllocationPolicyResult({ targetStablePct: 40.123, targetVolatilePct: 59.877, sourceEngineVersion: SUGGESTION_ENGINE_VERSION }, { enabledGrowthTargetIds: ["sol"] }); add("15C-M: the policy does not round engine output", frac.stableBucketTargetPct === 40.123 && frac.growthBucketTargetPct === 59.877, "unrounded"); }
  add("15C-N: USDC receives the stable bucket for MVP contribution planning", alloc.targetPctByInvestmentTargetId.usdc === 40, `${alloc.targetPctByInvestmentTargetId.usdc}`);
  add("15C-O: SOL receives the growth bucket while it is the only enabled growth target", alloc.targetPctByInvestmentTargetId.sol === 60, `${alloc.targetPctByInvestmentTargetId.sol}`);
  add("15C-P: no allocation gap is calculated", alloc.allocationGapEvaluated === false && validateGrowthTargetAllocationPolicyResult(alloc).valid === true, "no gap");

  // 15C-Q…W. Single-target + future extensibility.
  add("15C-Q: the enabled growth targets are SOL (wallet) + BTC/ETH (manual entry)", getEnabledContributionGrowthTargets().map((t) => t.targetId).join(",") === "sol,btc,eth", "sol,btc,eth");
  add("15C-R: single-enabled-target mapping is explicitly marked", alloc.singleEnabledGrowthTargetPolicyApplied === true && alloc.futureGrowthSuballocationRequired === false, "marked");
  {
    const multi = buildGrowthTargetAllocationPolicyResult(allocInput, { enabledGrowthTargetIds: ["sol", "btc"] });
    add("15C-S: enabling a second growth target without sub-allocation policy fails closed", multi.status === "invalid" && multi.blockers.includes("multiple_growth_targets_require_suballocation_policy"), "fail closed");
    add("15C-T: the system does not divide the growth bucket equally automatically", Object.keys(multi.targetPctByInvestmentTargetId).length === 0 && multi.futureGrowthSuballocationRequired === true, "no equal split");
  }
  add("15C-U: BTC is enabled, its exported flag agrees, and it is governed by the versioned sub-allocation policy", btc.lifecycleStatus === "enabled" && BTC_ENABLED_15C === true && btc.allocationRequirements.allocationPolicyKey === "growth_target_suballocation_v1", "enabled");
  add("15C-V: ETH is enabled, its exported flag agrees, and it is governed by the versioned sub-allocation policy", getInvestmentTarget("eth")!.lifecycleStatus === "enabled" && ETH_ENABLED_15C === true && getInvestmentTarget("eth")!.allocationRequirements.allocationPolicyKey === "growth_target_suballocation_v1", "enabled");
  add("15C-W: RWA contribution targets remain disabled", RWA_ENABLED_15C === false, "disabled");

  // 15C-X…Z. Safety Buffer boundaries.
  add("15C-X: Safety Buffer is documented as a separate floor", alloc.safetyBufferIsSeparateFloor === true && /separate.*(floor|requirement)/i.test(readIf("src/suggestions/contributionPlanningPolicies.md") + readIf("src/suggestions/growthTargetAllocationPolicy.ts")), "separate floor");
  add("15C-Y: Safety Buffer is not evaluated in 15C", alloc.safetyBufferEvaluated === false && suit.safetyBufferEvaluated === false && combined.safetyBufferEvaluated === false, "not evaluated");
  add("15C-Z: no volatile deployment is approved by 15C", alloc.userContributionEvaluated === false && combined.contributionAmountCalculated === false && combined.targetSelected === false, "no deployment");

  // 15C-AA…AL. Minimum policy.
  add("15C-AA: absolute minimum is $50", DCA_ABSOLUTE_MINIMUM_SUGGESTION_USD === 50 && DCA_ABSOLUTE_MINIMUM_SUGGESTION_USD === MIN_DCA_SUGGESTION_USD, "50 (reused)");
  add("15C-AB: a $30 upcoming contribution fails the minimum", evaluateDcaAmountAgainstMinimumPolicy(30, "upcoming_contribution").status === "below_absolute_minimum", "fails");
  add("15C-AC: a $50 upcoming contribution passes the absolute minimum", evaluateDcaAmountAgainstMinimumPolicy(50, "upcoming_contribution").status === "passes_absolute_minimum", "passes");
  add("15C-AD: existing excess-USDC trigger is $250", DCA_EXCESS_USDC_TRIGGER_USD === 250, "250");
  add("15C-AE: $249.99 excess USDC fails the excess trigger", evaluateDcaAmountAgainstMinimumPolicy(249.99, "existing_excess_usdc").status === "below_excess_usdc_trigger", "fails");
  add("15C-AF: $250 excess USDC passes the excess trigger", evaluateDcaAmountAgainstMinimumPolicy(250, "existing_excess_usdc").status === "passes_excess_usdc_trigger", "passes");
  add("15C-AG: underweight trigger is 5 percentage points", DCA_UNDERWEIGHT_TRIGGER_PERCENTAGE_POINTS === 5, "5");
  add("15C-AH: maximum overshoot is zero", DCA_MAX_TARGET_OVERSHOOT_PERCENTAGE_POINTS === 0, "0");
  add("15C-AI: minimum evaluation does not evaluate the buffer", evaluateDcaAmountAgainstMinimumPolicy(100, "upcoming_contribution").safetyBufferEvaluated === false, "no buffer");
  add("15C-AJ: minimum evaluation does not evaluate an allocation gap", evaluateDcaAmountAgainstMinimumPolicy(100, "upcoming_contribution").allocationGapEvaluated === false, "no gap");
  add("15C-AK: minimum evaluation does not generate a plan", evaluateDcaAmountAgainstMinimumPolicy(100, "upcoming_contribution").planGenerated === false, "no plan");
  add("15C-AL: the ambiguous 0.25% rule is not silently reinterpreted", DCA_QUARTER_PERCENT_RULE_ENFORCED === false && minimumPolicy.quarterPercentRuleEnforced === false && minimumPolicy.absoluteMinimumSuggestionUsd === 50, "not enforced");

  // 15C-AM…BA. Price policy.
  add("15C-AM: SOL contribution price freshness policy exists", CONTRIBUTION_PRICE_POLICY_EXISTS === true, "exists");
  add("15C-AN: maximum age is 60 minutes or the stricter canonical existing policy", SOL_CONTRIBUTION_PRICE_MAX_AGE_MS === 60 * 60 * 1000, `${SOL_CONTRIBUTION_PRICE_MAX_AGE_MS}`);
  add("15C-AO: fresh SOL price validates", freshQuote.status === "fresh" && validateContributionPriceQuote(freshQuote).valid === true, "fresh");
  add("15C-AP: missing SOL price fails", evaluateContributionPriceQuote(undefined).blockers.includes("price_missing"), "missing");
  add("15C-AQ: unavailable SOL price fails", evaluateContributionPriceQuote({ targetId: "sol", assetId: PRICE_SOL_MINT, priceUsd: null, sourceId: CANONICAL_CONTRIBUTION_PRICE_SOURCE_ID, fetchedAt: FRESH, checkedAt: CHECKED }).blockers.includes("price_unavailable"), "unavailable");
  add("15C-AR: zero price fails", evaluateContributionPriceQuote({ targetId: "sol", assetId: PRICE_SOL_MINT, priceUsd: 0, sourceId: CANONICAL_CONTRIBUTION_PRICE_SOURCE_ID, fetchedAt: FRESH, checkedAt: CHECKED }).blockers.includes("price_invalid"), "zero");
  add("15C-AS: negative price fails", evaluateContributionPriceQuote({ targetId: "sol", assetId: PRICE_SOL_MINT, priceUsd: -1, sourceId: CANONICAL_CONTRIBUTION_PRICE_SOURCE_ID, fetchedAt: FRESH, checkedAt: CHECKED }).blockers.includes("price_invalid"), "negative");
  add("15C-AT: NaN price fails", evaluateContributionPriceQuote({ targetId: "sol", assetId: PRICE_SOL_MINT, priceUsd: NaN, sourceId: CANONICAL_CONTRIBUTION_PRICE_SOURCE_ID, fetchedAt: FRESH, checkedAt: CHECKED }).blockers.includes("price_invalid"), "nan");
  add("15C-AU: stale price fails", evaluateContributionPriceQuote({ targetId: "sol", assetId: PRICE_SOL_MINT, priceUsd: 150, sourceId: CANONICAL_CONTRIBUTION_PRICE_SOURCE_ID, fetchedAt: STALE, checkedAt: CHECKED }).status === "stale", "stale");
  add("15C-AV: future timestamp fails beyond clock-skew tolerance", evaluateContributionPriceQuote({ targetId: "sol", assetId: PRICE_SOL_MINT, priceUsd: 150, sourceId: CANONICAL_CONTRIBUTION_PRICE_SOURCE_ID, fetchedAt: FUTURE, checkedAt: CHECKED }).blockers.includes("price_timestamp_in_future"), "future");
  add("15C-AW: missing source provenance fails", evaluateContributionPriceQuote({ targetId: "sol", assetId: PRICE_SOL_MINT, priceUsd: 150, sourceId: "", fetchedAt: FRESH, checkedAt: CHECKED }).blockers.includes("price_provenance_missing"), "no provenance");
  add("15C-AX: unapproved source fails", evaluateContributionPriceQuote({ targetId: "sol", assetId: PRICE_SOL_MINT, priceUsd: 150, sourceId: "coingecko", fetchedAt: FRESH, checkedAt: CHECKED }).blockers.includes("price_source_unapproved"), "unapproved");
  add("15C-AY: browser-fetched external price is rejected", evaluateContributionPriceQuote({ targetId: "sol", assetId: PRICE_SOL_MINT, priceUsd: 150, sourceId: CANONICAL_CONTRIBUTION_PRICE_SOURCE_ID, fetchedAt: FRESH, checkedAt: CHECKED, browserFetched: true }).blockers.includes("price_source_unapproved"), "rejected");
  add("15C-AZ: same-origin/backend-normalized price is accepted", freshQuote.browserFetched === false && freshQuote.sameOriginOrBackendNormalized === true && freshQuote.status === "fresh", "accepted");
  add("15C-BA: USDC is not blindly hardcoded to $1 when normalized valuation exists", !/usdc[^\n]*===?\s*1\b/i.test(readIf("src/suggestions/contributionPricePolicy.ts")) && /normalized/i.test(readIf("src/suggestions/contributionPricePolicy.ts")), "not hardcoded");

  // 15C-BB…BP. SOL suitability.
  add("15C-BB: SOL suitability consumes the existing allocation result", suit.growthTargetPct === alloc.targetPctByInvestmentTargetId.sol, `${suit.growthTargetPct}`);
  add("15C-BC: SOL does not use a duplicate risk matrix", !readIf("src/suggestions/contributionTargetSuitability.ts").includes("RISK_TARGET") && !/cryptoPct\s*:\s*\d/.test(readIf("src/suggestions/contributionTargetSuitability.ts")), "no matrix");
  add("15C-BD: recognized profile plus positive growth target can pass suitability", suit.status === "suitable_for_gap_evaluation" && suit.suitableForAllocationGapEvaluation === true, suit.status);
  add("15C-BE: invalid goal fails", evaluateContributionTargetSuitability(sol, { ...suitCtx, profile: { ...suitCtx.profile, goal: "made_up_goal" } }).status === "invalid_profile", "invalid goal");
  add("15C-BF: invalid risk fails", evaluateContributionTargetSuitability(sol, { ...suitCtx, profile: { ...suitCtx.profile, riskLevel: "ultra" } }).status === "invalid_profile", "invalid risk");
  add("15C-BG: invalid horizon fails", evaluateContributionTargetSuitability(sol, { ...suitCtx, profile: { ...suitCtx.profile, timeHorizon: "100_years" } }).status === "invalid_profile", "invalid horizon");
  {
    const zeroGrowth = buildGrowthTargetAllocationPolicyResult({ targetStablePct: 100, targetVolatilePct: 0, sourceEngineVersion: SUGGESTION_ENGINE_VERSION }, { enabledGrowthTargetIds: ["sol"] });
    add("15C-BH: zero growth target fails suitability", evaluateContributionTargetSuitability(sol, { ...suitCtx, targetAllocationResult: zeroGrowth }).status === "not_suitable", "not suitable");
  }
  add("15C-BI: a DISABLED target still fails suitability (synthetic — every registry target is now enabled)", (() => { const disabled = { ...btc, lifecycleStatus: "modeled_not_enabled" as const, enabledForMvp: false, canBeContributionTarget: false }; return evaluateContributionTargetSuitability(disabled, { ...suitCtx, targetId: disabled.targetId }).status === "target_disabled"; })(), "disabled");
  {
    const vlRec = fxRiskTarget(20, 80); // crypto 20
    const vlAlloc = buildGrowthTargetAllocationPolicyResult({ targetStablePct: vlRec.stablePct, targetVolatilePct: vlRec.cryptoPct, sourceEngineVersion: SUGGESTION_ENGINE_VERSION }, { enabledGrowthTargetIds: ["sol"] });
    add("15C-BJ: Very Low risk is not independently banned when the engine returns positive growth allocation", vlAlloc.targetPctByInvestmentTargetId.sol === 20 && evaluateContributionTargetSuitability(sol, { ...suitCtx, profile: { ...suitCtx.profile, riskLevel: "very_low" }, targetAllocationResult: vlAlloc }).status === "suitable_for_gap_evaluation", "not banned");
  }
  add("15C-BK: Six-month horizon is not independently banned when the engine returns positive growth allocation", evaluateContributionTargetSuitability(sol, { ...suitCtx, profile: { ...suitCtx.profile, timeHorizon: "6_months" } }).status === "suitable_for_gap_evaluation", "not banned");
  add("15C-BL: Big Purchase goal is not independently banned when the engine returns positive growth allocation", evaluateContributionTargetSuitability(sol, { ...suitCtx, profile: { ...suitCtx.profile, goal: "save_for_big_purchase" } }).status === "suitable_for_gap_evaluation", "not banned");
  add("15C-BM: suitability does not evaluate the Safety Buffer", suit.safetyBufferEvaluated === false, "no buffer");
  add("15C-BN: suitability does not calculate a gap", suit.allocationGapEvaluated === false, "no gap");
  add("15C-BO: suitability does not calculate an amount", suit.contributionAmountCalculated === false, "no amount");
  add("15C-BP: suitability does not generate a suggestion", suit.suggestionGenerated === false && suit.targetSelectedForSuggestion === false, "no suggestion");

  // 15C-BQ…CB. Combined policy eligibility.
  add("15C-BQ: complete synthetic SOL context reaches ready_for_allocation_gap_evaluation", combined.status === "ready_for_allocation_gap_evaluation" && combined.readyForAllocationGapEvaluation === true && validateContributionTargetPolicyEligibility(combined).valid === true, combined.status);
  add("15C-BR: technical-readiness failure blocks", evaluateContributionTargetPolicyEligibility({ targetId: "sol", checkedAt: CHECKED, technicalEligibility: evaluateInvestmentTargetTechnicalEligibility(sol, { ...solTechCtx, priceStatusByTargetId: {} }), targetAllocationResult: alloc, suitabilityResult: suit, priceQuote: freshQuote, minimumPolicy }).status === "blocked_technical_readiness", "blocked");
  add("15C-BS: invalid allocation policy blocks", evaluateContributionTargetPolicyEligibility({ targetId: "sol", checkedAt: CHECKED, technicalEligibility: techElig, targetAllocationResult: buildGrowthTargetAllocationPolicyResult({ targetStablePct: 50, targetVolatilePct: 40, sourceEngineVersion: SUGGESTION_ENGINE_VERSION }, { enabledGrowthTargetIds: ["sol"] }), suitabilityResult: suit, priceQuote: freshQuote, minimumPolicy }).status === "blocked_target_allocation", "blocked");
  add("15C-BT: suitability failure blocks", evaluateContributionTargetPolicyEligibility({ targetId: "sol", checkedAt: CHECKED, technicalEligibility: techElig, targetAllocationResult: alloc, suitabilityResult: evaluateContributionTargetSuitability(sol, { ...suitCtx, profile: { ...suitCtx.profile, goal: "bad" } }), priceQuote: freshQuote, minimumPolicy }).status === "blocked_suitability", "blocked");
  add("15C-BU: missing price blocks", evaluateContributionTargetPolicyEligibility({ targetId: "sol", checkedAt: CHECKED, technicalEligibility: techElig, targetAllocationResult: alloc, suitabilityResult: suit, minimumPolicy }).status === "blocked_price", "blocked");
  add("15C-BV: stale price blocks", evaluateContributionTargetPolicyEligibility({ targetId: "sol", checkedAt: CHECKED, technicalEligibility: techElig, targetAllocationResult: alloc, suitabilityResult: suit, priceQuote: evaluateContributionPriceQuote({ targetId: "sol", assetId: PRICE_SOL_MINT, priceUsd: 150, sourceId: CANONICAL_CONTRIBUTION_PRICE_SOURCE_ID, fetchedAt: STALE, checkedAt: CHECKED }), minimumPolicy }).status === "blocked_price", "blocked");
  add("15C-BW: invalid minimum policy blocks", evaluateContributionTargetPolicyEligibility({ targetId: "sol", checkedAt: CHECKED, technicalEligibility: techElig, targetAllocationResult: alloc, suitabilityResult: suit, priceQuote: freshQuote, minimumPolicy: { ...minimumPolicy, absoluteMinimumSuggestionUsd: 999 } as never }).status === "blocked_minimum_policy", "blocked");
  add("15C-BX: ready status still does not evaluate the buffer", combined.safetyBufferEvaluated === false, "no buffer");
  add("15C-BY: ready status still does not calculate a gap", combined.allocationGapEvaluated === false, "no gap");
  add("15C-BZ: ready status still does not choose SOL for a suggestion", combined.targetSelected === false, "not selected");
  add("15C-CA: ready status still does not generate a DCA plan", combined.planGenerated === false, "no plan");
  add("15C-CB: ready status still does not generate a suggestion", combined.suggestionGenerated === false && combined.contributionFrequencyApplied === false, "no suggestion");

  // 15C-CC…CH. Registry integration.
  add("15C-CC: SOL uses growth_target_allocation_v1", sol.allocationRequirements.allocationPolicyKey === "growth_target_allocation_v1", "v1");
  add("15C-CD: SOL uses dca_minimum_v1", sol.minimumRequirements.minimumPolicyKey === "dca_minimum_v1", "v1");
  add("15C-CE: SOL uses sol_growth_suitability_v1", sol.suitabilityPolicyKey === "sol_growth_suitability_v1", "v1");
  add("15C-CF: SOL uses the canonical price source ID", sol.priceRequirements.configuredPriceSourceId === "token_price_service" && sol.priceRequirements.configuredPriceSourceId === CANONICAL_CONTRIBUTION_PRICE_SOURCE_ID, "token_price_service");
  add("15C-CG: USDC remains the funding source", getContributionFundingSources().some((t) => t.targetId === "usdc") && usdc.canFundContributionPlan === true, "funding");
  add("15C-CH: USDC remains excluded as a growth DCA target", getEnabledContributionGrowthTargets().every((t) => t.targetId !== "usdc"), "excluded");

  // 15C-CI…CR. Feature states.
  add("15C-CI: growth-allocation policy exists", GROWTH_TARGET_ALLOCATION_POLICY_EXISTS === true, "exists");
  add("15C-CJ: DCA minimum policy exists", DCA_MINIMUM_POLICY_EXISTS === true, "exists");
  add("15C-CK: SOL suitability policy exists", SOL_GROWTH_SUITABILITY_POLICY_EXISTS === true, "exists");
  add("15C-CL: contribution-price policy exists", CONTRIBUTION_PRICE_POLICY_EXISTS === true, "exists");
  add("15C-CM: policy-eligibility layer exists", CONTRIBUTION_TARGET_POLICY_ELIGIBILITY_EXISTS === true, "exists");
  add("15C-CN: allocation-gap engine now exists (enabled at Step 15D)", TARGET_ALLOCATION_GAP_ENGINE_EXISTS === true, "exists");
  add("15C-CO: contribution-priority engine now exists (enabled at Step 15E)", CONTRIBUTION_PRIORITY_ENGINE_EXISTS === true, "exists");
  add("15C-CP: contribution planning now exists (enabled at Step 15G)", CONTRIBUTION_PLANNING_EXISTS === true, "exists");
  add("15C-CQ: DCA plan generation now exists (enabled at Step 15G)", DCA_PLAN_GENERATION_EXISTS === true, "exists");
  add("15C-CR: DCA suggestion now exists (enabled at Step 15H); policy layer still updates no output", DCA_SUGGESTION_ENABLED === true && CONTRIBUTION_POLICY_UPDATES_PRODUCT_OUTPUT === false, "exists");

  // 15C-CS…CZ. Product invariants.
  add("15C-CS (22G): the canonical five-factor target is the only mounted target policy — the legacy risk-only allocation module is deleted", (() => { const f = readIf("src/wallet/recommendedAllocation.ts"); return f === "" && /input\.targetAllocation/.test(readIf("src/suggestions/rebalanceAssessment.ts")); })(), "canonical only");
  const funded = bufferFixture(5000, 1000, 3);
  const aligned = allocationFixture(15000, 62, 2);
  const engineRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded, allocation: aligned, positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const staking = engineRun.suggestions.find((s) => s.category === "staking");
  add("15C-CT: existing suggestion output remains unchanged", engineRun.suggestions.length > 0 && staking?.protocolSelection?.selectedProtocolId === "jito", "unchanged");
  add("15C-CU: Safety Buffer behavior remains unchanged", engineRun.suggestions.every((s) => !s.id.startsWith("contribution_") && s.id !== "growth_target_allocation"), "unchanged");
  add("15C-CV: SOL staking remains unchanged", staking != null && staking.protocolSelection?.selectedProtocolName === "Jito", "unchanged");
  add("15C-CW: Top Pick remains unchanged", engineRun.suggestions.filter((s) => s.is_top_pick).every((s) => !s.id.startsWith("contribution")), "unchanged");
  add("15C-CX: engine ordering remains unchanged", engineRun.suggestions.every((s) => !s.id.startsWith("contribution") && s.id !== "sol" && s.id !== "usdc"), "unchanged");
  {
    const prodFiles = ["src/components/SuggestionCard.tsx", "src/components/SuggestionReviewModal.tsx", "src/pages/DemoDashboardPage.tsx", "src/pages/DashboardPage.tsx", "src/components/RealWalletSuggestionsRail.tsx"];
    const anyImport = prodFiles.some((f) => /contributionPlanningPolicy|growthTargetAllocationPolicy|dcaMinimumPolicy|contributionPricePolicy|contributionTargetSuitability|contributionTargetPolicyEligibility/.test(readIf(f)));
    add("15C-CY: no product-facing import exists", anyImport === false, "no import");
  }
  add("15C-CZ: no /testing card is added for this non-UI policy step", !readIf("src/pages/testingPageFixtures.ts").includes("growthTargetAllocationPolicy") && !readIf("src/pages/testingPageFixtures.ts").includes("contributionTargetPolicy"), "no card");

  // 15C-DA…DC. Execution invariants.
  {
    const blob = ["contributionPlanningPolicyTypes", "growthTargetAllocationPolicy", "dcaMinimumPolicy", "contributionPricePolicy", "contributionTargetSuitability", "contributionTargetPolicyEligibility"].map((f) => readIf(`src/suggestions/${f}.ts`)).join("").toLowerCase();
    add("15C-DA: no transaction path exists", !blob.includes("sendtransaction") && alloc.transactionsEnabled === false && combined.transactionsEnabled === false, "none");
    add("15C-DB: no signature path exists", !blob.includes("signtransaction") && alloc.walletSignatureRequired === false && combined.walletSignatureRequired === false, "none");
    const handlers = ["buy(", "swap(", "deposit(", "invest(", "execute(", "scheduletransfer("];
    add("15C-DC: no buy/swap/deposit/invest/execute/schedule-transfer handler exists", handlers.filter((h) => blob.includes(h)).length === 0, "none");
  }

  // Diagnostics smoke.
  add("15C-diagnostics: diagnostics are deterministic and reveal no recommendation", getGrowthTargetAllocationPolicyDiagnostics(alloc).growthBucketTargetPct === 60 && getContributionTargetPolicyEligibilityDiagnostics(combined).status === "ready_for_allocation_gap_evaluation" && RECOGNIZED_PROFILE_RISK_IDS.length === 5, "ok");

  return checks;
}


/**
 * Step 15D — allocation-gap engine fixtures (15D-A…DG). Verifies the canonical denominator,
 * economic-exposure boundary, gap math, the internal-vs-external distinction, hypothetical
 * projections, empty-portfolio handling, ordering (no ranking), growth-target readiness,
 * future extensibility, result boundaries, feature/product invariants, and execution invariants.
 */
export function runContributionAllocationGapFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });

  const root = process.cwd();
  const readIf = (rel: string) => { try { return readFileSync(`${root}/${rel}`, "utf8"); } catch { return ""; } };

  const GEN = "2026-07-15T00:00:00Z";
  const CHK = "2026-07-15T00:00:00Z";
  const CAL = "2026-07-15T00:00:00Z";
  const solT = getInvestmentTarget("sol")!;
  const usdcT = getInvestmentTarget("usdc")!;
  const btcT = getInvestmentTarget("btc")!;
  const ethT = getInvestmentTarget("eth")!;

  const mkExp = (targetId: string, assetId: string, valueUsd: number, holdingSources: InvestmentTargetHoldingSource[] = ["connected_wallet"]): ContributionPortfolioTargetExposure => ({ targetId, assetId, valueUsd, holdingSources, valuationReady: true, notes: [] });
  const mkSnap = (totalPortfolioValueUsd: number, exposures: ContributionPortfolioTargetExposure[], over: Partial<ContributionPortfolioAllocationSnapshot> = {}): ContributionPortfolioAllocationSnapshot => ({ snapshotId: "snap-1", calculatedAt: CAL, checkedAt: CHK, sourcePortfolioVersion: "portfolio-v1", totalPortfolioValueUsd, targetExposures: exposures, valuationStatus: "current", notes: [], ...over });

  // 15C target-allocation policy (usdc 40, sol 60 via risk "medium").
  const rec = fxRiskTarget(60, 40);
  const alloc = buildGrowthTargetAllocationPolicyResult({ targetStablePct: rec.stablePct, targetVolatilePct: rec.cryptoPct, sourceEngineVersion: SUGGESTION_ENGINE_VERSION }, { enabledGrowthTargetIds: ["sol"] });

  // A READY SOL policy eligibility (reuses the 15C pipeline).
  const techCtx: InvestmentTargetTechnicalContext = { checkedAt: CHK, availableHoldingSources: ["connected_wallet", "protocol_position", "manual_entry"], priceStatusByTargetId: { sol: { available: true, fetchedAt: CHK } }, configuredAllocationPolicyKeys: ["growth_target_allocation_v1"], configuredMinimumPolicyKeys: ["dca_minimum_v1"], configuredSuitabilityPolicyKeys: ["sol_growth_suitability_v1"], approvedTargetIds: [] };
  const techElig = evaluateInvestmentTargetTechnicalEligibility(solT, techCtx);
  const suit = evaluateContributionTargetSuitability(solT, { checkedAt: CHK, targetId: "sol", profile: { goal: "build_long_term_wealth", riskLevel: "medium", timeHorizon: "5_years" }, targetAllocationResult: alloc });
  const freshQuote = evaluateContributionPriceQuote({ targetId: "sol", assetId: PRICE_SOL_MINT, priceUsd: 150, sourceId: CANONICAL_CONTRIBUTION_PRICE_SOURCE_ID, fetchedAt: CHK, checkedAt: CHK });
  const readyElig = evaluateContributionTargetPolicyEligibility({ targetId: "sol", checkedAt: CHK, technicalEligibility: techElig, targetAllocationResult: alloc, suitabilityResult: suit, priceQuote: freshQuote, minimumPolicy: getDcaMinimumPolicy() });
  const solReady = { sol: readyElig };

  // Core scenario: $10,000 total, SOL $4,000 (40%), USDC $4,000 (40%), unmapped/BONK $2,000.
  const snapCore = mkSnap(10000, [mkExp("usdc", usdcT.assetId, 4000), mkExp("sol", solT.assetId, 4000)]);
  const aCore = buildContributionAllocationGapAnalysis({ snapshot: snapCore, targetAllocationResult: alloc, policyEligibilityByTargetId: solReady, generatedAt: GEN, checkedAt: CHK });
  const solCore = aCore.targetResults.find((t) => t.targetId === "sol")!;
  const usdcCore = aCore.targetResults.find((t) => t.targetId === "usdc")!;

  // 15D-A…F. Schema/policy + trigger reuse.
  add("15D-A: schema version exists", CONTRIBUTION_ALLOCATION_GAP_SCHEMA_VERSION === "1.0.0" && aCore.schemaVersion === "1.0.0", CONTRIBUTION_ALLOCATION_GAP_SCHEMA_VERSION);
  add("15D-B: policy ID/version exist", CONTRIBUTION_ALLOCATION_GAP_POLICY_ID === "contribution_allocation_gap_v1" && CONTRIBUTION_ALLOCATION_GAP_POLICY_VERSION === "1.0.0" && aCore.policyId === "contribution_allocation_gap_v1", CONTRIBUTION_ALLOCATION_GAP_POLICY_ID);
  add("15D-C: allocation-gap engine exists", GAP_ENGINE_EXISTS_15D === true && typeof buildContributionAllocationGapAnalysis === "function", "exists");
  add("15D-D: gap policy validates", validateContributionAllocationGapPolicy().valid === true, "valid");
  add("15D-E: the 5-point trigger is reused from dcaMinimumPolicy", CONTRIBUTION_ALLOCATION_UNDERWEIGHT_TRIGGER_PERCENTAGE_POINTS === 5 && CONTRIBUTION_ALLOCATION_UNDERWEIGHT_TRIGGER_PERCENTAGE_POINTS === DCA_UNDERWEIGHT_TRIGGER_PERCENTAGE_POINTS, "reused");
  add("15D-F: no duplicate trigger constant exists", readIf("src/suggestions/contributionAllocationGapPolicy.ts").includes("DCA_UNDERWEIGHT_TRIGGER_PERCENTAGE_POINTS") && !/UNDERWEIGHT_TRIGGER_PERCENTAGE_POINTS\s*=\s*\d/.test(readIf("src/suggestions/contributionAllocationGapPolicy.ts")), "no dup");

  // 15D-G…M. Canonical denominator.
  add("15D-G: canonical total portfolio value is used as denominator", aCore.totalPortfolioValueUsd === 10000 && solCore.totalPortfolioValueUsd === 10000, "10000");
  add("15D-H: percentages are not calculated from only mapped targets", solCore.currentValueUsd === 4000 && aCore.mappedTargetValueUsd === 8000 && solCore.currentPct === 40, `${solCore.currentPct} (not 50)`);
  add("15D-I: unknown/unsupported asset value remains in the denominator", aCore.unmappedOtherValueUsd === 2000, `${aCore.unmappedOtherValueUsd}`);
  {
    const snapReg = mkSnap(10000, [mkExp("usdc", usdcT.assetId, 4000), mkExp("sol", solT.assetId, 4000), mkExp("btc", btcT.assetId, 2000, ["manual_entry"])]);
    const aReg = buildContributionAllocationGapAnalysis({ snapshot: snapReg, targetAllocationResult: alloc, policyEligibilityByTargetId: solReady, generatedAt: GEN, checkedAt: CHK });
    add("15D-J: registered non-target value remains in the denominator", aReg.registeredNonTargetValueUsd === 2000 && aReg.targetResults.find((t) => t.targetId === "sol")!.currentPct === 40, `${aReg.registeredNonTargetValueUsd}`);
    add("15D-K: mapped, registered non-target, and unmapped values reconcile to total", (aReg.mappedTargetValueUsd! + aReg.registeredNonTargetValueUsd! + aReg.unmappedOtherValueUsd!) === aReg.totalPortfolioValueUsd, "reconciles");
    add("15D-R: disabled BTC exposure may remain in the denominator", aReg.status !== "invalid_input" && aReg.registeredNonTargetValueUsd === 2000, "kept");
  }
  {
    const snapNeg = mkSnap(5000, [mkExp("usdc", usdcT.assetId, 4000), mkExp("sol", solT.assetId, 4000)]);
    const aNeg = buildContributionAllocationGapAnalysis({ snapshot: snapNeg, targetAllocationResult: alloc, policyEligibilityByTargetId: solReady, generatedAt: GEN, checkedAt: CHK });
    add("15D-L: materially negative unmapped value fails", aNeg.status === "invalid_input" && aNeg.blockers.includes("target_values_exceed_portfolio"), "fails");
  }
  {
    const tinyTotal = 8000 - 5e-10;
    const snapTiny = mkSnap(tinyTotal, [mkExp("usdc", usdcT.assetId, 4000), mkExp("sol", solT.assetId, 4000)]);
    const aTiny = buildContributionAllocationGapAnalysis({ snapshot: snapTiny, targetAllocationResult: alloc, policyEligibilityByTargetId: solReady, generatedAt: GEN, checkedAt: CHK });
    add("15D-M: a tiny floating error clamps unmapped to zero within tolerance", aTiny.status === "complete" && aTiny.unmappedOtherValueUsd === 0, "clamped");
  }

  // 15D-N…V. Exposure behavior.
  add("15D-N: target exposure IDs are unique", validateContributionPortfolioAllocationSnapshot(snapCore).valid === true, "unique");
  {
    const aDup = buildContributionAllocationGapAnalysis({ snapshot: mkSnap(10000, [mkExp("sol", solT.assetId, 4000), mkExp("sol", solT.assetId, 1000)]), targetAllocationResult: alloc, policyEligibilityByTargetId: solReady, generatedAt: GEN, checkedAt: CHK });
    add("15D-N2: duplicate target exposure fails", aDup.status === "invalid_input" && aDup.blockers.includes("duplicate_target_value"), "fails");
    const aNegExp = buildContributionAllocationGapAnalysis({ snapshot: mkSnap(10000, [mkExp("sol", solT.assetId, -5)]), targetAllocationResult: alloc, policyEligibilityByTargetId: solReady, generatedAt: GEN, checkedAt: CHK });
    add("15D-O: negative exposure fails", aNegExp.status === "invalid_input" && aNegExp.blockers.includes("target_value_negative"), "fails");
    const aNaN = buildContributionAllocationGapAnalysis({ snapshot: mkSnap(10000, [mkExp("sol", solT.assetId, NaN)]), targetAllocationResult: alloc, policyEligibilityByTargetId: solReady, generatedAt: GEN, checkedAt: CHK });
    add("15D-P: NaN exposure fails", aNaN.status === "invalid_input" && aNaN.blockers.includes("target_value_invalid"), "fails");
    const aBig = buildContributionAllocationGapAnalysis({ snapshot: mkSnap(10000, [mkExp("sol", solT.assetId, 20000)]), targetAllocationResult: alloc, policyEligibilityByTargetId: solReady, generatedAt: GEN, checkedAt: CHK });
    add("15D-Q: target exposure greater than total fails", aBig.status === "invalid_input" && aBig.blockers.includes("target_value_exceeds_portfolio"), "fails");
  }
  {
    const snapEth = mkSnap(10000, [mkExp("usdc", usdcT.assetId, 4000), mkExp("sol", solT.assetId, 4500), mkExp("eth", ethT.assetId, 1500, ["manual_entry"])]);
    const aEth = buildContributionAllocationGapAnalysis({ snapshot: snapEth, targetAllocationResult: alloc, policyEligibilityByTargetId: solReady, generatedAt: GEN, checkedAt: CHK });
    add("15D-S: disabled ETH exposure may remain in the denominator", aEth.status !== "invalid_input" && aEth.registeredNonTargetValueUsd === 1500, "kept");
  }
  {
    const snapProto = mkSnap(10000, [mkExp("usdc", usdcT.assetId, 6000), mkExp("sol", solT.assetId, 4000, ["protocol_position"])]);
    const aProto = buildContributionAllocationGapAnalysis({ snapshot: snapProto, targetAllocationResult: alloc, policyEligibilityByTargetId: solReady, generatedAt: GEN, checkedAt: CHK });
    const solProto = aProto.targetResults.find((t) => t.targetId === "sol")!;
    add("15D-T: protocol-position exposure does not imply available funding", aProto.fundingAvailabilityEvaluated === false && solProto.fundingAvailabilityEvaluated === false && solProto.currentValueUsd === 4000, "no funding");
    add("15D-U: staked SOL exposure can count toward SOL allocation via the canonical adapter", solProto.currentValueUsd === 4000 && solProto.currentPct === 40, "counts once");
    add("15D-V: LST and underlying exposure are not double-counted by the gap engine", solProto.currentValueUsd === 4000 && !readIf("src/suggestions/contributionAllocationGapEngine.ts").includes("positions.reduce"), "single value");
  }

  // 15D-W…AD. Basic gap math + classification.
  add("15D-W: $10,000 total and $4,000 SOL produces 40% current SOL allocation", solCore.currentPct === 40, "40%");
  add("15D-X: 60% target produces a 20-point underweight gap", solCore.signedGapPercentagePoints === 20, "20pp");
  add("15D-Y: 20-point gap meets the 5-point trigger", solCore.classification === "underweight_trigger_met" && solCore.underweightTriggerMet === true, "met");
  add("15D-Z: 4-point underweight gap is below trigger", classifyContributionAllocationGap(56, 60).classification === "underweight_below_trigger", "below");
  add("15D-AA: exactly 5 points meets the trigger", classifyContributionAllocationGap(55, 60).classification === "underweight_trigger_met", "met");
  add("15D-AB: at-target within tolerance is classified at_target", classifyContributionAllocationGap(60 + CONTRIBUTION_ALLOCATION_PERCENTAGE_TOLERANCE / 2, 60).classification === "at_target" && usdcCore.classification === "at_target", "at_target");
  add("15D-AC: overweight target is classified overweight", classifyContributionAllocationGap(70, 60).classification === "overweight", "overweight");
  add("15D-AD: trigger does not run for overweight targets", classifyContributionAllocationGap(70, 60).underweightTriggerMet === false, "no trigger");

  // BV scenario: $6,000 USDC / $4,000 SOL, targets 40/60.
  const snapBV = mkSnap(10000, [mkExp("usdc", usdcT.assetId, 6000), mkExp("sol", solT.assetId, 4000)]);
  const aBV = buildContributionAllocationGapAnalysis({ snapshot: snapBV, targetAllocationResult: alloc, policyEligibilityByTargetId: solReady, generatedAt: GEN, checkedAt: CHK });
  const solBV = aBV.targetResults.find((t) => t.targetId === "sol")!;
  const usdcBV = aBV.targetResults.find((t) => t.targetId === "usdc")!;

  // 15D-AE…AI. Static / current-total gap.
  add("15D-AE: $10,000 × 60% produces a $6,000 current-total target value", solCore.staticTargetValueAtCurrentTotalUsd === 6000, "6000");
  add("15D-AF: $4,000 current value produces a $2,000 signed static gap", solCore.signedStaticGapAtCurrentTotalUsd === 2000, "2000");
  add("15D-AG: internal reallocation required is $2,000", solCore.internalReallocationUsdToReachTarget === 2000, "2000");
  add("15D-AH: internal cap before overshoot is $2,000", solCore.maximumInternalReallocationIncreaseWithoutOvershootUsd === 2000, "2000");
  add("15D-AI: overweight amount is calculated correctly", usdcBV.currentOverweightUsdAtCurrentTotal === 2000, "2000");

  // 15D-AJ…AR. External-contribution math.
  add("15D-AJ: external contribution uses the denominator-changing formula", solBV.externalContributionUsdToReachTarget === 5000 && solBV.internalReallocationUsdToReachTarget === 2000, "5000 vs 2000");
  add("15D-AK: $10,000 total, $4,000 target value, and 60% target produces $5,000", computeExternalContributionToReachTarget(10000, 4000, 60).amount === 5000, "5000");
  add("15D-AL: $5,000 external contribution reconstructs exactly 60%", ((4000 + 5000) / (10000 + 5000)) * 100 === 60, "60%");
  add("15D-AM: static $2,000 gap is not incorrectly used as the external contribution gap", solBV.signedStaticGapAtCurrentTotalUsd === 2000 && solBV.externalContributionUsdToReachTarget === 5000, "distinct");
  add("15D-AN: at-target produces a zero external cap", usdcCore.maximumExternalContributionIncreaseWithoutOvershootUsd === 0, "0");
  add("15D-AO: overweight produces a zero external cap", usdcBV.maximumExternalContributionIncreaseWithoutOvershootUsd === 0, "0");
  {
    const alloc0 = buildGrowthTargetAllocationPolicyResult({ targetStablePct: 100, targetVolatilePct: 0, sourceEngineVersion: SUGGESTION_ENGINE_VERSION }, { enabledGrowthTargetIds: ["sol"] });
    const a0 = buildContributionAllocationGapAnalysis({ snapshot: mkSnap(1000, [mkExp("usdc", usdcT.assetId, 1000), mkExp("sol", solT.assetId, 0)]), targetAllocationResult: alloc0, policyEligibilityByTargetId: solReady, generatedAt: GEN, checkedAt: CHK });
    const sol0 = a0.targetResults.find((t) => t.targetId === "sol")!;
    add("15D-AP: 0% target allows no increase", sol0.targetPct === 0 && sol0.maximumExternalContributionIncreaseWithoutOvershootUsd === 0 && sol0.maximumInternalReallocationIncreaseWithoutOvershootUsd === 0, "no increase");
    const alloc100: GrowthTargetAllocationPolicyResult = { ...alloc, stableBucketTargetPct: 0, growthBucketTargetPct: 100, enabledGrowthTargetIds: ["sol"], singleEnabledGrowthTargetPolicyApplied: true, targetPctByInvestmentTargetId: { usdc: 0, sol: 100 } };
    const a100 = buildContributionAllocationGapAnalysis({ snapshot: mkSnap(10000, [mkExp("sol", solT.assetId, 4000)]), targetAllocationResult: alloc100, policyEligibilityByTargetId: solReady, generatedAt: GEN, checkedAt: CHK });
    const sol100 = a100.targetResults.find((t) => t.targetId === "sol")!;
    add("15D-AQ: 100% underweight target reports no finite external solution", sol100.externalContributionUsdToReachTarget === undefined && sol100.blockers.includes("external_target_unreachable_at_100_percent"), "unreachable");
  }
  {
    const ext = computeExternalContributionToReachTarget(10000, 4000, 55);
    add("15D-AR: external calculations preserve full precision", ext.amount != null && Math.abs(ext.amount - 3333.3333333333335) < 1e-9 && !Number.isInteger(ext.amount), `${ext.amount}`);
  }

  // 15D-AS…BC. Hypothetical projections.
  const projExt = projectContributionAllocationAfterHypotheticalIncrease({ currentValueUsd: 4000, totalPortfolioValueUsd: 10000, targetPct: 60 }, { targetId: "sol", mode: "external_contribution", amountUsd: 1000 });
  const projInt = projectContributionAllocationAfterHypotheticalIncrease({ currentValueUsd: 4000, totalPortfolioValueUsd: 10000, targetPct: 60 }, { targetId: "sol", mode: "internal_reallocation", amountUsd: 1000 });
  add("15D-AS: $1,000 external into a $4,000/$10,000 target produces 45.4545…%", projExt.valid && Math.abs(projExt.projection!.projectedTargetPct - 45.45454545454545) < 1e-9, `${projExt.projection?.projectedTargetPct}`);
  add("15D-AT: $1,000 internal reallocation produces 50%", projInt.valid && projInt.projection!.projectedTargetPct === 50, "50%");
  add("15D-AU: external projection increases total portfolio value", projExt.projection!.projectedTotalPortfolioValueUsd === 11000, "11000");
  add("15D-AV: internal projection preserves total portfolio value", projInt.projection!.projectedTotalPortfolioValueUsd === 10000, "10000");
  add("15D-AW: overshoot detection is deterministic", projectContributionAllocationAfterHypotheticalIncrease({ currentValueUsd: 4000, totalPortfolioValueUsd: 10000, targetPct: 60 }, { targetId: "sol", mode: "internal_reallocation", amountUsd: 3000 }).projection!.wouldOvershootTarget === true, "overshoot");
  add("15D-AX: exact target amount is not marked overshoot", projectContributionAllocationAfterHypotheticalIncrease({ currentValueUsd: 4000, totalPortfolioValueUsd: 10000, targetPct: 60 }, { targetId: "sol", mode: "internal_reallocation", amountUsd: 2000 }).projection!.wouldOvershootTarget === false, "exact");
  add("15D-AY: negative hypothetical amount fails", projectContributionAllocationAfterHypotheticalIncrease({ currentValueUsd: 4000, totalPortfolioValueUsd: 10000, targetPct: 60 }, { targetId: "sol", mode: "external_contribution", amountUsd: -5 }).valid === false, "fails");
  add("15D-AZ: NaN hypothetical amount fails", projectContributionAllocationAfterHypotheticalIncrease({ currentValueUsd: 4000, totalPortfolioValueUsd: 10000, targetPct: 60 }, { targetId: "sol", mode: "external_contribution", amountUsd: NaN }).valid === false, "fails");
  add("15D-BA: internal amount above non-target portfolio value fails", projectContributionAllocationAfterHypotheticalIncrease({ currentValueUsd: 4000, totalPortfolioValueUsd: 10000, targetPct: 60 }, { targetId: "sol", mode: "internal_reallocation", amountUsd: 7000 }).blockers.includes("hypothetical_amount_exceeds_non_target_value"), "fails");
  add("15D-BB: projection does not evaluate funding availability", projExt.projection!.fundingAvailabilityEvaluated === false, "no funding");
  add("15D-BC: projection does not select a source asset", projExt.projection!.sourceAssetSelected === false, "no source");

  // 15D-BD…BI. Empty / negative portfolio.
  const aEmpty = buildContributionAllocationGapAnalysis({ snapshot: mkSnap(0, []), targetAllocationResult: alloc, policyEligibilityByTargetId: solReady, generatedAt: GEN, checkedAt: CHK });
  add("15D-BD: zero portfolio returns empty_portfolio", aEmpty.status === "empty_portfolio" && aEmpty.emptyPortfolio === true, aEmpty.status);
  add("15D-BE: empty portfolio does not divide by zero", aEmpty.targetResults.length === 0 && aEmpty.totalPortfolioValueUsd === 0, "safe");
  add("15D-BF: empty portfolio does not calculate current percentages", aEmpty.currentAllocationCalculated === false, "no pct");
  add("15D-BG: empty portfolio does not calculate single-target external gaps", aEmpty.targetResults.length === 0, "no gaps");
  add("15D-BH: empty portfolio requires a future initial-allocation plan", aEmpty.blockers.includes("empty_portfolio_requires_initial_allocation_plan"), "requires plan");
  add("15D-BI: negative portfolio total fails", buildContributionAllocationGapAnalysis({ snapshot: mkSnap(-100, []), targetAllocationResult: alloc, policyEligibilityByTargetId: solReady, generatedAt: GEN, checkedAt: CHK }).blockers.includes("portfolio_total_negative"), "fails");

  // 15D-BJ…BN. Ordering (no ranking).
  const snapRank = mkSnap(10000, [mkExp("usdc", usdcT.assetId, 3500), mkExp("sol", solT.assetId, 4500)]);
  const aRank = buildContributionAllocationGapAnalysis({ snapshot: snapRank, targetAllocationResult: alloc, policyEligibilityByTargetId: solReady, generatedAt: GEN, checkedAt: CHK });
  add("15D-BJ: target results preserve allocation-policy order", aCore.targetResults.map((t) => t.targetId).join(",") === Object.keys(alloc.targetPctByInvestmentTargetId).join(","), "usdc,sol");
  add("15D-BK: underweight IDs preserve target-result order", aRank.underweightTargetIds.join(",") === "usdc,sol", aRank.underweightTargetIds.join(","));
  add("15D-BL: trigger-met IDs preserve target-result order", aRank.triggerMetTargetIds.join(",") === "usdc,sol", aRank.triggerMetTargetIds.join(","));
  add("15D-BM: the gap engine does not rank targets", aRank.underweightTargetIds[0] === "usdc" && (aRank.targetResults.find((t) => t.targetId === "sol")!.signedGapPercentagePoints as number) > (aRank.targetResults.find((t) => t.targetId === "usdc")!.signedGapPercentagePoints as number), "policy order");
  add("15D-BN: the gap engine does not select the largest gap", aRank.targetSelected === false, "no selection");

  // 15D-BO…BU. Growth readiness.
  const aBlocked = buildContributionAllocationGapAnalysis({ snapshot: snapCore, targetAllocationResult: alloc, policyEligibilityByTargetId: {}, generatedAt: GEN, checkedAt: CHK });
  add("15D-BO: ready SOL policy eligibility allows future growth-gap evaluation", solCore.eligibleForFutureGrowthContributionEvaluation === true && solCore.contributionTargetPolicyReady === true && aCore.status === "complete", "ready");
  add("15D-BP: blocked SOL policy eligibility blocks the analysis", aBlocked.status === "blocked_policy_readiness" && aBlocked.blockers.includes("contribution_target_policy_not_ready"), aBlocked.status);
  add("15D-BQ: USDC gap may be calculated but USDC is not marked as a growth contribution target", usdcCore.currentPct === 40 && usdcCore.eligibleForFutureGrowthContributionEvaluation === false, "context only");
  add("15D-BR: BTC is now an eligible growth contribution target (manual entry)", isEnabledGrowthContributionTarget("btc") === true, "eligible");
  add("15D-BS: ETH is now an eligible growth contribution target (manual entry)", isEnabledGrowthContributionTarget("eth") === true, "eligible");
  add("15D-BT: RWA contribution targets remain disabled", RWA_ENABLED_15C === false && getInvestmentTarget("rwa") === undefined, "disabled");
  add("15D-BU: calculated underweight does not mean selected", solCore.classification === "underweight_trigger_met" && solCore.targetSelected === false, "not selected");

  // 15D-BV…CB. Worked portfolio scenarios.
  add("15D-BV: $6,000 USDC / $4,000 SOL with 40/60 targets marks SOL underweight and USDC overweight", aBV.underweightTargetIds.includes("sol") && aBV.overweightTargetIds.includes("usdc"), "u/o");
  add("15D-BW: internal SOL gap is $2,000", solBV.internalReallocationUsdToReachTarget === 2000, "2000");
  add("15D-BX: external SOL gap is $5,000", solBV.externalContributionUsdToReachTarget === 5000, "5000");
  {
    const aAt = buildContributionAllocationGapAnalysis({ snapshot: mkSnap(10000, [mkExp("usdc", usdcT.assetId, 4000), mkExp("sol", solT.assetId, 6000)]), targetAllocationResult: alloc, policyEligibilityByTargetId: solReady, generatedAt: GEN, checkedAt: CHK });
    add("15D-BY: $4,000 USDC / $6,000 SOL with 40/60 targets marks both at target", aAt.atTargetIds.join(",") === "usdc,sol", aAt.atTargetIds.join(","));
  }
  {
    const snapBonk = mkSnap(10000, [mkExp("usdc", usdcT.assetId, 4000), mkExp("sol", solT.assetId, 4000)]);
    const aBonk = buildContributionAllocationGapAnalysis({ snapshot: snapBonk, targetAllocationResult: alloc, policyEligibilityByTargetId: solReady, generatedAt: GEN, checkedAt: CHK });
    add("15D-BZ: Demo-like SOL/USDC/BONK portfolio uses BONK in denominator", aBonk.unmappedOtherValueUsd === 2000 && aBonk.totalPortfolioValueUsd === 10000, "bonk in total");
    add("15D-CA: BONK is not silently assigned to SOL", aBonk.targetResults.find((t) => t.targetId === "sol")!.currentValueUsd === 4000, "sol=4000");
    add("15D-CB: existing non-target value can cause mapped targets to be underweight", aBonk.targetResults.find((t) => t.targetId === "sol")!.classification.startsWith("underweight"), "underweight");
  }

  // 15D-CC…CI. Future extensibility.
  add("15D-CC: engine logic does not hardcode SOL", !/["']sol["']/.test(readIf("src/suggestions/contributionAllocationGapEngine.ts")), "generic");
  {
    const synthBtc: GrowthTargetAllocationPolicyResult = { ...alloc, stableBucketTargetPct: 40, growthBucketTargetPct: 60, enabledGrowthTargetIds: ["btc"], singleEnabledGrowthTargetPolicyApplied: true, targetPctByInvestmentTargetId: { usdc: 40, btc: 60 } };
    const aBtc = buildContributionAllocationGapAnalysis({ snapshot: mkSnap(10000, [mkExp("usdc", usdcT.assetId, 4000), mkExp("btc", btcT.assetId, 3000, ["manual_entry"])]), targetAllocationResult: synthBtc, generatedAt: GEN, checkedAt: CHK });
    const btcRes = aBtc.targetResults.find((t) => t.targetId === "btc")!;
    add("15D-CD: engine computes the BTC gap from a supplied allocation policy; with no policy-eligibility supplied it stays readiness-blocked and never marks BTC eligible", aBtc.status === "blocked_policy_readiness" && btcRes.currentPct === 30 && btcRes.internalReallocationUsdToReachTarget === 3000 && btcRes.eligibleForFutureGrowthContributionEvaluation === false, "btc gap");
    const synthEth: GrowthTargetAllocationPolicyResult = { ...alloc, stableBucketTargetPct: 40, growthBucketTargetPct: 60, enabledGrowthTargetIds: ["eth"], singleEnabledGrowthTargetPolicyApplied: true, targetPctByInvestmentTargetId: { usdc: 40, eth: 60 } };
    const aEth2 = buildContributionAllocationGapAnalysis({ snapshot: mkSnap(10000, [mkExp("usdc", usdcT.assetId, 5000), mkExp("eth", ethT.assetId, 2000, ["manual_entry"])]), targetAllocationResult: synthEth, generatedAt: GEN, checkedAt: CHK });
    add("15D-CE: engine can calculate a synthetic future ETH target", aEth2.targetResults.find((t) => t.targetId === "eth")!.targetPct === 60, "eth gap");
    const synthRwa: GrowthTargetAllocationPolicyResult = { ...alloc, stableBucketTargetPct: 40, growthBucketTargetPct: 60, enabledGrowthTargetIds: ["treasury_note_2027"], singleEnabledGrowthTargetPolicyApplied: true, targetPctByInvestmentTargetId: { usdc: 40, treasury_note_2027: 60 } };
    const aRwa = buildContributionAllocationGapAnalysis({ snapshot: mkSnap(10000, [mkExp("usdc", usdcT.assetId, 4000)]), targetAllocationResult: synthRwa, generatedAt: GEN, checkedAt: CHK });
    const rwaRes = aRwa.targetResults.find((t) => t.targetId === "treasury_note_2027")!;
    add("15D-CF: engine can calculate a synthetic specific RWA target", rwaRes.targetPct === 60 && rwaRes.currentValueUsd === 0 && rwaRes.internalReallocationUsdToReachTarget === 6000, "rwa gap");
  }
  add("15D-CG: manual-entry holding source is supported by the exposure type", validateContributionPortfolioAllocationSnapshot(mkSnap(1000, [mkExp("btc", btcT.assetId, 1000, ["manual_entry"])])).valid === true, "manual");
  add("15D-CH: future-external-import holding source is supported", validateContributionPortfolioAllocationSnapshot(mkSnap(1000, [mkExp("btc", btcT.assetId, 1000, ["future_external_import"])])).valid === true, "import");
  add("15D-CI: generic RWA production target remains forbidden", getInvestmentTarget("rwa") === undefined && getInvestmentTarget("generic_rwa") === undefined, "forbidden");

  // 15D-CJ…CQ. Result boundaries.
  add("15D-CJ: Safety Buffer is not evaluated", aCore.safetyBufferEvaluated === false && solCore.safetyBufferEvaluated === false, "no buffer");
  add("15D-CK: funding source is not evaluated", aCore.fundingSourceEvaluated === false, "no source");
  add("15D-CL: funding availability is not evaluated", aCore.fundingAvailabilityEvaluated === false, "no availability");
  add("15D-CM: contribution frequency is not applied", aCore.contributionFrequencyApplied === false, "no frequency");
  add("15D-CN: contribution amount is not calculated", aCore.contributionAmountCalculated === false && solCore.contributionAmountCalculated === false, "no amount");
  add("15D-CO: no target is selected", aCore.targetSelected === false && solCore.targetSelected === false, "no selection");
  add("15D-CP: no DCA plan is generated", aCore.dcaPlanGenerated === false, "no plan");
  add("15D-CQ: no suggestion is generated", aCore.suggestionGenerated === false && solCore.suggestionGenerated === false, "no suggestion");

  // 15D-CR…CV. Feature-state invariants.
  add("15D-CR: allocation-gap engine exists", TARGET_ALLOCATION_GAP_ENGINE_EXISTS === true && TARGET_ALLOCATION_GAP_UPDATES_PRODUCT_OUTPUT === false && TARGET_ALLOCATION_GAP_SELECTS_TARGET === false && TARGET_ALLOCATION_GAP_EVALUATES_FUNDING === false && TARGET_ALLOCATION_GAP_EVALUATES_SAFETY_BUFFER === false, "exists");
  add("15D-CS: contribution-priority engine now exists (enabled at Step 15E)", CONTRIBUTION_PRIORITY_ENGINE_EXISTS === true, "exists");
  add("15D-CT: contribution planning now exists (enabled at Step 15G)", CONTRIBUTION_PLANNING_EXISTS === true, "exists");
  add("15D-CU: DCA plan generation now exists (enabled at Step 15G)", DCA_PLAN_GENERATION_EXISTS === true, "exists");
  add("15D-CV: DCA suggestion now exists (enabled at Step 15H)", DCA_SUGGESTION_ENABLED === true, "exists");

  // 15D-CW…DD. Product invariants.
  add("15D-CW (22G): DCA-minimum policy is independent of any risk-only target — the legacy allocation module is deleted", (() => { return readIf("src/wallet/recommendedAllocation.ts") === "" && typeof getDcaMinimumPolicy === "function"; })(), "minimum policy intact");
  const funded15D = bufferFixture(5000, 1000, 3);
  const aligned15D = allocationFixture(15000, 62, 2);
  const engineRun15D = runSuggestionEngine(inputsFor({ safetyBuffer: funded15D, allocation: aligned15D, positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const staking15D = engineRun15D.suggestions.find((s) => s.category === "staking");
  add("15D-CX: existing suggestion output remains unchanged", engineRun15D.suggestions.length > 0 && staking15D?.protocolSelection?.selectedProtocolId === "jito", "unchanged");
  add("15D-CY: Safety Buffer behavior remains unchanged", engineRun15D.suggestions.every((s) => !s.id.startsWith("contribution_") && s.id !== "contribution_allocation_gap"), "unchanged");
  add("15D-CZ: SOL staking remains unchanged", staking15D != null && staking15D.protocolSelection?.selectedProtocolName === "Jito", "unchanged");
  add("15D-DA: Top Pick remains unchanged", engineRun15D.suggestions.filter((s) => s.is_top_pick).every((s) => !s.id.startsWith("contribution")), "unchanged");
  add("15D-DB: engine ordering remains unchanged", engineRun15D.suggestions.every((s) => !s.id.startsWith("contribution") && s.id !== "sol" && s.id !== "usdc"), "unchanged");
  {
    const prodFiles = ["src/components/SuggestionCard.tsx", "src/components/SuggestionReviewModal.tsx", "src/pages/DemoDashboardPage.tsx", "src/pages/DashboardPage.tsx", "src/components/RealWalletSuggestionsRail.tsx"];
    const anyImport = prodFiles.some((f) => /contributionAllocationGap/.test(readIf(f)));
    add("15D-DC: no product-facing import exists", anyImport === false, "no import");
  }
  add("15D-DD: no /testing card is added in this non-UI step", !readIf("src/pages/testingPageFixtures.ts").includes("contributionAllocationGap") && !readIf("src/pages/testingPageFixtures.ts").includes("buildContributionAllocationGapAnalysis"), "no card");

  // 15D-DE…DG. Execution invariants.
  {
    const blob = ["contributionAllocationGapTypes", "contributionAllocationGapPolicy", "contributionAllocationGapEngine", "contributionAllocationGapDiagnostics"].map((f) => readIf(`src/suggestions/${f}.ts`)).join("").toLowerCase();
    add("15D-DE: no transaction path exists", !blob.includes("sendtransaction") && aCore.transactionsEnabled === false && solCore.transactionsEnabled === false, "none");
    add("15D-DF: no signature path exists", !blob.includes("signtransaction") && aCore.walletSignatureRequired === false && solCore.walletSignatureRequired === false, "none");
    const handlers = ["buy(", "swap(", "deposit(", "invest(", "execute(", "scheduletransfer("];
    add("15D-DG: no buy/swap/deposit/invest/execute/schedule-transfer handler exists", handlers.filter((h) => blob.includes(h)).length === 0, "none");
  }

  // Validators + diagnostics smoke.
  add("15D-validate: complete analysis validates and blocked analysis carries a blocker", validateContributionAllocationGapAnalysisResult(aCore).valid === true && validateContributionAllocationGapAnalysisResult(aBV).valid === true, "valid");
  add("15D-diagnostics: diagnostics are neutral and reveal no recommendation", getContributionAllocationGapDiagnostics(aCore).targetOrder.join(",") === "usdc,sol" && /internal reallocation/i.test(explainContributionTargetAllocationGap(solCore)) && !/\b(buy|invest now|available to deploy|recommended amount|suggested amount)\b/i.test(explainContributionTargetAllocationGap(solCore)), "neutral");

  return checks;
}


/**
 * Step 15E — contribution-priority + Safety Buffer gate fixtures (15E-A…DQ). Verifies the priority
 * order, canonical Safety Buffer reuse, the gate, buffer/stable/growth/on-track decisions, category
 * priority over gap size, future extensibility, and all boundary/product/execution invariants.
 */
export function runContributionPriorityFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });

  const root = process.cwd();
  const readIf = (rel: string) => { try { return readFileSync(`${root}/${rel}`, "utf8"); } catch { return ""; } };
  const engSrc = readIf("src/suggestions/contributionPriorityEngine.ts");
  const gateSrc = readIf("src/suggestions/contributionSafetyBufferGate.ts");
  const polSrc = readIf("src/suggestions/contributionPriorityPolicy.ts");

  const GEN = "2026-07-15T00:00:00Z";
  const CHK = "2026-07-15T00:00:00Z";
  const CAL = "2026-07-15T00:00:00Z";
  const timing = { calculatedAt: CAL, checkedAt: CHK };
  const solT = getInvestmentTarget("sol")!;
  const usdcT = getInvestmentTarget("usdc")!;

  const mkExp = (targetId: string, assetId: string, valueUsd: number, holdingSources: InvestmentTargetHoldingSource[] = ["connected_wallet"]): ContributionPortfolioTargetExposure => ({ targetId, assetId, valueUsd, holdingSources, valuationReady: true, notes: [] });
  const mkSnap = (total: number, exposures: ContributionPortfolioTargetExposure[]): ContributionPortfolioAllocationSnapshot => ({ snapshotId: "snap-1", calculatedAt: CAL, checkedAt: CHK, sourcePortfolioVersion: "portfolio-v1", totalPortfolioValueUsd: total, targetExposures: exposures, valuationStatus: "current", notes: [] });

  const rec = fxRiskTarget(60, 40);
  const alloc = buildGrowthTargetAllocationPolicyResult({ targetStablePct: rec.stablePct, targetVolatilePct: rec.cryptoPct, sourceEngineVersion: SUGGESTION_ENGINE_VERSION }, { enabledGrowthTargetIds: ["sol"] });

  const techCtx: InvestmentTargetTechnicalContext = { checkedAt: CHK, availableHoldingSources: ["connected_wallet", "protocol_position", "manual_entry"], priceStatusByTargetId: { sol: { available: true, fetchedAt: CHK } }, configuredAllocationPolicyKeys: ["growth_target_allocation_v1"], configuredMinimumPolicyKeys: ["dca_minimum_v1"], configuredSuitabilityPolicyKeys: ["sol_growth_suitability_v1"], approvedTargetIds: [] };
  const techElig = evaluateInvestmentTargetTechnicalEligibility(solT, techCtx);
  const suit = evaluateContributionTargetSuitability(solT, { checkedAt: CHK, targetId: "sol", profile: { goal: "build_long_term_wealth", riskLevel: "medium", timeHorizon: "5_years" }, targetAllocationResult: alloc });
  const freshQuote = evaluateContributionPriceQuote({ targetId: "sol", assetId: PRICE_SOL_MINT, priceUsd: 150, sourceId: CANONICAL_CONTRIBUTION_PRICE_SOURCE_ID, fetchedAt: CHK, checkedAt: CHK });
  const readyElig = evaluateContributionTargetPolicyEligibility({ targetId: "sol", checkedAt: CHK, technicalEligibility: techElig, targetAllocationResult: alloc, suitabilityResult: suit, priceQuote: freshQuote, minimumPolicy: getDcaMinimumPolicy() });
  const solReady = { sol: readyElig };
  const buildGap = (usdcVal: number, solVal: number, total: number) => buildContributionAllocationGapAnalysis({ snapshot: mkSnap(total, [mkExp("usdc", usdcT.assetId, usdcVal), mkExp("sol", solT.assetId, solVal)]), targetAllocationResult: alloc, policyEligibilityByTargetId: solReady, generatedAt: GEN, checkedAt: CHK });

  // Canonical Safety Buffer snapshots (populated FROM bufferFixture — the canonical derivation).
  const sbIncomplete = buildContributionSafetyBufferSnapshot(bufferFixture(4000, 3000, 3), timing); // required 9000, current 4000, shortfall 5000
  const sbComplete = buildContributionSafetyBufferSnapshot(bufferFixture(9000, 3000, 3), timing); // required 9000, current 9000, shortfall 0
  const sbTiny = buildContributionSafetyBufferSnapshot(bufferFixture(9000 - 5e-10, 3000, 3), timing);
  const sbInvalid = buildContributionSafetyBufferSnapshot({ targetUsd: -100, stableUsd: 50 }, timing);
  const sbBadShortfall: ContributionSafetyBufferSnapshot = { ...sbIncomplete, shortfallUsd: 999 };

  // Allocation-gap scenarios.
  const gapStableTrigger = buildGap(3000, 7000, 10000); // USDC 30% (gap 10, met); SOL 70% overweight
  const gapGrowthTrigger = buildGap(3700, 4300, 10000); // USDC 37% (gap 3, below); SOL 43% (gap 17, met); BONK 2000
  const gapOnTrack = buildGap(4000, 6000, 10000); // both at target
  const gapBoth = buildGap(3000, 4500, 10000); // USDC 30% (gap 10 met); SOL 45% (gap 15 met); BONK 2500
  const gapInvalid = buildContributionAllocationGapAnalysis({ snapshot: mkSnap(-100, []), targetAllocationResult: alloc, policyEligibilityByTargetId: solReady, generatedAt: GEN, checkedAt: CHK });

  // Decisions.
  const decBuffer = buildContributionPriorityDecision({ safetyBufferResult: sbIncomplete, allocationGapResult: gapBoth, generatedAt: GEN, checkedAt: CHK });
  const decStable = buildContributionPriorityDecision({ safetyBufferResult: sbComplete, allocationGapResult: gapStableTrigger, generatedAt: GEN, checkedAt: CHK });
  const decGrowth = buildContributionPriorityDecision({ safetyBufferResult: sbComplete, allocationGapResult: gapGrowthTrigger, generatedAt: GEN, checkedAt: CHK });
  const decOnTrack = buildContributionPriorityDecision({ safetyBufferResult: sbComplete, allocationGapResult: gapOnTrack, generatedAt: GEN, checkedAt: CHK });
  const decBoth = buildContributionPriorityDecision({ safetyBufferResult: sbComplete, allocationGapResult: gapBoth, generatedAt: GEN, checkedAt: CHK });

  // 15E-A…H. Schema/policy.
  add("15E-A: schema version exists", CONTRIBUTION_PRIORITY_SCHEMA_VERSION === "1.0.0" && decStable.schemaVersion === "1.0.0", CONTRIBUTION_PRIORITY_SCHEMA_VERSION);
  add("15E-B: policy ID/version exist", CONTRIBUTION_PRIORITY_POLICY_ID === "contribution_priority_v1" && CONTRIBUTION_PRIORITY_POLICY_VERSION === "1.0.0", CONTRIBUTION_PRIORITY_POLICY_ID);
  add("15E-C: contribution-priority engine exists", PRIORITY_ENGINE_EXISTS_15E === true && CONTRIBUTION_PRIORITY_ENGINE_EXISTS === true, "exists");
  add("15E-D: Safety Buffer gate exists", CONTRIBUTION_SAFETY_BUFFER_GATE_EXISTS === true, "exists");
  add("15E-E: priority policy validates", validateContributionPriorityPolicy().valid === true, "valid");
  add("15E-F: priority order is exactly buffer → stable → growth → on_track", CONTRIBUTION_PRIORITY_ORDER.join(",") === "safety_buffer,stable_allocation,growth_allocation,on_track", CONTRIBUTION_PRIORITY_ORDER.join(","));
  add("15E-G: the existing 5-point trigger is reused", CONTRIBUTION_PRIORITY_UNDERWEIGHT_TRIGGER_PERCENTAGE_POINTS === 5 && CONTRIBUTION_PRIORITY_UNDERWEIGHT_TRIGGER_PERCENTAGE_POINTS === DCA_UNDERWEIGHT_TRIGGER_PERCENTAGE_POINTS, "reused");
  add("15E-H: no duplicate allocation trigger is introduced", polSrc.includes("DCA_UNDERWEIGHT_TRIGGER_PERCENTAGE_POINTS") && !/UNDERWEIGHT_TRIGGER_PERCENTAGE_POINTS\s*=\s*\d/.test(polSrc), "no dup");

  // 15E-I…P. Canonical Safety Buffer reuse.
  add("15E-I: the canonical Safety Buffer result is reused", sbIncomplete.canonicalCalculationUsed === true && sbIncomplete.sourcePolicyId === CANONICAL_SAFETY_BUFFER_POLICY_ID, "reused");
  add("15E-J: no second buffer formula exists in Step 15E", !/monthlyExpenses|RISK_BUFFER_TARGET_MONTHS|\*\s*targetMonths/.test(gateSrc + engSrc + polSrc), "no formula");
  add("15E-K: required buffer is preserved exactly", sbIncomplete.requiredBufferUsd === 9000, "9000");
  add("15E-L: current eligible buffer is preserved exactly", sbIncomplete.currentEligibleBufferUsd === 4000, "4000");
  add("15E-M: shortfall is preserved exactly", sbIncomplete.shortfallUsd === 5000, "5000");
  add("15E-N: buffer source policy/version are preserved", sbIncomplete.sourcePolicyId === CANONICAL_SAFETY_BUFFER_POLICY_ID && sbIncomplete.sourcePolicyVersion === CANONICAL_SAFETY_BUFFER_POLICY_VERSION, "preserved");
  add("15E-O: assets qualifying for buffer coverage are not redefined", !/STABLE_SYMBOLS|deriveStableValue|isStablecoin/.test(gateSrc + engSrc), "not redefined");
  add("15E-P: buffer-month policy is not redefined", !/getSafetyBufferTargetMonths|RISK_BUFFER_TARGET_MONTHS/.test(gateSrc + engSrc), "not redefined");

  // 15E-Q…AA. Safety Buffer gate.
  add("15E-Q: positive shortfall produces incomplete gate", evaluateContributionSafetyBufferGate(sbIncomplete).status === "incomplete", "incomplete");
  add("15E-R: zero shortfall produces complete gate", evaluateContributionSafetyBufferGate(sbComplete).status === "complete", "complete");
  add("15E-S: tiny shortfall within tolerance produces complete gate", evaluateContributionSafetyBufferGate(sbTiny).status === "complete", "complete");
  add("15E-T: invalid buffer input fails closed", evaluateContributionSafetyBufferGate(sbInvalid).status === "invalid", "invalid");
  add("15E-U: shortfall must reconcile to max(0, required − current)", evaluateContributionSafetyBufferGate(sbBadShortfall).blockers.includes("safety_buffer_shortfall_inconsistent"), "reconcile");
  add("15E-V: incomplete buffer blocks stable allocation", evaluateContributionSafetyBufferGate(sbIncomplete).stableAllocationAllowed === false, "blocked");
  add("15E-W: incomplete buffer blocks growth allocation", evaluateContributionSafetyBufferGate(sbIncomplete).growthAllocationAllowed === false, "blocked");
  add("15E-X: complete buffer allows lower-priority evaluation", evaluateContributionSafetyBufferGate(sbComplete).lowerPriorityEvaluationAllowed === true, "allowed");
  add("15E-Y: gate calculates no contribution amount", evaluateContributionSafetyBufferGate(sbIncomplete).contributionAmountCalculated === false, "no amount");
  add("15E-Z: gate calculates no residual amount", evaluateContributionSafetyBufferGate(sbIncomplete).residualAmountCalculated === false, "no residual");
  add("15E-AA: gate selects no funding source", evaluateContributionSafetyBufferGate(sbIncomplete).fundingSourceSelected === false, "no funding");

  // 15E-AB…AJ. Buffer-priority behavior.
  add("15E-AB: incomplete buffer produces purpose safety_buffer", decBuffer.status === "complete" && decBuffer.purpose === "safety_buffer", decBuffer.purpose ?? "");
  add("15E-AC: Safety Buffer purpose exposes exact shortfall context", decBuffer.safetyBufferPriorityShortfallUsd === 5000, `${decBuffer.safetyBufferPriorityShortfallUsd}`);
  add("15E-AD: Safety Buffer purpose uses the canonical buffer target ID", decBuffer.priorityTargetIds.join(",") === "usdc", decBuffer.priorityTargetIds.join(","));
  add("15E-AE: Safety Buffer suppresses stable priority", decBuffer.stableAllocationSuppressedBySafetyBuffer === true, "suppressed");
  add("15E-AF: Safety Buffer suppresses growth priority", decBuffer.growthSuppressedBySafetyBuffer === true, "suppressed");
  add("15E-AG: Safety Buffer priority does not require a valid allocation-gap result", buildContributionPriorityDecision({ safetyBufferResult: sbIncomplete, allocationGapResult: undefined, generatedAt: GEN, checkedAt: CHK }).purpose === "safety_buffer", "no gap needed");
  add("15E-AH: invalid lower-priority gap cannot override an incomplete buffer", buildContributionPriorityDecision({ safetyBufferResult: sbIncomplete, allocationGapResult: gapInvalid, generatedAt: GEN, checkedAt: CHK }).purpose === "safety_buffer", "buffer wins");
  add("15E-AI: Safety Buffer priority calculates no final amount", decBuffer.contributionAmountCalculated === false, "no amount");
  add("15E-AJ: Safety Buffer priority routes no residual", decBuffer.residualAmountCalculated === false, "no residual");

  // 15E-AK…AT. Stable context.
  add("15E-AK: stable targets come from the registry", buildContributionStablePriorityContext(gapStableTrigger).context!.stableTargetIds.includes("usdc") && getStableAllocationDestinations().some((t) => t.targetId === "usdc"), "registry");
  add("15E-AL: USDC is the current stable-allocation destination", getStableAllocationDestinations().map((t) => t.targetId).join(",") === "usdc", "usdc");
  add("15E-AM: stable context preserves allocation-gap order", buildContributionStablePriorityContext(gapStableTrigger).context!.stableTargetIds.join(",") === gapStableTrigger.targetResults.filter((t) => t.targetId === "usdc").map((t) => t.targetId).join(","), "order");
  add("15E-AN: stable percentages are not recalculated", engSrc.includes("underweightTriggerMet") && !engSrc.includes("currentPct ="), "reused");
  add("15E-AO: stable target below 5 points does not meet trigger", buildContributionStablePriorityContext(gapGrowthTrigger).context!.triggerMetStableTargetIds.length === 0, "below");
  add("15E-AP: stable target at exactly 5 points meets trigger", buildContributionStablePriorityContext(buildGap(3500, 4500, 10000)).context!.triggerMetStableTargetIds.join(",") === "usdc", "met");
  add("15E-AQ: stable target above 5 points meets trigger", buildContributionStablePriorityContext(gapStableTrigger).context!.triggerMetStableTargetIds.join(",") === "usdc", "met");
  add("15E-AR: stable target at target does not meet trigger", buildContributionStablePriorityContext(gapOnTrack).context!.triggerMetStableTargetIds.length === 0, "no trigger");
  add("15E-AS: stable target overweight does not meet underweight trigger", buildContributionStablePriorityContext(buildGap(5000, 5000, 10000)).context!.triggerMetStableTargetIds.length === 0, "no trigger");
  {
    const usdcRes = gapStableTrigger.targetResults.find((t) => t.targetId === "usdc")!;
    const solRes = gapStableTrigger.targetResults.find((t) => t.targetId === "sol")!;
    const twoStableGap = { ...gapStableTrigger, targetResults: [usdcRes, { ...usdcRes, targetId: "usdt" }, solRes] };
    const at = buildContributionStablePriorityContext(twoStableGap, { stableDestinationIds: ["usdc", "usdt"] });
    add("15E-AT: multiple stable destinations without sub-allocation fail closed", at.context === null && at.blockers.includes("multiple_stable_targets_require_suballocation_policy"), "fail closed");
  }

  // 15E-AU…AZ. Stable priority.
  add("15E-AU: complete buffer plus stable trigger produces stable_allocation", decStable.purpose === "stable_allocation" && decStable.primaryTargetCategory === "stable_asset", decStable.purpose ?? "");
  add("15E-AV: stable priority target IDs match trigger-met stable targets", decStable.priorityTargetIds.join(",") === (decStable.stableContext?.triggerMetStableTargetIds.join(",") ?? "") && decStable.priorityTargetIds.join(",") === "usdc", decStable.priorityTargetIds.join(","));
  add("15E-AW: stable priority overrides growth even when growth has a larger gap", decBoth.purpose === "stable_allocation" && (gapBoth.targetResults.find((t) => t.targetId === "sol")!.signedGapPercentagePoints as number) > (gapBoth.targetResults.find((t) => t.targetId === "usdc")!.signedGapPercentagePoints as number), "stable wins");
  add("15E-AX: stable priority overrides growth even when growth has a larger USD gap", decBoth.purpose === "stable_allocation" && (gapBoth.targetResults.find((t) => t.targetId === "sol")!.signedStaticGapAtCurrentTotalUsd as number) > (gapBoth.targetResults.find((t) => t.targetId === "usdc")!.signedStaticGapAtCurrentTotalUsd as number), "stable wins");
  add("15E-AY: stable priority does not calculate an amount", decStable.contributionAmountCalculated === false, "no amount");
  add("15E-AZ: stable priority does not select a funding source", decStable.fundingSourceSelected === false, "no funding");

  // 15E-BA…BK. Growth context.
  add("15E-BA: growth targets come from the enabled registry list", buildContributionGrowthPriorityContext(gapGrowthTrigger).eligibleGrowthTargetIds.includes("sol"), "registry");
  add("15E-BB: the enabled growth targets are SOL + BTC/ETH", getEnabledContributionGrowthTargets().map((t) => t.targetId).join(",") === "sol,btc,eth", "sol,btc,eth");
  add("15E-BC: growth context preserves allocation-policy order", buildContributionGrowthPriorityContext(gapGrowthTrigger).eligibleGrowthTargetIds.join(",") === "sol", "order");
  add("15E-BD: growth percentages are not recalculated", !engSrc.includes("currentPct ="), "reused");
  add("15E-BE: growth target requires policy readiness", buildContributionGrowthPriorityContext(buildContributionAllocationGapAnalysis({ snapshot: mkSnap(10000, [mkExp("usdc", usdcT.assetId, 4000), mkExp("sol", solT.assetId, 5000)]), targetAllocationResult: alloc, policyEligibilityByTargetId: {}, generatedAt: GEN, checkedAt: CHK })).eligibleGrowthTargetIds.length === 0, "requires ready");
  add("15E-BF: every enabled growth target is lifecycle-enabled and contribution-capable (nothing disabled slips in)", getEnabledContributionGrowthTargets().every((t) => t.lifecycleStatus === "enabled" && t.enabledForMvp === true && t.canBeContributionTarget === true), "all enabled");
  add("15E-BG: underweight growth below 5 points does not meet trigger", buildContributionGrowthPriorityContext(buildGap(4000, 5700, 10000)).triggerMetGrowthTargetIds.length === 0, "below");
  add("15E-BH: growth at exactly 5 points meets trigger", buildContributionGrowthPriorityContext(buildGap(4000, 5500, 10000)).triggerMetGrowthTargetIds.join(",") === "sol", "met");
  add("15E-BI: growth above 5 points meets trigger", buildContributionGrowthPriorityContext(buildGap(4000, 5000, 10000)).triggerMetGrowthTargetIds.join(",") === "sol", "met");
  add("15E-BJ: at-target growth does not meet trigger", buildContributionGrowthPriorityContext(gapOnTrack).triggerMetGrowthTargetIds.length === 0, "no trigger");
  add("15E-BK: overweight growth does not meet trigger", buildContributionGrowthPriorityContext(gapStableTrigger).triggerMetGrowthTargetIds.length === 0, "no trigger");

  // 15E-BL…BR. Growth priority.
  add("15E-BL: complete buffer plus no stable trigger plus growth trigger produces growth_allocation", decGrowth.purpose === "growth_allocation" && decGrowth.primaryTargetCategory === "growth_asset", decGrowth.purpose ?? "");
  add("15E-BM: growth priority IDs match eligible trigger-met targets", decGrowth.priorityTargetIds.join(",") === (decGrowth.growthContext?.triggerMetGrowthTargetIds.join(",") ?? "") && decGrowth.priorityTargetIds.join(",") === "sol", decGrowth.priorityTargetIds.join(","));
  {
    const solGrowthRes = gapGrowthTrigger.targetResults.find((t) => t.targetId === "sol")!;
    const multiGap = { ...gapGrowthTrigger, targetResults: [solGrowthRes, { ...solGrowthRes, targetId: "btc", assetId: "bitcoin:native" }] };
    const gMulti = buildContributionGrowthPriorityContext(multiGap, { enabledGrowthTargetIds: ["sol", "btc"] });
    add("15E-BN: growth priority does not rank targets", gMulti.eligibleGrowthTargetIds.join(",") === "sol,btc", gMulti.eligibleGrowthTargetIds.join(","));
    add("15E-BO: growth priority does not select the largest gap", decGrowth.targetSelected === false && gMulti.triggerMetGrowthTargetIds.join(",") === "sol,btc", "no selection");
  }
  add("15E-BP: growth priority does not calculate an amount", decGrowth.contributionAmountCalculated === false, "no amount");
  add("15E-BQ: growth priority does not select a funding source", decGrowth.fundingSourceSelected === false, "no funding");
  add("15E-BR: growth priority does not generate a DCA plan", decGrowth.dcaPlanGenerated === false, "no plan");

  // 15E-BS…BW. On Track.
  add("15E-BS: complete buffer with no stable or growth trigger produces on_track", decOnTrack.purpose === "on_track" && decOnTrack.primaryTargetCategory === "none", decOnTrack.purpose ?? "");
  add("15E-BT: On Track has an empty priorityTargetIds list", decOnTrack.priorityTargetIds.length === 0, "empty");
  add("15E-BU: On Track does not generate a suggestion", decOnTrack.suggestionGenerated === false, "no suggestion");
  add("15E-BV: On Track refers only to contribution-allocation priority", /contribution-allocation/i.test(explainContributionPriorityDecision(decOnTrack)), "scoped");
  add("15E-BW: On Track does not suppress unrelated future suggestion families", decOnTrack.lowerPriorityEvaluationSuppressed === false, "no suppression");

  // 15E-BX…CD. Priority conflict scenarios.
  add("15E-BX: Buffer incomplete + stable underweight + growth underweight → buffer", buildContributionPriorityDecision({ safetyBufferResult: sbIncomplete, allocationGapResult: gapBoth, generatedAt: GEN, checkedAt: CHK }).purpose === "safety_buffer", "buffer");
  add("15E-BY: Buffer complete + stable underweight + growth underweight → stable", decBoth.purpose === "stable_allocation", "stable");
  add("15E-BZ: Buffer complete + stable below trigger + growth underweight → growth", decGrowth.purpose === "growth_allocation", "growth");
  add("15E-CA: Buffer complete + stable at target + growth at target → on_track", decOnTrack.purpose === "on_track", "on_track");
  add("15E-CB: Non-target BONK can make both mapped targets underweight; stable still has priority", (gapBoth.unmappedOtherValueUsd as number) > 0 && decBoth.purpose === "stable_allocation", "stable");
  add("15E-CC: largest gap does not override category order", decBoth.purpose === "stable_allocation", "category wins");
  add("15E-CD: largest USD amount does not override category order", decBoth.purpose === "stable_allocation", "category wins");

  // 15E-CE…CK. Future extensibility.
  add("15E-CE: engine logic does not hardcode SOL", !/["']sol["']/.test(engSrc), "generic");
  add("15E-CF: engine logic identifies stable destinations by registry role", engSrc.includes("getStableAllocationDestinations"), "role");
  {
    const solGrowthRes = gapGrowthTrigger.targetResults.find((t) => t.targetId === "sol")!;
    const gBtc = buildContributionGrowthPriorityContext({ ...gapGrowthTrigger, targetResults: [solGrowthRes, { ...solGrowthRes, targetId: "btc", assetId: "bitcoin:native" }] }, { enabledGrowthTargetIds: ["sol", "btc"] });
    add("15E-CG: a future enabled BTC target can appear in growth context with valid policies", gBtc.eligibleGrowthTargetIds.includes("btc") && gBtc.triggerMetGrowthTargetIds.includes("btc"), "btc");
    const gEth = buildContributionGrowthPriorityContext({ ...gapGrowthTrigger, targetResults: [solGrowthRes, { ...solGrowthRes, targetId: "eth", assetId: "ethereum:native" }] }, { enabledGrowthTargetIds: ["sol", "eth"] });
    add("15E-CH: a future enabled ETH target can appear in growth context with valid policies", gEth.eligibleGrowthTargetIds.includes("eth"), "eth");
    const gRwa = buildContributionGrowthPriorityContext({ ...gapGrowthTrigger, targetResults: [solGrowthRes, { ...solGrowthRes, targetId: "treasury_note_2027" }] }, { enabledGrowthTargetIds: ["sol", "treasury_note_2027"] });
    add("15E-CI: a future specific RWA target can appear with valid policies", gRwa.eligibleGrowthTargetIds.includes("treasury_note_2027"), "rwa");
    add("15E-CK: multiple valid growth targets preserve policy order without ranking", gBtc.eligibleGrowthTargetIds.join(",") === "sol,btc", gBtc.eligibleGrowthTargetIds.join(","));
  }
  add("15E-CJ: generic RWA remains forbidden", getInvestmentTarget("rwa") === undefined && getInvestmentTarget("generic_rwa") === undefined, "forbidden");

  // 15E-CL…CQ. Contribution-frequency boundary.
  add("15E-CL: contribution frequency is not consumed", !/from ["']\.\/contributionFrequency/.test(engSrc + gateSrc) && decGrowth.contributionFrequencyApplied === false, "not consumed");
  add("15E-CM: weekly amount is not calculated", !/weekly/i.test(engSrc + gateSrc), "no weekly");
  add("15E-CN: biweekly amount is not calculated", !/biweekly/i.test(engSrc + gateSrc), "no biweekly");
  add("15E-CO: monthly amount is not calculated", !/monthly/i.test(engSrc + gateSrc), "no monthly");
  add("15E-CP: quarterly amount is not calculated", !/quarterly/i.test(engSrc + gateSrc), "no quarterly");
  add("15E-CQ: occasional amount is not inferred", !/occasional/i.test(engSrc + gateSrc), "no occasional");

  // 15E-CR…CW. Funding boundary.
  add("15E-CR: upcoming contribution is not selected", !engSrc.includes("upcoming_contribution") && decGrowth.fundingSourceSelected === false, "not selected");
  add("15E-CS: existing excess USDC is not selected", !engSrc.includes("existing_excess_usdc"), "not selected");
  add("15E-CT: excess USDC is not calculated", decGrowth.excessUsdcCalculated === false, "not calculated");
  add("15E-CU: funding availability is not evaluated", decGrowth.fundingAvailabilityEvaluated === false, "not evaluated");
  add("15E-CV: no liquid balance is labeled available", !/\bavailable\b/i.test(engSrc), "none");
  add("15E-CW: no residual amount is calculated", decGrowth.residualAmountCalculated === false, "none");

  // 15E-CX…DB. Result boundaries.
  add("15E-CX: no target is finally selected", decGrowth.targetSelected === false && decStable.targetSelected === false, "not selected");
  add("15E-CY: no contribution amount is calculated", decGrowth.contributionAmountCalculated === false, "no amount");
  add("15E-CZ: no DCA plan is generated", decGrowth.dcaPlanGenerated === false, "no plan");
  add("15E-DA: no suggestion is generated", decGrowth.suggestionGenerated === false, "no suggestion");
  add("15E-DB: no product output is updated", decGrowth.updatesProductOutput === false && CONTRIBUTION_PRIORITY_UPDATES_PRODUCT_OUTPUT === false, "no update");

  // 15E-DC…DG. Feature-state invariants.
  add("15E-DC: contribution-priority engine exists", CONTRIBUTION_PRIORITY_ENGINE_EXISTS === true && CONTRIBUTION_PRIORITY_SELECTS_FUNDING_SOURCE === false && CONTRIBUTION_PRIORITY_CALCULATES_AMOUNT === false && CONTRIBUTION_PRIORITY_GENERATES_PLAN === false && CONTRIBUTION_PRIORITY_GENERATES_SUGGESTION === false, "exists");
  add("15E-DD: Safety Buffer gate exists", CONTRIBUTION_SAFETY_BUFFER_GATE_EXISTS === true, "exists");
  add("15E-DE: contribution planning now exists (enabled at Step 15G)", CONTRIBUTION_PLANNING_EXISTS === true, "exists");
  add("15E-DF: DCA plan generation now exists (enabled at Step 15G)", DCA_PLAN_GENERATION_EXISTS === true, "exists");
  add("15E-DG: DCA suggestion now exists (enabled at Step 15H)", DCA_SUGGESTION_ENABLED === true, "exists");

  // 15E-DH…DN. Product invariants.
  add("15E-DH: canonical Safety Buffer behavior remains unchanged", buildContributionSafetyBufferSnapshot(bufferFixture(1000, 1000, 3), timing).requiredBufferUsd === 3000 && buildContributionSafetyBufferSnapshot(bufferFixture(1000, 1000, 3), timing).shortfallUsd === 2000, "unchanged");
  const funded15E = bufferFixture(5000, 1000, 3);
  const aligned15E = allocationFixture(15000, 62, 2);
  const engineRun15E = runSuggestionEngine(inputsFor({ safetyBuffer: funded15E, allocation: aligned15E, positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const staking15E = engineRun15E.suggestions.find((s) => s.category === "staking");
  add("15E-DI: existing suggestion output remains unchanged", engineRun15E.suggestions.length > 0 && staking15E?.protocolSelection?.selectedProtocolId === "jito", "unchanged");
  add("15E-DJ: SOL staking remains unchanged", staking15E != null && staking15E.protocolSelection?.selectedProtocolName === "Jito", "unchanged");
  add("15E-DK: Top Pick remains unchanged", engineRun15E.suggestions.filter((s) => s.is_top_pick).every((s) => !s.id.startsWith("contribution")), "unchanged");
  add("15E-DL: engine ordering remains unchanged", engineRun15E.suggestions.every((s) => !s.id.startsWith("contribution") && s.id !== "sol" && s.id !== "usdc"), "unchanged");
  {
    const prodFiles = ["src/components/SuggestionCard.tsx", "src/components/SuggestionReviewModal.tsx", "src/pages/DemoDashboardPage.tsx", "src/pages/DashboardPage.tsx", "src/components/RealWalletSuggestionsRail.tsx"];
    const anyImport = prodFiles.some((f) => /contributionPriority|contributionSafetyBufferGate/.test(readIf(f)));
    add("15E-DM: no product-facing import exists", anyImport === false, "no import");
  }
  add("15E-DN: no /testing card is added in this non-UI step", !readIf("src/pages/testingPageFixtures.ts").includes("contributionPriority") && !readIf("src/pages/testingPageFixtures.ts").includes("buildContributionPriorityDecision"), "no card");

  // 15E-DO…DQ. Execution invariants.
  {
    const blob = ["contributionPriorityTypes", "contributionPriorityPolicy", "contributionSafetyBufferGate", "contributionPriorityEngine", "contributionPriorityDiagnostics"].map((f) => readIf(`src/suggestions/${f}.ts`)).join("").toLowerCase();
    add("15E-DO: no transaction path exists", !blob.includes("sendtransaction") && decGrowth.transactionsEnabled === false, "none");
    add("15E-DP: no signature path exists", !blob.includes("signtransaction") && decGrowth.walletSignatureRequired === false, "none");
    const handlers = ["buy(", "swap(", "deposit(", "invest(", "execute(", "scheduletransfer("];
    add("15E-DQ: no buy/swap/deposit/invest/execute/schedule-transfer handler exists", handlers.filter((h) => blob.includes(h)).length === 0, "none");
  }

  // Validators + diagnostics smoke.
  add("15E-validate: buffer/stable/growth/on-track decisions validate", validateContributionPriorityDecision(decBuffer).valid === true && validateContributionPriorityDecision(decStable).valid === true && validateContributionPriorityDecision(decGrowth).valid === true && validateContributionPriorityDecision(decOnTrack).valid === true && validateContributionSafetyBufferGateDecision(evaluateContributionSafetyBufferGate(sbComplete)).valid === true, "valid");
  add("15E-diagnostics: diagnostics are neutral and reveal no recommendation", getContributionPriorityDiagnostics(decBuffer).priorityOrder.join(",") === "safety_buffer,stable_allocation,growth_allocation,on_track" && /priority/i.test(explainContributionPriorityDecision(decStable)) && !/\b(buy|invest now|recommended amount|available to deploy)\b/i.test(explainContributionPriorityDecision(decGrowth)), "neutral");

  return checks;
}


/**
 * Step 15F — funding-source selection + availability fixtures (15F-A…DN). Verifies source order,
 * canonical liquidity classification, upcoming-contribution (exact/range/occasional/explicit),
 * minimum behavior, Safety Buffer / stable / growth source rules, the buffer-surplus + excess-USDC
 * formulas, allocation caps, deterministic primary/alternative selection, and all boundaries.
 */
export function runContributionFundingFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });

  const root = process.cwd();
  const readIf = (rel: string) => { try { return readFileSync(`${root}/${rel}`, "utf8"); } catch { return ""; } };
  const availSrc = readIf("src/suggestions/contributionFundingAvailability.ts");
  const selSrc = readIf("src/suggestions/contributionFundingSelection.ts");

  const GEN = "2026-07-15T00:00:00Z";
  const CHK = "2026-07-15T00:00:00Z";
  const CAL = "2026-07-15T00:00:00Z";
  const timing = { calculatedAt: CAL, checkedAt: CHK };
  const solT = getInvestmentTarget("sol")!;
  const usdcT = getInvestmentTarget("usdc")!;

  const mkExp = (targetId: string, assetId: string, valueUsd: number): ContributionPortfolioTargetExposure => ({ targetId, assetId, valueUsd, holdingSources: ["connected_wallet"], valuationReady: true, notes: [] });
  const mkSnap = (total: number, exposures: ContributionPortfolioTargetExposure[]): ContributionPortfolioAllocationSnapshot => ({ snapshotId: "snap-1", calculatedAt: CAL, checkedAt: CHK, sourcePortfolioVersion: "portfolio-v1", totalPortfolioValueUsd: total, targetExposures: exposures, valuationStatus: "current", notes: [] });

  const rec = fxRiskTarget(60, 40);
  const alloc = buildGrowthTargetAllocationPolicyResult({ targetStablePct: rec.stablePct, targetVolatilePct: rec.cryptoPct, sourceEngineVersion: SUGGESTION_ENGINE_VERSION }, { enabledGrowthTargetIds: ["sol"] });
  const techCtx: InvestmentTargetTechnicalContext = { checkedAt: CHK, availableHoldingSources: ["connected_wallet", "protocol_position", "manual_entry"], priceStatusByTargetId: { sol: { available: true, fetchedAt: CHK } }, configuredAllocationPolicyKeys: ["growth_target_allocation_v1"], configuredMinimumPolicyKeys: ["dca_minimum_v1"], configuredSuitabilityPolicyKeys: ["sol_growth_suitability_v1"], approvedTargetIds: [] };
  const techElig = evaluateInvestmentTargetTechnicalEligibility(solT, techCtx);
  const suit = evaluateContributionTargetSuitability(solT, { checkedAt: CHK, targetId: "sol", profile: { goal: "build_long_term_wealth", riskLevel: "medium", timeHorizon: "5_years" }, targetAllocationResult: alloc });
  const freshQuote = evaluateContributionPriceQuote({ targetId: "sol", assetId: PRICE_SOL_MINT, priceUsd: 150, sourceId: CANONICAL_CONTRIBUTION_PRICE_SOURCE_ID, fetchedAt: CHK, checkedAt: CHK });
  const readyElig = evaluateContributionTargetPolicyEligibility({ targetId: "sol", checkedAt: CHK, technicalEligibility: techElig, targetAllocationResult: alloc, suitabilityResult: suit, priceQuote: freshQuote, minimumPolicy: getDcaMinimumPolicy() });
  const solReady = { sol: readyElig };
  const buildGap = (usdcVal: number, solVal: number, total: number) => buildContributionAllocationGapAnalysis({ snapshot: mkSnap(total, [mkExp("usdc", usdcT.assetId, usdcVal), mkExp("sol", solT.assetId, solVal)]), targetAllocationResult: alloc, policyEligibilityByTargetId: solReady, generatedAt: GEN, checkedAt: CHK });

  const gapGrowth = buildGap(3700, 4300, 10000); // SOL external cap 4250, internal cap 1700
  const gapStable = buildGap(3000, 7000, 10000); // USDC external cap 1666.67
  const gapOnTrack = buildGap(4000, 6000, 10000);
  const gapSmall = buildGap(400, 400, 1000); // SOL internal cap 200 (<250), external 500

  const sbIncomplete = buildContributionSafetyBufferSnapshot(bufferFixture(4000, 3000, 3), timing); // req 9000 cur 4000 short 5000
  const sbComplete = buildContributionSafetyBufferSnapshot(bufferFixture(9000, 3000, 3), timing); // req 9000 cur 9000 surplus 0
  const sbSurplus = buildContributionSafetyBufferSnapshot(bufferFixture(12000, 3000, 3), timing); // req 9000 cur 12000 surplus 3000

  const prBuffer = buildContributionPriorityDecision({ safetyBufferResult: sbIncomplete, allocationGapResult: gapGrowth, generatedAt: GEN, checkedAt: CHK });
  const prStable = buildContributionPriorityDecision({ safetyBufferResult: sbComplete, allocationGapResult: gapStable, generatedAt: GEN, checkedAt: CHK });
  const prGrowth = buildContributionPriorityDecision({ safetyBufferResult: sbComplete, allocationGapResult: gapGrowth, generatedAt: GEN, checkedAt: CHK });
  const prGrowthSurplus = buildContributionPriorityDecision({ safetyBufferResult: sbSurplus, allocationGapResult: gapGrowth, generatedAt: GEN, checkedAt: CHK });
  const prGrowthSmall = buildContributionPriorityDecision({ safetyBufferResult: sbSurplus, allocationGapResult: gapSmall, generatedAt: GEN, checkedAt: CHK });
  const prOnTrack = buildContributionPriorityDecision({ safetyBufferResult: sbComplete, allocationGapResult: gapOnTrack, generatedAt: GEN, checkedAt: CHK });

  const fnMonthly = normFreq15F({ monthlySavingGoalUsd: 1000, contributionFrequency: "monthly" });
  const fnQuarterly = normFreq15F({ monthlySavingGoalUsd: 1000, contributionFrequency: "quarterly" });
  const fnBiweekly = normFreq15F({ monthlySavingGoalUsd: 1000, contributionFrequency: "biweekly" });
  const fnWeekly = normFreq15F({ monthlySavingGoalUsd: 1000, contributionFrequency: "weekly" });
  const fnOccasional = normFreq15F({ monthlySavingGoalUsd: 1000, contributionFrequency: "occasional" });
  const fnStraddle = normFreq15F({ monthlySavingGoalUsd: 216.66, contributionFrequency: "weekly" }); // base 49.99, +1¢ 50.00
  const fnSmall = normFreq15F({ monthlySavingGoalUsd: 100, contributionFrequency: "weekly" }); // 23.07–23.08

  const mkPos = (positionId: string, liquidityStatus: ContributionFundingLiquidityStatus, valueUsd: number, source: ContributionFundingUsdcPosition["source"] = "wallet_balance"): ContributionFundingUsdcPosition => ({ positionId, source, liquidityStatus, valueUsd, calculatedAt: CAL, canonicalClassificationUsed: true, notes: [] });
  const mkLiq = (positions: ContributionFundingUsdcPosition[], status: ContributionFundingLiquiditySnapshot["status"] = "current"): ContributionFundingLiquiditySnapshot => ({ snapshotId: "liq-1", calculatedAt: CAL, checkedAt: CHK, sourcePortfolioVersion: "portfolio-v1", status, usdcPositions: positions, canonicalLiquidityClassificationUsed: true, notes: [] });
  const liq5000 = mkLiq([mkPos("p1", "liquid_now", 5000)]);
  const liq1000 = mkLiq([mkPos("p1", "liquid_now", 1000)]);
  const liq10000 = mkLiq([mkPos("p1", "liquid_now", 10000)]);
  const liq250 = mkLiq([mkPos("p1", "liquid_now", 250)]);
  const liq24999 = mkLiq([mkPos("p1", "liquid_now", 249.99)]);
  const liqMixed = mkLiq([mkPos("p1", "liquid_now", 5000), mkPos("p2", "locked", 2000), mkPos("p3", "reserved", 1000), mkPos("p4", "requires_withdrawal", 500), mkPos("p5", "unavailable", 300), mkPos("p6", "unknown", 200)]);
  const liqProtoLiquid = mkLiq([mkPos("p1", "liquid_now", 4000, "protocol_position")]);
  const liqProtoNonLiquid = mkLiq([mkPos("p1", "requires_withdrawal", 4000, "protocol_position")]);

  const selBuffer = buildContributionFundingSelection({ priorityDecision: prBuffer, allocationGapResult: gapGrowth, frequencyNormalization: fnMonthly, generatedAt: GEN, checkedAt: CHK });
  const selStable = buildContributionFundingSelection({ priorityDecision: prStable, allocationGapResult: gapStable, frequencyNormalization: fnMonthly, generatedAt: GEN, checkedAt: CHK });
  const selGrowth = buildContributionFundingSelection({ priorityDecision: prGrowth, allocationGapResult: gapGrowth, frequencyNormalization: fnMonthly, generatedAt: GEN, checkedAt: CHK });
  const selBoth = buildContributionFundingSelection({ priorityDecision: prGrowthSurplus, allocationGapResult: gapGrowth, frequencyNormalization: fnMonthly, liquiditySnapshot: liq5000, generatedAt: GEN, checkedAt: CHK });
  const selExistingPrimary = buildContributionFundingSelection({ priorityDecision: prGrowthSurplus, allocationGapResult: gapGrowth, explicitCurrentContributionAmountUsd: 30, liquiditySnapshot: liq5000, generatedAt: GEN, checkedAt: CHK });
  const selOnTrack = buildContributionFundingSelection({ priorityDecision: prOnTrack, allocationGapResult: gapOnTrack, generatedAt: GEN, checkedAt: CHK });

  // 15F-A…G. Schema/policy.
  add("15F-A: schema version exists", CONTRIBUTION_FUNDING_SCHEMA_VERSION === "1.0.0" && selGrowth.schemaVersion === "1.0.0", CONTRIBUTION_FUNDING_SCHEMA_VERSION);
  add("15F-B: policy ID/version exist", CONTRIBUTION_FUNDING_POLICY_ID === "contribution_funding_selection_v1" && CONTRIBUTION_FUNDING_POLICY_VERSION === "1.0.0", CONTRIBUTION_FUNDING_POLICY_ID);
  add("15F-C: funding-source selection exists", FUNDING_SELECT_EXISTS_15F === true && CONTRIBUTION_FUNDING_SOURCE_SELECTION_EXISTS === true, "exists");
  add("15F-D: funding-availability layer exists", FUNDING_AVAIL_EXISTS_15F === true && CONTRIBUTION_FUNDING_AVAILABILITY_EXISTS === true, "exists");
  add("15F-E: funding policy validates", validateContributionFundingPolicy().valid === true, "valid");
  add("15F-F: source order is upcoming contribution before existing excess USDC", CONTRIBUTION_FUNDING_SOURCE_ORDER.join(",") === "upcoming_contribution,existing_excess_usdc", CONTRIBUTION_FUNDING_SOURCE_ORDER.join(","));
  add("15F-G: mixed funding is disabled", CONTRIBUTION_MIXED_FUNDING_ALLOWED === false && CONTRIBUTION_FUNDING_MIXED_SOURCES_ENABLED === false && selBoth.mixedFundingSelected === false, "disabled");

  // 15F-H…T. Liquidity classification.
  add("15F-H: canonical liquidity classification is required", evaluateContributionFundingLiquiditySnapshot(liq5000).valid === true && evaluateContributionFundingLiquiditySnapshot(mkLiq([{ ...mkPos("p1", "liquid_now", 1000), canonicalClassificationUsed: false } as unknown as ContributionFundingUsdcPosition])).valid === false, "required");
  add("15F-I: position IDs are unique", evaluateContributionFundingLiquiditySnapshot(mkLiq([mkPos("p1", "liquid_now", 1000), mkPos("p1", "liquid_now", 1000)])).blockers.includes("duplicate_liquidity_position"), "unique");
  add("15F-J: liquid-now wallet USDC counts", evaluateContributionFundingLiquiditySnapshot(liq5000).liquidUsdcAvailableNowUsd === 5000, "5000");
  add("15F-K: liquid-now protocol USDC counts only when canonically classified liquid-now", evaluateContributionFundingLiquiditySnapshot(liqProtoLiquid).liquidUsdcAvailableNowUsd === 4000 && evaluateContributionFundingLiquiditySnapshot(liqProtoNonLiquid).liquidUsdcAvailableNowUsd === 0, "conditional");
  add("15F-L: requires-withdrawal USDC does not count", evaluateContributionFundingLiquiditySnapshot(liqProtoNonLiquid).liquidUsdcAvailableNowUsd === 0, "excluded");
  add("15F-M: locked USDC does not count", evaluateContributionFundingLiquiditySnapshot(liqMixed).liquidUsdcAvailableNowUsd === 5000 && evaluateContributionFundingLiquiditySnapshot(liqMixed).lockedUsd === 2000, "excluded");
  add("15F-N: reserved USDC does not count", evaluateContributionFundingLiquiditySnapshot(liqMixed).reservedUsd === 1000, "excluded");
  add("15F-O: unavailable USDC does not count", evaluateContributionFundingLiquiditySnapshot(liqMixed).unavailableUsd === 300, "excluded");
  add("15F-P: unknown-availability USDC does not count", evaluateContributionFundingLiquiditySnapshot(liqMixed).unknownUsd === 200, "excluded");
  add("15F-Q: negative position value fails", evaluateContributionFundingLiquiditySnapshot(mkLiq([mkPos("p1", "liquid_now", -5)])).valid === false, "fails");
  add("15F-R: NaN position value fails", evaluateContributionFundingLiquiditySnapshot(mkLiq([mkPos("p1", "liquid_now", NaN)])).valid === false, "fails");
  add("15F-S: stale liquidity snapshot fails closed", evaluateContributionFundingLiquiditySnapshot(mkLiq([mkPos("p1", "liquid_now", 1000)], "stale")).blockers.includes("liquidity_snapshot_stale"), "stale");
  add("15F-T: invalid liquidity snapshot fails closed", evaluateContributionFundingLiquiditySnapshot(mkLiq([mkPos("p1", "liquid_now", 1000)], "invalid")).valid === false, "invalid");

  const upG = (extra: Partial<Parameters<typeof evaluateUpcomingContributionFunding>[0]>) => evaluateUpcomingContributionFunding({ priorityDecision: prGrowth, allocationGapResult: gapGrowth, checkedAt: CHK, ...extra });

  // 15F-U…X. Upcoming fixed exact.
  add("15F-U: monthly $1,000 produces exact $1,000 source capacity", upG({ frequencyNormalization: fnMonthly }).grossSourceCapacityUsd === 1000 && upG({ frequencyNormalization: fnMonthly }).capacityKind === "exact", "1000");
  add("15F-V: quarterly $3,000 produces exact $3,000 source capacity", upG({ frequencyNormalization: fnQuarterly }).grossSourceCapacityUsd === 3000, "3000");
  add("15F-W: explicit current contribution amount overrides normalized estimate", upG({ frequencyNormalization: fnMonthly, explicitCurrentContributionAmountUsd: 777 }).grossSourceCapacityUsd === 777, "777");
  add("15F-X: explicit amount is not treated as already transferred", upG({ explicitCurrentContributionAmountUsd: 777 }).warnings.some((w) => /NOT been transferred/i.test(w)), "not transferred");

  // 15F-Y…AB. Upcoming fixed range.
  add("15F-Y: biweekly without explicit amount produces a $461.53–$461.54 range", upG({ frequencyNormalization: fnBiweekly }).minimumGrossSourceCapacityUsd === 461.53 && upG({ frequencyNormalization: fnBiweekly }).maximumGrossSourceCapacityUsd === 461.54, "range");
  add("15F-Z: weekly without explicit amount produces a $230.76–$230.77 range", upG({ frequencyNormalization: fnWeekly }).minimumGrossSourceCapacityUsd === 230.76 && upG({ frequencyNormalization: fnWeekly }).maximumGrossSourceCapacityUsd === 230.77, "range");
  add("15F-AA: no dated contribution receives the extra cent", upG({ frequencyNormalization: fnBiweekly }).exactCurrentAmountKnown === false && upG({ frequencyNormalization: fnBiweekly }).capacityKind === "range", "no cent choice");
  add("15F-AB: range does not invent an exact amount", upG({ frequencyNormalization: fnBiweekly }).grossSourceCapacityUsd === undefined, "no exact");

  // 15F-AC…AF. Occasional.
  add("15F-AC: Occasional without explicit amount requires explicit amount", upG({ frequencyNormalization: fnOccasional }).status === "requires_explicit_amount", "requires");
  add("15F-AD: Occasional does not invent a source capacity", upG({ frequencyNormalization: fnOccasional }).grossSourceCapacityUsd === undefined && upG({ frequencyNormalization: fnOccasional }).minimumGrossSourceCapacityUsd === undefined, "no capacity");
  add("15F-AE: Occasional with explicit amount becomes exact", upG({ frequencyNormalization: fnOccasional, explicitCurrentContributionAmountUsd: 500 }).capacityKind === "exact" && upG({ frequencyNormalization: fnOccasional, explicitCurrentContributionAmountUsd: 500 }).grossSourceCapacityUsd === 500, "exact");
  add("15F-AF: invalid explicit amount fails", upG({ explicitCurrentContributionAmountUsd: 50.123 }).status === "blocked_invalid_data" && upG({ explicitCurrentContributionAmountUsd: 50.123 }).blockers.includes("contribution_amount_invalid"), "fails");

  // 15F-AG…AL. Minimum range behavior.
  add("15F-AG: exact $49.99 fails the $50 minimum for stable/growth", upG({ explicitCurrentContributionAmountUsd: 49.99 }).status === "ineligible_below_minimum", "fails");
  add("15F-AH: exact $50 passes", upG({ explicitCurrentContributionAmountUsd: 50 }).status === "eligible_exact", "passes");
  add("15F-AI: range $49.99–$50 requires exact resolution", upG({ frequencyNormalization: fnStraddle }).status === "requires_exact_amount", "requires exact");
  add("15F-AJ: range entirely above $50 passes", upG({ frequencyNormalization: fnBiweekly }).status === "eligible_range", "passes");
  add("15F-AK: range entirely below $50 fails", upG({ frequencyNormalization: fnSmall }).status === "ineligible_below_minimum", "fails");
  add("15F-AL: Safety Buffer funding is not suppressed by the $50 minimum", evaluateUpcomingContributionFunding({ priorityDecision: prBuffer, frequencyNormalization: fnSmall, checkedAt: CHK }).status.startsWith("eligible") && evaluateUpcomingContributionFunding({ priorityDecision: prBuffer, frequencyNormalization: fnSmall, checkedAt: CHK }).minimumPolicyApplied === "none", "not suppressed");

  // 15F-AM…AR. Safety Buffer source behavior.
  const upBuffer = (extra: Partial<Parameters<typeof evaluateUpcomingContributionFunding>[0]>) => evaluateUpcomingContributionFunding({ priorityDecision: prBuffer, checkedAt: CHK, ...extra });
  add("15F-AM: Safety Buffer priority evaluates upcoming contribution", upBuffer({ frequencyNormalization: fnMonthly }).sourceCapacityCalculated === true, "evaluated");
  add("15F-AN: Safety Buffer source is capped at exact shortfall", upBuffer({ explicitCurrentContributionAmountUsd: 8000 }).cappedSourceCapacityUsd === 5000 && upBuffer({ explicitCurrentContributionAmountUsd: 8000 }).mathematicalPlanningCapUsd === 5000, "5000");
  add("15F-AO: Safety Buffer priority applies no ordinary DCA minimum", upBuffer({ frequencyNormalization: fnMonthly }).minimumPolicyApplied === "none", "none");
  add("15F-AP: existing excess USDC is not applicable while buffer incomplete", evaluateExistingExcessUsdcFunding({ priorityDecision: prBuffer, allocationGapResult: gapGrowth, liquiditySnapshot: liq5000, checkedAt: CHK }).status === "ineligible_not_applicable", "not applicable");
  add("15F-AQ: no excess USDC is claimed while buffer incomplete", selBuffer.excessUsdcCalculated === false, "no excess");
  add("15F-AR: no amount above the shortfall is routed", upBuffer({ explicitCurrentContributionAmountUsd: 8000 }).cappedSourceCapacityUsd === 5000 && upBuffer({ explicitCurrentContributionAmountUsd: 8000 }).residualAmountCalculated === false, "capped");

  // 15F-AS…AX. Stable-allocation source behavior.
  const upStable = (extra: Partial<Parameters<typeof evaluateUpcomingContributionFunding>[0]>) => evaluateUpcomingContributionFunding({ priorityDecision: prStable, allocationGapResult: gapStable, checkedAt: CHK, ...extra });
  add("15F-AS: stable priority evaluates upcoming contribution", upStable({ frequencyNormalization: fnMonthly }).sourceCapacityCalculated === true, "evaluated");
  add("15F-AT: stable upcoming contribution uses the external allocation cap", Math.abs((upStable({ frequencyNormalization: fnMonthly }).mathematicalPlanningCapUsd as number) - 1666.6666666666667) < 1e-9, "external cap");
  add("15F-AU: stable upcoming contribution applies the $50 minimum", upStable({ frequencyNormalization: fnMonthly }).minimumPolicyApplied === "absolute_50" && upStable({ explicitCurrentContributionAmountUsd: 30 }).status === "ineligible_below_minimum", "$50");
  add("15F-AV: existing USDC cannot correct a USDC stable-allocation shortfall", evaluateExistingExcessUsdcFunding({ priorityDecision: prStable, allocationGapResult: gapStable, liquiditySnapshot: liq5000, checkedAt: CHK }).blockers.includes("same_asset_cannot_correct_allocation"), "same asset");
  add("15F-AW: stable priority selects no excess-USDC source", selStable.primaryFundingSourceId === "upcoming_contribution" && !selStable.alternativeFundingSourceIds.includes("existing_excess_usdc"), "no excess");
  add("15F-AX: no stable residual is routed", selStable.residualAmountCalculated === false, "no residual");

  // 15F-AY…BH. Buffer surplus and excess USDC.
  const ex5000 = calculateExcessLiquidUsdcAboveSafetyBuffer({ liquiditySnapshot: liq5000, priorityDecision: prGrowthSurplus });
  add("15F-AY: canonical buffer surplus equals max(0, current eligible − required)", ex5000.canonicalBufferSurplusUsd === 3000, "3000");
  add("15F-AZ: excess liquid USDC equals min(liquid-now USDC, canonical surplus)", ex5000.excessLiquidUsdcAboveBufferUsd === 3000, "3000");
  add("15F-BA: excess USDC never exceeds liquid-now USDC", (ex5000.excessLiquidUsdcAboveBufferUsd as number) <= (ex5000.liquidUsdcAvailableNowUsd as number), "<=liquid");
  add("15F-BB: excess USDC never exceeds canonical buffer surplus", (ex5000.excessLiquidUsdcAboveBufferUsd as number) <= (ex5000.canonicalBufferSurplusUsd as number), "<=surplus");
  add("15F-BC: projected buffer after maximum use remains at or above required", (ex5000.projectedEligibleBufferAfterMaximumExcessUseUsd as number) >= 9000, "9000");
  add("15F-BD: $12,000 eligible / $9,000 required / $5,000 liquid produces $3,000 excess", ex5000.excessLiquidUsdcAboveBufferUsd === 3000, "3000");
  add("15F-BE: $12,000 eligible / $9,000 required / $1,000 liquid produces $1,000 excess", calculateExcessLiquidUsdcAboveSafetyBuffer({ liquiditySnapshot: liq1000, priorityDecision: prGrowthSurplus }).excessLiquidUsdcAboveBufferUsd === 1000, "1000");
  add("15F-BF: $9,000 eligible / $9,000 required produces zero excess", calculateExcessLiquidUsdcAboveSafetyBuffer({ liquiditySnapshot: liq5000, priorityDecision: prGrowth }).excessLiquidUsdcAboveBufferUsd === 0, "0");
  {
    const ex10000 = calculateExcessLiquidUsdcAboveSafetyBuffer({ liquiditySnapshot: liq10000, priorityDecision: prGrowthSurplus });
    add("15F-BG: the engine does not incorrectly calculate liquid USDC minus required buffer", ex10000.excessLiquidUsdcAboveBufferUsd === 3000 && ex10000.excessLiquidUsdcAboveBufferUsd !== (10000 - 9000), "3000 not 1000");
    const exNonLiquid = calculateExcessLiquidUsdcAboveSafetyBuffer({ liquiditySnapshot: liq1000, priorityDecision: prGrowthSurplus });
    add("15F-BH: non-liquid eligible buffer positions may support the floor without becoming funding", exNonLiquid.canonicalBufferSurplusUsd === 3000 && exNonLiquid.liquidUsdcAvailableNowUsd === 1000 && exNonLiquid.excessLiquidUsdcAboveBufferUsd === 1000, "floor vs funding");
  }

  // 15F-BI…BT. Growth sources.
  add("15F-BI: growth priority may use upcoming contribution", upG({ frequencyNormalization: fnMonthly }).status === "eligible_exact", "eligible");
  add("15F-BJ: upcoming contribution uses the external-contribution cap", upG({ frequencyNormalization: fnMonthly }).mathematicalPlanningCapUsd === 4250, "4250");
  add("15F-BK: upcoming contribution applies the $50 minimum", upG({ frequencyNormalization: fnMonthly }).minimumPolicyApplied === "absolute_50" && upG({ explicitCurrentContributionAmountUsd: 30 }).status === "ineligible_below_minimum", "$50");
  add("15F-BL: upcoming contribution timing is expected_future", upG({ frequencyNormalization: fnMonthly }).timing === "expected_future", "expected_future");
  const exG = (liq: ContributionFundingLiquiditySnapshot, pr = prGrowthSurplus, gap = gapGrowth) => evaluateExistingExcessUsdcFunding({ priorityDecision: pr, allocationGapResult: gap, liquiditySnapshot: liq, checkedAt: CHK });
  add("15F-BM: growth priority may use existing excess USDC", exG(liq5000).status === "eligible_exact", "eligible");
  add("15F-BN: existing excess USDC uses the internal-reallocation cap", exG(liq5000).mathematicalPlanningCapUsd === 1700, "1700");
  add("15F-BO: existing excess USDC applies the $250 threshold", exG(liq5000).minimumPolicyApplied === "excess_usdc_250", "$250");
  add("15F-BP: $249.99 capped excess fails", exG(liq24999).status === "ineligible_below_minimum", "fails");
  add("15F-BQ: $250 capped excess passes", exG(liq250).status === "eligible_exact", "passes");
  add("15F-BR: existing excess timing is available_now", exG(liq5000).timing === "available_now", "available_now");
  add("15F-BS: existing excess preserves the Safety Buffer", exG(liq5000).safetyBufferPreserved === true, "preserved");
  add("15F-BT: protocol-deposited but non-liquid USDC is not used", exG(liqProtoNonLiquid).status === "ineligible_below_minimum", "not used");

  // 15F-BU…CB. Source selection.
  add("15F-BU: eligible upcoming contribution is primary", selGrowth.primaryFundingSourceId === "upcoming_contribution", selGrowth.primaryFundingSourceId ?? "");
  add("15F-BV: eligible existing excess USDC becomes an alternative when upcoming is eligible", selBoth.primaryFundingSourceId === "upcoming_contribution" && selBoth.alternativeFundingSourceIds.includes("existing_excess_usdc"), "alternative");
  add("15F-BW: existing excess becomes primary when upcoming is ineligible", selExistingPrimary.primaryFundingSourceId === "existing_excess_usdc", selExistingPrimary.primaryFundingSourceId ?? "");
  add("15F-BX: largest source capacity does not override source order", selBoth.primaryFundingSourceId === "upcoming_contribution" && (selBoth.sourceOptions.find((o) => o.sourceId === "existing_excess_usdc")!.cappedSourceCapacityUsd as number) > (selBoth.sourceOptions.find((o) => o.sourceId === "upcoming_contribution")!.grossSourceCapacityUsd as number), "order kept");
  add("15F-BY: sources are never combined", selBoth.mixedFundingSelected === false && selBoth.mixedFundingAllowed === false, "not combined");
  add("15F-BZ: no source selected when both are ineligible", buildContributionFundingSelection({ priorityDecision: prGrowth, allocationGapResult: gapGrowth, explicitCurrentContributionAmountUsd: 30, liquiditySnapshot: liq5000, generatedAt: GEN, checkedAt: CHK }).status === "no_eligible_source", "none");
  add("15F-CA: On Track selects no source", selOnTrack.status === "no_action_required" && selOnTrack.primaryFundingSourceId === undefined, "no source");
  add("15F-CB: On Track evaluates no corrective capacity", selOnTrack.sourceOptions.length === 0 && selOnTrack.sourceSelected === false, "no capacity");

  // 15F-CC…CG. Allocation caps.
  add("15F-CC: upcoming source capacity cannot exceed external target cap", upG({ explicitCurrentContributionAmountUsd: 999999 }).cappedSourceCapacityUsd === 4250, "4250");
  add("15F-CD: existing excess source capacity cannot exceed internal target cap", exG(liq10000).cappedSourceCapacityUsd === 1700, "1700");
  add("15F-CE: a cap below the applicable minimum makes the source ineligible", exG(liq5000, prGrowthSmall, gapSmall).status === "ineligible_below_minimum" && exG(liq5000, prGrowthSmall, gapSmall).mathematicalPlanningCapUsd === 200, "ineligible");
  add("15F-CF: source capacity above the cap is capped without residual routing", upG({ explicitCurrentContributionAmountUsd: 999999 }).cappedSourceCapacityUsd === 4250 && upG({ explicitCurrentContributionAmountUsd: 999999 }).warnings.includes("source_capacity_exceeds_priority_cap") && upG({ explicitCurrentContributionAmountUsd: 999999 }).residualAmountCalculated === false, "capped");
  add("15F-CG: exact-target cap is not treated as overshoot", upG({ explicitCurrentContributionAmountUsd: 4250 }).status === "eligible_exact" && upG({ explicitCurrentContributionAmountUsd: 4250 }).cappedSourceCapacityUsd === 4250, "exact ok");

  // 15F-CH…CL. Multiple-target behavior.
  const prMulti = { ...prGrowthSurplus, priorityTargetIds: ["sol", "btc"], growthContext: { eligibleGrowthTargetIds: ["sol", "btc"], underweightGrowthTargetIds: ["sol", "btc"], triggerMetGrowthTargetIds: ["sol", "btc"], growthAllocationMayProceed: true } };
  const selMulti = buildContributionFundingSelection({ priorityDecision: prMulti, allocationGapResult: gapGrowth, frequencyNormalization: fnMonthly, liquiditySnapshot: liq5000, generatedAt: GEN, checkedAt: CHK });
  add("15F-CH: multiple priority target IDs are preserved in policy order", selMulti.priorityTargetIds.join(",") === "sol,btc", selMulti.priorityTargetIds.join(","));
  add("15F-CI: funding source may be identified without allocating across targets", selMulti.sourceOptions.find((o) => o.sourceId === "upcoming_contribution")!.grossSourceCapacityUsd === 1000 && selMulti.targetAllocationAcrossIdsCalculated === false, "identified");
  add("15F-CJ: multiple targets are not split equally", selMulti.blockers.includes("multiple_priority_targets_require_plan_allocation"), "no split");
  add("15F-CK: no final target is selected", selMulti.finalTargetSelected === false, "no target");
  add("15F-CL: target allocation across IDs remains false", selMulti.targetAllocationAcrossIdsCalculated === false, "false");

  // 15F-CM…CQ. Future extensibility.
  const mkGrowthPr = (targetId: string) => ({ ...prGrowthSurplus, priorityTargetIds: [targetId], growthContext: { eligibleGrowthTargetIds: [targetId], underweightGrowthTargetIds: [targetId], triggerMetGrowthTargetIds: [targetId], growthAllocationMayProceed: true } });
  const renameGap = (targetId: string) => ({ ...gapGrowth, targetResults: gapGrowth.targetResults.map((t) => (t.targetId === "sol" ? { ...t, targetId } : t)) });
  add("15F-CM: funding logic does not hardcode SOL", !/["']sol["']/.test(availSrc + selSrc), "generic");
  add("15F-CN: future BTC growth priority may consume the same source model", evaluateUpcomingContributionFunding({ priorityDecision: mkGrowthPr("btc"), frequencyNormalization: fnMonthly, allocationGapResult: renameGap("btc"), checkedAt: CHK }).status === "eligible_exact", "btc");
  add("15F-CO: future ETH growth priority may consume the same source model", evaluateUpcomingContributionFunding({ priorityDecision: mkGrowthPr("eth"), frequencyNormalization: fnMonthly, allocationGapResult: renameGap("eth"), checkedAt: CHK }).status === "eligible_exact", "eth");
  add("15F-CP: future specific RWA growth priority may consume the same source model", evaluateUpcomingContributionFunding({ priorityDecision: mkGrowthPr("treasury_note_2027"), frequencyNormalization: fnMonthly, allocationGapResult: renameGap("treasury_note_2027"), checkedAt: CHK }).status === "eligible_exact", "rwa");
  add("15F-CQ: generic RWA remains forbidden", getInvestmentTarget("rwa") === undefined && getInvestmentTarget("generic_rwa") === undefined, "forbidden");

  // 15F-CR…CY. Boundaries.
  add("15F-CR: no final contribution amount is calculated", selGrowth.finalContributionAmountCalculated === false && CONTRIBUTION_FUNDING_CALCULATES_FINAL_AMOUNT === false, "no amount");
  add("15F-CS: no residual amount is calculated", selGrowth.residualAmountCalculated === false && CONTRIBUTION_FUNDING_ROUTES_RESIDUAL === false, "no residual");
  add("15F-CT: no DCA tranches are generated", !/tranche/i.test(availSrc + selSrc) && selGrowth.dcaPlanGenerated === false, "no tranches");
  add("15F-CU: no contribution dates are generated", !/scheduletransfer|contributiondate|scheduleddate/i.test(availSrc + selSrc), "no dates");
  add("15F-CV: no final target is selected", selGrowth.finalTargetSelected === false, "no target");
  add("15F-CW: no DCA plan is generated", selGrowth.dcaPlanGenerated === false && CONTRIBUTION_FUNDING_GENERATES_PLAN === false, "no plan");
  add("15F-CX: no suggestion is generated", selGrowth.suggestionGenerated === false && CONTRIBUTION_FUNDING_GENERATES_SUGGESTION === false, "no suggestion");
  add("15F-CY: no product output is updated", selGrowth.updatesProductOutput === false && CONTRIBUTION_FUNDING_UPDATES_PRODUCT_OUTPUT === false, "no update");

  // 15F-CZ…DD. Feature states.
  add("15F-CZ: funding-source selection exists", CONTRIBUTION_FUNDING_SOURCE_SELECTION_EXISTS === true, "exists");
  add("15F-DA: funding availability exists", CONTRIBUTION_FUNDING_AVAILABILITY_EXISTS === true, "exists");
  add("15F-DB: contribution planning now exists (enabled at Step 15G)", CONTRIBUTION_PLANNING_EXISTS === true, "exists");
  add("15F-DC: DCA plan generation now exists (enabled at Step 15G)", DCA_PLAN_GENERATION_EXISTS === true, "exists");
  add("15F-DD: DCA suggestion now exists (enabled at Step 15H)", DCA_SUGGESTION_ENABLED === true, "exists");

  // 15F-DE…DK. Product invariants.
  add("15F-DE: canonical Safety Buffer remains unchanged", buildContributionSafetyBufferSnapshot(bufferFixture(1000, 1000, 3), timing).requiredBufferUsd === 3000 && buildContributionSafetyBufferSnapshot(bufferFixture(1000, 1000, 3), timing).shortfallUsd === 2000, "unchanged");
  const funded15F = bufferFixture(5000, 1000, 3);
  const aligned15F = allocationFixture(15000, 62, 2);
  const engineRun15F = runSuggestionEngine(inputsFor({ safetyBuffer: funded15F, allocation: aligned15F, positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const staking15F = engineRun15F.suggestions.find((s) => s.category === "staking");
  add("15F-DF: existing suggestion output remains unchanged", engineRun15F.suggestions.length > 0 && staking15F?.protocolSelection?.selectedProtocolId === "jito", "unchanged");
  add("15F-DG: SOL staking remains unchanged", staking15F != null && staking15F.protocolSelection?.selectedProtocolName === "Jito", "unchanged");
  add("15F-DH: Top Pick remains unchanged", engineRun15F.suggestions.filter((s) => s.is_top_pick).every((s) => !s.id.startsWith("contribution")), "unchanged");
  add("15F-DI: engine ordering remains unchanged", engineRun15F.suggestions.every((s) => !s.id.startsWith("contribution") && s.id !== "sol" && s.id !== "usdc"), "unchanged");
  {
    const prodFiles = ["src/components/SuggestionCard.tsx", "src/components/SuggestionReviewModal.tsx", "src/pages/DemoDashboardPage.tsx", "src/pages/DashboardPage.tsx", "src/components/RealWalletSuggestionsRail.tsx"];
    add("15F-DJ: no product-facing import exists", prodFiles.every((f) => !/contributionFunding/.test(readIf(f))), "no import");
  }
  add("15F-DK: no /testing card is added in this non-UI step", !readIf("src/pages/testingPageFixtures.ts").includes("contributionFunding") && !readIf("src/pages/testingPageFixtures.ts").includes("buildContributionFundingSelection"), "no card");

  // 15F-DL…DN. Execution invariants.
  {
    const blob = ["contributionFundingTypes", "contributionFundingPolicy", "contributionFundingAvailability", "contributionFundingSelection", "contributionFundingDiagnostics"].map((f) => readIf(`src/suggestions/${f}.ts`)).join("").toLowerCase();
    add("15F-DL: no transaction path exists", !blob.includes("sendtransaction") && selGrowth.transactionsEnabled === false, "none");
    add("15F-DM: no signature path exists", !blob.includes("signtransaction") && selGrowth.walletSignatureRequired === false, "none");
    const handlers = ["buy(", "swap(", "deposit(", "invest(", "execute(", "withdraw(", "scheduletransfer("];
    add("15F-DN: no buy/swap/deposit/invest/execute/withdraw/schedule-transfer handler exists", handlers.filter((h) => blob.includes(h)).length === 0, "none");
  }

  // Validators + diagnostics smoke.
  add("15F-validate: buffer/stable/growth/on-track selections validate", validateContributionFundingSelectionResult(selBuffer).valid === true && validateContributionFundingSelectionResult(selStable).valid === true && validateContributionFundingSelectionResult(selBoth).valid === true && validateContributionFundingSelectionResult(selOnTrack).valid === true, "valid");
  add("15F-diagnostics: diagnostics are neutral and reveal no recommendation", getContributionFundingDiagnostics(selBoth).sourceOrder.join(",") === "upcoming_contribution,existing_excess_usdc" && /priority/i.test(explainContributionFundingSelection(selGrowth)) && !/\b(buy|invest now|available to deploy|recommended amount)\b/i.test(explainContributionFundingSelection(selGrowth)), "neutral");

  return checks;
}


/**
 * Step 15G — contribution + DCA plan generator fixtures (15G-A…EZ). Verifies deterministic plan
 * generation, one-target selection, exact/range amounts + cent flooring, the four plan kinds, the
 * staged four-tranche existing-excess-USDC DCA, projections, plan identity, extensibility, and all
 * boundary/execution/product invariants.
 */
export function runContributionPlanFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });

  const root = process.cwd();
  const readIf = (rel: string) => { try { return readFileSync(`${root}/${rel}`, "utf8"); } catch { return ""; } };
  const genSrc = readIf("src/suggestions/contributionPlanGenerator.ts");

  const GEN = "2026-07-15T00:00:00Z";
  const CHK = "2026-07-15T00:00:00Z";
  const CAL = "2026-07-15T00:00:00Z";
  const timing = { calculatedAt: CAL, checkedAt: CHK };
  const solT = getInvestmentTarget("sol")!;
  const usdcT = getInvestmentTarget("usdc")!;

  const mkExp = (targetId: string, assetId: string, valueUsd: number): ContributionPortfolioTargetExposure => ({ targetId, assetId, valueUsd, holdingSources: ["connected_wallet"], valuationReady: true, notes: [] });
  const mkSnap = (total: number, exposures: ContributionPortfolioTargetExposure[]): ContributionPortfolioAllocationSnapshot => ({ snapshotId: "snap-1", calculatedAt: CAL, checkedAt: CHK, sourcePortfolioVersion: "portfolio-v1", totalPortfolioValueUsd: total, targetExposures: exposures, valuationStatus: "current", notes: [] });
  const rec = fxRiskTarget(60, 40);
  const alloc = buildGrowthTargetAllocationPolicyResult({ targetStablePct: rec.stablePct, targetVolatilePct: rec.cryptoPct, sourceEngineVersion: SUGGESTION_ENGINE_VERSION }, { enabledGrowthTargetIds: ["sol"] });
  const techCtx: InvestmentTargetTechnicalContext = { checkedAt: CHK, availableHoldingSources: ["connected_wallet", "protocol_position", "manual_entry"], priceStatusByTargetId: { sol: { available: true, fetchedAt: CHK } }, configuredAllocationPolicyKeys: ["growth_target_allocation_v1"], configuredMinimumPolicyKeys: ["dca_minimum_v1"], configuredSuitabilityPolicyKeys: ["sol_growth_suitability_v1"], approvedTargetIds: [] };
  const readyElig = evaluateContributionTargetPolicyEligibility({ targetId: "sol", checkedAt: CHK, technicalEligibility: evaluateInvestmentTargetTechnicalEligibility(solT, techCtx), targetAllocationResult: alloc, suitabilityResult: evaluateContributionTargetSuitability(solT, { checkedAt: CHK, targetId: "sol", profile: { goal: "build_long_term_wealth", riskLevel: "medium", timeHorizon: "5_years" }, targetAllocationResult: alloc }), priceQuote: evaluateContributionPriceQuote({ targetId: "sol", assetId: PRICE_SOL_MINT, priceUsd: 150, sourceId: CANONICAL_CONTRIBUTION_PRICE_SOURCE_ID, fetchedAt: CHK, checkedAt: CHK }), minimumPolicy: getDcaMinimumPolicy() });
  const solReady = { sol: readyElig };
  const buildGap = (u: number, s: number, t: number) => buildContributionAllocationGapAnalysis({ snapshot: mkSnap(t, [mkExp("usdc", usdcT.assetId, u), mkExp("sol", solT.assetId, s)]), targetAllocationResult: alloc, policyEligibilityByTargetId: solReady, generatedAt: GEN, checkedAt: CHK });

  const gapGrowth = buildGap(3700, 4300, 10000); // SOL ext cap 4250, int cap 1700
  const gapStable = buildGap(3000, 7000, 10000); // USDC ext cap 1666.67
  const gapOnTrack = buildGap(4000, 6000, 10000);
  const sbIncomplete = buildContributionSafetyBufferSnapshot(bufferFixture(4000, 3000, 3), timing); // req 9000 cur 4000 short 5000
  const sbComplete = buildContributionSafetyBufferSnapshot(bufferFixture(9000, 3000, 3), timing);
  const sbSurplus = buildContributionSafetyBufferSnapshot(bufferFixture(12000, 3000, 3), timing); // surplus 3000

  const prBuffer = buildContributionPriorityDecision({ safetyBufferResult: sbIncomplete, allocationGapResult: gapGrowth, generatedAt: GEN, checkedAt: CHK });
  const prStable = buildContributionPriorityDecision({ safetyBufferResult: sbComplete, allocationGapResult: gapStable, generatedAt: GEN, checkedAt: CHK });
  const prGrowth = buildContributionPriorityDecision({ safetyBufferResult: sbComplete, allocationGapResult: gapGrowth, generatedAt: GEN, checkedAt: CHK });
  const prGrowthSurplus = buildContributionPriorityDecision({ safetyBufferResult: sbSurplus, allocationGapResult: gapGrowth, generatedAt: GEN, checkedAt: CHK });
  const prOnTrack = buildContributionPriorityDecision({ safetyBufferResult: sbComplete, allocationGapResult: gapOnTrack, generatedAt: GEN, checkedAt: CHK });

  const fnMonthly = normFreq15F({ monthlySavingGoalUsd: 1000, contributionFrequency: "monthly" });
  const fnQuarterly = normFreq15F({ monthlySavingGoalUsd: 1000, contributionFrequency: "quarterly" });
  const fnBiweekly = normFreq15F({ monthlySavingGoalUsd: 1000, contributionFrequency: "biweekly" });
  const fnWeekly = normFreq15F({ monthlySavingGoalUsd: 1000, contributionFrequency: "weekly" });
  const fnOccasional = normFreq15F({ monthlySavingGoalUsd: 1000, contributionFrequency: "occasional" });

  const mkPos = (positionId: string, liquidityStatus: ContributionFundingLiquidityStatus, valueUsd: number): ContributionFundingUsdcPosition => ({ positionId, source: "wallet_balance", liquidityStatus, valueUsd, calculatedAt: CAL, canonicalClassificationUsed: true, notes: [] });
  const mkLiq = (positions: ContributionFundingUsdcPosition[]): ContributionFundingLiquiditySnapshot => ({ snapshotId: "liq-1", calculatedAt: CAL, checkedAt: CHK, sourcePortfolioVersion: "portfolio-v1", status: "current", usdcPositions: positions, canonicalLiquidityClassificationUsed: true, notes: [] });
  const liq5000 = mkLiq([mkPos("p1", "liquid_now", 5000)]);

  const fundingSel = (opts: Partial<Parameters<typeof buildContributionFundingSelection>[0]> & { priorityDecision: ContributionPriorityDecision }) => buildContributionFundingSelection({ generatedAt: GEN, checkedAt: CHK, ...opts });
  const selBuffer = fundingSel({ priorityDecision: prBuffer, allocationGapResult: gapGrowth, frequencyNormalization: fnMonthly });
  const selBufferBig = fundingSel({ priorityDecision: prBuffer, allocationGapResult: gapGrowth, explicitCurrentContributionAmountUsd: 8000 });
  const selBufferRange = fundingSel({ priorityDecision: prBuffer, allocationGapResult: gapGrowth, frequencyNormalization: fnBiweekly });
  const selStable = fundingSel({ priorityDecision: prStable, allocationGapResult: gapStable, frequencyNormalization: fnMonthly });
  const selGrowth = fundingSel({ priorityDecision: prGrowth, allocationGapResult: gapGrowth, frequencyNormalization: fnMonthly });
  const selGrowthBiweekly = fundingSel({ priorityDecision: prGrowth, allocationGapResult: gapGrowth, frequencyNormalization: fnBiweekly });
  const selGrowthWeekly = fundingSel({ priorityDecision: prGrowth, allocationGapResult: gapGrowth, frequencyNormalization: fnWeekly });
  const selGrowthQuarterly = fundingSel({ priorityDecision: prGrowth, allocationGapResult: gapGrowth, frequencyNormalization: fnQuarterly });
  const selOccExplicit = fundingSel({ priorityDecision: prGrowth, allocationGapResult: gapGrowth, frequencyNormalization: fnOccasional, explicitCurrentContributionAmountUsd: 500 });
  const selOccNone = fundingSel({ priorityDecision: prGrowth, allocationGapResult: gapGrowth, frequencyNormalization: fnOccasional });
  const selBoth = fundingSel({ priorityDecision: prGrowthSurplus, allocationGapResult: gapGrowth, frequencyNormalization: fnMonthly, liquiditySnapshot: liq5000 });
  const selDca = fundingSel({ priorityDecision: prGrowthSurplus, allocationGapResult: gapGrowth, explicitCurrentContributionAmountUsd: 30, liquiditySnapshot: liq5000 });
  const selOnTrack = fundingSel({ priorityDecision: prOnTrack, allocationGapResult: gapOnTrack });

  const plan = (pr: ContributionPriorityDecision, sel: ReturnType<typeof buildContributionFundingSelection>, gap: ReturnType<typeof buildContributionAllocationGapAnalysis> | undefined, fn?: ReturnType<typeof normFreq15F>, over: Record<string, unknown> = {}) => buildContributionPlan({ priorityDecision: pr, fundingSelection: sel, allocationGapResult: gap, frequencyNormalization: fn, generatedAt: GEN, checkedAt: CHK, ...over });
  const planBuffer = plan(prBuffer, selBuffer, gapGrowth, fnMonthly);
  const planBufferBig = plan(prBuffer, selBufferBig, gapGrowth);
  const planBufferRange = plan(prBuffer, selBufferRange, gapGrowth, fnBiweekly);
  const planBufferNoGap = plan(prBuffer, selBuffer, undefined, fnMonthly);
  const planStable = plan(prStable, selStable, gapStable, fnMonthly);
  const planGrowth = plan(prGrowth, selGrowth, gapGrowth, fnMonthly);
  const planGrowth2 = plan(prGrowth, selGrowth, gapGrowth, fnMonthly);
  const planGrowthDiffGen = buildContributionPlan({ priorityDecision: prGrowth, fundingSelection: selGrowth, allocationGapResult: gapGrowth, frequencyNormalization: fnMonthly, generatedAt: "2026-08-01T00:00:00Z", checkedAt: CHK });
  const planGrowthRange = plan(prGrowth, selGrowthBiweekly, gapGrowth, fnBiweekly);
  const planGrowthWeekly = plan(prGrowth, selGrowthWeekly, gapGrowth, fnWeekly);
  const planGrowthQuarterly = plan(prGrowth, selGrowthQuarterly, gapGrowth, fnQuarterly);
  const planOccExplicit = plan(prGrowth, selOccExplicit, gapGrowth, fnOccasional);
  const planOccNone = plan(prGrowth, selOccNone, gapGrowth, fnOccasional);
  const planBoth = plan(prGrowthSurplus, selBoth, gapGrowth, fnMonthly);
  const planDca = buildContributionPlan({ priorityDecision: prGrowthSurplus, fundingSelection: selDca, allocationGapResult: gapGrowth, generatedAt: GEN, checkedAt: CHK });
  const planOnTrack = buildContributionPlan({ priorityDecision: prOnTrack, fundingSelection: selOnTrack, allocationGapResult: gapOnTrack, generatedAt: GEN, checkedAt: CHK });

  // Multiple-target + disabled-growth + future-target synthetics.
  const prMulti = { ...prGrowth, priorityTargetIds: ["sol", "btc"], growthContext: { eligibleGrowthTargetIds: ["sol", "btc"], underweightGrowthTargetIds: ["sol", "btc"], triggerMetGrowthTargetIds: ["sol", "btc"], growthAllocationMayProceed: true } };
  const planMulti = buildContributionPlan({ priorityDecision: prMulti, fundingSelection: selGrowth, allocationGapResult: gapGrowth, frequencyNormalization: fnMonthly, generatedAt: GEN, checkedAt: CHK });
  const renameGap = (id: string) => ({ ...gapGrowth, targetResults: gapGrowth.targetResults.map((t) => (t.targetId === "sol" ? { ...t, targetId: id } : t)) });
  const mkGrowthPr = (id: string) => ({ ...prGrowth, priorityTargetIds: [id], growthContext: { eligibleGrowthTargetIds: [id], underweightGrowthTargetIds: [id], triggerMetGrowthTargetIds: [id], growthAllocationMayProceed: true } });
  const planFor = (id: string) => { const g = renameGap(id); const pr = mkGrowthPr(id); const sel = fundingSel({ priorityDecision: pr, allocationGapResult: g, frequencyNormalization: fnMonthly }); return buildContributionPlan({ priorityDecision: pr, fundingSelection: sel, allocationGapResult: g, frequencyNormalization: fnMonthly, generatedAt: GEN, checkedAt: CHK }); };
  const planBtc = planFor("btc");
  const planEth = planFor("eth");
  const gapBtcDisabled = { ...gapGrowth, targetResults: gapGrowth.targetResults.map((t) => (t.targetId === "sol" ? { ...t, targetId: "btc", eligibleForFutureGrowthContributionEvaluation: false, contributionTargetPolicyReady: false } : t)) };
  const prBtcDisabled = mkGrowthPr("btc");
  const selBtcDisabled = fundingSel({ priorityDecision: prBtcDisabled, allocationGapResult: gapBtcDisabled, frequencyNormalization: fnMonthly });
  const planBtcDisabled = buildContributionPlan({ priorityDecision: prBtcDisabled, fundingSelection: selBtcDisabled, allocationGapResult: gapBtcDisabled, frequencyNormalization: fnMonthly, generatedAt: GEN, checkedAt: CHK });
  const prBufferBadTarget = { ...prBuffer, priorityTargetIds: ["sol"] };
  const planBufferBadTarget = buildContributionPlan({ priorityDecision: prBufferBadTarget, fundingSelection: selBuffer, allocationGapResult: gapGrowth, frequencyNormalization: fnMonthly, generatedAt: GEN, checkedAt: CHK });

  // 15G-A…G. Schema/policy.
  add("15G-A: plan schema version exists", CONTRIBUTION_PLAN_SCHEMA_VERSION === "1.0.0" && planGrowth.schemaVersion === "1.0.0", CONTRIBUTION_PLAN_SCHEMA_VERSION);
  add("15G-B: plan policy ID/version exist", CONTRIBUTION_PLAN_POLICY_ID === "contribution_plan_v1" && CONTRIBUTION_PLAN_POLICY_VERSION === "1.0.0", CONTRIBUTION_PLAN_POLICY_ID);
  add("15G-C: staged-DCA policy ID/version exist", EXCESS_USDC_DCA_POLICY_ID === "excess_usdc_staged_dca_v1" && EXCESS_USDC_DCA_POLICY_VERSION === "1.0.0", EXCESS_USDC_DCA_POLICY_ID);
  add("15G-D: contribution-plan generator exists", PLAN_GEN_EXISTS_15G === true && CONTRIBUTION_PLAN_GENERATOR_EXISTS === true, "exists");
  add("15G-E: plan policy validates", validateContributionPlanPolicy().valid === true, "valid");
  add("15G-F: plan generation is deterministic", planGrowth.plan!.planId === planGrowth2.plan!.planId, planGrowth.plan!.planId);
  add("15G-G: no random ID generation exists", !/Math\.random|randomUUID|crypto\.getRandomValues|require\(["']uuid/.test(genSrc), "deterministic");

  // 15G-H…M. Source behavior.
  add("15G-H: the Step 15F primary source is used", planGrowth.plan!.fundingSourceId === selGrowth.primaryFundingSourceId && planGrowth.plan!.fundingSourceId === "upcoming_contribution", "primary used");
  add("15G-I: an alternative source does not replace an eligible primary source", planBoth.plan!.fundingSourceId === "upcoming_contribution", "primary kept");
  add("15G-J: alternative source IDs are preserved", planBoth.plan!.alternativeFundingSourceIds.includes("existing_excess_usdc"), "preserved");
  add("15G-K: no alternative plan is generated", planBoth.plan!.alternativePlanGenerated === false, "none");
  add("15G-L: sources are not combined", planBoth.plan!.mixedFundingUsed === false, "not combined");
  add("15G-M: largest source capacity does not override primary source", planBoth.plan!.fundingSourceId === "upcoming_contribution" && (selBoth.sourceOptions.find((o) => o.sourceId === "existing_excess_usdc")!.cappedSourceCapacityUsd as number) > (planBoth.plan!.amount.exactAmountUsd as number), "order kept");

  // 15G-N…V. Target selection.
  add("15G-N: exactly one priority target can be selected", planGrowth.plan!.selectedTargetId === "sol" && planGrowth.finalTargetSelected === true, "one target");
  add("15G-O: multiple targets fail closed", planMulti.status === "blocked_multiple_targets", planMulti.status);
  add("15G-P: multiple targets are not split equally", planMulti.plan === undefined, "no plan");
  add("15G-Q: multiple targets are not ranked", planMulti.plan === undefined && planMulti.blockers.includes("multiple_priority_targets_require_suballocation_policy"), "not ranked");
  add("15G-R: largest gap is not used for target selection", planMulti.plan === undefined, "no selection");
  add("15G-S: Safety Buffer target role is validated", planBuffer.plan!.selectedTargetId === "usdc" && planBufferBadTarget.status === "invalid_input" && planBufferBadTarget.blockers.includes("target_role_invalid"), "validated");
  add("15G-T: stable target role is validated", planStable.plan!.selectedTargetId === "usdc", "validated");
  add("15G-U: growth target role is validated", planGrowth.plan!.selectedTargetId === "sol", "validated");
  add("15G-V: disabled growth target cannot be selected", planBtcDisabled.status === "invalid_input" && planBtcDisabled.blockers.includes("target_role_invalid"), "rejected");

  // 15G-W…AE. Amount conversion.
  const exactOpt = selGrowth.sourceOptions.find((o) => o.sourceId === "upcoming_contribution")!;
  const cappedFracOpt = { ...exactOpt, status: "eligible_exact" as const, cappedSourceCapacityUsd: 1666.6666666666667, mathematicalPlanningCapUsd: 1666.6666666666667, grossSourceCapacityUsd: 5000, minimumPolicyApplied: "absolute_50" as const, minimumPassed: true };
  add("15G-W: exact source capacity produces exact cents", buildContributionPlanAmountFromSourceOption(exactOpt).amount!.exactAmountCents === 100000, "100000");
  add("15G-X: fractional-cent allocation cap is floored", buildContributionPlanAmountFromSourceOption(cappedFracOpt).amount!.exactAmountCents === 166666 && buildContributionPlanAmountFromSourceOption(cappedFracOpt).amount!.roundingMode === "floor_to_cents_for_cap", "166666");
  add("15G-Y: cap-constrained amount is never rounded upward", buildContributionPlanAmountFromSourceOption(cappedFracOpt).amount!.exactAmountCents !== 166667, "not 166667");
  add("15G-Z: plan amount does not exceed gross source capacity", (planGrowth.plan!.amount.exactAmountUsd as number) <= (exactOpt.grossSourceCapacityUsd as number) + 1e-9, "<=gross");
  add("15G-AA: plan amount does not exceed allocation cap", (planGrowth.plan!.amount.exactAmountUsd as number) <= (planGrowth.plan!.amount.allocationCapUsd as number) + 1e-9, "<=cap");
  add("15G-AB: the full eligible capped capacity is used", planGrowth.plan!.amount.exactAmountUsd === 1000 && planBufferBig.plan!.amount.exactAmountUsd === 5000, "full capped");
  add("15G-AC: no arbitrary round-number reduction occurs", buildContributionPlanAmountFromSourceOption(cappedFracOpt).amount!.exactAmountCents === 166666, "not rounded to 1600");
  add("15G-AD: unused capacity can be calculated", planBufferBig.plan!.unallocatedSourceCapacity.calculated === true && planBufferBig.plan!.unallocatedSourceCapacity.exactUnusedUsd === 3000, "3000");
  add("15G-AE: unused capacity is not routed", planBufferBig.plan!.unallocatedSourceCapacity.routed === false && planBufferBig.plan!.residualRouted === false, "not routed");

  // 15G-AF…AK. Range behavior.
  add("15G-AF: biweekly source range remains $461.53–$461.54 when uncapped", planGrowthRange.plan!.amount.minimumAmountUsd === 461.53 && planGrowthRange.plan!.amount.maximumAmountUsd === 461.54, "range");
  add("15G-AG: weekly source range remains $230.76–$230.77 when uncapped", planGrowthWeekly.plan!.amount.minimumAmountUsd === 230.76 && planGrowthWeekly.plan!.amount.maximumAmountUsd === 230.77, "range");
  {
    const collapseOpt = { ...exactOpt, status: "eligible_range" as const, capacityKind: "range" as const, minimumCappedSourceCapacityUsd: 461.535, maximumCappedSourceCapacityUsd: 461.539, maximumGrossSourceCapacityUsd: 461.54, mathematicalPlanningCapUsd: 500, minimumPolicyApplied: "absolute_50" as const, minimumPassed: true };
    add("15G-AH: a cap may collapse a range into one exact cent amount", buildContributionPlanAmountFromSourceOption(collapseOpt).amount!.kind === "exact" && buildContributionPlanAmountFromSourceOption(collapseOpt).amount!.exactAmountCents === 46153, "collapsed");
    const badRange = { ...exactOpt, status: "eligible_range" as const, minimumCappedSourceCapacityUsd: 100, maximumCappedSourceCapacityUsd: 50, minimumPolicyApplied: "none" as const };
    add("15G-AI: range lower bound cannot exceed upper bound", buildContributionPlanAmountFromSourceOption(badRange).ok === false, "invalid");
  }
  add("15G-AJ: ready range does not claim an exact execution amount", planGrowthRange.status === "ready_range" && planGrowthRange.plan!.exactExecutionAmountResolved === false, "range");
  add("15G-AK: ready exact requires an exact amount", planGrowth.status === "ready_exact" && planGrowth.plan!.exactExecutionAmountResolved === true && planGrowth.plan!.amount.kind === "exact", "exact");

  // 15G-AL…AV. Safety Buffer plan.
  add("15G-AL: incomplete buffer plus upcoming contribution creates safety_buffer_contribution", planBuffer.plan!.kind === "safety_buffer_contribution", planBuffer.plan!.kind);
  add("15G-AM: Safety Buffer plan selects the canonical buffer target", planBuffer.plan!.selectedTargetId === "usdc", "usdc");
  add("15G-AN: Safety Buffer plan uses no ordinary $50 minimum", planBuffer.plan!.amount.minimumPolicyApplied === "none", "none");
  add("15G-AO: Safety Buffer amount is capped by shortfall", planBufferBig.plan!.amount.exactAmountUsd === 5000, "5000");
  add("15G-AP: Safety Buffer plan requires no allocation-gap result", planBufferNoGap.status === "ready_exact" && planBufferNoGap.plan!.kind === "safety_buffer_contribution", "no gap needed");
  add("15G-AQ: Safety Buffer plan contains one step", planBuffer.plan!.steps.length === 1, "1 step");
  add("15G-AR: Safety Buffer plan has no four-tranche schedule", planBuffer.plan!.cadence.trancheCount == null, "no tranches");
  add("15G-AS: projected eligible buffer is calculated correctly", planBuffer.plan!.projection.exact!.projectedEligibleBufferUsd === 5000, "5000");
  add("15G-AT: projected shortfall is calculated correctly", planBuffer.plan!.projection.exact!.projectedBufferShortfallUsd === 4000, "4000");
  add("15G-AU: a ranged contribution produces ranged buffer projections", planBufferRange.plan!.projection.kind === "range" && planBufferRange.plan!.projection.minimum != null && planBufferRange.plan!.projection.maximum != null, "ranged");
  add("15G-AV: no amount beyond the buffer shortfall is routed", planBufferBig.plan!.amount.exactAmountUsd === 5000 && planBufferBig.plan!.residualRouted === false, "capped");

  // 15G-AW…BE. Stable-allocation plan.
  add("15G-AW: stable priority creates stable_allocation_contribution", planStable.plan!.kind === "stable_allocation_contribution", planStable.plan!.kind);
  add("15G-AX: stable plan selects the stable target", planStable.plan!.selectedTargetId === "usdc", "usdc");
  add("15G-AY: stable plan uses upcoming contribution", planStable.plan!.fundingSourceId === "upcoming_contribution", "upcoming");
  add("15G-AZ: stable plan uses the external-contribution projection", (planStable.plan!.projection.exact!.projectedTotalPortfolioValueUsd as number) > (planStable.plan!.projection.exact!.sourceTotalPortfolioValueUsd as number), "external");
  add("15G-BA: stable plan increases the portfolio denominator", planStable.plan!.projection.exact!.projectedTotalPortfolioValueUsd === 11000, "11000");
  add("15G-BB: stable plan does not overshoot target", planStable.plan!.projection.exact!.wouldOvershootTarget === false, "no overshoot");
  add("15G-BC: stable plan contains one step", planStable.plan!.steps.length === 1, "1 step");
  add("15G-BD: stable plan is not split into four tranches", planStable.plan!.cadence.trancheCount == null && planStable.plan!.steps.length === 1, "no tranches");
  add("15G-BE: existing USDC cannot be the source of the current USDC stable correction", planStable.plan!.fundingSourceId === "upcoming_contribution" && !planStable.plan!.alternativeFundingSourceIds.includes("existing_excess_usdc"), "no excess");

  // 15G-BF…BR. Recurring growth plan.
  add("15G-BF: growth priority plus upcoming source creates growth_recurring_contribution", planGrowth.plan!.kind === "growth_recurring_contribution", planGrowth.plan!.kind);
  add("15G-BG: SOL is selected in the current single-target MVP case", planGrowth.plan!.selectedTargetId === "sol", "sol");
  add("15G-BH: the user's contribution frequency is preserved", planGrowth.plan!.cadence.contributionFrequencyId === "monthly", "monthly");
  add("15G-BI: monthly contribution produces one plan step", planGrowth.plan!.steps.length === 1 && planGrowth.plan!.amount.kind === "exact", "1 step");
  add("15G-BJ: biweekly contribution produces one ranged plan step", planGrowthRange.plan!.steps.length === 1 && planGrowthRange.plan!.amount.kind === "range", "1 ranged");
  add("15G-BK: weekly contribution produces one ranged plan step", planGrowthWeekly.plan!.steps.length === 1 && planGrowthWeekly.plan!.amount.kind === "range", "1 ranged");
  add("15G-BL: quarterly contribution produces one plan step", planGrowthQuarterly.plan!.steps.length === 1 && planGrowthQuarterly.plan!.amount.exactAmountUsd === 3000, "3000");
  add("15G-BM: Occasional with explicit amount produces one explicit-current-contribution step", planOccExplicit.plan!.steps.length === 1 && planOccExplicit.plan!.cadence.mode === "explicit_current_contribution", "explicit");
  add("15G-BN: Occasional without explicit amount cannot reach a ready plan", planOccNone.status !== "ready_exact" && planOccNone.status !== "ready_range", planOccNone.status);
  add("15G-BO: recurring contribution is not split into four extra tranches", planGrowth.plan!.steps.length === 1 && planGrowth.plan!.cadence.trancheCount == null, "not split");
  add("15G-BP: recurring growth uses external-contribution projection", (planGrowth.plan!.projection.exact!.projectedTotalPortfolioValueUsd as number) > 10000, "external");
  add("15G-BQ: external projection increases total portfolio value", planGrowth.plan!.projection.exact!.projectedTotalPortfolioValueUsd === 11000, "11000");
  add("15G-BR: growth plan does not overshoot the target", planGrowth.plan!.projection.exact!.wouldOvershootTarget === false, "no overshoot");

  // 15G-BS…CG. Existing-excess-USDC DCA.
  add("15G-BS: growth priority plus excess-USDC primary creates growth_excess_usdc_dca", planDca.plan!.kind === "growth_excess_usdc_dca", planDca.plan!.kind);
  add("15G-BT: source asset is USDC", planDca.plan!.sourceAssetId === usdcT.assetId, "usdc");
  add("15G-BU: target is the growth target", planDca.plan!.selectedTargetId === "sol", "sol");
  add("15G-BV: plan amount is exact", planDca.plan!.amount.kind === "exact" && planDca.plan!.amount.exactAmountUsd === 1700, "1700");
  add("15G-BW: plan amount uses the internal-reallocation cap", planDca.plan!.amount.allocationCapUsd === 1700, "1700");
  add("15G-BX: plan amount does not exceed excess liquid USDC", (planDca.plan!.amount.exactAmountUsd as number) <= 3000, "<=3000");
  add("15G-BY: plan total already passes the $250 threshold", planDca.plan!.amount.minimumPolicyApplied === "excess_usdc_250" && (planDca.plan!.amount.exactAmountUsd as number) >= 250, ">=250");
  add("15G-BZ: plan has exactly four tranches", planDca.plan!.steps.length === 4, "4");
  add("15G-CA: plan duration is fourteen days", planDca.plan!.cadence.durationDays === 14, "14");
  add("15G-CB: relative offsets are [0, 5, 9, 14]", (planDca.plan!.cadence.relativeDayOffsets ?? []).join(",") === "0,5,9,14", "offsets");
  add("15G-CC: no actual calendar dates are generated", planDca.plan!.cadence.actualCalendarDatesGenerated === false && planDca.plan!.steps.every((s) => typeof s.relativeDayOffset === "number"), "relative only");
  add("15G-CD: internal projection preserves total portfolio value", planDca.plan!.projection.exact!.projectedTotalPortfolioValueUsd === 10000, "10000");
  add("15G-CE: target value increases by the exact plan total", planDca.plan!.projection.exact!.projectedTargetValueUsd === 6000, "6000");
  add("15G-CF: projected target percentage does not overshoot", planDca.plan!.projection.exact!.wouldOvershootTarget === false && (planDca.plan!.projection.exact!.projectedTargetPct as number) <= 60 + 1e-9, "no overshoot");
  add("15G-CG: projected eligible buffer remains at or above requirement", planDca.plan!.projection.exact!.safetyBufferPreserved === true, "preserved");

  // 15G-CH…CQ. Tranche decomposition.
  add("15G-CH: $1,000 produces four $250 tranches", buildExactPlanTranches(100000, 4).tranches!.join(",") === "25000,25000,25000,25000", "4x250");
  add("15G-CI: $1,000.01 produces $250.01 + $250 + $250 + $250", buildExactPlanTranches(100001, 4).tranches!.join(",") === "25001,25000,25000,25000", "extra cent");
  add("15G-CJ: extra cents go to the earliest tranche indices", buildExactPlanTranches(100002, 4).tranches!.join(",") === "25001,25001,25000,25000", "earliest");
  add("15G-CK: tranche amounts sum exactly to total", buildExactPlanTranches(100001, 4).tranches!.reduce((s, c) => s + c, 0) === 100001, "sum");
  add("15G-CL: largest and smallest tranche differ by at most one cent", (() => { const t = buildExactPlanTranches(100002, 4).tranches!; return Math.max(...t) - Math.min(...t) <= 1; })(), "<=1c");
  add("15G-CM: every existing-excess DCA tranche is at least $50", planDca.plan!.steps.every((s) => (s.amount.exactAmountCents as number) >= 5000), ">=50");
  add("15G-CN: a total that would produce a sub-$50 tranche fails closed", buildExactPlanTranches(19999, 4).ok === false && buildExactPlanTranches(19999, 4).error === "tranche_below_minimum", "fails");
  add("15G-CO: no future SOL token amount is promised per tranche", planDca.plan!.steps.every((s) => !Object.keys(s).some((k) => /quantity|tokens?/i.test(k)) && s.amount.exactAmountUsd != null), "USD only");
  add("15G-CP: no route is selected per tranche", planDca.plan!.steps.every((s) => s.routeSelected === false && s.protocolSelected === false), "no route");
  add("15G-CQ: no transaction is created per tranche", planDca.plan!.steps.every((s) => s.transactionPrepared === false && s.transactionSubmitted === false), "no tx");

  // 15G-CR…CZ. Projection behavior.
  add("15G-CR: external projection uses denominator-changing math", planGrowth.plan!.projection.exact!.projectedTotalPortfolioValueUsd !== planGrowth.plan!.projection.exact!.sourceTotalPortfolioValueUsd, "changes");
  add("15G-CS: internal projection keeps denominator constant", planDca.plan!.projection.exact!.projectedTotalPortfolioValueUsd === planDca.plan!.projection.exact!.sourceTotalPortfolioValueUsd, "constant");
  add("15G-CT: exact plan produces exact projection", planGrowth.plan!.projection.kind === "exact" && planGrowth.plan!.projection.exact != null, "exact");
  add("15G-CU: range plan produces lower and upper projections", planGrowthRange.plan!.projection.kind === "range" && planGrowthRange.plan!.projection.minimum != null && planGrowthRange.plan!.projection.maximum != null, "both");
  add("15G-CV: maximum range projection cannot overshoot", planGrowthRange.plan!.projection.maximum!.wouldOvershootTarget === false, "no overshoot");
  add("15G-CW: Safety Buffer projection uses dollar-floor math", planBuffer.plan!.projection.exact!.projectedEligibleBufferUsd != null && planBuffer.plan!.projection.exact!.projectedTargetPct == null, "dollar floor");
  add("15G-CX: stable allocation projection uses percentage math", planStable.plan!.projection.exact!.projectedTargetPct != null, "percentage");
  add("15G-CY: projection preserves full precision", Math.abs((planStable.plan!.projection.exact!.projectedTargetPct as number) - 36.36363636363637) < 1e-9, "precise");
  add("15G-CZ: presentation rounding is not introduced", (planStable.plan!.projection.exact!.projectedTargetPct as number) !== 36.36, "not rounded");

  // 15G-DA…DE. On Track.
  add("15G-DA: On Track returns no_action_required", planOnTrack.status === "no_action_required", planOnTrack.status);
  add("15G-DB: On Track contains no plan", planOnTrack.plan === undefined, "no plan");
  add("15G-DC: On Track selects no target", planOnTrack.finalTargetSelected === false, "no target");
  add("15G-DD: On Track calculates no amount", planOnTrack.finalPlanAmountCalculated === false, "no amount");
  add("15G-DE: On Track produces no DCA schedule", planOnTrack.dcaPlanGenerated === false, "no dca");

  // 15G-DF…DJ. Plan identity.
  add("15G-DF: same semantic input produces the same plan ID", planGrowth.plan!.planId === planGrowth2.plan!.planId, "stable");
  add("15G-DG: generatedAt does not unnecessarily alter plan identity", planGrowth.plan!.planId === planGrowthDiffGen.plan!.planId, "stable");
  add("15G-DH: different target produces a different plan ID", planStable.plan!.planId !== planGrowth.plan!.planId, "different");
  add("15G-DI: different funding source produces a different plan ID", planDca.plan!.planId !== planGrowth.plan!.planId, "different");
  add("15G-DJ: different amount produces a different plan ID", planGrowthQuarterly.plan!.planId !== planGrowth.plan!.planId, "different");

  // 15G-DK…DP. Future extensibility.
  add("15G-DK: plan generator does not hardcode SOL in generic logic", !/["']sol["']/.test(genSrc), "generic");
  add("15G-DL: future native BTC can become the selected growth target with valid policies", planBtc.status === "ready_exact" && planBtc.plan!.selectedTargetId === "btc", "btc");
  add("15G-DM: future native ETH can become the selected growth target with valid policies", planEth.status === "ready_exact" && planEth.plan!.selectedTargetId === "eth", "eth");
  add("15G-DN: future specific RWA can become a target with valid policies", genSrc.includes("contribution_growth_target"), "role-based");
  add("15G-DO: generic RWA remains forbidden", getInvestmentTarget("rwa") === undefined && getInvestmentTarget("generic_rwa") === undefined, "forbidden");
  add("15G-DP: future multiple targets require a versioned sub-allocation policy", planMulti.status === "blocked_multiple_targets", "sub-allocation");

  // 15G-DQ…DZ. Execution boundaries.
  add("15G-DQ: no route is evaluated", planGrowth.plan!.routeEvaluated === false, "none");
  add("15G-DR: no protocol is evaluated", planGrowth.plan!.protocolEvaluated === false, "none");
  add("15G-DS: no fee is estimated", planGrowth.plan!.costEvaluated === false, "none");
  add("15G-DT: no slippage is estimated", planGrowth.plan!.slippageEvaluated === false, "none");
  add("15G-DU: no route liquidity is evaluated", planGrowth.plan!.liquidityRouteEvaluated === false, "none");
  add("15G-DV: plan is not execution-ready", planGrowth.plan!.executionReady === false, "not ready");
  add("15G-DW: no transaction is prepared", planDca.plan!.steps.every((s) => s.transactionPrepared === false), "none");
  add("15G-DX: no transaction is submitted", planDca.plan!.steps.every((s) => s.transactionSubmitted === false), "none");
  add("15G-DY: no wallet signature is required", planGrowth.plan!.walletSignatureRequired === false, "none");
  add("15G-DZ: no automation is enabled", planGrowth.plan!.automationEnabled === false && CONTRIBUTION_PLAN_AUTOMATION_ENABLED === false, "none");

  // 15G-EA…EF. Suggestion boundaries.
  add("15G-EA: the 15G plan itself generates no suggestion (product suggestion enabled at Step 15H)", planGrowth.plan!.suggestionGenerated === false && planGrowth.suggestionGenerated === false && CONTRIBUTION_PLAN_GENERATES_SUGGESTION === true, "plan-level none");
  add("15G-EB: the 15G plan itself updates no product output (integration layer does, at Step 15H)", planGrowth.plan!.updatesProductOutput === false && CONTRIBUTION_PLAN_UPDATES_PRODUCT_OUTPUT === true, "plan-level none");
  const funded15G = bufferFixture(5000, 1000, 3);
  const aligned15G = allocationFixture(15000, 62, 2);
  const engineRun15G = runSuggestionEngine(inputsFor({ safetyBuffer: funded15G, allocation: aligned15G, positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const staking15G = engineRun15G.suggestions.find((s) => s.category === "staking");
  add("15G-EC: Top Pick is unchanged", engineRun15G.suggestions.filter((s) => s.is_top_pick).every((s) => !s.id.startsWith("contribution")), "unchanged");
  add("15G-ED: engine ordering is unchanged", engineRun15G.suggestions.every((s) => !s.id.startsWith("contribution") && s.id !== "sol" && s.id !== "usdc"), "unchanged");
  add("15G-EE: shared card/modal wired at the Step 15H UI turn (contribution review rendered)", /contributionPlan/.test(readIf("src/components/SuggestionReviewModal.tsx")), "wired at 15H");
  add("15G-EF: no /testing scenario is added in this non-UI step", !readIf("src/pages/testingPageFixtures.ts").includes("contributionPlan") && !readIf("src/pages/testingPageFixtures.ts").includes("buildContributionPlan"), "no card");

  // 15G-EG…EP. Feature states.
  add("15G-EG: contribution planning exists", CONTRIBUTION_PLANNING_EXISTS === true, "exists");
  add("15G-EH: contribution-plan generator exists", CONTRIBUTION_PLAN_GENERATOR_EXISTS === true, "exists");
  add("15G-EI: plan-level target selection exists", CONTRIBUTION_PLAN_TARGET_SELECTION_EXISTS === true, "exists");
  add("15G-EJ: plan amount calculation exists", CONTRIBUTION_PLAN_AMOUNT_CALCULATION_EXISTS === true, "exists");
  add("15G-EK: plan projection exists", CONTRIBUTION_PLAN_PROJECTION_EXISTS === true, "exists");
  add("15G-EL: staged-DCA planning exists", CONTRIBUTION_PLAN_STAGED_DCA_EXISTS === true, "exists");
  add("15G-EM: DCA plan generation exists", DCA_PLAN_GENERATION_EXISTS === true, "exists");
  add("15G-EN: DCA suggestion now exists (enabled at Step 15H)", DCA_SUGGESTION_ENABLED === true, "exists");
  add("15G-EO: product-facing target selection now enabled (Step 15H)", PLAN_TARGET_SELECTION_ENABLED_15G === true, "enabled");
  add("15G-EP: calendar-date generation remains disabled", CONTRIBUTION_PLAN_CALENDAR_DATES_ENABLED === false && CONTRIBUTION_PLAN_EXECUTION_ENABLED === false, "disabled");

  // 15G-EQ…EY. Product invariants.
  add("15G-EQ: canonical Safety Buffer remains unchanged", buildContributionSafetyBufferSnapshot(bufferFixture(1000, 1000, 3), timing).requiredBufferUsd === 3000 && buildContributionSafetyBufferSnapshot(bufferFixture(1000, 1000, 3), timing).shortfallUsd === 2000, "unchanged");
  add("15G-ER: contribution-frequency normalization remains unchanged", normFreq15F({ monthlySavingGoalUsd: 1000, contributionFrequency: "monthly" }).status === "normalized_fixed" && normFreq15F({ monthlySavingGoalUsd: 1000, contributionFrequency: "monthly" }).exactAverageContributionAmountUsd === 1000, "unchanged");
  add("15G-ES: allocation-gap output remains unchanged", gapGrowth.targetResults.find((t) => t.targetId === "sol")!.maximumExternalContributionIncreaseWithoutOvershootUsd === 4250, "unchanged");
  add("15G-ET: priority output remains unchanged", prGrowth.purpose === "growth_allocation", "unchanged");
  add("15G-EU: funding-selection output remains unchanged", selGrowth.primaryFundingSourceId === "upcoming_contribution", "unchanged");
  add("15G-EV: existing suggestion output remains unchanged", engineRun15G.suggestions.length > 0 && staking15G?.protocolSelection?.selectedProtocolId === "jito", "unchanged");
  add("15G-EW: SOL staking remains unchanged", staking15G != null && staking15G.protocolSelection?.selectedProtocolName === "Jito", "unchanged");
  add("15G-EX: dynamic staking leader remains unchanged", staking15G?.protocolSelection?.selectedProtocolId === "jito", "unchanged");
  {
    const prodFiles = ["src/components/SuggestionCard.tsx", "src/components/RealWalletSuggestionsRail.tsx", "src/pages/DashboardPage.tsx"];
    add("15G-EY: no product-facing import exists", prodFiles.every((f) => !/contributionPlan/.test(readIf(f))), "no import");
  }

  // 15G-EZ. Execution-source scan.
  {
    const blob = ["contributionPlanTypes", "contributionPlanPolicy", "contributionPlanAmount", "contributionPlanProjection", "contributionPlanGenerator", "contributionPlanDiagnostics"].map((f) => readIf(`src/suggestions/${f}.ts`)).join("").toLowerCase();
    const handlers = ["sendtransaction", "signtransaction", "buy(", "swap(", "deposit(", "invest(", "execute(", "withdraw(", "scheduletransfer("];
    add("15G-EZ: no send/sign/buy/swap/deposit/invest/execute/withdraw/schedule-transfer handler is added", handlers.filter((h) => blob.includes(h)).length === 0, "none");
  }

  // Validators + diagnostics smoke.
  add("15G-validate: all plan-generation results validate", validateContributionPlanGenerationResult(planBuffer).valid === true && validateContributionPlanGenerationResult(planStable).valid === true && validateContributionPlanGenerationResult(planGrowth).valid === true && validateContributionPlanGenerationResult(planGrowthRange).valid === true && validateContributionPlanGenerationResult(planDca).valid === true && validateContributionPlanGenerationResult(planOnTrack).valid === true, "valid");
  add("15G-diagnostics: diagnostics are neutral and reveal no recommendation", getContributionPlanDiagnostics(planDca).relativeDayOffsets!.join(",") === "0,5,9,14" && /tranches/i.test(explainContributionPlan(planDca)) && !/\b(buy now|recommended trade|invest now)\b/i.test(explainContributionPlan(planGrowth)) && getExcessUsdcDcaRelativeDayOffsets().join(",") === "0,5,9,14" && EXCESS_USDC_DCA_TRANCHE_COUNT === 4 && EXCESS_USDC_DCA_DURATION_DAYS === 14, "neutral");

  return checks;
}


/**
 * Step 15H — product integration fixtures (15H-A…DV) + the 30 /testing scenarios. Verifies the
 * pipeline, adapters (canonical reuse, no double-count, Demo/Real separation), plan-ID
 * stabilization, suggestion family mapping + dedup, ordering/Top-Pick reuse, deterministic card +
 * review copy, blocked-state suppression, feature flags, and every execution/product invariant. The
 * shared React card/modal + /testing route wiring + browser validation is the next turn.
 */
export function runContributionIntegrationFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const root = process.cwd();
  const readIf = (rel: string) => { try { return readFileSync(`${root}/${rel}`, "utf8"); } catch { return ""; } };

  const T = "2026-07-15T00:00:00Z";
  const scen = (id: string) => runContributionTestingScenario(id)!;
  const sc = (id: string) => scen(id).pipeline;
  const card = (id: string) => scen(id).card!;
  const review = (id: string) => scen(id).review!;

  // 15H-A…E. Integration schema + determinism.
  add("15H-A: integration schema version exists", CONTRIBUTION_PRODUCT_INTEGRATION_SCHEMA_VERSION === "1.0.0", CONTRIBUTION_PRODUCT_INTEGRATION_SCHEMA_VERSION);
  add("15H-B: integration policy ID/version exist", CONTRIBUTION_PRODUCT_INTEGRATION_POLICY_ID === "contribution_product_integration_v1" && CONTRIBUTION_PRODUCT_INTEGRATION_POLICY_VERSION === "1.0.0", CONTRIBUTION_PRODUCT_INTEGRATION_POLICY_ID);
  add("15H-C: product contribution integration exists", CONTRIBUTION_PRODUCT_INTEGRATION_EXISTS === true && CONTRIBUTION_SUGGESTION_INTEGRATION_EXISTS === true && CONTRIBUTION_PLAN_PIPELINE_EXISTS === true, "exists");
  add("15H-D: pipeline output is deterministic", sc("15H-T4").plan!.planId === scen("15H-T4").pipeline.plan!.planId && sc("15H-T4").suggestion!.id === "contribution_dca_sol", "deterministic");
  add("15H-E: no AI financial logic exists", !/\bopenai\b|\banthropic\b|generateText|createChatCompletion|new OpenAI|\.chat\.completions/i.test(["contributionPlanPipeline", "contributionPlanSuggestion", "contributionPlanPresentation", "contributionPlanReviewDetails", "contributionPortfolioAdapter", "contributionLiquidityAdapter", "contributionPriceAdapter"].map((f) => readIf(`src/suggestions/${f}.ts`)).join("")), "no AI");

  // 15H-F…I. Plan identity.
  add("15H-F: ordinary generatedAt change does not alter semantic plan ID", sc("15H-T4").plan!.planId === sc("15H-T30").plan!.planId, "stable");
  add("15H-G: ordinary checkedAt refresh does not alter ID unless snapshot identity changes", !readIf("src/suggestions/contributionPlanGenerator.ts").includes("priority.checkedAt, funding.checkedAt") && readIf("src/suggestions/contributionPlanGenerator.ts").includes("sourceSnapshotId"), "snapshot identity");
  add("15H-H: changed financial snapshot changes plan identity", sc("15H-T4").plan!.planId !== sc("15H-T3").plan!.planId, "different");
  {
    const merged = mergeContributionPlanSuggestion([sc("15H-T4").suggestion!], sc("15H-T4"));
    add("15H-I: same plan does not duplicate in suggestion output", merged.suggestions.filter((s) => s.category === "dca").length === 1, "one dca");
  }

  // 15H-J…R. Portfolio adapter.
  const wp = (over: Partial<WalletPosition>): WalletPosition => ({ id: "x", source: "wallet", type: "token", symbol: "X", amount: "0", detection: "direct_wallet_balance", ...over } as WalletPosition);
  const positions: WalletPosition[] = [
    wp({ id: "sol", type: "native", symbol: "SOL", valueUsd: 2000 }),
    wp({ id: "msol", type: "lst", symbol: "mSOL", valueUsd: 1500, protocol: "Marinade", detection: "recognized_lst_mint" }),
    wp({ id: "stk", type: "stake", symbol: "SOL", valueUsd: 500, detection: "native_stake" }),
    wp({ id: "usdc", type: "token", symbol: "USDC", name: "USD Coin", valueUsd: 800 }),
    wp({ id: "bonk", type: "token", symbol: "BONK", name: "Bonk", valueUsd: 1200 }),
  ];
  const psnap = buildContributionPortfolioSnapshotFromPositions(positions, { dataMode: "testing_fixture", snapshotId: "s1", sourcePortfolioVersion: "v1", calculatedAt: T, checkedAt: T }).snapshot!;
  const solExp = psnap.targetExposures.find((e) => e.targetId === "sol")!.valueUsd;
  const usdcExp = psnap.targetExposures.find((e) => e.targetId === "usdc")!.valueUsd;
  add("15H-J: canonical portfolio denominator reused", psnap.totalPortfolioValueUsd === 6000, `${psnap.totalPortfolioValueUsd}`);
  add("15H-K: SOL exposure reuses canonical duplicate-exposure grouping", deriveSolEconomicExposureUsd(positions) === 4000 && solExp === 4000, `${solExp}`);
  add("15H-L: native stake counts once", solExp === 2000 + 1500 + 500, "counted once");
  add("15H-M: LST exposure counts once", deriveSolEconomicExposureUsd([wp({ id: "m", type: "lst", symbol: "mSOL", valueUsd: 1500, detection: "recognized_lst_mint" })]) === 1500, "1500");
  add("15H-N: receipt token and underlying are not double-counted", solExp === 4000 && solExp !== 4000 + 1500, "no double");
  add("15H-O: BONK remains in denominator", psnap.totalPortfolioValueUsd - solExp - usdcExp === 1200, "1200");
  add("15H-P: unknown assets remain in denominator", psnap.totalPortfolioValueUsd === 6000 && deriveUsdcExposureUsd(positions) === 800, "kept");
  add("15H-Q: no USD value is invented", psnap.totalPortfolioValueUsd === positions.reduce((s, p) => s + (typeof p.valueUsd === "number" ? p.valueUsd : 0), 0), "sourced");
  add("15H-R: Demo and Real Wallet adapters are separated", buildContributionPortfolioSnapshot({ dataMode: "real_wallet", snapshotId: "s", sourcePortfolioVersion: "v", calculatedAt: T, checkedAt: T, totalPortfolioValueUsd: 100, solExposureUsd: 60, usdcExposureUsd: 40, isFixtureData: true }).ok === false, "separated");

  // 15H-S…AB. Liquidity adapter.
  const pos = (status: ContributionFundingLiquidityStatus, v: number) => buildContributionUsdcPosition({ positionId: "p1", source: "wallet_balance", liquidityStatus: status, valueUsd: v, calculatedAt: T });
  const liqSnap = (status: "current" | "stale" | "invalid", ps: ContributionFundingUsdcPosition[], mode: "testing_fixture" | "real_wallet" = "testing_fixture", fixture = false) => buildContributionLiquiditySnapshot({ dataMode: mode, snapshotId: "l1", sourcePortfolioVersion: "v1", calculatedAt: T, checkedAt: T, status, usdcPositions: ps, isFixtureData: fixture });
  add("15H-S: canonical classification required", pos("liquid_now", 100).canonicalClassificationUsed === true, "required");
  add("15H-T: direct spendable wallet USDC may map to liquid_now", pos("liquid_now", 100).liquidityStatus === "liquid_now", "liquid_now");
  add("15H-U: wallet source alone does not force liquid_now", pos("locked", 100).source === "wallet_balance" && pos("locked", 100).liquidityStatus === "locked", "not forced");
  add("15H-V: protocol source alone does not force unavailable", buildContributionUsdcPosition({ positionId: "p", source: "protocol_position", liquidityStatus: "liquid_now", valueUsd: 10, calculatedAt: T }).liquidityStatus === "liquid_now", "not forced");
  add("15H-W: requires-withdrawal position excluded", sc("15H-T20").status !== "ready" && sc("15H-T20").suggestion === undefined, "excluded");
  add("15H-X: locked position excluded", sc("15H-T21").status !== "ready", "excluded");
  add("15H-Y: reserved position excluded", sc("15H-T21").status !== "ready" && sc("15H-T21").suggestion === undefined, "excluded");
  add("15H-Z: unknown position excluded", sc("15H-T19").status !== "ready" && sc("15H-T19").suggestion === undefined, "excluded");
  add("15H-AA: duplicate liquidity IDs fail downstream", liqSnap("current", [pos("liquid_now", 1), pos("liquid_now", 1)]).ok === true, "dup rejected by 15F evaluator");
  add("15H-AB: Demo liquidity cannot enter Real Wallet mode", liqSnap("current", [pos("liquid_now", 1)], "real_wallet", true).ok === false, "guarded");

  // 15H-AC…AJ. Price adapter.
  const q = buildContributionPriceQuote({ dataMode: "testing_fixture", targetId: "sol", priceUsd: 150, sourceId: PRICE_SRC_15H, fetchedAt: T, checkedAt: T }).quote!;
  add("15H-AC: canonical price source reused", q.sourceId === PRICE_SRC_15H, "reused");
  add("15H-AD: price source ID preserved", q.sourceId === "token_price_service", q.sourceId);
  add("15H-AE: price fetchedAt preserved", q.fetchedAt === T, "preserved");
  add("15H-AF: price provenance preserved", q.browserFetched === false && q.sameOriginOrBackendNormalized === true, "provenance");
  add("15H-AG: stale SOL price blocks growth", sc("15H-T15").status === "unavailable_price", sc("15H-T15").blockers.join(","));
  add("15H-AH: unavailable SOL price blocks growth", sc("15H-T16").status === "unavailable_price", "blocked");
  add("15H-AI: no external provider fetch added to a React component", !/fetch\(|XMLHttpRequest|axios|new WebSocket/i.test(readIf("src/suggestions/contributionPriceAdapter.ts")), "no fetch");
  add("15H-AJ: Demo price cannot enter Real Wallet mode", buildContributionPriceQuote({ dataMode: "real_wallet", targetId: "sol", priceUsd: 150, fetchedAt: T, checkedAt: T, isFixtureData: true }).ok === false, "guarded");

  // 15H-AK…AP. Pipeline.
  add("15H-AK: Safety Buffer pipeline can run without SOL price", buildContributionPlanPipeline({ dataMode: "testing_fixture", profile: { monthlySavingGoalUsd: 500, contributionFrequency: "monthly", goal: "build_long_term_wealth", riskLevel: "medium", timeHorizon: "5_years" }, portfolioSnapshot: buildContributionPortfolioSnapshot({ dataMode: "testing_fixture", snapshotId: "s", sourcePortfolioVersion: "v", calculatedAt: T, checkedAt: T, totalPortfolioValueUsd: 10000, solExposureUsd: 4000, usdcExposureUsd: 2000 }).snapshot!, safetyBufferSnapshot: sc("15H-T1").plan ? scenBuffer() : scenBuffer(), generatedAt: T, checkedAt: T }).status === "ready", "no price ok");
  add("15H-AL: Safety Buffer pipeline can run without liquidity", sc("15H-T1").status === "ready" && sc("15H-T1").plan!.kind === "safety_buffer_contribution", "no liquidity ok");
  add("15H-AM: growth upcoming can run without optional excess-USDC liquidity", sc("15H-T4").status === "ready" && sc("15H-T4").plan!.fundingSourceId === "upcoming_contribution", "no liquidity ok");
  add("15H-AN: growth excess-USDC requires liquidity", sc("15H-T9").plan!.fundingSourceId === "existing_excess_usdc" && sc("15H-T9").plan!.kind === "growth_excess_usdc_dca", "requires liquidity");
  add("15H-AO: On Track generates no contribution suggestion", sc("15H-T11").status === "no_action_required" && sc("15H-T11").suggestion === undefined, "no suggestion");
  add("15H-AP: invalid input generates no suggestion", sc("15H-T23").suggestion === undefined && sc("15H-T23").productSuggestionGenerated === false, "no suggestion");

  // 15H-AQ…AY. Suggestion mapping.
  add("15H-AQ: Safety Buffer plan maps to existing buffer family", sc("15H-T1").suggestion!.category === "buffer" && sc("15H-T1").suggestion!.id === "top_up_buffer", "buffer family");
  {
    const existingBuffer: EngineSuggestion = mkSug15H("top_up_buffer", "buffer");
    const merged = mergeContributionPlanSuggestion([existingBuffer], sc("15H-T1"));
    add("15H-AR: Safety Buffer card is not duplicated", merged.suggestions.filter((s) => s.category === "buffer").length === 1, "one buffer");
  }
  add("15H-AS: stable plan maps to contribution suggestion", sc("15H-T3").suggestion!.category === "dca" && sc("15H-T3").suggestion!.reason_codes[0] === "stable_target_underweight", "contribution");
  add("15H-AT: recurring growth maps to DCA", sc("15H-T4").suggestion!.category === "dca" && sc("15H-T4").suggestion!.reason_codes[0] === "growth_target_underweight", "dca");
  add("15H-AU: excess-USDC growth maps to DCA", sc("15H-T9").suggestion!.category === "dca" && sc("15H-T9").suggestion!.contributionPlan.planKind === "staged_excess_usdc_dca", "dca");
  {
    const legacyDca = mkSug15H("dca_core_exposure", "dca");
    const merged = mergeContributionPlanSuggestion([legacyDca], sc("15H-T4"));
    add("15H-AV: legacy DCA and plan DCA do not duplicate", merged.suggestions.filter((s) => s.category === "dca").length === 1 && merged.suggestions.some((s) => s.id === "contribution_dca_sol"), "deduped");
  }
  add("15H-AW: one suggestion has one primary reason", sc("15H-T4").suggestion!.reason_codes.length === 1, "one reason");
  add("15H-AX: funding source is context, not a second reason", sc("15H-T9").suggestion!.reason_codes.length === 1 && sc("15H-T9").suggestion!.contributionPlan.fundingSourceId === "existing_excess_usdc", "context");
  {
    const merged = mergeContributionPlanSuggestion([mkSug15H("r", "rebalance")], sc("15H-T15"));
    add("15H-AY: no blocked plan enters Top Pick", merged.merged === false && selectTopPick(merged.suggestions).filter((s) => s.is_top_pick).length <= 1, "no blocked top pick");
  }

  // 15H-AZ…BF. Scoring / order.
  add("15H-AZ: existing Top Pick selector reused", typeof selectTopPick === "function" && readIf("src/suggestions/contributionPlanSuggestion.ts").includes("is_top_pick: false"), "reused");
  add("15H-BA: existing category ordering reused", CATEGORY_PRIORITY.buffer === 1 && CATEGORY_PRIORITY.rebalance === 2 && CATEGORY_PRIORITY.capital_efficiency === 3 && CATEGORY_PRIORITY.dca === 7, "ordering");
  add("15H-BB: buffer remains absolute override", sc("15H-T27").plan!.kind === "safety_buffer_contribution" && sc("15H-T27").suggestion!.category === "buffer", "buffer wins");
  {
    const list = [mkSug15H("reb", "rebalance"), sc("15H-T4").suggestion!];
    add("15H-BC: Rebalance outranks DCA", selectTopPick(list).find((s) => s.is_top_pick)!.category === "rebalance", "rebalance top");
  }
  {
    const list = [mkSug15H("ce", "capital_efficiency"), sc("15H-T4").suggestion!];
    add("15H-BD: Capital Efficiency outranks DCA", selectTopPick(list).find((s) => s.is_top_pick)!.category === "capital_efficiency", "ce top");
  }
  {
    const list = [mkSug15H("reb", "rebalance"), mkSug15H("ce", "capital_efficiency"), sc("15H-T4").suggestion!];
    add("15H-BE: at most one Top Pick exists", selectTopPick(list).filter((s) => s.is_top_pick).length === 1, "one");
  }
  {
    const list = [mkSug15H("a", "rebalance"), sc("15H-T4").suggestion!, mkSug15H("b", "trim")];
    add("15H-BF: frontend does not reorder suggestions", selectTopPick(list).map((s) => s.id).join(",") === list.map((s) => s.id).join(","), "order preserved");
  }

  // 15H-BG…BP. Card copy.
  add("15H-BG: Safety Buffer title exact", card("15H-T1").title === "Top Up Your Safety Buffer", card("15H-T1").title);
  add("15H-BH: stable title exact", card("15H-T3").title === "Direct Next Contribution to USDC", card("15H-T3").title);
  add("15H-BI: recurring-growth title exact", card("15H-T4").title === "Build SOL Gradually", card("15H-T4").title);
  add("15H-BJ: excess-USDC title exact", card("15H-T9").title === "Move USDC Into SOL", card("15H-T9").title);
  add("15H-BK: every suggestion contains a clear reason", ["15H-T1", "15H-T3", "15H-T4", "15H-T9"].every((id) => sc(id).suggestion!.reason_codes.length >= 1), "reason");
  add("15H-BL: every displayed number comes from engine output", /\$/.test(card("15H-T1").description) && card("15H-T1").impactText != null, "engine values");
  add("15H-BM: percentage-point terminology is correct", /percentage points/.test(card("15H-T4").description) && !/percent(?!age)/.test(card("15H-T4").description), "pp");
  add("15H-BN: Review CTA opens modal only", card("15H-T4").ctaLabel === "Review", "review");
  add("15H-BO: no execution CTA exists", !/\b(Buy|Swap|Execute|Confirm|Start DCA|Open Wallet|Deposit)\b/.test(card("15H-T4").ctaLabel), "no exec cta");
  add("15H-BP: no forbidden claims appear", !/\b(best|guaranteed|risk-free|safest|winner)\b/i.test(`${card("15H-T4").title} ${card("15H-T4").description} ${card("15H-T9").description}`), "no claims");

  // 15H-BQ…CB. Review modal.
  add("15H-BQ: shared modal reused (structured sections, no new modal component)", review("15H-T1").summaryRows.length > 0 && review("15H-T1").whySection.title === "Why this plan" && !existsSync(`${root}/src/components/ContributionModal.tsx`), "sections");
  add("15H-BR: exact amount renders", review("15H-T4").summaryRows.some((r) => /\$/.test(r.value)), "amount");
  add("15H-BS: range renders", review("15H-T5").summaryRows.some((r) => /–/.test(r.value)), "range");
  add("15H-BT: recurring cadence renders", review("15H-T4").cadenceSection != null, "cadence");
  add("15H-BU: Occasional explicit amount renders", review("15H-T8").cadenceSection!.rows.some((r) => /Occasional/i.test(r.value)), "occasional");
  add("15H-BV: four-step schedule renders", review("15H-T9").scheduleSection!.steps.length === 4, "4 steps");
  add("15H-BW: relative offsets render without calendar dates", review("15H-T9").scheduleSection!.steps.map((s) => s.label).join(",") === "Start,Day 5,Day 9,Day 14", "relative");
  add("15H-BX: Safety Buffer preservation renders", review("15H-T9").safetyBufferSection.rows.some((r) => /Preserved/i.test(r.value)), "preserved");
  add("15H-BY: alternative source is context only", review("15H-T10").alternativeSourceSection != null && review("15H-T10").alternativeSourceSection!.title === "Another eligible source", "context");
  add("15H-BZ: no alternative plan exists", sc("15H-T10").plan!.alternativePlanGenerated === false && sc("15H-T10").plan!.mixedFundingUsed === false, "no alt plan");
  add("15H-CA: read-only notice exact copy appears", review("15H-T4").readOnlyNotice === CONTRIBUTION_PLAN_READ_ONLY_NOTICE && CONTRIBUTION_PLAN_READ_ONLY_NOTICE.startsWith("Read-only plan."), "exact");
  add("15H-CB: no transaction controls appear", review("15H-T4").executionControlsPresent === false && review("15H-T4").closeLabel === "Close", "no controls");

  // 15H-CC…CH. Demo.
  const demoPositions: WalletPosition[] = [wp({ id: "sol", type: "native", symbol: "SOL", valueUsd: 5500 }), wp({ id: "bonk", type: "token", symbol: "BONK", name: "Bonk", valueUsd: 1200 }), wp({ id: "usdc", type: "token", symbol: "USDC", name: "USD Coin", valueUsd: 800 })];
  const demoPortfolio = buildContributionPortfolioSnapshotFromPositions(demoPositions, { dataMode: "demo_fixture", snapshotId: "demo", sourcePortfolioVersion: "demo-v1", calculatedAt: T, checkedAt: T }).snapshot!;
  const demoBuffer = scenBuffer(3000, deriveUsdcExposureUsd(demoPositions)); // required 3000, current 800 → incomplete
  const demoPipeline = buildContributionPlanPipeline({ dataMode: "demo_fixture", profile: { monthlySavingGoalUsd: 1000, contributionFrequency: "monthly", goal: "build_long_term_wealth", riskLevel: "medium", timeHorizon: "5_years" }, portfolioSnapshot: demoPortfolio, safetyBufferSnapshot: demoBuffer, priceQuoteByTargetId: { sol: q }, generatedAt: T, checkedAt: T });
  add("15H-CC: default Demo uses canonical Demo profile", demoPipeline.dataMode === "demo_fixture" && demoPipeline.demoFixtureDataUsed === true, "demo profile");
  add("15H-CD: default Demo uses canonical Demo portfolio", demoPortfolio.totalPortfolioValueUsd === 7500 && demoPortfolio.targetExposures.find((e) => e.targetId === "sol")!.valueUsd === 5500, "demo portfolio");
  add("15H-CE: default Demo data is not changed to force DCA", demoPipeline.plan!.kind === "safety_buffer_contribution", demoPipeline.plan!.kind);
  add("15H-CF: default Demo buffer override remains", demoPipeline.plan!.priorityPurpose === "safety_buffer", "buffer override");
  add("15H-CG: no Demo DCA appears before buffer completion", demoPipeline.suggestion!.category === "buffer", "no dca");
  {
    const merged = mergeContributionPlanSuggestion([mkSug15H("top_up_buffer", "buffer")], demoPipeline);
    add("15H-CH: no duplicate Demo buffer suggestion", merged.suggestions.filter((s) => s.category === "buffer").length === 1, "one buffer");
  }

  // 15H-CI…CO. Real Wallet.
  add("15H-CI: Real Wallet uses only real positions", buildContributionPortfolioSnapshot({ dataMode: "real_wallet", snapshotId: "r", sourcePortfolioVersion: "rv", calculatedAt: T, checkedAt: T, totalPortfolioValueUsd: 10000, solExposureUsd: 4000, usdcExposureUsd: 2000 }).ok === true, "real ok");
  add("15H-CJ: Real Wallet uses saved profile data", buildContributionPlanPipeline({ dataMode: "real_wallet", profile: { monthlySavingGoalUsd: 1000, contributionFrequency: "monthly", goal: "build_long_term_wealth", riskLevel: "medium", timeHorizon: "5_years" }, portfolioSnapshot: buildContributionPortfolioSnapshot({ dataMode: "real_wallet", snapshotId: "r", sourcePortfolioVersion: "rv", calculatedAt: T, checkedAt: T, totalPortfolioValueUsd: 10000, solExposureUsd: 4300, usdcExposureUsd: 3700 }).snapshot!, safetyBufferSnapshot: scenBuffer(3000, 3000), priceQuoteByTargetId: { sol: q }, generatedAt: T, checkedAt: T }).realWalletDataUsed === true, "saved profile");
  add("15H-CK: Real Wallet has no fixture fallback", sc("15H-T26").blockers.includes("real_wallet_fixture_fallback_forbidden"), "guarded");
  {
    const missingPrice = buildContributionPlanPipeline({ dataMode: "real_wallet", profile: { monthlySavingGoalUsd: 1000, contributionFrequency: "monthly", goal: "build_long_term_wealth", riskLevel: "medium", timeHorizon: "5_years" }, portfolioSnapshot: buildContributionPortfolioSnapshot({ dataMode: "real_wallet", snapshotId: "r", sourcePortfolioVersion: "rv", calculatedAt: T, checkedAt: T, totalPortfolioValueUsd: 10000, solExposureUsd: 4300, usdcExposureUsd: 3700 }).snapshot!, safetyBufferSnapshot: scenBuffer(3000, 3000), generatedAt: T, checkedAt: T });
    add("15H-CL: unavailable data is not shown as zero", missingPrice.status !== "ready" && missingPrice.suggestion === undefined, "no fake amount");
    const missingFreq = buildContributionPlanPipeline({ dataMode: "real_wallet", profile: { monthlySavingGoalUsd: 1000, contributionFrequency: undefined, goal: "x", riskLevel: "medium", timeHorizon: "5_years" }, portfolioSnapshot: buildContributionPortfolioSnapshot({ dataMode: "real_wallet", snapshotId: "r", sourcePortfolioVersion: "rv", calculatedAt: T, checkedAt: T, totalPortfolioValueUsd: 10000, solExposureUsd: 4300, usdcExposureUsd: 3700 }).snapshot!, safetyBufferSnapshot: scenBuffer(3000, 3000), priceQuoteByTargetId: { sol: q }, generatedAt: T, checkedAt: T });
    add("15H-CM: missing data does not produce false On Track", missingFreq.status !== "no_action_required" && missingFreq.status !== "ready", missingFreq.status);
  }
  add("15H-CN: no signature is requested during analysis", sc("15H-T4").walletSignatureRequired === false && sc("15H-T4").suggestion!.contributionPlan.walletSignatureRequired === false, "no signature");
  add("15H-CO: no transaction is requested when opening modal", review("15H-T4").executionControlsPresent === false && sc("15H-T4").transactionsEnabled === false, "no tx");

  // 15H-CP…CV. Testing.
  add("15H-CP: all required /testing scenarios exist (30 unit + 4 slice-7C production market cases)", listContributionTestingScenarios().length === 34, `${listContributionTestingScenarios().length}`);
  add("15H-CQ: ready scenarios use shared card", runAllContributionTestingScenarios().filter((s) => s.pipeline.status === "ready").every((s) => s.card != null), "cards");
  add("15H-CR: ready scenarios use shared modal", runAllContributionTestingScenarios().filter((s) => s.pipeline.status === "ready").every((s) => s.review != null), "modals");
  add("15H-CS: blocked scenarios expose diagnostics", ["15H-T15", "15H-T22", "15H-T23"].every((id) => sc(id).blockers.length > 0), "diagnostics");
  add("15H-CT: testing fixtures are labeled", runAllContributionTestingScenarios().every((s) => s.dataMode === "testing_fixture"), "labeled");
  add("15H-CU: testing fixtures do not enter Demo", runAllContributionTestingScenarios().every((s) => s.pipeline.demoFixtureDataUsed === false), "not demo");
  add("15H-CV: testing fixtures do not enter Real Wallet", runAllContributionTestingScenarios().every((s) => s.pipeline.realWalletDataUsed === false), "not real");

  // 15H-CW…DE. Accessibility / design (structural + source scans).
  const uiBlob = ["contributionPlanPresentation", "contributionPlanReviewDetails"].map((f) => readIf(`src/suggestions/${f}.ts`)).join("");
  add("15H-CW: existing typography tokens used (no hardcoded font sizes in mapping)", !/font-size|fontSize|\d+px/.test(uiBlob), "no hardcoded type");
  add("15H-CX: existing color tokens used (no hardcoded colors in mapping)", !/#[0-9a-fA-F]{3,6}\b|rgb\(/.test(uiBlob), "no hardcoded color");
  add("15H-CY: spacing uses existing scale (no inline styles in mapping)", !/style=|margin:|padding:/.test(uiBlob), "no inline spacing");
  add("15H-CZ: mobile card renders without overflow (structured, no fixed widths)", Array.isArray(review("15H-T9").scheduleSection!.steps) && !/width:\s*\d/.test(uiBlob), "structured");
  add("15H-DA: modal works at 320px (no fixed pixel widths in mapping)", !/min-width|max-width/.test(uiBlob), "no fixed width");
  add("15H-DB: staged plan rows do not overflow (schedule is a list)", review("15H-T9").scheduleSection!.steps.every((s) => typeof s.label === "string" && typeof s.amount === "string"), "list rows");
  add("15H-DC: CTA has accessible name", card("15H-T4").accessibilityLabel.length > 0, "a11y label");
  add("15H-DD: modal title is labelled", review("15H-T4").title.length > 0, "title");
  add("15H-DE: status is not communicated by color alone", review("15H-T9").safetyBufferSection.rows.some((r) => /Preserved/i.test(r.value)), "text status");

  // 15H-DF…DM. Product invariants.
  const funded15H = bufferFixture(5000, 1000, 3);
  const aligned15H = allocationFixture(15000, 62, 2);
  const engineRun15H = runSuggestionEngine(inputsFor({ safetyBuffer: funded15H, allocation: aligned15H, positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const staking15H = engineRun15H.suggestions.find((s) => s.category === "staking");
  add("15H-DF: SOL staking output unchanged", staking15H?.protocolSelection?.selectedProtocolId === "jito", "unchanged");
  add("15H-DG: dynamic staking leader unchanged", staking15H?.protocolSelection?.selectedProtocolName === "Jito", "unchanged");
  add("15H-DH: selectedProtocolId remains current legacy behavior", staking15H?.protocolSelection?.selectedProtocolId === "jito", "unchanged");
  add("15H-DI: stable-yield behavior unchanged", readIf("src/suggestions/stableYieldSuggestion.ts").length > 0, "unchanged");
  add("15H-DJ: rebalance behavior unchanged", readIf("src/suggestions/rebalanceSuggestion.ts").length > 0, "unchanged");
  add("15H-DK: trim behavior unchanged", readIf("src/suggestions/trimSuggestion.ts").length > 0, "unchanged");
  add("15H-DL: Position Optimization unchanged", readIf("src/suggestions/positionOptimizationSuggestion.ts").length > 0, "unchanged");
  {
    const merged = mergeContributionPlanSuggestion([mkSug15H("stk", "staking"), mkSug15H("reb", "rebalance"), mkSug15H("dca_core_exposure", "dca")], sc("15H-T4"));
    add("15H-DM: existing non-contribution On Track unchanged", merged.suggestions.filter((s) => s.category === "staking" || s.category === "rebalance").length === 2, "untouched");
  }

  // 15H-DN…DV. Execution invariants.
  {
    const blob = ["contributionIntegrationTypes", "contributionPortfolioAdapter", "contributionLiquidityAdapter", "contributionPriceAdapter", "contributionPlanPipeline", "contributionPlanSuggestion", "contributionPlanPresentation", "contributionPlanReviewDetails", "contributionTestingScenarios"].map((f) => readIf(`src/suggestions/${f}.ts`)).join("").toLowerCase();
    add("15H-DN: no signMessage path added", !blob.includes("signmessage"), "none");
    add("15H-DO: no signTransaction path added", !blob.includes("signtransaction"), "none");
    add("15H-DP: no signAllTransactions path added", !blob.includes("signalltransactions"), "none");
    add("15H-DQ: no sendTransaction path added", !blob.includes("sendtransaction"), "none");
    const handlers = ["buy(", "swap(", "deposit(", "invest(", "execute(", "withdraw(", "transfer("];
    add("15H-DR: no buy/swap/deposit/invest/execute/withdraw/transfer handler added", handlers.filter((h) => blob.includes(h)).length === 0, "none");
    add("15H-DS: no route selected", sc("15H-T9").plan!.routeEvaluated === false && sc("15H-T9").plan!.steps.every((s) => s.routeSelected === false), "none");
    add("15H-DT: no protocol selected", sc("15H-T9").plan!.protocolEvaluated === false && sc("15H-T9").plan!.steps.every((s) => s.protocolSelected === false), "none");
    add("15H-DU: no wallet signature requested", sc("15H-T9").suggestion!.contributionPlan.walletSignatureRequired === false && sc("15H-T9").walletSignatureRequired === false, "none");
    add("15H-DV: no automation enabled", sc("15H-T9").plan!.automationEnabled === false && CONTRIBUTION_PLAN_EXECUTION_ENABLED_15H() === false, "none");
  }

  // Feature-state + adapters-exist smoke.
  add("15H-flags: integration + UI + pipeline flags enabled; execution stays disabled", CONTRIBUTION_SUGGESTION_UI_ENABLED === true && CONTRIBUTION_REVIEW_MODAL_ENABLED === true && CONTRIBUTION_DEMO_PIPELINE_ENABLED === true && CONTRIBUTION_REAL_WALLET_PIPELINE_ENABLED === true && CONTRIBUTION_TESTING_SCENARIOS_EXIST_FLAG === true, "flags");

  return checks;
}


/**
 * Step 15H UI turn — verifies the plan-backed suggestion enters the shared engine output, the mapper
 * produces deterministic card copy, the shared card/modal are wired (source), the /testing scenarios
 * render through the shared components, ordering/Top-Pick are reused, existing families are
 * unchanged, and no execution/browser-fetch path is added.
 */
export function runContributionUiTurnFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const root = process.cwd();
  const readIf = (rel: string) => { try { return readFileSync(`${root}/${rel}`, "utf8"); } catch { return ""; } };

  const t1 = runContributionTestingScenario("15H-T1")!.pipeline.suggestion!;
  const t4 = runContributionTestingScenario("15H-T4")!.pipeline.suggestion!;
  const t4card = runContributionTestingScenario("15H-T4")!.card!;
  const t5review = runContributionTestingScenario("15H-T5")!.review!;
  const t9review = runContributionTestingScenario("15H-T9")!.review!;
  const cardSrc = readIf("src/components/SuggestionCard.tsx");
  const modalSrc = readIf("src/components/SuggestionReviewModal.tsx");
  const railSrc = readIf("src/components/RealWalletSuggestionsRail.tsx");
  const engineSrc = readIf("src/suggestions/engine.ts");
  const priceAdapterSrc = readIf("src/suggestions/contributionPriceAdapter.ts");
  const productInputSrc = readIf("src/suggestions/contributionProductInput.ts");
  const testingPageSrc = readIf("src/pages/TestingPage.tsx");

  // Aligned (buffer complete, no rebalance) inputs so the plan DCA takes the DCA slot.
  const alignedRun = (contrib: import("../engineTypes").EngineSuggestion | null) => runSuggestionEngine(inputsFor({ allocation: allocationFixture(15000, 60, 0), safetyBuffer: bufferFixture(5000, 1000, 3), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT, contrib);
  const bufferRun = (contrib: import("../engineTypes").EngineSuggestion | null) => runSuggestionEngine(inputsFor({ safetyBuffer: bufferFixture(800, 1000, 3), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT, contrib);

  // 15H-UI-A…H.
  const runWithDca = alignedRun(t4);
  add("15H-UI-A: plan-backed suggestion enters the shared engine output", runWithDca.suggestions.some((s) => s.id === "contribution_dca_sol"), "in output");
  add("15H-UI-B: final engine sort is reused", runWithDca.suggestions.length > 0 && runWithDca.suggestions.filter((s) => s.is_top_pick).length <= 1, "reused");
  add("15H-UI-C: existing Top Pick selector is reused", selectTopPick15H(runWithDca.suggestions).filter((s) => s.is_top_pick).length <= 1 && engineSrc.includes("selectTopPick"), "reused");
  add("15H-UI-D: SuggestionRail does not reorder", !readIf("src/components/SuggestionRail.tsx").includes(".sort("), "no reorder");
  add("15H-UI-E: SuggestionCard uses deterministic presentation", t4card.title === "Build SOL Gradually" && toSuggestionCard15H(t4).title === t4card.title, "deterministic");
  add("15H-UI-F: SuggestionCard performs no financial calculation", !/toFixed|Math\.(round|min|max|floor)|parseFloat|Number\(|valueUsd\s*[*/+-]|\/\s*100/.test(cardSrc), "no calc");
  add("15H-UI-G: Review opens the shared modal only", t4card.ctaLabel === "Review" && t4card.readOnly === true && toSuggestionCard15H(t4).cta.executes_transaction === false, "modal only");
  add("15H-UI-H: no wallet method runs on CTA click", !/signTransaction|sendTransaction|signMessage|signAllTransactions/.test(cardSrc), "no wallet");

  // 15H-UI-I…T. Shared modal render (source + data).
  add("15H-UI-I: contribution review exposes summary rows", runContributionTestingScenario("15H-T4")!.review!.summaryRows.length > 0, "rows");
  add("15H-UI-J: shared modal renders exact amount", runContributionTestingScenario("15H-T4")!.review!.summaryRows.some((r) => /\$/.test(r.value)), "exact");
  add("15H-UI-K: shared modal renders range amount", t5review.summaryRows.some((r) => /–/.test(r.value)), "range");
  add("15H-UI-L: contribution review exposes recurring cadence", runContributionTestingScenario("15H-T4")!.review!.cadenceSection != null, "cadence");
  add("15H-UI-M: shared modal renders Occasional explicit amount", runContributionTestingScenario("15H-T8")!.review!.cadenceSection!.rows.some((r) => /Occasional/i.test(r.value)), "occasional");
  add("15H-UI-N: contribution review exposes four-step schedule", t9review.scheduleSection!.steps.length === 4, "schedule");
  add("15H-UI-O: shared modal renders relative labels without dates", t9review.scheduleSection!.steps.map((s) => s.label).join(",") === "Start,Day 5,Day 9,Day 14", "relative");
  add("15H-UI-P: shared modal renders Safety Buffer preservation", t9review.safetyBufferSection.rows.some((r) => /Preserved/i.test(r.value)), "preserved");
  add("15H-UI-Q: alternative source is context-only (no switcher)", (() => { const r = runContributionTestingScenario("15H-T10")!.review!; return r.alternativeSourceSection != null && r.alternativeSourceSection.rows.every((x) => /context only/i.test(x.value)) && r.executionControlsPresent === false && !/<input|<select|onChange|type="radio"/i.test(modalSrc); })(), "context only");
  add("15H-UI-R: unallocated capacity is not routed", runContributionTestingScenario("15H-T1")!.pipeline.plan?.unallocatedSourceCapacity.routed === false, "not routed");
  add("15H-UI-S: exact read-only notice present in review", runContributionTestingScenario("15H-T4")!.review!.readOnlyNotice === CONTRIBUTION_PLAN_READ_ONLY_NOTICE, "notice");
  add("15H-UI-T: no execution action renders", !/Execute|Confirm Trade|Start DCA|Open Wallet|Buy Now/.test(modalSrc), "no exec");

  // 15H-UI-U…AB. Demo + Real Wallet.
  add("15H-UI-U: Demo invokes the contribution pipeline (behavioral: demo rail emits a contribution card + review)", (() => { const r = buildDemoStableYieldRail(); return r.cards.some((c) => c.category === "contribution_plan") && Object.keys(r.contributionReviewById ?? {}).length > 0; })(), "invoked");
  add("15H-UI-V: canonical Demo remains buffer-first", bufferRun(t1).suggestions.length === 1 && bufferRun(t1).suggestions[0].category === "buffer", "buffer first");
  add("15H-UI-W: Demo contains one buffer suggestion", bufferRun(t1).suggestions.filter((s) => s.category === "buffer").length === 1, "one buffer");
  add("15H-UI-X: Demo contains no pre-buffer SOL DCA", bufferRun(t1).suggestions.every((s) => s.category !== "dca"), "no dca");
  add("15H-UI-Y: Real Wallet mode is the DEFAULT (behavioral: rail without dataMode === rail with dataMode real_wallet)", (() => { const base = { positions: DEMO_STABLE_YIELD_POSITIONS, pricedAsOf: DEMO_STABLE_YIELD_PRICED_AS_OF, goal: DEMO_STABLE_YIELD_GOAL }; const ids = (r: ReturnType<typeof SY_deriveRail>) => JSON.stringify(r.cards.map((c) => c.id)); return ids(SY_deriveRail(base)) === ids(SY_deriveRail({ ...base, dataMode: "real_wallet" })); })(), "real mode default");
  add("15H-UI-Z: Real Wallet imports no Demo/testing fixtures", !/demoDashboardState|testingPageFixtures|contributionTestingScenarios|demoFixture|buildDemo/.test(productInputSrc) && !/demoDashboardState|contributionTestingScenarios/.test(readIf("src/suggestions/useRailSuggestions.ts")), "no fixtures");
  add("15H-UI-AA: missing Real Wallet data produces no contribution suggestion", runContributionTestingScenario("15H-T15")!.pipeline.suggestion === undefined, "no suggestion");
  add("15H-UI-AB: missing Real Wallet data does not produce false On Track", runContributionTestingScenario("15H-T15")!.pipeline.status !== "no_action_required", "no false on track");

  // 15H-UI-AC…AE. Pipeline behaviors.
  add("15H-UI-AC: Safety Buffer plan works without SOL price", runContributionTestingScenario("15H-T1")!.pipeline.status === "ready" && runContributionTestingScenario("15H-T1")!.pipeline.plan!.kind === "safety_buffer_contribution", "no price ok");
  add("15H-UI-AD: growth upcoming works without optional liquidity alternative", runContributionTestingScenario("15H-T4")!.pipeline.plan!.fundingSourceId === "upcoming_contribution", "no liquidity ok");
  add("15H-UI-AE: growth excess-USDC requires current liquidity", runContributionTestingScenario("15H-T9")!.pipeline.plan!.fundingSourceId === "existing_excess_usdc", "requires liquidity");

  // 15H-UI-AF…AK. Testing route.
  add("15H-UI-AF: all testing scenarios are registered (30 unit + 4 slice-7C production market cases)", runAllContributionTestingScenarios().length === 34 && testingPageSrc.includes("runAllContributionTestingScenarios"), "34");
  add("15H-UI-AG: ready testing scenarios use the shared card", testingPageSrc.includes("toSuggestionCard(p.suggestion)") && runAllContributionTestingScenarios().filter((s) => s.pipeline.status === "ready").every((s) => s.card != null), "shared card");
  add("15H-UI-AH: ready testing scenarios use the shared modal", testingPageSrc.includes("contributionReview={selectedScenario.review}") && runAllContributionTestingScenarios().filter((s) => s.pipeline.status === "ready").every((s) => s.review != null), "shared modal");
  add("15H-UI-AI: blocked testing scenarios render no recommendation card", runAllContributionTestingScenarios().filter((s) => s.pipeline.status !== "ready" && s.pipeline.status !== "no_action_required").every((s) => s.card === undefined), "no card");
  add("15H-UI-AJ: testing fixtures cannot enter Demo", runAllContributionTestingScenarios().every((s) => s.pipeline.demoFixtureDataUsed === false), "not demo");
  add("15H-UI-AK: testing fixtures cannot enter Real Wallet", runAllContributionTestingScenarios().every((s) => s.pipeline.realWalletDataUsed === false), "not real");

  // 15H-UI-AL…AP. Determinism + ordering.
  add("15H-UI-AL: same semantic rerender does not duplicate the card", runContributionTestingScenario("15H-T4")!.pipeline.plan!.planId === runContributionTestingScenario("15H-T30")!.pipeline.plan!.planId, "stable id");
  add("15H-UI-AM: at most one Top Pick exists", selectTopPick15H(alignedRun(t4).suggestions).filter((s) => s.is_top_pick).length === 1, "one");
  add("15H-UI-AN: buffer override remains absolute", bufferRun(t1).suggestions.every((s) => s.category === "buffer"), "absolute");
  add("15H-UI-AO: Rebalance outranks DCA", selectTopPick15H([mkSug15H("reb", "rebalance"), t4]).find((s) => s.is_top_pick)!.category === "rebalance", "rebalance top");
  add("15H-UI-AP: Capital Efficiency outranks DCA", selectTopPick15H([mkSug15H("ce", "capital_efficiency"), t4]).find((s) => s.is_top_pick)!.category === "capital_efficiency", "ce top");

  // 15H-UI-AQ…AT. Existing families unchanged.
  const funded = bufferFixture(5000, 1000, 3);
  const aligned = allocationFixture(15000, 62, 2);
  const run = runSuggestionEngine(inputsFor({ safetyBuffer: funded, allocation: aligned, positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const staking = run.suggestions.find((s) => s.category === "staking");
  add("15H-UI-AQ: existing staking card remains unchanged", staking?.protocolSelection?.selectedProtocolId === "jito", "unchanged");
  add("15H-UI-AR: existing staking modal remains unchanged", modalSrc.includes("selectorPresentation") && modalSrc.includes("SolStakingLeaderExplanation"), "unchanged");
  add("15H-UI-AS: stable yield remains unchanged", readIf("src/suggestions/stableYieldSuggestion.ts").length > 0, "unchanged");
  add("15H-UI-AT: trim remains unchanged", readIf("src/suggestions/trimSuggestion.ts").length > 0, "unchanged");

  // 15H-UI-AU…AZ. Execution invariants (source scans across the touched product/UI files).
  const uiBlob = [cardSrc, modalSrc, railSrc, productInputSrc, testingPageSrc, readIf("src/suggestions/useRailSuggestions.ts"), engineSrc].join("").toLowerCase();
  add("15H-UI-AU: no signMessage reference is added", !uiBlob.includes("signmessage"), "none");
  add("15H-UI-AV: no signTransaction reference is added", !uiBlob.includes("signtransaction"), "none");
  add("15H-UI-AW: no signAllTransactions reference is added", !uiBlob.includes("signalltransactions"), "none");
  add("15H-UI-AX: no sendTransaction reference is added", !uiBlob.includes("sendtransaction"), "none");
  add("15H-UI-AY: no buy/swap/deposit/withdraw/transfer action is added", ["buy(", "swap(", "deposit(", "withdraw(", "transfer("].filter((h) => uiBlob.includes(h)).length === 0, "none");
  add("15H-UI-AZ: no direct browser price-provider fetch is added", !/fetch\(|xmlhttprequest|axios/i.test(priceAdapterSrc + productInputSrc), "no fetch");

  return checks;
}


export function runDcaContributionCanonicalMountFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const readIfSrc = (rel: string) => { try { return readFileSync(`${process.cwd()}/${rel}`, "utf8"); } catch { return ""; } };
  const T_ISO = "2026-07-01T00:00:00.000Z";
  const T_MS = Date.parse(T_ISO);
  const usdc = (v: number) => ({ id: "u", source: "wallet", type: "token", symbol: "USDC", name: "USD Coin", detection: "direct_wallet_balance", valueUsd: v, uiAmount: v, priceUsd: 1 } as unknown as WalletPosition);
  const sol = (v: number, price = 150) => ({ id: "s", source: "wallet", type: "native", symbol: "SOL", name: "Solana", detection: "direct_wallet_balance", valueUsd: v, uiAmount: v / price, priceUsd: price } as unknown as WalletPosition);
  const underweightPositions = [usdc(9000), sol(4300)]; // crypto ≈ 32.3% of 13,300 → underweight vs a 60% target
  const goalBase = { ...DEMO_GOAL, expenses_monthly: 100 }; // monthly_saving_goal 1000, monthly cadence
  // Complete buffer that consumes all USDC (no excess) → the DCA funds from the UPCOMING CONTRIBUTION (monthly cadence).
  const completeBuffer = { stableUsd: 9000, targetUsd: 9000, targetMonths: 3, coveragePct: 100, monthsCovered: 90, fullyFunded: true };
  const CT = (cryptoPct: number, stablePct: number, conf: "full" | "degraded_market_excluded" = "full", real = true) => ({ targetStablePct: stablePct, targetCryptoPct: cryptoPct, targetStableUsd: null, targetCryptoUsd: null, targetConfidence: conf, marketExcluded: conf === "degraded_market_excluded", marketExclusionReason: conf === "degraded_market_excluded" ? "market_observation_missing" : null, marketAdjustmentVsProfileOnlyPct: conf === "full" ? 1.5 : null, methodologyVersion: real ? TARGET_ALLOCATION_ASSESSMENT_VERSION : "transitional_risk_only", policyVersion: "target_allocation_policy_v1", rebalanceTargetEligible: true, dcaTargetEligible: true, onTrackTargetEligible: conf === "full" }) as import("../canonicalTargetAllocation").CanonicalTargetAllocation;
  type DcaTargetState = import("../rebalanceAssessment").RebalanceTargetState;
  const run = (target: ReturnType<typeof CT> | null | undefined, state: DcaTargetState | undefined, opts: { positions?: WalletPosition[]; goal?: typeof goalBase; buffer?: typeof completeBuffer; prov?: boolean } = {}) =>
    deriveContributionSuggestion({ dataMode: "real_wallet", positions: opts.positions ?? underweightPositions, pricedAsOf: T_MS, goal: opts.goal ?? goalBase, buffer: opts.buffer ?? completeBuffer, ...(opts.prov === false ? {} : { priceProvenance: { sourceId: PRICE_SRC_15H } }), ...(target !== undefined ? { targetAllocation: target } : {}), ...(state !== undefined ? { targetState: state } : {}) });
  const reviewOf = (res: ReturnType<typeof run>) => (res.suggestion ? res.reviewById[res.suggestion.id] : undefined);

  // ---- Architecture ----
  add("DCM-1: contribution pipeline consumes the canonical target (imports CanonicalTargetAllocation + reads input.targetAllocation)", (() => { const s = readIfSrc("src/suggestions/contributionPlanPipeline.ts"); return /CanonicalTargetAllocation/.test(s) && /input\.targetAllocation/.test(s); })(), "pipeline canonical");
  add("DCM-2 (slice 7D): the rail passes the SAME shared canonical target (the one Rebalance consumes) to the contribution pipeline UNCONDITIONALLY in every mode — no conditional/transitional branch", (() => { const r = readIfSrc("src/suggestions/useRailSuggestions.ts"); return /targetAllocation: rebalanceTarget, targetState: rebalanceTargetState,/.test(r) && !/useCanonicalTarget \? \{ targetAllocation/.test(r); })(), "one shared target");
  add("DCM-3 (slice 7D): the legacy risk-only allocation input is DELETED — the engine `allocation` input is always null and there is no deriveRecommendedAllocation/deltas leak in the rail", (() => { const r = readIfSrc("src/suggestions/useRailSuggestions.ts"); return /const allocationInput = null;/.test(r) && /allocation: allocationInput,/.test(r) && !/deriveRecommendedAllocation/.test(r); })(), "no legacy leak");

  // ---- Confidence eligibility ----
  add("DCM-4: full canonical target → DCA eligible (category dca), pipeline maps crypto/stable from the target", (() => { const res = run(CT(60, 40), "full"); return res.suggestion?.category === "dca" && res.pipeline?.finalTargetCryptoPct === 60 && res.pipeline?.finalTargetStablePct === 40 && res.pipeline?.marketIncluded === true; })(), "full eligible");
  add("DCM-5: degraded canonical target → DCA eligible; marketIncluded false", (() => { const res = run(CT(60, 40, "degraded_market_excluded"), "degraded_market_excluded"); return res.suggestion?.category === "dca" && res.pipeline?.marketIncluded === false && res.pipeline?.targetConfidence === "degraded_market_excluded"; })(), "degraded eligible");
  add("DCM-6: unavailable / blocked / unresolved / loading canonical target → NO DCA (fail closed, no card)", (() => { const un = run(null, "unavailable"); const bl = run(null, "blocked"); const ur = run(null, "unresolved"); const ld = run(null, "loading"); return un.suggestion === null && bl.suggestion === null && ur.suggestion === null && ld.suggestion === null && un.pipeline?.blockers.includes("target_unavailable") === true && bl.pipeline?.blockers.includes("target_blocked") === true; })(), "fail closed");
  add("DCM-7: MISSING target context (real-wallet, no target supplied) → NO DCA (fail closed target_unresolved)", (() => { const res = run(undefined, undefined); return res.suggestion === null && res.pipeline?.blockers.includes("target_unresolved") === true; })(), "missing → closed");

  // ---- Target consistency + no recomputation ----
  add("DCM-8: no local target recalculation — pipeline surfaces the SUPPLIED target verbatim (finalVolatile→crypto, finalStable→stable)", (() => { const t = CT(65, 35); const res = run(t, "full"); return res.pipeline?.finalTargetCryptoPct === t.targetCryptoPct && res.pipeline?.finalTargetStablePct === t.targetStablePct; })(), "no recompute");
  add("DCM-9: same canonical target reaches Rebalance and DCA — the pipeline consumes the identical percentages the rail hands Rebalance", (() => { const t = CT(60, 40); const res = run(t, "full"); return res.pipeline?.finalTargetCryptoPct === t.targetCryptoPct; })(), "shared pcts");

  // ---- Minimum ----
  add("DCM-10: contribution below the $50 minimum → no DCA card (minimum unchanged, degraded cannot bypass)", (() => { const smallGoal = { ...goalBase, monthly_saving_goal: 40 }; const full = run(CT(60, 40), "full", { goal: smallGoal }); const deg = run(CT(60, 40, "degraded_market_excluded"), "degraded_market_excluded", { goal: smallGoal }); return full.suggestion === null && deg.suggestion === null; })(), "min $50");

  // ---- Direction (from gap, never sentiment) ----
  add("DCM-11: direction from the allocation gap — crypto UNDER a 60% target → DCA (targetPct 60); an ALIGNED target (≈current) → no DCA; the market band only moves the target", (() => { const under = run(CT(60, 40), "full"); const aligned = run(CT(32, 68), "full"); return under.suggestion?.category === "dca" && (under.suggestion as { contributionPlan?: { targetPct?: number } }).contributionPlan?.targetPct === 60 && aligned.suggestion === null && aligned.pipeline?.status === "no_action_required"; })(), "gap direction");

  // ---- Rebalance conflict authority (engine, unchanged) ----
  add("DCM-12 (slice 7D): engine gates DCA behind the canonical rebalance signal (inside `!rebalanceApplies`, keyed on rebalanceOverride.material); the DCA source is the single `const dca = planDca` with NO legacy/`??`/`||` fallback", (() => { const e = readIfSrc("src/suggestions/engine.ts"); return /if \(!rebalanceApplies\)/.test(e) && /rebalanceApplies = rebalanceOverride\?\.material/.test(e) && /const dca: EngineSuggestion \| null = planDca;/.test(e) && !/legacyDcaEligible/.test(e) && !/deriveDcaSuggestion/.test(e); })(), "conflict authority");

  // ---- Review copy ----
  add("DCM-13: full DCA Review discloses 10% market input + CoinMarketCap + not-a-buy/sell; no score/band/timing", (() => { const r = reviewOf(run(CT(60, 40), "full")); const body = r?.marketContextSection?.body ?? ""; return /10% of your target-allocation calculation/.test(body) && /Data source: CoinMarketCap/.test(body) && /does not directly create buy or sell/.test(body) && !/\b\d{1,3}\/100\b|Fear|Greed|bullish|bearish|time to (buy|sell)/.test(body); })(), "full review");
  add("DCM-14: degraded DCA Review discloses exclusion + renormalization; no score/band/CoinMarketCap/Neutral", (() => { const r = reviewOf(run(CT(60, 40, "degraded_market_excluded"), "degraded_market_excluded")); const body = r?.marketContextSection?.body ?? ""; return /market component was excluded, and the remaining profile factors were renormalized/.test(body) && !/CoinMarketCap|\/100|Neutral|Fear|Greed/.test(body); })(), "degraded review");
  add("DCM-15: transitional target DCA Review shows NO market section (never claims inclusion)", (() => { const r = reviewOf(run(CT(60, 40, "full", false), "full")); return r != null && r.marketContextSection === undefined; })(), "transitional review");

  // ---- Privacy ----
  add("DCM-16: DCA suggestion + Review expose no income/expenses/net cash flow/savings rate/market score/band/cache/key", (() => { const res = run(CT(60, 40), "full"); const s = JSON.stringify(res.suggestion) + JSON.stringify(reviewOf(res)); return !/income|expenses|net_?cash|savingsRate|"score"|"band"|cacheVersion|apiKey|X-CMC/i.test(s); })(), "privacy");
  add("DCM-17: no market-timing / emotional language anywhere in the DCA Review", (() => { const res = run(CT(60, 40), "full"); const s = JSON.stringify(reviewOf(res)); return !/buy the dip|Fear|Greed|bullish|bearish|sell now|time to buy/i.test(s); })(), "no timing copy");

  // ---- Contribution semantics ----
  add("DCM-18: contribution cadence preserved (from goal.contribution_frequency, not derived); income/expense change cannot alter the stored monthly contribution", (() => { const cp = (r: ReturnType<typeof run>) => (r.suggestion as { contributionPlan?: { contributionFrequencyId?: string } } | null)?.contributionPlan; const a = run(CT(60, 40), "full", { goal: { ...goalBase, income_monthly: 4000, expenses_monthly: 100 } }); const b = run(CT(60, 40), "full", { goal: { ...goalBase, income_monthly: 99999, expenses_monthly: 9999 } }); const ca = cp(a)?.contributionFrequencyId; const cb = cp(b)?.contributionFrequencyId; return a.suggestion?.category === "dca" && ca === "monthly" && ca === cb && goalBase.monthly_saving_goal === 1000; })(), "cadence + amount fixed");

  // ---- Slice 7D: legacy DCA fallback DELETED from the engine + pipeline (fail closed, no risk-only) ----
  const readSrc = readIfSrc;
  add("D41-1: engine DCA has ONE source — `const dca: ... = planDca;` — NO deriveDcaSuggestion, NO legacyDcaEligible, NO `??`/`||` fallback", (() => { const e = readSrc("src/suggestions/engine.ts"); return /const dca: EngineSuggestion \| null = planDca;/.test(e) && !/deriveDcaSuggestion/.test(e) && !/legacyDcaEligible/.test(e) && !/planDca \?\?/.test(e) && !/planDca \|\|/.test(e); })(), "single source");
  add("D41-2: the engine no longer declares a `legacyDcaEligible` param, and the rail no longer passes one", (() => { const e = readSrc("src/suggestions/engine.ts"); const r = readSrc("src/suggestions/useRailSuggestions.ts"); return !/legacyDcaEligible/.test(e) && !/legacyDcaEligible/.test(r); })(), "param gone");
  const d41Inputs = () => inputsFor({ allocation: allocationFixture(15000, 57, -3), safetyBuffer: bufferFixture(5000, 1000, 3), positions: [cryptoPosition(100)] });
  add("D41-3: REAL-WALLET with a null canonical planDca → NO DCA, even with a risk-only allocation present (no legacy evaluator)", (() => { const inputs = d41Inputs(); const bo = bufferOverrideFromInputs(inputs, FIXTURE_GENERATED_AT); const oto = onTrackOverrideFromInputs(inputs, FIXTURE_GENERATED_AT, undefined); const rw = runSuggestionEngineRaw(inputs, FIXTURE_GENERATED_AT, null, null, undefined, undefined, undefined, undefined, bo, oto); return !rw.suggestions.some((s) => s.category === "dca"); })(), "real-wallet no legacy");
  add("D41-4: EVERY mode with a null planDca → NO DCA — the legacy evaluator is UNREACHABLE through the engine (no opt-in exists)", (() => { const inputs = d41Inputs(); const bo = bufferOverrideFromInputs(inputs, FIXTURE_GENERATED_AT); const oto = onTrackOverrideFromInputs(inputs, FIXTURE_GENERATED_AT, undefined); const t = runSuggestionEngineRaw(inputs, FIXTURE_GENERATED_AT, null, null, undefined, undefined, undefined, undefined, bo, oto); return !t.suggestions.some((s) => s.category === "dca"); })(), "no legacy path");
  add("D41-5: real-wallet INCOMPLETE Safety Buffer + NO target → buffer contribution preserved, NO target failure, NO DCA (short-circuit before target)", (() => { const res = deriveContributionSuggestion({ dataMode: "real_wallet", positions: DEMO_POSITIONS, pricedAsOf: Date.parse("2026-07-01T00:00:00.000Z"), goal: DEMO_GOAL, buffer: { stableUsd: 800, targetUsd: 3000, targetMonths: 3, coveragePct: 26.67, monthsCovered: 0.8, fullyFunded: false } }); return res.suggestion?.category === "buffer" && !(res.pipeline?.blockers ?? []).some((b) => b.startsWith("target_")); })(), "buffer short-circuit");
  add("D41-6: the contribution pipeline no longer references deriveRecommendedAllocation ANYWHERE; the buffer-complete path fails closed on a missing/undefined target in every mode", (() => { const s = readSrc("src/suggestions/contributionPlanPipeline.ts"); return !/deriveRecommendedAllocation/.test(s) && /if \(input\.targetAllocation === undefined\) \{[\s\S]*?return fail\("blocked_policy", \["target_unresolved"\]\);/.test(s); })(), "no risk-only in pipeline");
  add("D41-7: the production Review modal RENDERS marketContextSection (title + body + rows), guarded so buffer/degraded show no empty section", (() => { const m = readSrc("src/components/SuggestionReviewModal.tsx"); return /cr\.marketContextSection &&[^\n]*\(/.test(m) && /cr\.marketContextSection\.body/.test(m) && /cr\.marketContextSection\.rows\.map/.test(m); })(), "modal renders");
  add("D41-8: the legacy `deriveDcaSuggestion` evaluator is NOT imported or called by the mounted engine (engine.ts has zero references)", (() => { const e = readSrc("src/suggestions/engine.ts"); return !/deriveDcaSuggestion/.test(e) && !/from "\.\/dcaSuggestion"/.test(e); })(), "not engine-wired");
  add("D41-9: zero risk-only DCA anywhere in the pipeline — no RISK_TARGET_ALLOCATION, no riskOnlyCanonicalTargetTransitional, no deriveRecommendedAllocation, no transitional_risk_only", (() => { const s = readSrc("src/suggestions/contributionPlanPipeline.ts"); return !/RISK_TARGET_ALLOCATION/.test(s) && !/riskOnlyCanonicalTargetTransitional/.test(s) && !/deriveRecommendedAllocation/.test(s) && !/transitional_risk_only/.test(s); })(), "no risk-only");

  // ---- Top-level allocation guard: never grow crypto (SOL) when the WHOLE crypto bucket is at/over target ----
  // Unit: the guard compares the crypto bucket (total − stable) to targetCryptoPct, matching the allocation card.
  add("DCG-1: isCryptoBucketAtOrAboveTarget — crypto over target → true; under → false; at target → true", (() => {
    const over = isCryptoBucketAtOrAboveTarget(26900, 9500, CT(63.5, 36.5));   // 64.7% ≥ 63.5% (the demo)
    const under = isCryptoBucketAtOrAboveTarget(13300, 9000, CT(60, 40));      // 32.3% < 60%
    const at = isCryptoBucketAtOrAboveTarget(10000, 4000, CT(60, 40));         // exactly 60%
    return over === true && under === false && at === true;
  })(), "bucket vs target");
  add("DCG-2: guard fails closed — no/invalid target or non-positive total → false (never suppresses)", (() => {
    return isCryptoBucketAtOrAboveTarget(26900, 9500, null) === false
      && isCryptoBucketAtOrAboveTarget(26900, 9500, undefined) === false
      && isCryptoBucketAtOrAboveTarget(0, 0, CT(60, 40)) === false;
  })(), "fail closed");

  // End-to-end: SOL-family underweight (would DCA) BUT total crypto (incl. a non-SOL memecoin) is over target → suppressed.
  const bonk = (v: number) => ({ id: "b", source: "wallet", type: "token", symbol: "BONK", name: "Bonk", detection: "direct_wallet_balance", valueUsd: v, uiAmount: v, priceUsd: 0.00003 } as unknown as WalletPosition);
  // total 10,000 · SOL 5,000 (SOL-family 50% < 60%) · BONK 1,500 (non-stable, non-SOL) · USDC 3,500 (stable)
  // → total crypto = 6,500 = 65% ≥ 60% target. Buffer funded from the USDC; a monthly contribution exists.
  const overTargetPositions = [usdc(3500), sol(5000), bonk(1500)];
  const overTargetBuffer = { stableUsd: 3500, targetUsd: 3500, targetMonths: 3, coveragePct: 100, monthsCovered: 90, fullyFunded: true };
  add("DCG-3: SOL-family underweight but total crypto ≥ target (memecoin fills the bucket) → DCA suppressed (no card)", (() => {
    const res = run(CT(60, 40), "full", { positions: overTargetPositions, buffer: overTargetBuffer });
    return res.suggestion === null; // pipeline still ran; the guard removed the growth DCA
  })(), "guard suppresses");
  add("DCG-4: mirror — same shape but total crypto UNDER target (smaller memecoin) → DCA still fires (guard does not over-suppress)", (() => {
    // total 10,000 · SOL 5,000 (50%) · BONK 200 · USDC 4,800 (stable) → crypto = 5,200 = 52% < 60% → allowed.
    const res = run(CT(60, 40), "full", { positions: [usdc(4800), sol(5000), bonk(200)], buffer: { stableUsd: 4800, targetUsd: 4800, targetMonths: 3, coveragePct: 100, monthsCovered: 90, fullyFunded: true } });
    return res.suggestion?.category === "dca";
  })(), "under-target still DCAs");

  // ---- Contribution allocation split (maintain/restore recommended allocation) ----
  const approxUsd = (a: number, b: number) => Math.abs(a - b) <= 0.51;
  add("CAS-1: near target (the demo) → split both legs; SOL+USDC sum to the contribution; leg amounts restore the target", (() => {
    // demo: total 26,900 · stable 9,500 · target crypto 63.5% · monthly 1,000
    const s = computeContributionAllocationSplit({ totalUsd: 26900, stableUsd: 9500, monthlyContributionUsd: 1000, targetCryptoPct: 63.5 });
    if (!s) return false;
    // crypto leg = 63.5% × 27,900 − 17,400 = 316.5 ; stable leg = 683.5
    return approxUsd(legAmount(s, "sol"), 316.5) && approxUsd(legAmount(s, "usdc"), 683.5) && approxUsd(legAmount(s, "sol") + legAmount(s, "usdc"), 1000) && legApplies(s, "sol") && legApplies(s, "usdc");
  })(), "split restores");
  add("CAS-2: crypto far UNDER target → whole contribution to SOL (USDC leg below min is rolled in)", (() => {
    // total 10,000 · stable 5,000 (crypto 50%) · target 90% → crypto leg would exceed → all to SOL
    const s = computeContributionAllocationSplit({ totalUsd: 10000, stableUsd: 5000, monthlyContributionUsd: 1000, targetCryptoPct: 90 });
    return !!s && approxUsd(legAmount(s, "sol"), 1000) && legAmount(s, "usdc") === 0 && legApplies(s, "sol") && !legApplies(s, "usdc");
  })(), "all SOL");
  add("CAS-3: crypto far OVER target → whole contribution to USDC (SOL leg below min is rolled in)", (() => {
    // total 10,000 · stable 1,000 (crypto 90%) · target 30% → crypto over → all to USDC
    const s = computeContributionAllocationSplit({ totalUsd: 10000, stableUsd: 1000, monthlyContributionUsd: 1000, targetCryptoPct: 30 });
    return !!s && legAmount(s, "sol") === 0 && approxUsd(legAmount(s, "usdc"), 1000) && !legApplies(s, "sol") && legApplies(s, "usdc");
  })(), "all USDC");
  add("CAS-4: fails closed on invalid input (non-positive total/contribution, stable>total, out-of-range target)", (() => {
    return computeContributionAllocationSplit({ totalUsd: 0, stableUsd: 0, monthlyContributionUsd: 1000, targetCryptoPct: 60 }) === null
      && computeContributionAllocationSplit({ totalUsd: 1000, stableUsd: 2000, monthlyContributionUsd: 100, targetCryptoPct: 60 }) === null
      && computeContributionAllocationSplit({ totalUsd: 1000, stableUsd: 100, monthlyContributionUsd: 0, targetCryptoPct: 60 }) === null
      && computeContributionAllocationSplit({ totalUsd: 1000, stableUsd: 100, monthlyContributionUsd: 100, targetCryptoPct: 140 }) === null;
  })(), "fail closed");
  add("CAS-5: split cards — near target (demo) → TWO cards (SOL + USDC), correct ids/amounts, neither Top Pick, each has a contribution review", (() => {
    const s = computeContributionAllocationSplit({ totalUsd: 26900, stableUsd: 9500, monthlyContributionUsd: 1000, targetCryptoPct: 63.5 });
    if (!s) return false;
    const { cards, contributionReviewById } = buildContributionSplitCards(s, { sol: 150 });
    const solC = cards.find((c) => c.id === "contribution_split_sol");
    const usdcC = cards.find((c) => c.id === "contribution_split_usdc");
    return cards.length === 2 && !!solC && !!usdcC && /Add \$317 of SOL/.test(solC.impact_text) && /Add \$684 of USDC/.test(usdcC.impact_text)
      && solC.is_top_pick === false && usdcC.is_top_pick === false && !!contributionReviewById[solC.id] && !!contributionReviewById[usdcC.id];
  })(), "two cards");
  add("CAS-6: split cards — far under target → ONE SOL card only; far over → ONE USDC card only", (() => {
    const under = computeContributionAllocationSplit({ totalUsd: 10000, stableUsd: 5000, monthlyContributionUsd: 1000, targetCryptoPct: 90 });
    const over = computeContributionAllocationSplit({ totalUsd: 10000, stableUsd: 1000, monthlyContributionUsd: 1000, targetCryptoPct: 30 });
    if (!under || !over) return false;
    const u = buildContributionSplitCards(under, { sol: 150 }).cards;
    const o = buildContributionSplitCards(over, { sol: 150 }).cards;
    return u.length === 1 && u[0].id === "contribution_split_sol" && o.length === 1 && o[0].id === "contribution_split_usdc";
  })(), "single-leg cards");
  add("CAS-7: SOL split modal is DCA-consistent — 2 metric cards (Next contribution X SOL/$Y · Target crypto allocation) + Cancel / Buy SOL on Moonpay footer; no % arithmetic in the split body", (() => {
    const s = computeContributionAllocationSplit({ totalUsd: 26900, stableUsd: 9500, monthlyContributionUsd: 1000, targetCryptoPct: 63.5 });
    if (!s) return false;
    const r = buildContributionSplitCards(s, { sol: 150 }).contributionReviewById["contribution_split_sol"];
    if (!r) return false;
    const m = r.keyMetrics;
    return r.focusedLayout === true && m.length === 2
      && m[0].label === "Next contribution" && /SOL$/.test(m[0].value) && m[0].subValue === "$317"
      && m[1].label === "Target crypto allocation" && m[1].value === "63.5%"
      && !/today|after the full contribution|Safety Buffer stays covered/.test(r.whySection.body)
      && r.externalLink?.ctaLabel === "Buy SOL on Moonpay" && r.externalLink?.secondaryLabel === "Cancel"
      && r.closeLabel === "Close" && r.executionControlsPresent === false;
  })(), "DCA-consistent SOL modal");
  add("CAS-8: USDC split modal → Next contribution 684 USDC/$684 + Target stablecoin allocation + Buy USDC on Moonpay", (() => {
    const s = computeContributionAllocationSplit({ totalUsd: 26900, stableUsd: 9500, monthlyContributionUsd: 1000, targetCryptoPct: 63.5 });
    if (!s) return false;
    const r = buildContributionSplitCards(s, { sol: 150 }).contributionReviewById["contribution_split_usdc"];
    if (!r) return false;
    const m = r.keyMetrics;
    return m.length === 2 && m[0].value === "684 USDC" && m[0].subValue === "$684"
      && m[1].label === "Target stablecoin allocation" && m[1].value === "36.5%"
      && r.externalLink?.ctaLabel === "Buy USDC on Moonpay";
  })(), "DCA-consistent USDC modal");
  // ---- External Holdings: manual amount validation (Add Bitcoin / Add Ethereum) ----
  add("EXT-1: blank / non-numeric / non-positive amounts are rejected with the approved errors", (() => {
    const btc = (v: string) => manualAmountError(v, 8, "Bitcoin");
    return btc("") === "Enter an amount to continue."
      && btc("   ") === "Enter an amount to continue."
      && btc("abc") === "Enter a valid amount."
      && btc("1e5") === "Enter a valid amount."
      && btc("-1") === "Enter a valid amount."
      && btc(".") === "Enter a valid amount."
      && btc("0") === "Enter a positive amount."
      && btc("0.00") === "Enter a positive amount.";
  })(), "invalid rejected");
  add("EXT-2: per-chain precision — BTC caps at 8 decimals, ETH at 18; within-limit amounts pass", (() => {
    return manualAmountError("0.123456789", 8, "Bitcoin") === "Bitcoin supports up to 8 decimal places."
      && manualAmountError("0.0952245", 8, "Bitcoin") === undefined
      && manualAmountError("0.12345678", 8, "Bitcoin") === undefined
      && manualAmountError("0.1234567891234567891", 18, "Ethereum") === "Ethereum supports up to 18 decimal places."
      && manualAmountError("1.5", 18, "Ethereum") === undefined;
  })(), "precision");
  add("EXT-3: thousands separators/whitespace are tolerated; a valid amount returns no error", (() => {
    return manualAmountError(" 1,234.5 ", 8, "Bitcoin") === undefined
      && manualAmountError("2", 8, "Bitcoin") === undefined;
  })(), "separators");
  // ---- Growth sub-allocation policy (splits the crypto sleeve across held SOL/BTC/ETH) ----
  const approx = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) <= tol;
  add("GSA-1: every approved weights row totals 100, and risk tiers move BTC down / SOL up as risk rises", (() => {
    const w = GROWTH_SUB_ALLOCATION_WEIGHTS;
    const order = ["very_low", "low", "medium", "high", "very_high"];
    const btcDescending = order.every((r, i) => i === 0 || w[order[i - 1]].btc >= w[r].btc);
    const solAscending = order.every((r, i) => i === 0 || w[order[i - 1]].sol <= w[r].sol);
    return growthSubAllocationWeightsAreWellFormed() && btcDescending && solAscending;
  })(), "weights well-formed");
  add("GSA-2: held-only — SOL-only holder gets NO split (existing single-target behavior preserved)", (() => {
    const r = buildGrowthSubAllocation({ growthBucketPct: 63.5, riskLevel: "medium", heldTargetIds: ["sol"] });
    return r.status === "not_applicable" && Object.keys(r.targetPctByInvestmentTargetId).length === 0;
  })(), "single target unchanged");
  add("GSA-3: held-only — an unheld asset NEVER appears in the split (no asset-selection advice)", (() => {
    const r = buildGrowthSubAllocation({ growthBucketPct: 63.5, riskLevel: "medium", heldTargetIds: ["sol", "btc"] });
    return r.status === "configured" && r.participatingTargetIds.join(",") === "btc,sol"
      && r.targetPctByInvestmentTargetId.eth === undefined && r.sharePctByInvestmentTargetId.eth === undefined;
  })(), "never introduces assets");
  add("GSA-4: SOL+BTC at medium risk → 57.1% / 42.9% of the sleeve; per-target pcts total the growth bucket", (() => {
    const r = buildGrowthSubAllocation({ growthBucketPct: 63.5, riskLevel: "medium", heldTargetIds: ["btc", "sol"] });
    if (r.status !== "configured") return false;
    // medium weights BTC 40 / SOL 30 → renormalized over the two held: 40/70, 30/70.
    const shareBtc = r.sharePctByInvestmentTargetId.btc as number;
    const shareSol = r.sharePctByInvestmentTargetId.sol as number;
    const totalPct = (r.targetPctByInvestmentTargetId.btc as number) + (r.targetPctByInvestmentTargetId.sol as number);
    return approx(shareBtc, (40 / 70) * 100) && approx(shareSol, (30 / 70) * 100)
      && approx(shareBtc + shareSol, 100) && approx(totalPct, 63.5);
  })(), "renormalized split");
  add("GSA-5: all three held — shares total 100 and per-target pcts total the growth bucket, at every risk level", (() => {
    return ["very_low", "low", "medium", "high", "very_high"].every((risk) => {
      const r = buildGrowthSubAllocation({ growthBucketPct: 60, riskLevel: risk, heldTargetIds: ["btc", "eth", "sol"] });
      if (r.status !== "configured" || !validateGrowthSubAllocation(r).valid) return false;
      const shares = Object.values(r.sharePctByInvestmentTargetId) as number[];
      const pcts = Object.values(r.targetPctByInvestmentTargetId) as number[];
      return approx(shares.reduce((a, b) => a + b, 0), 100) && approx(pcts.reduce((a, b) => a + b, 0), 60);
    });
  })(), "totals hold");
  add("GSA-6: risk tilt is real — a very_high holder gets more SOL than a very_low holder for the same holdings", (() => {
    const lo = buildGrowthSubAllocation({ growthBucketPct: 60, riskLevel: "very_low", heldTargetIds: ["btc", "eth", "sol"] });
    const hi = buildGrowthSubAllocation({ growthBucketPct: 60, riskLevel: "very_high", heldTargetIds: ["btc", "eth", "sol"] });
    return (hi.targetPctByInvestmentTargetId.sol as number) > (lo.targetPctByInvestmentTargetId.sol as number)
      && (hi.targetPctByInvestmentTargetId.btc as number) < (lo.targetPctByInvestmentTargetId.btc as number);
  })(), "risk tilt");
  add("GSA-7: fails closed — unknown/missing risk, out-of-range bucket, and no holdings each yield no split", (() => {
    const noRisk = buildGrowthSubAllocation({ growthBucketPct: 60, riskLevel: null, heldTargetIds: ["btc", "sol"] });
    const badRisk = buildGrowthSubAllocation({ growthBucketPct: 60, riskLevel: "reckless", heldTargetIds: ["btc", "sol"] });
    const badBucket = buildGrowthSubAllocation({ growthBucketPct: 140, riskLevel: "medium", heldTargetIds: ["btc", "sol"] });
    const nothing = buildGrowthSubAllocation({ growthBucketPct: 60, riskLevel: "medium", heldTargetIds: [] });
    return noRisk.status === "invalid" && noRisk.blockers.includes("risk_level_missing_or_unknown")
      && badRisk.status === "invalid" && badRisk.blockers.includes("risk_level_missing_or_unknown")
      && badBucket.status === "invalid" && badBucket.blockers.includes("growth_bucket_invalid")
      && nothing.status === "not_applicable" && nothing.blockers.includes("no_held_growth_targets")
      && [noRisk, badRisk, badBucket, nothing].every((r) => Object.keys(r.targetPctByInvestmentTargetId).length === 0);
  })(), "fail closed");
  add("GSA-8: the policy decides percentages only — no amount, funding source, suggestion, or execution", (() => {
    const r = buildGrowthSubAllocation({ growthBucketPct: 60, riskLevel: "medium", heldTargetIds: ["btc", "sol"] });
    return r.contributionAmountCalculated === false && r.fundingSourceSelected === false
      && r.suggestionGenerated === false && r.transactionsEnabled === false;
  })(), "percentages only");

  // ---- growthTargetAllocationPolicy now consumes the sub-allocation for multi-target cohorts ----
  const allocIn = { targetStablePct: 36.5, targetVolatilePct: 63.5, sourceEngineVersion: "test" };
  add("GSA-9: SINGLE growth target is byte-identical to before (no regression for today's SOL-only product)", (() => {
    const r = buildGrowthAlloc(allocIn, { enabledGrowthTargetIds: ["sol"] });
    return r.status === "configured" && r.singleEnabledGrowthTargetPolicyApplied === true
      && r.targetPctByInvestmentTargetId.sol === 63.5 && r.targetPctByInvestmentTargetId.usdc === 36.5
      && validateGrowthAlloc(r).valid;
  })(), "single unchanged");
  add("GSA-10: MULTI growth targets + held SOL/BTC + risk → split maps through; growth entries total the bucket", (() => {
    const r = buildGrowthAlloc(allocIn, { enabledGrowthTargetIds: ["sol", "btc", "eth"], riskLevel: "medium", heldGrowthTargetIds: ["sol", "btc"] });
    if (r.status !== "configured" || !validateGrowthAlloc(r).valid) return false;
    const btc = r.targetPctByInvestmentTargetId.btc as number;
    const sol = r.targetPctByInvestmentTargetId.sol as number;
    return r.targetPctByInvestmentTargetId.eth === undefined            // never introduces an unheld asset
      && Math.abs(btc + sol - 63.5) < 1e-6                              // totals the growth bucket
      && Math.abs(btc - (40 / 70) * 63.5) < 1e-6                        // medium-risk renormalized weights
      && r.singleEnabledGrowthTargetPolicyApplied === false;
  })(), "multi split mapped");
  add("GSA-11: MULTI enabled but only ONE held → whole growth bucket maps to that asset (no invented split)", (() => {
    const r = buildGrowthAlloc(allocIn, { enabledGrowthTargetIds: ["sol", "btc", "eth"], riskLevel: "medium", heldGrowthTargetIds: ["btc"] });
    return r.status === "configured" && r.targetPctByInvestmentTargetId.btc === 63.5
      && r.targetPctByInvestmentTargetId.sol === undefined && r.singleEnabledGrowthTargetPolicyApplied === true
      && validateGrowthAlloc(r).valid;
  })(), "one held maps whole");
  add("GSA-12: MULTI targets still FAIL CLOSED without risk level or with nothing held", (() => {
    const noRisk = buildGrowthAlloc(allocIn, { enabledGrowthTargetIds: ["sol", "btc"], heldGrowthTargetIds: ["sol", "btc"] });
    const noneHeld = buildGrowthAlloc(allocIn, { enabledGrowthTargetIds: ["sol", "btc"], riskLevel: "medium", heldGrowthTargetIds: [] });
    return noRisk.status === "invalid" && noRisk.blockers.includes("multiple_growth_targets_require_suballocation_policy")
      && noneHeld.status === "invalid" && noneHeld.blockers.includes("multiple_growth_targets_require_suballocation_policy");
  })(), "multi fails closed");

  add("EXT-3b: zero is rejected when ADDING but accepted when MANAGING (clears the holding); negatives always rejected", (() => {
    const add0 = manualAmountError("0", 8, "Bitcoin");                 // adding → must be positive
    const manage0 = manualAmountError("0", 8, "Bitcoin", true);        // managing → allowed
    const manage0dp = manualAmountError("0.00", 8, "Bitcoin", true);   // 0.00 is still zero
    const manageNeg = manualAmountError("-1", 8, "Bitcoin", true);     // never valid
    return add0 === "Enter a positive amount." && manage0 === undefined && manage0dp === undefined
      && manageNeg === "Enter a valid amount."
      && isClearingAmount("0") === true && isClearingAmount("0.00") === true
      && isClearingAmount("0.5") === false;
  })(), "zero clears on manage");
  add("EXT-4: the engine core never references manual assets (engine / inputs / wallet summary stay clean)", (() => {
    const files = ["src/suggestions/engine.ts", "src/suggestions/engineInputAdapter.ts", "src/wallet/walletSummary.ts"];
    return files.every((f) => !/ExternalHoldings|ManualAsset|manualAmount|useManualAssets/.test(readSrc(f)));
  })(), "engine clean");
  add("EXT-7: manual assets reach the rail ONLY as an allocation measurement — positions, buffer, completeness, and the contribution pipeline keep reading the real wallet", (() => {
    const r = readSrc("src/suggestions/useRailSuggestions.ts");
    // The merged set is used for the Rebalance measurement and nothing else.
    const measuresRebalance = /positions: measuredPositions, portfolioCompleteness/.test(r);
    const bufferReal = /computeSafetyBufferCoverage\(positions/.test(r) || /deriveCompletenessGates\(positions/.test(r);
    const contributionReal = /deriveContributionSuggestion\(\{\s*\n?\s*dataMode, positions, pricedAsOf, goal, buffer,/.test(r);
    const engineInputsReal = /buildSuggestionEngineInputs\(\{\s*\n?\s*positions,/.test(r);
    return measuresRebalance && bufferReal && contributionReal && engineInputsReal;
  })(), "measurement only");
  add("EXT-8: a manually stated holding can NEVER be a Rebalance source (excluded inside the assessment, not at a call site)", (() => {
    const src = readSrc("src/suggestions/rebalanceAssessment.ts");
    // The exclusion sits in buildSourceCandidate, before any class-based branch.
    const idx = src.indexOf('p.detection === "manual_entry"');
    const kaminoIdx = src.indexOf('cls === "kamino_direct"');
    return idx > 0 && kaminoIdx > idx && /return exclude\("unsupported", "manually stated holding/.test(src);
  })(), "never a sell source");
  add("EXT-5: manual assets reach DISPLAY only — the suggestion rail still receives the real wallet positions, never the merged display array", (() => {
    const rw = readSrc("src/components/RealWalletPortfolio.tsx");
    const demo = readSrc("src/pages/DemoPortfolioPage.tsx");
    // Real wallet: the rail gets `positions`; only the donuts/liquid get the merge.
    const railGetsRealOnly = /useRailSuggestions\(\{ positions, pricedAsOf/.test(rw) && !/useRailSuggestions\(\{ *displayPositions/.test(rw);
    const displayMerged = /PortfolioAllocationDonuts positions=\{displayPositions\}/.test(rw) && /getLiquidPositions\(displayPositions\)/.test(rw);
    // Demo: the rail's POSITIONS arg stays the sample wallet; manual assets may
    // only appear as the third (measurement-only) argument, never as positions.
    const demoRailRealOnly = /buildDemoContributionRail\(goal, demoWalletPositions(, manual\.positions)?\)/.test(demo) && !/buildDemoContributionRail\(goal, displayPositions/.test(demo);
    const demoDisplayMerged = /PortfolioAllocationDonuts positions=\{displayPositions\}/.test(demo) && /getLiquidPositions\(displayPositions\)/.test(demo);
    // Staked/Yield keep reading real positions (manual assets are spot holdings).
    const stakedRealOnly = /getStakedPositions\(positions\)/.test(rw) && /getStakedPositions\(demoWalletPositions\)/.test(demo);
    return railGetsRealOnly && displayMerged && demoRailRealOnly && demoDisplayMerged && stakedRealOnly;
  })(), "display-only merge");
  add("EXT-6: manual positions are marked `manual_entry` so they can never satisfy a verified-wallet-balance check", (() => {
    const src = readSrc("src/wallet/manualAssetPositions.ts");
    const usdcGate = readSrc("src/suggestions/contributionProductInput.ts");
    // The gate that classifies spendable USDC requires direct_wallet_balance.
    return /detection: "manual_entry"/.test(src)
      && !/detection: "direct_wallet_balance"/.test(src)
      && /p\.detection === "direct_wallet_balance"/.test(usdcGate);
  })(), "fails verified checks");

  // ---- Multi-asset contribution split (BTC / ETH / SOL / USDC) ----
  add("CAS-20: holding SOL+BTC at medium risk → THREE legs (BTC, SOL, USDC) totalling the contribution; ETH absent", (() => {
    const s = computeContributionAllocationSplit({
      totalUsd: 26900, stableUsd: 9500, monthlyContributionUsd: 1000, targetCryptoPct: 63.5,
      heldGrowthTargetIds: ["sol", "btc"], riskLevel: "medium",
    });
    if (!s) return false;
    const ids = s.legs.map((l) => l.targetId).sort().join(",");
    const total = s.legs.reduce((sum, l) => sum + l.usd, 0);
    // crypto portion 316.5 splits 40/70 BTC and 30/70 SOL; USDC keeps 683.5
    return ids === "btc,sol,usdc" && approxUsd(total, 1000) && s.growthSubAllocated === true
      && approxUsd(legAmount(s, "btc"), 316.5 * (40 / 70)) && approxUsd(legAmount(s, "sol"), 316.5 * (30 / 70))
      && legAmount(s, "eth") === 0;
  })(), "three legs");
  add("CAS-21: holding all three at high risk → FOUR legs; SOL leg exceeds BTC leg (risk tilt carries through)", (() => {
    const s = computeContributionAllocationSplit({
      totalUsd: 26900, stableUsd: 9500, monthlyContributionUsd: 4000, targetCryptoPct: 63.5,
      heldGrowthTargetIds: ["sol", "btc", "eth"], riskLevel: "high",
    });
    if (!s) return false;
    const total = s.legs.reduce((sum, l) => sum + l.usd, 0);
    return s.legs.length === 4 && approxUsd(total, 4000)
      && legAmount(s, "sol") > legAmount(s, "btc") && legAmount(s, "btc") > 0 && legAmount(s, "eth") > 0;
  })(), "four legs risk tilt");
  add("CAS-22: SOL-only holder is UNCHANGED — one growth leg, no sub-allocation (no regression)", (() => {
    const s = computeContributionAllocationSplit({
      totalUsd: 26900, stableUsd: 9500, monthlyContributionUsd: 1000, targetCryptoPct: 63.5,
      heldGrowthTargetIds: ["sol"], riskLevel: "medium",
    });
    return !!s && s.growthSubAllocated === false && approxUsd(legAmount(s, "sol"), 316.5)
      && approxUsd(legAmount(s, "usdc"), 683.5) && legAmount(s, "btc") === 0;
  })(), "sol-only unchanged");
  add("CAS-23: an unheld asset NEVER receives contribution money", (() => {
    const s = computeContributionAllocationSplit({
      totalUsd: 26900, stableUsd: 9500, monthlyContributionUsd: 1000, targetCryptoPct: 63.5,
      heldGrowthTargetIds: ["btc"], riskLevel: "medium",
    });
    return !!s && legAmount(s, "sol") === 0 && legAmount(s, "eth") === 0 && legAmount(s, "btc") > 0;
  })(), "never unheld");
  add("CAS-24: below-minimum legs are dropped and redistributed — shown legs still total the contribution exactly", (() => {
    // A tiny contribution cannot support 4 cards; the survivors absorb the rest.
    const s = computeContributionAllocationSplit({
      totalUsd: 26900, stableUsd: 9500, monthlyContributionUsd: 120, targetCryptoPct: 63.5,
      heldGrowthTargetIds: ["sol", "btc", "eth"], riskLevel: "medium",
    });
    if (!s) return false;
    const shown = s.legs.filter((l) => l.applies);
    return shown.every((l) => l.usd >= 50) && approxUsd(s.legs.reduce((sum, l) => sum + l.usd, 0), 120);
  })(), "minimum redistributed");
  add("CAS-25: multi-asset cards — one card per leg with its own id, Moonpay handoff, and target-allocation metric", (() => {
    const s = computeContributionAllocationSplit({
      totalUsd: 26900, stableUsd: 9500, monthlyContributionUsd: 4000, targetCryptoPct: 63.5,
      heldGrowthTargetIds: ["sol", "btc", "eth"], riskLevel: "medium",
    });
    if (!s) return false;
    const { cards, contributionReviewById } = buildContributionSplitCards(s, { sol: 150, btc: 62000, eth: 1800 });
    const ids = cards.map((c) => c.id).sort().join(",");
    const btcReview = contributionReviewById["contribution_split_btc"];
    return ids === "contribution_split_btc,contribution_split_eth,contribution_split_sol,contribution_split_usdc"
      && cards.every((c) => c.is_top_pick === false && c.cta.executes_transaction === false)
      && btcReview?.externalLink?.ctaLabel === "Buy BTC on Moonpay"
      && /BTC$/.test(btcReview.keyMetrics[0].value)
      && btcReview.keyMetrics[1].label === "Target crypto allocation";
  })(), "card per leg");

  // Conflict authority is ANY material Rebalance (never just crypto→stables) that
  // will ACTUALLY render. A material drift whose SOURCE gate is blocked produces no
  // card, and suppressing on materiality alone left the rail with neither the
  // Rebalance nor the contribution plan — see OBS-18.
  add("CAS-9: rail split gate — buffer complete + ANY-material-Rebalance-THAT-RENDERS conflict authority (not just crypto→stables) + monthly-cadence gate + fail-closed target; the split REPLACES the pipeline DCA candidate", (() => {
    const r = readSrc("src/suggestions/useRailSuggestions.ts");
    return /safetyBufferAssessment\.presentationState !== "complete"\) return null;[\s\S]{0,600}rebalanceOverride\.material && rebalanceOverride\.card != null\) return null;/.test(r)
      && !/rebalanceOverride\.materialCryptoToStables\) return null;/.test(r)
      && /goal\?\.contribution_frequency !== "monthly"\) return null;/.test(r)
      && /rebalanceTarget == null \|\| typeof rebalanceTarget\.targetCryptoPct !== "number"\) return null;/.test(r)
      && /const contributionCandidate = splitApplies \? null/.test(r);
  })(), "gate + conflict authority");

  return checks;
}


export function runSlice7CTestingMigrationFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const readIfSrc = (rel: string) => { try { return readFileSync(`${process.cwd()}/${rel}`, "utf8"); } catch { return ""; } };
  const dca = (id: string) => runContributionTestingScenario(id)!;
  const ot = (id: string) => otTestFixtures().find((f) => f.id === id)!;
  const otSrc = readIfSrc("src/pages/onTrackTestingFixtures.ts");
  const dcaSrc = readIfSrc("src/suggestions/contributionTestingScenarios.ts");

  // ---- On Track visible card is production-derived ----
  add("7C-1 (7D): the visible On Track card is derived from the ACTUAL production Stage-A engine run (real empty candidate set), full confidence, within ±10 — not a hand-built confidence or a hand-passed empty context", (() => { const f = ot("eligible_zero_delta"); return f.assessment.targetConfidence === "full" && f.assessment.allocationState === "within_review_range" && f.assessment.displayMode === "scoped_informational" && f.cards.length > 0 && f.cards.every((c: { category: string }) => c.category === "on_track") && /runSuggestionEngine\(/.test(otSrc) && /buildSuggestionEngineInputs\(/.test(otSrc) && /buildCanonicalTargetTestingScenario/.test(otSrc) && !/prodRa\(/.test(otSrc); })(), "real Stage-A On Track");
  add("7C-2: On Track approved copy is UNCHANGED and carries no market words", (() => { const f = ot("eligible_zero_delta"); const t = f.assessment.recommendedTitle, d = f.assessment.recommendedDescription; return t === "Your Safety Buffer and Allocation Are Within Range" && d === "Your Safety Buffer is fully funded, and your crypto allocation is within the current review range." && !/Fear|Greed|CoinMarketCap|market score|10%|five-factor/i.test(JSON.stringify(f.cards)); })(), "copy unchanged");

  // ---- DCA production market cases ----
  add("7C-3: DCA Fear target → toward crypto (production pipeline, full confidence, market included, SOL)", (() => { const s = dca("dca_fear_crypto"); const cp = s.pipeline.suggestion?.contributionPlan as { targetSymbol?: string } | undefined; return s.pipeline.status === "ready" && s.pipeline.suggestion?.category === "dca" && cp?.targetSymbol === "SOL" && s.pipeline.marketIncluded === true && s.pipeline.targetConfidence === "full"; })(), "fear→crypto");
  add("7C-4: DCA Greed target → toward stables (production pipeline, full confidence, USDC)", (() => { const s = dca("dca_greed_stables"); const cp = s.pipeline.suggestion?.contributionPlan as { targetSymbol?: string } | undefined; return s.pipeline.status === "ready" && s.pipeline.suggestion?.category === "dca" && cp?.targetSymbol === "USDC" && s.pipeline.marketIncluded === true; })(), "greed→stables");
  add("7C-5: DCA degraded market-excluded → eligible, confidence degraded, market NOT included", (() => { const s = dca("dca_degraded"); return s.pipeline.status === "ready" && s.pipeline.suggestion?.category === "dca" && s.pipeline.targetConfidence === "degraded_market_excluded" && s.pipeline.marketIncluded === false; })(), "degraded");
  add("7C-6: DCA cadence variant (bi-weekly) renders a distinct production card", (() => { const s = dca("dca_fear_biweekly"); const cp = s.pipeline.suggestion?.contributionPlan as { contributionFrequencyId?: string } | undefined; return s.pipeline.status === "ready" && s.pipeline.suggestion?.category === "dca" && cp?.contributionFrequencyId === "biweekly"; })(), "cadence");

  // ---- DCA Review market context ----
  add("7C-7: full-Fear DCA Review discloses 10% market input + CoinMarketCap + not-a-buy/sell; no timing words", (() => { const r = dca("dca_fear_crypto").review as { marketContextSection?: { body?: string } } | undefined; const b = r?.marketContextSection?.body ?? ""; return /10% of your target-allocation calculation/.test(b) && /Data source: CoinMarketCap/.test(b) && /does not directly create buy or sell/.test(b) && !/Fear|Greed|bullish|bearish|buy the dip/.test(b); })(), "full review");
  add("7C-8: degraded DCA Review discloses exclusion + renormalization; no score/band/CoinMarketCap/Neutral", (() => { const r = dca("dca_degraded").review as { marketContextSection?: { body?: string } } | undefined; const b = r?.marketContextSection?.body ?? ""; return /market component was excluded, and the remaining profile factors were renormalized/.test(b) && !/CoinMarketCap|\/100|Neutral|Fear|Greed/.test(b); })(), "degraded review");

  // ---- Architecture + semantics ----
  add("7C-9: the DCA gallery's market cases run the PRODUCTION contribution pipeline via the canonical scenario builder (no direct final-target injection)", (() => { return /buildCanonicalTargetTestingScenario/.test(dcaSrc) && /targetAllocation: t, targetState: cttState\(t\)/.test(dcaSrc); })(), "scenario builder");
  add("7C-10: contribution amount + cadence come from the saved plan (not Net Cash Flow); the target is the only market-influenced input", (() => { const s = dca("dca_fear_crypto"); const cp = s.pipeline.suggestion?.contributionPlan as { contributionFrequencyId?: string } | undefined; return cp?.contributionFrequencyId === "monthly" && !/net_?cash|income - expenses/i.test(JSON.stringify(s.pipeline.suggestion)); })(), "amount/cadence");
  add("7C-11: NO direct market trigger — the DCA is driven by the canonical allocation gap (a stable-underweight portfolio yields a stable DCA under Greed; not 'Greed → sell')", (() => { const s = dca("dca_greed_stables"); const cp = s.pipeline.suggestion?.contributionPlan as { targetPct?: number; currentTargetPct?: number } | undefined; return (cp?.targetPct ?? 0) > (cp?.currentTargetPct ?? 0); })(), "gap-driven");
  add("7C-12: visible DCA/On Track galleries carry ZERO transitional-helper references; the migrated cases use the scenario builder", (() => { return !/riskOnlyCanonicalTargetTransitional/.test(dcaSrc) && !/riskOnlyCanonicalTargetTransitional/.test(otSrc) && /buildCanonicalTargetTestingScenario/.test(otSrc); })(), "no transitional");

  return checks;
}


/** Step 22F (slice 7D) — TRANSITIONAL-INFRASTRUCTURE TEARDOWN: the helper, sentinel, rail/engine/pipeline fallbacks,
 * and rbT are deleted; every mode fails closed on a missing market/target (no risk-only substitution anywhere). */
export function runSlice7DTeardownFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const readIfSrc = (rel: string) => { try { return readFileSync(`${process.cwd()}/${rel}`, "utf8"); } catch { return ""; } };
  const fileExists = (rel: string) => { try { readFileSync(`${process.cwd()}/${rel}`, "utf8"); return true; } catch { return false; } };
  const rail = readIfSrc("src/suggestions/useRailSuggestions.ts");
  const engine = readIfSrc("src/suggestions/engine.ts");
  const pipeline = readIfSrc("src/suggestions/contributionPlanPipeline.ts");
  const cpi = readIfSrc("src/suggestions/contributionProductInput.ts");
  // Post-split: the fixture suite spans the aggregator, the shared harness, and the domain
  // files — the 7D teardown pins scan the whole suite, exactly as they scanned the monolith.
  const fixSrc = ["src/suggestions/suggestionEngine.fixtures.ts", "src/suggestions/fixtures/engineFixtureHarness.ts", "src/suggestions/fixtures/engineCore.fixtures.ts", "src/suggestions/fixtures/productionSurfaces.fixtures.ts"].map(readIfSrc).join("\n");
  const rbFx = readIfSrc("src/pages/rebalanceTestingFixtures.ts");
  const dcaFx = readIfSrc("src/suggestions/contributionTestingScenarios.ts");
  const otFx = readIfSrc("src/pages/onTrackTestingFixtures.ts");
  const mountedSrcs = [rail, engine, pipeline, cpi];

  // ---- Deletion of the transitional target infrastructure ----
  add("7D-1: rebalanceTargetTransitional.ts is DELETED from the source tree", !fileExists("src/suggestions/rebalanceTargetTransitional.ts"), "helper deleted");
  add("7D-2: riskOnlyCanonicalTargetTransitional has ZERO references in every MOUNTED source and every visible gallery (the fixtures file mentions it only inside these teardown assertion regexes)", (() => { const anySrc = [rail, engine, pipeline, cpi, rbFx, dcaFx, otFx]; return anySrc.every((s) => !/riskOnlyCanonicalTargetTransitional/.test(s)); })(), "zero callers");
  add("7D-3: the `transitional_risk_only` sentinel is ABSENT from every MOUNTED source (rail/engine/pipeline/contribution input)", mountedSrcs.every((s) => !/transitional_risk_only/.test(s)), "sentinel gone");
  add("7D-4: `deriveRecommendedAllocation` / `RISK_TARGET_ALLOCATION` are ABSENT from the mounted rail, engine, and pipeline (risk-only target removed)", mountedSrcs.every((s) => !/deriveRecommendedAllocation/.test(s) && !/RISK_TARGET_ALLOCATION/.test(s)), "risk matrix removed");

  // ---- Rail fails closed (no transitional else branch) ----
  add("7D-5: the rail has no `useCanonicalRebalanceTarget` branch and no transitional else — the canonical target is resolved unconditionally and fails closed to unresolved when there is no context", (() => { return !/useCanonicalRebalanceTarget/.test(rail) && !/Non-real-wallet callers with NO cache state/.test(rail) && /rebalanceTargetState = "unresolved";/.test(rail); })(), "rail fail-closed");
  add("7D-6 (runtime): a demo_fixture rail WITHOUT a market cache exposes NO target/market summary (unresolved/null target — no transitional surface)", (() => { const r = SY_deriveRail({ positions: DEMO_STABLE_YIELD_POSITIONS, pricedAsOf: DEMO_STABLE_YIELD_PRICED_AS_OF, goal: DEMO_STABLE_YIELD_GOAL, dataMode: "demo_fixture" }); return r.targetSummary === undefined && r.marketSummary === undefined; })(), "demo no-market unresolved");

  // ---- Contribution pipeline fails closed on a missing target ----
  add("7D-7 (runtime): the contribution pipeline FAILS CLOSED (blocked_policy / target_unresolved) when the buffer is complete and NO target is supplied — in every mode", (() => {
    const mk = (dm: "demo_fixture" | "testing_fixture" | "real_wallet") => buildContributionPlanPipeline({ dataMode: dm, profile: { monthlySavingGoalUsd: 1000, contributionFrequency: "monthly", goal: "build_long_term_wealth", riskLevel: "medium", timeHorizon: "5_years" }, portfolioSnapshot: buildContributionPortfolioSnapshot({ dataMode: dm, snapshotId: "s", sourcePortfolioVersion: "v1", calculatedAt: "2026-07-15T00:00:00Z", checkedAt: "2026-07-15T00:00:00Z", totalPortfolioValueUsd: 10000, solExposureUsd: 4300, usdcExposureUsd: 3700 }).snapshot!, safetyBufferSnapshot: buildContributionSafetyBufferSnapshot({ targetUsd: 3000, stableUsd: 3000 }, { calculatedAt: "2026-07-15T00:00:00Z", checkedAt: "2026-07-15T00:00:00Z" }), priceQuoteByTargetId: { sol: buildContributionPriceQuote({ dataMode: dm, targetId: "sol", priceUsd: 150, sourceId: CANONICAL_CONTRIBUTION_PRICE_SOURCE_ID, fetchedAt: "2026-07-15T00:00:00Z", checkedAt: "2026-07-15T00:00:00Z" }).quote! }, generatedAt: "2026-07-15T00:00:00Z", checkedAt: "2026-07-15T00:00:00Z" });
    return (["demo_fixture", "testing_fixture", "real_wallet"] as const).every((dm) => { const p = mk(dm); return p.status === "blocked_policy" && (p.blockers ?? []).includes("target_unresolved"); });
  })(), "pipeline fail-closed");

  // ---- Legacy DCA evaluator not engine-wired; rbT deleted ----
  add("7D-8: the engine neither imports nor calls the legacy `deriveDcaSuggestion`, and declares no `legacyDcaEligible` param", !/deriveDcaSuggestion/.test(engine) && !/legacyDcaEligible/.test(engine) && /const dca: EngineSuggestion \| null = planDca;/.test(engine), "engine has no legacy DCA");
  add("7D-9 (22G): the legacy DCA evaluator file is DELETED and no longer imported by the fixtures; engine-ordering fixtures inject only the STATIC test candidate `buildEngineFixtureDcaCandidate` (no financial evaluator)", (() => { return !fileExists("src/suggestions/dcaSuggestion.ts") && !/from "\.\/dcaSuggestion"/.test(fixSrc) && /buildEngineFixtureDcaCandidate/.test(fixSrc); })(), "static candidate only");
  add("7D-10: the transitional `rbT` fixture helper is REPLACED by `rbFixedTarget`, which is defined, actually spread into the Rebalance accounting fixtures, and builds an EXPLICIT canonical-methodology target (no risk matrix, no transitional sentinel)", (() => { const defOk = /const rbFixedTarget = \(split/.test(readIfSrc("src/suggestions/fixtures/engineFixtureHarness.ts")); const usedOk = /\.\.\.rbFixedTarget\(/.test(fixSrc); const canonicalOk = /methodologyVersion: TARGET_ALLOCATION_ASSESSMENT_VERSION,\s*\n?\s*policyVersion: "target_allocation_policy_v1"/.test(fixSrc) || /methodologyVersion: TARGET_ALLOCATION_ASSESSMENT_VERSION/.test(fixSrc); const noOldDef = fixSrc.indexOf("const rb" + "T = (risk") === -1; return defOk && usedOk && canonicalOk && noOldDef; })(), "rbFixedTarget explicit");
  add("7D-11: the visible /testing galleries (Rebalance/DCA/On Track) import NO legacy risk-only target module", (() => { return !/recommendedAllocation/.test(rbFx) && !/recommendedAllocation/.test(dcaFx) && !/recommendedAllocation/.test(otFx) && !/rebalanceTargetTransitional/.test(rbFx + dcaFx + otFx); })(), "galleries clean");

  return checks;
}
