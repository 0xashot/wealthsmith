/**
 * yieldStrategyRegistryDiagnostics — Step 16B. Deterministic, read-only COUNTS of the Yield Strategy
 * Registry (per protocol / asset / strategy type / lane / lifecycle). It is inventory only — no
 * comparison, scoring, ranking, APY/TVL, or recommendation.
 */
import { listYieldStrategies } from "./yieldStrategyRegistry";
import type { YieldStrategyLifecycle, YieldStrategyRegistryEntry } from "./yieldStrategyRegistryTypes";

export interface YieldStrategyRegistryDiagnostics {
  registeredProducts: number;

  byLifecycle: Record<YieldStrategyLifecycle, number>;

  byProtocol: Record<string, number>;
  byAsset: Record<string, number>;
  byStrategyType: Record<string, number>;
  byLane: Record<string, number>;

  approvedProductIds: string[];
  documentationRequiredProductIds: string[];

  comparisonEvaluated: false;
  marketDataEvaluated: false;
  suggestionGenerated: false;
}

function tally(entries: YieldStrategyRegistryEntry[], key: (e: YieldStrategyRegistryEntry) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of entries) out[key(e)] = (out[key(e)] ?? 0) + 1;
  return out;
}

/** Deterministic inventory counts of the registry. No comparison, no recommendation. */
export function getYieldStrategyRegistryDiagnostics(): YieldStrategyRegistryDiagnostics {
  const entries = listYieldStrategies();
  const byLifecycle: Record<YieldStrategyLifecycle, number> = { approved: 0, review: 0, identity_verified: 0, documentation_required: 0, unsupported_for_mvp: 0, archived: 0, deprecated: 0, disabled: 0, future: 0 };
  for (const e of entries) byLifecycle[e.lifecycle] += 1;
  return {
    registeredProducts: entries.length,
    byLifecycle,
    byProtocol: tally(entries, (e) => e.protocolId),
    byAsset: tally(entries, (e) => e.principalAsset),
    byStrategyType: tally(entries, (e) => e.strategyType),
    byLane: tally(entries, (e) => e.supportedLane),
    approvedProductIds: entries.filter((e) => e.lifecycle === "approved").map((e) => e.strategyId),
    documentationRequiredProductIds: entries.filter((e) => e.lifecycle === "documentation_required").map((e) => e.strategyId),
    comparisonEvaluated: false,
    marketDataEvaluated: false,
    suggestionGenerated: false,
  };
}
