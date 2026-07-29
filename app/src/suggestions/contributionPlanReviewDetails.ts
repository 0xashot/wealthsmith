/**
 * contributionPlanReviewDetails — Step 15H. Deterministic structured sections for the SHARED
 * SuggestionReviewModal (no new modal). Every value comes from the engine payload; the UI formats
 * and renders. Staged plans use relative labels ("Start", "Day 5", "Day 9", "Day 14") — never
 * calendar dates. Includes the exact read-only notice and no execution controls.
 */
import { formatUsd } from "../wallet/walletSummary";
import type { ContributionPlanSuggestionData } from "./contributionIntegrationTypes";
import type { ReviewExternalLink } from "./engineTypes";

export const CONTRIBUTION_PLAN_REVIEW_DETAILS_EXISTS = true;
export const CONTRIBUTION_PLAN_READ_ONLY_NOTICE = "Read-only plan. WealthSmith does not move funds or request a signature. You choose whether to continue in your wallet or another app.";

export interface ReviewRow {
  label: string;
  value: string;
  /** Optional subdued secondary line under the value (e.g. the USD value under a token amount). */
  subValue?: string;
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
  /**
   * Step 22F (slice 4) — honest market-context disclosure for a DCA plan. Present only when the canonical target
   * drove the plan: full confidence discloses the 10% market input + CoinMarketCap attribution + not-a-buy/sell
   * clarification; degraded discloses exclusion + renormalization. Never a score/band for degraded, never raw
   * income/expenses/cache. Absent for buffer plans and transitional Demo/testing targets.
   */
  marketContextSection?: { title: "Market context"; rows: ReviewRow[]; body: string };
  cadenceSection?: { title: string; rows: ReviewRow[] };
  scheduleSection?: { title: "Plan schedule"; steps: ReviewStep[] };
  allocationSection?: { title: "Allocation impact"; rows: ReviewRow[] };
  safetyBufferSection: { title: "Safety Buffer"; rows: ReviewRow[] };
  fundingSection: { title: "Funding source"; rows: ReviewRow[] };
  alternativeSourceSection?: { title: "Another eligible source"; rows: ReviewRow[] };
  unallocatedSection?: { title: "Not allocated by this plan"; rows: ReviewRow[] };
  /**
   * 23C.2 — optional read-only external handoff footer (e.g. "Buy SOL on Moonpay" for a future recurring DCA that
   * has no on-chain funding source yet). Opens the provider's own page in a new tab; WealthSmith prepares nothing.
   */
  externalLink?: ReviewExternalLink;
  readOnlyNotice: string;
  closeLabel: "Close";
  executionControlsPresent: false;
  /** Focused modal layout (description + card set only) — suppresses the section headings. */
  focusedLayout?: boolean;
}

const pct1 = (n: number): string => `${(Math.round(n * 10) / 10).toFixed(1)}%`;
/** Percent display: 1-decimal, trailing ".0" dropped, with a "%" suffix (30 → "30%", 36.4 → "36.4%"). */
const pctT = (n: number): string => `${Math.round(n * 10) / 10}%`;
/** Percentage-points display: 1-decimal, trailing ".0" dropped, no suffix (17 → "17", 16.5 → "16.5"). */
const ppT = (n: number): string => `${Math.round(Math.abs(n) * 10) / 10}`;
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
    // 24J — focused modal: plain-language before→after→target body + a four-card set (contribution + allocation
    // change). The full allocation/summary/funding data stays on the object; the focused layout just isn't rendered.
    const haveAlloc = d.currentTargetPct != null && d.projectedTargetPct != null && d.targetPct != null;
    // Whole amounts drop the ".00" ("$1,000") to match the card; ranges/cents keep the full amount text.
    const amtTrim = d.amountKind === "exact" && d.exactAmountUsd != null && Number.isInteger(d.exactAmountUsd)
      ? `$${d.exactAmountUsd.toLocaleString("en-US")}` : amt;
    details.whySection.body = haveAlloc
      ? `When you make your next ${amtTrim} contribution, put it into ${token}. This would increase your stablecoin allocation from ${pctT(d.currentTargetPct as number)} to an estimated ${pctT(d.projectedTargetPct as number)}, moving it closer to your ${pctT(d.targetPct as number)} target while keeping your Safety Buffer covered.`
      : `Your stablecoin allocation is ${d.gapPercentagePoints != null ? pp1(d.gapPercentagePoints) : "0.0"} percentage points below target. Directing new contributions to stablecoins moves it closer while keeping your Safety Buffer covered.`;
    details.allocationSection = { title: "Allocation impact", rows: allocationRows() };
    details.safetyBufferSection = { title: "Safety Buffer", rows: [{ label: "Status", value: "Covered — not reduced by this plan" }] };
    // Read-only external handoff (like the recurring DCA): a future contribution has no on-chain source yet, so offer
    // a user-click Moonpay link to buy the target directly (opens in a new tab; WealthSmith prepares no transaction).
    details.externalLink = { label: "Moonpay", url: `https://www.moonpay.com/buy/${token.toLowerCase()}`, ctaLabel: `Buy ${token} on Moonpay`, secondaryLabel: "Cancel", opensInNewTab: true };
    if (haveAlloc) {
      details.focusedLayout = true;
      // Stablecoin contribution is 1:1 with USD, so show the token amount ("1,000 USDC") with the USD as a sub-value.
      const stableUsd = d.amountKind === "exact" ? d.exactAmountUsd : d.representativeAmountUsd;
      const stableTokenText = stableUsd != null ? stableUsd.toLocaleString("en-US", { maximumFractionDigits: 2 }) : null;
      details.keyMetrics = [
        stableTokenText != null
          ? { label: "Next contribution", value: `${stableTokenText} ${token}`, subValue: amtTrim }
          : { label: "Next contribution", value: `${amtTrim} to ${token}` },
        { label: "Current stablecoin allocation", value: pctT(d.currentTargetPct as number) },
        { label: "After this contribution", value: pctT(d.projectedTargetPct as number) },
        { label: "Target stablecoin allocation", value: pctT(d.targetPct as number) },
      ];
    }
  } else if (d.planKind === "recurring_dca") {
    details.title = `Build ${token} Gradually`;
    details.summaryRows = [{ label: "Target", value: token }, { label: "Funding source", value: "Upcoming contribution" }, { label: "Amount", value: amt }, ...(d.contributionFrequencyId ? [{ label: "Frequency", value: FREQ_LABEL[d.contributionFrequencyId] }] : [])];
    // Per-contribution amount: the exact amount, or a range's single representative (a one-cent reconciliation split).
    const perContribUsd = d.amountKind === "exact" ? d.exactAmountUsd : d.representativeAmountUsd;
    // Projected allocation after one contribution — exact plans carry a single figure; ranges carry min/max that round
    // to the same value for a one-cent split, so either bound represents the projection.
    const projectedPct = d.projectedTargetPct ?? d.maximumProjectedTargetPct ?? d.minimumProjectedTargetPct;
    const dcaHaveAlloc = d.currentTargetPct != null && projectedPct != null && d.targetPct != null && perContribUsd != null;
    const fmtTrimDca = (usd: number): string => Number.isInteger(usd) ? `$${usd.toLocaleString("en-US")}` : `$${usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const dcaAmtTrim = perContribUsd != null ? fmtTrimDca(perContribUsd) : amt;
    // 24J — focused modal: plain-language gap→gradual body + a crypto-allocation card set (a growth-lane DCA builds
    // the volatile/crypto bucket toward target). The full allocation/cadence data stays on the object, just unrendered.
    details.whySection.body = `Your ${token} allocation is ${d.gapPercentagePoints != null ? ppT(d.gapPercentagePoints) : "0"} percentage points below target. Put your next ${dcaAmtTrim} contribution into ${token} to move closer to your target gradually.`;
    details.allocationSection = { title: "Allocation impact", rows: allocationRows() };
    details.cadenceSection = { title: "Cadence", rows: [{ label: "Cadence", value: d.contributionFrequencyId === "occasional" ? "Occasional (entered amount)" : FREQ_LABEL[d.contributionFrequencyId ?? ""] ?? "—" }, { label: "Structure", value: "The contribution cadence is the gradual structure" }] };
    details.safetyBufferSection = { title: "Safety Buffer", rows: [{ label: "Status", value: "Covered — not reduced by this plan" }] };
    if (dcaHaveAlloc) {
      details.focusedLayout = true;
      // When a sourced target price is available, show the approximate token amount ("~6.67 SOL") with the USD as a
      // sub-value; otherwise fall back to the USD amount ("$461.54 to SOL").
      const tokenAmt = typeof d.targetPriceUsd === "number" && d.targetPriceUsd > 0
        ? (Math.round(((perContribUsd as number) / d.targetPriceUsd) * 100) / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })
        : null;
      details.keyMetrics = [
        tokenAmt != null
          ? { label: "Next contribution", value: `~${tokenAmt} ${token}`, subValue: dcaAmtTrim }
          : { label: "Next contribution", value: `${dcaAmtTrim} to ${token}` },
        { label: `Current ${token} allocation`, value: pctT(d.currentTargetPct as number) },
        { label: "After this contribution", value: pctT(projectedPct as number) },
        { label: `Target ${token} allocation`, value: pctT(d.targetPct as number) },
      ];
    }
    // 23C.2 — this is a FUTURE contribution with no on-chain source yet (no swap route). Offer a read-only Moonpay
    // handoff to acquire the target directly (opens Moonpay in a new tab; WealthSmith prepares no transaction).
    details.externalLink = { label: "Moonpay", url: `https://www.moonpay.com/buy/${token.toLowerCase()}`, ctaLabel: `Buy ${token} on Moonpay`, secondaryLabel: "Cancel", opensInNewTab: true };
  } else {
    const src = d.sourceAssetSymbol ?? "USDC";
    details.title = `Move ${src} Into ${token}`;
    details.summaryRows = [{ label: "Source", value: src }, { label: "Target", value: token }, { label: "Total staged amount", value: amt }, { label: "Timing", value: "Available now" }, { label: "Steps", value: `${d.steps.length}` }, { label: "Period", value: `${d.durationDays ?? 14}-day relative period` }];
    details.whySection.body = `${token} is ${d.gapPercentagePoints != null ? pp1(d.gapPercentagePoints) : "0.0"} percentage points below its target. This stages liquid USDC above your Safety Buffer across four steps while keeping total portfolio value constant.`;
    details.scheduleSection = { title: "Plan schedule", steps: d.steps.map((s, i) => ({ label: STEP_LABEL(s.relativeDayOffset, i), amount: s.amountUsd != null ? formatUsd(s.amountUsd) : "—" })) };
    details.allocationSection = { title: "Allocation impact", rows: [...allocationRows(), { label: "Portfolio total", value: "Unchanged (internal reallocation)" }] };
    details.safetyBufferSection = { title: "Safety Buffer", rows: [...bufferRows, { label: "Status", value: "Preserved" }] };
    // 24J — focused modal: description + a Send/Receive + crypto-allocation card set. The read-only Swap Route section
    // (rendered from the funded-DCA swapAction) and its handoff footer are NOT gated by focusedLayout, so they remain.
    const stagedUsd = d.amountKind === "exact" ? d.exactAmountUsd : (d.representativeAmountUsd ?? d.maximumAmountUsd);
    const stagedProjPct = d.projectedTargetPct ?? d.maximumProjectedTargetPct ?? d.minimumProjectedTargetPct;
    if (d.currentTargetPct != null && stagedProjPct != null && d.targetPct != null && stagedUsd != null) {
      details.focusedLayout = true;
      const stagedUsdText = Number.isInteger(stagedUsd) ? `$${stagedUsd.toLocaleString("en-US")}` : `$${stagedUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const srcAmtText = stagedUsd.toLocaleString("en-US", { maximumFractionDigits: 2 }); // USDC ≈ $1
      const solAmtText = typeof d.targetPriceUsd === "number" && d.targetPriceUsd > 0
        ? (Math.round((stagedUsd / d.targetPriceUsd) * 100) / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })
        : null;
      details.keyMetrics = [
        { label: "Send", value: `${srcAmtText} ${src}`, subValue: stagedUsdText },
        solAmtText != null
          ? { label: "Receive", value: `~${solAmtText} ${token}`, subValue: stagedUsdText }
          : { label: "Receive", value: `${stagedUsdText} of ${token}` },
        { label: `Current ${token} allocation`, value: pctT(d.currentTargetPct) },
        { label: "After this contribution", value: pctT(stagedProjPct) },
        { label: `Target ${token} allocation`, value: pctT(d.targetPct) },
      ];
    }
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

/**
 * Step 22F (slice 4) — attach an honest market-context section to a DCA plan's Review (mutates in place). Full REAL
 * five-factor target → the approved 10% + CoinMarketCap + not-a-buy/sell copy; degraded → exclusion + renormalization
 * (no score, no band, no "Neutral", no current-data attribution). Transitional Demo/testing targets add NOTHING (never
 * claim market inclusion). Never exposes income/expenses/net cash flow/savings rate/score/cache internals.
 */
export function appendDcaMarketContextReview(
  reviewById: Record<string, ContributionPlanReviewDetails>,
  id: string,
  meta: {
    marketIncluded?: boolean;
    marketExclusionReason?: string | null;
    marketAdjustmentVsProfileOnlyPct?: number | null;
    finalTargetStablePct?: number;
    finalTargetCryptoPct?: number;
    targetConfidence?: string | null;
  },
): void {
  const details = reviewById[id];
  if (!details) return;
  const targetRow: ReviewRow = { label: "Target (crypto / stable)", value: `${pct1(meta.finalTargetCryptoPct ?? 0)} / ${pct1(meta.finalTargetStablePct ?? 0)}` };
  if (meta.marketIncluded === true) {
    const rows: ReviewRow[] = [targetRow];
    if (meta.marketAdjustmentVsProfileOnlyPct != null) rows.push({ label: "Market adjustment vs profile-only", value: `${meta.marketAdjustmentVsProfileOnlyPct >= 0 ? "+" : "−"}${pp1(meta.marketAdjustmentVsProfileOnlyPct)} pp` });
    rows.push({ label: "Data source", value: "CoinMarketCap" });
    details.marketContextSection = {
      title: "Market context",
      rows,
      body: "Current market conditions are included as 10% of your target-allocation calculation. Data source: CoinMarketCap — broad crypto-market sentiment; this index does not directly create buy or sell recommendations.",
    };
    return;
  }
  if (meta.targetConfidence === "degraded_market_excluded") {
    details.marketContextSection = {
      title: "Market context",
      rows: [targetRow],
      body: "Market data was unavailable or outside its approved freshness window. The market component was excluded, and the remaining profile factors were renormalized.",
    };
  }
  // Transitional / anything else → no market section (never claims inclusion).
}
