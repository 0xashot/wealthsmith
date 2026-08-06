/**
 * portfolioPositionDerivation — the PURE position-building half of the wallet read
 * (extracted from useWalletPortfolio so it is testable headless): raw parsed token
 * accounts → classified WalletPositions, price application, and display sorting.
 * No network, no React — the hook fetches; this module derives.
 */
import type { VrtInfo } from "./jitoRestaking";
import type { SanctumLstInfo } from "./sanctumLsts";
import { lookupMint, shortMint } from "./walletPosition";
import type { WalletPosition } from "./walletPosition";

/** Loosely-typed parsed token account — validated defensively before use. */
export interface ParsedTokenAccount {
  pubkey?: { toBase58?: () => string } | string;
  account?: {
    data?: {
      parsed?: {
        info?: {
          mint?: string;
          tokenAmount?: {
            amount?: string;
            decimals?: number;
            uiAmount?: number | null;
            uiAmountString?: string;
          };
        };
      };
    };
  };
}

/** Canonical wrapped-SOL mint — prices native SOL and native stake. */
export const SOL_MINT = "So11111111111111111111111111111111111111112";

/** Sourced USD prices + 24h change (DefiLlama / Jupiter) for detected mints, lazy. */

/**
 * The mint to price a position by (scope A): native SOL + native stake price via
 * the SOL mint; plain tokens + LSTs price by their own mint. Protocol/LP composite
 * positions are not priced here (that's scope B). Returns undefined = don't price.
 */
export function priceMintFor(p: WalletPosition): string | undefined {
  if (p.type === "native" || p.type === "stake") return SOL_MINT;
  if (p.type === "token" || p.type === "lst") return p.mint;
  return undefined;
}

/**
 * Apply sourced prices to one position. Scope A: a single-mint asset →
 * priceUsd × uiAmount. Scope B: a composite position with `legs` → sum of legs
 * (debt legs subtract). If ANY required price is missing, valueUsd stays null so
 * the row shows "—" (never a partial or invented value).
 */

export function applyPrice(
  p: WalletPosition,
  prices: Map<string, { priceUsd: number; change24hPct?: number }>
): WalletPosition {
  const mint = priceMintFor(p);
  if (mint) {
    const pi = prices.get(mint);
    if (pi && typeof p.uiAmount === "number") {
      return {
        ...p,
        priceUsd: pi.priceUsd,
        valueUsd: pi.priceUsd * p.uiAmount,
        // 24h change rides along only when the feed sourced one (else "—").
        change24hPct: pi.change24hPct ?? null,
      };
    }
    return p;
  }
  if (p.legs && p.legs.length > 0) {
    // An adapter-priced row (e.g. the canonical Kamino Direct position, whose USD
    // comes from the 17A redemption math) is AUTHORITATIVE: the feed-summed legs
    // value is nearly identical, and "nearly" is exactly where a silent divergence
    // would hide. Legs pricing only ever FILLS a missing value, never replaces one.
    // Every pre-existing legs row (raw obligation, vault) enters this pass with
    // valueUsd null, so nothing else changes behavior.
    if (typeof p.valueUsd === "number") return p;
    let total = 0;
    for (const leg of p.legs) {
      const pi = prices.get(leg.mint);
      if (!pi) return p; // any unpriced leg → leave valueUsd null ("—")
      total += (leg.side === "debt" ? -1 : 1) * pi.priceUsd * leg.uiAmount;
    }
    return { ...p, valueUsd: total };
  }
  return p;
}

/** Build a normalized position from one parsed token account, or null to skip. */

export function toTokenPosition(
  acc: ParsedTokenAccount,
  sanctumMap?: Map<string, SanctumLstInfo>
): WalletPosition | null {
  // Defensive parsing: every step may be missing on malformed / non-parsed data.
  const info = acc?.account?.data?.parsed?.info;
  if (!info || typeof info.mint !== "string") return null;
  const amt = info.tokenAmount;
  if (!amt || typeof amt.amount !== "string") return null;

  // Skip empty token accounts (no balance). uiAmount may legitimately be null.
  if (amt.amount === "0" || amt.uiAmount === 0) return null;

  const mint = info.mint;
  const uiAmount = typeof amt.uiAmount === "number" ? amt.uiAmount : undefined;
  const decimals = typeof amt.decimals === "number" ? amt.decimals : undefined;
  const known = lookupMint(mint);

  if (known) {
    return {
      id: `mint-${mint}`,
      source: known.source,
      type: known.type,
      symbol: known.symbol,
      name: known.name,
      mint,
      icon: known.icon,
      protocol: known.protocol,
      amount: amt.amount,
      uiAmount,
      decimals,
      detection: known.type === "lst" ? "recognized_lst_mint" : "direct_wallet_balance",
      valueUsd: null,
      apy: null,
    };
  }

  // Recognized Sanctum LST (any of the ~245 in Sanctum's list) — classified as an
  // LST so it shows its real symbol/name and picks up stake-pool APY in phase 3.
  const sanctum = sanctumMap?.get(mint);
  if (sanctum) {
    return {
      id: `mint-${mint}`,
      source: "sanctum",
      type: "lst",
      symbol: sanctum.symbol,
      name: sanctum.name,
      mint,
      protocol: "Sanctum",
      amount: amt.amount,
      uiAmount,
      decimals,
      detection: "recognized_lst_mint",
      valueUsd: null,
      apy: null,
    };
  }

  // Unknown token — display safely, never inferred as an LST/protocol asset.
  return {
    id: `mint-${mint}`,
    source: "wallet",
    type: "token",
    symbol: shortMint(mint),
    name: "Unknown token",
    mint,
    amount: amt.amount,
    uiAmount,
    decimals,
    detection: "direct_wallet_balance",
    valueUsd: null,
    apy: null,
  };
}

/** A held Jito VRT → a "Restaked on Jito" position denominated in the underlying. */

export function toJitoRestakingPosition(acc: ParsedTokenAccount, vrt: VrtInfo): WalletPosition | null {
  const info = acc?.account?.data?.parsed?.info;
  if (!info || typeof info.mint !== "string") return null;
  const amt = info.tokenAmount;
  if (!amt || typeof amt.amount !== "string" || amt.amount === "0" || amt.uiAmount === 0) {
    return null;
  }
  const vrtUi = typeof amt.uiAmount === "number" ? amt.uiAmount : undefined;
  // VRT → underlying supported token (e.g. JitoSOL) via the vault exchange rate.
  const underlying = vrtUi != null ? vrtUi * vrt.rate : undefined;
  const known = lookupMint(vrt.supportedMint);
  return {
    id: `jito-vault-${info.mint}`,
    source: "jito",
    type: "protocol",
    symbol: known?.symbol ?? shortMint(vrt.supportedMint),
    name: "Restaked on Jito",
    mint: info.mint,
    icon: known?.icon,
    protocol: "Jito Restaking",
    amount: underlying != null ? String(underlying) : amt.amount,
    uiAmount: underlying,
    decimals: typeof amt.decimals === "number" ? amt.decimals : undefined,
    side: "supplied",
    detection: "protocol_api",
    valueUsd: null,
    apy: null, // restaking-reward APY has no clean read source yet → "—"
  };
}

/** Exact raw token base-unit amount as BigInt (0n for non-integer/absent strings). Never sums uiAmount as authority. */

export function sumRawTokenAmount(amount: string | undefined): bigint {
  return typeof amount === "string" && /^[0-9]+$/.test(amount) ? BigInt(amount) : 0n;
}

/** Assemble positions from whatever reads succeeded (native may be null). */

export function buildPositions(
  lamports: number | null,
  tokenAccounts: ParsedTokenAccount[],
  extra: WalletPosition[] = [],
  vrtMap?: Map<string, VrtInfo>,
  sanctumMap?: Map<string, SanctumLstInfo>
): WalletPosition[] {
  const positions: WalletPosition[] = [];

  if (lamports != null) {
    positions.push({
      id: "native-sol",
      source: "wallet",
      type: "native",
      symbol: "SOL",
      name: "Solana",
      icon: "assets/icons/token/sol.svg",
      amount: String(lamports),
      uiAmount: lamports / 1e9,
      decimals: 9,
      detection: "direct_wallet_balance",
      valueUsd: null,
      apy: null,
    });
  }

  // Step 19B — AGGREGATE multiple direct-wallet accounts of the same mint into ONE holding by SUMMING raw
  // integer balances (exact BigInt), rather than keeping the first row and dropping the rest. Both a token's
  // associated and non-associated accounts sum. VRT restaking rows and native/protocol rows are per-account /
  // per-economic-position and are NOT aggregated. Raw `amount` is authoritative; formatted `uiAmount` follows.
  const byId = new Map<string, WalletPosition>(positions.map((p) => [p.id, p]));
  for (const acc of tokenAccounts) {
    // A held Jito VRT becomes a "Restaked on Jito" position; otherwise a token
    // (recognized as a Sanctum LST when applicable, else known/unknown).
    const mint = acc?.account?.data?.parsed?.info?.mint;
    const vrt = mint && vrtMap ? vrtMap.get(mint) : undefined;
    const pos = vrt ? toJitoRestakingPosition(acc, vrt) : toTokenPosition(acc, sanctumMap);
    if (!pos) continue;
    const existing = byId.get(pos.id);
    if (!existing) {
      byId.set(pos.id, pos);
      positions.push(pos);
    } else if (!vrt && (pos.type === "token" || pos.type === "lst") && (existing.type === "token" || existing.type === "lst")) {
      existing.amount = (sumRawTokenAmount(existing.amount) + sumRawTokenAmount(pos.amount)).toString();
      if (typeof existing.uiAmount === "number" || typeof pos.uiAmount === "number") {
        existing.uiAmount = (existing.uiAmount ?? 0) + (pos.uiAmount ?? 0);
      }
    }
  }
  // Protocol positions (native stake, Kamino) are already normalized.
  for (const pos of extra) {
    if (!byId.has(pos.id)) {
      byId.set(pos.id, pos);
      positions.push(pos);
    }
  }

  return sortPositions(positions);
}

/** Sort: native, LSTs, native stake, known tokens, protocol (Kamino/Jito/Orca), unknown. */

export function sortPositions(positions: WalletPosition[]): WalletPosition[] {
  const rank = (p: WalletPosition) => {
    if (p.type === "native") return 0;
    if (p.type === "lst") return 1;
    if (p.type === "stake") return 2;
    if (p.type === "protocol") return 4;
    return p.name === "Unknown token" ? 5 : 3;
  };
  return [...positions].sort((a, b) => rank(a) - rank(b));
}

/** Extract the token-account array from a getParsedTokenAccountsByOwner result. */

export function accountsOf(value: unknown): ParsedTokenAccount[] {
  const arr = (value as { value?: unknown } | undefined)?.value;
  return Array.isArray(arr) ? (arr as ParsedTokenAccount[]) : [];
}

/**
 * Per-read timeouts. web3.js has no default request timeout, so a public RPC that
 * accepts the connection but never responds would leave a read pending forever —
 * hanging the UI on "Reading your wallet…". These reject a slow read so every read
 * always settles. Native SOL gets a slightly longer budget than the token reads,
 * which are the ones that tend to be slow or unsupported on public RPCs.
 */
