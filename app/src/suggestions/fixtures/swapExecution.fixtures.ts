/**
 * Swap execution lane fixtures (SWX) — Phase 1.
 *
 * Two things are being pinned here, and the second matters more than the first.
 *
 *   1. The Execution Boundary behaves as `rules/wallet-and-custody-rules.md` states. Every
 *      condition gets a case that FAILS it, because a boundary only tested from the inside is
 *      a boundary nobody has found the edge of.
 *
 *   2. The two lanes genuinely oppose each other. SWX-20..22 take one payload and assert the
 *      quote guard rejects what the execution guard requires. That is the whole safety argument
 *      for adding execution without weakening anything: not "we were careful", but "a payload
 *      that satisfies one lane provably cannot pass the other".
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import type { FixtureCheck } from "./fixtureCheck";
import type {
  SwapQuoteComparisonAssessment,
  SwapQuoteCandidate,
} from "../swapQuote/swapQuoteContracts";
import type { SwapExecutionPlan, SwapExecutionTerms } from "../swapExecution/executionContracts";
import {
  EXECUTABLE_PROVIDER_IDS,
  MIN_QUOTE_LIFE_MS,
  deriveExecutionEligibility,
} from "../swapExecution/executionEligibility";
import {
  DEFAULT_SWAP_HANDOFF_TYPE,
  IN_APP_CONFIRM_CATEGORIES,
  permitsInAppConfirm,
  resolveSwapHandoffType,
} from "../swapExecution/swapHandoffType";
import {
  assertExecutablePlan,
  scanForForbiddenExecutionFields,
  scanTermsCompleteness,
} from "../swapExecution/executionGuard";
import { validateExecutionPlan } from "../swapExecution/swapExecutionClient";
import { eventsForPlanResult } from "../swapExecution/planResolution";
import { deriveExecutionOffer } from "../swapExecution/executionOffer";
import {
  eventPropertyValues,
  swapEventForTransition,
  type SwapExecutionEvent,
} from "../swapExecution/swapExecutionEvents";
import { outcomeFor } from "../swapExecution/executionLifecycle";
import type { SwapActionContext } from "../swapQuote/swapQuoteContracts";
import {
  CONFIRMATION_DEADLINE_MS,
  decideFromConfirmation,
  hasPassedDeadline,
  timeoutEvent,
} from "../swapExecution/confirmationPolling";
import { isSignatureShaped, stateFromStatus } from "../../server/swapExecution/confirmationStatus";
import { usdTermsFromSnapshot, usdValueOf } from "../../server/swapExecution/termsPricing";
import { demoConfirmTerms } from "../swapExecution/demoConfirmTerms";
import { decideOnExpiry, MAX_AUTO_REFRESHES } from "../swapExecution/quoteRefresh";
import {
  classifyWalletError,
  eventsForSubmitOutcome,
  isUsableSignature,
} from "../swapExecution/submitResolution";
import {
  failureCopy,
  formatCountdown,
  formatApproxTokens,
  formatApproxUsd,
  formatPercent,
  formatUsd,
  isAfterApproval,
  solscanTransactionUrl,
  busyButtonLabelFor,
  busyPresentationFor,
  showsExplorerLink,
  statusLineFor,
} from "../../components/swapExecution/swapConfirmPresentation";
import { pct as quotePct, usd as quoteUsd } from "../swapQuote/quotePresentation";
import { SWAP_CONFIRM_EXPIRED_TITLE, SWAP_CONFIRM_EXPIRED_TOAST, SWAP_CONFIRM_EXPIRED_TOAST_HELPER } from "../../state/approvedCopy";
import type { ExecutionFailureKey, ExecutionPhase } from "../swapExecution/executionLifecycle";
import { executionReducer, initialExecutionState, isExecutionBusy, isExecutionTerminal, isRenewal, isRestartable, type ExecutionEvent } from "../swapExecution/executionLifecycle";
import { REAL_SWAP_TAKER, REAL_SWAP_TX } from "./realSwapTransactions";
import {
  SWAP_CONFIRM_APPROVE_LABEL,
  SWAP_CONFIRM_CANCEL_LABEL,
  SWAP_CONFIRM_AWAITING_WALLET,
  SWAP_CONFIRM_CHECKING,
  SWAP_CONFIRM_COMPLETE_TITLE,
  SWAP_CONFIRM_DECLINED_DESC,
  SWAP_CONFIRM_DEMO_DISABLED,
  SWAP_CONFIRM_EXPIRED,
  SWAP_CONFIRM_MINIMUM_INFO,
  SWAP_CONFIRM_MINIMUM_LABEL,
  SWAP_CONFIRM_NETWORK_FEE_LABEL,
  SWAP_CONFIRM_RECEIVE_LABEL,
  SWAP_CONFIRM_SUBMIT_FAILED_DESC,
  SWAP_CONFIRM_SUBMITTING,
  SWAP_CONFIRM_TIMEOUT_DESC,
  SWAP_CONFIRM_TIMEOUT_TITLE,
  SWAP_CONFIRM_VERIFICATION_FAILED_DESC,
  swapConfirmReceived,
} from "../../state/approvedCopy";
import * as SWAP_CONFIRM_COPY_MODULE from "../../state/approvedCopy";

/** Every confirm-step string, for the blanket forbidden-phrase scan in SWCC-1. */
const SWAP_CONFIRM_COPY: Record<string, string> = Object.fromEntries(
  Object.entries(SWAP_CONFIRM_COPY_MODULE)
    .filter(([k, v]) => k.startsWith("SWAP_CONFIRM_") && typeof v === "string"),
) as Record<string, string>;
import { scanForTransactionFields } from "../swapQuote/swapQuoteSecurityGuard";

const NOW = Date.parse("2026-11-23T12:00:00.000Z");
const SOON = new Date(NOW + 30_000).toISOString();
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const WSOL = "So11111111111111111111111111111111111111112";

function candidate(o: Partial<SwapQuoteCandidate> = {}): SwapQuoteCandidate {
  return {
    providerId: "jupiter",
    providerName: "Jupiter",
    executionSurface: "jupiter",
    underlyingVenues: ["Raydium CLMM"],
    inputMint: USDC,
    outputMint: WSOL,
    inputAmountRaw: "15000000",
    expectedOutputRaw: "197901045",
    minimumOutputRaw: "196911540",
    expectedOutputTokens: "0.197901",
    expectedOutputUsd: 14.98,
    quotedAt: new Date(NOW).toISOString(),
    expiresAt: SOON,
    quoteLatencyMs: 780,
    priceImpactPct: 0.02,
    includedSwapFeeUsd: null,
    explicitPlatformFeeUsd: null,
    estimatedNetworkFeeUsd: 0.01,
    estimatedRentFeeUsd: 0,
    liquidityAssessment: { status: "verified", minimumRouteLegLiquidityUsd: 331643, legs: [] },
    freshness: "fresh",
    eligible: true,
    exclusionReasons: [],
    ...o,
  } as SwapQuoteCandidate;
}

function assessment(o: Partial<SwapQuoteComparisonAssessment> = {}): SwapQuoteComparisonAssessment {
  return {
    status: "selected",
    actionId: "a1",
    legId: "a1:0",
    pairClass: "major",
    comparedAt: new Date(NOW).toISOString(),
    expiresAt: SOON,
    selectedProviderId: "jupiter",
    selectionBasis: "lowest_estimated_total_cost",
    // Two eligible candidates: what a real `selected` looks like. The comparison emits
    // `only_route_available` when a single route ranks, so a one-candidate `selected` cannot occur.
    candidates: [candidate(), candidate({ providerId: "raydium", providerName: "Raydium", executionSurface: "raydium" })],
    comparedProviders: ["jupiter", "raydium", "orca"],
    unavailableProviders: [],
    estimatedTotalCostUsd: 0.03,
    estimatedTotalCostPct: 0.09,
    expectedOutputTokens: "0.197901",
    minimumOutputTokens: "0.196911",
    economicallyEquivalent: false,
    warnings: [],
    blockingReasons: [],
    methodologyVersion: "swap_quote_methodology_1.0.0",
    ...o,
  } as SwapQuoteComparisonAssessment;
}

/* Demo Mode preview helpers. The demo sheet is built from the demo QUOTE, so these are the
   quote fixtures above reused rather than a second set of numbers that could drift from them. */
const SIG = "5xGallerySignatureForLinkRules";

const demoAction = (): SwapActionContext => ({
  actionId: "rebalance:demo",
  suggestionId: "demo",
  suggestionCategory: "rebalance",
  legId: "rebalance:demo:0",
  legIndex: 0,
  totalLegs: 1,
  inputAsset: { symbol: "USDC", mint: USDC, decimals: 6 },
  outputAsset: { symbol: "SOL", mint: WSOL, decimals: 9 },
  inputAmountRaw: "15000000",
  inputAmountTokens: "15",
  inputAmountUsd: 15,
  sourceAvailability: "wallet_transferable",
  generatedAt: new Date(NOW).toISOString(),
});

/** Overrides apply to the SELECTED candidate, which is what the preview reads. */
const demoAssessment = (candidateOverrides: Partial<SwapQuoteCandidate> = {}) =>
  assessment({ selectedProviderId: "jupiter", candidates: [candidate(candidateOverrides)] });

const eligible = (o: Partial<Parameters<typeof deriveExecutionEligibility>[0]> = {}) =>
  deriveExecutionEligibility({
    assessment: assessment(),
    handoffType: "in_app_confirm",
    totalLegs: 1,
    nowMs: NOW,
    ...o,
  });

function terms(o: Partial<SwapExecutionTerms> = {}): SwapExecutionTerms {
  return {
    inputSymbol: "USDC",
    inputMint: USDC,
    inputAmountRaw: "15000000",
    inputAmountTokens: "15",
    inputAmountUsd: 15,
    outputSymbol: "SOL",
    outputMint: WSOL,
    expectedOutputTokens: "0.197901",
    expectedOutputUsd: 14.97,
    minimumOutputTokens: "0.196911",
    priceImpactPct: 0.02,
    slippageBps: 50,
    estimatedTotalCostUsd: 0.03,
    estimatedNetworkFeeUsd: 0.01,
    providerId: "jupiter",
    providerName: "Jupiter",
    ...o,
  };
}

function plan(o: Partial<SwapExecutionPlan> = {}): SwapExecutionPlan {
  return {
    planId: "p1",
    actionId: "a1",
    legId: "a1:0",
    unsignedTransaction: "AQABAgMEBQ==",
    terms: terms(),
    verification: {
      // Must agree with terms().minimumOutputTokens exactly: "0.196911" at 9 decimals is
      // 196911000 base units. The guard rejects a verification run against any other number,
      // and got this wrong the first time it was written — which is the check earning its place.
      simulatedDeliveredRaw: "197000000",
      checkedMinimumRaw: "196911000",
      outputDecimals: 9,
      simulatedAt: new Date(NOW).toISOString(),
    },
    lastValidBlockHeight: 320_000_000,
    expiresAt: SOON,
    quotedAt: new Date(NOW).toISOString(),
    contractsVersion: "1.0.0",
    ...o,
  } as SwapExecutionPlan;
}

const threw = (fn: () => void): string | null => {
  try { fn(); return null; } catch (e) { return (e as Error).message; }
};

export function runSwapExecutionFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const readSrc = (rel: string) => { try { return readFileSync(`${process.cwd()}/${rel}`, "utf8"); } catch { return ""; } };
  /**
   * Every .ts/.tsx file under the given roots, recursively.
   *
   * SWH-9 needs this rather than a handful of named files: the rule it pins is that NO UI file
   * anywhere produces a confirm permission, and a check that only looks at the files someone
   * remembered to list is exactly the check a new file slips past.
   */
  /** Source with comments removed, for scans that must not trip on prose describing the rule. */
  const stripComments = (src: string) =>
    src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const tsFilesUnder = (roots: string[]): string[] => {
    const out: string[] = [];
    const walk = (rel: string) => {
      let entries: string[];
      try { entries = readdirSync(`${process.cwd()}/${rel}`); } catch { return; }
      for (const name of entries) {
        const child = `${rel}/${name}`;
        let isDir = false;
        try { isDir = statSync(`${process.cwd()}/${child}`).isDirectory(); } catch { continue; }
        if (isDir) walk(child);
        else if (/\.tsx?$/.test(name)) out.push(child);
      }
    };
    for (const r of roots) walk(r);
    return out;
  };

  /* ---- The Boundary, from the inside ---- */
  add("SWX-1: a single selected Jupiter route with verified liquidity, complete terms and life left IS executable",
    eligible().executable, "happy path");
  add("SWX-2: the executable candidate is returned, so the caller never re-derives which route it approved",
    eligible().selectedCandidate?.providerId === "jupiter", "candidate returned");

  /* ---- Every condition, from the outside ---- */
  add("SWX-3: handoff_type that is not in_app_confirm blocks, and blocks ALONE — the permission question is asked before anything about the route", (() => {
    const r = eligible({ handoffType: "external_new_tab" });
    return !r.executable && r.blockReasons.length === 1 && r.blockReasons[0] === "not_in_app_confirm";
  })(), "permission first");
  add("SWX-4: a MISSING handoff_type is treated as a handoff, never as permission",
    !eligible({ handoffType: undefined }).executable && !eligible({ handoffType: null }).executable, "absent = deny");
  add("SWX-5: an unrecognised handoff_type is a handoff — the switch is an allowlist, not a denylist",
    !eligible({ handoffType: "in_app_confirm_v2" }).executable, "allowlist");
  add("SWX-6: multi-leg blocks — one transaction doing one thing",
    eligible({ totalLegs: 2 }).blockReasons.includes("multi_leg"), "single leg only");
  // A two-provider comparison where Jupiter won is a real comparison. Requiring all three would
  // gate execution on every provider being up, and Orca is routinely unavailable.
  const twoWay = assessment({
    status: "partial_comparison",
    unavailableProviders: ["orca"],
    comparedProviders: ["jupiter", "raydium"],
    candidates: [candidate(), candidate({ providerId: "raydium", providerName: "Raydium", executionSurface: "raydium" })],
  });
  add("SWX-7: partial_comparison with TWO eligible candidates and a winner IS executable — a third provider being down does not make the winner's terms less true",
    eligible({ assessment: twoWay }).executable, "two-way counts");
  add("SWX-8: only_route_available blocks — one surviving route is not a comparison, so 'best route' would be unverified",
    eligible({ assessment: assessment({ status: "only_route_available", candidates: [candidate()] }) }).blockReasons.includes("no_selected_route"), "no single-route exec");
  add("SWX-8A: partial_comparison with only ONE eligible candidate blocks — the status covers both 'a provider was down' and 'only one route survived', and only the first is a comparison", (() => {
    const onlyOne = assessment({
      status: "partial_comparison",
      candidates: [candidate(), candidate({ providerId: "raydium", providerName: "Raydium", executionSurface: "raydium", eligible: false, exclusionReasons: ["liquidity_low"] })],
    });
    return eligible({ assessment: onlyOne }).blockReasons.includes("no_selected_route");
  })(), "one eligible is not a comparison");
  add("SWX-8B: a status outside the allowlist blocks, whatever its candidates look like", (() => {
    return (["no_valid_route", "not_ready_for_quote", "not_required", "unresolved"] as const).every((st) =>
      !eligible({ assessment: assessment({ status: st }) }).executable);
  })(), "allowlist enforced");
  add("SWX-9: unverified liquidity on the WINNER blocks — 'unresolved' is the absence of a check, not a soft pass", (() => {
    const a = assessment({ candidates: [
      candidate({ liquidityAssessment: { status: "unresolved", minimumRouteLegLiquidityUsd: null, legs: [] } }),
      candidate({ providerId: "raydium", providerName: "Raydium", executionSurface: "raydium" }),
    ] });
    return eligible({ assessment: a }).blockReasons.includes("liquidity_unverified");
  })(), "liquidity required");
  add("SWX-10: a non-Jupiter winner blocks — Raydium being the better route does not make it buildable, and the user gets the handoff", (() => {
    const a = assessment({
      selectedProviderId: "raydium",
      candidates: [candidate({ providerId: "raydium", providerName: "Raydium", executionSurface: "raydium" }), candidate()],
    });
    return eligible({ assessment: a }).blockReasons.includes("provider_not_executable");
  })(), "jupiter only");
  add("SWX-11: a missing minimumOutputTokens blocks — it is the only number the user is guaranteed",
    eligible({ assessment: assessment({ minimumOutputTokens: null }) }).blockReasons.includes("terms_incomplete"), "minimum required");
  add("SWX-12: an already-expired quote blocks",
    eligible({ assessment: assessment({ expiresAt: new Date(NOW - 1000).toISOString() }) }).blockReasons.includes("quote_expired"), "expired");
  add("SWX-13: a quote expiring sooner than the signing window blocks — honest at render, a lie by signature", (() => {
    const a = assessment({ expiresAt: new Date(NOW + MIN_QUOTE_LIFE_MS - 1).toISOString() });
    return eligible({ assessment: a }).blockReasons.includes("quote_expired");
  })(), "too little life");
  add("SWX-14: a null expiry blocks — unknown expiry is not treated as generous",
    eligible({ assessment: assessment({ expiresAt: null }) }).blockReasons.includes("quote_expired"), "null expiry denies");
  add("SWX-15: multiple failures are ALL reported, so a caller can say why rather than just that", (() => {
    // Three independent faults: more than one leg, no comparison (single eligible route), no expiry.
    const a = assessment({
      status: "only_route_available",
      expiresAt: null,
      candidates: [candidate()],
    });
    const r = eligible({ assessment: a, totalLegs: 3 });
    return r.blockReasons.length >= 3
      && r.blockReasons.includes("multi_leg")
      && r.blockReasons.includes("no_selected_route")
      && r.blockReasons.includes("quote_expired");
  })(), "reasons accumulate");

  /* ---- The plan guard ---- */
  add("SWX-16: a complete plan passes", threw(() => assertExecutablePlan(plan())) === null, "valid plan");
  add("SWX-17: a plan with no transaction is rejected — nothing to sign is not a quiet no-op",
    threw(() => assertExecutablePlan(plan({ unsignedTransaction: "" }))) === "swap_execution_no_transaction", "empty tx");
  add("SWX-18: a credential anywhere in the plan is rejected, at any depth", (() => {
    const p = { ...plan(), nested: { deep: { secretKey: "x" } } } as unknown as SwapExecutionPlan;
    return (threw(() => assertExecutablePlan(p)) ?? "").startsWith("swap_execution_forbidden_field");
  })(), "no credentials");
  add("SWX-19: a SECOND transaction is rejected — the Boundary allows one, and 'setupTransaction' is a second", (() => {
    const p = { ...plan(), setupTransaction: "AQAB" } as unknown as SwapExecutionPlan;
    return (threw(() => assertExecutablePlan(p)) ?? "").includes("setupTransaction");
  })(), "exactly one tx");
  add("SWX-20: a minimum above the expected output is rejected — the two numbers cannot share a quote",
    threw(() => assertExecutablePlan(plan({ terms: terms({ minimumOutputTokens: "9.9", expectedOutputTokens: "1.0" }) }))) === "swap_execution_minimum_exceeds_expected", "incoherent terms");
  add("SWX-21: incomplete terms are rejected and NAME the missing fields", (() => {
    const msg = threw(() => assertExecutablePlan(plan({ terms: terms({ minimumOutputTokens: "" , priceImpactPct: NaN }) }))) ?? "";
    return msg.includes("minimumOutputTokens") && msg.includes("priceImpactPct");
  })(), "named gaps");
  add("SWX-22: a non-integer raw amount is rejected — raw amounts are base units, never decimals",
    !scanTermsCompleteness(terms({ inputAmountRaw: "15.0" })).clean, "raw is integer");

  /* ---- The two lanes genuinely oppose each other ---- */
  add("SWX-23: a valid execution plan would be REJECTED by the quote lane's guard — the quote guarantee survives execution", (() => {
    const p = plan();
    // The quote lane forbids any transaction-bearing field; an execution plan is defined by one.
    const asProviderPayload = { swapTransaction: p.unsignedTransaction, terms: p.terms };
    return !scanForTransactionFields(asProviderPayload).clean;
  })(), "quote lane still closed");
  add("SWX-24: a clean QUOTE payload carries nothing the execution guard forbids — the lanes differ on transactions, never on secrets", (() => {
    const quoteOnly = { expectedOutputTokens: "0.1978", priceImpactPct: 0.02, routePlan: [{ venue: "Raydium CLMM" }] };
    return scanForTransactionFields(quoteOnly).clean && scanForForbiddenExecutionFields(quoteOnly).clean;
  })(), "lanes agree on secrets");
  add("SWX-25: BOTH guards reject a credential — relaxing the transaction rule relaxed nothing about keys", (() => {
    const withSecret = { swapTransaction: "AQAB", apiKey: "sk_live_x" };
    return !scanForTransactionFields(withSecret).clean && !scanForForbiddenExecutionFields(withSecret).clean;
  })(), "secrets forbidden both ways");

  /* ---- Still unmounted, and the Boundary has exactly one implementation ---- */
  /* SWX-26 asserted the lane was unmounted. It is mounted now, and the fixture was weak
   * besides: it read `index.ts` files that do not exist in this tree, so readSrc returned ""
   * and it passed without checking anything. Replaced by the invariant that actually matters
   * once something IS mounted — the confirm step is reachable only through the Boundary. */
  add("SWX-26: the confirm sheet is reachable from exactly ONE product component, and that one asks the Boundary first", (() => {
    const renderers = tsFilesUnder(["src/components", "src/pages"])
      .filter((f) => !/[Ff]ixtures?\.tsx?$/.test(f))
      .filter((f) => /<SwapConfirmSheet/.test(readSrc(f)));
    if (renderers.length !== 1) return false;
    if (!renderers[0].endsWith("SwapExecutionSection.tsx")) return false;
    const section = readSrc(renderers[0]);
    // Asks, and returns nothing when the answer is no — including with no wallet to sign with.
    return /deriveExecutionOffer/.test(section) &&
      /if \(!offer\.offered \|\| takerPublicKey == null \|\| submit == null\) return null;/.test(section);
  })(), "one gated entry point");
  add("SWX-26b: the mounted section renders the sheet only AFTER the user asks for terms", (() => {
    // A plan lives 25 seconds. Preparing one when the review opens would spend that clock while
    // someone reads, and they would meet an expiry notice for reading carefully.
    const section = readSrc("src/components/swapExecution/SwapExecutionSection.tsx");
    return /enabled: started/.test(section) && /setStarted\(true\)/.test(section);
  })(), "clock starts on intent");
  add("SWX-27: Jupiter is the ONLY executable provider, and the list is explicit rather than inferred from the comparison",
    EXECUTABLE_PROVIDER_IDS.length === 1 && EXECUTABLE_PROVIDER_IDS[0] === "jupiter", `providers=${EXECUTABLE_PROVIDER_IDS.join(",")}`);
  add("SWX-28: the Boundary has ONE implementation — no other module re-derives executability", (() => {
    const elig = readSrc("src/suggestions/swapExecution/executionEligibility.ts");
    const guard = readSrc("src/suggestions/swapExecution/executionGuard.ts");
    return /in_app_confirm/.test(elig) && !/in_app_confirm/.test(guard);
  })(), "single source");

  /* ---- Phase 4: Protocol Logic's handoff_type assignment (SWH) ----
   *
   * Before this existed, `handoff_type` was a field nothing ever set to `in_app_confirm`, so the
   * Boundary's first gate could never open. These pin the assignment table AND the rule that the
   * UI may not reach a confirm step any other way — the second is enforced by scanning source,
   * because "the UI never upgrades it" is otherwise a convention people remember differently.
   */
  add("SWH-1: jupiter + every approved swap category → in_app_confirm",
    IN_APP_CONFIRM_CATEGORIES.every((c) => resolveSwapHandoffType({ providerId: "jupiter", suggestionCategory: c }) === "in_app_confirm"),
    `categories=${IN_APP_CONFIRM_CATEGORIES.join(",")}`);
  add("SWH-2: a provider outside the allowlist is a handoff, even on a category that permits confirm",
    (["raydium", "orca"] as const).every((p) => resolveSwapHandoffType({ providerId: p, suggestionCategory: "rebalance" }) === "external_new_tab"),
    "non-jupiter = handoff");
  add("SWH-3: jupiter does NOT carry its permission to a non-swap category — 'token swaps only' is a restriction",
    (["stable_yield", "buffer", "position_optimization", "staking"]).every((c) => resolveSwapHandoffType({ providerId: "jupiter", suggestionCategory: c }) === "external_new_tab"),
    "category-scoped");
  add("SWH-4: absent / null / non-string input is a handoff — deny by default", (() => {
    const inputs = [
      { providerId: undefined, suggestionCategory: "rebalance" },
      { providerId: "jupiter", suggestionCategory: undefined },
      { providerId: null, suggestionCategory: null },
      { providerId: 1 as unknown as string, suggestionCategory: "rebalance" },
    ];
    return inputs.every((i) => resolveSwapHandoffType(i) === "external_new_tab");
  })(), "absent = deny");
  add("SWH-5: the provider check is an ALLOWLIST — a plausible unknown id does not pass",
    resolveSwapHandoffType({ providerId: "jupiter-v7", suggestionCategory: "rebalance" }) === "external_new_tab", "allowlist");
  add("SWH-6: permitsInAppConfirm is true for the exact literal and nothing else",
    permitsInAppConfirm("in_app_confirm") &&
      !permitsInAppConfirm("external_new_tab") && !permitsInAppConfirm("IN_APP_CONFIRM") &&
      !permitsInAppConfirm(null) && !permitsInAppConfirm(undefined) && !permitsInAppConfirm(""),
    "exact match");
  add("SWH-7: the DEFAULT is external_new_tab — the constant and the function agree",
    DEFAULT_SWAP_HANDOFF_TYPE === "external_new_tab" &&
      resolveSwapHandoffType({ providerId: "nope", suggestionCategory: "nope" }) === DEFAULT_SWAP_HANDOFF_TYPE,
    "default");
  add("SWH-8: permission and the Boundary are SEPARATE — a permitted rail still blocks on a bad quote", (() => {
    const permitted = resolveSwapHandoffType({ providerId: "jupiter", suggestionCategory: "rebalance" });
    const r = deriveExecutionEligibility({
      assessment: assessment({ expiresAt: new Date(NOW - 1).toISOString() }),
      handoffType: permitted,
      totalLegs: 1,
      nowMs: NOW,
    });
    return permitted === "in_app_confirm" && !r.executable && r.blockReasons.includes("quote_expired");
  })(), "two layers");
  add("SWH-9: no component, page, hook or state file contains in_app_confirm as a STRING LITERAL — the UI cannot produce a confirm permission", (() => {
    // Comments are stripped first, then ANY quoted form is a failure. Naming the value in a
    // comment is documentation — approvedCopy.ts cites it to say which step its strings belong
    // to — while a quoted "in_app_confirm" in a UI file is the UI deciding, which is forbidden.
    // Stripping rather than narrowing the quote set keeps a template literal caught too.
    const withoutComments = (src: string) =>
      src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    const hits = tsFilesUnder(["src/components", "src/pages", "src/hooks", "src/state"])
      .filter((f) => /["'`]in_app_confirm["'`]/.test(withoutComments(readSrc(f))));
    return hits.length === 0;
  })(), "UI never upgrades");
  add("SWH-10: swapHandoffType is the only module that RETURNS the literal; eligibility only compares against it", (() => {
    const assign = readSrc("src/suggestions/swapExecution/swapHandoffType.ts");
    const elig = readSrc("src/suggestions/swapExecution/executionEligibility.ts");
    return /return providerPermitted && categoryPermitted \? "in_app_confirm"/.test(assign) &&
      /handoffType !== "in_app_confirm"/.test(elig) && !/return "in_app_confirm"/.test(elig);
  })(), "one producer");
  add("SWH-11: the two provider allowlists stay SEPARATE declarations — a product permission is not an engineering capability", (() => {
    const assign = readSrc("src/suggestions/swapExecution/swapHandoffType.ts");
    const elig = readSrc("src/suggestions/swapExecution/executionEligibility.ts");
    // Each DECLARES its own list and neither IMPORTS the other's. Referring to the other in a
    // comment is fine — and is in fact how the distinction is documented — so this matches on
    // import statements, not on the mere appearance of the name.
    const importsFrom = (src: string, mod: string) =>
      new RegExp(`from "[^"]*${mod}"`).test(src);
    return /export const IN_APP_CONFIRM_PROVIDER_IDS/.test(assign) &&
      !importsFrom(assign, "executionEligibility") &&
      /export const EXECUTABLE_PROVIDER_IDS/.test(elig) &&
      !importsFrom(elig, "swapHandoffType");
  })(), "not merged");

  /* ---- Phase 4: the transport keeps the lanes apart ---- */
  add("SWH-12: the QUOTE server serves only /api/swap-quote and references nothing in the execution lane", (() => {
    const q = readSrc("src/server/swapQuote/httpServer.ts");
    return /\/api\/swap-quote/.test(q) && !/swapExecution|swap-execute/.test(q);
  })(), "quote lane untouched");
  add("SWH-13: the EXECUTION server checks the kill switch and never signs or submits", (() => {
    const e = readSrc("src/server/swapExecution/executionServer.ts");
    return /isExecutionEnabled/.test(e) &&
      !/sendTransaction|signTransaction|signAllTransactions|Keypair|secretKey/.test(e);
  })(), "unsigned only");
  add("SWH-14: a plan response is never cacheable — it is bound to one blockhash, wallet and window",
    /cache-control.*no-store/.test(readSrc("src/server/swapExecution/executionServer.ts")), "no-store");

  /* ---- Phase 4: the browser client for the execution lane (SWXC) ----
   *
   * The client's job is NOT to decide anything. It fetches, checks the shape, and hands the plan
   * to verification. These pin that boundary — especially that a well-shaped plan is not a
   * verified one, which is the single easiest thing to get wrong here.
   */
  add("SWXC-1: the client talks ONLY to /api/swap-execute — no provider host, no RPC, no server import", (() => {
    const c = readSrc("src/suggestions/swapExecution/swapExecutionClient.ts");
    return /\/api\/swap-execute/.test(c) &&
      !/api\.jup\.ag|raydium\.io|solana-rpc|SOLANA_RPC|server\/swapExecution/.test(c);
  })(), "client boundary");
  add("SWXC-2: the api base is read in the EXACT import.meta.env.KEY form — a cast inlines the whole build env", (() => {
    const c = readSrc("src/suggestions/swapExecution/swapExecutionClient.ts");
    // The leak that reached production was `(import.meta as ...).env?.KEY`. Pin the safe shape and
    // forbid the one that dumps every variable, this key included, into the public bundle.
    return /import\.meta\.env\.VITE_SWAP_EXECUTE_API_BASE/.test(c) &&
      !/import\.meta\s+as/.test(c) && !/\(import\.meta\)/.test(c);
  })(), "no env dump");
  add("SWXC-3: the request carries the taker's PUBLIC key and nothing private", (() => {
    const c = readSrc("src/suggestions/swapExecution/swapExecutionClient.ts");
    return /takerPublicKey/.test(c) &&
      !/secretKey|privateKey|keypair|signTransaction|sendTransaction/.test(c);
  })(), "public key only");
  add("SWXC-4: a plan bearing a signature or a second transaction is refused by the client, not stripped", (() => {
    const p = plan();
    return validateExecutionPlan({ ...p, signature: "abc" }) === "forbidden_field_in_plan" &&
      validateExecutionPlan({ ...p, signedTransaction: "AQAB" }) === "forbidden_field_in_plan" &&
      validateExecutionPlan({ ...p, transactions: ["AQAB"] }) === "forbidden_field_in_plan";
  })(), "refuse, never repair");
  add("SWXC-5: a plan with no transaction, incomplete terms, or a minimum above the expectation is invalid", (() => {
    const p = plan();
    return validateExecutionPlan({ ...p, unsignedTransaction: "" }) === "invalid_plan" &&
      validateExecutionPlan({ ...p, terms: terms({ minimumOutputTokens: "" }) }) === "invalid_plan" &&
      validateExecutionPlan({ ...p, terms: terms({ minimumOutputTokens: "9999", expectedOutputTokens: "1" }) }) === "invalid_plan";
  })(), "shape");
  add("SWXC-6: an unparseable expiry is invalid — a plan whose life we cannot read is not a plan",
    validateExecutionPlan({ ...plan(), expiresAt: "soon" }) === "invalid_plan" &&
      validateExecutionPlan({ ...plan(), expiresAt: "" }) === "invalid_plan", "expiry parses");
  add("SWXC-7: a well-formed plan validates — the checks reject bad shapes, not all shapes",
    validateExecutionPlan(plan()) === null, "accepts good");
  add("SWXC-8: non-objects are invalid rather than throwing", (() => {
    return ([null, undefined, "x", 7, []] as unknown[]).every((v) => validateExecutionPlan(v) !== null);
  })(), "total");
  add("SWXC-9: `disabled` and `unavailable` are DISTINCT errors — a kill switch is not an outage", (() => {
    const c = readSrc("src/suggestions/swapExecution/swapExecutionClient.ts");
    return /"disabled"/.test(c) && /execution_disabled/.test(c) && /"unavailable"/.test(c);
  })(), "operational vs failure");
  add("SWXC-10: the client NEVER verifies — no simulation, no chain read, no claim of safety", (() => {
    const c = readSrc("src/suggestions/swapExecution/swapExecutionClient.ts");
    return !/simulateTransaction|simulateAndVerifyValue|verifyTransactionStructure|Connection/.test(c);
  })(), "validation != verification");
  add("SWXC-11: the dev proxy routes the two lanes to two DIFFERENT local processes", (() => {
    const v = readSrc("vite.config.ts");
    return /\/api\/swap-quote/.test(v) && /\/api\/swap-execute/.test(v) &&
      /8787/.test(v) && /8788/.test(v);
  })(), "two services");

  /* ---- Phase 4: the confirm step's copy (SWCC) ----
   *
   * Copy is the part of this feature a user actually experiences, and the part most likely to
   * drift. These pin the claims it is allowed to make — in particular that it never says we
   * executed anything, and never calls a pending transaction a failed one.
   */
  add("SWCC-1: no confirm-step string uses a forbidden phrase — we never describe WealthSmith as acting", (() => {
    const forbidden = [
      "Execute now", "Confirm trade", "Rebalance complete", "Trade submitted",
      "Funds moved", "We will invest", "We moved your funds", "Guaranteed", "Risk-free",
    ];
    const all = Object.entries(SWAP_CONFIRM_COPY).map(([, v]) => v);
    return all.every((v) => forbidden.every((f) => !v.toLowerCase().includes(f.toLowerCase())));
  })(), "no forbidden phrase");
  add("SWCC-2: the primary action is Approve — the user's action in their own wallet, not ours",
    SWAP_CONFIRM_APPROVE_LABEL === "Approve" && SWAP_CONFIRM_CANCEL_LABEL === "Cancel", "labels");
  add("SWCC-3: a pending swap is NEVER called failed — it is on-chain and may still succeed", (() => {
    const t = `${SWAP_CONFIRM_TIMEOUT_TITLE} ${SWAP_CONFIRM_TIMEOUT_DESC}`.toLowerCase();
    return !/fail|error|lost|gone/.test(t) && /may still complete/.test(t);
  })(), "no false failure claim");
  add("SWCC-4: declining and expiring both state that nothing was sent", (() => {
    return /nothing was sent/i.test(SWAP_CONFIRM_DECLINED_DESC) &&
      /nothing was sent/i.test(SWAP_CONFIRM_EXPIRED) &&
      /stayed in your wallet/i.test(SWAP_CONFIRM_SUBMIT_FAILED_DESC);
  })(), "funds are accounted for");
  add("SWCC-5: the check state claims only that the transaction was checked — never that the trade is safe", (() => {
    const c = SWAP_CONFIRM_CHECKING.toLowerCase();
    return !/safe|secure|verified|guaranteed|approved by/.test(c);
  })(), "no endorsement");
  add("SWCC-5b: the checked state says NOTHING — a verdict there read as the swap having completed", (() => {
    // "Success" sat directly above an unpressed Approve button, while the screen that really
    // does succeed says "Swap complete". A word that appears only before anything happens, and
    // never when it does, is worse than silence. `ready` is the resting state: terms on screen,
    // button available, nothing to narrate.
    return busyPresentationFor("ready") === null &&
      // The states where something IS happening still say so — removing the verdict must not
      // quietly empty the sheet. Checked against the combined rule, because after Approve the
      // answer lives in the button rather than on the line.
      statusLineFor("preparing") === SWAP_CONFIRM_CHECKING &&
      statusLineFor("verifying") === SWAP_CONFIRM_CHECKING &&
      busyButtonLabelFor("signing") === SWAP_CONFIRM_AWAITING_WALLET &&
      busyButtonLabelFor("submitting") === SWAP_CONFIRM_SUBMITTING;
  })(), "no verdict before the act");
  add("SWCC-5c: the status line keeps its place when it empties, so Approve does not jump", (() => {
    const c = readSrc("src/components/swapExecution/SwapConfirmSheet.tsx");
    // Rendered on the phase, not on the text. Dropping the element at `ready` would pull the
    // footer upward at the exact moment someone is reaching for the button.
    return /\{!confirmed && \(/.test(c) && !/\{statusLine && \(/.test(c);
  })(), "no layout jump");
  add("SWCC-6: every estimated FIGURE carries a tilde, the guaranteed one carries none", (() => {
    // The mark moved from the label to the value, so the guarantee is checked where it now
    // lives. What must hold is unchanged: an approximate figure is visibly approximate, and the
    // minimum — the only number the chain enforces — is never dressed as one.
    const receive = formatApproxTokens("0.721313", "USDC");
    const fee = formatApproxUsd(0.01);
    // The tilde is now the ONLY marker — no label says "(estimated)" any more. That makes the
    // formatters load-bearing: rendering either figure without them silently drops the marking
    // and nothing else would notice, so both are asserted exactly rather than by pattern.
    return receive === "~0.721313 USDC" &&
      fee === "~$0.01" &&
      !/~/.test(SWAP_CONFIRM_MINIMUM_LABEL) &&
      !/estimat/i.test(SWAP_CONFIRM_MINIMUM_LABEL) &&
      !/estimat/i.test(SWAP_CONFIRM_RECEIVE_LABEL) &&
      !/estimat/i.test(SWAP_CONFIRM_NETWORK_FEE_LABEL);
  })(), "estimate marking");
  add("SWCC-6b: an ABSENT figure is never marked as an estimate — '~—' claims precision we lack", (() => {
    return formatApproxUsd(null) === "—" &&
      formatApproxUsd(Number.NaN) === "—" &&
      formatApproxTokens(null, "USDC") === "—" &&
      formatApproxTokens("", "USDC") === "—";
  })(), "absent is not approximate");
  add("SWCC-7: the minimum's explanation states on-chain enforcement — the one claim that makes it meaningful",
    /enforced by the network/i.test(SWAP_CONFIRM_MINIMUM_INFO) &&
      /stay in your wallet/i.test(SWAP_CONFIRM_MINIMUM_INFO), "on-chain minimum");
  add("SWCC-8: the verification refusal says WE refused, and offers the handoff", (() => {
    const d = SWAP_CONFIRM_VERIFICATION_FAILED_DESC.toLowerCase();
    return /we\u2019re not asking you to approve it|we're not asking you to approve it/.test(d) &&
      /jupiter directly/.test(d);
  })(), "refusal is explicit");
  add("SWCC-9: success copy is a template needing the ACTUAL received amount — it cannot render the estimate by default", (() => {
    // A function, not a constant: there is no way to show the success line without supplying a
    // figure, so "reuse the estimate" has to be a deliberate act rather than the default.
    return typeof swapConfirmReceived === "function" &&
      swapConfirmReceived("71.77", "USDC") === "You received 71.77 USDC." &&
      SWAP_CONFIRM_COMPLETE_TITLE === "Swap complete";
  })(), "actual amount");
  add("SWCC-10: the copy rules document the confirm step — the strings are not ahead of their rule", (() => {
    const rules = readSrc("../content/ui-copy-rules.md");
    return /## Swap Confirmation Copy/.test(rules) &&
      /in_app_confirm/.test(rules) &&
      /Swap complete.{0,200}on-chain confirmation/s.test(rules);
  })(), "rule exists");

  /* ---- Phase 4: a plan must carry proof it was simulated (SWXV-P) ----
   *
   * The value check moved to the server, because in production the browser has no RPC. These
   * pin the part that keeps that honest: the proof travels ON the plan, the client refuses a
   * plan without it, and — the one that matters — the minimum simulated against must equal the
   * minimum displayed. A check run against a different number is worse than no check, because
   * it reads as reassurance.
   */
  add("SWXVP-1: a plan with NO verification is refused outright, not treated as unverified-but-usable", (() => {
    const { verification: _omitted, ...withoutProof } = plan();
    return (threw(() => assertExecutablePlan(withoutProof as SwapExecutionPlan)) ?? "").includes("not_verified");
  })(), "absent = refuse");
  add("SWXVP-2: the simulated minimum must EQUAL the displayed minimum — a check against another number is not a check", (() => {
    const p = plan({ verification: { ...plan().verification, checkedMinimumRaw: "196910000" } });
    return (threw(() => assertExecutablePlan(p)) ?? "").includes("verified_different_minimum");
  })(), "same number");
  add("SWXVP-3: a verification claiming delivery BELOW the minimum it checked is refused — that is a refusal the server forgot to act on", (() => {
    const p = plan({ verification: { ...plan().verification, simulatedDeliveredRaw: "1" } });
    return (threw(() => assertExecutablePlan(p)) ?? "").includes("verified_below_minimum");
  })(), "self-consistent");
  add("SWXVP-4: delivering MORE than the minimum passes — a minimum is a floor, not a target",
    threw(() => assertExecutablePlan(plan({ verification: { ...plan().verification, simulatedDeliveredRaw: "999000000" } }))) == null,
    "floor not target");
  add("SWXVP-5: exact equality passes — the rule is below-the-minimum, not at-it", (() => {
    const v = { ...plan().verification, simulatedDeliveredRaw: plan().verification.checkedMinimumRaw };
    return threw(() => assertExecutablePlan(plan({ verification: v }))) == null;
  })(), "equality passes");
  add("SWXVP-6: wrong decimals cannot make the two numbers agree by accident", (() => {
    // Same displayed minimum, decimals claimed as 6 instead of 9 → a different base-unit value.
    const p = plan({ verification: { ...plan().verification, outputDecimals: 6 } });
    return threw(() => assertExecutablePlan(p)) != null;
  })(), "decimals pinned");
  add("SWXVP-7: an unreadable, undated or non-integer-decimal proof is refused rather than skipped", (() => {
    const base = plan().verification;
    const cases = [
      { ...base, simulatedDeliveredRaw: "not-a-number" },
      { ...base, simulatedAt: "whenever" },
      { ...base, outputDecimals: 1.5 },
      { ...base, outputDecimals: 99 },
    ];
    return cases.every((v) => threw(() => assertExecutablePlan(plan({ verification: v }))) != null);
  })(), "malformed proof");
  add("SWXVP-8: the browser client refuses an unverified plan too — the rule is not server-side only", (() => {
    const { verification: _omitted, ...withoutProof } = plan();
    return validateExecutionPlan(withoutProof) === "invalid_plan" &&
      validateExecutionPlan(plan({ verification: { ...plan().verification, checkedMinimumRaw: "1" } })) === "invalid_plan";
  })(), "client enforces");
  add("SWXVP-9: the server REFUSES to offer a plan when no RPC is configured — it never offers an unchecked one", (() => {
    const v = readSrc("src/server/swapExecution/planVerification.ts");
    const h = readSrc("src/server/swapExecution/executionHandler.ts");
    return /rpc_not_configured/.test(v) && /verifyPlanBeforeOffering/.test(h) &&
      /if \(!verified\.ok\)/.test(h);
  })(), "fail closed");
  add("SWXVP-10: the verification FAILURE STAGE is never echoed to the client — one handoff answers all of them", (() => {
    const h = readSrc("src/server/swapExecution/executionHandler.ts");
    // The refusal returns the same opaque `unavailable` regardless of stage.
    return /verified\.ok[\s\S]{0,600}?error: "unavailable"/.test(h) &&
      !/error: verified\.failure|failure\.stage/.test(h);
  })(), "no internals leaked");
  add("SWXVP-11: the client still verifies STRUCTURE itself — the split is what it holds vs what it would do", (() => {
    // Structural verification is pure and needs no RPC, so the browser keeps doing it on the
    // exact bytes it will sign. Only the simulation is delegated.
    const sv = readSrc("src/suggestions/swapExecution/executionVerification.ts");
    return /export function verifyTransactionStructure/.test(sv) &&
      !/Connection|simulateTransaction/.test(sv);
  })(), "structural stays local");

  /* ---- Phase 4: the confirm flow, driven end to end without React (SWXR) ----
   *
   * The fixture suite has no DOM, so the hook's decisions were lifted into a pure function and
   * these run the WHOLE flow: a fetch result in, events through the real reducer, a phase out.
   * What is asserted here is the behaviour the browser gets, not a reading of the hook's source.
   */
  const realPlan = (o: Partial<SwapExecutionPlan> = {}): SwapExecutionPlan => plan({
    unsignedTransaction: REAL_SWAP_TX,
    terms: terms({ outputMint: WSOL, minimumOutputTokens: "0.196911", expectedOutputTokens: "0.197901" }),
    verification: {
      simulatedDeliveredRaw: "197000000",
      checkedMinimumRaw: "196911000",
      outputDecimals: 9,
      simulatedAt: new Date(NOW).toISOString(),
    },
    expiresAt: new Date(NOW + 25_000).toISOString(),
    ...o,
  });
  const drive = (result: Parameters<typeof eventsForPlanResult>[0], nowMs = NOW) =>
    eventsForPlanResult(result, { takerPublicKey: REAL_SWAP_TAKER, nowMs })
      .reduce(executionReducer, executionReducer(initialExecutionState, { type: "prepare" }));

  add("SWXR-1: a good plan reaches `ready` — and only through `verifying`", (() => {
    const s = drive({ ok: true, plan: realPlan() });
    return s.phase === "ready" && s.plan != null;
  })(), "happy path");
  add("SWXR-2: a transaction whose fee payer is NOT the connected wallet never reaches ready", (() => {
    const events = eventsForPlanResult({ ok: true, plan: realPlan() }, { takerPublicKey: WSOL, nowMs: NOW });
    const s = events.reduce(executionReducer, executionReducer(initialExecutionState, { type: "prepare" }));
    return s.phase === "failed" && s.failure === "verification_failed" && s.failureDetail === "fee_payer_mismatch";
  })(), "wrong wallet refused");
  add("SWXR-3: a proof computed against a DIFFERENT minimum is refused, not displayed as checked", (() => {
    const s = drive({ ok: true, plan: realPlan({
      verification: { simulatedDeliveredRaw: "197000000", checkedMinimumRaw: "1", outputDecimals: 9, simulatedAt: new Date(NOW).toISOString() },
    }) });
    return s.phase === "failed" && s.failure === "verification_failed" &&
      (s.failureDetail ?? "").includes("verified_different_minimum");
  })(), "same number or nothing");
  add("SWXR-4: a plan that expired while we were checking becomes EXPIRED, never ready", (() => {
    const s = drive({ ok: true, plan: realPlan() }, NOW + 26_000);
    return s.phase === "failed" && s.failure === "expired";
  })(), "expired not ready");
  add("SWXR-5: an aborted request produces NO events — the user left, there is nothing to report", (() => {
    const events = eventsForPlanResult({ ok: false, error: "aborted" }, { takerPublicKey: REAL_SWAP_TAKER, nowMs: NOW });
    return events.length === 0;
  })(), "silence on abort");
  add("SWXR-6: an outage is `plan_unavailable`; a malformed payload is a verification REFUSAL", (() => {
    const outage = drive({ ok: false, error: "unavailable" });
    const disabled = drive({ ok: false, error: "disabled" });
    const malformed = drive({ ok: false, error: "forbidden_field_in_plan" });
    return outage.failure === "plan_unavailable" && disabled.failure === "plan_unavailable" &&
      malformed.failure === "verification_failed";
  })(), "different copy, different cause");
  add("SWXR-7: EVERY non-aborted result ends somewhere terminal or ready — no path leaves a spinner on screen", (() => {
    const errors = ["disabled", "unavailable", "no_route", "rejected_request", "invalid_plan", "forbidden_field_in_plan", "http_error"] as const;
    const ends = errors.map((e) => drive({ ok: false, error: e }));
    const good = drive({ ok: true, plan: realPlan() });
    return ends.every((s) => s.phase === "failed") && good.phase === "ready";
  })(), "no dead ends");
  add("SWXR-8: the hook delegates every decision — it dispatches what the pure function returns and decides nothing itself", (() => {
    const h = readSrc("src/components/swapExecution/useSwapExecutionPlan.ts");
    return /eventsForPlanResult/.test(h) &&
      !/verifyTransactionStructure|assertPlanWasVerified/.test(h);
  })(), "hook is wiring");
  add("SWXR-9: `approve` is undefined without a submitter — a confirm button is never a no-op", (() => {
    const h = readSrc("src/components/swapExecution/useSwapExecutionPlan.ts");
    return /if \(submit == null\) return undefined;/.test(h) &&
      /state\.phase !== "ready"/.test(h);
  })(), "no dead button");

  /* ---- Phase 4: the confirm sheet (SWCS) ----
   *
   * The sheet is reviewed by eye in the /testing gallery, which is where copy and emphasis are
   * judged. What belongs here is the part eyes miss: the absent rule, the failure mapping, and
   * that the sheet decides nothing.
   */
  add("SWCS-1: the countdown is mm:ss and never negative — a plan past its expiry shows 0:00, not -0:03", (() => {
    return formatCountdown(18_000) === "0:18" && formatCountdown(65_000) === "1:05" &&
      formatCountdown(0) === "0:00" && formatCountdown(-5_000) === "0:00" &&
      formatCountdown(9_500) === "0:10";
  })(), "mm:ss clamped");
  add("SWCS-2: a figure we do not have renders as the absent mark, never as 0", (() => {
    const absent = "\u2014";
    return formatPercent(null) === absent && formatPercent(undefined) === absent &&
      formatPercent(Number.NaN) === absent && formatPercent(Number.POSITIVE_INFINITY) === absent &&
      formatUsd(null) === absent && formatUsd(Number.NaN) === absent;
  })(), "absent is absent");
  add("SWCS-3: the sheet and the route section format the SAME figure identically", (() => {
    // Two formatters in one modal rendered the same price impact as "0.008%" and "0.01%".
    // Pinned by equality rather than by matching implementations, which drift.
    const samples = [0.0077, 0.5, 1.25, 0, 12.3456];
    return samples.every((n) => formatPercent(n) === quotePct(n)) &&
      [0.01, 1, 1234.5].every((n) => formatUsd(n) === quoteUsd(n));
  })(), "one formatter");
  add("SWCS-4: a real swap's sub-0.01% impact survives formatting — two decimals would erase it",
    formatPercent(0.0077) === "0.008%" && formatPercent(0.0077) !== "0.01%", "precision kept");
  add("SWXC-0: nothing expires while a fetch is in flight — the renewal's own trap", (() => {
    const h = readSrc("src/components/swapExecution/useSwapExecutionPlan.ts");
    // Keeping the outgoing plan through a renewal leaves its `expiresAt` already in the past.
    // Without this guard the timer fires the instant the renewal starts, finds `preparing` is
    // not a refreshable phase, and expires the very flow it was renewing — so the sheet
    // dropped into "These terms expired" every time it tried to refresh itself. Fixtures
    // passed throughout; only driving it in a browser at production latency showed it.
    const effect = h.slice(h.indexOf("const onExpiry"), h.indexOf("window.setTimeout(onExpiry"));
    const guard = h.slice(h.indexOf("if (!Number.isFinite(expiresAtMs)) return;"), h.indexOf("const onExpiry"));
    return /state\.phase === "preparing"\) return;/.test(guard) && effect.length > 0;
  })(), "no stale expiry mid-renewal");
  add("SWXC-1: the first wait is held by the FOOTER, not by an empty sheet", (() => {
    const c = readSrc("src/components/swapExecution/SwapExecutionSection.tsx");
    // Mounting the sheet before there were terms opened a 148px card that became 452px when
    // they landed, shoving the page down right after the reader committed.
    return /awaitingFirstPlan/.test(c) &&
      /execution\.plan == null/.test(c) &&
      // Keyed on the absence of a plan, NOT on the phase: a renewal also passes through
      // `preparing`, and by then the sheet is open with terms and must stay open.
      !/phase === "preparing"/.test(c) &&
      // A failure has no plan either, and it has something to show.
      /execution\.phase !== "failed"/.test(c);
  })(), "no empty sheet");
  add("SWXC-2: the Continue button spins in place rather than being replaced or removed", (() => {
    const c = readSrc("src/components/swapExecution/SwapExecutionSection.tsx");
    const footer = c.slice(c.indexOf("function ContinueFooter"));
    // Same button, same place. Disappearing or swapping position would lose the connection
    // between the press and the wait it caused.
    return /swap-confirm__spinner/.test(footer) &&
      /aria-disabled="true"/.test(footer) &&
      !/[^-]disabled=/.test(footer) &&
      /aria-live="polite"/.test(footer);
  })(), "same button, spinning");
  add("SWCS-5: EVERY failure key has copy except `cancelled`, which closes silently", (() => {
    const keys: ExecutionFailureKey[] = [
      "plan_unavailable", "verification_failed", "declined", "expired", "submit_failed", "confirm_timeout", "cancelled",
    ];
    return keys.every((k) => (k === "cancelled" ? failureCopy(k) === null : failureCopy(k) != null));
  })(), "exhaustive mapping");
  add("SWCS-6: expiry has its OWN title — it is not an outage, and must not be filed under one", (() => {
    const exp = failureCopy("expired");
    const out = failureCopy("plan_unavailable");
    return exp != null && out != null && exp.title !== out.title &&
      exp.title === SWAP_CONFIRM_EXPIRED_TITLE;
  })(), "expired is not an outage");
  add("SWCS-7: the sheet DECIDES nothing — no eligibility, no verification, no handoff type", (() => {
    const c = readSrc("src/components/swapExecution/SwapConfirmSheet.tsx") +
      readSrc("src/components/swapExecution/swapConfirmPresentation.ts");
    return !/deriveExecutionEligibility|verifyTransactionStructure|assertPlanWasVerified|resolveSwapHandoffType/.test(c);
  })(), "presentation only");
  add("SWCS-8: a LIVE Approve is rendered only when checked AND a signer exists, never disabled", (() => {
    const c = readSrc("src/components/swapExecution/SwapConfirmSheet.tsx");
    // Rendered conditionally rather than disabled: a greyed-out approve button on a financial
    // confirmation reads as "almost" and explains nothing.
    //
    // Demo Mode is the single exception and is checked separately below. It uses `aria-disabled`
    // rather than the `disabled` attribute, so this scan strips that spelling and then insists
    // no real `disabled=` survives — otherwise the exception would quietly license one anywhere.
    const withoutAria = c.replace(/aria-disabled=/g, "");
    return /\{ready && !demo && onApprove && \(/.test(c) && !/disabled=/.test(withoutAria);
  })(), "no dead button");
  add("SWQR-8: the give-up toast accounts for the money and does not say Refresh", (() => {
    const all = `${SWAP_CONFIRM_EXPIRED_TOAST} ${SWAP_CONFIRM_EXPIRED_TOAST_HELPER}`;
    // The first thing anyone wants to know when a window closes by itself is whether something
    // happened. And there is no Refresh button any more, so the copy must not point at one.
    return /nothing was sent/i.test(all) && /expired/i.test(all) && !/refresh/i.test(all);
  })(), "closing is not silent");
  add("SWQR-9: closing is the HOST's call — the hook and sheet never close themselves", (() => {
    const h = readSrc("src/components/swapExecution/useSwapExecutionPlan.ts");
    const sheet = readSrc("src/components/swapExecution/SwapConfirmSheet.tsx");
    // The hook reports; it does not reach out and dismantle its container. Without a handler
    // the expired card still renders, which is what every other expiry shows.
    return /opts\.onGaveUp\?\.\(\)/.test(h) && !/onGaveUp/.test(sheet);
  })(), "report, do not close");
  add("SWDM-1: Demo Mode shows Approve unavailable WITH the reason, rather than hiding it", (() => {
    const c = readSrc("src/components/swapExecution/SwapConfirmSheet.tsx");
    // Hiding the last step would hide the thing a demo exists to show. Shown, unavailable, and
    // explained — the explanation is the part that makes it defensible.
    return /\{ready && demo && \(/.test(c) &&
      /aria-disabled="true"/.test(c) &&
      /SWAP_CONFIRM_DEMO_DISABLED/.test(c) &&
      /role="tooltip"/.test(c) &&
      // Tied to the button, so it is announced rather than merely adjacent.
      /aria-describedby=/.test(c);
  })(), "explained, not hidden");
  add("SWDM-2: the demo reason names the mode and the way out, and blames nobody", (() => {
    const t = SWAP_CONFIRM_DEMO_DISABLED.toLowerCase();
    return /demo mode/.test(t) && /connect your wallet/.test(t) &&
      !/cannot|can't|not allowed|denied|unauthoriz/.test(t);
  })(), "a fact, not a refusal");
  add("SWDM-3: the demo preview NEVER reaches the execution endpoint", (() => {
    const c = readSrc("src/components/swapExecution/SwapExecutionSection.tsx") +
      readSrc("src/suggestions/swapExecution/demoConfirmTerms.ts");
    // The demo branch returns before the hook's plan is used and builds its terms from the
    // quote already on screen. Nothing in that path fetches, signs or submits.
    return !/fetchSwapExecutionPlan|swap-execute/.test(readSrc("src/suggestions/swapExecution/demoConfirmTerms.ts")) &&
      /if \(props\.demo\) \{/.test(c);
  })(), "preview only");
  add("SWDM-4: a demo quote with no guaranteed minimum is NOT previewed", (() => {
    // The floor is the one term that may never be faked or omitted. Without it there is no
    // honest confirmation to show, so the modal keeps its ordinary hand-off footer.
    const noFloor = demoConfirmTerms(
      demoAction(),
      demoAssessment({ minimumOutputRaw: null }),
      50,
    );
    const withFloor = demoConfirmTerms(demoAction(), demoAssessment(), 50);
    return noFloor === null && withFloor != null && withFloor.minimumOutputTokens.length > 0;
  })(), "no blank floor");
  add("SWDM-5: demo terms are the DEMO quote's own figures, never invented", (() => {
    const t = demoConfirmTerms(demoAction(), demoAssessment(), 50);
    return t != null &&
      t.expectedOutputTokens === "0.197901" &&
      t.providerId === "jupiter" &&
      t.inputAmountTokens === "15";
  })(), "figures come from the quote");
  /* ---- Re-preparing (SWXR) ----
   *
   * Asking for a new plan. Both the Refresh button and the countdown's auto-renewal go through
   * this one transition, and it was MISSING: `prepare` dispatched into `ready` or `failed` was
   * returned unchanged, so neither did anything and nothing said so.
   */
  {
    const run = (events: ExecutionEvent[]) => events.reduce(executionReducer, initialExecutionState);
    const planFor = (expiresAt: string) => ({ ...plan(), expiresAt });
    const toReady = (): ExecutionEvent[] => [
      { type: "prepare" },
      { type: "plan_received", plan: planFor(new Date(NOW + 25_000).toISOString()) },
      { type: "verified" },
    ];
    add("SWXR-1: the quote can renew itself from `ready` — what makes the countdown's copy true", (() => {
      const s = run([...toReady(), { type: "prepare" }]);
      return s.phase === "preparing";
    })(), "renewal reaches the machine");
    add("SWXR-2: Refresh on an expired quote actually restarts it — it was a dead button", (() => {
      const expired = run([...toReady(), { type: "expire" }]);
      const after = executionReducer(expired, { type: "prepare" });
      return expired.phase === "failed" && expired.failure === "expired" && after.phase === "preparing";
    })(), "refresh works");
    add("SWXR-3: a restart carries NOTHING over — stale terms cannot survive into a new attempt", (() => {
      const s = run([...toReady(), { type: "expire" }, { type: "prepare" }]);
      // A plan left behind would be rendered beside the new attempt's status line, showing
      // figures from a quote that has already been abandoned.
      return s.plan === null && s.signature === null && s.failure === null && s.failureDetail === null;
    })(), "clean slate");
    add("SWXR-3b: a RENEWAL keeps the terms on screen — the sheet must not empty mid-read", (() => {
      // Nobody asked for a renewal; it happens underneath someone reading. Clearing the plan
      // blanked the terms for the length of the round trip — over a second in production,
      // every twenty-five seconds — which interrupts reading far more than the expiry notice
      // the auto-refresh exists to avoid.
      const ready = run(toReady());
      const renewing = executionReducer(ready, { type: "prepare" });
      return renewing.phase === "preparing" &&
        renewing.plan === ready.plan && renewing.plan != null &&
        // Everything describing the finished attempt still goes.
        renewing.signature === null && renewing.failure === null;
    })(), "terms survive a renewal");
    add("SWXR-3c: a RESTART still clears them — the two are not the same event", (() => {
      // From `failed` the reader pressed Refresh themselves: there is nothing on screen worth
      // keeping, and stale figures must not survive into an attempt they asked for.
      const expired = run([...toReady(), { type: "expire" }]);
      const restarted = executionReducer(expired, { type: "prepare" });
      return restarted.plan === null && isRenewal("failed") === false && isRenewal("ready") === true;
    })(), "restart is not renewal");
    add("SWXR-3d: terms held through a renewal CANNOT be approved — the machine is not `ready`", (() => {
      // This is what makes showing the outgoing terms safe. They are visible and inert.
      const renewing = executionReducer(run(toReady()), { type: "prepare" });
      const triedToSign = executionReducer(renewing, { type: "sign" });
      return renewing.phase === "preparing" && triedToSign.phase === "preparing";
    })(), "visible but inert");
    add("SWXR-4: NOTHING is re-prepared once the user has approved", (() => {
      const signing = run([...toReady(), { type: "sign" }]);
      const submitting = executionReducer(signing, { type: "signed" });
      const confirming = executionReducer(submitting, { type: "submitted", signature: "5xGallerySig" });
      const confirmed = executionReducer(confirming, { type: "confirmed" });
      // Replacing the plan here would mean the transaction the user authorised is not the one
      // we hold. Each must be refused and left exactly as it was.
      return [signing, submitting, confirming, confirmed].every((s) => {
        const after = executionReducer(s, { type: "prepare" });
        return after === s || after.phase === s.phase;
      }) && signing.phase === "signing" && confirmed.phase === "confirmed";
    })(), "no swap under the user");
    add("SWXR-5: restartable phases are exactly the pre-approval ones plus `failed`", (() => {
      const after: ExecutionPhase[] = ["signing", "submitting", "confirming", "confirmed"];
      const before: ExecutionPhase[] = ["idle", "preparing", "verifying", "ready", "failed"];
      return before.every((p) => isRestartable(p)) && after.every((p) => !isRestartable(p));
    })(), "explicit list");
  }

  /* ---- Quote auto-refresh (SWQR) ----
   *
   * The countdown says "Quote refreshes in". These checks are what make that sentence true, and
   * what stop it becoming expensive or dangerous.
   */
  {
    const ctx = (o: Partial<Parameters<typeof decideOnExpiry>[0]> = {}) => ({
      phase: "ready" as ExecutionPhase,
      autoRefreshCount: 0,
      documentHidden: false,
      canPrepare: true,
      ...o,
    });
    add("SWQR-1: a quote on screen and awaiting a decision renews itself — the copy's promise",
      decideOnExpiry(ctx()) === "auto_refresh", "refresh happens");
    add("SWQR-2: NOTHING past Approve is ever replaced — the user authorised a specific transaction", (() => {
      // The reducer already refuses `expire` after submission, but a refresh is not an expiry
      // and would slip past that refusal. Stated again here, where the choice is actually made.
      const after: ExecutionPhase[] = ["signing", "submitting", "confirming", "confirmed"];
      return after.every((phase) => decideOnExpiry(ctx({ phase })) === "expire");
    })(), "no swap under the user");
    add("SWQR-3: refreshes are capped, and spending the cap CLOSES the review", (() => {
      const under = decideOnExpiry(ctx({ autoRefreshCount: MAX_AUTO_REFRESHES - 1 }));
      const at = decideOnExpiry(ctx({ autoRefreshCount: MAX_AUTO_REFRESHES }));
      const over = decideOnExpiry(ctx({ autoRefreshCount: MAX_AUTO_REFRESHES + 99 }));
      // Having quietly re-quoted its whole allowance with no decision, a dead-end card
      // offering yet another attempt is an obstacle; the review closes and a toast says so.
      return under === "auto_refresh" && at === "expire_and_close" && over === "expire_and_close";
    })(), "bounded cost");
    add("SWQR-3b: a HIDDEN tab expires in place and never closes the review", (() => {
      // The reader is not watching, so they spent no attention on refreshes and would return to
      // a vanished modal and a toast that auto-dismissed without them. They get the card.
      const hiddenAtCap = decideOnExpiry(ctx({ documentHidden: true, autoRefreshCount: MAX_AUTO_REFRESHES }));
      const hiddenUnder = decideOnExpiry(ctx({ documentHidden: true, autoRefreshCount: 0 }));
      return hiddenAtCap === "expire" && hiddenUnder === "expire";
    })(), "never close behind their back");
    add("SWQR-3c: only a spent allowance closes it — no other expiry does", (() => {
      // Everything that is not "we spent the allowance while you watched" leaves the card up.
      const notRefreshable = decideOnExpiry(ctx({ phase: "signing", autoRefreshCount: MAX_AUTO_REFRESHES }));
      const cannotPrepare = decideOnExpiry(ctx({ canPrepare: false, autoRefreshCount: MAX_AUTO_REFRESHES }));
      return notRefreshable === "expire" && cannotPrepare === "expire";
    })(), "one reason to close");
    add("SWQR-4: a hidden tab gets no refresh — nobody is reading, and each one costs a simulation",
      decideOnExpiry(ctx({ documentHidden: true })) === "expire", "no background work");
    add("SWQR-5: with no way to prepare (no wallet, not enabled) there is no choice to make",
      decideOnExpiry(ctx({ canPrepare: false })) === "expire", "cannot refresh");
    add("SWQR-6: a terminal or idle flow never resurrects itself", (() => {
      const inert: ExecutionPhase[] = ["idle", "failed"];
      return inert.every((phase) => decideOnExpiry(ctx({ phase })) === "expire");
    })(), "no resurrection");
    add("SWQR-7: every phase is decided — the rule is exhaustive, not a list someone remembered", (() => {
      const all: ExecutionPhase[] = [
        "idle", "preparing", "verifying", "ready", "signing", "submitting", "confirming",
        "confirmed", "failed",
      ];
      // A new phase added to the machine lands here as "expire", the safe answer, rather than
      // as undefined behaviour.
      return all.every((phase) => {
        const d = decideOnExpiry(ctx({ phase }));
        return d === "auto_refresh" || d === "expire" || d === "expire_and_close";
      });
    })(), "total function");
  }

  add("SWCU-1: a USD sub-line is tokens x price, and refuses every input it cannot trust", (() => {
    return usdValueOf("0.01", 70.7) != null && Math.abs((usdValueOf("0.01", 70.7) as number) - 0.707) < 1e-9 &&
      usdValueOf("15", 1) === 15 &&
      // No price, a nonsense price, or a nonsense amount yields null — never 0, which would
      // render as "$0.00" and tell the user their swap is worthless.
      usdValueOf("0.01", null) === null &&
      usdValueOf("0.01", 0) === null &&
      usdValueOf("0.01", -5) === null &&
      usdValueOf("0.01", Number.NaN) === null &&
      usdValueOf("not-a-number", 70.7) === null &&
      usdValueOf("-1", 70.7) === null;
  })(), "usd arithmetic");
  add("SWCU-2: pricing NEVER costs a swap — no snapshot leaves both figures null, terms intact", (() => {
    // The source failing, timing out or aborting all arrive here as a null snapshot.
    const base = terms();
    const out = { ...base, ...usdTermsFromSnapshot(base, null) };
    return out.inputAmountUsd === null && out.expectedOutputUsd === null &&
      // Everything the user actually commits to is untouched, so the plan stays offerable.
      out.minimumOutputTokens === base.minimumOutputTokens &&
      out.expectedOutputTokens === base.expectedOutputTokens &&
      out.inputAmountTokens === base.inputAmountTokens;
  })(), "pricing is best-effort");
  add("SWCU-3: both USD figures come from ONE snapshot, so they cannot describe different moments", (() => {
    // 15 USDC in at $1, 0.197901 SOL out at $100 — one snapshot, one instant, two figures.
    const snapshot = {
      pricesByMint: {
        [USDC]: { usd: 1, observedAtMs: NOW, sourceId: "fixture" },
        [WSOL]: { usd: 100, observedAtMs: NOW, sourceId: "fixture" },
      },
      snapshotVersion: "fixture",
      observedAtMs: NOW,
      unpricedMints: [],
      fresh: true,
    };
    const out = usdTermsFromSnapshot(terms(), snapshot);
    return out.inputAmountUsd === 15 && Math.abs((out.expectedOutputUsd as number) - 19.7901) < 1e-9;
  })(), "one snapshot");
  add("SWCU-3b: a mint the snapshot could not price yields null for THAT figure only", (() => {
    const halfPriced = {
      pricesByMint: { [USDC]: { usd: 1, observedAtMs: NOW, sourceId: "fixture" } },
      snapshotVersion: "fixture",
      observedAtMs: NOW,
      unpricedMints: [WSOL],
      fresh: true,
    };
    const out = usdTermsFromSnapshot(terms(), halfPriced);
    // One missing price must not blank the other, and must never be filled by the other's.
    return out.inputAmountUsd === 15 && out.expectedOutputUsd === null;
  })(), "partial pricing");
  add("SWCU-4: the MINIMUM gets no USD line — the guaranteed figure stays visually distinct", (() => {
    const c = readSrc("src/components/swapExecution/SwapConfirmSheet.tsx");
    // There is no minimumOutputUsd to render, and the sub-line markup must not appear inside the
    // minimum's metric. A dollar figure there would be an estimate sitting under an exact number.
    const start = c.indexOf("swap-confirm__metric--minimum");
    // Searched FORWARD from the minimum: the label constant also appears in the import block
    // above, and slicing to that earlier index produced an empty string that passed every
    // negated test below. A scan over nothing is not a check.
    const end = start < 0 ? -1 : c.indexOf("SWAP_CONFIRM_PRICE_IMPACT_LABEL", start);
    if (start < 0 || end <= start) return false;
    const minimumBlock = c.slice(start, end);
    return /minimumOutputTokens/.test(minimumBlock) && // the slice really is the minimum's metric
      !/swap-confirm__value-usd/.test(minimumBlock) &&
      !/minimumOutputUsd/.test(c);
  })(), "no usd on the guarantee");
  add("SWCU-5: an unpriced amount OMITS its sub-line rather than printing a dash under the tokens", (() => {
    const c = readSrc("src/components/swapExecution/SwapConfirmSheet.tsx");
    // A "—" under a token figure reads as a missing term; missing context should be invisible.
    const guarded = (c.match(/formatApproxUsd\(terms\.\w+\) !== ABSENT_FIGURE &&/g) ?? []).length;
    return guarded === 2;
  })(), "absent usd is omitted");
  add("SWCS-9b: the two estimated figures go through the tilde formatters, never rendered raw", (() => {
    // With "(estimated)" gone from both labels, the tilde is the ONLY thing distinguishing an
    // estimate from the guaranteed minimum. Rendering either value directly would drop the mark
    // and no copy assertion would catch it — the constants would still be correct.
    const c = readSrc("src/components/swapExecution/SwapConfirmSheet.tsx");
    const usesFormatters =
      /formatApproxTokens\(terms\.expectedOutputTokens/.test(c) &&
      /formatApproxUsd\(terms\.estimatedNetworkFeeUsd/.test(c);
    // And the raw interpolations those replaced must not come back.
    const rawReceive = /\{terms\.expectedOutputTokens\}/.test(c);
    const rawFee = /\{formatUsd\(terms\.estimatedNetworkFeeUsd\)\}/.test(c);
    // The minimum, by contrast, MUST stay raw — a tilde there would be a lie.
    const minimumRaw = /\{terms\.minimumOutputTokens\}/.test(c);
    return usesFormatters && !rawReceive && !rawFee && minimumRaw;
  })(), "tilde cannot be dropped");
  add("SWCS-9: Refresh is offered ONLY on expiry — never after a verification refusal", (() => {
    const c = readSrc("src/components/swapExecution/SwapConfirmSheet.tsx");
    // Otherwise the sheet invites someone to retry until a check happens to pass.
    return /onRefresh && failure === "expired"/.test(c);
  })(), "no retry-until-pass");

  /* ---- Phase 5: signing and submission (SWXS5) ----
   *
   * The only code in the product that can move money. Every outcome the wallet can produce is
   * driven through the real machine here, because the failure mode that matters is not a wrong
   * message — it is a flow that stops responding while someone waits.
   */
  const afterSign = (outcome: Parameters<typeof eventsForSubmitOutcome>[0]) =>
    eventsForSubmitOutcome(outcome).reduce(
      executionReducer,
      ([{ type: "prepare" }, { type: "plan_received", plan: plan() }, { type: "verified" }, { type: "sign" }] as ExecutionEvent[])
        .reduce(executionReducer, initialExecutionState),
    );

  add("SWXS5-1: a submitted swap records the signature and waits for confirmation", (() => {
    const s2 = afterSign({ kind: "submitted", signature: "5xSig" });
    return s2.phase === "confirming" && s2.signature === "5xSig";
  })(), "submitted");
  add("SWXS5-2: a wallet ERROR ends the flow — it does not hang in `signing`", (() => {
    // The reducer dropped submit_failed from `signing`, so a wallet error left the flow stuck
    // with a spinner and no way out. The wallet signs and sends in ONE call, so a failure
    // genuinely happens in `signing` with nothing signed and nothing sent.
    const s2 = afterSign({ kind: "failed", detail: "WalletSendTransactionError" });
    return s2.phase === "failed" && s2.failure === "submit_failed" &&
      s2.failureDetail === "WalletSendTransactionError";
  })(), "no hang on wallet error");
  add("SWXS5-3: declining ends the flow as declined, with no signature", (() => {
    const s2 = afterSign({ kind: "declined" });
    return s2.phase === "failed" && s2.failure === "declined" && s2.signature == null;
  })(), "declined");
  add("SWXS5-4: EVERY wallet outcome reaches a terminal or `confirming` — none leaves the user waiting", (() => {
    const outcomes = [
      { kind: "submitted", signature: "s" }, { kind: "declined" }, { kind: "failed", detail: "x" },
    ] as const;
    return outcomes.every((o) => {
      const s2 = afterSign(o);
      return s2.phase === "confirming" || isExecutionTerminal(s2.phase);
    });
  })(), "no dead ends");
  add("SWXS5-5: a failure is NEVER reported as a decline unless the wallet said so explicitly", (() => {
    // Telling someone they declined when they did not is a false statement about what they just
    // did, and it stops them retrying. Only an explicit rejection signal counts.
    const declines = [
      { code: 4001 }, { name: "WalletUserRejectedError" },
      { message: "User rejected the request." }, { message: "user declined" },
    ];
    const failures = [
      new Error("Blockhash not found"), { name: "WalletSendTransactionError", message: "network error" },
      {}, null, undefined, "boom", { code: 4900 },
    ];
    return declines.every((e) => classifyWalletError(e).kind === "declined") &&
      failures.every((e) => classifyWalletError(e).kind === "failed");
  })(), "declines are explicit");
  add("SWXS5-6: an error detail is bounded and is never the raw message — it reaches analytics", (() => {
    const out = classifyWalletError({ name: "X".repeat(500), message: "secret-ish provider detail" });
    return out.kind === "failed" && out.detail.length === 64 && !out.detail.includes("secret-ish");
  })(), "bounded label");
  add("SWXS5-7: an empty or non-string signature is NOT success — a completed swap needs a transaction", (() => {
    return !isUsableSignature("") && !isUsableSignature(null) && !isUsableSignature(undefined) &&
      !isUsableSignature(123) && isUsableSignature("5xSig");
  })(), "signature required");
  add("SWXS5-8: the bytes submitted are the bytes verified — the submitter never rebuilds the transaction", (() => {
    // Comments are stripped first: the file's doc block NAMES the things it must not do, and a
    // scan that cannot tell an explanation from a call would forbid explaining the rule.
    const w = stripComments(readSrc("src/components/swapExecution/useWalletSwapSubmitter.ts"));
    // A blockhash refresh would change the bytes and silently void the verification. A stale
    // blockhash simply fails to submit, which is the correct way for this to go wrong.
    return /VersionedTransaction\.deserialize/.test(w) &&
      !/getLatestBlockhash|recentBlockhash\s*=|prepareTransaction/.test(w);
  })(), "verified bytes only");
  add("SWXS5-9: WealthSmith never holds a signed transaction — the wallet signs AND sends", (() => {
    const w = stripComments(readSrc("src/components/swapExecution/useWalletSwapSubmitter.ts"));
    return /sendTransaction\(/.test(w) &&
      !/signTransaction|signAllTransactions|sendRawTransaction/.test(w);
  })(), "no signed bytes held");
  add("SWXS5-10: a submitted transaction survives a stale generation — the signature is the user's only record", (() => {
    const h = readSrc("src/components/swapExecution/useSwapExecutionPlan.ts");
    return /outcome\.kind !== "submitted"/.test(h);
  })(), "never drop a signature");

  add("SWXS5-11: whenever WE are doing something the sheet says so — SOMEWHERE", (() => {
    // The gallery found the original: after Approve the machine sat in `submitting`/`confirming`
    // and the sheet rendered an empty line, so a person who had just authorised a transaction
    // was told nothing. The answer has since moved into the button for those phases, so the
    // rule is checked against the combined presentation rather than the line alone — otherwise
    // moving the text between the two places could blank one without failing anything.
    const all: ExecutionPhase[] = [
      "idle", "preparing", "verifying", "ready", "signing", "submitting", "confirming",
      "confirmed", "failed",
    ];
    const busySpeaks = all.filter(isExecutionBusy).every((p2) => {
      const b = busyPresentationFor(p2);
      return b != null && b.label.length > 0;
    });
    // `ready` is the one phase where nothing is happening and the user is the one to act.
    // `confirmed` has its own block; `idle`/`failed` are inert.
    const silent: ExecutionPhase[] = ["idle", "ready", "confirmed", "failed"];
    return busySpeaks && silent.every((p2) => busyPresentationFor(p2) === null);
  })(), "no blank states while waiting on us");
  add("SWXS5-11b: before Approve it is a line, after Approve it is the button", (() => {
    // Not cosmetic. Before approval nothing else on screen is moving and the reader is waiting
    // to be told whether they may proceed; after it, the eye is on the control it just pressed
    // and the footer must not empty out.
    const line: ExecutionPhase[] = ["preparing", "verifying"];
    const button: ExecutionPhase[] = ["signing", "submitting", "confirming"];
    return line.every((p2) => busyPresentationFor(p2)?.where === "line") &&
      button.every((p2) => busyPresentationFor(p2)?.where === "button") &&
      // And the two accessors agree with the one rule, rather than drifting from it.
      line.every((p2) => statusLineFor(p2) != null && busyButtonLabelFor(p2) === null) &&
      button.every((p2) => statusLineFor(p2) === null && busyButtonLabelFor(p2) != null);
  })(), "one rule, two places");
  add("SWXS5-11c: the busy button is never pressable and never a real `disabled`", (() => {
    const c = readSrc("src/components/swapExecution/SwapConfirmSheet.tsx");
    const busyBlock = c.slice(c.indexOf("{busyLabel && ("));
    // A label that changes inside a `disabled` control is dropped from the accessibility tree
    // by some screen readers, taking the live update with it.
    return /aria-disabled="true"/.test(busyBlock) &&
      !/[^-]disabled=/.test(busyBlock) &&
      /swap-confirm__spinner/.test(busyBlock) &&
      /aria-live="polite"/.test(busyBlock);
  })(), "announced, not pressable");
  add("SWXS5-12: `submitting` and `confirming` read the SAME — the difference is ours, not the user's",
    busyButtonLabelFor("submitting") === busyButtonLabelFor("confirming") &&
      busyButtonLabelFor("submitting") != null, "no false precision");
  add("SWXS5-12b: the two busy labels fit a button and still distinguish wallet from chain", (() => {
    const wallet = busyButtonLabelFor("signing") ?? "";
    const chain = busyButtonLabelFor("confirming") ?? "";
    // A bare spinner would be shorter, but it cannot tell someone whose wallet is merely open
    // from someone whose transaction is already on the chain — and only the second means
    // closing the tab will not stop it.
    return wallet !== chain && wallet.length <= 20 && chain.length <= 20 &&
      /wallet/i.test(wallet) && /confirm/i.test(chain);
  })(), "two words earn their place");
  add("SWXS5-13: Cancel is offered before approval and withdrawn after — nothing left to cancel", (() => {
    const before: ExecutionPhase[] = ["preparing", "verifying", "ready"];
    const after: ExecutionPhase[] = ["signing", "submitting", "confirming", "confirmed"];
    return before.every((p2) => !isAfterApproval(p2)) && after.every((p2) => isAfterApproval(p2));
  })(), "cancel window");
  add("SWXS5-13b: no explorer link while WE are still watching the chain for them", (() => {
    // A link beside a spinner invites the reader to go do, in another tab, the job the sheet is
    // already doing — and what they find mid-flight is likelier to confuse than to inform.
    return showsExplorerLink("submitting", SIG) === false &&
      showsExplorerLink("confirming", SIG) === false;
  })(), "not while in flight");
  add("SWXS5-13c: the link appears the MOMENT we stop — nothing is withheld", (() => {
    // Success makes it their record; a timeout or a revert makes it their only recourse. Every
    // ending that leaves them holding a signature offers it.
    return showsExplorerLink("confirmed", SIG) === true &&
      showsExplorerLink("failed", SIG) === true &&
      // And never conjured without one.
      showsExplorerLink("confirmed", null) === false &&
      showsExplorerLink("failed", "") === false &&
      // `signing` has no signature yet; the rule must not depend on that accident.
      showsExplorerLink("signing", SIG) === false;
  })(), "deferred, not denied");
  add("SWXS5-13d: the FAILURE branch renders the link too — a timeout is where it matters most", (() => {
    const c = readSrc("src/components/swapExecution/SwapConfirmSheet.tsx");
    // The failure branch returns early, so it needs its own render; it had none, and a confirm
    // timeout showed "Still confirming" with no way to look the transaction up.
    const failBlock = c.slice(0, c.indexOf("const providerIconUrl"));
    return /swap-confirm__transaction/.test(failBlock);
  })(), "recourse on failure");
  add("SWXS5-14: the explorer link is built only from a real signature, and is URL-safe", (() => {
    return solscanTransactionUrl("") === null && solscanTransactionUrl("5xSig") === "https://solscan.io/tx/5xSig" &&
      (solscanTransactionUrl("a/b?c") ?? "").endsWith("a%2Fb%3Fc");
  })(), "explorer link");
  add("SWXS5-15: success shows NO amount — the browser cannot read what arrived, and the estimate is not it", (() => {
    const c = readSrc("src/components/swapExecution/SwapConfirmSheet.tsx");
    // The rule permits omitting the figure; it forbids relabelling the estimate as the result.
    return /SWAP_CONFIRM_COMPLETE_TITLE/.test(c) && !/swapConfirmReceived/.test(c);
  })(), "no relabelled estimate");

  /* ---- Phase 6: the offer, and confirmation (SWXO / SWXC6) ---- */
  const action = (): SwapActionContext => ({
    actionId: "rebalance:a1",
    suggestionId: "a1",
    suggestionCategory: "rebalance",
    legId: "rebalance:a1:0",
    legIndex: 0,
    totalLegs: 1,
    inputAsset: { symbol: "USDC", mint: USDC, decimals: 6 },
    outputAsset: { symbol: "SOL", mint: WSOL, decimals: 9 },
    inputAmountRaw: "15000000",
    inputAmountTokens: "15",
    inputAmountUsd: 15,
    sourceAvailability: "wallet_transferable",
    generatedAt: new Date(NOW).toISOString(),
  });
  add("SWXO-1: an offer requires BOTH a permitted rail and a satisfied Boundary", (() => {
    const a = assessment();
    const act = { ...action(), suggestionCategory: "rebalance" as const, totalLegs: 1 };
    return deriveExecutionOffer({ action: act, assessment: a, nowMs: NOW }).offered;
  })(), "both layers");
  add("SWXO-2: a non-jupiter winner is not offered, however good the quote", (() => {
    const a = assessment({ selectedProviderId: "raydium" });
    const r = deriveExecutionOffer({ action: { ...action(), totalLegs: 1 }, assessment: a, nowMs: NOW });
    return !r.offered;
  })(), "permission first");
  add("SWXO-3: no assessment is not an offer — absence is never permission",
    !deriveExecutionOffer({ action: action(), assessment: null, nowMs: NOW }).offered, "deny by default");
  add("SWXO-4: an expired quote is not offered, and says so", (() => {
    const r = deriveExecutionOffer({
      action: { ...action(), totalLegs: 1 },
      assessment: assessment({ expiresAt: new Date(NOW - 1).toISOString() }),
      nowMs: NOW,
    });
    return !r.offered && r.blockReasons.includes("quote_expired");
  })(), "reasons survive");
  add("SWXO-5: a multi-leg action is not offered — there is no single transaction to approve", (() => {
    const r = deriveExecutionOffer({ action: { ...action(), totalLegs: 2 }, assessment: assessment(), nowMs: NOW });
    return !r.offered && r.blockReasons.includes("multi_leg");
  })(), "one transaction");

  add("SWXC6-1: only the CHAIN may report a failed swap; not knowing never becomes failure", (() => {
    return stateFromStatus(null) === "pending" &&
      stateFromStatus({ confirmed: false, err: null }) === "pending" &&
      stateFromStatus({ confirmed: true, err: null }) === "confirmed" &&
      stateFromStatus({ confirmed: true, err: { InstructionError: [0, "x"] } }) === "failed" &&
      // An error on a not-yet-confirmed read is still the chain reporting a revert.
      stateFromStatus({ confirmed: false, err: { x: 1 } }) === "failed";
  })(), "unknown is not failure");
  add("SWXC6-2: a failed REQUEST is not an outcome — we keep waiting", (() => {
    return decideFromConfirmation({ ok: false }).action === "keep_waiting" &&
      decideFromConfirmation({ ok: true, state: "pending" }).action === "keep_waiting";
  })(), "blip is not an answer");
  add("SWXC6-3: a confirmed swap stops the watch and confirms; a reverted one stops and fails", (() => {
    const good = decideFromConfirmation({ ok: true, state: "confirmed" });
    const bad = decideFromConfirmation({ ok: true, state: "failed" });
    return good.action === "stop" && good.events[0].type === "confirmed" &&
      bad.action === "stop" && bad.events[0].type === "submit_failed";
  })(), "definite outcomes");
  add("SWXC6-4: giving up is a DIFFERENT event from failing, and keeps the signature", (() => {
    const submitted = ([{ type: "prepare" }, { type: "plan_received", plan: plan() }, { type: "verified" },
      { type: "sign" }, { type: "signed" }, { type: "submitted", signature: "5xSig" }] as ExecutionEvent[])
      .reduce(executionReducer, initialExecutionState);
    const gaveUp = executionReducer(submitted, timeoutEvent());
    return gaveUp.failure === "confirm_timeout" && gaveUp.signature === "5xSig" &&
      outcomeFor(gaveUp) === "confirm_timeout";
  })(), "we stopped, it did not");
  add("SWXC6-5: the deadline is generous — stopping early produces a 'may still complete' for a swap about to land",
    hasPassedDeadline(0, CONFIRMATION_DEADLINE_MS) && !hasPassedDeadline(0, CONFIRMATION_DEADLINE_MS - 1) &&
      CONFIRMATION_DEADLINE_MS >= 60_000, `${CONFIRMATION_DEADLINE_MS}ms`);
  add("SWXC6-6: the status route is a READ and constructs nothing", (() => {
    const c = stripComments(readSrc("src/server/swapExecution/confirmationStatus.ts"));
    return /getSignatureStatuses/.test(c) &&
      !/sendTransaction|sendRawTransaction|VersionedTransaction|signTransaction/.test(c);
  })(), "read-only");
  add("SWXC6-7: a malformed signature is refused before any RPC call", (() => {
    return !isSignatureShaped("") && !isSignatureShaped("short") &&
      !isSignatureShaped("0OIl".repeat(22)) && isSignatureShaped("5".repeat(87));
  })(), "shape checked");

  /* ---- Phase 6: the funnel, and what it may carry (SWXE) ---- */
  const everyEvent = (): SwapExecutionEvent[] => {
    const phases: ExecutionPhase[] = ["idle", "preparing", "verifying", "ready", "signing", "submitting", "confirming", "confirmed", "failed"];
    const failures: (ExecutionFailureKey | null)[] = [
      null, "plan_unavailable", "verification_failed", "declined", "expired", "submit_failed", "confirm_timeout", "cancelled",
    ];
    const out: SwapExecutionEvent[] = [];
    for (const from of phases) for (const to of phases) for (const f of failures) {
      const e = swapEventForTransition(from, to, {
        provider: "jupiter", category: "rebalance", failure: f, sinceApprovalMs: 4321, renewal: false,
      });
      if (e) out.push(e);
    }
    return out;
  };

  add("SWXE-1: NO event carries an amount, a balance or anything that looks like a wallet address", (() => {
    // Walked rather than trusted: a type keeps a number out of a string field and nothing more.
    // It cannot tell a duration from a dollar amount, which is the mistake worth catching.
    const base58Long = /^[1-9A-HJ-NP-Za-km-z]{32,}$/;
    return everyEvent().every((e) =>
      eventPropertyValues(e).every((v) => {
        if (typeof v === "number") return e.name === "swap_confirmed"; // only a duration
        if (typeof v !== "string") return false;
        return !base58Long.test(v) && !/^\$?[0-9]+([.,][0-9]+)?$/.test(v);
      }),
    );
  })(), "no figures, no addresses");
  add("SWXE-2: a transaction SIGNATURE is never a property — it resolves to the wallet and every amount in it", (() => {
    const src = readSrc("src/suggestions/swapExecution/swapExecutionEvents.ts");
    const hook = readSrc("src/components/swapExecution/useSwapExecutionPlan.ts");
    // Not in the union, and the hook never puts one in a transition context.
    return !/signature\s*:/.test(stripComments(src)) &&
      !/emit\([^)]*signature/.test(stripComments(hook));
  })(), "signature stays on screen");
  add("SWXE-3: the only numeric property is a DURATION, and it is never negative", (() => {
    const confirmed = swapEventForTransition("confirming", "confirmed", {
      provider: "jupiter", category: "rebalance", failure: null, sinceApprovalMs: -50, renewal: false,
    });
    return confirmed?.name === "swap_confirmed" && confirmed.durationMs === 0;
  })(), "duration only");
  add("SWXE-4: the funnel is driven by TRANSITIONS, so it cannot drift from the machine", (() => {
    // Every phase the machine can enter either reports itself or is an internal step. A state
    // reachable but silent would be a hole in the funnel nobody notices for months.
    const reported: ExecutionPhase[] = ["preparing", "ready", "signing", "confirming", "confirmed"];
    return reported.every((to) =>
      swapEventForTransition("idle", to, { provider: "jupiter", category: "rebalance", failure: null, sinceApprovalMs: 0, renewal: false }) != null);
  })(), "transition-driven");
  add("SWXE-5: a cancellation is NOT its own event — the absence of an approval already counts it",
    swapEventForTransition("ready", "failed", { provider: "jupiter", category: "rebalance", failure: "cancelled", sinceApprovalMs: null, renewal: false }) === null,
    "no invented row");
  add("SWXE-5b: a renewal reports NOTHING — the funnel counts flows, not quotes", (() => {
    const ctx = (renewal: boolean) => ({
      provider: "jupiter" as const, category: "rebalance" as const,
      failure: null, sinceApprovalMs: null, renewal,
    });
    // A renewal runs the same ready → preparing → verifying → ready path as the first fetch.
    // Counted again, someone who read for three minutes produced SEVEN "confirm opened" rows
    // for one swap — and since approve rate is approvals over opens, the most careful readers
    // dragged the rate toward zero. The funnel's whole purpose is that number.
    const openedAgain = swapEventForTransition("ready", "preparing", ctx(true));
    const readyAgain = swapEventForTransition("verifying", "ready", ctx(true));
    // The first time through, both still report.
    const openedFirst = swapEventForTransition("idle", "preparing", ctx(false));
    const readyFirst = swapEventForTransition("verifying", "ready", ctx(false));
    return openedAgain === null && readyAgain === null &&
      openedFirst?.name === "swap_confirm_opened" && readyFirst?.name === "swap_terms_ready";
  })(), "one open per flow");
  add("SWXE-5d: the hook actually TELLS the funnel when it is renewing", (() => {
    const h = readSrc("src/components/swapExecution/useSwapExecutionPlan.ts");
    // The rule above is pure and guarded, but it is only as good as what it is handed.
    // Hardcoding `renewal: false` here restores the duplicate-counting bug and fails nothing
    // else — so the wiring is pinned to the counter that actually knows.
    return /renewal: autoRefreshCountRef\.current > 0/.test(h);
  })(), "wired to the counter");
  add("SWXE-5c: everything AFTER Approve still reports during a renewed flow", (() => {
    // Those phases are reached at most once per flow, so suppressing them would lose real
    // outcomes. `renewal` must gate only the two arrival events.
    const ctx = { provider: "jupiter" as const, category: "rebalance" as const, failure: null, sinceApprovalMs: 1200, renewal: true };
    return swapEventForTransition("ready", "signing", ctx)?.name === "swap_approved" &&
      swapEventForTransition("submitting", "confirming", ctx)?.name === "swap_submitted" &&
      swapEventForTransition("confirming", "confirmed", ctx)?.name === "swap_confirmed" &&
      swapEventForTransition("signing", "failed", { ...ctx, failure: "declined" })?.name === "swap_declined";
  })(), "outcomes survive renewal");
  add("SWXE-6: a refusal reports OUR failure key, never a provider message", (() => {
    const e = swapEventForTransition("verifying", "failed", {
      provider: "jupiter", category: "rebalance", failure: "verification_failed", sinceApprovalMs: null, renewal: false,
    });
    return e?.name === "swap_not_offered" && e.reason === "verification_failed";
  })(), "bounded reasons");
  add("SWXE-7: the lane imports no analytics transport — the emitter is injected", (() => {
    // Comments stripped, for the third time in this file: the module explains the boundary by
    // naming the transport it must not import, and a scan that cannot tell an explanation from
    // an import would forbid writing the explanation down.
    const files = ["src/suggestions/swapExecution/swapExecutionEvents.ts", "src/components/swapExecution/useSwapExecutionPlan.ts"];
    return files.every((f) => !/posthog|analytics\/analytics/i.test(stripComments(readSrc(f))));
  })(), "no transport coupling");

  return checks;
}
