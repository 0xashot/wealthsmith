/**
 * klendDirectUsdcExistingPosition — Step 17A. The PURE normalization layer that turns a real wallet's
 * exact Kamino Direct cToken accounts + a live reserve snapshot into ONE normalized existing-position
 * record with SEPARATE recognized and currently-liquid values. It reuses the already-built deployed-
 * program methodology — `deriveKlendDirectLendingPosition` (discovery + recognized underlying) and
 * `evaluateWithdrawalAccessibility` (liquid underlying + withdrawal state) — and rewrites neither.
 *
 * PURE + FAIL-CLOSED. No network I/O (the mounted hook fetches; this calculates). Exact cToken-mint
 * matching only — never symbol/name/label. USD is computed only from a FRESH exact-mint USDC price;
 * when price is stale/absent the token-unit position stays visible with null USD (never zero, never
 * removed). Recognized ≠ liquid: liquid never exceeds recognized and collapses to unavailable when
 * withdrawal access is stale/unresolved/emergency. This task does NOT change the Safety Buffer (17B).
 */
import {
  deriveKlendDirectLendingPosition,
  POSITION_IDENTITY,
  type WalletTokenAccountInput,
  type PositionInputs,
} from "./klendDirectLendingPosition";
import {
  evaluateWithdrawalAccessibility,
  type WithdrawalAvailabilityState,
} from "./klendReserveAvailability";

export const KLEND_DIRECT_POSITION_NORMALIZATION_VERSION = "1.0.0" as const;
export const KLEND_DIRECT_CANDIDATE_ID = "kamino_usdc_lending" as const;

/** Canonical economic-position dedup key — bound to the economic position, NOT a display label. */
export const KLEND_DIRECT_POSITION_DEDUPE_KEY = `klend_direct:${POSITION_IDENTITY.reserveAddress}:${POSITION_IDENTITY.cTokenMint}` as const;

/* The exact reserve snapshot the redemption + accessibility math require (from ONE live read).
 * Every liquidity-affecting field is `string | null`: null = UNRESOLVED (missing / unsupported /
 * decode error / stale). Unknown is NEVER coerced to zero — only an EXPLICITLY decoded zero is "0". */
export interface KlendDirectReserveSnapshot {
  estimatedTotalSupplySf: string | null;
  collateralMintTotalSupplyRaw: string | null;
  totalAvailableLiquidityRaw: string | null;
  /** null = queued-liquidity value could not be established (NOT zero). */
  queuedLiquidityRaw: string | null;
  reserveStatus: number;
  reserveVersion: number;
  reserveEmergencyMode: number;
  marketEmergencyMode: number;
  reserveSourceSlot: number;
  marketSourceSlot: number;
  cTokenMintSourceSlot: number;
}

export interface KlendDirectExistingPositionInput {
  accounts: WalletTokenAccountInput[];
  walletAddress: string;
  walletSourceSlot: number;
  /** null = reserve enrichment failed entirely; the confirmed cToken holding stays visible/unresolved. */
  reserve: KlendDirectReserveSnapshot | null;
  /** Fresh exact-mint USDC price; usdcPriceUsd is used ONLY when fresh (no permanent $1 assumption). */
  price: { usdcPriceUsd: number | null; fresh: boolean };
  apy: { valuePct: number | null; fresh: boolean; rateKind: "estimated_variable_apy" };
  observedAt: string;
  nowMs: number;
}

/** User-facing withdrawal state (mapped from the deployed-program availability state). */
export type PositionWithdrawalState =
  | "fully_withdrawable" | "partially_withdrawable" | "currently_unavailable"
  | "emergency_paused" | "stale" | "unresolved";

export interface KlendDirectExistingPositionResult {
  positionExists: boolean;
  candidateId: string;
  dedupeKey: string;
  marketAddress: string;
  reserveAddress: string;
  liquidityMint: string;
  cTokenMint: string;
  walletAddress: string;
  /** Enrichment status: full valuation / recognized only (withdrawal unresolved) / fully unresolved. */
  enrichmentState: "complete" | "recognized_only" | "unresolved";
  // Token-unit fields (exact integer arithmetic). null = UNRESOLVED (never coerced to zero).
  cTokenBalanceRaw: string;
  recognizedUnderlyingRaw: string | null;
  currentlyLiquidUnderlyingRaw: string | null;
  delayedOrUnavailableUnderlyingRaw: string | null;
  recognizedUnderlyingTokenAmount: number | null;
  currentlyLiquidUnderlyingTokenAmount: number | null;
  // USD (fresh price only).
  recognizedValueUsd: number | null;
  liquidValueUsd: number | null;
  apyPct: number | null;
  rateKind: "estimated_variable_apy";
  // State + provenance.
  withdrawalState: PositionWithdrawalState;
  freshnessState: "fresh" | "stale" | "unresolved";
  unresolvedReason: string | null;
  observedAt: string;
  sourceSlots: { wallet: number; reserve: number; market: number; cTokenMint: number };
}

function stateFromAvailability(s: WithdrawalAvailabilityState, positionExists: boolean): PositionWithdrawalState {
  if (!positionExists) return "unresolved";
  switch (s) {
    case "fully_available": return "fully_withdrawable";
    case "partially_available": return "partially_withdrawable";
    case "unavailable": return "currently_unavailable";
    case "paused": return "emergency_paused";
    case "stale": return "stale";
    default: return "unresolved";
  }
}

const AVAIL_IDENTITY = {
  candidateId: KLEND_DIRECT_CANDIDATE_ID,
  marketAddress: POSITION_IDENTITY.marketAddress,
  reserveAddress: POSITION_IDENTITY.reserveAddress,
  liquidityMint: POSITION_IDENTITY.liquidityMint,
  cTokenMint: POSITION_IDENTITY.cTokenMint,
  klendProgram: POSITION_IDENTITY.klendProgram,
  cluster: POSITION_IDENTITY.cluster,
  assetDecimals: POSITION_IDENTITY.liquidityDecimals,
  tokenProgram: POSITION_IDENTITY.tokenProgram,
} as const;

function tokens(raw: bigint, decimals: number): number {
  const scale = 10n ** BigInt(decimals);
  return Number(raw / scale) + Number(raw % scale) / Number(scale);
}

/** Build the single normalized existing-position record. Pure; reuses the deployed-program methodology. */
export function buildKlendDirectUsdcExistingPosition(input: KlendDirectExistingPositionInput): KlendDirectExistingPositionResult {
  const r = input.reserve; // null = enrichment failed entirely
  const base = {
    candidateId: KLEND_DIRECT_CANDIDATE_ID,
    dedupeKey: KLEND_DIRECT_POSITION_DEDUPE_KEY,
    marketAddress: POSITION_IDENTITY.marketAddress,
    reserveAddress: POSITION_IDENTITY.reserveAddress,
    liquidityMint: POSITION_IDENTITY.liquidityMint,
    cTokenMint: POSITION_IDENTITY.cTokenMint,
    walletAddress: input.walletAddress,
    rateKind: "estimated_variable_apy" as const,
    observedAt: input.observedAt,
    sourceSlots: { wallet: input.walletSourceSlot, reserve: r?.reserveSourceSlot ?? input.walletSourceSlot, market: r?.marketSourceSlot ?? input.walletSourceSlot, cTokenMint: r?.cTokenMintSourceSlot ?? input.walletSourceSlot },
  };

  // 1. Discovery + recognized (deployed-program redemption math) — never rewritten. Supply inputs are
  // passed through only when present; null (enrichment failed) becomes undefined → recognized unresolved.
  const posInputs: PositionInputs = {
    identity: {
      candidateId: KLEND_DIRECT_CANDIDATE_ID,
      marketAddress: POSITION_IDENTITY.marketAddress,
      reserveAddress: POSITION_IDENTITY.reserveAddress,
      liquidityMint: POSITION_IDENTITY.liquidityMint,
      cTokenMint: POSITION_IDENTITY.cTokenMint,
      klendProgram: POSITION_IDENTITY.klendProgram,
      cluster: POSITION_IDENTITY.cluster,
      cTokenDecimals: POSITION_IDENTITY.cTokenDecimals,
      tokenProgram: POSITION_IDENTITY.tokenProgram,
    },
    walletAddress: input.walletAddress,
    accounts: input.accounts,
    estimatedTotalSupplySf: r?.estimatedTotalSupplySf ?? undefined,
    collateralMintTotalSupplyRaw: r?.collateralMintTotalSupplyRaw ?? undefined,
    walletSourceSlot: input.walletSourceSlot,
    reserveSourceSlot: r?.reserveSourceSlot ?? input.walletSourceSlot,
    cTokenMintSourceSlot: r?.cTokenMintSourceSlot ?? input.walletSourceSlot,
    observedAt: input.observedAt,
    nowMs: input.nowMs,
  };
  const recognized = deriveKlendDirectLendingPosition(posInputs);
  const cTokenBalanceRaw = recognized.cTokenBalanceRaw ?? "0";

  // No cTokens → a verified "no position" (not a failure).
  if (recognized.ok && recognized.positionExists === false) {
    return {
      ...base, positionExists: false, enrichmentState: "complete",
      cTokenBalanceRaw: "0", recognizedUnderlyingRaw: "0", currentlyLiquidUnderlyingRaw: "0", delayedOrUnavailableUnderlyingRaw: "0",
      recognizedUnderlyingTokenAmount: 0, currentlyLiquidUnderlyingTokenAmount: 0,
      recognizedValueUsd: null, liquidValueUsd: null, apyPct: null,
      withdrawalState: "unresolved", freshnessState: "fresh", unresolvedReason: null,
    };
  }

  // From here a REAL position is confirmed (non-zero exact cToken). It stays VISIBLE regardless of
  // whether recognized/liquid can be established.
  const recognizedResolved = recognized.ok && recognized.positionExists && recognized.underlyingUsdcRaw !== undefined;
  const recognizedUnderlyingRaw = recognizedResolved ? recognized.underlyingUsdcRaw! : null;
  const dec = POSITION_IDENTITY.liquidityDecimals;
  const recognizedBig = recognizedResolved ? BigInt(recognizedUnderlyingRaw!) : null;
  const recognizedTokens = recognizedBig != null ? tokens(recognizedBig, dec) : null;

  const priceOk = input.price.fresh && typeof input.price.usdcPriceUsd === "number" && input.price.usdcPriceUsd > 0;
  const recognizedValueUsd = priceOk && recognizedTokens != null ? recognizedTokens * (input.price.usdcPriceUsd as number) : null;

  // 2. Liquid (deployed-program withdrawal accessibility). It is UNRESOLVED — never zero — unless every
  // required withdrawal input is present: recognized resolved, a live reserve, an explicitly decoded
  // (non-null) queued liquidity, and a non-null total available liquidity. Unknown queue ⇒ unresolved.
  const liquidInputsPresent = recognizedResolved && r != null && r.queuedLiquidityRaw !== null && r.totalAvailableLiquidityRaw !== null;

  let currentlyLiquidUnderlyingRaw: string | null = null;
  let liquidTokens: number | null = null;
  let liquidValueUsd: number | null = null;
  let delayedRaw: string | null = null;
  let withdrawalState: PositionWithdrawalState;
  let unresolvedReason: string | null;

  if (!recognizedResolved) {
    withdrawalState = "unresolved";
    unresolvedReason = recognized.invalidationReason ?? (r == null ? "reserve enrichment unavailable" : "recognized underlying unresolved");
  } else if (!liquidInputsPresent) {
    // Recognized is known, but withdrawal inputs (notably queued liquidity) are unresolved → NO verified liquid.
    withdrawalState = r != null && r.reserveEmergencyMode !== 0 ? "emergency_paused" : "unresolved";
    unresolvedReason = "withdrawal inputs unresolved (queued/available liquidity not established) — no verified immediate liquidity";
  } else {
    const access = evaluateWithdrawalAccessibility({
      identity: AVAIL_IDENTITY,
      walletCTokenBalanceRaw: cTokenBalanceRaw,
      totalSupplySf: r!.estimatedTotalSupplySf ?? undefined,
      collateralMintTotalSupplyRaw: r!.collateralMintTotalSupplyRaw ?? undefined,
      totalAvailableLiquidityRaw: r!.totalAvailableLiquidityRaw ?? undefined,
      queuedLiquidityRaw: r!.queuedLiquidityRaw as string,
      reserveEmergencyMode: r!.reserveEmergencyMode,
      marketEmergencyMode: r!.marketEmergencyMode,
      reserveVersion: r!.reserveVersion,
      walletSourceSlot: input.walletSourceSlot,
      reserveSourceSlot: r!.reserveSourceSlot,
      marketSourceSlot: r!.marketSourceSlot,
      observedAt: input.observedAt,
      nowMs: input.nowMs,
    });
    withdrawalState = stateFromAvailability(access.withdrawalAvailabilityState, true);
    if (withdrawalState === "stale" || withdrawalState === "unresolved" || withdrawalState === "emergency_paused") {
      // No verified immediate liquidity — never estimate positive.
      unresolvedReason = access.blockingReasons[0] ?? "withdrawal accessibility unresolved";
    } else {
      const liquidBig0 = (() => { try { return BigInt(access.immediatelyWithdrawableUnderlyingRaw ?? "0"); } catch { return 0n; } })();
      const liquidBig = recognizedBig != null && liquidBig0 > recognizedBig ? recognizedBig : liquidBig0; // never exceeds recognized
      currentlyLiquidUnderlyingRaw = liquidBig.toString();
      liquidTokens = tokens(liquidBig, dec);
      liquidValueUsd = priceOk ? liquidTokens * (input.price.usdcPriceUsd as number) : null;
      delayedRaw = (recognizedBig! - liquidBig).toString();
      unresolvedReason = null;
    }
  }

  const enrichmentState: KlendDirectExistingPositionResult["enrichmentState"] =
    !recognizedResolved ? "unresolved" : currentlyLiquidUnderlyingRaw != null ? "complete" : "recognized_only";
  const freshnessState: KlendDirectExistingPositionResult["freshnessState"] =
    !recognizedResolved ? "unresolved" : recognized.freshnessState === "stale" || withdrawalState === "stale" ? "stale" : "fresh";

  return {
    ...base,
    positionExists: true,
    enrichmentState,
    cTokenBalanceRaw,
    recognizedUnderlyingRaw,
    currentlyLiquidUnderlyingRaw,
    delayedOrUnavailableUnderlyingRaw: delayedRaw,
    recognizedUnderlyingTokenAmount: recognizedTokens,
    currentlyLiquidUnderlyingTokenAmount: liquidTokens,
    recognizedValueUsd,
    liquidValueUsd,
    apyPct: input.apy.fresh ? input.apy.valuePct : null,
    rateKind: "estimated_variable_apy",
    withdrawalState,
    freshnessState,
    unresolvedReason,
  };
}

/* ------------------------------------------------------------------ *
 * User-facing withdrawal copy (existing content conventions; no execution).
 * ------------------------------------------------------------------ */
export const WITHDRAWAL_STATE_COPY: Record<PositionWithdrawalState, string> = {
  fully_withdrawable: "Currently withdrawable",
  partially_withdrawable: "Part of this position is currently withdrawable",
  currently_unavailable: "Withdrawals are currently unavailable",
  emergency_paused: "Withdrawals are currently unavailable",
  stale: "Withdrawal availability could not be refreshed",
  unresolved: "Withdrawal availability could not be refreshed",
};

/* ------------------------------------------------------------------ *
 * Normalization into the canonical WalletPosition + deduplication (pure).
 * ------------------------------------------------------------------ */
import { lookupMint, type WalletPosition } from "../wallet/walletPosition";

export const KLEND_DIRECT_POSITION_ID = `klend-direct-${POSITION_IDENTITY.reserveAddress}` as const;

/** Map the normalized result → one canonical WalletPosition. Recognized value fills `valueUsd`
 *  (portfolio total); liquid value is carried separately and NEVER auto-counts as Safety Buffer. */
export function toWalletPosition(r: KlendDirectExistingPositionResult): WalletPosition | null {
  if (!r.positionExists) return null;
  const resolved = r.recognizedUnderlyingRaw !== null;
  // Resolved → show underlying USDC (priced by the exact-mint path). Unresolved → keep the CONFIRMED
  // exact cToken raw balance visible (underlying unknown, never fabricated), mint = cToken so no price
  // is applied and it never double-counts.
  const cTokenTokens = (() => { try { const raw = BigInt(r.cTokenBalanceRaw); const s = 10n ** BigInt(POSITION_IDENTITY.cTokenDecimals); return Number(raw / s) + Number(raw % s) / Number(s); } catch { return undefined; } })();
  return {
    id: KLEND_DIRECT_POSITION_ID,
    source: "kamino",
    type: "protocol",
    symbol: "USDC",
    name: "Kamino Direct USDC",
    mint: resolved ? r.liquidityMint : r.cTokenMint,
    amount: resolved ? (r.recognizedUnderlyingRaw as string) : r.cTokenBalanceRaw,
    uiAmount: resolved ? (r.recognizedUnderlyingTokenAmount as number) : cTokenTokens,
    decimals: resolved ? POSITION_IDENTITY.liquidityDecimals : POSITION_IDENTITY.cTokenDecimals,
    protocol: "Kamino",
    // Always the USDC icon from the approved mint registry: the asset IS USDC even
    // in the unresolved branch, where `mint` is the cToken and would otherwise fall
    // back to the generic token glyph. The raw obligation row this replaces carried
    // it, so omitting it here silently downgraded the row's icon.
    icon: lookupMint(POSITION_IDENTITY.liquidityMint)?.icon,
    // The economic exposure as `legs`, like every other protocol row. The raw
    // obligation row this replaces carried legs, and each field this canonical row
    // dropped relative to it became its own production bug (value → APY → icon →
    // stable classification); legs is the last of them. RESOLVED ONLY: the leg is
    // the redeemed underlying amount, so consumers that value or classify by legs
    // (pricing pass, stable split) agree with `valueUsd` by construction. In the
    // unresolved branch the underlying amount is unknown — emitting a cToken leg
    // would invite a wrong price, so there are deliberately no legs there.
    ...(resolved && typeof r.recognizedUnderlyingTokenAmount === "number"
      ? { legs: [{ mint: r.liquidityMint, uiAmount: r.recognizedUnderlyingTokenAmount, side: "long" as const }] }
      : {}),
    detection: "protocol_api",
    side: "supplied",
    apy: r.apyPct,
    valueUsd: r.recognizedValueUsd,   // recognized USD when priced; null when unresolved/stale
    recognizedValueUsd: r.recognizedValueUsd,
    liquidValueUsd: r.liquidValueUsd, // null unless verified immediate liquidity was established
    withdrawalState: r.withdrawalState,
    existingPositionOnly: true,       // visible for holders; not a new-capital suggestion source
    dedupeKey: r.dedupeKey,
    candidateId: r.candidateId,
  };
}

/**
 * Remove any row that double-counts the same economic position: the API obligation row for the EXACT
 * approved reserve, and any generic cToken token row (exact cToken mint). Unrelated Kamino obligations
 * and all other positions are preserved untouched.
 */
export function dedupeKlendDirectPosition(positions: WalletPosition[]): WalletPosition[] {
  return positions.filter((p) => {
    if (p.id === KLEND_DIRECT_POSITION_ID) return true; // never remove the canonical row itself
    // Generic held cToken row (would otherwise appear as an "Unknown token").
    if (p.mint === POSITION_IDENTITY.cTokenMint) return false;
    // The API obligation row for the exact approved reserve (fetchKaminoPositions id `kamino-<side>-<reserve>`).
    if (p.source === "kamino" && p.detection === "protocol_api" && typeof p.id === "string" && p.id.includes(POSITION_IDENTITY.reserveAddress)) return false;
    return true;
  });
}

/**
 * PURE: synthesize the wallet's cToken input from OBLIGATION-held collateral.
 *
 * A deposit made through Kamino's own app leaves no cTokens in the wallet — the
 * obligation holds them — so the direct token-account scan finds nothing and the
 * whole 17A methodology used to be skipped (surfacing "Verify Your Safety
 * Buffer" for a fully vetted deposit). The obligation reports that same balance
 * for the same reserve; this converts it into the exact account shape the
 * discovery validator already checks (identity, token program, decimals).
 *
 * ONLY the approved reserve is promoted: any other market or reserve returns
 * null and stays exactly as detected — not vetted, not counted.
 */
export function obligationCTokenAccount(
  collateralRawByReserve: Record<string, string>,
  ownerB58: string
): WalletTokenAccountInput | null {
  const raw = collateralRawByReserve[POSITION_IDENTITY.reserveAddress];
  if (!raw || raw === "0") return null;
  return {
    address: `klend-obligation-${POSITION_IDENTITY.reserveAddress}`,
    mint: POSITION_IDENTITY.cTokenMint,
    tokenProgram: POSITION_IDENTITY.tokenProgram,
    amountRaw: raw,
    decimals: POSITION_IDENTITY.cTokenDecimals,
    owner: ownerB58,
  };
}

/** Merge the rich position into the wallet set: dedupe conflicting rows, then append exactly one row. */
export function mergeKlendDirectPosition(positions: WalletPosition[], r: KlendDirectExistingPositionResult): WalletPosition[] {
  const deduped = dedupeKlendDirectPosition(positions);
  const rich = toWalletPosition(r);
  return rich ? [...deduped, rich] : deduped;
}
