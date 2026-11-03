/**
 * projectedGrowth — DETERMINISTIC (non-AI) Projected Growth for the real connected
 * wallet, using the APPROVED MVP modeled annual return assumptions
 * (rules/financial-logic-boundaries.md — "Projected Growth (real connected wallet)").
 *
 * These are MODELED ANNUAL RETURN ASSUMPTIONS — never "expected returns",
 * predictions, guarantees, or advice. The result is an ESTIMATE. Smith AI may
 * explain it but must never generate or alter it. Nothing here is inferred from
 * income − expenses, and no fixture/demo value is used.
 *
 * Inputs are all sourced: starting value = sum of PRICED live positions only
 * (tokenPrices.ts); contribution = saved monthly_saving_goal only; horizon + risk =
 * saved Goal Settings. Missing/unavailable inputs return a typed "unavailable"
 * status so the card can show the right message.
 */

/** Approved modeled annual return by risk level (fraction, not %). */
export const RISK_ANNUAL_RETURN: Record<string, number> = {
  very_low: 0.02,
  low: 0.04,
  medium: 0.06,
  high: 0.08,
  very_high: 0.1,
};

/** Approved time-horizon → months. `not_sure_yet` (and unknown) → no projection. */
export const HORIZON_MONTHS: Record<string, number | null> = {
  "6_months": 6,
  "1_year": 12,
  "2_years": 24,
  "5_years": 60,
  "10_plus_years": 120,
  not_sure_yet: null,
};

/** Chart milestone months per horizon (for the Projected Growth line, like Demo). */
const HORIZON_MILESTONES: Record<number, number[]> = {
  6: [0, 3, 6],
  12: [0, 6, 12],
  24: [0, 12, 24],
  60: [0, 12, 36, 60],
  120: [0, 24, 60, 120],
};

/** Deterministic future value after `m` months (monthly compounding). */
function futureValueAt(
  startingValueUsd: number,
  monthlyContribution: number,
  monthlyRate: number,
  m: number
): number {
  if (m <= 0) return startingValueUsd;
  if (monthlyRate > 0) {
    const growth = Math.pow(1 + monthlyRate, m);
    return startingValueUsd * growth + monthlyContribution * ((growth - 1) / monthlyRate);
  }
  return startingValueUsd + monthlyContribution * m;
}

/** X-axis label for a milestone month count (matches Demo's "Year N" style). */
function monthsLabel(m: number): string {
  if (m === 0) return "Year 0";
  if (m % 12 === 0) return `Year ${m / 12}`;
  return `${m} mo`;
}

export interface Projection {
  startingValueUsd: number;
  monthlyContribution: number;
  months: number;
  /** Modeled annual return assumption used (fraction). */
  annualReturnRate: number;
  futureValue: number;
  totalContributions: number;
  estimatedGrowth: number;
  /** True when some live positions couldn't be priced (partial coverage). */
  partial: boolean;
  /** Milestone points for the projected-value line chart (deterministic). */
  points: Array<{ months: number; label: string; valueUsd: number }>;
  /** Every month from 0 to `months` (same formula), for drawing the curve's true shape. */
  monthlyPoints: Array<{ months: number; label: string; valueUsd: number }>;
}

export type ProjectionResult =
  | { status: "ok"; projection: Projection }
  | { status: "no_pricing" }
  | { status: "no_contribution" }
  | { status: "no_horizon" }
  | { status: "no_risk" };

export interface ProjectionInputs {
  /** Sum of priced live positions (walletSummary.deriveValueBreakdown.totalUsd). */
  startingValueUsd: number | null;
  /** True when some detected holdings have no sourced price. */
  anyUnpriced: boolean;
  /** Saved Monthly Contribution (USD) — the ONLY contribution source. */
  monthlyContribution: number | null;
  /** Saved Goal Settings timeline id (e.g. "5_years"). */
  timeline: string | undefined;
  /** Saved Goal Settings risk tolerance id (e.g. "medium"). */
  riskTolerance: string | undefined;
}

/**
 * Deterministic monthly-compounding projection. Order of unavailable gates:
 * pricing → contribution → horizon → risk. Returns a typed result; never throws.
 */
export function deriveProjection(inputs: ProjectionInputs): ProjectionResult {
  const { startingValueUsd, anyUnpriced, monthlyContribution, timeline, riskTolerance } = inputs;

  // Starting value must come from priced live positions.
  if (startingValueUsd == null) return { status: "no_pricing" };
  // Contribution = saved Monthly Contribution only (never inferred).
  if (!(typeof monthlyContribution === "number" && monthlyContribution > 0)) {
    return { status: "no_contribution" };
  }
  // Horizon.
  const months = timeline ? HORIZON_MONTHS[timeline] : undefined;
  if (months == null) return { status: "no_horizon" };
  // Modeled annual return for the saved risk level.
  const annualReturnRate = riskTolerance ? RISK_ANNUAL_RETURN[riskTolerance] : undefined;
  if (annualReturnRate == null) return { status: "no_risk" };

  const monthlyRate = annualReturnRate / 12;

  const futureValue = futureValueAt(startingValueUsd, monthlyContribution, monthlyRate, months);
  const totalContributions = monthlyContribution * months;
  const estimatedGrowth = futureValue - startingValueUsd - totalContributions;

  // Deterministic milestone points for the line chart.
  const milestones = HORIZON_MILESTONES[months] ?? [0, months];
  const points = milestones.map((m) => ({
    months: m,
    label: monthsLabel(m),
    valueUsd: Math.round(futureValueAt(startingValueUsd, monthlyContribution, monthlyRate, m)),
  }));

  const monthlyPoints = Array.from({ length: months + 1 }, (_, m) => ({
    months: m,
    label: monthsLabel(m),
    valueUsd: Math.round(futureValueAt(startingValueUsd, monthlyContribution, monthlyRate, m)),
  }));

  return {
    status: "ok",
    projection: {
      startingValueUsd,
      monthlyContribution,
      months,
      annualReturnRate,
      futureValue,
      totalContributions,
      estimatedGrowth,
      partial: anyUnpriced,
      points,
      monthlyPoints,
    },
  };
}
