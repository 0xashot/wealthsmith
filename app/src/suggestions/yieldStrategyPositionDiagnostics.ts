/**
 * yieldStrategyPositionDiagnostics — Step 16F. Deterministic, read-only diagnostics for the position
 * set and the eligible-capital snapshot, plus recommendation-free explanations. Reports facts only —
 * never best / safest / winner / recommended / move / deposit now / switch / "you should".
 */
import type {
  YieldStrategyEligibleCapitalSnapshot,
  YieldStrategyPosition,
  YieldStrategyPositionSet,
} from "./yieldStrategyPositionTypes";

export interface YieldStrategyPositionDiagnostics {
  totalInputRecords: number;
  canonicalEconomicPositions: number;
  duplicateRepresentations: number;
  conflictingPositions: number;
  matchedApproved: number;
  matchedNonapproved: number;
  unmatched: number;
  ambiguous: number;
  invalid: number;
  observedUndocumentedProducts: number;
  observedProductAddresses: string[];
  positionsByProtocol: Record<string, number>;
  positionsByStrategy: Record<string, number>;
  positionsByMechanic: Record<string, number>;
  freshValueUsd: number;
  staleValueUsd: number;
  unavailableCount: number;
  countedTowardBuffer: number;
  excludedFromBuffer: Array<{ positionId: string; reason: string }>;
  comparisonPerformed: false;
  planGenerated: false;
  suggestionGenerated: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;
}

const val = (p: YieldStrategyPosition): number => (typeof p.currentValueUsd === "number" && Number.isFinite(p.currentValueUsd) ? p.currentValueUsd : 0);

function bufferExclusionReason(p: YieldStrategyPosition): string | undefined {
  if (p.countsTowardSafetyBuffer) return undefined;
  if (p.matchStatus === "unmatched") return "unmatched_product";
  if (p.matchStatus === "matched_nonapproved") return "product_not_approved";
  if (p.matchStatus === "ambiguous") return "position_ambiguous";
  if (p.matchStatus === "invalid") return "position_invalid";
  if (p.matchedRiskLane !== "buffer_eligible") return "excess_only_or_unsupported_lane";
  if (p.valuationStatus === "stale") return "stale_value";
  if (p.valuationStatus !== "complete") return "value_unavailable";
  return "not_currently_buffer_eligible";
}

export function getYieldStrategyPositionDiagnostics(set: YieldStrategyPositionSet): YieldStrategyPositionDiagnostics {
  const canon = set.canonicalEconomicPositions;
  const excludedFromBuffer: Array<{ positionId: string; reason: string }> = [];
  for (const p of canon) { const r = bufferExclusionReason(p); if (r) excludedFromBuffer.push({ positionId: p.positionId, reason: r }); }
  return {
    totalInputRecords: set.normalizedPositions.length,
    canonicalEconomicPositions: canon.length,
    duplicateRepresentations: set.duplicateRepresentations.length,
    conflictingPositions: set.conflictingPositions.length,
    matchedApproved: set.matchedApprovedPositionIds.length,
    matchedNonapproved: set.matchedNonapprovedPositionIds.length,
    unmatched: set.unmatchedPositionIds.length,
    ambiguous: set.ambiguousPositionIds.length,
    invalid: set.invalidPositionIds.length,
    observedUndocumentedProducts: set.observedUndocumentedProducts.length,
    observedProductAddresses: set.observedUndocumentedProducts.map((o) => o.observedProductAddress),
    positionsByProtocol: set.positionsByProtocol,
    positionsByStrategy: set.positionsByStrategy,
    positionsByMechanic: set.positionsByMechanic,
    freshValueUsd: canon.filter((p) => p.valuationStatus === "complete").reduce((s, p) => s + val(p), 0),
    staleValueUsd: canon.filter((p) => p.valuationStatus === "stale").reduce((s, p) => s + val(p), 0),
    unavailableCount: canon.filter((p) => p.valuationStatus === "unavailable").length,
    countedTowardBuffer: canon.filter((p) => p.countsTowardSafetyBuffer).length,
    excludedFromBuffer,
    comparisonPerformed: false,
    planGenerated: false,
    suggestionGenerated: false,
    transactionsEnabled: false,
    walletSignatureRequired: false,
  };
}

export interface YieldStrategyCapitalDiagnostics {
  status: string;
  requiredBufferUsd: number;
  directWalletEligibleBufferUsd: number;
  existingEligibleBufferYieldUsd: number;
  currentEligibleBufferUsd: number;
  bufferShortfallUsd: number;
  canonicalBufferSurplusUsd: number;
  userRiskProfileId: string | null;
  vaultAllocationPct: number;
  walletAllocationPct: number;
  requiredWalletFloorUsd: number;
  remainingBufferYieldCapacityUsd: number;
  directLiquidUsdcUsd: number;
  rawBufferYieldCapitalUsd: number;
  bufferYieldEligibleCapitalUsd: number;
  rawExcessYieldCapitalUsd: number;
  excessYieldEligibleCapitalUsd: number;
  excessYieldMinimumUsd: number;
  excessYieldMeetsMinimum: boolean;
  bufferYieldMinimumPolicyAvailable: boolean;
  maximumCombinedSourceCapitalUsd: number;
  sharedSourceOverlapPossible: boolean;
  sharedSourceOverlapUsd: number;
  bufferLeaderPositionStatus: string;
  excessLeaderPositionStatus: string;
  blockers: string[];
  warnings: string[];
  productSelected: false;
  amountSelected: false;
  planGenerated: false;
  suggestionGenerated: false;
  updatesProductOutput: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;
}

export function getYieldStrategyCapitalDiagnostics(s: YieldStrategyEligibleCapitalSnapshot): YieldStrategyCapitalDiagnostics {
  return {
    status: s.status,
    requiredBufferUsd: s.requiredBufferUsd,
    directWalletEligibleBufferUsd: s.directWalletEligibleBufferUsd,
    existingEligibleBufferYieldUsd: s.existingEligibleBufferYieldUsd,
    currentEligibleBufferUsd: s.currentEligibleBufferUsd,
    bufferShortfallUsd: s.bufferShortfallUsd,
    canonicalBufferSurplusUsd: s.canonicalBufferSurplusUsd,
    userRiskProfileId: s.userRiskProfileId ?? null,
    vaultAllocationPct: s.vaultAllocationPct,
    walletAllocationPct: s.walletAllocationPct,
    requiredWalletFloorUsd: s.requiredWalletFloorUsd,
    remainingBufferYieldCapacityUsd: s.remainingBufferYieldCapacityUsd,
    directLiquidUsdcUsd: s.directLiquidUsdcUsd,
    rawBufferYieldCapitalUsd: s.rawBufferYieldCapitalUsd,
    bufferYieldEligibleCapitalUsd: s.bufferYieldEligibleCapitalUsd,
    rawExcessYieldCapitalUsd: s.rawExcessYieldCapitalUsd,
    excessYieldEligibleCapitalUsd: s.excessYieldEligibleCapitalUsd,
    excessYieldMinimumUsd: s.excessYieldMinimumUsd,
    excessYieldMeetsMinimum: s.excessYieldMeetsMinimum,
    bufferYieldMinimumPolicyAvailable: s.bufferYieldMinimumPolicyAvailable,
    maximumCombinedSourceCapitalUsd: s.maximumCombinedSourceCapitalUsd,
    sharedSourceOverlapPossible: s.sharedSourceOverlapPossible,
    sharedSourceOverlapUsd: s.sharedSourceOverlapUsd,
    bufferLeaderPositionStatus: s.bufferLeaderPositionStatus.status,
    excessLeaderPositionStatus: s.excessLeaderPositionStatus.status,
    blockers: s.blockers,
    warnings: s.warnings,
    productSelected: false,
    amountSelected: false,
    planGenerated: false,
    suggestionGenerated: false,
    updatesProductOutput: false,
    transactionsEnabled: false,
    walletSignatureRequired: false,
  };
}

/** Recommendation-free explanations for the capital snapshot. */
export function explainYieldStrategyCapital(s: YieldStrategyEligibleCapitalSnapshot): string[] {
  const out: string[] = [];
  if (s.excessLeaderPositionStatus.status === "leader_held" || s.excessLeaderPositionStatus.status === "leader_held_multiple_positions") out.push("The wallet already holds the current excess-lane comparison leader.");
  if (s.bufferYieldEligibleCapitalUsd > 0) out.push(`Up to $${s.bufferYieldEligibleCapitalUsd.toFixed(2)} is structurally available for the Safety Buffer Yield lane before product-specific plan constraints.`);
  if (s.excessYieldEligibleCapitalUsd > 0) out.push(`$${s.excessYieldEligibleCapitalUsd.toFixed(2)} of direct liquid USDC is above the completed Safety Buffer and meets the excess-yield minimum.`);
  if (!s.bufferComplete) out.push("The Safety Buffer is not yet complete, so no Stable Yield capital is currently available.");
  return out;
}

/** Recommendation-free explanation for one existing position's non-qualification. */
export function explainYieldStrategyPositionExclusion(p: YieldStrategyPosition): string {
  if (p.countsTowardSafetyBuffer) return `An existing position was detected on ${p.protocolDisplayName} and its exact approved product currently counts toward the Safety Buffer.`;
  const reason = bufferExclusionReason(p) ?? "not_currently_buffer_eligible";
  if (reason === "unmatched_product") return `An existing position was detected on ${p.protocolDisplayName}, but it does not match an approved exact registry product, so its value is visible but does not count toward the Safety Buffer.`;
  return `An existing ${p.protocolDisplayName} position is visible but does not count toward the Safety Buffer (${reason}).`;
}
