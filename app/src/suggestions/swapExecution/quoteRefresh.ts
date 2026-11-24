/**
 * quoteRefresh — what happens when the countdown reaches zero.
 *
 * THE PROBLEM THIS SOLVES. A plan lives 25 seconds because it holds a real, simulated
 * transaction with a blockhash — not a price we could quietly replace. So unlike a wallet's swap
 * panel, which re-quotes continuously and never shows a clock, we genuinely have something that
 * runs out. The old behaviour dumped the reader into a terminal "These terms expired" state with
 * a Refresh button, which is a dead end created by our architecture rather than by anything they
 * did.
 *
 * So the countdown now describes a refresh that actually happens: at zero we silently prepare a
 * new plan and the clock restarts. The copy — "Quote refreshes in 0:18" — is true.
 *
 * WHY IT IS CAPPED. Our refresh is not a price poll. Each one is a provider round trip, a chain
 * simulation and the whole verification chain, and it runs whether or not anyone is reading. A
 * sheet left open on a forgotten tab must not re-simulate forever, so after a few attempts the
 * flow falls through to the expired state exactly as before. Someone who has not approved after
 * a minute and a half is not reading it.
 *
 * Pure, so the rule is exercised by running it rather than by reasoning about a timer.
 */
import type { ExecutionPhase } from "./executionLifecycle";

/**
 * How many times a plan may renew itself before the sheet gives up and expires.
 *
 * Three is roughly 75 seconds of reading time. Past that the refreshes are almost certainly
 * being spent on an abandoned tab.
 */
export const MAX_AUTO_REFRESHES = 3;

export type ExpiryDecision = "auto_refresh" | "expire";

export interface ExpiryContext {
  phase: ExecutionPhase;
  /** How many times this flow has already renewed itself. */
  autoRefreshCount: number;
  /**
   * Whether the page is hidden. A hidden tab gets no refresh: nobody is reading the terms, and
   * expiring is both cheaper and safe — they return to the Refresh button, which is the state
   * this feature exists to avoid only for people who are actually looking at it.
   */
  documentHidden: boolean;
  /** Absent when the caller cannot refresh (no wallet, not enabled). Then there is no choice. */
  canPrepare: boolean;
}

/**
 * Phases a quote may renew itself from.
 *
 * `ready` is the real case — terms on screen, waiting on a decision. `verifying` is included
 * because a plan whose verification outlived its own TTL is stale by the time it would be
 * offered, and renewing beats showing terms that expired before they appeared.
 *
 * Everything from `signing` onward is deliberately absent. Once the user has pressed Approve the
 * transaction is the wallet's and then the chain's, and replacing the plan underneath them would
 * mean the thing they authorised is not the thing we hold. The reducer already refuses `expire`
 * after submission; this is the same rule stated where the refresh decision is made, because a
 * refresh is not an expiry and would not be caught by that refusal.
 */
const REFRESHABLE_PHASES: readonly ExecutionPhase[] = ["ready", "verifying"];

export function decideOnExpiry(ctx: ExpiryContext): ExpiryDecision {
  if (!ctx.canPrepare) return "expire";
  if (!REFRESHABLE_PHASES.includes(ctx.phase)) return "expire";
  if (ctx.documentHidden) return "expire";
  if (ctx.autoRefreshCount >= MAX_AUTO_REFRESHES) return "expire";
  return "auto_refresh";
}
