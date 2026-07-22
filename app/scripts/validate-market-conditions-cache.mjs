/**
 * validate-market-conditions-cache — Step 22C. Deterministic, OFFLINE validator for a published Market Conditions
 * (Fear & Greed) cache artifact. It performs NO provider fetch and reads no secrets — it bundles the TypeScript
 * cache validator (`src/suggestions/marketConditionCache.ts`) and checks a candidate JSON file against the schema +
 * the approved-source registry. Used by `npm run market:validate-conditions [path]`. No live API request is required.
 *
 * Default path: public/generated/market-conditions-cache.json (absent until a provider is approved + published).
 */
import { build } from "esbuild";
import { readFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

const APP_DIR = process.cwd();
const INPUT_PATH = path.join(APP_DIR, process.argv[2] ?? "public/generated/market-conditions-cache.json");
const BUNDLE_PATH = path.join(APP_DIR, "tmp", ".market-conditions-validate-bundle.mjs");

async function loadValidators() {
  const entry = [
    `export { validateMarketConditionCache } from './src/suggestions/marketConditionCache.ts';`,
    `export { MARKET_CONDITION_SOURCES } from './src/suggestions/marketConditionPolicy.ts';`,
  ].join("\n");
  await build({ stdin: { contents: entry, resolveDir: APP_DIR, loader: "ts", sourcefile: "validate-entry.ts" }, bundle: true, format: "esm", platform: "node", outfile: BUNDLE_PATH, logLevel: "silent" });
  return import(`${pathToFileURL(BUNDLE_PATH).href}?t=${Date.now()}`);
}

async function main() {
  if (!existsSync(INPUT_PATH)) {
    console.error(`No cache artifact at ${path.relative(APP_DIR, INPUT_PATH)}. Run "COINMARKETCAP_API_KEY=… npm run market:refresh-conditions" to publish one (CoinMarketCap is the approved source — Step 22E).`);
    process.exit(1);
  }
  const { validateMarketConditionCache, MARKET_CONDITION_SOURCES } = await loadValidators();
  let json;
  try { json = JSON.parse(readFileSync(INPUT_PATH, "utf8")); } catch (e) { console.error(`Malformed JSON: ${e.message}`); process.exit(1); }
  const result = validateMarketConditionCache(json, { knownSources: MARKET_CONDITION_SOURCES, now: Date.now() });
  if (!result.valid) { console.error(`INVALID cache: ${result.errors.join(", ")}`); process.exit(1); }
  console.log(`VALID cache — source=${result.observation.sourceId} band=${result.observation.band} observedAt=${result.observation.observedAt}`);
  console.log("NOTE: structural validity only — this does NOT prove current freshness. A structurally-valid but stale artifact is not target-eligible; the MarketConditionAssessment classifies freshness via observedAt.");
}

main().catch((e) => { console.error(e); process.exit(1); });
