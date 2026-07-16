/**
 * yieldStrategyEligibleCapital — Step 16F. Builds the user-level ELIGIBLE-CAPITAL snapshot: lane-level
 * Safety-Buffer-Yield and Excess-USDC-Yield SOURCE CAPACITY from injected canonical Safety-Buffer +
 * direct-liquid-USDC + normalized positions, plus current comparison-leader holding status. It
 * calculates source capacities only — it selects NO product, NO final amount, generates NO plan or
 * suggestion, updates NO product output, reruns NO comparison, and enables NO transaction/signature.
 * Amounts are floored to exact cents and never rounded up beyond available capacity.
 */
import {
  YIELD_STRATEGY_CAPITAL_POLICY_ID,
  YIELD_STRATEGY_CAPITAL_POLICY_VERSION,
  YIELD_STRATEGY_CAPITAL_SCHEMA_VERSION,
  type YieldStrategyEligibleCapitalSnapshot,
  type YieldStrategyPositionSet,
  type YieldStrategyPositionValidationResult,
} from "./yieldStrategyPositionTypes";
import {
  YIELD_STRATEGY_BUFFER_YIELD_MINIMUM_POLICY_AVAILABLE,
  YIELD_STRATEGY_EXCESS_YIELD_MINIMUM_USD,
  getYieldStrategyBufferAllocation,
} from "./yieldStrategyCapitalPolicy";
import { getYieldStrategyLeaderPositionStatus } from "./yieldStrategyPositionEngine";
import type { YieldStrategyEligibilitySet } from "./yieldStrategyEligibilityTypes";
import type { YieldStrategyComparisonSet } from "./yieldStrategyComparisonTypes";

export const YIELD_STRATEGY_ELIGIBLE_CAPITAL_EXISTS = true;

const isFiniteNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
/** Floor USD to exact cents — exact when already whole cents, else floor down. NEVER rounds up. */
function floorUsd(x: number): number {
  const s = Math.max(0, x) * 100;
  const r = Math.round(s);
  return (Math.abs(s - r) <= 1e-6 ? r : Math.floor(s)) / 100;
}

export interface CanonicalSafetyBufferInput {
  requiredBufferUsd: number;
  bufferComplete: boolean;
  /** Direct-wallet USDC currently counted toward the Safety Buffer (canonical Step-15/buffer value). */
  directWalletEligibleBufferUsd: number;
  available?: boolean;
}
export interface DirectWalletLiquiditySnapshotInput {
  /** Canonical Step-15 direct liquid USDC (direct_wallet_balance / liquid_now). */
  directLiquidUsdcUsd: number;
  available?: boolean;
}

export interface BuildYieldStrategyEligibleCapitalInput {
  ownerAddress: string;
  userRiskProfileId?: string;
  canonicalSafetyBuffer: CanonicalSafetyBufferInput;
  directWalletLiquiditySnapshot: DirectWalletLiquiditySnapshotInput;
  positionSet: YieldStrategyPositionSet;
  eligibilitySet?: YieldStrategyEligibilitySet;
  comparisonSet?: YieldStrategyComparisonSet;
  checkedAt: string;
}

/** Build the lane-level eligible-capital snapshot. Source capacities only — no product/amount/plan. */
export function buildYieldStrategyEligibleCapitalSnapshot(input: BuildYieldStrategyEligibleCapitalInput): YieldStrategyEligibleCapitalSnapshot {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const notes: string[] = [];
  const csb = input.canonicalSafetyBuffer;
  const liq = input.directWalletLiquiditySnapshot;

  const bufferLeaderPositionStatus = getYieldStrategyLeaderPositionStatus("buffer", input.comparisonSet, input.positionSet);
  const excessLeaderPositionStatus = getYieldStrategyLeaderPositionStatus("excess", input.comparisonSet, input.positionSet);

  // Injected-input validity.
  const inputsValid = csb && liq && isFiniteNum(csb.requiredBufferUsd) && csb.requiredBufferUsd >= 0 && isFiniteNum(csb.directWalletEligibleBufferUsd) && csb.directWalletEligibleBufferUsd >= 0 && isFiniteNum(liq.directLiquidUsdcUsd) && liq.directLiquidUsdcUsd >= 0;
  if (!csb || csb.available === false) blockers.push("safety_buffer_data_missing");
  if (!liq || liq.available === false || !isFiniteNum(liq?.directLiquidUsdcUsd)) blockers.push("no_direct_liquid_usdc");

  const allocation = getYieldStrategyBufferAllocation(input.userRiskProfileId);
  if (!input.userRiskProfileId) blockers.push("user_risk_profile_missing");
  else if (!allocation) blockers.push("user_risk_profile_unknown");

  // Existing eligible buffer-yield value (canonical positions currently counting toward the buffer).
  const existingEligibleBufferYieldUsd = input.positionSet.canonicalEconomicPositions
    .filter((p) => p.countsTowardSafetyBuffer && isFiniteNum(p.currentValueUsd))
    .reduce((s, p) => s + (p.currentValueUsd as number), 0);

  const requiredBufferUsd = isFiniteNum(csb?.requiredBufferUsd) ? csb.requiredBufferUsd : 0;
  const directWalletEligibleBufferUsd = isFiniteNum(csb?.directWalletEligibleBufferUsd) ? csb.directWalletEligibleBufferUsd : 0;
  const directLiquidUsdcUsd = isFiniteNum(liq?.directLiquidUsdcUsd) ? liq.directLiquidUsdcUsd : 0;
  const bufferComplete = !!csb?.bufferComplete;

  const vaultAllocationPct = allocation?.vaultAllocationPct ?? 0;
  const walletAllocationPct = allocation?.walletAllocationPct ?? 0;

  const currentEligibleBufferUsd = directWalletEligibleBufferUsd + existingEligibleBufferYieldUsd;
  const bufferShortfallUsd = Math.max(0, requiredBufferUsd - currentEligibleBufferUsd);
  const canonicalBufferSurplusUsd = Math.max(0, currentEligibleBufferUsd - requiredBufferUsd);

  const allowedBufferYieldUsd = requiredBufferUsd * vaultAllocationPct;
  const requiredWalletFloorUsd = requiredBufferUsd * walletAllocationPct;
  const remainingBufferYieldCapacityUsd = Math.max(0, allowedBufferYieldUsd - existingEligibleBufferYieldUsd);
  const reservedDirectWalletBufferUsd = Math.max(requiredWalletFloorUsd, requiredBufferUsd - existingEligibleBufferYieldUsd);
  const directWalletRequiredBufferSliceUsd = Math.min(directWalletEligibleBufferUsd, reservedDirectWalletBufferUsd);
  const movableRequiredBufferAboveWalletFloorUsd = Math.max(0, directWalletRequiredBufferSliceUsd - requiredWalletFloorUsd);
  const rawBufferYieldCapitalUsd = floorUsd(Math.min(directLiquidUsdcUsd, movableRequiredBufferAboveWalletFloorUsd, remainingBufferYieldCapacityUsd));

  const reservedDirectWalletUsd = Math.max(requiredWalletFloorUsd, requiredBufferUsd - existingEligibleBufferYieldUsd);
  const directWalletExcessSliceUsd = Math.max(0, directWalletEligibleBufferUsd - reservedDirectWalletUsd);
  const rawExcessYieldCapitalUsd = floorUsd(Math.min(directLiquidUsdcUsd, canonicalBufferSurplusUsd, directWalletExcessSliceUsd));

  // Lane eligibility gating.
  const hardBlocked = blockers.length > 0 || !inputsValid;
  const bufferYieldEligibleCapitalUsd = !hardBlocked && bufferComplete && !!allocation && rawBufferYieldCapitalUsd > 0 ? rawBufferYieldCapitalUsd : 0;
  const excessYieldMeetsMinimum = rawExcessYieldCapitalUsd >= YIELD_STRATEGY_EXCESS_YIELD_MINIMUM_USD;
  const excessYieldEligibleCapitalUsd = !hardBlocked && bufferComplete && excessYieldMeetsMinimum ? rawExcessYieldCapitalUsd : 0;
  if (!bufferComplete) blockers.push("safety_buffer_incomplete");
  if (bufferComplete && rawExcessYieldCapitalUsd > 0 && !excessYieldMeetsMinimum) { blockers.push("excess_yield_below_minimum"); }
  if (bufferComplete && canonicalBufferSurplusUsd <= 0) warnings.push("no_canonical_buffer_surplus");

  // Shared-source overlap — lane maxima share the same direct-wallet USDC source.
  const maximumCombinedSourceCapitalUsd = floorUsd(Math.min(directLiquidUsdcUsd, rawBufferYieldCapitalUsd + rawExcessYieldCapitalUsd));
  const sharedSourceOverlapUsd = Math.max(0, floorUsd(rawBufferYieldCapitalUsd + rawExcessYieldCapitalUsd - maximumCombinedSourceCapitalUsd));
  const sharedSourceOverlapPossible = rawBufferYieldCapitalUsd > 0 && rawExcessYieldCapitalUsd > 0;
  notes.push("Lane-level capacities are maximum INDEPENDENT capacities and must not be added when they share the same direct-wallet USDC source (16G resolves overlap).");

  let status: YieldStrategyEligibleCapitalSnapshot["status"];
  if (!inputsValid) status = "invalid";
  else if (!allocation || blockers.includes("no_direct_liquid_usdc") || blockers.includes("safety_buffer_data_missing")) status = "blocked";
  else if (!bufferComplete) status = "buffer_incomplete";
  else if (bufferYieldEligibleCapitalUsd > 0 || excessYieldEligibleCapitalUsd > 0) status = "ready";
  else if (rawExcessYieldCapitalUsd > 0 && !excessYieldMeetsMinimum) status = "below_minimum";
  else status = "partial";

  return {
    schemaVersion: YIELD_STRATEGY_CAPITAL_SCHEMA_VERSION,
    policyId: YIELD_STRATEGY_CAPITAL_POLICY_ID,
    policyVersion: YIELD_STRATEGY_CAPITAL_POLICY_VERSION,
    ownerAddress: input.ownerAddress,
    checkedAt: input.checkedAt,
    ...(input.userRiskProfileId ? { userRiskProfileId: input.userRiskProfileId } : {}),
    status,
    requiredBufferUsd,
    directWalletEligibleBufferUsd,
    existingEligibleBufferYieldUsd,
    currentEligibleBufferUsd,
    bufferShortfallUsd,
    canonicalBufferSurplusUsd,
    bufferComplete,
    vaultAllocationPct,
    walletAllocationPct,
    allowedBufferYieldUsd,
    requiredWalletFloorUsd,
    remainingBufferYieldCapacityUsd,
    directLiquidUsdcUsd,
    rawBufferYieldCapitalUsd,
    bufferYieldEligibleCapitalUsd,
    ...(YIELD_STRATEGY_BUFFER_YIELD_MINIMUM_POLICY_AVAILABLE ? { bufferYieldMinimumUsd: 0 } : {}),
    bufferYieldMinimumPolicyAvailable: YIELD_STRATEGY_BUFFER_YIELD_MINIMUM_POLICY_AVAILABLE,
    rawExcessYieldCapitalUsd,
    excessYieldEligibleCapitalUsd,
    excessYieldMinimumUsd: YIELD_STRATEGY_EXCESS_YIELD_MINIMUM_USD,
    excessYieldMeetsMinimum,
    maximumCombinedSourceCapitalUsd,
    sharedSourceOverlapPossible,
    sharedSourceOverlapUsd,
    bufferLeaderPositionStatus,
    excessLeaderPositionStatus,
    comparisonPerformed: false,
    productSelected: false,
    amountSelected: false,
    planGenerated: false,
    suggestionGenerated: false,
    updatesProductOutput: false,
    transactionsEnabled: false,
    walletSignatureRequired: false,
    blockers,
    warnings,
    notes,
  };
}

/** Validate the eligible-capital snapshot. Fails closed on any capacity/precision/flag violation. */
export function validateYieldStrategyEligibleCapitalSnapshot(snapshot: unknown): YieldStrategyPositionValidationResult {
  const errors: string[] = [];
  if (!snapshot || typeof snapshot !== "object") return { valid: false, errors: ["snapshot_not_an_object"] };
  const s = snapshot as YieldStrategyEligibleCapitalSnapshot;
  if (s.schemaVersion !== YIELD_STRATEGY_CAPITAL_SCHEMA_VERSION) errors.push("wrong_schema_version");
  if (s.policyId !== YIELD_STRATEGY_CAPITAL_POLICY_ID) errors.push("wrong_policy_id");
  const flagsOff = s.comparisonPerformed === false && s.productSelected === false && s.amountSelected === false && s.planGenerated === false && s.suggestionGenerated === false && s.updatesProductOutput === false && s.transactionsEnabled === false && s.walletSignatureRequired === false;
  if (!flagsOff) errors.push("capability_flag_enabled");

  // Buffer incomplete ⇒ zero yield capital.
  if (!s.bufferComplete && (s.bufferYieldEligibleCapitalUsd > 0 || s.excessYieldEligibleCapitalUsd > 0)) errors.push("incomplete_buffer_with_positive_capital");
  // Capacity bounds.
  if (s.bufferYieldEligibleCapitalUsd > s.directLiquidUsdcUsd + 1e-9) errors.push("buffer_capital_exceeds_direct_usdc");
  if (s.bufferYieldEligibleCapitalUsd > s.remainingBufferYieldCapacityUsd + 1e-9) errors.push("buffer_capital_exceeds_remaining_capacity");
  if (s.excessYieldEligibleCapitalUsd > s.directLiquidUsdcUsd + 1e-9) errors.push("excess_capital_exceeds_direct_usdc");
  if (s.excessYieldEligibleCapitalUsd > s.canonicalBufferSurplusUsd + 1e-9) errors.push("excess_capital_exceeds_surplus");
  // Below-minimum excess must be zero eligible.
  if (s.excessYieldEligibleCapitalUsd > 0 && !s.excessYieldMeetsMinimum) errors.push("below_minimum_excess_marked_eligible");
  // Negative / non-finite.
  for (const [k, v] of [["rawBuffer", s.rawBufferYieldCapitalUsd], ["rawExcess", s.rawExcessYieldCapitalUsd], ["bufferEligible", s.bufferYieldEligibleCapitalUsd], ["excessEligible", s.excessYieldEligibleCapitalUsd]] as const) {
    if (!(isFiniteNum(v) && v >= 0)) errors.push(`invalid_${k}`);
  }
  // Exact cents (no sub-cent residue).
  for (const v of [s.bufferYieldEligibleCapitalUsd, s.excessYieldEligibleCapitalUsd]) {
    if (Math.abs(Math.round(v * 100) - v * 100) > 1e-6) errors.push("cents_precision_violation");
  }
  // Shared overlap must not let combined exceed direct USDC.
  if (s.maximumCombinedSourceCapitalUsd > s.directLiquidUsdcUsd + 1e-9) errors.push("combined_exceeds_direct_usdc");
  return { valid: errors.length === 0, errors };
}
