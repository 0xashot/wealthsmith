/**
 * Safety Buffer assessment + position review + On Track assessment fixture checks.
 *
 * Extracted verbatim from suggestionEngine.fixtures.ts (progressive monolith split).
 * The monolith imports and aggregates these checks; behavior and check names are
 * unchanged.
 */
import type { PortfolioCompletenessResult as PCResult } from "../../wallet/portfolioCompleteness";
import { computeSafetyBufferCoverage as sbCoverage } from "../../wallet/safetyBufferCoverage";
import type { SafetyBufferCoverage } from "../../wallet/safetyBufferCoverage";
import { buildSteakhouseExistingPosition as stBuild, toSteakhouseWalletPosition as stToWallet } from "../../wallet/steakhouseExistingPosition";
import type { WalletPosition } from "../../wallet/walletPosition";
import { KAMINO_SOL_BTC_MARKET_USDC_URL, deriveBufferPositionReview } from "../bufferPositionVetting";
import { buildSafetyBufferCardFromAssessment } from "../bufferSuggestion";
import { REBALANCE_DELTA_THRESHOLD_PCT } from "../engineThresholds";
import type { FixtureCheck } from "./fixtureCheck";
import { ON_TRACK_ASSESSMENT_VERSION, deriveOnTrackAssessment as otAssess } from "../onTrackAssessment";
import type { OnTrackCandidateContext } from "../onTrackAssessment";
import type { RebalanceAssessment } from "../rebalanceAssessment";
import { SAFETY_BUFFER_ASSESSMENT_VERSION, deriveSafetyBufferAssessment as sbAssess } from "../safetyBufferAssessment";
import type { SafetyBufferContributionPlanInput } from "../safetyBufferAssessment";
import { toSuggestionCard } from "../toSuggestionCard";
import { readFileSync } from "node:fs";

/* ------------------------------------------------------------------ *
 * Step 21B Phase 1 — the canonical, NON-MOUNTED SafetyBufferAssessment. Projects the existing canonical coverage
 * into explicit target-availability, verified vs maximum-possible coverage, proven vs worst-case shortfall,
 * complete/incomplete/unresolved/below-minimum/unavailable states, normalized contribution context, gates, and
 * readiness. It emits NO suggestion and is not mounted. Coverage identity/liquidity/interval methodology unchanged.
 * ------------------------------------------------------------------ */
export function runSafetyBufferAssessmentFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const GEN = 1_700_000_000_000;
  // Build a canonical SafetyBufferCoverage literal for a precise interval state (no reclassification of positions).
  const cov = (o: { target: number; verified: number; unresolved?: number; unknownMag?: boolean; state: SafetyBufferCoverage["coverageState"] }): SafetyBufferCoverage => {
    const unresolved = o.unresolved ?? 0;
    return {
      requiredBufferUsd: o.target,
      recognizedStableValueUsd: o.verified + unresolved,
      verifiedLiquidStableValueUsd: o.verified,
      delayedStableValueUsd: 0,
      unavailableStableValueUsd: 0,
      unresolvedStableValueUsd: unresolved,
      hasUnknownUnresolvedMagnitude: o.unknownMag ?? false,
      shortfallUsd: Math.max(o.target - o.verified, 0),
      coverageRatio: o.target > 0 ? o.verified / o.target : 1,
      fullyFunded: o.state === "complete",
      coverageState: o.state,
      unresolvedReasons: [],
      sources: [],
    };
  };
  const A = (coverage: SafetyBufferCoverage | null, expenses: number | null, months: number | null, plan?: SafetyBufferContributionPlanInput | null) =>
    sbAssess({ coverage, monthlyExpensesUsd: expenses, targetMonths: months, contributionPlan: plan ?? null, generatedAt: GEN });

  // ---- Target availability ----
  add("SBA-1: medium risk months=3 + expenses 1000 → targetUsd 3000, available", (() => { const a = A(cov({ target: 3000, verified: 3000, state: "complete" }), 1000, 3); return a.targetState === "available" && a.targetUsd === 3000; })(), "target medium");
  add("SBA-2: low risk months=6 → targetUsd 6000", A(cov({ target: 6000, verified: 6000, state: "complete" }), 1000, 6).targetUsd === 6000, "target low");
  add("SBA-3: high risk months=1 → targetUsd 1000", A(cov({ target: 1000, verified: 1000, state: "complete" }), 1000, 1).targetUsd === 1000, "target high");
  add("SBA-4: missing target months (null) → unavailable, targetUsd null, readiness blocked, informational_target_unavailable", (() => { const a = A(null, 1000, null); return a.targetState === "unavailable_invalid_target_months" && a.targetUsd === null && a.overallReadiness === "blocked" && a.displayMode === "informational_target_unavailable" && a.presentationState === "target_unavailable"; })(), "missing risk");
  add("SBA-5: missing expenses → unavailable_missing_expenses", (() => { const a = A(cov({ target: 3000, verified: 100, state: "incomplete" }), null, 3); return a.targetState === "unavailable_missing_expenses" && a.targetUsd === null; })(), "missing expenses");
  add("SBA-6: zero expenses → unavailable_invalid_expenses", A(null, 0, 3).targetState === "unavailable_invalid_expenses", "zero expenses");
  add("SBA-7: negative expenses → unavailable_invalid_expenses", A(null, -100, 3).targetState === "unavailable_invalid_expenses", "negative expenses");
  add("SBA-8: malformed target months (0) → unavailable_invalid_target_months", A(null, 1000, 0).targetState === "unavailable_invalid_target_months", "malformed months");
  add("SBA-9: no rounding before multiplication (333.33 × 3 = 999.99)", A(cov({ target: 999.99, verified: 999.99, state: "complete" }), 333.33, 3).targetUsd === 333.33 * 3, "no pre-round");

  // ---- Complete ----
  add("SBA-10: verified above target → complete, zero shortfall range", (() => { const a = A(cov({ target: 3000, verified: 4000, state: "complete" }), 1000, 3); return a.presentationState === "complete" && a.verifiedOnlyShortfallUsd === 0 && a.provenMinimumShortfallUsd === 0 && a.displayMode === "none" && a.overallReadiness === "allowed"; })(), "above target");
  add("SBA-11: verified exactly at target → complete (equality funds)", (() => { const a = A(cov({ target: 3000, verified: 3000, state: "complete" }), 1000, 3); return a.presentationState === "complete" && a.fullyFunded === true && a.verifiedOnlyShortfallUsd === 0; })(), "exact target");
  add("SBA-12: complete coverageConfidence = verified_complete", A(cov({ target: 3000, verified: 3200, state: "complete" }), 1000, 3).coverageConfidence === "verified_complete", "confidence");

  add("SBA-RANGE-COPY: range shortfall → 'confirmed / being verified' body on card AND modal; 5-card set (Amount needed/Current/Being verified/Target/Current coverage), no heading, no guardrails; impact unchanged", (() => { const a = A(cov({ target: 3000, verified: 2000, unresolved: 500, state: "incomplete" }), 1000, 3); const c = buildSafetyBufferCardFromAssessment(a, GEN); if (!c) return false; const card = toSuggestionCard(c); const d = c.reviewDetails; const expected = "You have $2,000 confirmed in your Safety Buffer, and another $500 is still being verified. Your target is $3,000. Add at least $500 now; depending on the verification result, you may need another $500 later."; const labels = (d?.metrics ?? []).map((m) => m.label); const cov5 = (d?.metrics ?? []).find((m) => m.label === "Current coverage")?.value; return card.description === expected && d?.summary.reason === expected && card.impact_text === "Add at least $500 to your Safety Buffer." && d?.externalLink?.ctaLabel === "Buy at least $500 in USDC" && labels.length === 5 && ["Current", "Current coverage", "Being verified", "Target", "Minimum amount to add"].every((l) => labels.includes(l)) && cov5 === "2 of 3 months" && d?.hideMetricsHeading === true && d?.hideGuardrails === true; })(), "range detailed copy");

  add("SBA-FROZEN-COPY: frozen stablecoin excluded → 'eligible stablecoins' body + 'Excluded from Safety Buffer' table (USDC / 2000 / $2,000 / Frozen)", (() => { const positions = [{ id: "u", source: "wallet", type: "token", symbol: "USDC", name: "USD Coin", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", amount: "1000000000", uiAmount: 1000, decimals: 6, detection: "direct_wallet_balance", priceUsd: 1, valueUsd: 1000 }, { id: "t22", source: "wallet", type: "token", symbol: "USDC", name: "USDC (Token-2022)", mint: "Usdc2022Mint1111", amount: "2000", uiAmount: 2000, decimals: 6, detection: "direct_wallet_balance", priceUsd: 1, valueUsd: 2000, withdrawalState: "currently_unavailable" }] as unknown as WalletPosition[]; const coverage = sbCoverage(positions, 3000); const a = sbAssess({ coverage, monthlyExpensesUsd: 1000, targetMonths: 3, contributionPlan: null, generatedAt: GEN }); const c = buildSafetyBufferCardFromAssessment(a, GEN); if (!c) return false; const card = toSuggestionCard(c); const body = "You have $1,000 in eligible stablecoins. One stablecoin holding is frozen and can’t be used as a liquid reserve, so it isn’t counted."; const action = "Add $2,000 to your Safety Buffer."; const ex = c.reviewDetails?.excludedAssets ?? []; return card.description === body && card.impact_text === action && c.reviewDetails?.summary.reason === `${body} ${action}` && ex.length === 1 && ex[0].symbol === "USDC" && ex[0].amount === 2000 && ex[0].valueUsd === 2000 && ex[0].reason === "Frozen" && c.reviewDetails?.hideMetricsHeading === true && c.reviewDetails?.hideGuardrails === true; })(), "frozen excluded copy");

  add("SBA-PLAN-COPY: plan fully covers gap → 'Complete Your Safety Buffer' + plan body (card+modal); 5 cards incl. Next planned contribution; no heading/guardrails", (() => { const a = A(cov({ target: 3000, verified: 2000, state: "incomplete" }), 1000, 3, { planIsReady: true, planIsRange: false, plannedContributionUsd: 1000 }); const c = buildSafetyBufferCardFromAssessment(a, GEN); if (!c) return false; const card = toSuggestionCard(c); const d = c.reviewDetails; const expected = "Your Safety Buffer is $1,000 below target. Direct your next planned contribution to USDC to fully fund it before investing further."; const labels = (d?.metrics ?? []).map((m) => m.label); const npc = (d?.metrics ?? []).find((m) => m.label === "Next planned contribution")?.value; return card.title === "Complete Your Safety Buffer" && card.description === expected && d?.summary.reason === expected && card.impact_text === "Add $1,000 to your Safety Buffer." && labels.length === 5 && ["Current", "Current coverage", "Target", "Next planned contribution", "Amount to add"].every((l) => labels.includes(l)) && npc === 1000 && d?.hideMetricsHeading === true && d?.hideGuardrails === true; })(), "plan-full copy");

  // ---- Incomplete (proven shortfall) ----
  add("SBA-13: no unresolved value, verified 2000/3000 → incomplete, provenMin 1000 = verifiedOnly 1000, generic mode", (() => { const a = A(cov({ target: 3000, verified: 2000, state: "incomplete" }), 1000, 3); return a.presentationState === "definite_shortfall" && a.provenMinimumShortfallUsd === 1000 && a.verifiedOnlyShortfallUsd === 1000 && a.displayMode === "generic_definite_shortfall" && a.overallReadiness === "allowed"; })(), "no unresolved");
  add("SBA-14: known unresolved insufficient (verified 2000 + unresolved 500 < 3000) → incomplete, provenMin 500, verifiedOnly 1000", (() => { const a = A(cov({ target: 3000, verified: 2000, unresolved: 500, state: "incomplete" }), 1000, 3); return a.presentationState === "definite_shortfall" && a.provenMinimumShortfallUsd === 500 && a.verifiedOnlyShortfallUsd === 1000 && a.maximumPossibleCoverageUsd === 2500; })(), "unresolved insufficient");
  add("SBA-15: exact $50 proven shortfall → definite_shortfall (not below minimum)", (() => { const a = A(cov({ target: 3000, verified: 2950, state: "incomplete" }), 1000, 3); return a.provenMinimumShortfallUsd === 50 && a.belowMinimum === false && a.presentationState === "definite_shortfall"; })(), "exact 50");
  add("SBA-16: $49.99 proven shortfall → definite_shortfall_below_minimum + informational_below_minimum", (() => { const a = A(cov({ target: 3000, verified: 2950.01, state: "incomplete" }), 1000, 3); return a.provenMinimumShortfallUsd === 49.99 && a.belowMinimum === true && a.presentationState === "definite_shortfall_below_minimum" && a.displayMode === "informational_below_minimum" && a.overallReadiness === "allowed"; })(), "below 50");
  add("SBA-17: cents preserved (verified 2900.50, target 3000.25 → verifiedOnly 99.75)", A(cov({ target: 3000.25, verified: 2900.50, state: "incomplete" }), 1000.0833333, 3).verifiedOnlyShortfallUsd === 99.75, "cents");

  // ---- Unresolved ----
  add("SBA-18: known unresolved exactly closes target → coverage_unresolved, provenMin 0, verifiedOnly 1000", (() => { const a = A(cov({ target: 3000, verified: 2000, unresolved: 1000, state: "unresolved" }), 1000, 3); return a.presentationState === "coverage_unresolved" && a.provenMinimumShortfallUsd === 0 && a.verifiedOnlyShortfallUsd === 1000 && a.displayMode === "informational_unresolved_coverage" && a.overallReadiness === "unresolved"; })(), "unresolved closes");
  add("SBA-19: known unresolved exceeds target → still coverage_unresolved, provenMin 0", (() => { const a = A(cov({ target: 3000, verified: 2000, unresolved: 1500, state: "unresolved" }), 1000, 3); return a.presentationState === "coverage_unresolved" && a.provenMinimumShortfallUsd === 0; })(), "unresolved exceeds");
  add("SBA-20: unknown unresolved magnitude → maximumCoverageIsOpen, maximumPossibleCoverageUsd null, confidence unresolved_unknown_magnitude", (() => { const a = A(cov({ target: 3000, verified: 2000, unresolved: 0, unknownMag: true, state: "unresolved" }), 1000, 3); return a.maximumCoverageIsOpen === true && a.maximumPossibleCoverageUsd === null && a.coverageConfidence === "unresolved_unknown_magnitude" && a.provenMinimumShortfallUsd === 0; })(), "unknown magnitude");
  add("SBA-21: unresolved retains verifiedOnly as the range MAXIMUM, provenMin as the MINIMUM", (() => { const a = A(cov({ target: 3000, verified: 2000, unresolved: 1000, state: "unresolved" }), 1000, 3); return a.shortfallRangeUsd?.minimum === 0 && a.shortfallRangeUsd?.maximum === 1000; })(), "range");
  add("SBA-22: unresolved has NO definite review amount (provenMin 0)", A(cov({ target: 3000, verified: 500, unresolved: 3000, state: "unresolved" }), 1000, 3).provenMinimumShortfallUsd === 0, "no definite amount");
  add("SBA-23: unresolved confidence unresolved_may_be_complete when magnitude known", A(cov({ target: 3000, verified: 2000, unresolved: 1200, state: "unresolved" }), 1000, 3).coverageConfidence === "unresolved_may_be_complete", "may be complete");

  // ---- Contribution normalization ----
  add("SBA-24: generic definite-shortfall (no plan) → contribution none", (() => { const a = A(cov({ target: 3000, verified: 2000, state: "incomplete" }), 1000, 3); return a.contribution.contributionPlanState === "none" && a.displayMode === "generic_definite_shortfall"; })(), "generic none");
  add("SBA-PLAN-PARTIAL-COPY: plan partially covers gap → 'below target / reduce the gap / remaining amount afterward' body (card+modal); 5 cards incl. Next planned contribution; no heading/guardrails", (() => { const a = A(cov({ target: 3000, verified: 2000, state: "incomplete" }), 1000, 3, { planIsReady: true, planIsRange: false, plannedContributionUsd: 400 }); const c = buildSafetyBufferCardFromAssessment(a, GEN); if (!c) return false; const card = toSuggestionCard(c); const d = c.reviewDetails; const expected = "Your Safety Buffer is $1,000 below target. Use your next contribution toward USDC to reduce the gap. You’ll still need to add the remaining amount afterward."; const labels = (d?.metrics ?? []).map((m) => m.label); const npc = (d?.metrics ?? []).find((m) => m.label === "Next planned contribution")?.value; return card.title === "Top Up Your Safety Buffer" && card.description === expected && d?.summary.reason === expected && card.impact_text === "Add $1,000 to your Safety Buffer." && labels.length === 5 && ["Current", "Current coverage", "Target", "Next planned contribution", "Amount to add"].every((l) => labels.includes(l)) && npc === 400 && d?.hideMetricsHeading === true && d?.hideGuardrails === true; })(), "plan-partial copy");

  add("SBA-25: plan-backed FULL contribution covers proven shortfall → ready, remaining 0, plan_backed mode", (() => { const a = A(cov({ target: 3000, verified: 2000, state: "incomplete" }), 1000, 3, { planIsReady: true, planIsRange: false, plannedContributionUsd: 1000 }); return a.contribution.planCouldFullyCoverProvenShortfall === true && a.contribution.remainingProvenShortfallAfterPlanUsd === 0 && a.contribution.contributionPlanState === "ready" && a.displayMode === "plan_backed_definite_shortfall"; })(), "plan full");
  add("SBA-26: plan-backed PARTIAL (planned 400 < proven 1000) → partial, remaining 600", (() => { const a = A(cov({ target: 3000, verified: 2000, state: "incomplete" }), 1000, 3, { planIsReady: true, planIsRange: false, plannedContributionUsd: 400 }); return a.contribution.planIsPartial === true && a.contribution.remainingProvenShortfallAfterPlanUsd === 600 && a.contribution.contributionPlanState === "partial"; })(), "plan partial");
  add("SBA-27: contribution RANGE → planned uses the max point", (() => { const a = A(cov({ target: 3000, verified: 2000, state: "incomplete" }), 1000, 3, { planIsReady: true, planIsRange: true, plannedContributionMinUsd: 200, plannedContributionMaxUsd: 600 }); return a.contribution.planIsRange === true && a.contribution.plannedContributionUsd === 600 && a.contribution.plannedContributionMaxUsd === 600; })(), "range max");
  add("SBA-28: zero contribution → warning planned_below_minimum, could-not-cover", (() => { const a = A(cov({ target: 3000, verified: 2000, state: "incomplete" }), 1000, 3, { planIsReady: true, planIsRange: false, plannedContributionUsd: 0 }); return a.contribution.contributionWarnings.includes("planned_below_minimum") && a.contribution.planCouldFullyCoverProvenShortfall === false; })(), "zero contribution");
  add("SBA-29: contribution below $50 (40) → warning planned_below_minimum", A(cov({ target: 3000, verified: 2000, state: "incomplete" }), 1000, 3, { planIsReady: true, planIsRange: false, plannedContributionUsd: 40 }).contribution.contributionWarnings.includes("planned_below_minimum"), "below 50 plan");
  add("SBA-30: planned GREATER than proven shortfall → warning planned_exceeds_proven_shortfall, remaining 0", (() => { const a = A(cov({ target: 3000, verified: 2000, state: "incomplete" }), 1000, 3, { planIsReady: true, planIsRange: false, plannedContributionUsd: 1500 }); return a.contribution.contributionWarnings.includes("planned_exceeds_proven_shortfall") && a.contribution.remainingProvenShortfallAfterPlanUsd === 0; })(), "exceeds");
  add("SBA-31: unresolved coverage + plan → NON-definite (no proven cover, remainingProven null, warning)", (() => { const a = A(cov({ target: 3000, verified: 2000, unresolved: 1000, state: "unresolved" }), 1000, 3, { planIsReady: true, planIsRange: false, plannedContributionUsd: 1000 }); return a.contribution.planCouldFullyCoverProvenShortfall === false && a.contribution.remainingProvenShortfallAfterPlanUsd === null && a.contribution.contributionWarnings.includes("unresolved_coverage_plan_non_definite") && a.contribution.presentationMode === "informational_unresolved_coverage"; })(), "unresolved plan");
  add("SBA-32: next planned contribution and remaining need are SEPARATE fields", (() => { const a = A(cov({ target: 3000, verified: 2000, state: "incomplete" }), 1000, 3, { planIsReady: true, planIsRange: false, plannedContributionUsd: 400 }); return a.contribution.plannedContributionUsd === 400 && a.provenMinimumShortfallUsd === 1000; })(), "separate fields");
  add("SBA-33: complete coverage → no contribution review required (state none/ready, mode none)", (() => { const a = A(cov({ target: 3000, verified: 3100, state: "complete" }), 1000, 3, { planIsReady: true, planIsRange: false, plannedContributionUsd: 100 }); return a.contribution.presentationMode === "none"; })(), "complete no contribution");

  // ---- Gates ----
  add("SBA-34: complete gates → target/coverage/confidence/contribution allowed, readiness allowed", (() => { const a = A(cov({ target: 3000, verified: 3000, state: "complete" }), 1000, 3); return a.targetGate === "allowed" && a.coverageGate === "allowed" && a.coverageConfidenceGate === "allowed" && a.contributionGate === "allowed" && a.reviewConfidenceGate === "allowed" && a.overallReadiness === "allowed"; })(), "gates complete");
  add("SBA-35: definite incomplete → coverageConfidenceGate allowed, readiness allowed", (() => { const a = A(cov({ target: 3000, verified: 2000, state: "incomplete" }), 1000, 3); return a.coverageConfidenceGate === "allowed" && a.overallReadiness === "allowed"; })(), "gates incomplete");
  add("SBA-36: unresolved → confidence + contribution + review gates unresolved, readiness unresolved", (() => { const a = A(cov({ target: 3000, verified: 2000, unresolved: 1000, state: "unresolved" }), 1000, 3); return a.coverageConfidenceGate === "unresolved" && a.contributionGate === "unresolved" && a.reviewConfidenceGate === "unresolved" && a.overallReadiness === "unresolved"; })(), "gates unresolved");
  add("SBA-37: target unavailable → targetGate blocked, readiness blocked, blockingReasons present", (() => { const a = A(cov({ target: 3000, verified: 2000, state: "incomplete" }), null, 3); return a.targetGate === "blocked" && a.overallReadiness === "blocked" && a.blockingReasons.length > 0; })(), "gates target unavail");
  add("SBA-38: coverage unavailable (coverage null, target OK) → coverageGate unresolved, coverage_unavailable, readiness unresolved", (() => { const a = A(null, 1000, 3); return a.presentationState === "coverage_unavailable" && a.coverageGate === "unresolved" && a.overallReadiness === "unresolved" && a.blockingReasons.includes("coverage_unavailable"); })(), "coverage unavail");

  // ---- Methodology-preservation regression ----
  add("SBA-39: assessment consumes the REAL computeSafetyBufferCoverage over positions (values flow, no reclassification)", (() => { const c = sbCoverage([{ id: "u", source: "wallet", type: "token", symbol: "USDC", name: "USD Coin", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", amount: "1", detection: "direct_wallet_balance", valueUsd: 2000 } as WalletPosition], 3000); const a = A(c, 1000, 3); return a.verifiedLiquidStableValueUsd === 2000 && a.coverageState === c.coverageState && a.provenMinimumShortfallUsd === 1000; })(), "real coverage flows");
  add("SBA-40: assessment emits NO suggestion (no id/category/amount/action_kind)", (() => { const a = A(cov({ target: 3000, verified: 2000, state: "incomplete" }), 1000, 3) as unknown as Record<string, unknown>; return !("id" in a) && !("category" in a) && !("amount" in a) && !("action_kind" in a) && typeof a.overallReadiness === "string"; })(), "no suggestion");
  add("SBA-41 (21C): the engine consumes the bufferOverride (no direct assessment import); the RAIL mounts one assessment + one mapper", (() => { const rd = (f: string) => { try { return readFileSync(`${process.cwd()}/${f}`, "utf8"); } catch { return ""; } }; const rail = rd("src/suggestions/useRailSuggestions.ts"); return !/deriveSafetyBufferAssessment/.test(rd("src/suggestions/engine.ts")) && (rail.match(/deriveSafetyBufferAssessment\(/g) ?? []).length === 1 && (rail.match(/buildSafetyBufferCardFromAssessment\(/g) ?? []).length === 1; })(), "mounted once");
  add("SBA-42: methodologyVersion is safety_buffer_assessment_1.0.0", A(cov({ target: 3000, verified: 3000, state: "complete" }), 1000, 3).methodologyVersion === SAFETY_BUFFER_ASSESSMENT_VERSION && SAFETY_BUFFER_ASSESSMENT_VERSION === "safety_buffer_assessment_1.0.0", "version");
  add("SBA-43: assessment module re-runs NO identity/liquidity/coverage classification", (() => { const src = (() => { try { return readFileSync(`${process.cwd()}/src/suggestions/safetyBufferAssessment.ts`, "utf8"); } catch { return ""; } })(); return !/computeSafetyBufferCoverage\(|classifyPositionCoverage\(|isStablecoin\(/.test(src); })(), "no reclassification");
  add("SBA-44: unknown-magnitude never invents a finite maximum coverage", A(cov({ target: 3000, verified: 1000, unresolved: 0, unknownMag: true, state: "unresolved" }), 1000, 3).maximumPossibleCoverageUsd === null, "no invented max");
  add("SBA-45: verifiedOnly is never labeled the definitive shortfall in unresolved (proven=0, verifiedOnly>0)", (() => { const a = A(cov({ target: 3000, verified: 2000, unresolved: 1000, state: "unresolved" }), 1000, 3); return a.provenMinimumShortfallUsd === 0 && (a.verifiedOnlyShortfallUsd ?? 0) > 0 && a.presentationState === "coverage_unresolved"; })(), "unresolved honesty");

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 21C — PRODUCTION MOUNT of the Safety Buffer. Proves the ONE canonical `buildSafetyBufferCardFromAssessment`
 * mapper renders the `top_up_buffer` contract for every state, that the confirmed-minimum shortfall (never the
 * worst-case, never a plan amount) drives the definite card, that below-$50 is informational (no disabled action),
 * unresolved shows no definite amount, and that the fail-closed `bufferOverride` suppresses ALL downstream + On Track
 * for every non-complete state and permits downstream only when complete. Legacy direct rule has zero mounted callers.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Unvetted Safety Buffer USDC lending position → "Review Your Safety Buffer USDC" card + "Move Your Safety Buffer
 * USDC" modal. Backend/engine decides eligibility (source of truth); the UI renders deterministic templates only.
 * ------------------------------------------------------------------ */
export function runBufferPositionReviewFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const readIfSrc = (rel: string) => { try { return readFileSync(`${process.cwd()}/${rel}`, "utf8"); } catch { return ""; } };
  const GEN = 1_700_000_000_000;
  const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
  const p = (o: Partial<WalletPosition>): WalletPosition => ({ id: "x", source: "wallet", type: "token", symbol: "X", name: "X", amount: "1", detection: "direct_wallet_balance", valueUsd: 100, ...o } as WalletPosition);
  const usdc = (v: number, id = "u") => p({ id, symbol: "USDC", name: "USD Coin", mint: USDC, uiAmount: v, priceUsd: 1, valueUsd: v });
  // A detected Kamino curated-vault USDC position (ANY curator), identified by a canonical vault address.
  const curated = (o: { product: string; curator: string; vault: string; amount?: number | null }) => p({ id: "cv", type: "protocol", symbol: "USDC", name: `${o.product} USDC`, protocol: "Kamino", existingPositionOnly: true, withdrawalState: "unresolved", recognizedValueUsd: o.amount ?? null, uiAmount: o.amount ?? undefined, valueUsd: o.amount ?? null, mint: USDC, curatedLending: { protocol: "Kamino", productName: o.product, curator: o.curator, vaultAddress: o.vault, detectionConfidence: "high" } });
  const allez = (v: number) => curated({ product: "Allez USDC", curator: "Allez Labs", vault: "A11ezVau1t1111111111111111111111111111111111", amount: v });
  const steak = (v: number) => curated({ product: "Steakhouse USDC Vault", curator: "Steakhouse Financial", vault: "HDsayqAsDWy3QvANGqh2yNraqcD8Fnjgh73Mhb3WRS5E", amount: v });
  const steakNoAmt = () => curated({ product: "Steakhouse USDC Vault", curator: "Steakhouse Financial", vault: "HDsayqAsDWy3QvANGqh2yNraqcD8Fnjgh73Mhb3WRS5E", amount: null });
  const unmapped = (v: number) => p({ id: "uv", type: "protocol", symbol: "USDC", name: "Unknown vault USDC", protocol: "Kamino", existingPositionOnly: true, withdrawalState: "unresolved", recognizedValueUsd: v, uiAmount: v, valueUsd: v, mint: USDC });
  const kaminoMain = (v: number) => p({ id: "kd", type: "protocol", symbol: "USDC", name: "USDC on Kamino", protocol: "Kamino", candidateId: "kamino_usdc_lending", existingPositionOnly: true, withdrawalState: "fully_withdrawable", recognizedValueUsd: v, liquidValueUsd: v, valueUsd: v, mint: USDC });
  // Full production chain: positions → coverage → review → assessment → card → mapped SuggestionCard.
  const run = (positions: WalletPosition[], expenses: number, months: number) => {
    const coverage = sbCoverage(positions, expenses * months);
    const review = deriveBufferPositionReview(coverage, positions);
    const a = sbAssess({ coverage, monthlyExpensesUsd: expenses, targetMonths: months, bufferPositionReview: review, generatedAt: GEN });
    const eng = buildSafetyBufferCardFromAssessment(a, GEN);
    return { coverage, review, a, eng, card: eng ? toSuggestionCard(eng) : null };
  };

  const known = run([usdc(1000), allez(2000)], 1000, 3);      // the user's example curator
  const steakRun = run([usdc(1000), steak(2000)], 1000, 3);   // a DIFFERENT curator, same path
  const noAmt = run([usdc(1000), steakNoAmt()], 1000, 3);
  const low = run([usdc(1000), unmapped(2000)], 1000, 3);
  const approved = run([usdc(500), kaminoMain(2000)], 1000, 3);
  const both = run([usdc(1000), allez(2000)], 2000, 3);
  const noDest = run([usdc(1000), unmapped(2000)], 1000, 3);

  // ---- Deterministic, DYNAMIC card copy (product/curator resolved per position; no curator special-cased) ----
  add("BPR-1: unvetted Allez position → card body resolves the product + protocol dynamically ('… in Allez USDC on Kamino …')", known.card!.title === "Review Your Safety Buffer USDC" && known.card!.description === "We found 2,000 USDC in Allez USDC on Kamino. This lending position has not yet passed WealthSmith's vetting for Safety Buffer use, so we do not currently count it toward your buffer.", `desc=${known.card!.description.slice(0, 44)}`);
  add("BPR-1b: a DIFFERENT curator (Steakhouse) flows through the SAME path with ITS resolved product — not a hardcoded phrase", steakRun.card!.description.startsWith("We found 2,000 USDC in Steakhouse USDC Vault on Kamino.") && steakRun.review!.curator === "Steakhouse Financial", `desc=${steakRun.card!.description.slice(0, 50)}`);
  add("BPR-2: unknown amount → card body omits an invented amount ('We found USDC in …')", noAmt.card!.description === "We found USDC in Steakhouse USDC Vault on Kamino. This lending position has not yet passed WealthSmith's vetting for Safety Buffer use, so we do not currently count it toward your buffer.", noAmt.card!.description.slice(0, 40));
  // ---- Deterministic modal copy ----
  add("BPR-3: modal title is 'Move Your Safety Buffer USDC' and body states not-vetted + the approved destination", known.eng!.reviewDetails!.summary.title === "Move Your Safety Buffer USDC" && /has not yet passed WealthSmith's vetting/.test(known.eng!.reviewDetails!.summary.reason) && /Move the funds to USDC lending in SOL\/BTC Market/.test(known.eng!.reviewDetails!.summary.reason), known.eng!.reviewDetails!.summary.title);
  // ---- CTAs + destination URL ----
  add("BPR-4: card CTA always says 'Review' and is non-transactional (no execution, no signature, no in-app action)", known.card!.cta.label === "Review" && known.card!.cta.executes_transaction === false && known.card!.cta.requires_wallet_signature === false && known.card!.cta.action === null, `cta=${known.card!.cta.label}`);
  add("BPR-5: modal primary CTA is 'Move to SOL/BTC Market' → the approved SOL/BTC Market URL, opens in a new tab, secondary 'Cancel'", (() => { const e = known.eng!.reviewDetails!.externalLink!; return e.ctaLabel === "Move to SOL/BTC Market" && e.url === KAMINO_SOL_BTC_MARKET_USDC_URL && e.opensInNewTab === true && e.secondaryLabel === "Cancel"; })(), "primary cta");
  add("BPR-6: the destination URL is the approved Kamino SOL/BTC Market lending page (never empty → never a broken external CTA)", KAMINO_SOL_BTC_MARKET_USDC_URL === "https://kamino.com/borrow" && known.eng!.reviewDetails!.externalLink!.url.length > 0, KAMINO_SOL_BTC_MARKET_USDC_URL);
  // ---- Safety Buffer calculation: unvetted USDC excluded ----
  add("BPR-7: the unvetted USDC is EXCLUDED from Safety Buffer coverage (verified liquid = direct USDC only; excluded_unresolved source)", known.coverage.verifiedLiquidStableValueUsd === 1000 && known.coverage.sources.some((s) => s.inclusionState === "excluded_unresolved" && s.positionId === "cv"), `verified=${known.coverage.verifiedLiquidStableValueUsd}`);
  add("BPR-8: approved Kamino SOL/BTC Market USDC IS counted (verified liquid) → NO review, normal Safety Buffer rules (definite shortfall card)", approved.review === null && approved.coverage.verifiedLiquidStableValueUsd === 2500 && approved.card!.title === "Top Up Your Safety Buffer", `verified=${approved.coverage.verifiedLiquidStableValueUsd}`);
  // ---- Modal layout: focused 4-card set (no 'Key metrics' heading, no Guardrails) + 'Excluded from Safety Buffer' table ----
  add("BPR-9: unvetted position modal → focused cards in the shared buffer order [Current, Current coverage, Target, Amount to move], no heading/guardrails, no legacy 'Detected'/'Additional' metrics", (() => { const d = known.eng!.reviewDetails!; const labels = d.metrics.map((m) => m.label); return labels.join(",") === "Current,Current coverage,Target,Amount to move"
      // The POSITION's own value (what can actually be moved), emphasized.
      && d.metrics.find((m) => m.label === "Amount to move")?.value === 2000
      && d.metrics.find((m) => m.label === "Amount to move")?.emphasis === "primary" && d.metrics.find((m) => m.label === "Current")?.value === 1000 && d.metrics.find((m) => m.label === "Target")?.value === 3000 && d.hideMetricsHeading === true && d.hideGuardrails === true; })(), known.eng!.reviewDetails!.metrics.map((m) => m.label).join(","));
  add("BPR-9-nocalc: Safety Buffer modals emit NO 'How this was calculated' section (calculations empty) across plain-shortfall AND unvetted-position cases", (() => { const definite = run([usdc(1000)], 1000, 3); return definite.eng!.title_key === "suggestion.buffer.title" && (definite.eng!.reviewDetails?.calculations.length ?? -1) === 0 && (known.eng!.reviewDetails?.calculations.length ?? -1) === 0; })(), "no buffer calculations");
  add("BPR-9b: unvetted position modal → 'Excluded from Safety Buffer' table row (USDC / 2,000 / $2,000 / Unvetted)", (() => { const ex = known.eng!.reviewDetails!.excludedAssets ?? []; return ex.length === 1 && ex[0].symbol === "USDC" && ex[0].amount === 2000 && ex[0].valueUsd === 2000 && ex[0].reason === "Unvetted"; })(), `ex=${JSON.stringify(known.eng!.reviewDetails!.excludedAssets)}`);
  add("BPR-9c: unvetted PLUS additional shortfall → 'Amount to move' is the POSITION's value (2000), NOT the larger verified-only gap (5000) — the user cannot move more than is there", (() => { const d = both.eng!.reviewDetails!; const labels = d.metrics.map((m) => m.label); return both.card!.title === "Review Your Safety Buffer USDC" && labels.join(",") === "Current,Current coverage,Target,Amount to move" && d.metrics.find((m) => m.label === "Amount to move")?.value === 2000 && d.metrics.every((m) => m.value !== 5000) && (d.excludedAssets ?? []).some((x) => x.symbol === "USDC" && x.reason === "Unvetted"); })(), both.eng!.reviewDetails!.metrics.map((m) => m.label).join(","));
  // ---- Generic fallback ----
  add("BPR-10: unmapped / low-confidence position → NO review; generic 'Verify Your Safety Buffer' fallback", low.review === null && low.card!.title === "Verify Your Safety Buffer", `title=${low.card!.title}`);
  add("BPR-11: missing destination mapping → NO review; generic fallback, never an external CTA", noDest.review === null && (noDest.eng == null || noDest.eng.reviewDetails?.externalLink == null), `review=${noDest.review}`);
  // ---- No unsafe/security claims + no frontend inference ----
  add("BPR-12: copy never calls the position 'unsafe'/'insecure'/'failed' or makes a security claim", (() => { const blob = `${known.card!.title} ${known.card!.description} ${known.eng!.reviewDetails!.summary.reason}`.toLowerCase(); return !/unsafe|insecure|\bfailed\b|not secure|dangerous|risky|hack/.test(blob) && /has not yet passed wealthsmith's vetting/.test(blob); })(), "no security claims");
  add("BPR-13: NO frontend inference — the modal component contains no protocol/product/destination literals (they come from bufferPositionReview)", (() => { const comp = readIfSrc("src/components/SuggestionReviewModal.tsx"); return !/Steakhouse|Allez|Sentora|SOL\/BTC Market|app\.kamino/.test(comp); })(), "no UI inference");
  add("BPR-14: NO curator is hardcoded in the engine CODE — with comments stripped, the vetting module names NO curator (Steakhouse/Sentora/Allez/Gauntlet/…); it resolves them from the position", (() => { const mod = readIfSrc("src/suggestions/bufferPositionVetting.ts"); const code = mod.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, ""); return code.length > 0 && !/Steakhouse|Sentora|Allez|Gauntlet|RockawayX|MEV Capital/.test(code); })(), "curator-agnostic");
  add("BPR-15: positions are identified by CANONICAL ADDRESS (vault/market/reserve), not display name — the review carries the canonical positionAddress", known.review != null && typeof known.review.positionAddress === "string" && known.review.positionAddress === "A11ezVau1t1111111111111111111111111111111111", `addr=${known.review?.positionAddress}`);
  add("BPR-16: the review carries the resolved structured fields dynamically (product/curator/approval/destination)", known.review != null && known.review.type === "buffer_position_review" && known.review.reason === "buffer_position_not_vetted" && known.review.protocol === "Kamino" && known.review.product === "Allez USDC" && known.review.curator === "Allez Labs" && known.review.approvalStatus === "not_vetted" && known.review.approvedDestination === "SOL/BTC Market" && known.review.detectionConfidence === "high", `product=${known.review?.product}`);
  // ---- Real detection path: the production Steakhouse vault mapper now carries curatedLending → specific card ----
  add("BPR-17: the REAL Steakhouse detection mapper populates curatedLending (canonical vault address + product) so a live wallet gets the specific card, not the generic fallback", (() => {
    const record = stBuild({ totalShareRaw: "2000000000", recognizedUnderlyingRaw: "2000000000", vaultMaxInstantWithdrawableRaw: null, vaultGate: "permitted", reserveGate: "unresolved", vaultFresh: true, price: { usdcPriceUsd: 1, fresh: true }, apy: { valuePct: 3.63, fresh: true }, observedAt: "2026-07-15T00:00:00.000Z", sourceSlot: 1 });
    const wp = stToWallet(record, { name: "Steakhouse USDC Vault" });
    if (!wp) return false;
    const priced = { ...wp, valueUsd: 2000, recognizedValueUsd: 2000 } as WalletPosition;
    const r = run([usdc(1000), priced], 1000, 3);
    return r.review != null && r.review.protocol === "Kamino" && typeof r.review.positionAddress === "string" && r.card!.title === "Review Your Safety Buffer USDC" && /on Kamino\./.test(r.card!.description);
  })(), "real steakhouse mapper");
  add("BPR-18: detection populates curatedLending in BOTH the Steakhouse builder AND the generic Kamino vault path (any curator)", (() => { const st = readIfSrc("src/wallet/steakhouseExistingPosition.ts"); const kv = readIfSrc("src/wallet/kaminoVaults.ts"); return /curatedLending:/.test(st) && /curatedLending:/.test(kv) && /vaultAddress: vaultAddress\.toString\(\)/.test(kv); })(), "detection wired");
  // ---- Rail modal precedence: the plan-backed buffer contribution review shares the buffer id and must NOT shadow
  //      the position-review modal. The rail drops it when a position review is present so the correct modal opens. ----
  add("BPR-19: the buffer contribution plan reuses the buffer card id (top_up_buffer) — the collision the rail must resolve", (() => { const s = readIfSrc("src/suggestions/contributionPlanSuggestion.ts"); return /category: "buffer"[\s\S]*?id: BUFFER_SUGGESTION_ID/.test(s); })(), "id collision");
  add("BPR-20: the rail suppresses the buffer contribution review when a position review is present, so the buffer card's own reviewDetails (Move Your Safety Buffer USDC) drives the modal — not the 'Directing $X from your next contribution' contribution modal", (() => { const s = readIfSrc("src/suggestions/useRailSuggestions.ts"); return /bufferPositionReview != null\)\s*delete contributionReviewById\[BUFFER_SUGGESTION_ID\]/.test(s) && /contributionReviewById,/.test(s); })(), "rail resolves precedence");
  // ---- Review modal chrome: no Top Pick chip; Guardrails are a TESTING-ONLY diagnostic ----
  add("BPR-21: the review modal renders NO 'Top Pick' badge (chip removed) and no isTopPick prop remains", (() => { const m = readIfSrc("src/components/SuggestionReviewModal.tsx"); return !/label="Top Pick"/.test(m) && !/isTopPick/.test(m) && !/review-modal__eyebrow/.test(m); })(), "no top pick chip");
  add("BPR-22: Guardrails are gated behind showGuardrails; the /testing gallery passes it, Real Wallet + Demo (the rail) do NOT — so users never see the internal checklist", (() => { const m = readIfSrc("src/components/SuggestionReviewModal.tsx"); const rail = readIfSrc("src/components/RealWalletSuggestionsRail.tsx"); const testing = readIfSrc("src/pages/TestingPage.tsx"); return /showGuardrails &&[^\n]*guardrailGroups\.length > 0/.test(m) && !/showGuardrails/.test(rail) && /showGuardrails/.test(testing); })(), "guardrails testing-only");

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 16H-S.2 — the kaminoSecuritySourcesAmendment. Proves the two product-owner-supplied Kamino sources
 * (kamino.com/security + risk.kamino.finance), reviewed live 2026-07-27, are recorded as facts WITHOUT moving
 * any score, conferring approval/eligibility, or claiming coverage of the current on-chain binary.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Step 21D — the canonical, NON-MOUNTED OnTrackAssessment. Proves the narrow scope WealthSmith can honestly claim
 * (Safety Buffer verified complete + canonical crypto allocation inside the ±10pp review range + authoritative
 * accounting + no proven material Rebalance need + no visible higher-priority candidate), that candidate-set
 * emptiness controls fallback VISIBILITY but never establishes plan health, that unevaluated dimensions are recorded
 * (never "healthy"), and that a proven cardless/filtered material Rebalance signal blocks the fallback.
 * ------------------------------------------------------------------ */
export function runOnTrackAssessmentFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const GEN = 1_700_000_000_000;
  const cov = (target: number, verified: number, state: SafetyBufferCoverage["coverageState"], opts: { unresolved?: number; unknownMag?: boolean } = {}): SafetyBufferCoverage => ({ requiredBufferUsd: target, recognizedStableValueUsd: verified + (opts.unresolved ?? 0), verifiedLiquidStableValueUsd: verified, delayedStableValueUsd: 0, unavailableStableValueUsd: 0, unresolvedStableValueUsd: opts.unresolved ?? 0, hasUnknownUnresolvedMagnitude: opts.unknownMag ?? false, shortfallUsd: Math.max(target - verified, 0), coverageRatio: target > 0 ? verified / target : 1, fullyFunded: state === "complete", coverageState: state, unresolvedReasons: [], sources: [] });
  const sb = (coverage: SafetyBufferCoverage | null, expenses: number | null = 1000, months: number | null = 3) => sbAssess({ coverage, monthlyExpensesUsd: expenses, targetMonths: months, generatedAt: GEN });
  const sbComplete = () => sb(cov(3000, 3000, "complete"));
  const sbIncomplete = () => sb(cov(3000, 2000, "incomplete"));
  const sbBelowMin = () => sb(cov(3000, 2960, "incomplete"));
  const sbUnresolved = () => sb(cov(3000, 2000, "unresolved", { unresolved: 1000 }));
  const sbTargetUnavail = () => sb(cov(3000, 2000, "incomplete"), null, 3);
  const sbCoverageUnavail = () => sb(null, 1000, 3);
  const ra = (o: { delta: number | null; calc: "allowed" | "blocked" | "unresolved"; target?: number | null; direction?: RebalanceAssessment["direction"]; targetConfidence?: string | null }): RebalanceAssessment => ({
    currentCryptoPct: o.delta != null && o.target !== null ? (o.target ?? 60) + o.delta : 62,
    targetCryptoPct: o.target === undefined ? 60 : o.target,
    cryptoDeltaPct: o.delta,
    direction: o.direction ?? (o.delta == null ? "unresolved" : o.delta >= 10 ? "crypto_to_stables" : o.delta <= -10 ? "stables_to_crypto" : "within_threshold"),
    calculationGate: { status: o.calc, reasons: [] },
    methodologyVersion: "rebalance_assessment_1.0.0",
    targetConfidence: o.targetConfidence === undefined ? "full" : o.targetConfidence, // Slice 5 — default full; override for degraded/absent tests.
  } as unknown as RebalanceAssessment);
  const raWithin = (delta = 2) => ra({ delta, calc: "allowed" });
  const raMaterial = (delta = 12) => ra({ delta, calc: "allowed" });
  const raUnresolved = () => ra({ delta: null, calc: "unresolved" });
  const raTargetUnavail = () => ra({ delta: null, calc: "allowed", target: null });
  const sig = (over: Partial<OnTrackCandidateContext["materialSignals"][number]> = {}) => ({ category: "rebalance", state: "material", material: true, candidateAvailable: false, candidateVisible: false, suppressionReason: null, sourceAssessment: "rebalance", confidence: "proven" as const, ...over });
  const cctx = (o: { actionable?: number; info?: number; state?: OnTrackCandidateContext["candidateSetState"]; suppressed?: boolean; filtered?: boolean } = {}): OnTrackCandidateContext => ({
    visibleCandidateCount: (o.actionable ?? 0) + (o.info ?? 0),
    visibleActionableCandidateCount: o.actionable ?? 0,
    visibleInformationalCandidateCount: o.info ?? 0,
    hasHigherPriorityVisibleCandidate: (o.actionable ?? 0) > 0,
    materialSignals: [],
    suppressedMaterialSignals: o.suppressed ? [sig({ suppressionReason: "rebalance_material" })] : [],
    filteredMaterialSignals: o.filtered ? [sig({ suppressionReason: "category_filtered" })] : [],
    unresolvedPotentialSignals: [],
    candidateSetState: o.state ?? ((o.actionable ?? 0) > 0 ? "nonempty" : "empty"),
  });
  const comp = (o: { liab?: string; dedup?: string; unknown?: boolean } = {}) => ({ liabilitiesState: o.liab ?? "complete", deduplicationState: o.dedup ?? "complete", hasUnknownMagnitudeValue: o.unknown ?? false, netWorthState: "complete" } as unknown as PCResult);
  const A = (sbA: ReturnType<typeof sbAssess> | null, raA: RebalanceAssessment | null, cc: OnTrackCandidateContext, compA: PCResult | null = comp()) => otAssess({ safetyBufferAssessment: sbA, rebalanceAssessment: raA, portfolioCompleteness: compA, candidateContext: cc, generatedAt: GEN });

  // ---- Eligible narrow scope ----
  add("OT-1: buffer complete + allocation within range + authoritative + empty candidates + no material → eligible scoped status", (() => { const a = A(sbComplete(), raWithin(2), cctx()); return a.fallbackEligibilityGate === "allowed" && a.overallReadiness === "allowed" && a.presentationState === "eligible_scoped_status" && a.displayMode === "scoped_informational" && a.claimConfidence === "verified_narrow_scope" && a.claimScope === "safety_buffer_and_allocation"; })(), "eligible");
  add("OT-2: eligible only claims Safety Buffer + allocation (never a broad plan-health flag)", (() => { const a = A(sbComplete(), raWithin(0), cctx()); return a.broadPlanHealthyClaimSafe === false && a.noChangesNeedReviewClaimSafe === false && a.evaluatedDimensions.length === 5 && !a.evaluatedDimensions.includes("liabilities" as never) === false; })(), "narrow claim");

  // ---- Safety Buffer dimension ----
  add("OT-3: buffer incomplete → blocked_buffer, NOT eligible", (() => { const a = A(sbIncomplete(), raWithin(2), cctx()); return a.safetyBufferState === "incomplete" && a.bufferGate === "blocked" && a.fallbackState === "blocked_buffer" && a.presentationState === "buffer_not_complete"; })(), "incomplete blocks");
  add("OT-4: buffer below-minimum incomplete → blocked_buffer (still not verified complete)", (() => { const a = A(sbBelowMin(), raWithin(2), cctx()); return a.safetyBufferState === "incomplete" && a.fallbackState === "blocked_buffer"; })(), "below min blocks");
  add("OT-5: buffer unresolved → unresolved fallback (never a false on-track)", (() => { const a = A(sbUnresolved(), raWithin(2), cctx()); return a.safetyBufferState === "unresolved" && a.bufferGate === "unresolved" && a.fallbackEligibilityGate === "unresolved" && a.fallbackState === "unresolved"; })(), "unresolved");
  add("OT-6: buffer target unavailable → target_unavailable, not eligible", (() => { const a = A(sbTargetUnavail(), raWithin(2), cctx()); return a.safetyBufferState === "unavailable" && a.presentationState === "target_unavailable" && a.fallbackState === "unavailable"; })(), "target unavail");
  add("OT-7: buffer coverage unavailable → not verified complete, blocked", (() => { const a = A(sbCoverageUnavail(), raWithin(2), cctx()); return a.safetyBufferState === "unresolved" && a.bufferGate === "unresolved"; })(), "coverage unavail");
  add("OT-8: ONLY verified_complete satisfies the buffer dimension", (() => { const ok = A(sbComplete(), raWithin(2), cctx()).dimensions.find((d) => d.dimension === "safety_buffer")?.state === "satisfied"; const bad = A(sbIncomplete(), raWithin(2), cctx()).dimensions.find((d) => d.dimension === "safety_buffer")?.state === "satisfied"; return ok && !bad; })(), "only complete");

  // ---- Allocation (canonical) + threshold boundaries ----
  add("OT-9: allocation reads canonical current/target/delta (no recomputation)", (() => { const a = A(sbComplete(), ra({ delta: 3, calc: "allowed" }), cctx()); return a.currentCryptoPct === 63 && a.targetCryptoPct === 60 && a.cryptoDeltaPct === 3 && a.absoluteCryptoDeltaPct === 3 && a.allocationMethodologyVersion === "rebalance_assessment_1.0.0"; })(), "canonical alloc");
  add("OT-10: delta 0 → within range → eligible", A(sbComplete(), raWithin(0), cctx()).allocationState === "within_review_range", "delta 0");
  add("OT-11: +9.999 → within range", A(sbComplete(), raWithin(9.999), cctx()).allocationState === "within_review_range", "just inside +");
  add("OT-12: −9.999 → within range", A(sbComplete(), raWithin(-9.999), cctx()).allocationState === "within_review_range", "just inside -");
  add("OT-13: exact +10 → material drift → blocked (equality is material; material precedence blocks the fallback)", (() => { const a = A(sbComplete(), raMaterial(10), cctx()); return a.allocationState === "material_drift" && a.materialRebalanceNeed === true && a.fallbackEligibilityGate === "blocked" && a.fallbackState === "blocked_material_rebalance"; })(), "exact +10");
  add("OT-14: exact −10 → material drift → blocked", (() => { const a = A(sbComplete(), raMaterial(-10), cctx()); return a.allocationState === "material_drift" && a.materialRebalanceNeed === true && a.fallbackEligibilityGate === "blocked"; })(), "exact -10");
  add("OT-15: above ±10 → material drift", A(sbComplete(), raMaterial(15), cctx()).allocationState === "material_drift", "above");

  // ---- Slice 5: full canonical target confidence is an ADDITIONAL mandatory gate ----
  add("OTC-1: FULL canonical confidence + all other gates pass → On Track eligible", (() => { const a = A(sbComplete(), ra({ delta: 2, calc: "allowed", targetConfidence: "full" }), cctx()); return a.targetConfidenceGate === "allowed" && a.displayMode === "scoped_informational" && a.presentationState === "eligible_scoped_status"; })(), "full eligible");
  add("OTC-2: DEGRADED (market-excluded) target → NO On Track (targetConfidenceGate blocked, target_unavailable)", (() => { const a = A(sbComplete(), ra({ delta: 2, calc: "allowed", targetConfidence: "degraded_market_excluded" }), cctx()); return a.targetConfidenceGate === "blocked" && a.displayMode === "none" && a.presentationState === "target_unavailable" && a.blockingReasons.includes("target_confidence_not_full"); })(), "degraded no OT");
  add("OTC-3: MISSING target confidence (null) → NO On Track (targetConfidenceGate unresolved, not eligible)", (() => { const a = A(sbComplete(), ra({ delta: 2, calc: "allowed", targetConfidence: null }), cctx()); return a.targetConfidenceGate === "unresolved" && a.displayMode === "none" && a.fallbackEligibilityGate !== "allowed"; })(), "missing conf no OT");
  add("OTC-4: unavailable/blocked target (non-allowed calc + null confidence) → NO On Track", (() => { const un = A(sbComplete(), ra({ delta: null, calc: "unresolved", targetConfidence: null }), cctx()); const bl = A(sbComplete(), ra({ delta: null, calc: "blocked", targetConfidence: null }), cctx()); return un.displayMode === "none" && bl.displayMode === "none"; })(), "states no OT");
  add("OTC-5: LOADING target (no rebalance assessment yet) → NO On Track", (() => { const a = A(sbComplete(), null, cctx()); return a.displayMode === "none" && a.targetConfidence === null; })(), "loading no OT");
  add("OTC-6: +9.999 raw delta within range + FULL confidence → On Track eligible (no second ±10; canonical materiality)", (() => { const a = A(sbComplete(), ra({ delta: 9.999, calc: "allowed", targetConfidence: "full" }), cctx()); return a.allocationState === "within_review_range" && a.materialRebalanceNeed === false && a.targetConfidenceGate === "allowed" && a.displayMode === "scoped_informational"; })(), "9.999 eligible");
  add("OTC-7: exact +10 material + FULL confidence → NO On Track (material precedence; confidence never overrides materiality)", (() => { const a = A(sbComplete(), ra({ delta: 10, calc: "allowed", targetConfidence: "full" }), cctx()); return a.materialRebalanceNeed === true && a.displayMode === "none"; })(), "material blocks");
  add("OTC-8: degraded target + material rebalance → NO On Track (both block)", (() => { const a = A(sbComplete(), ra({ delta: 12, calc: "allowed", targetConfidence: "degraded_market_excluded" }), cctx()); return a.displayMode === "none"; })(), "degraded+material");
  add("OTC-9: architecture — onTrackAssessment READS ra.targetConfidence; never deriveRecommendedAllocation / buildCanonicalTargetAllocation / market cache / TargetAllocationAssessment", (() => { let s = ""; try { s = readFileSync(`${process.cwd()}/src/suggestions/onTrackAssessment.ts`, "utf8"); } catch { /* */ } return /ra\?\.targetConfidence/.test(s) && !/deriveRecommendedAllocation|buildCanonicalTargetAllocation|marketConditionsCache|deriveTargetAllocationAssessment/.test(s); })(), "reads confidence only");
  add("OTC-10: On Track copy UNCHANGED (title/description; no market words)", (() => { const a = A(sbComplete(), ra({ delta: 2, calc: "allowed", targetConfidence: "full" }), cctx()); const t = a.recommendedTitle, d = a.recommendedDescription; return t === "Your Safety Buffer and Allocation Are Within Range" && d === "Your Safety Buffer is fully funded, and your crypto allocation is within the current review range." && !/Fear|Greed|CoinMarketCap|market score|five-factor|income|expenses/i.test(t + d); })(), "copy unchanged");
  add("OTC-11: target confidence checked EXACTLY once (one targetConfidenceGate assignment in the assessment)", (() => { let s = ""; try { s = readFileSync(`${process.cwd()}/src/suggestions/onTrackAssessment.ts`, "utf8"); } catch { /* */ } return (s.match(/const targetConfidenceGate: OtGateState =/g) ?? []).length === 1; })(), "checked once");
  add("OT-16: no pre-comparison rounding at the boundary (9.999 stays within; 10 is material)", (() => { const inRange = A(sbComplete(), raWithin(9.999), cctx()).allocationState; const material = A(sbComplete(), raMaterial(10), cctx()).allocationState; return inRange === "within_review_range" && material === "material_drift"; })(), "no rounding");
  add("OT-17: threshold reused from REBALANCE_DELTA_THRESHOLD_PCT (=10), not duplicated", A(sbComplete(), raWithin(2), cctx()).reviewThresholdPct === REBALANCE_DELTA_THRESHOLD_PCT && REBALANCE_DELTA_THRESHOLD_PCT === 10, "threshold");
  add("OT-18: unresolved allocation (calc gate not allowed) → unresolved, not eligible", (() => { const a = A(sbComplete(), raUnresolved(), cctx()); return a.allocationState === "unresolved" && a.allocationGate === "unresolved" && a.fallbackEligibilityGate === "unresolved"; })(), "alloc unresolved");
  add("OT-19: unavailable target allocation → target_unavailable, not eligible", (() => { const a = A(sbComplete(), raTargetUnavail(), cctx()); return a.allocationState === "unavailable" && a.fallbackState === "unavailable"; })(), "alloc unavail");

  // ---- Material Rebalance need ----
  add("OT-20: material true + candidate exists (visible) → blocked (candidate takes precedence, still no fallback)", (() => { const a = A(sbComplete(), raMaterial(12), cctx({ actionable: 1 })); return a.fallbackEligibilityGate === "blocked" && a.fallbackState === "blocked_visible_candidate"; })(), "material+card");
  add("OT-21: material true + NO card (empty candidates) → blocked_material_rebalance (cardless)", (() => { const a = A(sbComplete(), raMaterial(12), cctx()); return a.materialRebalanceNeed === true && a.materialNeedGate === "blocked" && a.fallbackState === "blocked_material_rebalance"; })(), "cardless material");
  add("OT-22: material true via CATEGORY-FILTERED signal (rebalance within-range but a filtered proven signal) → blocked", (() => { const a = A(sbComplete(), raWithin(2), cctx({ filtered: true })); return a.hasProvenHiddenMaterialSignal === true && a.materialNeedGate === "blocked" && a.fallbackState === "blocked_material_rebalance"; })(), "filtered material");
  add("OT-23: SUPPRESSED proven material signal (staking suppressed by Rebalance) → blocks fallback", (() => { const a = A(sbComplete(), raWithin(2), cctx({ suppressed: true })); return a.materialNeedGate === "blocked"; })(), "suppressed material");
  add("OT-24: material false + no card + within range → eligible", A(sbComplete(), raWithin(2), cctx()).fallbackEligibilityGate === "allowed", "no material eligible");
  add("OT-25: material need derived from the canonical signal (isRebalanceMaterial), not a bucket delta", (() => { const a = A(sbComplete(), ra({ delta: 12, calc: "unresolved" }), cctx()); return a.materialRebalanceNeed === false && a.allocationState === "unresolved"; })(), "canonical material only");

  // ---- Accounting / liabilities ----
  add("OT-26: authoritative accounting requires calc allowed + liabilities complete + no unknown magnitude + no dedup-invalid", (() => { const a = A(sbComplete(), raWithin(2), cctx(), comp()); return a.accountingState === "authoritative" && a.accountingGate === "allowed"; })(), "authoritative");
  add("OT-27: liabilities unresolved → accounting unresolved, not eligible", (() => { const a = A(sbComplete(), raWithin(2), cctx(), comp({ liab: "unresolved" })); return a.accountingState === "unresolved" && a.fallbackEligibilityGate === "unresolved"; })(), "liab unresolved");
  add("OT-28: unknown-magnitude asset → accounting unresolved", A(sbComplete(), raWithin(2), cctx(), comp({ unknown: true })).accountingState === "unresolved", "unknown magnitude");
  add("OT-29: duplicate-invalid position → accounting blocked", (() => { const a = A(sbComplete(), raWithin(2), cctx(), comp({ dedup: "invalid" })); return a.accountingState === "blocked" && a.accountingGate === "blocked"; })(), "dedup invalid");
  add("OT-30: stale/unresolved denominator via calc gate unresolved → accounting unresolved", A(sbComplete(), ra({ delta: 2, calc: "unresolved" }), cctx()).accountingState === "unresolved", "stale/unresolved");

  // ---- Candidate context (visibility ≠ claim truth) ----
  add("OT-31: one visible ACTIONABLE candidate → blocked even when buffer+allocation healthy", (() => { const a = A(sbComplete(), raWithin(1), cctx({ actionable: 1 })); return a.candidateVisibilityGate === "blocked" && a.fallbackState === "blocked_visible_candidate"; })(), "visible candidate");
  add("OT-32: informational-only candidate does NOT block (no actionable visible)", (() => { const a = A(sbComplete(), raWithin(1), cctx({ info: 1 })); return a.visibleActionableCandidateCount === 0 && a.candidateVisibilityGate === "allowed" && a.fallbackEligibilityGate === "allowed"; })(), "info ok");
  add("OT-33: candidate set unresolved (could hide a material need) → unresolved, not eligible", (() => { const a = A(sbComplete(), raWithin(2), cctx({ state: "unresolved" })); return a.candidateVisibilityGate === "unresolved" && a.materialNeedGate === "unresolved" && a.fallbackEligibilityGate === "unresolved"; })(), "candidate unresolved");
  add("OT-34: empty candidate set alone NEVER makes the fallback eligible without buffer+allocation+accounting proof", (() => { const a = A(sbIncomplete(), raWithin(2), cctx()); return a.candidateSetState === "empty" && a.fallbackEligibilityGate !== "allowed"; })(), "emptiness != health");

  // ---- Claim scope + unevaluated dimensions ----
  add("OT-35: unevaluated dimensions recorded (goal/savings/contribution/yield/protocol_risk/diversification) — never 'healthy'", (() => { const a = A(sbComplete(), raWithin(2), cctx()); return ["goal_progress", "savings_progress", "contribution_progress", "yield_performance", "protocol_risk", "diversification"].every((d) => a.unevaluatedDimensions.includes(d)) && !a.evaluatedDimensions.includes("goal_progress" as never); })(), "unevaluated recorded");
  add("OT-36: evaluated dimensions contain ONLY supported proof (buffer/allocation/accounting/liabilities/candidate)", (() => { const a = A(sbComplete(), raWithin(2), cctx()); return JSON.stringify(a.evaluatedDimensions) === JSON.stringify(["safety_buffer", "portfolio_allocation", "portfolio_accounting", "liabilities", "candidate_visibility"]); })(), "evaluated only");
  add("OT-37: claimConfidence verified_narrow_scope ONLY when buffer + accounting + allocation all pass", (() => { const ok = A(sbComplete(), raWithin(2), cctx()).claimConfidence === "verified_narrow_scope"; const bad = A(sbComplete(), raMaterial(12), cctx()).claimConfidence === "verified_narrow_scope"; return ok && !bad; })(), "confidence scope");
  add("OT-38: 'no changes need review' is never asserted safe (broad claim unprovable)", A(sbComplete(), raWithin(2), cctx()).noChangesNeedReviewClaimSafe === false, "no-changes unsafe");

  // ---- Privacy + recommendation metadata ----
  add("OT-39: assessment exposes no wallet/account/dedupe/raw-balance identity", (() => { const s = JSON.stringify(A(sbComplete(), raWithin(2), cctx())); return !s.includes("dedupeKey") && !s.includes("stakeAccounts") && !s.includes("economicPositionKey") && !/[1-9A-HJ-NP-Za-km-z]{40,}/.test(s); })(), "privacy");
  add("OT-40: future copy recommendation is scoped, not 'Your Plan Is On Track'", (() => { const a = A(sbComplete(), raWithin(2), cctx()); return /Safety Buffer and Allocation Are Within Range/.test(a.recommendedTitle) && !/Plan Is On Track|Everything Looks Good|Portfolio Is Healthy/.test(a.recommendedTitle + a.recommendedDescription); })(), "scoped copy");

  // ---- Non-mounted + regression ----
  add("OT-41: methodologyVersion = on_track_assessment_1.0.0", A(sbComplete(), raWithin(2), cctx()).methodologyVersion === ON_TRACK_ASSESSMENT_VERSION && ON_TRACK_ASSESSMENT_VERSION === "on_track_assessment_1.0.0", "version");
  add("OT-42: assessment emits NO suggestion (no id/category/amount/action_kind)", (() => { const a = A(sbComplete(), raWithin(2), cctx()) as unknown as Record<string, unknown>; return !("id" in a) && !("category" in a) && !("amount" in a) && !("action_kind" in a) && typeof a.overallReadiness === "string"; })(), "no suggestion");
  add("OT-43 (21E): OnTrackAssessment is MOUNTED — the engine derives one assessment + one mapper in Stage B (fed by the rail)", (() => { const rd = (f: string) => { try { return readFileSync(`${process.cwd()}/${f}`, "utf8"); } catch { return ""; } }; const eng = rd("src/suggestions/engine.ts"); const rail = rd("src/suggestions/useRailSuggestions.ts"); return (eng.match(/deriveOnTrackAssessment\(/g) ?? []).length === 1 && (eng.match(/buildOnTrackCardsFromAssessment\(/g) ?? []).length === 1 && /onTrackOverride/.test(eng) && /safetyBufferAssessment, rebalanceAssessment, portfolioCompleteness/.test(rail); })(), "mounted once");
  add("OT-44 (21E): mounted legacy On Track rule removed (no deriveOnTrackSuggestion, no bucket-delta guard) + copy narrowed", (() => { const rd = (f: string) => { try { return readFileSync(`${process.cwd()}/${f}`, "utf8"); } catch { return ""; } }; const eng = rd("src/suggestions/engine.ts"); const copy = rd("src/state/approvedCopy.ts"); return !/deriveOnTrackSuggestion\(/.test(eng) && !/Your Plan Is On Track/.test(copy) && /Your Safety Buffer and Allocation Are Within Range/.test(copy); })(), "legacy removed + narrowed");
  add("OT-45: assessment re-runs NO allocation/coverage calculation (no deriveStableValue/deriveValueBreakdown/computeSafetyBufferCoverage)", (() => { const src = (() => { try { return readFileSync(`${process.cwd()}/src/suggestions/onTrackAssessment.ts`, "utf8"); } catch { return ""; } })(); return !/deriveStableValue|deriveValueBreakdown|computeSafetyBufferCoverage|deriveAllocationDeltas/.test(src); })(), "no recompute");

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 21E/21H — PRODUCTION MOUNT of On Track. Proves the ONE canonical `buildOnTrackCardsFromAssessment` mapper renders
 * the `on_track` informational card ONLY under the verified narrow scope, that the engine two-stage flow appends it
 * after the actual candidate set (never for a visible actionable candidate, never for a proven material need), that
 * an absent override fails closed, that the card is informational / no-CTA / no-modal / priority-99 / never Top Pick,
 * and that the mounted claim is the narrowed scoped copy (not "Your Plan Is On Track").
 * ------------------------------------------------------------------ */
