/**
 * run-fixtures — the committed entry point for the deterministic fixture suite
 * (`npm test`).
 *
 * The suite lives in src/suggestions/suggestionEngine.fixtures.ts (plus the
 * files under src/suggestions/fixtures/) and asserts the Suggestion Engine's
 * fail-closed policies, copy contracts, and recorded end-to-end paths. Until
 * this script existed the suite was only runnable through ad-hoc bundles built
 * outside the repo — the project's primary regression net had no committed way
 * to run it.
 *
 * What it does:
 *   1. Bundles a tiny entry that calls `printFixtureResults()` with esbuild
 *      (already a dependency via Vite) into node_modules/.cache.
 *   2. Runs the bundle in a child Node process, streaming its output.
 *   3. Exits non-zero when any line starts with "FAIL", when the final
 *      "<n>/<n> fixture checks passed" summary is missing or not all-passing,
 *      or when the child process itself fails — so CI can gate on it.
 *
 * Flags: --quiet prints only FAIL lines and the summary.
 */
import { build } from "esbuild";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const cacheDir = join(appDir, "node_modules", ".cache", "wealthsmith-fixtures");
mkdirSync(cacheDir, { recursive: true });

const entry = join(cacheDir, "entry.mjs");
writeFileSync(
  entry,
  `import { printFixtureResults } from ${JSON.stringify(join(appDir, "src/suggestions/suggestionEngine.fixtures.ts"))};\nprintFixtureResults();\n`
);

const outfile = join(cacheDir, "suite.cjs");
await build({
  entryPoints: [entry],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile,
  logLevel: "silent",
  // .svg imports resolve to their path string, matching Vite's asset handling
  // closely enough for a headless run (components are not rendered here).
  loader: { ".svg": "text", ".json": "json" },
});

const quiet = process.argv.includes("--quiet");
const child = spawn(process.execPath, [outfile], { cwd: appDir });

let sawFail = false;
let summary = null;
let buffer = "";

function handleLine(line) {
  if (/^FAIL\b/.test(line)) sawFail = true;
  const m = line.match(/^(\d+)\/(\d+) fixture checks passed/);
  if (m) summary = { passed: Number(m[1]), total: Number(m[2]) };
  if (!quiet || /^FAIL\b/.test(line) || m) process.stdout.write(line + "\n");
}

child.stdout.on("data", (chunk) => {
  buffer += chunk;
  const lines = buffer.split("\n");
  buffer = lines.pop() ?? "";
  for (const line of lines) handleLine(line);
});
child.stderr.on("data", (chunk) => process.stderr.write(chunk));

child.on("close", (code) => {
  if (buffer) handleLine(buffer);
  if (code !== 0) {
    console.error(`\nfixture suite process exited with code ${code}`);
    process.exit(code ?? 1);
  }
  if (!summary) {
    console.error("\nfixture suite produced no summary line — treating as failure");
    process.exit(1);
  }
  if (sawFail || summary.passed !== summary.total) {
    console.error(`\n${summary.total - summary.passed} fixture check(s) FAILED`);
    process.exit(1);
  }
  process.exit(0);
});
