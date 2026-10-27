/**
 * jupsolRubricV1AutomatedAssessment — the rubric-v1 (12-dimension) automated assessment for
 * Jupiter JupSOL liquid staking, replacing the retired six-dimension draft score (7.65) as
 * the current assessment of record.
 *
 * RESULT: weighted aggregate 6.77 against a floor of 7 — `meetsMinimum` is FALSE on automated
 * assessment. The decisive discovery: JupSOL does NOT run on the verified SPL stake-pool
 * program — the decoded pool's owner is SANCTUM'S FORK (SanctumSplMulti, SPMBzs…), so the
 * bit-exact binary verification that lifted bSOL and JitoSOL does not transfer. The fork
 * leans on the upstream audit lineage, but its own delta is not independently audited, its
 * deployed binary (stable ~10 months) has no verified build (OtterSec registry: not
 * verified), and all stake is delegated to a SINGLE validator by design. Fee disclosures are
 * accurate (Sanctum's 5% epoch fee and 0.1% withdrawal match the chain exactly) — this is
 * NOT a bSOL-style transparency failure; the shortfall is fork verification + concentration.
 *
 * SEPARATION OF DUTIES (risk_separation_of_duties_v2): authored under the
 * ws_automated_risk_assessor identity — scores and aggregates only; NO approval, NO
 * recommendation change. Numbers reach users ONLY via the Vetting-page Security-score
 * exception (riskScoreExposurePolicy → VETTING_SECURITY_SCORE_EXCEPTION).
 *
 * EVERY fact carries its source, collected 2026-08-11 (Claude, evidence preparer,
 * founder-authorized fetch): live mainnet reads via solana-rpc.publicnode.com (epoch 1015),
 * Sanctum docs (learn.sanctum.so), Jupiter docs, the recorded 14-series JupSOL evidence,
 * DefiLlama, the OtterSec verified-build registry, and public incident searches.
 */

export const JUPSOL_RUBRIC_V1_ASSESSMENT_VERSION = "1.0.0" as const;
export const JUPSOL_RUBRIC_V1_ASSESSMENT_ID = "jupsol_rubric_v1_automated_assessment_v1" as const;
export const JUPSOL_ASSESSMENT_APPROVES_ANYTHING = false;
export const JUPSOL_ASSESSMENT_ENABLES_TRANSACTIONS = false;

/* ---- Exact product binding. Self-validating: the decoded pool's mint matched. ---- */
export const JUPSOL_ASSESSMENT_BINDING = {
  protocolId: "jupiter",
  product: "JupSOL liquid staking",
  stakePoolProgram: "SPMBzsVUuoHA4Jm6KunbsotaahvVikZs1JyTW6iJvbn", // SANCTUM'S FORK — not the verified SPL program
  stakePoolAccount: "8VpRhuxa7sUUepdY3kQiTmX9rS5vx4WgaXiAnXq4KCtr", // decoded mint == jupSoL… (self-validating)
  jupsolMint: "jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v",
  forkUpgradeAuthority: "47SND7bGKvNXrqfP1bjsLCbwTgZhFBzAgmZ42QSkRScz", // docs: 11-member multisig, threshold 6, named members
  evidenceCutoffAt: "2026-08-11T00:00:00.000Z",
  evidenceEpoch: 1015,
} as const;

/* ---- Key on-chain facts (decoded directly at the cutoff). ---- */
export const JUPSOL_ONCHAIN_FACTS = {
  totalSol: 5_180_652, // cross-checks DefiLlama $396.9M
  poolTokenSupply: 4_306_043, // → exchange rate ~1.2031 SOL per JupSOL
  lastUpdateEpoch: 1015, // current epoch — actively maintained
  poolManager: "8JS6XsMPo2u3EyeeY3p2jvzHEhdUtCKgarHpJ3PAonyv", // Sanctum management authority; docs: cannot access user funds
  poolStaker: "EG976hUYS3Mwf595uk9irszydggWzB3tBDobbMffyScq",
  programLastDeploySlot: 371_704_232, // ~10 months before the cutoff — stable binary
  epochFee: { numerator: 50, denominator: 1_000 }, // 5% of rewards — MATCHES Sanctum's disclosed epoch fee (split operators/Sanctum)
  stakeDepositFee: { numerator: 0, denominator: 0 },
  solDepositFee: { numerator: 0, denominator: 100 },
  stakeWithdrawalFee: { numerator: 1, denominator: 1_000 }, // 0.1% — matches docs
  solWithdrawalFee: { numerator: 1, denominator: 1_000 }, // 0.1% — matches docs
} as const;

export const JUPSOL_MARKET_FACTS = {
  tvlUsd: 396_907_544, // DefiLlama api.llama.fi/tvl/jupiter-staked-sol at the cutoff
  launched: "2024-Q1", // ~2.4 years — the youngest LST assessed
  measuredExit: "10,000 JupSOL quoted ~0.11% below NAV; 50,000 (~$4.5M) ~0.9% below NAV via Jupiter at the cutoff",
} as const;

export type JupsolAnchorBand = "unsupported" | "weak" | "partial" | "supported" | "strongly_supported";
export type JupsolConfidence = "low" | "medium" | "high";

export interface JupsolDimensionAssessment {
  dimensionId: string;
  weight: number;
  score: number;
  anchorBand: JupsolAnchorBand;
  confidence: JupsolConfidence;
  limitingFact: string;
  rationale: string;
}

/**
 * The twelve dimension scores. Anchors (riskGovernance STD_ANCHORS): unsupported 0–2,
 * weak 3–4, partial 5–6, supported 7–8, strongly_supported 9–10. Unknowns never score
 * as favourable.
 */
export const JUPSOL_DIMENSION_ASSESSMENTS: JupsolDimensionAssessment[] = [
  {
    dimensionId: "audit_security", weight: 15, score: 6, anchorBand: "partial", confidence: "medium",
    limitingFact: "The pool runs on Sanctum's FORK of the SPL stake-pool program: the fork's delta from upstream is not independently audited, the deployed binary has no verified build (OtterSec registry: not verified), and the bit-exact verification that covered bSOL/JitoSOL does not apply.",
    rationale: "The upstream SPL stake-pool lineage (ten audit artifacts, seven firms, incl. Certora formal verification) covers the fork's ancestry, and Sanctum runs a real audit program of its own (Neodyme, OtterSec, Sec3 across its products). But this dimension grades the EXACT deployed program, and that program is a fork whose delta and binary identity could not be verified from primary sources. Main risk covered by ancestry, named verification gap — `partial`.",
  },
  {
    dimensionId: "maturity", weight: 8, score: 7, anchorBand: "supported", confidence: "medium",
    limitingFact: "The youngest product assessed (~2.4 years); the fork binary itself has run unchanged for only ~10 months.",
    rationale: "Live since Q1 2024, grown to ~5.18M SOL / $396.9M — the second-largest LST assessed — actively maintained (pool updated in the current epoch), with no adverse adoption trend. Solid but shorter track record than bSOL (4.2y) or JitoSOL (3.7y).",
  },
  {
    dimensionId: "upgrade_admin_authority", weight: 15, score: 6, anchorBand: "partial", confidence: "medium",
    limitingFact: "The 11-member / threshold-6 multisig controlling the fork's upgrade key is documented with named members (Jito, Jupiter, Laine, Mango, MRGN, Solblaze, SolanaFM, Sanctum…) but remains unproven on-chain — same class of gap as the other pools.",
    rationale: "The most SPECIFIC authority attestation of any product assessed: Sanctum's docs name the multisig's membership and threshold, Jupiter's docs repeat it, and the binary's 10-month stability is consistent with committee-controlled upgrades. Custody stays program-enforced (the Sanctum management authority 'cannot access user funds' per docs, structurally consistent with stake-pool semantics). Signing model still unproven on-chain — top of `partial`.",
  },
  {
    dimensionId: "manager_discretion", weight: 12, score: 7, anchorBand: "supported", confidence: "medium",
    limitingFact: "The fork predates the v2.1.0 50bps fee-increase hard-cap verified in the SPL program; Sanctum's 'fee changes are capped and require advance warning' policy is docs-attested, not verified in the deployed bytes.",
    rationale: "Same structural custody bounds as every stake pool (principal untouchable, withdrawals permissionless at NAV, fee increases epoch-delayed), and delegation discretion is essentially ZERO by design — all stake goes to the Jupiter validator, disclosed up front. Held at 7 rather than 8 because the fee-cap is attested rather than verified in this fork's binary.",
  },
  {
    dimensionId: "strategy_complexity", weight: 10, score: 8, anchorBand: "supported", confidence: "medium",
    limitingFact: "The Sanctum operator layer (reserve, LST infrastructure) sits alongside the plain pool, though outside the custody path.",
    rationale: "A plain single-validator stake pool — no leverage, no lending, no MEV machinery, the simplest strategy shape assessed. Verifiable directly from pool state.",
  },
  {
    dimensionId: "composability_dependency", weight: 8, score: 7, anchorBand: "supported", confidence: "medium",
    limitingFact: "Two organizations sit in the product's path — Jupiter (brand/validator) and Sanctum (program/operations) — a third-party dependency the recorded 14-series evidence already flagged.",
    rationale: "Principal depends on the Solana stake program, Sanctum's fork, and SPL Token — minimal, with the fork substituting for the verified upstream. No external DeFi legs.",
  },
  {
    dimensionId: "oracle_risk", weight: 8, score: 7, anchorBand: "supported", confidence: "medium",
    limitingFact: "JupSOL's market price can trade below NAV (measured ~0.11–0.9% depending on size); NAV redemption is epoch-gated.",
    rationale: "No external price oracle in the custody path: the JupSOL/SOL rate is computed on-chain from pool state (verified 1.2031 at the read). Same structural posture as the other pools.",
  },
  {
    dimensionId: "liquidity_withdrawal", weight: 12, score: 7, anchorBand: "supported", confidence: "medium",
    limitingFact: "Measured depth is real but the thinnest of the three LSTs: 50,000 JupSOL (~$4.5M) exits ~0.9% below NAV, vs JitoSOL's 100,000 at ~0.7% below.",
    rationale: "Two verified exit paths: delayed unstake permissionless at NAV (0.1% on-chain fee, unfreezable), and a measured secondary market that absorbs 10,000 JupSOL essentially at NAV. `supported`, without JitoSOL's depth premium.",
  },
  {
    dimensionId: "asset_stablecoin_risk", weight: 5, score: 8, anchorBand: "supported", confidence: "medium",
    limitingFact: "LST premium/discount to NAV is a bounded market exposure; no slashing on Solana today is network policy, not a guarantee.",
    rationale: "Natively staked SOL — no stablecoin peg surface, no collateral basket. NAV redemption bounds the exit discount to one epoch of waiting.",
  },
  {
    dimensionId: "withdrawal_fee_transparency", weight: 3, score: 7, anchorBand: "supported", confidence: "high",
    limitingFact: "The fee structure is multi-component and split across two documentation sources: Sanctum's epoch fee (5%, split operators/Sanctum) + the Jupiter validator's inflation commission + 0.1% withdrawal — accurate, but a user must read both sites to assemble the full picture.",
    rationale: "Every disclosed fee verified ACCURATE against the deployed configuration: Sanctum's documented 5% epoch fee == on-chain 50/1000; 0.1% withdrawal == 1/1000 (both paths); deposits at zero. No bSOL-style contradiction. Held at 7 for the multi-component, multi-source disclosure.",
  },
  {
    dimensionId: "operational_dependency_risk", weight: 2, score: 5, anchorBand: "partial", confidence: "medium",
    limitingFact: "ALL stake is delegated to the single Jupiter validator: one operator's delinquency or commission change degrades the entire pool's rewards — the same concentration the native-staking baseline was marked down for.",
    rationale: "Sanctum operates the pool infrastructure (documented, multi-pool operator) and the validator is large and long-established, but single-validator concentration is a structural operational dependency that diversified pools (bSOL's scored set, JitoSOL's StakeNet) do not have. `partial`.",
  },
  {
    dimensionId: "incident_history", weight: 2, score: 5, anchorBand: "partial", confidence: "low",
    limitingFact: "Point-in-time search result, not a sourced incident review.",
    rationale: "Public searches surface NO exploit or loss event for JupSOL, the Sanctum fork, or Sanctum's LST infrastructure ('no exploits found' across $4B+ secured per its docs; nothing in the Helius exploit history). Same methodology as the peers: absence of found evidence is not a verified clean record — `partial`.",
  },
];

/* ------------------------------------------------------------------ *
 * Aggregate — same computation semantics as the other v1 assessments.
 * ------------------------------------------------------------------ */
export const JUPSOL_AGGREGATE_COMPUTATION_VERSION = "riskGovernance.aggregateRiskScore@v1" as const;

export function computeJupsolAggregate(items: JupsolDimensionAssessment[] = JUPSOL_DIMENSION_ASSESSMENTS) {
  const totalWeight = items.reduce((s, d) => s + d.weight, 0);
  const weightedPoints = items.reduce((s, d) => s + d.score * d.weight, 0);
  return { totalWeight, weightedPoints, aggregate: Math.round((weightedPoints / totalWeight) * 100) / 100 };
}

export const JUPSOL_AGGREGATE_RESULT = computeJupsolAggregate();

export const JUPSOL_ASSESSMENT_OUTCOME = {
  computationVersion: JUPSOL_AGGREGATE_COMPUTATION_VERSION,
  mandatoryBlockerResult: "none_present" as const,
  weightedPoints: 677,
  totalWeight: 100,
  aggregate: 6.77,
  minimumThreshold: 7,
  meetsMinimum: false,
  scoresAdjustedAfterSeeingAggregate: false,
  interpretation:
    "6.77 against a floor of 7 — JupSOL does NOT meet the internal suitability minimum on automated assessment. " +
    "The shortfall is structural to how the product is built, not a disclosure failure: it runs on Sanctum's fork " +
    "of the stake-pool program (unverified delta, no verified build — audit_security 6 × w15), its upgrade " +
    "authority is well-attested but on-chain-unproven (6 × w15), and every SOL is delegated to a single validator " +
    "(operational concentration, 5 × w2). Its fee disclosures are ACCURATE — the trait that sank bSOL — and its " +
    "custody structure is sound. Compared to peers: JitoSOL 7.16 (verified binary, diversified delegation, deeper " +
    "market), bSOL 6.95 (verified binary but a fee-docs contradiction), JupSOL 6.77 (accurate docs but an " +
    "unverified fork + concentration). The retired draft score (7.65) predates all of these findings. A human " +
    "reviewer may accept, reject, or override with a recorded rationale.",
} as const;

/**
 * Sensitivity: the gap (0.23) closes only with fork-level verification — a published
 * verified build + an independent audit of the fork's delta could move audit_security to 7
 * (+0.15), and on-chain multisig proof moves upgrade_admin_authority to 7 (+0.15). Both are
 * in Sanctum's / the committee's hands, not ours. Single-validator concentration is a design
 * choice that re-scores only if the delegation model changes.
 */
export const JUPSOL_SENSITIVITY_NOTE = "fork_verification_and_concentration_driven_shortfall" as const;

/**
 * HUMAN REVIEW DECISION (recorded, 2026-08-11). The authorized human product owner
 * (ws_product_owner) reviewed the assessment in conversation and ACCEPTED it as-is:
 * JupSOL is recorded as NOT PASSED at 6.77, with zero overrides. Reopens on the
 * triggers below — the decisive unlocks (verified fork build, fork-delta audit,
 * on-chain multisig proof) sit with Sanctum and the committee, not with us.
 */
export const JUPSOL_HUMAN_REVIEW_DECISION = {
  decidedByRole: "ws_product_owner" as const,
  decidedAt: "2026-08-11",
  decision: "accepted_automated_assessment" as const,
  outcome: "not_passed" as const,
  overridesApplied: 0,
  mainReason:
    "Below the floor (6.77 vs 7): JupSOL runs on Sanctum's fork of the stake-pool program — the fork's " +
    "changes are not independently audited and its deployed binary has no verified build — and all stake " +
    "is delegated to a single validator. Its fee disclosures are accurate and match the chain.",
  reopenOn: [
    "a published verified build or independent audit of the Sanctum fork's delta",
    "on-chain proof of the 11-member multisig signing model",
    "a delegation-model change away from the single Jupiter validator",
  ],
} as const;

export const JUPSOL_ASSESSMENT_LIMITATIONS = [
  "The Sanctum fork's source delta from upstream SPL stake-pool was not independently reviewed here.",
  "The 11-member multisig attestation (named members, threshold 6) was not proven on-chain.",
  "The liquidity-depth measurements are point-in-time.",
  "Incident history is a point-in-time search result, not a sourced incident review.",
] as const;

export const JUPSOL_ASSESSMENT_INVALIDATION_TRIGGERS = [
  "fork program upgrade (deploy slot changes)",
  "a published verified build or independent fork-delta audit (reopens audit_security)",
  "on-chain proof of the multisig signing model (reopens upgrade_admin_authority)",
  "pool fee configuration change (any Fee field)",
  "delegation model change away from the single Jupiter validator",
  "a material incident, exploit, or depeg",
] as const;
