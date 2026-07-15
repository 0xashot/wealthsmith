/**
 * contributionSafetyBufferGate — Step 15E. The canonical Safety Buffer gate: it reads a Safety
 * Buffer snapshot (populated FROM the canonical WealthSmith derivation) and decides whether
 * lower-priority allocation evaluation may proceed. The Safety Buffer is a minimum DOLLAR floor and
 * always overrides stable/growth allocation while it is incomplete.
 *
 * It recomputes NOTHING about the buffer — not income, expenses, months, coverage, or which holdings
 * qualify. It calculates no contribution amount, routes no residual, selects no funding source, and
 * generates no plan/suggestion. Fails closed.
 */
import {
  CONTRIBUTION_PRIORITY_VALUE_TOLERANCE_USD as VAL_TOL,
} from "./contributionPriorityPolicy";
import type {
  ContributionPriorityBlocker,
  ContributionSafetyBufferGateDecision,
  ContributionSafetyBufferSnapshot,
} from "./contributionPriorityTypes";

export const CONTRIBUTION_SAFETY_BUFFER_GATE_EXISTS = true;

/** Identifiers for the canonical WealthSmith Safety Buffer derivation (risk-based months × expenses). */
export const CANONICAL_SAFETY_BUFFER_POLICY_ID = "wealthsmith_safety_buffer";
export const CANONICAL_SAFETY_BUFFER_POLICY_VERSION = "1.0.0";

const finiteNonNeg = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0;

/** The canonical Safety Buffer shape this adapter consumes (a superset is fine). */
export interface CanonicalSafetyBufferResult {
  /** Required buffer USD (canonical `targetUsd`). */
  targetUsd: number;
  /** Current eligible buffer USD (canonical `stableUsd`). */
  stableUsd: number;
  /** Optional explicit shortfall (canonical `shortfallUsd`); else derived as max(0, target − current). */
  shortfallUsd?: number;
  fullyFunded?: boolean;
  targetMonths?: number;
  monthsCovered?: number;
  coveragePct?: number;
}

/**
 * Populate the narrow Step 15E adapter FROM the canonical Safety Buffer result. This is the ONLY
 * supported way to build the snapshot — it preserves the canonical required/current/shortfall and
 * recomputes no buffer inputs. `requiredBufferUsd ← targetUsd`, `currentEligibleBufferUsd ←
 * stableUsd`, `shortfallUsd ← shortfallUsd ?? max(0, target − current)`.
 */
export function buildContributionSafetyBufferSnapshot(
  canonical: CanonicalSafetyBufferResult,
  timing: { calculatedAt: string; checkedAt: string },
): ContributionSafetyBufferSnapshot {
  const requiredBufferUsd = canonical?.targetUsd;
  const currentEligibleBufferUsd = canonical?.stableUsd;
  const shortfallUsd = canonical?.shortfallUsd ?? (finiteNonNeg(requiredBufferUsd) && finiteNonNeg(currentEligibleBufferUsd) ? Math.max(0, requiredBufferUsd - currentEligibleBufferUsd) : NaN);
  const valuesOk = finiteNonNeg(requiredBufferUsd) && finiteNonNeg(currentEligibleBufferUsd) && finiteNonNeg(shortfallUsd);
  const status: ContributionSafetyBufferSnapshot["status"] = !valuesOk ? "invalid" : shortfallUsd > VAL_TOL ? "incomplete" : "complete";
  return {
    sourcePolicyId: CANONICAL_SAFETY_BUFFER_POLICY_ID,
    sourcePolicyVersion: CANONICAL_SAFETY_BUFFER_POLICY_VERSION,
    calculatedAt: timing.calculatedAt,
    checkedAt: timing.checkedAt,
    requiredBufferUsd,
    currentEligibleBufferUsd,
    shortfallUsd,
    ...(canonical?.coveragePct != null ? { coverageRatio: canonical.coveragePct / 100 } : finiteNonNeg(requiredBufferUsd) && requiredBufferUsd > 0 && finiteNonNeg(currentEligibleBufferUsd) ? { coverageRatio: currentEligibleBufferUsd / requiredBufferUsd } : {}),
    ...(canonical?.targetMonths != null ? { monthsRequired: canonical.targetMonths } : {}),
    ...(canonical?.monthsCovered != null ? { monthsCovered: canonical.monthsCovered } : {}),
    status,
    canonicalCalculationUsed: true,
    notes: ["Populated from the canonical WealthSmith Safety Buffer result; no buffer input recomputed."],
  };
}

function gate(status: ContributionSafetyBufferGateDecision["status"], extra: Partial<ContributionSafetyBufferGateDecision> = {}): ContributionSafetyBufferGateDecision {
  const allow = status === "complete";
  return {
    status,
    lowerPriorityEvaluationAllowed: allow,
    stableAllocationAllowed: allow,
    growthAllocationAllowed: allow,
    canonicalCalculationUsed: false,
    blockers: [],
    warnings: [],
    contributionAmountCalculated: false,
    residualAmountCalculated: false,
    fundingSourceSelected: false,
    suggestionGenerated: false,
    transactionsEnabled: false,
    walletSignatureRequired: false,
    ...extra,
  };
}

/**
 * Evaluate the Safety Buffer gate from the (canonically-populated) snapshot. Incomplete → lower
 * priorities suppressed; complete → allowed; invalid → fails closed with everything suppressed.
 */
export function evaluateContributionSafetyBufferGate(snapshot: ContributionSafetyBufferSnapshot | null | undefined): ContributionSafetyBufferGateDecision {
  if (!snapshot || typeof snapshot !== "object") return gate("invalid", { blockers: ["safety_buffer_result_missing"] });

  const blockers: ContributionPriorityBlocker[] = [];
  if (snapshot.canonicalCalculationUsed !== true) blockers.push("safety_buffer_result_invalid");
  if (!snapshot.sourcePolicyId || !snapshot.sourcePolicyVersion) blockers.push("safety_buffer_policy_version_unsupported");
  const req = snapshot.requiredBufferUsd;
  const cur = snapshot.currentEligibleBufferUsd;
  const short = snapshot.shortfallUsd;
  if (!finiteNonNeg(req) || !finiteNonNeg(cur) || !finiteNonNeg(short)) blockers.push("safety_buffer_values_invalid");
  else if (Math.abs(short - Math.max(0, req - cur)) > VAL_TOL) blockers.push("safety_buffer_shortfall_inconsistent");
  if (snapshot.status === "invalid") blockers.push("safety_buffer_result_invalid");

  const common = { requiredBufferUsd: req, currentEligibleBufferUsd: cur, shortfallUsd: short, sourcePolicyId: snapshot.sourcePolicyId, sourcePolicyVersion: snapshot.sourcePolicyVersion, canonicalCalculationUsed: snapshot.canonicalCalculationUsed === true };

  if (blockers.length > 0) return gate("invalid", { ...common, blockers: [...new Set(blockers)] });

  if (short > VAL_TOL) {
    return gate("incomplete", { ...common, warnings: ["Safety Buffer is incomplete; stable- and growth-allocation evaluation is suppressed. This exposes only the canonical shortfall context — no amount or funding source is calculated."] });
  }
  return gate("complete", { ...common });
}

export interface SafetyBufferGateValidationResult {
  valid: boolean;
  errors: string[];
}

/** Validate a gate decision. Fails closed. */
export function validateContributionSafetyBufferGateDecision(decision: unknown): SafetyBufferGateValidationResult {
  const errors: string[] = [];
  if (!decision || typeof decision !== "object") return { valid: false, errors: ["decision_not_an_object"] };
  const d = decision as ContributionSafetyBufferGateDecision;
  const flagsFalse = d.contributionAmountCalculated === false && d.residualAmountCalculated === false && d.fundingSourceSelected === false && d.suggestionGenerated === false && d.transactionsEnabled === false && d.walletSignatureRequired === false;
  if (!flagsFalse) errors.push("capability_flag_enabled");
  if (d.status === "complete") {
    if (!(d.lowerPriorityEvaluationAllowed && d.stableAllocationAllowed && d.growthAllocationAllowed)) errors.push("complete_must_allow_lower_priority");
    if (finiteNonNeg(d.shortfallUsd) && (d.shortfallUsd as number) > VAL_TOL) errors.push("complete_with_material_shortfall");
  } else if (d.status === "incomplete") {
    if (d.lowerPriorityEvaluationAllowed || d.stableAllocationAllowed || d.growthAllocationAllowed) errors.push("incomplete_must_suppress_lower_priority");
    if (!(finiteNonNeg(d.shortfallUsd) && (d.shortfallUsd as number) > VAL_TOL)) errors.push("incomplete_without_positive_shortfall");
  } else {
    if (d.stableAllocationAllowed || d.growthAllocationAllowed || d.lowerPriorityEvaluationAllowed) errors.push("invalid_must_suppress_all");
    if (d.blockers.length === 0) errors.push("invalid_without_blocker");
  }
  return { valid: errors.length === 0, errors };
}
