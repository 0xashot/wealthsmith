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
import { deriveExecutionOffer, deriveSwapEntry, SINGLE_ROUTE_EXECUTION_CATEGORIES } from "../swapExecution/executionOffer";
import { deriveTrimRows, isTrimRetryable, sumTokenStrings } from "../swapExecution/trimFlow";
import { trimFinishedEvent } from "../swapExecution/trimEvents";
import { comparisonSelectedARoute } from "../../components/swapQuote/useSwapQuoteComparison";
import { SWAP_IN_APP_PROVIDER_IDS } from "../swapQuote/swapQuotePolicy";
import { presentSwapQuote } from "../swapQuote/quotePresentation";
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
  groupTokenAmount,
  formatApproxUsd,
  formatPercent,
  formatUsd,
  isAfterApproval,
  solscanTransactionUrl,
  busyButtonLabelFor,
  busyPresentationFor,
  showsExplorerLink,
  failureMarkFor,
  offersRetry,
  formatSettledAmount,
  formatFeeUsd,
  displayDecimalsFor,
  rawToTokenString,
} from "../../components/swapExecution/swapConfirmPresentation";
import { pct as quotePct, usd as quoteUsd } from "../swapQuote/quotePresentation";
import { DEMO_OUTCOMES } from "../swapExecution/demoOutcomes";
import { deliveredFromBalances, deliveredFromLanded, deliveredNativeLamports, feeUsdFrom } from "../../server/swapExecution/confirmationStatus";
import { needsFigureBackfill, FIGURE_BACKFILL_ATTEMPTS, FIGURE_BACKFILL_INTERVAL_MS } from "../swapExecution/confirmationPolling";
import { SWAP_CONFIRM_EXPIRED_TITLE, SWAP_CONFIRM_EXPIRED_TOAST, swapConfirmReceivedUnknown } from "../../state/approvedCopy";
import type { ExecutionFailureKey, ExecutionPhase } from "../swapExecution/executionLifecycle";
import { executionReducer, initialExecutionState, isExecutionBusy, isExecutionTerminal, isRenewal, isRestartable, type ExecutionEvent } from "../swapExecution/executionLifecycle";
import { REAL_SWAP_TAKER, REAL_SWAP_TX } from "./realSwapTransactions";
import {
  SWAP_CONFIRM_APPROVE_LABEL,
  SWAP_CONFIRM_CANCEL_LABEL,
  SWAP_CONFIRM_CLOSE_LABEL,
  CONNECT_WALLET_LABEL,
  SWAP_ENTRY_CHECK_AGAIN_LABEL,
  TRIM_ACTION_LABEL,
  TRIM_BLOCKED_REASON,
  TRIM_BLOCKED_REASON_DEFAULT,
  TRIM_SELECT_INTRO,
  TRIM_SELECT_TITLE,
  TRIM_SUMMARY_ALL_TITLE,
  TRIM_SUMMARY_NONE_DESC,
  TRIM_SUMMARY_NONE_TITLE,
  TRIM_SUMMARY_PENDING_NOTE,
  TRIM_SUMMARY_SOME_TITLE,
  trimRunTitle,
  trimSelectCta,
  trimSummaryReceived,
  SWAP_ENTRY_CONNECT_LABEL,
  SWAP_ENTRY_RECONNECT_LABEL,
  SWAP_ENTRY_WALLET_TOOLTIP,
  SWAP_CONFIRM_RETRY_LABEL,
  SWAP_CONFIRM_REVERTED_RETRY_NOTE,
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
    minimumOutputUsd: 14.89,
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
    minimumOutputUsd: 14.89,
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
    // Asks the Boundary, and turns its answer into the entry footer through ONE pure rule.
    //
    // The step opens in exactly two places, and both are behind `deriveSwapEntry` saying
    // "swap": the press itself, and the continuation after an expired comparison was re-run.
    // `swap` requires a wallet that can sign (`walletReady`), so the sheet is still unreachable
    // without one — the section now SAYS so beside a greyed button instead of rendering nothing.
    const opens = (section.match(/setStarted\(true\)/g) ?? []).length;
    return /deriveExecutionOffer/.test(section) && /deriveSwapEntry/.test(section) &&
      opens === 2 &&
      /if \(at\.kind !== "swap"\) return;/.test(section) &&
      /if \(at\.kind === "swap" && !at\.refreshFirst\) setStarted\(true\);/.test(section) &&
      /const walletReady = props\.demo === true \|\| \(takerPublicKey != null && submit != null\);/.test(section);
  })(), "one gated entry point");
  add("SWX-26c: an aged-out ROUTE quote never unmounts a confirm step already in progress", (() => {
    const section = readSrc("src/components/swapExecution/SwapExecutionSection.tsx");
    // Both branches — live and demo — must qualify the offer check with `!started`. The demo
    // preview has the same problem for a different reason: its quote carries a 48s TTL and a
    // preview nobody can act on should not evaporate while it is being read.
    //
    // Both now read the entry footer ONLY while `!started`. After that line the offer and the
    // entry are never consulted again in either branch, so nothing the comparison does can take
    // an open step away.
    const gates = (section.match(/if \(!started\) return entryFooter\(\);/g) ?? []).length;
    const liveFrom = section.lastIndexOf("if (!started) return entryFooter();");
    const afterLiveGate = stripComments(section.slice(liveFrom + 1, section.indexOf("function ContinueFooter")));
    const demoFrom = section.indexOf("if (!started) return entryFooter();");
    const afterDemoGate = stripComments(section.slice(demoFrom + 1, section.indexOf("// THE OFFER GATES ENTRY ONLY")));
    const consulted = /offer\.offered|entry\.kind|deriveSwapEntry/;
    return gates === 2 && liveFrom > demoFrom && !consulted.test(afterLiveGate) && !consulted.test(afterDemoGate);
  })(), "entry gate, not a display gate");
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
  add("SWCC-4: declining and expiring both account for the money", (() => {
    // The WORDS may change — "nothing was sent" and "no transaction was submitted" say the
    // same true thing — but an ending where the swap did not happen may never leave the
    // reader wondering about their funds. That is the rule; the phrasing is not.
    const accountsForFunds = (t: string) => /nothing was sent|no transaction was submitted/i.test(t);
    return accountsForFunds(SWAP_CONFIRM_DECLINED_DESC) &&
      accountsForFunds(SWAP_CONFIRM_EXPIRED) &&
      // A decline is the one the user chose, so it says the stronger thing as well.
      /funds haven\u2019t moved|funds have not moved/i.test(SWAP_CONFIRM_DECLINED_DESC) &&
      // A send that never left says BOTH halves: nothing was submitted, and nothing moved.
      // Which words carry it is not the rule; that the money is accounted for is.
      accountsForFunds(SWAP_CONFIRM_SUBMIT_FAILED_DESC) &&
      /funds haven\u2019t moved|funds have not moved|stayed in your wallet/i.test(SWAP_CONFIRM_SUBMIT_FAILED_DESC);
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
      busyButtonLabelFor("preparing") === SWAP_CONFIRM_CHECKING &&
      busyButtonLabelFor("verifying") === SWAP_CONFIRM_CHECKING &&
      busyButtonLabelFor("signing") === SWAP_CONFIRM_AWAITING_WALLET &&
      busyButtonLabelFor("submitting") === SWAP_CONFIRM_SUBMITTING;
  })(), "no verdict before the act");
  add("SWCC-5c: the primary button slot is filled in EVERY phase before completion", (() => {
    // This is what keeps the footer still. The old status line reserved its own height for the
    // same reason; with the line gone, the guarantee moves to the button always being there —
    // Approve when there is something to approve, a spinner and a word when there is not.
    const beforeCompletion: ExecutionPhase[] = ["preparing", "verifying", "signing", "submitting", "confirming"];
    const everyWaitingPhaseHasAButton = beforeCompletion.every((p2) => busyButtonLabelFor(p2) != null);
    // `ready` is the exception and is covered by the Approve button itself.
    const readyUsesApprove = busyButtonLabelFor("ready") === null;
    const c = readSrc("src/components/swapExecution/SwapConfirmSheet.tsx");
    // And the line really is gone, rather than merely unused.
    return everyWaitingPhaseHasAButton && readyUsesApprove && !/swap-confirm__check/.test(c);
  })(), "footer never empties");
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
  add("SWCC-8: the verification refusal says WE stopped, and ends in Close — no retry, and no door to another venue", (() => {
    const d = SWAP_CONFIRM_VERIFICATION_FAILED_DESC.toLowerCase();
    // WE stopped — not "verification failed", not the provider's fault. The user is owed the
    // actor, because a swap they asked for did not reach their wallet and we are the reason.
    const weStopped = /we stopped/.test(d) && /before requesting your approval/.test(d);
    // And it accounts for the money, like every other ending that did not happen.
    const accountsForFunds = /no transaction was submitted/.test(d);
    // This ending once handed off to the provider's own page, first as a sentence and then as
    // a button. Both are gone on purpose: a transaction that did not match its quote is not
    // something to go and do elsewhere with none of these checks, and it is not something a
    // retry fixes. What is pinned now is the absence — checked where the button used to live.
    const sheet = stripComments(readSrc("src/components/swapExecution/SwapConfirmSheet.tsx"));
    const noDoor = !/Swap on /.test(sheet) && !/handoff/i.test(sheet);
    const noRetry = !offersRetry("verification_failed", false);
    return weStopped && accountsForFunds && noDoor && noRetry;
  })(), "refusal is explicit");
  add("SWCC-9: success copy is a template needing the ACTUAL received amount — it cannot render the estimate by default", (() => {
    // A function, not a constant: there is no way to show the success line without supplying a
    // figure, so "reuse the estimate" has to be a deliberate act rather than the default.
    return typeof swapConfirmReceived === "function" &&
      swapConfirmReceived("71.77", "USDC") === "You received 71.77 USDC." &&
      // The title states completion and nothing about an amount, so it can never stand in
      // for a figure we did not read.
      /completed/i.test(SWAP_CONFIRM_COMPLETE_TITLE) &&
      !/[0-9]/.test(SWAP_CONFIRM_COMPLETE_TITLE);
  })(), "actual amount");
  add("SWCC-10: the copy rules document the confirm step — the strings are not ahead of their rule", (() => {
    const rules = readSrc("../content/ui-copy-rules.md");
    return /## Swap Confirmation Copy/.test(rules) &&
      /in_app_confirm/.test(rules) &&
      /Swap Completed.{0,300}on-chain confirmation/s.test(rules);
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
  add("SWXC-1b: the sheet is NEVER mounted without terms unless it has a failure to show", (() => {
    const c = readSrc("src/components/swapExecution/SwapExecutionSection.tsx");
    // The footer returns for every state with no plan except `failed`, so the only sheet that
    // can open either has terms or has a failure branch that needs none. That is what makes an
    // empty "Checking transaction…" card unreachable rather than merely unlikely — the loading
    // state lives in the Swap button instead.
    const guard = /const awaitingFirstPlan =\s+props\.demo !== true && started && execution\.plan == null && execution\.phase !== "failed";/.test(c);
    const returnsFooter = /if \(!started\) return entryFooter\(\);/.test(c) &&
      /if \(awaitingFirstPlan\) return <ContinueFooter onClose=\{onClose\} busy onContinue=\{onSwap\} label=\{continueLabel\} \/>;/.test(c);
    // And the sheet reads its terms from the plan, so "has a plan" and "has terms" cannot drift.
    const termsFromPlan = /terms=\{execution\.plan\?\.terms \?\? null\}/.test(c);
    return guard && returnsFooter && termsFromPlan;
  })(), "no empty card is reachable");
  add("SWXC-1c: Cancel LEAVES the review; back returns to it — two exits, two answers", (() => {
    const c = readSrc("src/components/swapExecution/SwapExecutionSection.tsx");
    // They answer different questions: "not this swap" and "let me re-read why you suggested
    // it". Wiring Cancel back to the suggestion left no way out of the review from the step.
    const demoCancelCloses = /onCancel=\{onClose\}/.test(c);
    const liveCancelCloses = /execution\.cancel\(\);\s*\n\s*onClose\(\);/.test(c);
    // Back is still the step's own exit, and still only that.
    // Behaviour, not spelling: back returns to the review, so it clears the step and must not
    // close. Pinned to the exact line before, which then broke the moment the handler grew a
    // second statement that changed nothing about the rule.
    const at = c.indexOf("const leaveStep =");
    if (at < 0) return false;
    const leaveStep = c.slice(at, c.indexOf("\n", c.indexOf("}, []);", at)));
    const backReturns = /setStarted\(false\)/.test(leaveStep) && !/onClose\(\)/.test(leaveStep);
    return demoCancelCloses && liveCancelCloses && backReturns;
  })(), "cancel leaves, back returns");
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
  add("SWCS-5b: a REVERTED swap is not told it was never sent", (() => {
    // Both outcomes are `submit_failed`, and they are not the same thing. A revert reached the
    // network, ran, failed, charged a fee and produced a signature the sheet then LINKS TO —
    // so "the swap wasn't sent" sat directly above a link to the transaction that was sent.
    const reverted = failureCopy("submit_failed", true);
    const neverSent = failureCopy("submit_failed", false);
    return reverted != null && neverSent != null &&
      reverted.title !== neverSent.title &&
      !/wasn.t sent/i.test(reverted.title) &&
      // The revert must not borrow the never-sent reassurance: the tokens did not move, but
      // the transaction DID leave, and a fee went with it.
      !/stayed in your wallet|haven\u2019t moved/i.test(reverted.desc) &&
      // It must own up to the fee, which a user checking Solscan will see anyway.
      /network fee/i.test(reverted.desc) &&
      // The wallet-error case is accurate as it stands and must keep saying so.
      /wasn.t sent/i.test(neverSent.title) &&
      /no transaction was submitted/i.test(neverSent.desc) &&
      /haven\u2019t moved|stayed in your wallet/i.test(neverSent.desc);
  })(), "a revert is not a non-send");
  add("SWCS-5c: the sheet decides that from the SIGNATURE, not from failureDetail", (() => {
    const c = readSrc("src/components/swapExecution/SwapConfirmSheet.tsx");
    // `failureDetail` is documented as never rendered; the signature is the honest signal and
    // already decides whether the explorer link shows.
    return /const reachedChain = typeof signature === "string" && signature\.length > 0;/.test(c) &&
      /failureCopy\(failure, reachedChain,/.test(c) &&
      // And the same signal decides the retry, so a transaction that WAS sent is never
      // offered a button that would send it a second time.
      /offersRetry\(failure, reachedChain\)/.test(c) &&
      !/failureDetail/.test(c);
  })(), "signature is the signal");
  add("SWCS-5d: the mark says WHICH kind of ending this is — broken, refused, or about time", (() => {
    // Three marks, and the colour is the message. An outage, a refused verification and a
    // failed send went wrong without the reader choosing them: amber. A decline is the
    // reader's own No, confirmed in danger red the way every wallet confirms a rejected
    // request. An expired quote and a confirmation that outran our deadline are NEITHER —
    // nothing broke in either — so they share one primary clock. Collapse any two of those
    // groups into one colour and the mark stops telling the reader which kind of ending
    // they are looking at.
    const wrong: ExecutionFailureKey[] = ["plan_unavailable", "verification_failed", "submit_failed"];
    const timing: ExecutionFailureKey[] = ["expired", "confirm_timeout"];
    return wrong.every((f) => failureMarkFor(f) === "warning") &&
      timing.every((f) => failureMarkFor(f) === "clock") &&
      failureMarkFor("declined") === "cross" &&
      // `cancelled` never rests on screen, so it has no mark to show.
      failureMarkFor("cancelled") === null && failureMarkFor(null) === null &&
      // The whole point of the split: three distinct kinds, none standing in for another.
      new Set(["expired", "declined", "plan_unavailable"].map((f) =>
        failureMarkFor(f as ExecutionFailureKey))).size === 3;
  })(), "a mark means something, and says which something");
  add("SWCS-5e: both marks are decorative and take SYSTEM colours, not hand-picked ones", (() => {
    const c = readSrc("src/components/swapExecution/SwapConfirmSheet.tsx");
    const css = readSrc("src/styles/dashboard.css");
    const from = css.indexOf(".swap-confirm__alert {");
    const to = css.indexOf("@keyframes swap-confirm-alert-in");
    // Anchor check first: a slice that came back empty or backwards would make every
    // assertion below vacuously true, which is how two earlier fixtures passed while
    // testing nothing.
    if (from < 0 || to <= from) return false;
    const block = css.slice(from, to);
    const warn = block.slice(block.indexOf(".swap-confirm__alert--warning"));
    const exp = block.slice(block.indexOf(".swap-confirm__alert--clock"));
    const dec = block.slice(block.indexOf(".swap-confirm__alert--cross"));
    if (warn.length === 0 || exp.length === 0 || dec.length === 0) return false;
    // The sentence beside it already says what happened, so the icon adds nothing to a screen
    // reader and is hidden from it. Colour and motion come from the tokens.
    return /className=\{`swap-confirm__alert swap-confirm__alert--\$\{mark\}`\} aria-hidden="true"/.test(c) &&
      /--color-feedback-warning-background-solid/.test(warn) &&
      /--color-feedback-warning-background-tint/.test(warn) &&
      // The clock mark is the PRIMARY colour, not the warning one — that is the distinction
      // the kind exists to carry, and it is the one thing a copy-paste of the warning block
      // would silently lose.
      /--color-feedback-info-background-solid/.test(exp) &&
      !/feedback-warning/.test(exp) &&
      // And the decline is the danger colour, which is neither of the other two.
      /--color-feedback-danger-background-solid/.test(dec) &&
      !/feedback-warning|feedback-info/.test(dec) &&
      // One settle each, never a loop: a pulsing mark on a money screen nags rather than informs.
      !/infinite/.test(block) &&
      // The echo is painted. It carried geometry and an animation over nothing for a while,
      // so the comment describing it was the only place it existed.
      /\.swap-confirm__alert::after \{[^}]*background: currentColor/.test(block);
  })(), "system colours, settled once, actually painted");
  add("SWCS-5f: NO ending is offered a second venue — the provider link is gone from the sheet — and a lone button says Close", (() => {
    const sheet = readSrc("src/components/swapExecution/SwapConfirmSheet.tsx");
    const pres = readSrc("src/components/swapExecution/swapConfirmPresentation.ts");
    const section = readSrc("src/components/swapExecution/SwapExecutionSection.tsx");
    // It used to be offered on the endings WE caused ("Swap on Jupiter" under an outage or a
    // refused verification). A swap WealthSmith suggests is approved here or not at all: the
    // sheet takes no handoff, builds no external link, and the rule that gated it is deleted.
    const code = stripComments(sheet);
    // The one external link left in the sheet is the explorer, on a transaction that exists.
    const externals = code.match(/kind: "external-link",\s*label: ([A-Z_]+)/g) ?? [];
    const noLink = !/handoff/i.test(code) && !/Swap on /.test(code) &&
      externals.length === 1 && /SWAP_CONFIRM_VIEW_TRANSACTION/.test(externals[0]);
    const ruleGone = !/offersProviderHandoff/.test(pres) && !/offersProviderHandoff/.test(sheet);
    const notPassed = !/handoff|buildSwapHandoff|providerSwapLinks/.test(stripComments(section));
    const closes = /review-modal__tertiary-action[\s\S]{0,120}SWAP_CONFIRM_CLOSE_LABEL/.test(sheet) &&
      SWAP_CONFIRM_CLOSE_LABEL === "Close" &&
      // "Cancel" keeps its job beside a primary action; this is about the lone button.
      SWAP_CONFIRM_CANCEL_LABEL === "Cancel";
    return noLink && ruleGone && notPassed && closes;
  })(), "no second venue, and a Close that closes");
  add("SWCS-5g: every ending a reader can reach is reviewable, and none is faked into existence", (() => {
    // The four endings that happen AFTER Approve went unreviewed for exactly as long as the
    // review surface could not reach them — it took one failure KEY, and those four are
    // distinguished by phase and signature instead. This holds the catalogue to the union, so
    // adding a reachable ending without a way to walk to it fails here rather than shipping.
    const keys: ExecutionFailureKey[] = [
      "plan_unavailable", "verification_failed", "declined", "expired", "submit_failed", "confirm_timeout",
    ];
    const covered = keys.every((k) => DEMO_OUTCOMES.some((o) => o.outcome.failure === k));
    // `cancelled` is in the union and never rests on screen — cancelling LEAVES the step — so
    // it is the one key with no entry, deliberately.
    const cancelledAbsent = !DEMO_OUTCOMES.some((o) => o.outcome.failure === "cancelled");
    // Both halves of `submit_failed`, which share a key and are different events.
    const bothSubmitFailures =
      DEMO_OUTCOMES.some((o) => o.outcome.failure === "submit_failed" && o.outcome.signature != null) &&
      DEMO_OUTCOMES.some((o) => o.outcome.failure === "submit_failed" && o.outcome.signature == null);
    const successCovered = DEMO_OUTCOMES.some((o) => o.outcome.phase === "confirmed");
    // And no combination the live path cannot produce: a confirmed swap always has a
    // signature, and nothing that was never broadcast may carry one.
    const honest = DEMO_OUTCOMES.every((o) =>
      (o.outcome.phase !== "confirmed" || o.outcome.signature != null) &&
      (o.outcome.phase !== "ready" || o.outcome.signature == null) &&
      (o.outcome.failure !== "declined" || o.outcome.signature == null) &&
      (o.outcome.failure !== "expired" || o.outcome.signature == null) &&
      (o.outcome.failure !== "plan_unavailable" || o.outcome.signature == null) &&
      (o.outcome.failure !== "verification_failed" || o.outcome.signature == null));
    return covered && cancelledAbsent && bothSubmitFailures && successCovered && honest;
  })(), "every ending is walkable");
  add("SWCS-5h: a finished swap is not headed as a review of terms", (() => {
    const c = readSrc("src/components/swapExecution/SwapExecutionSection.tsx");
    const sheet = readSrc("src/components/swapExecution/SwapConfirmSheet.tsx");
    // The step's header is its ONE title. Leaving it at "Review Swap" over a confirmed swap
    // told the reader to go on deciding something that had already happened.
    const titled = /shownPhase === "confirmed" \? SWAP_CONFIRM_COMPLETE_TITLE/.test(c);
    // And the sheet then does not print the same sentence again underneath it.
    const notDoubled = /\{confirmed && !subpage && \(/.test(sheet);
    // The header reads the signature the SHEET reads, so a revert cannot be titled as a swap
    // that was never sent.
    const sameSignal = /failureCopy\(shownFailure, shownSignature != null\)/.test(c);
    return titled && notDoubled && sameSignal;
  })(), "the heading tells the truth about the phase");
  add("SWXD-1: the received figure is the DELIVERED amount, read from the landed transaction", (() => {
    const owner = "Taker11111111111111111111111111111111111111";
    const mint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
    const row = (o: string, m: string, amount: string) => ({ owner: o, mint: m, uiTokenAmount: { amount } });
    // The ordinary case: the taker held none of the output mint and now holds some.
    const fresh = deliveredFromBalances([], [row(owner, mint, "30606060750")], owner, mint);
    // And the case that actually happens — they already held some, so only the DELTA arrived.
    const topUp = deliveredFromBalances(
      [row(owner, mint, "1000000")],
      [row(owner, mint, "30607060750")],
      owner, mint,
    );
    return fresh === "30606060750" && topUp === "30606060750";
  })(), "the delta, not the balance");
  add("SWXD-2: a reading that is not clearly positive yields NO figure rather than a wrong one", (() => {
    const owner = "Taker11111111111111111111111111111111111111";
    const other = "Someone1se11111111111111111111111111111111";
    const mint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
    const row = (o: string, m: string, amount: string) => ({ owner: o, mint: m, uiTokenAmount: { amount } });
    // Somebody else's balance is not the taker's.
    const wrongOwner = deliveredFromBalances([], [row(other, mint, "500")], owner, mint);
    // A balance that did not grow means the records are not what we assumed — the wrong
    // account, a mint that is also an input, a route that settled elsewhere. We do not know.
    const wentDown = deliveredFromBalances([row(owner, mint, "900")], [row(owner, mint, "100")], owner, mint);
    const unchanged = deliveredFromBalances([row(owner, mint, "900")], [row(owner, mint, "900")], owner, mint);
    // And a figure that is not an integer string is not a figure.
    const garbage = deliveredFromBalances([], [row(owner, mint, "30.6e9")], owner, mint);
    return wrongOwner == null && wentDown == null && unchanged == null && garbage == null;
  })(), "null beats a wrong number");
  add("SWXD-3: BigInt throughout — the arithmetic does not lose base units at scale", (() => {
    const owner = "T", mint = "M";
    const row = (amount: string) => ({ owner, mint, uiTokenAmount: { amount } });
    // Above 2^53 a double can only hold even integers, so an odd post-balance is silently
    // rounded before the subtraction and the answer comes out one base unit wrong. USDC
    // reaches this many base units at ~9 billion dollars and lamports at ~9 million SOL, so
    // it is not hypothetical for a treasury — and being wrong by any amount on the one
    // number this screen exists to state is the kind of error nobody can audit from the UI.
    const huge = deliveredFromBalances([row("1")], [row("9007199254740995")], owner, mint);
    // A float implementation yields ...995 here. BigInt yields ...994, which is correct.
    return huge === "9007199254740994";
  })(), "no float on the money path");
  add("SWXD-4: the delivered figure travels WITH the confirmation, in one event", (() => {
    // Two reads would leave a window where the screen says a swap completed and the amount is
    // still loading — and the amount is the whole reason anyone is on that screen.
    const confirmed = decideFromConfirmation({ ok: true, state: "confirmed", deliveredRaw: "30606060750" });
    if (confirmed.action !== "stop") return false;
    const event = confirmed.events[0];
    if (event.type !== "confirmed" || event.deliveredRaw !== "30606060750") return false;
    // And the machine keeps it, so the view never has to ask again.
    const state = executionReducer(
      { ...initialExecutionState, phase: "confirming", signature: "sig" },
      event,
    );
    // A confirmation with no figure stays a confirmation: the swap landed either way, and an
    // unreadable amount may not cost the user the outcome.
    const without = decideFromConfirmation({ ok: true, state: "confirmed" });
    const withoutOk = without.action === "stop" && without.events[0]?.type === "confirmed";
    return state.phase === "confirmed" && state.deliveredRaw === "30606060750" && withoutOk;
  })(), "one read, one outcome");
  add("SWXD-5: the settled figure is rounded for READING and never to nothing", (() => {
    // Two decimals from a thousand up, four below: past that the digits stop carrying
    // information — four decimals of a thousand-unit balance is a millionth of a percent.
    const bigOne = formatSettledAmount("30606.06075");
    const smallOne = formatSettledAmount("204.183333333");
    // A balance that rounded away would STATE that nothing arrived, which is a different
    // claim from "a very small amount arrived".
    const tiny = formatSettledAmount("0.00000123");
    return bigOne === "30,606.06" && smallOne === "204.1833" &&
      tiny != null && !/^0\.0*$/.test(tiny) && Number(tiny.replace(/,/g, "")) > 0 &&
      displayDecimalsFor(1000) === 2 && displayDecimalsFor(999) === 4 &&
      // Grouped, because an ungrouped five-figure balance is read wrong at a glance.
      bigOne.includes(",");
  })(), "readable, and still true");
  add("SWXD-6: base units convert with the PLAN's own decimals, with no float in between", (() => {
    // The same decimals the verification was checked against, so the figure shown and the
    // figure guaranteed cannot be denominated differently.
    return rawToTokenString("30606060750", 6) === "30606.06075" &&
      rawToTokenString("204183333333", 9) === "204.183333333" &&
      // Trailing zeros are not precision.
      rawToTokenString("1500000", 6) === "1.5" &&
      rawToTokenString("1000000", 6) === "1" &&
      // Nonsense in, nothing out.
      rawToTokenString("1.5", 6) == null && rawToTokenString("100", -1) == null;
  })(), "exact conversion");
  add("SWXD-7: a settled swap shows what arrived, or says it cannot — never the estimate", (() => {
    const sheet = readSrc("src/components/swapExecution/SwapConfirmSheet.tsx");
    const section = readSrc("src/components/swapExecution/SwapExecutionSection.tsx");
    const from = sheet.indexOf('if (phase === "confirmed" && terms) {');
    const to = sheet.indexOf("const failed = failureCopy(");
    if (from < 0 || to <= from) return false;
    const branch = sheet.slice(from, to);
    // The figure comes from the prop, which the live path fills from the CHAIN read.
    const fromDelivered = /receivedTokens \? formatSettledAmount\(receivedTokens\) : null/.test(branch);
    // The CONDITION, not merely a mention: the figure is shown when the chain read produced
    // one, and the ternary is what decides that. A looser test passed while the guard had
    // been short-circuited to `false` and the identifier survived in the dead branch.
    const liveUsesChain = /execution\.deliveredRaw != null && execution\.plan != null/.test(section) &&
      /rawToTokenString\(execution\.deliveredRaw, execution\.plan\.verification\.outputDecimals\)/.test(section);
    // And nowhere in that branch does the expected output stand in for it.
    const noEstimate = !/expectedOutput/.test(branch);
    // No figure means no label hanging over an empty space.
    // No figure means no label standing over an empty space — and the sentence names the
    // token we could not count rather than saying "the exact amount".
    const honestFallback = /swapConfirmReceivedUnknown\(terms\.outputSymbol\)/.test(branch) &&
      /exact \$\{symbol\} amount received/.test(readSrc("src/state/approvedCopy.ts")) &&
      // It leads with the OUTCOME, so a reader meeting a screen without its number is not
      // left wondering whether the missing figure means a missing swap.
      /^Your swap succeeded\./.test(swapConfirmReceivedUnknown("USDC")) &&
      // The swapped line is NOT part of the figure: it comes from the terms, which we have
      // either way, and it survives when the chain read does not.
      /\{swapped && \(/.test(branch) &&
      branch.indexOf("swapConfirmSwapped") > branch.indexOf("swapConfirmReceivedUnknown");
    // Done and the explorer, not a Cancel for something already finished.
    const footer = /SWAP_CONFIRM_DONE_LABEL/.test(branch) && /SWAP_CONFIRM_VIEW_TRANSACTION/.test(branch) &&
      !/SWAP_CONFIRM_CANCEL_LABEL/.test(branch);
    return fromDelivered && liveUsesChain && noEstimate && honestFallback && footer;
  })(), "the chain's number or none");
  add("SWCS-5i: Try Again is offered where retrying is the remedy, and a costly retry says so", (() => {
    const sheet = readSrc("src/components/swapExecution/SwapConfirmSheet.tsx");
    // BOTH halves of `submit_failed`, for different reasons. A send that never left cost
    // nothing and the terms were fine. A revert reached the chain and took a fee, so a retry
    // can cost again — and the answer to that is disclosure, not removing the button:
    // somebody whose swap reverted still wants the swap, and would otherwise go and retry it
    // somewhere with no warning at all.
    const both = offersRetry("submit_failed", false) && offersRetry("submit_failed", true);
    // And a quote we could not LOAD: nothing was built, shown or sent, so asking again risks
    // nothing — and with the provider link gone it is the only remedy that screen has.
    const unprepared = offersRetry("plan_unavailable", false);
    const nowhereElse =
      (["verification_failed", "declined", "expired", "confirm_timeout", "cancelled"] as ExecutionFailureKey[])
        .every((f) => !offersRetry(f, false) && !offersRetry(f, true)) && !offersRetry(null, false);
    // Wired, and FIRST among the footers — nothing ahead of it can claim these endings.
    const retryIndex = sheet.indexOf("offersRetry(failure, reachedChain) ?");
    const expiredIndex = sheet.indexOf('failure === "expired" ?');
    const ordered = retryIndex > 0 && expiredIndex > retryIndex && unprepared;
    const labelled = /label: SWAP_CONFIRM_RETRY_LABEL, onClick: onRefresh/.test(sheet) &&
      SWAP_CONFIRM_RETRY_LABEL === "Try Again";
    // The never-sent screen asks for a retry and now has one.
    const promiseKept = /please try again/i.test(SWAP_CONFIRM_SUBMIT_FAILED_DESC);
    // And the costly one warns before the reader presses it. A screen that has just said
    // they paid for nothing may not offer a button without saying it could happen again.
    const warned = /network fee/i.test(SWAP_CONFIRM_REVERTED_RETRY_NOTE) &&
      /may/i.test(SWAP_CONFIRM_REVERTED_RETRY_NOTE) &&
      failureCopy("submit_failed", true)?.note === SWAP_CONFIRM_REVERTED_RETRY_NOTE &&
      // The never-sent screen has no such warning, because its retry is free.
      failureCopy("submit_failed", false)?.note == null;
    return both && nowhereElse && ordered && labelled && promiseKept && warned;
  })(), "a retry where retrying is the answer, priced honestly");
  add("SWCS-5j: the fee a revert reports is the one the chain took, never the quote's estimate", (() => {
    // "Was charged" is a statement about something that already happened. The disclosed
    // constant on the terms is a conservative guess made beforehand — a different claim
    // about a different moment, and not usable in the past tense.
    const withFee = failureCopy("submit_failed", true, { sol: "0.000075", usd: "\u2248$0.01" });
    const noUsd = failureCopy("submit_failed", true, { sol: "0.000075", usd: null });
    const unread = failureCopy("submit_failed", true, null);
    if (withFee == null || noUsd == null || unread == null) return null === "unreachable";
    // ONE mark per figure, and it travels WITH the figure: `formatFeeUsd` returns "≈$0.02" or
    // "<$0.01" and the sentence adds nothing. Two layers each adding their own once rendered
    // "(≈~$0.01)".
    const sheet = readSrc("src/components/swapExecution/SwapConfirmSheet.tsx");
    const oneMark = /usd: formatFeeUsd\(fee\.usd\)/.test(sheet) && !/formatApproxUsd\(fee\.usd\)/.test(sheet);
    return oneMark &&
      /0\.000075 SOL \(\u2248\$0\.01\)/.test(withFee.desc) && !/~/.test(withFee.desc) &&
      // Without a price, the amount still stands on its own.
      /0\.000075 SOL/.test(noUsd.desc) && !/\$/.test(noUsd.desc) &&
      // Unread: the FACT survives, the figure does not. Naming a fee we did not read would
      // be wrong; omitting that one was taken would be incomplete.
      /network fee was charged/i.test(unread.desc) && !/[0-9]/.test(unread.desc) &&
      // And none of them claims the tokens moved.
      [withFee, noUsd, unread].every((c) => /weren\u2019t swapped|were not swapped/i.test(c.desc));
  })(), "the charge that happened");
  add("SWXD-8: the fee is READ for a revert, and the live screen takes it from that read", (() => {
    const server = readSrc("src/server/swapExecution/confirmationStatus.ts");
    const section = readSrc("src/components/swapExecution/SwapExecutionSection.tsx");
    if (server.length === 0 || section.length === 0) return false;
    // A revert is the whole reason the fee is read at all: it moved no tokens and still cost
    // money. Gating the read on `confirmed` — the obvious thing to write, since that is where
    // the delivered amount comes from — would leave the revert screen with no figure, which
    // is precisely the screen whose honesty depends on having one.
    const readsBothLanded = /if \(state === "pending" \|\| rpc\.getLandedFacts == null\) return \{ state, \.\.\.empty \};/.test(server);
    // The delivery lookup stays confirmed-only; a revert has no delta to find.
    const deliveryStillConfirmedOnly = /delivery: state === "confirmed" \? delivery \?\? null : null/.test(server);
    // And the screen takes the figure from that read. The quote's disclosed constant is a
    // conservative estimate made beforehand and cannot follow "was charged" — a fallback to
    // it would render a plausible wrong number that nobody could spot from the UI.
    const fromChain = /execution\.feeLamports != null\s*\?\s*\{ lamports: execution\.feeLamports, usd: execution\.feeUsd \}/.test(section);
    const noEstimateFallback = !/fee=\{[\s\S]{0,200}estimatedNetworkFeeUsd/.test(section);
    return readsBothLanded && deliveryStillConfirmedOnly && fromChain && noEstimateFallback;
  })(), "the fee comes from the transaction");
  add("SWXD-9: lamports price into USD only when both halves are real", (() => {
    // 75,000 lamports at $184/SOL is 1.38 cents — the order of magnitude a Jupiter swap
    // actually pays, and small enough that a double is not a risk here, unlike a balance.
    const priced = feeUsdFrom("75000", 184);
    return priced != null && Math.abs(priced - 0.0138) < 0.0001 &&
      // No price, no dollars. The SOL figure still stands on its own.
      feeUsdFrom("75000", null) === null &&
      feeUsdFrom("75000", 0) === null &&
      feeUsdFrom("75000", Number.NaN) === null &&
      // No fee, nothing to price.
      feeUsdFrom(null, 184) === null &&
      feeUsdFrom("not-a-number", 184) === null;
  })(), "priced or omitted");
  add("SWCS-5k: the paths that only appear when a chain read FAILS are reviewable too", (() => {
    // These render exactly when the backend is already having a bad day — the RPC is down,
    // the transaction has been pruned — which is the worst possible moment to discover the
    // copy reads badly. Unreviewable until now, because nothing in the walkthrough could
    // produce them.
    const unreadable = DEMO_OUTCOMES.filter((o) => o.outcome.chainReadFailed);
    const settled = unreadable.find((o) => o.outcome.phase === "confirmed");
    const reverted = unreadable.find((o) => o.outcome.failure === "submit_failed");
    if (settled == null || reverted == null) return false;
    // ONE flag for both figures, because in production there is one cause: a single
    // getTransaction yields the delivered amount and the fee together. Separate switches
    // would let a reviewer approve a screen the live path cannot produce.
    const section = readSrc("src/components/swapExecution/SwapExecutionSection.tsx");
    const suppressesAmount = /activeOutcome\?\.phase === "confirmed" && !activeOutcome\.chainReadFailed/.test(section);
    const suppressesFee = /activeOutcome\?\.feeLamports != null && !activeOutcome\.chainReadFailed/.test(section);
    // The OUTCOME is unaffected — only the figures are missing. A swap that confirmed still
    // confirmed, and still has a signature to look up.
    return suppressesAmount && suppressesFee &&
      settled.outcome.signature != null && reverted.outcome.signature != null;
  })(), "the bad-day screens are walkable");
  add("SWDM-6: the walkthrough's give-up is a REVIEW short-circuit and changes no real behaviour", (() => {
    const section = readSrc("src/components/swapExecution/SwapExecutionSection.tsx");
    const hook = readSrc("src/components/swapExecution/useSwapExecutionPlan.ts");
    // Demo Mode has no expiry and therefore no renewals, so the one ending that needs
    // several of them — the quote giving up and closing the review — could never be shown.
    // The toast's copy was the only surface nobody had ever seen.
    const entry = DEMO_OUTCOMES.find((o) => o.outcome.gaveUp);
    // Gated on Demo Mode, like every other demo affordance.
    const gated = /const demoGaveUp = props\.demo && started && \(activeOutcome\?\.gaveUp \?\? false\);/.test(section);
    // And the REAL ending is untouched: it is still decided inside the hook, from actual
    // expiries and renewals, and reported upward rather than triggered from the view.
    const liveUnchanged = /onGaveUp: props\.onExpiredGiveUp/.test(section) &&
      /opts\.onGaveUp\?\.\(\)/.test(hook) &&
      // Nothing in the hook knows this flag exists.
      !/gaveUp\b/.test(hook.replace(/onGaveUp/g, ""));
    return entry != null && gated && liveUnchanged;
  })(), "a review affordance, not a behaviour change");
  add("SWCS-5m: the confirm step SCROLLS, and its actions do not scroll away", (() => {
    const css = readSrc("src/styles/dashboard.css");
    const from = css.indexOf(".review-modal > .swap-confirm {");
    if (from < 0) return false;
    const block = css.slice(from, from + 1200);
    // The step is a DIRECT child of the modal, because the review's own body is hidden
    // behind it — and that body was the only scroll container in there. So anything taller
    // than the modal's max-height was clipped with no way to reach it: on the terms screen
    // that meant Cancel and Approve simply vanished, which is the one screen where a
    // missing button is unacceptable. Reported after a Try Again, which lands back on the
    // tallest state of all.
    const scrolls = /overflow-y: auto;/.test(block) &&
      // The load-bearing half. A flex item's default minimum is its content, so without
      // this the section refuses to shrink, the modal's max-height has nothing to push
      // against, and overflow-y never engages. Same pair the review's own body uses.
      /min-height: 0;/.test(block);
    const pinned = /\.review-modal > \.swap-confirm > \.review-modal__footer \{[\s\S]{0,400}position: sticky;/.test(css) &&
      // Opaque, or the terms show through as they pass underneath.
      /\.review-modal > \.swap-confirm > \.review-modal__footer \{[\s\S]{0,400}background: var\(--color-surface-card\)/.test(css);
    // The modal still clips at its own edge; only the step inside it scrolls.
    const modalBlock = css.slice(css.indexOf(".review-modal {"), css.indexOf(".review-modal__heading"));
    return scrolls && pinned && /max-height:/.test(modalBlock) && /overflow: hidden;/.test(modalBlock);
  })(), "reachable terms, reachable buttons");
  add("SWXD-10: a landed swap whose FIGURES are not readable yet gets them later, not never", (() => {
    // Observed in production, 2026-11-25: `getSignatureStatuses` reports a transaction as
    // landed seconds before `getTransaction` can return it. A freshly landed Jupiter swap
    // read as fee=null for over five seconds, then returned 5703 lamports matching the chain
    // exactly. Our poll asks at precisely the worst instant — the first terminal read — and
    // then stops, so without this the success screen would routinely say "we couldn't load
    // the exact amount" about a swap whose amount was available one second later.
    const missing = needsFigureBackfill({ ok: true, state: "confirmed", feeLamports: null, deliveredRaw: null });
    const revertMissing = needsFigureBackfill({ ok: true, state: "failed", feeLamports: null });
    // Keyed on the FEE, which both landed states have whenever the transaction was readable.
    // Keying on deliveredRaw would send every revert chasing a figure that does not exist.
    const revertWithFee = needsFigureBackfill({ ok: true, state: "failed", feeLamports: "5703", deliveredRaw: null });
    const settled = needsFigureBackfill({ ok: true, state: "confirmed", feeLamports: "5000", deliveredRaw: "1" });
    const stillFlying = needsFigureBackfill({ ok: true, state: "pending", feeLamports: null });
    const unreachable = needsFigureBackfill({ ok: false });
    return missing && revertMissing && !revertWithFee && !settled && !stillFlying && !unreachable &&
      FIGURE_BACKFILL_ATTEMPTS >= 3 && FIGURE_BACKFILL_INTERVAL_MS >= 1000;
  })(), "late numbers, not no numbers");
  add("SWXD-11: a late figure can fill a gap and NOTHING else", (() => {
    // The outcome was decided by the chain and is not up for revision. A backfill may only
    // fill a field that is still null — so an out-of-order or failed attempt is harmless,
    // and a later null can never erase a number already on screen.
    const confirmed = executionReducer(
      { ...initialExecutionState, phase: "confirmed", signature: "sig", deliveredRaw: null, feeLamports: null },
      { type: "figures", deliveredRaw: "30606060750", feeLamports: "5703", feeUsd: 0.00038 },
    );
    const filled = confirmed.phase === "confirmed" && confirmed.signature === "sig" &&
      confirmed.deliveredRaw === "30606060750" && confirmed.feeLamports === "5703";
    // A second answer that knows less may not undo the first.
    const notErased = executionReducer(confirmed, { type: "figures", deliveredRaw: null, feeLamports: null }).deliveredRaw === "30606060750";
    // It cannot resurrect or re-decide a flow: a settled failure keeps its failure, and a
    // phase that never landed accepts nothing at all.
    const reverted = executionReducer(
      { ...initialExecutionState, phase: "failed", failure: "submit_failed", signature: "sig" },
      { type: "figures", feeLamports: "5703" },
    );
    const keepsFailure = reverted.phase === "failed" && reverted.failure === "submit_failed" &&
      reverted.feeLamports === "5703";
    const ignoredMidFlight = executionReducer(
      { ...initialExecutionState, phase: "confirming", signature: "sig" },
      { type: "figures", feeLamports: "5703" },
    ).feeLamports == null;
    return filled && notErased && keepsFailure && ignoredMidFlight;
  })(), "fills a gap, revises nothing");
  add("SWXD-12: the backfill is wired, bounded, and cannot delay the outcome", (() => {
    const hook = readSrc("src/components/swapExecution/useSwapExecutionPlan.ts");
    // The outcome is dispatched BEFORE the backfill is considered, so a slow or dead chain
    // read can never hold up telling someone their swap landed.
    const outcomeFirst = /for \(const event of decision\.events\) dispatch\(event\);[\s\S]{0,900}if \(needsFigureBackfill\(result\)\) void backfill\(\);/.test(hook);
    const bounded = /attempt < FIGURE_BACKFILL_ATTEMPTS/.test(hook);
    // The only event it can produce. It must not be able to re-dispatch an outcome.
    const figuresOnly = /dispatch\(\{\s*type: "figures"/.test(hook);
    // Same account and mint as the poll that preceded it — asking about a different one
    // would read a stranger's balance delta into this user's success screen.
    const sameTarget = (hook.match(/delivery: deliveryRef\.current/g) ?? []).length === 2;
    // And it stops when the component goes away, rather than firing into a dead reducer.
    const cleanedUp = /cancelled = true;/.test(hook) && /clearTimeout\(backfillTimer\)/.test(hook);
    return outcomeFirst && bounded && figuresOnly && sameTarget && cleanedUp;
  })(), "chases numbers, never the outcome");
  add("SWXD-13: the landed read accepts transaction versions it has never heard of", (() => {
    const src = readSrc("src/server/swapExecution/confirmationStatus.ts");
    if (src.length === 0) return false;
    // Measured against live Jupiter swaps, 2026-11-26: with maxSupportedTransactionVersion
    // at 0, every v0 transaction returned its fee and every v1 returned nothing. The node
    // rejects anything newer than the version the caller claims to understand (-32015), the
    // error is caught, and the figures come back null — so the success screen says it could
    // not read an amount that is sitting right there. Perfect correlation, six for six.
    const futureProof = /MAX_SUPPORTED_TRANSACTION_VERSION = (\d+)/.exec(src);
    if (futureProof == null || Number(futureProof[1]) < 2) return false;
    const used = new RegExp(`maxSupportedTransactionVersion: MAX_SUPPORTED_TRANSACTION_VERSION`).test(src);
    // Zero must not survive anywhere in this file, in any spelling.
    const noZero = !/maxSupportedTransactionVersion:\s*0/.test(src);
    // And the read goes over raw JSON-RPC rather than through web3.js, whose return type
    // deserializes the message and therefore understands only the versions it shipped with:
    // a node that served the transaction happily would still be refused in our own process.
    const rawRead = /method: "getTransaction"/.test(src) && /JSON\.stringify\(\{/.test(src) &&
      !/connection\.getTransaction/.test(src);
    // We read what the node PRINTED — meta, and the account keys as plain strings — so
    // nothing in the path deserializes a message.
    // (Checked on comment-stripped source: the prose above the function explains at length
    // why nothing is deserialized, and would otherwise trip the very scan that enforces it.)
    const metaOnly = /body\?\.result\?\.meta/.test(src) &&
      !/VersionedMessage|Message\.from|deserialize/.test(stripComments(src));
    return used && noZero && rawRead && metaOnly;
  })(), "a version we do not know is not a figure we cannot read");
  add("SWXD-14: a fee under a cent is never printed as zero dollars", (() => {
    // Real Solana fees are a fraction of a cent: the swaps measured on 2026-11-26 paid $0.0013
    // to $0.0035. A two-decimal format renders every one as "$0.00", and on the screen that
    // tells someone a fee WAS charged, "(≈$0.00)" says nothing was — contradicting its own
    // sentence. The walkthrough's sample fee had been a tidy $0.0138, which is how this hid.
    const measured = [0.001345, 0.00349, 0.000379].map((v) => formatFeeUsd(v));
    const neverZero = measured.every((t) => t === "<$0.01");
    // From a cent up it is approximate and says so, with exactly one mark.
    const larger = formatFeeUsd(0.0234) === "\u2248$0.02" && formatFeeUsd(1.5) === "\u2248$1.50";
    // No price, no dollars — and a zero or negative "fee" is not a figure at all.
    const absent = formatFeeUsd(null) === null && formatFeeUsd(0) === null && formatFeeUsd(Number.NaN) === null;
    // And the whole sentence, as production will actually render it.
    const sentence = failureCopy("submit_failed", true, { sol: "0.000019", usd: formatFeeUsd(0.001345) })?.desc ?? "";
    return neverZero && larger && absent &&
      /A network fee of 0\.000019 SOL \(<\$0\.01\) was charged\./.test(sentence) && !/\$0\.00/.test(sentence);
  })(), "a charge that reads as a charge");
  add("SWXD-15: a swap INTO SOL reports what arrived, from lamports", (() => {
    const owner = "Taker11111111111111111111111111111111111111";
    const other = "Someone1se11111111111111111111111111111111";
    const WSOL_MINT = "So11111111111111111111111111111111111111112";
    const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
    // The shape production returned for a real swap on 2026-11-26: 0.32 SOL arrived, and the
    // payer has NO wrapped-SOL row — the route pays into a temporary account that is created
    // and closed inside the transaction. The token-balance read returned null, which would
    // have told every user swapping into SOL that we could not see what they received.
    const tx = {
      fee: 49303,
      accountKeys: [owner, other],
      preBalances: [1_000_000_000, 5],
      postBalances: [1_000_000_000 + 320654798, 5],
      preTokenBalances: [{ owner, mint: USDC_MINT, uiTokenAmount: { amount: "50000000" } }],
      postTokenBalances: [{ owner, mint: USDC_MINT, uiTokenAmount: { amount: "0" } }],
    };
    // Lamport delta PLUS the fee: the taker pays the fee from the balance the swap pays into,
    // and this is the same rule `verifyMeasuredValue` applied to the promise before signing.
    const native = deliveredFromLanded(tx, owner, WSOL_MINT) === String(320654798 + 49303);
    // Not the fee payer: their balance never fell by the fee, so nothing is added back.
    const notPayer = deliveredNativeLamports({ ...tx, accountKeys: [other, owner], preBalances: [9, 100], postBalances: [9, 400] }, owner) === "300";
    // A token output is untouched by any of this.
    const tokenStillToken = deliveredFromLanded(
      { ...tx, postTokenBalances: [{ owner, mint: USDC_MINT, uiTokenAmount: { amount: "50000700" } }] }, owner, USDC_MINT) === "700";
    // Somebody who is not in the transaction is not somebody it can speak for.
    const stranger = deliveredNativeLamports(tx, "Nobody1111111111111111111111111111111111111") === null;
    // A balance that did not grow, a missing fee for the payer, or a number past 2^53 that
    // lost precision in transit: no figure, never a guess.
    const wentDown = deliveredNativeLamports({ ...tx, postBalances: [900_000_000, 5] }, owner) === null;
    const noFee = deliveredNativeLamports({ ...tx, fee: null }, owner) === null;
    const unsafe = deliveredNativeLamports({ ...tx, postBalances: [2 ** 53 + 2, 5] }, owner) === null;
    return native && notPayer && tokenStillToken && stranger && wentDown && noFee && unsafe;
  })(), "SOL arrives as lamports, and is read as lamports");
  add("SWXD-16: every account the owner holds for a mint counts toward the delivery", (() => {
    const owner = "T", mint = "M";
    const row = (amount: string) => ({ owner, mint, uiTokenAmount: { amount } });
    // A wallet can hold several accounts for one mint and a route may pay into any of them.
    // Taking the first row reported 0 here — the delivery landed in the second.
    const second = deliveredFromBalances([row("100"), row("0")], [row("100"), row("750")], owner, mint) === "750";
    // A PRE row that exists but cannot be read is not a zero: treating it as one would report
    // the whole post-balance as the delivery.
    const unreadablePre = deliveredFromBalances([{ owner, mint, uiTokenAmount: { amount: "1e9" } }], [row("5000")], owner, mint) === null;
    // No pre row at all remains a legitimate zero — the account was created by this swap.
    const created = deliveredFromBalances([], [row("5000")], owner, mint) === "5000";
    return second && unreadablePre && created;
  })(), "the owner's total, not their first account");
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
  add("SWCS-8b: the unavailable Approve is DEMO-ONLY — a real wallet always gets a real button", (() => {
    const sheet = readSrc("src/components/swapExecution/SwapConfirmSheet.tsx");
    const section = readSrc("src/components/swapExecution/SwapExecutionSection.tsx");
    // The two Approves are mutually exclusive by construction: one requires `demo`, the
    // other requires `!demo`. There is no window in which a connected wallet is shown the
    // greyed-out button with "Demo Mode uses a sample portfolio" under it, and no window in
    // which Demo Mode is shown a pressable one.
    const demoOnly = /\{ready && demo && \(/.test(sheet) && /\{ready && !demo && onApprove && \(/.test(sheet);
    const tipIsDemoOnly = (() => {
      const from = sheet.indexOf("{ready && demo && (");
      const to = sheet.indexOf("{ready && !demo && onApprove && (");
      if (from < 0 || to <= from) return false;
      const branch = sheet.slice(from, to);
      return /SWAP_CONFIRM_DEMO_DISABLED/.test(branch) && !sheet.slice(to).includes("SWAP_CONFIRM_DEMO_DISABLED");
    })();
    // And the LIVE branch always has a handler to give it: the step cannot open without a
    // taker and a submitter (`walletReady`), so `onApprove` is never absent on a sheet a real
    // user sees.
    const liveAlwaysWired = /const walletReady = props\.demo === true \|\| \(takerPublicKey != null && submit != null\);/.test(section) &&
      /onApprove=\{execution\.approve\}/.test(section) &&
      // The demo branch passes no approver at all, so even its exception cannot execute.
      (() => {
        const demoBranch = section.slice(section.indexOf("if (props.demo) {"), section.indexOf("// THE OFFER GATES ENTRY ONLY"));
        return demoBranch.length > 0 && !/onApprove/.test(demoBranch);
      })();
    return demoOnly && tipIsDemoOnly && liveAlwaysWired;
  })(), "demo explains, live acts");
  add("SWQR-8: the give-up toast names the ending, and the screen is not left silent", (() => {
    const walkthrough = readSrc("src/pages/SwapWalkthroughPage.tsx");
    const dashboard = readSrc("src/pages/DashboardPage.tsx");
    // One line. A toast is a notification, not a screen: it says which thing just happened
    // and gets out of the way. The explanation — nothing submitted, open the suggestion
    // again — belongs on the card, which is one click away and states it in full.
    const oneLine = SWAP_CONFIRM_EXPIRED_TOAST === "Swap Quote Expired" &&
      !/\./.test(SWAP_CONFIRM_EXPIRED_TOAST) &&
      // It must not point at a Refresh button: by this point there is none to press.
      !/refresh/i.test(SWAP_CONFIRM_EXPIRED_TOAST);
    // Recognisably the same ending as the card, which keeps the fuller wording. The toast
    // may be SHORTER — it drops the "Your" — so the rule is the shared name, not an
    // identical string.
    const sameEnding = SWAP_CONFIRM_EXPIRED_TITLE.includes(SWAP_CONFIRM_EXPIRED_TOAST);
    // And the review closing itself is never silent: every caller raises it.
    const raised = /pushToast\(SWAP_CONFIRM_EXPIRED_TOAST\)/.test(walkthrough) &&
      /pushToast\(SWAP_CONFIRM_EXPIRED_TOAST\)/.test(dashboard);
    return oneLine && sameEnding && raised;
  })(), "closing is not silent");
  add("SWQR-8b: a toast dismisses ITSELF — no caller can forget the timer", (() => {
    const host = readSrc("src/components/ToastHost.tsx");
    const walkthrough = readSrc("src/pages/SwapWalkthroughPage.tsx");
    if (host.length === 0) return false;
    // The timer used to belong to each caller, and a caller forgot: the walkthrough's own
    // pushToast had no setTimeout, so its toast sat on screen indefinitely. "Every caller
    // must remember" is not a guarantee; owning it in the component is.
    const ownsTimer = /window\.setTimeout\(/.test(host) && /dismiss\.current\(t\.id\)/.test(host) &&
      /TOAST_DURATION_MS = 6000/.test(host);
    // Cleared on early dismissal and on unmount, so a timer never fires against an id that
    // is gone, and a closed page leaves none running.
    const cleansUp = (host.match(/clearTimeout/g) ?? []).length >= 2;
    // And the component says so, rather than the old docstring telling callers to do it.
    const documented = /auto-dismissed HERE/.test(host) && !/auto-dismissed by the caller/.test(host);
    // The caller that had the bug still does not set its own timer — the fix is in one place.
    const callerStaysSimple = !/setTimeout/.test(walkthrough);
    return ownsTimer && cleansUp && documented && callerStaysSimple;
  })(), "a toast that leaves");
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
  add("SWDM-1b: a demo failure is GATED on Demo Mode — it can never alter a real outcome", (() => {
    const c = readSrc("src/components/swapExecution/SwapExecutionSection.tsx");
    // `demoOutcome` exists so the walkthrough can be driven to each ending rather than only
    // the one that works. Checked as a gate rather than by where the identifier appears: it is
    // read once at the top now, and a location test would have passed while the value leaked.
    const gated = /const activeOutcome = props\.demo \? demoChosen : null;/.test(c);
    // And a live flow's failure still comes only from what actually happened.
    const liveFromMachine = /const liveFailure = props\.demo \? null : execution\.failure;/.test(c);
    return gated && liveFromMachine;
  })(), "demo-only outcome");
  add("SWDM-1c: the expired demo offers the Refresh its own copy promises", (() => {
    const c = readSrc("src/components/swapExecution/SwapExecutionSection.tsx");
    // "Nothing was sent. Refresh to get current terms." sat above no such button, because the
    // demo branch passed no handler. Copy that names a control the screen does not have is
    // the same class of untruth as a figure that is wrong.
    const demoBranch = c.slice(c.indexOf("if (props.demo) {"), c.indexOf("// The Boundary said no"));
    return /onRefresh=\{\(\) => setDemoRefreshed\(true\)\}/.test(demoBranch);
  })(), "refresh exists where promised");
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
  add("SWCU-4: the minimum's TOKEN figure is never marked approximate; only its dollar value is", (() => {
    const c = readSrc("src/components/swapExecution/SwapConfirmSheet.tsx");
    const start = c.indexOf("swap-confirm__metric--minimum");
    const end = start < 0 ? -1 : c.indexOf("SWAP_CONFIRM_PRICE_IMPACT_LABEL", start);
    if (start < 0 || end <= start) return false;
    const block = c.slice(start, end);
    // The guarantee is in TOKENS and that figure stays exact — rendered raw, no tilde
    // formatter anywhere near it. The USD underneath is a conversion and needs a price, so it
    // is marked like every other estimate. Marking the token amount instead would undo the
    // only promise this sheet makes.
    return /formatTokens\(terms\.minimumOutputTokens, terms\.outputSymbol\)/.test(block) &&
      !/formatApproxTokens\(terms\.minimumOutputTokens/.test(block) &&
      /formatApproxUsd\(terms\.minimumOutputUsd\)/.test(block);
  })(), "exact tokens, approximate dollars");
  add("SWCU-4b: grouping adds separators and NOTHING else — not one digit of precision", (() => {
    // Done on the string rather than through Number/toLocaleString, because the minimum is the
    // figure the chain enforces and a float round-trip is how `30453.030446` quietly becomes
    // `30,453.03`. The fraction must survive whole, however long it is.
    return groupTokenAmount("30453.030446") === "30,453.030446" &&
      groupTokenAmount("204.183333333") === "204.183333333" &&
      groupTokenAmount("1234567.000000001") === "1,234,567.000000001" &&
      groupTokenAmount("999") === "999" &&
      groupTokenAmount("1000") === "1,000" &&
      // Stripping the separators must give back exactly what went in.
      ["0.000000001", "7", "89012.5"].every((x) => groupTokenAmount(x).replace(/,/g, "") === x) &&
      // Anything unrecognised is left alone rather than guessed at.
      groupTokenAmount("not-a-number") === "not-a-number";
  })(), "separators only");
  add("SWCU-5: an unpriced amount OMITS its sub-line rather than printing a dash under the tokens", (() => {
    const c = readSrc("src/components/swapExecution/SwapConfirmSheet.tsx");
    // A "—" under a token figure reads as a missing term; missing context should be invisible.
    // All three sub-lines: input, expected output, and the minimum's dollar value.
    const guarded = (c.match(/formatApproxUsd\(terms\.\w+\) !== ABSENT_FIGURE &&/g) ?? []).length;
    return guarded === 3;
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
    // The minimum goes through the EXACT formatter — grouped like the others, never tilde'd.
    // Raw interpolation would lose the thousands separators; the approx formatter would lose
    // the guarantee.
    const minimumExact = /formatTokens\(terms\.minimumOutputTokens/.test(c) &&
      !/\{terms\.minimumOutputTokens\}/.test(c);
    return usesFormatters && !rawReceive && !rawFee && minimumExact;
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
  add("SWXS5-11b: EVERY waiting state is in the button — there is no second place to look", (() => {
    // There used to be a status line under the terms for everything before Approve. Two places
    // meant the reader had to know which to watch, and during a renewal a sentence appeared
    // under the figures while the button below it said nothing. One slot now, always the
    // primary button.
    const waiting: ExecutionPhase[] = ["preparing", "verifying", "signing", "submitting", "confirming"];
    return waiting.every((p2) => busyPresentationFor(p2) != null) &&
      waiting.every((p2) => (busyButtonLabelFor(p2) ?? "").length > 0);
  })(), "one slot");
  add("SWXS5-11d: fetching is QUIET; everything after Approve states which it is", (() => {
    // Nothing is at stake while we fetch — no transaction, nothing in flight, nothing approved
    // — so a spinner is the whole message. After Approve the two states are not
    // interchangeable: "Waiting for wallet" means nothing was sent, "Confirming" means it is
    // already on the chain and closing the tab will not stop it. A bare spinner cannot say
    // which, so those stay stated.
    const quiet: ExecutionPhase[] = ["preparing", "verifying"];
    const stated: ExecutionPhase[] = ["signing", "submitting", "confirming"];
    return quiet.every((p2) => busyPresentationFor(p2)?.labelVisible === false) &&
      stated.every((p2) => busyPresentationFor(p2)?.labelVisible === true) &&
      // Even when hidden the label exists, because it is the live region and the button width.
      quiet.every((p2) => (busyPresentationFor(p2)?.label ?? "").length > 0);
  })(), "quiet while fetching");
  add("SWXS5-11c: the busy button is never pressable and never a real `disabled`", (() => {
    const c = readSrc("src/components/swapExecution/SwapConfirmSheet.tsx");
    const at = c.indexOf("{busy && (");
    // Anchored, and asserted to BE anchored: slicing from a marker that has been renamed
    // yields the whole file (or nothing) and quietly passes. This has bitten twice already.
    if (at < 0) return false;
    const busyBlock = c.slice(at, c.indexOf("</button>", at));
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
  add("SWXS5-13a: EVERY event the poll can emit is acted on by the machine", (() => {
    // The fourth dropped-event bug in this lane: `decideFromConfirmation` calls a revert "the
    // ONE failure confirmation may report", and the transition to receive it was never added.
    // The event vanished, so a transaction the chain had definitively rejected sat in
    // `confirming` for the full 90s deadline and then said it "may still complete".
    //
    // Checked by walking the PRODUCER rather than a list someone wrote down: every outcome the
    // poll can decide is fed to the reducer from `confirming`, and each must move it. A new
    // confirmation state added to `decideFromConfirmation` is then caught here, not in
    // production.
    const toConfirming: ExecutionEvent[] = [
      { type: "prepare" }, { type: "plan_received", plan: plan() }, { type: "verified" },
      { type: "sign" }, { type: "signed" }, { type: "submitted", signature: "sig" },
    ];
    const confirming = toConfirming.reduce(executionReducer, initialExecutionState);
    if (confirming.phase !== "confirming") return false;

    const results: Parameters<typeof decideFromConfirmation>[0][] = [
      { ok: true, state: "confirmed" }, { ok: true, state: "failed" },
      { ok: true, state: "pending" }, { ok: false },
    ];
    return results.every((r) => {
      const decision = decideFromConfirmation(r);
      if (decision.action === "keep_waiting") return true;
      // Every event it decides to STOP on must actually move the machine.
      return decision.events.every((e) => executionReducer(confirming, e).phase !== "confirming");
    });
  })(), "no dropped confirmation event");
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
  add("SWXS5-13e: a confirm timeout ALWAYS carries a signature — there is no other shape", (() => {
    const h = readSrc("src/components/swapExecution/useSwapExecutionPlan.ts");
    const l = readSrc("src/suggestions/swapExecution/executionLifecycle.ts");
    // The timeout is dispatched only from the poll, the poll only runs once a signature exists,
    // the reducer accepts it only from `confirming`, and `fail` spreads the state rather than
    // clearing it. So "timed out with nothing to look up" is not a state the product has — and
    // that matters, because the link is the user's only recourse in exactly this case.
    const onlyFromPoll = /if \(watchedSignature == null\) return;/.test(h) &&
      /const watchedSignature = state\.phase === "confirming" \? state\.signature : null;/.test(h);
    const onlyFromConfirming = /if \(event\.type === "confirm_timeout"\) return fail\(state, "confirm_timeout"\);/.test(l);
    // Behaviour, not the shape of one object literal: a timeout from `confirming` keeps the
    // signature. Pinning the literal meant adding a field to `fail` broke this test while the
    // guarantee it protects was untouched.
    const timedOut = executionReducer(
      { ...initialExecutionState, phase: "confirming", signature: "sig-abc" },
      { type: "confirm_timeout" },
    );
    const keepsSignature = timedOut.phase === "failed" &&
      timedOut.failure === "confirm_timeout" && timedOut.signature === "sig-abc";
    return onlyFromPoll && onlyFromConfirming && keepsSignature && l.length > 0;
  })(), "timeout keeps its signature");
  add("SWXS5-14: the explorer link is built only from a real signature, and is URL-safe", (() => {
    return solscanTransactionUrl("") === null && solscanTransactionUrl("5xSig") === "https://solscan.io/tx/5xSig" &&
      (solscanTransactionUrl("a/b?c") ?? "").endsWith("a%2Fb%3Fc");
  })(), "explorer link");
  add("SWXS5-15: the success figure is the delivered one or none — the estimate is never relabelled", (() => {
    const c = readSrc("src/components/swapExecution/SwapConfirmSheet.tsx");
    // This began as "success shows NO amount", which was right while the browser was the
    // only place that could have read one. The server reads it now, so the rule is the one
    // that was always underneath: the figure shown is what ARRIVED, or there is none.
    //
    // `swapConfirmReceived(` with the paren, so the check cannot be satisfied — or broken —
    // by `swapConfirmReceivedUnknown`, which is the opposite thing: the sentence shown when
    // there is no figure at all.
    return /SWAP_CONFIRM_COMPLETE_TITLE/.test(c) && !/swapConfirmReceived\(/.test(c) &&
      // And nothing in the settled branch reaches for the quote's expectation.
      !/expectedOutput/.test(c.slice(c.indexOf('if (phase === "confirmed" && terms) {'), c.indexOf("const reachedChain")));
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


  /* ---- The review's entry footer, and the press that opens the step (SWXE-1..20) ----
   *
   * Found by the first real swap attempt in production, 2026-11-26. Every one of these was
   * invisible to the fixtures that existed, because they pinned pure functions and the faults
   * were in how the pieces were joined: a stale closure, a footer with three owners, a display
   * clock. Demo Mode and the walkthrough could not show them either — they use no wallet. */
  const entryFor = (a: SwapQuoteComparisonAssessment | null, o: { loading?: boolean; wallet?: boolean; nowMs?: number } = {}) => {
    const nowMs = o.nowMs ?? NOW;
    const act = { ...action(), suggestionCategory: "rebalance" as const, totalLegs: 1 };
    return deriveSwapEntry({
      offer: deriveExecutionOffer({ action: act, assessment: a, nowMs }),
      assessment: a,
      comparisonLoading: o.loading ?? false,
      walletReady: o.wallet ?? true,
      nowMs,
    });
  };
  add("SWXE-1: a fresh, offered route shows Swap and needs no refresh", (() => {
    const e = entryFor(assessment());
    return e.kind === "swap" && e.refreshFirst === false;
  })(), "swap");
  add("SWXE-2: an AGED comparison keeps the Swap button — its age is not a reason to take the control away", (() => {
    // Under ten seconds of life left: the Boundary says `quote_expired`, and before this the
    // footer rendered nothing at all from about ten seconds after every review opened.
    const aged = assessment({ expiresAt: new Date(NOW + MIN_QUOTE_LIFE_MS - 1).toISOString() });
    const e = entryFor(aged);
    // Still inside its validity, so it is used as it stands — the server would return the same
    // cached answer to a refresh anyway.
    return e.kind === "swap" && e.refreshFirst === false;
  })(), "aged keeps Swap");
  add("SWXE-3: an EXPIRED comparison still shows Swap, and the press re-runs it first", (() => {
    const e = entryFor(assessment({ expiresAt: new Date(NOW - 60_000).toISOString() }));
    return e.kind === "swap" && e.refreshFirst === true;
  })(), "expired refreshes first");
  add("SWXE-4: age is the ONLY refusal that keeps the button — every other one stands", (() => {
    const notJupiter = entryFor(assessment({ selectedProviderId: "raydium" }));
    const noMinimum = entryFor(assessment({ minimumOutputTokens: null }));
    const twoFaults = entryFor(assessment({ minimumOutputTokens: null, expiresAt: new Date(NOW - 1).toISOString() }));
    return notJupiter.kind === "unavailable" && noMinimum.kind === "unavailable" && twoFaults.kind === "unavailable";
  })(), "other refusals stand");
  add("SWXE-5: no answer yet, request in flight → the Swap button spins; no answer and nothing in flight → Close", (() => {
    return entryFor(null, { loading: true }).kind === "loading" && entryFor(null, { loading: false }).kind === "unavailable";
  })(), "loading vs unavailable");
  add("SWXE-6: a refused route that is being re-requested spins rather than offering Close mid-refresh", (() => {
    return entryFor(assessment({ selectedProviderId: "raydium" }), { loading: true }).kind === "loading";
  })(), "refresh in flight");
  add("SWXE-7: without a wallet that can sign, an offerable swap says so — it never becomes pressable", (() => {
    const fresh = entryFor(assessment(), { wallet: false });
    const expired = entryFor(assessment({ expiresAt: new Date(NOW - 1).toISOString() }), { wallet: false });
    return fresh.kind === "wallet_unavailable" && expired.kind === "wallet_unavailable";
  })(), "wallet required");
  add("SWXE-8: a missing wallet never upgrades a refused route — the refusal is reported, not the wallet", (() => {
    return entryFor(assessment({ selectedProviderId: "raydium" }), { wallet: false }).kind === "unavailable";
  })(), "refusal first");

  add("SWXE-9: THE STEP OPENING REQUESTS THE PLAN — an effect on `enabled`, not the click handler", (() => {
    const hook = stripComments(readSrc("src/components/swapExecution/useSwapExecutionPlan.ts"));
    const section = stripComments(readSrc("src/components/swapExecution/SwapExecutionSection.tsx"));
    // The fault: the Swap button called `execution.prepare()` right after `setStarted(true)`.
    // That `prepare` closed over `enabled === false` and returned at once, and nothing else
    // ever asked for the first plan. In a real wallet session the button span forever, with no
    // request made and no failure reported.
    const effect = /useLayoutEffect\(\(\) => \{\s*if \(!enabled \|\| takerPublicKey == null\) return;\s*prepare\(\);[\s\S]{0,120}\}, \[enabled\]\);/.test(hook);
    // The only `prepare()` left in the section is the sheet's own Refresh, which is called
    // while the step is open and therefore holds a current `prepare`.
    const calls = section.match(/execution\.prepare\(\)/g) ?? [];
    return effect && calls.length === 1 && /onRefresh=\{\(\) => execution\.prepare\(\)\}/.test(section);
  })(), "no stale prepare");
  add("SWXE-10: the review is not replaced until the step has something to show", (() => {
    const section = readSrc("src/components/swapExecution/SwapExecutionSection.tsx");
    // `active` was `started`, so the press swapped the review's heading and hid its body while
    // the footer was still fetching — a near-empty modal titled "Review Swap".
    return /const stepOpen = started && !awaitingFirstPlan;/.test(section) &&
      /onStepChange\?\.\(\{ active: stepOpen, onBack: leaveStep, title: stepTitle \}\);/.test(section) &&
      !/active: started,/.test(section);
  })(), "button holds the wait");
  add("SWXE-11: `reset` puts a pre-signing attempt away, so reopening the step starts clean", (() => {
    const ready = { ...initialExecutionState, phase: "ready" as const, plan: plan() };
    const failed = { ...initialExecutionState, phase: "failed" as const, failure: "expired" as const };
    const preparing = { ...initialExecutionState, phase: "preparing" as const };
    return [ready, failed, preparing].every((st) => executionReducer(st, { type: "reset" }) === initialExecutionState);
  })(), "clean reopen");
  add("SWXE-12: `reset` NEVER discards anything a wallet was asked to sign, or a signature", (() => {
    const kept = [
      { ...initialExecutionState, phase: "signing" as const, plan: plan() },
      { ...initialExecutionState, phase: "submitting" as const, plan: plan() },
      { ...initialExecutionState, phase: "confirming" as const, signature: "sig" },
      { ...initialExecutionState, phase: "confirmed" as const, signature: "sig" },
      // A revert and a timeout are `failed` WITH a signature — the user's only record.
      { ...initialExecutionState, phase: "failed" as const, failure: "submit_failed" as const, signature: "sig" },
      { ...initialExecutionState, phase: "failed" as const, failure: "confirm_timeout" as const, signature: "sig" },
    ];
    return kept.every((st) => executionReducer(st, { type: "reset" }) === st);
  })(), "record survives");
  add("SWXE-13: closing the step dispatches `reset`", (() => {
    const hook = stripComments(readSrc("src/components/swapExecution/useSwapExecutionPlan.ts"));
    return /if \(enabled\) return;\s*generationRef\.current \+= 1;\s*abortRef\.current\?\.abort\(\);\s*dispatch\(\{ type: "reset" \}\);/.test(hook);
  })(), "reset on close");

  add("SWXE-14: a swap review has ONE footer owner from the first render, decided from the prop", (() => {
    const modal = stripComments(readSrc("src/components/SuggestionReviewModal.tsx"));
    // It used to be decided by what the route section had reported so far, so the footer went
    // through three owners while the comparison loaded, and none at all when the last one
    // rendered nothing: `executionSection ?? swapFooter` never fell back, because an element
    // that renders null is still an element.
    const fromProp = /const swapLeg: SwapActionContext \| null =\s*swapAction && !details\?\.hideSwapRoute && swapAction\.status === "ready" && swapAction\.legs\.length === 1/.test(modal);
    const owns = /const executionSection = swapLeg \? \(/.test(modal) && /action=\{swapLeg\}/.test(modal);
    const staticLinkYields = /\{details\.externalLink && !swapLeg && \(/.test(modal);
    return fromProp && owns && staticLinkYields;
  })(), "one owner");
  add("SWXE-15: there is NO link out to a swap provider anywhere in the review", (() => {
    const modal = readSrc("src/components/SuggestionReviewModal.tsx");
    const section = readSrc("src/components/swapQuote/SwapQuoteComparisonSection.tsx");
    const rebalance = readSrc("src/suggestions/rebalanceSuggestion.ts");
    const sheet = readSrc("src/components/swapExecution/SwapConfirmSheet.tsx");
    const execution = readSrc("src/components/swapExecution/SwapExecutionSection.tsx");
    const code = (src: string) => stripComments(src);
    return !/Swap on /.test(code(modal)) && !/swapHandoff|swapFooter|onHandoff/.test(code(modal)) &&
      !/buildSwapHandoff|onHandoff/.test(code(section)) &&
      !/jupiterRebalanceFallbackLink|Swap on Jupiter/.test(code(rebalance)) &&
      // Nor in the confirm step, on any of its screens — and the URL builder itself is deleted.
      !/Swap on /.test(code(sheet)) && !/Swap on |handoff/i.test(code(execution)) &&
      readSrc("src/suggestions/swapQuote/providerSwapLinks.ts") === "";
  })(), "no link out");
  add("SWXE-16: the entry footer never renders nothing — five states, each with a control", (() => {
    const section = readSrc("src/components/swapExecution/SwapExecutionSection.tsx");
    const body = section.slice(section.indexOf("const entryFooter = () => {"), section.indexOf("// DEMO MODE."));
    const stripped = stripComments(body);
    return /entry\.kind === "swap"/.test(stripped) && /entry\.kind === "loading"/.test(stripped) &&
      /entry\.kind === "wallet_unavailable"/.test(stripped) &&
      // Nothing to offer: Check Again where a re-run exists, Close alone where it does not.
      /\? <CheckAgainFooter onClose=\{onClose\} onCheckAgain=\{onCheckAgain\} \/>\s*: <CloseFooter onClose=\{onClose\} \/>;/.test(stripped) &&
      !/return null/.test(stripped) &&
      // And neither branch of the component returns null any more.
      !/return null;/.test(stripComments(section.slice(section.indexOf("export default function SwapExecutionSection"), section.indexOf("function ContinueFooter"))).replace(/if \(demoGaveUp\) return null;/, "")
        // …and a step of a sequence that has SETTLED, where the host shows the result and moves on.
        .replace(/if \(onSettled != null && \(execution\.phase === "confirmed" \|\| execution\.phase === "failed"\)\) return null;/, ""));
  })(), "never empty");
  add("SWXE-22: CHECK AGAIN holds its own wait — the footer does not turn into a spinning Swap while the comparison re-runs", (() => {
    const section = readSrc("src/components/swapExecution/SwapExecutionSection.tsx");
    const body = stripComments(section.slice(section.indexOf("const entryFooter = () => {"), section.indexOf("// DEMO MODE.")));
    // A re-run passes through "loading", which on its own draws Cancel + a spinning Swap. The
    // check for a pending Check Again has to come BEFORE every entry kind.
    const first = body.indexOf("if (checkingAgain) return <CheckAgainFooter onClose={onClose} busy");
    const anyKind = body.indexOf("entry.kind ===");
    const footer = section.slice(section.indexOf("function CheckAgainFooter("), section.indexOf("function ReconnectFooter("));
    // Same construction as the busy Swap: label kept invisibly for size, spinner over it,
    // `aria-disabled` so a second press is a no-op and the status is still announced.
    const holds = /cta-hold__label[^>]*>\{SWAP_ENTRY_CHECK_AGAIN_LABEL\}/.test(footer) && /cta-hold__spinner/.test(footer) &&
      /aria-disabled="true"/.test(footer) && /\{SWAP_ENTRY_CHECKING_AGAIN\}/.test(footer);
    // Close beside it, not Cancel: nothing is in progress to cancel.
    const closeBeside = /review-modal__tertiary-action[\s\S]{0,80}\{SWAP_CONFIRM_CLOSE_LABEL\}/.test(footer) && !/>\s*Cancel\s*</.test(footer);
    return first > 0 && anyKind > first && holds && closeBeside && SWAP_ENTRY_CHECK_AGAIN_LABEL === "Check Again";
  })(), "the pressed button keeps the wait");
  add("SWXE-23: Check Again STOPS when the answer is in — only a pressed Swap continues into the step", (() => {
    const section = stripComments(readSrc("src/components/swapExecution/SwapExecutionSection.tsx"));
    // One mechanism re-runs the comparison for both buttons; what differs is what happens next.
    // If Check Again opened the step, a reader who asked "is there a route now?" would be
    // handed terms to approve without having pressed Swap.
    const oneMechanism = /useState<"swap" \| "check" \| null>\(null\)/.test(section) &&
      /setAwaitingRefresh\("check"\);\s*onRefreshComparison\(\);/.test(section);
    const stops = /const was = awaitingRefresh;[\s\S]{0,200}setAwaitingRefresh\(null\);[\s\S]{0,40}if \(was !== "swap"\) return;[\s\S]{0,200}setStarted\(true\)/.test(section);
    // And it cannot be double-fired or fired with nothing to ask.
    const guarded = /const onCheckAgain = \(\) => \{\s*if \(!onRefreshComparison \|\| awaitingRefresh != null\) return;/.test(section);
    return oneMechanism && stops && guarded;
  })(), "asking is not approving");
  add("SWXE-24: the blocked NOTICE is reported up and shown as an info banner FIRST in the review's body — not left at the bottom", (() => {
    const section = readSrc("src/components/swapQuote/SwapQuoteComparisonSection.tsx");
    const modal = readSrc("src/components/SuggestionReviewModal.tsx");
    const banner = readSrc("src/components/InfoBanner.tsx");
    const code = stripComments(section);
    // Raised only once the comparison has ANSWERED, so it never sits over one that is loading.
    const reported = /const answered = usePreset \? props\.presetLoading !== true : phase === "done";/.test(code) &&
      /resolvedView && isBlockedView\(resolvedView\) \? \{ heading: resolvedView\.heading, body: resolvedView\.body \} : null/.test(code) &&
      /refresh: usePreset \? undefined : quietRefresh, notice \}/.test(code);
    // A change of notice is a change of report — without it in the key the banner would lag.
    const keyed = /\|\$\{notice\?\.heading \?\? ""\}`/.test(code);
    // The section stands aside for the host, in both the live and the preset path.
    const standsAside = (code.match(/if \(noticeShownByHost\) return null;/g) ?? []).length === 2 &&
      /hostShowsNotice=\{swapLeg != null\}/.test(modal);
    // First child of the body, in BOTH review layouts that carry a route section.
    const first = (modal.match(/<div className=\{bodyClass\}>\s*\{blockedNotice\}/g) ?? []).length === 2;
    const isInfo = /className="alert alert--info" role="status"/.test(banner) &&
      /<InfoBanner title=\{quoteState\.notice\.heading\} description=\{quoteState\.notice\.body\} \/>/.test(modal);
    return reported && keyed && standsAside && first && isInfo;
  })(), "said first");
  add("SWXE-25: without a wallet the reason is a TOOLTIP on the greyed Swap — reachable by hover, Tab and tap, and nowhere else in the footer", (() => {
    const section = readSrc("src/components/swapExecution/SwapExecutionSection.tsx");
    const css = readSrc("src/styles/dashboard.css");
    const footer = section.slice(section.indexOf("function ContinueFooter("), section.indexOf("function CheckAgainFooter("));
    const code = stripComments(footer);
    // `aria-disabled`, never `disabled`: a truly disabled button leaves the tab order and fires
    // no pointer events, and the tooltip is the ONLY place the reason is given.
    const focusable = /review-modal__primary-action--disabled"\s*aria-disabled="true"\s*aria-describedby=\{tipId\}/.test(code) &&
      !/<button[^>]*\sdisabled[\s>]/.test(code);
    const tip = /className="swap-confirm__approve-tip" role="tooltip" id=\{tipId\}>\s*\{unavailableTooltip\}/.test(code);
    const noNote = !/footer-note|footer--noted|unavailableNote/.test(section) && !/review-modal__footer-note|review-modal__footer--noted/.test(css);
    const shownOnHoverAndFocus = /\.swap-confirm__approve-wrap:hover \.swap-confirm__approve-tip,\s*\.swap-confirm__approve-wrap:focus-within \.swap-confirm__approve-tip/.test(css);
    return focusable && tip && noNote && shownOnHoverAndFocus && SWAP_ENTRY_WALLET_TOOLTIP === "Reconnect your wallet to swap";
  })(), "the reason is on the button");
  add("SWXE-26: a missing wallet LINK does not grey Swap — pressing Swap reopens it, in place, and then carries on", (() => {
    const section = stripComments(readSrc("src/components/swapExecution/SwapExecutionSection.tsx"));
    const footer = section.slice(section.indexOf("const entryFooter = () => {"), section.indexOf("// DEMO MODE."));
    // After a page refresh the session is signed in and the adapter is not connected. That is
    // the ordinary case, and its footer is the ordinary one: a working Swap that holds the wait.
    const ordinary = /if \(walletLink\.canReconnect && !walletFailed\) \{\s*return <ContinueFooter onClose=\{onClose\} busy=\{awaitingWallet === "swap" \|\| props\.autoStart === true\} onContinue=\{onSwap\} label=\{continueLabel\} \/>;/.test(footer);
    const pressReconnects = /if \(at\.kind === "wallet_unavailable"\) \{ startReconnect\("swap"\); return; \}/.test(section);
    // The press that asked carries on once a wallet is there — and nothing else does.
    const continues = /if \(walletReady\) \{\s*const was = awaitingWallet;\s*setAwaitingWallet\(null\);\s*setWalletFailed\(false\);\s*if \(was === "swap"\) onSwap\(\);/.test(section);
    // Before paint, so there is no frame of an idle Swap between the wallet and the spinner.
    const before = /useLayoutEffect\(\(\) => \{\s*if \(awaitingWallet == null\) return;/.test(section);
    return ordinary && pressReconnects && continues && before;
  })(), "the press that needs the wallet opens it");
  add("SWXE-27: when the link cannot be reopened, RECONNECT WALLET takes Swap's place — and never spins for good", (() => {
    const src = readSrc("src/components/swapExecution/SwapExecutionSection.tsx");
    const section = stripComments(src);
    const footer = section.slice(section.indexOf("const entryFooter = () => {"), section.indexOf("// DEMO MODE."));
    const replaced = /if \(walletLink\.canReconnect\) \{\s*return <ReconnectFooter onClose=\{onClose\} busy=\{awaitingWallet === "reconnect"\} onReconnect=\{onReconnect\} \/>;/.test(footer);
    // Declined, or connected on a different account than the session's — both end the wait.
    const endsOnFailure = /if \(walletLinkStatus === "failed" \|\| walletLinkStatus === "connected"\) \{\s*setAwaitingWallet\(null\);\s*setWalletFailed\(true\);/.test(section);
    // And an unanswered wallet prompt ends it too.
    const capped = /setTimeout\(\(\) => \{ setAwaitingWallet\(null\); setWalletFailed\(true\); \}, WALLET_RECONNECT_CAP_MS\)/.test(section) &&
      /export const WALLET_RECONNECT_CAP_MS = 30_000;/.test(section);
    const comp = src.slice(src.indexOf("function ReconnectFooter("), src.indexOf("function CloseFooter("));
    const holds = /cta-hold__label[^>]*>\{SWAP_ENTRY_RECONNECT_LABEL\}/.test(comp) && /aria-disabled="true"/.test(comp) && /\{SWAP_ENTRY_RECONNECTING\}/.test(comp);
    // A wallet that turns up by itself (account switched in the extension) brings Swap back.
    const clears = /if \(walletReady && walletFailed\) setWalletFailed\(false\);/.test(section);
    // The greyed Swap with a tooltip is now only for a session with no wallet to reconnect to.
    const lastResort = footer.indexOf("unavailableTooltip={SWAP_ENTRY_WALLET_TOOLTIP}") > footer.indexOf("<ReconnectFooter");
    return replaced && endsOnFailure && capped && holds && clears && lastResort && SWAP_ENTRY_RECONNECT_LABEL === "Reconnect Wallet";
  })(), "the remedy is the button");
  add("SWXE-28: reconnecting is the wallet's CONNECT and nothing more — and a simulation never reaches the real adapter", (() => {
    const hook = stripComments(readSrc("src/components/swapExecution/useWalletReconnect.ts"));
    // No signature, no transaction: opening the link asks the wallet for its address only.
    const connectOnly = !/signMessage|signTransaction|signAllTransactions|sendTransaction|signIn\b/.test(hook);
    // With a seam the function returns before the adapter is touched.
    const seamAt = hook.indexOf("if (seam) {");
    const seamReturn = hook.indexOf("return;", seamAt);
    const adapterAt = hook.indexOf("setPendingName(name)");
    const seamFirst = seamAt > 0 && seamReturn > seamAt && adapterAt > seamReturn;
    // Select, then connect once the adapter reflects the selection — one connect() per attempt.
    const ordered = /if \(wallet\?\.adapter\.name !== pendingName\) \{\s*select\(pendingName as WalletName\);\s*return;/.test(hook) &&
      /if \(connecting \|\| firedRef\.current\) return;\s*firedRef\.current = true;\s*connect\(\)\.catch/.test(hook);
    // The mounted flag is SET on mount: cleared-only, Strict Mode leaves it false for good and
    // every outcome is dropped — the button then spins until the cap.
    const mounted = /useEffect\(\(\) => \{\s*mountedRef\.current = true;\s*return \(\) => \{ mountedRef\.current = false; \};\s*\}, \[\]\);/.test(hook);
    return connectOnly && seamFirst && ordered && mounted;
  })(), "connect only");
  add("SWXE-29: with no wallet to reconnect to, CONNECT WALLET takes Swap's place — it leaves the review, and is never a dead button", (() => {
    const src = readSrc("src/components/swapExecution/SwapExecutionSection.tsx");
    const section = stripComments(src);
    const footer = section.slice(section.indexOf("const entryFooter = () => {"), section.indexOf("// DEMO MODE."));
    // Only when a host can open the dialog; otherwise the greyed Swap with its tooltip stays.
    const offered = /if \(props\.onConnectWallet\) return <ConnectWalletFooter onClose=\{onClose\} onConnectWallet=\{props\.onConnectWallet\} \/>;\s*return <ContinueFooter onClose=\{onClose\} unavailableTooltip=\{SWAP_ENTRY_WALLET_TOOLTIP\}/.test(footer);
    // After the reconnect paths: a wallet that CAN be reconnected is never sent to the dialog.
    const last = footer.indexOf("<ConnectWalletFooter") > footer.indexOf("<ReconnectFooter");
    // The review closes before the dialog opens — a new sign-in may be a different wallet.
    const rail = stripComments(readSrc("src/components/RealWalletSuggestionsRail.tsx"));
    const closesFirst = (rail.match(/onConnectWallet=\{leaveToConnectWallet\}/g) ?? []).length === 2 &&
      /const id = opened\?\.id \?\? null;\s*close\(\);\s*onConnectWallet\(/.test(rail);
    // And the real pages supply it.
    const wired = /<RealWalletSuggestionsRail[\s\S]{0,300}onConnectWallet=\{onConnectWallet\}/.test(readSrc("src/pages/DashboardPage.tsx")) &&
      /onConnectWallet=\{onConnectWallet\}/.test(readSrc("src/pages/PortfolioPage.tsx")) &&
      /<PortfolioPage[\s\S]{0,200}onConnectWallet=\{openConnectModal\}/.test(readSrc("src/App.tsx"));
    // One label for one action: the same words the header and the dialog use.
    return offered && last && closesFirst && wired && SWAP_ENTRY_CONNECT_LABEL === CONNECT_WALLET_LABEL && SWAP_ENTRY_CONNECT_LABEL === "Connect Wallet";
  })(), "a way forward");
  add("SWXE-30: back from Connect Wallet, the SAME suggestion reopens — freshly, only once a wallet is connected, and never out of nowhere", (() => {
    const rail = stripComments(readSrc("src/components/RealWalletSuggestionsRail.tsx"));
    const app = stripComments(readSrc("src/App.tsx"));
    // The rail hands the host a continuation naming the suggestion it left.
    const handsOver = /onConnectWallet\(id != null \? \(\) => setResumeId\(id\) : undefined\);/.test(rail);
    // Reopened through the Review path (new snapshot, new route), from the rail's current data;
    // it waits while the rail reloads, and opens nothing if the suggestion is gone.
    const fresh = /if \(!rail \|\| !rail\.available\) return;\s*const card = rail\.cards\.find\(\(c\) => c\.id === resumeId\);\s*setResumeId\(null\);\s*if \(card\) onReviewSuggestion\(card\);/.test(rail);
    // Never over something already open, and never after the cap.
    const guarded = /if \(opened != null \|\| pendingRef\.current != null\) \{ setResumeId\(null\); return; \}/.test(rail) &&
      /setTimeout\(\(\) => setResumeId\(null\), RESUME_AFTER_CONNECT_CAP_MS\)/.test(rail) &&
      /export const RESUME_AFTER_CONNECT_CAP_MS = 20_000;/.test(rail);
    // The host calls it only when the dialog closed WITH a wallet connected — a dismissed
    // dialog carries nothing on — and a click event handed to the same function is not one.
    const hostDecides = /afterConnectRef\.current = typeof onConnected === "function" \? \(onConnected as \(\) => void\) : null;/.test(app) &&
      /if \(connectModalOpen\) return;\s*const resume = afterConnectRef\.current;\s*afterConnectRef\.current = null;\s*if \(resume && walletConnected\) resume\(\);/.test(app);
    return handsOver && fresh && guarded && hostDecides;
  })(), "pick up where they left");

  add("SWXE-17: the route on screen is presented as of ITS OWN time, so it cannot age into 'unavailable'", (() => {
    const section = readSrc("src/components/swapQuote/SwapQuoteComparisonSection.tsx");
    const pinned = /const viewNowMs = props\.nowMs \?\? \(Number\.isFinite\(comparedAtMs\) \? comparedAtMs : undefined\);/.test(section) &&
      /presentSwapQuote\(singleAssessment, \{ nowMs: viewNowMs \}\)/.test(section);
    // The rule it works around is real and unchanged: against the wall clock, a comparison past
    // its expiry presents as expired. Pinning the clock is what keeps a decided route on screen.
    const a = assessment({ expiresAt: new Date(NOW + 20_000).toISOString() });
    const atItsOwnTime = presentSwapQuote(a, { nowMs: Date.parse(a.comparedAt) }).kind;
    const aMinuteLater = presentSwapQuote(a, { nowMs: NOW + 60_000 }).kind;
    return pinned && atItsOwnTime !== "expired" && aMinuteLater === "expired";
  })(), "route stays put");
  add("SWXE-18: the review opens on a SNAPSHOT taken when Review was pressed, after the route was fetched", (() => {
    const rail = stripComments(readSrc("src/components/RealWalletSuggestionsRail.tsx"));
    // Reading the live rail let a price refresh change the swap amount under an open review,
    // which re-ran the comparison and could name a different route.
    const snapshot = /swapAction: rail\.swapActionById\?\.\[card\.id\]/.test(rail) && /swapAction=\{opened\.swapAction\}/.test(rail) &&
      !/swapAction=\{selectedId \? rail/.test(rail);
    // Prefetched from the press — and from nowhere else: not on render, not on hover.
    const prefetches = rail.match(/prefetchSwapQuoteComparison\(/g) ?? [];
    const fromPress = /void prefetchSwapQuoteComparison\(legs, \{ fetcher: snapshot\.swapQuoteFetcher \}\)\.then\(/.test(rail);
    // And an open review survives the rail reloading behind it.
    const mountedEverywhere = (rail.match(/\{reviewModal\}/g) ?? []).length === 3;
    return snapshot && prefetches.length === 1 && fromPress && mountedEverywhere;
  })(), "frozen proposal");
  add("SWXE-19: only a comparison that NAMED a route counts as an answer worth opening on without a retry", (() => {
    const ok = comparisonSelectedARoute({ ok: true, assessment: assessment() });
    const noRoute = comparisonSelectedARoute({ ok: true, assessment: assessment({ status: "no_valid_route", selectedProviderId: null }) });
    const failed = comparisonSelectedARoute({ ok: false, error: "unavailable" });
    return ok && !noRoute && !failed;
  })(), "retry rule");
  add("SWXE-20: the quote layer's in-app list is the execution layer's list — they cannot drift", (() => {
    return SWAP_IN_APP_PROVIDER_IDS.length === EXECUTABLE_PROVIDER_IDS.length &&
      SWAP_IN_APP_PROVIDER_IDS.every((id) => EXECUTABLE_PROVIDER_IDS.includes(id));
  })(), "one list in effect");

  add("SWXE-21: the live-simulation seam REPLACES the wallet — it is provided by the walkthrough only, and nothing in it can reach a real one", (() => {
    const section = stripComments(readSrc("src/components/swapExecution/SwapExecutionSection.tsx"));
    const sim = stripComments(readSrc("src/pages/swapLiveSimulation.ts"));
    // With a seam present, neither the adapter's key nor its submitter is used.
    const replaces = /const submit = seam \? seam\.submit : walletSubmit;/.test(section) &&
      /const takerPublicKey = seam \? seam\.takerPublicKey : publicKey\?\.toBase58\(\) \?\? null;/.test(section);
    // Exactly one file provides it, and it is the walkthrough — never a product page.
    const providers = tsFilesUnder(["src/components", "src/pages"])
      .filter((f) => /SwapExecutionSeamContext\.Provider/.test(stripComments(readSrc(f))));
    const onlyWalkthrough = providers.length === 1 && providers[0].endsWith("SwapWalkthroughPage.tsx");
    // The stand-ins import no wallet code and make no request: the "wallet" is a timer.
    const inert = !/wallet-adapter|useWallet|useWalletSwapSubmitter|sendTransaction|signTransaction|fetch\(/.test(sim);
    return replaces && onlyWalkthrough && inert;
  })(), "simulation cannot sign");

  /* ---- Trim: choose tokens, then one at a time (SWTR-1..12) ----
   *
   * Decided 2026-11-26. A Trim sells long-tail tokens to USDC, one transaction per token. Three
   * rules changed to make that executable, each narrowly: a lone eligible route is allowed FOR
   * TRIM ONLY, a leg may be judged alone WHEN IT IS APPROVED ALONE, and the review grew a
   * selector, a run and a summary. These pin the rules and the join between the pieces. */
  const BONK = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
  const trimLeg = (i: number, mint: string, symbol: string, usd: number, total = 3): SwapActionContext => ({
    ...action(), actionId: "trim:t1", suggestionId: "t1", suggestionCategory: "trim", legId: `trim:t1:${i}`, legIndex: i, totalLegs: total,
    inputAsset: { symbol, mint, decimals: 5 }, outputAsset: { symbol: "USDC", mint: USDC, decimals: 6 }, inputAmountUsd: usd,
  });
  const onlyRoute = () => assessment({
    status: "only_route_available",
    candidates: [candidate(), candidate({ providerId: "raydium", providerName: "Raydium", executionSurface: "raydium", eligible: false, exclusionReasons: ["no_route"] })],
  });
  const impactBlocked = () => assessment({
    status: "no_valid_route", selectedProviderId: null, expiresAt: null, expectedOutputTokens: null, minimumOutputTokens: null,
    blockingReasons: ["price_impact_high"],
    candidates: [candidate({ eligible: false, exclusionReasons: ["price_impact_high"] })],
  });
  add("SWTR-1: a LONE eligible route is executable for Trim — and for nothing else", (() => {
    const trim = deriveExecutionOffer({ action: trimLeg(0, BONK, "BONK", 300, 1), assessment: onlyRoute(), nowMs: NOW });
    const rebalance = deriveExecutionOffer({ action: { ...action(), suggestionCategory: "rebalance", totalLegs: 1 }, assessment: onlyRoute(), nowMs: NOW });
    const dca = deriveExecutionOffer({ action: { ...action(), suggestionCategory: "dca", totalLegs: 1 }, assessment: onlyRoute(), nowMs: NOW });
    return trim.offered === true &&
      rebalance.offered === false && rebalance.blockReasons.includes("no_selected_route") &&
      dca.offered === false &&
      SINGLE_ROUTE_EXECUTION_CATEGORIES.length === 1 && SINGLE_ROUTE_EXECUTION_CATEGORIES[0] === "trim";
  })(), "one route, Trim only");
  add("SWTR-2: a lone route is still held to every OTHER check — a blocked one stays blocked", (() => {
    const noRoute = deriveExecutionOffer({ action: trimLeg(0, BONK, "BONK", 300, 1), assessment: impactBlocked(), nowMs: NOW });
    const raydiumOnly = deriveExecutionOffer({
      action: trimLeg(0, BONK, "BONK", 300, 1), nowMs: NOW,
      assessment: assessment({ status: "only_route_available", selectedProviderId: "raydium", candidates: [candidate({ providerId: "raydium", providerName: "Raydium", executionSurface: "raydium" })] }),
    });
    const unverified = deriveExecutionOffer({
      action: trimLeg(0, BONK, "BONK", 300, 1), nowMs: NOW,
      assessment: assessment({ status: "only_route_available", candidates: [candidate({ liquidityAssessment: { status: "unresolved", minimumRouteLegLiquidityUsd: null, legs: [] } as never })] }),
    });
    // A "selected" provider whose own candidate is not eligible is not a surviving route at all.
    const noneEligible = deriveExecutionOffer({
      action: trimLeg(0, BONK, "BONK", 300, 1), nowMs: NOW,
      assessment: assessment({ status: "only_route_available", candidates: [candidate({ eligible: false, exclusionReasons: ["price_impact_high"] })] }),
    });
    return noRoute.offered === false && raydiumOnly.offered === false && unverified.offered === false && noneEligible.offered === false;
  })(), "nothing else is relaxed");
  add("SWTR-3: a leg of several is refused as one action, and offered only when it is approved BY ITSELF", (() => {
    const leg = trimLeg(1, BONK, "BONK", 300, 3);
    const together = deriveExecutionOffer({ action: leg, assessment: assessment(), nowMs: NOW });
    const alone = deriveExecutionOffer({ action: leg, assessment: assessment(), nowMs: NOW, perLegApproval: true });
    return together.offered === false && together.blockReasons.includes("multi_leg") && alone.offered === true;
  })(), "one approval, one transaction");
  add("SWTR-4: the selector ticks what can be sold, says why the rest cannot, and puts the largest first", (() => {
    const legs = [trimLeg(0, "MintSmall1111111111111111111111111111111111", "SML", 40), trimLeg(1, BONK, "BONK", 1200), trimLeg(2, "MintThin11111111111111111111111111111111111", "THIN", 300)];
    const rows = deriveTrimRows({
      legs, nowMs: NOW, assets: [],
      assessments: { [legs[0].legId]: onlyRoute(), [legs[1].legId]: assessment(), [legs[2].legId]: impactBlocked() },
    });
    const [a, b, c] = rows;
    return rows.length === 3 &&
      a.symbol === "BONK" && a.sellable && a.previewTokens === "0.197901" && a.blockedReason === null &&
      b.symbol === "THIN" && !b.sellable && b.previewTokens === null && b.blockedReason === TRIM_BLOCKED_REASON.price_impact_high &&
      // A token with one route only is ticked like any other — and nothing marks it out.
      c.symbol === "SML" && c.sellable && !("singleRoute" in c);
  })(), "what can be sold, and why not");
  add("SWTR-5: an AGED comparison still ticks the token; an unanswered or failed one does not", (() => {
    const leg = trimLeg(0, BONK, "BONK", 300);
    const aged = deriveTrimRows({ legs: [leg], nowMs: NOW, assets: [], assessments: { [leg.legId]: assessment({ expiresAt: new Date(NOW + 2_000).toISOString() }) } });
    const none = deriveTrimRows({ legs: [leg], nowMs: NOW, assets: [], assessments: {} });
    // Its own step re-runs the comparison before any terms are shown — the same allowance the
    // Swap button gets — so its age is not a reason to untick it.
    return aged[0].sellable === true && none[0].sellable === false && none[0].blockedReason === TRIM_BLOCKED_REASON_DEFAULT;
  })(), "age is not a refusal");
  add("SWTR-6: a token that cannot be moved stays in the list with its reason, and can never be ticked", (() => {
    const leg = trimLeg(0, BONK, "BONK", 300);
    const rows = deriveTrimRows({
      legs: [leg], nowMs: NOW, assessments: { [leg.legId]: assessment() },
      assets: [
        { symbol: "BONK", role: "involved", mint: BONK, valueUsd: 300, actionability: "transferable" },
        { symbol: "FRZ", role: "involved", mint: "MintFrozen111111111111111111111111111111111", valueUsd: 900, actionability: "unavailable" },
      ] as never,
    });
    const frozen = rows.find((r) => r.symbol === "FRZ");
    return rows.length === 2 && frozen != null && frozen.leg === null && !frozen.sellable &&
      frozen.blockedReason === TRIM_BLOCKED_REASON.not_transferable && rows[0].symbol === "FRZ";
  })(), "listed, never sold");
  add("SWTR-7: Try Again is for what WENT WRONG — never what the user cancelled, a swap that may still land, or one that would be refused again", (() => {
    const failed = (failure: string) => ({ status: "failed", failure, signature: null }) as never;
    return !isTrimRetryable(failed("confirm_timeout")) && !isTrimRetryable(failed("verification_failed")) &&
      // The user's own no: declined in the wallet, cancelled, or never started because they stopped the run.
      !isTrimRetryable(failed("declined")) && !isTrimRetryable(failed("cancelled")) && !isTrimRetryable({ status: "not_started" }) &&
      isTrimRetryable(failed("plan_unavailable")) && isTrimRetryable(failed("submit_failed")) && isTrimRetryable(failed("expired")) &&
      isTrimRetryable({ status: "not_offered" }) &&
      !isTrimRetryable({ status: "confirmed", receivedTokens: "1", signature: "s" }) && !isTrimRetryable(undefined);
  })(), "retry what failed, not what was refused");
  add("SWTR-8: the summary's total is added EXACTLY — as integers, never through a float", (() =>
    sumTokenStrings(["1199.16", "799.44"], 6) === "1998.6" &&
    sumTokenStrings(["0.1", "0.2"], 6) === "0.3" &&
    sumTokenStrings(["4.276778", "0.000001"], 6) === "4.276779" &&
    sumTokenStrings([], 6) === "0" &&
    sumTokenStrings(["12", "not a number", "1.5"], 6) === "13.5" &&
    // Past the point a float can count: 9,007,199,254.740993 has no exact double.
    sumTokenStrings(["9007199254.740993", "0.000001"], 6) === "9007199254.740994")(), "exact total");
  add("SWTR-9: each token's turn is the ORDINARY swap step — judged alone, started for the user, reporting its end", (() => {
    const flow = stripComments(readSrc("src/components/trim/TrimFlowSection.tsx"));
    const section = stripComments(readSrc("src/components/swapExecution/SwapExecutionSection.tsx"));
    // No second way to build, verify or sign: the Trim flow mounts the same section, and nothing
    // in it touches a plan, a wallet or a transaction itself.
    const sameStep = /<SwapExecutionSection[\s\S]{0,500}perLegApproval\s+autoStart\s+onSettled=\{onSettled\}/.test(flow) &&
      !/useSwapExecutionPlan|useWalletSwapSubmitter|useWallet\(|sendTransaction|signTransaction|fetchSwapExecutionPlan/.test(flow);
    // Its comparison is fetched at its own turn, so no token is held to a quote that aged
    // while the ones before it were being approved.
    const freshQuote = /useSwapQuoteComparison\(legs, \{ enabled: true, slippageBps, fetcher \}\)/.test(flow);
    // Auto-start goes through the same gate as a press, and reports "nothing to offer" otherwise.
    const gated = /if \(at\.kind === "swap" \|\| at\.kind === "wallet_unavailable"\) \{ autoStartedRef\.current = true; onSwap\(\); return; \}/.test(section) &&
      /onSettled\?\.\(\{ status: "not_offered" \}\);/.test(section);
    // Reported once, and the section then draws nothing — the host shows the result.
    const once = /if \(onSettled == null \|\| settledRef\.current\) return;/.test(section) &&
      /if \(onSettled != null && \(execution\.phase === "confirmed" \|\| execution\.phase === "failed"\)\) return null;/.test(section);
    return sameStep && freshQuote && gated && once;
  })(), "one way to swap");
  add("SWTR-10: a failure does not stop the run, Cancel does — and what was swapped stays accounted for", (() => {
    const flow = stripComments(readSrc("src/components/trim/TrimFlowSection.tsx"));
    // Every outcome advances, success or not, after the result has been on its row a moment.
    const advances = /setResults\(\(prev\) => \(prev\[key\] != null \? prev : \{ \.\.\.prev, \[key\]: result \}\)\);[\s\S]{0,200}setIndex\(\(i\) => i \+ 1\);[\s\S]{0,40}TRIM_ADVANCE_DELAY_MS/.test(flow);
    // Cancel with nothing done returns to the selector; otherwise the untouched tokens are
    // marked not started and the summary says so.
    const stops = /if \(!anySettled\) \{ setStage\("select"\); return; \}/.test(flow) &&
      /if \(next\[k\] == null\) next\[k\] = \{ status: "not_started" \};/.test(flow);
    // "Completed" only when every chosen token was swapped.
    const honestTitle = /swappedKeys\.length === 0 \? TRIM_SUMMARY_NONE_TITLE\s*: swappedKeys\.length === chosen\.length \? TRIM_SUMMARY_ALL_TITLE\s*: TRIM_SUMMARY_SOME_TITLE/.test(flow);
    // And a pending swap means the summary may not say that nothing moved.
    // It is said in the Info banner the review already uses, not as a loose centred line.
    const pendingAware = /swappedKeys\.length === 0 \? \(\s*<InfoBanner title=\{pending \? TRIM_SUMMARY_PENDING_NOTE : TRIM_SUMMARY_NONE_DESC\} \/>/.test(flow);
    return advances && stops && honestTitle && pendingAware;
  })(), "carry on, account for everything");
  add("SWTR-11: only a Trim naming SEVERAL tokens gets the selector; one token goes straight to its terms, labelled Trim", (() => {
    const modal = stripComments(readSrc("src/components/SuggestionReviewModal.tsx"));
    const multi = /swapAction\.legs\.length > 1 &&\s*swapAction\.legs\.every\(\(l\) => l\.suggestionCategory === "trim"\)/.test(modal) &&
      /hostShowsPlan=\{trimLegs != null\}/.test(modal) && /\{trimFlow\}/.test(modal);
    const single = /continueLabel=\{swapLeg\.suggestionCategory === "trim" \? TRIM_ACTION_LABEL : undefined\}/.test(modal);
    // The step header has no back control where going back makes no sense.
    const noDeadBack = /\{onBack && \(\s*<button type="button" className="review-modal__back"/.test(modal);
    // The gallery's presets have nothing to run against.
    const galleryInert = /canRun=\{swapQuotePresetAssessments == null\}/.test(modal);
    return multi && single && noDeadBack && galleryInert && TRIM_ACTION_LABEL === "Trim";
  })(), "selector for several, straight through for one");
  add("SWTR-12: the Trim copy says the user picks and the user approves — WealthSmith sells nothing", (() => {
    const all = [TRIM_SELECT_TITLE, TRIM_SELECT_INTRO, trimSelectCta(1), trimSelectCta(3), TRIM_SUMMARY_ALL_TITLE, TRIM_SUMMARY_SOME_TITLE, TRIM_SUMMARY_NONE_TITLE, TRIM_SUMMARY_NONE_DESC, TRIM_SUMMARY_PENDING_NOTE, trimSummaryReceived("1,998.60", 2, 3), ...Object.values(TRIM_BLOCKED_REASON)].join(" ");
    return TRIM_SELECT_TITLE === "Select Tokens to Trim" &&
      /You approve them one at a time/.test(TRIM_SELECT_INTRO) &&
      trimSelectCta(1) === "Trim 1 Token" && trimSelectCta(3) === "Trim 3 Tokens" &&
      trimRunTitle(1, 2) === "Review Swap \u00b7 1 of 2" &&
      trimSummaryReceived("1,998.60", 2, 3) === "You received 1,998.60 USDC from 2 of 3 tokens." &&
      // Never WealthSmith as the actor, and never a verdict on a token.
      !/WealthSmith (will|sells|sold|swaps|swapped|trims|trimmed)|we (sold|swapped|sell)|scam|risky|bad token/i.test(all) &&
      // A blocked sale is about THIS amount where a smaller one might pass.
      /for this amount/.test(TRIM_BLOCKED_REASON.price_impact_high) && /for this amount/.test(TRIM_BLOCKED_REASON.estimated_cost_high);
  })(), "the user picks, the user approves");

  /* ---- Analytics for the swap and Trim flows (SWTR-13..16) ----
   * The swap events existed for weeks with nothing receiving them: the first real swap left no
   * trace. These pin the seam that carries them, and that a Trim reports COUNTS and nothing else. */
  add("SWTR-13: a Trim's summary counts every chosen token exactly once — swapped, failed, or cancelled by the user", (() => {
    const failed = (failure: string) => ({ status: "failed", failure, signature: null }) as never;
    const e = trimFinishedEvent(["a", "b", "c", "d", "e", "f"], {
      a: { status: "confirmed", receivedTokens: "1", signature: "s" },
      b: failed("plan_unavailable"),
      c: failed("declined"),
      d: { status: "not_started" },
      e: { status: "not_offered" },
      // f never got a result at all: the run was stopped before its turn.
    });
    if (e.name !== "trim_finished") return false;
    return e.selected === 6 && e.swapped === 1 && e.failed === 2 && e.cancelled === 3 && e.stopped === true &&
      e.swapped + e.failed + e.cancelled === e.selected &&
      // A clean run is not "stopped".
      (trimFinishedEvent(["a"], { a: { status: "confirmed", receivedTokens: null, signature: null } }) as { stopped: boolean }).stopped === false;
  })(), "every token accounted for");
  add("SWTR-14: Trim events carry COUNTS ONLY — never a token, a mint, an amount, an address or a signature", (() => {
    const src = stripComments(readSrc("src/suggestions/swapExecution/trimEvents.ts"));
    const union = src.slice(src.indexOf("export type TrimEvent ="), src.indexOf("export type TrimEventName"));
    // Every field of every event is `name`, a number, or a boolean. A string field is how a
    // symbol or a mint would get in, and what someone holds fingerprints a wallet.
    const fields = [...union.matchAll(/(\w+): (\w+|"[a-z_]+")/g)].map((m) => [m[1], m[2]]);
    const onlyCounts = fields.length > 0 && fields.every(([k, t]) => (k === "name" ? /^"trim_/.test(t) : t === "number" || t === "boolean"));
    const built = trimFinishedEvent(["k"], { k: { status: "confirmed", receivedTokens: "1998.60", signature: "5h3...sig" } });
    const leaks = JSON.stringify(built);
    return onlyCounts && !/1998|sig|receivedTokens|signature|mint|symbol/.test(leaks) &&
      Object.values(built).every((v) => typeof v === "number" || typeof v === "boolean" || v === "trim_finished");
  })(), "counts, nothing else");
  add("SWTR-15: the flows emit to the HOST's receiver — and import no analytics transport themselves", (() => {
    const seam = readSrc("src/components/swapExecution/swapFlowEvents.ts");
    const section = stripComments(readSrc("src/components/swapExecution/SwapExecutionSection.tsx"));
    const flow = stripComments(readSrc("src/components/trim/TrimFlowSection.tsx"));
    // Nothing is emitted unless a host provides a receiver: the default is null.
    const defaultNull = /createContext<SwapFlowEmitter \| null>\(null\)/.test(seam);
    // The swap step uses the caller's emitter, else the host's — so a single swap reports too.
    const swapUses = /const flowEmit = useContext\(SwapFlowEventsContext\);/.test(section) && /emit: props\.emit \?\? flowEmit \?\? undefined,/.test(section);
    // The Trim flow reports the selector, each run, and each summary.
    const trimEmits = /emit\?\.\(\{ name: "trim_selector_opened", listed: rows\.length, sellable: sellable\.length \}\);/.test(flow) &&
      /emit\?\.\(\{ name: "trim_started", selected: keys\.length, retry: !fresh \}\);/.test(flow) &&
      /emit\?\.\(trimFinishedEvent\(chosen, results\)\);/.test(flow);
    const noTransport = [seam, section, flow, readSrc("src/suggestions/swapExecution/trimEvents.ts")].every((f) => !/posthog|analytics\/analytics/i.test(stripComments(f)));
    return defaultNull && swapUses && trimEmits && noTransport;
  })(), "one seam, no transport");
  add("SWTR-16: a summary is reported ONCE per run — a re-render does not count it again, and a Try Again run is reported as its own", (() => {
    const flow = stripComments(readSrc("src/components/trim/TrimFlowSection.tsx"));
    return /if \(stage !== "summary"\) \{ reportedRunRef\.current = null; return; \}/.test(flow) &&
      /if \(reportedRunRef\.current === runKey\) return;\s*reportedRunRef\.current = runKey;/.test(flow);
  })(), "once per run");

  // AFTER A SWAP LANDS, ITS SUGGESTION GOES. Found in the live Trim test (2026-11-26): closing
  // "Trim Completed" left the same suggestion on the dashboard until Refresh was pressed.
  add("SWTR-17: the swap step reports 'sent' then 'landed', once each, and 'landed' is never downgraded", (() => {
    const sec = stripComments(readSrc("src/components/swapExecution/SwapExecutionSection.tsx"));
    return /const progress: SwapProgress \| null = shownPhase === "confirmed" \? "landed" : shownPhase === "confirming" \? "sent" : null;/.test(sec) &&
      /if \(progress == null \|\| reportedProgressRef\.current === progress \|\| reportedProgressRef\.current === "landed"\) return;/.test(sec) &&
      /onSwapProgressRef\.current\?\.\(progress\);/.test(sec);
  })(), "sent → landed");
  add("SWTR-18: both the single swap and every token of a Trim report it to the rail", (() => {
    const modal = stripComments(readSrc("src/components/SuggestionReviewModal.tsx"));
    const flow = stripComments(readSrc("src/components/trim/TrimFlowSection.tsx"));
    const rail = stripComments(readSrc("src/components/RealWalletSuggestionsRail.tsx"));
    return (modal.match(/onSwapProgress=\{onSwapProgress\}/g) ?? []).length === 2 &&
      /onSwapProgress=\{props\.onSwapProgress\}/.test(flow) && /onSwapProgress=\{onSwapProgress\}/.test(flow) &&
      (rail.match(/onSwapProgress=\{onSwapProgress\}/g) ?? []).length === 2;
  })(), "wired through");
  add("SWTR-19: closing a review whose swap landed hides that suggestion and re-reads the wallet; one that was only sent re-reads without hiding", (() => {
    const rail = stripComments(readSrc("src/components/RealWalletSuggestionsRail.tsx"));
    const onClose = /if \(opened != null && progress != null\) \{[\s\S]{0,200}if \(progress === "landed"\) \{\s*const stamp = portfolioStampOf\(opened\.swapAction\);\s*setActed\(\(prev\) => \(\{ \.\.\.prev, \[opened\.id\]: stamp \}\)\);\s*\}[\s\S]{0,200}requestWalletPortfolioRefresh\(\);\s*\}\s*setOpened\(null\);/.test(rail);
    // Nothing sent → nothing hidden and no re-read: a declined or failed swap leaves the card.
    const onlyAfterSwap = /const progress = swapProgressRef\.current;\s*swapProgressRef\.current = null;/.test(rail);
    return onClose && onlyAfterSwap;
  })(), "hide + refresh on close");
  add("SWTR-20: the suggestion stays hidden only while the rail is still built from the read the swap was made from", (() => {
    const rail = stripComments(readSrc("src/components/RealWalletSuggestionsRail.tsx"));
    const filter = /rail\.cards\.filter\(\(c\) => acted\[c\.id\] == null \|\| portfolioStampOf\(rail\.swapActionById\?\.\[c\.id\]\) !== acted\[c\.id\]\)/.test(rail);
    const stamp = /swapAction\?\.status === "ready" \? swapAction\.legs\.map\(\(l\) => l\.generatedAt\)\.join\("\|"\) : ""/.test(rail);
    // The stamp is the time of the portfolio read, not of a price tick.
    const fromRead = /generatedAt: new Date\(pricedAsOf \?\? Date\.now\(\)\)\.toISOString\(\)/.test(readSrc("src/suggestions/useRailSuggestions.ts"));
    const shown = /cards: visibleCards,/.test(rail) && /suggestions_count: visibleCards\.length/.test(rail) &&
      /const awaitingFreshRead = rail != null && rail\.available && rail\.cards\.length > 0 && visibleCards\.length === 0;/.test(rail) &&
      /if \(rail\?\.loading \|\| awaitingFreshRead\)/.test(rail);
    return filter && stamp && fromRead && shown;
  })(), "same read → hidden; newer read → the engine decides");

  // EVERY TRIM STATE IN ONE PLACE (the walkthrough's `?trim=…`). A review surface is only worth
  // keeping if it cannot quietly lose a state.
  add("SWTR-21: the walkthrough lists every Trim state — start, selector, both run steps and each kind of summary", (() => {
    const page = readSrc("src/pages/SwapWalkthroughPage.tsx");
    const keys = [...page.matchAll(/\{ key: "([a-z-]+)", group: "(Start|Choose tokens|Swapping|Summary)"/g)].map((m) => m[1]);
    const must = ["review", "single", "listed", "select", "select-listed", "select-frozen", "select-none", "run-first", "run-second",
      "done-all", "done-unread", "partly-failed", "partly-declined", "partly-stopped", "partly-reverted", "partly-pending",
      "none-failed", "none-declined", "none-pending"];
    return must.every((k) => keys.includes(k)) && new Set(keys).size === keys.length &&
      /autoOpenId=\{trimState != null \? trimCardId : undefined\}/.test(page) && /trimPreset=\{trimState\?\.preset\}/.test(page);
  })(), "19 states");
  add("SWTR-22: a preset state is applied once, after the routes answer, and only review surfaces can set one", (() => {
    const flow = stripComments(readSrc("src/components/trim/TrimFlowSection.tsx"));
    const rail = stripComments(readSrc("src/components/RealWalletSuggestionsRail.tsx"));
    const once = /if \(preset == null \|\| presetAppliedRef\.current \|\| !answered\) return;\s*presetAppliedRef\.current = true;/.test(flow);
    const opensOnce = /if \(autoOpenId == null \|\| autoOpenedRef\.current \|\| !rail \|\| !rail\.available\) return;/.test(rail) && /autoOpenedRef\.current = true;\s*onReviewSuggestion\(card\);/.test(rail);
    // The app's own pages never pass either prop.
    const appPages = ["src/pages/DashboardPage.tsx", "src/pages/PortfolioPage.tsx", "src/pages/DemoDashboardPage.tsx", "src/App.tsx"]
      .map((f) => { try { return readSrc(f); } catch { return ""; } }).join("\n");
    return once && opensOnce && !/trimPreset|autoOpenId/.test(appPages);
  })(), "review surfaces only");

  return checks;
}
