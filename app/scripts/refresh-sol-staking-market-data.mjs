/**
 * refresh-sol-staking-market-data — Step 14U. SERVER-SIDE / local Node refresh job for the
 * live SOL staking market-data cache. It fetches ONLY approved public endpoints (no API keys,
 * no secrets, no browser runtime), validates each response, feeds raw payloads through the REAL
 * deterministic builders (bundled from TypeScript with esbuild — no logic duplication), merges
 * over the previous last-known-good cache, and atomically writes tmp/sol-staking-market-data-cache.json.
 *
 * It NEVER modifies approval evidence, risk scores, or any TypeScript source. It never ranks,
 * selects, or moves funds. Exit 0 when ≥1 candidate refresh succeeds and output validates;
 * non-zero otherwise.
 *
 * Run:  npm run market:refresh-staking
 */
import { build } from "esbuild";
import { writeFileSync, renameSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

const APP_DIR = process.cwd();
const TMP_DIR = path.join(APP_DIR, "tmp");
const FINAL_PATH = path.join(TMP_DIR, "sol-staking-market-data-cache.json");
const TMP_PATH = `${FINAL_PATH}.tmp`;
const BUNDLE_PATH = path.join(TMP_DIR, ".sol-staking-refresh-bundle.mjs");
const FETCH_TIMEOUT_MS = 15_000;

/**
 * No secret env var is ever read. Assert none of these leak into the process for this job.
 * Built from fragments so this denylist does not reintroduce the Step 14T-removed provider token.
 */
const FORBIDDEN_SECRETS = ["RATED", "BLOCKDAEMON"].flatMap((p) => [`${p}_API_KEY`, `VITE_${p}_API_KEY`]);

function nowIso() {
  return new Date().toISOString();
}

/** Fetch JSON with a hard timeout. Never throws — returns a typed result. */
async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const fetchedAt = nowIso();
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { accept: "application/json" } });
    if (!res.ok) {
      return { ok: false, httpStatus: res.status, fetchedAt, error: `HTTP ${res.status}` };
    }
    const text = await res.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      return { ok: false, httpStatus: res.status, fetchedAt, error: "invalid_json" };
    }
    return { ok: true, httpStatus: res.status, fetchedAt, payload };
  } catch (e) {
    const msg = e && e.name === "AbortError" ? "timeout" : e && e.message ? e.message : String(e);
    return { ok: false, httpStatus: 0, fetchedAt, error: msg };
  } finally {
    clearTimeout(timer);
  }
}

/** Bundle the real TS builders/cache into an importable ESM module (no source is modified). */
async function loadBuilders() {
  const entry = [
    `export { buildSolStakingMarketCache } from './src/suggestions/solStakingMarketDataRefresh.ts';`,
    `export { mergeSolStakingMarketRefresh, validateSolStakingMarketCache } from './src/suggestions/solStakingMarketDataCache.ts';`,
    `export { SOL_STAKING_MARKET_CACHE_SCHEMA_VERSION, DEFILLAMA_POOLS_URL, stakewizValidatorUrl } from './src/suggestions/solStakingMarketDataSources.ts';`,
    `export { marinadeJupiterValidatorHistoryUrl } from './src/suggestions/nativeValidatorMarinadeData.ts';`,
    `export { JUPITER_NATIVE_STAKE_VOTE_ACCOUNT } from './src/suggestions/nativeValidatorMarketData.ts';`,
  ].join("\n");
  await build({
    stdin: { contents: entry, resolveDir: APP_DIR, loader: "ts", sourcefile: "refresh-entry.ts" },
    bundle: true,
    format: "esm",
    platform: "node",
    outfile: BUNDLE_PATH,
    logLevel: "silent",
  });
  return import(`${pathToFileURL(BUNDLE_PATH).href}?t=${Date.now()}`);
}

/** A trimmed, sanitized description of a fetch — never the full raw payload. */
function sanitizeSource(name, url, res, extra = {}) {
  return {
    provider: name,
    url,
    ok: res.ok === true,
    httpStatus: res.httpStatus ?? 0,
    fetchedAt: res.fetchedAt,
    ...(res.error ? { error: res.error } : {}),
    ...extra,
  };
}

async function main() {
  const leakedSecrets = FORBIDDEN_SECRETS.filter((k) => typeof process.env[k] === "string" && process.env[k].length > 0);
  if (leakedSecrets.length > 0) {
    // This job must never use a secret. If one is present, fail loudly rather than use it.
    console.error(`Refusing to run: forbidden secret env var(s) present: ${leakedSecrets.join(", ")}. This job uses no API keys.`);
    process.exit(1);
  }

  if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true });

  const mod = await loadBuilders();
  const {
    buildSolStakingMarketCache,
    mergeSolStakingMarketRefresh,
    validateSolStakingMarketCache,
    SOL_STAKING_MARKET_CACHE_SCHEMA_VERSION,
    DEFILLAMA_POOLS_URL,
    stakewizValidatorUrl,
    marinadeJupiterValidatorHistoryUrl,
  } = mod;

  const refreshAttemptedAt = nowIso();
  const refreshErrors = [];

  // Fetch the three public sources independently.
  const stakewizUrl = stakewizValidatorUrl();
  const marinadeUrl = marinadeJupiterValidatorHistoryUrl();
  const [dll, sw, mar] = await Promise.all([
    fetchJson(DEFILLAMA_POOLS_URL),
    fetchJson(stakewizUrl),
    fetchJson(marinadeUrl),
  ]);
  // `checkedAt` is captured AFTER the fetches so it is never earlier than any `fetchedAt`
  // (an evaluation time before the data was fetched would falsely read as stale).
  const checkedAt = nowIso();
  if (!dll.ok) refreshErrors.push(`defillama: ${dll.error}`);
  if (!sw.ok) refreshErrors.push(`stakewiz: ${sw.error}`);
  if (!mar.ok) refreshErrors.push(`marinade: ${mar.error}`);

  const sourceResponses = [
    sanitizeSource("defillama_pools", DEFILLAMA_POOLS_URL, dll, {
      recordCount: dll.ok && dll.payload && Array.isArray(dll.payload.data) ? dll.payload.data.length : undefined,
    }),
    sanitizeSource("stakewiz", stakewizUrl, sw),
    sanitizeSource("marinade_validator_history", marinadeUrl, mar),
  ];

  // Build the attempted cache from whatever payloads succeeded (undefined = provider failed).
  const attempted = buildSolStakingMarketCache({
    checkedAt,
    generatedAt: checkedAt,
    refreshAttemptedAt,
    defiLlama: dll.ok ? { payload: dll.payload, fetchedAt: dll.fetchedAt } : undefined,
    stakewiz: sw.ok ? { payload: sw.payload, fetchedAt: sw.fetchedAt } : undefined,
    marinade: mar.ok ? { payload: mar.payload, fetchedAt: mar.fetchedAt } : undefined,
  });
  const attemptSuccessCount = attempted.successfulCandidateIds.length;

  // Merge over the previous last-known-good cache, if any.
  let previousCache;
  if (existsSync(FINAL_PATH)) {
    try {
      const prevWrapper = JSON.parse(readFileSync(FINAL_PATH, "utf8"));
      const v = validateSolStakingMarketCache(prevWrapper.normalizedCache, {});
      if (v.valid) previousCache = v.cache;
      else refreshErrors.push(`previous_cache_invalid: ${v.errors.join(",")}`);
    } catch (e) {
      refreshErrors.push(`previous_cache_read_failed: ${e && e.message ? e.message : String(e)}`);
    }
  }

  const normalizedCache = mergeSolStakingMarketRefresh(previousCache, attempted, { checkedAt });

  const output = {
    schemaVersion: SOL_STAKING_MARKET_CACHE_SCHEMA_VERSION,
    generatedAt: checkedAt,
    checkedAt,
    refreshAttemptedAt,
    sourceResponses,
    normalizedCache,
    refreshErrors,
  };

  // Serialize + validate BEFORE touching the final file (atomic replace).
  let serialized;
  try {
    serialized = JSON.stringify(output, null, 2);
    JSON.parse(serialized); // integrity check
  } catch (e) {
    console.error(`Output serialization failed: ${e && e.message ? e.message : String(e)}`);
    process.exit(1);
  }
  const outValidation = validateSolStakingMarketCache(normalizedCache, {});
  if (!outValidation.valid) {
    console.error(`Generated cache failed validation: ${outValidation.errors.join(", ")}. Final file left untouched.`);
    process.exit(1);
  }

  writeFileSync(TMP_PATH, serialized, "utf8");
  renameSync(TMP_PATH, FINAL_PATH);

  // Report per-candidate result.
  console.log(`SOL staking market-data refresh @ ${checkedAt}`);
  console.log(`  refreshStatus: ${normalizedCache.refreshStatus} (attempt succeeded for ${attemptSuccessCount} candidate(s))`);
  for (const id of Object.keys(normalizedCache.candidates)) {
    const s = normalizedCache.candidates[id];
    console.log(`  - ${id.padEnd(20)} status=${s.status.padEnd(12)} approved=${s.approvedForReadOnlyReview} eligible=${s.eligibleForFutureComparison}${s.blockers.length ? ` blockers=[${s.blockers.join(",")}]` : ""}`);
  }
  if (refreshErrors.length) console.log(`  refreshErrors: ${refreshErrors.join(" | ")}`);
  console.log(`  wrote: ${path.relative(APP_DIR, FINAL_PATH)}`);

  // Exit non-zero when NO candidate refresh succeeded this run.
  if (attemptSuccessCount === 0) {
    console.error("No candidate refresh succeeded this run.");
    process.exit(2);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(`Refresh failed: ${e && e.stack ? e.stack : String(e)}`);
  process.exit(1);
});
