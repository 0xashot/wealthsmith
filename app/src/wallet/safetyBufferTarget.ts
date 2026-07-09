/**
 * safetyBufferTarget — APPROVED risk-based Safety Buffer target
 * (rules/financial-logic-boundaries.md — Safety Buffer target). Deterministic
 * product logic, not AI, not UI-invented.
 *
 * Lower-risk users hold a LARGER stablecoin safety buffer; medium risk uses the
 * standard 3-month buffer; higher-risk users may use a smaller minimum buffer.
 *
 * A missing or unknown risk level returns null — never a silent 3-month
 * default — and the Safety Buffer shows its unavailable state instead.
 * Consumers: the Dashboard Safety Buffer card, and (read-only) the Suggestion
 * Engine input adapter, which consumes the derived target and never defines it.
 */

/** Approved MVP mapping: saved risk tolerance → target months of expenses. */
export const RISK_BUFFER_TARGET_MONTHS: Record<string, number> = {
  very_low: 6,
  low: 6,
  medium: 3,
  high: 1,
  very_high: 1,
};

/**
 * Target buffer months for a saved risk level, or null when the risk level is
 * missing/unknown (callers must show the unavailable state, not assume 3).
 */
export function getSafetyBufferTargetMonths(
  riskTolerance: string | null | undefined
): number | null {
  if (!riskTolerance) return null;
  return RISK_BUFFER_TARGET_MONTHS[riskTolerance] ?? null;
}
