/**
 * contributionFrequencyNormalization — Step 15B. Deterministically converts a monthly saving goal
 * + onboarding contribution frequency into an annual saving budget and, for FIXED frequencies, an
 * exact whole-cent per-contribution decomposition. Occasional is a valid IRREGULAR result with no
 * invented count or amount. Internal totals are integer cents (no premature rounding); display
 * approximations round to 2 decimals for display only. Fails closed. It selects no target,
 * evaluates no allocation gap / buffer / suitability, generates no plan / DCA / suggestion / dates,
 * and adds no transactions or signatures.
 */
import {
  CONTRIBUTION_FREQUENCY_SCHEMA_VERSION,
  CONTRIBUTION_FREQUENCY_POLICY_VERSION,
  type ContributionCentDecomposition,
  type ContributionFrequencyId,
  type ContributionFrequencyNormalizationInput,
  type ContributionFrequencyNormalizationResult,
  type ContributionFrequencyNormalizationStatus,
} from "./contributionFrequencyTypes";
import {
  getContributionFrequencyDefinition,
  resolveContributionFrequencyId,
} from "./contributionFrequencyPolicy";

/** Narrow tolerance to accept ordinary JS decimals (1000.1 → 100010 cents) but reject 1000.123. */
const CENT_PRECISION_TOLERANCE = 1e-6;
const round2 = (n: number) => Math.round(n * 100) / 100;

/* ------------------------------------------------------------------ *
 * Monthly saving goal → integer cents.
 * ------------------------------------------------------------------ */
export type MonthlyGoalCentsBlocker =
  | "monthly_saving_goal_missing"
  | "monthly_saving_goal_negative"
  | "monthly_saving_goal_invalid_precision"
  | "monthly_saving_goal_not_finite"
  | "monthly_saving_goal_unsafe";

export interface MonthlyGoalCentsResult {
  ok: boolean;
  cents?: number;
  isZero?: boolean;
  blocker?: MonthlyGoalCentsBlocker;
}

/** Convert a monthly saving goal (USD) to integer cents deterministically. Fails closed. */
export function normalizeMonthlySavingGoalToCents(monthlySavingGoalUsd: unknown): MonthlyGoalCentsResult {
  if (monthlySavingGoalUsd == null) return { ok: false, blocker: "monthly_saving_goal_missing" };
  if (typeof monthlySavingGoalUsd !== "number") return { ok: false, blocker: "monthly_saving_goal_not_finite" };
  if (!Number.isFinite(monthlySavingGoalUsd)) return { ok: false, blocker: "monthly_saving_goal_not_finite" };
  if (monthlySavingGoalUsd < 0) return { ok: false, blocker: "monthly_saving_goal_negative" };
  const scaled = monthlySavingGoalUsd * 100;
  const cents = Math.round(scaled);
  // Reject values with more than two meaningful decimal places (e.g. 1000.123).
  if (Math.abs(scaled - cents) > CENT_PRECISION_TOLERANCE) return { ok: false, blocker: "monthly_saving_goal_invalid_precision" };
  if (!Number.isSafeInteger(cents)) return { ok: false, blocker: "monthly_saving_goal_unsafe" };
  return { ok: true, cents, isZero: cents === 0 };
}

/* ------------------------------------------------------------------ *
 * Exact whole-cent decomposition (fixed frequencies only).
 * ------------------------------------------------------------------ */
export interface CentDecompositionResult {
  ok: boolean;
  decomposition?: ContributionCentDecomposition;
  error?: string;
}

/**
 * Build the exact whole-cent decomposition: `remainderCents` contributions get one extra cent,
 * the rest get the base amount, and the annual total reconciles exactly. Does NOT assign dates.
 */
export function buildContributionCentDecomposition(annualSavingGoalCents: number, contributionsPerYear: number): CentDecompositionResult {
  if (!Number.isSafeInteger(annualSavingGoalCents) || annualSavingGoalCents < 0) return { ok: false, error: "invalid_annual_cents" };
  if (!Number.isSafeInteger(contributionsPerYear) || contributionsPerYear <= 0) return { ok: false, error: "invalid_contributions_per_year" };

  const baseContributionCents = Math.floor(annualSavingGoalCents / contributionsPerYear);
  const remainderCents = annualSavingGoalCents % contributionsPerYear;
  const contributionsAtBasePlusOneCent = remainderCents;
  const contributionsAtBaseAmount = contributionsPerYear - remainderCents;

  // Reconcile exactly.
  const reconstructed = baseContributionCents * contributionsAtBaseAmount + (baseContributionCents + 1) * contributionsAtBasePlusOneCent;
  const countSum = contributionsAtBaseAmount + contributionsAtBasePlusOneCent;
  if (reconstructed !== annualSavingGoalCents || countSum !== contributionsPerYear) return { ok: false, error: "decomposition_does_not_reconcile" };

  return {
    ok: true,
    decomposition: {
      annualSavingGoalCents,
      contributionsPerYear,
      baseContributionCents,
      remainderCents,
      contributionsAtBaseAmount,
      contributionsAtBasePlusOneCent,
      baseContributionAmountUsd: baseContributionCents / 100,
      basePlusOneCentContributionAmountUsd: (baseContributionCents + 1) / 100,
      exactAnnualReconciliation: true,
    },
  };
}

/* ------------------------------------------------------------------ *
 * Normalize.
 * ------------------------------------------------------------------ */
function shell(input: ContributionFrequencyNormalizationInput | undefined, status: ContributionFrequencyNormalizationStatus): ContributionFrequencyNormalizationResult {
  return {
    schemaVersion: CONTRIBUTION_FREQUENCY_SCHEMA_VERSION,
    policyVersion: CONTRIBUTION_FREQUENCY_POLICY_VERSION,
    status,
    ...(input && "monthlySavingGoalUsd" in input ? { sourceMonthlySavingGoalUsd: input.monthlySavingGoalUsd } : {}),
    ...(input && "contributionFrequency" in input ? { sourceContributionFrequency: input.contributionFrequency } : {}),
    currency: "USD",
    contributionDatesCalculated: false,
    targetSelected: false,
    allocationGapEvaluated: false,
    safetyBufferEvaluated: false,
    userSuitabilityEvaluated: false,
    contributionPlanGenerated: false,
    dcaPlanGenerated: false,
    suggestionGenerated: false,
    transactionsEnabled: false,
    walletSignatureRequired: false,
    blockers: [],
    warnings: [],
    notes: [],
  };
}

/** Normalize a monthly saving goal + onboarding contribution frequency. Deterministic, fail-closed. */
export function normalizeContributionFrequency(input: ContributionFrequencyNormalizationInput): ContributionFrequencyNormalizationResult {
  if (!input || typeof input !== "object") {
    const r = shell(undefined, "unsafe_numeric_input");
    r.blockers.push("monthly_saving_goal_missing");
    return r;
  }

  // Currency (USD only).
  if (input.currency != null && input.currency !== "USD") {
    const r = shell(input, "invalid_currency");
    r.blockers.push("currency_unsupported");
    return r;
  }

  // Frequency presence + resolution.
  if (input.contributionFrequency == null || (typeof input.contributionFrequency === "string" && input.contributionFrequency.trim().length === 0)) {
    const r = shell(input, "missing_frequency");
    r.blockers.push("contribution_frequency_missing");
    return r;
  }
  const canonicalFrequencyId = resolveContributionFrequencyId(input.contributionFrequency);
  if (!canonicalFrequencyId) {
    const r = shell(input, "unsupported_frequency");
    r.blockers.push("contribution_frequency_unsupported");
    return r;
  }

  // Monthly goal → cents.
  const goal = normalizeMonthlySavingGoalToCents(input.monthlySavingGoalUsd);
  if (!goal.ok) {
    const status: ContributionFrequencyNormalizationStatus = goal.blocker === "monthly_saving_goal_unsafe" ? "unsafe_numeric_input" : "invalid_saving_goal";
    const r = shell(input, status);
    r.blockers.push(goal.blocker!);
    return r;
  }
  const monthlyCents = goal.cents!;
  if (goal.isZero) {
    const r = shell(input, "no_saving_goal");
    r.notes.push("Monthly saving goal is zero — no annual budget to normalize.");
    return r;
  }

  // Annualize (integer cents; guard safe integer).
  const annualCents = monthlyCents * 12;
  if (!Number.isSafeInteger(annualCents)) {
    const r = shell(input, "unsafe_numeric_input");
    r.blockers.push("annual_total_unsafe");
    return r;
  }

  const def = getContributionFrequencyDefinition(canonicalFrequencyId)!;
  const base = shell(input, "normalized_fixed");
  base.canonicalFrequencyId = canonicalFrequencyId;
  base.frequencyDisplayLabel = def.displayLabel;
  base.fixedFrequency = def.fixedFrequency;
  base.monthlySavingGoalCents = monthlyCents;
  base.annualSavingGoalCents = annualCents;
  base.monthlySavingGoalUsd = monthlyCents / 100;
  base.annualSavingGoalUsd = annualCents / 100;

  // Occasional — irregular; no fixed count/amount/decomposition.
  if (!def.fixedFrequency) {
    base.status = "normalized_occasional";
    base.warnings.push("contribution_amount_requires_future_user_input");
    base.notes.push("Occasional: the annual saving budget is known, but individual contribution timing and amounts are not assumed. A future step may use a user-entered amount, a detected cash contribution, or excess USDC — never an invented recurring schedule.");
    return base;
  }

  // Fixed frequency — exact average + whole-cent decomposition.
  const cpy = def.contributionsPerYear!;
  base.contributionsPerYear = cpy;
  base.exactAverageContributionAmountUsd = annualCents / cpy / 100; // may exceed 2 decimals
  base.approximateDisplayContributionAmountUsd = round2(base.exactAverageContributionAmountUsd);

  const decomp = buildContributionCentDecomposition(annualCents, cpy);
  if (!decomp.ok || !decomp.decomposition) {
    const r = shell(input, "unsafe_numeric_input");
    r.blockers.push("decomposition_invalid");
    return r;
  }
  base.centDecomposition = decomp.decomposition;
  if (decomp.decomposition.remainderCents > 0) base.warnings.push("average_amount_requires_cent_distribution");
  return base;
}

/* ------------------------------------------------------------------ *
 * Validation.
 * ------------------------------------------------------------------ */
export interface NormalizationValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateContributionFrequencyNormalizationInput(input: unknown): NormalizationValidationResult {
  const errors: string[] = [];
  if (!input || typeof input !== "object") return { valid: false, errors: ["input_not_an_object"] };
  const i = input as ContributionFrequencyNormalizationInput;
  if (!("monthlySavingGoalUsd" in i)) errors.push("missing_monthly_saving_goal");
  if (!("contributionFrequency" in i)) errors.push("missing_contribution_frequency");
  if (i.currency != null && i.currency !== "USD") errors.push("unsupported_currency");
  return { valid: errors.length === 0, errors };
}

export function validateContributionCentDecomposition(d: unknown): NormalizationValidationResult {
  const errors: string[] = [];
  if (!d || typeof d !== "object") return { valid: false, errors: ["decomposition_not_an_object"] };
  const c = d as ContributionCentDecomposition;
  if (!Number.isSafeInteger(c.annualSavingGoalCents) || c.annualSavingGoalCents < 0) errors.push("invalid_annual_cents");
  if (!Number.isSafeInteger(c.contributionsPerYear) || c.contributionsPerYear <= 0) errors.push("invalid_contributions_per_year");
  if (c.contributionsAtBaseAmount + c.contributionsAtBasePlusOneCent !== c.contributionsPerYear) errors.push("counts_do_not_sum");
  if (c.contributionsAtBasePlusOneCent !== c.remainderCents) errors.push("remainder_count_mismatch");
  if (c.basePlusOneCentContributionAmountUsd - c.baseContributionAmountUsd !== 0.01 && (c.baseContributionCents + 1) / 100 !== c.basePlusOneCentContributionAmountUsd) errors.push("base_plus_one_not_one_cent_above");
  const reconstructed = c.baseContributionCents * c.contributionsAtBaseAmount + (c.baseContributionCents + 1) * c.contributionsAtBasePlusOneCent;
  if (reconstructed !== c.annualSavingGoalCents) errors.push("does_not_reconcile");
  if (c.exactAnnualReconciliation !== true) errors.push("reconciliation_flag_false");
  return { valid: errors.length === 0, errors };
}

const VALID_STATUSES: ContributionFrequencyNormalizationStatus[] = ["normalized_fixed", "normalized_occasional", "no_saving_goal", "invalid_saving_goal", "missing_frequency", "unsupported_frequency", "invalid_currency", "unsafe_numeric_input"];

/** Validate a normalization result. Fails closed on any inconsistency. */
export function validateContributionFrequencyNormalizationResult(result: unknown): NormalizationValidationResult {
  const errors: string[] = [];
  if (!result || typeof result !== "object") return { valid: false, errors: ["result_not_an_object"] };
  const r = result as ContributionFrequencyNormalizationResult;

  if (r.schemaVersion !== CONTRIBUTION_FREQUENCY_SCHEMA_VERSION) errors.push("wrong_schema_version");
  if (r.policyVersion !== CONTRIBUTION_FREQUENCY_POLICY_VERSION) errors.push("wrong_policy_version");
  if (!VALID_STATUSES.includes(r.status)) errors.push("invalid_status");
  if (r.currency !== "USD") errors.push("unsupported_currency");

  // Capability flags must all be false.
  const flagsFalse = r.contributionDatesCalculated === false && r.targetSelected === false && r.allocationGapEvaluated === false && r.safetyBufferEvaluated === false && r.userSuitabilityEvaluated === false && r.contributionPlanGenerated === false && r.dcaPlanGenerated === false && r.suggestionGenerated === false && r.transactionsEnabled === false && r.walletSignatureRequired === false;
  if (!flagsFalse) errors.push("capability_flag_enabled");

  const isSuccess = r.status === "normalized_fixed" || r.status === "normalized_occasional";
  const isNoGoal = r.status === "no_saving_goal";
  if (isSuccess || isNoGoal) {
    if (r.blockers.length > 0) errors.push("success_status_with_blockers");
  } else {
    if (r.blockers.length === 0) errors.push("failure_status_without_blocker");
  }

  if (r.annualSavingGoalCents != null) {
    if (!Number.isSafeInteger(r.annualSavingGoalCents) || r.annualSavingGoalCents < 0) errors.push("unsafe_annual_cents");
    if (r.monthlySavingGoalCents != null && r.annualSavingGoalCents !== r.monthlySavingGoalCents * 12) errors.push("annual_not_monthly_times_12");
  }

  if (r.status === "normalized_fixed") {
    if (!Number.isSafeInteger(r.contributionsPerYear) || (r.contributionsPerYear as number) <= 0) errors.push("fixed_without_contributions_per_year");
    if (!r.centDecomposition) errors.push("fixed_without_decomposition");
    else {
      const dv = validateContributionCentDecomposition(r.centDecomposition);
      if (!dv.valid) errors.push(`decomposition_invalid:${dv.errors.join("/")}`);
      // The internal total uses exact cents (never the rounded display value).
      if (r.annualSavingGoalCents != null && r.centDecomposition.annualSavingGoalCents !== r.annualSavingGoalCents) errors.push("display_used_as_internal_total");
    }
  }
  if (r.status === "normalized_occasional") {
    if (r.contributionsPerYear != null) errors.push("occasional_with_contributions_per_year");
    if (r.exactAverageContributionAmountUsd != null) errors.push("occasional_with_average_amount");
    if (r.centDecomposition != null) errors.push("occasional_with_decomposition");
  }

  return { valid: errors.length === 0, errors };
}

/* ------------------------------------------------------------------ *
 * Diagnostics.
 * ------------------------------------------------------------------ */
export interface ContributionFrequencyDiagnostics {
  status: ContributionFrequencyNormalizationStatus;
  sourceMonthlySavingGoalUsd?: unknown;
  sourceContributionFrequency?: unknown;
  canonicalFrequencyId?: ContributionFrequencyId;
  fixedFrequency?: boolean;
  annualSavingGoalUsd?: number;
  contributionsPerYear?: number;
  exactAverageContributionAmountUsd?: number;
  approximateDisplayContributionAmountUsd?: number;
  baseContributionAmountUsd?: number;
  basePlusOneCentContributionAmountUsd?: number;
  contributionsAtBaseAmount?: number;
  contributionsAtBasePlusOneCent?: number;
  blockers: string[];
  warnings: string[];
  contributionDatesCalculated: false;
  targetSelected: false;
  contributionPlanGenerated: false;
  suggestionGenerated: false;
}

export function getContributionFrequencyNormalizationDiagnostics(result: ContributionFrequencyNormalizationResult): ContributionFrequencyDiagnostics {
  const d = result.centDecomposition;
  return {
    status: result.status,
    sourceMonthlySavingGoalUsd: result.sourceMonthlySavingGoalUsd,
    sourceContributionFrequency: result.sourceContributionFrequency,
    ...(result.canonicalFrequencyId ? { canonicalFrequencyId: result.canonicalFrequencyId } : {}),
    ...(result.fixedFrequency != null ? { fixedFrequency: result.fixedFrequency } : {}),
    ...(result.annualSavingGoalUsd != null ? { annualSavingGoalUsd: result.annualSavingGoalUsd } : {}),
    ...(result.contributionsPerYear != null ? { contributionsPerYear: result.contributionsPerYear } : {}),
    ...(result.exactAverageContributionAmountUsd != null ? { exactAverageContributionAmountUsd: result.exactAverageContributionAmountUsd } : {}),
    ...(result.approximateDisplayContributionAmountUsd != null ? { approximateDisplayContributionAmountUsd: result.approximateDisplayContributionAmountUsd } : {}),
    ...(d ? { baseContributionAmountUsd: d.baseContributionAmountUsd, basePlusOneCentContributionAmountUsd: d.basePlusOneCentContributionAmountUsd, contributionsAtBaseAmount: d.contributionsAtBaseAmount, contributionsAtBasePlusOneCent: d.contributionsAtBasePlusOneCent } : {}),
    blockers: result.blockers,
    warnings: result.warnings,
    contributionDatesCalculated: false,
    targetSelected: false,
    contributionPlanGenerated: false,
    suggestionGenerated: false,
  };
}

/** Deterministic internal diagnostic text (no product UI, no advice, no target, no execution). */
export function explainContributionFrequencyNormalization(result: ContributionFrequencyNormalizationResult): string {
  if (result.status === "normalized_fixed" && result.centDecomposition && result.annualSavingGoalUsd != null && result.contributionsPerYear != null) {
    const d = result.centDecomposition;
    const monthly = (result.monthlySavingGoalUsd ?? 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    const annual = result.annualSavingGoalUsd.toLocaleString("en-US");
    const avg = (result.approximateDisplayContributionAmountUsd ?? 0).toFixed(2);
    if (d.remainderCents > 0) {
      return `$${monthly} per month equals $${annual} per year. With ${result.contributionsPerYear} ${result.frequencyDisplayLabel?.toLowerCase()} contributions per year, the average contribution is approximately $${avg}. To preserve the exact annual total in whole cents, ${d.contributionsAtBasePlusOneCent} contributions would be $${d.basePlusOneCentContributionAmountUsd.toFixed(2)} and ${d.contributionsAtBaseAmount} would be $${d.baseContributionAmountUsd.toFixed(2)}.`;
    }
    return `$${monthly} per month equals $${annual} per year. With ${result.contributionsPerYear} ${result.frequencyDisplayLabel?.toLowerCase()} contributions per year, each contribution is exactly $${avg}.`;
  }
  if (result.status === "normalized_occasional" && result.annualSavingGoalUsd != null) {
    const monthly = (result.monthlySavingGoalUsd ?? 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    return `$${monthly} per month equals an intended $${result.annualSavingGoalUsd.toLocaleString("en-US")} annual saving budget. Because the selected contribution frequency is Occasional, no fixed number or amount of contributions is assumed.`;
  }
  return `Contribution frequency could not be normalized (status: ${result.status}).`;
}
