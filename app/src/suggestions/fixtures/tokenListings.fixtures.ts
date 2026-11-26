/**
 * Verified token listings — a DISPLAY identity for tokens outside the approved registry
 * (wallet/tokenListings.ts). Three things are held here:
 *
 *   1. what may become a listing (verified, plain text, not a ticker the app already uses, icon
 *      only from an allow-listed https host);
 *   2. how the lookup behaves under failure and repetition (one request, cached, never throws);
 *   3. that a listing changes what a row is CALLED and nothing the engine reads.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  TOKEN_LISTING_ICON_HOSTS,
  TOKEN_LISTING_MAX_MINTS_PER_REQUEST,
  TOKEN_LISTING_UNLISTED_TTL_MS,
  TOKEN_LISTING_VERIFIED_TTL_MS,
  attachTokenListings,
  createTokenListingSource,
  listingCandidates,
  sanitizeTokenListing,
  withTokenListings,
  type TokenListing,
} from "../../wallet/tokenListings";
import { TOKEN_REGISTRY, positionDisplayName, positionDisplaySymbol, shortMint, type WalletPosition } from "../../wallet/walletPosition";
import { classifyPositionClass } from "../../wallet/portfolioCompleteness";
import { sortPositions } from "../../wallet/portfolioPositionDerivation";
import { deriveAssetAllocation } from "../../wallet/assetAllocation";
import { groupPositionsByCategory, isStablecoin } from "../../wallet/walletSummary";
import { formatAmount } from "../../components/deployTable";
import type { FixtureCheck } from "./fixtureCheck";

const PYUSD = "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo";
const PUMP = "pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn";
const JTO = "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const JUP_ICON = "https://static.datapi.jup.ag/token-icons/0817b3345e648b1663385bac48eb086877635ee27639c3d5da2a4d9dfd8603b1.webp";

/** A lookup row as Jupiter returns it (the fields we read; the real row has many more). */
const row = (o: Record<string, unknown> = {}) => ({ id: PYUSD, symbol: "PYUSD", name: "PayPal USD", icon: JUP_ICON, isVerified: true, decimals: 6, ...o });

const unnamed = (mint: string, valueUsd: number | null = null, o: Partial<WalletPosition> = {}): WalletPosition => ({
  id: `mint-${mint}`, source: "wallet", type: "token", symbol: shortMint(mint), name: "Unknown token", mint,
  amount: "4015101", uiAmount: 4.015101, decimals: 6, detection: "direct_wallet_balance", valueUsd, apy: null, ...o,
});
const usdcPos: WalletPosition = {
  id: `mint-${USDC}`, source: "wallet", type: "token", symbol: "USDC", name: "USD Coin", mint: USDC, icon: "assets/icons/token/usdc.svg",
  amount: "2491201", uiAmount: 2.491201, decimals: 6, detection: "direct_wallet_balance", valueUsd: 2.49, apy: null,
};
const PYUSD_LISTING: TokenListing = { symbol: "PYUSD", name: "PayPal USD", iconUrl: JUP_ICON, source: "jupiter_verified" };

/** A stubbed lookup endpoint that records what it was asked. */
function endpoint(answer: (mints: string[]) => unknown, o: { ok?: boolean; throws?: boolean } = {}) {
  const asked: string[][] = [];
  const fetchImpl = (async (url: string) => {
    const mints = String(url).split("?query=")[1].split(",");
    asked.push(mints);
    if (o.throws) throw new Error("network");
    return { ok: o.ok ?? true, status: o.ok === false ? 429 : 200, json: async () => answer(mints) };
  }) as unknown as typeof fetch;
  return { fetchImpl, asked };
}

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...sourceFiles(p));
    else if (/\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

export async function runTokenListingsFixtureChecks(): Promise<FixtureCheck[]> {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail = "") => checks.push({ name, pass, detail });

  // ---- 1. what may become a listing ------------------------------------------------------
  add("TL-1: a mint Jupiter has verified becomes a listing — its ticker, name and icon", (() => {
    const l = sanitizeTokenListing(row(), PYUSD);
    return l != null && l.symbol === "PYUSD" && l.name === "PayPal USD" && l.iconUrl === JUP_ICON && l.source === "jupiter_verified";
  })(), "verified → listing");

  add("TL-2: not verified, verified-looking, or a row for another mint → no listing", (() => {
    const refused = [
      sanitizeTokenListing(row({ isVerified: false }), PYUSD),
      sanitizeTokenListing(row({ isVerified: "true" }), PYUSD),
      sanitizeTokenListing(row({ isVerified: undefined, tags: ["verified"] }), PYUSD),
      sanitizeTokenListing(row({ id: PUMP }), PYUSD),
      sanitizeTokenListing(undefined, PYUSD),
      sanitizeTokenListing("PYUSD", PYUSD),
      sanitizeTokenListing(null, PYUSD),
    ];
    return refused.every((l) => l === null);
  })(), "only isVerified === true, for this exact mint");

  add("TL-3: a listing may never carry a ticker the app already uses for an approved asset", (() => {
    const registryTickers = Object.values(TOKEN_REGISTRY).map((t) => t.symbol);
    const reserved = [...registryTickers, "SOL", "USDC", "usdc", "Usdt", "DAI", "USDH", "WSOL", "Bonk", "BTC", "ETH"];
    return registryTickers.length > 5 && reserved.every((symbol) => sanitizeTokenListing(row({ symbol }), PYUSD) === null);
  })(), "a second 'USDC' keeps its address");

  add("TL-4: tickers and names are plain text — no emoji, look-alike letters, spaces or control characters", (() => {
    const badSymbols = ["🟥🟩", "我的刀盾", "GTA 6 Coin", "USD*", "LMAO!", "", "   ", "ABCDEFGHIJKLM", "USDС", "PY\nUSD", 42, null];
    const badNames = ["EURØP", "索拉拉", "", "Pay\u0000Pal", null, 7];
    const symbolsRefused = badSymbols.every((symbol) => sanitizeTokenListing(row({ symbol }), PYUSD) === null);
    const namesRefused = badNames.every((name) => sanitizeTokenListing(row({ name }), PYUSD) === null);
    const allowed = ["JLP", "$WIF", "PUMP", "stSOL2", "A-B", "X.Y", "w+1"].every((symbol) => sanitizeTokenListing(row({ symbol }), PYUSD)?.symbol === symbol);
    const long = sanitizeTokenListing(row({ name: "Take-Two Interactive Software - Backpack Securities" }), PYUSD);
    const trimmed = sanitizeTokenListing(row({ symbol: "  PYUSD ", name: "  PayPal   USD " }), PYUSD);
    return symbolsRefused && namesRefused && allowed &&
      long != null && long.name.length <= 40 && long.name.endsWith("…") && long.name.startsWith("Take-Two Interactive") &&
      trimmed?.symbol === "PYUSD" && trimmed.name === "PayPal USD";
  })(), "plain ASCII, bounded length");

  add("TL-5: an icon is kept only from an allow-listed host over https; anything else is no icon, not no listing", (() => {
    const icon = (v: unknown) => sanitizeTokenListing(row({ icon: v }), PYUSD);
    const kept = TOKEN_LISTING_ICON_HOSTS.every((h) => icon(`https://${h}/a/b.png`)?.iconUrl === `https://${h}/a/b.png`);
    const dropped = [
      "http://static.datapi.jup.ag/x.webp", "https://evil.example/x.png", "https://static.datapi.jup.ag.evil.example/x.png",
      "https://user:pw@static.datapi.jup.ag/x.png", "https://static.datapi.jup.ag:8443/x.png", "javascript:alert(1)",
      "data:image/svg+xml;base64,AAAA", "//static.datapi.jup.ag/x.png", "not a url", "", null, 12, `https://ipfs.io/${"a".repeat(400)}`,
    ].every((v) => { const l = icon(v); return l != null && l.iconUrl === null && l.symbol === "PYUSD"; });
    return kept && dropped && TOKEN_LISTING_ICON_HOSTS.length === 6;
  })(), "https + allow-list");

  // ---- 2. the lookup ---------------------------------------------------------------------
  {
    let clock = 1_000_000;
    const e = endpoint((mints) => mints.filter((m) => m !== PUMP).map((id) => row({ id, symbol: id === PYUSD ? "PYUSD" : "JTOX" })));
    const src = createTokenListingSource({ fetchImpl: e.fetchImpl, now: () => clock });
    const first = await src.lookup([PYUSD, PUMP, PYUSD, "not-a-mint", JTO]);
    const second = await src.lookup([PYUSD, PUMP, JTO]);
    add("TL-6: several mints are one request; verified and 'not listed' are both remembered", (() =>
      e.asked.length === 1 && e.asked[0].length === 3 && new Set(e.asked[0]).size === 3 && !e.asked[0].includes("not-a-mint") &&
      first.size === 2 && first.get(PYUSD)?.symbol === "PYUSD" && !first.has(PUMP) && second.size === 2
    )(), `${e.asked.length} request(s)`);

    clock += TOKEN_LISTING_UNLISTED_TTL_MS + 1;
    await src.lookup([PYUSD, PUMP, JTO]);
    const afterUnlisted = e.asked.length === 2 && e.asked[1].length === 1 && e.asked[1][0] === PUMP;
    clock += TOKEN_LISTING_VERIFIED_TTL_MS;
    await src.lookup([PYUSD]);
    add("TL-7: a mint that was not listed is asked about again after an hour; a verified one after a day", afterUnlisted && e.asked.length === 3 && e.asked[2][0] === PYUSD &&
      TOKEN_LISTING_UNLISTED_TTL_MS < TOKEN_LISTING_VERIFIED_TTL_MS, `${e.asked.length} requests`);
  }

  {
    const failures = [
      endpoint(() => [row()], { ok: false }),
      endpoint(() => [row()], { throws: true }),
      endpoint(() => ({ error: "rate limited" })),
      endpoint(() => "<html>"),
    ];
    let allEmpty = true; let neverCached = true;
    for (const f of failures) {
      const src = createTokenListingSource({ fetchImpl: f.fetchImpl, now: () => 1 });
      const a = await src.lookup([PYUSD]);
      const b = await src.lookup([PYUSD]);
      allEmpty = allEmpty && a.size === 0 && b.size === 0;
      neverCached = neverCached && f.asked.length === 2;
    }
    const noFetch = await createTokenListingSource({ fetchImpl: undefined, now: () => 1 }).lookup([]);
    add("TL-8: a failed lookup yields nothing, throws nothing, and is never remembered", allEmpty && neverCached && noFetch.size === 0, "429 / network / wrong shape");
  }

  {
    const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    const many = Array.from({ length: 140 }, (_, i) => `${B58[i % 58]}${B58[(i * 7) % 58]}${"1".repeat(30)}${B58[(i * 13) % 58]}${B58[Math.floor(i / 58)]}`);
    const e = endpoint((mints) => mints.map((id) => row({ id, symbol: "TKN" })));
    const got = await createTokenListingSource({ fetchImpl: e.fetchImpl, now: () => 1 }).lookup(many);
    add("TL-9: one wallet read is one request of at most 100 mints, however many unnamed tokens it holds", new Set(many).size === 140 && e.asked.length === 1 &&
      e.asked[0].length === TOKEN_LISTING_MAX_MINTS_PER_REQUEST && got.size === 100, `${e.asked[0]?.length} asked of ${many.length}`);
  }

  add("TL-10: only tokens the registry could not name are asked about — valued ones first, largest first", (() => {
    const lp: WalletPosition = { ...unnamed(PUMP, 500), type: "protocol", name: "Raydium LP" };
    const positions = [unnamed(JTO, 3), usdcPos, unnamed(PYUSD, 4.01), unnamed(PUMP, null), lp, { ...unnamed(JTO, 3), id: "second-account" }];
    const c = listingCandidates(positions);
    return c.length === 3 && c[0] === PYUSD && c[1] === JTO && c[2] === PUMP && !c.includes(USDC);
  })(), "unnamed only, by value");

  // ---- 3. display only -------------------------------------------------------------------
  const before = [usdcPos, unnamed(PYUSD, 4.01), unnamed(PUMP, 1)];
  const listings = new Map<string, TokenListing>([[PYUSD, PYUSD_LISTING], [USDC, { ...PYUSD_LISTING, symbol: "FAKE" }]]);
  const after = attachTokenListings(before, listings);

  add("TL-11: a listing is attached beside the position's own symbol and name, never over them", (() => {
    const p = after[1];
    const { listing, ...rest } = p;
    return listing === PYUSD_LISTING && JSON.stringify(rest) === JSON.stringify(before[1]) &&
      p.symbol === shortMint(PYUSD) && p.name === "Unknown token" &&
      after[0] === before[0] && after[0].listing === undefined && // a registry token is never relabelled
      after[2] === before[2] && before[1].listing === undefined; // and the input is not mutated
  })(), "symbol/name untouched");

  add("TL-12: what the screen calls the row is the listing's ticker and name; unlisted rows are unchanged", (() =>
    positionDisplaySymbol(after[1]) === "PYUSD" && positionDisplayName(after[1]) === "PayPal USD" && formatAmount(after[1]) === "4.02 PYUSD" &&
    positionDisplaySymbol(after[2]) === shortMint(PUMP) && positionDisplayName(after[2]) === "Unknown token" &&
    positionDisplaySymbol(after[0]) === "USDC" && positionDisplayName(after[0]) === "USD Coin" && formatAmount(after[0]) === "2.49 USDC"
  )(), "display helpers");

  add("TL-13: the engine sees the same wallet with and without listings", (() => {
    const same = <T,>(f: (ps: WalletPosition[]) => T) => JSON.stringify(f(before)) === JSON.stringify(f(after.map(({ listing: _l, ...p }) => p as WalletPosition)));
    const classes = (ps: WalletPosition[]) => ps.map(classifyPositionClass).join(",");
    const stables = (ps: WalletPosition[]) => ps.map(isStablecoin).join(",");
    const order = (ps: WalletPosition[]) => sortPositions(ps).map((p) => p.id).join(",");
    const groups = (ps: WalletPosition[]) => Object.fromEntries(Object.entries(groupPositionsByCategory(ps)).map(([k, v]) => [k, (v as WalletPosition[]).map((p) => p.id)]));
    // Identical classification of the LISTED positions themselves, not only of the stripped copy.
    return same(classes) && classes(after) === classes(before) && classes(after).split(",")[1] === "unknown_token" &&
      stables(after) === stables(before) && isStablecoin(after[1]) === false && // "PayPal USD" is not made a stablecoin by its listing
      order(after) === order(before) && JSON.stringify(groups(after)) === JSON.stringify(groups(before)) &&
      groupPositionsByCategory(after).unknown.length === 2;
  })(), "classification, stable test, ordering, grouping");

  add("TL-14: the allocation chart keeps its slices and sizes; only the label of a listed token changes", (() => {
    const a = deriveAssetAllocation(before);
    const b = deriveAssetAllocation(after);
    const shape = (x: typeof a) => x.segments.map((s) => `${s.id}:${s.valueUsd}:${s.percent}:${s.colorToken}`).join("|");
    return shape(a) === shape(b) && a.totalUsd === b.totalUsd &&
      a.segments.some((s) => s.label === shortMint(PYUSD)) && b.segments.some((s) => s.label === "PYUSD") &&
      !b.segments.some((s) => s.label === shortMint(PYUSD)) && b.segments.some((s) => s.label === shortMint(PUMP));
  })(), "same slices, new label");

  add("TL-15: nothing under suggestions/ reads a listing — the engine cannot depend on one by accident", (() => {
    const root = join(process.cwd(), "src/suggestions");
    const offenders = sourceFiles(root)
      .filter((f) => !/[\\/]fixtures[\\/]|[Ff]ixtures\.ts$|ownerTest/.test(f))
      .filter((f) => /\.listing\b|positionDisplaySymbol|positionDisplayName|tokenListings/.test(readFileSync(f, "utf8")));
    return offenders.length === 0;
  })(), "static");

  {
    let calls = 0;
    const unchangedOnThrow = await withTokenListings(before, async () => { calls += 1; throw new Error("down"); });
    const none = await withTokenListings([usdcPos], async () => { calls += 1; return new Map(); });
    const ok = await withTokenListings(before, async (mints) => { calls += 1; return new Map(mints.includes(PYUSD) ? [[PYUSD, PYUSD_LISTING]] : []); });
    add("TL-16: looking up and attaching never fails a wallet read, and a wallet with nothing unnamed asks nothing", calls === 2 &&
      JSON.stringify(unchangedOnThrow) === JSON.stringify(before) && none.length === 1 && none[0].listing === undefined &&
      ok[1].listing?.symbol === "PYUSD" && ok[2].listing === undefined, `${calls} lookups`);
  }

  add("TL-17: the browser's wallet read and its table use the listing as the last, display-only step", (() => {
    const hook = readFileSync(join(process.cwd(), "src/wallet/useWalletPortfolio.ts"), "utf8");
    const card = readFileSync(join(process.cwd(), "src/components/LiquidAssetsCard.tsx"), "utf8");
    const identity = readFileSync(join(process.cwd(), "src/components/AssetIdentity.tsx"), "utf8");
    const last = /merged = await withTokenListings\(merged\);\s*if \(cancelled \|\| myReq !== reqId\.current\) return;[\s\S]{0,260}setState\(\{ status: "ready", positions: merged, warning, pricedAsOf, loading: false \}\)/.test(hook);
    const shown = /p\.icon \? resolveTokenIcon\(p\.icon\)\.url : p\.listing\?\.iconUrl \?\? fallbackTokenUrl/.test(card) &&
      /iconFallbackUrl=\{fallbackTokenUrl\}/.test(card) && /label=\{positionDisplaySymbol\(p\)\}/.test(card);
    const safeImage = /referrerPolicy="no-referrer"/.test(identity) && /onError=\{\(\) => \{ if \(!failed && iconUrl\) setFailedUrl\(iconUrl\); \}\}/.test(identity);
    return last && shown && safeImage;
  })(), "wiring");

  return checks;
}
