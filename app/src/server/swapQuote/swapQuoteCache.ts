/**
 * swapQuoteCache — Step 23B (SERVER-ONLY). In-memory cache of SANITIZED comparison results, keyed by the
 * immutable action + all policy versions. It caches ONLY the sanitized assessment, its timestamps, and versions —
 * never a raw provider payload, header, credential, RPC response, transaction, or any profile datum. The cache
 * key deliberately contains no income/expenses/risk/wallet-profile/target factor. Effective expiry is the
 * EARLIEST of the cache TTL and the quote/liquidity/price snapshot expiries; a result is never served past it.
 */
import type { SwapQuoteComparisonAssessment } from "../../suggestions/swapQuote/swapQuoteContracts";
import { SWAP_QUOTE_POLICY_VERSION } from "../../suggestions/swapQuote/swapQuotePolicy";
import { SWAP_PAIR_REGISTRY_VERSION } from "../../suggestions/swapQuote/swapPairRegistry";
import { SWAP_ADAPTER_VERSIONS } from "./providerConfig";
import { SWAP_PRICE_SNAPSHOT_VERSION } from "./priceSnapshot";
import { SWAP_LIQUIDITY_RESOLVER_VERSION } from "./liquidityResolver";

export const SWAP_QUOTE_CACHE_VERSION = "swap_quote_cache_1.0.0" as const;

export interface SwapCacheKeyParts {
  inputMint: string;
  outputMint: string;
  inputAmountRaw: string;
  slippageBps: number;
}

/** Build the deterministic cache key. Includes pair/amount/slippage + every policy/adapter/snapshot version. */
export function buildCacheKey(parts: SwapCacheKeyParts): string {
  return [
    parts.inputMint,
    parts.outputMint,
    parts.inputAmountRaw,
    `slip${parts.slippageBps}`,
    `pair${SWAP_PAIR_REGISTRY_VERSION}`,
    `policy${SWAP_QUOTE_POLICY_VERSION}`,
    `jup${SWAP_ADAPTER_VERSIONS.jupiter}`,
    `ray${SWAP_ADAPTER_VERSIONS.raydium}`,
    `orca${SWAP_ADAPTER_VERSIONS.orca}`,
    `price${SWAP_PRICE_SNAPSHOT_VERSION}`,
    `liq${SWAP_LIQUIDITY_RESOLVER_VERSION}`,
    `cache${SWAP_QUOTE_CACHE_VERSION}`,
  ].join("|");
}

interface CacheEntry {
  assessment: SwapQuoteComparisonAssessment;
  storedAtMs: number;
  effectiveExpiryMs: number;
}

/** Earliest of: cache TTL, selected-quote expiry, liquidity snapshot expiry, price snapshot expiry. */
export function computeEffectiveExpiry(storedAtMs: number, ttlMs: number, expiries: Array<number | null>): number {
  const candidates = [storedAtMs + ttlMs, ...expiries.filter((e): e is number => typeof e === "number" && Number.isFinite(e))];
  return Math.min(...candidates);
}

export class SwapQuoteCache {
  private store = new Map<string, CacheEntry>();
  constructor(private ttlMs: number, private now: () => number = () => Date.now()) {}

  get(key: string): SwapQuoteComparisonAssessment | null {
    const e = this.store.get(key);
    if (!e) return null;
    if (this.now() >= e.effectiveExpiryMs) {
      this.store.delete(key);
      return null; // never serve past effective expiry
    }
    return e.assessment;
  }

  set(key: string, assessment: SwapQuoteComparisonAssessment, expiries: Array<number | null>): void {
    const storedAtMs = this.now();
    this.store.set(key, { assessment, storedAtMs, effectiveExpiryMs: computeEffectiveExpiry(storedAtMs, this.ttlMs, expiries) });
  }

  clear(): void {
    this.store.clear();
  }
}
