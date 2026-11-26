/**
 * executionEligibility — Phase 1. The Execution Boundary, as a predicate.
 *
 * `rules/wallet-and-custody-rules.md` → Execution Boundary states five conditions a suggestion
 * must meet before it may be executed in-app. This file is their only implementation. Without
 * it the Boundary is prose that people remember differently six months apart; with it, "can
 * this be executed?" has exactly one answer and a fixture asserting it.
 *
 * The function is DENY-BY-DEFAULT and returns reasons, not a boolean. A caller that cannot say
 * why something was refused will eventually ship a confirm button it cannot justify.
 *
 * Nothing here decides whether execution is a good idea — only whether it is permitted. The
 * engine owns what to suggest; this owns whether the suggestion may carry a confirm step.
 */
import type {
  SwapQuoteComparisonAssessment,
  SwapQuoteCandidate,
} from "../swapQuote/swapQuoteContracts";
import type { ExecutionBlockReason } from "./executionContracts";

/**
 * Providers whose routes we can construct a COMPLETE transaction for.
 *
 * Jupiter only, today. Raydium and Orca appear as execution surfaces in the quote comparison —
 * a user may be shown "Raydium is the better route" — but being the better route does not make
 * it executable here. Showing a route and building its transaction are different capabilities,
 * and conflating them is how a confirm button ends up over a route nobody can build.
 */
export const EXECUTABLE_PROVIDER_IDS: readonly string[] = ["jupiter"] as const;

/**
 * Minimum life left on a quote before we will put a confirm step in front of someone.
 *
 * Signing is not instant: the user reads the terms, the wallet opens, they approve. A quote with
 * four seconds left is honest at render and a lie by the time it is signed, so it is refused as
 * expired rather than shown with a countdown nobody can win.
 */
export const MIN_QUOTE_LIFE_MS = 10_000;

/**
 * Comparison outcomes that may carry a confirm step.
 *
 * `only_route_available` is deliberately absent: one surviving route is not a comparison, so
 * nothing verified that it is the best one. `no_valid_route`, `not_ready_for_quote`,
 * `not_required` and `unresolved` are absent for the same reason — there is nothing to approve.
 */
export const COMPARISON_STATUSES_ALLOWING_EXECUTION: ReadonlySet<string> = new Set([
  "selected",
  "partial_comparison",
]);

/**
 * How many eligible candidates make a comparison. Two is the minimum at which "this one won"
 * means anything; it is also what keeps `partial_comparison` honest, since that status covers
 * both "one provider was down" and "only one route survived at all".
 */
export const MIN_ELIGIBLE_FOR_COMPARISON = 2;

/**
 * Comparison outcomes that may carry a confirm step when a SINGLE surviving route is permitted
 * (see `allowSingleRoute`). `only_route_available` joins the list; nothing else does.
 */
export const SINGLE_ROUTE_STATUSES_ALLOWING_EXECUTION: ReadonlySet<string> = new Set([
  "selected",
  "partial_comparison",
  "only_route_available",
]);

export interface ExecutionEligibilityInput {
  assessment: SwapQuoteComparisonAssessment;
  /** From Protocol Logic. Anything other than `in_app_confirm` is a handoff — including absent. */
  handoffType: string | null | undefined;
  /** Legs in the whole action. The Boundary allows one transaction doing one thing. */
  totalLegs: number;
  nowMs: number;
  /**
   * Permit a route that is the ONLY eligible one — no second quote to compare it with.
   *
   * Off by default, and off for every swap between assets with deep, widely quoted markets:
   * there, a lone quote means providers were down, and "this is the best route" would be a
   * claim nothing verified.
   *
   * On for Trim (decided 2026-11-26). Trim SELLS long-tail tokens the user already holds, and
   * for those a single route is the normal case, not an outage: in a probe of eleven real
   * tokens the aggregator was the only acceptable route for five. Refusing them would leave
   * Trim working for a handful of large tokens. Every other check still applies — price
   * impact, total cost, complete terms, the simulation and the on-chain minimum.
   *
   * The Trim selector does NOT say which tokens had a single route (a line doing so was
   * removed by product decision, 2026-11-26): the token's own terms are what the user approves,
   * and those are identical in kind whether one route was found or three.
   */
  allowSingleRoute?: boolean;
}

export interface ExecutionEligibility {
  executable: boolean;
  /** Empty only when executable. Ordered as evaluated, so the first is the most fundamental. */
  blockReasons: ExecutionBlockReason[];
  /** The candidate that would be executed, when one qualifies. */
  selectedCandidate: SwapQuoteCandidate | null;
}

const notExecutable = (reasons: ExecutionBlockReason[]): ExecutionEligibility => ({
  executable: false,
  blockReasons: reasons,
  selectedCandidate: null,
});

/**
 * Evaluate the Execution Boundary. Deny by default.
 *
 * Order matters: the authority question (did Protocol Logic permit this at all?) is asked before
 * anything about the route, so a misconfigured rail can never be rescued by a good quote.
 */
export function deriveExecutionEligibility(input: ExecutionEligibilityInput): ExecutionEligibility {
  const { assessment, handoffType, totalLegs, nowMs } = input;
  const reasons: ExecutionBlockReason[] = [];

  // 1. Permission. Assigned by Protocol Logic, never inferred, never upgraded by the UI.
  //    An unknown or missing handoff type is a handoff.
  if (handoffType !== "in_app_confirm") {
    return notExecutable(["not_in_app_confirm"]);
  }

  // 2. One transaction doing one thing. A multi-leg action is several transactions, which the
  //    Boundary excludes — not because it is impossible, but because "approve this" stops being
  //    a single honest question.
  if (!Number.isFinite(totalLegs) || totalLegs !== 1) {
    reasons.push("multi_leg");
  }

  // 3. A real comparison with a winner.
  //
  //    `selected` means all three providers were compared. `partial_comparison` means some were
  //    unavailable — but if at least two were eligible and one won, a genuine comparison still
  //    happened, and the winner's terms are no less true because a third provider was down.
  //    Requiring all three would gate execution on every provider being up, every time.
  //
  //    `only_route_available` stays blocked, and the MIN_ELIGIBLE_FOR_COMPARISON check below is
  //    what enforces it: one surviving route is not a comparison, so "this is the best route"
  //    would be a claim nothing verified.
  //
  //    What this does concede: with a provider unavailable we cannot know whether IT would have
  //    been cheaper. That is true of any absent provider, and the user is shown which ones were
  //    actually compared.
  const eligibleCount = assessment.candidates.filter((c) => c.eligible).length;
  const comparedWithWinner = input.allowSingleRoute === true
    // A lone eligible route, where the caller's policy permits one. Still a SELECTED route:
    // the comparison ran, and this is what survived it.
    ? SINGLE_ROUTE_STATUSES_ALLOWING_EXECUTION.has(assessment.status) &&
      assessment.selectedProviderId != null &&
      eligibleCount >= 1
    : COMPARISON_STATUSES_ALLOWING_EXECUTION.has(assessment.status) &&
      assessment.selectedProviderId != null &&
      eligibleCount >= MIN_ELIGIBLE_FOR_COMPARISON;
  const selected = comparedWithWinner
    ? assessment.candidates.find((c) => c.providerId === assessment.selectedProviderId) ?? null
    : null;
  if (selected == null) {
    reasons.push("no_selected_route");
  }

  // 4. A provider whose transaction we can actually build.
  if (selected != null && !EXECUTABLE_PROVIDER_IDS.includes(selected.providerId)) {
    reasons.push("provider_not_executable");
  }

  // 5. Verified liquidity. "unresolved" is not "probably fine" — it is the absence of a check,
  //    and the Boundary requires terms we can stand behind.
  if (selected != null && selected.liquidityAssessment?.status !== "verified") {
    reasons.push("liquidity_unverified");
  }

  // 6. Complete terms. Everything the user commits to must exist as a real number before a
  //    confirm step may render. minimumOutputTokens is the one they are actually guaranteed.
  const termsComplete =
    assessment.minimumOutputTokens != null &&
    assessment.expectedOutputTokens != null &&
    selected != null &&
    typeof selected.priceImpactPct === "number" &&
    Number.isFinite(selected.priceImpactPct);
  if (!termsComplete) {
    reasons.push("terms_incomplete");
  }

  // 7. Enough life left to sign against honestly.
  const expiry = assessment.expiresAt != null ? Date.parse(assessment.expiresAt) : NaN;
  if (!Number.isFinite(expiry) || expiry - nowMs < MIN_QUOTE_LIFE_MS) {
    reasons.push("quote_expired");
  }

  if (reasons.length > 0) return notExecutable(reasons);
  return { executable: true, blockReasons: [], selectedCandidate: selected };
}

/**
 * Convenience for the rail: executable, or not. Prefer `deriveExecutionEligibility` anywhere the
 * reason could be shown, logged, or argued about later.
 */
export function isExecutable(input: ExecutionEligibilityInput): boolean {
  return deriveExecutionEligibility(input).executable;
}
