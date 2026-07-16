/**
 * yieldStrategyCapitalPolicy — Step 16F. The versioned risk-based Safety-Buffer allocation policy
 * (vault vs direct-wallet split) + the canonical excess-yield minimum. The vault/wallet split is
 * DOCUMENTED (very_low/low 100/0, medium 70/30, high/very_high 50/50) but had no executable policy, so
 * it is encoded here as the `yield_strategy_capital_v1` source of truth. The excess minimum REUSES the
 * canonical `DCA_EXCESS_USDC_TRIGGER_USD` ($250). No Safety-Buffer-Yield minimum is documented, so none
 * is invented. An unknown risk profile fails closed — never defaulted to Medium.
 */
import {
  YIELD_STRATEGY_CAPITAL_POLICY_ID,
  YIELD_STRATEGY_CAPITAL_POLICY_VERSION,
  YIELD_STRATEGY_CAPITAL_SCHEMA_VERSION,
} from "./yieldStrategyPositionTypes";
import { RECOGNIZED_PROFILE_RISK_IDS } from "./contributionTargetSuitability";
import { DCA_EXCESS_USDC_TRIGGER_USD } from "./dcaMinimumPolicy";

export const YIELD_STRATEGY_CAPITAL_POLICY_EXISTS = true;

/** The canonical $250 excess-USDC trigger, reused (not re-declared). */
export const YIELD_STRATEGY_EXCESS_YIELD_MINIMUM_USD = DCA_EXCESS_USDC_TRIGGER_USD;

/** No documented Safety-Buffer-Yield minimum exists → not invented. */
export const YIELD_STRATEGY_BUFFER_YIELD_MINIMUM_POLICY_AVAILABLE = false;

export interface YieldStrategyBufferAllocation { vaultAllocationPct: number; walletAllocationPct: number; }

/**
 * Documented risk→buffer allocation (vault share of the REQUIRED buffer that may earn yield; the rest
 * stays as a direct-wallet floor). Fractions in [0,1]; each row sums to 1.
 */
const BUFFER_ALLOCATION: Record<string, YieldStrategyBufferAllocation> = {
  very_low: { vaultAllocationPct: 1.0, walletAllocationPct: 0.0 },
  low: { vaultAllocationPct: 1.0, walletAllocationPct: 0.0 },
  medium: { vaultAllocationPct: 0.7, walletAllocationPct: 0.3 },
  high: { vaultAllocationPct: 0.5, walletAllocationPct: 0.5 },
  very_high: { vaultAllocationPct: 0.5, walletAllocationPct: 0.5 },
};

/** The vault/wallet split for a risk id, or `undefined` for an unknown id (fail closed — no default). */
export function getYieldStrategyBufferAllocation(userRiskProfileId: string | undefined): YieldStrategyBufferAllocation | undefined {
  if (!userRiskProfileId || !RECOGNIZED_PROFILE_RISK_IDS.includes(userRiskProfileId)) return undefined;
  const a = BUFFER_ALLOCATION[userRiskProfileId];
  return a ? { ...a } : undefined;
}

export interface YieldStrategyCapitalPolicy {
  schemaVersion: "1.0.0";
  policyId: string;
  policyVersion: "1.0.0";
  excessYieldMinimumUsd: number;
  bufferYieldMinimumPolicyAvailable: boolean;
  allocationByRiskId: Record<string, YieldStrategyBufferAllocation>;
  recognizedRiskIds: string[];
  notes: string[];
}

export function getYieldStrategyCapitalPolicy(): YieldStrategyCapitalPolicy {
  return {
    schemaVersion: YIELD_STRATEGY_CAPITAL_SCHEMA_VERSION,
    policyId: YIELD_STRATEGY_CAPITAL_POLICY_ID,
    policyVersion: YIELD_STRATEGY_CAPITAL_POLICY_VERSION,
    excessYieldMinimumUsd: YIELD_STRATEGY_EXCESS_YIELD_MINIMUM_USD,
    bufferYieldMinimumPolicyAvailable: YIELD_STRATEGY_BUFFER_YIELD_MINIMUM_POLICY_AVAILABLE,
    allocationByRiskId: Object.fromEntries(Object.entries(BUFFER_ALLOCATION).map(([k, v]) => [k, { ...v }])),
    recognizedRiskIds: [...RECOGNIZED_PROFILE_RISK_IDS],
    notes: [
      "Vault/wallet split is the documented mapping encoded as v1 (no prior executable policy). Unknown risk id fails closed.",
      "Excess minimum reuses DCA_EXCESS_USDC_TRIGGER_USD ($250). No Safety-Buffer-Yield minimum is documented.",
    ],
  };
}

export interface YieldStrategyCapitalPolicyValidation { valid: boolean; errors: string[]; }

/** Validate the capital policy: every recognized risk id maps, each split sums to 1, excess min is $250. */
export function validateYieldStrategyCapitalPolicy(policy: YieldStrategyCapitalPolicy = getYieldStrategyCapitalPolicy()): YieldStrategyCapitalPolicyValidation {
  const errors: string[] = [];
  if (policy.policyId !== YIELD_STRATEGY_CAPITAL_POLICY_ID) errors.push("wrong_policy_id");
  if (policy.excessYieldMinimumUsd !== DCA_EXCESS_USDC_TRIGGER_USD) errors.push("excess_minimum_not_canonical");
  for (const id of RECOGNIZED_PROFILE_RISK_IDS) {
    const a = policy.allocationByRiskId[id];
    if (!a) { errors.push(`missing_allocation_${id}`); continue; }
    if (!(a.vaultAllocationPct >= 0 && a.walletAllocationPct >= 0)) errors.push(`negative_allocation_${id}`);
    if (Math.round((a.vaultAllocationPct + a.walletAllocationPct) * 1e6) / 1e6 !== 1) errors.push(`allocation_not_100_${id}`);
  }
  return { valid: errors.length === 0, errors };
}
