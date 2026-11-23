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

export interface ExecutionEligibilityInput {
  assessment: SwapQuoteComparisonAssessment;
  /** From Protocol Logic. Anything other than `in_app_confirm` is a handoff — including absent. */
  handoffType: string | null | undefined;
  /** Legs in the whole action. The Boundary allows one transaction doing one thing. */
  totalLegs: number;
  nowMs: number;
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

  // 3. A single resolved route. "selected" is the only status that means one route won outright;
  //    partial_comparison and only_route_available are real outcomes, but they describe a
  //    comparison we could not complete, and a degraded quote falls back to handoff.
  const selected =
    assessment.status === "selected" && assessment.selectedProviderId != null
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
