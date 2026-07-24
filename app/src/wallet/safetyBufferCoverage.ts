/**
 * safetyBufferCoverage — Step 17B. The canonical model that separates RECOGNIZED stable value from
 * VERIFIED IMMEDIATELY-WITHDRAWABLE stable value, so the Safety Buffer completes only on capital the
 * user can actually withdraw now. Recognized value stays visible in portfolio totals; it does not
 * complete the buffer.
 *
 * PRODUCT-OWNER RULE. Protocol-held stable capital counts toward the buffer ONLY through verified
 * immediately-withdrawable value. Direct wallet stablecoins (registry-recognized, priced) are verified
 * liquid. Kamino Direct counts its `liquidValueUsd` only when 17A/17A.1 resolved it (non-null, a
 * withdrawable state, ≤ recognized). Steakhouse and any other protocol stable with no mounted
 * immediate-withdrawal methodology contribute ZERO verified liquid (their recognized value is UNRESOLVED
 * — it could matter, so it is never silently dismissed). Debt never adds coverage. LP never counts.
 *
 * FAIL-CLOSED + INTERVAL REASONING. verifiedLiquid is the minimum the user can rely on now. If it alone
 * meets the target → complete. If it cannot but unresolved sources could close the gap → unresolved
 * (never a false "incomplete"). If even the maximum can't reach the target → incomplete. Stale price,
 * unknown withdrawal inputs, and emergency states never become positive verified liquid.
 */
import type { WalletPosition } from "./walletPosition";
import { isStablecoin } from "./walletSummary";

export type CoverageInclusionState =
  | "included_liquid"
  | "included_partial"
  | "excluded_delayed"
  | "excluded_unavailable"
  | "excluded_unresolved"
  | "excluded_stale"
  | "excluded_unsupported";

export type SafetyBufferCoverageState = "complete" | "incomplete" | "unresolved";

export interface SafetyBufferCoverageSource {
  positionId: string;
  positionClass: string;
  protocol: string | null;
  assetMint: string | null;
  /** Safe display identity for an EXCLUDED holding table (never a wallet/account id). */
  symbol?: string | null;
  uiAmount?: number | null;
  recognizedValueUsd: number | null;
  verifiedLiquidValueUsd: number;
  delayedValueUsd: number;
  unavailableValueUsd: number;
  unresolvedValueUsd: number;
  /** True when an unresolved source's USD magnitude is unknown (e.g. unpriced) — bounds are open. */
  unresolvedMagnitudeUnknown: boolean;
  inclusionState: CoverageInclusionState;
  exclusionReason: string | null;
}

export interface SafetyBufferCoverage {
  requiredBufferUsd: number;
  recognizedStableValueUsd: number;
  verifiedLiquidStableValueUsd: number;
  delayedStableValueUsd: number;
  unavailableStableValueUsd: number;
  unresolvedStableValueUsd: number;
  /** True when at least one unresolved source has an unknown USD magnitude. */
  hasUnknownUnresolvedMagnitude: boolean;
  shortfallUsd: number;
  coverageRatio: number;
  fullyFunded: boolean;
  coverageState: SafetyBufferCoverageState;
  unresolvedReasons: string[];
  sources: SafetyBufferCoverageSource[];
}

const KAMINO_DIRECT_CANDIDATE_ID = "kamino_usdc_lending";
const STEAKHOUSE_CANDIDATE_ID = "kamino_steakhouse_usdc";
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);

/** Classify one position into coverage buckets. Pure; no assumption of liquidity from recognition. */
export function classifyPositionCoverage(p: WalletPosition): SafetyBufferCoverageSource {
  const base = {
    positionId: p.id,
    protocol: p.protocol ?? null,
    assetMint: p.mint ?? null,
    symbol: p.symbol ?? null,
    uiAmount: p.uiAmount ?? null,
    delayedValueUsd: 0,
    unavailableValueUsd: 0,
    unresolvedValueUsd: 0,
    unresolvedMagnitudeUnknown: false,
    exclusionReason: null as string | null,
  };
  const zero = (state: CoverageInclusionState, reason: string | null, recognized: number | null, extra: Partial<SafetyBufferCoverageSource> = {}): SafetyBufferCoverageSource =>
    ({ ...base, positionClass: p.type, recognizedValueUsd: recognized, verifiedLiquidValueUsd: 0, inclusionState: state, exclusionReason: reason, ...extra });

  // Debt never adds coverage.
  if (p.side === "borrowed") return zero("excluded_unsupported", "debt does not add buffer coverage", null);

  // 1. Direct wallet stablecoin (registry-recognized; never symbol-only via isStablecoin's name gate).
  if (isStablecoin(p)) {
    const v = num(p.valueUsd);
    if (v === null) return zero("excluded_stale", "stable price unavailable/stale", null, { unresolvedMagnitudeUnknown: true, unresolvedValueUsd: 0 });
    // Step 17E — Token-2022 transferability. `withdrawalState` carries the assessed transferability of a
    // Token Extensions stable; a nominal balance is NEVER counted as liquid unless verified transferable.
    // Classic SPL positions leave withdrawalState undefined and count in full (unchanged).
    if (p.withdrawalState === "currently_unavailable" || p.withdrawalState === "emergency_paused")
      return zero("excluded_unavailable", "stable token not transferable (frozen/non-transferable/paused)", v, { unavailableValueUsd: v });
    if (p.withdrawalState === "unresolved" || p.withdrawalState === "stale")
      return zero("excluded_unresolved", "stable token transferability unresolved (hook/confidential/unsupported/stale)", v, { unresolvedValueUsd: v });
    // Partial / transfer-fee transferability → count ONLY the verified net-transferable USD (never full v).
    if (p.withdrawalState === "partially_withdrawable") {
      const liquid = num(p.liquidValueUsd);
      if (liquid === null) return zero("excluded_unresolved", "stable net-transferable amount unresolved", v, { unresolvedValueUsd: v });
      const capped = Math.min(liquid, v);
      const delayed = Math.max(v - capped, 0);
      return {
        ...base, positionClass: "wallet_stable", recognizedValueUsd: v,
        verifiedLiquidValueUsd: capped, delayedValueUsd: delayed,
        inclusionState: capped > 0 && delayed === 0 ? "included_liquid" : capped > 0 ? "included_partial" : "excluded_delayed",
        exclusionReason: capped > 0 ? null : "no net-transferable amount",
      };
    }
    // fully_withdrawable (verified transferable) OR undefined (classic SPL) → full verified liquid.
    return { ...base, positionClass: "wallet_stable", recognizedValueUsd: v, verifiedLiquidValueUsd: v, inclusionState: "included_liquid" };
  }

  // 2. Any existing-position adapter that exposes verified withdrawal fields (17A Kamino Direct,
  //    17C Steakhouse). Verified liquid counts only when the adapter resolved it (withdrawalState +
  //    liquidValueUsd), else the recognized value is unavailable/unresolved — never assumed liquid.
  if (p.existingPositionOnly === true && typeof p.withdrawalState === "string") {
    const positionClass = p.candidateId === KAMINO_DIRECT_CANDIDATE_ID ? "kamino_direct" : p.candidateId === STEAKHOUSE_CANDIDATE_ID ? "steakhouse" : "protocol_existing";
    const recognized = num(p.recognizedValueUsd);
    const liquid = num(p.liquidValueUsd);
    const state = p.withdrawalState;
    if (state === "fully_withdrawable" || state === "partially_withdrawable") {
      if (liquid === null) return zero("excluded_unresolved", `${positionClass} liquid value unresolved`, recognized, { positionClass, unresolvedValueUsd: recognized ?? 0, unresolvedMagnitudeUnknown: recognized === null });
      const cappedLiquid = recognized !== null ? Math.min(liquid, recognized) : liquid; // never exceeds recognized
      const delayed = recognized !== null ? Math.max(recognized - cappedLiquid, 0) : 0;
      return {
        ...base, positionClass, recognizedValueUsd: recognized,
        verifiedLiquidValueUsd: cappedLiquid, delayedValueUsd: delayed,
        inclusionState: cappedLiquid > 0 && delayed === 0 ? "included_liquid" : cappedLiquid > 0 ? "included_partial" : "excluded_delayed",
        exclusionReason: cappedLiquid > 0 ? null : "no currently-withdrawable amount",
      };
    }
    if (state === "emergency_paused" || state === "currently_unavailable")
      return zero("excluded_unavailable", `${positionClass} ${state}`, recognized, { positionClass, unavailableValueUsd: recognized ?? 0 });
    // unresolved / stale → could matter → unresolved.
    return zero("excluded_unresolved", `${positionClass} withdrawal unresolved`, recognized, { positionClass, unresolvedValueUsd: recognized ?? 0, unresolvedMagnitudeUnknown: recognized === null });
  }

  // 3. Steakhouse & other protocol-held stable positions with NO mounted immediate-withdrawal
  //    methodology → 0 verified liquid; recognized value is UNRESOLVED (it could matter for completion).
  if (p.type === "protocol") {
    const stableLegs = !!p.legs && p.legs.length > 0 && p.legs.every((l) => l.side !== "debt");
    const looksStable = stableLegs || /USDC|USDT|USDH|DAI/i.test(p.symbol) || /Steakhouse|USDC/i.test(p.name ?? "");
    const v = num(p.valueUsd);
    if (!looksStable) return zero("excluded_unsupported", "not a recognized stable protocol position", v);
    // Recognized stable protocol value that we cannot verify as immediately withdrawable → unresolved.
    return zero("excluded_unresolved", "no mounted immediate-withdrawal methodology for this protocol position", v, { unresolvedValueUsd: v ?? 0, unresolvedMagnitudeUnknown: v === null });
  }

  // 4. Everything else (LST/stake/native/non-stable token) → not stable buffer capital.
  return zero("excluded_unsupported", "not stable buffer capital", null);
}

/**
 * Compute canonical Safety Buffer coverage. `requiredBufferUsd` is the approved target (this task does
 * NOT change the target formula). fullyFunded/shortfall use verifiedLiquid ONLY.
 */
export function computeSafetyBufferCoverage(positions: WalletPosition[], requiredBufferUsd: number): SafetyBufferCoverage {
  const sources = positions.map(classifyPositionCoverage);

  let recognized = 0, verifiedLiquid = 0, delayed = 0, unavailable = 0, unresolved = 0;
  let hasUnknownUnresolvedMagnitude = false;
  const unresolvedReasons = new Set<string>();
  for (const s of sources) {
    if (typeof s.recognizedValueUsd === "number") recognized += s.recognizedValueUsd;
    verifiedLiquid += s.verifiedLiquidValueUsd;
    delayed += s.delayedValueUsd;
    unavailable += s.unavailableValueUsd;
    unresolved += s.unresolvedValueUsd;
    if (s.unresolvedMagnitudeUnknown) hasUnknownUnresolvedMagnitude = true;
    if (s.inclusionState === "excluded_unresolved" || s.inclusionState === "excluded_stale") {
      if (s.exclusionReason) unresolvedReasons.add(s.exclusionReason);
    }
  }

  const target = requiredBufferUsd > 0 ? requiredBufferUsd : 0;
  const shortfallUsd = Math.max(target - verifiedLiquid, 0);
  const coverageRatio = target > 0 ? verifiedLiquid / target : 1;

  // Interval reasoning: min = verifiedLiquid; max potential = verifiedLiquid + unresolved (or open when
  // an unresolved magnitude is unknown).
  let coverageState: SafetyBufferCoverageState;
  if (target === 0) coverageState = "complete";
  else if (verifiedLiquid >= target) coverageState = "complete";
  else if (hasUnknownUnresolvedMagnitude || verifiedLiquid + unresolved >= target) coverageState = "unresolved";
  else coverageState = "incomplete";

  return {
    requiredBufferUsd: target,
    recognizedStableValueUsd: recognized,
    verifiedLiquidStableValueUsd: verifiedLiquid,
    delayedStableValueUsd: delayed,
    unavailableStableValueUsd: unavailable,
    unresolvedStableValueUsd: unresolved,
    hasUnknownUnresolvedMagnitude,
    shortfallUsd,
    coverageRatio,
    fullyFunded: coverageState === "complete",
    coverageState,
    unresolvedReasons: [...unresolvedReasons],
    sources,
  };
}
