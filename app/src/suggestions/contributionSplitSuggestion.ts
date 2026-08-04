/**
 * contributionSplitSuggestion — renders the "maintain / restore the recommended allocation"
 * contribution split (contributionAllocationSplit.ts) as ONE READ-ONLY CARD PER LEG:
 *   - a growth leg per held asset ("Build BTC / ETH / SOL Gradually"), and
 *   - the stable leg ("Build Your USDC Position"),
 * each sized so that deploying the monthly contribution keeps the portfolio at its recommended
 * crypto/stablecoin allocation, with the crypto portion split by the risk-tiered sub-allocation policy.
 *
 * Each card's Review opens the SHARED contribution modal via a `ContributionPlanReviewDetails`, so the
 * layout matches every other DCA modal: a two-card set (Next contribution · Target allocation) and a
 * "Cancel / Buy {token} on Moonpay" footer.
 *
 * Read-only presentation only: it builds card + review state from already-computed amounts. It moves
 * no funds, requests no signature, and computes no allocation itself (that is the split calculator).
 */
import type { SuggestionCardState } from "../types/dashboard";
import type { ContributionAllocationSplit, ContributionLegTargetId } from "./contributionAllocationSplit";
import {
  type ContributionPlanReviewDetails,
  CONTRIBUTION_PLAN_READ_ONLY_NOTICE,
} from "./contributionPlanReviewDetails";

/** Stable card id kept from the single-asset era so existing links/ids stay valid. */
export const CONTRIBUTION_SPLIT_SOL_ID = "contribution_split_sol";
export const CONTRIBUTION_SPLIT_USDC_ID = "contribution_split_usdc";

/** Per-leg presentation: card id, title, the bucket it belongs to, and display precision. */
const LEG: Record<
  ContributionLegTargetId,
  { id: string; title: string; symbol: string; bucket: "crypto" | "stablecoin"; decimals: number }
> = {
  btc: { id: "contribution_split_btc", title: "Build BTC Gradually", symbol: "BTC", bucket: "crypto", decimals: 6 },
  eth: { id: "contribution_split_eth", title: "Build ETH Gradually", symbol: "ETH", bucket: "crypto", decimals: 4 },
  sol: { id: CONTRIBUTION_SPLIT_SOL_ID, title: "Build SOL Gradually", symbol: "SOL", bucket: "crypto", decimals: 2 },
  usdc: { id: CONTRIBUTION_SPLIT_USDC_ID, title: "Build Your USDC Position", symbol: "USDC", bucket: "stablecoin", decimals: 0 },
};

const usd0 = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
/** Percent display: 1-decimal, trailing ".0" dropped, "%" suffix (matches the DCA modal's `pctT`). */
const pctT = (n: number) => `${Math.round(n * 10) / 10}%`;
/** Percent with at most one decimal, no suffix, for card copy (63.5 → "63.5", 60 → "60"). */
const pct1 = (n: number) => { const r = Math.round(n * 10) / 10; return Number.isInteger(r) ? String(r) : r.toFixed(1); };

/** Sourced USD price per token for each leg; a missing price shows the USD amount only. */
export type ContributionLegPrices = Partial<Record<ContributionLegTargetId, number>>;

export interface ContributionSplitCardsResult {
  cards: SuggestionCardState[];
  /** Keyed by the same card ids — merged into the rail's `contributionReviewById`. */
  contributionReviewById: Record<string, ContributionPlanReviewDetails>;
}

/** "$127 to BTC, $95 to ETH and $683 to USDC" — the full split, for the why-copy. */
function legListText(split: ContributionAllocationSplit): string {
  const parts = split.legs.map((l) => `${usd0(l.usd)} to ${LEG[l.targetId].symbol}`);
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

export function buildContributionSplitCards(
  split: ContributionAllocationSplit,
  prices: ContributionLegPrices
): ContributionSplitCardsResult {
  const cards: SuggestionCardState[] = [];
  const contributionReviewById: Record<string, ContributionPlanReviewDetails> = {};

  const C = split.contributionUsd;
  const P = split.totalUsd;
  const cryptoUsd = P - split.stableUsd;
  const multiLeg = split.legs.filter((l) => l.applies).length > 1;

  for (const leg of split.legs) {
    if (!leg.applies) continue;
    const c = LEG[leg.targetId];
    const isStable = c.bucket === "stablecoin";
    const targetPct = isStable ? split.targetStablePct : split.targetCryptoPct;
    const currentBucketUsd = isStable ? split.stableUsd : cryptoUsd;
    const currentPct = P > 0 ? (currentBucketUsd / P) * 100 : 0;
    // Whole contribution deployed per the split → the bucket's share after this cycle.
    const bucketAdd = isStable ? split.usdcUsd : split.cryptoUsd;
    const afterPct = P + C > 0 ? ((currentBucketUsd + bucketAdd) / (P + C)) * 100 : 0;

    // USDC is a dollar stablecoin — its unit price is 1 by definition (the same
    // $1 basis the swap-action adapters use), so it never needs a price feed.
    const price = leg.targetId === "usdc" ? 1 : prices[leg.targetId];
    const amountLine =
      price && price > 0
        ? { label: "Next contribution", value: `${(leg.usd / price).toLocaleString("en-US", { maximumFractionDigits: c.decimals })} ${c.symbol}`, subValue: usd0(leg.usd) }
        : { label: "Next contribution", value: usd0(leg.usd) };

    const description = `Direct ${usd0(leg.usd)} of your ${usd0(C)} monthly contribution into ${c.symbol} to keep your portfolio at your recommended ${pct1(split.targetCryptoPct)}% crypto / ${pct1(split.targetStablePct)}% stablecoin allocation.`;

    cards.push({
      id: c.id,
      title: c.title,
      type: "dca_buy",
      category: "contribution_plan",
      badge: "",
      is_top_pick: false,
      status: "active",
      actionability: "actionable",
      severity: "info",
      description,
      impact_text: `Add ${usd0(leg.usd)} of ${c.symbol}`,
      tag: "Allocation",
      accessibleCtaLabel: `${c.title}. ${description} Read-only plan. Review.`,
      cta: { label: "Review", action: null, executes_transaction: false, requires_wallet_signature: false, completion_on_click: false },
    });

    contributionReviewById[c.id] = {
      title: c.title,
      summaryRows: [],
      keyMetrics: [amountLine, { label: `Target ${c.bucket} allocation`, value: pctT(targetPct) }],
      whySection: {
        title: "Why this plan",
        body: multiLeg
          ? `Your ${usd0(C)} monthly contribution is split to match your recommended allocation: ${legListText(split)}. The ${c.symbol} portion keeps your ${c.bucket} allocation at its ${pctT(targetPct)} target.`
          : `Directing your ${usd0(C)} monthly contribution into ${c.symbol} moves your ${c.bucket} allocation from ${pctT(currentPct)} to an estimated ${pctT(afterPct)}, closer to your ${pctT(targetPct)} target.`,
      },
      safetyBufferSection: { title: "Safety Buffer", rows: [{ label: "Status", value: "Preserved" }] },
      fundingSection: {
        title: "Funding source",
        rows: [
          { label: "Source", value: "Upcoming contribution" },
          { label: "Timing", value: "Expected future contribution" },
        ],
      },
      externalLink: {
        label: "Moonpay",
        url: `https://www.moonpay.com/buy/${c.symbol.toLowerCase()}`,
        ctaLabel: `Buy ${c.symbol} on Moonpay`,
        secondaryLabel: "Cancel",
        opensInNewTab: true,
      },
      readOnlyNotice: CONTRIBUTION_PLAN_READ_ONLY_NOTICE,
      closeLabel: "Close",
      executionControlsPresent: false,
      focusedLayout: true,
    };
  }

  return { cards, contributionReviewById };
}
