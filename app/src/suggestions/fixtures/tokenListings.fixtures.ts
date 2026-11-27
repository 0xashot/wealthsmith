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
  TOKEN_LISTING_ICON_HOST_SUFFIXES,
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
import { VERIFIED_IDENTITY_EXTRA_MINTS, VERIFIED_LISTING_IS_IDENTITY, isCountedVerifiedToken, isLeftOutToken, isVerifiedStableToken, splitCountedPositions, verifiedMemeIdentity } from "../../wallet/verifiedTokenIdentity";
import { computeSafetyBufferCoverage } from "../../wallet/safetyBufferCoverage";
import { deriveStableValue } from "../../wallet/walletSummary";
import { computePortfolioCompleteness } from "../../wallet/portfolioCompleteness";
import { deriveTrimAssessment } from "../trimAssessment";
import { buildTrimCardFromAssessment } from "../trimSuggestion";
import { deriveTrimRows } from "../swapExecution/trimFlow";
import { getTrimTestingFixtures } from "../../pages/trimTestingFixtures";
import { LEFT_OUT_TOKEN_ROW_NOTE, leftOutTokensNote } from "../../state/approvedCopy";
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
const PYUSD_LISTING: TokenListing = { symbol: "PYUSD", name: "PayPal USD", iconUrl: JUP_ICON, meme: false, stable: true, source: "jupiter_verified" };
const PENGU = "2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv";
const PENGU_LISTING: TokenListing = { symbol: "PENGU", name: "Pudgy Penguins", iconUrl: JUP_ICON, meme: true, stable: false, source: "jupiter_verified" };

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
    return l != null && l.symbol === "PYUSD" && l.name === "PayPal USD" && l.iconUrl === JUP_ICON && l.source === "jupiter_verified" && l.meme === false && l.stable === false;
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
      // A per-project subdomain is matched as a dot-prefixed suffix — not as a substring, and not bare.
      "https://evilmypinata.cloud/x.png", "https://mypinata.cloud/x.png", "https://x.mypinata.cloud.evil.example/x.png",
      "https://myfilebase.com.evil.example/x.png", "https://ipfs.nftstorage.link/x.png",
    ].every((v) => { const l = icon(v); return l != null && l.iconUrl === null && l.symbol === "PYUSD"; });
    const subdomains = ["https://aqua-junior-shark-690.mypinata.cloud/ipfs/x", "https://bafkreigmu65.ipfs.nftstorage.link/", "https://desperate-moccasin-minnow.myfilebase.com/ipfs/x"]
      .every((u) => icon(u)?.iconUrl === u);
    return kept && dropped && subdomains && TOKEN_LISTING_ICON_HOSTS.length === 11 && TOKEN_LISTING_ICON_HOST_SUFFIXES.every((x) => x.startsWith("."));
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

  add("TL-13: a listing changes ONE thing for the engine — a verified token with a price is an ordinary token; nothing else moves", (() => {
    const classes = (ps: WalletPosition[]) => ps.map(classifyPositionClass).join(",");
    const stables = (ps: WalletPosition[]) => ps.map(isStablecoin).join(",");
    const order = (ps: WalletPosition[]) => sortPositions(ps).map((p) => p.id).join(",");
    const groups = (ps: WalletPosition[]) => Object.fromEntries(Object.entries(groupPositionsByCategory(ps)).map(([k, v]) => [k, (v as WalletPosition[]).map((p) => p.id)]));
    // before: USDC, PYUSD (unnamed), PUMP (unnamed).  after: the same, PYUSD now carrying a verified listing.
    const [, pyusdBefore, pumpBefore] = classes(before).split(",");
    const [usdcAfter, pyusdAfter, pumpAfter] = classes(after).split(",");
    return pyusdBefore === "unknown_token" && pumpBefore === "unknown_token" &&
      usdcAfter === "stablecoin" && pyusdAfter !== "unknown_token" && pumpAfter === "unknown_token" && // only the listed, priced one
      // The registry stablecoin test — what the Safety Buffer asks — is unmoved: "PayPal USD" is not one of ours.
      stables(after) === stables(before) && isStablecoin(after[1]) === false &&
      // Display ordering and the by-name grouping still read the position's own name.
      order(after) === order(before) && JSON.stringify(groups(after)) === JSON.stringify(groups(before)) &&
      groupPositionsByCategory(after).unknown.length === 2;
  })(), "classification by the counted rule only");

  add("TL-14: the allocation chart keeps its slices and sizes; a listed token gets its ticker, and a listed STABLECOIN the stables colour", (() => {
    const a = deriveAssetAllocation(before);
    const b = deriveAssetAllocation(after);
    const sizes = (x: typeof a) => x.segments.map((s) => `${s.id}:${s.valueUsd}:${s.percent}`).join("|");
    const colour = (x: typeof a, label: string) => x.segments.find((s) => s.label === label)?.colorToken;
    return sizes(a) === sizes(b) && a.totalUsd === b.totalUsd &&
      a.segments.some((s) => s.label === shortMint(PYUSD)) && b.segments.some((s) => s.label === "PYUSD") &&
      !b.segments.some((s) => s.label === shortMint(PYUSD)) && b.segments.some((s) => s.label === shortMint(PUMP)) &&
      colour(b, "PYUSD") === colour(b, "USDC") && colour(a, shortMint(PYUSD)) !== colour(a, "USDC") &&
      colour(b, shortMint(PUMP)) !== colour(b, "USDC");
  })(), "same slices, new label, stables colour");

  add("TL-15: only one module looks inside a listing, and every engine file that asks it a question is named here", (() => {
    const src = join(process.cwd(), "src");
    const engine = [...sourceFiles(join(src, "suggestions")), ...sourceFiles(join(src, "wallet"))]
      .filter((f) => !/[\\/]fixtures[\\/]|[Ff]ixtures\.ts$|ownerTest/.test(f));
    const rel = (f: string) => f.slice(src.length + 1).replace(/\\/g, "/");
    const matching = (re: RegExp) => engine.filter((f) => re.test(readFileSync(f, "utf8"))).map(rel).sort();
    const asks = (fn: string) => matching(new RegExp(`\\b${fn}\\(`)).filter((f) => f !== "wallet/verifiedTokenIdentity.ts");
    // `.listing` appears in: the module that attaches it, the display helpers' home, the chart label, and
    // the identity module. Nowhere under suggestions/.
    const readers = matching(/\.listing\b/);
    const display = matching(/positionDisplaySymbol|positionDisplayName/).filter((f) => f.startsWith("suggestions/"));
    return JSON.stringify(readers) === JSON.stringify(["wallet/assetAllocation.ts", "wallet/tokenListings.ts", "wallet/verifiedTokenIdentity.ts", "wallet/walletPosition.ts"]) &&
      // counted → completeness (its value counts) and Trim (known, but out of scope unless a meme coin);  Trim identity → Trim;  stables side → the three places that draw the crypto/stables line;
      // left out → the wallet hook.  A new reader has to be added here on purpose.
      JSON.stringify(asks("isCountedVerifiedToken")) === JSON.stringify(["suggestions/trimAssessment.ts", "wallet/portfolioCompleteness.ts"]) &&
      JSON.stringify(asks("verifiedMemeIdentity")) === JSON.stringify(["suggestions/trimAssessment.ts"]) &&
      JSON.stringify(asks("isVerifiedStableToken")) === JSON.stringify(["suggestions/rebalanceAssessment.ts", "wallet/assetAllocation.ts", "wallet/walletSummary.ts"]) &&
      JSON.stringify(asks("splitCountedPositions")) === JSON.stringify(["wallet/useWalletPortfolio.ts"]) &&
      display.length === 0;
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

  // ---- 4. the one exception: a verified MEME coin has an identity --------------------------
  add("TL-18: 'meme' is Jupiter's own tag, read exactly — anything else is not a meme", (() => {
    const meme = (tags: unknown) => sanitizeTokenListing(row({ tags }), PYUSD)?.meme;
    return meme(["verified", "community", "meme"]) === true &&
      [["verified", "defi"], [], undefined, null, "meme", ["Meme"], ["memes"], [["meme"]], { meme: true }].every((t) => meme(t) === false);
  })(), "exact tag");

  const memePos = unnamed(PENGU, 300, { listing: PENGU_LISTING, priceUsd: 1, uiAmount: 300, amount: "300000000" });
  add("TL-19: only an unnamed direct-wallet token whose listing is verified AND tagged meme has that identity", (() => {
    const id = verifiedMemeIdentity(memePos);
    const none = [
      unnamed(PYUSD, 300, { listing: PYUSD_LISTING }),                                   // verified, not a meme
      unnamed(PENGU, 300),                                                              // no listing
      unnamed(PENGU, 300, { listing: { symbol: "PENGU", name: "Pudgy Penguins", iconUrl: null, source: "jupiter_verified" } }), // an older snapshot, no tag
      unnamed(PENGU, 300, { listing: { ...PENGU_LISTING, meme: "true" as unknown as boolean } }),
      { ...usdcPos, listing: PENGU_LISTING },                                           // a registry token is never re-identified
      { ...memePos, type: "protocol" as const },
      { ...memePos, source: "kamino" as const },
      { ...memePos, mint: undefined },
    ];
    return VERIFIED_LISTING_IS_IDENTITY === true && id != null && id.symbol === "PENGU" && id.name === "Pudgy Penguins" && id.iconUrl === JUP_ICON &&
      none.every((p) => verifiedMemeIdentity(p as WalletPosition) === null);
  })(), "verified + meme, nothing else");

  add("TL-20: a verified token WITH A PRICE counts, meme or not; one without a price, or unverified, is still unknown to the engine", (() => {
    const usdc1000: WalletPosition = { ...usdcPos, amount: "1000000000", uiAmount: 1000, priceUsd: 1, valueUsd: 1000 };
    const complete = (p: WalletPosition) => computePortfolioCompleteness([usdc1000, p], { requiredBufferUsd: 500 });
    const pyusd = unnamed(PYUSD, 300, { listing: PYUSD_LISTING });
    const unpriced = unnamed(PENGU, null, { listing: PENGU_LISTING });
    const unverified = unnamed(PUMP, 300);
    return isCountedVerifiedToken(memePos) && classifyPositionClass(memePos) === "classic_spl" && complete(memePos).netWorthState === "complete" &&
      isCountedVerifiedToken(pyusd) && classifyPositionClass(pyusd) !== "unknown_token" && complete(pyusd).netWorthState === "complete" && complete(pyusd).hasUnknownMagnitudeValue === false &&
      // The position itself is not renamed, and is not one of OUR stablecoins.
      memePos.symbol === shortMint(PENGU) && memePos.name === "Unknown token" && isStablecoin(pyusd) === false &&
      // Fail-closed inside the engine: if one of these ever reaches it, it blocks exactly as before.
      !isCountedVerifiedToken(unpriced) && classifyPositionClass(unpriced) === "unknown_token" && complete(unpriced).netWorthState === "unresolved" &&
      !isCountedVerifiedToken(unverified) && classifyPositionClass(unverified) === "unknown_token" && complete(unverified).netWorthState === "unresolved";
  })(), "verified + priced counts");

  const trimOf = (positions: WalletPosition[]) => {
    const assessment = deriveTrimAssessment({ positions, requiredBufferUsd: 500, generatedAt: 1_700_000_000_000 });
    return { assessment, card: buildTrimCardFromAssessment(assessment, 1_700_000_000_000) };
  };
  const usdc1000: WalletPosition = { ...usdcPos, amount: "1000000000", uiAmount: 1000, priceUsd: 1, valueUsd: 1000 };
  add("TL-21: a verified meme coin is a Trim candidate, named and pictured by its listing", (() => {
    const { assessment, card } = trimOf([usdc1000, memePos]);
    const h = assessment.candidateHoldings[0];
    const asset = card?.reviewDetails?.involvedAssets?.[0];
    return assessment.candidateHoldings.length === 1 && h.mint === PENGU && h.symbol === "PENGU" && h.name === "Pudgy Penguins" &&
      h.identitySource === "verified_meme_listing" && h.identityState === "resolved" && h.reviewEligibilityState === "eligible" &&
      card != null && card.titleOverride === "Reduce PENGU exposure" &&
      asset?.symbol === "PENGU" && asset.mint === PENGU && asset.iconUrl === JUP_ICON && asset.icon === undefined;
  })(), "candidate + card");

  add("TL-22: verified-but-not-meme, unverified and untagged tokens are not candidates — and no card is made", (() => {
    const cases = [
      unnamed(PYUSD, 300, { listing: PYUSD_LISTING }),
      unnamed(PUMP, 300),
      unnamed(PENGU, 300, { listing: { symbol: "PENGU", name: "Pudgy Penguins", iconUrl: null, source: "jupiter_verified" } }),
    ];
    return cases.every((p) => {
      const { assessment, card } = trimOf([usdc1000, p]);
      return assessment.candidateHoldings.length === 0 && card === null;
    });
  })(), "no identity → no Trim");

  add("TL-24: PUMP is trimmed with the meme coins although Jupiter tags it defi — but only while Jupiter verifies it", (() => {
    const PUMP_LISTING: TokenListing = { symbol: "PUMP", name: "Pump", iconUrl: JUP_ICON, meme: false, stable: false, source: "jupiter_verified" };
    const pump = unnamed(PUMP, 300, { listing: PUMP_LISTING, priceUsd: 1, uiAmount: 300, amount: "300000000" });
    const { assessment, card } = trimOf([usdc1000, pump]);
    // The list names exact mints, and is short on purpose.
    const listOk = VERIFIED_IDENTITY_EXTRA_MINTS.has(PUMP) && VERIFIED_IDENTITY_EXTRA_MINTS.size === 1;
    // Another verified non-meme token (a stablecoin) with the SAME listing shape is still not a candidate…
    const stable = trimOf([usdc1000, unnamed(PYUSD, 300, { listing: PYUSD_LISTING })]);
    // …and PUMP with no verified listing is just an unnamed token.
    const unverifiedPump = trimOf([usdc1000, unnamed(PUMP, 300)]);
    return listOk && verifiedMemeIdentity(pump)?.symbol === "PUMP" && classifyPositionClass(pump) === "classic_spl" &&
      assessment.candidateHoldings.length === 1 && assessment.candidateHoldings[0].symbol === "PUMP" && card?.titleOverride === "Reduce PUMP exposure" &&
      stable.assessment.candidateHoldings.length === 0 && stable.card === null &&
      verifiedMemeIdentity(unnamed(PUMP, 300)) === null && unverifiedPump.card === null;
  })(), "meme tag OR the named mint, always verified");

  add("TL-25: unnamed tokens that are not counted are LEFT OUT — split away once, with no value left on them", (() => {
    const scam = unnamed(PUMP, 50_000);                                             // unverified, with a quoted "value"
    const dust = unnamed("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin", null);    // unverified, unpriced
    const verifiedUnpriced = unnamed(PENGU, null, { listing: PENGU_LISTING });      // verified, no sourced price
    const pyusd = unnamed(PYUSD, 300, { listing: PYUSD_LISTING });                  // verified, priced → counted
    const lp: WalletPosition = { ...unnamed("LPmint1111111111111111111111111111111111111", 900), type: "protocol", name: "Raydium LP", source: "raydium" };
    const sol: WalletPosition = { id: "sol", source: "wallet", type: "native", symbol: "SOL", name: "Solana", amount: "1000000000", uiAmount: 1, decimals: 9, detection: "direct_wallet_balance", priceUsd: 70, valueUsd: 70, apy: null };
    const all = [sol, usdcPos, scam, pyusd, dust, verifiedUnpriced, lp, memePos];
    const { counted, leftOut } = splitCountedPositions(all);
    const ids = (ps: WalletPosition[]) => ps.map((p) => p.id).join(",");
    return ids(counted) === ids([sol, usdcPos, pyusd, lp, memePos]) && ids(leftOut) === ids([scam, dust, verifiedUnpriced]) &&
      [scam, dust, verifiedUnpriced].every(isLeftOutToken) && [sol, usdcPos, pyusd, lp, memePos].every((p) => !isLeftOutToken(p)) &&
      // No number survives on a left-out row — not the quoted value, not the price — and the input is untouched.
      leftOut.every((p) => p.valueUsd === null && p.priceUsd === null) && scam.valueUsd === 50_000 &&
      counted[2] === pyusd && all.length === 8;
  })(), "counted vs left out");

  add("TL-26: a verified stablecoin sits on the STABLES side of the allocation and is not part of the Safety Buffer", (() => {
    const usdc1000: WalletPosition = { ...usdcPos, amount: "1000000000", uiAmount: 1000, priceUsd: 1, valueUsd: 1000 };
    const pyusd = unnamed(PYUSD, 300, { listing: PYUSD_LISTING });
    const untagged = unnamed(PYUSD, 300, { listing: { ...PYUSD_LISTING, stable: false } });
    const unpricedStable = unnamed(PYUSD, null, { listing: PYUSD_LISTING });
    const buffer = computeSafetyBufferCoverage([usdc1000, pyusd], 2000);
    const rebalance = readFileSync(join(process.cwd(), "src/suggestions/rebalanceAssessment.ts"), "utf8");
    return isVerifiedStableToken(pyusd) && !isVerifiedStableToken(untagged) && !isVerifiedStableToken(unpricedStable) && !isVerifiedStableToken(memePos) &&
      deriveStableValue([usdc1000, pyusd]) === 1300 && deriveStableValue([usdc1000, untagged]) === 1000 && deriveStableValue([usdc1000, memePos]) === 1000 &&
      // The buffer still sees $1,000 of approved stablecoin, and is still short of a $2,000 target.
      buffer.verifiedLiquidStableValueUsd === 1000 && buffer.recognizedStableValueUsd === 1000 && buffer.fullyFunded === false &&
      // A stablecoin is never trimmed, even one that also carried the meme tag.
      verifiedMemeIdentity(pyusd) === null && verifiedMemeIdentity(unnamed(PYUSD, 300, { listing: { ...PYUSD_LISTING, meme: true } })) === null &&
      /if \(isStablecoin\(p\)\) return true;\s*\/\/[^\n]*\n\s*if \(isVerifiedStableToken\(p\)\) return true;/.test(rebalance);
  })(), "stables side, not the buffer");

  add("TL-27: a real-shaped wallet — the portfolio is whole, Trim names only the meme coin, and two tokens are left out", (() => {
    const usdc1000: WalletPosition = { ...usdcPos, amount: "1000000000", uiAmount: 1000, priceUsd: 1, valueUsd: 1000 };
    const pyusd = unnamed(PYUSD, 300, { listing: PYUSD_LISTING });
    const scam = unnamed(PUMP, 50_000);
    const dust = unnamed("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin", null);
    const wallet = [usdc1000, memePos, pyusd, scam, dust];
    // Before the rule: the engine saw everything, and one unnamed token was enough to stop it.
    const raw = trimOf(wallet);
    const { counted, leftOut } = splitCountedPositions(wallet);
    const completeness = computePortfolioCompleteness(counted, { requiredBufferUsd: 500 });
    const { assessment, card } = trimOf(counted);
    return raw.card === null &&
      leftOut.length === 2 && completeness.netWorthState === "complete" && completeness.recognizedPortfolioValueUsd === 1600 &&
      card != null && assessment.candidateHoldings.map((h) => h.symbol).join(",") === "PENGU" &&
      // The verified stablecoin is known and simply outside Trim's scope — not an unresolved identity.
      assessment.excludedHoldings.some((h) => h.mint === PYUSD && h.reviewEligibilityState === "excluded_scope") &&
      assessment.unresolvedHoldings.length === 0 && assessment.overallReadiness.status === "allowed" &&
      deriveStableValue(counted) === 1300;
  })(), "end to end");

  add("TL-28: the wallet hook is where tokens are left out, and the list says how many — with no value on their rows", (() => {
    const hook = readFileSync(join(process.cwd(), "src/wallet/useWalletPortfolio.ts"), "utf8");
    const card = readFileSync(join(process.cwd(), "src/components/LiquidAssetsCard.tsx"), "utf8");
    const page = readFileSync(join(process.cwd(), "src/components/RealWalletPortfolio.tsx"), "utf8");
    const split = /const split = useMemo\(\(\) => splitCountedPositions\(state\.positions\), \[state\.positions\]\);\s*return \{ \.\.\.state, positions: split\.counted, leftOutTokens: split\.leftOut, refresh \};/.test(hook);
    // The total is the COUNTED rows' sum; left-out rows are appended after it is taken.
    const total = /const priced = counted\.filter\(\(p\) => typeof p\.valueUsd === "number"\);/.test(card) && /const rows = \[\.\.\.counted, \.\.\.leftOut\];/.test(card) &&
      /leftOut\.length > 0 \? ` \$\{leftOutTokensNote\(leftOut\.length\)\}` : ""/.test(card) && /if \(leftOutIds\.has\(p\.id\)\) return \{ note: LEFT_OUT_TOKEN_ROW_NOTE \};/.test(card);
    const passed = /<LiquidAssetsCard positions=\{liquid\} leftOut=\{settled \? leftOutTokens : \[\]\}/.test(page);
    return split && total && passed &&
      leftOutTokensNote(1) === "1 token we couldn\u2019t verify isn\u2019t included in your totals." &&
      leftOutTokensNote(12) === "12 tokens we couldn\u2019t verify aren\u2019t included in your totals." && LEFT_OUT_TOKEN_ROW_NOTE === "Not included in totals";
  })(), "wiring + copy");

  add("TL-23: the Trim rows and the gallery carry the listed icon; a registry token keeps its own", (() => {
    const { card } = trimOf([{ ...usdc1000, valueUsd: 3000, uiAmount: 3000, amount: "3000000000" }, memePos]);
    const assets = card?.reviewDetails?.involvedAssets ?? [];
    const rows = deriveTrimRows({ legs: [], assessments: {}, assets: assets.map((a) => ({ ...a, actionability: "unavailable" as const })), nowMs: 0 });
    const gallery = getTrimTestingFixtures();
    const byId = (id: string) => gallery.find((f) => f.id === id);
    return rows.length === 1 && rows[0].symbol === "PENGU" && rows[0].iconUrl === JUP_ICON && rows[0].icon === null &&
      byId("verified_meme")?.card != null && byId("verified_meme_multi")?.card?.reviewDetails?.involvedAssets?.length === 3 &&
      // PYUSD is counted and out of scope: the card is for the OTHER token only.
      byId("verified_not_meme")?.card?.reviewDetails?.involvedAssets?.map((a) => a.symbol).join(",") === "TKa" &&
      byId("unverified_beside_meme")?.card?.titleOverride === "Reduce PENGU exposure" &&
      byId("pump")?.card?.titleOverride === "Reduce PUMP exposure" &&
      // The engine's own answer to an unnamed token that reaches it has not changed: no card.
      byId("unknown")?.card === null;
  })(), "icons + gallery");

  return checks;
}
