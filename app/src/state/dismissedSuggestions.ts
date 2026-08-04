/**
 * dismissedSuggestions — lets a user acknowledge an INFORMATIONAL suggestion
 * ("I've reviewed this, I'm fine with it") without silencing it forever.
 *
 * THE KEY IDEA. A dismissal is stored against a SIGNATURE OF THE CONDITION that
 * produced the card, never against the card's id. The signature encodes the
 * facts the observation is actually about — which positions are flagged, how
 * concentrated they are, what they yield, and why they were flagged. So when the
 * situation materially changes, the engine produces a DIFFERENT signature, the
 * stored dismissal no longer matches, and the card comes back on its own. There
 * is no separate change-detection pass to keep in sync — re-raising falls out of
 * how the key is built.
 *
 * That is deliberate: "dismiss" must mean "I accept THIS situation", not "never
 * mention this category again". Acknowledging 85% concentration at 4.2% should
 * not stay quiet if it becomes 95%, or if the yield halves.
 *
 * Bucketing (below) is what stops the card from re-appearing on every trivial
 * tick — only a move across a bucket edge is treated as material. A position
 * sitting exactly on an edge can re-raise on a small move; that is the accepted
 * trade-off for a rule a user can actually predict.
 *
 * NOT CONSENT. This is UI state — a record that the user hid a card. It is never
 * read back as the user having accepted a risk, and it gates no suggestion,
 * eligibility rule, or amount.
 *
 * Session-only, like the rest of the prototype: dismissals do not survive a
 * reload. Persisting them is a backend task (see the handoff notes) and needs
 * the same treatment as goals — it is per-user data.
 */
import { useSyncExternalStore } from "react";

export const DISMISSAL_SIGNATURE_VERSION = "v1";

/**
 * Concentration bucket width, in percentage points. A flagged position must move
 * at least one bucket for the observation to count as materially changed.
 */
export const CONCENTRATION_BUCKET_PCT = 10;
/** APY bucket width, in percentage points. */
export const APY_BUCKET_PCT = 1;

/** One flagged position, reduced to the facts the observation is about. */
export interface DismissalConditionInput {
  positionId: string;
  /** Share of the portfolio, percent. Null when unresolved. */
  portfolioSharePct?: number | null;
  /** Sourced APY, percent. Null when there is none to show. */
  apyPct?: number | null;
  /** Why this position was flagged (order-insensitive). */
  reasons?: readonly string[];
}

const bucket = (value: number | null | undefined, width: number): string =>
  typeof value === "number" && Number.isFinite(value)
    ? String(Math.floor(value / width) * width)
    : "x"; // unresolved is its OWN bucket — becoming resolved is a material change

/**
 * Stable signature for the condition behind an informational card. Deterministic
 * and order-insensitive, so the same situation always produces the same key.
 */
export function buildDismissalSignature(
  kind: string,
  positions: readonly DismissalConditionInput[]
): string {
  const parts = positions
    .map((p) => {
      const reasons = [...(p.reasons ?? [])].sort().join("+");
      return `${p.positionId}@c${bucket(p.portfolioSharePct, CONCENTRATION_BUCKET_PCT)}` +
        `@a${bucket(p.apyPct, APY_BUCKET_PCT)}@r${reasons}`;
    })
    .sort();
  return `${kind}:${DISMISSAL_SIGNATURE_VERSION}:${parts.join("|")}`;
}

/* ------------------------------------------------------------------ *
 * Session store. The rail is rendered on both the Dashboard and the Portfolio,
 * so dismissals live in a module-level store rather than one page's state.
 * ------------------------------------------------------------------ */
let dismissed: ReadonlySet<string> = new Set();
const listeners = new Set<() => void>();

/** Stable snapshot reference — replaced only when the set actually changes. */
function getSnapshot(): ReadonlySet<string> {
  return dismissed;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/** Acknowledge the condition behind a card. No-op for a blank signature. */
export function dismissSignature(signature: string): void {
  if (!signature || dismissed.has(signature)) return;
  const next = new Set(dismissed);
  next.add(signature);
  dismissed = next;
  listeners.forEach((l) => l());
}

/** Test/teardown helper — clears every dismissal. */
export function resetDismissedSuggestions(): void {
  if (dismissed.size === 0) return;
  dismissed = new Set();
  listeners.forEach((l) => l());
}

/** True when this exact condition has been acknowledged. */
export function isSignatureDismissed(
  signature: string | undefined | null,
  set: ReadonlySet<string>
): boolean {
  return !!signature && set.has(signature);
}

export interface DismissedSuggestionsState {
  dismissed: ReadonlySet<string>;
  dismiss: (signature: string) => void;
}

/** Read the dismissal set, and the acknowledge action. */
export function useDismissedSuggestions(): DismissedSuggestionsState {
  const set = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { dismissed: set, dismiss: dismissSignature };
}
