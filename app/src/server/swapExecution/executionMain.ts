/**
 * executionMain — Phase 4 (SERVER-ONLY). The execution process entry. Bundled by
 * `swap:build-server` into `dist-server/swap-execute-server.mjs` and started with
 * `node dist-server/swap-execute-server.mjs`.
 *
 * Its own process, not a route added to the quote server — see `executionServer.ts` for why.
 * Fails fast and loudly on a configuration problem (a leaked VITE_ swap secret) rather than
 * starting a server that would use one.
 */
import { startSwapExecuteServer } from "./executionServer";

try {
  startSwapExecuteServer();
} catch (e) {
  // eslint-disable-next-line no-console
  console.error(`swap-execute server failed to start (configuration): ${e instanceof Error ? e.message : "unknown"}`);
  if (typeof process !== "undefined") process.exit(1);
}
