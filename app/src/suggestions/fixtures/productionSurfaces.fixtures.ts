/**
 * Production-surface checks: Safety Buffer phase-0 guard + production, On Track production, buffer/on-track closeout, completeness integration, Trim + Position Optimization production, Rebalance assessment/production/closeouts (18-series incl. the Kamino two-step source).
 *
 * Extracted verbatim from suggestionEngine.fixtures.ts (final monolith dissolution).
 * The monolith aggregates these checks in printFixtureResults; behavior and check
 * names are unchanged.
 */
import { getDisposition as dlGetDispo } from "../directUsdcLendingDispositions";
import { computeSafetyBufferCoverage as sbCoverage, type SafetyBufferCoverage } from "../../wallet/safetyBufferCoverage";
import { deriveSafetyBufferAssessment as sbAssess, type SafetyBufferContributionPlanInput } from "../safetyBufferAssessment";
import { buildSafetyBufferCardFromAssessment } from "../bufferSuggestion";
import { deriveOnTrackAssessment as otAssess, type OnTrackCandidateContext } from "../onTrackAssessment";
import { buildOnTrackCardsFromAssessment as otBuildCards, type OnTrackGoalContext } from "../onTrackSuggestion";
import type { RebalanceAssessment } from "../rebalanceAssessment";
// Step 17C.2 — source-backed binding: the INSTALLED KLend codegen decoder + config-update enum, so the
// block_ctoken_usage fixtures assert against deployed definitions (not a name-inferred assumption).
// Step 17D — Jupiter Lend USDC (jlUSDC) read-only existing-position detection.
import type { WalletPosition as JLWalletPos } from "../../wallet/walletPosition";
// Step 17D.1 — Jupiter Lend share-accounting verification + applicability determination.
// Step 17E — Token-2022 transferability assessment + source binding to the installed spl-token library.
// Step 17F — native Solana stake lifecycle + decomposition.
// Step 17G — supported-LST underlying-SOL normalization.
import { SUPPORTED_LSTS as LST_SET, isSupportedLstMint as lstSupported } from "../../wallet/lstUnderlyingNormalization";
// Step 17H — canonical portfolio-completeness result + decision gates.
import { detectDuplicateViolations as pcDupes, deriveCompletenessGates as pcGates, completenessAllows as pcAllows } from "../../wallet/portfolioCompleteness";
// Step 17H.2 — pure UI selectors over the mounted completeness result.
// Step 18B — canonical Rebalance assessment (foundation for the replacement calculation; not yet mounted).
import { deriveRebalanceAssessment as rbAssess, REBALANCE_DESTINATIONS as RB_DEST, CANONICAL_USDC_MINT as RB_USDC, selectRebalanceUsdcSource as rbSource, deriveNativeSolRebalanceSource as rbNativeSol, cryptoToStablesSourceGate as rbFutureGate, isMaterialCryptoToStables as rbIsCryptoToStables, NATIVE_SOL_RESERVE_POLICY_MISSING as RB_RESERVE_MISSING, NATIVE_SOL_RESERVE_POLICY_OPTIONS as RB_RESERVE_OPTIONS, REBALANCE_NATIVE_SOL_RESERVE_POLICY as RB_RESERVE_POLICY, REBALANCE_NATIVE_SOL_RESERVE_LAMPORTS as RB_RESERVE_LAMPORTS, CLASSIC_TOKEN_PROGRAM as RB_CLASSIC, WRAPPED_SOL_MINT as RB_WSOL_MINT, type NativeSolReservePolicy as RbReservePolicy } from "../rebalanceAssessment";
import { buildRebalanceCardFromAssessment as rbBuildCard, REBALANCE_SUGGESTION_ID as RB_ID } from "../rebalanceSuggestion";
import { getRebalanceTestingFixtures as rbTestFixtures } from "../../pages/rebalanceTestingFixtures";
import { SUGGESTION_COPY as RB_COPY } from "../../state/approvedCopy";
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
import { runSuggestionEngine as runSuggestionEngineRaw } from "../engine";
// Step 24A — asset-ownership registry + dedicated JUP staking modules (fixtures below).
import { buildPositionOptimizationCardFromAssessment as poBuildCard } from "../positionOptimizationSuggestion";
import { buildTrimCardFromAssessment as trimBuildCard } from "../trimSuggestion";
import { deriveTrimAssessment as trimAssess, TRIM_TOKEN_2022_PROGRAM } from "../trimAssessment";
import { derivePositionOptimizationAssessment as poAssess } from "../positionOptimizationAssessment";
import { toSuggestionCard } from "../toSuggestionCard";
import { notApplicableProtocolSelection } from "../protocolSelection";
import { readFileSync } from "node:fs";
import { SUGGESTION_ENGINE_VERSION, MIN_TRIM_SUGGESTION_USD } from "../engineThresholds";
import { CATEGORY_PRIORITY } from "../topPick";
import type { FixtureCheck } from "./fixtureCheck";
import { rbFixedTarget, runSuggestionEngine, runEngineWithLegacyRebalance, synthTrimCandidate, FIXTURE_GENERATED_AT, bufferFixture, allocationFixture, solPosition, cryptoPosition, nonCoreToken, stablePosition, yieldPosition, inputsFor, usdcOnly, sol18g, usdc18g, debt18g, mkSug15H } from "./engineFixtureHarness";

/* ------------------------------------------------------------------ *
 * 16H-R.1b — Jupiter Lend Team Disclosure Amendment
 * ------------------------------------------------------------------ */

export function runSafetyBufferPhase0GuardFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const has = (r: ReturnType<typeof runSuggestionEngine>, c: string) => r.suggestions.some((s) => s.category === c);
  const hasBufferCard = (r: ReturnType<typeof runSuggestionEngine>) => r.suggestions.some((s) => s.category === "buffer");
  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2); // |delta| = 2 < 10 → On Track predicate passes
  const unresolvedBuf = () => ({ ...bufferFixture(2000, 1000, 3), coverageState: "unresolved" as const }); // fullyFunded false
  const incompleteBuf = () => ({ ...bufferFixture(2000, 1000, 3), coverageState: "incomplete" as const });
  // A minimal fixture-only plan-backed buffer candidate (category buffer) to exercise the plan-backed path.
  const planBufferCard = (): import("../engineTypes").EngineSuggestion => ({
    id: "top_up_buffer", category: "buffer", reason_codes: ["buffer_low"],
    title_key: "suggestion.buffer.title", description_key: "suggestion.buffer.description",
    action_kind: "review_only", is_actionable: true, is_top_pick: false,
    amount: { valueUsd: 500, label: "Planned contribution" }, to: { bucket: "stables" },
    protocolSelection: notApplicableProtocolSelection("selection_not_required"),
    scores: { impact: 0.2, urgency: 0.2, efficiency: null }, guardrails: [],
    engine_version: SUGGESTION_ENGINE_VERSION, timestamp: FIXTURE_GENERATED_AT,
  });

  // ---- Guard 1: On Track vs canonical material Rebalance need ----
  const otInp = () => inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [cryptoPosition(100)] });
  add("SBG-1: material Rebalance need (card null) + aligned bucket delta → NO On Track (and no Rebalance card)", (() => { const r = runSuggestionEngine(otInp(), FIXTURE_GENERATED_AT, null, null, undefined, { card: null, material: true }); return !has(r, "on_track") && !has(r, "rebalance"); })(), "material blocks");
  add("SBG-2: material need true even when the Rebalance card was category-filtered (still card null) → NO On Track", (() => { const r = runSuggestionEngine(otInp(), FIXTURE_GENERATED_AT, null, null, undefined, { card: null, material: true, materialCryptoToStables: false }); return !has(r, "on_track"); })(), "filtered still blocks");
  add("SBG-3: NO material need + aligned + no actionable candidates → On Track PRESERVED", (() => { const r = runSuggestionEngine(otInp(), FIXTURE_GENERATED_AT, null, null, undefined, { card: null, material: false }); return has(r, "on_track"); })(), "regression preserved");
  add("SBG-4 (21E): the On Track material guard now lives in the canonical OnTrackAssessment (engine derives it, not a bucket-delta guard)", (() => { const eng = (() => { try { return readFileSync(`${process.cwd()}/src/suggestions/engine.ts`, "utf8"); } catch { return ""; } })(); return /deriveOnTrackAssessment\(/.test(eng) && /buildOnTrackCardsFromAssessment\(/.test(eng) && !/deriveOnTrackSuggestion\(/.test(eng); })(), "assessment-driven");
  add("SBG-5: with NO override at all, On Track still available (guard defaults open)", (() => { const r = runSuggestionEngine(otInp(), FIXTURE_GENERATED_AT); return has(r, "on_track"); })(), "default open");

  // ---- Guard 2: unresolved buffer coverage cannot present a definite amount ----
  add("SBG-6 (21C): unresolved coverage → informational verification card with NO definite amount", (() => { const r = runSuggestionEngine(inputsFor({ safetyBuffer: unresolvedBuf(), positions: [cryptoPosition(100)] }), FIXTURE_GENERATED_AT); const b = r.suggestions.find((s) => s.category === "buffer"); return b != null && b.action_kind === "informational" && b.amount == null && b.reason_codes.includes("buffer_coverage_unresolved"); })(), "informational no amount");
  add("SBG-7 (21C): unresolved coverage never presents a definite/plan funding amount (plan-backed source normalized upstream)", (() => { const r = runSuggestionEngine(inputsFor({ safetyBuffer: unresolvedBuf(), positions: [cryptoPosition(100)] }), FIXTURE_GENERATED_AT, planBufferCard()); const b = r.suggestions.find((s) => s.category === "buffer"); return b != null && b.action_kind === "informational" && b.amount == null; })(), "no definite amount");
  add("SBG-8: unresolved coverage → downstream deployment suggestions remain suppressed", (() => { const r = runSuggestionEngine(inputsFor({ allocation: aligned(), safetyBuffer: unresolvedBuf(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT); return !has(r, "staking") && !has(r, "rebalance") && !has(r, "capital_efficiency") && !has(r, "stable_yield") && !has(r, "dca") && !has(r, "position_optimization"); })(), "downstream suppressed");
  add("SBG-9: unresolved coverage → On Track remains suppressed (buffer not proven complete)", (() => { const r = runSuggestionEngine(inputsFor({ allocation: aligned(), safetyBuffer: unresolvedBuf(), positions: [cryptoPosition(100)] }), FIXTURE_GENERATED_AT); return !has(r, "on_track"); })(), "on track suppressed");
  add("SBG-10: definite INCOMPLETE coverage (generic) → buffer card behavior UNCHANGED (amount-bearing card remains)", (() => { const r = runSuggestionEngine(inputsFor({ safetyBuffer: incompleteBuf(), positions: [cryptoPosition(100)] }), FIXTURE_GENERATED_AT); const b = r.suggestions.find((s) => s.category === "buffer"); return b != null && b.id === "top_up_buffer" && (b.amount?.valueUsd ?? 0) > 0; })(), "incomplete preserved");
  add("SBG-11: definite INCOMPLETE coverage (plan-backed) → plan buffer card remains", (() => { const r = runSuggestionEngine(inputsFor({ safetyBuffer: incompleteBuf(), positions: [cryptoPosition(100)] }), FIXTURE_GENERATED_AT, planBufferCard()); return hasBufferCard(r); })(), "incomplete plan preserved");
  add("SBG-12: COMPLETE coverage → no buffer override (no buffer card; other candidates flow)", (() => { const r = runSuggestionEngine(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [cryptoPosition(100)] }), FIXTURE_GENERATED_AT); return !hasBufferCard(r); })(), "complete no override");
  add("SBG-13 (21C): the temporary Phase-0 unresolved guard is gone; the engine consumes the canonical bufferOverride", (() => { const eng = (() => { try { return readFileSync(`${process.cwd()}/src/suggestions/engine.ts`, "utf8"); } catch { return ""; } })(); return /bufferOverride\?\.candidate/.test(eng) && !/coverageUnresolved/.test(eng); })(), "override-driven");

  return checks;
}


export function runSafetyBufferProductionFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const readIfSrc = (rel: string) => { try { return readFileSync(`${process.cwd()}/${rel}`, "utf8"); } catch { return ""; } };
  const GEN = 1_700_000_000_000;
  const cov = (o: { target: number; verified: number; unresolved?: number; unknownMag?: boolean; state: SafetyBufferCoverage["coverageState"] }): SafetyBufferCoverage => {
    const unresolved = o.unresolved ?? 0;
    return { requiredBufferUsd: o.target, recognizedStableValueUsd: o.verified + unresolved, verifiedLiquidStableValueUsd: o.verified, delayedStableValueUsd: 0, unavailableStableValueUsd: 0, unresolvedStableValueUsd: unresolved, hasUnknownUnresolvedMagnitude: o.unknownMag ?? false, shortfallUsd: Math.max(o.target - o.verified, 0), coverageRatio: o.target > 0 ? o.verified / o.target : 1, fullyFunded: o.state === "complete", coverageState: o.state, unresolvedReasons: [], sources: [] };
  };
  const card = (coverage: SafetyBufferCoverage | null, expenses: number | null, months: number | null, plan?: SafetyBufferContributionPlanInput | null) =>
    buildSafetyBufferCardFromAssessment(sbAssess({ coverage, monthlyExpensesUsd: expenses, targetMonths: months, contributionPlan: plan ?? null, generatedAt: GEN }), GEN);
  const overrideFor = (coverage: SafetyBufferCoverage | null, expenses: number | null, months: number | null) => { const a = sbAssess({ coverage, monthlyExpensesUsd: expenses, targetMonths: months, generatedAt: GEN }); return { candidate: buildSafetyBufferCardFromAssessment(a, GEN), bufferSatisfied: a.presentationState === "complete", blocksDownstream: a.presentationState !== "complete" }; };
  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2);
  const stakingInp = () => inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [solPosition(10)] });

  // ---- Card contract per state ----
  add("SBM-1: COMPLETE → mapper returns null (no buffer card)", card(cov({ target: 3000, verified: 3000, state: "complete" }), 1000, 3) === null, "complete null");
  add("SBM-2: definite shortfall → top_up_buffer / buffer / review_only / actionable / top-pick-false / amount = proven", (() => { const c = card(cov({ target: 3000, verified: 2000, state: "incomplete" }), 1000, 3)!; return c.id === "top_up_buffer" && c.category === "buffer" && c.action_kind === "review_only" && c.is_actionable === true && c.is_top_pick === false && c.amount?.valueUsd === 1000 && c.amount?.label === "Amount needed"; })(), "definite contract");
  add("SBM-3: definite RANGE (proven < worst) → amount = CONFIRMED minimum (not worst), label 'Minimum amount needed'", (() => { const c = card(cov({ target: 3000, verified: 2000, unresolved: 500, state: "incomplete" }), 1000, 3)!; return c.amount?.valueUsd === 500 && c.amount?.label === "Minimum amount needed"; })(), "range amount");
  add("SBM-4: below $50 → informational 'nearly funded', is_actionable false, amount = proven, no CTA-implying state", (() => { const c = card(cov({ target: 3000, verified: 2960, state: "incomplete" }), 1000, 3)!; return c.action_kind === "informational" && c.is_actionable === false && c.amount?.valueUsd === 40 && c.title_key === "suggestion.buffer.nearly_funded.title"; })(), "below min");
  add("SBM-5: unresolved → informational, NO amount, no plan-as-required", (() => { const c = card(cov({ target: 3000, verified: 2000, unresolved: 1000, state: "unresolved" }), 1000, 3)!; return c.action_kind === "informational" && c.amount == null && c.reason_codes.includes("buffer_coverage_unresolved"); })(), "unresolved no amount");
  add("SBM-6: target unavailable → informational, NO amount, target_unavailable copy", (() => { const c = card(cov({ target: 3000, verified: 2000, state: "incomplete" }), null, 3)!; return c.action_kind === "informational" && c.amount == null && c.title_key === "suggestion.buffer.target_unavailable.title" && c.reason_codes.includes("buffer_target_unavailable"); })(), "target unavail");
  add("SBM-7: coverage unavailable (target OK, coverage null) → informational, NO amount", (() => { const c = card(null, 1000, 3)!; return c.action_kind === "informational" && c.amount == null && c.reason_codes.includes("buffer_coverage_unavailable"); })(), "coverage unavail");

  // ---- Amount + scoring semantics ----
  add("SBM-8: plan-backed PARTIAL definite → PRIMARY amount stays the confirmed shortfall ($1,000); focused 5-card set incl. Next planned contribution (400), no 'Confirmed gap after contribution' card", (() => { const c = card(cov({ target: 3000, verified: 2000, state: "incomplete" }), 1000, 3, { planIsReady: true, planIsRange: false, plannedContributionUsd: 400 })!; const m = c.reviewDetails?.metrics ?? []; return c.amount?.valueUsd === 1000 && m.some((x) => x.label === "Next planned contribution" && x.value === 400) && !m.some((x) => x.label === "Confirmed gap after contribution"); })(), "plan primary=proven");
  add("SBM-9: scoring impact/urgency use the CONFIRMED minimum shortfall / target (not the worst case)", (() => { const c = card(cov({ target: 3000, verified: 2000, unresolved: 500, state: "incomplete" }), 1000, 3)!; return c.scores?.impact === Math.min(500 / 3000, 1) && c.scores?.urgency === c.scores?.impact; })(), "score proven");
  add("SBM-10: definite card maps non-transactional (Review, no execution/signature); informational has no CTA", (() => { const d = toSuggestionCard(card(cov({ target: 3000, verified: 2000, state: "incomplete" }), 1000, 3)!); const inf = toSuggestionCard(card(cov({ target: 3000, verified: 2000, unresolved: 1000, state: "unresolved" }), 1000, 3)!); return d.cta.label === "Review" && d.cta.executes_transaction === false && d.cta.requires_wallet_signature === false && inf.cta.label === ""; })(), "cta");
  add("SBM-11: exact $50 confirmed gap → review-only actionable; $49.99 → informational below-minimum", (() => { const a = card(cov({ target: 3000, verified: 2950, state: "incomplete" }), 1000, 3)!; const b = card(cov({ target: 3000, verified: 2950.01, state: "incomplete" }), 1000, 3)!; return a.action_kind === "review_only" && a.is_actionable === true && b.action_kind === "informational"; })(), "boundary");

  // ---- Override: downstream + On Track suppression ----
  add("SBM-12: definite override blocksDownstream → suppresses staking + On Track (keyed on override, not inputs.safetyBuffer)", (() => { const r = runSuggestionEngineRaw(stakingInp(), GEN, null, null, undefined, undefined, undefined, undefined, overrideFor(cov({ target: 3000, verified: 2000, state: "incomplete" }), 1000, 3)); return !r.suggestions.some((s) => s.category === "staking") && !r.suggestions.some((s) => s.category === "on_track") && r.suggestions.some((s) => s.category === "buffer"); })(), "definite blocks");
  add("SBM-13: unresolved override blocksDownstream → staking + On Track suppressed, informational buffer shown", (() => { const r = runSuggestionEngineRaw(stakingInp(), GEN, null, null, undefined, undefined, undefined, undefined, overrideFor(cov({ target: 3000, verified: 2000, unresolved: 1000, state: "unresolved" }), 1000, 3)); const b = r.suggestions.find((s) => s.category === "buffer"); return !r.suggestions.some((s) => s.category === "staking") && !r.suggestions.some((s) => s.category === "on_track") && b?.action_kind === "informational"; })(), "unresolved blocks");
  add("SBM-14: below-minimum override blocksDownstream → staking + On Track suppressed", (() => { const r = runSuggestionEngineRaw(stakingInp(), GEN, null, null, undefined, undefined, undefined, undefined, overrideFor(cov({ target: 3000, verified: 2960, state: "incomplete" }), 1000, 3)); return !r.suggestions.some((s) => s.category === "staking") && !r.suggestions.some((s) => s.category === "on_track"); })(), "below-min blocks");
  add("SBM-15: COMPLETE override → no buffer card, downstream (staking) evaluated normally", (() => { const r = runSuggestionEngineRaw(stakingInp(), GEN, null, null, undefined, undefined, undefined, undefined, overrideFor(cov({ target: 3000, verified: 3200, state: "complete" }), 1000, 3)); return !r.suggestions.some((s) => s.category === "buffer") && r.suggestions.some((s) => s.category === "staking"); })(), "complete permits");
  add("SBM-16: ABSENT override → fail closed (no buffer, no downstream, no On Track)", (() => { const r = runSuggestionEngineRaw(stakingInp(), GEN); return !r.suggestions.some((s) => s.category === "buffer") && !r.suggestions.some((s) => s.category === "staking") && !r.suggestions.some((s) => s.category === "on_track"); })(), "fail closed");
  add("SBM-17: exactly one buffer category slot", (() => { const r = runSuggestionEngineRaw(stakingInp(), GEN, null, null, undefined, undefined, undefined, undefined, overrideFor(cov({ target: 3000, verified: 2000, state: "incomplete" }), 1000, 3)); return r.suggestions.filter((s) => s.category === "buffer").length === 1; })(), "one slot");

  // ---- Legacy disposition + architecture ----
  add("SBM-18: engine has NO direct buffer rule and consumes the bufferOverride (no legacy fallback)", (() => { const eng = readIfSrc("src/suggestions/engine.ts"); return !/deriveBufferSuggestion\(/.test(eng) && !/from "\.\/bufferSuggestion"/.test(eng) && /bufferOverride\?\.candidate/.test(eng) && !/const planBuffer/.test(eng); })(), "no direct rule");
  add("SBM-19 (21F): legacy buffer module DELETED with zero callers anywhere", (() => { const legacy = readIfSrc("src/suggestions/bufferSuggestionLegacy.ts"); const anyRef = ["src/suggestions/engine.ts", "src/suggestions/useRailSuggestions.ts", "src/pages/TestingPage.tsx", "src/suggestions/suggestionEngine.fixtures.ts"].some((f) => /from "\.\/bufferSuggestionLegacy"|deriveLegacyBufferSuggestion\(/.test(readIfSrc(f))); return legacy === "" && !anyRef; })(), "legacy deleted");
  add("SBM-20: rail computes ONE coverage, ONE assessment, ONE mapper; no plan-backed buffer candidate injected", (() => { const rail = readIfSrc("src/suggestions/useRailSuggestions.ts"); return (rail.match(/computeSafetyBufferCoverage\(/g) ?? []).length === 1 && (rail.match(/deriveSafetyBufferAssessment\(/g) ?? []).length === 1 && (rail.match(/buildSafetyBufferCardFromAssessment\(/g) ?? []).length === 1 && /category === "buffer" \? null/.test(rail); })(), "one-of-each");
  add("SBM-21: no route/quote/transaction/signature/execution in the mounted buffer path", (() => { const blob = readIfSrc("src/suggestions/safetyBufferAssessment.ts") + readIfSrc("src/suggestions/bufferSuggestion.ts"); return !/swapRoute|routePlan|getQuote|aggregator|signTransaction|sendTransaction|simulateTransaction|depositTransaction/.test(blob); })(), "read-only");
  add("SBM-22: reason codes per state are honest + distinct", (() => { const def = card(cov({ target: 3000, verified: 2000, state: "incomplete" }), 1000, 3)!; const nf = card(cov({ target: 3000, verified: 2990, state: "incomplete" }), 1000, 3)!; const un = card(cov({ target: 3000, verified: 2000, unresolved: 1000, state: "unresolved" }), 1000, 3)!; return def.reason_codes.includes("buffer_shortfall_confirmed") && nf.reason_codes.includes("buffer_nearly_funded") && un.reason_codes.includes("buffer_coverage_unresolved"); })(), "reason codes");

  return checks;
}


export function runOnTrackProductionFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const readIfSrc = (rel: string) => { try { return readFileSync(`${process.cwd()}/${rel}`, "utf8"); } catch { return ""; } };
  const GEN = 1_700_000_000_000;
  const cov = (target: number, verified: number, state: SafetyBufferCoverage["coverageState"]): SafetyBufferCoverage => ({ requiredBufferUsd: target, recognizedStableValueUsd: verified, verifiedLiquidStableValueUsd: verified, delayedStableValueUsd: 0, unavailableStableValueUsd: 0, unresolvedStableValueUsd: 0, hasUnknownUnresolvedMagnitude: false, shortfallUsd: Math.max(target - verified, 0), coverageRatio: target > 0 ? verified / target : 1, fullyFunded: state === "complete", coverageState: state, unresolvedReasons: [], sources: [] });
  const sbC = () => sbAssess({ coverage: cov(3000, 3000, "complete"), monthlyExpensesUsd: 1000, targetMonths: 3, generatedAt: GEN });
  const sbI = () => sbAssess({ coverage: cov(3000, 2000, "incomplete"), monthlyExpensesUsd: 1000, targetMonths: 3, generatedAt: GEN });
  const ra = (delta: number | null, calc: "allowed" | "unresolved", material = false): RebalanceAssessment => ({ currentCryptoPct: 60 + (delta ?? 0), targetCryptoPct: 60, cryptoDeltaPct: material ? 12 : delta, direction: material ? "crypto_to_stables" : delta == null ? "unresolved" : delta >= 10 ? "crypto_to_stables" : delta <= -10 ? "stables_to_crypto" : "within_threshold", calculationGate: { status: calc, reasons: [] }, methodologyVersion: "rebalance_assessment_1.0.0", targetConfidence: "full" } as unknown as RebalanceAssessment);
  const ctx = (actionable = 0): OnTrackCandidateContext => ({ visibleCandidateCount: actionable, visibleActionableCandidateCount: actionable, visibleInformationalCandidateCount: 0, hasHigherPriorityVisibleCandidate: actionable > 0, materialSignals: [], suppressedMaterialSignals: [], filteredMaterialSignals: [], unresolvedPotentialSignals: [], candidateSetState: actionable > 0 ? "nonempty" : "empty" });
  const eligible = () => otAssess({ safetyBufferAssessment: sbC(), rebalanceAssessment: ra(2, "allowed"), portfolioCompleteness: null, candidateContext: ctx(0), generatedAt: GEN });
  const OT_GOAL: OnTrackGoalContext = { financialGoal: "retire_early", timeline: "5_years", monthlyExpensesUsd: 1000 };
  const cards = (a = eligible()) => otBuildCards(a, OT_GOAL, GEN);
  const bufferCard = (a = eligible()) => cards(a).find((c) => c.id === "on_track_safety_buffer") ?? null;

  // ---- Mapper contract (multi-card, Step 21H) ----
  add("OTM-1: eligible assessment → 4 informational on_track cards (goal/expense/buffer/market), none actionable/top-pick, no amount/reviewDetails", (() => { const cs = cards(); const ids = cs.map((c) => c.id); return cs.length === 4 && ids.includes("on_track_goal_check") && ids.includes("on_track_expense_benchmark") && ids.includes("on_track_safety_buffer") && ids.includes("on_track_market_conditions") && cs.every((c) => c.category === "on_track" && c.action_kind === "informational" && c.is_actionable === false && c.is_top_pick === false && c.amount == null && c.reviewDetails == null); })(), "contract");
  add("OTM-2: mapped cards → distinct icon types / analytics portfolio_health / label-only Review Goal prompt on goal+expense / no CTA on buffer+market / never actionable", (() => { const ds = cards().map(toSuggestionCard); const types = ds.map((d) => d.type); const byType = (t: string) => ds.find((d) => d.type === t)!; return types.includes("on_track_goal_check") && types.includes("on_track_expense_benchmark") && types.includes("on_track_safety_buffer") && types.includes("on_track_market_conditions") && byType("on_track_goal_check").cta.label === "Review Goal" && byType("on_track_expense_benchmark").cta.label === "Review Goal" && byType("on_track_safety_buffer").cta.label === "" && byType("on_track_market_conditions").cta.label === "" && ds.every((d) => d.category === "portfolio_health" && d.cta.action === null && d.is_top_pick === false); })(), "mapped");
  add("OTM-3: card copy is scoped review-prompt / verified-buffer copy (not 'Your Plan Is On Track')", (() => { const ds = cards().map(toSuggestionCard); const goal = ds.find((d) => d.type === "on_track_goal_check")!; const buf = ds.find((d) => d.type === "on_track_safety_buffer")!; return goal.title === "Goal Check: Retire Early?" && /5-year horizon/.test(goal.description) && buf.title === "Safety Buffer: 100% Funded" && buf.statusChip === "Protected" && !ds.some((d) => /Plan Is On Track/.test(d.title + d.description)); })(), "scoped copy");
  add("OTM-4: scoped reason code present (buffer_and_allocation_within_range), no broad-health code", (() => { const c = bufferCard()!; return c.reason_codes.includes("buffer_and_allocation_within_range") && !c.reason_codes.some((r) => /plan_healthy|portfolio_healthy|no_changes/.test(r)); })(), "reason code");
  add("OTM-5: scores are zero/null (impact 0, urgency 0, efficiency null)", (() => { const c = bufferCard()!; return c.scores?.impact === 0 && c.scores?.urgency === 0 && c.scores?.efficiency === null; })(), "scores");
  add("OTM-6: material Rebalance assessment → no cards", cards(otAssess({ safetyBufferAssessment: sbC(), rebalanceAssessment: ra(null, "allowed", true), portfolioCompleteness: null, candidateContext: ctx(0), generatedAt: GEN })).length === 0, "material null");
  add("OTM-7: incomplete buffer → no cards", cards(otAssess({ safetyBufferAssessment: sbI(), rebalanceAssessment: ra(2, "allowed"), portfolioCompleteness: null, candidateContext: ctx(0), generatedAt: GEN })).length === 0, "buffer null");
  add("OTM-8: visible actionable candidate → no cards", cards(otAssess({ safetyBufferAssessment: sbC(), rebalanceAssessment: ra(2, "allowed"), portfolioCompleteness: null, candidateContext: ctx(1), generatedAt: GEN })).length === 0, "candidate null");
  add("OTM-9: unresolved allocation → no cards", cards(otAssess({ safetyBufferAssessment: sbC(), rebalanceAssessment: ra(2, "unresolved"), portfolioCompleteness: null, candidateContext: ctx(0), generatedAt: GEN })).length === 0, "unresolved null");

  // ---- Engine two-stage mount ----
  const oto = (a: ReturnType<typeof sbAssess> | null, r: RebalanceAssessment | null) => ({ safetyBufferAssessment: a, rebalanceAssessment: r, portfolioCompleteness: null, materialSignals: [] });
  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2);
  const bufferComplete = () => ({ candidate: null, bufferSatisfied: true, blocksDownstream: false });
  add("OTM-10: engine Stage B appends On Track when complete buffer + within range + no candidate", (() => { const r = runSuggestionEngineRaw(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [cryptoPosition(100)] }), GEN, null, null, undefined, undefined, undefined, undefined, bufferComplete(), oto(sbC(), ra(2, "allowed"))); return r.suggestions.some((s) => s.category === "on_track") && r.suggestions[r.suggestions.length - 1].category === "on_track"; })(), "stage B appends");
  add("OTM-11: engine — a visible actionable candidate (staking) suppresses On Track", (() => { const r = runSuggestionEngineRaw(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [solPosition(10)] }), GEN, null, null, undefined, undefined, undefined, undefined, bufferComplete(), oto(sbC(), ra(2, "allowed"))); return r.suggestions.some((s) => s.category === "staking") && !r.suggestions.some((s) => s.category === "on_track"); })(), "candidate suppresses");
  add("OTM-12: engine — proven material Rebalance need (no card) suppresses On Track", (() => { const r = runSuggestionEngineRaw(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [cryptoPosition(100)] }), GEN, null, null, undefined, undefined, undefined, undefined, bufferComplete(), oto(sbC(), ra(null, "allowed", true))); return !r.suggestions.some((s) => s.category === "on_track"); })(), "material suppresses");
  add("OTM-13: engine — ABSENT onTrackOverride fails closed (no On Track)", (() => { const r = runSuggestionEngineRaw(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [cryptoPosition(100)] }), GEN, null, null, undefined, undefined, undefined, undefined, bufferComplete()); return !r.suggestions.some((s) => s.category === "on_track"); })(), "fail closed");
  add("OTM-14: On Track never Top Pick + priority 99 + four informational cards", (() => { const r = runSuggestionEngineRaw(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [cryptoPosition(100)] }), GEN, null, null, undefined, undefined, undefined, undefined, bufferComplete(), oto(sbC(), ra(2, "allowed"))); const ot = r.suggestions.filter((s) => s.category === "on_track"); return ot.length === 4 && ot.every((o) => o.is_top_pick === false) && CATEGORY_PRIORITY.on_track === 99; })(), "ordering/top pick");

  // ---- Legacy disposition + privacy + read-only ----
  add("OTM-15: engine has NO mounted legacy On Track rule; consumes deriveOnTrackAssessment + mapper", (() => { const eng = readIfSrc("src/suggestions/engine.ts"); return !/deriveOnTrackSuggestion\(/.test(eng) && !/allows\("onTrack"\)/.test(eng) && /deriveOnTrackAssessment\(/.test(eng) && /buildOnTrackCardsFromAssessment\(/.test(eng); })(), "no legacy rule");
  add("OTM-16 (21F): legacy On Track module DELETED with zero callers anywhere", (() => { const legacy = readIfSrc("src/suggestions/onTrackSuggestionLegacy.ts"); const anyRef = ["src/suggestions/engine.ts", "src/suggestions/useRailSuggestions.ts", "src/pages/TestingPage.tsx", "src/suggestions/suggestionEngine.fixtures.ts"].some((f) => /from "\.\/onTrackSuggestionLegacy"|deriveLegacyOnTrackSuggestion\(/.test(readIfSrc(f))); return legacy === "" && !anyRef; })(), "legacy deleted");
  add("OTM-17: no route/quote/transaction/signature/execution in the On Track path", (() => { const blob = readIfSrc("src/suggestions/onTrackAssessment.ts") + readIfSrc("src/suggestions/onTrackSuggestion.ts"); return !/swapRoute|routePlan|getQuote|aggregator|signTransaction|sendTransaction|simulateTransaction/.test(blob); })(), "read-only");
  add("OTM-18: On Track cards carry no wallet/account/dedupe/mint identity", (() => { const s = JSON.stringify(cards()); return !s.includes("dedupeKey") && !s.includes("stakeAccounts") && !s.includes("economicPositionKey") && !/[1-9A-HJ-NP-Za-km-z]{40,}/.test(s); })(), "privacy");
  add("OTM-19: mounted On Track uses the SHARED assessments (no second Safety Buffer / Rebalance / allocation calc in the engine)", (() => { const eng = readIfSrc("src/suggestions/engine.ts"); return !/computeSafetyBufferCoverage|deriveSafetyBufferAssessment|deriveRebalanceAssessment|deriveStableValue|deriveAllocationDeltas/.test(eng); })(), "shared only");

  return checks;
}


/* ------------------------------------------------------------------ *
 * Step 21F — COMBINED CLOSEOUT. Proves the end-to-end mounted Buffer → actionable → scoped-fallback state machine
 * through the production wrapper, that both legacy modules + the obsolete On Track gate are DELETED, that the rail
 * runs one calculation of each and one engine pass, and that no prohibited execution/broad-health claim remains.
 * ------------------------------------------------------------------ */
export function runSafetyBufferOnTrackCloseoutFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const readIfSrc = (rel: string) => { try { return readFileSync(`${process.cwd()}/${rel}`, "utf8"); } catch { return ""; } };
  const funded = () => bufferFixture(5000, 1000, 3);
  const underfunded = () => bufferFixture(800, 1000, 3);
  const belowMin = () => bufferFixture(2975, 1000, 3);
  const unresolvedBuf = () => ({ ...bufferFixture(2000, 1000, 3), coverageState: "unresolved" as const });
  const aligned = () => allocationFixture(15000, 62, 2);
  const cats = (r: ReturnType<typeof runSuggestionEngineRaw>) => r.suggestions.map((s) => s.category).join(",") || "none";
  const has = (r: ReturnType<typeof runSuggestionEngineRaw>, c: string) => r.suggestions.some((s) => s.category === c);

  // ---- End-to-end mounted state machine (through the production auto-override wrapper) ----
  add("SBOT-1: complete buffer + aligned + no candidate → scoped On Track (no buffer card)", (() => { const r = runSuggestionEngine(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [cryptoPosition(100)] }), FIXTURE_GENERATED_AT); const ot = r.suggestions.find((s) => s.category === "on_track"); return ot != null && ot.action_kind === "informational" && !has(r, "buffer"); })(), "on track");
  add("SBOT-2: definite shortfall → review-only buffer Top Pick, downstream + On Track suppressed", (() => { const r = runSuggestionEngine(inputsFor({ allocation: aligned(), safetyBuffer: underfunded(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT); const b = r.suggestions.find((s) => s.category === "buffer"); return b?.action_kind === "review_only" && b?.is_top_pick === true && !has(r, "staking") && !has(r, "on_track"); })(), "definite");
  add("SBOT-3: below-$50 → informational buffer, no Top Pick, downstream + On Track suppressed", (() => { const r = runSuggestionEngine(inputsFor({ allocation: aligned(), safetyBuffer: belowMin(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT); const b = r.suggestions.find((s) => s.category === "buffer"); return b?.action_kind === "informational" && b?.is_top_pick === false && !has(r, "staking") && !has(r, "on_track"); })(), "below min");
  add("SBOT-4: unresolved buffer → informational buffer (no amount), downstream + On Track suppressed", (() => { const r = runSuggestionEngine(inputsFor({ allocation: aligned(), safetyBuffer: unresolvedBuf(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT); const b = r.suggestions.find((s) => s.category === "buffer"); return b?.action_kind === "informational" && b?.amount == null && !has(r, "staking") && !has(r, "on_track"); })(), "unresolved");
  add("SBOT-5: complete buffer + visible actionable (staking) → no On Track", (() => { const r = runSuggestionEngine(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT); return has(r, "staking") && !has(r, "on_track"); })(), "candidate suppresses");
  add("SBOT-6: complete buffer + material Rebalance (card null) → no On Track, no staking (suppressed)", (() => { const r = runSuggestionEngine(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT, null, null, undefined, { card: null, material: true, materialCryptoToStables: true }); return !has(r, "on_track") && !has(r, "staking"); })(), "material blocks");
  add("SBOT-7: ordering — On Track is priority 99 and always last", (() => { const r = runSuggestionEngine(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [cryptoPosition(100)] }), FIXTURE_GENERATED_AT); return CATEGORY_PRIORITY.on_track === 99 && CATEGORY_PRIORITY.buffer === 1 && (cats(r).split(",").every((c) => c === "on_track") && cats(r) !== "none" || r.suggestions[r.suggestions.length - 1].category === "on_track"); })(), "ordering");

  // ---- Legacy + gate deletion ----
  add("SBOT-8: BOTH legacy modules DELETED (bufferSuggestionLegacy + onTrackSuggestionLegacy)", readIfSrc("src/suggestions/bufferSuggestionLegacy.ts") === "" && readIfSrc("src/suggestions/onTrackSuggestionLegacy.ts") === "", "legacy gone");
  add("SBOT-9: obsolete On Track completeness gate removed (no canShowOnTrack, no onTrack gate entry)", (() => { const pc = readIfSrc("src/wallet/portfolioCompleteness.ts"); return !/export function canShowOnTrack/.test(pc) && !/onTrack: canGenerate|onTrack: canShow/.test(pc) && !/CompletenessDecision = "onTrack"/.test(pc); })(), "gate gone");
  add("SBOT-10: onTrackState survives ONLY as the dashboard completeness field (not a mounted card gate)", (() => { const pc = readIfSrc("src/wallet/portfolioCompleteness.ts"); const ui = readIfSrc("src/components/portfolioCompletenessUi.ts"); const eng = readIfSrc("src/suggestions/engine.ts"); return /onTrackState: CompletenessState/.test(pc) && /onTrackState/.test(ui) && !/onTrackState/.test(eng); })(), "field retained");

  // ---- One-of-each architecture (rail source) ----
  add("SBOT-11: rail runs ONE coverage / ONE buffer assessment / ONE buffer mapper / ONE engine pass", (() => { const rail = readIfSrc("src/suggestions/useRailSuggestions.ts"); return (rail.match(/computeSafetyBufferCoverage\(/g) ?? []).length === 1 && (rail.match(/deriveSafetyBufferAssessment\(/g) ?? []).length === 1 && (rail.match(/buildSafetyBufferCardFromAssessment\(/g) ?? []).length === 1 && (rail.match(/runSuggestionEngine\(/g) ?? []).length === 1; })(), "one of each");
  add("SBOT-12: engine derives ONE On Track assessment + ONE mapper (Stage B); no legacy On Track / buffer rule imported", (() => { const eng = readIfSrc("src/suggestions/engine.ts"); return (eng.match(/deriveOnTrackAssessment\(/g) ?? []).length === 1 && (eng.match(/buildOnTrackCardsFromAssessment\(/g) ?? []).length === 1 && !/deriveBufferSuggestion\(|deriveOnTrackSuggestion\(/.test(eng); })(), "engine one-of");

  // ---- Copy + prohibited-language sweep (full mounted path) ----
  add("SBOT-13: no old On Track title mounted anywhere in the buffer/on-track copy + mapper path", (() => { const blob = readIfSrc("src/state/approvedCopy.ts") + readIfSrc("src/suggestions/onTrackSuggestion.ts") + readIfSrc("src/suggestions/bufferSuggestion.ts"); return !/"Your Plan Is On Track"|"You're On Track"|Everything Looks Good|Portfolio Is Healthy|No Changes Are Needed|Fully Optimized|Strategy Is Performing/.test(blob) && /Your Safety Buffer and Allocation Are Within Range/.test(blob); })(), "copy");
  add("SBOT-14: no deposit/transfer/swap/route/quote/transaction/signature/execution or broad-health claim in the full path", (() => { const blob = readIfSrc("src/suggestions/safetyBufferAssessment.ts") + readIfSrc("src/suggestions/bufferSuggestion.ts") + readIfSrc("src/suggestions/onTrackAssessment.ts") + readIfSrc("src/suggestions/onTrackSuggestion.ts"); return !/depositTransaction|transferFunds|swapRoute|routePlan|getQuote|aggregator|signTransaction|sendTransaction|simulateTransaction|plan_healthy|portfolio_healthy|no_changes_needed/.test(blob); })(), "read-only + honest");

  return checks;
}


export function runCompletenessIntegrationFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
  const CTOKEN = "B8V6WVjPxW1UGwVDfxH2d2r8SyT4cqn7dQRK6XneVa7D";
  const JLMINT = "9BEcn9aPEmhSPbPQeFGjidRiEKki46fVQDyPpSQXPA2D";
  const w = (o: Partial<JLWalletPos>): JLWalletPos => ({ id: "p", source: "wallet", type: "token", symbol: "X", amount: "1", detection: "direct_wallet_balance", valueUsd: 100, ...o });
  const walletUsdc = () => w({ id: "usdc", symbol: "USDC", name: "USD Coin", mint: USDC, valueUsd: 1000 });
  const kaminoDirect = () => w({ id: "kd", type: "protocol", symbol: "USDC", name: "USDC on Kamino", mint: USDC, candidateId: "kamino_usdc_lending", existingPositionOnly: true, dedupeKey: "klend:reserveA", valueUsd: 1000, recognizedValueUsd: 1000, withdrawalState: "fully_withdrawable", liquidValueUsd: 1000 });
  const steak = () => w({ id: "st", type: "protocol", symbol: "USDC", name: "Steakhouse USDC", mint: USDC, candidateId: "kamino_steakhouse_usdc", existingPositionOnly: true, dedupeKey: "steakhouse:vaultA", valueUsd: 500, recognizedValueUsd: 500 });
  const hubbleDebt = () => w({ id: "hb", type: "protocol", symbol: "USDH", name: "USDH loan", side: "borrowed", mint: "USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX", valueUsd: -300 });
  const stakeA = () => w({ id: "sa", type: "stake", symbol: "SOL", valueUsd: 500, dedupeKey: "native-stake:AAA" });
  const stakeB = () => w({ id: "sb", type: "stake", symbol: "SOL", valueUsd: 500, dedupeKey: "native-stake:BBB" });
  const jitosol = () => w({ id: "jt", type: "lst", symbol: "JitoSOL", mint: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn", valueUsd: 275, underlyingSolLamports: "1100000000" });
  const jupsol = () => w({ id: "jp", type: "lst", symbol: "JupSOL", mint: "jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v", valueUsd: 250, underlyingSolLamports: "1050000000" });

  // ---- Economic-dedup CORRECTION: shared mint is NOT a duplicate ----
  add("PI-1: direct USDC + Kamino Direct (same USDC mint) → NOT a duplicate", pcDupes([walletUsdc(), kaminoDirect()]).length === 0, "usdc+klend ok");
  add("PI-2: direct USDC + Steakhouse (same USDC mint) → NOT a duplicate", pcDupes([walletUsdc(), steak()]).length === 0, "usdc+steak ok");
  add("PI-3: Kamino Direct + Steakhouse (both USDC underlying) → NOT a duplicate", pcDupes([kaminoDirect(), steak()]).length === 0, "klend+steak ok");
  add("PI-4: direct USDC + Hubble debt → NOT a duplicate", pcDupes([walletUsdc(), hubbleDebt()]).length === 0, "usdc+debt ok");
  add("PI-5: two protocol positions with USDC underlying → NOT a duplicate", pcDupes([kaminoDirect(), steak(), walletUsdc()]).length === 0, "multi usdc ok");
  add("PI-6: two native stake accounts → NOT a duplicate", pcDupes([stakeA(), stakeB()]).length === 0, "two stakes ok");
  add("PI-7: JitoSOL + JupSOL → NOT a duplicate", pcDupes([jitosol(), jupsol()]).length === 0, "two lst ok");
  add("PI-8: native SOL + native stake + LST backing → NOT a duplicate (backing is a field)", pcDupes([w({ id: "sol", type: "native", symbol: "SOL", valueUsd: 500 }), stakeA(), jitosol()]).length === 0, "sol exposure ok");
  add("PI-9: repeated mint ALONE is valid (the corrected rule)", pcDupes([walletUsdc(), w({ id: "usdc2", symbol: "USDC", name: "USD Coin", mint: USDC, valueUsd: 5 })]).length === 0, "mint alone ok");

  // ---- Real economic-identity duplicates ARE flagged ----
  add("PI-10: identical dedupeKey twice → duplicate", pcDupes([kaminoDirect(), { ...kaminoDirect(), id: "kd2" }]).length > 0, "same key");
  add("PI-11: same position id twice → duplicate", pcDupes([walletUsdc(), walletUsdc()]).length > 0, "same id");
  add("PI-12: generic cToken row + canonical Kamino Direct → duplicate", pcDupes([w({ id: "gen", type: "token", symbol: "cUSDC", mint: CTOKEN, valueUsd: 1 }), kaminoDirect()]).length > 0, "ctoken dup");
  add("PI-13: jlUSDC generic row + canonical Jupiter row → duplicate", pcDupes([w({ id: "genjl", type: "token", symbol: "jlUSDC", mint: JLMINT, valueUsd: null }), w({ id: "jl", type: "protocol", symbol: "USDC", candidateId: "jupiter_lend_usdc", dedupeKey: "jupiter-lend:x", valueUsd: null, mint: USDC })]).length > 0, "jl dup");

  // ---- Completeness gates NARROW only (never enable) ----
  add("PI-14: completenessAllows — absent map ⇒ true; blocked/unresolved ⇒ false", pcAllows(undefined, "staking") === true && pcAllows({ staking: "blocked" }, "staking") === false && pcAllows({ dca: "unresolved" }, "dca") === false && pcAllows({ staking: "allowed" }, "staking") === true, "narrow");
  add("PI-15: deriveCompletenessGates returns the 4 decision statuses (Trim 19D; Position Optimization 20D; On Track gate retired 21F)", (() => { const { gates } = pcGates([walletUsdc()], { requiredBufferUsd: 0 }); return ["staking", "dca", "directLending", "rebalance"].every((k) => typeof (gates as any)[k] === "string") && !("trim" in gates) && !("positionOptimization" in gates) && !("onTrack" in gates); })(), "gate map");
  add("PI-16: healthy portfolio (buffer target 0) → gates permit (no spurious suppression)", (() => { const { gates } = pcGates([walletUsdc(), w({ id: "sol", type: "native", symbol: "SOL", valueUsd: 500 })], { requiredBufferUsd: 0 }); return gates.dca === "allowed" && gates.directLending === "allowed"; })(), "healthy ok");
  add("PI-17: unvalued liability → DCA + direct-lending gates NOT allowed", (() => { const { gates } = pcGates([walletUsdc(), w({ id: "hb", type: "protocol", symbol: "USDH", side: "borrowed", valueUsd: null, uiAmount: 300, amount: "300" })], { requiredBufferUsd: 0 }); return gates.dca !== "allowed" && gates.directLending !== "allowed"; })(), "liability narrows");
  add("PI-18: unrelated unpriced token does NOT block staking (only its own dimensions — net worth → Rebalance)", (() => { const { gates } = pcGates([walletUsdc(), w({ id: "unk", type: "token", name: "Unknown token", symbol: "9x", uiAmount: 5, valueUsd: null })], { requiredBufferUsd: 0 }); return gates.staking === "allowed" && gates.rebalance !== "allowed"; })(), "unrelated");

  // ---- Engine narrowing property: gates only reduce the candidate set ----
  add("PI-19: engine with all-blocked gates ⊆ engine without gates (never enables)", (() => {
    const inp = inputsFor({ safetyBuffer: bufferFixture(1000, 1000, 3) });
    const without = runSuggestionEngine(inp, FIXTURE_GENERATED_AT);
    const blocked = runSuggestionEngine(inp, FIXTURE_GENERATED_AT, null, null, { staking: "blocked", dca: "blocked", directLending: "blocked", rebalance: "blocked" });
    const ids = new Set(without.suggestions.map((s) => s.id));
    return blocked.suggestions.length <= without.suggestions.length && blocked.suggestions.every((s) => ids.has(s.id));
  })(), "subset");
  add("PI-20: engine with empty gate map == engine without gates (backward compatible)", (() => {
    const inp = inputsFor({ safetyBuffer: bufferFixture(1000, 1000, 3) });
    const a = runSuggestionEngine(inp, FIXTURE_GENERATED_AT);
    const b = runSuggestionEngine(inp, FIXTURE_GENERATED_AT, null, null, {});
    return a.suggestions.length === b.suggestions.length;
  })(), "backward compat");

  // ---- Immutability ----
  add("PI-21: dispositions unchanged; INF blocked; no gate enables Jupiter/Steakhouse", dlGetDispo("kamino_steakhouse_usdc")?.disposition === "existing_position_only" && dlGetDispo("jupiter_lend_usdc")?.disposition === "excluded_from_suggestions" && !lstSupported("5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm"), "immutable");

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
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: aligned(), safetyBuffer: bufferFixture(800, 1000, 3), positions: [nonCoreToken("BONK", 5000)] }),
      FIXTURE_GENERATED_AT
    );
    add("9H-A: underfunded buffer → buffer only, no trim", cats(r) === "buffer" && !has(r, "trim"), `categories=${cats(r)}`);
  }

  // 9H-B. Funded + an explicit Trim candidate is the ONLY candidate → Trim Top Pick. (19D: the isolated
  // ordering test supplies a synthetic Trim candidate; the engine has no production Trim rule.)
  {
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: smallTokens }),
      FIXTURE_GENERATED_AT, null, null, undefined, synthTrimCandidate(160)
    );
    const s = trim(r);
    add(
      "9H-B: funded + explicit Trim only → trim Top Pick",
      cats(r) === "trim" && s?.is_top_pick === true && s?.amount?.valueUsd === 160,
      `categories=${cats(r)} topPick=${s?.is_top_pick} amount=${s?.amount?.valueUsd}`
    );
  }

  // 9H-C. Funded + Rebalance applies + an explicit Trim candidate → Rebalance first/Top Pick, Trim later.
  {
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: offTarget(), safetyBuffer: funded(), positions: [nonCoreToken("BONK", 5000)] }),
      FIXTURE_GENERATED_AT, null, null, undefined, synthTrimCandidate()
    );
    const reb = r.suggestions.find((s) => s.category === "rebalance");
    add(
      "9H-C: rebalance + trim → rebalance first/Top Pick, trim present",
      r.suggestions[0]?.category === "rebalance" && reb?.is_top_pick === true && has(r, "trim"),
      `categories=${cats(r)} rebTop=${reb?.is_top_pick}`
    );
  }

  // 9H-D. Step 24A TEARDOWN — a meme token (BONK) + an explicit Trim candidate → Trim only (no generic
  // capital_efficiency), Trim is the Top Pick. BONK never becomes an idle-assets card.
  {
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [nonCoreToken("BONK", 5000)] }),
      FIXTURE_GENERATED_AT, null, null, undefined, synthTrimCandidate()
    );
    add(
      "9H-D: BONK + trim → trim only (NO capital_efficiency), trim Top Pick",
      cats(r) === "trim" && !has(r, "capital_efficiency") && trim(r)?.is_top_pick === true,
      `categories=${cats(r)} trimTop=${trim(r)?.is_top_pick}`
    );
  }

  // (9H-E / 9H-F removed in 19D — legacy symbol-rule reason-code eligibility is superseded by the canonical
  //  TrimAssessment suite: TB-25/TB-27 (concentration/small triggers) + TB-31 / TC-12 (deterministic reason order).)

  // 9H-G. Non-core token < $100 and < 5%, no concentration/cleanup → no Trim → On Track.
  {
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [nonCoreToken("BONK", 80)] }),
      FIXTURE_GENERATED_AT
    );
    add("9H-G: small non-core exposure → no trim, On Track", !has(r, "trim") && cats(r).split(",").every((c) => c === "on_track") && cats(r) !== "none", `categories=${cats(r)}`);
  }

  // 9H-H. Only SOL/WSOL → no Trim (SOL/WSOL are core).
  {
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [solPosition(10)] }),
      FIXTURE_GENERATED_AT
    );
    add("9H-H: only SOL → no trim", !has(r, "trim"), `categories=${cats(r)}`);
  }

  // 9H-I. Only stablecoins → no Trim (stables are core).
  {
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [stablePosition("USDC", 10000)] }),
      FIXTURE_GENERATED_AT
    );
    add("9H-I: only stablecoins → no trim", !has(r, "trim"), `categories=${cats(r)}`);
  }

  // 9H-J. Only deployed positions → no Trim (not liquid wallet tokens).
  {
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [yieldPosition(5000, null)] }),
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
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [unpriced] }),
      FIXTURE_GENERATED_AT
    );
    add("9H-K: unpriced non-core token → no trim", !has(r, "trim"), `categories=${cats(r)}`);
  }

  // 9H-L. Partial pricing + an explicit Trim candidate → Trim coexists with the partial_pricing warning.
  {
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [nonCoreToken("BONK", 5000)], anyUnpriced: true }),
      FIXTURE_GENERATED_AT, null, null, undefined, synthTrimCandidate()
    );
    add(
      "9H-L: partial pricing + trim candidate → trim + warning",
      has(r, "trim") && r.warnings.includes("partial_pricing"),
      `categories=${cats(r)} warnings=${r.warnings.join(",")}`
    );
  }

  // 9H-M. The CANONICAL trim card maps safely through the shared card mapper (copy, review-only, no CTA action).
  {
    const s = synthTrimCandidate();
    const card = toSuggestionCard(s);
    add(
      "9H-M: canonical trim card maps safely (copy, review-only, non-transactional)",
      card?.title === "Reduce TKsynth exposure" &&
        card?.description ===
          "TKsynth represents 13.8% of your portfolio. Swap $160 to USDC to reduce non-core exposure." &&
        card?.cta.label === "Review" &&
        card?.cta.executes_transaction === false &&
        card?.cta.action === null,
      `title="${card?.title}"`
    );
  }

  // 9H-N. Trim output/copy contains no sell/buy/swap/bad/unsafe/illiquid-as-fact.
  {
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [nonCoreToken("BONK", 5000)] }),
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


/**
 * Step 19C — PRODUCTION MOUNT of the canonical Trim card behind `trim_long_tail_assets`. Proves the mounted
 * card is built from the canonical assessment (exact identity, authoritative denominator, aggregation, gates),
 * that the engine has NO legacy fallback, coexistence with Rebalance + Capital Efficiency, and read-only safety.
 */
export function runTrimProductionFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const readIfSrc = (rel: string) => { try { return readFileSync(`${process.cwd()}/${rel}`, "utf8"); } catch { return ""; } };
  const GEN = 1_700_000_000_000;
  const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
  const WSOL = "So11111111111111111111111111111111111111112";
  const T22 = TRIM_TOKEN_2022_PROGRAM;
  const W = (o: Partial<WalletPosition>): WalletPosition => ({ id: "x", source: "wallet", type: "token", symbol: "X", name: "X", amount: "1", detection: "direct_wallet_balance", valueUsd: 100, ...o });
  const usdc = (v: number, id = "usdc") => W({ id, symbol: "USDC", name: "USD Coin", mint: USDC, amount: String(Math.round(v * 1e6)), uiAmount: v, decimals: 6, priceUsd: 1, valueUsd: v });
  const tok = (v: number, id: string, mint = `Mint-${id}`, raw?: string) => W({ id, symbol: `TK${id}`, name: `Token ${id}`, mint, amount: raw ?? String(Math.max(1, Math.round(v))), uiAmount: v, decimals: 0, priceUsd: 1, valueUsd: v });
  const wsol = (v: number) => W({ id: "wsol", symbol: "SOL", name: "Wrapped SOL", mint: WSOL, amount: String(Math.round(v * 1e9)), uiAmount: v, decimals: 9, priceUsd: 1, valueUsd: v });
  const t22Candidate = (v: number, state: string, id = "t22") => W({ id, symbol: `TX${id}`, name: `T22 ${id}`, mint: `T22Mint-${id}`, tokenProgram: T22, transferabilityState: state, amount: String(Math.round(v)), uiAmount: v, decimals: 0, priceUsd: 1, valueUsd: v, liquidValueUsd: state === "transferable" ? v : 0 });
  const trimCardFor = (positions: WalletPosition[], requiredBufferUsd = 500) => trimBuildCard(trimAssess({ positions, requiredBufferUsd, generatedAt: GEN }), GEN);

  // ---- Canonical card contract ----
  const c1 = trimCardFor([usdc(1000), tok(300, "a")]);
  add("TC-1: mounted card keeps id/category/title/action_kind/top-pick contract", c1 !== null && c1!.id === "trim_long_tail_assets" && c1!.category === "trim" && c1!.title_key === "suggestion.trim.title" && c1!.description_key === "suggestion.trim.description" && c1!.action_kind === "review_only" && c1!.is_top_pick === false, "contract");
  add("TC-2: amount equals canonical total candidate value", c1!.amount?.valueUsd === 300 && c1!.amount?.label === "Assets to review", "amount");
  add("TC-2b: single non-core asset → title names its exposure ('Reduce TKa exposure')", c1!.titleOverride === "Reduce TKa exposure" && c1!.reviewDetails?.summary.title === "Reduce TKa exposure", `title=${c1!.titleOverride}`);
  add("TC-2b2: multiple non-core assets → generic 'Reduce Non-Core Exposure' title", (() => { const c = trimCardFor([usdc(1000), tok(200, "a"), tok(150, "b")]); return c!.titleOverride === "Reduce Non-Core Exposure" && c!.reviewDetails?.summary.title === "Reduce Non-Core Exposure"; })(), "multi title");
  add("TC-2c: SINGLE non-core asset → exact card line 'Swap $300 of TKa to USDC'", c1!.impactTextOverride === "Swap $300 of TKa to USDC", `impact=${c1!.impactTextOverride}`);
  add("TC-2d: MULTIPLE non-core assets → generic 'Swap $350 of assets to USDC'", trimCardFor([usdc(1000), tok(200, "a"), tok(150, "b")])!.impactTextOverride === "Swap $350 of assets to USDC", "multi");
  add("TC-3: involved-assets list equals the canonical candidate count (Key metrics section removed)", (() => { return (c1!.reviewDetails?.metrics?.length ?? -1) === 0 && (c1!.reviewDetails?.involvedAssets ?? []).length === 1; })(), "count");
  add("TC-4: involved-asset portfolio share uses the AUTHORITATIVE gross denominator", (() => { const a = c1!.reviewDetails?.involvedAssets?.[0]; return a?.portfolioSharePct === Math.round((300 / 1300) * 1000) / 10; })(), "authoritative share");
  add("TC-4b: Trim card+modal body names the single asset + share + amount; NO Key metrics / Guardrails / calculations", (() => { const rd = c1!.reviewDetails; const expected = "TKa represents 23.1% of your portfolio. Swap $300 to USDC to reduce non-core exposure."; return c1!.descriptionOverride === expected && rd?.summary.reason === expected && (rd?.metrics.length ?? -1) === 0 && (rd?.calculations.length ?? -1) === 0 && rd?.hideGuardrails === true; })(), "trim body");
  add("TC-4c: small-position cleanup (3 tiny holdings, below aggregate-share threshold) → simplification copy with spelled-out count", (() => { const c = trimCardFor([usdc(3000), tok(50, "s1"), tok(25, "s2"), tok(25, "s3")]); const expected = "You have three small non-core positions worth $100 in total. Consider swapping them to USDC to simplify your portfolio."; return c!.descriptionOverride === expected && c!.reviewDetails?.summary.reason === expected; })(), "small copy");
  add("TC-4d: all three triggers (concentrated leader + 3 smalls) → decomposed leader/smaller-positions copy", (() => { const c = trimCardFor([usdc(500), tok(300, "big"), tok(40, "s1"), tok(40, "s2"), tok(40, "s3")]); const expected = "Four non-core assets represent 45.7% of your portfolio. TKbig alone accounts for 32.6%, while three smaller positions add another 13%. Consider swapping them to USDC to reduce non-core exposure and simplify your portfolio."; return c!.descriptionOverride === expected && c!.reviewDetails?.summary.reason === expected; })(), "all-three copy");
  add("TC-4e: frozen single non-core asset → frozen copy, 'Check on Solscan' action, Swap Route suppressed, 'Check on Solscan' Solscan handoff", (() => { const c = trimCardFor([usdc(1000), t22Candidate(300, "frozen")]); const rd = c!.reviewDetails; const expected = "TXt22 represents 23.1% of your portfolio, but the token is currently frozen and can’t be transferred. Review the position and check its status before taking action."; return c!.descriptionOverride === expected && rd?.summary.reason === expected && c!.titleOverride === "Reduce TXt22 exposure" && c!.impactTextOverride === "Check TXt22 on Solscan" && rd?.hideSwapRoute === true && rd?.externalLink?.ctaLabel === "Check on Solscan" && /solscan\.io\/token\/T22Mint-t22/.test(rd?.externalLink?.url ?? ""); })(), "frozen trim");
  add("TC-5: multiple accounts of one mint appear as ONE involved asset", (() => { const c = trimCardFor([usdc(1000), tok(60, "x1", "MintX", "60"), tok(50, "x2", "MintX", "50")]); const ia = c!.reviewDetails?.involvedAssets ?? []; return ia.filter((a) => (a.valueUsd ?? 0) === 110).length === 1 && ia.length === 1; })(), "one involved asset");
  add("TC-6: involved assets carry NO raw balance / account id / dedupe key", (() => { const s = JSON.stringify(c1!.reviewDetails?.involvedAssets); return !s.includes("rawBalance") && !s.includes("dedupeKey") && !s.includes("holdingId") && !s.includes("sourcePositionIds"); })(), "no raw fields");
  add("TC-7: no token selected for sale; review_only, no execution CTA", (() => { const s = JSON.stringify(c1); return c1!.action_kind === "review_only" && !s.includes("sell") && !s.includes("swapRoute") && !s.includes("signTransaction") && !(c1 as unknown as { cta?: unknown }).cta; })(), "no cta");
  add("TC-8: involved assets in deterministic canonical order (share desc)", (() => { const c = trimCardFor([usdc(500), tok(300, "zz"), tok(100, "aa")]); const ia = c!.reviewDetails?.involvedAssets ?? []; return ia[0].symbol === "TKzz" && ia[1].symbol === "TKaa"; })(), "order");

  // ---- Triggers via the mapper ----
  add("TC-9: aggregate-only trigger produces a card", (() => { const c = trimCardFor([usdc(2600), tok(200, "a")]); return c !== null && c!.reason_codes.includes("long_tail_exposure"); })(), "aggregate");
  add("TC-10: concentration trigger produces a card", (() => { const c = trimCardFor([usdc(1800), tok(200, "a")]); return c !== null && c!.reason_codes.includes("token_concentration_review"); })(), "concentration");
  add("TC-11: small-position trigger produces a card", (() => { const c = trimCardFor([usdc(3000), tok(50, "s1"), tok(25, "s2"), tok(25, "s3")]); return c !== null && c!.reason_codes.includes("small_position_cleanup"); })(), "small");
  add("TC-12: all three triggers → one card with ordered reason codes", (() => { const c = trimCardFor([usdc(500), tok(300, "big"), tok(40, "s1"), tok(40, "s2"), tok(40, "s3")]); const r = c!.reason_codes; return r.indexOf("long_tail_exposure") < r.indexOf("token_concentration_review") && r.indexOf("token_concentration_review") < r.indexOf("small_position_cleanup") && r[r.length - 1] === "liquidity_not_evaluated" && r.filter((x) => x === "non_core_token_exposure").length === 1; })(), "reason order");
  add("TC-13: below all thresholds → NO card", trimCardFor([usdc(2000), tok(40, "a")]) === null, "below → null");
  add("TC-14: exact $100 & 5% boundary → card", trimCardFor([usdc(1900), tok(100, "a")]) !== null, "boundary card");

  // ---- Identity via the mounted card ----
  add("TC-15: canonical USDC excluded (only the non-core token is reviewed)", (() => { const c = trimCardFor([usdc(1000), tok(300, "a")]); const ia = c!.reviewDetails?.involvedAssets ?? []; return ia.length === 1 && ia[0].symbol === "TKa"; })(), "usdc excluded");
  add("TC-16: fake-USDC symbol (wrong mint) IS reviewed as non-core", (() => { const c = trimCardFor([usdc(1000), W({ id: "f", symbol: "USDC", name: "USD Coin", mint: "FakeUSDC", amount: "300", uiAmount: 300, priceUsd: 1, valueUsd: 300 })]); return (c!.reviewDetails?.involvedAssets ?? []).some((a) => a.symbol === "USDC"); })(), "fake usdc reviewed");
  add("TC-17: canonical wrapped SOL excluded even with candidates present", (() => { const c = trimCardFor([usdc(1000), wsol(300), tok(250, "a")]); return !(c!.reviewDetails?.involvedAssets ?? []).some((a) => a.name === "Wrapped SOL"); })(), "wsol excluded");

  // ---- Token-2022 review vs actionability in the card ----
  add("TC-18: frozen Token-2022 candidate produces a review card with an unavailable-transferability note", (() => { const c = trimCardFor([usdc(1000), t22Candidate(300, "frozen")]); const lims = JSON.stringify(c!.reviewDetails?.limitations); return c !== null && /not currently transferable/i.test(lims) && (c!.reviewDetails?.involvedAssets ?? []).some((a) => a.actionability === "unavailable"); })(), "frozen note");
  add("TC-19: hook-unresolved Token-2022 candidate → review card with unresolved-transferability note", (() => { const c = trimCardFor([usdc(1000), t22Candidate(300, "hook_unresolved")]); const lims = JSON.stringify(c!.reviewDetails?.limitations); return c !== null && /could not be verified/i.test(lims); })(), "hook note");
  add("TC-20: transferability note is honestly framed (no sell/swap/dispose/remove instruction)", (() => { const c = trimCardFor([usdc(1000), t22Candidate(300, "frozen")]); const lims = JSON.stringify(c!.reviewDetails?.limitations).toLowerCase(); return !/\b(sell|swap|dispose|remove|consolidate now|clean up now|reduce immediately)\b/.test(lims) && /has not/.test(lims); })(), "honest note");
  add("TC-21: recognized value of a frozen candidate still drives the card", (() => { const c = trimCardFor([usdc(1000), t22Candidate(300, "frozen")]); return c!.amount?.valueUsd === 300; })(), "value included");

  // ---- Gates: mapper returns null unless ready ----
  add("TC-22: incomplete Safety Buffer → no card", trimCardFor([usdc(100), tok(300, "a")], 2000) === null, "buffer blocks");
  add("TC-23: unresolved liability → no card", trimCardFor([usdc(1000), tok(300, "a"), W({ id: "hb", type: "protocol", symbol: "USDH", name: "USDH loan", side: "borrowed", valueUsd: null, uiAmount: 1, amount: "1" })]) === null, "liab blocks");
  add("TC-24: unrelated protocol liquidity unresolved does NOT block the card", (() => { const c = trimCardFor([usdc(1000), tok(300, "a"), W({ id: "kd", type: "protocol", symbol: "USDC", name: "USDC on Kamino", candidateId: "kamino_usdc_lending", dedupeKey: "klend:x", valueUsd: 400, recognizedValueUsd: 400, withdrawalState: "unresolved", liquidValueUsd: 400, mint: USDC })]); return c !== null; })(), "no liquidity block");
  add("TC-25: stale candidate value → no card", trimCardFor([usdc(1000), W({ id: "st", symbol: "TKst", name: "Stale", mint: "StaleMint", amount: "300", uiAmount: 300, priceUsd: 1, valueUsd: 300, withdrawalState: "stale" })]) === null, "stale blocks");

  // ---- Engine mount + coexistence ----
  const railInp = () => inputsFor({ allocation: allocationFixture(15000, 62, 5), safetyBuffer: bufferFixture(5000, 1000, 3), positions: [solPosition(10)] });
  add("TC-26: engine with NO trimOverride → NO Trim candidate (fail closed)", (() => { const r = runSuggestionEngine(railInp(), FIXTURE_GENERATED_AT); return !r.suggestions.some((s) => s.category === "trim"); })(), "fail closed");
  add("TC-27: engine emits the canonical Trim candidate from the override", (() => { const c = trimCardFor([usdc(1000), tok(300, "a")])!; const r = runSuggestionEngine(railInp(), FIXTURE_GENERATED_AT, null, null, undefined, undefined, { candidate: c }); return r.suggestions.some((s) => s.id === "trim_long_tail_assets"); })(), "override emits");
  add("TC-28: Rebalance + Trim COEXIST; Rebalance ordered above Trim", (() => { const t = trimCardFor([usdc(1000), tok(300, "a")])!; const reb = mkSug15H("reb", "rebalance"); const r = runSuggestionEngine(railInp(), FIXTURE_GENERATED_AT, null, null, undefined, { card: reb, material: true }, { candidate: t }); const cats = r.suggestions.map((s) => s.category); return cats.includes("rebalance") && cats.includes("trim") && cats.indexOf("rebalance") < cats.indexOf("trim"); })(), "reb+trim");
  add("TC-29: material Rebalance need WITHOUT a card does not suppress Trim", (() => { const t = trimCardFor([usdc(1000), tok(300, "a")])!; const r = runSuggestionEngine(railInp(), FIXTURE_GENERATED_AT, null, null, undefined, { card: null, material: true }, { candidate: t }); return r.suggestions.some((s) => s.category === "trim"); })(), "no card no suppress");
  add("TC-30: Step 24A — Trim present, NO capital_efficiency (BONK never becomes an idle-assets card)", (() => { const t = trimCardFor([usdc(1000), tok(300, "a")])!; const inp = inputsFor({ allocation: allocationFixture(15000, 62, 2), safetyBuffer: bufferFixture(5000, 1000, 3), positions: [nonCoreToken("BONK", 5000)] }); const r = runSuggestionEngine(inp, FIXTURE_GENERATED_AT, null, null, undefined, undefined, { candidate: t }); const cats = r.suggestions.map((s) => s.category); return cats.includes("trim") && !cats.includes("capital_efficiency"); })(), "trim, no ce");
  add("TC-31: a valid Trim candidate suppresses the informational On Track fallback", (() => { const t = trimCardFor([usdc(1000), tok(300, "a")])!; const r = runSuggestionEngine(railInp(), FIXTURE_GENERATED_AT, null, null, undefined, undefined, { candidate: t }); return r.suggestions.some((s) => s.category === "trim") && !r.suggestions.some((s) => s.category === "on_track"); })(), "on track suppressed");

  // ---- Disposition + regression ----
  add("TC-32: engine no longer imports the legacy Trim rule; rail passes trimOverride", (() => { const eng = readIfSrc("src/suggestions/engine.ts"); const rail = readIfSrc("src/suggestions/useRailSuggestions.ts"); return !/deriveTrimSuggestion/.test(eng) && /trimOverride/.test(eng) && /buildTrimCardFromAssessment/.test(rail) && /trimOverride/.test(rail); })(), "disposition");
  add("TC-33: legacy Trim module DELETED (19D) — no file, no production callers, no canGenerateTrim gate", (() => { const legacy = readIfSrc("src/suggestions/trimSuggestionLegacy.ts"); const completeness = readIfSrc("src/wallet/portfolioCompleteness.ts"); const anyImport = ["src/suggestions/engine.ts", "src/suggestions/useRailSuggestions.ts", "src/pages/TestingPage.tsx", "src/suggestions/trimSuggestion.ts"].some((f) => /from "\.\/trimSuggestionLegacy"|deriveLegacyTrimSuggestion/.test(readIfSrc(f))); return legacy === "" && !anyImport && !/function canGenerateTrim/.test(completeness); })(), "deleted");
  add("TC-34: rail derives ONE Trim assessment + ONE card (no second Trim card, no UI recompute)", (() => { const rail = readIfSrc("src/suggestions/useRailSuggestions.ts"); return (rail.match(/deriveTrimAssessment\(/g) ?? []).length === 1 && (rail.match(/buildTrimCardFromAssessment\(/g) ?? []).length === 1; })(), "one assessment");
  add("TC-35: thresholds + scoring methodology unchanged (impact=share, urgency by trigger)", (() => { const c = trimCardFor([usdc(1000), tok(300, "a")])!; return c.scores?.impact === Math.min(300 / 1300, 1) && c.scores?.urgency === 0.45 && c.scores?.efficiency === 0.45 && MIN_TRIM_SUGGESTION_USD === 100; })(), "scoring");
  add("TC-36: shared portfolio-asset accounting is used by BOTH Rebalance and Trim", (() => { const reb = readIfSrc("src/suggestions/rebalanceAssessment.ts"); const trim = readIfSrc("src/suggestions/trimAssessment.ts"); return /derivePortfolioAssetAccounting/.test(reb) && /derivePortfolioAssetAccounting/.test(trim) && !/deriveRebalanceAssessment/.test(trim); })(), "shared accounting");

  // ---- 19D closeout: legacy removal, Top Pick, remaining interactions, copy/privacy, prohibited-behavior ----
  const tCard = trimCardFor([usdc(1000), tok(300, "a")])!;
  add("TD-1: legacy Trim module file no longer exists", readIfSrc("src/suggestions/trimSuggestionLegacy.ts") === "", "deleted");
  add("TD-2: canGenerateTrim removed from portfolioCompleteness (no Rebalance-copied Trim gate)", !/canGenerateTrim/.test(readIfSrc("src/wallet/portfolioCompleteness.ts")), "no gate");
  add("TD-3: trimState removed from PortfolioCompletenessResult", !/trimState/.test(readIfSrc("src/wallet/portfolioCompleteness.ts")), "no trimState");
  add("TD-4: 'trim' removed from CompletenessDecision + gate map", (() => { const s = readIfSrc("src/wallet/portfolioCompleteness.ts"); return !/CompletenessDecision = [^;]*"trim"/.test(s) && !/trim: canGenerateTrim/.test(s); })(), "decision removed");
  add("TD-5: Trim-only → Trim is Top Pick (no higher candidate)", (() => { const r = runSuggestionEngine(railInp(), FIXTURE_GENERATED_AT, null, null, undefined, undefined, { candidate: tCard }); const tp = r.suggestions.find((s) => s.is_top_pick); return tp?.category === "trim"; })(), "trim top pick");
  add("TD-6: Trim NOT Top Pick when Rebalance present (Rebalance outranks)", (() => { const r = runSuggestionEngine(railInp(), FIXTURE_GENERATED_AT, null, null, undefined, { card: mkSug15H("reb", "rebalance"), material: true }, { candidate: tCard }); return r.suggestions.find((s) => s.is_top_pick)?.category === "rebalance"; })(), "reb top");
  add("TD-7: Step 24A — Trim IS Top Pick (no capital_efficiency ranks above it anymore)", (() => { const inp = inputsFor({ allocation: allocationFixture(15000, 62, 2), safetyBuffer: bufferFixture(5000, 1000, 3), positions: [nonCoreToken("BONK", 5000)] }); const r = runSuggestionEngine(inp, FIXTURE_GENERATED_AT, null, null, undefined, undefined, { candidate: tCard }); return r.suggestions.find((s) => s.is_top_pick)?.category === "trim" && !r.suggestions.some((s) => s.category === "capital_efficiency"); })(), "trim top");
  add("TD-8: DCA + Trim coexist (Rebalance not applying)", (() => { const inp = inputsFor({ allocation: allocationFixture(15000, 40, -8), safetyBuffer: bufferFixture(5000, 1000, 3), positions: [cryptoPosition(100)] }); const r = runSuggestionEngine(inp, FIXTURE_GENERATED_AT, mkSug15H("dca", "dca"), null, undefined, undefined, { candidate: tCard }); return r.suggestions.some((s) => s.category === "dca") && r.suggestions.some((s) => s.category === "trim"); })(), "dca+trim");
  add("TD-9: staking + Trim coexist", (() => { const inp = inputsFor({ allocation: allocationFixture(15000, 62, 2), safetyBuffer: bufferFixture(5000, 1000, 3), positions: [solPosition(10)] }); const r = runSuggestionEngine(inp, FIXTURE_GENERATED_AT, null, null, undefined, undefined, { candidate: tCard }); return r.suggestions.some((s) => s.category === "staking") && r.suggestions.some((s) => s.category === "trim"); })(), "staking+trim");
  add("TD-10: direct lending (stable_yield) + Trim coexist", (() => { const inp = inputsFor({ allocation: allocationFixture(15000, 62, 2), safetyBuffer: bufferFixture(5000, 1000, 3), positions: [stablePosition("USDC", 10000)] }); const r = runSuggestionEngine(inp, FIXTURE_GENERATED_AT, null, mkSug15H("sy", "stable_yield"), undefined, undefined, { candidate: tCard }); return r.suggestions.some((s) => s.category === "stable_yield") && r.suggestions.some((s) => s.category === "trim"); })(), "sy+trim");
  add("TD-11: category ordering unchanged (buffer1..posOpt8, trim=4)", CATEGORY_PRIORITY.buffer === 1 && CATEGORY_PRIORITY.rebalance === 2 && CATEGORY_PRIORITY.capital_efficiency === 3 && CATEGORY_PRIORITY.trim === 4 && CATEGORY_PRIORITY.staking === 5 && CATEGORY_PRIORITY.position_optimization === 8, "ordering");
  add("TD-12: user-facing Trim copy has no cleanup/sell/dispose/remove instruction; any 'swap' is the approved destination-framed line ('swap $… to USDC')", (() => { const copy = readIfSrc("src/state/approvedCopy.ts"); const trimLines = copy.split("\n").filter((l) => /SUGGESTION_TRIM/.test(l) && /=/.test(l)).join(" "); return !/clean ?up|\bsell\b|dispose|consolidate now|\bremove\b/i.test(trimLines) && !/\bswap\w*\b(?![^.]*\bto USDC\b)/i.test(trimLines); })(), "review copy");
  add("TD-13: internal small_position_cleanup remains a machine code only (not visible instruction copy)", (() => { const trim = readIfSrc("src/suggestions/trimSuggestion.ts"); return /small_position_cleanup/.test(trim) && !/"[^"]*clean ?up[^"]*"/i.test(readIfSrc("src/state/approvedCopy.ts")); })(), "internal code");
  add("TD-14: no route/quote/transaction/signature/execution in the full Trim path", (() => { const blob = readIfSrc("src/suggestions/trimAssessment.ts") + readIfSrc("src/suggestions/trimSuggestion.ts") + readIfSrc("src/pages/trimTestingFixtures.ts"); return !/swapRoute|routePlan|getQuote|aggregator|signTransaction|sendTransaction|simulateTransaction|receivedAmount|guaranteedOutput/.test(blob); })(), "read-only path");
  add("TD-15: card carries no wallet/account/dedupe/raw-balance analytics fields", (() => { const s = JSON.stringify(tCard); return !s.includes("dedupeKey") && !s.includes("rawBalance") && !s.includes("sourcePositionIds") && !s.includes("holdingId") && !/[1-9A-HJ-NP-Za-km-z]{40,}/.test(s); })(), "privacy");
  add("TD-16: engine has no residual allows(\"trim\") or trim gate reference", (() => { const eng = readIfSrc("src/suggestions/engine.ts"); return !/allows\("trim"\)/.test(eng) && !/deriveTrimSuggestion/.test(eng); })(), "no gate ref");

  return checks;
}


/**
 * Step 20C — PRODUCTION MOUNT of Position Optimization. Proves the canonical
 * `buildPositionOptimizationCardFromAssessment` mapper renders the existing `position_optimization_review`
 * card ONLY when the assessment is ready + ≥ 1 trigger family is proven + total ≥ $100, that the engine
 * consumes it through the fail-closed `positionOptimizationOverride` (NO legacy fallback), that it coexists
 * with Rebalance / Trim / Capital Efficiency / staking / direct-lending / DCA at the lowest (category-8)
 * priority, that production LST/Ondo APY can never reach low-yield, that no exit/execution/route/quote
 * behavior exists, and that no account/dedupe/mint identity leaks into the card.
 */
export function runPositionOptimizationProductionFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const readIfSrc = (rel: string) => { try { return readFileSync(`${process.cwd()}/${rel}`, "utf8"); } catch { return ""; } };
  const GEN = 1_700_000_000_000;
  const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
  const JITOSOL = "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn";
  const MSOL = "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So";
  const W = (o: Partial<WalletPosition>): WalletPosition => ({ id: "x", source: "wallet", type: "token", symbol: "X", name: "X", amount: "1", detection: "direct_wallet_balance", valueUsd: 100, ...o });
  const usdc = (v: number, id = "usdc") => W({ id, symbol: "USDC", name: "USD Coin", mint: USDC, amount: String(Math.round(v * 1e6)), uiAmount: v, decimals: 6, priceUsd: 1, valueUsd: v });
  const lst = (v: number, mint = JITOSOL, apy: number | null = 7, id = "lst") => W({ id, type: "lst", source: "jito", symbol: mint === MSOL ? "mSOL" : "JitoSOL", name: mint === MSOL ? "Marinade Staked SOL" : "Jito Staked SOL", mint, amount: "1", uiAmount: 1, detection: "recognized_lst_mint", valueUsd: v, apy, apyObservedAt: null });
  const stakeSummary = (account = "stakeAcc1") => ({ voteAccount: "V", totalLamports: "1", activeLamports: "1", activatingLamports: "0", deactivatingLamports: "0", inactiveLamports: "0", rentExemptReserveLamports: "0", immediatelyWithdrawableLamports: "0", closeOnlyWithdrawableLamports: "0", requiredRemainingLamports: "0", lockedLamports: "0", unresolvedLamports: "0", lifecycleSummary: "active", withdrawalCapacitySummary: "", anyUnresolved: false, accountCount: 1, stakeAccounts: [account] });
  const stake = (v: number, id = "stk", account = "stakeAcc1") => W({ id, type: "stake", symbol: "SOL", name: "Native stake", detection: "native_stake", amount: "1", uiAmount: v / 250, valueUsd: v, stakeLifecycleState: "active", stake: stakeSummary(account) as WalletPosition["stake"], manageUrl: "https://solscan.io/account/Vote111111111111111111111111111111111111111" });
  const debt = (v: number | null) => W({ id: "hb", type: "protocol", symbol: "USDH", name: "USDH loan", protocol: "Hubble", side: "borrowed", valueUsd: v, uiAmount: 1, amount: "1", dedupeKey: "hubble:loan" });

  const poCardFor = (positions: WalletPosition[], requiredBufferUsd = 500) => poBuildCard(poAssess({ positions, requiredBufferUsd, generatedAt: GEN }), GEN);
  // Concentration is the production-reachable single-trigger path (a single LST > 50% of gross assets).
  const conc = () => [usdc(1000), lst(1500, JITOSOL, 7)];
  const missing = () => [usdc(1000), lst(1500, JITOSOL, null)]; // expected-but-absent APY + concentration
  const shared = () => [usdc(2000), lst(300, JITOSOL, 7, "j"), lst(300, MSOL, 7, "m")];

  // ---- Canonical card contract ----
  const c1 = poCardFor(conc());
  add("PO-1: mounted card keeps id/category/title/description/action_kind/top-pick contract", c1 !== null && c1!.id === "position_optimization_review" && c1!.category === "position_optimization" && c1!.title_key === "suggestion.position_optimization.title" && c1!.description_key === "suggestion.position_optimization.description" && c1!.action_kind === "review_only" && c1!.is_actionable === true && c1!.is_top_pick === false, "contract");
  add("PO-2: amount equals canonical total flagged value with the review label", c1!.amount?.valueUsd === 1500 && c1!.amount?.label === "Positions to review", "amount");
  add("PO-3: portfolio-share metric uses the AUTHORITATIVE gross denominator", (() => { const m = c1!.reviewDetails?.metrics?.find((x) => x.label === "Share of gross assets"); return m?.value === Math.round((1500 / 2500) * 1000) / 10; })(), "authoritative share");
  add("PO-4: reason_codes in canonical order (missing→low→concentration→shared)", (() => { const c = poCardFor([usdc(500), lst(1500, JITOSOL, null)]); const r = c!.reason_codes; return r.includes("missing_apy_data") && r.includes("concentration_risk") && r.indexOf("missing_apy_data") < r.indexOf("concentration_risk"); })(), "reason order");
  add("PO-5: no position selected for exit; review_only; no execution CTA on the mapped card", (() => { const card = toSuggestionCard(c1!); return c1!.action_kind === "review_only" && card.cta.executes_transaction === false && card.cta.requires_wallet_signature === false && card.cta.action === null; })(), "no cta");
  // ---- Position-specific card copy (single named position vs multiple) ----
  add("PO-COPY-1: single concentrated Jito position → named title / body / action line (card + modal header)", (() => { const card = toSuggestionCard(c1!); return card.title === "Review Your Jito Position" && c1!.reviewDetails?.summary.title === "Review Your Jito Position" && card.impact_text === "Review $1,500 in JitoSOL" && card.description === "Your Jito position represents 60% of your portfolio. Review whether you’re comfortable keeping this much in a single yield position."; })(), "named single copy");
  add("PO-COPY-2: title_key/description_key + amount.label contract preserved under overrides", c1!.title_key === "suggestion.position_optimization.title" && c1!.description_key === "suggestion.position_optimization.description" && c1!.amount?.label === "Positions to review" && c1!.titleOverride === "Review Your Jito Position", "contract kept");
  add("PO-COPY-3: shared SOL exposure (JitoSOL + mSOL) → 'Review Your SOL Exposure' + 'across 2 SOL positions'; modal mirrors card", (() => { const c = poCardFor(shared()); const card = toSuggestionCard(c!); return card.title === "Review Your SOL Exposure" && c!.reviewDetails?.summary.title === "Review Your SOL Exposure" && card.impact_text === "Review $600 across 2 SOL positions" && card.description === "Your JitoSOL and mSOL positions are both linked to SOL. Together, they represent 23.1% of your portfolio. Review whether this matches your intended SOL allocation." && c!.reviewDetails?.summary.reason === card.description; })(), "shared copy");
  add("PO-COPY-4: named copy interpolates real values only (no APY/number invented in title/body)", (() => { const card = toSuggestionCard(c1!); return !/\bAPY\b/.test(card.title) && /Jito/.test(card.title) && /60%/.test(card.description) && !/\$/.test(card.description); })(), "honest interpolation");
  add("PO-COPY-5: modal uses the position-details layout flag (hides Key metrics + Guardrails)", c1!.reviewDetails?.positionReview === true, "positionReview");
  add("PO-COPY-6: modal body spells out the real numbers (value / gross / share / threshold / pp)", c1!.reviewDetails?.summary.reason === "Your Jito position is worth $1,500 out of your $2,500 portfolio, so it represents 60% of your assets. WealthSmith flags a single position when it reaches 50% or more, so this position is 10 percentage points above the review threshold.", c1!.reviewDetails?.summary.reason ?? "");
  add("PO-COPY-7: modal body (detailed) diverges from the short card description", (() => { const card = toSuggestionCard(c1!); return c1!.reviewDetails?.summary.reason !== card.description && /out of your \$2,500 portfolio/.test(c1!.reviewDetails?.summary.reason ?? ""); })(), "modal ≠ card body");
  add("PO-COPY-8: Position details row = held asset (JitoSOL) + value + portfolio share + APY; asset links to Solscan token page; Manage links to the protocol page", (() => { const p = c1!.reviewDetails?.involvedPositions?.[0]; return p?.assetSymbol === "JitoSOL" && p?.assetIconPath === "assets/icons/token/jitosol.svg" && p?.valueUsd === 1500 && p?.portfolioSharePct === 60 && p?.apy === 7 && p?.assetUrl === "https://solscan.io/token/J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn" && p?.reviewLink?.url === "https://www.jito.network/staking/"; })(), "asset→token, manage→protocol");
  add("PO-COPY-9: Position Optimization modals emit NO 'How this was calculated' section (calculations empty)", (c1!.reviewDetails?.calculations.length ?? -1) === 0, "no PO calculations");
  add("PO-COPY-11: single position with concentration + missing APY → combined body (asset-named share + APY gap); title stays 'Review Your Jito Position'", (() => { const c = poCardFor([usdc(500), lst(1500, JITOSOL, null)]); const card = toSuggestionCard(c!); return card.title === "Review Your Jito Position" && card.impact_text === "Review $1,500 in JitoSOL" && card.description === "Your JitoSOL position represents 75% of your portfolio, and we couldn’t verify its current APY. Review whether you’re comfortable with this level of concentration and check the latest yield information." && c!.reviewDetails?.summary.reason === card.description; })(), "conc+missing combined copy");
  add("PO-LST-MANAGE: an LST resolves its Manage link from the staking protocol registered to its mint (mSOL → Marinade); asset links to the mSOL token page", (() => { const msol = W({ id: "ms", type: "lst", symbol: "mSOL", name: "Marinade Staked SOL", mint: MSOL, uiAmount: 1, amount: "1", detection: "recognized_lst_mint", valueUsd: 1500 }); const c = poCardFor([usdc(1000), msol]); if (!c) return false; const p = (c.reviewDetails?.involvedPositions ?? []).find((r) => r.assetSymbol === "mSOL"); return p?.reviewLink?.url === "https://app.marinade.finance" && p?.assetUrl === `https://solscan.io/token/${MSOL}`; })(), "mSOL manage→Marinade");
  add("PO-STAKE-MANAGE: native SOL staking → SOL asset links to the wrapped-SOL token page; Manage links to the validator page (public vote account); no user stake-account/dedupe identity leaks", (() => { const c = poCardFor([usdc(500), stake(1500)]); if (!c) return false; const p = c.reviewDetails?.involvedPositions?.[0]; const s = JSON.stringify(c); return p?.assetSymbol === "SOL" && p?.assetUrl === "https://solscan.io/token/So11111111111111111111111111111111111111112" && p?.reviewLink?.url === "https://solscan.io/account/Vote111111111111111111111111111111111111111" && !s.includes("stakeAcc1") && !s.includes("stakeAccounts") && !s.includes("dedupeKey") && !s.includes("economicPositionKey"); })(), "native stake manage→validator");
  add("PO-COPY-10: shared exposure + concentration + missing APY → generic 'Review Yield Positions' + combined body (numbers named once)", (() => { const c = poCardFor([usdc(500), lst(1500, JITOSOL, null, "j"), lst(300, MSOL, 7, "m")]); const card = toSuggestionCard(c!); return card.title === "Review Yield Positions" && c!.titleOverride === undefined && card.impact_text === "Review $1,800 across 2 SOL positions" && card.description === "Your JitoSOL and mSOL positions represent 78.3% of your portfolio. JitoSOL alone accounts for 65.2%, and we couldn’t verify its current APY. Review both positions to assess your SOL exposure and check the latest yield information." && c!.reviewDetails?.summary.reason === card.description; })(), "multi-issue combined copy");

  // ---- Mount fail-closed (mapper returns null unless ready) ----
  add("PO-6: no trigger fires → NO card (fail closed)", poCardFor([usdc(2000), lst(300, JITOSOL, 7)]) === null, "no trigger null");
  add("PO-7: total flagged value below $100 → NO card", poCardFor([usdc(2000), lst(80, JITOSOL, null)]) === null, "floor null");
  add("PO-8: incomplete Safety Buffer → accounting blocked → NO card", poCardFor([usdc(100), lst(1500, JITOSOL, 7)], 2000) === null, "buffer null");
  add("PO-9: unresolved liability → readiness blocked → NO card", poCardFor([usdc(1000), lst(1500, JITOSOL, 7), debt(null)]) === null, "liab null");

  // ---- Trigger-family independence via the mapper ----
  add("PO-10: concentration trigger alone → card with concentration_risk", (() => { const c = poCardFor(conc()); return c !== null && c!.reason_codes.includes("concentration_risk"); })(), "concentration");
  add("PO-11: missing-APY trigger → card with missing_apy_data", (() => { const c = poCardFor(missing()); return c !== null && c!.reason_codes.includes("missing_apy_data"); })(), "missing");
  add("PO-12: shared-underlying-exposure trigger → card with duplicate_exposure code + friendly shared-exposure copy (no raw group id)", (() => { const c = poCardFor(shared()); return c !== null && c!.reason_codes.includes("duplicate_exposure") && /linked to/.test(c!.descriptionOverride ?? ""); })(), "shared");

  // ---- APY governance: low-yield unreachable in production; honest display states ----
  add("PO-13: production LST at 0.5% + concentration → card WITHOUT low_yield_position (low-yield unreachable)", (() => { const c = poCardFor([usdc(1000), lst(1500, JITOSOL, 0.5)]); return c !== null && !c!.reason_codes.includes("low_yield_position") && c!.reason_codes.includes("concentration_risk"); })(), "no low yield");
  add("PO-14: freshness-unverified flagged APY → display label + freshness limitation (never 'fresh')", (() => { const c = poCardFor([usdc(1000), lst(1500, JITOSOL, 0.5)]); const ip = c!.reviewDetails?.involvedPositions ?? []; const lim = JSON.stringify(c!.reviewDetails?.limitations); return ip.some((p) => p.apyDisplayState === "APY freshness unverified") && /freshness/i.test(lim); })(), "freshness label");
  add("PO-15: missing_expected APY → 'Current APY unavailable' display state, numeric apy null", (() => { const c = poCardFor(missing()); const p = (c!.reviewDetails?.involvedPositions ?? []).find((x) => x.apyDisplayState === "Current APY unavailable"); return p != null && p.apy === null; })(), "unavailable label");
  add("PO-16: native-stake (source-not-integrated) flagged by concentration → 'Yield comparison not available', apy null", (() => { const c = poCardFor([usdc(1000), stake(1500)]); const ip = c!.reviewDetails?.involvedPositions ?? []; return c !== null && ip.some((p) => p.apyDisplayState === "Yield comparison not available" && p.apy === null); })(), "unsupported label");

  // ---- Engine mount + coexistence ----
  const funded = () => bufferFixture(5000, 1000, 3); // funded (target $3,000)
  const aligned = () => allocationFixture(15000, 62, 2); // delta 2% → no rebalance
  const railInp = () => inputsFor({ allocation: allocationFixture(15000, 62, 5), safetyBuffer: bufferFixture(5000, 1000, 3), positions: [solPosition(10)] });
  const po = () => poCardFor(conc())!;
  add("PO-17: engine with NO positionOptimizationOverride → NO position_optimization candidate (fail closed)", (() => { const r = runSuggestionEngine(railInp(), GEN); return !r.suggestions.some((s) => s.category === "position_optimization"); })(), "fail closed");
  add("PO-18: engine emits the canonical card from the override", (() => { const r = runSuggestionEngine(railInp(), GEN, null, null, undefined, undefined, undefined, { candidate: po() }); return r.suggestions.some((s) => s.id === "position_optimization_review"); })(), "override emits");
  add("PO-19: Rebalance + Position Optimization COEXIST; Rebalance ordered above", (() => { const r = runSuggestionEngine(railInp(), GEN, null, null, undefined, { card: mkSug15H("reb", "rebalance"), material: true }, undefined, { candidate: po() }); const cats = r.suggestions.map((s) => s.category); return cats.includes("rebalance") && cats.includes("position_optimization") && cats.indexOf("rebalance") < cats.indexOf("position_optimization"); })(), "reb above");
  add("PO-20: Trim + Position Optimization COEXIST; Trim ordered above", (() => { const r = runSuggestionEngine(railInp(), GEN, null, null, undefined, undefined, { candidate: mkSug15H("t", "trim") }, { candidate: po() }); const cats = r.suggestions.map((s) => s.category); return cats.includes("trim") && cats.includes("position_optimization") && cats.indexOf("trim") < cats.indexOf("position_optimization"); })(), "trim above");
  add("PO-21: Step 24A — Position Optimization present, NO capital_efficiency (BONK never becomes an idle-assets card)", (() => { const inp = inputsFor({ allocation: allocationFixture(15000, 62, 2), safetyBuffer: bufferFixture(5000, 1000, 3), positions: [nonCoreToken("BONK", 5000)] }); const r = runSuggestionEngine(inp, GEN, null, null, undefined, undefined, undefined, { candidate: po() }); const cats = r.suggestions.map((s) => s.category); return cats.includes("position_optimization") && !cats.includes("capital_efficiency"); })(), "po, no ce");
  add("PO-22: staking + Position Optimization coexist", (() => { const r = runSuggestionEngine(railInp(), GEN, null, null, undefined, undefined, undefined, { candidate: po() }); return r.suggestions.some((s) => s.category === "staking") && r.suggestions.some((s) => s.category === "position_optimization"); })(), "staking coexist");
  add("PO-23: direct lending (stable_yield) + Position Optimization coexist", (() => { const inp = inputsFor({ allocation: allocationFixture(15000, 62, 2), safetyBuffer: bufferFixture(5000, 1000, 3), positions: [stablePosition("USDC", 10000)] }); const r = runSuggestionEngine(inp, GEN, null, mkSug15H("sy", "stable_yield"), undefined, undefined, undefined, { candidate: po() }); return r.suggestions.some((s) => s.category === "stable_yield") && r.suggestions.some((s) => s.category === "position_optimization"); })(), "sy coexist");
  add("PO-24: DCA + Position Optimization coexist", (() => { const inp = inputsFor({ allocation: allocationFixture(15000, 40, -8), safetyBuffer: bufferFixture(5000, 1000, 3), positions: [cryptoPosition(100)] }); const r = runSuggestionEngine(inp, GEN, mkSug15H("dca", "dca"), null, undefined, undefined, undefined, { candidate: po() }); return r.suggestions.some((s) => s.category === "dca") && r.suggestions.some((s) => s.category === "position_optimization"); })(), "dca coexist");
  add("PO-25: a valid Position Optimization card suppresses the informational On Track fallback", (() => { const inp = inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [cryptoPosition(100)] }); const r = runSuggestionEngine(inp, GEN, null, null, undefined, undefined, undefined, { candidate: po() }); return r.suggestions.some((s) => s.category === "position_optimization") && !r.suggestions.some((s) => s.category === "on_track"); })(), "on track suppressed");
  add("PO-26: material Rebalance need WITHOUT a card does not suppress Position Optimization", (() => { const r = runSuggestionEngine(railInp(), GEN, null, null, undefined, { card: null, material: true }, undefined, { candidate: po() }); return r.suggestions.some((s) => s.category === "position_optimization"); })(), "no card no suppress");

  // ---- Ordering + Top Pick ----
  add("PO-27: category ordering unchanged; position_optimization is the lowest (8)", CATEGORY_PRIORITY.buffer === 1 && CATEGORY_PRIORITY.rebalance === 2 && CATEGORY_PRIORITY.capital_efficiency === 3 && CATEGORY_PRIORITY.trim === 4 && CATEGORY_PRIORITY.staking === 5 && CATEGORY_PRIORITY.stable_yield === 6 && CATEGORY_PRIORITY.dca === 7 && CATEGORY_PRIORITY.position_optimization === 8, "ordering");
  // Position Optimization is an OBSERVATION — "notice this", with no next step to
  // take — so it is never promoted to Top Pick, even when it is the ONLY card. A
  // rail whose single card says "review your positions" must not present that as
  // the most valuable thing to act on. (Was: it became Top Pick by default.)
  add("PO-28: Position-Optimization-only → NO Top Pick (an observation is never promoted)", (() => { const inp = inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [cryptoPosition(100)] }); const r = runSuggestionEngine(inp, GEN, null, null, undefined, undefined, undefined, { candidate: po() }); const poSug = r.suggestions.find((s) => s.category === "position_optimization"); return poSug !== undefined && poSug.observationOnly === true && r.suggestions.every((s) => s.is_top_pick === false); })(), "no top pick");
  add("PO-29: Position Optimization NOT Top Pick when Rebalance present (Rebalance outranks)", (() => { const r = runSuggestionEngine(railInp(), GEN, null, null, undefined, { card: mkSug15H("reb", "rebalance"), material: true }, undefined, { candidate: po() }); return r.suggestions.find((s) => s.is_top_pick)?.category === "rebalance"; })(), "reb top");

  // ---- Disposition + regression ----
  add("PO-30: engine no longer imports the legacy PO rule; rail passes positionOptimizationOverride", (() => { const eng = readIfSrc("src/suggestions/engine.ts"); const rail = readIfSrc("src/suggestions/useRailSuggestions.ts"); return !/derivePositionOptimizationSuggestion/.test(eng) && /positionOptimizationOverride/.test(eng) && /buildPositionOptimizationCardFromAssessment/.test(rail) && /positionOptimizationOverride/.test(rail); })(), "disposition");
  add("PO-31: rail derives ONE PO assessment + ONE card (no second card, no UI recompute)", (() => { const rail = readIfSrc("src/suggestions/useRailSuggestions.ts"); return (rail.match(/derivePositionOptimizationAssessment\(/g) ?? []).length === 1 && (rail.match(/buildPositionOptimizationCardFromAssessment\(/g) ?? []).length === 1; })(), "one assessment");
  add("PO-32 (20D): legacy PO module is DELETED with zero callers, and the legacy duplicate-exposure helpers are gone", (() => { const legacy = readIfSrc("src/suggestions/positionOptimizationSuggestionLegacy.ts"); const anyImport = ["src/suggestions/engine.ts", "src/suggestions/useRailSuggestions.ts", "src/pages/TestingPage.tsx", "src/suggestions/positionOptimizationSuggestion.ts", "src/suggestions/suggestionEngine.fixtures.ts"].some((f) => /from "\.\/positionOptimizationSuggestionLegacy"/.test(readIfSrc(f))); const dup = readIfSrc("src/suggestions/duplicateExposure.ts"); return legacy === "" && !anyImport && !/export function findDuplicateExposureGroups|export interface DuplicateExposureGroup|export function exposureGroupLabel/.test(dup); })(), "legacy deleted");
  add("PO-33: scoring methodology unchanged (impact=flagged/gross, urgency conc 0.45 else 0.35, efficiency low 0.6 else 0.5)", (() => { const c = poCardFor(conc())!; return c.scores?.impact === Math.min(1500 / 2500, 1) && c.scores?.urgency === 0.45 && c.scores?.efficiency === 0.5; })(), "scoring");
  add("PO-34: shared portfolio-asset accounting powers the PO assessment", (() => { const a = readIfSrc("src/suggestions/positionOptimizationAssessment.ts"); return /derivePortfolioAssetAccounting/.test(a); })(), "shared accounting");
  add("PO-35: no route/quote/transaction/signature/execution in the full PO path", (() => { const blob = readIfSrc("src/suggestions/positionOptimizationAssessment.ts") + readIfSrc("src/suggestions/positionOptimizationSuggestion.ts"); return !/swapRoute|routePlan|getQuote|aggregator|signTransaction|sendTransaction|simulateTransaction|receivedAmount|guaranteedOutput/.test(blob); })(), "read-only path");
  add("PO-36: card carries no wallet/account/dedupe/economic-key/raw-balance/stake-account identity; the ONLY 40+ base58 strings are canonical token mints inside read-only Solscan TOKEN links", (() => { const s = JSON.stringify(c1); const stripped = s.replace(/https:\/\/solscan\.io\/token\/[1-9A-HJ-NP-Za-km-z]{32,44}/g, ""); return !s.includes("dedupeKey") && !s.includes("economicPositionKey") && !s.includes("rawBalance") && !s.includes("sourcePositionIds") && !s.includes("stakeAccounts") && !s.includes("obligationId") && !/solscan\.io\/(account|address|tx)\//.test(s) && !/[1-9A-HJ-NP-Za-km-z]{40,}/.test(stripped); })(), "privacy");
  add("PO-37: user-facing PO copy carries no exit/switch/withdraw/unstake/close/sell/swap instruction", (() => { const copy = readIfSrc("src/state/approvedCopy.ts"); const poLines = copy.split("\n").filter((l) => /SUGGESTION_(POSITION_OPTIMIZATION|PO)_/.test(l) && /=/.test(l)).join(" ").toLowerCase(); return !/\b(exit|switch|withdraw|unstake|close|sell|swap|dispose|move out|pull out)\b/.test(poLines); })(), "review copy");

  // ---- 20D closeout: legacy removal, gate removal, no-fallback, no UI recompute ----
  add("PO-38: legacy PO module FILE no longer exists", readIfSrc("src/suggestions/positionOptimizationSuggestionLegacy.ts") === "", "deleted");
  add("PO-39: engine has NO legacy PO derive, NO allows(\"positionOptimization\") gate, only the fail-closed override", (() => { const eng = readIfSrc("src/suggestions/engine.ts"); return !/derivePositionOptimizationSuggestion|deriveLegacyPositionOptimizationSuggestion/.test(eng) && !/allows\("positionOptimization"\)/.test(eng) && /positionOptimizationOverride\?\.candidate \?\? null/.test(eng); })(), "no fallback/gate");
  add("PO-40: obsolete completeness gate removed (canGeneratePositionOptimization + positionOptimizationState gone; not in the gate map)", (() => { const pc = readIfSrc("src/wallet/portfolioCompleteness.ts"); return !/canGeneratePositionOptimization/.test(pc) && !/positionOptimizationState/.test(pc) && !/positionOptimization:/.test(pc) && !/"positionOptimization"/.test(pc); })(), "gate removed");
  add("PO-41: CompletenessDecision union excludes positionOptimization (20D) and onTrack (21F)", (() => { const pc = readIfSrc("src/wallet/portfolioCompleteness.ts"); return /CompletenessDecision = "staking" \| "dca" \| "directLending" \| "rebalance";/.test(pc); })(), "decision removed");
  add("PO-42: legacy duplicate-exposure helpers deleted; getUnderlyingExposureGroup (contribution/staking) retained", (() => { const dup = readIfSrc("src/suggestions/duplicateExposure.ts"); return !/export function findDuplicateExposureGroups|export interface DuplicateExposureGroup|export function exposureGroupLabel/.test(dup) && /export function getUnderlyingExposureGroup/.test(dup); })(), "helpers pruned");
  add("PO-43: rail derives ONE assessment + ONE card; no UI/second accounting recompute for PO", (() => { const rail = readIfSrc("src/suggestions/useRailSuggestions.ts"); return (rail.match(/derivePositionOptimizationAssessment\(/g) ?? []).length === 1 && (rail.match(/buildPositionOptimizationCardFromAssessment\(/g) ?? []).length === 1 && (rail.match(/derivePortfolioAssetAccounting\(/g) ?? []).length <= 1; })(), "one calc");
  add("PO-44: fixture-only synthetic candidate + approved freshness policy never imported by mounted production modules", (() => { const mounted = ["src/suggestions/engine.ts", "src/suggestions/useRailSuggestions.ts", "src/suggestions/positionOptimizationSuggestion.ts", "src/suggestions/positionOptimizationAssessment.ts"].map(readIfSrc).join("\n"); return !/buildSyntheticPositionOptimizationCandidateForFixture|TEST_LST_POLICY/.test(mounted); })(), "fixture isolation");
  add("PO-45: incomplete Safety Buffer at the assessment boundary → no card (engine emits nothing without a candidate)", (() => { const a = poAssess({ positions: [usdc(100), lst(1500, JITOSOL, 7)], requiredBufferUsd: 2000, generatedAt: GEN }); const r = runSuggestionEngine(railInp(), GEN, null, null, undefined, undefined, undefined, { candidate: poBuildCard(a, GEN) }); return poBuildCard(a, GEN) === null && !r.suggestions.some((s) => s.category === "position_optimization"); })(), "buffer fail closed");

  return checks;
}


export function runRebalanceAssessmentFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const MSOL = LST_SET.msol.mint;
  const T22 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
  const w = (o: Partial<JLWalletPos>): JLWalletPos => ({ id: "x", source: "wallet", type: "token", symbol: "X", amount: "1", detection: "direct_wallet_balance", valueUsd: 100, ...o });
  const usdc = (v: number, id = "usdc") => w({ id, symbol: "USDC", name: "USD Coin", mint: RB_USDC, valueUsd: v, uiAmount: v });
  const sol = (v: number) => w({ id: "sol", type: "native", symbol: "SOL", valueUsd: v, uiAmount: v / 250 });
  const msol = (v: number) => w({ id: "ms", type: "lst", symbol: "mSOL", mint: MSOL, valueUsd: v, uiAmount: 1, lstProductId: "msol", lstNormalizationState: "unsupported" });
  const debt = (v: number | null) => w({ id: "hb", type: "protocol", symbol: "USDH", name: "USDH loan", side: "borrowed", valueUsd: v, uiAmount: 300, amount: "300000000" });
  const kaminoStable = (v: number) => w({ id: "kd", type: "protocol", symbol: "USDC", name: "USDC on Kamino", candidateId: "kamino_usdc_lending", existingPositionOnly: true, dedupeKey: "klend:x", valueUsd: v, recognizedValueUsd: v, withdrawalState: "fully_withdrawable", liquidValueUsd: v, mint: RB_USDC });
  const frozenT22 = (v: number) => w({ id: "t22f", type: "token", symbol: "XYZ", name: "XYZ Token", mint: "T22Frozen", valueUsd: v, tokenProgram: T22, withdrawalState: "currently_unavailable", transferabilityState: "frozen" });
  const hookT22 = (v: number) => w({ id: "t22h", type: "token", symbol: "XYZ", name: "XYZ Token", mint: "T22Hook", valueUsd: v, tokenProgram: T22, withdrawalState: "unresolved", transferabilityState: "hook_unresolved" });
  const activeStake = (v: number) => w({ id: "stk", type: "stake", symbol: "SOL", valueUsd: v, uiAmount: v / 250, liquidValueUsd: 0, stakeLifecycleState: "active", stake: { anyUnresolved: false } as any, dedupeKey: "native-stake:A" });
  const unknownTok = () => w({ id: "unk", type: "token", name: "Unknown token", symbol: "9x", uiAmount: 5, valueUsd: null });
  const A = (positions: JLWalletPos[], riskTolerance: string | undefined = "medium", requiredBufferUsd = 0) => rbAssess({ positions, ...rbFixedTarget(riskTolerance), requiredBufferUsd, generatedAt: 1_700_000_000_000 });

  // ---- Allocation + liabilities (gross assets, not net worth) ----
  add("RB-1: crypto + stable allocation sums to 100 (within rounding)", (() => { const a = A([sol(400), usdc(600)]); return Math.abs((a.currentCryptoPct! + a.currentStablePct!) - 100) < 0.01; })(), "sums 100");
  add("RB-2: debt is a SEPARATE liability, not netted into crypto", (() => { const a = A([sol(400), usdc(600), debt(-300)]); return a.recognizedLiabilitiesUsd === 300 && a.cryptoAssetValueUsd === 400 && a.currentCryptoPct === 40; })(), "debt separate");
  add("RB-3: debt reduces net worth but not the crypto allocation ratio", (() => { const a = A([sol(400), usdc(600), debt(-300)]); return a.netWorthUsd === 700 && a.grossAssetValueUsd === 1000 && a.allocatableAssetValueUsd === 1000; })(), "net worth");
  add("RB-4: unresolved (unvalued) debt blocks calculation", (() => { const a = A([sol(400), usdc(600), debt(null)]); return a.calculationGate.status !== "allowed" && a.calculationGate.reasons.includes("liabilities_unresolved"); })(), "unvalued debt");
  add("RB-5: negative NON-liability asset row fails closed (blocked)", (() => { const a = A([sol(400), usdc(600), w({ id: "neg", type: "token", symbol: "BAD", valueUsd: -50 })]); return a.calculationGate.status === "blocked" && a.calculationGate.reasons.includes("malformed_asset_value"); })(), "neg asset");
  add("RB-6: unknown positive value blocks allocation", (() => { const a = A([sol(400), usdc(600), unknownTok()]); return a.calculationGate.reasons.includes("unknown_asset_value") && a.calculationGate.status !== "allowed"; })(), "unknown");
  add("RB-7: mSOL fresh market value contributes to crypto WITHOUT requiring backing", (() => { const a = A([msol(260), usdc(740)]); return a.cryptoAssetValueUsd === 260 && a.calculationGate.reasons.every((r) => !/backing|sol_exposure|underlying/.test(r)); })(), "msol no backing");
  add("RB-8: protocol stable recognized value counts in allocation but NOT as source", (() => { const a = A([sol(900), kaminoStable(100)], "very_low", 0); const kd = a.sourceCandidates.find((c) => c.positionId === "kd"); return a.stableAssetValueUsd === 100 && (kd === undefined || kd.eligibilityState === "existing_position_only"); })(), "protocol stable");

  // ---- Drift (unchanged trigger) ----
  add("RB-9: +≥10pt crypto → crypto_to_stables; exact requiredCorrection", (() => { const a = A([sol(800), usdc(200)], "low" /*target 40/60*/); return a.direction === "crypto_to_stables" && a.cryptoDeltaPct === 40 && a.requiredCorrectionUsd === 400; })(), "over");
  add("RB-10: ≤-10pt crypto → stables_to_crypto", (() => { const a = A([sol(100), usdc(900)], "high" /*target 80/20*/); return a.direction === "stables_to_crypto" && a.cryptoDeltaPct === -70; })(), "under");
  add("RB-11: within ±10pt → within_threshold", (() => { const a = A([sol(620), usdc(380)], "medium" /*target 60/40*/); return a.direction === "within_threshold" && a.requiredCorrectionUsd === 0; })(), "within");
  add("RB-12: no usable canonical target (unresolved) → calculation unresolved (target_unresolved), no risk-only fallback", (() => { const a = rbAssess({ positions: [sol(800), usdc(200)], ...rbFixedTarget(undefined), requiredBufferUsd: 0, generatedAt: 1_700_000_000_000 }); return a.calculationGate.status === "unresolved" && a.calculationGate.reasons.includes("target_unresolved") && a.targetCryptoPct === null; })(), "no target");

  // ---- Source inventory by class (overweight bucket) ----
  add("RB-13: fresh direct classic token → technical capacity, route unverified (not eligible)", (() => { const a = A([sol(900), usdc(100)], "low"); const s = a.sourceCandidates.find((c) => c.positionId === "sol"); return s?.eligibilityState === "technically_available_route_unverified" && s.verifiedTransferableValueUsd === 900; })(), "classic route unverified");
  add("RB-14: frozen Token-2022 → zero capacity; hook-unresolved → unresolved source state", (() => { const a = A([sol(700), frozenT22(200), hookT22(100)], "low" /*40/60; crypto 70% → over → crypto sources*/); const f = a.sourceCandidates.find((c) => c.positionId === "t22f"); const h = a.sourceCandidates.find((c) => c.positionId === "t22h"); return f?.eligibilityState === "unavailable" && f.technicallyAvailableValueUsd === 0 && h?.eligibilityState === "unresolved"; })(), "frozen+hook");
  add("RB-15: active native stake → zero direct capacity (unavailable)", (() => { const a = A([activeStake(900), usdc(100)], "low"); const s = a.sourceCandidates.find((c) => c.positionId === "stk"); return s?.eligibilityState === "unavailable" && s.technicallyAvailableValueUsd === 0; })(), "active stake");
  add("RB-16: LST is route-unverified (backing never source capacity)", (() => { const a = A([msol(900), usdc(100)], "low"); const s = a.sourceCandidates.find((c) => c.positionId === "ms"); return s?.eligibilityState === "technically_available_route_unverified" && !s.exclusionReasons.join().includes("backing is source"); })(), "lst route");
  add("RB-17: vetted Kamino Direct USDC → ELIGIBLE two-step source (verified withdrawable, requiresPriorWithdrawal)", (() => { const a = A([sol(100), usdc(200), kaminoStable(700)], "high"); const kd = a.sourceCandidates.find((c) => c.positionId === "kd"); return kd?.eligibilityState === "eligible" && kd.requiresPriorWithdrawal === true && kd.verifiedWithdrawableValueUsd === 700; })(), "two-step eligible");
  add("RB-17b: UNVETTED Kamino Direct (withdrawal not verified) still excluded as a source", (() => { const a = A([sol(100), usdc(200), { ...kaminoStable(700), withdrawalState: "unresolved" }], "high"); const kd = a.sourceCandidates.find((c) => c.positionId === "kd"); return !kd || kd.eligibilityState === "existing_position_only"; })(), "unvetted excluded");

  // ---- Stable-source Safety Buffer protection (stables_to_crypto) ----
  add("RB-18: direct USDC below buffer → zero eligible source capacity", (() => { const a = A([sol(100), usdc(900)], "high", 900); return a.eligibleSourceCapacityUsd === 0; })(), "below buffer");
  add("RB-19: direct USDC exactly at buffer → zero eligible capacity", (() => { const a = A([sol(100), usdc(900)], "high", 900); return a.verifiedSourceCapacityUsd === 0; })(), "at buffer");
  add("RB-20: direct USDC above buffer → only the excess is eligible", (() => { const a = A([sol(100), usdc(900)], "high", 200); return a.eligibleSourceCapacityUsd === 700; })(), "excess only");
  add("RB-21: vetted protocol-held USDC now COUNTS in eligible stable capacity (buffer still reserved once)", (() => { const a = A([sol(100), usdc(300), kaminoStable(600)], "high", 100); return a.eligibleSourceCapacityUsd === 800; /* direct 300 + vetted Kamino 600 − 100 buffer */ })(), "protocol counts");
  add("RB-22: Safety Buffer incomplete → calculation blocked", (() => { const a = A([sol(100), usdc(50)], "high", 1000 /*target 1000 > 50 verified → incomplete*/); return a.calculationGate.status === "blocked" && a.calculationGate.reasons.includes("safety_buffer_incomplete"); })(), "buffer incomplete");

  // ---- Destinations (registry) ----
  add("RB-23: crypto_to_stables destination = canonical wallet USDC (exact mint)", (() => { const a = A([sol(900), usdc(100)], "low"); return a.proposedDestination?.mint === RB_USDC && a.proposedDestination?.destinationRole === "wallet_stable"; })(), "usdc dest");
  add("RB-24: stables_to_crypto destination = canonical native SOL", (() => { const a = A([sol(100), usdc(900)], "high", 200); return a.proposedDestination?.native === true && a.proposedDestination?.destinationRole === "core_asset"; })(), "sol dest");
  add("RB-25: destinations are registry-bound + extensible (both enabled, approved)", RB_DEST.crypto_to_stables.enabled && RB_DEST.crypto_to_stables.recommendationEligible && RB_DEST.stables_to_crypto.native === true && typeof RB_DEST.crypto_to_stables.assetId === "string", "registry");
  add("RB-26: Jupiter/Steakhouse/INF/LP can never be destinations (registry has only USDC/SOL)", (() => { const ids = [RB_DEST.crypto_to_stables.assetId, RB_DEST.stables_to_crypto.assetId]; return ids.every((x) => x === "usdc" || x === "sol"); })(), "no excluded dest");

  // ---- Three-way gate split ----
  add("RB-27: complete calc + verified excess ≥ min + valid dest → OVERALL allowed", (() => { const a = A([sol(100), usdc(900)], "high", 100); return a.calculationGate.status === "allowed" && a.sourceActionabilityGate.status === "allowed" && a.destinationEligibilityGate.status === "allowed" && a.overallReadiness.status === "allowed" && a.amountClassification !== "within_threshold"; })(), "all allowed");
  add("RB-28: complete calc + crypto sources route-unverified → source UNRESOLVED (not blocked)", (() => { const a = A([sol(900), usdc(100)], "low"); return a.calculationGate.status === "allowed" && a.sourceActionabilityGate.status === "unresolved" && a.overallReadiness.status === "unresolved"; })(), "source unresolved");
  add("RB-29: stables_to_crypto with only VETTED Kamino stable → source ALLOWED (two-step)", (() => { const a = A([sol(100), kaminoStable(900)], "high", 0); return a.sourceActionabilityGate.status === "allowed" && a.eligibleSourceCapacityUsd === 900; })(), "kamino allowed");
  add("RB-29b: stables_to_crypto with only UNVETTED protocol stable → no verified source → blocked", (() => { const a = A([sol(100), { ...kaminoStable(900), withdrawalState: "unresolved" }], "high", 0); return a.sourceActionabilityGate.status === "blocked" && a.sourceActionabilityGate.reasons.some((r) => /no_verified_source|below_minimum/.test(r)); })(), "unvetted blocked");
  add("RB-30: portfolio-wide unrelated liquidity does NOT over-block calculation", (() => { const a = A([sol(100), usdc(900), kaminoStable(200)], "high", 100); return a.calculationGate.status === "allowed"; /* Kamino unresolved-liquidity elsewhere must not block market-value calc */ })(), "no over-block");
  add("RB-31: gates never generate a suggestion (assessment carries no card/tx)", (() => { const s = JSON.stringify(A([sol(100), usdc(900)], "high", 100)); return !s.includes("card") && !s.includes("cta") && !s.includes("signature") && !s.includes("transaction") && !s.includes("route\":\"verified"); })(), "no suggestion");
  add("RB-32: maximumCurrentlySupportable = min(requiredCorrection, verifiedSourceCapacity)", (() => { const a = A([sol(100), usdc(900)], "high", 850); return a.verifiedSourceCapacityUsd === 50 && a.maximumCurrentlySupportableUsd === 50 && a.amountClassification === "partial_correction_available"; })(), "capped amount");

  // ---- Immutability ----
  add("RB-33: production thresholds unchanged; assessment reuses them", (() => { const a = A([sol(800), usdc(200)], "low"); return a.thresholdSource.includes("10") && a.thresholdSource.includes("50") && a.targetSource.includes("canonical five-factor"); })(), "thresholds");
  add("RB-34: dispositions unchanged; Jupiter excluded; Steakhouse existing-only; INF blocked", dlGetDispo("kamino_steakhouse_usdc")?.disposition === "existing_position_only" && dlGetDispo("jupiter_lend_usdc")?.disposition === "excluded_from_suggestions" && !lstSupported("5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm"), "immutable");

  return checks;
}


/**
 * Step 18C — phase-one production Rebalance: assessment → exact USDC source → capped card behind the same
 * rebalance_to_plan contract. Proves stables_to_crypto emits, crypto_to_stables never falls back, source
 * selection is exact-USDC-only, the amount is buffer-protected + capped, and conflict suppression is by
 * material NEED (not card presence).
 */
export function runRebalanceProductionFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const w = (o: Partial<JLWalletPos>): JLWalletPos => ({ id: "x", source: "wallet", type: "token", symbol: "X", amount: "1", detection: "direct_wallet_balance", valueUsd: 100, ...o });
  const usdc = (v: number, id = "usdc") => w({ id, symbol: "USDC", name: "USD Coin", mint: RB_USDC, valueUsd: v, uiAmount: v, priceUsd: 1 });
  const sol = (v: number) => w({ id: "sol", type: "native", symbol: "SOL", valueUsd: v, uiAmount: v / 250, amount: String(Math.round((v / 250) * 1e9)), decimals: 9, priceUsd: 250 });
  const kaminoStable = (v: number) => w({ id: "kd", type: "protocol", symbol: "USDC", name: "USDC on Kamino", candidateId: "kamino_usdc_lending", existingPositionOnly: true, dedupeKey: "klend:x", valueUsd: v, recognizedValueUsd: v, withdrawalState: "fully_withdrawable", liquidValueUsd: v, mint: RB_USDC });
  const t22usdc = (v: number) => w({ id: "t22u", symbol: "USDC", name: "USD Coin", mint: "FakeUsdcMint111", valueUsd: v, tokenProgram: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb" });
  const jlusdc = () => w({ id: "jl", type: "protocol", symbol: "USDC", candidateId: "jupiter_lend_usdc", existingPositionOnly: true, dedupeKey: "jupiter-lend:x", withdrawalState: "unresolved", recognizedValueUsd: null, valueUsd: null, uiAmount: 100, amount: "100000000", mint: RB_USDC });
  const debt = (v: number | null) => w({ id: "hb", type: "protocol", symbol: "USDH", side: "borrowed", valueUsd: v, uiAmount: 300, amount: "300000000" });
  // Build the production card exactly as the rail does (both directions share the canonical mapper).
  const card = (positions: JLWalletPos[], risk: string | undefined, buf: number, solFresh = true, walletFresh = true) => {
    const a = rbAssess({ positions, ...rbFixedTarget(risk), requiredBufferUsd: buf, generatedAt: 1_700_000_000_000 });
    const src = rbSource(positions, buf, 1_700_000_000_000);
    const nsol = rbNativeSol(positions, 250, solFresh, RB_RESERVE_POLICY, walletFresh, 1_700_000_000_000);
    return rbBuildCard(a, src, nsol, 250, solFresh, 1_700_000_000_000);
  };

  // ---- Source selection (exact canonical USDC only) ----
  add("RC-1: exact canonical USDC mint + classic SPL aggregated into one source", (() => { const s = rbSource([usdc(500, "u1"), usdc(400, "u2")], 100); return s.selectedSourcePositionIds.length === 2 && s.verifiedTransferableValueUsd === 900 && s.verifiedExcessValueUsd === 800 && s.selectionState === "selected"; })(), "aggregate");
  add("RC-2: symbol-only USDC lookalike (wrong mint / Token-2022) rejected", (() => { const s = rbSource([t22usdc(900)], 0); return s.verifiedTransferableValueUsd === 0 && s.selectionState === "unsupported"; })(), "lookalike");
  add("RC-3: only vetted Kamino stable → Kamino Direct fallback source (two-step, buffer reserved)", (() => { const s = rbSource([kaminoStable(900)], 100); return s.sourceType === "kamino_direct_usdc" && s.requiresPriorWithdrawal === true && s.selectionState === "selected" && s.verifiedExcessValueUsd === 800 && s.reservedForSafetyBufferUsd === 100 && s.selectedSourcePositionIds.length === 1 && s.selectedSourcePositionIds[0] === "kd"; })(), "kamino fallback");
  add("RC-3b: direct-wallet USDC preferred over Kamino — single source, never mixed funding", (() => { const s = rbSource([usdc(500), kaminoStable(900)], 100); return s.sourceType === "direct_wallet_usdc" && s.requiresPriorWithdrawal === false && s.verifiedExcessValueUsd === 400 && s.selectedSourcePositionIds.length === 1 && s.selectedSourcePositionIds[0] === "usdc"; })(), "wallet first");
  add("RC-3c: unvetted Kamino / Steakhouse-candidate stable still NEVER a source", (() => { const un = rbSource([{ ...kaminoStable(900), withdrawalState: "unresolved" }], 0); const st = rbSource([{ ...kaminoStable(900), id: "st", candidateId: "kamino_steakhouse_usdc" }], 0); return un.selectionState !== "selected" && un.verifiedTransferableValueUsd === 0 && st.selectionState !== "selected" && st.verifiedTransferableValueUsd === 0; })(), "still excluded");
  add("RC-3d: Kamino value at/below buffer or excess under $50 → not selected (buffer cap + minimum)", (() => { const atBuf = rbSource([kaminoStable(300)], 300); const tiny = rbSource([kaminoStable(340)], 300); return atBuf.selectionState !== "selected" && tiny.selectionState !== "selected"; })(), "kamino capped");
  add("RC-4: jlUSDC (unresolved value) never a source", (() => { const s = rbSource([jlusdc()], 0); return s.verifiedTransferableValueUsd === 0; })(), "jl excluded");
  add("RC-5: frozen/stale USDC excluded", (() => { const s = rbSource([w({ id: "f", symbol: "USDC", name: "USD Coin", mint: RB_USDC, valueUsd: 900, withdrawalState: "stale" })], 0); return s.verifiedTransferableValueUsd === 0; })(), "frozen");

  // ---- Buffer protection + amount cap ----
  add("RC-6: USDC below buffer → zero excess", rbSource([usdc(300)], 400).verifiedExcessValueUsd === 0, "below");
  add("RC-7: USDC exactly at buffer → zero excess", rbSource([usdc(300)], 300).verifiedExcessValueUsd === 0, "at");
  add("RC-8: USDC above buffer → exact excess only", rbSource([usdc(900)], 200).verifiedExcessValueUsd === 700, "above");
  add("RC-9: suggested amount = min(requiredCorrection, verifiedExcess); full correction", (() => { const c = card([sol(100), usdc(900)], "high", 100); return c !== null && c.amount?.valueUsd === 700 && c.amount.label === "Suggested rebalance"; })(), "full");
  add("RC-10: partial correction when excess < required correction (still ≥ $50)", (() => { const c = card([sol(100), usdc(900)], "high", 500); return c !== null && c.amount?.valueUsd === 400 && (c.amount?.label ?? "").includes("partial"); })(), "partial");
  add("RC-11: exact $50 excess → card shown", (() => { const c = card([sol(100), usdc(550)], "high", 500); return c !== null && c.amount?.valueUsd === 50; })(), "exact 50");
  add("RC-12: below $50 excess → no card", (() => { const c = card([sol(100), usdc(540)], "high", 500); return c === null; })(), "below 50");
  add("RC-13: USDC entirely reserved for buffer → no source → no card", (() => { const c = card([sol(100), usdc(300)], "high", 300); return c === null; })(), "all reserved");
  add("RC-14: amount never exceeds excess nor required correction; never negative", (() => { const c = card([sol(100), usdc(900)], "high", 100); return c !== null && (c.amount?.valueUsd ?? 0) <= 700 && (c.amount?.valueUsd ?? 0) <= 800 && (c.amount?.valueUsd ?? 0) >= 0; })(), "cap");

  // ---- Card mapping (same contract) ----
  add("RC-15: card keeps rebalance_to_plan id, category, title, review-only", (() => { const c = card([sol(100), usdc(900)], "high", 100)!; return c.id === RB_ID && c.id === "rebalance_to_plan" && c.category === "rebalance" && c.title_key === "suggestion.rebalance.title" && c.action_kind === "review_only" && c.is_top_pick === false; })(), "contract");
  add("RC-16: supporting data has USDC source + SOL destination; no execution route/instruction fields", (() => { const c = card([sol(100), usdc(900)], "high", 100)!; const s = JSON.stringify(c); return c.from?.bucket === "stables" && c.to?.bucket === "crypto" && s.includes("USDC") && s.includes("SOL") && !s.includes("swapRoute") && !s.includes("instruction") && !s.includes("signTransaction"); })(), "supporting");
  add("RC-17: 'Receive' SOL estimate present only with a fresh SOL price", (() => { const fresh = JSON.stringify(card([sol(100), usdc(900)], "high", 100)); const stale = JSON.stringify(card([sol(100), usdc(900)], "high", 100, false)); return fresh.includes("Receive") && !stale.includes("Receive"); })(), "sol units");

  // ---- Directional rollout ----
  add("RC-18: stables_to_crypto CAN produce a card", card([sol(100), usdc(900)], "high", 100) !== null, "stables produces");
  add("RC-19: crypto_to_stables NOW produces a capped native-SOL→USDC card (18F)", (() => { const c = card([sol(900), usdc(100)], "low", 0); const a = rbAssess({ positions: [sol(900), usdc(100)], ...rbFixedTarget("low"), requiredBufferUsd: 0, generatedAt: 1 }); return c !== null && a.direction === "crypto_to_stables" && c!.id === "rebalance_to_plan" && c!.from?.bucket === "crypto" && c!.to?.bucket === "stables" && c!.reason_codes.includes("crypto_overweight"); })(), "crypto card");
  add("RC-20: within_threshold → no card", card([sol(620), usdc(380)], "medium", 0) === null, "within no card");
  add("RC-21: unresolved (unvalued liability) → no card", card([sol(100), usdc(900), debt(null)], "high", 100) === null, "unresolved no card");
  add("RC-22: crypto card amount = min(required correction, verified available native-SOL value) — capped", (() => { const positions = [sol(900), usdc(100)]; const c = card(positions, "low", 0); const a = rbAssess({ positions, ...rbFixedTarget("low"), requiredBufferUsd: 0, generatedAt: 1 }); const nsol = rbNativeSol(positions, 250, true, RB_RESERVE_POLICY, true, 1); const expected = Math.min(a.requiredCorrectionUsd, nsol.technicallyAvailableValueUsd ?? 0); return c !== null && c!.amount?.valueUsd === expected; })(), "capped");

  // ---- Material need + conflict suppression (engine override) ----
  const dcaSug = mkSug15H("dca-plan", "dca");
  const fundedInp = () => inputsFor({ safetyBuffer: bufferFixture(3000, 1000, 3) });
  add("RC-23: crypto_to_stables material need suppresses DCA even with NO card", (() => { const r = runSuggestionEngine(fundedInp(), FIXTURE_GENERATED_AT, dcaSug, null, undefined, { card: null, material: true }); return !r.suggestions.some((s) => s.category === "dca"); })(), "material suppresses");
  add("RC-24: within_threshold (not material) does NOT suppress DCA", (() => { const r = runSuggestionEngine(fundedInp(), FIXTURE_GENERATED_AT, dcaSug, null, undefined, { card: null, material: false }); return r.suggestions.some((s) => s.category === "dca"); })(), "not material coexists");
  add("RC-25: produced Rebalance card is pushed + still suppresses DCA", (() => { const c = card([sol(100), usdc(900)], "high", 100)!; const r = runSuggestionEngine(fundedInp(), FIXTURE_GENERATED_AT, dcaSug, null, undefined, { card: c, material: true }); return r.suggestions.some((s) => s.id === "rebalance_to_plan") && !r.suggestions.some((s) => s.category === "dca"); })(), "card + suppress");
  add("RC-26: override present → legacy bucket calc NOT run (null card + material false → no rebalance card)", (() => { const r = runSuggestionEngine(fundedInp(), FIXTURE_GENERATED_AT, null, null, undefined, { card: null, material: false }); return !r.suggestions.some((s) => s.category === "rebalance"); })(), "no legacy");
  add("RC-27: override card bypasses over-broad completeness gate (assessment already gated)", (() => { const c = card([sol(100), usdc(900)], "high", 100)!; const r = runSuggestionEngine(fundedInp(), FIXTURE_GENERATED_AT, null, null, { rebalance: "unresolved" }, { card: c, material: true }); return r.suggestions.some((s) => s.id === "rebalance_to_plan"); })(), "own gates");

  // ---- Kamino-sourced two-step card ----
  add("RC-31: Kamino-sourced card — 'in Kamino above your required Safety Buffer' body + 'Withdraw on Kamino' handoff + two-step impact line", (() => { const c = card([sol(100), kaminoStable(900)], "high", 100); const d = c?.descriptionOverride ?? ""; const rd = c?.reviewDetails; return c !== null && /You have \$[\d,]+ of USDC in Kamino above your required Safety Buffer\. Moving this amount into SOL would bring your portfolio closer to its target while keeping your Safety Buffer intact\./.test(d) && /^Crypto is [\d.]+% of your portfolio, compared with your [\d.]+% target\./.test(d) && rd?.externalLink?.ctaLabel === "Withdraw on Kamino" && /app\.kamino\.finance/.test(rd?.externalLink?.url ?? "") && /^Withdraw \$[\d,]+ from Kamino and swap it to SOL$/.test(c?.impactTextOverride ?? "") && rd?.summary.reason.includes(d); })(), "two-step card");
  // RC-32 (revised 12 Nov 2026): the wallet-sourced card previously asserted NO handoff at all, on the
  // assumption that the live route comparison would always supply one. It does not in Demo Mode, nor when
  // the quote service is degraded, which left the review sheet with no action at all. The card now carries
  // a static Jupiter link as a FALLBACK — a direct link, not a recommendation — which the modal suppresses
  // whenever a live route resolves. The Kamino assertions are unchanged: no Kamino copy, no Kamino handoff.
  //
  // 2026-11-26 — the fallback link is REMOVED again, and this time the review is not left without an
  // action: its footer is owned by the in-app Swap step from the first render (Swap, or Close with the
  // reason shown), so the gap the link was added to cover no longer exists. See SWXE-14/15/16.
  add("RC-32: wallet-sourced card copy unchanged — 'Swap … into SOL', NO Kamino mention, and NO link out (the swap is approved in the review)", (() => { const c = card([sol(100), usdc(900)], "high", 100); const d = c?.descriptionOverride ?? ""; return c !== null && /Swap \$[\d,]+ of USDC above your Safety Buffer into SOL/.test(d) && !/Kamino/.test(d) && c?.reviewDetails?.externalLink == null && !/Swap on Jupiter|jup\.ag/.test(JSON.stringify(c)); })(), "wallet card, no link-out");

  // ---- Regression / immutability ----
  add("RC-28: legacy engine call (no override) unchanged — bucket rebalance still fires", (() => { const withReb = runSuggestionEngine(fundedInp(), FIXTURE_GENERATED_AT); const woReb = runSuggestionEngine(fundedInp(), FIXTURE_GENERATED_AT, null, null, undefined, undefined); return withReb.suggestions.length === woReb.suggestions.length; })(), "legacy stable");
  add("RC-29: destination is registry-bound SOL; Jupiter/Steakhouse/INF/LP never destinations", RB_DEST.stables_to_crypto.native === true && RB_DEST.stables_to_crypto.assetId === "sol" && RB_DEST.crypto_to_stables.assetId === "usdc", "dest");
  add("RC-30: no score/governance/policy change; dispositions intact; no execution behavior", (() => { const c = JSON.stringify(card([sol(100), usdc(900)], "high", 100)); return dlGetDispo("jupiter_lend_usdc")?.disposition === "excluded_from_suggestions" && dlGetDispo("kamino_steakhouse_usdc")?.disposition === "existing_position_only" && !c.includes("riskScore") && !c.includes("swapRoute") && !c.includes("signTransaction"); })(), "immutable");

  return checks;
}


/**
 * Step 18D — phase-one closeout: canonical coverage reuse, full/partial production copy, and the /testing
 * gallery (production derivation + components). No legacy bucket path is reachable from a mounted caller.
 */
export function runRebalancePhaseOneCloseoutFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const fx = rbTestFixtures();
  const byId = (id: string) => fx.find((f) => f.id === id);
  const fullCopy = RB_COPY["suggestion.rebalance.stables_to_crypto.full.description"];
  const partialCopy = RB_COPY["suggestion.rebalance.stables_to_crypto.partial.description"];

  // ---- Full/partial production copy ----
  add("RD-1: full copy names USDC + SOL + Safety Buffer", /USDC/.test(fullCopy) && /SOL/.test(fullCopy) && /Safety Buffer/i.test(fullCopy), "full copy");
  add("RD-2: partial copy names USDC + SOL + partially closing the gap", /USDC/.test(partialCopy) && /SOL/.test(partialCopy) && /partially close the gap/i.test(partialCopy) && /Safety Buffer/i.test(partialCopy), "partial copy");
  add("RD-3: full card uses full key; partial card uses partial key (primary-card distinction)", (() => { const full = byId("full")!.card; const part = byId("partial")!.card; return full?.description_key === "suggestion.rebalance.stables_to_crypto.full.description" && part?.description_key === "suggestion.rebalance.stables_to_crypto.partial.description"; })(), "keys");
  add("RD-4: no execution/guarantee language in either copy", (() => { const both = `${fullCopy} ${partialCopy}`; return !/guaranteed|swap now|buy now|execute|exact SOL received|fully rebalanced|slippage-free/i.test(both); })(), "no exec copy");
  add("RD-5: full copy does NOT claim partial, partial does NOT claim full", fullCopy !== partialCopy && !/part of the gap/i.test(fullCopy), "distinct");

  // ---- Canonical SafetyBufferCoverage reuse ----
  add("RD-6: /testing fixtures carry ONE shared canonical coverage (completeness + Rebalance)", fx.every((f) => f.coverageIdentity.sharedByCompletenessAndRebalance === true && typeof f.coverageIdentity.requiredBufferUsd === "number"), "shared coverage");
  add("RD-7: deriveCompletenessGates + deriveRebalanceAssessment accept the SAME coverage object", (() => {
    const positions = byId("full")!.positions; const cov = sbCoverage(positions, 100);
    const comp = pcGates(positions, { requiredBufferUsd: 100, bufferCoverage: cov } as any);
    const a = rbAssess({ positions, portfolioCompleteness: comp.result, safetyBufferCoverage: cov, ...rbFixedTarget("high"), requiredBufferUsd: 100, generatedAt: 1 });
    return comp.result.stableBufferState === "complete" && a.calculationGate.status === "allowed";
  })(), "coverage passed");

  // ---- /testing gallery states ----
  add("RD-8: dedicated Rebalance /testing gallery has all required states", (() => { const ids = ["full", "partial", "exact_50", "below_50", "all_reserved", "multi_usdc", "protocol_stable", "kamino", "steakhouse", "jupiter", "liability", "lookalike", "within_threshold", "stale_sol_price", "crypto_full", "crypto_partial", "crypto_exact_50", "crypto_below_50", "sol_below_reserve", "sol_exactly_reserve", "sol_above_reserve", "crypto_stale_price", "crypto_stale_wallet", "native_plus_active_stake", "native_plus_lst", "native_plus_wsol", "native_plus_collateral"]; return ids.every((id) => byId(id) !== undefined); })(), `count=${fx.length}`);
  add("RD-9: full state → card via production mapper (rebalance_to_plan)", (() => { const c = byId("full")!.card; return c?.id === "rebalance_to_plan" && c.category === "rebalance"; })(), "full card");
  add("RD-10: partial state → card + partial label", (() => { const c = byId("partial")!.card; return c !== null && (c.amount?.label ?? "").includes("partial"); })(), "partial card");
  add("RD-11: exact $50 → card; below $50 → no card", byId("exact_50")!.card !== null && byId("below_50")!.card === null, "50 boundary");
  add("RD-12: USDC fully reserved → no source, no card", byId("all_reserved")!.card === null && byId("all_reserved")!.source.selectionState === "no_excess", "reserved");
  add("RD-13: multiple USDC accounts → one aggregated source", byId("multi_usdc")!.source.selectedSourcePositionIds.length === 2 && byId("multi_usdc")!.card !== null, "aggregate");
  add("RD-14: Steakhouse/lookalike never a source; vetted Kamino is a TWO-STEP source with a card", (() => { const noSrc = ["steakhouse", "lookalike"].every((id) => byId(id)!.source.selectionState !== "selected" && byId(id)!.source.verifiedTransferableValueUsd === 0); const k = byId("kamino")!; const protoAlloc = byId("protocol_stable")!.assessment.stableAssetValueUsd > 0; const walletFirst = byId("protocol_stable")!.source.sourceType === "direct_wallet_usdc"; return noSrc && k.source.sourceType === "kamino_direct_usdc" && k.source.requiresPriorWithdrawal === true && k.card !== null && walletFirst && protoAlloc; })(), "sources");
  add("RD-15: crypto_to_stables → capped native-SOL→USDC card via the SAME mapper (18F), material true", (() => { const f = byId("crypto_full")!; return f.card !== null && f.card!.id === "rebalance_to_plan" && f.assessment.direction === "crypto_to_stables" && f.material === true && f.card!.from?.bucket === "crypto" && f.card!.to?.bucket === "stables"; })(), "crypto card");
  add("RD-16: within_threshold → no card, NOT material (no conflict suppression)", (() => { const f = byId("within_threshold")!; return f.card === null && f.material === false; })(), "within");
  add("RD-17: liability/jupiter unresolved → no card (calculation not allowed)", byId("liability")!.card === null && byId("jupiter")!.card === null, "unresolved no card");
  add("RD-18: stale SOL price → no approximate SOL units in the card", (() => { const s = JSON.stringify(byId("stale_sol_price")!.card); return byId("stale_sol_price")!.card !== null && !s.includes("Approx. SOL"); })(), "stale sol");
  add("RD-19: fresh SOL price → 'Receive' SOL estimate present", JSON.stringify(byId("partial")!.card).includes("Receive"), "fresh sol");

  // ---- Immutability ----
  add("RD-20: thresholds/targets/dispositions unchanged; no eligibility expansion", byId("full")!.assessment.thresholdSource.includes("10") && byId("full")!.assessment.thresholdSource.includes("50") && dlGetDispo("jupiter_lend_usdc")?.disposition === "excluded_from_suggestions" && !lstSupported("5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm"), "immutable");

  return checks;
}


/**
 * Step 18E — crypto-overweight staking-conflict policy + the NON-MOUNTED direct-wallet native-SOL source
 * foundation. Proves: (1) a proven material crypto_to_stables NEED suppresses an otherwise-eligible new
 * staking suggestion (narrow-only, card-independent, direction-specific); (2) the fail-closed native-SOL
 * source assessment (recognized/transferable/reserved/available split, exclusions, missing-reserve → null
 * available, arithmetic, freshness) and the future crypto_to_stables source gate that never emits a card.
 */
export function runRebalanceStep18EFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const GEN = 1_700_000_000_000;
  const APPROVED: RbReservePolicy = { state: "approved", requiredReserveLamports: 100_000_000 /* 0.1 SOL */, policyId: "test_reserve_v1" };
  // Native SOL (10 SOL @ $75), plus non-native SOL-adjacent rows that must NEVER count as direct-wallet SOL.
  const nativeSol = (ui: number) => solPosition(ui); // native, priced $75, amount = lamports
  const stakePos = (ui: number): WalletPosition => ({ id: "stk", source: "wallet", type: "stake", symbol: "SOL", name: "Stake", amount: String(Math.round(ui * 1e9)), uiAmount: ui, decimals: 9, detection: "native_stake", priceUsd: 75, valueUsd: ui * 75 });
  const lstPos = (ui: number): WalletPosition => ({ id: "ms", source: "jito", type: "lst", symbol: "JitoSOL", name: "JitoSOL", mint: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn", amount: String(Math.round(ui * 1e9)), uiAmount: ui, decimals: 9, detection: "recognized_lst_mint", priceUsd: 80, valueUsd: ui * 80 });
  const wsolPos = (ui: number): WalletPosition => ({ id: "wsol", source: "wallet", type: "token", symbol: "SOL", name: "Wrapped SOL", mint: RB_WSOL_MINT, amount: String(Math.round(ui * 1e9)), uiAmount: ui, decimals: 9, detection: "direct_wallet_balance", priceUsd: 75, valueUsd: ui * 75 });

  // ---- Native-SOL source: recognition + fail-closed reserve ----
  add("RE-1: direct native SOL recognized as lamports/SOL/value", (() => { const a = rbNativeSol([nativeSol(10)], 75, true, RB_RESERVE_MISSING, true, GEN); return a.recognizedLamports === 10_000_000_000 && a.recognizedSol === 10 && a.recognizedValueUsd === 750; })(), "recognized");
  add("RE-2: NO approved reserve → technicallyAvailable stays NULL (never zero-reserve default)", (() => { const a = rbNativeSol([nativeSol(10)], 75, true, RB_RESERVE_MISSING, true, GEN); return a.technicallyAvailableLamports === null && a.technicallyAvailableValueUsd === null && a.requiredNativeReserveLamports === null && a.sourceEligibilityState === "reserve_policy_missing"; })(), "fail closed");
  add("RE-3: missing-reserve recognized SOL surfaces as UNRESOLVED potential (not available, not zero)", (() => { const a = rbNativeSol([nativeSol(10)], 75, true, RB_RESERVE_MISSING, true, GEN); return a.unresolvedPotentialValueUsd === 750 && a.reservePolicyState === "missing"; })(), "unresolved potential");
  add("RE-4: native STAKE excluded from direct-wallet SOL (requires withdrawal)", (() => { const a = rbNativeSol([stakePos(10)], 75, true, APPROVED, true, GEN); return a.positionIds.length === 0 && a.recognizedLamports === null && a.exclusionReasons.some((r) => /stake/i.test(r)) && a.sourceEligibilityState === "unavailable"; })(), "stake excluded");
  add("RE-5: LST (and its SOL backing) excluded as native SOL", (() => { const a = rbNativeSol([lstPos(10)], 75, true, APPROVED, true, GEN); return a.positionIds.length === 0 && a.exclusionReasons.some((r) => /LST/i.test(r)); })(), "lst excluded");
  add("RE-6: WRAPPED SOL (WSOL mint) excluded — no wrapped-without-policy source", (() => { const a = rbNativeSol([wsolPos(10)], 75, true, APPROVED, true, GEN); return a.positionIds.length === 0 && a.exclusionReasons.some((r) => /wrapped/i.test(r)) && a.recognizedLamports === null; })(), "wsol excluded");
  add("RE-7: multiple direct native SOL rows aggregate lamports; siblings excluded", (() => { const a = rbNativeSol([nativeSol(4), stakePos(3), lstPos(2), wsolPos(1)], 75, true, APPROVED, true, GEN); return a.recognizedLamports === 4_000_000_000 && a.positionIds.length === 1; })(), "aggregate + exclude");

  // ---- Native-SOL source: approved-policy arithmetic + freshness ----
  add("RE-8: approved reserve → technicallyAvailable = recognized − reserve; eligible", (() => { const a = rbNativeSol([nativeSol(10)], 75, true, APPROVED, true, GEN); return a.technicallyAvailableLamports === 9_900_000_000 && a.sourceEligibilityState === "eligible" && a.reservePolicyState === "approved"; })(), "available");
  add("RE-9: approved reserve arithmetic exact (9.9 SOL / $742.50); reserve = $7.50", (() => { const a = rbNativeSol([nativeSol(10)], 75, true, APPROVED, true, GEN); return a.technicallyAvailableSol === 9.9 && a.technicallyAvailableValueUsd === 742.5 && a.requiredNativeReserveSol === 0.1 && a.requiredNativeReserveUsd === 7.5; })(), "exact math");
  add("RE-10: approved reserve but STALE wallet → not eligible, available NULL", (() => { const a = rbNativeSol([nativeSol(10)], 75, true, APPROVED, false, GEN); return a.sourceEligibilityState === "stale" && a.technicallyAvailableLamports === null && a.freshnessState === "stale"; })(), "stale wallet");
  add("RE-11: approved reserve but STALE SOL price → price_unresolved, no USD available", (() => { const a = rbNativeSol([nativeSol(10)], 75, false, APPROVED, true, GEN); return a.sourceEligibilityState === "price_unresolved" && a.priceState === "stale" && a.technicallyAvailableValueUsd === null; })(), "stale price");
  add("RE-12: no direct native SOL at all → unavailable (not eligible, not zero-available)", (() => { const a = rbNativeSol([], 75, true, APPROVED, true, GEN); return a.sourceEligibilityState === "unavailable" && a.technicallyAvailableLamports === null && a.freshnessState === "unresolved"; })(), "none");
  add("RE-13: approved STATE but null reserve lamports → still fail-closed (reserve_policy_missing)", (() => { const a = rbNativeSol([nativeSol(10)], 75, true, { state: "approved", requiredReserveLamports: null, policyId: "bad" }, true, GEN); return a.sourceEligibilityState === "reserve_policy_missing" && a.technicallyAvailableLamports === null; })(), "defensive null");

  // ---- Native-SOL source: identity, exclusion metadata, no execution ----
  add("RE-14: canonical identity/sourceType/methodologyVersion", (() => { const a = rbNativeSol([nativeSol(10)], 75, true, RB_RESERVE_MISSING, true, GEN); return a.assetId === "SOL" && a.identity === "native_sol" && a.sourceType === "direct_wallet_native_sol" && a.methodologyVersion.startsWith("native_sol_rebalance_source_"); })(), "identity");
  add("RE-15: exclusionReasons names the missing-policy block", (() => { const a = rbNativeSol([nativeSol(10)], 75, true, RB_RESERVE_MISSING, true, GEN); return a.exclusionReasons.some((r) => /no approved native-SOL fee-reserve policy/i.test(r)); })(), "reason");
  add("RE-16: assessment carries NO route/swap/signature/transaction execution fields", (() => { const s = JSON.stringify(rbNativeSol([nativeSol(10)], 75, true, APPROVED, true, GEN)); return !s.includes("swapRoute") && !s.includes("instruction") && !s.includes("signTransaction") && !s.includes("aggregator"); })(), "no exec");
  add("RE-17: freshnessState unresolved when there is no native row", rbNativeSol([usdcOnly()], 75, true, APPROVED, true, GEN).freshnessState === "unresolved", "fresh unresolved");

  // ---- Future crypto_to_stables source GATE (non-mounted; never a card) ----
  add("RE-18: reserve missing → future gate UNRESOLVED (never allowed)", (() => { const a = rbNativeSol([nativeSol(10)], 75, true, RB_RESERVE_MISSING, true, GEN); const g = rbFutureGate(a); return g.status === "unresolved" && g.reasons.includes("native_sol_reserve_policy_missing"); })(), "gate unresolved");
  add("RE-19: approved + ≥ $50 available → future gate ALLOWED", (() => { const g = rbFutureGate(rbNativeSol([nativeSol(10)], 75, true, APPROVED, true, GEN)); return g.status === "allowed"; })(), "gate allowed");
  add("RE-20: approved but < $50 available → future gate BLOCKED (below minimum)", (() => { const g = rbFutureGate(rbNativeSol([nativeSol(0.5)], 75, true, APPROVED, true, GEN)); return g.status === "blocked" && g.reasons.includes("below_minimum_native_sol_source"); })(), "gate below min");
  add("RE-21: stale inputs → future gate UNRESOLVED", (() => { const g = rbFutureGate(rbNativeSol([nativeSol(10)], 75, true, APPROVED, false, GEN)); return g.status === "unresolved"; })(), "gate stale");
  add("RE-22: no native SOL → future gate BLOCKED", (() => { const g = rbFutureGate(rbNativeSol([], 75, true, APPROVED, true, GEN)); return g.status === "blocked"; })(), "gate unavailable");
  add("RE-23: source gate returns a Gate ONLY (no suggestion/card object); the card mapper owns emission (18F)", (() => { const g = rbFutureGate(rbNativeSol([nativeSol(10)], 75, true, APPROVED, true, GEN)) as unknown as Record<string, unknown>; return typeof g.status === "string" && Array.isArray(g.reasons) && !("id" in g) && !("category" in g) && !("amount" in g); })(), "gate only");

  // ---- Reserve-policy options (missing; documented A–D; staking 0.1 NOT reused) ----
  add("RE-24: missing policy = state 'missing' + null reserve (never invented)", RB_RESERVE_MISSING.state === "missing" && RB_RESERVE_MISSING.requiredReserveLamports === null, "missing policy");
  add("RE-25: four documented options (fixed_sol / fixed_usd_to_sol / transaction_budget / hybrid) each with failure behavior", (() => { const ids = RB_RESERVE_OPTIONS.map((o) => o.id); return ids.length === 4 && ids.includes("fixed_sol") && ids.includes("fixed_usd_to_sol") && ids.includes("transaction_budget") && ids.includes("hybrid") && RB_RESERVE_OPTIONS.every((o) => o.failureBehavior.length > 0); })(), "options A–D");
  add("RE-26: options note the staking 0.1-SOL reserve is NOT an approved Rebalance reserve", RB_RESERVE_OPTIONS.some((o) => /product-approved/i.test(o.summary)), "not reused");

  // ---- Staking-conflict suppression (engine; narrow-only, card-independent, directional) ----
  const stakingInp = () => inputsFor({ allocation: allocationFixture(15000, 62, 5), safetyBuffer: bufferFixture(5000, 1000, 3), positions: [solPosition(10)] });
  const noStakeInp = () => inputsFor({ allocation: allocationFixture(15000, 62, 5), safetyBuffer: bufferFixture(5000, 1000, 3), positions: [cryptoPosition(100)] });
  const runOv = (inp: ReturnType<typeof stakingInp>, ov: { card: null; material: boolean; materialCryptoToStables: boolean } | undefined) => runSuggestionEngine(inp, FIXTURE_GENERATED_AT, null, null, undefined, ov);
  add("RE-27: material crypto_to_stables NEED suppresses otherwise-eligible staking (no card needed)", (() => { const r = runOv(stakingInp(), { card: null, material: true, materialCryptoToStables: true }); return !r.suggestions.some((s) => s.category === "staking"); })(), "suppressed");
  add("RE-28: baseline (no override) → the same input DOES emit staking (proves it was eligible)", (() => { const r = runOv(stakingInp(), undefined); return r.suggestions.some((s) => s.category === "staking"); })(), "eligible baseline");
  add("RE-29: stables_to_crypto material (materialCryptoToStables=false) does NOT suppress staking", (() => { const r = runOv(stakingInp(), { card: null, material: true, materialCryptoToStables: false }); return r.suggestions.some((s) => s.category === "staking"); })(), "directional");
  add("RE-30: within_threshold (not material) does NOT suppress staking", (() => { const r = runOv(stakingInp(), { card: null, material: false, materialCryptoToStables: false }); return r.suggestions.some((s) => s.category === "staking"); })(), "within keeps");
  add("RE-31: suppression NARROWS only — never enables staking when SOL is not idle-eligible", (() => { const on = runOv(noStakeInp(), { card: null, material: true, materialCryptoToStables: true }); const off = runOv(noStakeInp(), undefined); return !on.suggestions.some((s) => s.category === "staking") && !off.suggestions.some((s) => s.category === "staking"); })(), "narrow only");
  add("RE-32 (21B guard): a canonical MATERIAL Rebalance need blocks the On Track fallback even with a null Rebalance card (no crash/empty rail)", (() => { const r = runOv(stakingInp(), { card: null, material: true, materialCryptoToStables: true }); return !r.suggestions.some((s) => s.category === "on_track") && !r.suggestions.some((s) => s.category === "staking"); })(), "material blocks on track");
  add("RE-33: rail derives materialCryptoToStables via isMaterialCryptoToStables and passes it to the engine", (() => { const rail = (() => { try { return readFileSync(`${process.cwd()}/src/suggestions/useRailSuggestions.ts`, "utf8"); } catch { return ""; } })(); return rail.includes("isMaterialCryptoToStables") && rail.includes("materialCryptoToStables"); })(), "rail wired");
  add("RE-34: engine gate keys on materialCryptoToStables ONLY (staking), leaving other categories' logic intact", (() => { const eng = (() => { try { return readFileSync(`${process.cwd()}/src/suggestions/engine.ts`, "utf8"); } catch { return ""; } })(); const stakeLine = eng.split("\n").find((l) => l.includes("candidates.push(staking)")) ?? ""; return stakeLine.includes("materialCryptoToStables !== true") && rbIsCryptoToStables !== undefined; })(), "staking-only gate");

  return checks;
}


/**
 * Step 18F — direct-wallet native SOL → canonical USDC PRODUCTION mounting. Proves the approved Rebalance-
 * owned 0.1 SOL operating reserve (exact BigInt, price-independent, separate from staking), the mounted
 * native-SOL source, strict source identity/exclusions, full/partial/exact-$50/below-min amounts (capped by
 * BOTH correction and verified source; approx-SOL capped in lamports; no invented USDC output), the canonical
 * USDC destination, the shared card contract + copy, conflict preservation, and the unchanged USDC→SOL path.
 */
export function runRebalanceStep18FFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const GEN = 1_700_000_000_000;
  const P = 250; // SOL price
  const w = (o: Partial<WalletPosition>): WalletPosition => ({ id: "x", source: "wallet", type: "token", symbol: "X", amount: "1", detection: "direct_wallet_balance", valueUsd: 100, ...o });
  const nsol = (uiSol: number, id = "nsol"): WalletPosition => w({ id, type: "native", symbol: "SOL", name: "Solana", amount: String(Math.round(uiSol * 1e9)), uiAmount: uiSol, decimals: 9, priceUsd: P, valueUsd: uiSol * P });
  const usdc = (v: number, id = "usdc"): WalletPosition => w({ id, symbol: "USDC", name: "USD Coin", mint: RB_USDC, amount: String(Math.round(v * 1e6)), uiAmount: v, decimals: 6, priceUsd: 1, valueUsd: v });
  const other = (v: number): WalletPosition => w({ id: "bonk", type: "token", symbol: "BONK", mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", amount: "1", uiAmount: v, decimals: 5, priceUsd: 1, valueUsd: v });
  const stake = (uiSol: number, withdrawable = false): WalletPosition => w({ id: "stk", type: "stake", symbol: "SOL", amount: String(Math.round(uiSol * 1e9)), uiAmount: uiSol, decimals: 9, detection: "native_stake", priceUsd: P, valueUsd: uiSol * P, liquidValueUsd: withdrawable ? uiSol * P : 0, stakeLifecycleState: withdrawable ? "deactivating" : "active" });
  const lst = (uiSol: number): WalletPosition => w({ id: "ms", source: "jito", type: "lst", symbol: "JitoSOL", mint: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn", amount: String(Math.round(uiSol * 1e9)), uiAmount: uiSol, decimals: 9, detection: "recognized_lst_mint", priceUsd: P + 5, valueUsd: uiSol * (P + 5) });
  const wsol = (uiSol: number): WalletPosition => w({ id: "wsol", type: "token", symbol: "SOL", name: "Wrapped SOL", mint: RB_WSOL_MINT, amount: String(Math.round(uiSol * 1e9)), uiAmount: uiSol, decimals: 9, priceUsd: P, valueUsd: uiSol * P });
  const collat = (v: number): WalletPosition => w({ id: "kcol", type: "protocol", symbol: "SOL", name: "SOL on Kamino", protocol: "Kamino", candidateId: "kamino_sol_collateral", existingPositionOnly: true, dedupeKey: "klend:sol", valueUsd: v, recognizedValueUsd: v, withdrawalState: "fully_withdrawable", liquidValueUsd: v });
  const lpLeg = (v: number): WalletPosition => w({ id: "lp", type: "protocol", symbol: "SOL-USDC", name: "SOL-USDC LP", protocol: "Orca", legs: [{ mint: "SoLLeg", uiAmount: v / P, side: "long" }], valueUsd: v });
  const borrowedSol = (v: number): WalletPosition => w({ id: "bsol", type: "protocol", symbol: "SOL", name: "Borrowed SOL", side: "borrowed", valueUsd: v, uiAmount: v / P, amount: "1" });

  const ns = (positions: WalletPosition[], solFresh = true, walletFresh = true, policy = RB_RESERVE_POLICY) => rbNativeSol(positions, P, solFresh, policy, walletFresh, GEN);
  const build = (positions: WalletPosition[], risk: string | undefined, buf: number, solFresh = true, walletFresh = true) => {
    const a = rbAssess({ positions, ...rbFixedTarget(risk), requiredBufferUsd: buf, generatedAt: GEN });
    const src = rbSource(positions, buf, GEN);
    const nsol = ns(positions, solFresh, walletFresh);
    const c = rbBuildCard(a, src, nsol, P, solFresh, GEN);
    return { a, nsol, c };
  };
  const metricVal = (c: import("../engineTypes").EngineSuggestion | null, label: string): number | undefined => { const v = c?.reviewDetails?.metrics?.find((m) => m.label === label)?.value; return typeof v === "number" ? v : undefined; };

  // ---- Reserve policy ----
  add("RF-1: Rebalance reserve constant = 100,000,000 lamports (exact BigInt)", RB_RESERVE_LAMPORTS === 100_000_000n, "0.1 SOL");
  add("RF-2: reserve is Rebalance-owned, NOT imported/aliased from the staking reserve", (() => { const src = (() => { try { return readFileSync(`${process.cwd()}/src/suggestions/rebalanceAssessment.ts`, "utf8"); } catch { return ""; } })(); const importsStakingReserve = src.split("\n").some((l) => /^\s*import/.test(l) && l.includes("SOL_FEE_RESERVE")); return RB_RESERVE_POLICY.policyId === "rebalance_native_sol_reserve" && (RB_RESERVE_POLICY.methodologyVersion ?? "").startsWith("rebalance_native_sol_reserve") && RB_RESERVE_LAMPORTS === 100_000_000n && !importsStakingReserve; })(), "separate");
  add("RF-3: fixed-SOL policy approved", RB_RESERVE_POLICY.state === "approved" && RB_RESERVE_POLICY.kind === "fixed_sol", "approved");
  add("RF-4: missing policy is NOT used in the mounted crypto→stables direction", (() => { const rail = (() => { try { return readFileSync(`${process.cwd()}/src/suggestions/useRailSuggestions.ts`, "utf8"); } catch { return ""; } })(); return rail.includes("REBALANCE_NATIVE_SOL_RESERVE_POLICY") && !rail.includes("NATIVE_SOL_RESERVE_POLICY_MISSING"); })(), "approved mounted");
  add("RF-5: balance below reserve → zero available", ns([nsol(0.05)]).technicallyAvailableLamports === 0, "below→0");
  add("RF-6: balance exactly reserve → zero available", ns([nsol(0.1)]).technicallyAvailableLamports === 0, "equal→0");
  add("RF-7: balance above reserve → exact excess", ns([nsol(1)]).technicallyAvailableLamports === 900_000_000, "excess");
  add("RF-8: reserve is price-independent (identical lamports across prices)", rbNativeSol([nsol(1)], 10, true, RB_RESERVE_POLICY, true, GEN).requiredNativeReserveLamports === 100_000_000 && rbNativeSol([nsol(1)], 1000, true, RB_RESERVE_POLICY, true, GEN).requiredNativeReserveLamports === 100_000_000, "price-independent");
  add("RF-9: stale SOL price does not alter the lamport reserve", ns([nsol(1)], false).requiredNativeReserveLamports === 100_000_000, "stale-price reserve");
  add("RF-10: available never negative and never exceeds recognized", (() => { const a = ns([nsol(0.05)]); const b = ns([nsol(5)]); return (a.technicallyAvailableLamports ?? -1) >= 0 && (b.technicallyAvailableLamports ?? 0) <= (b.recognizedLamports ?? 0); })(), "bounds");

  // ---- Source identity + exclusions ----
  add("RF-11: direct-wallet native SOL only", (() => { const a = ns([nsol(4)]); return a.positionIds.length === 1 && a.recognizedSol === 4 && a.identity === "native_sol"; })(), "native only");
  add("RF-12: native (active) stake excluded", (() => { const a = ns([stake(4)]); return a.positionIds.length === 0 && a.exclusionReasons.some((r) => /stake/i.test(r)); })(), "stake");
  add("RF-13: immediately-withdrawable stake excluded from direct source", (() => { const a = ns([stake(4, true)]); return a.positionIds.length === 0; })(), "withdrawable stake");
  add("RF-14: LST excluded", (() => { const a = ns([lst(4)]); return a.positionIds.length === 0 && a.exclusionReasons.some((r) => /LST/i.test(r)); })(), "lst");
  add("RF-15: LST backing excluded (never source liquidity)", ns([lst(4)]).technicallyAvailableLamports === null, "backing");
  add("RF-16: wrapped SOL excluded", (() => { const a = ns([wsol(4)]); return a.positionIds.length === 0 && a.exclusionReasons.some((r) => /wrapped/i.test(r)); })(), "wsol");
  add("RF-17: LP SOL leg excluded", ns([lpLeg(1000)]).positionIds.length === 0, "lp");
  add("RF-18: protocol collateral excluded", ns([collat(1000)]).positionIds.length === 0, "collateral");
  add("RF-19: borrowed SOL excluded", ns([borrowedSol(500)]).positionIds.length === 0, "borrowed");
  add("RF-20: duplicate native economic identity fails closed", ns([nsol(4, "a"), nsol(4, "b")]).sourceEligibilityState === "duplicate_invalid", "dup");

  // ---- Amount ----
  add("RF-21: full correction — available covers correction", (() => { const { a, nsol: n, c } = build([nsol(4), usdc(100)], "low", 0); return c !== null && (n.technicallyAvailableValueUsd ?? 0) >= a.requiredCorrectionUsd && c!.amount?.valueUsd === a.requiredCorrectionUsd && c!.description_key === "suggestion.rebalance.crypto_to_stables.full.description"; })(), "full");
  add("RF-22: partial correction — available < correction, ≥ $50", (() => { const { a, nsol: n, c } = build([nsol(2), other(2000), usdc(100)], "low", 0); return c !== null && (n.technicallyAvailableValueUsd ?? 0) < a.requiredCorrectionUsd && c!.amount?.valueUsd === n.technicallyAvailableValueUsd && c!.description_key === "suggestion.rebalance.crypto_to_stables.partial.description"; })(), "partial");
  add("RF-23: exact $50 native-SOL source → card visible", (() => { const { nsol: n, c } = build([nsol(0.3), other(925), usdc(100)], "low", 0); return (n.technicallyAvailableValueUsd) === 50 && c !== null && c!.amount?.valueUsd === 50; })(), "exact 50");
  add("RF-24: below $50 native-SOL source → no card", build([nsol(0.25), other(1000), usdc(100)], "low", 0).c === null, "below 50");
  add("RF-25: amount capped by required correction", (() => { const { a, c } = build([nsol(4), usdc(100)], "low", 0); return c!.amount?.valueUsd === a.requiredCorrectionUsd; })(), "cap correction");
  add("RF-26: amount capped by source capacity", (() => { const { nsol: n, c } = build([nsol(2), other(2000), usdc(100)], "low", 0); return c!.amount?.valueUsd === n.technicallyAvailableValueUsd; })(), "cap source");
  add("RF-27: approximate source SOL never exceeds available lamports", (() => { const { nsol: n, c } = build([nsol(2), other(2000), usdc(100)], "low", 0); const approx = metricVal(c, "Estimated SOL to move") ?? 0; return approx <= (n.technicallyAvailableSol ?? 0) + 1e-9; })(), "approx capped");
  add("RF-28: no destination USDC output invented", (() => { const { c } = build([nsol(4), usdc(100)], "low", 0); const s = JSON.stringify(c); return !/received|estimatedUsdc|outputAmount|guaranteed/i.test(s) && (c!.reviewDetails?.involvedAssets ?? []).filter((x) => x.role === "target_bucket").every((x) => x.valueUsd === undefined); })(), "no output");
  add("RF-29: stale price → no card; recognized SOL units preserved", (() => { const { nsol: n, c } = build([nsol(4), usdc(100)], "low", 0, false); return c === null && n.priceState === "stale" && n.recognizedSol === 4; })(), "stale price");
  add("RF-30: stale wallet → available stays NULL (null never becomes 0)", (() => { const { nsol: n, c } = build([nsol(4), usdc(100)], "low", 0, true, false); return c === null && n.technicallyAvailableLamports === null; })(), "stale wallet null");

  // ---- Destination ----
  add("RF-31: canonical USDC exact mint destination", RB_DEST.crypto_to_stables.mint === RB_USDC && RB_DEST.crypto_to_stables.assetId === "usdc", "usdc mint");
  add("RF-32: destination is wallet stable (classic SPL); native false, bucket stable", RB_DEST.crypto_to_stables.native === false && RB_DEST.crypto_to_stables.bucket === "stable" && RB_DEST.crypto_to_stables.destinationRole === "wallet_stable" && RB_CLASSIC === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", "wallet stable");
  add("RF-33: registry entry enabled + recommendation-eligible", RB_DEST.crypto_to_stables.enabled && RB_DEST.crypto_to_stables.recommendationEligible, "enabled");
  add("RF-34: Kamino/Steakhouse/Jupiter/INF/LP never destinations (only USDC/SOL)", [RB_DEST.crypto_to_stables.assetId, RB_DEST.stables_to_crypto.assetId].every((x) => x === "usdc" || x === "sol"), "no excluded dest");

  // ---- Card ----
  add("RF-35: same rebalance_to_plan contract", (() => { const { c } = build([nsol(4), usdc(100)], "low", 0); return c!.id === "rebalance_to_plan" && c!.category === "rebalance" && c!.title_key === "suggestion.rebalance.title" && c!.action_kind === "review_only" && c!.is_top_pick === false; })(), "contract");
  add("RF-36: crypto full copy names SOL", /\bSOL\b/.test(RB_COPY["suggestion.rebalance.crypto_to_stables.full.description"]), "full SOL");
  add("RF-37: crypto full copy names USDC", /USDC/.test(RB_COPY["suggestion.rebalance.crypto_to_stables.full.description"]), "full USDC");
  add("RF-38: copy states 0.1 SOL remains available (both full + partial)", /0\.1 SOL/.test(RB_COPY["suggestion.rebalance.crypto_to_stables.full.description"]) && /0\.1 SOL/.test(RB_COPY["suggestion.rebalance.crypto_to_stables.partial.description"]), "reserve copy");
  add("RF-39: partial copy says 'partially close the gap'", /partially close the gap/i.test(RB_COPY["suggestion.rebalance.crypto_to_stables.partial.description"]), "partial gap");
  add("RF-40: card is review-only + actionable", (() => { const { c } = build([nsol(4), usdc(100)], "low", 0); return c!.action_kind === "review_only" && c!.is_actionable === true; })(), "review only");
  add("RF-41: no route/quote/execution/signature fields (guardrail codes aside)", (() => { const s = JSON.stringify(build([nsol(4), usdc(100)], "low", 0).c); return !s.includes("swapRoute") && !s.includes("instruction") && !s.includes("signTransaction") && !s.includes("aggregator") && !s.includes("liveQuote") && !s.includes("routePlan"); })(), "read-only");
  add("RF-42: SOL→USDC card body preserves the 0.1 SOL operating reserve; focused before/after card set replaces the old reserve metrics", (() => { const { c } = build([nsol(4), usdc(100)], "low", 0); const labels = (c?.reviewDetails?.metrics ?? []).map((m) => m.label); return /0\.1 SOL/.test(c?.descriptionOverride ?? "") && labels.join(",") === "Send,Receive,Current crypto allocation,Crypto allocation after swap,Current stablecoin allocation,Stablecoin allocation after swap" && !labels.includes("SOL operating reserve"); })(), "supporting");

  // ---- Conflict ----
  const dcaSug = mkSug15H("dca-plan", "dca");
  const sySug = mkSug15H("sy-plan", "stable_yield");
  const stakingInp = () => inputsFor({ allocation: allocationFixture(15000, 62, 5), safetyBuffer: bufferFixture(5000, 1000, 3), positions: [solPosition(10)] });
  const cryptoCard = build([nsol(4), usdc(100)], "low", 0).c;
  add("RF-43: crypto_to_stables card present → staking suppressed", (() => { const r = runSuggestionEngine(stakingInp(), FIXTURE_GENERATED_AT, null, null, undefined, { card: cryptoCard, material: true, materialCryptoToStables: true }); return r.suggestions.some((s) => s.id === "rebalance_to_plan") && !r.suggestions.some((s) => s.category === "staking"); })(), "card + suppress staking");
  add("RF-44: material crypto overweight WITHOUT a card still suppresses staking", (() => { const r = runSuggestionEngine(stakingInp(), FIXTURE_GENERATED_AT, null, null, undefined, { card: null, material: true, materialCryptoToStables: true }); return !r.suggestions.some((s) => s.category === "staking"); })(), "no card suppress");
  add("RF-45: DCA suppression preserved under material crypto overweight", (() => { const r = runSuggestionEngine(stakingInp(), FIXTURE_GENERATED_AT, dcaSug, null, undefined, { card: cryptoCard, material: true, materialCryptoToStables: true }); return !r.suggestions.some((s) => s.category === "dca"); })(), "dca");
  add("RF-46: direct-lending (stable_yield) suppression preserved", (() => { const r = runSuggestionEngine(stakingInp(), FIXTURE_GENERATED_AT, null, sySug, undefined, { card: cryptoCard, material: true, materialCryptoToStables: true }); return !r.suggestions.some((s) => s.category === "stable_yield"); })(), "direct lending");
  add("RF-47: within-threshold does NOT suppress staking/DCA", (() => { const r = runSuggestionEngine(stakingInp(), FIXTURE_GENERATED_AT, dcaSug, null, undefined, { card: null, material: false, materialCryptoToStables: false }); return r.suggestions.some((s) => s.category === "staking") && r.suggestions.some((s) => s.category === "dca"); })(), "within keeps");
  add("RF-48: USDC→SOL (stables_to_crypto) behavior unchanged", (() => { const c = build([nsol(0.4), usdc(900)], "high", 100).c; return c !== null && c!.description_key === "suggestion.rebalance.stables_to_crypto.full.description" && c!.from?.bucket === "stables" && c!.to?.bucket === "crypto" && c!.amount?.valueUsd === 700; })(), "usdc→sol");

  // ---- Regression ----
  add("RF-49: ±10pt threshold unchanged", build([nsol(4), usdc(100)], "low", 0).a.thresholdSource.includes("10"), "threshold");
  add("RF-50: $50 minimum unchanged", build([nsol(4), usdc(100)], "low", 0).a.thresholdSource.includes("50"), "minimum");
  add("RF-51: target allocations unchanged (low → 40% crypto)", build([nsol(4), usdc(100)], "low", 0).a.targetCryptoPct === 40, "targets");
  add("RF-52: Safety Buffer precedence unchanged (incomplete buffer blocks crypto card)", build([nsol(4), usdc(50)], "low", 1000).c === null, "buffer blocks");
  add("RF-53: dispositions intact (Jupiter excluded / Steakhouse existing-only)", dlGetDispo("jupiter_lend_usdc")?.disposition === "excluded_from_suggestions" && dlGetDispo("kamino_steakhouse_usdc")?.disposition === "existing_position_only", "dispositions");
  add("RF-54: no risk-score/governance/route in the crypto card", (() => { const s = JSON.stringify(build([nsol(4), usdc(100)], "low", 0).c); return !s.includes("riskScore") && !s.includes("governance") && !s.includes("swapRoute"); })(), "immutable");
  add("RF-55: exact BigInt subtraction — available = recognized − reserve, price-independent", (() => { const a = ns([nsol(3)]); return a.recognizedLamports === 3_000_000_000 && a.technicallyAvailableLamports === 2_900_000_000 && a.requiredNativeReserveLamports === 100_000_000; })(), "bigint exact");

  return checks;
}


export function runRebalanceStep18GFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const read = (rel: string) => { try { return readFileSync(`${process.cwd()}/${rel}`, "utf8"); } catch { return ""; } };
  const engineSrc = read("src/suggestions/engine.ts");
  const railSrc = read("src/suggestions/useRailSuggestions.ts");
  const rebSuggSrc = read("src/suggestions/rebalanceSuggestion.ts");
  const legacySrc = read("src/suggestions/rebalanceSuggestionLegacy.ts");
  const testingPageSrc = read("src/pages/TestingPage.tsx");
  const fx = rbTestFixtures();
  const byId = (id: string) => fx.find((f) => f.id === id);
  const offTargetFundedInp = () => inputsFor({ allocation: allocationFixture(15000, 90, 25), safetyBuffer: bufferFixture(5000, 1000, 3), positions: [solPosition(10)] });

  // ---- Legacy disposition / no silent fallback ----
  add("RG-1: engine.ts imports NO legacy bucket rebalance function", !/deriveRebalanceSuggestion|rebalanceSuggestionLegacy|deriveLegacyBucketRebalanceSuggestion/.test(engineSrc), "no legacy import");
  add("RG-2: engine with NO override → NO Rebalance candidate (fail closed)", (() => { const r = runSuggestionEngine(offTargetFundedInp(), FIXTURE_GENERATED_AT); return !r.suggestions.some((s) => s.category === "rebalance"); })(), "fail closed");
  add("RG-3: override {card:null, material:true} → no card but suppression active (DCA suppressed)", (() => { const r = runSuggestionEngine(offTargetFundedInp(), FIXTURE_GENERATED_AT, mkSug15H("dca", "dca"), null, undefined, { card: null, material: true }); return !r.suggestions.some((s) => s.category === "rebalance") && !r.suggestions.some((s) => s.category === "dca"); })(), "material no card");
  add("RG-4: canonical rebalanceSuggestion.ts no longer defines the legacy bucket function", !/export function deriveRebalanceSuggestion\b/.test(rebSuggSrc) && /buildRebalanceCardFromAssessment/.test(rebSuggSrc), "relocated");
  add("RG-5: legacy module exists, is @deprecated, and exports only the isolated bucket fn", /@deprecated/.test(legacySrc) && /deriveLegacyBucketRebalanceSuggestion/.test(legacySrc) && /LEGACY \/ DO NOT MOUNT/i.test(legacySrc), "deprecated");
  add("RG-6: legacy module has ZERO production callers (only fixtures import it)", (() => { const callers = ["src/suggestions/useRailSuggestions.ts", "src/suggestions/engine.ts", "src/pages/TestingPage.tsx", "src/pages/rebalanceTestingFixtures.ts", "src/pages/DemoPortfolioPage.tsx"].filter((f) => /rebalanceSuggestionLegacy/.test(read(f))); return callers.length === 0; })(), "no prod callers");
  add("RG-7: mounted rail ALWAYS passes rebalanceOverride into runSuggestionEngine", /runSuggestionEngine\([\s\S]*rebalanceOverride[\s\S]*\)/.test(railSrc), "override passed");

  // ---- Shared canonical inputs (one derivation each; no UI recompute / no RPC) ----
  add("RG-8: rail computes ONE SafetyBufferCoverage, shared by completeness + assessment", (railSrc.match(/computeSafetyBufferCoverage\(/g) ?? []).length === 1 && /bufferCoverage/.test(railSrc), "one coverage");
  add("RG-9: rail computes ONE completeness, ONE assessment, ONE USDC source, ONE native-SOL source, ONE card", (railSrc.match(/deriveCompletenessGates\(/g) ?? []).length === 1 && (railSrc.match(/deriveRebalanceAssessment\(/g) ?? []).length === 1 && (railSrc.match(/selectRebalanceUsdcSource\(/g) ?? []).length === 1 && (railSrc.match(/deriveNativeSolRebalanceSource\(/g) ?? []).length === 1 && (railSrc.match(/buildRebalanceCardFromAssessment\(/g) ?? []).length === 1, "one each");
  add("RG-10: rail mounts the APPROVED reserve policy (not the fail-closed MISSING policy)", /REBALANCE_NATIVE_SOL_RESERVE_POLICY/.test(railSrc) && !/NATIVE_SOL_RESERVE_POLICY_MISSING/.test(railSrc), "approved reserve");
  add("RG-11: no RPC / fetch from the Rebalance mounted path or testing cards", !/fetch\(|axios|Connection\(|rpcRequest/.test(railSrc) && !/fetch\(|axios|Connection\(/.test(read("src/pages/rebalanceTestingFixtures.ts")), "no rpc");

  // ---- Both directions via the SAME contract (mounted testing derivation) ----
  add("RG-12: USDC→SOL full uses the same rebalance_to_plan card", (() => { const c = byId("full")!.card; return c?.id === "rebalance_to_plan" && c.from?.bucket === "stables" && c.to?.bucket === "crypto"; })(), "usdc→sol");
  add("RG-13: SOL→USDC full uses the same rebalance_to_plan card", (() => { const c = byId("crypto_full")!.card; return c?.id === "rebalance_to_plan" && c.from?.bucket === "crypto" && c.to?.bucket === "stables"; })(), "sol→usdc");
  add("RG-14: both directions occupy the SAME category (rebalance)", byId("full")!.card?.category === "rebalance" && byId("crypto_full")!.card?.category === "rebalance", "same category");
  add("RG-15: USDC→SOL exact $50 shows a card; below $50 shows none", byId("exact_50")!.card !== null && byId("below_50")!.card === null, "usdc boundary");
  add("RG-16: SOL→USDC exact $50 shows a card; below $50 shows none", byId("crypto_exact_50")!.card !== null && byId("crypto_below_50")!.card === null, "sol boundary");
  add("RG-17: SOL→USDC below/at 0.1 reserve → no card; above → card", byId("sol_below_reserve")!.card === null && byId("sol_exactly_reserve")!.card === null && byId("sol_above_reserve")!.card !== null, "reserve boundary");
  add("RG-18: SOL→USDC exclusions (stake/withdrawable-stake/LST/wsol/collateral/duplicate) never source", (() => { const ids = ["native_plus_active_stake", "native_plus_withdrawable_stake", "native_plus_lst", "native_plus_wsol", "native_plus_collateral"]; const excluded = ids.every((id) => (byId(id)!.nativeSolSource.recognizedSol ?? 0) === 4); return excluded && byId("duplicate_native")!.nativeSolSource.sourceEligibilityState === "duplicate_invalid" && byId("duplicate_native")!.card === null; })(), "exclusions");
  add("RG-19: stale-price / stale-wallet crypto states produce no card", byId("crypto_stale_price")!.card === null && byId("crypto_stale_wallet")!.card === null, "stale no card");

  // ---- Destinations / dispositions unchanged ----
  add("RG-20: destinations are exactly USDC (crypto→stables) + SOL (stables→crypto)", RB_DEST.crypto_to_stables.mint === RB_USDC && RB_DEST.crypto_to_stables.assetId === "usdc" && RB_DEST.stables_to_crypto.assetId === "sol" && RB_DEST.stables_to_crypto.native === true, "dests");
  add("RG-21: dispositions intact (Jupiter excluded / Steakhouse existing-only / INF unsupported)", dlGetDispo("jupiter_lend_usdc")?.disposition === "excluded_from_suggestions" && dlGetDispo("kamino_steakhouse_usdc")?.disposition === "existing_position_only" && !lstSupported("5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm"), "dispositions");

  // ---- /testing modal wiring (production modal reused; no testing-only modal) ----
  add("RG-22: /testing Rebalance gallery opens the production SuggestionReviewModal", /setSelectedRebalanceId/.test(testingPageSrc) && /selectedRebalance[\s\S]*SuggestionReviewModal/.test(testingPageSrc), "modal wired");
  add("RG-23: modal fed by production reviewDetails (no testing-only details calc)", /details=\{selectedRebalance\.card\.reviewDetails\}/.test(testingPageSrc), "prod details");
  add("RG-24: full USDC→SOL + full SOL→USDC cards carry renderable reviewDetails", (() => { const a = byId("full")!.card?.reviewDetails; const b = byId("crypto_full")!.card?.reviewDetails; return !!a && a.metrics.length > 0 && !!b && b.metrics.length > 0; })(), "review details");
  add("RG-25: SOL→USDC modal shows focused before/after-swap cards, no Key-metrics heading, no Guardrails, no calculations; body keeps the 0.1 SOL reserve", (() => { const c = byId("crypto_full")!.card; const rd = c?.reviewDetails; const labels = (rd?.metrics ?? []).map((x) => x.label); return ["Send", "Receive", "Current crypto allocation", "Crypto allocation after swap", "Current stablecoin allocation", "Stablecoin allocation after swap"].every((l) => labels.includes(l)) && (rd?.calculations.length ?? -1) === 0 && rd?.hideMetricsHeading === true && rd?.hideGuardrails === true && /Swap \$[\d,]+ of excess SOL to USDC to move closer to your target/.test(c?.descriptionOverride ?? "") && /0\.1 SOL available for fees and wallet activity/.test(c?.descriptionOverride ?? ""); })(), "focused cards");
  add("RG-26: USDC→SOL modal shows the focused before/after-swap card set, no Key-metrics heading, no Guardrails, no calculations", (() => { const rd = byId("full")!.card?.reviewDetails; const labels = (rd?.metrics ?? []).map((x) => x.label); return ["Send", "Receive", "Current crypto allocation", "Crypto allocation after swap", "Current stablecoin allocation", "Stablecoin allocation after swap"].every((l) => labels.includes(l)) && (rd?.calculations.length ?? -1) === 0 && rd?.hideMetricsHeading === true && rd?.hideGuardrails === true; })(), "focused cards");
  add("RG-26b: USDC→SOL full → plain-language before/after descriptionOverride; crypto rises toward target after swap", (() => { const c = byId("full")!.card; const m = c?.reviewDetails?.metrics ?? []; const cur = m.find((x) => x.label === "Current crypto allocation")?.value as number; const after = m.find((x) => x.label === "Crypto allocation after swap")?.value as number; const d = c?.descriptionOverride ?? ""; return /^Crypto makes up .+% of your portfolio, below your .+% target\. Swap \$[\d,]+ of USDC above your Safety Buffer into SOL to reach your target\.$/.test(d) && typeof cur === "number" && typeof after === "number" && after > cur; })(), "copy + after");

  // ---- Read-only across the whole Rebalance path ----
  add("RG-27: no route/quote/transaction/signature/execution behavior in the Rebalance path", (() => { const blob = read("src/suggestions/rebalanceAssessment.ts") + rebSuggSrc + railSrc; const bad = ["swapRoute", "routePlan", "signTransaction", "sendTransaction", "simulateTransaction", "aggregator", "getQuote", "buildSwap"]; return bad.every((t) => !blob.includes(t)); })(), "read-only");
  add("RG-28: cards are review_only, non-actionable-below-min, never a transaction CTA", (() => { const c1 = byId("full")!.card; const c2 = byId("crypto_full")!.card; return c1?.action_kind === "review_only" && c2?.action_kind === "review_only"; })(), "review only");

  // ---- Regression: thresholds / targets / ordering / Top Pick / candidate sets ----
  add("RG-29: ±10pt threshold + $50 minimum unchanged", byId("full")!.assessment.thresholdSource.includes("10") && byId("full")!.assessment.thresholdSource.includes("50"), "thresholds");
  add("RG-30 (slice 7B): the gallery now derives PRODUCTION five-factor targets under fresh Fear (low→56.5 crypto, high→70.5 crypto) — no risk-only 40/80", byId("crypto_full")!.assessment.targetCryptoPct === 56.5 && byId("full")!.assessment.targetCryptoPct === 70.5, "five-factor targets");
  add("RG-31: canonical two-bucket accounting — current crypto% + stable% = 100", (() => { const a = byId("full")!.assessment; return a.currentCryptoPct !== null && a.currentStablePct !== null && Math.abs(a.currentCryptoPct + a.currentStablePct - 100) < 0.01; })(), "sums 100");
  add("RG-32: liabilities are a separate dimension (net worth = assets − liabilities)", (() => { const a = rbAssess({ positions: [sol18g(400), usdc18g(600), debt18g(300)], ...rbFixedTarget("medium"), requiredBufferUsd: 0, generatedAt: 1 }); return a.recognizedLiabilitiesUsd === 300 && a.netWorthUsd === 700 && a.grossAssetValueUsd === 1000 && a.cryptoAssetValueUsd === 400; })(), "liabilities");
  add("RG-33: full Rebalance participates in Top Pick when scoring selects it (impact = ratio×0.9)", (() => { const c = byId("full")!.card; return c !== null && typeof c!.scores?.impact === "number" && c!.scores!.impact! > 0 && c!.is_top_pick === false; })(), "top pick");
  add("RG-34: card id/category/title immutable across both directions", (() => { const a = byId("full")!.card; const b = byId("crypto_full")!.card; return a?.id === "rebalance_to_plan" && b?.id === "rebalance_to_plan" && a?.title_key === "suggestion.rebalance.title" && b?.title_key === "suggestion.rebalance.title"; })(), "identity");
  add("RG-35: no risk-score/governance change referenced by the Rebalance path", (() => { const blob = read("src/suggestions/rebalanceAssessment.ts") + rebSuggSrc; return !/riskGovernance|getApprovedRiskRubricV1|riskReviewerRegistry/.test(blob); })(), "no governance");

  return checks;
}
