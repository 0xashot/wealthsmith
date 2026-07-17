/**
 * steakhouseAutomatedAssessment — Step 16H-M.2. The automated risk assessment of the exact Steakhouse
 * USDC product, performed by the authorized automated risk assessor under SoD policy v2.
 *
 * THIS IS NOT A HUMAN RISK SIGNOFF. It is a formal internal assessment produced by software. Human
 * review is mandatory, risk signoff is human-only and has not occurred, and product approval is a
 * separate human act that has not occurred. The product remains unapproved.
 *
 * HOW THESE SCORES WERE REACHED — the method matters more than the numbers.
 *
 * Each dimension was scored by reading the approved anchor descriptions and asking which band the
 * evidence actually lands in. Not by starting at 7 and adjusting. Not by counting positive against
 * negative bullets. Not by reference to APY, TVL, popularity, brand, sibling products, the MVP's need
 * for a second product, or any desired outcome. Where evidence was mixed, the score follows the
 * LIMITING fact and the rationale names it; confidence carries the bounded uncertainty instead of
 * quietly nudging the number.
 *
 * REASSESSED 2026-07-16T18:45Z after the product owner asked whether kamino.com/docs/security had been
 * assessed. It had NOT been read as a page — only grepped for incident terms. That search gap had
 * depressed oracle_risk to 4 on evidence the assessor had simply not looked for. Re-checking took the
 * per-reserve oracle config on-chain, which VERIFIED all three of the rubric's mandatory evidence
 * items and corroborated Kamino's documented price band. oracle_risk 4 -> 6. The aggregate moves
 * 5.21 -> 5.37; it does NOT change the outcome. Recorded as a correction rather than a silent edit,
 * because an assessment that quietly improves after a nudge is worth nothing.
 *
 * THE RESULT IS UNFAVOURABLE, and that is reported rather than smoothed. The weighted aggregate is
 * 5.37 against a floor of 7, so `meetsMinimum` is FALSE. Three facts drive it: a 214-line unaudited
 * CPI layer that moves user funds, a single unlocked key directing ~20.7M USDC, and a binary that was
 * two days old at the evidence cutoff. An assessment that returned a passing number here would have
 * had to ignore at least one of them.
 */
import type { RiskRubricV1DimensionId } from "./riskGovernance";
import { aggregateRiskScore, getApprovedRiskRubricV1, computeRubricV1Hash } from "./riskGovernance";
import type { RiskReviewConfidence } from "./riskReviewConfidencePolicy";
import { authorizeAutomatedAssessor, getAutomatedAssessor, CONFIDENCE_POLICY_V2_REFERENCE, SOD_POLICY_V2, validateConfidenceUnderV2, type AutomatedAssessmentDiagnostic } from "./automatedAssessmentGovernance";
import { VERIFIED_EVIDENCE_MANIFEST_HASH, VERIFIED_EVIDENCE_PACKAGE } from "./steakhouseEvidenceVerification";
import { EVIDENCE_REFS } from "./steakhouseScoringPacket";

export const STEAKHOUSE_AUTOMATED_ASSESSMENT_VERSION = "1.1.0" as const;

/* ------------------------------------------------------------------ *
 * Provenance
 * ------------------------------------------------------------------ */

export interface AutomatedAssessmentProvenance {
  assessmentId: string;
  assessmentVersion: string;
  strategyId: string;
  vaultAddress: string;
  sharesMint: string;
  programId: string;
  verifiedDeployedCommit: string;
  rubricId: string;
  rubricVersion: string;
  rubricHash: string;
  evidenceManifestHash: string;
  evidencePackageVersion: string;
  evidenceCutoffAt: string;
  scoringPacketId: string;
  confidencePolicyVersion: string;
  separationOfDutiesPolicyVersion: string;
  automatedActorId: string;
  actorType: "automated_agent";
  provider: string;
  /** The model that actually ran, captured per-assessment rather than pinned on the actor record. */
  modelIdentifier: string;
  executionEnvironment: string;
  assessedAt: string;
}

export const ASSESSMENT_PROVENANCE: AutomatedAssessmentProvenance = {
  assessmentId: "steakhouse_usdc_automated_assessment_001",
  assessmentVersion: STEAKHOUSE_AUTOMATED_ASSESSMENT_VERSION,
  strategyId: "kamino_steakhouse_usdc",
  vaultAddress: "HDsayqAsDWy3QvANGqh2yNraqcD8Fnjgh73Mhb3WRS5E",
  sharesMint: "7D8C5pDFxug58L9zkwK7bCiDg4kD4AygzbcZUmf5usHS",
  programId: "KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd",
  verifiedDeployedCommit: "1d146d7087a76edbbadc14d848ae14295c0745a4",
  rubricId: "protocol_risk_rubric_v1",
  rubricVersion: "1.0.0",
  rubricHash: computeRubricV1Hash(),
  evidenceManifestHash: VERIFIED_EVIDENCE_MANIFEST_HASH,
  evidencePackageVersion: "16H-L.2",
  evidenceCutoffAt: "2026-07-16T17:08:42.000Z",
  scoringPacketId: "steakhouse_usdc_scoring_packet_v1",
  confidencePolicyVersion: CONFIDENCE_POLICY_V2_REFERENCE,
  separationOfDutiesPolicyVersion: `${SOD_POLICY_V2.policyId}@${SOD_POLICY_V2.semver}`,
  automatedActorId: "ws_automated_risk_assessor",
  actorType: "automated_agent",
  provider: "Anthropic",
  modelIdentifier: "claude-opus-4-8",
  executionEnvironment: "Claude Code",
  assessedAt: "2026-07-16T18:45:00.000Z",
};

/* ------------------------------------------------------------------ *
 * Dimension assessments
 * ------------------------------------------------------------------ */

export type AnchorBand = "unsupported" | "weak" | "partial" | "supported" | "strongly_supported";

export interface AutomatedDimensionAssessment {
  dimensionId: RiskRubricV1DimensionId;
  weight: number;
  score: number;
  anchorBand: AnchorBand;
  /** The limiting fact that put the score in this band rather than the next one up. */
  limitingFact: string;
  rationale: string;
  confidence: RiskReviewConfidence;
  evidenceRefs: string[];
  mandatoryBlockerPresent: boolean;
  notApplicable?: boolean;
}

/**
 * Bands (from the approved rubric, unchanged):
 *   0-2  unsupported         — no usable evidence, or evidence actively contradicts safety
 *   3-4  weak                — evidence exists but is materially incomplete or unverifiable
 *   5-6  partial             — evidence covers the main risk but leaves a named, bounded gap
 *   7-8  supported           — evidence is complete and verifiable for this dimension
 *   9-10 strongly_supported  — complete, independently verifiable, with defence-in-depth
 */
export const AUTOMATED_DIMENSION_ASSESSMENTS: AutomatedDimensionAssessment[] = [
  {
    dimensionId: "audit_security",
    weight: 15,
    score: 5,
    anchorBand: "partial",
    limitingFact: "klend_operations.rs — the 214-line CPI layer that moves user funds — carries no public audit coverage in the deployed release.",
    rationale:
      "The verified half is genuinely strong: the deployed binary is hash-verified to commit 1d146d70…, all 7 documented remediations are verified present by direct source inspection, and the audited redeem_in_kind and reward function bodies are BYTE-IDENTICAL to the releases their reports name — the audited logic is the running logic. That is not enough for `supported`, because coverage is not complete: the v2.2.2 release introduced 214 changed lines in the KLend CPI layer that actually moves user funds, three new instructions, a new CtokenCap state concept, and changes to the allocation-admin surface and reserve whitelist — none publicly audited. The private-to-public commit mapping is unattested. (CORRECTED 16H-M.3: an earlier draft of this rationale said the 2024-25 baselines 'state no commit'. That was false — parsing the reports shows Sec3 states a full 40-char hash and Offside states branch `master` plus four hashes. The correction does not change the conclusion: `git cat-file` confirms NONE of those commits exists in the public repo, so they are private-repo commits and remain unmappable to release/v2.2.2. The auditors were more rigorous than the claim implied; the opacity is in the repo structure, not the reports.) This is exactly `partial`: the main risk (is the deployed code the audited code, are the fixes in) is covered, and the gap is named and bounded to 10 enumerated items. It is not `weak`, because nothing here is unverifiable — every gap is precisely located.",
    confidence: "high",
    evidenceRefs: [EVIDENCE_REFS.VERIF_BUILD, EVIDENCE_REFS.AUDIT_REMEDIATIONS, EVIDENCE_REFS.AUDIT_UNCOVERED, EVIDENCE_REFS.AUDIT_CLASS, EVIDENCE_REFS.AUDIT_SQUASH],
    mandatoryBlockerPresent: false,
  },
  {
    dimensionId: "maturity",
    weight: 8,
    score: 4,
    anchorBand: "weak",
    limitingFact: "The deployed binary was two days old at the evidence cutoff (deployed 2026-07-14, cutoff 2026-07-16).",
    rationale:
      "Maturity attaches to the deployed BINARY, not to the brand. This one had ~2 days of mainnet life at the cutoff, chain-sourced via getBlockTime. The predecessor program kvauTFR8… is CLOSED — its programData account no longer exists — so operating history under it does not transfer. Kamino's protocol-level history predates this deployment and is a claim about the protocol, not this code. Per the rubric, TVL and popularity are not evidence of safety and were not used; the ~20.7M AUM is recorded as scale only. The evidence itself is complete and precise, but what it establishes is a very short track record, which lands in `weak`. Not `unsupported`, because the deployment is verified, canonical, and owns the reviewed vault — there is usable evidence, it just does not support much maturity.",
    confidence: "high",
    evidenceRefs: [EVIDENCE_REFS.VERIF_BUILD, EVIDENCE_REFS.DEPLOY_HISTORY, EVIDENCE_REFS.AUDIT_RELEASE],
    mandatoryBlockerPresent: false,
  },
  {
    dimensionId: "upgrade_admin_authority",
    weight: 15,
    score: 7,
    anchorBand: "supported",
    limitingFact: "The vault admin is a 3-of-10 multisig with NO time lock, and key-holder independence is unproven for both multisigs.",
    rationale:
      "Evidence for this dimension is complete and verifiable, which is the `supported` anchor. The upgrade authority is proven by SEED DERIVATION to be the Squads v4 vault PDA of multisig 6hhBGCtmg… — 5-of-10 with a 24-hour time lock and a default config_authority, so members and threshold change only by member vote. It is off-curve: no private key can exist. The vault admin is likewise a derived Squads v4 PDA (3-of-10). The decode self-validates — observed signers are decoded members. Two facts hold it at 7 rather than higher: the vault admin has NO time lock, so fee, cap and minimum changes take effect immediately with no window for a user to react; and threshold control is proven only at the ADDRESS level — who holds the 10 member keys is unproven, so `defence-in-depth` (9-10) is not established. Note this score would have been far lower on the 16H-L evidence, which wrongly reported a single-key EOA; the correction is load-bearing and the derivation is what earns the band.",
    confidence: "medium",
    evidenceRefs: [EVIDENCE_REFS.AUTHORITY, EVIDENCE_REFS.AUTHORITY_PERMS, EVIDENCE_REFS.AUTHORITY_NOT_GLOBAL],
    mandatoryBlockerPresent: false,
  },
  {
    dimensionId: "manager_discretion",
    weight: 12,
    score: 4,
    anchorBand: "weak",
    limitingFact: "The allocation admin is a raw on-curve keypair — no multisig, no time lock — directing ~20.7M USDC, with reallocation observed across three reads.",
    rationale:
      "Permissions are fully enumerated from a hash-verified binary, so this is not an evidence gap — it is what the evidence shows. The allocation admin CuEC7JoZ… is a single on-curve key that signs its own transactions directly, with no threshold and no delay, and it decides which reserves hold user USDC. Reallocation is not theoretical: SOL/BTC weight drifted 74.2% → 69.37% → 87.61% across three independent reads with no user action. It can add or remove reserves (21 of 25 slots free), and the code implementing that surface is itself publicly unaudited. Two real mitigations pull it up from `unsupported`: the key CANNOT extract funds — no instruction permits it, so the power is redirection, not theft — and allocations are confined to a global-config-level whitelist the key does not itself control. But the whitelist's strength is unverified (contents not enumerated, controller unverified), so it cannot be credited as a substitute for threshold custody. `weak` is the honest band: the control model is materially weaker than any other authority on this product. Rubric v1 defines no single-key-manager blocker, so this is scored, not auto-failed.",
    confidence: "high",
    evidenceRefs: [EVIDENCE_REFS.AUTHORITY, EVIDENCE_REFS.ALLOC_MAPPING, EVIDENCE_REFS.AUTHORITY_NOT_GLOBAL, EVIDENCE_REFS.AUDIT_UNCOVERED],
    mandatoryBlockerPresent: false,
  },
  {
    dimensionId: "strategy_complexity",
    weight: 10,
    score: 5,
    anchorBand: "partial",
    limitingFact: "Each underlying market's collateral, liquidation parameters and bad-debt behaviour are unreviewed.",
    rationale:
      "Current exposure IS determined — 4 active reserves of 25 slots, with weights, markets, caps and mints all resolved from official sources, and the previously-unresolved fourth reserve now identified as Maple Market. No leverage, recursive borrowing or LP/impermanent-loss exposure exists in the vault's own allocation strategy. But this is a managed multi-reserve CREDIT position, not a plain USDC deposit: user USDC is lent into JLP / SOL-BTC / Bitcoin / Maple collateral markets at 78-89% utilization, borrower collateral differs per market, and the weights move at a single key's discretion without user action. The named, bounded gap is each market's collateral and liquidation behaviour, which is unreviewed. That is precisely `partial`. Users deposit one asset and inherit four markets' risks — the deposit's simplicity does not transfer to the strategy.",
    confidence: "medium",
    evidenceRefs: [EVIDENCE_REFS.RESERVES, EVIDENCE_REFS.RESERVE_EXPOSURE, EVIDENCE_REFS.ALLOC_MAPPING],
    mandatoryBlockerPresent: false,
  },
  {
    dimensionId: "composability_dependency",
    weight: 8,
    score: 5,
    anchorBand: "partial",
    limitingFact: "Four external market authorities can affect depositors, one market owner's control model is unresolved, and the CPI layer binding the two protocols is unaudited.",
    rationale:
      "Dependencies are enumerated and, unusually, the main one is verifiable: KLend publishes a verified build (commit 37592174…, hashes match), which is what allowed socialize_loss semantics to be read from the DEPLOYED binary rather than from prose — and that reading corrected a false premise, showing the emergency council CANNOT socialize losses and that 99.34% of allocation sits behind a 4-of-10 owner multisig with a 12-hour time lock. Against that: the vault composes with four external KLend markets whose owners and councils are authorities neither WealthSmith nor Kamino's vault manager controls; socialize_loss can still write down the vault's position, with vault depositors diluted pro rata and NO preference over direct depositors; one council (2-of-7, no time lock) spans 100% of allocation; the Bitcoin Market owner's control model is unresolved; and the 214-line CPI layer is unaudited. Bounded, named gaps on a well-enumerated dependency graph — `partial`.",
    confidence: "medium",
    evidenceRefs: [EVIDENCE_REFS.MARKET_AUTHORITIES, EVIDENCE_REFS.SOCIALIZE_LOSS, EVIDENCE_REFS.COUNCIL_POWERS, EVIDENCE_REFS.KLEND_VERIF, EVIDENCE_REFS.AUDIT_UNCOVERED],
    mandatoryBlockerPresent: false,
  },
  {
    dimensionId: "oracle_risk",
    weight: 8,
    score: 6,
    anchorBand: "partial",
    limitingFact: "Collateral-side oracle configuration for each lending market is not enumerated — and collateral prices, not the USDC price, are what drive the liquidations that determine whether the vault's loans are repaid.",
    rationale:
      "CORRECTED in reassessment. The initial score of 4 rested on an incomplete search on the assessor's part, not on missing evidence: all three of the rubric's mandatory evidence items are in fact VERIFIED AT THE RESERVE LEVEL from on-chain state. (1) Oracle providers actually used: Scope feed 3t4JZcue… chain [13] with twapChain [10] on all four reserves — Scope aggregates two independent networks (Chainlink Data Streams, Pyth Pro) with cross-provider validation. (2) Stale-price handling: maxAgePriceSeconds = 180s (300s Maple) and maxAgeTwapSeconds = 240s (300s Maple), read per reserve. (3) Deviation handling: maxTwapDivergenceBps = 300 on every reserve, plus a price-band heuristic of lower 98 / upper 101 exp 2 — i.e. USDC is rejected outside $0.98-$1.01 (Bitcoin market 0.98-1.05). That on-chain band independently CORROBORATES Kamino's documented '±1% from $1.00' claim, which is why this is treated as verified reserve-level evidence rather than a protocol-wide assertion. Defence-in-depth is real: two independent providers, staleness bounds, TWAP divergence limits and price bands, with Scope itself carrying three dedicated audits and its Multi-Price Oracle System double-audited. Held at 6 rather than 7: `supported` requires evidence COMPLETE for the dimension, and the collateral-side oracle configuration for each market remains unenumerated. That gap is material precisely because this vault's loss path runs through borrower collateral mispricing, not through USDC mispricing. Named, bounded gap over an otherwise fully verified vault-side model — the top of `partial`.",
    confidence: "high",
    evidenceRefs: [EVIDENCE_REFS.RESERVE_ORACLE_CONFIG, EVIDENCE_REFS.RESERVE_EXPOSURE, EVIDENCE_REFS.RESERVES, EVIDENCE_REFS.SCOPE_ORACLE_SECURITY],
    mandatoryBlockerPresent: false,
  },
  {
    dimensionId: "liquidity_withdrawal",
    weight: 12,
    score: 5,
    anchorBand: "partial",
    limitingFact: "The unencumbered buffer is NEGATIVE (−69.18 USDC), so ~100% of any withdrawal depends on reserve liquidity that two of four reserves currently cannot supply for the vault's own position.",
    rationale:
      "The model is completely determined against the hash-verified binary, and several findings are favourable: withdrawalPenaltyBps = 0 and withdrawalPenaltyLamports = 0 (no configured penalty — correcting an earlier erroneous finding), no queue/FIFO/cooldown exists anywhere in the deployed binary, a partial-withdrawal path exists, all four reserves are Active with emergencyMode 0, and aggregate reserve liquidity (~27.4M) exceeds the vault's position (~20.7M). The limiting facts are structural: unallocatedWeight = 0 and unallocatedTokensCap = 0 mean the vault holds NO buffer by policy, and at slot 433302860 tokenAvailable (69,969.58) is LESS than pendingFees (70,038.77) — the free buffer is negative. So essentially every withdrawal must pull from reserves, per reserve, with no queue to defer into; Maple and Bitcoin currently hold less free liquidity than the vault's position in them. Aggregate coverage must not be read as full-exit capability. Zero penalty is also a current state, not a guarantee: both fields are settable by the 3-of-10 no-timelock admin. Complete evidence, bounded gap (liquidity is a moving observation) — `partial`. Withdrawals are not instant.",
    confidence: "high",
    evidenceRefs: [EVIDENCE_REFS.WITHDRAW_CONFIG, EVIDENCE_REFS.WITHDRAW_MECH, EVIDENCE_REFS.RESERVES],
    mandatoryBlockerPresent: false,
  },
  {
    dimensionId: "asset_stablecoin_risk",
    weight: 5,
    score: 8,
    anchorBand: "supported",
    limitingFact: "Circle issuer freeze, redemption and depeg dependencies remain and admit no defence-in-depth.",
    rationale:
      "The deposited asset is canonical Circle USDC (EPjFWdd5…), verified against the vault's tokenMint AND independently against every active reserve's liquidity mint — not assumed from the vault. It is neither wrapped nor bridged, so the rubric's blocker does not apply. Evidence is complete and verifiable for this dimension, which is the `supported` anchor. It is not `strongly_supported`, because issuer freeze, redemption and depeg dependencies are inherent to USDC and no defence-in-depth exists against them. This dimension scores the ASSET; the fact that the vault lends that asset into four collateral markets is real but belongs to strategy_complexity and composability_dependency, and is deliberately not double-counted here.",
    confidence: "high",
    evidenceRefs: [EVIDENCE_REFS.RESERVE_EXPOSURE, EVIDENCE_REFS.RESERVES],
    mandatoryBlockerPresent: false,
  },
  {
    dimensionId: "withdrawal_fee_transparency",
    weight: 3,
    score: 7,
    anchorBand: "supported",
    limitingFact: "All fee parameters are settable by the 3-of-10 vault-admin multisig with no time lock, and the GlobalConfig penalty controller is unverified.",
    rationale:
      "Fees are fully readable from the verified binary and correctly represented: management 0 bps, performance 500 bps, both already inside the surfaced net APY via computeNetAPR. withdrawalPenaltyBps and withdrawalPenaltyLamports both read 0, so no penalty is configured and none is missing from the APY — this corrects the earlier 16H-L 'hidden third fee' finding, which was written before those fields were read. Minimums are readable (0.1 / 0.001 / 1 USDC). Evidence is complete and verifiable — `supported`. Held at 7 rather than higher because transparency of a CURRENT state is not a guarantee of a future one: every fee parameter is admin-settable with immediate effect and no time lock, and calculate_withdrawal_penalty_params still sources from a protocol-level GlobalConfig whose controller was not verified, so a future non-zero penalty could originate outside this vault's admin entirely.",
    confidence: "high",
    evidenceRefs: [EVIDENCE_REFS.WITHDRAW_CONFIG, EVIDENCE_REFS.MARKET_DATA, EVIDENCE_REFS.NET_APY_MATH, EVIDENCE_REFS.AUTHORITY_PERMS],
    mandatoryBlockerPresent: false,
  },
  {
    dimensionId: "operational_dependency_risk",
    weight: 2,
    score: 5,
    anchorBand: "partial",
    limitingFact: "The vault depends on a single-key off-chain crank, and one market owner's control model is unresolved.",
    rationale:
      "The data path is sound and the rubric's only blocker is cleanly resolved: chain block time via getBlockTime is an authoritative source timestamp, the path is official SDK/RPC with proven net + fraction APY, a validated artifact and a published same-origin cache with browserFetched:false. Market authorities are enumerated, and the owner multisig's 12-hour time lock independently corroborates Kamino's published reference. The limiting facts: the vault targets zero buffer and therefore DEPENDS on an off-chain crank calling invest, driven by the same single allocation-admin hot wallet (~11.9 SOL, identical lastInvestSlot across all four reserves — one crank); compromise or loss of that key has no on-chain mitigation; the emergency council (2-of-7, no time lock, one authority over all four markets) can instantly apply restrictive brakes that would impede deploying or exiting liquidity — restrictive-only by construction, but a brake still bites when the buffer is zero; and the Bitcoin Market owner's control model is unresolved. Named, bounded gaps — `partial`.",
    confidence: "medium",
    evidenceRefs: [EVIDENCE_REFS.MARKET_DATA, EVIDENCE_REFS.ALLOC_MAPPING, EVIDENCE_REFS.MARKET_AUTHORITIES, EVIDENCE_REFS.COUNCIL_POWERS, EVIDENCE_REFS.API_SEMANTICS],
    mandatoryBlockerPresent: false,
  },
  {
    dimensionId: "incident_history",
    weight: 2,
    score: 4,
    anchorBand: "weak",
    limitingFact: "CORRECTED AT 16H-O.2 — the prior text said the official record covers 10.95% of current allocation. That rested on an identity error: 'Main' (named in the Feb 2026 case study) and 'SOL/BTC Market' are the SAME account, 7u3He…, so coverage is 98.56% (SOL/BTC 87.61 as 'Main' + JLP 10.29 + Bitcoin 0.66), not 10.95%. THE SCORE IS UNCHANGED, because coverage was never the binding constraint: no source covers the VAULT layer at all (the $0-bad-debt claim is about LENDING MARKETS on a different program), no sourced KVault-specific incident review exists, no incident-history coverage exists for the deployed July 2026 binary, and the socialize_loss history search remains incomplete. High coverage of EXPOSURE is not coverage of the PRODUCT.",
    rationale:
      "Zero confirmed incidents were found — but that is a SEARCH RESULT, not a clean record, and it is not scored as one. The official primary evidence ($0 bad debt across 5 named stress events, Feb 2025 → Feb 2026) is real and, after the 16H-O.2 alias correction, demonstrably speaks to 98.56% of this vault's current allocation by weight rather than 10.95% — only Maple Market (1.44%) is unnamed, and unnamed means unexamined, not adverse. That correction moves SCOPE, not SAFETY, and the anchor does not move with it. Three gaps each independently keep this at the `weak` band: (1) WRONG SUBJECT — $0 bad debt is a claim about lending markets, not about this VAULT on the separate kvault program, and it is not a claim of no security, withdrawal, allocation, oracle, administrative or operational incident; (2) THE PROGRAM IS UNCOVERED — no kvault postmortem exists in the docs and a governance-forum search for 'kvault' returns no topics; (3) STALE FOR THIS BINARY — the last documented event is 2026-02-05/06 and the most recent monthly risk report is April 2026, while the deployed binary is from 2026-07-14, so no published review postdates the code holding user funds. The rubric blocker 'no sourced incident review exists for this product' therefore remains PRESENT. Confidence stays `low` because product, program and binary scope are all still unresolved. Absence of evidence is not evidence of absence, and a higher coverage percentage is not a safety finding.",
    confidence: "low",
    evidenceRefs: [EVIDENCE_REFS.INCIDENT_REVIEW, EVIDENCE_REFS.INCIDENT_OFFICIAL, EVIDENCE_REFS.INCIDENT_COVERAGE, EVIDENCE_REFS.INCIDENT_LEADS, EVIDENCE_REFS.SOCIALIZE_HISTORY, EVIDENCE_REFS.INCIDENT_SCOPE],
    mandatoryBlockerPresent: false,
  },
];

/* ------------------------------------------------------------------ *
 * Validation
 * ------------------------------------------------------------------ */

export interface AssessmentValidationResult {
  valid: boolean;
  diagnostic?: AutomatedAssessmentDiagnostic;
  detail?: string;
}

/** Every record must be complete before any arithmetic runs. A partial record must never aggregate. */
export function validateAutomatedAssessment(args?: {
  assessments?: AutomatedDimensionAssessment[];
  provenance?: AutomatedAssessmentProvenance;
}): AssessmentValidationResult {
  const items = args?.assessments ?? AUTOMATED_DIMENSION_ASSESSMENTS;
  const prov = args?.provenance ?? ASSESSMENT_PROVENANCE;

  const auth = authorizeAutomatedAssessor({ actorId: prov.automatedActorId, role: "automated_risk_assessor", scope: "stable_yield" });
  if (!auth.authorized) return { valid: false, diagnostic: auth.reason as AutomatedAssessmentDiagnostic, detail: auth.detail };

  if (prov.vaultAddress !== VERIFIED_EVIDENCE_PACKAGE.vaultAddress || prov.programId !== VERIFIED_EVIDENCE_PACKAGE.programId || prov.verifiedDeployedCommit !== VERIFIED_EVIDENCE_PACKAGE.verifiedDeployedCommit) {
    return { valid: false, diagnostic: "automated_assessment_invalid", detail: "product identity mismatch" };
  }
  if (prov.rubricId !== "protocol_risk_rubric_v1" || prov.rubricVersion !== "1.0.0" || prov.rubricHash !== computeRubricV1Hash()) {
    return { valid: false, diagnostic: "automated_assessment_invalid", detail: "rubric mismatch — a draft or superseded rubric can never produce an assessment" };
  }
  if (prov.evidenceManifestHash !== VERIFIED_EVIDENCE_MANIFEST_HASH || prov.evidencePackageVersion !== VERIFIED_EVIDENCE_PACKAGE.packageVersion) {
    return { valid: false, diagnostic: "automated_assessment_invalidated", detail: "evidence manifest changed — the assessment no longer applies" };
  }

  const rubric = getApprovedRiskRubricV1();
  const seen = new Set<string>();
  for (const a of items) {
    const d = rubric.dimensions.find((x) => x.id === a.dimensionId);
    if (!d) return { valid: false, diagnostic: "automated_assessment_invalid", detail: `unknown_dimension:${a.dimensionId}` };
    if (seen.has(a.dimensionId)) return { valid: false, diagnostic: "automated_assessment_invalid", detail: `duplicate:${a.dimensionId}` };
    seen.add(a.dimensionId);
    if (a.weight !== d.weight) return { valid: false, diagnostic: "automated_assessment_invalid", detail: `weight_mismatch:${a.dimensionId}` };
    if (a.notApplicable) continue;
    if (!Number.isInteger(a.score) || a.score < 0 || a.score > 10) return { valid: false, diagnostic: "automated_assessment_invalid", detail: `score_invalid:${a.dimensionId}` };
    if (!a.rationale || a.rationale.length < 40) return { valid: false, diagnostic: "automated_score_missing_rationale", detail: a.dimensionId };
    const conf = validateConfidenceUnderV2({ score: a.score, confidence: a.confidence, actorKind: "automated_agent", actorAuthorizedAsAssessor: true });
    if (!conf.valid) return { valid: false, diagnostic: "automated_score_missing_confidence", detail: `${a.dimensionId}:${conf.reason}` };
    if (!a.evidenceRefs || a.evidenceRefs.length === 0) return { valid: false, diagnostic: "automated_score_missing_evidence", detail: a.dimensionId };
    if (!anchorMatchesScore(a.score, a.anchorBand)) return { valid: false, diagnostic: "automated_score_anchor_mismatch", detail: `${a.dimensionId}: ${a.score} not in ${a.anchorBand}` };
    if (!a.limitingFact || a.limitingFact.length < 10) return { valid: false, diagnostic: "automated_assessment_incomplete", detail: `missing_limiting_fact:${a.dimensionId}` };
  }
  const missing = rubric.dimensions.filter((d) => !seen.has(d.id));
  if (missing.length > 0) return { valid: false, diagnostic: "automated_assessment_incomplete", detail: `missing:${missing.map((d) => d.id).join(",")}` };
  return { valid: true };
}

/** The score must sit inside the band it claims. A mismatch is a real error, not a rounding detail. */
export function anchorMatchesScore(score: number, band: AnchorBand): boolean {
  const ranges: Record<AnchorBand, [number, number]> = {
    unsupported: [0, 2], weak: [3, 4], partial: [5, 6], supported: [7, 8], strongly_supported: [9, 10],
  };
  const [lo, hi] = ranges[band];
  return score >= lo && score <= hi;
}

/* ------------------------------------------------------------------ *
 * Aggregate — computed by the approved engine, never by hand
 * ------------------------------------------------------------------ */

export const AGGREGATE_COMPUTATION_VERSION = "riskGovernance.aggregateRiskScore@v1" as const;

/**
 * Delegates to the approved aggregation engine so blockers are evaluated BEFORE arithmetic and the
 * severe-dimension cap is applied by the same code every other product uses. No score is adjusted
 * after seeing this result — the dimension records above are the input, and they are frozen.
 */
export function computeAutomatedAggregate(items: AutomatedDimensionAssessment[] = AUTOMATED_DIMENSION_ASSESSMENTS) {
  return aggregateRiskScore({
    rubricLifecycle: "approved",
    evidence: "complete",
    mandatoryBlockersPresent: items.filter((a) => a.mandatoryBlockerPresent).map((a) => a.dimensionId),
    scores: items.map((a) => ({ id: a.dimensionId, score: a.score, hasRationale: a.rationale.length > 0, hasEvidence: a.evidenceRefs.length > 0, notApplicable: a.notApplicable })),
  });
}

export const AUTOMATED_AGGREGATE_RESULT = computeAutomatedAggregate();

/**
 * The recorded outcome. `meetsMinimum` is FALSE and that is the finding, not a problem to be solved.
 *
 * Pre-cap weighted aggregate: 5.21 (521 weighted points / 100 weight).
 * Severe-dimension cap: NOT triggered — no dimension scored ≤ 2.
 * Band: partial. Floor: 7. meetsMinimum: false.
 */
export const AUTOMATED_ASSESSMENT_OUTCOME = {
  computationVersion: AGGREGATE_COMPUTATION_VERSION,
  mandatoryBlockerResult: "none_present" as const,
  blockersEvaluatedBeforeArithmetic: true,
  preCapWeightedAggregate: 5.37,
  severeDimensionCapTriggered: false,
  severeDimensionDetail: "No dimension scored in the `unsupported` band (0-2), so the cap did not engage. The lowest scores are 4 (maturity, manager_discretion, incident_history).",
  finalInternalSuitability: "partial" as const,
  meetsMinimum: false,
  minimumThreshold: 7,
  scoresAdjustedAfterSeeingAggregate: false,
  interpretation:
    "The weighted aggregate is 5.37 against a floor of 7, so this product does NOT meet the internal suitability minimum on automated assessment. The three heaviest drags are audit_security (5 × w15), manager_discretion (4 × w12) and liquidity_withdrawal (5 × w12) — an unaudited CPI layer that moves user funds, a single unlocked key directing ~20.7M USDC, and a zero-buffer reserve-dependent withdrawal path. The oracle_risk correction (+16 weighted points) moved the aggregate by 0.16 and changed nothing about the outcome: the shortfall is broad and structural, not a marginal miss. This is a recommendation of the evidence, not a verdict: a human reviewer may accept, reject, or override individual dimensions with a recorded rationale.",
} as const;

/* ------------------------------------------------------------------ *
 * Limitations + state
 * ------------------------------------------------------------------ */

export const ASSESSMENT_LIMITATIONS = [
  "Automated judgment is NOT human risk signoff.",
  "Model output may require human correction.",
  "Human review remains mandatory before any downstream act.",
  "Product approval remains a separate human decision.",
  "Scores are internal only and must never reach a user-facing surface.",
  "The assessment is bound to evidence manifest evidence_a86da1fd at cutoff 2026-07-16T17:08:42Z; it ages with that evidence.",
  "Allocation weights, reserve liquidity and fees change without notice, so slot-bound facts underpinning several scores are observations, not standing guarantees.",
  "The assessor is software authorized by the product owner; it did not review its own work and cannot.",
] as const;

export const ASSESSMENT_INVALIDATION_TRIGGERS = [
  "the evidence manifest hash changes",
  "the rubric version or hash changes",
  "a new program deployment postdates the assessment",
  "evidence passes the freshness policy",
  "any mandatory blocker becomes present",
  "the confidence or separation-of-duties policy is superseded in a way that affects actor authority",
] as const;

export const ASSESSMENT_STATE = {
  scoreAssignmentTransitions: ["not_submitted -> partially_scored", "partially_scored -> scoring_complete"],
  scoreAssignmentState: "scoring_complete" as const,
  productRiskStateTransitions: ["evidence_complete -> partially_scored", "partially_scored -> scoring_complete"],
  productRiskState: "scoring_complete" as const,
  /** Automated scoring does NOT advance human review. The reviewer has not looked at this yet. */
  humanReviewState: "awaiting_reviewer" as const,
  riskSignoffState: "not_started — human-only, unreachable until scoring_complete -> in_review -> reviewed -> awaiting_signoff",
  productApproved: false,
  productionApprovedProductCount: 0,
  productionStableYieldCard: "absent",
  demo: "unchanged",
} as const;

export const RAISED_ASSESSMENT_DIAGNOSTICS: AutomatedAssessmentDiagnostic[] = [
  "automated_assessment_requires_human_review",
  "human_review_pending",
];

export const ASSESSMENT_CONFERS = {
  humanReviewPerformed: false,
  riskSignoffCompleted: false,
  productApproved: false,
  productionEligibilityEnabled: false,
  evidenceAltered: false,
  rubricAltered: false,
  solStakingScoresAltered: false,
  note: "An automated assessment is an input to human review. It confers nothing on its own.",
} as const;

export function getAutomatedAssessorRecord() {
  return getAutomatedAssessor(ASSESSMENT_PROVENANCE.automatedActorId);
}

/* ------------------------------------------------------------------ *
 * Human-review handoff packet
 * ------------------------------------------------------------------ */

export interface HumanReviewRow {
  dimensionId: RiskRubricV1DimensionId;
  weight: number;
  automatedScore: number;
  automatedAnchorBand: AnchorBand;
  automatedRationale: string;
  automatedConfidence: RiskReviewConfidence;
  limitingFact: string;
  evidenceRefs: string[];
  /** Filled ONLY by a human reviewer, in a later task. Null here. */
  humanOverrideScore: null;
  humanOverrideRationale: null;
  humanReviewerId: null;
  humanReviewedAt: null;
}

/**
 * The handoff. It shows scores because it IS governance tooling for the reviewer — that is the one
 * place numbers legitimately appear, and it is never a user surface.
 *
 * The override fields are present and null. An override must PRESERVE the automated score, rationale
 * and confidence alongside the human replacement — the schema enforces that by keeping both, so a
 * reviewer cannot silently overwrite the machine's answer and erase what it actually said.
 */
export const HUMAN_REVIEW_PACKET = {
  packetId: "steakhouse_usdc_human_review_packet_001",
  assessmentId: ASSESSMENT_PROVENANCE.assessmentId,
  forRole: "risk_reviewer",
  reviewerActions: ["accept_all_scores", "reject_assessment", "request_reassessment", "override_individual_dimension"],
  overrideRequires: ["explicit human rationale", "reviewer identity", "timestamp", "preservation of the original automated score, rationale and confidence"],
  rows: AUTOMATED_DIMENSION_ASSESSMENTS.map((a): HumanReviewRow => ({
    dimensionId: a.dimensionId,
    weight: a.weight,
    automatedScore: a.score,
    automatedAnchorBand: a.anchorBand,
    automatedRationale: a.rationale,
    automatedConfidence: a.confidence,
    limitingFact: a.limitingFact,
    evidenceRefs: a.evidenceRefs,
    humanOverrideScore: null,
    humanOverrideRationale: null,
    humanReviewerId: null,
    humanReviewedAt: null,
  })),
  aggregate: AUTOMATED_ASSESSMENT_OUTCOME.preCapWeightedAggregate,
  band: AUTOMATED_ASSESSMENT_OUTCOME.finalInternalSuitability,
  meetsMinimum: AUTOMATED_ASSESSMENT_OUTCOME.meetsMinimum,
  mandatoryBlockerResult: AUTOMATED_ASSESSMENT_OUTCOME.mandatoryBlockerResult,
  severeDimensionCapTriggered: AUTOMATED_ASSESSMENT_OUTCOME.severeDimensionCapTriggered,
  limitations: ASSESSMENT_LIMITATIONS,
  /** Where a human should look hardest — the places most likely to be wrong or most consequential. */
  areasRequiringHumanAttention: [
    "oracle_risk (score 4, w8) — the THINNEST evidence of any dimension. Two of three rubric-mandated evidence items (stale-price handling, deviation/confidence handling) were never verified, and collateral-side oracles are unenumerated. A reviewer with access to Kamino's oracle documentation could move this materially in either direction.",
    "audit_security (score 5, w15) — the single heaviest contributor. Turns on a judgement call: does a 214-line unaudited CPI layer that moves user funds offset a hash-verified binary with every documented fix verified present? Reasonable reviewers could differ.",
    "composability_dependency (score 5, w8) — the mandatory blocker 'an unaudited integrated component carrying material funds' was recorded ABSENT because the unaudited CPI layer is kvault's OWN code rather than an integrated third-party component. If a reviewer reads that blocker as satisfied, the whole assessment fails at that dimension rather than scoring 5. This is the most consequential blocker call in the packet.",
    "manager_discretion (score 4, w12) — the whitelist mitigation was NOT credited because its contents and controller are unverified. If a reviewer verifies the whitelist, this could rise.",
    "incident_history (score 4, w2, confidence LOW) — the only low-confidence score. Bounded but genuinely uncertain; Kamino's answer to the questionnaire could move it.",
    "The aggregate 5.21 is well below the floor of 7. This is not a marginal miss that a single override would rescue — the shortfall is broad, across the three heaviest-weighted dimensions.",
  ],
  humanAcceptanceRecorded: false,
  humanOverrideRecorded: false,
  note: "No human acceptance, rejection, or override is recorded in this task. The reviewer has not seen this yet; human review state is awaiting_reviewer.",
} as const;
