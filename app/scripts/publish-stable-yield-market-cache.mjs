/**
 * publish-stable-yield-market-cache — Step 16H-I. Publishes the validated Stable Yield refresh artifact
 * to the same-origin runtime cache. Mirrors `publish-sol-staking-market-cache.mjs`.
 *
 * It reads ONLY the local refresh artifact and NEVER touches the network — retrieval already happened in
 * the refresh job. It revalidates through the REAL bundled TypeScript validator (esbuild, no logic
 * duplication), then writes atomically via tmp + rename so a partially-written production cache can
 * never be served.
 *
 * It approves nothing, ranks nothing, plans nothing, creates no suggestion, mutates no registry, and
 * invents no fallback value.
 *
 * Run:  npm run publish:stable-yield-market-cache
 *       npm run validate:stable-yield-market-cache   (validate only; writes nothing)
 */
import { build } from "esbuild";
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

const APP_DIR = process.cwd();
const INPUT_PATH = path.join(APP_DIR, "tmp", "stable-yield-market-refresh.json");
const OUT_DIR = path.join(APP_DIR, "public", "generated");
const FINAL_PATH = path.join(OUT_DIR, "stable-yield-market-cache.json");
const TMP_PATH = `${FINAL_PATH}.tmp`;
const BUNDLE_PATH = path.join(APP_DIR, "tmp", ".stable-yield-publish-bundle.mjs");
const VALIDATE_ONLY = process.argv.includes("--validate-only");

const redact = (s) => (typeof s === "string" && s.length > 10 ? `${s.slice(0, 4)}…${s.slice(-4)}` : String(s));

function die(stage, reason) {
  console.error(`publish FAILED [${stage}]: ${reason}`);
  process.exit(1);
}

async function loadValidator() {
  mkdirSync(path.join(APP_DIR, "tmp"), { recursive: true });
  await build({
    entryPoints: [path.join(APP_DIR, "src/suggestions/stableYieldMarketCache.ts")],
    bundle: true,
    format: "esm",
    platform: "node",
    outfile: BUNDLE_PATH,
    logLevel: "silent",
  });
  return import(pathToFileURL(BUNDLE_PATH).href);
}

async function main() {
  if (!existsSync(INPUT_PATH)) die("input", `no refresh artifact at ${path.relative(APP_DIR, INPUT_PATH)} — run 'npm run refresh:stable-yield-market-data' first`);

  let raw;
  try {
    raw = JSON.parse(readFileSync(INPUT_PATH, "utf8"));
  } catch (e) {
    die("source_parse", `artifact is not valid JSON: ${String(e.message).slice(0, 60)}`);
  }

  const mod = await loadValidator();
  const checkedAt = new Date().toISOString();
  const result = mod.validateStableYieldMarketRecord(raw, checkedAt);
  if (!result.valid) die(result.stage, result.reason);

  const rec = result.record;

  // Belt and braces: the artifact must carry no secret/user/raw-response material. The refresh job
  // already constructs the object field-by-field, but a published file is forever — check anyway.
  const blob = JSON.stringify(rec).toLowerCase();
  for (const banned of ["api_key", "apikey", "helius", "quicknode", "alchemy", "secret", "authorization", "rpcurl", "http://", "https://"]) {
    if (blob.includes(banned)) die("privacy", `refusing to publish: artifact contains '${banned}'`);
  }
  for (const banned of Object.keys(mod.REJECTED_VAULT_ADDRESSES)) {
    if (blob.includes(banned.toLowerCase())) die("identity_validation", "refusing to publish: artifact references a non-selected vault");
  }

  const netApyPct = mod.cacheRecordNetApyPct(rec);
  const minUsd = mod.rawTokenAmountToUsd(rec.minDepositRaw, rec.mintDecimals);

  console.log("Stable Yield market cache — validation");
  console.log("======================================");
  console.log(`  product        : ${rec.strategyId} @ ${redact(rec.productAddress)}`);
  console.log(`  identity       : shares ✓  depositMint=USDC ✓  chain=${rec.chain} ✓`);
  console.log(`  source         : ${rec.sourceMethod}`);
  console.log(`  source slot    : ${rec.sourceSlot}`);
  console.log(`  source time    : ${rec.sourceTimestamp}  (chain time — authoritative)`);
  console.log(`  net APY        : ${netApyPct}%  [${rec.netApyUnit} -> percent]`);
  console.log(`  min deposit    : ${minUsd} USDC`);
  console.log(`  fees           : mgmt=${rec.managementFeeBps}bps perf=${rec.performanceFeeBps}bps (already deducted by the SDK's net APY)`);
  console.log(`  capacity       : ${rec.capacityState}`);
  console.log(`  deposit state  : ${rec.depositState}`);
  console.log(`  browserFetched : ${rec.browserFetched}`);
  console.log(`  planningSafe   : ${rec.planningSafe}   blockers: ${rec.blockers.join(", ")}`);

  if (VALIDATE_ONLY) {
    console.log("\nvalidate-only: no file written. VALID ✓");
    if (existsSync(BUNDLE_PATH)) rmSync(BUNDLE_PATH, { force: true });
    process.exit(0);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(TMP_PATH, `${JSON.stringify(rec, null, 2)}\n`, "utf8");
  renameSync(TMP_PATH, FINAL_PATH); // atomic — never a partially-written production cache
  if (existsSync(BUNDLE_PATH)) rmSync(BUNDLE_PATH, { force: true });

  console.log(`\nPublished Stable Yield market cache → ${path.relative(APP_DIR, FINAL_PATH)}`);
  console.log("NOTE: publishing market data does NOT approve the product. It remains unapproved and");
  console.log("      production continues to render no Stable Yield card.");
  process.exit(0);
}

main().catch((e) => die("unknown", String(e?.message ?? e).slice(0, 120)));
