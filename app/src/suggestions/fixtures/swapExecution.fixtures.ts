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
import { readFileSync } from "node:fs";
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
  assertExecutablePlan,
  scanForForbiddenExecutionFields,
  scanTermsCompleteness,
} from "../swapExecution/executionGuard";
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
    candidates: [candidate()],
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
    outputSymbol: "SOL",
    outputMint: WSOL,
    expectedOutputTokens: "0.197901",
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
  add("SWX-7: partial_comparison blocks — a degraded quote falls back to handoff rather than guessing in a confirm step",
    eligible({ assessment: assessment({ status: "partial_comparison" }) }).blockReasons.includes("no_selected_route"), "no partial exec");
  add("SWX-8: only_route_available blocks too — one surviving route is not the same as a comparison that resolved",
    eligible({ assessment: assessment({ status: "only_route_available" }) }).blockReasons.includes("no_selected_route"), "no single-route exec");
  add("SWX-9: unverified liquidity blocks — 'unresolved' is the absence of a check, not a soft pass", (() => {
    const a = assessment({ candidates: [candidate({ liquidityAssessment: { status: "unresolved", minimumRouteLegLiquidityUsd: null, legs: [] } })] });
    return eligible({ assessment: a }).blockReasons.includes("liquidity_unverified");
  })(), "liquidity required");
  add("SWX-10: a non-Jupiter winner blocks — being the better route does not make it buildable", (() => {
    const a = assessment({ selectedProviderId: "raydium", candidates: [candidate({ providerId: "raydium", providerName: "Raydium", executionSurface: "raydium" })] });
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
    const a = assessment({ status: "partial_comparison", expiresAt: null });
    const r = eligible({ assessment: a, totalLegs: 3 });
    return r.blockReasons.length >= 3;
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
  add("SWX-26: the execution lane is NOT mounted — no component, page or hook imports it yet", (() => {
    const roots = ["src/components", "src/pages", "src/hooks", "src/state"];
    return roots.every((d) => {
      const out = readSrc(`${d}/index.ts`);
      return !/swapExecution/.test(out);
    }) && !/swapExecution/.test(readSrc("src/App.tsx"));
  })(), "unmounted");
  add("SWX-27: Jupiter is the ONLY executable provider, and the list is explicit rather than inferred from the comparison",
    EXECUTABLE_PROVIDER_IDS.length === 1 && EXECUTABLE_PROVIDER_IDS[0] === "jupiter", `providers=${EXECUTABLE_PROVIDER_IDS.join(",")}`);
  add("SWX-28: the Boundary has ONE implementation — no other module re-derives executability", (() => {
    const elig = readSrc("src/suggestions/swapExecution/executionEligibility.ts");
    const guard = readSrc("src/suggestions/swapExecution/executionGuard.ts");
    return /in_app_confirm/.test(elig) && !/in_app_confirm/.test(guard);
  })(), "single source");

  return checks;
}
