/**
 * useSwapQuoteComparison — Step 23C. Read-only lifecycle for the "Suggested route" section. It requests a
 * sanitized comparison ONLY when the Review section is enabled (modal open), one active request per leg, cancels
 * in-flight requests on close/unmount, reuses a still-fresh session-cached response, marks expired results, and
 * offers a bounded refresh. No polling loop, no infinite retry, no long-term persistence — session memory only,
 * respecting server expiry. An older response can never overwrite a newer request (request-key + generation gated).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { SwapActionContext } from "../../suggestions/swapQuote/swapQuoteContracts";
import { fetchSwapQuoteComparison, swapQuoteRequestKey, type SwapQuoteFetcher, type SwapQuoteClientResult } from "../../suggestions/swapQuote/swapQuoteClient";

export interface LegResult { legId: string; result: SwapQuoteClientResult }
export type ComparisonPhase = "idle" | "loading" | "done";
export interface UseSwapQuoteState { phase: ComparisonPhase; legResults: LegResult[]; refresh: () => void }

interface CacheEntry { result: SwapQuoteClientResult; expiryMs: number }
const SESSION_CACHE = new Map<string, CacheEntry>(); // session memory only; never persisted to storage

function cacheGet(key: string, nowMs: number): SwapQuoteClientResult | null {
  const e = SESSION_CACHE.get(key);
  if (!e) return null;
  if (nowMs >= e.expiryMs) { SESSION_CACHE.delete(key); return null; }
  return e.result;
}
function cacheSet(key: string, result: SwapQuoteClientResult): void {
  if (result.ok && result.assessment.expiresAt) {
    const exp = Date.parse(result.assessment.expiresAt);
    if (Number.isFinite(exp)) SESSION_CACHE.set(key, { result, expiryMs: exp });
  }
}

export interface UseSwapQuoteOptions { enabled: boolean; slippageBps?: number; fetcher?: SwapQuoteFetcher }

export function useSwapQuoteComparison(legs: SwapActionContext[], opts: UseSwapQuoteOptions): UseSwapQuoteState {
  const { enabled } = opts;
  const slippageBps = opts.slippageBps ?? 50;
  const fetcher: SwapQuoteFetcher = opts.fetcher ?? fetchSwapQuoteComparison;
  const [phase, setPhase] = useState<ComparisonPhase>("idle");
  const [legResults, setLegResults] = useState<LegResult[]>([]);
  const generationRef = useRef(0);
  // Stable request key across the whole leg set (identity + amounts + slippage).
  const setKey = legs.map((l) => swapQuoteRequestKey(l, slippageBps)).join("~");

  const load = useCallback((force: boolean) => {
    if (!enabled || legs.length === 0) return () => {};
    const generation = ++generationRef.current;
    const controller = new AbortController();
    const nowMs = Date.now();
    setPhase("loading");
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
      }
    })();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, setKey, slippageBps]);

  useEffect(() => {
    if (!enabled) { setPhase("idle"); setLegResults([]); return; }
    const cancel = load(false);
    return cancel; // cancel in-flight on close / action change / unmount
  }, [enabled, load]);

  const refresh = useCallback(() => {
    // Bounded, user-initiated re-request only (no loop). Bypass cache for a fresh snapshot.
    for (const leg of legs) SESSION_CACHE.delete(swapQuoteRequestKey(leg, slippageBps));
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, setKey, slippageBps]);

  return { phase, legResults, refresh };
}
