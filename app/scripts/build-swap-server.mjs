/**
 * build-swap-server.mjs — Step 23B.1, extended in Phase 4. Pre-bundles the server-only TypeScript entries into
 * single deployable Node ESM files. Production runs these prebuilt artifacts — NO esbuild runs per request.
 * Server-only: never bundled into the browser SPA.
 *
 *   Build: node scripts/build-swap-server.mjs
 *   Run:   node dist-server/swap-quote-server.mjs      (read-only quote comparison, port 8787)
 *          node dist-server/swap-execute-server.mjs    (unsigned-plan construction, port 8788)
 *
 * Two artifacts, not one process with two routes: the quote service's guarantee that it constructs nothing
 * stays literally true only if it is a different process. See src/server/swapExecution/executionServer.ts.
 */
import { build } from "esbuild";
import { mkdirSync } from "node:fs";

const ENTRIES = [
  { entry: "../src/server/swapQuote/serverMain.ts", out: "../dist-server/swap-quote-server.mjs", label: "swap-quote" },
  { entry: "../src/server/swapExecution/executionMain.ts", out: "../dist-server/swap-execute-server.mjs", label: "swap-execute" },
];

mkdirSync(new URL("../dist-server/", import.meta.url).pathname, { recursive: true });

for (const { entry, out, label } of ENTRIES) {
  await build({
    entryPoints: [new URL(entry, import.meta.url).pathname],
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node18",
    outfile: new URL(out, import.meta.url).pathname,
    loader: { ".ts": "ts", ".tsx": "tsx" },
    resolveExtensions: [".ts", ".tsx", ".mjs", ".js"],
    logLevel: "error",
    // ESM output that still needs require() for a couple of transitive CJS deps.
    banner: { js: "import{createRequire as ___cr}from'module';const require=___cr(import.meta.url);" },
  });
  // eslint-disable-next-line no-console
  console.log(`${label} server bundled → ${out.replace("../", "")}`);
}
