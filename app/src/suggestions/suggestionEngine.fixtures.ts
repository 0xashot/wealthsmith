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
import type { WalletPosition } from "../wallet/walletPosition";
import type { SafetyBuffer } from "../wallet/walletSummary";
import type { SavedGoal } from "../types/goal";
import type { EngineSuggestion, ProtocolStrategyType } from "./engineTypes";
import { buildSuggestionEngineInputs } from "./engineInputAdapter";
import { runSuggestionEngine } from "./engine";
import { selectTopPick } from "./topPick";
import { toSuggestionCard, toSuggestionCards } from "./toSuggestionCard";
import {
  passedGuardrail,
  failedGuardrail,
  warningGuardrail,
  notEvaluatedGuardrail,
  notApplicableGuardrail,
  ensureExecutionGuardrails,
} from "./guardrails";
import {
  notEvaluatedProtocolSelection,
  notApplicableProtocolSelection,
  unavailableProtocolSelection,
  selectedProtocolSelection,
} from "./protocolSelection";
import {
  PROTOCOL_REGISTRY,
  PROTOCOL_SELECTION_IMPLEMENTED,
  getProtocolCandidateById,
  getProtocolCandidatesForStrategy,
  getProtocolCandidatesForAsset,
  getProtocolCandidatesForSelection,
} from "./protocolRegistry";
import { missingMarketData } from "./protocolMarketData";
import { getProtocolRiskData } from "./protocolRiskRegistry";
import { buildProtocolSelectionInput } from "./protocolDataAdapters";
import {
  DEFILLAMA_POOL_MAPPINGS,
  resolveDefiLlamaMapping,
  defiLlamaMissingResult,
  defiLlamaErrorResult,
  defiLlamaAdapter,
} from "./protocolDataAdapters.defillama";
import { getReadOnlyQuoteEstimate, JUPITER_QUOTE_ADAPTER_IMPLEMENTED } from "./protocolDataAdapters.jupiter";
import {
  ELIGIBILITY_IMPLIES_RECOMMENDATION,
  evaluateProtocolEligibility,
  evaluateProtocolSelectionEligibility,
} from "./protocolEligibility";
import type { ProtocolMarketData, ProtocolRiskData } from "./protocolMarketData";
import * as jupiterQuoteModule from "./protocolDataAdapters.jupiter";
import {
  JUPITER_LIVE_QUOTE_IMPLEMENTED,
  JUPITER_QUOTE_BUILDS_TRANSACTIONS,
  validateRouteQuoteRequest,
  notImplementedQuoteResult,
  jupiterQuoteErrorResult,
  parseJupiterQuote,
  getReadOnlyJupiterQuote,
} from "./protocolDataAdapters.jupiter";
import { evaluateRouteGuardrails } from "./protocolRouteGuardrails";
import type { RouteQuoteRequest } from "./routeCostTypes";
import {
  SCORING_IS_RECOMMENDATION,
  RANKING_IS_SELECTION,
  SCORING_WEIGHTS,
  scoreProtocolCandidate,
  rankProtocolCandidates,
  compareCandidateScores,
} from "./protocolScoring";
import type { ProtocolCandidateScore, ProtocolScoreBreakdown, ProtocolScoringStrategy } from "./protocolScoring";
import type { ProtocolEligibilityResult } from "./protocolEligibility";
import type { ProtocolSelectionInput } from "./protocolMarketData";
import {
  runProtocolSelectionQa,
  buildSolLiquidStakingQaInput,
  SOL_LIQUID_STAKING_QA_MARKET,
  SOL_LIQUID_STAKING_QA_RISK,
} from "./protocolSelectionQa";
import {
  PROTOCOL_SELECTION_QA_ONLY,
  PROTOCOL_SELECTION_SHOW_IN_UI,
  PROTOCOL_SELECTION_ALLOW_LIVE_DATA,
  PROTOCOL_SELECTION_ALLOW_TRANSACTIONS,
  PROTOCOL_SELECTION_ROLLOUT_STAGES,
  getProtocolSelectionReadinessChecklist,
  isProtocolSelectionProductionReady,
} from "./protocolSelectionFeatureFlags";
import type { ProtocolSelectionReadinessGate } from "./protocolSelectionFeatureFlags";
import {
  SOL_LIQUID_STAKING_DATA_MAPPING_IMPLEMENTED,
  SOL_LIQUID_STAKING_SELECTION_ENABLED,
  SOL_LIQUID_STAKING_CANDIDATE_IDS,
  SOL_LIQUID_STAKING_MAPPINGS,
  buildSolLiquidStakingMarketDataFromExistingSources,
  buildSolLiquidStakingInternalDryRunInput,
  runSolLiquidStakingInternalDryRun,
} from "./protocolSolLiquidStakingData";
import {
  SOL_LIQUID_STAKING_DRY_RUN_ONLY,
  SOL_LIQUID_STAKING_DRY_RUN_SHOWS_UI,
  SOL_LIQUID_STAKING_DRY_RUN_CAN_SELECT_PRODUCTION,
  runSolLiquidStakingDryRun,
} from "./protocolSolLiquidStakingDryRun";
import {
  SOL_LIQUID_STAKING_SOURCE_RECORDS,
  getSolLiquidStakingSourceRecords,
  getSolLiquidStakingSourceStatus,
} from "./protocolSolLiquidStakingSources";
import {
  SOL_LIQUID_STAKING_STAGE_2_DRY_RUN_ONLY,
  SOL_LIQUID_STAKING_STAGE_2_SHOWS_UI,
  SOL_LIQUID_STAKING_STAGE_2_CAN_SELECT_PRODUCTION,
  SOL_LIQUID_STAKING_STAGE_2_USES_TRANSACTIONS,
  buildSolLiquidStakingStage2DryRunReport,
  buildSolLiquidStakingStage2DryRunFromLiveSources,
} from "./protocolSolLiquidStakingStage2DryRun";
import type { ProtocolRiskData as Stage2ProtocolRiskData } from "./protocolMarketData";
import {
  PROTOCOL_SELECTION_GO_NO_GO_ONLY,
  PROTOCOL_SELECTION_GO_NO_GO_SHOWS_UI,
  PROTOCOL_SELECTION_GO_NO_GO_CAN_ENABLE_PRODUCTION,
  getProtocolSelectionGoNoGo,
  getProtocolSelectionBlockingReasons,
  isProtocolSelectionGo,
  assertProtocolSelectionCannotRunInProduction,
} from "./protocolSelectionGoNoGo";
import type { ProtocolSelectionGoNoGoGate } from "./protocolSelectionGoNoGo";
import {
  SOL_LIQUID_STAKING_SOURCE_CANDIDATES_ARE_PROPOSALS_ONLY,
  SOL_LIQUID_STAKING_SOURCE_CANDIDATES_AFFECT_PRODUCTION,
  SOL_LIQUID_STAKING_SOURCE_CANDIDATES,
  getSolLiquidStakingSourceCandidates,
  getProposedTvlPoolCandidates,
} from "./protocolSolLiquidStakingSourceCandidates";
import {
  PROTOCOL_RISK_RUBRIC_EXISTS,
  PROTOCOL_RISK_RUBRIC_APPROVED,
  PROTOCOL_RISK_RUBRIC_ASSIGNS_SCORES,
  PROTOCOL_RISK_RUBRIC_AFFECTS_PRODUCTION,
  getProtocolRiskRubric,
  getProtocolRiskRubricDimensions,
  isProtocolRiskRubricApproved,
  canAssignProtocolRiskScores,
  createEmptyProtocolRiskScoreDraft,
  validateProtocolRiskRubricWeights,
} from "./protocolRiskRubric";
import type { ProtocolRiskRubricDimensionId } from "./protocolRiskRubric";
import {
  PROTOCOL_RISK_EVIDENCE_DRAFTS_EXIST,
  PROTOCOL_RISK_EVIDENCE_DRAFTS_APPROVED,
  PROTOCOL_RISK_EVIDENCE_DRAFTS_ASSIGN_SCORES,
  PROTOCOL_RISK_EVIDENCE_DRAFTS_AFFECT_PRODUCTION,
  SOL_LIQUID_STAKING_EVIDENCE_DRAFTS,
  getSolLiquidStakingEvidenceDrafts,
  summarizeEvidenceCoverage,
} from "./protocolSolLiquidStakingEvidenceDrafts";
import {
  PROTOCOL_RISK_APPROVAL_DECISION_EXISTS,
  PROTOCOL_RISK_APPROVAL_DECISION_APPROVED,
  PROTOCOL_RISK_APPROVAL_DECISION_ASSIGN_SCORES,
  PROTOCOL_RISK_APPROVAL_DECISION_AFFECTS_PRODUCTION,
  getCurrentProtocolRiskRubricApprovalDecision,
  evaluateProtocolRiskCandidateScoreAssignmentGate,
  evaluateProtocolRiskApprovalGate,
  canAssignRiskScoreToProtocol,
} from "./protocolRiskApprovalDecision";
import {
  PROTOCOL_EVIDENCE_COMPLETION_EXISTS,
  PROTOCOL_EVIDENCE_COMPLETION_APPROVES_RUBRIC,
  PROTOCOL_EVIDENCE_COMPLETION_ASSIGNS_SCORES,
  PROTOCOL_EVIDENCE_COMPLETION_AFFECTS_PRODUCTION,
  PROTOCOL_EVIDENCE_COMPLETION_TARGET_PROTOCOL_ID,
  PROTOCOL_EVIDENCE_COMPLETION_TARGET_SYMBOL,
  runEvidenceCompletionForCandidate,
  runSanctumEvidenceCompletionGateCheck,
} from "./protocolSolLiquidStakingEvidenceCompletion";
import {
  PROTOCOL_SOURCE_VERIFICATION_EXISTS,
  PROTOCOL_SOURCE_VERIFICATION_APPROVES_RUBRIC,
  PROTOCOL_SOURCE_VERIFICATION_ASSIGNS_SCORES,
  PROTOCOL_SOURCE_VERIFICATION_AFFECTS_PRODUCTION,
  PROTOCOL_SOURCE_VERIFICATION_ENABLES_SELECTION,
  getSolLiquidStakingSourceVerificationCandidates,
  getSolLiquidStakingSourceVerificationResults,
  summarizeSolLiquidStakingSourceVerification,
  mapVerifiedSourcesToEvidenceDimensions,
} from "./protocolSolLiquidStakingSourceVerification";
import {
  PROTOCOL_SOURCE_VALUE_CONFIRMATION_EXISTS,
  PROTOCOL_SOURCE_VALUE_CONFIRMATION_APPROVES_RUBRIC,
  PROTOCOL_SOURCE_VALUE_CONFIRMATION_ASSIGNS_SCORES,
  PROTOCOL_SOURCE_VALUE_CONFIRMATION_AFFECTS_PRODUCTION,
  PROTOCOL_SOURCE_VALUE_CONFIRMATION_ENABLES_SELECTION,
  PROTOCOL_SOURCE_VALUE_CONFIRMATION_UPDATES_METADATA,
  QA_ONLY_VALUE_PLACEHOLDER,
  confirmSourceValue,
  getExampleSourceValueConfirmations,
  getSourceValueConfirmationResults,
  summarizeSourceValueConfirmations,
  type ProtocolSourceValueConfirmationInput,
} from "./protocolSolLiquidStakingSourceValueConfirmation";
import { mapConfirmedValuesToEvidenceCompletion, mapRealValuesToEvidenceCompletion, mapGatherDecisionsToEvidenceCompletion } from "./protocolSolLiquidStakingEvidenceCompletion";
import { evaluateProtocolRiskCandidateScoreAssignmentGateWithGatherDecisions, createExplicitProtocolRiskApprovalDecision } from "./protocolRiskApprovalDecision";
import {
  PROTOCOL_RISK_SCORE_ASSIGNMENT_EXISTS,
  PROTOCOL_RISK_SCORE_ASSIGNMENT_APPROVES_RUBRIC_BY_DEFAULT,
  PROTOCOL_RISK_SCORE_ASSIGNMENT_ASSIGNS_PRODUCTION_SCORES,
  PROTOCOL_RISK_SCORE_ASSIGNMENT_AFFECTS_PRODUCTION,
  PROTOCOL_RISK_SCORE_ASSIGNMENT_ENABLES_SELECTION,
  PROTOCOL_RISK_SCORE_ASSIGNMENT_UPDATES_METADATA,
  PROTOCOL_RISK_SCORE_ASSIGNMENT_MUTATES_EVIDENCE,
  QA_ONLY_SCORING_LABEL,
  calculateWeightedRiskScore,
  evaluateRiskScoreAssignment,
  getDefaultProtocolRiskScoreAssignmentInput,
  getQaOnlyJitoRiskScoreAssignmentInput,
} from "./protocolRiskScoreAssignment";
import { PROTOCOL_RISK_RUBRIC_VERSION } from "./protocolRiskRubric";
import {
  PROTOCOL_SOL_LST_PRODUCTION_METADATA_EXISTS,
  PROTOCOL_SOL_LST_PRODUCTION_METADATA_ACTIVE,
  PROTOCOL_SOL_LST_PRODUCTION_METADATA_ENABLES_SELECTION,
  PROTOCOL_SOL_LST_PRODUCTION_METADATA_UPDATES_LIVE_SUGGESTIONS,
  PROTOCOL_SOL_LST_PRODUCTION_METADATA_ALLOWS_TRANSACTIONS,
  PROTOCOL_SOL_LST_PRODUCTION_METADATA_USES_QA_SCORE,
  buildJitoSolProductionMetadataCandidate,
  validateSolLstProductionMetadataCandidate,
  getJitoSolProductionMetadataCandidate,
  summarizeSolLstProductionMetadata,
  hasActiveSolLstProductionMetadata,
} from "./protocolSolLiquidStakingProductionMetadata";
import {
  PROTOCOL_SOL_LST_SELECTOR_EXISTS,
  PROTOCOL_SOL_LST_SELECTOR_ENABLED,
  PROTOCOL_SOL_LST_SELECTOR_INTERNAL_ONLY,
  PROTOCOL_SOL_LST_SELECTOR_SHOWS_UI,
  PROTOCOL_SOL_LST_SELECTOR_USES_PRODUCTION_METADATA,
  PROTOCOL_SOL_LST_SELECTOR_USES_QA_SCORE,
  PROTOCOL_SOL_LST_SELECTOR_ENABLES_TRANSACTIONS,
  PROTOCOL_SOL_LST_SELECTOR_UPDATES_LIVE_SUGGESTIONS,
  selectSolLiquidStakingProtocol,
  dryRunSolLstSelector,
  previewSolLstSelectorReadiness,
} from "./protocolSolLiquidStakingSelector";
import {
  PROTOCOL_SOL_LST_SELECTOR_PREVIEW_EXISTS,
  PROTOCOL_SOL_LST_SELECTOR_PREVIEW_ENABLED,
  PROTOCOL_SOL_LST_SELECTOR_PREVIEW_INTERNAL_ONLY,
  PROTOCOL_SOL_LST_SELECTOR_PREVIEW_SHOWS_IN_DASHBOARD,
  PROTOCOL_SOL_LST_SELECTOR_PREVIEW_SHOWS_IN_PORTFOLIO,
  PROTOCOL_SOL_LST_SELECTOR_PREVIEW_SHOWS_IN_REVIEW_MODAL,
  PROTOCOL_SOL_LST_SELECTOR_PREVIEW_UPDATES_LIVE_SUGGESTIONS,
  PROTOCOL_SOL_LST_SELECTOR_PREVIEW_ENABLES_TRANSACTIONS,
  getDefaultSolLstSelectorPreview,
  getInternalOnlySolLstSelectorPreviewExample,
  getInternalOnlySolLstSelectedPreviewExample,
  INTERNAL_PREVIEW_NOT_LIVE,
} from "./protocolSolLiquidStakingSelectorPreview";
import {
  INTERNAL_SOL_LST_PREVIEW_ROUTE_EXISTS,
  INTERNAL_SOL_LST_PREVIEW_ROUTE_ENABLED_BY_DEFAULT,
  INTERNAL_SOL_LST_PREVIEW_REQUIRES_DEV_MODE,
  INTERNAL_SOL_LST_PREVIEW_ROUTE_PATH,
  INTERNAL_SOL_LST_PREVIEW_UPDATES_LIVE_SUGGESTIONS,
  INTERNAL_SOL_LST_PREVIEW_ENABLES_SELECTION,
  INTERNAL_SOL_LST_PREVIEW_ENABLES_TRANSACTIONS,
  isInternalSolLstPreviewRouteEnabled,
} from "../components/internal/internalPreviewFlags";
import {
  PROTOCOL_EVIDENCE_GATHER_DECISIONS_EXIST,
  PROTOCOL_EVIDENCE_GATHER_DECISIONS_APPROVE_RUBRIC,
  PROTOCOL_EVIDENCE_GATHER_DECISIONS_ASSIGN_SCORES,
  PROTOCOL_EVIDENCE_GATHER_DECISIONS_AFFECT_PRODUCTION,
  PROTOCOL_EVIDENCE_GATHER_DECISIONS_ENABLE_SELECTION,
  PROTOCOL_EVIDENCE_GATHER_DECISIONS_UPDATE_METADATA,
  PROTOCOL_EVIDENCE_GATHER_DECISIONS_MUTATE_EVIDENCE,
  SOL_LST_EVIDENCE_GATHER_DECISIONS,
  getGatherDecisionsByDimension,
  summarizeSolLstEvidenceGatherDecisions,
  evaluateCandidateReadinessFromGatherDecisions,
} from "./protocolSolLiquidStakingEvidenceGatherDecisions";
import {
  PROTOCOL_JITOSOL_EVIDENCE_CONFIRMATIONS_EXIST,
  PROTOCOL_JITOSOL_EVIDENCE_CONFIRMATIONS_APPROVE_RUBRIC,
  PROTOCOL_JITOSOL_EVIDENCE_CONFIRMATIONS_ASSIGN_SCORES,
  PROTOCOL_JITOSOL_EVIDENCE_CONFIRMATIONS_AFFECT_PRODUCTION,
  PROTOCOL_JITOSOL_EVIDENCE_CONFIRMATIONS_ENABLE_SELECTION,
  PROTOCOL_JITOSOL_EVIDENCE_CONFIRMATIONS_UPDATE_METADATA,
  PROTOCOL_JITOSOL_EVIDENCE_CONFIRMATIONS_MUTATE_EVIDENCE,
  JITOSOL_EVIDENCE_CONFIRMATIONS,
  getJitoEvidenceConfirmationsByDimension,
} from "./protocolSolLiquidStakingJitoEvidenceConfirmations";
import {
  PROTOCOL_REAL_VALUE_CONFIRMATIONS_EXIST,
  PROTOCOL_REAL_VALUE_CONFIRMATIONS_APPROVE_RUBRIC,
  PROTOCOL_REAL_VALUE_CONFIRMATIONS_ASSIGN_SCORES,
  PROTOCOL_REAL_VALUE_CONFIRMATIONS_AFFECT_PRODUCTION,
  PROTOCOL_REAL_VALUE_CONFIRMATIONS_ENABLE_SELECTION,
  PROTOCOL_REAL_VALUE_CONFIRMATIONS_UPDATE_METADATA,
  PROTOCOL_REAL_VALUE_CONFIRMATIONS_MUTATE_EVIDENCE,
  SOL_LST_REAL_VALUE_CONFIRMATIONS,
  TIME_SENSITIVE_REAL_VALUE_CATEGORIES,
  getSolLstRealValueConfirmations,
  getConfirmedRealValues,
  summarizeSolLstRealValueConfirmations,
  validateRealValueConfirmation,
} from "./protocolSolLiquidStakingRealValueConfirmations";

/** Fixed timestamp so every fixture run is fully reproducible. */
export const FIXTURE_GENERATED_AT = 1_750_000_000_000;

/** Minimal priced USDC wallet position (sample data for engine inputs only). */
const positionsFixture: WalletPosition[] = [
  {
    id: "fixture-usdc",
    source: "wallet",
    type: "token",
    symbol: "USDC",
    name: "USD Coin",
    amount: "800",
    uiAmount: 800,
    decimals: 6,
    detection: "direct_wallet_balance",
    priceUsd: 1,
    valueUsd: 800,
  },
];

const goalFixture: SavedGoal = {
  financial_goal: "build_long_term_wealth",
  risk_tolerance: "medium",
  timeline: "10_plus_years",
  contribution_frequency: "monthly",
  income_monthly: 4000,
  expenses_monthly: 1000,
  monthly_saving_goal: 2000,
};

/** A derived Safety Buffer result (shape of deriveSafetyBuffer's output). */
function bufferFixture(
  stableUsd: number,
  monthlyExpenses: number,
  targetMonths: number
): SafetyBuffer {
  const targetUsd = monthlyExpenses * targetMonths;
  return {
    stableUsd,
    targetUsd,
    targetMonths,
    coveragePct: targetUsd > 0 ? Math.min(100, (stableUsd / targetUsd) * 100) : 0,
    monthsCovered: monthlyExpenses > 0 ? stableUsd / monthlyExpenses : 0,
    fullyFunded: stableUsd >= targetUsd,
  };
}

/**
 * Bucket-level allocation snapshot (shape of AllocationInputs), built from a
 * current crypto % and the delta vs target. Positive delta = crypto overweight.
 */
function allocationFixture(totalUsd: number, currentCryptoPct: number, cryptoDeltaPct: number) {
  const recommendedCryptoPct = currentCryptoPct - cryptoDeltaPct;
  const currentStablesPct = 100 - currentCryptoPct;
  return {
    currentCryptoPct,
    currentStablesPct,
    currentCryptoUsd: (totalUsd * currentCryptoPct) / 100,
    currentStablesUsd: (totalUsd * currentStablesPct) / 100,
    recommendedCryptoPct,
    recommendedStablesPct: 100 - recommendedCryptoPct,
    cryptoDeltaPct,
    stablesDeltaPct: -cryptoDeltaPct,
  };
}

/** A liquid wallet SOL/WSOL position (or an unpriced one when priced=false). */
function solPosition(
  uiAmount: number,
  opts: { symbol?: string; type?: "native" | "token"; source?: string; price?: number; priced?: boolean } = {}
): WalletPosition {
  const { symbol = "SOL", type = "native", source = "wallet", price = 75, priced = true } = opts;
  return {
    id: `sol-${symbol}-${uiAmount}`,
    source: source as WalletPosition["source"],
    type,
    symbol,
    name: "Solana",
    amount: String(Math.round(uiAmount * 1e9)),
    uiAmount,
    decimals: 9,
    detection: "direct_wallet_balance",
    priceUsd: priced ? price : null,
    valueUsd: priced ? uiAmount * price : null,
  };
}

/** A priced non-SOL, non-stable wallet token (has wallet data, but neither
 *  staking nor stable_yield can fire from it) — for On Track / no-suggestion. */
function cryptoPosition(valueUsd = 100): WalletPosition {
  return {
    id: "bonk",
    source: "wallet",
    type: "token",
    symbol: "BONK",
    name: "Bonk",
    amount: "1000000",
    uiAmount: 1_000_000,
    decimals: 5,
    detection: "direct_wallet_balance",
    priceUsd: valueUsd / 1_000_000,
    valueUsd,
  };
}

/** A distinct priced non-core liquid wallet token (for trim/capital-efficiency). */
function nonCoreToken(symbol: string, valueUsd: number): WalletPosition {
  return {
    id: `tok-${symbol}`,
    source: "wallet",
    type: "token",
    symbol,
    name: symbol,
    amount: "1",
    uiAmount: valueUsd,
    decimals: 6,
    detection: "direct_wallet_balance",
    priceUsd: 1,
    valueUsd,
  };
}

/** An LST position (JupSOL/mSOL/…) — must NOT count as liquid SOL. */
function lstPosition(symbol: string, uiAmount: number, price = 80): WalletPosition {
  return {
    id: `lst-${symbol}`,
    source: "sanctum",
    type: "lst",
    symbol,
    name: symbol,
    amount: String(Math.round(uiAmount * 1e9)),
    uiAmount,
    decimals: 9,
    detection: "recognized_lst_mint",
    priceUsd: price,
    valueUsd: uiAmount * price,
  };
}

/** A stablecoin position — liquid wallet by default; override type/source for
 *  protocol positions, or an unrecognized symbol for the unknown-stable case. */
function stablePosition(
  symbol: string,
  uiAmount: number,
  opts: { type?: WalletPosition["type"]; source?: string; priced?: boolean; name?: string } = {}
): WalletPosition {
  const { type = "token", source = "wallet", priced = true, name } = opts;
  return {
    id: `stable-${symbol}-${uiAmount}-${type}`,
    source: source as WalletPosition["source"],
    type,
    symbol,
    name: name ?? (symbol === "USDC" ? "USD Coin" : symbol),
    amount: String(Math.round(uiAmount * 1e6)),
    uiAmount,
    decimals: 6,
    detection: "direct_wallet_balance",
    priceUsd: priced ? 1 : null,
    valueUsd: priced ? uiAmount : null,
  };
}

/** A deployed (protocol/LST/stake) yield position for position-optimization
 *  review — apy null = missing APY; low apy = low yield; big value = concentration. */
function yieldPosition(
  valueUsd: number,
  apy: number | null,
  opts: { type?: WalletPosition["type"]; source?: string; symbol?: string; priced?: boolean } = {}
): WalletPosition {
  const { type = "protocol", source = "kamino", symbol = "USDC", priced = true } = opts;
  return {
    id: `yield-${symbol}-${valueUsd}-${type}`,
    source: source as WalletPosition["source"],
    type,
    symbol,
    name: symbol,
    amount: "1",
    uiAmount: 1,
    decimals: 6,
    detection: "protocol_api",
    priceUsd: priced ? valueUsd : null,
    valueUsd: priced ? valueUsd : null,
    apy,
  };
}

interface FixtureArgs {
  safetyBuffer: SafetyBuffer | null;
  anyUnpriced?: boolean;
  goal?: SavedGoal;
  totalUsd?: number;
  allocation?: ReturnType<typeof allocationFixture> | null;
  positions?: WalletPosition[];
}

function inputsFor({
  safetyBuffer,
  anyUnpriced = false,
  goal = goalFixture,
  totalUsd = 15000,
  allocation = null,
  positions = positionsFixture,
}: FixtureArgs) {
  return buildSuggestionEngineInputs({
    positions,
    pricedAsOf: FIXTURE_GENERATED_AT,
    savedGoal: goal,
    value: { totalUsd, anyUnpriced },
    safetyBuffer,
    allocation,
  });
}

export interface FixtureCheck {
  name: string;
  pass: boolean;
  detail: string;
}

/** Runs scenarios A–F and returns structured pass/fail results. */
export function runSuggestionEngineFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  // A. Buffer not funded → one actionable buffer suggestion, amount = shortfall.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: bufferFixture(800, 1000, 3) }), // shortfall 2200
      FIXTURE_GENERATED_AT
    );
    const s = r.suggestions[0];
    const minTrade = s?.guardrails.find((g) => g.code === "min_trade_size");
    add(
      "A: underfunded buffer → actionable suggestion",
      r.suggestions.length === 1 &&
        s?.category === "buffer" &&
        s?.amount?.valueUsd === 2200 &&
        s?.is_actionable === true &&
        s?.action_kind === "review_only" &&
        s?.is_top_pick === true && // sole actionable suggestion → Top Pick (Step 6)
        minTrade?.status === "passed" &&
        r.unavailable_reason === undefined,
      `suggestions=${r.suggestions.length} amount=${s?.amount?.valueUsd} actionable=${s?.is_actionable} top_pick=${s?.is_top_pick} min_trade=${minTrade?.status}`
    );
  }

  // B. Buffer fully funded, no positions/allocation → no suggestion, not "missing
  //    data". (Empty positions so no stable_yield/staking fires from defaults.)
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: bufferFixture(5000, 1000, 3), positions: [cryptoPosition()] }),
      FIXTURE_GENERATED_AT
    );
    add(
      "B: fully funded → no suggestion",
      r.suggestions.length === 0 && r.unavailable_reason === undefined,
      `suggestions=${r.suggestions.length} unavailable=${r.unavailable_reason}`
    );
  }

  // C. Below minimum shortfall ($25 < $50) → disabled suggestion, min_trade failed.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: bufferFixture(2975, 1000, 3) }), // shortfall 25
      FIXTURE_GENERATED_AT
    );
    const s = r.suggestions[0];
    const minTrade = s?.guardrails.find((g) => g.code === "min_trade_size");
    add(
      "C: shortfall below $50 → disabled suggestion",
      r.suggestions.length === 1 &&
        s?.action_kind === "disabled" &&
        s?.is_actionable === false &&
        s?.reason_codes.includes("below_min_size") &&
        minTrade?.status === "failed",
      `action=${s?.action_kind} reasons=${s?.reason_codes.join(",")} min_trade=${minTrade?.status}`
    );
  }

  // D. Missing Safety Buffer → no suggestion + unavailable_reason missing_data.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: null }),
      FIXTURE_GENERATED_AT
    );
    add(
      "D: missing safety buffer → missing_data",
      r.suggestions.length === 0 && r.unavailable_reason === "missing_data",
      `suggestions=${r.suggestions.length} unavailable=${r.unavailable_reason}`
    );
  }

  // E. Partial pricing → warning present, suggestion still generated.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: bufferFixture(800, 1000, 3), anyUnpriced: true }),
      FIXTURE_GENERATED_AT
    );
    add(
      "E: partial pricing → warning + suggestion",
      r.warnings.includes("partial_pricing") && r.suggestions.length === 1,
      `warnings=${r.warnings.join(",")} suggestions=${r.suggestions.length}`
    );
  }

  // F. Risk-based target consumed as-is: 6-month and 1-month targets pass
  //    through to post_buffer_months unchanged.
  {
    const r6 = runSuggestionEngine(
      inputsFor({
        safetyBuffer: bufferFixture(800, 1000, 6),
        goal: { ...goalFixture, risk_tolerance: "very_low" },
      }),
      FIXTURE_GENERATED_AT
    );
    const r1 = runSuggestionEngine(
      inputsFor({
        safetyBuffer: bufferFixture(400, 1000, 1),
        goal: { ...goalFixture, risk_tolerance: "very_high" },
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "F: risk-based target months pass through unchanged",
      r6.suggestions[0]?.post_buffer_months === 6 &&
        r1.suggestions[0]?.post_buffer_months === 1,
      `6mo→${r6.suggestions[0]?.post_buffer_months} 1mo→${r1.suggestions[0]?.post_buffer_months}`
    );
  }

  // G. Buffer NOT funded + allocation overweight → only the buffer suggestion
  //    (Buffer Override suppresses rebalance even though a delta exists).
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: bufferFixture(800, 1000, 3), // underfunded
        allocation: allocationFixture(15000, 90, 15), // overweight 15%
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "G: buffer not funded + overweight → buffer only, no rebalance",
      r.suggestions.length === 1 &&
        r.suggestions[0]?.category === "buffer" &&
        !r.suggestions.some((s) => s.category === "rebalance"),
      `categories=${r.suggestions.map((s) => s.category).join(",")}`
    );
  }

  // H. Buffer funded + crypto overweight 15% → one rebalance crypto→stables,
  //    amount = total × 15%.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: bufferFixture(5000, 1000, 3), // funded
        allocation: allocationFixture(15000, 75, 15),
      }),
      FIXTURE_GENERATED_AT
    );
    const s = r.suggestions.find((x) => x.category === "rebalance");
    add(
      "H: funded + overweight 15% → rebalance crypto→stables, amount 2250",
      r.suggestions.length === 1 &&
        s?.reason_codes.includes("crypto_overweight") === true &&
        s?.from?.bucket === "crypto" &&
        s?.to?.bucket === "stables" &&
        s?.amount?.valueUsd === 2250 &&
        s?.is_actionable === true &&
        s?.is_top_pick === true, // sole actionable suggestion → Top Pick (Step 6)
      `amount=${s?.amount?.valueUsd} from=${s?.from?.bucket} to=${s?.to?.bucket} actionable=${s?.is_actionable} top_pick=${s?.is_top_pick}`
    );
  }

  // I. Buffer funded + crypto underweight 15% + excess stables → rebalance
  //    stables→crypto, amount capped by stable excess above the buffer.
  {
    // stableUsd 5000, targetUsd 3000 → excess 2000; deviation 15% × 15000 = 2250
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: bufferFixture(5000, 1000, 3),
        allocation: allocationFixture(15000, 45, -15),
      }),
      FIXTURE_GENERATED_AT
    );
    const s = r.suggestions.find((x) => x.category === "rebalance");
    add(
      "I: funded + underweight 15% → rebalance stables→crypto, capped at excess 2000",
      s?.reason_codes.includes("crypto_underweight") === true &&
        s?.from?.bucket === "stables" &&
        s?.to?.bucket === "crypto" &&
        s?.amount?.valueUsd === 2000 &&
        s?.is_actionable === true &&
        s?.is_top_pick === true, // sole actionable suggestion → Top Pick (Step 6)
      `amount=${s?.amount?.valueUsd} from=${s?.from?.bucket} to=${s?.to?.bucket} top_pick=${s?.is_top_pick}`
    );
  }

  // I2. Underweight but NO excess stables above the buffer → no rebalance.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: bufferFixture(3000, 1000, 3), // exactly funded, zero excess
        allocation: allocationFixture(15000, 45, -15),
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "I2: underweight + no excess stables → no rebalance",
      !r.suggestions.some((s) => s.category === "rebalance"),
      `suggestions=${r.suggestions.map((s) => s.category).join(",") || "none"}`
    );
  }

  // J. Buffer funded + crypto delta below 10% → no rebalance.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: bufferFixture(5000, 1000, 3),
        allocation: allocationFixture(15000, 65, 5),
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "J: funded + delta 5% (below 10%) → no rebalance",
      !r.suggestions.some((s) => s.category === "rebalance"),
      `suggestions=${r.suggestions.map((s) => s.category).join(",") || "none"}`
    );
  }

  // K. Missing allocation (buffer funded) → no rebalance, no missing_data
  //    (the Safety Buffer input is present, so nothing is "missing").
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: bufferFixture(5000, 1000, 3), allocation: null }),
      FIXTURE_GENERATED_AT
    );
    add(
      "K: missing allocation → no rebalance, unavailable_reason undefined",
      !r.suggestions.some((s) => s.category === "rebalance") &&
        r.unavailable_reason === undefined,
      `suggestions=${r.suggestions.length} unavailable=${r.unavailable_reason}`
    );
  }

  // L. Rebalance amount below $50 → disabled rebalance, min_trade failed.
  {
    // total 400 × 10% = $40 < $50
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: bufferFixture(5000, 1000, 3),
        totalUsd: 400,
        allocation: allocationFixture(400, 70, 10),
      }),
      FIXTURE_GENERATED_AT
    );
    const s = r.suggestions.find((x) => x.category === "rebalance");
    const minTrade = s?.guardrails.find((g) => g.code === "min_trade_size");
    add(
      "L: rebalance amount below $50 → disabled, min_trade failed",
      s?.action_kind === "disabled" &&
        s?.is_actionable === false &&
        s?.reason_codes.includes("below_min_size") === true &&
        minTrade?.status === "failed",
      `action=${s?.action_kind} reasons=${s?.reason_codes.join(",")} min_trade=${minTrade?.status}`
    );
  }

  // M. Partial pricing + funded + overweight → warning present, rebalance appears.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: bufferFixture(5000, 1000, 3),
        allocation: allocationFixture(15000, 75, 15),
        anyUnpriced: true,
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "M: partial pricing → warning + rebalance appears",
      r.warnings.includes("partial_pricing") &&
        r.suggestions.some((s) => s.category === "rebalance"),
      `warnings=${r.warnings.join(",")} categories=${r.suggestions.map((s) => s.category).join(",")}`
    );
  }

  // N. Buffer funded + allocation within threshold (delta 5%) + no deployable
  //    assets → On Track. (Empty positions so no staking/stable_yield fires.)
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: bufferFixture(5000, 1000, 3), // funded
        allocation: allocationFixture(15000, 62, 5),
        positions: [cryptoPosition()],
      }),
      FIXTURE_GENERATED_AT
    );
    const s = r.suggestions[0];
    add(
      "N: funded + delta 5% → On Track (informational)",
      r.suggestions.length === 1 &&
        s?.category === "on_track" &&
        s?.reason_codes.includes("portfolio_aligned") === true &&
        s?.is_actionable === false &&
        s?.is_top_pick === false &&
        s?.amount === undefined,
      `category=${s?.category} actionable=${s?.is_actionable} top_pick=${s?.is_top_pick}`
    );
  }

  // O. Buffer NOT funded + allocation within threshold → buffer only, no On Track.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: bufferFixture(800, 1000, 3), // underfunded
        allocation: allocationFixture(15000, 62, 5),
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "O: buffer not funded + aligned → buffer only, no On Track",
      r.suggestions.length === 1 &&
        r.suggestions[0]?.category === "buffer" &&
        !r.suggestions.some((s) => s.category === "on_track"),
      `categories=${r.suggestions.map((s) => s.category).join(",")}`
    );
  }

  // P. Buffer funded + rebalance threshold met (delta 15%) → Rebalance only.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: bufferFixture(5000, 1000, 3),
        allocation: allocationFixture(15000, 75, 15),
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "P: funded + delta 15% → rebalance only, no On Track",
      r.suggestions.length === 1 &&
        r.suggestions[0]?.category === "rebalance" &&
        !r.suggestions.some((s) => s.category === "on_track"),
      `categories=${r.suggestions.map((s) => s.category).join(",")}`
    );
  }

  // Q. Missing allocation (buffer funded) → no On Track, no missing_data
  //    (the Safety Buffer input is present, so nothing required is missing).
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: bufferFixture(5000, 1000, 3), allocation: null }),
      FIXTURE_GENERATED_AT
    );
    add(
      "Q: missing allocation → no On Track, unavailable_reason undefined",
      !r.suggestions.some((s) => s.category === "on_track") &&
        r.unavailable_reason === undefined,
      `suggestions=${r.suggestions.length} unavailable=${r.unavailable_reason}`
    );
  }

  // R. Partial pricing + otherwise aligned + no deployable assets → warning +
  //    On Track. (Empty positions so no staking/stable_yield fires.)
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: bufferFixture(5000, 1000, 3),
        allocation: allocationFixture(15000, 62, 5),
        anyUnpriced: true,
        positions: [cryptoPosition()],
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "R: partial pricing + aligned → warning + On Track",
      r.warnings.includes("partial_pricing") &&
        r.suggestions.some((s) => s.category === "on_track"),
      `warnings=${r.warnings.join(",")} categories=${r.suggestions.map((s) => s.category).join(",")}`
    );
  }

  // S. Missing Safety Buffer → no On Track + unavailable_reason missing_data.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: null, allocation: allocationFixture(15000, 62, 5) }),
      FIXTURE_GENERATED_AT
    );
    add(
      "S: missing safety buffer → no On Track, missing_data",
      !r.suggestions.some((s) => s.category === "on_track") &&
        r.unavailable_reason === "missing_data",
      `suggestions=${r.suggestions.length} unavailable=${r.unavailable_reason}`
    );
  }

  // T. Underfunded buffer, actionable amount → Buffer is Top Pick.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: bufferFixture(800, 1000, 3) }), // shortfall 2200
      FIXTURE_GENERATED_AT
    );
    const s = r.suggestions[0];
    add(
      "T: underfunded buffer actionable → buffer is Top Pick",
      s?.category === "buffer" && s?.is_top_pick === true && topPickCount(r.suggestions) === 1,
      `category=${s?.category} top_pick=${s?.is_top_pick} count=${topPickCount(r.suggestions)}`
    );
  }

  // U. Underfunded buffer below minimum (disabled) → no Top Pick.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: bufferFixture(2975, 1000, 3) }), // shortfall 25
      FIXTURE_GENERATED_AT
    );
    add(
      "U: disabled buffer → no Top Pick",
      r.suggestions[0]?.action_kind === "disabled" &&
        topPickCount(r.suggestions) === 0,
      `action=${r.suggestions[0]?.action_kind} count=${topPickCount(r.suggestions)}`
    );
  }

  // V. Funded + rebalance actionable → Rebalance is Top Pick.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: bufferFixture(5000, 1000, 3),
        allocation: allocationFixture(15000, 75, 15),
      }),
      FIXTURE_GENERATED_AT
    );
    const s = r.suggestions.find((x) => x.category === "rebalance");
    add(
      "V: funded + rebalance actionable → rebalance is Top Pick",
      s?.is_top_pick === true && topPickCount(r.suggestions) === 1,
      `top_pick=${s?.is_top_pick} count=${topPickCount(r.suggestions)}`
    );
  }

  // W. Funded + On Track only (no deployable assets) → no Top Pick.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: bufferFixture(5000, 1000, 3),
        allocation: allocationFixture(15000, 62, 5),
        positions: [cryptoPosition()],
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "W: On Track only → no Top Pick",
      r.suggestions[0]?.category === "on_track" &&
        topPickCount(r.suggestions) === 0,
      `category=${r.suggestions[0]?.category} count=${topPickCount(r.suggestions)}`
    );
  }

  // X. Multiple eligible candidates → Buffer beats Rebalance regardless of order.
  {
    const buffer = makeCandidate("top_up_buffer", "buffer", 0.3, 0.3);
    const rebalance = makeCandidate("rebalance_to_plan", "rebalance", 0.9, 0.9);
    const ranked = selectTopPick([rebalance, buffer]); // rebalance listed first
    const winner = ranked.find((s) => s.is_top_pick);
    add(
      "X: buffer beats rebalance even with higher rebalance scores",
      winner?.category === "buffer" && topPickCount(ranked) === 1,
      `winner=${winner?.category} count=${topPickCount(ranked)}`
    );
  }

  // Y. Same-category tie-breaks: impact → urgency → efficiency → id.
  {
    // impact wins
    const impactWin = selectTopPick([
      makeCandidate("rebalance_b", "rebalance", 0.5, 0.9, 0.9),
      makeCandidate("rebalance_a", "rebalance", 0.6, 0.1, 0.1),
    ]);
    const impactWinner = impactWin.find((s) => s.is_top_pick)?.id;

    // impact tied → urgency wins
    const urgencyWin = selectTopPick([
      makeCandidate("rebalance_a", "rebalance", 0.6, 0.2),
      makeCandidate("rebalance_b", "rebalance", 0.6, 0.8),
    ]);
    const urgencyWinner = urgencyWin.find((s) => s.is_top_pick)?.id;

    // impact + urgency tied → efficiency wins (null treated as 0)
    const effWin = selectTopPick([
      makeCandidate("rebalance_a", "rebalance", 0.6, 0.6, null),
      makeCandidate("rebalance_b", "rebalance", 0.6, 0.6, 0.4),
    ]);
    const effWinner = effWin.find((s) => s.is_top_pick)?.id;

    // all tied → lowest id wins
    const idWin = selectTopPick([
      makeCandidate("rebalance_z", "rebalance", 0.6, 0.6, 0.5),
      makeCandidate("rebalance_a", "rebalance", 0.6, 0.6, 0.5),
    ]);
    const idWinner = idWin.find((s) => s.is_top_pick)?.id;

    add(
      "Y: same-category tie-breaks impact→urgency→efficiency→id",
      impactWinner === "rebalance_a" &&
        urgencyWinner === "rebalance_b" &&
        effWinner === "rebalance_b" &&
        idWinner === "rebalance_a",
      `impact=${impactWinner} urgency=${urgencyWinner} eff=${effWinner} id=${idWinner}`
    );
  }

  // Z. No actionable suggestions → all is_top_pick false, and inputs are not
  //    mutated (a pre-set input flag stays as it was; only the output changes).
  {
    const disabled = makeCandidate("top_up_buffer", "buffer", 0.9, 0.9);
    disabled.action_kind = "disabled";
    disabled.is_actionable = false;
    disabled.is_top_pick = true; // stray flag the selector must NOT trust
    const onTrack = makeCandidate("on_track", "on_track", 0, 0);
    onTrack.action_kind = "informational";
    onTrack.is_actionable = false;
    const ranked = selectTopPick([disabled, onTrack]);
    add(
      "Z: no actionable suggestions → all output false, input unmutated",
      topPickCount(ranked) === 0 && disabled.is_top_pick === true,
      `outputCount=${topPickCount(ranked)} inputStillTrue=${disabled.is_top_pick === true}`
    );
  }

  return checks;
}

/** Count of suggestions flagged Top Pick (must be 0 or 1). */
function topPickCount(suggestions: EngineSuggestion[]): number {
  return suggestions.filter((s) => s.is_top_pick).length;
}

/** Minimal actionable candidate for direct selectTopPick tests. */
function makeCandidate(
  id: string,
  category: EngineSuggestion["category"],
  impact: number,
  urgency: number,
  efficiency: number | null = null
): EngineSuggestion {
  return {
    id,
    category,
    reason_codes: [],
    title_key: "x",
    description_key: "x",
    action_kind: "review_only",
    is_actionable: true,
    is_top_pick: false,
    scores: { impact, urgency, efficiency },
    guardrails: [],
    engine_version: "fixture",
    timestamp: FIXTURE_GENERATED_AT,
  };
}

/* ------------------------------------------------------------------ *
 * Step 7A — mapper checks (EngineSuggestion → SuggestionCardState).
 * Cases A–J use the Ma prefix to stay distinct from the engine A–Z.
 * ------------------------------------------------------------------ */
export function runMapperFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const engineCard = (args: FixtureArgs) => {
    const r = runSuggestionEngine(inputsFor(args), FIXTURE_GENERATED_AT);
    return { card: r.suggestions[0] ? toSuggestionCard(r.suggestions[0]) : undefined, r };
  };

  // Ma. Buffer actionable → title/description/amount, review-only, Top Pick true.
  {
    const { card } = engineCard({ safetyBuffer: bufferFixture(800, 1000, 3) }); // shortfall 2200
    add(
      "Ma: buffer actionable → mapped card (title, amount, review-only, top pick)",
      card?.title === "Top Up Your Safety Buffer" &&
        card?.description === "Increase your stablecoin reserve. Your Safety Buffer is below target." &&
        card?.impact_text.includes("$2,200") === true &&
        card?.actionability === "actionable" &&
        card?.cta.label === "Review" &&
        card?.cta.executes_transaction === false &&
        card?.is_top_pick === true,
      `title="${card?.title}" impact="${card?.impact_text}" actionability=${card?.actionability} top_pick=${card?.is_top_pick}`
    );
  }

  // Mb. Buffer below minimum → disabled card, no Top Pick, reason text.
  {
    const { card } = engineCard({ safetyBuffer: bufferFixture(2975, 1000, 3) }); // shortfall 25
    add(
      "Mb: buffer below min → disabled card, no Top Pick, reason text",
      card?.actionability === "disabled" &&
        card?.status === "disabled" &&
        card?.is_top_pick === false &&
        card?.disabled_reason_text === "Below minimum suggestion size.",
      `actionability=${card?.actionability} status=${card?.status} reason="${card?.disabled_reason_text}"`
    );
  }

  // Mc. Rebalance overweight → bucket-level card, no token names invented.
  {
    const { card } = engineCard({
      safetyBuffer: bufferFixture(5000, 1000, 3),
      allocation: allocationFixture(15000, 75, 15),
    });
    const noTokens = !/\b(SOL|USDC|BONK|sell|buy)\b/i.test(
      `${card?.title} ${card?.description}`
    );
    add(
      "Mc: rebalance overweight → bucket-level card, no token names",
      card?.title === "Rebalance Your Allocation" &&
        card?.description ===
          "Your crypto allocation is above your target. Review whether you want to move part of it toward stablecoins." &&
        noTokens,
      `title="${card?.title}" noTokens=${noTokens}`
    );
  }

  // Md. Rebalance underweight → bucket-level card, no token names invented.
  {
    const { card } = engineCard({
      safetyBuffer: bufferFixture(5000, 1000, 3),
      allocation: allocationFixture(15000, 45, -15),
    });
    const noTokens = !/\b(SOL|USDC|BONK|sell|buy)\b/i.test(
      `${card?.title} ${card?.description}`
    );
    add(
      "Md: rebalance underweight → bucket-level card, no token names",
      card?.title === "Rebalance Your Allocation" &&
        card?.description ===
          "Your crypto allocation is below your target. Review whether you want to move excess stablecoins toward crypto exposure." &&
        noTokens,
      `title="${card?.title}" noTokens=${noTokens}`
    );
  }

  // Me. On Track → informational card, no CTA, no Top Pick.
  {
    const { card } = engineCard({
      safetyBuffer: bufferFixture(5000, 1000, 3),
      allocation: allocationFixture(15000, 62, 5),
      positions: [cryptoPosition()],
    });
    add(
      "Me: On Track → informational card, no CTA, no Top Pick",
      card?.title === "Your Plan Is On Track" &&
        card?.actionability === "informational" &&
        card?.cta.label === "" &&
        card?.is_top_pick === false,
      `title="${card?.title}" actionability=${card?.actionability} cta="${card?.cta.label}"`
    );
  }

  // Mf. Missing copy key → safe fallback (never invented copy).
  {
    const bogus = makeCandidate("bogus", "buffer", 0.5, 0.5); // title_key/description_key = "x"
    const card = toSuggestionCard(bogus);
    add(
      "Mf: missing copy key → safe fallback",
      card.title === "Suggestion unavailable" && card.description === "Suggestion unavailable",
      `title="${card.title}"`
    );
  }

  // Mg. Engine order preserved: [buffer, rebalance, on_track] → same id order.
  {
    const list: EngineSuggestion[] = [
      makeCandidate("top_up_buffer", "buffer", 0.9, 0.9),
      makeCandidate("rebalance_to_plan", "rebalance", 0.5, 0.5),
      makeCandidate("on_track", "on_track", 0, 0),
    ];
    const ids = toSuggestionCards(list).map((c) => c.id);
    add(
      "Mg: engine order preserved (buffer, rebalance, on_track)",
      ids.join(",") === "top_up_buffer,rebalance_to_plan,on_track",
      `order=${ids.join(",")}`
    );
  }

  // Mh. Top Pick flag preserved exactly, even when it appears SECOND.
  {
    const buffer = makeCandidate("top_up_buffer", "buffer", 0.9, 0.9);
    const rebalance = makeCandidate("rebalance_to_plan", "rebalance", 0.5, 0.5);
    rebalance.is_top_pick = true; // Top Pick at index 1
    const cards = toSuggestionCards([buffer, rebalance]);
    add(
      "Mh: Top Pick preserved in place (not moved to first)",
      cards[0].id === "top_up_buffer" &&
        cards[0].is_top_pick === false &&
        cards[1].id === "rebalance_to_plan" &&
        cards[1].is_top_pick === true &&
        cards[1].badge === "Top Pick",
      `order=${cards.map((c) => c.id).join(",")} tp1=${cards[1].is_top_pick}`
    );
  }

  // Mi. Mapper does not sort: an intentionally non-canonical order is preserved.
  {
    const list: EngineSuggestion[] = [
      makeCandidate("on_track", "on_track", 0, 0),
      makeCandidate("rebalance_to_plan", "rebalance", 0.5, 0.5),
      makeCandidate("top_up_buffer", "buffer", 0.9, 0.9),
    ];
    const ids = toSuggestionCards(list).map((c) => c.id);
    add(
      "Mi: mapper does not re-sort to canonical order",
      ids.join(",") === "on_track,rebalance_to_plan,top_up_buffer",
      `order=${ids.join(",")}`
    );
  }

  // Mj. Mapper is pure — it does not mutate input and does not touch demo
  //     fixtures (the mapper module imports no demo data; see grep in
  //     validation). Here: input objects and array are unchanged after mapping.
  {
    const input: EngineSuggestion[] = [
      makeCandidate("top_up_buffer", "buffer", 0.9, 0.9),
      makeCandidate("rebalance_to_plan", "rebalance", 0.5, 0.5),
    ];
    const beforeIds = input.map((s) => s.id).join(",");
    const beforeTp = input.map((s) => s.is_top_pick).join(",");
    const cards = toSuggestionCards(input);
    const afterIds = input.map((s) => s.id).join(",");
    const afterTp = input.map((s) => s.is_top_pick).join(",");
    add(
      "Mj: mapper pure — input array/objects unchanged (demo unaffected)",
      beforeIds === afterIds && beforeTp === afterTp && cards.length === input.length,
      `inputUnchanged=${beforeIds === afterIds && beforeTp === afterTp}`
    );
  }

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 9A — contract checks for the CONTRACTED future categories
 * (capital_efficiency / staking / stable_yield / position_optimization).
 * Types + ordering + mapper fallback only; NO trigger logic.
 * ------------------------------------------------------------------ */
const CONTRACT_CATEGORIES = [
  "capital_efficiency",
  "staking",
  "stable_yield",
  "position_optimization",
] as const;

/** A minimal actionable suggestion for a contracted category, real copy keys. */
function catCandidate(
  category: EngineSuggestion["category"],
  overrides: Partial<EngineSuggestion> = {}
): EngineSuggestion {
  return {
    id: category,
    category,
    reason_codes: [],
    title_key: `suggestion.${category}.title`,
    description_key: `suggestion.${category}.description`,
    action_kind: "review_only",
    is_actionable: true,
    is_top_pick: false,
    scores: { impact: 0.5, urgency: 0.5, efficiency: null },
    guardrails: [],
    engine_version: "fixture",
    timestamp: FIXTURE_GENERATED_AT,
    ...overrides,
  };
}

export function runContractFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  // A. New categories typecheck + map to a valid, resolved-copy card.
  {
    const cards = CONTRACT_CATEGORIES.map((c) => toSuggestionCard(catCandidate(c)));
    const allResolved = cards.every((c) => c.title && c.title !== "Suggestion unavailable");
    add(
      "9A-A: new categories map with resolved (non-fallback) copy",
      cards.length === 4 && allResolved,
      `titles=${cards.map((c) => c.title).join(" | ")}`
    );
  }

  // B. Top Pick can select staking once buffer/rebalance are absent.
  {
    const ranked = selectTopPick([catCandidate("staking")]);
    const winner = ranked.find((s) => s.is_top_pick);
    add(
      "9A-B: staking becomes Top Pick when it is the only candidate",
      winner?.category === "staking",
      `winner=${winner?.category}`
    );
  }

  // C. Buffer beats every new category.
  {
    const ranked = selectTopPick([
      catCandidate("capital_efficiency"),
      catCandidate("staking"),
      catCandidate("stable_yield"),
      catCandidate("position_optimization"),
      makeCandidate("top_up_buffer", "buffer", 0.2, 0.2),
    ]);
    add(
      "9A-C: buffer beats all new categories",
      ranked.find((s) => s.is_top_pick)?.category === "buffer",
      `winner=${ranked.find((s) => s.is_top_pick)?.category}`
    );
  }

  // D. Rebalance beats staking / stable_yield / capital_efficiency.
  {
    const ranked = selectTopPick([
      catCandidate("staking"),
      catCandidate("stable_yield"),
      catCandidate("capital_efficiency"),
      makeCandidate("rebalance_to_plan", "rebalance", 0.2, 0.2),
    ]);
    add(
      "9A-D: rebalance beats new lower-priority categories",
      ranked.find((s) => s.is_top_pick)?.category === "rebalance",
      `winner=${ranked.find((s) => s.is_top_pick)?.category}`
    );
  }

  // E. On Track is still never Top Pick (even alongside new categories).
  {
    const onTrack = catCandidate("on_track", { action_kind: "informational", is_actionable: false });
    const ranked = selectTopPick([onTrack]);
    add(
      "9A-E: on_track never Top Pick",
      ranked.every((s) => !s.is_top_pick),
      `topPickCount=${ranked.filter((s) => s.is_top_pick).length}`
    );
  }

  // F. Mapper safely maps every new category (valid card, category/type set).
  {
    const ok = CONTRACT_CATEGORIES.every((c) => {
      const card = toSuggestionCard(catCandidate(c));
      return card.id === c && card.type !== "" && card.category !== "";
    });
    add("9A-F: mapper maps every new category to a valid card", ok, `categories=${CONTRACT_CATEGORIES.join(",")}`);
  }

  // G. New-category cards are non-transactional.
  {
    const ok = CONTRACT_CATEGORIES.every((c) => {
      const { cta } = toSuggestionCard(catCandidate(c));
      return (
        cta.executes_transaction === false &&
        cta.requires_wallet_signature === false &&
        cta.completion_on_click === false &&
        cta.action === null
      );
    });
    add("9A-G: new-category cards are non-transactional", ok, "all safety booleans false, action null");
  }

  // H. UI order preserved when new categories are passed in engine order.
  {
    const list: EngineSuggestion[] = [
      makeCandidate("top_up_buffer", "buffer", 0.5, 0.5),
      makeCandidate("rebalance_to_plan", "rebalance", 0.5, 0.5),
      catCandidate("capital_efficiency"),
      catCandidate("staking"),
      catCandidate("stable_yield"),
      catCandidate("position_optimization"),
      catCandidate("on_track", { action_kind: "informational", is_actionable: false }),
    ];
    const ids = toSuggestionCards(list).map((c) => c.id);
    const expected =
      "top_up_buffer,rebalance_to_plan,capital_efficiency,staking,stable_yield,position_optimization,on_track";
    add("9A-H: mapper preserves full-category engine order", ids.join(",") === expected, `order=${ids.join(",")}`);
  }

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 9B — idle SOL staking trigger.
 * ------------------------------------------------------------------ */
export function runStakingFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });
  const cats = (r: ReturnType<typeof runSuggestionEngine>) =>
    r.suggestions.map((s) => s.category).join(",") || "none";
  const has = (r: ReturnType<typeof runSuggestionEngine>, c: string) =>
    r.suggestions.some((s) => s.category === c);

  const fundedBuffer = () => bufferFixture(5000, 1000, 3); // funded, zero excess
  const aligned = () => allocationFixture(15000, 62, 5); // delta 5% → no rebalance
  const offTarget = () => allocationFixture(15000, 75, 15); // delta 15% → rebalance

  // 9B-A. Underfunded buffer + idle SOL → Buffer only, no staking.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: bufferFixture(800, 1000, 3), positions: [solPosition(10)] }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9B-A: underfunded buffer + idle SOL → buffer only, no staking",
      cats(r) === "buffer" && !has(r, "staking"),
      `categories=${cats(r)}`
    );
  }

  // 9B-B. Funded + aligned (no rebalance) + eligible SOL → Staking Top Pick, no On Track.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: fundedBuffer(), allocation: aligned(), positions: [solPosition(10)] }),
      FIXTURE_GENERATED_AT
    );
    const staking = r.suggestions.find((s) => s.category === "staking");
    add(
      "9B-B: funded + no rebalance + eligible SOL → staking Top Pick, no On Track",
      cats(r) === "staking" &&
        staking?.is_top_pick === true &&
        !has(r, "on_track") &&
        staking?.amount?.valueUsd === 9.9 * 75,
      `categories=${cats(r)} topPick=${staking?.is_top_pick} amount=${staking?.amount?.valueUsd}`
    );
  }

  // 9B-C. Funded + rebalance + eligible SOL → Rebalance first (Top Pick), Staking second.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: fundedBuffer(), allocation: offTarget(), positions: [solPosition(10)] }),
      FIXTURE_GENERATED_AT
    );
    const reb = r.suggestions.find((s) => s.category === "rebalance");
    const stk = r.suggestions.find((s) => s.category === "staking");
    add(
      "9B-C: funded + rebalance + SOL → rebalance first/Top Pick, staking second",
      cats(r) === "rebalance,staking" &&
        reb?.is_top_pick === true &&
        stk?.is_top_pick === false,
      `categories=${cats(r)} rebTop=${reb?.is_top_pick} stkTop=${stk?.is_top_pick}`
    );
  }

  // 9B-D. Funded + only the reserve (0.1 SOL) → no staking; aligned → On Track.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: fundedBuffer(), allocation: aligned(), positions: [solPosition(0.1)] }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9B-D: funded + only 0.1 SOL → no staking, On Track",
      !has(r, "staking") && cats(r) === "on_track",
      `categories=${cats(r)}`
    );
  }

  // 9B-E. Funded + eligible SOL worth < $50 → no staking; aligned → On Track.
  {
    // 0.5 SOL @ $75 → eligible 0.4 SOL = $30 < $50
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: fundedBuffer(), allocation: aligned(), positions: [solPosition(0.5)] }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9B-E: funded + eligible value < $50 → no staking, On Track",
      !has(r, "staking") && cats(r) === "on_track",
      `categories=${cats(r)}`
    );
  }

  // 9B-F. Only LSTs (JupSOL/mSOL), no liquid SOL → no staking.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: fundedBuffer(),
        allocation: aligned(),
        positions: [lstPosition("JupSOL", 100), lstPosition("mSOL", 50)],
      }),
      FIXTURE_GENERATED_AT
    );
    add("9B-F: only LSTs, no liquid SOL → no staking", !has(r, "staking"), `categories=${cats(r)}`);
  }

  // 9B-G. SOL present but unpriced → no staking, no invented amount.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: fundedBuffer(),
        allocation: aligned(),
        positions: [solPosition(10, { priced: false })],
      }),
      FIXTURE_GENERATED_AT
    );
    add("9B-G: SOL unpriced → no staking", !has(r, "staking"), `categories=${cats(r)}`);
  }

  // 9B-H. Liquid priced WSOL (token) → counts as liquid SOL → staking emitted.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: fundedBuffer(),
        allocation: aligned(),
        positions: [solPosition(10, { symbol: "WSOL", type: "token" })],
      }),
      FIXTURE_GENERATED_AT
    );
    add("9B-H: liquid priced WSOL → staking emitted", has(r, "staking"), `categories=${cats(r)}`);
  }

  // 9B-I. Partial pricing + priced SOL → staking still emits + partial_pricing warning.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: fundedBuffer(),
        allocation: aligned(),
        positions: [solPosition(10)],
        anyUnpriced: true,
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9B-I: partial pricing + priced SOL → staking + warning",
      has(r, "staking") && r.warnings.includes("partial_pricing"),
      `categories=${cats(r)} warnings=${r.warnings.join(",")}`
    );
  }

  // 9B-J. Mapper renders the staking card safely.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: fundedBuffer(), allocation: aligned(), positions: [solPosition(10)] }),
      FIXTURE_GENERATED_AT
    );
    const s = r.suggestions.find((x) => x.category === "staking");
    const card = s ? toSuggestionCard(s) : undefined;
    add(
      "9B-J: staking card maps safely (copy, amount, review-only, non-transactional)",
      card?.title === "Put Idle SOL to Work" &&
        card?.description === "You have liquid SOL that may be eligible for staking or liquid staking." &&
        card?.impact_text.includes("Eligible SOL to review") === true &&
        card?.cta.label === "Review" &&
        card?.cta.executes_transaction === false &&
        card?.cta.requires_wallet_signature === false &&
        card?.cta.action === null,
      `title="${card?.title}" impact="${card?.impact_text}" cta="${card?.cta.label}"`
    );
  }

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 9C (corrected) — stablecoin yield trigger. Eligible amount is the FULL
 * liquid wallet stable value (approved yield stays Safety-Buffer-eligible, so
 * it is NOT reduced by the buffer or allocation target). Funded buffer + no
 * Rebalance + liquid wallet stables ≥ $100.
 * ------------------------------------------------------------------ */
export function runStableYieldFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });
  const cats = (r: ReturnType<typeof runSuggestionEngine>) =>
    r.suggestions.map((s) => s.category).join(",") || "none";
  const has = (r: ReturnType<typeof runSuggestionEngine>, c: string) =>
    r.suggestions.some((s) => s.category === c);

  const funded = () => bufferFixture(5000, 1000, 3); // funded (target $3,000)
  const aligned = () => allocationFixture(15000, 62, 2); // no rebalance
  const offTarget = () => allocationFixture(15000, 75, 15); // rebalance applies

  // 9C-A. Underfunded buffer + liquid USDC → Buffer only.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: bufferFixture(800, 1000, 3),
        allocation: aligned(),
        positions: [stablePosition("USDC", 10000)],
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9C-A: underfunded buffer + liquid USDC → buffer only",
      cats(r) === "buffer" && !has(r, "stable_yield"),
      `categories=${cats(r)}`
    );
  }

  // 9C-B. Funded + no rebalance + liquid USDC ≥ $100 → stable_yield Top Pick,
  //       amount = FULL liquid wallet stable value (no buffer subtraction).
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: aligned(),
        positions: [stablePosition("USDC", 10000)],
      }),
      FIXTURE_GENERATED_AT
    );
    const sy = r.suggestions.find((s) => s.category === "stable_yield");
    add(
      "9C-B: funded + no rebalance + liquid USDC → stable_yield Top Pick, full amount",
      cats(r) === "stable_yield" &&
        sy?.is_top_pick === true &&
        sy?.amount?.valueUsd === 10000 &&
        !has(r, "on_track"),
      `categories=${cats(r)} topPick=${sy?.is_top_pick} amount=${sy?.amount?.valueUsd}`
    );
  }

  // 9C-C. Funded + Rebalance applies + liquid USDC → Rebalance only, no stable_yield.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: offTarget(),
        positions: [stablePosition("USDC", 10000)],
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9C-C: funded + rebalance + liquid USDC → rebalance only, no stable_yield",
      has(r, "rebalance") && !has(r, "stable_yield"),
      `categories=${cats(r)}`
    );
  }

  // 9C-D. Funded + Staking + Stable Yield + no Rebalance → Staking first (Top Pick), stable_yield second.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: aligned(),
        positions: [solPosition(10), stablePosition("USDC", 10000)],
      }),
      FIXTURE_GENERATED_AT
    );
    const stk = r.suggestions.find((s) => s.category === "staking");
    const sy = r.suggestions.find((s) => s.category === "stable_yield");
    add(
      "9C-D: staking + stable_yield → staking first/Top Pick, stable_yield second",
      cats(r) === "staking,stable_yield" &&
        stk?.is_top_pick === true &&
        sy?.is_top_pick === false,
      `categories=${cats(r)} stkTop=${stk?.is_top_pick} syTop=${sy?.is_top_pick}`
    );
  }

  // 9C-E. Funded + liquid stable value < $100 → no stable_yield → On Track.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: aligned(),
        positions: [stablePosition("USDC", 50)],
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9C-E: funded + liquid stable < $100 → no stable_yield, On Track",
      !has(r, "stable_yield") && cats(r) === "on_track",
      `categories=${cats(r)}`
    );
  }

  // 9C-F. Stables held in a PROTOCOL position (not liquid wallet) → no new stable_yield.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: aligned(),
        positions: [stablePosition("USDC", 10000, { type: "protocol", source: "kamino" })],
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9C-F: stables only in protocol positions → no stable_yield",
      !has(r, "stable_yield"),
      `categories=${cats(r)}`
    );
  }

  // 9C-G. Unknown stable-like wallet token (not in approved set) → no stable_yield.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: aligned(),
        positions: [stablePosition("USDX", 10000)], // USDX not in STABLE_SYMBOLS
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9C-G: unknown stable-like token → no stable_yield",
      !has(r, "stable_yield"),
      `categories=${cats(r)}`
    );
  }

  // 9C-H. Stable price/value missing → no stable_yield, no invented amount.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: aligned(),
        positions: [stablePosition("USDC", 10000, { priced: false })],
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9C-H: unpriced stable → no stable_yield",
      !has(r, "stable_yield"),
      `categories=${cats(r)}`
    );
  }

  // 9C-I. Partial pricing + priced wallet USDC → stable_yield still emits + warning.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: aligned(),
        positions: [stablePosition("USDC", 10000)],
        anyUnpriced: true,
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9C-I: partial pricing + priced USDC → stable_yield + warning",
      has(r, "stable_yield") && r.warnings.includes("partial_pricing"),
      `categories=${cats(r)} warnings=${r.warnings.join(",")}`
    );
  }

  // 9C-J. Mapper renders the stable_yield card safely.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: aligned(),
        positions: [stablePosition("USDC", 10000)],
      }),
      FIXTURE_GENERATED_AT
    );
    const s = r.suggestions.find((x) => x.category === "stable_yield");
    const card = s ? toSuggestionCard(s) : undefined;
    add(
      "9C-J: stable_yield card maps safely (copy, amount, review-only, non-transactional)",
      card?.title === "Put Stablecoins to Work" &&
        card?.description ===
          "You have liquid stablecoins that may be eligible for conservative yield options while still supporting your Safety Buffer." &&
        card?.impact_text.includes("Eligible stablecoins to review") === true &&
        card?.cta.label === "Review" &&
        card?.cta.executes_transaction === false &&
        card?.cta.requires_wallet_signature === false &&
        card?.cta.action === null,
      `title="${card?.title}" impact="${card?.impact_text}" cta="${card?.cta.label}"`
    );
  }

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 9D — existing position-optimization review trigger.
 * ------------------------------------------------------------------ */
export function runPositionOptimizationFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });
  const cats = (r: ReturnType<typeof runSuggestionEngine>) =>
    r.suggestions.map((s) => s.category).join(",") || "none";
  const has = (r: ReturnType<typeof runSuggestionEngine>, c: string) =>
    r.suggestions.some((s) => s.category === c);
  const posOpt = (r: ReturnType<typeof runSuggestionEngine>) =>
    r.suggestions.find((s) => s.category === "position_optimization");

  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2); // no rebalance
  const offTarget = () => allocationFixture(15000, 75, 15); // rebalance applies

  // 9D-A. Underfunded buffer + flagged yield position → Buffer only.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: bufferFixture(800, 1000, 3),
        allocation: aligned(),
        positions: [yieldPosition(5000, null)],
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9D-A: underfunded buffer + flagged position → buffer only",
      cats(r) === "buffer" && !has(r, "position_optimization"),
      `categories=${cats(r)}`
    );
  }

  // 9D-B. Funded + no higher candidate + deployed position missing APY ≥ $100 → Top Pick.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: aligned(),
        positions: [yieldPosition(5000, null)],
      }),
      FIXTURE_GENERATED_AT
    );
    const s = posOpt(r);
    add(
      "9D-B: funded + missing-APY position → position_optimization Top Pick",
      cats(r) === "position_optimization" &&
        s?.is_top_pick === true &&
        s?.reason_codes.includes("missing_apy_data") === true &&
        s?.amount?.valueUsd === 5000,
      `categories=${cats(r)} topPick=${s?.is_top_pick} reasons=${s?.reason_codes.join(",")}`
    );
  }

  // 9D-C. Funded + deployed position APY < 1% and ≥ $100 → low_yield_position.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: aligned(),
        positions: [yieldPosition(5000, 0.5)],
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9D-C: funded + low APY position → low_yield_position",
      posOpt(r)?.reason_codes.includes("low_yield_position") === true,
      `reasons=${posOpt(r)?.reason_codes.join(",")}`
    );
  }

  // 9D-D. Funded + healthy position (APY ≥ 1%, not concentrated) → no position_optimization → On Track.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: aligned(),
        positions: [yieldPosition(2000, 5)],
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9D-D: funded + healthy position → no position_optimization, On Track",
      !has(r, "position_optimization") && cats(r) === "on_track",
      `categories=${cats(r)}`
    );
  }

  // 9D-E. Funded + concentrated position (≥ 50% of portfolio, ≥ $1,000) → concentration_risk.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: aligned(),
        positions: [yieldPosition(8000, 5)], // 8000 / 15000 = 53%, healthy APY
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9D-E: funded + concentrated position → concentration_risk",
      posOpt(r)?.reason_codes.includes("concentration_risk") === true &&
        posOpt(r)?.reason_codes.includes("low_yield_position") === false,
      `reasons=${posOpt(r)?.reason_codes.join(",")}`
    );
  }

  // 9D-F. Flagged deployed position below $100 → no position_optimization.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: aligned(),
        positions: [yieldPosition(50, null)],
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9D-F: deployed position < $100 → no position_optimization, On Track",
      !has(r, "position_optimization") && cats(r) === "on_track",
      `categories=${cats(r)}`
    );
  }

  // 9D-G. Liquid wallet token with missing APY → not a deployed position → none.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: aligned(),
        positions: [cryptoPosition(5000)], // type token, wallet — not deployed
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9D-G: liquid wallet token → no position_optimization",
      !has(r, "position_optimization"),
      `categories=${cats(r)}`
    );
  }

  // 9D-H. Unpriced deployed position → no position_optimization, no invented amount.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: aligned(),
        positions: [yieldPosition(5000, null, { priced: false })],
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9D-H: unpriced deployed position → no position_optimization",
      !has(r, "position_optimization"),
      `categories=${cats(r)}`
    );
  }

  // 9D-I. Rebalance + flagged position → Rebalance first (Top Pick), position_optimization second.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: offTarget(),
        positions: [yieldPosition(5000, null)],
      }),
      FIXTURE_GENERATED_AT
    );
    const reb = r.suggestions.find((s) => s.category === "rebalance");
    add(
      "9D-I: rebalance + flagged position → rebalance first/Top Pick, position_opt second",
      cats(r) === "rebalance,position_optimization" &&
        reb?.is_top_pick === true &&
        posOpt(r)?.is_top_pick === false,
      `categories=${cats(r)} rebTop=${reb?.is_top_pick}`
    );
  }

  // 9D-J. Staking + Stable Yield + Position Optimization, no Rebalance → engine order, Staking Top Pick.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: aligned(),
        positions: [solPosition(10), stablePosition("USDC", 10000), yieldPosition(5000, null)],
      }),
      FIXTURE_GENERATED_AT
    );
    const stk = r.suggestions.find((s) => s.category === "staking");
    add(
      "9D-J: staking + stable_yield + position_opt → engine order, staking Top Pick",
      cats(r) === "staking,stable_yield,position_optimization" && stk?.is_top_pick === true,
      `categories=${cats(r)} stkTop=${stk?.is_top_pick}`
    );
  }

  // 9D-K. Mapper renders the position_optimization card safely.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: aligned(),
        positions: [yieldPosition(5000, null)],
      }),
      FIXTURE_GENERATED_AT
    );
    const s = posOpt(r);
    const card = s ? toSuggestionCard(s) : undefined;
    add(
      "9D-K: position_optimization card maps safely (copy, amount, review-only, non-transactional)",
      card?.title === "Review Existing Yield Positions" &&
        card?.description ===
          "Some existing positions may need review based on yield, concentration, or missing data." &&
        card?.impact_text.includes("Positions to review") === true &&
        card?.cta.label === "Review" &&
        card?.cta.executes_transaction === false &&
        card?.cta.requires_wallet_signature === false &&
        card?.cta.action === null,
      `title="${card?.title}" impact="${card?.impact_text}" cta="${card?.cta.label}"`
    );
  }

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 9E — capital efficiency / idle assets trigger.
 * cryptoPosition() builds a priced liquid wallet BONK token = eligible idle
 * asset. Total priced value is 15,000, so the 2% share threshold is $300.
 * ------------------------------------------------------------------ */
export function runCapitalEfficiencyFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });
  const cats = (r: ReturnType<typeof runSuggestionEngine>) =>
    r.suggestions.map((s) => s.category).join(",") || "none";
  const has = (r: ReturnType<typeof runSuggestionEngine>, c: string) =>
    r.suggestions.some((s) => s.category === c);

  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2); // no rebalance
  const offTarget = () => allocationFixture(15000, 75, 15); // rebalance applies

  // 9E-A. Underfunded buffer + eligible idle token → Buffer only.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: bufferFixture(800, 1000, 3),
        allocation: aligned(),
        positions: [cryptoPosition(5000)],
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9E-A: underfunded buffer + idle token → buffer only",
      cats(r) === "buffer" && !has(r, "capital_efficiency"),
      `categories=${cats(r)}`
    );
  }

  // 9E-B. Funded + no higher candidate + idle token ≥ $100 and ≥ 2% → Top Pick.
  {
    const r = runSuggestionEngine(
      // $400 = 2.67% share → Capital Efficiency only (below Trim's 5% threshold).
      inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [cryptoPosition(400)] }),
      FIXTURE_GENERATED_AT
    );
    const s = r.suggestions.find((x) => x.category === "capital_efficiency");
    add(
      "9E-B: funded + idle token → capital_efficiency Top Pick, full amount",
      cats(r) === "capital_efficiency" &&
        s?.is_top_pick === true &&
        s?.amount?.valueUsd === 400,
      `categories=${cats(r)} topPick=${s?.is_top_pick} amount=${s?.amount?.valueUsd}`
    );
  }

  // 9E-C. Funded + Rebalance applies + idle token → Rebalance first (Top Pick), capital_efficiency second.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: funded(), allocation: offTarget(), positions: [cryptoPosition(400)] }),
      FIXTURE_GENERATED_AT
    );
    const reb = r.suggestions.find((s) => s.category === "rebalance");
    add(
      "9E-C: rebalance + idle token → rebalance first/Top Pick, capital_efficiency second",
      cats(r) === "rebalance,capital_efficiency" && reb?.is_top_pick === true,
      `categories=${cats(r)} rebTop=${reb?.is_top_pick}`
    );
  }

  // 9E-D. Funded + Capital Efficiency + Staking + Stable Yield, no Rebalance → engine order, capEff Top Pick.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: aligned(),
        positions: [cryptoPosition(400), solPosition(10), stablePosition("USDC", 10000)],
      }),
      FIXTURE_GENERATED_AT
    );
    const ce = r.suggestions.find((s) => s.category === "capital_efficiency");
    add(
      "9E-D: capEff + staking + stable_yield → engine order, capital_efficiency Top Pick",
      cats(r) === "capital_efficiency,staking,stable_yield" && ce?.is_top_pick === true,
      `categories=${cats(r)} ceTop=${ce?.is_top_pick}`
    );
  }

  // 9E-E. Idle token value < $100 → no capital_efficiency → On Track.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [cryptoPosition(50)] }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9E-E: idle token < $100 → no capital_efficiency, On Track",
      !has(r, "capital_efficiency") && cats(r) === "on_track",
      `categories=${cats(r)}`
    );
  }

  // 9E-F. Idle token ≥ $100 but < 2% of portfolio ($200 / 15,000 = 1.3%) → no capital_efficiency.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [cryptoPosition(200)] }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9E-F: idle token below 2% share → no capital_efficiency, On Track",
      !has(r, "capital_efficiency") && cats(r) === "on_track",
      `categories=${cats(r)}`
    );
  }

  // 9E-G. Only liquid SOL → no capital_efficiency (staking may apply).
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [solPosition(10)] }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9E-G: only liquid SOL → no capital_efficiency",
      !has(r, "capital_efficiency"),
      `categories=${cats(r)}`
    );
  }

  // 9E-H. Only liquid wallet stablecoins → no capital_efficiency (stable_yield may apply).
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [stablePosition("USDC", 10000)] }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9E-H: only stablecoins → no capital_efficiency",
      !has(r, "capital_efficiency"),
      `categories=${cats(r)}`
    );
  }

  // 9E-I. Only deployed positions → no capital_efficiency (position_optimization may apply).
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [yieldPosition(5000, null)] }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9E-I: only deployed positions → no capital_efficiency",
      !has(r, "capital_efficiency"),
      `categories=${cats(r)}`
    );
  }

  // 9E-J. Unpriced idle token → no capital_efficiency, no invented amount.
  {
    const unpriced: WalletPosition = {
      id: "unpriced-bonk",
      source: "wallet",
      type: "token",
      symbol: "BONK",
      name: "Bonk",
      amount: "1000000",
      uiAmount: 1_000_000,
      decimals: 5,
      detection: "direct_wallet_balance",
      priceUsd: null,
      valueUsd: null,
    };
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [unpriced] }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9E-J: unpriced idle token → no capital_efficiency",
      !has(r, "capital_efficiency"),
      `categories=${cats(r)}`
    );
  }

  // 9E-K. Partial pricing + priced idle token → capital_efficiency + warning.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: aligned(),
        positions: [cryptoPosition(5000)],
        anyUnpriced: true,
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9E-K: partial pricing + priced idle token → capital_efficiency + warning",
      has(r, "capital_efficiency") && r.warnings.includes("partial_pricing"),
      `categories=${cats(r)} warnings=${r.warnings.join(",")}`
    );
  }

  // 9E-L. Mapper renders the capital_efficiency card safely.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [cryptoPosition(5000)] }),
      FIXTURE_GENERATED_AT
    );
    const s = r.suggestions.find((x) => x.category === "capital_efficiency");
    const card = s ? toSuggestionCard(s) : undefined;
    add(
      "9E-L: capital_efficiency card maps safely (copy, amount, review-only, non-transactional)",
      card?.title === "Review Idle Assets" &&
        card?.description === "Some assets may not be contributing to your current plan." &&
        card?.impact_text.includes("Idle assets to review") === true &&
        card?.cta.label === "Review" &&
        card?.cta.executes_transaction === false &&
        card?.cta.requires_wallet_signature === false &&
        card?.cta.action === null,
      `title="${card?.title}" impact="${card?.impact_text}" cta="${card?.cta.label}"`
    );
  }

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 9F — full-engine QA: the realistic maximum-candidate scenarios,
 * verifying complete ordering, Top Pick, and card count (noise review).
 * ------------------------------------------------------------------ */
export function runFullQaFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });
  const cats = (r: ReturnType<typeof runSuggestionEngine>) =>
    r.suggestions.map((s) => s.category).join(",") || "none";
  const topPickCat = (r: ReturnType<typeof runSuggestionEngine>) =>
    r.suggestions.find((s) => s.is_top_pick)?.category ?? "none";
  const tpCount = (r: ReturnType<typeof runSuggestionEngine>) =>
    r.suggestions.filter((s) => s.is_top_pick).length;

  // Everything eligible: a funded buffer + idle crypto + idle SOL + liquid
  // stables + a flagged deployed position.
  const everything = [
    cryptoPosition(5000), // capital_efficiency
    solPosition(10), // staking
    stablePosition("USDC", 10000), // stable_yield (when no rebalance)
    yieldPosition(5000, null), // position_optimization (missing APY)
  ];

  // QA-1. No Rebalance → capEff, staking, stable_yield, position_optimization
  //       (4 cards), capEff Top Pick, engine order preserved.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: bufferFixture(5000, 1000, 3),
        allocation: allocationFixture(15000, 62, 2), // no rebalance
        positions: everything,
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9F-1: no rebalance, all fire → 5 cards in order, capital_efficiency Top Pick",
      cats(r) === "capital_efficiency,trim,staking,stable_yield,position_optimization" &&
        topPickCat(r) === "capital_efficiency" &&
        tpCount(r) === 1 &&
        r.suggestions.length === 5,
      `order=${cats(r)} topPick=${topPickCat(r)} tpCount=${tpCount(r)}`
    );
  }

  // QA-2. Rebalance present → rebalance, capEff, staking, position_optimization
  //       (stable_yield suppressed), 4 cards, rebalance Top Pick.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: bufferFixture(5000, 1000, 3),
        allocation: allocationFixture(15000, 75, 15), // rebalance applies
        positions: everything,
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9F-2: rebalance present → rebalance,capEff,trim,staking,posOpt (no stable_yield), rebalance Top Pick",
      cats(r) === "rebalance,capital_efficiency,trim,staking,position_optimization" &&
        topPickCat(r) === "rebalance" &&
        tpCount(r) === 1 &&
        r.suggestions.length === 5,
      `order=${cats(r)} topPick=${topPickCat(r)}`
    );
  }

  // QA-3. Underfunded buffer overrides EVERYTHING (all else eligible) → buffer only.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: bufferFixture(800, 1000, 3), // underfunded
        allocation: allocationFixture(15000, 75, 15),
        positions: everything,
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9F-3: underfunded buffer overrides all → buffer only, buffer Top Pick",
      cats(r) === "buffer" && topPickCat(r) === "buffer",
      `categories=${cats(r)}`
    );
  }

  // QA-4. Realistic maximum card count never exceeds 4 actionable cards.
  {
    const noReb = runSuggestionEngine(
      inputsFor({
        safetyBuffer: bufferFixture(5000, 1000, 3),
        allocation: allocationFixture(15000, 62, 2),
        positions: everything,
      }),
      FIXTURE_GENERATED_AT
    );
    const withReb = runSuggestionEngine(
      inputsFor({
        safetyBuffer: bufferFixture(5000, 1000, 3),
        allocation: allocationFixture(15000, 75, 15),
        positions: everything,
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9F-4: max card count ≤ 5 (buffer/on_track are exclusive; stable_yield/dca gated by rebalance)",
      noReb.suggestions.length <= 5 && withReb.suggestions.length <= 5,
      `noRebalance=${noReb.suggestions.length} withRebalance=${withReb.suggestions.length}`
    );
  }

  return checks;
}

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
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: bufferFixture(800, 1000, 3),
        allocation: dcaUnder(3),
        positions: [cryptoPosition(100)],
      }),
      FIXTURE_GENERATED_AT
    );
    add("9G-A: underfunded buffer → buffer only, no dca", cats(r) === "buffer" && !has(r, "dca"), `categories=${cats(r)}`);
  }

  // 9G-B. Funded + Rebalance applies + contribution → Rebalance, no DCA.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: funded(), allocation: offTarget(), positions: [cryptoPosition(100)] }),
      FIXTURE_GENERATED_AT
    );
    add("9G-B: rebalance applies → rebalance, no dca", has(r, "rebalance") && !has(r, "dca"), `categories=${cats(r)}`);
  }

  // 9G-C. Funded + crypto 3pts under target + contribution ≥ $50 + no higher → DCA Top Pick.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: funded(), allocation: dcaUnder(3), positions: [cryptoPosition(100)] }),
      FIXTURE_GENERATED_AT
    );
    const s = dca(r);
    add(
      "9G-C: funded + 3pt underweight + contribution → dca Top Pick",
      cats(r) === "dca" && s?.is_top_pick === true && s?.amount?.valueUsd === 450,
      `categories=${cats(r)} topPick=${s?.is_top_pick} amount=${s?.amount?.valueUsd}`
    );
  }

  // 9G-D. Crypto at/above target → no DCA → On Track.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: funded(), allocation: allocationFixture(15000, 60, 0), positions: [cryptoPosition(100)] }),
      FIXTURE_GENERATED_AT
    );
    add("9G-D: crypto at target → no dca, On Track", !has(r, "dca") && cats(r) === "on_track", `categories=${cats(r)}`);
  }

  // 9G-E. Underweight below 2 points → no DCA → On Track.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: funded(), allocation: dcaUnder(1), positions: [cryptoPosition(100)] }),
      FIXTURE_GENERATED_AT
    );
    add("9G-E: underweight < 2pt → no dca, On Track", !has(r, "dca") && cats(r) === "on_track", `categories=${cats(r)}`);
  }

  // 9G-F. Monthly contribution missing → no DCA → On Track.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: funded(), allocation: dcaUnder(3), positions: [cryptoPosition(100)], goal: noContribGoal }),
      FIXTURE_GENERATED_AT
    );
    add("9G-F: no contribution → no dca, On Track", !has(r, "dca") && cats(r) === "on_track", `categories=${cats(r)}`);
  }

  // 9G-G. Monthly contribution below $50 → no DCA → On Track.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: funded(), allocation: dcaUnder(3), positions: [cryptoPosition(100)], goal: smallContribGoal }),
      FIXTURE_GENERATED_AT
    );
    add("9G-G: contribution < $50 → no dca, On Track", !has(r, "dca") && cats(r) === "on_track", `categories=${cats(r)}`);
  }

  // 9G-H. Target crypto gap below $50 (small portfolio, 2pt gap = $40) → no DCA → On Track.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: bufferFixture(2000, 300, 3),
        totalUsd: 2000,
        allocation: allocationFixture(2000, 58, -2), // gap = 2000*0.60 − 2000*0.58 = 40
        positions: [cryptoPosition(50)],
      }),
      FIXTURE_GENERATED_AT
    );
    add("9G-H: target gap < $50 → no dca, On Track", !has(r, "dca") && cats(r) === "on_track", `categories=${cats(r)}`);
  }

  // 9G-I. capEff + staking + stable_yield + DCA, no rebalance → engine order, capEff Top Pick.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: dcaUnder(3),
        positions: [cryptoPosition(400), solPosition(10), stablePosition("USDC", 10000)],
      }),
      FIXTURE_GENERATED_AT
    );
    const ce = r.suggestions.find((s) => s.category === "capital_efficiency");
    add(
      "9G-I: capEff + staking + stable_yield + dca → engine order, capital_efficiency Top Pick",
      cats(r) === "capital_efficiency,staking,stable_yield,dca" && ce?.is_top_pick === true,
      `categories=${cats(r)} ceTop=${ce?.is_top_pick}`
    );
  }

  // 9G-J. DCA + Position Optimization, no higher candidates → DCA first (Top Pick), posOpt second.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: dcaUnder(3),
        positions: [cryptoPosition(100), yieldPosition(5000, null)],
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9G-J: dca + position_optimization → dca first/Top Pick, posOpt second",
      cats(r) === "dca,position_optimization" && dca(r)?.is_top_pick === true,
      `categories=${cats(r)} dcaTop=${dca(r)?.is_top_pick}`
    );
  }

  // 9G-K. Mapper renders the DCA card safely.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: funded(), allocation: dcaUnder(3), positions: [cryptoPosition(100)] }),
      FIXTURE_GENERATED_AT
    );
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
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: funded(), allocation: dcaUnder(3), positions: [cryptoPosition(100)] }),
      FIXTURE_GENERATED_AT
    );
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

/* ------------------------------------------------------------------ *
 * Step 9H — trim (non-core long-tail token review) trigger.
 * Note: trim rule A (≥ 5% aggregate) necessarily co-triggers Capital
 * Efficiency (≥ 2%), so a trim-ONLY scenario uses the small-position path
 * (aggregate < 2%, so no Capital Efficiency).
 * ------------------------------------------------------------------ */
export function runTrimFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });
  const cats = (r: ReturnType<typeof runSuggestionEngine>) =>
    r.suggestions.map((s) => s.category).join(",") || "none";
  const has = (r: ReturnType<typeof runSuggestionEngine>, c: string) =>
    r.suggestions.some((s) => s.category === c);
  const trim = (r: ReturnType<typeof runSuggestionEngine>) =>
    r.suggestions.find((s) => s.category === "trim");

  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2); // no rebalance
  const offTarget = () => allocationFixture(15000, 75, 15); // rebalance applies
  // Four small non-core tokens ($40 each = $160): aggregate 1.07% (< 2% → no
  // Capital Efficiency), triggers trim small-position cleanup only.
  const smallTokens = [
    nonCoreToken("AAA", 40),
    nonCoreToken("BBB", 40),
    nonCoreToken("CCC", 40),
    nonCoreToken("DDD", 40),
  ];

  // 9H-A. Underfunded buffer + trim conditions otherwise true → Buffer only.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: bufferFixture(800, 1000, 3), allocation: aligned(), positions: [nonCoreToken("BONK", 5000)] }),
      FIXTURE_GENERATED_AT
    );
    add("9H-A: underfunded buffer → buffer only, no trim", cats(r) === "buffer" && !has(r, "trim"), `categories=${cats(r)}`);
  }

  // 9H-B. Funded + trim fires as the ONLY candidate (no Capital Efficiency) → Trim Top Pick.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: smallTokens }),
      FIXTURE_GENERATED_AT
    );
    const s = trim(r);
    add(
      "9H-B: funded + non-core exposure, no capEff → trim Top Pick",
      cats(r) === "trim" && s?.is_top_pick === true && s?.amount?.valueUsd === 160,
      `categories=${cats(r)} topPick=${s?.is_top_pick} amount=${s?.amount?.valueUsd}`
    );
  }

  // 9H-C. Funded + Rebalance applies + trim conditions → Rebalance first/Top Pick, Trim later.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: funded(), allocation: offTarget(), positions: [nonCoreToken("BONK", 5000)] }),
      FIXTURE_GENERATED_AT
    );
    const reb = r.suggestions.find((s) => s.category === "rebalance");
    add(
      "9H-C: rebalance + trim → rebalance first/Top Pick, trim present",
      r.suggestions[0]?.category === "rebalance" && reb?.is_top_pick === true && has(r, "trim"),
      `categories=${cats(r)} rebTop=${reb?.is_top_pick}`
    );
  }

  // 9H-D. Funded + Capital Efficiency and Trim both fire → capEff first/Top Pick, trim second.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [nonCoreToken("BONK", 5000)] }),
      FIXTURE_GENERATED_AT
    );
    const ce = r.suggestions.find((s) => s.category === "capital_efficiency");
    add(
      "9H-D: capEff + trim → capital_efficiency first/Top Pick, trim second",
      cats(r) === "capital_efficiency,trim" && ce?.is_top_pick === true && trim(r)?.is_top_pick === false,
      `categories=${cats(r)} ceTop=${ce?.is_top_pick}`
    );
  }

  // 9H-E. Single non-core token ≥ 10% of portfolio → token_concentration_review.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [nonCoreToken("BONK", 2000)] }), // 13.3%
      FIXTURE_GENERATED_AT
    );
    add(
      "9H-E: single token ≥ 10% → trim with token_concentration_review",
      trim(r)?.reason_codes.includes("token_concentration_review") === true,
      `reasons=${trim(r)?.reason_codes.join(",")}`
    );
  }

  // 9H-F. 3+ small non-core tokens (≤ $50, combined ≥ $100) → small_position_cleanup.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: smallTokens }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9H-F: 3+ small tokens → trim with small_position_cleanup",
      trim(r)?.reason_codes.includes("small_position_cleanup") === true &&
        trim(r)?.reason_codes.includes("liquidity_not_evaluated") === true,
      `reasons=${trim(r)?.reason_codes.join(",")}`
    );
  }

  // 9H-G. Non-core token < $100 and < 5%, no concentration/cleanup → no Trim → On Track.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [nonCoreToken("BONK", 80)] }),
      FIXTURE_GENERATED_AT
    );
    add("9H-G: small non-core exposure → no trim, On Track", !has(r, "trim") && cats(r) === "on_track", `categories=${cats(r)}`);
  }

  // 9H-H. Only SOL/WSOL → no Trim (SOL/WSOL are core).
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [solPosition(10)] }),
      FIXTURE_GENERATED_AT
    );
    add("9H-H: only SOL → no trim", !has(r, "trim"), `categories=${cats(r)}`);
  }

  // 9H-I. Only stablecoins → no Trim (stables are core).
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [stablePosition("USDC", 10000)] }),
      FIXTURE_GENERATED_AT
    );
    add("9H-I: only stablecoins → no trim", !has(r, "trim"), `categories=${cats(r)}`);
  }

  // 9H-J. Only deployed positions → no Trim (not liquid wallet tokens).
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [yieldPosition(5000, null)] }),
      FIXTURE_GENERATED_AT
    );
    add("9H-J: only deployed positions → no trim", !has(r, "trim"), `categories=${cats(r)}`);
  }

  // 9H-K. Unpriced non-core token → no Trim, no invented amount.
  {
    const unpriced: WalletPosition = {
      id: "unpriced-bonk",
      source: "wallet",
      type: "token",
      symbol: "BONK",
      name: "Bonk",
      amount: "1",
      uiAmount: 5000,
      decimals: 6,
      detection: "direct_wallet_balance",
      priceUsd: null,
      valueUsd: null,
    };
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [unpriced] }),
      FIXTURE_GENERATED_AT
    );
    add("9H-K: unpriced non-core token → no trim", !has(r, "trim"), `categories=${cats(r)}`);
  }

  // 9H-L. Partial pricing + priced non-core token → Trim + warning.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [nonCoreToken("BONK", 5000)], anyUnpriced: true }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9H-L: partial pricing + priced non-core token → trim + warning",
      has(r, "trim") && r.warnings.includes("partial_pricing"),
      `categories=${cats(r)} warnings=${r.warnings.join(",")}`
    );
  }

  // 9H-M. Mapper renders the trim card safely.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: smallTokens }),
      FIXTURE_GENERATED_AT
    );
    const s = trim(r);
    const card = s ? toSuggestionCard(s) : undefined;
    add(
      "9H-M: trim card maps safely (copy, amount, review-only, non-transactional)",
      card?.title === "Review Long-Tail Assets" &&
        card?.description ===
          "Some non-core wallet assets may deserve review because they make up a meaningful part of your portfolio." &&
        card?.impact_text.includes("Long-tail assets to review") === true &&
        card?.cta.label === "Review" &&
        card?.cta.executes_transaction === false &&
        card?.cta.action === null,
      `title="${card?.title}" impact="${card?.impact_text}"`
    );
  }

  // 9H-N. Trim output/copy contains no sell/buy/swap/bad/unsafe/illiquid-as-fact.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [nonCoreToken("BONK", 5000)] }),
      FIXTURE_GENERATED_AT
    );
    const s = trim(r);
    const card = s ? toSuggestionCard(s) : undefined;
    const text = `${card?.title} ${card?.description} ${card?.impact_text}`;
    const clean = !/\b(sell|buy|swap|bad|unsafe|illiquid)\b/i.test(text);
    add("9H-N: trim copy avoids sell/buy/swap/bad/unsafe/illiquid", clean, `clean=${clean}`);
  }

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 9I — guardrail standardization + honesty.
 * ------------------------------------------------------------------ */
const EXEC_CODES = ["cost_available", "liquidity_available", "slippage_available"] as const;

export function runGuardrailFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2);
  const dcaUnder = (points: number) => allocationFixture(15000, 60 - points, -points);
  const smallTokens = [nonCoreToken("AAA", 40), nonCoreToken("BBB", 40), nonCoreToken("CCC", 40), nonCoreToken("DDD", 40)];

  // One run that isolates each actionable category.
  const runs: Record<string, ReturnType<typeof runSuggestionEngine>> = {
    buffer: runSuggestionEngine(inputsFor({ safetyBuffer: bufferFixture(800, 1000, 3), positions: [cryptoPosition(100)] }), FIXTURE_GENERATED_AT),
    rebalance: runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: allocationFixture(15000, 75, 15), positions: [cryptoPosition(100)] }), FIXTURE_GENERATED_AT),
    capital_efficiency: runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [cryptoPosition(400)] }), FIXTURE_GENERATED_AT),
    trim: runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: smallTokens }), FIXTURE_GENERATED_AT),
    staking: runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT),
    stable_yield: runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT),
    dca: runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: dcaUnder(3), positions: [cryptoPosition(100)] }), FIXTURE_GENERATED_AT),
    position_optimization: runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [yieldPosition(5000, null)] }), FIXTURE_GENERATED_AT),
  };
  const find = (r: ReturnType<typeof runSuggestionEngine>, c: string) => r.suggestions.find((s) => s.category === c);
  const execStatuses = (s: { guardrails: { code: string; status: string }[] } | undefined) =>
    EXEC_CODES.map((code) => s?.guardrails.find((g) => g.code === code)?.status);

  // 9I-A. Every actionable category carries all three execution guardrails as not_evaluated.
  {
    const results = Object.entries(runs).map(([cat, r]) => {
      const st = execStatuses(find(r, cat));
      return { cat, ok: st.length === 3 && st.every((x) => x === "not_evaluated") };
    });
    add(
      "9I-A: every actionable category has cost/liquidity/slippage = not_evaluated",
      results.every((x) => x.ok),
      results.map((x) => `${x.cat}:${x.ok ? "ok" : "MISSING"}`).join(" ")
    );
  }

  // 9I-B. On Track's execution guardrails are not_applicable (not fake pass/fail).
  {
    const r = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [cryptoPosition(100)] }), FIXTURE_GENERATED_AT);
    const st = execStatuses(find(r, "on_track"));
    add(
      "9I-B: On Track execution guardrails are not_applicable",
      st.length === 3 && st.every((x) => x === "not_applicable"),
      `statuses=${st.join(",")}`
    );
  }

  // 9I-C. No suggestion marks any execution guardrail as passed.
  {
    const allSuggestions = [
      ...Object.values(runs).flatMap((r) => r.suggestions),
      ...runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [cryptoPosition(100)] }), FIXTURE_GENERATED_AT).suggestions,
    ];
    const anyPassed = allSuggestions.some((s) =>
      s.guardrails.some((g) => (EXEC_CODES as readonly string[]).includes(g.code) && g.status === "passed")
    );
    add("9I-C: no execution guardrail is ever 'passed' (no real quote data)", !anyPassed, `anyPassed=${anyPassed}`);
  }

  // 9I-D. Top Pick still works with not_evaluated execution guardrails.
  {
    const s = runs.buffer.suggestions[0];
    const execAllNotEval = execStatuses(s).every((x) => x === "not_evaluated");
    add(
      "9I-D: Top Pick works with not_evaluated execution guardrails",
      s?.is_top_pick === true && execAllNotEval,
      `topPick=${s?.is_top_pick} execNotEval=${execAllNotEval}`
    );
  }

  // 9I-E. Mapped card exposes no raw guardrail codes/statuses.
  {
    const card = toSuggestionCard(runs.buffer.suggestions[0]);
    const json = JSON.stringify(card);
    const leaks = /cost_available|liquidity_available|slippage_available|not_evaluated|guardrail/i.test(json);
    add("9I-E: mapped card exposes no raw guardrail codes", !leaks, `leaks=${leaks}`);
  }

  // 9I-F. Every mapped card is non-transactional.
  {
    const allOk = Object.values(runs).flatMap((r) => r.suggestions).map(toSuggestionCard).every(
      (c) =>
        c.cta.action === null &&
        c.cta.executes_transaction === false &&
        c.cta.requires_wallet_signature === false &&
        c.cta.completion_on_click === false
    );
    add("9I-F: all mapped cards are non-transactional", allOk, `allOk=${allOk}`);
  }

  // 9I-G. Guardrail helpers produce the expected status objects.
  {
    const p = passedGuardrail("min_trade_size");
    const f = failedGuardrail("min_trade_size", "below min");
    const w = warningGuardrail("liquidity_available", "thin");
    const ne = notEvaluatedGuardrail("cost_available");
    const na = notApplicableGuardrail("cost_available");
    const ensuredEmpty = ensureExecutionGuardrails([]);
    const ensuredKeep = ensureExecutionGuardrails([notApplicableGuardrail("cost_available")]);
    const keepCost = ensuredKeep.find((g) => g.code === "cost_available");
    add(
      "9I-G: guardrail helpers produce expected objects",
      p.status === "passed" &&
        f.status === "failed" && f.message === "below min" &&
        w.status === "warning" &&
        ne.status === "not_evaluated" &&
        na.status === "not_applicable" &&
        ensuredEmpty.length === 3 && ensuredEmpty.every((g) => g.status === "not_evaluated") &&
        ensuredKeep.length === 3 && keepCost?.status === "not_applicable",
      `ensuredEmpty=${ensuredEmpty.length} keepCost=${keepCost?.status}`
    );
  }

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 9J — protocol / platform selection contracts.
 * ------------------------------------------------------------------ */
export function runProtocolSelectionFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2);
  const dcaUnder = (points: number) => allocationFixture(15000, 60 - points, -points);
  const smallTokens = [nonCoreToken("AAA", 40), nonCoreToken("BBB", 40), nonCoreToken("CCC", 40), nonCoreToken("DDD", 40)];

  const runs: Record<string, ReturnType<typeof runSuggestionEngine>> = {
    buffer: runSuggestionEngine(inputsFor({ safetyBuffer: bufferFixture(800, 1000, 3), positions: [cryptoPosition(100)] }), FIXTURE_GENERATED_AT),
    rebalance: runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: allocationFixture(15000, 75, 15), positions: [cryptoPosition(100)] }), FIXTURE_GENERATED_AT),
    capital_efficiency: runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [cryptoPosition(400)] }), FIXTURE_GENERATED_AT),
    trim: runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: smallTokens }), FIXTURE_GENERATED_AT),
    staking: runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT),
    stable_yield: runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT),
    dca: runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: dcaUnder(3), positions: [cryptoPosition(100)] }), FIXTURE_GENERATED_AT),
    position_optimization: runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [yieldPosition(5000, null)] }), FIXTURE_GENERATED_AT),
    on_track: runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [cryptoPosition(100)] }), FIXTURE_GENERATED_AT),
  };
  const find = (r: ReturnType<typeof runSuggestionEngine>, c: string) => r.suggestions.find((s) => s.category === c);
  const gStatus = (s: EngineSuggestion | undefined, code: string) => s?.guardrails.find((g) => g.code === code)?.status;
  const noProtocol = (s: EngineSuggestion | undefined) =>
    s?.protocolSelection?.selectedProtocolId == null && s?.protocolSelection?.selectedProtocolName == null;

  // 9J-A. Staking selection is not_evaluated with no protocol named.
  {
    const s = find(runs.staking, "staking");
    add(
      "9J-A: staking protocolSelection = not_evaluated, no selected protocol",
      s?.protocolSelection?.status === "not_evaluated" && noProtocol(s),
      `status=${s?.protocolSelection?.status} reasons=${s?.protocolSelection?.reasons.join(",")}`
    );
  }
  // 9J-B. Stable Yield selection is not_evaluated with no protocol named.
  {
    const s = find(runs.stable_yield, "stable_yield");
    add(
      "9J-B: stable_yield protocolSelection = not_evaluated, no selected protocol",
      s?.protocolSelection?.status === "not_evaluated" && noProtocol(s),
      `status=${s?.protocolSelection?.status} reasons=${s?.protocolSelection?.reasons.join(",")}`
    );
  }
  // 9J-C. Position Optimization (review-only) selection is not_applicable.
  {
    const s = find(runs.position_optimization, "position_optimization");
    add(
      "9J-C: position_optimization protocolSelection = not_applicable, no selected protocol",
      s?.protocolSelection?.status === "not_applicable" && noProtocol(s),
      `status=${s?.protocolSelection?.status}`
    );
  }
  // 9J-D. Capital Efficiency / Trim / DCA / Rebalance invent no protocol selection.
  {
    const cats = ["capital_efficiency", "trim", "dca", "rebalance"];
    const results = cats.map((c) => {
      const s = find(runs[c], c);
      return { c, ok: s?.protocolSelection?.status === "not_applicable" && noProtocol(s) };
    });
    add(
      "9J-D: capital_efficiency/trim/dca/rebalance invent no protocol selection",
      results.every((x) => x.ok),
      results.map((x) => `${x.c}:${x.ok ? "ok" : "BAD"}`).join(" ")
    );
  }
  // 9J-E. No suggestion names a protocol unless status === "selected".
  {
    const all = Object.values(runs).flatMap((r) => r.suggestions);
    const bad = all.filter(
      (s) =>
        s.protocolSelection != null &&
        s.protocolSelection.status !== "selected" &&
        (s.protocolSelection.selectedProtocolName != null || s.protocolSelection.selectedProtocolId != null)
    );
    add("9J-E: no suggestion names a protocol unless status === selected", bad.length === 0, `violations=${bad.length}`);
  }
  // 9J-F. Mapped cards expose no raw protocol-selection metadata.
  {
    const cards = Object.values(runs).flatMap((r) => r.suggestions).map(toSuggestionCard);
    const json = JSON.stringify(cards);
    const leaks = /protocolSelection|selectedProtocol|protocol_selection|selection_not_required|missing_apy_data|missing_tvl_data|not_evaluated/i.test(json);
    add("9J-F: mapped cards expose no protocol-selection metadata", !leaks, `leaks=${leaks}`);
  }
  // 9J-G. protocol_selection guardrail is not_evaluated for staking/stable_yield.
  {
    const st = gStatus(find(runs.staking, "staking"), "protocol_selection");
    const sy = gStatus(find(runs.stable_yield, "stable_yield"), "protocol_selection");
    add(
      "9J-G: protocol_selection guardrail is not_evaluated for staking/stable_yield",
      st === "not_evaluated" && sy === "not_evaluated",
      `staking=${st} stable_yield=${sy}`
    );
  }
  // 9J-H. protocol_selection guardrail is not_applicable where selection is irrelevant.
  {
    const cats = ["buffer", "rebalance", "capital_efficiency", "trim", "dca", "position_optimization", "on_track"];
    const results = cats.map((c) => ({ c, ok: gStatus(find(runs[c], c), "protocol_selection") === "not_applicable" }));
    add(
      "9J-H: protocol_selection guardrail is not_applicable where selection is irrelevant",
      results.every((x) => x.ok),
      results.map((x) => `${x.c}:${x.ok ? "ok" : "BAD"}`).join(" ")
    );
  }
  // 9J-I. Helpers enforce the name-only-when-selected invariant (guards the
  // reserved `selected` path; README documents the data required before it).
  {
    const ne = notEvaluatedProtocolSelection(["missing_apy_data"]);
    const na = notApplicableProtocolSelection();
    const un = unavailableProtocolSelection(["no_eligible_protocol"]);
    const sel = selectedProtocolSelection({
      protocolId: "example",
      protocolName: "Example",
      strategyType: "staking",
      evaluatedAt: "2026-01-01T00:00:00Z",
      dataSources: ["example_source"],
    });
    add(
      "9J-I: helpers enforce name-only-when-selected invariant",
      ne.selectedProtocolName == null &&
        na.selectedProtocolName == null &&
        un.selectedProtocolName == null &&
        na.reasons[0] === "selection_not_required" &&
        sel.status === "selected" &&
        sel.selectedProtocolName === "Example",
      `ne=${ne.status} na=${na.status} un=${un.status} sel=${sel.status}`
    );
  }

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 10A — structured Suggestion Review Details.
 * ------------------------------------------------------------------ */
export function runReviewDetailsFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2);
  const dcaUnder = (points: number) => allocationFixture(15000, 60 - points, -points);
  const smallTokens = [nonCoreToken("AAA", 40), nonCoreToken("BBB", 40), nonCoreToken("CCC", 40), nonCoreToken("DDD", 40)];

  const runs: Record<string, ReturnType<typeof runSuggestionEngine>> = {
    buffer: runSuggestionEngine(inputsFor({ safetyBuffer: bufferFixture(800, 1000, 3), positions: [cryptoPosition(100)] }), FIXTURE_GENERATED_AT),
    rebalance: runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: allocationFixture(15000, 75, 15), positions: [cryptoPosition(100)] }), FIXTURE_GENERATED_AT),
    capital_efficiency: runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [cryptoPosition(400)] }), FIXTURE_GENERATED_AT),
    trim: runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: smallTokens }), FIXTURE_GENERATED_AT),
    staking: runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT),
    stable_yield: runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT),
    dca: runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: dcaUnder(3), positions: [cryptoPosition(100)] }), FIXTURE_GENERATED_AT),
    position_optimization: runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [yieldPosition(5000, null)] }), FIXTURE_GENERATED_AT),
    on_track: runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [cryptoPosition(100)] }), FIXTURE_GENERATED_AT),
  };
  const find = (c: string) => runs[c].suggestions.find((s) => s.category === c);
  const rd = (c: string) => find(c)?.reviewDetails;
  const metricLabels = (c: string) => (rd(c)?.metrics ?? []).map((m) => m.label);
  const allReviewDetails = Object.keys(runs).map((c) => rd(c)).filter((x): x is NonNullable<typeof x> => x != null);

  // 10A-A. Every emitted category carries reviewDetails.
  {
    const cats = ["buffer", "rebalance", "capital_efficiency", "trim", "staking", "stable_yield", "dca", "position_optimization", "on_track"];
    const missing = cats.filter((c) => rd(c) == null);
    add("10A-A: every emitted category has reviewDetails", missing.length === 0, `missing=${missing.join(",") || "none"}`);
  }
  // 10A-B. Rebalance details: allocation, target, amount, from/to, buffer protection.
  {
    const d = rd("rebalance");
    const labels = metricLabels("rebalance");
    const roles = (d?.involvedAssets ?? []).map((a) => a.role);
    const ok =
      labels.includes("Current crypto allocation") &&
      labels.includes("Target crypto allocation") &&
      labels.includes("Suggested review amount") &&
      roles.includes("source_asset") && roles.includes("target_bucket") &&
      (d?.guardrailSummary.checked ?? []).includes("Safety Buffer protection");
    add("10A-B: rebalance details include allocation/target/amount/from-to/buffer protection", ok, `roles=${roles.join(",")}`);
  }
  // 10A-C. Buffer details: target, stable value, shortfall, months covered, target months.
  {
    const labels = metricLabels("buffer");
    const ok = ["Stablecoin reserve", "Safety Buffer target", "Amount to review", "Months covered", "Target months"].every((l) => labels.includes(l));
    add("10A-C: buffer details include target/stable/shortfall/months/target months", ok, `labels=${labels.join(" | ")}`);
  }
  // 10A-D. Staking details: reserve, eligible SOL, eligible value, protocol not evaluated.
  {
    const d = rd("staking");
    const labels = metricLabels("staking");
    const ok =
      labels.includes("SOL reserve kept") &&
      labels.includes("Eligible SOL to review") &&
      labels.includes("Eligible value to review") &&
      (d?.guardrailSummary.notEvaluated ?? []).includes("Protocol selection");
    add("10A-D: staking details include reserve/eligible SOL/value + protocol not evaluated", ok, `notEval=${d?.guardrailSummary.notEvaluated.join(",")}`);
  }
  // 10A-E. Stable Yield details: liquid stable value, buffer-support note, protocol not evaluated.
  {
    const d = rd("stable_yield");
    const ok =
      metricLabels("stable_yield").includes("Liquid stablecoins to review") &&
      (d?.summary.reason ?? "").includes("Safety Buffer") &&
      (d?.guardrailSummary.notEvaluated ?? []).includes("Protocol selection");
    add("10A-E: stable_yield details include liquid value/buffer note/protocol not evaluated", ok, `reason="${d?.summary.reason}"`);
  }
  // 10A-F. DCA details: contribution, gap, suggested amount, no token selected.
  {
    const d = rd("dca");
    const labels = metricLabels("dca");
    const ok =
      labels.includes("Planned monthly contribution") &&
      labels.includes("Crypto target gap") &&
      labels.includes("Suggested contribution to review") &&
      (d?.guardrailSummary.notEvaluated ?? []).includes("Token selection");
    add("10A-F: dca details include contribution/gap/suggested + no token selected", ok, `notEval=${d?.guardrailSummary.notEvaluated.join(",")}`);
  }
  // 10A-G. Trim details: trigger reason; never claims liquidity was evaluated.
  {
    const d = rd("trim");
    const gs = d?.guardrailSummary;
    const ok =
      (d?.summary.reason ?? "").startsWith("Flagged for review:") &&
      (gs?.notEvaluated ?? []).includes("Liquidity depth") &&
      !(gs?.checked ?? []).includes("Liquidity depth");
    add("10A-G: trim details include trigger reason and never claim liquidity evaluated", ok, `reason="${d?.summary.reason}"`);
  }
  // 10A-H. Position Optimization: flagged value, triggered reasons, no replacement protocol.
  {
    const d = rd("position_optimization");
    const ok =
      metricLabels("position_optimization").includes("Positions to review") &&
      (d?.summary.reason ?? "").startsWith("Flagged for review:") &&
      (d?.involvedPositions.length ?? 0) > 0 &&
      (d?.guardrailSummary.notApplicable ?? []).includes("Protocol selection");
    add("10A-H: position_optimization details include flagged value/reasons + no replacement protocol", ok, `notApplicable=${d?.guardrailSummary.notApplicable.join(",")}`);
  }
  // 10A-I. On Track is informational: no transaction/safety-action language, no limitations.
  {
    const d = rd("on_track");
    const kinds = (d?.safetyNotes ?? []).map((n) => n.kind);
    const text = JSON.stringify(d?.safetyNotes ?? []).toLowerCase();
    const ok =
      (d?.limitations.length ?? 1) === 0 &&
      kinds.every((k) => k === "informational" || k === "no_action") &&
      !/transaction|signature|stake|swap/.test(text);
    add("10A-I: on_track details are informational with no action language", ok, `kinds=${kinds.join(",")} lims=${d?.limitations.length}`);
  }
  // 10A-J. No reviewDetails contains forbidden language.
  {
    const forbidden = ["guaranteed", "optimal", "best", "you should", "we will move", "we will stake", "we will buy", "automatic", "risk-free", "sell", "buy", "swap", "execute", "bad", "unsafe", "highest apy", "safest protocol"];
    const json = JSON.stringify(allReviewDetails).toLowerCase();
    const hits = forbidden.filter((w) => json.includes(w));
    add("10A-J: reviewDetails contain no forbidden language", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }
  // 10A-K. No raw internal guardrail codes leak into reviewDetails.
  {
    const codes = ["cost_available", "liquidity_available", "slippage_available", "protocol_selection", "min_trade_size", "buffer_protection", "pricing_available", "allocation_delta", "idle_asset_threshold", "token_scope", "contribution_available", "allocation_gap", "token_selection", "sol_fee_reserve", "position_value_threshold", "apy_data_review", "concentration_review"];
    const json = JSON.stringify(allReviewDetails);
    const leaks = codes.filter((c) => json.includes(c));
    add("10A-K: reviewDetails expose no raw guardrail codes", leaks.length === 0, `leaks=${leaks.join(",") || "none"}`);
  }
  // 10A-L. Mapped cards are unchanged and never expose reviewDetails.
  {
    const cards = Object.values(runs).flatMap((r) => r.suggestions).map(toSuggestionCard);
    const json = JSON.stringify(cards);
    const leaks = /reviewDetails|involvedAssets|involvedPositions|guardrailSummary|safetyNotes|limitations|calculations/i.test(json);
    const shapeOk = cards.every((c) => typeof c.id === "string" && typeof c.title === "string" && c.cta != null);
    add("10A-L: mapped cards unchanged and do not expose reviewDetails", !leaks && shapeOk, `leaks=${leaks} shapeOk=${shapeOk}`);
  }
  // 10A-M. Nothing invents APY/TVL/liquidity/slippage/route/cost/protocol in reviewDetails.
  {
    const anyChecked = allReviewDetails.some((d) =>
      ["Route cost", "Liquidity depth", "Slippage"].some((l) => d.guardrailSummary.checked.includes(l))
    );
    const anyApyTvlMetric = allReviewDetails.some((d) =>
      d.metrics.some((m) => /\bAPY\b|\bTVL\b/i.test(m.label))
    );
    add(
      "10A-M: no invented APY/TVL/liquidity/slippage/route/cost/protocol in reviewDetails",
      !anyChecked && !anyApyTvlMetric,
      `execChecked=${anyChecked} apyTvlMetric=${anyApyTvlMetric}`
    );
  }

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 10B — Review Details modal (data-path checks; DOM verified in-browser).
 * ------------------------------------------------------------------ */
export function runReviewModalFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const run = runSuggestionEngine(
    inputsFor({
      safetyBuffer: bufferFixture(5000, 1000, 3),
      allocation: allocationFixture(15000, 75, 15),
      positions: [cryptoPosition(100)],
    }),
    FIXTURE_GENERATED_AT
  );
  // Reproduce exactly what the rail hook builds: id → reviewDetails.
  const reviewDetailsById: Record<string, NonNullable<EngineSuggestion["reviewDetails"]>> = {};
  for (const s of run.suggestions) if (s.reviewDetails) reviewDetailsById[s.id] = s.reviewDetails;
  const cards = toSuggestionCards(run.suggestions);
  const rebalance = run.suggestions.find((s) => s.category === "rebalance");
  const rd = rebalance?.reviewDetails;

  // 10B-A. Every card id maps to review details.
  {
    const missing = cards.filter((c) => reviewDetailsById[c.id] == null).map((c) => c.id);
    add("10B-A: rail maps every card id to reviewDetails", missing.length === 0, `missing=${missing.join(",") || "none"}`);
  }
  // 10B-B. Rebalance modal has all renderable sections populated.
  {
    const ok =
      !!rd &&
      rd.summary.title.length > 0 &&
      rd.metrics.length > 0 &&
      (rd.guardrailSummary.checked.length + rd.guardrailSummary.notEvaluated.length + rd.guardrailSummary.notApplicable.length) > 0 &&
      rd.limitations.length > 0 &&
      rd.safetyNotes.length > 0;
    add("10B-B: rebalance modal renders summary/metrics/guardrails/limitations/safety", ok, `metrics=${rd?.metrics.length} lims=${rd?.limitations.length} notes=${rd?.safetyNotes.length}`);
  }
  // 10B-C. Modal data exposes no raw guardrail codes.
  {
    const codes = ["cost_available", "liquidity_available", "slippage_available", "protocol_selection", "min_trade_size", "buffer_protection", "pricing_available", "allocation_delta"];
    const json = JSON.stringify(rd);
    const leaks = codes.filter((c) => json.includes(c));
    add("10B-C: modal data exposes no raw guardrail codes", leaks.length === 0, `leaks=${leaks.join(",") || "none"}`);
  }
  // 10B-D. Modal data contains no forbidden language.
  {
    const forbidden = ["guaranteed", "optimal", "best", "you should", "we will move", "we will stake", "we will buy", "automatic", "risk-free", "sell", "buy", "swap", "execute", "bad", "unsafe", "highest apy", "safest protocol"];
    const json = JSON.stringify(rd).toLowerCase();
    const hits = forbidden.filter((w) => json.includes(w));
    add("10B-D: modal data contains no forbidden language", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }
  // 10B-E. The card CTA behind the modal stays non-transactional.
  {
    const c = cards.find((x) => x.id === rebalance?.id);
    const ok =
      !!c &&
      c.cta.action === null &&
      c.cta.executes_transaction === false &&
      c.cta.requires_wallet_signature === false &&
      c.cta.completion_on_click === false;
    add("10B-E: review CTA remains non-transactional", ok, `action=${c?.cta.action}`);
  }
  // 10B-F. Real-wallet review data never carries demo ids (isolation).
  {
    const demoIds = Object.keys(reviewDetailsById).filter((id) => id.startsWith("demo_"));
    add("10B-F: real-wallet review data has no demo ids", demoIds.length === 0, `demoIds=${demoIds.join(",") || "none"}`);
  }

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 10C — asset/position-specific review-detail refinements.
 * ------------------------------------------------------------------ */
export function runReviewRefinementFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const rd = (r: ReturnType<typeof runSuggestionEngine>, c: string) =>
    r.suggestions.find((s) => s.category === c)?.reviewDetails;

  const rebalanceOver = runSuggestionEngine(
    inputsFor({ safetyBuffer: bufferFixture(5000, 1000, 3), allocation: allocationFixture(15000, 75, 15), positions: [cryptoPosition(100)] }),
    FIXTURE_GENERATED_AT
  );
  const rebalanceUnder = runSuggestionEngine(
    inputsFor({ safetyBuffer: bufferFixture(5000, 1000, 3), allocation: allocationFixture(15000, 20, -40), positions: [cryptoPosition(100)] }),
    FIXTURE_GENERATED_AT
  );
  const posOptConc = runSuggestionEngine(
    inputsFor({ safetyBuffer: bufferFixture(5000, 1000, 3), totalUsd: 5000, allocation: allocationFixture(5000, 62, 2), positions: [yieldPosition(5000, 3)] }),
    FIXTURE_GENERATED_AT
  );
  const stableYield = runSuggestionEngine(
    inputsFor({ safetyBuffer: bufferFixture(5000, 1000, 3), allocation: allocationFixture(15000, 62, 2), positions: [stablePosition("USDC", 10000)] }),
    FIXTURE_GENERATED_AT
  );

  // 10C-A. Rebalance source/target buckets carry concrete USD values.
  {
    const assets = rd(rebalanceOver, "rebalance")?.involvedAssets ?? [];
    const ok =
      assets.length === 2 &&
      assets.every((a) => typeof a.valueUsd === "number") &&
      assets.some((a) => a.role === "source_asset") &&
      assets.some((a) => a.role === "target_bucket");
    add("10C-A: rebalance buckets show source/target with concrete USD", ok, assets.map((a) => `${a.role}:${a.valueUsd}`).join(" "));
  }
  // 10C-B. Position Optimization shows a protocol label + concentration share.
  {
    const p0 = rd(posOptConc, "position_optimization")?.involvedPositions[0];
    const ok = !!p0 && typeof p0.protocol === "string" && p0.protocol.length > 0 && /% of portfolio/.test(p0.reason ?? "");
    add("10C-B: position optimization shows protocol + concentration share", ok, `protocol=${p0?.protocol} reason="${p0?.reason}"`);
  }
  // 10C-C. Stable Yield surfaces the funded Safety Buffer reserve as a metric.
  {
    const metrics = rd(stableYield, "stable_yield")?.metrics ?? [];
    add("10C-C: stable yield shows Safety Buffer reserve metric", metrics.some((m) => m.label === "Safety Buffer reserve"), metrics.map((m) => m.label).join(" | "));
  }
  // 10C-D. Refined details still leak no raw codes and no forbidden language.
  {
    const all = [rd(rebalanceOver, "rebalance"), rd(rebalanceUnder, "rebalance"), rd(posOptConc, "position_optimization"), rd(stableYield, "stable_yield")];
    const json = JSON.stringify(all);
    const codes = ["cost_available", "liquidity_available", "slippage_available", "protocol_selection", "min_trade_size", "buffer_protection", "allocation_delta", "position_value_threshold", "concentration_review", "apy_data_review"];
    const forbidden = ["guaranteed", "optimal", "best", "you should", "we will move", "we will stake", "we will buy", "automatic", "risk-free", "sell", "buy", "swap", "execute", "bad", "unsafe", "highest apy", "safest protocol"];
    const codeLeaks = codes.filter((c) => json.includes(c));
    const wordHits = forbidden.filter((w) => json.toLowerCase().includes(w));
    add("10C-D: refined details leak no codes and no forbidden language", codeLeaks.length === 0 && wordHits.length === 0, `codes=${codeLeaks.join(",") || "none"} words=${wordHits.join(",") || "none"}`);
  }
  // 10C-E. Underweight rebalance shows a concrete "Safety Buffer protected" calc.
  {
    const calcs = rd(rebalanceUnder, "rebalance")?.calculations ?? [];
    const bufferCalc = calcs.find((c) => c.label === "Safety Buffer protected");
    add("10C-E: underweight rebalance shows Safety Buffer protected calc", !!bufferCalc && typeof bufferCalc.difference === "number", `difference=${bufferCalc?.difference}`);
  }

  return checks;
}

/* ------------------------------------------------------------------ *
 * Final smoke test — deterministic SIMULATED wallet states (A–F).
 * These use clearly-named fixture helpers only (dev/test path); they never
 * touch the live real-wallet rendering path and are never shown as real values.
 * ------------------------------------------------------------------ */
export function runFinalSmokeFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2);
  const dcaUnder = (pts: number) => allocationFixture(15000, 60 - pts, -pts);
  const cats = (r: ReturnType<typeof runSuggestionEngine>) => r.suggestions.map((s) => s.category).join(",");
  const topPickCat = (r: ReturnType<typeof runSuggestionEngine>) => r.suggestions.find((s) => s.is_top_pick)?.category;
  const topPickCount = (r: ReturnType<typeof runSuggestionEngine>) => r.suggestions.filter((s) => s.is_top_pick).length;

  // A. Buffer underfunded → Safety Buffer only, Top Pick, modal-openable.
  {
    const r = runSuggestionEngine(inputsFor({ safetyBuffer: bufferFixture(800, 1000, 3), positions: [cryptoPosition(100)] }), FIXTURE_GENERATED_AT);
    add(
      "SMOKE-A: buffer underfunded → buffer only, Top Pick, modal-openable",
      cats(r) === "buffer" && topPickCat(r) === "buffer" && r.suggestions[0]?.reviewDetails != null,
      `categories=${cats(r)} top=${topPickCat(r)}`
    );
  }
  // B. Rebalance + Position Optimization → rebalance first & Top Pick.
  {
    const r = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: allocationFixture(15000, 75, 15), positions: [yieldPosition(5000, null)] }), FIXTURE_GENERATED_AT);
    const reb = r.suggestions.find((s) => s.category === "rebalance");
    const po = r.suggestions.find((s) => s.category === "position_optimization");
    add(
      "SMOKE-B: rebalance first & Top Pick, position optimization later, both modal-openable",
      cats(r) === "rebalance,position_optimization" &&
        topPickCat(r) === "rebalance" &&
        (reb?.reviewDetails?.involvedAssets.length ?? 0) > 0 &&
        (po?.reviewDetails?.involvedPositions.length ?? 0) > 0,
      `categories=${cats(r)} top=${topPickCat(r)}`
    );
  }
  // C. Six categories fire → engine order preserved, capEff Top Pick, no UI sorting.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: dcaUnder(3),
        positions: [cryptoPosition(400), nonCoreToken("AAA", 40), nonCoreToken("BBB", 40), nonCoreToken("CCC", 40), solPosition(10), stablePosition("USDC", 10000), yieldPosition(3000, null)],
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "SMOKE-C: six categories in engine order, capEff Top Pick, one Top Pick, all modal-openable",
      cats(r) === "capital_efficiency,trim,staking,stable_yield,dca,position_optimization" &&
        topPickCat(r) === "capital_efficiency" &&
        topPickCount(r) === 1 &&
        r.suggestions.every((s) => s.reviewDetails != null),
      `categories=${cats(r)} top=${topPickCat(r)} tpCount=${topPickCount(r)}`
    );
  }
  // D. On Track only → no Top Pick, no CTA (no modal).
  {
    const r = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [cryptoPosition(100)] }), FIXTURE_GENERATED_AT);
    const card = toSuggestionCard(r.suggestions[0]);
    add(
      "SMOKE-D: On Track only, no Top Pick, no CTA (no modal)",
      cats(r) === "on_track" && topPickCount(r) === 0 && card.cta.label === "" && card.cta.action === null,
      `categories=${cats(r)} tp=${topPickCount(r)} cta="${card.cta.label}"`
    );
  }
  // E. Partial pricing → warning appears and calculable suggestions still render.
  {
    const r = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), anyUnpriced: true, positions: [cryptoPosition(400)] }), FIXTURE_GENERATED_AT);
    add(
      "SMOKE-E: partial pricing → partial_pricing warning + suggestions still render",
      r.warnings.includes("partial_pricing") && r.suggestions.length > 0,
      `warnings=${r.warnings.join(",")} count=${r.suggestions.length}`
    );
  }
  // F. Missing data → unavailable state, no suggestions (no demo fallback).
  {
    const r = runSuggestionEngine(inputsFor({ safetyBuffer: null, positions: [cryptoPosition(100)] }), FIXTURE_GENERATED_AT);
    add(
      "SMOKE-F: missing data → unavailable_reason=missing_data, no suggestions",
      r.suggestions.length === 0 && r.unavailable_reason === "missing_data",
      `count=${r.suggestions.length} reason=${r.unavailable_reason}`
    );
  }

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 12A — duplicate_exposure inside Position Optimization.
 * ------------------------------------------------------------------ */
export function runDuplicateExposureFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const run = (positions: WalletPosition[], total: number) =>
    runSuggestionEngine(
      inputsFor({ safetyBuffer: bufferFixture(5000, 1000, 3), totalUsd: total, allocation: allocationFixture(total, 62, 2), positions }),
      FIXTURE_GENERATED_AT
    );
  const cats = (r: ReturnType<typeof runSuggestionEngine>) => r.suggestions.map((s) => s.category).join(",");
  const posOpt = (r: ReturnType<typeof runSuggestionEngine>) => r.suggestions.find((s) => s.category === "position_optimization");
  const hasReason = (r: ReturnType<typeof runSuggestionEngine>, code: string) =>
    r.suggestions.some((s) => (s.reason_codes as string[]).includes(code));
  const lst = (symbol: string, valueUsd: number, apy: number | null = 5) => yieldPosition(valueUsd, apy, { type: "lst", symbol });
  const stake = (valueUsd: number, apy: number | null = 5) => yieldPosition(valueUsd, apy, { type: "stake", symbol: "SOL" });
  const stableProto = (symbol: string, valueUsd: number) => yieldPosition(valueUsd, 5, { type: "protocol", symbol, source: "kamino" });

  // 12A-A. Two SOL LSTs above thresholds → duplicate_exposure.
  {
    const r = run([lst("JupSOL", 200), lst("mSOL", 200)], 5000);
    add("12A-A: two SOL LSTs → position_optimization with duplicate_exposure",
      cats(r).includes("position_optimization") && hasReason(r, "duplicate_exposure"),
      `categories=${cats(r)} reasons=${posOpt(r)?.reason_codes.join(",")}`);
  }
  // 12A-B. JupSOL + mSOL + native stake → one card, grouped as SOL exposure.
  {
    const r = run([lst("JupSOL", 200), lst("mSOL", 200), stake(200)], 5000);
    const d = posOpt(r);
    const solCalc = d?.reviewDetails?.calculations.some((c) => c.label.startsWith("SOL exposure"));
    add("12A-B: JupSOL + mSOL + native stake → one card, 3 positions, SOL exposure group",
      r.suggestions.filter((s) => s.category === "position_optimization").length === 1 &&
        hasReason(r, "duplicate_exposure") &&
        (d?.reviewDetails?.involvedPositions.length ?? 0) === 3 &&
        solCalc === true,
      `count=${d?.reviewDetails?.involvedPositions.length} solCalc=${solCalc}`);
  }
  // 12A-C. Two deployed stable positions → duplicate_exposure, Stablecoin exposure.
  {
    const r = run([stableProto("USDC", 200), stableProto("USDT", 200)], 5000);
    const d = posOpt(r);
    const stableCalc = d?.reviewDetails?.calculations.some((c) => c.label.startsWith("Stablecoin exposure"));
    add("12A-C: two deployed stable positions → duplicate_exposure (Stablecoin exposure)",
      hasReason(r, "duplicate_exposure") && stableCalc === true,
      `reasons=${d?.reason_codes.join(",")} stableCalc=${stableCalc}`);
  }
  // 12A-D. Only one deployed position → no duplicate; no other reason → On Track.
  {
    const r = run([lst("JupSOL", 200)], 5000);
    add("12A-D: one deployed position → no duplicate, On Track", cats(r) === "on_track" && !hasReason(r, "duplicate_exposure"), `categories=${cats(r)}`);
  }
  // 12A-E. Combined below $250 → no duplicate.
  {
    const r = run([lst("JupSOL", 100), lst("mSOL", 100)], 5000);
    add("12A-E: duplicate group < $250 → no duplicate_exposure", !hasReason(r, "duplicate_exposure"), `categories=${cats(r)}`);
  }
  // 12A-F. Share below 5% → no duplicate.
  {
    const r = run([lst("JupSOL", 200), lst("mSOL", 200)], 20000);
    add("12A-F: duplicate group < 5% share → no duplicate_exposure", !hasReason(r, "duplicate_exposure"), `categories=${cats(r)}`);
  }
  // 12A-G. One candidate below $50 is ignored → no duplicate (only one remains).
  {
    const r = run([lst("JupSOL", 300), lst("mSOL", 40)], 5000);
    add("12A-G: sub-$50 duplicate candidate ignored → no duplicate_exposure", !hasReason(r, "duplicate_exposure"), `categories=${cats(r)}`);
  }
  // 12A-H. Unpriced duplicate-like positions → no duplicate, no invented value.
  {
    const r = run([yieldPosition(200, 5, { type: "lst", symbol: "JupSOL", priced: false }), yieldPosition(200, 5, { type: "lst", symbol: "mSOL", priced: false })], 5000);
    add("12A-H: unpriced duplicate-like positions → no duplicate_exposure", !hasReason(r, "duplicate_exposure"), `categories=${cats(r)}`);
  }
  // 12A-I. Liquid wallet SOL + USDC only → no duplicate, no position_optimization.
  {
    const r = run([solPosition(5), stablePosition("USDC", 5000)], 10000);
    add("12A-I: liquid SOL + USDC only → no duplicate, no position_optimization",
      !hasReason(r, "duplicate_exposure") && !hasReason(r, "position_optimization") && !cats(r).includes("position_optimization"),
      `categories=${cats(r)}`);
  }
  // 12A-J. Duplicate + concentration on same group → both reasons, value deduped.
  {
    const r = run([lst("JupSOL", 1200), lst("mSOL", 200)], 2000);
    const d = posOpt(r);
    add("12A-J: duplicate + concentration → both reasons, flagged value deduped ($1,400)",
      hasReason(r, "concentration_risk") && hasReason(r, "duplicate_exposure") && Math.round(d?.amount?.valueUsd ?? 0) === 1400,
      `reasons=${d?.reason_codes.join(",")} flagged=${d?.amount?.valueUsd}`);
  }
  // 12A-K. Duplicate + missing_apy → both reasons, no double-counting ($600).
  {
    const r = run([lst("JupSOL", 300, null), lst("mSOL", 300)], 5000);
    const d = posOpt(r);
    add("12A-K: duplicate + missing_apy → both reasons, flagged value deduped ($600)",
      hasReason(r, "missing_apy_data") && hasReason(r, "duplicate_exposure") && Math.round(d?.amount?.valueUsd ?? 0) === 600,
      `reasons=${d?.reason_codes.join(",")} flagged=${d?.amount?.valueUsd}`);
  }
  // 12A-L. Review details include group label, count, combined value, positions.
  {
    const r = run([lst("JupSOL", 300), lst("mSOL", 300), stake(300)], 5000);
    const d = posOpt(r)?.reviewDetails;
    const labels = (d?.metrics ?? []).map((m) => m.label);
    add("12A-L: review details include duplicate group label/count/value/positions",
      (d?.calculations ?? []).some((c) => c.label.startsWith("SOL exposure")) &&
        labels.includes("Positions with similar exposure") &&
        labels.includes("Similar-exposure value") &&
        (d?.involvedPositions.length ?? 0) === 3,
      `labels=${labels.join(" | ")}`);
  }
  // 12A-M. Mapped card + review details contain no sell/buy/swap/bad/unsafe language.
  {
    const r = run([lst("JupSOL", 1200), lst("mSOL", 300)], 2500);
    const s = posOpt(r);
    const json = (JSON.stringify(toSuggestionCard(s!)) + JSON.stringify(s?.reviewDetails)).toLowerCase();
    const hits = ["sell", "buy", "swap", "unwind", "\\bbad\\b", "unsafe"].filter((w) => new RegExp(w).test(json));
    add("12A-M: card + review details use no sell/buy/swap/bad/unsafe language", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }
  // 12A-N. No raw internal guardrail/exposure codes leak into card/review details.
  {
    const r = run([lst("JupSOL", 300), lst("mSOL", 300)], 5000);
    const s = posOpt(r);
    // Raw guardrail codes and exposure GROUP KEYS must be mapped to friendly
    // labels, never surfaced. (ReviewPosition.role is structural display metadata
    // rendered via a label map — like every other role — so it is not a "code".)
    const json = JSON.stringify(toSuggestionCard(s!)) + JSON.stringify(s?.reviewDetails?.guardrailSummary) + JSON.stringify(s?.reviewDetails?.calculations) + JSON.stringify(s?.reviewDetails?.metrics);
    const codes = ["exposure_grouping", "concentration_review", "SOL_EXPOSURE", "STABLE_EXPOSURE", "TOKEN:"];
    const leaks = codes.filter((c) => json.includes(c));
    add("12A-N: no raw guardrail/exposure codes leak to card/modal", leaks.length === 0, `leaks=${leaks.join(",") || "none"}`);
  }

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 12C — static protocol registry + candidate metadata (NO selection).
 * ------------------------------------------------------------------ */
export function runProtocolRegistryFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2);
  const stakingRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stableRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT);
  const staking = stakingRun.suggestions.find((s) => s.category === "staking");
  const stable = stableRun.suggestions.find((s) => s.category === "stable_yield");

  // 12C-A. Registry has the SOL liquid-staking candidate IDs.
  {
    const ids = getProtocolCandidatesForStrategy("liquid_staking").map((c) => c.id);
    const expected = ["jupiter", "marinade", "jito", "blazestake", "sanctum"];
    add("12C-A: registry contains SOL liquid-staking candidate IDs", expected.every((e) => ids.includes(e)), `ids=${ids.join(",")}`);
  }
  // 12C-B. Kamino is a stable-yield candidate for USDC.
  {
    const ids = getProtocolCandidatesForSelection("lending", "USDC").map((c) => c.id);
    add("12C-B: Kamino is a stable-yield (lending) candidate for USDC", ids.includes("kamino"), `ids=${ids.join(",")}`);
  }
  // 12C-C. Registry entries carry NO dynamic value fields (apy/tvl/risk/fee/lockup/liquidity/score/rank/selected).
  {
    const allowed = new Set(["id", "name", "chain", "strategyTypes", "supportedAssets", "supportedMints", "manageUrl", "status", "notes", "dataAdaptersNeeded"]);
    const badKeys = PROTOCOL_REGISTRY.flatMap((e) => Object.keys(e).filter((k) => !allowed.has(k)));
    add("12C-C: registry entries contain no apy/tvl/risk/fee/lockup/liquidity/score/rank/selected fields", badKeys.length === 0, `badKeys=${badKeys.join(",") || "none"}`);
  }
  // 12C-D. getProtocolCandidatesForStrategy returns static registry order (no scoring/sorting).
  {
    const got = getProtocolCandidatesForStrategy("liquid_staking").map((c) => c.id);
    const registryOrder = PROTOCOL_REGISTRY.filter((p) => p.strategyTypes.includes("liquid_staking")).map((c) => c.id);
    add("12C-D: candidates returned in static registry order (not scored)", JSON.stringify(got) === JSON.stringify(registryOrder), `got=${got.join(",")}`);
  }
  // 12C-E. getProtocolCandidatesForAsset("SOL","liquid_staking") returns the SOL staking candidates.
  {
    const ids = getProtocolCandidatesForAsset("SOL", "liquid_staking").map((c) => c.id);
    add("12C-E: getProtocolCandidatesForAsset(SOL, liquid_staking) returns SOL staking candidates", ids.length === 5 && ids.includes("jupiter") && ids.includes("sanctum"), `ids=${ids.join(",")}`);
  }
  // 12C-F. Staking suggestion carries candidateProtocolIds but status stays not_evaluated.
  {
    const ps = staking?.protocolSelection;
    add("12C-F: staking has candidateProtocolIds + protocolSelection.status not_evaluated",
      (ps?.candidateProtocolIds?.length ?? 0) > 0 && ps?.status === "not_evaluated",
      `status=${ps?.status} candidates=${ps?.candidateProtocolIds?.join(",")}`);
  }
  // 12C-G. Stable Yield suggestion carries candidateProtocolIds but status stays not_evaluated.
  {
    const ps = stable?.protocolSelection;
    add("12C-G: stable_yield has candidateProtocolIds + status not_evaluated",
      (ps?.candidateProtocolIds?.length ?? 0) > 0 && ps?.candidateProtocolIds?.includes("kamino") === true && ps?.status === "not_evaluated",
      `status=${ps?.status} candidates=${ps?.candidateProtocolIds?.join(",")}`);
  }
  // 12C-H. No suggestion names a selected protocol.
  {
    const all = [...stakingRun.suggestions, ...stableRun.suggestions];
    const bad = all.filter((s) => s.protocolSelection?.selectedProtocolId != null || s.protocolSelection?.selectedProtocolName != null);
    add("12C-H: no suggestion has selectedProtocolId/Name", bad.length === 0, `violations=${bad.length}`);
  }
  // 12C-I. protocol_selection guardrail remains not_evaluated for staking/stable_yield.
  {
    const g = (s: typeof staking, code: string) => s?.guardrails.find((x) => x.code === code)?.status;
    add("12C-I: protocol_selection guardrail is not_evaluated for staking/stable_yield",
      g(staking, "protocol_selection") === "not_evaluated" && g(stable, "protocol_selection") === "not_evaluated",
      `staking=${g(staking, "protocol_selection")} stable=${g(stable, "protocol_selection")}`);
  }
  // 12C-J. Cards + review details do NOT expose candidate protocol names as recommendations.
  {
    const names = ["Jupiter", "Marinade", "Jito", "BlazeStake", "Sanctum", "Kamino", "Orca", "Raydium", "Meteora"];
    const scan = (s: typeof staking) => JSON.stringify(toSuggestionCard(s!)) + JSON.stringify(s?.reviewDetails);
    const json = (scan(staking) + scan(stable));
    const leaks = names.filter((n) => json.includes(n));
    add("12C-J: staking/stable_yield cards + modal never expose candidate protocol names", leaks.length === 0, `leaks=${leaks.join(",") || "none"}`);
  }
  // 12C-K. Adapter contracts exist but nothing is selected; registry stays candidate-only.
  {
    const allCandidateOnly = PROTOCOL_REGISTRY.every((e) => e.status === "candidate_only");
    add("12C-K: protocol selection NOT implemented; registry is candidate-only",
      PROTOCOL_SELECTION_IMPLEMENTED === false && allCandidateOnly && getProtocolCandidateById("jupiter")?.status === "candidate_only",
      `implemented=${PROTOCOL_SELECTION_IMPLEMENTED} candidateOnly=${allCandidateOnly}`);
  }
  // 12C-L. Explicit "selection not implemented yet" marker (docs reference it).
  {
    add("12C-L: PROTOCOL_SELECTION_IMPLEMENTED marker is false (selection not implemented)", PROTOCOL_SELECTION_IMPLEMENTED === false, `flag=${PROTOCOL_SELECTION_IMPLEMENTED}`);
  }

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 12D — read-only protocol data adapters (collection only, NO selection).
 * All checks are network-free (mocks/stubs). Adapters are NOT wired into the
 * engine, so suggestions are unchanged.
 * ------------------------------------------------------------------ */
export function runProtocolAdapterFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2);
  const stakingRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stableRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT);
  const staking = stakingRun.suggestions.find((s) => s.category === "staking");
  const stable = stableRun.suggestions.find((s) => s.category === "stable_yield");
  const candidateIds = ["jupiter", "marinade", "jito", "blazestake", "sanctum"];

  // 12D-A. Missing market data uses NO zero-placeholders; unknown fields absent.
  {
    const md = missingMarketData("jupiter", "liquid_staking", "SOL");
    const ok =
      md.apy === undefined && md.tvlUsd === undefined && md.liquidityUsd === undefined &&
      md.withdrawalTimeHours === undefined && md.fees === undefined &&
      md.confidence === "missing" && md.missingFields.length > 0;
    add("12D-A: ProtocolMarketData uses no fake-zero values for unknown fields", ok, `apy=${md.apy} tvl=${md.tvlUsd} confidence=${md.confidence}`);
  }
  // 12D-B. Risk registry contains NO made-up riskScore.
  {
    const anyScore = [...candidateIds, "kamino"].some((id) => getProtocolRiskData(id).riskScore !== undefined);
    add("12D-B: risk registry contains no invented riskScore", !anyScore, `anyScore=${anyScore}`);
  }
  // 12D-C. Unknown audit/safety/withdrawal fields remain unknown/absent.
  {
    const r = getProtocolRiskData("jupiter");
    add("12D-C: unknown audit/safety/withdrawal fields stay unknown/absent",
      r.auditStatus === "unknown" && r.safetyBufferEligible === undefined && r.withdrawalClass === "unknown",
      `audit=${r.auditStatus} bufferEligible=${r.safetyBufferEligible} withdrawal=${r.withdrawalClass}`);
  }
  // 12D-D. DefiLlama mapping never fuzzy-matches; unverified stay undefined and
  // every present mapping is an exact verified pool UUID (not a name guess).
  {
    const noFuzzy = resolveDefiLlamaMapping("jupiter", "SOL") === undefined && resolveDefiLlamaMapping("kamino", "USDC") === undefined;
    const allExact = Object.values(DEFILLAMA_POOL_MAPPINGS).every((m) => typeof m.poolId === "string" && m.poolId.length >= 8);
    add("12D-D: DefiLlama adapter does not fuzzy-match; only exact verified pool IDs", noFuzzy && allExact, `count=${Object.keys(DEFILLAMA_POOL_MAPPINGS).length} allExact=${allExact}`);
  }
  // 12D-E. Adapter failure/missing returns status error/missing and never throws.
  {
    const miss = defiLlamaMissingResult("jupiter", "no mapping");
    const err = defiLlamaErrorResult("jupiter", new Error("boom"));
    // supportedProtocolIds are exactly the verified mappings — no fuzzy auto-coverage.
    const onlyVerified = defiLlamaAdapter.supportedProtocolIds.every((id) => id in DEFILLAMA_POOL_MAPPINGS);
    add("12D-E: adapter failures return status error/missing (no throw into engine)",
      miss.status === "missing" && err.status === "error" && onlyVerified,
      `miss=${miss.status} err=${err.status} supported=${defiLlamaAdapter.supportedProtocolIds.join(",")}`);
  }
  // 12D-F. Jupiter quote adapter is contract-only (no tx, quote unavailable).
  {
    const q = getReadOnlyQuoteEstimate({ assetSymbol: "SOL" });
    const noTxKeys = !("transaction" in q) && !("signature" in q) && !("swap" in q);
    add("12D-F: Jupiter quote adapter is contract-only (no tx, quoteAvailable false)",
      q.quoteAvailable === false && q.source === "jupiter" && JUPITER_QUOTE_ADAPTER_IMPLEMENTED === false && noTxKeys,
      `quoteAvailable=${q.quoteAvailable} implemented=${JUPITER_QUOTE_ADAPTER_IMPLEMENTED}`);
  }
  // 12D-G. Aggregator returns candidate market/risk data but NO selected protocol.
  {
    const input = buildProtocolSelectionInput({ candidateProtocolIds: candidateIds, assetSymbol: "SOL", strategyType: "liquid_staking" });
    const hasAll = candidateIds.every((id) => input.marketDataByProtocolId[id] != null && input.riskDataByProtocolId[id] != null);
    const noSelected = !("selectedProtocolId" in input) && !("selectedProtocolName" in input) && !("score" in input) && !("winner" in input);
    add("12D-G: buildProtocolSelectionInput returns market/risk data but selects nothing", hasAll && noSelected, `hasAll=${hasAll} noSelected=${noSelected}`);
  }
  // 12D-H. Selection remains not implemented.
  {
    add("12D-H: PROTOCOL_SELECTION_IMPLEMENTED remains false", PROTOCOL_SELECTION_IMPLEMENTED === false, `flag=${PROTOCOL_SELECTION_IMPLEMENTED}`);
  }
  // 12D-I. staking/stable_yield protocolSelection.status remains not_evaluated.
  {
    add("12D-I: staking/stable_yield protocolSelection.status remains not_evaluated",
      staking?.protocolSelection?.status === "not_evaluated" && stable?.protocolSelection?.status === "not_evaluated",
      `staking=${staking?.protocolSelection?.status} stable=${stable?.protocolSelection?.status}`);
  }
  // 12D-J. protocol_selection guardrail remains not_evaluated.
  {
    const g = (s: typeof staking) => s?.guardrails.find((x) => x.code === "protocol_selection")?.status;
    add("12D-J: protocol_selection guardrail remains not_evaluated", g(staking) === "not_evaluated" && g(stable) === "not_evaluated", `staking=${g(staking)} stable=${g(stable)}`);
  }
  // 12D-K. Cards/modal do not display APY/TVL/risk data or candidate names as recommendations.
  {
    const names = ["Jupiter", "Marinade", "Jito", "BlazeStake", "Sanctum", "Kamino", "Orca", "Raydium", "Meteora"];
    const scan = (s: typeof staking) => JSON.stringify(toSuggestionCard(s!)) + JSON.stringify(s?.reviewDetails);
    const json = scan(staking) + scan(stable);
    const leaks = names.filter((n) => json.includes(n));
    add("12D-K: cards/modal never display candidate names or market data as recommendations", leaks.length === 0, `leaks=${leaks.join(",") || "none"}`);
  }
  // 12D-L. No suggestion has selectedProtocolId/Name.
  {
    const all = [...stakingRun.suggestions, ...stableRun.suggestions];
    const bad = all.filter((s) => s.protocolSelection?.selectedProtocolId != null || s.protocolSelection?.selectedProtocolName != null);
    add("12D-L: no suggestion has selectedProtocolId/Name", bad.length === 0, `violations=${bad.length}`);
  }
  // 12D-M. Network-unavailable: aggregator is synchronous/network-free → missing data.
  {
    const input = buildProtocolSelectionInput({ candidateProtocolIds: ["jupiter"], assetSymbol: "SOL", strategyType: "liquid_staking" });
    add("12D-M: fixtures pass network-free (aggregator returns missing without fetching)", input.marketDataByProtocolId.jupiter?.confidence === "missing", `confidence=${input.marketDataByProtocolId.jupiter?.confidence}`);
  }
  // 12D-N. Explicit "selection not implemented" marker (README + protocolDataSources.md reference it).
  {
    add("12D-N: explicit not-implemented marker present", PROTOCOL_SELECTION_IMPLEMENTED === false, `flag=${PROTOCOL_SELECTION_IMPLEMENTED}`);
  }

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 12E — protocol risk & eligibility methodology (gates only, NO selection).
 * ------------------------------------------------------------------ */
export function runProtocolEligibilityFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2);
  const stakingRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stableRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT);
  const staking = stakingRun.suggestions.find((s) => s.category === "staking");
  const stable = stableRun.suggestions.find((s) => s.category === "stable_yield");

  const mkMarket = (o: Partial<ProtocolMarketData>): ProtocolMarketData => ({
    protocolId: "jupiter", strategyType: "liquid_staking", assetSymbol: "SOL",
    dataSources: ["test"], updatedAt: "t", confidence: "available", missingFields: [], ...o,
  });
  const mkRisk = (o: Partial<ProtocolRiskData>): ProtocolRiskData => ({
    protocolId: "jupiter", notes: [], sources: [], confidence: "available", missingFields: [], ...o,
  });
  const ev = (
    market: ProtocolMarketData | undefined,
    risk: ProtocolRiskData | undefined,
    ctx?: { countsTowardSafetyBuffer?: boolean; requiresRoute?: boolean },
    strategy: "liquid_staking" | "lp" = "liquid_staking",
    candidateId = "jupiter"
  ) =>
    evaluateProtocolEligibility({
      candidate: getProtocolCandidateById(candidateId), marketData: market, riskData: risk,
      assetSymbol: "SOL", strategyType: strategy, context: ctx, checkedAt: "t",
    });
  const fullMarket = mkMarket({ apy: 5, tvlUsd: 2_000_000, withdrawalTimeHours: 1, fees: { depositBps: 0 } });
  const fullRisk = mkRisk({ riskScore: 8, auditStatus: "audited", withdrawalClass: "instant" });

  // 12E-A. Missing market data → insufficient_data.
  add("12E-A: missing market data → insufficient_data", ev(undefined, fullRisk).status === "insufficient_data", `status=${ev(undefined, fullRisk).status}`);
  // 12E-B. Missing risk data → insufficient_data.
  add("12E-B: missing risk data → insufficient_data", ev(fullMarket, undefined).status === "insufficient_data", `status=${ev(fullMarket, undefined).status}`);
  // 12E-C. Missing TVL → insufficient_data (not eligible).
  {
    const r = ev(mkMarket({ apy: 5, withdrawalTimeHours: 1, fees: {} }), fullRisk);
    add("12E-C: missing TVL → insufficient_data (not eligible)", r.status === "insufficient_data" && r.reasons.includes("missing_tvl"), `status=${r.status}`);
  }
  // 12E-D. TVL below $1M → ineligible.
  {
    const r = ev(mkMarket({ apy: 5, tvlUsd: 500_000, withdrawalTimeHours: 1, fees: {} }), fullRisk);
    add("12E-D: TVL below $1M → ineligible", r.status === "ineligible" && r.reasons.includes("tvl_below_minimum"), `status=${r.status}`);
  }
  // 12E-E. Missing riskScore → insufficient_data.
  {
    const r = ev(fullMarket, mkRisk({ auditStatus: "audited", withdrawalClass: "instant" }));
    add("12E-E: missing riskScore → insufficient_data", r.status === "insufficient_data" && r.reasons.includes("risk_score_missing"), `status=${r.status}`);
  }
  // 12E-F. Risk score below 7 → ineligible.
  {
    const r = ev(fullMarket, mkRisk({ riskScore: 5, auditStatus: "audited", withdrawalClass: "instant" }));
    add("12E-F: risk score below 7 → ineligible", r.status === "ineligible" && r.reasons.includes("risk_score_below_minimum"), `status=${r.status}`);
  }
  // 12E-G. Unknown auditStatus → insufficient_data (documented rule).
  {
    const r = ev(fullMarket, mkRisk({ riskScore: 8, auditStatus: "unknown", withdrawalClass: "instant" }));
    add("12E-G: unknown auditStatus → insufficient_data", r.status === "insufficient_data" && r.reasons.includes("audit_status_unknown"), `status=${r.status}`);
  }
  // 12E-H. Withdrawal above safety-buffer max → ineligible (buffer context).
  {
    const r = ev(mkMarket({ apy: 5, tvlUsd: 2_000_000, withdrawalTimeHours: 48, fees: {} }), mkRisk({ riskScore: 8, auditStatus: "audited", withdrawalClass: "delayed", safetyBufferEligible: true }), { countsTowardSafetyBuffer: true });
    add("12E-H: withdrawal > 24h → ineligible in safety-buffer context", r.status === "ineligible" && r.reasons.includes("withdrawal_too_long"), `status=${r.status}`);
  }
  // 12E-I. Withdrawal above general-yield max → ineligible.
  {
    const r = ev(mkMarket({ apy: 5, tvlUsd: 2_000_000, withdrawalTimeHours: 200, fees: {} }), fullRisk);
    add("12E-I: withdrawal > 168h → ineligible in general-yield context", r.status === "ineligible" && r.reasons.includes("withdrawal_too_long"), `status=${r.status}`);
  }
  // 12E-J. Missing safetyBufferEligible when countsTowardSafetyBuffer → insufficient_data.
  {
    const r = ev(mkMarket({ apy: 5, tvlUsd: 2_000_000, withdrawalTimeHours: 1, fees: {} }), mkRisk({ riskScore: 8, auditStatus: "audited", withdrawalClass: "instant" }), { countsTowardSafetyBuffer: true });
    add("12E-J: missing safetyBufferEligible (buffer context) → insufficient_data", r.status === "insufficient_data" && r.reasons.includes("missing_safety_buffer_eligibility"), `status=${r.status}`);
  }
  // 12E-K. LP/vault without IL modeling → insufficient_data.
  {
    const r = ev(undefined, undefined, {}, "lp", "orca");
    add("12E-K: LP/vault (no IL model) → insufficient_data", r.status === "insufficient_data", `status=${r.status} reasons=${r.reasons.join(",")}`);
  }
  // 12E-L. Eligible only when all required fields present and pass thresholds.
  {
    const r = ev(fullMarket, fullRisk);
    add("12E-L: full data + passing thresholds → eligible", r.status === "eligible" && r.reasons.length === 0, `status=${r.status} reasons=${r.reasons.join(",")}`);
  }
  // 12E-M. Aggregator returns results per candidate, no selected protocol.
  {
    const input = buildProtocolSelectionInput({ candidateProtocolIds: ["jupiter", "marinade"], assetSymbol: "SOL", strategyType: "liquid_staking" });
    const results = evaluateProtocolSelectionEligibility(input);
    const noSelected = results.every((r) => !("selectedProtocolId" in r) && !("selectedProtocolName" in r) && !("score" in r) && !("rank" in r));
    add("12E-M: evaluateProtocolSelectionEligibility returns results, selects nothing", results.length === 2 && results.every((r) => r.status === "insufficient_data") && noSelected, `n=${results.length}`);
  }
  // 12E-N. No sorting/ranking/scoring/selecting — order preserved, no score/rank keys.
  {
    const input = buildProtocolSelectionInput({ candidateProtocolIds: ["jupiter", "marinade", "jito"], assetSymbol: "SOL", strategyType: "liquid_staking" });
    const results = evaluateProtocolSelectionEligibility(input);
    const orderPreserved = results.map((r) => r.protocolId).join(",") === "jupiter,marinade,jito";
    const noScoreKeys = results.every((r) => Object.keys(r).every((k) => !/score|rank|selected|winner/i.test(k)));
    add("12E-N: no function sorts/ranks/scores/selects", orderPreserved && noScoreKeys, `order=${results.map((r) => r.protocolId).join(",")}`);
  }
  // 12E-O. Selection remains not implemented.
  add("12E-O: PROTOCOL_SELECTION_IMPLEMENTED remains false", PROTOCOL_SELECTION_IMPLEMENTED === false, `flag=${PROTOCOL_SELECTION_IMPLEMENTED}`);
  // 12E-P. staking/stable_yield protocolSelection.status remains not_evaluated.
  add("12E-P: staking/stable_yield protocolSelection.status remains not_evaluated", staking?.protocolSelection?.status === "not_evaluated" && stable?.protocolSelection?.status === "not_evaluated", `staking=${staking?.protocolSelection?.status} stable=${stable?.protocolSelection?.status}`);
  // 12E-Q. protocol_selection guardrail remains not_evaluated.
  {
    const g = (s: typeof staking) => s?.guardrails.find((x) => x.code === "protocol_selection")?.status;
    add("12E-Q: protocol_selection guardrail remains not_evaluated", g(staking) === "not_evaluated" && g(stable) === "not_evaluated", `staking=${g(staking)} stable=${g(stable)}`);
  }
  // 12E-R. Cards/modal do not expose eligibility results or protocol names.
  {
    // "eligible" alone is legitimate approved copy ("may be eligible for review");
    // scan for distinctive eligibility-RESULT tokens + candidate names instead.
    const tokens = ["Jupiter", "Marinade", "Jito", "BlazeStake", "Sanctum", "Kamino", "ineligible", "insufficient_data", "riskScore", "eligibilityStatus", "protocolEligibility"];
    const scan = (s: typeof staking) => JSON.stringify(toSuggestionCard(s!)) + JSON.stringify(s?.reviewDetails);
    const json = scan(staking) + scan(stable);
    const leaks = tokens.filter((n) => json.includes(n));
    add("12E-R: cards/modal never expose eligibility results or protocol names", leaks.length === 0, `leaks=${leaks.join(",") || "none"}`);
  }
  // 12E-S. Risk registry contains no made-up riskScore.
  {
    const anyScore = ["jupiter", "marinade", "jito", "blazestake", "sanctum", "kamino"].some((id) => getProtocolRiskData(id).riskScore !== undefined);
    add("12E-S: risk registry contains no invented riskScore", !anyScore, `anyScore=${anyScore}`);
  }
  // 12E-T. Eligibility is explicitly NOT a recommendation.
  add("12E-T: eligibility is not a recommendation (marker + methodology doc)", ELIGIBILITY_IMPLIES_RECOMMENDATION === false, `flag=${ELIGIBILITY_IMPLIES_RECOMMENDATION}`);

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 12F — read-only route / cost / liquidity guardrails (utilities only).
 * Network-free (no fetchImpl injected → no network). NOT wired into the engine.
 * ------------------------------------------------------------------ */
export function runRouteGuardrailFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2);
  const stakingRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stableRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT);
  const staking = stakingRun.suggestions.find((s) => s.category === "staking");
  const stable = stableRun.suggestions.find((s) => s.category === "stable_yield");

  const req: RouteQuoteRequest = { inputMint: "SoLmint", outputMint: "USDCmint", amountAtomic: "1000000000" };
  const okQuote = parseJupiterQuote(req, { outAmount: "999", priceImpactPct: "0.001" }); // 0.1%
  const highQuote = parseJupiterQuote(req, { outAmount: "999", priceImpactPct: "0.01" }); // 1%
  const noPiQuote = parseJupiterQuote(req, { outAmount: "999" });

  // 12F-A. Missing mint/amount → missing/invalid, not a fake quote.
  {
    const noMint = validateRouteQuoteRequest({ inputMint: "", outputMint: "o", amountAtomic: "100" });
    const noAmt = validateRouteQuoteRequest({ inputMint: "i", outputMint: "o", amountAtomic: "" });
    const ok = Boolean(
      noMint?.quoteAvailable === false && noMint?.missingFields.includes("token_mint") &&
      noAmt?.missingFields.includes("amount") && noMint?.outAmountAtomic === undefined
    );
    add("12F-A: missing mint/amount → missing result (not a fake quote)", ok, `mint=${noMint?.missingFields.join(",")} amt=${noAmt?.missingFields.join(",")}`);
  }
  // 12F-B. Network/error returns error/missing, never throws.
  {
    const err = jupiterQuoteErrorResult(req, new Error("net down"));
    const missing = notImplementedQuoteResult(req);
    add("12F-B: adapter error/network-unavailable → error/missing (no throw)",
      err.quoteAvailable === false && err.confidence === "unreliable" && (err.errors?.length ?? 0) > 0 && missing.confidence === "missing",
      `err=${err.confidence} missing=${missing.confidence}`);
  }
  // 12F-C. Quote without priceImpactPct → insufficient_data.
  {
    const r = evaluateRouteGuardrails({ quote: noPiQuote });
    add("12F-C: quote without priceImpactPct → insufficient_data", r.status === "insufficient_data" && r.reasons.includes("price_impact_missing"), `status=${r.status}`);
  }
  // 12F-D. priceImpactPct above MAX → failed.
  {
    const r = evaluateRouteGuardrails({ quote: highQuote });
    add("12F-D: priceImpactPct above MAX → failed", r.status === "failed" && r.reasons.includes("price_impact_too_high"), `status=${r.status} pi=${highQuote.priceImpactPct}`);
  }
  // 12F-E. priceImpactPct within threshold + required fields → passed.
  {
    const r = evaluateRouteGuardrails({ quote: okQuote });
    add("12F-E: priceImpact within threshold → passed", r.status === "passed" && r.reasons.length === 0, `status=${r.status} pi=${okQuote.priceImpactPct}`);
  }
  // 12F-F. Missing liquidity with requiresLiquidity → insufficient_data.
  {
    const r = evaluateRouteGuardrails({ quote: okQuote, requiresLiquidity: true });
    add("12F-F: requiresLiquidity + missing liquidity → insufficient_data", r.status === "insufficient_data" && r.reasons.includes("liquidity_missing"), `status=${r.status}`);
  }
  // 12F-G. liquidity below MIN → failed.
  {
    const r = evaluateRouteGuardrails({ quote: okQuote, requiresLiquidity: true, liquidityUsd: 50_000 });
    add("12F-G: liquidity below MIN → failed", r.status === "failed" && r.reasons.includes("liquidity_below_minimum"), `status=${r.status}`);
  }
  // 12F-H. All quote/liquidity fields present and passing → passed.
  {
    const r = evaluateRouteGuardrails({ quote: okQuote, requiresLiquidity: true, liquidityUsd: 200_000 });
    add("12F-H: all present + passing → passed", r.status === "passed" && r.reasons.length === 0, `status=${r.status}`);
  }
  // 12F-I. Quote adapter never builds/returns transactions.
  {
    const noTxKeys = !("transaction" in okQuote) && !("swapTransaction" in okQuote) && !("tx" in okQuote);
    add("12F-I: quote adapter does not build/return transactions", JUPITER_QUOTE_BUILDS_TRANSACTIONS === false && noTxKeys, `buildsTx=${JUPITER_QUOTE_BUILDS_TRANSACTIONS}`);
  }
  // 12F-J. Quote request needs no wallet/publicKey/signature.
  {
    const noWallet = !("publicKey" in req) && !("wallet" in req) && !("signer" in req);
    add("12F-J: quote request needs no wallet/publicKey/signature", noWallet && typeof getReadOnlyJupiterQuote === "function", `keys=${Object.keys(req).join(",")}`);
  }
  // 12F-K. Jupiter quote module exports no sign/sendTransaction functions.
  {
    const bad = Object.keys(jupiterQuoteModule).filter((k) => /sendTransaction|signTransaction|signAllTransactions|signMessage/i.test(k));
    add("12F-K: no sendTransaction/signTransaction/signAllTransactions/signMessage export", bad.length === 0, `bad=${bad.join(",") || "none"}`);
  }
  // 12F-L. Route guardrails are utility-only — live suggestions carry no route-derived passed guardrail.
  {
    const anyRoutePassed = [staking, stable].some((s) =>
      (s?.guardrails ?? []).some((g) => (g.code === "cost_available" || g.code === "liquidity_available" || g.code === "slippage_available") && g.status === "passed")
    );
    add("12F-L: route guardrails not wired into live suggestions", typeof evaluateRouteGuardrails === "function" && !anyRoutePassed, `anyRoutePassed=${anyRoutePassed}`);
  }
  // 12F-M. cost/liquidity/slippage remain not_evaluated in live suggestions.
  {
    const g = (s: typeof staking, code: string) => s?.guardrails.find((x) => x.code === code)?.status;
    const ok = ["cost_available", "liquidity_available", "slippage_available"].every(
      (c) => g(staking, c) === "not_evaluated" && g(stable, c) === "not_evaluated"
    );
    add("12F-M: cost/liquidity/slippage remain not_evaluated in live suggestions", ok, `ok=${ok}`);
  }
  // 12F-N. staking/stable protocolSelection.status remains not_evaluated.
  add("12F-N: staking/stable_yield protocolSelection.status remains not_evaluated", staking?.protocolSelection?.status === "not_evaluated" && stable?.protocolSelection?.status === "not_evaluated", `staking=${staking?.protocolSelection?.status}`);
  // 12F-O. Selection remains not implemented.
  add("12F-O: PROTOCOL_SELECTION_IMPLEMENTED remains false", PROTOCOL_SELECTION_IMPLEMENTED === false, `flag=${PROTOCOL_SELECTION_IMPLEMENTED}`);
  // 12F-P. No selectedProtocolId/Name anywhere.
  {
    const all = [...stakingRun.suggestions, ...stableRun.suggestions];
    const bad = all.filter((s) => s.protocolSelection?.selectedProtocolId != null || s.protocolSelection?.selectedProtocolName != null);
    add("12F-P: no suggestion has selectedProtocolId/Name", bad.length === 0, `violations=${bad.length}`);
  }
  // 12F-Q. Cards/modal expose no quote/route/liquidity data.
  {
    const tokens = ["priceImpact", "quoteAvailable", "liquidityUsd", "routeSource", "outAmount", "price_impact"];
    const scan = (s: typeof staking) => JSON.stringify(toSuggestionCard(s!)) + JSON.stringify(s?.reviewDetails);
    const json = scan(staking) + scan(stable);
    const leaks = tokens.filter((t) => json.includes(t));
    add("12F-Q: cards/modal never expose quote/route/liquidity data", leaks.length === 0, `leaks=${leaks.join(",") || "none"}`);
  }
  // 12F-R. Fixtures run network-free (live quote disabled; no fetch used).
  add("12F-R: route fixtures run network-free (live quote disabled)", JUPITER_LIVE_QUOTE_IMPLEMENTED === false && notImplementedQuoteResult(req).confidence === "missing", `live=${JUPITER_LIVE_QUOTE_IMPLEMENTED}`);
  // 12F-S. Explicit no-selection / no-execution markers (docs reference them).
  add("12F-S: no selection + no transaction markers present", PROTOCOL_SELECTION_IMPLEMENTED === false && JUPITER_QUOTE_BUILDS_TRANSACTIONS === false, `selection=${PROTOCOL_SELECTION_IMPLEMENTED} buildsTx=${JUPITER_QUOTE_BUILDS_TRANSACTIONS}`);

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 12G — deterministic protocol scoring model (ranking only, NO selection).
 * ------------------------------------------------------------------ */
export function runProtocolScoringFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2);
  const stakingRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stableRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT);
  const staking = stakingRun.suggestions.find((s) => s.category === "staking");
  const stable = stableRun.suggestions.find((s) => s.category === "stable_yield");

  const elig = (status: ProtocolEligibilityResult["status"], protocolId: string, strategyType: ProtocolStrategyType): ProtocolEligibilityResult => ({ protocolId, strategyType, assetSymbol: "SOL", status, reasons: [], checkedAt: "t" });
  const mkMarket = (o: Partial<ProtocolMarketData>): ProtocolMarketData => ({ protocolId: "x", strategyType: "liquid_staking", assetSymbol: "SOL", dataSources: ["t"], updatedAt: "t", confidence: "available", missingFields: [], ...o });
  const mkRisk = (o: Partial<ProtocolRiskData>): ProtocolRiskData => ({ protocolId: "x", notes: [], sources: [], confidence: "available", missingFields: [], ...o });
  const score = (market: ProtocolMarketData | undefined, risk: ProtocolRiskData | undefined, status: ProtocolEligibilityResult["status"], strategy: ProtocolStrategyType, ctx: { countsTowardSafetyBuffer?: boolean; requiresRoute?: boolean } = {}, candidateId = "jupiter") =>
    scoreProtocolCandidate({ candidate: getProtocolCandidateById(candidateId), marketData: market, riskData: risk, eligibilityResult: elig(status, candidateId, strategy), strategyType: strategy, assetSymbol: "SOL", context: ctx, scoredAt: "t" });

  const fullM = mkMarket({ apy: 6, tvlUsd: 50_000_000, withdrawalTimeHours: 1, fees: {} });
  const fullR = mkRisk({ riskScore: 8 });

  // 12G-A. Ineligible candidate is not scored.
  {
    const s = score(fullM, fullR, "ineligible", "liquid_staking");
    add("12G-A: ineligible candidate is not scored", s.status === "ineligible" && s.reasons.includes("candidate_ineligible") && s.breakdown === undefined, `status=${s.status}`);
  }
  // 12G-B. Missing APY → insufficient_data.
  {
    const s = score(mkMarket({ tvlUsd: 50_000_000, withdrawalTimeHours: 1, fees: {} }), fullR, "eligible", "liquid_staking");
    add("12G-B: missing APY → insufficient_data", s.status === "insufficient_data" && s.reasons.includes("missing_apy"), `status=${s.status}`);
  }
  // 12G-C. Missing TVL → insufficient_data.
  {
    const s = score(mkMarket({ apy: 6, withdrawalTimeHours: 1, fees: {} }), fullR, "eligible", "liquid_staking");
    add("12G-C: missing TVL → insufficient_data", s.status === "insufficient_data" && s.reasons.includes("missing_tvl"), `status=${s.status}`);
  }
  // 12G-D. Missing riskScore → insufficient_data.
  {
    const s = score(fullM, mkRisk({}), "eligible", "liquid_staking");
    add("12G-D: missing riskScore → insufficient_data", s.status === "insufficient_data" && s.reasons.includes("missing_risk_score"), `status=${s.status}`);
  }
  // 12G-E. Missing withdrawal data → insufficient_data.
  {
    const s = score(mkMarket({ apy: 6, tvlUsd: 50_000_000, fees: {} }), fullR, "eligible", "liquid_staking");
    add("12G-E: missing withdrawal data → insufficient_data", s.status === "insufficient_data" && s.reasons.includes("missing_withdrawal_data"), `status=${s.status}`);
  }
  // 12G-F. Route-required + missing priceImpact/liquidity → insufficient_data.
  {
    const s = score(mkMarket({ apy: 6, tvlUsd: 50_000_000, withdrawalTimeHours: 1, fees: {} }), fullR, "eligible", "liquid_staking", { requiresRoute: true });
    add("12G-F: route-required + missing route/liquidity → insufficient_data", s.status === "insufficient_data" && s.reasons.includes("missing_route_data") && s.reasons.includes("missing_liquidity_data"), `reasons=${s.reasons.join(",")}`);
  }
  // 12G-G. LP candidate → insufficient_data (IL not modeled).
  {
    const s = score(fullM, fullR, "eligible", "lp", {}, "orca");
    add("12G-G: LP candidate → insufficient_data (IL not modeled)", s.status === "insufficient_data" && s.reasons.includes("lp_risk_not_modeled"), `reasons=${s.reasons.join(",")}`);
  }
  // 12G-H. Fully eligible stable-yield candidate → deterministic totalScore.
  {
    const s = score(mkMarket({ apy: 6, tvlUsd: 50_000_000, withdrawalTimeHours: 1, fees: {} }), fullR, "eligible", "lending", {}, "kamino");
    const b = s.breakdown;
    add("12G-H: eligible stable-yield candidate is scored deterministically", s.status === "scored" && !!b && b.riskScore === 80 && b.yieldScore === 40 && b.totalScore > 0 && b.totalScore <= 100, `total=${b?.totalScore}`);
  }
  // 12G-I. Fully eligible liquid-staking candidate → deterministic totalScore.
  {
    const s = score(fullM, fullR, "eligible", "liquid_staking", {}, "jupiter");
    add("12G-I: eligible liquid-staking candidate is scored deterministically", s.status === "scored" && s.breakdown != null && s.breakdown.totalScore > 0 && s.breakdown.totalScore <= 100, `total=${s.breakdown?.totalScore}`);
  }
  // 12G-J. APY cap: extreme APY does not exceed a full yield score.
  {
    const s = score(mkMarket({ apy: 100, tvlUsd: 50_000_000, withdrawalTimeHours: 1, fees: {} }), fullR, "eligible", "liquid_staking");
    add("12G-J: APY cap prevents extreme yield from dominating", s.breakdown?.yieldScore === 100, `yieldScore=${s.breakdown?.yieldScore}`);
  }
  // 12G-K. Risk-heavy weights: higher-risk-score, lower-APY beats lower-risk, higher-APY.
  {
    const a = score(mkMarket({ apy: 12, tvlUsd: 50_000_000, withdrawalTimeHours: 1, fees: {} }), mkRisk({ riskScore: 7 }), "eligible", "lending", {}, "kamino");
    const b = score(mkMarket({ apy: 4, tvlUsd: 50_000_000, withdrawalTimeHours: 1, fees: {} }), mkRisk({ riskScore: 10 }), "eligible", "lending", {}, "kamino");
    add("12G-K: risk outweighs APY in stable-yield scoring", (b.breakdown?.totalScore ?? 0) > (a.breakdown?.totalScore ?? 0), `highApy=${a.breakdown?.totalScore} highRisk=${b.breakdown?.totalScore}`);
  }
  // 12G-L. Deterministic tie-breakers.
  {
    const mk = (protocolId: string, bd: Partial<ProtocolScoreBreakdown>): ProtocolCandidateScore => ({ protocolId, strategyType: "liquid_staking", assetSymbol: "SOL", status: "scored", reasons: [], scoredAt: "t", breakdown: { yieldScore: 0, riskScore: 0, tvlScore: 0, withdrawalScore: 0, liquidityScore: 0, costScore: 0, totalScore: 0, ...bd } });
    const total = [mk("a", { totalScore: 50 }), mk("b", { totalScore: 80 })].sort(compareCandidateScores).map((s) => s.protocolId).join(",") === "b,a";
    const risk = [mk("a", { totalScore: 50, riskScore: 70 }), mk("b", { totalScore: 50, riskScore: 90 })].sort(compareCandidateScores).map((s) => s.protocolId).join(",") === "b,a";
    const tvl = [mk("a", { totalScore: 50, riskScore: 50, tvlScore: 10 }), mk("b", { totalScore: 50, riskScore: 50, tvlScore: 90 })].sort(compareCandidateScores).map((s) => s.protocolId).join(",") === "b,a";
    const id = [mk("bbb", { totalScore: 50, riskScore: 50, tvlScore: 50, withdrawalScore: 50 }), mk("aaa", { totalScore: 50, riskScore: 50, tvlScore: 50, withdrawalScore: 50 })].sort(compareCandidateScores).map((s) => s.protocolId).join(",") === "aaa,bbb";
    add("12G-L: ranking tie-breakers are deterministic (total→risk→tvl→withdrawal→id)", total && risk && tvl && id, `total=${total} risk=${risk} tvl=${tvl} id=${id}`);
  }
  // 12G-M. Weights total 100 for each supported scoring strategy.
  {
    const strategies: ProtocolScoringStrategy[] = ["stable_yield", "lending", "liquid_staking", "staking", "vault"];
    const results = strategies.map((s) => {
      const w = SCORING_WEIGHTS[s];
      return { s, sum: w ? w.risk + w.tvl + w.withdrawal + w.yield + w.liquidity + w.cost : -1 };
    });
    add("12G-M: scoring weights total 100 for each supported strategy", results.every((r) => r.sum === 100) && SCORING_WEIGHTS.lp === null, results.map((r) => `${r.s}:${r.sum}`).join(" "));
  }
  // 12G-N. rankProtocolCandidates ranks but selectionMade is false.
  {
    const input: ProtocolSelectionInput = {
      candidateProtocolIds: ["jupiter", "marinade"], assetSymbol: "SOL", strategyType: "liquid_staking",
      marketDataByProtocolId: { jupiter: mkMarket({ apy: 6, tvlUsd: 50_000_000, withdrawalTimeHours: 1, fees: {} }), marinade: mkMarket({ apy: 8, tvlUsd: 80_000_000, withdrawalTimeHours: 1, fees: {} }) },
      riskDataByProtocolId: { jupiter: mkRisk({ riskScore: 7 }), marinade: mkRisk({ riskScore: 9 }) },
    };
    const ranking = rankProtocolCandidates({ input, eligibilityResults: [elig("eligible", "jupiter", "liquid_staking"), elig("eligible", "marinade", "liquid_staking")], context: {} });
    add("12G-N: rankProtocolCandidates ranks but selectionMade is false", ranking.rankedProtocolIds.length === 2 && ranking.selectionMade === false, `ranked=${ranking.rankedProtocolIds.join(",")} selectionMade=${ranking.selectionMade}`);
  }
  // 12G-O. No selectedProtocolId/Name in scoring output.
  {
    const s = score(fullM, fullR, "eligible", "liquid_staking");
    const input: ProtocolSelectionInput = { candidateProtocolIds: ["jupiter"], assetSymbol: "SOL", strategyType: "liquid_staking", marketDataByProtocolId: {}, riskDataByProtocolId: {} };
    const ranking = rankProtocolCandidates({ input, eligibilityResults: [] });
    const noSelected = !("selectedProtocolId" in s) && !("selectedProtocolName" in s) && !("selectedProtocolId" in ranking) && !("selectedProtocolName" in ranking) && !("recommendation" in ranking);
    add("12G-O: no selectedProtocolId/Name in scoring output", noSelected, `noSelected=${noSelected}`);
  }
  // 12G-P. Selection remains not implemented.
  add("12G-P: PROTOCOL_SELECTION_IMPLEMENTED remains false", PROTOCOL_SELECTION_IMPLEMENTED === false, `flag=${PROTOCOL_SELECTION_IMPLEMENTED}`);
  // 12G-Q. staking/stable protocolSelection.status remains not_evaluated.
  add("12G-Q: staking/stable_yield protocolSelection.status remains not_evaluated", staking?.protocolSelection?.status === "not_evaluated" && stable?.protocolSelection?.status === "not_evaluated", `staking=${staking?.protocolSelection?.status}`);
  // 12G-R. protocol_selection guardrail remains not_evaluated.
  {
    const g = (s: typeof staking) => s?.guardrails.find((x) => x.code === "protocol_selection")?.status;
    add("12G-R: protocol_selection guardrail remains not_evaluated", g(staking) === "not_evaluated" && g(stable) === "not_evaluated", `staking=${g(staking)}`);
  }
  // 12G-S. Cards/modal expose no scores/ranks/candidate names/APY/TVL.
  {
    const tokens = ["Jupiter", "Marinade", "Jito", "Kamino", "totalScore", "yieldScore", "rankedProtocolIds", "scoredAt", "tvlUsd", "selectionMade"];
    const scan = (s: typeof staking) => JSON.stringify(toSuggestionCard(s!)) + JSON.stringify(s?.reviewDetails);
    const json = scan(staking) + scan(stable);
    const leaks = tokens.filter((t) => json.includes(t));
    add("12G-S: cards/modal never expose scores/ranks/names/APY/TVL", leaks.length === 0, `leaks=${leaks.join(",") || "none"}`);
  }
  // 12G-T. Scoring helpers are utility-only (not wired into live suggestions).
  {
    const anyProtoPassed = [staking, stable].some((s) => (s?.guardrails ?? []).some((g) => g.code === "protocol_selection" && g.status === "passed"));
    add("12G-T: scoring not wired into live suggestions", typeof rankProtocolCandidates === "function" && !anyProtoPassed, `anyProtoPassed=${anyProtoPassed}`);
  }
  // 12G-U. Scoring is not recommendation; ranking is not selection.
  add("12G-U: scoring is not recommendation and ranking is not selection", SCORING_IS_RECOMMENDATION === false && RANKING_IS_SELECTION === false, `scoringRec=${SCORING_IS_RECOMMENDATION} rankingSel=${RANKING_IS_SELECTION}`);
  // 12G-V. No forbidden copy in scoring output.
  {
    const s = score(fullM, fullR, "eligible", "liquid_staking");
    const json = (JSON.stringify(s) + JSON.stringify(SCORING_WEIGHTS)).toLowerCase();
    const forbidden = ["best", "safest", "optimal", "guaranteed", "risk-free"];
    const hits = forbidden.filter((w) => json.includes(w));
    add("12G-V: no forbidden copy in scoring output", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 12H — QA-only protocol selection (SOL liquid staking). QA UTILITY ONLY —
 * never wired into the engine; production selection stays disabled.
 * ------------------------------------------------------------------ */
export function runProtocolSelectionQaFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2);
  const stakingRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stableRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT);
  const staking = stakingRun.suggestions.find((s) => s.category === "staking");
  const stable = stableRun.suggestions.find((s) => s.category === "stable_yield");

  const cloneMarket = () => Object.fromEntries(Object.entries(SOL_LIQUID_STAKING_QA_MARKET).map(([k, v]) => [k, { ...v }]));
  const cloneRisk = () => Object.fromEntries(Object.entries(SOL_LIQUID_STAKING_QA_RISK).map(([k, v]) => [k, { ...v }]));
  const run = (input: ProtocolSelectionInput) => runProtocolSelectionQa({ input, checkedAt: "t" });
  const completeResult = run(buildSolLiquidStakingQaInput());

  // 12H-A. Disabled for unsupported strategy (stable_yield/lending).
  {
    const r = run({ ...buildSolLiquidStakingQaInput(), strategyType: "lending" });
    add("12H-A: QA disabled for unsupported strategy (stable yield)", r.status === "disabled" && r.selectionMade === false && r.reasons.includes("unsupported_strategy"), `status=${r.status}`);
  }
  // 12H-B. Disabled for unsupported asset (BONK).
  {
    const r = run({ ...buildSolLiquidStakingQaInput(), assetSymbol: "BONK" });
    add("12H-B: QA disabled for unsupported asset (BONK)", r.status === "disabled" && r.selectionMade === false && r.reasons.includes("unsupported_asset"), `status=${r.status}`);
  }
  // 12H-C. Incomplete market data (all missing APY) → not selected.
  {
    const m = cloneMarket();
    for (const id of Object.keys(m)) delete (m[id] as { apy?: number }).apy;
    const r = run(buildSolLiquidStakingQaInput(m));
    add("12H-C: incomplete market data → not selected", (r.status === "insufficient_data" || r.status === "no_eligible_candidates") && r.selectionMade === false && r.selectedProtocolId === undefined, `status=${r.status}`);
  }
  // 12H-D. Missing riskScore (all) → not selected.
  {
    const risk = cloneRisk();
    for (const id of Object.keys(risk)) delete (risk[id] as { riskScore?: number }).riskScore;
    const r = run(buildSolLiquidStakingQaInput(undefined, risk));
    add("12H-D: missing riskScore → not selected", (r.status === "insufficient_data" || r.status === "no_eligible_candidates") && r.selectionMade === false, `status=${r.status} reasons=${r.reasons.join(",")}`);
  }
  // 12H-E. Complete data but all fail eligibility (all TVL below min) → no_eligible_candidates.
  {
    const m = cloneMarket();
    for (const id of Object.keys(m)) m[id].tvlUsd = 500_000;
    const r = run(buildSolLiquidStakingQaInput(m));
    add("12H-E: complete data but all ineligible → no_eligible_candidates", r.status === "no_eligible_candidates" && r.selectionMade === false, `status=${r.status}`);
  }
  // 12H-F. Complete passing data → selected, one protocol, selectionMade true, qaOnly true.
  {
    const r = completeResult;
    add("12H-F: complete passing data → selected (qaOnly)", r.status === "selected" && typeof r.selectedProtocolId === "string" && r.selectionMade === true && r.qaOnly === true, `selected=${r.selectedProtocolId}`);
  }
  // 12H-G. Selected protocol is the first ranked.
  add("12H-G: selectedProtocolId === rankedProtocolIds[0]", completeResult.selectedProtocolId === completeResult.rankedProtocolIds[0], `selected=${completeResult.selectedProtocolId} ranked0=${completeResult.rankedProtocolIds[0]}`);
  // 12H-H. Deterministic across repeated runs.
  {
    const a = run(buildSolLiquidStakingQaInput()).selectedProtocolId;
    const b = run(buildSolLiquidStakingQaInput()).selectedProtocolId;
    add("12H-H: selection is deterministic across runs", a === b && a === completeResult.selectedProtocolId, `a=${a} b=${b}`);
  }
  // 12H-I. Higher APY / lower risk does not automatically win.
  {
    const winnerApy = SOL_LIQUID_STAKING_QA_MARKET[completeResult.selectedProtocolId ?? ""].apy;
    const maxApy = Math.max(...Object.values(SOL_LIQUID_STAKING_QA_MARKET).map((m) => m.apy ?? 0));
    add("12H-I: highest-APY candidate is not automatically selected (risk-weighted)", completeResult.selectedProtocolId === "marinade" && (winnerApy ?? 0) < maxApy, `winner=${completeResult.selectedProtocolId} winnerApy=${winnerApy} maxApy=${maxApy}`);
  }
  // 12H-J. Below-TVL candidate cannot be selected even with high APY.
  {
    const m = cloneMarket();
    m.sanctum.tvlUsd = 500_000;
    m.sanctum.apy = 25;
    const r = run(buildSolLiquidStakingQaInput(m));
    const sanctumElig = r.eligibilityResults.find((e) => e.protocolId === "sanctum");
    add("12H-J: below-TVL candidate not selected even with high APY", r.selectedProtocolId !== "sanctum" && sanctumElig?.status === "ineligible", `selected=${r.selectedProtocolId} sanctum=${sanctumElig?.status}`);
  }
  // 12H-K. Withdrawal-too-long candidate cannot be selected.
  {
    const m = cloneMarket();
    m.jito.withdrawalTimeHours = 200;
    const r = run(buildSolLiquidStakingQaInput(m));
    const jitoElig = r.eligibilityResults.find((e) => e.protocolId === "jito");
    add("12H-K: withdrawal-too-long candidate not selected", r.selectedProtocolId !== "jito" && jitoElig?.status === "ineligible", `selected=${r.selectedProtocolId} jito=${jitoElig?.status}`);
  }
  // 12H-L. LP/vault cannot be selected in 12H.
  {
    const r = run({ ...buildSolLiquidStakingQaInput(), strategyType: "vault" });
    add("12H-L: LP/vault cannot be selected (disabled)", r.status === "disabled" && r.selectionMade === false, `status=${r.status}`);
  }
  // 12H-M. QA never mutates the live ProtocolSelection object.
  {
    run(buildSolLiquidStakingQaInput()); // running QA must not affect live suggestions
    const freshStaking = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT).suggestions.find((s) => s.category === "staking");
    add("12H-M: QA does not mutate live ProtocolSelection", freshStaking?.protocolSelection?.status === "not_evaluated" && freshStaking?.protocolSelection?.selectedProtocolId === undefined, `status=${freshStaking?.protocolSelection?.status}`);
  }
  // 12H-N. Production selection remains not implemented.
  add("12H-N: PROTOCOL_SELECTION_IMPLEMENTED remains false", PROTOCOL_SELECTION_IMPLEMENTED === false, `flag=${PROTOCOL_SELECTION_IMPLEMENTED}`);
  // 12H-O. No live suggestion has selectedProtocolId/Name.
  {
    const all = [...stakingRun.suggestions, ...stableRun.suggestions];
    const bad = all.filter((s) => s.protocolSelection?.selectedProtocolId != null || s.protocolSelection?.selectedProtocolName != null);
    add("12H-O: no live suggestion has selectedProtocolId/Name", bad.length === 0, `violations=${bad.length}`);
  }
  // 12H-P. Cards/modal do not show the QA-selected protocol or ranking.
  {
    const tokens = ["marinade", "Marinade", "selectedProtocolId", "rankedProtocolIds", "selectionMade", "qaOnly", "candidateScores"];
    const scan = (s: typeof staking) => JSON.stringify(toSuggestionCard(s!)) + JSON.stringify(s?.reviewDetails);
    const json = scan(staking) + scan(stable);
    const leaks = tokens.filter((t) => json.includes(t));
    add("12H-P: cards/modal never show QA-selected protocol or ranking", leaks.length === 0, `leaks=${leaks.join(",") || "none"}`);
  }
  // 12H-S. Fixture data is labeled fixture-only / not live / not recommendation.
  {
    const marketLabeled = SOL_LIQUID_STAKING_QA_MARKET.jupiter.dataSources.includes("qa_fixture");
    const riskLabeled = SOL_LIQUID_STAKING_QA_RISK.jupiter.notes.some((n) => /fixture-only/i.test(n) && /not a recommendation/i.test(n));
    add("12H-S: QA fixture data is clearly labeled fixture-only / not a recommendation", marketLabeled && riskLabeled, `market=${marketLabeled} risk=${riskLabeled}`);
  }
  // 12H-T. QA result is explicitly qaOnly (not production selection).
  add("12H-T: QA selection is qaOnly (not production selection)", completeResult.qaOnly === true && PROTOCOL_SELECTION_IMPLEMENTED === false, `qaOnly=${completeResult.qaOnly}`);

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 12I — production-readiness checklist + feature-flag plan (planning only).
 * ------------------------------------------------------------------ */
export function runProtocolReadinessFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2);
  const stakingRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stableRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT);
  const staking = stakingRun.suggestions.find((s) => s.category === "staking");
  const stable = stableRun.suggestions.find((s) => s.category === "stable_yield");
  const checklist = getProtocolSelectionReadinessChecklist();

  // 12I-A…E. Feature flags at safe defaults.
  add("12I-A: PROTOCOL_SELECTION_IMPLEMENTED remains false", PROTOCOL_SELECTION_IMPLEMENTED === false, `flag=${PROTOCOL_SELECTION_IMPLEMENTED}`);
  add("12I-B: PROTOCOL_SELECTION_QA_ONLY is true", PROTOCOL_SELECTION_QA_ONLY === true, `flag=${PROTOCOL_SELECTION_QA_ONLY}`);
  add("12I-C: PROTOCOL_SELECTION_SHOW_IN_UI is false", PROTOCOL_SELECTION_SHOW_IN_UI === false, `flag=${PROTOCOL_SELECTION_SHOW_IN_UI}`);
  add("12I-D: PROTOCOL_SELECTION_ALLOW_LIVE_DATA is false", PROTOCOL_SELECTION_ALLOW_LIVE_DATA === false, `flag=${PROTOCOL_SELECTION_ALLOW_LIVE_DATA}`);
  add("12I-E: PROTOCOL_SELECTION_ALLOW_TRANSACTIONS is false", PROTOCOL_SELECTION_ALLOW_TRANSACTIONS === false, `flag=${PROTOCOL_SELECTION_ALLOW_TRANSACTIONS}`);
  // 12I-F. Not production ready.
  add("12I-F: isProtocolSelectionProductionReady() returns false", isProtocolSelectionProductionReady() === false, `ready=${isProtocolSelectionProductionReady()}`);
  // 12I-G. Checklist includes all required gates.
  {
    const required: ProtocolSelectionReadinessGate[] = ["market_data", "risk_registry", "eligibility", "route_liquidity_cost", "scoring", "qa", "product_copy_compliance", "feature_flag", "fallback_behavior"];
    const gates = checklist.map((c) => c.gate);
    const missing = required.filter((g) => !gates.includes(g));
    add("12I-G: readiness checklist includes all required gates", missing.length === 0, `missing=${missing.join(",") || "none"}`);
  }
  // 12I-H. No check claims production readiness (some gate is not passed + not ready).
  {
    const notAllPassed = checklist.some((c) => c.status !== "passed");
    add("12I-H: checklist does not claim production readiness", notAllPassed && isProtocolSelectionProductionReady() === false, `notAllPassed=${notAllPassed}`);
  }
  // 12I-I. Rollout stages ordered disabled→qa_only→…→production.
  {
    const expected = ["disabled", "qa_only", "internal_dry_run", "internal_ui_preview", "limited_beta", "production"];
    add("12I-I: rollout stages are ordered disabled → … → production", JSON.stringify([...PROTOCOL_SELECTION_ROLLOUT_STAGES]) === JSON.stringify(expected), `stages=${PROTOCOL_SELECTION_ROLLOUT_STAGES.join(",")}`);
  }
  // 12I-J. Live staking/stable protocolSelection.status remains not_evaluated.
  add("12I-J: staking/stable_yield protocolSelection.status remains not_evaluated", staking?.protocolSelection?.status === "not_evaluated" && stable?.protocolSelection?.status === "not_evaluated", `staking=${staking?.protocolSelection?.status}`);
  // 12I-K. Live suggestions carry no selectedProtocolId/Name.
  {
    const all = [...stakingRun.suggestions, ...stableRun.suggestions];
    const bad = all.filter((s) => s.protocolSelection?.selectedProtocolId != null || s.protocolSelection?.selectedProtocolName != null);
    add("12I-K: no live suggestion has selectedProtocolId/Name", bad.length === 0, `violations=${bad.length}`);
  }
  // 12I-L. protocol_selection guardrail remains not_evaluated.
  {
    const g = (s: typeof staking) => s?.guardrails.find((x) => x.code === "protocol_selection")?.status;
    add("12I-L: protocol_selection guardrail remains not_evaluated", g(staking) === "not_evaluated" && g(stable) === "not_evaluated", `staking=${g(staking)}`);
  }
  // 12I-M. Cards/modal show no selected protocol names.
  {
    const tokens = ["Jupiter", "Marinade", "Jito", "BlazeStake", "Sanctum", "Kamino", "selectedProtocolId", "selectedProtocolName"];
    const scan = (s: typeof staking) => JSON.stringify(toSuggestionCard(s!)) + JSON.stringify(s?.reviewDetails);
    const json = scan(staking) + scan(stable);
    const leaks = tokens.filter((t) => json.includes(t));
    add("12I-M: cards/modal show no selected protocol names", leaks.length === 0, `leaks=${leaks.join(",") || "none"}`);
  }
  // 12I-N. QA can still select fixture-only candidate; live selection stays disabled.
  {
    const qa = runProtocolSelectionQa({ input: buildSolLiquidStakingQaInput(), checkedAt: "t" });
    add("12I-N: QA selects fixture candidate; live selection stays disabled", qa.status === "selected" && qa.qaOnly === true && PROTOCOL_SELECTION_IMPLEMENTED === false && staking?.protocolSelection?.status === "not_evaluated", `qa=${qa.selectedProtocolId} implemented=${PROTOCOL_SELECTION_IMPLEMENTED}`);
  }
  // 12I-P. Production-readiness posture: QA-only, not production (doc mirrors this).
  add("12I-P: QA selection is not production selection", PROTOCOL_SELECTION_QA_ONLY === true && isProtocolSelectionProductionReady() === false && PROTOCOL_SELECTION_SHOW_IN_UI === false, `qaOnly=${PROTOCOL_SELECTION_QA_ONLY}`);
  // 12I-Q. Fallback-to-not_evaluated gate is present.
  add("12I-Q: readiness checklist includes fallback-to-not_evaluated gate", checklist.some((c) => c.gate === "fallback_behavior" && /not_evaluated/i.test(c.notes)), "fallback_behavior present");
  // 12I-R. Product/copy/compliance gate is present.
  add("12I-R: readiness checklist includes product/copy/compliance gate", checklist.some((c) => c.gate === "product_copy_compliance"), "product_copy_compliance present");
  // 12I-S. Production remains disabled (README mirrors this).
  add("12I-S: production remains disabled", PROTOCOL_SELECTION_IMPLEMENTED === false && PROTOCOL_SELECTION_ALLOW_LIVE_DATA === false, `implemented=${PROTOCOL_SELECTION_IMPLEMENTED}`);
  // 12I-T. No forbidden copy in the flags/checklist output.
  {
    const json = JSON.stringify(checklist).toLowerCase();
    const forbidden = ["best", "safest", "guaranteed", "risk-free", "optimal"];
    const hits = forbidden.filter((w) => json.includes(w));
    add("12I-T: no forbidden copy in flags/checklist output", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 12J — real-data MAPPING for SOL liquid staking (internal dry-run only).
 * Network-free (no injected values → all missing). NOT wired into the engine.
 * ------------------------------------------------------------------ */
export function runSolLiquidStakingMappingFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2);
  const stakingRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stableRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT);
  const staking = stakingRun.suggestions.find((s) => s.category === "staking");
  const stable = stableRun.suggestions.find((s) => s.category === "stable_yield");

  const market = buildSolLiquidStakingMarketDataFromExistingSources();
  const EXACT_MINTS: Record<string, string> = {
    jupiter: "jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v",
    marinade: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
    jito: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
    blazestake: "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1",
    sanctum: "5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm",
  };

  // 12J-A / 12J-B. Mapping implemented ≠ selection enabled.
  add("12J-A: SOL_LIQUID_STAKING_SELECTION_ENABLED is false", SOL_LIQUID_STAKING_SELECTION_ENABLED === false, `flag=${SOL_LIQUID_STAKING_SELECTION_ENABLED}`);
  add("12J-B: SOL_LIQUID_STAKING_DATA_MAPPING_IMPLEMENTED is true", SOL_LIQUID_STAKING_DATA_MAPPING_IMPLEMENTED === true, `flag=${SOL_LIQUID_STAKING_DATA_MAPPING_IMPLEMENTED}`);
  // 12J-C. All candidate IDs exist in the protocol registry.
  {
    const missing = SOL_LIQUID_STAKING_CANDIDATE_IDS.filter((id) => getProtocolCandidateById(id) == null);
    add("12J-C: all SOL LST candidate IDs exist in registry", missing.length === 0, `missing=${missing.join(",") || "none"}`);
  }
  // 12J-D. Exact mint mappings use known app registry/detection mints.
  {
    const bad = SOL_LIQUID_STAKING_MAPPINGS.filter((m) => m.lstMint !== EXACT_MINTS[m.protocolId]);
    add("12J-D: mappings use exact known mints", bad.length === 0, `bad=${bad.map((b) => b.protocolId).join(",") || "none"}`);
  }
  // 12J-E. No fuzzy name matching (mints are base58 addresses, not the symbol).
  {
    const base58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    const ok = SOL_LIQUID_STAKING_MAPPINGS.every((m) => m.lstMint != null && base58.test(m.lstMint) && m.lstMint !== m.lstSymbol);
    add("12J-E: no mapping uses fuzzy name matching (exact mints)", ok, `ok=${ok}`);
  }
  // 12J-F. Missing APY stays absent and marked missing.
  {
    const m = market.jupiter;
    add("12J-F: missing APY absent + marked missing", m.apy === undefined && m.missingFields.includes("apy"), `apy=${m.apy}`);
  }
  // 12J-G. Missing TVL stays absent and marked missing.
  {
    const m = market.jupiter;
    add("12J-G: missing TVL absent + marked missing", m.tvlUsd === undefined && m.missingFields.includes("tvl"), `tvl=${m.tvlUsd}`);
  }
  // 12J-H. Missing withdrawal stays absent and marked missing.
  {
    const m = market.jupiter;
    add("12J-H: missing withdrawal absent + marked missing", m.withdrawalTimeHours === undefined && m.missingFields.includes("withdrawal_behavior"), `withdrawal=${m.withdrawalTimeHours}`);
  }
  // 12J-I. Missing fees stay absent and marked missing.
  {
    const m = market.jupiter;
    add("12J-I: missing fees absent + marked missing", m.fees === undefined && m.missingFields.includes("fees"), `fees=${m.fees}`);
  }
  // 12J-J. riskScore remains absent (no approved methodology yet).
  {
    const anyScore = SOL_LIQUID_STAKING_CANDIDATE_IDS.some((id) => getProtocolRiskData(id).riskScore !== undefined);
    add("12J-J: riskScore remains absent unless sourced", !anyScore, `anyScore=${anyScore}`);
  }
  // 12J-K. Dry-run input has candidateProtocolIds but no selected protocol.
  {
    const input = buildSolLiquidStakingInternalDryRunInput();
    const noSelected = !("selectedProtocolId" in input) && !("selectedProtocolName" in input);
    add("12J-K: dry-run input has candidates but no selected protocol", input.candidateProtocolIds.length === 5 && noSelected, `ids=${input.candidateProtocolIds.length}`);
  }
  // 12J-L. Dry-run returns insufficient_data without failing.
  {
    const r = runSolLiquidStakingInternalDryRun({ checkedAt: "t" });
    add("12J-L: dry-run returns insufficient_data without failing", (r.qaResult.status === "insufficient_data" || r.qaResult.status === "no_eligible_candidates") && r.anyFullyEligible === false && r.qaOnly === true, `status=${r.qaResult.status} eligible=${r.anyFullyEligible}`);
  }
  // 12J-M. Dry-run does not mutate live ProtocolSelection.
  {
    runSolLiquidStakingInternalDryRun({ checkedAt: "t" });
    const fresh = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT).suggestions.find((s) => s.category === "staking");
    add("12J-M: dry-run does not mutate live ProtocolSelection", fresh?.protocolSelection?.status === "not_evaluated" && fresh?.protocolSelection?.selectedProtocolId === undefined, `status=${fresh?.protocolSelection?.status}`);
  }
  // 12J-N. Live staking protocolSelection.status remains not_evaluated.
  add("12J-N: live staking protocolSelection.status remains not_evaluated", staking?.protocolSelection?.status === "not_evaluated", `status=${staking?.protocolSelection?.status}`);
  // 12J-O. No live suggestion has selectedProtocolId/Name.
  {
    const all = [...stakingRun.suggestions, ...stableRun.suggestions];
    const bad = all.filter((s) => s.protocolSelection?.selectedProtocolId != null || s.protocolSelection?.selectedProtocolName != null);
    add("12J-O: no live suggestion has selectedProtocolId/Name", bad.length === 0, `violations=${bad.length}`);
  }
  // 12J-P. Cards/modal do not expose dry-run data or protocol recommendations.
  {
    const tokens = ["Jupiter", "Marinade", "Jito", "BlazeStake", "Sanctum", "dataAvailability", "qaResult", "anyFullyEligible", "JupSOL", "5oVNBeEEQvYi"];
    const scan = (s: typeof staking) => JSON.stringify(toSuggestionCard(s!)) + JSON.stringify(s?.reviewDetails);
    const json = scan(staking) + scan(stable);
    const leaks = tokens.filter((t) => json.includes(t));
    add("12J-P: cards/modal never expose dry-run data or recommendations", leaks.length === 0, `leaks=${leaks.join(",") || "none"}`);
  }
  // 12J-Q / R / S. Flags at safe defaults.
  add("12J-Q: PROTOCOL_SELECTION_IMPLEMENTED remains false", PROTOCOL_SELECTION_IMPLEMENTED === false, `flag=${PROTOCOL_SELECTION_IMPLEMENTED}`);
  add("12J-R: PROTOCOL_SELECTION_SHOW_IN_UI remains false", PROTOCOL_SELECTION_SHOW_IN_UI === false, `flag=${PROTOCOL_SELECTION_SHOW_IN_UI}`);
  add("12J-S: PROTOCOL_SELECTION_ALLOW_TRANSACTIONS remains false", PROTOCOL_SELECTION_ALLOW_TRANSACTIONS === false, `flag=${PROTOCOL_SELECTION_ALLOW_TRANSACTIONS}`);
  // 12J-U. Selection stays disabled (doc mirrors this).
  add("12J-U: SOL liquid-staking selection stays disabled", SOL_LIQUID_STAKING_SELECTION_ENABLED === false && PROTOCOL_SELECTION_IMPLEMENTED === false, `enabled=${SOL_LIQUID_STAKING_SELECTION_ENABLED}`);
  // 12J-V. No forbidden copy in the mapping/module output.
  {
    const json = (JSON.stringify(SOL_LIQUID_STAKING_MAPPINGS) + JSON.stringify(market)).toLowerCase();
    const forbidden = ["recommended", "best", "safest", "optimal", "guaranteed", "risk-free"];
    const hits = forbidden.filter((w) => json.includes(w));
    add("12J-V: no forbidden copy in mapping output", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 12K — SOL liquid-staking dry-run hardening + risk sourcing (dev-only).
 * Network-free. NOT wired into the engine.
 * ------------------------------------------------------------------ */
export function runSolLiquidStakingDryRunFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2);
  const stakingRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stableRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT);
  const staking = stakingRun.suggestions.find((s) => s.category === "staking");
  const stable = stableRun.suggestions.find((s) => s.category === "stable_yield");

  const injectedDefault = runSolLiquidStakingDryRun({ mode: "injected", checkedAt: "t" });
  const jupReport = injectedDefault.candidateReports.find((r) => r.protocolId === "jupiter");
  const fixtureRun = runSolLiquidStakingDryRun({ mode: "fixture", checkedAt: "t" });

  // 12K-A/B/C. Dry-run scoping constants.
  add("12K-A: SOL_LIQUID_STAKING_DRY_RUN_ONLY is true", SOL_LIQUID_STAKING_DRY_RUN_ONLY === true, `flag=${SOL_LIQUID_STAKING_DRY_RUN_ONLY}`);
  add("12K-B: SOL_LIQUID_STAKING_DRY_RUN_SHOWS_UI is false", SOL_LIQUID_STAKING_DRY_RUN_SHOWS_UI === false, `flag=${SOL_LIQUID_STAKING_DRY_RUN_SHOWS_UI}`);
  add("12K-C: SOL_LIQUID_STAKING_DRY_RUN_CAN_SELECT_PRODUCTION is false", SOL_LIQUID_STAKING_DRY_RUN_CAN_SELECT_PRODUCTION === false, `flag=${SOL_LIQUID_STAKING_DRY_RUN_CAN_SELECT_PRODUCTION}`);
  // 12K-D. live_opt_in without allowLiveData → live_data_disabled.
  {
    const r = runSolLiquidStakingDryRun({ mode: "live_opt_in", checkedAt: "t" });
    add("12K-D: live_opt_in without allowLiveData → live_data_disabled", r.status === "live_data_disabled", `status=${r.status}`);
  }
  // 12K-E. injected mode is network-free (returns synchronously with a status).
  {
    const injected = buildSolLiquidStakingMarketDataFromExistingSources({ apyByProtocolId: { jupiter: 8 } });
    const r = runSolLiquidStakingDryRun({ mode: "injected", marketDataByProtocolId: injected, checkedAt: "t" });
    add("12K-E: injected mode is network-free", typeof r === "object" && r.mode === "injected" && typeof r.status === "string", `status=${r.status}`);
  }
  // 12K-F. fixture mode clearly marks fixture-only data.
  {
    const fixtureLabeled = fixtureRun.candidateReports.some((rep) => rep.sources.includes("qa_fixture"));
    add("12K-F: fixture mode marks fixture-only data", fixtureRun.mode === "fixture" && fixtureLabeled, `labeled=${fixtureLabeled}`);
  }
  // 12K-G…K. Missing fields stay absent + marked missing (default injected = mapping).
  add("12K-G: missing APY absent + marks missing_apy", jupReport?.apyStatus === "missing" && jupReport?.missingFields.includes("missing_apy"), `apy=${jupReport?.apyStatus}`);
  add("12K-H: missing TVL absent + marks missing_tvl", jupReport?.tvlStatus === "missing" && jupReport?.missingFields.includes("missing_tvl"), `tvl=${jupReport?.tvlStatus}`);
  add("12K-I: missing withdrawal absent + marks missing_withdrawal_data", jupReport?.withdrawalStatus === "missing" && jupReport?.missingFields.includes("missing_withdrawal_data"), `wd=${jupReport?.withdrawalStatus}`);
  add("12K-J: missing fees absent + marks missing_fee_data", jupReport?.feeStatus === "missing" && jupReport?.missingFields.includes("missing_fee_data"), `fee=${jupReport?.feeStatus}`);
  add("12K-K: riskScore absent + marks missing_risk_score", jupReport?.riskStatus === "missing" && jupReport?.missingFields.includes("missing_risk_score"), `risk=${jupReport?.riskStatus}`);
  // 12K-L. candidateReports for all five.
  add("12K-L: dry-run reports all five SOL LST candidates", injectedDefault.candidateReports.length === 5, `n=${injectedDefault.candidateReports.length}`);
  // 12K-M. qaOnly true + selectionEnabled false.
  add("12K-M: dry-run result qaOnly true + selectionEnabled false", injectedDefault.qaOnly === true && injectedDefault.selectionEnabled === false, `qaOnly=${injectedDefault.qaOnly}`);
  // 12K-N. No top-level production selectedProtocolId.
  add("12K-N: dry-run result exposes no production selectedProtocolId", !("selectedProtocolId" in fixtureRun) && !("selectedProtocolId" in injectedDefault), `hasKey=${"selectedProtocolId" in fixtureRun}`);
  // 12K-O. Dry-run returns insufficient_data without failing.
  add("12K-O: dry-run returns insufficient_data without failing", injectedDefault.status === "insufficient_data" && injectedDefault.anyFullyEligible === false, `status=${injectedDefault.status}`);
  // 12K-P. Dry-run errors do not throw (unreliable data → source_error).
  {
    let threw = false;
    let status = "";
    try {
      const bad = buildSolLiquidStakingMarketDataFromExistingSources();
      bad.jupiter = { ...bad.jupiter, confidence: "unreliable" };
      status = runSolLiquidStakingDryRun({ mode: "injected", marketDataByProtocolId: bad, checkedAt: "t" }).status;
    } catch {
      threw = true;
    }
    add("12K-P: dry-run errors do not throw (→ source_error)", !threw && status === "source_error", `threw=${threw} status=${status}`);
  }
  // 12K-R. Live staking protocolSelection.status remains not_evaluated.
  add("12K-R: live staking protocolSelection.status remains not_evaluated", staking?.protocolSelection?.status === "not_evaluated", `status=${staking?.protocolSelection?.status}`);
  // 12K-S. No live suggestion has selectedProtocolId/Name.
  {
    const all = [...stakingRun.suggestions, ...stableRun.suggestions];
    const bad = all.filter((s) => s.protocolSelection?.selectedProtocolId != null || s.protocolSelection?.selectedProtocolName != null);
    add("12K-S: no live suggestion has selectedProtocolId/Name", bad.length === 0, `violations=${bad.length}`);
  }
  // 12K-T. Cards/modal do not expose dry-run data or protocol names.
  {
    const tokens = ["Jupiter", "Marinade", "Jito", "BlazeStake", "Sanctum", "candidateReports", "ready_for_qa", "apyStatus", "JupSOL"];
    const scan = (s: typeof staking) => JSON.stringify(toSuggestionCard(s!)) + JSON.stringify(s?.reviewDetails);
    const json = scan(staking) + scan(stable);
    const leaks = tokens.filter((t) => json.includes(t));
    add("12K-T: cards/modal never expose dry-run data or protocol names", leaks.length === 0, `leaks=${leaks.join(",") || "none"}`);
  }
  // 12K-U/V/W. Flags at safe defaults.
  add("12K-U: PROTOCOL_SELECTION_IMPLEMENTED remains false", PROTOCOL_SELECTION_IMPLEMENTED === false, `flag=${PROTOCOL_SELECTION_IMPLEMENTED}`);
  add("12K-V: PROTOCOL_SELECTION_SHOW_IN_UI remains false", PROTOCOL_SELECTION_SHOW_IN_UI === false, `flag=${PROTOCOL_SELECTION_SHOW_IN_UI}`);
  add("12K-W: PROTOCOL_SELECTION_ALLOW_TRANSACTIONS remains false", PROTOCOL_SELECTION_ALLOW_TRANSACTIONS === false, `flag=${PROTOCOL_SELECTION_ALLOW_TRANSACTIONS}`);
  // 12K-Y. riskScore not assigned (review recorded via lastReviewedAt).
  {
    const noScore = SOL_LIQUID_STAKING_CANDIDATE_IDS.every((id) => getProtocolRiskData(id).riskScore === undefined);
    const reviewed = getProtocolRiskData("jupiter").lastReviewedAt != null;
    add("12K-Y: riskScore not assigned; review recorded", noScore && reviewed, `noScore=${noScore} reviewed=${reviewed}`);
  }
  // 12K-Z. No forbidden investment claims in dry-run / risk output.
  {
    const json = (JSON.stringify(fixtureRun) + JSON.stringify(injectedDefault) + JSON.stringify(SOL_LIQUID_STAKING_CANDIDATE_IDS.map((id) => getProtocolRiskData(id)))).toLowerCase();
    const forbidden = ["best", "safest", "optimal", "guaranteed", "risk-free", "recommended"];
    const hits = forbidden.filter((w) => json.includes(w));
    add("12K-Z: no forbidden investment claims in dry-run/risk output", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 12L — verified source completion for SOL liquid staking (metadata only).
 * ------------------------------------------------------------------ */
export function runSolLiquidStakingSourceFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2);
  const stakingRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stableRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT);
  const staking = stakingRun.suggestions.find((s) => s.category === "staking");
  const stable = stableRun.suggestions.find((s) => s.category === "stable_yield");
  const ids = [...SOL_LIQUID_STAKING_CANDIDATE_IDS];
  const market = buildSolLiquidStakingMarketDataFromExistingSources();
  const dryRun = runSolLiquidStakingDryRun({ mode: "injected", checkedAt: "t" });

  // 12L-A. Source metadata for all five candidates.
  {
    const ok = ids.every((id) => getSolLiquidStakingSourceRecords(id).length === 9);
    add("12L-A: source metadata exists for all five candidates", ok, `ok=${ok}`);
  }
  // 12L-B. Every record has lastReviewedAt.
  add("12L-B: every source record has lastReviewedAt", SOL_LIQUID_STAKING_SOURCE_RECORDS.every((r) => typeof r.lastReviewedAt === "string" && r.lastReviewedAt.length > 0), `n=${SOL_LIQUID_STAKING_SOURCE_RECORDS.length}`);
  // 12L-C. Every verified record has a sourceName or sourceUrl.
  {
    const verified = SOL_LIQUID_STAKING_SOURCE_RECORDS.filter((r) => r.status === "verified");
    const ok = verified.every((r) => (r.sourceName ?? r.sourceUrl) != null);
    add("12L-C: every verified source record has sourceName/sourceUrl", ok, `verified=${verified.length}`);
  }
  // 12L-D. TVL mappings exact only (verified for sanctum, missing for others).
  {
    const allExact = Object.values(DEFILLAMA_POOL_MAPPINGS).every((m) => typeof m.poolId === "string" && m.poolId.length >= 8);
    const sanctumVerified = getSolLiquidStakingSourceStatus("sanctum", "tvl") === "verified";
    add("12L-D: TVL mappings are exact only", allExact && sanctumVerified, `allExact=${allExact} sanctumTvl=${getSolLiquidStakingSourceStatus("sanctum", "tvl")}`);
  }
  // 12L-E. No DefiLlama fuzzy matching.
  add("12L-E: no DefiLlama fuzzy matching", resolveDefiLlamaMapping("jupiter", "SOL") === undefined && resolveDefiLlamaMapping("kamino", "USDC") === undefined, "jupiter/kamino unmapped");
  // 12L-F. Unverified TVL remains missing (value + source).
  {
    const ok = getSolLiquidStakingSourceStatus("jupiter", "tvl") === "missing" && market.jupiter.tvlUsd === undefined;
    add("12L-F: unverified TVL remains missing", ok, `jupiterTvlSource=${getSolLiquidStakingSourceStatus("jupiter", "tvl")}`);
  }
  // 12L-G. APY source verified only when backed by existing code.
  {
    const ok = ids.every((id) => getSolLiquidStakingSourceStatus(id, "apy") === "verified" && getSolLiquidStakingSourceRecords(id).find((r) => r.category === "apy")?.sourceName != null);
    add("12L-G: APY source verified only when code-backed", ok, `ok=${ok}`);
  }
  // 12L-H. Verified APY SOURCE does not create an APY VALUE.
  add("12L-H: missing APY source does not create APY value", market.jupiter.apy === undefined, `apy=${market.jupiter.apy}`);
  // 12L-I. withdrawalTimeHours absent unless directly sourced.
  add("12L-I: withdrawalTimeHours absent unless sourced", market.jupiter.withdrawalTimeHours === undefined && getSolLiquidStakingSourceStatus("jupiter", "withdrawal") === "missing", `wd=${market.jupiter.withdrawalTimeHours}`);
  // 12L-J. Fees absent unless directly sourced.
  add("12L-J: fees absent unless sourced", market.jupiter.fees === undefined && getSolLiquidStakingSourceStatus("jupiter", "fees") === "missing", `fees=${market.jupiter.fees}`);
  // 12L-K. riskScore absent for all five.
  add("12L-K: riskScore remains absent for all five", ids.every((id) => getProtocolRiskData(id).riskScore === undefined), "no riskScore");
  // 12L-L. auditStatus remains unknown.
  add("12L-L: auditStatus remains unknown unless sourced", ids.every((id) => getProtocolRiskData(id).auditStatus === "unknown" && getSolLiquidStakingSourceStatus(id, "audit") === "missing"), "audit unknown");
  // 12L-M. Source metadata does not make any candidate eligible by itself.
  {
    const anyEligible = dryRun.candidateReports.some((r) => r.eligibilityStatus === "eligible");
    add("12L-M: source metadata does not create eligibility", dryRun.anyFullyEligible === false && !anyEligible, `anyEligible=${anyEligible}`);
  }
  // 12L-N. Dry-run includes source status but still insufficient_data.
  {
    const hasSourceStatus = dryRun.candidateReports.every((r) => r.sourceStatusByCategory != null && r.sourceStatusByCategory.apy === "verified");
    add("12L-N: dry-run includes source status but stays insufficient_data", hasSourceStatus && dryRun.status === "insufficient_data", `status=${dryRun.status}`);
  }
  // 12L-O. Live staking protocolSelection.status remains not_evaluated.
  add("12L-O: live staking protocolSelection.status remains not_evaluated", staking?.protocolSelection?.status === "not_evaluated", `status=${staking?.protocolSelection?.status}`);
  // 12L-P. No live suggestion has selectedProtocolId/Name.
  {
    const all = [...stakingRun.suggestions, ...stableRun.suggestions];
    const bad = all.filter((s) => s.protocolSelection?.selectedProtocolId != null || s.protocolSelection?.selectedProtocolName != null);
    add("12L-P: no live suggestion has selectedProtocolId/Name", bad.length === 0, `violations=${bad.length}`);
  }
  // 12L-Q. Cards/modal do not expose source metadata or protocol recommendations.
  {
    const tokens = ["Jupiter", "Marinade", "Jito", "BlazeStake", "Sanctum", "sourceStatusByCategory", "lastReviewedAt", "SolLiquidStakingSource", "JupSOL"];
    const scan = (s: typeof staking) => JSON.stringify(toSuggestionCard(s!)) + JSON.stringify(s?.reviewDetails);
    const json = scan(staking) + scan(stable);
    const leaks = tokens.filter((t) => json.includes(t));
    add("12L-Q: cards/modal never expose source metadata or recommendations", leaks.length === 0, `leaks=${leaks.join(",") || "none"}`);
  }
  // 12L-R/S/T. Flags at safe defaults.
  add("12L-R: PROTOCOL_SELECTION_IMPLEMENTED remains false", PROTOCOL_SELECTION_IMPLEMENTED === false, `flag=${PROTOCOL_SELECTION_IMPLEMENTED}`);
  add("12L-S: PROTOCOL_SELECTION_SHOW_IN_UI remains false", PROTOCOL_SELECTION_SHOW_IN_UI === false, `flag=${PROTOCOL_SELECTION_SHOW_IN_UI}`);
  add("12L-T: PROTOCOL_SELECTION_ALLOW_TRANSACTIONS remains false", PROTOCOL_SELECTION_ALLOW_TRANSACTIONS === false, `flag=${PROTOCOL_SELECTION_ALLOW_TRANSACTIONS}`);
  // 12L-V. Selection stays disabled (checklist doc mirrors this).
  add("12L-V: SOL liquid-staking selection stays disabled", SOL_LIQUID_STAKING_SELECTION_ENABLED === false && PROTOCOL_SELECTION_IMPLEMENTED === false, `enabled=${SOL_LIQUID_STAKING_SELECTION_ENABLED}`);
  // 12L-W. No forbidden investment claims in source metadata.
  {
    const json = JSON.stringify(SOL_LIQUID_STAKING_SOURCE_RECORDS).toLowerCase();
    const forbidden = ["best", "safest", "optimal", "guaranteed", "risk-free", "recommended"];
    const hits = forbidden.filter((w) => json.includes(w));
    add("12L-W: no forbidden investment claims in source metadata", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 12M — Stage-2 real-data dry-run REPORT for SOL liquid staking.
 * Internal-only report; NOT production selection, no UI, no live behavior change.
 * ------------------------------------------------------------------ */
export function runSolLiquidStakingStage2FixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2);
  const stakingRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stableRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT);
  const staking = stakingRun.suggestions.find((s) => s.category === "staking");
  const stable = stableRun.suggestions.find((s) => s.category === "stable_yield");

  const allApy = { jupiter: 8.2, marinade: 7.5, jito: 8.8, blazestake: 7.0, sanctum: 9.5 };

  // No injected data → all-missing coverage.
  const noData = buildSolLiquidStakingStage2DryRunReport({ fetchedAt: "t" });
  // APY only for all five.
  const apyOnly = buildSolLiquidStakingStage2DryRunReport({ apyByProtocolId: allApy, fetchedAt: "t" });
  // APY for all five + verified Sanctum TVL only.
  const apyPlusSanctumTvl = buildSolLiquidStakingStage2DryRunReport({
    apyByProtocolId: allApy,
    tvlByProtocolId: { sanctum: 900_000_000 },
    fetchedAt: "t",
  });

  // Complete data for ONE candidate (sanctum) — everything eligibility needs.
  const completeMarket = buildSolLiquidStakingMarketDataFromExistingSources({
    apyByProtocolId: { sanctum: 9.0 },
    tvlByProtocolId: { sanctum: 900_000_000 },
    updatedAt: "t",
  });
  completeMarket.sanctum = { ...completeMarket.sanctum, withdrawalTimeHours: 12, fees: { depositBps: 0, withdrawBps: 0 }, confidence: "available", missingFields: [] };
  const completeRiskBase: Record<string, Stage2ProtocolRiskData> = Object.fromEntries(
    [...SOL_LIQUID_STAKING_CANDIDATE_IDS].map((id) => [id, getProtocolRiskData(id)])
  );
  const eligibleRisk = (over: Partial<Stage2ProtocolRiskData>): Stage2ProtocolRiskData => ({
    protocolId: "sanctum",
    riskScore: 8,
    auditStatus: "audited",
    withdrawalClass: "same_day",
    notes: ["fixture-only stage-2 test data"],
    sources: ["stage2_test_fixture"],
    confidence: "available",
    missingFields: [],
    ...over,
  });
  const completeRisk = { ...completeRiskBase, sanctum: eligibleRisk({}) };
  const completeReport = buildSolLiquidStakingStage2DryRunReport({
    marketDataByProtocolId: completeMarket,
    riskDataByProtocolId: completeRisk,
    fetchedAt: "t",
  });
  const completeSanctum = completeReport.candidateReports.find((r) => r.protocolId === "sanctum");

  // 12M-A…D. Stage-2 scoping constants.
  add("12M-A: SOL_LIQUID_STAKING_STAGE_2_DRY_RUN_ONLY is true", SOL_LIQUID_STAKING_STAGE_2_DRY_RUN_ONLY === true, `flag=${SOL_LIQUID_STAKING_STAGE_2_DRY_RUN_ONLY}`);
  add("12M-B: SOL_LIQUID_STAKING_STAGE_2_SHOWS_UI is false", SOL_LIQUID_STAKING_STAGE_2_SHOWS_UI === false, `flag=${SOL_LIQUID_STAKING_STAGE_2_SHOWS_UI}`);
  add("12M-C: SOL_LIQUID_STAKING_STAGE_2_CAN_SELECT_PRODUCTION is false", SOL_LIQUID_STAKING_STAGE_2_CAN_SELECT_PRODUCTION === false, `flag=${SOL_LIQUID_STAKING_STAGE_2_CAN_SELECT_PRODUCTION}`);
  add("12M-D: SOL_LIQUID_STAKING_STAGE_2_USES_TRANSACTIONS is false", SOL_LIQUID_STAKING_STAGE_2_USES_TRANSACTIONS === false, `flag=${SOL_LIQUID_STAKING_STAGE_2_USES_TRANSACTIONS}`);

  // 12M-E…H. Report invariants.
  add("12M-E: report has qaOnly true", noData.qaOnly === true, `qaOnly=${noData.qaOnly}`);
  add("12M-F: report has productionSelectionEnabled false", noData.productionSelectionEnabled === false, `v=${noData.productionSelectionEnabled}`);
  add("12M-G: report has showInUi false", noData.showInUi === false, `v=${noData.showInUi}`);
  add("12M-H: report has canSelectForProduction false", noData.canSelectForProduction === false && completeReport.canSelectForProduction === false, `v=${completeReport.canSelectForProduction}`);
  // 12M-I. No top-level selectedProtocolId/selectedProtocolName.
  {
    const noSel = !("selectedProtocolId" in noData) && !("selectedProtocolName" in noData) && !("selectedProtocolId" in completeReport) && !("selectedProtocolName" in completeReport);
    add("12M-I: report has no top-level selectedProtocolId/Name", noSel, `noData=${"selectedProtocolId" in noData} complete=${"selectedProtocolId" in completeReport}`);
  }

  // 12M-J. No-injected-data report → not eligible, not scored.
  add("12M-J: no-injected-data report anyFullyEligible/anyScored false", noData.anyFullyEligible === false && noData.anyScored === false && noData.summary.candidatesEligible === 0, `elig=${noData.summary.candidatesEligible}`);
  // 12M-K. No-injected-data report fakes nothing.
  {
    const zeroed = noData.summary.candidatesWithApy === 0 && noData.summary.candidatesWithTvl === 0 && noData.summary.candidatesWithWithdrawal === 0 && noData.summary.candidatesWithFees === 0 && noData.summary.candidatesWithRiskScore === 0;
    add("12M-K: no-injected-data report fakes no APY/TVL/withdrawal/fees/riskScore", zeroed, `apy=${noData.summary.candidatesWithApy} tvl=${noData.summary.candidatesWithTvl}`);
  }
  // 12M-L. APY-only report → some APY, zero eligible.
  add("12M-L: APY-only report candidatesWithApy>0 but candidatesEligible=0", apyOnly.summary.candidatesWithApy > 0 && apyOnly.summary.candidatesEligible === 0, `apy=${apyOnly.summary.candidatesWithApy} elig=${apyOnly.summary.candidatesEligible}`);
  // 12M-M. APY + Sanctum TVL → still zero eligible (risk/withdrawal/fees missing).
  {
    const sanctum = apyPlusSanctumTvl.candidateReports.find((r) => r.protocolId === "sanctum");
    const ok = apyPlusSanctumTvl.summary.candidatesWithTvl === 1 && apyPlusSanctumTvl.summary.candidatesEligible === 0 && sanctum?.eligibilityStatus !== "eligible";
    add("12M-M: APY + Sanctum TVL still candidatesEligible=0", ok, `tvl=${apyPlusSanctumTvl.summary.candidatesWithTvl} elig=${apyPlusSanctumTvl.summary.candidatesEligible}`);
  }
  // 12M-N. Complete data for one candidate → that candidate eligible, but no production selection.
  add("12M-N: complete data makes one candidate eligible; canSelectForProduction false", completeSanctum?.eligibilityStatus === "eligible" && completeReport.summary.candidatesEligible === 1 && completeReport.canSelectForProduction === false, `sanctum=${completeSanctum?.eligibilityStatus} elig=${completeReport.summary.candidatesEligible}`);
  // 12M-O. Complete-data report may score internally but creates no production selection.
  {
    const scoredInternally = completeSanctum?.scoringStatus === "scored" && completeReport.anyScored === true;
    const noProductionSel = !("selectedProtocolId" in completeReport) && completeReport.productionSelectionEnabled === false && completeReport.canSelectForProduction === false;
    add("12M-O: complete-data report scores internally but no production selection", scoredInternally && noProductionSel, `scored=${completeSanctum?.scoringStatus} anyScored=${completeReport.anyScored}`);
  }
  // 12M-P. Missing values are absent, not zero.
  {
    const jup = apyOnly.candidateReports.find((r) => r.protocolId === "jupiter");
    const ok = jup?.tvl.status === "missing" && jup?.tvl.valueUsd === undefined && noData.candidateReports.every((r) => r.apy.value === undefined && r.tvl.valueUsd === undefined && r.risk.riskScore === undefined);
    add("12M-P: missing values absent, not zero", ok, `jupTvl=${jup?.tvl.valueUsd}`);
  }
  // 12M-Q. Unknown audit status does not pass eligibility.
  {
    const unknownAuditMarket = { ...completeMarket };
    const unknownAuditRisk = { ...completeRiskBase, sanctum: eligibleRisk({ auditStatus: "unknown" }) };
    const rep = buildSolLiquidStakingStage2DryRunReport({ marketDataByProtocolId: unknownAuditMarket, riskDataByProtocolId: unknownAuditRisk, fetchedAt: "t" });
    const sanctum = rep.candidateReports.find((r) => r.protocolId === "sanctum");
    add("12M-Q: unknown audit status does not pass eligibility", sanctum?.eligibilityStatus !== "eligible" && rep.summary.candidatesEligible === 0, `sanctum=${sanctum?.eligibilityStatus}`);
  }
  // 12M-R. Missing riskScore blocks eligibility.
  {
    const noRisk = { ...completeRiskBase, sanctum: eligibleRisk({ riskScore: undefined }) };
    const rep = buildSolLiquidStakingStage2DryRunReport({ marketDataByProtocolId: completeMarket, riskDataByProtocolId: noRisk, fetchedAt: "t" });
    const sanctum = rep.candidateReports.find((r) => r.protocolId === "sanctum");
    add("12M-R: missing riskScore blocks eligibility", sanctum?.eligibilityStatus !== "eligible" && sanctum?.eligibilityReasons.includes("risk_score_missing") === true, `sanctum=${sanctum?.eligibilityStatus}`);
  }
  // 12M-S. Missing withdrawal blocks eligibility.
  {
    const noWdMarket = { ...completeMarket, sanctum: { ...completeMarket.sanctum, withdrawalTimeHours: undefined } };
    const noWdRisk = { ...completeRiskBase, sanctum: eligibleRisk({ withdrawalClass: "unknown" }) };
    const rep = buildSolLiquidStakingStage2DryRunReport({ marketDataByProtocolId: noWdMarket, riskDataByProtocolId: noWdRisk, fetchedAt: "t" });
    const sanctum = rep.candidateReports.find((r) => r.protocolId === "sanctum");
    add("12M-S: missing withdrawal blocks eligibility", sanctum?.eligibilityStatus !== "eligible" && sanctum?.eligibilityReasons.includes("missing_withdrawal_behavior") === true, `sanctum=${sanctum?.eligibilityStatus}`);
  }
  // 12M-T. Missing fees block eligibility/scoring where required.
  {
    const noFeeMarket = { ...completeMarket, sanctum: { ...completeMarket.sanctum, fees: undefined } };
    const rep = buildSolLiquidStakingStage2DryRunReport({ marketDataByProtocolId: noFeeMarket, riskDataByProtocolId: completeRisk, fetchedAt: "t" });
    const sanctum = rep.candidateReports.find((r) => r.protocolId === "sanctum");
    add("12M-T: missing fees block eligibility/scoring", sanctum?.eligibilityStatus !== "eligible" && sanctum?.eligibilityReasons.includes("fees_unknown") === true, `sanctum=${sanctum?.eligibilityStatus}`);
  }
  // 12M-U. Live-opt-in harness without allowLiveData → blocked / live_data_disabled.
  {
    const rep = buildSolLiquidStakingStage2DryRunFromLiveSources({});
    const allBlocked = rep.candidateReports.every((r) => r.apy.status === "blocked" && r.tvl.status === "blocked" && r.risk.status === "blocked");
    add("12M-U: live-opt-in without allowLiveData → blocked/live_data_disabled", rep.blockers.includes("live_data_disabled") && allBlocked && rep.summary.candidatesEligible === 0, `blockers=${rep.blockers.join(",")}`);
  }
  // 12M-V. Live-opt-in harness errors return a report with blockers, not a thrown error.
  {
    let threw = false;
    let rep: ReturnType<typeof buildSolLiquidStakingStage2DryRunFromLiveSources> | undefined;
    try {
      rep = buildSolLiquidStakingStage2DryRunFromLiveSources({ allowLiveData: true, liveDataProvider: () => { throw new Error("boom"); } });
    } catch {
      threw = true;
    }
    add("12M-V: live-opt-in errors return blockers, not thrown", !threw && rep?.blockers.includes("source_error") === true, `threw=${threw} blockers=${rep?.blockers.join(",")}`);
  }
  // 12M-W. Stage-2 report shape never leaks into live suggestion derivation output.
  {
    const tokens = ["stage_2_real_data_dry_run", "candidateReports", "canSelectForProduction", "productionSelectionEnabled", "candidatesEligible"];
    const scan = (s: typeof staking) => JSON.stringify(s) + JSON.stringify(toSuggestionCard(s!)) + JSON.stringify(s?.reviewDetails);
    const json = scan(staking) + scan(stable);
    const leaks = tokens.filter((t) => json.includes(t));
    add("12M-W: stage-2 report shape not present in live suggestion output", leaks.length === 0, `leaks=${leaks.join(",") || "none"}`);
  }
  // 12M-X. Live staking protocolSelection.status remains not_evaluated.
  add("12M-X: live staking protocolSelection.status remains not_evaluated", staking?.protocolSelection?.status === "not_evaluated", `status=${staking?.protocolSelection?.status}`);
  // 12M-Y. No live suggestion has selectedProtocolId/Name.
  {
    const all = [...stakingRun.suggestions, ...stableRun.suggestions];
    const bad = all.filter((s) => s.protocolSelection?.selectedProtocolId != null || s.protocolSelection?.selectedProtocolName != null);
    add("12M-Y: no live suggestion has selectedProtocolId/Name", bad.length === 0, `violations=${bad.length}`);
  }
  // 12M-Z. Cards/modal do not expose Stage-2 report or protocol names.
  {
    const tokens = ["Jupiter", "Marinade", "Jito", "BlazeStake", "Sanctum", "JupSOL", "stage_2_real_data_dry_run", "candidateReports"];
    const scan = (s: typeof staking) => JSON.stringify(toSuggestionCard(s!)) + JSON.stringify(s?.reviewDetails);
    const json = scan(staking) + scan(stable);
    const leaks = tokens.filter((t) => json.includes(t));
    add("12M-Z: cards/modal never expose Stage-2 report or protocol names", leaks.length === 0, `leaks=${leaks.join(",") || "none"}`);
  }
  // 12M-AA/AB/AC. Global selection flags at safe defaults.
  add("12M-AA: PROTOCOL_SELECTION_IMPLEMENTED remains false", PROTOCOL_SELECTION_IMPLEMENTED === false, `flag=${PROTOCOL_SELECTION_IMPLEMENTED}`);
  add("12M-AB: PROTOCOL_SELECTION_SHOW_IN_UI remains false", PROTOCOL_SELECTION_SHOW_IN_UI === false, `flag=${PROTOCOL_SELECTION_SHOW_IN_UI}`);
  add("12M-AC: PROTOCOL_SELECTION_ALLOW_TRANSACTIONS remains false", PROTOCOL_SELECTION_ALLOW_TRANSACTIONS === false, `flag=${PROTOCOL_SELECTION_ALLOW_TRANSACTIONS}`);
  // 12M-AD. No transaction/signature/swap path in Stage-2 report output.
  {
    const json = (JSON.stringify(completeReport) + JSON.stringify(noData) + JSON.stringify(apyOnly)).toLowerCase();
    const txTokens = ["sendtransaction", "signtransaction", "signalltransactions", "signmessage", "publickey", "swap", "deposit", "withdraw("];
    const hits = txTokens.filter((t) => json.includes(t));
    add("12M-AD: no transaction/signature/swap path in Stage-2 output", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }
  // 12M-AE. Stage-2 report marks not-production-selection (doc mirrors this).
  add("12M-AE: Stage-2 report marks not production selection", completeReport.canSelectForProduction === false && completeReport.productionSelectionEnabled === false && completeReport.qaOnly === true, `canSelect=${completeReport.canSelectForProduction}`);
  // 12M-AF. No forbidden investment claims in Stage-2 report (existing forbidden-copy list).
  {
    const json = (JSON.stringify(completeReport) + JSON.stringify(noData) + JSON.stringify(apyOnly) + JSON.stringify(apyPlusSanctumTvl)).toLowerCase();
    const forbidden = ["best", "safest", "optimal", "guaranteed", "risk-free", "recommended"];
    const hits = forbidden.filter((w) => json.includes(w));
    add("12M-AF: no forbidden investment claims in Stage-2 report", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 12N — final go/no-go checklist for protocol-selection production readiness.
 * Checklist only; productionReady is false. No UI, no live behavior change.
 * ------------------------------------------------------------------ */
export function runProtocolSelectionGoNoGoFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2);
  const stakingRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stableRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT);
  const staking = stakingRun.suggestions.find((s) => s.category === "staking");
  const stable = stableRun.suggestions.find((s) => s.category === "stable_yield");

  const gng = getProtocolSelectionGoNoGo("t");
  const gateStatus = (gate: ProtocolSelectionGoNoGoGate) => gng.checks.find((c) => c.gate === gate)?.status;
  const blockerIds = gng.blockers.map((b) => b.id);

  // 12N-A…C. Go/no-go scoping constants.
  add("12N-A: PROTOCOL_SELECTION_GO_NO_GO_ONLY is true", PROTOCOL_SELECTION_GO_NO_GO_ONLY === true, `flag=${PROTOCOL_SELECTION_GO_NO_GO_ONLY}`);
  add("12N-B: PROTOCOL_SELECTION_GO_NO_GO_SHOWS_UI is false", PROTOCOL_SELECTION_GO_NO_GO_SHOWS_UI === false, `flag=${PROTOCOL_SELECTION_GO_NO_GO_SHOWS_UI}`);
  add("12N-C: PROTOCOL_SELECTION_GO_NO_GO_CAN_ENABLE_PRODUCTION is false", PROTOCOL_SELECTION_GO_NO_GO_CAN_ENABLE_PRODUCTION === false, `flag=${PROTOCOL_SELECTION_GO_NO_GO_CAN_ENABLE_PRODUCTION}`);

  // 12N-D…G. Top-level result invariants.
  add("12N-D: getProtocolSelectionGoNoGo().productionReady is false", gng.productionReady === false, `v=${gng.productionReady}`);
  add("12N-E: canShowInUi is false", gng.canShowInUi === false, `v=${gng.canShowInUi}`);
  add("12N-F: canSelectProtocol is false", gng.canSelectProtocol === false, `v=${gng.canSelectProtocol}`);
  add("12N-G: canUseTransactions is false", gng.canUseTransactions === false, `v=${gng.canUseTransactions}`);

  // 12N-H/I. Summary helpers.
  add("12N-H: isProtocolSelectionGo() returns false", isProtocolSelectionGo() === false, `v=${isProtocolSelectionGo()}`);
  {
    let threw = false;
    let ret: boolean | undefined;
    try {
      ret = assertProtocolSelectionCannotRunInProduction();
    } catch {
      threw = true;
    }
    add("12N-I: assertProtocolSelectionCannotRunInProduction() returns true", !threw && ret === true, `threw=${threw} ret=${ret}`);
  }

  // 12N-J. All required gates present.
  {
    const required: ProtocolSelectionGoNoGoGate[] = [
      "feature_flags", "market_data", "tvl_mapping", "risk_methodology", "risk_scores", "audit_status",
      "withdrawal_data", "fee_data", "route_liquidity_cost", "eligibility", "scoring", "stage_2_dry_run",
      "qa_regression", "product_copy_compliance", "fallback_behavior", "transaction_boundary", "ui_readiness",
    ];
    const present = new Set(gng.checks.map((c) => c.gate));
    const missing = required.filter((g) => !present.has(g));
    add("12N-J: go/no-go includes all required gates", missing.length === 0 && gng.checks.length === required.length, `missing=${missing.join(",") || "none"} n=${gng.checks.length}`);
  }

  // 12N-K…V. Individual gate statuses.
  add("12N-K: tvl_mapping gate is blocked", gateStatus("tvl_mapping") === "blocked", `status=${gateStatus("tvl_mapping")}`);
  add("12N-L: risk_scores gate is not_started or blocked", gateStatus("risk_scores") === "not_started" || gateStatus("risk_scores") === "blocked", `status=${gateStatus("risk_scores")}`);
  add("12N-M: audit_status gate is blocked", gateStatus("audit_status") === "blocked", `status=${gateStatus("audit_status")}`);
  add("12N-N: withdrawal_data gate is blocked", gateStatus("withdrawal_data") === "blocked", `status=${gateStatus("withdrawal_data")}`);
  add("12N-O: fee_data gate is blocked", gateStatus("fee_data") === "blocked", `status=${gateStatus("fee_data")}`);
  add("12N-P: stage_2_dry_run gate is blocked", gateStatus("stage_2_dry_run") === "blocked", `status=${gateStatus("stage_2_dry_run")}`);
  add("12N-Q: product_copy_compliance gate is blocked", gateStatus("product_copy_compliance") === "blocked", `status=${gateStatus("product_copy_compliance")}`);
  add("12N-R: eligibility gate is pass", gateStatus("eligibility") === "pass", `status=${gateStatus("eligibility")}`);
  add("12N-S: scoring gate is pass", gateStatus("scoring") === "pass", `status=${gateStatus("scoring")}`);
  add("12N-T: fallback_behavior gate is pass", gateStatus("fallback_behavior") === "pass", `status=${gateStatus("fallback_behavior")}`);
  add("12N-U: transaction_boundary gate is pass", gateStatus("transaction_boundary") === "pass", `status=${gateStatus("transaction_boundary")}`);
  add("12N-V: ui_readiness gate is blocked", gateStatus("ui_readiness") === "blocked", `status=${gateStatus("ui_readiness")}`);

  // 12N-W. Four missing-TVL blockers.
  {
    const need = ["missing_tvl_jupsol", "missing_tvl_msol", "missing_tvl_jitosol", "missing_tvl_bsol"];
    const have = need.filter((id) => blockerIds.includes(id));
    add("12N-W: blocking reasons include the four missing TVL pool blockers", have.length === 4, `have=${have.join(",")}`);
  }
  // 12N-X. riskScore-not-assigned blocker.
  add("12N-X: blocking reasons include riskScore-not-assigned blocker", blockerIds.includes("risk_scores_not_assigned"), `has=${blockerIds.includes("risk_scores_not_assigned")}`);
  // 12N-Y. withdrawal + fee blockers.
  add("12N-Y: blocking reasons include withdrawal and fee blockers", blockerIds.includes("withdrawal_data_missing") && blockerIds.includes("fee_data_missing"), `wd=${blockerIds.includes("withdrawal_data_missing")} fee=${blockerIds.includes("fee_data_missing")}`);
  // 12N-Z. show-in-ui + implemented-false blockers.
  add("12N-Z: blocking reasons include show-in-ui disabled and implemented-false blockers", blockerIds.includes("show_in_ui_disabled") && blockerIds.includes("selection_implemented_false"), `ui=${blockerIds.includes("show_in_ui_disabled")} impl=${blockerIds.includes("selection_implemented_false")}`);

  // 12N-AA. No selectedProtocolId/Name in go/no-go result.
  {
    const json = JSON.stringify(gng);
    const noSel = !("selectedProtocolId" in gng) && !("selectedProtocolName" in gng) && !json.includes("selectedProtocolId") && !json.includes("selectedProtocolName");
    add("12N-AA: no selectedProtocolId/Name in go/no-go result", noSel, `hasKey=${"selectedProtocolId" in gng}`);
  }
  // 12N-AB. Live staking protocolSelection.status remains not_evaluated.
  add("12N-AB: live staking protocolSelection.status remains not_evaluated", staking?.protocolSelection?.status === "not_evaluated", `status=${staking?.protocolSelection?.status}`);
  // 12N-AC. No live suggestion has selectedProtocolId/Name.
  {
    const all = [...stakingRun.suggestions, ...stableRun.suggestions];
    const bad = all.filter((s) => s.protocolSelection?.selectedProtocolId != null || s.protocolSelection?.selectedProtocolName != null);
    add("12N-AC: no live suggestion has selectedProtocolId/Name", bad.length === 0, `violations=${bad.length}`);
  }
  // 12N-AD. Cards/modal do not expose go/no-go data or protocol names.
  {
    const tokens = ["Jupiter", "Marinade", "Jito", "BlazeStake", "Sanctum", "JupSOL", "productionReady", "go_no_go", "missing_tvl_", "GoNoGo"];
    const scan = (s: typeof staking) => JSON.stringify(toSuggestionCard(s!)) + JSON.stringify(s?.reviewDetails);
    const json = scan(staking) + scan(stable);
    const leaks = tokens.filter((t) => json.includes(t));
    add("12N-AD: cards/modal never expose go/no-go data or protocol names", leaks.length === 0, `leaks=${leaks.join(",") || "none"}`);
  }
  // 12N-AE/AF/AG. Global selection flags at safe defaults.
  add("12N-AE: PROTOCOL_SELECTION_IMPLEMENTED remains false", PROTOCOL_SELECTION_IMPLEMENTED === false, `flag=${PROTOCOL_SELECTION_IMPLEMENTED}`);
  add("12N-AF: PROTOCOL_SELECTION_SHOW_IN_UI remains false", PROTOCOL_SELECTION_SHOW_IN_UI === false, `flag=${PROTOCOL_SELECTION_SHOW_IN_UI}`);
  add("12N-AG: PROTOCOL_SELECTION_ALLOW_TRANSACTIONS remains false", PROTOCOL_SELECTION_ALLOW_TRANSACTIONS === false, `flag=${PROTOCOL_SELECTION_ALLOW_TRANSACTIONS}`);
  // 12N-AH. No transaction/signature/swap path in go/no-go output.
  {
    const json = (JSON.stringify(gng) + JSON.stringify(getProtocolSelectionBlockingReasons())).toLowerCase();
    const txTokens = ["sendtransaction", "signtransaction", "signalltransactions", "signmessage", "publickey", "swap", "deposit", "withdraw("];
    const hits = txTokens.filter((t) => json.includes(t));
    add("12N-AH: no transaction/signature/swap path in go/no-go output", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }
  // 12N-AK. No forbidden investment claims in go/no-go output (existing forbidden-copy list).
  {
    const json = (JSON.stringify(gng) + JSON.stringify(getProtocolSelectionBlockingReasons())).toLowerCase();
    const forbidden = ["best", "safest", "optimal", "guaranteed", "risk-free", "recommended"];
    const hits = forbidden.filter((w) => json.includes(w));
    add("12N-AK: no forbidden investment claims in go/no-go output", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 12O — SOL liquid-staking data sourcing pack (proposals only).
 * Source candidates never change production data, eligibility, or the UI.
 * ------------------------------------------------------------------ */
export function runSolLiquidStakingSourceCandidateFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2);
  const stakingRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stableRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT);
  const staking = stakingRun.suggestions.find((s) => s.category === "staking");
  const stable = stableRun.suggestions.find((s) => s.category === "stable_yield");
  const ids = [...SOL_LIQUID_STAKING_CANDIDATE_IDS];
  const market = buildSolLiquidStakingMarketDataFromExistingSources();
  const gng = getProtocolSelectionGoNoGo("t");
  const gateStatus = (gate: ProtocolSelectionGoNoGoGate) => gng.checks.find((c) => c.gate === gate)?.status;

  // 12O-B. Source-candidate registry exists (all five candidates represented).
  {
    const covered = ids.every((id) => getSolLiquidStakingSourceCandidates(id).length > 0);
    add("12O-B: source candidate registry exists", SOL_LIQUID_STAKING_SOURCE_CANDIDATES.length > 0 && covered && SOL_LIQUID_STAKING_SOURCE_CANDIDATES_ARE_PROPOSALS_ONLY === true, `n=${SOL_LIQUID_STAKING_SOURCE_CANDIDATES.length} affectsProd=${SOL_LIQUID_STAKING_SOURCE_CANDIDATES_AFFECT_PRODUCTION}`);
  }
  // 12O-C. Source candidates do not assign riskScore (no numeric proposedValue; registry doesn't touch risk data).
  {
    const noNumericValue = SOL_LIQUID_STAKING_SOURCE_CANDIDATES.every((s) => s.proposedValue === undefined || typeof s.proposedValue === "string");
    const riskStillAbsent = ids.every((id) => getProtocolRiskData(id).riskScore === undefined);
    add("12O-C: source candidates do not assign riskScore", noNumericValue && riskStillAbsent && SOL_LIQUID_STAKING_SOURCE_CANDIDATES_AFFECT_PRODUCTION === false, `numericSafe=${noNumericValue} riskAbsent=${riskStillAbsent}`);
  }
  // 12O-D. Source candidates do not change ProtocolMarketData (tvl/withdrawal/fees absent).
  {
    const unchanged = ids.every((id) => market[id].tvlUsd === undefined && market[id].withdrawalTimeHours === undefined && market[id].fees === undefined);
    add("12O-D: source candidates do not change ProtocolMarketData", unchanged, `jupiterTvl=${market.jupiter.tvlUsd}`);
  }
  // 12O-E. Source candidates do not change ProtocolRiskData (riskScore absent, audit unknown).
  {
    const unchanged = ids.every((id) => getProtocolRiskData(id).riskScore === undefined && getProtocolRiskData(id).auditStatus === "unknown");
    add("12O-E: source candidates do not change ProtocolRiskData", unchanged, `unchanged=${unchanged}`);
  }
  // 12O-F. Proposed TVL sources are NOT auto-added to DEFILLAMA_POOL_MAPPINGS.
  {
    const keys = Object.keys(DEFILLAMA_POOL_MAPPINGS);
    const onlySanctum = keys.length === 1 && keys[0] === "sanctum";
    const proposedNotMapped = getProposedTvlPoolCandidates().every((s) => !(s.protocolId in DEFILLAMA_POOL_MAPPINGS));
    add("12O-F: proposed TVL sources not auto-added to DEFILLAMA_POOL_MAPPINGS", onlySanctum && proposedNotMapped, `keys=${keys.join(",")}`);
  }
  // 12O-G. Unverified TVL mappings remain missing (source status).
  {
    const fourMissing = ["jupiter", "marinade", "jito", "blazestake"].every((id) => getSolLiquidStakingSourceStatus(id, "tvl") === "missing");
    add("12O-G: unverified TVL mappings remain missing", fourMissing, `fourMissing=${fourMissing}`);
  }
  // 12O-H. Withdrawal source candidates do not assign withdrawalTimeHours.
  add("12O-H: withdrawal candidates do not assign withdrawalTimeHours", ids.every((id) => market[id].withdrawalTimeHours === undefined), `jupiterWd=${market.jupiter.withdrawalTimeHours}`);
  // 12O-I. Fee source candidates do not assign fee values.
  add("12O-I: fee candidates do not assign fee values", ids.every((id) => market[id].fees === undefined), `jupiterFees=${market.jupiter.fees}`);
  // 12O-J. Audit source candidates do not change auditStatus from unknown.
  add("12O-J: audit candidates do not change auditStatus from unknown", ids.every((id) => getProtocolRiskData(id).auditStatus === "unknown"), "all unknown");
  // 12O-K. riskScore remains absent for all five.
  add("12O-K: riskScore remains absent for all five", ids.every((id) => getProtocolRiskData(id).riskScore === undefined), "no riskScore");

  // 12O-L…Q. Go/no-go unchanged.
  add("12O-L: getProtocolSelectionGoNoGo().productionReady remains false", gng.productionReady === false, `v=${gng.productionReady}`);
  add("12O-M: tvl_mapping gate remains blocked", gateStatus("tvl_mapping") === "blocked", `status=${gateStatus("tvl_mapping")}`);
  add("12O-N: risk_scores gate remains not_started or blocked", gateStatus("risk_scores") === "not_started" || gateStatus("risk_scores") === "blocked", `status=${gateStatus("risk_scores")}`);
  add("12O-O: audit_status gate remains blocked", gateStatus("audit_status") === "blocked", `status=${gateStatus("audit_status")}`);
  add("12O-P: withdrawal_data gate remains blocked", gateStatus("withdrawal_data") === "blocked", `status=${gateStatus("withdrawal_data")}`);
  add("12O-Q: fee_data gate remains blocked", gateStatus("fee_data") === "blocked", `status=${gateStatus("fee_data")}`);

  // 12O-R. Live staking protocolSelection.status remains not_evaluated.
  add("12O-R: live staking protocolSelection.status remains not_evaluated", staking?.protocolSelection?.status === "not_evaluated", `status=${staking?.protocolSelection?.status}`);
  // 12O-S. No live suggestion has selectedProtocolId/Name.
  {
    const all = [...stakingRun.suggestions, ...stableRun.suggestions];
    const bad = all.filter((s) => s.protocolSelection?.selectedProtocolId != null || s.protocolSelection?.selectedProtocolName != null);
    add("12O-S: no live suggestion has selectedProtocolId/Name", bad.length === 0, `violations=${bad.length}`);
  }
  // 12O-T. Cards/modal do not expose source candidates or protocol names.
  {
    const tokens = ["Jupiter", "Marinade", "Jito", "BlazeStake", "Sanctum", "JupSOL", "proposedValue", "needs_review", "SourceCandidate", "DefiLlama"];
    const scan = (s: typeof staking) => JSON.stringify(toSuggestionCard(s!)) + JSON.stringify(s?.reviewDetails);
    const json = scan(staking) + scan(stable);
    const leaks = tokens.filter((t) => json.includes(t));
    add("12O-T: cards/modal never expose source candidates or protocol names", leaks.length === 0, `leaks=${leaks.join(",") || "none"}`);
  }
  // 12O-U/V/W. Flags at safe defaults.
  add("12O-U: PROTOCOL_SELECTION_IMPLEMENTED remains false", PROTOCOL_SELECTION_IMPLEMENTED === false, `flag=${PROTOCOL_SELECTION_IMPLEMENTED}`);
  add("12O-V: PROTOCOL_SELECTION_SHOW_IN_UI remains false", PROTOCOL_SELECTION_SHOW_IN_UI === false, `flag=${PROTOCOL_SELECTION_SHOW_IN_UI}`);
  add("12O-W: PROTOCOL_SELECTION_ALLOW_TRANSACTIONS remains false", PROTOCOL_SELECTION_ALLOW_TRANSACTIONS === false, `flag=${PROTOCOL_SELECTION_ALLOW_TRANSACTIONS}`);
  // 12O-X. No transaction/signature/swap path in source-candidate output.
  {
    const json = JSON.stringify(SOL_LIQUID_STAKING_SOURCE_CANDIDATES).toLowerCase();
    const txTokens = ["sendtransaction", "signtransaction", "signalltransactions", "signmessage", "publickey", "swap(", "deposit(", "withdraw("];
    const hits = txTokens.filter((t) => json.includes(t));
    add("12O-X: no transaction/signature/swap path in source-candidate output", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }
  // 12O-Z. No forbidden investment claims in source-candidate registry (existing forbidden-copy list).
  {
    const json = JSON.stringify(SOL_LIQUID_STAKING_SOURCE_CANDIDATES).toLowerCase();
    const forbidden = ["best", "safest", "optimal", "guaranteed", "risk-free", "recommended"];
    const hits = forbidden.filter((w) => json.includes(w));
    add("12O-Z: no forbidden investment claims in source-candidate registry", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 12P — protocol riskScore rubric approval pack (draft, not approved).
 * Rubric assigns no score, is not approved, and changes no production behavior.
 * ------------------------------------------------------------------ */
export function runProtocolRiskRubricFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2);
  const stakingRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stableRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT);
  const staking = stakingRun.suggestions.find((s) => s.category === "staking");
  const stable = stableRun.suggestions.find((s) => s.category === "stable_yield");
  const ids = [...SOL_LIQUID_STAKING_CANDIDATE_IDS];

  const rubric = getProtocolRiskRubric();
  const dims = getProtocolRiskRubricDimensions();
  const weightOf = (id: ProtocolRiskRubricDimensionId) => dims.find((d) => d.id === id)?.weight;
  const gng = getProtocolSelectionGoNoGo("t");
  const gateStatus = (gate: ProtocolSelectionGoNoGoGate) => gng.checks.find((c) => c.gate === gate)?.status;

  // 12P-A…D. Rubric scoping constants.
  add("12P-A: PROTOCOL_RISK_RUBRIC_EXISTS is true", PROTOCOL_RISK_RUBRIC_EXISTS === true, `flag=${PROTOCOL_RISK_RUBRIC_EXISTS}`);
  add("12P-B: PROTOCOL_RISK_RUBRIC_APPROVED is false", PROTOCOL_RISK_RUBRIC_APPROVED === false, `flag=${PROTOCOL_RISK_RUBRIC_APPROVED}`);
  add("12P-C: PROTOCOL_RISK_RUBRIC_ASSIGNS_SCORES is false", PROTOCOL_RISK_RUBRIC_ASSIGNS_SCORES === false, `flag=${PROTOCOL_RISK_RUBRIC_ASSIGNS_SCORES}`);
  add("12P-D: PROTOCOL_RISK_RUBRIC_AFFECTS_PRODUCTION is false", PROTOCOL_RISK_RUBRIC_AFFECTS_PRODUCTION === false, `flag=${PROTOCOL_RISK_RUBRIC_AFFECTS_PRODUCTION}`);

  // 12P-E. Exactly six dimensions.
  add("12P-E: rubric has exactly six dimensions", dims.length === 6, `n=${dims.length}`);
  // 12P-F. Weights total 100.
  add("12P-F: rubric weights total 100", validateProtocolRiskRubricWeights() === true && rubric.totalWeight === 100, `total=${rubric.totalWeight}`);
  // 12P-G. Each dimension has evidenceRequired entries.
  add("12P-G: each dimension has evidenceRequired entries", dims.every((d) => Array.isArray(d.evidenceRequired) && d.evidenceRequired.length > 0), `ok=${dims.every((d) => d.evidenceRequired.length > 0)}`);
  // 12P-H…M. Individual dimension weights.
  add("12P-H: audit_security weight is 25", weightOf("audit_security") === 25, `w=${weightOf("audit_security")}`);
  add("12P-I: maturity weight is 20", weightOf("maturity") === 20, `w=${weightOf("maturity")}`);
  add("12P-J: tvl_adoption weight is 15", weightOf("tvl_adoption") === 15, `w=${weightOf("tvl_adoption")}`);
  add("12P-K: withdrawal_fee_transparency weight is 15", weightOf("withdrawal_fee_transparency") === 15, `w=${weightOf("withdrawal_fee_transparency")}`);
  add("12P-L: operational_dependency_risk weight is 15", weightOf("operational_dependency_risk") === 15, `w=${weightOf("operational_dependency_risk")}`);
  add("12P-M: incident_history weight is 10", weightOf("incident_history") === 10, `w=${weightOf("incident_history")}`);

  // 12P-N/O. Approval + assignment gates are false.
  add("12P-N: isProtocolRiskRubricApproved() returns false", isProtocolRiskRubricApproved() === false && rubric.approvalStatus !== "approved", `status=${rubric.approvalStatus}`);
  add("12P-O: canAssignProtocolRiskScores() returns false", canAssignProtocolRiskScores() === false, `v=${canAssignProtocolRiskScores()}`);
  // 12P-P. Empty draft: score absent + scoreAssigned false + not approved.
  {
    const draft = createEmptyProtocolRiskScoreDraft("jupiter");
    const ok = draft.score === undefined && draft.scoreAssigned === false && draft.approvalStatus !== "approved" && draft.evidenceReviews.every((r) => r.evidenceStatus === "not_reviewed");
    add("12P-P: empty draft has score absent and scoreAssigned false", ok, `score=${draft.score} assigned=${draft.scoreAssigned}`);
  }
  // 12P-Q. riskScore remains absent for all five.
  add("12P-Q: riskScore remains absent for all five", ids.every((id) => getProtocolRiskData(id).riskScore === undefined), "no riskScore");
  // 12P-R. Risk registry still holds no assigned riskScore values.
  {
    const noScores = ids.every((id) => getProtocolRiskData(id).riskScore === undefined) && getProtocolRiskData("kamino").riskScore === undefined;
    add("12P-R: protocolRiskRegistry still has no assigned riskScore values", noScores, `noScores=${noScores}`);
  }
  // 12P-S. productionReady remains false.
  add("12P-S: getProtocolSelectionGoNoGo().productionReady remains false", gng.productionReady === false, `v=${gng.productionReady}`);
  // 12P-T. risk methodology / risk score gates remain blocked or not_started.
  {
    const method = gateStatus("risk_methodology");
    const scores = gateStatus("risk_scores");
    const ok = (method === "blocked" || method === "not_started") && (scores === "blocked" || scores === "not_started");
    add("12P-T: risk methodology / risk score gates remain blocked or not_started", ok, `method=${method} scores=${scores}`);
  }
  // 12P-U. Live staking protocolSelection.status remains not_evaluated.
  add("12P-U: live staking protocolSelection.status remains not_evaluated", staking?.protocolSelection?.status === "not_evaluated", `status=${staking?.protocolSelection?.status}`);
  // 12P-V. No live suggestion has selectedProtocolId/Name.
  {
    const all = [...stakingRun.suggestions, ...stableRun.suggestions];
    const bad = all.filter((s) => s.protocolSelection?.selectedProtocolId != null || s.protocolSelection?.selectedProtocolName != null);
    add("12P-V: no live suggestion has selectedProtocolId/Name", bad.length === 0, `violations=${bad.length}`);
  }
  // 12P-W. Cards/modal do not expose risk rubric or protocol recommendations.
  {
    const tokens = ["Jupiter", "Marinade", "Jito", "BlazeStake", "Sanctum", "JupSOL", "audit_security", "riskRubric", "ProtocolRiskRubric", "scoringGuidance"];
    const scan = (s: typeof staking) => JSON.stringify(toSuggestionCard(s!)) + JSON.stringify(s?.reviewDetails);
    const json = scan(staking) + scan(stable);
    const leaks = tokens.filter((t) => json.includes(t));
    add("12P-W: cards/modal never expose risk rubric or protocol names", leaks.length === 0, `leaks=${leaks.join(",") || "none"}`);
  }
  // 12P-X/Y/Z. Flags at safe defaults.
  add("12P-X: PROTOCOL_SELECTION_IMPLEMENTED remains false", PROTOCOL_SELECTION_IMPLEMENTED === false, `flag=${PROTOCOL_SELECTION_IMPLEMENTED}`);
  add("12P-Y: PROTOCOL_SELECTION_SHOW_IN_UI remains false", PROTOCOL_SELECTION_SHOW_IN_UI === false, `flag=${PROTOCOL_SELECTION_SHOW_IN_UI}`);
  add("12P-Z: PROTOCOL_SELECTION_ALLOW_TRANSACTIONS remains false", PROTOCOL_SELECTION_ALLOW_TRANSACTIONS === false, `flag=${PROTOCOL_SELECTION_ALLOW_TRANSACTIONS}`);
  // 12P-AA. No transaction/signature/swap path in rubric output.
  {
    const json = (JSON.stringify(rubric) + JSON.stringify(createEmptyProtocolRiskScoreDraft("jupiter"))).toLowerCase();
    const txTokens = ["sendtransaction", "signtransaction", "signalltransactions", "signmessage", "publickey", "swap(", "deposit(", "withdraw("];
    const hits = txTokens.filter((t) => json.includes(t));
    add("12P-AA: no transaction/signature/swap path in rubric output", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }
  // 12P-AD. No forbidden investment claims in rubric output (existing forbidden-copy list).
  {
    const json = (JSON.stringify(rubric) + JSON.stringify(getProtocolRiskRubricDimensions())).toLowerCase();
    const forbidden = ["best", "safest", "optimal", "guaranteed", "risk-free", "recommended"];
    const hits = forbidden.filter((w) => json.includes(w));
    add("12P-AD: no forbidden investment claims in rubric output", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 12Q — SOL liquid-staking risk evidence drafts (gathering only).
 * 30 drafts, no score assigned, rubric unapproved, no production change.
 * ------------------------------------------------------------------ */
export function runSolLiquidStakingEvidenceFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2);
  const stakingRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stableRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT);
  const staking = stakingRun.suggestions.find((s) => s.category === "staking");
  const stable = stableRun.suggestions.find((s) => s.category === "stable_yield");
  const ids = [...SOL_LIQUID_STAKING_CANDIDATE_IDS];
  const dims: ProtocolRiskRubricDimensionId[] = ["audit_security", "maturity", "tvl_adoption", "withdrawal_fee_transparency", "operational_dependency_risk", "incident_history"];

  const drafts = SOL_LIQUID_STAKING_EVIDENCE_DRAFTS;
  const summary = summarizeEvidenceCoverage();
  const gng = getProtocolSelectionGoNoGo("t");
  const gateStatus = (gate: ProtocolSelectionGoNoGoGate) => gng.checks.find((c) => c.gate === gate)?.status;

  // 12Q-A…D. Evidence-draft scoping constants.
  add("12Q-A: PROTOCOL_RISK_EVIDENCE_DRAFTS_EXIST is true", PROTOCOL_RISK_EVIDENCE_DRAFTS_EXIST === true, `flag=${PROTOCOL_RISK_EVIDENCE_DRAFTS_EXIST}`);
  add("12Q-B: PROTOCOL_RISK_EVIDENCE_DRAFTS_APPROVED is false", PROTOCOL_RISK_EVIDENCE_DRAFTS_APPROVED === false, `flag=${PROTOCOL_RISK_EVIDENCE_DRAFTS_APPROVED}`);
  add("12Q-C: PROTOCOL_RISK_EVIDENCE_DRAFTS_ASSIGN_SCORES is false", PROTOCOL_RISK_EVIDENCE_DRAFTS_ASSIGN_SCORES === false, `flag=${PROTOCOL_RISK_EVIDENCE_DRAFTS_ASSIGN_SCORES}`);
  add("12Q-D: PROTOCOL_RISK_EVIDENCE_DRAFTS_AFFECT_PRODUCTION is false", PROTOCOL_RISK_EVIDENCE_DRAFTS_AFFECT_PRODUCTION === false, `flag=${PROTOCOL_RISK_EVIDENCE_DRAFTS_AFFECT_PRODUCTION}`);

  // 12Q-E. Exactly 30 drafts.
  add("12Q-E: there are 30 evidence drafts", drafts.length === 30 && summary.totalDrafts === 30, `n=${drafts.length}`);
  // 12Q-F. All five candidates covered.
  {
    const covered = ids.every((id) => getSolLiquidStakingEvidenceDrafts(id).length === 6);
    add("12Q-F: all five SOL LST candidates covered", covered && summary.protocolsCovered === 5, `protocols=${summary.protocolsCovered}`);
  }
  // 12Q-G. All six dimensions covered per candidate.
  {
    const ok = ids.every((id) => {
      const set = new Set(getSolLiquidStakingEvidenceDrafts(id).map((d) => d.dimensionId));
      return dims.every((dim) => set.has(dim));
    });
    add("12Q-G: all six rubric dimensions covered per candidate", ok && summary.dimensionsCovered === 6, `dims=${summary.dimensionsCovered}`);
  }
  // 12Q-H. Every draft scoreAssigned false.
  add("12Q-H: every evidence draft has scoreAssigned false", drafts.every((d) => d.scoreAssigned === false), `ok=${drafts.every((d) => d.scoreAssigned === false)}`);
  // 12Q-I. No draft has a score field.
  add("12Q-I: no evidence draft has a score field", drafts.every((d) => !("score" in d)), `ok=${drafts.every((d) => !("score" in d))}`);
  // 12Q-J. scoreAssignedCount is 0.
  add("12Q-J: summarizeEvidenceCoverage().scoreAssignedCount is 0", summary.scoreAssignedCount === 0, `count=${summary.scoreAssignedCount}`);
  // 12Q-K. Drafts do not change protocolRiskRegistry riskScore values.
  add("12Q-K: evidence drafts do not change protocolRiskRegistry riskScore", ids.every((id) => getProtocolRiskData(id).riskScore === undefined), "no riskScore");
  // 12Q-L. riskScore remains absent for all five.
  add("12Q-L: riskScore remains absent for all five", ids.every((id) => getProtocolRiskData(id).riskScore === undefined), "absent");
  // 12Q-M/N. Rubric approval + assignment gates false.
  add("12Q-M: PROTOCOL_RISK_RUBRIC_APPROVED remains false", PROTOCOL_RISK_RUBRIC_APPROVED === false, `flag=${PROTOCOL_RISK_RUBRIC_APPROVED}`);
  add("12Q-N: canAssignProtocolRiskScores() remains false", canAssignProtocolRiskScores() === false, `v=${canAssignProtocolRiskScores()}`);
  // 12Q-O. productionReady remains false.
  add("12Q-O: getProtocolSelectionGoNoGo().productionReady remains false", gng.productionReady === false, `v=${gng.productionReady}`);
  // 12Q-P…S. Gates unchanged.
  add("12Q-P: risk_scores gate remains not_started or blocked", gateStatus("risk_scores") === "not_started" || gateStatus("risk_scores") === "blocked", `status=${gateStatus("risk_scores")}`);
  add("12Q-Q: audit_status gate remains blocked", gateStatus("audit_status") === "blocked", `status=${gateStatus("audit_status")}`);
  add("12Q-R: withdrawal_data gate remains blocked", gateStatus("withdrawal_data") === "blocked", `status=${gateStatus("withdrawal_data")}`);
  add("12Q-S: fee_data gate remains blocked", gateStatus("fee_data") === "blocked", `status=${gateStatus("fee_data")}`);
  // 12Q-T. Live staking protocolSelection.status remains not_evaluated.
  add("12Q-T: live staking protocolSelection.status remains not_evaluated", staking?.protocolSelection?.status === "not_evaluated", `status=${staking?.protocolSelection?.status}`);
  // 12Q-U. No live suggestion has selectedProtocolId/Name.
  {
    const all = [...stakingRun.suggestions, ...stableRun.suggestions];
    const bad = all.filter((s) => s.protocolSelection?.selectedProtocolId != null || s.protocolSelection?.selectedProtocolName != null);
    add("12Q-U: no live suggestion has selectedProtocolId/Name", bad.length === 0, `violations=${bad.length}`);
  }
  // 12Q-V. Cards/modal do not expose evidence drafts or protocol names.
  {
    const tokens = ["Jupiter", "Marinade", "Jito", "BlazeStake", "Sanctum", "JupSOL", "evidenceSummary", "unresolvedQuestions", "EvidenceDraft", "audit_security"];
    const scan = (s: typeof staking) => JSON.stringify(toSuggestionCard(s!)) + JSON.stringify(s?.reviewDetails);
    const json = scan(staking) + scan(stable);
    const leaks = tokens.filter((t) => json.includes(t));
    add("12Q-V: cards/modal never expose evidence drafts or protocol names", leaks.length === 0, `leaks=${leaks.join(",") || "none"}`);
  }
  // 12Q-W/X/Y. Flags at safe defaults.
  add("12Q-W: PROTOCOL_SELECTION_IMPLEMENTED remains false", PROTOCOL_SELECTION_IMPLEMENTED === false, `flag=${PROTOCOL_SELECTION_IMPLEMENTED}`);
  add("12Q-X: PROTOCOL_SELECTION_SHOW_IN_UI remains false", PROTOCOL_SELECTION_SHOW_IN_UI === false, `flag=${PROTOCOL_SELECTION_SHOW_IN_UI}`);
  add("12Q-Y: PROTOCOL_SELECTION_ALLOW_TRANSACTIONS remains false", PROTOCOL_SELECTION_ALLOW_TRANSACTIONS === false, `flag=${PROTOCOL_SELECTION_ALLOW_TRANSACTIONS}`);
  // 12Q-Z. No transaction/signature/swap path in evidence-draft output.
  {
    const json = JSON.stringify(SOL_LIQUID_STAKING_EVIDENCE_DRAFTS).toLowerCase();
    const txTokens = ["sendtransaction", "signtransaction", "signalltransactions", "signmessage", "publickey", "swap(", "deposit(", "withdraw("];
    const hits = txTokens.filter((t) => json.includes(t));
    add("12Q-Z: no transaction/signature/swap path in evidence-draft output", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }
  // 12Q-AC. No forbidden investment claims in evidence-draft output (existing forbidden-copy list).
  {
    const json = JSON.stringify(SOL_LIQUID_STAKING_EVIDENCE_DRAFTS).toLowerCase();
    const forbidden = ["best", "safest", "optimal", "guaranteed", "risk-free", "recommended"];
    const hits = forbidden.filter((w) => json.includes(w));
    add("12Q-AC: no forbidden investment claims in evidence-draft output", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 12R — reviewer approval / riskScore assignment decision gate.
 * Decision not submitted, no candidate ready, no score assigned, no prod change.
 * ------------------------------------------------------------------ */
export function runProtocolRiskApprovalDecisionFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2);
  const stakingRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stableRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT);
  const staking = stakingRun.suggestions.find((s) => s.category === "staking");
  const stable = stableRun.suggestions.find((s) => s.category === "stable_yield");
  const ids = [...SOL_LIQUID_STAKING_CANDIDATE_IDS];

  const decision = getCurrentProtocolRiskRubricApprovalDecision();
  const gateResult = evaluateProtocolRiskApprovalGate();
  const gng = getProtocolSelectionGoNoGo("t");
  const gateStatus = (gate: ProtocolSelectionGoNoGoGate) => gng.checks.find((c) => c.gate === gate)?.status;

  // 12R-A…D. Decision scoping constants.
  add("12R-A: PROTOCOL_RISK_APPROVAL_DECISION_EXISTS is true", PROTOCOL_RISK_APPROVAL_DECISION_EXISTS === true, `flag=${PROTOCOL_RISK_APPROVAL_DECISION_EXISTS}`);
  add("12R-B: PROTOCOL_RISK_APPROVAL_DECISION_APPROVED is false", PROTOCOL_RISK_APPROVAL_DECISION_APPROVED === false, `flag=${PROTOCOL_RISK_APPROVAL_DECISION_APPROVED}`);
  add("12R-C: PROTOCOL_RISK_APPROVAL_DECISION_ASSIGN_SCORES is false", PROTOCOL_RISK_APPROVAL_DECISION_ASSIGN_SCORES === false, `flag=${PROTOCOL_RISK_APPROVAL_DECISION_ASSIGN_SCORES}`);
  add("12R-D: PROTOCOL_RISK_APPROVAL_DECISION_AFFECTS_PRODUCTION is false", PROTOCOL_RISK_APPROVAL_DECISION_AFFECTS_PRODUCTION === false, `flag=${PROTOCOL_RISK_APPROVAL_DECISION_AFFECTS_PRODUCTION}`);

  // 12R-E…G. Current decision state.
  add("12R-E: current decision status is not_submitted", decision.status === "not_submitted", `status=${decision.status}`);
  add("12R-F: rubricApproved is false", decision.rubricApproved === false, `v=${decision.rubricApproved}`);
  add("12R-G: scoreAssignmentAllowed is false", decision.scoreAssignmentAllowed === false, `v=${decision.scoreAssignmentAllowed}`);

  // 12R-H…J. Gate result invariants.
  add("12R-H: anyCandidateReadyForScoring is false", gateResult.anyCandidateReadyForScoring === false, `v=${gateResult.anyCandidateReadyForScoring}`);
  add("12R-I: anyScoreAssigned is false", gateResult.anyScoreAssigned === false, `v=${gateResult.anyScoreAssigned}`);
  add("12R-J: productionAffected is false", gateResult.productionAffected === false, `v=${gateResult.productionAffected}`);

  // 12R-K. One gate per candidate.
  add("12R-K: one candidate gate per SOL LST candidate", gateResult.candidateGates.length === 5 && ids.every((id) => gateResult.candidateGates.some((g) => g.protocolId === id)), `n=${gateResult.candidateGates.length}`);
  // 12R-L. No gate allows scoring.
  add("12R-L: no candidate gate has scoreAssignmentAllowed true", gateResult.candidateGates.every((g) => g.scoreAssignmentAllowed === false), `ok=${gateResult.candidateGates.every((g) => g.scoreAssignmentAllowed === false)}`);
  // 12R-M. No gate has scoreAssigned true.
  add("12R-M: no candidate gate has scoreAssigned true", gateResult.candidateGates.every((g) => g.scoreAssigned === false), `ok=${gateResult.candidateGates.every((g) => g.scoreAssigned === false)}`);
  // 12R-N. No candidate is approved_for_scoring.
  add("12R-N: no candidate status is approved_for_scoring", gateResult.candidateGates.every((g) => g.status !== "approved_for_scoring"), `statuses=${gateResult.candidateGates.map((g) => g.status).join(",")}`);
  // 12R-O. canAssignRiskScoreToProtocol false for all five.
  add("12R-O: canAssignRiskScoreToProtocol returns false for all five", ids.every((id) => canAssignRiskScoreToProtocol(id) === false), "all false");
  // 12R-P. Sanctum partial TVL does not make it ready for scoring.
  {
    const sanctum = gateResult.candidateGates.find((g) => g.protocolId === "sanctum");
    const ok = sanctum != null && sanctum.status !== "approved_for_scoring" && sanctum.status !== "ready_for_review" && !sanctum.gatheredDimensions.includes("tvl_adoption");
    add("12R-P: Sanctum partial TVL evidence does not make it ready for scoring", ok, `status=${sanctum?.status} tvlGathered=${sanctum?.gatheredDimensions.includes("tvl_adoption")}`);
  }
  // 12R-Q. Partial/needs_review evidence keeps a candidate evidence_incomplete/blocked.
  {
    const ok = gateResult.candidateGates.every((g) => (g.status === "evidence_incomplete" || g.status === "blocked") && g.missingDimensions.length === 6);
    add("12R-Q: partial/needs_review evidence keeps candidate incomplete", ok, `statuses=${gateResult.candidateGates.map((g) => g.status).join(",")}`);
  }
  // 12R-R/S. No riskScore assigned anywhere.
  add("12R-R: no riskScore is assigned anywhere", ids.every((id) => getProtocolRiskData(id).riskScore === undefined), "none");
  add("12R-S: riskScore remains absent for all five", ids.every((id) => getProtocolRiskData(id).riskScore === undefined), "absent");
  // 12R-T/U. Rubric approval gates false.
  add("12R-T: PROTOCOL_RISK_RUBRIC_APPROVED remains false", PROTOCOL_RISK_RUBRIC_APPROVED === false, `flag=${PROTOCOL_RISK_RUBRIC_APPROVED}`);
  add("12R-U: canAssignProtocolRiskScores() remains false", canAssignProtocolRiskScores() === false, `v=${canAssignProtocolRiskScores()}`);
  // 12R-V. productionReady remains false.
  add("12R-V: getProtocolSelectionGoNoGo().productionReady remains false", gng.productionReady === false, `v=${gng.productionReady}`);
  // 12R-W. risk_scores gate remains not_started or blocked.
  add("12R-W: risk_scores gate remains not_started or blocked", gateStatus("risk_scores") === "not_started" || gateStatus("risk_scores") === "blocked", `status=${gateStatus("risk_scores")}`);
  // 12R-X. Live staking protocolSelection.status remains not_evaluated.
  add("12R-X: live staking protocolSelection.status remains not_evaluated", staking?.protocolSelection?.status === "not_evaluated", `status=${staking?.protocolSelection?.status}`);
  // 12R-Y. No live suggestion has selectedProtocolId/Name.
  {
    const all = [...stakingRun.suggestions, ...stableRun.suggestions];
    const bad = all.filter((s) => s.protocolSelection?.selectedProtocolId != null || s.protocolSelection?.selectedProtocolName != null);
    add("12R-Y: no live suggestion has selectedProtocolId/Name", bad.length === 0, `violations=${bad.length}`);
  }
  // 12R-Z. Cards/modal do not expose approval decision or protocol names.
  {
    const tokens = ["Jupiter", "Marinade", "Jito", "BlazeStake", "Sanctum", "JupSOL", "approved_for_scoring", "scoreAssignmentAllowed", "rubricApproved", "ApprovalDecision"];
    const scan = (s: typeof staking) => JSON.stringify(toSuggestionCard(s!)) + JSON.stringify(s?.reviewDetails);
    const json = scan(staking) + scan(stable);
    const leaks = tokens.filter((t) => json.includes(t));
    add("12R-Z: cards/modal never expose approval decision or protocol names", leaks.length === 0, `leaks=${leaks.join(",") || "none"}`);
  }
  // 12R-AA/AB/AC. Flags at safe defaults.
  add("12R-AA: PROTOCOL_SELECTION_IMPLEMENTED remains false", PROTOCOL_SELECTION_IMPLEMENTED === false, `flag=${PROTOCOL_SELECTION_IMPLEMENTED}`);
  add("12R-AB: PROTOCOL_SELECTION_SHOW_IN_UI remains false", PROTOCOL_SELECTION_SHOW_IN_UI === false, `flag=${PROTOCOL_SELECTION_SHOW_IN_UI}`);
  add("12R-AC: PROTOCOL_SELECTION_ALLOW_TRANSACTIONS remains false", PROTOCOL_SELECTION_ALLOW_TRANSACTIONS === false, `flag=${PROTOCOL_SELECTION_ALLOW_TRANSACTIONS}`);
  // 12R-AD. No transaction/signature/swap path in approval-gate output.
  {
    const json = (JSON.stringify(gateResult) + JSON.stringify(decision) + JSON.stringify(evaluateProtocolRiskCandidateScoreAssignmentGate("jupiter"))).toLowerCase();
    const txTokens = ["sendtransaction", "signtransaction", "signalltransactions", "signmessage", "publickey", "swap(", "deposit(", "withdraw("];
    const hits = txTokens.filter((t) => json.includes(t));
    add("12R-AD: no transaction/signature/swap path in approval-gate output", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }
  // 12R-AG. No forbidden investment claims in approval-gate output (existing forbidden-copy list).
  {
    const json = (JSON.stringify(gateResult) + JSON.stringify(decision)).toLowerCase();
    const forbidden = ["best", "safest", "optimal", "guaranteed", "risk-free", "recommended"];
    const hits = forbidden.filter((w) => json.includes(w));
    add("12R-AG: no forbidden investment claims in approval-gate output", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 12S — evidence completion harness for one candidate (Sanctum/INF).
 * Reviews evidence toward gathered; approves nothing, assigns no score.
 * ------------------------------------------------------------------ */
export function runSolLiquidStakingEvidenceCompletionFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2);
  const stakingRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stableRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT);
  const staking = stakingRun.suggestions.find((s) => s.category === "staking");
  const stable = stableRun.suggestions.find((s) => s.category === "stable_yield");
  const ids = [...SOL_LIQUID_STAKING_CANDIDATE_IDS];

  const completion = runEvidenceCompletionForCandidate("sanctum");
  const gateCheck = runSanctumEvidenceCompletionGateCheck();
  const gng = getProtocolSelectionGoNoGo("t");
  const gateStatus = (gate: ProtocolSelectionGoNoGoGate) => gng.checks.find((c) => c.gate === gate)?.status;

  // 12S-A…E. Completion scoping constants + target.
  add("12S-A: PROTOCOL_EVIDENCE_COMPLETION_EXISTS is true", PROTOCOL_EVIDENCE_COMPLETION_EXISTS === true, `flag=${PROTOCOL_EVIDENCE_COMPLETION_EXISTS}`);
  add("12S-B: PROTOCOL_EVIDENCE_COMPLETION_APPROVES_RUBRIC is false", PROTOCOL_EVIDENCE_COMPLETION_APPROVES_RUBRIC === false, `flag=${PROTOCOL_EVIDENCE_COMPLETION_APPROVES_RUBRIC}`);
  add("12S-C: PROTOCOL_EVIDENCE_COMPLETION_ASSIGNS_SCORES is false", PROTOCOL_EVIDENCE_COMPLETION_ASSIGNS_SCORES === false, `flag=${PROTOCOL_EVIDENCE_COMPLETION_ASSIGNS_SCORES}`);
  add("12S-D: PROTOCOL_EVIDENCE_COMPLETION_AFFECTS_PRODUCTION is false", PROTOCOL_EVIDENCE_COMPLETION_AFFECTS_PRODUCTION === false, `flag=${PROTOCOL_EVIDENCE_COMPLETION_AFFECTS_PRODUCTION}`);
  add("12S-E: target protocol is sanctum / INF", PROTOCOL_EVIDENCE_COMPLETION_TARGET_PROTOCOL_ID === "sanctum" && PROTOCOL_EVIDENCE_COMPLETION_TARGET_SYMBOL === "INF", `id=${PROTOCOL_EVIDENCE_COMPLETION_TARGET_PROTOCOL_ID}`);

  // 12S-F…I. Completion result invariants.
  add("12S-F: runEvidenceCompletionForCandidate(sanctum) returns protocolId sanctum", completion.protocolId === "sanctum" && completion.lstSymbol === "INF", `id=${completion.protocolId}`);
  add("12S-G: completion result has scoreAssigned false", completion.scoreAssigned === false, `v=${completion.scoreAssigned}`);
  add("12S-H: completion result has approvedForScoring false", completion.approvedForScoring === false, `v=${completion.approvedForScoring}`);
  add("12S-I: completion result has productionAffected false", completion.productionAffected === false, `v=${completion.productionAffected}`);
  // 12S-J. Partial TVL evidence alone does not mark all dimensions gathered.
  {
    const tvl = completion.dimensionResults.find((r) => r.dimensionId === "tvl_adoption");
    const ok = completion.dimensionsGathered.length < 6 && completion.readyForReview === false && tvl?.nextStatus !== "gathered";
    add("12S-J: partial TVL evidence alone does not mark all dimensions gathered", ok, `gathered=${completion.dimensionsGathered.length} tvl=${tvl?.nextStatus}`);
  }
  // 12S-K. Sanctum is not approved_for_scoring.
  add("12S-K: Sanctum is not approved_for_scoring", gateCheck.candidateGateAfter.status !== "approved_for_scoring", `status=${gateCheck.candidateGateAfter.status}`);
  // 12S-L. canAssignScore remains false.
  add("12S-L: canAssignScore remains false", gateCheck.canAssignScore === false, `v=${gateCheck.canAssignScore}`);
  // 12S-M. Gate-after not approved_for_scoring (and unchanged vs before).
  add("12S-M: candidateGateAfter not approved_for_scoring", gateCheck.candidateGateAfter.status !== "approved_for_scoring" && gateCheck.candidateGateAfter.scoreAssignmentAllowed === false, `after=${gateCheck.candidateGateAfter.status}`);
  // 12S-N/O. No riskScore assigned.
  add("12S-N: no riskScore is assigned", ids.every((id) => getProtocolRiskData(id).riskScore === undefined), "none");
  add("12S-O: riskScore remains absent for all five", ids.every((id) => getProtocolRiskData(id).riskScore === undefined), "absent");
  // 12S-P/Q/R. Approval flags false.
  add("12S-P: PROTOCOL_RISK_RUBRIC_APPROVED remains false", PROTOCOL_RISK_RUBRIC_APPROVED === false, `flag=${PROTOCOL_RISK_RUBRIC_APPROVED}`);
  add("12S-Q: PROTOCOL_RISK_APPROVAL_DECISION_APPROVED remains false", PROTOCOL_RISK_APPROVAL_DECISION_APPROVED === false, `flag=${PROTOCOL_RISK_APPROVAL_DECISION_APPROVED}`);
  add("12S-R: canAssignProtocolRiskScores() remains false", canAssignProtocolRiskScores() === false, `v=${canAssignProtocolRiskScores()}`);
  // 12S-S. productionReady remains false.
  add("12S-S: getProtocolSelectionGoNoGo().productionReady remains false", gng.productionReady === false, `v=${gng.productionReady}`);
  // 12S-T. risk_scores gate remains not_started or blocked.
  add("12S-T: risk_scores gate remains not_started or blocked", gateStatus("risk_scores") === "not_started" || gateStatus("risk_scores") === "blocked", `status=${gateStatus("risk_scores")}`);
  // 12S-U. Live staking protocolSelection.status remains not_evaluated.
  add("12S-U: live staking protocolSelection.status remains not_evaluated", staking?.protocolSelection?.status === "not_evaluated", `status=${staking?.protocolSelection?.status}`);
  // 12S-V. No live suggestion has selectedProtocolId/Name.
  {
    const all = [...stakingRun.suggestions, ...stableRun.suggestions];
    const bad = all.filter((s) => s.protocolSelection?.selectedProtocolId != null || s.protocolSelection?.selectedProtocolName != null);
    add("12S-V: no live suggestion has selectedProtocolId/Name", bad.length === 0, `violations=${bad.length}`);
  }
  // 12S-W. Cards/modal do not expose evidence-completion data or protocol names.
  {
    const tokens = ["Jupiter", "Marinade", "Jito", "BlazeStake", "Sanctum", "JupSOL", "dimensionResults", "readyForReview", "EvidenceCompletion", "canMarkGathered"];
    const scan = (s: typeof staking) => JSON.stringify(toSuggestionCard(s!)) + JSON.stringify(s?.reviewDetails);
    const json = scan(staking) + scan(stable);
    const leaks = tokens.filter((t) => json.includes(t));
    add("12S-W: cards/modal never expose evidence-completion data or protocol names", leaks.length === 0, `leaks=${leaks.join(",") || "none"}`);
  }
  // 12S-X/Y/Z. Flags at safe defaults.
  add("12S-X: PROTOCOL_SELECTION_IMPLEMENTED remains false", PROTOCOL_SELECTION_IMPLEMENTED === false, `flag=${PROTOCOL_SELECTION_IMPLEMENTED}`);
  add("12S-Y: PROTOCOL_SELECTION_SHOW_IN_UI remains false", PROTOCOL_SELECTION_SHOW_IN_UI === false, `flag=${PROTOCOL_SELECTION_SHOW_IN_UI}`);
  add("12S-Z: PROTOCOL_SELECTION_ALLOW_TRANSACTIONS remains false", PROTOCOL_SELECTION_ALLOW_TRANSACTIONS === false, `flag=${PROTOCOL_SELECTION_ALLOW_TRANSACTIONS}`);
  // 12S-AA. No transaction/signature/swap path in completion output.
  {
    const json = (JSON.stringify(completion) + JSON.stringify(gateCheck)).toLowerCase();
    const txTokens = ["sendtransaction", "signtransaction", "signalltransactions", "signmessage", "publickey", "swap(", "deposit(", "withdraw("];
    const hits = txTokens.filter((t) => json.includes(t));
    add("12S-AA: no transaction/signature/swap path in completion output", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }
  // 12S-AD. No forbidden investment claims in completion output (existing forbidden-copy list).
  {
    const json = (JSON.stringify(completion) + JSON.stringify(gateCheck)).toLowerCase();
    const forbidden = ["best", "safest", "optimal", "guaranteed", "risk-free", "recommended"];
    const hits = forbidden.filter((w) => json.includes(w));
    add("12S-AD: no forbidden investment claims in completion output", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 12T — SOL liquid-staking source-verification intake.
 * Source-level review only; no production values, no score, no selection.
 * ------------------------------------------------------------------ */
export function runSolLiquidStakingSourceVerificationFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2);
  const stakingRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stableRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT);
  const staking = stakingRun.suggestions.find((s) => s.category === "staking");
  const stable = stableRun.suggestions.find((s) => s.category === "stable_yield");
  const ids = [...SOL_LIQUID_STAKING_CANDIDATE_IDS];

  const candidates = getSolLiquidStakingSourceVerificationCandidates();
  const results = getSolLiquidStakingSourceVerificationResults();
  const summary = summarizeSolLiquidStakingSourceVerification();
  const sanctumMap = mapVerifiedSourcesToEvidenceDimensions("sanctum");
  const gng = getProtocolSelectionGoNoGo("t");
  const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

  // 12T-A…E. Verification scoping constants.
  add("12T-A: PROTOCOL_SOURCE_VERIFICATION_EXISTS is true", PROTOCOL_SOURCE_VERIFICATION_EXISTS === true, `flag=${PROTOCOL_SOURCE_VERIFICATION_EXISTS}`);
  add("12T-B: PROTOCOL_SOURCE_VERIFICATION_APPROVES_RUBRIC is false", PROTOCOL_SOURCE_VERIFICATION_APPROVES_RUBRIC === false, `flag=${PROTOCOL_SOURCE_VERIFICATION_APPROVES_RUBRIC}`);
  add("12T-C: PROTOCOL_SOURCE_VERIFICATION_ASSIGNS_SCORES is false", PROTOCOL_SOURCE_VERIFICATION_ASSIGNS_SCORES === false, `flag=${PROTOCOL_SOURCE_VERIFICATION_ASSIGNS_SCORES}`);
  add("12T-D: PROTOCOL_SOURCE_VERIFICATION_AFFECTS_PRODUCTION is false", PROTOCOL_SOURCE_VERIFICATION_AFFECTS_PRODUCTION === false, `flag=${PROTOCOL_SOURCE_VERIFICATION_AFFECTS_PRODUCTION}`);
  add("12T-E: PROTOCOL_SOURCE_VERIFICATION_ENABLES_SELECTION is false", PROTOCOL_SOURCE_VERIFICATION_ENABLES_SELECTION === false, `flag=${PROTOCOL_SOURCE_VERIFICATION_ENABLES_SELECTION}`);

  // 12T-F. Candidates cover all five.
  add("12T-F: candidates cover all five SOL LST candidates", ids.every((id) => getSolLiquidStakingSourceVerificationCandidates(id).length > 0) && summary.protocolsCovered.length === 5, `protocols=${summary.protocolsCovered.length}`);
  // 12T-G. TVL candidates cover the four LSTs.
  {
    const four = ["jupiter", "marinade", "jito", "blazestake"];
    const ok = four.every((id) => candidates.some((c) => c.protocolId === id && c.category === "tvl"));
    add("12T-G: TVL candidates cover JupSOL/mSOL/JitoSOL/bSOL", ok, `ok=${ok}`);
  }
  // 12T-H. The four TVL candidates include exact DefiLlama pool IDs.
  {
    const four = ["jupiter", "marinade", "jito", "blazestake"];
    const ok = four.every((id) => {
      const c = candidates.find((x) => x.protocolId === id && x.category === "tvl");
      return c?.sourceType === "defillama_pool" && c.sourceUrl != null && UUID_RE.test(c.sourceUrl);
    });
    add("12T-H: four TVL candidates include exact DefiLlama pool IDs", ok, `ok=${ok}`);
  }
  // 12T-I. INF TVL uses the existing codebase-verified pool reference.
  {
    const c = candidates.find((x) => x.protocolId === "sanctum" && x.category === "tvl");
    const ok = c?.sourceType === "codebase" && (c.sourceUrl?.includes("3075a746-bdd1-4aac-bcd5-b035abee2622") ?? false);
    add("12T-I: INF TVL uses existing codebase-verified pool", ok, `type=${c?.sourceType}`);
  }
  // 12T-J. Incident history stays needs_review.
  {
    const incident = results.filter((r) => r.category === "incident_history");
    const ok = incident.length === 5 && incident.every((r) => r.status === "needs_review");
    add("12T-J: incident history candidates remain needs_review", ok, `n=${incident.length} allNeedsReview=${incident.every((r) => r.status === "needs_review")}`);
  }
  // 12T-K/L. Results never set production/score flags.
  add("12T-K: verification results never set productionMetadataUpdated true", results.every((r) => r.productionMetadataUpdated === false), `ok=${results.every((r) => r.productionMetadataUpdated === false)}`);
  add("12T-L: verification results never set scoreAssigned true", results.every((r) => r.scoreAssigned === false), `ok=${results.every((r) => r.scoreAssigned === false)}`);
  // 12T-M/N. Summary counts.
  add("12T-M: summary.productionMetadataUpdatedCount is 0", summary.productionMetadataUpdatedCount === 0, `v=${summary.productionMetadataUpdatedCount}`);
  add("12T-N: summary.scoreAssignedCount is 0", summary.scoreAssignedCount === 0, `v=${summary.scoreAssignedCount}`);
  // 12T-O. Verified audit links do not change auditStatus from unknown.
  add("12T-O: verified source links do not change auditStatus from unknown", ids.every((id) => getProtocolRiskData(id).auditStatus === "unknown"), "all unknown");
  // 12T-P. Verified withdrawal links do not assign withdrawalTimeHours.
  {
    const market = buildSolLiquidStakingMarketDataFromExistingSources();
    add("12T-P: verified withdrawal links do not assign withdrawalTimeHours", ids.every((id) => market[id].withdrawalTimeHours === undefined), "unset");
  }
  // 12T-Q. Verified fee links do not assign fee values.
  {
    const market = buildSolLiquidStakingMarketDataFromExistingSources();
    add("12T-Q: verified fee links do not assign fee values", ids.every((id) => market[id].fees === undefined), "unset");
  }
  // 12T-R. Verified source links do not assign riskScore.
  add("12T-R: verified source links do not assign riskScore", ids.every((id) => getProtocolRiskData(id).riskScore === undefined), "absent");
  // 12T-S. map does not mutate evidence drafts.
  {
    const before = JSON.stringify(getSolLiquidStakingEvidenceDrafts());
    mapVerifiedSourcesToEvidenceDimensions("sanctum");
    mapVerifiedSourcesToEvidenceDimensions("jupiter");
    const after = JSON.stringify(getSolLiquidStakingEvidenceDrafts());
    add("12T-S: mapVerifiedSourcesToEvidenceDimensions does not mutate evidence drafts", before === after, `unchanged=${before === after}`);
  }
  // 12T-T/U. Map result flags false.
  add("12T-T: map(sanctum).scoreAssigned is false", sanctumMap.scoreAssigned === false, `v=${sanctumMap.scoreAssigned}`);
  add("12T-U: map(sanctum).productionAffected is false", sanctumMap.productionAffected === false && sanctumMap.canMarkAnyDimensionGathered === false, `prod=${sanctumMap.productionAffected} gather=${sanctumMap.canMarkAnyDimensionGathered}`);
  // 12T-V. No evidence draft has scoreAssigned true.
  add("12T-V: no evidence draft has scoreAssigned true", getSolLiquidStakingEvidenceDrafts().every((d) => d.scoreAssigned === false), "ok");
  // 12T-W/X. No riskScore assigned.
  add("12T-W: no riskScore is assigned anywhere", ids.every((id) => getProtocolRiskData(id).riskScore === undefined), "none");
  add("12T-X: riskScore remains absent for all five", ids.every((id) => getProtocolRiskData(id).riskScore === undefined), "absent");
  // 12T-Y/Z/AA. Approval flags false.
  add("12T-Y: PROTOCOL_RISK_RUBRIC_APPROVED remains false", PROTOCOL_RISK_RUBRIC_APPROVED === false, `flag=${PROTOCOL_RISK_RUBRIC_APPROVED}`);
  add("12T-Z: PROTOCOL_RISK_APPROVAL_DECISION_APPROVED remains false", PROTOCOL_RISK_APPROVAL_DECISION_APPROVED === false, `flag=${PROTOCOL_RISK_APPROVAL_DECISION_APPROVED}`);
  add("12T-AA: canAssignProtocolRiskScores() remains false", canAssignProtocolRiskScores() === false, `v=${canAssignProtocolRiskScores()}`);
  // 12T-AB. productionReady remains false.
  add("12T-AB: getProtocolSelectionGoNoGo().productionReady remains false", gng.productionReady === false, `v=${gng.productionReady}`);
  // 12T-AC. Live staking protocolSelection.status remains not_evaluated.
  add("12T-AC: live staking protocolSelection.status remains not_evaluated", staking?.protocolSelection?.status === "not_evaluated", `status=${staking?.protocolSelection?.status}`);
  // 12T-AD. No live suggestion has selectedProtocolId/Name.
  {
    const all = [...stakingRun.suggestions, ...stableRun.suggestions];
    const bad = all.filter((s) => s.protocolSelection?.selectedProtocolId != null || s.protocolSelection?.selectedProtocolName != null);
    add("12T-AD: no live suggestion has selectedProtocolId/Name", bad.length === 0, `violations=${bad.length}`);
  }
  // 12T-AE. Cards/modal do not expose source-verification data or protocol names.
  {
    const tokens = ["Jupiter", "Marinade", "Jito", "BlazeStake", "Sanctum", "JupSOL", "defillama_pool", "SourceVerification", "verifiedValue", "unresolvedQuestions"];
    const scan = (s: typeof staking) => JSON.stringify(toSuggestionCard(s!)) + JSON.stringify(s?.reviewDetails);
    const json = scan(staking) + scan(stable);
    const leaks = tokens.filter((t) => json.includes(t));
    add("12T-AE: cards/modal never expose source-verification data or protocol names", leaks.length === 0, `leaks=${leaks.join(",") || "none"}`);
  }
  // 12T-AF/AG/AH. Flags at safe defaults.
  add("12T-AF: PROTOCOL_SELECTION_IMPLEMENTED remains false", PROTOCOL_SELECTION_IMPLEMENTED === false, `flag=${PROTOCOL_SELECTION_IMPLEMENTED}`);
  add("12T-AG: PROTOCOL_SELECTION_SHOW_IN_UI remains false", PROTOCOL_SELECTION_SHOW_IN_UI === false, `flag=${PROTOCOL_SELECTION_SHOW_IN_UI}`);
  add("12T-AH: PROTOCOL_SELECTION_ALLOW_TRANSACTIONS remains false", PROTOCOL_SELECTION_ALLOW_TRANSACTIONS === false, `flag=${PROTOCOL_SELECTION_ALLOW_TRANSACTIONS}`);
  // 12T-AI. No transaction/signature/swap path in verification output.
  {
    const json = (JSON.stringify(results) + JSON.stringify(summary) + JSON.stringify(sanctumMap)).toLowerCase();
    const txTokens = ["sendtransaction", "signtransaction", "signalltransactions", "signmessage", "publickey", "swap(", "deposit(", "withdraw("];
    const hits = txTokens.filter((t) => json.includes(t));
    add("12T-AI: no transaction/signature/swap path in verification output", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }
  // 12T-AM. No forbidden investment claims in verification output (existing forbidden-copy list).
  {
    const json = (JSON.stringify(results) + JSON.stringify(candidates)).toLowerCase();
    const forbidden = ["best", "safest", "optimal", "guaranteed", "risk-free", "recommended"];
    const hits = forbidden.filter((w) => json.includes(w));
    add("12T-AM: no forbidden investment claims in verification output", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 12U — SOL liquid-staking source-value confirmation intake.
 * Records reviewer-confirmed values; no production, no draft mutation, no score.
 * ------------------------------------------------------------------ */
export function runSolLiquidStakingSourceValueConfirmationFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2);
  const stakingRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stableRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT);
  const staking = stakingRun.suggestions.find((s) => s.category === "staking");
  const stable = stableRun.suggestions.find((s) => s.category === "stable_yield");
  const ids = [...SOL_LIQUID_STAKING_CANDIDATE_IDS];

  const examples = getExampleSourceValueConfirmations();
  const exampleResults = getSourceValueConfirmationResults(examples);
  const summary = summarizeSourceValueConfirmations(exampleResults);
  const gng = getProtocolSelectionGoNoGo("t");

  // Deterministic sources for building precise inputs.
  const infTvlSource = getSolLiquidStakingSourceVerificationResults("sanctum").find((r) => r.category === "tvl" && r.status === "verified");
  const validInput: ProtocolSourceValueConfirmationInput = {
    protocolId: "sanctum",
    lstSymbol: "INF",
    category: "tvl",
    sourceName: infTvlSource?.sourceName ?? "DefiLlama INF pool (codebase-verified)",
    ...(infTvlSource?.sourceUrl ? { sourceUrl: infTvlSource.sourceUrl } : {}),
    sourceType: "codebase",
    confirmedValueType: "number_usd",
    confirmedValue: QA_ONLY_VALUE_PLACEHOLDER,
    confirmedAsOf: "2026-07-12T00:00:00Z",
    reviewer: "qa-example",
    reviewerRole: "risk",
    notes: ["QA-ONLY test input."],
  };

  // 12U-A…F. Confirmation scoping constants.
  add("12U-A: PROTOCOL_SOURCE_VALUE_CONFIRMATION_EXISTS is true", PROTOCOL_SOURCE_VALUE_CONFIRMATION_EXISTS === true, `flag=${PROTOCOL_SOURCE_VALUE_CONFIRMATION_EXISTS}`);
  add("12U-B: PROTOCOL_SOURCE_VALUE_CONFIRMATION_APPROVES_RUBRIC is false", PROTOCOL_SOURCE_VALUE_CONFIRMATION_APPROVES_RUBRIC === false, `flag=${PROTOCOL_SOURCE_VALUE_CONFIRMATION_APPROVES_RUBRIC}`);
  add("12U-C: PROTOCOL_SOURCE_VALUE_CONFIRMATION_ASSIGNS_SCORES is false", PROTOCOL_SOURCE_VALUE_CONFIRMATION_ASSIGNS_SCORES === false, `flag=${PROTOCOL_SOURCE_VALUE_CONFIRMATION_ASSIGNS_SCORES}`);
  add("12U-D: PROTOCOL_SOURCE_VALUE_CONFIRMATION_AFFECTS_PRODUCTION is false", PROTOCOL_SOURCE_VALUE_CONFIRMATION_AFFECTS_PRODUCTION === false, `flag=${PROTOCOL_SOURCE_VALUE_CONFIRMATION_AFFECTS_PRODUCTION}`);
  add("12U-E: PROTOCOL_SOURCE_VALUE_CONFIRMATION_ENABLES_SELECTION is false", PROTOCOL_SOURCE_VALUE_CONFIRMATION_ENABLES_SELECTION === false, `flag=${PROTOCOL_SOURCE_VALUE_CONFIRMATION_ENABLES_SELECTION}`);
  add("12U-F: PROTOCOL_SOURCE_VALUE_CONFIRMATION_UPDATES_METADATA is false", PROTOCOL_SOURCE_VALUE_CONFIRMATION_UPDATES_METADATA === false, `flag=${PROTOCOL_SOURCE_VALUE_CONFIRMATION_UPDATES_METADATA}`);

  // 12U-G. Confirms only when all criteria met.
  add("12U-G: confirmSourceValue confirms only when all criteria met", confirmSourceValue(validInput).status === "confirmed", `status=${confirmSourceValue(validInput).status}`);
  // 12U-H. Missing confirmedValue → insufficient.
  {
    const { confirmedValue: _v, ...rest } = validInput;
    const r = confirmSourceValue({ ...rest, notes: validInput.notes });
    add("12U-H: missing confirmedValue returns insufficient", r.status === "insufficient", `status=${r.status}`);
  }
  // 12U-I. Missing confirmedAsOf for TVL → insufficient.
  {
    const { confirmedAsOf: _a, ...rest } = validInput;
    const r = confirmSourceValue({ ...rest, notes: validInput.notes });
    add("12U-I: missing confirmedAsOf for TVL/APY returns insufficient", r.status === "insufficient", `status=${r.status}`);
  }
  // 12U-J. Missing reviewer → needs_review.
  {
    const { reviewer: _r, ...rest } = validInput;
    const r = confirmSourceValue({ ...rest, notes: validInput.notes });
    add("12U-J: missing reviewer returns needs_review", r.status === "needs_review", `status=${r.status}`);
  }
  // 12U-K. Unverified source → needs_review.
  {
    const r = confirmSourceValue({ ...validInput, sourceName: "Unlisted blog", sourceUrl: "https://example.invalid/x", sourceType: "manual_review" });
    add("12U-K: unverified source returns needs_review", r.status === "needs_review", `status=${r.status}`);
  }
  // 12U-L/M/N. Results never set forbidden flags.
  add("12U-L: results never set productionMetadataUpdated true", exampleResults.every((r) => r.productionMetadataUpdated === false), `ok=${exampleResults.every((r) => r.productionMetadataUpdated === false)}`);
  add("12U-M: results never set evidenceDraftMutated true", exampleResults.every((r) => r.evidenceDraftMutated === false), `ok=${exampleResults.every((r) => r.evidenceDraftMutated === false)}`);
  add("12U-N: results never set scoreAssigned true", exampleResults.every((r) => r.scoreAssigned === false), `ok=${exampleResults.every((r) => r.scoreAssigned === false)}`);
  // 12U-O/P/Q. Summary counts.
  add("12U-O: summary.productionMetadataUpdatedCount is 0", summary.productionMetadataUpdatedCount === 0, `v=${summary.productionMetadataUpdatedCount}`);
  add("12U-P: summary.evidenceDraftMutatedCount is 0", summary.evidenceDraftMutatedCount === 0, `v=${summary.evidenceDraftMutatedCount}`);
  add("12U-Q: summary.scoreAssignedCount is 0", summary.scoreAssignedCount === 0, `v=${summary.scoreAssignedCount}`);
  // 12U-R. Examples are QA-only / non-production.
  {
    const allQa = examples.every((e) => e.confirmedValue == null || e.confirmedValue === QA_ONLY_VALUE_PLACEHOLDER) && examples.every((e) => e.notes.some((n) => n.includes("QA-ONLY")));
    add("12U-R: example confirmations are QA-only / non-production", allQa, `allQa=${allQa}`);
  }
  // 12U-S. map does not mutate evidence drafts.
  {
    const before = JSON.stringify(getSolLiquidStakingEvidenceDrafts());
    mapConfirmedValuesToEvidenceCompletion("sanctum", exampleResults);
    const after = JSON.stringify(getSolLiquidStakingEvidenceDrafts());
    add("12U-S: mapConfirmedValuesToEvidenceCompletion does not mutate evidence drafts", before === after, `unchanged=${before === after}`);
  }
  // 12U-T. TVL-only confirmation does not gather tvl_adoption.
  {
    const map = mapConfirmedValuesToEvidenceCompletion("sanctum", exampleResults);
    add("12U-T: TVL-only confirmation does not gather tvl_adoption", !map.canMarkDimensionsGathered.includes("tvl_adoption"), `gatherable=${map.canMarkDimensionsGathered.join(",") || "none"}`);
  }
  // 12U-U. Partial confirmations → candidateReadyForReview false.
  {
    const map = mapConfirmedValuesToEvidenceCompletion("sanctum", exampleResults);
    add("12U-U: partial confirmations do not make candidateReadyForReview true", map.candidateReadyForReview === false, `ready=${map.candidateReadyForReview}`);
  }
  // 12U-V/W/X. Map result flags false.
  {
    const map = mapConfirmedValuesToEvidenceCompletion("sanctum", exampleResults);
    add("12U-V: map.approvedForScoring is false", map.approvedForScoring === false, `v=${map.approvedForScoring}`);
    add("12U-W: map.scoreAssigned is false", map.scoreAssigned === false, `v=${map.scoreAssigned}`);
    add("12U-X: map.productionAffected is false", map.productionAffected === false, `v=${map.productionAffected}`);
  }
  // 12U-Y. No evidence draft has scoreAssigned true.
  add("12U-Y: no evidence draft has scoreAssigned true", getSolLiquidStakingEvidenceDrafts().every((d) => d.scoreAssigned === false), "ok");
  // 12U-Z/AA. No riskScore assigned.
  add("12U-Z: no riskScore is assigned anywhere", ids.every((id) => getProtocolRiskData(id).riskScore === undefined), "none");
  add("12U-AA: riskScore remains absent for all five", ids.every((id) => getProtocolRiskData(id).riskScore === undefined), "absent");
  // 12U-AB/AC/AD. Approval flags false.
  add("12U-AB: PROTOCOL_RISK_RUBRIC_APPROVED remains false", PROTOCOL_RISK_RUBRIC_APPROVED === false, `flag=${PROTOCOL_RISK_RUBRIC_APPROVED}`);
  add("12U-AC: PROTOCOL_RISK_APPROVAL_DECISION_APPROVED remains false", PROTOCOL_RISK_APPROVAL_DECISION_APPROVED === false, `flag=${PROTOCOL_RISK_APPROVAL_DECISION_APPROVED}`);
  add("12U-AD: canAssignProtocolRiskScores() remains false", canAssignProtocolRiskScores() === false, `v=${canAssignProtocolRiskScores()}`);
  // 12U-AE. productionReady remains false.
  add("12U-AE: getProtocolSelectionGoNoGo().productionReady remains false", gng.productionReady === false, `v=${gng.productionReady}`);
  // 12U-AF. Live staking protocolSelection.status remains not_evaluated.
  add("12U-AF: live staking protocolSelection.status remains not_evaluated", staking?.protocolSelection?.status === "not_evaluated", `status=${staking?.protocolSelection?.status}`);
  // 12U-AG. No live suggestion has selectedProtocolId/Name.
  {
    const all = [...stakingRun.suggestions, ...stableRun.suggestions];
    const bad = all.filter((s) => s.protocolSelection?.selectedProtocolId != null || s.protocolSelection?.selectedProtocolName != null);
    add("12U-AG: no live suggestion has selectedProtocolId/Name", bad.length === 0, `violations=${bad.length}`);
  }
  // 12U-AH. Cards/modal do not expose value-confirmation data or protocol names.
  {
    const tokens = ["Jupiter", "Marinade", "Jito", "BlazeStake", "Sanctum", "JupSOL", "confirmedValue", "confirmedAsOf", "ValueConfirmation", "QA_ONLY_NOT_LIVE"];
    const scan = (s: typeof staking) => JSON.stringify(toSuggestionCard(s!)) + JSON.stringify(s?.reviewDetails);
    const json = scan(staking) + scan(stable);
    const leaks = tokens.filter((t) => json.includes(t));
    add("12U-AH: cards/modal never expose value-confirmation data or protocol names", leaks.length === 0, `leaks=${leaks.join(",") || "none"}`);
  }
  // 12U-AI/AJ/AK. Flags at safe defaults.
  add("12U-AI: PROTOCOL_SELECTION_IMPLEMENTED remains false", PROTOCOL_SELECTION_IMPLEMENTED === false, `flag=${PROTOCOL_SELECTION_IMPLEMENTED}`);
  add("12U-AJ: PROTOCOL_SELECTION_SHOW_IN_UI remains false", PROTOCOL_SELECTION_SHOW_IN_UI === false, `flag=${PROTOCOL_SELECTION_SHOW_IN_UI}`);
  add("12U-AK: PROTOCOL_SELECTION_ALLOW_TRANSACTIONS remains false", PROTOCOL_SELECTION_ALLOW_TRANSACTIONS === false, `flag=${PROTOCOL_SELECTION_ALLOW_TRANSACTIONS}`);
  // 12U-AL. No transaction/signature/swap path in confirmation output.
  {
    const json = (JSON.stringify(exampleResults) + JSON.stringify(summary) + JSON.stringify(mapConfirmedValuesToEvidenceCompletion("sanctum", exampleResults))).toLowerCase();
    const txTokens = ["sendtransaction", "signtransaction", "signalltransactions", "signmessage", "publickey", "swap(", "deposit(", "withdraw("];
    const hits = txTokens.filter((t) => json.includes(t));
    add("12U-AL: no transaction/signature/swap path in confirmation output", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }
  // 12U-AP. No forbidden investment claims in confirmation output (existing forbidden-copy list).
  {
    const json = (JSON.stringify(exampleResults) + JSON.stringify(examples)).toLowerCase();
    const forbidden = ["best", "safest", "optimal", "guaranteed", "risk-free", "recommended"];
    const hits = forbidden.filter((w) => json.includes(w));
    add("12U-AP: no forbidden investment claims in confirmation output", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 12V — SOL liquid-staking real value-confirmation ledger.
 * Reviewer-confirmed TVL/APY; no production, no draft mutation, no score.
 * ------------------------------------------------------------------ */
export function runSolLiquidStakingRealValueFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2);
  const stakingRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stableRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT);
  const staking = stakingRun.suggestions.find((s) => s.category === "staking");
  const stable = stableRun.suggestions.find((s) => s.category === "stable_yield");
  const ids = [...SOL_LIQUID_STAKING_CANDIDATE_IDS];

  // Deterministic evaluation timestamps relative to confirmedAsOf 2026-07-12T00:00:00Z.
  const FRESH_AS_OF = "2026-07-12T06:00:00Z"; // +6h → within 24h
  const STALE_AS_OF = "2026-08-01T00:00:00Z"; // +20 days → beyond 24h

  const all = SOL_LST_REAL_VALUE_CONFIRMATIONS;
  const summaryFresh = summarizeSolLstRealValueConfirmations(FRESH_AS_OF);
  const gng = getProtocolSelectionGoNoGo("t");
  const catsFor = (id: string) => new Set(getSolLstRealValueConfirmations(id).map((c) => c.category));

  // 12V-A…G. Ledger scoping constants.
  add("12V-A: PROTOCOL_REAL_VALUE_CONFIRMATIONS_EXIST is true", PROTOCOL_REAL_VALUE_CONFIRMATIONS_EXIST === true, `flag=${PROTOCOL_REAL_VALUE_CONFIRMATIONS_EXIST}`);
  add("12V-B: PROTOCOL_REAL_VALUE_CONFIRMATIONS_APPROVE_RUBRIC is false", PROTOCOL_REAL_VALUE_CONFIRMATIONS_APPROVE_RUBRIC === false, `flag=${PROTOCOL_REAL_VALUE_CONFIRMATIONS_APPROVE_RUBRIC}`);
  add("12V-C: PROTOCOL_REAL_VALUE_CONFIRMATIONS_ASSIGN_SCORES is false", PROTOCOL_REAL_VALUE_CONFIRMATIONS_ASSIGN_SCORES === false, `flag=${PROTOCOL_REAL_VALUE_CONFIRMATIONS_ASSIGN_SCORES}`);
  add("12V-D: PROTOCOL_REAL_VALUE_CONFIRMATIONS_AFFECT_PRODUCTION is false", PROTOCOL_REAL_VALUE_CONFIRMATIONS_AFFECT_PRODUCTION === false, `flag=${PROTOCOL_REAL_VALUE_CONFIRMATIONS_AFFECT_PRODUCTION}`);
  add("12V-E: PROTOCOL_REAL_VALUE_CONFIRMATIONS_ENABLE_SELECTION is false", PROTOCOL_REAL_VALUE_CONFIRMATIONS_ENABLE_SELECTION === false, `flag=${PROTOCOL_REAL_VALUE_CONFIRMATIONS_ENABLE_SELECTION}`);
  add("12V-F: PROTOCOL_REAL_VALUE_CONFIRMATIONS_UPDATE_METADATA is false", PROTOCOL_REAL_VALUE_CONFIRMATIONS_UPDATE_METADATA === false, `flag=${PROTOCOL_REAL_VALUE_CONFIRMATIONS_UPDATE_METADATA}`);
  add("12V-G: PROTOCOL_REAL_VALUE_CONFIRMATIONS_MUTATE_EVIDENCE is false", PROTOCOL_REAL_VALUE_CONFIRMATIONS_MUTATE_EVIDENCE === false, `flag=${PROTOCOL_REAL_VALUE_CONFIRMATIONS_MUTATE_EVIDENCE}`);

  // 12V-H…K. Each of the four LSTs has TVL/APY/APY-30d.
  const needed = ["tvl", "apy", "apy_30d_average"];
  add("12V-H: confirmations include JupSOL TVL/APY/APY 30d", needed.every((c) => catsFor("jupiter").has(c as never)), `cats=${[...catsFor("jupiter")].join(",")}`);
  add("12V-I: confirmations include mSOL TVL/APY/APY 30d", needed.every((c) => catsFor("marinade").has(c as never)), `cats=${[...catsFor("marinade")].join(",")}`);
  add("12V-J: confirmations include JitoSOL TVL/APY/APY 30d", needed.every((c) => catsFor("jito").has(c as never)), `cats=${[...catsFor("jito")].join(",")}`);
  add("12V-K: confirmations include bSOL TVL/APY/APY 30d", needed.every((c) => catsFor("blazestake").has(c as never)), `cats=${[...catsFor("blazestake")].join(",")}`);
  // 12V-L. INF absent / needs_review (no invented value).
  add("12V-L: INF remains needs_review or absent for real TVL/APY", getSolLstRealValueConfirmations("sanctum").length === 0 && getConfirmedRealValues("sanctum", undefined, FRESH_AS_OF).length === 0, `sanctumRows=${getSolLstRealValueConfirmations("sanctum").length}`);
  // 12V-M/N. Every confirmation has reviewer/role/as-of.
  add("12V-M: every confirmation has reviewer and reviewerRole", all.every((c) => c.reviewer.length > 0 && c.reviewerRole.length > 0), `ok=${all.every((c) => c.reviewer.length > 0)}`);
  add("12V-N: every confirmation has confirmedAsOf", all.every((c) => c.confirmedAsOf.length > 0), `ok=${all.every((c) => c.confirmedAsOf.length > 0)}`);
  // 12V-O. TVL/APY/APY-30d are time-sensitive.
  add("12V-O: every TVL/APY/APY 30d confirmation is time-sensitive", all.every((c) => TIME_SENSITIVE_REAL_VALUE_CATEGORIES.has(c.category)), "all time-sensitive");
  // 12V-P. Fresh → confirmed.
  add("12V-P: fresh TVL/APY confirmations validate as confirmed", all.every((c) => validateRealValueConfirmation(c, FRESH_AS_OF) === "confirmed"), `ok=${all.every((c) => validateRealValueConfirmation(c, FRESH_AS_OF) === "confirmed")}`);
  // 12V-Q. Stale.
  add("12V-Q: a stale TVL/APY confirmation validates as stale", validateRealValueConfirmation(all[0], STALE_AS_OF) === "stale", `status=${validateRealValueConfirmation(all[0], STALE_AS_OF)}`);
  // 12V-R. Missing confirmedValue → insufficient.
  add("12V-R: missing confirmedValue validates as insufficient", validateRealValueConfirmation({ ...all[0], confirmedValue: "" }, FRESH_AS_OF) === "insufficient", `status=${validateRealValueConfirmation({ ...all[0], confirmedValue: "" }, FRESH_AS_OF)}`);
  // 12V-S. Missing reviewer → needs_review.
  add("12V-S: missing reviewer validates as needs_review", validateRealValueConfirmation({ ...all[0], reviewer: "" }, FRESH_AS_OF) === "needs_review", `status=${validateRealValueConfirmation({ ...all[0], reviewer: "" }, FRESH_AS_OF)}`);
  // 12V-T/U/V. Summary counts.
  add("12V-T: summary.productionMetadataUpdatedCount is 0", summaryFresh.productionMetadataUpdatedCount === 0, `v=${summaryFresh.productionMetadataUpdatedCount}`);
  add("12V-U: summary.evidenceDraftMutatedCount is 0", summaryFresh.evidenceDraftMutatedCount === 0, `v=${summaryFresh.evidenceDraftMutatedCount}`);
  add("12V-V: summary.scoreAssignedCount is 0", summaryFresh.scoreAssignedCount === 0, `v=${summaryFresh.scoreAssignedCount}`);
  // 12V-W. map does not mutate evidence drafts.
  {
    const before = JSON.stringify(getSolLiquidStakingEvidenceDrafts());
    mapRealValuesToEvidenceCompletion("jupiter", [...all], FRESH_AS_OF);
    const after = JSON.stringify(getSolLiquidStakingEvidenceDrafts());
    add("12V-W: mapRealValuesToEvidenceCompletion does not mutate evidence drafts", before === after, `unchanged=${before === after}`);
  }
  // 12V-X. TVL/APY support tvl_adoption only when fresh.
  {
    const fresh = mapRealValuesToEvidenceCompletion("jupiter", [...all], FRESH_AS_OF);
    const stale = mapRealValuesToEvidenceCompletion("jupiter", [...all], STALE_AS_OF);
    const ok = fresh.gatherableDimensions.includes("tvl_adoption") && !stale.gatherableDimensions.includes("tvl_adoption");
    add("12V-X: TVL/APY support tvl_adoption only when fresh", ok, `fresh=${fresh.gatherableDimensions.join(",") || "none"} stale=${stale.gatherableDimensions.join(",") || "none"}`);
  }
  // 12V-Y…AB. TVL/APY never support other dimensions.
  {
    const fresh = mapRealValuesToEvidenceCompletion("jupiter", [...all], FRESH_AS_OF);
    add("12V-Y: TVL/APY do not support audit_security", !fresh.gatherableDimensions.includes("audit_security"), `gatherable=${fresh.gatherableDimensions.join(",")}`);
    add("12V-Z: TVL/APY do not support withdrawal_fee_transparency", !fresh.gatherableDimensions.includes("withdrawal_fee_transparency"), `gatherable=${fresh.gatherableDimensions.join(",")}`);
    add("12V-AA: TVL/APY do not support operational_dependency_risk", !fresh.gatherableDimensions.includes("operational_dependency_risk"), `gatherable=${fresh.gatherableDimensions.join(",")}`);
    add("12V-AB: TVL/APY do not support incident_history", !fresh.gatherableDimensions.includes("incident_history"), `gatherable=${fresh.gatherableDimensions.join(",")}`);
  }
  // 12V-AC. No candidateReadyForReview with only TVL/APY.
  {
    const fresh = mapRealValuesToEvidenceCompletion("jupiter", [...all], FRESH_AS_OF);
    add("12V-AC: no candidateReadyForReview with only TVL/APY confirmations", fresh.candidateReadyForReview === false, `ready=${fresh.candidateReadyForReview}`);
  }
  // 12V-AD/AE/AF. Map result flags false.
  {
    const fresh = mapRealValuesToEvidenceCompletion("jupiter", [...all], FRESH_AS_OF);
    add("12V-AD: map.approvedForScoring is false", fresh.approvedForScoring === false, `v=${fresh.approvedForScoring}`);
    add("12V-AE: map.scoreAssigned is false", fresh.scoreAssigned === false, `v=${fresh.scoreAssigned}`);
    add("12V-AF: map.productionAffected is false", fresh.productionAffected === false, `v=${fresh.productionAffected}`);
  }
  // 12V-AG. No evidence draft has scoreAssigned true.
  add("12V-AG: no evidence draft has scoreAssigned true", getSolLiquidStakingEvidenceDrafts().every((d) => d.scoreAssigned === false), "ok");
  // 12V-AH/AI. No riskScore assigned.
  add("12V-AH: no riskScore is assigned anywhere", ids.every((id) => getProtocolRiskData(id).riskScore === undefined), "none");
  add("12V-AI: riskScore remains absent for all five", ids.every((id) => getProtocolRiskData(id).riskScore === undefined), "absent");
  // 12V-AJ/AK/AL. Approval flags false.
  add("12V-AJ: PROTOCOL_RISK_RUBRIC_APPROVED remains false", PROTOCOL_RISK_RUBRIC_APPROVED === false, `flag=${PROTOCOL_RISK_RUBRIC_APPROVED}`);
  add("12V-AK: PROTOCOL_RISK_APPROVAL_DECISION_APPROVED remains false", PROTOCOL_RISK_APPROVAL_DECISION_APPROVED === false, `flag=${PROTOCOL_RISK_APPROVAL_DECISION_APPROVED}`);
  add("12V-AL: canAssignProtocolRiskScores() remains false", canAssignProtocolRiskScores() === false, `v=${canAssignProtocolRiskScores()}`);
  // 12V-AM. productionReady remains false.
  add("12V-AM: getProtocolSelectionGoNoGo().productionReady remains false", gng.productionReady === false, `v=${gng.productionReady}`);
  // 12V-AN. Live staking not_evaluated.
  add("12V-AN: live staking protocolSelection.status remains not_evaluated", staking?.protocolSelection?.status === "not_evaluated", `status=${staking?.protocolSelection?.status}`);
  // 12V-AO. No live suggestion has selectedProtocolId/Name.
  {
    const allSug = [...stakingRun.suggestions, ...stableRun.suggestions];
    const bad = allSug.filter((s) => s.protocolSelection?.selectedProtocolId != null || s.protocolSelection?.selectedProtocolName != null);
    add("12V-AO: no live suggestion has selectedProtocolId/Name", bad.length === 0, `violations=${bad.length}`);
  }
  // 12V-AP. Cards/modal do not expose real-value confirmations or protocol names.
  {
    const tokens = ["Jupiter", "Marinade", "Jito", "BlazeStake", "Sanctum", "JupSOL", "409170000", "confirmedAsOf", "RealValueConfirmation", "defillama"];
    const scan = (s: typeof staking) => JSON.stringify(toSuggestionCard(s!)) + JSON.stringify(s?.reviewDetails);
    const json = scan(staking) + scan(stable);
    const leaks = tokens.filter((t) => json.includes(t));
    add("12V-AP: cards/modal never expose real-value confirmations or protocol names", leaks.length === 0, `leaks=${leaks.join(",") || "none"}`);
  }
  // 12V-AQ/AR/AS. Flags at safe defaults.
  add("12V-AQ: PROTOCOL_SELECTION_IMPLEMENTED remains false", PROTOCOL_SELECTION_IMPLEMENTED === false, `flag=${PROTOCOL_SELECTION_IMPLEMENTED}`);
  add("12V-AR: PROTOCOL_SELECTION_SHOW_IN_UI remains false", PROTOCOL_SELECTION_SHOW_IN_UI === false, `flag=${PROTOCOL_SELECTION_SHOW_IN_UI}`);
  add("12V-AS: PROTOCOL_SELECTION_ALLOW_TRANSACTIONS remains false", PROTOCOL_SELECTION_ALLOW_TRANSACTIONS === false, `flag=${PROTOCOL_SELECTION_ALLOW_TRANSACTIONS}`);
  // 12V-AT. No transaction/signature/swap path in ledger output.
  {
    const json = (JSON.stringify(all) + JSON.stringify(summaryFresh) + JSON.stringify(mapRealValuesToEvidenceCompletion("jupiter", [...all], FRESH_AS_OF))).toLowerCase();
    const txTokens = ["sendtransaction", "signtransaction", "signalltransactions", "signmessage", "publickey", "swap(", "deposit(", "withdraw("];
    const hits = txTokens.filter((t) => json.includes(t));
    add("12V-AT: no transaction/signature/swap path in ledger output", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }
  // 12V-AX. No forbidden investment claims in ledger output (existing forbidden-copy list).
  {
    const json = JSON.stringify(all).toLowerCase();
    const forbidden = ["best", "safest", "optimal", "guaranteed", "risk-free", "recommended"];
    const hits = forbidden.filter((w) => json.includes(w));
    add("12V-AX: no forbidden investment claims in ledger output", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 12W — SOL liquid-staking evidence gather-decision ledger.
 * Records reviewer "gathered" decisions; no production, no mutation, no score.
 * ------------------------------------------------------------------ */
export function runSolLiquidStakingGatherDecisionFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2);
  const stakingRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stableRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT);
  const staking = stakingRun.suggestions.find((s) => s.category === "staking");
  const stable = stableRun.suggestions.find((s) => s.category === "stable_yield");
  const ids = [...SOL_LIQUID_STAKING_CANDIDATE_IDS];

  const FRESH_AS_OF = "2026-07-12T06:00:00Z";
  const STALE_AS_OF = "2026-08-01T00:00:00Z";
  const summaryFresh = summarizeSolLstEvidenceGatherDecisions(FRESH_AS_OF);
  const gng = getProtocolSelectionGoNoGo("t");
  const decisionFor = (id: string) => SOL_LST_EVIDENCE_GATHER_DECISIONS.find((d) => d.protocolId === id && d.dimensionId === "tvl_adoption");

  // 12W-A…G. Ledger scoping constants.
  add("12W-A: PROTOCOL_EVIDENCE_GATHER_DECISIONS_EXIST is true", PROTOCOL_EVIDENCE_GATHER_DECISIONS_EXIST === true, `flag=${PROTOCOL_EVIDENCE_GATHER_DECISIONS_EXIST}`);
  add("12W-B: PROTOCOL_EVIDENCE_GATHER_DECISIONS_APPROVE_RUBRIC is false", PROTOCOL_EVIDENCE_GATHER_DECISIONS_APPROVE_RUBRIC === false, `flag=${PROTOCOL_EVIDENCE_GATHER_DECISIONS_APPROVE_RUBRIC}`);
  add("12W-C: PROTOCOL_EVIDENCE_GATHER_DECISIONS_ASSIGN_SCORES is false", PROTOCOL_EVIDENCE_GATHER_DECISIONS_ASSIGN_SCORES === false, `flag=${PROTOCOL_EVIDENCE_GATHER_DECISIONS_ASSIGN_SCORES}`);
  add("12W-D: PROTOCOL_EVIDENCE_GATHER_DECISIONS_AFFECT_PRODUCTION is false", PROTOCOL_EVIDENCE_GATHER_DECISIONS_AFFECT_PRODUCTION === false, `flag=${PROTOCOL_EVIDENCE_GATHER_DECISIONS_AFFECT_PRODUCTION}`);
  add("12W-E: PROTOCOL_EVIDENCE_GATHER_DECISIONS_ENABLE_SELECTION is false", PROTOCOL_EVIDENCE_GATHER_DECISIONS_ENABLE_SELECTION === false, `flag=${PROTOCOL_EVIDENCE_GATHER_DECISIONS_ENABLE_SELECTION}`);
  add("12W-F: PROTOCOL_EVIDENCE_GATHER_DECISIONS_UPDATE_METADATA is false", PROTOCOL_EVIDENCE_GATHER_DECISIONS_UPDATE_METADATA === false, `flag=${PROTOCOL_EVIDENCE_GATHER_DECISIONS_UPDATE_METADATA}`);
  add("12W-G: PROTOCOL_EVIDENCE_GATHER_DECISIONS_MUTATE_EVIDENCE is false", PROTOCOL_EVIDENCE_GATHER_DECISIONS_MUTATE_EVIDENCE === false, `flag=${PROTOCOL_EVIDENCE_GATHER_DECISIONS_MUTATE_EVIDENCE}`);

  // 12W-H…K. tvl_adoption gathered decisions for the four.
  add("12W-H: gather decisions include tvl_adoption gathered for JupSOL", decisionFor("jupiter")?.status === "gathered", `status=${decisionFor("jupiter")?.status}`);
  add("12W-I: gather decisions include tvl_adoption gathered for mSOL", decisionFor("marinade")?.status === "gathered", `status=${decisionFor("marinade")?.status}`);
  add("12W-J: gather decisions include tvl_adoption gathered for JitoSOL", decisionFor("jito")?.status === "gathered", `status=${decisionFor("jito")?.status}`);
  add("12W-K: gather decisions include tvl_adoption gathered for bSOL", decisionFor("blazestake")?.status === "gathered", `status=${decisionFor("blazestake")?.status}`);
  // 12W-L. INF tvl_adoption needs_review / not gathered.
  add("12W-L: INF tvl_adoption is needs_review or not gathered", decisionFor("sanctum")?.status === "needs_review", `status=${decisionFor("sanctum")?.status}`);
  // 12W-M…Q. Non-tvl_adoption dimensions have decisions ONLY for jito (12X); no
  // other candidate advanced beyond tvl_adoption in the 12W baseline.
  const nonJitoOnly = (dim: Parameters<typeof getGatherDecisionsByDimension>[0]) => getGatherDecisionsByDimension(dim).every((d) => d.protocolId === "jito");
  add("12W-M: no non-jito gather decision for audit_security", nonJitoOnly("audit_security"), `nonJito=${getGatherDecisionsByDimension("audit_security").filter((d) => d.protocolId !== "jito").length}`);
  add("12W-N: no non-jito gather decision for maturity", nonJitoOnly("maturity"), `nonJito=${getGatherDecisionsByDimension("maturity").filter((d) => d.protocolId !== "jito").length}`);
  add("12W-O: no non-jito gather decision for withdrawal_fee_transparency", nonJitoOnly("withdrawal_fee_transparency"), `nonJito=${getGatherDecisionsByDimension("withdrawal_fee_transparency").filter((d) => d.protocolId !== "jito").length}`);
  add("12W-P: no non-jito gather decision for operational_dependency_risk", nonJitoOnly("operational_dependency_risk"), `nonJito=${getGatherDecisionsByDimension("operational_dependency_risk").filter((d) => d.protocolId !== "jito").length}`);
  add("12W-Q: no non-jito gather decision for incident_history", nonJitoOnly("incident_history"), `nonJito=${getGatherDecisionsByDimension("incident_history").filter((d) => d.protocolId !== "jito").length}`);
  // 12W-R…U. Fresh effective gathered for the four.
  for (const [id, sym, code] of [["jupiter", "JupSOL", "R"], ["marinade", "mSOL", "S"], ["jito", "JitoSOL", "T"], ["blazestake", "bSOL", "U"]] as const) {
    const evalFresh = evaluateCandidateReadinessFromGatherDecisions(id, FRESH_AS_OF);
    add(`12W-${code}: fresh ${sym} effective gatheredDimensions includes tvl_adoption`, evalFresh.gatheredDimensions.includes("tvl_adoption"), `gathered=${evalFresh.gatheredDimensions.join(",") || "none"}`);
  }
  // 12W-V. INF not gathered (fresh).
  {
    const infEval = evaluateCandidateReadinessFromGatherDecisions("sanctum", FRESH_AS_OF);
    add("12W-V: fresh INF gatheredDimensions does not include tvl_adoption", !infEval.gatheredDimensions.includes("tvl_adoption"), `gathered=${infEval.gatheredDimensions.join(",") || "none"}`);
  }
  // 12W-W. Stale → not gathered.
  {
    const staleEval = evaluateCandidateReadinessFromGatherDecisions("jupiter", STALE_AS_OF);
    const ok = !staleEval.gatheredDimensions.includes("tvl_adoption") && staleEval.staleDimensions.includes("tvl_adoption");
    add("12W-W: stale time-sensitive decision becomes stale, not gathered", ok, `gathered=${staleEval.gatheredDimensions.join(",") || "none"} stale=${staleEval.staleDimensions.join(",") || "none"}`);
  }
  // 12W-X. candidateReadyForReview false.
  add("12W-X: jupiter candidateReadyForReview is false", evaluateCandidateReadinessFromGatherDecisions("jupiter", FRESH_AS_OF).candidateReadyForReview === false, `ready=${evaluateCandidateReadinessFromGatherDecisions("jupiter", FRESH_AS_OF).candidateReadyForReview}`);
  // 12W-Y. The three still-TVL-only candidates have 1 gathered + 5 missing (fresh).
  // JitoSOL advanced to 6/6 in Step 12X and is covered by the 12X checks.
  {
    const tvlOnly = ["jupiter", "marinade", "blazestake"];
    const ok = tvlOnly.every((id) => {
      const e = evaluateCandidateReadinessFromGatherDecisions(id, FRESH_AS_OF);
      return e.gatheredDimensions.length === 1 && e.missingDimensions.length === 5;
    });
    add("12W-Y: JupSOL/mSOL/bSOL have 1 gathered + 5 missing when fresh", ok, `ok=${ok}`);
  }
  // 12W-Z. INF 0 gathered + 6 missing.
  {
    const e = evaluateCandidateReadinessFromGatherDecisions("sanctum", FRESH_AS_OF);
    add("12W-Z: INF has 0 gathered + 6 missing dimensions", e.gatheredDimensions.length === 0 && e.missingDimensions.length === 6, `gathered=${e.gatheredDimensions.length} missing=${e.missingDimensions.length}`);
  }
  // 12W-AA. Gate wrapper keeps status evidence_incomplete or blocked.
  {
    const g = evaluateProtocolRiskCandidateScoreAssignmentGateWithGatherDecisions("jupiter", FRESH_AS_OF);
    const ok = (g.status === "evidence_incomplete" || g.status === "blocked") && g.gatheredDimensions.includes("tvl_adoption") && g.missingDimensions.length === 5;
    add("12W-AA: gate wrapper keeps status evidence_incomplete/blocked, 5 missing", ok, `status=${g.status} gathered=${g.gatheredDimensions.join(",")} missing=${g.missingDimensions.length}`);
  }
  // 12W-AB. No candidate gate approved_for_scoring.
  {
    const bad = ids.filter((id) => evaluateProtocolRiskCandidateScoreAssignmentGateWithGatherDecisions(id, FRESH_AS_OF).status === "approved_for_scoring");
    add("12W-AB: no candidate gate is approved_for_scoring", bad.length === 0, `bad=${bad.join(",") || "none"}`);
  }
  // 12W-AC. No candidate gate scoreAssignmentAllowed true.
  {
    const bad = ids.filter((id) => evaluateProtocolRiskCandidateScoreAssignmentGateWithGatherDecisions(id, FRESH_AS_OF).scoreAssignmentAllowed === true);
    add("12W-AC: no candidate gate has scoreAssignmentAllowed true", bad.length === 0, `bad=${bad.join(",") || "none"}`);
  }
  // 12W-AD. map does not mutate evidence drafts.
  {
    const before = JSON.stringify(getSolLiquidStakingEvidenceDrafts());
    mapGatherDecisionsToEvidenceCompletion("jupiter", FRESH_AS_OF);
    mapGatherDecisionsToEvidenceCompletion("sanctum", FRESH_AS_OF);
    const after = JSON.stringify(getSolLiquidStakingEvidenceDrafts());
    add("12W-AD: mapGatherDecisionsToEvidenceCompletion does not mutate evidence drafts", before === after, `unchanged=${before === after}`);
  }
  // 12W-AE/AF/AG. Decisions never set forbidden flags.
  add("12W-AE: gather decisions never set productionMetadataUpdated true", SOL_LST_EVIDENCE_GATHER_DECISIONS.every((d) => d.productionMetadataUpdated === false), "ok");
  add("12W-AF: gather decisions never set evidenceDraftMutated true", SOL_LST_EVIDENCE_GATHER_DECISIONS.every((d) => d.evidenceDraftMutated === false), "ok");
  add("12W-AG: gather decisions never set scoreAssigned true", SOL_LST_EVIDENCE_GATHER_DECISIONS.every((d) => d.scoreAssigned === false), "ok");
  // 12W-AH/AI/AJ. Summary counts.
  add("12W-AH: summary.productionMetadataUpdatedCount is 0", summaryFresh.productionMetadataUpdatedCount === 0, `v=${summaryFresh.productionMetadataUpdatedCount}`);
  add("12W-AI: summary.evidenceDraftMutatedCount is 0", summaryFresh.evidenceDraftMutatedCount === 0, `v=${summaryFresh.evidenceDraftMutatedCount}`);
  add("12W-AJ: summary.scoreAssignedCount is 0", summaryFresh.scoreAssignedCount === 0, `v=${summaryFresh.scoreAssignedCount}`);
  // 12W-AK/AL. No riskScore.
  add("12W-AK: no riskScore is assigned anywhere", ids.every((id) => getProtocolRiskData(id).riskScore === undefined), "none");
  add("12W-AL: riskScore remains absent for all five", ids.every((id) => getProtocolRiskData(id).riskScore === undefined), "absent");
  // 12W-AM/AN/AO. Approval flags false.
  add("12W-AM: PROTOCOL_RISK_RUBRIC_APPROVED remains false", PROTOCOL_RISK_RUBRIC_APPROVED === false, `flag=${PROTOCOL_RISK_RUBRIC_APPROVED}`);
  add("12W-AN: PROTOCOL_RISK_APPROVAL_DECISION_APPROVED remains false", PROTOCOL_RISK_APPROVAL_DECISION_APPROVED === false, `flag=${PROTOCOL_RISK_APPROVAL_DECISION_APPROVED}`);
  add("12W-AO: canAssignProtocolRiskScores() remains false", canAssignProtocolRiskScores() === false, `v=${canAssignProtocolRiskScores()}`);
  // 12W-AP. productionReady remains false.
  add("12W-AP: getProtocolSelectionGoNoGo().productionReady remains false", gng.productionReady === false, `v=${gng.productionReady}`);
  // 12W-AQ. Live staking not_evaluated.
  add("12W-AQ: live staking protocolSelection.status remains not_evaluated", staking?.protocolSelection?.status === "not_evaluated", `status=${staking?.protocolSelection?.status}`);
  // 12W-AR. No live suggestion has selectedProtocolId/Name.
  {
    const allSug = [...stakingRun.suggestions, ...stableRun.suggestions];
    const bad = allSug.filter((s) => s.protocolSelection?.selectedProtocolId != null || s.protocolSelection?.selectedProtocolName != null);
    add("12W-AR: no live suggestion has selectedProtocolId/Name", bad.length === 0, `violations=${bad.length}`);
  }
  // 12W-AS. Cards/modal do not expose gather decisions or protocol names.
  {
    const tokens = ["Jupiter", "Marinade", "Jito", "BlazeStake", "Sanctum", "JupSOL", "gatheredDimensions", "GatherDecision", "basedOnCategories", "candidateReadyForReview"];
    const scan = (s: typeof staking) => JSON.stringify(toSuggestionCard(s!)) + JSON.stringify(s?.reviewDetails);
    const json = scan(staking) + scan(stable);
    const leaks = tokens.filter((t) => json.includes(t));
    add("12W-AS: cards/modal never expose gather decisions or protocol names", leaks.length === 0, `leaks=${leaks.join(",") || "none"}`);
  }
  // 12W-AT/AU/AV. Flags at safe defaults.
  add("12W-AT: PROTOCOL_SELECTION_IMPLEMENTED remains false", PROTOCOL_SELECTION_IMPLEMENTED === false, `flag=${PROTOCOL_SELECTION_IMPLEMENTED}`);
  add("12W-AU: PROTOCOL_SELECTION_SHOW_IN_UI remains false", PROTOCOL_SELECTION_SHOW_IN_UI === false, `flag=${PROTOCOL_SELECTION_SHOW_IN_UI}`);
  add("12W-AV: PROTOCOL_SELECTION_ALLOW_TRANSACTIONS remains false", PROTOCOL_SELECTION_ALLOW_TRANSACTIONS === false, `flag=${PROTOCOL_SELECTION_ALLOW_TRANSACTIONS}`);
  // 12W-AW. No transaction/signature/swap path in ledger output.
  {
    const json = (JSON.stringify(SOL_LST_EVIDENCE_GATHER_DECISIONS) + JSON.stringify(summaryFresh)).toLowerCase();
    const txTokens = ["sendtransaction", "signtransaction", "signalltransactions", "signmessage", "publickey", "swap(", "deposit(", "withdraw("];
    const hits = txTokens.filter((t) => json.includes(t));
    add("12W-AW: no transaction/signature/swap path in gather-decision output", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }
  // 12W-BA. No forbidden investment claims in gather-decision output.
  {
    const json = JSON.stringify(SOL_LST_EVIDENCE_GATHER_DECISIONS).toLowerCase();
    const forbidden = ["best", "safest", "optimal", "guaranteed", "risk-free", "recommended"];
    const hits = forbidden.filter((w) => json.includes(w));
    add("12W-BA: no forbidden investment claims in gather-decision output", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 12X — JitoSOL remaining evidence gathering + ready_for_review milestone.
 * Source-backed; no production, no draft mutation, no score, no approval.
 * ------------------------------------------------------------------ */
export function runJitoSolEvidenceReadinessFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2);
  const stakingRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stableRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT);
  const staking = stakingRun.suggestions.find((s) => s.category === "staking");
  const stable = stableRun.suggestions.find((s) => s.category === "stable_yield");
  const ids = [...SOL_LIQUID_STAKING_CANDIDATE_IDS];

  const FRESH_AS_OF = "2026-07-12T06:00:00Z";
  const STALE_AS_OF = "2026-08-01T00:00:00Z";
  const confs = JITOSOL_EVIDENCE_CONFIRMATIONS;
  const jitoDecisionFor = (dim: Parameters<typeof getGatherDecisionsByDimension>[0]) =>
    getGatherDecisionsByDimension(dim).find((d) => d.protocolId === "jito");
  const gng = getProtocolSelectionGoNoGo("t");

  // 12X-A…G. Scoping constants.
  add("12X-A: PROTOCOL_JITOSOL_EVIDENCE_CONFIRMATIONS_EXIST is true", PROTOCOL_JITOSOL_EVIDENCE_CONFIRMATIONS_EXIST === true, `flag=${PROTOCOL_JITOSOL_EVIDENCE_CONFIRMATIONS_EXIST}`);
  add("12X-B: PROTOCOL_JITOSOL_EVIDENCE_CONFIRMATIONS_APPROVE_RUBRIC is false", PROTOCOL_JITOSOL_EVIDENCE_CONFIRMATIONS_APPROVE_RUBRIC === false, `flag=${PROTOCOL_JITOSOL_EVIDENCE_CONFIRMATIONS_APPROVE_RUBRIC}`);
  add("12X-C: PROTOCOL_JITOSOL_EVIDENCE_CONFIRMATIONS_ASSIGN_SCORES is false", PROTOCOL_JITOSOL_EVIDENCE_CONFIRMATIONS_ASSIGN_SCORES === false, `flag=${PROTOCOL_JITOSOL_EVIDENCE_CONFIRMATIONS_ASSIGN_SCORES}`);
  add("12X-D: PROTOCOL_JITOSOL_EVIDENCE_CONFIRMATIONS_AFFECT_PRODUCTION is false", PROTOCOL_JITOSOL_EVIDENCE_CONFIRMATIONS_AFFECT_PRODUCTION === false, `flag=${PROTOCOL_JITOSOL_EVIDENCE_CONFIRMATIONS_AFFECT_PRODUCTION}`);
  add("12X-E: PROTOCOL_JITOSOL_EVIDENCE_CONFIRMATIONS_ENABLE_SELECTION is false", PROTOCOL_JITOSOL_EVIDENCE_CONFIRMATIONS_ENABLE_SELECTION === false, `flag=${PROTOCOL_JITOSOL_EVIDENCE_CONFIRMATIONS_ENABLE_SELECTION}`);
  add("12X-F: PROTOCOL_JITOSOL_EVIDENCE_CONFIRMATIONS_UPDATE_METADATA is false", PROTOCOL_JITOSOL_EVIDENCE_CONFIRMATIONS_UPDATE_METADATA === false, `flag=${PROTOCOL_JITOSOL_EVIDENCE_CONFIRMATIONS_UPDATE_METADATA}`);
  add("12X-G: PROTOCOL_JITOSOL_EVIDENCE_CONFIRMATIONS_MUTATE_EVIDENCE is false", PROTOCOL_JITOSOL_EVIDENCE_CONFIRMATIONS_MUTATE_EVIDENCE === false, `flag=${PROTOCOL_JITOSOL_EVIDENCE_CONFIRMATIONS_MUTATE_EVIDENCE}`);

  // 12X-H…L. Confirmations cover the five dimensions.
  add("12X-H: confirmations cover audit_security", getJitoEvidenceConfirmationsByDimension("audit_security").length > 0, `n=${getJitoEvidenceConfirmationsByDimension("audit_security").length}`);
  add("12X-I: confirmations cover maturity", getJitoEvidenceConfirmationsByDimension("maturity").length > 0, `n=${getJitoEvidenceConfirmationsByDimension("maturity").length}`);
  add("12X-J: confirmations cover withdrawal_fee_transparency", getJitoEvidenceConfirmationsByDimension("withdrawal_fee_transparency").length > 0, `n=${getJitoEvidenceConfirmationsByDimension("withdrawal_fee_transparency").length}`);
  add("12X-K: confirmations cover operational_dependency_risk", getJitoEvidenceConfirmationsByDimension("operational_dependency_risk").length > 0, `n=${getJitoEvidenceConfirmationsByDimension("operational_dependency_risk").length}`);
  add("12X-L: confirmations cover incident_history", getJitoEvidenceConfirmationsByDimension("incident_history").length > 0, `n=${getJitoEvidenceConfirmationsByDimension("incident_history").length}`);
  // 12X-M…Q. Attribution + safety flags on every confirmation.
  add("12X-M: every confirmation has reviewer and reviewerRole", confs.every((c) => c.reviewer.length > 0 && c.reviewerRole.length > 0), `ok=${confs.every((c) => c.reviewer.length > 0)}`);
  add("12X-N: every confirmation has confirmedAsOf", confs.every((c) => c.confirmedAsOf.length > 0), `ok=${confs.every((c) => c.confirmedAsOf.length > 0)}`);
  add("12X-O: every confirmation has scoreAssigned false", confs.every((c) => c.scoreAssigned === false), "ok");
  add("12X-P: every confirmation has productionMetadataUpdated false", confs.every((c) => c.productionMetadataUpdated === false), "ok");
  add("12X-Q: every confirmation has evidenceDraftMutated false", confs.every((c) => c.evidenceDraftMutated === false), "ok");
  // 12X-R/S. Incident-history caveats.
  {
    const inc = confs.find((c) => c.category === "incident_history");
    add("12X-R: manual incident-history confirmation says it is not a clean-history claim", inc?.confirmedValue.toLowerCase().includes("not a clean-history claim") === true, `has=${inc?.confirmedValue.toLowerCase().includes("not a clean-history claim")}`);
    add("12X-S: manual incident-history confirmation says recheck before production", inc?.notes.some((n) => n.toLowerCase().includes("recheck before production")) === true, `has=${inc?.notes.some((n) => n.toLowerCase().includes("recheck before production"))}`);
  }
  // 12X-T…X. Gather decisions gathered for the five JitoSOL dimensions.
  add("12X-T: gather decisions include audit_security gathered for JitoSOL", jitoDecisionFor("audit_security")?.status === "gathered", `status=${jitoDecisionFor("audit_security")?.status}`);
  add("12X-U: gather decisions include maturity gathered for JitoSOL", jitoDecisionFor("maturity")?.status === "gathered", `status=${jitoDecisionFor("maturity")?.status}`);
  add("12X-V: gather decisions include withdrawal_fee_transparency gathered for JitoSOL", jitoDecisionFor("withdrawal_fee_transparency")?.status === "gathered", `status=${jitoDecisionFor("withdrawal_fee_transparency")?.status}`);
  add("12X-W: gather decisions include operational_dependency_risk gathered for JitoSOL", jitoDecisionFor("operational_dependency_risk")?.status === "gathered", `status=${jitoDecisionFor("operational_dependency_risk")?.status}`);
  add("12X-X: gather decisions include incident_history gathered for JitoSOL", jitoDecisionFor("incident_history")?.status === "gathered", `status=${jitoDecisionFor("incident_history")?.status}`);
  // 12X-Y/Z/AA. Fresh readiness.
  {
    const e = evaluateCandidateReadinessFromGatherDecisions("jito", FRESH_AS_OF);
    add("12X-Y: fresh JitoSOL has 6 gathered dimensions", e.gatheredDimensions.length === 6, `gathered=${e.gatheredDimensions.length}`);
    add("12X-Z: fresh JitoSOL has 0 missing dimensions", e.missingDimensions.length === 0, `missing=${e.missingDimensions.length}`);
    add("12X-AA: fresh JitoSOL candidateReadyForReview is true", e.candidateReadyForReview === true, `ready=${e.candidateReadyForReview}`);
  }
  // 12X-AB. Stale → not ready.
  {
    const e = evaluateCandidateReadinessFromGatherDecisions("jito", STALE_AS_OF);
    add("12X-AB: stale JitoSOL candidateReadyForReview is false", e.candidateReadyForReview === false, `ready=${e.candidateReadyForReview} gathered=${e.gatheredDimensions.length}`);
  }
  // 12X-AC…AF. Gate wrapper for jito.
  {
    const g = evaluateProtocolRiskCandidateScoreAssignmentGateWithGatherDecisions("jito", FRESH_AS_OF);
    add("12X-AC: jito gate status is ready_for_review (fresh)", g.status === "ready_for_review", `status=${g.status}`);
    add("12X-AD: jito gate scoreAssignmentAllowed is false", g.scoreAssignmentAllowed === false, `v=${g.scoreAssignmentAllowed}`);
    add("12X-AE: jito gate scoreAssigned is false", g.scoreAssigned === false, `v=${g.scoreAssigned}`);
    add("12X-AF: jito gate is not approved_for_scoring", g.status !== "approved_for_scoring", `status=${g.status}`);
  }
  // 12X-AG. No OTHER candidate is ready_for_review.
  {
    const others = ids.filter((id) => id !== "jito");
    const bad = others.filter((id) => evaluateProtocolRiskCandidateScoreAssignmentGateWithGatherDecisions(id, FRESH_AS_OF).status === "ready_for_review");
    add("12X-AG: no other candidate is ready_for_review", bad.length === 0, `bad=${bad.join(",") || "none"}`);
  }
  // 12X-AH. No candidate approved_for_scoring.
  {
    const bad = ids.filter((id) => evaluateProtocolRiskCandidateScoreAssignmentGateWithGatherDecisions(id, FRESH_AS_OF).status === "approved_for_scoring");
    add("12X-AH: no candidate is approved_for_scoring", bad.length === 0, `bad=${bad.join(",") || "none"}`);
  }
  // 12X-AI. Base evidence drafts not mutated.
  {
    const before = JSON.stringify(getSolLiquidStakingEvidenceDrafts());
    evaluateCandidateReadinessFromGatherDecisions("jito", FRESH_AS_OF);
    const after = JSON.stringify(getSolLiquidStakingEvidenceDrafts());
    add("12X-AI: base evidence drafts are not mutated", before === after, `unchanged=${before === after}`);
  }
  // 12X-AJ. No production metadata updated (auditStatus/withdrawal/fees unchanged).
  {
    const market = buildSolLiquidStakingMarketDataFromExistingSources();
    const ok = getProtocolRiskData("jito").auditStatus === "unknown" && market.jito.withdrawalTimeHours === undefined && market.jito.fees === undefined;
    add("12X-AJ: no production metadata is updated", ok, `audit=${getProtocolRiskData("jito").auditStatus} wd=${market.jito.withdrawalTimeHours} fees=${market.jito.fees}`);
  }
  // 12X-AK/AL. No riskScore.
  add("12X-AK: no riskScore is assigned anywhere", ids.every((id) => getProtocolRiskData(id).riskScore === undefined), "none");
  add("12X-AL: riskScore remains absent for all five", ids.every((id) => getProtocolRiskData(id).riskScore === undefined), "absent");
  // 12X-AM/AN/AO. Approval flags false.
  add("12X-AM: PROTOCOL_RISK_RUBRIC_APPROVED remains false", PROTOCOL_RISK_RUBRIC_APPROVED === false, `flag=${PROTOCOL_RISK_RUBRIC_APPROVED}`);
  add("12X-AN: PROTOCOL_RISK_APPROVAL_DECISION_APPROVED remains false", PROTOCOL_RISK_APPROVAL_DECISION_APPROVED === false, `flag=${PROTOCOL_RISK_APPROVAL_DECISION_APPROVED}`);
  add("12X-AO: canAssignProtocolRiskScores() remains false", canAssignProtocolRiskScores() === false, `v=${canAssignProtocolRiskScores()}`);
  // 12X-AP. productionReady remains false.
  add("12X-AP: getProtocolSelectionGoNoGo().productionReady remains false", gng.productionReady === false, `v=${gng.productionReady}`);
  // 12X-AQ. Live staking not_evaluated.
  add("12X-AQ: live staking protocolSelection.status remains not_evaluated", staking?.protocolSelection?.status === "not_evaluated", `status=${staking?.protocolSelection?.status}`);
  // 12X-AR. No live suggestion has selectedProtocolId/Name.
  {
    const allSug = [...stakingRun.suggestions, ...stableRun.suggestions];
    const bad = allSug.filter((s) => s.protocolSelection?.selectedProtocolId != null || s.protocolSelection?.selectedProtocolName != null);
    add("12X-AR: no live suggestion has selectedProtocolId/Name", bad.length === 0, `violations=${bad.length}`);
  }
  // 12X-AS. Cards/modal do not expose JitoSOL readiness or protocol names.
  {
    const tokens = ["Jupiter", "Marinade", "Jito", "BlazeStake", "Sanctum", "JitoSOL", "ready_for_review", "gatheredDimensions", "JitoEvidence", "candidateReadyForReview"];
    const scan = (s: typeof staking) => JSON.stringify(toSuggestionCard(s!)) + JSON.stringify(s?.reviewDetails);
    const json = scan(staking) + scan(stable);
    const leaks = tokens.filter((t) => json.includes(t));
    add("12X-AS: cards/modal never expose JitoSOL readiness or protocol names", leaks.length === 0, `leaks=${leaks.join(",") || "none"}`);
  }
  // 12X-AT/AU/AV. Flags at safe defaults.
  add("12X-AT: PROTOCOL_SELECTION_IMPLEMENTED remains false", PROTOCOL_SELECTION_IMPLEMENTED === false, `flag=${PROTOCOL_SELECTION_IMPLEMENTED}`);
  add("12X-AU: PROTOCOL_SELECTION_SHOW_IN_UI remains false", PROTOCOL_SELECTION_SHOW_IN_UI === false, `flag=${PROTOCOL_SELECTION_SHOW_IN_UI}`);
  add("12X-AV: PROTOCOL_SELECTION_ALLOW_TRANSACTIONS remains false", PROTOCOL_SELECTION_ALLOW_TRANSACTIONS === false, `flag=${PROTOCOL_SELECTION_ALLOW_TRANSACTIONS}`);
  // 12X-AW. No transaction/signature/swap path in confirmation output.
  {
    const json = JSON.stringify(confs).toLowerCase();
    const txTokens = ["sendtransaction", "signtransaction", "signalltransactions", "signmessage", "publickey", "swap(", "deposit(", "withdraw("];
    const hits = txTokens.filter((t) => json.includes(t));
    add("12X-AW: no transaction/signature/swap path in JitoSOL evidence output", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }
  // 12X-BA. No forbidden investment claims in confirmation output.
  {
    const json = JSON.stringify(confs).toLowerCase();
    const forbidden = ["best", "safest", "optimal", "guaranteed", "risk-free", "recommended"];
    const hits = forbidden.filter((w) => json.includes(w));
    add("12X-BA: no forbidden investment claims in JitoSOL evidence output", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 12Y — human rubric approval + riskScore assignment mechanism.
 * Blocked by default; QA-only score path; no production, no selection.
 * ------------------------------------------------------------------ */
export function runProtocolRiskScoreAssignmentFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2);
  const stakingRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stableRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT);
  const staking = stakingRun.suggestions.find((s) => s.category === "staking");
  const stable = stableRun.suggestions.find((s) => s.category === "stable_yield");
  const ids = [...SOL_LIQUID_STAKING_CANDIDATE_IDS];

  const FRESH_AS_OF = "2026-07-12T06:00:00Z";
  const STALE_AS_OF = "2026-08-01T00:00:00Z";
  const qa = getQaOnlyJitoRiskScoreAssignmentInput();
  const withScore = (dim: (typeof qa.dimensionScores)[number]["dimensionId"], score: number) => ({
    ...qa,
    dimensionScores: qa.dimensionScores.map((d) => (d.dimensionId === dim ? { ...d, score } : d)),
  });
  const approvedDecision = createExplicitProtocolRiskApprovalDecision({
    decisionId: "qa-only-explicit-approval",
    rubricVersion: PROTOCOL_RISK_RUBRIC_VERSION,
    status: "approved",
    reviewer: "qa-example",
    reviewerRole: "risk",
    decidedAt: "2026-07-12T00:00:00Z",
    notes: ["QA-only explicit approval to test the calculation path. Not production."],
    rubricApproved: true,
    scoreAssignmentAllowed: true,
  });
  const okOpts = { approvalDecision: approvedDecision, asOf: FRESH_AS_OF };

  const defaultResult = evaluateRiskScoreAssignment(getDefaultProtocolRiskScoreAssignmentInput("jito"), { asOf: FRESH_AS_OF });
  const approvedResult = evaluateRiskScoreAssignment(qa, okOpts);
  const gng = getProtocolSelectionGoNoGo("t");

  // 12Y-A…G. Scoping constants.
  add("12Y-A: PROTOCOL_RISK_SCORE_ASSIGNMENT_EXISTS is true", PROTOCOL_RISK_SCORE_ASSIGNMENT_EXISTS === true, `flag=${PROTOCOL_RISK_SCORE_ASSIGNMENT_EXISTS}`);
  add("12Y-B: PROTOCOL_RISK_SCORE_ASSIGNMENT_APPROVES_RUBRIC_BY_DEFAULT is false", PROTOCOL_RISK_SCORE_ASSIGNMENT_APPROVES_RUBRIC_BY_DEFAULT === false, `flag=${PROTOCOL_RISK_SCORE_ASSIGNMENT_APPROVES_RUBRIC_BY_DEFAULT}`);
  add("12Y-C: PROTOCOL_RISK_SCORE_ASSIGNMENT_ASSIGNS_PRODUCTION_SCORES is false", PROTOCOL_RISK_SCORE_ASSIGNMENT_ASSIGNS_PRODUCTION_SCORES === false, `flag=${PROTOCOL_RISK_SCORE_ASSIGNMENT_ASSIGNS_PRODUCTION_SCORES}`);
  add("12Y-D: PROTOCOL_RISK_SCORE_ASSIGNMENT_AFFECTS_PRODUCTION is false", PROTOCOL_RISK_SCORE_ASSIGNMENT_AFFECTS_PRODUCTION === false, `flag=${PROTOCOL_RISK_SCORE_ASSIGNMENT_AFFECTS_PRODUCTION}`);
  add("12Y-E: PROTOCOL_RISK_SCORE_ASSIGNMENT_ENABLES_SELECTION is false", PROTOCOL_RISK_SCORE_ASSIGNMENT_ENABLES_SELECTION === false, `flag=${PROTOCOL_RISK_SCORE_ASSIGNMENT_ENABLES_SELECTION}`);
  add("12Y-F: PROTOCOL_RISK_SCORE_ASSIGNMENT_UPDATES_METADATA is false", PROTOCOL_RISK_SCORE_ASSIGNMENT_UPDATES_METADATA === false, `flag=${PROTOCOL_RISK_SCORE_ASSIGNMENT_UPDATES_METADATA}`);
  add("12Y-G: PROTOCOL_RISK_SCORE_ASSIGNMENT_MUTATES_EVIDENCE is false", PROTOCOL_RISK_SCORE_ASSIGNMENT_MUTATES_EVIDENCE === false, `flag=${PROTOCOL_RISK_SCORE_ASSIGNMENT_MUTATES_EVIDENCE}`);

  // 12Y-H…J. Default approval decision unchanged.
  {
    const d = getCurrentProtocolRiskRubricApprovalDecision();
    add("12Y-H: getCurrentProtocolRiskRubricApprovalDecision() still not_submitted", d.status === "not_submitted", `status=${d.status}`);
    add("12Y-I: default rubricApproved remains false", d.rubricApproved === false, `v=${d.rubricApproved}`);
    add("12Y-J: default scoreAssignmentAllowed remains false", d.scoreAssignmentAllowed === false, `v=${d.scoreAssignmentAllowed}`);
  }
  // 12Y-K/L/M. Default JitoSOL assignment blocked, no score.
  add("12Y-K: default JitoSOL riskScore assignment is blocked", defaultResult.status === "blocked", `status=${defaultResult.status}`);
  add("12Y-L: default JitoSOL riskScore is absent", defaultResult.riskScore === undefined, `score=${defaultResult.riskScore}`);
  add("12Y-M: blocked result includes rubric_not_approved or score_assignment_not_allowed", defaultResult.blockers.includes("rubric_not_approved") || defaultResult.blockers.includes("score_assignment_not_allowed"), `blockers=${defaultResult.blockers.join(",")}`);
  // 12Y-N. Weighted calc = 7.75.
  add("12Y-N: calculateWeightedRiskScore returns 7.75 for QA-only Jito input", calculateWeightedRiskScore(qa.dimensionScores) === 7.75, `v=${calculateWeightedRiskScore(qa.dimensionScores)}`);
  // 12Y-O. QA-only label present.
  add("12Y-O: QA-only scoring input is labeled QA-only / non-production", qa.dimensionScores.every((d) => d.rationale.some((r) => r.includes(QA_ONLY_SCORING_LABEL))), `label=${QA_ONLY_SCORING_LABEL}`);
  // 12Y-P. Score > 10 → rejected.
  {
    const r = evaluateRiskScoreAssignment(withScore("audit_security", 11), okOpts);
    add("12Y-P: score above 10 is rejected", r.status === "rejected" && r.riskScore === undefined, `status=${r.status}`);
  }
  // 12Y-Q. Score < 0 → rejected.
  {
    const r = evaluateRiskScoreAssignment(withScore("audit_security", -1), okOpts);
    add("12Y-Q: score below 0 is rejected", r.status === "rejected" && r.riskScore === undefined, `status=${r.status}`);
  }
  // 12Y-R. Missing dimension → needs_review, no score.
  {
    const missing = { ...qa, dimensionScores: qa.dimensionScores.filter((d) => d.dimensionId !== "maturity") };
    const r = evaluateRiskScoreAssignment(missing, okOpts);
    add("12Y-R: missing dimension returns needs_review/blocked with no riskScore", (r.status === "needs_review" || r.status === "blocked") && r.riskScore === undefined, `status=${r.status}`);
  }
  // 12Y-S. Duplicate dimension → rejected, no score.
  {
    const dup = { ...qa, dimensionScores: [...qa.dimensionScores, qa.dimensionScores[0]] };
    const r = evaluateRiskScoreAssignment(dup, okOpts);
    add("12Y-S: duplicate dimension returns rejected with no riskScore", r.status === "rejected" && r.riskScore === undefined, `status=${r.status}`);
  }
  // 12Y-T. Missing reviewer → needs_review/rejected, no score.
  {
    const noRev = { ...qa, dimensionScores: qa.dimensionScores.map((d, i) => (i === 0 ? { ...d, reviewer: "" } : d)) };
    const r = evaluateRiskScoreAssignment(noRev, okOpts);
    add("12Y-T: missing reviewer returns needs_review/rejected with no riskScore", (r.status === "needs_review" || r.status === "rejected") && r.riskScore === undefined, `status=${r.status}`);
  }
  // 12Y-U. Missing rationale → needs_review/rejected, no score.
  {
    const noRat = { ...qa, dimensionScores: qa.dimensionScores.map((d, i) => (i === 0 ? { ...d, rationale: [] } : d)) };
    const r = evaluateRiskScoreAssignment(noRat, okOpts);
    add("12Y-U: missing rationale returns needs_review/rejected with no riskScore", (r.status === "needs_review" || r.status === "rejected") && r.riskScore === undefined, `status=${r.status}`);
  }
  // 12Y-V. Missing evidenceSourceNames → needs_review/rejected, no score.
  {
    const noEv = { ...qa, dimensionScores: qa.dimensionScores.map((d, i) => (i === 0 ? { ...d, evidenceSourceNames: [] } : d)) };
    const r = evaluateRiskScoreAssignment(noEv, okOpts);
    add("12Y-V: missing evidenceSourceNames returns needs_review/rejected with no riskScore", (r.status === "needs_review" || r.status === "rejected") && r.riskScore === undefined, `status=${r.status}`);
  }
  // 12Y-W. Explicit approved helper does not mutate default.
  add("12Y-W: explicit approved decision helper does not mutate default decision", getCurrentProtocolRiskRubricApprovalDecision().status === "not_submitted" && approvedDecision.status === "approved", `default=${getCurrentProtocolRiskRubricApprovalDecision().status}`);
  // 12Y-X/Y/Z/AA/AB. Explicit approved + valid QA + fresh → score_assigned 7.75, safe flags.
  add("12Y-X: explicit approved + valid QA + fresh → score_assigned", approvedResult.status === "score_assigned", `status=${approvedResult.status}`);
  add("12Y-Y: score_assigned result has riskScore 7.75", approvedResult.riskScore === 7.75, `score=${approvedResult.riskScore}`);
  add("12Y-Z: score_assigned result has productionMetadataUpdated false", approvedResult.productionMetadataUpdated === false, `v=${approvedResult.productionMetadataUpdated}`);
  add("12Y-AA: score_assigned result has evidenceDraftMutated false", approvedResult.evidenceDraftMutated === false, `v=${approvedResult.evidenceDraftMutated}`);
  add("12Y-AB: score_assigned result has selectionEnabled false", approvedResult.selectionEnabled === false, `v=${approvedResult.selectionEnabled}`);
  // 12Y-AC. Stale asOf → blocked.
  {
    const r = evaluateRiskScoreAssignment(qa, { approvalDecision: approvedDecision, asOf: STALE_AS_OF });
    add("12Y-AC: stale TVL/APY asOf → JitoSOL score assignment blocked", r.status === "blocked" && r.blockers.includes("candidate_not_ready_for_review") && r.riskScore === undefined, `status=${r.status} blockers=${r.blockers.join(",")}`);
  }
  // 12Y-AD/AE. No production riskScore in registry.
  add("12Y-AD: no production riskScore written to protocolRiskRegistry", getProtocolRiskData("jito").riskScore === undefined, `jito=${getProtocolRiskData("jito").riskScore}`);
  add("12Y-AE: riskScore remains absent for all five in production registry", ids.every((id) => getProtocolRiskData(id).riskScore === undefined), "absent");
  // 12Y-AF/AG/AH. Approval flags false.
  add("12Y-AF: PROTOCOL_RISK_RUBRIC_APPROVED remains false", PROTOCOL_RISK_RUBRIC_APPROVED === false, `flag=${PROTOCOL_RISK_RUBRIC_APPROVED}`);
  add("12Y-AG: PROTOCOL_RISK_APPROVAL_DECISION_APPROVED remains false", PROTOCOL_RISK_APPROVAL_DECISION_APPROVED === false, `flag=${PROTOCOL_RISK_APPROVAL_DECISION_APPROVED}`);
  add("12Y-AH: canAssignProtocolRiskScores() remains false by default", canAssignProtocolRiskScores() === false, `v=${canAssignProtocolRiskScores()}`);
  // 12Y-AI. productionReady remains false.
  add("12Y-AI: getProtocolSelectionGoNoGo().productionReady remains false", gng.productionReady === false, `v=${gng.productionReady}`);
  // 12Y-AJ. Live staking not_evaluated.
  add("12Y-AJ: live staking protocolSelection.status remains not_evaluated", staking?.protocolSelection?.status === "not_evaluated", `status=${staking?.protocolSelection?.status}`);
  // 12Y-AK. No live suggestion has selectedProtocolId/Name.
  {
    const allSug = [...stakingRun.suggestions, ...stableRun.suggestions];
    const bad = allSug.filter((s) => s.protocolSelection?.selectedProtocolId != null || s.protocolSelection?.selectedProtocolName != null);
    add("12Y-AK: no live suggestion has selectedProtocolId/Name", bad.length === 0, `violations=${bad.length}`);
  }
  // 12Y-AL. Cards/modal do not expose riskScore assignment or protocol names.
  {
    const tokens = ["Jupiter", "Marinade", "Jito", "BlazeStake", "Sanctum", "JitoSOL", "riskScore", "weightedContribution", "score_assigned", "7.75"];
    const scan = (s: typeof staking) => JSON.stringify(toSuggestionCard(s!)) + JSON.stringify(s?.reviewDetails);
    const json = scan(staking) + scan(stable);
    const leaks = tokens.filter((t) => json.includes(t));
    add("12Y-AL: cards/modal never expose riskScore assignment or protocol names", leaks.length === 0, `leaks=${leaks.join(",") || "none"}`);
  }
  // 12Y-AM/AN/AO. Flags at safe defaults.
  add("12Y-AM: PROTOCOL_SELECTION_IMPLEMENTED remains false", PROTOCOL_SELECTION_IMPLEMENTED === false, `flag=${PROTOCOL_SELECTION_IMPLEMENTED}`);
  add("12Y-AN: PROTOCOL_SELECTION_SHOW_IN_UI remains false", PROTOCOL_SELECTION_SHOW_IN_UI === false, `flag=${PROTOCOL_SELECTION_SHOW_IN_UI}`);
  add("12Y-AO: PROTOCOL_SELECTION_ALLOW_TRANSACTIONS remains false", PROTOCOL_SELECTION_ALLOW_TRANSACTIONS === false, `flag=${PROTOCOL_SELECTION_ALLOW_TRANSACTIONS}`);
  // 12Y-AP. No transaction/signature/swap path in scoring output.
  {
    const json = (JSON.stringify(approvedResult) + JSON.stringify(qa)).toLowerCase();
    const txTokens = ["sendtransaction", "signtransaction", "signalltransactions", "signmessage", "publickey", "swap(", "deposit(", "withdraw("];
    const hits = txTokens.filter((t) => json.includes(t));
    add("12Y-AP: no transaction/signature/swap path in scoring output", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }
  // 12Y-AT. No forbidden investment claims in scoring output.
  {
    const json = (JSON.stringify(approvedResult) + JSON.stringify(qa)).toLowerCase();
    const forbidden = ["best", "safest", "optimal", "guaranteed", "risk-free", "recommended"];
    const hits = forbidden.filter((w) => json.includes(w));
    add("12Y-AT: no forbidden investment claims in scoring output", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 12Z — staged JitoSOL production metadata registry (inactive by default).
 * No production riskScore, no selection, no live behavior change.
 * ------------------------------------------------------------------ */
export function runSolLstProductionMetadataFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2);
  const stakingRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stableRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT);
  const staking = stakingRun.suggestions.find((s) => s.category === "staking");
  const stable = stableRun.suggestions.find((s) => s.category === "stable_yield");
  const ids = [...SOL_LIQUID_STAKING_CANDIDATE_IDS];

  const FRESH_AS_OF = "2026-07-12T06:00:00Z";
  const STALE_AS_OF = "2026-08-01T00:00:00Z";
  const jito = buildJitoSolProductionMetadataCandidate({ asOf: FRESH_AS_OF });
  const validation = validateSolLstProductionMetadataCandidate(jito);
  const summary = summarizeSolLstProductionMetadata(undefined);
  const gng = getProtocolSelectionGoNoGo("t");

  // 12Z-A…F. Scoping constants.
  add("12Z-A: PROTOCOL_SOL_LST_PRODUCTION_METADATA_EXISTS is true", PROTOCOL_SOL_LST_PRODUCTION_METADATA_EXISTS === true, `flag=${PROTOCOL_SOL_LST_PRODUCTION_METADATA_EXISTS}`);
  add("12Z-B: PROTOCOL_SOL_LST_PRODUCTION_METADATA_ACTIVE is false", PROTOCOL_SOL_LST_PRODUCTION_METADATA_ACTIVE === false, `flag=${PROTOCOL_SOL_LST_PRODUCTION_METADATA_ACTIVE}`);
  add("12Z-C: PROTOCOL_SOL_LST_PRODUCTION_METADATA_ENABLES_SELECTION is false", PROTOCOL_SOL_LST_PRODUCTION_METADATA_ENABLES_SELECTION === false, `flag=${PROTOCOL_SOL_LST_PRODUCTION_METADATA_ENABLES_SELECTION}`);
  add("12Z-D: PROTOCOL_SOL_LST_PRODUCTION_METADATA_UPDATES_LIVE_SUGGESTIONS is false", PROTOCOL_SOL_LST_PRODUCTION_METADATA_UPDATES_LIVE_SUGGESTIONS === false, `flag=${PROTOCOL_SOL_LST_PRODUCTION_METADATA_UPDATES_LIVE_SUGGESTIONS}`);
  add("12Z-E: PROTOCOL_SOL_LST_PRODUCTION_METADATA_ALLOWS_TRANSACTIONS is false", PROTOCOL_SOL_LST_PRODUCTION_METADATA_ALLOWS_TRANSACTIONS === false, `flag=${PROTOCOL_SOL_LST_PRODUCTION_METADATA_ALLOWS_TRANSACTIONS}`);
  add("12Z-F: PROTOCOL_SOL_LST_PRODUCTION_METADATA_USES_QA_SCORE is false", PROTOCOL_SOL_LST_PRODUCTION_METADATA_USES_QA_SCORE === false, `flag=${PROTOCOL_SOL_LST_PRODUCTION_METADATA_USES_QA_SCORE}`);

  // 12Z-G/H. Candidate exists + identity.
  add("12Z-G: JitoSOL production metadata candidate exists", jito != null && typeof jito === "object", "exists");
  add("12Z-H: candidate has protocolId jito and lstSymbol JitoSOL", jito.protocolId === "jito" && jito.lstSymbol === "JitoSOL", `id=${jito.protocolId} sym=${jito.lstSymbol}`);
  // 12Z-I. TVL/APY/APY-30d from confirmed 12V (fresh).
  add("12Z-I: candidate has TVL/APY/APY-30d from confirmed 12V values when fresh", jito.tvlUsd === 767950000 && jito.apyPct === 5.36 && jito.apy30dPct === 5.45 && jito.dataFreshnessStatus === "fresh", `tvl=${jito.tvlUsd} apy=${jito.apyPct} apy30=${jito.apy30dPct}`);
  // 12Z-J. Withdrawal.
  add("12Z-J: candidate has withdrawal mechanics + withdrawalTimeHours from 12X", jito.withdrawal.withdrawalTimeHours === 48 && jito.withdrawal.instantExitIsSwapRoute === true && jito.withdrawal.withdrawalMechanics.length > 0, `wd=${jito.withdrawal.withdrawalTimeHours}`);
  // 12Z-K. Fees.
  add("12Z-K: candidate has fee metadata from 12X", jito.fees.directUnstakeFeePct === 0.1 && jito.fees.annualManagementFeePct === 4, `unstake=${jito.fees.directUnstakeFeePct} mgmt=${jito.fees.annualManagementFeePct}`);
  // 12Z-L. Audit.
  add("12Z-L: candidate has audit metadata from 12X", jito.audit.auditStatus === "reviewed" && jito.audit.auditFirms.includes("Quantstamp") && jito.audit.auditFirms.includes("Neodyme") && jito.audit.auditFirms.includes("Kudelski"), `firms=${jito.audit.auditFirms.join(",")}`);
  // 12Z-M. Operational summary.
  add("12Z-M: candidate has operational summary from 12X", jito.operationalSummary.toLowerCase().includes("stakenet") && jito.operationalSummary.length > 0, `len=${jito.operationalSummary.length}`);
  // 12Z-N. Incident caveat, no clean-history claim.
  {
    const s = jito.incidentReviewSummary.toLowerCase();
    add("12Z-N: candidate has incident caveat and does not claim clean history", s.includes("not a clean-history claim") && s.includes("manual review"), `has=${s.includes("not a clean-history claim")}`);
  }
  // 12Z-O/P. RiskScore absent by default.
  add("12Z-O: default candidate riskScore is absent", jito.risk.riskScore === undefined, `score=${jito.risk.riskScore}`);
  add("12Z-P: default candidate riskScoreStatus is absent", jito.risk.riskScoreStatus === "absent", `status=${jito.risk.riskScoreStatus}`);
  // 12Z-Q…T. Production/selection flags false.
  add("12Z-Q: default candidate productionReady is false", jito.productionReady === false, `v=${jito.productionReady}`);
  add("12Z-R: default candidate selectionEnabled is false", jito.selectionEnabled === false, `v=${jito.selectionEnabled}`);
  add("12Z-S: default candidate liveSuggestionsUpdated is false", jito.liveSuggestionsUpdated === false, `v=${jito.liveSuggestionsUpdated}`);
  add("12Z-T: default candidate transactionsEnabled is false", jito.transactionsEnabled === false, `v=${jito.transactionsEnabled}`);
  // 12Z-U/V/W. Blockers present.
  add("12Z-U: blockers include production_risk_score_absent", jito.blockers.includes("production_risk_score_absent"), `blockers=${jito.blockers.join(",")}`);
  add("12Z-V: blockers include source_reverification_required_before_beta", jito.blockers.includes("source_reverification_required_before_beta"), `has=${jito.blockers.includes("source_reverification_required_before_beta")}`);
  add("12Z-W: blockers include protocol_selection_disabled", jito.blockers.includes("protocol_selection_disabled"), `has=${jito.blockers.includes("protocol_selection_disabled")}`);
  // 12Z-X. QA-only 7.75 is not used as production. Supply a QA-tagged score_assigned result.
  {
    const qaResult = evaluateRiskScoreAssignment(getQaOnlyJitoRiskScoreAssignmentInput(), {
      approvalDecision: createExplicitProtocolRiskApprovalDecision({
        decisionId: "qa-only-explicit-approval", rubricVersion: PROTOCOL_RISK_RUBRIC_VERSION, status: "approved",
        reviewer: "qa-example", reviewerRole: "risk", decidedAt: "2026-07-12T00:00:00Z",
        notes: ["QA-only"], rubricApproved: true, scoreAssignmentAllowed: true,
      }),
      asOf: FRESH_AS_OF,
    });
    const withQa = buildJitoSolProductionMetadataCandidate({
      asOf: FRESH_AS_OF,
      approvalDecision: createExplicitProtocolRiskApprovalDecision({
        decisionId: "qa-only-explicit-approval", rubricVersion: PROTOCOL_RISK_RUBRIC_VERSION, status: "approved",
        reviewer: "qa-example", reviewerRole: "risk", decidedAt: "2026-07-12T00:00:00Z",
        notes: ["QA-only"], rubricApproved: true, scoreAssignmentAllowed: true,
      }),
      riskScoreAssignmentResult: qaResult,
    });
    add("12Z-X: QA-only 7.75 score is not used as production riskScore", withQa.risk.riskScore === undefined && withQa.risk.riskScoreStatus !== "approved" && withQa.blockers.includes("production_risk_score_absent"), `score=${withQa.risk.riskScore} status=${withQa.risk.riskScoreStatus}`);
  }
  // 12Z-Y/Z. Validation flags.
  add("12Z-Y: validation productionReady is false", validation.productionReady === false, `v=${validation.productionReady}`);
  add("12Z-Z: validation selectionEnabled is false", validation.selectionEnabled === false, `v=${validation.selectionEnabled}`);
  // 12Z-AA. No active metadata.
  add("12Z-AA: hasActiveSolLstProductionMetadata(jito) returns false", hasActiveSolLstProductionMetadata("jito") === false, `v=${hasActiveSolLstProductionMetadata("jito")}`);
  // 12Z-AB/AC. Summary counts.
  add("12Z-AB: summary.productionReadyCount is 0", summary.productionReadyCount === 0, `v=${summary.productionReadyCount}`);
  add("12Z-AC: summary.selectionEnabledCount is 0", summary.selectionEnabledCount === 0, `v=${summary.selectionEnabledCount}`);
  // 12Z-AD. Stale TVL/APY → stale or blocked.
  {
    const staleJito = buildJitoSolProductionMetadataCandidate({ asOf: STALE_AS_OF });
    const ok = (staleJito.dataFreshnessStatus === "stale" || staleJito.status === "blocked") && staleJito.tvlUsd === undefined;
    add("12Z-AD: stale TVL/APY → dataFreshnessStatus stale or candidate blocked", ok, `fresh=${staleJito.dataFreshnessStatus} status=${staleJito.status}`);
  }
  // 12Z-AE. Cannot become active without approved non-QA riskScore (getJito never active).
  add("12Z-AE: candidate cannot become active without approved non-QA riskScore", getJitoSolProductionMetadataCandidate({ asOf: FRESH_AS_OF }).status !== "active", `status=${getJitoSolProductionMetadataCandidate({ asOf: FRESH_AS_OF }).status}`);
  // 12Z-AF. Cannot become active without source re-verification flag.
  add("12Z-AF: candidate cannot become active without source re-verification flag", buildJitoSolProductionMetadataCandidate({ asOf: FRESH_AS_OF, sourceReVerifiedForBeta: false }).status !== "active", `status=${buildJitoSolProductionMetadataCandidate({ asOf: FRESH_AS_OF }).status}`);
  // 12Z-AG. No production riskScore in registry.
  add("12Z-AG: production metadata does not update protocolRiskRegistry", ids.every((id) => getProtocolRiskData(id).riskScore === undefined), "no riskScore");
  // 12Z-AH. DEFILLAMA_POOL_MAPPINGS still only sanctum.
  {
    const keys = Object.keys(DEFILLAMA_POOL_MAPPINGS);
    add("12Z-AH: production metadata does not update DEFILLAMA_POOL_MAPPINGS", keys.length === 1 && keys[0] === "sanctum", `keys=${keys.join(",")}`);
  }
  // 12Z-AI. riskScore absent for all five.
  add("12Z-AI: riskScore remains absent for all five in production registry", ids.every((id) => getProtocolRiskData(id).riskScore === undefined), "absent");
  // 12Z-AJ/AK/AL. Approval flags false.
  add("12Z-AJ: PROTOCOL_RISK_RUBRIC_APPROVED remains false", PROTOCOL_RISK_RUBRIC_APPROVED === false, `flag=${PROTOCOL_RISK_RUBRIC_APPROVED}`);
  add("12Z-AK: PROTOCOL_RISK_APPROVAL_DECISION_APPROVED remains false", PROTOCOL_RISK_APPROVAL_DECISION_APPROVED === false, `flag=${PROTOCOL_RISK_APPROVAL_DECISION_APPROVED}`);
  add("12Z-AL: canAssignProtocolRiskScores() remains false by default", canAssignProtocolRiskScores() === false, `v=${canAssignProtocolRiskScores()}`);
  // 12Z-AM. productionReady remains false.
  add("12Z-AM: getProtocolSelectionGoNoGo().productionReady remains false", gng.productionReady === false, `v=${gng.productionReady}`);
  // 12Z-AN. Live staking not_evaluated.
  add("12Z-AN: live staking protocolSelection.status remains not_evaluated", staking?.protocolSelection?.status === "not_evaluated", `status=${staking?.protocolSelection?.status}`);
  // 12Z-AO. No live suggestion has selectedProtocolId/Name.
  {
    const allSug = [...stakingRun.suggestions, ...stableRun.suggestions];
    const bad = allSug.filter((s) => s.protocolSelection?.selectedProtocolId != null || s.protocolSelection?.selectedProtocolName != null);
    add("12Z-AO: no live suggestion has selectedProtocolId/Name", bad.length === 0, `violations=${bad.length}`);
  }
  // 12Z-AP. Cards/modal do not expose production metadata or protocol names.
  {
    const tokens = ["Jupiter", "Marinade", "Jito", "BlazeStake", "Sanctum", "JitoSOL", "767950000", "annualManagementFeePct", "ProductionMetadata", "auditFirms"];
    const scan = (s: typeof staking) => JSON.stringify(toSuggestionCard(s!)) + JSON.stringify(s?.reviewDetails);
    const json = scan(staking) + scan(stable);
    const leaks = tokens.filter((t) => json.includes(t));
    add("12Z-AP: cards/modal never expose production metadata or protocol names", leaks.length === 0, `leaks=${leaks.join(",") || "none"}`);
  }
  // 12Z-AQ/AR/AS. Flags at safe defaults.
  add("12Z-AQ: PROTOCOL_SELECTION_IMPLEMENTED remains false", PROTOCOL_SELECTION_IMPLEMENTED === false, `flag=${PROTOCOL_SELECTION_IMPLEMENTED}`);
  add("12Z-AR: PROTOCOL_SELECTION_SHOW_IN_UI remains false", PROTOCOL_SELECTION_SHOW_IN_UI === false, `flag=${PROTOCOL_SELECTION_SHOW_IN_UI}`);
  add("12Z-AS: PROTOCOL_SELECTION_ALLOW_TRANSACTIONS remains false", PROTOCOL_SELECTION_ALLOW_TRANSACTIONS === false, `flag=${PROTOCOL_SELECTION_ALLOW_TRANSACTIONS}`);
  // 12Z-AT. No transaction/signature/swap path in metadata output.
  {
    const json = (JSON.stringify(jito) + JSON.stringify(summary)).toLowerCase();
    const txTokens = ["sendtransaction", "signtransaction", "signalltransactions", "signmessage", "publickey", "swap(", "deposit(", "withdraw("];
    const hits = txTokens.filter((t) => json.includes(t));
    add("12Z-AT: no transaction/signature/swap path in production metadata output", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }
  // 12Z-AX. No forbidden investment claims in metadata output.
  {
    const json = JSON.stringify(jito).toLowerCase();
    const forbidden = ["best", "safest", "optimal", "guaranteed", "risk-free", "recommended"];
    const hits = forbidden.filter((w) => json.includes(w));
    add("12Z-AX: no forbidden investment claims in production metadata output", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 13A — exact SOL liquid-staking selector shell (hard-disabled, internal).
 * Returns disabled by default; no selection, no UI, no live behavior change.
 * ------------------------------------------------------------------ */
export function runSolLstSelectorShellFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2);
  const stakingRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stableRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT);
  const staking = stakingRun.suggestions.find((s) => s.category === "staking");
  const stable = stableRun.suggestions.find((s) => s.category === "stable_yield");
  const ids = [...SOL_LIQUID_STAKING_CANDIDATE_IDS];

  const FRESH_AS_OF = "2026-07-12T06:00:00Z";
  const solInput = { assetSymbol: "SOL", eligibleAmountSol: 10, asOf: FRESH_AS_OF };
  const result = selectSolLiquidStakingProtocol(solInput);
  const dry = dryRunSolLstSelector(solInput);
  const jitoEval = dry.candidates.find((c) => c.protocolId === "jito");
  const preview = previewSolLstSelectorReadiness(solInput);
  const gng = getProtocolSelectionGoNoGo("t");

  // 13A-A…H. Scoping constants.
  add("13A-A: PROTOCOL_SOL_LST_SELECTOR_EXISTS is true", PROTOCOL_SOL_LST_SELECTOR_EXISTS === true, `flag=${PROTOCOL_SOL_LST_SELECTOR_EXISTS}`);
  add("13A-B: PROTOCOL_SOL_LST_SELECTOR_ENABLED is false", PROTOCOL_SOL_LST_SELECTOR_ENABLED === false, `flag=${PROTOCOL_SOL_LST_SELECTOR_ENABLED}`);
  add("13A-C: PROTOCOL_SOL_LST_SELECTOR_INTERNAL_ONLY is true", PROTOCOL_SOL_LST_SELECTOR_INTERNAL_ONLY === true, `flag=${PROTOCOL_SOL_LST_SELECTOR_INTERNAL_ONLY}`);
  add("13A-D: PROTOCOL_SOL_LST_SELECTOR_SHOWS_UI is false", PROTOCOL_SOL_LST_SELECTOR_SHOWS_UI === false, `flag=${PROTOCOL_SOL_LST_SELECTOR_SHOWS_UI}`);
  add("13A-E: PROTOCOL_SOL_LST_SELECTOR_USES_PRODUCTION_METADATA is true", PROTOCOL_SOL_LST_SELECTOR_USES_PRODUCTION_METADATA === true, `flag=${PROTOCOL_SOL_LST_SELECTOR_USES_PRODUCTION_METADATA}`);
  add("13A-F: PROTOCOL_SOL_LST_SELECTOR_USES_QA_SCORE is false", PROTOCOL_SOL_LST_SELECTOR_USES_QA_SCORE === false, `flag=${PROTOCOL_SOL_LST_SELECTOR_USES_QA_SCORE}`);
  add("13A-G: PROTOCOL_SOL_LST_SELECTOR_ENABLES_TRANSACTIONS is false", PROTOCOL_SOL_LST_SELECTOR_ENABLES_TRANSACTIONS === false, `flag=${PROTOCOL_SOL_LST_SELECTOR_ENABLES_TRANSACTIONS}`);
  add("13A-H: PROTOCOL_SOL_LST_SELECTOR_UPDATES_LIVE_SUGGESTIONS is false", PROTOCOL_SOL_LST_SELECTOR_UPDATES_LIVE_SUGGESTIONS === false, `flag=${PROTOCOL_SOL_LST_SELECTOR_UPDATES_LIVE_SUGGESTIONS}`);

  // 13A-I…M. Default selector behavior.
  add("13A-I: selectSolLiquidStakingProtocol returns status disabled by default", result.status === "disabled", `status=${result.status}`);
  add("13A-J: default result has no selectedProtocolId", !("selectedProtocolId" in result), `has=${"selectedProtocolId" in result}`);
  add("13A-K: default result has no selectedProtocolName", !("selectedProtocolName" in result), `has=${"selectedProtocolName" in result}`);
  add("13A-L: default result has no selectedLstSymbol", !("selectedLstSymbol" in result), `has=${"selectedLstSymbol" in result}`);
  add("13A-M: default blockers include selector_disabled", result.blockers.includes("selector_disabled"), `blockers=${result.blockers.join(",")}`);
  // 13A-N…R. Dry-run JitoSOL evaluation.
  add("13A-N: dryRunSolLstSelector evaluates JitoSOL candidate as blocked", jitoEval?.status === "blocked", `status=${jitoEval?.status}`);
  add("13A-O: JitoSOL dry-run blockers include approved_risk_score_missing", jitoEval?.blockers.includes("approved_risk_score_missing") === true, `blockers=${jitoEval?.blockers.join(",")}`);
  add("13A-P: JitoSOL dry-run blockers include source_reverification_missing", jitoEval?.blockers.includes("source_reverification_missing") === true, `has=${jitoEval?.blockers.includes("source_reverification_missing")}`);
  add("13A-Q: JitoSOL dry-run blockers include go_no_go_not_passed", jitoEval?.blockers.includes("go_no_go_not_passed") === true, `has=${jitoEval?.blockers.includes("go_no_go_not_passed")}`);
  add("13A-R: JitoSOL dry-run blockers include production_metadata_not_ready/inactive", jitoEval?.blockers.includes("production_metadata_not_ready") === true || jitoEval?.blockers.includes("production_metadata_inactive") === true, `has=${jitoEval?.blockers.includes("production_metadata_not_ready")}`);
  // 13A-S. Dry-run returns no selectedProtocolId.
  add("13A-S: dryRunSolLstSelector does not return selectedProtocolId", !("selectedProtocolId" in dry), `has=${"selectedProtocolId" in dry}`);
  // 13A-T…W. Readiness preview.
  add("13A-T: previewSolLstSelectorReadiness().canSelect is false", preview.canSelect === false, `v=${preview.canSelect}`);
  add("13A-U: nextRequiredActions includes approved non-QA riskScore", preview.nextRequiredActions.some((a) => a.includes("approved non-QA riskScore")), `actions=${preview.nextRequiredActions.length}`);
  add("13A-V: nextRequiredActions includes source re-verification", preview.nextRequiredActions.some((a) => a.includes("source re-verification")), `has=${preview.nextRequiredActions.some((a) => a.includes("source re-verification"))}`);
  add("13A-W: nextRequiredActions includes go/no-go pass", preview.nextRequiredActions.some((a) => a.includes("go/no-go")), `has=${preview.nextRequiredActions.some((a) => a.includes("go/no-go"))}`);
  // 13A-X. Rejects unsupported asset.
  {
    const usdc = selectSolLiquidStakingProtocol({ assetSymbol: "USDC", eligibleAmountSol: 10, asOf: FRESH_AS_OF });
    add("13A-X: selector rejects unsupported assetSymbol (USDC)", usdc.blockers.includes("unsupported_asset") && !("selectedProtocolId" in usdc), `blockers=${usdc.blockers.join(",")}`);
  }
  // 13A-Y. Rejects amount at/below threshold.
  {
    const small = selectSolLiquidStakingProtocol({ assetSymbol: "SOL", eligibleAmountSol: 0.1, asOf: FRESH_AS_OF });
    add("13A-Y: selector rejects eligibleAmountSol at/below minimum threshold", small.blockers.includes("eligible_amount_too_small"), `blockers=${small.blockers.join(",")}`);
  }
  // 13A-Z. Never uses QA-only 7.75 (no candidate surfaces a riskScore).
  add("13A-Z: selector never uses QA-only 7.75 as production riskScore", dry.candidates.every((c) => c.riskScore === undefined), `jitoScore=${jitoEval?.riskScore}`);
  // 13A-AA. Does not mutate production metadata (build twice → identical).
  {
    const a = JSON.stringify(buildJitoSolProductionMetadataCandidate({ asOf: FRESH_AS_OF }));
    dryRunSolLstSelector(solInput);
    const b = JSON.stringify(buildJitoSolProductionMetadataCandidate({ asOf: FRESH_AS_OF }));
    add("13A-AA: selector does not mutate production metadata", a === b, `unchanged=${a === b}`);
  }
  // 13A-AB. Does not update protocolRiskRegistry.
  add("13A-AB: selector does not update protocolRiskRegistry", ids.every((id) => getProtocolRiskData(id).riskScore === undefined), "no riskScore");
  // 13A-AC. Does not update DEFILLAMA_POOL_MAPPINGS.
  {
    const keys = Object.keys(DEFILLAMA_POOL_MAPPINGS);
    add("13A-AC: selector does not update DEFILLAMA_POOL_MAPPINGS", keys.length === 1 && keys[0] === "sanctum", `keys=${keys.join(",")}`);
  }
  // 13A-AD. Does not update evidence drafts.
  {
    const before = JSON.stringify(getSolLiquidStakingEvidenceDrafts());
    selectSolLiquidStakingProtocol(solInput);
    dryRunSolLstSelector(solInput);
    const after = JSON.stringify(getSolLiquidStakingEvidenceDrafts());
    add("13A-AD: selector does not update evidence drafts", before === after, `unchanged=${before === after}`);
  }
  // 13A-AE/AF/AG. Approval flags false.
  add("13A-AE: PROTOCOL_RISK_RUBRIC_APPROVED remains false", PROTOCOL_RISK_RUBRIC_APPROVED === false, `flag=${PROTOCOL_RISK_RUBRIC_APPROVED}`);
  add("13A-AF: PROTOCOL_RISK_APPROVAL_DECISION_APPROVED remains false", PROTOCOL_RISK_APPROVAL_DECISION_APPROVED === false, `flag=${PROTOCOL_RISK_APPROVAL_DECISION_APPROVED}`);
  add("13A-AG: canAssignProtocolRiskScores() remains false by default", canAssignProtocolRiskScores() === false, `v=${canAssignProtocolRiskScores()}`);
  // 13A-AH. productionReady remains false.
  add("13A-AH: getProtocolSelectionGoNoGo().productionReady remains false", gng.productionReady === false, `v=${gng.productionReady}`);
  // 13A-AI. Live staking not_evaluated.
  add("13A-AI: live staking protocolSelection.status remains not_evaluated", staking?.protocolSelection?.status === "not_evaluated", `status=${staking?.protocolSelection?.status}`);
  // 13A-AJ. No live suggestion has selectedProtocolId/Name.
  {
    const allSug = [...stakingRun.suggestions, ...stableRun.suggestions];
    const bad = allSug.filter((s) => s.protocolSelection?.selectedProtocolId != null || s.protocolSelection?.selectedProtocolName != null);
    add("13A-AJ: no live suggestion has selectedProtocolId/Name", bad.length === 0, `violations=${bad.length}`);
  }
  // 13A-AK. Cards/modal do not expose selector data or protocol names.
  {
    const tokens = ["Jupiter", "Marinade", "Jito", "BlazeStake", "Sanctum", "JitoSOL", "selectedProtocolId", "SolLstSelector", "nextRequiredActions", "eligibleAmountSol"];
    const scan = (s: typeof staking) => JSON.stringify(toSuggestionCard(s!)) + JSON.stringify(s?.reviewDetails);
    const json = scan(staking) + scan(stable);
    const leaks = tokens.filter((t) => json.includes(t));
    add("13A-AK: cards/modal never expose selector data or protocol names", leaks.length === 0, `leaks=${leaks.join(",") || "none"}`);
  }
  // 13A-AL/AM/AN. Flags at safe defaults.
  add("13A-AL: PROTOCOL_SELECTION_IMPLEMENTED remains false", PROTOCOL_SELECTION_IMPLEMENTED === false, `flag=${PROTOCOL_SELECTION_IMPLEMENTED}`);
  add("13A-AM: PROTOCOL_SELECTION_SHOW_IN_UI remains false", PROTOCOL_SELECTION_SHOW_IN_UI === false, `flag=${PROTOCOL_SELECTION_SHOW_IN_UI}`);
  add("13A-AN: PROTOCOL_SELECTION_ALLOW_TRANSACTIONS remains false", PROTOCOL_SELECTION_ALLOW_TRANSACTIONS === false, `flag=${PROTOCOL_SELECTION_ALLOW_TRANSACTIONS}`);
  // 13A-AO. No transaction/signature/swap path in selector output.
  {
    const json = (JSON.stringify(result) + JSON.stringify(dry) + JSON.stringify(preview)).toLowerCase();
    const txTokens = ["sendtransaction", "signtransaction", "signalltransactions", "signmessage", "publickey", "swap(", "deposit(", "withdraw("];
    const hits = txTokens.filter((t) => json.includes(t));
    add("13A-AO: no transaction/signature/swap path in selector output", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }
  // 13A-AS. No forbidden investment claims in selector output.
  {
    const json = (JSON.stringify(result) + JSON.stringify(dry) + JSON.stringify(preview)).toLowerCase();
    const forbidden = ["best", "safest", "optimal", "guaranteed", "risk-free", "recommended"];
    const hits = forbidden.filter((w) => json.includes(w));
    add("13A-AS: no forbidden investment claims in selector output", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 13B — internal SOL staking selector preview shell (hard-disabled, unmounted).
 * Copy model only; not in Dashboard/Portfolio/modal, no live behavior change.
 * ------------------------------------------------------------------ */
export function runSolLstSelectorPreviewFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2);
  const stakingRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stableRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT);
  const staking = stakingRun.suggestions.find((s) => s.category === "staking");
  const stable = stableRun.suggestions.find((s) => s.category === "stable_yield");

  const def = getDefaultSolLstSelectorPreview();
  const example = getInternalOnlySolLstSelectorPreviewExample();
  const gng = getProtocolSelectionGoNoGo("t");

  // 13B-A…H. Scoping constants.
  add("13B-A: PROTOCOL_SOL_LST_SELECTOR_PREVIEW_EXISTS is true", PROTOCOL_SOL_LST_SELECTOR_PREVIEW_EXISTS === true, `flag=${PROTOCOL_SOL_LST_SELECTOR_PREVIEW_EXISTS}`);
  add("13B-B: PROTOCOL_SOL_LST_SELECTOR_PREVIEW_ENABLED is false", PROTOCOL_SOL_LST_SELECTOR_PREVIEW_ENABLED === false, `flag=${PROTOCOL_SOL_LST_SELECTOR_PREVIEW_ENABLED}`);
  add("13B-C: PROTOCOL_SOL_LST_SELECTOR_PREVIEW_INTERNAL_ONLY is true", PROTOCOL_SOL_LST_SELECTOR_PREVIEW_INTERNAL_ONLY === true, `flag=${PROTOCOL_SOL_LST_SELECTOR_PREVIEW_INTERNAL_ONLY}`);
  add("13B-D: PROTOCOL_SOL_LST_SELECTOR_PREVIEW_SHOWS_IN_DASHBOARD is false", PROTOCOL_SOL_LST_SELECTOR_PREVIEW_SHOWS_IN_DASHBOARD === false, `flag=${PROTOCOL_SOL_LST_SELECTOR_PREVIEW_SHOWS_IN_DASHBOARD}`);
  add("13B-E: PROTOCOL_SOL_LST_SELECTOR_PREVIEW_SHOWS_IN_PORTFOLIO is false", PROTOCOL_SOL_LST_SELECTOR_PREVIEW_SHOWS_IN_PORTFOLIO === false, `flag=${PROTOCOL_SOL_LST_SELECTOR_PREVIEW_SHOWS_IN_PORTFOLIO}`);
  add("13B-F: PROTOCOL_SOL_LST_SELECTOR_PREVIEW_SHOWS_IN_REVIEW_MODAL is false", PROTOCOL_SOL_LST_SELECTOR_PREVIEW_SHOWS_IN_REVIEW_MODAL === false, `flag=${PROTOCOL_SOL_LST_SELECTOR_PREVIEW_SHOWS_IN_REVIEW_MODAL}`);
  add("13B-G: PROTOCOL_SOL_LST_SELECTOR_PREVIEW_UPDATES_LIVE_SUGGESTIONS is false", PROTOCOL_SOL_LST_SELECTOR_PREVIEW_UPDATES_LIVE_SUGGESTIONS === false, `flag=${PROTOCOL_SOL_LST_SELECTOR_PREVIEW_UPDATES_LIVE_SUGGESTIONS}`);
  add("13B-H: PROTOCOL_SOL_LST_SELECTOR_PREVIEW_ENABLES_TRANSACTIONS is false", PROTOCOL_SOL_LST_SELECTOR_PREVIEW_ENABLES_TRANSACTIONS === false, `flag=${PROTOCOL_SOL_LST_SELECTOR_PREVIEW_ENABLES_TRANSACTIONS}`);

  // 13B-I…N. Default preview.
  add("13B-I: default preview status is disabled", def.status === "disabled", `status=${def.status}`);
  add("13B-J: default preview has no selectedProtocolName", !("selectedProtocolName" in def.copy), `has=${"selectedProtocolName" in def.copy}`);
  add("13B-K: default preview has no selectedLstSymbol", !("selectedLstSymbol" in def.copy), `has=${"selectedLstSymbol" in def.copy}`);
  add("13B-L: default preview blockers mention selector preview disabled", def.copy.blockers.some((b) => b.toLowerCase().includes("selector preview is disabled")), `blockers=${def.copy.blockers.length}`);
  add("13B-M: default preview blockers mention go/no-go not passed", def.copy.blockers.some((b) => b.toLowerCase().includes("go/no-go")), `has=${def.copy.blockers.some((b) => b.toLowerCase().includes("go/no-go"))}`);
  add("13B-N: default preview safety notes include the no-move-funds line", def.copy.safetyNotes.includes("WealthSmith does not move funds for you."), `notes=${def.copy.safetyNotes.length}`);

  // 13B-O…S. Internal example.
  add("13B-O: internal example is internalOnly true", example.internalOnly === true, `v=${example.internalOnly}`);
  add("13B-P: internal example does not update live suggestions", example.updatesLiveSuggestions === false, `v=${example.updatesLiveSuggestions}`);
  add("13B-Q: internal example does not enable transactions", example.transactionsEnabled === false, `v=${example.transactionsEnabled}`);
  {
    const j = JSON.stringify(example).toLowerCase();
    add("13B-R: internal example does not claim production readiness", !j.includes("production ready") && !j.includes("productionready") && example.status !== "preview_available", `status=${example.status}`);
    add("13B-S: internal example does not use QA-only score", !j.includes("7.75") && !j.includes("qa_only_not_production"), `clean=${!j.includes("7.75")}`);
  }
  // 13B-O also: example names no selected protocol.
  add("13B-O2: internal example names no selected protocol", !("selectedProtocolName" in example.copy) && !("selectedLstSymbol" in example.copy), `hasName=${"selectedProtocolName" in example.copy}`);

  // 13B-T…W. Preview shape not present in live suggestion-derivation output (proxy for
  // "not imported by stakingSuggestion / engine / toSuggestionCard / Dashboard-Portfolio-modal").
  {
    const previewTokens = ["SOL staking preview unavailable", "Selector preview is disabled", "INTERNAL_PREVIEW_NOT_LIVE", "Suggested protocol to review", "Preview disabled"];
    const stakingJson = JSON.stringify(staking);
    const engineJson = JSON.stringify(stakingRun) + JSON.stringify(stableRun);
    const cardJson = JSON.stringify(toSuggestionCard(staking!)) + JSON.stringify(toSuggestionCard(stable!));
    const modalJson = JSON.stringify(staking?.reviewDetails) + JSON.stringify(stable?.reviewDetails);
    add("13B-T: preview shape not present in staking suggestion output", previewTokens.every((t) => !stakingJson.includes(t)), "no preview in staking");
    add("13B-U: preview shape not present in engine output", previewTokens.every((t) => !engineJson.includes(t)), "no preview in engine");
    add("13B-V: preview shape not present in toSuggestionCard output", previewTokens.every((t) => !cardJson.includes(t)), "no preview in card");
    add("13B-W: preview shape not present in Dashboard/Portfolio/modal-facing output", previewTokens.every((t) => !modalJson.includes(t)), "no preview in modal");
  }

  // 13B-X. Live staking not_evaluated.
  add("13B-X: live staking protocolSelection.status remains not_evaluated", staking?.protocolSelection?.status === "not_evaluated", `status=${staking?.protocolSelection?.status}`);
  // 13B-Y. No live suggestion has selectedProtocolId/Name.
  {
    const allSug = [...stakingRun.suggestions, ...stableRun.suggestions];
    const bad = allSug.filter((s) => s.protocolSelection?.selectedProtocolId != null || s.protocolSelection?.selectedProtocolName != null);
    add("13B-Y: no live suggestion has selectedProtocolId/Name", bad.length === 0, `violations=${bad.length}`);
  }
  // 13B-Z. Cards/modal do not expose preview copy or protocol recommendations.
  // Use preview-DISTINCTIVE tokens only: the title "Put Idle SOL to Work" is shared
  // with the real staking suggestion copy by design, so it is not a leak signal.
  {
    const tokens = ["Jito", "JitoSOL", "SOL staking preview unavailable", "Selector preview is disabled", "INTERNAL_PREVIEW_NOT_LIVE", "Preview disabled", "selectedProtocolName", "selectedLstSymbol"];
    const scan = (s: typeof staking) => JSON.stringify(toSuggestionCard(s!)) + JSON.stringify(s?.reviewDetails);
    const json = scan(staking) + scan(stable);
    const leaks = tokens.filter((t) => json.includes(t));
    add("13B-Z: cards/modal never expose preview copy or protocol names", leaks.length === 0, `leaks=${leaks.join(",") || "none"}`);
  }
  // 13B-AA/AB/AC. Flags at safe defaults.
  add("13B-AA: PROTOCOL_SELECTION_IMPLEMENTED remains false", PROTOCOL_SELECTION_IMPLEMENTED === false, `flag=${PROTOCOL_SELECTION_IMPLEMENTED}`);
  add("13B-AB: PROTOCOL_SELECTION_SHOW_IN_UI remains false", PROTOCOL_SELECTION_SHOW_IN_UI === false, `flag=${PROTOCOL_SELECTION_SHOW_IN_UI}`);
  add("13B-AC: PROTOCOL_SELECTION_ALLOW_TRANSACTIONS remains false", PROTOCOL_SELECTION_ALLOW_TRANSACTIONS === false, `flag=${PROTOCOL_SELECTION_ALLOW_TRANSACTIONS}`);
  // 13B-AD. productionReady remains false.
  add("13B-AD: getProtocolSelectionGoNoGo().productionReady remains false", gng.productionReady === false, `v=${gng.productionReady}`);
  // 13B-AE. No transaction/signature/swap path in preview output.
  {
    const json = (JSON.stringify(def) + JSON.stringify(example)).toLowerCase();
    const txTokens = ["sendtransaction", "signtransaction", "signalltransactions", "signmessage", "publickey", "swap(", "deposit(", "withdraw("];
    const hits = txTokens.filter((t) => json.includes(t));
    add("13B-AE: no transaction/signature/swap path in preview output", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }
  // 13B-AI. No forbidden investment claims in preview output.
  {
    const json = (JSON.stringify(def) + JSON.stringify(example)).toLowerCase();
    const forbidden = ["best", "safest", "optimal", "guaranteed", "risk-free", "recommended", "you should"];
    const hits = forbidden.filter((w) => json.includes(w));
    add("13B-AI: no forbidden investment claims in preview output", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 13C — dev-only mounted preview route for exact SOL staking recommendation.
 * Route hard-disabled by default; never in live user flows.
 * ------------------------------------------------------------------ */
export function runSolLstSelectorPreviewRouteFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2);
  const stakingRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stableRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT);
  const staking = stakingRun.suggestions.find((s) => s.category === "staking");
  const stable = stableRun.suggestions.find((s) => s.category === "stable_yield");

  const selectedExample = getInternalOnlySolLstSelectedPreviewExample();
  const gng = getProtocolSelectionGoNoGo("t");

  // 13C-A…H. Route flags.
  add("13C-A: INTERNAL_SOL_LST_PREVIEW_ROUTE_EXISTS is true", INTERNAL_SOL_LST_PREVIEW_ROUTE_EXISTS === true, `flag=${INTERNAL_SOL_LST_PREVIEW_ROUTE_EXISTS}`);
  add("13C-B: INTERNAL_SOL_LST_PREVIEW_ROUTE_ENABLED_BY_DEFAULT is false", INTERNAL_SOL_LST_PREVIEW_ROUTE_ENABLED_BY_DEFAULT === false, `flag=${INTERNAL_SOL_LST_PREVIEW_ROUTE_ENABLED_BY_DEFAULT}`);
  add("13C-C: INTERNAL_SOL_LST_PREVIEW_REQUIRES_DEV_MODE is true", INTERNAL_SOL_LST_PREVIEW_REQUIRES_DEV_MODE === true, `flag=${INTERNAL_SOL_LST_PREVIEW_REQUIRES_DEV_MODE}`);
  add("13C-D: INTERNAL_SOL_LST_PREVIEW_UPDATES_LIVE_SUGGESTIONS is false", INTERNAL_SOL_LST_PREVIEW_UPDATES_LIVE_SUGGESTIONS === false, `flag=${INTERNAL_SOL_LST_PREVIEW_UPDATES_LIVE_SUGGESTIONS}`);
  add("13C-E: INTERNAL_SOL_LST_PREVIEW_ENABLES_SELECTION is false", INTERNAL_SOL_LST_PREVIEW_ENABLES_SELECTION === false, `flag=${INTERNAL_SOL_LST_PREVIEW_ENABLES_SELECTION}`);
  add("13C-F: INTERNAL_SOL_LST_PREVIEW_ENABLES_TRANSACTIONS is false", INTERNAL_SOL_LST_PREVIEW_ENABLES_TRANSACTIONS === false, `flag=${INTERNAL_SOL_LST_PREVIEW_ENABLES_TRANSACTIONS}`);
  add("13C-G: preview route path is /internal/sol-lst-preview", INTERNAL_SOL_LST_PREVIEW_ROUTE_PATH === "/internal/sol-lst-preview", `path=${INTERNAL_SOL_LST_PREVIEW_ROUTE_PATH}`);
  add("13C-H: isInternalSolLstPreviewRouteEnabled() is false by default", isInternalSolLstPreviewRouteEnabled() === false, `v=${isInternalSolLstPreviewRouteEnabled()}`);

  // 13C-I…N. Selected preview example.
  add("13C-I: selected preview example includes INTERNAL_PREVIEW_NOT_LIVE", JSON.stringify(selectedExample).includes(INTERNAL_PREVIEW_NOT_LIVE), `has=${JSON.stringify(selectedExample).includes(INTERNAL_PREVIEW_NOT_LIVE)}`);
  add("13C-J: selected preview example may show JitoSOL only in internal preview output", selectedExample.copy.selectedProtocolName === "Jito" && selectedExample.copy.selectedLstSymbol === "JitoSOL" && selectedExample.internalOnly === true, `name=${selectedExample.copy.selectedProtocolName}`);
  add("13C-K: selected preview example has no selectedProtocolId", !JSON.stringify(selectedExample).includes("selectedProtocolId"), `clean=${!JSON.stringify(selectedExample).includes("selectedProtocolId")}`);
  {
    const j = JSON.stringify(selectedExample).toLowerCase();
    add("13C-L: selected preview example does not use QA-only score", !j.includes("7.75") && !j.includes("qa_only_not_production"), `clean=${!j.includes("7.75")}`);
  }
  add("13C-M: selected preview example has transactionsEnabled false", selectedExample.transactionsEnabled === false, `v=${selectedExample.transactionsEnabled}`);
  add("13C-N: selected preview safety notes include the no-move-funds line", selectedExample.copy.safetyNotes.includes("WealthSmith does not move funds for you."), `notes=${selectedExample.copy.safetyNotes.length}`);

  // 13C-O…U. Preview shape/copy not present in live suggestion-derivation output
  // (proxy for "preview component not imported by Dashboard/Portfolio/Card/Modal/
  // stakingSuggestion/engine/toSuggestionCard"; import graph is grep-verified too).
  {
    const previewTokens = ["INTERNAL_PREVIEW_NOT_LIVE", "Suggested protocol to review", "internal-sol-lst-preview", "Open official protocol page", "SolLstSelectorPreview"];
    const stakingJson = JSON.stringify(staking);
    const engineJson = JSON.stringify(stakingRun) + JSON.stringify(stableRun);
    const cardJson = JSON.stringify(toSuggestionCard(staking!)) + JSON.stringify(toSuggestionCard(stable!));
    const modalJson = JSON.stringify(staking?.reviewDetails) + JSON.stringify(stable?.reviewDetails);
    const clean = (j: string) => previewTokens.every((t) => !j.includes(t));
    add("13C-O: preview not present in Dashboard-facing suggestion output", clean(engineJson), "no preview");
    add("13C-P: preview not present in Portfolio-facing suggestion output", clean(engineJson), "no preview");
    add("13C-Q: preview not present in SuggestionCard output", clean(cardJson), "no preview");
    add("13C-R: preview not present in Review-modal output", clean(modalJson), "no preview");
    add("13C-S: preview not present in stakingSuggestion output", clean(stakingJson), "no preview");
    add("13C-T: preview not present in engine output", clean(engineJson), "no preview");
    add("13C-U: preview not present in toSuggestionCard output", clean(cardJson), "no preview");
  }

  // 13C-V. Live staking not_evaluated.
  add("13C-V: live staking protocolSelection.status remains not_evaluated", staking?.protocolSelection?.status === "not_evaluated", `status=${staking?.protocolSelection?.status}`);
  // 13C-W. No live suggestion has selectedProtocolId/Name.
  {
    const allSug = [...stakingRun.suggestions, ...stableRun.suggestions];
    const bad = allSug.filter((s) => s.protocolSelection?.selectedProtocolId != null || s.protocolSelection?.selectedProtocolName != null);
    add("13C-W: no live suggestion has selectedProtocolId/Name", bad.length === 0, `violations=${bad.length}`);
  }
  // 13C-X. Cards/modal do not expose internal preview copy on normal flows.
  {
    const tokens = ["INTERNAL_PREVIEW_NOT_LIVE", "Suggested protocol to review", "Open official protocol page", "selectedProtocolName", "selectedLstSymbol"];
    const scan = (s: typeof staking) => JSON.stringify(toSuggestionCard(s!)) + JSON.stringify(s?.reviewDetails);
    const json = scan(staking) + scan(stable);
    const leaks = tokens.filter((t) => json.includes(t));
    add("13C-X: cards/modal do not expose internal preview copy on normal flows", leaks.length === 0, `leaks=${leaks.join(",") || "none"}`);
  }
  // 13C-Y/Z/AA. Selection flags.
  add("13C-Y: PROTOCOL_SELECTION_IMPLEMENTED remains false", PROTOCOL_SELECTION_IMPLEMENTED === false, `flag=${PROTOCOL_SELECTION_IMPLEMENTED}`);
  add("13C-Z: PROTOCOL_SELECTION_SHOW_IN_UI remains false", PROTOCOL_SELECTION_SHOW_IN_UI === false, `flag=${PROTOCOL_SELECTION_SHOW_IN_UI}`);
  add("13C-AA: PROTOCOL_SELECTION_ALLOW_TRANSACTIONS remains false", PROTOCOL_SELECTION_ALLOW_TRANSACTIONS === false, `flag=${PROTOCOL_SELECTION_ALLOW_TRANSACTIONS}`);
  // 13C-AB/AC/AD. Selector flags.
  add("13C-AB: PROTOCOL_SOL_LST_SELECTOR_ENABLED remains false", PROTOCOL_SOL_LST_SELECTOR_ENABLED === false, `flag=${PROTOCOL_SOL_LST_SELECTOR_ENABLED}`);
  add("13C-AC: PROTOCOL_SOL_LST_SELECTOR_SHOWS_UI remains false", PROTOCOL_SOL_LST_SELECTOR_SHOWS_UI === false, `flag=${PROTOCOL_SOL_LST_SELECTOR_SHOWS_UI}`);
  add("13C-AD: PROTOCOL_SOL_LST_SELECTOR_UPDATES_LIVE_SUGGESTIONS remains false", PROTOCOL_SOL_LST_SELECTOR_UPDATES_LIVE_SUGGESTIONS === false, `flag=${PROTOCOL_SOL_LST_SELECTOR_UPDATES_LIVE_SUGGESTIONS}`);
  // 13C-AE. productionReady remains false.
  add("13C-AE: getProtocolSelectionGoNoGo().productionReady remains false", gng.productionReady === false, `v=${gng.productionReady}`);
  // 13C-AF. No transaction/signature/swap path in preview output.
  {
    const json = JSON.stringify(selectedExample).toLowerCase();
    const txTokens = ["sendtransaction", "signtransaction", "signalltransactions", "signmessage", "publickey", "swap(", "deposit(", "withdraw("];
    const hits = txTokens.filter((t) => json.includes(t));
    add("13C-AF: no transaction/signature/swap path in preview output", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }
  // 13C-AJ. No forbidden investment claims in preview output.
  {
    const json = JSON.stringify(selectedExample).toLowerCase();
    const forbidden = ["best", "safest", "optimal", "guaranteed", "risk-free", "recommended", "you should"];
    const hits = forbidden.filter((w) => json.includes(w));
    add("13C-AJ: no forbidden investment claims in preview output", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }

  return checks;
}

/** CLI entry: prints each check and exits non-zero on failure. */
export function printFixtureResults(): void {
  const checks = [
    ...runSuggestionEngineFixtureChecks(),
    ...runMapperFixtureChecks(),
    ...runContractFixtureChecks(),
    ...runStakingFixtureChecks(),
    ...runStableYieldFixtureChecks(),
    ...runPositionOptimizationFixtureChecks(),
    ...runCapitalEfficiencyFixtureChecks(),
    ...runDcaFixtureChecks(),
    ...runTrimFixtureChecks(),
    ...runFullQaFixtureChecks(),
    ...runGuardrailFixtureChecks(),
    ...runProtocolSelectionFixtureChecks(),
    ...runReviewDetailsFixtureChecks(),
    ...runReviewModalFixtureChecks(),
    ...runReviewRefinementFixtureChecks(),
    ...runFinalSmokeFixtureChecks(),
    ...runDuplicateExposureFixtureChecks(),
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
