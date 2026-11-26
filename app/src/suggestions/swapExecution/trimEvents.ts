/**
 * trimEvents — what a multi-token Trim reports to analytics.
 *
 * COUNTS ONLY. Never a token, a mint, an amount, a balance, a wallet address or a signature: a
 * list of what someone holds fingerprints a wallet as surely as its address does, and nothing
 * here needs it. What these answer is whether the flow works for people — how many tokens a
 * Trim lists, how many can be sold, how many get chosen, and how a run ends.
 *
 * Each token's own swap is already covered by the swap funnel (`swapExecutionEvents`): its
 * `swap_confirm_opened` carries `category: "trim"`, and the rest of that token's events follow.
 * These three sit around it and are never a second count of the same swap.
 */
import type { TrimResult } from "./trimFlow";

export type TrimEvent =
  /** The selector was opened from a Trim review. `sellable` of the `listed` tokens can be ticked. */
  | { name: "trim_selector_opened"; listed: number; sellable: number }
  /** A run began. `retry` is a Try Again from the summary, over the tokens that failed. */
  | { name: "trim_started"; selected: number; retry: boolean }
  /**
   * A run reached its summary. `selected` tokens were chosen in all; `stopped` means the user
   * cancelled before every token had its turn. A decline in the wallet counts under `cancelled`.
   */
  | { name: "trim_finished"; selected: number; swapped: number; failed: number; cancelled: number; stopped: boolean };

export type TrimEventName = TrimEvent["name"];

/** The summary's counts, from the outcomes. Pure, so the split is testable without a screen. */
export function trimFinishedEvent(chosen: readonly string[], results: Readonly<Record<string, TrimResult | undefined>>): TrimEvent {
  let swapped = 0, failed = 0, cancelled = 0, stopped = false;
  for (const key of chosen) {
    const r = results[key];
    if (r == null || r.status === "not_started") { cancelled += 1; stopped = true; continue; }
    if (r.status === "confirmed") { swapped += 1; continue; }
    if (r.status === "failed" && (r.failure === "declined" || r.failure === "cancelled")) { cancelled += 1; continue; }
    failed += 1;
  }
  return { name: "trim_finished", selected: chosen.length, swapped, failed, cancelled, stopped };
}
