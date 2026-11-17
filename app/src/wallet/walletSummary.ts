/**
 * walletSummary — derives ONLY safe, non-financial facts from the read-only
 * WalletPosition[] returned by useWalletPortfolio, for the real connected-wallet
 * Dashboard summary.
 *
 * These are counts and on-chain balances that come straight from wallet reads.
 * Per rules/financial-logic-boundaries.md this derives NO USD portfolio value, NO
 * allocation percentages, NO projected growth, NO Safety Buffer, and NO
 * suggestions — those require pricing/product logic that does not exist yet, so
 * the UI shows safe "unavailable" states instead of fixture values.
 */
import { lookupMint, type WalletPosition } from "./walletPosition";

export interface WalletSummary {
  /** Total detected positions (native SOL + non-zero token accounts). */
  assetsDetected: number;
  /** Native SOL uiAmount, or null if not read. */
  nativeSol: number | null;
  /** Count of plain SPL tokens (non-native, non-LST). */
  tokenCount: number;
  /** Count of recognized LST / staked tokens. */
  lstCount: number;
  /** Recognized underlying protocols (LSTs / Jupiter / Kamino), de-duplicated. */
  protocols: string[];
}

export function deriveWalletSummary(positions: WalletPosition[]): WalletSummary {
  const native = positions.find((p) => p.type === "native");
  const tokenCount = positions.filter((p) => p.type === "token").length;
  const lstCount = positions.filter((p) => p.type === "lst").length;

  const protocols: string[] = [];
  const add = (name: string) => {
    if (!protocols.includes(name)) protocols.push(name);
  };
  for (const p of positions) {
    // Native stake shows once as "Native staking" rather than per-validator.
    if (p.type === "stake") add("Native staking");
    else if (p.protocol) add(p.protocol);
  }

  return {
    assetsDetected: positions.length,
    nativeSol: native?.uiAmount ?? null,
    tokenCount,
    lstCount,
    protocols,
  };
}

/* ------------------------------------------------------------------ *
 * Category grouping — used to populate the product Dashboard/Portfolio
 * layout from live positions. These derive ONLY counts and category
 * membership (never USD value or APY), so the product cards can show a
 * real breakdown without inventing pricing.
 * ------------------------------------------------------------------ */

/**
 * Stablecoin symbols eligible for the Safety Buffer / stables category. A
 * position only counts as a stablecoin when it is a RECOGNIZED registry token
 * with one of these symbols — an unknown mint is never treated as a stablecoin.
 */
export const STABLE_SYMBOLS = new Set(["USDC", "USDT", "USDH", "DAI"]);

/** True only for a recognized (non-unknown) SPL token with a stablecoin symbol. */
export function isStablecoin(p: WalletPosition): boolean {
  return p.type === "token" && p.name !== "Unknown token" && STABLE_SYMBOLS.has(p.symbol);
}

/** Recognized stablecoin positions (USDC/USDT/USDH/DAI present in the registry). */
export function getStablecoinPositions(positions: WalletPosition[]): WalletPosition[] {
  return positions.filter(isStablecoin);
}

/**
 * An SPL token that is almost certainly a non-fungible token: zero decimals, a balance of
 * exactly one, and no sourced price. That is the NFT signature on Solana — supply 1, not
 * divisible — and the three conditions are required together so a priced collectible or a
 * 0-decimal fungible token the wallet holds several of is left alone.
 *
 * Only ever applied to `type: "token"`. Orca and Raydium represent concentrated-liquidity
 * positions AS NFTs (see the 0-decimal mint scan in `useWalletPortfolio`), but those arrive
 * as `type: "protocol"` once their adapter has claimed them, so they never reach this test.
 * Do not widen it to run before that enrichment, or real LP positions disappear.
 */
export function isLikelyNft(p: WalletPosition): boolean {
  return p.type === "token" && p.decimals === 0 && p.uiAmount === 1 && p.priceUsd == null;
}

/**
 * Drop NFTs from a position set.
 *
 * Applied by the wallet read itself, so an NFT never reaches the portfolio at all. That
 * matters because "unpriced position present" is a GATE, not just a row: it sets
 * `anyUnpriced`, which prints "Some assets are not priced yet, so suggestions may be
 * incomplete", replaces the Balance Overview total with an em dash, and adds "Excludes
 * positions without a sourced price" under the donuts. Filtering only the Liquid Assets
 * table hid the row and left all three.
 *
 * Safe at this point because the Orca/Raydium CLMM scan reads raw `tokenAccounts`, not
 * positions — it never consults this list to find its 0-decimal mints.
 */
export function excludeLikelyNfts(positions: WalletPosition[]): WalletPosition[] {
  return positions.filter((p) => !isLikelyNft(p));
}

/**
 * Liquid, wallet-held assets: native SOL + plain SPL tokens (incl. stables).
 *
 * NFTs are excluded. An NFT is not a liquid asset, and leaving one here produced a row
 * reading "Current value could not be verified" — which says WealthSmith tried to price
 * something and failed, when it had correctly declined to price a non-fungible token.
 */
export function getLiquidPositions(positions: WalletPosition[]): WalletPosition[] {
  return positions.filter((p) => (p.type === "native" || p.type === "token") && !isLikelyNft(p));
}

/** Staked assets: recognized LSTs + native stake accounts. */
export function getStakedPositions(positions: WalletPosition[]): WalletPosition[] {
  return positions.filter((p) => p.type === "lst" || p.type === "stake");
}

/** Protocol positions (Kamino/Jito/Hubble/Meteora/Orca/Raydium/Ondo, etc.). */
export function getProtocolPositions(positions: WalletPosition[]): WalletPosition[] {
  return positions.filter((p) => p.type === "protocol");
}

export interface PositionCategories {
  native: WalletPosition[];
  /** Plain tokens that are neither recognized stablecoins nor unknown. */
  tokens: WalletPosition[];
  stables: WalletPosition[];
  unknown: WalletPosition[];
  lst: WalletPosition[];
  stake: WalletPosition[];
  protocol: WalletPosition[];
}

/** Split positions into mutually-exclusive display categories. */
export function groupPositionsByCategory(positions: WalletPosition[]): PositionCategories {
  return {
    native: positions.filter((p) => p.type === "native"),
    stables: positions.filter(isStablecoin),
    unknown: positions.filter((p) => p.name === "Unknown token"),
    tokens: positions.filter(
      (p) => p.type === "token" && !isStablecoin(p) && p.name !== "Unknown token"
    ),
    lst: positions.filter((p) => p.type === "lst"),
    stake: positions.filter((p) => p.type === "stake"),
    protocol: positions.filter((p) => p.type === "protocol"),
  };
}

export interface RealWalletSummary extends WalletSummary {
  stableCount: number;
  stakeCount: number;
  protocolCount: number;
  unknownCount: number;
  /** Non-zero categories for the Asset Mix card: [label, count]. */
  categories: Array<{ label: string; count: number }>;
}

/**
 * Dashboard summary — the safe counts + native SOL amount that populate the
 * real-wallet Financial Snapshot and Asset Mix cards. No USD/APY is derived.
 */
export function deriveRealWalletDashboardSummary(
  positions: WalletPosition[]
): RealWalletSummary {
  const base = deriveWalletSummary(positions);
  const g = groupPositionsByCategory(positions);
  const categories: Array<{ label: string; count: number }> = [
    { label: "Native SOL", count: g.native.length },
    { label: "Tokens", count: g.tokens.length },
    { label: "Stablecoins", count: g.stables.length },
    { label: "Staked (LST)", count: g.lst.length },
    { label: "Native stake", count: g.stake.length },
    { label: "Protocol positions", count: g.protocol.length },
    { label: "Unknown tokens", count: g.unknown.length },
  ].filter((c) => c.count > 0);

  return {
    ...base,
    stableCount: g.stables.length,
    stakeCount: g.stake.length,
    protocolCount: g.protocol.length,
    unknownCount: g.unknown.length,
    categories,
  };
}

/**
 * Portfolio summary — same category facts, exposed for the Portfolio Balance
 * Overview / Crypto Assets Allocation / Deployment sections. Identical shape to
 * the dashboard summary (kept as a distinct name for call-site clarity).
 */
export function deriveRealWalletPortfolioSummary(
  positions: WalletPosition[]
): RealWalletSummary {
  return deriveRealWalletDashboardSummary(positions);
}

/* ------------------------------------------------------------------ *
 * Value (USD) — populated ONLY from sourced prices (tokenPrices.ts).
 * Positions without a price keep valueUsd null and are excluded from the
 * total; they are never estimated or counted as zero.
 * ------------------------------------------------------------------ */

/** Format a USD amount, e.g. $1,234.56 (more decimals for sub-$1 prices). */
export function formatUsd(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Math.abs(n) < 1 ? 6 : 2,
  });
}

export interface ValueBreakdown {
  /** Sum of priced positions' USD value; null when nothing is priced. */
  totalUsd: number | null;
  /** True when at least one detected holding has no sourced price (shown as "—"). */
  anyUnpriced: boolean;
  /** Value-based allocation over priced positions (non-zero categories only). */
  byCategory: Array<{ label: string; valueUsd: number; pct: number }>;
}

/** Derive the value total + value-based category allocation from sourced prices. */
export function deriveValueBreakdown(positions: WalletPosition[]): ValueBreakdown {
  const val = (p: WalletPosition) => (typeof p.valueUsd === "number" ? p.valueUsd : 0);
  const priced = positions.filter((p) => typeof p.valueUsd === "number");
  const totalUsd = priced.length > 0 ? priced.reduce((s, p) => s + (p.valueUsd as number), 0) : null;
  const g = groupPositionsByCategory(positions);
  const cats: Array<[string, WalletPosition[]]> = [
    ["Native SOL", g.native],
    ["Tokens", g.tokens],
    ["Stablecoins", g.stables],
    ["Staked (LST)", g.lst],
    ["Native stake", g.stake],
    ["Protocol positions", g.protocol],
    ["Unknown tokens", g.unknown],
  ];
  const byCategory =
    totalUsd && totalUsd > 0
      ? cats
          .map(([label, arr]) => {
            const v = arr.reduce((s, p) => s + val(p), 0);
            return { label, valueUsd: v, pct: (v / totalUsd) * 100 };
          })
          .filter((c) => c.valueUsd > 0)
      : [];
  // "Unpriced" = a real holding (has an amount) with no sourced value.
  const anyUnpriced = positions.some((p) => typeof p.uiAmount === "number" && p.valueUsd == null);
  return { totalUsd, anyUnpriced, byCategory };
}

/**
 * Value-weighted 24h price change (percent) across the portfolio's priced
 * positions, using only each position's SOURCED `change24hPct` (Jupiter — never
 * invented). A position with no sourced change is excluded from both the weighted
 * sum and its weight, so the result reflects only the value that has a real
 * figure. Returns null when nothing has a sourced change (the badge then hides).
 * Stablecoins legitimately contribute a ~0% change and hold the average down.
 */
export function derivePortfolioDayChangePct(positions: WalletPosition[]): number | null {
  let weighted = 0;
  let weight = 0;
  for (const p of positions) {
    if (typeof p.valueUsd !== "number" || p.valueUsd <= 0) continue;
    if (typeof p.change24hPct !== "number") continue;
    weighted += p.valueUsd * p.change24hPct;
    weight += p.valueUsd;
  }
  if (weight <= 0) return null;
  return weighted / weight;
}

/* ------------------------------------------------------------------ *
 * Safety Buffer — a cautious stablecoin reserve view. Counts ONLY
 * recognized stablecoins the wallet holds PLUS stablecoin-denominated
 * protocol positions (e.g. USDC supplied to a Kamino vault). Volatile
 * assets are never counted. Requires sourced prices + a monthly-expenses
 * input; otherwise it stays unavailable (never fixture $800/$3,000).
 * ------------------------------------------------------------------ */

/** True when a mint is a recognized stablecoin (registry symbol in STABLE_SYMBOLS). */
function isStableMint(mint: string): boolean {
  const sym = lookupMint(mint)?.symbol;
  return sym != null && STABLE_SYMBOLS.has(sym);
}

/**
 * A position's stablecoin USD value, or 0 if it isn't a pure stablecoin holding:
 *  - a recognized wallet stablecoin (USDC/USDT/USDH/DAI), or
 *  - a protocol position whose legs are ALL recognized stablecoins with no debt
 *    (e.g. USDC supplied to Kamino). An LP pair with a volatile leg does NOT count.
 * Only counts when a sourced valueUsd exists.
 */
function stableValueOf(p: WalletPosition): number {
  if (typeof p.valueUsd !== "number") return 0;
  if (isStablecoin(p)) return p.valueUsd;
  // A borrowed balance is a liability, never stable ASSET value.
  if (p.side === "borrowed") return 0;
  if (p.type === "protocol") {
    /**
     * Denominated in a recognized stable mint — e.g. USDC supplied to a lending
     * market. The canonical existing-position rows (Kamino Direct, Steakhouse)
     * carry the underlying mint but NO `legs`, so the leg test below missed them
     * and their whole balance fell through to crypto: a wallet holding $15k of
     * lent USDC read as 100% crypto / $0 stables on the allocation card.
     *
     * `isStablecoin` cannot cover this because it requires `type === "token"`.
     * Rebalance already classifies these correctly via its own `isStableAsset`;
     * this keeps the portfolio-wide split in agreement with it.
     */
    if (typeof p.mint === "string" && isStableMint(p.mint)) return p.valueUsd;
    if (p.legs && p.legs.length > 0 && p.legs.every((l) => l.side !== "debt" && isStableMint(l.mint))) {
      return p.valueUsd;
    }
  }
  return 0;
}

/** Total sourced USD across stablecoin holdings (wallet + supplied USDC, etc.). */
export function deriveStableValue(positions: WalletPosition[]): number {
  return positions.reduce((s, p) => s + stableValueOf(p), 0);
}

import { computeSafetyBufferCoverage, type SafetyBufferCoverageState, type SafetyBufferCoverage } from "./safetyBufferCoverage";

export interface SafetyBuffer {
  /**
   * Step 17B — the AUTHORITATIVE reserve value is now VERIFIED IMMEDIATELY-WITHDRAWABLE stable value
   * (not recognized value). `stableUsd` mirrors `verifiedLiquidStableUsd` so every existing consumer of
   * `stableUsd`/`fullyFunded` uses verified-liquid coverage with no change.
   */
  stableUsd: number;
  /** Target reserve = monthlyExpenses × targetMonths. */
  targetUsd: number;
  targetMonths: number;
  /** Coverage %, capped at 100 for the bar (over verified-liquid value). */
  coveragePct: number;
  /** Months of expenses covered by the reserve (uncapped, verified-liquid). */
  monthsCovered: number;
  /** True ONLY when coverageState === "complete" (verified liquid ≥ target). */
  fullyFunded: boolean;
  /** Step 17B — verified-liquid coverage breakdown (visible for explanation; drives completion).
   *  Optional so existing SafetyBuffer literals stay valid; deriveSafetyBuffer always populates them. */
  recognizedStableUsd?: number;
  verifiedLiquidStableUsd?: number;
  delayedStableUsd?: number;
  unavailableStableUsd?: number;
  unresolvedStableUsd?: number;
  coverageState?: SafetyBufferCoverageState;
  unresolvedReasons?: string[];
}

/**
 * Derive the Safety Buffer from the stablecoin reserve and monthly expenses.
 * `targetMonths` is the APPROVED risk-based target from
 * getSafetyBufferTargetMonths (safetyBufferTarget.ts) — there is deliberately
 * NO default: a missing risk level must surface as the unavailable state,
 * never as a silent 3-month assumption. Returns null when expenses or the
 * target aren't known (caller also gates on prices being loaded, so a 0
 * reserve means genuinely no stablecoins — not "not priced").
 */
export function deriveSafetyBuffer(
  positions: WalletPosition[],
  monthlyExpenses: number | undefined,
  targetMonths: number | null,
  /**
   * Step 21C — the ALREADY-computed canonical coverage for this refresh. When supplied, it is reused verbatim
   * (single source of truth; no second `computeSafetyBufferCoverage` call, no second position reclassification).
   * It MUST have been computed against the same `targetUsd`. Omit only in isolated callers/tests.
   */
  sharedCoverage?: SafetyBufferCoverage
): SafetyBuffer | null {
  if (!(typeof monthlyExpenses === "number" && monthlyExpenses > 0)) return null;
  if (!(typeof targetMonths === "number" && targetMonths > 0)) return null;
  const targetUsd = monthlyExpenses * targetMonths;
  // Step 17B — completion is driven by VERIFIED IMMEDIATELY-WITHDRAWABLE value, not recognized value.
  const coverage = sharedCoverage ?? computeSafetyBufferCoverage(positions, targetUsd);
  const stableUsd = coverage.verifiedLiquidStableValueUsd; // authoritative reserve value
  const coveragePct = targetUsd > 0 ? Math.min(100, (stableUsd / targetUsd) * 100) : 0;
  const monthsCovered = stableUsd / monthlyExpenses;
  return {
    stableUsd,
    targetUsd,
    targetMonths,
    coveragePct,
    monthsCovered,
    fullyFunded: coverage.fullyFunded, // === "complete" only
    recognizedStableUsd: coverage.recognizedStableValueUsd,
    verifiedLiquidStableUsd: coverage.verifiedLiquidStableValueUsd,
    delayedStableUsd: coverage.delayedStableValueUsd,
    unavailableStableUsd: coverage.unavailableStableValueUsd,
    unresolvedStableUsd: coverage.unresolvedStableValueUsd,
    coverageState: coverage.coverageState,
    unresolvedReasons: coverage.unresolvedReasons,
  };
}
