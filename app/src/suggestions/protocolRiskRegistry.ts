/**
 * protocolRiskRegistry — CURATED, STATIC risk metadata for candidate protocols.
 * Not live data. Not a score. Not a selection.
 *
 * Step 12D provides only a skeleton: `auditStatus` defaults to "unknown",
 * `withdrawalClass` to "unknown", `riskScore` is ABSENT, and
 * `safetyBufferEligible` is ABSENT (buffer eligibility is a per-position property
 * today, not a protocol flag). Real risk scoring is deferred to a separate 12E
 * methodology — no number is invented here.
 */
import type { ProtocolRiskData } from "./protocolMarketData";
import type { ProtocolDataRequirement } from "./protocolRegistry";

interface RiskRegistryEntry {
  auditStatus: "audited" | "partially_audited" | "unknown";
  withdrawalClass: "instant" | "same_day" | "delayed" | "unknown";
  notes: string[];
  sources: string[];
}

/** Curated static notes only — no riskScore, no invented audit/withdrawal facts. */
const RISK_ENTRIES: Record<string, RiskRegistryEntry> = {
  jupiter: { auditStatus: "unknown", withdrawalClass: "unknown", notes: ["SOL liquid staking (JupSOL)."], sources: [] },
  marinade: { auditStatus: "unknown", withdrawalClass: "unknown", notes: ["SOL liquid staking (mSOL)."], sources: [] },
  jito: { auditStatus: "unknown", withdrawalClass: "unknown", notes: ["SOL liquid staking (JitoSOL)."], sources: [] },
  blazestake: { auditStatus: "unknown", withdrawalClass: "unknown", notes: ["SOL liquid staking (bSOL)."], sources: [] },
  sanctum: { auditStatus: "unknown", withdrawalClass: "unknown", notes: ["Multi-LST ecosystem."], sources: [] },
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
    // riskScore intentionally ABSENT (see 12E). safetyBufferEligible ABSENT.
    auditStatus: e.auditStatus,
    withdrawalClass: e.withdrawalClass,
    notes: e.notes,
    sources: e.sources,
    confidence: "partial",
    missingFields: [...RISK_MISSING],
  };
}
