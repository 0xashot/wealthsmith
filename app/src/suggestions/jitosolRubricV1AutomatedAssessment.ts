/**
 * jitosolRubricV1AutomatedAssessment — the rubric-v1 (12-dimension) automated assessment for
 * Jito JitoSOL liquid staking, upgrading the aggregate-only founder-verified beta record
 * (7.75, jitoSolBetaActivation) to the current per-dimension standard.
 *
 * RESULT: weighted aggregate 7.16 against a floor of 7 — `meetsMinimum` is TRUE on automated
 * assessment. JitoSOL runs on the SAME SPL stake-pool program whose deployed bytecode was
 * verified BIT-EXACT against the official v2.1.0 release during the bSOL assessment
 * (bsolRubricV1AutomatedAssessment → BSOL_DEEP_VERIFICATION_ROUND_2) — that primary
 * cryptographic evidence and the full audit lineage transfer directly. Where bSOL fell 0.05
 * short, JitoSOL clears the floor on real, verified differences: fee disclosures that MATCH
 * the deployed configuration, documented on-chain delegation automation (StakeNet) with
 * multiple independent keepers, an order-of-magnitude deeper measured exit market, and no
 * adverse adoption trend.
 *
 * SEPARATION OF DUTIES (risk_separation_of_duties_v2): authored under the
 * ws_automated_risk_assessor identity — scores and aggregates only; NO approval, NO
 * recommendation change. JitoSOL's live read-only recommendation continues to rest on the
 * recorded founder approval (13G); this assessment does not replace that record, it adds the
 * current-standard per-dimension basis. Numbers reach users ONLY via the Vetting-page
 * Security-score exception (riskScoreExposurePolicy → VETTING_SECURITY_SCORE_EXCEPTION).
 *
 * EVERY fact carries its source, collected 2026-08-11 (Claude, evidence preparer,
 * founder-authorized fetch): live mainnet reads via solana-rpc.publicnode.com (slot
 * ~438811858, epoch 1015), Jito official docs (jito.network, incl. the deployed-programs
 * page), the recorded 14-series Jito evidence confirmations, DefiLlama, and public
 * incident-history searches. Facts age; see JITOSOL_ASSESSMENT_INVALIDATION_TRIGGERS.
 */

export const JITOSOL_RUBRIC_V1_ASSESSMENT_VERSION = "1.0.0" as const;
export const JITOSOL_RUBRIC_V1_ASSESSMENT_ID = "jitosol_rubric_v1_automated_assessment_v1" as const;
export const JITOSOL_ASSESSMENT_APPROVES_ANYTHING = false;
export const JITOSOL_ASSESSMENT_ENABLES_TRANSACTIONS = false;

/* ---- Exact product binding. Self-validating: the decoded pool's mint and owner matched. ---- */
export const JITOSOL_ASSESSMENT_BINDING = {
  protocolId: "jito",
  product: "JitoSOL liquid staking",
  stakePoolProgram: "SPoo1Ku8WFXoNDMHPsrGSTSG1Y47rzgn41SLUNakuHy", // same verified program as bSOL
  stakePoolAccount: "Jito4APyf642JPZPx3hGc6WWJ8zPKtRbRs4P815Awbb", // decoded owner == SPoo1…, mint == J1to… (self-validating)
  jitosolMint: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
  interceptorProgram: "5TAiuAh3YGDbwjEruC1ZpXTJWdNDS7Ur7VeqNNiHMmGV", // deposit-fee mechanics; named, not fully examined
  evidenceCutoffAt: "2026-08-11T00:00:00.000Z",
  evidenceSlot: "438811858",
  evidenceEpoch: 1015,
} as const;

/* ---- Key on-chain facts (decoded directly at the cutoff). ---- */
export const JITOSOL_ONCHAIN_FACTS = {
  totalSol: 9_990_904, // ~10M SOL — the largest LST pool; cross-checks DefiLlama $768.8M
  poolTokenSupply: 7_713_017, // → exchange rate ~1.2953 SOL per JitoSOL
  lastUpdateEpoch: 1015, // equals the current epoch — actively maintained
  poolManager: "5eosrve6LktMZgVNszYzebgmmC7BjLK8NoWyRQtcmGTF", // docs: manager role held by Jito DAO, limited scope
  poolStaker: "9BAmGVLGxzqct6bkgjWmKSv3BFB6iKYXNBQp8GWG1LDY", // StakeNet delegation authority
  epochFee: { numerator: 4, denominator: 100 }, // 4% of rewards — MATCHES the documented 4% management fee
  stakeDepositFee: { numerator: 0, denominator: 0 }, // zero — matches docs
  solDepositFee: { numerator: 0, denominator: 0 }, // zero — matches docs
  stakeWithdrawalFee: { numerator: 1, denominator: 1_000 }, // 0.1% — matches docs
  solWithdrawalFee: { numerator: 1, denominator: 1_000 }, // 0.1% — matches docs
} as const;

export const JITOSOL_MARKET_FACTS = {
  tvlUsd: 768_814_408, // DefiLlama api.llama.fi/tvl/jito at the cutoff
  launched: "2022-Q4", // Jito stake pool mainnet launch (Nov 2022)
  measuredExit: "100,000 JitoSOL → SOL quoted at 0.004% price impact (~NAV, 3 routes) via Jupiter at the cutoff",
} as const;

export type JitosolAnchorBand = "unsupported" | "weak" | "partial" | "supported" | "strongly_supported";
export type JitosolConfidence = "low" | "medium" | "high";

export interface JitosolDimensionAssessment {
  dimensionId: string;
  weight: number;
  score: number;
  anchorBand: JitosolAnchorBand;
  confidence: JitosolConfidence;
  limitingFact: string;
  rationale: string;
}

/**
 * The twelve dimension scores. Anchors (riskGovernance STD_ANCHORS): unsupported 0–2,
 * weak 3–4, partial 5–6, supported 7–8, strongly_supported 9–10. Unknowns never score
 * as favourable.
 */
export const JITOSOL_DIMENSION_ASSESSMENTS: JitosolDimensionAssessment[] = [
  {
    dimensionId: "audit_security", weight: 15, score: 7, anchorBand: "supported", confidence: "high",
    limitingFact: "Same two-commit post-audit delta as the shared program (v2.1.0 vs Certora FV 2025-09-15); the Jito-specific Interceptor program's audit coverage was not established.",
    rationale: "JitoSOL runs UNMODIFIED on the SPL stake-pool program whose deployed bytecode was verified bit-exact against the official v2.1.0 release (zero-trimmed sha256 8df58bc9… both sides — primary cryptographic evidence from the bSOL round-2 pass, re-applicable because the pool account's owner is the same program). Ten audit artifacts by seven firms cover the lineage, incl. Certora formal verification (Sep 2025). Jito's own docs list the program audits. Audited lineage + verified binary identity — `supported`.",
  },
  {
    dimensionId: "maturity", weight: 8, score: 8, anchorBand: "supported", confidence: "medium",
    limitingFact: "MEV-reward attribution (the part that differentiates JitoSOL) is younger than the pool itself and its economics shift with network MEV conditions.",
    rationale: "Live since Q4 2022 (~3.7 years), continuously operating, and the LARGEST Solana LST: ~10M SOL / $768.8M at the read, actively maintained (pool updated in the current epoch). No adverse adoption trend — unlike bSOL's 87% TVL decline. Top of `supported` for a product this scale and age.",
  },
  {
    dimensionId: "upgrade_admin_authority", weight: 15, score: 6, anchorBand: "partial", confidence: "medium",
    limitingFact: "The committee/multisig control of the program upgrade key remains unproven ON-CHAIN (same gap as bSOL), and the Interceptor program's upgrade authority was not examined.",
    rationale: "Two independent official attestations now corroborate the shared program's governance: Jito's deployed-programs page states upgrade keys are 'owned by a committee of Solana Staking Ecosystem participants', matching BlazeStake's independent claim — plus the verified behaviour of deploying official releases bit-exact. Pool-level: the manager role is held by Jito DAO with documented limited scope, and custody is program-enforced. Signing model still unproven on-chain — top of `partial`.",
  },
  {
    dimensionId: "manager_discretion", weight: 12, score: 8, anchorBand: "supported", confidence: "medium",
    limitingFact: "StakeNet parameters are community-governed and keeper-executed — delegation policy can change through governance, though never in a way that reaches principal.",
    rationale: "Same structural bounds as every SPL stake pool (principal untouchable, withdrawals permissionless at NAV, fee increases epoch-delayed and hard-capped at 50bps in the verified v2.1.0 bytes) — and delegation discretion is NARROWER than a typical pool: StakeNet moves stake by on-chain, community-governed rules executed by multiple independent keepers, not an operator's private bot, with the DAO manager role explicitly limited per the recorded 14-series evidence. Top of `supported`.",
  },
  {
    dimensionId: "strategy_complexity", weight: 10, score: 7, anchorBand: "supported", confidence: "medium",
    limitingFact: "MEV-reward attribution (tip distribution), the Interceptor deposit program, and StakeNet add real moving parts beyond a plain stake pool.",
    rationale: "The custody core is the same simple, verifiable stake-pool shape — no leverage, no lending, no rehypothecation. The MEV layer routes ADDITIONAL rewards through Jito's tip-distribution infrastructure and adds operational machinery, which is exactly one notch of complexity above a plain pool like bSOL (8 → 7). Still `supported`: every component is public and its role explainable.",
  },
  {
    dimensionId: "composability_dependency", weight: 8, score: 7, anchorBand: "supported", confidence: "medium",
    limitingFact: "MEV rewards depend on Jito's tip-distribution infrastructure; a failure there degrades yield (not principal).",
    rationale: "Principal depends only on the Solana stake program, the verified SPL stake-pool program, and SPL Token — the same minimal custody path as bSOL. The extra dependencies (tip distribution, StakeNet keepers) sit on the REWARD path: their failure mode is lower yield, not loss of stake. `supported` with the reward-path caveat named.",
  },
  {
    dimensionId: "oracle_risk", weight: 8, score: 7, anchorBand: "supported", confidence: "medium",
    limitingFact: "JitoSOL's market price can trade off NAV in stressed conditions; NAV redemption is epoch-gated.",
    rationale: "No external price oracle in the custody path: the JitoSOL/SOL rate is computed on-chain from pool state (verified 1.2953 at the read). Same structurally strong posture as every SPL stake pool, with the market-discount caveat named.",
  },
  {
    dimensionId: "liquidity_withdrawal", weight: 12, score: 8, anchorBand: "supported", confidence: "medium",
    limitingFact: "The depth measurement is point-in-time; extreme redemption waves would still fall back to epoch-gated NAV redemption.",
    rationale: "Both exit paths verified strong: delayed unstake is permissionless at NAV (0.1% on-chain fee) and unfreezable, and the measured secondary market is the deepest of any LST — 100,000 JitoSOL (~$9.9M) quoted at 0.004% price impact at ~NAV across 3 routes, an order of magnitude beyond the bSOL test at a tenth of the impact. Top of `supported`.",
  },
  {
    dimensionId: "asset_stablecoin_risk", weight: 5, score: 8, anchorBand: "supported", confidence: "medium",
    limitingFact: "LST premium/discount to NAV is a bounded market exposure; no slashing on Solana today is network policy, not a guarantee.",
    rationale: "Natively staked SOL — no stablecoin peg surface, no collateral basket. NAV redemption bounds the exit discount to one epoch of waiting. Same posture as bSOL.",
  },
  {
    dimensionId: "withdrawal_fee_transparency", weight: 3, score: 7, anchorBand: "supported", confidence: "high",
    limitingFact: "The Interceptor program 'manages stake deposits with fee mechanisms' (Jito's own description) — a named fee surface this assessment did not decode.",
    rationale: "Every core fee verified ACCURATE against the deployed configuration: documented 4% management fee == on-chain epoch fee 4/100; documented 0.1% unstake fee == on-chain 1/1000 (both paths); deposits 0 == 0. This is the disclosure accuracy BlazeStake failed — Jito's docs and chain agree. Held at 7 (not 8) solely for the unexamined Interceptor fee surface.",
  },
  {
    dimensionId: "operational_dependency_risk", weight: 2, score: 6, anchorBand: "partial", confidence: "medium",
    limitingFact: "MEV attribution and StakeNet keepers are substantial off-chain-adjacent infrastructure; keeper failure degrades delegation quality and reward flow (never principal).",
    rationale: "Operationally better-documented than any peer assessed so far: StakeNet is described in the recorded evidence as on-chain decision-making with community-governed parameters and MULTIPLE independent keepers — redundancy a single-operator bot lacks. Held in `partial` because the reward path still leans on Jito-operated infrastructure whose practices aren't independently reviewed.",
  },
  {
    dimensionId: "incident_history", weight: 2, score: 5, anchorBand: "partial", confidence: "low",
    limitingFact: "Point-in-time search result, not a sourced incident review; the Dec 2023 website DDoS (mitigated in minutes, no funds affected) is the only found event.",
    rationale: "Public searches (incl. the Helius Solana-exploit history) surface NO protocol exploit or loss event for JitoSOL across ~3.7 years as the most scrutinized, largest LST. The one found event was network-level and handled transparently. Same methodology as bSOL: absence of found evidence is not a verified clean record — `partial`.",
  },
];

/* ------------------------------------------------------------------ *
 * Aggregate — same computation semantics as the other v1 assessments.
 * ------------------------------------------------------------------ */
export const JITOSOL_AGGREGATE_COMPUTATION_VERSION = "riskGovernance.aggregateRiskScore@v1" as const;

export function computeJitosolAggregate(items: JitosolDimensionAssessment[] = JITOSOL_DIMENSION_ASSESSMENTS) {
  const totalWeight = items.reduce((s, d) => s + d.weight, 0);
  const weightedPoints = items.reduce((s, d) => s + d.score * d.weight, 0);
  return { totalWeight, weightedPoints, aggregate: Math.round((weightedPoints / totalWeight) * 100) / 100 };
}

export const JITOSOL_AGGREGATE_RESULT = computeJitosolAggregate();

export const JITOSOL_ASSESSMENT_OUTCOME = {
  computationVersion: JITOSOL_AGGREGATE_COMPUTATION_VERSION,
  mandatoryBlockerResult: "none_present" as const,
  weightedPoints: 716,
  totalWeight: 100,
  aggregate: 7.16,
  minimumThreshold: 7,
  meetsMinimum: true,
  scoresAdjustedAfterSeeingAggregate: false,
  interpretation:
    "7.16 against a floor of 7 — JitoSOL MEETS the internal suitability minimum on automated assessment, the " +
    "first product to do so under rubric v1. The pass is earned on verified differences, not scale or brand: " +
    "fee disclosures that match the deployed configuration exactly (where bSOL's contradicted it), documented " +
    "on-chain delegation automation with independent keepers, the deepest measured exit market of any LST, and " +
    "the same bit-exact verified program binary. The remaining drags are honest: the committee/multisig signing " +
    "model is attested by two independent official sources but unproven on-chain (6 × w15), and the Interceptor " +
    "program is a named, unexamined surface. Consistent with the prior record: the founder-approved beta score " +
    "(7.75, aggregate-only) and this per-dimension 7.16 agree on the conclusion — above the floor. A human " +
    "review may still accept, reject, or override with a recorded rationale.",
} as const;

/**
 * HUMAN REVIEW DECISION (recorded, 2026-08-11). The authorized human product owner
 * (ws_product_owner) reviewed the assessment in conversation and ACCEPTED it as-is:
 * JitoSOL is recorded as PASSED on rubric v1 at 7.16, with zero overrides. This becomes
 * the current per-dimension basis shown on the Vetting page; the founder-verified beta
 * approval (13G, aggregate 7.75) remains on record as the original product approval.
 */
export const JITOSOL_HUMAN_REVIEW_DECISION = {
  decidedByRole: "ws_product_owner" as const,
  decidedAt: "2026-08-11",
  decision: "accepted_automated_assessment" as const,
  outcome: "passed" as const,
  overridesApplied: 0,
  mainReason:
    "Passed the current 12-dimension review at 7.16: verified official program binary, fee " +
    "disclosures that match the deployed configuration, documented on-chain delegation, and " +
    "the deepest measured exit liquidity of any LST.",
  reopenOn: [
    "any invalidation trigger firing (program upgrade, fee change, key change, incident)",
    "Interceptor program examination surfacing adverse findings",
  ],
} as const;

export const JITOSOL_ASSESSMENT_LIMITATIONS = [
  "The SPL stake-pool upgrade-authority committee/multisig is attested by Jito's and BlazeStake's official docs and by verified behaviour, but remains unproven on-chain (archive-RPC read or Foundation/Anza attestation would settle it).",
  "The Interceptor program (deposit-fee mechanics) and its upgrade authority were named but not decoded or audited-coverage-checked.",
  "The liquidity-depth measurement is point-in-time.",
  "Incident history is a point-in-time search result, not a sourced incident review.",
] as const;

export const JITOSOL_ASSESSMENT_INVALIDATION_TRIGGERS = [
  "stake-pool program upgrade (deploy slot changes — re-verify build identity)",
  "pool fee configuration change (any Fee field)",
  "manager / staker / upgrade-authority key change",
  "Interceptor program change or new audit information",
  "a material incident, exploit, or depeg",
  "StakeNet governance change materially altering delegation control",
] as const;
