/**
 * contributionPlanAmount — Step 15G. Converts the Step 15F PRIMARY source option's capped capacity
 * into the final plan amount (exact cents, or a base…base+1¢ range), builds the exact whole-cent
 * tranche decomposition for staged existing-excess-USDC DCA, builds the plan cadence, and reports
 * unallocated (unused, unrouted) source capacity. Cap-constrained fractional cents are FLOORED so
 * rounding can never create a target overshoot; exact-cent values are preserved. No minimum policy
 * is re-applied (the upstream result is validated, not redecided).
 */
import type { ContributionFundingSourceOption, ContributionFundingSelectionResult } from "./contributionFundingTypes";
import type { ContributionFrequencyNormalizationResult } from "./contributionFrequencyTypes";
import type { ContributionPlanAmount, ContributionPlanBlocker, ContributionPlanCadence, ContributionPlanUnallocatedCapacity } from "./contributionPlanTypes";
import { EXCESS_USDC_DCA_TRANCHE_COUNT, EXCESS_USDC_DCA_DURATION_DAYS, getExcessUsdcDcaRelativeDayOffsets, CONTRIBUTION_PLAN_MINIMUM_TRANCHE_USD } from "./contributionPlanPolicy";

const TOL = 1e-6;
const finiteNonNeg = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0;

/** Convert USD to integer cents: exact when already whole cents, else FLOOR (cap-constrained). */
export function usdToPlanCents(usd: number): { cents: number; rounding: "exact_cents" | "floor_to_cents_for_cap" } {
  const scaled = usd * 100;
  const rounded = Math.round(scaled);
  if (Math.abs(scaled - rounded) <= TOL) return { cents: rounded, rounding: "exact_cents" };
  return { cents: Math.floor(scaled), rounding: "floor_to_cents_for_cap" };
}

export interface PlanAmountResult {
  ok: boolean;
  amount?: ContributionPlanAmount;
  blocker?: ContributionPlanBlocker;
}

/**
 * Build the final plan amount from the primary Step 15F source option. Uses the FULL capped capacity;
 * never below the cap, never rounded to a nicer number, never above gross capacity or the cap.
 */
export function buildContributionPlanAmountFromSourceOption(option: ContributionFundingSourceOption): PlanAmountResult {
  if (!option || (option.status !== "eligible_exact" && option.status !== "eligible_range")) return { ok: false, blocker: "primary_source_not_eligible" };
  const minimumPolicyApplied = option.minimumPolicyApplied;
  const allocationCapUsd = option.mathematicalPlanningCapUsd;
  const minUsd = minimumPolicyApplied === "absolute_50" ? 50 : minimumPolicyApplied === "excess_usdc_250" ? 250 : 0;

  if (option.status === "eligible_exact") {
    const capped = option.cappedSourceCapacityUsd;
    if (!finiteNonNeg(capped)) return { ok: false, blocker: "amount_missing" };
    const { cents, rounding } = usdToPlanCents(capped);
    if (!Number.isSafeInteger(cents) || cents < 0) return { ok: false, blocker: "amount_unsafe" };
    if (minUsd > 0 && cents / 100 < minUsd - 0.005) return { ok: false, blocker: "amount_below_minimum" };
    if (finiteNonNeg(option.grossSourceCapacityUsd) && cents / 100 > (option.grossSourceCapacityUsd as number) + TOL) return { ok: false, blocker: "amount_exceeds_source_capacity" };
    if (finiteNonNeg(allocationCapUsd) && cents / 100 > (allocationCapUsd as number) + TOL) return { ok: false, blocker: "amount_exceeds_allocation_cap" };
    const sourceCapacityCapped = finiteNonNeg(option.grossSourceCapacityUsd) && (option.grossSourceCapacityUsd as number) > cents / 100 + TOL;
    return { ok: true, amount: { kind: "exact", exactAmountCents: cents, exactAmountUsd: cents / 100, sourceCapacityCapped, roundingMode: rounding, allocationCapUsd, minimumPolicyApplied, minimumPassed: option.minimumPassed } };
  }

  // eligible_range
  const lo = option.minimumCappedSourceCapacityUsd;
  const hi = option.maximumCappedSourceCapacityUsd;
  if (!finiteNonNeg(lo) || !finiteNonNeg(hi)) return { ok: false, blocker: "amount_missing" };
  const loC = usdToPlanCents(lo as number);
  const hiC = usdToPlanCents(hi as number);
  if (!Number.isSafeInteger(loC.cents) || !Number.isSafeInteger(hiC.cents)) return { ok: false, blocker: "amount_unsafe" };
  if (loC.cents > hiC.cents) return { ok: false, blocker: "amount_range_invalid" };
  if (minUsd > 0 && loC.cents / 100 < minUsd - 0.005) return { ok: false, blocker: "amount_below_minimum" };
  if (finiteNonNeg(allocationCapUsd) && hiC.cents / 100 > (allocationCapUsd as number) + TOL) return { ok: false, blocker: "amount_exceeds_allocation_cap" };
  const capRounding: "exact_cents" | "floor_to_cents_for_cap" = loC.rounding === "floor_to_cents_for_cap" || hiC.rounding === "floor_to_cents_for_cap" ? "floor_to_cents_for_cap" : "exact_cents";
  const sourceCapacityCapped = finiteNonNeg(option.maximumGrossSourceCapacityUsd) && (option.maximumGrossSourceCapacityUsd as number) > hiC.cents / 100 + TOL;

  // Flooring collapsed the range → treat as exact.
  if (loC.cents === hiC.cents) {
    return { ok: true, amount: { kind: "exact", exactAmountCents: loC.cents, exactAmountUsd: loC.cents / 100, sourceCapacityCapped, roundingMode: capRounding, allocationCapUsd, minimumPolicyApplied, minimumPassed: option.minimumPassed } };
  }
  return { ok: true, amount: { kind: "range", minimumAmountCents: loC.cents, maximumAmountCents: hiC.cents, minimumAmountUsd: loC.cents / 100, maximumAmountUsd: hiC.cents / 100, sourceCapacityCapped, roundingMode: capRounding, allocationCapUsd, minimumPolicyApplied, minimumPassed: option.minimumPassed } };
}

/** Unused (unrouted) source capacity as context. Never routed; no next purpose selected. */
export function calculateUnallocatedSourceCapacity(option: ContributionFundingSourceOption, amount: ContributionPlanAmount): ContributionPlanUnallocatedCapacity {
  const base: ContributionPlanUnallocatedCapacity = { calculated: false, routed: false, nextPurposeSelected: false };
  if (amount.kind === "exact") {
    const gross = option.grossSourceCapacityUsd;
    if (!finiteNonNeg(gross)) return base;
    const grossCents = Math.round((gross as number) * 100);
    const unused = Math.max(0, grossCents - (amount.exactAmountCents as number));
    return { ...base, calculated: true, exactUnusedCents: unused, exactUnusedUsd: unused / 100 };
  }
  const gMin = option.minimumGrossSourceCapacityUsd;
  const gMax = option.maximumGrossSourceCapacityUsd;
  if (!finiteNonNeg(gMin) || !finiteNonNeg(gMax)) return base;
  const minUnused = Math.max(0, Math.round((gMin as number) * 100) - (amount.maximumAmountCents as number));
  const maxUnused = Math.max(0, Math.round((gMax as number) * 100) - (amount.minimumAmountCents as number));
  return { ...base, calculated: true, minimumUnusedCents: minUnused, maximumUnusedCents: maxUnused, minimumUnusedUsd: minUnused / 100, maximumUnusedUsd: maxUnused / 100 };
}

export interface TrancheDecompositionResult {
  ok: boolean;
  tranches?: number[];
  error?: ContributionPlanBlocker;
}

/**
 * Exact whole-cent tranche decomposition: `base = floor(total/count)`, `rem = total%count`; the
 * earliest `rem` tranche indices get one extra cent. Deterministic; sum reconciles exactly.
 */
export function buildExactPlanTranches(totalAmountCents: number, trancheCount: number): TrancheDecompositionResult {
  if (!Number.isSafeInteger(totalAmountCents) || totalAmountCents <= 0) return { ok: false, error: "tranche_amount_invalid" };
  if (!Number.isSafeInteger(trancheCount) || trancheCount <= 0) return { ok: false, error: "tranche_policy_invalid" };
  const base = Math.floor(totalAmountCents / trancheCount);
  const rem = totalAmountCents % trancheCount;
  const tranches: number[] = [];
  for (let i = 0; i < trancheCount; i++) tranches.push(base + (i < rem ? 1 : 0));
  const sum = tranches.reduce((s, c) => s + c, 0);
  if (sum !== totalAmountCents) return { ok: false, error: "tranche_total_mismatch" };
  const spread = Math.max(...tranches) - Math.min(...tranches);
  if (spread > 1) return { ok: false, error: "tranche_amount_invalid" };
  if (tranches.some((c) => c / 100 < CONTRIBUTION_PLAN_MINIMUM_TRANCHE_USD - 0.005)) return { ok: false, error: "tranche_below_minimum" };
  return { ok: true, tranches };
}

/** Build the plan cadence from the funding selection + normalization (never generates calendar dates). */
export function buildContributionPlanCadence(
  fundingSelection: ContributionFundingSelectionResult,
  frequencyNormalization: ContributionFrequencyNormalizationResult | undefined,
  primarySourceId: "upcoming_contribution" | "existing_excess_usdc",
): ContributionPlanCadence {
  if (primarySourceId === "existing_excess_usdc") {
    return { mode: "staged_existing_capital", trancheCount: EXCESS_USDC_DCA_TRANCHE_COUNT, durationDays: EXCESS_USDC_DCA_DURATION_DAYS, relativeDayOffsets: getExcessUsdcDcaRelativeDayOffsets(), actualCalendarDatesGenerated: false };
  }
  // upcoming_contribution — explicit amount vs recurring template.
  const explicitUsed = fundingSelection.contributionFrequencyApplied === false;
  const fnId = frequencyNormalization?.canonicalFrequencyId;
  if (explicitUsed) {
    return { mode: "explicit_current_contribution", ...(fnId ? { contributionFrequencyId: fnId } : {}), actualCalendarDatesGenerated: false };
  }
  // The representative per-contribution amount for compact UI: the rounded average
  // (annual goal ÷ contributions per year). When the exact split varies by one cent to reconcile
  // the annual total, rounding lands on the amount the majority of contributions actually are.
  const dec = frequencyNormalization?.centDecomposition;
  const representativeCents = dec != null && dec.contributionsPerYear > 0
    ? Math.round(dec.annualSavingGoalCents / dec.contributionsPerYear)
    : undefined;
  return {
    mode: "recurring_contribution_template",
    ...(fnId ? { contributionFrequencyId: fnId } : {}),
    ...(frequencyNormalization?.contributionsPerYear != null ? { contributionsPerYear: frequencyNormalization.contributionsPerYear } : {}),
    amountVariesByOneCent: (dec?.remainderCents ?? 0) > 0,
    ...(representativeCents != null ? { representativeContributionAmountUsd: representativeCents / 100 } : {}),
    actualCalendarDatesGenerated: false,
  };
}

export interface PlanAmountValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateContributionPlanAmount(amount: unknown): PlanAmountValidationResult {
  const errors: string[] = [];
  if (!amount || typeof amount !== "object") return { valid: false, errors: ["amount_not_an_object"] };
  const a = amount as ContributionPlanAmount;
  if (a.kind === "exact") {
    if (!Number.isSafeInteger(a.exactAmountCents) || (a.exactAmountCents as number) < 0) errors.push("amount_unsafe");
    else if (Math.abs((a.exactAmountUsd as number) - (a.exactAmountCents as number) / 100) > 1e-9) errors.push("amount_usd_mismatch");
    if (a.minimumAmountCents != null || a.maximumAmountCents != null) errors.push("exact_with_range_fields");
  } else if (a.kind === "range") {
    if (!Number.isSafeInteger(a.minimumAmountCents) || !Number.isSafeInteger(a.maximumAmountCents)) errors.push("amount_unsafe");
    else if ((a.minimumAmountCents as number) > (a.maximumAmountCents as number)) errors.push("amount_range_invalid");
    else if ((a.minimumAmountCents as number) === (a.maximumAmountCents as number)) errors.push("range_should_be_exact");
    if (a.exactAmountCents != null) errors.push("range_with_exact_field");
  } else errors.push("invalid_amount_kind");
  if (!["exact_cents", "floor_to_cents_for_cap"].includes(a.roundingMode)) errors.push("invalid_rounding_mode");
  const minUsd = a.minimumPolicyApplied === "absolute_50" ? 50 : a.minimumPolicyApplied === "excess_usdc_250" ? 250 : 0;
  if (minUsd > 0) {
    const v = a.kind === "exact" ? (a.exactAmountCents as number) / 100 : (a.minimumAmountCents as number) / 100;
    if (v < minUsd - 0.005) errors.push("amount_below_minimum");
    if (!a.minimumPassed) errors.push("minimum_not_passed_but_eligible");
  }
  // A cap-constrained (floored) amount must never round upward past the cap.
  if (a.roundingMode === "floor_to_cents_for_cap" && a.allocationCapUsd != null) {
    const v = a.kind === "exact" ? (a.exactAmountCents as number) / 100 : (a.maximumAmountCents as number) / 100;
    if (v > (a.allocationCapUsd as number) + 1e-9) errors.push("amount_rounding_would_overshoot");
  }
  return { valid: errors.length === 0, errors };
}

export function validateContributionPlanCadence(cadence: unknown): PlanAmountValidationResult {
  const errors: string[] = [];
  if (!cadence || typeof cadence !== "object") return { valid: false, errors: ["cadence_not_an_object"] };
  const c = cadence as ContributionPlanCadence;
  if (c.actualCalendarDatesGenerated !== false) errors.push("calendar_dates_generated");
  if (c.mode === "staged_existing_capital") {
    if (c.trancheCount !== 4) errors.push("wrong_tranche_count");
    if (c.durationDays !== 14) errors.push("wrong_duration_days");
    if ((c.relativeDayOffsets ?? []).join(",") !== "0,5,9,14") errors.push("wrong_offsets");
    if (c.contributionFrequencyId != null) errors.push("staged_with_frequency");
  } else if (c.mode === "recurring_contribution_template") {
    if (c.trancheCount != null || c.relativeDayOffsets != null) errors.push("recurring_with_tranches");
  } else if (c.mode === "explicit_current_contribution") {
    if (c.trancheCount != null || c.relativeDayOffsets != null) errors.push("explicit_with_tranches");
  } else errors.push("invalid_cadence_mode");
  return { valid: errors.length === 0, errors };
}
