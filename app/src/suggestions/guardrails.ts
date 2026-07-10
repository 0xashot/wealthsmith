/**
 * guardrails — small, consistent constructors for SuggestionGuardrail objects so
 * every rule produces the same shape, plus `ensureExecutionGuardrails` which
 * guarantees every suggestion carries the market-execution guardrails.
 *
 * HONESTY RULE: cost / liquidity / slippage have no real data source in this
 * prototype (no quote/route infrastructure), so they must stay `not_evaluated`
 * — never `passed` just because the engine can compute an amount. They become
 * `passed`/`failed`/`warning` only once real quote/route data is wired in.
 */
import type { GuardrailCode, SuggestionGuardrail } from "./engineTypes";

export const passedGuardrail = (code: GuardrailCode): SuggestionGuardrail => ({
  code,
  status: "passed",
});

export const failedGuardrail = (
  code: GuardrailCode,
  message?: string
): SuggestionGuardrail => ({ code, status: "failed", ...(message ? { message } : {}) });

export const warningGuardrail = (
  code: GuardrailCode,
  message?: string
): SuggestionGuardrail => ({ code, status: "warning", ...(message ? { message } : {}) });

export const notEvaluatedGuardrail = (code: GuardrailCode): SuggestionGuardrail => ({
  code,
  status: "not_evaluated",
});

export const notApplicableGuardrail = (code: GuardrailCode): SuggestionGuardrail => ({
  code,
  status: "not_applicable",
});

/**
 * Market-execution guardrails that depend on quote/route data the app does not
 * have yet. Every actionable suggestion should carry all three.
 */
export const EXECUTION_GUARDRAIL_CODES: readonly GuardrailCode[] = [
  "cost_available",
  "liquidity_available",
  "slippage_available",
];

/**
 * Return a guardrail list guaranteed to include the execution guardrails: any
 * missing one is appended as `not_evaluated`. Existing entries (including an
 * explicit `not_applicable`, e.g. On Track) are preserved untouched — this
 * never upgrades a status to `passed`.
 */
export function ensureExecutionGuardrails(
  guardrails: SuggestionGuardrail[]
): SuggestionGuardrail[] {
  const present = new Set(guardrails.map((g) => g.code));
  const out = [...guardrails];
  for (const code of EXECUTION_GUARDRAIL_CODES) {
    if (!present.has(code)) out.push(notEvaluatedGuardrail(code));
  }
  return out;
}
