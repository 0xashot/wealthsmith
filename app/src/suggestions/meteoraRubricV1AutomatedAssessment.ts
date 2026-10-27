/**
 * meteoraRubricV1AutomatedAssessment — the rubric-v1 (12-dimension) automated assessment for
 * Meteora liquidity pools (DLMM + Dynamic AMM) — the first assessment of a protocol the
 * registry held as candidate-only with no prior evidence.
 *
 * RESULT: weighted aggregate 5.83 against a floor of 7 — `meetsMinimum` is FALSE, decisively.
 * Two independent forces drive it. STRUCTURAL: liquidity-pool positions carry impermanent
 * loss by design (asset exposure 5), the product family is the most complex surface assessed
 * (ten separately-audited programs; bin-based DLMM + dynamic fees + a vault layer that lends
 * idle liquidity to EXTERNAL lending protocols), and no program has a verified build.
 * OPERATOR-INTEGRITY: Meteora is a named defendant in an SDNY class action alleging the
 * platform served as infrastructure for coordinated liquidity traps (the LIBRA / MELANIA
 * events of Feb 2025); its CEO resigned amid insider allegations; the promised independent
 * investigation report was never published; and a confirmed compromise of its comms account
 * is on record. No smart-contract exploit was found — the audit program itself is genuinely
 * strong (Zenith, Offside Labs, OtterSec, Sherlock, Sec3, versioned per release + bug bounty).
 *
 * SEPARATION OF DUTIES (risk_separation_of_duties_v2): authored under the
 * ws_automated_risk_assessor identity — scores and aggregates only; NO approval. Numbers
 * reach users ONLY via the Vetting-page Security-score exception.
 *
 * EVERY fact carries its source, collected 2026-08-11 (Claude, evidence preparer,
 * founder-authorized fetch): live mainnet reads via solana-rpc.publicnode.com, Meteora docs
 * (docs.meteora.ag audits index), DefiLlama, the OtterSec verified-build registry, and public
 * reporting on the Feb 2025 events and subsequent litigation.
 */

export const METEORA_RUBRIC_V1_ASSESSMENT_VERSION = "1.0.0" as const;
export const METEORA_RUBRIC_V1_ASSESSMENT_ID = "meteora_rubric_v1_automated_assessment_v1" as const;
export const METEORA_ASSESSMENT_APPROVES_ANYTHING = false;
export const METEORA_ASSESSMENT_ENABLES_TRANSACTIONS = false;

/* ---- Product binding: the LP product family, anchored on the flagship DLMM program. ---- */
export const METEORA_ASSESSMENT_BINDING = {
  protocolId: "meteora",
  product: "Liquidity pools (DLMM + Dynamic AMM)",
  dlmmProgram: "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo",
  dlmmProgramDataAccount: "HZcJwcJ2njPDxZtpPoKnF8v2w9QAx2rS7TdJPSRkbEhu",
  dlmmUpgradeAuthority: "JADaUV8kvDpDbJr55wxXJHVaBS3VCj8thZZHjfeuCVLd", // no governance/multisig documentation found for it
  evidenceCutoffAt: "2026-08-11T00:00:00.000Z",
} as const;

export const METEORA_ONCHAIN_FACTS = {
  dlmmLastDeploySlot: 423_977_638, // ~68 days before the cutoff (~early June 2026)
  dlmmUpgradeable: true,
  verifiedBuild: { registryHasRecord: false, currentlyVerified: false }, // OtterSec registry: no record at all
} as const;

export const METEORA_MARKET_FACTS = {
  tvlUsd: 271_180_387, // DefiLlama api.llama.fi/tvl/meteora at the cutoff
  dlmmTvlUsd: 172_054_197, // separate meteora-dlmm slug
  auditProgram: "Zenith (3 versions), Offside Labs (7 reports incl. v0.13.0), OtterSec, Sherlock, Sec3 — versioned per release, plus an OOO Security bug bounty",
  lineage: "Products live since ~2023 (team lineage to Mercurial Finance, 2021)",
} as const;

export type MeteoraAnchorBand = "unsupported" | "weak" | "partial" | "supported" | "strongly_supported";
export type MeteoraConfidence = "low" | "medium" | "high";

export interface MeteoraDimensionAssessment {
  dimensionId: string;
  weight: number;
  score: number;
  anchorBand: MeteoraAnchorBand;
  confidence: MeteoraConfidence;
  limitingFact: string;
  rationale: string;
}

/**
 * The twelve dimension scores. Anchors (riskGovernance STD_ANCHORS): unsupported 0–2,
 * weak 3–4, partial 5–6, supported 7–8, strongly_supported 9–10. Unknowns never score
 * as favourable.
 */
export const METEORA_DIMENSION_ASSESSMENTS: MeteoraDimensionAssessment[] = [
  {
    dimensionId: "audit_security", weight: 15, score: 6, anchorBand: "partial", confidence: "medium",
    limitingFact: "No Meteora program has a verified build (the OtterSec registry holds no record), so the deployed DLMM binary (~June 2026) cannot be related to a specific audited version.",
    rationale: "The audit program is genuinely strong — five firms across versioned releases (Zenith, Offside Labs through v0.13.0, OtterSec, Sherlock, Sec3) with an active bug bounty — and the release-versioned cadence makes it plausible the deployed version is audited. But plausible is not verified: with no expected hash or verified build, the linkage is inferred. Top of `partial`.",
  },
  {
    dimensionId: "maturity", weight: 8, score: 7, anchorBand: "supported", confidence: "medium",
    limitingFact: "DLMM itself is ~2.5–3 years old; the deployed binary is ~68 days old.",
    rationale: "Team lineage back to Mercurial (2021), the current product family live since ~2023, $271M TVL, and the protocol absorbed some of the highest-volume trading events on Solana (the memecoin waves) without a contract failure. `supported`.",
  },
  {
    dimensionId: "upgrade_admin_authority", weight: 15, score: 5, anchorBand: "partial", confidence: "low",
    limitingFact: "The DLMM upgrade authority has NO documented control model at all — unlike every pool assessed (which at least claimed a specific multisig), Meteora's docs carry no upgrade-authority or governance page.",
    rationale: "The program is upgradeable and was upgraded ~68 days ago; the authority key's custody is entirely unattested. LP user positions are program-controlled and withdrawals permissionless, which bounds the blast radius, but this dimension grades authority control evidence — and there is none. Low `partial`.",
  },
  {
    dimensionId: "manager_discretion", weight: 12, score: 6, anchorBand: "partial", confidence: "medium",
    limitingFact: "Dynamic AMM pools route idle liquidity into Dynamic Vaults that lend to EXTERNAL protocols — protocol-directed rehypothecation of LP capital that a depositor may not realize is happening.",
    rationale: "LP positions themselves are user-owned — no operator can move or seize them, the strongest custody property of an AMM. The discretion lives one layer down: pool/fee parameters are admin-set, and the vault layer redeploys idle capital by design. `partial`.",
  },
  {
    dimensionId: "strategy_complexity", weight: 10, score: 5, anchorBand: "partial", confidence: "medium",
    limitingFact: "Ten separately-audited programs interact in the product family; the flagship DLMM is a bin-based AMM with dynamic fees plus a lending-vault layer — the most complex surface assessed.",
    rationale: "Every audited program is a real attack/failure surface, and LP strategies additionally demand active management (bin ranges) to perform as intended. Complexity is the cost of the product's capital efficiency, and it is priced here. `partial`.",
  },
  {
    dimensionId: "composability_dependency", weight: 8, score: 5, anchorBand: "partial", confidence: "medium",
    limitingFact: "Through Dynamic Vaults, LP principal in Dynamic AMM pools carries exposure to external lending protocols (utilization, incidents) that the LP never chose directly.",
    rationale: "DLMM liquidity stays within the pair program, but the product family's design routes idle capital outward — a real, named external dependency in the principal path for a large share of pools. `partial`.",
  },
  {
    dimensionId: "oracle_risk", weight: 8, score: 7, anchorBand: "supported", confidence: "medium",
    limitingFact: "AMM pricing is manipulable within a block (sandwiching, pool imbalance) — inherent to the model, mitigated by dynamic fees, not by oracles.",
    rationale: "No external price oracle exists in the custody path — pool state IS the price. Nothing to go stale; manipulation risk is a trading-cost phenomenon rather than a custody one. `supported`.",
  },
  {
    dimensionId: "liquidity_withdrawal", weight: 12, score: 7, anchorBand: "supported", confidence: "medium",
    limitingFact: "The vault-lent portion of Dynamic AMM liquidity is subject to external lending-pool utilization at withdrawal time.",
    rationale: "An LP's own position is instantly and permissionlessly withdrawable — there is no NAV queue, no epoch gate, no operator freeze. The named gap is the rehypothecated slice. `supported`.",
  },
  {
    dimensionId: "asset_stablecoin_risk", weight: 5, score: 5, anchorBand: "partial", confidence: "high",
    limitingFact: "Impermanent loss is intrinsic: an LP position's value diverges from simply holding its assets whenever prices move — a structural exposure no other product assessed carries.",
    rationale: "The position holds TWO assets plus a divergence term. Even in a vetted-asset pair (SOL/USDC), the LP can exit with materially less value than a holder — by design, not by failure. This dimension caps at `partial` for any passive-LP product.",
  },
  {
    dimensionId: "withdrawal_fee_transparency", weight: 3, score: 7, anchorBand: "supported", confidence: "medium",
    limitingFact: "Fees are per-pool and dynamic — accurate and on-chain, but there is no single disclosed number a user can hold the protocol to.",
    rationale: "Pool fees are on-chain parameters surfaced in the app and docs; no contradiction between disclosure and deployment was found. `supported` with the per-pool caveat.",
  },
  {
    dimensionId: "operational_dependency_risk", weight: 2, score: 4, anchorBand: "weak", confidence: "medium",
    limitingFact: "The operator's stability is materially in question: CEO resignation amid insider allegations (Feb 2025), a confirmed compromise of the project's communications account, and an ongoing litigation burden.",
    rationale: "The protocol's pools run permissionlessly, which is why this is not lower — but operational trust in the team that holds the upgrade key and steers the vault layer is weakened by the record. `weak`.",
  },
  {
    dimensionId: "incident_history", weight: 2, score: 3, anchorBand: "weak", confidence: "medium",
    limitingFact: "Meteora is a named defendant in an SDNY class action (3,800+ investors) alleging the platform served as infrastructure for coordinated liquidity traps (LIBRA / MELANIA), and the independent investigation report announced in Feb 2025 was never published.",
    rationale: "No smart-contract exploit was found — the code's record is clean. But this dimension grades the verifiable incident record of the PRODUCT AND ITS OPERATOR, and that record contains unresolved fraud allegations in active litigation, leadership fallout, and an abandoned transparency commitment. `weak`.",
  },
];

/* ------------------------------------------------------------------ *
 * Aggregate — same computation semantics as the other v1 assessments.
 * ------------------------------------------------------------------ */
export const METEORA_AGGREGATE_COMPUTATION_VERSION = "riskGovernance.aggregateRiskScore@v1" as const;

export function computeMeteoraAggregate(items: MeteoraDimensionAssessment[] = METEORA_DIMENSION_ASSESSMENTS) {
  const totalWeight = items.reduce((s, d) => s + d.weight, 0);
  const weightedPoints = items.reduce((s, d) => s + d.score * d.weight, 0);
  return { totalWeight, weightedPoints, aggregate: Math.round((weightedPoints / totalWeight) * 100) / 100 };
}

export const METEORA_AGGREGATE_RESULT = computeMeteoraAggregate();

export const METEORA_ASSESSMENT_OUTCOME = {
  computationVersion: METEORA_AGGREGATE_COMPUTATION_VERSION,
  mandatoryBlockerResult: "none_present" as const,
  weightedPoints: 583,
  totalWeight: 100,
  aggregate: 5.83,
  minimumThreshold: 7,
  meetsMinimum: false,
  scoresAdjustedAfterSeeingAggregate: false,
  interpretation:
    "5.83 against a floor of 7 — Meteora's liquidity pools do NOT meet the internal suitability minimum, and " +
    "the shortfall is broad: structural LP risk (impermanent loss 5 × w5, complexity 5 × w10, vault " +
    "rehypothecation 5–6 across two w8–w12 dimensions), an entirely unattested upgrade authority (5 × w15), no " +
    "verified build (audit_security 6 × w15 despite a genuinely strong five-firm audit program), and the " +
    "weakest operator-integrity record assessed (ops 4, incidents 3 — active class action, unpublished " +
    "investigation). This lands between Steakhouse (5.37) and K-Lend (5.93) — a coherent neighborhood: strong " +
    "code pedigree, structurally riskier product, governance under a cloud. A human reviewer may accept, " +
    "reject, or override with a recorded rationale.",
} as const;

/**
 * Sensitivity: no plausible verification path clears the floor. Verified builds + a documented
 * multisig would add ~0.30 (→ ~6.13); the structural LP dimensions (impermanent loss,
 * complexity, rehypothecation) are design properties that re-score only if the product itself
 * changes, and the litigation record resolves on the court's timeline, not ours.
 */
export const METEORA_SENSITIVITY_NOTE = "structural_lp_risk_plus_operator_integrity" as const;

/**
 * HUMAN REVIEW DECISION (recorded, 2026-08-11). The authorized human product owner
 * (ws_product_owner) reviewed the assessment in conversation and ACCEPTED it as-is:
 * Meteora's liquidity pools are recorded as NOT PASSED at 5.83, with zero overrides.
 * Reopens on the triggers below; per the sensitivity note, verification fixes alone
 * cannot clear the floor — the structural LP dimensions are design properties and the
 * litigation record resolves on the court's timeline.
 */
export const METEORA_HUMAN_REVIEW_DECISION = {
  decidedByRole: "ws_product_owner" as const,
  decidedAt: "2026-08-11",
  decision: "accepted_automated_assessment" as const,
  outcome: "not_passed" as const,
  overridesApplied: 0,
  mainReason:
    "Well below the floor (5.83 vs 7): liquidity-pool positions carry impermanent loss by design and idle " +
    "liquidity is re-lent to external protocols, the upgrade authority has no documented control model and no " +
    "program has a verified build, and the operator faces an active class action over the LIBRA/MELANIA " +
    "events with its promised independent investigation never published. No smart-contract exploit was found.",
  reopenOn: [
    "resolution of the SDNY class action or publication of an independent investigation report",
    "published verified builds plus a documented upgrade-authority multisig",
    "a product change to the vault rehypothecation model",
  ],
} as const;

export const METEORA_ASSESSMENT_LIMITATIONS = [
  "The audit-to-deployed-version linkage is inferred from the release-versioned audit cadence, not verified.",
  "No specific pool's fee configuration was decoded; fee transparency was assessed from docs + app behavior.",
  "The litigation is ACTIVE: allegations are unproven in court, and this assessment records their existence and the operator's response — not a legal conclusion.",
  "Dynamic Vault lending exposure was assessed from documentation, not per-vault on-chain reads.",
] as const;

export const METEORA_ASSESSMENT_INVALIDATION_TRIGGERS = [
  "DLMM (or family) program upgrade",
  "published verified builds or a documented upgrade-authority multisig",
  "resolution of the SDNY class action or publication of an independent investigation report",
  "a product change to the vault rehypothecation model",
  "a material incident, exploit, or loss event",
] as const;
