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
  ctaLabel: "Review";
  accessibilityLabel: string;
  readOnly: true;
}

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
  // Whole amounts drop the ".00" (e.g. "$500"); ranges/cents are kept ("$461.53–$461.54").
  const fmtTrim = (usd: number): string => Number.isInteger(usd) ? `$${usd.toLocaleString("en-US")}` : `$${usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const amtCompact = d.amountKind === "exact" ? fmtTrim(d.exactAmountUsd as number) : `${fmtTrim(d.minimumAmountUsd as number)}–${fmtTrim(d.maximumAmountUsd as number)}`;
  // A fixed-frequency contribution can split into a one-cent-wide range only to reconcile the annual
  // total (e.g. $461.53–$461.54). On the compact card that reads as fake precision, so collapse it to
  // the single representative per-contribution amount ($461.54). Genuine ranges have no representative.
  const amtSingle = d.amountKind === "range" && d.representativeAmountUsd != null ? fmtTrim(d.representativeAmountUsd) : amtCompact;

  if (d.planKind === "safety_buffer") {
    const shortfall = formatUsd(d.currentBufferShortfallUsd ?? 0);
    const title = "Top Up Your Safety Buffer";
    const description = d.amountKind === "exact"
      ? `Direct ${amt} from your next contribution to ${token}. Your Safety Buffer is ${shortfall} below target.`
      : `Direct ${amt} from your next contribution to ${token}. Your Safety Buffer is ${shortfall} below target.`;
    return { title, description, tag: "Safety First", impactText: `Buffer shortfall after plan: ${formatUsd(d.projectedBufferShortfallUsd ?? 0)}`, ctaLabel: "Review", accessibilityLabel: `${title}. ${description} Read-only plan. Review.`, readOnly: true };
  }

  if (d.planKind === "stable_contribution") {
    const title = `Direct Next Contribution to ${token}`;
    const description = d.amountKind === "exact"
      ? `Your stablecoin allocation is ${gap} percentage points below target. Direct your next ${freq} contribution to ${token} to move closer to target.`
      : `Your stablecoin allocation is ${gap} percentage points below target. Direct your next ${freq} contribution of ${amtSingle} to ${token}.`;
    return { title, description, tag: "Allocation", impactText: `Add ${amtSingle} of ${token}`, ctaLabel: "Review", accessibilityLabel: `${title}. ${description} Read-only plan. Review.`, readOnly: true };
  }

  if (d.planKind === "recurring_dca") {
    const title = `Build ${token} Gradually`;
    const description = d.contributionFrequencyId === "occasional"
      ? `${token} is ${gap} percentage points below target. Use the ${amtCompact} contribution you entered to build your ${token} allocation.`
      : d.amountKind === "exact"
        ? `${token} is ${gap} percentage points below target. Direct your next ${freq} contribution to ${token} to build the position gradually.`
        : `${token} is ${gap} percentage points below target. Direct your next ${freq} contribution of ${amtSingle} to ${token}.`;
    return { title, description, tag: "DCA", impactText: `Add ${amtSingle} of ${token}`, ctaLabel: "Review", accessibilityLabel: `${title}. ${description} Read-only plan. Review.`, readOnly: true };
  }

  // staged_excess_usdc_dca
  const src = d.sourceAssetSymbol ?? "USDC";
  const title = `Move ${src} Into ${token}`;
  const description = `${token} is ${gap} percentage points below target. Gradually move ${amtCompact} of liquid USDC above your Safety Buffer into ${token} across four steps.`;
  return { title, description, tag: "DCA", impactText: `Swap ${amtCompact} of ${src} to ${token}`, ctaLabel: "Review", accessibilityLabel: `${title}. ${description} Read-only plan. Review.`, readOnly: true };
}
