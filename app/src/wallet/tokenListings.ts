/**
 * tokenListings — a DISPLAY identity for tokens outside our approved registry.
 *
 * A token the registry does not know is shown as a shortened address ("2b1k…4GXo") and the
 * generic icon, on purpose: a token can call itself anything, so the app trusts no name it has
 * not approved. That is safe and unusable — a wallet's long tail reads as rows of addresses.
 *
 * This looks the mint up in Jupiter's VERIFIED token list and, when Jupiter has verified that
 * exact mint, attaches the symbol, name and icon it lists as `position.listing`.
 *
 * ONE EXCEPTION, decided by the product owner on 2026-11-26: a verified listing that Jupiter
 * itself tags `meme` gives the token an identity: its value counts and it is a Trim candidate.
 * That lives in exactly one module, wallet/verifiedMemeIdentity.ts — the only place the engine
 * may read a listing.
 *
 * WHAT THIS IS NOT. It does not rename the position. `symbol` stays the shortened address and
 * `name` stays "Unknown token", because the engine reads both as identity: liquidity-pool
 * detection, receipt-token dedupe, portfolio completeness and Trim's eligibility all key on
 * them. A listing changes what a row is CALLED on screen and nothing about how it is counted,
 * classified or suggested, with the one exception above. Nothing else in `suggestions/` may
 * read `listing` without an explicit, recorded decision of the same kind.
 *
 * READ-ONLY and best-effort: one public HTTP GET per wallet read at most, cached per mint. Any
 * failure — timeout, bad status, malformed body — yields no listings, and every row keeps its
 * address. It never throws and never delays a portfolio beyond its own short timeout.
 */
import { TOKEN_REGISTRY, type WalletPosition } from "./walletPosition";

export interface TokenListing {
  /** The ticker Jupiter's verified list gives this exact mint. Display only. */
  symbol: string;
  /** The listed name. Display only. */
  name: string;
  /** An https icon on an allow-listed host, or null (the generic icon is used). */
  iconUrl: string | null;
  /**
   * Jupiter's own `meme` tag for this mint. The ONE fact about a listing the engine is allowed
   * to act on, and only in one place: a verified meme coin outside the registry is a Trim
   * candidate and its value counts (wallet/verifiedMemeIdentity.ts, decided 2026-11-26).
   * Everything else about a listing stays display-only.
   */
  meme: boolean;
  source: "jupiter_verified";
}

/** Jupiter's token lookup. Accepts comma-separated mints; returns verified and unverified alike. */
export const TOKEN_LISTING_ENDPOINT = "https://lite-api.jup.ag/tokens/v2/search";
/** Measured 2026-11-26: 100 mints are answered; a 101st is silently dropped. */
export const TOKEN_LISTING_MAX_MINTS_PER_REQUEST = 100;
/** One request per wallet read, never more — a wallet full of airdropped spam does not fan out. */
export const TOKEN_LISTING_MAX_MINTS_PER_WALLET = TOKEN_LISTING_MAX_MINTS_PER_REQUEST;
export const TOKEN_LISTING_TIMEOUT_MS = 4000;
/** A verified listing rarely changes. */
export const TOKEN_LISTING_VERIFIED_TTL_MS = 24 * 60 * 60 * 1000;
/** A mint that is not verified today may be verified later; ask again sooner. */
export const TOKEN_LISTING_UNLISTED_TTL_MS = 60 * 60 * 1000;
/** Bound on the per-mint cache. Oldest entries are dropped first. */
export const TOKEN_LISTING_CACHE_MAX = 5000;

/**
 * Hosts an icon may be loaded from. The browser fetches the image directly, so every host here
 * learns that someone is viewing that token. These six served ~85% of the verified list's icons
 * when sampled (2026-11-26); anything else gets the generic icon and its real name.
 */
export const TOKEN_LISTING_ICON_HOSTS: readonly string[] = [
  "static.datapi.jup.ag",
  "raw.githubusercontent.com",
  "arweave.net",
  "ipfs.io",
  "cdn.ondo.finance",
  "xstocks-metadata.backed.fi",
];

const SYMBOL_RE = /^[A-Za-z0-9$._+-]{1,12}$/;
const NAME_MAX = 40;

/**
 * Tickers a listing may never carry. The lookup only runs for mints the registry does NOT know,
 * so a listing with one of these tickers is by definition a DIFFERENT mint using a ticker the
 * app already shows for an approved asset — a bridged or wrapped copy at best. Showing "USDC"
 * beside a mint that is not our USDC is the confusion the short address exists to prevent.
 */
const RESERVED_SYMBOLS: ReadonlySet<string> = new Set([
  ...Object.values(TOKEN_REGISTRY).map((t) => t.symbol.toUpperCase()),
  "SOL", "WSOL", "USDC", "USDT", "USDH", "DAI", "BTC", "ETH",
]);

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  // Printable ASCII only: no control characters, no look-alike letters, no emoji tickers.
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length === 0 || !/^[\x20-\x7E]+$/.test(text)) return null;
  return text;
}

function cleanIconUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 400) return null;
  let url: URL;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== "https:" || url.username !== "" || url.password !== "" || url.port !== "") return null;
  return TOKEN_LISTING_ICON_HOSTS.includes(url.hostname) ? url.toString() : null;
}

/**
 * One raw lookup row → a listing, or null. Null unless Jupiter marks this exact mint verified
 * AND the ticker and name are plain text AND the ticker is not one the app already uses.
 */
export function sanitizeTokenListing(raw: unknown, mint: string): TokenListing | null {
  if (raw == null || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.id !== mint) return null;
  if (r.isVerified !== true) return null;
  const symbol = cleanText(r.symbol);
  if (symbol == null || !SYMBOL_RE.test(symbol)) return null;
  if (RESERVED_SYMBOLS.has(symbol.toUpperCase())) return null;
  const rawName = cleanText(r.name);
  if (rawName == null) return null;
  const name = rawName.length > NAME_MAX ? `${rawName.slice(0, NAME_MAX - 1).trimEnd()}…` : rawName;
  // Exactly the tag, exactly as a string in an array — a missing or malformed `tags` is "not a meme".
  const meme = Array.isArray(r.tags) && r.tags.includes("meme");
  return { symbol, name, iconUrl: cleanIconUrl(r.icon), meme, source: "jupiter_verified" };
}

export interface TokenListingSource {
  /** Listings for the verified mints among `mints`. Never throws; a failure is an empty map. */
  lookup(mints: readonly string[]): Promise<Map<string, TokenListing>>;
}

interface CacheEntry { listing: TokenListing | null; expiresAt: number }

export function createTokenListingSource(deps: {
  fetchImpl?: typeof fetch;
  now?: () => number;
  endpoint?: string;
  timeoutMs?: number;
} = {}): TokenListingSource {
  const now = deps.now ?? Date.now;
  const endpoint = deps.endpoint ?? TOKEN_LISTING_ENDPOINT;
  const timeoutMs = deps.timeoutMs ?? TOKEN_LISTING_TIMEOUT_MS;
  const cache = new Map<string, CacheEntry>();

  const remember = (mint: string, listing: TokenListing | null) => {
    cache.delete(mint);
    cache.set(mint, { listing, expiresAt: now() + (listing ? TOKEN_LISTING_VERIFIED_TTL_MS : TOKEN_LISTING_UNLISTED_TTL_MS) });
    while (cache.size > TOKEN_LISTING_CACHE_MAX) {
      const oldest = cache.keys().next().value;
      if (oldest === undefined) break;
      cache.delete(oldest);
    }
  };

  async function fetchBatch(mints: string[]): Promise<boolean> {
    // Resolved at call time, not at import: a host without a global fetch can still load this module.
    const fetchImpl = deps.fetchImpl ?? (globalThis as { fetch?: typeof fetch }).fetch;
    if (typeof fetchImpl !== "function") return false;
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const res = await fetchImpl(`${endpoint}?query=${mints.join(",")}`, controller ? { signal: controller.signal } : undefined);
      if (!res.ok) return false;
      const body: unknown = await res.json();
      if (!Array.isArray(body)) return false;
      const byMint = new Map<string, unknown>();
      for (const row of body) {
        const id = (row as { id?: unknown } | null)?.id;
        if (typeof id === "string" && !byMint.has(id)) byMint.set(id, row);
      }
      // Only a COMPLETE answer is remembered — including "not listed" for a mint it omitted.
      for (const mint of mints) remember(mint, sanitizeTokenListing(byMint.get(mint), mint));
      return true;
    } catch {
      return false; // a failure is never cached; the next read asks again
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  return {
    async lookup(mints) {
      const wanted = [...new Set(mints.filter((m) => typeof m === "string" && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(m)))]
        .slice(0, TOKEN_LISTING_MAX_MINTS_PER_WALLET);
      const t = now();
      const missing = wanted.filter((m) => { const e = cache.get(m); return e == null || e.expiresAt <= t; });
      if (missing.length > 0) await fetchBatch(missing.slice(0, TOKEN_LISTING_MAX_MINTS_PER_REQUEST));
      const out = new Map<string, TokenListing>();
      const after = now();
      for (const mint of wanted) {
        const e = cache.get(mint);
        if (e && e.expiresAt > after && e.listing) out.set(mint, e.listing);
      }
      return out;
    },
  };
}

const sharedSource = createTokenListingSource();

/** The process-wide source: one cache for every wallet read. */
export function fetchTokenListings(mints: readonly string[]): Promise<Map<string, TokenListing>> {
  return sharedSource.lookup(mints);
}

const isUnnamedToken = (p: WalletPosition): boolean =>
  p.type === "token" && p.name === "Unknown token" && typeof p.mint === "string";

/**
 * The mints worth asking about: tokens the registry could not name. Those with a sourced value
 * come first (largest first), so when a wallet holds more unnamed tokens than one request
 * covers, the ones the user can actually see a value for are the ones that get a name.
 */
export function listingCandidates(positions: readonly WalletPosition[]): string[] {
  const value = (p: WalletPosition) => (typeof p.valueUsd === "number" && Number.isFinite(p.valueUsd) ? p.valueUsd : -1);
  const ordered = positions.filter(isUnnamedToken).sort((a, b) => value(b) - value(a) || (a.mint as string).localeCompare(b.mint as string));
  return [...new Set(ordered.map((p) => p.mint as string))].slice(0, TOKEN_LISTING_MAX_MINTS_PER_WALLET);
}

/** Attach listings to the unnamed tokens they belong to. Every other field is left exactly as it was. */
export function attachTokenListings(positions: readonly WalletPosition[], listings: ReadonlyMap<string, TokenListing>): WalletPosition[] {
  if (listings.size === 0) return [...positions];
  return positions.map((p) => {
    const listing = isUnnamedToken(p) ? listings.get(p.mint as string) : undefined;
    return listing ? { ...p, listing } : p;
  });
}

/** Look up and attach in one step. Never throws; on any failure the positions come back unchanged. */
export async function withTokenListings(
  positions: readonly WalletPosition[],
  lookup: (mints: readonly string[]) => Promise<Map<string, TokenListing>> = fetchTokenListings,
): Promise<WalletPosition[]> {
  const mints = listingCandidates(positions);
  if (mints.length === 0) return [...positions];
  try {
    return attachTokenListings(positions, await lookup(mints));
  } catch {
    return [...positions];
  }
}
