/**
 * contributionAllocationSplit — "maintain / restore the recommended allocation" contribution planner.
 *
 * When the Safety Buffer is funded, the monthly contribution is deployed to keep the portfolio at its
 * recommended crypto/stable target — NOT dumped entirely into one asset. This computes, in order:
 *
 *   1. the STABLE vs CRYPTO split (how much of the contribution restores the crypto/stable target), and
 *   2. within the crypto portion, a per-asset split across the growth assets the user actually HOLDS,
 *      via the versioned `growth_target_suballocation_v1` policy (risk-tiered weights).
 *
 * Scope note: the crypto bucket is measured as `total − stable` (all non-stable value), the SAME
 * denominator the "Current vs Recommended Allocation" card uses — so the split is always consistent
 * with that card.
 *
 * Pure math only: it computes dollar amounts per asset. It selects no funding source, moves no funds,
 * requests no signature, and generates no card here. Fails closed (returns null) on invalid input.
 */
import { buildGrowthSubAllocation, type GrowthSubAllocationTargetId } from "./growthTargetSubAllocationPolicy";

/** Minimum per-leg contribution shown as a card — matches the existing DCA $50 floor. */
export const CONTRIBUTION_SPLIT_MIN_LEG_USD = 50;

/** Stable destination + the growth assets a contribution can be split across. */
export type ContributionLegTargetId = "usdc" | GrowthSubAllocationTargetId;

export interface ContributionLeg {
  targetId: ContributionLegTargetId;
  /** Dollar amount of the contribution for this asset. */
  usd: number;
  /** True when this leg is at/above the per-leg minimum (→ render a card). */
  applies: boolean;
}

export interface ContributionAllocationSplit {
  /** Total portfolio value (USD) — for the modal's current/after allocation percentages. */
  totalUsd: number;
  /** Current stable exposure (USD) — for the modal's allocation percentages. */
  stableUsd: number;
  /** Total contribution being allocated (USD). All legs always total this. */
  contributionUsd: number;
  /** Every leg (stable + per growth asset), largest first. Totals `contributionUsd`. */
  legs: ContributionLeg[];
  /** Combined crypto portion across all growth legs. */
  cryptoUsd: number;
  /** Stable leg (USDC). */
  usdcUsd: number;
  /** True when the crypto portion was split across MORE THAN ONE growth asset. */
  growthSubAllocated: boolean;
  /** Target percentages used, for card copy. */
  targetCryptoPct: number;
  targetStablePct: number;
}

const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

/** Amount for a leg, or 0 when it is not present. */
export function legAmount(split: ContributionAllocationSplit, targetId: ContributionLegTargetId): number {
  return split.legs.find((l) => l.targetId === targetId)?.usd ?? 0;
}

/** True when the leg is present and at/above the per-leg minimum. */
export function legApplies(split: ContributionAllocationSplit, targetId: ContributionLegTargetId): boolean {
  return split.legs.find((l) => l.targetId === targetId)?.applies === true;
}

/**
 * Drop legs below the per-leg minimum and redistribute their money proportionally across the legs that
 * survive, so the shown amounts always total the full contribution. When nothing clears the minimum the
 * whole contribution goes to the single largest leg (never a scatter of unactionable amounts).
 */
function applyMinimum(raw: { targetId: ContributionLegTargetId; usd: number }[], contributionUsd: number): ContributionLeg[] {
  const positive = raw.filter((l) => l.usd > 0);
  if (positive.length === 0) return [];

  const kept = positive.filter((l) => l.usd >= CONTRIBUTION_SPLIT_MIN_LEG_USD);
  if (kept.length === 0) {
    // Nothing clears the floor — put everything into the largest single destination.
    const largest = positive.reduce((a, b) => (b.usd > a.usd ? b : a));
    return [{ targetId: largest.targetId, usd: contributionUsd, applies: contributionUsd >= CONTRIBUTION_SPLIT_MIN_LEG_USD }];
  }

  // Redistribute the dropped amount across survivors, proportional to their own size. Survivors are
  // already at/above the minimum, so a single pass is enough — this can only make them larger.
  const keptTotal = kept.reduce((s, l) => s + l.usd, 0);
  const legs: ContributionLeg[] = kept.map((l) => ({
    targetId: l.targetId,
    usd: (l.usd / keptTotal) * contributionUsd,
    applies: true,
  }));
  return legs.sort((a, b) => b.usd - a.usd);
}

/**
 * Split `monthlyContributionUsd` across USDC and the held growth assets so the post-contribution
 * portfolio moves toward `targetCryptoPct`, and the crypto portion respects the user's risk-tiered
 * sub-allocation. Returns null on invalid input (fails closed → no split cards).
 */
export function computeContributionAllocationSplit(args: {
  totalUsd: number;
  stableUsd: number;
  monthlyContributionUsd: number;
  targetCryptoPct: number;
  /**
   * Growth assets the user actually holds. With more than one, the crypto portion is split by the
   * versioned sub-allocation policy. Omitted/empty → the whole crypto portion goes to SOL, preserving
   * the previous single-asset behavior.
   */
  heldGrowthTargetIds?: readonly string[];
  /** Saved risk tolerance — required to split across multiple growth assets. */
  riskLevel?: string | null;
}): ContributionAllocationSplit | null {
  const { totalUsd: P, stableUsd: Vs, monthlyContributionUsd: C, targetCryptoPct: tC } = args;
  if (!finite(P) || !finite(Vs) || !finite(C) || !finite(tC)) return null;
  if (!(P > 0) || !(Vs >= 0) || Vs > P || !(C > 0) || tC < 0 || tC > 100) return null;

  const cryptoBucketUsd = P - Vs; // all non-stable value (allocation-card scope)
  const postTotal = P + C;
  // Crypto portion that brings the bucket to its target with the new money, clamped to [0, C].
  const cryptoUsd = Math.min(Math.max((tC / 100) * postTotal - cryptoBucketUsd, 0), C);
  const usdcUsd = C - cryptoUsd; // remainder → stables; the two always total C exactly

  // Split the crypto portion across the HELD growth assets (risk-tiered). One held asset (or an
  // unusable risk level) keeps the whole crypto portion on a single asset.
  const held = args.heldGrowthTargetIds ?? [];
  const sub = buildGrowthSubAllocation({ growthBucketPct: 100, riskLevel: args.riskLevel ?? null, heldTargetIds: held });

  const rawGrowth: { targetId: ContributionLegTargetId; usd: number }[] = [];
  if (cryptoUsd > 0) {
    if (sub.status === "configured") {
      for (const id of sub.participatingTargetIds) {
        rawGrowth.push({ targetId: id, usd: ((sub.sharePctByInvestmentTargetId[id] as number) / 100) * cryptoUsd });
      }
    } else {
      // Single held growth asset, or none stated → default to SOL (previous behavior).
      const only = (sub.participatingTargetIds[0] ?? "sol") as ContributionLegTargetId;
      rawGrowth.push({ targetId: only, usd: cryptoUsd });
    }
  }

  const legs = applyMinimum([...rawGrowth, { targetId: "usdc", usd: usdcUsd }], C);
  const growthLegCount = legs.filter((l) => l.targetId !== "usdc").length;

  return {
    totalUsd: P,
    stableUsd: Vs,
    contributionUsd: C,
    legs,
    cryptoUsd,
    usdcUsd,
    growthSubAllocated: growthLegCount > 1,
    targetCryptoPct: tC,
    targetStablePct: 100 - tC,
  };
}
