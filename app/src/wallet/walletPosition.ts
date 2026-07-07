/**
 * Read-only wallet portfolio-discovery model + approved token mint registry.
 *
 * These are the WealthSmith MVP-approved token mints (canonical, public Solana
 * mint addresses — verifiable on-chain / block explorers). Classification of a
 * recognized LST as a "staked" asset is based ONLY on this mapping; unrecognized
 * mints fall back to a generic token (never inferred as an LST/protocol position).
 *
 * READ-ONLY: this data comes from RPC reads of the connected publicKey only. No
 * USD value and no APY are invented — `valueUsd`/`apy` stay null until an approved
 * pricing/APY source exists.
 */

/** One underlying token leg of a composite position (for scope-B USD valuation). */
export interface PositionLeg {
  mint: string;
  /** Human (ui) amount of this leg the wallet effectively holds. */
  uiAmount: number;
  /** "long" = held/collateral (adds value); "debt" = borrowed (subtracts). */
  side?: "long" | "debt";
}

/** Normalized read-only position (per the approved data model). */
export interface WalletPosition {
  id: string;
  source:
    | "wallet"
    | "jupiter"
    | "kamino"
    | "jito"
    | "sanctum"
    | "ondo"
    | "orca"
    | "raydium"
    | "meteora"
    | "hubble";
  type: "native" | "token" | "lst" | "stake" | "protocol";
  symbol: string;
  name?: string;
  mint?: string;
  amount: string;
  uiAmount?: number;
  decimals?: number;
  logoUri?: string;
  /** Approved icon path (assets/icons/token/*.svg) for known tokens. */
  icon?: string;
  protocol?: string;
  detection:
    | "direct_wallet_balance"
    | "recognized_lst_mint"
    | "protocol_api"
    | "native_stake";
  /**
   * USD spot price per whole token, from an APPROVED price feed only (DefiLlama /
   * Jupiter — see tokenPrices.ts). Never invented. Undefined/null when no confident
   * price is available (the position then shows "—").
   */
  priceUsd?: number | null;
  /**
   * USD value of the holding, set ONLY when sourced prices exist. For a plain
   * asset that's priceUsd × uiAmount; for a composite protocol/LP position it's the
   * sum of its `legs` (debt legs subtract). Stays null when any input is unpriced —
   * never estimated or defaulted to zero.
   */
  valueUsd?: number | null;
  /**
   * Underlying token legs of a COMPOSITE protocol/LP position (scope B pricing):
   * each leg is priced by its own mint and summed. `side: "debt"` legs subtract
   * (e.g. a Hubble USDH loan). Absent for plain single-asset positions (which are
   * priced via the top-level mint instead). If ANY leg has no sourced price, the
   * whole position's valueUsd stays null ("—") — never a partial value.
   */
  legs?: PositionLeg[];
  /**
   * APY as a PERCENT (e.g. 5.24 = 5.24%), from an authoritative source only
   * (protocol SDK, on-chain rewards, approved APY API) — never invented. Null/
   * undefined when no sourced APY is available yet (shown as "—").
   */
  apy?: number | null;
  /** For protocol positions: whether it's supplied (collateral) or borrowed. */
  side?: "supplied" | "borrowed";
}

/** SPL Token programs (constants — @solana/spl-token is not a dependency). */
export const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const TOKEN_2022_PROGRAM_ID = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

interface TokenInfo {
  symbol: string;
  name: string;
  /** Approved icon path (resolved via iconRegistry). Optional — falls back to the
   *  generic token icon when there's no local asset. */
  icon?: string;
  type: "token" | "lst";
  /** Underlying protocol for LSTs (display only). */
  protocol?: string;
  /** Where the position is attributed for the "Source" column. */
  source: "wallet" | "jupiter" | "kamino" | "ondo" | "hubble";
}

/**
 * Approved MVP token mint mapping (canonical public Solana mints). LSTs are
 * classified as staked/yield assets. Do not add speculative mappings.
 */
export const TOKEN_REGISTRY: Record<string, TokenInfo> = {
  // Stable / fungible tokens
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: {
    symbol: "USDC",
    name: "USD Coin",
    icon: "assets/icons/token/usdc.svg",
    type: "token",
    source: "wallet",
  },
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: {
    symbol: "USDT",
    name: "Tether USD",
    icon: "assets/icons/token/usdt.svg",
    type: "token",
    source: "wallet",
  },
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: {
    symbol: "BONK",
    name: "Bonk",
    icon: "assets/icons/token/bonk.svg",
    type: "token",
    source: "wallet",
  },
  So11111111111111111111111111111111111111112: {
    symbol: "SOL",
    name: "Wrapped SOL",
    icon: "assets/icons/token/sol.svg",
    type: "token",
    source: "wallet",
  },
  // Hubble USDH — a crypto-collateralized stablecoin (non-yield-bearing; no APY).
  USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX: {
    symbol: "USDH",
    name: "USDH Stablecoin",
    type: "token",
    protocol: "Hubble",
    source: "hubble",
  },
  // Ondo USDY — a Treasury-backed yield-bearing token (APY sourced separately).
  A1KLoBrKBde8Ty9qtNQUtq3C2ortoC3u7twggz7sEto6: {
    symbol: "USDY",
    name: "Ondo US Dollar Yield",
    type: "token",
    protocol: "Ondo",
    source: "ondo",
  },
  // Recognized LSTs / staked assets
  jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v: {
    symbol: "JupSOL",
    name: "Jupiter Staked SOL",
    icon: "assets/icons/token/jupsol.svg",
    type: "lst",
    protocol: "Jupiter",
    source: "jupiter",
  },
  mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So: {
    symbol: "mSOL",
    name: "Marinade Staked SOL",
    icon: "assets/icons/token/msol.svg",
    type: "lst",
    protocol: "Marinade",
    source: "wallet",
  },
  bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1: {
    symbol: "bSOL",
    name: "BlazeStake Staked SOL",
    icon: "assets/icons/token/bsol.svg",
    type: "lst",
    protocol: "BlazeStake",
    source: "wallet",
  },
  J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn: {
    symbol: "JitoSOL",
    name: "Jito Staked SOL",
    icon: "assets/icons/token/jitosol.svg",
    type: "lst",
    protocol: "Jito",
    source: "wallet",
  },
};

export function lookupMint(mint: string): TokenInfo | undefined {
  return TOKEN_REGISTRY[mint];
}

/** Short mint for unknown tokens, e.g. "9WzD…AWWM". */
export function shortMint(mint: string): string {
  return mint.length <= 8 ? mint : `${mint.slice(0, 4)}…${mint.slice(-4)}`;
}
