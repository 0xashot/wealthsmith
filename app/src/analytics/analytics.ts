/**
 * analytics — PostHog, configured so it cannot become a second copy of the data we
 * deliberately do not keep.
 *
 * Three defaults are off on purpose:
 *
 *  · autocapture — it records the DOM text around a click, and this app renders
 *    portfolio totals, balances and allocations as text. Explicit events only.
 *  · session replay out of the box — what a recording may show differs by mode, so it
 *    is started by hand with the right masking for the mode (see `setReplayMode`).
 *  · identifying by wallet address — addresses are public and permanently linkable to
 *    on-chain history. The distinct id is a random value generated in this browser and
 *    never leaves it except as an opaque id.
 *
 * VITE_POSTHOG_KEY is a *public* project key, designed to ship in a browser bundle —
 * unlike a service password, which must never carry a VITE_ prefix. It is safe here and
 * only here.
 *
 * With no key configured, every function below is a no-op, so the app runs identically
 * for anyone without analytics set up.
 */
import type { AnalyticsEvent } from "./events";

const KEY = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_POSTHOG_KEY;
const HOST =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_POSTHOG_HOST ??
  "https://us.i.posthog.com";

const DISTINCT_ID_KEY = "ws_analytics_id";

/**
 * Stamped on every event so local development never pollutes production figures.
 * One project holds both, so the distinction has to be explicit rather than remembered.
 */
const ENVIRONMENT: "development" | "production" =
  typeof location !== "undefined" && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)
    ? "development"
    : "production";

type PostHog = {
  init: (key: string, cfg: Record<string, unknown>) => void;
  capture: (name: string, props?: Record<string, unknown>) => void;
  startSessionRecording?: () => void;
  stopSessionRecording?: () => void;
  set_config?: (cfg: Record<string, unknown>) => void;
  register?: (props: Record<string, unknown>) => void;
};

/** Which experience the visitor is in. Stamped on every event. */
export type Surface = "disconnected" | "demo" | "connected";

let ph: PostHog | null = null;
let ready = false;
let surface: Surface = "disconnected";

/** A random, browser-local id. Never the wallet address. */
function distinctId(): string {
  try {
    const existing = localStorage.getItem(DISTINCT_ID_KEY);
    if (existing) return existing;
    const made = crypto.randomUUID();
    localStorage.setItem(DISTINCT_ID_KEY, made);
    return made;
  } catch {
    // Private mode / blocked storage: a per-load id. Analytics degrades, the app does not.
    return crypto.randomUUID();
  }
}

/** Load PostHog and configure it. Safe to call more than once; a no-op without a key. */
export async function initAnalytics(): Promise<void> {
  if (ready || !KEY) return;
  ready = true;
  try {
    const mod = await import("posthog-js");
    ph = (mod.default ?? mod) as unknown as PostHog;
    ph.init(KEY, {
      api_host: HOST,
      // Explicit events only — see the note above.
      autocapture: false,
      capture_pageview: true,
      capture_pageleave: true,
      // Replay is started by hand, and only in Demo Mode.
      disable_session_recording: true,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: "*",
      },
      persistence: "localStorage",
      bootstrap: { distinctID: distinctId() },
      // NOTE: the client cannot stop IP capture — PostHog's server reads the IP off
      // the request. The authoritative control is the project setting
      // Settings → Privacy → "Discard client IP data", which is ENABLED for this
      // project: IPs are used for GeoIP and bot detection, then dropped, never stored.
      // Keep that setting on in any project this app reports to.
      ip: false,
    });
    // Also register it so PostHog's own events (pageview, pageleave, replay) are
    // segmentable by surface, not just the events we send by hand.
    ph.register?.({ surface, environment: ENVIRONMENT });
  } catch {
    ph = null; // A blocked or failed load must never break the app.
  }
}

/**
 * Send one event. The argument type is the whole vocabulary — an event carrying a
 * balance, a goal figure or a wallet address does not compile.
 */
export function capture(event: AnalyticsEvent): void {
  if (!ph) return;
  const { name, ...props } = event;
  try {
    ph.capture(name, { ...props, surface, environment: ENVIRONMENT } as Record<string, unknown>);
  } catch {
    /* analytics must never throw into the app */
  }
}

/** How much of the screen a recording may show. */
export type ReplayMode =
  /** Demo Mode: every figure on screen is sample data, so text may be recorded. */
  | "demo"
  /** A real wallet is connected: mask ALL text as well as inputs. */
  | "connected";

/**
 * Recording runs in both modes — the connected experience is where the harder problems
 * are — but what it may show differs.
 *
 * In Demo Mode nothing on screen belongs to anyone, so text is recorded and the replay
 * is readable. Once a wallet is connected every text node is masked: you still see
 * layout, cursor, clicks, scrolling and hesitation, which is most of the diagnostic
 * value, but no balance, allocation or goal figure is ever transmitted.
 */
export function setReplayMode(mode: ReplayMode): void {
  if (!ph) return;
  try {
    ph.set_config?.({
      session_recording: {
        maskAllInputs: true,
        // "*" masks every text node; undefined leaves demo text readable.
        maskTextSelector: mode === "connected" ? "*" : undefined,
      },
    });
    ph.startSessionRecording?.();
  } catch {
    /* analytics must never throw into the app */
  }
}

/**
 * Record which experience the visitor is now in. Every event from here on carries it,
 * so one question — "what do people do in Demo Mode?" — is a filter rather than a
 * parallel set of demo_* event names.
 *
 * Safe to call before `initAnalytics` has resolved: the value is held locally and
 * registered once PostHog is up.
 */
export function setSurface(next: Surface): void {
  surface = next;
  if (!ph) return;
  try {
    ph.register?.({ surface });
  } catch {
    /* analytics must never throw into the app */
  }
}
