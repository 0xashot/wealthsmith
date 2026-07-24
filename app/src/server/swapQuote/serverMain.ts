/**
 * serverMain — Step 23B.1 (SERVER-ONLY). The production process entry. Bundled by `swap:build-server` into
 * `dist-server/swap-quote-server.mjs` (no per-request esbuild) and started with `node dist-server/swap-quote-server.mjs`.
 * Reads server-only env; graceful failure on a leaked VITE_ secret (thrown by the handler factory at startup).
 */
import { startSwapQuoteServer } from "./httpServer";

try {
  startSwapQuoteServer();
} catch (e) {
  // eslint-disable-next-line no-console
  console.error(`swap-quote server failed to start (configuration): ${e instanceof Error ? e.message : "unknown"}`);
  if (typeof process !== "undefined") process.exit(1);
}
