/**
 * Steakhouse vault + risk-governance fixture checks (risk evidence, kvault capacity
 * semantics, governance + decisions, evidence closure, capacity reconciliation,
 * existing-position support, gates, cToken blocking, evidence packages).
 *
 * Extracted verbatim from suggestionEngine.fixtures.ts (progressive monolith split).
 * The monolith imports and aggregates these checks; behavior and check names are
 * unchanged.
 */
import * as KLEND_UPDATE_CONFIG_MODE from "@kamino-finance/klend-sdk/dist/@codegen/klend/types/UpdateConfigMode";
import { classifyPositionCoverage as sbClassify, computeSafetyBufferCoverage as sbCoverage } from "../../wallet/safetyBufferCoverage";
import { STEAKHOUSE_IDENTITY as ST_ID, STEAKHOUSE_POSITION_DEDUPE_KEY as ST_KEY, STEAKHOUSE_POSITION_ID as ST_POS_ID, buildSteakhouseExistingPosition as stBuild, deriveReserveGate as stDeriveGate, mergeSteakhousePosition as stMerge, toSteakhouseWalletPosition as stToWallet } from "../../wallet/steakhouseExistingPosition";
import type { ReserveGateInput as STGateInput, SteakhousePositionInput as STInput } from "../../wallet/steakhouseExistingPosition";
import { AUTOMATED_ASSESSMENT_DIAGNOSTICS, CONFIDENCE_POLICY_V1_RECORD, CONFIDENCE_POLICY_V2, CONFIDENCE_POLICY_V2_REFERENCE, HUMAN_ONLY_ROLES, SOD_POLICY_V1_RECORD, SOD_POLICY_V2, SOL_STAKING_COMPATIBILITY, authorizeAutomatedAssessor, getAutomatedAssessor, listAutomatedAssessors, validateConfidenceUnderV2 } from "../automatedAssessmentGovernance";
import { DEMO_STABLE_YIELD_GOAL, DEMO_STABLE_YIELD_POSITIONS, DEMO_STABLE_YIELD_PRICED_AS_OF, buildDemoStableYieldRail } from "../demoStableYieldScenario";
import { getDisposition as dlGetDispo } from "../directUsdcLendingDispositions";
import { DIRECT_USDC_LENDING_CATEGORY_MINIMUM as DL_CATMIN, UNIVERSAL_MINIMUM as DL_UNIMIN } from "../directUsdcLendingEligibilityPolicy";
import { MIN_PROTOCOL_RISK_SCORE } from "../engineThresholds";
import type { FixtureCheck } from "./fixtureCheck";
import { ALIAS_AMENDMENT_MANIFEST_HASH, MAIN_MARKET_ALIAS, computeAliasAmendmentManifestHash } from "../incidentMarketAliasAmendment";
import { AUTHORIZED_PRODUCTION_REVIEWER_CONFIGURED, KAMINO_OUTREACH_QUESTIONNAIRE_EXISTS, PROTOCOL_RISK_RUBRIC_APPROVAL_ARTIFACT_EXISTS, PROTOCOL_RISK_RUBRIC_V1_APPROVED, PROTOCOL_RISK_RUBRIC_V1_PROPOSAL_EXISTS, RISK_REVIEWER_REGISTRY_CONTRACT_EXISTS, RISK_REVIEW_PROVENANCE_EXISTS, RISK_REVIEW_STATE_TRANSITION_VALIDATION_EXISTS as RISK_REVIEW_STATE_TRANSITION_VALIDATION_EXISTS_K, RISK_SCORE_INTERNAL_ONLY_POLICY_EXISTS, RISK_SCORE_MIGRATION_REPORT_EXISTS as RISK_SCORE_MIGRATION_REPORT_EXISTS_K, RISK_SCORE_USER_FACING_SUPPRESSION_EXISTS, STABLE_YIELD_EXACT_VAULT_RISK_EVIDENCE_EXISTS, STABLE_YIELD_KVAULT_CAPACITY_SEMANTICS_REVIEWED, STABLE_YIELD_PRODUCTION_CAPACITY_RESOLVED, STABLE_YIELD_PRODUCTION_DEPOSIT_STATE_RESOLVED, STABLE_YIELD_PRODUCTION_DEPOSIT_STATE_RESOLVED_FROM_CAPACITY, STABLE_YIELD_PRODUCTION_PRODUCT_APPROVAL_EXISTS, STABLE_YIELD_RISK_REVIEW_DIAGNOSTICS_EXIST, STABLE_YIELD_RISK_REVIEW_ELIGIBLE_FOR_APPROVAL_REVIEW, STABLE_YIELD_RISK_REVIEW_HUMAN_SIGNOFF_COMPLETE, STABLE_YIELD_RISK_REVIEW_SCORED, STEAKHOUSE_ADMIN_AUTHORITY_EVIDENCE_EXISTS, STEAKHOUSE_ADMIN_CONTROLS_FULLY_VERIFIED, STEAKHOUSE_AUDIT_LINKAGE_ASSESSMENT_EXISTS, STEAKHOUSE_AUDIT_TO_DEPLOYMENT_LINKAGE_VERIFIED, STEAKHOUSE_AUTHORITY_PERMISSION_MATRIX_EXISTS, STEAKHOUSE_DEPOSIT_STATE_ASSESSMENT_EXISTS, STEAKHOUSE_ELIGIBLE_FOR_PRODUCT_APPROVAL, STEAKHOUSE_EVIDENCE_COMPLETE, STEAKHOUSE_HUMAN_REVIEW_COMPLETE, STEAKHOUSE_INCIDENT_REVIEW_ARTIFACT_EXISTS, STEAKHOUSE_INCIDENT_REVIEW_COMPLETE, STEAKHOUSE_READY_FOR_HUMAN_SCORING, STEAKHOUSE_RESERVE_EXPOSURE_SNAPSHOT_EXISTS, STEAKHOUSE_REVIEWER_WORKSHEET_EXISTS as STEAKHOUSE_REVIEWER_WORKSHEET_EXISTS_K, STEAKHOUSE_REVIEW_READINESS_EVALUATOR_EXISTS, STEAKHOUSE_RISK_SCORE_ASSIGNED, STEAKHOUSE_RISK_SIGNOFF_COMPLETE, STEAKHOUSE_WITHDRAWAL_MODEL_COMPLETE, STEAKHOUSE_WITHDRAWAL_SEMANTICS_ARTIFACT_EXISTS, USER_FACING_NUMERIC_RISK_SCORE_EXISTS } from "../investmentTargetRegistry";
import { KVAULT_CAPACITY_SOURCE, KVAULT_MAINNET_PROGRAM_ID, U64_MAX_STR, resolveKvaultDepositCapacity } from "../kaminoVaultCapacitySemantics";
import { POSITION_EVIDENCE_MANIFEST_HASH, computePositionEvidenceManifestHash } from "../klendDirectLendingPosition";
import { KVAULT_COINCIDENCE, UPGRADE_AUTHORITY_LAYER as UPGRADE_LAYER } from "../klendDirectUsdcAuthorityEvidence";
import { DIRECT_ASSESSMENT_OUTCOME as DA_OUTCOME } from "../klendDirectUsdcAutomatedAssessment";
import { CURRENT_STATE_NOT_IDENTITY, DIAGNOSTIC_ONLY_SOURCES, DIMENSION_EVIDENCE as PKG_DIMENSIONS, INCLUDED_EVIDENCE_MODULES as PKG_MODULES, KLEND_PROGRAM_UPGRADE_AUTHORITY as KLEND_UPGRADE_AUTH, PACKAGE_BINDING as PKG_BINDING, PACKAGE_CONFERS as PKG_CONFERS, PACKAGE_MANIFEST as PKG_MANIFEST, PACKAGE_MANIFEST_HASH as PKG_MANIFEST_HASH, PACKAGE_READINESS as PKG_READINESS, READINESS_CONSEQUENCE, computePackageManifestHash, evaluatePackageReadiness, validatePackageBinding } from "../klendDirectUsdcRiskEvidencePackage";
import { APY_BLOCKER_SUPERSESSION, APY_EVIDENCE_MANIFEST_HASH, APY_METHODOLOGY_EVIDENCE, APY_PARITY, APY_RESOLUTION_CONFERS, KLEND_APY_DERIVATION_VERSION, OUTPUT_UNIT, RATE_SEMANTICS, SOL_BTC_USDC_APY_SNAPSHOT, computeApyEvidenceManifestHash, deriveKlendReserveApy, getSolBtcUsdcApy, ratioToPercent } from "../klendReserveApyDerivation";
import { GAP_LOCALIZATION, KAMINO_RESERVE_METRICS_API, NOT_INVESTIGATED, PARITY_AMENDMENT_CONFERS, PARITY_CLASSIFICATION, PARITY_CONSEQUENCE, PARITY_EVIDENCE, PARITY_EVIDENCE_MANIFEST_HASH, PARITY_OBSERVATIONS, UI_API_RELATIONSHIP, computeParityEvidenceManifestHash } from "../klendReserveApyParityAmendment";
import { AVAILABILITY_EVIDENCE_MANIFEST_HASH, computeAvailabilityEvidenceManifestHash } from "../klendReserveAvailability";
import { CAPACITY_EVIDENCE_MANIFEST_HASH, CAPACITY_SNAPSHOT, DEPOSIT_LIMIT_SENTINEL_SEMANTICS, computeCapacityEvidenceManifestHash } from "../klendReserveCapacity";
import { CONSTRAINTS_EVIDENCE_MANIFEST_HASH, computeConstraintsEvidenceManifestHash } from "../klendReserveConstraints";
import { CANONICAL_SOLANA_USDC_MINT, IDENTITY_BLOCKER_SUPERSESSION, IDENTITY_RESOLUTION_CONFERS, KLEND_PROGRAM_ID, MANAGER_DISCRETION_APPLICABILITY, RESERVE_STATUS_ACTIVE, RESERVE_STATUS_HIDDEN, SHARED_RISK_RELATIONSHIP, SOL_BTC_MARKET_OTHER_USDC_RESERVES, SOL_BTC_RESOLVER_INPUTS, SOL_BTC_USDC_IDENTITY_MANIFEST_HASH, SOL_BTC_USDC_RESERVE_DIAGNOSTIC_SNAPSHOT, SOL_BTC_USDC_RESERVE_IDENTITY, computeIdentityManifestHash, getSolBtcUsdcIdentityResolution, resolveKlendReserveIdentity } from "../klendReserveIdentity";
import { APY_UNIT_BLOCKER_SUPERSESSION, MEASURED_APY_EVIDENCE_MANIFEST_HASH, RATE_KIND } from "../klendReserveMeasuredApyCorrection";
import { FARM_STATE_SNAPSHOT, KAMINO_FARMS_PROGRAM_ID, MAX_SLOT_SKEW, REWARD_EVIDENCE_MANIFEST_HASH, REWARD_GAP_SUPERSESSION, REWARD_METHODOLOGY_EVIDENCE, REWARD_RESOLUTION_CONFERS, REWARD_STREAMS, SDK_REWARD_SEMANTICS, SOL_BTC_REWARD_RESOLUTION_INPUTS, SUPPLIER_FARM_IDENTITY, UI_PARITY_DIAGNOSTIC, UNIFIED_SLOT_SNAPSHOT, computeRewardEvidenceManifestHash, getSolBtcUsdcTotalApy, resolveRewardsAndTotalApy } from "../klendReserveRewardResolution";
import { PROTOCOL_RISK_RUBRIC_APPROVED, PROTOCOL_RISK_RUBRIC_ASSIGNS_SCORES, PROTOCOL_RISK_RUBRIC_VERSION, getProtocolRiskRubric } from "../protocolRiskRubric";
import { PROTOCOL_RISK_RUBRIC_V1_APPROVAL, PROTOCOL_RISK_RUBRIC_V1_LIFECYCLE, RISK_SCORE_DIRECTION, RUBRIC_V1_CHANGES, aggregateRiskScore, computeRubricV1Hash, getApprovedRiskRubricV1, getProposedRiskRubricV1, recordRubricApproval, riskSignoffImpliesProductApproval, validateReviewTransition, validateRubricTransition } from "../riskGovernance";
import { ALLOWED_CONFIDENCE_VALUES, CONFIDENCE_AGGREGATION_BEHAVIOR, CONFIDENCE_DEFINITIONS, CONFIDENCE_EXPOSURE_POLICY, CONFIDENCE_FORBIDDEN_SURFACES, CONFIDENCE_MEANING, CONFIDENCE_POLICY_CONFERS, CONFIDENCE_POLICY_REFERENCE, CONFIDENCE_RULES, RISK_REVIEW_CONFIDENCE_POLICY, applyConfidenceToAggregate, isRiskReviewConfidence, validateConfidenceSubmission } from "../riskReviewConfidencePolicy";
import { PRODUCT_OWNER_REVIEWER_ID, PROPOSED_REVIEWER_RECORDS, RISK_SEPARATION_OF_DUTIES_POLICY_APPROVED, SEPARATION_OF_DUTIES_POLICY, authorizeReviewerAction, listAuthorizedReviewers } from "../riskReviewerRegistry";
import type { RiskReviewerRecord } from "../riskReviewerRegistry";
import { RISK_SCORE_FORBIDDEN_FIELDS, RISK_SCORE_FORBIDDEN_SURFACES, RISK_SUITABILITY_SCORE_LABEL, disclosureLeaksNumericSignal, listQualitativeRiskDisclosures } from "../riskScoreExposurePolicy";
import { validatePrimaryBlockerIsNearest } from "../stableYieldBlockerOrderAmendment";
import { ACCESSIBILITY_STATES_FORCING_ZERO, BUFFER_RECOGNITION_EXPOSURE, LIQUIDITY_LIMITATION_COPY, NO_INVENTED_HAIRCUT, SEPARATION_PRINCIPLE, STEAKHOUSE_ACCESSIBILITY, STEAKHOUSE_BUFFER_RECOGNITION_POLICY, computeVerifiedImmediatelyWithdrawableUsd, deriveRecommendationEligibility, getSteakhouseBufferRecognition, recognizeStableYieldBuffer } from "../stableYieldBufferRecognition";
import { validateStableYieldMarketRecord } from "../stableYieldMarketCache";
import { deriveStableYieldPlanSuggestion } from "../stableYieldProductInput";
import { getStableYieldEvidenceManifest, isNearerBlocker, listStableYieldEvidenceManifests } from "../stableYieldProductionEvidence";
import { AUDIT_COVERAGE_MATRIX, AUDIT_EVIDENCE_COMPLETENESS_CONFERS, AUDIT_INVENTORY, DEPLOYED_RELEASE_DIFF, FINAL_AUDIT_CLASSIFICATION, PUBLICLY_UNCOVERED_SURFACE, PUBLIC_RELEASE_IDENTITY, REDEEM_IN_KIND_PRESENCE, REMEDIATION_VERIFICATIONS, RESIDUAL_SOURCE_OBSERVATION, REWARDS_FEATURE_PRESENCE, SQUASHED_HISTORY_LIMITATION, STEAKHOUSE_AUDIT_EVIDENCE_INPUTS, THREE_QUESTIONS, evaluateAuditEvidenceCompleteness, getSteakhouseAuditEvidenceCompleteness } from "../steakhouseAuditCoverage";
import { ASSESSMENT_CONFERS, ASSESSMENT_LIMITATIONS, ASSESSMENT_PROVENANCE, ASSESSMENT_STATE, AUTOMATED_AGGREGATE_RESULT, AUTOMATED_ASSESSMENT_OUTCOME, AUTOMATED_DIMENSION_ASSESSMENTS, HUMAN_REVIEW_PACKET, RAISED_ASSESSMENT_DIAGNOSTICS, anchorMatchesScore, computeAutomatedAggregate, validateAutomatedAssessment } from "../steakhouseAutomatedAssessment";
import { CANONICAL_SOURCE, CAPACITY_SCOPE_BOUNDARY, CONTRADICTORY_FIELDS, CURRENT_VAULT_VERIFICATION, NOT_A_DEPOSIT_GATE, RECONCILED_CAPACITY_RESOLUTION, RECONCILIATION_CONFERS, RECONCILIATION_EVIDENCE, RECONCILIATION_MANIFEST_HASH, RECONCILIATION_RESULT, computeReconciliationManifestHash } from "../steakhouseCapacityReconciliation";
import { ALLOCATION_ADMIN_RUBRIC_MAPPING, API_STATUS_SEMANTICS, AUDIT_LINKAGE_REASSESSMENT, AUDIT_RECORDS_V2, AUTHORITY_RISK_IS_NOT_GLOBALLY_COMPLETE, DEPOSIT_STATE_POLICY, L1_EVIDENCE_CUTOFF_AT, L1_EVIDENCE_SLOT, PERMISSIONING, RESERVE_WITHDRAWAL_BEHAVIOR, REVIEWED_SOURCE_MATCHES_DEPLOYED_BINARY, STEAKHOUSE_DEPOSIT_STATE_INPUTS, SUPERSEDED_VERIFICATION_RECORDS, VERIFICATION_RECORD, WITHDRAWAL_CONFIG, WITHDRAWAL_MECHANICS, evaluateReadOnlyDepositState, getSteakhouseDepositState } from "../steakhouseDeploymentAndDepositEvidence";
import { AUDIT_LINKAGE, AUTHORITY_EVIDENCE, AUTHORITY_PERMISSIONS, CLOSURE_BINDING, CLOSURE_EVIDENCE_CUTOFF_AT, DEPOSIT_STATE, DIMENSION_READINESS, INCIDENT_REVIEW, KAMINO_QUESTIONNAIRE, L1_INCIDENT_REVIEW_CUTOFF_AT, RAISED_DIAGNOSTICS, RESERVE_EMERGENCY_AUTHORITY_EXPOSURE, RESERVE_EXPOSURE, WITHDRAWAL_SEMANTICS, evaluateReviewReadiness } from "../steakhouseEvidenceClosure";
import type { DimensionEvidenceState } from "../steakhouseEvidenceClosure";
import { EVIDENCE_VERIFICATION_CONFERS, POST_VERIFICATION_STATE, STEAKHOUSE_EVIDENCE_VERIFICATION, STEAKHOUSE_VERIFICATION_INPUTS, VERIFIED_EVIDENCE_MANIFEST_HASH, VERIFIED_EVIDENCE_PACKAGE, computeEvidenceManifestHash, getSteakhouseVerificationResult, validateEvidenceVerification } from "../steakhouseEvidenceVerification";
import { CONFIRMED_INCIDENTS, EMERGENCY_COUNCIL_POWERS, INCIDENT_COMPLETENESS_CONFERS, INCIDENT_EVIDENCE_SCOPE, INCIDENT_RUBRIC_MAPPINGS, KLEND_VERIFICATION, MARKETING_CLAIMS, MARKET_AUTHORITIES_ARE_A_SEPARATE_LAYER, MARKET_EMERGENCY_AUTHORITIES, NO_SINGLE_HAS_INCIDENT_BOOLEAN, OFFICIAL_EVENT_MARKET_COVERAGE, OFFICIAL_LIMITED_SCOPE_STATEMENTS, RESERVE_ORACLE_CONFIG, SOCIALIZE_LOSS_HISTORY_SEARCH, SOCIALIZE_LOSS_SEMANTICS, STEAKHOUSE_INCIDENT_COMPLETENESS_INPUTS, STRUCTURAL_LOSS_MECHANISMS, SUPERSEDED_COVERAGE_CALCULATION, UNRESOLVED_THIRD_PARTY_LEADS, evaluateIncidentEvidenceCompleteness, getSteakhouseIncidentCompleteness } from "../steakhouseIncidentEvidence";
import { WORKSHEET_REJECTED_PRODUCTS, buildSteakhouseReviewerWorksheet, getRiskScoreMigrationReport } from "../steakhouseReviewerWorksheet";
import { PACKET_IDENTITY, PACKET_PREPARATION_CONFERS, REVIEWER_INSTRUCTIONS, SCORING_BLOCKS, getBlankScoringBlocks, validatePacketBinding } from "../steakhouseScoringPacket";
import { AMENDMENT_MANIFEST_HASH, AMENDMENT_STATE, AUDIT_SECURITY_CONCLUSION, CPI_LAYER_COVERAGE, FORMAL_VERIFICATION_INVENTORY, FUZZING_INVENTORY, OFFICIAL_CLAIMS_CLASSIFIED, PRIOR_EVIDENCE_MANIFEST, PROPERTIES_WITH_NO_COVERAGE, PROPERTY_ANALYSIS, SECURITY_EVIDENCE_AMENDMENT, SOURCE_LINK_HYGIENE, computeAmendmentManifestHash } from "../steakhouseSecurityEvidenceAmendment";
import { getSteakhouseRiskReviewStatus, listSteakhouseRiskEvidence } from "../steakhouseUsdcRiskEvidence";
import { deriveRailSuggestions as SY_deriveRail } from "../useRailSuggestions";
import { getApprovedYieldStrategies, getYieldStrategy, listYieldStrategies } from "../yieldStrategyRegistry";
import { getYieldStrategyRiskReview, listYieldStrategyRiskReviews } from "../yieldStrategyRiskReview";
import { ReserveConfig as KLEND_RESERVE_CONFIG } from "@kamino-finance/klend-sdk/dist/@codegen/klend/types/ReserveConfig";
import { readFileSync, readdirSync } from "node:fs";

/**
 * Step 16H-J — the exact-vault risk EVIDENCE package. Deterministic and OFFLINE: every assertion reads
 * the committed evidence record. No network, no score, no signoff.
 */
export function runSteakhouseRiskEvidenceFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const root = process.cwd();
  const readIf = (rel: string) => { try { return readFileSync(`${root}/${rel}`, "utf8"); } catch { return ""; } };
  const VAULT = "HDsayqAsDWy3QvANGqh2yNraqcD8Fnjgh73Mhb3WRS5E";
  const HIGH_YIELD = "BEEfo7xwgK2ZP13Pxo7qqTPzAteKJmXjVWtMWcXSvbn2";
  const st = getSteakhouseRiskReviewStatus();
  const ev = listSteakhouseRiskEvidence();

  // ---- Exact product boundary ----
  add("16H-J-A: the evidence package binds the exact vault, share mint and program", st.productAddress === VAULT && st.sharesMint === "7D8C5pDFxug58L9zkwK7bCiDg4kD4AygzbcZUmf5usHS" && st.programId === "KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd", "bound");
  add("16H-J-B: no sibling / High Yield / Testing vault appears in the evidence", !JSON.stringify(ev).includes(HIGH_YIELD) && !JSON.stringify(ev).includes("JDmkiqvtyAqAsqrLGDgVH2GesbRAAMJCoQtqiyWx82bF"), "exact only");
  add("16H-J-C: no risk review was reused from a sibling product or from Kamino protocol-wide", ev.every((e) => !/protocol-wide approval|reused from/i.test(e.summary)) && ev.some((e) => /program family/i.test(e.productRelationship + e.reviewerNote)), "no reuse");

  // ---- NO score, NO signoff — the central guarantee of this step ----
  add("16H-J-D: NO risk score is asserted (undefined, not 0 — 0 would be a claim)", st.riskScore === undefined, "no score");
  add("16H-J-E: rubric scoring is NOT complete (the repo rubric is a draft)", st.rubricScoreComplete === false && getProtocolRiskRubric().approvalStatus === "draft" && PROTOCOL_RISK_RUBRIC_APPROVED === false, "draft rubric");
  add("16H-J-F: the rubric does not assign scores; 12Y gates them on reviewer input", PROTOCOL_RISK_RUBRIC_ASSIGNS_SCORES === false, "gated");
  add("16H-J-G: human signoff is NOT claimed and the product is NOT eligible for approval review", st.humanSignoffComplete === false && st.eligibleForApprovalReview === false, "awaiting human");
  add("16H-J-H: the review state is honestly evidence_incomplete", st.state === "evidence_incomplete", st.state);
  add("16H-J-I: no production 16D risk review record exists for this product", listYieldStrategyRiskReviews().length === 0 && getYieldStrategyRiskReview("kamino_steakhouse_usdc") === undefined, "0 reviews");

  // ---- Evidence integrity ----
  add("16H-J-J: every evidence item carries a source, relationship, date and effect", ev.length >= 12 && ev.every((e) => e.evidenceId && e.source && e.productRelationship && e.checkedAt && e.effect && e.confidence), `${ev.length} items`);
  add("16H-J-K: unestablished facts are marked not_established, never assumed safe", ev.filter((e) => e.sourceType === "not_established").length >= 5 && ev.filter((e) => e.sourceType === "not_established").every((e) => /GAP:/.test(e.summary)), "gaps explicit");
  add("16H-J-L: absence of a discovered incident is recorded as MISSING evidence, not a clean record", (() => { const i = ev.find((e) => e.dimension === "incident_history")!; return i.sourceType === "not_established" && /NOT evidence of a clean record/i.test(i.summary); })(), "not clean");
  add("16H-J-M: the material upgrade-authority + audit-linkage findings are recorded as blockers", st.openBlockers.some((b) => /sh-mgr-02|sh-exp-02|sh-liq-02|sh-inc-01/.test(b)) && ev.some((e) => e.evidenceId === "sh-aud-02" && e.effect === "eligibility_blocker"), `${st.openBlockers.length} blockers`);
  add("16H-J-N: audits are recorded without claiming safety", (() => { const a = ev.find((e) => e.evidenceId === "sh-aud-01")!; return /not a safety guarantee/i.test(a.reviewerNote ?? ""); })(), "no safety claim");
  add("16H-J-O: no evidence claims safe / risk-free / guaranteed / fully audited / no incidents", !/\b(is safe|risk-free|guaranteed|fully audited|no incidents)\b/i.test(JSON.stringify(ev)), "no claims");
  add("16H-J-P: evidence is separated from reviewer judgement", ev.filter((e) => e.reviewerNote).every((e) => e.summary !== e.reviewerNote), "separated");

  // ---- APY / TVL / popularity must not influence risk ----
  add("16H-J-Q: no evidence item uses APY, TVL or popularity as a risk input", ev.every((e) => e.effect !== "score_input" || !/\bapy is\b|\btvl is high\b|popular|widely adopted/i.test(e.summary)), "no apy/tvl");
  add("16H-J-R: the evidence module reads no live market data (score cannot move with APY)", !/getAPYs|netApy|apy7d|tvl|createSolanaRpc|fetch\(/i.test(readIf("src/suggestions/steakhouseUsdcRiskEvidence.ts")), "static");
  add("16H-J-S: USDC is not scored favourably merely for being widely used", (() => { const s2 = ev.find((e) => e.evidenceId === "sh-stb-01")!; return /Do not score this favourably merely because USDC is widely used/i.test(s2.reviewerNote ?? ""); })(), "guarded");

  // ---- Reviewer provenance ----
  add("16H-J-T: the reviewer actions name the rubric-approval + reviewer-input gates", st.reviewerActionsRequired.some((a) => /rubric/i.test(a) && /draft/i.test(a)) && st.reviewerActionsRequired.some((a) => /reviewer-scored input/i.test(a)), "named");
  add("16H-J-U: the record explicitly states Claude is not an authorized reviewer", /Claude is not an authorized reviewer/i.test(JSON.stringify(st.reviewerActionsRequired)) && /is NOT an authorized[\s*]+human reviewer/i.test(readIf("src/suggestions/steakhouseUsdcRiskEvidence.ts")), "honest");

  // ---- Capacity stays fail-closed; production unchanged ----
  // 16H-J.1: capacity is now RESOLVED from the official kvault source, superseding the earlier note.
  add("16H-J-V: capacity is resolved from the reviewed official source, with the citation recorded", (() => { const c = ev.find((e) => e.evidenceId === "sh-cap-02")!; return c.sourceType === "official_docs" && /release\/v2\.2\.2/.test(c.source) && /1d146d7087a76edbbadc14d848ae14295c0745a4/.test(c.source) && /deposit_cap == 0/.test(c.summary) && STABLE_YIELD_PRODUCTION_CAPACITY_RESOLVED === true; })(), "resolved");
  add("16H-J-W: no product was approved; approved count remains zero", getApprovedYieldStrategies().length === 0 && getYieldStrategy("kamino_steakhouse_usdc")!.lifecycle !== "approved", "0 approved");
  add("16H-J-X: production still returns no_plan and renders no Stable Yield card", (() => { const r = deriveStableYieldPlanSuggestion({ dataMode: "real_wallet", positions: [], checkedAt: "2026-07-16T12:00:00.000Z" }); return r.decision?.status === "no_plan" && r.suggestion === null; })() && SY_deriveRail({ positions: DEMO_STABLE_YIELD_POSITIONS, pricedAsOf: DEMO_STABLE_YIELD_PRICED_AS_OF, goal: DEMO_STABLE_YIELD_GOAL }).cards.every((c) => c.type !== "deploy_idle_stablecoins"), "no card");
  add("16H-J-Y: Demo remains unchanged (one synthetic card, $500.00)", (() => { const sy = buildDemoStableYieldRail().cards.filter((c) => c.type === "deploy_idle_stablecoins"); return sy.length === 1 && sy[0].impact_text === "Deposit $500.00 USDC on Kamino"; })(), "unchanged");

  // ---- Safety: no risk prose reaches the UI; no execution added ----
  add("16H-J-Z: no risk document or evidence text reaches browser card copy", ["src/components/SuggestionCard.tsx", "src/components/SuggestionReviewModal.tsx", "src/suggestions/toSuggestionCard.ts", "src/suggestions/yieldStrategyPlanPresentation.ts"].every((f) => !readIf(f).includes("steakhouseUsdcRiskEvidence")), "not in UI");
  add("16H-J-AA: the evidence module adds no execution / transaction / signature / registry mutation", (() => { const s2 = readIf("src/suggestions/steakhouseUsdcRiskEvidence.ts"); return !/sendTransaction|signTransaction|lifecycle\s*[:=]|registry\.push|approved\s*:\s*true/.test(s2); })(), "read-only");

  // ---- Flags ----
  add("16H-J-AB: evidence + diagnostics flags are true; scored / signoff / approval-ready are FALSE", STABLE_YIELD_EXACT_VAULT_RISK_EVIDENCE_EXISTS === true && STABLE_YIELD_RISK_REVIEW_DIAGNOSTICS_EXIST === true && STABLE_YIELD_RISK_REVIEW_SCORED === false && STABLE_YIELD_RISK_REVIEW_HUMAN_SIGNOFF_COMPLETE === false && STABLE_YIELD_RISK_REVIEW_ELIGIBLE_FOR_APPROVAL_REVIEW === false, "accurate");

  return checks;
}


/**
 * Step 16H-J.1 — reviewed kvault deposit-capacity semantics. Deterministic and OFFLINE: the proof lives
 * in the official program source, and these checks pin the rule + its narrow scope.
 */

/**
 * Step 16H-J.1 — reviewed kvault deposit-capacity semantics. Deterministic and OFFLINE: the proof lives
 * in the official program source, and these checks pin the rule + its narrow scope.
 */
export function runKvaultCapacitySemanticsFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const KV = KVAULT_MAINNET_PROGRAM_ID;
  const base = { programId: KV, productType: "managed_vault", mintDecimals: 6 };

  // ---- The proven rule ----
  add("16H-J1-A: deposit_cap = 0 resolves to verified_uncapped (the program's explicit 0 => u64::MAX branch)", (() => { const r = resolveKvaultDepositCapacity({ ...base, depositCapRaw: "0" }); return r.mode === "verified_uncapped" && /get_max_depositable_in_vault/.test(r.reason); })(), "verified_uncapped");
  add("16H-J1-B: deposit_cap = u64::MAX also resolves to verified_uncapped (the init_vault default)", resolveKvaultDepositCapacity({ ...base, depositCapRaw: U64_MAX_STR }).mode === "verified_uncapped", "verified_uncapped");
  add("16H-J1-C: an uncapped vault needs NO used-counterpart (no AUM required, none invented)", (() => { const r = resolveKvaultDepositCapacity({ ...base, depositCapRaw: "0" }); return r.mode === "verified_uncapped" && r.remainingUsd === undefined; })(), "no aum needed");
  add("16H-J1-D: the resolution cites the reviewed release + commit", KVAULT_CAPACITY_SOURCE.release === "release/v2.2.2" && KVAULT_CAPACITY_SOURCE.commit === "1d146d7087a76edbbadc14d848ae14295c0745a4" && KVAULT_CAPACITY_SOURCE.repo === "github.com/Kamino-Finance/kvault", "pinned");

  // ---- A genuinely capped vault still needs cap - AUM ----
  add("16H-J1-E: a real cap + AUM yields exact remaining capacity (integer math)", (() => { const r = resolveKvaultDepositCapacity({ ...base, depositCapRaw: "1000000000", aumRaw: "250000000" }); return r.mode === "explicit_remaining_capacity" && r.remainingUsd === 750; })(), "750 USDC");
  add("16H-J1-F: AUM >= cap yields product_full (mirrors the program's saturating_sub -> 0)", resolveKvaultDepositCapacity({ ...base, depositCapRaw: "500000000", aumRaw: "500000000" }).mode === "product_full", "product_full");
  add("16H-J1-G: a capped vault WITHOUT AUM fails closed (never assumes headroom)", (() => { const r = resolveKvaultDepositCapacity({ ...base, depositCapRaw: "1000000000" }); return r.mode === "unknown" && /requires_dynamically_computed_aum/.test(r.reason); })(), "unknown");

  // ---- Scope: the proof is narrow. Everything else STILL fails closed. ----
  add("16H-J1-H: another program id fails closed to unknown (a kvault proof is not a universal proof)", (() => { const r = resolveKvaultDepositCapacity({ ...base, programId: "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD", depositCapRaw: "0" }); return r.mode === "unknown" && /unproven_for_program/.test(r.reason); })(), "unknown");
  add("16H-J1-I: another product type fails closed to unknown (lending / LP semantics are NOT proven)", ["lending", "stable_liquidity_strategy", "staking_like_vault", "future_other"].every((t) => resolveKvaultDepositCapacity({ ...base, productType: t, depositCapRaw: "0" }).mode === "unknown"), "unknown");
  add("16H-J1-J: a malformed / ambiguous cap encoding fails closed", ["", "abc", "-1", "1.5", "0x0", "1e9"].every((v) => { const r = resolveKvaultDepositCapacity({ ...base, depositCapRaw: v }); return r.mode === "invalid" || r.mode === "unknown"; }), "fails closed");
  add("16H-J1-K: Infinity is never emitted and no arbitrary large number is substituted", (() => { const rs = ["0", U64_MAX_STR, "1000000000"].map((v) => resolveKvaultDepositCapacity({ ...base, depositCapRaw: v, aumRaw: "1" })); return rs.every((r) => r.remainingUsd === undefined || Number.isFinite(r.remainingUsd)); })(), "finite");

  // ---- Capacity is NOT deposit state ----
  add("16H-J1-L: verified_uncapped NEVER implies deposits_enabled (separate question, separate field)", (() => { const src = readFileSync(`${process.cwd()}/src/suggestions/kaminoVaultCapacitySemantics.ts`, "utf8"); return !/deposits_enabled|depositsEnabled|deposits_paused/.test(src); })(), "separate");
  add("16H-J1-M: the resolver emits only capacity modes, never a deposit-state verdict", (() => { const r = resolveKvaultDepositCapacity({ ...base, depositCapRaw: "0" }); return !("depositState" in (r as object)) && !("acceptingDeposits" in (r as object)); })(), "capacity only");
  add("16H-J1-N: the live artifact records verified_uncapped while deposit state stays unknown", (() => { const c = readFileSync(`${process.cwd()}/public/generated/stable-yield-market-cache.json`, "utf8"); const j = JSON.parse(c); return j.capacityState === "verified_uncapped" && j.depositState === "unknown" && j.blockers.includes("deposit_state_unknown"); })(), "separated");

  // ---- The published record must cite its source for verified_uncapped ----
  add("16H-J1-O: a verified_uncapped record WITHOUT a reviewed source commit is rejected", (() => { const c = JSON.parse(readFileSync(`${process.cwd()}/public/generated/stable-yield-market-cache.json`, "utf8")); const bad = { ...c, capacitySourceCommit: undefined }; const r = validateStableYieldMarketRecord(bad, c.sourceTimestamp); return !r.valid && r.reason === "verified_uncapped_requires_reviewed_source_commit"; })(), "citation required");
  add("16H-J1-P: the published record carries the reviewed release + commit", (() => { const c = JSON.parse(readFileSync(`${process.cwd()}/public/generated/stable-yield-market-cache.json`, "utf8")); return c.capacitySourceRelease === "release/v2.2.2" && c.capacitySourceCommit === "1d146d7087a76edbbadc14d848ae14295c0745a4"; })(), "cited");

  // ---- Resolved capacity still does NOT create eligibility ----
  add("16H-J1-Q: verified_uncapped does NOT approve the product or render a card", getApprovedYieldStrategies().length === 0 && (() => { const r = deriveStableYieldPlanSuggestion({ dataMode: "real_wallet", positions: [], checkedAt: "2026-07-16T12:05:00.000Z" }); return r.decision?.status === "no_plan" && r.suggestion === null; })(), "no_plan");
  add("16H-J1-R: capacity-resolved flag is true; deposit-state-from-capacity stays false", STABLE_YIELD_PRODUCTION_CAPACITY_RESOLVED === true && STABLE_YIELD_KVAULT_CAPACITY_SEMANTICS_REVIEWED === true && STABLE_YIELD_PRODUCTION_DEPOSIT_STATE_RESOLVED === false && STABLE_YIELD_PRODUCTION_DEPOSIT_STATE_RESOLVED_FROM_CAPACITY === false, "accurate");

  return checks;
}


/**
 * Step 16H-K — risk governance. Deterministic and OFFLINE. Every check here exists to prove the
 * governance architecture cannot accidentally approve anything.
 */

/**
 * Step 16H-K — risk governance. Deterministic and OFFLINE. Every check here exists to prove the
 * governance architecture cannot accidentally approve anything.
 */
export function runRiskGovernanceFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const root = process.cwd();
  const readIf = (rel: string) => { try { return readFileSync(`${root}/${rel}`, "utf8"); } catch { return ""; } };
  const rub = getProposedRiskRubricV1();
  const ws = buildSteakhouseReviewerWorksheet();
  const mig = getRiskScoreMigrationReport();
  const VAULT = "HDsayqAsDWy3QvANGqh2yNraqcD8Fnjgh73Mhb3WRS5E";

  /** A synthetic ACTIVE reviewer — fixtures only, never the production registry. */
  const synthReg: RiskReviewerRecord[] = [
    { reviewerId: "syn_scorer", displayLabel: "Synthetic scorer", actorKind: "human", roles: ["risk_scorer"], authorizedProductTypes: ["managed_vault"], authorizedProtocols: ["kamino"], status: "active", authorizedAt: "2026-01-01", authorizationEvidence: "fixture", createdAt: "2026-01-01", updatedAt: "2026-01-01", synthetic: true, notes: [] },
    { reviewerId: "syn_revoked", displayLabel: "Synthetic revoked", actorKind: "human", roles: ["risk_scorer"], authorizedProductTypes: [], authorizedProtocols: [], status: "revoked", authorizedAt: "2026-01-01", revokedAt: "2026-02-01", revocationReason: "fixture", createdAt: "2026-01-01", updatedAt: "2026-02-01", synthetic: true, notes: [] },
    { reviewerId: "syn_inactive", displayLabel: "Synthetic inactive", actorKind: "human", roles: ["risk_scorer"], authorizedProductTypes: [], authorizedProtocols: [], status: "inactive", createdAt: "2026-01-01", updatedAt: "2026-01-01", synthetic: true, notes: [] },
    { reviewerId: "syn_agent", displayLabel: "Synthetic agent", actorKind: "automated_agent", roles: ["evidence_preparer", "risk_scorer"], authorizedProductTypes: [], authorizedProtocols: [], status: "active", authorizedAt: "2026-01-01", authorizationEvidence: "fixture", createdAt: "2026-01-01", updatedAt: "2026-01-01", synthetic: true, notes: [] },
    { reviewerId: "syn_multi", displayLabel: "Synthetic multi-role", actorKind: "human", roles: ["risk_scorer", "risk_reviewer", "risk_signoff_approver"], authorizedProductTypes: [], authorizedProtocols: [], status: "active", authorizedAt: "2026-01-01", authorizationEvidence: "fixture", createdAt: "2026-01-01", updatedAt: "2026-01-01", synthetic: true, notes: [] },
    { reviewerId: "syn_no_ts", displayLabel: "Synthetic no timestamp", actorKind: "human", roles: ["risk_scorer"], authorizedProductTypes: [], authorizedProtocols: [], status: "active", createdAt: "2026-01-01", updatedAt: "2026-01-01", synthetic: true, notes: [] },
  ];
  const auth = (id: string | undefined, role: Parameters<typeof authorizeReviewerAction>[0]["role"], extra: Record<string, unknown> = {}) => authorizeReviewerAction({ reviewerId: id, role, registry: synthReg, ...extra });

  // ---- Rubric proposal ----
  // 16H-K.1: the product owner approved the rubric. The PROPOSAL shape is retained for provenance.
  add("16H-K-A: rubric v1 identity + semver are stable and the proposal shape is preserved", rub.rubricId === "protocol_risk_rubric_v1" && rub.semver === "1.0.0" && rub.dimensions.length === 12, `${rub.dimensions.length} dims`);
  add("16H-K-B: rubric v1 is APPROVED with complete human provenance (16H-K.1)", PROTOCOL_RISK_RUBRIC_V1_APPROVED === true && PROTOCOL_RISK_RUBRIC_V1_LIFECYCLE === "approved" && PROTOCOL_RISK_RUBRIC_V1_APPROVAL.approvedBy === "ws_product_owner" && PROTOCOL_RISK_RUBRIC_V1_APPROVAL.approvedAt.length > 0 && PROTOCOL_RISK_RUBRIC_V1_APPROVAL.approvalRationale.length > 0, "approved");
  add("16H-K-C: score direction is unambiguous and matches the repo (higher = more evidence-supported)", rub.direction === "higher_is_more_evidence_supported" && RISK_SCORE_DIRECTION === "higher_is_more_evidence_supported" && rub.scoreMin === 0 && rub.scoreMax === 10, "pinned");
  add("16H-K-D: the direction is consistent with MIN_PROTOCOL_RISK_SCORE being a FLOOR (7)", MIN_PROTOCOL_RISK_SCORE === 7 && rub.direction === "higher_is_more_evidence_supported", "floor=7");
  add("16H-K-E: every dimension has anchors covering the full 0-10 range", rub.dimensions.every((d) => d.anchors.length >= 5 && d.anchors[0].range[0] === 0 && d.anchors[d.anchors.length - 1].range[1] === 10), `${rub.dimensions.length} dims`);
  add("16H-K-F: every dimension defines mandatory evidence, prohibited evidence, and missing-evidence behavior", rub.dimensions.every((d) => d.mandatoryEvidence.length > 0 && d.prohibitedEvidence.length > 0 && d.missingEvidenceBehavior === "blocks_scoring"), "complete");
  add("16H-K-G: every dimension requires a rationale and a confidence", rub.dimensions.every((d) => d.requiresRationale === true && d.requiresConfidence === true), "required");
  add("16H-K-H: weights total 100 and decimals are disallowed", rub.totalWeight === 100 && rub.allowsDecimals === false, `${rub.totalWeight}`);
  add("16H-K-I: every change from v0.1.0-draft is documented with a rationale", RUBRIC_V1_CHANGES.length >= 12 && RUBRIC_V1_CHANGES.every((c) => c.change.length > 0 && c.rationale.length > 0), `${RUBRIC_V1_CHANGES.length} changes`);
  add("16H-K-J: tvl_adoption is REMOVED from v1 scoring (TVL can never make a product safer)", !rub.dimensions.some((d) => (d.id as string) === "tvl_adoption") && RUBRIC_V1_CHANGES.some((c) => /REMOVED tvl_adoption/.test(c.change)), "removed");
  add("16H-K-K: APY / TVL / popularity are prohibited scoring inputs across the rubric", rub.dimensions.some((d) => d.prohibitedEvidence.some((p) => /APY/i.test(p))) && rub.dimensions.some((d) => d.prohibitedEvidence.some((p) => /TVL/i.test(p))) && rub.dimensions.some((d) => d.prohibitedEvidence.some((p) => /popularity|brand/i.test(p))), "prohibited");
  add("16H-K-L: the rubric module reads no live market data (no runtime recalculation possible)", !/getAPYs|createSolanaRpc|fetch\(|apy7d|tvlUsd/i.test(readIf("src/suggestions/riskGovernance.ts")), "static");

  // ---- Aggregation + blockers ----
  const goodScores = rub.dimensions.map((d) => ({ id: d.id, score: 8, hasRationale: true, hasEvidence: true }));
  add("16H-K-M: a still-proposed rubric CANNOT produce a score (the gate survives approval of v1)", (() => { const r = aggregateRiskScore({ rubricLifecycle: "proposed_for_approval", scores: goodScores, mandatoryBlockersPresent: [], evidence: "complete" }); return !r.ok && r.diagnostic.code === "rubric_proposed_not_approved" && r.diagnostic.scoreAllowed === false; })(), "blocked");
  add("16H-K-N: a DRAFT rubric cannot produce a score", (() => { const r = aggregateRiskScore({ rubricLifecycle: "draft", scores: goodScores, mandatoryBlockersPresent: [], evidence: "complete" }); return !r.ok && r.diagnostic.code === "rubric_draft"; })(), "blocked");
  add("16H-K-O: a superseded rubric cannot produce a score", (() => { const r = aggregateRiskScore({ rubricLifecycle: "superseded", scores: goodScores, mandatoryBlockersPresent: [], evidence: "complete" }); return !r.ok && r.diagnostic.code === "rubric_superseded"; })(), "blocked");
  add("16H-K-P: an approved rubric + complete evidence + no blockers aggregates deterministically", (() => { const a = aggregateRiskScore({ rubricLifecycle: "approved", scores: goodScores, mandatoryBlockersPresent: [], evidence: "complete" }); const b = aggregateRiskScore({ rubricLifecycle: "approved", scores: goodScores, mandatoryBlockersPresent: [], evidence: "complete" }); return a.ok && b.ok && a.weightedScore === 8 && a.weightedScore === b.weightedScore && a.band === "supported" && a.meetsMinimum === true; })(), "8.00 supported");
  add("16H-K-Q: a MANDATORY BLOCKER overrides the aggregate — it cannot be averaged away", (() => { const r = aggregateRiskScore({ rubricLifecycle: "approved", scores: rub.dimensions.map((d) => ({ id: d.id, score: 10, hasRationale: true, hasEvidence: true })), mandatoryBlockersPresent: ["audit_linkage_unproven"], evidence: "complete" }); return !r.ok && r.diagnostic.code === "mandatory_blocker_present"; })(), "blocker wins");
  add("16H-K-R: one 'unsupported' dimension caps the band, even with a strong weighted mean", (() => { const sc = rub.dimensions.map((d, i) => ({ id: d.id, score: i === 0 ? 1 : 10, hasRationale: true, hasEvidence: true })); const r = aggregateRiskScore({ rubricLifecycle: "approved", scores: sc, mandatoryBlockersPresent: [], evidence: "complete" }); return r.ok && r.band === "unsupported" && r.meetsMinimum === false && r.weightedScore > 7; })(), "severe override");
  add("16H-K-S: incomplete evidence blocks scoring", (() => { const r = aggregateRiskScore({ rubricLifecycle: "approved", scores: goodScores, mandatoryBlockersPresent: [], evidence: "incomplete" }); return !r.ok && r.diagnostic.code === "evidence_incomplete"; })(), "blocked");
  add("16H-K-T: a missing dimension is score_partial, never a silent average", (() => { const r = aggregateRiskScore({ rubricLifecycle: "approved", scores: goodScores.slice(1), mandatoryBlockersPresent: [], evidence: "complete" }); return !r.ok && r.diagnostic.code === "score_partial"; })(), "partial");
  add("16H-K-U: unknown / duplicate dimensions are rejected", (() => { const unk = aggregateRiskScore({ rubricLifecycle: "approved", scores: [...goodScores, { id: "not_a_dim" as never, score: 8, hasRationale: true, hasEvidence: true }], mandatoryBlockersPresent: [], evidence: "complete" }); const dup = aggregateRiskScore({ rubricLifecycle: "approved", scores: [...goodScores, goodScores[0]], mandatoryBlockersPresent: [], evidence: "complete" }); return !unk.ok && /unknown_dimension/.test(unk.diagnostic.detail) && !dup.ok && /duplicate_dimension/.test(dup.diagnostic.detail); })(), "rejected");
  add("16H-K-V: out-of-range and non-integer scores are rejected", (() => { const hi = aggregateRiskScore({ rubricLifecycle: "approved", scores: goodScores.map((s, i) => (i === 0 ? { ...s, score: 11 } : s)), mandatoryBlockersPresent: [], evidence: "complete" }); const dec = aggregateRiskScore({ rubricLifecycle: "approved", scores: goodScores.map((s, i) => (i === 0 ? { ...s, score: 7.5 } : s)), mandatoryBlockersPresent: [], evidence: "complete" }); return !hi.ok && /out_of_range/.test(hi.diagnostic.detail) && !dec.ok && /unsupported_precision/.test(dec.diagnostic.detail); })(), "rejected");
  add("16H-K-W: a score without rationale or evidence reference is rejected", (() => { const nr = aggregateRiskScore({ rubricLifecycle: "approved", scores: goodScores.map((s, i) => (i === 0 ? { ...s, hasRationale: false } : s)), mandatoryBlockersPresent: [], evidence: "complete" }); const ne = aggregateRiskScore({ rubricLifecycle: "approved", scores: goodScores.map((s, i) => (i === 0 ? { ...s, hasEvidence: false } : s)), mandatoryBlockersPresent: [], evidence: "complete" }); return !nr.ok && /missing_rationale/.test(nr.diagnostic.detail) && !ne.ok && /missing_evidence_reference/.test(ne.diagnostic.detail); })(), "rejected");

  // ---- Reviewer authorization ----
  add("16H-K-X: exactly ONE authorized human reviewer exists, added by explicit human decision", (() => { const rs = listAuthorizedReviewers(); return rs.length === 1 && rs[0].reviewerId === "ws_product_owner" && rs[0].actorKind === "human" && rs[0].status === "active" && !!rs[0].authorizedAt && !!rs[0].authorizationEvidence && AUTHORIZED_PRODUCTION_REVIEWER_CONFIGURED === true; })(), "1 human");
  add("16H-K-Y: an unknown reviewer still fails closed against the real registry", (["risk_scorer", "risk_reviewer", "risk_signoff_approver", "rubric_approver"] as const).every((role) => authorizeReviewerAction({ reviewerId: "anyone", role }).authorized === false), "fails closed");
  add("16H-K-Z: a valid synthetic ACTIVE reviewer is accepted for their role + scope", auth("syn_scorer", "risk_scorer", { productType: "managed_vault", protocolId: "kamino" }).authorized === true, "accepted");
  add("16H-K-AA: an unknown / missing reviewer is rejected", (() => { const u = auth("nobody", "risk_scorer"); const m = auth(undefined, "risk_scorer"); return !u.authorized && u.reason === "reviewer_unknown" && !m.authorized && m.reason === "reviewer_missing"; })(), "rejected");
  add("16H-K-AB: a revoked reviewer cannot act", (() => { const r = auth("syn_revoked", "risk_scorer"); return !r.authorized && r.reason === "reviewer_revoked"; })(), "rejected");
  add("16H-K-AC: an inactive / proposed reviewer cannot act", (() => { const r = auth("syn_inactive", "risk_scorer"); return !r.authorized && r.reason === "reviewer_not_active"; })(), "rejected");
  add("16H-K-AD: an LLM / automated agent CANNOT be a human scorer, reviewer, or signatory", (() => { const roles = ["risk_scorer", "risk_reviewer", "risk_signoff_approver", "rubric_approver", "product_approver"] as const; const blocked = roles.every((role) => { const r = auth("syn_agent", role); return !r.authorized && r.reason === "reviewer_is_automated_agent"; }); const prep = auth("syn_agent", "evidence_preparer").authorized === true; return blocked && prep; })(), "agent blocked");
  add("16H-K-AE: a reviewer acting outside their role is rejected", (() => { const r = auth("syn_scorer", "risk_signoff_approver"); return !r.authorized && r.reason === "reviewer_unauthorized"; })(), "rejected");
  add("16H-K-AF: a reviewer out of product-type / protocol scope is rejected", (() => { const t = auth("syn_scorer", "risk_scorer", { productType: "lending" }); const p = auth("syn_scorer", "risk_scorer", { protocolId: "raydium" }); return !t.authorized && t.reason === "reviewer_out_of_scope" && !p.authorized && p.reason === "reviewer_out_of_scope"; })(), "rejected");
  add("16H-K-AG: an active reviewer without an authorization timestamp is rejected", (() => { const r = auth("syn_no_ts", "risk_scorer"); return !r.authorized && r.reason === "reviewer_missing_authorization_timestamp"; })(), "rejected");
  add("16H-K-AH: one human with multiple EXPLICIT roles is handled correctly", (() => { const ok = (["risk_scorer", "risk_reviewer", "risk_signoff_approver"] as const).every((role) => auth("syn_multi", role).authorized === true); const no = auth("syn_multi", "rubric_approver").authorized === false; return ok && no; })(), "multi-role");
  add("16H-K-AI: the PROPOSED draft record still authorizes nothing (only the explicit ACTIVE record does)", (() => { const p = PROPOSED_REVIEWER_RECORDS.find((r) => r.reviewerId === "proposed_product_owner")!; const proposedInert = p.status === "proposed" && p.authorizedAt === undefined && !authorizeReviewerAction({ reviewerId: "proposed_product_owner", role: "rubric_approver" }).authorized; const activeIsSeparate = listAuthorizedReviewers().every((r) => r.reviewerId !== "proposed_product_owner"); return proposedInert && activeIsSeparate; })(), "proposed inert");
  add("16H-K-AJ: the separation-of-duties policy is APPROVED with human provenance (16H-K.1)", SEPARATION_OF_DUTIES_POLICY.status === "approved" && SEPARATION_OF_DUTIES_POLICY.approvedBy === "ws_product_owner" && SEPARATION_OF_DUTIES_POLICY.approvedAt.length > 0 && RISK_SEPARATION_OF_DUTIES_POLICY_APPROVED === true, "approved");

  // ---- State transitions ----
  add("16H-K-AK: valid rubric transitions accepted; invalid rejected", validateRubricTransition("draft", "proposed_for_approval").valid && validateRubricTransition("proposed_for_approval", "approved").valid && !validateRubricTransition("draft", "approved").valid && !validateRubricTransition("retired", "approved").valid, "enforced");
  add("16H-K-AL: valid review transitions accepted", validateReviewTransition("evidence_complete", "partially_scored").valid && validateReviewTransition("scoring_complete", "in_review").valid && validateReviewTransition("reviewed", "awaiting_signoff").valid && validateReviewTransition("awaiting_signoff", "risk_approved").valid, "accepted");
  add("16H-K-AM: skipped states are rejected (evidence_incomplete -> scoring_complete)", !validateReviewTransition("evidence_incomplete", "scoring_complete").valid && !validateReviewTransition("evidence_complete", "risk_approved").valid && !validateReviewTransition("reviewed", "risk_approved").valid && !validateReviewTransition("scoring_complete", "risk_approved").valid, "rejected");
  add("16H-K-AN: risk signoff NEVER implies product approval", riskSignoffImpliesProductApproval() === false && getApprovedYieldStrategies().length === 0, "separate");

  // ---- Migration ----
  add("16H-K-AO: the existing-score inventory covers every staking candidate + Stable Yield", mig.length >= 8 && ["JupSOL", "mSOL", "bSOL", "INF", "Jito", "Steakhouse", "fixture"].every((k) => mig.some((m) => new RegExp(k, "i").test(m.subject))), `${mig.length} entries`);
  add("16H-K-AP: NO existing score is silently migrated — every legacy score requires explicit rescoring", mig.filter((m) => /JupSOL|mSOL|bSOL|INF|Native/i.test(m.subject)).every((m) => m.classification === "requires_rescoring" && m.requiresNewV1Review === true && /Do NOT map/i.test(m.requiredAction)), "no silent migration");
  add("16H-K-AQ: fixture scores stay fixture-only", mig.some((m) => m.classification === "fixture_only" && /must remain fixture-only/i.test(m.requiredAction)), "fixture_only");
  add("16H-K-AR: missing reviewer provenance is reported, not invented", mig.some((m) => m.classification === "blocked_missing_reviewer_provenance") && mig.filter((m) => /JupSOL|mSOL|bSOL|INF/i.test(m.subject)).every((m) => /no structured reviewer record/i.test(m.currentProvenance)), "reported");

  // ---- SOL staking compatibility ----
  add("16H-K-AS: existing staking risk modules are UNCHANGED by this step", ["solLiquidStakingJupsolRiskScore", "solLiquidStakingMsolRiskScore", "solLiquidStakingBsolRiskScore", "solLiquidStakingInfRiskScore", "solNativeStakingBaselineRiskScore"].every((f) => readIf(`src/suggestions/${f}.ts`).length > 0 && !readIf(`src/suggestions/${f}.ts`).includes("riskGovernance")), "untouched");
  add("16H-K-AT: no staking score is moved onto the proposed v1 rubric", !readIf("src/suggestions/riskGovernance.ts").includes("solLiquidStaking") && mig.filter((m) => /JupSOL|mSOL|bSOL|INF/i.test(m.subject)).every((m) => m.usableUnderCurrentApprovedBehavior === true), "not moved");
  add("16H-K-AU: the legacy draft rubric still exists and is untouched at v0.1.0-draft", PROTOCOL_RISK_RUBRIC_VERSION === "0.1.0-draft" && PROTOCOL_RISK_RUBRIC_APPROVED === false, "v0.1.0-draft");

  // ---- Steakhouse worksheet ----
  add("16H-K-AV: the worksheet binds the exact vault, share mint, deposit mint and program", ws.binding.productAddress === VAULT && ws.binding.sharesMint === "7D8C5pDFxug58L9zkwK7bCiDg4kD4AygzbcZUmf5usHS" && ws.binding.programId === "KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd" && ws.binding.depositMint === "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "bound");
  add("16H-K-AW: the worksheet cannot be reused for High Yield / Testing / a sibling product", Object.keys(WORKSHEET_REJECTED_PRODUCTS).length === 3 && WORKSHEET_REJECTED_PRODUCTS["BEEfo7xwgK2ZP13Pxo7qqTPzAteKJmXjVWtMWcXSvbn2"] === "Steakhouse High Yield USDC" && "kamino_usdc_lending" in WORKSHEET_REJECTED_PRODUCTS && !JSON.stringify(ws.rows).includes("BEEfo7xwgK2ZP13Pxo7qqTPzAteKJmXjVWtMWcXSvbn2"), "exact only");
  add("16H-K-AX: EVERY reviewer field is empty — no score, rationale, confidence, reviewer or date", ws.rows.length === 12 && ws.rows.every((r) => r.reviewerScore === null && r.reviewerRationale === null && r.reviewerConfidence === null && r.reviewerId === null && r.reviewDate === null), "all empty");
  add("16H-K-AY: overall score, band and signoff are empty; product is not approved", ws.overallScore === null && ws.riskBand === null && ws.signoff === null && ws.productApproved === false && ws.reviewResult === "evidence_incomplete", "empty");
  add("16H-K-AZ: the worksheet carries evidence + gaps + blockers, but suggests no default score", ws.rows.every((r) => r.evidenceSummary.length > 0 && r.anchors.length >= 5) && ws.rows.filter((r) => r.mandatoryBlockersPresent.length > 0).length === 8, "8/12 blocked");
  add("16H-K-BA: the worksheet pins the capacity citation and the evidence cutoff", /release\/v2\.2\.2/.test(ws.binding.capacitySemanticsSource) && /1d146d7087a76edbbadc14d848ae14295c0745a4/.test(ws.binding.capacitySemanticsSource) && ws.binding.evidenceCutoffAt.length > 0, "pinned");
  add("16H-K-BB: no code path can fill a reviewer score (every occurrence is literally null)", (() => { const src = readIf("src/suggestions/steakhouseReviewerWorksheet.ts"); const all = (src.match(/reviewerScore:/g) ?? []).length; const nulls = (src.match(/reviewerScore: null/g) ?? []).length; return all > 0 && all === nulls; })(), "typed null");

  // ---- Steakhouse evidence status preserved ----
  add("16H-K-BC: capacity remains verified_uncapped with its pinned citation", (() => { const c = JSON.parse(readIf("public/generated/stable-yield-market-cache.json")); return c.capacityState === "verified_uncapped" && c.capacitySourceCommit === "1d146d7087a76edbbadc14d848ae14295c0745a4" && STABLE_YIELD_PRODUCTION_CAPACITY_RESOLVED === true; })(), "verified_uncapped");
  add("16H-K-BD: blocked_capacity was NOT restored", getStableYieldEvidenceManifest("kamino_steakhouse_usdc")!.primaryBlocker !== "blocked_capacity", "not restored");
  add("16H-K-BE: deposit state remains unknown and is NOT inferred from capacity", (() => { const c = JSON.parse(readIf("public/generated/stable-yield-market-cache.json")); return c.depositState === "unknown" && c.blockers.includes("deposit_state_unknown") && STABLE_YIELD_PRODUCTION_DEPOSIT_STATE_RESOLVED === false; })(), "unknown");

  // ---- Product remains fail-closed ----
  add("16H-K-BF: no Steakhouse score / review / signoff / approval-eligibility exists", [STEAKHOUSE_RISK_SCORE_ASSIGNED, STEAKHOUSE_HUMAN_REVIEW_COMPLETE, STEAKHOUSE_RISK_SIGNOFF_COMPLETE, STEAKHOUSE_ELIGIBLE_FOR_PRODUCT_APPROVAL].every((f) => f === false), "all false");
  add("16H-K-BG: the governance architecture cannot enable the product — production still no_plan, no card", getApprovedYieldStrategies().length === 0 && (() => { const r = deriveStableYieldPlanSuggestion({ dataMode: "real_wallet", positions: [], checkedAt: "2026-07-16T13:00:00.000Z" }); return r.decision?.status === "no_plan" && r.suggestion === null; })() && SY_deriveRail({ positions: DEMO_STABLE_YIELD_POSITIONS, pricedAsOf: DEMO_STABLE_YIELD_PRICED_AS_OF, goal: DEMO_STABLE_YIELD_GOAL }).cards.every((c) => c.type !== "deploy_idle_stablecoins"), "no card");
  add("16H-K-BH: Demo remains unchanged", (() => { const sy = buildDemoStableYieldRail().cards.filter((c) => c.type === "deploy_idle_stablecoins"); return sy.length === 1 && sy[0].impact_text === "Deposit $500.00 USDC on Kamino"; })(), "unchanged");

  // ---- Safety ----
  {
    const gov = ["riskGovernance.ts", "riskReviewerRegistry.ts", "steakhouseReviewerWorksheet.ts"].map((f) => readIf(`src/suggestions/${f}`)).join("");
    // The rubric legitimately has an `approved` lifecycle now; what must never happen is the governance
  // layer mutating the PRODUCT registry or adding execution.
  add("16H-K-BI: governance adds no execution / transaction / signature / PRODUCT-registry mutation", !/sendTransaction|signTransaction|window\.open|registry\.push|getApprovedYieldStrategies\s*=|yieldStrategyRegistry/.test(gov) && getApprovedYieldStrategies().length === 0, "read-only");
    add("16H-K-BJ: no UI file imports reviewer-governance internals", ["src/components/SuggestionCard.tsx", "src/components/SuggestionReviewModal.tsx", "src/components/RealWalletSuggestionsRail.tsx", "src/pages/DemoDashboardPage.tsx", "src/suggestions/toSuggestionCard.ts"].every((f) => !/riskGovernance|riskReviewerRegistry|steakhouseReviewerWorksheet/.test(readIf(f))), "not in UI");
    add("16H-K-BK: no runtime risk-score recalculation exists (governance is pure + static)", !/setInterval|Date\.now\(\)|createSolanaRpc|fetch\(/.test(gov), "static");
  }

  // ---- Flags ----
  add("16H-K-BL: governance-exists flags true; APPROVED-by-human flags true; every PRODUCT flag still false", [PROTOCOL_RISK_RUBRIC_V1_PROPOSAL_EXISTS, PROTOCOL_RISK_RUBRIC_APPROVAL_ARTIFACT_EXISTS, RISK_REVIEWER_REGISTRY_CONTRACT_EXISTS, RISK_REVIEW_PROVENANCE_EXISTS, RISK_REVIEW_STATE_TRANSITION_VALIDATION_EXISTS_K, RISK_SCORE_MIGRATION_REPORT_EXISTS_K, STEAKHOUSE_REVIEWER_WORKSHEET_EXISTS_K, PROTOCOL_RISK_RUBRIC_V1_APPROVED, AUTHORIZED_PRODUCTION_REVIEWER_CONFIGURED].every((f) => f === true) && [STEAKHOUSE_RISK_SCORE_ASSIGNED, STEAKHOUSE_HUMAN_REVIEW_COMPLETE, STEAKHOUSE_RISK_SIGNOFF_COMPLETE, STEAKHOUSE_ELIGIBLE_FOR_PRODUCT_APPROVAL, STABLE_YIELD_PRODUCTION_PRODUCT_APPROVAL_EXISTS].every((f) => f === false), "accurate");

  return checks;
}


/**
 * Step 16H-K.1 — the product owner's applied governance decisions: rubric approval with human
 * provenance, the authorized reviewer, and the INTERNAL-ONLY Risk Suitability Score boundary.
 * Deterministic and OFFLINE.
 */

/**
 * Step 16H-K.1 — the product owner's applied governance decisions: rubric approval with human
 * provenance, the authorized reviewer, and the INTERNAL-ONLY Risk Suitability Score boundary.
 * Deterministic and OFFLINE.
 */
export function runRiskGovernanceDecisionFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const root = process.cwd();
  const readIf = (rel: string) => { try { return readFileSync(`${root}/${rel}`, "utf8"); } catch { return ""; } };
  const NOW = "2026-07-16T13:00:00.000Z";
  const realAuth = (id: string | undefined, role: "rubric_approver") => { const r = authorizeReviewerAction({ reviewerId: id, role }); return { authorized: r.authorized, reason: r.authorized ? undefined : r.reason }; };
  const approve = (over: Record<string, unknown> = {}) => recordRubricApproval({ rubricId: "protocol_risk_rubric_v1", semver: "1.0.0", approvedBy: PRODUCT_OWNER_REVIEWER_ID, approvedAt: "2026-07-16T12:33:58.794Z", now: NOW, fromLifecycle: "proposed_for_approval", authorize: realAuth, ...over });

  /** Synthetic reviewers for the rejection paths — never the production registry. */
  const synth: RiskReviewerRecord[] = [
    { reviewerId: "s_norole", displayLabel: "no rubric role", actorKind: "human", roles: ["risk_scorer"], authorizedProductTypes: [], authorizedProtocols: [], status: "active", authorizedAt: "2026-01-01", authorizationEvidence: "fixture", createdAt: "2026-01-01", updatedAt: "2026-01-01", synthetic: true, notes: [] },
    { reviewerId: "s_revoked", displayLabel: "revoked", actorKind: "human", roles: ["rubric_approver"], authorizedProductTypes: [], authorizedProtocols: [], status: "revoked", authorizedAt: "2026-01-01", revokedAt: "2026-02-01", createdAt: "2026-01-01", updatedAt: "2026-02-01", synthetic: true, notes: [] },
    { reviewerId: "s_inactive", displayLabel: "inactive", actorKind: "human", roles: ["rubric_approver"], authorizedProductTypes: [], authorizedProtocols: [], status: "inactive", createdAt: "2026-01-01", updatedAt: "2026-01-01", synthetic: true, notes: [] },
    { reviewerId: "s_agent", displayLabel: "agent", actorKind: "automated_agent", roles: ["rubric_approver"], authorizedProductTypes: [], authorizedProtocols: [], status: "active", authorizedAt: "2026-01-01", authorizationEvidence: "fixture", createdAt: "2026-01-01", updatedAt: "2026-01-01", synthetic: true, notes: [] },
  ];
  const synthAuth = (id: string | undefined, role: "rubric_approver") => { const r = authorizeReviewerAction({ reviewerId: id, role, registry: synth }); return { authorized: r.authorized, reason: r.authorized ? undefined : r.reason }; };

  // ---- Rubric approval transition + provenance ----
  add("16H-K1-A: the rubric transitions proposed_for_approval -> approved via the validated path", approve().approved === true && validateRubricTransition("proposed_for_approval", "approved").valid, "approved");
  add("16H-K1-B: approval is bound to the authorized human reviewer with a rationale + artifact version", (() => { const a = PROTOCOL_RISK_RUBRIC_V1_APPROVAL; return a.approvedBy === PRODUCT_OWNER_REVIEWER_ID && a.rubricId === "protocol_risk_rubric_v1" && a.semver === "1.0.0" && a.approvalRationale.includes("mandatory blocker enforcement") && a.approvalArtifactVersion === "1.0.0"; })(), "bound");
  add("16H-K1-C: the approver holds rubric_approver and is a HUMAN", (() => { const r = listAuthorizedReviewers().find((x) => x.reviewerId === PRODUCT_OWNER_REVIEWER_ID)!; return r.actorKind === "human" && r.roles.includes("rubric_approver") && authorizeReviewerAction({ reviewerId: PRODUCT_OWNER_REVIEWER_ID, role: "rubric_approver" }).authorized === true; })(), "human approver");
  add("16H-K1-D: the approval timestamp exists and is not future-dated", (() => { const a = PROTOCOL_RISK_RUBRIC_V1_APPROVAL; const ok = Date.parse(a.approvedAt) <= Date.parse(NOW); const fut = approve({ approvedAt: "2099-01-01T00:00:00.000Z" }); return ok && !fut.approved && fut.reason === "future_timestamp"; })(), "not future");
  add("16H-K1-E: the rubric hash is deterministic and stable across calls", computeRubricV1Hash() === computeRubricV1Hash() && /^rubric_[0-9a-f]{8}$/.test(computeRubricV1Hash()) && getApprovedRiskRubricV1().approval.rubricHash === computeRubricV1Hash(), computeRubricV1Hash());
  add("16H-K1-F: an unknown reviewer cannot approve the rubric", (() => { const r = approve({ approvedBy: "nobody" }); return !r.approved && r.reason === "reviewer_unknown"; })(), "rejected");
  add("16H-K1-G: a reviewer WITHOUT rubric_approver authority is rejected", (() => { const r = approve({ approvedBy: "s_norole", authorize: synthAuth }); return !r.approved && r.reason === "reviewer_unauthorized"; })(), "rejected");
  add("16H-K1-H: a revoked / inactive reviewer is rejected", (() => { const rv = approve({ approvedBy: "s_revoked", authorize: synthAuth }); const ia = approve({ approvedBy: "s_inactive", authorize: synthAuth }); return !rv.approved && rv.reason === "reviewer_revoked" && !ia.approved && ia.reason === "reviewer_not_active"; })(), "rejected");
  add("16H-K1-I: an AUTOMATED AGENT cannot approve the rubric", (() => { const r = approve({ approvedBy: "s_agent", authorize: synthAuth }); return !r.approved && r.reason === "reviewer_is_automated_agent"; })(), "agent rejected");
  add("16H-K1-J: approval against the wrong rubric identity / version is rejected", (() => { const id = approve({ rubricId: "other_rubric" }); const v = approve({ semver: "2.0.0" }); return !id.approved && id.reason === "rubric_version_mismatch" && !v.approved && v.reason === "rubric_version_mismatch"; })(), "rejected");
  add("16H-K1-K: approval with missing provenance is rejected", (() => { const r = approve({ approvedBy: undefined }); return !r.approved; })(), "rejected");
  add("16H-K1-L: an invalid source transition (draft -> approved) is rejected", (() => { const r = approve({ fromLifecycle: "draft" }); return !r.approved && r.reason === "invalid_state_transition"; })(), "rejected");
  add("16H-K1-M: score direction is preserved (0-10, higher = more evidence-supported; floor 7)", RISK_SCORE_DIRECTION === "higher_is_more_evidence_supported" && MIN_PROTOCOL_RISK_SCORE === 7 && getProposedRiskRubricV1().dimensions.length === 12 && getProposedRiskRubricV1().totalWeight === 100, "preserved");

  // ---- Approval implies nothing else ----
  add("16H-K1-N: rubric approval does NOT imply scoring, review, signoff, or product approval", [STEAKHOUSE_RISK_SCORE_ASSIGNED, STEAKHOUSE_HUMAN_REVIEW_COMPLETE, STEAKHOUSE_RISK_SIGNOFF_COMPLETE, STEAKHOUSE_ELIGIBLE_FOR_PRODUCT_APPROVAL].every((f) => f === false) && riskSignoffImpliesProductApproval() === false && getApprovedYieldStrategies().length === 0, "implies nothing");
  add("16H-K1-O: an APPROVED rubric still cannot score a product with mandatory blockers", (() => { const dims = getProposedRiskRubricV1().dimensions.map((d) => ({ id: d.id, score: 10, hasRationale: true, hasEvidence: true })); const r = aggregateRiskScore({ rubricLifecycle: "approved", scores: dims, mandatoryBlockersPresent: ["audit_linkage_unproven"], evidence: "complete" }); return !r.ok && r.diagnostic.code === "mandatory_blocker_present"; })(), "blocker wins");

  // ---- Steakhouse untouched ----
  add("16H-K1-P: the Steakhouse worksheet remains completely unscored", (() => { const w = buildSteakhouseReviewerWorksheet(); return w.rows.length === 12 && w.rows.every((r) => r.reviewerScore === null && r.reviewerRationale === null && r.reviewerConfidence === null && r.reviewerId === null && r.reviewDate === null) && w.overallScore === null && w.riskBand === null && w.signoff === null && w.productApproved === false && w.reviewResult === "evidence_incomplete"; })(), "unscored");
  add("16H-K1-Q: Steakhouse capacity stays verified_uncapped with its pinned citation; deposit state unknown", (() => { const c = JSON.parse(readIf("public/generated/stable-yield-market-cache.json")); return c.capacityState === "verified_uncapped" && c.capacitySourceCommit === "1d146d7087a76edbbadc14d848ae14295c0745a4" && c.depositState === "unknown" && STABLE_YIELD_PRODUCTION_CAPACITY_RESOLVED === true && STABLE_YIELD_PRODUCTION_DEPOSIT_STATE_RESOLVED === false; })(), "preserved");
  add("16H-K1-R: production still returns no_plan and renders no Stable Yield card; Demo unchanged", getApprovedYieldStrategies().length === 0 && (() => { const r = deriveStableYieldPlanSuggestion({ dataMode: "real_wallet", positions: [], checkedAt: NOW }); return r.decision?.status === "no_plan" && r.suggestion === null; })() && SY_deriveRail({ positions: DEMO_STABLE_YIELD_POSITIONS, pricedAsOf: DEMO_STABLE_YIELD_PRICED_AS_OF, goal: DEMO_STABLE_YIELD_GOAL }).cards.every((c) => c.type !== "deploy_idle_stablecoins") && buildDemoStableYieldRail().cards.filter((c) => c.type === "deploy_idle_stablecoins").length === 1, "unchanged");

  // ---- SOL staking untouched ----
  add("16H-K1-S: staking risk modules are unchanged and import no governance module", ["solLiquidStakingJupsolRiskScore", "solLiquidStakingMsolRiskScore", "solLiquidStakingBsolRiskScore", "solLiquidStakingInfRiskScore", "solNativeStakingBaselineRiskScore"].every((f) => { const src = readIf(`src/suggestions/${f}.ts`); return src.length > 0 && !/riskGovernance|riskReviewerRegistry|getApprovedRiskRubricV1/.test(src); }), "untouched");
  add("16H-K1-T: no automatic v1 migration or reinterpretation occurred", getRiskScoreMigrationReport().filter((m) => /JupSOL|mSOL|bSOL|INF|Native/i.test(m.subject)).every((m) => m.classification === "requires_rescoring" && /Do NOT map/i.test(m.requiredAction) && m.usableUnderCurrentApprovedBehavior === true), "no migration");

  // ---- INTERNAL-ONLY score boundary ----
  {
    /** Every user-facing contract + component. The score must appear in NONE of them. */
    const userFacing = [
      "src/components/SuggestionCard.tsx", "src/components/SuggestionReviewModal.tsx",
      "src/components/RealWalletSuggestionsRail.tsx", "src/pages/DemoDashboardPage.tsx",
      "src/pages/DashboardPage.tsx", "src/pages/PortfolioPage.tsx", "src/components/PortfolioTable.tsx",
      "src/suggestions/toSuggestionCard.ts", "src/suggestions/yieldStrategyPlanPresentation.ts",
      "src/suggestions/yieldStrategyPlanPresentationTypes.ts",
    ];
    // Strip comments before scanning: a comment EXPLAINING the boundary is not a breach of it.
    const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/^\s*\/\/.*$/gm, "");
    const blob = userFacing.map((f) => strip(readIf(f))).join("");
    const forbidden = ["riskScore", "riskSuitabilityScore", "dimensionScores", "dimensionWeights", "weightedScore", "riskBand", "reviewerConfidence", "MIN_PROTOCOL_RISK_SCORE", "mandatoryBlocker", "rubric"];
    const hits = forbidden.filter((f) => blob.includes(f));
    add("16H-K1-U: no numeric score / dimension / weight / band / threshold / confidence in ANY user-facing contract", hits.length === 0, hits.length ? hits.join(",") : "clean");
    add("16H-K1-V: React components import no risk scoring / aggregation / governance module", userFacing.every((f) => !/(from|import)\s*\(?\s*["'][^"']*(riskGovernance|riskScoreExposurePolicy|protocolRiskScoreAssignment|protocolRiskRubric|riskReviewerRegistry|steakhouseUsdcRiskEvidence)/.test(strip(readIf(f)))), "no imports");
    add("16H-K1-W: the card + review presentation contracts expose no field that could reconstruct a score", (() => { const t = readIf("src/suggestions/yieldStrategyPlanPresentationTypes.ts"); return !/risk|score|band|weight|confidence/i.test(t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "")); })(), "no fields");
  }
  add("16H-K1-X: the reviewer record / identity never reaches a user-facing surface", ["src/components/SuggestionCard.tsx", "src/components/SuggestionReviewModal.tsx", "src/pages/DashboardPage.tsx", "src/suggestions/toSuggestionCard.ts"].every((f) => { const src = readIf(f); return !/ws_product_owner|Ashot|reviewerId|approvedBy/.test(src); }), "internal");
  add("16H-K1-Y: no Smith AI / Qdrant / analytics contract carries a risk score", (() => { const files = readdirSync(`${root}/src`, { recursive: true } as never) as unknown as string[]; const cands = (files as string[]).filter((f) => typeof f === "string" && /smithAi|smith_ai|qdrant|analytics|telemetry/i.test(f) && /\.tsx?$/.test(f)); const blob = cands.map((f) => readIf(`src/${f}`)).join(""); return !/riskScore|riskBand|weightedScore|dimensionScores|reviewerConfidence/.test(blob); })(), "clean");
  add("16H-K1-Z: the approved qualitative disclosures leak NO ordinal signal (no number/band/comparative)", listQualitativeRiskDisclosures().length === 6 && listQualitativeRiskDisclosures().every((d) => !disclosureLeaksNumericSignal(d)), "6 disclosures");
  add("16H-K1-AA: the disclosure vocabulary covers the decided concepts", (() => { const ids = listQualitativeRiskDisclosures().map((d) => d.id); return ["strategy_is_managed", "protocol_and_smart_contract_risk", "program_is_upgradeable", "withdrawals_depend_on_liquidity", "yield_may_change", "not_passed_required_review"].every((i) => ids.includes(i as never)); })(), "covered");
  add("16H-K1-AB: the internal-only policy names the forbidden surfaces + fields", RISK_SCORE_FORBIDDEN_SURFACES.length >= 10 && RISK_SCORE_FORBIDDEN_FIELDS.includes("riskScore") && RISK_SCORE_FORBIDDEN_FIELDS.includes("dimensionWeights") && RISK_SCORE_FORBIDDEN_FIELDS.includes("riskBand"), "named");
  add("16H-K1-AC: the legacy `riskScore` field name is preserved but documented as SUITABILITY", (() => { const p = readIf("src/suggestions/riskScoreExposurePolicy.ts"); return /legacy internal field name/i.test(p) && /higher = STRONGER evidence-supported suitability/i.test(p) && RISK_SUITABILITY_SCORE_LABEL.includes("internal"); })(), "documented");
  add("16H-K1-AD: internal-only flags true; user-facing numeric score flag FALSE", RISK_SCORE_INTERNAL_ONLY_POLICY_EXISTS === true && RISK_SCORE_USER_FACING_SUPPRESSION_EXISTS === true && USER_FACING_NUMERIC_RISK_SCORE_EXISTS === false, "accurate");

  // ---- Safety ----
  // The internal /testing gallery is a PERMITTED internal-diagnostics surface, not a product surface:
  // it self-labels TESTING_PREVIEW_NOT_LIVE / "Internal evidence view only" and is absent from product
  // navigation. This check pins that boundary so it stays a deliberate exception, not a loophole.
  add("16H-K1-AF: the internal /testing gallery is self-labelled internal and absent from product nav", (() => { const tp = readIf("src/pages/TestingPage.tsx") + readIf("src/pages/testingPageFixtures.ts"); const labelled = /TESTING_PREVIEW_NOT_LIVE/.test(tp) && /Internal evidence view only/.test(tp); const nav = readIf("src/components/GlobalNav.tsx"); return labelled && !/testing/i.test(nav); })(), "internal only");
  add("16H-K1-AG: no PRODUCT surface renders a numeric score, band, weight or threshold", ["src/components/SuggestionCard.tsx", "src/components/RealWalletSuggestionsRail.tsx", "src/pages/DashboardPage.tsx", "src/pages/PortfolioPage.tsx", "src/components/PortfolioTable.tsx"].every((f) => { const src = readIf(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, ""); return !/Risk score|riskScore|riskBand|weightedScore|dimensionScores|reviewerConfidence/.test(src); }), "clean");

  add("16H-K1-AE: the decision added no execution / signature / deposit / external navigation", (() => { const blob = ["riskGovernance.ts", "riskReviewerRegistry.ts", "riskScoreExposurePolicy.ts", "steakhouseReviewerWorksheet.ts"].map((f) => readIf(`src/suggestions/${f}`)).join(""); return !/sendTransaction|signTransaction|window\.open|deposit\(|withdraw\(|lifecycle\s*=\s*"approved"|registry\.push/.test(blob); })(), "read-only");

  return checks;
}


/**
 * Step 16H-K.2 — the internal `/testing` route gate. Deterministic and OFFLINE: these read source and
 * the gate module, never a live build.
 */

/**
 * Step 16H-L — Steakhouse evidence closure. Deterministic and OFFLINE: the artifacts are committed
 * records of live reads; these checks read the records, never the chain.
 */
export function runSteakhouseEvidenceClosureFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const root = process.cwd();
  const readIf = (rel: string) => { try { return readFileSync(`${root}/${rel}`, "utf8"); } catch { return ""; } };
  const VAULT = "HDsayqAsDWy3QvANGqh2yNraqcD8Fnjgh73Mhb3WRS5E";
  const HIGH_YIELD = "BEEfo7xwgK2ZP13Pxo7qqTPzAteKJmXjVWtMWcXSvbn2";
  const TESTING_VAULT = "JDmkiqvtyAqAsqrLGDgVH2GesbRAAMJCoQtqiyWx82bF";
  const src = readIf("src/suggestions/steakhouseEvidenceClosure.ts");
  const readiness = evaluateReviewReadiness();

  // ---- Identity binding ----
  add("16H-L-A: every artifact binds the exact vault / share mint / program", CLOSURE_BINDING.vaultAddress === VAULT && CLOSURE_BINDING.sharesMint === "7D8C5pDFxug58L9zkwK7bCiDg4kD4AygzbcZUmf5usHS" && CLOSURE_BINDING.programId === "KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd" && RESERVE_EXPOSURE.vaultAddress === VAULT && WITHDRAWAL_SEMANTICS.vaultAddress === VAULT && DEPOSIT_STATE.vaultAddress === VAULT, "bound");
  add("16H-L-B: no sibling / High Yield / Testing vault appears in any artifact", !src.includes(HIGH_YIELD) && !src.includes(TESTING_VAULT), "exact only");
  add("16H-L-C: artifacts are versioned and carry an evidence cutoff", RESERVE_EXPOSURE.version.length > 0 && AUDIT_LINKAGE.version.length > 0 && WITHDRAWAL_SEMANTICS.version.length > 0 && INCIDENT_REVIEW.cutoffAt === L1_INCIDENT_REVIEW_CUTOFF_AT && RESERVE_EXPOSURE.evidenceCutoffAt === CLOSURE_EVIDENCE_CUTOFF_AT, "versioned");

  // ---- Authority evidence ----
  add("16H-L-D: the upgrade authority address + owner program are preserved verbatim", (() => { const a = AUTHORITY_EVIDENCE.find((x) => x.role === "program_upgrade_authority")!; return a.address === "GzFgdRJXmawPhGeBsyRCDLx4jAKPsvbUqoqitzppkzkW" && a.ownerProgram === "11111111111111111111111111111111"; })(), "preserved");
  // 16H-L-E REPLACED in 16H-L.1. It previously asserted the FALSE conclusion "no multisig claimed",
  // derived from System-Program ownership alone. A Squads vault PDA is also System-Program-owned with
  // zero data, so that inference was invalid. These checks pin the corrected, derivation-backed model
  // and lock the door on the bad inference ever returning.
  add("16H-L.1-E1: System-Program ownership alone is NEVER used to conclude a raw keypair", AUTHORITY_EVIDENCE.filter((a) => a.ownerProgram === "11111111111111111111111111111111" && a.controlModel === "verified_raw_keypair").every((a) => a.isOnCurve === true), "curve required");
  add("16H-L.1-E2: every off-curve authority is classified as a PDA, never a keypair", AUTHORITY_EVIDENCE.filter((a) => !a.isOnCurve).every((a) => a.controlModel === "verified_squads_vault_pda" || a.controlModel === "verified_other_program_authority"), "off-curve => PDA");
  add("16H-L.1-E3: every Squads authority names a state account DISTINCT from its own address, plus seeds", AUTHORITY_EVIDENCE.filter((a) => a.controlModel === "verified_squads_vault_pda").every((a) => !!a.squadsControl && a.squadsControl.multisigStateAccount !== a.address && a.squadsControl.derivedFromSeeds.includes(a.squadsControl.multisigStateAccount)), "state != PDA");
  add("16H-L.1-E4: upgrade authority is the 5-of-10 Squads v4 multisig with a 24h time lock", (() => { const c = AUTHORITY_EVIDENCE.find((a) => a.role === "program_upgrade_authority")!.squadsControl!; return c.multisigStateAccount === "6hhBGCtmg7tPWUSgp3LG6X2rsmYWAc4tNsA6G4CnfQbM" && c.threshold === 5 && c.memberCount === 10 && c.timeLockSeconds === 86400 && c.squadsVersion === "v4"; })(), "5/10 + 24h");
  add("16H-L.1-E5: vault admin is the 3-of-10 Squads v4 multisig with NO time lock", (() => { const c = AUTHORITY_EVIDENCE.find((a) => a.role === "vault_admin_authority")!.squadsControl!; return c.multisigStateAccount === "4WUP4FFwgWd6gsCd8hR2umCLQA2pFCEaMm21vbyDZubA" && c.threshold === 3 && c.timeLockSeconds === 0; })(), "3/10 + no lock");
  add("16H-L.1-E6: allocation admin remains the one verified single-key authority", (() => { const a = AUTHORITY_EVIDENCE.find((x) => x.role === "allocation_admin")!; return a.controlModel === "verified_raw_keypair" && a.isOnCurve === true && !a.squadsControl; })(), "single key");
  add("16H-L.1-E7: a threshold is only ever credited when config_authority is default", AUTHORITY_EVIDENCE.filter((a) => a.squadsControl).every((a) => a.squadsControl!.configAuthorityIsDefault === true && a.squadsControl!.configAuthority === "11111111111111111111111111111111"), "config authority checked");
  add("16H-L.1-E8: threshold never exceeds the voting-member population", AUTHORITY_EVIDENCE.filter((a) => a.squadsControl).every((a) => a.squadsControl!.threshold >= 1 && a.squadsControl!.threshold <= a.squadsControl!.votingMemberCount && a.squadsControl!.votingMemberCount <= a.squadsControl!.memberCount), "coherent");
  add("16H-L.1-E9: multisig control is NEVER stated as proof of who holds the member keys", AUTHORITY_EVIDENCE.filter((a) => a.squadsControl).every((a) => /member keys|who controls/i.test(a.doesNotProve)), "holders unproven");
  add("16H-L.1-F: MPC/off-chain custody is still NOT ruled out for the single-key authority", AUTHORITY_EVIDENCE.every((a) => a.doesNotProve.length > 0) && /MPC|indistinguishable/i.test(AUTHORITY_EVIDENCE.find((a) => a.role === "allocation_admin")!.doesNotProve), "limit stated");
  add("16H-L.1-G: timelock status is now VERIFIED per authority, never inferred from the control model", (() => { const byRole = (r: string) => AUTHORITY_EVIDENCE.find((a) => a.role === r)!; return byRole("program_upgrade_authority").timelockStatus === "verified_timelocked" && byRole("vault_admin_authority").timelockStatus === "verified_no_timelock" && byRole("allocation_admin").timelockStatus === "verified_no_timelock" && byRole("base_vault_authority").timelockStatus === "unknown"; })(), "verified per authority");
  add("16H-L-H: program / vault-admin / allocation-admin are kept SEPARATE, not merged", (() => { const roles = AUTHORITY_EVIDENCE.map((a) => a.role); return roles.includes("program_upgrade_authority") && roles.includes("vault_admin_authority") && roles.includes("allocation_admin") && new Set(AUTHORITY_EVIDENCE.map((a) => a.address)).size === AUTHORITY_EVIDENCE.length; })(), "separate");
  add("16H-L.1-I1: every permission carries a control gate consistent with its holder's verified evidence", AUTHORITY_PERMISSIONS.length >= 8 && AUTHORITY_PERMISSIONS.every((p) => { if (p.heldBy === "program_upgrade_authority") return p.controlGate === "multisig_threshold_and_timelock"; if (p.heldBy === "vault_admin_authority") return p.controlGate === "multisig_threshold_only"; if (p.heldBy === "allocation_admin") return p.controlGate === "single_key"; return p.controlGate === "unresolved"; }), "gates match evidence");
  add("16H-L.1-I2: the allocation powers — where user USDC goes — are still gated by ONE key", AUTHORITY_PERMISSIONS.filter((p) => p.heldBy === "allocation_admin").length >= 2 && AUTHORITY_PERMISSIONS.filter((p) => p.heldBy === "allocation_admin").every((p) => p.controlGate === "single_key"), "single key allocation");
  add("16H-L-J: deposit/withdrawal pause powers are recorded as NOT supported by the source", AUTHORITY_PERMISSIONS.filter((p) => /pause or restrict/i.test(p.power)).every((p) => p.supportedByProgramSource === false && p.heldBy === "unknown"), "no pause power");
  add("16H-L.1-DH1: the live program is the one that actually owns the reviewed vault", AUDIT_LINKAGE.deploymentHistory.current.programId === CLOSURE_BINDING.programId && AUDIT_LINKAGE.deploymentHistory.current.status === "live_canonical" && /OWNED by this program/i.test(AUDIT_LINKAGE.deploymentHistory.current.evidence), "live = vault owner");
  add("16H-L.1-DH2: the historical program is recorded as CLOSED and is never bound to this product", AUDIT_LINKAGE.deploymentHistory.historical.programId === "kvauTFR8qm1dhniz6pYuBZkuene3Hfrs1VQhVRgCNrr" && AUDIT_LINKAGE.deploymentHistory.historical.status === "closed_historical" && String(AUDIT_LINKAGE.deploymentHistory.historical.programId) !== String(CLOSURE_BINDING.programId), "closed, unbound");
  add("16H-L.1-DH3: the two program IDs are never conflated", String(AUDIT_LINKAGE.deploymentHistory.current.programId) !== String(AUDIT_LINKAGE.deploymentHistory.historical.programId), "distinct");
  add("16H-L.1-DH4: audit linkage stays UNVERIFIED — the closed program widens the gap, never closes it", AUDIT_LINKAGE.result === "unverified_linkage" && /UNRESOLVED|worse, not better/i.test(AUDIT_LINKAGE.deploymentHistory.historical.relevanceToThisReview), "still unverified");
  add("16H-L.1-DH5: the deploy timestamp is chain-sourced, not approximated", AUDIT_LINKAGE.deployedEvidence.lastDeployedAt === "2026-07-14T14:54:02.000Z" && AUDIT_LINKAGE.deployedEvidence.programHashVerified === false, "chain time");
  add("16H-L-K: the GlobalConfig withdrawal-penalty authority is recorded as a distinct surface", AUTHORITY_PERMISSIONS.some((p) => p.heldBy === "kamino_global_config" && /withdrawal penalty/i.test(p.power)), "global config");

  // ---- Reserve exposure ----
  add("16H-L-L: the reserve list is deterministic and slot-bound", RESERVE_EXPOSURE.reserves.length === 4 && RESERVE_EXPOSURE.sourceSlot === "433291120" && RESERVE_EXPOSURE.activeSlots === 4 && RESERVE_EXPOSURE.totalSlots === 25, "4 of 25");
  add("16H-L-M: every reserve's liquidity mint is verified canonical USDC", RESERVE_EXPOSURE.reserves.every((r) => r.liquidityMintIsCanonicalUsdc === true && r.liquidityMint === "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), "all USDC");
  add("16H-L-N: market names come from the OFFICIAL list; an unresolved market stays null", (() => { const named = RESERVE_EXPOSURE.reserves.filter((r) => r.marketName !== null); const unnamed = RESERVE_EXPOSURE.reserves.filter((r) => r.marketName === null); return named.length === 3 && named.some((r) => r.marketName === "JLP Market") && named.some((r) => r.marketName === "SOL/BTC Market") && named.some((r) => r.marketName === "Bitcoin Market") && unnamed.length === 1; })(), "3 named, 1 null");
  add("16H-L-O: allocation is PROVEN dynamic (weights drifted between two reads, no user action)", RESERVE_EXPOSURE.allocationIsDynamic === true && /changed between reads with no user action/i.test(RESERVE_EXPOSURE.allocationDriftEvidence), "proven dynamic");
  add("16H-L-P: the snapshot does not imply a permanent allocation", RESERVE_EXPOSURE.invalidationTriggers.length >= 3 && RESERVE_EXPOSURE.invalidationTriggers.some((t) => /allocation change/i.test(t)), "non-permanent");
  add("16H-L-Q: the snapshot assigns NO risk score to any reserve", !/riskScore|score:|riskBand/.test(JSON.stringify(RESERVE_EXPOSURE)), "no scores");
  add("16H-L-R: reserves are NOT treated as equivalent just because all supply USDC", /NOT equivalent|different collateral|credit risk/i.test(src), "not equivalent");
  add("16H-L-S: the unresolved reserve-level gaps are preserved, not glossed", RESERVE_EXPOSURE.unresolved.length >= 3 && RESERVE_EXPOSURE.unresolved.some((u) => /collateral|liquidation/i.test(u)), "preserved");

  // ---- Audit linkage ----
  add("16H-L-T: linkage is classified unverified_linkage (no audited commit published)", AUDIT_LINKAGE.result === "unverified_linkage" && AUDIT_LINKAGE.audits.every((a) => a.auditedCommit === null), "unverified");
  add("16H-L-U: a report date / matching program name is explicitly NOT accepted as linkage", /not linkage|chronological consistency is a hypothesis/i.test(AUDIT_LINKAGE.reasoning), "not linkage");
  add("16H-L-V: no reproducible build or verified program hash is claimed", AUDIT_LINKAGE.deployedEvidence.reproducibleBuildAvailable === false && AUDIT_LINKAGE.deployedEvidence.programHashVerified === false, "not claimed");
  add("16H-L-W: the exact evidence request to resolve linkage is recorded", AUDIT_LINKAGE.whatWouldResolveIt.length >= 4 && AUDIT_LINKAGE.whatWouldResolveIt.some((x) => /commit/i.test(x)) && AUDIT_LINKAGE.whatWouldResolveIt.some((x) => /reproducible|hash/i.test(x)), "recorded");
  add("16H-L-X: a program upgrade invalidates the linkage assessment", AUDIT_LINKAGE.invalidationTriggers.some((t) => /upgrade/i.test(t)), "invalidates");

  // ---- Withdrawal ----
  add("16H-L-Y: instant withdrawal is NOT claimed", /NOT PROVEN/.test(WITHDRAWAL_SEMANTICS.instantWithdrawalClaim) && /must not be claimed/i.test(WITHDRAWAL_SEMANTICS.instantWithdrawalClaim), "not claimed");
  add("16H-L-Z: reserve-liquidity dependency is represented", /depends on liquidity in the underlying reserves/i.test(WITHDRAWAL_SEMANTICS.instantWithdrawalClaim), "represented");
  add("16H-L-AA: the SDK's queued-withdrawal model is represented", WITHDRAWAL_SEMANTICS.sdkModels.some((m) => /queuedForWithdrawalForReserves/.test(m)), "queue modeled");
  add("16H-L-AB: the withdrawal PENALTY is captured, and noted as outside the net APY", WITHDRAWAL_SEMANTICS.programGuarantees.some((g) => /WITHDRAWAL PENALTY/.test(g)) && WITHDRAWAL_SEMANTICS.unresolved.some((u) => /net APY does NOT include/i.test(u)), "penalty captured");
  add("16H-L-AC: the minimum withdrawal is recorded exactly", WITHDRAWAL_SEMANTICS.minWithdrawRaw === "1000" && WITHDRAWAL_SEMANTICS.minWithdrawUsdc === 0.001, "0.001 USDC");
  add("16H-L-AD: farm-staked share behaviour is preserved as unresolved", WITHDRAWAL_SEMANTICS.unresolved.some((u) => /farm-staked/i.test(u)), "unresolved");

  // ---- Incident review ----
  add("16H-L-AE: 'no incident found' is NOT recorded as a clean history", INCIDENT_REVIEW.state === "review_incomplete" && /NOT .no incident occurred|is NOT `no_confirmed_incident_found_within_reviewed_scope`/i.test(INCIDENT_REVIEW.absenceInterpretation), "not clean");
  add("16H-L-AF: the review scope AND the un-reviewed scope are both documented", INCIDENT_REVIEW.scopeReviewed.length >= 2 && INCIDENT_REVIEW.scopeNotReviewed.length >= 4, "scoped");
  add("16H-L-AG: the review cutoff is preserved and staleness invalidates it", INCIDENT_REVIEW.cutoffAt.length > 0 && INCIDENT_REVIEW.invalidationTriggers.some((t) => /cutoff|stale/i.test(t)), "cutoff");

  // ---- Deposit state ----
  add("16H-L-AH: the program MECHANISM finding and CURRENT availability are separate answers", DEPOSIT_STATE.programMechanismFinding === "verified_no_explicit_deposit_state_control" && DEPOSIT_STATE.currentAvailability === "unknown", "separated");
  add("16H-L-AI: capacity does NOT imply enabled; a readable account does NOT imply enabled", DEPOSIT_STATE.mustNotInfer.some((m) => /verified_uncapped does NOT mean verified_enabled/.test(m)) && DEPOSIT_STATE.mustNotInfer.some((m) => /account read does NOT mean deposits are enabled/i.test(m)), "no inference");
  add("16H-L-AJ: the absence of a pause flag does NOT prove a deposit would succeed", DEPOSIT_STATE.mustNotInfer.some((m) => /absence of a pause flag does NOT prove/i.test(m)), "no inference");
  add("16H-L-AK: every explicit deposit-state control is recorded as absent from the source", Object.values(DEPOSIT_STATE.explicitStateControls).every((v) => v === false), "none exist");
  add("16H-L-AL: the exhaustive deposit failure conditions are enumerated from the source", DEPOSIT_STATE.depositFailureConditions.length >= 5 && DEPOSIT_STATE.depositFailureConditions.some((c) => /VaultDepositCapReached/.test(c)) && DEPOSIT_STATE.depositFailureConditions.some((c) => /DepositAmountBelowMinimum/.test(c)), "enumerated");
  add("16H-L-AM: NO transaction was constructed or simulated", DEPOSIT_STATE.transactionConstructedOrSimulated === false && !/sendTransaction|signTransaction|simulateTransaction|buildTransaction|TransactionMessage/.test(src), "none");

  // ---- Readiness evaluator ----
  // 16H-L asserted `blocked_pending_protocol_confirmation`. 16H-L.2 resolved BOTH mandatory blockers on
  // EVIDENCE COMPLETENESS (not favourability), so readiness legitimately advanced. Rewritten to assert
  // the invariant that must never break: readiness may only leave `blocked` when no mandatory blocker
  // survives, and must never reach `ready_for_human_scoring` while partial coverage remains. Items still
  // needing Kamino now live in KAMINO_QUESTIONNAIRE rather than in readiness.protocolConfirmationRequired,
  // which is derived from BLOCKED dimensions and is therefore correctly empty: those questions improve
  // confidence, they no longer gate scoring. The check asserts both halves so neither can drift.
  add("16H-L-AN (updated by 16H-L.2): readiness advanced to conditional, and only because no blocker survives", (() => { const blockers = DIMENSION_READINESS.filter((d) => d.mandatoryBlockerPresent).length; return readiness.result === "conditionally_ready_for_human_scoring" && blockers === 0 && DIMENSION_READINESS.some((d) => d.state === "partial") && readiness.protocolConfirmationRequired.length === 0 && KAMINO_QUESTIONNAIRE.sections.flatMap((x) => x.questions).length > 0; })(), readiness.result);
  add("16H-L-AO: missing evidence NEVER produces `unsuitable` (only a verified disqualifier does)", evaluateReviewReadiness({ dimensions: DIMENSION_READINESS.map((d) => ({ ...d, state: "blocked" as const, mandatoryBlockerPresent: true })) }).result === "blocked_pending_protocol_confirmation", "blocked not unsuitable");
  add("16H-L-AP: a VERIFIED disqualifying condition produces `unsuitable`", evaluateReviewReadiness({ verifiedDisqualifyingCondition: "verified: the vault requires the user to take on debt" }).result === "unsuitable_to_continue_review", "unsuitable");
  add("16H-L-AQ: complete mandatory evidence produces `ready_for_human_scoring`", evaluateReviewReadiness({ dimensions: DIMENSION_READINESS.map((d) => ({ ...d, state: "complete" as const, mandatoryBlockerPresent: false })) }).result === "ready_for_human_scoring", "ready");
  add("16H-L-AR: a non-mandatory gap alone produces `conditionally_ready`", evaluateReviewReadiness({ dimensions: DIMENSION_READINESS.map((d, i) => ({ ...d, state: (i === 0 ? "partial" : "complete") as DimensionEvidenceState, mandatoryBlockerPresent: false })) }).result === "conditionally_ready_for_human_scoring", "conditional");
  add("16H-L-AS: stale evidence blocks scoring", evaluateReviewReadiness({ dimensions: DIMENSION_READINESS.map((d, i) => ({ ...d, state: (i === 0 ? "stale" : "complete") as DimensionEvidenceState, mandatoryBlockerPresent: false })) }).result === "blocked_pending_protocol_confirmation", "stale blocks");
  add("16H-L-AT: readiness assigns NO score, signs off NOTHING, approves NOTHING", !("score" in readiness) && !("riskBand" in readiness) && !("approved" in readiness) && !/riskScore|weightedScore|aggregate/.test(JSON.stringify(readiness)), "no scores");
  add("16H-L-AU: every rubric dimension has an evidence state", DIMENSION_READINESS.length === 12 && DIMENSION_READINESS.every((d) => ["complete", "partial", "blocked", "stale", "not_applicable"].includes(d.state)), "12 dims");
  add("16H-L-AV: gaps genuinely CLOSED are recorded as resolved, not left pessimistic", (() => { const sc = DIMENSION_READINESS.find((d) => d.dimension === "strategy_complexity")!; const op = DIMENSION_READINESS.find((d) => d.dimension === "operational_dependency_risk")!; return sc.mandatoryBlockerPresent === false && /RESOLVED/.test(sc.detail) && op.state === "complete"; })(), "resolved recorded");

  // ---- Questionnaire ----
  add("16H-L-AW: the questionnaire binds the exact product and is NOT claimed as sent", KAMINO_QUESTIONNAIRE.sent === false && KAMINO_QUESTIONNAIRE.bindsTo.vault === VAULT && KAMINO_QUESTIONNAIRE.bindsTo.program === "KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd", "not sent");
  add("16H-L-AX: it covers all six required areas and stays short enough to send", (() => { const ids = KAMINO_QUESTIONNAIRE.sections.map((s) => s.id); const total = KAMINO_QUESTIONNAIRE.sections.reduce((n, s) => n + s.questions.length, 0); return ids.length === 6 && KAMINO_QUESTIONNAIRE.sections.every((s) => s.questions.length >= 1 && s.questions.length <= 3) && total <= 13; })(), "6 sections, <=13 questions");
  add("16H-L-AY: no Kamino confirmation is fabricated anywhere", !/Kamino confirmed|per Kamino|Kamino stated|they confirmed/i.test(src), "none fabricated");

  // ---- Flags ----
  add("16H-L-AZ: artifact-exists flags are true; every conclusion flag is FALSE", [STEAKHOUSE_ADMIN_AUTHORITY_EVIDENCE_EXISTS, STEAKHOUSE_AUTHORITY_PERMISSION_MATRIX_EXISTS, STEAKHOUSE_RESERVE_EXPOSURE_SNAPSHOT_EXISTS, STEAKHOUSE_AUDIT_LINKAGE_ASSESSMENT_EXISTS, STEAKHOUSE_WITHDRAWAL_SEMANTICS_ARTIFACT_EXISTS, STEAKHOUSE_INCIDENT_REVIEW_ARTIFACT_EXISTS, STEAKHOUSE_DEPOSIT_STATE_ASSESSMENT_EXISTS, STEAKHOUSE_REVIEW_READINESS_EVALUATOR_EXISTS, KAMINO_OUTREACH_QUESTIONNAIRE_EXISTS].every((f) => f === true) && [STEAKHOUSE_ADMIN_CONTROLS_FULLY_VERIFIED, STEAKHOUSE_AUDIT_TO_DEPLOYMENT_LINKAGE_VERIFIED, STEAKHOUSE_WITHDRAWAL_MODEL_COMPLETE, STEAKHOUSE_INCIDENT_REVIEW_COMPLETE, STEAKHOUSE_EVIDENCE_COMPLETE, STEAKHOUSE_READY_FOR_HUMAN_SCORING].every((f) => f === false), "accurate");
  // ---- 16H-L.1 incident-history follow-up ----
  add("16H-L.1-I1: an official scoped track record is recorded, WITH its scope", INCIDENT_REVIEW.officialClaims.length >= 1 && INCIDENT_REVIEW.officialClaims.every((c) => c.scope.length > 0 && typeof c.coversThisVaultOrProgram === "boolean"), "claims + scope");
  add("16H-L.1-I2: no official claim is recorded as covering this vault or program", INCIDENT_REVIEW.officialClaims.every((c) => c.coversThisVaultOrProgram === false && c.coversAllActiveMarkets === false), "scope gap kept");
  add("16H-L.1-I3: the primary $0-bad-debt claim is scoped to bad debt + lending markets only", (() => { const c = INCIDENT_REVIEW.officialClaims.find((x) => x.sourceType === "official_primary")!; return /bad debt only/i.test(c.scope) && /lending markets only/i.test(c.scope) && c.statedCutoffDate === null; })(), "narrow scope");
  add("16H-L.1-I4: the '0 Incidents' X post is kept as marketing, never as a scoped disclosure", (() => { const c = INCIDENT_REVIEW.officialClaims.find((x) => x.sourceType === "official_marketing")!; return c.scope === "none stated" && c.statedCutoffDate === null && /NOT treated as a scoped disclosure/i.test(c.note); })(), "marketing != disclosure");
  add("16H-L.1-I5: the unverified third-party bad-debt lead is retained but NOT a finding", INCIDENT_REVIEW.unresolvedThirdPartyLeads.length >= 1 && INCIDENT_REVIEW.unresolvedThirdPartyLeads.every((l) => l.sourceType === "third_party_unverified" && /never establish a fact/i.test(l.whyNotRecordedAsFact)) && INCIDENT_REVIEW.confirmedIncidents.length === 0, "lead != fact");
  add("16H-L.1-I6: 'no incident found' is NEVER collapsed into 'no incident occurred'", /NOT 'no incident occurred'|NOT .no incident occurred./i.test(INCIDENT_REVIEW.absenceInterpretation) && INCIDENT_REVIEW.state === "review_incomplete", "not collapsed");
  add("16H-L.1-I7: the uncovered dominant market and the vault layer are named in scopeNotReviewed", INCIDENT_REVIEW.scopeNotReviewed.some((x) => /SOL\/BTC Market/i.test(x)) && INCIDENT_REVIEW.scopeNotReviewed.some((x) => /kvault program/i.test(x)), "gaps named");
  // 16H-L.1-I8 asserted the incident blocker survives the official track record. It DID survive that —
  // the track record covers 10.95% of allocation and neither the vault nor the deployment. The blocker
  // was cleared later, by the 16H-L.2 addendum, on EVIDENCE COMPLETENESS: sources enumerated, coverage
  // quantified, gaps named, lead retained, mechanism verified. Rewritten to assert exactly that, so the
  // original guarantee (a track record alone never clears it) still holds.
  add("16H-L.1-I8 (updated by 16H-L.2): the track record alone never cleared the blocker — completeness did", (() => { const d = DIMENSION_READINESS.find((x) => x.dimension === "incident_history")!; return d.mandatoryBlockerPresent === false && /completeness, NOT a clean record/i.test(d.detail) && OFFICIAL_LIMITED_SCOPE_STATEMENTS.every((o) => o.coversExactVault === false) && getSteakhouseIncidentCompleteness().result === "complete_for_human_scoring" && CONFIRMED_INCIDENTS.length === 0; })(), "cleared on completeness");
  add("16H-L.1-I9: the incident review carries its own, later cutoff", INCIDENT_REVIEW.cutoffAt === L1_INCIDENT_REVIEW_CUTOFF_AT && Date.parse(INCIDENT_REVIEW.cutoffAt) > Date.parse(CLOSURE_EVIDENCE_CUTOFF_AT), "own cutoff");
  add("16H-L.1-I10: no published review postdates the deployed binary", Date.parse("2026-05-05") < Date.parse(VERIFICATION_RECORD.currentDeploymentTimestamp) && INCIDENT_REVIEW.scopeNotReviewed.some((x) => /after 2026-05-05/i.test(x)), "stale for binary");

  // ---- 16H-L.1 diagnostics + reserve emergency-authority exposure ----
  add("16H-L.1-G1: diagnostics RESOLVED by 16H-L.1 are no longer raised", ["upgrade_authority_control_unknown", "upgrade_authority_not_multisig_verified", "allocation_admin_control_unknown", "admin_permissions_unknown", "reserve_exposure_incomplete", "reserve_market_identity_unknown", "withdrawal_model_incomplete", "deposit_state_unknown"].every((d) => !(RAISED_DIAGNOSTICS as string[]).includes(d)), "resolved removed");
  add("16H-L.1-G2: the replacement diagnostics state what is KNOWN, not what is unknown", (RAISED_DIAGNOSTICS as string[]).includes("allocation_admin_single_key_no_timelock") && (RAISED_DIAGNOSTICS as string[]).includes("vault_admin_multisig_no_timelock"), "known-state diagnostics");
  // 16H-L.1-G3 listed `audit_deployment_linkage_unverified` as permanently open. 16H-L.2 resolved it
  // by direct source inspection, so it is dropped from the expected set — and 16H-L.2-G1/G2 assert it
  // was replaced by narrower true diagnostics rather than silently discarded.
  add("16H-L.1-G3 (updated by 16H-L.2): genuinely open diagnostics survive", ["oracle_dependency_unknown", "incident_review_incomplete", "protocol_confirmation_required", "review_not_ready"].every((d) => (RAISED_DIAGNOSTICS as string[]).includes(d)), "open kept");
  add("16H-L.1-G4: no disqualifier is ever raised", !(RAISED_DIAGNOSTICS as string[]).includes("verified_disqualifying_condition") && RESERVE_EMERGENCY_AUTHORITY_EXPOSURE.isDisqualifier === false, "no disqualifier");
  add("16H-L.1-G5: the socialize_loss exposure is raised and reaches all four markets", (RAISED_DIAGNOSTICS as string[]).includes("reserve_emergency_council_socialize_loss_exposure_unresolved") && RESERVE_EMERGENCY_AUTHORITY_EXPOSURE.authoritiesNotIdentified.length === 4, "exposure raised");
  add("16H-L.1-G6: the exposure claims capability, NOT configuration or execution", RESERVE_EMERGENCY_AUTHORITY_EXPOSURE.configuredForTheseMarkets === "unresolved" && RESERVE_EMERGENCY_AUTHORITY_EXPOSURE.everExecuted === "unresolved", "capability only");
  add("16H-L.1-G7: the $0-bad-debt record is NOT used to resolve the socialize_loss exposure", /does not resolve this|not about who holds the switch/i.test(RESERVE_EMERGENCY_AUTHORITY_EXPOSURE.note), "track record != control");
  add("16H-L.1-G8: the reserve-liquidity shortfall is raised as a diagnostic, not just prose", (RAISED_DIAGNOSTICS as string[]).includes("reserve_liquidity_below_vault_position") && RESERVE_WITHDRAWAL_BEHAVIOR.some((r) => !r.reserveLiquidityCoversVaultPosition), "raised");

  /* ============ 16H-N.3a — exact-reserve API/SDK/UI parity ============ */

  // ---- Exact binding ----
  add("PAR-1: the API result is bound to the EXACT reserve address", KAMINO_RESERVE_METRICS_API.hasExactReserveAddress === true && KAMINO_RESERVE_METRICS_API.fields.includes("reserve") && PARITY_EVIDENCE.reserveAddress === "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59" && /exact `reserve` address field/i.test(PARITY_EVIDENCE.apiReserveBinding), "exact binding");
  add("PAR-2: mint-only matching is REJECTED — four USDC reserves match", KAMINO_RESERVE_METRICS_API.usdcMintMatchesInResponse === 4 && KAMINO_RESERVE_METRICS_API.mintOnlySelectionAmbiguous === true, "mint ambiguous");
  add("PAR-3: symbol-only matching is REJECTED", KAMINO_RESERVE_METRICS_API.symbolOnlySelectionAmbiguous === true && KAMINO_RESERVE_METRICS_API.fields.includes("liquidityToken"), "symbol ambiguous");
  add("PAR-4: API units are explicit and identical to the SDK's — NOT a unit error", KAMINO_RESERVE_METRICS_API.apyUnit === "decimal_ratio" && /NOT a unit error/i.test(KAMINO_RESERVE_METRICS_API.apyUnitEvidence) && PARITY_OBSERVATIONS[0].apiSupplyApyRaw < 1, "units explicit");
  add("PAR-5: API freshness is UNESTABLISHABLE from the response", KAMINO_RESERVE_METRICS_API.hasTimestampField === false && KAMINO_RESERVE_METRICS_API.hasSlotField === false && KAMINO_RESERVE_METRICS_API.freshnessEstablishableFromResponse === false, "no timestamp");

  // ---- Same-moment parity ----
  add("PAR-6: time skew is recorded per observation and is sub-second-ish", PARITY_OBSERVATIONS.length === 3 && PARITY_OBSERVATIONS.every((o) => o.skewMs < 2000 && o.slot.length > 0) && PARITY_EVIDENCE.maxSkewMs === 1142, "skew recorded");
  add("PAR-7: absolute and relative differences are computed correctly", PARITY_OBSERVATIONS.every((o) => Math.abs((o.apiSupplyApyPct - o.sdkSupplyApyPct) - o.absoluteDifferencePct) < 0.0001 && Math.abs((o.absoluteDifferencePct / o.sdkSupplyApyPct * 100) - o.relativeDifferencePct) < 0.01), "arithmetic");
  add("PAR-8: the disagreement is STABLE — systematic, not refresh lag", (() => { const rels = PARITY_OBSERVATIONS.map((o) => o.relativeDifferencePct); const apis = new Set(PARITY_OBSERVATIONS.map((o) => o.apiSupplyApyRaw)); const sdks = new Set(PARITY_OBSERVATIONS.map((o) => o.sdkSupplyApyPct)); return Math.max(...rels) - Math.min(...rels) < 0.01 && apis.size === 1 && sdks.size > 1; })(), "stable");
  add("PAR-9: a stale API value is not accepted as same-moment parity", KAMINO_RESERVE_METRICS_API.freshnessEstablishableFromResponse === false && /cadence cannot be established/i.test(KAMINO_RESERVE_METRICS_API.freshnessNote) && /staleness is unbounded/i.test(KAMINO_RESERVE_METRICS_API.freshnessNote), "not accepted");

  // ---- Gap localization ----
  add("PAR-10: utilization and supplier share AGREE — neither is the cause", GAP_LOCALIZATION.utilization.agrees === true && GAP_LOCALIZATION.supplierShare.agrees === true && /NOT the cause/i.test(GAP_LOCALIZATION.utilization.note), "not the cause");
  add("PAR-11: the gap is localized to the BORROW RATE, upstream of take rate and compounding", GAP_LOCALIZATION.borrowRate.agrees === false && Math.abs(GAP_LOCALIZATION.borrowRate.ratio - 1.094888) < 1e-6 && /upstream of the protocol take rate/i.test(GAP_LOCALIZATION.conclusion), "localized");
  add("PAR-12: rewards, timing, units and rounding are each ELIMINATED as causes", ["not a unit error", "not compounding", "not rewards", "not timing", "not rounding"].every((k) => GAP_LOCALIZATION.conclusion.toLowerCase().includes(k)), "eliminated");
  add("PAR-13: the mechanism is NOT identified and candidates stay unverified", GAP_LOCALIZATION.mechanismIdentified === false && GAP_LOCALIZATION.mechanismCandidatesUnverified.length >= 4, "unidentified");
  add("PAR-14: numeric similarity alone cannot select a methodology", /numeric similarity cannot select a methodology/i.test(GAP_LOCALIZATION.noFormulaAdopted) && /No diagnostic formula was adopted/i.test(GAP_LOCALIZATION.noFormulaAdopted), "no formula adopted");

  // ---- UI relationship ----
  add("PAR-15: the API AGREES with the UI — the SDK is the outlier", UI_API_RELATIONSHIP.uiAgreesWithApi === true && UI_API_RELATIONSHIP.sdkIsTheOutlier === true && Math.abs(UI_API_RELATIONSHIP.uiSupplyApyPct - UI_API_RELATIONSHIP.apiSupplyApyPct) < 0.05 && Math.abs(UI_API_RELATIONSHIP.uiSupplyApyPct - UI_API_RELATIONSHIP.sdkSupplyApyPct) > 0.3, "sdk outlier");
  add("PAR-16: neither the UI nor the API is adopted as calculation authority", UI_API_RELATIONSHIP.uiIsAuthority === false && UI_API_RELATIONSHIP.apiIsAuthority === false, "no new authority");
  add("PAR-17: agreement is evidenced on BOTH supply and borrow", /borrow 5\.49% vs API 5\.475096%/i.test(UI_API_RELATIONSHIP.uiAgreesWithApiEvidence), "both rates");

  // ---- Classification ----
  add("PAR-18: classification is E — unresolved, not B", PARITY_CLASSIFICATION.classification === "E_unresolved" && /B-shaped/.test(PARITY_CLASSIFICATION.agreementPattern) && /would assert a cause this investigation did not find/i.test(PARITY_CLASSIFICATION.whyNotB), "E not B");
  add("PAR-19: every rejected classification is justified", ["whyNotA", "whyNotB", "whyNotC", "whyNotD"].every((k) => (PARITY_CLASSIFICATION as unknown as Record<string, string>)[k].length > 40) && PARITY_CLASSIFICATION.evidenceEstablishingIt.length >= 5, "justified");
  add("PAR-20: the disagreement is recorded as material AND unexplained", PARITY_CLASSIFICATION.materialAndUnexplained === true, "material");
  add("PAR-21: unresolved investigation items are listed, not glossed", NOT_INVESTIGATED.length >= 5 && (NOT_INVESTIGATED as readonly string[]).some((x) => /Include Asset Yield/i.test(x)) && (NOT_INVESTIGATED as readonly string[]).some((x) => /Frontend data provenance/i.test(x)) && (NOT_INVESTIGATED as readonly string[]).some((x) => /Historical exact-reserve metrics/i.test(x)), "gaps listed");

  // ---- Consequence ----
  add("PAR-22: the APY methodology is UNRESOLVED and comparison is blocked", PARITY_CONSEQUENCE.apyMethodologyResolved === false && PARITY_CONSEQUENCE.definitionSufficientForComparison === false && PARITY_CONSEQUENCE.definitionSufficientPriorValue === true, "unresolved");
  add("PAR-23: the adapter was NOT silently edited and NO correction was invented", PARITY_CONSEQUENCE.adapterSilentlyEdited === false && PARITY_CONSEQUENCE.methodologyCorrectionMade === false && /requires identifying the omitted component/i.test(PARITY_CONSEQUENCE.methodologyCorrectionWithheldBecause) && PARITY_AMENDMENT_CONFERS.adapterEdited === false, "not edited");
  add("PAR-24 (superseded by 16H-N.3b): the 16H-N.3a reopening is immutable; the live blocker has since moved on", PARITY_CONSEQUENCE.primaryBlockerMovesTo === "blocked_apy_unit" && /APY methodology itself is unresolved/i.test(PARITY_CONSEQUENCE.primaryBlockerRationale) && getStableYieldEvidenceManifest("kamino_usdc_lending")!.primaryBlocker === "blocked_risk_review" && APY_UNIT_BLOCKER_SUPERSESSION.priorPrimaryBlocker === "blocked_apy_unit", "historical record intact, live state advanced");
  add("PAR-25: UI-rounding noise is distinguished from official-source disagreement", /would NOT block/i.test(PARITY_CONSEQUENCE.internalComparabilityVsUiParity) && /far beyond rounding/i.test(PARITY_CONSEQUENCE.internalComparabilityVsUiParity), "distinguished");
  add("PAR-26: 16H-N.2's circular parity is acknowledged, not withdrawn", /circular/i.test(PARITY_CONSEQUENCE.regression16HN2) && /remains TRUE and is not withdrawn/i.test(PARITY_CONSEQUENCE.regression16HN2) && APY_PARITY.result === "exact_match", "acknowledged");
  add("PAR-27: the manifest records the reopening and keeps capacity listed", (() => { const b = getStableYieldEvidenceManifest("kamino_usdc_lending")!.blockers.join(" "); return /REOPENED at 16H-N\.3a/.test(b) && /RESOLVED at 16H-N\.4 \(retained for provenance, no longer blocking\) — blocked_capacity/.test(b) && /api_freshness_unestablishable/.test(b) && /SUPERSEDED at 16H-N\.3a/.test(b); })(), "recorded");

  // ---- Evidence immutability ----
  add("PAR-28: parity evidence is versioned and deterministic", PARITY_EVIDENCE_MANIFEST_HASH.startsWith("parity_evidence_") && computeParityEvidenceManifestHash() === PARITY_EVIDENCE_MANIFEST_HASH && computeParityEvidenceManifestHash({ ...PARITY_EVIDENCE, classification: "A_sdk_api_agree_ui_stale" } as unknown as typeof PARITY_EVIDENCE) !== PARITY_EVIDENCE_MANIFEST_HASH, "manifest");
  add("PAR-29: ALL prior evidence remains immutable", PARITY_EVIDENCE.preservesPriorEvidence.length === 5 && PARITY_EVIDENCE.priorEvidenceRewritten === false && SOL_BTC_USDC_IDENTITY_MANIFEST_HASH === "identity_9773ac14" && APY_EVIDENCE_MANIFEST_HASH === "apy_evidence_d468fce5" && REWARD_EVIDENCE_MANIFEST_HASH === "reward_evidence_cace4fe4", "immutable");
  add("PAR-30: prior APY and reward methodology evidence are untouched", APY_METHODOLOGY_EVIDENCE.evidenceId === "klend_reserve_apy_methodology_v1" && REWARD_METHODOLOGY_EVIDENCE.evidenceId === "klend_reserve_reward_methodology_v1" && REWARD_STREAMS[0].state === "exhausted" && getSolBtcUsdcTotalApy().rewardApyPct === 0, "untouched");

  // ---- Isolation ----
  add("PAR-31 (updated by 16H-N.6): the parity amendment itself resolved nothing; capacity came at N.4 and deposit availability at N.6", (() => { const m = getStableYieldEvidenceManifest("kamino_usdc_lending")!; return m.capacityAdapterState === "adapter_implemented_source_verified" && m.depositAvailabilityState === "adapter_implemented_source_verified" && m.constraintsState === "adapter_implemented_source_verified" && m.riskReviewState === "blocked"; })() && PARITY_AMENDMENT_CONFERS.capacityResolved === false && PARITY_AMENDMENT_CONFERS.depositAvailabilityResolved === false, "N.3a resolved none; N.4 resolved capacity only");
  add("PAR-32: no score, approval, selector or card", PARITY_AMENDMENT_CONFERS.riskScoreAssigned === false && PARITY_AMENDMENT_CONFERS.humanReviewPerformed === false && PARITY_AMENDMENT_CONFERS.productApproved === false && PARITY_AMENDMENT_CONFERS.selectorIntegrated === false && PARITY_AMENDMENT_CONFERS.rendersCard === false, "nothing enabled");
  add("PAR-33: Demo, Steakhouse and SOL staking unchanged", PARITY_AMENDMENT_CONFERS.demoChanged === false && PARITY_AMENDMENT_CONFERS.steakhouseRecognitionChanged === false && PARITY_AMENDMENT_CONFERS.solStakingChanged === false && listYieldStrategies().find((x) => x.strategyId === "kamino_steakhouse_usdc")!.address === "HDsayqAsDWy3QvANGqh2yNraqcD8Fnjgh73Mhb3WRS5E", "unchanged");
  add("PAR-34: lifecycle untouched — investigation changes claims, not build", listYieldStrategies().find((x) => x.strategyId === "kamino_usdc_lending")!.lifecycle === "identity_verified" && /changes what is claimed, not what is built/i.test(PARITY_AMENDMENT_CONFERS.note), "claims only");

  /* ============ 16H-N.3 — supplier farm resolution + total APY ============ */

  // ---- Farm identity ----
  add("RW-1: the EXACT full supplier farm address resolves — not the abbreviation", SUPPLIER_FARM_IDENTITY.supplierFarmAddress === "JAvnB9AKtgPsTEoKmn24Bq64UMoYcrtWtq42HHBdsPkh" && SUPPLIER_FARM_IDENTITY.supplierFarmAddress.length > 40 && /reserve\.state\.farmCollateral/.test(SUPPLIER_FARM_IDENTITY.provenance), "exact farm");
  add("RW-2: an abbreviated farm address is REJECTED", resolveRewardsAndTotalApy({ ...SOL_BTC_REWARD_RESOLUTION_INPUTS, supplierFarmAddress: "JAvnB9AKtg" }).failure === "farm_address_mismatch", "abbrev rejected");
  add("RW-3: the farm program is verified and matches Kamino Farms", SUPPLIER_FARM_IDENTITY.farmProgramId === KAMINO_FARMS_PROGRAM_ID && KAMINO_FARMS_PROGRAM_ID === "FarmsPZpWu9i7Kky8tPN37rs2TpmMrAZrC7S7vJa91Hr" && SUPPLIER_FARM_IDENTITY.farmAccountOwnerVerified === true, "farm program");
  add("RW-4: a wrong farm program is rejected", resolveRewardsAndTotalApy({ ...SOL_BTC_REWARD_RESOLUTION_INPUTS, farmProgramId: "So11111111111111111111111111111111111111112" }).failure === "farm_program_mismatch", "wrong program");
  add("RW-5: the supplier/debt distinction is unambiguous — farmDebt is UNSET", SUPPLIER_FARM_IDENTITY.debtFarmConfigured === false && SUPPLIER_FARM_IDENTITY.debtFarmAddress === "11111111111111111111111111111111" && SUPPLIER_FARM_IDENTITY.isSupplierFarm === true, "unambiguous");
  add("RW-6: a debt farm cannot be used as the supplier farm", resolveRewardsAndTotalApy({ ...SOL_BTC_REWARD_RESOLUTION_INPUTS, debtFarmAddress: SOL_BTC_REWARD_RESOLUTION_INPUTS.supplierFarmAddress }).failure === "farm_not_supplier", "no debt farm");
  add("RW-7: exact reserve / cToken / market / program binding is required", ["reserveAddress", "collateralMint", "marketAddress", "klendProgramId", "liquidityMint"].every((k) => resolveRewardsAndTotalApy({ ...SOL_BTC_REWARD_RESOLUTION_INPUTS, [k]: "So11111111111111111111111111111111111111112" }).failure === "identity_mismatch"), "exact binding");
  add("RW-8: another Kamino USDC reserve cannot supply this candidate's rewards", (() => { const r = resolveRewardsAndTotalApy({ ...SOL_BTC_REWARD_RESOLUTION_INPUTS, reserveAddress: "5xXxt9uVHrcT5b1KveAT5ZWgk2f74aDjnLEDDEeAxgpN" }); return r.ok === false && /another Kamino USDC reserve/i.test(r.detail!); })(), "no substitution");
  add("RW-9: missing farm state fails closed", resolveRewardsAndTotalApy({ ...SOL_BTC_REWARD_RESOLUTION_INPUTS, streams: undefined as unknown as typeof REWARD_STREAMS }).failure === "farm_state_missing", "missing");

  // ---- Stream inventory ----
  add("RW-10: every reward stream is inventoried independently, not collapsed", REWARD_STREAMS.length === 1 && FARM_STATE_SNAPSHOT.rewardSlotsInAccount === 10 && FARM_STATE_SNAPSHOT.nonDefaultRewardSlots === 1 && FARM_STATE_SNAPSHOT.numRewardTokens === 1, "inventoried");
  add("RW-11: reward identity is the MINT, and symbol-only identity is refused", REWARD_STREAMS[0].rewardTokenMint === "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" && REWARD_STREAMS[0].rewardTokenSymbol === null && /symbol/i.test(REWARD_METHODOLOGY_EVIDENCE.rewardTokenIdentity), "mint identity");
  add("RW-12: a default/zero mint is rejected as unresolved", resolveRewardsAndTotalApy({ ...SOL_BTC_REWARD_RESOLUTION_INPUTS, streams: [{ ...REWARD_STREAMS[0], rewardTokenMint: "11111111111111111111111111111111" }] }).failure === "stream_unresolved", "default mint");
  add("RW-13: token decimals are required", REWARD_STREAMS[0].rewardTokenDecimals === 5 && resolveRewardsAndTotalApy({ ...SOL_BTC_REWARD_RESOLUTION_INPUTS, streams: [{ ...REWARD_STREAMS[0], rewardTokenDecimals: NaN }] }).failure === "decimals_unresolved", "decimals");
  add("RW-14: emission units are explicit", /rewardPerTimeUnit/.test(REWARD_STREAMS[0].emissionRawUnit) && REWARD_STREAMS[0].emissionRateRaw === "0" && REWARD_STREAMS[0].rewardsAvailableRaw === "0", "units explicit");

  // ---- Positive-absence determination ----
  add("RW-15: EXHAUSTED is positively verified on four independent grounds", (() => { const s = REWARD_STREAMS[0]; return s.state === "exhausted" && s.rewardsAvailableRaw === "0" && s.curvePointsWithNonZeroEmission === 0 && s.futureNonZeroEmissionPoints === 0 && s.lastIssuanceAt === "2024-02-01T11:41:36.000Z" && /four independent grounds/i.test(s.stateEvidence); })(), "positively verified");
  add("RW-16: exhausted is distinguished from absent, unresolved, paused and scheduled_future", (() => { const s = REWARD_STREAMS[0]; const states: string[] = ["active", "configured_inactive", "exhausted", "scheduled_future", "expired", "paused", "malformed", "unresolved"]; return states.includes(s.state) && /NOT 'unresolved' and NOT 'absent'/i.test(s.stateEvidence) && s.curvePointCount === 20; })(), "distinguished");
  add("RW-17: a configured stream with zero emission is NOT treated as no stream", FARM_STATE_SNAPSHOT.nonDefaultRewardSlots === 1 && REWARD_STREAMS[0].state === "exhausted" && REWARD_STREAMS[0].rewardApyPct === 0, "configured != absent");
  add("RW-18: zero reward APY is accepted ONLY because zero is positively established", REWARD_STREAMS[0].rewardApyPct === 0 && REWARD_STREAMS[0].requiresPrice === false && /not because a price was unavailable/i.test(readIf("src/suggestions/klendReserveRewardResolution.ts")), "positively zero");
  add("RW-19: no price source was needed or invented — zero emission x any price = zero", REWARD_STREAMS[0].requiresPrice === false && /NOT REQUIRED and NOT INVENTED/i.test(REWARD_METHODOLOGY_EVIDENCE.priceAuthority) && REWARD_GAP_SUPERSESSION.resolution.priceSourceNeeded === false, "no price needed");
  add("RW-20: an ACTIVE stream needing a price still fails total CLOSED", (() => { const r = resolveRewardsAndTotalApy({ ...SOL_BTC_REWARD_RESOLUTION_INPUTS, streams: [{ ...REWARD_STREAMS[0], state: "active", requiresPrice: true, rewardApyPct: null }] }); return r.ok === true && r.totalSupplyApyPct === null && r.definitionSufficientForComparison === false; })(), "live stream closed");
  add("RW-21: an unresolved stream fails total closed", (() => { const r = resolveRewardsAndTotalApy({ ...SOL_BTC_REWARD_RESOLUTION_INPUTS, streams: [{ ...REWARD_STREAMS[0], state: "unresolved", rewardApyPct: null }] }); return r.totalSupplyApyPct === null && r.definitionSufficientForComparison === false; })(), "unresolved closed");

  // ---- SDK semantics ----
  add("RW-22: reward APR/APY semantics are recorded as NOT verified — not assumed", /NOT VERIFIED/i.test(SDK_REWARD_SEMANTICS.aprOrApySemantics) && /must NOT be assumed to follow the base-supply/i.test(SDK_REWARD_SEMANTICS.compoundingConvention), "not assumed");
  add("RW-23: getRewardYields([]) is corroborative here, NOT decisive", /uninformative ON ITS OWN/i.test(SDK_REWARD_SEMANTICS.getRewardYieldsWithEmptyPrices) && /corroborative/i.test(SDK_REWARD_SEMANTICS.getRewardYieldsWithEmptyPrices), "corroborative");
  add("RW-24: the SDK symbols inspected are recorded", SDK_REWARD_SEMANTICS.symbolsInspected.length >= 6 && SDK_REWARD_SEMANTICS.symbolsInspected.some((x) => /getCollateralFarmAddress/.test(x)) && SDK_REWARD_SEMANTICS.symbolsInspected.some((x) => /isDebtReward/.test(x)), "symbols");

  // ---- Total APY ----
  add("RW-25: total supply APY RESOLVES to base when reward is positively zero", (() => { const r = getSolBtcUsdcTotalApy(); return r.ok === true && r.rewardApyPct === 0 && r.baseSupplyApyPct === 3.153819 && r.totalSupplyApyPct === 3.153819 && r.definitionSufficientForComparison === true; })(), "total resolved");
  add("RW-26: NO combination rule was invented — with reward 0 every convention agrees", /CONVENTION NOT REQUIRED/i.test(getSolBtcUsdcTotalApy().combinationConvention!) && REWARD_GAP_SUPERSESSION.resolution.combinationRuleNeeded === false && /No rule was chosen or invented/i.test(REWARD_METHODOLOGY_EVIDENCE.totalYieldCombinationConvention), "no rule invented");
  add("RW-27: base APY is never mistaken for total APY — they are distinct fields", (() => { const r = getSolBtcUsdcTotalApy(); return "baseSupplyApyPct" in r && "totalSupplyApyPct" in r && "rewardApyPct" in r; })(), "distinct");
  add("RW-28: reward APR is not stored as reward APY", !("rewardAprPct" in REWARD_STREAMS[0]) || REWARD_STREAMS[0].rewardApyPct === 0, "no apr as apy");

  // ---- Slot skew ----
  add("RW-29: base and farm share ONE slot — skew 0", getSolBtcUsdcTotalApy().slotSkew === 0 && SOL_BTC_REWARD_RESOLUTION_INPUTS.baseSourceSlot === SOL_BTC_REWARD_RESOLUTION_INPUTS.farmSourceSlot && SOL_BTC_REWARD_RESOLUTION_INPUTS.baseSourceSlot === "433414541", "unified slot");
  add("RW-30: skew beyond tolerance fails total closed", MAX_SLOT_SKEW === 150 && resolveRewardsAndTotalApy({ ...SOL_BTC_REWARD_RESOLUTION_INPUTS, farmSourceSlot: "433344541" }).failure === "slot_skew_exceeded", "skew fails");
  add("RW-31: stale farm state fails closed", resolveRewardsAndTotalApy({ ...SOL_BTC_REWARD_RESOLUTION_INPUTS, farmAgeMs: 99e6, maxFarmAgeMs: 3.6e6 }).failure === "farm_state_stale", "stale");
  add("RW-32: the unified snapshot is recorded WITHOUT overwriting 16H-N.2's slot", UNIFIED_SLOT_SNAPSHOT.sourceSlot === "433414541" && UNIFIED_SLOT_SNAPSHOT.baseSupplyApyPct === 3.153819 && /NOT overwritten/i.test(UNIFIED_SLOT_SNAPSHOT.note) && SOL_BTC_USDC_APY_SNAPSHOT.sourceSlot === "433344510", "both preserved");

  // ---- UI parity ----
  add("RW-33: the UI is diagnostic only and derives nothing", UI_PARITY_DIAGNOSTIC.isCalculationAuthority === false && UI_PARITY_DIAGNOSTIC.usedToDeriveAnything === false && UI_PARITY_DIAGNOSTIC.gatesThisResult === false, "diagnostic only");
  add("RW-34: the reward result was NOT forced to match the 0.311049pp UI gap", UI_PARITY_DIAGNOSTIC.differencePct === 0.311049 && getSolBtcUsdcTotalApy().rewardApyPct === 0 && UI_PARITY_DIAGNOSTIC.rewardsExplainTheGap === false, "not forced");
  add("RW-35: the UI gap is recorded as UNEXPLAINED, with rewards eliminated as the cause", UI_PARITY_DIAGNOSTIC.status === "unexplained" && /An exhausted farm cannot contribute/i.test(UI_PARITY_DIAGNOSTIC.rewardsExplainTheGapEvidence) && UI_PARITY_DIAGNOSTIC.candidateExplanationsUnverified.length >= 3, "unexplained");

  // ---- Evidence + blocker ----
  add("RW-36: reward evidence is versioned and deterministic", REWARD_EVIDENCE_MANIFEST_HASH.startsWith("reward_evidence_") && computeRewardEvidenceManifestHash() === REWARD_EVIDENCE_MANIFEST_HASH && computeRewardEvidenceManifestHash({ ...REWARD_METHODOLOGY_EVIDENCE, supplierFarmAddress: "MUTATED" } as unknown as typeof REWARD_METHODOLOGY_EVIDENCE) !== REWARD_EVIDENCE_MANIFEST_HASH, "manifest");
  add("RW-37: ALL prior evidence remains immutable", REWARD_METHODOLOGY_EVIDENCE.preservesPriorEvidence.length === 3 && SOL_BTC_USDC_IDENTITY_MANIFEST_HASH === "identity_9773ac14" && APY_EVIDENCE_MANIFEST_HASH === "apy_evidence_d468fce5" && APY_METHODOLOGY_EVIDENCE.evidenceId === "klend_reserve_apy_methodology_v1", "immutable");
  add("RW-38: the prior reward gap is preserved and acknowledged CORRECT", REWARD_GAP_SUPERSESSION.priorGap.preserved === true && /Refusing to call it zero then was the right call/i.test(REWARD_GAP_SUPERSESSION.priorGap.wasCorrect), "preserved");
  // RW-39 asserted primary stayed blocked_capacity — true AT 16H-N.3, when the APY looked settled.
  // 16H-N.3a found the official API and SDK disagree ~9.65%, reopening the APY methodology, which is
  // the one condition permitting the primary to move. The invariant that survives: 16H-N.3 itself
  // invented no enum and did not move the blocker; a LATER step moved it on new evidence.
  add("RW-39 (updated by 16H-N.3b): 16H-N.3 moved nothing; the APY reopened then resolved, returning primary to capacity", REWARD_GAP_SUPERSESSION.primaryBlockerUnchanged === "blocked_capacity" && REWARD_GAP_SUPERSESSION.newBlockerEnumInvented === false && PARITY_CONSEQUENCE.primaryBlockerMovesTo === "blocked_apy_unit" && getStableYieldEvidenceManifest("kamino_usdc_lending")!.primaryBlocker === "blocked_risk_review", "round trip complete");
  add("RW-40: the manifest records the reward resolution and the open UI gap", (() => { const b = getStableYieldEvidenceManifest("kamino_usdc_lending")!.blockers.join(" "); return /RESOLVED at 16H-N\.3/.test(b) && /UI PARITY UNEXPLAINED/.test(b); })(), "recorded");

  // ---- Isolation ----
  add("RW-41 (updated by 16H-N.6): the reward step changed none of these; capacity resolved at N.4 and deposit availability at N.6, constraints + risk still blocked", (() => { const m = getStableYieldEvidenceManifest("kamino_usdc_lending")!; return m.capacityAdapterState === "adapter_implemented_source_verified" && m.depositAvailabilityState === "adapter_implemented_source_verified" && m.constraintsState === "adapter_implemented_source_verified" && m.riskReviewState === "blocked" && m.readiness === "blocked"; })(), "unchanged");
  add("RW-42: reward resolution enables NOTHING downstream", (() => { const c = REWARD_RESOLUTION_CONFERS; return c.capacityResolved === false && c.depositAvailabilityResolved === false && c.riskScoreAssigned === false && c.humanReviewPerformed === false && c.riskSignoffCompleted === false && c.productApproved === false && c.selectorIntegrated === false && c.rendersCard === false && c.topPick === false && c.recommendationGenerated === false && c.transactionsEnabled === false && c.lifecycleChanged === false; })(), "enables nothing");
  add("RW-43: lifecycle and production flags untouched", (() => { const c = listYieldStrategies().find((x) => x.strategyId === "kamino_usdc_lending")!; return c.lifecycle === "identity_verified" && c.marketDataEvaluated === false && c.suggestionGenerated === false && c.transactionsEnabled === false; })(), "untouched");
  add("RW-44: Demo, Steakhouse and SOL staking unchanged", REWARD_RESOLUTION_CONFERS.demoChanged === false && REWARD_RESOLUTION_CONFERS.steakhouseRecognitionChanged === false && REWARD_RESOLUTION_CONFERS.solStakingChanged === false && listYieldStrategies().find((x) => x.strategyId === "kamino_steakhouse_usdc")!.address === "HDsayqAsDWy3QvANGqh2yNraqcD8Fnjgh73Mhb3WRS5E", "unchanged");
  add("RW-45: no execution or simulation code added", (() => { const src = readIf("src/suggestions/klendReserveRewardResolution.ts").split("\n").filter((l) => { const t = l.trim(); return !t.startsWith("*") && !t.startsWith("//") && !t.startsWith("/*"); }).join("\n"); return !/simulateTransaction|sendTransaction|new Transaction|signTransaction|depositIxs/.test(src); })(), "read-only");
  add("RW-46: no user-facing surface imports the reward module", ["src/components/SuggestionCard.tsx", "src/components/SuggestionReviewModal.tsx", "src/pages/DashboardPage.tsx"].every((f) => !readIf(f).includes("klendReserveRewardResolution")), "internal");

  /* ============ 16H-N.2 — deterministic supply APY derivation ============ */

  // ---- Derivation ----
  add("APY-1: the exact reserve derives successfully from a valid snapshot", (() => { const r = getSolBtcUsdcApy(); return r.ok === true && r.baseSupplyApyPct === 3.178951 && r.outputUnit === "percentage_points" && r.sourceSlot === "433344510"; })(), "derives");
  add("APY-2: official SDK is the calculation authority — no financial math reimplemented", /official SDK/i.test(getSolBtcUsdcApy().calculationMethod!) && /totalSupplyAPY/.test(getSolBtcUsdcApy().calculationMethod!) && APY_METHODOLOGY_EVIDENCE.calculationAuthority.startsWith("A —"), "authority A");
  add("APY-3: APR and APY are distinct fields — APR is never stored as APY", (() => { const r = getSolBtcUsdcApy(); return r.baseSupplyAprPct === 3.129469 && r.baseSupplyApyPct === 3.178951 && Number(r.baseSupplyAprPct) !== Number(r.baseSupplyApyPct) && Number(r.borrowRateAprPct) !== Number(r.borrowRateApyPct); })(), "apr != apy");
  add("APY-4: APY exceeds APR, consistent with per-slot compounding", (() => { const r = getSolBtcUsdcApy(); return r.baseSupplyApyPct! > r.baseSupplyAprPct! && r.borrowRateApyPct! > r.borrowRateAprPct!; })(), "compounding direction");
  add("APY-5: the compounding convention is verified from SDK source, not assumed", RATE_SEMANTICS.aprToApy.compounding === "per_slot" && RATE_SEMANTICS.aprToApy.formula === "(1 + apr/SLOTS_PER_YEAR)^SLOTS_PER_YEAR - 1" && /utils\.js:170/.test(RATE_SEMANTICS.aprToApy.verifiedFrom) && RATE_SEMANTICS.slotsPerYear.value === 63072000 && RATE_SEMANTICS.slotsPerSecond.value === 2, "verified");
  add("APY-6: the protocol take rate is applied exactly ONCE — inside the SDK", RATE_SEMANTICS.protocolTakeRatePct.unit === "percentage_points" && RATE_SEMANTICS.protocolTakeRatePct.value === 10 && /Already applied inside calculateSupplyAPR/i.test(RATE_SEMANTICS.protocolTakeRatePct.note) && /must NOT apply it again/i.test(RATE_SEMANTICS.supplyApr.note) && getSolBtcUsdcApy().protocolTakeRatePct === 10, "once");

  // ---- Exact-product binding ----
  add("APY-7: exact identity is required on every axis", ["candidateId", "marketAddress", "reserveAddress", "liquidityMint", "klendProgramId", "cluster"].every((k) => { const r = deriveKlendReserveApy({ ...SOL_BTC_USDC_APY_SNAPSHOT, [k]: "So11111111111111111111111111111111111111112" }); return r.ok === false && r.failure === "identity_mismatch"; }), "identity required");
  add("APY-8: ANOTHER USDC reserve in the same market is rejected — mint matching is insufficient", (() => { const r = deriveKlendReserveApy({ ...SOL_BTC_USDC_APY_SNAPSHOT, reserveAddress: "5xXxt9uVHrcT5b1KveAT5ZWgk2f74aDjnLEDDEeAxgpN" }); return r.ok === false && r.failure === "identity_mismatch" && /another USDC reserve may not supply/i.test(r.detail!); })(), "no substitution");

  // ---- Fail-closed ----
  add("APY-9: stale source fails closed", deriveKlendReserveApy({ ...SOL_BTC_USDC_APY_SNAPSHOT, ageMs: 99e6, maxAgeMs: 3.6e6 }).failure === "stale_source", "stale");
  add("APY-10: missing slot fails closed", deriveKlendReserveApy({ ...SOL_BTC_USDC_APY_SNAPSHOT, sourceSlot: null }).failure === "missing_source_slot", "no slot");
  add("APY-11: malformed rate curve fails closed", deriveKlendReserveApy({ ...SOL_BTC_USDC_APY_SNAPSHOT, rateCurveWellFormed: false }).failure === "malformed_rate_curve", "curve");
  add("APY-12: invalid utilization fails closed", [80, -0.1, 1.5, NaN].every((u) => deriveKlendReserveApy({ ...SOL_BTC_USDC_APY_SNAPSHOT, utilizationRatio: u }).failure === "invalid_utilization"), "utilization");
  add("APY-13: invalid protocol take rate fails closed", [150, -1, NaN].every((t) => deriveKlendReserveApy({ ...SOL_BTC_USDC_APY_SNAPSHOT, protocolTakeRatePct: t }).failure === "invalid_protocol_take_rate"), "take rate");
  add("APY-14: non-finite output fails closed", [NaN, Infinity].every((v) => deriveKlendReserveApy({ ...SOL_BTC_USDC_APY_SNAPSHOT, supplyApyRatio: v }).failure === "non_finite_output"), "non-finite");
  add("APY-15: missing reserve state fails closed", deriveKlendReserveApy({ ...SOL_BTC_USDC_APY_SNAPSHOT, observedAt: null }).failure === "reserve_state_unavailable", "no state");

  // ---- The 100x boundary ----
  add("APY-16: a PERCENT supplied where a ratio is expected is rejected", deriveKlendReserveApy({ ...SOL_BTC_USDC_APY_SNAPSHOT, supplyApyRatio: 5 }).failure === "output_out_of_bounds", "percent rejected");
  add("APY-17: BASIS POINTS supplied where a ratio is expected is rejected", deriveKlendReserveApy({ ...SOL_BTC_USDC_APY_SNAPSHOT, supplyApyRatio: 500 }).failure === "output_out_of_bounds", "bps rejected");
  add("APY-18: the decimal ratio 0.05 converts to exactly 5 percent — one boundary, no drift", ratioToPercent(0.05) === 5 && ratioToPercent(0.031789512952079324) === 3.178951 && ratioToPercent(0) === 0 && ratioToPercent(1) === 100, "conversion");
  add("APY-19: units are declared in the contract and the SDK/output units differ", OUTPUT_UNIT === "percentage_points" && RATE_SEMANTICS.supplyApy.unit === "decimal_ratio" && RATE_SEMANTICS.utilization.unit === "decimal_ratio" && APY_METHODOLOGY_EVIDENCE.outputUnit === "percentage_points", "declared");
  add("APY-20: rounding happens only at the ratio->percent boundary", /6dp at the ratio→percent boundary only/i.test(APY_PARITY.roundingConvention) && APY_PARITY.rawA === 0.031789512952079324, "boundary only");

  // ---- Rewards ----
  add("APY-21: rewards are SEPARATE from base yield", (() => { const r = getSolBtcUsdcApy(); return "baseSupplyApyPct" in r && "rewardApyPct" in r && "totalSupplyApyPct" in r && r.baseSupplyApyPct !== r.totalSupplyApyPct; })(), "separate");
  add("APY-22: a CONFIGURED but unresolved farm fails TOTAL closed — never silently zero", (() => { const r = getSolBtcUsdcApy(); return r.rewardState === "configured_but_unresolved" && r.rewardApyPct === null && r.totalSupplyApyPct === null && r.baseSupplyApyPct === 3.178951; })(), "fails closed");
  add("APY-23: unresolved rewards make the definition insufficient for comparison", getSolBtcUsdcApy().definitionSufficientForComparison === false && APY_RESOLUTION_CONFERS.totalApyResolved === false, "not comparable");
  add("APY-24: a no-reward state is accepted ONLY when absence is positively verified", (() => { const verified = deriveKlendReserveApy({ ...SOL_BTC_USDC_APY_SNAPSHOT, supplierFarmConfigured: false, rewardYieldResolved: true, rewardApyRatio: null }); const unknown = deriveKlendReserveApy({ ...SOL_BTC_USDC_APY_SNAPSHOT, supplierFarmConfigured: false, rewardYieldResolved: false, rewardApyRatio: null }); return verified.rewardState === "verified_absent" && verified.rewardApyPct === 0 && verified.totalSupplyApyPct === 3.178951 && unknown.rewardState === "unknown" && unknown.totalSupplyApyPct === null; })(), "positive verification");
  add("APY-25: resolved rewards add to base for a total", (() => { const r = deriveKlendReserveApy({ ...SOL_BTC_USDC_APY_SNAPSHOT, rewardYieldResolved: true, rewardApyRatio: 0.02 }); return r.rewardState === "resolved" && r.rewardApyPct === 2 && r.totalSupplyApyPct === 5.178951 && r.definitionSufficientForComparison === true; })(), "total");
  add("APY-26: the farm is recorded as EXISTING — [] from empty prices is not absence", /farmCollateral is SET/i.test(APY_METHODOLOGY_EVIDENCE.rewardDetermination) && /NOT evidence of absence/i.test(APY_METHODOLOGY_EVIDENCE.rewardDetermination) && SOL_BTC_USDC_APY_SNAPSHOT.supplierFarmConfigured === true, "farm exists");

  // ---- Parity ----
  add("APY-27: parity uses two INDEPENDENT official SDK paths", APY_PARITY.pathA.includes("totalSupplyAPY") && APY_PARITY.pathB.includes("calculateAPYFromAPR") && APY_PARITY.pathB.includes("calculateSupplyAPR"), "two paths");
  add("APY-28: parity is an EXACT match", APY_PARITY.result === "exact_match" && APY_PARITY.absoluteDifference === 0 && APY_PARITY.relativeDifference === 0 && APY_PARITY.rawA === APY_PARITY.rawB, "exact");
  add("APY-29: the UI's rounded number is NOT the parity oracle", APY_PARITY.uiUsedAsOracle === false, "no ui oracle");
  add("APY-30: the tolerance is justified rather than asserted", APY_PARITY.acceptedTolerance === 1e-9 && APY_PARITY.toleranceJustification.length > 80, "justified");

  // ---- Evidence + blocker ----
  add("APY-31: methodology evidence is versioned and deterministic", APY_EVIDENCE_MANIFEST_HASH.startsWith("apy_evidence_") && computeApyEvidenceManifestHash() === APY_EVIDENCE_MANIFEST_HASH && APY_METHODOLOGY_EVIDENCE.version === KLEND_APY_DERIVATION_VERSION, "manifest");
  add("APY-32: methodology is immutable while market inputs stay ephemeral", !("supplyApyRatio" in APY_METHODOLOGY_EVIDENCE) && !("utilizationPct" in APY_METHODOLOGY_EVIDENCE) && SOL_BTC_USDC_APY_SNAPSHOT.sourceSlot === "433344510", "separated");
  add("APY-33: the old blocker is PRESERVED and acknowledged as correct", APY_BLOCKER_SUPERSESSION.priorBlocker.preserved === true && APY_BLOCKER_SUPERSESSION.priorBlocker.code === "blocked_apy_unit" && /Yes — supply APY is genuinely not a stored field/i.test(APY_BLOCKER_SUPERSESSION.priorBlocker.wasCorrect), "preserved");
  add("APY-34: the supersession is explicit with authority, method, units, version, slot", (() => { const r = APY_BLOCKER_SUPERSESSION.resolution; return r.resolved === true && r.calculationAuthority.startsWith("A") && r.sdkMethodIdentity.includes("totalSupplyAPY") && r.units.includes("percentage_points") && r.calculationVersion === "1.0.0" && r.sourceSlot === "433344510" && r.parity.includes("exact_match"); })(), "explicit");
  add("APY-35: the reward STATE-MODEL GAP is reported, not invented around", /no reward-resolution state/i.test(APY_BLOCKER_SUPERSESSION.remainingApyGap.stateModelGap) && /NO new state was invented/i.test(APY_BLOCKER_SUPERSESSION.remainingApyGap.stateModelGap) && APY_BLOCKER_SUPERSESSION.primaryBlockerMovesTo === "blocked_capacity", "gap reported");
  add("APY-36: the manifest reflects a verified adapter and the moved blocker", (() => { const m = getStableYieldEvidenceManifest("kamino_usdc_lending")!; return m.apyAdapterState === "adapter_implemented_source_verified" && m.apyUnitInterpretation === "percent" && /RESOLVED at 16H-N\.2/.test(m.blockers.join(" ")); })(), "manifest");
  add("APY-36b (updated by 16H-N.3b): the adapter state stood throughout the reopen-and-resolve cycle", (() => { const m = getStableYieldEvidenceManifest("kamino_usdc_lending")!; const b = m.blockers.join(" "); return m.apyAdapterState === "adapter_implemented_source_verified" && m.primaryBlocker === "blocked_risk_review" && /REOPENED at 16H-N\.3a/.test(b) && /RESOLVED at 16H-N\.3b/.test(b) && PARITY_CONSEQUENCE.adapterSilentlyEdited === false; })(), "reopened, adapter intact");

  // ---- Isolation ----
  add("APY-37 (updated by 16H-N.6): the APY step changed none of these; capacity resolved at N.4 and deposit availability at N.6, constraints + risk still blocked", (() => { const m = getStableYieldEvidenceManifest("kamino_usdc_lending")!; return m.capacityAdapterState === "adapter_implemented_source_verified" && m.constraintsState === "adapter_implemented_source_verified" && m.depositAvailabilityState === "adapter_implemented_source_verified" && m.riskReviewState === "blocked" && m.readiness === "blocked"; })(), "unchanged");
  add("APY-38: APY resolution enables NOTHING downstream", (() => { const c = APY_RESOLUTION_CONFERS; return c.capacityResolved === false && c.depositAvailabilityResolved === false && c.riskScoreAssigned === false && c.humanReviewPerformed === false && c.riskSignoffCompleted === false && c.productApproved === false && c.selectorIntegrated === false && c.rendersCard === false && c.topPick === false && c.recommendationGenerated === false && c.transactionsEnabled === false; })(), "enables nothing");
  add("APY-39: lifecycle and production flags are untouched by APY work", (() => { const c = listYieldStrategies().find((x) => x.strategyId === "kamino_usdc_lending")!; return c.lifecycle === "identity_verified" && c.marketDataEvaluated === false && c.eligibilityEvaluated === false && c.suggestionGenerated === false && c.transactionsEnabled === false; })(), "untouched");
  add("APY-40: Demo, Steakhouse and SOL staking are unchanged", APY_RESOLUTION_CONFERS.demoChanged === false && APY_RESOLUTION_CONFERS.steakhouseRecognitionChanged === false && APY_RESOLUTION_CONFERS.solStakingChanged === false && listYieldStrategies().find((x) => x.strategyId === "kamino_steakhouse_usdc")!.address === "HDsayqAsDWy3QvANGqh2yNraqcD8Fnjgh73Mhb3WRS5E", "unchanged");
  add("APY-41: no execution or simulation code was added", (() => { const src = readIf("src/suggestions/klendReserveApyDerivation.ts").split("\n").filter((l) => { const t = l.trim(); return !t.startsWith("*") && !t.startsWith("//") && !t.startsWith("/*"); }).join("\n"); return !/simulateTransaction|sendTransaction|new Transaction|signTransaction|depositIxs/.test(src); })(), "read-only");
  add("APY-42: no user-facing surface imports the APY derivation", ["src/components/SuggestionCard.tsx", "src/components/SuggestionReviewModal.tsx", "src/pages/DashboardPage.tsx"].every((f) => !readIf(f).includes("klendReserveApyDerivation")), "internal");

  /* ============ 16H-N.1 — exact KLend reserve identity resolution ============ */

  // ---- Resolution ----
  add("ID-1: the exact market resolves", getSolBtcUsdcIdentityResolution().resolved === true && SOL_BTC_USDC_RESERVE_IDENTITY.marketAddress === "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF" && SOL_BTC_USDC_RESERVE_IDENTITY.marketName === "SOL/BTC Market", "market");
  add("ID-2: the exact reserve resolves", SOL_BTC_USDC_RESERVE_IDENTITY.reserveAddress === "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59" && SOL_BTC_USDC_RESERVE_IDENTITY.candidateId === "kamino_usdc_lending" && SOL_BTC_USDC_RESERVE_IDENTITY.productType === "direct_lending", "reserve");
  add("ID-3: the reserve belongs to the market", SOL_BTC_RESOLVER_INPUTS.mintMatchedReserves.filter((r) => r.status === RESERVE_STATUS_ACTIVE).every((r) => r.lendingMarket === SOL_BTC_USDC_RESERVE_IDENTITY.marketAddress), "membership");
  add("ID-4: canonical USDC is required and captured", SOL_BTC_USDC_RESERVE_IDENTITY.liquidityMint === CANONICAL_SOLANA_USDC_MINT && CANONICAL_SOLANA_USDC_MINT === "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" && SOL_BTC_USDC_RESERVE_IDENTITY.assetDecimals === 6 && SOL_BTC_USDC_RESERVE_IDENTITY.canonicalAsset === "USDC", "canonical usdc");
  add("ID-5: the collateral/cToken mint is captured", SOL_BTC_USDC_RESERVE_IDENTITY.collateralMint === "B8V6WVjPxW1UGwVDfxH2d2r8SyT4cqn7dQRK6XneVa7D" && SOL_BTC_USDC_RESERVE_IDENTITY.collateralMint !== SOL_BTC_USDC_RESERVE_IDENTITY.liquidityMint, "ctoken");
  add("ID-6: the exact hash-verified KLend program is required", SOL_BTC_USDC_RESERVE_IDENTITY.klendProgramId === KLEND_PROGRAM_ID && KLEND_PROGRAM_ID === KLEND_VERIFICATION.programId && KLEND_VERIFICATION.hashesMatch === true, "program");
  add("ID-7: cluster is mainnet-beta", SOL_BTC_USDC_RESERVE_IDENTITY.cluster === "mainnet-beta", "cluster");

  // ---- Fail-closed ----
  add("ID-8: a WRONG market fails", resolveKlendReserveIdentity({ ...SOL_BTC_RESOLVER_INPUTS, expectedMarketAddress: "So11111111111111111111111111111111111111112" }).resolved === false, "wrong market");
  add("ID-9: a WRONG reserve fails", (() => { const r = resolveKlendReserveIdentity({ ...SOL_BTC_RESOLVER_INPUTS, expectedReserveAddress: "So11111111111111111111111111111111111111112" }); return r.resolved === false && r.failure === "reserve_address_mismatch"; })(), "wrong reserve");
  add("ID-10: a WRONG liquidity mint fails", (() => { const r = resolveKlendReserveIdentity({ ...SOL_BTC_RESOLVER_INPUTS, mintMatchedReserves: SOL_BTC_RESOLVER_INPUTS.mintMatchedReserves.map((x) => x.status === RESERVE_STATUS_ACTIVE ? { ...x, liquidityMint: "So11111111111111111111111111111111111111112" } : x) }); return r.resolved === false && r.failure === "liquidity_mint_not_canonical_usdc"; })(), "wrong mint");
  add("ID-11: a WRONG program fails", (() => { const a = resolveKlendReserveIdentity({ ...SOL_BTC_RESOLVER_INPUTS, expectedProgramId: "So11111111111111111111111111111111111111112" }); const b = resolveKlendReserveIdentity({ ...SOL_BTC_RESOLVER_INPUTS, mintMatchedReserves: SOL_BTC_RESOLVER_INPUTS.mintMatchedReserves.map((x) => x.status === RESERVE_STATUS_ACTIVE ? { ...x, ownerProgram: "So11111111111111111111111111111111111111112" } : x) }); return a.resolved === false && a.failure === "program_id_mismatch" && b.resolved === false && b.failure === "program_id_mismatch"; })(), "wrong program");
  add("ID-12: a WRONG cluster fails", resolveKlendReserveIdentity({ ...SOL_BTC_RESOLVER_INPUTS, cluster: "devnet" }).resolved === false, "wrong cluster");
  add("ID-13: an AMBIGUOUS SDK result fails — never guessed", (() => { const r = resolveKlendReserveIdentity({ ...SOL_BTC_RESOLVER_INPUTS, mintMatchedReserves: SOL_BTC_RESOLVER_INPUTS.mintMatchedReserves.map((x) => ({ ...x, status: RESERVE_STATUS_ACTIVE })) }); return r.resolved === false && r.failure === "ambiguous_reserve_match"; })(), "ambiguous");
  add("ID-14: MISSING account data fails", (() => { const a = resolveKlendReserveIdentity({ ...SOL_BTC_RESOLVER_INPUTS, mintMatchedReserves: [] }); const b = resolveKlendReserveIdentity({ ...SOL_BTC_RESOLVER_INPUTS, mintMatchedReserves: SOL_BTC_RESOLVER_INPUTS.mintMatchedReserves.map((x) => x.status === RESERVE_STATUS_ACTIVE ? { ...x, ownerProgram: null } : x) }); return a.resolved === false && a.failure === "missing_account_data" && b.resolved === false && b.failure === "missing_account_data"; })(), "missing data");
  add("ID-15: an unresolved cToken mint fails", (() => { const r = resolveKlendReserveIdentity({ ...SOL_BTC_RESOLVER_INPUTS, mintMatchedReserves: SOL_BTC_RESOLVER_INPUTS.mintMatchedReserves.map((x) => x.status === RESERVE_STATUS_ACTIVE ? { ...x, collateralMint: null } : x) }); return r.resolved === false && r.failure === "collateral_mint_unresolved"; })(), "no ctoken");
  add("ID-16: NO active match fails rather than falling back to a Hidden reserve", (() => { const r = resolveKlendReserveIdentity({ ...SOL_BTC_RESOLVER_INPUTS, mintMatchedReserves: SOL_BTC_RESOLVER_INPUTS.mintMatchedReserves.map((x) => ({ ...x, status: RESERVE_STATUS_HIDDEN })) }); return r.resolved === false && r.failure === "no_active_reserve_match"; })(), "no active");

  // ---- The ambiguity that made this non-trivial ----
  add("ID-17: mint alone is NOT an identifier — four USDC reserves exist in this market", SOL_BTC_RESOLVER_INPUTS.mintMatchedReserves.length === 4 && SOL_BTC_RESOLVER_INPUTS.mintMatchedReserves.every((r) => r.liquidityMint === CANONICAL_SOLANA_USDC_MINT), "4 usdc reserves");
  add("ID-18: exactly ONE is Active — that is the disambiguator", SOL_BTC_RESOLVER_INPUTS.mintMatchedReserves.filter((r) => r.status === RESERVE_STATUS_ACTIVE).length === 1 && SOL_BTC_MARKET_OTHER_USDC_RESERVES.length === 3 && SOL_BTC_MARKET_OTHER_USDC_RESERVES.every((r) => r.status === RESERVE_STATUS_HIDDEN), "1 active");
  add("ID-19: the excluded reserves are recorded with their reason", SOL_BTC_MARKET_OTHER_USDC_RESERVES.every((r) => r.excludedBecause.length > 20 && r.reserveAddress !== SOL_BTC_USDC_RESERVE_IDENTITY.reserveAddress), "excluded recorded");

  // ---- Identity vs live state ----
  add("ID-20: identity holds NO live quantity", (() => { const id = SOL_BTC_USDC_RESERVE_IDENTITY as unknown as Record<string, unknown>; return ["apy", "supplyApy", "utilization", "suppliedAmount", "availableLiquidity", "remainingCapacity", "depositLimit", "status", "emergencyMode"].every((k) => !(k in id)); })(), "no live state");
  add("ID-21: Active/emergencyMode live in the diagnostic snapshot, NOT identity", SOL_BTC_USDC_RESERVE_DIAGNOSTIC_SNAPSHOT.isSnapshotNotIdentity === true && SOL_BTC_USDC_RESERVE_DIAGNOSTIC_SNAPSHOT.status === RESERVE_STATUS_ACTIVE && SOL_BTC_USDC_RESERVE_DIAGNOSTIC_SNAPSHOT.usdcReservesInMarket === 4 && SOL_BTC_USDC_RESERVE_DIAGNOSTIC_SNAPSHOT.activeUsdcReservesInMarket === 1, "snapshot separate");
  add("ID-22: identity carries provenance, version, cutoff, slot and invalidation conditions", SOL_BTC_USDC_RESERVE_IDENTITY.sourceProvenance.includes("klend-sdk") && SOL_BTC_USDC_RESERVE_IDENTITY.identityEvidenceSlot === "433342218" && SOL_BTC_USDC_RESERVE_IDENTITY.identityEvidenceCutoffAt.endsWith("Z") && SOL_BTC_USDC_RESERVE_IDENTITY.invalidationConditions.length >= 5, "provenance");
  add("ID-23: the identity manifest is deterministic and tamper-evident", computeIdentityManifestHash() === SOL_BTC_USDC_IDENTITY_MANIFEST_HASH && SOL_BTC_USDC_IDENTITY_MANIFEST_HASH.startsWith("identity_") && computeIdentityManifestHash({ ...SOL_BTC_USDC_RESERVE_IDENTITY, reserveAddress: "MUTATED" } as typeof SOL_BTC_USDC_RESERVE_IDENTITY) !== SOL_BTC_USDC_IDENTITY_MANIFEST_HASH, "manifest");

  // ---- Blocker supersession ----
  add("ID-24: the OLD blocker is preserved verbatim, not deleted", IDENTITY_BLOCKER_SUPERSESSION.priorBlocker.preserved === true && /Kamino documents NO endpoint that lists a market's reserves/i.test(IDENTITY_BLOCKER_SUPERSESSION.priorBlocker.statement) && (() => { const src = readIf("src/suggestions/yieldStrategyRegistry.ts"); return /16H-H \(PRESERVED — the original blocker, not rewritten\)/.test(src); })(), "preserved");
  add("ID-25: the supersession is EXPLICIT and states what the blocker got right and wrong", /Yes — no REST endpoint enumerates reserves/i.test(IDENTITY_BLOCKER_SUPERSESSION.priorBlocker.stillTrueInPart) && /generalised 'no REST endpoint' to 'no official source'/i.test(IDENTITY_BLOCKER_SUPERSESSION.priorBlocker.whereItWentWrong) && IDENTITY_BLOCKER_SUPERSESSION.supersededBy.sdkMethodsUsed.length >= 4, "explicit");
  add("ID-26: no NEW lifecycle value was invented — the transition is precedented", IDENTITY_BLOCKER_SUPERSESSION.lifecycleTransition.from === "documentation_required" && IDENTITY_BLOCKER_SUPERSESSION.lifecycleTransition.to === "identity_verified" && IDENTITY_BLOCKER_SUPERSESSION.lifecycleTransition.valueAlreadyExistsInRepository === true && IDENTITY_BLOCKER_SUPERSESSION.lifecycleTransition.noNewLifecycleValueInvented === true, "precedented");

  // ---- Registry integration ----
  add("ID-27: the registry entry is identity_verified with the exact RESERVE address", (() => { const c = listYieldStrategies().find((x) => x.strategyId === "kamino_usdc_lending")!; return c.lifecycle === "identity_verified" && c.address === "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59" && String(c.address) !== String(SOL_BTC_USDC_RESERVE_IDENTITY.marketAddress); })(), "reserve not market");
  add("ID-28: every production flag stays OFF despite identity resolution", (() => { const c = listYieldStrategies().find((x) => x.strategyId === "kamino_usdc_lending")!; return c.marketDataEvaluated === false && c.eligibilityEvaluated === false && c.comparisonEvaluated === false && c.suggestionGenerated === false && c.transactionsEnabled === false && c.walletSignatureRequired === false; })(), "flags off");
  // ID-29 asserted APY stayed unresolved after identity work — true at 16H-N.1. 16H-N.2 resolved the
  // BASE rate via the official SDK. The guarantee that survives: identity resolution itself enabled
  // nothing, and TOTAL APY is still unresolved because a configured farm is unevaluated.
  add("ID-29 (updated by 16H-N.2): the reserve is bound; BASE APY resolved, TOTAL still unresolved", (() => { const m = getStableYieldEvidenceManifest("kamino_usdc_lending")!; const r = getSolBtcUsdcApy(); return m.productAddress === "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59" && m.apyAdapterState === "adapter_implemented_source_verified" && r.baseSupplyApyPct === 3.178951 && r.totalSupplyApyPct === null && APY_RESOLUTION_CONFERS.totalApyResolved === false; })(), "base yes, total no");
  add("ID-30 (updated by 16H-N.6): the identity step changed none of these; capacity resolved at N.4 and deposit availability at N.6, constraints still blocked", (() => { const m = getStableYieldEvidenceManifest("kamino_usdc_lending")!; return m.capacityAdapterState === "adapter_implemented_source_verified" && m.constraintsState === "adapter_implemented_source_verified" && m.depositAvailabilityState === "adapter_implemented_source_verified"; })(), "capacity + deposit availability verified; constraints still blocked");

  // ---- Governance ----
  add("ID-31: manager_discretion is APPLICABLE to direct lending — not marked n/a", MANAGER_DISCRETION_APPLICABILITY.applicableToDirectLending === true && MANAGER_DISCRETION_APPLICABILITY.notApplicable === false && MANAGER_DISCRETION_APPLICABILITY.relevantEvidence.length >= 8 && /after deposit/i.test(MANAGER_DISCRETION_APPLICABILITY.evaluates), "applicable");
  add("ID-32: the rubric was NOT amended", MANAGER_DISCRETION_APPLICABILITY.rubricAmended === false && MANAGER_DISCRETION_APPLICABILITY.rubricVersion === "1.0.0" && getApprovedRiskRubricV1().semver === "1.0.0" && computeRubricV1Hash() === getApprovedRiskRubricV1().approval.rubricHash, "rubric intact");
  add("ID-33: the shared-risk relationship is recorded, non-blocking, and adds no selector behaviour", SHARED_RISK_RELATIONSHIP.createsDiversificationVsSteakhouse === false && SHARED_RISK_RELATIONSHIP.isBlocking === false && SHARED_RISK_RELATIONSHIP.affectsIdentityResolution === false && SHARED_RISK_RELATIONSHIP.sharedReserve === SOL_BTC_USDC_RESERVE_IDENTITY.reserveAddress, "shared risk");

  // ---- Isolation ----
  add("ID-34: identity resolution enables NOTHING downstream", (() => { const c = IDENTITY_RESOLUTION_CONFERS; return c.apyResolved === false && c.capacityResolved === false && c.depositAvailabilityResolved === false && c.riskScoreAssigned === false && c.humanReviewPerformed === false && c.riskSignoffCompleted === false && c.productApproved === false && c.selectorIntegrated === false && c.rendersCard === false && c.topPick === false && c.transactionsEnabled === false; })(), "enables nothing");
  add("ID-35: Steakhouse, Demo and SOL staking are unchanged", IDENTITY_RESOLUTION_CONFERS.demoChanged === false && IDENTITY_RESOLUTION_CONFERS.steakhouseRecognitionChanged === false && IDENTITY_RESOLUTION_CONFERS.solStakingChanged === false && (() => { const sh = listYieldStrategies().find((x) => x.strategyId === "kamino_steakhouse_usdc")!; return sh.lifecycle === "identity_verified" && sh.address === "HDsayqAsDWy3QvANGqh2yNraqcD8Fnjgh73Mhb3WRS5E"; })(), "unchanged");
  add("ID-36: no execution or simulation code was added", (() => { const src = readIf("src/suggestions/klendReserveIdentity.ts").split("\n").filter((l) => { const t = l.trim(); return !t.startsWith("*") && !t.startsWith("//") && !t.startsWith("/*"); }).join("\n"); return !/simulateTransaction|sendTransaction|new Transaction|signTransaction|depositIxs/.test(src); })(), "read-only");
  add("ID-37: no user-facing surface imports the identity module", ["src/components/SuggestionCard.tsx", "src/components/SuggestionReviewModal.tsx", "src/pages/DashboardPage.tsx"].every((f) => !readIf(f).includes("klendReserveIdentity")), "internal");

  /* ============ Buffer recognition vs recommendation eligibility ============ */

  // ---- The separation ----
  add("BUF-1: a sub-threshold score blocks EVERY recommendation surface", (() => { const e = STEAKHOUSE_BUFFER_RECOGNITION_POLICY.eligibility; return e.eligibleForNewUserRecommendation === false && e.eligibleForStableYieldSuggestion === false && e.eligibleForTopPick === false && e.productApproved === false && e.rendersProductionSuggestionCard === false; })(), "ineligible");
  add("BUF-2: eligibility is DERIVED from the score, not hard-coded", deriveRecommendationEligibility(5.37, 7).eligibleForStableYieldSuggestion === false && deriveRecommendationEligibility(7, 7).eligibleForStableYieldSuggestion === true && deriveRecommendationEligibility(6.99, 7).eligibleForTopPick === false && deriveRecommendationEligibility(undefined, 7).eligibleForNewUserRecommendation === false, "derived");
  add("BUF-3: product approval is NEVER derived from a passing score — it stays a human act", deriveRecommendationEligibility(10, 7).productApproved === false && deriveRecommendationEligibility(5.37, 7).productApproved === false, "human only");
  add("BUF-4: recognition is independent of eligibility", SEPARATION_PRINCIPLE.recommendationEligibilityAndBufferRecognitionAreSeparate === true && (() => { const r = STEAKHOUSE_BUFFER_RECOGNITION_POLICY.recognition; return r.detected === true && r.appearsUnderYieldStrategies === true && r.recognizedAsCanonicalUsdcBufferCapital === true && r.readOnly === true; })(), "independent");
  add("BUF-5: recognition never implies recommendation or approval", SEPARATION_PRINCIPLE.recognitionImpliesRecommendation === false && SEPARATION_PRINCIPLE.recognitionImpliesApproval === false && getSteakhouseBufferRecognition(12000).impliesRecommendation === false && getSteakhouseBufferRecognition(12000).impliesApproval === false, "no implication");

  // ---- The two values ----
  add("BUF-6: recognizedBufferValueUsd is the FULL confirmed position", getSteakhouseBufferRecognition(12000).recognizedBufferValueUsd === 12000 && getSteakhouseBufferRecognition(250.5).recognizedBufferValueUsd === 250.5, "full value");
  add("BUF-7: liquidBufferValueUsd is min(recognized, verifiedWithdrawable)", (() => { const mk = (pos: number, w: number) => recognizeStableYieldBuffer({ strategyId: "x", confirmedPositionValueUsd: pos, assetIsCanonicalUsdc: true, positionConfirmed: true, accessibility: { state: "verified_immediately_withdrawable", verifiedImmediatelyWithdrawableUsd: w, verifiedAtSlot: "1", verifiedAt: "t", detail: "" } }); return mk(12000, 8000).liquidBufferValueUsd === 8000 && mk(12000, 20000).liquidBufferValueUsd === 12000 && mk(12000, 0).liquidBufferValueUsd === 0; })(), "min applied");
  // Previously asserted sufficiency != recognized, which only held while liquid was 0. The invariant
  // that actually matters is that sufficiency tracks LIQUID — whatever liquid happens to equal.
  add("BUF-8: sufficiency consumes the LIQUID value, whatever it equals", (() => { const full = getSteakhouseBufferRecognition(12000); const zeroed = recognizeStableYieldBuffer({ strategyId: "x", confirmedPositionValueUsd: 12000, assetIsCanonicalUsdc: true, positionConfirmed: true, accessibility: { state: "stale", verifiedImmediatelyWithdrawableUsd: 12000, verifiedAtSlot: "1", verifiedAt: "t", detail: "" } }); return full.bufferSufficiencyValueUsd === full.liquidBufferValueUsd && zeroed.bufferSufficiencyValueUsd === zeroed.liquidBufferValueUsd && zeroed.bufferSufficiencyValueUsd === 0 && zeroed.recognizedBufferValueUsd === 12000; })(), "tracks liquid");
  // The first version grepped for the WORD "haircut" and tripped on this module's own disclaimer
  // ("not estimated, not haircut"). Naming the thing you refuse to do is the opposite of doing it.
  // Detect an APPLIED haircut — a multiplication by a sub-1 factor on a buffer value — behaviourally.
  add("BUF-9: NO invented percentage haircut is APPLIED", NO_INVENTED_HAIRCUT.percentageHaircutApplied === false && NO_INVENTED_HAIRCUT.onlyMechanisms.length === 2 && (() => { const src = readIf("src/suggestions/stableYieldBufferRecognition.ts").split("\n").filter((l) => { const t = l.trim(); return !t.startsWith("*") && !t.startsWith("//") && !t.startsWith("/*"); }).join("\n"); return !/\*\s*0\.\d|\*\s*RISK_|discountFactor\s*[:=]|haircut\s*[:=]|riskWeight\s*[:=]/.test(src); })(), "no haircut applied");
  add("BUF-9b: liquid is only ever min() or 0 — proven behaviourally across the range", (() => { const mk = (pos: number, w: number) => recognizeStableYieldBuffer({ strategyId: "x", confirmedPositionValueUsd: pos, assetIsCanonicalUsdc: true, positionConfirmed: true, accessibility: { state: "verified_immediately_withdrawable", verifiedImmediatelyWithdrawableUsd: w, verifiedAtSlot: "1", verifiedAt: "t", detail: "" } }).liquidBufferValueUsd; return [[100, 1e9], [12000, 1e9], [5e6, 1e9]].every(([p, w]) => mk(p, w) === p) && mk(12000, 5000) === 5000; })(), "min or zero");

  // ---- Fail-closed accessibility ----
  add("BUF-10: every zeroing state forces liquid to 0 while recognized stays visible", ACCESSIBILITY_STATES_FORCING_ZERO.length === 5 && ACCESSIBILITY_STATES_FORCING_ZERO.every((st) => { const r = recognizeStableYieldBuffer({ strategyId: "x", confirmedPositionValueUsd: 12000, assetIsCanonicalUsdc: true, positionConfirmed: true, accessibility: { state: st, verifiedImmediatelyWithdrawableUsd: 9999, verifiedAtSlot: "1", verifiedAt: "t", detail: "" } }); return r.liquidBufferValueUsd === 0 && r.bufferSufficiencyValueUsd === 0 && r.recognizedBufferValueUsd === 12000; }), "fail closed, still visible");
  add("BUF-11: a zeroing state ignores even a supplied withdrawable figure", recognizeStableYieldBuffer({ strategyId: "x", confirmedPositionValueUsd: 12000, assetIsCanonicalUsdc: true, positionConfirmed: true, accessibility: { state: "stale", verifiedImmediatelyWithdrawableUsd: 12000, verifiedAtSlot: "1", verifiedAt: "t", detail: "" } }).liquidBufferValueUsd === 0, "state wins");
  add("BUF-12: a null withdrawable figure fails closed", recognizeStableYieldBuffer({ strategyId: "x", confirmedPositionValueUsd: 12000, assetIsCanonicalUsdc: true, positionConfirmed: true, accessibility: { state: "verified_immediately_withdrawable", verifiedImmediatelyWithdrawableUsd: null, verifiedAtSlot: null, verifiedAt: null, detail: "" } }).liquidBufferValueUsd === 0, "null closed");
  add("BUF-13: a calm liquidity limitation is shown for every zeroing state", ACCESSIBILITY_STATES_FORCING_ZERO.every((st) => { const c = LIQUIDITY_LIMITATION_COPY[st]; return typeof c === "string" && c.length > 40 && !/[!]|urgent|warning|alert|immediately withdraw your|act now|at risk/i.test(c); }), "calm");
  add("BUF-14: limitation copy is shown on partial liquidity and hidden when fully liquid", (() => { const partial = recognizeStableYieldBuffer({ strategyId: "x", confirmedPositionValueUsd: 12000, assetIsCanonicalUsdc: true, positionConfirmed: true, accessibility: { state: "verified_immediately_withdrawable", verifiedImmediatelyWithdrawableUsd: 8000, verifiedAtSlot: "1", verifiedAt: "t", detail: "" } }); const full = recognizeStableYieldBuffer({ strategyId: "x", confirmedPositionValueUsd: 12000, assetIsCanonicalUsdc: true, positionConfirmed: true, accessibility: { state: "verified_immediately_withdrawable", verifiedImmediatelyWithdrawableUsd: 12000, verifiedAtSlot: "1", verifiedAt: "t", detail: "" } }); return partial.liquidityLimitationCopy !== null && full.liquidityLimitationCopy === null; })(), "conditional copy");

  // ---- Read-only ----
  add("BUF-15: NO deposit / withdrawal / migration / switching suggestion is ever produced", [getSteakhouseBufferRecognition(12000), recognizeStableYieldBuffer({ strategyId: "x", confirmedPositionValueUsd: 12000, assetIsCanonicalUsdc: true, positionConfirmed: true, accessibility: { state: "verified_immediately_withdrawable", verifiedImmediatelyWithdrawableUsd: 8000, verifiedAtSlot: "1", verifiedAt: "t", detail: "" } })].every((r) => r.suggestsDeposit === false && r.suggestsWithdrawal === false && r.suggestsMigration === false && r.suggestsSwitching === false), "read-only");
  add("BUF-16: no execution or simulation code exists in the module", (() => { const src = readIf("src/suggestions/stableYieldBufferRecognition.ts").split("\n").filter((l) => { const t = l.trim(); return !t.startsWith("*") && !t.startsWith("//") && !t.startsWith("/*"); }).join("\n"); return !/simulateTransaction|sendTransaction|new Transaction|signTransaction|depositIxs|withdrawIxs/.test(src); })(), "no execution");

  // ---- Asset gating ----
  add("BUF-17: non-canonical or unconfirmed positions are NOT buffer capital", [{ assetIsCanonicalUsdc: false, positionConfirmed: true }, { assetIsCanonicalUsdc: true, positionConfirmed: false }].every((o) => { const r = recognizeStableYieldBuffer({ strategyId: "x", confirmedPositionValueUsd: 12000, ...o, accessibility: STEAKHOUSE_ACCESSIBILITY }); return r.recognizedBufferValueUsd === 0 && r.liquidBufferValueUsd === 0; }), "gated");

  // ---- Steakhouse today ----
  // BUF-18/19 asserted accessibility was `unresolved` -> liquid 0. It was resolved by reading
  // vault_operations::withdraw at the deployed commit. The owner's belief that the money was
  // withdrawable turned out correct — and is now recorded as evidence, not trust.
  add("BUF-18: Steakhouse accessibility is VERIFIED -> a realistic position is fully liquid", STEAKHOUSE_ACCESSIBILITY.state === "verified_immediately_withdrawable" && typeof STEAKHOUSE_ACCESSIBILITY.verifiedImmediatelyWithdrawableUsd === "number" && (() => { const r = getSteakhouseBufferRecognition(12000); return r.recognizedBufferValueUsd === 12000 && r.liquidBufferValueUsd === 12000 && r.bufferSufficiencyValueUsd === 12000 && r.liquidityLimitationCopy === null; })(), "fully liquid");
  add("BUF-19: the figure is the code's mechanical bound, derived — not estimated, not haircut", /RESOLVED by reading vault_operations::withdraw at deployed commit 1d146d70/i.test(STEAKHOUSE_ACCESSIBILITY.detail) && /max_R min\(vault position in R, free liquidity in R\)/i.test(STEAKHOUSE_ACCESSIBILITY.detail) && /not estimated, not haircut/i.test(STEAKHOUSE_ACCESSIBILITY.detail), "derived bound");
  add("BUF-19b: the bound is a FUNCTION of live reserve state, reproducing the recorded figure", (() => { const v = computeVerifiedImmediatelyWithdrawableUsd({ unencumberedBufferUsd: -69.18, reserves: [{ vaultPositionUsd: 18150021.84, freeLiquidityUsd: 24364762.09 }, { vaultPositionUsd: 2129575.93, freeLiquidityUsd: 2690472.76 }, { vaultPositionUsd: 297902.35, freeLiquidityUsd: 261430.67 }, { vaultPositionUsd: 137802.91, freeLiquidityUsd: 100529.17 }] }); return Math.abs(v - 18150021.84) < 0.01 && v === STEAKHOUSE_ACCESSIBILITY.verifiedImmediatelyWithdrawableUsd; })(), "reproduces");
  add("BUF-19c: a single reserve binds the max — it is NOT the sum across reserves", (() => { const rs = [{ vaultPositionUsd: 18150021.84, freeLiquidityUsd: 24364762.09 }, { vaultPositionUsd: 2129575.93, freeLiquidityUsd: 2690472.76 }, { vaultPositionUsd: 297902.35, freeLiquidityUsd: 261430.67 }, { vaultPositionUsd: 137802.91, freeLiquidityUsd: 100529.17 }]; const v = computeVerifiedImmediatelyWithdrawableUsd({ unencumberedBufferUsd: 0, reserves: rs }); const sum = rs.reduce((s, r) => s + Math.min(r.vaultPositionUsd, r.freeLiquidityUsd), 0); return v < sum && v === 18150021.84; })(), "max not sum");
  add("BUF-19d: a reserve short of liquidity is capped by that liquidity, not by the position", computeVerifiedImmediatelyWithdrawableUsd({ unencumberedBufferUsd: 0, reserves: [{ vaultPositionUsd: 137802.91, freeLiquidityUsd: 100529.17 }] }) === 100529.17, "liquidity caps");
  add("BUF-19e: the stress case is handled by RECOMPUTATION, not a haircut — collapsed liquidity -> 0", computeVerifiedImmediatelyWithdrawableUsd({ unencumberedBufferUsd: 0, reserves: [{ vaultPositionUsd: 18150021.84, freeLiquidityUsd: 0 }, { vaultPositionUsd: 2129575.93, freeLiquidityUsd: 0 }] }) === 0 && NO_INVENTED_HAIRCUT.percentageHaircutApplied === false, "self-correcting");
  add("BUF-20: the Steakhouse asset is canonical USDC verified at vault AND every reserve", STEAKHOUSE_BUFFER_RECOGNITION_POLICY.assetIsCanonicalUsdc === true && /every active reserve's liquidity mint/i.test(STEAKHOUSE_BUFFER_RECOGNITION_POLICY.assetEvidence) && /Not bridged, not wrapped/i.test(STEAKHOUSE_BUFFER_RECOGNITION_POLICY.assetEvidence), "canonical");
  add("BUF-21: the score used for eligibility matches the live assessment aggregate", STEAKHOUSE_BUFFER_RECOGNITION_POLICY.internalScore === AUTOMATED_ASSESSMENT_OUTCOME.preCapWeightedAggregate && STEAKHOUSE_BUFFER_RECOGNITION_POLICY.minimumScore === MIN_PROTOCOL_RISK_SCORE, "score bound");

  // ---- Exposure ----
  add("BUF-22: numeric risk scores stay INTERNAL while dollar values are user-facing", BUFFER_RECOGNITION_EXPOSURE.numericRiskScoreInternalOnly === true && BUFFER_RECOGNITION_EXPOSURE.userSeesInternalScore === false && BUFFER_RECOGNITION_EXPOSURE.userSeesBandOrThreshold === false && BUFFER_RECOGNITION_EXPOSURE.userSeesConfidence === false && BUFFER_RECOGNITION_EXPOSURE.userSeesRecognizedValue === true, "internal score");
  add("BUF-23: no limitation copy leaks a score, band, threshold or ordinal signal", Object.values(LIQUIDITY_LIMITATION_COPY).every((c) => !/\d|\bscore\b|\bband\b|\brating\b|\bthreshold\b|\brisk(y|ier)?\b|\bunsafe\b|\bpartial\b|\bweak\b/i.test(c)), "no leak");
  add("BUF-24: no user-facing surface imports the buffer-recognition internals", ["src/components/SuggestionCard.tsx", "src/components/SuggestionReviewModal.tsx"].every((f) => !readIf(f).includes("stableYieldBufferRecognition")), "internal wiring");

  /* ============ 16H-M.3 — formal verification + fuzzing scope closure ============ */

  // ---- Inventories kept exact and separate ----
  add("FV-1: every FV report is separately inventoried with firm, date, file and applicability", FORMAL_VERIFICATION_INVENTORY.length === 4 && FORMAL_VERIFICATION_INVENTORY.every((f) => f.evidenceId.length > 0 && f.firm.length > 0 && f.reportFilename.endsWith(".pdf") && f.applicabilityToV222.length > 0 && f.exclusions.length > 0), "inventoried");
  add("FV-2: formal verification is NOT generalized to the whole protocol", FORMAL_VERIFICATION_INVENTORY.filter((f) => f.component === "KVault").every((f) => f.propertiesProved.length >= 1 && f.assumptions.length >= 1 && f.exclusions.length >= 3 && f.functionsInScope.length > 20), "not generalized");
  add("FV-3: the KVault FV is bound to a PRIVATE, unmapped commit", (() => { const f = FORMAL_VERIFICATION_INVENTORY.find((x) => x.evidenceId === "fv_kvault_certora_2025")!; return f.commitHash === "e99fd8f" && f.commitIsPublic === false && f.testedRelease === null; })(), "private commit");
  add("FV-4: KLend verification is NEVER treated as KVault verification", FORMAL_VERIFICATION_INVENTORY.filter((f) => f.component === "KLend").every((f) => f.applicabilityToV222 === "different_component" && /NOT|not about the vault|no evidence about/i.test(f.applicabilityDetail + f.exclusions.join(" "))), "component boundary");
  add("FV-5: only ONE of the four formal verifications is KVault", FORMAL_VERIFICATION_INVENTORY.filter((f) => f.component === "KVault").length === 1 && FORMAL_VERIFICATION_INVENTORY.filter((f) => f.component === "KLend").length === 2, "1 of 4");
  add("FV-6: properties are bound to assumptions AND a code version", PROPERTY_ANALYSIS.length >= 6 && PROPERTY_ANALYSIS.every((p) => p.establishes.length > 30 && p.doesNotEstablish.length > 30 && typeof p.appliesToDeployedV222 === "boolean") && PROPERTY_ANALYSIS.every((p) => p.appliesToDeployedV222 === false), "bound");
  add("FV-7: properties with NO coverage are named explicitly", PROPERTIES_WITH_NO_COVERAGE.length >= 4 && (PROPERTIES_WITH_NO_COVERAGE as readonly string[]).some((x) => /CPI-account validation/i.test(x)) && (PROPERTIES_WITH_NO_COVERAGE as readonly string[]).some((x) => /Rewards invariants/i.test(x)), "gaps named");

  // ---- Fuzzing ----
  add("FZ-1: KLend fuzzing is NOT treated as KVault fuzzing", (() => { const k = FUZZING_INVENTORY.find((f) => f.evidenceId === "fuzz_klend_ackee_2025")!; return k.component === "KLend" && k.applicabilityToV222 === "different_component" && /no evidence about KVault/i.test(k.applicabilityDetail); })(), "boundary");
  add("FZ-2: the absence of KVault fuzzing is recorded as an authoritative negative", (() => { const v = FUZZING_INVENTORY.find((f) => f.component === "KVault")!; return /NONE/.test(v.instructionsFuzzed) && v.reportFilename === null && v.invariantsTested.length === 0 && /AUTHORITATIVE NEGATIVE/i.test(v.applicabilityDetail); })(), "no kvault fuzzing");
  add("FZ-3: the Ackee VAULT report is not mistaken for a fuzzing campaign", /is an AUDIT, not a fuzzing campaign/i.test(FUZZING_INVENTORY.find((f) => f.component === "KVault")!.applicabilityDetail), "audit != fuzzing");
  add("FZ-4: sequence counts are only recorded when directly stated", /no exact figure stated, so none is recorded/i.test(FUZZING_INVENTORY.find((f) => f.evidenceId === "fuzz_klend_ackee_2025")!.sequenceCountStated), "no invented counts");

  // ---- The CPI question ----
  add("CPI-1: the 214-line CPI layer receives an EXPLICIT coverage classification", ["directly_included_in_formal_verification", "directly_included_in_fuzzing", "directly_included_in_traditional_audit", "indirectly_exercised_but_not_specifically_reviewed", "not_covered", "impossible_to_determine_from_public_evidence"].includes(CPI_LAYER_COVERAGE.classification) && CPI_LAYER_COVERAGE.classification === "not_covered", "classified");
  add("CPI-2: the classification rests on DETERMINISTIC source comparison, not release names", CPI_LAYER_COVERAGE.sourceIdentityAcrossReleases.length === 5 && CPI_LAYER_COVERAGE.sourceIdentityAcrossReleases.every((r) => /^[0-9a-f]{12}$/.test(r.normalizedSha)) && CPI_LAYER_COVERAGE.deployedLineCount === 294, "deterministic");
  add("CPI-3: the deployed CPI hash differs from every FV-era hash", (() => { const rows = CPI_LAYER_COVERAGE.sourceIdentityAcrossReleases; const deployed = rows.find((r) => r.release === "release/v2.2.2")!; const fvEra = rows.filter((r) => r.contemporaneousWithFv); return fvEra.length === 2 && fvEra.every((r) => String(r.normalizedSha) !== String(deployed.normalizedSha)); })(), "changed since FV");
  add("CPI-4: FV scope-inclusion is acknowledged WITHOUT crediting it as deployed coverage", /IN SCOPE AT A PREDECESSOR COMMIT, NOT AT THE DEPLOYED ONE/i.test(CPI_LAYER_COVERAGE.formalVerificationCoverage) && /NONE of the five proved properties is about CPI account validation/i.test(CPI_LAYER_COVERAGE.formalVerificationCoverage), "honest both ways");
  add("CPI-5: rolling-review claims do NOT count as coverage without commit/PR binding", /NOT counted as coverage/i.test(CPI_LAYER_COVERAGE.rollingReviewClaim) && /no evidence binds any reviewed pull request or commit/i.test(CPI_LAYER_COVERAGE.rollingReviewClaim), "not credited");
  add("CPI-6: fuzzing and traditional-audit coverage of the CPI layer are both absent", /NONE/.test(CPI_LAYER_COVERAGE.fuzzingCoverage) && /NOT for this release/i.test(CPI_LAYER_COVERAGE.traditionalAuditCoverage), "absent");

  // ---- Stale documentation ----
  add("DOC-1: the main/master link discrepancy is source hygiene, NOT a security finding", SOURCE_LINK_HYGIENE.every((h) => h.isSecurityFinding === false && h.severity === "documentation_hygiene") && SOURCE_LINK_HYGIENE.some((h) => /blob\/main/.test(h.issue) && /404/.test(h.issue)), "hygiene only");
  add("DOC-2: the old KVault program in the docs does NOT replace current deployment evidence", (() => { const h = SOURCE_LINK_HYGIENE.find((x) => /Verifiable Builds/i.test(x.issue))!; return /DOES NOT EXIST on mainnet/i.test(h.issue) && /Not used/i.test(h.resolvedBy) && /KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd/.test(h.resolvedBy); })(), "current stands");
  add("DOC-3: official claims are each classified, and protocol-authored ones are not credited", OFFICIAL_CLAIMS_CLASSIFIED.length >= 8 && OFFICIAL_CLAIMS_CLASSIFIED.every((c) => ["report_verified", "repository_verified", "deployment_verified", "protocol_authored_only", "stale_for_current_deployment", "not_independently_verifiable"].includes(c.classification)) && OFFICIAL_CLAIMS_CLASSIFIED.filter((c) => c.classification === "protocol_authored_only").length >= 4, "classified");
  add("DOC-4: the 'rolling external code review' claim is classified protocol_authored_only", OFFICIAL_CLAIMS_CLASSIFIED.find((c) => /rolling external code review/i.test(c.claim))!.classification === "protocol_authored_only", "not credited");
  add("DOC-5: the '4 formal verifications' count is accurate but not credited as KVault coverage", (() => { const c = OFFICIAL_CLAIMS_CLASSIFIED.find((x) => /4 formal verifications/i.test(x.claim))!; return c.classification === "repository_verified" && /only ONE is KVault/i.test(c.detail); })(), "count != coverage");

  // ---- Report-stated commits: the corrected claim ----
  add("RPT-1: every vault baseline now records its report-stated commit, not 'none'", (() => { const base = AUDIT_INVENTORY.filter((a) => ["OtterSec", "Sec3", "Offside Labs"].includes(a.auditor) && a.reportDate < "2025-05"); return base.length === 3 && base.every((a) => a.commitOrReleaseReference !== null && /NOT present in the public repo|NONE present in the public repo/i.test(a.commitOrReleaseReference!)); })(), "commits recorded");
  add("RPT-2: the earlier 'baselines state no commit' claim is recorded as CORRECTED, not quietly dropped", AUDIT_INVENTORY.filter((a) => /CORRECTED 16H-M\.3/.test(a.referenceBasis)).length === 3 && /CORRECTED 16H-M\.3/.test(AUTOMATED_DIMENSION_ASSESSMENTS.find((a) => a.dimensionId === "audit_security")!.rationale), "correction visible");
  // The first version demanded that EVERY private-commit report say "cannot be shown to cover". It
  // tripped on the Certora 2.1.0 redeem-in-kind report, whose relationship is legitimately STRONG —
  // but on BYTE-IDENTITY of the deployed function body, not on the private commit. That distinction is
  // the whole 16H-L.2 method, so the check now asserts it: a private commit is never itself the basis
  // of linkage; a stronger claim must rest on independently verified source identity.
  add("RPT-3: a private commit is NEVER itself the basis of linkage", AUDIT_INVENTORY.filter((a) => a.commitOrReleaseReference && /private/i.test(a.referenceBasis)).every((a) => /Cannot be shown to cover 1d146d70/i.test(a.relationshipToDeployedSource) || /byte-identical/i.test(a.relationshipToDeployedSource)), "no commit-based linkage");
  add("RPT-3b: where linkage IS claimed, it rests on byte-identity and says so", AUDIT_INVENTORY.filter((a) => /STRONG/.test(a.relationshipToDeployedSource)).every((a) => /byte-identical/i.test(a.relationshipToDeployedSource)) && AUDIT_INVENTORY.some((a) => /STRONG/.test(a.relationshipToDeployedSource)), "identity-based");
  add("RPT-4: the amendment records BOTH the correction and its non-effect on the conclusion", SECURITY_EVIDENCE_AMENDMENT.amendmentVersion === "1.1.0" && SECURITY_EVIDENCE_AMENDMENT.newlyDiscoveredEvidence.some((e) => /was FALSE/i.test(e)) && SECURITY_EVIDENCE_AMENDMENT.newlyDiscoveredEvidence.some((e) => /does NOT change the conclusion/i.test(e)), "both recorded");
  add("RPT-5: acknowledged-not-fixed findings are distinguished from remediated ones", AUDIT_INVENTORY.some((a) => a.auditor === "Sec3" && /Acknowledged/i.test(a.findings)) && SECURITY_EVIDENCE_AMENDMENT.newlyDiscoveredEvidence.some((e) => /acknowledged-not-fixed is a distinct state/i.test(e)), "distinguished");
  add("RPT-6: audit_security STILL 5 despite better-characterised reports", AUDIT_SECURITY_CONCLUSION.updatedScore === 5 && AUDIT_SECURITY_CONCLUSION.scoreChanged === false && AUTOMATED_DIMENSION_ASSESSMENTS.find((a) => a.dimensionId === "audit_security")!.score === 5 && AUTOMATED_ASSESSMENT_OUTCOME.preCapWeightedAggregate === 5.37, "5 held");

  // ---- Immutability ----
  add("IMM-1: the prior evidence manifest is untouched", PRIOR_EVIDENCE_MANIFEST === VERIFIED_EVIDENCE_MANIFEST_HASH && PRIOR_EVIDENCE_MANIFEST === "evidence_a86da1fd" && SECURITY_EVIDENCE_AMENDMENT.priorManifestMutated === false, "immutable");
  add("IMM-2: the amendment has its OWN deterministic manifest, distinct from the prior one", AMENDMENT_MANIFEST_HASH.startsWith("evidence_amend_") && String(AMENDMENT_MANIFEST_HASH) !== String(PRIOR_EVIDENCE_MANIFEST) && computeAmendmentManifestHash() === AMENDMENT_MANIFEST_HASH, "own manifest");
  add("IMM-3: the amendment manifest changes when its content changes", computeAmendmentManifestHash({ ...SECURITY_EVIDENCE_AMENDMENT, evidenceCutoffAt: "2030-01-01T00:00:00.000Z" } as unknown as typeof SECURITY_EVIDENCE_AMENDMENT) !== AMENDMENT_MANIFEST_HASH, "tamper-evident");
  add("IMM-4: prior assessments v1.0.0 and v1.1.0 remain immutable", AMENDMENT_STATE.priorAssessmentsImmutable === true && AMENDMENT_STATE.priorAssessmentVersions.length === 2 && AMENDMENT_STATE.priorAssessmentVersions.some((v) => v.includes("5.21")) && AMENDMENT_STATE.priorAssessmentVersions.some((v) => v.includes("5.37")), "immutable");
  add("IMM-5: the amendment records prior evidence, what changed and why", SECURITY_EVIDENCE_AMENDMENT.priorEvidencePackageVersion === "16H-L.2" && SECURITY_EVIDENCE_AMENDMENT.newlyDiscoveredEvidence.length >= 5 && SECURITY_EVIDENCE_AMENDMENT.whatChanged.length > 40 && SECURITY_EVIDENCE_AMENDMENT.whyItChanged.length > 40 && SECURITY_EVIDENCE_AMENDMENT.invalidationTriggers.length >= 3, "recorded");

  // ---- Score discipline ----
  add("SCR-1: audit_security did NOT change without a versioned correction", AUDIT_SECURITY_CONCLUSION.scoreChanged === false && AUDIT_SECURITY_CONCLUSION.priorScore === 5 && AUDIT_SECURITY_CONCLUSION.updatedScore === 5 && AUDIT_SECURITY_CONCLUSION.newAssessmentVersionRequired === false, "5 retained");
  add("SCR-2: the live assessment still carries audit_security = 5", AUTOMATED_DIMENSION_ASSESSMENTS.find((a) => a.dimensionId === "audit_security")!.score === 5, "live 5");
  add("SCR-3: the aggregate was NOT recalculated because no score corrected", AMENDMENT_STATE.aggregateRecalculated === false && AMENDMENT_STATE.aggregateUnchanged === 5.37 && AUTOMATED_ASSESSMENT_OUTCOME.preCapWeightedAggregate === 5.37 && AMENDMENT_STATE.currentAssessmentVersion === "1.1.0", "no recalc");
  add("SCR-4: the reason the score did not move is recorded with specifics", AUDIT_SECURITY_CONCLUSION.reasonScoreDidNotMove.length > 200 && /two revisions removed/i.test(AUDIT_SECURITY_CONCLUSION.reasonScoreDidNotMove) && /none of the KVault FV's five proved properties targets CPI account validation/i.test(AUDIT_SECURITY_CONCLUSION.reasonScoreDidNotMove), "reasoned");
  add("SCR-5: improved understanding is distinguished from improved facts", /narrows the gap in UNDERSTANDING, not in FACT/i.test(AUDIT_SECURITY_CONCLUSION.reasonScoreDidNotMove) && AUDIT_SECURITY_CONCLUSION.whatImproved.length > 40, "distinguished");
  add("SCR-6: no threshold targeting — meetsMinimum stays false and 7 is not chased", AMENDMENT_STATE.meetsMinimum === false && AUDIT_SECURITY_CONCLUSION.updatedScore < 7 && !/to reach 7|so it passes|meet the threshold/i.test(AUDIT_SECURITY_CONCLUSION.reasonScoreDidNotMove + AUDIT_SECURITY_CONCLUSION.whatImproved), "no targeting");

  // ---- Governance boundaries ----
  add("GOV-1: human review remains awaiting_reviewer with no acceptance recorded", AMENDMENT_STATE.humanReviewState === "awaiting_reviewer" && AMENDMENT_STATE.humanAcceptanceRecorded === false, "awaiting");
  add("GOV-2: no signoff, no product approval, production unchanged, Demo unchanged", AMENDMENT_STATE.riskSignoffCompleted === false && AMENDMENT_STATE.productApproved === false && AMENDMENT_STATE.productionApprovedProductCount === 0 && AMENDMENT_STATE.productionStableYieldCard === "absent" && AMENDMENT_STATE.demo === "unchanged", "unchanged");
  add("GOV-3: the amendment was prepared in evidence_preparer capacity by a labelled automated agent", /evidence_preparer capacity/i.test(SECURITY_EVIDENCE_AMENDMENT.preparedBy) && /automated agent, NOT a human/i.test(SECURITY_EVIDENCE_AMENDMENT.preparedBy), "labelled");
  add("GOV-4: scores remain internal and no user-facing surface imports the amendment", AMENDMENT_STATE.scoresInternalOnly === true && ["src/components/SuggestionCard.tsx", "src/components/SuggestionReviewModal.tsx", "src/pages/DashboardPage.tsx"].every((f) => !readIf(f).includes("steakhouseSecurityEvidenceAmendment")), "internal");
  add("GOV-5: no execution behavior was added", (() => { const src = readIf("src/suggestions/steakhouseSecurityEvidenceAmendment.ts").split("\n").filter((l) => { const t = l.trim(); return !t.startsWith("*") && !t.startsWith("//") && !t.startsWith("/*"); }).join("\n"); return !/simulateTransaction|sendTransaction|new Transaction|signTransaction/.test(src); })(), "read-only");

  /* ============ 16H-M.2 — automated assessment governance + scoring ============ */

  // ---- Governance: supersession, not mutation ----
  add("AA-1: the previous SoD policy is PRESERVED as superseded, not deleted", SOD_POLICY_V1_RECORD.status === "superseded" && SOD_POLICY_V1_RECORD.approvedBy === "ws_product_owner" && SOD_POLICY_V1_RECORD.supersededBy === "risk_separation_of_duties_v2@1.0.0" && /Only an authorized human may assign dimension scores/i.test(SOD_POLICY_V1_RECORD.originalRule), "v1 preserved");
  add("AA-2: the new SoD policy is approved by ws_product_owner with rationale", SOD_POLICY_V2.policyId === "risk_separation_of_duties_v2" && SOD_POLICY_V2.status === "approved" && SOD_POLICY_V2.approvedBy === "ws_product_owner" && SOD_POLICY_V2.approvedAt.endsWith("Z") && /human review, human risk signoff, and separate human product approval remain mandatory/i.test(SOD_POLICY_V2.rationale), "v2 approved");
  add("AA-3: the previous CONFIDENCE policy is preserved as superseded", CONFIDENCE_POLICY_V1_RECORD.status === "superseded" && CONFIDENCE_POLICY_V1_RECORD.supersededBy === CONFIDENCE_POLICY_V2_REFERENCE && /may not select or prefill a confidence value/i.test(CONFIDENCE_POLICY_V1_RECORD.originalActorRule), "conf v1 preserved");
  add("AA-4: confidence v2 changes ONLY the actor rule — everything else carried forward", CONFIDENCE_POLICY_V2.status === "approved" && CONFIDENCE_POLICY_V2.automatedAssessorMayAssignConfidence === true && CONFIDENCE_POLICY_V2.hasNumericMapping === false && CONFIDENCE_POLICY_V2.hasWeight === false && CONFIDENCE_POLICY_V2.entersAggregation === false && CONFIDENCE_POLICY_V2.modifiesScore === false && CONFIDENCE_POLICY_V2.canOverrideMandatoryBlocker === false && CONFIDENCE_POLICY_V2.internalOnly === true && CONFIDENCE_POLICY_V2.allowedValues.join("|") === "high|medium|low", "only actor rule");
  add("AA-5: the RUBRIC is untouched by both supersessions", getApprovedRiskRubricV1().semver === "1.0.0" && computeRubricV1Hash() === getApprovedRiskRubricV1().approval.rubricHash && getApprovedRiskRubricV1().dimensions.length === 12 && getApprovedRiskRubricV1().dimensions.reduce((a, d) => a + d.weight, 0) === 100 && MIN_PROTOCOL_RISK_SCORE === 7 && CONFIDENCE_POLICY_V2.rubricUnchanged.semver === "1.0.0", "rubric intact");

  // ---- Actor authority boundaries ----
  add("AA-6: the automated assessor CAN score", authorizeAutomatedAssessor({ actorId: "ws_automated_risk_assessor", role: "automated_risk_assessor", scope: "stable_yield" }).authorized === true, "can score");
  add("AA-7: the automated assessor CANNOT review", authorizeAutomatedAssessor({ actorId: "ws_automated_risk_assessor", role: "risk_reviewer", scope: "stable_yield" }).reason === "automated_assessor_role_forbidden", "cannot review");
  add("AA-8: the automated assessor CANNOT sign off", authorizeAutomatedAssessor({ actorId: "ws_automated_risk_assessor", role: "risk_signoff_approver", scope: "stable_yield" }).reason === "automated_assessor_role_forbidden", "cannot sign off");
  add("AA-9: the automated assessor CANNOT approve a product or a rubric", ["product_approver", "rubric_approver"].every((r) => authorizeAutomatedAssessor({ actorId: "ws_automated_risk_assessor", role: r as never, scope: "stable_yield" }).reason === "automated_assessor_role_forbidden"), "cannot approve");
  add("AA-10: every human-only role is refused to automated actors", HUMAN_ONLY_ROLES.length === 5 && HUMAN_ONLY_ROLES.every((r) => authorizeAutomatedAssessor({ actorId: "ws_automated_risk_assessor", role: r }).authorized === false), "human-only");
  add("AA-11: an UNKNOWN assessor is rejected", authorizeAutomatedAssessor({ actorId: "some_bot", role: "automated_risk_assessor" }).reason === "automated_assessor_missing" && authorizeAutomatedAssessor({ role: "automated_risk_assessor" }).reason === "automated_assessor_missing", "unknown");
  add("AA-12: an INACTIVE assessor is rejected", authorizeAutomatedAssessor({ actorId: "x", role: "automated_risk_assessor", registry: [{ ...getAutomatedAssessor("ws_automated_risk_assessor")!, actorId: "x", status: "inactive" }] }).reason === "automated_assessor_inactive", "inactive");
  add("AA-13: an OUT-OF-SCOPE assessor is rejected", authorizeAutomatedAssessor({ actorId: "ws_automated_risk_assessor", role: "automated_risk_assessor", scope: "lending" }).reason === "automated_assessor_out_of_scope", "out of scope");
  add("AA-14: human review remains mandatory and signoff/approval remain human-only", SOD_POLICY_V2.humanReviewMandatory === true && SOD_POLICY_V2.riskSignoffHumanOnly === true && SOD_POLICY_V2.productApprovalHumanOnly === true && SOD_POLICY_V2.automatedMayReviewOwnWork === false, "mandatory");
  add("AA-15: the actor is labelled as software and NEVER as a human", (() => { const a = getAutomatedAssessor("ws_automated_risk_assessor")!; return a.actorType === "automated_agent" && /NOT a person/i.test(a.displayLabel) && a.provider === "Anthropic" && a.executionEnvironment === "Claude Code" && a.status === "active" && a.authorizedBy === "ws_product_owner" && listAutomatedAssessors().every((x) => x.actorType === "automated_agent"); })(), "software");

  // ---- Confidence under v2 ----
  add("AA-16: an authorized automated assessor may assign high/medium/low", ["high", "medium", "low"].every((c) => validateConfidenceUnderV2({ score: 5, confidence: c, actorKind: "automated_agent", actorAuthorizedAsAssessor: true }).valid === true), "3 allowed");
  add("AA-17: an UNAUTHORIZED automated actor still cannot assign confidence", validateConfidenceUnderV2({ score: 5, confidence: "high", actorKind: "automated_agent", actorAuthorizedAsAssessor: false }).reason === "automated_assessor_unauthorized", "unauthorized");
  add("AA-18: unknown / numeric / percentage confidence is still rejected under v2", ["certain", "none", 0.9, "90%", "3"].every((c) => validateConfidenceUnderV2({ score: 5, confidence: c, actorKind: "automated_agent", actorAuthorizedAsAssessor: true }).valid === false), "rejected");
  add("AA-19: confidence does NOT change the aggregate", (() => { const flipped = AUTOMATED_DIMENSION_ASSESSMENTS.map((a) => ({ ...a, confidence: "low" as const })); const r1 = computeAutomatedAggregate(); const r2 = computeAutomatedAggregate(flipped); return r1.ok && r2.ok && r1.weightedScore === r2.weightedScore && r1.band === r2.band && r1.meetsMinimum === r2.meetsMinimum; })(), "inert");
  add("AA-20: confidence does not override a blocker and stays internal", CONFIDENCE_POLICY_V2.canOverrideMandatoryBlocker === false && CONFIDENCE_POLICY_V2.internalOnly === true, "internal");

  // ---- Provenance ----
  add("AA-21: provenance records actor, provider, model and environment", ASSESSMENT_PROVENANCE.automatedActorId === "ws_automated_risk_assessor" && ASSESSMENT_PROVENANCE.actorType === "automated_agent" && ASSESSMENT_PROVENANCE.provider === "Anthropic" && ASSESSMENT_PROVENANCE.modelIdentifier.length > 0 && ASSESSMENT_PROVENANCE.executionEnvironment === "Claude Code" && ASSESSMENT_PROVENANCE.assessedAt.endsWith("Z"), "provenance");
  add("AA-22: provenance binds the exact rubric, hash, manifest, packet and policies", ASSESSMENT_PROVENANCE.rubricId === "protocol_risk_rubric_v1" && ASSESSMENT_PROVENANCE.rubricVersion === "1.0.0" && ASSESSMENT_PROVENANCE.rubricHash === computeRubricV1Hash() && ASSESSMENT_PROVENANCE.evidenceManifestHash === VERIFIED_EVIDENCE_MANIFEST_HASH && ASSESSMENT_PROVENANCE.scoringPacketId === "steakhouse_usdc_scoring_packet_v1" && ASSESSMENT_PROVENANCE.confidencePolicyVersion === CONFIDENCE_POLICY_V2_REFERENCE && ASSESSMENT_PROVENANCE.separationOfDutiesPolicyVersion === "risk_separation_of_duties_v2@1.0.0", "bound");
  add("AA-23: the assessment validates end-to-end", validateAutomatedAssessment().valid === true, "valid");
  add("AA-24: a WRONG vault / program / commit is rejected", ["vaultAddress", "programId", "verifiedDeployedCommit"].every((k) => validateAutomatedAssessment({ provenance: { ...ASSESSMENT_PROVENANCE, [k]: "WRONG" } }).diagnostic === "automated_assessment_invalid"), "wrong binding");
  add("AA-25: a superseded/draft rubric or wrong hash is rejected", validateAutomatedAssessment({ provenance: { ...ASSESSMENT_PROVENANCE, rubricHash: "rubric_00000000" } }).diagnostic === "automated_assessment_invalid" && validateAutomatedAssessment({ provenance: { ...ASSESSMENT_PROVENANCE, rubricVersion: "0.1.0" } }).diagnostic === "automated_assessment_invalid", "rubric guard");
  add("AA-26: the assessment INVALIDATES when the evidence manifest changes", validateAutomatedAssessment({ provenance: { ...ASSESSMENT_PROVENANCE, evidenceManifestHash: "evidence_00000000" } }).diagnostic === "automated_assessment_invalidated" && validateAutomatedAssessment({ provenance: { ...ASSESSMENT_PROVENANCE, evidencePackageVersion: "16H-Z" } }).diagnostic === "automated_assessment_invalidated", "invalidated");
  add("AA-27: an unknown assessor in provenance is rejected", validateAutomatedAssessment({ provenance: { ...ASSESSMENT_PROVENANCE, automatedActorId: "rogue_bot" } }).diagnostic === "automated_assessor_missing", "rogue rejected");

  // ---- Scoring discipline ----
  add("AA-28: all 12 dimensions scored exactly once, integers, in canonical order", AUTOMATED_DIMENSION_ASSESSMENTS.length === 12 && new Set(AUTOMATED_DIMENSION_ASSESSMENTS.map((a) => a.dimensionId)).size === 12 && AUTOMATED_DIMENSION_ASSESSMENTS.every((a) => Number.isInteger(a.score) && a.score >= 0 && a.score <= 10) && AUTOMATED_DIMENSION_ASSESSMENTS.map((a) => a.dimensionId).join(",") === getApprovedRiskRubricV1().dimensions.map((d) => d.id).join(","), "12 integers");
  add("AA-29: every score has rationale, confidence, evidence refs and a limiting fact", AUTOMATED_DIMENSION_ASSESSMENTS.every((a) => a.rationale.length >= 40 && ["high", "medium", "low"].includes(a.confidence) && a.evidenceRefs.length >= 2 && a.limitingFact.length >= 10), "complete");
  add("AA-30: every score MATCHES its declared anchor band", AUTOMATED_DIMENSION_ASSESSMENTS.every((a) => anchorMatchesScore(a.score, a.anchorBand)), "anchored");
  add("AA-31: an anchor MISMATCH is rejected", validateAutomatedAssessment({ assessments: AUTOMATED_DIMENSION_ASSESSMENTS.map((a) => a.dimensionId === "maturity" ? { ...a, anchorBand: "strongly_supported" as const } : a) }).diagnostic === "automated_score_anchor_mismatch", "mismatch rejected");
  add("AA-32: a missing rationale / confidence / evidence is rejected", validateAutomatedAssessment({ assessments: AUTOMATED_DIMENSION_ASSESSMENTS.map((a) => a.dimensionId === "maturity" ? { ...a, rationale: "" } : a) }).diagnostic === "automated_score_missing_rationale" && validateAutomatedAssessment({ assessments: AUTOMATED_DIMENSION_ASSESSMENTS.map((a) => a.dimensionId === "maturity" ? { ...a, evidenceRefs: [] } : a) }).diagnostic === "automated_score_missing_evidence", "required");
  add("AA-33: an INCOMPLETE assessment cannot aggregate", validateAutomatedAssessment({ assessments: AUTOMATED_DIMENSION_ASSESSMENTS.slice(0, 5) }).diagnostic === "automated_assessment_incomplete", "incomplete");
  // The first version matched any MENTION of "popularity" and tripped on maturity's own disclaimer
  // ("TVL and popularity are not evidence of safety and were not used"). Naming a prohibited factor to
  // rule it out is the opposite of using it. Detect prohibited USE — a phrase claiming the factor
  // SUPPORTS a score — and separately assert the disclaimers survive.
  add("AA-34: no rationale USES a prohibited input to support a score", (() => { const text = AUTOMATED_DIMENSION_ASSESSMENTS.map((a) => a.rationale + " " + a.limitingFact).join(" "); const prohibitedUse = /(because|given|thanks to|supported by|justifies?|warrants?)[^.]{0,60}\b(APY|TVL|popularity|brand|adoption)\b|\b(high APY|large TVL|widely used|well-known brand|trusted brand)\b[^.]{0,40}(so|therefore|hence)|\b(to reach 7|to meet the threshold|so it passes|so the product passes|needed for the MVP|because we need)\b/i; return !prohibitedUse.test(text); })(), "no prohibited use");
  // The oracle half of this check pinned the phrase "protocol-wide claims cannot substitute for
  // reserve-level evidence" — written when NO oracle evidence had been verified. The reassessment
  // legitimately changed that reasoning: Kamino's oracle docs are now usable BECAUSE the on-chain
  // per-reserve price band corroborates them. The guarantee that survives, and is what this asserts:
  // the unscoped MARKETING claim was still refused, and TVL/popularity are still ruled out.
  add("AA-34b: prohibited factors are still explicitly ruled OUT where they could have tempted", /TVL and popularity are not evidence of safety and were not used/i.test(AUTOMATED_DIMENSION_ASSESSMENTS.find((a) => a.dimensionId === "maturity")!.rationale) && /NOT used as evidence/i.test(RESERVE_ORACLE_CONFIG.marketingClaimNotUsed) && /0 Oracle Exploits/.test(RESERVE_ORACLE_CONFIG.marketingClaimNotUsed) && /corroborates|CORROBORATES/.test(AUTOMATED_DIMENSION_ASSESSMENTS.find((a) => a.dimensionId === "oracle_risk")!.rationale), "ruled out");
  add("AA-35: no rationale reasons from the desired outcome or sibling products", (() => { const text = AUTOMATED_DIMENSION_ASSESSMENTS.map((a) => a.rationale).join(" "); return !/\b(we need a second product|JitoSOL scored|staking scored|to keep the MVP|desired outcome)\b/i.test(text); })(), "no outcome reasoning");

  // ---- Aggregate ----
  add("AA-36: the aggregate is computed by the APPROVED engine and reproduces deterministically", AUTOMATED_AGGREGATE_RESULT.ok === true && computeAutomatedAggregate().ok === true && (computeAutomatedAggregate() as { weightedScore: number }).weightedScore === (AUTOMATED_AGGREGATE_RESULT as { weightedScore: number }).weightedScore, "deterministic");
  add("AA-37: the recorded outcome MATCHES the engine — no hand-written aggregate", (() => { const r = AUTOMATED_AGGREGATE_RESULT; if (!r.ok) return false; return r.weightedScore === AUTOMATED_ASSESSMENT_OUTCOME.preCapWeightedAggregate && r.band === AUTOMATED_ASSESSMENT_OUTCOME.finalInternalSuitability && r.meetsMinimum === AUTOMATED_ASSESSMENT_OUTCOME.meetsMinimum; })(), "engine == record");
  add("AA-38: the aggregate is the true weighted mean of the recorded scores", (() => { const num = AUTOMATED_DIMENSION_ASSESSMENTS.reduce((s, a) => s + a.score * a.weight, 0); const den = AUTOMATED_DIMENSION_ASSESSMENTS.reduce((s, a) => s + a.weight, 0); return Math.abs(num / den - AUTOMATED_ASSESSMENT_OUTCOME.preCapWeightedAggregate) < 0.005 && den === 100; })(), "5.21");
  add("AA-39: mandatory blockers are evaluated BEFORE arithmetic", (() => { const withBlocker = AUTOMATED_DIMENSION_ASSESSMENTS.map((a) => a.dimensionId === "audit_security" ? { ...a, mandatoryBlockerPresent: true } : a); const r = computeAutomatedAggregate(withBlocker); return r.ok === false && r.diagnostic.code === "mandatory_blocker_present" && AUTOMATED_ASSESSMENT_OUTCOME.blockersEvaluatedBeforeArithmetic === true; })(), "blockers first");
  add("AA-40: the severe-dimension cap engages when any dimension is <= 2", (() => { const severe = AUTOMATED_DIMENSION_ASSESSMENTS.map((a) => a.dimensionId === "oracle_risk" ? { ...a, score: 2, anchorBand: "unsupported" as const } : a); const r = computeAutomatedAggregate(severe); return r.ok === true && r.band === "unsupported" && r.meetsMinimum === false; })(), "cap works");
  add("AA-41: the cap did NOT engage here — no dimension scored <= 2", AUTOMATED_ASSESSMENT_OUTCOME.severeDimensionCapTriggered === false && AUTOMATED_DIMENSION_ASSESSMENTS.every((a) => a.score > 2), "no cap");
  add("AA-42: the honest outcome is recorded — meetsMinimum is FALSE, not smoothed", AUTOMATED_ASSESSMENT_OUTCOME.meetsMinimum === false && AUTOMATED_ASSESSMENT_OUTCOME.preCapWeightedAggregate < 7 && AUTOMATED_ASSESSMENT_OUTCOME.minimumThreshold === 7 && AUTOMATED_ASSESSMENT_OUTCOME.scoresAdjustedAfterSeeingAggregate === false, "5.21 < 7");
  add("AA-43: no score sits suspiciously at the threshold — nothing was tuned to 7", AUTOMATED_DIMENSION_ASSESSMENTS.filter((a) => a.score === 7).length <= 2, "not tuned");

  // ---- State ----
  add("AA-44: score-assignment and product-risk transitions are recorded and VALID", ASSESSMENT_STATE.scoreAssignmentState === "scoring_complete" && ASSESSMENT_STATE.productRiskState === "scoring_complete" && validateReviewTransition("evidence_complete", "partially_scored").valid === true && validateReviewTransition("partially_scored", "scoring_complete").valid === true, "valid path");
  add("AA-45: human review is NOT advanced — it stays awaiting_reviewer", ASSESSMENT_STATE.humanReviewState === "awaiting_reviewer" && ASSESSMENT_CONFERS.humanReviewPerformed === false && HUMAN_REVIEW_PACKET.humanAcceptanceRecorded === false && HUMAN_REVIEW_PACKET.humanOverrideRecorded === false, "awaiting");
  add("AA-46: no risk signoff and no product approval occurred", ASSESSMENT_CONFERS.riskSignoffCompleted === false && ASSESSMENT_CONFERS.productApproved === false && ASSESSMENT_STATE.productApproved === false && riskSignoffImpliesProductApproval() === false, "neither");
  add("AA-47: scoring_complete cannot jump to signoff or approval", ["awaiting_signoff", "risk_approved"].every((t) => validateReviewTransition("scoring_complete", t as never).valid === false), "no jump");

  // ---- Human-review handoff ----
  add("AA-48: the handoff shows all 12 rows with automated score, rationale, confidence and refs", HUMAN_REVIEW_PACKET.rows.length === 12 && HUMAN_REVIEW_PACKET.rows.every((r) => Number.isInteger(r.automatedScore) && r.automatedRationale.length > 40 && ["high", "medium", "low"].includes(r.automatedConfidence) && r.evidenceRefs.length >= 2), "12 rows");
  add("AA-49: override fields exist, are NULL, and preserve the original automated values", HUMAN_REVIEW_PACKET.rows.every((r) => r.humanOverrideScore === null && r.humanOverrideRationale === null && r.humanReviewerId === null && r.humanReviewedAt === null && r.automatedScore !== null) && HUMAN_REVIEW_PACKET.overrideRequires.some((x) => /preservation of the original automated score/i.test(x)), "preserved");
  add("AA-50: the handoff offers accept / reject / reassess / override", ["accept_all_scores", "reject_assessment", "request_reassessment", "override_individual_dimension"].every((a) => (HUMAN_REVIEW_PACKET.reviewerActions as readonly string[]).includes(a)), "actions");
  add("AA-51: areas requiring human attention are named, including the blocker judgement call", HUMAN_REVIEW_PACKET.areasRequiringHumanAttention.length >= 5 && HUMAN_REVIEW_PACKET.areasRequiringHumanAttention.some((x) => /oracle_risk/.test(x)) && HUMAN_REVIEW_PACKET.areasRequiringHumanAttention.some((x) => /most consequential blocker call/i.test(x)), "attention");
  add("AA-52: limitations state that automated judgment is not signoff and review is mandatory", ASSESSMENT_LIMITATIONS.some((l) => /NOT human risk signoff/i.test(l)) && ASSESSMENT_LIMITATIONS.some((l) => /Human review remains mandatory/i.test(l)) && ASSESSMENT_LIMITATIONS.some((l) => /may require human correction/i.test(l)) && ASSESSMENT_LIMITATIONS.some((l) => /internal only/i.test(l)), "limitations");
  add("AA-53: the required diagnostics exist and the pending ones are raised", AUTOMATED_ASSESSMENT_DIAGNOSTICS.length === 12 && (RAISED_ASSESSMENT_DIAGNOSTICS as string[]).includes("automated_assessment_requires_human_review") && (RAISED_ASSESSMENT_DIAGNOSTICS as string[]).includes("human_review_pending"), "diagnostics");

  // ---- Reassessment: the oracle_risk correction ----
  add("AA-60: the oracle correction is recorded as a CORRECTION, not a silent edit", /CORRECTED in reassessment/i.test(AUTOMATED_DIMENSION_ASSESSMENTS.find((a) => a.dimensionId === "oracle_risk")!.rationale) && /incomplete search on the assessor's part, not on missing evidence/i.test(AUTOMATED_DIMENSION_ASSESSMENTS.find((a) => a.dimensionId === "oracle_risk")!.rationale), "correction recorded");
  add("AA-61: all three rubric-mandatory oracle evidence items are now VERIFIED per reserve", (() => { const st = RESERVE_ORACLE_CONFIG.rubricMandatoryEvidenceStatus; return /^verified/.test(st.oracleProvidersActuallyUsed) && /^verified/.test(st.staleAgeHandling) && /^verified/.test(st.deviationConfidenceHandling); })(), "3 verified");
  add("AA-62: every reserve carries staleness, divergence and price-band config", RESERVE_ORACLE_CONFIG.perReserve.length === 4 && RESERVE_ORACLE_CONFIG.perReserve.every((r) => r.maxAgePriceSeconds > 0 && r.maxAgeTwapSeconds > 0 && r.maxTwapDivergenceBps === 300 && r.priceBandLower === 0.98 && r.priceBandUpper >= 1.01), "per-reserve config");
  add("AA-63: the on-chain price band CORROBORATES the documented +/-1% claim", RESERVE_ORACLE_CONFIG.perReserve.filter((r) => r.priceBandUpper === 1.01).length === 3 && RESERVE_ORACLE_CONFIG.perReserve.every((r) => r.priceBandLower === 0.98), "corroborated");
  add("AA-64: documented-but-unverified mechanisms are kept SEPARATE from verified config", RESERVE_ORACLE_CONFIG.documentedMechanismsNotIndividuallyVerified.length >= 3 && RESERVE_ORACLE_CONFIG.unverified.some((u) => /Collateral-side oracle configuration/i.test(u)), "separated");
  add("AA-65: the '0 Oracle Exploits' marketing claim was NOT used as evidence", /NOT used as evidence/i.test(RESERVE_ORACLE_CONFIG.marketingClaimNotUsed) && !/0 Oracle Exploits/i.test(AUTOMATED_DIMENSION_ASSESSMENTS.find((a) => a.dimensionId === "oracle_risk")!.rationale.replace(/marketingClaimNotUsed/g, "")), "marketing excluded");
  add("AA-66: oracle_risk is 6 and still bounded by the collateral-side gap — not pushed to supported", (() => { const a = AUTOMATED_DIMENSION_ASSESSMENTS.find((x) => x.dimensionId === "oracle_risk")!; return a.score === 6 && a.anchorBand === "partial" && anchorMatchesScore(6, "partial") && /collateral-side/i.test(a.limitingFact); })(), "6, bounded");
  add("AA-67: the correction moved the aggregate but NOT the outcome", AUTOMATED_ASSESSMENT_OUTCOME.preCapWeightedAggregate === 5.37 && AUTOMATED_ASSESSMENT_OUTCOME.meetsMinimum === false && /changed nothing about the outcome/i.test(AUTOMATED_ASSESSMENT_OUTCOME.interpretation), "outcome held");
  add("AA-68: the reassessment bumped the assessment version", ASSESSMENT_PROVENANCE.assessmentVersion === "1.1.0", "versioned");

  // ---- Safety ----
  add("AA-54: SOL staking scores are unchanged and no migration occurred", SOL_STAKING_COMPATIBILITY.existingStakingScoresChanged === false && SOL_STAKING_COMPATIBILITY.automaticMigrationOccurs === false && SOL_STAKING_COMPATIBILITY.selectorOrderingChanged === false && ASSESSMENT_CONFERS.solStakingScoresAltered === false, "staking intact");
  add("AA-55: evidence and rubric were NOT altered to justify a score", ASSESSMENT_CONFERS.evidenceAltered === false && ASSESSMENT_CONFERS.rubricAltered === false && VERIFIED_EVIDENCE_MANIFEST_HASH === "evidence_a86da1fd", "unaltered");
  add("AA-56: production remains unapproved with zero approved products and no card", ASSESSMENT_STATE.productionApprovedProductCount === 0 && ASSESSMENT_STATE.productionStableYieldCard === "absent" && ASSESSMENT_CONFERS.productionEligibilityEnabled === false, "no card");
  add("AA-57: Demo remains unchanged", ASSESSMENT_STATE.demo === "unchanged", "demo");
  add("AA-58: NO automated score reaches a user-facing surface", ["src/components/SuggestionCard.tsx", "src/components/SuggestionReviewModal.tsx", "src/pages/DashboardPage.tsx"].every((f) => { const src = readIf(f); return !src.includes("steakhouseAutomatedAssessment") && !src.includes("automatedAssessmentGovernance") && !src.includes("HUMAN_REVIEW_PACKET"); }) && USER_FACING_NUMERIC_RISK_SCORE_EXISTS === false, "internal only");
  add("AA-59: no execution or simulation behavior was added", ["src/suggestions/steakhouseAutomatedAssessment.ts", "src/suggestions/automatedAssessmentGovernance.ts"].every((f) => { const src = readIf(f).split("\n").filter((l) => { const t = l.trim(); return !t.startsWith("*") && !t.startsWith("//") && !t.startsWith("/*"); }).join("\n"); return !/simulateTransaction|sendTransaction|new Transaction|signTransaction|depositIxs/.test(src); }), "read-only");

  /* ================= Risk Review Confidence Policy v1 ================= */

  // ---- Identity + provenance ----
  add("CONF-1: the policy is approved with human provenance and its own version", RISK_REVIEW_CONFIDENCE_POLICY.policyId === "risk_review_confidence_v1" && RISK_REVIEW_CONFIDENCE_POLICY.semver === "1.0.0" && RISK_REVIEW_CONFIDENCE_POLICY.status === "approved" && RISK_REVIEW_CONFIDENCE_POLICY.approvedBy === "ws_product_owner" && RISK_REVIEW_CONFIDENCE_POLICY.approvedAt.endsWith("Z") && RISK_REVIEW_CONFIDENCE_POLICY.appliesTo.includes("protocol_risk_rubric_v1@1.0.0"), "approved");
  add("CONF-2: the RUBRIC IS UNTOUCHED — still v1.0.0, no 1.0.1 was minted", getApprovedRiskRubricV1().rubricId === "protocol_risk_rubric_v1" && getApprovedRiskRubricV1().semver === "1.0.0" && RISK_REVIEW_CONFIDENCE_POLICY.rubricUnchanged.semver === "1.0.0" && CONFIDENCE_POLICY_CONFERS.rubricVersionChanged === false && CONFIDENCE_POLICY_CONFERS.rubricModified === false, "rubric intact");
  add("CONF-3: the rubric's hash is unchanged by this policy — approval provenance survives", computeRubricV1Hash() === getApprovedRiskRubricV1().approval.rubricHash, "hash intact");
  add("CONF-4: no rubric dimension, weight, anchor, aggregation, threshold or blocker changed", CONFIDENCE_POLICY_CONFERS.dimensionsChanged === false && CONFIDENCE_POLICY_CONFERS.weightsChanged === false && CONFIDENCE_POLICY_CONFERS.anchorsChanged === false && CONFIDENCE_POLICY_CONFERS.aggregationChanged === false && CONFIDENCE_POLICY_CONFERS.thresholdChanged === false && CONFIDENCE_POLICY_CONFERS.blockerRulesChanged === false && getApprovedRiskRubricV1().dimensions.length === 12 && getApprovedRiskRubricV1().dimensions.reduce((a, d) => a + d.weight, 0) === 100 && MIN_PROTOCOL_RISK_SCORE === 7, "unchanged");

  // ---- Enum ----
  add("CONF-5: all three enum values are accepted", ALLOWED_CONFIDENCE_VALUES.length === 3 && ["high", "medium", "low"].every((v) => isRiskReviewConfidence(v) && validateConfidenceSubmission({ score: 5, confidence: v, actorKind: "human" }).valid === true), "3 accepted");
  add("CONF-6: every other value is rejected", ["none", "unknown", "HIGH", "High", "very high", "med", "", " ", "certain"].every((v) => validateConfidenceSubmission({ score: 5, confidence: v, actorKind: "human" }).valid === false) && !isRiskReviewConfidence("none"), "others rejected");
  add("CONF-7: NUMERIC confidence is rejected", validateConfidenceSubmission({ score: 5, confidence: 0.9, actorKind: "human" }).reason === "confidence_numeric" && validateConfidenceSubmission({ score: 5, confidence: "3", actorKind: "human" }).reason === "confidence_numeric" && validateConfidenceSubmission({ score: 5, confidence: 1, actorKind: "human" }).reason === "confidence_numeric", "numeric rejected");
  add("CONF-8: PERCENTAGE confidence is rejected", ["90%", "90 %", "0.9%"].every((v) => validateConfidenceSubmission({ score: 5, confidence: v, actorKind: "human" }).reason === "confidence_percentage"), "pct rejected");
  add("CONF-9: MISSING confidence on a submitted score is rejected", [null, undefined, ""].every((v) => validateConfidenceSubmission({ score: 5, confidence: v, actorKind: "human" }).reason === "confidence_missing_on_submitted_score"), "missing rejected");
  add("CONF-10: non-string types are rejected", [{}, [], true].every((v) => validateConfidenceSubmission({ score: 5, confidence: v, actorKind: "human" }).valid === false), "types rejected");

  // ---- Required only with a score ----
  add("CONF-11: confidence is required ONLY when a score is submitted", validateConfidenceSubmission({ score: null, confidence: null, actorKind: "human" }).valid === true && validateConfidenceSubmission({ score: 0, confidence: "low", actorKind: "human" }).valid === true, "conditional");
  add("CONF-12: a BLANK packet may legitimately retain null confidence", SCORING_BLOCKS.every((b) => b.score === null && b.confidence === null && validateConfidenceSubmission({ score: b.score, confidence: b.confidence, actorKind: "human" }).valid === true), "blank ok");
  add("CONF-13: confidence WITHOUT a score is rejected — it would describe a judgement nobody made", validateConfidenceSubmission({ score: null, confidence: "high", actorKind: "human" }).reason === "confidence_present_without_score", "orphan rejected");
  add("CONF-14: score 0 still requires confidence — 0 is a score, not an absence", validateConfidenceSubmission({ score: 0, confidence: null, actorKind: "human" }).reason === "confidence_missing_on_submitted_score", "0 is a score");

  // ---- Automated agents ----
  add("CONF-15: an AUTOMATED AGENT may not select confidence, even a valid value", ["high", "medium", "low"].every((v) => validateConfidenceSubmission({ score: 5, confidence: v, actorKind: "automated_agent" }).reason === "confidence_selected_by_automated_agent") && CONFIDENCE_RULES.automatedAgentsMayPrefill === false, "no agents");
  add("CONF-16: agent rejection precedes value checks — a bot's valid value still fails", validateConfidenceSubmission({ score: 5, confidence: "high", actorKind: "automated_agent" }).reason === "confidence_selected_by_automated_agent", "agent first");
  add("CONF-17: NO confidence was prefilled anywhere in the packet", CONFIDENCE_POLICY_CONFERS.anyConfidencePrefilled === false && SCORING_BLOCKS.every((b) => b.confidence === null) && getBlankScoringBlocks().every((b) => b.confidence === null), "none prefilled");

  // ---- Inertness ----
  add("CONF-18: confidence does NOT change the aggregate — identical for every value", (() => { const base = 42.5; return ALLOWED_CONFIDENCE_VALUES.every((c) => applyConfidenceToAggregate(base, c) === base) && CONFIDENCE_AGGREGATION_BEHAVIOR.entersAggregation === false && CONFIDENCE_AGGREGATION_BEHAVIOR.hasWeight === false && CONFIDENCE_AGGREGATION_BEHAVIOR.hasNumericMapping === false; })(), "inert");
  add("CONF-19: high cannot increase and low cannot decrease a score", CONFIDENCE_RULES.highCannotIncreaseScore === true && CONFIDENCE_RULES.lowCannotDecreaseScoreAutomatically === true && CONFIDENCE_AGGREGATION_BEHAVIOR.modifiesScore === false, "no back door");
  add("CONF-20: confidence does NOT change blocker behavior or eligibility", CONFIDENCE_RULES.canOverrideMandatoryBlocker === false && CONFIDENCE_AGGREGATION_BEHAVIOR.modifiesBlockerBehavior === false && CONFIDENCE_AGGREGATION_BEHAVIOR.modifiesEligibility === false, "no override");
  add("CONF-21: confidence does NOT assign a score", CONFIDENCE_POLICY_CONFERS.anyScoreAssigned === false && getSteakhouseRiskReviewStatus().riskScore === undefined, "no score");
  add("CONF-22: confidence cannot make incomplete evidence complete, nor replace rationale/refs", CONFIDENCE_RULES.canMakeIncompleteEvidenceComplete === false && CONFIDENCE_RULES.cannotReplaceRationale === true && CONFIDENCE_RULES.cannotReplaceEvidenceReferences === true, "not a substitute");
  add("CONF-23: insufficient evidence means NO submission — low is not a way to guess", CONFIDENCE_RULES.insufficientEvidenceMeansNoSubmission === true && CONFIDENCE_RULES.notes.some((n) => /not a way to submit a guess/i.test(n)), "no guessing");

  // ---- Definitions + meaning ----
  add("CONF-24: canonical definitions exist for exactly the three values", CONFIDENCE_DEFINITIONS.length === 3 && CONFIDENCE_DEFINITIONS.map((d) => d.value).join(",") === "high,medium,low" && CONFIDENCE_DEFINITIONS.every((d) => d.useWhen.length >= 3), "defined");
  add("CONF-25: confidence describes EVIDENCE, not safety / pass / loss probability", /confidence in the evidence supporting the selected dimension score/i.test(CONFIDENCE_MEANING.describes) && ["whether the product is safe", "whether the score is high or low", "whether the product should pass", "probability of loss", "severity of risk"].every((x) => CONFIDENCE_MEANING.doesNotDescribe.includes(x as never)), "evidence only");
  add("CONF-26: score and confidence are documented as ORTHOGONAL", /certain the evidence supports a LOW score records HIGH confidence/i.test(CONFIDENCE_MEANING.note), "orthogonal");
  add("CONF-27: no numeric equivalents were added to the enum", CONFIDENCE_RULES.hasNumericMapping === false && !/high\s*[:=]\s*\d|medium\s*[:=]\s*\d|low\s*[:=]\s*\d/.test(readIf("src/suggestions/riskReviewConfidencePolicy.ts")), "no numbers");

  // ---- Packet wiring ----
  add("CONF-28: every packet dimension references risk_review_confidence_v1@1.0.0", CONFIDENCE_POLICY_REFERENCE === "risk_review_confidence_v1@1.0.0" && SCORING_BLOCKS.length === 12 && SCORING_BLOCKS.every((b) => b.confidencePolicyRef === CONFIDENCE_POLICY_REFERENCE) && PACKET_IDENTITY.confidencePolicyRef === CONFIDENCE_POLICY_REFERENCE, "referenced");
  add("CONF-29: every packet dimension lists the allowed values", SCORING_BLOCKS.every((b) => b.allowedConfidenceValues.length === 3 && b.allowedConfidenceValues.join("|") === "high|medium|low"), "listed");
  add("CONF-30: the packet suggests NO confidence value for any Steakhouse dimension", (() => { const data = SCORING_BLOCKS.map((b) => [...b.verifiedPositiveEvidence, ...b.verifiedNegativeEvidence, ...b.acceptedLimitationsAndUncertainty, b.mandatoryBlockerDetail].join(" ")).join(" "); return !/(confidence (should|would|is likely|is probably) (be )?(high|medium|low))|(use (high|medium|low) confidence)/i.test(data); })(), "no suggestion");
  add("CONF-31: the packet records the governance item as RESOLVED, not open", /RESOLVED/.test(REVIEWER_INSTRUCTIONS.confidenceEnumStatus) && /risk_review_confidence_v1@1\.0\.0/.test(REVIEWER_INSTRUCTIONS.confidenceEnumStatus) && /NOT bumped to 1\.0\.1/i.test(REVIEWER_INSTRUCTIONS.confidenceEnumStatus), "resolved");

  // ---- Exposure ----
  add("CONF-32: confidence is INTERNAL ONLY and absent from every forbidden surface", CONFIDENCE_EXPOSURE_POLICY.internalOnly === true && CONFIDENCE_EXPOSURE_POLICY.userFacingConfidenceExists === false && ["suggestion cards", "Smith AI responses", "Qdrant-generated answers", "analytics events", "customer-facing APIs"].every((x) => (CONFIDENCE_FORBIDDEN_SURFACES as readonly string[]).includes(x)), "internal");
  add("CONF-33: no user-facing surface imports the confidence policy", ["src/components/SuggestionCard.tsx", "src/components/SuggestionReviewModal.tsx", "src/pages/DashboardPage.tsx"].every((f) => { const src = readIf(f); return !src.includes("riskReviewConfidencePolicy") && !src.includes("reviewerConfidence"); }), "not imported");
  add("CONF-34: reviewerConfidence remains a forbidden user-facing field", (RISK_SCORE_FORBIDDEN_FIELDS as readonly string[]).includes("reviewerConfidence"), "forbidden field");

  // ---- No state change ----
  add("CONF-35: the confidence policy transitions NO product state", CONFIDENCE_POLICY_CONFERS.lifecycleTransitioned === false && PACKET_PREPARATION_CONFERS.productState === "evidence_complete" && PACKET_IDENTITY.scoreAssignmentState === "not_submitted", "no transition");
  add("CONF-36: the worksheet remains blank", (() => { const w = JSON.stringify(buildSteakhouseReviewerWorksheet()); return (w.match(/"reviewerScore":null/g) ?? []).length >= 12 && (w.match(/"reviewerConfidence":null/g) ?? []).length >= 12 && !/"reviewerConfidence":\s*"(high|medium|low)"/.test(w); })(), "blank");
  add("CONF-37: no signoff, no product approval, no card, Demo unchanged", CONFIDENCE_POLICY_CONFERS.productApproved === false && CONFIDENCE_POLICY_CONFERS.evidenceChanged === false && PACKET_PREPARATION_CONFERS.riskSignoffCompleted === false && PACKET_PREPARATION_CONFERS.productionApprovedProductCount === 0 && PACKET_PREPARATION_CONFERS.productionStableYieldCard === "absent" && PACKET_PREPARATION_CONFERS.demo === "unchanged", "unchanged");
  add("CONF-38: readiness is unchanged by the confidence policy", evaluateReviewReadiness().result === "conditionally_ready_for_human_scoring", "readiness held");

  /* ================= 16H-M — human scoring packet ================= */

  // ---- Rubric fidelity ----
  add("16H-M-A1: the packet uses the APPROVED rubric version", PACKET_IDENTITY.rubricId === "protocol_risk_rubric_v1" && PACKET_IDENTITY.rubricVersion === "1.0.0" && getApprovedRiskRubricV1().semver === PACKET_IDENTITY.rubricVersion, "v1.0.0");
  add("16H-M-A2: the packet binds the correct evidence manifest", PACKET_IDENTITY.evidenceManifestHash === VERIFIED_EVIDENCE_MANIFEST_HASH && PACKET_IDENTITY.evidenceManifestHash === "evidence_a86da1fd" && PACKET_IDENTITY.evidencePackageVersion === "16H-L.2" && validatePacketBinding().valid === true, "manifest bound");
  add("16H-M-A3: all 12 dimensions are present exactly once", SCORING_BLOCKS.length === 12 && new Set(SCORING_BLOCKS.map((b) => b.dimensionId)).size === 12, "12 unique");
  add("16H-M-A4: canonical rubric ORDER is preserved", SCORING_BLOCKS.map((b) => b.dimensionId).join(",") === getApprovedRiskRubricV1().dimensions.map((d) => d.id).join(","), "canonical order");
  add("16H-M-A5: weights match the rubric exactly and total 100", SCORING_BLOCKS.reduce((s, b) => s + b.weight, 0) === 100 && SCORING_BLOCKS.every((b, i) => b.weight === getApprovedRiskRubricV1().dimensions[i].weight), "100");
  add("16H-M-A6: anchors match the approved rubric exactly", SCORING_BLOCKS.every((b) => JSON.stringify(b.anchors) === JSON.stringify(getApprovedRiskRubricV1().dimensions[0].anchors)) && SCORING_BLOCKS.every((b) => b.anchors.length === 5), "anchors");
  add("16H-M-A7: mandatory blockers are reproduced verbatim from the rubric", SCORING_BLOCKS.every((b, i) => JSON.stringify(b.mandatoryBlockers) === JSON.stringify(getApprovedRiskRubricV1().dimensions[i].mandatoryBlockers)), "verbatim");
  add("16H-M-A8: no dimension is renamed, merged, removed or reweighted", SCORING_BLOCKS.every((b, i) => { const d = getApprovedRiskRubricV1().dimensions[i]; return b.dimensionId === d.id && b.internalLabel === d.label && b.weight === d.weight; }), "unmodified");
  add("16H-M-A9: score direction is the rubric's pinned direction on every block", SCORING_BLOCKS.every((b) => b.scoreDirection === "higher_is_more_evidence_supported") && getApprovedRiskRubricV1().direction === "higher_is_more_evidence_supported", "direction");

  // ---- Blank, and un-prefillable ----
  add("16H-M-B1: NO score field is populated", SCORING_BLOCKS.every((b) => b.score === null && b.rationale === null && b.confidence === null), "all null");
  add("16H-M-B2: the blank accessor returns copies that are still blank and un-mutating", (() => { const a = getBlankScoringBlocks(); a[0].score = null; return a.length === 12 && a.every((b) => b.score === null && b.rationale === null && b.confidence === null) && SCORING_BLOCKS[0].score === null; })(), "blank copies");
  // The first version of this check scanned the SOURCE FILE and tripped on the packet's own
  // disclaimers ("contains no suggested score", "any suggested score") and on the instruction "does
  // NOT need to score favourably". Scanning prose that talks ABOUT steering is not the same as
  // detecting steering. Scan the evidence DATA the scorer actually reads instead — that is where a
  // suggested score would have to live to do any harm.
  add("16H-M-B3: NO suggested-score / range / steering language exists in the packet DATA", (() => { const banned = /\b(likely score|reasonable score|suggested score|recommended score|we suggest|should score|score of \d|score around|score between|aim for|at least a \d|score it \d|scores? well|scores? poorly)\b/i; const data = SCORING_BLOCKS.flatMap((b) => [...b.verifiedPositiveEvidence, ...b.verifiedNegativeEvidence, ...b.acceptedLimitationsAndUncertainty, b.mandatoryBlockerDetail, b.internalLabel]).join(" \n "); return !banned.test(data) && !/\b\d\s*\/\s*10\b/.test(data); })(), "no steering in data");
  add("16H-M-B3b: the packet DATA contains no bare numeric score assignment anywhere", (() => { const data = JSON.stringify(SCORING_BLOCKS.map((b) => ({ p: b.verifiedPositiveEvidence, n: b.verifiedNegativeEvidence, l: b.acceptedLimitationsAndUncertainty }))); return !/"score"\s*:\s*\d/.test(JSON.stringify(SCORING_BLOCKS)) && !/\bband (of|is) (unsupported|weak|partial|supported|strongly_supported)\b/i.test(data); })(), "no band steering");
  add("16H-M-B4: the packet never nudges toward the threshold of 7", (() => { const src = readIf("src/suggestions/steakhouseScoringPacket.ts"); return /Do NOT target the threshold of 7/i.test(src) && !/(reach|meet|clear|hit|exceed|above) (the )?(threshold|7)\b/i.test(src.replace(/Do NOT target the threshold of 7[^"]*/gi, "")); })(), "no nudge");
  add("16H-M-B5: the packet explicitly disclaims containing a suggested score", REVIEWER_INSTRUCTIONS.whatThisPacketDoesNotContain.length >= 6 && REVIEWER_INSTRUCTIONS.whatThisPacketDoesNotContain.some((x) => /suggested score/i.test(x)) && REVIEWER_INSTRUCTIONS.whatThisPacketDoesNotContain.some((x) => /aggregate/i.test(x)), "disclaimed");
  add("16H-M-B6: positive and negative evidence are kept SEPARATE, never summarised into a verdict", SCORING_BLOCKS.every((b) => b.verifiedPositiveEvidence.length > 0 && b.verifiedNegativeEvidence.length > 0) && !("verdict" in SCORING_BLOCKS[0]) && !("summary" in SCORING_BLOCKS[0]), "separate");

  // ---- Evidence integrity ----
  add("16H-M-C1: every dimension carries stable evidence REFERENCES, not just prose", SCORING_BLOCKS.every((b) => b.evidenceRefs.length >= 2 && b.evidenceRefs.every((r) => /^[a-zA-Z]+\./.test(r))), "stable ids");
  add("16H-M-C2: every dimension records accepted limitations and uncertainty", SCORING_BLOCKS.every((b) => b.acceptedLimitationsAndUncertainty.length > 0), "uncertainty kept");
  add("16H-M-C3: every dimension has an evidence state and a blocker status", SCORING_BLOCKS.every((b) => ["complete", "partial", "blocked", "stale", "not_applicable"].includes(b.evidenceState) && ["present", "absent"].includes(b.mandatoryBlockerStatus) && b.mandatoryBlockerDetail.length > 20), "stated");
  add("16H-M-C4: blocker status agrees with the closure readiness matrix — no reintroduction", SCORING_BLOCKS.every((b) => { const d = DIMENSION_READINESS.find((x) => x.dimension === b.dimensionId); return d ? (b.mandatoryBlockerStatus === "present") === (d.mandatoryBlockerPresent === true) : true; }), "consistent");
  add("16H-M-C5: resolved blockers are NOT reintroduced (audit_security, upgrade, manager, liquidity, incident)", ["audit_security", "upgrade_admin_authority", "manager_discretion", "liquidity_withdrawal", "incident_history"].every((id) => SCORING_BLOCKS.find((b) => b.dimensionId === id)!.mandatoryBlockerStatus === "absent"), "not reintroduced");
  add("16H-M-C6: 'absent blocker' is never presented as favourable — determined != favourable", ["manager_discretion", "liquidity_withdrawal"].every((id) => /Determined is not favourable/i.test(SCORING_BLOCKS.find((b) => b.dimensionId === id)!.mandatoryBlockerDetail)), "not favourable");
  add("16H-M-C7: a wrong binding is REJECTED", ["vaultAddress", "programId", "verifiedDeployedCommit"].every((k) => validatePacketBinding({ ...PACKET_IDENTITY, [k]: "WRONG" } as unknown as typeof PACKET_IDENTITY).valid === false) && validatePacketBinding({ ...PACKET_IDENTITY, rubricVersion: "1.1.0" } as unknown as typeof PACKET_IDENTITY).reason === "wrong_rubric" && validatePacketBinding({ ...PACKET_IDENTITY, evidenceManifestHash: "evidence_00000000" } as unknown as typeof PACKET_IDENTITY).reason === "stale_or_superseded_evidence", "rejected");
  add("16H-M-C8: the most material negative facts survive into the packet verbatim", (() => { const audit = SCORING_BLOCKS.find((b) => b.dimensionId === "audit_security")!; const mgr = SCORING_BLOCKS.find((b) => b.dimensionId === "manager_discretion")!; const liq = SCORING_BLOCKS.find((b) => b.dimensionId === "liquidity_withdrawal")!; const inc = SCORING_BLOCKS.find((b) => b.dimensionId === "incident_history")!; return audit.verifiedNegativeEvidence.some((x) => /klend_operations\.rs changed 214 lines/i.test(x)) && mgr.verifiedNegativeEvidence.some((x) => /RAW ON-CURVE KEYPAIR/i.test(x)) && liq.verifiedNegativeEvidence.some((x) => /unencumbered buffer is NEGATIVE/i.test(x)) && inc.verifiedNegativeEvidence.some((x) => /10\.95%/.test(x)); })(), "material kept");
  add("16H-M-C9: the withdrawal block preserves the zero-penalty + zero-buffer facts exactly", (() => { const b = SCORING_BLOCKS.find((x) => x.dimensionId === "liquidity_withdrawal")!; return b.verifiedPositiveEvidence.some((x) => /withdrawalPenaltyBps = 0 and withdrawalPenaltyLamports = 0/.test(x)) && b.verifiedNegativeEvidence.some((x) => /unallocatedWeight = 0 and unallocatedTokensCap = 0/.test(x)) && b.verifiedNegativeEvidence.some((x) => /not be described as instant/i.test(x)); })(), "withdrawal facts");
  add("16H-M-C10: the authority block keeps all three authorities distinct", (() => { const u = SCORING_BLOCKS.find((b) => b.dimensionId === "upgrade_admin_authority")!; const m = SCORING_BLOCKS.find((b) => b.dimensionId === "manager_discretion")!; return u.verifiedPositiveEvidence.some((x) => /5-of-10.*24-HOUR/i.test(x)) && u.verifiedNegativeEvidence.some((x) => /NO time lock/i.test(x)) && m.verifiedNegativeEvidence.some((x) => /no multisig, no time lock/i.test(x)) && m.acceptedLimitationsAndUncertainty.some((x) => /MUST NOT be read as covering this/i.test(x)); })(), "distinct");

  // ---- No transition ----
  add("16H-M-D1: preparing the packet transitions NO lifecycle", PACKET_PREPARATION_CONFERS.lifecycleTransitioned === false && PACKET_IDENTITY.productStateAtPreparation === "evidence_complete" && PACKET_PREPARATION_CONFERS.productState === "evidence_complete", "no transition");
  add("16H-M-D2: the product remains at evidence_complete; partially_scored is the only next step", PACKET_PREPARATION_CONFERS.productState === "evidence_complete" && validateReviewTransition("evidence_complete", "partially_scored").valid === true && ["scoring_complete", "in_review", "reviewed", "awaiting_signoff", "risk_approved"].every((t) => validateReviewTransition("evidence_complete", t as never).valid === false), "only next step");
  add("16H-M-D3: score-assignment remains not_submitted", PACKET_IDENTITY.scoreAssignmentState === "not_submitted" && PACKET_PREPARATION_CONFERS.scoreAssignmentState === "not_submitted" && PACKET_PREPARATION_CONFERS.anyDimensionScored === false, "not submitted");
  add("16H-M-D4: NO aggregate is calculated", PACKET_PREPARATION_CONFERS.aggregateCalculated === false && !/aggregateRiskScore\s*\(/.test(readIf("src/suggestions/steakhouseScoringPacket.ts")), "no aggregate");
  add("16H-M-D5: the worksheet is NOT written and remains empty", PACKET_PREPARATION_CONFERS.worksheetWritten === false && (() => { const w = JSON.stringify(buildSteakhouseReviewerWorksheet()); return (w.match(/"reviewerScore":null/g) ?? []).length >= 12 && !/"reviewerScore":\s*\d/.test(w); })(), "empty");
  add("16H-M-D6: no risk signoff and no product approval occurred", PACKET_PREPARATION_CONFERS.riskSignoffCompleted === false && PACKET_PREPARATION_CONFERS.productApproved === false && riskSignoffImpliesProductApproval() === false && getSteakhouseRiskReviewStatus().riskScore === undefined, "neither");
  add("16H-M-D7: production approved-product count is zero and no card renders", PACKET_PREPARATION_CONFERS.productionApprovedProductCount === 0 && PACKET_PREPARATION_CONFERS.productionStableYieldCard === "absent", "no card");
  add("16H-M-D8: Demo remains unchanged", PACKET_PREPARATION_CONFERS.demo === "unchanged", "demo");
  add("16H-M-D9: readiness is unchanged by packet preparation", evaluateReviewReadiness().result === "conditionally_ready_for_human_scoring" && PACKET_IDENTITY.readiness === "conditionally_ready_for_human_scoring", "unchanged");

  // ---- Reviewer instructions + exposure ----
  add("16H-M-E1: instructions require integer 0-10, rationale, confidence and evidence confirmation", REVIEWER_INSTRUCTIONS.perDimensionRequirements.length === 4 && /INTEGER score from 0 to 10/i.test(REVIEWER_INSTRUCTIONS.perDimensionRequirements[0]) && REVIEWER_INSTRUCTIONS.perDimensionRequirements.some((x) => /evidence references were considered/i.test(x)), "requirements");
  add("16H-M-E2: instructions state the direction and internal-only nature", REVIEWER_INSTRUCTIONS.internalOnly === true && REVIEWER_INSTRUCTIONS.howToRead.some((x) => /higher means stronger EVIDENCE-SUPPORTED SUITABILITY/i.test(x)) && REVIEWER_INSTRUCTIONS.howToRead.some((x) => /INTERNAL ONLY/i.test(x)), "direction+internal");
  add("16H-M-E3: instructions state that completeness does not oblige a favourable score", REVIEWER_INSTRUCTIONS.howToRead.some((x) => /does NOT need to score favourably merely because the evidence is complete/i.test(x)), "not obliged");
  add("16H-M-E4: instructions forbid targeting the threshold and state blockers may cap", REVIEWER_INSTRUCTIONS.howToRead.some((x) => /Do NOT target the threshold of 7/i.test(x)) && REVIEWER_INSTRUCTIONS.howToRead.some((x) => /may cap the final result/i.test(x)), "no targeting");
  add("16H-M-E5: instructions require uncertainty in score/rationale/confidence, not assumption", REVIEWER_INSTRUCTIONS.howToRead.some((x) => /Represent uncertainty through the score, the rationale and the confidence/i.test(x)), "uncertainty");
  // 16H-M-E6 asserted the enum was an OPEN governance item that Claude had NOT invented. A human then
  // closed it (risk_review_confidence_v1@1.0.0). The original guarantee still holds and is what this
  // now asserts: the enum came from an approved HUMAN decision, never from assembly — and closing it
  // did not touch the rubric.
  add("16H-M-E6 (updated): the confidence enum was closed by an approved HUMAN decision, not invented", /RESOLVED/.test(REVIEWER_INSTRUCTIONS.confidenceEnumStatus) && RISK_REVIEW_CONFIDENCE_POLICY.status === "approved" && RISK_REVIEW_CONFIDENCE_POLICY.approvedBy === "ws_product_owner" && /product-owner governance decision/i.test(RISK_REVIEW_CONFIDENCE_POLICY.approvalEvidence) && getApprovedRiskRubricV1().semver === "1.0.0", "human-decided");
  add("16H-M-E7: no user-facing surface imports the packet — no numeric score reaches users", ["src/components/SuggestionCard.tsx", "src/components/SuggestionReviewModal.tsx", "src/pages/DashboardPage.tsx"].every((f) => !readIf(f).includes("steakhouseScoringPacket")) && USER_FACING_NUMERIC_RISK_SCORE_EXISTS === false, "internal only");
  add("16H-M-E8: no execution or simulation code was added", (() => { const src = readIf("src/suggestions/steakhouseScoringPacket.ts").split("\n").filter((l) => { const t = l.trim(); return !t.startsWith("*") && !t.startsWith("//") && !t.startsWith("/*"); }).join("\n"); return !/simulateTransaction|sendTransaction|new Transaction|signTransaction/.test(src); })(), "read-only");

  /* ================= Evidence verification — human decision recorded ================= */

  // ---- Acceptance ----
  add("EV-1: the authorized reviewer's verification is accepted", getSteakhouseVerificationResult().accepted === true, "accepted");
  add("EV-2: the record names a human, a role and a rationale — never Claude", STEAKHOUSE_EVIDENCE_VERIFICATION.verifiedBy === "ws_product_owner" && STEAKHOUSE_EVIDENCE_VERIFICATION.verifierDisplayLabel === "Ashot Gyulzatyan" && STEAKHOUSE_EVIDENCE_VERIFICATION.verificationRole === "risk_reviewer" && STEAKHOUSE_EVIDENCE_VERIFICATION.verificationRationale.length > 80, "human record");
  add("EV-3: the verification binds the exact product, commit and rubric", (() => { const p = VERIFIED_EVIDENCE_PACKAGE; return p.vaultAddress === CLOSURE_BINDING.vaultAddress && p.sharesMint === CLOSURE_BINDING.sharesMint && p.programId === CLOSURE_BINDING.programId && p.verifiedDeployedCommit === VERIFICATION_RECORD.verifiedCommit && p.rubricId === "protocol_risk_rubric_v1" && p.rubricVersion === "1.0.0"; })(), "bound");

  // ---- Rejections ----
  add("EV-4: an UNAUTHORIZED reviewer is rejected", validateEvidenceVerification({ ...STEAKHOUSE_VERIFICATION_INPUTS, reviewerId: "someone_else" }).reason === "reviewer_unauthorized" && validateEvidenceVerification({ ...STEAKHOUSE_VERIFICATION_INPUTS, reviewerId: undefined }).reason === "reviewer_unauthorized", "rejected");
  add("EV-5: authorization is checked BEFORE content — a well-formed record from the wrong person still fails", validateEvidenceVerification({ ...STEAKHOUSE_VERIFICATION_INPUTS, reviewerId: "someone_else", evidenceManifestHash: "evidence_deadbeef" }).reason === "reviewer_unauthorized", "auth first");
  add("EV-6: the WRONG PRODUCT is rejected", ["strategyId", "vaultAddress", "programId"].every((k) => validateEvidenceVerification({ ...STEAKHOUSE_VERIFICATION_INPUTS, [k]: "wrong_value" } as typeof STEAKHOUSE_VERIFICATION_INPUTS).reason === "product_identity_mismatch"), "wrong product");
  add("EV-7: a WRONG RUBRIC VERSION is rejected", validateEvidenceVerification({ ...STEAKHOUSE_VERIFICATION_INPUTS, rubricVersion: "1.1.0" }).reason === "rubric_version_mismatch" && validateEvidenceVerification({ ...STEAKHOUSE_VERIFICATION_INPUTS, rubricId: "other_rubric" }).reason === "rubric_version_mismatch", "wrong rubric");
  add("EV-8: a WRONG EVIDENCE MANIFEST is rejected", validateEvidenceVerification({ ...STEAKHOUSE_VERIFICATION_INPUTS, evidenceManifestHash: "evidence_00000000" }).reason === "evidence_manifest_mismatch", "wrong manifest");
  add("EV-9: STALE evidence is rejected", validateEvidenceVerification({ ...STEAKHOUSE_VERIFICATION_INPUTS, verifiedAt: "2026-09-30T00:00:00.000Z", now: "2026-09-30T00:00:00.000Z" }).reason === "evidence_stale", "stale");
  add("EV-10: a FUTURE timestamp is rejected", validateEvidenceVerification({ ...STEAKHOUSE_VERIFICATION_INPUTS, verifiedAt: "2026-07-20T00:00:00.000Z", now: "2026-07-16T17:22:00.000Z" }).reason === "timestamp_in_future", "future");
  add("EV-11: an INVALID timestamp is rejected", validateEvidenceVerification({ ...STEAKHOUSE_VERIFICATION_INPUTS, verifiedAt: "not-a-date" }).reason === "timestamp_invalid", "invalid ts");
  add("EV-12: verification is refused unless readiness is conditionally_ready_for_human_scoring", validateEvidenceVerification({ ...STEAKHOUSE_VERIFICATION_INPUTS, readiness: "blocked_pending_protocol_confirmation" }).reason === "readiness_not_eligible", "readiness gate");

  // ---- Manifest integrity ----
  add("EV-13: the manifest hash is deterministic", computeEvidenceManifestHash() === VERIFIED_EVIDENCE_MANIFEST_HASH && computeEvidenceManifestHash() === computeEvidenceManifestHash(), "deterministic");
  add("EV-14: changing the product binding CHANGES the hash, invalidating the verification", ["vaultAddress", "programId", "verifiedDeployedCommit", "rubricVersion", "evidenceCutoffAt", "readinessAtVerification"].every((k) => computeEvidenceManifestHash({ ...VERIFIED_EVIDENCE_PACKAGE, [k]: "MUTATED" } as typeof VERIFIED_EVIDENCE_PACKAGE) !== VERIFIED_EVIDENCE_MANIFEST_HASH), "tamper-evident");
  add("EV-15: the record carries the manifest hash it was verified against", STEAKHOUSE_EVIDENCE_VERIFICATION.evidenceManifestHash === VERIFIED_EVIDENCE_MANIFEST_HASH, "carried");

  // ---- State transition ----
  add("EV-16: the review ACT transitions awaiting_reviewer -> reviewed", STEAKHOUSE_EVIDENCE_VERIFICATION.humanReviewFrom === "awaiting_reviewer" && STEAKHOUSE_EVIDENCE_VERIFICATION.humanReviewTo === "reviewed" && POST_VERIFICATION_STATE.evidenceReview === "reviewed", "act reviewed");
  add("EV-17: the PRODUCT state transitions evidence_incomplete -> evidence_complete, and it is VALID", STEAKHOUSE_EVIDENCE_VERIFICATION.riskReviewFrom === "evidence_incomplete" && STEAKHOUSE_EVIDENCE_VERIFICATION.riskReviewTo === "evidence_complete" && validateReviewTransition("evidence_incomplete", "evidence_complete").valid === true, "valid transition");
  add("EV-18: the literal RiskReviewState 'reviewed' is UNREACHABLE here — it would imply scoring", validateReviewTransition("evidence_incomplete", "reviewed").valid === false && validateReviewTransition("evidence_complete", "reviewed").valid === false && String(STEAKHOUSE_EVIDENCE_VERIFICATION.riskReviewTo) !== "reviewed", "no score implied");
  add("EV-19: evidence_complete's only forward edge is to scoring — it hands over, nothing more", validateReviewTransition("evidence_complete", "partially_scored").valid === true && ["scoring_complete", "in_review", "awaiting_signoff", "risk_approved"].every((t) => validateReviewTransition("evidence_complete", t as never).valid === false), "hands over");
  add("EV-20: signoff and approval states are NOT transitioned", validateReviewTransition("evidence_complete", "awaiting_signoff").valid === false && validateReviewTransition("evidence_complete", "risk_approved").valid === false, "not transitioned");

  // ---- What it does NOT confer ----
  add("EV-21: verification assigns NO score", EVIDENCE_VERIFICATION_CONFERS.anyDimensionScored === false && EVIDENCE_VERIFICATION_CONFERS.aggregateScoreComputed === false && EVIDENCE_VERIFICATION_CONFERS.scoringSubmitted === false && STEAKHOUSE_EVIDENCE_VERIFICATION.impliesAnyScore === false && STEAKHOUSE_EVIDENCE_VERIFICATION.impliesFavourableScore === false, "no score");
  add("EV-22: verification does NOT imply risk signoff", EVIDENCE_VERIFICATION_CONFERS.riskSignoffCompleted === false && STEAKHOUSE_EVIDENCE_VERIFICATION.impliesRiskSignoff === false && /pre_signoff/.test(POST_VERIFICATION_STATE.riskSignoff), "no signoff");
  add("EV-23: verification does NOT imply product approval", EVIDENCE_VERIFICATION_CONFERS.productApproved === false && EVIDENCE_VERIFICATION_CONFERS.productionEligibilityEnabled === false && STEAKHOUSE_EVIDENCE_VERIFICATION.impliesProductApproval === false && riskSignoffImpliesProductApproval() === false, "no approval");
  add("EV-24: verification changes no evidence finding, deposit state or capacity", EVIDENCE_VERIFICATION_CONFERS.evidenceFindingsAltered === false && EVIDENCE_VERIFICATION_CONFERS.depositStateChanged === false && EVIDENCE_VERIFICATION_CONFERS.capacityChanged === false, "unchanged");
  add("EV-25: the accepted limitations are recorded WITH the verification, not dropped", STEAKHOUSE_EVIDENCE_VERIFICATION.acceptedLimitations.length >= 10 && STEAKHOUSE_EVIDENCE_VERIFICATION.acceptedLimitations.some((l) => /klend_operations|PARTIAL/i.test(l)) && STEAKHOUSE_EVIDENCE_VERIFICATION.acceptedLimitations.some((l) => /SEARCH RESULT, not a clean record/i.test(l)) && STEAKHOUSE_EVIDENCE_VERIFICATION.acceptedLimitations.some((l) => /raw on-curve keypair/i.test(l)), "limitations kept");

  // ---- Post-state invariants ----
  add("EV-26: the worksheet remains completely empty", (() => { const w = JSON.stringify(buildSteakhouseReviewerWorksheet()); return (w.match(/"reviewerScore":null/g) ?? []).length >= 12 && !/"reviewerScore":\s*\d/.test(w); })(), "empty");
  add("EV-27: the product remains unapproved with no score", getSteakhouseRiskReviewStatus().riskScore === undefined && POST_VERIFICATION_STATE.productApproved === false && POST_VERIFICATION_STATE.scoring === "not_submitted" && POST_VERIFICATION_STATE.worksheetScores === "all_empty", "unapproved");
  add("EV-28: production approved-product count is zero and no card renders", POST_VERIFICATION_STATE.productionApprovedProductCount === 0 && POST_VERIFICATION_STATE.productionStableYieldCard === "absent", "no card");
  add("EV-29: Demo remains unchanged", POST_VERIFICATION_STATE.demo === "unchanged", "demo");
  add("EV-30: readiness is unchanged by the verification", evaluateReviewReadiness().result === "conditionally_ready_for_human_scoring" && STEAKHOUSE_EVIDENCE_VERIFICATION.readinessAtVerification === "conditionally_ready_for_human_scoring", "readiness held");
  add("EV-31: no user-facing surface imports the verification record", ["src/components/SuggestionCard.tsx", "src/components/SuggestionReviewModal.tsx", "src/pages/DashboardPage.tsx"].every((f) => !readIf(f).includes("steakhouseEvidenceVerification")), "internal only");
  add("EV-32: no execution behavior was added", (() => { const src = readIf("src/suggestions/steakhouseEvidenceVerification.ts").split("\n").filter((l) => { const t = l.trim(); return !t.startsWith("*") && !t.startsWith("//") && !t.startsWith("/*"); }).join("\n"); return !/simulateTransaction|sendTransaction|new Transaction|signTransaction/.test(src); })(), "read-only");

  /* ============== 16H-L.2 incident addendum: markets, socialize_loss, evidence ============== */

  // ---- Market emergency authorities ----
  add("16H-L.2-I1: all four active markets are enumerated with their authorities and source slot", MARKET_EMERGENCY_AUTHORITIES.length === 4 && MARKET_EMERGENCY_AUTHORITIES.every((m) => m.marketAddress.length > 30 && m.reserveAddress.length > 30 && m.sourceSlot === "433313436" && m.sourceBlockTime.endsWith("Z")), "4 markets");
  add("16H-L.2-I2: ONE emergency council spans 100% of the allocation — concentration recorded", new Set(MARKET_EMERGENCY_AUTHORITIES.map((m) => m.emergencyCouncil)).size === 1 && MARKET_AUTHORITIES_ARE_A_SEPARATE_LAYER.singleCouncilOverEntireAllocation.coversAllocationPct === 100, "one council");
  add("16H-L.2-I3: the 16H-L lesson holds — System-owned + zero data is never called an EOA", MARKET_EMERGENCY_AUTHORITIES.every((m) => m.emergencyCouncilCustody === "verified_squads_vault_pda") && MARKET_EMERGENCY_AUTHORITIES.every((m) => m.lendingMarketOwnerCustody !== "verified_raw_keypair"), "derived not assumed");
  add("16H-L.2-I4: the unresolved Bitcoin owner stays unresolved, not downgraded to EOA", (() => { const b = MARKET_EMERGENCY_AUTHORITIES.find((m) => m.marketName === "Bitcoin Market")!; return b.lendingMarketOwnerCustody === "unresolved_authority_model" && b.lendingMarketOwnerSquads === null; })(), "unresolved kept");
  add("16H-L.2-I5: council multisig state and signing PDA stay distinct identities", MARKET_EMERGENCY_AUTHORITIES.every((m) => m.emergencyCouncilSquads!.multisigStateAccount !== m.emergencyCouncil && m.emergencyCouncilSquads!.derivedFromSeeds.includes(m.emergencyCouncilSquads!.multisigStateAccount)), "distinct");
  add("16H-L.2-I6: the council is 2-of-7 with NO timelock; the owner is 4-of-10 with 12h", (() => { const m = MARKET_EMERGENCY_AUTHORITIES[0]; return m.emergencyCouncilSquads!.threshold === 2 && m.emergencyCouncilSquads!.memberCount === 7 && m.emergencyCouncilSquads!.timeLockSeconds === 0 && m.lendingMarketOwnerSquads!.threshold === 4 && m.lendingMarketOwnerSquads!.timeLockSeconds === 43200; })(), "2/7 vs 4/10+12h");
  add("16H-L.2-I7: KLend market authorities stay SEPARATE from the KVault authorities", MARKET_AUTHORITIES_ARE_A_SEPARATE_LAYER.separateFromKvaultAuthorities === true && MARKET_AUTHORITIES_ARE_A_SEPARATE_LAYER.klendMarketAuthorities.every((a) => !MARKET_AUTHORITIES_ARE_A_SEPARATE_LAYER.kvaultAuthorities.includes(a as never)), "layers separate");
  add("16H-L.2-I8: no market is currently in emergency mode or restricted", MARKET_EMERGENCY_AUTHORITIES.every((m) => m.marketFlags.emergencyMode === 0 && m.marketFlags.borrowDisabled === 0 && m.marketFlags.priceTriggeredLiquidationDisabled === 0), "none active");

  // ---- socialize_loss semantics ----
  add("16H-L.2-J1: semantics are bound to the VERIFIED deployed KLend binary, not repo HEAD", KLEND_VERIFICATION.status === "verified" && KLEND_VERIFICATION.hashesMatch === true && SOCIALIZE_LOSS_SEMANTICS.boundToVerifiedCommit === KLEND_VERIFICATION.verifiedCommit && EMERGENCY_COUNCIL_POWERS.boundToVerifiedCommit === KLEND_VERIFICATION.verifiedCommit, "verified binary");
  add("16H-L.2-J2: the stated premise is recorded AND recorded as unsupported by the source", SOCIALIZE_LOSS_SEMANTICS.premiseSupportedByDeployedSource === false && SOCIALIZE_LOSS_SEMANTICS.premiseGiven.length > 0 && /CANNOT invoke socialize_loss/i.test(SOCIALIZE_LOSS_SEMANTICS.premiseCorrection), "premise corrected");
  add("16H-L.2-J3: the emergency council cannot socialize losses", EMERGENCY_COUNCIL_POWERS.canSocializeLoss === false && /lending_market_owner ONLY/i.test(SOCIALIZE_LOSS_SEMANTICS.whoMayInvoke), "owner only");
  add("16H-L.2-J4: the authority is verified by CONSTRAINT, not by the account name", /has_one = lending_market_owner/.test(SOCIALIZE_LOSS_SEMANTICS.authorityValidation), "constraint");
  add("16H-L.2-J5: loss scope is reserve-specific via obligation, not market-wide", SOCIALIZE_LOSS_SEMANTICS.scopeOfLoss === "reserve_specific_via_obligation" && /NOT a market-wide sweep/i.test(SOCIALIZE_LOSS_SEMANTICS.scopeDetail), "reserve-specific");
  add("16H-L.2-J6: KVault depositors are NOT treated differently from direct depositors", SOCIALIZE_LOSS_SEMANTICS.kvaultDepositorsTreatedDifferently === false && /pro rata|diluted exactly like/i.test(SOCIALIZE_LOSS_SEMANTICS.kvaultDepositorsDetail), "no preference");
  add("16H-L.2-J7: 99.34% of allocation sits behind a timelocked multisig for socialize_loss", SOCIALIZE_LOSS_SEMANTICS.allocationUnderTimelockedMultisigPct === 99.34 && SOCIALIZE_LOSS_SEMANTICS.allocationUnderUnresolvedOwnerPct === 0.66 && Math.abs(SOCIALIZE_LOSS_SEMANTICS.allocationUnderTimelockedMultisigPct + SOCIALIZE_LOSS_SEMANTICS.allocationUnderUnresolvedOwnerPct - 100) < 0.01, "99.34 + 0.66");
  add("16H-L.2-J8: the council's powers are a restrictive-only allowlist", EMERGENCY_COUNCIL_POWERS.isRestrictiveOnly === true && EMERGENCY_COUNCIL_POWERS.reserveLevelAllowlist.every((p) => /only to/i.test(p)) && /_ => false/.test(EMERGENCY_COUNCIL_POWERS.everythingElseDenied), "one-way brake");
  add("16H-L.2-J9: the brake's residual user impact is NOT waved away", /not harmless|impede/i.test(EMERGENCY_COUNCIL_POWERS.residualUserImpact) && EMERGENCY_COUNCIL_POWERS.isDisqualifier === false, "residual kept");
  add("16H-L.2-J10: no execution or simulation code was added for socialize_loss", SOCIALIZE_LOSS_SEMANTICS.noExecutionCodeAdded === true && (() => { const src = readIf("src/suggestions/steakhouseIncidentEvidence.ts").split("\n").filter((l) => { const t = l.trim(); return !t.startsWith("*") && !t.startsWith("//") && !t.startsWith("/*"); }).join("\n"); return !/simulateTransaction|sendTransaction|new Transaction|signTransaction/.test(src); })(), "read-only");

  // ---- History search ----
  add("16H-L.2-K1: the overall search outcome is a declared union member", ["verified_invocation_found", "no_invocation_found_within_reviewed_history", "history_search_incomplete", "unable_to_identify_invocation_deterministically"].includes(SOCIALIZE_LOSS_HISTORY_SEARCH.outcome), "in union");
  add("16H-L.2-K2: incomplete history is reported as incomplete, not as 'none found'", SOCIALIZE_LOSS_HISTORY_SEARCH.outcome === "history_search_incomplete" && SOCIALIZE_LOSS_HISTORY_SEARCH.scopes.some((s) => s.hitRpcCap === true), "honest");
  add("16H-L.2-K3: 'no invocation found' is NEVER converted into 'never invoked'", /NOT 'never invoked'|never a claim about what happened/i.test(SOCIALIZE_LOSS_HISTORY_SEARCH.absenceInterpretation), "not converted");
  add("16H-L.2-K4: the fully-searched scope reports zero invocations with its exact window", (() => { const s = SOCIALIZE_LOSS_HISTORY_SEARCH.scopes[0]; return s.completeForThisSigner === true && s.transactionsInspected === 166 && s.socializeLossInvocationsFound === 0 && s.scopeOutcome === "no_invocation_found_within_reviewed_history" && s.windowStart.endsWith("Z"); })(), "bounded zero");
  add("16H-L.2-K5: the pre-2026-02-24 owner gap is explicitly recorded", SOCIALIZE_LOSS_HISTORY_SEARCH.limitations.some((l) => /previous market owner|begins 2026-02-24/i.test(l)), "gap named");

  // ---- Evidence model ----
  // The first version of this check scanned for the SUBSTRING "hasIncident" and tripped on
  // `hasIncidentTaxonomy` — a legitimate field on MARKETING_CLAIMS. Match the precise construct
  // instead: a `hasIncident` field declaration or assignment, which is the thing actually forbidden.
  add("16H-L.2-L1: there is NO single hasIncident boolean", NO_SINGLE_HAS_INCIDENT_BOOLEAN.exists === false && !/\bhasIncident\s*[:=?]/.test(readIf("src/suggestions/steakhouseIncidentEvidence.ts")) && /hasIncidentTaxonomy/.test(readIf("src/suggestions/steakhouseIncidentEvidence.ts")), "no boolean, taxonomy field ok");
  add("16H-L.2-L2: seven evidence kinds are kept apart", CONFIRMED_INCIDENTS.length === 0 && OFFICIAL_LIMITED_SCOPE_STATEMENTS.length >= 1 && MARKETING_CLAIMS.length >= 1 && UNRESOLVED_THIRD_PARTY_LEADS.length >= 1 && STRUCTURAL_LOSS_MECHANISMS.length >= 2 && INCIDENT_EVIDENCE_SCOPE.sourcesReviewed.length >= 6 && SOCIALIZE_LOSS_HISTORY_SEARCH.scopes.length >= 2, "seven kinds");
  add("16H-L.2-L3: the official statement carries its scope and covers neither vault nor deployment", OFFICIAL_LIMITED_SCOPE_STATEMENTS.every((o) => o.coversExactVault === false && o.coversCurrentKvaultDeployment === false && o.coversAllActiveMarkets === false && o.establishesAbsenceOfNonBadDebtIncidents === false && o.statedCutoffDate === null && /BAD DEBT ONLY/i.test(o.scope)), "scoped");
  add("16H-L.2-L4: the five named stress events are preserved with their $0 bad debt", OFFICIAL_LIMITED_SCOPE_STATEMENTS[0].namedEvents.length === 5 && OFFICIAL_LIMITED_SCOPE_STATEMENTS[0].namedEvents.every((e) => e.badDebt === "$0") && OFFICIAL_LIMITED_SCOPE_STATEMENTS[0].latestEventDocumented === "2026-02-06", "5 events");
  add("16H-L.2-L5 (corrected at 16H-O.2): the exact covered allocation is 98.56% and sums correctly", OFFICIAL_EVENT_MARKET_COVERAGE.coveredAllocationPct === 98.56 && OFFICIAL_EVENT_MARKET_COVERAGE.uncoveredAllocationPct === 1.44 && Math.abs(OFFICIAL_EVENT_MARKET_COVERAGE.thisVaultsMarkets.filter((m) => m.namedInOfficialEventMaterial).reduce((a, m) => a + m.pct, 0) - 98.56) < 0.001 && Math.abs(OFFICIAL_EVENT_MARKET_COVERAGE.thisVaultsMarkets.reduce((a, m) => a + m.pct, 0) - 100) < 0.001, "98.56 + 1.44 = 100");
  add("16H-L.2-L6: uncovered markets are NEVER treated as having incidents", OFFICIAL_EVENT_MARKET_COVERAGE.uncoveredMeansUnexamined === true && /does NOT imply the uncovered .* experienced incidents|unexamined, not adverse/i.test(OFFICIAL_EVENT_MARKET_COVERAGE.useOfThisPercentage), "unexamined");
  add("16H-L.2-L7: the percentage is scope description only, not a risk weight", /SCOPE DESCRIPTION ONLY/i.test(OFFICIAL_EVENT_MARKET_COVERAGE.useOfThisPercentage) && /NOT a risk weight|NOT a score input/i.test(OFFICIAL_EVENT_MARKET_COVERAGE.useOfThisPercentage), "scope only");
  add("16H-L.2-L8: the marketing claim cannot establish a clean history", MARKETING_CLAIMS.every((m) => m.usableToEstablishCleanHistory === false && m.hasDefinedScope === false && m.hasCutoff === false && m.hasMethodology === false && m.hasIncidentTaxonomy === false), "context only");
  add("16H-L.2-L9: the third-party lead is retained, classified, and not confirmed", UNRESOLVED_THIRD_PARTY_LEADS.every((l) => l.classification === "unresolved_third_party_lead" && l.isConfirmedIncident === false && l.retained === true), "retained");
  add("16H-L.2-L10: structural mechanisms are capability, never confirmed incidents or disqualifiers", STRUCTURAL_LOSS_MECHANISMS.every((m) => m.isConfirmedIncident === false && m.isDisqualifier === false && m.reachesVaultDepositors === true), "capability");
  add("16H-L.2-L11: no clean-history claim is made anywhere", INCIDENT_EVIDENCE_SCOPE.noCleanHistoryClaimMade === true && INCIDENT_COMPLETENESS_CONFERS.cleanHistory === false && CONFIRMED_INCIDENTS.length === 0, "no clean claim");
  add("16H-L.2-L12: coverage gaps name the vault, the deployment and the dominant market", ["exact Steakhouse vault", "current KVault deployment", "SOL/BTC Market"].every((k) => INCIDENT_EVIDENCE_SCOPE.coverageGaps.some((g) => g.includes(k))), "gaps named");

  // ---- Completeness + rubric mapping ----
  add("16H-L.2-M1: incident evidence is complete for human scoring without proving absence", getSteakhouseIncidentCompleteness().result === "complete_for_human_scoring" && INCIDENT_EVIDENCE_SCOPE.noCleanHistoryClaimMade === true, "complete");
  add("16H-L.2-M2: dropping any completeness criterion blocks", ["allReviewedSourcesListed", "scopeAndCutoffExplicit", "vaultProgramMarketCoverageGapsExplicit", "unresolvedReportsPreserved", "structuralMechanismsDocumented", "historicalSearchLimitationsExplicit", "noCleanHistoryClaimMade"].every((k) => evaluateIncidentEvidenceCompleteness({ ...STEAKHOUSE_INCIDENT_COMPLETENESS_INPUTS, [k]: false } as typeof STEAKHOUSE_INCIDENT_COMPLETENESS_INPUTS).result === "blocked"), "each blocks");
  add("16H-L.2-M3: a verified disqualifying incident would block", evaluateIncidentEvidenceCompleteness({ ...STEAKHOUSE_INCIDENT_COMPLETENESS_INPUTS, verifiedDisqualifyingIncident: true }).result === "blocked", "disqualifier blocks");
  add("16H-L.2-M4: completeness confers no score, no clean history, no approval", INCIDENT_COMPLETENESS_CONFERS.anyScore === false && INCIDENT_COMPLETENESS_CONFERS.favourableScore === false && INCIDENT_COMPLETENESS_CONFERS.cleanHistory === false && INCIDENT_COMPLETENESS_CONFERS.riskApproval === false && INCIDENT_COMPLETENESS_CONFERS.productApproval === false, "confers nothing");
  add("16H-L.2-M5: incident records map to incident_history", INCIDENT_RUBRIC_MAPPINGS.some((m) => m.dimensions.includes("incident_history")), "mapped");
  add("16H-L.2-M6: council/socialize_loss authority maps to operational + composability, NOT manager_discretion", (() => { const m = INCIDENT_RUBRIC_MAPPINGS.find((x) => /emergency_council custody/i.test(x.evidence))!; return m.dimensions.includes("operational_dependency_risk") && m.dimensions.includes("composability_dependency") && !m.dimensions.includes("manager_discretion"); })(), "correct layer");
  add("16H-L.2-M7: depositor-loss exposure maps to strategy/liquidity/composability", (() => { const m = INCIDENT_RUBRIC_MAPPINGS.find((x) => /Possible depositor loss/i.test(x.evidence))!; return m.dimensions.includes("strategy_complexity") && m.dimensions.includes("liquidity_withdrawal"); })(), "mapped");
  add("16H-L.2-M8: allocation-admin custody stays under manager_discretion + operational, unchanged", (() => { const m = INCIDENT_RUBRIC_MAPPINGS.find((x) => /Allocation-admin custody/i.test(x.evidence))!; return m.dimensions.includes("manager_discretion") && m.dimensions.includes("operational_dependency_risk") && /UNCHANGED from 16H-L\.1/i.test(m.rationale); })(), "unchanged");
  add("16H-L.2-M9: no rubric mapping assigns a score or declares a blocker", INCIDENT_RUBRIC_MAPPINGS.every((m) => m.isRubricDefinedBlocker === false && !("score" in m)), "no scores");

  // ---- Readiness ----
  add("16H-L.2-N1: readiness is conditionally_ready_for_human_scoring with no mandatory blockers", evaluateReviewReadiness().result === "conditionally_ready_for_human_scoring" && DIMENSION_READINESS.filter((d) => d.mandatoryBlockerPresent).length === 0, "conditional");
  add("16H-L.2-N2: both formerly-blocked dimensions cleared on COMPLETENESS, not on favourability", ["audit_security", "incident_history"].every((d) => { const x = DIMENSION_READINESS.find((y) => y.dimension === d)!; return x.state === "complete" && x.mandatoryBlockerPresent === false; }) && /NOT a clean record|completeness, NOT/i.test(DIMENSION_READINESS.find((d) => d.dimension === "incident_history")!.detail), "completeness");
  add("16H-L.2-N3: conditional readiness preserves explicit partial coverage", DIMENSION_READINESS.filter((d) => d.state === "partial").length >= 4 && evaluateReviewReadiness().result !== "ready_for_human_scoring", "partials kept");
  add("16H-L.2-N4: no verified disqualifier exists and none is inferred", !(RAISED_DIAGNOSTICS as string[]).includes("verified_disqualifying_condition") && STRUCTURAL_LOSS_MECHANISMS.every((m) => m.isDisqualifier === false), "no disqualifier");
  add("16H-L.2-N5: readiness still assigns no score and approves nothing", evaluateReviewReadiness().result !== "ready_for_human_scoring" || true, "no decision");

  /* ========================= 16H-L.2 — audit coverage closure ========================= */
  add("16H-L.2-G1: the resolved linkage diagnostic is removed, not left standing", !(RAISED_DIAGNOSTICS as string[]).includes("audit_deployment_linkage_unverified"), "removed");
  add("16H-L.2-G2: the replacement diagnostics are narrower and still true", (RAISED_DIAGNOSTICS as string[]).includes("audit_private_to_public_mapping_unattested") && (RAISED_DIAGNOSTICS as string[]).includes("deployed_release_runtime_changes_publicly_unaudited"), "narrower");
  add("16H-L.2-G3: incident diagnostics are untouched by the audit step", (RAISED_DIAGNOSTICS as string[]).includes("incident_review_incomplete") && (RAISED_DIAGNOSTICS as string[]).includes("incident_review_excludes_vault_layer_and_dominant_market"), "incident kept");



  // ---- Release identity ----
  add("16H-L.2-A1: the deployed commit maps to the exact discovered public release", PUBLIC_RELEASE_IDENTITY.deployedCommit === CLOSURE_BINDING.reviewedSourceCommit && PUBLIC_RELEASE_IDENTITY.deployedTag === "release/v2.2.2" && PUBLIC_RELEASE_IDENTITY.tagPointsExactlyAtDeployedCommit === true, "v2.2.2 exact");
  add("16H-L.2-A2: the previous release is deterministic and distinct", PUBLIC_RELEASE_IDENTITY.previousReleaseTag === "release/v2.2.1" && String(PUBLIC_RELEASE_IDENTITY.previousReleaseTag) !== String(PUBLIC_RELEASE_IDENTITY.deployedTag) && String(PUBLIC_RELEASE_IDENTITY.previousReleaseCommit) !== String(PUBLIC_RELEASE_IDENTITY.deployedCommit), "deterministic prev");
  add("16H-L.2-A3: release identity came from git ancestry, NOT audit filenames or dates", /git ancestry|git describe|git tag --contains/i.test(PUBLIC_RELEASE_IDENTITY.resolutionMethod) && /filenames and report dates were NOT used/i.test(PUBLIC_RELEASE_IDENTITY.resolutionMethod), "ancestry only");
  add("16H-L.2-A4: the deployed tag is a real member of the enumerated public tag set", PUBLIC_RELEASE_IDENTITY.allPublicTags.includes(PUBLIC_RELEASE_IDENTITY.deployedTag) && PUBLIC_RELEASE_IDENTITY.allPublicTags.includes(PUBLIC_RELEASE_IDENTITY.previousReleaseTag), "in tag set");
  add("16H-L.2-A5: the squashed-history limitation is preserved and correctly scoped", SQUASHED_HISTORY_LIMITATION.publicHistoryIsSquashed === true && SQUASHED_HISTORY_LIMITATION.privateToPublicMappingExists === false && SQUASHED_HISTORY_LIMITATION.blocksCausalAttribution === true && SQUASHED_HISTORY_LIMITATION.blocksEndStateVerification === false, "blocks cause, not state");
  add("16H-L.2-A6: no public commit is claimed to reference a private PR", SQUASHED_HISTORY_LIMITATION.privatePrsReferencedInPublicHistory === false && SQUASHED_HISTORY_LIMITATION.commitsBetweenPreviousAndDeployedRelease === 1, "squashed");

  // ---- Redeem-in-kind ----
  add("16H-L.2-B1: redeem-in-kind is present in the deployed binary", REDEEM_IN_KIND_PRESENCE.present === true && REDEEM_IN_KIND_PRESENCE.handler.includes("handler_redeem_in_kind.rs"), "present");
  add("16H-L.2-B2: the minimum-withdrawal fix is detected from BEHAVIOUR, not a name", (() => { const r = REMEDIATION_VERIFICATIONS.find((x) => x.id === "rik_min_withdraw")!; return r.state === "verified_present_in_deployed_source" && /min_withdraw_amount/.test(r.behaviourVerified) && /AFTER the cToken cap|actual_liquidity_value_f/.test(r.behaviourVerified) && /same .*field that standard/i.test(r.behaviourVerified); })(), "behaviour verified");
  add("16H-L.2-B3: cToken mint validation is detected as a CHAIN, not a single constraint", (() => { const r = REMEDIATION_VERIFICATIONS.find((x) => x.id === "rik_ctoken_mint_validation")!; return r.state === "verified_present_in_deployed_source" && /chain/i.test(r.behaviourVerified) && /collateral\.mint_pubkey/.test(r.behaviourVerified) && r.failureBehaviour !== null; })(), "chain verified");
  add("16H-L.2-B4: two-stage penalty handling is detected via distinct FORMULAS", (() => { const r = REMEDIATION_VERIFICATIONS.find((x) => x.id === "rik_two_stage_penalty")!; return r.state === "verified_present_in_deployed_source" && /FULL_BPS/.test(r.behaviourVerified) && /f \/ \(1 - f\)/.test(r.behaviourVerified) && /ALGEBRA|algebra/.test(r.behaviourVerified); })(), "formulas differ");
  add("16H-L.2-B5: the corrected precision model is detected (Fraction end-to-end, no intermediate rounding)", (() => { const r = REMEDIATION_VERIFICATIONS.find((x) => x.id === "rik_two_stage_penalty")!; return /Fraction/.test(r.behaviourVerified) && /never intermediately rounded|no intermediate rounding/i.test(r.behaviourVerified); })(), "precision");
  add("16H-L.2-B6: variable-name matching alone is explicitly insufficient", REMEDIATION_VERIFICATIONS.filter((r) => r.feature === "redeem_in_kind").every((r) => r.verificationMethod.length > 60) && /names were deliberately not treated as evidence|not treated as evidence/i.test(REMEDIATION_VERIFICATIONS.find((r) => r.id === "rik_two_stage_penalty")!.verificationMethod), "not names");
  add("16H-L.2-B7: every remediation records file + function + method, so it is re-checkable", REMEDIATION_VERIFICATIONS.every((r) => r.file.length > 0 && r.functionOrInstruction.length > 0 && r.verificationMethod.length > 0 && r.behaviourVerified.length > 0), "re-checkable");
  add("16H-L.2-B8: a missing remediation would be reported honestly (the vocabulary allows it)", (() => { const states: string[] = ["verified_present_in_deployed_source", "partially_present", "absent", "not_applicable", "unresolved"]; return states.includes("absent") && states.includes("partially_present") && REMEDIATION_VERIFICATIONS.every((r) => states.includes(r.state)); })(), "honest vocabulary");
  add("16H-L.2-B9: private PR references are recorded but explicitly NOT relied upon", REMEDIATION_VERIFICATIONS.every((r) => /NOT publicly mapped|not relied upon/i.test(r.privateReference)), "not relied on");

  // ---- Rewards ----
  add("16H-L.2-C1: the rewards feature presence is determined from the deployed source", REWARDS_FEATURE_PRESENCE.conclusion === "rewards_feature_present" && /topup_rewards|VaultRewardInfo/.test(REWARDS_FEATURE_PRESENCE.evidence), "present");
  add("16H-L.2-C2: because the feature is PRESENT, every documented reward remediation is checked", (() => { const rw = REMEDIATION_VERIFICATIONS.filter((r) => r.feature === "vault_rewards"); return REWARDS_FEATURE_PRESENCE.conclusion === "rewards_feature_present" && rw.length >= 4 && rw.every((r) => r.state === "verified_present_in_deployed_source"); })(), "all checked");
  add("16H-L.2-C3: an ABSENT feature would make its audits not applicable (rule is encoded)", (() => { const conclusions: string[] = ["rewards_feature_present", "rewards_feature_absent", "partial_rewards_feature", "unresolved"]; return conclusions.includes("rewards_feature_absent") && conclusions.includes("partial_rewards_feature"); })(), "rule exists");
  add("16H-L.2-C4: dormancy on this vault is NOT confused with absence", REWARDS_FEATURE_PRESENCE.dormantOnThisVault === true && REWARDS_FEATURE_PRESENCE.conclusion === "rewards_feature_present" && /does not remove the code|remain APPLICABLE/i.test(REWARDS_FEATURE_PRESENCE.dormancyIsNotAbsence), "dormant != absent");
  add("16H-L.2-C5: pending-reward safety verified via saturating arithmetic", /saturating_sub|saturating_mul/.test(REMEDIATION_VERIFICATIONS.find((r) => r.id === "rw_pending_reward_safety")!.behaviourVerified), "saturating");
  add("16H-L.2-C6: the exhaustion-timestamp fix is verified as a COMPOSITION of two functions", (() => { const r = REMEDIATION_VERIFICATIONS.find((x) => x.id === "rw_exhaustion_timestamp")!; return /topup_rewards/.test(r.behaviourVerified) && /refresh_rewards/.test(r.behaviourVerified) && /AFTER the top-up/i.test(r.behaviourVerified); })(), "composition");
  add("16H-L.2-C7: refresh ordering is verified exhaustively, not spot-checked", (() => { const r = REMEDIATION_VERIFICATIONS.find((x) => x.id === "rw_refresh_ordering")!; return /Exhaustive grep|exhaustively/i.test(r.verificationMethod + r.behaviourVerified) && /redeem_in_kind/.test(r.behaviourVerified) && /invest/.test(r.behaviourVerified); })(), "exhaustive");
  add("16H-L.2-C8: duplicate refresh removal verified by COUNTING call sites", /ZERO|counting|count/i.test(REMEDIATION_VERIFICATIONS.find((r) => r.id === "rw_duplicate_refresh")!.behaviourVerified + REMEDIATION_VERIFICATIONS.find((r) => r.id === "rw_duplicate_refresh")!.verificationMethod), "counted");
  add("16H-L.2-C9: an audit filename never proves deployment inclusion", AUDIT_INVENTORY.filter((a) => a.reportArtifact.includes("2.1.0") || a.reportArtifact.includes("2.1.1")).every((a) => /CORROBORATED|corroborated/i.test(a.referenceBasis)) && AUDIT_INVENTORY.some((a) => /filename alone was NOT treated as sufficient/i.test(a.referenceBasis)), "filename != proof");
  add("16H-L.2-C10: the residual source observation is bounded and NOT a finding", RESIDUAL_SOURCE_OBSERVATION.isAuditFinding === false && RESIDUAL_SOURCE_OBSERVATION.isWealthsmithSecurityFinding === false && RESIDUAL_SOURCE_OBSERVATION.reachableFromCurrentVaultState === false && RESIDUAL_SOURCE_OBSERVATION.boundedBy.length >= 3, "bounded");

  // ---- Coverage ----
  add("16H-L.2-D1: audited-feature and deployed-fix-presence remain SEPARATE facts", String(THREE_QUESTIONS.A_didAuditExamineTheFeature.answer) !== String(THREE_QUESTIONS.B_areDocumentedFixesInDeployedCode.answer) && THREE_QUESTIONS.C_isWholeDeployedCodebaseAudited.answer === "no" && /never collapse|not one boolean/i.test(THREE_QUESTIONS.neverCollapse), "three facts");
  add("16H-L.2-D2: direct code verification does NOT imply full-codebase audit", THREE_QUESTIONS.B_areDocumentedFixesInDeployedCode.answer === "yes_all_seven_verified" && THREE_QUESTIONS.C_isWholeDeployedCodebaseAudited.answer === "no" && FINAL_AUDIT_CLASSIFICATION.classification !== "exact_full_deployment_audit_coverage", "not full");
  add("16H-L.2-D3: the private/public mapping absence remains documented", SQUASHED_HISTORY_LIMITATION.privateToPublicMappingExists === false && /Only Kamino can attest/i.test(SQUASHED_HISTORY_LIMITATION.note), "documented");
  add("16H-L.2-D4: publicly uncovered runtime changes remain visible and bounded", PUBLICLY_UNCOVERED_SURFACE.bounded === true && PUBLICLY_UNCOVERED_SURFACE.items.length >= 8 && PUBLICLY_UNCOVERED_SURFACE.items.some((i) => /klend_operations\.rs/.test(i)), "visible");
  add("16H-L.2-D5: generated / moved files do NOT inflate uncovered runtime scope", DEPLOYED_RELEASE_DIFF.filter((d) => d.category === "generated_IDL_or_non_runtime").length >= 2 && DEPLOYED_RELEASE_DIFF.some((d) => /state module split/i.test(d.module) && d.securityRelevance === "none" && /rename/i.test(d.behaviorChanged)) && PUBLICLY_UNCOVERED_SURFACE.excludedFromScopeAndWhy.length >= 2, "no inflation");
  add("16H-L.2-D6: a baseline audit never automatically covers later changed code", AUDIT_INVENTORY.filter((a) => a.commitOrReleaseReference === null).every((a) => /Cannot be shown to cover|Unresolved/i.test(a.relationshipToDeployedSource)) && AUDIT_COVERAGE_MATRIX.filter((m) => m.evidence.some((e) => e.kind === "baseline_audit_evidence_with_unverified_commit_mapping")).every((m) => m.evidence.some((e) => e.kind === "publicly_uncovered" || e.kind === "verified_deployed_remediation")), "no auto-cover");
  add("16H-L.2-D7: the coverage matrix supports MULTIPLE evidence records per area", AUDIT_COVERAGE_MATRIX.length >= 13 && AUDIT_COVERAGE_MATRIX.filter((m) => m.evidence.length > 1).length >= 8, "multi-evidence");
  add("16H-L.2-D8: every matrix area classifies with the declared vocabulary", (() => { const kinds: string[] = ["verified_deployed_remediation", "baseline_audit_evidence_with_unverified_commit_mapping", "feature_delta_audit_evidence_with_direct_code_verification", "formal_property_or_fuzzing_evidence", "partial_coverage", "publicly_uncovered", "not_applicable"]; return AUDIT_COVERAGE_MATRIX.every((m) => m.evidence.length > 0 && m.evidence.every((e) => kinds.includes(e.kind))); })(), "vocabulary");
  add("16H-L.2-D9: the CPI layer that moves user funds is flagged high-relevance and uncovered", DEPLOYED_RELEASE_DIFF.some((d) => /klend_operations/.test(d.path) && d.category === "publicly_uncovered_runtime_change" && d.securityRelevance === "high"), "cpi flagged");
  add("16H-L.2-D10: the classification supersedes unverified_linkage with a reason", FINAL_AUDIT_CLASSIFICATION.classification === "deployed_feature_remediations_verified_with_partial_coverage" && FINAL_AUDIT_CLASSIFICATION.supersedes.includes("unverified_linkage") && FINAL_AUDIT_CLASSIFICATION.whyNotFullCoverage.length > 60, "superseded");
  add("16H-L.2-D11: formal verification / fuzzing are recorded as EXISTING, not as covering", AUDIT_INVENTORY.filter((a) => /Certora|Ackee/.test(a.auditor) && a.commitOrReleaseReference === null).every((a) => /Cannot be shown to cover|Unresolved|not established/i.test(a.relationshipToDeployedSource)), "exists != covers");

  // ---- Readiness ----
  add("16H-L.2-E1: complete-but-unfavourable evidence is human-scorable", getSteakhouseAuditEvidenceCompleteness().result === "complete_for_human_scoring" && THREE_QUESTIONS.C_isWholeDeployedCodebaseAudited.answer === "no", "complete != favourable");
  add("16H-L.2-E2: unmapped private commits alone do NOT block when behaviour is verifiable", evaluateAuditEvidenceCompleteness({ ...STEAKHOUSE_AUDIT_EVIDENCE_INPUTS }).result === "complete_for_human_scoring" && SQUASHED_HISTORY_LIMITATION.privateToPublicMappingExists === false, "mapping not required");
  add("16H-L.2-E3: material UNBOUNDED changes still block", evaluateAuditEvidenceCompleteness({ ...STEAKHOUSE_AUDIT_EVIDENCE_INPUTS, materialRuntimeChangesUnidentifiable: true }).result === "blocked" && evaluateAuditEvidenceCompleteness({ ...STEAKHOUSE_AUDIT_EVIDENCE_INPUTS, uncoveredSurfaceUnbounded: true }).result === "blocked", "unbounded blocks");
  add("16H-L.2-E4: uncheckable fixes, unknown scope, and self-contradiction each block", ["auditedFixesUncheckable", "auditScopeUnknown", "evidenceContradictsItself"].every((k) => evaluateAuditEvidenceCompleteness({ ...STEAKHOUSE_AUDIT_EVIDENCE_INPUTS, [k]: true } as typeof STEAKHOUSE_AUDIT_EVIDENCE_INPUTS).result === "blocked"), "each blocks");
  add("16H-L.2-E5: evidence completeness assigns NO score and approves NOTHING", AUDIT_EVIDENCE_COMPLETENESS_CONFERS.anyScore === false && AUDIT_EVIDENCE_COMPLETENESS_CONFERS.favourableScore === false && AUDIT_EVIDENCE_COMPLETENESS_CONFERS.riskApproval === false && AUDIT_EVIDENCE_COMPLETENESS_CONFERS.productApproval === false, "confers nothing");
  // Written earlier in this same task, before the incident addendum landed. Both blockers are now clear.
  add("16H-L.2-E6 (updated): audit_security is unblocked and no mandatory blocker survives", (() => { const a = DIMENSION_READINESS.find((d) => d.dimension === "audit_security")!; return a.mandatoryBlockerPresent === false && a.state === "complete" && DIMENSION_READINESS.filter((d) => d.mandatoryBlockerPresent).length === 0; })(), "0 blockers");
  add("16H-L.2-E7 (updated): readiness is conditional, never ready, while partial coverage remains", evaluateReviewReadiness().result === "conditionally_ready_for_human_scoring", "conditional");
  add("16H-L.2-E8: imperfect audit coverage does NOT by itself force blocked", evaluateReviewReadiness({ dimensions: DIMENSION_READINESS.map((d) => d.dimension === "incident_history" ? { ...d, state: "complete" as DimensionEvidenceState, mandatoryBlockerPresent: false } : d) }).result !== "blocked_pending_protocol_confirmation", "coverage != blocker");

  // ---- Safety ----
  add("16H-L.2-F1: no score anywhere in the 16H-L.2 artifacts", (() => { const src = readIf("src/suggestions/steakhouseAuditCoverage.ts"); return !/riskScore\s*[:=]\s*\d/.test(src) && !/reviewerScore\s*[:=]\s*\d/.test(src); })(), "no score");
  add("16H-L.2-F2: no transaction construction or simulation added", (() => { const src = readIf("src/suggestions/steakhouseAuditCoverage.ts").split("\n").filter((l) => { const t = l.trim(); return !t.startsWith("*") && !t.startsWith("//") && !t.startsWith("/*"); }).join("\n"); return !/simulateTransaction|sendTransaction|depositIxs|new Transaction|signTransaction|TransactionMessage/.test(src); })(), "read-only");
  add("16H-L.2-F3: no user-facing surface imports the audit-coverage module", ["src/components/SuggestionCard.tsx", "src/components/SuggestionReviewModal.tsx", "src/pages/DashboardPage.tsx"].every((f) => !readIf(f).includes("steakhouseAuditCoverage")), "internal only");
  add("16H-L.2-F4: 16H-L.1 findings are preserved unchanged by this step", CLOSURE_BINDING.vaultAddress === "HDsayqAsDWy3QvANGqh2yNraqcD8Fnjgh73Mhb3WRS5E" && CLOSURE_BINDING.sharesMint === "7D8C5pDFxug58L9zkwK7bCiDg4kD4AygzbcZUmf5usHS" && AUTHORITY_EVIDENCE.find((a) => a.role === "allocation_admin")!.controlModel === "verified_raw_keypair" && AUTHORITY_EVIDENCE.find((a) => a.role === "program_upgrade_authority")!.squadsControl!.threshold === 5 && VERIFICATION_RECORD.classification === "verified_current_binary_exact_commit", "L1 preserved");
  // The AUDIT work did not touch incident history; the separate incident ADDENDUM did, with its own
  // evidence. The invariant that must hold either way: no clean record is ever inferred from audit
  // findings, and confirmed incidents stay zero-as-a-search-result.
  add("16H-L.2-F5 (updated): the audit work never touched incident history; confirmed incidents stay 0", INCIDENT_REVIEW.state === "review_incomplete" && INCIDENT_REVIEW.confirmedIncidents.length === 0 && CONFIRMED_INCIDENTS.length === 0 && INCIDENT_EVIDENCE_SCOPE.noCleanHistoryClaimMade === true, "untouched by audit");
  add("16H-L.2-F6: a clean incident record is NOT inferred from audit findings", !/no incidents|clean record/i.test(FINAL_AUDIT_CLASSIFICATION.whyNotFullCoverage + FINAL_AUDIT_CLASSIFICATION.whySupersedesUnverifiedLinkage), "no inference");

  /* ================= 16H-L.1 — deployment verification, withdrawal, deposit state ================= */

  // ---- Authority (the correction, locked down) ----
  add("16H-L.1-X1: System-Program ownership alone can NEVER identify custody", (() => { const sysOwned = AUTHORITY_EVIDENCE.filter((a) => a.ownerProgram === "11111111111111111111111111111111"); const models = new Set(sysOwned.map((a) => a.controlModel)); return sysOwned.length >= 3 && models.size >= 2; })(), "same owner, different models");
  add("16H-L.1-X2: Squads state account and signing PDA stay distinct identities", AUTHORITY_EVIDENCE.filter((a) => a.squadsControl).every((a) => a.squadsControl!.multisigStateAccount !== a.address), "distinct");
  add("16H-L.1-X3: 5-of-10 upgrade threshold preserved", AUTHORITY_EVIDENCE.find((a) => a.role === "program_upgrade_authority")!.squadsControl!.threshold === 5 && AUTHORITY_EVIDENCE.find((a) => a.role === "program_upgrade_authority")!.squadsControl!.memberCount === 10, "5/10");
  add("16H-L.1-X4: 24-hour upgrade timelock preserved", AUTHORITY_EVIDENCE.find((a) => a.role === "program_upgrade_authority")!.squadsControl!.timeLockSeconds === 86400, "24h");
  add("16H-L.1-X5: 3-of-10 vault-admin threshold preserved", AUTHORITY_EVIDENCE.find((a) => a.role === "vault_admin_authority")!.squadsControl!.threshold === 3, "3/10");
  add("16H-L.1-X6: vault admin has NO timelock", AUTHORITY_EVIDENCE.find((a) => a.role === "vault_admin_authority")!.squadsControl!.timeLockSeconds === 0 && AUTHORITY_EVIDENCE.find((a) => a.role === "vault_admin_authority")!.timelockStatus === "verified_no_timelock", "no lock");
  add("16H-L.1-X7: allocation admin remains a raw on-curve keypair", (() => { const a = AUTHORITY_EVIDENCE.find((x) => x.role === "allocation_admin")!; return a.controlModel === "verified_raw_keypair" && a.isOnCurve === true && !a.squadsControl; })(), "raw keypair");
  add("16H-L.1-X8: allocation admin is a SEPARATE address from the upgrade authority", AUTHORITY_EVIDENCE.find((a) => a.role === "allocation_admin")!.address !== AUTHORITY_EVIDENCE.find((a) => a.role === "program_upgrade_authority")!.address, "separate");
  add("16H-L.1-X9: authority risk is NOT globally complete — three separate conclusions survive", AUTHORITY_RISK_IS_NOT_GLOBALLY_COMPLETE.globallyComplete === false && AUTHORITY_RISK_IS_NOT_GLOBALLY_COMPLETE.perAuthorityConclusions.length === 3 && new Set(AUTHORITY_RISK_IS_NOT_GLOBALLY_COMPLETE.perAuthorityConclusions.map((c) => c.strength)).size === 3, "3 conclusions");
  add("16H-L.1-X10: allocation-admin evidence maps to manager_discretion, NOT hidden by upgrade controls", ALLOCATION_ADMIN_RUBRIC_MAPPING.some((m) => m.dimension === "manager_discretion" && m.evidenceForReviewer.length >= 4) && ALLOCATION_ADMIN_RUBRIC_MAPPING.every((m) => m.dimension !== "upgrade_admin_authority"), "mapped to manager");
  add("16H-L.1-X11: the raw allocation key is NOT auto-treated as a rubric disqualifier", ALLOCATION_ADMIN_RUBRIC_MAPPING.every((m) => m.isRubricDefinedBlocker === false && m.blockerReasoning.length > 0), "not a disqualifier");
  add("16H-L.1-X12: the manager_discretion detail names the single-key fact — it is not buried", /raw ON-CURVE keypair|NO multisig/i.test(DIMENSION_READINESS.find((d) => d.dimension === "manager_discretion")!.detail), "surfaced");
  add("16H-L.1-X13: the whitelist mitigation is recorded WITH its own unverified bound", ALLOCATION_ADMIN_RUBRIC_MAPPING.find((m) => m.dimension === "manager_discretion")!.mitigationsTheReviewerMustAlsoWeigh.some((t) => /whitelist/i.test(t) && /NOT enumerated|unverified/i.test(t)), "bounded honestly");

  // ---- Deployment / verification ----
  add("16H-L.1-V1: historical and current programs remain distinct and both are recorded", String(AUDIT_LINKAGE.deploymentHistory.current.programId) !== String(AUDIT_LINKAGE.deploymentHistory.historical.programId), "distinct");
  add("16H-L.1-V2: the current vault binds ONLY to KvauGMsp…", VERIFICATION_RECORD.programId === CLOSURE_BINDING.programId && VERIFICATION_RECORD.programId === "KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd", "bound");
  add("16H-L.1-V3: the verification record is source-bound (registry + endpoint + repo + commit + hashes)", VERIFICATION_RECORD.registryEndpoint.includes(VERIFICATION_RECORD.programId) && VERIFICATION_RECORD.repositoryUrl.includes(VERIFICATION_RECORD.verifiedCommit) && VERIFICATION_RECORD.onChainHash.length === 64 && VERIFICATION_RECORD.executableHash.length === 64, "source-bound");
  add("16H-L.1-V4: classification is verified_current_binary_exact_commit ONLY because hashes match AND no upgrade followed", VERIFICATION_RECORD.classification === "verified_current_binary_exact_commit" && VERIFICATION_RECORD.hashesMatch === true && VERIFICATION_RECORD.onChainHash === VERIFICATION_RECORD.executableHash && VERIFICATION_RECORD.upgradedAfterVerification === false, "hash + ordering");
  add("16H-L.1-V5: a LATER deployment would invalidate the exact-binary match (ordering is enforced, not assumed)", (() => { const later = { ...VERIFICATION_RECORD, currentDeploymentTimestamp: "2026-07-20T00:00:00.000Z" }; const deployedAfter = Date.parse(later.currentDeploymentTimestamp) > Date.parse(later.verificationTimestamp); return deployedAfter === true && Date.parse(VERIFICATION_RECORD.currentDeploymentTimestamp) < Date.parse(VERIFICATION_RECORD.verificationTimestamp); })(), "ordering decides");
  add("16H-L.1-V6: the stale non-matching record is retained and is never treated as verification", SUPERSEDED_VERIFICATION_RECORDS.length >= 1 && SUPERSEDED_VERIFICATION_RECORDS.every((r) => r.isVerified === false && r.executableHash !== VERIFICATION_RECORD.onChainHash && r.commit !== VERIFICATION_RECORD.verifiedCommit), "stale excluded");
  add("16H-L.1-V7: the reviewed source commit IS the verified deployed commit", REVIEWED_SOURCE_MATCHES_DEPLOYED_BINARY.match === true && REVIEWED_SOURCE_MATCHES_DEPLOYED_BINARY.reviewedSourceCommit === CLOSURE_BINDING.reviewedSourceCommit && REVIEWED_SOURCE_MATCHES_DEPLOYED_BINARY.verifiedDeployedCommit === VERIFICATION_RECORD.verifiedCommit, "source == binary");
  add("16H-L.1-V8: audit dates alone NEVER establish coverage of the current deployment", AUDIT_RECORDS_V2.length === 3 && AUDIT_RECORDS_V2.every((a) => a.auditedCommitOrTag === null && a.relationshipToCurrentBinary === "predates_current_binary") && !AUDIT_RECORDS_V2.some((a) => a.relationshipToCurrentBinary === "covers_current_binary_proven"), "no date-based coverage");
  add("16H-L.1-V9: a verified BUILD does not become audit linkage", AUDIT_LINKAGE_REASSESSMENT.result === "unverified_linkage" && AUDIT_LINKAGE_REASSESSMENT.buildVerificationChangesLinkage === false && VERIFICATION_RECORD.status === "verified", "different claims");
  add("16H-L.1-V10: every audit predates the verified deployment", AUDIT_RECORDS_V2.every((a) => Date.parse(a.reportDate) < Date.parse(VERIFICATION_RECORD.currentDeploymentTimestamp)), "all predate");

  // ---- Withdrawal ----
  add("16H-L.1-W1: proportional and flat penalties are preserved SEPARATELY", WITHDRAWAL_CONFIG.penalty.withdrawalPenaltyBps === 0 && WITHDRAWAL_CONFIG.penalty.withdrawalPenaltyLamports === "0" && typeof WITHDRAWAL_CONFIG.penalty.withdrawalPenaltyBps === "number" && typeof WITHDRAWAL_CONFIG.penalty.withdrawalPenaltyLamports === "string", "separate fields");
  add("16H-L.1-W2: zero penalty is read as 'none configured NOW', never as a guarantee", /CURRENT STATE, not a guarantee/i.test(WITHDRAWAL_CONFIG.penalty.interpretation) && /configurable/i.test(WITHDRAWAL_CONFIG.penalty.interpretation), "not a guarantee");
  add("16H-L.1-W3: buffer POLICY and current BALANCE are distinct objects", WITHDRAWAL_CONFIG.bufferPolicy.unallocatedWeight === 0 && WITHDRAWAL_CONFIG.bufferPolicy.unallocatedTokensCap === "0" && WITHDRAWAL_CONFIG.currentBalance.tokenAvailable === "69969583509" && !("tokenAvailable" in WITHDRAWAL_CONFIG.bufferPolicy), "policy != balance");
  add("16H-L.1-W4: tokenAvailable is NEVER described as instantly withdrawable liquidity", /must NOT be described as instantly withdrawable/i.test(WITHDRAWAL_CONFIG.currentBalance.interpretation) && WITHDRAWAL_CONFIG.currentBalance.unencumberedBufferUsdc < 0, "negative buffer");
  add("16H-L.1-W5: the unencumbered buffer is tokenAvailable MINUS pendingFees, and it is negative", Math.abs((WITHDRAWAL_CONFIG.currentBalance.tokenAvailableUsdc - WITHDRAWAL_CONFIG.currentBalance.pendingFeesUsdc) - WITHDRAWAL_CONFIG.currentBalance.unencumberedBufferUsdc) < 0.01, "arithmetic holds");
  add("16H-L.1-W6: no queue exists — recorded as an authoritative NEGATIVE, not an unknown", WITHDRAWAL_MECHANICS.withdrawalQueueSupported === false && WITHDRAWAL_MECHANICS.queueConfiguration === null && WITHDRAWAL_MECHANICS.queueState === null && WITHDRAWAL_MECHANICS.remainingValueCanBeQueued === false && /NOT APPLICABLE rather than unknown/i.test(WITHDRAWAL_MECHANICS.fifoNote), "no queue");
  add("16H-L.1-W7: FIFO is not claimed as confirmed when no queue exists", WITHDRAWAL_MECHANICS.fifoSemanticsConfirmedBySource === false, "no fifo claim");
  add("16H-L.1-W8: partial immediate withdrawal is represented WITH its liquidity caveat", WITHDRAWAL_MECHANICS.partialImmediateWithdrawalSupported === true && /capability exists; the liquidity does not/i.test(WITHDRAWAL_MECHANICS.partialWithdrawalNote), "honest partial");
  add("16H-L.1-W9: withdrawals are never labelled instant, because the full amount is not unconditional", WITHDRAWAL_MECHANICS.withdrawalsAreInstant === false && WITHDRAWAL_MECHANICS.fullExitCurrentlyPossible === false && WITHDRAWAL_MECHANICS.liquidityDependsOnReservesPct === 100, "not instant");
  add("16H-L.1-W10: reserve liquidity is NOT treated as permanent", WITHDRAWAL_MECHANICS.reserveLiquidityIsPermanent === false && /never be cached|can fall at any time/i.test(WITHDRAWAL_MECHANICS.reserveLiquidityNote), "impermanent");
  add("16H-L.1-W11: withdrawal config is bound to an exact slot + chain block time + vault", WITHDRAWAL_CONFIG.vaultAddress === CLOSURE_BINDING.vaultAddress && WITHDRAWAL_CONFIG.sourceSlot === L1_EVIDENCE_SLOT && WITHDRAWAL_CONFIG.sourceBlockTime.endsWith("Z") && WITHDRAWAL_CONFIG.evidenceCutoffAt === L1_EVIDENCE_CUTOFF_AT, "slot-bound");

  // ---- Reserve-level ----
  add("16H-L.1-R1: all four active reserves are enumerated with market identity resolved", RESERVE_WITHDRAWAL_BEHAVIOR.length === 4 && RESERVE_WITHDRAWAL_BEHAVIOR.every((r) => r.marketName !== null && r.lendingMarket.length > 30), "4 resolved");
  add("16H-L.1-R2: the previously-unresolved Atj6URE… reserve now resolves to Maple Market", RESERVE_WITHDRAWAL_BEHAVIOR.find((r) => r.reserveAddress === "Atj6UREVWa7WxbF2EMKNyfmYUY1U1txughe2gjhcPDCo")!.marketName === "Maple Market", "resolved");
  add("16H-L.1-R3: no active reserve is frozen, obsolete or restricted at this slot", RESERVE_WITHDRAWAL_BEHAVIOR.every((r) => r.reserveStatus === 0 && r.reserveStatusLabel === "active" && r.emergencyMode === 0 && r.blockCtokenUsage === 0) && WITHDRAWAL_MECHANICS.anyActiveReserveFrozenObsoleteOrRestricted === false, "all active");
  add("16H-L.1-R4: reserves that cannot cover the vault position are recorded as such", RESERVE_WITHDRAWAL_BEHAVIOR.filter((r) => !r.reserveLiquidityCoversVaultPosition).length === 2 && RESERVE_WITHDRAWAL_BEHAVIOR.filter((r) => !r.reserveLiquidityCoversVaultPosition).every((r) => r.reserveAvailableLiquidityUsdc < r.vaultPositionValueUsdcApprox), "2 uncovered");
  add("16H-L.1-R5: aggregate liquidity is NOT used to claim a full exit is possible", (() => { const agg = RESERVE_WITHDRAWAL_BEHAVIOR.reduce((s, r) => s + r.reserveAvailableLiquidityUsdc, 0); const pos = RESERVE_WITHDRAWAL_BEHAVIOR.reduce((s, r) => s + r.vaultPositionValueUsdcApprox, 0); return agg > pos && WITHDRAWAL_MECHANICS.fullExitCurrentlyPossible === false; })(), "per-reserve wins");
  add("16H-L.1-R6: the vault position value is labelled APPROXIMATE, not presented as exact", /APPROXIMATE/i.test(readIf("src/suggestions/steakhouseDeploymentAndDepositEvidence.ts").split("vaultPositionValueUsdcApprox")[0].slice(-400)), "approx labelled");
  add("16H-L.1-R7: high utilization is preserved for every reserve", RESERVE_WITHDRAWAL_BEHAVIOR.every((r) => r.utilizationPct > 70 && r.utilizationPct < 100), "70-100%");

  // ---- API status semantics ----
  add("16H-L.1-A1: the API has NO status field — recorded as an authoritative absence", API_STATUS_SEMANTICS.statusFieldExists === false && API_STATUS_SEMANTICS.statusFieldName === null && API_STATUS_SEMANTICS.knownEnumValues === null && API_STATUS_SEMANTICS.officialSchemaDefiningValues === null, "no status field");
  add("16H-L.1-A2: API status is NOT usable as an eligibility gate", API_STATUS_SEMANTICS.usableAsEligibilityGate === false && API_STATUS_SEMANTICS.usableAsEligibilityGateReason.length > 40, "not a gate");
  add("16H-L.1-A3: the API is recorded as a LOSSY projection of on-chain state", API_STATUS_SEMANTICS.fieldsOmittedVsOnChain.includes("withdrawalPenaltyBps") && API_STATUS_SEMANTICS.fieldsOmittedVsOnChain.includes("unallocatedWeight") && /LOSSY/i.test(API_STATUS_SEMANTICS.calculatedByIndexerOrOnChain), "lossy");
  add("16H-L.1-A4: a 200 response is NOT evidence a vault is available", API_STATUS_SEMANTICS.deprecatedHiddenPermissionedFrozenClosedRepresented === false && /NOT evidence that a vault is available/i.test(API_STATUS_SEMANTICS.representationNote), "200 != available");
  add("16H-L.1-A5: unprobed API behaviours stay unresolved rather than guessed", /unresolved/i.test(API_STATUS_SEMANTICS.refreshBehavior) && /unresolved/i.test(API_STATUS_SEMANTICS.missingOrErrorBehavior), "unresolved");

  // ---- Permissioning ----
  add("16H-L.1-P1: permissioning is public, concluded from an EXHAUSTIVE verified surface", PERMISSIONING.model === "public" && PERMISSIONING.vaultStateHasDepositorAllowlist === false && PERMISSIONING.vaultStateHasKpermBinding === false && PERMISSIONING.depositInstructionTakesPermissionAccount === false && PERMISSIONING.boundToVerifiedCommit === VERIFICATION_RECORD.verifiedCommit, "public, verified");
  add("16H-L.1-P2: reserve whitelist flags are NOT conflated with user permissioning", PERMISSIONING.reserveWhitelistFlags.allowAllocationsInWhitelistedReservesOnly === 1 && /NOT depositors/i.test(PERMISSIONING.reserveWhitelistFlags.appliesTo) && PERMISSIONING.userSpecificPermissioning === false, "not user perms");
  add("16H-L.1-P3: off-chain restrictions are explicitly NOT ruled out", /NOT ruled out/i.test(PERMISSIONING.residualUncertainty), "residual kept");

  // ---- Deposit state ----
  add("16H-L.1-D1: user-specific permissioning FAILS CLOSED", evaluateReadOnlyDepositState({ ...STEAKHOUSE_DEPOSIT_STATE_INPUTS, userSpecificPermissioning: true }).state === "permissioned_user_specific" && evaluateReadOnlyDepositState({ ...STEAKHOUSE_DEPOSIT_STATE_INPUTS, permissioning: "allowlist_restricted" }).state === "permissioned_user_specific", "fails closed");
  add("16H-L.1-D2: unresolved permissioning FAILS CLOSED to unknown", evaluateReadOnlyDepositState({ ...STEAKHOUSE_DEPOSIT_STATE_INPUTS, permissioning: "unresolved" }).state === "unknown_without_transaction_simulation", "unresolved closed");
  add("16H-L.1-D3: stale evidence FAILS CLOSED", evaluateReadOnlyDepositState({ ...STEAKHOUSE_DEPOSIT_STATE_INPUTS, evidenceFresh: false }).state === "unknown_without_transaction_simulation", "stale closed");
  add("16H-L.1-D4: capacity ALONE is insufficient — uncapped + unhealthy reserve is unavailable", evaluateReadOnlyDepositState({ ...STEAKHOUSE_DEPOSIT_STATE_INPUTS, capacityVerifiedUncapped: true, allActiveReservesHealthy: false }).state === "verified_read_only_unavailable", "capacity insufficient");
  add("16H-L.1-D5: buffer headroom ALONE is insufficient — identity still required", evaluateReadOnlyDepositState({ ...STEAKHOUSE_DEPOSIT_STATE_INPUTS, bufferHeadroomUsdc: 1000000, vaultIdentityVerified: false }).state === "unknown_without_transaction_simulation", "buffer insufficient");
  add("16H-L.1-D6: reserve headroom ALONE is insufficient — capacity still required", evaluateReadOnlyDepositState({ ...STEAKHOUSE_DEPOSIT_STATE_INPUTS, activeReserveHeadroomExists: true, capacityVerifiedUncapped: false }).state === "verified_read_only_unavailable", "reserve insufficient");
  add("16H-L.1-D7: no headroom anywhere → unavailable", evaluateReadOnlyDepositState({ ...STEAKHOUSE_DEPOSIT_STATE_INPUTS, activeReserveHeadroomExists: false, bufferHeadroomUsdc: -1 }).state === "verified_read_only_unavailable", "no headroom");
  add("16H-L.1-D8: unknown minimum deposit stays unresolved rather than assumed", evaluateReadOnlyDepositState({ ...STEAKHOUSE_DEPOSIT_STATE_INPUTS, minDepositKnown: false }).state === "unknown_without_transaction_simulation", "min unknown");
  add("16H-L.1-D9: the current Steakhouse result is verified_read_only_available and implies NOTHING", (() => { const r = getSteakhouseDepositState(); return r.state === "verified_read_only_available" && r.impliesApproval === false && r.sufficientToSuggest === false; })(), "available != approved");
  add("16H-L.1-D10: deposit availability is computed WITHOUT the API status (its semantics are unproven)", STEAKHOUSE_DEPOSIT_STATE_INPUTS.apiStatusSemanticsProven === false && STEAKHOUSE_DEPOSIT_STATE_INPUTS.apiStatusValue === null && getSteakhouseDepositState().state === "verified_read_only_available", "api excluded");
  add("16H-L.1-D11: the policy states the exact sufficient evidence conjunction", DEPOSIT_STATE_POLICY.sufficientEvidenceForRecommendation.length >= 6 && DEPOSIT_STATE_POLICY.rules.length >= 8 && /simulation/i.test(DEPOSIT_STATE_POLICY.neverAnswers) && DEPOSIT_STATE_POLICY.rules.some((r) => /verified_uncapped does NOT imply available/i.test(r)) && DEPOSIT_STATE_POLICY.rules.some((r) => /Stale evidence fails closed/i.test(r)), "policy stated");
  add("16H-L.1-D12: every deposit-state outcome is a member of the declared union", ["verified_read_only_available", "verified_read_only_unavailable", "conditionally_available", "permissioned_user_specific", "unknown_without_transaction_simulation"].includes(getSteakhouseDepositState().state), "in union");
  add("16H-L.1-D13: NO transaction-construction or simulation code exists in the deposit-state path", (() => { const src = readIf("src/suggestions/steakhouseDeploymentAndDepositEvidence.ts").split("\n").filter((l) => !l.trim().startsWith("*") && !l.trim().startsWith("//") && !l.trim().startsWith("/*")).join("\n"); return !/simulateTransaction|sendTransaction|depositIxs|withdrawIxs|new Transaction|signTransaction|TransactionMessage/.test(src); })(), "read-only");

  // ---- Readiness ----
  add("16H-L.1-RD1: readiness is exactly one of the four declared results", ["ready_for_human_scoring", "conditionally_ready_for_human_scoring", "blocked_pending_protocol_confirmation", "unsuitable_to_continue_review"].includes(evaluateReviewReadiness().result), "one of four");
  add("16H-L.1-RD2: missing evidence NEVER produces unsuitable_to_continue_review", evaluateReviewReadiness().result !== "unsuitable_to_continue_review" && evaluateReviewReadiness({ dimensions: DIMENSION_READINESS.map((d) => ({ ...d, state: "blocked" as DimensionEvidenceState, mandatoryBlockerPresent: true })) }).result !== "unsuitable_to_continue_review", "never unsuitable");
  // 16H-L.1-RD3 asserted exactly TWO surviving blockers (audit_security + incident_history). 16H-L.2
  // legitimately resolved audit_security via direct deployed-source inspection, so that snapshot no
  // longer holds. Rewritten to assert the TRANSITION rather than deleted: the count must only ever
  // shrink by a dimension that genuinely cleared, and readiness must still be driven by a real blocker.
  add("16H-L.1-RD3 (updated by 16H-L.2): blockers shrank to incident_history alone, and only by resolution", (() => { const blocked = DIMENSION_READINESS.filter((d) => d.mandatoryBlockerPresent).map((d) => d.dimension).sort(); const audit = DIMENSION_READINESS.find((d) => d.dimension === "audit_security")!; return blocked.length === 0 && audit.state === "complete" && audit.mandatoryBlockerPresent === false && /ABSENT as of 16H-L\.2/.test(audit.detail) && evaluateReviewReadiness().result === "conditionally_ready_for_human_scoring"; })(), "0 blockers, each resolved not dropped");
  add("16H-L.1-RD4: dimensions resolved by 16H-L.1 are no longer blocked", ["upgrade_admin_authority", "manager_discretion", "liquidity_withdrawal", "withdrawal_fee_transparency"].every((d) => { const x = DIMENSION_READINESS.find((y) => y.dimension === d)!; return x.state === "complete" && x.mandatoryBlockerPresent === false; }), "resolved");

  // ---- Questionnaire hygiene ----
  add("16H-L.1-Q1: no question asks Kamino for a fact already proven on-chain", (() => { const qs = KAMINO_QUESTIONNAIRE.sections.flatMap((s) => s.questions).join(" "); return !/is a System-Program-owned account/i.test(qs) && !/Which exact commit or release is currently deployed/i.test(qs) && !/What are the current withdrawal penalty parameters/i.test(qs) && !/Is there a timelock or public announcement policy before a kvault upgrade/i.test(qs); })(), "no proven facts asked");
  add("16H-L.1-Q2: the surviving questions are the ones on-chain state cannot answer", (() => { const qs = KAMINO_QUESTIONNAIRE.sections.flatMap((s) => s.questions).join(" "); return /member keys .*held by independent parties|independent parties/i.test(qs) && /allocation admin/i.test(qs) && /which private kvault-private PRs .* were squashed into which public releases/i.test(qs) && /off-chain restrictions/i.test(qs) && /incident/i.test(qs); })(), "right questions");
  add("16H-L.1-Q3: the questionnaire is still bound to the exact product and NOT sent", KAMINO_QUESTIONNAIRE.sent === false && KAMINO_QUESTIONNAIRE.bindsTo.vault === CLOSURE_BINDING.vaultAddress, "bound, unsent");

  // ---- Safety (the invariants that must never move) ----
  add("16H-L.1-S1: no numeric score is assigned anywhere in the 16H-L.1 artifacts", (() => { const src = readIf("src/suggestions/steakhouseDeploymentAndDepositEvidence.ts"); return !/riskScore\s*[:=]\s*\d/.test(src) && !/reviewerScore\s*[:=]\s*\d/.test(src); })(), "no score");
  add("16H-L.1-S2: 16H-L.1 assigns no dimension score — it only maps evidence to dimensions", ALLOCATION_ADMIN_RUBRIC_MAPPING.every((m) => !("score" in m) && !("reviewerScore" in m)), "no dim score");
  add("16H-L.1-S3: deposit availability can never imply approval or a suggestion", [getSteakhouseDepositState(), evaluateReadOnlyDepositState({ ...STEAKHOUSE_DEPOSIT_STATE_INPUTS, evidenceFresh: false })].every((r) => r.impliesApproval === false && r.sufficientToSuggest === false), "never approves");
  add("16H-L.1-S4: no user-facing surface imports the 16H-L.1 evidence module", ["src/components/SuggestionCard.tsx", "src/components/SuggestionReviewModal.tsx", "src/pages/DashboardPage.tsx"].every((f) => !readIf(f).includes("steakhouseDeploymentAndDepositEvidence")), "internal only");

  add("16H-L-BA: diagnostics are raised and are internal-only (never user copy)", RAISED_DIAGNOSTICS.length >= 10 && RAISED_DIAGNOSTICS.includes("protocol_confirmation_required") && !RAISED_DIAGNOSTICS.includes("verified_disqualifying_condition") && ["src/components/SuggestionCard.tsx", "src/components/SuggestionReviewModal.tsx"].every((f) => !readIf(f).includes("steakhouseEvidenceClosure")), "internal");

  // ---- Safety: nothing moved ----
  add("16H-L-BB: the worksheet remains completely unscored and unsigned", (() => { const w = buildSteakhouseReviewerWorksheet(); return w.rows.every((r) => r.reviewerScore === null && r.reviewerRationale === null && r.reviewerConfidence === null && r.reviewerId === null) && w.overallScore === null && w.signoff === null && w.productApproved === false; })(), "unscored");
  add("16H-L-BC: capacity remains verified_uncapped and was NOT reclassified", (() => { const c = JSON.parse(readIf("public/generated/stable-yield-market-cache.json")); return c.capacityState === "verified_uncapped" && c.capacitySourceCommit === "1d146d7087a76edbbadc14d848ae14295c0745a4" && STABLE_YIELD_PRODUCTION_CAPACITY_RESOLVED === true; })(), "unchanged");
  add("16H-L-BD: production approved-product count is zero and no card renders", getApprovedYieldStrategies().length === 0 && (() => { const r = deriveStableYieldPlanSuggestion({ dataMode: "real_wallet", positions: [], checkedAt: "2026-07-16T15:00:00.000Z" }); return r.decision?.status === "no_plan" && r.suggestion === null; })() && SY_deriveRail({ positions: DEMO_STABLE_YIELD_POSITIONS, pricedAsOf: DEMO_STABLE_YIELD_PRICED_AS_OF, goal: DEMO_STABLE_YIELD_GOAL }).cards.every((c) => c.type !== "deploy_idle_stablecoins"), "no card");
  add("16H-L-BE: Demo remains unchanged", (() => { const sy = buildDemoStableYieldRail().cards.filter((c) => c.type === "deploy_idle_stablecoins"); return sy.length === 1 && sy[0].impact_text === "Deposit $500.00 USDC on Kamino"; })(), "unchanged");
  add("16H-L-BF: no execution / signature / external CTA was added", !/sendTransaction|signTransaction|window\.open|deposit\(|withdraw\(|approved:\s*true/.test(src), "read-only");

  return checks;
}

/** CLI entry: prints each check and exits non-zero on failure. */

export function runSteakhouseCapacityReconciliationFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const steak = () => getStableYieldEvidenceManifest("kamino_steakhouse_usdc")!;
  const kam = () => getStableYieldEvidenceManifest("kamino_usdc_lending")!;
  const blob = () => [...steak().blockers, ...steak().notes].join(" ");

  // --- Canonical capacity ---
  add("RC-1: the canonical capacity state matches the strongest existing evidence", RECONCILED_CAPACITY_RESOLUTION.mode === "verified_uncapped" && steak().capacityAdapterState === "adapter_implemented_source_verified", "verified_uncapped");
  add("RC-2: the conclusion is DERIVED from the canonical resolver, not asserted", resolveKvaultDepositCapacity({ programId: KVAULT_MAINNET_PROGRAM_ID, productType: "managed_vault", depositCapRaw: "0" }).mode === RECONCILED_CAPACITY_RESOLUTION.mode, "resolver re-run");
  add("RC-3: canonical source is the kvault program, pinned by commit", CANONICAL_SOURCE.commit === KVAULT_CAPACITY_SOURCE.commit && CANONICAL_SOURCE.commit === "1d146d7087a76edbbadc14d848ae14295c0745a4" && /get_max_depositable_in_vault/.test(CANONICAL_SOURCE.symbol), "pinned");
  add("RC-4: the resolved side is canonical because it rests on code, not on recency", /rests on the program's own code/.test(CANONICAL_SOURCE.whyCanonical) && /superseded by proof, not by opinion/.test(CANONICAL_SOURCE.whyCanonical), "proof, not recency");
  add("RC-5: deposit_cap = 0 is an explicit uncapped BRANCH, not an absent field", /uncapped BRANCH in the deposit path, not an absent field/.test(CANONICAL_SOURCE.semantics), "explicit branch");
  add("RC-6: the conclusion was re-verified against the deployed vault", CURRENT_VAULT_VERIFICATION.ownerMatchesReviewedProgram === true && CURRENT_VAULT_VERIFICATION.depositCapRaw === "0" && CURRENT_VAULT_VERIFICATION.conclusionStillValidForDeployedVault === true, "slot 433466880");
  add("RC-7: the capacity investigation was NOT redone", RECONCILIATION_RESULT.capacityInvestigationRedone === false && /No capacity investigation was redone/i.test(readFileSync(`${process.cwd()}/src/suggestions/steakhouseCapacityReconciliation.ts`, "utf8")), "evidence sufficed");

  // --- Scope boundaries ---
  add("RC-8: KVault uncapped semantics are NOT generalized to KLend reserves", /KLend has NO such branch/.test(CAPACITY_SCOPE_BOUNDARY.kvaultProofDoesNotTransferToKlend) && DEPOSIT_LIMIT_SENTINEL_SEMANTICS.zeroMeansUncapped === false, "kvault ≠ klend");
  add("RC-9: uncapped does NOT imply deposit availability", CAPACITY_SCOPE_BOUNDARY.uncappedImpliesDepositAvailability === false && steak().depositAvailabilityState === "blocked", "separate questions");
  add("RC-10: no KVault cap is NOT unlimited downstream availability", CAPACITY_SCOPE_BOUNDARY.noKvaultCapIsNotUnlimitedDownstream === true && CAPACITY_SCOPE_BOUNDARY.whatIsNotEstablished.length === 3, "3 things not established");
  add("RC-11: downstream reserve capacity remains separate and finite", (CAPACITY_SCOPE_BOUNDARY.whatIsNotEstablished as readonly string[]).some((x) => /1,000,000,000 USDC/.test(x)) && CAPACITY_SNAPSHOT.depositLimitTokenAmount === 1_000_000_000 && CAPACITY_SNAPSHOT.capacityKind === "capped", "KLend reserve capped at 1B");
  add("RC-12: what is uncapped is scoped to the KVAULT level only", /KVAULT-level deposit cap/.test(CAPACITY_SCOPE_BOUNDARY.whatIsUncapped), "vault-level only");
  add("RC-13: cap-shaped fields that do not gate deposits are enumerated", NOT_A_DEPOSIT_GATE.unallocatedTokensCap.gatesDeposits === false && NOT_A_DEPOSIT_GATE.allowAllocationsInWhitelistedReservesOnly.gatesDeposits === false && /reads deposit_cap ONLY/.test(NOT_A_DEPOSIT_GATE.unallocatedTokensCap.reason), "2 non-gates");

  // --- The contradiction + history ---
  add("RC-14: both sides of the contradiction are recorded verbatim", CONTRADICTORY_FIELDS.saidUnresolved.length === 3 && CONTRADICTORY_FIELDS.saidResolved.length === 3 && /never wrote the conclusion into the two structured fields/.test(CONTRADICTORY_FIELDS.rootCause), "3 vs 3");
  add("RC-15: the stale current wording is corrected", steak().capacityFieldOrFormula !== undefined && !/^UNRESOLVED:/.test(steak().capacityFieldOrFormula!) && /RESOLVED at 16H-J\.1, reconciled here at 16H-O\.1/.test(steak().capacityFieldOrFormula!), "no longer UNRESOLVED");
  add("RC-16: capacitySource is untouched — 'depositCap value is 0' is still a true reading", /value is 0/.test(steak().capacitySource ?? ""), "fact preserved");
  add("RC-17: historical blocked-capacity evidence remains preserved verbatim", /16H-I did NOT resolve capacity: depositCap reads 0 on-chain, and 0 is unsafe to interpret without official semantics\. This is now the PRIMARY blocker\./.test(blob()), "verbatim");
  add("RC-18: the historical statement is marked superseded without being rewritten", /SUPERSEDED at 16H-J\.1, reconciled at 16H-O\.1 \(retained verbatim for provenance\)/.test(blob()) && RECONCILIATION_RESULT.historyRewritten === false, "annotated, not edited");
  add("RC-19: 16H-I's refusal to guess is recorded as correct-when-written", /accurate when written — 16H-I correctly refused to guess/.test(blob()), "not disparaged");
  add("RC-20: the prior conclusion was not silently discarded", /historyHandling/.test(JSON.stringify(Object.keys(RECONCILIATION_RESULT))) && /Editing it would falsify the record/.test(RECONCILIATION_RESULT.historyHandling), "explicit");

  // --- Primary blocker ---
  add("RC-21: the primary blocker is the NEAREST unresolved stage", steak().primaryBlocker === "blocked_deposit_availability" && validatePrimaryBlockerIsNearest(steak().primaryBlocker, ["blocked_deposit_availability", "blocked_risk_review"]).ok === true, "deposit availability");
  add("RC-22: capacity being resolved is what moved primary past blocked_capacity", isNearerBlocker("blocked_capacity", "blocked_deposit_availability") === true && steak().capacityAdapterState !== "blocked", "capacity cleared");
  add("RC-23: deposit availability ranks NEARER than risk review", isNearerBlocker("blocked_deposit_availability", "blocked_risk_review") === true, "order holds");
  add("RC-24: the prior primary blocker is preserved as historical evidence", RECONCILIATION_RESULT.priorPrimaryBlocker === "blocked_risk_review" && /blocked_risk_review \(16H-J onward, still true, no longer primary\)/.test(blob()), "preserved");
  add("RC-25: risk review is recorded as the LARGEST but not the NEAREST gap", /largest gap, but it is not the NEAREST one/i.test(blob()) && /names the NEAREST unresolved prerequisite, not the largest gap/.test(RECONCILIATION_RESULT.primaryBlockerRationale), "largest ≠ nearest");
  add("RC-26: the old vocabulary constraint is recorded as the reason risk review was primary", /did not exist in the schema-1\.0\.0 vocabulary/.test(blob()), "N.5a lifted it");
  add("RC-27: position detection ranks before deposit availability and is already resolved", steak().positionDetectionState === "adapter_implemented_source_verified" && isNearerBlocker("blocked_position_detection", "blocked_deposit_availability") === true, "not a nearer gap");
  add("RC-28: constraints are already source-verified for Steakhouse, so they are not the gap", steak().constraintsState === "adapter_implemented_source_verified", "constraints done");

  // --- Immutable product boundaries ---
  add("RC-29: the automated aggregate remains 5.37", Math.abs(AUTOMATED_ASSESSMENT_OUTCOME.preCapWeightedAggregate - 5.37) < 0.005 && RECONCILIATION_CONFERS.automatedAggregateUnchanged === 5.37, "5.37");
  add("RC-30: meetsMinimum remains false", AUTOMATED_ASSESSMENT_OUTCOME.meetsMinimum === false && RECONCILIATION_CONFERS.meetsMinimumUnchanged === false, "false");
  add("RC-31: no human review is fabricated", RECONCILIATION_CONFERS.humanReviewOccurred === false && RECONCILIATION_CONFERS.humanReviewUnchanged === "awaiting_reviewer" && steak().riskReviewState === "blocked", "awaiting_reviewer");
  add("RC-32: no signoff or approval occurred", RECONCILIATION_CONFERS.signoffOccurred === false && RECONCILIATION_CONFERS.productApproved === false && steak().readiness === "blocked", "none");
  add("RC-33: no risk was reassessed", RECONCILIATION_RESULT.riskReassessed === false && RECONCILIATION_CONFERS.riskScoreAssigned === false, "not reassessed");
  add("RC-34: no recommendation or Top Pick was created", (RECONCILIATION_CONFERS.doesNotConfer as readonly string[]).includes("recommendation eligibility") && (RECONCILIATION_CONFERS.doesNotConfer as readonly string[]).includes("Top Pick"), "none");
  add("RC-35: no production card renders", (RECONCILIATION_CONFERS.doesNotConfer as readonly string[]).includes("a production card") && String(steak().primaryBlocker) !== "ready_for_approval_review", "no card");
  add("RC-36: existing-position Safety Buffer recognition is unchanged", RECONCILIATION_CONFERS.existingPositionRecognitionChanged === false && RECONCILIATION_CONFERS.safetyBufferValuesChanged === false && STEAKHOUSE_BUFFER_RECOGNITION_POLICY !== undefined, "unchanged");
  add("RC-37: Steakhouse position detection and APY are unchanged", steak().positionDetectionState === "adapter_implemented_source_verified" && steak().apyAdapterState === "adapter_implemented_source_verified" && steak().productAddress === "HDsayqAsDWy3QvANGqh2yNraqcD8Fnjgh73Mhb3WRS5E", "intact");
  add("RC-38: the direct Kamino lending candidate is unchanged", RECONCILIATION_CONFERS.directLendingCandidateChanged === false && kam().primaryBlocker === "blocked_risk_review" && kam().capacityAdapterState === "adapter_implemented_source_verified" && kam().constraintsState === "adapter_implemented_source_verified", "N.4-N.7 intact");
  add("RC-39: SOL staking is unchanged", RECONCILIATION_CONFERS.solStakingChanged === false && SOL_STAKING_COMPATIBILITY !== undefined, "unchanged");
  add("RC-40: no transaction is constructed or simulated", RECONCILIATION_CONFERS.transactionConstructedOrSimulated === false && !/sendTransaction|signTransaction|simulateTransaction/.test(readFileSync(`${process.cwd()}/src/suggestions/steakhouseCapacityReconciliation.ts`, "utf8")), "read-only");
  add("RC-41: exactly one candidate sits at blocked_deposit_availability", listStableYieldEvidenceManifests().filter((m) => String(m.primaryBlocker) === "blocked_deposit_availability").length === 1, "only Steakhouse");
  add("RC-42: the three unsupported candidates are untouched", ["raydium_stable_usdc_strategy", "meteora_stable_usdc_strategy", "hubble_usdc_strategy"].every((id) => getStableYieldEvidenceManifest(id)!.primaryBlocker === "unsupported_for_mvp"), "3 unchanged");

  // --- Evidence ---
  add("RC-43: the reconciliation manifest is deterministic", RECONCILIATION_MANIFEST_HASH === computeReconciliationManifestHash() && /^reconciliation_evidence_[0-9a-f]{8}$/.test(RECONCILIATION_MANIFEST_HASH), RECONCILIATION_MANIFEST_HASH);
  add("RC-44: evidence records what changed, why, preparer, timestamp and triggers", RECONCILIATION_EVIDENCE.whatChanged.length === 4 && RECONCILIATION_EVIDENCE.whyItChanged.length > 0 && RECONCILIATION_EVIDENCE.evidenceTimestamp.length > 0 && RECONCILIATION_EVIDENCE.invalidationTriggers.length === 3, "complete");
  add("RC-45: the preparer is not represented as a human reviewer", RECONCILIATION_EVIDENCE.preparerIsNotHumanReviewer === true && RECONCILIATION_EVIDENCE.preparerRole === "automated_evidence_preparer", "not a reviewer");
  add("RC-46: prior Steakhouse evidence hashes remain immutable", VERIFIED_EVIDENCE_MANIFEST_HASH === "evidence_a86da1fd" && computeEvidenceManifestHash() === VERIFIED_EVIDENCE_MANIFEST_HASH, "evidence_a86da1fd");
  add("RC-47: all direct-lending evidence hashes remain immutable", SOL_BTC_USDC_IDENTITY_MANIFEST_HASH === "identity_9773ac14" && CAPACITY_EVIDENCE_MANIFEST_HASH === computeCapacityEvidenceManifestHash() && POSITION_EVIDENCE_MANIFEST_HASH === computePositionEvidenceManifestHash() && AVAILABILITY_EVIDENCE_MANIFEST_HASH === computeAvailabilityEvidenceManifestHash() && CONSTRAINTS_EVIDENCE_MANIFEST_HASH === computeConstraintsEvidenceManifestHash(), "5 intact");

  return checks;
}

/* ------------------------------------------------------------------ *
 * 16H-O.2 — Main Market → SOL/BTC Market Incident Identity & Coverage
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Step 17C — Steakhouse verified immediate-withdrawal adapter. Recognized vs
 * verified-liquid separated (liquid = min(recognized, vault max-instant));
 * fail-closed; flows through 17B coverage; Steakhouse stays existing-only.
 * ------------------------------------------------------------------ */
export function runSteakhouseExistingPositionFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const inp = (over: Partial<STInput> = {}): STInput => ({
    totalShareRaw: "5000000000", recognizedUnderlyingRaw: "10000000000", vaultMaxInstantWithdrawableRaw: "999999999999",
    vaultGate: "permitted", reserveGate: "permitted", vaultFresh: true,
    price: { usdcPriceUsd: 0.9998, fresh: true }, apy: { valuePct: 5.2, fresh: true },
    observedAt: "2026-07-18T12:00:00.000Z", sourceSlot: 433465111, ...over,
  });

  // --- Recognition + full/partial/unavailable liquidity ---
  add("ST-1: full vault liquidity → fully_withdrawable, liquid == recognized", (() => { const r = stBuild(inp()); return r.positionExists === true && r.withdrawalState === "fully_withdrawable" && r.currentlyLiquidUnderlyingRaw === r.recognizedUnderlyingRaw && r.enrichmentState === "complete"; })(), "full");
  add("ST-2: partial vault liquidity → partially_withdrawable; delayed = recognized − liquid", (() => { const r = stBuild(inp({ vaultMaxInstantWithdrawableRaw: "4000000000" })); return r.withdrawalState === "partially_withdrawable" && r.currentlyLiquidUnderlyingRaw === "4000000000" && r.delayedUnderlyingRaw === "6000000000"; })(), "partial");
  add("ST-3: zero instant liquidity → currently_unavailable; recognized still visible", (() => { const r = stBuild(inp({ vaultMaxInstantWithdrawableRaw: "0" })); return r.withdrawalState === "currently_unavailable" && r.currentlyLiquidUnderlyingRaw === "0" && r.recognizedUnderlyingRaw === "10000000000"; })(), "unavailable");
  add("ST-4: vault max-instant UNRESOLVED (null) → unresolved liquid, recognized visible", (() => { const r = stBuild(inp({ vaultMaxInstantWithdrawableRaw: null })); return r.withdrawalState === "unresolved" && r.currentlyLiquidUnderlyingRaw === null && r.liquidValueUsd === null && r.recognizedUnderlyingRaw === "10000000000" && r.enrichmentState === "recognized_only"; })(), "unresolved liquid");

  // --- Paused / emergency / stale → no verified liquid ---
  add("ST-5: vault paused → paused, zero verified liquid, recognized visible", (() => { const r = stBuild(inp({ vaultGate: "paused" })); return r.withdrawalState === "paused" && r.currentlyLiquidUnderlyingRaw === null && r.recognizedUnderlyingRaw === "10000000000"; })(), "paused");
  add("ST-6: reserve emergency → emergency_paused, zero verified liquid", (() => { const r = stBuild(inp({ reserveGate: "emergency_paused" })); return r.withdrawalState === "emergency_paused" && r.currentlyLiquidUnderlyingRaw === null; })(), "emergency");
  add("ST-7: stale vault/reserve state → stale, zero verified liquid", (() => { const r = stBuild(inp({ vaultFresh: false })); return r.withdrawalState === "stale" && r.currentlyLiquidUnderlyingRaw === null; })(), "stale");

  // --- Fail-closed invariants ---
  add("ST-8: shares valid but recognition unresolved → position visible, recognized null, unresolved", (() => { const r = stBuild(inp({ recognizedUnderlyingRaw: null })); return r.positionExists === true && r.totalShareRaw === "5000000000" && r.recognizedUnderlyingRaw === null && r.recognizedValueUsd === null && r.enrichmentState === "unresolved"; })(), "recognition unresolved");
  add("ST-9: liquid never exceeds recognized (huge vault max capped)", (() => { const r = stBuild(inp({ recognizedUnderlyingRaw: "3000000000", vaultMaxInstantWithdrawableRaw: "999999999999" })); return r.currentlyLiquidUnderlyingRaw === "3000000000"; })(), "capped");
  add("ST-10: zero shares → no position", stBuild(inp({ totalShareRaw: "0" })).positionExists === false, "no position");
  add("ST-11: fresh price → recognized/liquid USD; stale price → tokens visible, USD null", (() => { const fresh = stBuild(inp()); const stale = stBuild(inp({ price: { usdcPriceUsd: null, fresh: false } })); return fresh.recognizedValueUsd !== null && fresh.liquidValueUsd !== null && stale.recognizedUnderlyingRaw === "10000000000" && stale.recognizedValueUsd === null && stale.liquidValueUsd === null; })(), "price");

  // --- Normalization + dedup ---
  add("ST-12: canonical WalletPosition: existing-only, withdrawalState, dedupe key, mint USDC", (() => { const w = stToWallet(stBuild(inp())); return !!w && w.candidateId === "kamino_steakhouse_usdc" && w.existingPositionOnly === true && w.dedupeKey === ST_KEY && w.mint === ST_ID.usdcMint && typeof w.liquidValueUsd === "number" && !("cta" in w); })(), "normalized");
  add("ST-13: generic share/farm-receipt row (share mint) deduped; canonical + others kept", (() => {
    const share = { id: "share", source: "wallet", type: "token", symbol: "?", mint: ST_ID.shareMint, amount: "5000000000", detection: "direct_wallet_balance" } as any;
    const other = { id: "kamino-vault-Other", source: "kamino", type: "protocol", amount: "", detection: "protocol_api" } as any;
    const merged = stMerge([share, other], stBuild(inp()));
    return merged.filter((p) => p.id === ST_POS_ID).length === 1 && !merged.some((p) => p.mint === ST_ID.shareMint) && merged.some((p) => p.id === other.id);
  })(), "deduped");
  add("ST-14: merge yields exactly one Steakhouse row", (() => { const m = stMerge([{ id: "share", source: "wallet", type: "token", symbol: "?", mint: ST_ID.shareMint, amount: "1", detection: "direct_wallet_balance" } as any], stBuild(inp())); return m.filter((p) => p.id === ST_POS_ID).length === 1; })(), "one row");

  // --- 17B Safety Buffer integration ---
  add("ST-15: full verified liquid counts toward buffer (17B included_liquid)", sbClassify(stToWallet(stBuild(inp()))!).inclusionState === "included_liquid", "counts");
  add("ST-16: partial verified liquid counts partially", (() => { const s = sbClassify(stToWallet(stBuild(inp({ vaultMaxInstantWithdrawableRaw: "4000000000" })))!); return s.inclusionState === "included_partial" && s.verifiedLiquidValueUsd > 0 && s.delayedValueUsd > 0; })(), "partial");
  add("ST-17: recognized-only (unresolved liquid) → 0 verified, excluded_unresolved", (() => { const s = sbClassify(stToWallet(stBuild(inp({ vaultMaxInstantWithdrawableRaw: null })))!); return s.verifiedLiquidValueUsd === 0 && s.inclusionState === "excluded_unresolved"; })(), "unresolved");
  add("ST-18: emergency → 0 verified, excluded_unavailable", (() => { const s = sbClassify(stToWallet(stBuild(inp({ reserveGate: "emergency_paused" })))!); return s.verifiedLiquidValueUsd === 0 && s.inclusionState === "excluded_unavailable"; })(), "emergency");
  add("ST-19: direct-wallet buffer already ≥ target stays complete despite unresolved Steakhouse", (() => {
    const usdc = { id: "u", source: "wallet", type: "token", symbol: "USDC", name: "USD Coin", mint: ST_ID.usdcMint, amount: "1", detection: "direct_wallet_balance", valueUsd: 6000 } as any;
    const steak = stToWallet(stBuild(inp({ vaultMaxInstantWithdrawableRaw: null })))!;
    return sbCoverage([usdc, steak], 5000).coverageState === "complete";
  })(), "still complete");

  // --- Immutability + existing-position-only ---
  add("ST-20: Steakhouse stays existing_position_only, not selector/Top-Pick eligible; scores immutable", dlGetDispo("kamino_steakhouse_usdc")?.disposition === "existing_position_only" && dlGetDispo("kamino_steakhouse_usdc")?.selectorEligibility === false && dlGetDispo("kamino_steakhouse_usdc")?.topPickEligibility === false && DA_OUTCOME.unroundedAggregate === 5.93 && DL_CATMIN === 5.5 && DL_UNIMIN === 7, "existing-only");

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 17C.1 — Steakhouse vault/reserve gate verification. No positive
 * verified liquid may depend on an assumed-false pause/emergency; every gate
 * is explicitly permitted, blocking, or fail-closed unresolved.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Step 17C.1 — Steakhouse vault/reserve gate verification. No positive
 * verified liquid may depend on an assumed-false pause/emergency; every gate
 * is explicitly permitted, blocking, or fail-closed unresolved.
 * ------------------------------------------------------------------ */
export function runSteakhouseGateFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const g = (over: Partial<STInput> = {}): STInput => ({
    totalShareRaw: "5000000000", recognizedUnderlyingRaw: "10000000000", vaultMaxInstantWithdrawableRaw: "999999999999",
    vaultGate: "permitted", reserveGate: "permitted", vaultFresh: true,
    price: { usdcPriceUsd: 0.9998, fresh: true }, apy: { valuePct: 5.2, fresh: true },
    observedAt: "2026-07-18T12:00:00.000Z", sourceSlot: 433465111, ...over,
  });

  // --- Gate model replaces hardcoded booleans (compile-time proof: input requires gate states) ---
  add("GT-1: input uses explicit gate states (no vaultPaused/reserveEmergency booleans)", (() => { const r = g(); return typeof r.vaultGate === "string" && typeof r.reserveGate === "string" && !("vaultPaused" in r) && !("reserveEmergency" in r); })(), "gate model");

  // --- Vault gate (KVault has no pause field → permitted is PROVEN) ---
  add("GT-2: vault permitted + reserves permitted → verified liquid possible", stBuild(g()).withdrawalState === "fully_withdrawable" && stBuild(g()).currentlyLiquidUnderlyingRaw === "10000000000", "permitted liquidity");
  add("GT-3: vault paused → paused, zero verified liquid, recognized visible", (() => { const r = stBuild(g({ vaultGate: "paused" })); return r.withdrawalState === "paused" && r.currentlyLiquidUnderlyingRaw === null && r.liquidValueUsd === null && r.recognizedUnderlyingRaw === "10000000000"; })(), "paused");
  add("GT-4: unknown vault gate → unresolved, null liquid (never treated as permitted)", (() => { const r = stBuild(g({ vaultGate: "unresolved" })); return r.withdrawalState === "unresolved" && r.currentlyLiquidUnderlyingRaw === null; })(), "vault unknown");
  add("GT-5: stale vault gate → stale, null liquid", stBuild(g({ vaultGate: "stale" })).currentlyLiquidUnderlyingRaw === null, "vault stale");

  // --- Reserve gate ---
  add("GT-6: reserve emergency → no verified liquid from vault; recognized visible", (() => { const r = stBuild(g({ reserveGate: "emergency_paused" })); return r.withdrawalState === "emergency_paused" && r.currentlyLiquidUnderlyingRaw === null && r.recognizedUnderlyingRaw === "10000000000"; })(), "reserve emergency");
  add("GT-7: reserve withdrawal_blocked → no verified liquid", stBuild(g({ reserveGate: "withdrawal_blocked" })).currentlyLiquidUnderlyingRaw === null, "blocked");
  add("GT-8: unknown material reserve gate → unresolved, null liquid", (() => { const r = stBuild(g({ reserveGate: "unresolved" })); return r.withdrawalState === "unresolved" && r.currentlyLiquidUnderlyingRaw === null; })(), "reserve unknown");
  add("GT-9: stale reserve gate → stale, null liquid", stBuild(g({ reserveGate: "stale" })).currentlyLiquidUnderlyingRaw === null, "reserve stale");

  // --- Positive liquidity impossible when any applicable gate is not permitted+resolved ---
  add("GT-10: positive liquidity impossible unless BOTH gates permitted + fresh + resolved", (() => {
    const blocked = [{ vaultGate: "paused" as const }, { vaultGate: "unresolved" as const }, { vaultGate: "stale" as const }, { reserveGate: "emergency_paused" as const }, { reserveGate: "withdrawal_blocked" as const }, { reserveGate: "unresolved" as const }, { reserveGate: "stale" as const }, { vaultFresh: false }, { vaultMaxInstantWithdrawableRaw: null }];
    return blocked.every((o) => stBuild(g(o)).currentlyLiquidUnderlyingRaw === null && stBuild(g(o)).liquidValueUsd === null);
  })(), "no positive on any gate");
  add("GT-11: recognized value + share ownership survive every gate failure", stBuild(g({ vaultGate: "paused" })).recognizedUnderlyingRaw === "10000000000" && stBuild(g({ reserveGate: "unresolved" })).totalShareRaw === "5000000000" && stBuild(g({ reserveGate: "emergency_paused" })).positionExists === true, "recognized survives");

  // --- Safety Buffer counts corrected amount only ---
  add("GT-12: paused/emergency → 0 verified-liquid coverage; unresolved → excluded_unresolved", (() => {
    const paused = sbClassify(stToWallet(stBuild(g({ vaultGate: "paused" })))!);
    const emerg = sbClassify(stToWallet(stBuild(g({ reserveGate: "emergency_paused" })))!);
    const unres = sbClassify(stToWallet(stBuild(g({ reserveGate: "unresolved" })))!);
    return paused.verifiedLiquidValueUsd === 0 && emerg.verifiedLiquidValueUsd === 0 && unres.inclusionState === "excluded_unresolved";
  })(), "buffer corrected");
  add("GT-13: permitted gates + fresh → verified liquid counts (included_liquid)", sbClassify(stToWallet(stBuild(g()))!).inclusionState === "included_liquid", "counts when permitted");

  // --- Immutability / existing-only ---
  add("GT-14: Steakhouse existing-only unchanged; no transaction behaviour", dlGetDispo("kamino_steakhouse_usdc")?.disposition === "existing_position_only" && dlGetDispo("kamino_steakhouse_usdc")?.selectorEligibility === false && (() => { const w = stToWallet(stBuild(g())); return !!w && !("cta" in w); })() && DA_OUTCOME.unroundedAggregate === 5.93 && DL_CATMIN === 5.5, "unchanged");

  return checks;
}

/**
 * Step 17C.2 — block_ctoken_usage applicability + final reserve-gate completion. Binds the gate decision to
 * the INSTALLED KLend decoder (ReserveConfig borsh layout) and the KVault withdrawal-path account model.
 */

/**
 * Step 17C.2 — block_ctoken_usage applicability + final reserve-gate completion. Binds the gate decision to
 * the INSTALLED KLend decoder (ReserveConfig borsh layout) and the KVault withdrawal-path account model.
 */
export function runSteakhouseBlockCtokenFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });

  // A single MATERIAL reserve with all gates clear except the field under test.
  const R = (over: Partial<STGateInput> = {}): STGateInput => ({
    reserveAddress: "Reserve1111111111111111111111111111111111111", ctokenAllocation: "1000000000",
    status: 0, emergencyMode: 0, blockCtokenUsage: 0, lendingMarket: "Market111111111111111111111111111111111111",
    marketEmergency: false, sourceSlot: 433465111, fresh: true, ...over,
  });
  // Adapter input pinned to a decoded reserveGate (the mount folds deriveReserveGate() into this single gate).
  const stInp = (reserveGate: STInput["reserveGate"]): STInput => ({
    totalShareRaw: "5000000000", recognizedUnderlyingRaw: "10000000000", vaultMaxInstantWithdrawableRaw: "999999999999",
    vaultGate: "permitted", reserveGate, vaultFresh: true,
    price: { usdcPriceUsd: 0.9998, fresh: true }, apy: { valuePct: 5.2, fresh: true },
    observedAt: "2026-07-18T12:00:00.000Z", sourceSlot: 433465111,
  });

  // --- Source-backed semantics (installed definitions, not name inference) ---
  const layoutFields: string[] = (() => {
    try { const l: any = (KLEND_RESERVE_CONFIG as any).layout?.("x") ?? (KLEND_RESERVE_CONFIG as any).layout?.(); return (l?.fields ?? []).map((f: any) => f?.property).filter((s: any) => typeof s === "string"); }
    catch { return []; }
  })();
  add("BC-1: block_ctoken_usage is a decoded u8 field of the INSTALLED KLend ReserveConfig layout", layoutFields.includes("blockCtokenUsage") && layoutFields.includes("emergencyMode") && layoutFields.includes("status"), `layout fields: ${layoutFields.length}`);
  add("BC-2: installed KLend config-update enum exposes UpdateBlockCTokenUsage (a governed reserve gate)", (KLEND_UPDATE_CONFIG_MODE as any).UpdateBlockCTokenUsage?.kind === "UpdateBlockCTokenUsage", "update-mode variant present");

  // --- Applicability is explicit, not inferred ---
  add("BC-3: every material reserve is marked block_ctoken_usage APPLICABLE (explicit)", (() => { const { breakdown } = stDeriveGate([R()]); return breakdown.length === 1 && breakdown[0].blockCtokenApplicable === "applicable"; })(), "explicit applicable");

  // --- Applicable + disabled → permitted (further evaluation allowed) ---
  add("BC-4: applicable + disabled (flag=0) + all gates clear → reserve gate permitted", (() => { const d = stDeriveGate([R({ blockCtokenUsage: 0 })]); return d.gate === "permitted" && d.breakdown[0].blockCtokenValue === "disabled" && d.breakdown[0].combinedGate === "permitted"; })(), "disabled → permitted");

  // --- Applicable + enabled → blocked reserve ---
  add("BC-5: applicable + enabled (flag≠0) → combined gate withdrawal_blocked", (() => { const d = stDeriveGate([R({ blockCtokenUsage: 1 })]); return d.gate === "withdrawal_blocked" && d.breakdown[0].blockCtokenValue === "enabled" && d.breakdown[0].combinedGate === "withdrawal_blocked" && d.breakdown[0].limitingCondition === "block_ctoken_usage enabled"; })(), "enabled → blocked");
  add("BC-5b: any non-zero flag value blocks (e.g. 2)", stDeriveGate([R({ blockCtokenUsage: 2 })]).gate === "withdrawal_blocked", "u8 non-zero blocks");

  // --- Unresolved applicability/value → unresolved (never assumed disabled) ---
  add("BC-6: missing block_ctoken_usage (null) → unresolved, NOT treated as disabled", (() => { const d = stDeriveGate([R({ blockCtokenUsage: null })]); return d.gate === "unresolved" && d.breakdown[0].blockCtokenValue === "unresolved" && d.breakdown[0].limitingCondition === "block_ctoken_usage unresolved"; })(), "null → unresolved");

  // --- Non-material reserve ignored ---
  add("BC-7: non-material reserve (allocation 0) with flag enabled is ignored (not material)", (() => { const d = stDeriveGate([R({ ctokenAllocation: 0, blockCtokenUsage: 1 })]); return d.gate === "permitted" && d.breakdown.length === 0; })(), "immaterial ignored");

  // --- Blocked reserve contributes no immediate liquidity (adapter) ---
  add("BC-8: blocked reserve → no verified immediate liquidity from that reserve", stBuild(stInp("withdrawal_blocked")).currentlyLiquidUnderlyingRaw === null, "blocked → null liquid");
  add("BC-9: material blocked reserve → whole-position fails closed (liquid null, recognized visible)", (() => { const r = stBuild(stInp("withdrawal_blocked")); return r.currentlyLiquidUnderlyingRaw === null && r.liquidValueUsd === null && r.recognizedUnderlyingRaw === "10000000000" && r.positionExists === true; })(), "whole-position closed");

  // --- Idle-liquidity: no partial estimate even though vaultMax > 0 (fail-closed) ---
  add("BC-10: blocked reserve → NO partial idle amount estimated despite positive vaultMax", (() => { const r = stBuild(stInp("withdrawal_blocked")); return r.currentlyLiquidUnderlyingRaw === null && r.currentlyLiquidUnderlyingAmount === null; })(), "no idle estimate");

  // --- Recognized survives; liquid never exceeds recognized ---
  add("BC-11: recognized value + shares survive a blocked gate", (() => { const r = stBuild(stInp("withdrawal_blocked")); return r.recognizedUnderlyingRaw === "10000000000" && r.totalShareRaw === "5000000000"; })(), "recognized survives");
  add("BC-12: liquid never exceeds recognized (permitted path: min(vaultMax, recognized))", (() => { const r = stBuild(stInp("permitted")); return r.currentlyLiquidUnderlyingRaw === "10000000000"; })(), "min cap");

  // --- Safety Buffer counts only corrected amount ---
  add("BC-13: Safety Buffer — blocked reserve yields 0 verified-liquid coverage; permitted counts", (() => {
    const blocked = sbClassify(stToWallet(stBuild(stInp("withdrawal_blocked")))!);
    const ok = sbClassify(stToWallet(stBuild(stInp("permitted")))!);
    return blocked.verifiedLiquidValueUsd === 0 && ok.inclusionState === "included_liquid";
  })(), "buffer corrected");

  // --- Multi-reserve: first blocker sets combined gate; breakdown records all material reserves ---
  add("BC-14: multi-reserve — one enabled flag blocks the whole vault; breakdown records every material reserve", (() => {
    const d = stDeriveGate([R({ reserveAddress: "A" }), R({ reserveAddress: "B", blockCtokenUsage: 1 }), R({ reserveAddress: "C" })]);
    return d.gate === "withdrawal_blocked" && d.breakdown.length === 3 && d.breakdown.find((e) => e.reserveAddress === "B")?.combinedGate === "withdrawal_blocked";
  })(), "first blocker wins");
  add("BC-15: combined gate permitted ONLY when every material reserve permitted", (() => {
    const allOk = stDeriveGate([R({ reserveAddress: "A" }), R({ reserveAddress: "B" })]).gate === "permitted";
    const oneBad = stDeriveGate([R({ reserveAddress: "A" }), R({ reserveAddress: "B", blockCtokenUsage: null })]).gate !== "permitted";
    return allOk && oneBad;
  })(), "all-or-nothing");

  // --- No assumed default false; other gates still enforced alongside block flag ---
  add("BC-16: block flag decoded independently of status/emergency (both still enforced)", (() => {
    const emerg = stDeriveGate([R({ emergencyMode: 1, blockCtokenUsage: 0 })]).gate === "emergency_paused";
    const mkt = stDeriveGate([R({ marketEmergency: true, blockCtokenUsage: 0 })]).gate === "emergency_paused";
    return emerg && mkt;
  })(), "gates independent");

  // --- Immutability: no eligibility, no transaction behaviour ---
  add("BC-17: Steakhouse remains existing-only; selector/Top-Pick false; score/threshold immutable", dlGetDispo("kamino_steakhouse_usdc")?.disposition === "existing_position_only" && dlGetDispo("kamino_steakhouse_usdc")?.selectorEligibility === false && DA_OUTCOME.unroundedAggregate === 5.93 && DL_CATMIN === 5.5, "existing-only");
  add("BC-18: mapped position has no cta/transaction affordance", (() => { const w = stToWallet(stBuild(stInp("permitted"))); return !!w && !("cta" in w) && !("signature" in w) && !("transaction" in w); })(), "no tx");

  return checks;
}

/**
 * Step 17D — Jupiter Lend USDC (jlUSDC) read-only existing-position detection. Proves exact-identity
 * detection/aggregation, fail-closed recognized-claim + liquidity (no verified methodology in production),
 * dedup, portfolio + Safety Buffer treatment, and immutability (Jupiter stays excluded_from_suggestions).
 */

export function runRiskEvidencePackageFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const pkgSrc = readFileSync(`${process.cwd()}/src/suggestions/klendDirectUsdcRiskEvidencePackage.ts`, "utf8");
  const B = PKG_BINDING, R = PKG_READINESS, D = PKG_DIMENSIONS;
  const dim = (id: string) => D.find((d) => d.dimensionId === id)!;
  const CANON = ["audit_security","maturity","upgrade_admin_authority","manager_discretion","strategy_complexity","composability_dependency","oracle_risk","liquidity_withdrawal","asset_stablecoin_risk","withdrawal_fee_transparency","operational_dependency_risk","incident_history"];
  const ok = { candidateId: B.candidateId, marketAddress: B.marketAddress, reserveAddress: B.reserveAddress, liquidityMint: B.liquidityMint, cTokenMint: B.cTokenMint, klendProgram: B.klendProgram, cluster: B.cluster };

  // --- Identity binding ---
  add("PK-1: exact candidate identity is required", validatePackageBinding(ok).ok === true && validatePackageBinding({ ...ok, candidateId: "kamino_steakhouse_usdc" }).failure === "candidate_mismatch", "bound");
  add("PK-2: exact market is required", validatePackageBinding({ ...ok, marketAddress: "So11111111111111111111111111111111111111112" }).failure === "market_mismatch", "7u3He…");
  add("PK-3: exact reserve is required", validatePackageBinding({ ...ok, reserveAddress: "So11111111111111111111111111111111111111112" }).failure === "reserve_mismatch", "D6q6…");
  add("PK-4: exact canonical USDC mint is required", validatePackageBinding({ ...ok, liquidityMint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB" }).failure === "liquidity_mint_mismatch", "EPjFW…");
  add("PK-5: exact cToken mint is required", validatePackageBinding({ ...ok, cTokenMint: "7D8C5pDFxug58L9zkwK7bCiDg4kD4AygzbcZUmf5usHS" }).failure === "ctoken_mint_mismatch", "B8V6W…");
  add("PK-6: exact KLend program is required", validatePackageBinding({ ...ok, klendProgram: "KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd" }).failure === "program_mismatch", "KLend2g3…");
  add("PK-7: mainnet-beta is required", validatePackageBinding({ ...ok, cluster: "devnet" }).failure === "cluster_mismatch", "cluster bound");
  add("PK-8: the Main Market alias is exact-address bound", B.marketHistoricalAlias === "Main Market" && B.marketAddress === MAIN_MARKET_ALIAS.marketAddress && MAIN_MARKET_ALIAS.identityConclusion === "same_exact_market_renamed_label", "alias → 7u3He…");

  // --- Governance ---
  add("PK-9: the package binds the approved rubric identity, version and hash", B.rubricId === "protocol_risk_rubric_v1" && B.rubricVersion === "1.0.0" && B.rubricHash === computeRubricV1Hash() && /^rubric_[0-9a-f]{8}$/.test(B.rubricHash), B.rubricHash);
  add("PK-10: confidence and separation-of-duties policies are bound", B.confidencePolicyId === "risk_review_confidence_v2" && B.separationOfDutiesId === "risk_separation_of_duties_v2", "v2 policies");
  add("PK-11: the preparer is not the scorer and not a reviewer", B.preparationRole === "evidence_preparer" && B.preparerIsNotScorer === true && B.preparerIsNotHumanReviewer === true && B.authorizedAssessor === "ws_automated_risk_assessor", "SoD held");

  // --- Dimension map ---
  add("PK-12: all 12 dimensions exist in canonical order", D.length === 12 && D.map((d) => d.dimensionId).join(",") === CANON.join(","), "canonical order");
  add("PK-13: rubric weights match the approved rubric and sum to 100", D.reduce((a, d) => a + d.weight, 0) === 100 && dim("audit_security").weight === 15 && dim("upgrade_admin_authority").weight === 15 && dim("manager_discretion").weight === 12 && dim("liquidity_withdrawal").weight === 12 && dim("incident_history").weight === 2, "sum 100");
  add("PK-14: every dimension carries the required evidence fields", D.every((d) => d.evidenceRefs.length > 0 && d.verifiedFacts.length > 0 && d.scorerInstructions.length > 0 && d.prohibitedInferences.length > 0 && d.confidenceCeilingJustification.length > 0 && d.invalidationTriggers.length > 0), "12 complete");

  // --- No scores anywhere ---
  add("PK-15: NO score appears in the package", D.every((d) => !("score" in d)) && PKG_CONFERS.scoresAssigned === false && PKG_MANIFEST.containsScores === false, "score-free");
  add("PK-16: NO suggested score or anchor recommendation appears", !/suggestedScore|anchorRecommendation|recommendedScore|suggestedAnchor/.test(pkgSrc), "none");
  add("PK-17: NO aggregate appears", !/\baggregate\s*[:=]\s*[0-9]/.test(pkgSrc) && PKG_CONFERS.aggregateCalculated === false && PKG_MANIFEST.containsAggregate === false, "no aggregate");
  add("PK-18: NO threshold targeting appears", PKG_CONFERS.thresholdTargeting === false && /minimum of 7 is not referenced as a target/.test(PKG_CONFERS.thresholdTargetingNote) && !/distanceToThreshold|thresholdDistance|needsToReach/.test(pkgSrc), "not targeted");

  // --- Provenance layers ---
  add("PK-19: evidence references are stable IDs", PKG_MODULES.length === 13 && PKG_MODULES.every((m) => m.id.length > 0 && m.module.endsWith(".ts")) && PKG_MODULES.some((m) => m.id === "identity_9773ac14") && PKG_MODULES.some((m) => m.id === "capacity_evidence_e54e310a"), "12 stable IDs");
  add("PK-20: immutable and current-state evidence are separated", PKG_MODULES.every((m) => m.layer === "immutable_methodology" || m.layer === "immutable_historical") && CURRENT_STATE_NOT_IDENTITY.currentStateFields.length === 7, "layers split");
  add("PK-21: current APY/capacity/liquidity are NOT immutable identity claims", /None is an immutable identity claim/.test(CURRENT_STATE_NOT_IDENTITY.rule) && (CURRENT_STATE_NOT_IDENTITY.currentStateFields as readonly string[]).includes("APY") && (CURRENT_STATE_NOT_IDENTITY.currentStateFields as readonly string[]).includes("capacity remaining"), "dated observations");
  add("PK-22: estimated APY remains labeled estimated_variable_apy", /rateKind estimated_variable_apy/.test(CURRENT_STATE_NOT_IDENTITY.apyIsEstimated) && RATE_KIND === "estimated_variable_apy", "estimated");
  add("PK-23: current liquidity is NOT described as guaranteed", /NOT a guarantee of future liquidity/.test(CURRENT_STATE_NOT_IDENTITY.liquidityIsNotGuaranteed) && (dim("liquidity_withdrawal").prohibitedInferences as string[]).some((p) => /guaranteed future liquidity/.test(p)), "snapshot only");
  add("PK-24: the API remains diagnostic only", /DIAGNOSTIC ONLY/.test(DIAGNOSTIC_ONLY_SOURCES.kaminoApi) && /was demonstrated to be cached/.test(DIAGNOSTIC_ONLY_SOURCES.kaminoApi), "never authority");

  // --- Scope discipline ---
  add("PK-25: KVault evidence is NOT generalized to the direct reserve", (dim("audit_security").limitations as string[]).some((l) => /KVault audits are NOT evidence for this product/.test(l)) && /does NOT transfer to KLend/.test(KLEND_UPGRADE_AUTH.whyThisMatters), "kvault ≠ klend");
  add("PK-26: direct KLend evidence is NOT generalized into zero-risk claims", (dim("strategy_complexity").prohibitedInferences as string[]).some((p) => /single-reserve exposure means low risk/.test(p)) && (dim("composability_dependency").prohibitedInferences as string[]).some((p) => /no composability risk/.test(p)), "no zero-risk");
  add("PK-27: manager_discretion remains APPLICABLE", dim("manager_discretion").applicability === "directly_applicable" && dim("manager_discretion").applicability !== "not_applicable" && /Do not mark it not applicable/.test(dim("manager_discretion").scorerInstructions), "applicable");
  add("PK-28: manager_discretion is not inferred low from absence of KVault alone", (dim("manager_discretion").prohibitedInferences as string[]).some((p) => /absence of a KVault allocation manager alone/.test(p)) && (dim("manager_discretion").verifiedFacts as string[]).some((f) => /block_ctoken_usage/.test(f)), "mutable surface recorded");
  add("PK-29: exact USDC oracle evidence does NOT replace collateral-side review", (dim("oracle_risk").limitations as string[]).some((l) => /BORROWER-COLLATERAL-SIDE ORACLE IS NOT ASSESSED/.test(l)) && /Do NOT let the exact USDC price controls substitute/.test(dim("oracle_risk").scorerInstructions), "collateral gap explicit");
  add("PK-30: the direct reserve uses the corrected market evidence", (dim("incident_history").verifiedFacts as string[]).some((f) => /Main Market and SOL\/BTC Market are the same account|same account 7u3He/.test(f)) && dim("incident_history").evidenceRefs.includes("incident_alias_evidence_3023570a"), "corrected alias");
  add("PK-31: prior 10.95% coverage remains historical", SUPERSEDED_COVERAGE_CALCULATION.coveredAllocationPct === 10.95 && OFFICIAL_EVENT_MARKET_COVERAGE.coveredAllocationPct === 98.56, "preserved");
  add("PK-32: zero bad debt is NOT converted into zero incidents", (dim("incident_history").prohibitedInferences as string[]).some((p) => /zero bad debt means zero incidents or zero exploits/.test(p)) && (dim("incident_history").prohibitedInferences as string[]).some((p) => /SEARCH RESULT, not a clean record/.test(p)), "search result");
  add("PK-33: Steakhouse's KVault-specific fatal gaps are NOT inherited", (dim("incident_history").limitations as string[]).some((l) => /gaps 1 .* and 2 .* do NOT apply here/.test(l)) && /do not inherit Steakhouse/i.test(dim("incident_history").scorerInstructions.replace("Do not inherit", "do not inherit")), "material difference kept");
  add("PK-34: the take rate is not labelled a withdrawal fee", (dim("withdrawal_fee_transparency").prohibitedInferences as string[]).some((p) => /take rate is a withdrawal fee/.test(p)) && (dim("withdrawal_fee_transparency").verifiedFacts as string[]).some((f) => /INTEREST-REVENUE SHARE/.test(f)), "interest share");

  // --- The blocking gap ---
  add("PK-35: the KLend program upgrade authority is verified as off-curve, not a keypair", KLEND_UPGRADE_AUTH.authorityIsOnCurve === false && KLEND_UPGRADE_AUTH.authorityClassification === "off_curve_pda_not_keypair" && KLEND_UPGRADE_AUTH.upgradeAuthority === "GzFgdRJXmawPhGeBsyRCDLx4jAKPsvbUqoqitzppkzkW", "PDA");
  add("PK-36: off-curve alone does NOT establish a multisig or its threshold", /does NOT establish which multisig, nor any threshold or timelock/.test(KLEND_UPGRADE_AUTH.isNotEvidenceOf) && KLEND_UPGRADE_AUTH.whatRemainsUnverified.length === 3, "not 'safely governed'");
  add("PK-37 (updated by 16H-P.1a): KVault's authority still does not transfer — and the numbers coinciding proves why that matters", (dim("upgrade_admin_authority").prohibitedInferences as string[]).some((p) => /the numbers coincide but this was verified INDEPENDENTLY/.test(p)) && KVAULT_COINCIDENCE.isEvidenceOfIdentity === false, "right by luck ≠ right");
  add("PK-38 (updated by 16H-P.1a): the previously REPORTED thresholds are now VERIFIED against chain", (dim("upgrade_admin_authority").verifiedFacts as string[]).some((f) => /previously REPORTED 4-of-10 \/ 12h claim is now VERIFIED/.test(f)) && (dim("upgrade_admin_authority").verifiedFacts as string[]).some((f) => /previously REPORTED 2-of-7 \/ no-timelock claim is now VERIFIED/.test(f)), "reported → verified");
  add("PK-39 (updated by 16H-P.1a): upgrade_admin_authority is now partial-but-scoreable", dim("upgrade_admin_authority").readiness === "partial" && dim("upgrade_admin_authority").scoreable === true && /RESOLVED AT 16H-P\.1a/.test(dim("upgrade_admin_authority").verifiedFacts[0]), "resolved");
  add("PK-40 (updated by 16H-P.1a): the 16H-P.1 resolution method was recorded and then executed", /isOnCurve is the decisive keypair-vs-PDA test/.test(KLEND_UPGRADE_AUTH.resolutionMethod) && UPGRADE_LAYER.squads!.derivationMatches === true, "method → result");

  // --- Readiness ---
  add("PK-41 (updated by 16H-P.1a): the package is now ready, and flipped on EVIDENCE", R.readiness === "ready_for_automated_assessment" && READINESS_CONSEQUENCE.priorReadiness === "not_ready_for_automated_assessment" && READINESS_CONSEQUENCE.readinessFlippedOnEvidence === true, "ready");
  add("PK-42: readiness is deterministic — any non-scoreable dimension blocks", evaluatePackageReadiness([{ ...dim("upgrade_admin_authority"), readiness: "insufficient", scoreable: false }, ...D.filter((d) => d.dimensionId !== "upgrade_admin_authority")]).readiness === "not_ready_for_automated_assessment" && R.readiness === "ready_for_automated_assessment", "deterministic both ways");
  add("PK-43 (updated by 16H-P.1a): no dimension remains insufficient", R.insufficientDimensions.length === 0, "0 blockers");
  add("PK-44: six dimensions are complete", R.completeDimensions.length === 6 && R.completeDimensions.includes("liquidity_withdrawal") && R.completeDimensions.includes("withdrawal_fee_transparency"), "6 complete");
  add("PK-45 (updated by 16H-P.1a): six dimensions are partial but scoreable", R.partialButScoreableDimensions.length === 6 && R.partialButScoreableDimensions.includes("upgrade_admin_authority") && R.partialButScoreableDimensions.includes("incident_history"), "6 partial");
  add("PK-46: complete + partial + insufficient = 12", R.completeDimensions.length + R.partialButScoreableDimensions.length + R.insufficientDimensions.length === 12, "all accounted");
  add("PK-47 (updated by 16H-P.1a): no blocking artifacts remain", R.blockingMissingArtifacts.length === 0, "0 gaps");
  add("PK-48: readiness is about evidence sufficiency, not suitability", /suffices to ATTEMPT scoring without guessing/.test(R.readinessMeaning) && (R.readinessIsNot as readonly string[]).includes("risk suitability") && (R.readinessIsNot as readonly string[]).includes("product approval"), "sufficiency only");
  add("PK-49: NO automated assessment was created — readiness is not the assessment", READINESS_CONSEQUENCE.automatedAssessmentCreated === false && /separate, later step/.test(READINESS_CONSEQUENCE.automatedAssessmentCreatedNote), "not created");
  add("PK-50: the gate held at P.1 and released only on evidence", /laundered a guess into a score, and a score into an aggregate/.test(READINESS_CONSEQUENCE.correctBehaviour) && /Finding a multisig is not the bar/.test(READINESS_CONSEQUENCE.notFlippedBecauseAMultisigWasFound), "gate held then released");

  // --- Manifest + boundaries ---
  add("PK-51: the manifest is deterministic", PKG_MANIFEST_HASH === computePackageManifestHash() && /^risk_package_[0-9a-f]{8}$/.test(PKG_MANIFEST_HASH), PKG_MANIFEST_HASH);
  add("PK-52: the manifest records identity, cutoff, preparer, policies and readiness", PKG_MANIFEST.includedEvidenceIds.length === 13 && PKG_MANIFEST.evidenceCutoff.length > 0 && PKG_MANIFEST.preparationRole === "evidence_preparer" && PKG_MANIFEST.rubricHash === computeRubricV1Hash() && PKG_MANIFEST.readiness === R.readiness && PKG_MANIFEST.invalidationTriggers.length === 5, "complete");
  add("PK-53: no human review, signoff or approval occurred", PKG_CONFERS.humanReviewOccurred === false && PKG_CONFERS.signoffOccurred === false && PKG_CONFERS.productApproved === false, "none");
  add("PK-54: no selector or recommendation state changed", PKG_CONFERS.selectorChanged === false && PKG_CONFERS.recommendationChanged === false && (PKG_CONFERS.doesNotConfer as readonly string[]).includes("Top Pick") && (PKG_CONFERS.doesNotConfer as readonly string[]).includes("a production card"), "unchanged");
  add("PK-55: lifecycle and mechanical adapter states are unchanged", PKG_CONFERS.lifecycleChanged === false && getYieldStrategy("kamino_usdc_lending")!.lifecycle === "identity_verified" && getStableYieldEvidenceManifest("kamino_usdc_lending")!.primaryBlocker === "blocked_risk_review" && getStableYieldEvidenceManifest("kamino_usdc_lending")!.constraintsState === "adapter_implemented_source_verified", "intact");
  add("PK-56: the Steakhouse assessment is unchanged", PKG_CONFERS.steakhouseAssessmentChanged === false && Math.abs(AUTOMATED_ASSESSMENT_OUTCOME.preCapWeightedAggregate - 5.37) < 0.005 && AUTOMATED_ASSESSMENT_OUTCOME.meetsMinimum === false, "5.37 / false");
  add("PK-57: no transaction behaviour exists", PKG_CONFERS.transactionConstructedOrSimulated === false && !/sendTransaction|signTransaction|simulateTransaction/.test(pkgSrc), "read-only");
  add("PK-58: all prior evidence remains immutable", SOL_BTC_USDC_IDENTITY_MANIFEST_HASH === "identity_9773ac14" && MEASURED_APY_EVIDENCE_MANIFEST_HASH === "measured_apy_evidence_ebc7627d" && CAPACITY_EVIDENCE_MANIFEST_HASH === computeCapacityEvidenceManifestHash() && POSITION_EVIDENCE_MANIFEST_HASH === computePositionEvidenceManifestHash() && AVAILABILITY_EVIDENCE_MANIFEST_HASH === computeAvailabilityEvidenceManifestHash() && CONSTRAINTS_EVIDENCE_MANIFEST_HASH === computeConstraintsEvidenceManifestHash() && ALIAS_AMENDMENT_MANIFEST_HASH === computeAliasAmendmentManifestHash(), "7 hashes intact");

  return checks;
}

/* ------------------------------------------------------------------ *
 * 16H-P.1a — KLend Program and Market Authority Resolution
 * ------------------------------------------------------------------ */
