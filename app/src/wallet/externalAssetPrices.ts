/**
 * externalAssetPrices — read-only USD spot price + 24h change for the non-Solana
 * assets a user manually adds to the Portfolio (BTC / ETH).
 *
 * Sourced, never invented: values come from CoinGecko's public `simple/price`
 * endpoint (keyless, read-only). A response that never succeeds yields NO price,
 * so the Value and 24h Change cells fall back to the honest "—" rather than
 * showing a made-up figure.
 *
 * ONE SHARED FETCH. The keyless endpoint rate-limits hard — measured live, it
 * starts returning 429 after about the fifth request in quick succession. Four
 * separate components call `useManualAssets` (and therefore this hook), React
 * StrictMode double-invokes effects, and every navigation remounts them, so a
 * per-mount fetch blew the limit routinely: the price appeared on one visit and
 * showed "—" on the next. All callers now share a single module-level cache and
 * a single in-flight request, refreshed on a TTL and retried with backoff.
 *
 * A failed REFRESH no longer discards a good price — it keeps serving the last
 * successful one, which is honest for a spot quote seconds-to-minutes old, and
 * gives up to "—" only once that price ages past MAX_STALE_MS.
 *
 * Display only: these prices value MANUALLY STATED amounts for the External
 * Holdings table. They never enter portfolio totals, the Safety Buffer,
 * allocation, completeness, or the Suggestion Engine.
 *
 * Backend note: this is the browser-direct prototype path (see the Solana price
 * feeds it mirrors). A production build should proxy/cache this server-side.
 */
import { useEffect, useSyncExternalStore } from "react";
import type { ManualAssetChain } from "../state/manualAssets";

/** CoinGecko asset ids for the chains we support. */
const COINGECKO_IDS: Record<ManualAssetChain, string> = { btc: "bitcoin", eth: "ethereum" };

const PRICE_URL =
  "https://api.coingecko.com/api/v3/simple/price" +
  `?ids=${Object.values(COINGECKO_IDS).join(",")}&vs_currencies=usd&include_24hr_change=true`;

/** How long to wait before giving up (and showing "—" rather than hanging). */
const TIMEOUT_MS = 8000;

export interface ExternalAssetPrice {
  usd: number;
  /** 24h percent change; null when the feed did not supply one. */
  change24hPct: number | null;
}

export type ExternalAssetPrices = Partial<Record<ManualAssetChain, ExternalAssetPrice>>;

const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

/** Parse the CoinGecko payload; unknown/malformed entries are simply omitted. */
export function parseExternalAssetPrices(payload: unknown): ExternalAssetPrices {
  if (!payload || typeof payload !== "object") return {};
  const out: ExternalAssetPrices = {};
  for (const [chain, id] of Object.entries(COINGECKO_IDS) as [ManualAssetChain, string][]) {
    const entry = (payload as Record<string, unknown>)[id];
    if (!entry || typeof entry !== "object") continue;
    const usd = (entry as Record<string, unknown>).usd;
    if (!finite(usd) || usd <= 0) continue;
    const change = (entry as Record<string, unknown>).usd_24h_change;
    out[chain] = { usd, change24hPct: finite(change) ? change : null };
  }
  return out;
}

/** A price this fresh is reused as-is — no request at all. */
const FRESH_TTL_MS = 60_000;
/** Past this age with no successful refresh, the price is dropped for "—". */
const MAX_STALE_MS = 15 * 60_000;
/** Retries within one refresh, spaced 2s / 4s — enough to ride out a 429. */
const MAX_RETRIES = 2;
const RETRY_BASE_MS = 2_000;

export interface ExternalAssetPricesState {
  prices: ExternalAssetPrices;
  /** True until the first attempt settles (success or final failure). */
  loading: boolean;
}

/* ------------------------------------------------------------------ *
 * Module-level cache + subscription. Every consumer reads this one
 * snapshot, so N mounted components cost ONE request, not N.
 * ------------------------------------------------------------------ */
let snapshot: ExternalAssetPricesState = { prices: {}, loading: true };
let fetchedAt = 0;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

/** Stable reference — only replaced when the value actually changes. */
function getSnapshot(): ExternalAssetPricesState {
  return snapshot;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function emit(next: ExternalAssetPricesState): void {
  snapshot = next;
  listeners.forEach((l) => l());
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** One attempt. Returns null on ANY failure (timeout, 429, malformed, empty). */
async function fetchPricesOnce(): Promise<ExternalAssetPrices | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(PRICE_URL, { signal: controller.signal });
    if (!res.ok) return null; // includes the 429 this endpoint hands out freely
    const parsed = parseExternalAssetPrices((await res.json()) as unknown);
    return Object.keys(parsed).length > 0 ? parsed : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function refreshPrices(): Promise<void> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) await delay(RETRY_BASE_MS * 2 ** (attempt - 1));
    const prices = await fetchPricesOnce();
    if (prices) {
      fetchedAt = Date.now();
      emit({ prices, loading: false });
      return;
    }
  }
  // Every attempt failed. Keep the last good price unless it has aged out —
  // a quote a few minutes old beats flickering to "—" and back.
  const expired = fetchedAt === 0 || Date.now() - fetchedAt > MAX_STALE_MS;
  emit({ prices: expired ? {} : snapshot.prices, loading: false });
}

/** Start a refresh unless one is running or the cache is still fresh. */
function ensureFreshPrices(): void {
  if (inFlight) return;
  if (fetchedAt > 0 && Date.now() - fetchedAt < FRESH_TTL_MS) return;
  inFlight = refreshPrices().finally(() => {
    inFlight = null;
  });
}

/** Test/teardown helper — clears the cache so the next read refetches. */
export function resetExternalAssetPrices(): void {
  fetchedAt = 0;
  inFlight = null;
  emit({ prices: {}, loading: true });
}

/**
 * BTC/ETH spot prices, shared across every caller. A failure never surfaces an
 * error UI — the table just shows "—" for Value and 24h Change.
 */
export function useExternalAssetPrices(): ExternalAssetPricesState {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    ensureFreshPrices();
  }, []);
  return state;
}
