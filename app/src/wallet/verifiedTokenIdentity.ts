/**
 * verifiedTokenIdentity — what the engine does with a wallet token OUTSIDE our approved registry.
 *
 * THE PROBLEM IT SOLVES. The registry is twelve tokens. A token it cannot name used to have no
 * identity and no trusted value, and ONE such token left the whole portfolio's net worth
 * unresolved: no total, no On Track, no Rebalance, no Trim. In a sample of 40 real DeFi wallets
 * (2026-11-27) 34 held at least one — so most real users saw none of it.
 *
 * THE RULE (product owner, 2026-11-26 and 2026-11-27). Jupiter's verified token list decides,
 * by exact mint, in three steps:
 *
 *   1. COUNTED — Jupiter has verified the mint AND we have a sourced price for it. Its value is
 *      part of the portfolio like any other priced token's.
 *        · tagged `stable` by Jupiter  → the STABLES side of the crypto/stables split, so
 *          Rebalance does not mistake PYUSD for crypto. It is NOT part of the Safety Buffer,
 *          which stays limited to our own approved stablecoins.
 *        · everything else             → the crypto side.
 *   2. TRIM CANDIDATE — counted, AND tagged `meme` by Jupiter (or named in
 *      `VERIFIED_IDENTITY_EXTRA_MINTS`: PUMP). "All meme tokens + PUMP should be trimmed; we
 *      wouldn't suggest trimming stablecoins, JUP or LP tokens."
 *   3. LEFT OUT — everything else the registry cannot name: not verified by Jupiter, or verified
 *      but without a sourced price. It is NOT counted and it does NOT block. It stays visible
 *      in the wallet's list with no value, and the user is told how many tokens were left out.
 *
 * WHY AN UNVERIFIED TOKEN IS LEFT OUT EVEN WHEN A PRICE IS QUOTED FOR IT. Anyone can create a
 * token, seed a tiny pool and airdrop it: the quoted price is real arithmetic on a market
 * nobody can sell into. In the same sample one wallet's unverified tokens were "worth" seven
 * times everything else it held. Counting that would overstate the portfolio; letting it block
 * would let a stranger's airdrop switch off someone's suggestions.
 *
 * WHAT DOES NOT CHANGE: the position's own `symbol` and `name` (the shortened address and
 * "Unknown token"). LP detection, receipt dedupe and the registry stablecoin test still read
 * those, which is why a verified stablecoin is never taken for a Safety Buffer asset.
 *
 * WHO MAY READ A LISTING. Only this module looks inside `position.listing`; the engine asks it
 * questions. Its readers are named and checked by fixture TL-15.
 *
 * ONE KNOWN LIMIT. If the listing lookup fails (Jupiter unreachable and nothing cached), no
 * token carries a listing for that read, so verified tokens are left out too until the next
 * read. The portfolio is then understated — never overstated — and the "left out" note says so.
 */
import type { WalletPosition } from "./walletPosition";

/** Off switch. False restores "only registry tokens count" with no other change. */
export const VERIFIED_LISTING_IS_IDENTITY = true;

/**
 * Verified tokens treated like a meme coin although Jupiter does not tag them one. Exact mints,
 * each with the decision that put it here. Keep this short: the tag is the rule, this is the
 * exception.
 */
export const VERIFIED_IDENTITY_EXTRA_MINTS: ReadonlySet<string> = new Set([
  // PUMP (pump.fun) — tagged `defi` by Jupiter; to be trimmed with the meme coins (2026-11-27).
  "pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn",
]);

export interface VerifiedMemeIdentity {
  symbol: string;
  name: string;
  iconUrl: string | null;
}

/** A plain direct-wallet token the registry could not name. */
export function isUnnamedWalletToken(p: WalletPosition): boolean {
  return p.source === "wallet" && p.type === "token" && p.name === "Unknown token";
}

/** The Jupiter-verified listing of an unnamed wallet token, or null. Shape-checked; nothing is trusted loosely. */
function verifiedListingOf(p: WalletPosition): NonNullable<WalletPosition["listing"]> | null {
  if (!VERIFIED_LISTING_IS_IDENTITY) return null;
  if (!isUnnamedWalletToken(p) || typeof p.mint !== "string" || p.mint.length === 0) return null;
  const l = p.listing;
  if (l == null || l.source !== "jupiter_verified") return null;
  if (typeof l.symbol !== "string" || l.symbol.length === 0 || typeof l.name !== "string" || l.name.length === 0) return null;
  return l;
}

const hasSourcedValue = (p: WalletPosition): boolean => typeof p.valueUsd === "number" && Number.isFinite(p.valueUsd) && p.valueUsd >= 0;

/**
 * STEP 1 — counted: Jupiter-verified, with a sourced price. The token is an ordinary priced
 * token to the portfolio from here on.
 */
export function isCountedVerifiedToken(p: WalletPosition): boolean {
  return verifiedListingOf(p) != null && hasSourcedValue(p);
}

/** Counted, and tagged a stablecoin by Jupiter: the stables side of the allocation. Never the Safety Buffer. */
export function isVerifiedStableToken(p: WalletPosition): boolean {
  return isCountedVerifiedToken(p) && verifiedListingOf(p)?.stable === true;
}

/**
 * STEP 2 — the identity Trim may use for a token the registry could not name, or null.
 * Non-null only when the listing is Jupiter-verified and either carries Jupiter's `meme` tag
 * (strictly `true`) or is one of the mints named in `VERIFIED_IDENTITY_EXTRA_MINTS`.
 * A stablecoin is never a Trim candidate, whatever else it is tagged.
 */
export function verifiedMemeIdentity(p: WalletPosition): VerifiedMemeIdentity | null {
  const l = verifiedListingOf(p);
  if (l == null) return null;
  if (l.stable === true) return null;
  if (l.meme !== true && !VERIFIED_IDENTITY_EXTRA_MINTS.has(p.mint as string)) return null;
  return { symbol: l.symbol, name: l.name, iconUrl: typeof l.iconUrl === "string" ? l.iconUrl : null };
}

/** STEP 3 — left out: an unnamed wallet token that is not counted. */
export function isLeftOutToken(p: WalletPosition): boolean {
  return isUnnamedWalletToken(p) && !isCountedVerifiedToken(p);
}

export interface CountedPositions {
  /** What the portfolio is made of: every total, every assessment and every suggestion reads only these. */
  counted: WalletPosition[];
  /**
   * Tokens left out, prepared for DISPLAY: the same rows with their quoted price and value
   * removed, so a list can show them (amount, address) without a number the totals do not
   * include. Never feed these to a total or to the engine.
   */
  leftOut: WalletPosition[];
}

/**
 * Split a wallet read into what counts and what is left out. This is the ONE place a left-out
 * token is separated; call it where positions enter the app (the wallet hook, the server's
 * snapshot reader) so nothing downstream has to remember to.
 */
export function splitCountedPositions(positions: readonly WalletPosition[]): CountedPositions {
  const counted: WalletPosition[] = [];
  const leftOut: WalletPosition[] = [];
  for (const p of positions) {
    if (isLeftOutToken(p)) leftOut.push({ ...p, valueUsd: null, priceUsd: null, change24hPct: undefined });
    else counted.push(p);
  }
  return { counted, leftOut };
}
