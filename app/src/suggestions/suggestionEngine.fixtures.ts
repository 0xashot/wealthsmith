import { runRecordedObligationFixtureChecks } from "./fixtures/recordedObligation.fixtures";
import { runObservationDismissalFixtureChecks } from "./fixtures/observationDismissal.fixtures";
import { runSwapQuoteServerFixtureChecks, runSwapQuoteServerGuardChecks } from "../server/swapQuote/swapQuoteServerFixtures";
import { runContributionFinalizationFixtureChecks, runDcaCopy23CFixtureChecks, runInternalTestingRouteFixtureChecks, runPositionOptimizationAssessmentFixtureChecks, runRebalanceCanonicalMountFixtureChecks, runSlice7BRebalanceMigrationFixtureChecks, runStep22GCloseoutFixtureChecks, runTrimAssessmentFixtureChecks } from "./fixtures/assessmentMounts.fixtures";
import { runBufferPositionReviewFixtureChecks, runOnTrackAssessmentFixtureChecks, runSafetyBufferAssessmentFixtureChecks } from "./fixtures/bufferOnTrack.fixtures";
import { runAuthorityResolutionFixtureChecks, runBinaryDateCorrectionFixtureChecks, runBlockerOrderAmendmentFixtureChecks, runDirectAssessmentFixtureChecks, runDirectLendingComponentActivationFixtureChecks, runDirectLendingGovernanceActivationFixtureChecks, runDirectLendingProfileCompatibilityFixtureChecks, runDirectLendingRuntimeFixtureChecks, runDirectReviewBriefFixtureChecks, runDirectUsdcLendingIntegrationFixtureChecks, runIncidentAliasAmendmentFixtureChecks, runJupIdlAmendmentFixtureChecks, runJupProvisionalAssessmentFixtureChecks, runJupiterLendExistingPositionFixtureChecks, runJupiterLendShareAccountingFixtureChecks, runJupiterPackageFixtureChecks, runKaminoSecuritySourcesAmendmentFixtureChecks, runSourceCompletionFixtureChecks, runTeamDisclosureFixtureChecks } from "./fixtures/directLendingGovernance.fixtures";
import { runKlendAvailabilityFixtureChecks, runKlendConstraintsFixtureChecks, runKlendDirectExistingPositionFixtureChecks, runKlendDirectPositionFailClosedFixtureChecks, runKlendMarketDataFixtureChecks, runKlendPositionFixtureChecks, runKlendReserveCapacityFixtureChecks } from "./fixtures/klendDirect.fixtures";
import { runStableYieldIdentityResolutionFixtureChecks, runStableYieldPolicyFixtureChecks, runStableYieldProductionAdapterFixtureChecks, runStableYieldSourcePathFixtureChecks, runYieldStrategyComparisonFixtureChecks, runYieldStrategyEligibilityFixtureChecks, runYieldStrategyMarketDataFixtureChecks, runYieldStrategyPlanFixtureChecks, runYieldStrategyPlanPresentationFixtureChecks, runYieldStrategyPositionFixtureChecks, runYieldStrategyProductLaneFixtureChecks, runYieldStrategyRegistryFixtureChecks } from "./fixtures/stableYieldStrategy.fixtures";
import { runKvaultCapacitySemanticsFixtureChecks, runBsolRubricV1AssessmentFixtureChecks, runJitosolRubricV1AssessmentFixtureChecks, runJupsolRubricV1AssessmentFixtureChecks, runMeteoraRubricV1AssessmentFixtureChecks, runOrcaRubricV1AssessmentFixtureChecks, runRaydiumRubricV1AssessmentFixtureChecks, runInfRubricV1AssessmentFixtureChecks, runJupiterLendIncidentAmendmentFixtureChecks, runNativeStakingRubricV1AssessmentFixtureChecks, runMsolRubricV1AssessmentFixtureChecks, runRiskEvidencePackageFixtureChecks, runRiskGovernanceDecisionFixtureChecks, runRiskGovernanceFixtureChecks, runSteakhouseBlockCtokenFixtureChecks, runSteakhouseCapacityReconciliationFixtureChecks, runSteakhouseEvidenceClosureFixtureChecks, runSteakhouseExistingPositionFixtureChecks, runSteakhouseGateFixtureChecks, runSteakhouseRiskEvidenceFixtureChecks } from "./fixtures/steakhouseRiskGovernance.fixtures";
import { runAllocationMethodologyCopyFixtureChecks, runCanonicalTargetAdapterFixtureChecks, runCoinMarketCapMarketConditionFixtureChecks, runDashboardTargetMountFixtureChecks, runDemoMarketMigrationFixtureChecks, runMarketConditionFixtureChecks, runRailTargetContextFixtureChecks, runTargetAllocationAssessmentFixtureChecks, runTargetAllocationPolicyFixtureChecks } from "./fixtures/targetAllocationMarket.fixtures";
import { runCompletenessGalleryFixtureChecks, runCompletenessUiFixtureChecks, runLstNormalizationFixtureChecks, runMeasuredSlotDurationApyFixtureChecks, runNativeStakeFixtureChecks, runPortfolioCompletenessFixtureChecks, runSafetyBufferCoverageFixtureChecks, runToken2022FixtureChecks } from "./fixtures/walletPositionAssessment.fixtures";
import { runRailSwapActionFixtureChecks, runSwapQuoteFixtureChecks, runSwapQuoteUiFixtureChecks } from "./swapQuote/swapQuoteFixtures";
export { runRecordedObligationFixtureChecks, runObservationDismissalFixtureChecks };
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
// Step 24A — asset-ownership registry + dedicated JUP staking modules (fixtures below).

import { runSuggestionEngineFixtureChecks, runMapperFixtureChecks, runContractFixtureChecks, runFullQaFixtureChecks, runGuardrailFixtureChecks, runReviewDetailsFixtureChecks, runReviewModalFixtureChecks, runReviewRefinementFixtureChecks, runFinalSmokeFixtureChecks, runIncidentSearchFixtureChecks, runTestingPageFixtureChecks } from "./fixtures/engineCore.fixtures";
import { runProtocolSelectionFixtureChecks, runProtocolRegistryFixtureChecks, runProtocolAdapterFixtureChecks, runProtocolEligibilityFixtureChecks, runRouteGuardrailFixtureChecks, runProtocolScoringFixtureChecks, runProtocolSelectionQaFixtureChecks, runProtocolReadinessFixtureChecks, runProtocolSelectionGoNoGoFixtureChecks, runProtocolRiskRubricFixtureChecks, runProtocolRiskApprovalDecisionFixtureChecks, runProtocolRiskScoreAssignmentFixtureChecks } from "./fixtures/protocolSelection.fixtures";
import { runSolLiquidStakingMappingFixtureChecks, runSolLiquidStakingDryRunFixtureChecks, runSolLiquidStakingSourceFixtureChecks, runSolLiquidStakingStage2FixtureChecks, runSolLiquidStakingSourceCandidateFixtureChecks, runSolLiquidStakingEvidenceFixtureChecks, runSolLiquidStakingEvidenceCompletionFixtureChecks, runSolLiquidStakingSourceVerificationFixtureChecks, runSolLiquidStakingSourceValueConfirmationFixtureChecks, runSolLiquidStakingRealValueFixtureChecks, runSolLiquidStakingGatherDecisionFixtureChecks, runJitoSolEvidenceReadinessFixtureChecks, runSolLstProductionMetadataFixtureChecks, runSolLstSelectorShellFixtureChecks, runSolLstSelectorPreviewFixtureChecks, runSolLstSelectorPreviewRouteFixtureChecks, runInternalSolStakingRecommendationFixtureChecks, runJitoSolBetaActivationFixtureChecks, runJitoSolRouteEvaluationFixtureChecks, runJitoSolExternalLinkFixtureChecks, runSolLstCandidateRegistryFixtureChecks, runSolLstSourceValueConfirmationFixtureChecks, runSolLstRiskScoringGateFixtureChecks, runSolLstFreshEvidenceIntakeFixtureChecks, runSolLstFreshEvidenceRecordsFixtureChecks, runSolLstMsolFreshEvidenceFixtureChecks, runSolLstEpochUnstakeTimingFixtureChecks, runSolLstMsolRiskScoreFixtureChecks, runSolLstMsolReadOnlyApprovalFixtureChecks, runSolLstMsolReviewExposureFixtureChecks, runSolLstJupsolReviewExposureFixtureChecks, runSolLstBsolReviewExposureFixtureChecks, runSolLstInfReviewExposureFixtureChecks } from "./fixtures/solLiquidStaking.fixtures";
import { runStakingFixtureChecks, runJupStakingFixtureChecks, runSolNativeStakingBaselineFixtureChecks, runNativeValidatorMarketDataFixtureChecks, runNativeStakingMarinadeFixtureChecks, runSolStakingMarketRefreshFixtureChecks, runSolStakingNormalizationFixtureChecks, runSolStakingSelectorComparisonFixtureChecks, runSolStakingSelectorSensitivityFixtureChecks, runSolStakingSelectorPresentationFixtureChecks, runSolStakingProductIntegrationFixtureChecks, runDemoExactSolStakingScenarioFixtureChecks, runDemoExactSolStakingMarketDataFixtureChecks } from "./fixtures/solStakingProduct.fixtures";
import { runDcaFixtureChecks, runInvestmentTargetRegistryFixtureChecks, runContributionFrequencyNormalizationFixtureChecks, runContributionPlanningPolicyFixtureChecks, runContributionAllocationGapFixtureChecks, runContributionPriorityFixtureChecks, runContributionFundingFixtureChecks, runContributionPlanFixtureChecks, runContributionIntegrationFixtureChecks, runContributionUiTurnFixtureChecks, runDcaContributionCanonicalMountFixtureChecks, runSlice7CTestingMigrationFixtureChecks, runSlice7DTeardownFixtureChecks } from "./fixtures/contributionPlan.fixtures";
import { runStableYieldFixtureChecks, runCapitalEfficiencyFixtureChecks, runYieldStrategyPlanSuggestionFixtureChecks, runYieldStrategyPlanUiFixtureChecks, runStableYieldProductIntegrationFixtureChecks, runStableYieldReleaseGateFixtureChecks, runMarketConditionsSurfaceFixtureChecks } from "./fixtures/stableYieldProduct.fixtures";
import { runSafetyBufferPhase0GuardFixtureChecks, runSafetyBufferProductionFixtureChecks, runOnTrackProductionFixtureChecks, runSafetyBufferOnTrackCloseoutFixtureChecks, runCompletenessIntegrationFixtureChecks, runTrimFixtureChecks, runTrimProductionFixtureChecks, runPositionOptimizationProductionFixtureChecks, runRebalanceAssessmentFixtureChecks, runRebalanceProductionFixtureChecks, runRebalancePhaseOneCloseoutFixtureChecks, runRebalanceStep18EFixtureChecks, runRebalanceStep18FFixtureChecks, runRebalanceStep18GFixtureChecks } from "./fixtures/productionSurfaces.fixtures";
// FixtureCheck lives with the split-out fixture files (see fixtures/fixtureCheck.ts);
// re-exported here so existing importers keep working during the migration.
export type { FixtureCheck } from "./fixtures/fixtureCheck";


export async function printFixtureResults(): Promise<void> {
  const checks = [
    ...runSwapQuoteFixtureChecks(),
    ...runSwapQuoteUiFixtureChecks(),
    ...runRailSwapActionFixtureChecks(),
    ...runDcaCopy23CFixtureChecks(),
    ...runSwapQuoteServerGuardChecks(),
    ...(await runSwapQuoteServerFixtureChecks()),
    ...runStep22GCloseoutFixtureChecks(),
    ...runBufferPositionReviewFixtureChecks(),
    ...runKaminoSecuritySourcesAmendmentFixtureChecks(),
    ...runSlice7DTeardownFixtureChecks(),
    ...runSlice7CTestingMigrationFixtureChecks(),
    ...runSlice7BRebalanceMigrationFixtureChecks(),
    ...runDemoMarketMigrationFixtureChecks(),
    ...runAllocationMethodologyCopyFixtureChecks(),
    ...runMarketConditionsSurfaceFixtureChecks(),
    ...runDashboardTargetMountFixtureChecks(),
    ...runTargetAllocationPolicyFixtureChecks(),
    ...runMarketConditionFixtureChecks(),
    ...runTargetAllocationAssessmentFixtureChecks(),
    ...runCoinMarketCapMarketConditionFixtureChecks(),
    ...runCanonicalTargetAdapterFixtureChecks(),
    ...runRailTargetContextFixtureChecks(),
    ...runRebalanceCanonicalMountFixtureChecks(),
    ...runDcaContributionCanonicalMountFixtureChecks(),
    ...runSteakhouseGateFixtureChecks(),
    ...runSteakhouseBlockCtokenFixtureChecks(),
    ...runJupiterLendExistingPositionFixtureChecks(),
    ...runJupiterLendShareAccountingFixtureChecks(),
    ...runToken2022FixtureChecks(),
    ...runNativeStakeFixtureChecks(),
    ...runLstNormalizationFixtureChecks(),
    ...runPortfolioCompletenessFixtureChecks(),
    ...runCompletenessIntegrationFixtureChecks(),
    ...runCompletenessUiFixtureChecks(),
    ...runCompletenessGalleryFixtureChecks(),
    ...runRebalanceAssessmentFixtureChecks(),
    ...runRebalanceProductionFixtureChecks(),
    ...runRebalancePhaseOneCloseoutFixtureChecks(),
    ...runRebalanceStep18EFixtureChecks(),
    ...runRebalanceStep18FFixtureChecks(),
    ...runRebalanceStep18GFixtureChecks(),
    ...runTrimAssessmentFixtureChecks(),
    ...runTrimProductionFixtureChecks(),
    ...runPositionOptimizationAssessmentFixtureChecks(),
    ...runPositionOptimizationProductionFixtureChecks(),
    ...runSteakhouseExistingPositionFixtureChecks(),
    ...runSafetyBufferCoverageFixtureChecks(),
    ...runSafetyBufferPhase0GuardFixtureChecks(),
    ...runSafetyBufferAssessmentFixtureChecks(),
    ...runSafetyBufferProductionFixtureChecks(),
    ...runOnTrackAssessmentFixtureChecks(),
    ...runOnTrackProductionFixtureChecks(),
    ...runSafetyBufferOnTrackCloseoutFixtureChecks(),
    ...runKlendDirectPositionFailClosedFixtureChecks(),
    ...runKlendDirectExistingPositionFixtureChecks(),
    ...runObservationDismissalFixtureChecks(),
    ...runRecordedObligationFixtureChecks(),
    ...runDirectLendingProfileCompatibilityFixtureChecks(),
    ...runDirectLendingComponentActivationFixtureChecks(),
    ...runKlendMarketDataFixtureChecks(),
    ...runDirectLendingRuntimeFixtureChecks(),
    ...runDirectLendingGovernanceActivationFixtureChecks(),
    ...runDirectUsdcLendingIntegrationFixtureChecks(),
    ...runJupProvisionalAssessmentFixtureChecks(),
    ...runDirectReviewBriefFixtureChecks(),
    ...runTeamDisclosureFixtureChecks(),
    ...runIncidentSearchFixtureChecks(),
    ...runSourceCompletionFixtureChecks(),
    ...runJupIdlAmendmentFixtureChecks(),
    ...runJupiterPackageFixtureChecks(),
    ...runBinaryDateCorrectionFixtureChecks(),
    ...runDirectAssessmentFixtureChecks(),
    ...runAuthorityResolutionFixtureChecks(),
    ...runRiskEvidencePackageFixtureChecks(),
    ...runBsolRubricV1AssessmentFixtureChecks(),
    ...runJitosolRubricV1AssessmentFixtureChecks(),
    ...runJupsolRubricV1AssessmentFixtureChecks(),
    ...runMsolRubricV1AssessmentFixtureChecks(),
    ...runMeteoraRubricV1AssessmentFixtureChecks(),
    ...runOrcaRubricV1AssessmentFixtureChecks(),
    ...runRaydiumRubricV1AssessmentFixtureChecks(),
    ...runInfRubricV1AssessmentFixtureChecks(),
    ...runJupiterLendIncidentAmendmentFixtureChecks(),
    ...runNativeStakingRubricV1AssessmentFixtureChecks(),
    ...runIncidentAliasAmendmentFixtureChecks(),
    ...runSteakhouseCapacityReconciliationFixtureChecks(),
    ...runKlendConstraintsFixtureChecks(),
    ...runKlendAvailabilityFixtureChecks(),
    ...runBlockerOrderAmendmentFixtureChecks(),
    ...runKlendPositionFixtureChecks(),
    ...runKlendReserveCapacityFixtureChecks(),
    ...runMeasuredSlotDurationApyFixtureChecks(),
    ...runSuggestionEngineFixtureChecks(),
    ...runMapperFixtureChecks(),
    ...runContractFixtureChecks(),
    ...runStakingFixtureChecks(),
    ...runStableYieldFixtureChecks(),
    ...runCapitalEfficiencyFixtureChecks(),
    ...runJupStakingFixtureChecks(),
    ...runDcaFixtureChecks(),
    ...runTrimFixtureChecks(),
    ...runFullQaFixtureChecks(),
    ...runGuardrailFixtureChecks(),
    ...runProtocolSelectionFixtureChecks(),
    ...runReviewDetailsFixtureChecks(),
    ...runReviewModalFixtureChecks(),
    ...runReviewRefinementFixtureChecks(),
    ...runFinalSmokeFixtureChecks(),
    ...runProtocolRegistryFixtureChecks(),
    ...runProtocolAdapterFixtureChecks(),
    ...runProtocolEligibilityFixtureChecks(),
    ...runRouteGuardrailFixtureChecks(),
    ...runProtocolScoringFixtureChecks(),
    ...runProtocolSelectionQaFixtureChecks(),
    ...runProtocolReadinessFixtureChecks(),
    ...runSolLiquidStakingMappingFixtureChecks(),
    ...runSolLiquidStakingDryRunFixtureChecks(),
    ...runSolLiquidStakingSourceFixtureChecks(),
    ...runSolLiquidStakingStage2FixtureChecks(),
    ...runProtocolSelectionGoNoGoFixtureChecks(),
    ...runSolLiquidStakingSourceCandidateFixtureChecks(),
    ...runProtocolRiskRubricFixtureChecks(),
    ...runSolLiquidStakingEvidenceFixtureChecks(),
    ...runProtocolRiskApprovalDecisionFixtureChecks(),
    ...runSolLiquidStakingEvidenceCompletionFixtureChecks(),
    ...runSolLiquidStakingSourceVerificationFixtureChecks(),
    ...runSolLiquidStakingSourceValueConfirmationFixtureChecks(),
    ...runSolLiquidStakingRealValueFixtureChecks(),
    ...runSolLiquidStakingGatherDecisionFixtureChecks(),
    ...runJitoSolEvidenceReadinessFixtureChecks(),
    ...runProtocolRiskScoreAssignmentFixtureChecks(),
    ...runSolLstProductionMetadataFixtureChecks(),
    ...runSolLstSelectorShellFixtureChecks(),
    ...runSolLstSelectorPreviewFixtureChecks(),
    ...runSolLstSelectorPreviewRouteFixtureChecks(),
    ...runInternalSolStakingRecommendationFixtureChecks(),
    ...runDemoExactSolStakingScenarioFixtureChecks(),
    ...runDemoExactSolStakingMarketDataFixtureChecks(),
    ...runJitoSolBetaActivationFixtureChecks(),
    ...runTestingPageFixtureChecks(),
    ...runJitoSolRouteEvaluationFixtureChecks(),
    ...runJitoSolExternalLinkFixtureChecks(),
    ...runSolLstCandidateRegistryFixtureChecks(),
    ...runSolLstSourceValueConfirmationFixtureChecks(),
    ...runSolLstRiskScoringGateFixtureChecks(),
    ...runSolLstFreshEvidenceIntakeFixtureChecks(),
    ...runSolLstFreshEvidenceRecordsFixtureChecks(),
    ...runSolLstMsolFreshEvidenceFixtureChecks(),
    ...runSolLstEpochUnstakeTimingFixtureChecks(),
    ...runSolLstMsolRiskScoreFixtureChecks(),
    ...runSolLstMsolReadOnlyApprovalFixtureChecks(),
    ...runSolLstMsolReviewExposureFixtureChecks(),
    ...runSolLstJupsolReviewExposureFixtureChecks(),
    ...runSolLstBsolReviewExposureFixtureChecks(),
    ...runSolLstInfReviewExposureFixtureChecks(),
    ...runSolNativeStakingBaselineFixtureChecks(),
    ...runNativeValidatorMarketDataFixtureChecks(),
    ...runNativeStakingMarinadeFixtureChecks(),
    ...runSolStakingMarketRefreshFixtureChecks(),
    ...runSolStakingNormalizationFixtureChecks(),
    ...runSolStakingSelectorComparisonFixtureChecks(),
    ...runSolStakingSelectorSensitivityFixtureChecks(),
    ...runSolStakingSelectorPresentationFixtureChecks(),
    ...runSolStakingProductIntegrationFixtureChecks(),
    ...runInvestmentTargetRegistryFixtureChecks(),
    ...runContributionFrequencyNormalizationFixtureChecks(),
    ...runContributionPlanningPolicyFixtureChecks(),
    ...runContributionAllocationGapFixtureChecks(),
    ...runContributionPriorityFixtureChecks(),
    ...runContributionFundingFixtureChecks(),
    ...runContributionPlanFixtureChecks(),
    ...runContributionIntegrationFixtureChecks(),
    ...runContributionUiTurnFixtureChecks(),
    ...runContributionFinalizationFixtureChecks(),
    ...runStableYieldPolicyFixtureChecks(),
    ...runYieldStrategyRegistryFixtureChecks(),
    ...runYieldStrategyMarketDataFixtureChecks(),
    ...runYieldStrategyEligibilityFixtureChecks(),
    ...runYieldStrategyProductLaneFixtureChecks(),
    ...runYieldStrategyComparisonFixtureChecks(),
    ...runYieldStrategyPositionFixtureChecks(),
    ...runYieldStrategyPlanFixtureChecks(),
    ...runYieldStrategyPlanSuggestionFixtureChecks(),
    ...runYieldStrategyPlanPresentationFixtureChecks(),
    ...runYieldStrategyPlanUiFixtureChecks(),
    ...runStableYieldProductIntegrationFixtureChecks(),
    ...runStableYieldReleaseGateFixtureChecks(),
    ...runStableYieldProductionAdapterFixtureChecks(),
    ...runStableYieldIdentityResolutionFixtureChecks(),
    ...runStableYieldSourcePathFixtureChecks(),
    ...runSteakhouseRiskEvidenceFixtureChecks(),
    ...runKvaultCapacitySemanticsFixtureChecks(),
    ...runRiskGovernanceFixtureChecks(),
    ...runRiskGovernanceDecisionFixtureChecks(),
    ...runInternalTestingRouteFixtureChecks(),
    ...runSteakhouseEvidenceClosureFixtureChecks(),
  ];
  for (const c of checks) {
    // eslint-disable-next-line no-console
    console.log(`${c.pass ? "PASS" : "FAIL"}  ${c.name}  (${c.detail})`);
  }
  const failed = checks.filter((c) => !c.pass).length;
  // eslint-disable-next-line no-console
  console.log(`${checks.length - failed}/${checks.length} fixture checks passed`);
  if (failed > 0 && typeof process !== "undefined") process.exitCode = 1;
}
