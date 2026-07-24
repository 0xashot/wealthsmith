/**
 * build-swap-server.mjs — Step 23B.1. Pre-bundles the server-only TypeScript entry into a single deployable
 * Node ESM file (`dist-server/swap-quote-server.mjs`). Production runs this prebuilt artifact — NO esbuild runs
 * per request. Server-only: never bundled into the browser SPA.
 *
 *   Build: node scripts/build-swap-server.mjs   →   Run: node dist-server/swap-quote-server.mjs
 */
import { build } from "esbuild";
import { mkdirSync } from "node:fs";

const ENTRY = new URL("../src/server/swapQuote/serverMain.ts", import.meta.url).pathname;
const OUT = new URL("../dist-server/swap-quote-server.mjs", import.meta.url).pathname;

mkdirSync(new URL("../dist-server/", import.meta.url).pathname, { recursive: true });
await build({
  entryPoints: [ENTRY],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node18",
  outfile: OUT,
  loader: { ".ts": "ts", ".tsx": "tsx" },
  resolveExtensions: [".ts", ".tsx", ".mjs", ".js"],
  logLevel: "error",
  // ESM output that still needs require() for a couple of transitive CJS deps.
  banner: { js: "import{createRequire as ___cr}from'module';const require=___cr(import.meta.url);" },
});
// eslint-disable-next-line no-console
console.log("swap-quote server bundled → dist-server/swap-quote-server.mjs");
