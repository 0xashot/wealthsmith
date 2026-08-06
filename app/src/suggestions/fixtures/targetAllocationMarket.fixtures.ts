/**
 * Canonical target-allocation + market-conditions fixture checks (policy, assessment,
 * CoinMarketCap governed market, canonical adapter, rail/dashboard target mounts,
 * methodology copy, demo-market migration).
 *
 * Extracted verbatim from suggestionEngine.fixtures.ts (progressive monolith split —
 * same pattern as recordedObligation/observationDismissal). The monolith imports and
 * aggregates these checks; behavior and check names are unchanged.
 */
import { ALLOCATION_METHODOLOGY } from "../../state/approvedCopy";
import type { SavedGoal } from "../../types/goal";
import type { WalletPosition } from "../../wallet/walletPosition";
import { buildCanonicalTargetAllocation } from "../canonicalTargetAllocation";
import { buildMarketConditionCacheFromAdapterResult, parseCoinMarketCapFearGreedResponse, providerClassificationToBand, resolveCachePublishDecision } from "../coinmarketcapFearGreed";
import type { CmcFearGreedAdapterResult } from "../coinmarketcapFearGreed";
import { buildDemoContributionRail } from "../demoContributionScenario";
import type { FixtureCheck } from "./fixtureCheck";
import { deriveMarketConditionAssessment } from "../marketConditionAssessment";
import { MARKET_CONDITION_CACHE_VERSION, validateMarketConditionCache } from "../marketConditionCache";
import { deriveMarketConditionAssessmentFromCache } from "../marketConditionCacheLoader";
import { APPROVED_MARKET_CONDITION_SOURCES, CANONICAL_MARKET_CONDITION_SOURCE_ID, CMC_FEAR_GREED_MAX_OBSERVATION_AGE_MS, MARKET_CONDITION_FRESHNESS_POLICIES, MARKET_CONDITION_SOURCES, validateMarketConditionSourceRegistry } from "../marketConditionPolicy";
import type { MarketConditionFreshnessPolicy, MarketConditionSource } from "../marketConditionPolicy";
import { classifyMarketConditionScore, marketStableTargetPctForBand, marketVolatileTargetPctForBand } from "../marketConditionTypes";
import type { MarketConditionObservation } from "../marketConditionTypes";
import { buildRailTargetContext, mapCacheStateToMarketAssessment } from "../railTargetContext";
import { TARGET_ALLOCATION_ASSESSMENT_VERSION, deriveTargetAllocationAssessment } from "../targetAllocationAssessment";
import type { TargetAllocationFactorId } from "../targetAllocationAssessment";
import { CASH_FLOW_STABLE_BANDS, GOAL_STABLE_TARGET_PCT, HORIZON_STABLE_TARGET_PCT, MARKET_STABLE_TARGET_BANDS, RISK_STABLE_TARGET_PCT, TARGET_ALLOCATION_FACTOR_WEIGHTS, TARGET_ALLOCATION_POLICY_ID, TARGET_ALLOCATION_POLICY_STATUS, TARGET_ALLOCATION_POLICY_VERSION, validateTargetAllocationPolicy } from "../targetAllocationPolicy";
import { deriveRailSuggestions as SY_deriveRail } from "../useRailSuggestions";
import { readFileSync } from "node:fs";

/* ------------------------------------------------------------------ *
 * Step 22B — TARGET ALLOCATION POLICY (non-mounted). Validates the documented five-factor policy constants in
 * `targetAllocationPolicy.ts`: weights sum to 1, degraded denominator = 0.90, every profile enum is covered,
 * every value is a 0–100 stable %, market/cash-flow bands tile their domains, boundary selections are exact, and
 * the worked examples from rules/target-allocation.md reconcile. Test-only arithmetic; no production target
 * calculator is mounted and no production behavior changes.
 * ------------------------------------------------------------------ */
export function runTargetAllocationPolicyFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });

  // Test-only band selectors (mirror the policy's documented selection rules; NOT a mounted calculator).
  const marketStable = (score: number): number | null => {
    if (!Number.isFinite(score) || score < 0 || score > 100) return null;
    return MARKET_STABLE_TARGET_BANDS.find((b) => score >= b.minInclusive && score <= b.maxInclusive)?.stableTargetPct ?? null;
  };
  const cashFlowStable = (savingsRate: number): number | null => {
    if (!Number.isFinite(savingsRate)) return null;
    return CASH_FLOW_STABLE_BANDS.find((b) => b.upperInclusive == null || savingsRate <= b.upperInclusive)?.stableTargetPct ?? null;
  };
  const w = TARGET_ALLOCATION_FACTOR_WEIGHTS;
  const weightedStable = (risk: number, horizon: number, goal: number, cash: number, market: number): number =>
    risk * w.risk + horizon * w.horizon + goal * w.goal + cash * w.netCashFlow + market * w.market;
  const approx = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9;

  // ---- Structural policy validation ----
  const v = validateTargetAllocationPolicy();
  add("TAP-1: policy validates (weights/coverage/ranges/bands all consistent)", v.ok, v.errors.join(",") || "ok");
  add("TAP-2: policy status is approved but still NON-MOUNTED (mount is 22C)", TARGET_ALLOCATION_POLICY_STATUS === "approved", TARGET_ALLOCATION_POLICY_STATUS);
  add("TAP-3: weights sum to exactly 1.00", Math.abs((w.risk + w.horizon + w.goal + w.netCashFlow + w.market) - 1) < 1e-9, `${w.risk + w.horizon + w.goal + w.netCashFlow + w.market}`);
  add("TAP-4: degraded denominator = 1 − marketWeight = 0.90", Math.abs((1 - w.market) - 0.9) < 1e-9, `${1 - w.market}`);

  // ---- Enum coverage (exact mounted / proposed slugs) ----
  add("TAP-5: risk matrix covers very_low..very_high with stable 80/60/40/20/10", RISK_STABLE_TARGET_PCT.very_low === 80 && RISK_STABLE_TARGET_PCT.low === 60 && RISK_STABLE_TARGET_PCT.medium === 40 && RISK_STABLE_TARGET_PCT.high === 20 && RISK_STABLE_TARGET_PCT.very_high === 10, "risk");
  add("TAP-6: horizon matrix monotonic (6mo 90 > 1y 80 > 2y 65 > 5y 40 > 10+ 20) + not_sure 55", HORIZON_STABLE_TARGET_PCT["6_months"] === 90 && HORIZON_STABLE_TARGET_PCT["1_year"] === 80 && HORIZON_STABLE_TARGET_PCT["2_years"] === 65 && HORIZON_STABLE_TARGET_PCT["5_years"] === 40 && HORIZON_STABLE_TARGET_PCT["10_plus_years"] === 20 && HORIZON_STABLE_TARGET_PCT.not_sure_yet === 55, "horizon");
  add("TAP-7: goal matrix covers all 5 goal slugs incl. not_sure_yet=50", GOAL_STABLE_TARGET_PCT.retire_early === 35 && GOAL_STABLE_TARGET_PCT.build_long_term_wealth === 40 && GOAL_STABLE_TARGET_PCT.generate_passive_income === 60 && GOAL_STABLE_TARGET_PCT.save_for_big_purchase === 75 && GOAL_STABLE_TARGET_PCT.not_sure_yet === 50, "goal");

  // ---- Market band boundaries (inclusive) ----
  add("TAP-8: market band boundaries 24/25, 49/50, 59/60, 74/75 exact", marketStable(24) === 20 && marketStable(25) === 35 && marketStable(49) === 35 && marketStable(50) === 50 && marketStable(59) === 50 && marketStable(60) === 65 && marketStable(74) === 65 && marketStable(75) === 80, "boundaries");
  add("TAP-9: market score 0 → 20, score 100 → 80, out-of-range → null", marketStable(0) === 20 && marketStable(100) === 80 && marketStable(-1) === null && marketStable(101) === null && marketStable(NaN) === null, "extremes");

  // ---- Cash-flow band boundaries (inclusive upper) ----
  add("TAP-10: cash-flow bands s≤0→80, s=0.10→65, s=0.1001→50, s=0.20→50, s=0.35→35, s=0.3501→20", cashFlowStable(0) === 80 && cashFlowStable(-0.5) === 80 && cashFlowStable(0.1) === 65 && cashFlowStable(0.1001) === 50 && cashFlowStable(0.2) === 50 && cashFlowStable(0.35) === 35 && cashFlowStable(0.3501) === 20 && cashFlowStable(1.5) === 20, "cashflow bands");

  // ---- Worked examples (rules/target-allocation.md §18) ----
  // Profile P: risk medium 40, horizon 5y 40, goal build 40, savingsRate 0.75 → cash 20.
  add("TAP-11: example A full + Neutral(50) → 38.0 stable / 62.0 volatile", approx(weightedStable(40, 40, 40, 20, 50), 38), `${weightedStable(40, 40, 40, 20, 50)}`);
  add("TAP-12: example B degraded (market excluded) → (33)/0.9 = 36.666… stable", approx((40 * 0.35 + 40 * 0.2 + 40 * 0.2 + 20 * 0.15) / 0.9, 36.66666666666667), `${(40 * 0.35 + 40 * 0.2 + 40 * 0.2 + 20 * 0.15) / 0.9}`);
  add("TAP-13: example C Extreme Fear 35.0 vs Extreme Greed 41.0 → 6.0pp < 10pp material threshold", (() => { const ef = weightedStable(40, 40, 40, 20, marketStable(12)!); const eg = weightedStable(40, 40, 40, 20, marketStable(82)!); return approx(ef, 35) && approx(eg, 41) && approx(Math.abs(eg - ef), 6) && Math.abs(eg - ef) < 10; })(), "market bounded");
  add("TAP-14: cross-band target swing (Extreme Fear↔Extreme Greed, other factors fixed) = 60pp × 0.10 = 6pp", approx((80 - 20) * w.market, 6), `${(80 - 20) * w.market}`);

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 22C — MARKET CONDITION ASSESSMENT (non-mounted). Validates the governed Fear & Greed input: band
 * classification, exact source/index/methodology approval, source-specific freshness (observedAt / validUntil,
 * never retrievedAt-only), published-cache validation, and the full readiness matrix (full / excluded_* / blocked_* /
 * unresolved) — with NO Neutral fallback, NO mounted consumer, NO suggestion output, and the approved market matrix
 * reused (not duplicated). Deterministic; no live API request.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Step 22C — MARKET CONDITION ASSESSMENT (non-mounted). Validates the governed Fear & Greed input: band
 * classification, exact source/index/methodology approval, source-specific freshness (observedAt / validUntil,
 * never retrievedAt-only), published-cache validation, and the full readiness matrix (full / excluded_* / blocked_* /
 * unresolved) — with NO Neutral fallback, NO mounted consumer, NO suggestion output, and the approved market matrix
 * reused (not duplicated). Deterministic; no live API request.
 * ------------------------------------------------------------------ */
export function runMarketConditionFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const readIfSrc = (rel: string) => { try { return readFileSync(`${process.cwd()}/${rel}`, "utf8"); } catch { return ""; } };
  const GEN = 1_700_000_000_000;
  const iso = (ms: number) => new Date(ms).toISOString();
  const HOUR = 3_600_000;

  // Fixture-only approved source + freshness policies (never enter mounted production; injected as arguments).
  const FX_SOURCE: MarketConditionSource = { sourceId: "fx_fng", indexId: "fx_crypto_fng", displayName: "FX F&G", methodology: "fx_composite", methodologyVersion: "1.0.0", provider: "fx", marketScope: "fixture_scope", scoreRange: [0, 100], publicationCadence: "daily", observationTimestampSemantics: "source_daily_timestamp", sourceUrl: "internal://fixture", approvalState: "approved", approvalDate: "2026-07-22", approvedBy: "fixture", invalidationReason: null };
  const FX_SOURCE_PENDING: MarketConditionSource = { ...FX_SOURCE, approvalState: "pending", approvalDate: null, approvedBy: null };
  const FX_FRESH: MarketConditionFreshnessPolicy = { sourceId: "fx_fng", indexId: "fx_crypto_fng", methodology: "fx_composite", methodologyVersion: "1.0.0", policyState: "approved", freshnessSignal: "source_observed_at", maximumObservationAgeMs: 24 * HOUR, publicationCadence: "daily", gracePeriodMs: HOUR, evidenceSource: "fixture", approvedAt: "2026-07-22", invalidationReason: null };
  const FX_VU: MarketConditionFreshnessPolicy = { ...FX_FRESH, freshnessSignal: "source_valid_until", maximumObservationAgeMs: null };
  const FX_ENDPOINT: MarketConditionFreshnessPolicy = { ...FX_FRESH, freshnessSignal: "endpoint_guarantee", maximumObservationAgeMs: null };

  const obs = (over: Partial<MarketConditionObservation> = {}): MarketConditionObservation => ({ sourceId: "fx_fng", indexId: "fx_crypto_fng", indexName: "FX F&G", methodology: "fx_composite", methodologyVersion: "1.0.0", rawScore: 12, normalizedScore: 12, band: "extreme_fear", observedAt: iso(GEN - HOUR), retrievedAt: iso(GEN), validUntil: null, retrievalState: "cached", sourceFreshnessState: "unresolved", sourcePolicyState: "unresolved", evidence: ["fixture"], ...over });
  const assess = (o: MarketConditionObservation | null, sources: readonly MarketConditionSource[] = [FX_SOURCE], fresh: readonly MarketConditionFreshnessPolicy[] = [FX_FRESH]) =>
    deriveMarketConditionAssessment({ observation: o, sourcePolicies: sources, freshnessPolicies: fresh, generatedAt: GEN });

  // ---- Band classification ----
  const cls = classifyMarketConditionScore;
  add("MC-1: score bands 0/24→EF, 25/49→F, 50/59→N, 60/74→G, 75/100→EG", cls(0) === "extreme_fear" && cls(24) === "extreme_fear" && cls(25) === "fear" && cls(49) === "fear" && cls(50) === "neutral" && cls(59) === "neutral" && cls(60) === "greed" && cls(74) === "greed" && cls(75) === "extreme_greed" && cls(100) === "extreme_greed", "bands");
  add("MC-2: fractional scores classified without rounding (24.9→EF, 49.5→F, 74.99→G)", cls(24.9) === "extreme_fear" && cls(49.5) === "fear" && cls(74.99) === "greed", "fractional");
  add("MC-3: invalid scores → null (−1, 101, NaN, Infinity)", cls(-1) === null && cls(101) === null && cls(NaN) === null && cls(Infinity) === null, "invalid");

  // ---- Band → approved policy mapping (reused, not duplicated) ----
  add("MC-4: stable targets 20/35/50/65/80 from approved policy", marketStableTargetPctForBand("extreme_fear") === 20 && marketStableTargetPctForBand("fear") === 35 && marketStableTargetPctForBand("neutral") === 50 && marketStableTargetPctForBand("greed") === 65 && marketStableTargetPctForBand("extreme_greed") === 80, "stable map");
  add("MC-5: volatile target is complement (EF 80, EG 20)", marketVolatileTargetPctForBand("extreme_fear") === 80 && marketVolatileTargetPctForBand("extreme_greed") === 20, "volatile map");

  // ---- Assessment: full ----
  add("MC-6: fresh + approved + valid → full, available_full, stable 20/volatile 80 (EF)", (() => { const a = assess(obs()); return a.overallReadiness === "full" && a.componentAvailability === "available_full" && a.marketStableTargetPct === 20 && a.marketVolatileTargetPct === 80 && a.freshnessState === "fresh"; })(), "full");
  add("MC-7: full Extreme Greed → stable 80 / volatile 20", (() => { const a = assess(obs({ rawScore: 82, normalizedScore: 82, band: "extreme_greed" })); return a.overallReadiness === "full" && a.marketStableTargetPct === 80 && a.marketVolatileTargetPct === 20; })(), "full EG");

  // ---- Assessment: excluded (never Neutral) ----
  add("MC-8: no observation → excluded_market_unavailable, no pct (never Neutral)", (() => { const a = assess(null); return a.overallReadiness === "excluded_market_unavailable" && a.componentAvailability === "excluded_degraded" && a.marketStableTargetPct === null; })(), "unavailable");
  add("MC-9: stale observation → excluded_market_stale, no pct", (() => { const a = assess(obs({ observedAt: iso(GEN - 48 * HOUR) })); return a.overallReadiness === "excluded_market_stale" && a.marketStableTargetPct === null && a.freshnessState === "stale"; })(), "stale");
  add("MC-10: fetch_failed + stale → excluded_market_failed", (() => { const a = assess(obs({ observedAt: iso(GEN - 48 * HOUR), retrievalState: "fetch_failed" })); return a.overallReadiness === "excluded_market_failed" && a.componentAvailability === "excluded_degraded"; })(), "failed");
  add("MC-11: fetch_failed + FRESH cache → full (usable) + warning", (() => { const a = assess(obs({ retrievalState: "fetch_failed" })); return a.overallReadiness === "full" && a.marketStableTargetPct === 20 && a.warnings.includes("served_from_fresh_cache_after_fetch_failure"); })(), "failed-but-fresh");
  add("MC-12: pending (unapproved) source → excluded_market_unapproved, no pct", (() => { const a = assess(obs(), [FX_SOURCE_PENDING]); return a.overallReadiness === "excluded_market_unapproved" && a.marketStableTargetPct === null; })(), "unapproved");
  add("MC-13: unknown source id → excluded_market_unapproved", (() => { const a = assess(obs({ sourceId: "who_dis" })); return a.overallReadiness === "excluded_market_unapproved"; })(), "unknown src");

  // ---- Assessment: blocked ----
  add("MC-14: invalid score (150) → blocked_invalid_score, blocked availability", (() => { const a = assess(obs({ rawScore: 150, normalizedScore: 150 })); return a.overallReadiness === "blocked_invalid_score" && a.componentAvailability === "blocked" && a.marketStableTargetPct === null; })(), "blocked score");
  add("MC-15: NaN score → blocked_invalid_score", (() => { const a = assess(obs({ normalizedScore: NaN })); return a.overallReadiness === "blocked_invalid_score"; })(), "blocked nan");
  add("MC-16: methodology mismatch (known source, wrong methodology) → blocked_methodology_mismatch", (() => { const a = assess(obs({ methodology: "other_composite" })); return a.overallReadiness === "blocked_methodology_mismatch" && a.componentAvailability === "blocked"; })(), "blocked methodology");
  add("MC-17: index mismatch → blocked_methodology_mismatch (identity differs)", (() => { const a = assess(obs({ indexId: "other_index" })); return a.overallReadiness === "blocked_methodology_mismatch"; })(), "blocked index");

  // ---- Assessment: unresolved freshness ----
  add("MC-18: missing freshness policy → unresolved (freshness cannot be proven)", (() => { const a = assess(obs(), [FX_SOURCE], []); return a.overallReadiness === "unresolved" && a.componentAvailability === "unresolved"; })(), "unresolved no-policy");
  add("MC-19: retrievedAt-only / current-refresh alone never proves freshness (endpoint_guarantee → unresolved)", (() => { const a = assess(obs({ retrievalState: "retrieved_current_refresh", observedAt: iso(GEN - 48 * HOUR) }), [FX_SOURCE], [FX_ENDPOINT]); return a.overallReadiness === "unresolved"; })(), "retrieval not freshness");
  add("MC-20: current-refresh with STALE observedAt is still stale, not fresh", (() => { const a = assess(obs({ retrievalState: "retrieved_current_refresh", observedAt: iso(GEN - 48 * HOUR) })); return a.overallReadiness === "excluded_market_stale"; })(), "observedAt governs");

  // ---- validUntil freshness signal ----
  add("MC-21: validUntil in future → fresh → full", (() => { const a = assess(obs({ validUntil: iso(GEN + HOUR) }), [FX_SOURCE], [FX_VU]); return a.overallReadiness === "full"; })(), "validUntil fresh");
  add("MC-22: validUntil expired → excluded_market_stale", (() => { const a = assess(obs({ validUntil: iso(GEN - HOUR) }), [FX_SOURCE], [FX_VU]); return a.overallReadiness === "excluded_market_stale"; })(), "validUntil expired");

  // ---- Boundary freshness: exactly at max age (24h + 1h grace) ----
  add("MC-23: observedAt exactly at max age+grace (25h) → fresh; 25h+1ms → stale", (() => { const fresh = assess(obs({ observedAt: iso(GEN - 25 * HOUR) })); const stale = assess(obs({ observedAt: iso(GEN - 25 * HOUR - 1) })); return fresh.overallReadiness === "full" && stale.overallReadiness === "excluded_market_stale"; })(), "age boundary");

  // ---- Production registry stays degraded (no approved source) ----
  add("MC-24: PRODUCTION registries + fresh CoinMarketCap observation → full (source operational, Step 22E)", (() => { const cmcObs: MarketConditionObservation = { sourceId: CANONICAL_MARKET_CONDITION_SOURCE_ID, indexId: "cmc_crypto_fear_greed", indexName: "CMC Crypto Fear & Greed Index", methodology: "cmc_crypto_fear_greed_composite", methodologyVersion: "cmc_fng_methodology_2026_1", rawScore: 12, normalizedScore: 12, band: "extreme_fear", observedAt: iso(GEN - HOUR), retrievedAt: iso(GEN), validUntil: null, retrievalState: "cached", sourceFreshnessState: "unresolved", sourcePolicyState: "unresolved", evidence: ["cmc"] }; const a = deriveMarketConditionAssessment({ observation: cmcObs, sourcePolicies: MARKET_CONDITION_SOURCES, freshnessPolicies: MARKET_CONDITION_FRESHNESS_POLICIES, generatedAt: GEN }); return a.overallReadiness === "full" && a.marketStableTargetPct === 20; })(), "prod operational");
  add("MC-25: registry valid; APPROVED view contains ONLY CoinMarketCap; exactly one approved freshness policy", validateMarketConditionSourceRegistry(MARKET_CONDITION_SOURCES).length === 0 && APPROVED_MARKET_CONDITION_SOURCES.length === 1 && APPROVED_MARKET_CONDITION_SOURCES[0].sourceId === "coinmarketcap_crypto_fear_greed" && MARKET_CONDITION_FRESHNESS_POLICIES.length === 1 && MARKET_CONDITION_FRESHNESS_POLICIES[0].policyState === "approved", "prod registry");

  // ---- Cache validation ----
  const prodSourceId = CANONICAL_MARKET_CONDITION_SOURCE_ID;
  const validCache = { cacheVersion: MARKET_CONDITION_CACHE_VERSION, generatedAt: iso(GEN), sourceId: prodSourceId, indexId: "cmc_crypto_fear_greed", indexName: "CMC Crypto Fear & Greed Index", methodology: "cmc_crypto_fear_greed_composite", methodologyVersion: "cmc_fng_methodology_2026_1", score: 12, band: "extreme_fear", observedAt: iso(GEN - HOUR), retrievedAt: iso(GEN), validUntil: null, retrievalState: "cached", evidence: ["daily source timestamp"] };
  const vc = (over: Record<string, unknown> = {}) => validateMarketConditionCache({ ...validCache, ...over }, { knownSources: MARKET_CONDITION_SOURCES, now: GEN });
  add("MC-26: valid cache validates → returns governed observation (no raw payload)", (() => { const r = vc(); return r.valid && r.observation != null && !("rawPayload" in (r.observation as object)); })(), "valid cache");
  add("MC-27: missing sourceId → invalid", vc({ sourceId: "" }).errors.includes("missing_source_id"), "missing src");
  add("MC-28: non-object / malformed cache → invalid", validateMarketConditionCache(null, { knownSources: MARKET_CONDITION_SOURCES }).valid === false && validateMarketConditionCache(42, { knownSources: MARKET_CONDITION_SOURCES }).valid === false, "malformed");
  add("MC-29: unknown cache version → invalid", vc({ cacheVersion: "vX" }).errors.includes("unknown_cache_version"), "cache ver");
  add("MC-30: score > 100 → invalid; score < 0 → invalid; non-finite → invalid", vc({ score: 150, band: "extreme_greed" }).errors.includes("score_above_100") && vc({ score: -5, band: "extreme_fear" }).errors.includes("score_below_0") && vc({ score: Number.NaN }).errors.includes("non_finite_score"), "score range");
  add("MC-31: provider band mismatch (score 12 labeled greed) → rejected", vc({ band: "greed" }).errors.includes("band_mismatch"), "band mismatch");
  add("MC-32: observedAt after retrievedAt → rejected", vc({ observedAt: iso(GEN + HOUR), retrievedAt: iso(GEN) }).errors.includes("observed_after_retrieved"), "observed order");
  add("MC-33: validUntil expired (now=GEN) → rejected", vc({ validUntil: iso(GEN - HOUR) }).errors.includes("valid_until_expired"), "validUntil");
  add("MC-34: unknown source id → source_unknown; wrong methodology → source_methodology_mismatch", vc({ sourceId: "nope" }).errors.includes("source_unknown") && vc({ methodology: "different" }).errors.includes("source_methodology_mismatch"), "cache governance");
  add("MC-35: malformed timestamps + malformed evidence → invalid", vc({ observedAt: "not-a-date" }).errors.includes("malformed_observed_at") && vc({ evidence: [1, 2] as unknown as string[] }).errors.includes("malformed_evidence"), "malformed fields");

  // ---- Policy reuse + bounded influence ----
  add("MC-36: market stable target comes from approved policy constants (no duplicate matrix)", MARKET_STABLE_TARGET_BANDS.find((b) => b.id === "extreme_greed")?.stableTargetPct === marketStableTargetPctForBand("extreme_greed"), "policy reuse");
  add("MC-37: cross-band swing (EF↔EG, other factors fixed): full EG stable 80 − full EF stable 20 = 60pp × 0.10 = 6pp", (() => { const ef = assess(obs())!.marketStableTargetPct!; const eg = assess(obs({ rawScore: 82, normalizedScore: 82, band: "extreme_greed" }))!.marketStableTargetPct!; return ef === 20 && eg === 80 && (eg - ef) * TARGET_ALLOCATION_FACTOR_WEIGHTS.market === 6; })(), "cross-band swing");
  add("MC-38: no market matrix duplicated in marketConditionTypes.ts (imports the approved bands)", (() => { const s = readIfSrc("src/suggestions/marketConditionTypes.ts"); return /MARKET_STABLE_TARGET_BANDS/.test(s) && /from "\.\/targetAllocationPolicy"/.test(s); })(), "no dup matrix");

  // ---- Regression: NON-MOUNTED + no production behavior change ----
  add("MC-39: marketCondition* consumed by NO suggestion evaluator (engine/rebalance/DCA/OnTrack/recommendedAllocation) — the rail loads it in 22F slice 2 but no category reads it yet", (() => { const files = ["src/suggestions/engine.ts", "src/suggestions/rebalanceAssessment.ts", "src/suggestions/dcaSuggestion.ts", "src/suggestions/contributionPlanPipeline.ts", "src/suggestions/onTrackAssessment.ts", "src/wallet/recommendedAllocation.ts"]; return files.every((f) => !/marketCondition/.test(readIfSrc(f))); })(), "not consumed by evaluators");
  add("MC-40 (22G): the legacy risk-only allocation module is DELETED — the market factor lives only in the canonical five-factor target policy", (() => { return readIfSrc("src/wallet/recommendedAllocation.ts") === "" && /MARKET_STABLE_TARGET_BANDS/.test(readIfSrc("src/suggestions/targetAllocationPolicy.ts")); })(), "module deleted");
  add("MC-41: assessment emits NO suggestion/card (no EngineSuggestion, category, cta)", (() => { const s = readIfSrc("src/suggestions/marketConditionAssessment.ts"); return !/EngineSuggestion|category:|cta:|action_kind/.test(s); })(), "no suggestion");
  add("MC-42: no route/quote/transaction/signature/fetch in the market path", (() => { const blob = readIfSrc("src/suggestions/marketConditionAssessment.ts") + readIfSrc("src/suggestions/marketConditionPolicy.ts") + readIfSrc("src/suggestions/marketConditionCache.ts") + readIfSrc("src/suggestions/marketConditionTypes.ts"); return !/fetch\(|swapRoute|getQuote|signTransaction|sendTransaction|simulateTransaction|XMLHttpRequest/.test(blob); })(), "read-only");

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 22D — TARGET ALLOCATION ASSESSMENT (non-mounted, five-factor). Validates that the pure assessment reuses the
 * approved policy matrices/weights (no duplication), consumes the governed MarketConditionAssessment (no market
 * recompute), and distinguishes full / degraded_market_excluded / unavailable / blocked / unresolved — never
 * substituting a missing value, never using the contribution as Net Cash Flow, never computing target dollars, and
 * never emitting a suggestion. Deterministic; no live API.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Step 22D — TARGET ALLOCATION ASSESSMENT (non-mounted, five-factor). Validates that the pure assessment reuses the
 * approved policy matrices/weights (no duplication), consumes the governed MarketConditionAssessment (no market
 * recompute), and distinguishes full / degraded_market_excluded / unavailable / blocked / unresolved — never
 * substituting a missing value, never using the contribution as Net Cash Flow, never computing target dollars, and
 * never emitting a suggestion. Deterministic; no live API.
 * ------------------------------------------------------------------ */
export function runTargetAllocationAssessmentFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const readIfSrc = (rel: string) => { try { return readFileSync(`${process.cwd()}/${rel}`, "utf8"); } catch { return ""; } };
  const GEN = 1_700_000_000_000;
  const iso = (ms: number) => new Date(ms).toISOString();
  const HOUR = 3_600_000;
  const approx = (a: number | null, b: number): boolean => a != null && Math.abs(a - b) < 1e-9;

  // Fixture-only approved market source + freshness policy, to synthesize MarketConditionAssessment states.
  const FX_SOURCE: MarketConditionSource = { sourceId: "fx_fng", indexId: "fx_crypto_fng", displayName: "FX", methodology: "fx_composite", methodologyVersion: "1.0.0", provider: "fx", marketScope: "fixture_scope", scoreRange: [0, 100], publicationCadence: "daily", observationTimestampSemantics: "source_daily_timestamp", sourceUrl: "internal://fixture", approvalState: "approved", approvalDate: "2026-07-22", approvedBy: "fixture", invalidationReason: null };
  const FX_PENDING: MarketConditionSource = { ...FX_SOURCE, approvalState: "pending", approvalDate: null, approvedBy: null };
  const FX_FRESH: MarketConditionFreshnessPolicy = { sourceId: "fx_fng", indexId: "fx_crypto_fng", methodology: "fx_composite", methodologyVersion: "1.0.0", policyState: "approved", freshnessSignal: "source_observed_at", maximumObservationAgeMs: 24 * HOUR, publicationCadence: "daily", gracePeriodMs: HOUR, evidenceSource: "fixture", approvedAt: "2026-07-22", invalidationReason: null };
  const mObs = (score: number, band: MarketConditionObservation["band"], over: Partial<MarketConditionObservation> = {}): MarketConditionObservation => ({ sourceId: "fx_fng", indexId: "fx_crypto_fng", indexName: "FX", methodology: "fx_composite", methodologyVersion: "1.0.0", rawScore: score, normalizedScore: score, band, observedAt: iso(GEN - HOUR), retrievedAt: iso(GEN), validUntil: null, retrievalState: "cached", sourceFreshnessState: "unresolved", sourcePolicyState: "unresolved", evidence: ["fx"], ...over });
  const mca = (o: MarketConditionObservation | null, sources = [FX_SOURCE], fresh = [FX_FRESH]) => deriveMarketConditionAssessment({ observation: o, sourcePolicies: sources, freshnessPolicies: fresh, generatedAt: GEN });
  const mktNeutral = mca(mObs(55, "neutral"));
  const mktEF = mca(mObs(12, "extreme_fear"));
  const mktEG = mca(mObs(82, "extreme_greed"));
  const mktMissing = null;
  const mktStale = mca(mObs(12, "extreme_fear", { observedAt: iso(GEN - 48 * HOUR) }));
  const mktFailed = mca(mObs(12, "extreme_fear", { observedAt: iso(GEN - 48 * HOUR), retrievalState: "fetch_failed" }));
  const mktUnapproved = mca(mObs(12, "extreme_fear"), [FX_PENDING]);
  const mktBlocked = mca(mObs(150, "extreme_greed"));
  const mktUnresolved = mca(mObs(12, "extreme_fear"), [FX_SOURCE], []);

  const taa = (over: Partial<Parameters<typeof deriveTargetAllocationAssessment>[0]> = {}) => deriveTargetAllocationAssessment({ riskTolerance: "medium", timeline: "5_years", financialGoal: "build_long_term_wealth", monthlyIncomeUsd: 4000, monthlyExpensesUsd: 1000, marketConditionAssessment: mktNeutral, generatedAt: GEN, ...over });
  const factor = (a: ReturnType<typeof taa>, id: TargetAllocationFactorId) => a.factors.find((f) => f.factorId === id)!;

  // ---- Policy reuse ----
  add("TAA-1: reports approved policy id + version (target_allocation_policy_v1 / 1.0.0)", (() => { const a = taa(); return a.policyId === TARGET_ALLOCATION_POLICY_ID && a.policyVersion === TARGET_ALLOCATION_POLICY_VERSION && a.methodologyVersion === TARGET_ALLOCATION_ASSESSMENT_VERSION; })(), "policy id");
  add("TAA-2: weights are the approved 0.35/0.20/0.20/0.15/0.10", (() => { const w = taa().weights; return w.risk === 0.35 && w.horizon === 0.2 && w.goal === 0.2 && w.netCashFlow === 0.15 && w.market === 0.1; })(), "weights");

  // ---- Risk factor ----
  add("TAA-3: risk slugs map exactly (very_low 80 … very_high 10)", [["very_low", 80], ["low", 60], ["medium", 40], ["high", 20], ["very_high", 10]].every(([s, p]) => factor(taa({ riskTolerance: s as string }), "risk").stableTargetPct === p), "risk map");
  add("TAA-4: missing risk → unavailable; unsupported risk → blocked", factor(taa({ riskTolerance: null }), "risk").state === "unavailable" && factor(taa({ riskTolerance: "banana" }), "risk").state === "blocked", "risk states");

  // ---- Horizon factor ----
  add("TAA-5: horizon slugs map exactly (6mo 90 … 10+ 20, not_sure 55)", [["6_months", 90], ["1_year", 80], ["2_years", 65], ["5_years", 40], ["10_plus_years", 20], ["not_sure_yet", 55]].every(([s, p]) => factor(taa({ timeline: s as string }), "horizon").stableTargetPct === p), "horizon map");
  add("TAA-6: missing horizon → unavailable; unsupported → blocked", factor(taa({ timeline: null }), "horizon").state === "unavailable" && factor(taa({ timeline: "someday" }), "horizon").state === "blocked", "horizon states");

  // ---- Goal factor ----
  add("TAA-7: goal slugs map exactly (retire 35, build 40, income 60, purchase 75, not_sure 50)", [["retire_early", 35], ["build_long_term_wealth", 40], ["generate_passive_income", 60], ["save_for_big_purchase", 75], ["not_sure_yet", 50]].every(([s, p]) => factor(taa({ financialGoal: s as string }), "financial_goal").stableTargetPct === p), "goal map");
  add("TAA-8: missing goal → unavailable; unsupported → blocked", factor(taa({ financialGoal: null }), "financial_goal").state === "unavailable" && factor(taa({ financialGoal: "fame" }), "financial_goal").state === "blocked", "goal states");

  // ---- Net Cash Flow factor ----
  const cf = (income: number | null, expenses: number | null) => factor(taa({ monthlyIncomeUsd: income, monthlyExpensesUsd: expenses }), "net_cash_flow");
  add("TAA-9: savings-rate bands: 0→80, 0.10→65, 0.1001→50, 0.20→50, 0.35→35, 0.3501→20, rate=1→20, neg→80", cf(1000, 1000).stableTargetPct === 80 && cf(1000, 900).stableTargetPct === 65 && cf(10000, 8999).stableTargetPct === 50 && cf(1000, 800).stableTargetPct === 50 && cf(10000, 6500).stableTargetPct === 35 && cf(10000, 6499).stableTargetPct === 20 && cf(1000, 0).stableTargetPct === 20 && cf(1000, 2000).stableTargetPct === 80, "cash bands");
  add("TAA-10: income null → unavailable; income ≤0 → unavailable; expenses null → unavailable; expenses <0 → blocked; non-finite → blocked; zero expenses valid", cf(null, 1000).state === "unavailable" && cf(0, 1000).state === "unavailable" && cf(-5, 1000).state === "unavailable" && cf(4000, null).state === "unavailable" && cf(4000, -1).state === "blocked" && cf(Infinity, 1000).state === "blocked" && cf(4000, NaN).state === "blocked" && cf(4000, 0).state === "available", "cash states");
  add("TAA-11: cash flow retains income/expenses/netCashFlow/savingsRate internally (0.75 for 4000/1000)", (() => { const c = cf(4000, 1000).cashFlow!; return c.monthlyIncomeUsd === 4000 && c.monthlyExpensesUsd === 1000 && c.netCashFlowUsd === 3000 && approx(c.savingsRate, 0.75); })(), "cash detail");
  add("TAA-12: contribution amount is never read (no monthly_saving_goal / contribution in the input or module)", (() => { const s = readIfSrc("src/suggestions/targetAllocationAssessment.ts"); return !/monthly_saving_goal|contributionAmount|monthlySavingGoal|monthlyContribution/.test(s); })(), "no contribution");

  // ---- Market factor (consumed, not recomputed) ----
  add("TAA-13: full market EF/N/EG → stable 20/50/80 from MarketConditionAssessment", factor(taa({ marketConditionAssessment: mktEF }), "market_conditions").stableTargetPct === 20 && factor(taa({ marketConditionAssessment: mktNeutral }), "market_conditions").stableTargetPct === 50 && factor(taa({ marketConditionAssessment: mktEG }), "market_conditions").stableTargetPct === 80, "market map");
  add("TAA-14: excluded/blocked/unresolved market → factor excluded/blocked/unresolved (never a %)", factor(taa({ marketConditionAssessment: mktStale }), "market_conditions").state === "excluded" && factor(taa({ marketConditionAssessment: mktBlocked }), "market_conditions").state === "blocked" && factor(taa({ marketConditionAssessment: mktUnresolved }), "market_conditions").state === "unresolved" && factor(taa({ marketConditionAssessment: null }), "market_conditions").state === "excluded", "market states");

  // ---- Full target ----
  add("TAA-15: full example A → 38 stable / 62 volatile, confidence full", (() => { const a = taa(); return a.targetConfidence === "full" && approx(a.finalStableTargetPct, 38) && approx(a.finalVolatileTargetPct, 62); })(), "full A");
  add("TAA-16: weighted contributions sum to final stable; stable + volatile = 100", (() => { const a = taa(); const sum = a.factors.reduce((s, f) => s + (f.weightedStableContributionPct ?? 0), 0); return approx(sum, a.finalStableTargetPct as number) && approx((a.finalStableTargetPct as number) + (a.finalVolatileTargetPct as number), 100); })(), "sum invariant");
  add("TAA-17: deterministic repeat (same inputs → identical final)", taa().finalStableTargetPct === taa().finalStableTargetPct, "deterministic");
  add("TAA-18: explanation — subtotal 33, profile-only renorm 36.667, market contribution 5, adj vs profile-only ≈1.333 (NOT 6)", (() => { const a = taa(); return approx(a.profileWeightedStableSubtotalPct, 33) && approx(a.profileOnlyRenormalizedStableTargetPct, 33 / 0.9) && approx(a.marketWeightedContributionPct, 5) && approx(a.marketAdjustmentVsProfileOnlyPct, 38 - 33 / 0.9) && !approx(a.marketAdjustmentVsProfileOnlyPct, 6); })(), "explanation");

  // ---- Degraded target ----
  add("TAA-19: market missing → degraded_market_excluded, 36.667 stable (33/0.90), no market contribution, exclusion reason", (() => { const a = taa({ marketConditionAssessment: mktMissing }); return a.targetConfidence === "degraded_market_excluded" && approx(a.finalStableTargetPct, 33 / 0.9) && a.marketWeightedContributionPct === null && a.marketExclusionReason != null; })(), "degraded");
  add("TAA-20: degraded → Rebalance/DCA eligible true, On Track eligible FALSE", (() => { const a = taa({ marketConditionAssessment: mktMissing }); return a.rebalanceTargetEligible === true && a.dcaTargetEligible === true && a.onTrackTargetEligible === false; })(), "degraded readiness");
  add("TAA-21: distinct market exclusion reasons (missing ≠ stale ≠ failed ≠ unapproved)", (() => { const r = (m: ReturnType<typeof mca> | null) => taa({ marketConditionAssessment: m }).marketExclusionReason; const set = new Set([r(mktMissing), r(mktStale), r(mktFailed), r(mktUnapproved)]); return set.size === 4; })(), "distinct reasons");

  // ---- Unavailable / blocked / unresolved ----
  add("TAA-22: missing required non-market factor → unavailable, no target, no risk-only fallback, all downstream false", (() => { const a = taa({ riskTolerance: null }); return a.targetConfidence === "unavailable" && a.finalStableTargetPct === null && a.unavailableFactors.includes("risk") && !a.rebalanceTargetEligible && !a.dcaTargetEligible && !a.onTrackTargetEligible; })(), "unavailable");
  add("TAA-23: blocked takes precedence over unavailable (unsupported risk + missing income → blocked)", (() => { const a = taa({ riskTolerance: "banana", monthlyIncomeUsd: null }); return a.targetConfidence === "blocked" && a.finalStableTargetPct === null; })(), "blocked precedence");
  add("TAA-24: unresolved market (profile all available) → unresolved, NOT degraded, no target", (() => { const a = taa({ marketConditionAssessment: mktUnresolved }); return a.targetConfidence === "unresolved" && a.finalStableTargetPct === null && !a.rebalanceTargetEligible; })(), "unresolved");
  add("TAA-25: no Neutral fallback anywhere (missing/stale/failed/unapproved market never yields a 50 market contribution)", (() => { return [mktMissing, mktStale, mktFailed, mktUnapproved].every((m) => taa({ marketConditionAssessment: m }).marketWeightedContributionPct === null); })(), "no neutral");

  // ---- Cross-band swing (corrected terminology) ----
  add("TAA-26: cross-band swing (EF↔EG, profile fixed): full EG stable − full EF stable = exactly 6pp", (() => { const ef = taa({ marketConditionAssessment: mktEF }).finalStableTargetPct as number; const eg = taa({ marketConditionAssessment: mktEG }).finalStableTargetPct as number; return approx(eg - ef, 6); })(), "cross-band 6pp");
  add("TAA-27: full-vs-degraded difference is NOT the 6pp swing (example A: 38 − 36.667 ≈ 1.333)", (() => { const full = taa().finalStableTargetPct as number; const degraded = taa({ marketConditionAssessment: mktMissing }).finalStableTargetPct as number; return approx(full - degraded, 38 - 33 / 0.9) && !approx(full - degraded, 6); })(), "full-vs-degraded");

  // ---- Readiness metadata ----
  add("TAA-28: full → all target consumers eligible; Safety Buffer independent always true; explanation available", (() => { const a = taa(); return a.rebalanceTargetEligible && a.dcaTargetEligible && a.onTrackTargetEligible && a.safetyBufferIndependent === true && a.targetExplanationAvailable === true; })(), "full readiness");
  add("TAA-29: unavailable/blocked/unresolved → no target-explanation, all consumers false, buffer still independent", (() => { const cases = [taa({ riskTolerance: null }), taa({ riskTolerance: "banana" }), taa({ marketConditionAssessment: mktUnresolved })]; return cases.every((a) => !a.rebalanceTargetEligible && !a.dcaTargetEligible && !a.onTrackTargetEligible && a.safetyBufferIndependent === true) && cases[0].targetExplanationAvailable === false; })(), "non-target readiness");

  // ---- No target dollars / no raw positions / privacy ----
  add("TAA-30: assessment computes PERCENTAGES only — no target-dollar math + input has no wallet-position/portfolio field", (() => { const s = readIfSrc("src/suggestions/targetAllocationAssessment.ts"); const noDollarMath = !/totalPricedUsd|cryptoUsd|stableUsd|targetUsd|deriveAllocationDeltas|\.valueUsd/.test(s); const noPositionInput = !/positions:|portfolioSnapshot|walletPositions/.test(s); return noDollarMath && noPositionInput; })(), "no dollars");

  // ---- Regression: non-mounted + production unchanged ----
  add("TAA-31: targetAllocationAssessment consumed by NO still-unmounted evaluator (Rebalance+rail mount it in slices 2–3, DCA/contribution in slice 4; OnTrack/engine/recommendedAllocation/legacy-DCA do not yet)", (() => { const files = ["src/suggestions/engine.ts", "src/suggestions/dcaSuggestion.ts", "src/suggestions/onTrackAssessment.ts", "src/wallet/recommendedAllocation.ts"]; return files.every((f) => !/targetAllocationAssessment/.test(readIfSrc(f))); })(), "unmounted evaluators");
  add("TAA-32: no duplicated matrix (imports matrices from targetAllocationPolicy; defines none)", (() => { const s = readIfSrc("src/suggestions/targetAllocationAssessment.ts"); return /from "\.\/targetAllocationPolicy"/.test(s) && /RISK_STABLE_TARGET_PCT|HORIZON_STABLE_TARGET_PCT|GOAL_STABLE_TARGET_PCT|CASH_FLOW_STABLE_BANDS/.test(s) && !/very_low:\s*80|extreme_fear.*20/.test(s); })(), "no dup matrix");
  add("TAA-33: no suggestion/route/quote/transaction/signature in the target-allocation path", (() => { const s = readIfSrc("src/suggestions/targetAllocationAssessment.ts"); return !/EngineSuggestion|category:|cta:|swapRoute|getQuote|signTransaction|sendTransaction|fetch\(/.test(s); })(), "read-only");
  add("TAA-34 (22G): the TargetAllocationAssessment is the sole target-allocation authority — the legacy risk-only module is deleted", (() => { return readIfSrc("src/wallet/recommendedAllocation.ts") === "" && /deriveTargetAllocationAssessment/.test(readIfSrc("src/suggestions/targetAllocationAssessment.ts")); })(), "sole authority");

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 22E — COINMARKETCAP MARKET CONDITIONS (approved source, offline adapter, cache, loader). Validates the exact
 * approved CoinMarketCap identity, deterministic response parsing (latest-observation selection, score/band, provider
 * classification as evidence only), the 36h observedAt freshness policy, atomic-publish decisions (last-known-valid),
 * the production cache loader (missing→unavailable, malformed→blocked, stale→excluded, fresh→full), security (no key /
 * raw payload), and regression (still non-mounted; production risk-only). Deterministic — never calls the live API.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Step 22E — COINMARKETCAP MARKET CONDITIONS (approved source, offline adapter, cache, loader). Validates the exact
 * approved CoinMarketCap identity, deterministic response parsing (latest-observation selection, score/band, provider
 * classification as evidence only), the 36h observedAt freshness policy, atomic-publish decisions (last-known-valid),
 * the production cache loader (missing→unavailable, malformed→blocked, stale→excluded, fresh→full), security (no key /
 * raw payload), and regression (still non-mounted; production risk-only). Deterministic — never calls the live API.
 * ------------------------------------------------------------------ */
export function runCoinMarketCapMarketConditionFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const readIfSrc = (rel: string) => { try { return readFileSync(`${process.cwd()}/${rel}`, "utf8"); } catch { return ""; } };
  const GEN = 1_700_000_000_000;
  const SEC = GEN / 1000;
  const HOUR = 3_600_000;
  const rec = (tsSec: number, value: number | string, cls?: string) => ({ timestamp: String(tsSec), value, ...(cls ? { value_classification: cls } : {}) });
  const cmcResp = (records: unknown[], errorCode = 0) => ({ status: { timestamp: "2026-07-22T00:00:00Z", error_code: errorCode, error_message: errorCode === 0 ? null : "err" }, data: records });
  const parse = (json: unknown, retrievedAtMs = GEN) => parseCoinMarketCapFearGreedResponse(json, { retrievedAtMs });
  const okResult = (score = 12, cls = "Extreme Fear", tsSec = SEC): CmcFearGreedAdapterResult => parse(cmcResp([rec(tsSec, score, cls)])).result!;
  const buildCache = (r: CmcFearGreedAdapterResult) => buildMarketConditionCacheFromAdapterResult(r, { generatedAtMs: GEN });
  const validCache = () => buildCache(okResult()).cache!;
  const loadFrom = (cache: unknown | null, generatedAt = GEN) => deriveMarketConditionAssessmentFromCache(cache, { generatedAt });

  // ---- Source approval ----
  add("CME-1: CoinMarketCap exact approved identity (id/index/methodology/version/scope/provider)", (() => { const s = APPROVED_MARKET_CONDITION_SOURCES[0]; return s?.sourceId === "coinmarketcap_crypto_fear_greed" && s.indexId === "cmc_crypto_fear_greed" && s.methodology === "cmc_crypto_fear_greed_composite" && s.methodologyVersion === "cmc_fng_methodology_2026_1" && s.marketScope === "broad_crypto_large_cap_composite" && s.provider === "CoinMarketCap" && s.approvalState === "approved" && s.approvedBy === "product_owner"; })(), "identity");
  add("CME-2: approved registry contains CoinMarketCap; Alternative.me is absent (no fallback source)", APPROVED_MARKET_CONDITION_SOURCES.length === 1 && CANONICAL_MARKET_CONDITION_SOURCE_ID === "coinmarketcap_crypto_fear_greed" && !MARKET_CONDITION_SOURCES.some((s) => s.sourceId.includes("alternative")), "registry");
  add("CME-3: freshness policy is source-specific 36h observedAt (not a global default)", (() => { const p = MARKET_CONDITION_FRESHNESS_POLICIES[0]; return p?.sourceId === "coinmarketcap_crypto_fear_greed" && p.freshnessSignal === "source_observed_at" && p.maximumObservationAgeMs === CMC_FEAR_GREED_MAX_OBSERVATION_AGE_MS && p.maximumObservationAgeMs === 36 * HOUR && p.gracePeriodMs === 0; })(), "freshness policy");

  // ---- Adapter response parsing ----
  add("CME-4: valid response → ok (score, observedAt, provider classification captured)", (() => { const r = parse(cmcResp([rec(SEC, 12, "Extreme Fear")])); return r.ok && r.result!.score === 12 && r.result!.providerClassification === "Extreme Fear" && r.result!.observedAt === new Date(GEN).toISOString(); })(), "valid parse");
  add("CME-5: latest observation selected by timestamp (order-independent)", (() => { const r = parse(cmcResp([rec(SEC - 172800, 90, "Extreme Greed"), rec(SEC, 12, "Extreme Fear"), rec(SEC - 86400, 50, "Neutral")])); return r.ok && r.result!.score === 12 && r.result!.observedAt === new Date(GEN).toISOString(); })(), "latest select");
  add("CME-6: empty data → error", !parse(cmcResp([])).ok && parse(cmcResp([])).errors.includes("empty_data"), "empty");
  add("CME-7: provider status error → error", !parse(cmcResp([rec(SEC, 12, "Fear")], 1001)).ok, "status err");
  add("CME-8: malformed JSON (non-object / missing data) → error", !parse(null).ok && !parse(42).ok && !parse({ status: { error_code: 0 } }).ok, "malformed");
  add("CME-9: records with invalid/missing timestamp skipped; all invalid → no_valid_observation", (() => { const good = parse(cmcResp([rec(SEC, 12, "Fear"), { value: 50 }, { timestamp: "abc", value: 50 }])); const none = parse(cmcResp([{ value: 50 }, { timestamp: "abc", value: 50 }])); return good.ok && good.result!.score === 12 && !none.ok && none.errors.includes("no_valid_observation"); })(), "ts filter");
  add("CME-10: score 0/100/fractional valid; negative/>100/NaN rejected", parse(cmcResp([rec(SEC, 0, "Extreme Fear")])).ok && parse(cmcResp([rec(SEC, 100, "Extreme Greed")])).ok && parse(cmcResp([rec(SEC, 24.9, "Extreme Fear")])).ok && !parse(cmcResp([rec(SEC, -1, "x")])).ok && !parse(cmcResp([rec(SEC, 101, "x")])).ok && !parse(cmcResp([rec(SEC, "abc", "x")])).ok, "score valid");
  add("CME-11: provider classification is evidence only — canonical band recomputed, mismatch does not change band", (() => { const r = okResult(12, "Greed"); const b = buildCache(r); return b.ok && b.cache!.band === "extreme_fear" && b.providerBandMismatch === true && b.cache!.evidence.some((e) => e.includes("provider_classification_mismatch")); })(), "provider evidence");
  add("CME-12: providerClassificationToBand maps the five labels; unknown → null", providerClassificationToBand("Extreme Fear") === "extreme_fear" && providerClassificationToBand("Greed") === "greed" && providerClassificationToBand("nonsense") === null, "class map");

  // ---- Freshness / validUntil ----
  add("CME-13: validUntil = observedAt + 36h", (() => { const c = validCache(); return Date.parse(c.validUntil!) - Date.parse(c.observedAt) === 36 * HOUR; })(), "validUntil");
  add("CME-14: observedAt current → full; exactly 36h → full; 36h+1s → excluded_stale; observedAt-only governs", (() => { const at = (ageMs: number) => buildCache(okResult(12, "Extreme Fear", (GEN - ageMs) / 1000)).cache!; const fresh = loadFrom(at(0)).assessment.overallReadiness; const edge = loadFrom(at(36 * HOUR)).assessment.overallReadiness; const stale = loadFrom(at(36 * HOUR + 1000)).assessment.overallReadiness; return fresh === "full" && edge === "full" && stale === "excluded_market_stale"; })(), "age boundary");
  add("CME-15: retrievedAt recent but observedAt stale → excluded (retrievedAt is never a freshness shortcut)", (() => { const r = okResult(12, "Extreme Fear", (GEN - 48 * HOUR) / 1000); const c = buildCache(r).cache!; return loadFrom(c).assessment.overallReadiness === "excluded_market_stale"; })(), "observedAt governs");
  add("CME-16: future observedAt → unresolved (not fresh)", (() => { const r = parse(cmcResp([rec(SEC + 3600, 12, "Extreme Fear")]), GEN + 7200000); const c = buildCache(r.result!).cache!; return loadFrom(c, GEN).assessment.overallReadiness === "unresolved"; })(), "future observedAt");

  // ---- Cache publish decision (last-known-valid) ----
  const newer = { observedAt: new Date(GEN).toISOString(), score: 12, band: "extreme_fear" as const };
  const older = { observedAt: new Date(GEN - 86400000).toISOString(), score: 50, band: "neutral" as const };
  add("CME-17: no existing cache → publish", resolveCachePublishDecision(null, newer).action === "publish", "publish new");
  add("CME-18: newer observation → publish", resolveCachePublishDecision(older, newer).action === "publish", "publish newer");
  add("CME-19: older observation than cache → skip_older (preserve newer cache)", resolveCachePublishDecision(newer, older).action === "skip_older", "skip older");
  add("CME-20: same observation, equivalent content → skip_idempotent (no churn)", resolveCachePublishDecision(newer, { ...newer }).action === "skip_idempotent", "idempotent");
  add("CME-21: same observedAt, changed content → publish", resolveCachePublishDecision(newer, { ...newer, score: 20 }).action === "publish", "changed content");

  // ---- Cache build + validation ----
  add("CME-22: build valid cache → ok, canonical band, retrieval state retrieved_current_refresh, evidence present", (() => { const b = buildCache(okResult()); return b.ok && b.cache!.band === "extreme_fear" && b.cache!.retrievalState === "retrieved_current_refresh" && b.cache!.evidence.length > 0; })(), "build");
  add("CME-23: build rejects an unclassifiable score", buildMarketConditionCacheFromAdapterResult({ ...okResult(), score: 150 }, { generatedAtMs: GEN }).ok === false, "build reject");

  // ---- Production loader ----
  add("CME-24: missing cache (null) → status missing, assessment excluded_market_unavailable", (() => { const r = loadFrom(null); return r.status === "missing" && r.assessment.overallReadiness === "excluded_market_unavailable"; })(), "missing");
  add("CME-25: malformed cache → status malformed, assessment blocked", (() => { const r = loadFrom({ cacheVersion: "nope", sourceId: "" }); return r.status === "malformed" && r.assessment.overallReadiness === "blocked_invalid_score" && r.assessment.componentAvailability === "blocked"; })(), "malformed");
  add("CME-26: valid fresh cache → status loaded, assessment full (stable 20 for EF)", (() => { const r = loadFrom(validCache()); return r.status === "loaded" && r.assessment.overallReadiness === "full" && r.assessment.marketStableTargetPct === 20; })(), "loaded full");
  add("CME-27: valid stale cache → loaded but excluded (NOT blocked, NOT relabeled fresh)", (() => { const c = buildCache(okResult(12, "Extreme Fear", (GEN - 48 * HOUR) / 1000)).cache!; const r = loadFrom(c); return r.status === "loaded" && r.assessment.overallReadiness === "excluded_market_stale" && r.assessment.marketStableTargetPct === null; })(), "loaded stale");

  // ---- Assessment end-to-end + no Neutral fallback ----
  add("CME-28: fresh CMC bands → full market stable 20/35/50/65/80", (() => { const at = (score: number, cls: string) => loadFrom(buildCache(okResult(score, cls)).cache!).assessment.marketStableTargetPct; return at(12, "Extreme Fear") === 20 && at(30, "Fear") === 35 && at(55, "Neutral") === 50 && at(65, "Greed") === 65 && at(82, "Extreme Greed") === 80; })(), "bands full");
  add("CME-29: no Neutral fallback — missing/malformed/stale never yield a 50 market component", loadFrom(null).assessment.marketStableTargetPct === null && loadFrom({ bad: 1 }).assessment.marketStableTargetPct === null && loadFrom(buildCache(okResult(12, "Extreme Fear", (GEN - 48 * HOUR) / 1000)).cache!).assessment.marketStableTargetPct === null, "no neutral");

  // ---- Security / privacy ----
  add("CME-30: adapter result + cache carry NO api key / headers / raw payload (only rawPayloadVersion tag)", (() => { const c = JSON.stringify(validCache()); const r = JSON.stringify(okResult()); return !/apiKey|X-CMC|authorization|headers|rawPayload"|api_key/i.test(c + r) && validCache().rawPayloadVersion != null; })(), "no secrets in cache");
  add("CME-31: provider adapter uses X-CMC_PRO_API_KEY header (not query param), key is server-only (no VITE_)", (() => { const s = readIfSrc("scripts/providers/coinmarketcapFearGreedProvider.mjs"); return /X-CMC_PRO_API_KEY/.test(s) && !/apikey=|api_key=|CMC_PRO_API_KEY=/.test(s) && !/VITE_COINMARKETCAP/.test(s); })(), "auth header");
  add("CME-32: refresh script reads COINMARKETCAP_API_KEY (server env), never logs/writes it, guards VITE_ leak", (() => { const s = readIfSrc("scripts/refresh-market-conditions.mjs"); return /process\.env\.COINMARKETCAP_API_KEY/.test(s) && /VITE_COINMARKETCAP_API_KEY/.test(s) && !/console\.(log|error)\([^)]*apiKey/.test(s); })(), "key hygiene");
  add("CME-33: .env.example documents COINMARKETCAP_API_KEY WITHOUT a VITE_ prefix and with no value", (() => { const s = readIfSrc(".env.example"); return /\nCOINMARKETCAP_API_KEY=\s*(\n|$)/.test(s) && !/VITE_COINMARKETCAP_API_KEY=/.test(s); })(), "env example");

  // ---- Regression: still non-mounted, production risk-only ----
  add("CME-34: CMC adapter + loader imported by NOTHING in the mounted engine/rail/React", (() => { const files = ["src/suggestions/engine.ts", "src/suggestions/onTrackAssessment.ts", "src/components/SuggestionCard.tsx"]; return files.every((f) => !/coinmarketcapFearGreed|marketConditionCacheLoader|targetAllocationAssessment/.test(readIfSrc(f))); })(), "non-mounted");
  add("CME-35: no CoinMarketCap fetch in engine/React (adapter fetch lives only in the offline provider script)", (() => { const engine = readIfSrc("src/suggestions/coinmarketcapFearGreed.ts") + readIfSrc("src/suggestions/marketConditionCacheLoader.ts"); return !/fetch\(|pro-api\.coinmarketcap|X-CMC_PRO_API_KEY/.test(engine); })(), "no client fetch");
  add("CME-36: /latest object response (single data object, update_time ISO) parses; observedAt from update_time", (() => { const upd = new Date(GEN - HOUR).toISOString(); const r = parseCoinMarketCapFearGreedResponse({ status: { error_code: 0, error_message: null }, data: { value: 39, update_time: upd, value_classification: "Fear" } }, { retrievedAtMs: GEN }); return r.ok && r.result!.score === 39 && r.result!.observedAt === upd && r.result!.rawPayloadVersion === "cmc_v3_fear_and_greed_latest_1" && loadFrom(buildCache(r.result!).cache!).assessment.overallReadiness === "full"; })(), "latest shape");

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 22F (slice 1) — CANONICAL TARGET ADAPTER (non-mounted). Validates that `buildCanonicalTargetAllocation`
 * reads the five-factor assessment into the mounted target shape without reconstructing the calculation:
 * targetCrypto = finalVolatile, targetStable = finalStable, dollars = pct × denominator, full/degraded usable,
 * unavailable/blocked/unresolved → null (no risk-only fallback), readiness + market-exclusion metadata carried.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Step 22F (slice 1) — CANONICAL TARGET ADAPTER (non-mounted). Validates that `buildCanonicalTargetAllocation`
 * reads the five-factor assessment into the mounted target shape without reconstructing the calculation:
 * targetCrypto = finalVolatile, targetStable = finalStable, dollars = pct × denominator, full/degraded usable,
 * unavailable/blocked/unresolved → null (no risk-only fallback), readiness + market-exclusion metadata carried.
 * ------------------------------------------------------------------ */
export function runCanonicalTargetAdapterFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const readIfSrc = (rel: string) => { try { return readFileSync(`${process.cwd()}/${rel}`, "utf8"); } catch { return ""; } };
  const GEN = 1_700_000_000_000;
  const iso = (ms: number) => new Date(ms).toISOString();
  const cmcObs = (score: number, band: MarketConditionObservation["band"]): MarketConditionObservation => ({ sourceId: "coinmarketcap_crypto_fear_greed", indexId: "cmc_crypto_fear_greed", indexName: "CMC Crypto Fear & Greed Index", methodology: "cmc_crypto_fear_greed_composite", methodologyVersion: "cmc_fng_methodology_2026_1", rawScore: score, normalizedScore: score, band, observedAt: iso(GEN - 3_600_000), retrievedAt: iso(GEN), validUntil: null, retrievalState: "cached", sourceFreshnessState: "unresolved", sourcePolicyState: "unresolved", evidence: ["cmc"] });
  const mkt = (o: MarketConditionObservation | null, fresh = MARKET_CONDITION_FRESHNESS_POLICIES) => deriveMarketConditionAssessment({ observation: o, sourcePolicies: MARKET_CONDITION_SOURCES, freshnessPolicies: fresh, generatedAt: GEN });
  const taa = (over: Partial<Parameters<typeof deriveTargetAllocationAssessment>[0]> = {}) => deriveTargetAllocationAssessment({ riskTolerance: "medium", timeline: "5_years", financialGoal: "build_long_term_wealth", monthlyIncomeUsd: 4000, monthlyExpensesUsd: 1000, marketConditionAssessment: mkt(cmcObs(12, "extreme_fear")), generatedAt: GEN, ...over });
  const approx = (a: number | null, b: number) => a != null && Math.abs(a - b) < 1e-9;

  add("CTA-1: full → targetStable=finalStable(35), targetCrypto=finalVolatile(65), dollars=pct×denom, confidence full", (() => { const a = taa(); const c = buildCanonicalTargetAllocation(a, { totalPricedUsd: 1000 }); return c != null && approx(c.targetStablePct, 35) && approx(c.targetCryptoPct, 65) && c.targetStablePct === a.finalStableTargetPct && c.targetCryptoPct === a.finalVolatileTargetPct && approx(c.targetStableUsd, 350) && approx(c.targetCryptoUsd, 650) && c.targetConfidence === "full" && c.marketExcluded === false; })(), "full");
  add("CTA-2: no/invalid denominator → dollar fields null, percentages stand", (() => { const c = buildCanonicalTargetAllocation(taa(), { totalPricedUsd: null }); const z = buildCanonicalTargetAllocation(taa(), { totalPricedUsd: 0 }); return c != null && c.targetStableUsd === null && c.targetCryptoUsd === null && approx(c.targetStablePct, 35) && z != null && z.targetStableUsd === null; })(), "no denom");
  add("CTA-3: degraded (market null) → usable target 36.667/63.333, marketExcluded true + reason, no market adjustment", (() => { const a = taa({ marketConditionAssessment: null }); const c = buildCanonicalTargetAllocation(a, { totalPricedUsd: 1000 }); return c != null && approx(c.targetStablePct, 33 / 0.9) && c.targetConfidence === "degraded_market_excluded" && c.marketExcluded === true && c.marketExclusionReason != null && c.marketAdjustmentVsProfileOnlyPct === null; })(), "degraded");
  add("CTA-4: unavailable (missing risk) → null (no risk-only fallback)", buildCanonicalTargetAllocation(taa({ riskTolerance: null }), { totalPricedUsd: 1000 }) === null, "unavailable null");
  add("CTA-5: blocked (unsupported enum) → null", buildCanonicalTargetAllocation(taa({ financialGoal: "fame" }), { totalPricedUsd: 1000 }) === null, "blocked null");
  add("CTA-6: unresolved (market unresolved via missing freshness policy) → null", buildCanonicalTargetAllocation(taa({ marketConditionAssessment: mkt(cmcObs(12, "extreme_fear"), []) }), { totalPricedUsd: 1000 }) === null, "unresolved null");
  add("CTA-7: readiness passthrough — full → rebalance/dca/onTrack true; degraded → onTrack false", (() => { const full = buildCanonicalTargetAllocation(taa())!; const deg = buildCanonicalTargetAllocation(taa({ marketConditionAssessment: null }))!; return full.rebalanceTargetEligible && full.dcaTargetEligible && full.onTrackTargetEligible && deg.rebalanceTargetEligible && deg.dcaTargetEligible && deg.onTrackTargetEligible === false; })(), "readiness");
  add("CTA-8: adapter reconstructs nothing (reads assessment; no matrix/weight literals) + non-mounted by OnTrack/engine/recommendedAllocation (Rebalance slice 3, DCA/contribution slice 4 consume it)", (() => { const s = readIfSrc("src/suggestions/canonicalTargetAllocation.ts"); const noRecompute = !/RISK_STABLE_TARGET_PCT|FACTOR_WEIGHTS|0\.35|classifyMarketConditionScore/.test(s); const nonMounted = ["src/suggestions/engine.ts", "src/suggestions/onTrackAssessment.ts", "src/wallet/recommendedAllocation.ts"].every((f) => !/canonicalTargetAllocation/.test(readIfSrc(f))); return noRecompute && nonMounted; })(), "pure+non-mounted");

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 22F (slice 2) — RAIL TARGET CONTEXT (shared plumbing, not yet consumed). Validates that a rail refresh derives
 * exactly ONE MarketConditionAssessment + ONE TargetAllocationAssessment + ONE canonical target from the published
 * cache + profile, maps every cache-ingestion state correctly (loading/failed → unresolved; missing → excluded;
 * malformed → blocked; loaded → full/stale by observedAt), NEVER falls back to risk-only, keeps Demo isolated, and
 * exposes no market score to downstream. The component-layer hook reads only the same-origin artifact (no provider/key).
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Step 22F (slice 2) — RAIL TARGET CONTEXT (shared plumbing, not yet consumed). Validates that a rail refresh derives
 * exactly ONE MarketConditionAssessment + ONE TargetAllocationAssessment + ONE canonical target from the published
 * cache + profile, maps every cache-ingestion state correctly (loading/failed → unresolved; missing → excluded;
 * malformed → blocked; loaded → full/stale by observedAt), NEVER falls back to risk-only, keeps Demo isolated, and
 * exposes no market score to downstream. The component-layer hook reads only the same-origin artifact (no provider/key).
 * ------------------------------------------------------------------ */
export function runRailTargetContextFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const readIfSrc = (rel: string) => { try { return readFileSync(`${process.cwd()}/${rel}`, "utf8"); } catch { return ""; } };
  const GEN = 1_700_000_000_000;
  const iso = (ms: number) => new Date(ms).toISOString();
  const goal: SavedGoal = { financial_goal: "build_long_term_wealth", risk_tolerance: "medium", timeline: "5_years", contribution_frequency: "monthly", income_monthly: 4000, expenses_monthly: 1000, monthly_saving_goal: 1000 };
  const cache = (over: Record<string, unknown> = {}) => ({ cacheVersion: MARKET_CONDITION_CACHE_VERSION, generatedAt: iso(GEN), sourceId: "coinmarketcap_crypto_fear_greed", indexId: "cmc_crypto_fear_greed", indexName: "CMC Crypto Fear & Greed Index", methodology: "cmc_crypto_fear_greed_composite", methodologyVersion: "cmc_fng_methodology_2026_1", score: 12, band: "extreme_fear", observedAt: iso(GEN - 3_600_000), retrievedAt: iso(GEN), validUntil: null, retrievalState: "cached", evidence: ["cmc"], ...over });
  const ctx = (cacheState: Parameters<typeof buildRailTargetContext>[0]["cacheState"], cacheInput: unknown | null, over: Partial<SavedGoal> = {}) =>
    buildRailTargetContext({ goal: { ...goal, ...over }, cacheInput, cacheState, generatedAt: GEN, totalPricedUsd: 1000 });

  // ---- One computation per refresh + fresh loaded → full ----
  add("RTC-1: loaded fresh cache → one market(full) + one target(full) + non-null canonical (stable 35/crypto 65), state loaded", (() => { const c = ctx("loaded", cache()); return c.marketConditionAssessment.overallReadiness === "full" && c.targetAllocationAssessment.targetConfidence === "full" && c.canonicalTargetAllocation != null && c.canonicalTargetAllocation.targetStablePct === 35 && c.canonicalTargetAllocation.targetCryptoPct === 65 && c.targetLoadingState === "loaded" && c.targetGeneratedAt === GEN; })(), "loaded full");
  add("RTC-2: single generatedAt reused across market + target", (() => { const c = ctx("loaded", cache()); return c.marketConditionAssessment.generatedAt === GEN && c.targetAllocationAssessment.generatedAt === GEN && c.targetGeneratedAt === GEN; })(), "one generatedAt");

  // ---- Missing / stale → excluded market → degraded target (usable) ----
  add("RTC-3: missing cache → excluded_market_unavailable + degraded target + non-null canonical, state missing", (() => { const c = ctx("missing", null); return c.marketConditionAssessment.overallReadiness === "excluded_market_unavailable" && c.targetAllocationAssessment.targetConfidence === "degraded_market_excluded" && c.canonicalTargetAllocation != null && c.canonicalTargetAllocation.marketExcluded === true && c.targetLoadingState === "missing"; })(), "missing degraded");
  add("RTC-4: stale cache → excluded_market_stale + degraded target + non-null canonical, state stale, no stale score in canonical", (() => { const c = ctx("loaded", cache({ observedAt: iso(GEN - 48 * 3_600_000) })); return c.marketConditionAssessment.overallReadiness === "excluded_market_stale" && c.targetAllocationAssessment.targetConfidence === "degraded_market_excluded" && c.canonicalTargetAllocation != null && c.targetLoadingState === "stale" && !("score" in (c.canonicalTargetAllocation as object)) && !("marketStableTargetPct" in (c.canonicalTargetAllocation as object)); })(), "stale degraded");

  // ---- Malformed → blocked → null canonical ----
  add("RTC-5: malformed cacheState → blocked market → blocked target → null canonical, state malformed", (() => { const c = ctx("malformed", null); return c.marketConditionAssessment.overallReadiness === "blocked_invalid_score" && c.targetAllocationAssessment.targetConfidence === "blocked" && c.canonicalTargetAllocation === null && c.targetLoadingState === "malformed"; })(), "malformed blocked");
  add("RTC-6: loaded-but-malformed cache content → blocked target → null canonical", (() => { const c = ctx("loaded", { garbage: true }); return c.targetAllocationAssessment.targetConfidence === "blocked" && c.canonicalTargetAllocation === null; })(), "loaded malformed");

  // ---- Loading / failed → unresolved → null canonical, NO risk-only fallback ----
  add("RTC-7: loading → unresolved market → unresolved target → null canonical (no risk-only), state loading", (() => { const c = ctx("loading", null); return c.marketConditionAssessment.overallReadiness === "unresolved" && c.targetAllocationAssessment.targetConfidence === "unresolved" && c.canonicalTargetAllocation === null && c.targetLoadingState === "loading"; })(), "loading unresolved");
  add("RTC-8: failed → unresolved market → null canonical, state failed", (() => { const c = ctx("failed", null); return c.marketConditionAssessment.overallReadiness === "unresolved" && c.canonicalTargetAllocation === null && c.targetLoadingState === "failed"; })(), "failed unresolved");

  // ---- Profile-missing (non-market) → target unavailable → null canonical ----
  add("RTC-9: missing risk/horizon/goal/income/expenses (fresh cache) → target unavailable → null canonical", (() => { const risk = ctx("loaded", cache(), { risk_tolerance: "" as unknown as string }); const noIncome = buildRailTargetContext({ goal: { ...goal, income_monthly: null as unknown as number }, cacheInput: cache(), cacheState: "loaded", generatedAt: GEN, totalPricedUsd: 1000 }); return risk.canonicalTargetAllocation === null && noIncome.targetAllocationAssessment.targetConfidence === "unavailable" && noIncome.canonicalTargetAllocation === null; })(), "profile unavailable");

  // ---- Deterministic + no direct market-score exposure downstream ----
  add("RTC-10: deterministic (same inputs → identical canonical) + canonical exposes NO market score/band", (() => { const a = ctx("loaded", cache()).canonicalTargetAllocation!; const b = ctx("loaded", cache()).canonicalTargetAllocation!; return a.targetStablePct === b.targetStablePct && a.targetConfidence === b.targetConfidence && !("score" in a) && !("band" in a) && !("marketScore" in a); })(), "deterministic + no score");

  // ---- Demo isolation + no consumption yet (deriveRailSuggestions) ----
  add("RTC-11 (slice 7): targetContext builds whenever a market cache state is provided (any mode); a caller with no cache state gets no context", (() => { const railSrc = readIfSrc("src/suggestions/useRailSuggestions.ts"); return /const targetContext: RailTargetContext \| undefined =\s*\n\s*args\.marketConditionsCacheState !== undefined\s*\n\s*\? buildRailTargetContext/.test(railSrc); })(), "context on cache");

  // ---- Security + non-fetching + legacy untouched ----
  add("RTC-12: cache hook reads ONLY the same-origin artifact — no CoinMarketCap / key / VITE_ / provider endpoint", (() => { const s = readIfSrc("src/suggestions/useMarketConditionsCache.ts"); return /\/generated\/market-conditions-cache\.json/.test(s) && !/pro-api\.coinmarketcap|X-CMC_PRO_API_KEY|COINMARKETCAP_API_KEY|VITE_/.test(s) && /AbortController/.test(s) && /cancelled/.test(s); })(), "hook same-origin");
  add("RTC-13: pure railTargetContext + engine never fetch; no risk-only import in the canonical path", (() => { const rtc = readIfSrc("src/suggestions/railTargetContext.ts"); return !/fetch\(|deriveRecommendedAllocation|RISK_TARGET_ALLOCATION/.test(rtc); })(), "pure non-fetch");
  add("RTC-14 (slice 7D): the legacy risk-only allocation is REMOVED from the rail — no deriveRecommendedAllocation / deriveAllocationDeltas; the canonical RebalanceAssessment remains", (() => { const railSrc = readIfSrc("src/suggestions/useRailSuggestions.ts"); return !/deriveRecommendedAllocation/.test(railSrc) && !/deriveAllocationDeltas/.test(railSrc) && /deriveRebalanceAssessment\(/.test(railSrc); })(), "legacy removed");
  add("RTC-15: canonical target not yet consumed by OnTrack/engine (Rebalance mounts it in slice 3, DCA/contribution in slice 4)", (() => { const files = ["src/suggestions/onTrackAssessment.ts", "src/suggestions/engine.ts"]; return files.every((f) => !/targetContext|canonicalTargetAllocation|buildRailTargetContext/.test(readIfSrc(f))); })(), "not consumed");
  add("RTC-16: mapCacheStateToMarketAssessment covers all five states without Neutral substitution", (() => { const states = ["loading", "failed", "missing", "malformed", "loaded"] as const; return states.every((st) => { const m = mapCacheStateToMarketAssessment(st, st === "loaded" ? cache() : null, GEN); return m.marketStableTargetPct === (st === "loaded" ? 20 : null); }); })(), "state map");

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 22F (slice 3) — REBALANCE CANONICAL MOUNT. Validates that Rebalance consumes the canonical five-factor target
 * (no deriveRecommendedAllocation, no RISK_TARGET_ALLOCATION), that full/degraded targets are eligible while
 * unavailable/blocked/unresolved/loading fail closed (no risk-only fallback), that thresholds/direction/mapping are
 * unchanged, that the review discloses full/degraded honestly (transitional targets show no market copy), and that
 * no raw income/expenses/score/band leaks.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Step 22F (slice 5) — DASHBOARD CANONICAL TARGET MOUNT. Validates that the real-wallet dashboard allocation summary
 * consumes the SAME shared canonical target as Rebalance + DCA (via the rail's targetSummary), shows a safe state for
 * every non-usable target (loading/unresolved/unavailable/blocked → no legacy percentages, no risk-only flicker),
 * discloses a degraded (market-excluded) target minimally, adds no market score/band/attribution (Slice-6), and leaks
 * no raw income/expenses/cache. Demo/testing get no summary (existing display preserved).
 * ------------------------------------------------------------------ */
export function runDashboardTargetMountFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const readIfSrc = (rel: string) => { try { return readFileSync(`${process.cwd()}/${rel}`, "utf8"); } catch { return ""; } };
  const P = Date.parse("2026-07-01T00:00:00.000Z");
  const iso = (ms: number) => new Date(ms).toISOString();
  const cacheAt = (observedMsAgo: number) => ({ cacheVersion: MARKET_CONDITION_CACHE_VERSION, generatedAt: iso(P), sourceId: "coinmarketcap_crypto_fear_greed", indexId: "cmc_crypto_fear_greed", indexName: "CMC Crypto Fear & Greed Index", methodology: "cmc_crypto_fear_greed_composite", methodologyVersion: "cmc_fng_methodology_2026_1", score: 12, band: "extreme_fear", observedAt: iso(P - observedMsAgo), retrievedAt: iso(P), validUntil: null, retrievalState: "cached", evidence: ["cmc"] });
  const goal = { financial_goal: "build_long_term_wealth", risk_tolerance: "medium", timeline: "5_years", contribution_frequency: "monthly", income_monthly: 4000, expenses_monthly: 1000, monthly_saving_goal: 1000 } as unknown as SavedGoal;
  const usdc = (v: number) => ({ id: "u", source: "wallet", type: "token", symbol: "USDC", name: "USD Coin", detection: "direct_wallet_balance", valueUsd: v, uiAmount: v, priceUsd: 1 } as unknown as WalletPosition);
  const sol = (v: number) => ({ id: "s", source: "wallet", type: "native", symbol: "SOL", name: "Solana", detection: "direct_wallet_balance", valueUsd: v, uiAmount: v / 150, priceUsd: 150 } as unknown as WalletPosition);
  const positions = [usdc(6000), sol(4000)];
  const railFull = SY_deriveRail({ positions, pricedAsOf: P, goal, marketConditionsCacheInput: cacheAt(3_600_000), marketConditionsCacheState: "loaded", targetGeneratedAt: P });
  const railDegraded = SY_deriveRail({ positions, pricedAsOf: P, goal, marketConditionsCacheInput: cacheAt(200 * 3_600_000), marketConditionsCacheState: "loaded", targetGeneratedAt: P }); // 200h stale → market excluded
  const railLoading = SY_deriveRail({ positions, pricedAsOf: P, goal, marketConditionsCacheState: "loading", targetGeneratedAt: P });
  const railNoCache = SY_deriveRail({ positions, pricedAsOf: P, goal });
  const railDemo = SY_deriveRail({ positions, pricedAsOf: P, goal, dataMode: "demo_fixture" });

  add("DSH-1: real-wallet rail exposes targetSummary from the shared canonical target (state full, percentages present)", (() => { const t = railFull.targetSummary; return t != null && t.state === "full" && typeof t.targetCryptoPct === "number" && typeof t.targetStablePct === "number" && t.marketExcluded === false; })(), "full summary");
  add("DSH-2: dashboard target === the canonical target Rebalance+DCA consume (identical percentages; no independent value)", (() => { const t = railFull.targetSummary; const ct = railFull.targetContext?.canonicalTargetAllocation; return t != null && ct != null && t.targetCryptoPct === ct.targetCryptoPct && t.targetStablePct === ct.targetStablePct; })(), "consistency");
  add("DSH-3: STALE market → degraded (market-excluded) canonical target → targetSummary degraded_market_excluded + marketExcluded true + renormalized percentages present", (() => { const t = railDegraded.targetSummary; return t != null && t.state === "degraded_market_excluded" && t.marketExcluded === true && typeof t.targetCryptoPct === "number"; })(), "degraded summary");
  add("DSH-4: LOADING → targetSummary state loading, null percentages (loading treatment, no legacy)", (() => { const t = railLoading.targetSummary; return t != null && t.state === "loading" && t.targetCryptoPct === null && t.targetStablePct === null; })(), "loading");
  add("DSH-5: real-wallet WITHOUT a market cache → targetSummary fails closed (unresolved, null percentages, no risk-only fallback)", (() => { const t = railNoCache.targetSummary; return t != null && t.state === "unresolved" && t.targetCryptoPct === null && t.targetStablePct === null; })(), "fail closed");
  add("DSH-6: Demo/testing rail exposes NO targetSummary (dashboard keeps its existing display)", railDemo.targetSummary === undefined, "demo none");
  add("DSH-7: DashboardBody consumes targetSummary and does NOT call deriveRecommendedAllocation / RISK_TARGET_ALLOCATION / fetch the market cache", (() => { const s = readIfSrc("src/components/DashboardBody.tsx"); return /targetSummary/.test(s) && !/deriveRecommendedAllocation/.test(s) && !/RISK_TARGET_ALLOCATION/.test(s) && !/useMarketConditionsCache|market-conditions-cache/.test(s); })(), "no legacy");
  add("DSH-8: DashboardBody renders NO visible target-state caption below the allocation (removed); the loading/unavailable caption strings are gone and no card__caption carries a target-state constant", (() => { const s = readIfSrc("src/components/DashboardBody.tsx"); return !/ALLOCATION_TARGET_LOADING/.test(s) && !/ALLOCATION_TARGET_UNAVAILABLE/.test(s) && !/card__caption">\{ALLOCATION_(TARGET_CURRENT|MARKET_EXCLUDED)\}/.test(s); })(), "no target caption");
  add("DSH-9: dashboard target captions add NO market score/band/CoinMarketCap/observation-time (Slice-6 surface)", (() => { const c = readIfSrc("src/state/approvedCopy.ts"); const i = c.indexOf("ALLOCATION_TARGET_CURRENT ="); const block = i >= 0 ? c.slice(i, i + 400) : ""; return /Market data was excluded from this calculation/.test(block) && /All target-allocation inputs are current/.test(block) && !/CoinMarketCap|Fear|Greed|\/100|score|band|observ/i.test(block); })(), "no market UI");
  add("DSH-10: privacy — targetSummary carries no income/expenses/net cash flow/savings rate/market score/band/cache/key", (() => { const s = JSON.stringify(railFull.targetSummary); return !/income|expenses|net_?cash|savingsRate|"score"|"band"|cacheVersion|apiKey/i.test(s); })(), "privacy");
  add("DSH-11: display rounding only — targetSummary stores the raw canonical percentages (not pre-rounded)", (() => { const t = railFull.targetSummary; const ct = railFull.targetContext?.canonicalTargetAllocation; return t != null && ct != null && t.targetCryptoPct === ct.targetCryptoPct && t.targetStablePct === ct.targetStablePct; })(), "raw stored");

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 22F (slice 6) — DASHBOARD MARKET CONDITIONS SURFACE. Validates the ONE informational surface: it consumes the
 * minimum safe `marketSummary` (derived once from the shared MarketConditionAssessment), shows score/band/observedAt/
 * CoinMarketCap attribution ONLY in the full state, represents degraded/stale/unavailable/blocked/loading safely (no
 * stale score/band, no fake Neutral), discloses the 10% + not-a-buy/sell explanation, agrees with the allocation
 * summary, adds no direct market trigger / standalone candidate, uses observedAt (not retrievedAt), and leaks no
 * key/endpoint/payload/income/expenses. The band is the canonical supplied label (no UI thresholds).
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Allocation methodology tooltip + canonical band-boundary passthrough. Validates that the allocation methodology
 * tooltip is now ONE state-independent sentence (five inputs + "latest available market conditions" + planning-only
 * disclaimer), shown in every case including disconnected; that the honest "latest available" hedge avoids asserting
 * "current market conditions" or "market data was excluded"; that DashboardBody renders the single ALLOCATION_METHODOLOGY
 * (the prior state-aware derivation is removed); that the per-state allocation CARD captions stay state-aware; that the
 * surface passes the canonical production band through without UI reclassification; and that the Safety-Buffer copy is
 * untouched.
 * ------------------------------------------------------------------ */
export function runAllocationMethodologyCopyFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const readIfSrc = (rel: string) => { try { return readFileSync(`${process.cwd()}/${rel}`, "utf8"); } catch { return ""; } };
  const dashSrc = readIfSrc("src/components/DashboardBody.tsx");
  const copySrc = readIfSrc("src/state/approvedCopy.ts");

  // ---- One state-independent methodology tooltip (shown in every case, incl. disconnected) ----
  add("MCC-1: the single tooltip names the five inputs (risk, timeline, goal, cash flow, latest-available market conditions) + the planning-only disclaimer", /risk tolerance, timeline, financial goal, cash flow, and the latest available market conditions/.test(ALLOCATION_METHODOLOGY) && /For planning only, not financial advice\./.test(ALLOCATION_METHODOLOGY), "single tooltip");
  add("MCC-2: the tooltip uses the honest 'latest available' hedge — it does NOT assert 'current market conditions' were definitely used, and does NOT say 'market data was excluded'", /latest available market conditions/.test(ALLOCATION_METHODOLOGY) && !/\bcurrent market conditions\b/.test(ALLOCATION_METHODOLOGY) && !/Market data was excluded/i.test(ALLOCATION_METHODOLOGY), "honest hedge");
  add("MCC-3: DashboardBody renders the single ALLOCATION_METHODOLOGY in the allocation info popover — not the old state-aware derivation, not the legacy ALLOCATION_INFO_TEXT", /\{ALLOCATION_METHODOLOGY\}/.test(dashSrc) && !/deriveAllocationMethodologyCopy/.test(dashSrc) && !/\{ALLOCATION_INFO_TEXT\}/.test(dashSrc), "single wired");
  add("MCC-4: the prior state-aware methodology API is fully removed from approvedCopy (no deriveAllocationMethodologyCopy / _FULL / _DEGRADED / _LOADING)", !/deriveAllocationMethodologyCopy|ALLOCATION_METHODOLOGY_FULL|ALLOCATION_METHODOLOGY_DEGRADED|ALLOCATION_METHODOLOGY_LOADING/.test(copySrc), "state-aware removed");
  add("MCC-5: the visible per-state allocation caption below the chart is REMOVED (no card__caption target-state line); market-inclusion context survives only in the chart's screen-reader summary", !/card__caption">\{ALLOCATION_(TARGET_CURRENT|MARKET_EXCLUDED|TARGET_LOADING|TARGET_UNAVAILABLE)\}/.test(dashSrc) && /ALLOCATION_MARKET_EXCLUDED/.test(dashSrc), "caption removed");

  // ---- Band-boundary passthrough (UI never classifies) ----
  add("MCC-9: canonical band boundaries are proven at the ASSESSMENT level (MC-1: 24/25/49/50/59/60/74/75) — no duplicate UI threshold logic", (() => { const comp = readIfSrc("src/components/MarketConditionsSurface.tsx"); const fx = readIfSrc("src/suggestions/fixtures/targetAllocationMarket.fixtures.ts"); return /cls\(24\) === "extreme_fear" && cls\(25\) === "fear"/.test(fx) && !/score >=|score <|>= 25|>= 50|>= 60|>= 75/.test(comp); })(), "assessment boundaries");
  add("MCC-10: the surface passes the CANONICAL production band through for the boundary scores 60 → Greed and 75 → Extreme Greed (UI reads displayBand; MCS-6 proves no UI thresholds)", (() => { const P = Date.parse("2026-07-01T00:00:00.000Z"); const iso = (ms: number) => new Date(ms).toISOString(); const cache = (score: number, band: string) => ({ cacheVersion: MARKET_CONDITION_CACHE_VERSION, generatedAt: iso(P), sourceId: "coinmarketcap_crypto_fear_greed", indexId: "cmc_crypto_fear_greed", indexName: "CMC Crypto Fear & Greed Index", methodology: "cmc_crypto_fear_greed_composite", methodologyVersion: "cmc_fng_methodology_2026_1", score, band, observedAt: iso(P - 3_600_000), retrievedAt: iso(P), validUntil: null, retrievalState: "cached", evidence: ["cmc"] }); const goal = { financial_goal: "build_long_term_wealth", risk_tolerance: "medium", timeline: "5_years", contribution_frequency: "monthly", income_monthly: 4000, expenses_monthly: 1000, monthly_saving_goal: 1000 } as unknown as SavedGoal; const pos = [{ id: "u", source: "wallet", type: "token", symbol: "USDC", name: "USD Coin", detection: "direct_wallet_balance", valueUsd: 6000, uiAmount: 6000, priceUsd: 1 }, { id: "s", source: "wallet", type: "native", symbol: "SOL", name: "Solana", detection: "direct_wallet_balance", valueUsd: 4000, uiAmount: 26.7, priceUsd: 150 }] as unknown as WalletPosition[]; const m = (score: number, band: string) => SY_deriveRail({ positions: pos, pricedAsOf: P, goal, marketConditionsCacheInput: cache(score, band), marketConditionsCacheState: "loaded", targetGeneratedAt: P }).marketSummary; const g = m(60, "greed"); const eg = m(75, "extreme_greed"); return g?.score === 60 && g?.band === "greed" && g?.bandLabel === "Greed" && eg?.score === 75 && eg?.band === "extreme_greed" && eg?.bandLabel === "Extreme Greed"; })(), "band passthrough");

  // ---- Legitimate risk copy untouched ----
  add("MCC-11: the Safety-Buffer risk-based-months copy is unchanged (legitimately risk-based)", /Add your monthly expenses and risk tolerance to see your safety buffer target/.test(copySrc), "buffer copy kept");

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 22F (slice 7) — DETERMINISTIC DEMO MIGRATION. Validates that Demo consumes the PRODUCTION five-factor target
 * path via a deterministic governed market fixture (no real cache, no provider, no wall-clock, no risk-only
 * transitional target): one full MarketConditionAssessment (Fear 39), one canonical target, the same shared target for
 * the dashboard, a deterministic Market Conditions surface, and stable rerenders. Visible Demo cards are unchanged.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Step 22F (slice 7) — DETERMINISTIC DEMO MIGRATION. Validates that Demo consumes the PRODUCTION five-factor target
 * path via a deterministic governed market fixture (no real cache, no provider, no wall-clock, no risk-only
 * transitional target): one full MarketConditionAssessment (Fear 39), one canonical target, the same shared target for
 * the dashboard, a deterministic Market Conditions surface, and stable rerenders. Visible Demo cards are unchanged.
 * ------------------------------------------------------------------ */
export function runDemoMarketMigrationFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const readIfSrc = (rel: string) => { try { return readFileSync(`${process.cwd()}/${rel}`, "utf8"); } catch { return ""; } };
  const rail = buildDemoContributionRail();
  const rail2 = buildDemoContributionRail();
  const demoScenarioSrc = readIfSrc("src/suggestions/demoContributionScenario.ts");
  const demoMarketSrc = readIfSrc("src/suggestions/demoMarketConditions.ts");
  const demoPageSrc = readIfSrc("src/pages/DemoDashboardPage.tsx");

  add("DEMO7-1: Demo market summary is a full production assessment (Fear 39/100, CoinMarketCap, scope, marketIncluded)", (() => { const m = rail.marketSummary; return m != null && m.state === "full" && m.score === 39 && m.band === "fear" && m.bandLabel === "Fear" && m.sourceName === "CoinMarketCap" && m.scopeLabel === "Broad crypto-market sentiment" && m.marketIncluded === true; })(), "full fear");
  add("DEMO7-2: Demo target summary is the production canonical five-factor target (full, non-null percentages, not market-excluded)", (() => { const t = rail.targetSummary; return t != null && t.state === "full" && typeof t.targetCryptoPct === "number" && typeof t.targetStablePct === "number" && t.marketExcluded === false; })(), "canonical target");
  add("DEMO7-3: the SAME shared canonical target percentages back the dashboard target and the market summary confidence", (() => { return rail.targetSummary?.state === "full" && rail.marketSummary?.targetConfidence === "full"; })(), "one shared target");
  add("DEMO7-4: Demo is DETERMINISTIC — two builds produce byte-identical market + target summaries + cards", (() => { return JSON.stringify(rail.marketSummary) === JSON.stringify(rail2.marketSummary) && JSON.stringify(rail.targetSummary) === JSON.stringify(rail2.targetSummary) && JSON.stringify(rail.cards) === JSON.stringify(rail2.cards); })(), "deterministic");
  add("DEMO7-5: Demo observedAt is deterministic (fixed relative to a fixed generatedAt); no wall-clock / Date.now in the Demo market fixture", (() => { return /observedAt: iso\(generatedAtMs - 3_600_000\)/.test(demoMarketSrc) && !/Date\.now\(\)/.test(demoMarketSrc); })(), "deterministic clock");
  add("DEMO7-6: Demo passes a DETERMINISTIC governed cache to the production rail — no real cache fetch (no useMarketConditionsCache), no provider host", (() => { return /buildDemoMarketCacheInput\(DEMO_PRICED_AS_OF\)/.test(demoScenarioSrc) && /marketConditionsCacheState: DEMO_MARKET_CACHE_STATE/.test(demoScenarioSrc) && !/useMarketConditionsCache|pro-api|X-CMC|fetch\(/.test(demoScenarioSrc) && !/useMarketConditionsCache|pro-api|X-CMC|fetch\(/.test(demoMarketSrc); })(), "no real cache");
  add("DEMO7-7: Demo uses the CANONICAL path (marketSummary/targetSummary present ⇒ no risk-only transitional target)", (() => { return rail.marketSummary != null && rail.targetSummary != null && !/riskOnlyCanonicalTargetTransitional/.test(demoScenarioSrc); })(), "no transitional");
  add("DEMO7-8: the deterministic Demo market fixture uses the APPROVED CoinMarketCap source identity + methodology (production classifies the band)", (() => { return /sourceId: "coinmarketcap_crypto_fear_greed"/.test(demoMarketSrc) && /methodologyVersion: "cmc_fng_methodology_2026_1"/.test(demoMarketSrc); })(), "approved source");
  add("DEMO7-9: the standalone Market Conditions surface is REMOVED from the Demo dashboard (the Demo rail still derives its deterministic market summary)", (() => { return !/MarketConditionsSurface/.test(demoPageSrc) && rail.marketSummary != null; })(), "demo surface removed");
  add("DEMO7-10: visible Demo card set is unchanged (Safety-Buffer-incomplete Demo still shows the buffer card, no market-driven card injected)", (() => { return rail.cards.some((c: { category?: string }) => c.category === "safety_buffer") && !rail.cards.some((c: { category?: string; id?: string }) => c.category === "market_conditions" || /fear|greed/i.test(c.id ?? "")); })(), "cards unchanged");

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 22F (slice 7B) — DEMO ALLOCATION-CHART CONSISTENCY + PRODUCTION `/testing` REBALANCE MIGRATION. Validates that
 * the Demo AllocationChart's recommended target is the shared canonical target (63.5/36.5, agreeing with the market
 * surface); that the reusable production scenario builder is deterministic + reuses production classification/freshness/
 * target; and that every visible `/testing` Rebalance card is derived through the production five-factor chain, with the
 * required Fear-toward-crypto, Greed-toward-stables, full/partial correction, and degraded market-excluded cases.
 * ------------------------------------------------------------------ */
