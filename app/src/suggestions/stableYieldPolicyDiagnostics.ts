/**
 * stableYieldPolicyDiagnostics — Step 16A. Deterministic, read-only diagnostics for the Stable Yield
 * POLICY. It describes why Stable Yield is allowed or suppressed and which lane applies, given
 * policy-level inputs. It detects nothing, calculates no APY/eligibility, and recommends nothing —
 * it only structures the policy. No user-facing copy; no execution.
 */
import {
  STABLE_YIELD_POLICY_ID,
  STABLE_YIELD_POLICY_VERSION,
  type StableYieldAllowanceResult,
  type StableYieldLane,
  type StableYieldSuppressionReason,
} from "./stableYieldPolicyTypes";
import { getStableYieldPolicy, getStableYieldLanePolicy, STABLE_YIELD_SUPPRESSION_REASONS } from "./stableYieldPolicy";

export interface StableYieldPolicyDiagnostics {
  policyId: string;
  policyVersion: string;
  suggestionFamily: string;
  lanes: string[];
  strategyTypes: string[];
  supportedProtocolScope: string[];
  forbiddenProtocols: string[];
  intendedPriorityOrder: string[];
  suppressionReasons: string[];
  registryExists: false;
  suggestionsExist: false;
  uiExists: false;
  executionEnabled: false;
}

/** Structured, deterministic view of the Stable Yield policy (no recommendation). */
export function getStableYieldPolicyDiagnostics(): StableYieldPolicyDiagnostics {
  const p = getStableYieldPolicy();
  return {
    policyId: p.policyId,
    policyVersion: p.policyVersion,
    suggestionFamily: p.suggestionFamily,
    lanes: p.lanes.map((l) => l.lane),
    strategyTypes: p.strategyTypes.map((s) => s.strategyType),
    supportedProtocolScope: p.supportedProtocolScope,
    forbiddenProtocols: p.forbiddenProtocols,
    intendedPriorityOrder: p.intendedPriorityOrder,
    suppressionReasons: [...STABLE_YIELD_SUPPRESSION_REASONS],
    registryExists: false,
    suggestionsExist: false,
    uiExists: false,
    executionEnabled: false,
  };
}

export interface StableYieldAllowanceInput {
  /** Whether the canonical Safety Buffer is complete (a policy input — 16A does not detect it). */
  safetyBufferComplete: boolean;
  /** Suppression reasons already determined upstream (16A implements no checks). */
  suppressionReasons?: StableYieldSuppressionReason[];
  /** Which lane is being described (defaults to describing both). */
  lane?: StableYieldLane;
}

/**
 * Map policy-level inputs to the deterministic allowance descriptor. Neither lane may activate unless
 * the Safety Buffer is complete; any supplied suppression reason keeps the result `suppressed`. This
 * DESCRIBES the policy — it neither detects capital nor generates a recommendation.
 */
export function buildStableYieldAllowanceResult(input: StableYieldAllowanceInput): StableYieldAllowanceResult {
  const reasons = [...(input.suppressionReasons ?? [])];
  if (!input.safetyBufferComplete && !reasons.includes("safety_buffer_incomplete")) reasons.push("safety_buffer_incomplete");

  // Both lanes require a complete Safety Buffer; the buffer lane additionally never activates while
  // the buffer is incomplete (it operates on completed buffer capital).
  const bufferLaneApplicable = input.safetyBufferComplete && reasons.length === 0 && getStableYieldLanePolicy("safety_buffer_yield").requiresCompleteSafetyBuffer === true;
  const excessLaneApplicable = input.safetyBufferComplete && reasons.length === 0;

  const suppressed = reasons.length > 0;
  const laneApplicable = input.lane === "safety_buffer_yield" ? bufferLaneApplicable : input.lane === "excess_usdc_yield" ? excessLaneApplicable : bufferLaneApplicable || excessLaneApplicable;

  return {
    policyId: STABLE_YIELD_POLICY_ID,
    policyVersion: STABLE_YIELD_POLICY_VERSION,
    status: suppressed ? "suppressed" : laneApplicable ? "allowed" : "not_applicable",
    ...(input.lane && !suppressed && laneApplicable ? { lane: input.lane } : {}),
    suppressionReasons: reasons,
    bufferLaneApplicable,
    excessLaneApplicable,
    recommendationGenerated: false,
    suggestionGenerated: false,
    transactionsEnabled: false,
    walletSignatureRequired: false,
    notes: ["Policy-level allowance description only. No capital, APY, product, or eligibility is evaluated in Step 16A; no recommendation is produced."],
  };
}

/** Neutral, non-advisory diagnostic sentence for an allowance result. */
export function explainStableYieldAllowance(result: StableYieldAllowanceResult): string {
  if (result.status === "suppressed") {
    return `Stable Yield is suppressed by policy (${result.suppressionReasons.join(", ")}). No lane is active and no recommendation is produced.`;
  }
  if (result.status === "not_applicable") {
    return "Stable Yield is not applicable under the current policy inputs. No recommendation is produced.";
  }
  const lanes = [result.bufferLaneApplicable ? "Safety Buffer yield" : null, result.excessLaneApplicable ? "Excess USDC yield" : null].filter(Boolean).join(" and ");
  return `Stable Yield is allowed by policy once the Safety Buffer is complete (${lanes} lane${result.bufferLaneApplicable && result.excessLaneApplicable ? "s" : ""}). This is a policy statement only — no product, amount, or recommendation is generated.`;
}
