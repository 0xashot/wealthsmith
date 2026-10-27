/**
 * infRubricV1AutomatedAssessment — the rubric-v1 (12-dimension) automated assessment for
 * Sanctum INF (the Infinity multi-LST pool), replacing the retired six-dimension draft score
 * (6.95) as the current assessment of record. The LAST row on the vetting board.
 *
 * RESULT: weighted aggregate 6.02 against a floor of 7 — `meetsMinimum` is FALSE. INF is the
 * most structurally LAYERED product assessed: a custom controller program (igneous-labs/S)
 * holding a manager-curated basket of OTHER protocols' LSTs — so its principal inherits the
 * program risk of every component, including products this board scored below the floor
 * (mSOL 6.34) and the unverified Sanctum fork (JupSOL's program). Verification is worse than
 * absent: a build verification was ATTEMPTED (Apr 2026, repo-linked) and the hashes DID NOT
 * MATCH the deployed bytes. The upgrade authority is the SAME key (47SND…) as Sanctum's
 * stake-pool fork — one documented-but-unproven 11-member committee controls the entire
 * Sanctum stack. Measured exit: near-NAV at 10,000 INF, no viable SOL route at 50,000.
 * Strengths are real: three audits on Infinity itself (Neodyme, OtterSec, Sec3 + a reserve
 * audit), no incident found, on-chain LST pricing with no external oracles, and genuine
 * diversification across the SOL-staking basket.
 *
 * SEPARATION OF DUTIES (risk_separation_of_duties_v2): authored under the
 * ws_automated_risk_assessor identity — scores and aggregates only; NO approval. Numbers
 * reach users ONLY via the Vetting-page Security-score exception.
 *
 * EVERY fact carries its source, collected 2026-08-11 (Claude, evidence preparer,
 * founder-authorized fetch): live mainnet reads via solana-rpc.publicnode.com (INF mint →
 * pool authority → controller program, self-validating), the OtterSec verified-build
 * registry, the published Infinity audit set (igneous-labs/sanctum-static), Sanctum docs,
 * DefiLlama, and live Jupiter quotes.
 */

export const INF_RUBRIC_V1_ASSESSMENT_VERSION = "1.0.0" as const;
export const INF_RUBRIC_V1_ASSESSMENT_ID = "inf_rubric_v1_automated_assessment_v1" as const;
export const INF_V1_ASSESSMENT_APPROVES_ANYTHING = false;
export const INF_V1_ASSESSMENT_ENABLES_TRANSACTIONS = false;

/* ---- Exact product binding. Self-validating: INF's mint authority resolves to the pool
 * PDA owned by the S-controller program. ---- */
export const INF_V1_ASSESSMENT_BINDING = {
  protocolId: "sanctum",
  product: "INF multi-LST pool (Infinity)",
  sControllerProgram: "5ocnV1qiCgaQR8Jb8xWnVbApfaygJ8tNoZfgPwsgx9kx", // igneous-labs/S
  infMint: "5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm",
  poolMintAuthority: "AYhux5gJzCoeoc1PoJ1VxwPDe22RwcvpHviLDD1oCGvW", // PDA owned by the S-controller
  upgradeAuthority: "47SND7bGKvNXrqfP1bjsLCbwTgZhFBzAgmZ42QSkRScz", // SAME key as the Sanctum stake-pool fork — one committee, whole stack
  evidenceCutoffAt: "2026-08-11T00:00:00.000Z",
} as const;

export const INF_V1_ONCHAIN_FACTS = {
  infSupply: 1_415_423, // decoded from the mint
  lastDeploySlot: 411_884_877, // ~124 days before the cutoff (~2026-04-09)
  upgradeable: true,
  verifiedBuild: {
    registryHasRecord: true, // repo igneous-labs/S @ 4e35462, attempt recorded 2026-04-24
    currentlyVerified: false,
    hashMismatchOnAttempt: true, // on-chain hash ≠ executable hash — the attempt failed to reproduce the deployed bytes
  },
} as const;

export const INF_V1_MARKET_FACTS = {
  tvlUsd: 156_327_157, // DefiLlama api.llama.fi/tvl/sanctum-infinity at the cutoff
  sanctumTotalTvlUsd: 1_329_079_074, // the wider Sanctum LST infrastructure
  launched: "2024-Q1", // Infinity live ~2.5 years
  measuredExit: "10,000 INF quoted at rate 1.439 (~NAV, 0.002% impact); 50,000 found NO viable SOL route (rate 0.634) via Jupiter at the cutoff",
  auditSet: "Infinity audits: Neodyme (INV-24-01), OtterSec, Sec3 (Sanctum S final report) + Sec3 reserve-pool audit (igneous-labs/sanctum-static)",
} as const;

export type InfV1AnchorBand = "unsupported" | "weak" | "partial" | "supported" | "strongly_supported";
export type InfV1Confidence = "low" | "medium" | "high";

export interface InfV1DimensionAssessment {
  dimensionId: string;
  weight: number;
  score: number;
  anchorBand: InfV1AnchorBand;
  confidence: InfV1Confidence;
  limitingFact: string;
  rationale: string;
}

/**
 * The twelve dimension scores. Anchors (riskGovernance STD_ANCHORS): unsupported 0–2,
 * weak 3–4, partial 5–6, supported 7–8, strongly_supported 9–10. Unknowns never score
 * as favourable.
 */
export const INF_V1_DIMENSION_ASSESSMENTS: InfV1DimensionAssessment[] = [
  {
    dimensionId: "audit_security", weight: 15, score: 6, anchorBand: "partial", confidence: "medium",
    limitingFact: "A build verification was ATTEMPTED against the public repo (Apr 2026) and the hashes did not match the deployed bytes — the deployed binary cannot currently be related to audited source.",
    rationale: "Infinity itself carries three audits plus a reserve-pool audit (Neodyme, OtterSec, Sec3) on a public custom codebase — a genuine audit posture for a young product. But the failed verification attempt leaves the exact deployed bytes unrelatable to that audited source, a named and confirmed gap. `partial`.",
  },
  {
    dimensionId: "maturity", weight: 8, score: 7, anchorBand: "supported", confidence: "medium",
    limitingFact: "~2.5 years live — young for the layered surface it carries; the binary is ~4 months old.",
    rationale: "Live since early 2024 with $156.3M in the pool, inside the wider $1.33B Sanctum LST infrastructure, actively maintained. `supported`.",
  },
  {
    dimensionId: "upgrade_admin_authority", weight: 15, score: 6, anchorBand: "partial", confidence: "medium",
    limitingFact: "The upgrade authority is the SAME key as Sanctum's stake-pool fork — the documented 11-member / threshold-6 committee controls the entire Sanctum stack, and its signing model remains unproven on-chain.",
    rationale: "The attestation is the strongest class on the board (named members, threshold, repeated across Sanctum and Jupiter docs), and the shared-key discovery is at least consistent with committee custody of the whole stack. But concentration is real — one unproven authority over every Sanctum program — and proof is still absent. Top of `partial`.",
  },
  {
    dimensionId: "manager_discretion", weight: 12, score: 6, anchorBand: "partial", confidence: "medium",
    limitingFact: "Sanctum curates the LST whitelist, weights, and pricing/fee parameters of the basket — holders cannot veto composition changes that alter what their INF is backed by.",
    rationale: "Principal cannot be seized (program custody, permissionless swap-out), but WHAT the basket holds is managed discretion of a kind no plain stake pool has: the manager decides which third-party LSTs back the token. `partial`.",
  },
  {
    dimensionId: "strategy_complexity", weight: 10, score: 5, anchorBand: "partial", confidence: "medium",
    limitingFact: "A custom controller + per-LST on-chain value-calculator programs + fee modules + a reserve pool, over a many-component basket — among the most intricate custom systems assessed.",
    rationale: "Every calculator and module is a real surface, and correctness depends on pricing every constituent LST correctly on-chain. Comparable surface to Meteora's family. `partial`.",
  },
  {
    dimensionId: "composability_dependency", weight: 8, score: 5, anchorBand: "partial", confidence: "high",
    limitingFact: "INF's principal IS other protocols' tokens: the basket inherits the program risk of every component LST — including products this board scored below the floor (mSOL 6.34) and pools on the unverified Sanctum fork.",
    rationale: "The deepest external dependency on the board by construction. Diversification softens single-component failure, but a component exploit is a direct loss to the basket. `partial`.",
  },
  {
    dimensionId: "oracle_risk", weight: 8, score: 7, anchorBand: "supported", confidence: "medium",
    limitingFact: "Per-LST pricing is computed by Sanctum's own calculator programs — on-chain and stateless, but custom code rather than a battle-tested shared standard.",
    rationale: "No external price oracle in the custody path: each LST is valued from its own stake-pool state on-chain. The strongest oracle posture available to a basket product. `supported`.",
  },
  {
    dimensionId: "liquidity_withdrawal", weight: 12, score: 6, anchorBand: "partial", confidence: "medium",
    limitingFact: "Measured SOL-exit depth collapses at size (near-NAV at 10,000 INF; no viable route at 50,000), and the native swap-out path delivers constituent LSTs — which are themselves epoch-gated to reach SOL at NAV.",
    rationale: "The pool's native exit (swap INF into any held LST) is instant and permissionless — a real structural guarantee — but it exits into another token with its own exit profile, and the aggregate route to SOL inherits component depth, including mSOL's weakness. `partial`.",
  },
  {
    dimensionId: "asset_stablecoin_risk", weight: 5, score: 7, anchorBand: "supported", confidence: "medium",
    limitingFact: "The basket's value tracks SOL staking with LST premium/discount risk on every component; discount events in any large component mark the whole basket.",
    rationale: "Diversified natively-staked SOL — no stablecoin peg, no volatile-pair impermanent loss (components are SOL-correlated), and diversification across many LSTs genuinely reduces single-token discount exposure. `supported`.",
  },
  {
    dimensionId: "withdrawal_fee_transparency", weight: 3, score: 7, anchorBand: "supported", confidence: "medium",
    limitingFact: "Fees are per-swap and parameterized; disclosed in Sanctum's docs, but the pool's live fee parameters were not decoded in this pass.",
    rationale: "Sanctum's fee documentation has verified accurate everywhere this board has checked it against the chain (the JupSOL pass), and no contradiction was found for Infinity. `supported`.",
  },
  {
    dimensionId: "operational_dependency_risk", weight: 2, score: 5, anchorBand: "partial", confidence: "medium",
    limitingFact: "Whitelist curation, pricing modules, and rebalancing are operated by Sanctum, whose operational practices are documented only at a high level.",
    rationale: "A competent multi-product operator with no adverse events found, running the largest LST infrastructure on Solana — held at `partial` by the documentation gap, as for its peers.",
  },
  {
    dimensionId: "incident_history", weight: 2, score: 5, anchorBand: "partial", confidence: "low",
    limitingFact: "Point-in-time search result, not a sourced incident review.",
    rationale: "No exploit, loss event, or litigation found for Infinity or Sanctum's infrastructure across ~2.5 years ('no exploits found' across $4B+ secured, per its docs; nothing in public exploit histories). Same standard as every peer. `partial`.",
  },
];

/* ------------------------------------------------------------------ *
 * Aggregate — same computation semantics as the other v1 assessments.
 * ------------------------------------------------------------------ */
export const INF_V1_AGGREGATE_COMPUTATION_VERSION = "riskGovernance.aggregateRiskScore@v1" as const;

export function computeInfV1Aggregate(items: InfV1DimensionAssessment[] = INF_V1_DIMENSION_ASSESSMENTS) {
  const totalWeight = items.reduce((s, d) => s + d.weight, 0);
  const weightedPoints = items.reduce((s, d) => s + d.score * d.weight, 0);
  return { totalWeight, weightedPoints, aggregate: Math.round((weightedPoints / totalWeight) * 100) / 100 };
}

export const INF_V1_AGGREGATE_RESULT = computeInfV1Aggregate();

export const INF_V1_ASSESSMENT_OUTCOME = {
  computationVersion: INF_V1_AGGREGATE_COMPUTATION_VERSION,
  mandatoryBlockerResult: "none_present" as const,
  weightedPoints: 602,
  totalWeight: 100,
  aggregate: 6.02,
  minimumThreshold: 7,
  meetsMinimum: false,
  scoresAdjustedAfterSeeingAggregate: false,
  interpretation:
    "6.02 against a floor of 7 — INF does NOT meet the internal suitability minimum. The shortfall is " +
    "LAYERING: a custom, currently-unverifiable controller (audit_security 6 × w15, with a FAILED verification " +
    "attempt) holding a manager-curated basket whose principal inherits every component's program risk " +
    "(composability 5 × w8) — including products this board itself scored below the floor — priced through " +
    "custom calculator modules (complexity 5 × w10), with SOL-exit depth that collapses at size (liquidity " +
    "6 × w12) and one unproven committee key controlling the entire stack (admin 6 × w15). Its real strengths " +
    "— audits on Infinity itself, on-chain pricing, genuine diversification, a clean record — are reflected " +
    "where evidence supports them. The retired draft score (6.95) predates the basket-inheritance analysis and " +
    "the failed build verification. A human reviewer may accept, reject, or override with a recorded rationale.",
} as const;

/**
 * Sensitivity: a SUCCESSFUL build verification plus on-chain multisig proof would add ~0.30
 * (→ ~6.32). The remaining distance is the basket's construction: component inheritance and
 * layered complexity re-score only if the components themselves clear the floor — which
 * makes INF structurally downstream of this board's own verdicts on mSOL, JupSOL, and the
 * Sanctum fork.
 */
export const INF_V1_SENSITIVITY_NOTE = "basket_inherits_component_verdicts" as const;

/**
 * HUMAN REVIEW DECISION (recorded, 2026-08-11). The authorized human product owner
 * (ws_product_owner) reviewed the assessment in conversation and ACCEPTED it as-is:
 * INF is recorded as NOT PASSED at 6.02, with zero overrides — the final verdict on
 * the vetting board. The record is explicit that INF is structurally downstream of the
 * board's own component verdicts: a basket cannot reasonably clear the floor while what
 * it holds does not.
 */
export const INF_V1_HUMAN_REVIEW_DECISION = {
  decidedByRole: "ws_product_owner" as const,
  decidedAt: "2026-08-11",
  decision: "accepted_automated_assessment" as const,
  outcome: "not_passed" as const,
  overridesApplied: 0,
  mainReason:
    "Below the floor (6.02 vs 7): a build-verification attempt failed to reproduce the deployed controller, " +
    "the basket's principal inherits the program risk of component LSTs this board itself scored below the " +
    "floor, one documented-but-unproven committee key controls the entire Sanctum stack, and SOL-exit depth " +
    "collapses at size. Infinity's own audits, on-chain pricing, and diversification are recorded strengths.",
  reopenOn: [
    "a successful build verification of the deployed S-controller",
    "on-chain proof of the shared Sanctum committee's signing model",
    "component LSTs of the basket clearing this board's floor",
  ],
} as const;

export const INF_V1_ASSESSMENT_LIMITATIONS = [
  "The pool's live fee and whitelist parameters were not decoded in this pass; fee accuracy rests on Sanctum's verified-elsewhere disclosure record.",
  "The basket's current composition and weights were not enumerated on-chain; component inheritance was assessed structurally.",
  "The hash-mismatch on the verification attempt may reflect toolchain nondeterminism rather than divergent source — indistinguishable from here.",
  "Incident history is a point-in-time search result, not a sourced incident review.",
] as const;

export const INF_V1_ASSESSMENT_INVALIDATION_TRIGGERS = [
  "S-controller program upgrade (deploy slot changes)",
  "a SUCCESSFUL build verification of the deployed controller (reopens audit_security)",
  "on-chain proof of the shared Sanctum committee's signing model (reopens upgrade_admin_authority)",
  "material changes to the basket's composition or a component-LST incident",
  "a component of the basket clearing this board's floor (reopens composability_dependency)",
  "a material incident, exploit, or depeg",
] as const;
