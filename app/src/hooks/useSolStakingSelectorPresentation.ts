/**
 * useSolStakingSelectorPresentation — Step 14Y. Fetches the SAME-ORIGIN sanitized runtime market
 * cache (`/generated/sol-staking-market-cache.json`), validates it, restamps freshness at the
 * current time, builds the Step 14V normalized set → Step 14W comparison → Step 14Y presentation,
 * and exposes it read-only.
 *
 * The browser fetches ONLY the generated same-origin artifact — never DefiLlama, Stakewiz,
 * Marinade, Rated, or Blockdaemon. It uses no fixture values, changes no `selectedProtocolId`, and
 * fails closed (unavailable/stale/invalid presentation) on any problem — never labeling JitoSOL the
 * current top protocol as a fallback.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  SOL_STAKING_RUNTIME_DATA_URL,
  validateSolStakingRuntimeMarketPayload,
} from "../suggestions/solStakingSelectorRuntimeData";
import { buildNormalizedSolStakingCandidateSet } from "../suggestions/solStakingCandidateNormalization";
import { buildSolStakingSelectorComparison } from "../suggestions/solStakingSelectorComparison";
import { buildSolStakingSelectorPresentation } from "../suggestions/solStakingSelectorPresentation";
import type { SolStakingSelectorPresentation } from "../suggestions/solStakingSelectorPresentationTypes";

const FETCH_TIMEOUT_MS = 8000;

export interface UseSolStakingSelectorPresentationResult {
  loading: boolean;
  presentation?: SolStakingSelectorPresentation;
  error?: string;
  refresh: () => void;
}

/** Build an "unavailable" presentation deterministically (no cache/normalized/comparison). */
function unavailablePresentation(checkedAt: string): SolStakingSelectorPresentation {
  return buildSolStakingSelectorPresentation({ checkedAt });
}

/**
 * Read the current comparison presentation from the same-origin artifact. Optionally inject a
 * `fetchImpl` for testing (defaults to the global fetch); never calls external providers.
 */
export function useSolStakingSelectorPresentation(options: { fetchImpl?: typeof fetch; url?: string } = {}): UseSolStakingSelectorPresentationResult {
  const url = options.url ?? SOL_STAKING_RUNTIME_DATA_URL;
  const [loading, setLoading] = useState(true);
  const [presentation, setPresentation] = useState<SolStakingSelectorPresentation | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [nonce, setNonce] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    abortRef.current = controller;
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const doFetch = options.fetchImpl ?? fetch;
    const checkedAt = new Date().toISOString();

    setLoading(true);
    setError(undefined);

    (async () => {
      try {
        const res = await doFetch(url, { signal: controller.signal, credentials: "same-origin", headers: { accept: "application/json" } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = await res.json().catch(() => null);
        const v = validateSolStakingRuntimeMarketPayload(raw, {});
        if (!v.valid || !v.payload) {
          if (!cancelled) { setPresentation(unavailablePresentation(checkedAt)); setError(`invalid_runtime_payload:${v.errors.join(",")}`); }
          return;
        }
        const marketCache = v.payload.marketCache;
        const normalizedSet = buildNormalizedSolStakingCandidateSet(marketCache, { checkedAt });
        const comparisonResult = buildSolStakingSelectorComparison(normalizedSet, { checkedAt });
        const built = buildSolStakingSelectorPresentation({ marketCache, normalizedSet, comparisonResult, checkedAt });
        if (!cancelled) setPresentation(built);
      } catch (e) {
        // Fail closed — unavailable presentation; never fall back to labeling Jito the top protocol.
        if (!cancelled) { setPresentation(unavailablePresentation(checkedAt)); setError(e && (e as Error).name === "AbortError" ? "timeout" : (e as Error).message ?? "fetch_failed"); }
      } finally {
        if (!cancelled) setLoading(false);
        clearTimeout(timer);
      }
    })();

    return () => { cancelled = true; controller.abort(); clearTimeout(timer); };
  }, [url, nonce, options.fetchImpl]);

  // Lightweight revalidation when the page regains focus (no fast polling).
  useEffect(() => {
    const onFocus = () => refresh();
    if (typeof window !== "undefined") window.addEventListener("focus", onFocus);
    return () => { if (typeof window !== "undefined") window.removeEventListener("focus", onFocus); };
  }, [refresh]);

  return { loading, presentation, error, refresh };
}
