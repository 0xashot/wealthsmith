/**
 * raydiumRubricV1AutomatedAssessment — the rubric-v1 (12-dimension) automated assessment for
 * Raydium liquidity pools (CLMM + AMM) — cold-start vetting, no prior engine evidence.
 *
 * RESULT: weighted aggregate 6.03 against a floor of 7 — `meetsMinimum` is FALSE. Raydium is
 * the largest LP venue assessed ($843M TVL, ~$84M daily volume) and shows a real remediation
 * culture — but it is the ONLY protocol on the board with CONFIRMED principal-loss exploits,
 * and there are TWO: (1) Dec 2022, ~$5.5M — a compromised pool-authority admin key (infected
 * VM), patched the same day, authority migrated to hardware/multisig custody, detailed public
 * postmortem, governance-approved compensation with a claim portal — an exemplary response;
 * (2) June 2026, ~$1.34M (reported) — an LP-mint validation flaw in RETIRED Serum-era legacy
 * pools, current CLMM/V4 untouched, treasury refund pledged, but NO official postmortem
 * published two months on. The 2026 event is also a complexity finding: deprecated programs
 * remained attackable on-chain. Structural LP risk (impermanent loss, multi-generation
 * program surface) applies as for the other AMMs; the CLMM binary was upgraded ~11 days
 * before the cutoff and has no verified build (the registry holds a repo/commit record but
 * verification is incomplete).
 *
 * SEPARATION OF DUTIES (risk_separation_of_duties_v2): authored under the
 * ws_automated_risk_assessor identity — scores and aggregates only; NO approval. Numbers
 * reach users ONLY via the Vetting-page Security-score exception.
 *
 * EVERY fact carries its source, collected 2026-08-11 (Claude, evidence preparer,
 * founder-authorized fetch): live mainnet reads via solana-rpc.publicnode.com, the OtterSec
 * verified-build registry, Raydium's published 2022 postmortem + compensation records,
 * public reporting on the June 2026 legacy-pool exploit, and DefiLlama TVL + DEX volume.
 */

export const RAYDIUM_RUBRIC_V1_ASSESSMENT_VERSION = "1.0.0" as const;
export const RAYDIUM_RUBRIC_V1_ASSESSMENT_ID = "raydium_rubric_v1_automated_assessment_v1" as const;
export const RAYDIUM_ASSESSMENT_APPROVES_ANYTHING = false;
export const RAYDIUM_ASSESSMENT_ENABLES_TRANSACTIONS = false;

/* ---- Product binding: the LP product family, anchored on the flagship CLMM program. ---- */
export const RAYDIUM_ASSESSMENT_BINDING = {
  protocolId: "raydium",
  product: "Liquidity pools (CLMM + AMM)",
  clmmProgram: "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK",
  clmmProgramDataAccount: "HzD2cCXXT3UQNjMMY6kDv9w6gZ9qquSdfoGXrLL3LXx",
  clmmUpgradeAuthority: "FytDrVzDybM1TwFQPGb8qaxZR7dBCzNeqT3vtQsceZQK", // post-2022 hardened custody attested as history; current model unattested
  evidenceCutoffAt: "2026-08-11T00:00:00.000Z",
} as const;

export const RAYDIUM_ONCHAIN_FACTS = {
  clmmLastDeploySlot: 436_167_935, // ~11 days before the cutoff (~2026-07-31)
  clmmUpgradeable: true,
  verifiedBuild: {
    registryHasRecord: true, // repo raydium-io/raydium-clmm @ 119ed36 with an on-chain hash recorded
    currentlyVerified: false, // is_verified false; executable hash empty — verification incomplete
  },
} as const;

export const RAYDIUM_MARKET_FACTS = {
  tvlUsd: 843_284_647, // DefiLlama api.llama.fi/tvl/raydium at the cutoff — the largest LP venue assessed
  dailyVolumeUsd: 84_374_059, // DefiLlama DEX summary total24h
  lineage: "Live since 2021 (~5.5 years); multiple AMM generations concurrently on-chain (legacy, V4, CPMM, CLMM)",
  incidents: {
    dec2022: "~$5.5M — compromised pool-authority key; same-day patch, hardware/multisig migration, full public postmortem, governance-approved compensation",
    jun2026: "~$1.34M (reported) — LP-mint validation flaw in retired Serum-era pools; current pools untouched; treasury refund pledged; no official postmortem published at the cutoff",
  },
} as const;

export type RaydiumAnchorBand = "unsupported" | "weak" | "partial" | "supported" | "strongly_supported";
export type RaydiumConfidence = "low" | "medium" | "high";

export interface RaydiumDimensionAssessment {
  dimensionId: string;
  weight: number;
  score: number;
  anchorBand: RaydiumAnchorBand;
  confidence: RaydiumConfidence;
  limitingFact: string;
  rationale: string;
}

/**
 * The twelve dimension scores. Anchors (riskGovernance STD_ANCHORS): unsupported 0–2,
 * weak 3–4, partial 5–6, supported 7–8, strongly_supported 9–10. Unknowns never score
 * as favourable.
 */
export const RAYDIUM_DIMENSION_ASSESSMENTS: RaydiumDimensionAssessment[] = [
  {
    dimensionId: "audit_security", weight: 15, score: 6, anchorBand: "partial", confidence: "medium",
    limitingFact: "The CLMM binary was upgraded ~11 days before the cutoff with no completed build verification (the registry's record is incomplete: on-chain hash present, executable hash empty), and the June 2026 event proved a validation-flaw class existed in the program family's older code.",
    rationale: "Raydium's programs are open source with audit coverage (OtterSec and others per its docs) and a registry record links the CLMM to its repo — but the deployed bytes are fresh, unverified, and post-date the audits. Main risk covered by audit history and openness; linkage and legacy-code gaps named. `partial`.",
  },
  {
    dimensionId: "maturity", weight: 8, score: 7, anchorBand: "supported", confidence: "medium",
    limitingFact: "The record includes two real failures (2022, 2026), and the flagship binary is only ~11 days old.",
    rationale: "Live since 2021 (~5.5 years), the largest LP venue assessed ($843M TVL, ~$84M daily volume), continuously operated through two exploits with the protocol and its users still here. Longevity and scale are real; so are the scars. `supported`.",
  },
  {
    dimensionId: "upgrade_admin_authority", weight: 15, score: 5, anchorBand: "partial", confidence: "low",
    limitingFact: "The 2022 exploit WAS an authority-key compromise — the historical failure this dimension exists to price — and while custody was hardened (hardware wallet, then multisig, per the postmortem), the CURRENT control model of the upgrade authority is unattested.",
    rationale: "Remediation is documented history: same-day authority migration and a stated move to multisig custody. But a demonstrated past key-custody failure plus no current attestation, on a program upgraded 11 days ago, holds this at low `partial`.",
  },
  {
    dimensionId: "manager_discretion", weight: 12, score: 6, anchorBand: "partial", confidence: "medium",
    limitingFact: "The 2022 exploit demonstrated that admin functions could reach pool funds (fee withdrawal + parameter manipulation); those paths were patched, but the current program's admin-reach bounds were not independently verified.",
    rationale: "LP positions are self-custodied and there is no rehypothecation layer. The discretion surface that existed in 2022 was reduced by the patch — a real improvement the record supports — but this dimension prices verified bounds, and none were verified on the fresh binary. `partial`.",
  },
  {
    dimensionId: "strategy_complexity", weight: 10, score: 5, anchorBand: "partial", confidence: "medium",
    limitingFact: "Multiple AMM generations live concurrently on-chain (legacy Serum-era pools, V4, CPMM, CLMM) — and the June 2026 exploit happened precisely because RETIRED code remained attackable.",
    rationale: "Each generation is a real surface, and the deprecation story is now demonstrably incomplete: pools retired in 2021 still held drainable funds in 2026. Complexity here is not just the CLMM math — it is the accumulated surface of the whole family. `partial`.",
  },
  {
    dimensionId: "composability_dependency", weight: 8, score: 6, anchorBand: "partial", confidence: "medium",
    limitingFact: "Legacy AMM pools were structurally bound to external Serum/OpenBook order-book markets; newer generations (CPMM, CLMM) removed that dependency.",
    rationale: "The modern custody path is self-contained (pool program + SPL Token), like Orca's. The dependency history and the still-live legacy surface keep this a notch below. `partial`.",
  },
  {
    dimensionId: "oracle_risk", weight: 8, score: 7, anchorBand: "supported", confidence: "medium",
    limitingFact: "AMM pricing is manipulable within a block (sandwiching, imbalance) — inherent to the model.",
    rationale: "No external price oracle in the custody path — pool state is the price. `supported`.",
  },
  {
    dimensionId: "liquidity_withdrawal", weight: 12, score: 8, anchorBand: "supported", confidence: "high",
    limitingFact: "Withdrawal returns the current composition of the position — instant, but not at a guaranteed value.",
    rationale: "Self-custodied positions withdraw instantly and permissionlessly from the deepest LP liquidity on the board — no epoch gate, no queue, no vault-lent slice. Top of `supported`, as for Orca.",
  },
  {
    dimensionId: "asset_stablecoin_risk", weight: 5, score: 5, anchorBand: "partial", confidence: "high",
    limitingFact: "Impermanent loss is intrinsic: the position's value diverges from holding its assets whenever prices move — amplified in concentrated ranges.",
    rationale: "Two assets plus a divergence term, structural to the product class — `partial`, as for every AMM assessed.",
  },
  {
    dimensionId: "withdrawal_fee_transparency", weight: 3, score: 7, anchorBand: "supported", confidence: "medium",
    limitingFact: "Fees are per-pool parameters — accurate and on-chain, with no single protocol-wide number.",
    rationale: "Pool fees and the protocol take are on-chain parameters surfaced in docs and app; no contradiction between disclosure and deployment was found. `supported`.",
  },
  {
    dimensionId: "operational_dependency_risk", weight: 2, score: 4, anchorBand: "weak", confidence: "medium",
    limitingFact: "Two operational failures are on record — key custody on an infected machine (2022) and incomplete decommissioning of retired programs (2026) — a pattern, not a one-off.",
    rationale: "The remediation culture is genuinely strong (same-day patches, compensation, transparency pages), which is why this is not lower — but the dimension grades operational practice, and practice failed twice in ways users paid for. `weak`.",
  },
  {
    dimensionId: "incident_history", weight: 2, score: 3, anchorBand: "weak", confidence: "medium",
    limitingFact: "TWO confirmed principal-loss exploits — Dec 2022 (~$5.5M) and June 2026 (~$1.34M reported) — and the 2026 event has NO official postmortem two months on.",
    rationale: "The only protocol assessed with verified user-fund losses. The 2022 response was exemplary (detailed postmortem, governance-approved compensation, claim portal); the 2026 response is so far a refund pledge without a postmortem. A verifiable but adverse record — `weak`.",
  },
];

/* ------------------------------------------------------------------ *
 * Aggregate — same computation semantics as the other v1 assessments.
 * ------------------------------------------------------------------ */
export const RAYDIUM_AGGREGATE_COMPUTATION_VERSION = "riskGovernance.aggregateRiskScore@v1" as const;

export function computeRaydiumAggregate(items: RaydiumDimensionAssessment[] = RAYDIUM_DIMENSION_ASSESSMENTS) {
  const totalWeight = items.reduce((s, d) => s + d.weight, 0);
  const weightedPoints = items.reduce((s, d) => s + d.score * d.weight, 0);
  return { totalWeight, weightedPoints, aggregate: Math.round((weightedPoints / totalWeight) * 100) / 100 };
}

export const RAYDIUM_AGGREGATE_RESULT = computeRaydiumAggregate();

export const RAYDIUM_ASSESSMENT_OUTCOME = {
  computationVersion: RAYDIUM_AGGREGATE_COMPUTATION_VERSION,
  mandatoryBlockerResult: "none_present" as const,
  weightedPoints: 603,
  totalWeight: 100,
  aggregate: 6.03,
  minimumThreshold: 7,
  meetsMinimum: false,
  scoresAdjustedAfterSeeingAggregate: false,
  interpretation:
    "6.03 against a floor of 7 — Raydium does NOT meet the internal suitability minimum. The composition: the " +
    "structural LP dimensions shared with every AMM (impermanent loss 5 × w5), plus findings specific to " +
    "Raydium's record — the only confirmed principal-loss exploits on the board (incidents 3 × w2, ops 4 × w2), " +
    "an authority whose historical compromise is documented and whose current custody is unattested (5 × w15), " +
    "a multi-generation program surface where retired code stayed attackable (complexity 5 × w10), and an " +
    "unverified 11-day-old flagship binary (audit_security 6 × w15). Scale and remediation culture are real " +
    "($843M TVL; the 2022 response was exemplary) and are reflected where the evidence supports them. Ranking " +
    "among AMMs: Orca 6.71 (clean record, verified build) > Raydium 6.03 > Meteora 5.83 (governance cloud). " +
    "A human reviewer may accept, reject, or override with a recorded rationale.",
} as const;

/**
 * Sensitivity: a published June-2026 postmortem plus a completed build verification and a
 * current authority attestation would plausibly add ~0.35–0.45 (→ ~6.4–6.5) — still below
 * the floor. As with Orca, the remaining distance is structural to the LP product class and
 * re-scores only on a rubric-policy change.
 */
export const RAYDIUM_SENSITIVITY_NOTE = "exploit_record_plus_structural_lp_risk" as const;

/**
 * HUMAN REVIEW DECISION (recorded, 2026-08-11). The authorized human product owner
 * (ws_product_owner) reviewed the assessment in conversation and ACCEPTED it as-is:
 * Raydium's liquidity pools are recorded as NOT PASSED at 6.03, with zero overrides.
 * The 2022 remediation is credited in the record; the verdict rests on the confirmed
 * loss record, the unattested authority on a fresh unverified binary, and the
 * structural LP dimensions the floor exists to price.
 */
export const RAYDIUM_HUMAN_REVIEW_DECISION = {
  decidedByRole: "ws_product_owner" as const,
  decidedAt: "2026-08-11",
  decision: "accepted_automated_assessment" as const,
  outcome: "not_passed" as const,
  overridesApplied: 0,
  mainReason:
    "Below the floor (6.03 vs 7): the only protocol assessed with confirmed principal-loss exploits — " +
    "~$5.5M in Dec 2022 (exemplary postmortem and compensation) and ~$1.34M in June 2026 in retired legacy " +
    "pools, still without an official postmortem — alongside impermanent loss intrinsic to LP positions and " +
    "an upgrade authority whose current custody is unattested on an 11-day-old unverified binary.",
  reopenOn: [
    "an official June-2026 postmortem with confirmed remediation of the legacy-pool surface",
    "a completed build verification and a current upgrade-authority attestation",
    "a rubric-policy amendment changing how LP products are weighed (product-owner decision)",
  ],
} as const;

export const RAYDIUM_ASSESSMENT_LIMITATIONS = [
  "The June 2026 loss figure (~$1.34M) is reported-but-unconfirmed; no official postmortem existed at the cutoff to verify against.",
  "The current upgrade-authority custody model rests on the 2022 remediation narrative; no present-day attestation was found.",
  "No specific pool's fee configuration was decoded.",
  "Audit-report specifics (firms/dates per program) were taken from the docs' record without reading each report.",
] as const;

export const RAYDIUM_ASSESSMENT_INVALIDATION_TRIGGERS = [
  "CLMM (or family) program upgrade",
  "an official June-2026 postmortem + confirmed remediation of the legacy-pool surface (reopens incidents/ops)",
  "a completed build verification or current authority attestation",
  "another incident, exploit, or loss event",
  "a rubric-policy change to how LP products are weighed (product-owner decision)",
] as const;
