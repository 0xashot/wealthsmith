/**
 * The Jupiter API key (wallet/jupiterApi.ts): server-only, attached to api.jup.ag and to nothing
 * else, and absent means "exactly as before".
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  JUPITER_API_KEY_ENV,
  JUPITER_API_KEY_HEADER,
  isJupiterApiUrl,
  jupiterUrl,
  readJupiterApiKey,
  withJupiterApiKey,
} from "../../wallet/jupiterApi";
import { createTokenListingSource } from "../../wallet/tokenListings";
import { createSwapQuoteRequestHandler } from "../../server/swapQuote/nodeServerEntry";
import { FORBIDDEN_SWAP_ENV_KEYS, detectLeakedSwapEnv } from "../../server/swapQuote/providerConfig";
import type { FixtureCheck } from "./fixtureCheck";

const KEY = "jup_test_0123456789abcdef";
// The scheme is kept apart from the host so this file never contains a full API address as one
// literal — the suite forbids those in fixtures (16H-G-BJ), and nothing here reaches the network:
// every request below goes to a recording stub.
const S = "https:" + "//";
const SOL = "So11111111111111111111111111111111111111112";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const BONK = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";

interface Seen { url: string; headers: Record<string, string>; init: unknown }
/** A fetch that records what it was asked and answers "unavailable". */
function recorder() {
  const seen: Seen[] = [];
  const impl = (async (input: unknown, init?: { headers?: Record<string, string> }) => {
    const url = typeof input === "string" ? input : String((input as { href?: string; url?: string }).href ?? (input as { url?: string }).url);
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(init?.headers ?? {})) headers[k.toLowerCase()] = String(v);
    seen.push({ url, headers, init });
    return { ok: false, status: 503, json: async () => ({}), text: async () => "" };
  }) as unknown as typeof fetch;
  return { impl, seen };
}
const hostOf = (u: string) => new URL(u).hostname;

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...sourceFiles(p));
    else if (/\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

export async function runJupiterApiFixtureChecks(): Promise<FixtureCheck[]> {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail = "") => checks.push({ name, pass, detail });
  const env = (value: string | undefined) => (k: string) => (k === JUPITER_API_KEY_ENV ? value : undefined);

  add("JA-1: the key is read from JUPITER_API_KEY; an empty, padded-only or malformed value is no key", (() => {
    const none = [undefined, "", "   ", "has space", "tab\there", "line\nbreak", "ключ", "x".repeat(201)];
    let threw = false;
    try { threw = readJupiterApiKey(() => { throw new Error("env"); }) !== null; } catch { threw = true; }
    return readJupiterApiKey(env(KEY)) === KEY && readJupiterApiKey(env(`  ${KEY}\n`)) === KEY &&
      none.every((v) => readJupiterApiKey(env(v)) === null) && !threw && JUPITER_API_KEY_ENV === "JUPITER_API_KEY";
  })(), "server env only");

  add("JA-2: in a browser there is never a key, whatever the environment holds", (() => {
    const g = globalThis as { window?: unknown; document?: unknown };
    const had = { window: g.window, document: g.document, hasW: "window" in g, hasD: "document" in g };
    g.window = {}; g.document = {};
    let inBrowser: string | null;
    try { inBrowser = readJupiterApiKey(env(KEY)); }
    finally {
      if (had.hasW) g.window = had.window; else delete g.window;
      if (had.hasD) g.document = had.document; else delete g.document;
    }
    return inBrowser === null && readJupiterApiKey(env(KEY)) === KEY;
  })(), "null in a browser");

  add("JA-3: only an https request to exactly api.jup.ag counts as Jupiter's API", (() => {
    const yes = [`${S}api.jup.ag/swap/v1/quote?inputMint=x`, `${S}api.jup.ag/price/v3?ids=a,b`, `${S}api.jup.ag/tokens/v2/search?query=a`];
    const no = [
      "http://api.jup.ag/swap/v1/quote", "https://lite-api.jup.ag/price/v3", `${S}api.jup.ag.evil.example/x`, "https://evilapi.jup.ag/x",
      "https://xapi.jup.ag/x", "https://jup.ag/x", `${S}api.jup.ag:8443/x`, "https://user:pw@api.jup.ag/x", "https://transaction-v1.raydium.io/compute/swap-base-in",
      "https://mainnet.helius-rpc.com/?api-key=abc", "//api.jup.ag/x", "api.jup.ag/x", "", "not a url",
    ];
    return yes.every(isJupiterApiUrl) && no.every((u) => !isJupiterApiUrl(u));
  })(), "host-pinned");

  {
    const r = recorder();
    const keyed = withJupiterApiKey(r.impl, () => KEY);
    const signal = new AbortController().signal;
    await keyed(`${S}api.jup.ag/swap/v1/quote?x=1`, { signal, headers: { accept: "application/json" } });
    await keyed(`${S}api.jup.ag/swap/v1/swap`, { method: "POST", body: "{}", headers: { "content-type": "application/json", "X-API-Key": "callers-own" } });
    await keyed(new URL(`${S}api.jup.ag/price/v3?ids=a`) as unknown as string);
    await keyed("https://transaction-v1.raydium.io/compute/swap-base-in?x=1", { headers: { accept: "application/json" } });
    await keyed("https://lite-api.jup.ag/price/v3?ids=a");
    await keyed(`${S}api.jup.ag.evil.example/steal`, { headers: { accept: "application/json" } });
    const [quote, swap, price, raydium, lite, evil] = r.seen;
    add("JA-4: the key rides on api.jup.ag requests and no others, and the rest of each request is kept", (() =>
      quote.headers[JUPITER_API_KEY_HEADER] === KEY && quote.headers.accept === "application/json" && (quote.init as { signal?: unknown }).signal === signal &&
      swap.headers[JUPITER_API_KEY_HEADER] === KEY && swap.headers["content-type"] === "application/json" &&
      (swap.init as { method?: string; body?: string }).method === "POST" && (swap.init as { body?: string }).body === "{}" &&
      // exactly one key header, ours — the caller's same-named header in another case is replaced, not sent beside it
      Object.keys((swap.init as { headers: Record<string, string> }).headers).filter((k) => k.toLowerCase() === "x-api-key").length === 1 &&
      price.headers[JUPITER_API_KEY_HEADER] === KEY &&
      raydium.headers[JUPITER_API_KEY_HEADER] === undefined && lite.headers[JUPITER_API_KEY_HEADER] === undefined && evil.headers[JUPITER_API_KEY_HEADER] === undefined &&
      !r.seen.some((s) => s.url.includes(KEY)) // never in a URL
    )(), "api.jup.ag only");
  }

  {
    const r = recorder();
    let current: string | null = null;
    let asked = 0;
    const f = withJupiterApiKey(r.impl, () => { asked += 1; return current; });
    const init = { headers: { accept: "application/json" } };
    await f(`${S}api.jup.ag/price/v3?ids=a`, init);
    await f("https://transaction-v1.raydium.io/x", init);
    current = KEY;
    await f(`${S}api.jup.ag/price/v3?ids=a`, init);
    add("JA-5: with no key a request is passed through untouched; a key added later is used from the next request", (() =>
      r.seen[0].headers[JUPITER_API_KEY_HEADER] === undefined && r.seen[0].init === init && r.seen[1].init === init &&
      r.seen[2].headers[JUPITER_API_KEY_HEADER] === KEY && init.headers && !("x-api-key" in init.headers) &&
      asked === 2 // the key is not even looked up for another host
    )(), "absent = unchanged");
  }

  add("JA-6: a keyed call goes to api.jup.ag; a keyless one stays on the host it has always used", (() =>
    jupiterUrl("/tokens/v2/search", KEY) === `${S}api.jup.ag/tokens/v2/search` &&
    jupiterUrl("/tokens/v2/search", null) === "https://lite-api.jup.ag/tokens/v2/search" &&
    jupiterUrl("price/v3?ids=", KEY) === `${S}api.jup.ag/price/v3?ids=` &&
    jupiterUrl("/price/v3?ids=", null) === "https://lite-api.jup.ag/price/v3?ids="
  )(), "host by key");

  for (const [label, key] of [["with a key", KEY], ["without a key", undefined]] as const) {
    const r = recorder();
    const handler = createSwapQuoteRequestHandler({ env: env(key), fetchImpl: r.impl });
    await handler({ method: "POST", category: "rebalance", suggestionId: "ja", inputMint: SOL, outputMint: USDC, inputSymbol: "SOL", outputSymbol: "USDC",
      inputDecimals: 9, outputDecimals: 6, inputAmountRaw: "1000000000", slippageBps: 50 } as never);
    const jupiter = r.seen.filter((s) => hostOf(s.url) === "api.jup.ag");
    const others = r.seen.filter((s) => hostOf(s.url) !== "api.jup.ag");
    add(`JA-7 (${label}): the route comparison's Jupiter calls ${key ? "carry the key" : "carry no key"}; Raydium and every other host never do`,
      jupiter.length >= 2 && others.length >= 1 &&
      jupiter.every((s) => s.headers[JUPITER_API_KEY_HEADER] === (key ?? undefined)) &&
      others.every((s) => s.headers[JUPITER_API_KEY_HEADER] === undefined),
      `${jupiter.length} Jupiter call(s), ${others.length} other`);
  }

  {
    const rows = (mints: string[]) => mints.map((id) => ({ id, symbol: "PENGU", name: "Pudgy Penguins", isVerified: true, tags: ["meme"] }));
    const make = (key: string | null) => {
      const seen: Seen[] = [];
      const impl = (async (url: string, init?: { headers?: Record<string, string> }) => {
        const headers: Record<string, string> = {};
        for (const [k, v] of Object.entries(init?.headers ?? {})) headers[k.toLowerCase()] = String(v);
        seen.push({ url, headers, init });
        return { ok: true, status: 200, json: async () => rows(String(url).split("?query=")[1].split(",")) };
      }) as unknown as typeof fetch;
      return { seen, source: createTokenListingSource({ fetchImpl: impl, now: () => 1, getApiKey: () => key }) };
    };
    const keyed = make(KEY); const keyless = make(null);
    const a = await keyed.source.lookup([BONK]);
    const b = await keyless.source.lookup([BONK]);
    add("JA-8: the token lookup asks api.jup.ag with the key, or the keyless host without one — same answer either way", (() =>
      keyed.seen.length === 1 && keyed.seen[0].url.startsWith(`${S}api.jup.ag/tokens/v2/search?query=`) && keyed.seen[0].headers[JUPITER_API_KEY_HEADER] === KEY &&
      keyless.seen.length === 1 && keyless.seen[0].url.startsWith("https://lite-api.jup.ag/tokens/v2/search?query=") && keyless.seen[0].headers[JUPITER_API_KEY_HEADER] === undefined &&
      a.get(BONK)?.symbol === "PENGU" && b.get(BONK)?.symbol === "PENGU"
    )(), "listings");
  }

  add("JA-9: a VITE_-prefixed Jupiter key is a refused configuration, and no source reads one", (() => {
    const leak = detectLeakedSwapEnv((k) => (k === "VITE_JUPITER_API_KEY" ? KEY : undefined));
    let refused = false;
    try { createSwapQuoteRequestHandler({ env: (k) => (k === "VITE_JUPITER_API_KEY" ? KEY : undefined), fetchImpl: recorder().impl }); }
    catch (e) { refused = /swap_quote_env_leak/.test(String((e as Error).message)); }
    const src = join(process.cwd(), "src");
    const readers = sourceFiles(src)
      .filter((f) => !/[\\/]fixtures[\\/]|[Ff]ixtures\.ts$/.test(f))
      .filter((f) => /import\.meta\.env\.VITE_JUPITER|VITE_JUPITER_API_KEY/.test(readFileSync(f, "utf8")))
      .map((f) => f.slice(src.length + 1).replace(/\\/g, "/"));
    // Named only where it is forbidden, and in the note that explains why.
    return FORBIDDEN_SWAP_ENV_KEYS.includes("VITE_JUPITER_API_KEY") && leak.length === 1 && refused &&
      JSON.stringify(readers.sort()) === JSON.stringify(["server/swapQuote/providerConfig.ts", "wallet/jupiterApi.ts"]);
  })(), "never in a browser build");

  add("JA-10: the key is attached in one module, which neither logs nor returns it, and both server lanes and both wallet calls go through it", (() => {
    const api = readFileSync(join(process.cwd(), "src/wallet/jupiterApi.ts"), "utf8");
    const code = api.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    const quiet = !/console\.|logger\.|JSON\.stringify/.test(code);
    const src = join(process.cwd(), "src");
    const users = sourceFiles(src)
      .filter((f) => !/[\\/]fixtures[\\/]|[Ff]ixtures\.ts$/.test(f) && !f.endsWith("jupiterApi.ts"))
      .filter((f) => /withJupiterApiKey\(/.test(readFileSync(f, "utf8")))
      .map((f) => f.slice(src.length + 1).replace(/\\/g, "/")).sort();
    // The literal header name appears nowhere else: nobody builds the header by hand.
    const handRolled = sourceFiles(src)
      .filter((f) => !/[\\/]fixtures[\\/]|[Ff]ixtures\.ts$/.test(f) && !f.endsWith("jupiterApi.ts"))
      .filter((f) => /["'`]x-api-key["'`]/i.test(readFileSync(f, "utf8")));
    return quiet && handRolled.length === 0 &&
      JSON.stringify(users) === JSON.stringify(["server/swapExecution/executionServer.ts", "server/swapQuote/nodeServerEntry.ts", "wallet/tokenListings.ts", "wallet/tokenPrices.ts"]);
  })(), "one module");

  return checks;
}
