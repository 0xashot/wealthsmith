/**
 * contributionPlanPresentation — Step 15H. Deterministic, approved card copy from the structured
 * plan payload. No LLM, no storytelling, no component-side concatenation of financial explanations.
 * Uses only engine values; percentage-point gaps are labelled "percentage points", never "percent".
 * The CTA opens only the review modal — never a wallet, protocol, signature, or transaction.
 */
import { formatUsd } from "../wallet/walletSummary";
import type { ContributionPlanSuggestionData } from "./contributionIntegrationTypes";

export const CONTRIBUTION_PLAN_PRESENTATION_EXISTS = true;

export interface ContributionPlanCardPresentation {
  title: string;
  description: string;
  tag: string;
  impactText?: string;
  ctaLabel: "Review Plan";
  accessibilityLabel: string;
  readOnly: true;
}

const pct1 = (n: number): string => `${(Math.round(n * 10) / 10).toFixed(1)}%`;
const pp1 = (n: number): string => (Math.round(Math.abs(n) * 10) / 10).toFixed(1);

const FREQ_LABEL: Record<string, string> = { weekly: "weekly", biweekly: "bi-weekly", monthly: "monthly", quarterly: "quarterly", occasional: "occasional" };

function amountText(d: ContributionPlanSuggestionData): string {
  if (d.amountKind === "exact") return formatUsd(d.exactAmountUsd as number);
  return `${formatUsd(d.minimumAmountUsd as number)}–${formatUsd(d.maximumAmountUsd as number)}`;
}

/** Build the deterministic card presentation for a plan-backed suggestion payload. */
export function buildContributionPlanCardPresentation(d: ContributionPlanSuggestionData): ContributionPlanCardPresentation {
  const token = d.targetSymbol;
  const freq = FREQ_LABEL[d.contributionFrequencyId ?? ""] ?? "next";
  const gap = d.gapPercentagePoints != null ? pp1(d.gapPercentagePoints) : "0.0";
  const amt = amountText(d);

  if (d.planKind === "safety_buffer") {
    const shortfall = formatUsd(d.currentBufferShortfallUsd ?? 0);
    const title = "Top Up Your Safety Buffer";
    const description = d.amountKind === "exact"
      ? `Direct ${amt} from your next contribution to ${token}. Your Safety Buffer is ${shortfall} below target.`
      : `Direct ${amt} from your next contribution to ${token}. Your Safety Buffer is ${shortfall} below target.`;
    return { title, description, tag: "Safety First", impactText: `Buffer shortfall after plan: ${formatUsd(d.projectedBufferShortfallUsd ?? 0)}`, ctaLabel: "Review Plan", accessibilityLabel: `${title}. ${description} Read-only plan. Review Plan.`, readOnly: true };
  }

  if (d.planKind === "stable_contribution") {
    const title = `Direct Your Next Contribution to ${token}`;
    const description = d.amountKind === "exact"
      ? `Your stable allocation is ${gap} percentage points below target. Direct your next ${freq} contribution to ${token} to move it closer.`
      : `Your stable allocation is ${gap} percentage points below target. Your next ${freq} contribution is ${amt}.`;
    return { title, description, tag: "Allocation", impactText: impactAllocation(d), ctaLabel: "Review Plan", accessibilityLabel: `${title}. ${description} Read-only plan. Review Plan.`, readOnly: true };
  }

  if (d.planKind === "recurring_dca") {
    const title = `Gradually Build Your ${token} Allocation`;
    const description = d.contributionFrequencyId === "occasional"
      ? `${token} is ${gap} percentage points below its target. This plan uses the ${amt} contribution you entered.`
      : d.amountKind === "exact"
        ? `${token} is ${gap} percentage points below its target. Use your next ${freq} contribution to build the position gradually.`
        : `${token} is ${gap} percentage points below its target. Your next ${freq} contribution is ${amt}.`;
    return { title, description, tag: "DCA", impactText: impactAllocation(d), ctaLabel: "Review Plan", accessibilityLabel: `${title}. ${description} Read-only plan. Review Plan.`, readOnly: true };
  }

  // staged_excess_usdc_dca
  const src = d.sourceAssetSymbol ?? "USDC";
  const title = `Stage ${src} Into ${token}`;
  const description = `${token} is ${gap} percentage points below its target. This plan stages ${amt} of liquid USDC above your Safety Buffer across four steps.`;
  return { title, description, tag: "DCA", impactText: impactAllocation(d), ctaLabel: "Review Plan", accessibilityLabel: `${title}. ${description} Read-only plan. Review Plan.`, readOnly: true };
}

function impactAllocation(d: ContributionPlanSuggestionData): string | undefined {
  if (d.currentTargetPct == null) return undefined;
  const cur = pct1(d.currentTargetPct);
  if (d.amountKind === "range" && d.minimumProjectedTargetPct != null && d.maximumProjectedTargetPct != null) {
    return `${cur} → ${pct1(d.minimumProjectedTargetPct)}–${pct1(d.maximumProjectedTargetPct)} of portfolio`;
  }
  if (d.projectedTargetPct != null) return `${cur} → ${pct1(d.projectedTargetPct)} of portfolio`;
  return undefined;
}
