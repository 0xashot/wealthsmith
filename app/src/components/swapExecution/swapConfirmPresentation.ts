/**
 * swapConfirmPresentation — Phase 4. The confirm sheet's pure display rules.
 *
 * Separate from the component for the same reason the reducer is separate from the hook: the
 * fixture suite runs in Node, and `SwapConfirmSheet` imports the icon registry, which uses
 * Vite's `import.meta.glob` and cannot load there. Logic left inside the component could only
 * ever be source-scanned.
 *
 * So the rules that decide what a person actually reads — what an absent figure looks like, how
 * a countdown is written, which copy a failure gets — live here, where they are tested by
 * running them.
 */
import {
  SWAP_CONFIRM_DECLINED_DESC,
  SWAP_CONFIRM_DECLINED_TITLE,
  SWAP_CONFIRM_EXPIRED_DESC,
  SWAP_CONFIRM_EXPIRED_TITLE,
  SWAP_CONFIRM_SUBMIT_FAILED_DESC,
  SWAP_CONFIRM_SUBMIT_FAILED_TITLE,
  SWAP_CONFIRM_TIMEOUT_DESC,
  SWAP_CONFIRM_TIMEOUT_TITLE,
  SWAP_CONFIRM_UNAVAILABLE_DESC,
  SWAP_CONFIRM_UNAVAILABLE_TITLE,
  SWAP_CONFIRM_VERIFICATION_FAILED_DESC,
  SWAP_CONFIRM_VERIFICATION_FAILED_TITLE,
} from "../../state/approvedCopy";
import type { ExecutionFailureKey } from "../../suggestions/swapExecution/executionLifecycle";
import { pct, usd } from "../../suggestions/swapQuote/quotePresentation";

/** The placeholder for a figure we do not have. Never a zero, never a guess. */
const ABSENT = "—";

/** mm:ss for the expiry countdown. Clamped at zero; a negative countdown is not a countdown. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Percent and USD for display, delegating to the quote lane's formatters.
 *
 * Deliberately not reimplemented. The route section and this sheet render in the same modal, and
 * a second formatter here showed the same price impact as "0.01%" where the route section said
 * "0.008%". A swap's impact is routinely far below 0.01%, so that rounding was not a cosmetic
 * difference — it was a different number.
 *
 * The only thing added is the absent rule: null, undefined and NaN render as “—”, never a figure.
 */
export function formatPercent(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return ABSENT;
  return pct(value) ?? ABSENT;
}

export function formatUsd(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return ABSENT;
  return usd(value) ?? ABSENT;
}

/** Title and body for a terminal failure. `cancelled` has none — the sheet simply closes. */
export function failureCopy(failure: ExecutionFailureKey | null): { title: string; desc: string } | null {
  switch (failure) {
    case "declined":
      return { title: SWAP_CONFIRM_DECLINED_TITLE, desc: SWAP_CONFIRM_DECLINED_DESC };
    case "expired":
      // Its OWN title. Pairing "These terms expired" with "Couldn't prepare this swap" read as
      // an outage, which it is not — the terms were fine and simply ran out of time.
      return { title: SWAP_CONFIRM_EXPIRED_TITLE, desc: SWAP_CONFIRM_EXPIRED_DESC };
    case "verification_failed":
      return { title: SWAP_CONFIRM_VERIFICATION_FAILED_TITLE, desc: SWAP_CONFIRM_VERIFICATION_FAILED_DESC };
    case "submit_failed":
      return { title: SWAP_CONFIRM_SUBMIT_FAILED_TITLE, desc: SWAP_CONFIRM_SUBMIT_FAILED_DESC };
    case "confirm_timeout":
      return { title: SWAP_CONFIRM_TIMEOUT_TITLE, desc: SWAP_CONFIRM_TIMEOUT_DESC };
    case "plan_unavailable":
      return { title: SWAP_CONFIRM_UNAVAILABLE_TITLE, desc: SWAP_CONFIRM_UNAVAILABLE_DESC };
    case "cancelled":
      return null;
    default:
      return null;
  }
}
