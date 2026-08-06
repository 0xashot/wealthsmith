/**
 * Observation-card + condition-keyed dismissal fixtures (OBS).
 * Extracted from suggestionEngine.fixtures.ts as part of the monolith split —
 * see fixtureCheck.ts for the pattern.
 */
import { readFileSync } from "fs";
import type { FixtureCheck } from "./fixtureCheck";
import {
  buildDismissalSignature,
  dismissSignature,
  isSignatureDismissed,
  resetDismissedSuggestions,
} from "../../state/dismissedSuggestions";
import { selectTopPick } from "../topPick";
import { deriveStableValue as wsStableValue } from "../../wallet/walletSummary";
import { POSITION_IDENTITY as EP_POS_ID } from "../klendDirectLendingPosition";

/* ------------------------------------------------------------------ *
 * OBSERVATION cards + condition-keyed dismissal. An observation ("Review Yield
 * Positions") asks the user to NOTICE something, not to do something: it gets a
 * quieter rail group, is never Top Pick, and can be acknowledged — but the
 * acknowledgement is keyed to the CONDITION, so it re-raises on a material change.
 * ------------------------------------------------------------------ */
export function runObservationDismissalFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const sig = (over: Partial<{ id: string; share: number | null; apy: number | null; reasons: string[] }> = {}) =>
    buildDismissalSignature("position_optimization", [{
      positionId: over.id ?? "pos-1",
      portfolioSharePct: over.share === undefined ? 85.1 : over.share,
      apyPct: over.apy === undefined ? 4.19 : over.apy,
      reasons: over.reasons ?? ["po_position_concentration"],
    }]);

  // --- Signature stability: immaterial drift must NOT re-raise ---
  add("OBS-1: identical conditions produce an identical signature", sig() === sig(), "stable");
  add("OBS-2: a small share move within the bucket does NOT re-raise", sig({ share: 85.1 }) === sig({ share: 89.9 }), "same bucket");
  add("OBS-3: a small APY move within the bucket does NOT re-raise", sig({ apy: 4.19 }) === sig({ apy: 4.99 }), "same bucket");
  add("OBS-4: signature order does not depend on reason order", (() => {
    const a = buildDismissalSignature("k", [{ positionId: "p", reasons: ["b", "a"] }]);
    const b = buildDismissalSignature("k", [{ positionId: "p", reasons: ["a", "b"] }]);
    return a === b;
  })(), "order-insensitive");
  add("OBS-5: position order does not change the signature", (() => {
    const a = buildDismissalSignature("k", [{ positionId: "p1" }, { positionId: "p2" }]);
    const b = buildDismissalSignature("k", [{ positionId: "p2" }, { positionId: "p1" }]);
    return a === b;
  })(), "order-insensitive");

  // --- Re-raise: a MATERIAL change must produce a different signature ---
  add("OBS-6: crossing a concentration bucket RE-RAISES", sig({ share: 85 }) !== sig({ share: 95 }), "re-raised");
  add("OBS-7: a material APY drop RE-RAISES", sig({ apy: 4.19 }) !== sig({ apy: 2.10 }), "re-raised");
  add("OBS-8: a NEW flagged reason RE-RAISES", sig() !== sig({ reasons: ["po_position_concentration", "po_position_low_yield"] }), "re-raised");
  add("OBS-9: a NEWLY flagged position RE-RAISES", (() => {
    const one = buildDismissalSignature("k", [{ positionId: "p1" }]);
    const two = buildDismissalSignature("k", [{ positionId: "p1" }, { positionId: "p2" }]);
    return one !== two;
  })(), "re-raised");
  add("OBS-10: unresolved share is its own bucket (becoming resolved re-raises)", sig({ share: null }) !== sig({ share: 85 }), "re-raised");

  // --- Store semantics ---
  add("OBS-11: dismissing hides ONLY the exact condition", (() => {
    resetDismissedSuggestions();
    dismissSignature(sig());
    const set = new Set([sig()]);
    return isSignatureDismissed(sig(), set) && !isSignatureDismissed(sig({ share: 95 }), set);
  })(), "exact only");
  add("OBS-12: a blank signature is never dismissible (actionable cards can't be hidden)", (() => {
    resetDismissedSuggestions();
    dismissSignature("");
    return !isSignatureDismissed(undefined, new Set()) && !isSignatureDismissed("", new Set([""]));
  })(), "not dismissible");
  add("OBS-13: reset clears every dismissal", (() => {
    dismissSignature(sig());
    resetDismissedSuggestions();
    return !isSignatureDismissed(sig(), new Set());
  })(), "cleared");

  // --- Card/engine contract ---
  add("OBS-14: an observation is NEVER promoted to Top Pick", (() => {
    const base: any = { id: "a", category: "position_optimization", is_actionable: true, action_kind: "review_only", scores: { impact: 1, urgency: 1, efficiency: 1 } };
    const obs = { ...base, observationOnly: true };
    const act = { ...base, id: "b", category: "buffer" };
    const picked = selectTopPick([obs, act] as any);
    return picked.find((p) => p.id === "a")?.is_top_pick === false && picked.find((p) => p.id === "b")?.is_top_pick === true;
  })(), "never top pick");
  add("OBS-15: only an observation carries a dismissal signature onto the card", (() => {
    const src = (() => { try { return readFileSync(`${process.cwd()}/src/suggestions/toSuggestionCard.ts`, "utf8"); } catch { return ""; } })();
    return /s\.observationOnly === true && s\.dismissalSignature \? \{ dismissalSignature/.test(src)
      && /observationOnly === true[\s\S]{0,40}"observation"/.test(src);
  })(), "observation only");
  add("OBS-16: the rail filters dismissed cards in the VIEW (engine stays pure)", (() => {
    const src = (() => { try { return readFileSync(`${process.cwd()}/src/components/SuggestionRail.tsx`, "utf8"); } catch { return ""; } })();
    return /isSignatureDismissed\(c\.dismissalSignature, dismissed\)/.test(src)
      && /actionability !== "observation"/.test(src) && /actionability === "observation"/.test(src);
  })(), "view-level");
  add("OBS-20: the /testing DCA tab covers the BTC/ETH contribution-split cards, built by PRODUCTION code", (() => {
    // The gallery must run the real split calculator + card builder, never a
    // hand-written card, so a policy change is visible there immediately.
    const fx = (() => { try { return readFileSync(`${process.cwd()}/src/pages/contributionSplitTestingFixtures.ts`, "utf8"); } catch { return ""; } })();
    const page = (() => { try { return readFileSync(`${process.cwd()}/src/pages/TestingPage.tsx`, "utf8"); } catch { return ""; } })();
    const usesProduction = /computeContributionAllocationSplit\(/.test(fx) && /buildContributionSplitCards\(/.test(fx);
    const noHandWrittenCard = !/title:\s*"Build (BTC|ETH|SOL) Gradually"/.test(fx);
    const noNetworkOrClock = !/fetch\(|Date\.now\(/.test(fx);
    const mountedOnDcaTab = /runAllContributionSplitTestingCases/.test(page) && /dca: dedupeByCardFace\(\[\.\.\.dcaEntries, \.\.\.splitEntries\]\)/.test(page);
    return usesProduction && noHandWrittenCard && noNetworkOrClock && mountedOnDcaTab;
  })(), "gallery coverage");
  add("OBS-19: a protocol position denominated in a stable mint counts as STABLE (not crypto)", (() => {
    // The canonical Kamino Direct row carries the underlying mint but no `legs`,
    // so the portfolio-wide split used to read $15k of lent USDC as 100% crypto.
    const klend: any = { id: "k", source: "kamino", type: "protocol", symbol: "USDC", mint: EP_POS_ID.liquidityMint,
      valueUsd: 15260.6, side: "supplied", existingPositionOnly: true, candidateId: "kamino_usdc_lending" };
    const sol: any = { id: "s", source: "wallet", type: "stake", symbol: "SOL", valueUsd: 2671.2 };
    const borrowed: any = { id: "b", source: "kamino", type: "protocol", symbol: "USDC",
      mint: EP_POS_ID.liquidityMint, side: "borrowed", valueUsd: 500 };
    // …and a BORROWED stable is a liability, never stable asset value.
    return Math.round(wsStableValue([klend, sol])) === 15261 && wsStableValue([borrowed]) === 0;
  })(), "protocol stable");
  add("OBS-18: a material Rebalance with NO renderable card must not silence the contribution plan", (() => {
    // The dead zone: `material` reflects the CALCULATION gate only. When the SOURCE
    // gate is blocked (every stablecoin protocol-held → existing-position-only) the
    // Rebalance card is null, so suppressing on materiality alone left the rail with
    // nothing but an observation.
    const src = (() => { try { return readFileSync(`${process.cwd()}/src/suggestions/useRailSuggestions.ts`, "utf8"); } catch { return ""; } })();
    return /rebalanceOverride\.material && rebalanceOverride\.card != null/.test(src);
  })(), "no dead zone");
  add("OBS-17: dismissal gates no suggestion, amount, or eligibility", (() => {
    // The store must be imported ONLY by the view + the signature producer — never
    // by an assessment/policy module that decides what to suggest.
    const files = ["src/suggestions/positionOptimizationAssessment.ts", "src/suggestions/suggestionEngine.ts", "src/wallet/safetyBufferCoverage.ts"];
    return files.every((f) => { try { return !/dismissedSuggestions/.test(readFileSync(`${process.cwd()}/${f}`, "utf8")); } catch { return true; } });
  })(), "no engine coupling");
  return checks;
}
