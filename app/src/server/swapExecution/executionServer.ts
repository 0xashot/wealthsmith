/**
 * executionServer — Phase 4 (SERVER-ONLY). The node:http binding for `POST /api/swap-execute`.
 *
 * Phase 2 built the handler; nothing ever served it. A handler with no transport is a handler
 * nobody has run end to end, so this is the smallest thing that makes the execution lane
 * reachable — locally for verification now, and as the same shape the backend will mount later.
 *
 * A SEPARATE LISTENER from `swapQuote/httpServer.ts`, deliberately. That file documents the quote
 * service as something that "constructs / simulates / signs / submits NOTHING", and its fixtures
 * hold it to that. Adding an execute route to it would make the claim false for the process even
 * though it stayed true for the handler, and a guarantee with an asterisk is not one. Two
 * listeners, two routes, two claims that each remain exactly true.
 *
 * What this process still never does: sign, submit, or hold a key. It returns an UNSIGNED
 * transaction. The signature happens in the user's wallet, once, per transaction.
 *
 * OFF BY DEFAULT. The handler's kill switch (`SWAP_EXECUTION_ENABLED` must be exactly "true")
 * is checked inside every request, before validation. This file adds a second, louder check at
 * STARTUP: a disabled environment logs that it is disabled and serves 503s, so an operator can
 * tell the difference between "execution is off" and "the deploy is broken" without reading code.
 */
import http from "node:http";
import { createSwapExecuteHandler, isExecutionEnabled } from "./executionHandler";
import { SwapRateLimiter, SWAP_RATE_LIMIT_CONFIG } from "../swapQuote/rateLimit";
import { nodeEnvReader, detectLeakedSwapEnv, SWAP_PROVIDER_ENDPOINTS, type EnvReader } from "../swapQuote/providerConfig";

/** Default port. Distinct from the quote service's 8787 so both can run side by side in dev. */
export const DEFAULT_EXECUTION_PORT = 8788;

export interface ExecutionServerOptions {
  port?: number;
  env?: EnvReader;
  fetchImpl?: typeof fetch;
  now?: () => number;
  allowedOrigin?: string | null;
}

function corsHeaders(origin: string | undefined, allowed: string | null): Record<string, string> {
  // Echo the Origin only when it matches the single approved one. Deny by default, same as the
  // quote service — an execution route is the last place to be relaxed about who may call it.
  if (allowed && origin && origin === allowed) {
    return {
      "access-control-allow-origin": allowed,
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
      vary: "Origin",
    };
  }
  return {};
}

/**
 * Build the request listener.
 *
 * The `quoteEndpoint` comes from server config or a server-only env override — never from the
 * request. A caller who could choose the quote host could choose the terms.
 */
export function createExecutionRequestListener(opts: ExecutionServerOptions = {}): http.RequestListener {
  const env = opts.env ?? nodeEnvReader;

  // Fail fast on a leaked VITE_ swap secret, exactly as the quote entry does. A build that would
  // ship a provider credential to the browser must not start a server that uses one.
  const leaked = detectLeakedSwapEnv(env);
  if (leaked.length > 0) throw new Error(`swap_execution_env_leak: ${leaked.join(",")}`);

  const allowedOrigin = opts.allowedOrigin ?? env("SWAP_ALLOWED_ORIGIN") ?? null;
  const quoteEndpoint = env("JUPITER_QUOTE_URL") ?? SWAP_PROVIDER_ENDPOINTS.jupiter.quoteEndpoint;

  const handler = createSwapExecuteHandler({
    quoteEndpoint,
    env,
    fetchImpl: opts.fetchImpl,
    now: opts.now,
  });
  const limiter = new SwapRateLimiter();

  return (req, res) => {
    const cors = corsHeaders(req.headers.origin, allowedOrigin);
    const send = (status: number, body: unknown, extra: Record<string, string> = {}) => {
      // A plan is never cacheable: it is bound to one blockhash, one wallet and one 25s window.
      res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store", ...cors, ...extra });
      res.end(JSON.stringify(body));
    };

    if (req.method === "OPTIONS") { send(204, {}); return; }

    if (req.method === "GET" && req.url?.startsWith("/health")) {
      // Reports only whether execution is switched on — never the provider endpoint or any env value.
      const enabled = isExecutionEnabled(env);
      send(enabled ? 200 : 503, { state: enabled ? "enabled" : "disabled", lane: "swap_execution" });
      return;
    }

    if (req.method !== "POST" || !req.url?.startsWith("/api/swap-execute")) {
      send(404, { error: "not_found" });
      return;
    }

    const callerId =
      req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() || req.socket.remoteAddress || "anon";
    const decision = limiter.acquire(callerId);
    if (!decision.allowed) {
      send(429, { error: "rate_limited", reason: decision.reason }, { "retry-after": String(Math.ceil(decision.retryAfterMs / 1000)) });
      return;
    }

    let raw = "";
    let aborted = false;
    req.on("data", (c) => {
      raw += c;
      if (raw.length > SWAP_RATE_LIMIT_CONFIG.maxBodyBytes) { aborted = true; req.destroy(); }
    });
    req.on("end", async () => {
      if (aborted) { limiter.release(); return; }
      let body: unknown;
      try { body = JSON.parse(raw); } catch { limiter.release(); send(400, { error: "invalid_json" }); return; }
      try {
        const result = await handler({ method: "POST", body });
        send(result.status, result.body);
      } catch {
        // Never a stack trace, never a provider error. The client has one correct response to all
        // of these — fall back to the handoff — and `unavailable` is what says so.
        send(503, { error: "unavailable" });
      } finally {
        limiter.release();
      }
    });
    req.on("error", () => { limiter.release(); });
  };
}

/** Start the execution server. Logs whether the kill switch is on, so "off" is never mistaken for "broken". */
export function startSwapExecuteServer(opts: ExecutionServerOptions = {}): http.Server {
  const env = opts.env ?? nodeEnvReader;
  const port = opts.port ?? Number(env("EXECUTION_PORT") ?? DEFAULT_EXECUTION_PORT);
  const server = http.createServer(createExecutionRequestListener({ ...opts, env }));
  server.listen(port, () => {
    const state = isExecutionEnabled(env) ? "ENABLED" : "DISABLED (SWAP_EXECUTION_ENABLED is not \"true\" — every request returns 503)";
    // eslint-disable-next-line no-console
    console.log(`swap-execute server listening on :${port} — POST /api/swap-execute, GET /health — execution ${state}`);
  });
  return server;
}
