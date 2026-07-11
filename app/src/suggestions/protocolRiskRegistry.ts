/**
 * protocolRiskRegistry — CURATED, STATIC risk metadata for candidate protocols.
 * Not live data. Not a score. Not a selection.
 *
 * Skeleton only: `auditStatus` defaults to "unknown", `withdrawalClass` to
 * "unknown", `riskScore` is ABSENT, and `safetyBufferEligible` is ABSENT (buffer
 * eligibility is a per-position property today, not a protocol flag). No number
 * is invented here.
 *
 * TODO (see protocolRiskMethodology.md): only populate `riskScore`,
 * `auditStatus`, `withdrawalClass`, `safetyBufferEligible`, `sources`, and
 * `lastReviewedAt` from documented evidence under the approved 12E methodology —
 * never a guess. `riskScore` stays absent until that methodology is approved.
 */
import type { ProtocolRiskData } from "./protocolMarketData";
import type { ProtocolDataRequirement } from "./protocolRegistry";

interface RiskRegistryEntry {
  auditStatus: "audited" | "partially_audited" | "unknown";
  withdrawalClass: "instant" | "same_day" | "delayed" | "unknown";
  /** Absent unless documented under the 12E methodology. */
  safetyBufferEligible?: boolean;
  notes: string[];
  sources: string[];
  /** ISO date the curated entry was last reviewed against evidence. */
  lastReviewedAt?: string;
}

/**
 * Curated static notes only — no riskScore, no invented audit/withdrawal facts.
 * Step 12K began SOL-LST risk sourcing (see protocolSolLiquidStakingRiskSources.md):
 * `lastReviewedAt` records this review; `riskScore`/`auditStatus`/`withdrawalClass`
 * stay absent/unknown pending the approved methodology + direct sources.
 */
const RISK_ENTRIES: Record<string, RiskRegistryEntry> = {
  jupiter: { auditStatus: "unknown", withdrawalClass: "unknown", notes: ["SOL liquid staking (JupSOL). riskScore not assigned; auditStatus/withdrawalClass not yet directly sourced — see protocolSolLiquidStakingSourceChecklist.md (12K–12L)."], sources: [], lastReviewedAt: "2026-07-11" },
  marinade: { auditStatus: "unknown", withdrawalClass: "unknown", notes: ["SOL liquid staking (mSOL). riskScore not assigned; auditStatus/withdrawalClass not yet directly sourced — see protocolSolLiquidStakingSourceChecklist.md (12K–12L)."], sources: [], lastReviewedAt: "2026-07-11" },
  jito: { auditStatus: "unknown", withdrawalClass: "unknown", notes: ["SOL liquid staking (JitoSOL). riskScore not assigned; auditStatus/withdrawalClass not yet directly sourced — see protocolSolLiquidStakingSourceChecklist.md (12K–12L)."], sources: [], lastReviewedAt: "2026-07-11" },
  blazestake: { auditStatus: "unknown", withdrawalClass: "unknown", notes: ["SOL liquid staking (bSOL). riskScore not assigned; auditStatus/withdrawalClass not yet directly sourced — see protocolSolLiquidStakingSourceChecklist.md (12K–12L)."], sources: [], lastReviewedAt: "2026-07-11" },
  sanctum: { auditStatus: "unknown", withdrawalClass: "unknown", notes: ["Multi-LST ecosystem (INF). riskScore not assigned; auditStatus/withdrawalClass not yet directly sourced — see protocolSolLiquidStakingSourceChecklist.md (12K–12L)."], sources: [], lastReviewedAt: "2026-07-11" },
  kamino: { auditStatus: "unknown", withdrawalClass: "unknown", notes: ["Stablecoin lending/vaults."], sources: [] },
  orca: { auditStatus: "unknown", withdrawalClass: "unknown", notes: ["DEX / LP — future scope."], sources: [] },
  raydium: { auditStatus: "unknown", withdrawalClass: "unknown", notes: ["DEX / LP — future scope."], sources: [] },
  meteora: { auditStatus: "unknown", withdrawalClass: "unknown", notes: ["DEX / LP — future scope."], sources: [] },
};

const RISK_MISSING: readonly ProtocolDataRequirement[] = [
  "risk_score",
  "audit_status",
  "withdrawal_behavior",
  "eligibility",
];

/**
 * Curated risk metadata for a protocol. Always `confidence: "partial"` at best
 * (static notes only) — never a real `riskScore`. Unknown protocols return a
 * fully-`missing` record rather than invented facts.
 */
export function getProtocolRiskData(protocolId: string): ProtocolRiskData {
  const e = RISK_ENTRIES[protocolId];
  if (!e) {
    return {
      protocolId,
      notes: ["No curated risk metadata for this protocol yet."],
      sources: [],
      confidence: "missing",
      missingFields: [...RISK_MISSING],
    };
  }
  return {
    protocolId,
    // riskScore intentionally ABSENT until the 12E methodology is approved.
    auditStatus: e.auditStatus,
    withdrawalClass: e.withdrawalClass,
    ...(e.safetyBufferEligible != null ? { safetyBufferEligible: e.safetyBufferEligible } : {}),
    notes: e.notes,
    sources: e.sources,
    ...(e.lastReviewedAt ? { lastReviewedAt: e.lastReviewedAt } : {}),
    confidence: "partial",
    missingFields: [...RISK_MISSING],
  };
}
