/**
 * contributionSplitTestingFixtures — the /testing gallery source for the
 * CONTRIBUTION SPLIT cards ("Build SOL / BTC / ETH Gradually" + "Build Your USDC
 * Position").
 *
 * These are the cards a real wallet actually renders, and until now the DCA tab
 * showed only the single-asset pipeline card, so the multi-asset split had no
 * gallery coverage at all.
 *
 * PRODUCTION CODE, deterministic inputs. Every case runs the real
 * `computeContributionAllocationSplit` (which applies the approved risk-tiered
 * `growth_target_suballocation_v1` weights) and the real
 * `buildContributionSplitCards`. Nothing here hand-writes a card, a percentage,
 * or an amount — change the policy and these cases change with it.
 *
 * The scenarios exist to show the two rules that govern the split:
 *   1. HELD ASSETS ONLY — an asset the user does not hold never appears, so the
 *      same contribution produces one, two, or three growth legs.
 *   2. RISK-TIERED WEIGHTS — the same holdings split differently by risk level.
 * Plus the $50 per-leg floor, and the stable leg when crypto is already at target.
 *
 * Read-only: no network, no wallet, no clock (a fixed `NOW`), no transaction.
 */
import {
  computeContributionAllocationSplit,
  type ContributionAllocationSplit,
} from "../suggestions/contributionAllocationSplit";
import {
  buildContributionSplitCards,
  type ContributionLegPrices,
} from "../suggestions/contributionSplitSuggestion";
import type { SuggestionCardState } from "../types/dashboard";
import type { ContributionPlanReviewDetails } from "../suggestions/contributionPlanReviewDetails";

/** Fixed sourced prices — the gallery never fetches. */
const PRICES: ContributionLegPrices = { sol: 72.35, btc: 53250, eth: 1847 };

export interface ContributionSplitTestingCase {
  id: string;
  /** Scenario label shown above the card in the gallery. */
  label: string;
  /** What this case is meant to demonstrate. */
  note: string;
  cards: SuggestionCardState[];
  reviewById: Record<string, ContributionPlanReviewDetails>;
  split: ContributionAllocationSplit | null;
}

interface CaseInput {
  id: string;
  label: string;
  note: string;
  totalUsd: number;
  stableUsd: number;
  monthlyContributionUsd: number;
  targetCryptoPct: number;
  heldGrowthTargetIds: string[];
  riskLevel: string;
}

/**
 * A portfolio close to the real wallet this was built against: ~$23.4k total with
 * ~$15.3k in stables, a 74.5% crypto target, and a $1,000 monthly contribution.
 * Only the HELD assets and the RISK LEVEL vary between cases, so the effect of
 * each is visible on its own.
 */
const BASE = {
  totalUsd: 23448,
  stableUsd: 15261,
  monthlyContributionUsd: 1000,
  targetCryptoPct: 74.5,
};

const CASES: CaseInput[] = [
  {
    ...BASE,
    id: "split_sol_only",
    label: "SOL only — one growth leg",
    note: "Holds no BTC/ETH, so the whole crypto portion goes to SOL. The policy never introduces an asset the user has not chosen.",
    heldGrowthTargetIds: ["sol"],
    riskLevel: "high",
  },
  {
    ...BASE,
    id: "split_sol_btc",
    label: "SOL + BTC — two growth legs",
    note: "Adding a manual BTC holding splits the crypto portion across both, by the approved high-risk weights.",
    heldGrowthTargetIds: ["sol", "btc"],
    riskLevel: "high",
  },
  {
    ...BASE,
    id: "split_sol_btc_eth_medium",
    label: "SOL + BTC + ETH — medium risk",
    note: "Medium risk leans to the most established asset: BTC 40 / ETH 30 / SOL 30.",
    heldGrowthTargetIds: ["sol", "btc", "eth"],
    riskLevel: "medium",
  },
  {
    ...BASE,
    id: "split_sol_btc_eth_high",
    label: "SOL + BTC + ETH — high risk",
    note: "Same holdings, higher risk: the weights tilt toward SOL (30 / 30 / 40).",
    heldGrowthTargetIds: ["sol", "btc", "eth"],
    riskLevel: "high",
  },
  {
    ...BASE,
    id: "split_sol_btc_eth_very_high",
    label: "SOL + BTC + ETH — very high risk",
    note: "The furthest tilt to SOL (25 / 25 / 50). Compare with the two cases above — only the risk level changed.",
    heldGrowthTargetIds: ["sol", "btc", "eth"],
    riskLevel: "very_high",
  },
  {
    ...BASE,
    id: "split_min_leg_floor",
    label: "Small contribution — $50 per-leg floor",
    note: "A $120 contribution would give ETH/BTC legs under the $50 minimum; those are dropped and redistributed so the shown amounts still total the contribution exactly.",
    monthlyContributionUsd: 120,
    heldGrowthTargetIds: ["sol", "btc", "eth"],
    riskLevel: "very_high",
  },
  {
    id: "split_stable_leg",
    label: "Crypto already at target — stable leg",
    note: "Crypto is above its target, so the contribution goes to USDC instead of buying more crypto. This is the case that stopped the DCA and allocation cards contradicting each other.",
    totalUsd: 20000,
    stableUsd: 4000,
    monthlyContributionUsd: 1000,
    targetCryptoPct: 60,
    heldGrowthTargetIds: ["sol", "btc", "eth"],
    riskLevel: "high",
  },
  {
    id: "split_mixed_legs",
    label: "Crypto + stable legs together",
    note: "The contribution is larger than the gap to target, so part buys crypto (split by risk) and the remainder tops up USDC.",
    totalUsd: 20000,
    stableUsd: 9000,
    monthlyContributionUsd: 2000,
    targetCryptoPct: 60,
    heldGrowthTargetIds: ["sol", "btc", "eth"],
    riskLevel: "high",
  },
];

/** Run every case through the production split calculator + card builder. */
export function runAllContributionSplitTestingCases(): ContributionSplitTestingCase[] {
  return CASES.map((c) => {
    const split = computeContributionAllocationSplit({
      totalUsd: c.totalUsd,
      stableUsd: c.stableUsd,
      monthlyContributionUsd: c.monthlyContributionUsd,
      targetCryptoPct: c.targetCryptoPct,
      heldGrowthTargetIds: c.heldGrowthTargetIds,
      riskLevel: c.riskLevel,
    });
    const built = split ? buildContributionSplitCards(split, PRICES) : null;
    return {
      id: c.id,
      label: c.label,
      note: c.note,
      cards: built?.cards ?? [],
      reviewById: built?.contributionReviewById ?? {},
      split,
    };
  });
}
