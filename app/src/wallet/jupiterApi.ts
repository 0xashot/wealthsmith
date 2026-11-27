/**
 * jupiterApi — one place that decides WHERE a Jupiter request goes and WHETHER it carries our
 * API key.
 *
 * WHY. Without a key every user of the product shares one anonymous allowance from Jupiter:
 * 0.5 requests a second (measured 2026-11-26 as about five calls in ten seconds, then HTTP
 * 429). A three-token Trim needs seven calls just to open. One key lifts the limit for every
 * Jupiter API we use — quotes, swap building, prices, token listings — because Jupiter counts
 * them in a single bucket per organisation (docs read 2026-11-27: Free 1/s, Developer 10/s).
 *
 * THE KEY IS SERVER-ONLY.
 *   - It is read from `JUPITER_API_KEY` — never a `VITE_`-prefixed name, which a build would
 *     ship to the browser (`VITE_JUPITER_API_KEY` is a refused configuration, see
 *     providerConfig's forbidden list).
 *   - `readJupiterApiKey` returns null in a browser whatever the environment looks like.
 *   - It is attached ONLY to `https://api.jup.ag`. A request to any other host — Raydium, an
 *     RPC, a mirror set by a URL override, a look-alike domain — never carries it, because the
 *     host is checked on the request itself, not assumed from who is calling.
 *   - It is never logged, never returned, never put in a URL.
 *
 * WITHOUT A KEY nothing changes: the same requests go to the same hosts as before. That
 * includes the two calls still on `lite-api.jup.ag`, which Jupiter is retiring in favour of
 * `api.jup.ag`; moving them there keyless would pile them onto the 0.5/s bucket the quotes
 * already use, so they move only once a key is configured.
 */

export const JUPITER_API_HOST = "api.jup.ag" as const;
export const JUPITER_KEYLESS_HOST = "lite-api.jup.ag" as const;
export const JUPITER_API_KEY_ENV = "JUPITER_API_KEY" as const;
export const JUPITER_API_KEY_HEADER = "x-api-key" as const;

export type JupiterEnvReader = (key: string) => string | undefined;

const isBrowser = (): boolean => typeof (globalThis as { window?: unknown }).window !== "undefined" && typeof (globalThis as { document?: unknown }).document !== "undefined";

/**
 * The configured key, or null. Null in a browser, always. Reads the process environment through
 * `globalThis` so a bundler has no `process.env.X` expression to inline.
 */
export function readJupiterApiKey(env?: JupiterEnvReader): string | null {
  if (isBrowser()) return null;
  const read: JupiterEnvReader = env ?? ((k) => (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[k]);
  let value: string | undefined;
  try { value = read(JUPITER_API_KEY_ENV); } catch { return null; }
  if (typeof value !== "string") return null;
  const key = value.trim();
  // A header value: printable, no spaces or control characters. Anything else is a misconfiguration,
  // and a malformed key is treated as no key rather than sent.
  return key.length > 0 && key.length <= 200 && /^[\x21-\x7E]+$/.test(key) ? key : null;
}

/** True only for an https request to exactly `api.jup.ag`. */
export function isJupiterApiUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname === JUPITER_API_HOST && u.username === "" && u.password === "" && u.port === "";
  } catch {
    return false;
  }
}

/**
 * Which host a Jupiter path is asked of: `api.jup.ag` when a key is configured, otherwise the
 * host that call has always used.
 */
export function jupiterUrl(path: string, key: string | null, keylessHost: string = JUPITER_KEYLESS_HOST): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `https://${key != null ? JUPITER_API_HOST : keylessHost}${p}`;
}

const urlOf = (input: unknown): string | null => {
  if (typeof input === "string") return input;
  if (input != null && typeof input === "object") {
    const o = input as { href?: unknown; url?: unknown };
    if (typeof o.href === "string") return o.href; // URL
    if (typeof o.url === "string") return o.url;   // Request
  }
  return null;
};

/**
 * Wrap a fetch so that requests to `https://api.jup.ag` — and only those — carry the key.
 * `getKey` is asked on every request, so a key added to the environment takes effect without
 * a code change. With no key the request is passed through untouched.
 */
export function withJupiterApiKey(fetchImpl: typeof fetch, getKey: () => string | null = () => readJupiterApiKey()): typeof fetch {
  return ((input: unknown, init?: { headers?: unknown } & Record<string, unknown>) => {
    const url = urlOf(input);
    const key = url != null && isJupiterApiUrl(url) ? getKey() : null;
    if (key == null) return (fetchImpl as (i: unknown, n?: unknown) => Promise<Response>)(input, init);
    const headers: Record<string, string> = {};
    const given = init?.headers;
    if (given != null && typeof given === "object") {
      const h = given as { forEach?: (cb: (v: string, k: string) => void) => void };
      if (typeof h.forEach === "function" && !Array.isArray(given)) h.forEach((v, k) => { headers[k] = v; });
      else if (Array.isArray(given)) for (const pair of given as [string, string][]) headers[pair[0]] = pair[1];
      else Object.assign(headers, given as Record<string, string>);
    }
    // Ours wins over anything a caller put under the same name, in any letter case.
    for (const k of Object.keys(headers)) if (k.toLowerCase() === JUPITER_API_KEY_HEADER) delete headers[k];
    headers[JUPITER_API_KEY_HEADER] = key;
    return (fetchImpl as (i: unknown, n?: unknown) => Promise<Response>)(input, { ...(init ?? {}), headers });
  }) as unknown as typeof fetch;
}
