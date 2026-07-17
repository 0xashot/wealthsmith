/**
 * klendDirectUsdcAutomatedAssessment — Step 16H-P.2. The first automated 12-dimension risk assessment
 * for the exact Kamino direct USDC lending reserve.
 *
 * OUTCOME: aggregate 5.93, floor 7, meetsMinimum FALSE.
 *
 * That is the finding, not a problem to be solved. The aggregate is an OUTPUT of twelve independently
 * evidence-bound scores; no score was chosen to move it, and 7 was never a target. It lands 0.56 above
 * Steakhouse's 5.37 for reasons that are individually traceable — one fewer program layer, fewer fees,
 * a simpler strategy, and incident evidence that actually covers this product's layer — and it is still
 * comfortably below the floor.
 *
 * SEPARATION OF DUTIES (risk_separation_of_duties_v2). This module is authored under the
 * `ws_automated_risk_assessor` identity. It may score and aggregate. It may NOT review, sign off, or
 * approve. The evidence PREPARER (claude_automated_evidence_preparer, 16H-P.1/P.1a) is a distinct role
 * from the ASSESSOR, and neither is a human reviewer. No reviewer identity is fabricated anywhere here.
 *
 * WHY THE SCORES ARE REPRODUCIBLE. Every score cites the exact rubric anchor band and the exact evidence
 * that put it there, plus the LIMITING FACT — the specific thing keeping it out of the next band up. No
 * rationale appeals to reputation, brand, or "generally safe".
 *
 * THE UNCOMFORTABLE FACTS ARE IN THE SCORES, NOT FOOTNOTED:
 *   • supplier principal can be written down via socialize_loss at 4-of-10 + 12h
 *   • a 2-of-7 multisig with ZERO timelock can freeze every exit immediately
 *   • the deployed binary is ~50 days old and no audit maps to it (date corrected at 16H-P.2a)
 *   • the borrower-collateral oracle surface — the supplier's dominant oracle exposure — is unexamined
 */
import { aggregateRiskScore, computeRubricV1Hash, PROTOCOL_RISK_RUBRIC_V1_ID, PROTOCOL_RISK_RUBRIC_V1_SEMVER, type RiskRubricV1DimensionId } from "./riskGovernance";
import type { RiskReviewConfidence } from "./riskReviewConfidencePolicy";
import type { AnchorBand, AutomatedDimensionAssessment } from "./steakhouseAutomatedAssessment";
import { anchorMatchesScore, AGGREGATE_COMPUTATION_VERSION } from "./steakhouseAutomatedAssessment";

export const DIRECT_USDC_ASSESSMENT_VERSION = "1.0.0" as const;
export const DIRECT_USDC_ASSESSMENT_ID = "klend_direct_usdc_automated_assessment_v1" as const;

/* ------------------------------------------------------------------ *
 * 1. Provenance
 * ------------------------------------------------------------------ */

export const DIRECT_ASSESSMENT_PROVENANCE = {
  assessmentId: DIRECT_USDC_ASSESSMENT_ID,
  assessmentVersion: DIRECT_USDC_ASSESSMENT_VERSION,
  candidateId: "kamino_usdc_lending",
  productType: "direct_lending",
  marketName: "SOL/BTC Market",
  marketHistoricalAlias: "Main Market",
  marketAddress: "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF",
  reserveAddress: "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59",
  liquidityMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  cTokenMint: "B8V6WVjPxW1UGwVDfxH2d2r8SyT4cqn7dQRK6XneVa7D",
  klendProgram: "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD",
  cluster: "mainnet-beta",

  evidencePackageId: "klend_direct_usdc_risk_evidence_package_v1",
  evidencePackageVersion: "1.0.0",
  evidencePackageManifest: "risk_package_3711fd25",
  authorityEvidenceId: "klend_direct_usdc_authority_evidence_v1",
  authorityEvidenceManifest: "authority_evidence_a99ace84",

  rubricId: PROTOCOL_RISK_RUBRIC_V1_ID,
  rubricVersion: PROTOCOL_RISK_RUBRIC_V1_SEMVER,
  rubricHash: computeRubricV1Hash(),
  confidencePolicyId: "risk_review_confidence_v2",
  confidencePolicyVersion: "1.0.0",
  separationOfDutiesId: "risk_separation_of_duties_v2",
  separationOfDutiesVersion: "1.0.0",

  assessorId: "ws_automated_risk_assessor",
  assessorRole: "automated_risk_assessor" as const,
  evidencePreparerId: "claude_automated_evidence_preparer",
  assessorIsNotPreparer: true,
  assessorIsNotHumanReviewer: true,
  assessorMayNotSignOffOrApprove: true,

  assessmentCutoff: "2026-07-17T11:35:00.000Z",
  assessmentAlgorithmVersion: AGGREGATE_COMPUTATION_VERSION,
  aggregateIsAnOutputNotATarget: true,
  thresholdTargeting: false,
} as const;

/* ------------------------------------------------------------------ *
 * 2. The 12 dimensions
 *
 * Bands (approved rubric, unchanged):
 *   0-2  unsupported | 3-4 weak | 5-6 partial | 7-8 supported | 9-10 strongly_supported
 * ------------------------------------------------------------------ */

export interface DirectDimensionAssessment extends AutomatedDimensionAssessment {
  evidenceReadiness: "complete" | "partial";
  favorableEvidence: string[];
  unfavorableEvidence: string[];
  unresolvedLimitations: string[];
  prohibitedInference: string;
  invalidationTriggers: string[];
  reviewerFocus?: string;
}

export const DIRECT_DIMENSION_ASSESSMENTS: DirectDimensionAssessment[] = [
  {
    dimensionId: "audit_security" as RiskRubricV1DimensionId,
    weight: 15,
    score: 6,
    anchorBand: "partial",
    evidenceReadiness: "partial",
    confidence: "medium",
    limitingFact: "NO audit maps to the deployed binary. Sec3 cites 8273031ea75e3972cce5314cefe3e88f962927c5, Offside cites master + 4 hashes, OtterSec cites 8a4b1fe — `git cat-file` proved NONE exist in the public repository, so every referenced commit is private and unmappable. The deployed code (slot 422723185) dates from 2026-05-28T12:47:42Z — ~50 days old at assessment, CORRECTED AT 16H-P.2a from an erroneous 2026-07-14 (the KVault binary date, a different program). No published report postdates it either way, so the linkage gap is unaffected by the correction.",
    rationale:
      "Reports EXIST and their scope is verified from primary sources: traditional audits (Sec3, Offside, OtterSec), plus formal-verification and fuzzing inventories — a materially richer artifact set than KVault's, and the program is a verified build (solana-verify / OtterSec). That places evidence in the `partial` band: it covers the main risk surface but leaves one named, bounded gap. It does NOT reach `supported`, because 'reports exist' and 'the running code is audited' are different claims and only the first is established. Scored 6 rather than 5 because the artifact set includes formal verification and fuzzing, which KVault lacks; not 7, because the binary-linkage gap is exactly the question this dimension asks.",
    favorableEvidence: [
      "traditional audits from three independent firms, scope verified",
      "formal verification inventory exists",
      "fuzzing inventory exists",
      "the deployed program is a verified build (verify.osec.io)",
      "coverage is materially broader than KVault's",
    ],
    unfavorableEvidence: [
      "no referenced audit commit exists in the public repository — all are private-repo commits",
      "no report can be mapped to the deployed binary",
      "the deployed binary dates from 2026-05-28 (~50 days at assessment); no published review postdates it",
      "uncovered deployed surface is unquantified",
    ],
    unresolvedLimitations: ["which audited commit, if any, corresponds to the deployed binary", "what deployed surface no report covers"],
    prohibitedInference: "That multiple reports existing means the current binary is covered. It does not.",
    invalidationTriggers: ["KLend program upgrade", "a new audit", "a public commit mapping is published"],
    evidenceRefs: ["steakhouseSecurityEvidenceAmendment.ts", "steakhouseAuditCoverage.ts", "risk_package_3711fd25"],
    mandatoryBlockerPresent: false,
    reviewerFocus: "Whether a 6 is defensible when zero reports map to the running code. Missing linkage evidence could plausibly move this one band in either direction.",
  },
  {
    dimensionId: "maturity" as RiskRubricV1DimensionId,
    weight: 8,
    score: 4,
    anchorBand: "weak",
    evidenceReadiness: "partial",
    confidence: "low",
    limitingFact: "The exact RESERVE's age and configuration history are unverified, and the deployed binary dates from 2026-05-28 (slot 422723185, ~50 days at assessment) — CORRECTED AT 16H-P.2a from an erroneous 2026-07-14 (the KVault date). Authority tenure is unresolved for all three multisigs, so no administrative regime can be dated.",
    rationale:
      "Market-level maturity is genuinely strong: this is Kamino's PRIMARY market (API isPrimary: true), operating since at least November 2023 with five documented stress events (Feb 2025 → Feb 2026) reporting $0 bad debt. But this dimension asks about the maturity of the EXACT CURRENT CONFIGURATION, and that is materially incomplete: reserve creation date unknown, configuration-continuity record unknown, authority tenure unknown, and the code holding funds is days old. Protocol age is not reserve age, and it is not binary age. `weak` — evidence exists but is materially incomplete on precisely the reserve-specific facts required.",
    favorableEvidence: [
      "the exact market is Kamino's primary market, operating since ~Nov 2023",
      "five named stress events with reported $0 bad debt across the lending markets",
      "market identity verified on-chain and via official API",
    ],
    unfavorableEvidence: [
      "exact reserve creation date and configuration history UNVERIFIED",
      "deployed binary dates from 2026-05-28, ~50 days at assessment",
      "code continuity across binaries not established",
      "authority tenure unresolved for all three multisigs",
    ],
    unresolvedLimitations: ["reserve age", "configuration stability period", "code continuity", "authority tenure"],
    prohibitedInference: "That protocol age or primary-market status proves the exact current reserve configuration is mature. It does not.",
    invalidationTriggers: ["reserve configuration change", "KLend upgrade", "reserve age evidence obtained"],
    evidenceRefs: ["incident_alias_evidence_3023570a", "identity_9773ac14", "authority_evidence_a99ace84"],
    mandatoryBlockerPresent: false,
    reviewerFocus: "Reserve-level history is absent. If the reserve turns out to be long-lived and stable, this could move up one band.",
  },
  {
    dimensionId: "upgrade_admin_authority" as RiskRubricV1DimensionId,
    weight: 15,
    score: 7,
    anchorBand: "supported",
    evidenceReadiness: "partial",
    confidence: "medium",
    limitingFact: "Authority TENURE is unresolved for all three multisigs, and a fourth layer — proposer_authority 6pwkb7uMsvqgmwPBKc3o4hnte6JnHpisSUrsdyvGcEUv — is an off-curve PDA that does not resolve as a Squads v4 vault at tested indices; no material control path is established for it, but none is excluded either.",
    rationale:
      "The authority model is COMPLETE AND VERIFIABLE for the three layers that hold power, which is what `supported` requires. Each resolves to an exact Squads v4 vault PDA with an on-chain threshold and timelock, and — decisively — config_authority is Pubkey::default on all three, so the multisigs are AUTONOMOUS and no external key can bypass a threshold. That bypass-absence was verified, not assumed; without it the 'N-of-M + timelock' summary would be false. Scored 7 and not higher because the structure itself carries real, verified risk: socialize_loss can write down supplier principal at 4-of-10 + 12h, and a 2-of-7 council with ZERO timelock can freeze every exit immediately while only a 4-of-10 + 12h market-owner action can reverse it. Scored 7 and not lower because those are properties of a fully-characterized structure, not gaps in evidence.",
    favorableEvidence: [
      "program upgrade: Squads v4 vault PDA GzFgdRJ… of multisig 6hhBGCt… index 0 — 5-of-10, 24h timelock",
      "market owner: Squads v4 vault PDA 24LjDBuk… of multisig 7idEEVR… index 0 — 4-of-10, 12h timelock",
      "emergency council: Squads v4 vault PDA 4VtJ1yC… of multisig 9thcmUR… index 0 — 2-of-7, restrictive-only",
      "config_authority default on all three — autonomous, NO threshold bypass exists (verified)",
      "no single member can approve alone at any layer (thresholds 5 / 4 / 2)",
      "approval, timelock, execution and cancellation are separate stages",
      "the emergency council cannot socialize losses, upgrade KLend, change the market owner, touch oracles or curves, or move funds",
    ],
    unfavorableEvidence: [
      "socialize_loss (has_one lending_market_owner) can write down SUPPLIER PRINCIPAL at 4-of-10 after 12h — a structural loss path under discretionary control",
      "the emergency council can freeze all exits at 2-of-7 with ZERO timelock; reversal needs 4-of-10 + 12h",
      "the program is upgradeable — the code holding funds can be replaced at 5-of-10 + 24h",
      "the upgrade and market-owner multisigs share 9 of 10 member keys, reducing practical independence between the two authorities",
      "authority tenure unresolved; a fourth authority layer has unknown powers",
    ],
    unresolvedLimitations: ["tenure for all three multisigs", "proposer_authority type, controller and powers", "whether any threshold/timelock changed historically"],
    prohibitedInference: "That the presence of multisigs and timelocks eliminates admin risk. It bounds and delays it; it does not remove it. Also: KVault's 5-of-10 + 24h coincides numerically but was verified independently — inheriting it would have been right by luck.",
    invalidationTriggers: ["set_upgrade_authority", "update_lending_market_owner", "emergency-council reassignment", "any Squads config/member/threshold/timelock change", "proposer_authority material powers discovered"],
    evidenceRefs: ["authority_evidence_a99ace84", "klendDirectUsdcAuthorityEvidence.ts"],
    mandatoryBlockerPresent: false,
    reviewerFocus: "The 9-of-10 member overlap between the upgrade and market-owner multisigs, and whether a 2-of-7 zero-timelock freeze power should cap this dimension below `supported`.",
  },
  {
    dimensionId: "manager_discretion" as RiskRubricV1DimensionId,
    weight: 12,
    score: 5,
    anchorBand: "partial",
    evidenceReadiness: "partial",
    confidence: "medium",
    limitingFact: "The market owner can mutate 15 material economic and risk parameters — including the borrow-rate curve, take rate, oracle configuration, caps, reserve status and block_ctoken_usage — and can invoke socialize_loss against supplier principal, all at 4-of-10 + 12h. Authority tenure is unresolved.",
    rationale:
      "This dimension IS applicable to direct lending (product-owner clarification) and evaluates discretionary control over material parameters AFTER deposit. Favorable: there is no KVault allocation manager, no multi-reserve reallocation layer, and the depositor stays in ONE exact reserve — strictly less discretionary surface than Steakhouse, which carries BOTH a vault manager AND this same underlying market owner. Unfavorable: the market owner's power over this reserve is broad and directly economic, and socialize_loss reaches principal itself. `partial` — the mutable surface is enumerated from deployed code and the constraining authority is verified, leaving a named, bounded gap (tenure, proposer_authority). Scored 5 not 4 because removing the vault-manager layer is a real reduction; not 6, because the retained market-owner powers are extensive and reach principal.",
    favorableEvidence: [
      "NO KVault allocation manager and no dynamic multi-reserve reallocation — the depositor remains in one exact reserve",
      "the emergency council cannot loosen risk limits or socialize losses (restrictive-only, verified allowlist with `_ => false` fallback)",
      "every mutation is constrained by a verified 4-of-10 multisig with a 12h timelock and no bypass",
      "strictly less discretionary surface than Steakhouse, which has this market owner PLUS a vault manager",
    ],
    unfavorableEvidence: [
      "deposit_limit / borrow_limit mutable",
      "borrow_rate_curve mutable",
      "protocol_take_rate_pct and host_fixed_interest_rate_bps mutable",
      "reserve status, emergency_mode and block_ctoken_usage mutable",
      "oracle configuration mutable",
      "collateral and liquidation parameters mutable",
      "deposit_withdrawal_cap (rolling limit) mutable",
      "market permissioning mutable",
      "socialize_loss can write down supplier principal",
      "effective control is 4-of-10 + 12h",
    ],
    unresolvedLimitations: ["authority tenure", "whether proposer_authority holds any discretionary power"],
    prohibitedInference: "That the absence of a KVault allocation manager alone implies low discretion. The market owner retains broad, principal-reaching power over this reserve.",
    invalidationTriggers: ["reserve config change", "market-owner change", "Squads config change", "proposer_authority powers discovered"],
    evidenceRefs: ["authority_evidence_a99ace84", "capacity_evidence_e54e310a", "constraints_evidence_7301883a", "availability_evidence_078133b7"],
    mandatoryBlockerPresent: false,
    reviewerFocus: "Whether socialize_loss reaching principal at 4-of-10 + 12h should hold this in the `weak` band regardless of the absent vault layer.",
  },
  {
    dimensionId: "strategy_complexity" as RiskRubricV1DimensionId,
    weight: 10,
    score: 6,
    anchorBand: "partial",
    evidenceReadiness: "complete",
    confidence: "high",
    limitingFact: "Liquidation mechanics were reviewed at the market layer, not re-derived per collateral asset. Supplier value depends on borrower repayment and successful liquidation of collateral the supplier never chose.",
    rationale:
      "The mechanism is fully derived from deployed code (16H-N.2 → N.7): the user supplies USDC to ONE reserve and receives cTokens whose value accrues solely via the collateral exchange rate (1 cToken ≈ 1.1918 USDC at observation), driven by borrower interest at the reserve's utilization on a verified rate curve. No allocation layer, no strategy rotation, no supply-side leverage. That is genuinely simpler than a vault. It is NOT equivalent to holding USDC: the supplier takes borrower credit exposure, liquidation-mechanics exposure, and a socialized-loss path that can write down principal. `partial` — the main risk is covered by complete evidence, with one named, bounded gap (per-asset liquidation review). Scored 6 not 5 because the absent vault layer is a real simplification versus Steakhouse; not 7, because borrower and liquidation exposure are inherent and unexamined per-asset.",
    favorableEvidence: [
      "direct single-reserve supply; no allocation layer, rotation or supply-side leverage",
      "value accrual mechanism fully derived from deployed code",
      "exact redemption mechanics verified, including floor rounding and the integer inverse",
      "rate model verified: borrow_rate_curve at utilization, 10% take rate",
    ],
    unfavorableEvidence: [
      "supplier is exposed to borrower credit and to liquidation mechanics for collateral they did not choose",
      "a socialized-loss path exists — principal is not structurally protected",
      "returns depend on utilization, which the supplier does not control",
    ],
    unresolvedLimitations: ["per-collateral-asset liquidation review"],
    prohibitedInference: "That single-reserve exposure means low risk, or that supplying USDC here is equivalent to holding USDC. It is not — it is a credit position.",
    invalidationTriggers: ["KLend upgrade altering the supply or rate model", "new collateral assets added to the market"],
    evidenceRefs: ["identity_9773ac14", "position_evidence_fb2bb70b", "availability_evidence_078133b7", "measured_apy_evidence_ebc7627d"],
    mandatoryBlockerPresent: false,
  },
  {
    dimensionId: "composability_dependency" as RiskRubricV1DimensionId,
    weight: 8,
    score: 6,
    anchorBand: "partial",
    evidenceReadiness: "complete",
    confidence: "medium",
    limitingFact: "The Scope oracle provider chain's own upstream dependencies were reviewed at configuration level, not traced to each ultimate price source. Borrower collateral markets are a live dependency the supplier inherits.",
    rationale:
      "The dependency set is enumerated from deployed code: KLend program, Solana runtime, classic SPL Token program (no Token-2022 extensions), Scope oracles, Squads authorities, borrower collateral markets and liquidation infrastructure. It is one program layer SHORTER than Steakhouse — there is no KVault→KLend CPI — and there is no multi-protocol yield composition. That is a real reduction, not an absence. `partial` — the dependency set is fully enumerated with one named, bounded gap (upstream oracle depth). Scored 6 not 5 for the removed CPI layer; not 7, because the oracle upstream is untraced and collateral-market dependency is inherent.",
    favorableEvidence: [
      "no KVault→KLend CPI layer — one fewer program than Steakhouse",
      "classic SPL Token program only; no Token-2022 extensions, transfer hooks or fees",
      "no multi-protocol yield composition",
      "dependency set enumerated from deployed code",
    ],
    unfavorableEvidence: [
      "direct dependency on KLend, the Solana runtime, Scope oracles and Squads authorities",
      "borrower collateral markets and liquidation infrastructure are inherited dependencies",
      "upstream oracle provider depth not fully traced",
    ],
    unresolvedLimitations: ["Scope's ultimate upstream price sources per collateral asset"],
    prohibitedInference: "That removing the KVault layer means no composability risk. Direct lending is not dependency-free.",
    invalidationTriggers: ["oracle configuration change", "token program change", "KLend upgrade", "new collateral markets"],
    evidenceRefs: ["identity_9773ac14", "availability_evidence_078133b7", "constraints_evidence_7301883a"],
    mandatoryBlockerPresent: false,
  },
  {
    dimensionId: "oracle_risk" as RiskRubricV1DimensionId,
    weight: 8,
    score: 5,
    anchorBand: "partial",
    evidenceReadiness: "partial",
    confidence: "low",
    limitingFact: "THE BORROWER-COLLATERAL ORACLE SURFACE IS UNEXAMINED — and that is a USDC supplier's DOMINANT oracle exposure. If a collateral oracle fails or is manipulated, liquidation fails and the loss lands on suppliers. The USDC reserve's own price controls do not speak to that at all.",
    rationale:
      "The exact USDC reserve's oracle configuration is verified on-chain and is genuinely tight: Scope provider chain, maxAgePriceSeconds 180/300, maxAgeTwapSeconds 240/300, maxTwapDivergenceBps 300, price band 0.98–1.01, with staleness and deviation controls enforced by the program. But a supplier is not primarily exposed to the price of the asset they supplied — they are exposed to the prices of the collateral backing the borrows against it. That surface has not been assessed: neither the collateral reserves' oracle configurations, nor provider diversity across them, nor the market-wide collateral composition. `partial` — real, verified evidence on one side of the exposure, with a named gap on the side that matters more. Scored 5 rather than 6 (Steakhouse's score on the same USDC-side evidence) because direct supply concentrates the supplier's exposure in THIS market's collateral, where a vault spreads it across four.",
    favorableEvidence: [
      "exact USDC reserve oracle config verified on-chain: maxAge 180/300, TWAP 240/300, divergence 300bps, band 0.98–1.01",
      "Scope provider chain documented at kamino.com/docs/security",
      "staleness and deviation controls are program-enforced, not advisory",
    ],
    unfavorableEvidence: [
      "borrower-collateral oracle configurations NOT assessed — the supplier's dominant oracle exposure",
      "provider diversity across collateral assets unknown",
      "market-wide collateral composition unknown",
      "oracle configuration is market-owner-mutable at 4-of-10 + 12h",
      "direct supply concentrates collateral exposure in a single market",
    ],
    unresolvedLimitations: ["every collateral reserve's oracle configuration", "collateral composition and its oracle redundancy"],
    prohibitedInference: "That verified USDC price controls mean low oracle risk for a USDC supplier. A tight band on a stablecoin says nothing about collateral volatility or collateral-oracle failure.",
    invalidationTriggers: ["oracle configuration change on this or any collateral reserve", "Scope provider change", "collateral-oracle evidence obtained"],
    evidenceRefs: ["steakhouseIncidentEvidence.RESERVE_ORACLE_CONFIG", "risk_package_3711fd25", "kamino.com/docs/security"],
    mandatoryBlockerPresent: false,
    reviewerFocus: "PRIORITY. The dominant oracle exposure is unexamined. Collateral-side evidence could plausibly move this two bands in either direction — it is the single largest evidence gap in this assessment.",
  },
  {
    dimensionId: "liquidity_withdrawal" as RiskRubricV1DimensionId,
    weight: 12,
    score: 6,
    anchorBand: "partial",
    evidenceReadiness: "complete",
    confidence: "high",
    limitingFact: "Exit liquidity is utilization-dependent and can be frozen. Borrowed funds are not available to pay out; the exact limit is freely_available = total_available − queued. Emergency mode blocks redemption AND can be enabled by a 2-of-7 multisig with ZERO timelock, reversible only by a 4-of-10 + 12h market-owner action.",
    rationale:
      "The withdrawal path is verified end-to-end from deployed code: redeem_reserve_collateral → redeem_collateral → collateral_to_liquidity (floor) → withdraw_freely_available, with the exact limit being liquidity.total_available_amount − queued_liquidity_amount (reserve.rs L219-224, L901-913) — NOT total_supply, which includes borrowed funds that are not there to pay out. There is no lockup, no cooldown, no regular-path FIFO queue, no withdrawal fee, and partial redemption is a first-class path with a maximal integer inverse proven against the mirrored predicate. Stale state fails closed. That is complete evidence. The score is `partial` because the RISK is structural, not evidentiary: current liquidity is a snapshot, exits depend on borrower repayment, and a 2-of-7 zero-timelock authority can freeze them. Scored 6 not 5 because the mechanics are fully verified and unusually clean; not 7, because verified mechanics do not make liquidity guaranteed.",
    favorableEvidence: [
      "exact withdrawal path verified end-to-end from deployed code",
      "no lockup, no cooldown, no withdrawal fee, no regular-path queue",
      "partial redemption supported; maximal integer inverse proven, never overstating the claim",
      "stale state fails closed (ReserveStale); WealthSmith's liquid-buffer recognition fails closed too",
      "the regular redeem path applies NO reserve-status, block_ctoken_usage or permissioning gate — deposits can be disabled while exits stay open",
    ],
    unfavorableEvidence: [
      "liquidity is utilization-dependent; borrowed funds are not immediately available",
      "queued liquidity reduces freely available liquidity",
      "a rolling withdrawal cap applies (90M USDC / 86,400s), distinct from liquidity",
      "emergency mode freezes redemption — the ONE gate symmetric with deposits",
      "a 2-of-7 multisig with ZERO timelock can enable emergency mode; reversal requires 4-of-10 + 12h",
      "current freely available liquidity is a slot-bound snapshot, not a future guarantee",
    ],
    unresolvedLimitations: ["RedeemCollateralOptions::REGULAR field values not located — the conservative freely-available branch is used, which understates rather than overstates accessibility"],
    prohibitedInference: "That current liquidity is guaranteed future liquidity, or that 'no cooldown' means always withdrawable. Exits remain subject to emergency mode, fresh state, freely available liquidity and the rolling cap. Users cannot always leave.",
    invalidationTriggers: ["utilization change", "queue becomes non-zero", "emergency mode enabled", "rolling-cap config change", "KLend upgrade"],
    evidenceRefs: ["availability_evidence_078133b7", "constraints_evidence_7301883a", "position_evidence_fb2bb70b", "authority_evidence_a99ace84"],
    mandatoryBlockerPresent: false,
    reviewerFocus: "Whether a 2-of-7 zero-timelock freeze power should hold this below `partial` despite fully verified mechanics.",
  },
  {
    dimensionId: "asset_stablecoin_risk" as RiskRubricV1DimensionId,
    weight: 5,
    score: 8,
    anchorBand: "supported",
    evidenceReadiness: "complete",
    confidence: "high",
    limitingFact: "USDC is a centralized, issuer-redeemable stablecoin: Circle retains freeze/blacklist capability at the mint level, and depeg risk is inherent. Identity being canonical does not remove either.",
    rationale:
      "The liquidity mint is verified as canonical Circle USDC (EPjFWdd5…Dt1v) — not a bridged or wrapped variant — under the classic SPL Token program with no Token-2022 extensions, no transfer hook and no transfer fee. Identity, token program and issuer model are all verified from primary sources, which is what `supported` requires. WealthSmith does not assume 1 USDC = $1: USD recognition requires an approved fresh exact-mint price (the Kamino API's own totalSupplyUsd/totalSupply implies ≈$0.99985). Scored 8 rather than 9-10 because complete verification of a centralized-issuer asset is not defence-in-depth against that issuer: freeze capability and depeg risk remain, and no mitigation exists at this layer. Identical asset and identical profile to Steakhouse, scored identically.",
    favorableEvidence: [
      "canonical Circle USDC mint verified — not bridged or wrapped",
      "classic SPL Token program; no Token-2022 extensions, hooks or transfer fees",
      "USDC is not assumed to equal $1; USD recognition requires a fresh approved exact-mint price",
    ],
    unfavorableEvidence: [
      "Circle retains mint-level freeze/blacklist capability",
      "centralized issuer dependency",
      "depeg risk is inherent and unmitigated at this layer",
    ],
    unresolvedLimitations: ["depeg history not re-derived in this package"],
    prohibitedInference: "That canonical mint identity eliminates issuer or depeg risk. It only establishes WHICH asset is at risk.",
    invalidationTriggers: ["mint authority or freeze authority change", "a depeg event", "issuer policy change"],
    evidenceRefs: ["identity_9773ac14", "position_evidence_fb2bb70b"],
    mandatoryBlockerPresent: false,
  },
  {
    dimensionId: "withdrawal_fee_transparency" as RiskRubricV1DimensionId,
    weight: 3,
    score: 8,
    anchorBand: "supported",
    evidenceReadiness: "complete",
    confidence: "high",
    limitingFact: "Fee fields (protocol_take_rate_pct, host_fixed_interest_rate_bps) are market-owner-mutable at 4-of-10 + 12h, and the deposit ceil-back rounds sub-unit dust in the protocol's favour.",
    rationale:
      "Every fee item was classified from the deployed code path, not from documentation: no deposit fee (originationFeeSf is a BORROW fee and never touches a supplier's deposit); no withdrawal fee and no penalty (redeem_reserve_collateral returns the floored liquidity_amount unmodified); no management or performance fee — those are KVault concepts absent from reserve config, so Steakhouse's 5% performanceFeeBps does NOT transfer here. The protocol take rate (10%) is an INTEREST-REVENUE SHARE of borrower interest, already incorporated into the supply APY, never deducted from a deposit or withdrawal — calling it a withdrawal fee would be wrong. Redemption rounding is known and exact; no hidden price-based conversion is used. Scored 8 — a full band above Steakhouse's 7 — because direct lending has strictly FEWER fees than the vault, with no performance or management fee at all. Not 9-10 because the fee surface is mutable and the ceil-back dust, while sub-unit, favours the protocol.",
    favorableEvidence: [
      "no deposit fee, no withdrawal fee, no withdrawal penalty — each verified from the deployed path",
      "no management fee and no performance fee (KVault concepts; Steakhouse's 5% does not transfer)",
      "the take rate is transparently an interest-revenue share, not a withdrawal fee",
      "redemption rounding is exact and known; no hidden price-based cToken conversion",
    ],
    unfavorableEvidence: [
      "fee fields are market-owner-mutable at 4-of-10 + 12h",
      "the deposit ceil-back means a depositor can pay up to one base unit more than their minted cTokens are worth; that dust accrues to existing suppliers",
    ],
    unresolvedLimitations: [],
    prohibitedInference: "That the protocol take rate is a user withdrawal fee, or that 'no fees' means no economic extraction — the take rate is 10% of borrower interest.",
    invalidationTriggers: ["fee config change", "take-rate change", "KLend upgrade"],
    evidenceRefs: ["constraints_evidence_7301883a"],
    mandatoryBlockerPresent: false,
  },
  {
    dimensionId: "operational_dependency_risk" as RiskRubricV1DimensionId,
    weight: 2,
    score: 6,
    anchorBand: "partial",
    evidenceReadiness: "complete",
    confidence: "medium",
    limitingFact: "Protocol-level operation depends on Solana RPC availability, block-time availability for slot-duration measurement, Scope oracle providers, and three Squads multisigs. USD Safety Buffer recognition additionally requires an approved fresh exact-mint price.",
    rationale:
      "Dependencies are enumerated and every failure mode is implemented and tested as fail-closed: stale slot duration, stale reserve state, excessive source skew, missing block times and unresolved identity each BLOCK rather than degrade. The Kamino API is diagnostic-only and was demonstrated to be cached (byte-identical across 20 minutes while chain state moved), so it is never a production authority. The RPC URL is a Node-only env var, never VITE_-prefixed, so no secret reaches the browser. Per the rubric, WealthSmith's own engineering effort is NOT scored as protocol risk. Scored 6 rather than 5 because the KVault layer is absent and every dependency has a verified fail-closed path; not 7, because the protocol genuinely depends on external oracle providers and multisig operators whose operational practices are unexamined.",
    favorableEvidence: [
      "all adapters fail closed — stale/skewed/missing data blocks rather than degrades",
      "the API is diagnostic-only and demonstrably cached; never a production authority",
      "no secret reaches browser code (Node-only RPC env var)",
      "one fewer program layer than Steakhouse",
    ],
    unfavorableEvidence: [
      "depends on Solana RPC and historical block-time availability",
      "depends on Scope oracle providers whose operational practices are unexamined",
      "depends on three Squads multisigs whose operators are unidentified",
      "USD buffer recognition depends on an approved fresh exact-mint price",
    ],
    unresolvedLimitations: ["oracle provider operational practices", "multisig operator practices"],
    prohibitedInference: "That WealthSmith's integration effort is protocol risk, or that fail-closed behaviour eliminates dependency risk. Failing closed makes a dependency failure safe, not absent.",
    invalidationTriggers: ["SDK upgrade", "oracle provider change", "RPC provider change"],
    evidenceRefs: ["solana_slot_duration_methodology_v1", "measured_apy_evidence_ebc7627d", "availability_evidence_078133b7"],
    mandatoryBlockerPresent: false,
  },
  {
    dimensionId: "incident_history" as RiskRubricV1DimensionId,
    weight: 2,
    score: 5,
    anchorBand: "partial",
    evidenceReadiness: "partial",
    confidence: "low",
    limitingFact: "The deployed binary (2026-05-28, corrected at 16H-P.2a) postdates every documented event (latest 2026-02-05/06). CORRECTED AT 16H-S.0: monthly Risk Insights continue through June 2026 (published 2026-07-03), which POSTDATES this binary — the prior 'latest report is April 2026' was a search failure. Those are market-risk monitoring, not code review, so the precise surviving gap is that no CODE review covers the code holding funds. Reserve existence and USDC exposure during each event window are unverified, and no socialize_loss history search bound to this exact reserve was completed.",
    rationale:
      "Unlike Steakhouse, this product IS the layer the official evidence covers. The exact market is named in the Feb 2026 case study as 'Main' — Main Market and SOL/BTC Market are the same account 7u3He… (on-chain name is a mutable field on a stable address; the API marks that exact address isPrimary: true; the UI states the rename verbatim; confidence high, not absolute). Official material reports $0 bad debt since November 2023 across five named stress events with no service degradation. Steakhouse's two fatal gaps — 'wrong subject' (a vault on a separate program) and 'the kvault program is uncovered' — do NOT apply here, and that is a material difference that must not be flattened. Scored 5 rather than Steakhouse's 4 for that reason alone. Scored 5 and NOT higher deliberately: zero bad debt is not zero incidents and not zero exploits; 'zero confirmed incidents' is a SEARCH RESULT, not a clean record; the binary postdates the evidence; and event-window binding is unverified. More directly applicable evidence is not the same as more evidence.",
    favorableEvidence: [
      "the exact market IS named in official stress-event material, as 'Main' (alias verified three ways)",
      "official material reports $0 bad debt across five named stress events (Feb 2025 → Feb 2026), with continued operation",
      "this evidence speaks to the lending-market layer — exactly this product's layer",
      "(added at 16H-S.0) the Oct 10 2025 risk event analysis (gov forum, 2025-10-11) covers the exact market by name: Main Market took $16M of $20M liquidations during ~30% drawdowns with $0 bad debt, an official NO-SOCIALIZED-LOSSES attestation, 8,000+ liquidations processed with zero failures, and no withdrawal issues — a second detailed per-event primary source, found only when the forum's index was finally enumerated",
      "Steakhouse's KVault-specific scope gaps do not apply",
    ],
    unfavorableEvidence: [
      "the deployed binary postdates every documented event",
      "exact reserve existence during each event window UNVERIFIED",
      "USDC supplier exposure during each event UNVERIFIED",
      "authority tenure unresolved — statements cannot be attributed to a known administrative regime",
      "socialize_loss history for this exact reserve unsearched",
      "unresolved third-party incident leads remain open",
    ],
    unresolvedLimitations: ["event-window binding", "binary currency", "socialize_loss history", "market-owner period"],
    prohibitedInference: "That zero bad debt means zero incidents or zero exploits, or that 'no confirmed incidents found' proves none occurred — it is a SEARCH RESULT, not a clean record. Also: that market-layer coverage covers the deployed binary.",
    invalidationTriggers: ["a new official incident report", "a review postdating the deployed binary", "market rename or isPrimary reassignment", "a socialize_loss event", "material bad-debt event"],
    evidenceRefs: ["incident_alias_evidence_3023570a", "steakhouseIncidentEvidence.ts"],
    mandatoryBlockerPresent: false,
    reviewerFocus: "Whether 5 overcorrects relative to Steakhouse's 4 simply because the evidence is more applicable. Applicability is not sufficiency.",
  },
];

/* ------------------------------------------------------------------ *
 * 3. Aggregation — by the approved engine, never by hand
 * ------------------------------------------------------------------ */

export function computeDirectAggregate(items: DirectDimensionAssessment[] = DIRECT_DIMENSION_ASSESSMENTS) {
  return aggregateRiskScore({
    rubricLifecycle: "approved",
    evidence: "complete",
    mandatoryBlockersPresent: items.filter((a) => a.mandatoryBlockerPresent).map((a) => a.dimensionId),
    scores: items.map((a) => ({ id: a.dimensionId, score: a.score, hasRationale: a.rationale.length > 0, hasEvidence: a.evidenceRefs.length > 0, notApplicable: a.notApplicable })),
  });
}

export const DIRECT_AGGREGATE_RESULT = computeDirectAggregate();

/** Unrounded: 593 weighted points / 100 weight = 5.93 exactly. No rounding artifact exists at this precision. */
export const DIRECT_ASSESSMENT_OUTCOME = {
  computationVersion: AGGREGATE_COMPUTATION_VERSION,
  mandatoryBlockerResult: "none_present" as const,
  blockersEvaluatedBeforeArithmetic: true,
  weightedPoints: 593,
  totalWeight: 100,
  unroundedAggregate: 5.93,
  displayedAggregate: 5.93,
  roundingApplied: false,
  roundingNote: "593/100 terminates exactly at two decimals; the displayed and unrounded values are identical and no rounding rule was engaged.",
  minimumThreshold: 7,
  meetsMinimum: false,
  scoresAdjustedAfterSeeingAggregate: false,
  thresholdTargeting: false,
  interpretation:
    "5.93 against a floor of 7. meetsMinimum is FALSE and that is the finding. The aggregate is an OUTPUT of twelve independently evidence-bound scores. It sits 0.56 above Steakhouse's 5.37 for individually traceable reasons — one fewer program layer (composability 5→6), no vault manager (manager_discretion 4→5), no performance/management fee (fees 7→8), a simpler strategy (5→6), richer audit artifacts (5→6), fully-verified exit mechanics (5→6), and incident evidence that actually covers this layer (4→5) — partly offset by a lower oracle score (6→5), because direct supply concentrates collateral exposure in one market. It is still well below the floor.",
  distanceToThresholdIsNotAGoal: "The gap to 7 is recorded nowhere as a target. No score was chosen to close it.",
} as const;

export const LOWEST_SCORING_DIMENSIONS = ["maturity (4)", "manager_discretion (5)", "oracle_risk (5)", "incident_history (5)"] as const;
export const LOWEST_CONFIDENCE_DIMENSIONS = ["maturity (low)", "oracle_risk (low)", "incident_history (low)"] as const;

/** Dimensions where missing evidence could plausibly move the score by one or more anchors. */
export const HUMAN_REVIEW_FOCUS_AREAS = [
  { dimensionId: "oracle_risk", why: "PRIORITY — the borrower-collateral oracle surface is the supplier's dominant oracle exposure and is entirely unexamined. Could move two bands either way. The single largest evidence gap in this assessment.", couldMoveBands: 2 },
  { dimensionId: "audit_security", why: "Zero audits map to the deployed binary (2026-05-28, ~50 days). Whether 6 is defensible on 'reports exist' alone is a judgement call.", couldMoveBands: 1 },
  { dimensionId: "upgrade_admin_authority", why: "9-of-10 member overlap between the upgrade and market-owner multisigs reduces practical independence; a 2-of-7 zero-timelock freeze power may warrant a cap below `supported`.", couldMoveBands: 1 },
  { dimensionId: "manager_discretion", why: "socialize_loss reaches supplier principal at 4-of-10 + 12h. A reviewer may hold this in `weak` regardless of the absent vault layer.", couldMoveBands: 1 },
  { dimensionId: "maturity", why: "Reserve-level age and configuration continuity are absent entirely; the binary is days old.", couldMoveBands: 1 },
  { dimensionId: "incident_history", why: "Whether 5 overcorrects relative to Steakhouse's 4 merely because the evidence is more applicable.", couldMoveBands: 1 },
] as const;

export const ASSESSMENT_LIMITATIONS = [
  "This is an AUTOMATED assessment. It is not a human review, not a signoff, and not an approval.",
  "Six of twelve dimensions rest on partial evidence readiness and are scored with correspondingly limited confidence.",
  "proposer_authority 6pwkb7u… has unresolved powers. If material control is later proven, this assessment MUST be invalidated and reopened.",
  "Authority tenure is unresolved for all three multisigs, so no score here is attributable to a dated administrative regime.",
  "meetsMinimum = false does not revoke existing-position recognition or visibility.",
] as const;

/* ------------------------------------------------------------------ *
 * 4. State + validation
 * ------------------------------------------------------------------ */

export const DIRECT_ASSESSMENT_STATE = {
  automatedAssessmentState: "completed" as const,
  humanReviewState: "awaiting_reviewer" as const,
  humanReviewCreated: false,
  reviewerIdentityFabricated: false,
  riskSignoffState: "absent" as const,
  productApprovalState: "absent" as const,
  lifecycle: "identity_verified" as const,
  primaryBlocker: "blocked_risk_review" as const,
  movedToReadyForApprovalReview: false,
  recommendationEligible: false,
  selectorEligible: false,
  topPickCreated: false,
  productionCardRendered: false,
  existingPositionRecognitionChanged: false,
  safetyBufferHandlingChanged: false,
  evenIfMeetsMinimumWereTrue:
    "Recommendation eligibility, selector eligibility and approval would ALL still be false. A passing automated aggregate is an input to human review, never a substitute for it.",
  meetsMinimumFalseConsequence:
    "The assessment is preserved as-is. Scores are not manipulated, existing-position recognition is not revoked, and confirmed positions remain visible.",
} as const;

export interface DirectAssessmentValidation { valid: boolean; errors: string[]; }

/** Validate the assessment against the rubric, the confidence policy and separation of duties. */
export function validateDirectAssessment(items: DirectDimensionAssessment[] = DIRECT_DIMENSION_ASSESSMENTS): DirectAssessmentValidation {
  const errors: string[] = [];
  const CANON = ["audit_security", "maturity", "upgrade_admin_authority", "manager_discretion", "strategy_complexity", "composability_dependency", "oracle_risk", "liquidity_withdrawal", "asset_stablecoin_risk", "withdrawal_fee_transparency", "operational_dependency_risk", "incident_history"];
  if (items.length !== 12) errors.push(`expected 12 dimensions, got ${items.length}`);
  if (items.map((a) => String(a.dimensionId)).join(",") !== CANON.join(",")) errors.push("dimensions are not in canonical rubric order");
  if (items.reduce((a, d) => a + d.weight, 0) !== 100) errors.push("weights do not sum to 100");
  for (const a of items) {
    if (!Number.isInteger(a.score)) errors.push(`${a.dimensionId}: score is not an integer`);
    if (a.score < 0 || a.score > 10) errors.push(`${a.dimensionId}: score out of range`);
    if (!anchorMatchesScore(a.score, a.anchorBand as AnchorBand)) errors.push(`${a.dimensionId}: score ${a.score} does not match anchor band ${a.anchorBand}`);
    if (!(["high", "medium", "low"] as RiskReviewConfidence[]).includes(a.confidence)) errors.push(`${a.dimensionId}: invalid confidence`);
    if (a.rationale.length === 0) errors.push(`${a.dimensionId}: empty rationale`);
    if (a.evidenceRefs.length === 0) errors.push(`${a.dimensionId}: no evidence references`);
    if (a.favorableEvidence.length === 0) errors.push(`${a.dimensionId}: no favorable evidence recorded`);
    if (a.unfavorableEvidence.length === 0) errors.push(`${a.dimensionId}: no unfavorable evidence recorded`);
    if (a.limitingFact.length === 0) errors.push(`${a.dimensionId}: no limiting fact`);
    if (/generally safe|well known|reputable|strong protocol|trusted team/i.test(a.rationale)) errors.push(`${a.dimensionId}: rationale contains a vague appeal`);
  }
  return { valid: errors.length === 0, errors };
}

export const DIRECT_ASSESSMENT_VALIDATION = validateDirectAssessment();

/* ------------------------------------------------------------------ *
 * 5. Human-review handoff (reviewer fields deliberately empty)
 * ------------------------------------------------------------------ */

export const DIRECT_HUMAN_REVIEW_PACKET = {
  packetId: "klend_direct_usdc_human_review_packet_001",
  assessmentId: DIRECT_ASSESSMENT_PROVENANCE.assessmentId,
  forRole: "risk_reviewer",
  reviewerActions: ["accept_all_scores", "reject_assessment", "request_reassessment", "override_individual_dimension"],
  overrideRequires: ["explicit human rationale", "reviewer identity", "timestamp", "preservation of the original automated score"],
  rows: DIRECT_DIMENSION_ASSESSMENTS.map((a) => ({
    dimensionId: a.dimensionId,
    weight: a.weight,
    automatedScore: a.score,
    automatedAnchorBand: a.anchorBand,
    automatedConfidence: a.confidence,
    limitingFact: a.limitingFact,
    evidenceRefs: a.evidenceRefs,
    reviewerScore: null,
    reviewerConfidence: null,
    reviewerRationale: null,
    reviewerAgrees: null,
  })),
  aggregate: DIRECT_ASSESSMENT_OUTCOME.displayedAggregate,
  threshold: DIRECT_ASSESSMENT_OUTCOME.minimumThreshold,
  meetsMinimum: DIRECT_ASSESSMENT_OUTCOME.meetsMinimum,
  focusAreas: HUMAN_REVIEW_FOCUS_AREAS,
  limitations: ASSESSMENT_LIMITATIONS,
  reviewerId: null,
  reviewerDecision: null,
  reviewerSignoff: null,
  reviewedAt: null,
  approval: null,
  containsFabricatedReviewer: false,
  note: "Reviewer fields are NULL by construction. This packet carries the automated output to a human; it never speaks for one.",
} as const;

/* ------------------------------------------------------------------ *
 * 6. Manifest
 * ------------------------------------------------------------------ */

export const DIRECT_ASSESSMENT_MANIFEST = {
  assessmentId: DIRECT_USDC_ASSESSMENT_ID,
  assessmentVersion: DIRECT_USDC_ASSESSMENT_VERSION,
  candidateId: DIRECT_ASSESSMENT_PROVENANCE.candidateId,
  reserveAddress: DIRECT_ASSESSMENT_PROVENANCE.reserveAddress,
  evidencePackageManifest: DIRECT_ASSESSMENT_PROVENANCE.evidencePackageManifest,
  authorityEvidenceManifest: DIRECT_ASSESSMENT_PROVENANCE.authorityEvidenceManifest,
  rubricId: DIRECT_ASSESSMENT_PROVENANCE.rubricId,
  rubricVersion: DIRECT_ASSESSMENT_PROVENANCE.rubricVersion,
  rubricHash: DIRECT_ASSESSMENT_PROVENANCE.rubricHash,
  confidencePolicyId: DIRECT_ASSESSMENT_PROVENANCE.confidencePolicyId,
  separationOfDutiesId: DIRECT_ASSESSMENT_PROVENANCE.separationOfDutiesId,
  assessorId: DIRECT_ASSESSMENT_PROVENANCE.assessorId,
  scores: DIRECT_DIMENSION_ASSESSMENTS.map((a) => ({ id: a.dimensionId, score: a.score, confidence: a.confidence })),
  unroundedAggregate: DIRECT_ASSESSMENT_OUTCOME.unroundedAggregate,
  displayedAggregate: DIRECT_ASSESSMENT_OUTCOME.displayedAggregate,
  threshold: DIRECT_ASSESSMENT_OUTCOME.minimumThreshold,
  meetsMinimum: DIRECT_ASSESSMENT_OUTCOME.meetsMinimum,
  humanReviewStatus: DIRECT_ASSESSMENT_STATE.humanReviewState,
  signoffStatus: DIRECT_ASSESSMENT_STATE.riskSignoffState,
  approvalStatus: DIRECT_ASSESSMENT_STATE.productApprovalState,
  evidenceCutoff: DIRECT_ASSESSMENT_PROVENANCE.assessmentCutoff,
  invalidationTriggers: [
    "KLend program upgrade", "ProgramData change", "upgrade-authority change",
    "market-owner change", "emergency-council change",
    "Squads threshold change", "Squads timelock change", "Squads member or permission change",
    "proposer_authority material powers discovered",
    "reserve configuration change", "oracle configuration change",
    "socialize_loss event", "material bad-debt event", "material exploit or security disclosure",
    "new audit or formal-verification evidence", "audit-to-current-binary linkage resolved",
    "collateral-oracle evidence materially improved", "material incident-history evidence found",
    "rubric or confidence-policy version change",
  ],
  currentStateChangesDoNotInvalidate:
    "APY, capacity, utilization and liquidity movements invalidate CURRENT-STATE SNAPSHOTS, not this assessment. They invalidate the risk assessment only where the approved rubric requires reassessment.",
} as const;

export function computeDirectAssessmentManifestHash(m: typeof DIRECT_ASSESSMENT_MANIFEST = DIRECT_ASSESSMENT_MANIFEST): string {
  const material = JSON.stringify({
    id: m.assessmentId, v: m.assessmentVersion, c: m.candidateId, r: m.reserveAddress,
    p: m.evidencePackageManifest, a: m.authorityEvidenceManifest, rh: m.rubricHash,
    s: m.scores, agg: m.unroundedAggregate, mm: m.meetsMinimum,
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < material.length; i++) { h ^= material.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `direct_assessment_${h.toString(16).padStart(8, "0")}`;
}

export const DIRECT_ASSESSMENT_MANIFEST_HASH = computeDirectAssessmentManifestHash();

export const DIRECT_ASSESSMENT_CONFERS = {
  confers: ["an immutable automated 12-dimension assessment", "a deterministic aggregate", "a human-review input"],
  doesNotConfer: [
    "human review", "risk signoff", "product approval", "selector eligibility",
    "recommendation eligibility", "Top Pick", "a production card", "execution", "risk suitability",
  ],
  humanReviewOccurred: false,
  signoffOccurred: false,
  productApproved: false,
  selectorChanged: false,
  recommendationChanged: false,
  steakhouseAssessmentChanged: false,
  solStakingChanged: false,
  demoChanged: false,
  transactionConstructedOrSimulated: false,
  scoreIsInternalOnly:
    "The numeric score, its dimensions, weights, bands, threshold and confidence are INTERNAL ONLY. They must never appear on suggestion cards, review drawers, dashboards, portfolio pages, Smith AI, Qdrant, analytics, public APIs or public docs.",
} as const;
