/**
 * tokenPrices — READ-ONLY USD spot prices for detected mints, from AUTHORITATIVE
 * public feeds only (never invented).
 *
 *  - Primary: DefiLlama `coins.llama.fi` (batched, keyless, CORS-open). It returns
 *    a `confidence` score + `timestamp` per coin; we accept a price only when the
 *    confidence clears a floor, so unreliable prices are dropped rather than shown.
 *  - Fallback: Jupiter `lite-api.jup.ag/price/v3` for mints DefiLlama didn't
 *    confidently price (broad long-tail SPL coverage, keyless, CORS-open).
 *
 * A mint with no confident price is simply ABSENT from the result → the UI shows
 * "—" (never zero, never a guess). Best-effort: a failed feed degrades to fewer
 * prices, never an error. Lazy-imported so it stays off the main bundle.
 */

/** Canonical wrapped-SOL mint — used to price native SOL and native stake. */
export const SOL_MINT = "So11111111111111111111111111111111111111112";

export interface PriceInfo {
  /** USD price per whole token, from an authoritative feed. */
  priceUsd: number;
  source: "defillama" | "jupiter";
  /** DefiLlama confidence (0–1) when available. */
  confidence?: number;
}

const LLAMA = "https://coins.llama.fi/prices/current/";
const JUP = "https://lite-api.jup.ag/price/v3?ids=";
/** Drop DefiLlama prices below this confidence (fall back to Jupiter or "—"). */
const MIN_CONFIDENCE = 0.8;

/**
 * Fetch USD prices for the given mints. Returns a mint → PriceInfo map containing
 * only mints that got a confident price from an approved source.
 */
export async function fetchTokenPrices(mints: string[]): Promise<Map<string, PriceInfo>> {
  const out = new Map<string, PriceInfo>();
  const unique = [...new Set(mints)].filter((m) => typeof m === "string" && m.length > 0);
  if (unique.length === 0) return out;

  // Primary — DefiLlama (single batched request).
  try {
    const url = LLAMA + unique.map((m) => "solana:" + m).join(",");
    const r = await fetch(url);
    if (r.ok) {
      const j = (await r.json()) as { coins?: Record<string, { price?: number; confidence?: number }> };
      const coins = j?.coins ?? {};
      for (const m of unique) {
        const c = coins["solana:" + m];
        if (
          c &&
          typeof c.price === "number" &&
          c.price > 0 &&
          (c.confidence == null || c.confidence >= MIN_CONFIDENCE)
        ) {
          out.set(m, { priceUsd: c.price, source: "defillama", confidence: c.confidence });
        }
      }
    }
  } catch {
    // best-effort — fall through to Jupiter for everything
  }

  // Fallback — Jupiter for any mint DefiLlama didn't confidently price.
  const missing = unique.filter((m) => !out.has(m));
  if (missing.length > 0) {
    try {
      const r = await fetch(JUP + missing.join(","));
      if (r.ok) {
        const j = (await r.json()) as Record<string, { usdPrice?: number }>;
        for (const m of missing) {
          const p = j?.[m]?.usdPrice;
          if (typeof p === "number" && p > 0) out.set(m, { priceUsd: p, source: "jupiter" });
        }
      }
    } catch {
      // best-effort
    }
  }

  return out;
}
