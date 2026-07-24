import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

// The design-system repo root is served so approved assets in ../assets/
// can be referenced read-only. App code itself lives entirely under app/.
export default defineConfig({
  // wasm + topLevelAwait: the Kamino SDK (via kliquidity/Orca) ships ESM WebAssembly
  // that Vite can't bundle by default. These are only pulled into the lazily-loaded
  // Kamino vault chunk, not the main bundle.
  plugins: [react(), wasm(), topLevelAwait()],
  // The Kamino SDK chain is CJS, so it must be pre-bundled (CJS→ESM) to run in the
  // browser. But one transitive dep, @orca-so/whirlpools-core, is a top-level-await
  // WASM module that esbuild's pre-bundler refuses to `require()`. Excluding ONLY
  // that package makes esbuild treat it as external (no TLA error) while still
  // transforming the rest of the Kamino SDK; at runtime the wasm plugin loads it.
  // The Kamino SDK is dynamically imported, so none of this touches the main app.
  optimizeDeps: {
    include: ["@kamino-finance/klend-sdk"],
    exclude: ["@orca-so/whirlpools-core"],
  },
  // Solana web3.js / wallet-adapter reference the Node `global`; alias it to the
  // browser global. `Buffer` is polyfilled at runtime in main.tsx. No Node crypto
  // or network is used at connect time — this is only for wallet-adapter compat.
  define: {
    global: "globalThis",
  },
  server: {
    port: 5173,
    fs: {
      // allow serving files from the repo root (read-only: assets/, tokens/)
      allow: [".."],
    },
    // Step 23B.1 — DEV-ONLY proxy so the SPA can reach the server-only swap-quote service (run `npm run swap:serve`)
    // without the browser ever calling providers directly. Not used in production (SPA talks to the deployed
    // service via VITE_SWAP_QUOTE_API_BASE). The quote layer stays unmounted until Step 23C.
    proxy: {
      "/api/swap-quote": { target: process.env.SWAP_QUOTE_DEV_TARGET ?? "http://localhost:8787", changeOrigin: true },
    },
  },
});
