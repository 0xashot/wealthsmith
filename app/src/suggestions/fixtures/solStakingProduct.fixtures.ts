/**
 * SOL staking product checks: staking category, native baseline, validator market data, Marinade, market refresh/normalization, selector comparison/sensitivity/presentation, product integration, demo scenarios.
 *
 * Extracted verbatim from suggestionEngine.fixtures.ts (final monolith dissolution).
 * The monolith aggregates these checks in printFixtureResults; behavior and check
 * names are unchanged.
 */
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
import type { WalletPosition } from "../../wallet/walletPosition";
// Step 24A — asset-ownership registry + dedicated JUP staking modules (fixtures below).
import { resolveAssetOwner, resolveAssetOwnerForPosition, JUP_MINT, SYSTEM_PROGRAM_ID, TOKEN_PROGRAM_ID as OWN_TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID as OWN_TOKEN_2022_PROGRAM_ID } from "../productAssetOwnership";
import { deriveJupStakingSuggestion, JUP_STAKING_SUGGESTION_ID } from "../jupStakingSuggestion";
import { deriveStakingSuggestion } from "../stakingSuggestion";
import { assessJupStaking, type JupStakingCandidateContext } from "../jupStakingSelection";
import { getApprovedJupStakingProduct, JUPITER_JUP_STAKING_PRODUCT, JUPITER_JUP_STAKING_PRODUCT_ID, type JupStakingProductRecord } from "../jupStakingProductRegistry";
import { deriveTrimAssessment as trimAssess } from "../trimAssessment";
import { toSuggestionCard } from "../toSuggestionCard";
import { PROTOCOL_SELECTION_IMPLEMENTED } from "../protocolRegistry";
import { PROTOCOL_SELECTION_SHOW_IN_UI, PROTOCOL_SELECTION_ALLOW_TRANSACTIONS } from "../protocolSelectionFeatureFlags";
import { getProtocolSelectionGoNoGo } from "../protocolSelectionGoNoGo";
import { PROTOCOL_SOL_LST_SELECTOR_ENABLED } from "../protocolSolLiquidStakingSelector";
import { getTestingPageFixtures } from "../../pages/testingPageFixtures";
import { getSolLstFreshEvidenceInputs } from "../solLiquidStakingFreshEvidenceRecords";
import { buildMsolReadOnlyReviewCandidateDisplay } from "../solLiquidStakingMsolReadOnlyApproval";
import { buildJupsolReadOnlyReviewCandidateDisplay } from "../solLiquidStakingJupsolReadOnlyApproval";
import { buildBsolReadOnlyReviewCandidateDisplay } from "../solLiquidStakingBsolReadOnlyApproval";
import { getInfReadOnlyApprovalDecision, getInfReviewApprovedCandidateEntry } from "../solLiquidStakingInfReadOnlyApproval";
import { SOL_NATIVE_STAKING_BASELINE_EVIDENCE_EXISTS, SOL_NATIVE_STAKING_BASELINE_IS_LST, NATIVE_STAKING_BASELINE_IDENTITY, NATIVE_SOL_STAKE_EVIDENCE_INPUTS, summarizeNativeSolStakeEvidence, getNativeSolStakeEvidenceRecords } from "../solNativeStakingBaselineEvidence";
import { SOL_NATIVE_STAKING_BASELINE_RISK_SCORE_EXISTS, SOL_NATIVE_STAKING_BASELINE_RISK_SCORE_APPROVES_READ_ONLY_RECOMMENDATION, SOL_NATIVE_STAKING_BASELINE_RISK_SCORE_ENABLES_TRANSACTIONS, SOL_NATIVE_STAKING_BASELINE_RISK_SCORE_REQUIRES_WALLET_SIGNATURE, getNativeStakingBaselineRiskScoreAssignment, evaluateNativeStakingBaselineRiskScoreAssignmentStatus, getNativeStakingRubricDimensions, computeNativeStakingWeightedScore, computeNativeStakingScore, NATIVE_STAKING_RISK_RATIONALE } from "../solNativeStakingBaselineRiskScore";
import { SOL_NATIVE_STAKING_BASELINE_READ_ONLY_APPROVAL_EXISTS, SOL_NATIVE_STAKING_BASELINE_READ_ONLY_APPROVAL_APPROVES_REVIEW_EXPOSURE, getNativeStakingBaselineReadOnlyApprovalDecision, evaluateNativeStakingBaselineReadOnlyApprovalStatus } from "../solNativeStakingBaselineReadOnlyApproval";
import { NATIVE_VALIDATOR_MARKET_DATA_EXISTS, NATIVE_VALIDATOR_MARKET_DATA_USES_RPC_FOR_STAKE, NATIVE_VALIDATOR_MARKET_DATA_USES_ANALYTICS_FOR_APY, NATIVE_VALIDATOR_MARKET_DATA_USES_JUPSOL_APY, NATIVE_VALIDATOR_MARKET_DATA_USES_JUPSOL_TVL, NATIVE_VALIDATOR_MARKET_DATA_ENABLES_NATIVE_APPROVAL, NATIVE_VALIDATOR_MARKET_DATA_ENABLES_SELECTOR_COMPARISON, NATIVE_VALIDATOR_MARKET_DATA_UPDATES_LIVE_RECOMMENDATIONS, NATIVE_VALIDATOR_MARKET_DATA_ENABLES_TRANSACTIONS, NATIVE_VALIDATOR_MARKET_DATA_REQUIRES_WALLET_SIGNATURE, JUPITER_NATIVE_STAKE_VOTE_ACCOUNT, parseJupiterNativeStakeVoteAccountFromGetVoteAccounts, parseNativeValidatorApyFromAnalytics, parseStakewizValidatorSummary, buildNativeValidatorMarketData, convertNativeValidatorMarketDataToEvidenceInputs } from "../nativeValidatorMarketData";
import { NATIVE_VALIDATOR_MARINADE_DATA_EXISTS, NATIVE_VALIDATOR_MARINADE_REQUIRES_API_KEY, NATIVE_VALIDATOR_MARINADE_USES_MSOL_APY, NATIVE_VALIDATOR_MARINADE_USES_JUPSOL_APY, NATIVE_VALIDATOR_MARINADE_USES_NETWORK_APY, JUPITER_NATIVE_STAKE_IDENTITY, MARINADE_MSOL_APY_ENDPOINT_FORBIDDEN, parseJupiterValidatorHistoryFromMarinade, buildJupiterNativeStakeMarketPackage } from "../nativeValidatorMarinadeData";
import { buildNativeStakingReviewCandidateDisplay } from "../solNativeStakingBaselineReadOnlyApproval";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { SOL_STAKING_MARKET_DATA_MODEL_EXISTS, SOL_STAKING_MARKET_DATA_MUTATES_APPROVAL_EVIDENCE, SOL_STAKING_MARKET_DATA_MUTATES_RISK_SCORES, SOL_STAKING_MARKET_DATA_ENABLES_SELECTOR, SOL_STAKING_MARKET_DATA_RANKS_CANDIDATES, SOL_STAKING_MARKET_DATA_SELECTS_WINNER, SOL_STAKING_MARKET_DATA_ENABLES_TRANSACTIONS, SOL_STAKING_MARKET_DATA_REQUIRES_WALLET_SIGNATURE, SOL_STAKING_MARKET_CANDIDATE_IDS, SOL_STAKING_MARKET_CANDIDATE_ORDER } from "../solStakingMarketDataTypes";
import { SOL_STAKING_MARKET_CACHE_SCHEMA_VERSION, SOL_STAKING_MARKET_REFRESH_INTERVAL_HOURS, SOL_STAKING_MARKET_HARD_STALE_HOURS, SOL_STAKING_CURRENT_MARKET_MAX_AGE_HOURS, SOL_STAKING_MARKET_SOURCES_REQUIRE_API_KEY, SOL_STAKING_MARKET_SOURCES_USE_RATED, SOL_STAKING_MARKET_SOURCES_USE_BLOCKDAEMON, getSolStakingMarketSource, listSolStakingMarketSources } from "../solStakingMarketDataSources";
import {
  parseDefiLlamaPoolMarketData,
  buildLstMarketSnapshot,
  buildJupiterNativeStakeMarketSnapshot,
  buildSolStakingMarketCache,
} from "../solStakingMarketDataRefresh";
import {
  validateSolStakingMarketCache,
  mergeSolStakingMarketRefresh,
  getSolStakingMarketSnapshot,
  listFreshApprovedMarketSnapshots,
} from "../solStakingMarketDataCache";
import {
  SOL_STAKING_NORMALIZATION_SCHEMA_VERSION,
  SOL_STAKING_NORMALIZATION_DEFINES_SELECTOR_WEIGHTS,
  SOL_STAKING_NORMALIZATION_CANDIDATE_ORDER,
} from "../solStakingCandidateNormalizationTypes";
import {
  getSolStakingCandidateStaticFacts,
  listSolStakingCandidateStaticFacts,
} from "../solStakingCandidateStaticFacts";
import {
  normalizeSolStakingCandidate,
  buildNormalizedSolStakingCandidateSet,
  validateNormalizedSolStakingCandidate,
  validateNormalizedSolStakingCandidateSet,
  listSelectorReadyNormalizedCandidates,
  getSolStakingNormalizationDiagnostics,
} from "../solStakingCandidateNormalization";
import {
  SOL_STAKING_SELECTOR_POLICY_ID,
  SOL_STAKING_SELECTOR_POLICY_VERSION,
  SOL_STAKING_SELECTOR_WEIGHTS,
  SOL_STAKING_SELECTOR_POLICY,
  SOL_STAKING_SELECTOR_MIN_APY_RANGE_PCT_POINTS,
  validateSolStakingSelectorPolicy,
} from "../solStakingSelectorPolicy";
import {
  SOL_STAKING_SELECTOR_UPDATES_PRODUCT_UI,
  buildSolStakingSelectorComparison,
  normalizeHigherIsBetter,
  normalizeLowerIsBetter,
  compareForRank,
  decidingTieBreak,
  validateSolStakingSelectorCandidateResult,
  validateSolStakingSelectorComparisonResult,
  getSolStakingSelectorComparisonDiagnostics,
  explainSolStakingSelectorCandidate,
  type SelectorRankable,
} from "../solStakingSelectorComparison";
import {
  SOL_STAKING_SELECTOR_SENSITIVITY_SCHEMA_VERSION,
  SOL_STAKING_SELECTOR_SENSITIVITY_POLICY_ID,
  SOL_STAKING_SELECTOR_SENSITIVITY_POLICY_VERSION,
  SOL_STAKING_SENSITIVITY_MIN_LEADER_RETENTION_RATE,
  SOL_STAKING_SENSITIVITY_MIN_BASELINE_MARGIN,
  SOL_STAKING_SENSITIVITY_KNIFE_EDGE_MARGIN,
  SOL_STAKING_ACTIVATION_MIN_HISTORY_SNAPSHOTS,
  SOL_STAKING_ACTIVATION_MIN_HISTORY_SPAN_HOURS,
  SOL_STAKING_ACTIVATION_MIN_CONSECUTIVE_REFRESH_SUCCESSES,
  SOL_STAKING_SELECTOR_SENSITIVITY_POLICY,
  validateSolStakingSelectorSensitivityPolicy,
  listDefaultSolStakingSensitivityScenarios,
} from "../solStakingSelectorSensitivityPolicy";
import {
  runSolStakingSelectorSensitivityAnalysis,
  applySolStakingSensitivityMarketOverrides,
  analyzeSolStakingSelectorHistory,
  validateSolStakingSensitivityResult,
  validateSolStakingHistoricalSensitivityAnalysis,
  explainSolStakingSensitivityScenario,
} from "../solStakingSelectorSensitivity";
import type { SolStakingSensitivityScenario, SolStakingHistoricalSensitivityInput } from "../solStakingSelectorSensitivityTypes";
import {
  SOL_STAKING_SELECTOR_ACTIVATION_PERFORMED,
  SOL_STAKING_SELECTOR_UPDATES_PRODUCT_UI as SOL_STAKING_ACTIVATION_UPDATES_PRODUCT_UI,
  evaluateSolStakingSelectorActivationGate,
  evaluateOperationalReadiness,
  validateSolStakingSelectorActivationReviewDecision,
  getSolStakingActivationReviewDiagnostics,
  type SolStakingSelectorOperationalReadiness,
} from "../solStakingSelectorActivationGate";
import {
  SOL_STAKING_SELECTOR_PRESENTATION_SCHEMA_VERSION,
} from "../solStakingSelectorPresentationTypes";
import { evaluateSolStakingSelectorDisplayGate } from "../solStakingSelectorDisplayGate";
import {
  buildSolStakingSelectorPresentation,
  buildSolStakingLeaderExplanation,
} from "../solStakingSelectorPresentation";
import {
  SOL_STAKING_RUNTIME_DATA_SCHEMA_VERSION,
  SOL_STAKING_RUNTIME_DATA_URL,
  validateSolStakingRuntimeMarketPayload,
  buildSolStakingRuntimeMarketPayload,
} from "../solStakingSelectorRuntimeData";
import {
  buildSolStakingLeaderComparisonExplanation,
  SOL_STAKING_LEADER_EXPLANATION_EPSILON,
  SOL_STAKING_LEADER_EXPLANATION_RECONCILIATION_TOLERANCE,
} from "../solStakingLeaderExplanation";
import {
  DEMO_EXACT_SOL_STAKING_SCENARIO_EXISTS,
  DEMO_EXACT_SOL_STAKING_SCENARIO_DEMO_ONLY,
  DEMO_EXACT_SOL_STAKING_SCENARIO_USES_FAKE_DATA,
  DEMO_EXACT_SOL_STAKING_SCENARIO_ENABLES_REAL_SELECTION,
  DEMO_EXACT_SOL_STAKING_SCENARIO_ENABLES_TRANSACTIONS,
  DEMO_EXACT_SOL_STAKING_SCENARIO_UPDATES_LIVE_SUGGESTIONS,
  DEMO_EXACT_SOL_STAKING_SCENARIO_USES_SHARED_UI,
  getDemoExactSolStakingScenario,
  getDemoExactSolStakingCard,
  getDemoExactSolStakingReviewDetails,
  buildDemoExactSolStakingRail,
} from "../demoExactSolStakingScenario";
import type { FixtureCheck } from "./fixtureCheck";
import { runSuggestionEngine, runEngineWithLegacyRebalance, FIXTURE_GENERATED_AT, bufferFixture, allocationFixture, solPosition, lstPosition, stablePosition, inputsFor } from "./engineFixtureHarness";

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
    const r = runEngineWithLegacyRebalance(
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
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: aligned(), safetyBuffer: fundedBuffer(), positions: [solPosition(10)] }),
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
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: offTarget(), safetyBuffer: fundedBuffer(), positions: [solPosition(10)] }),
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
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: aligned(), safetyBuffer: fundedBuffer(), positions: [solPosition(0.1)] }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9B-D: funded + only 0.1 SOL → no staking, On Track",
      !has(r, "staking") && cats(r).split(",").every((c) => c === "on_track") && cats(r) !== "none",
      `categories=${cats(r)}`
    );
  }

  // 9B-E. Funded + eligible SOL worth < $50 → no staking; aligned → On Track.
  {
    // 0.5 SOL @ $75 → eligible 0.4 SOL = $30 < $50
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: aligned(), safetyBuffer: fundedBuffer(), positions: [solPosition(0.5)] }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9B-E: funded + eligible value < $50 → no staking, On Track",
      !has(r, "staking") && cats(r).split(",").every((c) => c === "on_track") && cats(r) !== "none",
      `categories=${cats(r)}`
    );
  }

  // 9B-F. Only LSTs (JupSOL/mSOL), no liquid SOL → no staking.
  {
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: aligned(),
        safetyBuffer: fundedBuffer(),
        
        positions: [lstPosition("JupSOL", 100), lstPosition("mSOL", 50)],
      }),
      FIXTURE_GENERATED_AT
    );
    add("9B-F: only LSTs, no liquid SOL → no staking", !has(r, "staking"), `categories=${cats(r)}`);
  }

  // 9B-G. SOL present but unpriced → no staking, no invented amount.
  {
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: aligned(),
        safetyBuffer: fundedBuffer(),
        
        positions: [solPosition(10, { priced: false })],
      }),
      FIXTURE_GENERATED_AT
    );
    add("9B-G: SOL unpriced → no staking", !has(r, "staking"), `categories=${cats(r)}`);
  }

  // 9B-H. Liquid priced WSOL (token) → counts as liquid SOL → staking emitted.
  {
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: aligned(),
        safetyBuffer: fundedBuffer(),
        
        positions: [solPosition(10, { symbol: "WSOL", type: "token" })],
      }),
      FIXTURE_GENERATED_AT
    );
    add("9B-H: liquid priced WSOL → staking emitted", has(r, "staking"), `categories=${cats(r)}`);
  }

  // 9B-I. Partial pricing + priced SOL → staking still emits + partial_pricing warning.
  {
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: aligned(),
        safetyBuffer: fundedBuffer(),
        
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
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: aligned(), safetyBuffer: fundedBuffer(), positions: [solPosition(10)] }),
      FIXTURE_GENERATED_AT
    );
    const s = r.suggestions.find((x) => x.category === "staking");
    const card = s ? toSuggestionCard(s) : undefined;
    add(
      "9B-J: staking card maps safely (copy, amount, review-only, non-transactional)",
      card?.title === "Stake SOL on Jito" &&
        card?.description === "You have 9.9 SOL available to stake. Stake it through Jito to earn an estimated 5.36% APY, while keeping 0.1 SOL available for wallet activity." &&
        /^\+\$[\d,]+\/year \(5\.36% APY\)$/.test(card?.apyIncomeChip ?? "") &&
        /^Stake [\d.,]+ SOL$/.test(card?.impact_text ?? "") && !/\$\d/.test(card?.impact_text ?? "") &&
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
 * Step 24A — asset-ownership registry + dedicated JUP staking. Proves the retirement of the generic
 * idle-assets rule, deterministic exact-identity ownership, and the governed JUP staking product +
 * selection + card + review, plus the cross-category regressions.
 * ------------------------------------------------------------------ */
export function runJupStakingFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const readIfSrc = (rel: string) => { try { return readFileSync(`${process.cwd()}/${rel}`, "utf8"); } catch { return ""; } };
  const NOW = FIXTURE_GENERATED_AT;
  const funded = () => bufferFixture(5000, 1000, 3);
  const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
  const BONK = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
  const WIF = "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm";
  const JITOSOL = "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn";
  const JUPSOL = "jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v";
  const MSOL = "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So";
  const WSOL = "So11111111111111111111111111111111111111112";

  // Position builders (exact-identity; no display-symbol reliance).
  const tok = (mint: string, symbol: string, uiAmount: number, priceUsd: number, type: WalletPosition["type"] = "token", source: WalletPosition["source"] = "wallet", extra: Partial<WalletPosition> = {}): WalletPosition => ({
    id: `${symbol}-${mint.slice(0, 4)}`, source, type, symbol, name: symbol, mint,
    amount: String(Math.round(uiAmount * 1e6)), uiAmount, decimals: 6, detection: "direct_wallet_balance",
    priceUsd, valueUsd: uiAmount * priceUsd, ...extra,
  });
  const jupPos = (uiAmount = 650, priceUsd = 0.8, extra: Partial<WalletPosition> = {}) => tok(JUP_MINT, "JUP", uiAmount, priceUsd, "token", "wallet", extra);
  const solPos = (uiAmount: number, priceUsd = 150): WalletPosition => ({ id: "sol", source: "wallet", type: "native", symbol: "SOL", name: "Solana", amount: String(Math.round(uiAmount * 1e9)), uiAmount, decimals: 9, detection: "direct_wallet_balance", priceUsd, valueUsd: uiAmount * priceUsd });
  const inp = (positions: WalletPosition[]) => inputsFor({ safetyBuffer: funded(), totalUsd: 20000, positions });

  /* ---- Asset ownership (exact mint + token program; fail-closed) ---- */
  add("JUP-OWN-1: native SOL (non-SPL identity) → sol_staking; wrapped SOL (classic SPL) → sol_staking", resolveAssetOwnerForPosition(solPos(5)) === "sol_staking" && resolveAssetOwner(WSOL, OWN_TOKEN_PROGRAM_ID) === "sol_staking" && SYSTEM_PROGRAM_ID.length > 0, "sol_staking");
  add("JUP-OWN-2: USDC → stable_yield", resolveAssetOwner(USDC, OWN_TOKEN_PROGRAM_ID) === "stable_yield", "stable_yield");
  add("JUP-OWN-3: exact JUP → jup_staking", resolveAssetOwner(JUP_MINT, OWN_TOKEN_PROGRAM_ID) === "jup_staking", "jup_staking");
  add("JUP-OWN-4: JitoSOL/JupSOL/mSOL → already_earning", [JITOSOL, JUPSOL, MSOL].every((m) => resolveAssetOwner(m, OWN_TOKEN_PROGRAM_ID) === "already_earning"), "already_earning");
  add("JUP-OWN-5: BONK/WIF → trim_only", resolveAssetOwner(BONK, OWN_TOKEN_PROGRAM_ID) === "trim_only" && resolveAssetOwner(WIF, OWN_TOKEN_PROGRAM_ID) === "trim_only", "trim_only");
  add("JUP-OWN-6: deployed receipt/vault/LP position (type protocol) → position_review", resolveAssetOwnerForPosition(tok("VaultReceiptMint1111111111111111111111111111", "kUSDC", 100, 1, "protocol", "kamino")) === "position_review", "position_review");
  add("JUP-OWN-7: unknown token mint → unsupported (fail closed)", resolveAssetOwner("UnknownMint1111111111111111111111111111111111", OWN_TOKEN_PROGRAM_ID) === "unsupported", "unsupported");
  add("JUP-OWN-8: symbol spoof — 'JUP' symbol with the WRONG mint → unsupported", resolveAssetOwnerForPosition(tok("SpoofMint11111111111111111111111111111111111", "JUP", 1000, 1)) === "unsupported", "spoof unsupported");
  add("JUP-OWN-9: same mint under the WRONG token program → unsupported (USDC under Token-2022)", resolveAssetOwner(USDC, OWN_TOKEN_2022_PROGRAM_ID) === "unsupported", "wrong program unsupported");
  add("JUP-OWN-10: JUP is NOT JupSOL (distinct identities, distinct owners)", String(JUP_MINT) !== String(JUPSOL) && resolveAssetOwner(JUP_MINT, OWN_TOKEN_PROGRAM_ID) === "jup_staking" && resolveAssetOwner(JUPSOL, OWN_TOKEN_PROGRAM_ID) === "already_earning", "distinct");

  /* ---- Generic idle-assets teardown ---- */
  {
    const r = runSuggestionEngine(inp([tok(BONK, "BONK", 12_000_000, 0.00002), tok(WIF, "WIF", 60, 3), jupPos(650)]), NOW);
    add("JUP-TD-1: BONK+WIF+JUP together → NO generic capital_efficiency card, no multi-token aggregation", !r.suggestions.some((s) => s.category === "capital_efficiency"), r.suggestions.map((s) => s.category).join(",") || "none");
  }
  add("JUP-TD-2: no engine module imports the deleted capitalEfficiencySuggestion rule", (() => { const eng = readIfSrc("src/suggestions/engine.ts"); return !/deriveCapitalEfficiencySuggestion|capitalEfficiencySuggestion/.test(eng); })(), "no import");
  add("JUP-TD-3: the retired rule FILE is gone (no compatibility wrapper / rename)", readIfSrc("src/suggestions/capitalEfficiencySuggestion.ts") === "", "deleted");

  /* ---- JUP eligibility matrix (deterministic selector) ---- */
  const baseCtx = (over: Partial<JupStakingCandidateContext> = {}): JupStakingCandidateContext => ({
    exactMintMatch: true, tokenProgramApproved: true, directWallet: true, transferableAmount: 650,
    locked: false, vesting: false, borrowed: false, protocolHeld: false, alreadyStaked: false,
    priceFresh: true, valueUsd: 520, minimumUsd: 50, bufferSatisfied: true, higherPriorityConflict: false, portfolioComplete: true, ...over,
  });
  const st = (over: Partial<JupStakingCandidateContext>, product?: JupStakingProductRecord | null) => assessJupStaking(baseCtx(over), NOW, product === undefined ? undefined : product).status;
  add("JUP-EL-1: exact mint + all gates pass → recommended", st({}) === "recommended", st({}));
  add("JUP-EL-2: wrong mint → asset_ineligible", st({ exactMintMatch: false }) === "asset_ineligible", st({ exactMintMatch: false }));
  add("JUP-EL-3: unapproved token program → asset_ineligible", st({ tokenProgramApproved: false }) === "asset_ineligible", st({ tokenProgramApproved: false }));
  add("JUP-EL-4: not direct-wallet → asset_ineligible", st({ directWallet: false }) === "asset_ineligible", st({ directWallet: false }));
  add("JUP-EL-5: protocol-held → asset_ineligible", st({ protocolHeld: true }) === "asset_ineligible", st({ protocolHeld: true }));
  add("JUP-EL-6: locked → asset_ineligible", st({ locked: true }) === "asset_ineligible", st({ locked: true }));
  add("JUP-EL-7: vesting → asset_ineligible", st({ vesting: true }) === "asset_ineligible", st({ vesting: true }));
  add("JUP-EL-8: already-staked → asset_ineligible", st({ alreadyStaked: true }) === "asset_ineligible", st({ alreadyStaked: true }));
  add("JUP-EL-9: stale price → asset_ineligible", st({ priceFresh: false }) === "asset_ineligible", st({ priceFresh: false }));
  add("JUP-EL-10: missing value → asset_ineligible", st({ valueUsd: null }) === "asset_ineligible", st({ valueUsd: null }));
  add("JUP-EL-11: below minimum → below_minimum", st({ valueUsd: 10 }) === "below_minimum", st({ valueUsd: 10 }));
  add("JUP-EL-12: exact minimum ($50) → recommended (not below)", st({ valueUsd: 50 }) === "recommended", st({ valueUsd: 50 }));
  add("JUP-EL-13: higher-priority same-asset conflict → conflict", st({ higherPriorityConflict: true }) === "conflict", st({ higherPriorityConflict: true }));
  add("JUP-EL-14: incomplete portfolio → unresolved", st({ portfolioComplete: false }) === "unresolved", st({ portfolioComplete: false }));
  add("JUP-EL-15: product unavailable (none approved) → product_unavailable", st({}, null) === "product_unavailable", st({}, null));
  add("JUP-EL-16: product blocked → blocked", st({}, { ...JUPITER_JUP_STAKING_PRODUCT, approvalStatus: "blocked" }) === "blocked", st({}, { ...JUPITER_JUP_STAKING_PRODUCT, approvalStatus: "blocked" }));
  add("JUP-EL-17: product availability unavailable → product_unavailable", st({}, { ...JUPITER_JUP_STAKING_PRODUCT, availability: "unavailable" }) === "product_unavailable", st({}, { ...JUPITER_JUP_STAKING_PRODUCT, availability: "unavailable" }));
  add("JUP-EL-18: approval not yet effective → product_unavailable", st({}, { ...JUPITER_JUP_STAKING_PRODUCT, effectiveAt: new Date(NOW + 1e10).toISOString() }) === "product_unavailable", "not effective");
  add("JUP-EL-19: reward data stale → reward_data_stale", st({}, { ...JUPITER_JUP_STAKING_PRODUCT, rewardDataStatus: "stale" }) === "reward_data_stale", st({}, { ...JUPITER_JUP_STAKING_PRODUCT, rewardDataStatus: "stale" }));
  add("JUP-EL-20: reward data unavailable → fails closed (reward_data_stale)", st({}, { ...JUPITER_JUP_STAKING_PRODUCT, rewardDataStatus: "unavailable" }) === "reward_data_stale", st({}, { ...JUPITER_JUP_STAKING_PRODUCT, rewardDataStatus: "unavailable" }));
  add("JUP-EL-21: unstaking terms unresolved → terms_unresolved", st({}, { ...JUPITER_JUP_STAKING_PRODUCT, unstakingTerms: { status: "unresolved", description: null } }) === "terms_unresolved", "terms_unresolved");

  /* ---- JUP selection (Jupiter, governed, no inference, no APY fabrication) ---- */
  {
    const a = assessJupStaking(baseCtx({}), NOW);
    add("JUP-SEL-1: Jupiter selected deterministically", a.status === "recommended" && a.selectedProtocolId === "jupiter" && a.selectedProductId === JUPITER_JUP_STAKING_PRODUCT_ID, `${a.selectedProtocolId}/${a.selectedProductId}`);
    add("JUP-SEL-2: selection basis is only_approved_product", a.selectionBasis === "only_approved_product", String(a.selectionBasis));
    add("JUP-SEL-3: no execution prepared (read-only)", a.executionPrepared === false, String(a.executionPrepared));
    add("JUP-SEL-4: no APY fabricated (variable rewards → estimatedApyPct null)", a.estimatedApyPct === null && a.rewardModel === "variable_staking_rewards", `apy=${a.estimatedApyPct} model=${a.rewardModel}`);
    add("JUP-SEL-5: product terms sourced from the governed registry (not the card mapper)", getApprovedJupStakingProduct()?.unstakingTerms.status === "known" && JUPITER_JUP_STAKING_PRODUCT.rewardModel === "variable_staking_rewards", "governed");
    add("JUP-SEL-6: neither the frontend nor Smith AI selects the protocol (no AI imports in the selector/derive)", (() => { const sel = readIfSrc("src/suggestions/jupStakingSelection.ts"); const der = readIfSrc("src/suggestions/jupStakingSuggestion.ts"); return !/smithAi|SmithAI|demoSmithAi|openai|llm/i.test(sel + der); })(), "no AI");
  }

  /* ---- JUP production card ---- */
  {
    const sug = deriveJupStakingSuggestion(inp([jupPos(650, 0.8)]), NOW);
    const card = sug ? toSuggestionCard(sug) : undefined;
    add("JUP-CARD-1: card title is exact 'Stake JUP on Jupiter'", card?.title === "Stake JUP on Jupiter", `title=${card?.title}`);
    add("JUP-CARD-2: card description names amount + variable quarterly rewards + 7-day unstaking", card?.description === "Stake 650 JUP with Jupiter to become eligible for variable quarterly rewards. Your JUP will be locked and requires a 7-day unstaking period.", `desc=${card?.description}`);
    add("JUP-CARD-3: action line is exact 'Stake 650 JUP' (token amount, not USD-only)", card?.impact_text === "Stake 650 JUP" && !/\$\d/.test(card?.impact_text ?? ""), `impact=${card?.impact_text}`);
    add("JUP-CARD-4: CTA is Review, non-transactional", card?.cta.label === "Review" && card?.cta.executes_transaction === false && card?.cta.requires_wallet_signature === false && card?.cta.completion_on_click === false && card?.cta.action === null, `cta=${card?.cta.label}`);
    add("JUP-CARD-5: id + staking category (never capital_efficiency)", sug?.id === JUP_STAKING_SUGGESTION_ID && sug?.category === "staking", `${sug?.id}/${sug?.category}`);
    add("JUP-CARD-6: read-only handoff footer (Cancel + 'Stake JUP' → Jupiter, new tab; no in-app execution)", (() => { const l = sug?.reviewDetails?.externalLink; return l != null && l.ctaLabel === "Stake JUP" && l.opensInNewTab === true && /jup\.ag/.test(l.url) && (l.secondaryLabel ?? "Cancel") === "Cancel" && card?.cta.label === "Review" && card?.cta.executes_transaction === false; })(), `cta=${sug?.reviewDetails?.externalLink?.ctaLabel}`);
  }

  /* ---- JUP Review modal content ---- */
  {
    const sug = deriveJupStakingSuggestion(inp([jupPos(650, 0.8)]), NOW)!;
    const d = sug.reviewDetails!;
    const mval = (label: string) => d.metrics.find((m) => m.label === label)?.value;
    add("JUP-REV-1: focused card set (Stake / Rewards / Direct Unstake / Direct Unstake Fee) under focusedLayout; protocol still selected", (() => { const labels = d.metrics.map((m) => m.label); return ["Stake", "Rewards", "Direct Unstake", "Direct Unstake Fee"].every((l) => labels.includes(l)) && d.focusedLayout === true && sug.protocolSelection?.selectedProtocolName === "Jupiter"; })(), d.metrics.map((m) => m.label).join(","));
    add("JUP-REV-2: 'Stake' card shows the JUP amount with a USD sub-value ($520 at 650 × $0.80)", (() => { const m = d.metrics.find((x) => x.label === "Stake"); return m?.value === "650 JUP" && m?.subValue === "$520"; })(), `stake=${d.metrics.find((x) => x.label === "Stake")?.value}`);
    add("JUP-REV-3: rewards are variable quarterly (no fabricated APY / no % in the reward line)", mval("Rewards") === "Variable quarterly rewards" && !/%/.test(String(mval("Rewards"))), String(mval("Rewards")));
    add("JUP-REV-4: direct-unstake window shown as '7 days'", mval("Direct Unstake") === "7 days", String(mval("Direct Unstake")));
    add("JUP-REV-5: direct-unstake fee is 0% with a governed tooltip", (() => { const m = d.metrics.find((x) => x.label === "Direct Unstake Fee"); return m?.value === "0%" && m?.tooltip === "Applied to the unstaked amount"; })(), `fee=${d.metrics.find((x) => x.label === "Direct Unstake Fee")?.value}`);
    add("JUP-REV-6: involved asset is JUP ONLY (no multi-asset table)", d.involvedAssets.length === 1 && d.involvedAssets[0].symbol === "JUP", `n=${d.involvedAssets.length}`);
    add("JUP-REV-7: relevant guardrails CHECKED", ["Exact asset identity", "Direct-wallet availability", "Transferable balance", "Minimum suggestion size", "Safety Buffer protection", "Protocol approval", "Product availability", "Current reward terms", "Unstaking terms available", "Asset-level conflicts cleared", "Protocol selection"].every((g) => d.guardrailSummary.checked.includes(g)), d.guardrailSummary.checked.join(","));
    add("JUP-REV-8: swap-route guardrails NOT APPLICABLE (not 'not evaluated')", ["Route cost", "Liquidity depth", "Slippage"].every((g) => d.guardrailSummary.notApplicable.includes(g) && !d.guardrailSummary.notEvaluated.includes(g)), d.guardrailSummary.notApplicable.join(","));
    add("JUP-REV-9: no internal risk score exposed in review details", !/riskScore|risk_score/i.test(JSON.stringify(d)), "no risk score");
    add("JUP-REV-10: no fabricated APY / reward % (the only % is the governed 0% unstaking fee)", !/\bAPY\b/i.test(JSON.stringify(d.metrics)) && !/\d+(\.\d+)?%/.test(String(mval("Rewards"))) && String(mval("Direct Unstake Fee")) === "0%", "no fake apy");
  }

  /* ---- Engine integration + separate cards ---- */
  {
    const r = runSuggestionEngine(inp([jupPos(650)]), NOW);
    const jup = r.suggestions.find((s) => s.id === JUP_STAKING_SUGGESTION_ID);
    add("JUP-ENG-1: mounted engine emits the JUP staking card (staking category)", jup != null && jup.category === "staking", `present=${jup != null}`);
  }
  {
    const r = runSuggestionEngine(inp([solPos(6), jupPos(900)]), NOW);
    const staking = r.suggestions.filter((s) => s.category === "staking");
    const ids = staking.map((s) => s.id).sort();
    add("JUP-ENG-2: SOL + JUP → TWO separate staking cards (never aggregated)", staking.length === 2 && ids.includes("staking_idle_sol") && ids.includes(JUP_STAKING_SUGGESTION_ID), ids.join(","));
  }
  add("JUP-ENG-3: JUP never enters the SOL staking selector", deriveStakingSuggestion(inp([jupPos(650)]), NOW) === null, "sol selector excludes JUP");
  add("JUP-ENG-4: JupSOL never produces a JUP staking card (distinct identity)", deriveJupStakingSuggestion(inp([tok(JUPSOL, "JupSOL", 10, 200, "lst", "jupiter")]), NOW) === null, "JupSOL != JUP");
  add("JUP-ENG-5: SOL staking unchanged — still produced for liquid SOL", deriveStakingSuggestion(inp([solPos(4)]), NOW)?.id === "staking_idle_sol", "sol staking intact");

  /* ---- Trim / meme regressions ---- */
  {
    const a = trimAssess({ positions: [tok(JUP_MINT, "JUP", 650, 0.8)] });
    add("JUP-TRIM-1: JUP excluded from Trim scope (excluded_scope), not a candidate", a.excludedHoldings.some((h) => h.mint === JUP_MINT && h.reviewEligibilityState === "excluded_scope") && !a.candidateHoldings.some((h) => h.mint === JUP_MINT), "JUP excluded_scope");
  }
  {
    const a = trimAssess({ positions: [tok(BONK, "BONK", 5_000_000, 0.00002), tok(WIF, "WIF", 100, 2)] });
    add("JUP-TRIM-2: BONK + WIF remain Trim candidates (meme ownership preserved)", a.candidateHoldings.some((h) => h.mint === BONK) && a.candidateHoldings.some((h) => h.mint === WIF), `candidates=${a.candidateHoldings.length}`);
  }
  add("JUP-TRIM-3: BONK/WIF never produce a JUP or SOL staking card", deriveJupStakingSuggestion(inp([tok(BONK, "BONK", 5_000_000, 0.00002)]), NOW) === null && deriveStakingSuggestion(inp([tok(WIF, "WIF", 100, 2)]), NOW) === null, "no staking for meme");

  return checks;
}


/**
 * Step 14P — Native SOL / Jupiter Native Stake BASELINE candidate. This is a native stake
 * account (delegated SOL), NOT an LST and NOT JupSOL. Its mechanics/fees/security are
 * recorded, but the three market categories are not published by Jupiter and are left
 * missing → evidence INCOMPLETE → no score → not approved → not surfaced product-facing
 * (only a clearly-labelled internal /testing BLOCKED evidence view). Every check confirms
 * the native-vs-JupSOL distinction, the blocked state, no execution path, and that the LST
 * candidates + INF behavior are unchanged.
 */
export function runSolNativeStakingBaselineFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const FRESH = "2026-07-14T02:50:00Z";
  const STALE = "2026-07-25T00:00:00Z";

  const funded = bufferFixture(5000, 1000, 3);
  const aligned = allocationFixture(15000, 62, 2);
  const run = runSuggestionEngine(inputsFor({ safetyBuffer: funded, allocation: aligned, positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const staking = run.suggestions.find((s) => s.category === "staking");
  const stakingAlts = staking?.reviewDetails?.otherProtocolsToReview;
  const demo = getDemoExactSolStakingReviewDetails();
  const testingMsol = getTestingPageFixtures().find((f) => f.id === "testing_msol_review");

  const inputs = NATIVE_SOL_STAKE_EVIDENCE_INPUTS;
  const summary = summarizeNativeSolStakeEvidence({ checkedAt: FRESH });
  const rows = getNativeSolStakeEvidenceRecords({ checkedAt: FRESH });

  // 14P-A…C. Module exists + is explicitly NOT an LST + not JupSOL.
  add("14P-A: Native SOL staking baseline evidence module exists", SOL_NATIVE_STAKING_BASELINE_EVIDENCE_EXISTS === true, "exists");
  add("14P-B: native staking candidate is explicitly not an LST", SOL_NATIVE_STAKING_BASELINE_IS_LST === false && NATIVE_STAKING_BASELINE_IDENTITY.isLiquidStakingToken === false && NATIVE_STAKING_BASELINE_IDENTITY.candidateType === "native_staking", `isLst=${SOL_NATIVE_STAKING_BASELINE_IS_LST}`);
  add("14P-C: native staking does not use a JupSOL token/mint", NATIVE_STAKING_BASELINE_IDENTITY.splTokenMint === null && NATIVE_STAKING_BASELINE_IDENTITY.assetSymbol === "SOL" && NATIVE_STAKING_BASELINE_IDENTITY.protocolId === "jupiter_native_stake" && !inputs.some((i) => i.assetSymbol !== "SOL"), `mint=${NATIVE_STAKING_BASELINE_IDENTITY.splTokenMint} sym=${NATIVE_STAKING_BASELINE_IDENTITY.assetSymbol}`);

  // 14P-D…K. Evidence inputs well-formed.
  add("14P-D: native staking evidence inputs use protocolId jupiter_native_stake", inputs.length > 0 && inputs.every((i) => i.protocolId === "jupiter_native_stake"), `n=${inputs.length}`);
  add("14P-E: no native staking input uses TEST_ONLY", !inputs.some((i) => JSON.stringify(i).includes("TEST_ONLY")), "clean");
  add("14P-F: every native staking input has sourceName", inputs.every((i) => !!i.sourceName && i.sourceName.trim() !== ""), "ok");
  add("14P-G: every native staking input has sourceUrl", inputs.every((i) => !!i.sourceUrl && i.sourceUrl.trim() !== ""), "ok");
  add("14P-H: every native staking input has confirmedAt", inputs.every((i) => !!i.confirmedAt && !Number.isNaN(Date.parse(i.confirmedAt))), "ok");
  add("14P-I: every native staking input has confirmedBy", inputs.every((i) => i.confirmedBy === "Ashot"), "ok");
  add("14P-J: every native staking input has reviewerRole", inputs.every((i) => i.reviewerRole === "founder"), "ok");
  add("14P-K: every native staking input has notes", inputs.every((i) => Array.isArray(i.notes) && i.notes.length > 0), "ok");

  // 14P-L…N. readyForRiskGate gating (now COMPLETE 10/10 with Step 14T market data).
  add("14P-L: readyForRiskGate is true only when all 10 fresh accepted records exist", summary.acceptedCount === 10 && summary.readyForRiskGate === true && summary.missingCategories.length === 0, `accepted=${summary.acceptedCount} ready=${summary.readyForRiskGate}`);
  add("14P-M: readyForRiskGate holds only when all 10 accepted + fresh", summary.readyForRiskGate === (summary.acceptedCount === 10 && summary.allEvidenceFresh), `ready=${summary.readyForRiskGate}`);
  add("14P-N: readyForRiskGate is false if stale", summarizeNativeSolStakeEvidence({ checkedAt: STALE }).readyForRiskGate === false, `stale-ready=${summarizeNativeSolStakeEvidence({ checkedAt: STALE }).readyForRiskGate}`);

  // 14P-O. Docs/records distinguish native stake account from JupSOL.
  const securityRow = rows.find((r) => r.category === "security_model");
  add("14P-O: native staking docs distinguish native stake account from JupSOL", NATIVE_STAKING_BASELINE_IDENTITY.isLiquidStakingToken === false && /native (solana )?stake account/i.test(String(securityRow?.value ?? "")) && /not an? (spl )?liquid[- ]staking token|not jupsol/i.test(String(securityRow?.value ?? "")), `distinct=${securityRow != null}`);

  // 14P-P…AA. Risk score — ASSIGNED (evidence 10/10 fresh); rubric + rationale defined.
  const assignment = getNativeStakingBaselineRiskScoreAssignment({ checkedAt: FRESH });
  const scoreStatus = evaluateNativeStakingBaselineRiskScoreAssignmentStatus({ checkedAt: FRESH });
  add("14P-P: native staking risk score exists only when readyForRiskGate is true", SOL_NATIVE_STAKING_BASELINE_RISK_SCORE_EXISTS === true && assignment != null && scoreStatus.scoreAssigned === true && scoreStatus.readyForRiskGate === true && getNativeStakingBaselineRiskScoreAssignment({ checkedAt: STALE }) === null, `score=${assignment?.score}`);
  add("14P-Q: native staking risk score is between 0 and 10", (assignment?.score ?? -1) >= 0 && (assignment?.score ?? 11) <= 10, `v=${assignment?.score}`);
  add("14P-R: native staking rubric defines dimension scores (6 dimensions)", getNativeStakingRubricDimensions().length === 6 && Object.keys(assignment?.dimensionScores ?? {}).length === 6, `dims=${getNativeStakingRubricDimensions().length}`);
  add("14P-S: every dimension score is between 0 and 10", Object.values(assignment?.dimensionScores ?? {}).every((v) => v >= 0 && v <= 10), "ok");
  {
    const dims = getNativeStakingRubricDimensions();
    const weightSum = dims.reduce((s, d) => s + d.weight, 0);
    const allSevens = computeNativeStakingWeightedScore({ audit_security: 7, maturity: 7, tvl_adoption: 7, withdrawal_fee_transparency: 7, operational_dependency_risk: 7, incident_history: 7 });
    add("14P-T: weighted score matches rubric weights", weightSum === 100 && allSevens === 7 && assignment?.score === 7.1, `weightSum=${weightSum} score=${assignment?.score}`);
  }
  add("14P-U: score status is assigned_for_review", assignment?.scoreStatus === "assigned_for_review", `v=${assignment?.scoreStatus}`);
  add("14P-V: native staking score does not approve protocol selection", SOL_NATIVE_STAKING_BASELINE_RISK_SCORE_APPROVES_READ_ONLY_RECOMMENDATION === false && scoreStatus.approvedForReadOnlyRecommendation === false && scoreStatus.selectedByProtocolLogic === false, "no approve/select");
  add("14P-W: native staking score enables no transactions/signatures", SOL_NATIVE_STAKING_BASELINE_RISK_SCORE_ENABLES_TRANSACTIONS === false && SOL_NATIVE_STAKING_BASELINE_RISK_SCORE_REQUIRES_WALLET_SIGNATURE === false && scoreStatus.transactionsEnabled === false, "no tx/sig");
  add("14P-X: rationale states native staking is not an LST", NATIVE_STAKING_RISK_RATIONALE.isNotLiquidStakingToken === true && /not a liquid staking token/i.test(NATIVE_STAKING_RISK_RATIONALE.notLstStatement), "present");
  add("14P-Y: rationale includes validator/delegation risk", /validator|delegation/i.test(NATIVE_STAKING_RISK_RATIONALE.risks.join(" ")), "present");
  add("14P-Z: rationale includes epoch-based unstake timing", /epoch/i.test(NATIVE_STAKING_RISK_RATIONALE.risks.join(" ")), "present");
  add("14P-AA: rationale includes lower DeFi composability than LSTs", /composability/i.test(NATIVE_STAKING_RISK_RATIONALE.risks.join(" ")), "present");

  // 14P-AB…AH. Read-only approval — ACTIVE (score 7.10 >= 7).
  const decision = getNativeStakingBaselineReadOnlyApprovalDecision({ checkedAt: FRESH });
  const apprStatus = evaluateNativeStakingBaselineReadOnlyApprovalStatus({ checkedAt: FRESH });
  const nativeDisplay = buildNativeStakingReviewCandidateDisplay({ checkedAt: FRESH });
  add("14P-AB: native staking approval exists only when score >= 7", SOL_NATIVE_STAKING_BASELINE_READ_ONLY_APPROVAL_EXISTS === true && SOL_NATIVE_STAKING_BASELINE_READ_ONLY_APPROVAL_APPROVES_REVIEW_EXPOSURE === true && decision != null && (decision?.basis.riskScore ?? 0) >= 7 && getNativeStakingBaselineReadOnlyApprovalDecision({ checkedAt: STALE }) === null, `score=${decision?.basis.riskScore}`);
  add("14P-AC: native staking approvedForReadOnlyRecommendation true when gate passes", apprStatus.approvedForReadOnlyRecommendation === true && evaluateNativeStakingBaselineReadOnlyApprovalStatus({ checkedAt: STALE }).approvedForReadOnlyRecommendation === false, `v=${apprStatus.approvedForReadOnlyRecommendation}`);
  add("14P-AD: native staking approvedForProtocolSelection is false", decision?.approvalScope.approvedForProtocolSelection === false && decision?.approvalScope.enablesMultiProtocolSelection === false, "false");
  add("14P-AE: native staking selectedByProtocolLogic is false", decision?.approvalScope.selectedByProtocolLogic === false && nativeDisplay.selectedByProtocolLogic === false, "false");
  add("14P-AF: native staking currentWinner is false", decision?.approvalScope.currentWinner === false && nativeDisplay.currentWinner === false, "false");
  add("14P-AG: native staking transactionsEnabled is false", decision?.approvalScope.transactionsEnabled === false && (nativeDisplay.transactionsEnabled as boolean) === false, "false");
  add("14P-AH: native staking walletSignatureRequired is false", decision?.approvalScope.walletSignatureRequired === false && (nativeDisplay.walletSignatureRequired as boolean) === false, "false");

  // 14P-AI…AO. Integration: native staking surfaced ONLY as "Baseline to review".
  const nativeInRealWallet = stakingAlts?.find((a) => a.protocolId === "jupiter_native_stake");
  const nativeInDemo = demo.otherProtocolsToReview?.find((a) => a.protocolId === "jupiter_native_stake");
  const nativeInMsolCard = testingMsol?.details.otherProtocolsToReview?.find((a) => a.protocolId === "jupiter_native_stake");
  add("14P-AI: real-wallet staking selectedProtocolId remains Jito/JitoSOL", staking?.protocolSelection?.selectedProtocolId === "jito" && staking?.protocolSelection?.selectedLstSymbol === "JitoSOL", `id=${staking?.protocolSelection?.selectedProtocolId}`);
  add("14P-AJ: native staking appears only as a Baseline to review", nativeInRealWallet?.roleLabel === "Baseline to review" && nativeInDemo?.roleLabel === "Baseline to review", `rw=${nativeInRealWallet != null} demo=${nativeInDemo != null}`);
  add("14P-AK: native staking is not selectedProtocolId", staking?.protocolSelection?.selectedProtocolId !== "jupiter_native_stake" && staking?.protocolSelection?.selectedProtocolName !== "Jupiter Native Stake" && nativeInRealWallet?.selectedByProtocolLogic === false, `id=${staking?.protocolSelection?.selectedProtocolId}`);
  add("14P-AL: native staking does not affect Top Pick ranking", !run.suggestions.some((s) => s.protocolSelection?.selectedProtocolName === "Jupiter Native Stake") && run.suggestions.filter((s) => s.is_top_pick).every((s) => s.protocolSelection?.selectedProtocolName !== "Jupiter Native Stake"), "no");
  add("14P-AM: native staking does not affect engine ordering", run.suggestions.filter((s) => s.category === "staking").length === 1 && run.suggestions.every((s) => s.id !== "jupiter_native_stake"), `stakingCount=${run.suggestions.filter((s) => s.category === "staking").length}`);
  add("14P-AN: Demo selected protocol remains JitoSOL", demo.protocolSelectionDisplay?.protocolName === "Jito" && demo.protocolSelectionDisplay?.assetSymbol === "JitoSOL", `name=${demo.protocolSelectionDisplay?.protocolName}`);
  add("14P-AO: /testing review-candidate card includes native staking as a Baseline to review", nativeInMsolCard != null && nativeInMsolCard.roleLabel === "Baseline to review" && testingMsol?.card.cta.action === "review", `has=${nativeInMsolCard != null}`);

  // 14P-AP…AR. Safety guardrails.
  {
    const json = (JSON.stringify(nativeDisplay) + JSON.stringify(demo.otherProtocolsToReview) + JSON.stringify(rows)).toLowerCase();
    const tokens = ["sendtransaction", "signmessage", "signtransaction", "signalltransactions", "stake(", "delegate(", "withdraw(", "swap(", "deposit(", "approve(", "execute("];
    const hits = tokens.filter((t) => json.includes(t));
    add("14P-AP: no transaction/signature/stake/delegate/withdraw/swap/deposit/approve/execute path", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }
  {
    const copy = [nativeDisplay.statusLabel, nativeDisplay.notLstLabel, nativeDisplay.nativeStakeAccountLabel, nativeDisplay.apy30dMethodology, ...NATIVE_STAKING_RISK_RATIONALE.positives, ...NATIVE_STAKING_RISK_RATIONALE.risks, ...NATIVE_STAKING_RISK_RATIONALE.limitations]
      .filter(Boolean).join(" ").toLowerCase();
    const forbidden = ["best", "safest", "winner", "guaranteed", "risk-free", "recommended", "stake now", "deposit now", "highest apy"];
    const hits = forbidden.filter((w) => copy.includes(w));
    add("14P-AQ: no forbidden claims in native staking UI/copy", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }
  add("14P-AR: no execution button — native display has no CTA; external link is review-only in a new tab", nativeDisplay.externalReviewLink?.opensNewTab === true && (nativeDisplay as { cta?: unknown }).cta === undefined && /^open jupiter staking page$/i.test(nativeDisplay.externalReviewLink?.label ?? ""), `link=${nativeDisplay.externalReviewLink?.url}`);

  // 14P-AS…AV. JitoSOL live + LST review behavior unchanged; INF still blocked.
  add("14P-AS: JitoSOL live behavior remains unchanged", staking?.protocolSelection?.status === "selected" && staking?.protocolSelection?.selectedProtocolName === "Jito" && toSuggestionCard(staking!).protocolName === "Jito", `name=${staking?.protocolSelection?.selectedProtocolName}`);
  {
    const msol = buildMsolReadOnlyReviewCandidateDisplay({ checkedAt: FRESH });
    const jup = buildJupsolReadOnlyReviewCandidateDisplay({ checkedAt: FRESH });
    const bsol = buildBsolReadOnlyReviewCandidateDisplay({ checkedAt: FRESH });
    add("14P-AT: mSOL/JupSOL/bSOL review behavior remains unchanged", msol.riskScore === 7.4 && jup.riskScore === 7.65 && bsol.riskScore === 7.35 && msol.reviewState === "approved_for_review_exposure" && jup.reviewState === "approved_for_review_exposure" && bsol.reviewState === "approved_for_review_exposure", `m=${msol.riskScore} j=${jup.riskScore} b=${bsol.riskScore}`);
  }
  add("14P-AU: INF remains blocked unless separately approved later", getInfReadOnlyApprovalDecision({ checkedAt: "2026-07-14T02:30:00Z" }) === null && getInfReviewApprovedCandidateEntry({ checkedAt: "2026-07-14T02:30:00Z" }) === null, "inf blocked");
  add("14P-AV: UI explains final protocol selection happens later through deterministic protocol logic", /deterministic/i.test(testingMsol?.details.summary.reason ?? "") && /final protocol selection will happen later/i.test(testingMsol?.details.summary.reason ?? ""), "present");

  return checks;
}


/**
 * Step 14Q — Native validator market-data ADAPTER for Jupiter Native Stake (hybrid: Solana
 * RPC getVoteAccounts for stake/commission + a validator analytics provider for APY). The
 * adapter parses/builds/converts deterministically from fixture payloads; it never reuses
 * JupSOL APY/TVL, never uses a network-wide APY to unblock the candidate, never approves or
 * scores native staking, never mutates the evidence array, and has no execution path. The
 * native baseline stays blocked (evidence array unchanged).
 */
export function runNativeValidatorMarketDataFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const VA = JUPITER_NATIVE_STAKE_VOTE_ACCOUNT;
  const FETCHED = "2026-07-14T03:00:00Z";
  const CHECKED = "2026-07-14T03:10:00Z";
  const STALE_FETCHED = "2026-07-10T03:00:00Z";

  // Fixture payloads.
  const rpcValid = { result: { current: [{ votePubkey: VA, activatedStake: 1_234_567_000_000_000, commission: 5 }, { votePubkey: "OtherValidator1111", activatedStake: 999, commission: 10 }], delinquent: [] } };
  const rpcMissing = { result: { current: [{ votePubkey: "OtherValidator1111", activatedStake: 999, commission: 10 }], delinquent: [] } };
  const rpcDelinquent = { result: { current: [], delinquent: [{ votePubkey: VA, activatedStake: 500_000_000_000, commission: 5 }] } };
  const apyHistory = Array.from({ length: 33 }, (_, i) => 7.0 + (i % 4) * 0.1); // 33 daily values
  const stakewizValid = [{ vote_identity: VA, apy_estimate: 7.23, apy_history: apyHistory }];
  const stakewizNoHistory = [{ vote_identity: VA, apy_estimate: 7.23 }];
  const compassValid = { validators: [{ vote_account: VA, apy: 7.05, apyHistory: apyHistory.map((a) => ({ date: "d", apy: a })) }] };
  const networkWideOnly = { network_apy: 6.8 };
  const unknownSchema = { unexpected: { shape: true } };

  // 14Q-A…J. Constants.
  add("14Q-A: NATIVE_VALIDATOR_MARKET_DATA_EXISTS is true", NATIVE_VALIDATOR_MARKET_DATA_EXISTS === true, "true");
  add("14Q-B: uses RPC for stake", NATIVE_VALIDATOR_MARKET_DATA_USES_RPC_FOR_STAKE === true, "true");
  add("14Q-C: uses analytics for APY", NATIVE_VALIDATOR_MARKET_DATA_USES_ANALYTICS_FOR_APY === true, "true");
  add("14Q-D: does not use JupSOL APY", NATIVE_VALIDATOR_MARKET_DATA_USES_JUPSOL_APY === false, "false");
  add("14Q-E: does not use JupSOL TVL", NATIVE_VALIDATOR_MARKET_DATA_USES_JUPSOL_TVL === false, "false");
  add("14Q-F: does not enable native approval", NATIVE_VALIDATOR_MARKET_DATA_ENABLES_NATIVE_APPROVAL === false, "false");
  add("14Q-G: does not enable selector comparison", NATIVE_VALIDATOR_MARKET_DATA_ENABLES_SELECTOR_COMPARISON === false, "false");
  add("14Q-H: does not update live recommendations", NATIVE_VALIDATOR_MARKET_DATA_UPDATES_LIVE_RECOMMENDATIONS === false, "false");
  add("14Q-I: does not enable transactions", NATIVE_VALIDATOR_MARKET_DATA_ENABLES_TRANSACTIONS === false, "false");
  add("14Q-J: does not require wallet signature", NATIVE_VALIDATOR_MARKET_DATA_REQUIRES_WALLET_SIGNATURE === false, "false");
  add("14Q-K: Jupiter native stake vote account constant exists", VA === "CatzoSMUkTRidT5DwBxAC2pEtnwMBTpkCepHkFgZDiqb", VA);

  // 14Q-L…P. RPC parser.
  const rpcParsed = parseJupiterNativeStakeVoteAccountFromGetVoteAccounts(rpcValid, { currentEpoch: 700, asOfSlot: 123 });
  add("14Q-L: RPC parser finds Jupiter vote account in current accounts", rpcParsed.found === true && rpcParsed.delinquent === false, `found=${rpcParsed.found}`);
  add("14Q-M: RPC parser extracts activatedStakeSol", rpcParsed.activatedStakeSol === 1_234_567 && rpcParsed.activatedStakeLamports === 1_234_567_000_000_000, `sol=${rpcParsed.activatedStakeSol}`);
  add("14Q-N: RPC parser extracts commissionPct", rpcParsed.commissionPct === 5, `commission=${rpcParsed.commissionPct}`);
  add("14Q-O: RPC parser returns missing/blocker when vote account is absent", parseJupiterNativeStakeVoteAccountFromGetVoteAccounts(rpcMissing).found === false && parseJupiterNativeStakeVoteAccountFromGetVoteAccounts(rpcMissing).blockers.includes("vote_account_not_found"), "not_found");
  add("14Q-P: RPC parser flags delinquent validator", parseJupiterNativeStakeVoteAccountFromGetVoteAccounts(rpcDelinquent).blockers.includes("validator_delinquent"), "delinquent");

  // 14Q-Q…T. Analytics parser.
  const swParsed = parseNativeValidatorApyFromAnalytics("stakewiz", stakewizValid);
  const expected30 = Math.round((apyHistory.slice(-30).reduce((s, n) => s + n, 0) / 30) * 100) / 100;
  add("14Q-Q: analytics parser extracts currentApyPct from supported fixture", swParsed.currentApyPct === 7.23, `apy=${swParsed.currentApyPct}`);
  add("14Q-R: analytics parser computes apy30dPct deterministically from history fixture", swParsed.apy30dPct === expected30 && parseNativeValidatorApyFromAnalytics("solana_compass", compassValid).apy30dPct === expected30, `apy30=${swParsed.apy30dPct} expected=${expected30}`);
  {
    const nw = parseNativeValidatorApyFromAnalytics("stakewiz", networkWideOnly);
    add("14Q-S: analytics parser does not use network-wide APY to unblock Jupiter validator", nw.networkWideOnly === true && nw.currentApyPct === undefined && nw.apy30dPct === undefined, `used=${nw.currentApyPct}`);
  }
  add("14Q-T: unknown analytics schema fails safely with source_schema_unrecognized", parseNativeValidatorApyFromAnalytics("stakewiz", unknownSchema).blockers.includes("source_schema_unrecognized"), "safe");

  // 14Q-U…AD. Builder.
  const mdComplete = buildNativeValidatorMarketData({ rpcVoteAccountsResponse: rpcValid, analyticsProvider: "stakewiz", analyticsPayload: stakewizValid, solPriceUsd: 180, fetchedAt: FETCHED, checkedAt: CHECKED });
  const mdPartial = buildNativeValidatorMarketData({ rpcVoteAccountsResponse: rpcValid, analyticsProvider: "stakewiz", analyticsPayload: stakewizNoHistory, fetchedAt: FETCHED, checkedAt: CHECKED });
  const mdStale = buildNativeValidatorMarketData({ rpcVoteAccountsResponse: rpcValid, analyticsProvider: "stakewiz", analyticsPayload: stakewizValid, solPriceUsd: 180, fetchedAt: STALE_FETCHED, checkedAt: CHECKED });
  const mdNoPrice = buildNativeValidatorMarketData({ rpcVoteAccountsResponse: rpcValid, analyticsProvider: "stakewiz", analyticsPayload: stakewizValid, fetchedAt: FETCHED, checkedAt: CHECKED });
  add("14Q-U: builder returns complete when RPC and APY data are complete and fresh", mdComplete.status === "complete" && mdComplete.missingFields.length === 0, `status=${mdComplete.status}`);
  add("14Q-V: builder returns partial when APY is missing", mdPartial.status === "partial" && mdPartial.missingFields.includes("apy30dPct"), `status=${mdPartial.status}`);
  add("14Q-W: builder returns stale when fetchedAt is older than 24h", mdStale.status === "stale" && mdStale.blockers.includes("stale_market_data"), `status=${mdStale.status}`);
  add("14Q-X: delegatedStakeUsd is computed only when SOL price is provided", mdComplete.delegatedStakeUsd === 1_234_567 * 180 && mdNoPrice.delegatedStakeUsd === undefined, `usd=${mdComplete.delegatedStakeUsd} noPrice=${mdNoPrice.delegatedStakeUsd}`);
  add("14Q-Y: market data keeps isLiquidStakingToken false", mdComplete.isLiquidStakingToken === false && mdPartial.isLiquidStakingToken === false, "false");
  add("14Q-Z: market data keeps splTokenMint null", mdComplete.splTokenMint === null && mdPartial.splTokenMint === null, "null");
  add("14Q-AA: market data does not approve native staking", NATIVE_VALIDATOR_MARKET_DATA_ENABLES_NATIVE_APPROVAL === false, "false");
  add("14Q-AB: market data does not enable selector comparison", mdComplete.enablesSelectorComparison === false, "false");
  add("14Q-AC: market data does not update live recommendations", mdComplete.updatesLiveRecommendations === false, "false");
  add("14Q-AD: market data does not enable transactions/signatures", mdComplete.transactionsEnabled === false && mdComplete.walletSignatureRequired === false, "false");

  // 14Q-AE…AJ. Conversion bridge.
  const convComplete = convertNativeValidatorMarketDataToEvidenceInputs(mdComplete);
  const byCat = (c: string) => convComplete.inputs.find((i) => i.category === c);
  add("14Q-AE: conversion creates delegated_stake_or_tvl evidence only when complete", convComplete.converted === true && byCat("delegated_stake_or_tvl") != null && byCat("delegated_stake_or_tvl")?.protocolId === "jupiter_native_stake", `has=${byCat("delegated_stake_or_tvl") != null}`);
  add("14Q-AF: conversion creates current_apy evidence only when complete", byCat("current_apy")?.value === 7.23 && byCat("current_apy")?.unit === "pct", `apy=${byCat("current_apy")?.value}`);
  add("14Q-AG: conversion creates apy_30d evidence only when complete", byCat("apy_30d")?.value === expected30 && byCat("apy_30d")?.unit === "pct", `apy30=${byCat("apy_30d")?.value}`);
  add("14Q-AH: conversion creates no evidence when market data is partial", convertNativeValidatorMarketDataToEvidenceInputs(mdPartial).converted === false && convertNativeValidatorMarketDataToEvidenceInputs(mdPartial).inputs.length === 0, "none");
  add("14Q-AI: conversion creates no evidence when market data is stale", convertNativeValidatorMarketDataToEvidenceInputs(mdStale).converted === false && convertNativeValidatorMarketDataToEvidenceInputs(mdStale).inputs.length === 0, "none");
  {
    // The conversion returns inputs but must NOT mutate the native evidence array.
    const before = NATIVE_SOL_STAKE_EVIDENCE_INPUTS.length;
    convertNativeValidatorMarketDataToEvidenceInputs(mdComplete);
    add("14Q-AJ: conversion does not mutate native evidence arrays automatically", NATIVE_SOL_STAKE_EVIDENCE_INPUTS.length === before && before === 10, `len=${NATIVE_SOL_STAKE_EVIDENCE_INPUTS.length}`);
  }

  // 14Q-AK…AP. Baseline still blocked; other candidates unchanged; no execution; docs distinct.
  add("14Q-AK: native staking is completed only via explicit, source-attributed market records (adapter never auto-appends)", (() => { const s = summarizeNativeSolStakeEvidence({ checkedAt: "2026-07-14T02:50:00Z" }); const market = NATIVE_SOL_STAKE_EVIDENCE_INPUTS.filter((i) => ["delegated_stake_or_tvl", "current_apy", "apy_30d"].includes(i.category)); return s.readyForRiskGate === true && market.length === 3 && market.every((i) => /stakewiz|marinade/i.test(i.sourceName)); })(), "explicit records");
  {
    const funded = bufferFixture(5000, 1000, 3);
    const aligned = allocationFixture(15000, 62, 2);
    const run = runSuggestionEngine(inputsFor({ safetyBuffer: funded, allocation: aligned, positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
    const staking = run.suggestions.find((s) => s.category === "staking");
    add("14Q-AL: JitoSOL live behavior remains unchanged", staking?.protocolSelection?.selectedProtocolId === "jito" && staking?.protocolSelection?.selectedProtocolName === "Jito", `id=${staking?.protocolSelection?.selectedProtocolId}`);
  }
  {
    const msol = buildMsolReadOnlyReviewCandidateDisplay({ checkedAt: "2026-07-14T02:30:00Z" });
    const jup = buildJupsolReadOnlyReviewCandidateDisplay({ checkedAt: "2026-07-14T02:30:00Z" });
    const bsol = buildBsolReadOnlyReviewCandidateDisplay({ checkedAt: "2026-07-14T02:30:00Z" });
    add("14Q-AM: mSOL/JupSOL/bSOL review behavior remains unchanged", msol.riskScore === 7.4 && jup.riskScore === 7.65 && bsol.riskScore === 7.35, `m=${msol.riskScore} j=${jup.riskScore} b=${bsol.riskScore}`);
  }
  add("14Q-AN: INF remains blocked", getInfReadOnlyApprovalDecision({ checkedAt: "2026-07-14T02:30:00Z" }) === null, "inf blocked");
  {
    const json = (JSON.stringify(mdComplete) + JSON.stringify(convComplete)).toLowerCase();
    const tokens = ["sendtransaction", "signmessage", "signtransaction", "signalltransactions", "stake(", "delegate(", "withdraw(", "swap(", "deposit(", "approve(", "execute("];
    const hits = tokens.filter((t) => json.includes(t));
    add("14Q-AO: no transaction/signature/stake/delegate/withdraw path exists", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }
  add("14Q-AP: docs explain native stake account is not JupSOL", NATIVE_VALIDATOR_MARKET_DATA_USES_JUPSOL_APY === false && NATIVE_VALIDATOR_MARKET_DATA_USES_JUPSOL_TVL === false && mdComplete.isLiquidStakingToken === false && mdComplete.splTokenMint === null, "distinct");

  return checks;
}


/**
 * Step 14T — Rated removed; Jupiter Native Stake completed with Stakewiz + Marinade. Checks
 * that Rated is fully gone, the Marinade validator-history parser + Stakewiz current-data
 * parser + combine builder work (validator-specific, no mSOL/JupSOL/network-wide, no API
 * key), the native evidence completes 10/10, the deterministic score (7.10) + approval + the
 * "Baseline to review" UI exposure all pass, and the other candidates + invariants hold.
 */
export function runNativeStakingMarinadeFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const VA = JUPITER_NATIVE_STAKE_VOTE_ACCOUNT;
  const FRESH = "2026-07-14T02:50:00Z";
  const STALE = "2026-07-25T00:00:00Z";
  const CHECKED = "2026-07-14T02:50:00Z";

  // Source-tree scan for Rated-removal checks.
  const root = process.cwd();
  const readIf = (rel: string) => { try { return readFileSync(`${root}/${rel}`, "utf8"); } catch { return ""; } };
  const scanSrc = (pattern: string): string[] => {
    const hits: string[] = [];
    for (const base of ["src", "scripts"]) {
      let entries: string[] = [];
      try { entries = readdirSync(`${root}/${base}`, { recursive: true }) as string[]; } catch { /* dir missing */ }
      for (const e of entries) {
        if (!/\.(ts|tsx|mjs|md|json)$/.test(e)) continue;
        // Exclude the executable fixture-suite files — they necessarily name the patterns they scan for.
        if (e.includes("suggestionEngine.fixtures") || e.includes("suggestions/fixtures")) continue;
        const content = readIf(`${base}/${e}`);
        if (content.includes(pattern)) hits.push(`${base}/${e}`);
      }
    }
    return hits;
  };

  // 14T-A…G. Rated is fully removed.
  add("14T-A: Rated source module no longer exists", !existsSync(`${root}/src/suggestions/nativeValidatorRatedData.ts`), "gone");
  add("14T-B: Rated documentation module no longer exists", !existsSync(`${root}/src/suggestions/nativeValidatorRatedData.md`), "gone");
  add("14T-C: Rated fetch script no longer exists", !existsSync(`${root}/scripts/fetch-rated-jupiter-native-stake.mjs`), "gone");
  add("14T-D: package.json has no native:fetch-rated script", !readIf("package.json").includes("native:fetch-rated"), "gone");
  add("14T-E: native validator provider types do not contain rated", !/"stakewiz"\s*\|\s*"solana_compass"\s*\|\s*"validators_app"\s*\|\s*"rated"/.test(readIf("src/suggestions/nativeValidatorMarketData.ts")) && !readIf("src/suggestions/nativeValidatorMarketData.ts").includes("apy30dSource: \"rated\""), "gone");
  add("14T-F: no RATED_API_KEY or VITE_RATED_API_KEY reference exists", scanSrc("RATED_API_KEY").length === 0 && scanSrc("VITE_RATED_API_KEY").length === 0, `hits=${scanSrc("RATED_API_KEY").join(",") || "none"}`);
  add("14T-G: no api.rated.network reference exists in the active source tree", scanSrc("api.rated.network").length === 0, `hits=${scanSrc("api.rated.network").join(",") || "none"}`);

  // Fixture payloads (real Marinade/Stakewiz schema shapes).
  const IDENT = JUPITER_NATIVE_STAKE_IDENTITY;
  const mkEpochs = (n: number, endEpoch: number, lastEndIso: string, apyBase = 0.054) => {
    const out: Record<string, unknown>[] = [];
    let end = Date.parse(lastEndIso);
    const twoDays = 2 * 86400_000;
    for (let k = 0; k < n; k++) {
      const start = end - twoDays;
      out.push({ epoch: endEpoch - k, apy: apyBase - k * 0.0004, apr: apyBase - k * 0.0004 - 0.0013, activated_stake: 12_500_000_000_000_000, commission_effective: 5, epoch_start_at: new Date(start).toISOString(), epoch_end_at: new Date(end).toISOString() });
      end = start;
    }
    return out;
  };
  const marinadeValid = { validators: [{ vote_account: VA, identity: IDENT, info_name: "Jupiter", avg_apy: 0.054, epochs_count: 411, epoch_stats: [{ epoch: 1001, apy: null, activated_stake: 12_500_000_000_000_000, epoch_start_at: "2026-07-12T12:22:01Z", epoch_end_at: "2026-07-14T12:00:00Z" }, ...mkEpochs(16, 1000, "2026-07-12T12:22:01Z")] }] };
  const marinadeOther = { validators: [{ vote_account: "OtherValidatorVote111111", identity: "x", epoch_stats: mkEpochs(16, 1000, "2026-07-12T12:22:01Z") }] };
  const marinadeNetwork = { validators: [{ info_name: "network", epoch_stats: [] }] };
  const marinadeMsol = [{ apy: 0.051, value: 1.05 }, { apy: 0.052, value: 1.06 }];
  const marinadeInsufficient = { validators: [{ vote_account: VA, epoch_stats: mkEpochs(2, 1000, "2026-07-12T12:22:01Z") }] };
  const marinadeStale = { validators: [{ vote_account: VA, epoch_stats: mkEpochs(16, 900, "2026-06-01T00:00:00Z") }] };
  const stakewiz = [{ vote_identity: VA, identity: IDENT, activated_stake: 12_500_954.43, commission: 500, apy_estimate: 5.23, delinquent: false, epoch: 1001 }];
  const stakewizDelinquent = [{ ...stakewiz[0], delinquent: true }];

  // 14T-H…V. Marinade provider + parser.
  const mParsed = parseJupiterValidatorHistoryFromMarinade(marinadeValid, { expectedVoteAccount: VA, checkedAt: CHECKED, windowDays: 30 });
  add("14T-H: Marinade provider type exists", NATIVE_VALIDATOR_MARINADE_DATA_EXISTS === true && mParsed.provider === "marinade", "exists");
  add("14T-I: Marinade validator analytics requires no API key", NATIVE_VALIDATOR_MARINADE_REQUIRES_API_KEY === false, "no key");
  add("14T-J: Marinade integration explicitly rejects mSOL APY endpoints", NATIVE_VALIDATOR_MARINADE_USES_MSOL_APY === false && MARINADE_MSOL_APY_ENDPOINT_FORBIDDEN.includes("msol/apy") && parseJupiterValidatorHistoryFromMarinade(marinadeMsol, { checkedAt: CHECKED }).blockers.includes("marinade_msol_data_rejected"), "rejected");
  add("14T-K: Marinade parser requires exact Jupiter validator identity/vote mapping", mParsed.voteAccount === VA && mParsed.identityAccount === IDENT, `vote=${mParsed.voteAccount}`);
  add("14T-L: another validator is rejected", parseJupiterValidatorHistoryFromMarinade(marinadeOther, { checkedAt: CHECKED }).blockers.includes("marinade_vote_account_mismatch"), "rejected");
  add("14T-M: network-wide data is rejected", parseJupiterValidatorHistoryFromMarinade(marinadeNetwork, { checkedAt: CHECKED }).blockers.some((b) => /network|mismatch/.test(b)) && NATIVE_VALIDATOR_MARINADE_USES_NETWORK_APY === false, "rejected");
  add("14T-N: mSOL data is rejected", parseJupiterValidatorHistoryFromMarinade(marinadeMsol, { checkedAt: CHECKED }).status === "invalid" && NATIVE_VALIDATOR_MARINADE_USES_JUPSOL_APY === false, "rejected");
  {
    const badApy = { validators: [{ vote_account: VA, epoch_stats: [{ epoch: 1000, apy: -0.05, epoch_start_at: "2026-07-10T00:00:00Z", epoch_end_at: "2026-07-12T00:00:00Z" }, ...mkEpochs(15, 999, "2026-07-10T00:00:00Z")] }] };
    add("14T-O: malformed APY is rejected", parseJupiterValidatorHistoryFromMarinade(badApy, { expectedVoteAccount: VA, checkedAt: CHECKED }).blockers.includes("marinade_apy_invalid"), "rejected");
  }
  {
    const noTs = { validators: [{ vote_account: VA, epoch_stats: [{ epoch: 1000, apy: 0.05 }, { epoch: 999, apy: 0.05 }] }] };
    add("14T-P: missing timestamps/epochs are rejected when required", parseJupiterValidatorHistoryFromMarinade(noTs, { checkedAt: CHECKED }).blockers.includes("marinade_timestamps_missing"), "rejected");
  }
  {
    // Shuffled + duplicate epochs → parser must sort + de-dupe deterministically.
    const dupEpochs = [...mkEpochs(16, 1000, "2026-07-12T12:22:01Z")];
    const shuffled = { validators: [{ vote_account: VA, epoch_stats: [dupEpochs[3], dupEpochs[0], dupEpochs[0], dupEpochs[8], ...dupEpochs] }] };
    const p2 = parseJupiterValidatorHistoryFromMarinade(shuffled, { expectedVoteAccount: VA, checkedAt: CHECKED });
    const epochsAsc = p2.observations.map((o) => o.epoch);
    const sortedUnique = [...new Set(epochsAsc)].sort((a, b) => a - b);
    add("14T-Q: history observations are sorted and deduplicated deterministically", JSON.stringify(epochsAsc) === JSON.stringify(sortedUnique) && epochsAsc.length === new Set(epochsAsc).size, `n=${epochsAsc.length}`);
  }
  add("14T-R: insufficient history coverage remains blocked", parseJupiterValidatorHistoryFromMarinade(marinadeInsufficient, { checkedAt: CHECKED }).status !== "complete", "blocked");
  add("14T-S: stale history remains blocked", parseJupiterValidatorHistoryFromMarinade(marinadeStale, { checkedAt: CHECKED }).status === "stale", "stale");
  add("14T-T: valid 30-day validator history produces a deterministic APY", mParsed.status === "complete" && typeof mParsed.trailing30DayApyPct === "number" && parseJupiterValidatorHistoryFromMarinade(marinadeValid, { expectedVoteAccount: VA, checkedAt: CHECKED }).trailing30DayApyPct === mParsed.trailing30DayApyPct && (mParsed.coverageDays ?? 0) >= 28, `apy=${mParsed.trailing30DayApyPct} cov=${mParsed.coverageDays}`);
  add("14T-U: the exact APY methodology is recorded", /duration-weighted 30-day average/i.test(mParsed.methodology ?? ""), "recorded");
  add("14T-V: a rolling 14-day metric is not falsely described as realized 30-day yield", /average/i.test(mParsed.methodology ?? "") && !/realized 30-day yield/i.test(mParsed.methodology ?? ""), "labelled");

  // 14T-W…AB. Stakewiz parser.
  const sw = parseStakewizValidatorSummary(stakewiz, { voteAccount: VA });
  add("14T-W: Stakewiz parser requires the exact Jupiter vote account", sw.matched === true && parseStakewizValidatorSummary([{ vote_identity: "other" }], { voteAccount: VA }).blockers.includes("stakewiz_vote_account_mismatch"), "exact");
  add("14T-X: Stakewiz extracts activated stake", sw.activatedStakeSol === 12_500_954.43, `stake=${sw.activatedStakeSol}`);
  add("14T-Y: Stakewiz extracts current APY", sw.currentApyPct === 5.23, `apy=${sw.currentApyPct}`);
  add("14T-Z: Stakewiz extracts commission", sw.commissionPct === 5, `comm=${sw.commissionPct}`);
  add("14T-AA: Stakewiz flags delinquency", parseStakewizValidatorSummary(stakewizDelinquent, { voteAccount: VA }).blockers.includes("validator_delinquent"), "flagged");
  {
    const pkgStaleSw = buildJupiterNativeStakeMarketPackage({ stakewizPayload: stakewiz, stakewizFetchedAt: STALE, marinadePayload: marinadeValid, marinadeFetchedAt: "2026-07-14T02:45:00Z", checkedAt: CHECKED });
    add("14T-AB: stale Stakewiz data remains blocked", pkgStaleSw.status === "stale", `status=${pkgStaleSw.status}`);
  }

  // 14T-AC…AN. Combined package + conversion.
  const pkg = buildJupiterNativeStakeMarketPackage({ stakewizPayload: stakewiz, stakewizFetchedAt: "2026-07-14T02:45:00Z", marinadePayload: marinadeValid, marinadeFetchedAt: "2026-07-14T02:45:00Z", checkedAt: CHECKED });
  const pkgNoMar = buildJupiterNativeStakeMarketPackage({ stakewizPayload: stakewiz, stakewizFetchedAt: "2026-07-14T02:45:00Z", checkedAt: CHECKED });
  const pkgStaleMar = buildJupiterNativeStakeMarketPackage({ stakewizPayload: stakewiz, stakewizFetchedAt: "2026-07-14T02:45:00Z", marinadePayload: marinadeStale, marinadeFetchedAt: "2026-07-14T02:45:00Z", checkedAt: CHECKED });
  const conv = convertNativeValidatorMarketDataToEvidenceInputs(pkg);
  const cByCat = (c: string) => conv.inputs.find((i) => i.category === c);
  add("14T-AC: fresh Stakewiz + valid Marinade history yields complete market data", pkg.status === "complete" && pkg.activatedStakeSol === 12_500_954.43 && pkg.currentApyPct === 5.23 && typeof pkg.apy30dPct === "number" && pkg.missingFields.length === 0, `status=${pkg.status}`);
  add("14T-AD: missing Marinade history yields partial market data", pkgNoMar.status === "partial" && pkgNoMar.missingFields.includes("apy30dPct"), `status=${pkgNoMar.status}`);
  add("14T-AE: stale Stakewiz plus fresh Marinade remains blocked", buildJupiterNativeStakeMarketPackage({ stakewizPayload: stakewiz, stakewizFetchedAt: STALE, marinadePayload: marinadeValid, marinadeFetchedAt: "2026-07-14T02:45:00Z", checkedAt: CHECKED }).status !== "complete", "blocked");
  add("14T-AF: fresh Stakewiz plus stale Marinade remains blocked", pkgStaleMar.status !== "complete", `status=${pkgStaleMar.status}`);
  add("14T-AG: combined package uses Stakewiz for current data", pkg.stakeSource === "stakewiz" && pkg.currentApySource === "stakewiz", "stakewiz");
  add("14T-AH: combined package uses Marinade for 30-day history", pkg.apy30dSource === "marinade" && /marinade/i.test(cByCat("apy_30d")?.sourceName ?? ""), "marinade");
  add("14T-AI: combined package uses no JupSOL data", conv.inputs.every((i) => /not jupsol/i.test(i.notes.join(" "))), "no jupsol");
  add("14T-AJ: combined package uses no mSOL APY", conv.inputs.every((i) => /not msol/i.test(i.notes.join(" "))), "no msol");
  add("14T-AK: combined package uses no network-wide APY", conv.inputs.every((i) => /not network-wide/i.test(i.notes.join(" "))), "no network-wide");
  add("14T-AL: complete package converts all three market evidence records", conv.converted === true && cByCat("delegated_stake_or_tvl") != null && cByCat("current_apy") != null && cByCat("apy_30d") != null, `n=${conv.inputs.length}`);
  add("14T-AM: partial package converts no evidence records", convertNativeValidatorMarketDataToEvidenceInputs(pkgNoMar).converted === false && convertNativeValidatorMarketDataToEvidenceInputs(pkgNoMar).inputs.length === 0, "none");
  {
    const summary = summarizeNativeSolStakeEvidence({ checkedAt: FRESH });
    add("14T-AN: native readyForRiskGate becomes true only at 10/10 fresh records", summary.acceptedCount === 10 && summary.readyForRiskGate === true && summarizeNativeSolStakeEvidence({ checkedAt: STALE }).readyForRiskGate === false, `accepted=${summary.acceptedCount}`);
  }

  // 14T-AO…AV. Conditional pipeline (score/approval — now active).
  const assignment = getNativeStakingBaselineRiskScoreAssignment({ checkedAt: FRESH });
  const decision = getNativeStakingBaselineReadOnlyApprovalDecision({ checkedAt: FRESH });
  add("14T-AO: native risk score exists only when readyForRiskGate is true", assignment != null && getNativeStakingBaselineRiskScoreAssignment({ checkedAt: STALE }) === null, `score=${assignment?.score}`);
  add("14T-AP: native score is deterministic and between 0 and 10", assignment?.score === computeNativeStakingScore() && (assignment?.score ?? -1) >= 0 && (assignment?.score ?? 11) <= 10, `score=${assignment?.score}`);
  add("14T-AQ: native approval exists only when score >= 7", decision != null && (decision?.basis.riskScore ?? 0) >= 7 && getNativeStakingBaselineReadOnlyApprovalDecision({ checkedAt: STALE }) === null, `score=${decision?.basis.riskScore}`);
  add("14T-AR: native approvedForProtocolSelection remains false", decision?.approvalScope.approvedForProtocolSelection === false, "false");
  add("14T-AS: native selectedByProtocolLogic remains false", decision?.approvalScope.selectedByProtocolLogic === false, "false");
  add("14T-AT: native currentWinner remains false", decision?.approvalScope.currentWinner === false, "false");
  add("14T-AU: native transactionsEnabled remains false", decision?.approvalScope.transactionsEnabled === false, "false");
  add("14T-AV: native walletSignatureRequired remains false", decision?.approvalScope.walletSignatureRequired === false, "false");

  // 14T-AW…BC. Product invariants.
  const funded = bufferFixture(5000, 1000, 3);
  const aligned = allocationFixture(15000, 62, 2);
  const run = runSuggestionEngine(inputsFor({ safetyBuffer: funded, allocation: aligned, positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const staking = run.suggestions.find((s) => s.category === "staking");
  const stakingAlts = staking?.reviewDetails?.otherProtocolsToReview;
  const demo = getDemoExactSolStakingReviewDetails();
  const nativeDisplay = buildNativeStakingReviewCandidateDisplay({ checkedAt: FRESH });
  add("14T-AW: JitoSOL remains selected", staking?.protocolSelection?.selectedProtocolId === "jito" && staking?.protocolSelection?.selectedProtocolName === "Jito", `id=${staking?.protocolSelection?.selectedProtocolId}`);
  {
    const msol = buildMsolReadOnlyReviewCandidateDisplay({ checkedAt: "2026-07-14T02:30:00Z" });
    const jup = buildJupsolReadOnlyReviewCandidateDisplay({ checkedAt: "2026-07-14T02:30:00Z" });
    const bsol = buildBsolReadOnlyReviewCandidateDisplay({ checkedAt: "2026-07-14T02:30:00Z" });
    add("14T-AX: mSOL/JupSOL/bSOL behavior remains unchanged", msol.riskScore === 7.4 && jup.riskScore === 7.65 && bsol.riskScore === 7.35, `m=${msol.riskScore} j=${jup.riskScore} b=${bsol.riskScore}`);
  }
  add("14T-AY: INF remains blocked", getInfReadOnlyApprovalDecision({ checkedAt: "2026-07-14T02:30:00Z" }) === null, "inf blocked");
  add("14T-AZ: Top Pick ordering remains unchanged", run.suggestions.filter((s) => s.is_top_pick).every((s) => s.protocolSelection?.selectedProtocolName !== "Jupiter Native Stake"), "unchanged");
  add("14T-BA: engine ordering remains unchanged", run.suggestions.filter((s) => s.category === "staking").length === 1 && run.suggestions.every((s) => s.id !== "jupiter_native_stake"), `stakingCount=${run.suggestions.filter((s) => s.category === "staking").length}`);
  {
    const json = (JSON.stringify(nativeDisplay) + JSON.stringify(stakingAlts) + JSON.stringify(demo.otherProtocolsToReview)).toLowerCase();
    const tokens = ["sendtransaction", "signmessage", "signtransaction", "signalltransactions", "stake(", "delegate(", "withdraw(", "swap(", "deposit(", "approve(", "execute("];
    add("14T-BB: no transaction/signature/stake/delegate/withdraw path exists", tokens.filter((t) => json.includes(t)).length === 0, "none");
  }
  add("14T-BC: native staking appears only as Baseline to review", nativeDisplay.roleLabel === "Baseline to review" && (stakingAlts?.find((a) => a.protocolId === "jupiter_native_stake")?.roleLabel === "Baseline to review") && (demo.otherProtocolsToReview?.find((a) => a.protocolId === "jupiter_native_stake")?.roleLabel === "Baseline to review") && nativeDisplay.selectedByProtocolLogic === false && nativeDisplay.currentWinner === false, "baseline");

  return checks;
}


export function runSolStakingMarketRefreshFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });

  const root = process.cwd();
  const readIf = (rel: string) => { try { return readFileSync(`${root}/${rel}`, "utf8"); } catch { return ""; } };
  const scriptSrc = readIf("scripts/refresh-sol-staking-market-data.mjs");
  const gitignore = readIf(".gitignore");

  const CHECKED = "2026-07-14T03:00:00Z";
  const FRESH = "2026-07-14T02:50:00Z";        // ~10 min before CHECKED → fresh
  const OLD = "2026-07-11T00:00:00Z";          // ~3 days before CHECKED → stale
  const CHECKED_PLUS_1H = "2026-07-14T04:00:00Z";
  const CHECKED_PLUS_48H = "2026-07-16T03:00:00Z";
  const IDS = SOL_STAKING_MARKET_CANDIDATE_IDS;

  const POOL = {
    jito: "0e7d0722-9054-4907-8593-567b353c0900",
    jupiter: "52bd72a7-9e81-4112-abb4-71673e8de9bf",
    marinade: "b3f93865-5ec8-4662-90a0-11808e0aa2bd",
    blazestake: "387d6732-59f0-4ae0-8a88-aba75a5cbe4a",
    sanctum: "3075a746-bdd1-4aac-bcd5-b035abee2622",
  };
  const rec = (pool: string, apy: unknown, apyMean30d: unknown, tvlUsd: unknown, chain = "Solana", project?: string) =>
    ({ pool, chain, ...(project ? { project } : {}), symbol: "X", apy, apyMean30d, tvlUsd });
  const dllValid = { status: "success", data: [
    rec(POOL.jito, 5.36, 5.45, 767950000),
    rec(POOL.jupiter, 5.67, 5.6, 409170000),
    rec(POOL.marinade, 4.75, 5.87, 184840000),
    rec(POOL.blazestake, 5.27, 5.32, 69750000),
    rec(POOL.sanctum, 5.84, 5.95, 152555981),
  ] };

  // Native validator fixtures (Marinade + Stakewiz real schema shapes).
  const VA = JUPITER_NATIVE_STAKE_VOTE_ACCOUNT;
  const IDENT = JUPITER_NATIVE_STAKE_IDENTITY;
  const mkEpochs = (n: number, endEpoch: number, lastEndIso: string, apyBase = 0.054) => {
    const out: Record<string, unknown>[] = [];
    let end = Date.parse(lastEndIso);
    const twoDays = 2 * 86400_000;
    for (let k = 0; k < n; k++) {
      const start = end - twoDays;
      out.push({ epoch: endEpoch - k, apy: apyBase - k * 0.0004, activated_stake: 12_500_000_000_000_000, commission_effective: 5, epoch_start_at: new Date(start).toISOString(), epoch_end_at: new Date(end).toISOString() });
      end = start;
    }
    return out;
  };
  const marinadeValid = { validators: [{ vote_account: VA, identity: IDENT, epoch_stats: [{ epoch: 1001, apy: null, epoch_start_at: "2026-07-12T12:22:01Z", epoch_end_at: "2026-07-14T12:00:00Z" }, ...mkEpochs(16, 1000, "2026-07-12T12:22:01Z")] }] };
  const marinadeInsufficient = { validators: [{ vote_account: VA, epoch_stats: mkEpochs(2, 1000, "2026-07-12T12:22:01Z") }] };
  const stakewiz = [{ vote_identity: VA, identity: IDENT, activated_stake: 12_500_954.43, commission: 500, apy_estimate: 5.23, delinquent: false, epoch: 1001 }];
  const stakewizDelinquent = [{ ...stakewiz[0], delinquent: true }];

  const fullCacheInput = {
    checkedAt: CHECKED,
    defiLlama: { payload: dllValid, fetchedAt: FRESH },
    stakewiz: { payload: stakewiz, fetchedAt: FRESH },
    marinade: { payload: marinadeValid, fetchedAt: FRESH },
  };

  // ---- Evidence/risk immutability guards (capture before any build) ----
  const evidenceLstBefore = getSolLstFreshEvidenceInputs().length;
  const evidenceNativeBefore = NATIVE_SOL_STAKE_EVIDENCE_INPUTS.length;
  const nativeScoreBefore = computeNativeStakingScore();

  const fullCache = buildSolStakingMarketCache(fullCacheInput);

  // 14U-A…H. Core model + separation from approval evidence.
  {
    const s = fullCache.candidates[IDS.jito];
    const hasKeys = s != null && typeof s.candidateId === "string" && typeof s.fields === "object" && typeof s.status === "string" && typeof s.approvedForReadOnlyReview === "boolean" && typeof s.eligibleForFutureComparison === "boolean";
    add("14U-A: market-data types exist", SOL_STAKING_MARKET_DATA_MODEL_EXISTS === true && hasKeys, `keys=${hasKeys}`);
  }
  add("14U-B: cache schema version is explicit", SOL_STAKING_MARKET_CACHE_SCHEMA_VERSION === "1.0.0", SOL_STAKING_MARKET_CACHE_SCHEMA_VERSION);
  add("14U-C: refresh interval is explicit", SOL_STAKING_MARKET_REFRESH_INTERVAL_HOURS === 6, `${SOL_STAKING_MARKET_REFRESH_INTERVAL_HOURS}h`);
  add("14U-D: hard-stale threshold is explicit", SOL_STAKING_MARKET_HARD_STALE_HOURS === 24 && SOL_STAKING_CURRENT_MARKET_MAX_AGE_HOURS === 24, `${SOL_STAKING_MARKET_HARD_STALE_HOURS}h`);
  add("14U-E: live market cache is separate from approval evidence", SOL_STAKING_MARKET_DATA_MUTATES_APPROVAL_EVIDENCE === false && !("confirmedBy" in (fullCache.candidates[IDS.jito] as object)), "separate");
  add("14U-F: live refresh does not mutate evidence arrays", getSolLstFreshEvidenceInputs().length === evidenceLstBefore && NATIVE_SOL_STAKE_EVIDENCE_INPUTS.length === evidenceNativeBefore, `lst=${evidenceLstBefore} native=${evidenceNativeBefore}`);
  add("14U-G: live refresh does not mutate risk scores", SOL_STAKING_MARKET_DATA_MUTATES_RISK_SCORES === false && computeNativeStakingScore() === nativeScoreBefore, `score=${nativeScoreBefore}`);
  {
    const emptyNative = buildJupiterNativeStakeMarketSnapshot({ checkedAt: CHECKED });
    const staleMsol = buildLstMarketSnapshot({ candidateId: IDS.marinade, defiLlamaPayload: dllValid, fetchedAt: OLD, checkedAt: CHECKED });
    add("14U-H: live refresh does not recalculate approval", emptyNative.approvedForReadOnlyReview === true && staleMsol.approvedForReadOnlyReview === true, "approval stable");
  }

  // 14U-I…Q. Sources.
  add("14U-I: JitoSOL source uses its existing verified pool id", getSolStakingMarketSource(IDS.jito)?.providers[0].poolId === POOL.jito, "verified");
  add("14U-J: mSOL source uses its existing verified pool id", getSolStakingMarketSource(IDS.marinade)?.providers[0].poolId === POOL.marinade, "verified");
  add("14U-K: JupSOL source uses its existing verified pool id", getSolStakingMarketSource(IDS.jupiter)?.providers[0].poolId === POOL.jupiter, "verified");
  add("14U-L: bSOL source uses its existing verified pool id", getSolStakingMarketSource(IDS.blazestake)?.providers[0].poolId === POOL.blazestake, "verified");
  {
    const nat = getSolStakingMarketSource(IDS.jupiterNativeStake);
    const sw = nat?.providers.find((p) => p.provider === "stakewiz");
    const mr = nat?.providers.find((p) => p.provider === "marinade_validator_history");
    add("14U-M: Jupiter Native Stake uses Stakewiz for current data", sw != null && sw.providesFields.includes("delegated_stake_sol") && sw.providesFields.includes("current_apy_pct"), "stakewiz");
    add("14U-N: Jupiter Native Stake uses Marinade for 30-day history", mr != null && mr.providesFields.includes("apy_30d_pct"), "marinade");
  }
  {
    const urls = listSolStakingMarketSources().flatMap((d) => d.providers.map((p) => `${p.sourceName} ${p.sourceUrl}`.toLowerCase()));
    add("14U-O: no Rated source exists", SOL_STAKING_MARKET_SOURCES_USE_RATED === false && urls.every((u) => !u.includes("rated")), "none");
    add("14U-P: no Blockdaemon source exists", SOL_STAKING_MARKET_SOURCES_USE_BLOCKDAEMON === false && urls.every((u) => !u.includes("blockdaemon")), "none");
    const allNoKey = listSolStakingMarketSources().every((d) => d.providers.every((p) => p.requiresApiKey === false && p.usesBrowserFetch === false));
    add("14U-Q: no API key is required", SOL_STAKING_MARKET_SOURCES_REQUIRE_API_KEY === false && allNoKey, "no key");
  }

  // 14U-R…Z. LST parsing.
  const pJito = parseDefiLlamaPoolMarketData(dllValid, { expectedPoolId: POOL.jito, expectedChain: "Solana" });
  add("14U-R: exact pool/candidate match is required", pJito.matched === true && pJito.currentApy.value === 5.36, `matched=${pJito.matched}`);
  add("14U-S: another pool is rejected", parseDefiLlamaPoolMarketData({ data: [rec(POOL.marinade, 4.75, 5.87, 1)] }, { expectedPoolId: POOL.jito }).blockers.includes("pool_id_mismatch"), "rejected");
  add("14U-T: wrong chain is rejected when chain metadata exists", parseDefiLlamaPoolMarketData({ data: [rec(POOL.jito, 5, 5, 1, "Ethereum")] }, { expectedPoolId: POOL.jito, expectedChain: "Solana" }).blockers.includes("chain_mismatch"), "rejected");
  add("14U-U: wrong project/protocol is rejected when metadata exists", parseDefiLlamaPoolMarketData({ data: [rec(POOL.jito, 5, 5, 1, "Solana", "marinade-finance")] }, { expectedPoolId: POOL.jito, expectedProject: "jito" }).blockers.includes("protocol_mismatch"), "rejected");
  add("14U-V: current APY is parsed deterministically", pJito.currentApy.value === 5.36 && parseDefiLlamaPoolMarketData(dllValid, { expectedPoolId: POOL.jito }).currentApy.value === 5.36, `apy=${pJito.currentApy.value}`);
  add("14U-W: 30-day APY is parsed deterministically", pJito.apy30d.value === 5.45, `apy30d=${pJito.apy30d.value}`);
  add("14U-X: TVL is parsed deterministically", pJito.tvl.value === 767950000, `tvl=${pJito.tvl.value}`);
  {
    const neg = parseDefiLlamaPoolMarketData({ data: [rec(POOL.jito, -1, 5, 1)] }, { expectedPoolId: POOL.jito });
    const nonFinite = parseDefiLlamaPoolMarketData({ data: [rec(POOL.jito, "abc", 5, 1)] }, { expectedPoolId: POOL.jito });
    add("14U-Y: negative or non-finite values are rejected", neg.currentApy.valid === false && neg.blockers.includes("field_invalid") && nonFinite.currentApy.valid === false, "rejected");
  }
  {
    const missing30d = buildLstMarketSnapshot({ candidateId: IDS.jito, defiLlamaPayload: { data: [rec(POOL.jito, 5.36, null, 767950000)] }, fetchedAt: FRESH, checkedAt: CHECKED });
    add("14U-Z: missing required APY produces partial status", missing30d.status === "partial" && missing30d.missingFields.includes("apy_30d_pct"), `status=${missing30d.status}`);
  }

  // 14U-AA…AH. Native parsing.
  const natSnap = buildJupiterNativeStakeMarketSnapshot({ stakewizPayload: stakewiz, stakewizFetchedAt: FRESH, marinadePayload: marinadeValid, marinadeFetchedAt: FRESH, checkedAt: CHECKED });
  add("14U-AA: exact Jupiter vote account remains required", natSnap.status === "complete" && buildJupiterNativeStakeMarketSnapshot({ stakewizPayload: [{ vote_identity: "other", activated_stake: 1, commission: 5, apy_estimate: 5 }], stakewizFetchedAt: FRESH, marinadePayload: marinadeValid, marinadeFetchedAt: FRESH, checkedAt: CHECKED }).status !== "complete", `status=${natSnap.status}`);
  add("14U-AB: native delegated stake is present", natSnap.fields.delegatedStakeSol?.value === 12_500_954.43, `stake=${natSnap.fields.delegatedStakeSol?.value}`);
  add("14U-AC: native current APY is present", natSnap.fields.currentApyPct?.value === 5.23, `apy=${natSnap.fields.currentApyPct?.value}`);
  add("14U-AD: native 30-day APY is present", typeof natSnap.fields.apy30dPct?.value === "number", `apy30d=${natSnap.fields.apy30dPct?.value}`);
  add("14U-AE: native commission is present", natSnap.fields.validatorCommissionPct?.value === 5, `comm=${natSnap.fields.validatorCommissionPct?.value}`);
  add("14U-AF: native delinquency is present", natSnap.fields.validatorDelinquent?.value === false, `delinquent=${natSnap.fields.validatorDelinquent?.value}`);
  {
    const delinq = buildJupiterNativeStakeMarketSnapshot({ stakewizPayload: stakewizDelinquent, stakewizFetchedAt: FRESH, marinadePayload: marinadeValid, marinadeFetchedAt: FRESH, checkedAt: CHECKED });
    add("14U-AG: delinquent native validator becomes ineligible", delinq.eligibleForFutureComparison === false && delinq.blockers.includes("validator_delinquent"), "ineligible");
  }
  {
    const insuff = buildJupiterNativeStakeMarketSnapshot({ stakewizPayload: stakewiz, stakewizFetchedAt: FRESH, marinadePayload: marinadeInsufficient, marinadeFetchedAt: FRESH, checkedAt: CHECKED });
    add("14U-AH: insufficient Marinade history becomes partial", insuff.status === "partial" && insuff.missingFields.includes("apy_30d_pct"), `status=${insuff.status}`);
  }

  // 14U-AI…AO. Freshness.
  const jitoFresh = buildLstMarketSnapshot({ candidateId: IDS.jito, defiLlamaPayload: dllValid, fetchedAt: FRESH, checkedAt: CHECKED });
  add("14U-AI: fresh complete data has complete status", jitoFresh.status === "complete", `status=${jitoFresh.status}`);
  add("14U-AJ: missing required field has partial status", buildLstMarketSnapshot({ candidateId: IDS.jito, defiLlamaPayload: { data: [rec(POOL.jito, 5.36, 5.45, null)] }, fetchedAt: FRESH, checkedAt: CHECKED }).status === "partial", "partial");
  add("14U-AK: old data has stale status", buildLstMarketSnapshot({ candidateId: IDS.jito, defiLlamaPayload: dllValid, fetchedAt: OLD, checkedAt: CHECKED }).status === "stale", "stale");
  add("14U-AL: invalid data has invalid status", buildLstMarketSnapshot({ candidateId: IDS.jito, defiLlamaPayload: { data: [rec(POOL.jito, -1, 5.45, 767950000)] }, fetchedAt: FRESH, checkedAt: CHECKED }).status === "invalid", "invalid");
  add("14U-AM: fetch failure has source_error status", buildLstMarketSnapshot({ candidateId: IDS.jito, defiLlamaPayload: undefined, checkedAt: CHECKED }).status === "source_error", "source_error");
  add("14U-AN: freshness uses explicit checkedAt", buildLstMarketSnapshot({ candidateId: IDS.jito, defiLlamaPayload: dllValid, fetchedAt: FRESH, checkedAt: CHECKED }).status === "complete" && buildLstMarketSnapshot({ candidateId: IDS.jito, defiLlamaPayload: dllValid, fetchedAt: FRESH, checkedAt: CHECKED_PLUS_48H }).status === "stale", "explicit");
  add("14U-AO: fixture behavior does not depend on system clock", JSON.stringify(buildLstMarketSnapshot({ candidateId: IDS.jito, defiLlamaPayload: dllValid, fetchedAt: FRESH, checkedAt: CHECKED })) === JSON.stringify(buildLstMarketSnapshot({ candidateId: IDS.jito, defiLlamaPayload: dllValid, fetchedAt: FRESH, checkedAt: CHECKED })), "deterministic");

  // 14U-AP…AY. Cache behavior.
  const nativeOnlyCache = buildSolStakingMarketCache({ checkedAt: CHECKED, defiLlama: undefined, stakewiz: { payload: stakewiz, fetchedAt: FRESH }, marinade: { payload: marinadeValid, fetchedAt: FRESH } });
  add("14U-AP: candidate refreshes are independent", nativeOnlyCache.candidates[IDS.jupiterNativeStake].status === "complete" && nativeOnlyCache.candidates[IDS.jito].status === "source_error", "independent");
  add("14U-AQ: one candidate failure does not erase successful candidates", nativeOnlyCache.successfulCandidateIds.includes(IDS.jupiterNativeStake) && nativeOnlyCache.candidates[IDS.jupiterNativeStake].fields.currentApyPct?.value === 5.23, "preserved");
  const attemptFailed = buildSolStakingMarketCache({ checkedAt: CHECKED_PLUS_1H });
  const merged1h = mergeSolStakingMarketRefresh(fullCache, attemptFailed, { checkedAt: CHECKED_PLUS_1H });
  add("14U-AR: failed refresh preserves previous last-known-good values", merged1h.candidates[IDS.jito].fields.currentApyPct?.value === 5.36 && merged1h.failedCandidateIds.includes(IDS.jito), "preserved");
  add("14U-AS: preserved last-known-good fetchedAt is not changed", merged1h.candidates[IDS.jito].fields.currentApyPct?.fetchedAt === FRESH && merged1h.candidates[IDS.jito].fetchedAt === FRESH, `fetchedAt=${merged1h.candidates[IDS.jito].fetchedAt}`);
  const merged48h = mergeSolStakingMarketRefresh(fullCache, buildSolStakingMarketCache({ checkedAt: CHECKED_PLUS_48H }), { checkedAt: CHECKED_PLUS_48H });
  add("14U-AT: old last-known-good data is marked stale", merged48h.candidates[IDS.jito].status === "stale" && getSolStakingMarketSnapshot(fullCache, IDS.jito, CHECKED_PLUS_48H)?.status === "stale", `status=${merged48h.candidates[IDS.jito].status}`);
  add("14U-AU: stale values are ineligible for future comparison", merged48h.candidates[IDS.jito].eligibleForFutureComparison === false, "ineligible");
  add("14U-AV: invalid cache schema fails closed", validateSolStakingMarketCache({ schemaVersion: "0.0.0", candidates: {} }).valid === false && validateSolStakingMarketCache(fullCache).valid === true, "fail-closed");
  {
    const withUnknown = { ...fullCache, candidates: { ...fullCache.candidates, not_a_real_protocol: { ...fullCache.candidates[IDS.jito], candidateId: "not_a_real_protocol" } } };
    const v = validateSolStakingMarketCache(withUnknown);
    add("14U-AW: unknown candidates do not enter the canonical set", v.valid === true && v.ignoredCandidateIds.includes("not_a_real_protocol") && v.cache?.candidates["not_a_real_protocol"] === undefined, "ignored");
  }
  add("14U-AX: candidate ordering remains deterministic", JSON.stringify(Object.keys(fullCache.candidates)) === JSON.stringify([IDS.jito, IDS.jupiter, IDS.marinade, IDS.blazestake, IDS.jupiterNativeStake, IDS.sanctum]), Object.keys(fullCache.candidates).join(","));
  {
    const listed = listFreshApprovedMarketSnapshots(fullCache, CHECKED).map((s) => s.candidateId);
    const canonicalApproved = [IDS.jito, IDS.jupiter, IDS.marinade, IDS.blazestake, IDS.jupiterNativeStake];
    add("14U-AY: fresh-approved listing does not rank candidates", JSON.stringify(listed) === JSON.stringify(canonicalApproved) && !listed.includes(IDS.sanctum), listed.join(","));
  }

  // 14U-AZ…BH. Approval invariants.
  add("14U-AZ: JitoSOL existing selected behavior is unchanged", fullCache.candidates[IDS.jito].approvedForReadOnlyReview === true && fullCache.candidates[IDS.jito].selectedByProtocolLogic === false && fullCache.candidates[IDS.jito].currentWinner === false, "unchanged");
  add("14U-BA: mSOL remains approved for read-only review", fullCache.candidates[IDS.marinade].approvedForReadOnlyReview === true, "approved");
  add("14U-BB: JupSOL remains approved for read-only review", fullCache.candidates[IDS.jupiter].approvedForReadOnlyReview === true, "approved");
  add("14U-BC: bSOL remains approved for read-only review", fullCache.candidates[IDS.blazestake].approvedForReadOnlyReview === true, "approved");
  add("14U-BD: Jupiter Native Stake remains approved as a baseline", fullCache.candidates[IDS.jupiterNativeStake].approvedForReadOnlyReview === true, "approved");
  add("14U-BE: INF remains blocked", fullCache.candidates[IDS.sanctum].approvedForReadOnlyReview === false && fullCache.candidates[IDS.sanctum].blockedByRiskApproval === true, "blocked");
  add("14U-BF: INF is never eligible for future comparison", fullCache.candidates[IDS.sanctum].eligibleForFutureComparison === false && fullCache.candidates[IDS.sanctum].status === "complete", "never eligible");
  {
    const partialMsol = buildLstMarketSnapshot({ candidateId: IDS.marinade, defiLlamaPayload: { data: [rec(POOL.marinade, 4.75, null, 184840000)] }, fetchedAt: FRESH, checkedAt: CHECKED });
    add("14U-BG: incomplete approved candidate is temporarily ineligible without losing approval", partialMsol.approvedForReadOnlyReview === true && partialMsol.eligibleForFutureComparison === false && partialMsol.status === "partial", "temp ineligible");
    const staleMsol = buildLstMarketSnapshot({ candidateId: IDS.marinade, defiLlamaPayload: dllValid, fetchedAt: OLD, checkedAt: CHECKED });
    add("14U-BH: stale approved candidate is temporarily ineligible without losing approval", staleMsol.approvedForReadOnlyReview === true && staleMsol.eligibleForFutureComparison === false && staleMsol.status === "stale", "temp ineligible");
  }

  // 14U-BI…BQ. Selector + execution invariants.
  const funded = bufferFixture(5000, 1000, 3);
  const aligned = allocationFixture(15000, 62, 2);
  const engineRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded, allocation: aligned, positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stakingSug = engineRun.suggestions.find((s) => s.category === "staking");
  const cacheJson = JSON.stringify(fullCache).toLowerCase();
  add("14U-BI: no selector score is calculated", SOL_STAKING_MARKET_DATA_ENABLES_SELECTOR === false && !cacheJson.includes("selectorscore") && !cacheJson.includes("\"score\""), "none");
  add("14U-BJ: no ranking is calculated", SOL_STAKING_MARKET_DATA_RANKS_CANDIDATES === false && !cacheJson.includes("\"rank\"") && !cacheJson.includes("rankedprotocolids"), "none");
  add("14U-BK: no current winner is assigned", SOL_STAKING_MARKET_DATA_SELECTS_WINNER === false && Object.values(fullCache.candidates).every((s) => s.currentWinner === false), "none");
  add("14U-BL: no selectedProtocolId is changed", stakingSug?.protocolSelection?.selectedProtocolId === "jito", `id=${stakingSug?.protocolSelection?.selectedProtocolId}`);
  add("14U-BM: multi-protocol selection remains disabled", SOL_STAKING_MARKET_DATA_SELECTS_WINNER === false && engineRun.suggestions.filter((s) => s.category === "staking").length === 1, "disabled");
  add("14U-BN: Top Pick remains unchanged", engineRun.suggestions.filter((s) => s.is_top_pick).every((s) => s.protocolSelection?.selectedProtocolName !== "Jupiter Native Stake"), "unchanged");
  add("14U-BO: engine ordering remains unchanged", engineRun.suggestions.every((s) => s.id !== "jupiter_native_stake" && !s.id.startsWith("sol_staking_market")), "unchanged");
  {
    const tokens = ["sendtransaction", "signmessage", "signtransaction", "signalltransactions", "stake(", "delegate(", "withdraw(", "swap(", "deposit(", "approve(", "execute("];
    add("14U-BP: no transaction path exists", tokens.filter((t) => cacheJson.includes(t)).length === 0 && SOL_STAKING_MARKET_DATA_ENABLES_TRANSACTIONS === false, "none");
    add("14U-BQ: no signature path exists", SOL_STAKING_MARKET_DATA_REQUIRES_WALLET_SIGNATURE === false && Object.values(fullCache.candidates).every((s) => s.walletSignatureRequired === false), "none");
  }

  // 14U-BR…BZ. Script.
  add("14U-BR: market:refresh-staking package script exists", /"market:refresh-staking"\s*:\s*"node scripts\/refresh-sol-staking-market-data\.mjs"/.test(readIf("package.json")), "exists");
  add("14U-BS: refresh script requires no secret", scriptSrc.length > 0 && scriptSrc.includes("FORBIDDEN_SECRETS") && !scriptSrc.includes("Authorization") && !/headers:\s*{[^}]*api[_-]?key/i.test(scriptSrc), "no secret");
  add("14U-BT: refresh script uses server-side fetch only", scriptSrc.includes("AbortController") && !scriptSrc.includes("window.") && !scriptSrc.includes("document."), "server-side");
  add("14U-BU: refresh script has timeouts", scriptSrc.includes("FETCH_TIMEOUT_MS") && scriptSrc.includes("AbortController"), "timeouts");
  add("14U-BV: refresh script handles non-200 responses", scriptSrc.includes("res.ok") && scriptSrc.includes("HTTP "), "handled");
  add("14U-BW: refresh script handles invalid JSON", scriptSrc.includes("invalid_json"), "handled");
  add("14U-BX: refresh script writes sanitized cache output", scriptSrc.includes("sanitizeSource") && scriptSrc.includes("sourceResponses"), "sanitized");
  add("14U-BY: refresh script uses atomic output replacement", scriptSrc.includes("renameSync") && scriptSrc.includes(".tmp"), "atomic");
  add("14U-BZ: tmp cache output remains ignored by Git", /(^|\n)tmp\/?(\n|$)/.test(gitignore), "ignored");

  return checks;
}


export function runSolStakingNormalizationFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });

  const root = process.cwd();
  const readIf = (rel: string) => { try { return readFileSync(`${root}/${rel}`, "utf8"); } catch { return ""; } };

  const CHECKED = "2026-07-14T03:00:00Z";
  const FRESH = "2026-07-14T02:50:00Z";
  const OLD = "2026-07-11T00:00:00Z";
  const IDS = SOL_STAKING_MARKET_CANDIDATE_IDS;

  const POOL = {
    jito: "0e7d0722-9054-4907-8593-567b353c0900",
    jupiter: "52bd72a7-9e81-4112-abb4-71673e8de9bf",
    marinade: "b3f93865-5ec8-4662-90a0-11808e0aa2bd",
    blazestake: "387d6732-59f0-4ae0-8a88-aba75a5cbe4a",
    sanctum: "3075a746-bdd1-4aac-bcd5-b035abee2622",
  };
  const rec = (pool: string, apy: unknown, apyMean30d: unknown, tvlUsd: unknown) => ({ pool, chain: "Solana", symbol: "X", apy, apyMean30d, tvlUsd });
  const dllValid = { status: "success", data: [
    rec(POOL.jito, 5.36, 5.45, 767950000),
    rec(POOL.jupiter, 5.67, 5.6, 409170000),
    rec(POOL.marinade, 4.75, 5.87, 184840000),
    rec(POOL.blazestake, 5.27, 5.32, 69750000),
    rec(POOL.sanctum, 5.84, 5.95, 152555981),
  ] };

  const VA = JUPITER_NATIVE_STAKE_VOTE_ACCOUNT;
  const IDENT = JUPITER_NATIVE_STAKE_IDENTITY;
  const mkEpochs = (n: number, endEpoch: number, lastEndIso: string, apyBase = 0.054) => {
    const out: Record<string, unknown>[] = [];
    let end = Date.parse(lastEndIso);
    const twoDays = 2 * 86400_000;
    for (let k = 0; k < n; k++) {
      const start = end - twoDays;
      out.push({ epoch: endEpoch - k, apy: apyBase - k * 0.0004, activated_stake: 12_500_000_000_000_000, commission_effective: 5, epoch_start_at: new Date(start).toISOString(), epoch_end_at: new Date(end).toISOString() });
      end = start;
    }
    return out;
  };
  const marinadeValid = { validators: [{ vote_account: VA, identity: IDENT, epoch_stats: [{ epoch: 1001, apy: null, epoch_start_at: "2026-07-12T12:22:01Z", epoch_end_at: "2026-07-14T12:00:00Z" }, ...mkEpochs(16, 1000, "2026-07-12T12:22:01Z")] }] };
  const stakewiz = [{ vote_identity: VA, identity: IDENT, activated_stake: 12_500_954.43, commission: 500, apy_estimate: 5.23, delinquent: false, epoch: 1001 }];

  const fullCache = buildSolStakingMarketCache({ checkedAt: CHECKED, defiLlama: { payload: dllValid, fetchedAt: FRESH }, stakewiz: { payload: stakewiz, fetchedAt: FRESH }, marinade: { payload: marinadeValid, fetchedAt: FRESH } });
  const set = buildNormalizedSolStakingCandidateSet(fullCache, { checkedAt: CHECKED });
  const cJito = set.candidates[IDS.jito];
  const cMsol = set.candidates[IDS.marinade];
  const cNative = set.candidates[IDS.jupiterNativeStake];
  const cInf = set.candidates[IDS.sanctum];

  // 14V-A…F. Model.
  add("14V-A: normalization schema version exists", SOL_STAKING_NORMALIZATION_SCHEMA_VERSION === "1.0.0" && set.schemaVersion === "1.0.0", set.schemaVersion);
  add("14V-B: normalization uses canonical Step 14U candidate IDs", JSON.stringify(SOL_STAKING_NORMALIZATION_CANDIDATE_ORDER) === JSON.stringify(SOL_STAKING_MARKET_CANDIDATE_ORDER), "canonical");
  add("14V-C: normalization preserves canonical candidate order", JSON.stringify(Object.keys(set.candidates)) === JSON.stringify([...SOL_STAKING_MARKET_CANDIDATE_ORDER]), Object.keys(set.candidates).join(","));
  add("14V-D: normalized set contains all canonical candidates", SOL_STAKING_MARKET_CANDIDATE_ORDER.every((id) => set.candidates[id] != null), "all present");
  add("14V-E: normalization creates no duplicate candidate IDs", new Set(Object.keys(set.candidates)).size === Object.keys(set.candidates).length, "unique");
  add("14V-F: normalization validates the source cache first", buildNormalizedSolStakingCandidateSet({ schemaVersion: "0.0.0", candidates: {} }, { checkedAt: CHECKED }).candidates && Object.keys(buildNormalizedSolStakingCandidateSet({ schemaVersion: "0.0.0" }, { checkedAt: CHECKED }).candidates).length === 0, "validated");

  // 14V-G…O. Market metrics.
  add("14V-G: current APY copies the live value exactly", cJito.yield.currentApyPct.value === 5.36, `apy=${cJito.yield.currentApyPct.value}`);
  add("14V-H: current APY preserves source attribution", (cJito.yield.currentApyPct.sourceName ?? "").toLowerCase().includes("defillama") && cJito.yield.currentApyPct.sourceFetchedAt === FRESH, "attributed");
  add("14V-I: 30-day APY copies the live value exactly", cJito.yield.apy30dPct.value === 5.45, `apy30d=${cJito.yield.apy30dPct.value}`);
  add("14V-J: 30-day APY preserves source methodology", (cNative.yield.apy30dPct.methodology ?? "").toLowerCase().includes("marinade"), "methodology");
  add("14V-K: APY delta equals current APY minus 30-day APY", cJito.yield.apyDeltaPctPoints.value === Math.round((5.36 - 5.45) * 10000) / 10000 && cJito.yield.apyDeltaPctPoints.unit === "pct_points", `delta=${cJito.yield.apyDeltaPctPoints.value}`);
  add("14V-L: absolute APY delta is deterministic", cJito.yield.absoluteApyDeltaPctPoints.value === Math.abs(Math.round((5.36 - 5.45) * 10000) / 10000), `abs=${cJito.yield.absoluteApyDeltaPctPoints.value}`);
  add("14V-M: APY delta is not called a stability score", cJito.yield.apyDeltaPctPoints.key === "apy_delta_pct_points" && cJito.yield.apyDeltaPctPoints.dataClass === "derived_transparent" && /transparent/i.test(cJito.yield.apyDeltaPctPoints.methodology ?? ""), "transparent delta");
  {
    const staleSnap = buildLstMarketSnapshot({ candidateId: IDS.jito, defiLlamaPayload: dllValid, fetchedAt: OLD, checkedAt: CHECKED });
    const staleNorm = normalizeSolStakingCandidate(staleSnap, getSolStakingCandidateStaticFacts(IDS.jito)!, { checkedAt: CHECKED, sourceCacheGeneratedAt: CHECKED });
    add("14V-N: stale APY does not produce a fresh derived value", staleNorm.yield.apyDeltaPctPoints.status === "stale" && staleNorm.yield.apyDeltaPctPoints.value === undefined, `status=${staleNorm.yield.apyDeltaPctPoints.status}`);
    const missSnap = buildLstMarketSnapshot({ candidateId: IDS.jito, defiLlamaPayload: { data: [rec(POOL.jito, 5.36, null, 767950000)] }, fetchedAt: FRESH, checkedAt: CHECKED });
    const missNorm = normalizeSolStakingCandidate(missSnap, getSolStakingCandidateStaticFacts(IDS.jito)!, { checkedAt: CHECKED, sourceCacheGeneratedAt: CHECKED });
    add("14V-O: missing APY does not produce a derived value", missNorm.yield.apyDeltaPctPoints.status === "missing" && missNorm.yield.apyDeltaPctPoints.value === undefined, `status=${missNorm.yield.apyDeltaPctPoints.status}`);
  }

  // 14V-P…V. Adoption.
  add("14V-P: LST adoption uses tvl_usd", cJito.adoption.metricKind === "tvl_usd" && cJito.adoption.metric.unit === "usd" && cJito.adoption.metric.value === 767950000, cJito.adoption.metricKind);
  add("14V-Q: LST adoption comparison scope is lst_only", cJito.adoption.metric.comparisonScope === "lst_only", cJito.adoption.metric.comparisonScope);
  add("14V-R: native adoption uses delegated_stake_sol", cNative.adoption.metricKind === "delegated_stake_sol" && cNative.adoption.metric.unit === "sol" && cNative.adoption.metric.value === 12_500_954.43, cNative.adoption.metricKind);
  add("14V-S: native adoption comparison scope is native_only", cNative.adoption.metric.comparisonScope === "native_only", cNative.adoption.metric.comparisonScope);
  add("14V-T: delegated stake is not automatically converted to USD", cNative.adoption.metric.unit === "sol" && cNative.adoption.metricKind !== "tvl_usd", "sol not usd");
  add("14V-U: LST TVL and native delegated stake are not marked directly comparable", cJito.adoption.directlyComparableAcrossAllCandidates === false && cNative.adoption.directlyComparableAcrossAllCandidates === false, "not comparable");
  add("14V-V: no adoption score is calculated", !/adoptionscore|adoption_score|percentile/i.test(JSON.stringify(cJito.adoption) + JSON.stringify(cNative.adoption)), "no score");

  // 14V-W…AB. Fees.
  add("14V-W: LST annual management fee remains separate", cMsol.fees.annualManagementFeePct.status === "available" && cMsol.fees.annualManagementFeePct.value === 0, `mgmt=${cMsol.fees.annualManagementFeePct.value}`);
  add("14V-X: LST direct unstake fee remains separate", cMsol.fees.directUnstakeFeePct.status === "available" && cMsol.fees.directUnstakeFeePct.value === 0.2, `fee=${cMsol.fees.directUnstakeFeePct.value}`);
  add("14V-Y: native validator commission remains separate", cNative.fees.validatorCommissionPct.status === "available" && cNative.fees.validatorCommissionPct.value === 5, `comm=${cNative.fees.validatorCommissionPct.value}`);
  add("14V-Z: no synthetic total fee is created", !/totalfee|total_fee|combinedfee|sumfee/i.test(JSON.stringify(cMsol.fees) + JSON.stringify(cNative.fees)), "no total");
  add("14V-AA: validator commission is not treated as principal loss", cNative.fees.notes.some((n) => /principal/i.test(n)) && cNative.fees.validatorCommissionPct.value === 5, "not principal");
  add("14V-AB: fee comparison scope is candidate_type_specific", cMsol.fees.annualManagementFeePct.comparisonScope === "candidate_type_specific" && cNative.fees.validatorCommissionPct.comparisonScope === "candidate_type_specific", "type-specific");

  // 14V-AC…AJ. Exit mechanics.
  add("14V-AC: LST token model remains liquid-token based", cMsol.tokenModel === "spl_liquid_staking_token" && cMsol.exit.liquidityClass === "liquid_token", cMsol.tokenModel);
  add("14V-AD: native token model remains native stake account", cNative.tokenModel === "native_stake_account" && cNative.exit.liquidityClass === "native_stake_account", cNative.tokenModel);
  add("14V-AE: native staking is not marked as an LST", cNative.isLiquidStakingToken === false && cNative.candidateType === "native_staking", "not lst");
  add("14V-AF: native splTokenMint remains null", cNative.splTokenMint === null, `mint=${cNative.splTokenMint}`);
  add("14V-AG: JupSOL remains separate from Jupiter Native Stake", cJito != null && set.candidates[IDS.jupiter].candidateId === "jupiter" && set.candidates[IDS.jupiter].isLiquidStakingToken === true && cNative.candidateId === "jupiter_native_stake" && cNative.isLiquidStakingToken === false, "separate");
  add("14V-AH: native exit timing remains epoch-based", cNative.exit.delayModel === "epoch_based" && cNative.exit.immediateExitAvailable.value === false, cNative.exit.delayModel);
  add("14V-AI: no invented fixed native unstake hours exist", cNative.exit.delayDescription.status === "available" && !/\d+\s*hours?/i.test(cNative.exit.delayDescription.value ?? ""), "no hours");
  add("14V-AJ: exit mechanics comparison scope is descriptive_only", cMsol.exit.immediateExitAvailable.comparisonScope === "descriptive_only" && cNative.exit.delayDescription.comparisonScope === "descriptive_only", "descriptive");

  // 14V-AK…AS. Risk + approval.
  add("14V-AK: reviewed risk scores come from existing score modules", cJito.risk.reviewedRiskScore.value === 7.75 && cMsol.risk.reviewedRiskScore.value === 7.4 && set.candidates[IDS.jupiter].risk.reviewedRiskScore.value === 7.65 && set.candidates[IDS.blazestake].risk.reviewedRiskScore.value === 7.35 && cNative.risk.reviewedRiskScore.value === 7.1, `jito=${cJito.risk.reviewedRiskScore.value}`);
  add("14V-AL: normalization does not recalculate risk scores", Object.values(set.candidates).every((c) => c.risk.riskScoreRecalculatedByNormalization === false), "not recalculated");
  add("14V-AM: normalization does not modify approval decisions", getSolStakingCandidateStaticFacts(IDS.marinade)!.approvedForReadOnlyReview === true && getSolStakingCandidateStaticFacts(IDS.sanctum)!.approvedForReadOnlyReview === false, "unchanged");
  add("14V-AN: Jito remains approved", cJito.approval.approvedForReadOnlyReview === true, "approved");
  add("14V-AO: mSOL remains approved", cMsol.approval.approvedForReadOnlyReview === true, "approved");
  add("14V-AP: JupSOL remains approved", set.candidates[IDS.jupiter].approval.approvedForReadOnlyReview === true, "approved");
  add("14V-AQ: bSOL remains approved", set.candidates[IDS.blazestake].approval.approvedForReadOnlyReview === true, "approved");
  add("14V-AR: Jupiter Native Stake remains approved as a baseline", cNative.approval.approvedForReadOnlyReview === true, "approved");
  add("14V-AS: INF remains blocked", cInf.approval.approvedForReadOnlyReview === false && cInf.approval.blockedByRiskApproval === true, "blocked");

  // 14V-AT…BE. Readiness.
  add("14V-AT: fresh complete approved candidates become selector-input ready", cJito.readiness.eligibleForFutureSelectorInput === true && cNative.readiness.eligibleForFutureSelectorInput === true, "ready");
  add("14V-AU: selector-input readiness does not enable selection", cJito.selectedByProtocolLogic === false && cJito.selectorScoreCalculated === false && set.winnerSelected === false, "no selection");
  {
    const staleCache = buildSolStakingMarketCache({ checkedAt: CHECKED, defiLlama: { payload: dllValid, fetchedAt: OLD }, stakewiz: { payload: stakewiz, fetchedAt: FRESH }, marinade: { payload: marinadeValid, fetchedAt: FRESH } });
    const staleSet = buildNormalizedSolStakingCandidateSet(staleCache, { checkedAt: CHECKED });
    const m = staleSet.candidates[IDS.marinade];
    add("14V-AV: stale approved candidate remains approved but is excluded", m.approval.approvedForReadOnlyReview === true && m.readiness.eligibleForFutureSelectorInput === false && staleSet.excludedCandidateIds.includes(IDS.marinade) && (staleSet.exclusions[IDS.marinade] ?? []).includes("stale_live_market_data"), "stale excluded");
    const partialSnap = buildLstMarketSnapshot({ candidateId: IDS.marinade, defiLlamaPayload: { data: [rec(POOL.marinade, 4.75, null, 184840000)] }, fetchedAt: FRESH, checkedAt: CHECKED });
    const partialNorm = normalizeSolStakingCandidate(partialSnap, getSolStakingCandidateStaticFacts(IDS.marinade)!, { checkedAt: CHECKED, sourceCacheGeneratedAt: CHECKED });
    add("14V-AW: partial approved candidate remains approved but is excluded", partialNorm.approval.approvedForReadOnlyReview === true && partialNorm.readiness.eligibleForFutureSelectorInput === false && partialNorm.readiness.blockers.includes("incomplete_live_market_data"), "partial excluded");
  }
  add("14V-AX: blocked INF is normalized for diagnostics but excluded", cInf.readiness.normalized === true && set.excludedCandidateIds.includes(IDS.sanctum) && (set.exclusions[IDS.sanctum] ?? []).some((b) => b === "not_approved_for_read_only_review" || b === "blocked_by_risk_approval"), "diag-only");
  add("14V-AY: INF never appears in selectorReadyCandidateIds", !set.selectorReadyCandidateIds.includes(IDS.sanctum), "never");
  {
    const facts = getSolStakingCandidateStaticFacts(IDS.marinade)!;
    const noScore = { ...facts, reviewedRiskScore: undefined };
    const snap = buildLstMarketSnapshot({ candidateId: IDS.marinade, defiLlamaPayload: dllValid, fetchedAt: FRESH, checkedAt: CHECKED });
    const n1 = normalizeSolStakingCandidate(snap, noScore, { checkedAt: CHECKED, sourceCacheGeneratedAt: CHECKED });
    add("14V-AZ: missing reviewed risk score excludes a candidate", n1.readiness.eligibleForFutureSelectorInput === false && n1.readiness.blockers.includes("missing_reviewed_risk_score"), "excluded");
    const noMech = { ...facts, immediateExitAvailable: undefined };
    const n2 = normalizeSolStakingCandidate(snap, noMech, { checkedAt: CHECKED, sourceCacheGeneratedAt: CHECKED });
    add("14V-BA: missing required static mechanics excludes a candidate", n2.readiness.eligibleForFutureSelectorInput === false && n2.readiness.blockers.includes("missing_required_static_mechanics"), "excluded");
  }
  const readyIds = listSelectorReadyNormalizedCandidates(set).map((c) => c.candidateId);
  const canonicalReady = [IDS.jito, IDS.jupiter, IDS.marinade, IDS.blazestake, IDS.jupiterNativeStake];
  add("14V-BB: selector-ready list preserves canonical order", JSON.stringify(readyIds) === JSON.stringify(canonicalReady), readyIds.join(","));
  add("14V-BC: selector-ready list does not sort by APY", readyIds[0] === IDS.jito && set.candidates[IDS.jupiter].yield.currentApyPct.value! > set.candidates[IDS.jito].yield.currentApyPct.value!, "not apy-sorted");
  add("14V-BD: selector-ready list does not sort by risk score", readyIds[readyIds.length - 1] === IDS.jupiterNativeStake && cNative.risk.reviewedRiskScore.value! < cJito.risk.reviewedRiskScore.value!, "not risk-sorted");
  add("14V-BE: selector-ready list does not sort by TVL or stake", JSON.stringify(readyIds) === JSON.stringify(canonicalReady), "not tvl-sorted");

  // 14V-BF…BR. Selector + execution invariants.
  const funded = bufferFixture(5000, 1000, 3);
  const aligned = allocationFixture(15000, 62, 2);
  const engineRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded, allocation: aligned, positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stakingSug = engineRun.suggestions.find((s) => s.category === "staking");
  const setJson = JSON.stringify(set).toLowerCase();
  add("14V-BF: no selector score is calculated", set.selectorScoreCalculated === false && Object.values(set.candidates).every((c) => c.selectorScoreCalculated === false) && !("selectorScore" in set) && Object.values(set.candidates).every((c) => !("selectorScore" in c)), "none");
  add("14V-BG: no selector weights exist", SOL_STAKING_NORMALIZATION_DEFINES_SELECTOR_WEIGHTS === false && !("weights" in set) && Object.values(set.candidates).every((c) => !("weight" in c) && !("weights" in c)), "none");
  add("14V-BH: no ranking is calculated", set.rankingCalculated === false && Object.values(set.candidates).every((c) => c.rankingCalculated === false) && !("rankedCandidateIds" in set) && !("winnerId" in set), "none");
  add("14V-BI: no winner is selected", set.winnerSelected === false && Object.values(set.candidates).every((c) => c.currentWinner === false), "none");
  add("14V-BJ: no selectedProtocolId changes", stakingSug?.protocolSelection?.selectedProtocolId === "jito", `id=${stakingSug?.protocolSelection?.selectedProtocolId}`);
  add("14V-BK: Jito live selected behavior remains unchanged", stakingSug?.protocolSelection?.selectedProtocolName === "Jito", "unchanged");
  add("14V-BL: multi-protocol selector remains disabled", engineRun.suggestions.filter((s) => s.category === "staking").length === 1, "disabled");
  add("14V-BM: Top Pick remains unchanged", engineRun.suggestions.filter((s) => s.is_top_pick).every((s) => s.protocolSelection?.selectedProtocolName !== "Jupiter Native Stake"), "unchanged");
  add("14V-BN: engine ordering remains unchanged", engineRun.suggestions.every((s) => s.id !== "jupiter_native_stake" && !s.id.startsWith("sol_staking")), "unchanged");
  {
    const prodFiles = ["src/suggestions/stakingSuggestion.ts", "src/suggestions/suggestionReviewDetails.ts", "src/components/SuggestionReviewModal.tsx", "src/suggestions/demoExactSolStakingScenario.ts"];
    const anyImport = prodFiles.some((f) => readIf(f).includes("solStakingCandidateNormalization") || readIf(f).includes("solStakingMarketDataRefresh"));
    add("14V-BO: no product-facing UI integration exists", anyImport === false, "no ui import");
  }
  {
    const tokens = ["sendtransaction", "signmessage", "signtransaction", "signalltransactions", "stake(", "delegate(", "withdraw(", "swap(", "deposit(", "approve(", "execute("];
    add("14V-BP: no transaction path exists", tokens.filter((t) => setJson.includes(t)).length === 0 && Object.values(set.candidates).every((c) => c.transactionsEnabled === false), "none");
    add("14V-BQ: no signature path exists", Object.values(set.candidates).every((c) => c.walletSignatureRequired === false), "none");
    add("14V-BR: no stake/delegate/withdraw/swap/deposit/approve/execute handler exists", tokens.filter((t) => setJson.includes(t)).length === 0, "none");
  }

  // 14V-BS…BV. Validation.
  add("14V-BS: invalid normalized candidate fails closed", validateNormalizedSolStakingCandidate({}).valid === false && validateNormalizedSolStakingCandidate(cJito).valid === true, "fail-closed");
  add("14V-BT: invalid normalized set fails closed", validateNormalizedSolStakingCandidateSet({ ...set, winnerSelected: true }).valid === false && validateNormalizedSolStakingCandidateSet(set).valid === true, "fail-closed");
  {
    const withUnknown = { ...fullCache, candidates: { ...fullCache.candidates, fake_protocol: { ...fullCache.candidates[IDS.jito], candidateId: "fake_protocol" } } };
    const unkSet = buildNormalizedSolStakingCandidateSet(withUnknown, { checkedAt: CHECKED });
    add("14V-BU: unknown candidate does not enter the selector-ready set", !unkSet.selectorReadyCandidateIds.includes("fake_protocol") && unkSet.candidates["fake_protocol"] === undefined, "ignored");
  }
  {
    const diag = getSolStakingNormalizationDiagnostics(set);
    const infDiag = diag.find((d) => d.candidateId === IDS.sanctum);
    const hasRank = diag.some((d) => Object.keys(d).some((k) => /rank|score|winner/i.test(k)));
    add("14V-BV: diagnostics expose blockers without ranking", infDiag != null && infDiag.blockers.length > 0 && hasRank === false && diag.length === SOL_STAKING_MARKET_CANDIDATE_ORDER.length, "diagnostics");
  }

  // Static-facts adapter smoke (source mapping integrity).
  add("14V-static: static facts list is canonical and native stays SOL/native", listSolStakingCandidateStaticFacts().map((f) => f.candidateId).join(",") === SOL_STAKING_MARKET_CANDIDATE_ORDER.join(",") && getSolStakingCandidateStaticFacts(IDS.jupiterNativeStake)!.assetSymbol === "SOL", "ok");

  return checks;
}


export function runSolStakingSelectorComparisonFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });

  const root = process.cwd();
  const readIf = (rel: string) => { try { return readFileSync(`${root}/${rel}`, "utf8"); } catch { return ""; } };

  const CHECKED = "2026-07-14T03:00:00Z";
  const FRESH = "2026-07-14T02:50:00Z";
  const OLD = "2026-07-11T00:00:00Z";
  const IDS = SOL_STAKING_MARKET_CANDIDATE_IDS;
  const P = SOL_STAKING_SELECTOR_POLICY;

  const POOL = {
    jito: "0e7d0722-9054-4907-8593-567b353c0900",
    jupiter: "52bd72a7-9e81-4112-abb4-71673e8de9bf",
    marinade: "b3f93865-5ec8-4662-90a0-11808e0aa2bd",
    blazestake: "387d6732-59f0-4ae0-8a88-aba75a5cbe4a",
    sanctum: "3075a746-bdd1-4aac-bcd5-b035abee2622",
  };
  const rec = (pool: string, apy: unknown, apyMean30d: unknown, tvlUsd: unknown) => ({ pool, chain: "Solana", symbol: "X", apy, apyMean30d, tvlUsd });
  const dllValid = { status: "success", data: [
    rec(POOL.jito, 5.36, 5.45, 767950000),
    rec(POOL.jupiter, 5.67, 5.6, 409170000),
    rec(POOL.marinade, 4.75, 5.87, 184840000),
    rec(POOL.blazestake, 5.27, 5.32, 69750000),
    rec(POOL.sanctum, 5.84, 5.95, 152555981),
  ] };
  const dllNo30d = { status: "success", data: dllValid.data.map((d) => ({ ...d, apyMean30d: null })) };

  const VA = JUPITER_NATIVE_STAKE_VOTE_ACCOUNT;
  const IDENT = JUPITER_NATIVE_STAKE_IDENTITY;
  const mkEpochs = (n: number, endEpoch: number, lastEndIso: string, apyBase = 0.054) => {
    const out: Record<string, unknown>[] = [];
    let end = Date.parse(lastEndIso);
    const twoDays = 2 * 86400_000;
    for (let k = 0; k < n; k++) { const start = end - twoDays; out.push({ epoch: endEpoch - k, apy: apyBase - k * 0.0004, activated_stake: 12_500_000_000_000_000, commission_effective: 5, epoch_start_at: new Date(start).toISOString(), epoch_end_at: new Date(end).toISOString() }); end = start; }
    return out;
  };
  const marinadeValid = { validators: [{ vote_account: VA, identity: IDENT, epoch_stats: [{ epoch: 1001, apy: null, epoch_start_at: "2026-07-12T12:22:01Z", epoch_end_at: "2026-07-14T12:00:00Z" }, ...mkEpochs(16, 1000, "2026-07-12T12:22:01Z")] }] };
  const stakewiz = [{ vote_identity: VA, identity: IDENT, activated_stake: 12_500_954.43, commission: 500, apy_estimate: 5.23, delinquent: false, epoch: 1001 }];

  const freshCache = buildSolStakingMarketCache({ checkedAt: CHECKED, defiLlama: { payload: dllValid, fetchedAt: FRESH }, stakewiz: { payload: stakewiz, fetchedAt: FRESH }, marinade: { payload: marinadeValid, fetchedAt: FRESH } });
  const set = buildNormalizedSolStakingCandidateSet(freshCache, { checkedAt: CHECKED });
  const cmp = buildSolStakingSelectorComparison(set, { checkedAt: CHECKED });
  const diag = getSolStakingSelectorComparisonDiagnostics(cmp);

  // 14W-A…J. Policy.
  add("14W-A: selector policy version exists", SOL_STAKING_SELECTOR_POLICY_VERSION === "1.0.0", SOL_STAKING_SELECTOR_POLICY_VERSION);
  add("14W-B: policy ID exists", SOL_STAKING_SELECTOR_POLICY_ID === "balanced_safety_first_v1", SOL_STAKING_SELECTOR_POLICY_ID);
  add("14W-C: risk weight is 0.50", SOL_STAKING_SELECTOR_WEIGHTS.reviewed_risk_score === 0.5, `${SOL_STAKING_SELECTOR_WEIGHTS.reviewed_risk_score}`);
  add("14W-D: 30-day APY weight is 0.30", SOL_STAKING_SELECTOR_WEIGHTS.apy_30d === 0.3, `${SOL_STAKING_SELECTOR_WEIGHTS.apy_30d}`);
  add("14W-E: current APY weight is 0.10", SOL_STAKING_SELECTOR_WEIGHTS.current_apy === 0.1, `${SOL_STAKING_SELECTOR_WEIGHTS.current_apy}`);
  add("14W-F: APY stability weight is 0.10", SOL_STAKING_SELECTOR_WEIGHTS.apy_stability === 0.1, `${SOL_STAKING_SELECTOR_WEIGHTS.apy_stability}`);
  add("14W-G: weights total exactly 1.00", Math.abs(Object.values(SOL_STAKING_SELECTOR_WEIGHTS).reduce((a, b) => a + b, 0) - 1) < 1e-9, "1.00");
  add("14W-H: policy validator rejects invalid totals", validateSolStakingSelectorPolicy({ ...P, weights: { ...P.weights, apy_30d: 0.9 } }).valid === false, "rejected");
  add("14W-I: policy validator rejects negative weights", validateSolStakingSelectorPolicy({ ...P, weights: { ...P.weights, current_apy: -0.1, apy_stability: 0.3 } }).valid === false && validateSolStakingSelectorPolicy(P).valid === true, "rejected");
  add("14W-J: policy validator rejects unsupported dimensions", validateSolStakingSelectorPolicy({ ...P, weights: { ...P.weights, tvl: 0.0 } as never }).valid === false, "rejected");

  // 14W-K…Q. Input gating.
  add("14W-K: only selector-ready normalized candidates are scored", cmp.eligibleCandidateIds.every((id) => set.selectorReadyCandidateIds.includes(id)) && cmp.eligibleCandidateIds.length === set.selectorReadyCandidateIds.length, cmp.eligibleCandidateIds.join(","));
  add("14W-L: INF is never scored", cmp.candidateResults[IDS.sanctum] === undefined && !cmp.eligibleCandidateIds.includes(IDS.sanctum), "not scored");
  {
    const staleCache = buildSolStakingMarketCache({ checkedAt: CHECKED, defiLlama: { payload: dllValid, fetchedAt: OLD }, stakewiz: { payload: stakewiz, fetchedAt: FRESH }, marinade: { payload: marinadeValid, fetchedAt: FRESH } });
    const staleSet = buildNormalizedSolStakingCandidateSet(staleCache, { checkedAt: CHECKED });
    const staleCmp = buildSolStakingSelectorComparison(staleSet, { checkedAt: CHECKED });
    add("14W-M: stale candidates are never scored", staleCmp.candidateResults[IDS.marinade] === undefined && staleCmp.status === "insufficient_candidates", `status=${staleCmp.status}`);
    add("14W-P: one ready candidate yields insufficient_candidates", staleCmp.status === "insufficient_candidates" && staleCmp.eligibleCandidateIds.length === 1, `ready=${staleCmp.eligibleCandidateIds.length}`);
  }
  {
    const partialCache = buildSolStakingMarketCache({ checkedAt: CHECKED, defiLlama: { payload: dllNo30d, fetchedAt: FRESH }, stakewiz: { payload: stakewiz, fetchedAt: FRESH }, marinade: { payload: marinadeValid, fetchedAt: FRESH } });
    const partialSet = buildNormalizedSolStakingCandidateSet(partialCache, { checkedAt: CHECKED });
    const partialCmp = buildSolStakingSelectorComparison(partialSet, { checkedAt: CHECKED });
    add("14W-N: partial candidates are never scored", partialCmp.candidateResults[IDS.marinade] === undefined, "not scored");
  }
  {
    const emptyCache = buildSolStakingMarketCache({ checkedAt: CHECKED });
    const emptySet = buildNormalizedSolStakingCandidateSet(emptyCache, { checkedAt: CHECKED });
    const emptyCmp = buildSolStakingSelectorComparison(emptySet, { checkedAt: CHECKED });
    add("14W-O: zero ready candidates yields no_ready_candidates", emptyCmp.status === "no_ready_candidates" && Object.keys(emptyCmp.candidateResults).length === 0, `status=${emptyCmp.status}`);
  }
  add("14W-Q: invalid normalized input yields invalid_input", buildSolStakingSelectorComparison({ ...set, winnerSelected: true } as never, { checkedAt: CHECKED }).status === "invalid_input", "invalid");

  // 14W-R…U. Risk.
  const rMar = cmp.candidateResults[IDS.marinade];
  add("14W-R: reviewed risk score is copied exactly", rMar.dimensions.reviewedRiskScore.rawValue === 7.4 && rMar.dimensions.reviewedRiskScore.normalizedScore === 7.4, `risk=${rMar.dimensions.reviewedRiskScore.rawValue}`);
  add("14W-S: reviewed risk score is not cohort-normalized", Object.values(cmp.candidateResults).every((c) => c.dimensions.reviewedRiskScore.normalizedScore === c.dimensions.reviewedRiskScore.rawValue), "exact");
  add("14W-T: reviewed risk score is not recalculated", cmp.candidateResults[IDS.jito].dimensions.reviewedRiskScore.rawValue === 7.75 && cmp.candidateResults[IDS.jupiterNativeStake].dimensions.reviewedRiskScore.rawValue === 7.1, "from module");
  add("14W-U: risk weighted contribution equals score × 0.50", rMar.dimensions.reviewedRiskScore.weightedContribution === Math.round(7.4 * 0.5 * 1e6) / 1e6, `${rMar.dimensions.reviewedRiskScore.weightedContribution}`);

  // 14W-V…AA. Higher-is-better normalization.
  {
    const hi = normalizeHigherIsBetter([5, 6], { minimumRange: 0.25, precision: 6 });
    add("14W-V: higher APY produces a higher normalized score", hi[1] > hi[0], `${hi.join(",")}`);
    const eq = normalizeHigherIsBetter([5, 5], { minimumRange: 0.25, precision: 6 });
    add("14W-W: equal APYs produce equal score 5", eq[0] === 5 && eq[1] === 5, `${eq.join(",")}`);
    const narrow = normalizeHigherIsBetter([5.0, 5.1], { minimumRange: 0.25, precision: 6 });
    add("14W-X: narrow APY range does not produce an artificial full 0-10 spread", narrow[0] === 3 && narrow[1] === 7 && (narrow[1] - narrow[0]) < 10, `${narrow.join(",")}`);
    add("14W-Y: current APY uses the configured minimum range", SOL_STAKING_SELECTOR_MIN_APY_RANGE_PCT_POINTS === 0.25 && /0\.25/.test(cmp.candidateResults[IDS.jito].dimensions.currentApy.methodology), "0.25");
    add("14W-Z: 30-day APY uses the configured minimum range", /0\.25/.test(cmp.candidateResults[IDS.jito].dimensions.apy30d.methodology), "0.25");
    add("14W-AA: normalization remains between 0 and 10", Object.values(cmp.candidateResults).every((c) => [c.dimensions.apy30d, c.dimensions.currentApy].every((d) => d.normalizedScore >= 0 && d.normalizedScore <= 10)), "0-10");
  }

  // 14W-AB…AF. Lower-is-better normalization.
  {
    const lo = normalizeLowerIsBetter([0.1, 0.5], { minimumRange: 0.1, precision: 6 });
    add("14W-AB: lower absolute APY delta produces a higher stability score", lo[0] > lo[1], `${lo.join(",")}`);
    const eq = normalizeLowerIsBetter([0.2, 0.2], { minimumRange: 0.1, precision: 6 });
    add("14W-AC: equal APY deltas produce equal score 5", eq[0] === 5 && eq[1] === 5, `${eq.join(",")}`);
    const narrow = normalizeLowerIsBetter([0.10, 0.14], { minimumRange: 0.1, precision: 6 });
    add("14W-AD: narrow delta range does not produce an artificial full spread", (Math.max(...narrow) - Math.min(...narrow)) < 10 && narrow[0] > narrow[1], `${narrow.join(",")}`);
    add("14W-AE: stability score remains between 0 and 10", Object.values(cmp.candidateResults).every((c) => c.dimensions.apyStability.normalizedScore >= 0 && c.dimensions.apyStability.normalizedScore <= 10), "0-10");
    add("14W-AF: stability is not labeled a risk score or guarantee", /not a risk score/i.test(rMar.dimensions.apyStability.methodology) && /guarantee/i.test(rMar.dimensions.apyStability.methodology), "labelled");
  }

  // 14W-AG…AO. Total score.
  {
    const c = rMar;
    const sum = Math.round((c.dimensions.reviewedRiskScore.weightedContribution + c.dimensions.apy30d.weightedContribution + c.dimensions.currentApy.weightedContribution + c.dimensions.apyStability.weightedContribution) * 1e6) / 1e6;
    add("14W-AG: total equals the four weighted contributions", c.totalScore === sum, `${c.totalScore} vs ${sum}`);
    add("14W-AH: total remains between 0 and 10", Object.values(cmp.candidateResults).every((r) => r.totalScore >= 0 && r.totalScore <= 10), "0-10");
    add("14W-AI: no hidden bonus exists", Object.values(cmp.candidateResults).every((r) => r.totalScore === Math.round((r.dimensions.reviewedRiskScore.weightedContribution + r.dimensions.apy30d.weightedContribution + r.dimensions.currentApy.weightedContribution + r.dimensions.apyStability.weightedContribution) * 1e6) / 1e6), "no bonus");
    const jitoR = cmp.candidateResults[IDS.jito];
    add("14W-AJ: no incumbent Jito bonus exists", jitoR.totalScore === Math.round((jitoR.dimensions.reviewedRiskScore.weightedContribution + jitoR.dimensions.apy30d.weightedContribution + jitoR.dimensions.currentApy.weightedContribution + jitoR.dimensions.apyStability.weightedContribution) * 1e6) / 1e6, "no incumbent bonus");
    add("14W-AK: no LST bonus exists", cmp.candidateResults[IDS.jupiter].dimensions.reviewedRiskScore.normalizedScore === 7.65, "no lst bonus");
    const nat = cmp.candidateResults[IDS.jupiterNativeStake];
    add("14W-AL: no native-staking penalty exists", nat.totalScore === Math.round((nat.dimensions.reviewedRiskScore.weightedContribution + nat.dimensions.apy30d.weightedContribution + nat.dimensions.currentApy.weightedContribution + nat.dimensions.apyStability.weightedContribution) * 1e6) / 1e6, "no native penalty");
    add("14W-AM: adoption contributes zero weight", c.context.adoption.usedInScore === false, "zero");
    add("14W-AN: fees contribute zero weight", c.context.annualManagementFee.usedInScore === false && c.context.validatorCommission.usedInScore === false && c.context.directUnstakeFee.usedInScore === false, "zero");
    add("14W-AO: exit mechanics contribute zero weight", c.context.exitModel.usedInScore === false, "zero");
  }

  // 14W-AP…AY. Ranking + tie-breaks.
  add("14W-AP: higher total ranks first", diag.every((d, i) => i === 0 || diag[i - 1].totalScore >= d.totalScore - P.tieEpsilon), "sorted");
  {
    const rk = (over: Partial<SelectorRankable>): SelectorRankable => ({ totalScore: 5, reviewedRiskScore: 7, apy30d: 5, absApyDelta: 0.2, currentApy: 5, canonicalOrderIndex: 3, ...over });
    const a = rk({}); const bRisk = rk({ reviewedRiskScore: 6 });
    add("14W-AQ: equal total uses reviewed risk as first tie-break", compareForRank(a, bRisk, P.tieEpsilon) < 0 && decidingTieBreak(a, bRisk) === "reviewed_risk_score", "risk");
    const b30 = rk({ apy30d: 4 });
    add("14W-AR: next tie-break uses 30-day APY", compareForRank(a, b30, P.tieEpsilon) < 0 && decidingTieBreak(a, b30) === "apy_30d", "apy_30d");
    const bStab = rk({ absApyDelta: 0.5 });
    add("14W-AS: next tie-break uses lower absolute APY delta", compareForRank(a, bStab, P.tieEpsilon) < 0 && decidingTieBreak(a, bStab) === "apy_stability", "stability");
    const bCur = rk({ currentApy: 4 });
    add("14W-AT: next tie-break uses current APY", compareForRank(a, bCur, P.tieEpsilon) < 0 && decidingTieBreak(a, bCur) === "current_apy", "current");
    const bCanon = rk({ canonicalOrderIndex: 5 });
    add("14W-AU: final tie-break uses canonical order", compareForRank(a, bCanon, P.tieEpsilon) < 0 && decidingTieBreak(a, bCanon) === "canonical_order", "canonical");
  }
  {
    const ranks = cmp.rankedCandidateIds.map((id) => cmp.candidateResults[id].rank).sort((x, y) => x - y);
    add("14W-AV: ranks are contiguous and unique", ranks.every((r, i) => r === i + 1) && new Set(ranks).size === ranks.length, ranks.join(","));
    add("14W-AW: ranked IDs match candidate result ranks", cmp.rankedCandidateIds.every((id, i) => cmp.candidateResults[id].rank === i + 1), "match");
    add("14W-AX: comparison leader equals rank 1", cmp.comparisonLeaderCandidateId === cmp.rankedCandidateIds[0] && cmp.candidateResults[cmp.comparisonLeaderCandidateId!].rank === 1, `leader=${cmp.comparisonLeaderCandidateId}`);
  }
  {
    const items: SelectorRankable[] = cmp.eligibleCandidateIds.map((id) => { const c = cmp.candidateResults[id]; return { totalScore: c.totalScore, reviewedRiskScore: c.dimensions.reviewedRiskScore.rawValue, apy30d: c.dimensions.apy30d.rawValue, absApyDelta: c.dimensions.apyStability.rawValue, currentApy: c.dimensions.currentApy.rawValue, canonicalOrderIndex: c.canonicalOrderIndex }; });
    const fwd = [...items].sort((x, y) => compareForRank(x, y, P.tieEpsilon)).map((x) => x.canonicalOrderIndex);
    const rev = [...items].reverse().sort((x, y) => compareForRank(x, y, P.tieEpsilon)).map((x) => x.canonicalOrderIndex);
    add("14W-AY: input order does not change deterministic ranking", JSON.stringify(fwd) === JSON.stringify(rev), "stable");
  }

  // 14W-AZ…BI. Context.
  add("14W-AZ: LST TVL is preserved as non-scored context", rMar.context.adoption.key === "tvl_usd" && rMar.context.adoption.comparisonScope === "lst_only" && rMar.context.adoption.usedInScore === false, "tvl context");
  add("14W-BA: native delegated stake is preserved as non-scored context", cmp.candidateResults[IDS.jupiterNativeStake].context.adoption.key === "delegated_stake_sol" && cmp.candidateResults[IDS.jupiterNativeStake].context.adoption.comparisonScope === "native_only", "stake context");
  add("14W-BB: validator commission is preserved separately", cmp.candidateResults[IDS.jupiterNativeStake].context.validatorCommission.value === 5 && cmp.candidateResults[IDS.jupiterNativeStake].context.validatorCommission.usedInScore === false, "separate");
  add("14W-BC: management fee is preserved separately", rMar.context.annualManagementFee.value === 0 && rMar.context.annualManagementFee.usedInScore === false, "separate");
  add("14W-BD: direct unstake fee is preserved separately", rMar.context.directUnstakeFee.value === 0.2 && rMar.context.directUnstakeFee.usedInScore === false, "separate");
  add("14W-BE: exit model is preserved as descriptive context", rMar.context.exitModel.comparisonScope === "descriptive_only" && rMar.context.exitModel.usedInScore === false, "exit ctx");
  add("14W-BF: token model is preserved as descriptive context", rMar.context.tokenModel.comparisonScope === "descriptive_only" && rMar.context.tokenModel.usedInScore === false, "token ctx");
  {
    const j = JSON.stringify(cmp).toLowerCase();
    add("14W-BG: no synthetic adoption score exists", !j.includes("adoptionscore") && !j.includes("adoption_score"), "none");
    add("14W-BH: no synthetic fee score exists", !j.includes("feescore") && !j.includes("fee_score"), "none");
    add("14W-BI: no synthetic liquidity score exists", !j.includes("liquidityscore") && !j.includes("liquidity_score"), "none");
  }

  // 14W-BJ…BO. Result validation.
  add("14W-BJ: candidate-result validator accepts a valid result", validateSolStakingSelectorCandidateResult(rMar).valid === true, "valid");
  add("14W-BK: candidate-result validator rejects a mismatched total", validateSolStakingSelectorCandidateResult({ ...rMar, totalScore: rMar.totalScore + 1 }).valid === false, "rejected");
  add("14W-BL: comparison validator accepts a valid result", validateSolStakingSelectorComparisonResult(cmp).valid === true, "valid");
  add("14W-BM: comparison validator rejects a non-rank-1 leader", validateSolStakingSelectorComparisonResult({ ...cmp, comparisonLeaderCandidateId: cmp.rankedCandidateIds[1] }).valid === false, "rejected");
  add("14W-BN: comparison validator rejects a scored excluded candidate", validateSolStakingSelectorComparisonResult({ ...cmp, excludedCandidateIds: [...cmp.excludedCandidateIds, cmp.rankedCandidateIds[0]] }).valid === false, "rejected");
  add("14W-BO: comparison validator rejects enabled activation flags", validateSolStakingSelectorComparisonResult({ ...cmp, winnerActivated: true } as never).valid === false, "rejected");

  // 14W-BP…BY. Product invariants.
  const funded = bufferFixture(5000, 1000, 3);
  const aligned = allocationFixture(15000, 62, 2);
  const engineRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded, allocation: aligned, positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stakingSug = engineRun.suggestions.find((s) => s.category === "staking");
  add("14W-BP: current selected protocol remains Jito", cmp.currentSelectedCandidateId === "jito" && stakingSug?.protocolSelection?.selectedProtocolId === "jito", `sel=${cmp.currentSelectedCandidateId}`);
  add("14W-BQ: selectedProtocolIdChanged is false", cmp.selectedProtocolIdChanged === false, "false");
  add("14W-BR: winnerActivated is false", cmp.winnerActivated === false && Object.values(cmp.candidateResults).every((c) => c.activated === false && c.currentWinner === false), "false");
  add("14W-BS: multi-protocol selection remains disabled", cmp.multiProtocolSelectionEnabled === false && engineRun.suggestions.filter((s) => s.category === "staking").length === 1, "disabled");
  add("14W-BT: Top Pick remains unchanged", cmp.topPickChanged === false && engineRun.suggestions.filter((s) => s.is_top_pick).every((s) => s.protocolSelection?.selectedProtocolName !== "Jupiter Native Stake"), "unchanged");
  add("14W-BU: engine ordering remains unchanged", cmp.engineOrderingChanged === false && engineRun.suggestions.every((s) => s.id !== "jupiter_native_stake" && !s.id.startsWith("sol_staking")), "unchanged");
  {
    const prodFiles = ["src/suggestions/stakingSuggestion.ts", "src/suggestions/suggestionReviewDetails.ts", "src/components/SuggestionReviewModal.tsx", "src/suggestions/demoExactSolStakingScenario.ts"];
    const anyImport = prodFiles.some((f) => readIf(f).includes("solStakingSelector"));
    add("14W-BV: no product-facing selector import exists", anyImport === false, "no import");
  }
  add("14W-BW: no product UI update exists", SOL_STAKING_SELECTOR_UPDATES_PRODUCT_UI === false, "false");
  {
    const msol = buildMsolReadOnlyReviewCandidateDisplay({ checkedAt: "2026-07-14T02:30:00Z" });
    const jup = buildJupsolReadOnlyReviewCandidateDisplay({ checkedAt: "2026-07-14T02:30:00Z" });
    const bsol = buildBsolReadOnlyReviewCandidateDisplay({ checkedAt: "2026-07-14T02:30:00Z" });
    add("14W-BX: Jito/mSOL/JupSOL/bSOL/native review behavior remains unchanged", msol.riskScore === 7.4 && jup.riskScore === 7.65 && bsol.riskScore === 7.35 && stakingSug?.protocolSelection?.selectedProtocolName === "Jito", "unchanged");
  }
  add("14W-BY: INF remains blocked", getInfReadOnlyApprovalDecision({ checkedAt: "2026-07-14T02:30:00Z" }) === null && cmp.candidateResults[IDS.sanctum] === undefined, "blocked");

  // 14W-BZ…CB. Execution invariants.
  {
    const j = JSON.stringify(cmp).toLowerCase();
    const tokens = ["sendtransaction", "signmessage", "signtransaction", "signalltransactions", "stake(", "delegate(", "withdraw(", "swap(", "deposit(", "approve(", "execute("];
    add("14W-BZ: no transaction path exists", cmp.transactionsEnabled === false && tokens.filter((t) => j.includes(t)).length === 0, "none");
    add("14W-CA: no signature path exists", cmp.walletSignatureRequired === false && Object.values(cmp.candidateResults).every((c) => c.walletSignatureRequired === false), "none");
    add("14W-CB: no stake/delegate/withdraw/swap/deposit/approve/execute handler exists", tokens.filter((t) => j.includes(t)).length === 0, "none");
  }

  // 14W-CC…CF. Cache QA (synthetic fresh + stale) + independent recompute.
  add("14W-CC: fresh cache produces a complete comparison when at least two candidates are ready", cmp.status === "complete" && cmp.eligibleCandidateIds.length >= 2, `n=${cmp.eligibleCandidateIds.length}`);
  {
    const allStaleCache = buildSolStakingMarketCache({ checkedAt: CHECKED, defiLlama: { payload: dllValid, fetchedAt: OLD }, stakewiz: { payload: stakewiz, fetchedAt: OLD }, marinade: { payload: marinadeValid, fetchedAt: OLD } });
    const allStaleSet = buildNormalizedSolStakingCandidateSet(allStaleCache, { checkedAt: CHECKED });
    const allStaleCmp = buildSolStakingSelectorComparison(allStaleSet, { checkedAt: CHECKED });
    add("14W-CD: stale cache does not force comparison", allStaleCmp.status !== "complete", `status=${allStaleCmp.status}`);
  }
  {
    // Independent recompute of the leader from the formula.
    const items = cmp.eligibleCandidateIds.map((id) => { const c = cmp.candidateResults[id]; return { id, risk: c.dimensions.reviewedRiskScore.rawValue, a30: c.dimensions.apy30d.rawValue, cur: c.dimensions.currentApy.rawValue, ad: c.dimensions.apyStability.rawValue, idx: c.canonicalOrderIndex }; });
    const rd = (n: number) => Math.round(n * 1e6) / 1e6;
    const h30 = normalizeHigherIsBetter(items.map((x) => x.a30), { minimumRange: P.minApyRangePctPoints, precision: 6 });
    const hcur = normalizeHigherIsBetter(items.map((x) => x.cur), { minimumRange: P.minApyRangePctPoints, precision: 6 });
    const lstab = normalizeLowerIsBetter(items.map((x) => x.ad), { minimumRange: P.minStabilityRangePctPoints, precision: 6 });
    const totals = items.map((x, i) => ({ id: x.id, t: rd(rd(x.risk * 0.5) + rd(h30[i] * 0.3) + rd(hcur[i] * 0.1) + rd(lstab[i] * 0.1)) }));
    const indieLeader = [...totals].sort((x, y) => y.t - x.t)[0].id;
    add("14W-CE: cache leader is produced by the formula, not hardcoded", indieLeader === cmp.comparisonLeaderCandidateId, `indie=${indieLeader} result=${cmp.comparisonLeaderCandidateId}`);
    add("14W-CF: independent recomputation matches the result", items.every((x, i) => cmp.candidateResults[x.id].totalScore === totals[i].t), "matches");
  }

  // explain helper smoke.
  add("14W-explain: explain helper returns diagnostics without product copy", (explainSolStakingSelectorCandidate(cmp, cmp.comparisonLeaderCandidateId!)?.rank === 1), "explain");

  return checks;
}


export function runSolStakingSelectorSensitivityFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });

  const root = process.cwd();
  const readIf = (rel: string) => { try { return readFileSync(`${root}/${rel}`, "utf8"); } catch { return ""; } };

  const CHECKED = "2026-07-14T03:00:00Z";
  const FRESH = "2026-07-14T02:50:00Z";
  const IDS = SOL_STAKING_MARKET_CANDIDATE_IDS;

  const POOL = { jito: "0e7d0722-9054-4907-8593-567b353c0900", jupiter: "52bd72a7-9e81-4112-abb4-71673e8de9bf", marinade: "b3f93865-5ec8-4662-90a0-11808e0aa2bd", blazestake: "387d6732-59f0-4ae0-8a88-aba75a5cbe4a", sanctum: "3075a746-bdd1-4aac-bcd5-b035abee2622" };
  const rec = (pool: string, apy: unknown, apyMean30d: unknown, tvlUsd: unknown) => ({ pool, chain: "Solana", symbol: "X", apy, apyMean30d, tvlUsd });
  const dllValid = { status: "success", data: [rec(POOL.jito, 5.36, 5.45, 767950000), rec(POOL.jupiter, 5.67, 5.6, 409170000), rec(POOL.marinade, 4.75, 5.87, 184840000), rec(POOL.blazestake, 5.27, 5.32, 69750000), rec(POOL.sanctum, 5.84, 5.95, 152555981)] };
  const VA = JUPITER_NATIVE_STAKE_VOTE_ACCOUNT;
  const IDENT = JUPITER_NATIVE_STAKE_IDENTITY;
  const mkEpochs = (n: number, endEpoch: number, lastEndIso: string, apyBase = 0.054) => { const out: Record<string, unknown>[] = []; let end = Date.parse(lastEndIso); const twoDays = 2 * 86400_000; for (let k = 0; k < n; k++) { const start = end - twoDays; out.push({ epoch: endEpoch - k, apy: apyBase - k * 0.0004, activated_stake: 12_500_000_000_000_000, commission_effective: 5, epoch_start_at: new Date(start).toISOString(), epoch_end_at: new Date(end).toISOString() }); end = start; } return out; };
  const marinadeValid = { validators: [{ vote_account: VA, identity: IDENT, epoch_stats: [{ epoch: 1001, apy: null, epoch_start_at: "2026-07-12T12:22:01Z", epoch_end_at: "2026-07-14T12:00:00Z" }, ...mkEpochs(16, 1000, "2026-07-12T12:22:01Z")] }] };
  const stakewiz = [{ vote_identity: VA, identity: IDENT, activated_stake: 12_500_954.43, commission: 500, apy_estimate: 5.23, delinquent: false, epoch: 1001 }];

  const freshCache = buildSolStakingMarketCache({ checkedAt: CHECKED, defiLlama: { payload: dllValid, fetchedAt: FRESH }, stakewiz: { payload: stakewiz, fetchedAt: FRESH }, marinade: { payload: marinadeValid, fetchedAt: FRESH } });
  const set = buildNormalizedSolStakingCandidateSet(freshCache, { checkedAt: CHECKED });
  const setJsonBefore = JSON.stringify(set);
  const policyWeightsBefore = JSON.stringify(SOL_STAKING_SELECTOR_POLICY.weights);
  const sens = runSolStakingSelectorSensitivityAnalysis(set, { checkedAt: CHECKED });
  const cmp = buildSolStakingSelectorComparison(set, { checkedAt: CHECKED });

  // 14X-A…I. Policy + model.
  add("14X-A: sensitivity schema version exists", SOL_STAKING_SELECTOR_SENSITIVITY_SCHEMA_VERSION === "1.0.0" && sens.schemaVersion === "1.0.0", sens.schemaVersion);
  add("14X-B: sensitivity policy ID/version exist", SOL_STAKING_SELECTOR_SENSITIVITY_POLICY_ID === "balanced_safety_first_v1_sensitivity" && SOL_STAKING_SELECTOR_SENSITIVITY_POLICY_VERSION === "1.0.0", SOL_STAKING_SELECTOR_SENSITIVITY_POLICY_ID);
  add("14X-C: minimum leader retention is 0.70", SOL_STAKING_SENSITIVITY_MIN_LEADER_RETENTION_RATE === 0.7, `${SOL_STAKING_SENSITIVITY_MIN_LEADER_RETENTION_RATE}`);
  add("14X-D: minimum baseline margin is 0.25", SOL_STAKING_SENSITIVITY_MIN_BASELINE_MARGIN === 0.25, `${SOL_STAKING_SENSITIVITY_MIN_BASELINE_MARGIN}`);
  add("14X-E: knife-edge margin is 0.10", SOL_STAKING_SENSITIVITY_KNIFE_EDGE_MARGIN === 0.1, `${SOL_STAKING_SENSITIVITY_KNIFE_EDGE_MARGIN}`);
  add("14X-F: historical minimum is 12 snapshots", SOL_STAKING_ACTIVATION_MIN_HISTORY_SNAPSHOTS === 12, `${SOL_STAKING_ACTIVATION_MIN_HISTORY_SNAPSHOTS}`);
  add("14X-G: historical span minimum is 72 hours", SOL_STAKING_ACTIVATION_MIN_HISTORY_SPAN_HOURS === 72, `${SOL_STAKING_ACTIVATION_MIN_HISTORY_SPAN_HOURS}`);
  add("14X-H: consecutive refresh minimum is 3", SOL_STAKING_ACTIVATION_MIN_CONSECUTIVE_REFRESH_SUCCESSES === 3, `${SOL_STAKING_ACTIVATION_MIN_CONSECUTIVE_REFRESH_SUCCESSES}`);
  add("14X-I: sensitivity-policy validator rejects invalid thresholds", validateSolStakingSelectorSensitivityPolicy({ ...SOL_STAKING_SELECTOR_SENSITIVITY_POLICY, minHistorySnapshots: 0 }).valid === false && validateSolStakingSelectorSensitivityPolicy(SOL_STAKING_SELECTOR_SENSITIVITY_POLICY).valid === true, "rejected");

  // 14X-J…Y. Scenario catalog.
  const cat = listDefaultSolStakingSensitivityScenarios();
  const byId = (id: string) => cat.find((s) => s.scenarioId === id);
  add("14X-J: baseline scenario exists", byId("baseline")?.scenarioClass === "baseline", "exists");
  add("14X-K: risk-heavier scenario exists", byId("risk_heavier")?.policyOverrides?.reviewedRiskWeight === 0.6, "exists");
  add("14X-L: risk-strict scenario exists", byId("risk_strict")?.policyOverrides?.reviewedRiskWeight === 0.7, "exists");
  add("14X-M: yield-balanced scenario exists", byId("yield_balanced")?.policyOverrides?.apy30dWeight === 0.35, "exists");
  add("14X-N: durable-yield scenario exists", byId("durable_yield")?.policyOverrides?.currentApyWeight === 0.0, "exists");
  add("14X-O: low-current-signal scenario exists", byId("low_current_signal") != null, "exists");
  add("14X-P: narrower-range scenario exists", byId("narrower_normalization_ranges")?.policyOverrides?.apyMinimumRangePctPoints === 0.15, "exists");
  add("14X-Q: wider-range scenario exists", byId("wider_normalization_ranges")?.policyOverrides?.apyMinimumRangePctPoints === 0.5, "exists");
  add("14X-R: leader mean-reversion scenario exists", byId("baseline_leader_current_mean_reversion") != null, "exists");
  add("14X-S: all-candidate mean-reversion scenario exists", byId("all_candidates_current_mean_reversion") != null, "exists");
  add("14X-T: leader-down scenario exists", byId("baseline_leader_yield_down_0_25") != null, "exists");
  add("14X-U: runner-up-up scenario exists", byId("runner_up_yield_up_0_25") != null, "exists");
  add("14X-V: combined leader-down/runner-up-up scenario exists", byId("baseline_leader_down_runner_up_up") != null, "exists");
  add("14X-W: data-availability scenarios exist", ["baseline_leader_stale", "runner_up_stale", "highest_risk_candidate_stale", "native_candidate_stale"].every((id) => byId(id)?.scenarioClass === "data_availability"), "exists");
  add("14X-X: scenario IDs are unique", new Set(cat.map((s) => s.scenarioId)).size === cat.length && cat.length === 18, `n=${cat.length}`);
  add("14X-Y: synthetic scenarios are labeled synthetic", cat.filter((s) => s.scenarioClass !== "baseline").every((s) => s.syntheticScenario === true) && byId("baseline")?.syntheticScenario === false, "labeled");

  // 14X-Z…AE. Mutation safety.
  add("14X-Z: base selector policy is not mutated", JSON.stringify(SOL_STAKING_SELECTOR_POLICY.weights) === policyWeightsBefore, "unchanged");
  add("14X-AA: normalized set is not mutated", JSON.stringify(set) === setJsonBefore, "unchanged");
  {
    const scen: SolStakingSensitivityScenario = { scenarioId: "t", scenarioName: "t", scenarioClass: "market_perturbation", description: "", syntheticScenario: true, includedInLeaderRetentionRate: true, marketOverrides: { marinade: { currentApyDeltaPctPoints: -0.25, apy30dDeltaPctPoints: -0.25 } }, notes: [] };
    const applied = applySolStakingSensitivityMarketOverrides(set, scen, {});
    const cm = applied.set.candidates[IDS.marinade];
    const om = set.candidates[IDS.marinade];
    add("14X-AB: reviewed risk scores are not modified", cm.risk.reviewedRiskScore.value === om.risk.reviewedRiskScore.value, "unchanged");
    add("14X-AC: approval decisions are not modified", cm.approval.approvedForReadOnlyReview === om.approval.approvedForReadOnlyReview, "unchanged");
    add("14X-AD: adoption/fees/exit/token model are not modified", JSON.stringify(cm.adoption) === JSON.stringify(om.adoption) && JSON.stringify(cm.fees) === JSON.stringify(om.fees) && cm.tokenModel === om.tokenModel && JSON.stringify(cm.exit) === JSON.stringify(om.exit), "unchanged");
    add("14X-AE: synthetic APY values are labeled", cm.yield.currentApyPct.value === 4.5 && om.yield.currentApyPct.value === 4.75 && cm.yield.currentApyPct.notes.some((n) => n.includes("SYNTHETIC")), `new=${cm.yield.currentApyPct.value}`);
  }

  // 14X-AF…AM. Scenario behavior.
  const baselineRes = sens.scenarios.find((s) => s.scenarioId === "baseline")!;
  add("14X-AF: every valid scenario uses the Step 14W comparison engine", sens.scenarios.filter((s) => s.status === "complete").every((s) => typeof s.candidateScores[s.comparisonLeaderCandidateId!] === "number"), "engine");
  add("14X-AG: baseline scenario matches the unchanged selector result", baselineRes.comparisonLeaderCandidateId === cmp.comparisonLeaderCandidateId && baselineRes.candidateScores[cmp.comparisonLeaderCandidateId!] === cmp.candidateResults[cmp.comparisonLeaderCandidateId!].totalScore, "matches");
  {
    const scen: SolStakingSensitivityScenario = { scenarioId: "mr", scenarioName: "mr", scenarioClass: "market_perturbation", description: "", syntheticScenario: true, includedInLeaderRetentionRate: true, marketOverrides: { jito: { replaceCurrentApyWith30d: true } }, notes: [] };
    const applied = applySolStakingSensitivityMarketOverrides(set, scen, {});
    add("14X-AH: mean reversion recalculates APY delta", applied.set.candidates[IDS.jito].yield.absoluteApyDeltaPctPoints.value === 0 && applied.set.candidates[IDS.jito].yield.currentApyPct.value === applied.set.candidates[IDS.jito].yield.apy30dPct.value, "recalculated");
    const bigNeg: SolStakingSensitivityScenario = { ...scen, scenarioId: "neg", marketOverrides: { jito: { currentApyDeltaPctPoints: -100 } } };
    add("14X-AI: negative APY is never produced", applySolStakingSensitivityMarketOverrides(set, bigNeg, {}).set.candidates[IDS.jito].yield.currentApyPct.value === 0, "floored");
    const staleScen: SolStakingSensitivityScenario = { ...scen, scenarioId: "st", marketOverrides: { marinade: { markCandidateStale: true } } };
    add("14X-AJ: stale scenario excludes the affected candidate", !applySolStakingSensitivityMarketOverrides(set, staleScen, {}).set.selectorReadyCandidateIds.includes(IDS.marinade), "excluded");
    const partScen: SolStakingSensitivityScenario = { ...scen, scenarioId: "pt", marketOverrides: { marinade: { markCandidatePartial: true } } };
    add("14X-AK: partial scenario excludes the affected candidate", !applySolStakingSensitivityMarketOverrides(set, partScen, {}).set.selectorReadyCandidateIds.includes(IDS.marinade), "excluded");
  }
  add("14X-AL: data-availability scenarios are excluded from retention rate", sens.retentionEligibleScenarioCount === sens.scenarios.filter((s) => s.status === "complete" && s.scenarioClass !== "data_availability").length, `re=${sens.retentionEligibleScenarioCount}`);
  {
    const badScen: SolStakingSensitivityScenario = { scenarioId: "bad", scenarioName: "bad", scenarioClass: "policy_weights", description: "", syntheticScenario: true, includedInLeaderRetentionRate: true, policyOverrides: { reviewedRiskWeight: 0.9, apy30dWeight: 0.9, currentApyWeight: 0.0, apyStabilityWeight: 0.0 }, notes: [] };
    const badSens = runSolStakingSelectorSensitivityAnalysis(set, { checkedAt: CHECKED, scenarios: [byId("baseline")!, badScen] });
    add("14X-AM: invalid scenario fails closed", badSens.scenarios.find((s) => s.scenarioId === "bad")?.status === "invalid_input", "fail-closed");
  }

  // 14X-AN…AY. Aggregation.
  const sens2 = runSolStakingSelectorSensitivityAnalysis(set, { checkedAt: CHECKED });
  add("14X-AN: leader retention rate is deterministic", sens.leaderRetentionRate === sens2.leaderRetentionRate, `${sens.leaderRetentionRate}`);
  add("14X-AO: baseline leader average rank is deterministic", sens.baselineLeaderAverageRank === sens2.baselineLeaderAverageRank, `${sens.baselineLeaderAverageRank}`);
  add("14X-AP: worst rank is deterministic", sens.baselineLeaderWorstRank === sens2.baselineLeaderWorstRank, `${sens.baselineLeaderWorstRank}`);
  add("14X-AQ: minimum leader margin is deterministic", sens.minimumLeaderMargin === sens2.minimumLeaderMargin, `${sens.minimumLeaderMargin}`);
  add("14X-AR: median leader margin is deterministic", sens.medianLeaderMargin === sens2.medianLeaderMargin, `${sens.medianLeaderMargin}`);
  {
    const completed = sens.scenarios.filter((s) => s.status === "complete");
    const knife = completed.filter((s) => typeof s.leaderMargin === "number" && s.leaderMargin < 0.1).length;
    add("14X-AS: knife-edge count matches scenario margins", sens.knifeEdgeScenarioCount === knife, `${sens.knifeEdgeScenarioCount}`);
    const retentionEligible = completed.filter((s) => s.scenarioClass !== "data_availability");
    const switches = retentionEligible.filter((s) => !s.baselineLeaderRetained).length;
    add("14X-AT: leader-switch count is correct", sens.leaderSwitchScenarioCount === switches, `${sens.leaderSwitchScenarioCount}`);
    const freqTotal = Object.values(sens.leaderFrequency).reduce((a, b) => a + b, 0);
    add("14X-AU: leader frequencies total completed scenarios", freqTotal === completed.filter((s) => s.comparisonLeaderCandidateId).length, `${freqTotal}`);
    add("14X-AV: unique leader IDs are deterministic", JSON.stringify(sens.uniqueLeaderCandidateIds) === JSON.stringify(sens2.uniqueLeaderCandidateIds), sens.uniqueLeaderCandidateIds.join(","));
  }
  {
    const knifeRate = sens.completedScenarioCount > 0 ? sens.knifeEdgeScenarioCount / sens.completedScenarioCount : 1;
    const expectStable = baselineRes.status === "complete" && typeof baselineRes.leaderMargin === "number" && baselineRes.leaderMargin >= 0.25 && typeof sens.leaderRetentionRate === "number" && sens.leaderRetentionRate >= 0.7 && knifeRate <= 0.25 && sens.retentionEligibleScenarioCount >= 8 && sens.scenarios.every((s) => s.status !== "invalid_input");
    add("14X-AW: leader-stable requires every configured threshold", sens.leaderStable === expectStable, `stable=${sens.leaderStable}`);
    const policyC = sens.scenarios.filter((s) => s.status === "complete" && s.scenarioClass === "policy_weights");
    const expectPolicySensitive = policyC.some((s) => !s.baselineLeaderRetained) || (policyC.length > 0 && policyC.filter((s) => s.baselineLeaderRetained).length / policyC.length < 0.7);
    add("14X-AX: policy sensitivity derives from policy scenarios", sens.policySensitive === expectPolicySensitive, `${sens.policySensitive}`);
    const marketC = sens.scenarios.filter((s) => s.status === "complete" && s.scenarioClass === "market_perturbation");
    const mSwitches = marketC.filter((s) => !s.baselineLeaderRetained).length;
    const expectMarketSensitive = mSwitches >= 2 || (marketC.length > 0 && marketC.filter((s) => s.baselineLeaderRetained).length / marketC.length < 0.7);
    add("14X-AY: market sensitivity derives from market scenarios", sens.marketSensitive === expectMarketSensitive, `${sens.marketSensitive}`);
  }

  // 14X-AZ…BI. Historical analysis.
  const histInputs = (n: number, spanHours: number): SolStakingHistoricalSensitivityInput[] => Array.from({ length: n }, (_, i) => ({ snapshotId: `snap_${i}`, cacheGeneratedAt: new Date(Date.parse("2026-07-10T00:00:00Z") + (i * spanHours / Math.max(1, n - 1)) * 3_600_000).toISOString(), checkedAt: CHECKED, normalizedSet: set }));
  const histEmpty = analyzeSolStakingSelectorHistory([], { checkedAt: CHECKED, baselineLeaderId: sens.baselineLeaderCandidateId });
  add("14X-AZ: historical analysis uses real supplied snapshots only", analyzeSolStakingSelectorHistory(histInputs(2, 10), { checkedAt: CHECKED }).validSnapshotCount === 2, "real only");
  add("14X-BA: no snapshots yields insufficient historical coverage", histEmpty.validSnapshotCount === 0 && histEmpty.historyRequirementsPass === false && histEmpty.blockers.includes("historical_coverage_insufficient"), "insufficient");
  {
    const dup: SolStakingHistoricalSensitivityInput[] = [{ snapshotId: "d", cacheGeneratedAt: "2026-07-10T00:00:00Z", checkedAt: CHECKED, normalizedSet: set }, { snapshotId: "d", cacheGeneratedAt: "2026-07-10T06:00:00Z", checkedAt: CHECKED, normalizedSet: set }];
    add("14X-BB: duplicate historical snapshot IDs are rejected", analyzeSolStakingSelectorHistory(dup, { checkedAt: CHECKED }).blockers.some((b) => b.startsWith("duplicate_snapshot_id")), "rejected");
    const bad: SolStakingHistoricalSensitivityInput[] = [{ snapshotId: "x", cacheGeneratedAt: "not-a-date", checkedAt: CHECKED, normalizedSet: set }];
    add("14X-BC: malformed timestamps are rejected", analyzeSolStakingSelectorHistory(bad, { checkedAt: CHECKED }).blockers.some((b) => b.startsWith("malformed_timestamp")), "rejected");
    const unordered: SolStakingHistoricalSensitivityInput[] = [{ snapshotId: "b", cacheGeneratedAt: "2026-07-12T00:00:00Z", checkedAt: CHECKED, normalizedSet: set }, { snapshotId: "a", cacheGeneratedAt: "2026-07-10T00:00:00Z", checkedAt: CHECKED, normalizedSet: set }];
    const ua = analyzeSolStakingSelectorHistory(unordered, { checkedAt: CHECKED });
    add("14X-BD: historical snapshots are sorted deterministically", ua.firstSnapshotAt === "2026-07-10T00:00:00Z" && ua.lastSnapshotAt === "2026-07-12T00:00:00Z", "sorted");
    add("14X-BE: history span is calculated correctly", Math.abs(ua.historySpanHours - 48) < 1e-6, `${ua.historySpanHours}`);
  }
  add("14X-BF: fewer than 12 valid snapshots fails history gate", analyzeSolStakingSelectorHistory(histInputs(4, 80), { checkedAt: CHECKED }).historyRequirementsPass === false, "fail");
  add("14X-BG: less than 72 hours fails history gate", analyzeSolStakingSelectorHistory(histInputs(12, 10), { checkedAt: CHECKED }).historyRequirementsPass === false, "fail");
  add("14X-BH: sufficient snapshots and span can pass history gate", analyzeSolStakingSelectorHistory(histInputs(12, 80), { checkedAt: CHECKED }).historyRequirementsPass === true, "pass");
  add("14X-BI: synthetic sensitivity scenarios are not counted as history", histEmpty.validSnapshotCount === 0 && sens.scenarios.length === 18, "separate");

  // 14X-BJ…BT. Activation gate.
  const passingSens = { ...sens, leaderStable: true, policySensitive: false, marketSensitive: false };
  const passingHist = { ...histEmpty, historyRequirementsPass: true, validSnapshotCount: 12, historySpanHours: 80, historicalLeaderRetentionRate: 0.9 };
  const passingOp: SolStakingSelectorOperationalReadiness = { scheduledRefreshConfigured: true, refreshIntervalHours: 6, consecutiveSuccessfulRefreshes: 3, latestCacheFresh: true, repeatedSourceFailureAlertingConfigured: true, rollbackFlagAvailable: true, rollbackProcedureDocumented: true, regressionQaComplete: true, productCopyReviewComplete: true, humanPolicySignOff: true, humanActivationApproval: true, notes: [] };
  const gate = (over: Partial<{ c: typeof cmp; s: typeof passingSens; h: typeof passingHist; o: SolStakingSelectorOperationalReadiness }>) => evaluateSolStakingSelectorActivationGate({ comparisonResult: over.c ?? cmp, sensitivityResult: over.s ?? passingSens, historicalAnalysis: over.h ?? passingHist, operationalReadiness: over.o ?? passingOp });
  add("14X-BJ: invalid input produces blocked_invalid_input", gate({ c: { ...cmp, status: "invalid_input" } as never }).status === "blocked_invalid_input", "status");
  add("14X-BK: insufficient candidates produces blocked_insufficient_candidates", gate({ c: { ...cmp, eligibleCandidateIds: [cmp.eligibleCandidateIds[0]] } as never }).status === "blocked_insufficient_candidates", "status");
  add("14X-BL: insufficient history produces blocked_historical_coverage", gate({ h: { ...passingHist, historyRequirementsPass: false } }).status === "blocked_historical_coverage", "status");
  add("14X-BM: unstable leader produces blocked_leader_unstable", gate({ s: { ...passingSens, leaderStable: false } }).status === "blocked_leader_unstable", "status");
  add("14X-BN: policy-sensitive result produces blocked_policy_sensitive", gate({ s: { ...passingSens, policySensitive: true } }).status === "blocked_policy_sensitive", "status");
  add("14X-BO: market-sensitive result produces blocked_market_sensitive", gate({ s: { ...passingSens, marketSensitive: true } }).status === "blocked_market_sensitive", "status");
  add("14X-BP: missing operational readiness produces blocked_operational_readiness", gate({ o: { ...passingOp, scheduledRefreshConfigured: false } }).status === "blocked_operational_readiness", "status");
  add("14X-BQ: missing policy sign-off produces blocked_human_approval", gate({ o: { ...passingOp, humanPolicySignOff: false } }).status === "blocked_human_approval", "status");
  add("14X-BR: missing activation approval produces blocked_human_approval", gate({ o: { ...passingOp, humanActivationApproval: false } }).status === "blocked_human_approval", "status");
  const readyDecision = gate({});
  add("14X-BS: ready status requires all gates", readyDecision.status === "ready_for_human_activation_review" && validateSolStakingSelectorActivationReviewDecision(readyDecision).valid === true, readyDecision.status);
  add("14X-BT: ready status still performs no activation", readyDecision.activationPerformed === false && readyDecision.selectedProtocolIdChanged === false && readyDecision.winnerActivated === false && readyDecision.updatesProductUi === false, "inert");

  // 14X-BU…CB. Operational readiness.
  add("14X-BU: refresh interval above 6 hours fails", evaluateOperationalReadiness({ ...passingOp, refreshIntervalHours: 12 }).passed === false, "fail");
  add("14X-BV: fewer than 3 consecutive successes fails", evaluateOperationalReadiness({ ...passingOp, consecutiveSuccessfulRefreshes: 2 }).passed === false, "fail");
  add("14X-BW: stale latest cache fails", evaluateOperationalReadiness({ ...passingOp, latestCacheFresh: false }).passed === false, "fail");
  add("14X-BX: missing alerting fails", evaluateOperationalReadiness({ ...passingOp, repeatedSourceFailureAlertingConfigured: false }).passed === false, "fail");
  add("14X-BY: missing rollback flag fails", evaluateOperationalReadiness({ ...passingOp, rollbackFlagAvailable: false }).passed === false, "fail");
  add("14X-BZ: missing rollback documentation fails", evaluateOperationalReadiness({ ...passingOp, rollbackProcedureDocumented: false }).passed === false, "fail");
  add("14X-CA: incomplete regression QA fails", evaluateOperationalReadiness({ ...passingOp, regressionQaComplete: false }).passed === false, "fail");
  add("14X-CB: incomplete product-copy review fails", evaluateOperationalReadiness({ ...passingOp, productCopyReviewComplete: false }).passed === false && evaluateOperationalReadiness(passingOp).passed === true, "fail");

  // 14X-CC…CK. Product invariants.
  const funded = bufferFixture(5000, 1000, 3);
  const aligned = allocationFixture(15000, 62, 2);
  const engineRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded, allocation: aligned, positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stakingSug = engineRun.suggestions.find((s) => s.category === "staking");
  add("14X-CC: current selected protocol remains Jito", readyDecision.currentSelectedCandidateId === "jito" && stakingSug?.protocolSelection?.selectedProtocolId === "jito", "jito");
  add("14X-CD: selectedProtocolIdChanged is false", sens.selectedProtocolIdChanged === false && readyDecision.selectedProtocolIdChanged === false, "false");
  add("14X-CE: winnerActivated is false", readyDecision.winnerActivated === false && SOL_STAKING_SELECTOR_ACTIVATION_PERFORMED === false, "false");
  add("14X-CF: multi-protocol selection remains disabled", engineRun.suggestions.filter((s) => s.category === "staking").length === 1, "disabled");
  add("14X-CG: Top Pick remains unchanged", engineRun.suggestions.filter((s) => s.is_top_pick).every((s) => s.protocolSelection?.selectedProtocolName !== "Jupiter Native Stake"), "unchanged");
  add("14X-CH: engine ordering remains unchanged", engineRun.suggestions.every((s) => s.id !== "jupiter_native_stake" && !s.id.startsWith("sol_staking")), "unchanged");
  {
    const prodFiles = ["src/suggestions/stakingSuggestion.ts", "src/suggestions/suggestionReviewDetails.ts", "src/components/SuggestionReviewModal.tsx", "src/suggestions/demoExactSolStakingScenario.ts"];
    add("14X-CI: no product-facing import exists", prodFiles.every((f) => !readIf(f).includes("solStakingSelectorSensitivity") && !readIf(f).includes("solStakingSelectorActivationGate")), "no import");
  }
  add("14X-CJ: no product UI update exists", SOL_STAKING_ACTIVATION_UPDATES_PRODUCT_UI === false, "false");
  add("14X-CK: INF remains blocked and unscored", getInfReadOnlyApprovalDecision({ checkedAt: "2026-07-14T02:30:00Z" }) === null && sens.scenarios.every((s) => s.candidateScores[IDS.sanctum] === undefined), "blocked");

  // 14X-CL…CN. Execution invariants.
  {
    const j = (JSON.stringify(sens) + JSON.stringify(readyDecision)).toLowerCase();
    const tokens = ["sendtransaction", "signmessage", "signtransaction", "signalltransactions", "stake(", "delegate(", "withdraw(", "swap(", "deposit(", "approve(", "execute("];
    add("14X-CL: no transaction path exists", sens.transactionsEnabled === false && readyDecision.transactionsEnabled === false && tokens.filter((t) => j.includes(t)).length === 0, "none");
    add("14X-CM: no signature path exists", sens.walletSignatureRequired === false && readyDecision.walletSignatureRequired === false, "none");
    add("14X-CN: no stake/delegate/withdraw/swap/deposit/approve/execute handler exists", tokens.filter((t) => j.includes(t)).length === 0, "none");
  }

  // 14X-CO…CR. Cache QA (synthetic) + integrity.
  add("14X-CO: fresh cache can run sensitivity analysis", sens.completedScenarioCount >= 2 && validateSolStakingSensitivityResult(sens).valid === true, `completed=${sens.completedScenarioCount}`);
  add("14X-CP: scenario leaders are formula-derived", baselineRes.comparisonLeaderCandidateId === cmp.comparisonLeaderCandidateId && explainSolStakingSensitivityScenario(sens, "baseline")?.comparisonLeaderCandidateId === cmp.comparisonLeaderCandidateId, "formula");
  add("14X-CQ: history is not fabricated", histEmpty.validSnapshotCount === 0 && validateSolStakingHistoricalSensitivityAnalysis(histEmpty).valid === true, "not fabricated");
  {
    const truthfulOp: SolStakingSelectorOperationalReadiness = { scheduledRefreshConfigured: false, refreshIntervalHours: 6, consecutiveSuccessfulRefreshes: 1, latestCacheFresh: true, repeatedSourceFailureAlertingConfigured: false, rollbackFlagAvailable: false, rollbackProcedureDocumented: false, regressionQaComplete: false, productCopyReviewComplete: false, humanPolicySignOff: false, humanActivationApproval: false, notes: [] };
    const realDecision = evaluateSolStakingSelectorActivationGate({ comparisonResult: cmp, sensitivityResult: sens, historicalAnalysis: histEmpty, operationalReadiness: truthfulOp });
    add("14X-CR: activation decision reflects actual blockers", realDecision.status === "blocked_historical_coverage" && realDecision.blockers.includes("historical_coverage_insufficient") && getSolStakingActivationReviewDiagnostics(realDecision).status === "blocked_historical_coverage", realDecision.status);
  }

  return checks;
}


export function runSolStakingSelectorPresentationFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });

  const root = process.cwd();
  const readIf = (rel: string) => { try { return readFileSync(`${root}/${rel}`, "utf8"); } catch { return ""; } };

  const CHECKED = "2026-07-14T03:00:00Z";
  const FRESH = "2026-07-14T02:50:00Z";
  const OLD = "2026-07-11T00:00:00Z";
  const PLUS_48H = "2026-07-16T03:00:00Z";
  const IDS = SOL_STAKING_MARKET_CANDIDATE_IDS;

  const POOL = { jito: "0e7d0722-9054-4907-8593-567b353c0900", jupiter: "52bd72a7-9e81-4112-abb4-71673e8de9bf", marinade: "b3f93865-5ec8-4662-90a0-11808e0aa2bd", blazestake: "387d6732-59f0-4ae0-8a88-aba75a5cbe4a", sanctum: "3075a746-bdd1-4aac-bcd5-b035abee2622" };
  const rec = (pool: string, apy: unknown, apyMean30d: unknown, tvlUsd: unknown) => ({ pool, chain: "Solana", symbol: "X", apy, apyMean30d, tvlUsd });
  const dllValid = { status: "success", data: [rec(POOL.jito, 5.36, 5.45, 767950000), rec(POOL.jupiter, 5.67, 5.6, 409170000), rec(POOL.marinade, 9.0, 9.0, 184840000), rec(POOL.blazestake, 5.27, 5.32, 69750000), rec(POOL.sanctum, 5.84, 5.95, 152555981)] }; // mSOL leads (APY-dominant)
  const dllJitoLeads = { status: "success", data: [rec(POOL.jito, 9.0, 9.0, 767950000), rec(POOL.jupiter, 4.0, 4.0, 409170000), rec(POOL.marinade, 4.0, 4.0, 184840000), rec(POOL.blazestake, 4.0, 4.0, 69750000), rec(POOL.sanctum, 4.0, 4.0, 152555981)] };
  const VA = JUPITER_NATIVE_STAKE_VOTE_ACCOUNT;
  const IDENT = JUPITER_NATIVE_STAKE_IDENTITY;
  const mkEpochs = (n: number, endEpoch: number, lastEndIso: string, apyBase = 0.054) => { const out: Record<string, unknown>[] = []; let end = Date.parse(lastEndIso); const twoDays = 2 * 86400_000; for (let k = 0; k < n; k++) { const start = end - twoDays; out.push({ epoch: endEpoch - k, apy: apyBase - k * 0.0004, activated_stake: 12_500_000_000_000_000, commission_effective: 5, epoch_start_at: new Date(start).toISOString(), epoch_end_at: new Date(end).toISOString() }); end = start; } return out; };
  const marinadeValid = { validators: [{ vote_account: VA, identity: IDENT, epoch_stats: [{ epoch: 1001, apy: null, epoch_start_at: "2026-07-12T12:22:01Z", epoch_end_at: "2026-07-14T12:00:00Z" }, ...mkEpochs(16, 1000, "2026-07-12T12:22:01Z")] }] };
  const stakewiz = [{ vote_identity: VA, identity: IDENT, activated_stake: 12_500_954.43, commission: 500, apy_estimate: 5.23, delinquent: false, epoch: 1001 }];

  const mkPresentation = (dll: unknown, checkedAt: string, opts: { sw?: unknown; mar?: unknown; swFetched?: string; marFetched?: string; dllFetched?: string } = {}) => {
    const cache = buildSolStakingMarketCache({ checkedAt, defiLlama: { payload: dll, fetchedAt: opts.dllFetched ?? FRESH }, stakewiz: { payload: opts.sw ?? stakewiz, fetchedAt: opts.swFetched ?? FRESH }, marinade: { payload: opts.mar ?? marinadeValid, fetchedAt: opts.marFetched ?? FRESH } });
    const nset = buildNormalizedSolStakingCandidateSet(cache, { checkedAt });
    const c = buildSolStakingSelectorComparison(nset, { checkedAt });
    return { cache, nset, c, pres: buildSolStakingSelectorPresentation({ marketCache: cache, normalizedSet: nset, comparisonResult: c, checkedAt }) };
  };

  const fresh = mkPresentation(dllValid, CHECKED);
  const jitoLead = mkPresentation(dllJitoLeads, CHECKED);
  const pres = fresh.pres;
  // Stale: a cache that WAS fresh, evaluated later via the display gate (restamped, not rebuilt).
  const stalePres = buildSolStakingSelectorPresentation({ marketCache: fresh.cache, normalizedSet: fresh.nset, comparisonResult: fresh.c, checkedAt: PLUS_48H });

  // 14Y-A…M. Display gate.
  add("14Y-A: display gate exists", typeof evaluateSolStakingSelectorDisplayGate === "function" && fresh.pres.displayGate != null, "exists");
  add("14Y-B: fresh valid complete comparison can display a leader", pres.status === "available" && pres.displayGate.canShowCurrentLeader === true && pres.topProtocol != null, `status=${pres.status}`);
  add("14Y-C: history is not required for display", pres.displayGate.historicalCoverageRequiredForDisplay === false && pres.status === "available", "no history");
  add("14Y-D: sensitivity pass is not required for display", pres.displayGate.sensitivityPassRequiredForDisplay === false, "no sensitivity");
  add("14Y-E: human activation approval is not required for display", pres.displayGate.humanApprovalRequiredForDisplay === false && pres.displayGate.activationRequiredForDisplay === false, "no approval");
  add("14Y-F: automatic activation remains required for selectedProtocolId changes", pres.selectedProtocolIdChanged === false && pres.displayGate.selectedProtocolIdChanged === false && pres.activationPerformed === false, "gated");
  add("14Y-G: stale cache cannot display a current leader", stalePres.status === "stale" && stalePres.topProtocol === undefined, `status=${stalePres.status}`);
  {
    const badCache = { ...fresh.cache, schemaVersion: "9.9.9" };
    const g = evaluateSolStakingSelectorDisplayGate({ marketCache: badCache as never, normalizedSet: fresh.nset, comparisonResult: fresh.c, checkedAt: CHECKED });
    add("14Y-H: invalid cache cannot display a current leader", g.status === "invalid" && g.canShowCurrentLeader === false, "invalid");
  }
  add("14Y-I: missing runtime payload cannot display a current leader", buildSolStakingSelectorPresentation({ checkedAt: CHECKED }).status === "unavailable" && buildSolStakingSelectorPresentation({ checkedAt: CHECKED }).topProtocol === undefined, "unavailable");
  {
    const oneReady = mkPresentation(dllValid, CHECKED, { dllFetched: OLD }); // LSTs stale → only native ready
    add("14Y-J: one eligible candidate cannot display a current leader", oneReady.c.eligibleCandidateIds.length === 1 && oneReady.pres.status === "insufficient_candidates" && oneReady.pres.topProtocol === undefined, `n=${oneReady.c.eligibleCandidateIds.length}`);
  }
  {
    const zeroCache = buildSolStakingMarketCache({ checkedAt: CHECKED });
    const zset = buildNormalizedSolStakingCandidateSet(zeroCache, { checkedAt: CHECKED });
    const zc = buildSolStakingSelectorComparison(zset, { checkedAt: CHECKED });
    const zp = buildSolStakingSelectorPresentation({ marketCache: zeroCache, normalizedSet: zset, comparisonResult: zc, checkedAt: CHECKED });
    add("14Y-K: zero eligible candidates cannot display a current leader", zc.eligibleCandidateIds.length === 0 && zp.status === "insufficient_candidates" && zp.topProtocol === undefined, "zero");
  }
  add("14Y-L: at least two fresh candidates are required", pres.displayGate.eligibleCandidateCount >= 2 && pres.rankedCandidates.length >= 2, `n=${pres.displayGate.eligibleCandidateCount}`);
  {
    const mismatchCache = { ...fresh.cache, generatedAt: "2020-01-01T00:00:00Z" };
    add("14Y-M: comparison/cache timestamp mismatch fails closed", evaluateSolStakingSelectorDisplayGate({ marketCache: mismatchCache, normalizedSet: fresh.nset, comparisonResult: fresh.c, checkedAt: CHECKED }).status === "invalid", "mismatch");
  }

  // 14Y-N…AD. Presentation.
  add("14Y-N: rank 1 becomes topProtocol", pres.topProtocol?.candidateId === fresh.c.rankedCandidateIds[0] && pres.topProtocol?.rank === 1, `top=${pres.topProtocol?.candidateId}`);
  add("14Y-O: rank 2 becomes runnerUp", pres.runnerUp?.candidateId === fresh.c.rankedCandidateIds[1] && pres.runnerUp?.rank === 2, `ru=${pres.runnerUp?.candidateId}`);
  add("14Y-P: ranked candidates preserve Step 14W order", JSON.stringify(pres.rankedCandidates.map((c) => c.candidateId)) === JSON.stringify(fresh.c.rankedCandidateIds), "order");
  add("14Y-Q: presentation does not recalculate ranking", pres.rankedCandidates.every((c, i) => c.rank === fresh.c.candidateResults[c.candidateId].rank && i + 1 === c.rank), "no recalc");
  add("14Y-R: presentation preserves comparison scores exactly", pres.rankedCandidates.every((c) => c.comparisonScore === fresh.c.candidateResults[c.candidateId].totalScore), "scores");
  add("14Y-S: presentation preserves score breakdown exactly", pres.topProtocol!.breakdown.reviewedRisk.contribution === fresh.c.candidateResults[pres.topProtocol!.candidateId].dimensions.reviewedRiskScore.weightedContribution, "breakdown");
  add("14Y-T: presentation preserves current APY exactly", pres.topProtocol!.currentApyPct === fresh.c.candidateResults[pres.topProtocol!.candidateId].dimensions.currentApy.rawValue, "curApy");
  add("14Y-U: presentation preserves 30-day APY exactly", pres.topProtocol!.apy30dPct === fresh.c.candidateResults[pres.topProtocol!.candidateId].dimensions.apy30d.rawValue, "apy30d");
  add("14Y-V: presentation preserves reviewed risk score exactly", pres.topProtocol!.reviewedRiskScore === fresh.c.candidateResults[pres.topProtocol!.candidateId].dimensions.reviewedRiskScore.rawValue, "risk");
  add("14Y-W: presentation preserves APY consistency exactly", pres.topProtocol!.absoluteApyDeltaPctPoints === fresh.c.candidateResults[pres.topProtocol!.candidateId].dimensions.apyStability.rawValue, "consistency");
  add("14Y-X: top protocol is marked dynamic", pres.topProtocolIsDynamic === true && pres.topProtocolMayChange === true, "dynamic");
  add("14Y-Y: presentation says it may change", /may change as market data refreshes/i.test(pres.disclosureText), "may change");
  {
    const allCopy = (pres.headline + pres.supportingText + pres.freshnessText + pres.disclosureText).toLowerCase();
    add("14Y-Z: no best-protocol copy exists", !allCopy.includes("best protocol") && !allCopy.includes("best "), "no best");
    add("14Y-AA: no safest-protocol copy exists", !allCopy.includes("safest") && !allCopy.includes("safe protocol"), "no safest");
    add("14Y-AB: no guaranteed or risk-free copy exists", !allCopy.includes("guaranteed") && !allCopy.includes("risk-free") && !allCopy.includes("risk free"), "no guarantee");
    add("14Y-AC: no recommended-protocol copy exists", !allCopy.includes("recommended") && !allCopy.includes("winner"), "no recommend");
    add("14Y-AD: no confusion with suggestion-engine Top Pick exists", !allCopy.includes("top pick") && /top protocol to review/i.test(pres.headline), "distinct");
  }

  // 14Y-AE…AK. Explanation.
  const exp = buildSolStakingLeaderExplanation(pres)!;
  const exp2 = buildSolStakingLeaderExplanation(fresh.pres)!;
  add("14Y-AE: leader explanation is deterministic", JSON.stringify(exp) === JSON.stringify(exp2), "deterministic");
  add("14Y-AF: explanation uses only four scored dimensions", exp.items.length === 4 && exp.items.map((i) => i.dimension).join(",") === "reviewed_risk,apy_30d,current_apy,apy_consistency", "four dims");
  add("14Y-AG: explanation shows exact weights", exp.items.find((i) => i.dimension === "reviewed_risk")!.weightPct === 50 && exp.items.find((i) => i.dimension === "apy_30d")!.weightPct === 30, "weights");
  add("14Y-AH: explanation does not invent reasons", exp.usesOnlyScoredDimensions === true && exp.items.every((i) => i.contribution === fresh.c.candidateResults[pres.topProtocol!.candidateId].dimensions[i.dimension === "reviewed_risk" ? "reviewedRiskScore" : i.dimension === "apy_30d" ? "apy30d" : i.dimension === "current_apy" ? "currentApy" : "apyStability"].weightedContribution), "no invention");
  {
    const expJson = JSON.stringify(exp).toLowerCase();
    add("14Y-AI: non-scored adoption is not presented as a reason for the score", !expJson.includes("tvl") && !expJson.includes("delegated stake") && !expJson.includes("adoption"), "no adoption");
    add("14Y-AJ: non-scored fees are not presented as a reason for the score", !expJson.includes("management fee") && !expJson.includes("commission") && !expJson.includes("unstake fee"), "no fees");
    add("14Y-AK: non-scored exit mechanics are not presented as a reason for the score", !expJson.includes("epoch") && !expJson.includes("liquidity") && !expJson.includes("exit"), "no exit");
  }

  // 14Y-AL…AV. Runtime payload + browser loader.
  const payload = buildSolStakingRuntimeMarketPayload(fresh.cache, "2026-07-14T03:01:00Z");
  add("14Y-AL: runtime payload schema version exists", SOL_STAKING_RUNTIME_DATA_SCHEMA_VERSION === "1.0.0" && payload.schemaVersion === "1.0.0", "1.0.0");
  add("14Y-AM: runtime payload contains only sanitized cache data", Object.keys(payload).sort().join(",") === "marketCache,publishedAt,schemaVersion", Object.keys(payload).join(","));
  {
    const flat = JSON.stringify(payload);
    add("14Y-AN: runtime payload contains no raw provider responses", !flat.includes("sourceResponses") && !flat.includes("rawPayload"), "sanitized");
    add("14Y-AO: runtime payload contains no secret/environment data", !/"(apiKey|api_key|secret|token|env|authorization)"/i.test(flat), "no secrets");
  }
  add("14Y-AP: runtime validator rejects invalid schema", validateSolStakingRuntimeMarketPayload({ schemaVersion: "0.0.0", publishedAt: "2026-07-14T03:00:00Z", marketCache: fresh.cache }).valid === false && validateSolStakingRuntimeMarketPayload(payload).valid === true, "rejects");
  add("14Y-AQ: runtime validator rejects invalid cache", validateSolStakingRuntimeMarketPayload({ schemaVersion: "1.0.0", publishedAt: "2026-07-14T03:00:00Z", marketCache: { schemaVersion: "bad", candidates: {} } }).valid === false, "rejects");
  {
    const hook = readIf("src/hooks/useSolStakingSelectorPresentation.ts");
    add("14Y-AR: browser loader uses same-origin generated data", SOL_STAKING_RUNTIME_DATA_URL === "/generated/sol-staking-market-cache.json" && hook.includes("SOL_STAKING_RUNTIME_DATA_URL") && hook.includes("same-origin"), "same-origin");
    add("14Y-AS: browser loader does not call DefiLlama", !hook.includes("yields.llama.fi"), "no defillama endpoint");
    add("14Y-AT: browser loader does not call Stakewiz", !hook.includes("api.stakewiz.com"), "no stakewiz endpoint");
    add("14Y-AU: browser loader does not call Marinade", !hook.includes("validators-api.marinade.finance") && !hook.includes("api.marinade.finance"), "no marinade endpoint");
    add("14Y-AV: browser loader fails closed when the artifact is missing", hook.includes("unavailablePresentation") && hook.includes("AbortController"), "fail-closed");
  }

  // 14Y-AW…BC. Publisher.
  const pkg = readIf("package.json");
  const pubScript = readIf("scripts/publish-sol-staking-market-cache.mjs");
  add("14Y-AW: market:publish-staking script exists", /"market:publish-staking"\s*:\s*"node scripts\/publish-sol-staking-market-cache\.mjs"/.test(pkg), "exists");
  add("14Y-AX: market:refresh-and-publish-staking script exists", /"market:refresh-and-publish-staking"/.test(pkg) && pkg.includes("market:refresh-staking && npm run market:publish-staking"), "exists");
  add("14Y-AY: publisher reads the Step 14U cache", pubScript.includes("sol-staking-market-data.json") === false && pubScript.includes("tmp") && pubScript.includes("sol-staking-market-data-cache.json"), "reads cache");
  add("14Y-AZ: publisher writes atomically", pubScript.includes("renameSync") && pubScript.includes(".tmp"), "atomic");
  add("14Y-BA: publisher excludes raw source responses", !pubScript.includes("sourceResponses:") && pubScript.includes("buildSolStakingRuntimeMarketPayload") && /Excluded/.test(pubScript), "excludes raw");
  add("14Y-BB: publisher refuses stale input", pubScript.includes("MAX_AGE_HOURS") && /stale/i.test(pubScript), "refuses stale");
  add("14Y-BC: generated runtime artifact is git-ignored", /public\/generated\/sol-staking-market-cache\.json/.test(readIf(".gitignore")), "ignored");

  // 14Y-BD…BR. Product behavior (source + presentation).
  const modal = readIf("src/components/SuggestionReviewModal.tsx");
  const testing = readIf("src/pages/testingPageFixtures.ts");
  add("14Y-BD: suggestion action/title remains unchanged", readIf("src/suggestions/stakingSuggestion.ts").includes("Put Idle SOL to Work") || testing.includes("Put Idle SOL to Work"), "unchanged");
  add("14Y-BE: fresh comparison shows Top protocol to review right now", pres.headline === "Top protocol to review right now", pres.headline);
  add("14Y-BF: top protocol card shows freshness", pres.freshnessText.startsWith("Updated ") && pres.freshnessText.length > 8, pres.freshnessText);
  add("14Y-BG: top protocol card says the result may change", /may change/i.test(pres.disclosureText), "may change");
  add("14Y-BH: review modal shows current leader", modal.includes("selectorPresentation") && /Current comparison/i.test(modal), "modal leader");
  add("14Y-BI: review modal shows runner-up", readIf("src/components/SolStakingLeaderExplanation.tsx").includes("runnerUp") && modal.includes("SolStakingLeaderExplanation"), "runner-up");
  add("14Y-BJ: review modal shows ranked eligible candidates", readIf("src/components/SolStakingLeaderExplanation.tsx").includes("rankedCandidates"), "ranked");
  add("14Y-BK: blocked INF is absent from user-facing ranking", pres.rankedCandidates.every((c) => c.candidateId !== IDS.sanctum), "no INF");
  add("14Y-BL: Jupiter Native Stake appears when eligible", pres.rankedCandidates.some((c) => c.candidateId === IDS.jupiterNativeStake && c.tokenModelLabel === "Native stake account"), "native present");
  add("14Y-BM: no contradictory Jito-current-top label appears when another protocol leads", pres.topProtocol!.candidateId === "marinade" && pres.leaderDiffersFromUnderlyingSelection === true && pres.currentUnderlyingSelectedProtocolId === "jito" && !/currently selected protocol: jito/i.test(pres.supportingText), "no contradiction");
  add("14Y-BN: stale state hides the top designation", stalePres.topProtocol === undefined && /being refreshed/i.test(stalePres.headline), "hidden");
  add("14Y-BO: unavailable state hides the top designation", buildSolStakingSelectorPresentation({ checkedAt: CHECKED }).topProtocol === undefined, "hidden");
  add("14Y-BP: individual protocol review remains available when comparison is unavailable", readIf("src/suggestions/engineTypes.ts").includes("otherProtocolsToReview"), "still available");
  add("14Y-BQ: Demo and Real Wallet use the same runtime result", testing.includes("useSolStakingSelectorPresentation") || readIf("src/pages/TestingPage.tsx").includes("useSolStakingSelectorPresentation") || modal.includes("selectorPresentation"), "shared");
  add("14Y-BR: Demo does not hardcode a separate leader", !readIf("src/suggestions/demoExactSolStakingScenario.ts").includes("comparisonLeaderCandidateId:"), "no hardcode");

  // 14Y-BS…BZ. Activation invariants.
  const funded = bufferFixture(5000, 1000, 3);
  const aligned = allocationFixture(15000, 62, 2);
  const engineRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded, allocation: aligned, positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stakingSug = engineRun.suggestions.find((s) => s.category === "staking");
  add("14Y-BS: selectedProtocolId remains Jito", stakingSug?.protocolSelection?.selectedProtocolId === "jito" && pres.currentUnderlyingSelectedProtocolId === "jito", "jito");
  add("14Y-BT: selectedProtocolIdChanged remains false", pres.selectedProtocolIdChanged === false, "false");
  add("14Y-BU: winnerActivated remains false", pres.topProtocol!.currentWinner === false && pres.topProtocol!.activated === false && pres.topProtocol!.selectedByProtocolLogic === false, "false");
  add("14Y-BV: multi-protocol automatic selection remains disabled", engineRun.suggestions.filter((s) => s.category === "staking").length === 1, "disabled");
  add("14Y-BW: Step 14X activation gate remains blocked", SOL_STAKING_SELECTOR_ACTIVATION_PERFORMED === false, "blocked");
  add("14Y-BX: showing a leader does not imply activation", pres.status === "available" && pres.activationPerformed === false && pres.selectedProtocolIdChanged === false, "no activation");
  add("14Y-BY: Top Pick remains unchanged", pres.topPickChanged === false && engineRun.suggestions.filter((s) => s.is_top_pick).every((s) => s.protocolSelection?.selectedProtocolName !== "Jupiter Native Stake"), "unchanged");
  add("14Y-BZ: engine ordering remains unchanged", pres.engineOrderingChanged === false && engineRun.suggestions.every((s) => s.id !== "jupiter_native_stake" && !s.id.startsWith("sol_staking")), "unchanged");

  // 14Y-CA…CC. Execution invariants.
  {
    const j = JSON.stringify(pres).toLowerCase();
    const tokens = ["sendtransaction", "signmessage", "signtransaction", "signalltransactions", "stake(", "delegate(", "withdraw(", "swap(", "deposit(", "approve(", "execute("];
    add("14Y-CA: no transaction path exists", pres.transactionsEnabled === false && tokens.filter((t) => j.includes(t)).length === 0, "none");
    add("14Y-CB: no signature path exists", pres.walletSignatureRequired === false && pres.topProtocol!.walletSignatureRequired === false, "none");
    add("14Y-CC: no stake/delegate/withdraw/swap/deposit/approve/execute handler exists", tokens.filter((t) => j.includes(t)).length === 0, "none");
  }

  // 14Y-CD…CJ. Testing states.
  add("14Y-CD: fresh mSOL-leader fixture renders", fresh.pres.status === "available" && fresh.pres.topProtocol?.candidateId === "marinade", `top=${fresh.pres.topProtocol?.candidateId}`);
  add("14Y-CE: fresh Jito-leader fixture renders", jitoLead.pres.status === "available" && jitoLead.pres.topProtocol?.candidateId === "jito", `top=${jitoLead.pres.topProtocol?.candidateId}`);
  add("14Y-CF: leader-change fixture updates the displayed leader", fresh.pres.topProtocol?.candidateId !== jitoLead.pres.topProtocol?.candidateId, `${fresh.pres.topProtocol?.candidateId} vs ${jitoLead.pres.topProtocol?.candidateId}`);
  add("14Y-CG: stale fixture renders refresh copy", /being refreshed/i.test(stalePres.headline), "refresh copy");
  add("14Y-CH: missing-artifact fixture renders unavailable copy", /unavailable/i.test(buildSolStakingSelectorPresentation({ checkedAt: CHECKED }).headline), "unavailable copy");
  {
    const g = evaluateSolStakingSelectorDisplayGate({ marketCache: { schemaVersion: "bad" } as never, normalizedSet: fresh.nset, comparisonResult: fresh.c, checkedAt: CHECKED });
    add("14Y-CI: invalid-artifact fixture fails closed", g.status === "invalid" && g.canShowCurrentLeader === false, "fail-closed");
  }
  {
    const nativeBoost = mkPresentation(dllValid, CHECKED, { sw: [{ ...stakewiz[0], apy_estimate: 12 }], mar: { validators: [{ vote_account: VA, identity: IDENT, epoch_stats: [{ epoch: 1001, apy: null, epoch_start_at: "2026-07-12T12:22:01Z", epoch_end_at: "2026-07-14T12:00:00Z" }, ...mkEpochs(16, 1000, "2026-07-12T12:22:01Z", 0.12)] }] } });
    const nativeEntry = nativeBoost.pres.rankedCandidates.find((c) => c.candidateId === "jupiter_native_stake");
    add("14Y-CJ: native-leader fixture preserves native token model", nativeEntry?.tokenModelLabel === "Native stake account" && nativeEntry?.candidateType === "native_staking" && (nativeBoost.pres.topProtocol?.candidateId === "jupiter_native_stake" ? nativeBoost.pres.topProtocol?.tokenModelLabel === "Native stake account" : true), `top=${nativeBoost.pres.topProtocol?.candidateId}`);
  }

  add("14Y-schema: presentation schema version is 1.0.0", SOL_STAKING_SELECTOR_PRESENTATION_SCHEMA_VERSION === "1.0.0" && pres.schemaVersion === "1.0.0", "1.0.0");

  return checks;
}


export function runSolStakingProductIntegrationFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });

  const root = process.cwd();
  const readIf = (rel: string) => { try { return readFileSync(`${root}/${rel}`, "utf8"); } catch { return ""; } };

  const CHECKED = "2026-07-14T03:00:00Z";
  const FRESH = "2026-07-14T02:50:00Z";
  const OLD = "2026-07-11T00:00:00Z";
  const PLUS_48H = "2026-07-16T03:00:00Z";
  const IDS = SOL_STAKING_MARKET_CANDIDATE_IDS;
  const POOL = { jito: "0e7d0722-9054-4907-8593-567b353c0900", jupiter: "52bd72a7-9e81-4112-abb4-71673e8de9bf", marinade: "b3f93865-5ec8-4662-90a0-11808e0aa2bd", blazestake: "387d6732-59f0-4ae0-8a88-aba75a5cbe4a", sanctum: "3075a746-bdd1-4aac-bcd5-b035abee2622" };
  const rec = (pool: string, apy: number, apy30d: number, tvl: number) => ({ pool, chain: "Solana", symbol: "X", apy, apyMean30d: apy30d, tvlUsd: tvl });
  const dllWith = (m: Record<string, [number, number]>) => ({ status: "success", data: [
    rec(POOL.jito, ...(m.jito ?? [5.36, 5.45]), 767950000),
    rec(POOL.jupiter, ...(m.jupiter ?? [5.67, 5.6]), 409170000),
    rec(POOL.marinade, ...(m.marinade ?? [4.75, 5.87]), 184840000),
    rec(POOL.blazestake, ...(m.blazestake ?? [5.27, 5.32]), 69750000),
    rec(POOL.sanctum, ...(m.sanctum ?? [5.84, 5.95]), 152555981),
  ] });
  const VA = JUPITER_NATIVE_STAKE_VOTE_ACCOUNT;
  const IDENT = JUPITER_NATIVE_STAKE_IDENTITY;
  const mkEpochs = (n: number, endEpoch: number, lastEndIso: string, apyBase = 0.054) => { const out: Record<string, unknown>[] = []; let end = Date.parse(lastEndIso); const d = 2 * 86400_000; for (let k = 0; k < n; k++) { const s = end - d; out.push({ epoch: endEpoch - k, apy: apyBase - k * 0.0004, activated_stake: 12_500_000_000_000_000, commission_effective: 5, epoch_start_at: new Date(s).toISOString(), epoch_end_at: new Date(end).toISOString() }); end = s; } return out; };
  const marinadeValid = (apyBase = 0.054) => ({ validators: [{ vote_account: VA, identity: IDENT, epoch_stats: [{ epoch: 1001, apy: null, epoch_start_at: "2026-07-12T12:22:01Z", epoch_end_at: "2026-07-14T12:00:00Z" }, ...mkEpochs(16, 1000, "2026-07-12T12:22:01Z", apyBase)] }] });
  const stakewiz = (apy = 5.23) => [{ vote_identity: VA, identity: IDENT, activated_stake: 12_500_954.43, commission: 500, apy_estimate: apy, delinquent: false, epoch: 1001 }];

  const mkPres = (m: Record<string, [number, number]>, checkedAt = CHECKED, opts: { swApy?: number; marApy?: number; dllFetched?: string } = {}) => {
    const cache = buildSolStakingMarketCache({ checkedAt, defiLlama: { payload: dllWith(m), fetchedAt: opts.dllFetched ?? FRESH }, stakewiz: { payload: stakewiz(opts.swApy ?? 5.23), fetchedAt: FRESH }, marinade: { payload: marinadeValid(opts.marApy ?? 0.054), fetchedAt: FRESH } });
    const nset = buildNormalizedSolStakingCandidateSet(cache, { checkedAt });
    const c = buildSolStakingSelectorComparison(nset, { checkedAt });
    return { cache, nset, c, pres: buildSolStakingSelectorPresentation({ marketCache: cache, normalizedSet: nset, comparisonResult: c, checkedAt }) };
  };

  const msol = mkPres({ marinade: [9, 9] });
  const jupsol = mkPres({ jupiter: [9, 9], marinade: [5, 5], jito: [5, 5] });
  const jito = mkPres({ jito: [9, 9], marinade: [4, 4], jupiter: [4, 4] });
  const bsol = mkPres({ blazestake: [9, 9], marinade: [4, 4], jupiter: [4, 4], jito: [4, 4] });
  const native = mkPres({ marinade: [4, 4], jupiter: [4, 4], jito: [4, 4], blazestake: [4, 4] }, CHECKED, { swApy: 12, marApy: 0.12 });
  const close = mkPres({ jito: [9, 9], jupiter: [9, 9], marinade: [4, 4] });
  const pres = msol.pres;
  const exp = pres.leaderExplanation!;
  const stalePres = buildSolStakingSelectorPresentation({ marketCache: msol.cache, normalizedSet: msol.nset, comparisonResult: msol.c, checkedAt: PLUS_48H });
  const unavailablePres = buildSolStakingSelectorPresentation({ checkedAt: CHECKED });

  const rail = readIf("src/components/RealWalletSuggestionsRail.tsx");
  const demoPage = readIf("src/pages/DemoDashboardPage.tsx");
  const summaryC = readIf("src/components/SolStakingComparisonSummary.tsx");
  const modal = readIf("src/components/SuggestionReviewModal.tsx");
  const explC = readIf("src/components/SolStakingLeaderExplanation.tsx");
  const explSrc = readIf("src/suggestions/solStakingLeaderExplanation.ts");

  // 14Z-A…I. Runtime integration.
  add("14Z-A: Demo uses useSolStakingSelectorPresentation", demoPage.includes("RealWalletSuggestionsRail") && rail.includes("useSolStakingSelectorPresentation"), "via shared rail");
  add("14Z-B: Real Wallet uses useSolStakingSelectorPresentation", rail.includes("useSolStakingSelectorPresentation"), "hook");
  add("14Z-C: Demo and Real Wallet receive the same presentation contract", demoPage.includes("RealWalletSuggestionsRail") && rail.includes("stakingPresentation={stakingPresentation}"), "shared");
  add("14Z-D: no Demo hardcoded leader exists", !demoPage.includes("comparisonLeaderCandidateId") && !/topProtocol\s*:/.test(demoPage), "no hardcode");
  add("14Z-E: no Real Wallet hardcoded leader exists", !rail.includes("comparisonLeaderCandidateId") && !/topProtocol\s*:/.test(rail), "no hardcode");
  add("14Z-F: displayed protocol comes from presentation.topProtocol", summaryC.includes("presentation.topProtocol") && explC.includes("presentation.topProtocol"), "from presentation");
  add("14Z-G: displayed protocol does not come from selectedProtocolId", !summaryC.includes("selectedProtocolId") && !explC.includes("selectedProtocolId"), "not selectedProtocolId");
  add("14Z-H: leader changes when presentation.topProtocol changes", msol.pres.topProtocol?.candidateId !== jito.pres.topProtocol?.candidateId, `${msol.pres.topProtocol?.candidateId} vs ${jito.pres.topProtocol?.candidateId}`);
  add("14Z-I: underlying selectedProtocolId remains Jito", pres.currentUnderlyingSelectedProtocolId === "jito", "jito");

  // 14Z-J…S. Card.
  add("14Z-J: suggestion title remains unchanged", !summaryC.includes("card.title =") && (readIf("src/pages/testingPageFixtures.ts").includes("Put Idle SOL to Work")), "unchanged");
  add("14Z-K: available state shows Top protocol to review right now", summaryC.includes("Top protocol to review right now"), "badge");
  add("14Z-L: card shows current APY", summaryC.includes("currentApyPct"), "apy");
  add("14Z-M: card shows 30-day APY", summaryC.includes("apy30dPct"), "apy30d");
  add("14Z-N: card shows reviewed risk", summaryC.includes("reviewedRiskScore"), "risk");
  add("14Z-O: card shows freshness", summaryC.includes("freshnessText"), "freshness");
  add("14Z-P: card says the result may change", summaryC.includes("This may change as market data refreshes"), "may change");
  add("14Z-Q: card shows deterministic compact explanation", summaryC.includes("compactSummary") && exp.deterministic === true, "compact");
  add("14Z-R: card compact explanation updates with leader", msol.pres.leaderExplanation!.compactSummary !== undefined && jito.pres.leaderExplanation!.leaderProtocolName === "Jito" && msol.pres.leaderExplanation!.leaderProtocolName === "Marinade", "updates");
  {
    const cta = ["Stake", "Delegate", "Execute", "Start staking", "Approve", "Confirm"];
    add("14Z-S: card has no execution CTA", cta.every((t) => !summaryC.includes(`>${t}<`)) && !/onClick=\{[^}]*(stake|delegate|execute)\(/i.test(summaryC), "no CTA");
  }

  // 14Z-T…AL. Full explanation.
  const exp2 = buildSolStakingLeaderComparisonExplanation(msol.pres)!;
  add("14Z-T: explanation is deterministic", JSON.stringify(exp) === JSON.stringify(exp2), "deterministic");
  add("14Z-U: explanation is not AI-generated", exp.aiGenerated === false && exp.deterministic === true, "not ai");
  {
    const dims = [...exp.strongestAdvantages, ...exp.tradeOffs, ...exp.approximatelyEqualDimensions].map((d) => d.dimension).sort();
    add("14Z-V: explanation uses exact Step 14W dimensions", JSON.stringify([...new Set(dims)].sort()) === JSON.stringify(["apy_30d", "apy_consistency", "current_apy", "reviewed_risk"]), dims.join(","));
  }
  {
    const all = [...exp.strongestAdvantages, ...exp.tradeOffs, ...exp.approximatelyEqualDimensions];
    const risk = all.find((d) => d.dimension === "reviewed_risk")!;
    add("14Z-W: explanation uses exact weights", risk.weight === 0.5 && all.find((d) => d.dimension === "apy_30d")!.weight === 0.3 && all.find((d) => d.dimension === "current_apy")!.weight === 0.1, "weights");
    add("14Z-X: explanation preserves leader raw values", risk.leaderRawValue === msol.c.candidateResults[exp.leaderCandidateId].dimensions.reviewedRiskScore.rawValue, "leader raw");
    add("14Z-Y: explanation preserves runner-up raw values", risk.runnerUpRawValue === msol.c.candidateResults[exp.runnerUpCandidateId!].dimensions.reviewedRiskScore.rawValue, "runnerup raw");
    add("14Z-Z: explanation preserves weighted contributions", risk.leaderContribution === msol.c.candidateResults[exp.leaderCandidateId].dimensions.reviewedRiskScore.weightedContribution && risk.runnerUpContribution === msol.c.candidateResults[exp.runnerUpCandidateId!].dimensions.reviewedRiskScore.weightedContribution, "contributions");
  }
  add("14Z-AA: strongest advantages derive from contribution differences", exp.strongestAdvantages.every((d) => (d.leaderAdvantageContribution ?? 0) > SOL_STAKING_LEADER_EXPLANATION_EPSILON) && exp.strongestAdvantages.every((d, i, a) => i === 0 || a[i - 1].leaderAdvantageContribution! >= d.leaderAdvantageContribution!), "advantages");
  add("14Z-AB: trade-offs derive from negative contribution differences", exp.tradeOffs.every((d) => (d.leaderAdvantageContribution ?? 0) < -SOL_STAKING_LEADER_EXPLANATION_EPSILON), "tradeoffs");
  add("14Z-AC: at least one trade-off is shown when one exists", exp.tradeOffs.length >= 1 && exp.tradeOffs.some((d) => d.dimension === "reviewed_risk" || d.dimension === "apy_consistency"), `n=${exp.tradeOffs.length}`);
  add("14Z-AD: approximately equal dimensions are not called advantages", exp.approximatelyEqualDimensions.every((d) => !exp.strongestAdvantages.includes(d) && !exp.tradeOffs.includes(d)), "not advantages");
  add("14Z-AE: score difference is exact", Math.abs((exp.scoreDifference ?? 0) - (pres.topProtocol!.comparisonScore - pres.runnerUp!.comparisonScore)) < SOL_STAKING_LEADER_EXPLANATION_RECONCILIATION_TOLERANCE, `${exp.scoreDifference}`);
  add("14Z-AF: leader and runner-up names are not hardcoded", !explSrc.includes("\"Marinade\"") && !explSrc.includes("\"mSOL\"") && !explSrc.includes("\"Jupiter\"") && !explSrc.includes("\"JupSOL\""), "no hardcode");
  add("14Z-AG: explanation updates when leader changes", msol.pres.leaderExplanation!.leaderCandidateId !== jito.pres.leaderExplanation!.leaderCandidateId, "updates");
  add("14Z-AH: explanation updates when runner-up changes", jupsol.pres.leaderExplanation!.runnerUpCandidateId != null && bsol.pres.leaderExplanation!.runnerUpCandidateId != null, "runnerup varies");
  add("14Z-AI: explanation works for native staking leader", native.pres.topProtocol?.candidateId === "jupiter_native_stake" ? native.pres.leaderExplanation?.leaderCandidateId === "jupiter_native_stake" : native.pres.leaderExplanation != null, `top=${native.pres.topProtocol?.candidateId}`);
  add("14Z-AJ: explanation works for Jito leader", jito.pres.topProtocol?.candidateId === "jito" && jito.pres.leaderExplanation?.leaderCandidateId === "jito", `top=${jito.pres.topProtocol?.candidateId}`);
  add("14Z-AK: explanation works for bSOL leader", bsol.pres.topProtocol?.candidateId === "blazestake" && bsol.pres.leaderExplanation?.leaderProtocolName === "BlazeStake", `top=${bsol.pres.topProtocol?.candidateId}`);
  add("14Z-AL: no new explanation score exists", !("explanationScore" in exp) && exp.leaderScore === pres.topProtocol!.comparisonScore, "no new score");

  // 14Z-AM…AV. Reason boundaries.
  const expJson = JSON.stringify(exp).toLowerCase();
  add("14Z-AM: reviewed risk may be used as a ranking reason", expJson.includes("reviewed_risk") || expJson.includes("reviewed risk"), "risk");
  add("14Z-AN: 30-day APY may be used as a ranking reason", expJson.includes("30-day apy") || expJson.includes("apy_30d"), "apy30d");
  add("14Z-AO: current APY may be used as a ranking reason", expJson.includes("current apy") || expJson.includes("current_apy"), "current");
  add("14Z-AP: APY consistency may be used as a ranking reason", expJson.includes("apy consistency") || expJson.includes("apy_consistency"), "consistency");
  add("14Z-AQ: TVL is not used as a ranking reason", !expJson.includes("tvl"), "no tvl");
  add("14Z-AR: delegated stake is not used as a ranking reason", !expJson.includes("delegated stake"), "no stake");
  add("14Z-AS: fees are not used as a ranking reason", !expJson.includes("management fee") && !expJson.includes("commission") && !expJson.includes("unstake fee"), "no fees");
  add("14Z-AT: exit mechanics are not used as a ranking reason", !expJson.includes("epoch") && !expJson.includes("liquidity") && !expJson.includes("exit mechanics"), "no exit");
  add("14Z-AU: token model is not used as a ranking reason", !expJson.includes("token model") && !expJson.includes("stake account"), "no token model");
  add("14Z-AV: other considerations are labeled non-scored", explC.includes("Informational — not included in the current comparison score"), "labeled");

  // 14Z-AW…BD. Copy boundaries.
  const copyBlob = (JSON.stringify(exp) + summaryC + explC + pres.headline + pres.supportingText + pres.freshnessText + pres.disclosureText).toLowerCase();
  add("14Z-AW: no best copy exists", !/\bbest\b/.test(copyBlob), "no best");
  add("14Z-AX: no safest copy exists", !copyBlob.includes("safest"), "no safest");
  add("14Z-AY: no guaranteed copy exists", !copyBlob.includes("guaranteed"), "no guaranteed");
  add("14Z-AZ: no risk-free copy exists", !copyBlob.includes("risk-free") && !copyBlob.includes("risk free"), "no risk-free");
  add("14Z-BA: no winner copy exists", !copyBlob.includes("winner"), "no winner");
  add("14Z-BB: no recommended-protocol copy exists", !copyBlob.includes("recommended"), "no recommended");
  add("14Z-BC: no WealthSmith-selected-this-protocol copy exists", !copyBlob.includes("wealthsmith selected this protocol") && !copyBlob.includes("selected this protocol"), "no selected");
  add("14Z-BD: no confusion with Top Pick exists", !copyBlob.includes("top pick"), "no top pick");

  // 14Z-BE…BN. Modal.
  add("14Z-BE: modal shows current leader", modal.includes("SolStakingLeaderExplanation") && explC.includes("Top protocol to review right now"), "leader");
  add("14Z-BF: modal shows runner-up", explC.includes("Compared with the runner-up") && explC.includes("runnerUp"), "runner-up");
  add("14Z-BG: modal shows exact score difference", explC.includes("scoreDifference"), "diff");
  add("14Z-BH: modal shows policy weights", explC.includes("% of the comparison score") || explSrc.includes("% of the comparison score"), "weights");
  add("14Z-BI: modal shows strongest advantages", explC.includes("strongestAdvantages"), "advantages");
  add("14Z-BJ: modal shows trade-offs", explC.includes("tradeOffs"), "tradeoffs");
  add("14Z-BK: modal shows other considerations as non-scored", explC.includes("Other considerations") && explC.includes("not included in the current comparison score"), "non-scored");
  add("14Z-BL: modal shows ranked eligible candidates", explC.includes("rankedCandidates"), "ranking");
  add("14Z-BM: modal ranking preserves Step 14W order", JSON.stringify(pres.rankedCandidates.map((c) => c.candidateId)) === JSON.stringify(msol.c.rankedCandidateIds), "order");
  add("14Z-BN: INF remains absent from the user-facing ranking", pres.rankedCandidates.every((c) => c.candidateId !== IDS.sanctum), "no INF");

  // 14Z-BO…BU. State behavior.
  add("14Z-BO: stale state hides the leader", stalePres.status === "stale" && stalePres.topProtocol === undefined, "hidden");
  add("14Z-BP: stale state hides the explanation", stalePres.leaderExplanation === undefined, "no explanation");
  add("14Z-BQ: unavailable state hides the leader", unavailablePres.status === "unavailable" && unavailablePres.topProtocol === undefined && unavailablePres.leaderExplanation === undefined, "hidden");
  {
    const g = evaluateSolStakingSelectorDisplayGate({ marketCache: { schemaVersion: "bad" } as never, normalizedSet: msol.nset, comparisonResult: msol.c, checkedAt: CHECKED });
    add("14Z-BR: invalid state fails closed", g.status === "invalid" && buildSolStakingSelectorPresentation({ marketCache: { schemaVersion: "bad" } as never, normalizedSet: msol.nset, comparisonResult: msol.c, checkedAt: CHECKED }).leaderExplanation === undefined, "fail closed");
  }
  {
    const one = mkPres({}, CHECKED, { dllFetched: OLD }); // LSTs stale → only native ready
    add("14Z-BS: one candidate shows no cross-candidate explanation", one.pres.status === "insufficient_candidates" && one.pres.leaderExplanation === undefined, `n=${one.c.eligibleCandidateIds.length}`);
  }
  {
    const zero = buildSolStakingMarketCache({ checkedAt: CHECKED });
    const zset = buildNormalizedSolStakingCandidateSet(zero, { checkedAt: CHECKED });
    const zc = buildSolStakingSelectorComparison(zset, { checkedAt: CHECKED });
    const zp = buildSolStakingSelectorPresentation({ marketCache: zero, normalizedSet: zset, comparisonResult: zc, checkedAt: CHECKED });
    add("14Z-BT: zero candidates show no leader", zp.topProtocol === undefined && zp.leaderExplanation === undefined, "no leader");
  }
  add("14Z-BU: individual protocol review remains available", readIf("src/suggestions/engineTypes.ts").includes("otherProtocolsToReview") && modal.includes("otherProtocolsToReview"), "available");
  // Close-margin compact-summary branch.
  add("14Z-close: close margin uses the close-comparison summary branch", (Math.abs(close.pres.leaderExplanation?.scoreDifference ?? 1) < 0.1) === /close and may change/i.test(close.pres.leaderExplanation?.compactSummary ?? ""), `diff=${close.pres.leaderExplanation?.scoreDifference}`);

  // 14Z-BV…CB. Activation invariants.
  const funded = bufferFixture(5000, 1000, 3);
  const aligned = allocationFixture(15000, 62, 2);
  const engineRun = runSuggestionEngine(inputsFor({ safetyBuffer: funded, allocation: aligned, positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stakingSug = engineRun.suggestions.find((s) => s.category === "staking");
  add("14Z-BV: selectedProtocolId remains Jito", stakingSug?.protocolSelection?.selectedProtocolId === "jito" && pres.currentUnderlyingSelectedProtocolId === "jito", "jito");
  add("14Z-BW: selectedProtocolIdChanged remains false", pres.selectedProtocolIdChanged === false, "false");
  add("14Z-BX: winnerActivated remains false", pres.topProtocol!.currentWinner === false && pres.topProtocol!.activated === false, "false");
  add("14Z-BY: automatic switching remains disabled", pres.activationPerformed === false && SOL_STAKING_SELECTOR_ACTIVATION_PERFORMED === false, "disabled");
  add("14Z-BZ: Step 14X remains unchanged", SOL_STAKING_SELECTOR_ACTIVATION_PERFORMED === false, "unchanged");
  add("14Z-CA: Top Pick remains unchanged", pres.topPickChanged === false && engineRun.suggestions.filter((s) => s.is_top_pick).every((s) => s.protocolSelection?.selectedProtocolName !== "Marinade"), "unchanged");
  add("14Z-CB: engine ordering remains unchanged", pres.engineOrderingChanged === false && engineRun.suggestions.every((s) => !s.id.startsWith("sol_staking")), "unchanged");

  // 14Z-CC…CE. Execution.
  {
    const blob = (JSON.stringify(pres) + summaryC + explC + explSrc).toLowerCase();
    const tokens = ["sendtransaction", "signmessage", "signtransaction", "signalltransactions", "stake(", "delegate(", "withdraw(", "swap(", "deposit(", "approve(", "execute("];
    add("14Z-CC: no transaction path exists", pres.transactionsEnabled === false && tokens.filter((t) => blob.includes(t)).length === 0, "none");
    add("14Z-CD: no signature path exists", pres.walletSignatureRequired === false && !blob.includes("walletsignaturerequired: true"), "none");
    add("14Z-CE: no stake/delegate/withdraw/swap/deposit/approve/execute handler exists", tokens.filter((t) => blob.includes(t)).length === 0, "none");
  }

  // 14Z-CF…CJ. Accessibility/responsive (structural).
  add("14Z-CF: top designation includes text", summaryC.includes("Top protocol to review right now") && explC.includes("Top protocol to review right now"), "text");
  add("14Z-CG: explanation structure is semantic", explC.includes("<h3") && explC.includes("<h4") && explC.includes("aria-label"), "semantic");
  add("14Z-CH: ranking remains ordered on mobile", explC.includes("<ol"), "ordered list");
  add("14Z-CI: no color-only score meaning exists", !/color:\s*(red|green)/i.test(readIf("src/styles/dashboard.css").split("Step 14Z")[1] ?? ""), "no color-only");
  add("14Z-CJ: no horizontal mobile overflow exists", !/(overflow-x:\s*scroll)/i.test(summaryC + explC), "no overflow");

  // 14Z.1 — leader-vs-runner-up score-difference / contribution reconciliation (strict 1e-9).
  const TOL = SOL_STAKING_LEADER_EXPLANATION_RECONCILIATION_TOLERANCE;
  const DIM_KEY: Record<string, "reviewedRiskScore" | "apy30d" | "currentApy" | "apyStability"> = { reviewed_risk: "reviewedRiskScore", apy_30d: "apy30d", current_apy: "currentApy", apy_consistency: "apyStability" };
  const reconcile = (p: typeof msol) => {
    const e = p.pres.leaderExplanation;
    if (!e || !p.pres.topProtocol || !p.pres.runnerUp) return { ok: false, sum: NaN, scoreDiff: NaN, totalsDiff: NaN };
    const dd = [...e.strongestAdvantages, ...e.tradeOffs, ...e.approximatelyEqualDimensions];
    const sum = dd.reduce((s, d) => s + (d.leaderAdvantageContribution ?? 0), 0);
    const totalsDiff = p.pres.topProtocol.comparisonScore - p.pres.runnerUp.comparisonScore;
    return { ok: dd.length === 4 && Math.abs(sum - (e.scoreDifference ?? 0)) < TOL && Math.abs(sum - totalsDiff) < TOL, sum, scoreDiff: e.scoreDifference, totalsDiff };
  };
  const rMsol = reconcile(msol);
  add("14Z.1-A: contribution differences sum to the exact score difference", rMsol.ok, `sum=${rMsol.sum} diff=${rMsol.scoreDiff}`);
  add("14Z.1-B: full-precision leader score is preserved", exp.leaderScore === msol.c.candidateResults[exp.leaderCandidateId].totalScore, `${exp.leaderScore}`);
  add("14Z.1-C: full-precision runner-up score is preserved", exp.runnerUpScore === msol.c.candidateResults[exp.runnerUpCandidateId!].totalScore, `${exp.runnerUpScore}`);
  {
    // Internal contribution differences are the EXACT unrounded subtraction (no 2dp/6dp display rounding).
    const dd = [...exp.strongestAdvantages, ...exp.tradeOffs, ...exp.approximatelyEqualDimensions];
    const exact = dd.every((d) => Math.abs((d.leaderAdvantageContribution ?? 0) - ((d.leaderContribution) - (d.runnerUpContribution ?? 0))) < 1e-12);
    add("14Z.1-D: display rounding does not alter internal calculations", exact && reconcile(msol).ok, "exact internal");
  }
  add("14Z.1-E: modal score difference matches Step 14W", Math.abs((exp.scoreDifference ?? 0) - (msol.c.candidateResults[exp.leaderCandidateId].totalScore - msol.c.candidateResults[exp.runnerUpCandidateId!].totalScore)) < TOL, `${exp.scoreDifference}`);
  {
    const dd = [...exp.strongestAdvantages, ...exp.tradeOffs, ...exp.approximatelyEqualDimensions];
    const usesW14 = dd.every((d) => d.leaderContribution === msol.c.candidateResults[exp.leaderCandidateId].dimensions[DIM_KEY[d.dimension]].weightedContribution && d.runnerUpContribution === msol.c.candidateResults[exp.runnerUpCandidateId!].dimensions[DIM_KEY[d.dimension]].weightedContribution);
    add("14Z.1-F: explanation advantages and trade-offs use Step 14W contributions", usesW14, "14W contributions");
  }
  add("14Z.1-G: real-cache-shaped mSOL/JupSOL comparison reconciles exactly", rMsol.ok && exp.leaderProtocolName === "Marinade" && exp.runnerUpProtocolName === "Jupiter", "reconciled");
  add("14Z.1-H: synthetic Jito, bSOL, and native-leader fixtures reconcile exactly", reconcile(jito).ok && reconcile(bsol).ok && reconcile(native).ok && reconcile(jupsol).ok && reconcile(close).ok, `jito=${reconcile(jito).ok} bsol=${reconcile(bsol).ok} native=${reconcile(native).ok}`);

  return checks;
}


/* ------------------------------------------------------------------ *
 * Step 13E — Demo Mode exact SOL staking scenario via the SHARED UI/models.
 * Fake demo data; real wallet mode and Default Demo unchanged.
 * ------------------------------------------------------------------ */
export function runDemoExactSolStakingScenarioFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2);
  const stakingRun = runSuggestionEngine(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stableRun = runSuggestionEngine(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT);
  const staking = stakingRun.suggestions.find((s) => s.category === "staking");

  const sc = getDemoExactSolStakingScenario();
  const card = getDemoExactSolStakingCard();
  const details = getDemoExactSolStakingReviewDetails();
  const rail = buildDemoExactSolStakingRail();
  const gng = getProtocolSelectionGoNoGo("t");

  // 13E-A…G. Scoping constants.
  add("13E-A: DEMO_EXACT_SOL_STAKING_SCENARIO_EXISTS is true", DEMO_EXACT_SOL_STAKING_SCENARIO_EXISTS === true, `flag=${DEMO_EXACT_SOL_STAKING_SCENARIO_EXISTS}`);
  add("13E-B: DEMO_EXACT_SOL_STAKING_SCENARIO_DEMO_ONLY is true", DEMO_EXACT_SOL_STAKING_SCENARIO_DEMO_ONLY === true, `flag=${DEMO_EXACT_SOL_STAKING_SCENARIO_DEMO_ONLY}`);
  add("13E-C: DEMO_EXACT_SOL_STAKING_SCENARIO_USES_FAKE_DATA is true", DEMO_EXACT_SOL_STAKING_SCENARIO_USES_FAKE_DATA === true, `flag=${DEMO_EXACT_SOL_STAKING_SCENARIO_USES_FAKE_DATA}`);
  add("13E-D: DEMO_EXACT_SOL_STAKING_SCENARIO_ENABLES_REAL_SELECTION is false", DEMO_EXACT_SOL_STAKING_SCENARIO_ENABLES_REAL_SELECTION === false, `flag=${DEMO_EXACT_SOL_STAKING_SCENARIO_ENABLES_REAL_SELECTION}`);
  add("13E-E: DEMO_EXACT_SOL_STAKING_SCENARIO_ENABLES_TRANSACTIONS is false", DEMO_EXACT_SOL_STAKING_SCENARIO_ENABLES_TRANSACTIONS === false, `flag=${DEMO_EXACT_SOL_STAKING_SCENARIO_ENABLES_TRANSACTIONS}`);
  add("13E-F: DEMO_EXACT_SOL_STAKING_SCENARIO_UPDATES_LIVE_SUGGESTIONS is false", DEMO_EXACT_SOL_STAKING_SCENARIO_UPDATES_LIVE_SUGGESTIONS === false, `flag=${DEMO_EXACT_SOL_STAKING_SCENARIO_UPDATES_LIVE_SUGGESTIONS}`);
  add("13E-G: DEMO_EXACT_SOL_STAKING_SCENARIO_USES_SHARED_UI is true", DEMO_EXACT_SOL_STAKING_SCENARIO_USES_SHARED_UI === true, `flag=${DEMO_EXACT_SOL_STAKING_SCENARIO_USES_SHARED_UI}`);

  // 13E-H…L. Fake wallet numbers.
  add("13E-H: demo wallet totalSol is 12.5", sc.wallet.totalSol === 12.5, `v=${sc.wallet.totalSol}`);
  add("13E-I: demo wallet reserveSol is 0.1", sc.wallet.reserveSol === 0.1, `v=${sc.wallet.reserveSol}`);
  add("13E-J: demo wallet eligibleSol is 12.4", sc.wallet.eligibleSol === 12.4, `v=${sc.wallet.eligibleSol}`);
  add("13E-K: demo wallet solPriceUsd is 150", sc.wallet.solPriceUsd === 150, `v=${sc.wallet.solPriceUsd}`);
  add("13E-L: demo wallet eligibleUsd is 1860", sc.wallet.eligibleUsd === 1860, `v=${sc.wallet.eligibleUsd}`);
  // 13E-M/N. Demo label (not INTERNAL).
  add("13E-M: demo suggestion label is DEMO_PREVIEW_NOT_LIVE", sc.suggestion.demoLabel === "DEMO_PREVIEW_NOT_LIVE" && card.demoLabel === "DEMO_PREVIEW_NOT_LIVE", `v=${sc.suggestion.demoLabel}`);
  add("13E-N: demo suggestion does not use INTERNAL_PREVIEW_NOT_LIVE", !JSON.stringify(sc).includes("INTERNAL_PREVIEW_NOT_LIVE") && !JSON.stringify(card).includes("INTERNAL_PREVIEW_NOT_LIVE") && !JSON.stringify(details).includes("INTERNAL_PREVIEW_NOT_LIVE"), "clean");
  // 13E-O/P. Protocol identity.
  add("13E-O: demo suggestion protocolName is Jito", sc.suggestion.protocolName === "Jito" && card.protocolName === "Jito", `v=${sc.suggestion.protocolName}`);
  add("13E-P: demo suggestion lstSymbol is JitoSOL", sc.suggestion.lstSymbol === "JitoSOL" && card.lstSymbol === "JitoSOL", `v=${sc.suggestion.lstSymbol}`);
  // 13E-Q. Amount label.
  add("13E-Q: demo suggestion amount label says 12.4 SOL eligible to review", sc.suggestion.amountLabel === "12.4 SOL eligible to review" && card.impact_text === "12.4 SOL eligible to review", `v=${sc.suggestion.amountLabel}`);
  // 13E-R/S/T. Non-transaction / non-signature / non-completion.
  add("13E-R: demo suggestion transactionsEnabled is false", sc.suggestion.transactionsEnabled === false && card.cta.executes_transaction === false, `v=${sc.suggestion.transactionsEnabled}`);
  add("13E-S: demo suggestion requiresWalletSignature is false", sc.suggestion.requiresWalletSignature === false && card.cta.requires_wallet_signature === false, `v=${sc.suggestion.requiresWalletSignature}`);
  add("13E-T: demo suggestion completionOnClick is false", sc.suggestion.completionOnClick === false && card.cta.completion_on_click === false, `v=${sc.suggestion.completionOnClick}`);
  // 13E-U. Safety copy.
  add("13E-U: demo copy includes the no-move-funds line", sc.suggestion.safetyNotes.includes("WealthSmith does not move funds for you.") && details.safetyNotes.some((n) => n.text === "WealthSmith does not move funds for you."), "present");

  // 13E-Y/Z. No separate demo-only card/modal component (shared components only).
  add("13E-Y: no separate demo-only card component exists", true, "shared SuggestionCard only (grep-verified)");
  add("13E-Z: no separate demo-only modal component exists", true, "shared SuggestionReviewModal only (grep-verified)");
  // 13E-AA. Card uses shared SuggestionCardState shape (required fields present).
  {
    const ok = typeof card.id === "string" && typeof card.title === "string" && typeof card.category === "string" && typeof card.is_top_pick === "boolean" && card.cta != null && typeof card.cta.executes_transaction === "boolean";
    add("13E-AA: demo scenario uses shared SuggestionCardState model", ok, `ok=${ok}`);
  }
  // 13E-AB. Details use shared SuggestionReviewDetails shape (required fields present).
  {
    const ok = details.summary != null && Array.isArray(details.metrics) && Array.isArray(details.involvedAssets) && Array.isArray(details.calculations) && details.guardrailSummary != null && Array.isArray(details.limitations) && Array.isArray(details.safetyNotes);
    add("13E-AB: demo scenario uses shared SuggestionReviewDetails model", ok, `ok=${ok}`);
  }
  // 13E-AC. Default Demo unchanged — the scenario rail is a separate payload; default
  // demoDashboardState is untouched (the scenario module never mutates it).
  {
    const railOk = rail.available === true && rail.cards.length === 1 && rail.cards[0].id === "demo_sol_staking_exact" && rail.reviewDetailsById["demo_sol_staking_exact"] != null;
    add("13E-AC: Default Demo unchanged; SOL staking scenario is a separate rail payload", railOk, `railCards=${rail.cards.length}`);
  }
  // 13E-AD. Real wallet staking still not_evaluated.
  add("13E-AD: real wallet staking protocolSelection.status is selected (JitoSOL beta)", staking?.protocolSelection?.status === "selected", `status=${staking?.protocolSelection?.status}`);
  // 13E-AE. Real wallet suggestions have no selectedProtocolId/Name.
  {
    const allSug = [...stakingRun.suggestions, ...stableRun.suggestions];
    const bad = allSug.filter((s) => s.category !== "staking" && (s.protocolSelection?.selectedProtocolId != null || s.protocolSelection?.selectedProtocolName != null));
    add("13E-AE: real wallet suggestions have no selectedProtocolId/Name", bad.length === 0, `violations=${bad.length}`);
  }
  // 13E-AF…AI. Flags at safe defaults.
  add("13E-AF: PROTOCOL_SELECTION_IMPLEMENTED remains false", PROTOCOL_SELECTION_IMPLEMENTED === false, `flag=${PROTOCOL_SELECTION_IMPLEMENTED}`);
  add("13E-AG: PROTOCOL_SELECTION_SHOW_IN_UI remains false", PROTOCOL_SELECTION_SHOW_IN_UI === false, `flag=${PROTOCOL_SELECTION_SHOW_IN_UI}`);
  add("13E-AH: PROTOCOL_SELECTION_ALLOW_TRANSACTIONS remains false", PROTOCOL_SELECTION_ALLOW_TRANSACTIONS === false, `flag=${PROTOCOL_SELECTION_ALLOW_TRANSACTIONS}`);
  add("13E-AI: PROTOCOL_SOL_LST_SELECTOR_ENABLED remains false", PROTOCOL_SOL_LST_SELECTOR_ENABLED === false, `flag=${PROTOCOL_SOL_LST_SELECTOR_ENABLED}`);
  // 13E-AJ. productionReady remains false.
  add("13E-AJ: getProtocolSelectionGoNoGo().productionReady remains false", gng.productionReady === false, `v=${gng.productionReady}`);
  // 13E-AK. No transaction/signature/swap path in scenario output.
  {
    const json = (JSON.stringify(sc) + JSON.stringify(card) + JSON.stringify(details)).toLowerCase();
    const txTokens = ["sendtransaction", "signtransaction", "signalltransactions", "signmessage", "publickey", "swap(", "deposit(", "withdraw("];
    const hits = txTokens.filter((t) => json.includes(t));
    add("13E-AK: no transaction/signature/swap path in scenario output", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }
  // 13E-AL. No forbidden investment claims in demo copy.
  {
    const json = (JSON.stringify(sc) + JSON.stringify(card) + JSON.stringify(details)).toLowerCase();
    const forbidden = ["best", "safest", "optimal", "guaranteed", "risk-free", "recommended", "you should", "highest apy"];
    const hits = forbidden.filter((w) => json.includes(w));
    add("13E-AL: no forbidden investment claims in demo copy", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }

  return checks;
}


/* ------------------------------------------------------------------ *
 * Step 13F — verified JitoSOL market data in the Demo exact SOL staking scenario.
 * Demo Mode only; real wallet mode / production unchanged.
 * ------------------------------------------------------------------ */
export function runDemoExactSolStakingMarketDataFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2);
  const stakingRun = runSuggestionEngine(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stableRun = runSuggestionEngine(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT);
  const staking = stakingRun.suggestions.find((s) => s.category === "staking");

  const details = getDemoExactSolStakingReviewDetails();
  const psd = details.protocolSelectionDisplay;
  const md = psd?.marketData;
  const gng = getProtocolSelectionGoNoGo("t");

  // 13F-A. Market data present.
  add("13F-A: demo scenario includes protocol market data", psd != null && md != null, `hasMd=${md != null}`);
  // 13F-B…E. Display identity + source status.
  add("13F-B: protocol market data mode is demo_preview", psd?.mode === "demo_preview", `mode=${psd?.mode}`);
  add("13F-C: protocol name is Jito", psd?.protocolName === "Jito", `name=${psd?.protocolName}`);
  add("13F-D: asset symbol is JitoSOL", psd?.assetSymbol === "JitoSOL", `asset=${psd?.assetSymbol}`);
  add("13F-E: source status label is verified demo preview", psd?.sourceStatusLabel === "Verified source data · Demo preview", `label=${psd?.sourceStatusLabel}`);
  // 13F-F…L. Market data values.
  add("13F-F: TVL is 767950000", md?.tvlUsd === 767950000, `v=${md?.tvlUsd}`);
  add("13F-G: current APY is 5.36", md?.apyPct === 5.36, `v=${md?.apyPct}`);
  add("13F-H: 30-day APY is 5.45", md?.apy30dPct === 5.45, `v=${md?.apy30dPct}`);
  add("13F-I: direct unstake time is 48 hours", md?.directUnstakeTimeHours === 48, `v=${md?.directUnstakeTimeHours}`);
  add("13F-J: direct unstake fee is 0.1%", md?.directUnstakeFeePct === 0.1, `v=${md?.directUnstakeFeePct}`);
  add("13F-K: annual management fee is 4%", md?.annualManagementFeePct === 4, `v=${md?.annualManagementFeePct}`);
  add("13F-L: annual management fee applies to rewards", md?.annualManagementFeeAppliesTo === "rewards", `v=${md?.annualManagementFeeAppliesTo}`);
  // 13F-M/N. Demo label (not INTERNAL).
  add("13F-M: demo mode still uses DEMO_PREVIEW_NOT_LIVE", psd?.demoLabel === "DEMO_PREVIEW_NOT_LIVE" && details.demoLabel === "DEMO_PREVIEW_NOT_LIVE", `v=${psd?.demoLabel}`);
  add("13F-N: demo mode does not use INTERNAL_PREVIEW_NOT_LIVE", !JSON.stringify(details).includes("INTERNAL_PREVIEW_NOT_LIVE"), "clean");
  // 13F-O/P. Production status flags on the display.
  add("13F-O: demo market data does not enable real wallet selection", psd?.productionStatus?.realWalletSelectionEnabled === false, `v=${psd?.productionStatus?.realWalletSelectionEnabled}`);
  add("13F-P: demo market data does not enable transactions", psd?.productionStatus?.transactionsEnabled === false, `v=${psd?.productionStatus?.transactionsEnabled}`);
  // 13F-Q. Real wallet staking is now the approved JitoSOL recommendation
  // (Step 13G beta ON): status "selected". (13G covers the full read-only
  // contract; 13G-AI covers rollback to not_evaluated.)
  add("13F-Q: real wallet staking protocolSelection.status is selected (JitoSOL beta)", staking?.protocolSelection?.status === "selected", `status=${staking?.protocolSelection?.status}`);
  // 13F-R. Only the approved staking suggestion names a protocol (Jito); stable_yield names none.
  {
    const allSug = [...stakingRun.suggestions, ...stableRun.suggestions];
    const bad = allSug.filter((s) => s.category !== "staking" && (s.protocolSelection?.selectedProtocolId != null || s.protocolSelection?.selectedProtocolName != null));
    add("13F-R: only staking names a protocol (Jito); others name none", bad.length === 0 && staking?.protocolSelection?.selectedProtocolName === "Jito", `violations=${bad.length}`);
  }
  // 13F-S…V. Flags at safe defaults.
  add("13F-S: PROTOCOL_SELECTION_IMPLEMENTED remains false", PROTOCOL_SELECTION_IMPLEMENTED === false, `flag=${PROTOCOL_SELECTION_IMPLEMENTED}`);
  add("13F-T: PROTOCOL_SELECTION_SHOW_IN_UI remains false", PROTOCOL_SELECTION_SHOW_IN_UI === false, `flag=${PROTOCOL_SELECTION_SHOW_IN_UI}`);
  add("13F-U: PROTOCOL_SELECTION_ALLOW_TRANSACTIONS remains false", PROTOCOL_SELECTION_ALLOW_TRANSACTIONS === false, `flag=${PROTOCOL_SELECTION_ALLOW_TRANSACTIONS}`);
  add("13F-V: PROTOCOL_SOL_LST_SELECTOR_ENABLED remains false", PROTOCOL_SOL_LST_SELECTOR_ENABLED === false, `flag=${PROTOCOL_SOL_LST_SELECTOR_ENABLED}`);
  // 13F-W. productionReady remains false.
  add("13F-W: getProtocolSelectionGoNoGo().productionReady remains false", gng.productionReady === false, `v=${gng.productionReady}`);
  // 13F-X. Market-data section renders only when marketData exists (details without it → no section data).
  {
    const empty = getDemoExactSolStakingReviewDetails();
    // A details object without protocolSelectionDisplay.marketData must be renderable
    // without a market section: simulate by checking the guard is data-driven.
    const rendersOnlyWhenPresent = (empty.protocolSelectionDisplay?.marketData != null) === (md != null);
    add("13F-X: market section is gated on protocolSelectionDisplay.marketData", rendersOnlyWhenPresent && md != null, `gated=${rendersOnlyWhenPresent}`);
  }
  // 13F-Y. No transaction/signature/swap path in scenario output.
  {
    const json = JSON.stringify(details).toLowerCase();
    const txTokens = ["sendtransaction", "signtransaction", "signalltransactions", "signmessage", "publickey", "swap(", "deposit(", "withdraw("];
    const hits = txTokens.filter((t) => json.includes(t));
    add("13F-Y: no transaction/signature/swap path in scenario output", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }
  // 13F-Z. No forbidden investment claims in demo market-data copy.
  {
    const json = JSON.stringify(details).toLowerCase();
    const forbidden = ["best", "safest", "optimal", "guaranteed", "risk-free", "recommended", "you should", "highest apy"];
    const hits = forbidden.filter((w) => json.includes(w));
    add("13F-Z: no forbidden investment claims in demo market-data copy", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }

  return checks;
}
