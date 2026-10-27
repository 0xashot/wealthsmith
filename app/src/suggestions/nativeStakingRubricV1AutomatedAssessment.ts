/**
 * nativeStakingRubricV1AutomatedAssessment — the rubric-v1 (12-dimension) automated
 * assessment for Solana native validator staking (the Jupiter-validator baseline),
 * replacing the retired six-dimension draft score (7.10, 14T-approved) as the current
 * assessment of record. The LAST draft-rubric migration — every row is now on v1.
 *
 * RESULT: weighted aggregate 8.19 against a floor of 7 — `meetsMinimum` is TRUE, by the
 * widest margin the board has produced. The reason is structural, and it is the rubric
 * working as designed: native staking is the base primitive every other product wraps.
 * There is NO upgradeable program (the stake program is native runtime code, changed only
 * by feature gates adopted by stake-weighted validator supermajority), NO admin key that
 * can reach stake accounts (the user's own stake/withdraw authorities control everything),
 * NO manager, NO wrapper token, NO exchange rate, NO pricing surface, and NO fee of any
 * kind — the single lever anyone else holds is the validator's commission (5%, verified
 * live on-chain, matching the recorded 14T evidence). The named limitations are real and
 * priced: exits wait for an epoch boundary (~2 days, at full value), all rewards depend on
 * ONE validator's performance, and the runtime's formal audit series (Halborn, v1.11–v1.16)
 * is dated — its living assurance is consensus re-execution and the largest live-fire
 * record in the ecosystem.
 *
 * SEPARATION OF DUTIES (risk_separation_of_duties_v2): authored under the
 * ws_automated_risk_assessor identity — scores and aggregates only; NO approval. Numbers
 * reach users ONLY via the Vetting-page Security-score exception.
 *
 * EVERY fact carries its source, collected 2026-08-11 (Claude, evidence preparer,
 * founder-authorized fetch): a LIVE getVoteAccounts read of the exact vote account
 * (commission, activated stake, liveness), the recorded 14T evidence (Stakewiz + Marinade
 * cross-verified data), and the anza-xyz/security-audits core-runtime audit record.
 */

export const NATIVE_STAKING_RUBRIC_V1_ASSESSMENT_VERSION = "1.0.0" as const;
export const NATIVE_STAKING_RUBRIC_V1_ASSESSMENT_ID = "native_staking_rubric_v1_automated_assessment_v1" as const;
export const NATIVE_STAKING_V1_ASSESSMENT_APPROVES_ANYTHING = false;
export const NATIVE_STAKING_V1_ASSESSMENT_ENABLES_TRANSACTIONS = false;

/* ---- Exact product binding: a native stake account delegated to the Jupiter validator. ---- */
export const NATIVE_STAKING_V1_ASSESSMENT_BINDING = {
  protocolId: "solana",
  product: "Native validator staking (Jupiter validator baseline)",
  stakeProgram: "Stake11111111111111111111111111111111111111", // native runtime program — not BPF, no upgrade authority
  voteAccount: "CatzoSMUkTRidT5DwBxAC2pEtnwMBTpkCepHkFgZDiqb", // the exact validator (14T binding)
  evidenceCutoffAt: "2026-08-11T00:00:00.000Z",
} as const;

/* ---- Live on-chain facts (getVoteAccounts with votePubkey filter, at the cutoff). ---- */
export const NATIVE_STAKING_V1_ONCHAIN_FACTS = {
  commissionPct: 5, // VERIFIES the recorded 14T evidence exactly
  activatedStakeSol: 12_477_808, // matches the recorded ~12.5M SOL
  status: "current" as const, // not delinquent; voted at slot 438,971,221 at the read
  stakeProgramIsNative: true, // no ProgramData, no upgrade authority — changed only by consensus feature gates
} as const;

export const NATIVE_STAKING_V1_MARKET_FACTS = {
  networkContext: "Native staking secures the Solana network itself — the majority of all SOL — and has run since genesis (2020, ~6.5 years).",
  runtimeAuditRecord: "Halborn versioned runtime series (v1.11.3 → v1.16.x, incl. a dedicated Commission Update audit) in anza-xyz/security-audits; no 2024+ core-runtime audit is published there.",
  recordedEvidence: "14T package: Stakewiz current stake/APY/commission + Marinade per-epoch validator APY history (dual-source, exact vote-account match).",
} as const;

export type NativeStakingV1AnchorBand = "unsupported" | "weak" | "partial" | "supported" | "strongly_supported";
export type NativeStakingV1Confidence = "low" | "medium" | "high";

export interface NativeStakingV1DimensionAssessment {
  dimensionId: string;
  weight: number;
  score: number;
  anchorBand: NativeStakingV1AnchorBand;
  confidence: NativeStakingV1Confidence;
  limitingFact: string;
  rationale: string;
}

/**
 * The twelve dimension scores. Anchors (riskGovernance STD_ANCHORS): unsupported 0–2,
 * weak 3–4, partial 5–6, supported 7–8, strongly_supported 9–10. Unknowns never score
 * as favourable.
 */
export const NATIVE_STAKING_V1_DIMENSION_ASSESSMENTS: NativeStakingV1DimensionAssessment[] = [
  {
    dimensionId: "audit_security", weight: 15, score: 8, anchorBand: "supported", confidence: "high",
    limitingFact: "The published core-runtime audit series (Halborn, v1.11–v1.16) is dated — no 2024+ runtime audit appears in the registry; assurance for current versions rests on consensus execution rather than a fresh third-party report.",
    rationale: "The stake program is native runtime code re-executed by every validator on the network — 'the deployed program' is consensus itself. It carries a formal audit series (including a dedicated Commission Update audit), and the strongest live-fire evidence in the ecosystem: it has secured the majority of all SOL since genesis without a stake-program exploit. Top of `supported`, held from 9 only by the dated formal-audit trail.",
  },
  {
    dimensionId: "maturity", weight: 8, score: 9, anchorBand: "strongly_supported", confidence: "high",
    limitingFact: "None material — this is the oldest, largest, most continuously verified staking mechanism on Solana.",
    rationale: "Live since genesis (~6.5 years), securing the majority of all SOL, verifiable on-chain continuously — maturity evidence no wrapped product can match. `strongly_supported`.",
  },
  {
    dimensionId: "upgrade_admin_authority", weight: 15, score: 9, anchorBand: "strongly_supported", confidence: "high",
    limitingFact: "Protocol changes still occur — via feature gates adopted by stake-weighted validator supermajority — so the rules can evolve, just not by any single party's key.",
    rationale: "The structurally best possible answer to this dimension: NO upgrade authority exists (the program is native, not BPF — verified by the absence of any ProgramData), no admin key can reach a stake account, and the user's own stake and withdraw authorities control everything. Change requires network consensus — decentralized defence-in-depth by construction. `strongly_supported`.",
  },
  {
    dimensionId: "manager_discretion", weight: 12, score: 8, anchorBand: "supported", confidence: "high",
    limitingFact: "The validator's commission is the one lever another party holds (5% today, verified live) — a commission increase reduces future rewards until the user redelegates.",
    rationale: "There is NO manager: the stake account is user-owned, delegation is the user's choice, and the validator cannot touch principal — its worst case is underperformance or a commission change, both visible on-chain per epoch. Top of `supported`.",
  },
  {
    dimensionId: "strategy_complexity", weight: 10, score: 9, anchorBand: "strongly_supported", confidence: "high",
    limitingFact: "Epoch mechanics (activation/deactivation timing) are the only concept a user must understand.",
    rationale: "The simplest yield shape that exists on Solana: delegate, accrue, deactivate, withdraw. No pool, no token, no exchange rate, no rebalancing, no third-party code path. Every other product on this board is this primitive plus added machinery. `strongly_supported`.",
  },
  {
    dimensionId: "composability_dependency", weight: 8, score: 8, anchorBand: "supported", confidence: "high",
    limitingFact: "All reward flow depends on ONE validator continuing to operate well; the display-layer data feeds (Stakewiz, Marinade API) are outside the custody path.",
    rationale: "The custody path is the Solana runtime alone — zero external programs, zero services. The single-validator reliance is a reward-side dependency, priced here and in operations. `supported`.",
  },
  {
    dimensionId: "oracle_risk", weight: 8, score: 9, anchorBand: "strongly_supported", confidence: "high",
    limitingFact: "None — there is nothing to price.",
    rationale: "The only product on the board with literally NO pricing surface: a stake account holds SOL itself. No NAV, no exchange rate, no discount, no oracle, nothing to go stale or be manipulated. `strongly_supported`.",
  },
  {
    dimensionId: "liquidity_withdrawal", weight: 12, score: 7, anchorBand: "supported", confidence: "high",
    limitingFact: "No instant exit exists: deactivation takes effect at the epoch boundary (~up to 2 days) before withdrawal — the convenience LSTs sell is exactly what native staking lacks.",
    rationale: "The exit is slower but VALUE-CERTAIN: deactivate, wait one epoch, withdraw the full stake plus rewards — permissionless, zero fee, no market depth involved, no discount possible. Every LST's instant path trades that certainty for speed. `supported`.",
  },
  {
    dimensionId: "asset_stablecoin_risk", weight: 5, score: 8, anchorBand: "supported", confidence: "high",
    limitingFact: "Solana has no slashing today — but that is network policy, not a protocol guarantee, and SOL itself is a volatile asset.",
    rationale: "The asset is exactly the asset: SOL held in the user's own account, with no wrapper token, no LST discount layer, no peg. The cleanest asset posture available for SOL exposure. `supported`.",
  },
  {
    dimensionId: "withdrawal_fee_transparency", weight: 3, score: 8, anchorBand: "supported", confidence: "high",
    limitingFact: "The validator's commission can change; the protection is per-epoch visibility and the user's ability to redelegate, not a cap.",
    rationale: "There are NO fees — deposit, withdrawal, or otherwise — by protocol design, and the one economic parameter (5% commission) is public on-chain state, verified live in this assessment and matching the recorded dual-source evidence. Top of `supported`.",
  },
  {
    dimensionId: "operational_dependency_risk", weight: 2, score: 5, anchorBand: "partial", confidence: "medium",
    limitingFact: "ALL rewards depend on the single Jupiter validator's uptime, performance, and commission policy — the same concentration priced for JupSOL.",
    rationale: "The validator is large (12.48M SOL verified live), long-established, and currently voting — but concentration is concentration: delinquency costs every epoch of rewards until the user notices and redelegates. `partial`, consistent with the board.",
  },
  {
    dimensionId: "incident_history", weight: 2, score: 6, anchorBand: "partial", confidence: "medium",
    limitingFact: "The NETWORK's history includes documented outages (2021–2024 halts) — chain-level incidents during which staking value was unaffected but nothing could move.",
    rationale: "The stake program itself has the strongest record on Solana: the ecosystem's largest honeypot, never exploited, across ~6.5 years — positive survivorship evidence, not mere search absence. Network-level halts are real, documented, and well-postmortemed incidents of the underlying system. Top of `partial`.",
  },
];

/* ------------------------------------------------------------------ *
 * Aggregate — same computation semantics as the other v1 assessments.
 * ------------------------------------------------------------------ */
export const NATIVE_STAKING_V1_AGGREGATE_COMPUTATION_VERSION = "riskGovernance.aggregateRiskScore@v1" as const;

export function computeNativeStakingV1Aggregate(items: NativeStakingV1DimensionAssessment[] = NATIVE_STAKING_V1_DIMENSION_ASSESSMENTS) {
  const totalWeight = items.reduce((s, d) => s + d.weight, 0);
  const weightedPoints = items.reduce((s, d) => s + d.score * d.weight, 0);
  return { totalWeight, weightedPoints, aggregate: Math.round((weightedPoints / totalWeight) * 100) / 100 };
}

export const NATIVE_STAKING_V1_AGGREGATE_RESULT = computeNativeStakingV1Aggregate();

export const NATIVE_STAKING_V1_ASSESSMENT_OUTCOME = {
  computationVersion: NATIVE_STAKING_V1_AGGREGATE_COMPUTATION_VERSION,
  mandatoryBlockerResult: "none_present" as const,
  weightedPoints: 819,
  totalWeight: 100,
  aggregate: 8.19,
  minimumThreshold: 7,
  meetsMinimum: true,
  scoresAdjustedAfterSeeingAggregate: false,
  interpretation:
    "8.19 against a floor of 7 — native staking MEETS the internal suitability minimum by the widest margin on " +
    "the board, and the margin is earned exactly where the rubric weighs heaviest: no upgrade authority exists " +
    "(9 × w15, vs 5–6 for every wrapped product), no manager exists (8 × w12), no pricing surface exists " +
    "(9 × w8), and the strategy is the base primitive itself (9 × w10). The named costs are real: exits wait " +
    "an epoch (~2 days, at full value — liquidity 7), rewards ride on one validator (ops 5), and the network's " +
    "own outage history is recorded (incidents 6). The draft score (7.10) undervalued the structural " +
    "properties the v1 rubric was built to price; this assessment CONFIRMS and strengthens the standing 14T " +
    "approval rather than revisiting it. A human reviewer may accept, reject, or override with a recorded " +
    "rationale.",
} as const;

/**
 * Sensitivity: none needed to clear the floor — the aggregate sits 1.19 above it. The one
 * watch-item is concentration: a delinquency event or adverse commission change at the
 * Jupiter validator re-scores ops/fees and could trim ~0.1–0.2, still comfortably passing.
 * A published 2024+ core-runtime audit would lift audit_security to 9 (+0.15).
 */
export const NATIVE_STAKING_V1_SENSITIVITY_NOTE = "passes_with_margin_watch_validator_concentration" as const;

/**
 * HUMAN REVIEW DECISION (recorded, 2026-08-11). The authorized human product owner
 * (ws_product_owner) reviewed the assessment in conversation and ACCEPTED it as-is:
 * native validator staking is recorded as PASSED at 8.19 — the only pure
 * evidence-margin pass on the board — confirming and strengthening the standing 14T
 * read-only approval. Zero overrides. The recorded watch-item is single-validator
 * concentration; the re-review triggers below keep it live.
 */
export const NATIVE_STAKING_V1_HUMAN_REVIEW_DECISION = {
  decidedByRole: "ws_product_owner" as const,
  decidedAt: "2026-08-11",
  decision: "accepted_automated_assessment" as const,
  outcome: "passed" as const,
  overridesApplied: 0,
  mainReason:
    "Above the floor by the widest margin on the board (8.19 vs 7), for structural reasons: no upgrade " +
    "authority exists (native runtime program, consensus-governed), no manager, no wrapper token, no pricing " +
    "surface, zero fees — with the validator's 5% commission and 12.48M SOL stake verified live on-chain. " +
    "The named costs (epoch-gated exits, single-validator reward concentration) are recorded, not hidden.",
  watchItem: "single_validator_concentration" as const,
  reopenOn: [
    "Jupiter validator delinquency, commission change, or shutdown",
    "a slashing mechanism activating on Solana",
    "a material stake-program vulnerability or network incident",
  ],
} as const;

export const NATIVE_STAKING_V1_ASSESSMENT_LIMITATIONS = [
  "The runtime audit trail is dated (no 2024+ core audit published in the registry); consensus re-execution is the living assurance.",
  "Validator performance/commission facts are point-in-time (verified live at the cutoff, matching the recorded dual-source evidence).",
  "Network outage history was assessed from public postmortems, not independently reconstructed.",
] as const;

export const NATIVE_STAKING_V1_ASSESSMENT_INVALIDATION_TRIGGERS = [
  "a slashing mechanism activating on Solana (reopens asset_stablecoin_risk)",
  "Jupiter validator delinquency, commission change, or shutdown (reopens ops/fees; the product would redelegate)",
  "a material stake-program vulnerability or network incident (reopens audit/incidents)",
  "a published 2024+ core-runtime audit (reopens audit_security toward 9)",
] as const;
