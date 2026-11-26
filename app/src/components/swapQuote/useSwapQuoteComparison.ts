/**
 * useSwapQuoteComparison — Step 23C. Read-only lifecycle for the "Suggested route" section. It requests a
 * sanitized comparison ONLY when the Review section is enabled (modal open), one active request per leg, cancels
 * in-flight requests on close/unmount, reuses a still-fresh session-cached response, marks expired results, and
 * offers a bounded refresh. No polling loop, no infinite retry, no long-term persistence — session memory only,
 * respecting server expiry. An older response can never overwrite a newer request (request-key + generation gated).
 *
 * THE REVIEW OPENS ON A DECIDED ROUTE. `prefetchSwapQuoteComparison` runs while the card's Review button is
 * busy and leaves its answer in the session cache; the hook then starts from that answer SYNCHRONOUSLY, so the
 * review's first paint already names the route. Before this the review opened on a loading state with a
 * provisional footer, and the footer changed under the reader when the comparison landed.
 *
 * AND THE ROUTE THEN STAYS PUT. Nothing here re-requests on a timer. A comparison that has aged is refreshed
 * only when someone asks — the reader pressing Refresh, or the Swap button needing current terms — and a
 * QUIET refresh keeps the previous answer on screen until the new one replaces it.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { SwapActionContext } from "../../suggestions/swapQuote/swapQuoteContracts";
import { fetchSwapQuoteComparison, swapQuoteRequestKey, type SwapQuoteFetcher, type SwapQuoteClientResult } from "../../suggestions/swapQuote/swapQuoteClient";

export interface LegResult { legId: string; result: SwapQuoteClientResult }
export type ComparisonPhase = "idle" | "loading" | "done";
export interface UseSwapQuoteState {
  phase: ComparisonPhase;
  legResults: LegResult[];
  /** Re-request. `quiet` keeps the current answer on screen while the new one is fetched. */
  refresh: (opts?: { quiet?: boolean }) => void;
  /** True while a QUIET refresh is in flight. `phase` stays "done" throughout one. */
  refreshing: boolean;
}

interface CacheEntry { result: SwapQuoteClientResult; expiryMs: number }
const SESSION_CACHE = new Map<string, CacheEntry>(); // session memory only; never persisted to storage

/**
 * How long an answer WITHOUT a server expiry is kept — a refusal, or "no route".
 *
 * Long enough to hand a prefetched outcome to the review that opens a moment later, so the
 * review shows that outcome instead of asking again and flashing a loading state. Short enough
 * that reopening the suggestion a few seconds later asks afresh.
 */
export const UNEXPIRING_RESULT_TTL_MS = 5_000;
/** One more attempt when the first comparison selected nothing. Price sources fail transiently. */
export const PREFETCH_RETRY_DELAY_MS = 400;
/** The Review button never spins longer than this; the review then opens and finishes loading itself. */
export const PREFETCH_MAX_WAIT_MS = 6_000;

function cacheGet(key: string, nowMs: number): SwapQuoteClientResult | null {
  const e = SESSION_CACHE.get(key);
  if (!e) return null;
  if (nowMs >= e.expiryMs) { SESSION_CACHE.delete(key); return null; }
  return e.result;
}
function cacheSet(key: string, result: SwapQuoteClientResult, nowMs: number = Date.now()): void {
  // An aborted request is not an answer; caching it would show "unavailable" for a comparison nobody waited for.
  if (!result.ok && result.error === "aborted") return;
  const exp = result.ok && result.assessment.expiresAt ? Date.parse(result.assessment.expiresAt) : NaN;
  SESSION_CACHE.set(key, { result, expiryMs: Number.isFinite(exp) ? exp : nowMs + UNEXPIRING_RESULT_TTL_MS });
}

/** Every leg's cached answer, or null if any leg has none. All-or-nothing: a half-known plan is not a plan. */
function readAllCached(legs: readonly SwapActionContext[], slippageBps: number, nowMs: number): LegResult[] | null {
  if (legs.length === 0) return null;
  const out: LegResult[] = [];
  for (const leg of legs) {
    const cached = cacheGet(swapQuoteRequestKey(leg, slippageBps), nowMs);
    if (!cached) return null;
    out.push({ legId: leg.legId, result: cached });
  }
  return out;
}

/** A comparison that named a route. Anything else is worth one more attempt before the review opens on it. */
export function comparisonSelectedARoute(result: SwapQuoteClientResult): boolean {
  return result.ok && result.assessment.selectedProviderId != null;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Fetch the comparison BEFORE the review opens, and leave it where the hook will find it.
 *
 * Resolves when every leg has an answer or `maxWaitMs` has passed, whichever is first — it never
 * rejects, and a failed comparison is still an answer (the review opens on the unavailable state).
 * A leg already answered in the session cache is not asked again.
 */
export async function prefetchSwapQuoteComparison(
  legs: readonly SwapActionContext[],
  opts: { slippageBps?: number; fetcher?: SwapQuoteFetcher; maxWaitMs?: number; retryDelayMs?: number } = {},
): Promise<void> {
  if (legs.length === 0) return;
  const slippageBps = opts.slippageBps ?? 50;
  const fetcher: SwapQuoteFetcher = opts.fetcher ?? fetchSwapQuoteComparison;
  const work = Promise.all(
    legs.map(async (leg) => {
      const key = swapQuoteRequestKey(leg, slippageBps);
      if (cacheGet(key, Date.now())) return;
      let result = await fetcher(leg, { slippageBps });
      if (!comparisonSelectedARoute(result)) {
        await sleep(opts.retryDelayMs ?? PREFETCH_RETRY_DELAY_MS);
        const again = await fetcher(leg, { slippageBps });
        // Keep the retry only if it is an improvement; a second refusal says nothing the first did not.
        if (comparisonSelectedARoute(again) || !result.ok) result = again;
      }
      cacheSet(key, result);
    }),
  ).then(() => undefined, () => undefined);
  await Promise.race([work, sleep(opts.maxWaitMs ?? PREFETCH_MAX_WAIT_MS)]);
}

export interface UseSwapQuoteOptions { enabled: boolean; slippageBps?: number; fetcher?: SwapQuoteFetcher }

export function useSwapQuoteComparison(legs: SwapActionContext[], opts: UseSwapQuoteOptions): UseSwapQuoteState {
  const { enabled } = opts;
  const slippageBps = opts.slippageBps ?? 50;
  const fetcher: SwapQuoteFetcher = opts.fetcher ?? fetchSwapQuoteComparison;
  // Start from the session cache when it already holds the whole answer (the prefetch put it there), so the
  // first paint is the decided route rather than a loading state that is replaced one frame later.
  const [initial] = useState(() => (enabled ? readAllCached(legs, slippageBps, Date.now()) : null));
  const [phase, setPhase] = useState<ComparisonPhase>(initial ? "done" : "idle");
  const [legResults, setLegResults] = useState<LegResult[]>(initial ?? []);
  const [refreshing, setRefreshing] = useState(false);
  const generationRef = useRef(0);
  // Stable request key across the whole leg set (identity + amounts + slippage).
  const setKey = legs.map((l) => swapQuoteRequestKey(l, slippageBps)).join("~");

  const load = useCallback((force: boolean, quiet = false) => {
    if (!enabled || legs.length === 0) return () => {};
    const nowMs = Date.now();
    if (!force) {
      // The whole answer is already here: commit it without passing through "loading".
      const cached = readAllCached(legs, slippageBps, nowMs);
      if (cached) {
        generationRef.current += 1;
        setLegResults(cached);
        setPhase("done");
        setRefreshing(false);
        return () => {};
      }
    }
    const generation = ++generationRef.current;
    const controller = new AbortController();
    if (quiet) setRefreshing(true);
    else setPhase("loading");
    (async () => {
      const results = await Promise.all(
        legs.map(async (leg): Promise<LegResult> => {
          const key = swapQuoteRequestKey(leg, slippageBps);
          if (!force) {
            const cached = cacheGet(key, nowMs);
            if (cached) return { legId: leg.legId, result: cached };
          }
          const result = await fetcher(leg, { slippageBps, signal: controller.signal });
          cacheSet(key, result);
          return { legId: leg.legId, result };
        }),
      );
      // Stale-response protection: only the newest generation may commit.
      if (generation === generationRef.current) {
        setLegResults(results);
        setPhase("done");
        setRefreshing(false);
      }
    })();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, setKey, slippageBps]);

  useEffect(() => {
    if (!enabled) { setPhase("idle"); setLegResults([]); setRefreshing(false); return; }
    const cancel = load(false);
    return cancel; // cancel in-flight on close / action change / unmount
  }, [enabled, load]);

  const refresh = useCallback((refreshOpts?: { quiet?: boolean }) => {
    // Bounded, on-request only (no loop). Bypass cache for a fresh snapshot.
    for (const leg of legs) SESSION_CACHE.delete(swapQuoteRequestKey(leg, slippageBps));
    load(true, refreshOpts?.quiet === true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, setKey, slippageBps]);

  return { phase, legResults, refresh, refreshing };
}
