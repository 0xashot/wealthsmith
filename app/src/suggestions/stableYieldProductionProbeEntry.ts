/**
 * stableYieldProductionProbeEntry — Step 16H-G. The bundle entry the developer-only probe imports so it
 * runs the REAL adapters/manifests instead of reimplementing them.
 *
 * Deterministic and offline: it reads the registry + evidence manifests and reports readiness. It
 * performs no retrieval (the probe script owns stage A), approves nothing, and plans nothing.
 */
import { listYieldStrategies } from "./yieldStrategyRegistry";
import { buildStableYieldReadinessMatrix, listStableYieldEvidenceManifests, type StableYieldCandidateEvidence, type StableYieldReadinessRow } from "./stableYieldProductionEvidence";
import { deriveStableYieldPlanSuggestion } from "./stableYieldProductInput";

export interface StableYieldProbeReport {
  checkedAt: string;
  rows: StableYieldReadinessRow[];
  manifests: StableYieldCandidateEvidence[];
  readyForReviewCount: number;
  approvedCount: 0;
  /** Candidates whose exact address IS documented — i.e. the only ones a source query could target. */
  queryableCandidates: Array<{ strategyId: string; productAddress: string }>;
  /** Proof the production surface still emits nothing. Must stay false until Step 16H-H. */
  productionRendersCard: boolean;
}

export function buildStableYieldProbeReport(args: { checkedAt: string }): StableYieldProbeReport {
  const { checkedAt } = args;
  const rows = buildStableYieldReadinessMatrix();
  const manifests = listStableYieldEvidenceManifests();

  const queryableCandidates = listYieldStrategies()
    .filter((e): e is typeof e & { address: string } => typeof e.address === "string" && e.address.trim() !== "")
    .map((e) => ({ strategyId: e.strategyId, productAddress: e.address }));

  // Re-derive the real production decision to prove the surface still emits no suggestion.
  const prod = deriveStableYieldPlanSuggestion({ dataMode: "real_wallet", positions: [], checkedAt });

  return {
    checkedAt,
    rows,
    manifests,
    readyForReviewCount: rows.filter((r) => r.readyForExplicitReview).length,
    approvedCount: 0,
    queryableCandidates,
    productionRendersCard: prod.suggestion !== null,
  };
}
