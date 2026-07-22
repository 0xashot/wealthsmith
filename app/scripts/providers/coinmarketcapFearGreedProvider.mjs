/**
 * coinmarketcapFearGreedProvider — Step 22E. The ISOLATED, OFFLINE network layer for the approved CoinMarketCap
 * CMC Crypto Fear & Greed source. It is the ONLY place a CoinMarketCap request is made — never from React, the
 * SuggestionCard, or the deterministic suggestion engine. It performs a single authenticated GET with a timeout +
 * abort controller and returns the parsed JSON + retrieval time. It does NOT parse/select/validate the observation
 * (the pure `coinmarketcapFearGreed.ts` helpers do) and never returns/logs the API key, headers, or raw error bodies.
 *
 * Auth: server/offline-only `COINMARKETCAP_API_KEY` sent via the required `X-CMC_PRO_API_KEY` header (never a query
 * param, never `VITE_`-prefixed, never written to any cache/log).
 */
// The `/latest` endpoint returns the single most-recent observation (fresh, near-real-time). The `/historical`
// feed lags to the previous day, so `/latest` is used for freshness under the approved 36h policy.
const CMC_FNG_LATEST_URL = "https://pro-api.coinmarketcap.com/v3/fear-and-greed/latest";

/** Fetch the latest CMC Fear & Greed observation. Returns { json, retrievedAtMs }. Throws sanitized errors only. */
export async function fetchCoinMarketCapFearGreed({ apiKey, timeoutMs = 10_000 } = {}) {
  if (typeof apiKey !== "string" || apiKey.length === 0) {
    throw new Error("COINMARKETCAP_API_KEY is not set (server/offline-only; never VITE_-prefixed).");
  }
  const url = CMC_FNG_LATEST_URL;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const retrievedAtMs = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "X-CMC_PRO_API_KEY": apiKey, Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`coinmarketcap_http_${res.status}`); // status code only — no body, no key
    const contentType = res.headers.get("content-type") || "";
    if (!/application\/json/i.test(contentType)) throw new Error("coinmarketcap_unexpected_content_type");
    let json;
    try { json = await res.json(); } catch { throw new Error("coinmarketcap_malformed_json"); }
    return { json, retrievedAtMs };
  } catch (err) {
    if (err && err.name === "AbortError") throw new Error("coinmarketcap_request_timeout");
    // Re-throw only the sanitized message; never leak the key or a provider error payload.
    throw new Error(typeof err?.message === "string" ? err.message : "coinmarketcap_request_failed");
  } finally {
    clearTimeout(timer);
  }
}
