/**
 * contributionPlanReviewDetails — Step 15H. Deterministic structured sections for the SHARED
 * SuggestionReviewModal (no new modal). Every value comes from the engine payload; the UI formats
 * and renders. Staged plans use relative labels ("Start", "Day 5", "Day 9", "Day 14") — never
 * calendar dates. Includes the exact read-only notice and no execution controls.
 */
import { formatUsd } from "../wallet/walletSummary";
import type { ContributionPlanSuggestionData } from "./contributionIntegrationTypes";

export const CONTRIBUTION_PLAN_REVIEW_DETAILS_EXISTS = true;
export const CONTRIBUTION_PLAN_READ_ONLY_NOTICE = "Read-only plan. WealthSmith does not move funds or request a signature. You choose whether to continue in your wallet or another app.";

export interface ReviewRow {
  label: string;
  value: string;
}
export interface ReviewStep {
  label: string;
  amount: string;
}
export interface ContributionPlanReviewDetails {
  title: string;
  subtitle?: string;
  summaryRows: ReviewRow[];
  /** Key-metric cards for the modal (amount, value, cadence, current/target/projected allocation). */
  keyMetrics: ReviewRow[];
  whySection: { title: "Why this plan"; body: string };
  cadenceSection?: { title: string; rows: ReviewRow[] };
  scheduleSection?: { title: "Plan schedule"; steps: ReviewStep[] };
  allocationSection?: { title: "Allocation impact"; rows: ReviewRow[] };
  safetyBufferSection: { title: "Safety Buffer"; rows: ReviewRow[] };
  fundingSection: { title: "Funding source"; rows: ReviewRow[] };
  alternativeSourceSection?: { title: "Another eligible source"; rows: ReviewRow[] };
  unallocatedSection?: { title: "Not allocated by this plan"; rows: ReviewRow[] };
  readOnlyNotice: string;
  closeLabel: "Close";
  executionControlsPresent: false;
}

const pct1 = (n: number): string => `${(Math.round(n * 10) / 10).toFixed(1)}%`;
const pp1 = (n: number): string => (Math.round(Math.abs(n) * 10) / 10).toFixed(1);
const FREQ_LABEL: Record<string, string> = { weekly: "Weekly", biweekly: "Bi-Weekly", monthly: "Monthly", quarterly: "Quarterly", occasional: "Occasional" };
const SOURCE_LABEL: Record<string, string> = { upcoming_contribution: "Upcoming contribution", existing_excess_usdc: "Existing excess USDC" };
const STEP_LABEL = (offset: number | undefined, i: number): string => (offset === 0 || (offset == null && i === 0) ? "Start" : `Day ${offset ?? ""}`);

function amountText(d: ContributionPlanSuggestionData): string {
  return d.amountKind === "exact" ? formatUsd(d.exactAmountUsd as number) : `${formatUsd(d.minimumAmountUsd as number)}–${formatUsd(d.maximumAmountUsd as number)}`;
}

/** Build the structured review sections for the shared modal from the plan payload. */
export function buildContributionPlanReviewDetails(d: ContributionPlanSuggestionData): ContributionPlanReviewDetails {
  const token = d.targetSymbol;
  const amt = amountText(d);
  const fundingRows: ReviewRow[] = [
    { label: "Source", value: SOURCE_LABEL[d.fundingSourceId] },
    { label: "Timing", value: d.fundingTiming === "expected_future" ? "Expected future contribution" : "Available now" },
  ];
  const bufferRows: ReviewRow[] = [];
  if (d.requiredBufferUsd != null) bufferRows.push({ label: "Required buffer", value: formatUsd(d.requiredBufferUsd) });
  if (d.currentBufferUsd != null) bufferRows.push({ label: "Current eligible buffer", value: formatUsd(d.currentBufferUsd) });
  if (d.currentBufferShortfallUsd != null) bufferRows.push({ label: "Current shortfall", value: formatUsd(d.currentBufferShortfallUsd) });
  if (d.projectedBufferUsd != null) bufferRows.push({ label: "Projected buffer", value: formatUsd(d.projectedBufferUsd) });
  if (d.projectedBufferShortfallUsd != null) bufferRows.push({ label: "Projected shortfall", value: formatUsd(d.projectedBufferShortfallUsd) });

  const details: ContributionPlanReviewDetails = {
    title: "",
    summaryRows: [],
    keyMetrics: [],
    whySection: { title: "Why this plan", body: "" },
    safetyBufferSection: { title: "Safety Buffer", rows: bufferRows.length ? bufferRows : [{ label: "Status", value: "Preserved" }] },
    fundingSection: { title: "Funding source", rows: fundingRows },
    readOnlyNotice: CONTRIBUTION_PLAN_READ_ONLY_NOTICE,
    closeLabel: "Close",
    executionControlsPresent: false,
  };

  const allocationRows = (): ReviewRow[] => {
    const rows: ReviewRow[] = [];
    if (d.currentTargetPct != null) rows.push({ label: `Current ${token} allocation`, value: pct1(d.currentTargetPct) });
    if (d.targetPct != null) rows.push({ label: `Target ${token} allocation`, value: pct1(d.targetPct) });
    if (d.amountKind === "range" && d.minimumProjectedTargetPct != null && d.maximumProjectedTargetPct != null) rows.push({ label: "Projected allocation", value: `${pct1(d.minimumProjectedTargetPct)}–${pct1(d.maximumProjectedTargetPct)}` });
    else if (d.projectedTargetPct != null) rows.push({ label: "Projected allocation", value: pct1(d.projectedTargetPct) });
    if (d.gapPercentagePoints != null) rows.push({ label: "Current gap", value: `${pp1(d.gapPercentagePoints)} percentage points` });
    return rows;
  };

  // Key-metric cards for the modal. DCA contributions are USD-denominated, so amount and value are the same
  // dollar figure; cadence + current/target/projected allocation come straight from the plan payload.
  const cadenceLabel = d.contributionFrequencyId
    ? (d.contributionFrequencyId === "occasional" ? "Occasional (entered amount)" : FREQ_LABEL[d.contributionFrequencyId] ?? "—")
    : undefined;
  const projectedAlloc = d.amountKind === "range" && d.minimumProjectedTargetPct != null && d.maximumProjectedTargetPct != null
    ? `${pct1(d.minimumProjectedTargetPct)}–${pct1(d.maximumProjectedTargetPct)}`
    : d.projectedTargetPct != null ? pct1(d.projectedTargetPct) : undefined;
  details.keyMetrics = [
    { label: `${token} value`, value: amt },
    ...(cadenceLabel ? [{ label: "Cadence", value: cadenceLabel }] : []),
    ...(d.currentTargetPct != null ? [{ label: `Current ${token} allocation`, value: pct1(d.currentTargetPct) }] : []),
    ...(d.targetPct != null ? [{ label: `Target ${token} allocation`, value: pct1(d.targetPct) }] : []),
    ...(projectedAlloc ? [{ label: "Projected allocation", value: projectedAlloc }] : []),
  ];

  if (d.planKind === "safety_buffer") {
    details.title = "Top Up Your Safety Buffer";
    details.summaryRows = [{ label: "Purpose", value: "Increase Safety Buffer" }, { label: "Target asset", value: token }, { label: "Funding source", value: SOURCE_LABEL[d.fundingSourceId] }, { label: "Contribution amount", value: amt }];
    details.whySection.body = `Your Safety Buffer is below target, so it has priority before any allocation action. Directing ${amt} from your next contribution reduces the shortfall.`;
  } else if (d.planKind === "stable_contribution") {
    details.title = `Direct Next Contribution to ${token}`;
    details.summaryRows = [{ label: "Target", value: token }, { label: "Funding source", value: "Upcoming contribution" }, { label: "Amount", value: amt }, ...(d.contributionFrequencyId ? [{ label: "Frequency", value: FREQ_LABEL[d.contributionFrequencyId] }] : [])];
    details.whySection.body = `Your stablecoin allocation is ${d.gapPercentagePoints != null ? pp1(d.gapPercentagePoints) : "0.0"} percentage points below target. Directing new contributions to stablecoins moves it closer while keeping your Safety Buffer covered.`;
    details.allocationSection = { title: "Allocation impact", rows: allocationRows() };
    details.safetyBufferSection = { title: "Safety Buffer", rows: [{ label: "Status", value: "Covered — not reduced by this plan" }] };
  } else if (d.planKind === "recurring_dca") {
    details.title = `Build ${token} Gradually`;
    details.summaryRows = [{ label: "Target", value: token }, { label: "Funding source", value: "Upcoming contribution" }, { label: "Amount", value: amt }, ...(d.contributionFrequencyId ? [{ label: "Frequency", value: FREQ_LABEL[d.contributionFrequencyId] }] : [])];
    details.whySection.body = `${token} is ${d.gapPercentagePoints != null ? pp1(d.gapPercentagePoints) : "0.0"} percentage points below target. Your regular contribution schedule already provides a gradual approach, so each contribution does not need to be split into smaller purchases.`;
    details.allocationSection = { title: "Allocation impact", rows: allocationRows() };
    details.cadenceSection = { title: "Cadence", rows: [{ label: "Cadence", value: d.contributionFrequencyId === "occasional" ? "Occasional (entered amount)" : FREQ_LABEL[d.contributionFrequencyId ?? ""] ?? "—" }, { label: "Structure", value: "The contribution cadence is the gradual structure" }] };
    details.safetyBufferSection = { title: "Safety Buffer", rows: [{ label: "Status", value: "Covered — not reduced by this plan" }] };
  } else {
    details.title = `Move ${d.sourceAssetSymbol ?? "USDC"} Into ${token}`;
    details.summaryRows = [{ label: "Source", value: d.sourceAssetSymbol ?? "USDC" }, { label: "Target", value: token }, { label: "Total staged amount", value: amt }, { label: "Timing", value: "Available now" }, { label: "Steps", value: `${d.steps.length}` }, { label: "Period", value: `${d.durationDays ?? 14}-day relative period` }];
    details.whySection.body = `${token} is ${d.gapPercentagePoints != null ? pp1(d.gapPercentagePoints) : "0.0"} percentage points below its target. This stages liquid USDC above your Safety Buffer across four steps while keeping total portfolio value constant.`;
    details.scheduleSection = { title: "Plan schedule", steps: d.steps.map((s, i) => ({ label: STEP_LABEL(s.relativeDayOffset, i), amount: s.amountUsd != null ? formatUsd(s.amountUsd) : "—" })) };
    details.allocationSection = { title: "Allocation impact", rows: [...allocationRows(), { label: "Portfolio total", value: "Unchanged (internal reallocation)" }] };
    details.safetyBufferSection = { title: "Safety Buffer", rows: [...bufferRows, { label: "Status", value: "Preserved" }] };
  }

  // Alternative source (context only — no second plan, no source switcher).
  if (d.alternativeFundingSourceIds.length > 0) {
    details.alternativeSourceSection = { title: "Another eligible source", rows: d.alternativeFundingSourceIds.map((id) => ({ label: SOURCE_LABEL[id], value: "Eligible (context only)" })) };
  }
  // Unallocated capacity (only when material).
  const unused = d.unallocatedSourceCapacityUsd;
  if (typeof unused === "number" && unused >= 0.005) {
    details.unallocatedSection = { title: "Not allocated by this plan", rows: [{ label: "Not allocated", value: formatUsd(unused) }] };
  }
  return details;
}
