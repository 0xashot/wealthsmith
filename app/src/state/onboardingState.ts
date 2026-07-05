/**
 * Onboarding state model (prototype, local-only).
 *
 * Source of truth: patterns/onboarding-with-smith-ai.md (Onboarding Visibility
 * Rule) and patterns/dashboard-layout.md (Global Nav Variants). Onboarding is
 * not optional: it is always visible while disconnected, and remains visible
 * after wallet connection until the required Goal fields are saved. Demo Mode
 * overrides onboarding while active.
 *
 * Goal field IDs/options are canonical from Goal Settings (state/goalState.ts +
 * patterns/goal-settings.md, Decision A). Step titles/helpers/companion/
 * validation copy are verbatim from content/onboarding-copy.md (approvedCopy).
 * Nothing here computes or invents financial values, suggestions, Top Pick, or
 * protocol decisions.
 */
import type { GoalOption, SavedGoal } from "../types/goal";
import {
  FINANCIAL_GOAL_OPTIONS,
  RISK_OPTIONS,
  TIMELINE_OPTIONS,
  CONTRIBUTION_OPTIONS,
} from "./goalState";
import {
  ONBOARDING_GOAL_TITLE,
  ONBOARDING_GOAL_DESC,
  ONBOARDING_GOAL_HELPER,
  ONBOARDING_GOAL_COMPANION,
  ONBOARDING_GOAL_LABEL,
  ONBOARDING_HORIZON_TITLE,
  ONBOARDING_HORIZON_DESC,
  ONBOARDING_HORIZON_HELPER,
  ONBOARDING_HORIZON_COMPANION,
  ONBOARDING_HORIZON_LABEL,
  ONBOARDING_RISK_TITLE,
  ONBOARDING_RISK_DESC,
  ONBOARDING_RISK_HELPER,
  ONBOARDING_RISK_COMPANION,
  ONBOARDING_RISK_LABEL,
  ONBOARDING_INCOME_TITLE,
  ONBOARDING_INCOME_DESC,
  ONBOARDING_INCOME_HELPER,
  ONBOARDING_INCOME_LABEL,
  ONBOARDING_INCOME_PLACEHOLDER,
  ONBOARDING_INCOME_COMPANION,
  ONBOARDING_INCOME_ERR_MISSING,
  ONBOARDING_INCOME_ERR_INVALID,
  ONBOARDING_EXPENSES_TITLE,
  ONBOARDING_EXPENSES_DESC,
  ONBOARDING_EXPENSES_HELPER,
  ONBOARDING_EXPENSES_LABEL,
  ONBOARDING_EXPENSES_PLACEHOLDER,
  ONBOARDING_EXPENSES_COMPANION,
  ONBOARDING_EXPENSES_ERR_MISSING,
  ONBOARDING_EXPENSES_ERR_INVALID,
  ONBOARDING_CONTRIB_TITLE,
  ONBOARDING_CONTRIB_DESC,
  ONBOARDING_CONTRIB_HELPER,
  ONBOARDING_CONTRIB_COMPANION,
  ONBOARDING_CONTRIB_LABEL,
  ONBOARDING_SAVING_TITLE,
  ONBOARDING_SAVING_DESC,
  ONBOARDING_SAVING_HELPER,
  ONBOARDING_SAVING_LABEL,
  ONBOARDING_SAVING_PLACEHOLDER,
  ONBOARDING_SAVING_COMPANION,
  ONBOARDING_SAVING_ERR_INVALID,
  ONBOARDING_ERR_POSITIVE,
} from "./approvedCopy";

/**
 * Required Goal fields that gate completion. Monthly Saving Goal is optional and
 * intentionally excluded. Field IDs match Goal Settings / the connected fixture.
 */
export const REQUIRED_GOAL_FIELDS = [
  "financial_goal",
  "risk_tolerance",
  "timeline",
  "income_monthly",
  "expenses_monthly",
  "contribution_frequency",
] as const;

/**
 * Ordered onboarding steps (used for the progress indicator). Step 1 renders the
 * welcome/entry step; Step 2 renders the goal-setup steps; review is added in a
 * later step of this slice.
 */
export const ONBOARDING_STEPS = [
  "welcome",
  "financial_goal",
  "timeline",
  "risk_tolerance",
  "monthly_income",
  "monthly_expenses",
  "contribution_frequency",
  "monthly_saving_goal",
  "review",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const ONBOARDING_TOTAL_STEPS = ONBOARDING_STEPS.length;

/** Local draft of the onboarding answers (currency fields kept as raw text). */
export interface OnboardingAnswers {
  financial_goal: string;
  risk_tolerance: string;
  timeline: string;
  contribution_frequency: string;
  income: string;
  expenses: string;
  saving: string;
}

/**
 * Choice fields start on their approved MVP default (a valid Goal Settings option
 * id); currency fields start blank so required validation is meaningful. Nothing
 * is committed to saved plan state in Step 2 (completion arrives in a later step).
 */
export const initialOnboardingAnswers: OnboardingAnswers = {
  financial_goal: "build_long_term_wealth",
  risk_tolerance: "medium",
  timeline: "5_years",
  contribution_frequency: "monthly",
  income: "",
  expenses: "",
  saving: "",
};

type FieldType = "select" | "currency";
type DraftKey = keyof OnboardingAnswers;

export interface OnboardingFieldStep {
  /** Matches an id in ONBOARDING_STEPS (drives the progress ordinal). */
  id: OnboardingStep;
  fieldType: FieldType;
  draftKey: DraftKey;
  title: string;
  description: string;
  helper: string;
  companion: string;
  fieldLabel: string;
  /** select only */
  options?: GoalOption[];
  /** currency only */
  placeholder?: string;
  optional?: boolean;
  requiredError?: string;
  invalidError?: string;
  positiveError?: string;
}

/** The goal-setup steps rendered by the connected onboarding panel (Step 2). */
export const GOAL_SETUP_STEPS: OnboardingFieldStep[] = [
  {
    id: "financial_goal",
    fieldType: "select",
    draftKey: "financial_goal",
    title: ONBOARDING_GOAL_TITLE,
    description: ONBOARDING_GOAL_DESC,
    helper: ONBOARDING_GOAL_HELPER,
    companion: ONBOARDING_GOAL_COMPANION,
    fieldLabel: ONBOARDING_GOAL_LABEL,
    options: FINANCIAL_GOAL_OPTIONS,
  },
  {
    id: "timeline",
    fieldType: "select",
    draftKey: "timeline",
    title: ONBOARDING_HORIZON_TITLE,
    description: ONBOARDING_HORIZON_DESC,
    helper: ONBOARDING_HORIZON_HELPER,
    companion: ONBOARDING_HORIZON_COMPANION,
    fieldLabel: ONBOARDING_HORIZON_LABEL,
    options: TIMELINE_OPTIONS,
  },
  {
    id: "risk_tolerance",
    fieldType: "select",
    draftKey: "risk_tolerance",
    title: ONBOARDING_RISK_TITLE,
    description: ONBOARDING_RISK_DESC,
    helper: ONBOARDING_RISK_HELPER,
    companion: ONBOARDING_RISK_COMPANION,
    fieldLabel: ONBOARDING_RISK_LABEL,
    options: RISK_OPTIONS,
  },
  {
    id: "monthly_income",
    fieldType: "currency",
    draftKey: "income",
    title: ONBOARDING_INCOME_TITLE,
    description: ONBOARDING_INCOME_DESC,
    helper: ONBOARDING_INCOME_HELPER,
    companion: ONBOARDING_INCOME_COMPANION,
    fieldLabel: ONBOARDING_INCOME_LABEL,
    placeholder: ONBOARDING_INCOME_PLACEHOLDER,
    requiredError: ONBOARDING_INCOME_ERR_MISSING,
    invalidError: ONBOARDING_INCOME_ERR_INVALID,
    positiveError: ONBOARDING_ERR_POSITIVE,
  },
  {
    id: "monthly_expenses",
    fieldType: "currency",
    draftKey: "expenses",
    title: ONBOARDING_EXPENSES_TITLE,
    description: ONBOARDING_EXPENSES_DESC,
    helper: ONBOARDING_EXPENSES_HELPER,
    companion: ONBOARDING_EXPENSES_COMPANION,
    fieldLabel: ONBOARDING_EXPENSES_LABEL,
    placeholder: ONBOARDING_EXPENSES_PLACEHOLDER,
    requiredError: ONBOARDING_EXPENSES_ERR_MISSING,
    invalidError: ONBOARDING_EXPENSES_ERR_INVALID,
    positiveError: ONBOARDING_ERR_POSITIVE,
  },
  {
    id: "contribution_frequency",
    fieldType: "select",
    draftKey: "contribution_frequency",
    title: ONBOARDING_CONTRIB_TITLE,
    description: ONBOARDING_CONTRIB_DESC,
    helper: ONBOARDING_CONTRIB_HELPER,
    companion: ONBOARDING_CONTRIB_COMPANION,
    fieldLabel: ONBOARDING_CONTRIB_LABEL,
    options: CONTRIBUTION_OPTIONS,
  },
  {
    id: "monthly_saving_goal",
    fieldType: "currency",
    draftKey: "saving",
    title: ONBOARDING_SAVING_TITLE,
    description: ONBOARDING_SAVING_DESC,
    helper: ONBOARDING_SAVING_HELPER,
    companion: ONBOARDING_SAVING_COMPANION,
    fieldLabel: ONBOARDING_SAVING_LABEL,
    placeholder: ONBOARDING_SAVING_PLACEHOLDER,
    optional: true,
    invalidError: ONBOARDING_SAVING_ERR_INVALID,
    positiveError: ONBOARDING_SAVING_ERR_INVALID,
  },
];

/** 1-based progress ordinal for a step id (position within ONBOARDING_STEPS). */
export function stepOrdinal(id: OnboardingStep): number {
  return ONBOARDING_STEPS.indexOf(id) + 1;
}

/** Parse a currency field: input format only, no financial interpretation. */
export function parseOnboardingAmount(raw: string): {
  blank: boolean;
  valid: boolean;
  negative: boolean;
} {
  const t = raw.trim().replace(/[$,\s]/g, "");
  if (t === "") return { blank: true, valid: true, negative: false };
  if (!/^-?\d+(\.\d+)?$/.test(t)) return { blank: false, valid: false, negative: false };
  if (Number(t) < 0) return { blank: false, valid: false, negative: true };
  return { blank: false, valid: true, negative: false };
}

/** Validation error for the current step's value, or undefined when valid. */
export function stepError(step: OnboardingFieldStep, value: string): string | undefined {
  if (step.fieldType === "select") return undefined; // always has a valid default
  const p = parseOnboardingAmount(value);
  if (p.blank) return step.optional ? undefined : step.requiredError;
  if (p.negative) return step.positiveError;
  if (!p.valid) return step.invalidError;
  return undefined;
}

/** Numeric value of a currency field (assumes already validated). */
function amountToNumber(raw: string): number {
  return Number(raw.trim().replace(/[$,\s]/g, ""));
}

/**
 * True when all required fields are valid for completion: income and expenses
 * must be present + valid + non-negative; Monthly Saving Goal is optional (blank
 * OR valid). Choice fields always carry a valid default. (Selects are canonical
 * Goal Settings options; nothing invented.)
 */
export function requiredFieldsValid(a: OnboardingAnswers): boolean {
  const inc = parseOnboardingAmount(a.income);
  const exp = parseOnboardingAmount(a.expenses);
  const sav = parseOnboardingAmount(a.saving);
  const incOk = !inc.blank && inc.valid && !inc.negative;
  const expOk = !exp.blank && exp.valid && !exp.negative;
  const savOk = sav.blank || (sav.valid && !sav.negative);
  return incOk && expOk && savOk;
}

/**
 * Build the local SavedGoal (same shape Goal Settings uses) from onboarding
 * answers. Blank Monthly Saving Goal is saved as null (never coerced to 0). No
 * product logic, no derived values — this only commits the collected inputs.
 */
export function buildSavedGoal(a: OnboardingAnswers): SavedGoal {
  const sav = parseOnboardingAmount(a.saving);
  return {
    financial_goal: a.financial_goal,
    risk_tolerance: a.risk_tolerance,
    timeline: a.timeline,
    contribution_frequency: a.contribution_frequency,
    income_monthly: amountToNumber(a.income),
    expenses_monthly: amountToNumber(a.expenses),
    monthly_saving_goal: sav.blank ? null : amountToNumber(a.saving),
  };
}

/**
 * The single source of the onboarding visibility rule (see the pattern):
 *   onboarding_active = mode !== "demo" && (wallet disconnected || goal not completed)
 * Demo Mode overrides onboarding while active.
 */
export function isOnboardingActive(
  mode: "connected" | "demo" | "disconnected",
  goalCompleted: boolean
): boolean {
  return mode !== "demo" && (mode === "disconnected" || goalCompleted === false);
}
