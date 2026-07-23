/**
 * useMarketConditionsCache — Step 22F (slice 2). The thin, read-only component-layer hook that loads the PUBLISHED,
 * same-origin market-conditions cache artifact (`/generated/market-conditions-cache.json`) once per mount. It mirrors
 * the existing static-cache hooks (SOL staking / Kamino): it NEVER calls CoinMarketCap, carries no API key, holds no
 * provider endpoint, and reads no raw provider payload — the offline `market:refresh-conditions` script produces the
 * artifact; this hook only reads it. Fetch is aborted on unmount and stale async results are dropped, so there is no
 * race, no duplicate fetch per render, and no state write after unmount.
 *
 * The parsed JSON + ingestion state are handed to the PURE `buildRailTargetContext` (railTargetContext.ts) — this hook
 * does no assessment work itself. Demo never mounts this hook (Demo calls `deriveRailSuggestions` directly), so Demo
 * never consumes the real cache.
 */
import { useEffect, useState } from "react";
import type { MarketConditionsCacheState } from "./railTargetContext";

/** Same-origin published artifact path (matches the `/generated/*.json` convention; produced offline, never fetched from a provider). */
export const MARKET_CONDITIONS_CACHE_URL = "/generated/market-conditions-cache.json";

export interface MarketConditionsCacheHookState {
  cacheInput: unknown | null;
  cacheState: MarketConditionsCacheState;
}

/** Load the published market-conditions cache. `enabled === false` (e.g. Demo) skips the fetch entirely. */
export function useMarketConditionsCache(opts: { enabled?: boolean } = {}): MarketConditionsCacheHookState {
  const enabled = opts.enabled ?? true;
  const [state, setState] = useState<MarketConditionsCacheHookState>({ cacheInput: null, cacheState: "loading" });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const controller = new AbortController();
    (async (): Promise<MarketConditionsCacheHookState> => {
      const res = await fetch(MARKET_CONDITIONS_CACHE_URL, { signal: controller.signal, cache: "no-store" });
      if (res.status === 404) return { cacheInput: null, cacheState: "missing" };
      if (!res.ok) return { cacheInput: null, cacheState: "failed" };
      try {
        const json = await res.json();
        return { cacheInput: json, cacheState: "loaded" };
      } catch {
        return { cacheInput: null, cacheState: "malformed" };
      }
    })()
      .then((next) => { if (!cancelled) setState(next); })
      .catch((err) => {
        if (cancelled || (err && err.name === "AbortError")) return; // unmount / cancellation — do not write state
        setState({ cacheInput: null, cacheState: "failed" });
      });
    return () => { cancelled = true; controller.abort(); };
  }, [enabled]);

  return state;
}
