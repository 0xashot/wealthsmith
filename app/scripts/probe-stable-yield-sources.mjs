/**
 * probe-stable-yield-sources — Step 16H-G. DEVELOPER-ONLY, local Node probe for PRODUCTION Stable Yield
 * sources. It reports what the adapter layer can and cannot prove today. It is NOT a runtime dependency,
 * is NOT part of the deterministic fixture suite, and NEVER runs during build.
 *
 * It performs stage A (retrieval) — the one stage the deterministic code may not do, because the 16C
 * contract pins `browserFetched: false` — then feeds payloads through the REAL bundled TypeScript
 * adapters (esbuild, no logic duplication), exactly like `refresh-sol-staking-market-data.mjs`.
 *
 * It NEVER: mutates the registry, approves a product, creates a plan/suggestion, writes live values into
 * source, reads a secret, or requires network for normal tests.
 *
 * Run:  npm run probe:stable-yield          (readiness report only — no network needed)
 *       npm run probe:stable-yield -- --write-snapshot   (also writes tmp/stable-yield-evidence-snapshot.json)
 *
 * CURRENT BEHAVIOUR: every candidate is blocked at identity (`missing_product_address`), so the probe
 * makes NO network request at all — there is no exact product address to query. That is the honest
 * result, and the probe reports it rather than inventing an endpoint.
 */
import { build } from "esbuild";
import { writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

const APP_DIR = process.cwd();
const TMP_DIR = path.join(APP_DIR, "tmp");
const BUNDLE_PATH = path.join(TMP_DIR, ".stable-yield-probe-bundle.mjs");
const SNAPSHOT_PATH = path.join(TMP_DIR, "stable-yield-evidence-snapshot.json");
const WRITE_SNAPSHOT = process.argv.includes("--write-snapshot");

/** No secret is ever read by this probe. Assert none leaks into the process. */
const FORBIDDEN_SECRETS = ["RATED", "BLOCKDAEMON", "HELIUS", "ALCHEMY"].flatMap((p) => [`${p}_API_KEY`, `VITE_${p}_API_KEY`]);

/** Redact anything address-shaped so a snapshot can be shared without leaking identifiers. */
function redactAddress(a) {
  if (typeof a !== "string" || a.length < 10) return a;
  return `${a.slice(0, 4)}…${a.slice(-4)}`;
}

async function main() {
  const leaked = FORBIDDEN_SECRETS.filter((k) => process.env[k]);
  if (leaked.length) {
    console.error(`refusing to run: secret env vars present (${leaked.join(", ")}). This probe must never read credentials.`);
    process.exit(2);
  }

  mkdirSync(TMP_DIR, { recursive: true });

  // Bundle the REAL adapters + evidence manifests from TypeScript — never reimplement the logic here.
  await build({
    entryPoints: [path.join(APP_DIR, "src/suggestions/stableYieldProductionProbeEntry.ts")],
    bundle: true,
    format: "esm",
    platform: "node",
    outfile: BUNDLE_PATH,
    logLevel: "silent",
  });
  const mod = await import(pathToFileURL(BUNDLE_PATH).href);

  const checkedAt = new Date().toISOString();
  const report = mod.buildStableYieldProbeReport({ checkedAt });

  console.log("\nStable Yield production source probe");
  console.log("====================================");
  console.log(`checkedAt: ${checkedAt}`);
  console.log(`candidates: ${report.rows.length}   readyForExplicitReview: ${report.readyForReviewCount}   approved: 0 (approval is Step 16H-H)\n`);

  for (const row of report.rows) {
    console.log(`• ${row.strategyId}`);
    console.log(`    identityAdapter=${row.identityAdapter}  apyAdapter=${row.apyAdapter}  capacityAdapter=${row.capacityAdapter}  riskEvidence=${row.riskReviewEvidence}`);
    console.log(`    readyForExplicitReview=${row.readyForExplicitReview}  approved=${row.approved}`);
    console.log(`    primaryBlocker: ${row.primaryBlocker}  (${row.blockerCount} blocker(s))`);
  }

  console.log("\nNetwork retrieval");
  console.log("-----------------");
  if (report.queryableCandidates.length === 0) {
    console.log("  No candidate has a documented exact product address, so NO source query is possible.");
    console.log("  The probe made zero network requests. Document exact addresses (Step 16H-H) to enable retrieval.");
  } else {
    console.log(`  Queryable candidates: ${report.queryableCandidates.map((c) => `${c.strategyId} (${redactAddress(c.productAddress)})`).join(", ")}`);
    console.log("  NOTE: retrieval is implemented per-source only once an address exists; re-run to fetch.");
  }

  console.log(`\nProduction card state: ${report.productionRendersCard ? "CARD (unexpected!)" : "no Stable Yield card (expected — no approved product)"}`);

  if (WRITE_SNAPSHOT) {
    const redacted = { ...report, generatedAt: checkedAt, manifests: report.manifests.map((m) => ({ ...m, productAddress: m.productAddress ? redactAddress(m.productAddress) : undefined })) };
    writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(redacted, null, 2)}\n`, "utf8");
    console.log(`\nwrote redacted evidence snapshot: ${path.relative(APP_DIR, SNAPSHOT_PATH)}`);
  }

  if (existsSync(BUNDLE_PATH)) rmSync(BUNDLE_PATH, { force: true });

  // Exit 0: "everything is blocked" is a correct, expected report — not a failure of the probe.
  console.log("");
  process.exit(0);
}

main().catch((err) => {
  console.error(`probe failed: ${err?.message ?? "unknown error"}`);
  process.exit(1);
});
