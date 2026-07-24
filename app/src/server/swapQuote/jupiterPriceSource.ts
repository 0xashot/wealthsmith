/**
 * jupiterPriceSource — Step 23B.1 (SERVER-ONLY). The approved shared USD price source, backed by Jupiter Price
 * v3 (`https://api.jup.ag/price/v3`). Mint-aware, read-only, bounded timeout. Returns a fresh `{ usd, observedAtMs }`
 * per mint or null (fail closed) — the orchestrator builds ONE snapshot from these and uses it identically for
 * every candidate. No browser key, no wallet data, no website scraping. USDC is SOURCED (not hard-coded to $1),
 * matching the approved policy of freshness-checking every asset the same way.
 */
import type { PriceSource, MintUsdPrice } from "./priceSnapshot";

export const JUPITER_PRICE_V3_URL = "https://api.jup.ag/price/v3" as const;
export const JUPITER_PRICE_SOURCE_ID = "jupiter_price_v3" as const;

interface JupiterPriceV3Entry { usdPrice?: number; decimals?: number }
type JupiterPriceV3Response = Record<string, JupiterPriceV3Entry | null>;

/** A PriceSource backed by Jupiter Price v3. `baseUrl` is overridable (server env) for an approved mirror. */
export function createJupiterPriceSource(fetchImpl: typeof fetch = fetch, baseUrl: string = JUPITER_PRICE_V3_URL): PriceSource {
  return {
    sourceId: JUPITER_PRICE_SOURCE_ID,
    async getUsdPrice(mint, signal): Promise<MintUsdPrice | null> {
      try {
        const url = new URL(baseUrl);
        url.searchParams.set("ids", mint);
        const res = await fetchImpl(url.toString(), { signal, headers: { accept: "application/json" } });
        if (!res.ok) return null;
        const body = (await res.json()) as JupiterPriceV3Response;
        const entry = body?.[mint];
        const usd = entry?.usdPrice;
        if (typeof usd !== "number" || !Number.isFinite(usd) || usd <= 0) return null;
        // Price v3 has no per-mint observation timestamp; the read time is the observation time (freshness is
        // then judged against the comparison window in resolvePriceSnapshot).
        return { usd, observedAtMs: Date.now(), sourceId: JUPITER_PRICE_SOURCE_ID };
      } catch {
        return null;
      }
    },
  };
}
