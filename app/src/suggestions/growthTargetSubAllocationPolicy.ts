/**
 * growthTargetSubAllocationPolicy — the APPROVED split of the GROWTH bucket
 * across the enabled growth assets (SOL / BTC / ETH).
 *
 * `growthTargetAllocationPolicy` (Step 15C) maps the engine's stable/growth
 * buckets onto investment targets, but fails closed with more than one enabled
 * growth target (`multiple_growth_targets_require_suballocation_policy`). This
 * module is that missing policy.
 *
 * Two rules, both deliberate:
 *
 * 1. HELD ASSETS ONLY. Only growth assets the user actually holds participate.
 *    WealthSmith never introduces an asset the user has not chosen — telling a
 *    SOL-only holder to start buying BTC would be asset-selection advice, which
 *    the product does not give. Holding nothing yet falls back to the single
 *    enabled growth target (SOL), so existing behavior is unchanged.
 *
 * 2. RISK-TIERED WEIGHTS. Among the assets held, the split follows the saved
 *    risk level, on the same principle as the risk-based Safety Buffer target:
 *    lower risk leans to the most established asset (BTC), higher risk accepts
 *    more volatility for growth (SOL). Weights are relative and renormalized
 *    over whatever the user actually holds, so they always total the growth
 *    bucket exactly.
 *
 * Pure policy: percentages only. It selects no funding source, calculates no
 * contribution amount, generates no plan or suggestion, and moves nothing.
 * Fails closed — an unknown risk level or an empty/invalid growth bucket yields
 * no split (callers keep their existing single-target behavior).
 */

export const GROWTH_SUB_ALLOCATION_POLICY_ID = "growth_target_suballocation_v1";
export const GROWTH_SUB_ALLOCATION_POLICY_VERSION = "1.0.0";

/** Growth assets this policy can split. Order is display order, not priority. */
export const GROWTH_SUB_ALLOCATION_TARGET_IDS = ["btc", "eth", "sol"] as const;
export type GrowthSubAllocationTargetId = (typeof GROWTH_SUB_ALLOCATION_TARGET_IDS)[number];

/**
 * APPROVED relative weights per saved risk level. Each row totals 100 and is
 * renormalized over the assets actually held.
 *
 * Rationale (documented so the split is explainable, never invented): BTC is the
 * longest-established and least volatile of the three, SOL the most volatile and
 * highest-beta, ETH between them. Lower risk therefore tilts toward BTC; higher
 * risk tilts toward SOL. This mirrors RISK_BUFFER_TARGET_MONTHS, where lower risk
 * holds a larger stable reserve.
 */
export const GROWTH_SUB_ALLOCATION_WEIGHTS: Record<string, Record<GrowthSubAllocationTargetId, number>> = {
  very_low: { btc: 60, eth: 25, sol: 15 },
  low: { btc: 50, eth: 30, sol: 20 },
  medium: { btc: 40, eth: 30, sol: 30 },
  high: { btc: 30, eth: 30, sol: 40 },
  very_high: { btc: 25, eth: 25, sol: 50 },
};

export type GrowthSubAllocationStatus = "configured" | "not_applicable" | "invalid";

export type GrowthSubAllocationBlocker =
  | "risk_level_missing_or_unknown"
  | "growth_bucket_invalid"
  | "no_held_growth_targets";

export interface GrowthSubAllocationResult {
  policyId: typeof GROWTH_SUB_ALLOCATION_POLICY_ID;
  policyVersion: typeof GROWTH_SUB_ALLOCATION_POLICY_VERSION;
  status: GrowthSubAllocationStatus;
  /** The growth bucket being split (percent of the whole portfolio). */
  growthBucketPct: number;
  /** Percent OF THE WHOLE PORTFOLIO per target; totals growthBucketPct. */
  targetPctByInvestmentTargetId: Partial<Record<GrowthSubAllocationTargetId, number>>;
  /** Share OF THE GROWTH BUCKET per target (totals 100) — for explanatory copy. */
  sharePctByInvestmentTargetId: Partial<Record<GrowthSubAllocationTargetId, number>>;
  /** The assets that participated (held, in policy order). */
  participatingTargetIds: GrowthSubAllocationTargetId[];
  riskLevel: string | null;
  blockers: GrowthSubAllocationBlocker[];
  /** Capability flags — this policy decides percentages and nothing else. */
  contributionAmountCalculated: false;
  fundingSourceSelected: false;
  suggestionGenerated: false;
  transactionsEnabled: false;
}

const PCT_TOLERANCE = 1e-9;

function shell(
  status: GrowthSubAllocationStatus,
  growthBucketPct: number,
  riskLevel: string | null,
  extra: Partial<GrowthSubAllocationResult> = {}
): GrowthSubAllocationResult {
  return {
    policyId: GROWTH_SUB_ALLOCATION_POLICY_ID,
    policyVersion: GROWTH_SUB_ALLOCATION_POLICY_VERSION,
    status,
    growthBucketPct,
    targetPctByInvestmentTargetId: {},
    sharePctByInvestmentTargetId: {},
    participatingTargetIds: [],
    riskLevel,
    blockers: [],
    contributionAmountCalculated: false,
    fundingSourceSelected: false,
    suggestionGenerated: false,
    transactionsEnabled: false,
    ...extra,
  };
}

export interface BuildGrowthSubAllocationInput {
  /** Growth/crypto bucket target as a percent of the whole portfolio (e.g. 63.5). */
  growthBucketPct: number;
  /** Saved risk tolerance (goal.risk_tolerance). */
  riskLevel: string | null | undefined;
  /**
   * Growth assets the user actually holds. Only these participate — the policy
   * never introduces an asset the user has not chosen.
   */
  heldTargetIds: readonly string[];
}

/**
 * Split the growth bucket across the held growth assets by risk-tiered weights.
 *
 * Returns `not_applicable` (with no split) when a single asset is held — the
 * caller keeps its existing single-target mapping unchanged.
 */
export function buildGrowthSubAllocation(input: BuildGrowthSubAllocationInput): GrowthSubAllocationResult {
  const growthBucketPct = input?.growthBucketPct;
  const riskLevel = input?.riskLevel ?? null;

  if (typeof growthBucketPct !== "number" || !Number.isFinite(growthBucketPct) || growthBucketPct < 0 || growthBucketPct > 100) {
    return shell("invalid", Number.isFinite(growthBucketPct) ? growthBucketPct : 0, riskLevel, {
      blockers: ["growth_bucket_invalid"],
    });
  }

  // Held assets, filtered to the ones this policy knows and kept in policy order.
  const held = GROWTH_SUB_ALLOCATION_TARGET_IDS.filter((id) => input.heldTargetIds?.includes(id));

  if (held.length === 0) {
    return shell("not_applicable", growthBucketPct, riskLevel, { blockers: ["no_held_growth_targets"] });
  }
  // One asset → nothing to split; the caller's existing single-target path applies.
  if (held.length === 1) {
    return shell("not_applicable", growthBucketPct, riskLevel, { participatingTargetIds: [...held] });
  }

  const weights = riskLevel ? GROWTH_SUB_ALLOCATION_WEIGHTS[riskLevel] : undefined;
  if (!weights) {
    // Never assume a risk level — an unknown one yields no split, exactly as the
    // Safety Buffer target returns null rather than a silent 3-month default.
    return shell("invalid", growthBucketPct, riskLevel, { blockers: ["risk_level_missing_or_unknown"] });
  }

  const weightTotal = held.reduce((sum, id) => sum + weights[id], 0);
  if (weightTotal <= 0) {
    return shell("invalid", growthBucketPct, riskLevel, { blockers: ["no_held_growth_targets"] });
  }

  const targetPctByInvestmentTargetId: Partial<Record<GrowthSubAllocationTargetId, number>> = {};
  const sharePctByInvestmentTargetId: Partial<Record<GrowthSubAllocationTargetId, number>> = {};
  for (const id of held) {
    const share = (weights[id] / weightTotal) * 100;
    sharePctByInvestmentTargetId[id] = share;
    targetPctByInvestmentTargetId[id] = (share / 100) * growthBucketPct;
  }

  return shell("configured", growthBucketPct, riskLevel, {
    targetPctByInvestmentTargetId,
    sharePctByInvestmentTargetId,
    participatingTargetIds: [...held],
  });
}

export interface GrowthSubAllocationValidation {
  valid: boolean;
  errors: string[];
}

/** Validate a policy result. Fails closed. */
export function validateGrowthSubAllocation(result: unknown): GrowthSubAllocationValidation {
  const errors: string[] = [];
  if (!result || typeof result !== "object") return { valid: false, errors: ["result_not_an_object"] };
  const r = result as GrowthSubAllocationResult;
  if (r.policyId !== GROWTH_SUB_ALLOCATION_POLICY_ID) errors.push("wrong_policy_id");
  if (r.policyVersion !== GROWTH_SUB_ALLOCATION_POLICY_VERSION) errors.push("wrong_policy_version");
  const flagsFalse =
    r.contributionAmountCalculated === false &&
    r.fundingSourceSelected === false &&
    r.suggestionGenerated === false &&
    r.transactionsEnabled === false;
  if (!flagsFalse) errors.push("capability_flag_enabled");

  if (r.status === "configured") {
    if (r.participatingTargetIds.length < 2) errors.push("configured_requires_multiple_targets");
    const shares = r.participatingTargetIds.map((id) => r.sharePctByInvestmentTargetId[id] ?? NaN);
    const pcts = r.participatingTargetIds.map((id) => r.targetPctByInvestmentTargetId[id] ?? NaN);
    if (shares.some((n) => !Number.isFinite(n)) || pcts.some((n) => !Number.isFinite(n))) {
      errors.push("missing_target_percentage");
    } else {
      // Shares total 100, and the per-target percentages total the growth bucket.
      if (Math.abs(shares.reduce((a, b) => a + b, 0) - 100) > 1e-6) errors.push("shares_do_not_total_100");
      if (Math.abs(pcts.reduce((a, b) => a + b, 0) - r.growthBucketPct) > 1e-6) errors.push("targets_do_not_total_growth_bucket");
    }
    // No participating asset may be one the user does not hold (checked by the caller
    // supplying heldTargetIds); here we only assert none is unknown to the policy.
    if (r.participatingTargetIds.some((id) => !GROWTH_SUB_ALLOCATION_TARGET_IDS.includes(id))) {
      errors.push("unknown_growth_target");
    }
  } else if (r.status === "invalid" && r.blockers.length === 0) {
    errors.push("invalid_without_blocker");
  }
  return { valid: errors.length === 0, errors };
}

/** Weights row for a risk level, or null when the level is unknown. */
export function getGrowthSubAllocationWeights(
  riskLevel: string | null | undefined
): Record<GrowthSubAllocationTargetId, number> | null {
  if (!riskLevel) return null;
  return GROWTH_SUB_ALLOCATION_WEIGHTS[riskLevel] ?? null;
}

/** True when every approved weights row totals 100 (guards the table itself). */
export function growthSubAllocationWeightsAreWellFormed(): boolean {
  return Object.values(GROWTH_SUB_ALLOCATION_WEIGHTS).every((row) => {
    const total = GROWTH_SUB_ALLOCATION_TARGET_IDS.reduce((sum, id) => sum + row[id], 0);
    return Math.abs(total - 100) <= PCT_TOLERANCE;
  });
}
