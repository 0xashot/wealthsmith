/**
 * protocolSolLiquidStakingSourceCandidates — a PROPOSAL registry of potential data
 * sources for the SOL liquid-staking candidates, tracked BEFORE any are approved
 * into production metadata.
 *
 * PROPOSALS ONLY. Nothing here is production data:
 *  - `proposedValue` is free text for review; it is NEVER used as a value,
 *  - a proposed source never makes a candidate eligible,
 *  - a proposed source never assigns `riskScore`, `auditStatus`,
 *    `withdrawalTimeHours`, or fees,
 *  - a proposed TVL source is NEVER auto-added to `DEFILLAMA_POOL_MAPPINGS`,
 *  - `ProtocolMarketData` / `ProtocolRiskData` are unchanged by this module.
 *
 * A candidate advances only by a later, explicit, human-reviewed step:
 * proposed / needs_review → verified → production metadata → dry-run → go/no-go.
 * `PROTOCOL_SELECTION_IMPLEMENTED` stays false. No value is invented here.
 *
 * Step 12T adds reviewer-supplied verification candidates (exact DefiLlama pool
 * IDs + official docs URLs) in `protocolSolLiquidStakingSourceVerification.ts`,
 * classified at the SOURCE level only (verified/needs_review) — still proposals,
 * never production metadata and never a `risk_score` verification.
 */

/** Proposals only — this registry can never change production data on its own. */
export const SOL_LIQUID_STAKING_SOURCE_CANDIDATES_ARE_PROPOSALS_ONLY = true;
export const SOL_LIQUID_STAKING_SOURCE_CANDIDATES_AFFECT_PRODUCTION = false;

export type SolLiquidStakingSourceCandidateStatus = "proposed" | "verified" | "rejected" | "needs_review";

export type SolLiquidStakingSourceCandidateCategory =
  | "tvl"
  | "withdrawal"
  | "fees"
  | "audit"
  | "risk_score"
  | "liquidity"
  | "route";

export interface SolLiquidStakingSourceCandidate {
  protocolId: string;
  lstSymbol: string;
  category: SolLiquidStakingSourceCandidateCategory;
  status: SolLiquidStakingSourceCandidateStatus;
  sourceName: string;
  sourceUrl?: string;
  sourceType: "official_docs" | "public_api" | "codebase" | "manual_review";
  /** Free text for review ONLY — never parsed or used as a production value. */
  proposedValue?: string;
  notes: string[];
  reviewedAt?: string;
}

const REVIEWED = "2026-07-12";

/** Canonical public endpoints already referenced in the codebase (not guessed). */
const DEFILLAMA_YIELDS_URL = "https://yields.llama.fi/pools";

const LST_SYMBOL: Record<string, string> = {
  jupiter: "JupSOL",
  marinade: "mSOL",
  jito: "JitoSOL",
  blazestake: "bSOL",
  sanctum: "INF",
};

/**
 * Evidence requirements a future `riskScore` must be built from (drafted in 12O;
 * no score is assigned). Mirrors protocolRiskMethodology.md.
 */
export const SOL_LIQUID_STAKING_RISK_EVIDENCE_REQUIREMENTS: readonly string[] = [
  "audit/security history and scope (firm, date, findings, remediation)",
  "time in production and TVL/adoption history",
  "withdrawal and fee transparency (documented unstake mechanics + fee schedule)",
  "operational risk: admin-key / upgrade authority, oracle/dependency risk",
  "incident history (exploits, downtime, depeg events) and response",
];

function candidatesFor(protocolId: string): SolLiquidStakingSourceCandidate[] {
  const lstSymbol = LST_SYMBOL[protocolId];
  const isSanctum = protocolId === "sanctum";
  const displayName = protocolId.charAt(0).toUpperCase() + protocolId.slice(1);

  const c = (
    category: SolLiquidStakingSourceCandidateCategory,
    status: SolLiquidStakingSourceCandidateStatus,
    sourceName: string,
    sourceType: SolLiquidStakingSourceCandidate["sourceType"],
    notes: string[],
    extra: Partial<SolLiquidStakingSourceCandidate> = {}
  ): SolLiquidStakingSourceCandidate => ({ protocolId, lstSymbol, category, status, sourceName, sourceType, notes, reviewedAt: REVIEWED, ...extra });

  return [
    // TVL — need an EXACT DefiLlama pool UUID (project + SOL LST symbol match).
    isSanctum
      ? c("tvl", "verified", "DefiLlama pool 3075a746-bdd1-4aac-bcd5-b035abee2622", "codebase", ["Already verified in DEFILLAMA_POOL_MAPPINGS / lstApy.ts. No change needed."], { sourceUrl: DEFILLAMA_YIELDS_URL })
      : c("tvl", "needs_review", `DefiLlama yields API — filter by project + ${lstSymbol}`, "public_api", [
          `Locate the EXACT DefiLlama pool UUID whose project + symbol match ${displayName} / ${lstSymbol}.`,
          "No pool UUID is guessed. Do NOT add to DEFILLAMA_POOL_MAPPINGS until the exact UUID is confirmed by review.",
        ], { sourceUrl: DEFILLAMA_YIELDS_URL }),

    // Withdrawal mechanics — official unstake docs (direct vs delayed vs pool swap).
    c("withdrawal", "proposed", `${displayName} official staking / unstake documentation`, "official_docs", [
      "Confirm from official docs whether direct unstake is epoch-delayed (cooldown) vs instant-via-pool, and the exact time.",
      "Acquiring the LST via a swap route is SEPARATE from protocol withdrawal — do not conflate. No withdrawalTimeHours assigned in 12O.",
    ]),

    // Fee schedule — official fee docs (protocol fee, not swap-route fee).
    c("fees", "proposed", `${displayName} official fee documentation`, "official_docs", [
      "Capture deposit / withdraw-unstake / management / performance / epoch fees if any. Distinguish protocol fee from swap-route fee.",
      "Never assumed zero, never inferred from APY. If dynamic/context-dependent, keep as review text, not numeric metadata.",
    ]),

    // Audit / security — official security page + audit firm report.
    c("audit", "proposed", `${displayName} official security / audit page + audit firm report`, "official_docs", [
      "Requires firm + report link before auditStatus can move off 'unknown'. Not inferred from popularity, TVL, or widespread use.",
    ]),

    // RiskScore — evidence to gather (NO score assigned in 12O).
    c("risk_score", "proposed", `${displayName} aggregated risk evidence (see risk methodology)`, "manual_review", [
      "Draft only: gather the evidence in SOL_LIQUID_STAKING_RISK_EVIDENCE_REQUIREMENTS. riskScore stays absent until the rubric is approved (12P).",
      ...SOL_LIQUID_STAKING_RISK_EVIDENCE_REQUIREMENTS.map((r) => `evidence: ${r}`),
    ]),
  ];
}

/** All source-candidate proposals for the five SOL liquid-staking candidates. */
export const SOL_LIQUID_STAKING_SOURCE_CANDIDATES: readonly SolLiquidStakingSourceCandidate[] = [
  "jupiter",
  "marinade",
  "jito",
  "blazestake",
  "sanctum",
].flatMap(candidatesFor);

export function getSolLiquidStakingSourceCandidates(protocolId?: string): SolLiquidStakingSourceCandidate[] {
  return protocolId == null
    ? [...SOL_LIQUID_STAKING_SOURCE_CANDIDATES]
    : SOL_LIQUID_STAKING_SOURCE_CANDIDATES.filter((s) => s.protocolId === protocolId);
}

export function getSolLiquidStakingSourceCandidatesByCategory(
  category: SolLiquidStakingSourceCandidateCategory
): SolLiquidStakingSourceCandidate[] {
  return SOL_LIQUID_STAKING_SOURCE_CANDIDATES.filter((s) => s.category === category);
}

export function getSolLiquidStakingSourceCandidatesByStatus(
  status: SolLiquidStakingSourceCandidateStatus
): SolLiquidStakingSourceCandidate[] {
  return SOL_LIQUID_STAKING_SOURCE_CANDIDATES.filter((s) => s.status === status);
}

/** Proposed (unverified) TVL pool sources — kept out of production mappings. */
export function getProposedTvlPoolCandidates(): SolLiquidStakingSourceCandidate[] {
  return SOL_LIQUID_STAKING_SOURCE_CANDIDATES.filter((s) => s.category === "tvl" && s.status !== "verified");
}
