/**
 * sanctumLsts — READ-ONLY recognition of the full Sanctum LST universe.
 *
 * Sanctum maintains a public registry of every Sanctum-powered liquid-staking
 * token (245+ LSTs). We fetch it once (cached) and build a mint → { symbol, name }
 * map so ANY held Sanctum LST is identified with its real symbol/name instead of
 * showing as an "Unknown token". APY for these still comes from the existing
 * stake-pool math (`lstApy.ts`), which searches the SPL + Sanctum stake-pool
 * programs — so recognized Sanctum LSTs get their APY for free.
 *
 * The registry is served as TOML from a CDN; parsed with a small field extractor
 * (no TOML dependency). READ-ONLY: a single HTTP GET; no signing, no chain writes.
 */
export interface SanctumLstInfo {
  symbol: string;
  name: string;
}

/** Sanctum's canonical LST list (igneous-labs/sanctum-lst-list), via CDN. */
const SANCTUM_LST_LIST_URL =
  "https://cdn.jsdelivr.net/gh/igneous-labs/sanctum-lst-list@master/sanctum-lst-list.toml";

/** Session cache — the list rarely changes, so fetch/parse it at most once. */
let cache: Map<string, SanctumLstInfo> | null = null;

/** First top-level `key = "value"` in a list block. */
function field(block: string, key: string): string | undefined {
  const m = block.match(new RegExp(`\\b${key}\\s*=\\s*"([^"]*)"`));
  return m ? m[1] : undefined;
}

/** Map of Sanctum LST mint → { symbol, name }. Empty (uncached) on failure. */
export async function fetchSanctumLstMap(): Promise<Map<string, SanctumLstInfo>> {
  if (cache) return cache;
  const map = new Map<string, SanctumLstInfo>();
  try {
    const res = await fetch(SANCTUM_LST_LIST_URL);
    if (!res.ok) return map; // don't cache a failure
    const toml = await res.text();
    for (const block of toml.split("[[sanctum_lst_list]]").slice(1)) {
      const mint = field(block, "mint");
      const symbol = field(block, "symbol");
      if (!mint || !symbol) continue;
      map.set(mint, { symbol, name: field(block, "name") ?? symbol });
    }
    if (map.size > 0) cache = map;
  } catch {
    // best-effort; caller falls back to "Unknown token"
  }
  return map;
}
