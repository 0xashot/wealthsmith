/**
 * refresh-market-conditions — Step 22E. OFFLINE refresh + atomic publish for the approved CoinMarketCap CMC Crypto
 * Fear & Greed source. Flow: fetch (provider adapter) → parse/select-latest/validate (pure helpers) → build + validate
 * the cache artifact → last-known-valid publish decision → atomic write (temp → rename). It NEVER runs in the client,
 * the suggestion engine, or React; it reads `COINMARKETCAP_API_KEY` from the server/offline env and never writes or
 * logs the key or the raw provider payload. A malformed/failed refresh NEVER overwrites the last-known-valid cache.
 *
 * Run: COINMARKETCAP_API_KEY=... npm run market:refresh-conditions
 */
import { build } from "esbuild";
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync, openSync, fsyncSync, closeSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { fetchCoinMarketCapFearGreed } from "./providers/coinmarketcapFearGreedProvider.mjs";

const APP_DIR = process.cwd();
const OUT_DIR = path.join(APP_DIR, "public", "generated");
const FINAL_PATH = path.join(OUT_DIR, "market-conditions-cache.json");
const TMP_PATH = `${FINAL_PATH}.tmp`;
const BUNDLE_PATH = path.join(APP_DIR, "tmp", ".market-conditions-refresh-bundle.mjs");
// Secrets that must never be present as plain query params / leaked; presence check mirrors the other refresh scripts.
const FORBIDDEN_LEAK_KEYS = ["VITE_COINMARKETCAP_API_KEY"];

async function loadPureHelpers() {
  const entry = [
    `export { parseCoinMarketCapFearGreedResponse, buildMarketConditionCacheFromAdapterResult, resolveCachePublishDecision } from './src/suggestions/coinmarketcapFearGreed.ts';`,
    `export { MARKET_CONDITION_SOURCES } from './src/suggestions/marketConditionPolicy.ts';`,
  ].join("\n");
  await build({ stdin: { contents: entry, resolveDir: APP_DIR, loader: "ts", sourcefile: "refresh-entry.ts" }, bundle: true, format: "esm", platform: "node", outfile: BUNDLE_PATH, logLevel: "silent" });
  return import(`${pathToFileURL(BUNDLE_PATH).href}?t=${Date.now()}`);
}

function readExistingCache() {
  if (!existsSync(FINAL_PATH)) return null;
  try { return JSON.parse(readFileSync(FINAL_PATH, "utf8")); } catch { return null; }
}

function atomicWrite(obj) {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(TMP_PATH, `${JSON.stringify(obj, null, 2)}\n`, "utf8");
  const fd = openSync(TMP_PATH, "r"); try { fsyncSync(fd); } finally { closeSync(fd); }
  renameSync(TMP_PATH, FINAL_PATH); // atomic on POSIX; the last-known-valid cache is untouched until this succeeds
}

async function main() {
  const apiKey = process.env.COINMARKETCAP_API_KEY;
  if (!apiKey) { console.error("COINMARKETCAP_API_KEY is not set. Set it in the server/offline env (never VITE_-prefixed). No refresh performed."); process.exit(1); }
  const leaked = FORBIDDEN_LEAK_KEYS.filter((k) => typeof process.env[k] === "string" && process.env[k].length > 0);
  if (leaked.length > 0) { console.error(`Refusing to run: client-exposed key(s) present in env: ${leaked.join(", ")}. Remove the VITE_ prefix.`); process.exit(1); }

  const helpers = await loadPureHelpers();
  const { parseCoinMarketCapFearGreedResponse, buildMarketConditionCacheFromAdapterResult, resolveCachePublishDecision, MARKET_CONDITION_SOURCES } = helpers;

  let fetched;
  try { fetched = await fetchCoinMarketCapFearGreed({ apiKey }); }
  catch (e) { console.error(`Fetch failed (${e.message}). Last-known-valid cache preserved.`); process.exit(1); }

  const parsed = parseCoinMarketCapFearGreedResponse(fetched.json, { retrievedAtMs: fetched.retrievedAtMs });
  if (!parsed.ok) { console.error(`Provider response invalid: ${parsed.errors.join(", ")}. Cache preserved.`); process.exit(1); }

  const built = buildMarketConditionCacheFromAdapterResult(parsed.result, { generatedAtMs: Date.now(), knownSources: MARKET_CONDITION_SOURCES });
  if (!built.ok) { console.error(`Cache build/validation failed: ${built.errors.join(", ")}. Cache preserved.`); process.exit(1); }

  const existing = readExistingCache();
  const decision = resolveCachePublishDecision(existing, built.cache);
  if (decision.action === "skip_older") { console.warn(`Skipped: ${decision.reason} (candidate observedAt ${built.cache.observedAt} not newer than cache). Cache preserved.`); process.exit(0); }
  if (decision.action === "skip_idempotent") { console.log(`No change: ${decision.reason}. Cache unchanged (${built.cache.band} @ ${built.cache.observedAt}).`); process.exit(0); }

  atomicWrite(built.cache);
  // Safe metadata only — never the key or the raw payload.
  console.log(`Published market-conditions cache: score=${built.cache.score} band=${built.cache.band} observedAt=${built.cache.observedAt} validUntil=${built.cache.validUntil}${built.providerBandMismatch ? " (provider label differed from canonical band — recorded as evidence)" : ""}`);
}

main().catch((e) => { console.error(e?.message ?? "refresh_failed"); process.exit(1); });
