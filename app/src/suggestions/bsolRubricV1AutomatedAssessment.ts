/**
 * bsolRubricV1AutomatedAssessment — the rubric-v1 (12-dimension) automated assessment for
 * BlazeStake bSOL liquid staking, replacing the retired six-dimension draft score (7.35,
 * solLiquidStakingBsolRiskScore) as the current assessment of record.
 *
 * RESULT (after the round-2 deep-verification pass): weighted aggregate 6.95 against a floor
 * of 7 — `meetsMinimum` is FALSE, by 0.05. Round 2 closed the build-linkage gap outright
 * (the deployed bytecode is BIT-EXACT the official v2.1.0 release — verified directly) and
 * measured deep at-NAV exit liquidity, raising four dimensions on evidence. What now holds
 * the score under the floor: the fee-disclosure contradiction (docs 0% vs deployed 5% of
 * rewards), the unproven multisig signing model, and undocumented operator practices. See
 * BSOL_DEEP_VERIFICATION_RECORD; unknowns are never scored as favourable.
 *
 * SEPARATION OF DUTIES (risk_separation_of_duties_v2): authored under the
 * ws_automated_risk_assessor identity, which may score and aggregate but may NOT review, sign
 * off, or approve. This module assigns NO approval and changes NO recommendation. The numeric
 * score reaches users ONLY via the Vetting-page Security-score exception
 * (riskScoreExposurePolicy → VETTING_SECURITY_SCORE_EXCEPTION).
 *
 * EVERY fact below carries its source and was collected 2026-08-11 (Claude, evidence preparer,
 * founder-authorized fetch): live mainnet reads via solana-rpc.publicnode.com (slot ~438645172,
 * epoch 1015), BlazeStake official docs (stake-docs.solblaze.org), DefiLlama, the SPL
 * stake-pool audit registry, and public incident-history searches. Facts age; see
 * BSOL_ASSESSMENT_INVALIDATION_TRIGGERS.
 */

export const BSOL_RUBRIC_V1_ASSESSMENT_VERSION = "1.0.0" as const;
export const BSOL_RUBRIC_V1_ASSESSMENT_ID = "bsol_rubric_v1_automated_assessment_v1" as const;
export const BSOL_ASSESSMENT_APPROVES_ANYTHING = false;
export const BSOL_ASSESSMENT_ENABLES_TRANSACTIONS = false;

/* ---- Exact product binding. Every artifact below is bound to THIS pool only. ---- */
export const BSOL_ASSESSMENT_BINDING = {
  protocolId: "blazestake",
  product: "bSOL liquid staking",
  stakePoolProgram: "SPoo1Ku8WFXoNDMHPsrGSTSG1Y47rzgn41SLUNakuHy",
  programDataAccount: "EmiU8AQkB2sswTxVB6aCmsAJftoowZGGDXuytm6X65R3",
  stakePoolAccount: "stk9ApL5HeVAwPLr3TLhDXdZS8ptVu7zp6ov8HFDuMi",
  bsolMint: "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1",
  evidenceCutoffAt: "2026-08-11T00:00:00.000Z",
  evidenceSlot: "438645172",
  evidenceEpoch: 1015,
} as const;

/* ---- Key on-chain facts (read directly at the cutoff; lamports/base64 decoded). ---- */
export const BSOL_ONCHAIN_FACTS = {
  totalLamportsSol: 920_344.68, // pool total; cross-checks DefiLlama $68.8M TVL
  poolTokenSupply: 702_671.2, // → exchange rate ~1.3098 SOL per bSOL
  lastUpdateEpoch: 1015, // equals the current epoch — pool actively maintained
  programLastDeploySlot: 429_882_117, // ~40.6 days before the cutoff (~2026-07-01)
  programUpgradeAuthority: "dPpFfahSWhm5M2RB3nVaHsXfnh9ooz5bWtR3WeUguDH", // system-owned; control model unverifiable from owner alone
  poolManager: "b1azeTfpBiKN6AhEGVd1iPBsX3vmZqnFmS7Kqau7a2w", // system-owned; single-key vs multisig-vault indistinguishable on-chain
  poolStaker: "rebaAg2Q1tjxWXgU1JAJ6XyfZ7CLJEUUFk5P35uZvmC", // delegation authority (off-chain bot)
  epochFee: { numerator: 500, denominator: 10_000 }, // 5% of epoch rewards — CONTRADICTS docs' "Epoch fee: 0%"
  solDepositFee: { numerator: 8, denominator: 10_000 }, // 0.08%; sol_referral_fee 100% (fee routes to referrer)
  stakeDepositFee: { numerator: 10, denominator: 10_000 }, // 0.1%
  solWithdrawalFee: { numerator: 10, denominator: 10_000 }, // 0.1% — matches docs
  stakeWithdrawalFee: { numerator: 10, denominator: 10_000 }, // 0.1% — matches docs
} as const;

export const BSOL_MARKET_FACTS = {
  tvlUsd: 68_828_900, // DefiLlama api.llama.fi/tvl/blazestake at the cutoff
  tvlPeakUsd: 519_000_000, // Apr 2024 peak; ~87% decline since
  baseApyPct: 6.01, // stake.solblaze.org/api/v1/apy at the cutoff
  launched: "2022-Q2", // own docs roadmap (mainnet-beta launch)
} as const;

export type BsolAnchorBand = "unsupported" | "weak" | "partial" | "supported" | "strongly_supported";
export type BsolConfidence = "low" | "medium" | "high";

export interface BsolDimensionAssessment {
  dimensionId: string;
  weight: number;
  score: number;
  anchorBand: BsolAnchorBand;
  confidence: BsolConfidence;
  limitingFact: string;
  rationale: string;
}

/**
 * The twelve dimension scores. Anchors (riskGovernance STD_ANCHORS): unsupported 0–2,
 * weak 3–4, partial 5–6, supported 7–8, strongly_supported 9–10. Unknowns never score
 * as favourable.
 */
export const BSOL_DIMENSION_ASSESSMENTS: BsolDimensionAssessment[] = [
  {
    // RE-SCORED 6 → 7 in the round-2 deep-verification pass: the deployed bytecode was
    // verified BIT-EXACT against the official v2.1.0 release (zero-trimmed sha256
    // 8df58bc9… on both sides, and a direct bytewise comparison) — the linkage gap that
    // held this at `partial` is closed by primary cryptographic evidence.
    dimensionId: "audit_security", weight: 15, score: 7, anchorBand: "supported", confidence: "high",
    limitingFact: "The deployed release (v2.1.0) contains exactly two public commits newer than the newest audit artifact (Certora formal verification, 2025-09-15) — a fee-update-check fix and a 50bps cap on withdrawal-fee increases; both are small, public, and security-hardening, but formally post-audit.",
    rationale: "The SPL stake-pool program carries ten audit artifacts by seven independent firms (Kudelski Jul 2021; Quantstamp Oct 2021 + re-review; Neodyme ×4, 2021–2023; Halborn Jan + Dec 2023; OtterSec Jan 2023; Certora formal verification Sep 2025), and the DEPLOYED binary is now cryptographically related to that lineage: its zero-trimmed sha256 equals the official v2.1.0 release hash and the bytes match the published release artifact exactly. Audited lineage + verified binary identity + a named two-commit post-audit delta — `supported`.",
  },
  {
    dimensionId: "maturity", weight: 8, score: 7, anchorBand: "supported", confidence: "medium",
    limitingFact: "TVL has declined ~87% from its Apr 2024 peak ($519M → $68.8M), which reduces the economic weight of the live track record going forward.",
    rationale: "Live on mainnet-beta since Q2 2022 (own docs roadmap) — over four years holding funds — and the pool is actively maintained: last_update_epoch equals the current epoch (1015) at the read. Continuous operation is corroborated on-chain (920,345 SOL, exchange rate 1.3098 accreted over years). The TVL decline is an adoption trend, not a maturity failure, but it is recorded.",
  },
  {
    // RE-SCORED 5 → 6 in round 2: what the authority DID is now verified — the Jul 2026
    // upgrade deployed the official Anza release, bit-exact, within days of its urgent
    // fee-hardening publication. The signing control model itself remains unproven.
    dimensionId: "upgrade_admin_authority", weight: 15, score: 6, anchorBand: "partial", confidence: "medium",
    limitingFact: "The claimed 'ecosystem multisig overseen by the Solana Foundation' signing model remains unproven: no public attestation indexes the authority address, and the upgrade transaction (which would reveal multisig CPI signing) sits in a block pruned from every reachable public RPC.",
    rationale: "The stake-pool program IS upgradeable, but the authority's observed behaviour is now verified favourable: the ~2026-07 upgrade deployed the OFFICIAL v2.1.0 release bit-exact (an urgent fix capping withdrawal-fee increases), promptly and without deviation — exactly what the claimed governance process would do. Structural mitigations stand: custody is program-enforced (neither manager nor staker can withdraw user stake) and fee increases are epoch-delayed and now program-capped. Behavioural evidence verified, signing model still unproven — top of `partial`.",
  },
  {
    // RE-SCORED 7 → 8 in round 2: the verified deployed v2.1.0 code adds a program-level
    // 50bps cap on withdrawal-fee increases — manager fee discretion is now doubly
    // bounded (epoch delay + hard cap), verified in the exact bytes running on mainnet.
    dimensionId: "manager_discretion", weight: 12, score: 8, anchorBand: "supported", confidence: "medium",
    limitingFact: "The staker key directs delegation among validators at its discretion (off-chain scoring bot); users must actively use Custom Liquid Staking to override it.",
    rationale: "The SPL stake-pool design structurally bounds discretion: user stake sits in program-controlled stake accounts, withdrawals are permissionless at NAV, and the manager cannot seize funds — corroborated by program semantics, not just docs. Fee discretion is epoch-delayed AND, in the verified deployed v2.1.0, hard-capped at 50bps per withdrawal-fee increase. Delegation targeting remains discretionary but user-overridable (CLS) and cannot reach principal — top of `supported`.",
  },
  {
    dimensionId: "strategy_complexity", weight: 10, score: 8, anchorBand: "supported", confidence: "medium",
    limitingFact: "Instant unstake adds a reserve-liquidity mechanism on top of the base pool; the off-chain delegation scorer is an extra moving part.",
    rationale: "Native SOL staking through a single, standard, unmodified program — no leverage, no lending, no rehypothecation, no external protocol legs. The strategy is the simplest yield shape on Solana after a plain stake account: delegate, accrue, redeem at NAV. Verifiable directly from the pool account state.",
  },
  {
    dimensionId: "composability_dependency", weight: 8, score: 7, anchorBand: "supported", confidence: "medium",
    limitingFact: "Delegation quality depends on off-chain data feeds (validators.app, stakewiz) and the SolBlaze scoring bot; instant exit depends on reserve liquidity.",
    rationale: "Principal depends only on the Solana stake program (native), the SPL stake-pool program, and SPL Token — no external DeFi protocol in the custody path. The dependency surface for user funds is close to the theoretical minimum for an LST.",
  },
  {
    dimensionId: "oracle_risk", weight: 8, score: 7, anchorBand: "supported", confidence: "medium",
    limitingFact: "bSOL's MARKET price can trade at a discount to NAV in stressed liquidity; redemption at NAV is epoch-gated, so the discount is bounded but not instantly arbitrageable.",
    rationale: "The core product uses NO external price oracle: the bSOL/SOL rate is computed on-chain from pool state (total lamports / token supply, read directly at 1.3098). There is no feed to go stale or be manipulated in the custody path — the strongest possible oracle posture, with the market-discount caveat named.",
  },
  {
    // RE-SCORED 6 → 7 in round 2: the secondary-market exit was MEASURED — a live Jupiter
    // quote for 10,000 bSOL (~1.4% of the whole pool) filled at 0.02% price impact,
    // essentially at NAV, across 3 routes. The unmeasured-gap that held this at
    // `partial` is closed; the measurement is point-in-time.
    dimensionId: "liquidity_withdrawal", weight: 12, score: 7, anchorBand: "supported", confidence: "medium",
    limitingFact: "The DEX-depth measurement (10k bSOL at 0.02% impact) is point-in-time; the pool-reserve instant-unstake path remains 'limited' by the protocol's own admission, and depth can change faster than any assessment.",
    rationale: "Two verified exit paths: delayed unstake is permissionless, always available at NAV (0.1% fee, on-chain verified) and cannot be frozen — the structural guarantee — and the secondary market now measures deep: 10,000 bSOL quoted to SOL at 0.02% price impact at ~NAV (1.3082 vs 1.3098 on-chain). Guaranteed exit plus measured instant depth — `supported`.",
  },
  {
    dimensionId: "asset_stablecoin_risk", weight: 5, score: 8, anchorBand: "supported", confidence: "medium",
    limitingFact: "LST premium/discount to NAV is a real, if bounded, market exposure; Solana has no slashing today, but that is a network policy, not a guarantee.",
    rationale: "The underlying asset is natively staked SOL — no stablecoin peg surface, no collateral basket, no counterparty token. NAV redemption bounds the discount an exiting holder can be forced to accept to one epoch of waiting.",
  },
  {
    dimensionId: "withdrawal_fee_transparency", weight: 3, score: 4, anchorBand: "weak", confidence: "high",
    limitingFact: "The docs' fee page states 'Epoch fee: 0%' while the ON-CHAIN pool config charges 500/10000 = 5% of epoch rewards; the docs also say 'Deposit fee: 0%' while the chain sets a 0.08% SOL deposit fee (routed 100% to referrers).",
    rationale: "Withdrawal fees (0.1% instant and delayed) match the docs exactly, and every fee is on-chain readable — but this dimension grades DISCLOSED fee accuracy, and the documented epoch fee materially contradicts the deployed configuration. A user reading the official docs would believe rewards are unskimmed; the chain says 5% of rewards are taken. Both sources were read directly, so confidence in the finding is high — and the finding is `weak`.",
  },
  {
    dimensionId: "operational_dependency_risk", weight: 2, score: 5, anchorBand: "partial", confidence: "low",
    limitingFact: "Validator selection depends on an off-chain scoring bot holding the staker key; its operational practices, redundancy, and key custody are undocumented.",
    rationale: "The pool state updates on schedule (current epoch at the read), and a stalled operator cannot trap principal — delayed unstake still works. But delegation quality and instant-unstake reserve management are operator-dependent, and nothing about the operator's practices could be established from primary sources.",
  },
  {
    dimensionId: "incident_history", weight: 2, score: 5, anchorBand: "partial", confidence: "low",
    limitingFact: "This is a point-in-time SEARCH RESULT, not a verified clean record: no formal incident review for BlazeStake exists in any source found.",
    rationale: "Public incident-history searches (including the Helius 'Complete History' of Solana exploits and general queries) surface NO BlazeStake or bSOL exploit, halt, or depeg event across ~4.2 years of operation — meaningfully better evidence than a young product could show. Held at `partial` because absence of found evidence is not evidence of absence, and no sourced incident review exists.",
  },
];

/* ------------------------------------------------------------------ *
 * Aggregate — same computation semantics as the Steakhouse / K-Lend
 * assessments (weighted points / 100 total weight, no rounding up).
 * ------------------------------------------------------------------ */
export const BSOL_AGGREGATE_COMPUTATION_VERSION = "riskGovernance.aggregateRiskScore@v1" as const;

export function computeBsolAggregate(items: BsolDimensionAssessment[] = BSOL_DIMENSION_ASSESSMENTS) {
  const totalWeight = items.reduce((s, d) => s + d.weight, 0);
  const weightedPoints = items.reduce((s, d) => s + d.score * d.weight, 0);
  return { totalWeight, weightedPoints, aggregate: Math.round((weightedPoints / totalWeight) * 100) / 100 };
}

export const BSOL_AGGREGATE_RESULT = computeBsolAggregate();

export const BSOL_ASSESSMENT_OUTCOME = {
  computationVersion: BSOL_AGGREGATE_COMPUTATION_VERSION,
  mandatoryBlockerResult: "none_present" as const,
  weightedPoints: 695,
  totalWeight: 100,
  aggregate: 6.95,
  minimumThreshold: 7,
  meetsMinimum: false,
  scoresAdjustedAfterSeeingAggregate: false,
  interpretation:
    "6.95 against a floor of 7 — bSOL misses the internal suitability minimum by 0.05 after the round-2 " +
    "verification pass. Every re-score was evidence-driven, not target-driven: build identity verified bit-exact " +
    "(audit_security 6→7), authority behaviour verified (upgrade_admin_authority 5→6), fee discretion verified " +
    "program-capped (manager_discretion 7→8), exit depth measured (liquidity_withdrawal 6→7). What remains is " +
    "genuinely unresolved or adverse: the docs' '0% epoch fee' contradicting the deployed 5%-of-rewards config " +
    "(4 × w3), the unproven multisig signing model (6 × w15), undocumented operator practices (5 × w2), and an " +
    "unreviewed incident history (5 × w2). The floor is a floor: 6.95 does not clear it, and no dimension will be " +
    "nudged to make it. This is a recommendation of the evidence, not a verdict: a human reviewer may accept, " +
    "reject, or override individual dimensions with a recorded rationale.",
} as const;

/**
 * Sensitivity after round 2: the remaining 0.05 gap closes if EITHER (a) the multisig signing
 * model is proven (archive-RPC read of the upgrade transaction, or a Foundation/Anza
 * attestation), plausibly moving upgrade_admin_authority 6→7 (+0.15), or (b) BlazeStake
 * corrects its fee documentation, resolving the one adverse finding (transparency 4→6, +0.06,
 * with (a) or ops documentation still needed). Neither is proven today, and unknowns never
 * score as favourable.
 */
export const BSOL_SENSITIVITY_NOTE = "within_0_05_of_floor_pending_multisig_proof_or_docs_fix" as const;

/**
 * DEEP-VERIFICATION PASS (2026-08-11, product-owner directed) — the two w15 gaps were
 * probed against every primary source reachable from the assessment environment. Outcomes:
 */
export const BSOL_DEEP_VERIFICATION_RECORD = {
  directedBy: "ws_product_owner" as const,
  performedAt: "2026-08-11",
  probes: [
    {
      target: "verified build linkage (audit_security)",
      method: "OtterSec verified-build registry (verify.osec.io/status/SPoo1Ku…)",
      outcome: "CONFIRMED ABSENT — `is_verified: false`, no repo/commit/hash on record. The gap is a verified fact, not an unchecked box.",
    },
    {
      target: "newer audits (audit_security)",
      method: "anza-xyz/security-audits registry listing",
      outcome: "FOUND — Halborn 2023-12-31 and Certora formal verification 2025-09-15 extend the trail ~10 months past the docs' own audit list. Dimension rationale amended; score unchanged (linkage still absent).",
    },
    {
      target: "upgrade-authority multisig claim (upgrade_admin_authority)",
      method: "public attestation search for dPpF…uDH + attempt to read the Jul 2026 upgrade transaction (would reveal Squads CPI signing)",
      outcome: "UNRESOLVED — no public attestation indexes the address, and the deploy-slot block (429882117) is pruned from reachable public RPC nodes; archive endpoints were unreachable from this environment. Provable with archive RPC access or a Foundation/Anza attestation.",
    },
  ],
  aggregateChanged: false, // round 1: 6.41 stood; no unknown was resolved either way
} as const;

/**
 * ROUND 2 (same day, product-owner directed "dig deeper") — primary cryptographic and market
 * verification that RESOLVED two of the three round-1 gaps:
 */
export const BSOL_DEEP_VERIFICATION_ROUND_2 = {
  performedAt: "2026-08-11",
  probes: [
    {
      target: "deployed bytecode ↔ audited release (audit_security)",
      method: "downloaded the official solana-program/stake-pool program@v2.1.0 release artifact; dumped the on-chain ProgramData ELF; zero-trimmed sha256 both sides and compared bytes directly",
      outcome: "VERIFIED — both hash to 8df58bc9f9428c02bf34fa845ae2961274156e7ff07a8dc1be0018dd765baeff (the release's own published expected hash) and the byte sequences are identical. The deployed program IS the official v2.1.0 release. Re-scored audit_security 6→7 (high confidence).",
    },
    {
      target: "release provenance + authority behaviour (upgrade_admin_authority, manager_discretion)",
      method: "release-history read of solana-program/stake-pool",
      outcome: "v2.1.0 (published 2026-07-09) is an urgent fee-hardening release — fixes the fee-update check and caps withdrawal-fee increases at 50bps — and the authority deployed it bit-exact in that window. Re-scored upgrade_admin_authority 5→6 (behaviour verified; signing model still unproven) and manager_discretion 7→8 (fee cap verified in deployed bytes).",
    },
    {
      target: "secondary-market exit depth (liquidity_withdrawal)",
      method: "live Jupiter quote, 1,000 and 10,000 bSOL → SOL",
      outcome: "MEASURED — 10,000 bSOL (~1.4% of the pool) fills at 0.02% price impact at ~NAV (1.3082 vs 1.3098 on-chain) across 3 routes. Re-scored liquidity_withdrawal 6→7 (point-in-time).",
    },
  ],
  aggregateChanged: true, // 6.41 → 6.95; meetsMinimum remains false
} as const;

/**
 * HUMAN REVIEW DECISION (recorded, 2026-08-11). The authorized human product owner
 * (ws_product_owner) reviewed the round-2 assessment in conversation and ACCEPTED it as-is:
 * bSOL is recorded as NOT PASSED — the floor is a floor, and 6.95 does not clear it. No
 * dimension was overridden. The decision is re-reviewable on the triggers below; the two
 * named paths (multisig proof, fee-docs correction) remain open.
 */
export const BSOL_HUMAN_REVIEW_DECISION = {
  decidedByRole: "ws_product_owner" as const,
  decidedAt: "2026-08-11",
  decision: "accepted_automated_assessment" as const,
  outcome: "not_passed" as const,
  overridesApplied: 0,
  mainReason:
    "Missed the floor by 0.05 (6.95 vs 7). The two open items: the program upgrade authority's " +
    "claimed multisig control could not be verified, and the official docs state a 0% epoch fee " +
    "while the deployed configuration charges 5% of staking rewards.",
  reopenOn: [
    "proof of the upgrade-authority multisig (archive-RPC read of the upgrade transaction, or a Foundation/Anza attestation)",
    "corrected BlazeStake fee documentation",
    "operator-practice documentation or a sourced incident review",
  ],
} as const;

export const BSOL_ASSESSMENT_LIMITATIONS = [
  "The upgrade-authority and pool-manager SIGNING models rest on documentation claims; verifying them needs an archive-RPC read of the upgrade transaction or a Foundation/Anza attestation.",
  "The liquidity-depth measurement (10k bSOL at 0.02% impact) is point-in-time and can change faster than any assessment.",
  "Incident history is a point-in-time search result, not a sourced incident review.",
  "Operator (SolBlaze) key custody, redundancy, and delegation-bot practices remain undocumented.",
] as const;

export const BSOL_ASSESSMENT_INVALIDATION_TRIGGERS = [
  "stake-pool program upgrade (deploy slot changes)",
  "pool fee configuration change (any Fee field)",
  "manager / staker / upgrade-authority key change",
  "a new audit, or a verified build linking the deployed bytecode to an audited release",
  "a material incident, exploit, or depeg",
  "docs fee page correction (resolves the transparency contradiction)",
] as const;
