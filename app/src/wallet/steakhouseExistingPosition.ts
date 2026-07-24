/**
 * steakhouseExistingPosition — Step 17C. PURE normalization for an existing Steakhouse USDC Vault
 * position: separates share OWNERSHIP, the RECOGNIZED underlying USDC claim (shares × tokensPerShare,
 * the deployed-program KVault rate — computed by the mount, never a share market price), and the
 * VERIFIED IMMEDIATELY-WITHDRAWABLE amount (bounded by the SDK's getMaxInstantWithdrawableAmount, i.e.
 * the vault's idle USDC plus each reserve's actual available liquidity capped by the vault's claim).
 *
 * FAIL-CLOSED. A user's verified liquid = min(recognized claim, vault max-instant-withdrawable). It is
 * UNRESOLVED — never zero-as-fact, never a positive estimate — when the vault max-instant value could
 * not be established (a missing/stale underlying reserve, missing queue/rolling-limit data, or an SDK
 * failure), when the vault or a reserve is paused/emergency, or when vault state is stale. Recognized
 * value stays visible when only liquidity is unresolved; share ownership stays visible when recognition
 * is unresolved. Steakhouse remains existing-position-only and never a suggestion candidate.
 */
import type { WalletPosition } from "./walletPosition";

export const STEAKHOUSE_POSITION_VERSION = "1.0.0" as const;
export const STEAKHOUSE_CANDIDATE_ID = "kamino_steakhouse_usdc" as const;

export const STEAKHOUSE_IDENTITY = {
  candidateId: STEAKHOUSE_CANDIDATE_ID,
  vaultAddress: "HDsayqAsDWy3QvANGqh2yNraqcD8Fnjgh73Mhb3WRS5E",
  shareMint: "7D8C5pDFxug58L9zkwK7bCiDg4kD4AygzbcZUmf5usHS",
  usdcMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  kvaultProgram: "KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd",
  cluster: "mainnet-beta",
  usdcDecimals: 6,
} as const;

/** Canonical economic-position dedup key — bound to vault + share + underlying, NOT a display label. */
export const STEAKHOUSE_POSITION_DEDUPE_KEY = `steakhouse:${STEAKHOUSE_IDENTITY.vaultAddress}:${STEAKHOUSE_IDENTITY.shareMint}:${STEAKHOUSE_IDENTITY.usdcMint}` as const;
export const STEAKHOUSE_POSITION_ID = `kamino-vault-${STEAKHOUSE_IDENTITY.vaultAddress}` as const;

export type SteakhouseWithdrawalState =
  | "fully_withdrawable" | "partially_withdrawable" | "currently_unavailable"
  | "paused" | "emergency_paused" | "stale" | "unresolved";

/** Step 17C.1 — explicit gate states (no hardcoded booleans). */
export type VaultWithdrawalGate = "permitted" | "paused" | "stale" | "unresolved";
export type ReserveWithdrawalGate = "permitted" | "emergency_paused" | "withdrawal_blocked" | "stale" | "unresolved";

export interface SteakhousePositionInput {
  /** Total exact share raw units (wallet-held + farm-staked, aggregated — never double counted). */
  totalShareRaw: string;
  /** Recognized underlying USDC raw (shares × deployed tokensPerShare), or null when unresolved. */
  recognizedUnderlyingRaw: string | null;
  /** SDK getMaxInstantWithdrawableAmount for the vault, in USDC base units, or null = UNRESOLVED. */
  vaultMaxInstantWithdrawableRaw: string | null;
  /**
   * Step 17C.1 — explicit gates. `getMaxInstantWithdrawableAmount` does NOT check vault pause (the
   * KVault program has no pause field — `permitted` is proven, not assumed) or underlying-reserve
   * status/emergency (it only sums freely-available liquidity), so those gates are decoded separately.
   * Any blocking or unresolved gate → no positive verified liquid. Unknown is NEVER treated as false.
   */
  vaultGate: VaultWithdrawalGate;
  reserveGate: ReserveWithdrawalGate;
  vaultFresh: boolean;
  /** Fresh exact-mint USDC price; used only when fresh (no permanent $1). */
  price: { usdcPriceUsd: number | null; fresh: boolean };
  apy: { valuePct: number | null; fresh: boolean };
  observedAt: string;
  sourceSlot: number;
  perReserveBreakdown?: SteakhouseReserveEntry[];
  unresolvedReasons?: string[];
}

export interface SteakhouseReserveEntry {
  reserveAddress: string;
  vaultClaimRaw: string | null;
  currentlyRedeemableRaw: string | null;
  limitingCondition: string;
  emergencyState: string;
  freshness: "fresh" | "stale" | "unresolved";
  sourceSlot: number;
  /**
   * Step 17C.2 — explicit per-gate evidence for the block_ctoken_usage decision (all optional and
   * back-compatible). `blockCtokenApplicable` is source-backed: the KVault `withdraw` instruction's
   * `withdrawFromReserveAccounts` context redeems the reserve's cTokens (accounts: reserve, ctokenVault,
   * reserveCollateralMint, reserveLiquiditySupply, klendProgram) to source underlying beyond idle, so the
   * flag is treated as APPLICABLE to every material reserve — never inferred away. `blockCtokenValue` is
   * decoded from `reserve.state.config.blockCtokenUsage` (u8): non-zero ⇒ enabled ⇒ combinedGate
   * `withdrawal_blocked`; missing ⇒ unresolved. Idle liquidity is NOT decomposed here (fail-closed).
   */
  reserveStatus?: string;         // "active" | "obsolete" | "hidden" | "unresolved"
  reserveEmergency?: string;      // "off" | "on" | "unresolved"
  marketEmergency?: string;       // "off" | "on" | "unresolved"
  blockCtokenApplicable?: string; // "applicable" | "not_applicable" | "unresolved"
  blockCtokenValue?: string;      // "disabled" | "enabled" | "unresolved"
  combinedGate?: ReserveWithdrawalGate;
}

export interface SteakhousePositionResult {
  positionExists: boolean;
  candidateId: string;
  dedupeKey: string;
  enrichmentState: "complete" | "recognized_only" | "unresolved";
  totalShareRaw: string;
  recognizedUnderlyingRaw: string | null;
  currentlyLiquidUnderlyingRaw: string | null;
  delayedUnderlyingRaw: string | null;
  unavailableUnderlyingRaw: string | null;
  unresolvedUnderlyingRaw: string | null;
  recognizedUnderlyingAmount: number | null;
  currentlyLiquidUnderlyingAmount: number | null;
  recognizedValueUsd: number | null;
  liquidValueUsd: number | null;
  apyPct: number | null;
  withdrawalState: SteakhouseWithdrawalState;
  freshness: "fresh" | "stale" | "unresolved";
  vaultIdleLiquidityRaw: string | null;
  perReserveBreakdown: SteakhouseReserveEntry[];
  unresolvedReasons: string[];
  observedAt: string;
  sourceSlot: number;
}

/**
 * Step 17C.2 — raw per-material-reserve inputs for the fail-closed combined reserve gate. Each field is
 * decoded from deployed KLend reserve config / a resolved lending-market emergency read by the mount; a
 * missing value is passed as null and NEVER coerced to a permissive default.
 */
export interface ReserveGateInput {
  reserveAddress: string;
  /** cToken allocation — a reserve is MATERIAL (must be redeemed on withdrawal) only when > 0. */
  ctokenAllocation: string | number | null;
  status: number | null;         // KLend ReserveConfig.status (u8): 0 = Active
  emergencyMode: number | null;  // KLend ReserveConfig.emergencyMode (u8): 0 = off
  blockCtokenUsage: number | null; // KLend ReserveConfig.blockCtokenUsage (u8): non-zero = cToken use blocked
  lendingMarket: string | null;
  marketEmergency: boolean | null; // resolved LendingMarket.emergencyMode for this reserve's market
  sourceSlot: number;
  fresh: boolean;
}

/**
 * Pure, deterministic derivation of the combined reserve withdrawal gate + per-reserve evidence.
 *
 * block_ctoken_usage is treated as APPLICABLE to every material reserve: the KVault `withdraw`
 * instruction's `withdrawFromReserveAccounts` context redeems the reserve's cTokens (accounts: reserve,
 * ctokenVault, reserveCollateralMint, reserveLiquiditySupply, klendProgram) to source underlying beyond
 * idle, and the client SDK cannot prove the on-chain redemption CPI ignores the flag — so an enabled flag
 * blocks that reserve. Per-reserve precedence (fail-closed): missing status/emergency → unresolved;
 * status≠Active or emergency on → emergency_paused; missing block flag → unresolved; block flag enabled →
 * withdrawal_blocked; missing market or market emergency → unresolved / emergency_paused; else permitted.
 * The combined gate is the FIRST non-permitted material reserve in iteration order (whole-position fail
 * closed — the aggregate max-instant sum cannot be safely decomposed to isolate idle liquidity).
 */
export function deriveReserveGate(reserves: ReserveGateInput[]): { gate: ReserveWithdrawalGate; breakdown: SteakhouseReserveEntry[] } {
  const breakdown: SteakhouseReserveEntry[] = [];
  let combined: ReserveWithdrawalGate = "permitted";
  for (const r of reserves) {
    const material = Number(r.ctokenAllocation ?? 0) > 0;
    if (!material) continue;
    const entry: SteakhouseReserveEntry = {
      reserveAddress: r.reserveAddress,
      vaultClaimRaw: r.ctokenAllocation != null ? String(r.ctokenAllocation) : null,
      currentlyRedeemableRaw: null,
      limitingCondition: "none",
      emergencyState: "unknown",
      freshness: r.fresh ? "fresh" : "unresolved",
      sourceSlot: r.sourceSlot,
      reserveStatus: r.status == null ? "unresolved" : Number(r.status) === 0 ? "active" : Number(r.status) === 1 ? "obsolete" : "hidden",
      reserveEmergency: r.emergencyMode == null ? "unresolved" : Number(r.emergencyMode) !== 0 ? "on" : "off",
      marketEmergency: r.marketEmergency == null ? "unresolved" : r.marketEmergency ? "on" : "off",
      blockCtokenApplicable: "applicable", // source-backed: reserve-redemption path burns cTokens
      blockCtokenValue: r.blockCtokenUsage == null ? "unresolved" : Number(r.blockCtokenUsage) !== 0 ? "enabled" : "disabled",
      combinedGate: "permitted",
    };
    let gate: ReserveWithdrawalGate;
    if (r.status == null || r.emergencyMode == null) { gate = "unresolved"; entry.limitingCondition = "reserve status/emergency unresolved"; }
    else if (Number(r.status) !== 0 || Number(r.emergencyMode) !== 0) { gate = "emergency_paused"; entry.emergencyState = "emergency"; entry.limitingCondition = Number(r.emergencyMode) !== 0 ? "reserve emergency mode" : "reserve status not active"; }
    else if (r.blockCtokenUsage == null) { gate = "unresolved"; entry.emergencyState = "off"; entry.limitingCondition = "block_ctoken_usage unresolved"; }
    else if (Number(r.blockCtokenUsage) !== 0) { gate = "withdrawal_blocked"; entry.emergencyState = "off"; entry.limitingCondition = "block_ctoken_usage enabled"; }
    else if (r.lendingMarket == null) { gate = "unresolved"; entry.emergencyState = "off"; entry.limitingCondition = "lending market unresolved"; }
    else if (r.marketEmergency == null) { gate = "unresolved"; entry.emergencyState = "off"; entry.limitingCondition = "market emergency unresolved"; }
    else if (r.marketEmergency === true) { gate = "emergency_paused"; entry.emergencyState = "off"; entry.limitingCondition = "lending-market emergency mode"; }
    else { gate = "permitted"; entry.emergencyState = "off"; }
    entry.combinedGate = gate;
    breakdown.push(entry);
    if (gate !== "permitted" && combined === "permitted") combined = gate;
  }
  return { gate: combined, breakdown };
}

const toTokens = (raw: bigint, dec: number): number => { const s = 10n ** BigInt(dec); return Number(raw / s) + Number(raw % s) / Number(s); };
const big = (s: string | null): bigint | null => { if (s === null) return null; try { return BigInt(s); } catch { return null; } };

export function buildSteakhouseExistingPosition(input: SteakhousePositionInput): SteakhousePositionResult {
  const dec = STEAKHOUSE_IDENTITY.usdcDecimals;
  const reasons = new Set<string>(input.unresolvedReasons ?? []);
  const base = {
    candidateId: STEAKHOUSE_CANDIDATE_ID,
    dedupeKey: STEAKHOUSE_POSITION_DEDUPE_KEY,
    totalShareRaw: input.totalShareRaw,
    perReserveBreakdown: input.perReserveBreakdown ?? [],
    vaultIdleLiquidityRaw: null as string | null,
    observedAt: input.observedAt,
    sourceSlot: input.sourceSlot,
  };

  const shares = big(input.totalShareRaw);
  if (shares === null || shares === 0n) {
    return { ...base, positionExists: false, enrichmentState: "complete",
      recognizedUnderlyingRaw: "0", currentlyLiquidUnderlyingRaw: "0", delayedUnderlyingRaw: "0", unavailableUnderlyingRaw: "0", unresolvedUnderlyingRaw: "0",
      recognizedUnderlyingAmount: 0, currentlyLiquidUnderlyingAmount: 0, recognizedValueUsd: null, liquidValueUsd: null, apyPct: null,
      withdrawalState: "unresolved", freshness: "fresh", unresolvedReasons: [] };
  }

  // Recognized (may be unresolved — but shares confirm a REAL position that stays visible).
  const recognizedBig = big(input.recognizedUnderlyingRaw);
  const recognizedResolved = recognizedBig !== null;
  const recognizedTokens = recognizedBig !== null ? toTokens(recognizedBig, dec) : null;
  const priceOk = input.price.fresh && typeof input.price.usdcPriceUsd === "number" && input.price.usdcPriceUsd > 0;
  const recognizedValueUsd = priceOk && recognizedTokens !== null ? recognizedTokens * (input.price.usdcPriceUsd as number) : null;
  if (!recognizedResolved) reasons.add("recognized underlying claim unresolved");

  // Verified liquid = min(recognized, vault max-instant), fail-closed. Gates checked in strict order:
  // vault gate → reserve gate → freshness → recognition → SDK amount. Any block/unknown ⇒ no positive liquid.
  let liquidBig: bigint | null = null;
  let withdrawalState: SteakhouseWithdrawalState;
  const vaultMax = big(input.vaultMaxInstantWithdrawableRaw);
  if (input.vaultGate === "paused") { withdrawalState = "paused"; reasons.add("vault withdrawal paused"); }
  else if (input.vaultGate === "stale") { withdrawalState = "stale"; reasons.add("vault state stale"); }
  else if (input.vaultGate === "unresolved") { withdrawalState = "unresolved"; reasons.add("vault withdrawal permission unresolved"); }
  else if (input.reserveGate === "emergency_paused") { withdrawalState = "emergency_paused"; reasons.add("underlying reserve/market emergency mode"); }
  else if (input.reserveGate === "withdrawal_blocked") { withdrawalState = "emergency_paused"; reasons.add("underlying reserve withdrawal blocked"); }
  else if (input.reserveGate === "stale") { withdrawalState = "stale"; reasons.add("underlying reserve state stale"); }
  else if (input.reserveGate === "unresolved") { withdrawalState = "unresolved"; reasons.add("underlying reserve gate unresolved"); }
  else if (!input.vaultFresh) { withdrawalState = "stale"; reasons.add("vault/reserve snapshot stale"); }
  else if (!recognizedResolved) { withdrawalState = "unresolved"; }
  else if (vaultMax === null) { withdrawalState = "unresolved"; reasons.add("vault max-instant-withdrawable unresolved (missing reserve/queue/rolling-limit data)"); }
  else {
    // Both gates permitted, fresh, resolved: the SDK sum (idle + per-reserve available, queued-aware,
    // capped by claim) is trustworthy because no material reserve is blocking.
    liquidBig = vaultMax > recognizedBig! ? recognizedBig! : vaultMax; // never exceeds recognized
    if (liquidBig <= 0n) withdrawalState = "currently_unavailable";
    else if (liquidBig >= recognizedBig!) withdrawalState = "fully_withdrawable";
    else withdrawalState = "partially_withdrawable";
  }

  const liquidResolved = liquidBig !== null;
  const liquidTokens = liquidBig !== null ? toTokens(liquidBig, dec) : null;
  const liquidValueUsd = priceOk && liquidTokens !== null ? liquidTokens * (input.price.usdcPriceUsd as number) : null;
  const delayedBig = recognizedResolved && liquidResolved && withdrawalState === "partially_withdrawable" ? recognizedBig! - liquidBig! : null;
  const unavailableBig = recognizedResolved && withdrawalState === "currently_unavailable" ? recognizedBig! : (recognizedResolved && (withdrawalState === "paused" || withdrawalState === "emergency_paused") ? recognizedBig! : null);
  const unresolvedBig = recognizedResolved && withdrawalState === "unresolved" ? recognizedBig! : null;

  const enrichmentState: SteakhousePositionResult["enrichmentState"] =
    !recognizedResolved ? "unresolved" : liquidResolved ? "complete" : "recognized_only";
  const freshness: SteakhousePositionResult["freshness"] =
    !recognizedResolved ? "unresolved" : withdrawalState === "stale" ? "stale" : "fresh";

  return {
    ...base,
    positionExists: true,
    enrichmentState,
    recognizedUnderlyingRaw: recognizedResolved ? input.recognizedUnderlyingRaw : null,
    currentlyLiquidUnderlyingRaw: liquidBig !== null ? liquidBig.toString() : null,
    delayedUnderlyingRaw: delayedBig !== null ? delayedBig.toString() : null,
    unavailableUnderlyingRaw: unavailableBig !== null ? unavailableBig.toString() : null,
    unresolvedUnderlyingRaw: unresolvedBig !== null ? unresolvedBig.toString() : null,
    recognizedUnderlyingAmount: recognizedTokens,
    currentlyLiquidUnderlyingAmount: liquidTokens,
    recognizedValueUsd,
    liquidValueUsd,
    apyPct: input.apy.fresh ? input.apy.valuePct : null,
    withdrawalState,
    freshness,
    vaultIdleLiquidityRaw: null,
    perReserveBreakdown: input.perReserveBreakdown ?? [],
    unresolvedReasons: [...reasons],
    observedAt: input.observedAt,
    sourceSlot: input.sourceSlot,
  };
}

/** Map to the canonical WalletPosition. Recognized fills valueUsd (portfolio total); liquid is separate.
 *  Steakhouse stays existing-position-only; selector/Top-Pick eligibility is governed by its disposition. */
export function toSteakhouseWalletPosition(r: SteakhousePositionResult, opts: { name?: string; icon?: string } = {}): WalletPosition | null {
  if (!r.positionExists) return null;
  const resolved = r.recognizedUnderlyingRaw !== null;
  return {
    id: STEAKHOUSE_POSITION_ID,
    source: "kamino",
    type: "protocol",
    symbol: "USDC",
    name: opts.name ?? "Steakhouse USDC Vault",
    icon: opts.icon,
    mint: STEAKHOUSE_IDENTITY.usdcMint,
    amount: resolved ? (r.recognizedUnderlyingRaw as string) : r.totalShareRaw,
    uiAmount: r.recognizedUnderlyingAmount ?? undefined,
    decimals: STEAKHOUSE_IDENTITY.usdcDecimals,
    protocol: "Kamino",
    detection: "protocol_api",
    side: "supplied",
    apy: r.apyPct,
    valueUsd: r.recognizedValueUsd,
    recognizedValueUsd: r.recognizedValueUsd,
    liquidValueUsd: r.liquidValueUsd,
    withdrawalState: r.withdrawalState,
    existingPositionOnly: true,
    dedupeKey: r.dedupeKey,
    candidateId: r.candidateId,
    // Resolved identity for Safety Buffer vetting — canonical vault address + product/curator (this exact vault is the
    // Steakhouse-curated Kamino market). The buffer vetting reads these dynamically; it never hardcodes a curator.
    curatedLending: {
      protocol: "Kamino",
      productName: opts.name ?? "Steakhouse USDC Vault",
      curator: "Steakhouse Financial",
      vaultAddress: STEAKHOUSE_IDENTITY.vaultAddress,
      detectionConfidence: "high",
    },
  };
}

/** Remove any row that double-counts this economic position (generic share row, farm receipt). */
export function dedupeSteakhousePosition(positions: WalletPosition[]): WalletPosition[] {
  return positions.filter((p) => {
    if (p.id === STEAKHOUSE_POSITION_ID) return true; // never remove the canonical row
    if (p.mint === STEAKHOUSE_IDENTITY.shareMint) return false; // generic share / farm receipt row
    return true;
  });
}

export function mergeSteakhousePosition(positions: WalletPosition[], r: SteakhousePositionResult, opts: { name?: string; icon?: string } = {}): WalletPosition[] {
  const deduped = dedupeSteakhousePosition(positions);
  const rich = toSteakhouseWalletPosition(r, opts);
  return rich ? [...deduped.filter((p) => p.id !== STEAKHOUSE_POSITION_ID), rich] : deduped;
}
