/**
 * canonicalTargetAllocation — Step 22F (slice 1). The pure adapter from the approved five-factor
 * `TargetAllocationAssessment` to the canonical mounted target-allocation shape that Rebalance / DCA / On Track
 * consume. It RECONSTRUCTS NOTHING — it only reads the already-derived percentages/metadata off the assessment and,
 * when a valid portfolio denominator is supplied, applies the target percentage to it for dollar amounts.
 *
 * Convention: `targetStablePct = finalStableTargetPct`, `targetCryptoPct = finalVolatileTargetPct` (crypto = volatile).
 * Returns `null` when the target is not usable (`unavailable | blocked | unresolved`) — there is NO risk-only fallback.
 * `full` and `degraded_market_excluded` both yield a usable target; the confidence + market-exclusion metadata ride
 * along so downstream review details can disclose degraded state. NON-MOUNTED until the rail is wired (slice 2).
 */
import type { TargetAllocationAssessment, TargetAllocationConfidence } from "./targetAllocationAssessment";

export interface CanonicalTargetAllocation {
  targetStablePct: number;
  targetCryptoPct: number;
  /** Only when a valid (>0, finite) priced denominator is supplied — otherwise null (percentages still stand). */
  targetStableUsd: number | null;
  targetCryptoUsd: number | null;
  targetConfidence: TargetAllocationConfidence; // "full" | "degraded_market_excluded"
  marketExcluded: boolean;
  marketExclusionReason: string | null;
  /** Full confidence only: finalStable − profileOnlyRenormalized. Null when degraded. NOT bounded to ±6pp. */
  marketAdjustmentVsProfileOnlyPct: number | null;
  methodologyVersion: string;
  policyVersion: string;
  // Downstream-readiness passthrough (never recomputed here).
  rebalanceTargetEligible: boolean;
  dcaTargetEligible: boolean;
  onTrackTargetEligible: boolean;
}

/**
 * Adapt a target assessment into the canonical mounted allocation. Returns null for `unavailable`/`blocked`/
 * `unresolved` (no target-based suggestion). `totalPricedUsd` is the canonical portfolio denominator for dollar
 * amounts; when absent/invalid, dollar fields are null but the percentages remain authoritative.
 */
export function buildCanonicalTargetAllocation(
  assessment: TargetAllocationAssessment,
  opts: { totalPricedUsd?: number | null } = {},
): CanonicalTargetAllocation | null {
  const conf = assessment.targetConfidence;
  if (conf !== "full" && conf !== "degraded_market_excluded") return null;

  const targetStablePct = assessment.finalStableTargetPct;
  const targetCryptoPct = assessment.finalVolatileTargetPct;
  // Defensive: a usable confidence must carry a computed target; if not, treat as no target (fail closed).
  if (targetStablePct == null || targetCryptoPct == null) return null;

  const denom = opts.totalPricedUsd;
  const hasDenominator = typeof denom === "number" && Number.isFinite(denom) && denom > 0;
  const marketExcluded = conf === "degraded_market_excluded";

  return {
    targetStablePct,
    targetCryptoPct,
    targetStableUsd: hasDenominator ? (denom as number) * (targetStablePct / 100) : null,
    targetCryptoUsd: hasDenominator ? (denom as number) * (targetCryptoPct / 100) : null,
    targetConfidence: conf,
    marketExcluded,
    marketExclusionReason: marketExcluded ? assessment.marketExclusionReason : null,
    marketAdjustmentVsProfileOnlyPct: assessment.marketAdjustmentVsProfileOnlyPct,
    methodologyVersion: assessment.methodologyVersion,
    policyVersion: assessment.policyVersion,
    rebalanceTargetEligible: assessment.rebalanceTargetEligible,
    dcaTargetEligible: assessment.dcaTargetEligible,
    onTrackTargetEligible: assessment.onTrackTargetEligible,
  };
}
