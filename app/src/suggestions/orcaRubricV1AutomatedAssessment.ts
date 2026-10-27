/**
 * orcaRubricV1AutomatedAssessment — the rubric-v1 (12-dimension) automated assessment for
 * Orca liquidity pools (Whirlpools CLMM) — cold-start vetting, no prior engine evidence.
 *
 * RESULT: weighted aggregate 6.71 against a floor of 7 — `meetsMinimum` is FALSE. Orca is the
 * BEST liquidity-pool result this rubric can plausibly produce today: the ONLY assessed
 * protocol with an ACTIVE verified build (OtterSec registry: orca-so/whirlpools @ e5f089b,
 * on-chain hash == executable hash, verified 2026-02-04 — the deployed binary IS the verified
 * open-source commit), six audits with a recent cadence (Kudelski 2022, Neodyme 2022, OtterSec
 * 2024, Sec3 ×3 through Aug 2025), zero exploits found in 4+ years, no rehypothecation layer,
 * and instantly-withdrawable self-custodied positions. What keeps it under the floor is
 * STRUCTURAL to the product class plus one attestation gap: impermanent loss is intrinsic to
 * LP positions (asset exposure 5), concentrated-liquidity math is complex and demands active
 * management (complexity 6), and the upgrade authority has no documented control model
 * (admin 6 × w15). The floor prices principal-preserving products; a best-in-class AMM still
 * is not one.
 *
 * SEPARATION OF DUTIES (risk_separation_of_duties_v2): authored under the
 * ws_automated_risk_assessor identity — scores and aggregates only; NO approval. Numbers
 * reach users ONLY via the Vetting-page Security-score exception.
 *
 * EVERY fact carries its source, collected 2026-08-11 (Claude, evidence preparer,
 * founder-authorized fetch): live mainnet reads via solana-rpc.publicnode.com, the OtterSec
 * verified-build registry, the published audit record (incl. Neodyme's report), DefiLlama
 * TVL + DEX volume, and public incident searches.
 */

export const ORCA_RUBRIC_V1_ASSESSMENT_VERSION = "1.0.0" as const;
export const ORCA_RUBRIC_V1_ASSESSMENT_ID = "orca_rubric_v1_automated_assessment_v1" as const;
export const ORCA_ASSESSMENT_APPROVES_ANYTHING = false;
export const ORCA_ASSESSMENT_ENABLES_TRANSACTIONS = false;

/* ---- Product binding: the Whirlpools CLMM program. ---- */
export const ORCA_ASSESSMENT_BINDING = {
  protocolId: "orca",
  product: "Liquidity pools (Whirlpools CLMM)",
  whirlpoolsProgram: "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
  whirlpoolsProgramDataAccount: "CtXfPzz36dH5Ws4UYKZvrQ1Xqzn42ecDW6y8NKuiN8nD",
  upgradeAuthority: "GwH3Hiv5mACLX3ufTw1pFsrhSPon5tdw252DBs4Rx4PV", // no documented control model found
  verifiedCommit: "e5f089bc5c49b01f5c8abb43c78457ab6c440568", // orca-so/whirlpools, OtterSec registry
  evidenceCutoffAt: "2026-08-11T00:00:00.000Z",
} as const;

export const ORCA_ONCHAIN_FACTS = {
  lastDeploySlot: 398_059_635, // ~188 days before the cutoff (~2026-02-04)
  upgradeable: true,
  verifiedBuild: {
    registryHasRecord: true,
    currentlyVerified: true, // the ONLY assessed protocol with an active verification
    lastVerifiedAt: "2026-02-04",
    onChainHashEqualsExecutableHash: true,
  },
} as const;

export const ORCA_MARKET_FACTS = {
  tvlUsd: 239_054_119, // DefiLlama api.llama.fi/tvl/orca at the cutoff
  dailyVolumeUsd: 116_517_604, // DefiLlama DEX summary total24h — top-tier venue
  auditProgram: "Kudelski (Jan 2022), Neodyme (May 2022), OtterSec (Aug 2024), Sec3 (Feb + Jun + Aug 2025) — six audits, recent cadence, open-source repo",
  lineage: "Orca live since 2021; Whirlpools CLMM since 2022 (~4.5 years)",
} as const;

export type OrcaAnchorBand = "unsupported" | "weak" | "partial" | "supported" | "strongly_supported";
export type OrcaConfidence = "low" | "medium" | "high";

export interface OrcaDimensionAssessment {
  dimensionId: string;
  weight: number;
  score: number;
  anchorBand: OrcaAnchorBand;
  confidence: OrcaConfidence;
  limitingFact: string;
  rationale: string;
}

/**
 * The twelve dimension scores. Anchors (riskGovernance STD_ANCHORS): unsupported 0–2,
 * weak 3–4, partial 5–6, supported 7–8, strongly_supported 9–10. Unknowns never score
 * as favourable.
 */
export const ORCA_DIMENSION_ASSESSMENTS: OrcaDimensionAssessment[] = [
  {
    dimensionId: "audit_security", weight: 15, score: 7, anchorBand: "supported", confidence: "high",
    limitingFact: "The most recent audit (Sec3, Aug 2025) predates the deployed commit (~Feb 2026); the delta is inspectable in the open repo but was not independently audited.",
    rationale: "The strongest audit posture of any protocol assessed: six audits across four firms with a recent cadence, an open-source program, and — uniquely — an ACTIVE verified build: the OtterSec registry ties the deployed bytes to commit e5f089b with matching hashes. The deployed program is exactly what the public repo says it is. `supported`.",
  },
  {
    dimensionId: "maturity", weight: 8, score: 7, anchorBand: "supported", confidence: "medium",
    limitingFact: "TVL ($239M) sits below bull-market peaks, and the deployed binary is ~6 months old.",
    rationale: "Whirlpools has run for ~4.5 years (Orca since 2021) and remains a top-tier venue by volume ($116.5M/day at the cutoff) with no adverse operational trend. `supported`.",
  },
  {
    dimensionId: "upgrade_admin_authority", weight: 15, score: 6, anchorBand: "partial", confidence: "medium",
    limitingFact: "The upgrade authority has no documented control model (no multisig attestation found in Orca's docs) — the program is upgradeable by an unattested key.",
    rationale: "Behavioral evidence is favorable: the binary has been stable ~6 months, and the verified-build discipline means any upgrade is publicly relatable to source. LP positions are user-owned, bounding the blast radius. But the attestation gap on a w15 dimension is real. Top of `partial`.",
  },
  {
    dimensionId: "manager_discretion", weight: 12, score: 7, anchorBand: "supported", confidence: "medium",
    limitingFact: "Pool and fee parameters are protocol-set; a future parameter change could alter LP economics (within the program's constraints).",
    rationale: "LP positions are self-custodied — no operator can move, lend, or seize them, and there is NO rehypothecation layer (unlike Meteora's vault routing). Discretion is limited to pool parameters. `supported`.",
  },
  {
    dimensionId: "strategy_complexity", weight: 10, score: 6, anchorBand: "partial", confidence: "medium",
    limitingFact: "Concentrated liquidity is intrinsically complex: tick math, range management, and fee dynamics — and positions REQUIRE active management to perform as intended.",
    rationale: "A single open-source program (far simpler than Meteora's ten-program family), but the CLMM model itself is among the most intricate DeFi primitives, and passive holders can end up out-of-range. `partial`.",
  },
  {
    dimensionId: "composability_dependency", weight: 8, score: 7, anchorBand: "supported", confidence: "medium",
    limitingFact: "Aggregator routing (Jupiter) dominates real-world usage, though it is not in the custody path.",
    rationale: "Self-contained: LP principal touches only the Whirlpools program and SPL Token — no external lending, no vault layer, no third-party program in the custody path. `supported`.",
  },
  {
    dimensionId: "oracle_risk", weight: 8, score: 7, anchorBand: "supported", confidence: "medium",
    limitingFact: "AMM pricing is manipulable within a block (sandwiching, imbalance) — inherent to the model.",
    rationale: "No external price oracle in the custody path — pool state is the price; nothing to go stale or be spoofed. `supported`.",
  },
  {
    dimensionId: "liquidity_withdrawal", weight: 12, score: 8, anchorBand: "supported", confidence: "high",
    limitingFact: "Withdrawal returns the CURRENT composition of the position (both assets at pool ratio) — instant, but not at a guaranteed value.",
    rationale: "The cleanest exit of any product assessed: an LP withdraws their own position instantly and permissionlessly — no epoch gate, no NAV queue, no operator freeze, no vault-lent slice, no market-depth dependence. Top of `supported`.",
  },
  {
    dimensionId: "asset_stablecoin_risk", weight: 5, score: 5, anchorBand: "partial", confidence: "high",
    limitingFact: "Impermanent loss is intrinsic: the position's value diverges from holding its assets whenever prices move — amplified in concentrated ranges.",
    rationale: "The position holds two assets plus a divergence term, and concentration AMPLIFIES divergence relative to constant-product LPs. Structural to the product class — `partial`, as for Meteora.",
  },
  {
    dimensionId: "withdrawal_fee_transparency", weight: 3, score: 7, anchorBand: "supported", confidence: "medium",
    limitingFact: "Fees are per-pool parameters — accurate and on-chain, but there is no single protocol-wide number.",
    rationale: "Pool fees and the protocol's take are on-chain parameters surfaced in the app and docs; no contradiction between disclosure and deployment was found. `supported`.",
  },
  {
    dimensionId: "operational_dependency_risk", weight: 2, score: 6, anchorBand: "partial", confidence: "medium",
    limitingFact: "Operational practices (key custody, deployment process) are undocumented, even though the on-chain protocol runs permissionlessly.",
    rationale: "A stable, long-running team with no adverse events on record and verified-build discipline — the strongest ops posture of the LP protocols — held at `partial` only by the absence of documentation.",
  },
  {
    dimensionId: "incident_history", weight: 2, score: 5, anchorBand: "partial", confidence: "low",
    limitingFact: "Point-in-time search result, not a sourced incident review.",
    rationale: "Public searches surface NO exploit, loss event, or litigation across 4+ years — secondary sources describe it as the strongest security record among major Solana DEXs. Same standard as the peers: absence of found evidence is not a verified clean record. `partial`.",
  },
];

/* ------------------------------------------------------------------ *
 * Aggregate — same computation semantics as the other v1 assessments.
 * ------------------------------------------------------------------ */
export const ORCA_AGGREGATE_COMPUTATION_VERSION = "riskGovernance.aggregateRiskScore@v1" as const;

export function computeOrcaAggregate(items: OrcaDimensionAssessment[] = ORCA_DIMENSION_ASSESSMENTS) {
  const totalWeight = items.reduce((s, d) => s + d.weight, 0);
  const weightedPoints = items.reduce((s, d) => s + d.score * d.weight, 0);
  return { totalWeight, weightedPoints, aggregate: Math.round((weightedPoints / totalWeight) * 100) / 100 };
}

export const ORCA_AGGREGATE_RESULT = computeOrcaAggregate();

export const ORCA_ASSESSMENT_OUTCOME = {
  computationVersion: ORCA_AGGREGATE_COMPUTATION_VERSION,
  mandatoryBlockerResult: "none_present" as const,
  weightedPoints: 671,
  totalWeight: 100,
  aggregate: 6.71,
  minimumThreshold: 7,
  meetsMinimum: false,
  scoresAdjustedAfterSeeingAggregate: false,
  interpretation:
    "6.71 against a floor of 7 — Orca does NOT meet the internal suitability minimum, but the composition " +
    "matters: this is the strongest possible showing for a liquidity-pool product under this rubric. The code " +
    "story is best-in-class (active verified build, six audits, zero exploits found, self-custodied instant " +
    "exits). What holds it under the floor is the product class itself — impermanent loss (5 × w5) and CLMM " +
    "complexity (6 × w10) are design properties, plus one closable gap: the unattested upgrade authority " +
    "(6 × w15). Compare: Meteora 5.83 (same class, weaker on every operator dimension). The floor exists to " +
    "protect a buffer-first product; an AMM position that can lose value against simply holding is not a " +
    "principal-preserving destination, however well built. A human reviewer may accept, reject, or override " +
    "with a recorded rationale.",
} as const;

/**
 * Sensitivity: a documented + proven upgrade-authority multisig moves admin to 7
 * (+0.15 → 6.86) — still below the floor. The remaining distance is structural (impermanent
 * loss, CLMM complexity): it re-scores only if the product class changes, which is to say it
 * does not. Orca clears the floor only if the rubric someday weighs LP products on a
 * different basis — a policy question, not an evidence question.
 */
export const ORCA_SENSITIVITY_NOTE = "best_in_class_lp_still_structurally_below_floor" as const;

/**
 * HUMAN REVIEW DECISION (recorded, 2026-08-11). The authorized human product owner
 * (ws_product_owner) reviewed the assessment in conversation and ACCEPTED it as-is:
 * Orca's liquidity pools are recorded as NOT PASSED at 6.71, with zero overrides.
 * The decision affirms the floor's intent: an AMM position that can lose value against
 * simply holding is not a principal-preserving destination, however well built. If LP
 * products are ever to pass, the path is an explicit rubric-policy amendment — not a
 * one-off override.
 */
export const ORCA_HUMAN_REVIEW_DECISION = {
  decidedByRole: "ws_product_owner" as const,
  decidedAt: "2026-08-11",
  decision: "accepted_automated_assessment" as const,
  outcome: "not_passed" as const,
  overridesApplied: 0,
  mainReason:
    "Below the floor (6.71 vs 7) for structural reasons: liquidity-pool positions carry impermanent loss by " +
    "design — amplified by concentrated ranges — and the upgrade authority has no documented control model. " +
    "The code itself is best-in-class: the only active verified build assessed, six audits, and no exploit " +
    "found in over four years.",
  reopenOn: [
    "a documented / proven upgrade-authority multisig",
    "an audit covering the deployed commit",
    "a rubric-policy amendment changing how LP products are weighed (product-owner decision)",
  ],
} as const;

export const ORCA_ASSESSMENT_LIMITATIONS = [
  "The delta between the last audited version (Aug 2025) and the deployed commit (Feb 2026) was not independently reviewed, though it is public.",
  "No specific pool's fee configuration was decoded; transparency was assessed from docs + on-chain parameter structure.",
  "The upgrade-authority control model is unattested — nothing adverse found, nothing favorable provable.",
  "Incident history is a point-in-time search result, not a sourced incident review.",
] as const;

export const ORCA_ASSESSMENT_INVALIDATION_TRIGGERS = [
  "Whirlpools program upgrade (deploy slot changes; verification status may lapse)",
  "a documented / proven upgrade-authority multisig (reopens upgrade_admin_authority)",
  "an audit covering the deployed commit (reopens audit_security toward 8)",
  "a material incident, exploit, or loss event",
  "a rubric-policy change to how LP products are weighed (product-owner decision)",
] as const;
