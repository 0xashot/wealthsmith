/**
 * growthTargetAllocationPolicy — Step 15C. Maps the EXISTING WealthSmith target-allocation engine's
 * stable/volatile bucket output onto the generic investment-target registry buckets. It does NOT
 * reproduce any allocation matrix and does NOT recalculate — it consumes the engine's exact
 * percentages (`wallet/recommendedAllocation.ts` → `RecommendedAllocation.stablePct/cryptoPct`,
 * SUGGESTION_ENGINE_VERSION) and maps: stable bucket → USDC, growth bucket → the single enabled
 * growth contribution target (SOL today). It fails closed if the engine output is invalid or if
 * more than one growth target is enabled without a versioned sub-allocation policy.
 *
 * The Safety Buffer is NOT part of this percentage adapter — it is a separate dollar floor a later
 * contribution planner must preserve. This step evaluates no buffer, no gap, no amount.
 */
import {
  CONTRIBUTION_PLANNING_POLICY_SCHEMA_VERSION,
  GROWTH_TARGET_ALLOCATION_POLICY_ID,
  GROWTH_TARGET_ALLOCATION_POLICY_VERSION,
} from "./contributionPlanningPolicyTypes";
import { getEnabledContributionGrowthTargets } from "./investmentTargetRegistry";

export const GROWTH_TARGET_ALLOCATION_POLICY_EXISTS = true;
/** Stable-bucket target id (MVP): USDC. Growth bucket maps to the single enabled growth target. */
export const STABLE_BUCKET_TARGET_ID = "usdc";
const ALLOCATION_SUM_TOLERANCE = 1e-9;

/** Narrow boundary shape carrying the EXISTING engine's exact bucket percentages (never rounded). */
export interface ExistingTargetAllocationInput {
  targetStablePct: number;
  targetVolatilePct: number;
  sourceEngineVersion: string;
  sourcePolicyVersion?: string;
  calculatedAt?: string;
}

export interface GrowthTargetAllocationPolicyResult {
  schemaVersion: "1.0.0";
  policyId: "growth_target_allocation_v1";
  policyVersion: "1.0.0";

  status: "configured" | "invalid";

  sourceEngineVersion: string;
  sourcePolicyVersion?: string;

  stableBucketTargetPct: number;
  growthBucketTargetPct: number;

  targetPctByInvestmentTargetId: Record<string, number>;

  enabledGrowthTargetIds: string[];

  singleEnabledGrowthTargetPolicyApplied: boolean;
  futureGrowthSuballocationRequired: boolean;

  safetyBufferIsSeparateFloor: true;
  safetyBufferEvaluated: false;
  allocationGapEvaluated: false;
  userContributionEvaluated: false;
  targetSelectedForSuggestion: false;
  suggestionGenerated: false;

  blockers: string[];
  warnings: string[];

  transactionsEnabled: false;
  walletSignatureRequired: false;
}

export interface BuildGrowthAllocationOptions {
  /** Override the enabled growth targets (fixtures only). Defaults to the registry. */
  enabledGrowthTargetIds?: string[];
}

function shell(input: ExistingTargetAllocationInput, status: "configured" | "invalid", extra: Partial<GrowthTargetAllocationPolicyResult> = {}): GrowthTargetAllocationPolicyResult {
  return {
    schemaVersion: CONTRIBUTION_PLANNING_POLICY_SCHEMA_VERSION,
    policyId: GROWTH_TARGET_ALLOCATION_POLICY_ID,
    policyVersion: GROWTH_TARGET_ALLOCATION_POLICY_VERSION,
    status,
    sourceEngineVersion: input?.sourceEngineVersion ?? "unknown",
    ...(input?.sourcePolicyVersion ? { sourcePolicyVersion: input.sourcePolicyVersion } : {}),
    stableBucketTargetPct: 0,
    growthBucketTargetPct: 0,
    targetPctByInvestmentTargetId: {},
    enabledGrowthTargetIds: [],
    singleEnabledGrowthTargetPolicyApplied: false,
    futureGrowthSuballocationRequired: false,
    safetyBufferIsSeparateFloor: true,
    safetyBufferEvaluated: false,
    allocationGapEvaluated: false,
    userContributionEvaluated: false,
    targetSelectedForSuggestion: false,
    suggestionGenerated: false,
    blockers: [],
    warnings: [],
    transactionsEnabled: false,
    walletSignatureRequired: false,
    ...extra,
  };
}

/**
 * Build the contribution-planning allocation-policy result from the existing engine output.
 * Preserves the engine's exact stable/growth percentages; maps stable → USDC and growth → the
 * single enabled growth target. Fails closed on invalid input or a multi-growth-target cohort
 * without a sub-allocation policy.
 */
export function buildGrowthTargetAllocationPolicyResult(
  input: ExistingTargetAllocationInput,
  options: BuildGrowthAllocationOptions = {},
): GrowthTargetAllocationPolicyResult {
  if (!input || typeof input !== "object") return shell({ sourceEngineVersion: "unknown" } as ExistingTargetAllocationInput, "invalid", { blockers: ["target_allocation_missing"] });

  const stable = input.targetStablePct;
  const growth = input.targetVolatilePct;
  const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
  if (!finite(stable) || !finite(growth) || stable < 0 || growth < 0 || Math.abs(stable + growth - 100) > ALLOCATION_SUM_TOLERANCE) {
    return shell(input, "invalid", { blockers: ["target_allocation_invalid"] });
  }
  if (!input.sourceEngineVersion || typeof input.sourceEngineVersion !== "string") {
    return shell(input, "invalid", { blockers: ["target_allocation_version_unsupported"] });
  }

  const enabledGrowthTargetIds = options.enabledGrowthTargetIds ?? getEnabledContributionGrowthTargets().map((t) => t.targetId);

  // No enabled growth target → cannot map the growth bucket.
  if (enabledGrowthTargetIds.length === 0) {
    return shell(input, "invalid", { stableBucketTargetPct: stable, growthBucketTargetPct: growth, enabledGrowthTargetIds, blockers: ["target_not_in_enabled_bucket"] });
  }
  // More than one enabled growth target → a versioned sub-allocation policy is required; fail closed.
  if (enabledGrowthTargetIds.length > 1) {
    return shell(input, "invalid", { stableBucketTargetPct: stable, growthBucketTargetPct: growth, enabledGrowthTargetIds, futureGrowthSuballocationRequired: true, blockers: ["multiple_growth_targets_require_suballocation_policy"] });
  }

  // Single enabled growth target (SOL today): stable → USDC, entire growth bucket → that target.
  const growthTargetId = enabledGrowthTargetIds[0];
  return shell(input, "configured", {
    stableBucketTargetPct: stable,
    growthBucketTargetPct: growth,
    targetPctByInvestmentTargetId: { [STABLE_BUCKET_TARGET_ID]: stable, [growthTargetId]: growth },
    enabledGrowthTargetIds,
    singleEnabledGrowthTargetPolicyApplied: true,
    futureGrowthSuballocationRequired: false,
    warnings: [`Growth bucket mapped entirely to '${growthTargetId}' (the only enabled growth target). A versioned sub-allocation policy is required before enabling additional growth targets.`],
  });
}

export interface GrowthAllocationValidationResult {
  valid: boolean;
  errors: string[];
}

/** Validate a policy result. Fails closed. */
export function validateGrowthTargetAllocationPolicyResult(result: unknown): GrowthAllocationValidationResult {
  const errors: string[] = [];
  if (!result || typeof result !== "object") return { valid: false, errors: ["result_not_an_object"] };
  const r = result as GrowthTargetAllocationPolicyResult;
  if (r.schemaVersion !== CONTRIBUTION_PLANNING_POLICY_SCHEMA_VERSION) errors.push("wrong_schema_version");
  if (r.policyId !== GROWTH_TARGET_ALLOCATION_POLICY_ID) errors.push("wrong_policy_id");
  if (r.policyVersion !== GROWTH_TARGET_ALLOCATION_POLICY_VERSION) errors.push("wrong_policy_version");
  if (r.safetyBufferIsSeparateFloor !== true) errors.push("safety_buffer_not_separate_floor");
  const flagsFalse = r.safetyBufferEvaluated === false && r.allocationGapEvaluated === false && r.userContributionEvaluated === false && r.targetSelectedForSuggestion === false && r.suggestionGenerated === false && r.transactionsEnabled === false && r.walletSignatureRequired === false;
  if (!flagsFalse) errors.push("capability_flag_enabled");
  if (r.status === "configured") {
    if (Math.abs(r.stableBucketTargetPct + r.growthBucketTargetPct - 100) > ALLOCATION_SUM_TOLERANCE) errors.push("buckets_do_not_sum_100");
    if (r.enabledGrowthTargetIds.length !== 1 || !r.singleEnabledGrowthTargetPolicyApplied) errors.push("configured_requires_single_growth_target");
    const gid = r.enabledGrowthTargetIds[0];
    if (r.targetPctByInvestmentTargetId[STABLE_BUCKET_TARGET_ID] !== r.stableBucketTargetPct) errors.push("stable_map_mismatch");
    if (r.targetPctByInvestmentTargetId[gid] !== r.growthBucketTargetPct) errors.push("growth_map_mismatch");
  } else {
    if (r.blockers.length === 0) errors.push("invalid_without_blocker");
  }
  return { valid: errors.length === 0, errors };
}

export interface GrowthAllocationDiagnostics {
  policyId: string;
  policyVersion: string;
  status: string;
  sourceEngineVersion: string;
  stableBucketTargetPct: number;
  growthBucketTargetPct: number;
  targetPctByInvestmentTargetId: Record<string, number>;
  enabledGrowthTargetIds: string[];
  futureGrowthSuballocationRequired: boolean;
  safetyBufferEvaluated: false;
  allocationGapEvaluated: false;
  blockers: string[];
  warnings: string[];
}

export function getGrowthTargetAllocationPolicyDiagnostics(result: GrowthTargetAllocationPolicyResult): GrowthAllocationDiagnostics {
  return {
    policyId: result.policyId,
    policyVersion: result.policyVersion,
    status: result.status,
    sourceEngineVersion: result.sourceEngineVersion,
    stableBucketTargetPct: result.stableBucketTargetPct,
    growthBucketTargetPct: result.growthBucketTargetPct,
    targetPctByInvestmentTargetId: result.targetPctByInvestmentTargetId,
    enabledGrowthTargetIds: result.enabledGrowthTargetIds,
    futureGrowthSuballocationRequired: result.futureGrowthSuballocationRequired,
    safetyBufferEvaluated: false,
    allocationGapEvaluated: false,
    blockers: result.blockers,
    warnings: result.warnings,
  };
}
