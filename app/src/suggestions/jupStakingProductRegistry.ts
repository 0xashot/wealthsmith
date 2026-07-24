/**
 * jupStakingProductRegistry — Step 24A. The governed, versioned product record for Jupiter JUP Staking.
 *
 * GOVERNANCE + HONESTY: nothing here fabricates an APY. Jupiter's JUP staking rewards are VARIABLE
 * (program/campaign-driven), so `rewardModel` is `variable_staking_rewards` and `estimatedApyPct` is
 * `null` — the card/modal disclose "variable" and never show a fixed number or `0%`. Only current,
 * governed reward-model + unstaking terms are exposed. A stale / unavailable / unresolved required
 * product field FAILS CLOSED at selection (see jupStakingSelection.ts); this module only declares the
 * approved facts. Internal numeric risk scores are intentionally NOT modeled here (non-user-facing).
 */

export type JupStakingApprovalStatus = "approved" | "blocked" | "research_only" | "unresolved";
export type JupStakingAvailability = "available" | "unavailable" | "unresolved";
export type JupStakingRewardModel = "variable_staking_rewards" | "campaign_rewards" | "unresolved";
export type JupStakingRewardDataStatus = "fresh" | "stale" | "unavailable" | "unresolved";
export type JupStakingUnstakingStatus = "known" | "unavailable" | "unresolved";

export interface JupStakingProductRecord {
  productId: string;
  protocolId: string;
  assetId: "jup";

  approvalStatus: JupStakingApprovalStatus;
  availability: JupStakingAvailability;
  rewardModel: JupStakingRewardModel;
  rewardDataStatus: JupStakingRewardDataStatus;

  /** Fixed/annualized APY — ONLY when current, verified, reproducible, and approved. Otherwise null. */
  estimatedApyPct: number | null;

  unstakingTerms: {
    status: JupStakingUnstakingStatus;
    description: string | null;
  };

  minimumTokenAmount: string | null;
  minimumUsd: number | null;

  approvedAt: string;
  effectiveAt: string;
  policyVersion: string;
}

export const JUP_STAKING_PRODUCT_REGISTRY_VERSION = "jup_staking_product_v1";

/** Stable product id for the ONLY approved JUP staking product (Jupiter). */
export const JUPITER_JUP_STAKING_PRODUCT_ID = "jupiter_jup_staking";

/**
 * The approved Jupiter JUP Staking product. Rewards are VARIABLE with NO governed numeric APY, so
 * `estimatedApyPct` stays null; `rewardDataStatus` is `fresh` because the governed reward-MODEL
 * classification (variable) and unstaking terms are current — not because any yield figure exists.
 * `minimumUsd`/`minimumTokenAmount` are null: JUP staking reuses the approved staking-category minimum
 * (MIN_STAKING_SUGGESTION_USD) rather than inventing a new one.
 */
export const JUPITER_JUP_STAKING_PRODUCT: JupStakingProductRecord = {
  productId: JUPITER_JUP_STAKING_PRODUCT_ID,
  protocolId: "jupiter",
  assetId: "jup",

  approvalStatus: "approved",
  availability: "available",
  rewardModel: "variable_staking_rewards",
  rewardDataStatus: "fresh",

  estimatedApyPct: null,

  unstakingTerms: {
    status: "known",
    description:
      "JUP unstaking has a cooldown set by the Jupiter staking program before your JUP becomes transferable again. Confirm the current unstaking window on Jupiter before you stake.",
  },

  minimumTokenAmount: null,
  minimumUsd: null,

  // Effective well before any app/fixture clock so the approval is active for every run (the effectiveAt
  // gate exists to block a FUTURE-dated approval, not a past one).
  approvedAt: "2023-01-01T00:00:00.000Z",
  effectiveAt: "2023-01-01T00:00:00.000Z",
  policyVersion: JUP_STAKING_PRODUCT_REGISTRY_VERSION,
};

/** The governed approved JUP staking product, or null if none is approved (fail-closed). */
export function getApprovedJupStakingProduct(): JupStakingProductRecord | null {
  const p = JUPITER_JUP_STAKING_PRODUCT;
  return p.approvalStatus === "approved" ? p : null;
}
