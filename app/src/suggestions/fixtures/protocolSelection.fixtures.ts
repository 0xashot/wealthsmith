/**
 * Protocol selection + registry + risk-governance scoring checks (registry, adapters, eligibility, route guardrails, scoring, QA, readiness, go/no-go, risk rubric/approval/score).
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
import type { EngineSuggestion, ProtocolStrategyType } from "../engineTypes";
// Step 24A — asset-ownership registry + dedicated JUP staking modules (fixtures below).
import { toSuggestionCard } from "../toSuggestionCard";
import {
  notEvaluatedProtocolSelection,
  notApplicableProtocolSelection,
  unavailableProtocolSelection,
  selectedProtocolSelection,
} from "../protocolSelection";
import {
  PROTOCOL_REGISTRY,
  PROTOCOL_SELECTION_IMPLEMENTED,
  getProtocolCandidateById,
  getProtocolCandidatesForStrategy,
  getProtocolCandidatesForAsset,
  getProtocolCandidatesForSelection,
} from "../protocolRegistry";
import { missingMarketData } from "../protocolMarketData";
import { getProtocolRiskData } from "../protocolRiskRegistry";
import { buildProtocolSelectionInput } from "../protocolDataAdapters";
import {
  DEFILLAMA_POOL_MAPPINGS,
  resolveDefiLlamaMapping,
  defiLlamaMissingResult,
  defiLlamaErrorResult,
  defiLlamaAdapter,
} from "../protocolDataAdapters.defillama";
import { getReadOnlyQuoteEstimate, JUPITER_QUOTE_ADAPTER_IMPLEMENTED } from "../protocolDataAdapters.jupiter";
import {
  ELIGIBILITY_IMPLIES_RECOMMENDATION,
  evaluateProtocolEligibility,
  evaluateProtocolSelectionEligibility,
} from "../protocolEligibility";
import type { ProtocolMarketData, ProtocolRiskData } from "../protocolMarketData";
import * as jupiterQuoteModule from "../protocolDataAdapters.jupiter";
import {
  JUPITER_LIVE_QUOTE_IMPLEMENTED,
  JUPITER_QUOTE_BUILDS_TRANSACTIONS,
  validateRouteQuoteRequest,
  notImplementedQuoteResult,
  jupiterQuoteErrorResult,
  parseJupiterQuote,
  getReadOnlyJupiterQuote,
} from "../protocolDataAdapters.jupiter";
import { evaluateRouteGuardrails } from "../protocolRouteGuardrails";
import type { RouteQuoteRequest } from "../routeCostTypes";
import {
  SCORING_IS_RECOMMENDATION,
  RANKING_IS_SELECTION,
  SCORING_WEIGHTS,
  scoreProtocolCandidate,
  rankProtocolCandidates,
  compareCandidateScores,
} from "../protocolScoring";
import type { ProtocolCandidateScore, ProtocolScoreBreakdown, ProtocolScoringStrategy } from "../protocolScoring";
import type { ProtocolEligibilityResult } from "../protocolEligibility";
import type { ProtocolSelectionInput } from "../protocolMarketData";
import {
  runProtocolSelectionQa,
  buildSolLiquidStakingQaInput,
  SOL_LIQUID_STAKING_QA_MARKET,
  SOL_LIQUID_STAKING_QA_RISK,
} from "../protocolSelectionQa";
import {
  PROTOCOL_SELECTION_QA_ONLY,
  PROTOCOL_SELECTION_SHOW_IN_UI,
  PROTOCOL_SELECTION_ALLOW_LIVE_DATA,
  PROTOCOL_SELECTION_ALLOW_TRANSACTIONS,
  PROTOCOL_SELECTION_ROLLOUT_STAGES,
  getProtocolSelectionReadinessChecklist,
  isProtocolSelectionProductionReady,
} from "../protocolSelectionFeatureFlags";
import type { ProtocolSelectionReadinessGate } from "../protocolSelectionFeatureFlags";
import { SOL_LIQUID_STAKING_CANDIDATE_IDS } from "../protocolSolLiquidStakingData";
import { PROTOCOL_SELECTION_GO_NO_GO_ONLY, PROTOCOL_SELECTION_GO_NO_GO_SHOWS_UI, PROTOCOL_SELECTION_GO_NO_GO_CAN_ENABLE_PRODUCTION, getProtocolSelectionGoNoGo, getProtocolSelectionBlockingReasons, isProtocolSelectionGo, assertProtocolSelectionCannotRunInProduction } from "../protocolSelectionGoNoGo";
import type { ProtocolSelectionGoNoGoGate } from "../protocolSelectionGoNoGo";
import { PROTOCOL_RISK_RUBRIC_EXISTS, PROTOCOL_RISK_RUBRIC_VERSION, PROTOCOL_RISK_RUBRIC_APPROVED, PROTOCOL_RISK_RUBRIC_ASSIGNS_SCORES, PROTOCOL_RISK_RUBRIC_AFFECTS_PRODUCTION, getProtocolRiskRubric, getProtocolRiskRubricDimensions, isProtocolRiskRubricApproved, canAssignProtocolRiskScores, createEmptyProtocolRiskScoreDraft, validateProtocolRiskRubricWeights } from "../protocolRiskRubric";
import type { ProtocolRiskRubricDimensionId } from "../protocolRiskRubric";
import {
  PROTOCOL_RISK_APPROVAL_DECISION_EXISTS,
  PROTOCOL_RISK_APPROVAL_DECISION_APPROVED,
  PROTOCOL_RISK_APPROVAL_DECISION_ASSIGN_SCORES,
  PROTOCOL_RISK_APPROVAL_DECISION_AFFECTS_PRODUCTION,
  getCurrentProtocolRiskRubricApprovalDecision,
  evaluateProtocolRiskCandidateScoreAssignmentGate,
  evaluateProtocolRiskApprovalGate,
  canAssignRiskScoreToProtocol,
} from "../protocolRiskApprovalDecision";
import { createExplicitProtocolRiskApprovalDecision } from "../protocolRiskApprovalDecision";
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
} from "../protocolRiskScoreAssignment";
import type { FixtureCheck } from "./fixtureCheck";
import { runSuggestionEngine, runEngineWithLegacyRebalance, synthTrimCandidate, buildSyntheticPositionOptimizationCandidateForFixture, buildEngineFixtureDcaCandidate, FIXTURE_GENERATED_AT, stripReviewAlternatives, bufferFixture, allocationFixture, solPosition, cryptoPosition, nonCoreToken, stablePosition, inputsFor } from "./engineFixtureHarness";

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
    buffer: runEngineWithLegacyRebalance(inputsFor({ safetyBuffer: bufferFixture(800, 1000, 3), positions: [cryptoPosition(100)] }), FIXTURE_GENERATED_AT),
    rebalance: runEngineWithLegacyRebalance(inputsFor({ allocation: allocationFixture(15000, 75, 15), safetyBuffer: funded(), positions: [cryptoPosition(100)] }), FIXTURE_GENERATED_AT),
    trim: runEngineWithLegacyRebalance(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: smallTokens }), FIXTURE_GENERATED_AT, null, null, undefined, synthTrimCandidate()),
    staking: runEngineWithLegacyRebalance(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT),
    stable_yield: runEngineWithLegacyRebalance(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT),
    dca: (() => { const inp = inputsFor({ allocation: dcaUnder(3), safetyBuffer: funded(), positions: [cryptoPosition(100)] }); return runEngineWithLegacyRebalance(inp, FIXTURE_GENERATED_AT, buildEngineFixtureDcaCandidate()); })(),
    position_optimization: runEngineWithLegacyRebalance(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [cryptoPosition(100)] }), FIXTURE_GENERATED_AT, null, null, undefined, null, buildSyntheticPositionOptimizationCandidateForFixture()),
    on_track: runEngineWithLegacyRebalance(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [cryptoPosition(100)] }), FIXTURE_GENERATED_AT),
  };
  const find = (r: ReturnType<typeof runSuggestionEngine>, c: string) => r.suggestions.find((s) => s.category === c);
  const gStatus = (s: EngineSuggestion | undefined, code: string) => s?.guardrails.find((g) => g.code === code)?.status;
  const noProtocol = (s: EngineSuggestion | undefined) =>
    s?.protocolSelection?.selectedProtocolId == null && s?.protocolSelection?.selectedProtocolName == null;

  // 9J-A. Staking selection is the APPROVED JitoSOL read-only recommendation
  // (Step 13G beta ON): status "selected", Jito/JitoSOL named — never a
  // transaction. (Rollback to not_evaluated is covered by 13G-AI.)
  {
    const s = find(runs.staking, "staking");
    add(
      "9J-A: staking protocolSelection = selected (JitoSOL read-only beta)",
      s?.protocolSelection?.status === "selected" &&
        s?.protocolSelection?.selectedProtocolName === "Jito" &&
        s?.protocolSelection?.selectedLstSymbol === "JitoSOL",
      `status=${s?.protocolSelection?.status} name=${s?.protocolSelection?.selectedProtocolName}`
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
    const cats = ["trim", "dca", "rebalance"]; // Step 24A — capital_efficiency retired
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
  // 9J-F. Mapped cards expose no RAW protocol-selection metadata (internal codes,
  // reasons, or ids). The approved JitoSOL card may carry the user-facing display
  // (protocolName "Jito", "Suggested protocol to review"); it must never leak raw
  // reason codes, guardrail codes, selection status, or a selectedProtocolId.
  {
    const cards = Object.values(runs).flatMap((r) => r.suggestions).map(toSuggestionCard);
    const json = JSON.stringify(cards);
    const leaks = /selectedProtocolId|protocol_selection|selection_not_required|missing_apy_data|missing_tvl_data|not_evaluated|not_applicable/i.test(json);
    add("9J-F: mapped cards expose no raw protocol-selection metadata", !leaks, `leaks=${leaks}`);
  }
  // 9J-G. protocol_selection guardrail: "passed" for the approved JitoSOL staking
  // recommendation (Step 13G), still "not_evaluated" for stable_yield (no source).
  {
    const st = gStatus(find(runs.staking, "staking"), "protocol_selection");
    const sy = gStatus(find(runs.stable_yield, "stable_yield"), "protocol_selection");
    add(
      "9J-G: protocol_selection guardrail passed for staking, not_evaluated for stable_yield",
      st === "passed" && sy === "not_evaluated",
      `staking=${st} stable_yield=${sy}`
    );
  }
  // 9J-H. protocol_selection guardrail is not_applicable where selection is irrelevant.
  {
    const cats = ["buffer", "rebalance", "trim", "dca", "position_optimization", "on_track"]; // Step 24A — capital_efficiency retired
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
 * Step 12C — static protocol registry + candidate metadata (NO selection).
 * ------------------------------------------------------------------ */
export function runProtocolRegistryFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2);
  const stakingRun = runSuggestionEngine(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stableRun = runSuggestionEngine(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT);
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
  // 12C-F. Staking suggestion is the APPROVED JitoSOL read-only recommendation
  // (Step 13G): status "selected", Jito named. (Stable_yield below still carries
  // candidate metadata only.)
  {
    const ps = staking?.protocolSelection;
    add("12C-F: staking protocolSelection.status selected (JitoSOL beta)",
      ps?.status === "selected" && ps?.selectedProtocolName === "Jito",
      `status=${ps?.status} name=${ps?.selectedProtocolName}`);
  }
  // 12C-G. Stable Yield suggestion carries candidateProtocolIds but status stays not_evaluated.
  {
    const ps = stable?.protocolSelection;
    add("12C-G: stable_yield has candidateProtocolIds + status not_evaluated",
      (ps?.candidateProtocolIds?.length ?? 0) > 0 && ps?.candidateProtocolIds?.includes("kamino") === true && ps?.status === "not_evaluated",
      `status=${ps?.status} candidates=${ps?.candidateProtocolIds?.join(",")}`);
  }
  // 12C-H. ONLY the approved staking suggestion names a protocol (Jito); every
  // other suggestion (incl. stable_yield) still names none.
  {
    const all = [...stakingRun.suggestions, ...stableRun.suggestions];
    const bad = all.filter(
      (s) =>
        s.category !== "staking" &&
        (s.protocolSelection?.selectedProtocolId != null || s.protocolSelection?.selectedProtocolName != null)
    );
    add("12C-H: only staking names a protocol (Jito); others name none",
      bad.length === 0 && staking?.protocolSelection?.selectedProtocolId === "jito",
      `violations=${bad.length} stakingId=${staking?.protocolSelection?.selectedProtocolId}`);
  }
  // 12C-I. protocol_selection guardrail: passed for the approved staking
  // recommendation, still not_evaluated for stable_yield (no data source).
  {
    const g = (s: typeof staking, code: string) => s?.guardrails.find((x) => x.code === code)?.status;
    add("12C-I: protocol_selection guardrail passed for staking, not_evaluated for stable_yield",
      g(staking, "protocol_selection") === "passed" && g(stable, "protocol_selection") === "not_evaluated",
      `staking=${g(staking, "protocol_selection")} stable=${g(stable, "protocol_selection")}`);
  }
  // 12C-J. Cards + review details expose NO candidate protocol names as
  // recommendations, except the approved "Jito" on the staking suggestion
  // (Step 13G). Stable_yield exposes none.
  {
    const otherNames = ["Jupiter", "Marinade", "BlazeStake", "Sanctum", "Kamino", "Orca", "Raydium", "Meteora"];
    const scan = (s: typeof staking) => JSON.stringify(toSuggestionCard(s!)) + JSON.stringify(stripReviewAlternatives(s?.reviewDetails));
    const stakingJson = scan(staking);
    const stableJson = scan(stable);
    // Staking may name only Jito; stable_yield may name nothing.
    const stakingLeaks = otherNames.filter((n) => stakingJson.includes(n));
    const stableLeaks = [...otherNames, "Jito"].filter((n) => stableJson.includes(n));
    add("12C-J: only Jito appears (staking); no other candidate name leaks",
      stakingLeaks.length === 0 && stableLeaks.length === 0,
      `stakingLeaks=${stakingLeaks.join(",") || "none"} stableLeaks=${stableLeaks.join(",") || "none"}`);
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
  const stakingRun = runSuggestionEngine(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stableRun = runSuggestionEngine(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT);
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
  // 12D-I. Staking is the approved JitoSOL recommendation (selected); stable_yield
  // stays not_evaluated (Step 13G — the read-only aggregator adapters remain
  // unwired; the staking source is the approved verified JitoSOL data).
  {
    add("12D-I: staking selected (JitoSOL), stable_yield still not_evaluated",
      staking?.protocolSelection?.status === "selected" && stable?.protocolSelection?.status === "not_evaluated",
      `staking=${staking?.protocolSelection?.status} stable=${stable?.protocolSelection?.status}`);
  }
  // 12D-J. protocol_selection guardrail passed for staking, not_evaluated for stable_yield.
  {
    const g = (s: typeof staking) => s?.guardrails.find((x) => x.code === "protocol_selection")?.status;
    add("12D-J: protocol_selection guardrail passed for staking, not_evaluated for stable_yield", g(staking) === "passed" && g(stable) === "not_evaluated", `staking=${g(staking)} stable=${g(stable)}`);
  }
  // 12D-K. Cards/modal expose no candidate market data or names as recommendations,
  // except the approved "Jito" on the staking suggestion (Step 13G).
  {
    const otherNames = ["Jupiter", "Marinade", "BlazeStake", "Sanctum", "Kamino", "Orca", "Raydium", "Meteora"];
    const scan = (s: typeof staking) => JSON.stringify(toSuggestionCard(s!)) + JSON.stringify(stripReviewAlternatives(s?.reviewDetails));
    const stakingLeaks = otherNames.filter((n) => scan(staking).includes(n));
    const stableLeaks = [...otherNames, "Jito"].filter((n) => scan(stable).includes(n));
    add("12D-K: only Jito appears (staking); no other candidate name/market data leaks", stakingLeaks.length === 0 && stableLeaks.length === 0, `stakingLeaks=${stakingLeaks.join(",") || "none"} stableLeaks=${stableLeaks.join(",") || "none"}`);
  }
  // 12D-L. Only the approved staking suggestion names a protocol (Jito).
  {
    const all = [...stakingRun.suggestions, ...stableRun.suggestions];
    const bad = all.filter((s) => s.category !== "staking" && (s.protocolSelection?.selectedProtocolId != null || s.protocolSelection?.selectedProtocolName != null));
    add("12D-L: only staking names a protocol (Jito); others name none", bad.length === 0 && staking?.protocolSelection?.selectedProtocolName === "Jito", `violations=${bad.length}`);
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
  const stakingRun = runSuggestionEngine(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stableRun = runSuggestionEngine(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT);
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
  // 12E-P. Staking is the approved JitoSOL recommendation (selected); stable_yield
  // stays not_evaluated (Step 13G — eligibility scanning here is unwired).
  add("12E-P: staking selected (JitoSOL), stable_yield still not_evaluated", staking?.protocolSelection?.status === "selected" && stable?.protocolSelection?.status === "not_evaluated", `staking=${staking?.protocolSelection?.status} stable=${stable?.protocolSelection?.status}`);
  // 12E-Q. protocol_selection guardrail passed for staking, not_evaluated for stable_yield.
  {
    const g = (s: typeof staking) => s?.guardrails.find((x) => x.code === "protocol_selection")?.status;
    add("12E-Q: protocol_selection guardrail passed for staking, not_evaluated for stable_yield", g(staking) === "passed" && g(stable) === "not_evaluated", `staking=${g(staking)} stable=${g(stable)}`);
  }
  // 12E-R. Cards/modal expose no eligibility RESULT tokens or candidate names —
  // except the approved "Jito" on the staking suggestion (Step 13G). Raw
  // eligibility internals (ineligible/insufficient_data/riskScore/…) never leak.
  {
    const resultTokens = ["ineligible", "insufficient_data", "riskScore", "eligibilityStatus", "protocolEligibility"];
    const otherNames = ["Jupiter", "Marinade", "BlazeStake", "Sanctum", "Kamino"];
    const scan = (s: typeof staking) => JSON.stringify(toSuggestionCard(s!)) + JSON.stringify(stripReviewAlternatives(s?.reviewDetails));
    const stakingJson = scan(staking);
    const stableJson = scan(stable);
    const stakingLeaks = [...resultTokens, ...otherNames].filter((n) => stakingJson.includes(n));
    const stableLeaks = [...resultTokens, ...otherNames, "Jito"].filter((n) => stableJson.includes(n));
    add("12E-R: no eligibility results/candidate names leak (only Jito on staking)", stakingLeaks.length === 0 && stableLeaks.length === 0, `stakingLeaks=${stakingLeaks.join(",") || "none"} stableLeaks=${stableLeaks.join(",") || "none"}`);
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
  const stakingRun = runSuggestionEngine(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stableRun = runSuggestionEngine(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT);
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
  // 12F-N. Staking is selected (JitoSOL, Step 13G); stable_yield stays not_evaluated.
  add("12F-N: staking selected (JitoSOL), stable_yield still not_evaluated", staking?.protocolSelection?.status === "selected" && stable?.protocolSelection?.status === "not_evaluated", `staking=${staking?.protocolSelection?.status}`);
  // 12F-O. Selection remains not implemented.
  add("12F-O: PROTOCOL_SELECTION_IMPLEMENTED remains false", PROTOCOL_SELECTION_IMPLEMENTED === false, `flag=${PROTOCOL_SELECTION_IMPLEMENTED}`);
  // 12F-P. Only the approved staking suggestion names a protocol (Jito).
  {
    const all = [...stakingRun.suggestions, ...stableRun.suggestions];
    const bad = all.filter((s) => s.category !== "staking" && (s.protocolSelection?.selectedProtocolId != null || s.protocolSelection?.selectedProtocolName != null));
    add("12F-P: only staking names a protocol (Jito); others name none", bad.length === 0 && staking?.protocolSelection?.selectedProtocolName === "Jito", `violations=${bad.length}`);
  }
  // 12F-Q. Cards/modal expose no quote/route/liquidity data.
  {
    const tokens = ["priceImpact", "quoteAvailable", "liquidityUsd", "routeSource", "outAmount", "price_impact"];
    const scan = (s: typeof staking) => JSON.stringify(toSuggestionCard(s!)) + JSON.stringify(stripReviewAlternatives(s?.reviewDetails));
    // Step 13G: the approved JitoSOL production data may appear on the STAKING
    // suggestion; it is a leak only on stable_yield or if a non-approved token appears.
    const approvedOnStaking = ["Jito", "JitoSOL", "Suggested protocol to review", "Verified source data", "tvlUsd", "apyPct", "apy30dPct", "directUnstakeTimeHours", "directUnstakeFeePct", "annualManagementFeePct", "annualManagementFeeAppliesTo", "767950000", "5.36", "5.45", "rewards"];
    const stakingScan = scan(staking);
    const stableScan = scan(stable);
    const leaks = tokens.filter((t) => stableScan.includes(t) || (stakingScan.includes(t) && !approvedOnStaking.includes(t)));

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
  const stakingRun = runSuggestionEngine(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stableRun = runSuggestionEngine(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT);
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
  add("12G-Q: staking selected (JitoSOL), stable_yield not_evaluated", staking?.protocolSelection?.status === "selected" && stable?.protocolSelection?.status === "not_evaluated", `staking=${staking?.protocolSelection?.status}`);
  // 12G-R. protocol_selection guardrail remains not_evaluated.
  {
    const g = (s: typeof staking) => s?.guardrails.find((x) => x.code === "protocol_selection")?.status;
    add("12G-R: protocol_selection guardrail passed for staking, not_evaluated for stable_yield", g(staking) === "passed" && g(stable) === "not_evaluated", `staking=${g(staking)}`);
  }
  // 12G-S. Cards/modal expose no scores/ranks/candidate names/APY/TVL.
  {
    const tokens = ["Jupiter", "Marinade", "Jito", "Kamino", "totalScore", "yieldScore", "rankedProtocolIds", "scoredAt", "tvlUsd", "selectionMade"];
    const scan = (s: typeof staking) => JSON.stringify(toSuggestionCard(s!)) + JSON.stringify(stripReviewAlternatives(s?.reviewDetails));
    // Step 13G: the approved JitoSOL production data may appear on the STAKING
    // suggestion; it is a leak only on stable_yield or if a non-approved token appears.
    const approvedOnStaking = ["Jito", "JitoSOL", "Suggested protocol to review", "Verified source data", "tvlUsd", "apyPct", "apy30dPct", "directUnstakeTimeHours", "directUnstakeFeePct", "annualManagementFeePct", "annualManagementFeeAppliesTo", "767950000", "5.36", "5.45", "rewards"];
    const stakingScan = scan(staking);
    const stableScan = scan(stable);
    const leaks = tokens.filter((t) => stableScan.includes(t) || (stakingScan.includes(t) && !approvedOnStaking.includes(t)));

    add("12G-S: cards/modal never expose scores/ranks/names/APY/TVL", leaks.length === 0, `leaks=${leaks.join(",") || "none"}`);
  }
  // 12G-T. Scoring helpers are utility-only (not wired into live suggestions):
  // the only passed protocol_selection is staking's approved JitoSOL beta, sourced
  // from verified data (not a score); stable_yield is never elevated by scoring.
  {
    const stableProtoPassed = (stable?.guardrails ?? []).some((g) => g.code === "protocol_selection" && g.status === "passed");
    const stakingFromVerified = staking?.protocolSelection?.status === "selected" && (staking?.protocolSelection?.dataSources ?? []).includes("Verified source data");
    add("12G-T: scoring not wired into live suggestions (staking selection is verified JitoSOL, not scored)", typeof rankProtocolCandidates === "function" && !stableProtoPassed && stakingFromVerified === true, `stableProtoPassed=${stableProtoPassed} stakingVerified=${stakingFromVerified}`);
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
  const stakingRun = runSuggestionEngine(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stableRun = runSuggestionEngine(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT);
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
    const freshStaking = runSuggestionEngine(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT).suggestions.find((s) => s.category === "staking");
    // Live staking selection comes from the approved JitoSOL beta (id "jito"),
    // never from the QA fixture candidate — running QA must not change it.
    add("12H-M: QA does not mutate live ProtocolSelection (stays approved JitoSOL beta)", freshStaking?.protocolSelection?.status === "selected" && freshStaking?.protocolSelection?.selectedProtocolId === "jito", `status=${freshStaking?.protocolSelection?.status} id=${freshStaking?.protocolSelection?.selectedProtocolId}`);
  }
  // 12H-N. Production selection remains not implemented.
  add("12H-N: PROTOCOL_SELECTION_IMPLEMENTED remains false", PROTOCOL_SELECTION_IMPLEMENTED === false, `flag=${PROTOCOL_SELECTION_IMPLEMENTED}`);
  // 12H-O. No live suggestion has selectedProtocolId/Name.
  {
    const all = [...stakingRun.suggestions, ...stableRun.suggestions];
    const bad = all.filter((s) => s.category !== "staking" && (s.protocolSelection?.selectedProtocolId != null || s.protocolSelection?.selectedProtocolName != null));
    add("12H-O: no non-staking suggestion names a protocol", bad.length === 0, `violations=${bad.length}`);
  }
  // 12H-P. Cards/modal do not show the QA-selected protocol or ranking.
  {
    const tokens = ["marinade", "Marinade", "selectedProtocolId", "rankedProtocolIds", "selectionMade", "qaOnly", "candidateScores"];
    const scan = (s: typeof staking) => JSON.stringify(toSuggestionCard(s!)) + JSON.stringify(stripReviewAlternatives(s?.reviewDetails));
    // Step 13G: the approved JitoSOL production data may appear on the STAKING
    // suggestion; it is a leak only on stable_yield or if a non-approved token appears.
    const approvedOnStaking = ["Jito", "JitoSOL", "Suggested protocol to review", "Verified source data", "tvlUsd", "apyPct", "apy30dPct", "directUnstakeTimeHours", "directUnstakeFeePct", "annualManagementFeePct", "annualManagementFeeAppliesTo", "767950000", "5.36", "5.45", "rewards"];
    const stakingScan = scan(staking);
    const stableScan = scan(stable);
    const leaks = tokens.filter((t) => stableScan.includes(t) || (stakingScan.includes(t) && !approvedOnStaking.includes(t)));

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
  const stakingRun = runSuggestionEngine(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stableRun = runSuggestionEngine(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT);
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
  add("12I-J: staking selected (JitoSOL), stable_yield not_evaluated", staking?.protocolSelection?.status === "selected" && stable?.protocolSelection?.status === "not_evaluated", `staking=${staking?.protocolSelection?.status}`);
  // 12I-K. Live suggestions carry no selectedProtocolId/Name.
  {
    const all = [...stakingRun.suggestions, ...stableRun.suggestions];
    const bad = all.filter((s) => s.category !== "staking" && (s.protocolSelection?.selectedProtocolId != null || s.protocolSelection?.selectedProtocolName != null));
    add("12I-K: no non-staking suggestion names a protocol", bad.length === 0, `violations=${bad.length}`);
  }
  // 12I-L. protocol_selection guardrail remains not_evaluated.
  {
    const g = (s: typeof staking) => s?.guardrails.find((x) => x.code === "protocol_selection")?.status;
    add("12I-L: protocol_selection guardrail passed for staking, not_evaluated for stable_yield", g(staking) === "passed" && g(stable) === "not_evaluated", `staking=${g(staking)}`);
  }
  // 12I-M. Cards/modal show no selected protocol names.
  {
    const tokens = ["Jupiter", "Marinade", "Jito", "BlazeStake", "Sanctum", "Kamino", "selectedProtocolId", "selectedProtocolName"];
    const scan = (s: typeof staking) => JSON.stringify(toSuggestionCard(s!)) + JSON.stringify(stripReviewAlternatives(s?.reviewDetails));
    // Step 13G: the approved JitoSOL production data may appear on the STAKING
    // suggestion; it is a leak only on stable_yield or if a non-approved token appears.
    const approvedOnStaking = ["Jito", "JitoSOL", "Suggested protocol to review", "Verified source data", "tvlUsd", "apyPct", "apy30dPct", "directUnstakeTimeHours", "directUnstakeFeePct", "annualManagementFeePct", "annualManagementFeeAppliesTo", "767950000", "5.36", "5.45", "rewards"];
    const stakingScan = scan(staking);
    const stableScan = scan(stable);
    const leaks = tokens.filter((t) => stableScan.includes(t) || (stakingScan.includes(t) && !approvedOnStaking.includes(t)));

    add("12I-M: cards/modal show no selected protocol names", leaks.length === 0, `leaks=${leaks.join(",") || "none"}`);
  }
  // 12I-N. QA can still select fixture-only candidate; live selection stays disabled.
  {
    const qa = runProtocolSelectionQa({ input: buildSolLiquidStakingQaInput(), checkedAt: "t" });
    add("12I-N: QA selects fixture candidate; generic selection stays unimplemented (live staking uses the approved JitoSOL beta)", qa.status === "selected" && qa.qaOnly === true && PROTOCOL_SELECTION_IMPLEMENTED === false && staking?.protocolSelection?.status === "selected" && staking?.protocolSelection?.selectedProtocolName === "Jito", `qa=${qa.selectedProtocolId} implemented=${PROTOCOL_SELECTION_IMPLEMENTED} live=${staking?.protocolSelection?.status}`);
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
 * Step 12N — final go/no-go checklist for protocol-selection production readiness.
 * Checklist only; productionReady is false. No UI, no live behavior change.
 * ------------------------------------------------------------------ */
export function runProtocolSelectionGoNoGoFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2);
  const stakingRun = runSuggestionEngine(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stableRun = runSuggestionEngine(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT);
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
  add("12N-AB: live staking protocolSelection.status is selected (JitoSOL beta)", staking?.protocolSelection?.status === "selected", `status=${staking?.protocolSelection?.status}`);
  // 12N-AC. No live suggestion has selectedProtocolId/Name.
  {
    const all = [...stakingRun.suggestions, ...stableRun.suggestions];
    const bad = all.filter((s) => s.category !== "staking" && (s.protocolSelection?.selectedProtocolId != null || s.protocolSelection?.selectedProtocolName != null));
    add("12N-AC: no non-staking suggestion names a protocol", bad.length === 0, `violations=${bad.length}`);
  }
  // 12N-AD. Cards/modal do not expose go/no-go data or protocol names.
  {
    const tokens = ["Jupiter", "Marinade", "Jito", "BlazeStake", "Sanctum", "JupSOL", "productionReady", "go_no_go", "missing_tvl_", "GoNoGo"];
    const scan = (s: typeof staking) => JSON.stringify(toSuggestionCard(s!)) + JSON.stringify(stripReviewAlternatives(s?.reviewDetails));
    // Step 13G: the approved JitoSOL production data may appear on the STAKING
    // suggestion; it is a leak only on stable_yield or if a non-approved token appears.
    const approvedOnStaking = ["Jito", "JitoSOL", "Suggested protocol to review", "Verified source data", "tvlUsd", "apyPct", "apy30dPct", "directUnstakeTimeHours", "directUnstakeFeePct", "annualManagementFeePct", "annualManagementFeeAppliesTo", "767950000", "5.36", "5.45", "rewards"];
    const stakingScan = scan(staking);
    const stableScan = scan(stable);
    const leaks = tokens.filter((t) => stableScan.includes(t) || (stakingScan.includes(t) && !approvedOnStaking.includes(t)));

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
 * Step 12P — protocol riskScore rubric approval pack (draft, not approved).
 * Rubric assigns no score, is not approved, and changes no production behavior.
 * ------------------------------------------------------------------ */
export function runProtocolRiskRubricFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2);
  const stakingRun = runSuggestionEngine(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stableRun = runSuggestionEngine(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT);
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
  add("12P-U: live staking protocolSelection.status is selected (JitoSOL beta)", staking?.protocolSelection?.status === "selected", `status=${staking?.protocolSelection?.status}`);
  // 12P-V. No live suggestion has selectedProtocolId/Name.
  {
    const all = [...stakingRun.suggestions, ...stableRun.suggestions];
    const bad = all.filter((s) => s.category !== "staking" && (s.protocolSelection?.selectedProtocolId != null || s.protocolSelection?.selectedProtocolName != null));
    add("12P-V: no non-staking suggestion names a protocol", bad.length === 0, `violations=${bad.length}`);
  }
  // 12P-W. Cards/modal do not expose risk rubric or protocol recommendations.
  {
    const tokens = ["Jupiter", "Marinade", "Jito", "BlazeStake", "Sanctum", "JupSOL", "audit_security", "riskRubric", "ProtocolRiskRubric", "scoringGuidance"];
    const scan = (s: typeof staking) => JSON.stringify(toSuggestionCard(s!)) + JSON.stringify(stripReviewAlternatives(s?.reviewDetails));
    // Step 13G: the approved JitoSOL production data may appear on the STAKING
    // suggestion; it is a leak only on stable_yield or if a non-approved token appears.
    const approvedOnStaking = ["Jito", "JitoSOL", "Suggested protocol to review", "Verified source data", "tvlUsd", "apyPct", "apy30dPct", "directUnstakeTimeHours", "directUnstakeFeePct", "annualManagementFeePct", "annualManagementFeeAppliesTo", "767950000", "5.36", "5.45", "rewards"];
    const stakingScan = scan(staking);
    const stableScan = scan(stable);
    const leaks = tokens.filter((t) => stableScan.includes(t) || (stakingScan.includes(t) && !approvedOnStaking.includes(t)));

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
 * Step 12R — reviewer approval / riskScore assignment decision gate.
 * Decision not submitted, no candidate ready, no score assigned, no prod change.
 * ------------------------------------------------------------------ */
export function runProtocolRiskApprovalDecisionFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2);
  const stakingRun = runSuggestionEngine(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stableRun = runSuggestionEngine(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT);
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
  add("12R-X: live staking protocolSelection.status is selected (JitoSOL beta)", staking?.protocolSelection?.status === "selected", `status=${staking?.protocolSelection?.status}`);
  // 12R-Y. No live suggestion has selectedProtocolId/Name.
  {
    const all = [...stakingRun.suggestions, ...stableRun.suggestions];
    const bad = all.filter((s) => s.category !== "staking" && (s.protocolSelection?.selectedProtocolId != null || s.protocolSelection?.selectedProtocolName != null));
    add("12R-Y: no non-staking suggestion names a protocol", bad.length === 0, `violations=${bad.length}`);
  }
  // 12R-Z. Cards/modal do not expose approval decision or protocol names.
  {
    const tokens = ["Jupiter", "Marinade", "Jito", "BlazeStake", "Sanctum", "JupSOL", "approved_for_scoring", "scoreAssignmentAllowed", "rubricApproved", "ApprovalDecision"];
    const scan = (s: typeof staking) => JSON.stringify(toSuggestionCard(s!)) + JSON.stringify(stripReviewAlternatives(s?.reviewDetails));
    // Step 13G: the approved JitoSOL production data may appear on the STAKING
    // suggestion; it is a leak only on stable_yield or if a non-approved token appears.
    const approvedOnStaking = ["Jito", "JitoSOL", "Suggested protocol to review", "Verified source data", "tvlUsd", "apyPct", "apy30dPct", "directUnstakeTimeHours", "directUnstakeFeePct", "annualManagementFeePct", "annualManagementFeeAppliesTo", "767950000", "5.36", "5.45", "rewards"];
    const stakingScan = scan(staking);
    const stableScan = scan(stable);
    const leaks = tokens.filter((t) => stableScan.includes(t) || (stakingScan.includes(t) && !approvedOnStaking.includes(t)));

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
 * Step 12Y — human rubric approval + riskScore assignment mechanism.
 * Blocked by default; QA-only score path; no production, no selection.
 * ------------------------------------------------------------------ */
export function runProtocolRiskScoreAssignmentFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2);
  const stakingRun = runSuggestionEngine(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
  const stableRun = runSuggestionEngine(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT);
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
  add("12Y-AJ: live staking protocolSelection.status is selected (JitoSOL beta)", staking?.protocolSelection?.status === "selected", `status=${staking?.protocolSelection?.status}`);
  // 12Y-AK. No live suggestion has selectedProtocolId/Name.
  {
    const allSug = [...stakingRun.suggestions, ...stableRun.suggestions];
    const bad = allSug.filter((s) => s.category !== "staking" && (s.protocolSelection?.selectedProtocolId != null || s.protocolSelection?.selectedProtocolName != null));
    add("12Y-AK: no non-staking suggestion names a protocol", bad.length === 0, `violations=${bad.length}`);
  }
  // 12Y-AL. Cards/modal do not expose riskScore assignment or protocol names.
  {
    const tokens = ["Jupiter", "Marinade", "Jito", "BlazeStake", "Sanctum", "JitoSOL", "riskScore", "weightedContribution", "score_assigned", "7.75"];
    const scan = (s: typeof staking) => JSON.stringify(toSuggestionCard(s!)) + JSON.stringify(stripReviewAlternatives(s?.reviewDetails));
    // Step 13G: the approved JitoSOL production data may appear on the STAKING
    // suggestion; it is a leak only on stable_yield or if a non-approved token appears.
    const approvedOnStaking = ["Jito", "JitoSOL", "Suggested protocol to review", "Verified source data", "tvlUsd", "apyPct", "apy30dPct", "directUnstakeTimeHours", "directUnstakeFeePct", "annualManagementFeePct", "annualManagementFeeAppliesTo", "767950000", "5.36", "5.45", "rewards"];
    const stakingScan = scan(staking);
    const stableScan = scan(stable);
    const leaks = tokens.filter((t) => stableScan.includes(t) || (stakingScan.includes(t) && !approvedOnStaking.includes(t)));

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
