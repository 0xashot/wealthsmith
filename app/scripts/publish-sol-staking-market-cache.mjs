/**
 * publish-sol-staking-market-cache — Step 14Y. Publishes the ALREADY-sanitized Step 14U normalized
 * market cache to a same-origin static artifact for the frontend prototype. It performs NO provider
 * fetches, reads no secrets, and only republishes the validated normalized cache — excluding raw
 * sourceResponses, request headers, environment data, API keys, and any unnecessary provider
 * payloads. Atomic write (temp → validate → rename). Fails if the input cache is missing, invalid,
 * or already stale. Does not modify TypeScript source and does not commit the generated output.
 *
 * Run:  npm run market:publish-staking   (or market:refresh-and-publish-staking)
 */
import { build } from "esbuild";
import { writeFileSync, renameSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

const APP_DIR = process.cwd();
const INPUT_PATH = path.join(APP_DIR, "tmp", "sol-staking-market-data-cache.json");
const OUT_DIR = path.join(APP_DIR, "public", "generated");
const FINAL_PATH = path.join(OUT_DIR, "sol-staking-market-cache.json");
const TMP_PATH = `${FINAL_PATH}.tmp`;
const BUNDLE_PATH = path.join(APP_DIR, "tmp", ".sol-staking-publish-bundle.mjs");
const MAX_AGE_HOURS = 24;

async function loadValidators() {
  const entry = [
    `export { validateSolStakingMarketCache } from './src/suggestions/solStakingMarketDataCache.ts';`,
    `export { buildSolStakingRuntimeMarketPayload, validateSolStakingRuntimeMarketPayload, SOL_STAKING_RUNTIME_DATA_SCHEMA_VERSION } from './src/suggestions/solStakingSelectorRuntimeData.ts';`,
  ].join("\n");
  await build({ stdin: { contents: entry, resolveDir: APP_DIR, loader: "ts", sourcefile: "publish-entry.ts" }, bundle: true, format: "esm", platform: "node", outfile: BUNDLE_PATH, logLevel: "silent" });
  return import(`${pathToFileURL(BUNDLE_PATH).href}?t=${Date.now()}`);
}

async function main() {
  if (!existsSync(INPUT_PATH)) {
    console.error(`No input cache at ${path.relative(APP_DIR, INPUT_PATH)}. Run "npm run market:refresh-staking" first.`);
    process.exit(1);
  }
  const mod = await loadValidators();
  const { validateSolStakingMarketCache, buildSolStakingRuntimeMarketPayload, validateSolStakingRuntimeMarketPayload } = mod;

  let wrapper;
  try {
    wrapper = JSON.parse(readFileSync(INPUT_PATH, "utf8"));
  } catch (e) {
    console.error(`Input cache is not valid JSON: ${e && e.message ? e.message : String(e)}`);
    process.exit(1);
  }

  const normalizedCache = wrapper.normalizedCache;
  const v = validateSolStakingMarketCache(normalizedCache, {});
  if (!v.valid) {
    console.error(`Input market cache failed validation: ${v.errors.join(", ")}. Nothing published.`);
    process.exit(1);
  }

  // Refuse to publish stale data.
  const now = Date.now();
  const generatedMs = Date.parse(v.cache.generatedAt);
  const ageHours = (now - generatedMs) / 3_600_000;
  if (Number.isNaN(generatedMs) || ageHours < 0 || ageHours > MAX_AGE_HOURS) {
    console.error(`Input cache is stale (${ageHours.toFixed(1)}h old, max ${MAX_AGE_HOURS}h). Refusing to publish. Run a fresh refresh first.`);
    process.exit(1);
  }

  const payload = buildSolStakingRuntimeMarketPayload(v.cache, new Date(now).toISOString());

  // Serialize + validate the sanitized payload before touching the final artifact.
  let serialized;
  try {
    serialized = JSON.stringify(payload, null, 2);
    JSON.parse(serialized);
  } catch (e) {
    console.error(`Payload serialization failed: ${e && e.message ? e.message : String(e)}`);
    process.exit(1);
  }
  const pv = validateSolStakingRuntimeMarketPayload(JSON.parse(serialized), {});
  if (!pv.valid) {
    console.error(`Generated runtime payload failed validation: ${pv.errors.join(", ")}. Final artifact left untouched.`);
    process.exit(1);
  }

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(TMP_PATH, serialized, "utf8");
  renameSync(TMP_PATH, FINAL_PATH);

  const cand = Object.keys(v.cache.candidates).length;
  console.log(`Published sanitized SOL staking market cache → ${path.relative(APP_DIR, FINAL_PATH)}`);
  console.log(`  publishedAt: ${payload.publishedAt} | cache generatedAt: ${v.cache.generatedAt} (${ageHours.toFixed(1)}h old) | candidates: ${cand}`);
  console.log("  Excluded: sourceResponses, headers, env, secrets, raw provider payloads.");
  process.exit(0);
}

main().catch((e) => { console.error(`Publish failed: ${e && e.stack ? e.stack : String(e)}`); process.exit(1); });
