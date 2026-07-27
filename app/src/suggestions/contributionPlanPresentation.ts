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
/** Percent display: 1-decimal, trailing ".0" dropped, with a "%" suffix (e.g. 30 → "30%", 36.4 → "36.4%"). */
const pctT = (n: number): string => `${Math.round(n * 10) / 10}%`;
/** Percentage-points display: 1-decimal, trailing ".0" dropped, no suffix (e.g. 17 → "17", 16.5 → "16.5"). */
const ppT = (n: number): string => `${Math.round(Math.abs(n) * 10) / 10}`;

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
    // 24J — when current / projected / target allocation are all known, name the before→after→target change; else
    // fall back to the generic gap phrasing.
    const description = d.currentTargetPct != null && d.projectedTargetPct != null && d.targetPct != null
      ? `When you make your next ${amtSingle} contribution, put it into ${token}. This would increase your stablecoin allocation from ${pctT(d.currentTargetPct)} to an estimated ${pctT(d.projectedTargetPct)}, moving it closer to your ${pctT(d.targetPct)} target while keeping your Safety Buffer covered.`
      : d.amountKind === "exact"
        ? `Your stablecoin allocation is ${gap} percentage points below target. Direct your next ${freq} contribution to ${token} to move closer to target.`
        : `Your stablecoin allocation is ${gap} percentage points below target. Direct your next ${freq} contribution of ${amtSingle} to ${token}.`;
    return { title, description, tag: "Allocation", impactText: `Add ${amtSingle} of ${token}`, ctaLabel: "Review", accessibilityLabel: `${title}. ${description} Read-only plan. Review.`, readOnly: true };
  }

  if (d.planKind === "recurring_dca") {
    const title = `Build ${token} Gradually`;
    // 24J — plain-language body naming the amount + the gradual move toward target. Occasional (already-entered)
    // contributions keep their own phrasing.
    const description = d.contributionFrequencyId === "occasional"
      ? `${token} is ${gap} percentage points below target. Use the ${amtCompact} contribution you entered to build your ${token} allocation.`
      : `Your ${token} allocation is ${d.gapPercentagePoints != null ? ppT(d.gapPercentagePoints) : "0"} percentage points below target. Put your next ${amtSingle} contribution into ${token} to move closer to your target gradually.`;
    return { title, description, tag: "DCA", impactText: `Add ${amtSingle} of ${token}`, ctaLabel: "Review", accessibilityLabel: `${title}. ${description} Read-only plan. Review.`, readOnly: true };
  }

  // staged_excess_usdc_dca
  const src = d.sourceAssetSymbol ?? "USDC";
  const title = `Move ${src} Into ${token}`;
  const description = `${token} is ${gap} percentage points below target. Gradually move ${amtCompact} of liquid USDC above your Safety Buffer into ${token} across four steps.`;
  return { title, description, tag: "DCA", impactText: `Swap ${amtCompact} of ${src} to ${token}`, ctaLabel: "Review", accessibilityLabel: `${title}. ${description} Read-only plan. Review.`, readOnly: true };
}
