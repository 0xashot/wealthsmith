/**
 * jupiterPriceSource — Step 23B.1 (SERVER-ONLY). The approved shared USD price source, backed by Jupiter Price
 * v3 (`https://api.jup.ag/price/v3`). Mint-aware, read-only, bounded timeout. Returns a fresh `{ usd, observedAtMs }`
 * per mint or null (fail closed) — the orchestrator builds ONE snapshot from these and uses it identically for
 * every candidate. No browser key, no wallet data, no website scraping. USDC is SOURCED (not hard-coded to $1),
 * matching the approved policy of freshness-checking every asset the same way.
 */
import type { MintUsdPrice } from "./priceSnapshot";
import type { BatchPriceSource } from "./resilientPriceSource";

export const JUPITER_PRICE_V3_URL = "https://api.jup.ag/price/v3" as const;
export const JUPITER_PRICE_SOURCE_ID = "jupiter_price_v3" as const;

interface JupiterPriceV3Entry { usdPrice?: number; decimals?: number }
type JupiterPriceV3Response = Record<string, JupiterPriceV3Entry | null>;

/** Read one mint's entry out of a Price v3 response. Null unless it is a real, positive number. */
function priceFrom(body: JupiterPriceV3Response | null | undefined, mint: string, observedAtMs: number): MintUsdPrice | null {
  const usd = body?.[mint]?.usdPrice;
  if (typeof usd !== "number" || !Number.isFinite(usd) || usd <= 0) return null;
  // Price v3 has no per-mint observation timestamp; the read time is the observation time (freshness is
  // then judged against the comparison window in resolvePriceSnapshot).
  return { usd, observedAtMs, sourceId: JUPITER_PRICE_SOURCE_ID };
}

/** A PriceSource backed by Jupiter Price v3. `baseUrl` is overridable (server env) for an approved mirror. */
export function createJupiterPriceSource(fetchImpl: typeof fetch = fetch, baseUrl: string = JUPITER_PRICE_V3_URL): BatchPriceSource {
  const read = async (mints: readonly string[], signal: AbortSignal): Promise<JupiterPriceV3Response | null> => {
    try {
      const url = new URL(baseUrl);
      url.searchParams.set("ids", mints.join(","));
      const res = await fetchImpl(url.toString(), { signal, headers: { accept: "application/json" } });
      if (!res.ok) return null;
      return (await res.json()) as JupiterPriceV3Response;
    } catch {
      return null;
    }
  };
  return {
    sourceId: JUPITER_PRICE_SOURCE_ID,
    async getUsdPrice(mint, signal): Promise<MintUsdPrice | null> {
      return priceFrom(await read([mint], signal), mint, Date.now());
    },
    /**
     * Several mints in ONE request — the API accepts a comma-separated list. One call instead of
     * one per mint matters: without a key the API refuses after about five calls in ten seconds.
     */
    async getUsdPrices(mints, signal): Promise<Record<string, MintUsdPrice | null>> {
      const body = mints.length > 0 ? await read(mints, signal) : null;
      const at = Date.now();
      const out: Record<string, MintUsdPrice | null> = {};
      for (const m of mints) out[m] = priceFrom(body, m, at);
      return out;
    },
  };
}
