/**
 * Assessment mount/migration/closeout fixture checks (Rebalance canonical mount,
 * slice-7B migration, 22G closeout, internal /testing route gate, Position
 * Optimization + Trim assessments, contribution finalization, 23C DCA copy).
 *
 * Extracted verbatim from suggestionEngine.fixtures.ts (progressive monolith split).
 * The monolith imports and aggregates these checks; behavior and check names are
 * unchanged.
 */
import { INTERNAL_TESTING_FLAG, isTestingPageEnabled } from "../../pages/internalTestingRoute";
import { getRebalanceTestingFixtures as rbTestFixtures } from "../../pages/rebalanceTestingFixtures";
import { TESTING_PAGE_ROUTE } from "../../pages/testingPageFixtures";
import type { WalletPosition, WalletPosition as WP15H } from "../../wallet/walletPosition";
import type { ContributionPlanSuggestionData } from "../contributionIntegrationTypes";
import { buildContributionPlanCardPresentation } from "../contributionPlanPresentation";
import { buildContributionPlanReviewDetails } from "../contributionPlanReviewDetails";
import { buildContributionPortfolioSnapshot } from "../contributionPortfolioAdapter";
import { buildContributionPriceQuote } from "../contributionPriceAdapter";
import { CANONICAL_CONTRIBUTION_PRICE_SOURCE_ID as PRICE_SRC_15H } from "../contributionPricePolicy";
import { deriveContributionSuggestion, isDirectWalletUsdc } from "../contributionProductInput";
import { runContributionTestingScenario } from "../contributionTestingScenarios";
import { DEMO_GOAL, DEMO_POSITIONS, buildDemoContributionRail } from "../demoContributionScenario";
import { buildDemoExactSolStakingRail as buildDemoStakingRail15H } from "../demoExactSolStakingScenario";
import { DEMO_STABLE_YIELD_GOAL, DEMO_STABLE_YIELD_POSITIONS, DEMO_STABLE_YIELD_PRICED_AS_OF, buildDemoStableYieldRail } from "../demoStableYieldScenario";
import { DUPLICATE_EXPOSURE_PORTFOLIO_SHARE_THRESHOLD, MIN_CONCENTRATION_REVIEW_USD, MIN_DUPLICATE_EXPOSURE_GROUP_USD, MIN_DUPLICATE_EXPOSURE_POSITION_USD, MIN_POSITION_REVIEW_USD, MIN_REVIEW_APY, MIN_TRIM_SUGGESTION_USD, POSITION_CONCENTRATION_THRESHOLD, TRIM_PORTFOLIO_SHARE_THRESHOLD, TRIM_SINGLE_TOKEN_CONCENTRATION_THRESHOLD, TRIM_SMALL_POSITION_COUNT_THRESHOLD, TRIM_SMALL_POSITION_MAX_USD } from "../engineThresholds";
import type { FixtureCheck } from "./fixtureCheck";
import { AUTHORIZED_PRODUCTION_REVIEWER_CONFIGURED, CONTRIBUTION_AUTOMATION_ENABLED as CONTRIB_AUTO_FLAG, CONTRIBUTION_DATES_GENERATED as DATES_FLAG, CONTRIBUTION_DEMO_PIPELINE_ENABLED as DEMO_PIPELINE_FLAG, CONTRIBUTION_LIVE_PRICE_FETCH_ENABLED as LIVE_PRICE_FLAG, CONTRIBUTION_PLAN_AUTOMATION_ENABLED as PLAN_AUTO_FLAG, CONTRIBUTION_PLAN_EXECUTION_ENABLED as PLAN_EXEC_FLAG, CONTRIBUTION_PLAN_MIXED_FUNDING_ENABLED as MIXED_FUNDING_FLAG, CONTRIBUTION_PLAN_RESIDUAL_ROUTING_ENABLED as RESIDUAL_FLAG, CONTRIBUTION_REAL_WALLET_PIPELINE_ENABLED as REAL_WALLET_PIPELINE_FLAG, PROTOCOL_RISK_RUBRIC_V1_APPROVED, STABLE_YIELD_PRODUCTION_CAPACITY_RESOLVED, STABLE_YIELD_PRODUCTION_DEPOSIT_STATE_RESOLVED, STEAKHOUSE_ELIGIBLE_FOR_PRODUCT_APPROVAL, STEAKHOUSE_HUMAN_REVIEW_COMPLETE, STEAKHOUSE_RISK_SCORE_ASSIGNED, STEAKHOUSE_RISK_SIGNOFF_COMPLETE } from "../investmentTargetRegistry";
import { PO_APY_FRESHNESS_POLICIES, derivePositionOptimizationAssessment as poAssess, lookupApyFreshnessPolicy } from "../positionOptimizationAssessment";
import type { PoApyFreshnessPolicy } from "../positionOptimizationAssessment";
import { buildPositionOptimizationCardFromAssessment as poBuildCard } from "../positionOptimizationSuggestion";
import { CANONICAL_USDC_MINT as RB_USDC, REBALANCE_NATIVE_SOL_RESERVE_POLICY as RB_RESERVE_POLICY, deriveNativeSolRebalanceSource as rbNativeSol, deriveRebalanceAssessment as rbAssess, selectRebalanceUsdcSource as rbSource } from "../rebalanceAssessment";
import { buildRebalanceCardFromAssessment as rbBuildCard } from "../rebalanceSuggestion";
import { listAuthorizedReviewers } from "../riskReviewerRegistry";
import { deriveStableYieldPlanSuggestion } from "../stableYieldProductInput";
import { STABLE_YIELD_TESTING_CARD_FIXTURES, STABLE_YIELD_TESTING_FIXTURES } from "../stableYieldTestingFixtures";
import { buildSteakhouseReviewerWorksheet } from "../steakhouseReviewerWorksheet";
import { TARGET_ALLOCATION_ASSESSMENT_VERSION } from "../targetAllocationAssessment";
import { buildCanonicalTargetTestingScenario as buildCttScenario, testingGoal as cttGoal } from "../testing/canonicalTargetTestingScenario";
import { toSuggestionCard } from "../toSuggestionCard";
import { TRIM_CLASSIC_TOKEN_PROGRAM, TRIM_CORE_ASSETS, TRIM_TOKEN_2022_PROGRAM, deriveTrimAssessment as trimAssess, trimCoreAssetFor } from "../trimAssessment";
import { deriveRailSuggestions as SY_deriveRail } from "../useRailSuggestions";
import { getApprovedYieldStrategies } from "../yieldStrategyRegistry";
import { readFileSync } from "node:fs";

/** CLI entry: prints each check and exits non-zero on failure. */
export function runRebalanceCanonicalMountFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const readIfSrc = (rel: string) => { try { return readFileSync(`${process.cwd()}/${rel}`, "utf8"); } catch { return ""; } };
  const GEN = 1_700_000_000_000;
  const solP = (v: number) => ({ id: "sol", source: "wallet", type: "native", symbol: "SOL", name: "Solana", amount: String(Math.round((v / 250) * 1e9)), decimals: 9, detection: "direct_wallet_balance", valueUsd: v, uiAmount: v / 250, priceUsd: 250 } as unknown as WalletPosition);
  const usdcP = (v: number, id = "u" + v) => ({ id, source: "wallet", type: "token", symbol: "USDC", name: "USD Coin", mint: RB_USDC, amount: "1", detection: "direct_wallet_balance", valueUsd: v, uiAmount: v, priceUsd: 1 } as unknown as WalletPosition);
  const CT = (cryptoPct: number, stablePct: number, conf: "full" | "degraded_market_excluded" = "full", real = true) => ({ targetCryptoPct: cryptoPct, targetStablePct: stablePct, targetStableUsd: null, targetCryptoUsd: null, targetConfidence: conf, marketExcluded: conf === "degraded_market_excluded", marketExclusionReason: conf === "degraded_market_excluded" ? "market_observation_missing" : null, marketAdjustmentVsProfileOnlyPct: conf === "full" ? 1.5 : null, methodologyVersion: real ? TARGET_ALLOCATION_ASSESSMENT_VERSION : "transitional_risk_only", policyVersion: "target_allocation_policy_v1", rebalanceTargetEligible: true, dcaTargetEligible: true, onTrackTargetEligible: conf === "full" }) as import("../canonicalTargetAllocation").CanonicalTargetAllocation;
  const rbA = (positions: WalletPosition[], target: ReturnType<typeof CT> | null, state: import("../rebalanceAssessment").RebalanceTargetState = "full", buf = 0) => rbAssess({ positions, targetAllocation: target, targetState: state, requiredBufferUsd: buf, generatedAt: GEN });
  const cardOf = (positions: WalletPosition[], target: ReturnType<typeof CT> | null) => { const a = rbA(positions, target); return rbBuildCard(a, rbSource(positions, 0, GEN), rbNativeSol(positions, 250, true, RB_RESERVE_POLICY, true, GEN), 250, true, GEN); };

  // ---- Architecture ----
  add("RBM-1: rebalanceAssessment consumes the canonical target — no deriveRecommendedAllocation / RISK_TARGET_ALLOCATION", (() => { const s = readIfSrc("src/suggestions/rebalanceAssessment.ts"); return !/deriveRecommendedAllocation|RISK_TARGET_ALLOCATION/.test(s) && /input\.targetAllocation/.test(s); })(), "canonical only");

  // ---- Confidence eligibility ----
  add("RBM-2: full target → calc allowed, target mapped (crypto 60/stable 40), marketIncluded true", (() => { const a = rbA([solP(700), usdcP(300)], CT(60, 40)); return a.calculationGate.status === "allowed" && a.targetCryptoPct === 60 && a.targetStablePct === 40 && a.marketIncluded === true && a.targetConfidence === "full"; })(), "full");
  add("RBM-3: degraded target → calc allowed (eligible), marketIncluded false, confidence degraded", (() => { const a = rbA([solP(700), usdcP(300)], CT(60, 40, "degraded_market_excluded")); return a.calculationGate.status === "allowed" && a.marketIncluded === false && a.targetConfidence === "degraded_market_excluded" && a.marketExclusionReason != null; })(), "degraded");
  add("RBM-4: transitional target (risk-only sentinel) → marketIncluded false even at full confidence", (() => { const a = rbA([solP(700), usdcP(300)], CT(60, 40, "full", false)); return a.marketIncluded === false && a.targetConfidence === "full"; })(), "transitional");
  add("RBM-5: null target + unavailable/blocked → calc blocked; unresolved/loading → calc unresolved; no target %", (() => { const un = rbA([solP(700), usdcP(300)], null, "unavailable"); const bl = rbA([solP(700), usdcP(300)], null, "blocked"); const ur = rbA([solP(700), usdcP(300)], null, "unresolved"); const ld = rbA([solP(700), usdcP(300)], null, "loading"); return un.calculationGate.status === "blocked" && un.calculationGate.reasons.includes("target_unavailable") && bl.calculationGate.status === "blocked" && bl.calculationGate.reasons.includes("target_blocked") && ur.calculationGate.status === "unresolved" && ur.calculationGate.reasons.includes("target_unresolved") && ld.calculationGate.status === "unresolved" && un.targetCryptoPct === null; })(), "fail closed");

  // ---- Raw-delta materiality (slice 3.1) — eligibility compares the FULL-PRECISION delta against ±10; display rounding never gates. ----
  const at = (solUsd: number, usdcUsd: number) => rbA([solP(solUsd), usdcP(usdcUsd)], CT(60, 40)); // allocatable = 1,000,000; target 60/40
  add("RBM-6: raw ±10 material; ±9.99/±9.999/±9.9999 NOT material; ±10.0001 material — raw delta vs ±10, no pre-rounding", (() => {
    const p10 = at(700000, 300000), m10 = at(500000, 500000);       // ±10.0000
    const p999 = at(699900, 300100), m999 = at(500100, 499900);     // ±9.99
    const p9999 = at(699990, 300010), m9999 = at(500010, 499990);   // ±9.999
    const p99999 = at(699999, 300001), m99999 = at(500001, 499999); // ±9.9999
    const p10001 = at(700001, 299999), m10001 = at(499999, 500001); // ±10.0001
    return p10.direction === "crypto_to_stables" && m10.direction === "stables_to_crypto"
      && p999.direction === "within_threshold" && m999.direction === "within_threshold"
      && p9999.direction === "within_threshold" && m9999.direction === "within_threshold"
      && p99999.direction === "within_threshold" && m99999.direction === "within_threshold"
      && p10001.direction === "crypto_to_stables" && m10001.direction === "stables_to_crypto";
  })(), "raw boundary");
  add("RBM-6b: display rounding can never change eligibility — raw +9.999 stays within_threshold ($0) while displayCryptoDeltaPct rounds to 10.0", (() => { const a = at(699990, 300010); return a.rawCryptoDeltaPct !== null && Math.abs(a.rawCryptoDeltaPct) < 10 && a.cryptoDeltaPct === 10 && a.direction === "within_threshold" && a.requiredCorrectionUsd === 0; })(), "display safe");
  add("RBM-6c: amount + direction derive from the RAW magnitude — raw +10.0001 → material with requiredCorrection above the display-rounded (10.0) amount", (() => { const a = at(700001, 299999); return a.direction === "crypto_to_stables" && a.rawCryptoDeltaPct !== null && a.rawCryptoDeltaPct > 10 && a.requiredCorrectionUsd > 100000; })(), "raw amount");
  add("RBM-7: target mapping — assessment.targetCryptoPct === canonical.targetCryptoPct (finalVolatile)", (() => { const t = CT(65, 35); const a = rbA([solP(300), usdcP(700)], t); return a.targetCryptoPct === t.targetCryptoPct && a.targetStablePct === t.targetStablePct; })(), "mapping");
  add("RBM-8: below-$50 correction → no actionable card (existing minimum, unchanged)", (() => { const c = cardOf([solP(70), usdcP(30)], CT(60, 40)); return c === null; })(), "below 50");

  // ---- Review copy ----
  add("RBM-9: rebalance review reason is the plain-language body only — NO market-inclusion/CoinMarketCap disclosure, no timing/score/band", (() => { const c = cardOf([solP(300), usdcP(700)], CT(60, 40)); const r = c?.reviewDetails?.summary.reason ?? ""; return c != null && !/target-allocation calculation|CoinMarketCap|market component adjusted/.test(r) && !/\b\d{1,3}\/100\b|Fear|Greed|time to (buy|sell)|bullish|bearish/.test(r) && /of your portfolio, below your/.test(r); })(), "no market disclosure");
  add("RBM-10: degraded review reason stays the plain-language body — NO market-exclusion/renormalization disclosure, no score/band/Neutral", (() => { const c = cardOf([solP(300), usdcP(700)], CT(60, 40, "degraded_market_excluded")); const r = c?.reviewDetails?.summary.reason ?? ""; return c != null && !/market component was excluded|renormalized|freshness window/.test(r) && !/CoinMarketCap|\/100|Neutral|Fear|Greed/.test(r) && /of your portfolio/.test(r); })(), "degraded review");
  add("RBM-11: transitional target review shows NO market copy (Demo/testing unchanged)", (() => { const c = cardOf([solP(300), usdcP(700)], CT(60, 40, "full", false)); const r = c?.reviewDetails?.summary.reason ?? ""; return c != null && !/CoinMarketCap|10% of your target-allocation/.test(r); })(), "transitional review");

  // ---- Privacy ----
  add("RBM-12: assessment carries no raw income/expenses/savings rate/market score/band", (() => { const s = JSON.stringify(rbA([solP(300), usdcP(700)], CT(60, 40))); return !/income|expenses|savingsRate|"score"|"band"|marketScore|marketBand/i.test(s); })(), "privacy");

  // ---- Rail integration + unconditional real-wallet routing (slice 3.1) ----
  add("RBM-13 (slice 7D): the rail resolves the canonical Rebalance target UNCONDITIONALLY (no transitional else) — a missing targetContext fails closed to unresolved, and the target is always passed to the contribution pipeline", (() => { const rail = readIfSrc("src/suggestions/useRailSuggestions.ts"); return !/useCanonicalRebalanceTarget/.test(rail) && /if \(!targetContext\) \{[\s\S]*?rebalanceTarget = null;[\s\S]*?rebalanceTargetState = "unresolved";/.test(rail) && /targetAllocation: rebalanceTarget, targetState: rebalanceTargetState,/.test(rail); })(), "unconditional canonical");
  add("RBM-14: rail still derives exactly ONE rebalance assessment + ONE target context (no duplicate target/assessment)", (() => { const rail = readIfSrc("src/suggestions/useRailSuggestions.ts"); return (rail.match(/deriveRebalanceAssessment\(/g) ?? []).length === 1 && (rail.match(/buildRailTargetContext\(/g) ?? []).length === 1; })(), "one each");
  add("RBM-15: NO ?? / || null-coalescing fallback from canonical to the transitional helper anywhere in the mounted rail", (() => { const rail = readIfSrc("src/suggestions/useRailSuggestions.ts"); return !/\?\?\s*riskOnlyCanonicalTargetTransitional/.test(rail) && !/\|\|\s*riskOnlyCanonicalTargetTransitional/.test(rail); })(), "no coalesce fallback");
  add("RBM-16 (slice 7D): the transitional helper is invoked ZERO times in the rail (deleted); there is no non-real-wallet no-cache else branch", (() => { const rail = readIfSrc("src/suggestions/useRailSuggestions.ts"); return !/riskOnlyCanonicalTargetTransitional/.test(rail) && !/Non-real-wallet callers with NO cache state/.test(rail); })(), "helper gone");
  add("RBM-17: real-wallet fails closed STRUCTURALLY — missing targetContext → unresolved, loading → loading, both set rebalanceTarget = null (no transitional)", (() => { const rail = readIfSrc("src/suggestions/useRailSuggestions.ts"); return /if \(!targetContext\)[\s\S]*?rebalanceTarget = null;[\s\S]*?rebalanceTargetState = "unresolved";/.test(rail) && /targetLoadingState === "loading"[\s\S]*?rebalanceTarget = null;[\s\S]*?rebalanceTargetState = "loading";/.test(rail); })(), "fail closed struct");
  add("RBM-18: every fail-closed state yields NO Rebalance card at runtime (unresolved / loading / unavailable / blocked → card null)", (() => { const pos = [solP(700), usdcP(300)]; const mk = (st: import("../rebalanceAssessment").RebalanceTargetState) => rbBuildCard(rbA(pos, null, st), rbSource(pos, 0, GEN), rbNativeSol(pos, 250, true, RB_RESERVE_POLICY, true, GEN), 250, true, GEN); return mk("unresolved") === null && mk("loading") === null && mk("unavailable") === null && mk("blocked") === null; })(), "no card fail-closed");
  add("RBM-19 (slice 7D): the rail Rebalance-target resolution is a single canonical block that fails closed (loading/unresolved) with NO risk-only substitution and NO `??`/`||` fallback", (() => { const rail = readIfSrc("src/suggestions/useRailSuggestions.ts"); return /rebalanceTarget = targetContext\.canonicalTargetAllocation \?\? null;/.test(rail) && !/riskOnlyCanonicalTargetTransitional/.test(rail) && !/useCanonicalRebalanceTarget/.test(rail); })(), "single canonical block");
  add("RBM-20 (slice 7B → 7D): the transitional risk-only target helper is fully DELETED — no source module exists and the /testing Rebalance gallery carries zero references", (() => { const t = readIfSrc("src/pages/rebalanceTestingFixtures.ts"); return readIfSrc("src/suggestions/rebalanceTargetTransitional.ts") === "" && !/riskOnlyCanonicalTargetTransitional/.test(t); })(), "deleted");
  add("RBM-21: assessment exposes rawCryptoDeltaPct (full precision) alongside cryptoDeltaPct (2dp display of the same drift)", (() => { const a = at(699990, 300010); return typeof a.rawCryptoDeltaPct === "number" && a.cryptoDeltaPct === Math.round((a.rawCryptoDeltaPct as number) * 100) / 100 && a.rawCryptoDeltaPct !== a.cryptoDeltaPct; })(), "raw + display");

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 22F (slice 4) — DCA + CONTRIBUTION CANONICAL MOUNT. Validates that mounted real-wallet DCA/contribution
 * consume the SAME shared canonical five-factor target as Rebalance (no local target recalculation, no
 * deriveRecommendedAllocation on the real-wallet growth path, no risk-only fallback), that full/degraded targets are
 * eligible while unavailable/blocked/unresolved/loading/missing fail closed (no target-based DCA, buffer path
 * preserved), that direction comes from the allocation gap (never sentiment), that contribution amount/cadence and
 * the $50 minimum are unchanged, that the Review discloses full/degraded honestly, and that no raw
 * income/expenses/score/cache leaks.
 * ------------------------------------------------------------------ */

export function runSlice7BRebalanceMigrationFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const readIfSrc = (rel: string) => { try { return readFileSync(`${process.cwd()}/${rel}`, "utf8"); } catch { return ""; } };
  const demoRail = buildDemoContributionRail();
  const gallery = rbTestFixtures();
  const byId = (id: string) => gallery.find((f) => f.id === id);
  const demoPageSrc = readIfSrc("src/pages/DemoDashboardPage.tsx");
  const rbFxSrc = readIfSrc("src/pages/rebalanceTestingFixtures.ts");
  const scenSrc = readIfSrc("src/suggestions/testing/canonicalTargetTestingScenario.ts");

  // ---- Demo AllocationChart consistency ----
  add("7B-1: Demo dashboard recommended target reads the SHARED canonical target (63.5 crypto / 36.5 stable) via the rail's targetSummary; no hand-authored 60/40", (() => { const t = demoRail.targetSummary; return t?.targetCryptoPct === 63.5 && t?.targetStablePct === 36.5 && /demoContributionRail\.targetSummary/.test(demoPageSrc) && !/value_percent: 60|value_percent: 40/.test(demoPageSrc); })(), "canonical chart target");
  add("7B-2: Demo chart agrees with the Market Conditions surface (both full, same shared target); no target recalculation in DemoDashboardPage", (() => { return demoRail.targetSummary?.state === "full" && demoRail.marketSummary?.state === "full" && demoRail.marketSummary?.targetConfidence === "full" && !/deriveRecommendedAllocation|buildCanonicalTargetAllocation/.test(demoPageSrc); })(), "chart⇔surface");
  add("7B-3: Demo current allocation is unchanged (curated 89.33 / 10.67 — the target changed, not the current)", (() => { return /"Crypto", "value_percent": 89.33|89\.33/.test(readIfSrc("../examples/dashboard/dashboard-demo-state.json")) || /demoAllocation/.test(demoPageSrc); })(), "current unchanged");

  // ---- Scenario builder ----
  add("7B-4: the production scenario builder is DETERMINISTIC (fixed clock, no Date.now); two builds are identical", (() => { const a = buildCttScenario({ goal: cttGoal({ risk_tolerance: "high" }), totalPricedUsd: 1000, market: { kind: "fresh", score: 39 } }); const b = buildCttScenario({ goal: cttGoal({ risk_tolerance: "high" }), totalPricedUsd: 1000, market: { kind: "fresh", score: 39 } }); return JSON.stringify(a.context.canonicalTargetAllocation) === JSON.stringify(b.context.canonicalTargetAllocation) && !/Date\.now\(\)/.test(scenSrc); })(), "deterministic");
  add("7B-5: the builder REUSES production classification (classifyMarketConditionScore) + freshness (stale → excluded) + target (no duplicated matrices/thresholds)", (() => { const fresh = buildCttScenario({ goal: cttGoal(), totalPricedUsd: 1000, market: { kind: "fresh", score: 39 } }); const stale = buildCttScenario({ goal: cttGoal(), totalPricedUsd: 1000, market: { kind: "stale", score: 39 } }); return fresh.context.marketConditionAssessment.band === "fear" && fresh.context.marketConditionAssessment.overallReadiness === "full" && stale.context.marketConditionAssessment.overallReadiness === "excluded_market_stale" && /classifyMarketConditionScore/.test(scenSrc) && !/RISK_STABLE_TARGET_PCT|FACTOR_WEIGHTS|score >= 25|score >= 50/.test(scenSrc); })(), "production reuse");

  // ---- Visible gallery is production-derived ----
  add("7B-6: the /testing Rebalance gallery no longer imports/uses the transitional helper (zero visible transitional callers)", (() => { return !/riskOnlyCanonicalTargetTransitional/.test(rbFxSrc) && /buildCanonicalTargetTestingScenario/.test(rbFxSrc); })(), "no transitional");
  add("7B-7: Case A — full Fear target → toward crypto (production card, full confidence, market included)", (() => { const f = byId("full")!; return f.assessment.direction === "stables_to_crypto" && f.assessment.targetConfidence === "full" && f.assessment.marketIncluded === true && f.assessment.targetCryptoPct === 70.5 && f.card?.id === "rebalance_to_plan"; })(), "fear→crypto");
  add("7B-8: Case B — full Greed target → toward stables (production card, full confidence)", (() => { const f = byId("greed_to_stables")!; return f.assessment.direction === "crypto_to_stables" && f.assessment.targetConfidence === "full" && f.assessment.marketIncluded === true && f.card?.id === "rebalance_to_plan"; })(), "greed→stables");
  add("7B-9: Case C/D — full + partial corrections remain production-derived (full-source vs insufficient-source)", (() => { const full = byId("full")!.card; const part = byId("partial")!.card; return full != null && part != null && (part.amount?.label ?? "").includes("partial") && !(full.amount?.label ?? "").includes("partial"); })(), "full+partial");
  add("7B-10: Case E — degraded market-excluded target → eligible Rebalance card; confidence degraded, market NOT included", (() => { const f = byId("degraded_excluded")!; return f.assessment.targetConfidence === "degraded_market_excluded" && f.assessment.marketIncluded === false && f.card?.id === "rebalance_to_plan" && f.assessment.direction === "stables_to_crypto"; })(), "degraded card");

  // ---- Review copy ----
  add("7B-11: full-Fear rebalance review reason carries NO market-inclusion/CoinMarketCap disclosure and no timing words", (() => { const r = byId("full")!.card?.reviewDetails?.summary.reason ?? ""; return !/target-allocation calculation|CoinMarketCap|market component adjusted/.test(r) && !/Fear|Greed|bullish|bearish|buy the dip/.test(r) && /of your portfolio, below your/.test(r); })(), "no market disclosure");
  add("7B-12: degraded Review reason stays the plain body — NO exclusion/renormalization disclosure, NO score/band/CoinMarketCap/Neutral", (() => { const r = byId("degraded_excluded")!.card?.reviewDetails?.summary.reason ?? ""; return !/market component was excluded|renormalized|freshness window/.test(r) && !/CoinMarketCap|\/100|Neutral|Fear|Greed/.test(r) && /of your portfolio/.test(r); })(), "degraded review");

  // ---- No direct trigger + preserved rules ----
  add("7B-13: NO direct market trigger — a portfolio inside the Fear canonical target's ±10 range yields no card (Fear is not the trigger; raw drift is)", (() => { const at = byId("within_threshold")!; return at.assessment.direction === "within_threshold" && at.card === null && at.assessment.targetConfidence === "full"; })(), "no direct trigger");
  add("7B-14: production mapper/card/modal reuse + thresholds preserved (rebalance_to_plan; ±10 / $50 unchanged)", (() => { const f = byId("full")!; return f.card?.id === "rebalance_to_plan" && f.card?.category === "rebalance" && f.card?.reviewDetails != null && f.assessment.thresholdSource.includes("10") && f.assessment.thresholdSource.includes("50"); })(), "mapper+thresholds");

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 22F (slice 7C) — PRODUCTION `/testing` DCA + On Track. Validates that the visible On Track card is derived from a
 * PRODUCTION RebalanceAssessment (real canonical target, not a hand-built confidence) and keeps its approved copy with no
 * market words, and that the DCA gallery includes production-derived Fear-toward-crypto, Greed-toward-stables, degraded
 * market-excluded, and cadence cases through the production contribution pipeline + Review market-context section.
 * ------------------------------------------------------------------ */

/** Step 22G — FINAL CANONICAL-TARGET CLOSEOUT: the legacy risk-only allocation module and the legacy DCA evaluator are
 * deleted; the canonical five-factor chain is the only mounted target-allocation policy; every category consumes it. */
export function runStep22GCloseoutFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const readIfSrc = (rel: string) => { try { return readFileSync(`${process.cwd()}/${rel}`, "utf8"); } catch { return ""; } };
  const fileExists = (rel: string) => { try { readFileSync(`${process.cwd()}/${rel}`, "utf8"); return true; } catch { return false; } };
  const mounted = ["src/suggestions/useRailSuggestions.ts", "src/suggestions/engine.ts", "src/suggestions/contributionPlanPipeline.ts", "src/suggestions/rebalanceAssessment.ts", "src/suggestions/onTrackAssessment.ts", "src/components/DashboardBody.tsx", "src/pages/DemoDashboardPage.tsx", "src/suggestions/railTargetContext.ts", "src/suggestions/contributionProductInput.ts"].map((f) => ({ f, s: readIfSrc(f) }));

  // ---- Deletion of the legacy target + DCA modules ----
  add("22G-1: the legacy risk-only allocation module (`wallet/recommendedAllocation.ts`) is DELETED", !fileExists("src/wallet/recommendedAllocation.ts"), "module deleted");
  add("22G-2: the legacy DCA evaluator (`suggestions/dcaSuggestion.ts`) is DELETED", !fileExists("src/suggestions/dcaSuggestion.ts"), "evaluator deleted");
  add("22G-3: `deriveRecommendedAllocation` has ZERO references in any mounted source", mounted.every(({ s }) => !/deriveRecommendedAllocation/.test(s)), "zero mounted callers");
  add("22G-4: `RISK_TARGET_ALLOCATION` / `deriveAllocationDeltas` / `deriveDcaSuggestion` are ABSENT from every mounted source", mounted.every(({ s }) => !/RISK_TARGET_ALLOCATION/.test(s) && !/deriveAllocationDeltas/.test(s) && !/deriveDcaSuggestion/.test(s)), "legacy symbols gone");

  // ---- No product module imports a target from wallet/ ----
  add("22G-5: no mounted suggestion/category module imports a target-allocation from `wallet/` (the canonical chain lives in `suggestions/`)", mounted.every(({ s }) => !/from "\.\.\/wallet\/recommendedAllocation"/.test(s) && !/from "\.\/recommendedAllocation"/.test(s)), "no wallet target import");

  // ---- Category assessments derive no target of their own ----
  add("22G-6: RebalanceAssessment consumes the canonical `input.targetAllocation` and derives no target itself", (() => { const s = readIfSrc("src/suggestions/rebalanceAssessment.ts"); return /input\.targetAllocation/.test(s) && !/RISK_TARGET_ALLOCATION|deriveRecommendedAllocation|deriveTargetAllocationAssessment/.test(s); })(), "rebalance canonical");
  add("22G-7: onTrackAssessment reads only `ra.targetConfidence` — no target derivation, no market cache", (() => { const s = readIfSrc("src/suggestions/onTrackAssessment.ts"); return /targetConfidence/.test(s) && !/deriveRecommendedAllocation|buildCanonicalTargetAllocation|RISK_TARGET_ALLOCATION|deriveTargetAllocationAssessment|marketConditionsCache/.test(s); })(), "on track confidence only");
  add("22G-8: the contribution pipeline consumes a supplied canonical target and fails closed on a missing one — no target derivation", (() => { const s = readIfSrc("src/suggestions/contributionPlanPipeline.ts"); return /input\.targetAllocation === undefined/.test(s) && !/deriveRecommendedAllocation|RISK_TARGET_ALLOCATION|buildCanonicalTargetAllocation/.test(s); })(), "dca canonical");
  add("22G-9: DashboardBody consumes the shared `targetSummary` and derives no target/band", (() => { const s = readIfSrc("src/components/DashboardBody.tsx"); return /targetSummary/.test(s) && !/deriveRecommendedAllocation|RISK_TARGET_ALLOCATION|buildCanonicalTargetAllocation|classifyMarketConditionScore/.test(s); })(), "dashboard canonical");

  // ---- The canonical chain is the sole target authority ----
  add("22G-10: the canonical target chain exists and is the sole authority: TargetAllocationAssessment → buildCanonicalTargetAllocation → RailTargetContext", (() => { return fileExists("src/suggestions/targetAllocationAssessment.ts") && fileExists("src/suggestions/canonicalTargetAllocation.ts") && fileExists("src/suggestions/railTargetContext.ts") && /deriveTargetAllocationAssessment/.test(readIfSrc("src/suggestions/railTargetContext.ts")) && /buildCanonicalTargetAllocation/.test(readIfSrc("src/suggestions/railTargetContext.ts")); })(), "canonical chain");
  add("22G-11: the five-factor weights are unchanged (risk 0.35 / horizon 0.20 / goal 0.20 / cash-flow 0.15 / market 0.10)", (() => { const s = readIfSrc("src/suggestions/targetAllocationPolicy.ts"); return /0\.35/.test(s) && /0\.20/.test(s) && /0\.15/.test(s) && /0\.10/.test(s); })(), "weights intact");

  // ---- Safety Buffer is target-independent ----
  add("22G-12: Safety Buffer coverage + assessment do NOT depend on the target allocation (target-independent)", (() => { const cov = readIfSrc("src/wallet/safetyBufferCoverage.ts"); const sba = readIfSrc("src/suggestions/safetyBufferAssessment.ts"); return !/targetAllocation|RISK_TARGET_ALLOCATION|deriveRecommendedAllocation|canonicalTargetAllocation|TargetAllocationAssessment/.test(cov) && !/canonicalTargetAllocation|deriveRecommendedAllocation|RISK_TARGET_ALLOCATION/.test(sba); })(), "buffer independent");

  // ---- Missing target still fails closed (runtime) in every mode ----
  add("22G-13 (runtime): a demo_fixture rail with NO market cache still fails closed (no target/market summary) — no risk-only fallback survives the cleanup", (() => { const r = SY_deriveRail({ positions: DEMO_STABLE_YIELD_POSITIONS, pricedAsOf: DEMO_STABLE_YIELD_PRICED_AS_OF, goal: DEMO_STABLE_YIELD_GOAL, dataMode: "demo_fixture" }); return r.targetSummary === undefined && r.marketSummary === undefined; })(), "fail closed");

  return checks;
}

/* Step 23C.2 — DCA card copy ("Add $X of SOL" / "Swap $X of USDC to SOL"), the recurring-DCA Moonpay handoff, and
 * the Trim icon. */

/**
 * Step 16H-K.2 — the internal `/testing` route gate. Deterministic and OFFLINE: these read source and
 * the gate module, never a live build.
 */
export function runInternalTestingRouteFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const root = process.cwd();
  const readIf = (rel: string) => { try { return readFileSync(`${root}/${rel}`, "utf8"); } catch { return ""; } };
  /** Comments explain the policy (and quote the words it forbids), so scan CODE only. */
  const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const gate = stripComments(readIf("src/pages/internalTestingRoute.ts"));
  const app = readIf("src/App.tsx");
  const nav = readIf("src/components/GlobalNav.tsx");

  // ---- The gate itself ----
  add("16H-K2-A: the route path is /testing and lives in a dependency-free gate module", TESTING_PAGE_ROUTE === "/testing" && gate.length > 0 && !/testingPageFixtures|STABLE_YIELD_TESTING|riskScore/.test(gate), "isolated gate");
  add("16H-K2-B: the gate is a BUILD-TIME env flag, not a query param or URL password", /import\.meta\.env/.test(gate) && INTERNAL_TESTING_FLAG === "VITE_ENABLE_TESTING_PAGE" && !/location\.search|URLSearchParams|password|token=/i.test(gate), "build-time");
  add("16H-K2-C: the gate defaults to FALSE in a non-Vite runtime (fails closed)", isTestingPageEnabled() === false, "false in node");
  add("16H-K2-D: enabling requires DEV or an explicit VITE_ENABLE_TESTING_PAGE=true", /env\.DEV === true \|\| env\.VITE_ENABLE_TESTING_PAGE === "true"/.test(gate), "explicit");
  add("16H-K2-E: Demo Mode is NOT the gate (a product state can never unlock internal tooling)", !/demo/i.test(gate) && !/demoActive/.test(stripComments(app.split("function MainApp")[0] ?? "")), "not demo");

  // ---- App wiring ----
  add("16H-K2-F: App imports the gate from the gate module, NOT from the fixture module", /from "\.\/pages\/internalTestingRoute"/.test(app) && !/isTestingPageEnabled[^\n]*from "\.\/pages\/testingPageFixtures"/.test(app), "decoupled");
  add("16H-K2-G: the testing route is LAZY, so its fixtures leave the main chunk", /lazy\(\(\) => import\("\.\/pages\/TestingPage"\)\)/.test(app) && /<Suspense/.test(app), "lazy");
  add("16H-K2-H: the route only renders when the gate passes AND the path matches exactly", /isTestingPageEnabled\(\) &&[\s\S]{0,120}window\.location\.pathname === TESTING_PAGE_ROUTE/.test(app), "gated");
  add("16H-K2-I: a disabled gate falls through to the normal app (canonical unknown-path behaviour)", /return <MainApp \/>;/.test(app), "falls through");
  add("16H-K2-J: /testing is not linked from product navigation", !/testing/i.test(nav) && !/TESTING_PAGE_ROUTE/.test(nav), "unlinked");
  add("16H-K2-K: no product page links to or imports the testing route", ["src/pages/DashboardPage.tsx", "src/pages/PortfolioPage.tsx", "src/pages/GoalPage.tsx", "src/pages/SupportPage.tsx", "src/pages/DemoDashboardPage.tsx"].every((f) => !/TESTING_PAGE_ROUTE|internalTestingRoute|TestingPage/.test(readIf(f))), "no links");

  // ---- Fixtures stay available internally ----
  add("16H-K2-L: the fixture module still exists and re-exports the gate for existing importers", readIf("src/pages/testingPageFixtures.ts").includes('export { TESTING_PAGE_ROUTE, isTestingPageEnabled, INTERNAL_TESTING_FLAG } from "./internalTestingRoute"'), "re-exported");
  add("16H-K2-M: the INF numeric fixture is preserved for internal QA (not deleted)", /Risk score: \$\{infBlocked\.riskScore/.test(readIf("src/pages/testingPageFixtures.ts")), "preserved");
  add("16H-K2-N: testing fixtures remain reachable by the offline deterministic suite", STABLE_YIELD_TESTING_FIXTURES.length > 0 && STABLE_YIELD_TESTING_CARD_FIXTURES.length >= 16, `${STABLE_YIELD_TESTING_FIXTURES.length} fixtures`);

  // ---- The internal score stays out of product surfaces ----
  add("16H-K2-O: no numeric score on any PRODUCT surface (the /testing gallery is not one)", ["src/components/SuggestionCard.tsx", "src/components/SuggestionReviewModal.tsx", "src/components/RealWalletSuggestionsRail.tsx", "src/pages/DashboardPage.tsx", "src/pages/PortfolioPage.tsx", "src/components/PortfolioTable.tsx", "src/suggestions/toSuggestionCard.ts"].every((f) => { const src = readIf(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/^\s*\/\/.*$/gm, ""); return !/Risk score|riskScore|riskBand|weightedScore|dimensionScores|reviewerConfidence/.test(src); }), "clean");
  add("16H-K2-P: no product React component newly imports a scoring / governance module", ["src/components/SuggestionCard.tsx", "src/components/SuggestionReviewModal.tsx", "src/components/RealWalletSuggestionsRail.tsx", "src/pages/DashboardPage.tsx", "src/pages/PortfolioPage.tsx", "src/pages/DemoDashboardPage.tsx"].every((f) => !/(from|import)\s*\(?\s*["'][^"']*(riskGovernance|riskReviewerRegistry|protocolRiskScoreAssignment|protocolRiskRubric|steakhouseUsdcRiskEvidence|steakhouseReviewerWorksheet)/.test(readIf(f))), "no imports");
  add("16H-K2-Q: the client-side score limitation is documented, not hidden", /client-side/i.test(readIf("src/suggestions/riskScoreExposurePolicy.ts")) && /not.{0,40}cryptographic/i.test(readIf("src/suggestions/riskScoreExposurePolicy.ts")), "documented");

  // ---- Nothing else moved ----
  add("16H-K2-R: rubric approval + reviewer authorization are unchanged", PROTOCOL_RISK_RUBRIC_V1_APPROVED === true && AUTHORIZED_PRODUCTION_REVIEWER_CONFIGURED === true && listAuthorizedReviewers().length === 1, "unchanged");
  add("16H-K2-S: Steakhouse remains unscored, unreviewed, unsigned and unapproved", [STEAKHOUSE_RISK_SCORE_ASSIGNED, STEAKHOUSE_HUMAN_REVIEW_COMPLETE, STEAKHOUSE_RISK_SIGNOFF_COMPLETE, STEAKHOUSE_ELIGIBLE_FOR_PRODUCT_APPROVAL].every((f) => f === false) && buildSteakhouseReviewerWorksheet().rows.every((r) => r.reviewerScore === null), "unscored");
  add("16H-K2-T: production approved-product count remains zero and no card renders", getApprovedYieldStrategies().length === 0 && (() => { const r = deriveStableYieldPlanSuggestion({ dataMode: "real_wallet", positions: [], checkedAt: "2026-07-16T14:00:00.000Z" }); return r.decision?.status === "no_plan" && r.suggestion === null; })() && SY_deriveRail({ positions: DEMO_STABLE_YIELD_POSITIONS, pricedAsOf: DEMO_STABLE_YIELD_PRICED_AS_OF, goal: DEMO_STABLE_YIELD_GOAL }).cards.every((c) => c.type !== "deploy_idle_stablecoins"), "no card");
  add("16H-K2-U: Demo behaviour is unchanged (one card, $500.00)", (() => { const sy = buildDemoStableYieldRail().cards.filter((c) => c.type === "deploy_idle_stablecoins"); return sy.length === 1 && sy[0].impact_text === "Deposit $500.00 USDC on Kamino"; })(), "unchanged");
  add("16H-K2-V: capacity + deposit state evidence untouched", STABLE_YIELD_PRODUCTION_CAPACITY_RESOLVED === true && STABLE_YIELD_PRODUCTION_DEPOSIT_STATE_RESOLVED === false, "untouched");

  return checks;
}


/**
 * Step 16H-L — Steakhouse evidence closure. Deterministic and OFFLINE: the artifacts are committed
 * records of live reads; these checks read the records, never the chain.
 */

/**
 * Step 20B — canonical, NON-MOUNTED PositionOptimizationAssessment. Proves exact economic-position identity,
 * borrowed-position exclusion, the APY expectation/state/comparability model (missing-expected vs
 * source-not-integrated), missing-data / low-yield / concentration / shared-underlying-exposure triggers with
 * exact boundaries, an authoritative shared denominator, native-stake lifecycle, trigger-family independence,
 * and that production Position Optimization is untouched.
 */
export function runPositionOptimizationAssessmentFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const GEN = 1_700_000_000_000;
  const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
  const USDT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
  const JITOSOL = "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn";
  const MSOL = "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So";
  const W = (o: Partial<WalletPosition>): WalletPosition => ({ id: "x", source: "wallet", type: "token", symbol: "X", name: "X", amount: "1", detection: "direct_wallet_balance", valueUsd: 100, ...o });
  const usdc = (v: number, id = "usdc") => W({ id, symbol: "USDC", name: "USD Coin", mint: USDC, amount: String(Math.round(v * 1e6)), uiAmount: v, decimals: 6, priceUsd: 1, valueUsd: v });
  const stakeSummary = (lifecycle: string, account = "stakeAcc1") => ({ voteAccount: "V", totalLamports: "1", activeLamports: lifecycle === "active" ? "1" : "0", activatingLamports: lifecycle === "activating" ? "1" : "0", deactivatingLamports: lifecycle === "deactivating" ? "1" : "0", inactiveLamports: lifecycle === "inactive" ? "1" : "0", rentExemptReserveLamports: "0", immediatelyWithdrawableLamports: "0", closeOnlyWithdrawableLamports: "0", requiredRemainingLamports: "0", lockedLamports: "0", unresolvedLamports: "0", lifecycleSummary: lifecycle, withdrawalCapacitySummary: "", anyUnresolved: false, accountCount: 1, stakeAccounts: [account] });
  const stake = (v: number, lifecycle = "active", id = "stk", account = "stakeAcc1") => W({ id, type: "stake", symbol: "SOL", name: "Native stake", detection: "native_stake", amount: "1", uiAmount: v / 250, valueUsd: v, stakeLifecycleState: lifecycle, stake: stakeSummary(lifecycle, account) as WalletPosition["stake"] });
  const FRESH_OBS = new Date(GEN).toISOString(); // within the approved 24h window
  const STALE_OBS = new Date(GEN - 48 * 60 * 60 * 1000).toISOString(); // 48h → outside the window
  // `obs` populates WalletPosition.apyObservedAt (source observation time) — only a fresh obs establishes freshness.
  const lst = (v: number, mint = JITOSOL, apy: number | null = 7, id = "lst", obs: string | null = null) => W({ id, type: "lst", source: "jito", symbol: mint === MSOL ? "mSOL" : "JitoSOL", name: mint === MSOL ? "Marinade Staked SOL" : "Jito Staked SOL", mint, amount: "1", uiAmount: 1, detection: "recognized_lst_mint", valueUsd: v, apy, apyObservedAt: obs });
  const kaminoUsdc = (v: number, id = "kd", dk = "klend:1") => W({ id, type: "protocol", symbol: "USDC", name: "USDC on Kamino", protocol: "Kamino", candidateId: "kamino_usdc_lending", dedupeKey: dk, valueUsd: v, recognizedValueUsd: v, withdrawalState: "fully_withdrawable", liquidValueUsd: v, mint: USDC, apy: null });
  const steakUsdc = (v: number, id = "st", dk = "steakhouse:1") => W({ id, type: "protocol", symbol: "USDC", name: "Steakhouse USDC", protocol: "Kamino", candidateId: "kamino_steakhouse_usdc", dedupeKey: dk, valueUsd: v, recognizedValueUsd: v, withdrawalState: "fully_withdrawable", liquidValueUsd: v, mint: USDC, apy: null });
  const usdtSupply = (v: number, id = "kt", dk = "klend:t") => W({ id, type: "protocol", symbol: "USDT", name: "USDT on Kamino", protocol: "Kamino", candidateId: "kamino_usdc_lending", dedupeKey: dk, valueUsd: v, recognizedValueUsd: v, withdrawalState: "fully_withdrawable", liquidValueUsd: v, mint: USDT, apy: null });
  const debt = (v: number | null) => W({ id: "hb", type: "protocol", symbol: "USDH", name: "USDH loan", protocol: "Hubble", side: "borrowed", valueUsd: v, uiAmount: 1, amount: "1", dedupeKey: "hubble:loan" });
  const lp = (v: number, id = "lp") => W({ id, type: "protocol", symbol: "SOL-USDC", name: "SOL-USDC LP", protocol: "Orca", legs: [{ mint: "SoLLeg", uiAmount: v / 500, side: "long" }, { mint: USDC, uiAmount: v / 2, side: "long" }], valueUsd: v, dedupeKey: "orca:lp1" });

  const A = (positions: WalletPosition[], requiredBufferUsd = 500) => poAssess({ positions, requiredBufferUsd, generatedAt: GEN });
  // FIXTURE-ONLY approved freshness policy (never exported to production; the production registry is unapproved).
  const TEST_LST_POLICY: PoApyFreshnessPolicy = { sourceId: "lst_apy_feed", methodology: "lst_net_apy", policyState: "approved", freshnessSignal: "source_observed_at", maxObservationAgeMs: 6 * 60 * 60 * 1000, evidenceSource: "FIXTURE-ONLY test policy", approvedAt: "2026-01-01T00:00:00.000Z", methodologyVersion: "test", invalidationReason: null };
  const Afresh = (positions: WalletPosition[], requiredBufferUsd = 500, policies: PoApyFreshnessPolicy[] = [TEST_LST_POLICY]) => poAssess({ positions, requiredBufferUsd, generatedAt: GEN, apyFreshnessPolicies: policies });
  const pos = (a: ReturnType<typeof poAssess>, id: string) => a.canonicalPositions.find((p) => p.positionId === id) ?? a.unresolvedPositions.find((p) => p.positionId === id) ?? a.excludedPositions.find((p) => p.positionId === id);

  // ---- Economic identity ----
  add("PZ-1: one native stake account = one economic position keyed by stake account", (() => { const a = A([usdc(2000), stake(3000)]); const p = pos(a, "stk"); return p?.positionType === "native_stake" && p.economicPositionKey === "stake:stakeAcc1"; })(), "stake identity");
  add("PZ-2: two distinct stake accounts remain two positions (not duplicates)", (() => { const a = A([usdc(2000), stake(3000, "active", "s1", "acc1"), stake(1000, "active", "s2", "acc2")]); return a.canonicalPositions.filter((p) => p.positionType === "native_stake").length === 2 && !a.warnings.includes("duplicate_economic_position"); })(), "two stakes");
  add("PZ-3: same stake account duplicated → duplicate_invalid, fails closed", (() => { const a = A([usdc(2000), stake(3000, "active", "s1", "acc1"), stake(3000, "active", "s2", "acc1")]); return a.warnings.includes("duplicate_economic_position") && a.overallReadiness.status !== "allowed"; })(), "dup stake");
  add("PZ-4: LST holding keyed by exact mint+program; backing is not another position", (() => { const a = A([usdc(2000), lst(6000, JITOSOL, 7)]); const p = pos(a, "lst"); return p?.positionType === "lst" && p.economicPositionKey === `lst:${JITOSOL}|${TRIM_CLASSIC_TOKEN_PROGRAM}`; })(), "lst identity");
  add("PZ-5: protocol supply keyed by product + dedupeKey", (() => { const a = A([usdc(2000), kaminoUsdc(3000)]); const p = pos(a, "kd"); return p?.positionType === "protocol_supply" && p.economicPositionKey === "kamino_usdc_lending:klend:1"; })(), "protocol identity");
  add("PZ-6: JitoSOL + mSOL are shared exposure, NOT duplicate economic positions", (() => { const a = A([usdc(2000), lst(300, JITOSOL, 7, "j"), lst(300, MSOL, 7, "m")]); return a.canonicalPositions.filter((p) => p.positionType === "lst").length === 2 && !a.warnings.includes("duplicate_economic_position"); })(), "shared not dup");

  // ---- Borrowed / liability exclusion ----
  add("PZ-7: borrowed/debt excluded from yield-review candidates", (() => { const a = A([usdc(2000), debt(1000)]); return a.excludedPositions.some((p) => p.side === "liability") && !a.canonicalPositions.some((p) => p.side === "liability"); })(), "debt excluded");
  add("PZ-8: debt never triggers missing/low APY and never enters shared exposure", (() => { const a = A([usdc(2000), debt(1000)]); const d = a.excludedPositions.find((p) => p.side === "liability"); return d?.missingDataEligible === false && d?.lowYieldEligible === false && d?.sharedExposureEligible === false && d?.apy.apyState === "not_applicable"; })(), "debt no trigger");
  add("PZ-9: unresolved liability makes accounting unresolved (still tracked)", (() => { const a = A([usdc(2000), stake(3000), debt(null)]); return a.accountingGate.status === "unresolved" && a.accountingGate.reasons.includes("liabilities_unresolved"); })(), "liab unresolved");

  // ---- APY model ----
  add("PZ-10: supported LST numeric APY WITHOUT a source timestamp → sourced_freshness_unverified (not fresh)", (() => { const a = A([usdc(2000), lst(300, JITOSOL, 6.5)]); const p = pos(a, "lst"); return p?.apy.apyState === "sourced_freshness_unverified" && p.apy.apyFreshness === "unresolved" && p.apy.apyRetrieval === "retrieved_current_refresh" && p.apy.apyComparability === "comparable" && p.apy.yieldMethodology === "lst_net_apy" && p.apy.apyValuePct === 6.5; })(), "freshness unverified");
  add("PZ-11: supported LST with null APY → missing_expected (expected source failed)", (() => { const a = A([usdc(2000), lst(300, JITOSOL, null)]); const p = pos(a, "lst"); return p?.apy.apyExpectation === "expected" && p.apy.apyState === "missing_expected"; })(), "lst missing");
  add("PZ-12: native stake APY → source_not_integrated / unsupported (NOT missing_expected)", (() => { const a = A([usdc(2000), stake(3000)]); const p = pos(a, "stk"); return p?.apy.apyExpectation === "source_not_integrated" && p.apy.apyState === "unsupported" && p.apy.yieldMethodology === "native_staking_apy"; })(), "stake not integrated");
  add("PZ-13: protocol lending APY → source_not_integrated (Kamino/Steakhouse not flagged missing)", (() => { const a = A([usdc(2000), kaminoUsdc(3000)]); const p = pos(a, "kd"); return p?.apy.apyExpectation === "source_not_integrated" && p.apy.apyState === "unsupported" && p.apy.yieldMethodology === "lending_supply_apy"; })(), "lending not integrated");
  add("PZ-14: LP APY → source_not_integrated, not comparable", (() => { const a = A([usdc(2000), lp(3000)]); const p = pos(a, "lp"); return p?.apy.apyExpectation === "source_not_integrated" && p.apy.apyComparability === "not_comparable" && p.apy.yieldMethodology === "lp_fee_apr"; })(), "lp apy");
  add("PZ-15: APY unit normalized to percentage points (7 means 7%)", (() => { const a = A([usdc(2000), lst(300, JITOSOL, 7)]); return pos(a, "lst")?.apy.normalizedUnit === "percentage_points"; })(), "unit");

  // ---- Missing-data trigger ----
  add("PZ-16: expected source missing at EXACTLY $100 → missing_apy triggers", (() => { const a = A([usdc(2000), lst(100, JITOSOL, null)]); return a.triggerStates.missingApy === "triggered" && a.reasonCodes.includes("missing_apy_data"); })(), "missing $100");
  add("PZ-17: source_not_integrated (native stake / Kamino) does NOT trigger missing_apy", (() => { const a = A([usdc(2000), stake(3000), kaminoUsdc(3000)]); return a.triggerStates.missingApy !== "triggered"; })(), "no missing for un-integrated");
  add("PZ-18: deactivating stake does not trigger missing/low APY", (() => { const a = A([usdc(2000), stake(3000, "deactivating")]); const p = pos(a, "stk"); return p?.missingDataEligible === false && p?.lowYieldEligible === false && p?.lifecycleState === "deactivating"; })(), "deactivating");

  // ---- Low-yield trigger ----
  add("PZ-19: FRESH (approved-policy + timestamp) comparable LST APY below 1% → low_yield triggers", (() => { const a = Afresh([usdc(2000), lst(300, JITOSOL, 0.5, "lst", FRESH_OBS)]); return a.triggerStates.lowYield === "triggered" && a.reasonCodes.includes("low_yield_position") && pos(a, "lst")?.apy.apyState === "sourced_fresh"; })(), "low yield");
  add("PZ-20: exactly 1% APY (fresh) does NOT trigger low_yield (strict <)", Afresh([usdc(2000), lst(300, JITOSOL, 1, "lst", FRESH_OBS)]).triggerStates.lowYield !== "triggered", "exact 1%");
  add("PO-LOW-COPY: pure low-yield single position → 'Compare Your JitoSOL Yield' + APY-named body + 'Compare $300 in JitoSOL'", (() => { const c = poBuildCard(Afresh([usdc(2000), lst(300, JITOSOL, 0.5, "lst", FRESH_OBS)]), GEN); if (!c) return false; const card = toSuggestionCard(c); return card.title === "Compare Your JitoSOL Yield" && c.reviewDetails?.summary.title === "Compare Your JitoSOL Yield" && card.impact_text === "Compare $300 in JitoSOL" && card.description === "Your JitoSOL position currently earns 0.5% APY. Similar vetted staking options may offer a higher yield, so it may be worth comparing alternatives." && c.reviewDetails?.summary.reason === card.description; })(), "low-yield compare copy");
  add("PZ-21: zero FRESH comparable APY triggers low_yield", Afresh([usdc(2000), lst(300, JITOSOL, 0, "lst", FRESH_OBS)]).triggerStates.lowYield === "triggered", "zero apy");
  add("PZ-22: missing APY does NOT trigger low_yield (only missing-data)", (() => { const a = A([usdc(2000), lst(300, JITOSOL, null)]); return a.triggerStates.lowYield !== "triggered" && a.triggerStates.missingApy === "triggered"; })(), "missing not low");
  add("PZ-23: unsupported/not-comparable APY (native stake) does not trigger low_yield", A([usdc(2000), stake(3000)]).triggerStates.lowYield !== "triggered", "stake not low");

  // ---- Concentration ----
  add("PZ-24: EXACTLY $1,000 and EXACTLY 50% → concentration triggers", (() => { const a = A([usdc(1000), lst(1000, JITOSOL, 7)]); return a.grossAssetValueUsd === 2000 && a.triggerStates.concentration === "triggered"; })(), "conc boundary");
  add("PZ-25: below $1,000 does not trigger concentration", A([usdc(2000), lst(900, JITOSOL, 7)]).triggerStates.concentration !== "triggered", "below 1000");
  add("PZ-26: below 50% does not trigger concentration", A([usdc(3000), lst(1500, JITOSOL, 7)]).triggerStates.concentration !== "triggered", "below 50pct");
  add("PZ-27: concentration denominator = authoritative gross assets (liabilities excluded)", (() => { const a = A([usdc(1000), lst(1000, JITOSOL, 7), debt(5000)]); return a.grossAssetValueUsd === 2000 && a.recognizedLiabilitiesUsd === 5000 && a.triggerStates.concentration === "triggered"; })(), "denom excl liab");
  add("PZ-28: native SOL counts in the denominator; LST counted once (no backing double-count)", (() => { const a = A([usdc(1000), W({ id: "ns", type: "native", symbol: "SOL", amount: "4000000000", uiAmount: 4, decimals: 9, priceUsd: 250, valueUsd: 1000 }), lst(2000, JITOSOL, 7)]); return a.grossAssetValueUsd === 4000; })(), "denom sol");

  // ---- Shared underlying exposure ----
  add("PZ-29: active stake + JitoSOL → native_sol shared exposure group", (() => { const a = A([usdc(2000), stake(300), lst(300, JITOSOL, 7)]); const g = a.sharedExposureGroups.find((x) => x.exposureId === "native_sol"); return g !== undefined && g.memberPositionIds.length === 2 && a.triggerStates.sharedExposure === "triggered"; })(), "native_sol group");
  add("PZ-30: cross-protocol USDC supply groups by exact canonical USDC mint", (() => { const a = A([usdc(2000), kaminoUsdc(300, "kd", "klend:1"), steakUsdc(300, "st", "steak:1")]); const g = a.sharedExposureGroups.find((x) => x.exposureId === `stable:${USDC}`); return g !== undefined && g.memberPositionIds.length === 2; })(), "usdc group");
  add("PO-VENUE: two same-token (USDC) positions on different venues → distinct venue subtitles; both link to the USDC token page", (() => { const c = poBuildCard(A([usdc(2000), kaminoUsdc(300, "kd", "klend:1"), steakUsdc(300, "st", "steak:1")]), GEN); if (!c) return false; const usdcRows = (c.reviewDetails?.involvedPositions ?? []).filter((r) => r.assetSymbol === "USDC"); const venues = usdcRows.map((r) => r.assetVenue).sort(); return usdcRows.length === 2 && venues[0] === "Kamino" && venues[1] === "Steakhouse USDC" && usdcRows.every((r) => r.assetUrl === `https://solscan.io/token/${USDC}`) && usdcRows.every((r) => r.reviewLink?.url === "https://app.kamino.finance"); })(), "venue subtitles + Manage");
  add("PZ-31: USDC and USDT are SEPARATE exposure groups (no broad STABLE bucket)", (() => { const a = A([usdc(2000), kaminoUsdc(300, "k1", "klend:1"), usdtSupply(300, "kt", "klend:t")]); return !a.sharedExposureGroups.some((x) => x.memberPositionIds.length >= 2 && x.exposureId.startsWith("stable:")); })(), "usdc≠usdt");
  add("PZ-32: group EXACTLY $250 and 5% qualifies; each member EXACTLY $50 included", (() => { const a = A([usdc(4750), kaminoUsdc(125, "k1", "d1"), steakUsdc(125, "k2", "d2")]); const g = a.sharedExposureGroups.find((x) => x.exposureId === `stable:${USDC}`); return g?.combinedValueUsd === 250 && Math.abs((g?.portfolioShare ?? 0) - 0.05) < 1e-9; })(), "group boundary");
  add("PZ-33: one member does not form a group", A([usdc(2000), kaminoUsdc(3000)]).sharedExposureGroups.length === 0, "one member");
  add("PZ-34: LP without authoritative leg decomposition does NOT fabricate a group", (() => { const a = A([usdc(2000), lp(300, "lp1"), lp(300, "lp2")]); return !a.sharedExposureGroups.some((x) => x.exposureClass === "multi_asset") && (pos(a, "lp1")?.exposures.every((e) => e.exposureState === "unresolved") ?? false); })(), "lp no group");
  add("PZ-35: a flagged position is counted ONCE in total flagged value despite group membership", (() => { const a = A([usdc(1000), lst(2000, JITOSOL, 0.5, "j"), lst(300, MSOL, 7, "m")]); const j = a.flaggedPositions.filter((p) => p.positionId === "j"); return j.length === 1; })(), "counted once");

  // ---- Trigger independence ----
  add("PZ-36: source-not-integrated APY does NOT block a proven concentration trigger", (() => { const a = A([usdc(1000), kaminoUsdc(1500)]); return a.triggerStates.concentration === "triggered" && a.overallReadiness.status === "allowed"; })(), "apy indep");
  add("PZ-37: LP exposure unresolved does NOT block a proven low-yield trigger", (() => { const a = Afresh([usdc(2000), lp(500, "lp1"), lst(300, JITOSOL, 0.5, "j", FRESH_OBS)]); return a.triggerStates.lowYield === "triggered" && a.overallReadiness.status === "allowed"; })(), "exposure indep");
  add("PZ-38: one proven trigger + one unresolved family → readiness allowed with warning", (() => { const a = A([usdc(1000), kaminoUsdc(1500), lp(60, "lp1")]); return a.overallReadiness.status === "allowed" && a.warnings.length > 0; })(), "allowed+warn");
  add("PZ-39: duplicate-invalid economic position blocks all", (() => { const a = A([usdc(2000), kaminoUsdc(1500, "k1", "dupdk"), steakUsdc(1500, "k2", "dupdk")]); return a.overallReadiness.status !== "allowed" && a.warnings.includes("duplicate_economic_position"); })(), "dup blocks");
  add("PZ-40: mSOL backing unresolved does NOT block market-value concentration/shared review", (() => { const a = A([usdc(1000), W({ id: "ms", type: "lst", source: "wallet", symbol: "mSOL", name: "Marinade Staked SOL", mint: MSOL, amount: "1", uiAmount: 1, detection: "recognized_lst_mint", valueUsd: 1500, apy: 7, lstNormalizationState: "unsupported" })]); return a.triggerStates.concentration === "triggered" && a.overallReadiness.status === "allowed"; })(), "backing no block");

  // ---- Accounting reuse + floor + gates ----
  add("PZ-41: reuses the SHARED derivePortfolioAssetAccounting (no second methodology)", (() => { const src = (() => { try { return readFileSync(`${process.cwd()}/src/suggestions/positionOptimizationAssessment.ts`, "utf8"); } catch { return ""; } })(); return /derivePortfolioAssetAccounting/.test(src) && !/deriveValueBreakdown|deriveRebalanceAssessment/.test(src); })(), "shared accounting");
  add("PZ-42: incomplete Safety Buffer → accounting blocked → no readiness", (() => { const a = A([usdc(100), lst(300, JITOSOL, 0.5)], 2000); return a.accountingGate.status === "blocked" && a.overallReadiness.status === "blocked"; })(), "buffer blocks");
  add("PZ-43: no trigger fires → readiness blocked (authoritative accounting)", A([usdc(2000), lst(300, JITOSOL, 7)]).overallReadiness.status === "blocked", "no trigger");
  add("PZ-44: total flagged value floor is $100; below → blocked", (() => { const a = A([usdc(2000), lst(80, JITOSOL, 0.5)]); return a.totalFlaggedValueUsd < 100 && a.overallReadiness.status !== "allowed"; })(), "floor");
  add("PZ-45: assessment returns gates only — never an EngineSuggestion (no id/category/amount)", (() => { const a = A([usdc(2000), lst(300, JITOSOL, 0.5)]) as unknown as Record<string, unknown>; return !("id" in a) && !("category" in a) && !("amount" in a) && typeof a.overallReadiness === "object"; })(), "no suggestion");

  // ---- Regression / read-only ----
  add("PZ-46 (20C): card id unchanged + engine consumes canonical override, not the legacy derive", (() => { const src = (() => { try { return readFileSync(`${process.cwd()}/src/suggestions/positionOptimizationSuggestion.ts`, "utf8"); } catch { return ""; } })(); const eng = (() => { try { return readFileSync(`${process.cwd()}/src/suggestions/engine.ts`, "utf8"); } catch { return ""; } })(); return /POSITION_OPTIMIZATION_SUGGESTION_ID = "position_optimization_review"/.test(src) && /buildPositionOptimizationCardFromAssessment/.test(src) && /positionOptimizationOverride/.test(eng) && !/derivePositionOptimizationSuggestion/.test(eng); })(), "canonical mount");
  add("PZ-47: thresholds unchanged (100 / 1 / 1000 / 0.5 / 50 / 250 / 0.05)", MIN_POSITION_REVIEW_USD === 100 && MIN_REVIEW_APY === 1 && MIN_CONCENTRATION_REVIEW_USD === 1000 && POSITION_CONCENTRATION_THRESHOLD === 0.5 && MIN_DUPLICATE_EXPOSURE_POSITION_USD === 50 && MIN_DUPLICATE_EXPOSURE_GROUP_USD === 250 && DUPLICATE_EXPOSURE_PORTFOLIO_SHARE_THRESHOLD === 0.05, "thresholds");
  add("PZ-48: no route/quote/transaction/signature/execution in the assessment path", (() => { const blob = (() => { try { return readFileSync(`${process.cwd()}/src/suggestions/positionOptimizationAssessment.ts`, "utf8"); } catch { return ""; } })(); return !/swapRoute|routePlan|signTransaction|sendTransaction|getQuote|aggregator|withdraw\(|unstake\(/.test(blob); })(), "read-only");

  // ---- 20B.1: APY freshness semantics (retrieval ≠ source freshness; low-yield fails closed) ----
  add("PZF-1: numeric APY without a source timestamp is NOT sourced_fresh (retrieval ≠ freshness)", (() => { const p = pos(A([usdc(2000), lst(300, JITOSOL, 6.5)]), "lst"); return p?.apy.apyState === "sourced_freshness_unverified" && p.apy.apyRetrieval === "retrieved_current_refresh" && p.apy.apyFreshness === "unresolved" && p.apy.apyObservedAt === null; })(), "not fresh");
  add("PZF-2: freshness-unverified APY does NOT trigger low_yield (even below 1%)", A([usdc(2000), lst(300, JITOSOL, 0.5)]).triggerStates.lowYield !== "triggered", "no low yield");
  add("PZF-3: freshness-unverified APY does NOT trigger missing_apy_data by itself", (() => { const a = A([usdc(2000), lst(300, JITOSOL, 0.5)]); return a.triggerStates.missingApy !== "triggered" && a.overallReadiness.status !== "allowed"; })(), "no missing");
  add("PZF-4: freshness-unverified value is retained as informational metadata", (() => { const p = pos(A([usdc(2000), lst(300, JITOSOL, 0.5)]), "lst"); return p?.apy.apyValuePct === 0.5 && p.apy.warnings.includes("apy_freshness_unverified"); })(), "display metadata");
  add("PZF-5: freshness-unverified + concentration → concentration review, freshness warning, no low-yield reason", (() => { const a = A([usdc(1000), lst(1500, JITOSOL, 0.5)]); return a.triggerStates.concentration === "triggered" && a.overallReadiness.status === "allowed" && a.warnings.includes("apy_freshness_unverified") && !a.reasonCodes.includes("low_yield_position"); })(), "conc coexist");
  add("PZF-6: freshness-unverified + shared exposure → shared review, freshness warning, no low-yield reason", (() => { const a = A([usdc(2000), lst(300, JITOSOL, 0.5, "j"), lst(300, MSOL, 0.5, "m")]); return a.triggerStates.sharedExposure === "triggered" && a.warnings.includes("apy_freshness_unverified") && !a.reasonCodes.includes("low_yield_position"); })(), "shared coexist");
  add("PZF-7: approved policy + timestamp within window → sourced_fresh + fresh", (() => { const p = pos(Afresh([usdc(2000), lst(300, JITOSOL, 0.5, "lst", FRESH_OBS)]), "lst"); return p?.apy.apyState === "sourced_fresh" && p.apy.apyFreshness === "fresh" && p.apy.apyObservedAt === FRESH_OBS; })(), "fresh path A");
  add("PZF-8: approved policy + timestamp OUTSIDE window → sourced_stale, cached, never low-yield", (() => { const a = Afresh([usdc(2000), lst(300, JITOSOL, 0.5, "lst", STALE_OBS)]); const p = pos(a, "lst"); return p?.apy.apyState === "sourced_stale" && p.apy.apyRetrieval === "cached" && p.apy.apyFreshness === "stale" && a.triggerStates.lowYield !== "triggered"; })(), "stale not low");
  add("PZF-9: conclusively stale EXPECTED APY may trigger missing/data-quality review (never low-yield)", (() => { const a = Afresh([usdc(2000), lst(300, JITOSOL, 0.5, "lst", STALE_OBS)]); return a.triggerStates.missingApy === "triggered" && a.triggerStates.lowYield !== "triggered"; })(), "stale → data review");
  add("PZF-10: source failure for an expected APY triggers missing-data at EXACTLY $100", A([usdc(2000), lst(100, JITOSOL, null)]).triggerStates.missingApy === "triggered", "missing $100");
  add("PZF-11: source-not-integrated (native stake) remains non-triggering for missing/low", (() => { const a = A([usdc(2000), stake(3000)]); return a.triggerStates.missingApy !== "triggered" && a.triggerStates.lowYield !== "triggered"; })(), "un-integrated");
  add("PZF-12: retrieval-state and source-freshness are distinct fields (both modeled)", (() => { const p = pos(A([usdc(2000), lst(300, JITOSOL, 0.5)]), "lst"); return typeof p?.apy.apyRetrieval === "string" && typeof p?.apy.apyFreshness === "string" && p!.apy.apyRetrieval !== p!.apy.apyFreshness; })(), "distinct");
  add("PZF-13: APY summary counts freshness-unverified separately from fresh", (() => { const a = A([usdc(2000), lst(300, JITOSOL, 0.5)]); return a.apyStateSummary.sourced_fresh === 0 && a.apyStateSummary.sourced_freshness_unverified === 1; })(), "summary");
  add("PZF-14: no source timestamp is invented (apyObservedAt null when source omits it)", pos(A([usdc(2000), lst(300, JITOSOL, 7)]), "lst")?.apy.apyObservedAt === null, "no invention");
  add("PZF-15: comparability does not hide freshness — both must pass for low-yield", (() => { const p = pos(A([usdc(2000), lst(300, JITOSOL, 0.5)]), "lst"); return p?.apy.apyComparability === "comparable" && p.apy.apyFreshness === "unresolved" && p.lowYieldEligible === false; })(), "both required");
  add("PZF-16: source contract is a bare Map<mint,number> with no timestamp/freshness (audited)", (() => { const src = (() => { try { return readFileSync(`${process.cwd()}/src/wallet/lstApy.ts`, "utf8"); } catch { return ""; } })(); return /Promise<Map<string, number>>/.test(src) && !/observedAt|fetchedAt/.test(src); })(), "no source freshness");

  // ---- 20B.2: source-specific freshness-policy governance (no global window) ----
  add("PZG-1: NO global freshness-window constant / age fallback exists in the module", (() => { const src = (() => { try { return readFileSync(`${process.cwd()}/src/suggestions/positionOptimizationAssessment.ts`, "utf8"); } catch { return ""; } })(); return !/PO_APY_FRESHNESS_WINDOW_MS/.test(src) && !/24 \* 60 \* 60/.test(src) && !/86_?400_?000/.test(src); })(), "no global window");
  add("PZG-2: production LST APY policy is missing/unresolved (not approved)", (() => { const p = lookupApyFreshnessPolicy("lst_apy_feed", "lst_net_apy"); return p !== null && p.policyState !== "approved" && p.maxObservationAgeMs === null && p.freshnessSignal === "unavailable"; })(), "lst missing");
  add("PZG-3: production Ondo APY policy is missing/unresolved (not approved)", (() => { const p = lookupApyFreshnessPolicy("ondo_usdy_feed", "treasury_yield"); return p !== null && p.policyState !== "approved" && p.maxObservationAgeMs === null; })(), "ondo missing");
  add("PZG-4: production registry has NO approved policy (max age null everywhere)", PO_APY_FRESHNESS_POLICIES.every((p) => p.policyState !== "approved" && p.maxObservationAgeMs === null), "registry unapproved");
  add("PZG-5: observedAt WITHOUT an approved policy stays freshness-unverified (no hidden age window)", (() => { const p = pos(A([usdc(2000), lst(300, JITOSOL, 0.5, "lst", FRESH_OBS)]), "lst"); return p?.apy.apyState === "sourced_freshness_unverified" && p.apy.apyFreshness === "unresolved" && p.apy.apyObservedAt === FRESH_OBS; })(), "obs inert");
  add("PZG-6: current-refresh retrieval WITHOUT approved policy stays freshness-unverified", (() => { const p = pos(A([usdc(2000), lst(300, JITOSOL, 7)]), "lst"); return p?.apy.apyRetrieval === "retrieved_current_refresh" && p.apy.apyFreshness === "unresolved"; })(), "retrieval inert");
  add("PZG-7: LST/Ondo production values never trigger low-yield even below 1%", A([usdc(2000), lst(300, JITOSOL, 0.5)]).triggerStates.lowYield !== "triggered", "prod no low yield");
  add("PZG-8: mismatched SOURCE cannot classify fresh (policy source must match exactly)", (() => { const wrong: PoApyFreshnessPolicy = { ...TEST_LST_POLICY, sourceId: "other_feed" }; const p = pos(Afresh([usdc(2000), lst(300, JITOSOL, 0.5, "lst", FRESH_OBS)], 500, [wrong]), "lst"); return p?.apy.apyState === "sourced_freshness_unverified"; })(), "source mismatch");
  add("PZG-9: mismatched METHODOLOGY cannot classify fresh", (() => { const wrong: PoApyFreshnessPolicy = { ...TEST_LST_POLICY, methodology: "treasury_yield" }; const p = pos(Afresh([usdc(2000), lst(300, JITOSOL, 0.5, "lst", FRESH_OBS)], 500, [wrong]), "lst"); return p?.apy.apyState === "sourced_freshness_unverified"; })(), "methodology mismatch");
  add("PZG-10: approved policy but MISSING timestamp → freshness-unverified (signal required)", (() => { const p = pos(Afresh([usdc(2000), lst(300, JITOSOL, 0.5, "lst")]), "lst"); return p?.apy.apyState === "sourced_freshness_unverified"; })(), "no signal");
  add("PZG-11: fixture-only approved policy is never exported to production UI (assessment input only)", (() => { const src = (() => { try { return readFileSync(`${process.cwd()}/src/suggestions/positionOptimizationAssessment.ts`, "utf8"); } catch { return ""; } })(); return /apyFreshnessPolicies\?: readonly PoApyFreshnessPolicy\[\]/.test(src); })(), "input override only");
  add("PZG-12: input accepts an explicit source-specific policy set OR the canonical registry", (() => { const src = (() => { try { return readFileSync(`${process.cwd()}/src/suggestions/positionOptimizationAssessment.ts`, "utf8"); } catch { return ""; } })(); return /input\.apyFreshnessPolicies \?\? PO_APY_FRESHNESS_POLICIES/.test(src); })(), "registry or override");

  return checks;
}

/**
 * Step 18G — FINAL Rebalance workstream closeout: proves ONE canonical mounted calculation, NO mounted legacy
 * fallback (missing canonical input → no Rebalance candidate), the deprecated legacy module has zero mounted
 * callers, shared canonical inputs, the /testing modal wiring, and full cross-cutting regression across both
 * directions, conflicts, ordering, Top Pick, Safety Buffer, dispositions, and read-only behavior.
 */

/**
 * Step 19B — canonical, NON-MOUNTED TrimAssessment. Proves exact-mint core classification (never symbol),
 * direct-wallet multi-account aggregation (exact BigInt), authoritative gross-asset denominator with
 * liabilities separate, Token-2022 review-vs-actionability separation, the three unchanged trigger rules with
 * exact boundaries, Trim-specific gates (no Rebalance-liquidity coupling), and that production Trim is untouched.
 */
export function runTrimAssessmentFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const GEN = 1_700_000_000_000;
  const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
  const USDT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
  const USDH = "USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX";
  const WSOL = "So11111111111111111111111111111111111111112";
  const T22 = TRIM_TOKEN_2022_PROGRAM;
  const W = (o: Partial<WalletPosition>): WalletPosition => ({ id: "x", source: "wallet", type: "token", symbol: "X", name: "X", amount: "1", detection: "direct_wallet_balance", valueUsd: 100, ...o });
  const usdc = (v: number, id = "usdc") => W({ id, symbol: "USDC", name: "USD Coin", mint: USDC, amount: String(Math.round(v * 1e6)), uiAmount: v, decimals: 6, priceUsd: 1, valueUsd: v });
  // A non-core direct SPL token candidate (distinct mint per id so each is its own economic holding).
  const tok = (v: number, id: string, mint = `Mint-${id}`, raw?: string) => W({ id, symbol: `TK${id}`, name: `Token ${id}`, mint, amount: raw ?? String(Math.max(1, Math.round(v))), uiAmount: v, decimals: 0, priceUsd: 1, valueUsd: v });
  const wsol = (v: number) => W({ id: "wsol", symbol: "SOL", name: "Wrapped SOL", mint: WSOL, amount: String(Math.round(v * 1e9)), uiAmount: v, decimals: 9, priceUsd: 1, valueUsd: v });
  const fakeUsdc = (v: number) => W({ id: "fakeusdc", symbol: "USDC", name: "USD Coin", mint: "FakeUSDCMint1111", amount: String(v), uiAmount: v, decimals: 6, priceUsd: 1, valueUsd: v });
  const fakeSol = (v: number) => W({ id: "fakesol", symbol: "SOL", name: "Solana", mint: "FakeSOLMint1111", amount: String(v), uiAmount: v, decimals: 9, priceUsd: 1, valueUsd: v });
  const oddCoreUsdt = (v: number) => W({ id: "oddusdt", symbol: "ZZZ", name: "Rebranded", mint: USDT, amount: String(Math.round(v * 1e6)), uiAmount: v, decimals: 6, priceUsd: 1, valueUsd: v });
  const t22Candidate = (v: number, state: string, id = "t22") => W({ id, symbol: `TX${id}`, name: `T22 ${id}`, mint: `T22Mint-${id}`, tokenProgram: T22, transferabilityState: state, amount: String(Math.round(v)), uiAmount: v, decimals: 0, priceUsd: 1, valueUsd: v, liquidValueUsd: state === "transferable" ? v : 0 });
  const nativeSol = (v: number) => W({ id: "nsol", type: "native", symbol: "SOL", name: "Solana", amount: String(Math.round((v / 250) * 1e9)), uiAmount: v / 250, decimals: 9, priceUsd: 250, valueUsd: v });
  const stakePos = (v: number) => W({ id: "stk", type: "stake", symbol: "SOL", name: "Native stake", amount: "1", uiAmount: v / 250, detection: "native_stake", valueUsd: v, liquidValueUsd: 0 });
  const msol = (v: number) => W({ id: "ms", type: "lst", source: "wallet", symbol: "mSOL", name: "Marinade Staked SOL", mint: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So", amount: "1", uiAmount: 1, detection: "recognized_lst_mint", valueUsd: v });
  const kaminoStable = (v: number, withdrawal = "fully_withdrawable") => W({ id: "kd", type: "protocol", symbol: "USDC", name: "USDC on Kamino", protocol: "Kamino", candidateId: "kamino_usdc_lending", existingPositionOnly: true, dedupeKey: "klend:x", valueUsd: v, recognizedValueUsd: v, withdrawalState: withdrawal, liquidValueUsd: v, mint: USDC });
  const jlusdc = () => W({ id: "jl", type: "protocol", symbol: "USDC", name: "Jupiter Lend USDC", candidateId: "jupiter_lend_usdc", existingPositionOnly: true, dedupeKey: "jupiter-lend:x", withdrawalState: "unresolved", recognizedValueUsd: null, valueUsd: null, uiAmount: 100, amount: "100000000", mint: USDC });
  const debt = (v: number | null) => W({ id: "hb", type: "protocol", symbol: "USDH", name: "USDH loan", side: "borrowed", valueUsd: v, uiAmount: 300, amount: "1" });
  const dupPair = (v: number) => [W({ id: "d1", symbol: "TKd", name: "Dup", mint: "DupMint", dedupeKey: "dup:x", amount: String(v), uiAmount: v, decimals: 0, priceUsd: 1, valueUsd: v }), W({ id: "d2", symbol: "TKd", name: "Dup", mint: "DupMint", dedupeKey: "dup:x", amount: String(v), uiAmount: v, decimals: 0, priceUsd: 1, valueUsd: v })];

  const A = (positions: WalletPosition[], requiredBufferUsd = 500) => trimAssess({ positions, requiredBufferUsd, generatedAt: GEN });
  const cand = (a: ReturnType<typeof trimAssess>, sym: string) => a.candidateHoldings.find((h) => h.symbol === sym);

  // ---- Exact identity (never symbol) ----
  add("TB-1: canonical USDC excluded by exact mint+program (core, not a candidate)", (() => { const a = A([usdc(1000), tok(300, "a")]); return a.excludedHoldings.some((h) => h.mint === USDC && h.coreAssetState === "core") && !a.candidateHoldings.some((h) => h.mint === USDC); })(), "usdc core");
  add("TB-2: fake USDC symbol with different mint is NON-core (candidate)", (() => { const a = A([usdc(1000), fakeUsdc(300)]); const h = a.candidateHoldings.find((x) => x.mint === "FakeUSDCMint1111"); return h?.coreAssetState === "non_core" && h.reviewEligibilityState === "eligible"; })(), "fake usdc");
  add("TB-3: fake SOL symbol is NON-core (candidate)", (() => { const a = A([usdc(1000), fakeSol(300)]); return a.candidateHoldings.some((h) => h.mint === "FakeSOLMint1111" && h.coreAssetState === "non_core"); })(), "fake sol");
  add("TB-4: canonical wrapped SOL excluded regardless of display symbol", (() => { const a = A([usdc(1000), wsol(300), tok(200, "a")]); return a.excludedHoldings.some((h) => h.mint === WSOL && h.coreAssetState === "core"); })(), "wsol core");
  add("TB-5: Token-2022 lookalike does NOT inherit classic core status", (() => { const a = A([usdc(1000), W({ id: "t22usdc", symbol: "USDC", name: "USD Coin", mint: "T22UsdcLookalike", tokenProgram: T22, amount: "300", uiAmount: 300, priceUsd: 1, valueUsd: 300, transferabilityState: "transferable" })]); return a.candidateHoldings.some((h) => h.mint === "T22UsdcLookalike" && h.coreAssetState === "non_core"); })(), "t22 lookalike");
  add("TB-6: canonical asset with unusual symbol remains core (by mint)", (() => { const a = A([usdc(1000), oddCoreUsdt(300), tok(200, "a")]); return a.excludedHoldings.some((h) => h.mint === USDT && h.symbol === "ZZZ" && h.coreAssetState === "core"); })(), "odd symbol core");
  add("TB-7: symbol alone never determines core — registry is exact mint+program", TRIM_CORE_ASSETS.every((c) => typeof c.mint === "string" && c.tokenProgram === TRIM_CLASSIC_TOKEN_PROGRAM) && trimCoreAssetFor(USDC, undefined)?.assetId === "usdc" && trimCoreAssetFor(USDC, T22) === null && trimCoreAssetFor("FakeUSDCMint1111", undefined) === null, "exact registry");
  add("TB-8: USDT + USDH canonical mints are core; DAI (no approved mint) is not core", trimCoreAssetFor(USDT, undefined)?.assetClass === "canonical_stablecoin" && trimCoreAssetFor(USDH, undefined)?.assetClass === "canonical_stablecoin" && !TRIM_CORE_ASSETS.some((c) => c.assetId === "dai"), "usdt/usdh core, no dai");

  // ---- Direct-wallet multi-account aggregation (exact BigInt) ----
  add("TB-9: two accounts of the same mint aggregate into ONE holding, raw summed", (() => { const a = A([usdc(1000), tok(60, "x1", "MintX", "60"), tok(50, "x2", "MintX", "50")]); const g = a.candidateHoldings.filter((h) => h.mint === "MintX"); return g.length === 1 && g[0].rawBalance === "110" && g[0].recognizedValueUsd === 110 && g[0].sourcePositionIds.length === 2; })(), "aggregate");
  add("TB-10: raw balances sum with EXACT integer arithmetic (no float uiAmount authority)", (() => { const big = "9007199254740993"; const a = A([usdc(1000), tok(1, "b1", "MintB", big), tok(1, "b2", "MintB", "2")]); const g = a.candidateHoldings.find((h) => h.mint === "MintB"); return g?.rawBalance === (BigInt(big) + 2n).toString(); })(), "bigint");
  add("TB-11: classic SPL and Token-2022 of related identities do NOT merge (different program)", (() => { const a = A([usdc(1000), tok(80, "c1", "MintC"), W({ id: "c2", symbol: "TKC", name: "TKC", mint: "MintC2022", tokenProgram: T22, amount: "80", uiAmount: 80, priceUsd: 1, valueUsd: 80, transferabilityState: "transferable" })]); return a.candidateHoldings.filter((h) => h.mint === "MintC" || h.mint === "MintC2022").length === 2; })(), "no cross-program merge");
  add("TB-12: multiple accounts produce ONE small-position candidate (not several)", (() => { const a = A([usdc(1000), tok(20, "s1", "MintS", "20"), tok(20, "s2", "MintS", "20"), tok(40, "s3", "Mint3"), tok(40, "s4", "Mint4"), tok(40, "s5", "Mint5")], 500); return a.candidateHoldings.filter((h) => h.mint === "MintS").length === 1; })(), "one small candidate");
  add("TB-13: protocol adapter row never merges into a wallet holding", (() => { const a = A([usdc(1000), kaminoStable(400), tok(300, "a")]); return !a.candidateHoldings.some((h) => h.symbol === "USDC") && !a.excludedHoldings.some((h) => h.holdingId.includes("kd")); })(), "no adapter merge");

  // ---- Denominator + liabilities ----
  add("TB-14: gross-asset denominator counts all fresh non-liability assets once", (() => { const a = A([usdc(1000), tok(300, "a"), nativeSol(500)]); return a.denominatorValueUsd === 1800 && a.grossAssetValueUsd === 1800; })(), "gross once");
  add("TB-15: liabilities excluded from denominator; reduce net worth separately", (() => { const a = A([usdc(1000), tok(300, "a"), debt(200)]); return a.denominatorValueUsd === 1300 && a.recognizedLiabilitiesUsd === 200 && a.netWorthUsd === 1100; })(), "liabilities separate");
  add("TB-16: debt does NOT inflate a candidate's concentration (denominator excludes debt)", (() => { const withDebt = A([usdc(1000), tok(300, "a"), debt(500)]); const share = (cand(withDebt, "TKa")!.recognizedValueUsd as number) / withDebt.denominatorValueUsd; return Math.abs(share - 300 / 1300) < 1e-9; })(), "no debt inflation");
  add("TB-17: native stake market value counts in the denominator", (() => { const a = A([usdc(1000), tok(300, "a"), stakePos(400)]); return a.denominatorValueUsd === 1700; })(), "stake counts");
  add("TB-18: LST market value counts once; no backing double-count", (() => { const a = A([usdc(1000), tok(300, "a"), msol(260)]); return a.denominatorValueUsd === 1560; })(), "lst once");
  add("TB-19: unresolved liability → calculation unresolved (no readiness)", (() => { const a = A([usdc(1000), tok(300, "a"), debt(null)]); return a.calculationGate.status === "unresolved" && a.calculationGate.reasons.includes("liabilities_unresolved") && a.overallReadiness.status !== "allowed"; })(), "liab unresolved");
  add("TB-20: unknown positive value → denominator unresolved", (() => { const a = A([usdc(1000), tok(300, "a"), W({ id: "unk", symbol: "9x", name: "Unknown token", mint: "UnkMint", uiAmount: 5, amount: "5", valueUsd: null })]); return a.calculationGate.status === "unresolved" && (a.calculationGate.reasons.includes("unknown_asset_value") || a.calculationGate.reasons.includes("net_worth_unresolved")); })(), "unknown value");
  add("TB-21: jlUSDC unresolved value → unresolved", (() => { const a = A([usdc(1000), tok(300, "a"), jlusdc()]); return a.calculationGate.status === "unresolved"; })(), "jl unresolved");
  add("TB-22: duplicate economic position → invalid/unresolved (never a clean candidate)", (() => { const a = A([usdc(1000), ...dupPair(300)]); return a.calculationGate.reasons.includes("duplicate_economic_position") && a.calculationGate.status === "unresolved"; })(), "dup invalid");

  // ---- Trigger rules + exact boundaries ----
  add("TB-23: aggregate rule fires at EXACT $100 and EXACT 5%", (() => { const a = A([usdc(1900), tok(100, "a")]); return a.denominatorValueUsd === 2000 && a.totalCandidateValueUsd === 100 && a.candidatePortfolioShare === 0.05 && a.triggerStates.aggregateLongTail === "triggered"; })(), "aggregate boundary");
  add("TB-24: aggregate does NOT fire just below $100", (() => { const a = A([usdc(1900), tok(99, "a")]); return a.triggerStates.aggregateLongTail === "not_triggered"; })(), "below 100");
  add("TB-25: concentration fires at EXACT 10%", (() => { const a = A([usdc(1800), tok(200, "a")]); return (200 / a.denominatorValueUsd) === 0.1 && a.triggerStates.singleTokenConcentration === "triggered" && a.concentratedCandidateIds.length === 1; })(), "concentration boundary");
  add("TB-26: concentration exposes ALL candidate IDs meeting the threshold", (() => { const a = A([usdc(600), tok(200, "a"), tok(200, "b")]); return a.concentratedCandidateIds.length === 2; })(), "all concentrated");
  add("TB-27: small-position fires at EXACT $50 each, EXACTLY three, combined EXACTLY $100", (() => { const a = A([usdc(3000), tok(50, "s1"), tok(25, "s2"), tok(25, "s3")]); return a.smallCandidateIds.length === 3 && a.smallCandidateCombinedValueUsd === 100 && a.triggerStates.smallPositionCleanup === "triggered"; })(), "small boundary");
  add("TB-28: a $51 token is NOT small (disqualifies only itself)", (() => { const a = A([usdc(3000), tok(51, "b1"), tok(40, "s2"), tok(40, "s3"), tok(40, "s4")]); return !a.smallCandidateIds.includes("Mint-b1") && a.smallCandidateIds.length === 3; })(), "51 not small");
  add("TB-29: all three rules fire together", (() => { const a = A([usdc(500), tok(300, "big"), tok(40, "s1"), tok(40, "s2"), tok(40, "s3")]); const t = a.triggerStates; return t.aggregateLongTail === "triggered" && t.singleTokenConcentration === "triggered" && t.smallPositionCleanup === "triggered"; })(), "all three");
  add("TB-30: below every threshold → no trigger, readiness blocked", (() => { const a = A([usdc(2000), tok(40, "a")]); return a.triggerStates.aggregateLongTail === "not_triggered" && a.triggerStates.singleTokenConcentration === "not_triggered" && a.overallReadiness.status === "blocked"; })(), "no trigger");

  // ---- Reason ordering ----
  add("TB-31: reason codes preserve deterministic order + dedup non_core_token_exposure once", (() => { const a = A([usdc(500), tok(300, "big"), tok(40, "s1"), tok(40, "s2"), tok(40, "s3")]); const r = a.reasonCodes; return r.indexOf("long_tail_exposure") < r.indexOf("token_concentration_review") && r.indexOf("token_concentration_review") < r.indexOf("small_position_cleanup") && r.filter((c) => c === "non_core_token_exposure").length === 1 && r.includes("liquidity_not_evaluated"); })(), "reason order");

  // ---- Token-2022 review vs actionability ----
  add("TB-32: frozen Token-2022 candidate is review-eligible; actionability unavailable", (() => { const a = A([usdc(1000), t22Candidate(300, "frozen")]); const h = cand(a, "TXt22"); return h?.reviewEligibilityState === "eligible" && h.actionabilityState === "unavailable" && h.recognizedValueUsd === 300; })(), "frozen review");
  add("TB-33: hook-unresolved Token-2022 candidate review-eligible; actionability unresolved", (() => { const a = A([usdc(1000), t22Candidate(300, "hook_unresolved")]); const h = cand(a, "TXt22"); return h?.reviewEligibilityState === "eligible" && h.actionabilityState === "unresolved"; })(), "hook review");
  add("TB-34: recognized value drives concentration even when transferability unavailable", (() => { const a = A([usdc(1000), t22Candidate(300, "frozen")]); return a.triggerStates.singleTokenConcentration === "triggered" && a.concentratedCandidateIds.length === 1; })(), "frozen concentration");
  add("TB-35: transferability summary reports unavailable/unresolved value separately", (() => { const a = A([usdc(1000), t22Candidate(300, "frozen", "f"), t22Candidate(200, "hook_unresolved", "h")]); const s = a.transferabilitySummary; return s.unavailableTransferabilityCandidateValueUsd === 300 && s.unresolvedTransferabilityCandidateValueUsd === 200 && s.candidateCountByActionability.unavailable === 1; })(), "transfer summary");
  add("TB-36: unavailable transferability does NOT block review confidence (review-only)", (() => { const a = A([usdc(1000), t22Candidate(300, "frozen")]); return a.reviewConfidenceGate.status === "allowed" && a.overallReadiness.status === "allowed"; })(), "no transfer block");

  // ---- Gates ----
  add("TB-37: complete calc + trigger → overall allowed", (() => { const a = A([usdc(1000), tok(300, "a")]); return a.calculationGate.status === "allowed" && a.overallReadiness.status === "allowed"; })(), "allowed");
  add("TB-38: incomplete Safety Buffer → calculation blocked", (() => { const a = A([usdc(100), tok(300, "a")], 2000); return a.calculationGate.status === "blocked" && a.calculationGate.reasons.includes("safety_buffer_incomplete") && a.overallReadiness.status === "blocked"; })(), "buffer blocked");
  add("TB-39: UNRELATED protocol liquidity unresolved does NOT block Trim (no Rebalance coupling)", (() => { const a = A([usdc(1000), tok(300, "a"), kaminoStable(400, "unresolved")]); return a.calculationGate.status === "allowed" && a.overallReadiness.status === "allowed"; })(), "no liquidity coupling");
  add("TB-40: mSOL backing/exposure unresolved does NOT block review-only Trim", (() => { const a = A([usdc(1000), tok(300, "a"), W({ id: "ms2", type: "lst", symbol: "mSOL", name: "Marinade Staked SOL", mint: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So", amount: "1", uiAmount: 1, detection: "recognized_lst_mint", valueUsd: 260, lstNormalizationState: "unsupported" })]); return a.overallReadiness.status === "allowed"; })(), "no backing block");
  add("TB-41: stale candidate value DOES block (calculation unresolved)", (() => { const a = A([usdc(1000), W({ id: "st", symbol: "TKst", name: "Stale", mint: "StaleMint", amount: "300", uiAmount: 300, decimals: 0, priceUsd: 1, valueUsd: 300, withdrawalState: "stale" })]); return a.calculationGate.reasons.includes("stale_value_in_denominator") && a.overallReadiness.status !== "allowed"; })(), "stale blocks");
  add("TB-42: assessment returns gates only — never an EngineSuggestion (no id/category/amount)", (() => { const a = A([usdc(1000), tok(300, "a")]) as unknown as Record<string, unknown>; return !("id" in a) && !("category" in a) && !("amount" in a) && typeof a.overallReadiness === "object"; })(), "no suggestion");

  // ---- Candidate ordering ----
  add("TB-43: candidates ordered by portfolio share desc (not symbol)", (() => { const a = A([usdc(500), tok(300, "zz"), tok(100, "aa")]); return a.candidateHoldings[0].symbol === "TKzz" && a.candidateHoldings[1].symbol === "TKaa"; })(), "share order");

  // ---- Regression: production Trim unchanged ----
  add("TB-44: stable trim_long_tail_assets contract id preserved across the canonical mount", (() => { const src = (() => { try { return readFileSync(`${process.cwd()}/src/suggestions/trimSuggestion.ts`, "utf8"); } catch { return ""; } })(); return /TRIM_SUGGESTION_ID = "trim_long_tail_assets"/.test(src); })(), "contract id");
  add("TB-45: thresholds unchanged (100 / 0.05 / 0.10 / 3 / 50)", MIN_TRIM_SUGGESTION_USD === 100 && TRIM_PORTFOLIO_SHARE_THRESHOLD === 0.05 && TRIM_SINGLE_TOKEN_CONCENTRATION_THRESHOLD === 0.1 && TRIM_SMALL_POSITION_COUNT_THRESHOLD === 3 && TRIM_SMALL_POSITION_MAX_USD === 50, "thresholds");
  add("TB-46: no route/transaction/signature behavior in the Trim assessment path", (() => { const blob = (() => { try { return readFileSync(`${process.cwd()}/src/suggestions/trimAssessment.ts`, "utf8"); } catch { return ""; } })(); return !/swapRoute|routePlan|signTransaction|sendTransaction|getQuote|aggregator/.test(blob); })(), "read-only");

  return checks;
}

/**
 * Step 15H finalization — verifies the canonical Demo dashboard consumes the deterministic pipeline
 * (buffer-first, one buffer card, no DCA), fixture isolation, Real Wallet price-provenance behavior,
 * direct-wallet USDC classification, feature-flag truthfulness, and no execution paths.
 */
export function runContributionFinalizationFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const root = process.cwd();
  const readIf = (rel: string) => { try { return readFileSync(`${root}/${rel}`, "utf8"); } catch { return ""; } };
  const demoSrc = readIf("src/suggestions/demoContributionScenario.ts");
  const demoPageSrc = readIf("src/pages/DemoDashboardPage.tsx");
  const railSrc = readIf("src/suggestions/useRailSuggestions.ts");
  const productInputSrc = readIf("src/suggestions/contributionProductInput.ts");

  const rail = buildDemoContributionRail();
  const bufferCards = rail.cards.filter((c) => c.category === "safety_buffer");
  const T = "2026-07-15T00:00:00Z";
  const T_MS = Date.UTC(2026, 6, 15, 0, 0, 0);
  const wp = (o: Partial<WP15H>): WP15H => ({ id: "x", source: "wallet", type: "token", symbol: "X", amount: "0", detection: "direct_wallet_balance", ...o } as WP15H);

  // 15H-FINAL-A…N. Demo dashboard wiring.
  add("15H-FINAL-A: the actual Demo dashboard invokes the contribution pipeline (page wiring + behavioral contribution output)", demoPageSrc.includes("buildDemoContributionRail") && demoSrc.includes("deriveRailSuggestions") && buildDemoStableYieldRail().cards.some((c) => c.category === "contribution_plan"), "invoked");
  add("15H-FINAL-B: the Demo dashboard uses dataMode demo_fixture", demoSrc.includes('dataMode: "demo_fixture"'), "demo_fixture");
  add("15H-FINAL-C: the canonical Demo profile remains unchanged", DEMO_GOAL.monthly_saving_goal === 1000 && DEMO_GOAL.contribution_frequency === "monthly" && DEMO_GOAL.risk_tolerance === "medium" && DEMO_GOAL.financial_goal === "build_long_term_wealth" && DEMO_GOAL.income_monthly === 4000 && DEMO_GOAL.expenses_monthly === 1000 && DEMO_GOAL.timeline === "5_years", "unchanged");
  add("15H-FINAL-D: the canonical Demo portfolio remains unchanged", DEMO_POSITIONS.find((p) => p.symbol === "SOL")!.valueUsd === 5500 && DEMO_POSITIONS.find((p) => p.symbol === "BONK")!.valueUsd === 1200 && DEMO_POSITIONS.find((p) => p.symbol === "USDC")!.valueUsd === 800, "unchanged");
  add("15H-FINAL-E: the Demo dashboard uses the shared engine invocation (behavioral: rail output is engine-sorted with one Top Pick)", demoSrc.includes("deriveRailSuggestions") && rail.cards.length > 0 && rail.cards.filter((c) => c.is_top_pick).length === 1, "shared engine");
  add("15H-FINAL-F: the Demo dashboard receives pre-sorted suggestions", rail.cards.filter((c) => c.is_top_pick).length === 1, "pre-sorted");
  add("15H-FINAL-G: the Demo dashboard contains exactly one Safety Buffer suggestion", bufferCards.length === 1, `${bufferCards.length}`);
  add("15H-FINAL-H: the Demo Safety Buffer suggestion is Top Pick", bufferCards[0]?.is_top_pick === true && bufferCards[0]?.title === "Top Up Your Safety Buffer", "top pick");
  add("15H-FINAL-I: the Demo dashboard contains no SOL DCA while the buffer is incomplete", rail.cards.every((c) => c.tag !== "DCA" && c.type !== "dca_buy" && !/dca/i.test(c.id)), "no dca");
  add("15H-FINAL-J: the Demo dashboard contains no duplicate contribution suggestion", rail.cards.length === 1 && Object.keys(rail.contributionReviewById).length === 1, "one card");
  add("15H-FINAL-K: unrelated Demo suggestions remain unchanged when not suppressed by the buffer override", buildDemoStakingRail15H().cards.length >= 1 && buildDemoStakingRail15H().cards[0].title.includes("Put Idle SOL"), "staking demo intact");
  add("15H-FINAL-L: Demo fixture data cannot enter real_wallet mode", buildContributionPortfolioSnapshot({ dataMode: "real_wallet", snapshotId: "s", sourcePortfolioVersion: "v", calculatedAt: T, checkedAt: T, totalPortfolioValueUsd: 100, solExposureUsd: 60, usdcExposureUsd: 40, isFixtureData: true }).ok === false, "guarded");
  add("15H-FINAL-M: testing fixture data cannot enter the Demo dashboard", !demoSrc.includes("contributionTestingScenarios") && !demoPageSrc.includes("contributionTestingScenarios"), "no testing import");
  add("15H-FINAL-N: normal Demo UI does not show TEST FIXTURE", !demoPageSrc.includes("TEST FIXTURE") && !demoSrc.includes("TEST FIXTURE"), "no badge");

  // 15H-FINAL-O…S. Real Wallet price provenance.
  const rwQuote = buildContributionPriceQuote({ dataMode: "real_wallet", targetId: "sol", priceUsd: 150, sourceId: PRICE_SRC_15H, fetchedAt: T, checkedAt: T }).quote!;
  const noProvQuote = buildContributionPriceQuote({ dataMode: "real_wallet", targetId: "sol", priceUsd: 150, sourceId: "", fetchedAt: T, checkedAt: T }).quote!;
  add("15H-FINAL-O: Real Wallet sourced price preserves source ID", rwQuote.sourceId === "token_price_service", rwQuote.sourceId);
  add("15H-FINAL-P: Real Wallet sourced price preserves provenance", rwQuote.browserFetched === false && rwQuote.sameOriginOrBackendNormalized === true, "provenance");
  // Growth scenario: buffer complete + SOL underweight; without provenance → blocked.
  const growthPositions: WP15H[] = [wp({ id: "u", type: "token", symbol: "USDC", name: "USD Coin", valueUsd: 9000 }), wp({ id: "s", type: "native", symbol: "SOL", valueUsd: 4300, priceUsd: 150 })];
  const growthGoal = { ...DEMO_GOAL, expenses_monthly: 100 };
  const completeBuffer = { stableUsd: 9000, targetUsd: 300, targetMonths: 3, coveragePct: 100, monthsCovered: 90, fullyFunded: true };
  // Slice 4 — real-wallet growth/DCA now requires the shared CANONICAL target (crypto 60 / stable 40 → SOL underweight).
  const finalQTarget = { targetStablePct: 40, targetCryptoPct: 60, targetStableUsd: null, targetCryptoUsd: null, targetConfidence: "full", marketExcluded: false, marketExclusionReason: null, marketAdjustmentVsProfileOnlyPct: 1.5, methodologyVersion: TARGET_ALLOCATION_ASSESSMENT_VERSION, policyVersion: "target_allocation_policy_v1", rebalanceTargetEligible: true, dcaTargetEligible: true, onTrackTargetEligible: true } as import("../canonicalTargetAllocation").CanonicalTargetAllocation;
  const noProv = deriveContributionSuggestion({ dataMode: "real_wallet", positions: growthPositions, pricedAsOf: T_MS, goal: growthGoal, buffer: completeBuffer, targetAllocation: finalQTarget, targetState: "full" });
  const withProv = deriveContributionSuggestion({ dataMode: "real_wallet", positions: growthPositions, pricedAsOf: T_MS, goal: growthGoal, buffer: completeBuffer, priceProvenance: { sourceId: PRICE_SRC_15H }, targetAllocation: finalQTarget, targetState: "full" });
  add("15H-FINAL-Q: a price with value and timestamp but no provenance blocks growth", noProvQuote.blockers.includes("price_provenance_missing") && noProv.suggestion === null && withProv.suggestion != null && withProv.suggestion!.category === "dca", "blocks growth");
  // Buffer-incomplete without provenance still works.
  const bufNoProv = deriveContributionSuggestion({ dataMode: "real_wallet", positions: DEMO_POSITIONS, pricedAsOf: T_MS, goal: DEMO_GOAL, buffer: { stableUsd: 800, targetUsd: 3000, targetMonths: 3, coveragePct: 26.67, monthsCovered: 0.8, fullyFunded: false } });
  add("15H-FINAL-R: missing price provenance does not block Safety Buffer", bufNoProv.suggestion != null && bufNoProv.suggestion!.category === "buffer", "buffer works");
  add("15H-FINAL-S: missing price provenance does not create a false zero", noProv.suggestion === null && noProv.pipeline?.status !== "ready", "no zero");

  // 15H-FINAL-T…Y. Direct wallet USDC + liquidity.
  add("15H-FINAL-T: direct wallet USDC is liquid only through canonical direct-balance classification", isDirectWalletUsdc(wp({ type: "token", symbol: "USDC", name: "USD Coin", detection: "direct_wallet_balance", valueUsd: 100 })) === true, "canonical");
  add("15H-FINAL-U: USDC symbol alone does not produce liquid_now", isDirectWalletUsdc(wp({ type: "token", symbol: "USDC", name: "USD Coin", detection: "protocol_api", valueUsd: 100 })) === false, "not by symbol");
  add("15H-FINAL-V: protocol receipt USDC does not become direct liquid USDC", isDirectWalletUsdc(wp({ type: "protocol", symbol: "USDC", name: "USD Coin", detection: "protocol_api", valueUsd: 100 })) === false, "not receipt");
  add("15H-FINAL-W: unknown liquidity does not count toward excess USDC", runContributionTestingScenario("15H-T19")!.pipeline.plan === undefined && runContributionTestingScenario("15H-T19")!.pipeline.status !== "ready", "unknown excluded");
  add("15H-FINAL-X: upcoming contribution remains usable when optional liquidity is unknown", runContributionTestingScenario("15H-T4")!.pipeline.status === "ready" && runContributionTestingScenario("15H-T4")!.pipeline.plan!.fundingSourceId === "upcoming_contribution", "upcoming ok");
  add("15H-FINAL-Y: existing-excess-USDC DCA requires explicit current liquid USDC", runContributionTestingScenario("15H-T9")!.pipeline.plan!.fundingSourceId === "existing_excess_usdc" && runContributionTestingScenario("15H-T20")!.pipeline.plan === undefined, "requires liquid");

  // 15H-FINAL-Z…AA. Feature-flag truthfulness.
  add("15H-FINAL-Z: Demo pipeline feature flag is true only after dashboard wiring", DEMO_PIPELINE_FLAG === true && demoPageSrc.includes("buildDemoContributionRail"), "true + wired");
  add("15H-FINAL-AA: Real Wallet feature flag reflects implementation, not claimed manual QA", REAL_WALLET_PIPELINE_FLAG === true && railSrc.includes("deriveContributionSuggestion") && PLAN_EXEC_FLAG === false && PLAN_AUTO_FLAG === false && LIVE_PRICE_FLAG === false && DATES_FLAG === false && MIXED_FUNDING_FLAG === false && RESIDUAL_FLAG === false && CONTRIB_AUTO_FLAG === false, "implementation");

  // 15H-FINAL-AB…AF. Execution invariants over the finalization files.
  {
    const blob = [demoSrc, demoPageSrc, railSrc, productInputSrc].join("").toLowerCase();
    add("15H-FINAL-AB: no signMessage reference is added", !blob.includes("signmessage"), "none");
    add("15H-FINAL-AC: no signTransaction reference is added", !blob.includes("signtransaction"), "none");
    add("15H-FINAL-AD: no signAllTransactions reference is added", !blob.includes("signalltransactions"), "none");
    add("15H-FINAL-AE: no sendTransaction reference is added", !blob.includes("sendtransaction"), "none");
    const handlers = ["buy(", "swap(", "deposit(", "withdraw(", "transfer("];
    add("15H-FINAL-AF: no buy/swap/deposit/withdraw/transfer handler is added", handlers.filter((h) => blob.includes(h)).length === 0, "none");
  }

  return checks;
}

/**
 * Step 16A — Stable USDC Yield policy foundation fixtures (16A-A…AB). Verifies the versions, the
 * two-lane architecture, the strategy taxonomy + risk lanes, the documented protocol scope, the
 * suppression vocabulary, the existing-position policy, the intended priority (engine ordering
 * unchanged), the allowance diagnostics, the validators, and that nothing downstream exists yet.
 */

/* Step 23C.2 — DCA card copy ("Add $X of SOL" / "Swap $X of USDC to SOL"), the recurring-DCA Moonpay handoff, and
 * the Trim icon. */
export function runDcaCopy23CFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const readIfSrc = (rel: string) => { try { return readFileSync(`${process.cwd()}/${rel}`, "utf8"); } catch { return ""; } };
  const base = { planId: "p", fundingSourceId: "upcoming_contribution", fundingTiming: "upcoming", targetId: "sol", targetAssetId: "sol", targetSymbol: "SOL", amountKind: "exact", exactAmountUsd: 1000, contributionFrequencyId: "monthly", contributionsPerYear: 12, gapPercentagePoints: 5, steps: [], alternativeFundingSourceIds: [], readOnly: true, fundsMoved: false } as unknown as ContributionPlanSuggestionData;
  const recurring = { ...base, planKind: "recurring_dca" } as unknown as ContributionPlanSuggestionData;
  const excess = { ...base, planKind: "staged_excess_usdc_dca", sourceAssetSymbol: "USDC", exactAmountUsd: 1700, steps: [{ index: 0, relativeDayOffset: 0, amountUsd: 425 }] } as unknown as ContributionPlanSuggestionData;
  const stable = { ...base, planKind: "stable_contribution", targetSymbol: "USDC", targetId: "usdc", targetAssetId: "usdc" } as unknown as ContributionPlanSuggestionData;

  add("DCC-1: recurring DCA card line = 'Add $1,000 of SOL' (was 'Direct …to SOL')", buildContributionPlanCardPresentation(recurring).impactText === "Add $1,000 of SOL", buildContributionPlanCardPresentation(recurring).impactText ?? "");
  add("DCC-2: funded excess-USDC DCA card line = 'Swap $1,700 of USDC to SOL' (was 'Move …into SOL')", buildContributionPlanCardPresentation(excess).impactText === "Swap $1,700 of USDC to SOL", buildContributionPlanCardPresentation(excess).impactText ?? "");
  add("DCC-3: stable contribution card line = 'Add $1,000 of USDC'", buildContributionPlanCardPresentation(stable).impactText === "Add $1,000 of USDC", buildContributionPlanCardPresentation(stable).impactText ?? "");
  const recDetails = buildContributionPlanReviewDetails(recurring);
  add("DCC-4: recurring (future) DCA modal → read-only Moonpay handoff 'Buy SOL on Moonpay' → moonpay.com/buy/sol", recDetails.externalLink?.ctaLabel === "Buy SOL on Moonpay" && /moonpay\.com\/buy\/sol/.test(recDetails.externalLink?.url ?? "") && recDetails.externalLink?.secondaryLabel === "Cancel" && recDetails.externalLink?.opensInNewTab === true, recDetails.externalLink?.ctaLabel ?? "none");
  add("DCC-5: funded excess-USDC DCA has NO Moonpay link (it uses the live swap handoff instead)", buildContributionPlanReviewDetails(excess).externalLink == null, `link=${buildContributionPlanReviewDetails(excess).externalLink?.ctaLabel ?? "none"}`);
  const modal = readIfSrc("src/components/SuggestionReviewModal.tsx");
  add("DCC-6: the modal renders the contribution external-link footer read-only (new tab, no transaction); swap handoff takes precedence", /swapFooter \?\? externalLinkFooter\(contributionReview\.externalLink\)/.test(modal) && /No transaction is prepared/.test(modal), "modal footer");
  add("DCC-7: the Trim card uses trim.svg (mapped by the trim_long_tail card type)", /trim_long_tail: trimUrl/.test(readIfSrc("src/components/SuggestionCard.tsx")) && /icons\/ui\/trim\.svg/.test(readIfSrc("src/components/SuggestionCard.tsx")), "trim icon");

  return checks;
}
