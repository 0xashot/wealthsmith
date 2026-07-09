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
 * Jupiter's response also carries `priceChange24h` (24h price change, percent), so
 * BOTH feeds are queried in parallel for every mint: DefiLlama wins on spot price
 * (Jupiter fills gaps), and Jupiter is the single source for the 24h change.
 * Change with no sourced value stays absent → the UI shows "—".
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
  /** 24h price change in PERCENT (e.g. 2.1 = +2.1%), sourced from Jupiter. */
  change24hPct?: number;
}

const LLAMA = "https://coins.llama.fi/prices/current/";
const JUP = "https://lite-api.jup.ag/price/v3?ids=";
/** Drop DefiLlama prices below this confidence (fall back to Jupiter or "—"). */
const MIN_CONFIDENCE = 0.8;

interface LlamaCoins {
  coins?: Record<string, { price?: number; confidence?: number }>;
}
interface JupPrices {
  [mint: string]: { usdPrice?: number; priceChange24h?: number } | undefined;
}

/**
 * Fetch USD prices for the given mints. Returns a mint → PriceInfo map containing
 * only mints that got a confident price from an approved source. Both feeds are
 * fetched in parallel: DefiLlama is the spot-price source of record (Jupiter fills
 * its gaps), and Jupiter's `priceChange24h` supplies the 24h change for every
 * priced mint it covers.
 */
export async function fetchTokenPrices(mints: string[]): Promise<Map<string, PriceInfo>> {
  const out = new Map<string, PriceInfo>();
  const unique = [...new Set(mints)].filter((m) => typeof m === "string" && m.length > 0);
  if (unique.length === 0) return out;

  // Both feeds in parallel — each is independently best-effort.
  const [llamaRes, jupRes] = await Promise.allSettled([
    fetch(LLAMA + unique.map((m) => "solana:" + m).join(",")).then(async (r) =>
      r.ok ? ((await r.json()) as LlamaCoins) : undefined
    ),
    fetch(JUP + unique.join(",")).then(async (r) =>
      r.ok ? ((await r.json()) as JupPrices) : undefined
    ),
  ]);
  const coins = (llamaRes.status === "fulfilled" ? llamaRes.value?.coins : undefined) ?? {};
  const jup = (jupRes.status === "fulfilled" ? jupRes.value : undefined) ?? {};

  for (const m of unique) {
    // Spot price — DefiLlama when confident, else Jupiter.
    const c = coins["solana:" + m];
    const j = jup[m];
    let priced: PriceInfo | undefined;
    if (
      c &&
      typeof c.price === "number" &&
      c.price > 0 &&
      (c.confidence == null || c.confidence >= MIN_CONFIDENCE)
    ) {
      priced = { priceUsd: c.price, source: "defillama", confidence: c.confidence };
    } else if (j && typeof j.usdPrice === "number" && j.usdPrice > 0) {
      priced = { priceUsd: j.usdPrice, source: "jupiter" };
    }
    if (!priced) continue;

    // 24h change — sourced from Jupiter only; absent when Jupiter has no figure.
    if (j && typeof j.priceChange24h === "number" && Number.isFinite(j.priceChange24h)) {
      priced.change24hPct = j.priceChange24h;
    }
    out.set(m, priced);
  }

  return out;
}
