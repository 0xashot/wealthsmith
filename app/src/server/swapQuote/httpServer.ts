/**
 * httpServer — Step 23B.1 (SERVER-ONLY). The concrete request-time server: a node:http binding around the
 * sanitized handler with a health endpoint, per-caller rate limiting, an approved-origin CORS gate, a bounded
 * body, and safe canonical errors (never a stack trace / raw provider error / secret). Deployed as a small Node
 * web service (e.g. Render/Railway/Fly). No esbuild runs per request — it is pre-bundled by `swap:build-server`.
 */
import http from "node:http";
import { createSwapQuoteRequestHandler, type NodeServerDeps } from "./nodeServerEntry";
import { assessServiceHealth } from "./serviceHealth";
import { SwapRateLimiter, SWAP_RATE_LIMIT_CONFIG } from "./rateLimit";
import { nodeEnvReader } from "./providerConfig";

export interface SwapServerOptions extends NodeServerDeps {
  port?: number;
  allowedOrigin?: string | null;
}

function corsHeaders(origin: string | undefined, allowed: string | null): Record<string, string> {
  // Only echo the Origin when it matches the single approved origin; otherwise omit (deny by default).
  if (allowed && origin && origin === allowed) {
    return { "access-control-allow-origin": allowed, "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type", vary: "Origin" };
  }
  return {};
}

/** Build the node request listener. Pure wiring; testable pieces (health, rate limit) live in their own modules. */
export function createRequestListener(opts: SwapServerOptions = {}): http.RequestListener {
  const env = opts.env ?? nodeEnvReader;
  const allowedOrigin = opts.allowedOrigin ?? env("SWAP_ALLOWED_ORIGIN") ?? null;
  const handler = createSwapQuoteRequestHandler({ env, fetchImpl: opts.fetchImpl, rpcRead: opts.rpcRead, now: opts.now });
  const limiter = new SwapRateLimiter();

  return (req, res) => {
    const cors = corsHeaders(req.headers.origin, allowedOrigin);
    const send = (status: number, body: unknown, extra: Record<string, string> = {}) => {
      res.writeHead(status, { "content-type": "application/json", ...cors, ...extra });
      res.end(JSON.stringify(body));
    };

    if (req.method === "OPTIONS") { send(204, {}); return; }
    if (req.method === "GET" && req.url?.startsWith("/health")) {
      const h = assessServiceHealth({ env });
      send(h.state === "unavailable" ? 503 : 200, { state: h.state, providers: h.providers, priceSourceConfigured: h.priceSourceConfigured, liquiditySourceConfigured: h.liquiditySourceConfigured, reasons: h.reasons });
      return;
    }
    if (req.method !== "POST" || !req.url?.startsWith("/api/swap-quote")) { send(404, { error: "not_found" }); return; }

    const callerId = (req.headers["x-forwarded-for"]?.toString().split(",")[0].trim()) || req.socket.remoteAddress || "anon";
    const decision = limiter.acquire(callerId);
    if (!decision.allowed) { send(429, { error: "rate_limited", reason: decision.reason }, { "retry-after": String(Math.ceil(decision.retryAfterMs / 1000)) }); return; }

    let raw = "";
    let aborted = false;
    req.on("data", (c) => { raw += c; if (raw.length > SWAP_RATE_LIMIT_CONFIG.maxBodyBytes) { aborted = true; req.destroy(); } });
    req.on("end", async () => {
      if (aborted) { limiter.release(); return; }
      let body: unknown;
      try { body = JSON.parse(raw); } catch { limiter.release(); send(400, { error: "invalid_json" }); return; }
      try {
        const result = await handler({ ...(body as object), method: "POST" } as never);
        send(result.status, result.body);
      } catch {
        send(500, { error: "comparison_failed" }); // never a stack trace / raw error
      } finally {
        limiter.release();
      }
    });
    req.on("error", () => { limiter.release(); });
  };
}

/** Start the server on `port`. Fails fast on a leaked VITE_ swap secret (via createSwapQuoteRequestHandler). */
export function startSwapQuoteServer(opts: SwapServerOptions = {}): http.Server {
  const port = opts.port ?? Number(opts.env?.("PORT") ?? nodeEnvReader("PORT") ?? 8787);
  const server = http.createServer(createRequestListener(opts));
  server.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`swap-quote server (read-only, sanitized) listening on :${port} — POST /api/swap-quote, GET /health`);
  });
  return server;
}
