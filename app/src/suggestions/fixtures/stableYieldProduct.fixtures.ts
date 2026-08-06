/**
 * Stable Yield product-surface checks: category, capital efficiency, plan suggestion + UI, product integration, release gate, market-conditions surface.
 *
 * Extracted verbatim from suggestionEngine.fixtures.ts (final monolith dissolution).
 * The monolith aggregates these checks in printFixtureResults; behavior and check
 * names are unchanged.
 */
import { MARKET_CONDITION_CACHE_VERSION } from "../marketConditionCache";
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
import type { SavedGoal } from "../../types/goal";
// Step 24A — asset-ownership registry + dedicated JUP staking modules (fixtures below).
import { ALLOCATION_METHODOLOGY } from "../../state/approvedCopy";
import { toSuggestionCard } from "../toSuggestionCard";
import { readdirSync, readFileSync } from "node:fs";
import { CATEGORY_PRIORITY, selectTopPick as selectTopPick15H } from "../topPick";
import { listYieldStrategies, getYieldStrategy, getApprovedYieldStrategies } from "../yieldStrategyRegistry";
import { STABLE_YIELD_UI_ENABLED, STABLE_YIELD_TESTING_EXISTS, STABLE_YIELD_EXECUTION_ENABLED } from "../investmentTargetRegistry";
import type { YieldStrategyComparisonSet as CMP_Set } from "../yieldStrategyComparisonTypes";
import type { YieldStrategyEligibilitySet as ELIG_EligSet } from "../yieldStrategyEligibilityTypes";
import { type YieldStrategyProductCapacitySnapshot as PLAN_Cap } from "../yieldStrategyProductCapacity";
import { buildYieldStrategyPlanId } from "../yieldStrategyPlanPolicy";
import { buildYieldStrategyPlanDecision } from "../yieldStrategyPlan";
import { YIELD_STRATEGY_PLAN_SELECTS_PRODUCT, YIELD_STRATEGY_PLAN_SELECTS_FINAL_AMOUNT, STABLE_YIELD_PLAN_PREPARES_EXECUTION, STABLE_YIELD_PLAN_BUILDS_TRANSACTION, STABLE_YIELD_PLAN_REQUESTS_SIGNATURE } from "../investmentTargetRegistry";
import type { YieldStrategyEligibleCapitalSnapshot as PLAN_CapitalSnap } from "../yieldStrategyPositionTypes";
import { YIELD_STRATEGY_PLAN_SUGGESTION_EXISTS, buildStableYieldPlanSuggestion, validateStableYieldPlanSuggestion, stableYieldSuggestionId } from "../yieldStrategyPlanSuggestion";
import { YIELD_STRATEGY_SUGGESTION_SCHEMA_VERSION, YIELD_STRATEGY_SUGGESTION_POLICY_ID, YIELD_STRATEGY_SUGGESTION_ID_PREFIX } from "../yieldStrategyPlanSuggestionTypes";
import { STABLE_YIELD_SUGGESTIONS_EXIST as SY_SUGG_EXIST, STABLE_YIELD_SUGGESTION_CONTRACT_EXISTS, STABLE_YIELD_PLAN_TO_SUGGESTION_EXISTS, STABLE_YIELD_SUGGESTION_PARTICIPATES_IN_ORDERING, STABLE_YIELD_SUGGESTION_TOP_PICK_ELIGIBLE, STABLE_YIELD_SUGGESTION_CARD_EXISTS, STABLE_YIELD_SUGGESTION_REVIEW_MODAL_EXISTS, STABLE_YIELD_SMITH_AI_INTEGRATION_EXISTS, STABLE_YIELD_SUGGESTION_EXECUTION_EXISTS, STABLE_YIELD_CARD_PRESENTATION_CONTRACT_EXISTS, STABLE_YIELD_REVIEW_PRESENTATION_CONTRACT_EXISTS, STABLE_YIELD_DETERMINISTIC_COPY_MAPPING_EXISTS, STABLE_YIELD_PRESENTATION_VALIDATION_EXISTS, STABLE_YIELD_REVIEW_ONLY_CTA_INTENT_EXISTS, STABLE_YIELD_RENDERED_CARD_EXISTS, STABLE_YIELD_RENDERED_REVIEW_MODAL_EXISTS, STABLE_YIELD_TESTING_VISUAL_FIXTURES_EXIST } from "../investmentTargetRegistry";
import { buildStableYieldPlanPresentation, stableYieldApyPresentation } from "../yieldStrategyPlanPresentation";
import { toSuggestionCard as SY_toSuggestionCard } from "../toSuggestionCard";
import { STABLE_YIELD_TESTING_FIXTURES, STABLE_YIELD_TESTING_CARD_FIXTURES, STABLE_YIELD_TESTING_REVIEW_FIXTURES, STABLE_YIELD_TESTING_NON_RENDER_FIXTURES, STABLE_YIELD_TESTING_FIXTURES_EXIST as SY_TEST_FIXTURES_EXIST } from "../stableYieldTestingFixtures";
import { STABLE_YIELD_SHARED_CARD_MAPPER_EXISTS, STABLE_YIELD_REVIEW_UI_EXISTS, STABLE_YIELD_ACCESSIBILITY_BEHAVIOR_EXISTS, STABLE_YIELD_DEMO_MODE_INTEGRATION_EXISTS, STABLE_YIELD_REAL_WALLET_INTEGRATION_EXISTS, STABLE_YIELD_PROTOCOL_EXTERNAL_ACTION_CTA_EXISTS, STABLE_YIELD_SHARED_PRODUCT_ORCHESTRATION_EXISTS, STABLE_YIELD_EXECUTES_TRANSACTION, STABLE_YIELD_REQUIRES_WALLET_SIGNATURE } from "../investmentTargetRegistry";
import {
  STABLE_YIELD_SUGGESTION_TRANSACTION_CONSTRUCTION_EXISTS,
  STABLE_YIELD_SUGGESTION_SIGNATURE_FLOW_EXISTS,
  STABLE_YIELD_SUGGESTION_DEMO_UI_EXISTS,
  STABLE_YIELD_SUGGESTION_REAL_WALLET_UI_EXISTS,
  YIELD_STRATEGY_PRODUCT_CAPACITY_EXISTS,
  YIELD_STRATEGY_PLAN_EXISTS,
} from "../investmentTargetRegistry";
import { deriveStableYieldPlanSuggestion, STABLE_YIELD_PRODUCT_ORCHESTRATION_EXISTS } from "../stableYieldProductInput";
import { buildDemoStableYieldRail, buildDemoStableYieldDecision, DEMO_STABLE_YIELD_POSITIONS, DEMO_STABLE_YIELD_GOAL, DEMO_STABLE_YIELD_PRICED_AS_OF } from "../demoStableYieldScenario";
import { deriveRailSuggestions as SY_deriveRail } from "../useRailSuggestions";
import { deriveSafetyBuffer as SY_deriveBuffer } from "../../wallet/walletSummary";
import { getSafetyBufferTargetMonths as SY_bufferMonths } from "../../wallet/safetyBufferTarget";
import type { YieldStrategyRegistryEntry as ELIG_Entry } from "../yieldStrategyRegistryTypes";
import type { FixtureCheck } from "./fixtureCheck";
import { runSuggestionEngine, runEngineWithLegacyRebalance, FIXTURE_GENERATED_AT, bufferFixture, allocationFixture, solPosition, cryptoPosition, stablePosition, yieldPosition, inputsFor } from "./engineFixtureHarness";

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
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: aligned(),
        safetyBuffer: bufferFixture(800, 1000, 3),
        
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
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: aligned(),
        safetyBuffer: funded(),
        
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
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: offTarget(),
        safetyBuffer: funded(),
        
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
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: aligned(),
        safetyBuffer: funded(),
        
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
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: aligned(),
        safetyBuffer: funded(),
        
        positions: [stablePosition("USDC", 50)],
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9C-E: funded + liquid stable < $100 → no stable_yield, On Track",
      !has(r, "stable_yield") && cats(r).split(",").every((c) => c === "on_track") && cats(r) !== "none",
      `categories=${cats(r)}`
    );
  }

  // 9C-F. Stables held in a PROTOCOL position (not liquid wallet) → no new stable_yield.
  {
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: aligned(),
        safetyBuffer: funded(),
        
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
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: aligned(),
        safetyBuffer: funded(),
        
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
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: aligned(),
        safetyBuffer: funded(),
        
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
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: aligned(),
        safetyBuffer: funded(),
        
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
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: aligned(),
        safetyBuffer: funded(),
        
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
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: aligned(),
        safetyBuffer: bufferFixture(800, 1000, 3),
        
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

  // 9E-B. Step 24A TEARDOWN — funded + a lone non-core crypto token no longer produces a generic
  // capital_efficiency card. With no other candidate it falls back to On Track.
  {
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [cryptoPosition(400)] }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9E-B: funded + idle token → NO capital_efficiency (retired), On Track",
      !has(r, "capital_efficiency") && cats(r).split(",").every((c) => c === "on_track") && cats(r) !== "none",
      `categories=${cats(r)}`
    );
  }

  // 9E-C. Step 24A TEARDOWN — Rebalance applies + a lone idle token → Rebalance only (no capital_efficiency).
  {
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: offTarget(), safetyBuffer: funded(), positions: [cryptoPosition(400)] }),
      FIXTURE_GENERATED_AT
    );
    const reb = r.suggestions.find((s) => s.category === "rebalance");
    add(
      "9E-C: rebalance + idle token → rebalance only, NO capital_efficiency",
      !has(r, "capital_efficiency") && has(r, "rebalance") && reb?.is_top_pick === true,
      `categories=${cats(r)} rebTop=${reb?.is_top_pick}`
    );
  }

  // 9E-D. Step 24A TEARDOWN — a non-core crypto token + liquid SOL + stablecoins no longer yields a
  // generic capital_efficiency card; only Staking + Stable Yield fire (Staking Top Pick).
  {
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: aligned(),
        safetyBuffer: funded(),

        positions: [cryptoPosition(400), solPosition(10), stablePosition("USDC", 10000)],
      }),
      FIXTURE_GENERATED_AT
    );
    const staking = r.suggestions.find((s) => s.category === "staking");
    add(
      "9E-D: staking + stable_yield only (NO capital_efficiency), staking Top Pick",
      !has(r, "capital_efficiency") && has(r, "staking") && has(r, "stable_yield") && staking?.is_top_pick === true,
      `categories=${cats(r)} stakingTop=${staking?.is_top_pick}`
    );
  }

  // 9E-E. Idle token value < $100 → no capital_efficiency → On Track.
  {
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [cryptoPosition(50)] }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9E-E: idle token < $100 → no capital_efficiency, On Track",
      !has(r, "capital_efficiency") && cats(r).split(",").every((c) => c === "on_track") && cats(r) !== "none",
      `categories=${cats(r)}`
    );
  }

  // 9E-F. Idle token ≥ $100 but < 2% of portfolio ($200 / 15,000 = 1.3%) → no capital_efficiency.
  {
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [cryptoPosition(200)] }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9E-F: idle token below 2% share → no capital_efficiency, On Track",
      !has(r, "capital_efficiency") && cats(r).split(",").every((c) => c === "on_track") && cats(r) !== "none",
      `categories=${cats(r)}`
    );
  }

  // 9E-G. Only liquid SOL → no capital_efficiency (staking may apply).
  {
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [solPosition(10)] }),
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
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [stablePosition("USDC", 10000)] }),
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
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [yieldPosition(5000, null)] }),
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
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [unpriced] }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9E-J: unpriced idle token → no capital_efficiency",
      !has(r, "capital_efficiency"),
      `categories=${cats(r)}`
    );
  }

  // 9E-K. Step 24A TEARDOWN — partial pricing still surfaces the warning, but a priced idle token no
  // longer produces a generic capital_efficiency card.
  {
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: aligned(),
        safetyBuffer: funded(),

        positions: [cryptoPosition(5000)],
        anyUnpriced: true,
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9E-K: partial pricing + priced idle token → NO capital_efficiency, warning preserved",
      !has(r, "capital_efficiency") && r.warnings.includes("partial_pricing"),
      `categories=${cats(r)} warnings=${r.warnings.join(",")}`
    );
  }

  // 9E-L. Step 24A TEARDOWN — the retired rule produces NO card at all, and no "Review Idle Assets"
  // title/type leaks through the mapper from any produced suggestion.
  {
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [cryptoPosition(5000)] }),
      FIXTURE_GENERATED_AT
    );
    const cards = r.suggestions.map(toSuggestionCard);
    add(
      "9E-L: no capital_efficiency suggestion; no 'Review Idle Assets' card leaks through the mapper",
      !has(r, "capital_efficiency") &&
        cards.every((c) => c.title !== "Review Idle Assets" && c.type !== "review_idle_assets"),
      `categories=${cats(r)}`
    );
  }

  return checks;
}


export function runYieldStrategyPlanSuggestionFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const root = process.cwd();
  const readIf = (rel: string) => { try { return readFileSync(`${root}/${rel}`, "utf8"); } catch { return ""; } };
  const T = "2026-07-16T00:00:00.000Z";
  const OWNER = "OwnerSugg111111111111111111111111111111111";

  // ---- Compact 16G decision factories (synthetic; never touch the production registry) ----
  const approvedEntry = (o: Partial<ELIG_Entry> = {}): ELIG_Entry => ({ schemaVersion: "1.0.0", registryVersion: "1.0.0", strategyId: "syn", displayName: "Syn", protocolId: "kamino", protocolDisplayName: "Kamino", strategyType: "lending", principalAsset: "USDC", supportedLane: "safety_buffer_yield", riskLane: "buffer_eligible", lifecycle: "approved", officialUrl: "https://app.kamino.finance", documentationUrl: "https://docs.kamino.finance", address: "ADDR", marketDataEvaluated: false, eligibilityEvaluated: false, comparisonEvaluated: false, suggestionGenerated: false, transactionsEnabled: false, walletSignatureRequired: false, notes: [], ...o });
  const EX_ENTRY = approvedEntry({ strategyId: "syn_ex", displayName: "Syn Excess Vault", supportedLane: "excess_usdc_yield", riskLane: "excess_only", strategyType: "managed_vault", address: "ADDR_EX" });
  const BUF_ENTRY = approvedEntry({ strategyId: "syn_buf", displayName: "Syn Buffer Lending", supportedLane: "safety_buffer_yield", riskLane: "buffer_eligible", strategyType: "lending", address: "ADDR_BUF" });
  const mkLeaderPos = (status: string) => ({ lane: "buffer", held: status === "leader_held" || status === "leader_held_multiple_positions", matchedPositionIds: [], positionCount: 0, status, warnings: [], blockers: [] });
  const mkCapacity = (o: Partial<PLAN_Cap> = {}): PLAN_Cap => ({ schemaVersion: "1.0.0", policyId: "yield_strategy_product_capacity_v1", policyVersion: "1.0.0", strategyId: "syn_ex", protocolId: "kamino", productAddress: "ADDR_EX", principalAssetId: "USDC", capacityMode: "explicit_remaining_capacity", acceptingDeposits: true, remainingDepositCapacityUsd: 100000, sourceId: "cap_src", provenanceKind: "documented_source", browserFetched: false, fetchedAt: T, checkedAt: T, maximumAgeMs: 3600000, ageMs: 0, status: "complete", warnings: [], blockers: [], productSelected: false, amountSelected: false, planGenerated: false, suggestionGenerated: false, transactionsEnabled: false, walletSignatureRequired: false, ...o });
  interface CapOpts { bufferCap?: number; excessCap?: number; directBuffer?: number; surplus?: number; current?: number; maxCombined?: number; excessLeaderPos?: string; bufferLeaderPos?: string; }
  const mkCapital = (o: CapOpts = {}): PLAN_CapitalSnap => ({ schemaVersion: "1.0.0", policyId: "yield_strategy_capital_v1", policyVersion: "1.0.0", ownerAddress: OWNER, checkedAt: T, status: "ready", requiredBufferUsd: 1000, directWalletEligibleBufferUsd: o.directBuffer ?? 1500, existingEligibleBufferYieldUsd: 0, currentEligibleBufferUsd: o.current ?? 1500, bufferShortfallUsd: 0, canonicalBufferSurplusUsd: o.surplus ?? 500, bufferComplete: true, vaultAllocationPct: 0.7, walletAllocationPct: 0.3, allowedBufferYieldUsd: 700, requiredWalletFloorUsd: 300, remainingBufferYieldCapacityUsd: 700, directLiquidUsdcUsd: 5000, rawBufferYieldCapitalUsd: o.bufferCap ?? 0, bufferYieldEligibleCapitalUsd: o.bufferCap ?? 0, bufferYieldMinimumPolicyAvailable: false, rawExcessYieldCapitalUsd: o.excessCap ?? 0, excessYieldEligibleCapitalUsd: o.excessCap ?? 0, excessYieldMinimumUsd: 250, excessYieldMeetsMinimum: (o.excessCap ?? 0) >= 250, maximumCombinedSourceCapitalUsd: o.maxCombined ?? ((o.bufferCap ?? 0) + (o.excessCap ?? 0)), sharedSourceOverlapPossible: false, sharedSourceOverlapUsd: 0, bufferLeaderPositionStatus: mkLeaderPos(o.bufferLeaderPos ?? "no_comparison_leader"), excessLeaderPositionStatus: mkLeaderPos(o.excessLeaderPos ?? "no_comparison_leader"), comparisonPerformed: false, productSelected: false, amountSelected: false, planGenerated: false, suggestionGenerated: false, updatesProductOutput: false, transactionsEnabled: false, walletSignatureRequired: false, blockers: [], warnings: [], notes: [] } as unknown as PLAN_CapitalSnap);
  const mkLaneComp = (lane: string, o: { status?: string; leader?: string; score?: number; reason?: string }) => ({ schemaVersion: "1.0.0", policyId: "yield_strategy_comparison_v1", policyVersion: "1.0.0", lane, status: o.status ?? "empty_eligible_set", checkedAt: T, candidateScorecards: [], orderedStrategyIds: [], ...(o.leader ? { comparisonLeaderStrategyId: o.leader } : {}), ...(o.score !== undefined ? { comparisonLeaderScore: o.score } : {}), leaderSelectionReason: o.reason ?? "none_empty_set", tieAnalysis: {}, sensitivityAnalysis: {}, walletPositionsEvaluated: false, userCapitalEvaluated: false, amountCalculated: false, planGenerated: false, suggestionGenerated: false, updatesProductOutput: false, transactionsEnabled: false, walletSignatureRequired: false, warnings: [], blockers: [], notes: [] });
  const mkComparison = (buffer: { status?: string; leader?: string; score?: number; reason?: string }, excess: { status?: string; leader?: string; score?: number; reason?: string }) => ({ schemaVersion: "1.0.0", policyId: "yield_strategy_comparison_v1", policyVersion: "1.0.0", checkedAt: T, bufferComparison: mkLaneComp("buffer", buffer), excessComparison: mkLaneComp("excess", excess), ...(buffer.leader ? { bufferComparisonLeaderStrategyId: buffer.leader } : {}), ...(excess.leader ? { excessComparisonLeaderStrategyId: excess.leader } : {}), emptyApprovedSet: false, emptyBufferEligibleSet: false, emptyExcessEligibleSet: false, comparisonPerformed: true, rankingPerformed: true, walletPositionsEvaluated: false, userCapitalEvaluated: false, amountCalculated: false, planGenerated: false, suggestionGenerated: false, updatesProductOutput: false, transactionsEnabled: false, walletSignatureRequired: false, warnings: [], blockers: [], notes: [] } as unknown as CMP_Set);
  const elig = (buffer: string[], excess: string[]) => ({ bufferEligibleStrategyIds: buffer, excessEligibleStrategyIds: excess } as unknown as ELIG_EligSet);
  interface DecideOpts { registry?: ELIG_Entry[]; eligibilitySet?: ELIG_EligSet; comparisonSet?: CMP_Set; capitalSnapshot?: PLAN_CapitalSnap; productCapacitySet?: PLAN_Cap[]; bufferMin?: number; }
  const decide = (o: DecideOpts) => buildYieldStrategyPlanDecision({ ownerAddress: OWNER, checkedAt: T, registry: o.registry ?? [], eligibilitySet: o.eligibilitySet ?? elig([], []), comparisonSet: o.comparisonSet ?? mkComparison({}, {}), capitalSnapshot: o.capitalSnapshot ?? mkCapital(), ...(o.productCapacitySet ? { productCapacitySet: o.productCapacitySet } : {}), ...(o.bufferMin !== undefined ? { bufferMinimumOverrideUsd: o.bufferMin } : {}) });
  const excessReadyDecision = (capOver: CapOpts = {}, capacityOver: Partial<PLAN_Cap> = {}) => decide({ registry: [EX_ENTRY], eligibilitySet: elig([], ["syn_ex"]), comparisonSet: mkComparison({ status: "empty_eligible_set", reason: "none_empty_set" }, { status: "complete", leader: "syn_ex", score: 80, reason: "highest_stable_score" }), capitalSnapshot: mkCapital({ excessCap: 500, directBuffer: 1500, surplus: 500, current: 1500, maxCombined: 500, excessLeaderPos: "leader_not_held", ...capOver }), productCapacitySet: [mkCapacity({ strategyId: "syn_ex", productAddress: "ADDR_EX", ...capacityOver })] });
  const bufferReadyDecision = () => decide({ registry: [BUF_ENTRY], eligibilitySet: elig(["syn_buf"], []), comparisonSet: mkComparison({ status: "complete", leader: "syn_buf", score: 85, reason: "highest_stable_score" }, { status: "empty_eligible_set", reason: "none_empty_set" }), capitalSnapshot: mkCapital({ bufferCap: 700, directBuffer: 1000, surplus: 0, current: 1000, maxCombined: 700, bufferLeaderPos: "leader_not_held" }), productCapacitySet: [mkCapacity({ strategyId: "syn_buf", productAddress: "ADDR_BUF" })], bufferMin: 50 });

  const sy = (decision: ReturnType<typeof decide>, opts = {}) => buildStableYieldPlanSuggestion(decision, { generatedAt: 1_000_000, ...opts });
  const suggBlob = ["yieldStrategyPlanSuggestionTypes", "yieldStrategyPlanSuggestion"].map((f) => readIf(`src/suggestions/${f}.ts`)).join("").toLowerCase();

  // ---- Versions + flags ----
  add("16H-A-A: suggestion schema/policy versions exist", YIELD_STRATEGY_SUGGESTION_SCHEMA_VERSION === "1.0.0" && YIELD_STRATEGY_SUGGESTION_POLICY_ID === "yield_strategy_suggestion_v1" && YIELD_STRATEGY_PLAN_SUGGESTION_EXISTS === true, YIELD_STRATEGY_SUGGESTION_POLICY_ID);
  add("16H-A-B: engine-level suggestion flags are true", SY_SUGG_EXIST === true && STABLE_YIELD_SUGGESTION_CONTRACT_EXISTS === true && STABLE_YIELD_PLAN_TO_SUGGESTION_EXISTS === true && STABLE_YIELD_SUGGESTION_PARTICIPATES_IN_ORDERING === true && STABLE_YIELD_SUGGESTION_TOP_PICK_ELIGIBLE === true, "true");
  // 16H-F: card/modal/UI flags legitimately flipped true at 16H-C/16H-D; Smith-AI + execution stay false.
  add("16H-A-C: Smith-AI / execution / transaction / signature flags remain false", STABLE_YIELD_SMITH_AI_INTEGRATION_EXISTS === false && STABLE_YIELD_SUGGESTION_EXECUTION_EXISTS === false && STABLE_YIELD_SUGGESTION_TRANSACTION_CONSTRUCTION_EXISTS === false && STABLE_YIELD_SUGGESTION_SIGNATURE_FLOW_EXISTS === false && STABLE_YIELD_EXECUTION_ENABLED === false, "false");

  // ---- Conversion: ready plan → suggestion ----
  const exSugg = sy(excessReadyDecision());
  add("16H-A-D: a valid excess Stable Yield plan becomes a suggestion", exSugg.suggestion !== null && exSugg.suggestion!.category === "stable_yield" && exSugg.diagnostic.emitted === true, "emitted");
  add("16H-A-E: a valid buffer Stable Yield plan becomes a suggestion when a canonical minimum is injected", sy(bufferReadyDecision()).suggestion !== null && sy(bufferReadyDecision()).meta!.lane === "buffer", "emitted");
  add("16H-A-F: buffer lane suggestion classification (singular reason)", sy(bufferReadyDecision()).suggestion!.reason_codes.length === 1 && sy(bufferReadyDecision()).suggestion!.reason_codes[0] === "stable_yield_buffer_lane_ready", "buffer reason");
  add("16H-A-G: excess lane suggestion classification (singular reason)", exSugg.suggestion!.reason_codes.length === 1 && exSugg.suggestion!.reason_codes[0] === "stable_yield_excess_lane_ready", "excess reason");
  add("16H-A-H: selected strategy identity is unchanged", exSugg.meta!.strategyId === "syn_ex" && exSugg.meta!.productAddress === "ADDR_EX" && exSugg.meta!.protocolId === "kamino", "unchanged");
  add("16H-A-I: selected amount is unchanged", exSugg.meta!.amountUsd === excessReadyDecision().selectedPlan!.amountUsd && exSugg.suggestion!.amount!.valueUsd === 500 && exSugg.meta!.amountCents === 50000, "500");
  add("16H-A-J: plan ID is preserved", exSugg.meta!.sourcePlanId === excessReadyDecision().selectedPlan!.planId, "preserved");
  add("16H-A-K: suggestion ID is stable + derived from the plan ID", exSugg.suggestion!.id === stableYieldSuggestionId(excessReadyDecision().selectedPlan!.planId) && exSugg.suggestion!.id.startsWith(YIELD_STRATEGY_SUGGESTION_ID_PREFIX), "stable id");
  add("16H-A-L: APY provenance is preserved verbatim when supplied (and absent otherwise)", exSugg.meta!.apy === undefined && sy(excessReadyDecision(), { apyProvenance: { netApyPct: 5.2, apyDefinition: "net", apyWindow: "current", sourceId: "src", sourceLabel: "Src" } }).meta!.apy!.netApyPct === 5.2, "provenance");
  add("16H-A-M: capacity metadata is preserved", exSugg.meta!.capacityMode === "explicit_remaining_capacity" && exSugg.meta!.effectiveProductCapacityUsd === excessReadyDecision().selectedPlan!.effectiveProductCapacityUsd, "capacity");
  add("16H-A-N: before/after projections are preserved verbatim", exSugg.meta!.projection.currentEligibleBufferAfterUsd === excessReadyDecision().selectedPlan!.projection.currentEligibleBufferAfterUsd && exSugg.meta!.projection.bufferCoveragePreserved === true && exSugg.meta!.projection.walletFloorPreserved === true, "projection");
  add("16H-A-O: direct_wallet_usdc funding source is preserved", exSugg.meta!.fundingSource === "direct_wallet_usdc" && exSugg.suggestion!.from!.bucket === "stables", "direct usdc");
  add("16H-A-P: start_new_position is preserved", exSugg.meta!.actionMode === "start_new_position", "start");
  add("16H-A-Q: add_to_existing_strategy is preserved", sy(excessReadyDecision({ excessLeaderPos: "leader_held" })).meta!.actionMode === "add_to_existing_strategy", "add");

  // ---- Suppression: no suggestion cases ----
  add("16H-A-R: no leader produces no suggestion", sy(decide({ registry: [EX_ENTRY], eligibilitySet: elig([], ["syn_ex"]), comparisonSet: mkComparison({ status: "empty_eligible_set" }, { status: "empty_eligible_set" }), capitalSnapshot: mkCapital({ excessCap: 500 }), productCapacitySet: [mkCapacity({})] })).suggestion === null, "suppressed");
  add("16H-A-S: tied leader produces no suggestion", sy(decide({ registry: [EX_ENTRY], eligibilitySet: elig([], ["syn_ex"]), comparisonSet: mkComparison({ status: "empty_eligible_set" }, { status: "leader_withheld_tie", reason: "none_material_tie" }), capitalSnapshot: mkCapital({ excessCap: 500 }), productCapacitySet: [mkCapacity({})] })).diagnostic.reason === "comparison_leader_withheld_tie", "tie");
  add("16H-A-T: ambiguous action mode (leader position) produces no suggestion", sy(excessReadyDecision({ excessLeaderPos: "leader_position_ambiguous" })).suggestion === null, "ambiguous");
  add("16H-A-U: missing capacity produces no suggestion", sy(excessReadyDecision({}, { strategyId: "wrong" })).suggestion === null, "missing capacity");
  add("16H-A-V: product_full produces no suggestion", sy(excessReadyDecision({}, { capacityMode: "product_full", acceptingDeposits: false })).suggestion === null, "full");
  add("16H-A-W: deposits_paused produces no suggestion", sy(excessReadyDecision({}, { capacityMode: "deposits_paused", acceptingDeposits: false })).suggestion === null, "paused");
  add("16H-A-X: unknown capacity produces no suggestion", sy(excessReadyDecision({}, { capacityMode: "unknown" })).suggestion === null, "unknown");
  add("16H-A-Y: invalid capacity produces no suggestion", sy(excessReadyDecision({}, { browserFetched: true })).suggestion === null, "invalid");
  add("16H-A-Z: missing buffer minimum produces no buffer suggestion", sy(decide({ registry: [BUF_ENTRY], eligibilitySet: elig(["syn_buf"], []), comparisonSet: mkComparison({ status: "complete", leader: "syn_buf", score: 85, reason: "highest_stable_score" }, { status: "empty_eligible_set" }), capitalSnapshot: mkCapital({ bufferCap: 700, directBuffer: 1000, current: 1000, maxCombined: 700, bufferLeaderPos: "leader_not_held" }), productCapacitySet: [mkCapacity({ strategyId: "syn_buf", productAddress: "ADDR_BUF" })] })).suggestion === null, "no buffer min");
  add("16H-A-AA: $250 excess boundary qualifies", sy(excessReadyDecision({ excessCap: 250, surplus: 250, directBuffer: 1250, current: 1250, maxCombined: 250 })).suggestion !== null, "250 qualifies");
  add("16H-A-AB: $249.99 excess does not qualify", sy(excessReadyDecision({ excessCap: 249.99, surplus: 249.99, directBuffer: 1249.99, current: 1249.99, maxCombined: 249.99 })).suggestion === null, "249.99 no");
  add("16H-A-AC: suppression diagnostics preserve the stage + reason", sy(excessReadyDecision({}, { capacityMode: "product_full", acceptingDeposits: false })).diagnostic.suppressionStage === "planning" && sy(excessReadyDecision({}, { capacityMode: "product_full", acceptingDeposits: false })).diagnostic.reason === "product_full", "diagnostics");

  // ---- Production ----
  const prodDecision = decide({ comparisonSet: mkComparison({ status: "empty_eligible_set" }, { status: "empty_eligible_set" }), capitalSnapshot: mkCapital({}) });
  add("16H-A-AD: no approved production product produces no suggestion", getApprovedYieldStrategies().length === 0 && sy(prodDecision).suggestion === null && sy(prodDecision).diagnostic.emitted === false, "no suggestion");
  add("16H-A-AE: Steakhouse remains excluded (identity_verified but unapproved cannot become a leader-backed suggestion)", getYieldStrategy("kamino_steakhouse_usdc")!.lifecycle === "identity_verified" && sy(decide({ registry: [], eligibilitySet: elig([], ["kamino_steakhouse_usdc"]), comparisonSet: mkComparison({ status: "empty_eligible_set" }, { status: "complete", leader: "kamino_steakhouse_usdc", score: 80, reason: "highest_stable_score" }), capitalSnapshot: mkCapital({ excessCap: 500 }), productCapacitySet: [] })).suggestion === null, "excluded");
  add("16H-A-AF: Hubble receives no protocol-name penalty (a future approved Hubble product converts)", (() => { const HUB = approvedEntry({ strategyId: "hub_y", protocolId: "hubble", protocolDisplayName: "Hubble", supportedLane: "excess_usdc_yield", riskLane: "excess_only", strategyType: "managed_vault", address: "HUB_ADDR" }); const d = decide({ registry: [HUB], eligibilitySet: elig([], ["hub_y"]), comparisonSet: mkComparison({ status: "empty_eligible_set" }, { status: "complete", leader: "hub_y", score: 70, reason: "highest_stable_score" }), capitalSnapshot: mkCapital({ excessCap: 500, directBuffer: 1500, surplus: 500, current: 1500, maxCombined: 500, excessLeaderPos: "leader_not_held" }), productCapacitySet: [mkCapacity({ strategyId: "hub_y", protocolId: "hubble", productAddress: "HUB_ADDR" })] }); const s = sy(d); return s.suggestion !== null && s.meta!.protocolId === "hubble"; })(), "no penalty");

  // ---- Engine ordering + Top Pick (deterministic) ----
  const fundedBuf = () => bufferFixture(5000, 1000, 3); // funded (target $3,000)
  const alignedAlloc = () => allocationFixture(15000, 62, 2); // no rebalance
  const rebalanceAlloc = () => allocationFixture(15000, 90, 25); // large delta → rebalance fires
  const engInputs = (alloc: ReturnType<typeof allocationFixture>) => inputsFor({ safetyBuffer: fundedBuf(), allocation: alloc, positions: [stablePosition("USDC", 10000)] });
  const engSugg = sy(excessReadyDecision()).suggestion!;
  {
    const r = runSuggestionEngine(engInputs(alignedAlloc()), FIXTURE_GENERATED_AT, null, engSugg);
    const syInResult = r.suggestions.find((s) => s.category === "stable_yield");
    add("16H-A-AG: the plan-backed suggestion participates in engine ordering (category stable_yield)", !!syInResult && syInResult.id === engSugg.id, "ordered");
    add("16H-A-AH: only one Top Pick exists", r.suggestions.filter((s) => s.is_top_pick).length <= 1, "one top pick");
    add("16H-A-AI: capital-efficiency/higher categories outrank stable_yield (stable_yield not Top Pick when a higher category is present)", (() => { const hasHigher = r.suggestions.some((s) => s.is_top_pick && s.category !== "stable_yield"); return syInResult ? (syInResult.is_top_pick === false ? hasHigher || r.suggestions.length === 1 : true) : false; })(), "ranking");
  }
  {
    // Underfunded buffer → the buffer correction suppresses every candidate incl. stable yield.
    const under = inputsFor({ allocation: alignedAlloc(), safetyBuffer: bufferFixture(800, 1000, 3), positions: [stablePosition("USDC", 10000)] });
    const r = runSuggestionEngine(under, FIXTURE_GENERATED_AT, null, engSugg);
    add("16H-A-AJ: an existing higher-priority buffer correction outranks (suppresses) excess Stable Yield", r.suggestions.every((s) => s.category !== "stable_yield") && r.suggestions.some((s) => s.category === "buffer"), "buffer wins");
  }
  {
    // Rebalance fires → stable yield is suppressed (canonical hierarchy). 18G: the isolated-regression helper
    // supplies the rebalance candidate (the engine no longer has a silent legacy fallback).
    const r = runEngineWithLegacyRebalance(engInputs(rebalanceAlloc()), FIXTURE_GENERATED_AT, null, engSugg);
    add("16H-A-AK: rebalance + Stable Yield ordering follows the canonical hierarchy (rebalance suppresses stable yield)", r.suggestions.some((s) => s.category === "rebalance") && r.suggestions.every((s) => s.category !== "stable_yield"), "rebalance suppresses");
  }
  {
    const r1 = runSuggestionEngine(engInputs(alignedAlloc()), FIXTURE_GENERATED_AT, null, engSugg);
    const r2 = runSuggestionEngine(engInputs(alignedAlloc()), FIXTURE_GENERATED_AT, null, engSugg);
    add("16H-A-AL: deterministic repeat evaluation (same order + Top Pick)", JSON.stringify(r1.suggestions.map((s) => [s.id, s.is_top_pick])) === JSON.stringify(r2.suggestions.map((s) => [s.id, s.is_top_pick])), "deterministic");
  }
  add("16H-A-AM: timestamps do not destabilize the suggestion ID", buildStableYieldPlanSuggestion(excessReadyDecision(), { generatedAt: 1 }).suggestion!.id === buildStableYieldPlanSuggestion(excessReadyDecision(), { generatedAt: 999999 }).suggestion!.id, "stable id");
  add("16H-A-AN: production run passes no plan-backed suggestion → no stable_yield card", runSuggestionEngine(engInputs(alignedAlloc()), FIXTURE_GENERATED_AT, null, null).suggestions.every((s) => s.stableYieldPlan === undefined), "none");

  // ---- Read-only / no execution ----
  add("16H-A-AO: the suggestion carries read-only, non-custodial metadata", exSugg.meta!.readOnly === true && exSugg.meta!.externalManagementRequired === true && exSugg.suggestion!.action_kind === "review_only", "read-only");
  add("16H-A-AP: no execution/transaction/signature fields are created", exSugg.meta!.transactionsEnabled === false && exSugg.meta!.transactionBuilt === false && exSugg.meta!.executionPrepared === false && exSugg.meta!.walletSignatureRequired === false && !("transactionsEnabled" in exSugg.suggestion! && (exSugg.suggestion as unknown as Record<string, unknown>).transactionsEnabled === true) && !/sendtransaction|signtransaction|deposit\(|withdraw\(|swap\(|buildtransaction|\.sign\(/.test(suggBlob), "no execution");
  add("16H-A-AQ: the built suggestion validates; a tampered execution flag is rejected", validateStableYieldPlanSuggestion(exSugg.suggestion).valid === true && validateStableYieldPlanSuggestion({ ...exSugg.suggestion, stableYieldPlan: { ...exSugg.meta, transactionsEnabled: true } }).valid === false, "validators");
  add("16H-A-AR: the converter reselects nothing (no comparison/registry/capacity imports beyond types + plan)", !/buildyieldstrategycomparisonset|compareyieldstrategiesforlane|listyieldstrategies\(/.test(readIf("src/suggestions/yieldStrategyPlanSuggestion.ts").toLowerCase()), "sole source of truth");

  return checks;
}


export function runYieldStrategyPlanUiFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const root = process.cwd();
  const readIf = (rel: string) => { try { return readFileSync(`${root}/${rel}`, "utf8"); } catch { return ""; } };
  const byId = (id: string) => STABLE_YIELD_TESTING_FIXTURES.find((f) => f.id === id)!;

  // ---- Flags + inventory ----
  add("16H-C-A: rendered card / review modal / testing-visual-fixtures flags are true", STABLE_YIELD_RENDERED_CARD_EXISTS === true && STABLE_YIELD_RENDERED_REVIEW_MODAL_EXISTS === true && STABLE_YIELD_TESTING_VISUAL_FIXTURES_EXIST === true && SY_TEST_FIXTURES_EXIST === true, "true");
  add("16H-C-B: shared-card-mapper / review-UI / accessibility flags are true", STABLE_YIELD_SHARED_CARD_MAPPER_EXISTS === true && STABLE_YIELD_REVIEW_UI_EXISTS === true && STABLE_YIELD_ACCESSIBILITY_BEHAVIOR_EXISTS === true, "true");
  // 16H-D flipped Demo + Real-Wallet integration to true (product flows wired). Smith-AI + external
  // protocol CTA remain false (still read-only, no execution).
  add("16H-C-C: Smith-AI / external-protocol-CTA integration flags remain false", STABLE_YIELD_SMITH_AI_INTEGRATION_EXISTS === false && STABLE_YIELD_PROTOCOL_EXTERNAL_ACTION_CTA_EXISTS === false, "false");
  add("16H-C-D: /testing inventory covers card + review + fail-closed states", STABLE_YIELD_TESTING_CARD_FIXTURES.length >= 16 && STABLE_YIELD_TESTING_REVIEW_FIXTURES.length >= 11 && STABLE_YIELD_TESTING_NON_RENDER_FIXTURES.length >= 4, `${STABLE_YIELD_TESTING_CARD_FIXTURES.length}/${STABLE_YIELD_TESTING_REVIEW_FIXTURES.length}/${STABLE_YIELD_TESTING_NON_RENDER_FIXTURES.length}`);

  // ---- Card mapper (16H-B card → SuggestionCardState via toSuggestionCard) ----
  const exStart = byId("sy_card_excess_start");
  const card = SY_toSuggestionCard(exStart.suggestion!);
  add("16H-C-E: the shared card mapper renders the approved presentation title/description/tag", card.title === "Earn Yield on Excess USDC" && card.tag === "Excess USDC Yield" && card.category === "yield_opportunity" && card.type === "deploy_idle_stablecoins", card.title);
  add("16H-C-F: exact amount is displayed (impact text)", card.impact_text === "Deposit $500.00 USDC on Kamino", card.impact_text);
  add("16H-C-G: the CTA is read-only 'Review Strategy' with all execution booleans false", card.cta.label === "Review" && card.cta.action === null && card.cta.executes_transaction === false && card.cta.requires_wallet_signature === false && card.cta.completion_on_click === false, "read-only");
  add("16H-C-H: the accessible CTA label is supplied", typeof card.accessibleCtaLabel === "string" && card.accessibleCtaLabel!.includes("Review"), "a11y label");
  add("16H-C-I: APY state is surfaced on the card", card.apy?.status === "live_protocol_api" && card.apy?.display === "5.24%", card.apy?.display ?? "none");
  add("16H-C-J: correct title for all lane × action-mode combinations", SY_toSuggestionCard(byId("sy_card_excess_add").suggestion!).title === "Add to Your Kamino Strategy" && SY_toSuggestionCard(byId("sy_card_buffer_start").suggestion!).title === "Put Buffer Funds on Kamino" && SY_toSuggestionCard(byId("sy_card_buffer_add").suggestion!).title === "Add to Your Kamino Position", "titles");
  add("16H-C-K: APY unavailable renders the canonical text state", SY_toSuggestionCard(byId("sy_card_apy_unavailable").suggestion!).apy?.display === "APY unavailable" && SY_toSuggestionCard(byId("sy_card_apy_unavailable").suggestion!).apy?.status === "unavailable", "unavailable");
  add("16H-C-L: APY provided-without-source maps to 'provided'", SY_toSuggestionCard(byId("sy_card_apy_provided").suggestion!).apy?.status === "provided", "provided");
  add("16H-C-M: Top Pick badge maps from the suggestion flag", SY_toSuggestionCard(byId("sy_card_top_pick").suggestion!).badge === "Top Pick" && SY_toSuggestionCard(byId("sy_card_top_pick").suggestion!).is_top_pick === true && card.badge === "", "top pick");
  add("16H-C-N: buffer and excess reason copy remain distinct", SY_toSuggestionCard(byId("sy_card_buffer_start").suggestion!).description.includes("count toward your Safety Buffer") && card.description.includes("above your Safety Buffer") && SY_toSuggestionCard(byId("sy_card_buffer_start").suggestion!).description !== card.description, "distinct");
  add("16H-C-O: amount with cents is preserved (not rounded)", byId("sy_card_amount_cents").card!.impact_text.includes("$1,234.56"), byId("sy_card_amount_cents").card!.impact_text);

  // ---- Review VM ----
  const rev = buildStableYieldPlanPresentation(byId("sy_review_excess").suggestion!).review!;
  add("16H-C-P: the review VM renders supplied before/after fields (not reversed)", rev.walletUsdcBeforeUsd === 5000 && rev.walletUsdcAfterUsd === 4500 && rev.walletUsdcAfterUsd < rev.walletUsdcBeforeUsd, `${rev.walletUsdcBeforeUsd}->${rev.walletUsdcAfterUsd}`);
  add("16H-C-Q: the review VM preserves identity + disclosures", rev.strategyId === "syn_ex" && rev.productAddress === "ADDR_EX" && rev.disclosures.length === 4 && rev.disclosures.some((d) => /cannot move your funds/i.test(d)), "review");
  add("16H-C-R: capacity is never rendered as 'unlimited'", STABLE_YIELD_TESTING_FIXTURES.every((f) => !f.review || !/unlimited/i.test(f.review.capacity.note + f.review.capacity.boundDisplay)), "no unlimited");
  add("16H-C-S: verified-uncapped review is bounded by the eligible amount", buildStableYieldPlanPresentation(byId("sy_review_cap_uncapped").suggestion!).review!.capacity.mode === "verified_uncapped" && buildStableYieldPlanPresentation(byId("sy_review_cap_uncapped").suggestion!).review!.capacity.boundDisplay === "$500.00", "bounded");

  // ---- Fail-closed (no card) ----
  add("16H-C-T: invalid presentation produces no card", byId("sy_nonrender_invalid_lane").card === null, "no card");
  add("16H-C-U: missing presentation meta produces no card", byId("sy_nonrender_missing").card === null, "no card");
  add("16H-C-V: unsupported capacity state produces no card", byId("sy_nonrender_capacity").card === null, "no card");
  add("16H-C-W: execution-intent contamination produces no card", byId("sy_nonrender_execution").card === null, "no card");
  add("16H-C-X: deterministic re-mapping produces identical visible copy", JSON.stringify(SY_toSuggestionCard(byId("sy_card_excess_start").suggestion!)) === JSON.stringify(SY_toSuggestionCard(byId("sy_card_excess_start").suggestion!)), "deterministic");

  // ---- Production ----
  add("16H-C-Y: production renders no Stable Yield card (no approved product → no suggestion)", getApprovedYieldStrategies().length === 0 && STABLE_YIELD_TESTING_FIXTURES.every((f) => !f.suggestion || f.suggestion.stableYieldPlan !== undefined || f.group === "non_render"), "no prod card");

  // ---- Integrity: React/UI imports no planning/capital/APY logic + no execution ----
  {
    const uiFiles = ["src/components/SuggestionCard.tsx", "src/components/SuggestionReviewModal.tsx", "src/pages/TestingPage.tsx"];
    const uiBlob = uiFiles.map((f) => readIf(f)).join("").toLowerCase();
    const forbidden = ["buildyieldstrategyplandecision", "compareyieldstrategiesforlane", "buildyieldstrategyeligiblecapitalsnapshot", "buildstableyieldplansuggestion", "usdtoplancents", "getyieldstrategybufferallocation", "selectleader", "sendtransaction", "signtransaction"];
    add("16H-C-Z: the React/UI source imports no planner/leader/capital/APY/execution logic", forbidden.filter((h) => uiBlob.includes(h)).length === 0, "clean");
  }
  {
    const modalSrc = readIf("src/components/SuggestionReviewModal.tsx");
    const syBranch = (modalSrc.split("if (stableYieldReview)")[1] ?? "").split("if (contributionReview)")[0] ?? "";
    add("16H-C-AA: the Stable Yield review branch is read-only (no transaction/signature/auto-open; a user-click app handoff anchor is allowed)", syBranch.length > 0 && !/executeTransaction|requestSignature|window\.open|deposit\(|externalReviewLink|open_external_protocol/i.test(syBranch), "read-only branch");
  }
  add("16H-C-AB: the shared card CTA never opens an external protocol for a stable-yield card", card.cta.action !== "open_external_protocol" && !("protocol_id" in card.cta && (card.cta as unknown as Record<string, unknown>).protocol_id), "no external");

  return checks;
}


/**
 * Step 16H-D — the Stable Yield suggestion integrated into the Demo Mode and Real Wallet product flows
 * through the SHARED `deriveStableYieldPlanSuggestion` orchestration → `runSuggestionEngine`'s 4th param
 * → shared card + review drawer. Demo demonstrates ONE valid excess-lane suggestion from DEMO-ONLY
 * injected inputs; Real Wallet runs the production pipeline → no approved product → no_plan → no card.
 */
export function runStableYieldProductIntegrationFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const root = process.cwd();
  const readIf = (rel: string) => { try { return readFileSync(`${root}/${rel}`, "utf8"); } catch { return ""; } };

  // The demo Safety Buffer (funded) is derived through the SAME canonical helper the rail uses.
  const demoBuffer = SY_deriveBuffer(DEMO_STABLE_YIELD_POSITIONS, DEMO_STABLE_YIELD_GOAL.expenses_monthly, SY_bufferMonths(DEMO_STABLE_YIELD_GOAL.risk_tolerance));
  const demoIn = { dataMode: "demo_fixture" as const, positions: DEMO_STABLE_YIELD_POSITIONS, goal: DEMO_STABLE_YIELD_GOAL, buffer: demoBuffer, pricedAsOf: DEMO_STABLE_YIELD_PRICED_AS_OF };

  // ---- Flags ----
  add("16H-D-A: Demo + Real-Wallet + shared-orchestration integration flags are true", STABLE_YIELD_DEMO_MODE_INTEGRATION_EXISTS === true && STABLE_YIELD_REAL_WALLET_INTEGRATION_EXISTS === true && STABLE_YIELD_SHARED_PRODUCT_ORCHESTRATION_EXISTS === true && STABLE_YIELD_PRODUCT_ORCHESTRATION_EXISTS === true, "true");
  add("16H-D-B: execution / signature / Smith-AI / external-protocol-CTA flags remain false", STABLE_YIELD_EXECUTES_TRANSACTION === false && STABLE_YIELD_REQUIRES_WALLET_SIGNATURE === false && STABLE_YIELD_SMITH_AI_INTEGRATION_EXISTS === false && STABLE_YIELD_PROTOCOL_EXTERNAL_ACTION_CTA_EXISTS === false, "false");

  // ---- Demo Mode: one valid excess-lane suggestion through the full pipeline ----
  const demoBufferFunded = demoBuffer?.fullyFunded === true;
  add("16H-D-C: the demo Safety Buffer is fully funded (so the engine surfaces yield, not a buffer override)", demoBufferFunded, `funded=${demoBufferFunded}`);
  const demoDerive = deriveStableYieldPlanSuggestion(demoIn);
  add("16H-D-D: the demo decision is a ready excess-lane plan", demoDerive.decision?.status === "ready" && demoDerive.decision?.selectedLane === "excess", `${demoDerive.decision?.status}/${demoDerive.decision?.selectedLane ?? "-"}`);
  add("16H-D-E: the demo orchestration emits one Stable Yield suggestion (category stable_yield)", demoDerive.suggestion !== null && demoDerive.suggestion?.category === "stable_yield", demoDerive.suggestion?.category ?? "null");
  add("16H-D-F: the demo suggestion funds only direct_wallet_usdc, excess lane, amount $500", demoDerive.suggestion?.stableYieldPlan?.fundingSource === "direct_wallet_usdc" && demoDerive.suggestion?.stableYieldPlan?.lane === "excess" && demoDerive.suggestion?.stableYieldPlan?.amountUsd === 500, `${demoDerive.suggestion?.stableYieldPlan?.fundingSource}/${demoDerive.suggestion?.stableYieldPlan?.amountUsd}`);
  add("16H-D-G: the orchestration never force-marks the demo suggestion Top Pick (engine decides ordering)", demoDerive.suggestion?.is_top_pick !== true, `top_pick=${demoDerive.suggestion?.is_top_pick}`);
  add("16H-D-H: the demo orchestration builds exactly one keyed review (fail-closed otherwise)", Object.keys(demoDerive.reviewById).length === 1 && demoDerive.suggestion != null && demoDerive.reviewById[demoDerive.suggestion.id] != null, `${Object.keys(demoDerive.reviewById).length}`);

  // ---- Demo rail: rendered through the SAME shared engine → shared card ----
  const demoRail = buildDemoStableYieldRail();
  const demoSyCards = demoRail.cards.filter((c) => c.type === "deploy_idle_stablecoins");
  add("16H-D-I: the demo rail renders exactly one stable-yield card (legacy 'Put Stablecoins to Work' suppressed)", demoSyCards.length === 1, `${demoSyCards.length}`);
  add("16H-D-J: the demo card is the plan-backed presentation (title/tag/amount from 16H-B)", demoSyCards[0]?.title === "Earn Yield on Excess USDC" && demoSyCards[0]?.tag === "Excess USDC Yield" && demoSyCards[0]?.impact_text === "Deposit $500.00 USDC on Kamino", `${demoSyCards[0]?.title}`);
  add("16H-D-K: the demo card CTA is read-only 'Review Strategy' (no transaction/signature/completion)", demoSyCards[0]?.cta.label === "Review" && demoSyCards[0]?.cta.action === null && demoSyCards[0]?.cta.executes_transaction === false && demoSyCards[0]?.cta.requires_wallet_signature === false && demoSyCards[0]?.cta.completion_on_click === false, "read-only");
  add("16H-D-L: the demo rail keys the review by the SAME id the card uses (shared modal opens)", demoSyCards[0] != null && demoRail.stableYieldReviewById[demoSyCards[0].id] != null && Object.keys(demoRail.stableYieldReviewById).length === 1, `keys=${Object.keys(demoRail.stableYieldReviewById).length}`);
  add("16H-D-M: the demo rail exposes at most one Top Pick across all cards", demoRail.cards.filter((c) => c.is_top_pick === true).length <= 1, `${demoRail.cards.filter((c) => c.is_top_pick === true).length}`);
  add("16H-D-N: the demo rail is available and settles to a concrete (non-loading) payload", demoRail.available === true && demoRail.loading === false, `avail=${demoRail.available}`);

  // ---- Identity: timestamp-only reevaluation preserves the suggestion id ----
  const demoAgain = deriveStableYieldPlanSuggestion({ ...demoIn, pricedAsOf: DEMO_STABLE_YIELD_PRICED_AS_OF + 3_600_000 });
  add("16H-D-O: a timestamp-only reevaluation keeps a stable suggestion id (no flicker/new card)", demoDerive.suggestion != null && demoAgain.suggestion != null && demoDerive.suggestion.id === demoAgain.suggestion.id, "stable id");
  const demoRail2 = buildDemoStableYieldRail();
  add("16H-D-P: rebuilding the demo rail yields identical visible card copy (deterministic)", JSON.stringify(demoRail.cards) === JSON.stringify(demoRail2.cards), "deterministic");

  // ---- Real Wallet: production pipeline → no approved product → no_plan → no card ----
  const realDerive = deriveStableYieldPlanSuggestion({ dataMode: "real_wallet", positions: DEMO_STABLE_YIELD_POSITIONS, goal: DEMO_STABLE_YIELD_GOAL, buffer: demoBuffer, pricedAsOf: DEMO_STABLE_YIELD_PRICED_AS_OF });
  add("16H-D-Q: the real-wallet decision is no_plan (no approved product / no market/capacity data source)", realDerive.decision?.status === "no_plan", realDerive.decision?.status ?? "null");
  add("16H-D-R: the real-wallet orchestration emits no Stable Yield suggestion + no review (fail-closed, no error)", realDerive.suggestion === null && Object.keys(realDerive.reviewById).length === 0 && realDerive.diagnostic.emitted === false, "no suggestion");
  // Slice 3.1 — the real-wallet rail now consumes the CANONICAL target unconditionally; supply a fresh market cache so
  // the canonical path is exercised (previously this scenario leaked a Rebalance card via the transitional fallback).
  const syRwCache = { cacheVersion: MARKET_CONDITION_CACHE_VERSION, generatedAt: new Date(DEMO_STABLE_YIELD_PRICED_AS_OF).toISOString(), sourceId: "coinmarketcap_crypto_fear_greed", indexId: "cmc_crypto_fear_greed", indexName: "CMC Crypto Fear & Greed Index", methodology: "cmc_crypto_fear_greed_composite", methodologyVersion: "cmc_fng_methodology_2026_1", score: 12, band: "extreme_fear", observedAt: new Date(DEMO_STABLE_YIELD_PRICED_AS_OF - 3_600_000).toISOString(), retrievedAt: new Date(DEMO_STABLE_YIELD_PRICED_AS_OF).toISOString(), validUntil: null, retrievalState: "cached", evidence: ["cmc"] };
  const realRail = SY_deriveRail({ positions: DEMO_STABLE_YIELD_POSITIONS, pricedAsOf: DEMO_STABLE_YIELD_PRICED_AS_OF, goal: DEMO_STABLE_YIELD_GOAL, marketConditionsCacheInput: syRwCache, marketConditionsCacheState: "loaded", targetGeneratedAt: DEMO_STABLE_YIELD_PRICED_AS_OF });
  add("16H-D-S: the real-wallet rail renders no plan-backed Stable Yield review (integration wired; no card is correct)", Object.keys(realRail.stableYieldReviewById).length === 0, `keys=${Object.keys(realRail.stableYieldReviewById).length}`);
  add("16H-D-T: unrelated real-wallet suggestions still render (the rail is not broken by no_plan)", realRail.cards.length > 0, `${realRail.cards.length} cards`);

  // ---- Fail-closed: demo path with an incomplete buffer prepares no suggestion ----
  const demoUnfunded = deriveStableYieldPlanSuggestion({ ...demoIn, buffer: demoBuffer ? { ...demoBuffer, fullyFunded: false } : null });
  add("16H-D-U: a demo path with an incomplete Safety Buffer prepares no Stable Yield suggestion", demoUnfunded.suggestion === null && demoUnfunded.diagnostic.reason === "demo_buffer_incomplete", demoUnfunded.diagnostic.reason);

  // ---- Demo / production isolation integrity ----
  add("16H-D-V: the synthetic demo product never enters the production registry", listYieldStrategies().every((e) => e.strategyId !== "demo_usdc_yield_vault") && getApprovedYieldStrategies().length === 0, `approved=${getApprovedYieldStrategies().length}`);
  const demoDecDirect = buildDemoStableYieldDecision();
  add("16H-D-W: the demo decision resolves the demo-only product (never a production strategy id)", demoDecDirect.status === "ready" && demoDecDirect.selectedStrategyId === "demo_usdc_yield_vault", demoDecDirect.selectedStrategyId ?? "-");

  // ---- Orchestration boundary: no React, no execution in the shared/demo modules ----
  {
    const orchBlob = (readIf("src/suggestions/stableYieldProductInput.ts") + readIf("src/suggestions/demoStableYieldScenario.ts")).toLowerCase();
    const forbidden = ["from \"react\"", "usestate", "useeffect", "jsx", "sendtransaction", "signtransaction", "window.open", "executetransaction"];
    add("16H-D-X: the shared orchestration + demo scenario contain no React and no execution/transaction logic", forbidden.filter((h) => orchBlob.includes(h)).length === 0, "clean");
  }
  // The rail hook feeds runSuggestionEngine's 4th param and never calls selectTopPick / reorders in the UI.
  {
    const railBlob = readIf("src/suggestions/useRailSuggestions.ts").toLowerCase();
    add("16H-D-Y: the rail passes the Stable Yield suggestion into runSuggestionEngine and never reorders / picks Top Pick in the UI", railBlob.includes("derivestableyieldplansuggestion(") && railBlob.includes("stableyield.suggestion") && !railBlob.includes("selecttoppick"), "engine-owned ordering");
  }

  return checks;
}


/**
 * Step 16H-F — the Stable Yield END-TO-END ACCEPTANCE / RELEASE GATE. These are integration-level
 * checks over the complete release contract (architecture, Demo, production, safety, determinism,
 * isolation, presentation, flags, docs) — deliberately NOT a re-run of the per-layer 16C–16H-D suites.
 */
export function runStableYieldReleaseGateFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const root = process.cwd();
  const readIf = (rel: string) => { try { return readFileSync(`${root}/${rel}`, "utf8"); } catch { return ""; } };

  const demoBuffer = SY_deriveBuffer(DEMO_STABLE_YIELD_POSITIONS, DEMO_STABLE_YIELD_GOAL.expenses_monthly, SY_bufferMonths(DEMO_STABLE_YIELD_GOAL.risk_tolerance));
  const demoIn = { dataMode: "demo_fixture" as const, positions: DEMO_STABLE_YIELD_POSITIONS, goal: DEMO_STABLE_YIELD_GOAL, buffer: demoBuffer, pricedAsOf: DEMO_STABLE_YIELD_PRICED_AS_OF };
  const demo = deriveStableYieldPlanSuggestion(demoIn);
  const meta = demo.suggestion?.stableYieldPlan;
  const pres = demo.suggestion ? buildStableYieldPlanPresentation(demo.suggestion) : null;
  const rev = pres?.review;
  const demoRail = buildDemoStableYieldRail();
  const syCards = demoRail.cards.filter((c) => c.type === "deploy_idle_stablecoins");

  // ---- Architecture ----
  add("16H-F-A: the complete plan→suggestion→presentation→card chain succeeds for Demo", demo.decision?.status === "ready" && demo.suggestion != null && pres?.card != null && rev != null && syCards.length === 1, "chain ok");
  add("16H-F-B: Demo and Real Wallet share ONE product-orchestration entry point (behavioral: the shared rail emits the Stable Yield card for the demo scenario)", buildDemoStableYieldRail().cards.some((c) => c.type === "deploy_idle_stablecoins") && readIf("src/suggestions/demoStableYieldScenario.ts").includes("deriveRailSuggestions(") && STABLE_YIELD_SHARED_PRODUCT_ORCHESTRATION_EXISTS === true, "shared entry");
  {
    // The rail must hand the suggestion to the engine as the 4th arg and must not re-sort afterwards.
    const rail = readIf("src/suggestions/useRailSuggestions.ts");
    const call = (rail.split("runSuggestionEngine(")[1] ?? "").split(");")[0] ?? "";
    add("16H-F-C: runSuggestionEngine receives the optional Stable Yield plan decision", call.includes("stableYield.suggestion"), "4th arg");
    add("16H-F-D: no post-engine reorder / Top-Pick selection happens in the rail or UI", !/\.sort\(|selectTopPick|is_top_pick\s*=/.test(rail) && !/selectTopPick|\.sort\(/.test(readIf("src/components/RealWalletSuggestionsRail.tsx")), "engine-owned");
  }
  {
    // The UI may reach the 16H-B presentation only — never planner/comparison/capital/capacity logic.
    const ui = ["src/components/SuggestionCard.tsx", "src/components/SuggestionReviewModal.tsx", "src/components/RealWalletSuggestionsRail.tsx", "src/pages/DemoDashboardPage.tsx"].map((f) => readIf(f)).join("").toLowerCase();
    const banned = ["yieldstrategyplan\"", "yieldstrategycomparison", "yieldstrategyeligiblecapital", "yieldstrategyproductcapacity", "buildyieldstrategyplandecision", "buildstableyieldplansuggestion", "usdtoplancents"];
    add("16H-F-E: the UI imports the presentation layer only (no planner/comparison/capital/capacity logic)", banned.filter((b) => ui.includes(b)).length === 0, "presentation-only");
  }

  // ---- Demo end-to-end exact values (must originate from the pipeline, never hardcoded in UI) ----
  add("16H-F-F: exactly one ready Stable Yield plan / suggestion / card", demo.decision?.planCount === 1 && demo.suggestion != null && syCards.length === 1 && Object.keys(demo.reviewById).length === 1, `plans=${demo.decision?.planCount}`);
  add("16H-F-G: exact selected amount is $500.00 (cents and USD agree)", meta?.amountUsd === 500 && demo.decision?.selectedAmountUsd === 500 && demo.decision?.selectedAmountCents === 50000, `${meta?.amountUsd}`);
  // Raw 5.15 is owned upstream; the presentation only FORMATS it to "5.15%" — it never recalculates.
  add("16H-F-H: exact supplied APY is 5.15% with provenance preserved (formatted, never recalculated)", (meta as unknown as { apy?: { netApyPct?: number } })?.apy?.netApyPct === 5.15 && rev?.apy.display === "5.15%" && rev?.apy.state === "live_protocol_api" && rev?.apy.sourceLabel === "Demo protocol API", `${rev?.apy.display}`);
  add("16H-F-I: exact wallet USDC projection is $6,000.00 → $5,500.00 (not reversed)", rev?.walletUsdcBeforeUsd === 6000 && rev?.walletUsdcAfterUsd === 5500 && rev.walletUsdcAfterUsd < rev.walletUsdcBeforeUsd, `${rev?.walletUsdcBeforeUsd}->${rev?.walletUsdcAfterUsd}`);
  add("16H-F-J: exact buffer projection is $3,500.00 → $3,000.00 against a $3,000.00 requirement", rev?.bufferBeforeUsd === 3500 && rev?.bufferAfterUsd === 3000 && rev?.requiredBufferUsd === 3000, `${rev?.bufferBeforeUsd}->${rev?.bufferAfterUsd}`);
  add("16H-F-K: required Safety Buffer stays covered and the wallet floor is preserved", rev?.bufferCoveragePreserved === true && rev?.walletFloorPreserved === true && (rev?.bufferAfterUsd ?? 0) >= (rev?.requiredBufferUsd ?? Infinity), "covered");
  add("16H-F-L: funding is direct_wallet_usdc on the excess lane only", meta?.fundingSource === "direct_wallet_usdc" && meta?.lane === "excess" && demo.decision?.selectedLane === "excess", `${meta?.fundingSource}`);
  add("16H-F-M: product / protocol / address / action-mode identity is preserved end-to-end", rev?.strategyId === "demo_usdc_yield_vault" && rev?.protocolName === "Kamino" && rev?.productDisplayName === "Demo USDC Yield Vault" && rev?.productAddress === "DemoUsdcYieldVaultAddr111111111111111111111" && meta?.actionMode === "start_new_position", `${rev?.strategyId}`);
  add("16H-F-N: the suggestion id is derived from the source plan id", meta?.sourcePlanId != null && demo.suggestion?.id === `sy_plan_${meta.sourcePlanId}`, `${demo.suggestion?.id}`);
  add("16H-F-O: the review model is keyed to the same suggestion the card renders", syCards[0] != null && demoRail.stableYieldReviewById[syCards[0].id] != null, "keyed");
  add("16H-F-P: no legacy duplicate Stable Yield card appears", demoRail.cards.filter((c) => c.category === "yield_opportunity").length === 1 && syCards[0]?.title === "Earn Yield on Excess USDC", "one card");

  // ---- Demo ordering / Top Pick (engine-owned) ----
  add("16H-F-Q: both lanes rank under the canonical stable_yield category (lane stays metadata)", demo.suggestion?.category === "stable_yield" && CATEGORY_PRIORITY.stable_yield === 6, `${demo.suggestion?.category}`);
  add("16H-F-R: stable_yield never outranks buffer / rebalance / capital_efficiency", CATEGORY_PRIORITY.stable_yield > CATEGORY_PRIORITY.buffer && CATEGORY_PRIORITY.stable_yield > CATEGORY_PRIORITY.rebalance && CATEGORY_PRIORITY.stable_yield > CATEGORY_PRIORITY.capital_efficiency, "6 > 1,2,3");
  add("16H-F-S: exactly one Top Pick exists in the Demo rail (set by the engine, not the orchestration)", demoRail.cards.filter((c) => c.is_top_pick === true).length === 1 && demo.suggestion?.is_top_pick === false, "one top pick");
  {
    // Demo is Top Pick only because no higher-priority eligible suggestion exists (buffer funded,
    // allocation already on target). Prove a genuine buffer correction still outranks it.
    const withBuffer = selectTopPick15H([
      { ...demo.suggestion!, is_top_pick: false },
      { ...demo.suggestion!, id: "buf_x", category: "buffer", is_top_pick: false },
    ] as never[]) as unknown as Array<{ id: string; is_top_pick: boolean }>;
    add("16H-F-T: a genuine Safety Buffer correction outranks Stable Yield for Top Pick", withBuffer.find((s) => s.id === "buf_x")?.is_top_pick === true && withBuffer.find((s) => s.id === demo.suggestion!.id)?.is_top_pick === false, "buffer wins");
  }

  // ---- Production ----
  const prod = deriveStableYieldPlanSuggestion({ dataMode: "real_wallet", positions: DEMO_STABLE_YIELD_POSITIONS, goal: DEMO_STABLE_YIELD_GOAL, buffer: demoBuffer, pricedAsOf: DEMO_STABLE_YIELD_PRICED_AS_OF });
  // Slice 3.1 — exercise the real-wallet CANONICAL target path with a fresh market cache (see 16H-D-S rationale).
  const prodRwCache = { cacheVersion: MARKET_CONDITION_CACHE_VERSION, generatedAt: new Date(DEMO_STABLE_YIELD_PRICED_AS_OF).toISOString(), sourceId: "coinmarketcap_crypto_fear_greed", indexId: "cmc_crypto_fear_greed", indexName: "CMC Crypto Fear & Greed Index", methodology: "cmc_crypto_fear_greed_composite", methodologyVersion: "cmc_fng_methodology_2026_1", score: 12, band: "extreme_fear", observedAt: new Date(DEMO_STABLE_YIELD_PRICED_AS_OF - 3_600_000).toISOString(), retrievedAt: new Date(DEMO_STABLE_YIELD_PRICED_AS_OF).toISOString(), validUntil: null, retrievalState: "cached", evidence: ["cmc"] };
  const prodRail = SY_deriveRail({ positions: DEMO_STABLE_YIELD_POSITIONS, pricedAsOf: DEMO_STABLE_YIELD_PRICED_AS_OF, goal: DEMO_STABLE_YIELD_GOAL, marketConditionsCacheInput: prodRwCache, marketConditionsCacheState: "loaded", targetGeneratedAt: DEMO_STABLE_YIELD_PRICED_AS_OF });
  add("16H-F-U: the production registry has no approved Stable Yield product", getApprovedYieldStrategies().length === 0, `${getApprovedYieldStrategies().length}`);
  add("16H-F-V: the production decision is no_plan and selects no product/amount", prod.decision?.status === "no_plan" && prod.decision?.planCount === 0 && prod.decision?.selectedStrategyId === undefined && prod.decision?.selectedAmountUsd === undefined, `${prod.decision?.status}`);
  add("16H-F-W: production emits no suggestion, no presentation, no card, and no fallback", prod.suggestion === null && buildStableYieldPlanPresentation(prod.suggestion).card === null && Object.keys(prodRail.stableYieldReviewById).length === 0 && prodRail.cards.every((c) => c.type !== "deploy_idle_stablecoins"), "no card");
  add("16H-F-X: unrelated production suggestions still render (the rail neither throws nor empties)", prodRail.cards.length > 0 && prodRail.available === true, `${prodRail.cards.length} cards`);
  add("16H-F-Y: production never returns Demo values (no demo product/amount/APY leaks)", prod.decision?.selectedStrategyId !== "demo_usdc_yield_vault" && JSON.stringify(prodRail.cards).includes("Demo USDC Yield Vault") === false, "no demo leak");

  // ---- Safety / read-only release gate ----
  add("16H-F-Z: the Demo card CTA is 'Review Strategy' with every execution boolean false", syCards[0]?.cta.label === "Review" && syCards[0]?.cta.action === null && syCards[0]?.cta.executes_transaction === false && syCards[0]?.cta.requires_wallet_signature === false && syCards[0]?.cta.completion_on_click === false, "read-only");
  add("16H-F-AA: the presentation is review_only / readOnly / externalManagementRequired with no external URL", pres?.card?.readOnly === true && pres?.card?.externalManagementRequired === true && rev?.readOnly === true && rev?.externalManagementRequired === true && pres?.card?.cta.intent === "open_stable_yield_review" && pres?.card?.cta.opensExternalUrl === false, "review_only");
  {
    // Static gate over the ENTIRE Stable Yield surface + the shared UI that renders it.
    const files = readdirSync(`${root}/src/suggestions`).filter((f) => /^(yieldStrategy|stableYield|demoStableYield)/.test(f) && f.endsWith(".ts") && !f.includes("fixtures"));
    const blob = (files.map((f) => readIf(`src/suggestions/${f}`)).join("") + readIf("src/components/SuggestionReviewModal.tsx") + readIf("src/components/SuggestionCard.tsx") + readIf("src/components/RealWalletSuggestionsRail.tsx") + readIf("src/suggestions/toSuggestionCard.ts")).toLowerCase();
    // Banned = actual execution CALLS/CTAs. Note `deepLink` legitimately appears inside the 16H-A
    // validator's forbidden-key list, and `custodyModel`/`custodyReady` are 16D eligibility RISK
    // classifiers ("non_custodial") — both are guards, not behaviour, so they are matched precisely.
    const banned = ["sendtransaction(", "signtransaction(", "signmessage(", "serializedtransaction", "preparedtransaction", "versionedtransaction", "window.open(", "location.href =", "opensexternalurl: true", "executestransaction: true", "requireswalletsignature: true", "completiononclick: true", "autoroute(", "\"deposit\"", "\"invest now\"", "\"start earning\"", "\"execute\"", "\"sign\""];
    const hits = banned.filter((b) => blob.includes(b));
    add("16H-F-AB: no execution/transaction/signature/deposit/withdrawal/migration/external-nav path exists anywhere in Stable Yield", hits.length === 0 && files.length >= 30, hits.length ? hits.join(",") : `clean (${files.length} files)`);
    add("16H-F-AB2: custody appears only as a 16D eligibility risk classifier, never as custody behaviour", !/custody/i.test(readIf("src/suggestions/yieldStrategyPlan.ts") + readIf("src/suggestions/yieldStrategyPlanSuggestion.ts") + readIf("src/suggestions/yieldStrategyPlanPresentation.ts") + readIf("src/suggestions/stableYieldProductInput.ts")), "classifier only");
  }
  add("16H-F-AC: the review discloses read-only, external management, changeable APY, and protocol risk", rev?.disclosures.length === 4 && rev.disclosures.some((d) => /cannot move your funds/i.test(d)) && rev.disclosures.some((d) => /manage this position yourself/i.test(d)) && rev.disclosures.some((d) => /rates can change/i.test(d)) && rev.disclosures.some((d) => /smart-contract risk/i.test(d)), "4 disclosures");

  // ---- Determinism / identity ----
  add("16H-F-AD: repeated Demo evaluation is byte-identical", JSON.stringify(buildDemoStableYieldRail().cards) === JSON.stringify(demoRail.cards) && JSON.stringify(deriveStableYieldPlanSuggestion(demoIn).suggestion) === JSON.stringify(demo.suggestion), "identical");
  {
    const later = deriveStableYieldPlanSuggestion({ ...demoIn, pricedAsOf: DEMO_STABLE_YIELD_PRICED_AS_OF + 86_400_000, checkedAt: new Date(DEMO_STABLE_YIELD_PRICED_AS_OF + 86_400_000).toISOString() });
    add("16H-F-AE: timestamp-only change preserves BOTH the plan id and the suggestion id", later.decision?.selectedPlan?.planId === demo.decision?.selectedPlan?.planId && later.suggestion?.id === demo.suggestion?.id, `${later.suggestion?.id}`);
  }
  {
    // Material changes must change plan identity; the id hashes owner+lane+action+product+amountCents
    // and nothing time-based (proving the id is not timestamp-derived noise).
    const base = { ownerAddress: "O", lane: "excess" as const, actionMode: "start_new_position" as const, strategyId: "s1", productAddress: "A1", amountCents: 50000 };
    const id = buildYieldStrategyPlanId(base);
    add("16H-F-AF: a material change (amount / lane / action / product) changes the plan identity", id !== buildYieldStrategyPlanId({ ...base, amountCents: 40000 }) && id !== buildYieldStrategyPlanId({ ...base, lane: "buffer" }) && id !== buildYieldStrategyPlanId({ ...base, actionMode: "add_to_existing_strategy" }) && id !== buildYieldStrategyPlanId({ ...base, strategyId: "s2" }) && id === buildYieldStrategyPlanId({ ...base }), "identity changes");
  }
  {
    // 16H-F fail-closed hardening: a decision whose mirrored amount disagrees with its selected plan, or
    // whose plan id no longer matches its material inputs, must never convert into a suggestion.
    const dec = demo.decision!;
    const mismatched = buildStableYieldPlanSuggestion({ ...dec, selectedAmountUsd: 400, selectedAmountCents: 40000 }, { generatedAt: DEMO_STABLE_YIELD_PRICED_AS_OF });
    add("16H-F-AF2: a decision whose mirrored amount conflicts with its plan is rejected, not silently resolved", mismatched.suggestion === null && mismatched.diagnostic.reason === "decision_plan_mismatch", mismatched.diagnostic.reason);
    const corrupted = buildStableYieldPlanSuggestion({ ...dec, selectedPlan: { ...dec.selectedPlan!, planId: "ysplan_deadbeef" }, selectedAmountUsd: dec.selectedAmountUsd, selectedAmountCents: dec.selectedAmountCents }, { generatedAt: DEMO_STABLE_YIELD_PRICED_AS_OF });
    add("16H-F-AF3: a corrupted plan identity fails closed at conversion (no suggestion, structured diagnostic)", corrupted.suggestion === null && /invalid_source_plan:.*unstable_plan_id/.test(corrupted.diagnostic.reason), corrupted.diagnostic.reason);
  }

  // ---- Demo / production isolation ----
  add("16H-F-AG: the demo product is absent from the production registry and unapproved", listYieldStrategies().every((e) => e.strategyId !== "demo_usdc_yield_vault" && e.address !== "DemoUsdcYieldVaultAddr111111111111111111111"), "absent");
  add("16H-F-AH: the production decision builder references no demo symbol", !/DEMO_|buildDemoStableYieldDecision/.test((readIf("src/suggestions/stableYieldProductInput.ts").split("function buildProductionStableYieldDecision")[1] ?? "").split("\n}")[0] ?? "x"), "no demo in prod path");
  add("16H-F-AI: only the Demo page imports the demo scenario (never the shared rail / real-wallet rail)", !readIf("src/components/RealWalletSuggestionsRail.tsx").includes("demoStableYieldScenario") && !readIf("src/suggestions/useRailSuggestions.ts").includes("demoStableYieldScenario"), "demo-page only");
  add("16H-F-AJ: isolation is controlled by explicit dataMode, not an env/hostname string compare", readIf("src/suggestions/stableYieldProductInput.ts").includes("input.dataMode === \"demo_fixture\"") && !/process\.env\.NODE_ENV|location\.hostname|import\.meta\.env\.(DEV|PROD)/.test(readIf("src/suggestions/stableYieldProductInput.ts")), "dataMode");
  add("16H-F-AK: Steakhouse remains unapproved and no protocol gains approval from a Demo fixture", listYieldStrategies().filter((e) => /steakhouse/i.test(e.strategyId + e.displayName)).every((e) => e.lifecycle !== "approved") && getApprovedYieldStrategies().length === 0, "unapproved");
  add("16H-F-AL: the demo path never mutates the production registry array", (() => { const before = JSON.stringify(listYieldStrategies()); buildDemoStableYieldRail(); buildDemoStableYieldDecision(); return JSON.stringify(listYieldStrategies()) === before; })(), "unmutated");

  // ---- Presentation ----
  add("16H-F-AM: deterministic title / tag / CTA label", syCards[0]?.title === "Earn Yield on Excess USDC" && syCards[0]?.tag === "Excess USDC Yield" && syCards[0]?.cta.label === "Review", `${syCards[0]?.title}`);
  add("16H-F-AN: the review carries all six canonical sections' content", rev != null && rev.summary.length > 0 && rev.strategyId.length > 0 && rev.amountDisplay.length > 0 && rev.walletUsdcBeforeDisplay.length > 0 && rev.capacity.boundDisplay.length > 0 && rev.rows.length > 0 && rev.disclosures.length === 4, "six sections");
  add("16H-F-AO: no annual-earnings projection is invented and capacity never says 'unlimited'", !/annual|per year|\/yr|you (would|will) earn/i.test(JSON.stringify(rev)) && !/unlimited/i.test(rev?.capacity.boundDisplay + (rev?.capacity.note ?? "")), "no earnings");
  add("16H-F-AP: the APY-unavailable state remains supported by the mapper", stableYieldApyPresentation(undefined).state === "unavailable" && stableYieldApyPresentation(undefined).display === "APY unavailable", "unavailable ok");

  // ---- Responsive regression (16H-F defect fix) ----
  {
    // A review row value may be a long unbroken product address with no natural break opportunity.
    // Flex items default to `min-width: auto`, so without these the value overflowed the dialog at
    // 320px. Guard the shared rule so the fix is not silently reverted.
    const rowCss = (readIf("src/styles/dashboard.css").split(".review-modal__row dd {")[1] ?? "").split("}")[0] ?? "";
    add("16H-F-AP2: shared review rows wrap long product addresses instead of overflowing", /overflow-wrap:\s*anywhere/.test(rowCss) && /min-width:\s*0/.test(rowCss), "wraps");
  }

  // ---- Flags ----
  add("16H-F-AQ: every implemented Step 16H flag is true (planning → suggestion → presentation → UI → integration)", [YIELD_STRATEGY_PRODUCT_CAPACITY_EXISTS, YIELD_STRATEGY_PLAN_EXISTS, YIELD_STRATEGY_PLAN_SELECTS_PRODUCT, YIELD_STRATEGY_PLAN_SELECTS_FINAL_AMOUNT, STABLE_YIELD_SUGGESTION_CONTRACT_EXISTS, STABLE_YIELD_PLAN_TO_SUGGESTION_EXISTS, STABLE_YIELD_SUGGESTION_PARTICIPATES_IN_ORDERING, STABLE_YIELD_SUGGESTION_TOP_PICK_ELIGIBLE, STABLE_YIELD_CARD_PRESENTATION_CONTRACT_EXISTS, STABLE_YIELD_REVIEW_PRESENTATION_CONTRACT_EXISTS, STABLE_YIELD_DETERMINISTIC_COPY_MAPPING_EXISTS, STABLE_YIELD_PRESENTATION_VALIDATION_EXISTS, STABLE_YIELD_REVIEW_ONLY_CTA_INTENT_EXISTS, STABLE_YIELD_SHARED_CARD_MAPPER_EXISTS, STABLE_YIELD_RENDERED_CARD_EXISTS, STABLE_YIELD_RENDERED_REVIEW_MODAL_EXISTS, STABLE_YIELD_ACCESSIBILITY_BEHAVIOR_EXISTS, STABLE_YIELD_TESTING_VISUAL_FIXTURES_EXIST, STABLE_YIELD_SHARED_PRODUCT_ORCHESTRATION_EXISTS, STABLE_YIELD_DEMO_MODE_INTEGRATION_EXISTS, STABLE_YIELD_REAL_WALLET_INTEGRATION_EXISTS].every((f) => f === true), "all true");
  add("16H-F-AR: no two Stable Yield flags contradict (aliases reconciled at 16H-F)", STABLE_YIELD_SUGGESTION_CARD_EXISTS === STABLE_YIELD_RENDERED_CARD_EXISTS && STABLE_YIELD_SUGGESTION_REVIEW_MODAL_EXISTS === STABLE_YIELD_RENDERED_REVIEW_MODAL_EXISTS && STABLE_YIELD_SUGGESTION_DEMO_UI_EXISTS === STABLE_YIELD_DEMO_MODE_INTEGRATION_EXISTS && STABLE_YIELD_SUGGESTION_REAL_WALLET_UI_EXISTS === STABLE_YIELD_REAL_WALLET_INTEGRATION_EXISTS && STABLE_YIELD_UI_ENABLED === STABLE_YIELD_RENDERED_CARD_EXISTS && STABLE_YIELD_TESTING_EXISTS === STABLE_YIELD_TESTING_VISUAL_FIXTURES_EXIST, "consistent");
  add("16H-F-AS: every Smith-AI / execution / transaction / signature / external-CTA flag is false", [STABLE_YIELD_SMITH_AI_INTEGRATION_EXISTS, STABLE_YIELD_SUGGESTION_EXECUTION_EXISTS, STABLE_YIELD_SUGGESTION_TRANSACTION_CONSTRUCTION_EXISTS, STABLE_YIELD_SUGGESTION_SIGNATURE_FLOW_EXISTS, STABLE_YIELD_EXECUTION_ENABLED, STABLE_YIELD_PROTOCOL_EXTERNAL_ACTION_CTA_EXISTS, STABLE_YIELD_EXECUTES_TRANSACTION, STABLE_YIELD_REQUIRES_WALLET_SIGNATURE, STABLE_YIELD_PLAN_PREPARES_EXECUTION, STABLE_YIELD_PLAN_BUILDS_TRANSACTION, STABLE_YIELD_PLAN_REQUESTS_SIGNATURE].every((f) => f === false), "all false");

  // ---- Documentation ----
  {
    const docs = readIf("src/suggestions/README.md") + readIf("src/suggestions/yieldStrategyPlanPresentation.md");
    add("16H-F-AT: the release documentation records Smith AI / Qdrant as deferred, not implemented", /qdrant/i.test(docs) && /smith ai[^.]{0,80}defer/i.test(docs), "deferred");
    add("16H-F-AU: no doc still claims the Stable Yield UI / Demo / Real-Wallet integration is missing", !/stable yield ui does not exist|demo integration does not exist|real.wallet integration does not exist|presentation mapping is not implemented/i.test(docs), "no stale claims");
  }

  return checks;
}


export function runMarketConditionsSurfaceFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const readIfSrc = (rel: string) => { try { return readFileSync(`${process.cwd()}/${rel}`, "utf8"); } catch { return ""; } };
  const P = Date.parse("2026-07-01T00:00:00.000Z");
  const iso = (ms: number) => new Date(ms).toISOString();
  const cacheAt = (ago: number) => ({ cacheVersion: MARKET_CONDITION_CACHE_VERSION, generatedAt: iso(P), sourceId: "coinmarketcap_crypto_fear_greed", indexId: "cmc_crypto_fear_greed", indexName: "CMC Crypto Fear & Greed Index", methodology: "cmc_crypto_fear_greed_composite", methodologyVersion: "cmc_fng_methodology_2026_1", score: 39, band: "fear", observedAt: iso(P - ago), retrievedAt: iso(P), validUntil: null, retrievalState: "cached", evidence: ["cmc"] });
  const goal = { financial_goal: "build_long_term_wealth", risk_tolerance: "medium", timeline: "5_years", contribution_frequency: "monthly", income_monthly: 4000, expenses_monthly: 1000, monthly_saving_goal: 1000 } as unknown as SavedGoal;
  const usdc = (v: number) => ({ id: "u", source: "wallet", type: "token", symbol: "USDC", name: "USD Coin", detection: "direct_wallet_balance", valueUsd: v, uiAmount: v, priceUsd: 1 } as unknown as WalletPosition);
  const sol = (v: number) => ({ id: "s", source: "wallet", type: "native", symbol: "SOL", name: "Solana", detection: "direct_wallet_balance", valueUsd: v, uiAmount: v / 150, priceUsd: 150 } as unknown as WalletPosition);
  const positions = [usdc(6000), sol(4000)];
  const rail = (cacheInput: unknown, cacheState: import("../railTargetContext").MarketConditionsCacheState) => SY_deriveRail({ positions, pricedAsOf: P, goal, marketConditionsCacheInput: cacheInput, marketConditionsCacheState: cacheState, targetGeneratedAt: P });
  const full = rail(cacheAt(3_600_000), "loaded");
  const stale = rail(cacheAt(200 * 3_600_000), "loaded");
  const degraded = rail(null, "loaded");
  const loadingR = rail(null, "loading");
  const compSrc = readIfSrc("src/components/MarketConditionsSurface.tsx");
  const dashSrc = readIfSrc("src/components/DashboardBody.tsx");
  const railSrc = readIfSrc("src/suggestions/useRailSuggestions.ts");
  const engineSrc = readIfSrc("src/suggestions/engine.ts");
  const copySrc = readIfSrc("src/state/approvedCopy.ts");

  // ---- Architecture ----
  add("MCS-1: rail exposes a minimal safe marketSummary (derived ONCE from the shared MarketConditionAssessment)", (() => { return full.marketSummary != null && (railSrc.match(/deriveRailMarketSummary\(targetContext\)/g) ?? []).length === 1; })(), "one summary");
  add("MCS-2: the standalone Market Conditions surface is REMOVED from the dashboard; the component (still present) stays informational-only (no provider fetch / no target or band recompute)", (() => { return !/MarketConditionsSurface/.test(dashSrc) && !/pro-api|X-CMC|fetch\(|deriveRecommendedAllocation|buildCanonicalTargetAllocation|MARKET_BAND_DISPLAY_LABEL|classifyMarketConditionScore|deriveTargetAllocationAssessment/.test(compSrc); })(), "removed from dashboard");
  add("MCS-3: NO direct market trigger — marketSummary is computed AFTER the engine and never passed into runSuggestionEngine; the engine reads no market score/band", (() => { const engineCallIdx = railSrc.indexOf("runSuggestionEngine("); const summaryIdx = railSrc.indexOf("deriveRailMarketSummary(targetContext)"); return summaryIdx > engineCallIdx && !/marketSummary/.test(railSrc.slice(engineCallIdx, railSrc.indexOf(");", engineCallIdx))) && !/marketSummary|marketBand|marketScore/.test(engineSrc); })(), "no trigger");
  add("MCS-4: NO standalone market/Fear-Greed suggestion candidate is emitted", (() => { return full.cards.every((c: { category?: string; id?: string }) => c.category !== "market_conditions" && c.category !== "fear_greed" && !/fear|greed|market_condition/i.test(c.id ?? "")); })(), "no candidate");

  // ---- Full state ----
  add("MCS-5: full state exposes canonical score + band + bandLabel + observedAt + CoinMarketCap + scope + 10% weight + marketIncluded", (() => { const m = full.marketSummary!; return m.state === "full" && m.score === 39 && m.band === "fear" && m.bandLabel === "Fear" && typeof m.observedAt === "string" && m.sourceName === "CoinMarketCap" && m.scopeLabel === "Broad crypto-market sentiment" && m.targetWeightPct === 10 && m.marketIncluded === true; })(), "full fields");
  add("MCS-6: the surface consumes the CANONICAL supplied band label (no UI threshold logic; bandLabel matches the assessment displayBand)", (() => { const m = full.marketSummary!; const db = full.targetContext?.marketConditionAssessment.displayBand; return m.bandLabel === db && m.bandLabel === "Fear" && !/MARKET_BAND_DISPLAY_LABEL|classifyMarketConditionScore|score >=|score <|score >/.test(compSrc); })(), "canonical band");
  add("MCS-7: full component renders 10% explanation + not-a-buy/sell + CoinMarketCap attribution + scope, and NO emotional/predictive/timing words", (() => { return /MARKET_CONDITIONS_EXPLANATION/.test(compSrc) && /MARKET_CONDITIONS_SOURCE/.test(compSrc) && /MARKET_CONDITIONS_SCOPE/.test(compSrc) && /10% of your target-allocation calculation and does not directly create buy or sell/.test(copySrc) && !/buy the dip|bullish|bearish|opportunity|danger|time the market|reduce exposure|Solana market/i.test(compSrc + copySrc); })(), "full copy");
  add("MCS-8: market-adjustment display — labelled as an adjustment in percentage points, direction shown, display-only (never eligibility)", (() => { return /increased|reduced/.test(compSrc) && /percentage points/.test(compSrc) && /Math\.abs\(adj/.test(compSrc); })(), "adjustment copy");

  // ---- Degraded / stale / loading — safe states ----
  add("MCS-9: STALE → no stale score/band/observedAt/attribution; marketExcluded true", (() => { const m = stale.marketSummary!; return m.state === "stale" && m.score === null && m.band === null && m.bandLabel === null && m.observedAt === null && m.sourceName === null && m.marketExcluded === true; })(), "stale safe");
  add("MCS-10: DEGRADED (missing/failed market) → no score/band/attribution (no fake Neutral in the data); excluded/renormalized copy", (() => { const m = degraded.marketSummary!; return m.state === "degraded" && m.score === null && m.band === null && m.bandLabel === null && m.sourceName === null && m.marketIncluded === false && /MARKET_CONDITIONS_EXCLUDED/.test(compSrc); })(), "degraded safe");
  add("MCS-11: STALE component adds the approved freshness-window line", (() => { return /MARKET_CONDITIONS_STALE/.test(compSrc) && /outside its approved freshness window/.test(copySrc); })(), "stale copy");
  add("MCS-12: LOADING → loading treatment (state loading, no score/band, no legacy value)", (() => { const m = loadingR.marketSummary!; return m.state === "loading" && m.score === null && m.band === null && /MARKET_CONDITIONS_LOADING/.test(compSrc) && /aria-busy/.test(compSrc); })(), "loading");
  add("MCS-13: blocked/unavailable/unresolved → safe simple unavailable copy; degraded/stale → exclusion copy (component branches on excludedStyle)", (() => { return /excludedStyle = state === "degraded" \|\| state === "stale"/.test(compSrc) && /MARKET_CONDITIONS_UNAVAILABLE_SIMPLE/.test(compSrc); })(), "safe branch");

  // ---- Timestamp ----
  add("MCS-14: uses observedAt (never .retrievedAt/.validUntil member access); invalid/future omitted; localized (toLocaleString)", (() => { return /summary\.observedAt/.test(compSrc) && !/\.retrievedAt|\.validUntil/.test(compSrc) && /Number\.isNaN\(ms\)/.test(compSrc) && /ms > Date\.now\(\)/.test(compSrc) && /toLocaleString\(\)/.test(compSrc); })(), "observedAt only");

  // ---- Consistency ----
  add("MCS-15: full market surface AGREES with the full target (marketIncluded true ⇔ target full); degraded agrees with degraded target", (() => { const f = full; const s = stale; return f.marketSummary!.marketIncluded === true && f.targetSummary!.state === "full" && s.marketSummary!.marketExcluded === true && s.targetSummary!.state === "degraded_market_excluded"; })(), "surface⇔target");
  add("MCS-16: full target percentages equal Rebalance/DCA/dashboard values (same canonical object)", (() => { const ct = full.targetContext?.canonicalTargetAllocation; return ct != null && full.targetSummary?.targetCryptoPct === ct.targetCryptoPct; })(), "one target");

  // ---- Copy correction ----
  add("MCS-17: the single allocation methodology tooltip names the five inputs + latest-available market conditions + the planning-only disclaimer (no 'risk-based'/'based on your risk level')", (() => { const t = ALLOCATION_METHODOLOGY; return /risk tolerance, timeline, financial goal, cash flow, and the latest available market conditions/.test(t) && /For planning only, not financial advice\./.test(t) && !/risk-based|based on your risk level/i.test(t); })(), "single tooltip copy");

  // ---- Attribution rules ----
  add("MCS-18: CoinMarketCap attribution present ONLY beside current data (full has sourceName; degraded/stale/unavailable/loading do not)", (() => { return full.marketSummary!.sourceName === "CoinMarketCap" && stale.marketSummary!.sourceName === null && degraded.marketSummary!.sourceName === null && loadingR.marketSummary!.sourceName === null; })(), "attribution gated");

  // ---- Privacy ----
  add("MCS-19: marketSummary carries no API key / provider endpoint / raw payload / retrievedAt / validUntil / income / expenses / cache internals", (() => { const s = JSON.stringify(full.marketSummary); return !/apiKey|X-CMC|pro-api|retrievedAt|validUntil|cacheVersion|income|expenses|net_?cash|savingsRate|evidence/i.test(s); })(), "privacy");

  return checks;
}
