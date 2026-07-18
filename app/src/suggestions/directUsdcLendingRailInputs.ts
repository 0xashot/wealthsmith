/**
 * directUsdcLendingRailInputs — Step 16H-S.5. Pure derivations that feed the direct-lending runtime
 * adapter from real rail state: the deterministic excess-USDC amount (via the existing 16F
 * eligible-capital builder — NOT a new formula) and the user-suitability result (via the existing
 * rules — NOT a new questionnaire). Both are deterministic and fail-closed.
 */
import type { SafetyBuffer } from "../wallet/walletSummary";
import type { SavedGoal } from "../types/goal";
import { buildYieldStrategyEligibleCapitalSnapshot } from "./yieldStrategyEligibleCapital";
import { buildYieldStrategyPositionSet } from "./yieldStrategyPositionEngine";
import { RECOGNIZED_PROFILE_RISK_IDS } from "./contributionTargetSuitability";
import { getEffectiveCompatibleRiskProfileIds, isRiskProfileCompatible } from "./directUsdcLendingHumanReviewAmendment";

const PROD_OWNER = "wealthsmith_real_wallet";

/**
 * Deterministic excess canonical-USDC eligible for direct lending, from the EXISTING 16F builder.
 * Reuses `excessYieldEligibleCapitalUsd` — never "all wallet USDC", never a percentage, never a
 * Kamino-specific formula. Returns null when the snapshot yields no positive excess (→ the adapter
 * suppresses no_excess_usdc / missing_deterministic_amount).
 */
export function deriveDirectLendingExcessUsd(args: {
  buffer: SafetyBuffer | null;
  canonicalUsdcUsd: number;      // direct liquid canonical-USDC USD value (fresh price only)
  bufferCountedUsdcUsd: number;  // canonical USDC currently counted toward the Safety Buffer
  pricesFresh: boolean;
  checkedAt: string;
}): number | null {
  if (args.buffer == null || !args.pricesFresh) return null; // unresolved buffer/price → no excess
  const positionSet = buildYieldStrategyPositionSet({ ownerAddress: PROD_OWNER, checkedAt: args.checkedAt, positions: [] });
  const snapshot = buildYieldStrategyEligibleCapitalSnapshot({
    ownerAddress: PROD_OWNER,
    canonicalSafetyBuffer: {
      requiredBufferUsd: args.buffer.targetUsd,
      bufferComplete: args.buffer.fullyFunded === true,
      directWalletEligibleBufferUsd: args.bufferCountedUsdcUsd,
      available: true,
    },
    directWalletLiquiditySnapshot: { directLiquidUsdcUsd: args.canonicalUsdcUsd, available: args.pricesFresh },
    positionSet,
    checkedAt: args.checkedAt,
  });
  const excess = snapshot.excessYieldEligibleCapitalUsd;
  return typeof excess === "number" && excess > 0 ? excess : null;
}

export interface DirectLendingSuitability {
  profileComplete: boolean;
  suitableForCategory: boolean;
  prohibitsDefiLending: boolean;
  userRiskProfileId: string | null;
  riskProfileCompatible: boolean;
  unresolvedReason: string | null;
}

/**
 * Suitability from EXISTING rules + the governance-derived effective compatible profile list (16H-S.6
 * human-review amendment → getEffectiveCompatibleRiskProfileIds). Medium/High may PASS the risk-profile
 * gate; Low/very_low/very_high/unknown/incomplete fail closed. Compatibility is NOT hardcoded here — it
 * is read from the amendment record. Profile compatibility is only one gate: the adapter still enforces
 * buffer, excess, market freshness, capacity, availability and existing-position rules.
 */
export function deriveDirectLendingSuitability(goal: SavedGoal | null | undefined): DirectLendingSuitability {
  const rawId = goal?.risk_tolerance ?? null;
  const recognized = typeof rawId === "string" && RECOGNIZED_PROFILE_RISK_IDS.includes(rawId);
  const profileComplete = !!(goal && recognized);
  const userRiskProfileId = recognized ? rawId : null;
  // Governance-derived compatibility (fail-closed for unknown/incomplete).
  const riskProfileCompatible = profileComplete && isRiskProfileCompatible(userRiskProfileId);
  return {
    profileComplete,
    suitableForCategory: riskProfileCompatible, // one gate; all other adapter gates still apply
    prohibitsDefiLending: false,
    userRiskProfileId,
    riskProfileCompatible,
    unresolvedReason: !profileComplete
      ? "user profile incomplete or unknown risk tolerance (fail-closed)"
      : riskProfileCompatible
        ? null
        : `risk profile '${userRiskProfileId}' is not in the effective compatible set [${getEffectiveCompatibleRiskProfileIds().join(", ")}]`,
  };
}
