/**
 * lstUnderlyingNormalization — Step 17G. PURE, read-only normalization of a supported liquid-staking
 * token (LST) into its source-backed UNDERLYING-SOL equivalent, kept STRICTLY SEPARATE from its market
 * value. Two authoritative concepts never substituted for one another:
 *   A. MARKET value   = exact LST balance × fresh exact-mint LST price → WalletPosition.valueUsd (net worth).
 *   B. BACKING (SOL)  = exact underlying SOL under the deployed pool accounting → exposure analysis only.
 *
 * Supported set: JitoSOL, JupSOL, mSOL, bSOL. JitoSOL/JupSOL/bSOL use SPL Stake Pool accounting
 * (`rate = totalLamports / poolTokenSupply`, decoded by the installed @solana/spl-stake-pool 1.1.8). mSOL
 * is Marinade's own program with NO installed source-backed decoder, so its backing is FAIL-CLOSED to
 * `unsupported` (market value preserved; underlying null) — never inferred from market price or a 1:1.
 *
 * FAIL-CLOSED + EXACT. Backing = floor(rawBalance × totalLamports / poolTokenSupply) in integer/BigInt —
 * market price NEVER determines the ratio; a zero/absent denominator, malformed or stale pool state, wrong
 * pool_mint/program, or an unsupported product all yield null underlying with a reason. The exact LST
 * balance and market value stay visible regardless. Gross backing is an exposure figure — never liquid
 * native SOL, never immediately redeemable, never a second net-worth value.
 */
import type { WalletPosition } from "./walletPosition";

export const LST_NORMALIZATION_VERSION = "1.0.0" as const;
export const CLASSIC_TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" as const;
export const SOL_DECIMALS = 9;

/** SPL-StakePool-layout programs (shared by JitoSOL / bSOL / JupSOL pools). Source: lstApy.ts / SDK. */
export const STAKE_POOL_PROGRAMS = [
  "SPoo1Ku8WFXoNDMHPsrGSTSG1Y47rzgn41SLUNakuHy", // SPL stake pool (JitoSOL, bSOL)
  "SP12tWFxD9oJsVWNavTTBZvMbA6gkAmxtVgxdqvyvhY", // Sanctum single-validator SPL
  "SPMBzsVUuoHA4Jm6KunbsotaahvVikZs1JyTW6iJvbn", // Sanctum multi-validator SPL (JupSOL)
] as const;

export type LstAccountingKind = "spl_stake_pool" | "marinade";

export interface LstIdentity {
  productId: string;
  symbol: string;
  mint: string;
  tokenProgram: string;
  decimals: number;
  accountingKind: LstAccountingKind;
  /** Programs whose StakePool account may own this LST's pool (identity is the pool_mint match, not a label). */
  stakePoolPrograms: readonly string[];
  /** Canonical pool/state account (evidence; discovery still validates pool.poolMint === mint). */
  expectedPool: string | null;
  /** True when a source-backed on-chain accounting decoder is installed for this product. */
  backingSupported: boolean;
  cluster: "mainnet-beta";
  invalidationTriggers: string[];
}

/** The exact supported LST identities — bound by MINT + program, never symbol/name/logo/price label. */
export const SUPPORTED_LSTS: Record<string, LstIdentity> = {
  jitosol: {
    productId: "jitosol", symbol: "JitoSOL", mint: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
    tokenProgram: CLASSIC_TOKEN_PROGRAM, decimals: 9, accountingKind: "spl_stake_pool",
    stakePoolPrograms: ["SPoo1Ku8WFXoNDMHPsrGSTSG1Y47rzgn41SLUNakuHy"], expectedPool: "Jito4APyf642JPZPx3hGc6WWJ8zPKtRbRs4P815Awbb",
    backingSupported: true, cluster: "mainnet-beta",
    invalidationTriggers: ["JitoSOL mint changes", "stake-pool program/pool account changes", "pool_mint no longer matches", "StakePool account version unsupported"],
  },
  jupsol: {
    productId: "jupsol", symbol: "JupSOL", mint: "jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v",
    tokenProgram: CLASSIC_TOKEN_PROGRAM, decimals: 9, accountingKind: "spl_stake_pool",
    stakePoolPrograms: ["SPMBzsVUuoHA4Jm6KunbsotaahvVikZs1JyTW6iJvbn"], expectedPool: "8VpRhuxa7sUUepdY3kQiTmX9rS5vx4WgaXiAnXq4KCtr",
    backingSupported: true, cluster: "mainnet-beta",
    invalidationTriggers: ["JupSOL mint changes", "Sanctum multi-validator program/pool changes", "pool_mint no longer matches"],
  },
  bsol: {
    productId: "bsol", symbol: "bSOL", mint: "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1",
    tokenProgram: CLASSIC_TOKEN_PROGRAM, decimals: 9, accountingKind: "spl_stake_pool",
    stakePoolPrograms: ["SPoo1Ku8WFXoNDMHPsrGSTSG1Y47rzgn41SLUNakuHy"], expectedPool: "stk9ApL5HeVAwPLr3TLhDXdZS8ptVu7zp6ov8HFDuMi",
    backingSupported: true, cluster: "mainnet-beta",
    invalidationTriggers: ["bSOL mint changes", "BlazeStake pool program/account changes", "pool_mint no longer matches"],
  },
  msol: {
    productId: "msol", symbol: "mSOL", mint: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
    tokenProgram: CLASSIC_TOKEN_PROGRAM, decimals: 9, accountingKind: "marinade",
    stakePoolPrograms: [], expectedPool: "8szGkuLTAux9XMgZ2vtY39jVSowEcpBfFfD8hXSEqdGC",
    // No installed Marinade decoder → backing normalization is fail-closed (unsupported), market value kept.
    backingSupported: false, cluster: "mainnet-beta",
    invalidationTriggers: ["mSOL mint changes", "Marinade state account changes", "a source-backed Marinade decoder becomes installed (enables backing)"],
  },
};

export function lstIdentityByMint(mint: string): LstIdentity | null {
  for (const id of Object.values(SUPPORTED_LSTS)) if (id.mint === mint) return id;
  return null;
}
export function isSupportedLstMint(mint: string): boolean {
  return lstIdentityByMint(mint) !== null;
}

/** Canonical economic-position dedupe key — bound to the exact LST mint (aggregated wallet accounts). */
export function lstDedupeKey(mint: string): string {
  return `lst:${mint}`;
}

/* ------------------------------------------------------------------ *
 * Decoded pool facts (from the mount via @solana/spl-stake-pool) + normalization result
 * ------------------------------------------------------------------ */
export interface LstPoolFacts {
  poolAccount: string;
  programOwner: string;
  poolMint: string;                // StakePool.poolMint — MUST equal the LST mint
  totalLamports: string;           // BN → decimal string (numerator)
  poolTokenSupply: string;         // BN → decimal string (denominator)
  /** Optional net-redemption inputs (withdrawal fee) — NOT part of gross backing. */
  withdrawalFeeNumerator?: string | null;
  withdrawalFeeDenominator?: string | null;
  sourceSlot: number;
  fresh: boolean;
}

export type LstNormalizationState =
  | "complete" | "stale" | "identity_invalid" | "accounting_unresolved" | "source_skew" | "unsupported" | "malformed";

export interface LstNormalizationResult {
  productId: string;
  mint: string;
  tokenProgram: string;
  rawTokenBalance: string;
  tokenAmount: number;
  underlyingSolLamports: string | null;
  underlyingSolAmount: number | null;
  exchangeRateNumerator: string | null;
  exchangeRateDenominator: string | null;
  exchangeRateKind: string | null;
  /** Optional net-of-withdrawal-fee redemption (separate from gross backing; never "backing"). */
  grossUnderlyingSolLamports: string | null;
  netRedeemableSolLamports: string | null;
  withdrawalFeeLamports: string | null;
  accountingVersion: string;
  sourceAccounts: string[];
  sourceSlot: number;
  observedAt: string;
  freshness: "fresh" | "stale" | "unresolved";
  normalizationState: LstNormalizationState;
  unresolvedReasons: string[];
  dedupeKey: string;
}

const big = (s: string | null | undefined): bigint | null => { if (s === null || s === undefined || !/^[0-9]+$/.test(s)) return null; try { return BigInt(s); } catch { return null; } };
const toUnits = (raw: bigint, dec: number): number => { const d = 10n ** BigInt(dec); return Number(raw / d) + Number(raw % d) / Number(d); };

export interface LstNormalizationInput {
  mint: string;
  rawTokenBalance: string;
  tokenProgram: string;
  pool: LstPoolFacts | null;
  observedAt: string;
  walletSourceSlot: number;
  /** Max approved wallet↔pool slot skew; exceeding it fails closed. */
  maxSourceSkewSlots?: number;
}

/**
 * Pure source-backed backing normalization. Identity is bound by exact mint + token program + (for SPL
 * pools) the decoded pool's `poolMint === mint` under an approved program. Backing =
 * floor(rawBalance × totalLamports / poolTokenSupply). mSOL (no installed decoder) → `unsupported`.
 */
export function normalizeLstBacking(input: LstNormalizationInput): LstNormalizationResult {
  const id = lstIdentityByMint(input.mint);
  const balance = big(input.rawTokenBalance);
  const base = {
    productId: id?.productId ?? "unknown", mint: input.mint, tokenProgram: input.tokenProgram,
    rawTokenBalance: input.rawTokenBalance, tokenAmount: balance !== null ? toUnits(balance, id?.decimals ?? 9) : 0,
    underlyingSolLamports: null as string | null, underlyingSolAmount: null as number | null,
    exchangeRateNumerator: null as string | null, exchangeRateDenominator: null as string | null, exchangeRateKind: null as string | null,
    grossUnderlyingSolLamports: null as string | null, netRedeemableSolLamports: null as string | null, withdrawalFeeLamports: null as string | null,
    accountingVersion: `lst_norm_${LST_NORMALIZATION_VERSION}`, sourceAccounts: [] as string[],
    sourceSlot: input.pool?.sourceSlot ?? input.walletSourceSlot, observedAt: input.observedAt,
    dedupeKey: lstDedupeKey(input.mint),
  };

  if (id === null || input.mint !== id.mint) return { ...base, freshness: "unresolved", normalizationState: "identity_invalid", unresolvedReasons: ["mint is not a supported LST"] };
  if (input.tokenProgram !== id.tokenProgram) return { ...base, freshness: "unresolved", normalizationState: "identity_invalid", unresolvedReasons: ["wrong token program"] };
  if (balance === null) return { ...base, freshness: "unresolved", normalizationState: "malformed", unresolvedReasons: ["malformed token balance"] };
  if (!id.backingSupported || id.accountingKind !== "spl_stake_pool")
    return { ...base, freshness: "unresolved", normalizationState: "unsupported", unresolvedReasons: [`no installed source-backed accounting decoder for ${id.symbol} (${id.accountingKind})`] };
  if (balance === 0n) return { ...base, underlyingSolLamports: "0", underlyingSolAmount: 0, grossUnderlyingSolLamports: "0", freshness: "fresh", normalizationState: "complete", unresolvedReasons: [] };

  const pool = input.pool;
  if (pool === null) return { ...base, freshness: "unresolved", normalizationState: "accounting_unresolved", unresolvedReasons: ["pool state unavailable"] };
  if (!id.stakePoolPrograms.includes(pool.programOwner)) return { ...base, sourceAccounts: [pool.poolAccount], freshness: "unresolved", normalizationState: "identity_invalid", unresolvedReasons: ["pool owner program not in the approved set"] };
  if (pool.poolMint !== id.mint) return { ...base, sourceAccounts: [pool.poolAccount], freshness: "unresolved", normalizationState: "identity_invalid", unresolvedReasons: ["decoded pool_mint does not match the LST mint"] };
  const skew = input.maxSourceSkewSlots;
  if (typeof skew === "number" && Math.abs((input.walletSourceSlot || 0) - (pool.sourceSlot || 0)) > skew)
    return { ...base, sourceAccounts: [pool.poolAccount], freshness: "stale", normalizationState: "source_skew", unresolvedReasons: ["wallet/pool source-slot skew exceeds policy"] };
  if (!pool.fresh) return { ...base, sourceAccounts: [pool.poolAccount], freshness: "stale", normalizationState: "stale", unresolvedReasons: ["pool accounting stale"] };

  const num = big(pool.totalLamports);
  const den = big(pool.poolTokenSupply);
  if (num === null || den === null) return { ...base, sourceAccounts: [pool.poolAccount], freshness: "unresolved", normalizationState: "malformed", unresolvedReasons: ["malformed pool totals"] };
  if (den <= 0n) return { ...base, sourceAccounts: [pool.poolAccount], freshness: "unresolved", normalizationState: "accounting_unresolved", unresolvedReasons: ["pool token supply is zero"] };

  // GROSS backing — exact integer floor. This is the holder's proportional pool claim before any fee.
  const grossLamports = (balance * num) / den;
  // Optional NET redeemable (gross − withdrawal fee), stored separately; NEVER called backing.
  let netLamports: bigint | null = null;
  let feeLamports: bigint | null = null;
  const feeNum = big(pool.withdrawalFeeNumerator ?? undefined);
  const feeDen = big(pool.withdrawalFeeDenominator ?? undefined);
  if (feeNum !== null && feeDen !== null && feeDen > 0n) { feeLamports = (grossLamports * feeNum) / feeDen; netLamports = grossLamports - feeLamports; }

  return {
    ...base,
    underlyingSolLamports: grossLamports.toString(), underlyingSolAmount: toUnits(grossLamports, SOL_DECIMALS),
    exchangeRateNumerator: num.toString(), exchangeRateDenominator: den.toString(),
    exchangeRateKind: "spl_stake_pool_total_lamports_over_supply",
    grossUnderlyingSolLamports: grossLamports.toString(),
    netRedeemableSolLamports: netLamports !== null ? netLamports.toString() : null,
    withdrawalFeeLamports: feeLamports !== null ? feeLamports.toString() : null,
    sourceAccounts: [pool.poolAccount], freshness: "fresh", normalizationState: "complete", unresolvedReasons: [],
  };
}

/* ------------------------------------------------------------------ *
 * §11 — WalletPosition enrichment. valueUsd STAYS market value; underlying SOL is exposure-only.
 * ------------------------------------------------------------------ */
/**
 * Attach underlying-SOL fields to a supported LST WalletPosition. `marketPriceUsd`/`marketValueUsd` come
 * from the existing price path (WalletPosition.priceUsd/valueUsd) and are NOT altered here. `solPriceUsd`
 * (fresh canonical SOL price) values the backing for exposure only. Stale SOL price → underlyingSolValueUsd
 * null but SOL units preserved. Backing never replaces valueUsd.
 */
export function applyLstNormalization(p: WalletPosition, r: LstNormalizationResult, solPriceUsd: number | null, solPriceFresh: boolean): WalletPosition {
  const marketValueUsd = typeof p.valueUsd === "number" ? p.valueUsd : null; // authoritative, unchanged
  const solOk = solPriceFresh && typeof solPriceUsd === "number" && solPriceUsd > 0;
  const underlyingSolValueUsd = solOk && r.underlyingSolAmount !== null ? r.underlyingSolAmount * (solPriceUsd as number) : null;
  const diff = marketValueUsd !== null && underlyingSolValueUsd !== null ? marketValueUsd - underlyingSolValueUsd : null;
  return {
    ...p,
    // valueUsd UNCHANGED (market value = authoritative net worth).
    marketValueUsd,
    lstProductId: r.productId,
    underlyingSolLamports: r.underlyingSolLamports,
    underlyingSolAmount: r.underlyingSolAmount,
    underlyingSolValueUsd,
    lstExchangeRateNumerator: r.exchangeRateNumerator,
    lstExchangeRateDenominator: r.exchangeRateDenominator,
    lstNormalizationState: r.normalizationState,
    marketToBackingDifferenceUsd: diff,
    restrictionReasons: r.unresolvedReasons.length > 0 ? r.unresolvedReasons : p.restrictionReasons,
  };
}

/* ------------------------------------------------------------------ *
 * §13 — SOL exposure derivation (analytical; never a second net-worth value).
 * ------------------------------------------------------------------ */
export type SolExposureClass =
  | "liquid_native_sol" | "native_stake" | "lst_backed_sol" | "lst_unresolved" | "non_sol";

export function solExposureClass(p: WalletPosition): SolExposureClass {
  if (p.type === "native") return "liquid_native_sol";
  if (p.type === "stake") return "native_stake";
  if (p.type === "lst") {
    if (isSupportedLstMint(p.mint ?? "")) return typeof p.underlyingSolLamports === "string" ? "lst_backed_sol" : "lst_unresolved";
    return "lst_unresolved";
  }
  return "non_sol";
}

/**
 * Total SOL-UNIT exposure (lamports): native SOL + native-stake recognized lamports + normalized LST
 * backing lamports. This is a staking-exposure figure — it must NEVER be used as USD net worth, and it
 * never sums both an LST's market value and its backing value.
 */
export function totalSolExposureLamports(positions: WalletPosition[]): { lamports: string; unresolvedProducts: string[] } {
  let total = 0n;
  const unresolved: string[] = [];
  for (const p of positions) {
    const cls = solExposureClass(p);
    if (cls === "liquid_native_sol" || cls === "native_stake") {
      const raw = big(p.amount); if (raw !== null) total += raw;
    } else if (cls === "lst_backed_sol") {
      const raw = big(p.underlyingSolLamports ?? null); if (raw !== null) total += raw;
    } else if (cls === "lst_unresolved") {
      unresolved.push(p.mint ?? p.symbol ?? "unknown_lst");
    }
  }
  return { lamports: total.toString(), unresolvedProducts: unresolved };
}
