/**
 * msolRubricV1AutomatedAssessment — the rubric-v1 (12-dimension) automated assessment for
 * Marinade mSOL liquid staking, replacing the retired six-dimension draft score (7.40) as
 * the current assessment of record.
 *
 * RESULT: weighted aggregate 6.34 against a floor of 7 — `meetsMinimum` is FALSE on automated
 * assessment. Unlike bSOL (verification-shaped near-miss), mSOL carries ADVERSE findings on
 * top of the familiar verification gaps: a recorded operational incident (the SAM
 * unstake-priority bug — ~37,000 SOL of missed rewards over epochs 652–777, disclosed only on
 * a community forum, no official postmortem) and MEASURED secondary-market exit depth that
 * collapses at size (25,000 mSOL exits ~2.3% below NAV; 50,000 finds no viable route —
 * reproduced twice). Its fee story is the BEST of the set: the documented 0% reward fee is
 * verified on-chain (reward_fee_bps = 0). Marinade runs its OWN custom liquid-staking
 * program — its prior OtterSec build verification (Jan 2024) LAPSED when the program was
 * upgraded ~2026-07-17, and no release artifact exists to re-verify against.
 *
 * SEPARATION OF DUTIES (risk_separation_of_duties_v2): authored under the
 * ws_automated_risk_assessor identity — scores and aggregates only; NO approval, NO
 * recommendation change. Numbers reach users ONLY via the Vetting-page Security-score
 * exception (riskScoreExposurePolicy → VETTING_SECURITY_SCORE_EXCEPTION).
 *
 * EVERY fact carries its source, collected 2026-08-11 (Claude, evidence preparer,
 * founder-authorized fetch): live mainnet reads via solana-rpc.publicnode.com (epoch 1015),
 * the recorded 14-series mSOL evidence (audits, multisig, SAM incident), Marinade docs/API,
 * DefiLlama, the OtterSec verified-build registry, the marinade-finance GitHub, and live
 * Jupiter quotes.
 */

export const MSOL_RUBRIC_V1_ASSESSMENT_VERSION = "1.0.0" as const;
export const MSOL_RUBRIC_V1_ASSESSMENT_ID = "msol_rubric_v1_automated_assessment_v1" as const;
export const MSOL_V1_ASSESSMENT_APPROVES_ANYTHING = false;
export const MSOL_V1_ASSESSMENT_ENABLES_TRANSACTIONS = false;

/* ---- Exact product binding. Self-validating: the decoded state's msol_mint matched. ---- */
export const MSOL_V1_ASSESSMENT_BINDING = {
  protocolId: "marinade",
  product: "mSOL liquid staking",
  liquidStakingProgram: "MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD", // Marinade's OWN custom program
  stateAccount: "8szGkuLTAux9XMgZ2vtY39jVSowEcpBfFfD8hXSEqdGC", // decoded msol_mint == mSoL… (self-validating)
  msolMint: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
  programUpgradeAuthority: "551FBXSXdhcRDDkdcb3ThDRg84Mwe5Zs6YjJ1EEoyzBp", // docs: 13-party / 6-signer multisig (recorded 14-series evidence)
  adminAuthority: "42VJbDihcS81YJPbuhHnHgvo1ehu42j8VK9sNwrnAarR",
  evidenceCutoffAt: "2026-08-11T00:00:00.000Z",
  evidenceEpoch: 1015,
} as const;

/* ---- Key on-chain + registry facts (read directly at the cutoff). ---- */
export const MSOL_V1_ONCHAIN_FACTS = {
  rewardFeeBps: 0, // decoded from the State account — VERIFIES the documented 0% reward fee
  msolNavSol: 1.3994, // api.marinade.finance/msol/price_sol at the cutoff
  programLastDeploySlot: 433_290_841, // ~25 days before the cutoff (~2026-07-17)
  verifiedBuild: {
    registryHasRecord: true, // OtterSec registry: repo marinade-finance/liquid-staking-program
    lastVerifiedAt: "2024-01-26",
    currentlyVerified: false, // the Jul 2026 upgrade broke the Jan 2024 verification; no release artifact exists to re-verify
  },
} as const;

export const MSOL_V1_MARKET_FACTS = {
  msolTvlUsd: 183_782_735, // DefiLlama api.llama.fi/tvl/marinade-liquid-staking at the cutoff
  marinadeTotalTvlUsd: 539_775_162, // incl. Marinade Native
  launched: "2021-Q3", // the oldest LST assessed (~5 years)
  measuredExit:
    "10,000 mSOL ~0.64% below NAV; 25,000 ~2.3% below NAV; 50,000 found NO viable route (rate 0.944 vs NAV 1.399) — reproduced twice via Jupiter at the cutoff",
} as const;

export type MsolV1AnchorBand = "unsupported" | "weak" | "partial" | "supported" | "strongly_supported";
export type MsolV1Confidence = "low" | "medium" | "high";

export interface MsolV1DimensionAssessment {
  dimensionId: string;
  weight: number;
  score: number;
  anchorBand: MsolV1AnchorBand;
  confidence: MsolV1Confidence;
  limitingFact: string;
  rationale: string;
}

/**
 * The twelve dimension scores. Anchors (riskGovernance STD_ANCHORS): unsupported 0–2,
 * weak 3–4, partial 5–6, supported 7–8, strongly_supported 9–10. Unknowns never score
 * as favourable.
 */
export const MSOL_V1_DIMENSION_ASSESSMENTS: MsolV1DimensionAssessment[] = [
  {
    dimensionId: "audit_security", weight: 15, score: 6, anchorBand: "partial", confidence: "medium",
    limitingFact: "The deployed binary (upgraded ~2026-07-17) broke the Jan 2024 OtterSec build verification, post-dates the recorded audits by years, and the repo publishes no release artifact or expected hash to re-verify against.",
    rationale: "Marinade's custom program carries four independent audits (Kudelski, Ackee, Neodyme, Sec3) plus SOC 2 Type I/II — the recorded 14-series evidence — and it HELD a verified build until the July 2026 upgrade lapsed it. Strong audit base with a confirmed, currently-open linkage gap on the exact deployed bytes — `partial`.",
  },
  {
    dimensionId: "maturity", weight: 8, score: 7, anchorBand: "supported", confidence: "medium",
    limitingFact: "mSOL TVL ($183.8M) is far below its bull-market peak; the deployed binary itself is only ~25 days old.",
    rationale: "The oldest LST assessed — live since Q3 2021 (~5 years) with continuous operation, active development (June–July 2026 commits and deploy), and a live API. The long track record is real; the adoption decline and fresh binary are recorded.",
  },
  {
    dimensionId: "upgrade_admin_authority", weight: 15, score: 6, anchorBand: "partial", confidence: "medium",
    limitingFact: "The documented 13-party / 6-signer multisig behind the upgrade and admin authorities is unproven on-chain — the same gap class as every pool assessed — and the authority exercised its power ~25 days before the cutoff.",
    rationale: "The multisig is documented with party/threshold specifics (recorded 14-series evidence) and custody is program-enforced (delayed unstake is permissionless at NAV). A custom program raises the stakes of this dimension relative to shared-program pools: the authority controls a codebase only Marinade runs. Top of `partial`.",
  },
  {
    dimensionId: "manager_discretion", weight: 12, score: 6, anchorBand: "partial", confidence: "medium",
    limitingFact: "Fee-change bounds in the custom program were not verified (the current 0% is verified, its ceiling is not), and SAM delegation automation has a demonstrated reward-impacting failure (the epochs 652–777 bug).",
    rationale: "Principal custody is structurally bounded (program-controlled stake, permissionless NAV exit), and the operator cannot seize funds. But delegation runs through Marinade's SAM auction — algorithmic discretion that provably went wrong once — and unlike the verified SPL v2.1.0 pools, no hard fee-increase cap was verified in these bytes. `partial`.",
  },
  {
    dimensionId: "strategy_complexity", weight: 10, score: 6, anchorBand: "partial", confidence: "medium",
    limitingFact: "A custom liquid-staking program + the SAM delegation auction + an internal unstake-liquidity pool — materially more moving parts than a plain stake pool, all maintained by one team.",
    rationale: "Still non-leveraged native staking at core, but the surface a failure can hide in is the largest of the LSTs assessed: bespoke code paths for delegation, pricing, and instant exit rather than the shared battle-tested pool program. `partial`.",
  },
  {
    dimensionId: "composability_dependency", weight: 8, score: 7, anchorBand: "supported", confidence: "medium",
    limitingFact: "Instant exits depend on the internal liquidity pool and DEX routes; delegation quality depends on the SAM service.",
    rationale: "Principal depends only on Marinade's program and native staking — no external DeFi legs in the custody path. The dependency surface for user funds is minimal even though the reward path has service dependencies.",
  },
  {
    dimensionId: "oracle_risk", weight: 8, score: 7, anchorBand: "supported", confidence: "medium",
    limitingFact: "mSOL's market price can dislocate from NAV under stress — it did in December 2023, and today's measured depth suggests a large seller would again move it well below NAV.",
    rationale: "No external price oracle in the custody path: the mSOL/SOL rate derives from on-chain state (1.3994 verified via the official API against the state read). The discount risk is a market phenomenon bounded by epoch-gated NAV redemption.",
  },
  {
    dimensionId: "liquidity_withdrawal", weight: 12, score: 6, anchorBand: "partial", confidence: "high",
    limitingFact: "Measured DEX exit depth collapses at size: 25,000 mSOL fills ~2.3% below NAV and 50,000 finds no viable route (reproduced) — the weakest instant-exit profile of the LSTs assessed.",
    rationale: "The structural guarantee holds — delayed unstake at NAV is permissionless (epoch wait), and Marinade's internal liquid-unstake pool offers instant exit at a dynamic 0.1–9% fee. But this dimension weighs what an exiting holder actually faces: small exits are fine (~0.64% below NAV at 10k), large exits are punitive or unfillable on the open market. `partial`.",
  },
  {
    dimensionId: "asset_stablecoin_risk", weight: 5, score: 8, anchorBand: "supported", confidence: "medium",
    limitingFact: "LST discount risk is bounded but real — the December 2023 mSOL dislocation is the ecosystem's canonical example.",
    rationale: "Natively staked SOL — no stablecoin peg surface, no collateral basket. NAV redemption bounds the discount to one epoch of waiting for holders who can wait.",
  },
  {
    dimensionId: "withdrawal_fee_transparency", weight: 3, score: 8, anchorBand: "supported", confidence: "high",
    limitingFact: "The liquid-unstake fee is dynamic (0.1–9% depending on pool liquidity) — accurately disclosed, but a user must understand the range.",
    rationale: "The BEST fee story of the set: the documented 0% reward fee is VERIFIED on-chain (reward_fee_bps = 0 in the decoded State), the 0.2% direct-unstake fee and dynamic liquid-unstake fee are documented, and nothing on chain contradicts any disclosure. `supported`.",
  },
  {
    dimensionId: "operational_dependency_risk", weight: 2, score: 5, anchorBand: "partial", confidence: "medium",
    limitingFact: "The SAM delegation service is exactly the component that failed in the recorded incident, and its operational practices are documented only at a high level.",
    rationale: "Diversified validator delegation (no single-validator concentration) and a long-running ops team, offset by a bespoke automation layer with a demonstrated failure and a multisig whose operational hygiene is unverifiable. `partial`.",
  },
  {
    dimensionId: "incident_history", weight: 2, score: 4, anchorBand: "weak", confidence: "medium",
    limitingFact: "The SAM unstake-priority bug (~37,000 SOL of missed rewards across epochs 652–777) was disclosed on a community forum only — no official postmortem exists.",
    rationale: "The only product assessed with a CONFIRMED reward-impacting incident on record (recorded 14-series evidence). No principal was lost and the bug was fixed, but the disclosure practice — community forum, no postmortem, criticized — is what this dimension grades, and it grades `weak`.",
  },
];

/* ------------------------------------------------------------------ *
 * Aggregate — same computation semantics as the other v1 assessments.
 * ------------------------------------------------------------------ */
export const MSOL_V1_AGGREGATE_COMPUTATION_VERSION = "riskGovernance.aggregateRiskScore@v1" as const;

export function computeMsolV1Aggregate(items: MsolV1DimensionAssessment[] = MSOL_V1_DIMENSION_ASSESSMENTS) {
  const totalWeight = items.reduce((s, d) => s + d.weight, 0);
  const weightedPoints = items.reduce((s, d) => s + d.score * d.weight, 0);
  return { totalWeight, weightedPoints, aggregate: Math.round((weightedPoints / totalWeight) * 100) / 100 };
}

export const MSOL_V1_AGGREGATE_RESULT = computeMsolV1Aggregate();

export const MSOL_V1_ASSESSMENT_OUTCOME = {
  computationVersion: MSOL_V1_AGGREGATE_COMPUTATION_VERSION,
  mandatoryBlockerResult: "none_present" as const,
  weightedPoints: 634,
  totalWeight: 100,
  aggregate: 6.34,
  minimumThreshold: 7,
  meetsMinimum: false,
  scoresAdjustedAfterSeeingAggregate: false,
  interpretation:
    "6.34 against a floor of 7 — mSOL does NOT meet the internal suitability minimum on automated assessment, " +
    "and unlike bSOL's near-miss this shortfall includes ADVERSE findings, not just verification gaps: a " +
    "confirmed reward-impacting incident with poor disclosure (incident_history 4 × w2), measured exit depth " +
    "that collapses at size (liquidity_withdrawal 6 × w12), a bespoke codebase whose build verification lapsed " +
    "25 days ago (audit_security 6 × w15), and delegation automation with a demonstrated failure " +
    "(manager_discretion 6 × w12). Its strengths are real — the longest track record of any LST, a chain-verified " +
    "0% reward fee, diversified delegation — but they sit in lighter-weighted dimensions. The retired draft score " +
    "(7.40) predates the rubric's weighting of exit risk and code custody. A human reviewer may accept, reject, " +
    "or override with a recorded rationale.",
} as const;

/**
 * Sensitivity: re-verifying the build (Marinade publishing an expected hash for the Jul 2026
 * deploy) moves audit_security to 7 (+0.15 → 6.49); on-chain multisig proof moves
 * upgrade_admin_authority to 7 (+0.15 → 6.64). Even both together leave mSOL ~0.36 below the
 * floor — the measured liquidity profile and the incident record are structural to the
 * verdict and re-score only if market depth or disclosure practice materially changes.
 */
export const MSOL_V1_SENSITIVITY_NOTE = "adverse_findings_not_only_verification_gaps" as const;

/**
 * HUMAN REVIEW DECISION (recorded, 2026-08-11). The authorized human product owner
 * (ws_product_owner) reviewed the assessment in conversation and ACCEPTED it as-is:
 * mSOL is recorded as NOT PASSED at 6.34, with zero overrides. Reopens on the triggers
 * below; per the sensitivity note, verification fixes alone cannot clear the floor —
 * the liquidity profile and incident record are structural to this verdict.
 */
export const MSOL_V1_HUMAN_REVIEW_DECISION = {
  decidedByRole: "ws_product_owner" as const,
  decidedAt: "2026-08-11",
  decision: "accepted_automated_assessment" as const,
  outcome: "not_passed" as const,
  overridesApplied: 0,
  mainReason:
    "Below the floor (6.34 vs 7) with adverse findings: a confirmed reward-impacting incident (the SAM " +
    "delegation bug, ~37,000 SOL of missed rewards, disclosed without an official postmortem) and measured " +
    "exit depth that collapses at size — 50,000 mSOL found no viable market route. Its chain-verified 0% " +
    "reward fee and five-year track record are recorded strengths, but they sit in lighter-weighted dimensions.",
  reopenOn: [
    "a re-verified build / published expected hash for the deployed binary",
    "on-chain proof of the 13-party multisig signing model",
    "a material, sustained recovery in mSOL secondary-market depth",
    "an official SAM-incident postmortem",
  ],
} as const;

export const MSOL_V1_ASSESSMENT_LIMITATIONS = [
  "The 13-party / 6-signer multisig attestation was not proven on-chain.",
  "Fee-change ceilings in the custom program were not verified (only the current 0% value was).",
  "The liquidity-depth measurements are point-in-time (reproduced twice at the cutoff).",
  "The SAM incident record relies on the recorded 14-series evidence and community-forum disclosure; no official postmortem exists to review.",
] as const;

export const MSOL_V1_ASSESSMENT_INVALIDATION_TRIGGERS = [
  "program upgrade (deploy slot changes)",
  "a published expected hash / re-verified build for the deployed binary (reopens audit_security)",
  "on-chain proof of the multisig signing model (reopens upgrade_admin_authority)",
  "a material, sustained recovery in mSOL secondary-market depth (reopens liquidity_withdrawal)",
  "an official SAM-incident postmortem or a new incident (reopens incident_history)",
  "any change to the on-chain reward_fee",
] as const;
