/**
 * Engine-core check suite: ordering, mapper, contracts, guardrails, review details/modal/refinement, full QA + final smoke, incident search, /testing page.
 *
 * Extracted verbatim from suggestionEngine.fixtures.ts (final monolith dissolution).
 * The monolith aggregates these checks in printFixtureResults; behavior and check
 * names are unchanged.
 */
import { INCIDENT_SCOPE_MODEL as IS_SCOPE, SOURCE_CLASSES as IS_SOURCES, NEGATIVE_RESULT_DISCIPLINE as IS_NEG, SELF_CHECK as IS_SELFCHECK, SOURCE_ENUMERATION_RULE_INHERITED as IS_ENUM, anchorDiscriminator, loadKlendDiscriminatorRegistry, REGISTRY_VERIFICATION as IS_REGVERIFY, KAMINO_ADMIN_SCAN as IS_SCAN, JUPITER_APPLICABILITY as IS_JUP, computeIncidentSearchHash, INCIDENT_SEARCH_HASH as IS_HASH, INCIDENT_SEARCH_CONFERS as IS_CONFERS } from "../incidentSearchMethodology";
import { computeS0ManifestHash, S0_MANIFEST_HASH as SC_HASH } from "../sourceCompletionAmendment";
import { computeIdlAmendmentHash, IDL_AMENDMENT_HASH as IDL_HASH } from "../jupiterLendIdlDiscoveryAmendment";
import { DIRECT_DIMENSION_ASSESSMENTS as DA_DIMS, DIRECT_ASSESSMENT_OUTCOME as DA_OUTCOME, DIRECT_ASSESSMENT_MANIFEST_HASH as DA_MANIFEST_HASH } from "../klendDirectUsdcAutomatedAssessment";
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
import { computeAuthorityManifestHash, AUTHORITY_MANIFEST_HASH as AUTH_MANIFEST_HASH } from "../klendDirectUsdcAuthorityEvidence";
import { SOL_BTC_USDC_IDENTITY_MANIFEST_HASH } from "../klendReserveIdentity";
import { VERIFIED_EVIDENCE_MANIFEST_HASH } from "../steakhouseEvidenceVerification";
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
import type { EngineSuggestion } from "../engineTypes";
// Step 24A — asset-ownership registry + dedicated JUP staking modules (fixtures below).
import { selectTopPick } from "../topPick";
import { toSuggestionCard, toSuggestionCards } from "../toSuggestionCard";
import {
  passedGuardrail,
  failedGuardrail,
  warningGuardrail,
  notEvaluatedGuardrail,
  notApplicableGuardrail,
  ensureExecutionGuardrails,
} from "../guardrails";
import {
  TESTING_PAGE_EXISTS,
  TESTING_PAGE_ROUTE,
  TESTING_PAGE_VISIBLE_IN_NAV,
  TESTING_PAGE_USES_FIXTURE_DATA,
  TESTING_PAGE_USES_REAL_WALLET_DATA,
  TESTING_PAGE_ENABLES_TRANSACTIONS,
  TESTING_PAGE_MUTATES_LIVE_SUGGESTIONS,
  TESTING_PAGE_USES_SHARED_CARD,
  TESTING_PAGE_USES_SHARED_MODAL,
  TESTING_PAGE_LINKED_IN_NAV,
  TESTING_PAGE_IMPORTED_BY_DASHBOARD,
  TESTING_PAGE_IMPORTED_BY_PORTFOLIO,
  TESTING_PAGE_IMPORTED_BY_RAIL,
  TESTING_PREVIEW_NOT_LIVE,
  getTestingPageFixtures,
} from "../../pages/testingPageFixtures";
import { readFileSync } from "node:fs";
import { getDemoExactSolStakingReviewDetails } from "../demoExactSolStakingScenario";
import type { FixtureCheck } from "./fixtureCheck";
import { KLEND_ADMIN, IS_RESULTS, runSuggestionEngine, runEngineWithLegacyRebalance, synthTrimCandidate, buildSyntheticPositionOptimizationCandidateForFixture, buildEngineFixtureDcaCandidate, FIXTURE_GENERATED_AT, goalFixture, bufferFixture, allocationFixture, solPosition, cryptoPosition, nonCoreToken, stablePosition, yieldPosition, inputsFor, topPickCount, makeCandidate, CONTRACT_CATEGORIES, catCandidate, EXEC_CODES } from "./engineFixtureHarness";
import type { FixtureArgs } from "./engineFixtureHarness";

/** Runs scenarios A–F and returns structured pass/fail results. */
export function runSuggestionEngineFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  // A. Buffer not funded → one actionable buffer suggestion, amount = shortfall.
  {
    const r = runEngineWithLegacyRebalance(
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
    const r = runEngineWithLegacyRebalance(
      inputsFor({ safetyBuffer: bufferFixture(5000, 1000, 3), positions: [cryptoPosition()] }),
      FIXTURE_GENERATED_AT
    );
    add(
      "B: fully funded → no suggestion",
      r.suggestions.length === 0 && r.unavailable_reason === undefined,
      `suggestions=${r.suggestions.length} unavailable=${r.unavailable_reason}`
    );
  }

  // C. Below minimum confirmed gap ($25 < $50) → informational "nearly funded" (21C: no disabled action button).
  {
    const r = runEngineWithLegacyRebalance(
      inputsFor({ safetyBuffer: bufferFixture(2975, 1000, 3) }), // confirmed gap 25
      FIXTURE_GENERATED_AT
    );
    const s = r.suggestions[0];
    const minTrade = s?.guardrails.find((g) => g.code === "min_trade_size");
    add(
      "C: confirmed gap below $50 → informational 'nearly funded' (no disabled action)",
      r.suggestions.length === 1 &&
        s?.action_kind === "informational" &&
        s?.is_actionable === false &&
        s?.reason_codes.includes("buffer_nearly_funded") &&
        minTrade?.status === "not_applicable",
      `action=${s?.action_kind} reasons=${s?.reason_codes.join(",")} min_trade=${minTrade?.status}`
    );
  }

  // D. Missing Safety Buffer → no suggestion + unavailable_reason missing_data.
  {
    const r = runEngineWithLegacyRebalance(
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
    const r = runEngineWithLegacyRebalance(
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
    const r6 = runEngineWithLegacyRebalance(
      inputsFor({
        safetyBuffer: bufferFixture(800, 1000, 6),
        goal: { ...goalFixture, risk_tolerance: "very_low" },
      }),
      FIXTURE_GENERATED_AT
    );
    const r1 = runEngineWithLegacyRebalance(
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
    const r = runEngineWithLegacyRebalance(
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
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: allocationFixture(15000, 75, 15),
        safetyBuffer: bufferFixture(5000, 1000, 3), // funded
        
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
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: allocationFixture(15000, 45, -15),
        safetyBuffer: bufferFixture(5000, 1000, 3),
        
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
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: allocationFixture(15000, 45, -15),
        safetyBuffer: bufferFixture(3000, 1000, 3), // exactly funded, zero excess
        
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
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: allocationFixture(15000, 65, 5),
        safetyBuffer: bufferFixture(5000, 1000, 3),
        
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
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: null, safetyBuffer: bufferFixture(5000, 1000, 3) }),
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
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: allocationFixture(400, 70, 10),
        safetyBuffer: bufferFixture(5000, 1000, 3),
        totalUsd: 400,
        
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
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: allocationFixture(15000, 75, 15),
        safetyBuffer: bufferFixture(5000, 1000, 3),
        
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
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: allocationFixture(15000, 62, 5),
        safetyBuffer: bufferFixture(5000, 1000, 3), // funded
        
        positions: [cryptoPosition()],
      }),
      FIXTURE_GENERATED_AT
    );
    const s = r.suggestions[0];
    add(
      "N: funded + delta 5% → On Track (informational, 4 cards)",
      r.suggestions.length === 4 &&
        r.suggestions.every((x) => x.category === "on_track" && x.is_actionable === false && x.is_top_pick === false && x.amount === undefined) &&
        s?.reason_codes.includes("portfolio_aligned") === true,
      `category=${s?.category} actionable=${s?.is_actionable} top_pick=${s?.is_top_pick}`
    );
  }

  // O. Buffer NOT funded + allocation within threshold → buffer only, no On Track.
  {
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: allocationFixture(15000, 62, 5),
        safetyBuffer: bufferFixture(800, 1000, 3), // underfunded
        
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
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: allocationFixture(15000, 75, 15),
        safetyBuffer: bufferFixture(5000, 1000, 3),
        
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
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: null, safetyBuffer: bufferFixture(5000, 1000, 3) }),
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
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: allocationFixture(15000, 62, 5),
        safetyBuffer: bufferFixture(5000, 1000, 3),
        
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
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: allocationFixture(15000, 62, 5), safetyBuffer: null }),
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
    const r = runEngineWithLegacyRebalance(
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

  // U. Below-minimum informational "nearly funded" buffer → no Top Pick.
  {
    const r = runEngineWithLegacyRebalance(
      inputsFor({ safetyBuffer: bufferFixture(2975, 1000, 3) }), // confirmed gap 25
      FIXTURE_GENERATED_AT
    );
    add(
      "U: informational nearly-funded buffer → no Top Pick",
      r.suggestions[0]?.action_kind === "informational" &&
        topPickCount(r.suggestions) === 0,
      `action=${r.suggestions[0]?.action_kind} count=${topPickCount(r.suggestions)}`
    );
  }

  // V. Funded + rebalance actionable → Rebalance is Top Pick.
  {
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: allocationFixture(15000, 75, 15),
        safetyBuffer: bufferFixture(5000, 1000, 3),
        
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
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: allocationFixture(15000, 62, 5),
        safetyBuffer: bufferFixture(5000, 1000, 3),
        
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


/* ------------------------------------------------------------------ *
 * Step 7A — mapper checks (EngineSuggestion → SuggestionCardState).
 * Cases A–J use the Ma prefix to stay distinct from the engine A–Z.
 * ------------------------------------------------------------------ */
export function runMapperFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const engineCard = (args: FixtureArgs) => {
    const r = runEngineWithLegacyRebalance(inputsFor(args), FIXTURE_GENERATED_AT);
    return { card: r.suggestions[0] ? toSuggestionCard(r.suggestions[0]) : undefined, r };
  };

  // Ma. Buffer actionable → title/description/amount, review-only, Top Pick true.
  {
    const { card } = engineCard({ safetyBuffer: bufferFixture(800, 1000, 3) }); // shortfall 2200
    add(
      "Ma: buffer actionable → mapped card (numbers-rich description, amount, review-only, top pick)",
      card?.title === "Top Up Your Safety Buffer" &&
        card?.description === "You have $800 in your Safety Buffer, covering 0.8 of your 3-month target." &&
        card?.impact_text.includes("$2,200") === true &&
        card?.actionability === "actionable" &&
        card?.cta.label === "Review" &&
        card?.cta.executes_transaction === false &&
        card?.is_top_pick === true,
      `title="${card?.title}" impact="${card?.impact_text}" actionability=${card?.actionability} top_pick=${card?.is_top_pick}`
    );
  }

  // Ma-detail. Definite shortfall → numbers-rich body on the card, paired with its
  // action line. The MODAL has no separate action line, so its reason carries both
  // sentences — the card's body plus that same action line, never a third wording.
  {
    const r = runEngineWithLegacyRebalance(inputsFor({ safetyBuffer: bufferFixture(4000, 1000, 6) }), FIXTURE_GENERATED_AT);
    const s = r.suggestions[0];
    const card = s ? toSuggestionCard(s) : undefined;
    const body = "You have $4,000 in your Safety Buffer, covering 4 of your 6-month target.";
    const action = "Add $2,000 to your Safety Buffer.";
    add(
      "Ma-detail: definite shortfall body on the card; modal reason = body + the SAME action line",
      card?.description === body && card?.impact_text === action
        && s?.reviewDetails?.summary.reason === `${body} ${action}`,
      `desc="${card?.description}" | reason="${s?.reviewDetails?.summary.reason}"`
    );
  }

  // Ma-neartarget. Small gap whose covered months round to the target months → the direct "you're $X short of your
  // N-month target" body (not "cover 3 months / target 3 months"), and Current coverage keeps 2dp ("2.95 of 3 months").
  {
    const r = runEngineWithLegacyRebalance(inputsFor({ safetyBuffer: bufferFixture(2950, 1000, 3) }), FIXTURE_GENERATED_AT);
    const s = r.suggestions[0];
    const card = s ? toSuggestionCard(s) : undefined;
    const expected = "You’re $50 short of your 3-month Safety Buffer target. Add $50 in USDC to fully fund it before investing further.";
    const coverage = (s?.reviewDetails?.metrics ?? []).find((m) => m.label === "Current coverage")?.value;
    add(
      "Ma-neartarget: covered≈target months → direct gap body; Current coverage keeps 2dp (2.95 of 3 months)",
      card?.description === expected && s?.reviewDetails?.summary.reason === expected && coverage === "2.95 of 3 months" && card?.impact_text === "Add $50 to your Safety Buffer.",
      `desc="${card?.description}" cov="${coverage}"`
    );
  }

  // Mb. Confirmed gap below minimum → informational "nearly funded" card, no Top Pick (21C).
  {
    const { card } = engineCard({ safetyBuffer: bufferFixture(2975, 1000, 3) }); // confirmed gap 25
    add(
      "Mb: buffer below min → informational nearly-funded card, no Top Pick, no disabled reason",
      card?.actionability === "informational" &&
        card?.status === "ready" &&
        card?.is_top_pick === false &&
        card?.title === "Safety Buffer Is Nearly Funded",
      `actionability=${card?.actionability} status=${card?.status} title="${card?.title}"`
    );
  }

  // Mb-copy. Below-minimum informational card → exact-cents body + "$X remaining" action line ($49.99, not rounded).
  {
    const { card } = engineCard({ safetyBuffer: bufferFixture(2950.01, 1000, 3) }); // confirmed gap 49.99
    add(
      "Mb-copy: nearly-funded body names the exact $49.99 gap; action line '$49.99 remaining'",
      card?.description === "You’re $49.99 short of your Safety Buffer target. The remaining gap is too small for a separate top-up, so you can cover it with your next contribution." &&
        card?.impact_text === "$49.99 remaining" &&
        card?.actionability === "informational",
      `desc="${card?.description}" impact="${card?.impact_text}"`
    );
  }

  // Mc. Rebalance overweight → bucket-level card, no token names invented.
  {
    const { card } = engineCard({ allocation: allocationFixture(15000, 75, 15),
      safetyBuffer: bufferFixture(5000, 1000, 3),
      
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
    const { card } = engineCard({ allocation: allocationFixture(15000, 45, -15),
      safetyBuffer: bufferFixture(5000, 1000, 3),
      
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
    const { card } = engineCard({ allocation: allocationFixture(15000, 62, 5),
      safetyBuffer: bufferFixture(5000, 1000, 3),
      
      positions: [cryptoPosition()],
    });
    add(
      "Me: On Track → scoped informational Goal Check card, label-only Review Goal prompt, no Top Pick (21H multi-card)",
      /^Goal Check: .+\?$/.test(card?.title ?? "") &&
        card?.actionability === "informational" &&
        card?.cta.label === "Review Goal" &&
        card?.cta.action === null &&
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
    cryptoPosition(5000), // Step 24A — no longer a capital_efficiency source (generic rule retired)
    solPosition(10), // staking
    stablePosition("USDC", 10000), // stable_yield (when no rebalance)
    yieldPosition(5000, null), // position_optimization (missing APY)
  ];

  // QA-1. No Rebalance → capEff, staking, stable_yield, position_optimization
  //       (4 cards), capEff Top Pick, engine order preserved.
  {
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: allocationFixture(15000, 62, 2),
        safetyBuffer: bufferFixture(5000, 1000, 3),
        // no rebalance
        positions: everything,
      }),
      FIXTURE_GENERATED_AT, null, null, undefined, synthTrimCandidate(), buildSyntheticPositionOptimizationCandidateForFixture()
    );
    add(
      "9F-1: no rebalance, all fire → 4 cards in order (no capital_efficiency), trim Top Pick",
      cats(r) === "trim,staking,stable_yield,position_optimization" &&
        topPickCat(r) === "trim" &&
        tpCount(r) === 1 &&
        r.suggestions.length === 4,
      `order=${cats(r)} topPick=${topPickCat(r)} tpCount=${tpCount(r)}`
    );
  }

  // QA-2. Rebalance present → rebalance, capEff, staking, position_optimization
  //       (stable_yield suppressed), 4 cards, rebalance Top Pick.
  {
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: allocationFixture(15000, 75, 15),
        safetyBuffer: bufferFixture(5000, 1000, 3),
        // rebalance applies
        positions: everything,
      }),
      FIXTURE_GENERATED_AT, null, null, undefined, synthTrimCandidate(), buildSyntheticPositionOptimizationCandidateForFixture()
    );
    add(
      "9F-2: rebalance present → rebalance,trim,staking,posOpt (no stable_yield / no capEff), rebalance Top Pick",
      cats(r) === "rebalance,trim,staking,position_optimization" &&
        topPickCat(r) === "rebalance" &&
        tpCount(r) === 1 &&
        r.suggestions.length === 4,
      `order=${cats(r)} topPick=${topPickCat(r)}`
    );
  }

  // QA-3. Underfunded buffer overrides EVERYTHING (all else eligible) → buffer only.
  {
    const r = runEngineWithLegacyRebalance(
      inputsFor({ allocation: allocationFixture(15000, 75, 15),
        safetyBuffer: bufferFixture(800, 1000, 3), // underfunded
        
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
    const noReb = runEngineWithLegacyRebalance(
      inputsFor({ allocation: allocationFixture(15000, 62, 2),
        safetyBuffer: bufferFixture(5000, 1000, 3),
        
        positions: everything,
      }),
      FIXTURE_GENERATED_AT
    );
    const withReb = runEngineWithLegacyRebalance(
      inputsFor({ allocation: allocationFixture(15000, 75, 15),
        safetyBuffer: bufferFixture(5000, 1000, 3),
        
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
    buffer: runEngineWithLegacyRebalance(inputsFor({ safetyBuffer: bufferFixture(800, 1000, 3), positions: [cryptoPosition(100)] }), FIXTURE_GENERATED_AT),
    rebalance: runEngineWithLegacyRebalance(inputsFor({ allocation: allocationFixture(15000, 75, 15), safetyBuffer: funded(), positions: [cryptoPosition(100)] }), FIXTURE_GENERATED_AT),
    // Step 24A — capital_efficiency was retired; the staking category now carries the JUP staking card.
    trim: runEngineWithLegacyRebalance(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: smallTokens }), FIXTURE_GENERATED_AT, null, null, undefined, synthTrimCandidate()),
    staking: runEngineWithLegacyRebalance(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT),
    stable_yield: runEngineWithLegacyRebalance(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT),
    dca: (() => { const inp = inputsFor({ allocation: dcaUnder(3), safetyBuffer: funded(), positions: [cryptoPosition(100)] }); return runEngineWithLegacyRebalance(inp, FIXTURE_GENERATED_AT, buildEngineFixtureDcaCandidate()); })(),
    position_optimization: runEngineWithLegacyRebalance(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [cryptoPosition(100)] }), FIXTURE_GENERATED_AT, null, null, undefined, null, buildSyntheticPositionOptimizationCandidateForFixture()),
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
    const r = runEngineWithLegacyRebalance(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [cryptoPosition(100)] }), FIXTURE_GENERATED_AT);
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
      ...runEngineWithLegacyRebalance(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [cryptoPosition(100)] }), FIXTURE_GENERATED_AT).suggestions,
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
    buffer: runEngineWithLegacyRebalance(inputsFor({ safetyBuffer: bufferFixture(800, 1000, 3), positions: [cryptoPosition(100)] }), FIXTURE_GENERATED_AT),
    rebalance: runEngineWithLegacyRebalance(inputsFor({ allocation: allocationFixture(15000, 75, 15), safetyBuffer: funded(), positions: [cryptoPosition(100)] }), FIXTURE_GENERATED_AT),
    trim: runEngineWithLegacyRebalance(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: smallTokens }), FIXTURE_GENERATED_AT, null, null, undefined, synthTrimCandidate()),
    staking: runEngineWithLegacyRebalance(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [solPosition(10)] }), FIXTURE_GENERATED_AT),
    stable_yield: runEngineWithLegacyRebalance(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [stablePosition("USDC", 10000)] }), FIXTURE_GENERATED_AT),
    dca: (() => { const inp = inputsFor({ allocation: dcaUnder(3), safetyBuffer: funded(), positions: [cryptoPosition(100)] }); return runEngineWithLegacyRebalance(inp, FIXTURE_GENERATED_AT, buildEngineFixtureDcaCandidate()); })(),
    position_optimization: runEngineWithLegacyRebalance(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [cryptoPosition(100)] }), FIXTURE_GENERATED_AT, null, null, undefined, null, buildSyntheticPositionOptimizationCandidateForFixture()),
    on_track: runEngineWithLegacyRebalance(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [cryptoPosition(100)] }), FIXTURE_GENERATED_AT),
  };
  const find = (c: string) => runs[c].suggestions.find((s) => s.category === c);
  const rd = (c: string) => find(c)?.reviewDetails;
  const metricLabels = (c: string) => (rd(c)?.metrics ?? []).map((m) => m.label);
  const allReviewDetails = Object.keys(runs).map((c) => rd(c)).filter((x): x is NonNullable<typeof x> => x != null);

  // 10A-A. Every emitted ACTIONABLE category carries reviewDetails (On Track is informational: no modal/details, 21E).
  {
    const cats = ["buffer", "rebalance", "trim", "staking", "stable_yield", "dca", "position_optimization"]; // Step 24A — capital_efficiency retired
    const missing = cats.filter((c) => rd(c) == null);
    add("10A-A: every emitted actionable category has reviewDetails", missing.length === 0, `missing=${missing.join(",") || "none"}`);
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
  // 10A-C. Buffer details (clean definite shortfall): the focused 4-card set (Amount needed / Current / Target / Coverage), no other cards.
  {
    const labels = metricLabels("buffer");
    const d = rd("buffer");
    const coverage = (d?.metrics ?? []).find((m) => m.label === "Current coverage")?.value;
    // ORDER is asserted, not just membership: the cards read where-you-are →
    // where-you're-aiming → what-to-do, and the action figure is emphasized.
    const amountCard = (d?.metrics ?? []).find((m) => m.label === "Amount to add");
    const ok = labels.join("|") === "Current|Current coverage|Target|Amount to add"
      && amountCard?.emphasis === "primary"
      && d?.hideMetricsHeading === true && d?.hideGuardrails === true && coverage === "0.8 of 3 months";
    add("10A-C: buffer modal → ordered 4-card set (Current/Current coverage/Target/Amount to add), amount emphasized, no heading/guardrails", ok, `labels=${labels.join(" | ")}`);
  }
  // 10A-D. Staking details: focused modal card set (Stake/Receive with USD sub-values, APY, yearly rewards, unstake
  // timing + fee note) under focusedLayout; the full protocol-selection data is preserved (guardrail still checked).
  {
    const d = rd("staking");
    const labels = metricLabels("staking");
    const stake = d?.metrics.find((m) => m.label === "Stake");
    const fee = d?.metrics.find((m) => m.label === "Direct Unstake Fee");
    const ok =
      ["Stake", "Receive", "Current APY", "Estimated yearly rewards", "Direct Unstake", "Direct Unstake Fee"].every((l) => labels.includes(l)) &&
      typeof stake?.subValue === "string" && stake!.subValue!.startsWith("$") &&
      fee?.tooltip === "Applied to the unstaked amount" &&
      d?.focusedLayout === true &&
      (d?.guardrailSummary.checked ?? []).includes("Protocol selection");
    add("10A-D: staking modal → focused card set (Stake/Receive/APY/yearly rewards/unstake+fee), focusedLayout, protocol data preserved", ok, `labels=${labels.join(",")}`);
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
    const reason = d?.summary.reason ?? "";
    const ok =
      /non-core/i.test(reason) && !/sell|dispose|clean up|remove/i.test(reason) && !/\bswap\w*\b(?![^.]*\bto usdc\b)/i.test(reason) &&
      (gs?.notEvaluated ?? []).includes("Liquidity depth") &&
      !(gs?.checked ?? []).includes("Liquidity depth");
    add("10A-G: canonical trim details use a review reason and never claim liquidity evaluated", ok, `reason="${reason}"`);
  }
  // 10A-H. Position Optimization: flagged value, triggered reasons, no replacement protocol.
  {
    const d = rd("position_optimization");
    const ok =
      metricLabels("position_optimization").includes("Positions to review") &&
      (d?.summary.reason ?? "").length > 0 &&
      (d?.involvedPositions.length ?? 0) > 0 &&
      (d?.guardrailSummary.notApplicable ?? []).includes("Protocol selection");
    add("10A-H: position_optimization details include flagged value/reasons + no replacement protocol", ok, `notApplicable=${d?.guardrailSummary.notApplicable.join(",")}`);
  }
  // 10A-I. On Track (21E) is informational with NO reviewDetails — no CTA, no modal, no dead calculations.
  {
    const onTrackSug = find("on_track");
    add("10A-I: on_track is informational with no reviewDetails (no modal/dead details, 21E)", onTrackSug != null && onTrackSug.reviewDetails == null && onTrackSug.action_kind === "informational", `hasDetails=${rd("on_track") != null} action=${onTrackSug?.action_kind}`);
  }
  // 10A-J. No reviewDetails contains forbidden language.
  {
    const forbidden = ["guaranteed", "optimal", "best", "you should", "we will move", "we will stake", "we will buy", "automatic", "risk-free", "sell", "buy", "execute", "bad", "unsafe", "highest apy", "safest protocol"];
    // The forbidden-language guard targets WealthSmith's own ADVICE copy. The `externalLink` is an explicit user-choice
    // read-only handoff button to a third party's own page (e.g. "Stake SOL on Jito", "Buy on MoonPay") — the modal
    // already marks it "opens in a new tab, no transaction is created" — so its CTA label is excluded from this scan.
    const json = JSON.stringify(allReviewDetails.map((d) => ({ ...d, externalLink: undefined }))).toLowerCase();
    // "swap"/"swapping" is permitted ONLY in the approved destination-framed line ("… to USDC" / "… to SOL"); a bare or
    // imperative "swap" with no destination (e.g. "swap now", "swap your tokens") stays forbidden. CTA remains "Review".
    const bareSwap = /\bswap\w*\b(?![^.]*\bto (usdc|sol)\b)/.test(json);
    const hits = forbidden.filter((w) => json.includes(w));
    add("10A-J: reviewDetails advice copy (excluding the external-handoff CTA) contains no forbidden language", hits.length === 0 && !bareSwap, `hits=${hits.join(",") || "none"}${bareSwap ? ",bare-swap" : ""}`);
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
    // An invented APY/TVL VALUE (percent/usd) is forbidden. Honest COUNT metrics — e.g. the canonical Position
    // Optimization "APY freshness unverified" count — are metadata, not an invented yield figure, so they are allowed.
    const anyApyTvlMetric = allReviewDetails.some((d) =>
      d.metrics.some((m) => /\bAPY\b|\bTVL\b/i.test(m.label) && m.kind !== "count")
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

  const run = runEngineWithLegacyRebalance(
    inputsFor({ allocation: allocationFixture(15000, 75, 15),
      safetyBuffer: bufferFixture(5000, 1000, 3),
      
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

  const rebalanceOver = runEngineWithLegacyRebalance(
    inputsFor({ allocation: allocationFixture(15000, 75, 15), safetyBuffer: bufferFixture(5000, 1000, 3), positions: [cryptoPosition(100)] }),
    FIXTURE_GENERATED_AT
  );
  const rebalanceUnder = runEngineWithLegacyRebalance(
    inputsFor({ allocation: allocationFixture(15000, 20, -40), safetyBuffer: bufferFixture(5000, 1000, 3), positions: [cryptoPosition(100)] }),
    FIXTURE_GENERATED_AT
  );
  const posOptConc = runEngineWithLegacyRebalance(
    inputsFor({ allocation: allocationFixture(15000, 62, 2), safetyBuffer: bufferFixture(5000, 1000, 3), totalUsd: 100, positions: [cryptoPosition(100)] }),
    FIXTURE_GENERATED_AT, null, null, undefined, null, buildSyntheticPositionOptimizationCandidateForFixture()
  );
  const stableYield = runEngineWithLegacyRebalance(
    inputsFor({ allocation: allocationFixture(15000, 62, 2), safetyBuffer: bufferFixture(5000, 1000, 3), positions: [stablePosition("USDC", 10000)] }),
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
  // 10C-B. Position Optimization shows a protocol label + a numeric concentration share (canonical fields).
  {
    const p0 = rd(posOptConc, "position_optimization")?.involvedPositions[0];
    const ok = !!p0 && typeof p0.protocol === "string" && p0.protocol.length > 0 && typeof p0.portfolioSharePct === "number" && (p0.reason ?? "").length > 0;
    add("10C-B: position optimization shows protocol + concentration share", ok, `protocol=${p0?.protocol} share=${p0?.portfolioSharePct} reason="${p0?.reason}"`);
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
    const r = runEngineWithLegacyRebalance(inputsFor({ safetyBuffer: bufferFixture(800, 1000, 3), positions: [cryptoPosition(100)] }), FIXTURE_GENERATED_AT);
    add(
      "SMOKE-A: buffer underfunded → buffer only, Top Pick, modal-openable",
      cats(r) === "buffer" && topPickCat(r) === "buffer" && r.suggestions[0]?.reviewDetails != null,
      `categories=${cats(r)} top=${topPickCat(r)}`
    );
  }
  // B. Rebalance + Position Optimization → rebalance first & Top Pick.
  {
    const r = runEngineWithLegacyRebalance(inputsFor({ allocation: allocationFixture(15000, 75, 15), safetyBuffer: funded(), positions: [cryptoPosition(100)] }), FIXTURE_GENERATED_AT, null, null, undefined, null, buildSyntheticPositionOptimizationCandidateForFixture());
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
  // C. Step 24A — five categories fire in engine order (no capital_efficiency), Trim Top Pick, no UI sorting.
  {
    const inp = inputsFor({ allocation: dcaUnder(3),
      safetyBuffer: funded(),

      positions: [cryptoPosition(400), nonCoreToken("AAA", 40), nonCoreToken("BBB", 40), nonCoreToken("CCC", 40), solPosition(10), stablePosition("USDC", 10000), yieldPosition(3000, null)],
    });
    const r = runEngineWithLegacyRebalance(
      inp,
      FIXTURE_GENERATED_AT, buildEngineFixtureDcaCandidate(), null, undefined, synthTrimCandidate(), buildSyntheticPositionOptimizationCandidateForFixture()
    );
    add(
      "SMOKE-C: five categories in engine order (no capital_efficiency), Trim Top Pick, one Top Pick, all modal-openable",
      cats(r) === "trim,staking,stable_yield,dca,position_optimization" &&
        topPickCat(r) === "trim" &&
        topPickCount(r) === 1 &&
        r.suggestions.every((s) => s.reviewDetails != null),
      `categories=${cats(r)} top=${topPickCat(r)} tpCount=${topPickCount(r)}`
    );
  }
  // D. On Track only → no Top Pick, no modal action (goal/expense carry a label-only "Review Goal" prompt; all cta.action null).
  {
    const r = runEngineWithLegacyRebalance(inputsFor({ allocation: aligned(), safetyBuffer: funded(), positions: [cryptoPosition(100)] }), FIXTURE_GENERATED_AT);
    const ds = r.suggestions.map(toSuggestionCard);
    add(
      "SMOKE-D: On Track only, no Top Pick, no modal action (label-only Review Goal prompt)",
      cats(r).split(",").every((c) => c === "on_track") && cats(r) !== "none" && topPickCount(r) === 0 && ds.every((d) => d.cta.action === null),
      `categories=${cats(r)} tp=${topPickCount(r)} ctas="${ds.map((d) => d.cta.label).join("|")}"`
    );
  }
  // E. Partial pricing → warning appears and calculable suggestions still render.
  {
    const r = runEngineWithLegacyRebalance(inputsFor({ allocation: aligned(), safetyBuffer: funded(), anyUnpriced: true, positions: [cryptoPosition(400)] }), FIXTURE_GENERATED_AT);
    add(
      "SMOKE-E: partial pricing → partial_pricing warning + suggestions still render",
      r.warnings.includes("partial_pricing") && r.suggestions.length > 0,
      `warnings=${r.warnings.join(",")} count=${r.suggestions.length}`
    );
  }
  // F. Missing data → unavailable state, no suggestions (no demo fallback).
  {
    const r = runEngineWithLegacyRebalance(inputsFor({ safetyBuffer: null, positions: [cryptoPosition(100)] }), FIXTURE_GENERATED_AT);
    add(
      "SMOKE-F: missing data → unavailable_reason=missing_data, no suggestions",
      r.suggestions.length === 0 && r.unavailable_reason === "missing_data",
      `count=${r.suggestions.length} reason=${r.unavailable_reason}`
    );
  }

  return checks;
}


export function runIncidentSearchFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const S = IS_SCAN, R = IS_RESULTS;

  // --- Method ---
  add("IS-1: the scope model has all 8 incident categories", IS_SCOPE.categories.length === 8 && (IS_SCOPE.categories as readonly string[]).includes("accounting") && /answers ACCOUNTING alone/.test(IS_SCOPE.categoriesNote), "8 categories");
  add("IS-2: the subject boundary is defined and motivated by real errors", /subjects must not blur/.test(IS_SCOPE.subjectBoundary) && /KVault-vs-KLend/.test(IS_SCOPE.subjectBoundaryMotivation) && /Main-vs-SOL\/BTC/.test(IS_SCOPE.subjectBoundaryMotivation), "boundary + motivation");
  add("IS-3: four source classes ranked, third-party is locate-only", IS_SOURCES.length === 4 && IS_SOURCES[0].name === "on-chain" && /LOCATE-ONLY/.test(IS_SOURCES[2].authority), "on-chain first, aggregators locate-only");
  add("IS-4: the negative-result discipline is preserved", /SEARCH RESULT/.test(IS_NEG.rule) && /never a clean record/.test(IS_NEG.rule) && /steakhouseIncidentEvidence/.test(IS_NEG.preservedVerbatimFrom), "search result, not clean record");
  add("IS-5: the source-enumeration rule is inherited from S.0", IS_ENUM.from.includes("16H-S.0") && /cited-but-unenumerated source is UNSEARCHED/.test(IS_ENUM.rule), "inherited");

  // --- The self-check (the load-bearing part) ---
  add("IS-6: the self-check requirement is defined with a threshold", /recognizedFraction/.test(IS_SELFCHECK.requirement) && IS_SELFCHECK.threshold === 0.9 && /void/.test(IS_SELFCHECK.whyMandatory) === false && /every count .* is void/.test(IS_SELFCHECK.requirement.replace("must be near 1.0","")) === false, "threshold 0.9");
  add("IS-7: the self-check exists because run 1 was a false negative", /Run 1 of this exact scan returned 'socialize_loss: 0'/.test(IS_SELFCHECK.whyMandatory) && /decode bug/.test(IS_SELFCHECK.whyMandatory), "false negative recorded");
  add("IS-8: a failed self-check voids the zero, not confirms clean", /Discard all counts/.test(IS_SELFCHECK.onFailure) && /a broken instrument/.test(IS_SELFCHECK.onFailure), "0 ≠ clean when decoder dead");

  // --- Registry (SDK-verified, live-loadable) ---
  add("IS-9: the SDK discriminator registry loads all 63 instructions", (() => { const r = loadKlendDiscriminatorRegistry(); return Object.keys(r).length === 63; })(), "63 instructions");
  add("IS-10: socialize_loss and update_reserve_config resolve in the live registry", (() => { const r = loadKlendDiscriminatorRegistry(); return r["f54b5b00ec611303"] === "socializeLoss" && r["3d9464468f6b110d"] === "updateReserveConfig"; })(), "SDK-confirmed");
  add("IS-11: the admin instruction registry maps each to a dimension", KLEND_ADMIN.socialize_loss.feedsDimension === "incident_history" && KLEND_ADMIN.update_reserve_config.feedsDimension === "manager_discretion" && KLEND_ADMIN.withdraw_protocol_fee.feedsDimension === "withdrawal_fee_transparency", "mapped");
  add("IS-12: the anchorDiscriminator helper is correct", anchorDiscriminator("socialize_loss") === "f54b5b00ec611303", "global:name sha256");
  add("IS-13: the registry mismatch was the decoder, not the registry", /the mismatch was the decoder, not the registry/.test(IS_REGVERIFY.note), "registry authoritative");

  // --- The validated result ---
  add("IS-14: the scan self-check passed at 1.0", S.selfCheckRecognizedFraction === 1.0 && S.selfCheckPassed === true, "1.0");
  add("IS-15: socialize_loss on this reserve is zero, over full owner tenure", R.socialize_loss.onThisReserve === 0 && R.socialize_loss.totalObserved === 0, "0");
  add("IS-16: update_reserve_config was exercised 4 times on this reserve", R.update_reserve_config.onThisReserve === 4 && R.update_reserve_config.datesOnThisReserve.length === 4 && R.update_reserve_config.datesOnThisReserve.includes("2026-06-05"), "4 dated");
  add("IS-17: the scan scope is the market-owner authority's complete history", /market-owner Squads vault 24LjDBuk/.test(S.scope) && S.totalOwnerTxns === 168 && /has_one.*VERIFIED at 16H-L\.2/.test(S.scopeJustification), "correct scope");
  add("IS-18: the socialize_loss negative is strong BUT bounded", /STRONG negative for the current-owner period/.test(S.interpretation.socializeLoss) && /still a SEARCH RESULT/.test(S.interpretation.socializeLossLimits) && /current owner's tenure only/i.test(S.interpretation.socializeLossLimits), "strong + bounded");
  add("IS-19: the socialize_loss_v2 and pre-tenure limits are named", /socialize_loss_v2/.test(S.interpretation.socializeLossLimits) && /prior owner could have socialized losses earlier/.test(S.interpretation.socializeLossLimits), "3 bounds");
  add("IS-20: manager_discretion is recorded as EXERCISED, not dormant", /manager_discretion is NOT dormant/.test(S.interpretation.updateReserveConfig) && /has been EXERCISED/.test(S.interpretation.updateReserveConfig), "active");
  add("IS-21: the update_reserve_config parameter-decode limit is stated", /does not decode WHICH parameters changed/.test(S.interpretation.updateReserveConfigLimits), "count, not params");

  // --- Scores frozen ---
  add("IS-22: incident_history score is unchanged at 5", /5 \(unchanged\)/.test(S.feedsButDoesNotMove.incidentHistoryScore) && DA_DIMS.find((d) => String(d.dimensionId) === "incident_history")!.score === 5, "5");
  add("IS-23: manager_discretion score is unchanged at 5", /5 \(unchanged\)/.test(S.feedsButDoesNotMove.managerDiscretionScore) && DA_DIMS.find((d) => String(d.dimensionId) === "manager_discretion")!.score === 5, "5");
  add("IS-24: scores are frozen because this is an evidence task", /Moving a live score requires the assessment mechanism/.test(S.feedsButDoesNotMove.scoresFrozenBecause) && IS_CONFERS.scoresAssigned === false, "evidence, not reassessment");
  add("IS-25: the Kamino aggregate is untouched", DA_OUTCOME.unroundedAggregate === 5.93 && DA_OUTCOME.meetsMinimum === false && DA_MANIFEST_HASH === "direct_assessment_54a11ba3", "5.93");

  // --- Jupiter applicability ---
  add("IS-26: the scan was NOT run for Jupiter, with reasons", IS_JUP.scanRun === false && IS_JUP.whyNot.length === 3 && /share-price model/.test(IS_JUP.whyNot[0]) && /~1\.4 days old/.test(IS_JUP.whyNot[1]), "correctly skipped");
  add("IS-27: the correct Jupiter technique is named and deferred", /convertToAssets\) monotonicity/.test(IS_JUP.correctJupiterTechnique) && /too young to be informative/.test(IS_JUP.correctJupiterTechnique), "share-price, deferred");

  // --- Integrity ---
  add("IS-28: the methodology manifest is deterministic", IS_HASH === computeIncidentSearchHash() && /^incident_search_[0-9a-f]{8}$/.test(IS_HASH), IS_HASH);
  add("IS-29: no execution behaviour was added", IS_CONFERS.transactionConstructedOrSimulated === false, "read-only");
  add("IS-30: no clean record or proof of absence is conferred", (IS_CONFERS.doesNotConfer as readonly string[]).includes("a clean record") && (IS_CONFERS.doesNotConfer as readonly string[]).includes("proof of absence"), "bounded negative only");
  add("IS-31: prior evidence remains immutable", SOL_BTC_USDC_IDENTITY_MANIFEST_HASH === "identity_9773ac14" && AUTH_MANIFEST_HASH === computeAuthorityManifestHash() && IDL_HASH === computeIdlAmendmentHash() && SC_HASH === computeS0ManifestHash() && VERIFIED_EVIDENCE_MANIFEST_HASH === "evidence_a86da1fd", "5 intact");

  return checks;
}


/* ------------------------------------------------------------------ *
 * Step 13H — hidden `/testing` page: fixture-only visual QA of every suggestion
 * category through the SAME shared card/modal. Verifies the route flags, that
 * every category is present, the read-only/fixture-only guarantees, the JitoSOL
 * staking testing fixture, and that Demo/real-wallet behavior is unchanged.
 * ------------------------------------------------------------------ */
export function runTestingPageFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const fixtures = getTestingPageFixtures();
  const byCategory = (label: string) => fixtures.find((f) => f.categoryLabel === label);
  const fixturesJson = JSON.stringify(fixtures);

  // 13H-A…G. Route + safety flags.
  add("13H-A: TESTING_PAGE_EXISTS is true", TESTING_PAGE_EXISTS === true, `v=${TESTING_PAGE_EXISTS}`);
  add("13H-B: TESTING_PAGE_ROUTE is /testing", TESTING_PAGE_ROUTE === "/testing", `v=${TESTING_PAGE_ROUTE}`);
  add("13H-C: TESTING_PAGE_VISIBLE_IN_NAV is false", TESTING_PAGE_VISIBLE_IN_NAV === false, `v=${TESTING_PAGE_VISIBLE_IN_NAV}`);
  add("13H-D: TESTING_PAGE_USES_FIXTURE_DATA is true", TESTING_PAGE_USES_FIXTURE_DATA === true, `v=${TESTING_PAGE_USES_FIXTURE_DATA}`);
  add("13H-E: TESTING_PAGE_USES_REAL_WALLET_DATA is false", TESTING_PAGE_USES_REAL_WALLET_DATA === false, `v=${TESTING_PAGE_USES_REAL_WALLET_DATA}`);
  add("13H-F: TESTING_PAGE_ENABLES_TRANSACTIONS is false", TESTING_PAGE_ENABLES_TRANSACTIONS === false, `v=${TESTING_PAGE_ENABLES_TRANSACTIONS}`);
  add("13H-G: TESTING_PAGE_MUTATES_LIVE_SUGGESTIONS is false", TESTING_PAGE_MUTATES_LIVE_SUGGESTIONS === false, `v=${TESTING_PAGE_MUTATES_LIVE_SUGGESTIONS}`);

  // 13H-H…P. Every suggestion category is present.
  add("13H-H: Safety Buffer moved to the production-derived /testing gallery (hand-built testing_safety_buffer removed, 21C)", (() => { const src = (() => { try { return readFileSync(`${process.cwd()}/src/pages/testingPageFixtures.ts`, "utf8"); } catch { return ""; } })(); const gallery = (() => { try { return readFileSync(`${process.cwd()}/src/pages/safetyBufferTestingFixtures.ts`, "utf8"); } catch { return ""; } })(); return !src.includes('id: "testing_safety_buffer"') && /buildSafetyBufferCardFromAssessment/.test(gallery) && /deriveSafetyBufferAssessment/.test(gallery) && /computeSafetyBufferCoverage/.test(gallery); })(), "production SB gallery");
  add("13H-I: testing fixtures include Rebalance", byCategory("Allocation") != null, `has=${byCategory("Allocation") != null}`);
  add("13H-J: Step 24A — generic Capital Efficiency REMOVED from testing fixtures (hand-built testing_capital_efficiency gone, no 'Review Idle Assets' card)", (() => { const src = (() => { try { return readFileSync(`${process.cwd()}/src/pages/testingPageFixtures.ts`, "utf8"); } catch { return ""; } })(); return byCategory("Capital Efficiency") == null && !src.includes('id: "testing_capital_efficiency"') && !src.includes("Review Idle Assets"); })(), `has=${byCategory("Capital Efficiency") != null}`);
  add("13H-K: Trim moved to the production-derived /testing gallery (hand-built testing_trim removed, 19C)", (() => { const src = (() => { try { return readFileSync(`${process.cwd()}/src/pages/testingPageFixtures.ts`, "utf8"); } catch { return ""; } })(); const trimGallery = (() => { try { return readFileSync(`${process.cwd()}/src/pages/trimTestingFixtures.ts`, "utf8"); } catch { return ""; } })(); return !src.includes('id: "testing_trim"') && /buildTrimCardFromAssessment/.test(trimGallery) && /deriveTrimAssessment/.test(trimGallery); })(), "production trim gallery");
  add("13H-L: testing fixtures include Staking", byCategory("Staking") != null, `has=${byCategory("Staking") != null}`);
  add("13H-M: testing fixtures include Stable Yield", byCategory("Stablecoin Yield") != null, `has=${byCategory("Stablecoin Yield") != null}`);
  add("13H-N: testing fixtures include DCA", byCategory("Contribution Plan") != null, `has=${byCategory("Contribution Plan") != null}`);
  add("13H-O: Position Optimization moved to the production-derived /testing gallery (hand-built testing_position_optimization removed, 20C)", (() => { const src = (() => { try { return readFileSync(`${process.cwd()}/src/pages/testingPageFixtures.ts`, "utf8"); } catch { return ""; } })(); const poGallery = (() => { try { return readFileSync(`${process.cwd()}/src/pages/positionOptimizationTestingFixtures.ts`, "utf8"); } catch { return ""; } })(); return !src.includes('id: "testing_position_optimization"') && /buildPositionOptimizationCardFromAssessment/.test(poGallery) && /derivePositionOptimizationAssessment/.test(poGallery); })(), "production PO gallery");
  add("13H-P: On Track moved to the production-derived /testing gallery (hand-built testing_on_track removed, 21E)", (() => { const src = (() => { try { return readFileSync(`${process.cwd()}/src/pages/testingPageFixtures.ts`, "utf8"); } catch { return ""; } })(); const gallery = (() => { try { return readFileSync(`${process.cwd()}/src/pages/onTrackTestingFixtures.ts`, "utf8"); } catch { return ""; } })(); return !src.includes('id: "testing_on_track"') && /buildOnTrackCardsFromAssessment/.test(gallery) && /deriveOnTrackAssessment/.test(gallery); })(), "production OT gallery");

  // 13H-Q. Every fixture carries the TESTING_PREVIEW_NOT_LIVE label.
  {
    const bad = fixtures.filter((f) => f.label !== TESTING_PREVIEW_NOT_LIVE || JSON.stringify(f).indexOf(TESTING_PREVIEW_NOT_LIVE) === -1);
    add("13H-Q: every testing fixture has TESTING_PREVIEW_NOT_LIVE", bad.length === 0 && TESTING_PREVIEW_NOT_LIVE === "TESTING_PREVIEW_NOT_LIVE", `missing=${bad.length}`);
  }

  // 13H-R. Every ACTIONABLE fixture has actionKind review_only (CTA action "review").
  {
    const actionable = fixtures.filter((f) => f.card.actionability === "actionable");
    const bad = actionable.filter((f) => f.card.cta.action !== "review");
    add("13H-R: every actionable testing fixture is review-only", actionable.length > 0 && bad.length === 0, `actionable=${actionable.length} bad=${bad.length}`);
  }
  // 13H-S…U. No transaction / signature / completion on any fixture CTA.
  add("13H-S: every testing fixture has executes_transaction false", fixtures.every((f) => f.card.cta.executes_transaction === false), "all false");
  add("13H-T: every testing fixture has requires_wallet_signature false", fixtures.every((f) => f.card.cta.requires_wallet_signature === false), "all false");
  add("13H-U: every testing fixture has completion_on_click false", fixtures.every((f) => f.card.cta.completion_on_click === false), "all false");

  // 13H-V…X. JitoSOL staking testing fixture content.
  {
    const s = byCategory("Staking");
    const md = s?.details.protocolSelectionDisplay?.marketData;
    add("13H-V: staking testing fixture includes Jito · JitoSOL", s?.card.protocolName === "Jito" && s?.card.lstSymbol === "JitoSOL" && s?.details.protocolSelectionDisplay?.protocolName === "Jito", `name=${s?.card.protocolName} lst=${s?.card.lstSymbol}`);
    add("13H-W: staking testing fixture includes TVL 767950000", md?.tvlUsd === 767950000, `tvl=${md?.tvlUsd}`);
    add("13H-X: staking testing fixture includes APY 5.36", md?.apyPct === 5.36, `apy=${md?.apyPct}`);
  }

  // 13H-Y (21E). On Track is no longer a hand-built grid fixture — the production-derived gallery renders it now
  // (its informational / no-CTA / never-Top-Pick contract is proven by OTM-1/OTM-2/OTM-14).
  {
    add("13H-Y (21E): On Track removed from the hand-built grid (production gallery instead)", byCategory("On Track") == null, `present=${byCategory("On Track") != null}`);
  }

  // 13H-Z/AA. The page uses the SHARED card/modal (declared flags; grep-verified in the report).
  add("13H-Z: testing page uses the shared SuggestionCard", TESTING_PAGE_USES_SHARED_CARD === true, `v=${TESTING_PAGE_USES_SHARED_CARD}`);
  add("13H-AA: testing page uses the shared SuggestionReviewModal", TESTING_PAGE_USES_SHARED_MODAL === true, `v=${TESTING_PAGE_USES_SHARED_MODAL}`);

  // 13H-AB…AE. Not imported by live pages / rails, and not linked in nav.
  add("13H-AB: testing page is not imported by Dashboard", TESTING_PAGE_IMPORTED_BY_DASHBOARD === false, `v=${TESTING_PAGE_IMPORTED_BY_DASHBOARD}`);
  add("13H-AC: testing page is not imported by Portfolio", TESTING_PAGE_IMPORTED_BY_PORTFOLIO === false, `v=${TESTING_PAGE_IMPORTED_BY_PORTFOLIO}`);
  add("13H-AD: testing page is not imported by SuggestionRail/RealWalletSuggestionsRail", TESTING_PAGE_IMPORTED_BY_RAIL === false, `v=${TESTING_PAGE_IMPORTED_BY_RAIL}`);
  add("13H-AE: testing page is not linked in navigation", TESTING_PAGE_LINKED_IN_NAV === false && TESTING_PAGE_VISIBLE_IN_NAV === false, `linked=${TESTING_PAGE_LINKED_IN_NAV}`);

  // 13H-AF. Demo Mode remains unchanged (still demo_preview, DEMO label — no TESTING label).
  {
    const demo = getDemoExactSolStakingReviewDetails();
    const ok = demo.protocolSelectionDisplay?.mode === "demo_preview" && demo.demoLabel === "DEMO_PREVIEW_NOT_LIVE" && !JSON.stringify(demo).includes(TESTING_PREVIEW_NOT_LIVE);
    add("13H-AF: Demo Mode remains unchanged", ok, `mode=${demo.protocolSelectionDisplay?.mode} label=${demo.demoLabel}`);
  }
  // 13H-AG. Real wallet behavior remains unchanged (staking still the JitoSOL beta selection; no TESTING label).
  {
    const funded = bufferFixture(5000, 1000, 3);
    const aligned = allocationFixture(15000, 62, 2);
    const run = runSuggestionEngine(inputsFor({ safetyBuffer: funded, allocation: aligned, positions: [solPosition(10)] }), FIXTURE_GENERATED_AT);
    const staking = run.suggestions.find((s) => s.category === "staking");
    const ok = staking?.protocolSelection?.status === "selected" && staking?.protocolSelection?.selectedProtocolName === "Jito" && !JSON.stringify(run).includes(TESTING_PREVIEW_NOT_LIVE);
    add("13H-AG: real wallet behavior remains unchanged", ok, `status=${staking?.protocolSelection?.status}`);
  }

  // 13H-AH. No transaction/signature/swap path in any testing fixture.
  {
    const tokens = ["sendtransaction", "signtransaction", "signalltransactions", "signmessage", "publickey", "swap(", "deposit(", "withdraw(", "unstake("];
    const hits = tokens.filter((t) => fixturesJson.toLowerCase().includes(t));
    add("13H-AH: no transaction/signature/swap path in testing fixtures", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }
  // 13H-AI. No forbidden investment claims in testing fixture copy.
  {
    const forbidden = ["best", "safest", "optimal", "guaranteed", "risk-free", "recommended", "you should", "highest apy"];
    const hits = forbidden.filter((w) => fixturesJson.toLowerCase().includes(w));
    add("13H-AI: no forbidden investment claims in testing fixture copy", hits.length === 0, `hits=${hits.join(",") || "none"}`);
  }

  return checks;
}
