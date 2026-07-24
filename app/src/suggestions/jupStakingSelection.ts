/**
 * jupStakingSelection — Step 24A. The DETERMINISTIC JUP staking eligibility + protocol-selection flow.
 *
 * Produces a STRUCTURED assessment rather than hard-coding "Jupiter" in the UI: even though Jupiter is
 * the only approved candidate for MVP, selection runs through governed product data and reports a
 * `selectedProtocolId` / `selectedProductId` / `selectionBasis`. The frontend must not infer the
 * protocol, and Smith AI must not select it — this module is the single source.
 *
 * HONESTY: `executionPrepared` is ALWAYS false (read-only, no transaction is constructed/simulated/
 * signed/submitted). `estimatedApyPct` is passed through from the governed product (null for variable
 * rewards — never fabricated). Every non-recommended outcome fails closed with machine-readable reasons.
 */
import {
  getApprovedJupStakingProduct,
  JUPITER_JUP_STAKING_PRODUCT_ID,
  type JupStakingProductRecord,
  type JupStakingRewardModel,
} from "./jupStakingProductRegistry";

export type JupStakingSelectionStatus =
  | "recommended"
  | "below_minimum"
  | "asset_ineligible"
  | "conflict"
  | "product_unavailable"
  | "reward_data_stale"
  | "terms_unresolved"
  | "blocked"
  | "unresolved";

/**
 * Deterministic per-candidate context assembled by the derive layer from the canonical wallet snapshot
 * + governed thresholds. Every field is sourced or fail-closed — nothing is invented here.
 */
export interface JupStakingCandidateContext {
  /** Exact canonical JUP mint match (never symbol). */
  exactMintMatch: boolean;
  /** Approved classic SPL token program AND ownership resolves to jup_staking. */
  tokenProgramApproved: boolean;
  /** Held in the direct wallet (source "wallet", type "token"). */
  directWallet: boolean;
  /** Transferable JUP (human amount); null when transferability is unresolved. */
  transferableAmount: number | null;
  locked: boolean;
  vesting: boolean;
  borrowed: boolean;
  protocolHeld: boolean;
  alreadyStaked: boolean;
  /** Current, fresh price available. */
  priceFresh: boolean;
  /** Sourced USD value of the transferable JUP; null when unpriced/unresolved. */
  valueUsd: number | null;
  /** Approved governed minimum suggestion size (USD) — reused from the staking category. */
  minimumUsd: number;
  /** Safety Buffer requirements (same gate the existing staking category uses) satisfied. */
  bufferSatisfied: boolean;
  /** A higher-priority action already claims this same JUP amount (Rebalance / valid Trim). */
  higherPriorityConflict: boolean;
  /** Portfolio completeness sufficient to act (fail-closed when unresolved). */
  portfolioComplete: boolean;
}

export interface JupStakingSelectionAssessment {
  status: JupStakingSelectionStatus;
  /** Present ONLY when status === "recommended". */
  selectedProtocolId: "jupiter" | null;
  selectedProductId: string | null;
  selectionBasis: "only_approved_product" | null;
  /** Passed through from the governed product; null for variable rewards (never fabricated). */
  estimatedApyPct: number | null;
  rewardModel: JupStakingRewardModel | null;
  /** WealthSmith constructs/simulates/signs/submits NOTHING. Always false. */
  executionPrepared: false;
  /** Machine-readable blocking reasons (never display copy). Empty when recommended. */
  reasons: string[];
}

function fail(status: JupStakingSelectionStatus, reason: string, product?: JupStakingProductRecord | null): JupStakingSelectionAssessment {
  return {
    status,
    selectedProtocolId: null,
    selectedProductId: null,
    selectionBasis: null,
    estimatedApyPct: product?.estimatedApyPct ?? null,
    rewardModel: product?.rewardModel ?? null,
    executionPrepared: false,
    reasons: [reason],
  };
}

/**
 * Run the deterministic flow: exact JUP identity → direct-wallet balance → transferability → pricing →
 * asset-level eligibility → conflict checks → governed product → availability → reward freshness →
 * unstaking terms → minimum size → selected product. Returns exactly one status.
 */
export function assessJupStaking(
  ctx: JupStakingCandidateContext,
  nowMs: number,
  /** Governed product; defaults to the approved Jupiter product. Injectable ONLY for the fixture matrix. */
  product: JupStakingProductRecord | null = getApprovedJupStakingProduct()
): JupStakingSelectionAssessment {
  // Asset-level identity + custody + transferability + pricing (gates 1–10).
  if (!ctx.exactMintMatch) return fail("asset_ineligible", "jup_mint_mismatch");
  if (!ctx.tokenProgramApproved) return fail("asset_ineligible", "token_program_unapproved");
  if (!ctx.directWallet) return fail("asset_ineligible", "not_direct_wallet");
  if (ctx.locked) return fail("asset_ineligible", "locked");
  if (ctx.vesting) return fail("asset_ineligible", "vesting");
  if (ctx.borrowed) return fail("asset_ineligible", "borrowed");
  if (ctx.protocolHeld) return fail("asset_ineligible", "protocol_held");
  if (ctx.alreadyStaked) return fail("asset_ineligible", "already_staked");
  if (ctx.transferableAmount == null || ctx.transferableAmount <= 0) return fail("asset_ineligible", "no_transferable_balance");
  if (!ctx.priceFresh || ctx.valueUsd == null) return fail("asset_ineligible", "price_or_value_unavailable");
  // Safety Buffer requirement (same gate as the existing staking category).
  if (!ctx.bufferSatisfied) return fail("asset_ineligible", "safety_buffer_not_satisfied");

  // Conflict: a higher-priority action already claims this JUP amount.
  if (ctx.higherPriorityConflict) return fail("conflict", "higher_priority_same_asset_conflict");

  // Governed product registry (gates 14–17). `product` is the approved product by default.
  if (!product) return fail("product_unavailable", "no_approved_product");
  if (product.approvalStatus === "blocked") return fail("blocked", "product_blocked", product);
  if (product.approvalStatus !== "approved" || Date.parse(product.effectiveAt) > nowMs) return fail("product_unavailable", "approval_not_effective", product);
  if (product.availability !== "available") return fail("product_unavailable", "product_unavailable", product);
  if (product.rewardDataStatus !== "fresh") return fail("reward_data_stale", `reward_data_${product.rewardDataStatus}`, product);
  if (product.unstakingTerms.status !== "known") return fail("terms_unresolved", `unstaking_${product.unstakingTerms.status}`, product);

  // Portfolio completeness (gate 18) — fail closed when unresolved.
  if (!ctx.portfolioComplete) return fail("unresolved", "portfolio_incomplete", product);

  // Minimum size (gate 11).
  if (ctx.valueUsd < ctx.minimumUsd) return fail("below_minimum", "below_minimum_size", product);

  // Recommended — Jupiter selected deterministically from the only approved product.
  return {
    status: "recommended",
    selectedProtocolId: "jupiter",
    selectedProductId: JUPITER_JUP_STAKING_PRODUCT_ID,
    selectionBasis: "only_approved_product",
    estimatedApyPct: product.estimatedApyPct,
    rewardModel: product.rewardModel,
    executionPrepared: false,
    reasons: [],
  };
}
