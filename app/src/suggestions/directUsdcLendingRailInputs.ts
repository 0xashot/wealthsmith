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
  unresolvedReason: string | null;
}

/**
 * Suitability from EXISTING rules. The excess-lane rule (yieldStrategyEligibility) requires the risk
 * review to enumerate `compatibleUserRiskProfileIds`. The Kamino Direct human review (16H-S.2) did not
 * record any, so under the existing rule NO user is established as compatible → fail closed. This code
 * refuses to invent which profiles are suitable — that is a risk-review judgement, not a runtime guess.
 */
export function deriveDirectLendingSuitability(goal: SavedGoal | null | undefined): DirectLendingSuitability {
  const profileComplete = !!(goal && goal.risk_tolerance);
  return {
    profileComplete,
    // Fail-closed: no reviewed compatible-user-risk-profile list exists for direct lending yet.
    suitableForCategory: false,
    prohibitsDefiLending: false,
    unresolvedReason: profileComplete
      ? "no reviewed compatibleUserRiskProfileIds recorded for kamino_usdc_lending — suitability cannot be established under the existing rule"
      : "user profile incomplete (no risk tolerance)",
  };
}
