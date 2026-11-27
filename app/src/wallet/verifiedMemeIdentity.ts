/**
 * verifiedMemeIdentity — the ONE exception to "a listing is display-only".
 *
 * DECISION (product owner, 2026-11-26). Trim is for long-tail exposure, and most of the long
 * tail is not in our approved registry. A token the registry cannot name has no identity, so
 * it was never a Trim candidate — and, more than that, its value was never counted: one such
 * token leaves the whole portfolio's net worth unresolved. The decision: a token outside the
 * registry HAS an identity when Jupiter has VERIFIED that exact mint AND Jupiter itself tags it
 * `meme`. "JUP should not be trimmed; almost all meme coins from Jupiter's verified list
 * should." Such a token is then treated the way the registry's own meme coins (BONK, WIF)
 * already are: an ordinary, priced, non-core wallet token.
 *
 * PLUS ONE NAMED TOKEN (product owner, 2026-11-27: "all meme tokens + PUMP should be trimmed;
 * we wouldn't suggest trimming stablecoins, JUP or LP tokens"). PUMP is a launchpad token that
 * Jupiter tags `defi`, not `meme`, so the tag alone misses it. It is listed by exact mint in
 * `VERIFIED_IDENTITY_EXTRA_MINTS` and must STILL be Jupiter-verified to count — the list widens
 * which verified tokens qualify, never whether verification is needed.
 *
 * What the rule leaves alone, by construction and with no list of ours to maintain:
 *   - utility / DeFi tokens, tokenized stocks, stablecoins (PYUSD), staking tokens — verified,
 *     but not tagged `meme`: still unnamed to the engine, still not counted, still not trimmed;
 *   - anything Jupiter has not verified, whatever it calls itself;
 *   - a registry token, which keeps its own approved identity and product owner (JUP → staking);
 *   - a core asset, which Trim excludes by exact mint before identity is considered.
 *
 * EXACTLY TWO READERS, and no others (fixture TL-15):
 *   - wallet/portfolioCompleteness.ts — the token is classified as an ordinary token, not an
 *     "unknown token", so its sourced value counts and it no longer blocks net worth;
 *   - suggestions/trimAssessment.ts — its identity is resolved, and Trim shows the listed
 *     ticker, name and icon for it.
 *
 * What does NOT change: the position's own `symbol` and `name` (the shortened address and
 * "Unknown token"). LP detection, receipt dedupe, the stablecoin test and the display grouping
 * still read those — so a verified meme coin is never mistaken for a stablecoin by its ticker.
 *
 * Everything after candidacy is the unchanged pipeline: a fresh sourced value, the Trim
 * thresholds, a transferable token, a route inside the execution limits, a verified and
 * simulated plan, and the user's approval of each transaction.
 */
import type { WalletPosition } from "./walletPosition";

/** Off switch. False restores "only registry tokens have an identity" with no other change. */
export const VERIFIED_MEME_LISTING_IS_IDENTITY = true;

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

/**
 * The identity of a wallet token the registry could not name — or null.
 * Non-null only for: a plain direct-wallet token, unnamed by the registry, with a mint, whose
 * listing is Jupiter-verified and either carries Jupiter's `meme` tag (strictly `true`) or is one
 * of the mints named in `VERIFIED_IDENTITY_EXTRA_MINTS`.
 */
export function verifiedMemeIdentity(p: WalletPosition): VerifiedMemeIdentity | null {
  if (!VERIFIED_MEME_LISTING_IS_IDENTITY) return null;
  if (p.source !== "wallet" || p.type !== "token" || p.name !== "Unknown token" || typeof p.mint !== "string" || p.mint.length === 0) return null;
  const l = p.listing;
  if (l == null || l.source !== "jupiter_verified") return null;
  if (l.meme !== true && !VERIFIED_IDENTITY_EXTRA_MINTS.has(p.mint)) return null;
  if (typeof l.symbol !== "string" || l.symbol.length === 0 || typeof l.name !== "string" || l.name.length === 0) return null;
  return { symbol: l.symbol, name: l.name, iconUrl: typeof l.iconUrl === "string" ? l.iconUrl : null };
}
