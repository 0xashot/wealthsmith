/**
 * productAssetOwnership — Step 24A. The governed, versioned CANONICAL registry that decides which
 * ONE product-suggestion owner an asset belongs to, keyed by EXACT on-chain identity (mint + token
 * program). Native SOL uses an explicit non-SPL identity (System Program).
 *
 * DETERMINISTIC + FAIL-CLOSED: classification is by exact mint and token-program only — never display
 * symbol, token name, `symbol.includes(...)`, logo, frontend label, or fuzzy match. An unknown mint,
 * an unresolved program, or a known mint under the WRONG program (a symbol spoof) all resolve to
 * `unsupported` (no suggestion). This module owns cross-category exclusivity: an asset has exactly one
 * primary owner, so it can never be simultaneously owned by two suggestion engines.
 *
 * It does NOT itself run any engine or produce a card. The existing SOL Staking / Stable Yield / Trim
 * engines keep their own eligibility logic unchanged; this registry adds JUP routing + the architecture
 * guards, and lets Trim exclude a jup_staking-owned asset from its non-core scope.
 */
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "../wallet/walletPosition";
import type { WalletPosition } from "../wallet/walletPosition";

/** Stamped on the registry for stale detection + explainability. */
export const PRODUCT_ASSET_OWNERSHIP_VERSION = "product_asset_ownership_v1";

/** System Program — native SOL's non-SPL identity (native SOL has no SPL mint/token account). */
export const SYSTEM_PROGRAM_ID = "11111111111111111111111111111111";

/** The ONE primary product-suggestion owner of an asset. Exactly one per asset (mutually exclusive). */
export type ProductSuggestionOwner =
  | "sol_staking"
  | "stable_yield"
  | "jup_staking"
  | "trim_only"
  | "already_earning"
  | "position_review"
  | "unsupported";

/** A governed exact-identity ownership record. Identity is mint + token program (never a label). */
export interface ProductAssetPolicy {
  assetId: string;
  /** Canonical public Solana mint. `null` only for native SOL (no SPL mint). */
  mint: string | null;
  /** SPL token program the canonical asset lives under — or the System Program for native SOL. */
  tokenProgram: string;
  owner: ProductSuggestionOwner;
  policyVersion: string;
}

const policy = (
  assetId: string,
  mint: string | null,
  owner: ProductSuggestionOwner,
  tokenProgram: string = TOKEN_PROGRAM_ID
): ProductAssetPolicy => ({ assetId, mint, tokenProgram, owner, policyVersion: PRODUCT_ASSET_OWNERSHIP_VERSION });

/**
 * The approved ownership table. Mints are the canonical public Solana mints (identical to TOKEN_REGISTRY
 * in walletPosition.ts — no duplicated constants of DIFFERENT value). Classic SPL Token Program for every
 * SPL row (all approved mints are classic); native SOL is the System-Program row.
 */
export const PRODUCT_ASSET_OWNERSHIP: readonly ProductAssetPolicy[] = [
  // Native SOL → existing SOL Staking engine (explicit non-SPL identity).
  policy("native_sol", null, "sol_staking", SYSTEM_PROGRAM_ID),
  // Wrapped SOL (SPL) also belongs to SOL staking ownership.
  policy("wrapped_sol", "So11111111111111111111111111111111111111112", "sol_staking"),
  // Canonical stablecoins → existing Stable Yield engine.
  policy("usdc", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "stable_yield"),
  policy("usdt", "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", "stable_yield"),
  policy("usdh", "USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX", "stable_yield"),
  // JUP → new dedicated JUP Staking branch (NOT a meme coin, NOT generic idle capital).
  policy("jup", "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", "jup_staking"),
  // Recognized yield-bearing / already-earning positions → no idle-asset or staking suggestion.
  policy("jitosol", "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn", "already_earning"),
  policy("jupsol", "jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v", "already_earning"),
  policy("msol", "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So", "already_earning"),
  policy("bsol", "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1", "already_earning"),
  policy("usdy", "A1KLoBrKBde8Ty9qtNQUtq3C2ortoC3u7twggz7sEto6", "already_earning"),
  // Approved meme / long-tail assets → existing Trim assessment only.
  policy("bonk", "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", "trim_only"),
  policy("wif", "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", "trim_only"),
];

/** Canonical JUP mint (single source of truth for the JUP staking branch). */
export const JUP_MINT = "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN";

const BY_MINT: Map<string, ProductAssetPolicy> = new Map(
  PRODUCT_ASSET_OWNERSHIP.filter((p) => p.mint != null).map((p) => [p.mint as string, p])
);

/**
 * Resolve the ONE owner of an asset by EXACT identity. Fail-closed:
 *  - unknown mint                        → "unsupported"
 *  - known mint but WRONG token program  → "unsupported" (symbol/program spoof)
 *  - no mint (and not native SOL)        → "unsupported"
 * Native SOL is `resolveAssetOwnerForPosition`'s job (it has no SPL mint); this pure lookup treats the
 * System-Program native row and the wrapped-SOL mint as `sol_staking`.
 */
export function resolveAssetOwner(mint: string | null | undefined, tokenProgram: string | null | undefined): ProductSuggestionOwner {
  if (!mint) return "unsupported";
  const record = BY_MINT.get(mint);
  if (!record) return "unsupported";
  // Classic rows may omit tokenProgram on-chain reads; treat an absent program as classic SPL.
  const program = tokenProgram ?? TOKEN_PROGRAM_ID;
  if (record.tokenProgram !== program) return "unsupported";
  return record.owner;
}

/**
 * Resolve the owner of a discovered wallet position, honoring native SOL's non-SPL identity. A native
 * SOL holding (type "native", no SPL mint) → sol_staking; everything else defers to the exact mint +
 * token-program lookup. Read-only classification only — never implies the asset can be moved.
 */
export function resolveAssetOwnerForPosition(p: WalletPosition): ProductSuggestionOwner {
  if (p.type === "native" && (p.symbol === "SOL" || p.symbol === "WSOL")) return "sol_staking";
  // Deployed receipt/vault/LP or native-stake positions (identified by canonical position type from protocol
  // detection, never a symbol) are already-deployed — reviewed by Position Optimization / existing-position
  // treatment, never generic Capital Efficiency or new staking.
  if (p.type === "protocol") return "position_review";
  if (p.type === "stake") return "already_earning";
  return resolveAssetOwner(p.mint, p.tokenProgram);
}

/** Token-2022 re-export so callers can reason about program identity without importing walletPosition. */
export { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID };
