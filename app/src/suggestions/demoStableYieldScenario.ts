/**
 * demoStableYieldScenario — Step 16H-D. Deterministic DEMO-ONLY inputs that drive one valid Stable
 * Yield suggestion through the SAME canonical pipeline as Real Wallet (16G plan decision → 16H-A
 * suggestion → 16H-B presentation → 16H-C shared card/review). Every value here is fixture-scoped and
 * is NEVER used by the Real Wallet production path (`deriveStableYieldPlanSuggestion` branches on
 * `dataMode`): a synthetic approved demo product + capacity + comparison leader + capital snapshot that
 * never touch `listYieldStrategies()` / the production registry. No execution, no transaction.
 */
import type { WalletPosition } from "../wallet/walletPosition";
import type { SavedGoal } from "../types/goal";
import { deriveRailSuggestions, type RailSuggestions } from "./useRailSuggestions";
import { buildDemoMarketCacheInput, DEMO_MARKET_CACHE_STATE } from "./demoMarketConditions";
import { buildYieldStrategyPlanDecision } from "./yieldStrategyPlan";
import type { YieldStrategyPlanDecision } from "./yieldStrategyPlanTypes";
import type { YieldStrategyRegistryEntry } from "./yieldStrategyRegistryTypes";
import type { YieldStrategyProductCapacitySnapshot } from "./yieldStrategyProductCapacity";
import type { YieldStrategyEligibilitySet } from "./yieldStrategyEligibilityTypes";
import type { YieldStrategyComparisonSet } from "./yieldStrategyComparisonTypes";
import type { YieldStrategyEligibleCapitalSnapshot } from "./yieldStrategyPositionTypes";
import type { StableYieldSuggestionApyProvenance } from "./yieldStrategyPlanSuggestionTypes";

/** Fixed deterministic demo clock so the demo plan/suggestion id is stable across rerenders. */
export const DEMO_STABLE_YIELD_PRICED_AS_OF = Date.UTC(2026, 6, 15, 0, 0, 0);
export const DEMO_STABLE_YIELD_CHECKED_AT = new Date(DEMO_STABLE_YIELD_PRICED_AS_OF).toISOString();
export const DEMO_STABLE_YIELD_OWNER = "DemoWallet1111111111111111111111111111111111";

/** Demo APY provenance (fixture-scoped; preserved verbatim, never inferred). */
export const DEMO_STABLE_YIELD_APY: StableYieldSuggestionApyProvenance = {
  netApyPct: 5.15,
  apyDefinition: "net",
  apyWindow: "current",
  sourceId: "demo_protocol_api",
  sourceLabel: "Demo protocol API",
  provenanceKind: "live_protocol_api",
  checkedAt: "2026-07-15 00:00 UTC",
};

/** A DEMO-ONLY approved exact product — never added to the production registry. */
const DEMO_ENTRY: YieldStrategyRegistryEntry = {
  schemaVersion: "1.0.0", registryVersion: "1.0.0",
  strategyId: "demo_usdc_yield_vault",
  displayName: "Demo USDC Yield Vault",
  protocolId: "kamino", protocolDisplayName: "Kamino",
  strategyType: "managed_vault", principalAsset: "USDC",
  supportedLane: "excess_usdc_yield", riskLane: "excess_only",
  lifecycle: "approved",
  officialUrl: "https://app.kamino.finance", documentationUrl: "https://docs.kamino.finance",
  address: "DemoUsdcYieldVaultAddr111111111111111111111",
  marketDataEvaluated: false, eligibilityEvaluated: false, comparisonEvaluated: false, suggestionGenerated: false, transactionsEnabled: false, walletSignatureRequired: false,
  notes: [],
};

const DEMO_CAPACITY: YieldStrategyProductCapacitySnapshot = {
  schemaVersion: "1.0.0", policyId: "yield_strategy_product_capacity_v1", policyVersion: "1.0.0",
  strategyId: "demo_usdc_yield_vault", protocolId: "kamino", productAddress: "DemoUsdcYieldVaultAddr111111111111111111111", principalAssetId: "USDC",
  capacityMode: "explicit_remaining_capacity", acceptingDeposits: true, remainingDepositCapacityUsd: 250000,
  sourceId: "demo_capacity", sourceLabel: "Demo capacity", provenanceKind: "documented_source", browserFetched: false,
  fetchedAt: DEMO_STABLE_YIELD_CHECKED_AT, checkedAt: DEMO_STABLE_YIELD_CHECKED_AT, maximumAgeMs: 3600000, ageMs: 0,
  status: "complete", warnings: [], blockers: [],
  productSelected: false, amountSelected: false, planGenerated: false, suggestionGenerated: false, transactionsEnabled: false, walletSignatureRequired: false,
};

const demoLeaderPos = { lane: "excess", held: false, matchedPositionIds: [] as string[], positionCount: 0, status: "leader_not_held", warnings: [], blockers: [] };
const demoNoLeaderPos = { lane: "buffer", held: false, matchedPositionIds: [] as string[], positionCount: 0, status: "no_comparison_leader", warnings: [], blockers: [] };

const DEMO_CAPITAL = {
  schemaVersion: "1.0.0", policyId: "yield_strategy_capital_v1", policyVersion: "1.0.0",
  ownerAddress: DEMO_STABLE_YIELD_OWNER, checkedAt: DEMO_STABLE_YIELD_CHECKED_AT, status: "ready",
  requiredBufferUsd: 3000, directWalletEligibleBufferUsd: 3500, existingEligibleBufferYieldUsd: 0, currentEligibleBufferUsd: 3500,
  bufferShortfallUsd: 0, canonicalBufferSurplusUsd: 500, bufferComplete: true,
  vaultAllocationPct: 0.7, walletAllocationPct: 0.3, allowedBufferYieldUsd: 2100, requiredWalletFloorUsd: 900, remainingBufferYieldCapacityUsd: 2100,
  directLiquidUsdcUsd: 6000, rawBufferYieldCapitalUsd: 0, bufferYieldEligibleCapitalUsd: 0, bufferYieldMinimumPolicyAvailable: false,
  rawExcessYieldCapitalUsd: 500, excessYieldEligibleCapitalUsd: 500, excessYieldMinimumUsd: 250, excessYieldMeetsMinimum: true,
  maximumCombinedSourceCapitalUsd: 500, sharedSourceOverlapPossible: false, sharedSourceOverlapUsd: 0,
  bufferLeaderPositionStatus: demoNoLeaderPos, excessLeaderPositionStatus: demoLeaderPos,
  comparisonPerformed: false, productSelected: false, amountSelected: false, planGenerated: false, suggestionGenerated: false, updatesProductOutput: false, transactionsEnabled: false, walletSignatureRequired: false,
  blockers: [], warnings: [], notes: [],
} as unknown as YieldStrategyEligibleCapitalSnapshot;

const demoLaneComp = (lane: string, leader: boolean) => ({ schemaVersion: "1.0.0", policyId: "yield_strategy_comparison_v1", policyVersion: "1.0.0", lane, status: leader ? "complete" : "empty_eligible_set", checkedAt: DEMO_STABLE_YIELD_CHECKED_AT, candidateScorecards: [], orderedStrategyIds: [], ...(leader ? { comparisonLeaderStrategyId: "demo_usdc_yield_vault", comparisonLeaderScore: 84 } : {}), leaderSelectionReason: leader ? "highest_stable_score" : "none_empty_set", tieAnalysis: {}, sensitivityAnalysis: {}, walletPositionsEvaluated: false, userCapitalEvaluated: false, amountCalculated: false, planGenerated: false, suggestionGenerated: false, updatesProductOutput: false, transactionsEnabled: false, walletSignatureRequired: false, warnings: [], blockers: [], notes: [] });
const DEMO_COMPARISON = { schemaVersion: "1.0.0", policyId: "yield_strategy_comparison_v1", policyVersion: "1.0.0", checkedAt: DEMO_STABLE_YIELD_CHECKED_AT, bufferComparison: demoLaneComp("buffer", false), excessComparison: demoLaneComp("excess", true), excessComparisonLeaderStrategyId: "demo_usdc_yield_vault", emptyApprovedSet: false, emptyBufferEligibleSet: true, emptyExcessEligibleSet: false, comparisonPerformed: true, rankingPerformed: true, walletPositionsEvaluated: false, userCapitalEvaluated: false, amountCalculated: false, planGenerated: false, suggestionGenerated: false, updatesProductOutput: false, transactionsEnabled: false, walletSignatureRequired: false, warnings: [], blockers: [], notes: [] } as unknown as YieldStrategyComparisonSet;
const DEMO_ELIGIBILITY = { bufferEligibleStrategyIds: [] as string[], excessEligibleStrategyIds: ["demo_usdc_yield_vault"] } as unknown as YieldStrategyEligibilitySet;

/**
 * The deterministic DEMO Stable Yield 16G plan decision (a ready excess-lane plan). It runs through the
 * REAL `buildYieldStrategyPlanDecision` on a synthetic demo registry — never the production registry.
 */
export function buildDemoStableYieldDecision(checkedAt: string = DEMO_STABLE_YIELD_CHECKED_AT): YieldStrategyPlanDecision {
  return buildYieldStrategyPlanDecision({
    ownerAddress: DEMO_STABLE_YIELD_OWNER,
    checkedAt,
    registry: [DEMO_ENTRY],
    eligibilitySet: DEMO_ELIGIBILITY,
    comparisonSet: DEMO_COMPARISON,
    capitalSnapshot: DEMO_CAPITAL,
    productCapacitySet: [DEMO_CAPACITY],
  });
}

/* ------------------------------------------------------------------ *
 * A funded-buffer, in-target demo portfolio that lets the engine surface the Stable Yield card. The
 * canonical Demo (demoContributionScenario) stays buffer-INCOMPLETE and correctly suppresses yield.
 * ------------------------------------------------------------------ */
export const DEMO_STABLE_YIELD_POSITIONS: WalletPosition[] = [
  { id: "demo-sy-sol", source: "wallet", type: "native", symbol: "SOL", amount: "0", detection: "direct_wallet_balance", valueUsd: 9000, priceUsd: 150 },
  { id: "demo-sy-usdc", source: "wallet", type: "token", symbol: "USDC", name: "USD Coin", amount: "0", detection: "direct_wallet_balance", valueUsd: 6000 },
];
export const DEMO_STABLE_YIELD_GOAL: SavedGoal = { financial_goal: "build_long_term_wealth", risk_tolerance: "medium", timeline: "5_years", contribution_frequency: "monthly", income_monthly: 4000, expenses_monthly: 1000, monthly_saving_goal: 1000 };

/**
 * Build a funded-buffer demo rail that visibly demonstrates the Stable Yield card through the SAME
 * shared engine (`deriveRailSuggestions`, dataMode `demo_fixture`). Rendered through the shared
 * `RealWalletSuggestionsRail` → shared card + shared review modal. No production registry mutation.
 */
export function buildDemoStableYieldRail(): RailSuggestions {
  const data = deriveRailSuggestions({ positions: DEMO_STABLE_YIELD_POSITIONS, pricedAsOf: DEMO_STABLE_YIELD_PRICED_AS_OF, goal: DEMO_STABLE_YIELD_GOAL, dataMode: "demo_fixture", marketConditionsCacheInput: buildDemoMarketCacheInput(DEMO_STABLE_YIELD_PRICED_AS_OF), marketConditionsCacheState: DEMO_MARKET_CACHE_STATE, targetGeneratedAt: DEMO_STABLE_YIELD_PRICED_AS_OF });
  return { ...data, loading: false };
}
