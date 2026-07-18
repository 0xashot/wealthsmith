/**
 * klendDirectUsdcMarketData — Step 16H-S.4. The single canonical, read-only live-market snapshot for
 * the exact Kamino Direct USDC reserve. It takes ONE raw reserve+market read (deduplicated — every
 * output derives from the same read) and delegates to the existing exact calculation modules
 * (klendReserveApyDerivation, klendReserveCapacity, klendReserveAvailability). It reimplements none of
 * their business logic and it performs no network I/O itself — a thin hook fetches, this pure builder
 * calculates, the runtime adapter evaluates.
 *
 * SOURCE AUTHORITY. Values come from on-chain reserve/market accounts only. The Kamino API is never a
 * production authority for APY, capacity, availability, or accounting. There is no hardcoded slot
 * duration, no cached fixture APY, no app-display APY, no DefiLlama rate, and no default availability.
 *
 * FAIL-CLOSED. Any identity mismatch, missing source slot, stale read, skew beyond the approved bound,
 * or unresolved calculation makes the corresponding output unresolved/stale — which the runtime adapter
 * turns into an exact suppression reason. Stale and fresh values are never merged into an eligible result.
 */
import { deriveKlendReserveApy, type ApyDerivationInputs } from "./klendReserveApyDerivation";
import { deriveKlendReserveCapacity, type CapacityInputs, CAPACITY_TTL_MS, MAX_CAPACITY_SLOT_AGE } from "./klendReserveCapacity";
import { evaluateDepositAvailability, type DepositAvailabilityInputs, AVAILABILITY_TTL_MS, MAX_AVAILABILITY_SLOT_SKEW } from "./klendReserveAvailability";
import { MEASUREMENT_TTL_MS, MAX_RESERVE_MEASUREMENT_SLOT_SKEW } from "./solanaSlotDurationEstimator";
import type { DirectLendingRuntimeInput } from "./directUsdcLendingRuntimeAdapter";

/* ------------------------------------------------------------------ *
 * Exact product identity — every read must match, or the snapshot is invalid.
 * ------------------------------------------------------------------ */
export const KLEND_DIRECT_USDC_IDENTITY = {
  candidateId: "kamino_usdc_lending",
  marketAddress: "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF",
  reserveAddress: "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59",
  liquidityMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  cTokenMint: "B8V6WVjPxW1UGwVDfxH2d2r8SyT4cqn7dQRK6XneVa7D",
  klendProgramId: "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD",
  cluster: "mainnet-beta",
} as const;

/* ------------------------------------------------------------------ *
 * One raw read — the exact fields a single reserve+market fetch provides. The hook fills these from
 * on-chain accounts (SDK-native ratios for APY; raw u64/sf for capacity; deployed gate fields for
 * availability) plus a deterministic measured slot duration. No field is optional-favourable: a
 * missing required field fails closed.
 * ------------------------------------------------------------------ */
export interface KlendDirectUsdcRawRead {
  identity: { marketAddress: string; reserveAddress: string; liquidityMint: string; cTokenMint: string; klendProgramId: string; cluster: string };

  /** APY: SDK-native decimal ratios read from the reserve (already the module's expected inputs). */
  apy: {
    utilizationRatio: number; supplyAprRatio: number; supplyApyRatio: number; borrowAprRatio: number; borrowApyRatio: number;
    protocolTakeRatePct: number; referralFeeBps: number; rateCurveWellFormed: boolean;
    supplierFarmBound: boolean; rewardStreamsResolved: boolean; rewardApyPct: number; // 0 while exhausted
  };
  /** Deterministic measured slot duration + its observation (never a hardcoded constant). */
  slotDuration: { measuredMs: number | null; observationSlot: number | null; windowsAgree: boolean };

  /** Capacity: raw u64 / scaled-fraction (2^60) — the exact on-chain-matching path. */
  capacity: { depositLimitRaw: string | undefined; totalSupplySf: string | undefined; totalAvailableAmountRaw?: string; borrowedAmountSf?: string };

  /** Availability: deployed gate fields. */
  availability: {
    reserveStatus: number; reserveVersion: number; reserveEmergencyMode: number; blockCtokenUsage: number;
    marketEmergencyMode: number; marketPermissioningAuthority: string; marketPermissionedOps: number;
  };

  /** Provenance for freshness/skew. */
  reserveSourceSlot: number | undefined;
  marketSourceSlot: number | undefined;
  observedAt: string | null;
  assetDecimals: number;
}

export type MarketFreshness = "fresh" | "stale" | "unresolved";

export interface KlendDirectUsdcMarketSnapshot {
  identityValid: boolean;
  invalidationReason: string | null;
  apy: {
    baseSupplyApyPct: number | null; rewardApyPct: number; totalApyPct: number | null;
    rateKind: "estimated_variable_apy"; measuredSlotDurationMs: number | null; calculationVersion: string | null;
    sourceSlot: number | null; observedAt: string | null; freshness: MarketFreshness; invalidationReason: string | null;
  };
  capacity: {
    remainingCapacityRaw: string | null; remainingCapacityTokenAmount: number | null; capacityKind: string;
    sourceSlot: number | null; freshness: MarketFreshness; invalidationReason: string | null;
  };
  availability: {
    depositsMechanicallyAllowed: boolean; availabilityState: string; blockingReasons: string[];
    marketEmergencyState: string | null; reserveEmergencyState: string | null;
    sourceSlot: number | null; freshness: MarketFreshness;
  };
  overallFreshness: MarketFreshness;
}

function skewOk(reserveSlot: number | undefined, marketSlot: number | undefined, maxSkew: number): boolean {
  if (reserveSlot == null || marketSlot == null) return false;
  return Math.abs(reserveSlot - marketSlot) <= maxSkew;
}

function ageFreshness(observedAt: string | null, nowMs: number, ttlMs: number): MarketFreshness {
  if (!observedAt) return "unresolved";
  const t = Date.parse(observedAt);
  if (Number.isNaN(t)) return "unresolved";
  return nowMs - t <= ttlMs ? "fresh" : "stale";
}

/** Build the canonical snapshot from ONE raw read. Pure; delegates to the exact calc modules. */
export function buildKlendDirectUsdcMarketSnapshot(raw: KlendDirectUsdcRawRead, nowMs: number): KlendDirectUsdcMarketSnapshot {
  // Exact identity + owner check (the caller must have read the exact accounts).
  const id = raw.identity;
  const identityValid =
    id.marketAddress === KLEND_DIRECT_USDC_IDENTITY.marketAddress &&
    id.reserveAddress === KLEND_DIRECT_USDC_IDENTITY.reserveAddress &&
    id.liquidityMint === KLEND_DIRECT_USDC_IDENTITY.liquidityMint &&
    id.cTokenMint === KLEND_DIRECT_USDC_IDENTITY.cTokenMint &&
    id.klendProgramId === KLEND_DIRECT_USDC_IDENTITY.klendProgramId &&
    id.cluster === KLEND_DIRECT_USDC_IDENTITY.cluster;

  if (!identityValid) {
    const unresolved: MarketFreshness = "unresolved";
    return {
      identityValid: false,
      invalidationReason: "identity_mismatch",
      apy: { baseSupplyApyPct: null, rewardApyPct: 0, totalApyPct: null, rateKind: "estimated_variable_apy", measuredSlotDurationMs: null, calculationVersion: null, sourceSlot: null, observedAt: null, freshness: unresolved, invalidationReason: "identity_mismatch" },
      capacity: { remainingCapacityRaw: null, remainingCapacityTokenAmount: null, capacityKind: "unresolved", sourceSlot: null, freshness: unresolved, invalidationReason: "identity_mismatch" },
      availability: { depositsMechanicallyAllowed: false, availabilityState: "unresolved", blockingReasons: ["identity_mismatch"], marketEmergencyState: null, reserveEmergencyState: null, sourceSlot: null, freshness: unresolved },
      overallFreshness: unresolved,
    };
  }

  // ---- Capacity (delegated) ----
  const capacityInputs: CapacityInputs = {
    identity: { candidateId: KLEND_DIRECT_USDC_IDENTITY.candidateId, marketAddress: id.marketAddress, reserveAddress: id.reserveAddress, liquidityMint: id.liquidityMint, cTokenMint: id.cTokenMint, klendProgram: id.klendProgramId, cluster: id.cluster, assetDecimals: raw.assetDecimals },
    depositLimitRaw: raw.capacity.depositLimitRaw,
    totalSupplySf: raw.capacity.totalSupplySf,
    totalAvailableAmountRaw: raw.capacity.totalAvailableAmountRaw,
    borrowedAmountSf: raw.capacity.borrowedAmountSf,
    reserveSourceSlot: raw.reserveSourceSlot,
    currentSlot: raw.marketSourceSlot ?? raw.reserveSourceSlot ?? 0,
    observedAt: raw.observedAt ?? "",
    nowMs,
  };
  const cap = deriveKlendReserveCapacity(capacityInputs);
  const capAgeFresh = ageFreshness(raw.observedAt, nowMs, CAPACITY_TTL_MS);
  const capSlotFresh = raw.reserveSourceSlot != null && (raw.marketSourceSlot == null || Math.abs((raw.marketSourceSlot ?? raw.reserveSourceSlot) - raw.reserveSourceSlot) <= MAX_CAPACITY_SLOT_AGE);
  const capacityFreshness: MarketFreshness = !cap.ok ? "unresolved" : capAgeFresh === "fresh" && capSlotFresh ? "fresh" : "stale";

  // ---- Availability (delegated) — never inferred from capacity alone ----
  const availInputs: DepositAvailabilityInputs = {
    identity: { candidateId: KLEND_DIRECT_USDC_IDENTITY.candidateId, marketAddress: id.marketAddress, reserveAddress: id.reserveAddress, liquidityMint: id.liquidityMint, cTokenMint: id.cTokenMint, klendProgram: id.klendProgramId, cluster: id.cluster, assetDecimals: raw.assetDecimals, tokenProgram: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
    reserveStatus: raw.availability.reserveStatus,
    reserveVersion: raw.availability.reserveVersion,
    reserveEmergencyMode: raw.availability.reserveEmergencyMode,
    blockCtokenUsage: raw.availability.blockCtokenUsage,
    marketEmergencyMode: raw.availability.marketEmergencyMode,
    marketPermissioningAuthority: raw.availability.marketPermissioningAuthority,
    marketPermissionedOps: raw.availability.marketPermissionedOps,
    remainingCapacityRaw: cap.remainingCapacityRaw,
    remainingCapacityTokenAmount: cap.remainingCapacityTokenAmount,
    capacityIsFresh: capacityFreshness === "fresh",
    isOverConfiguredLimit: cap.remainingCapacityTokenAmount != null && cap.remainingCapacityTokenAmount <= 0,
    reserveSourceSlot: raw.reserveSourceSlot,
    marketSourceSlot: raw.marketSourceSlot,
    observedAt: raw.observedAt ?? "",
    nowMs,
  };
  const avail = evaluateDepositAvailability(availInputs);
  const availAgeFresh = ageFreshness(raw.observedAt, nowMs, AVAILABILITY_TTL_MS);
  const availSkewOk = skewOk(raw.reserveSourceSlot, raw.marketSourceSlot, MAX_AVAILABILITY_SLOT_SKEW);
  const availabilityFreshness: MarketFreshness = availAgeFresh === "unresolved" || !availSkewOk ? (availAgeFresh === "unresolved" ? "unresolved" : "stale") : availAgeFresh;

  // ---- APY (delegated) — measured slot duration required, rewards excluded while exhausted ----
  const slotFresh =
    raw.slotDuration.measuredMs != null && raw.slotDuration.observationSlot != null && raw.slotDuration.windowsAgree &&
    ageFreshness(raw.observedAt, nowMs, MEASUREMENT_TTL_MS) === "fresh" &&
    skewOk(raw.slotDuration.observationSlot, raw.reserveSourceSlot, MAX_RESERVE_MEASUREMENT_SLOT_SKEW);
  const apyInputs: ApyDerivationInputs = {
    candidateId: KLEND_DIRECT_USDC_IDENTITY.candidateId, marketAddress: id.marketAddress, reserveAddress: id.reserveAddress,
    liquidityMint: id.liquidityMint, klendProgramId: id.klendProgramId, cluster: id.cluster,
    utilizationRatio: raw.apy.utilizationRatio, supplyAprRatio: raw.apy.supplyAprRatio, supplyApyRatio: raw.apy.supplyApyRatio,
    borrowAprRatio: raw.apy.borrowAprRatio, borrowApyRatio: raw.apy.borrowApyRatio,
    protocolTakeRatePct: raw.apy.protocolTakeRatePct, referralFeeBps: raw.apy.referralFeeBps,
    sourceSlot: raw.reserveSourceSlot != null ? String(raw.reserveSourceSlot) : null, observedAt: raw.observedAt,
    rateCurveWellFormed: raw.apy.rateCurveWellFormed,
  } as ApyDerivationInputs;
  const apy = deriveKlendReserveApy(apyInputs);
  const rewardsResolvedZero = raw.apy.rewardStreamsResolved && raw.apy.rewardApyPct === 0;
  const totalApyPct = apy.ok && rewardsResolvedZero ? (apy.baseSupplyApyPct ?? null) : (apy.ok ? (apy.totalSupplyApyPct ?? null) : null);
  const apyFreshness: MarketFreshness = !apy.ok || totalApyPct == null ? "unresolved" : slotFresh && availAgeFresh === "fresh" ? "fresh" : "stale";

  const overall: MarketFreshness =
    [apyFreshness, capacityFreshness, availabilityFreshness].includes("unresolved") ? "unresolved" :
    [apyFreshness, capacityFreshness, availabilityFreshness].includes("stale") ? "stale" : "fresh";

  return {
    identityValid: true,
    invalidationReason: null,
    apy: {
      baseSupplyApyPct: apy.baseSupplyApyPct ?? null,
      rewardApyPct: raw.apy.rewardApyPct,
      totalApyPct,
      rateKind: "estimated_variable_apy",
      measuredSlotDurationMs: raw.slotDuration.measuredMs,
      calculationVersion: apy.calculationVersion ?? null,
      sourceSlot: raw.reserveSourceSlot ?? null,
      observedAt: raw.observedAt,
      freshness: apyFreshness,
      invalidationReason: apy.ok ? null : (apy.failure ?? "apy_unresolved"),
    },
    capacity: {
      remainingCapacityRaw: cap.remainingCapacityRaw ?? null,
      remainingCapacityTokenAmount: cap.remainingCapacityTokenAmount ?? null,
      capacityKind: cap.capacityKind,
      sourceSlot: raw.reserveSourceSlot ?? null,
      freshness: capacityFreshness,
      invalidationReason: cap.ok ? null : (cap.failure ?? "capacity_unresolved"),
    },
    availability: {
      depositsMechanicallyAllowed: avail.depositsMechanicallyAllowed,
      availabilityState: avail.depositAvailabilityState,
      blockingReasons: avail.blockingReasons,
      marketEmergencyState: avail.marketEmergencyState ?? null,
      reserveEmergencyState: avail.reserveEmergencyState ?? null,
      sourceSlot: raw.reserveSourceSlot ?? null,
      freshness: availabilityFreshness,
    },
    overallFreshness: overall,
  };
}

/* ------------------------------------------------------------------ *
 * Map the snapshot to the runtime adapter's `klendMarket` input (fail-closed).
 * ------------------------------------------------------------------ */
export function toRuntimeMarketInput(snapshot: KlendDirectUsdcMarketSnapshot): {
  apy: DirectLendingRuntimeInput["apy"];
  availability: DirectLendingRuntimeInput["availability"];
  capacity: DirectLendingRuntimeInput["capacity"];
} {
  return {
    apy: {
      // Resolved-but-stale keeps its value with fresh=false (→ adapter suppresses apy_stale);
      // only truly unresolved APY is null (→ adapter suppresses apy_unresolved). Never merged into eligible.
      measuredApyPct: snapshot.apy.freshness === "unresolved" ? null : snapshot.apy.totalApyPct,
      rateKind: snapshot.apy.rateKind,
      fresh: snapshot.apy.freshness === "fresh",
      reserveIdentityMatches: snapshot.identityValid,
      slotDurationFresh: snapshot.apy.measuredSlotDurationMs != null && snapshot.apy.freshness === "fresh",
      rewardApyPct: snapshot.apy.rewardApyPct,
    },
    availability: {
      depositsAvailable: snapshot.availability.freshness === "fresh" && snapshot.availability.depositsMechanicallyAllowed,
      emergencyModeActive: snapshot.availability.marketEmergencyState === "active" || snapshot.availability.reserveEmergencyState === "active",
    },
    capacity: {
      fresh: snapshot.capacity.freshness === "fresh",
      // sufficiency vs the suggested amount is applied by the caller against remainingCapacityTokenAmount.
      sufficientForAmount: snapshot.capacity.freshness === "fresh" && (snapshot.capacity.remainingCapacityTokenAmount ?? 0) > 0,
    },
  };
}

/** Capacity sufficiency for a specific USD amount (token≈USD for USDC): remaining must cover it. */
export function capacityCoversAmount(snapshot: KlendDirectUsdcMarketSnapshot, amountUsd: number): boolean {
  const remaining = snapshot.capacity.remainingCapacityTokenAmount;
  return snapshot.capacity.freshness === "fresh" && remaining != null && remaining >= amountUsd;
}
