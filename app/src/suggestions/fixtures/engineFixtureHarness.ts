/**
 * engineFixtureHarness — THE shared fixture harness for the suggestion-engine
 * check suite: the fixture-only runSuggestionEngine wrapper (auto-supplies buffer +
 * On Track overrides), canonical input/position/goal builders, synthetic isolated
 * candidates, and the source-reading utilities used by architecture guards.
 * Extracted verbatim from suggestionEngine.fixtures.ts; every remaining check
 * function and every extracted domain file builds on these.
 */
import { KLEND_ADMIN_INSTRUCTIONS as IS_ADMIN_ALIAS, KAMINO_ADMIN_SCAN as IS_SCAN } from "../incidentSearchMethodology";

















import { type SafetyBufferCoverage } from "../../wallet/safetyBufferCoverage";

import { deriveSafetyBufferAssessment as sbAssess } from "../safetyBufferAssessment";

import { buildSafetyBufferCardFromAssessment } from "../bufferSuggestion";




import { TARGET_ALLOCATION_ASSESSMENT_VERSION } from "../targetAllocationAssessment";

import { type CanonicalTargetAllocation as RBCanonicalTarget } from "../canonicalTargetAllocation";

import type { RebalanceAssessment } from "../rebalanceAssessment";

// Step 17C.2 — source-backed binding: the INSTALLED KLend codegen decoder + config-update enum, so the
// block_ctoken_usage fixtures assert against deployed definitions (not a name-inferred assumption).
// Step 17D — Jupiter Lend USDC (jlUSDC) read-only existing-position detection.

// Step 17D.1 — Jupiter Lend share-accounting verification + applicability determination.
// Step 17E — Token-2022 transferability assessment + source binding to the installed spl-token library.
// Step 17F — native Solana stake lifecycle + decomposition.
// Step 17G — supported-LST underlying-SOL normalization.

// Step 17H — canonical portfolio-completeness result + decision gates.
import { completenessAllows as pcAllows } from "../../wallet/portfolioCompleteness";

// Step 17H.2 — pure UI selectors over the mounted completeness result.
// Step 18B — canonical Rebalance assessment (foundation for the replacement calculation; not yet mounted).
import { CANONICAL_USDC_MINT as RB_USDC } from "../rebalanceAssessment";








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

import type { SafetyBuffer } from "../../wallet/walletSummary";

import type { SavedGoal } from "../../types/goal";

import type { EngineSuggestion } from "../engineTypes";

import { buildSuggestionEngineInputs } from "../engineInputAdapter";

import { runSuggestionEngine as runSuggestionEngineRaw } from "../engine";

// Step 24A — asset-ownership registry + dedicated JUP staking modules (fixtures below).






import { deriveLegacyBucketRebalanceSuggestion as rbLegacyBucket } from "../rebalanceSuggestionLegacy";

import { buildPositionOptimizationCardFromAssessment as poBuildCard } from "../positionOptimizationSuggestion";

import { buildTrimCardFromAssessment as trimBuildCard } from "../trimSuggestion";

import { deriveTrimAssessment as trimAssess } from "../trimAssessment";

import { derivePositionOptimizationAssessment as poAssess } from "../positionOptimizationAssessment";



import { buildReviewDetails, usdMetric, pctMetric } from "../suggestionReviewDetails";

import { GUARDRAIL_STATUS_NOT_EVALUATED } from "../engineThresholds";


import { notApplicableProtocolSelection } from "../protocolSelection";








































































import { SUGGESTION_ENGINE_VERSION } from "../engineThresholds";

















import { buildContributionSafetyBufferSnapshot } from "../contributionSafetyBufferGate";
























































































export const KLEND_ADMIN = IS_ADMIN_ALIAS;

export const IS_RESULTS = IS_SCAN.results;

/** Step 22F (slice 7D) — EXPLICIT FIXED target for the Rebalance accounting/threshold/source-capacity fixtures (§6,
 * §15.B). These fixtures exercise drift / direction / materiality / accounting math, NOT target POLICY, so each one
 * visibly selects a fixed target by its crypto/stable split (the split each assertion was calibrated against). The
 * target is a hand-built MINIMAL `CanonicalTargetAllocation` tagged with the CANONICAL methodology — it does NOT call
 * `deriveRecommendedAllocation`, does NOT depend on the deleted `rebalanceTargetTransitional` helper, and never carries
 * the `transitional_risk_only` sentinel. A missing/unknown split → a null target (unresolved/unavailable) so the
 * "no usable target" fail-closed cases stay honest. This is the §6 "explicit minimal CanonicalTargetAllocation" path. */
export const RB_FIXTURE_TARGET_SPLIT: Record<string, { cryptoPct: number; stablePct: number }> = {
  very_low: { cryptoPct: 20, stablePct: 80 },
  low: { cryptoPct: 40, stablePct: 60 },
  medium: { cryptoPct: 60, stablePct: 40 },
  high: { cryptoPct: 80, stablePct: 20 },
  very_high: { cryptoPct: 90, stablePct: 10 },
};

export const rbFixedTarget = (split: string | undefined, priced = 1000) => {
  const pct = split ? RB_FIXTURE_TARGET_SPLIT[split] : undefined;
  if (!pct) return { targetAllocation: null as RBCanonicalTarget | null, targetState: (split === undefined ? "unresolved" : "unavailable") as import("../rebalanceAssessment").RebalanceTargetState };
  const denom = priced > 0 ? priced : null;
  const t: RBCanonicalTarget = {
    targetStablePct: pct.stablePct, targetCryptoPct: pct.cryptoPct,
    targetStableUsd: denom != null ? denom * (pct.stablePct / 100) : null,
    targetCryptoUsd: denom != null ? denom * (pct.cryptoPct / 100) : null,
    targetConfidence: "full", marketExcluded: false, marketExclusionReason: null, marketAdjustmentVsProfileOnlyPct: null,
    methodologyVersion: TARGET_ALLOCATION_ASSESSMENT_VERSION, policyVersion: "target_allocation_policy_v1",
    rebalanceTargetEligible: true, dcaTargetEligible: true, onTrackTargetEligible: true,
  };
  return { targetAllocation: t, targetState: "full" as import("../rebalanceAssessment").RebalanceTargetState };
};


/**
 * Step 21C — the mounted engine is now buffer-override-driven (no internal buffer rule). To keep the ~289 legacy
 * engine fixtures expressing intent via `bufferFixture(...)`, this fixture-only wrapper auto-derives the canonical
 * `bufferOverride` from `inputs.safetyBuffer` (reusing the PRODUCTION assessment + mapper over a synthesized
 * coverage) when the caller did not pass one. A `null` safetyBuffer yields NO override (engine fail-closes exactly
 * as before → missing_data). Callers may still pass an explicit `bufferOverride` (or `null` to force fail-closed).
 */
export function sbAssessmentFromInputs(inputs: Parameters<typeof runSuggestionEngineRaw>[0], generatedAt: number): ReturnType<typeof sbAssess> | null {
  const sb = inputs.safetyBuffer;
  if (!sb) return null;
  const coverageState = sb.coverageState ?? (sb.fullyFunded ? "complete" : "incomplete");
  const coverage: SafetyBufferCoverage = {
    requiredBufferUsd: sb.targetUsd,
    recognizedStableValueUsd: (sb.recognizedStableUsd ?? sb.stableUsd) + (sb.unresolvedStableUsd ?? 0),
    verifiedLiquidStableValueUsd: sb.stableUsd,
    delayedStableValueUsd: sb.delayedStableUsd ?? 0,
    unavailableStableValueUsd: sb.unavailableStableUsd ?? 0,
    unresolvedStableValueUsd: sb.unresolvedStableUsd ?? 0,
    hasUnknownUnresolvedMagnitude: false,
    shortfallUsd: Math.max(sb.targetUsd - sb.stableUsd, 0),
    coverageRatio: sb.targetUsd > 0 ? sb.stableUsd / sb.targetUsd : 1,
    fullyFunded: coverageState === "complete",
    coverageState,
    unresolvedReasons: sb.unresolvedReasons ?? [],
    sources: [],
  };
  const expenses = sb.targetMonths > 0 ? sb.targetUsd / sb.targetMonths : null;
  return sbAssess({ coverage, monthlyExpensesUsd: expenses, targetMonths: sb.targetMonths, generatedAt });
}

export function bufferOverrideFromInputs(inputs: Parameters<typeof runSuggestionEngineRaw>[0], generatedAt: number): Parameters<typeof runSuggestionEngineRaw>[8] | undefined {
  const a = sbAssessmentFromInputs(inputs, generatedAt);
  if (!a) return undefined; // fail-closed exactly like the pre-mount engine when no buffer summary exists
  return { candidate: buildSafetyBufferCardFromAssessment(a, generatedAt), bufferSatisfied: a.presentationState === "complete", blocksDownstream: a.presentationState !== "complete" };
}

/**
 * Step 21E — a fixture-only synthetic RebalanceAssessment from the fixture's bucket allocation + a passed material
 * flag. In production the rail uses the REAL `deriveRebalanceAssessment`; this only lets the ~289 legacy engine
 * fixtures express On Track intent via `allocationFixture(...)` / `rebalanceOverride.material` without rebuilding it.
 */
export function synthRebalanceAssessment(allocation: Parameters<typeof runSuggestionEngineRaw>[0]["allocation"], material: boolean): RebalanceAssessment {
  const delta = allocation?.cryptoDeltaPct ?? null;
  const direction = material ? "crypto_to_stables" : delta == null ? "unresolved" : delta >= 10 ? "crypto_to_stables" : delta <= -10 ? "stables_to_crypto" : "within_threshold";
  const calc = material ? "allowed" : allocation != null && delta != null ? "allowed" : "unresolved";
  return {
    currentCryptoPct: allocation?.currentCryptoPct ?? null,
    targetCryptoPct: allocation?.recommendedCryptoPct ?? null,
    cryptoDeltaPct: material ? 12 : delta,
    direction,
    calculationGate: { status: calc, reasons: [] },
    methodologyVersion: "rebalance_assessment_1.0.0",
    targetConfidence: "full", // Slice 5 — On Track requires full canonical confidence; the synthetic path is "full".
  } as unknown as RebalanceAssessment;
}

export function onTrackOverrideFromInputs(inputs: Parameters<typeof runSuggestionEngineRaw>[0], generatedAt: number, rebalanceOverride: Parameters<typeof runSuggestionEngineRaw>[5]): Parameters<typeof runSuggestionEngineRaw>[9] {
  return {
    safetyBufferAssessment: sbAssessmentFromInputs(inputs, generatedAt),
    rebalanceAssessment: synthRebalanceAssessment(inputs.allocation, rebalanceOverride?.material === true),
    portfolioCompleteness: null,
    materialSignals: [],
  };
}


/** Fixture-only wrapper: auto-supplies the canonical buffer + On Track overrides (unless the caller passes them). */
export function runSuggestionEngine(
  inputs: Parameters<typeof runSuggestionEngineRaw>[0],
  generatedAt: number = FIXTURE_GENERATED_AT,
  contribution: Parameters<typeof runSuggestionEngineRaw>[2] = null,
  stableYield: Parameters<typeof runSuggestionEngineRaw>[3] = null,
  gates: Parameters<typeof runSuggestionEngineRaw>[4] = undefined,
  rebalanceOverride: Parameters<typeof runSuggestionEngineRaw>[5] = undefined,
  trimOverride: Parameters<typeof runSuggestionEngineRaw>[6] = undefined,
  positionOptimizationOverride: Parameters<typeof runSuggestionEngineRaw>[7] = undefined,
  bufferOverride?: Parameters<typeof runSuggestionEngineRaw>[8] | null,
  onTrackOverride?: Parameters<typeof runSuggestionEngineRaw>[9] | null,
): ReturnType<typeof runSuggestionEngineRaw> {
  const bo = bufferOverride === undefined ? bufferOverrideFromInputs(inputs, generatedAt) : (bufferOverride ?? undefined);
  const oto = onTrackOverride === undefined ? onTrackOverrideFromInputs(inputs, generatedAt, rebalanceOverride) : (onTrackOverride ?? undefined);
  // Step 22F (slice 7D) / 22G — the legacy engine DCA opt-in and evaluator are DELETED. The engine's ONLY DCA source is
  // the canonical contribution plan (`planDca`) in every mode; a null plan yields NO DCA. Engine unit fixtures that need
  // a DCA candidate inject the STATIC test object `buildEngineFixtureDcaCandidate` (no financial evaluator).
  return runSuggestionEngineRaw(inputs, generatedAt, contribution, stableYield, gates, rebalanceOverride, trimOverride, positionOptimizationOverride, bo, oto);
}


/**
 * Step 18G/19C/19D — ISOLATED-REGRESSION helper. The engine no longer has any legacy Rebalance OR Trim
 * fallback (missing canonical input → no candidate). The pre-18G ordering / Top-Pick / review-detail fixtures
 * still need a Rebalance candidate present, so this helper reproduces the pre-18G default by building the
 * DEPRECATED legacy bucket-rebalance card and passing it as an explicit override. An OPTIONAL explicit Trim
 * candidate (built by the fixture, never by a production rule) may be supplied for Trim ordering tests. Used
 * ONLY by isolated fixtures — no mounted/Demo/testing-production path touches it.
 */
export function runEngineWithLegacyRebalance(
  inputs: Parameters<typeof runSuggestionEngine>[0],
  generatedAt: number,
  contribution: Parameters<typeof runSuggestionEngine>[2] = null,
  stableYield: Parameters<typeof runSuggestionEngine>[3] = null,
  gates: Parameters<typeof runSuggestionEngine>[4] = undefined,
  trimCandidate: import("../engineTypes").EngineSuggestion | null = null,
  poCandidate: import("../engineTypes").EngineSuggestion | null = null,
): ReturnType<typeof runSuggestionEngine> {
  const legacy = rbLegacyBucket(inputs, generatedAt);
  const card = legacy && pcAllows(gates, "rebalance") ? legacy : null;
  // 20D — the legacy Position Optimization rule is DELETED. Isolated engine ordering / Top-Pick / review-detail
  // fixtures inject an explicit fixture-only candidate via `poCandidate` (see
  // `buildSyntheticPositionOptimizationCandidateForFixture`); absent it, the engine emits NO Position
  // Optimization candidate (fail closed — exactly the mounted production contract).
  return runSuggestionEngine(inputs, generatedAt, contribution, stableYield, gates, { card, material: !!legacy }, trimCandidate ? { candidate: trimCandidate } : undefined, poCandidate ? { candidate: poCandidate } : undefined);
}


/**
 * Step 19D — a clearly-named FIXTURE-ONLY Trim candidate for isolated ordering / Top-Pick / review-detail
 * tests. It imports NO legacy calculation and reproduces NO financial eligibility logic: it runs the PRODUCTION
 * canonical assessment + mapper over a FIXED synthetic portfolio (one non-core token above the buffer) so the
 * resulting card carries the real contract (reviewDetails, guardrails, scores). `amountUsd` sets the candidate
 * total. Never reachable from production. Requires amountUsd ≥ $100 (else the mapper returns no card).
 */
export function synthTrimCandidate(amountUsd = 160): import("../engineTypes").EngineSuggestion {
  const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
  const positions: WalletPosition[] = [
    { id: "synth-usdc", source: "wallet", type: "token", symbol: "USDC", name: "USD Coin", mint: USDC_MINT, amount: "1000000000", uiAmount: 1000, decimals: 6, detection: "direct_wallet_balance", priceUsd: 1, valueUsd: 1000 },
    { id: "synth-tok", source: "wallet", type: "token", symbol: "TKsynth", name: "Token synth", mint: "SynthTrimMint", amount: String(Math.max(1, Math.round(amountUsd))), uiAmount: amountUsd, decimals: 0, detection: "direct_wallet_balance", priceUsd: 1, valueUsd: amountUsd },
  ];
  const card = trimBuildCard(trimAssess({ positions, requiredBufferUsd: 500, generatedAt: FIXTURE_GENERATED_AT }), FIXTURE_GENERATED_AT);
  if (!card) throw new Error("synthTrimCandidate requires amountUsd >= 100");
  return card;
}


/**
 * Step 20D — a clearly-named FIXTURE-ONLY Position Optimization candidate for isolated ordering / Top-Pick /
 * review-detail tests. It imports NO legacy calculation (the legacy rule is deleted) and reproduces NO
 * eligibility, accounting, APY, exposure-grouping, or trigger logic: it runs the PRODUCTION canonical
 * assessment + mapper over a FIXED synthetic single-position-concentration portfolio, so the resulting card
 * carries the real production contract (stable id/category, review_only, is_top_pick false, no execution CTA,
 * no wallet/account identity, real reviewDetails). `amountUsd` sets the flagged total. Never reachable from
 * production. The fixed portfolio always clears the concentration trigger, so a card is always produced.
 */
export function buildSyntheticPositionOptimizationCandidateForFixture(amountUsd = 1500): import("../engineTypes").EngineSuggestion {
  const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
  const JITOSOL = "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn";
  // Cash covers the $500 fixture buffer and stays ≤ the LST value so the LST clears the 50% concentration gate.
  const cash = Math.max(500, Math.min(amountUsd, 1000));
  const positions: WalletPosition[] = [
    { id: "synth-po-usdc", source: "wallet", type: "token", symbol: "USDC", name: "USD Coin", mint: USDC_MINT, amount: String(Math.round(cash * 1e6)), uiAmount: cash, decimals: 6, detection: "direct_wallet_balance", priceUsd: 1, valueUsd: cash },
    { id: "synth-po-lst", source: "jito", type: "lst", symbol: "JitoSOL", name: "Jito Staked SOL", mint: JITOSOL, amount: "1", uiAmount: 1, detection: "recognized_lst_mint", valueUsd: amountUsd, apy: 7, apyObservedAt: null },
  ];
  const card = poBuildCard(poAssess({ positions, requiredBufferUsd: 500, generatedAt: FIXTURE_GENERATED_AT }), FIXTURE_GENERATED_AT);
  if (!card) throw new Error("buildSyntheticPositionOptimizationCandidateForFixture requires a concentration-triggering portfolio");
  return card;
}


/**
 * Step 22G — a STATIC engine test object for the isolated engine ordering / Top-Pick / mapper / guardrail /
 * review-detail fixtures. It is NOT a financial evaluator: it computes no target, no eligibility, no direction, and no
 * amount — the caller passes an explicit `amountUsd`, and it returns a fixed, already-decided `dca` `EngineSuggestion`
 * (the same category/contract shape the engine sorts, maps, and guardrails). Never imported by mounted source, never
 * used by `/testing`. The legacy `deriveDcaSuggestion` evaluator it replaced is deleted.
 */
export const buildEngineFixtureDcaCandidate = (amountUsd = 450): import("../engineTypes").EngineSuggestion => {
  const guardrails: import("../engineTypes").SuggestionGuardrail[] = [
    { code: "pricing_available", status: "passed" },
    { code: "buffer_protection", status: "passed" },
    { code: "contribution_available", status: "passed" },
    { code: "allocation_gap", status: "passed" },
    { code: "token_selection", status: GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "cost_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "liquidity_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "slippage_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
  ];
  const protocolSelection = notApplicableProtocolSelection("selection_not_required");
  const reviewDetails = buildReviewDetails({
    category: "dca", actionKind: "review_only", guardrails, protocolSelection,
    metrics: [usdMetric("Planned monthly contribution", 1000), usdMetric("Crypto target gap", amountUsd), usdMetric("Suggested contribution to review", amountUsd), pctMetric("Crypto underweight", 3)],
    involvedAssets: [{ symbol: "Crypto", role: "target_bucket" }],
    calculations: [{ label: "Suggested contribution", formula: "min(monthly contribution, crypto target gap)", currentValue: 1000, targetValue: amountUsd, difference: amountUsd, unit: "USD" }],
  });
  return {
    id: "dca_core_exposure", category: "dca",
    reason_codes: ["crypto_underweight_for_dca", "planned_contribution_available", "gradual_entry_candidate"],
    title_key: "suggestion.dca.title", description_key: "suggestion.dca.description",
    action_kind: "review_only", is_actionable: true, is_top_pick: false,
    amount: { valueUsd: amountUsd, label: "Contribution to review" },
    to: { bucket: "crypto" }, // generic bucket — no token chosen
    protocolSelection, reviewDetails,
    scores: { impact: Math.min(amountUsd / 15000, 1), urgency: 0.3, efficiency: 0.45 },
    guardrails, engine_version: SUGGESTION_ENGINE_VERSION, timestamp: FIXTURE_GENERATED_AT,
  };
};

/**
 * Step 22G — an EXPLICIT TEST-ONLY crypto/stable allocation for the 15C/15D growth-target-allocation-policy and
 * DCA-minimum-policy fixtures. It is a fixed test input (NOT the deleted risk matrix, NOT a production target policy);
 * these fixtures exercise the growth/minimum policy machinery and only need some split to feed it. */
export const fxRiskTarget = (cryptoPct: number, stablePct: number, priced = 1000) => ({ cryptoPct, stablePct, cryptoUsd: (priced * cryptoPct) / 100, stableUsd: (priced * stablePct) / 100 });


/** Fixed timestamp so every fixture run is fully reproducible. */
export const FIXTURE_GENERATED_AT = 1_750_000_000_000;


/**
 * Step 14L: the read-only "Other protocols to review" section (approved mSOL) is an
 * INTENTIONAL alternative-to-review, so the generic core-suggestion leak guards strip
 * it before scanning. It has its own dedicated 14L checks; here we only verify the
 * core suggestion (card + selected protocol) leaks no OTHER candidate names.
 */
export function stripReviewAlternatives(rd: unknown): unknown {
  if (rd == null || typeof rd !== "object") return rd;
  const { otherProtocolsToReview, ...rest } = rd as Record<string, unknown>;
  void otherProtocolsToReview;
  return rest;
}


/** Minimal priced USDC wallet position (sample data for engine inputs only). */
export const positionsFixture: WalletPosition[] = [
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


export const goalFixture: SavedGoal = {
  financial_goal: "build_long_term_wealth",
  risk_tolerance: "medium",
  timeline: "10_plus_years",
  contribution_frequency: "monthly",
  income_monthly: 4000,
  expenses_monthly: 1000,
  monthly_saving_goal: 2000,
};


/** A derived Safety Buffer result (shape of deriveSafetyBuffer's output). */
export function bufferFixture(
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
export function allocationFixture(totalUsd: number, currentCryptoPct: number, cryptoDeltaPct: number) {
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
export function solPosition(
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
export function cryptoPosition(valueUsd = 100): WalletPosition {
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
export function nonCoreToken(symbol: string, valueUsd: number): WalletPosition {
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
export function lstPosition(symbol: string, uiAmount: number, price = 80): WalletPosition {
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
export function stablePosition(
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
export function yieldPosition(
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


export interface FixtureArgs {
  safetyBuffer: SafetyBuffer | null;
  anyUnpriced?: boolean;
  goal?: SavedGoal;
  totalUsd?: number;
  allocation?: ReturnType<typeof allocationFixture> | null;
  positions?: WalletPosition[];
}


export function inputsFor({
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


/** Count of suggestions flagged Top Pick (must be 0 or 1). */
export function topPickCount(suggestions: EngineSuggestion[]): number {
  return suggestions.filter((s) => s.is_top_pick).length;
}


/** Minimal actionable candidate for direct selectTopPick tests. */
export function makeCandidate(
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
 * Step 9A — contract checks for the CONTRACTED future categories
 * (capital_efficiency / staking / stable_yield / position_optimization).
 * Types + ordering + mapper fallback only; NO trigger logic.
 * ------------------------------------------------------------------ */
export const CONTRACT_CATEGORIES = [
  "capital_efficiency",
  "staking",
  "stable_yield",
  "position_optimization",
] as const;


/** A minimal actionable suggestion for a contracted category, real copy keys. */
export function catCandidate(
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


/* ------------------------------------------------------------------ *
 * Step 9I — guardrail standardization + honesty.
 * ------------------------------------------------------------------ */
export const EXEC_CODES = ["cost_available", "liquidity_available", "slippage_available"] as const;


/** A priced direct-wallet USDC (non-native) helper for RE-17 (proves freshness stays unresolved w/o native SOL). */
export function usdcOnly(): WalletPosition {
  return { id: "u", source: "wallet", type: "token", symbol: "USDC", name: "USD Coin", mint: RB_USDC, amount: "500000000", uiAmount: 500, decimals: 6, detection: "direct_wallet_balance", priceUsd: 1, valueUsd: 500 };
}


// 18G local helpers for liability accounting (RG-32) — kept out of the shared RB helpers to avoid name clashes.
export const sol18g = (v: number): WalletPosition => ({ id: "sol18g", source: "wallet", type: "native", symbol: "SOL", amount: String(Math.round((v / 250) * 1e9)), uiAmount: v / 250, decimals: 9, detection: "direct_wallet_balance", priceUsd: 250, valueUsd: v });

export const usdc18g = (v: number): WalletPosition => ({ id: "usdc18g", source: "wallet", type: "token", symbol: "USDC", name: "USD Coin", mint: RB_USDC, amount: String(Math.round(v * 1e6)), uiAmount: v, decimals: 6, detection: "direct_wallet_balance", priceUsd: 1, valueUsd: v });

export const debt18g = (v: number): WalletPosition => ({ id: "debt18g", source: "hubble", type: "protocol", symbol: "USDH", name: "USDH loan", side: "borrowed", amount: "1", uiAmount: v, detection: "protocol_api", valueUsd: v });



/** Local helper: a minimal synthetic engine suggestion for merge/ordering fixtures. */
export function mkSug15H(id: string, category: import("../engineTypes").SuggestionCategory): import("../engineTypes").EngineSuggestion {
  return { id, category, reason_codes: [], title_key: "", description_key: "", action_kind: "review_only", is_actionable: true, is_top_pick: false, scores: { impact: 0.5, urgency: 0.5, efficiency: 0.5 }, guardrails: [], engine_version: "x", timestamp: 0 };
}


/** Local helper: a canonical Safety Buffer snapshot for pipeline fixtures. */
export function scenBuffer(required = 3000, current = 2000): import("../contributionPriorityTypes").ContributionSafetyBufferSnapshot {
  return buildContributionSafetyBufferSnapshot({ targetUsd: required, stableUsd: current }, { calculatedAt: "2026-07-15T00:00:00Z", checkedAt: "2026-07-15T00:00:00Z" });
}


/** Local helper: the Step 15G execution flag (kept false). */
export function CONTRIBUTION_PLAN_EXECUTION_ENABLED_15H(): boolean {
  return false;
}
