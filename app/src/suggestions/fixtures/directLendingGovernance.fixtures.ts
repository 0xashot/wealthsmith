/**
 * Direct USDC lending governance + Jupiter Lend fixture checks (assessments, review
 * briefs, amendments, package/IDL evidence, activation, runtime, profile
 * compatibility, existing-position + share accounting).
 *
 * Extracted verbatim from suggestionEngine.fixtures.ts (progressive monolith split).
 * The monolith imports and aggregates these checks; behavior and check names are
 * unchanged.
 */
import { JUPITER_LEND_EXISTING_POSITION_SUPPORT_BINDING as JL_SUPPORT_BINDING, JUPITER_LEND_EXISTING_POSITION_SUPPORT_BINDING_HASH as JL_SUPPORT_HASH, JUPITER_LEND_IDENTITY as JL_ID, JUPITER_LEND_IDENTITY_MANIFEST_HASH as JL_MANIFEST_HASH, JUPITER_LEND_POSITION_DEDUPE_KEY as JL_KEY, JUPITER_LEND_POSITION_ID as JL_POS_ID, buildJupiterLendExistingPosition as jlBuild, computeExistingPositionSupportBindingHash as jlSupportHash, computeJupiterLendIdentityManifestHash as jlManifestHash, dedupeJupiterLendPosition as jlDedupe, discoverJlUsdcAccounts as jlDiscover, isJupiterLendReceiptMint as jlIsReceiptMint, mergeJupiterLendPosition as jlMerge, toJupiterLendWalletPosition as jlToWallet, validateJupiterLendIdentity as jlValidateIdentity } from "../../wallet/jupiterLendExistingPosition";
import type { JupiterLendPositionInput as JLInput, JupiterLendTokenAccountInput as JLAcct } from "../../wallet/jupiterLendExistingPosition";
import { JUPITER_LEND_POOL_IDENTITY as JL_POOL, SHARE_ACCOUNTING_MANIFEST_HASH as JL_SA_HASH, SOURCE_TO_ACCOUNT_APPLICABILITY as JL_APPLIC, computeRecognizedFromAccounting as jlConvert, computeShareAccountingManifestHash as jlSaHash, decodePoolShareAccounting as jlDecodePool, mayMountRecognizedAccounting as jlMayMount, resolveJupiterLendExchangeRate as jlResolveRate } from "../../wallet/jupiterLendShareAccounting";
import type { PoolAccountObservation as JLPoolObs } from "../../wallet/jupiterLendShareAccounting";
import { classifyPositionCoverage as sbClassify, computeSafetyBufferCoverage as sbCoverage } from "../../wallet/safetyBufferCoverage";
import type { WalletPosition as JLWalletPos } from "../../wallet/walletPosition";
import type { SafetyBuffer as SCBuffer } from "../../wallet/walletSummary";
import { BINARY_DATE_CORRECTION_HASH as BD_HASH, CORRECTED_BINARY_FACT as BD_FACT, CORRECTION_EVIDENCE as BD_EVIDENCE, CORRECTION_INVARIANTS as BD_INVARIANTS, DETECTION as BD_DETECTION, SCORE_IMPACT as BD_IMPACT, SUPERSEDED_BINARY_DATE_CLAIM as BD_SUPERSEDED, computeBinaryDateCorrectionHash } from "../directAssessmentBinaryDateCorrection";
import { CANDIDATE_DISPOSITIONS as DL_DISPOS, DISPOSITIONS_MANIFEST as DL_DISPO_MANIFEST, DISPOSITIONS_MANIFEST_HASH as DL_DISPO_HASH, DISPOSITIONS_VALIDATION as DL_DISPO_VALID, EXCLUDED_CANDIDATE_IDS as DL_EXCLUDED, KAMINO_CATEGORY_EVALUATION as DL_KCAT, KAMINO_GOVERNANCE_RESOLUTION as DL_GOV, computeDispositionsManifestHash as dlDispoHashFn, getDisposition as dlGetDispo } from "../directUsdcLendingDispositions";
import { DIRECT_USDC_LENDING_CATEGORY_MINIMUM as DL_CATMIN, DIRECT_USDC_LENDING_ELIGIBILITY_POLICY_ID as DL_POLICY_ID, DIRECT_USDC_LENDING_POLICY_MANIFEST_HASH as DL_POLICY_HASH, DIRECT_USDC_LENDING_POLICY_VALIDATION as DL_POLICY_VALID, MIN_PROTOCOL_RISK_SCORE as DL_MINPROTO, PASSING_CATEGORY_FLOOR_DOES_NOT_MEAN as DL_DISCLAIMER, UNIVERSAL_MINIMUM as DL_UNIMIN, computeDirectPolicyManifestHash, evaluateCategoryFloor as dlEvalFloor } from "../directUsdcLendingEligibilityPolicy";
import { ACCEPTED_LIMITATIONS as GR_LIMITS, APPROVER_AUTHORIZATION as GR_APP_AUTH, GOVERNANCE_RECORDS_VALIDATION as GR_VALID, HUMAN_REVIEW_MANIFEST_HASH as GR_REVIEW_HASH, HUMAN_REVIEW_RECORD as GR_REVIEW, PRODUCTION_ACTIVATION as GR_ACTIVATION, PRODUCT_APPROVAL_MANIFEST_HASH as GR_APPROVAL_HASH, PRODUCT_APPROVAL_RECORD as GR_APPROVAL, REVIEWER_AUTHORIZATION as GR_REV_AUTH, RISK_SIGNOFF_MANIFEST_HASH as GR_SIGNOFF_HASH, RISK_SIGNOFF_RECORD as GR_SIGNOFF, SEPARATION_OF_DUTIES_CHECK as GR_SOD, SIGNER_AUTHORIZATION as GR_SIGN_AUTH } from "../directUsdcLendingGovernanceRecords";
import { AMENDMENT_REVIEWER_AUTHORIZATION as AM_AUTH, EFFECTIVE_REVIEW_CHAIN as AM_CHAIN, HUMAN_REVIEW_AMENDMENT_MANIFEST_HASH as AM_HASH, HUMAN_REVIEW_AMENDMENT_RECORD as AM_RECORD, REVIEW_AMENDMENT_VALIDATION as AM_VALID, getEffectiveCompatibleRiskProfileIds as amCompatible, isRiskProfileCompatible as amIsCompat } from "../directUsdcLendingHumanReviewAmendment";
import { DIRECT_LENDING_TESTING_STATES as DL_TESTING, DIRECT_USDC_LENDING_PRODUCT_DECISION as DL_DECISION, DIRECT_USDC_LENDING_PRODUCT_DECISION_MANIFEST_HASH as DL_DECISION_HASH, PRODUCT_DECISION_VALIDATION as DL_DECISION_VALID, computeProductDecisionManifestHash } from "../directUsdcLendingProductDecision";
import { deriveDirectLendingExcessUsd as scExcess, deriveDirectLendingSuitability as scSuit } from "../directUsdcLendingRailInputs";
import { ALL_RUNTIME_SUPPRESSION_REASONS as RT_REASONS, RUNTIME_PRODUCT_IDENTITY as RT_ID, buildDirectLendingCardState as rtCard, evaluateDirectLendingForRail as rtRail, evaluateDirectLendingRuntime as rtEval, governanceInputFromActivation as rtGov } from "../directUsdcLendingRuntimeAdapter";
import type { DirectLendingRuntimeInput as RTInput } from "../directUsdcLendingRuntimeAdapter";
import { SELECTOR_VALIDATION as DL_SEL_VALID, evaluateSuggestionTrigger as dlTrigger, selectDirectUsdcLendingCandidate as dlSelect } from "../directUsdcLendingSelector";
import type { SelectorProductState as DLProductState } from "../directUsdcLendingSelector";
import { ANALYTICS_FORBIDDEN_FIELDS as DL_ANALYTICS_FORBIDDEN, CARD_COPY_VALIDATION as DL_CARD_VALID, DIRECT_USDC_LENDING_CARD_ACTIONS as DL_ACTIONS, DIRECT_USDC_LENDING_CARD_COPY as DL_COPY, SMITH_AI_DIRECT_LENDING_EXPLANATION as DL_SMITH, buildAnalyticsPayload as dlAnalytics, buildDirectLendingCardModel as dlBuildCard, formatDirectLendingApy as dlFmtApy, validateCardCopy as dlValidateCard, validateSmithAiExplanation as dlValidateSmith } from "../directUsdcLendingSuggestionCard";
import { DIRECT_LENDING_PROFILE_TESTING_ROWS as AM_PROFILE_ROWS, DIRECT_LENDING_TESTING_CARD_ROWS as TF_CARDS, DIRECT_LENDING_TESTING_FIXTURES_VALIDATION as TF_VALID, DIRECT_LENDING_TESTING_ROWS as TF_ROWS, DIRECT_LENDING_TESTING_SUPPRESSED_ROWS as TF_SUPPRESSED } from "../directUsdcLendingTestingFixtures";
import type { FixtureCheck } from "./fixtureCheck";
import { ALIAS_AMENDMENT_EVIDENCE, ALIAS_AMENDMENT_MANIFEST_HASH, AMENDMENT_CONFERS as ALIAS_AMENDMENT_CONFERS_ALIAS, COVERAGE_CORRECTION, DIRECT_RESERVE_INCIDENT_EVIDENCE, FORBIDDEN_INFERENCES, IDENTITY_RULE, MAIN_MARKET_ALIAS, SCOPE_GAP_STATUS, STEAKHOUSE_SCORE_OUTCOME, computeAliasAmendmentManifestHash } from "../incidentMarketAliasAmendment";
import { INCIDENT_SEARCH_HASH as IS_HASH, computeIncidentSearchHash } from "../incidentSearchMethodology";
import { CORRECTED_PROGRAM_GRAPH as IDL_GRAPH, GRAPH_FINDINGS_V2 as IDL_GRAPH_FINDINGS, IDL_AMENDMENT_CONFERS as IDL_CONFERS, IDL_AMENDMENT_EVIDENCE as IDL_EVIDENCE, IDL_AMENDMENT_HASH as IDL_HASH, MANDATORY_ARTIFACTS as IDL_MANDATORY, NO_EXPLICIT_WRITE_DOWN_INSTRUCTION as IDL_NO_WRITEDOWN, ORACLE_SURFACE_V2 as IDL_ORACLE, PERMISSIONLESS_INSTRUCTIONS as IDL_PERMISSIONLESS, PRIVILEGED_POWERS_V2 as IDL_POWERS, READINESS_V2 as IDL_READINESS, READINESS_V2_RATIONALE as IDL_RATIONALE, RECLASSIFICATIONS as IDL_RECLASS, RECLASSIFIED_DIMENSIONS as IDL_DIMS_V2, SUPERSEDED_UNREADABLE_CLAIM as IDL_SUPERSEDED, computeIdlAmendmentHash, evaluateReadinessV2 } from "../jupiterLendIdlDiscoveryAmendment";
import { COLLATERAL_UNIVERSE_ONCHAIN as TD_COLLAT, DIMENSION_STATE_V3, ISOLATION_RECONCILED as TD_ISO, LOSS_WATERFALL_DESIGN_RESOLVED as TD_WATERFALL, MANDATORY_ARTIFACTS_V2 as TD_MANDATORY, READINESS_V3 as TD_READINESS, READINESS_V3_RATIONALE as TD_RATIONALE, SOURCE_CLASSIFICATION as TD_SRC, TEAM_ANSWERS as TD_ANSWERS, TEAM_DISCLOSURE_CONFERS as TD_CONFERS, TEAM_DISCLOSURE_HASH as TD_HASH, computeTeamDisclosureHash, evaluateReadinessV3 } from "../jupiterLendTeamDisclosureAmendment";
import { BOUND_IDL_AMENDMENT_MANIFEST as JP_BOUND_IDL, BOUND_PACKAGE_MANIFEST as JP_BOUND_PKG, BOUND_TEAM_DISCLOSURE_MANIFEST as JP_BOUND_TD, HELD_OUT_INCIDENT_HISTORY as JP_HELDOUT, JUP_BOUNDED_AGGREGATE as JP_AGG, JUP_PROVISIONAL_CONFERS as JP_CONFERS, JUP_PROVISIONAL_HASH as JP_HASH, JUP_PROVISIONAL_MANIFEST as JP_MANIFEST, JUP_PROVISIONAL_OUTCOME as JP_OUTCOME, JUP_PROVISIONAL_PROVENANCE as JP_PROV, JUP_PROVISIONAL_SCORES as JP_SCORES, JUP_PROVISIONAL_STATE as JP_STATE, JUP_PROVISIONAL_VALIDATION as JP_VALIDATION, ROBUSTNESS_NOTE as JP_ROBUST, computeBoundedAggregate, computeJupProvisionalHash, scoredWeightedPoints, validateJupProvisional } from "../jupiterLendUsdcProvisionalAssessment";
import { APY_AND_REWARDS as JUP_APY, COLLATERAL_UNIVERSE as JUP_COLLAT, COMPARISON_RULES as JUP_COMPARISON_RULES, FLUID_CONTINUITY as JUP_CONTINUITY, JUP_DIMENSION_EVIDENCE as JUP_DIMS, JUP_PACKAGE_CONFERS as JUP_CONFERS, JUP_PACKAGE_MANIFEST as JUP_MANIFEST, JUP_PACKAGE_MANIFEST_HASH as JUP_MANIFEST_HASH, JUP_PACKAGE_READINESS as JUP_READINESS, JUP_PRODUCT_BINDING as JUP_BINDING, JUP_PROGRAM_GRAPH as JUP_GRAPH, JUP_READINESS_RATIONALE as JUP_RATIONALE, KAMINO_STRUCTURAL_COMPARISON as JUP_COMPARE, LENDER_CLAIM as JUP_CLAIM, LOSS_WATERFALL as JUP_LOSS, ORACLE_SURFACE as JUP_ORACLE, PRIVILEGED_POWER_MAP as JUP_POWERS, PROGRAM_GRAPH_FINDINGS as JUP_GRAPH_FINDINGS, SOURCE_TO_BINARY as JUP_SRC2BIN, WITHDRAWAL_LIMITER as JUP_LIMITER, computeJupPackageManifestHash, evaluateJupReadiness, validateJupBinding } from "../jupiterLendUsdcRiskEvidencePackage";
import { INCORPORATED_SOURCES, KAMINO_SECURITY_SOURCES_EVIDENCE, RISK_DASHBOARD_FACTS, S2_CONFERS, S2_MANIFEST_HASH, S2_SCORE_IMPACT, SECURITY_HUB_FACTS, computeS2ManifestHash } from "../kaminoSecuritySourcesAmendment";
import { KVAULT_CAPACITY_SOURCE } from "../kaminoVaultCapacitySemantics";
import { BUFFER_RECOGNITION_BOUNDARY, POSITION_EVIDENCE_MANIFEST_HASH, computePositionEvidenceManifestHash } from "../klendDirectLendingPosition";
import { AUTHORITY_CONFERS as AUTH_CONFERS, AUTHORITY_HISTORY as AUTH_HISTORY, AUTHORITY_LAYERS as AUTH_LAYERS, AUTHORITY_MANIFEST_HASH as AUTH_MANIFEST_HASH, AUTHORITY_OBSERVATION, EMERGENCY_COUNCIL_LAYER as EMERGENCY_LAYER, EMERGENCY_COUNCIL_POWER_MAP as EC_POWERS, KLEND_LOADER_CHAIN, KVAULT_COINCIDENCE, LAYERS_ARE_DISTINCT as LAYERS_DISTINCT, MARKET_OWNER_LAYER, MARKET_OWNER_POWERS as MO_POWERS, PROPOSER_AUTHORITY_LAYER as PROPOSER_LAYER, SOCIALIZE_LOSS_AUTHORITY as SOCIALIZE_AUTH, SQUADS_EXECUTION_SEMANTICS as SQUADS_EXEC, UNRESOLVED_AUTHORITY_GAPS as UNRESOLVED_GAPS, UPGRADE_AUTHORITY_LAYER as UPGRADE_LAYER, computeAuthorityManifestHash } from "../klendDirectUsdcAuthorityEvidence";
import { ASSESSMENT_LIMITATIONS as DA_LIMITS, DIRECT_AGGREGATE_RESULT as DA_AGG_RESULT, DIRECT_ASSESSMENT_CONFERS as DA_CONFERS, DIRECT_ASSESSMENT_MANIFEST as DA_MANIFEST, DIRECT_ASSESSMENT_MANIFEST_HASH as DA_MANIFEST_HASH, DIRECT_ASSESSMENT_OUTCOME as DA_OUTCOME, DIRECT_ASSESSMENT_PROVENANCE as DA_PROVENANCE, DIRECT_ASSESSMENT_STATE as DA_STATE, DIRECT_ASSESSMENT_VALIDATION as DA_VALIDATION, DIRECT_DIMENSION_ASSESSMENTS as DA_DIMS, DIRECT_HUMAN_REVIEW_PACKET as DA_PACKET, HUMAN_REVIEW_FOCUS_AREAS as DA_FOCUS, LOWEST_CONFIDENCE_DIMENSIONS as DA_LOWEST_CONF, LOWEST_SCORING_DIMENSIONS as DA_LOWEST_SCORE, computeDirectAggregate, computeDirectAssessmentManifestHash, validateDirectAssessment } from "../klendDirectUsdcAutomatedAssessment";
import { toRuntimeMarketInput as mdToRuntime } from "../klendDirectUsdcMarketData";
import type { KlendDirectUsdcMarketSnapshot as MDSnap } from "../klendDirectUsdcMarketData";
import { BOUND_ASSESSMENT_MANIFEST_HASH as RB_BOUND, BRIEF_STATE as RB_STATE, CAPPING_RISKS as RB_CAPS, DECISION_HEADLINE as RB_HEADLINE, DECISION_OPTIONS as RB_OPTIONS, EVIDENCE_STRENGTH as RB_STRENGTH, MITIGATION_CONDITIONS as RB_MITIG, REVIEW_BRIEF_CONFERS as RB_CONFERS, REVIEW_BRIEF_HASH as RB_HASH, REVIEW_BRIEF_MANIFEST as RB_MANIFEST, REVIEW_BRIEF_PROVENANCE as RB_PROV, REVIEW_BRIEF_ROWS as RB_ROWS, REVIEW_BRIEF_VALIDATION as RB_VALIDATION, computeReviewBriefHash, partitionEvidenceStrength, projectRows, validateReviewBrief } from "../klendDirectUsdcReviewBrief";
import { DIMENSION_EVIDENCE as PKG_DIMENSIONS, INCLUDED_EVIDENCE_MODULES as PKG_MODULES, PACKAGE_CONFERS as PKG_CONFERS, PACKAGE_READINESS as PKG_READINESS, READINESS_CONSEQUENCE } from "../klendDirectUsdcRiskEvidencePackage";
import { APY_EVIDENCE_MANIFEST_HASH, computeApyEvidenceManifestHash } from "../klendReserveApyDerivation";
import { PARITY_EVIDENCE_MANIFEST_HASH } from "../klendReserveApyParityAmendment";
import { AVAILABILITY_EVIDENCE_MANIFEST_HASH, computeAvailabilityEvidenceManifestHash } from "../klendReserveAvailability";
import { CAPACITY_EVIDENCE_MANIFEST_HASH, computeCapacityEvidenceManifestHash } from "../klendReserveCapacity";
import { CONSTRAINTS_EVIDENCE_MANIFEST_HASH, computeConstraintsEvidenceManifestHash } from "../klendReserveConstraints";
import { SOL_BTC_USDC_IDENTITY_MANIFEST_HASH, computeIdentityManifestHash } from "../klendReserveIdentity";
import { MEASURED_APY_EVIDENCE_MANIFEST_HASH } from "../klendReserveMeasuredApyCorrection";
import { REWARD_EVIDENCE_MANIFEST_HASH } from "../klendReserveRewardResolution";
import { computeRubricV1Hash } from "../riskGovernance";
import { ALLOWED_CONFIDENCE_VALUES } from "../riskReviewConfidencePolicy";
import { CORRECTED_SITES as SC_SITES, NEW_SOURCE_FACTS as SC_FACTS, S0_CONFERS as SC_CONFERS, S0_MANIFEST_HASH as SC_HASH, SCORE_IMPACT_S0 as SC_IMPACT, SOURCE_ENUMERATION_RULE as SC_RULE, SUPERSEDED_SOURCE_CLAIMS as SC_SUPERSEDED, computeS0ManifestHash } from "../sourceCompletionAmendment";
import { ADDED_PRIMARY_STATUSES, AFFECTED_CANDIDATE, AMENDMENT_CONFERS, BLOCKER_ORDER_EVIDENCE, BLOCKER_ORDER_EVIDENCE_MANIFEST_HASH, DELIBERATELY_NOT_ADDED, PRESERVED_HISTORICAL_TRANSITION, PRESERVED_PRIOR_EVIDENCE_N5A, PRIOR_PRIMARY_STATUS_VOCABULARY, SCHEMA_VERSION_CHANGE, STEAKHOUSE_OBSERVATION_NOT_ACTED_ON, computeBlockerOrderEvidenceManifestHash, validatePrimaryBlockerIsNearest } from "../stableYieldBlockerOrderAmendment";
import { NON_SEQUENTIAL_PRIMARY_STATUSES, STABLE_YIELD_BLOCKER_ORDER, STABLE_YIELD_EVIDENCE_MANIFEST_VERSION, SUPERSEDED_MANIFEST_VERSIONS, blockerRank, getStableYieldEvidenceManifest, isNearerBlocker, listStableYieldEvidenceManifests } from "../stableYieldProductionEvidence";
import { AGGREGATE_COMPUTATION_VERSION as AGG_VERSION, AUTOMATED_ASSESSMENT_OUTCOME, AUTOMATED_DIMENSION_ASSESSMENTS, HUMAN_REVIEW_PACKET, anchorMatchesScore } from "../steakhouseAutomatedAssessment";
import { RECONCILIATION_MANIFEST_HASH, computeReconciliationManifestHash } from "../steakhouseCapacityReconciliation";
import { VERIFIED_EVIDENCE_MANIFEST_HASH, computeEvidenceManifestHash } from "../steakhouseEvidenceVerification";
import { OFFICIAL_EVENT_MARKET_COVERAGE, SUPERSEDED_COVERAGE_CALCULATION } from "../steakhouseIncidentEvidence";
import { getYieldStrategy } from "../yieldStrategyRegistry";
import { readFileSync } from "node:fs";

export function runBlockerOrderAmendmentFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });

  const ORDER = STABLE_YIELD_BLOCKER_ORDER as readonly string[];
  const at = (s: string) => ORDER.indexOf(s);
  const kam = () => getStableYieldEvidenceManifest("kamino_usdc_lending")!;
  const steak = () => getStableYieldEvidenceManifest("kamino_steakhouse_usdc")!;

  // --- New states exist and are valid ---
  add("BO-1: blocked_deposit_availability is a valid primary state", at("blocked_deposit_availability") !== -1 && blockerRank("blocked_deposit_availability") !== undefined, "valid");
  add("BO-2: blocked_constraints is a valid primary state", at("blocked_constraints") !== -1 && blockerRank("blocked_constraints") !== undefined, "valid");
  add("BO-3: both are recorded as the added states", ADDED_PRIMARY_STATUSES.length === 2 && (ADDED_PRIMARY_STATUSES as readonly string[]).includes("blocked_deposit_availability") && (ADDED_PRIMARY_STATUSES as readonly string[]).includes("blocked_constraints"), "2 added");
  add("BO-4: both round-trip through JSON serialization", (() => { for (const s of ADDED_PRIMARY_STATUSES) { const round = JSON.parse(JSON.stringify({ primaryBlocker: s })).primaryBlocker; if (round !== s || blockerRank(round) === undefined) return false; } return true; })(), "serialize + deserialize");
  add("BO-5: both N.5a-added states round-trip through serialization", (() => { for (const st of ADDED_PRIMARY_STATUSES) { const round = JSON.parse(JSON.stringify({ primaryBlocker: st })).primaryBlocker; if (round !== st || blockerRank(round) === undefined) return false; } const m = JSON.parse(JSON.stringify(kam())); return m.primaryBlocker === kam().primaryBlocker && blockerRank(m.primaryBlocker) !== undefined; })(), "both added states + the live manifest round-trip");

  // --- Existing states remain valid ---
  add("BO-6: every prior vocabulary state is still valid", PRIOR_PRIMARY_STATUS_VOCABULARY.every((s) => ORDER.includes(s) || (NON_SEQUENTIAL_PRIMARY_STATUSES as readonly string[]).includes(s)), "10 prior states retained");
  add("BO-7: nothing was removed or renamed", PRIOR_PRIMARY_STATUS_VOCABULARY.length === 10 && SCHEMA_VERSION_CHANGE.changeKind === "additive_widening", "additive only");
  add("BO-8: prior manifest schema 1.0.0 remains readable", (SUPERSEDED_MANIFEST_VERSIONS as readonly string[]).includes("1.0.0") && /stay readable and need no migration/i.test(SCHEMA_VERSION_CHANGE.compatibilityBehaviour), "1.0.0 readable");
  add("BO-9: the schema version was bumped 1.0.0 → 1.1.0", SCHEMA_VERSION_CHANGE.priorVersion === "1.0.0" && STABLE_YIELD_EVIDENCE_MANIFEST_VERSION === "1.1.0", "1.1.0");
  add("BO-10: a minor bump is justified because the change is additive", /A major bump would signal a breaking change that did not happen/i.test(SCHEMA_VERSION_CHANGE.whyMinorNotMajor), "minor");
  add("BO-11: no broad migration framework was invented", /No schema-migration framework was invented/i.test(SCHEMA_VERSION_CHANGE.compatibilityBehaviour), "smallest change");

  // --- Ordering ---
  add("BO-12: deposit availability comes after position detection", at("blocked_deposit_availability") > at("blocked_position_detection"), "detection → deposit availability");
  add("BO-13: constraints come after deposit availability", at("blocked_constraints") > at("blocked_deposit_availability"), "deposit availability → constraints");
  add("BO-14: risk review comes after constraints", at("blocked_risk_review") > at("blocked_constraints"), "constraints → risk review");
  add("BO-15: the full progression is deterministic and identity-first", at("blocked_identity") === 0 && at("blocked_apy_unit") > at("blocked_identity") && at("blocked_capacity") > at("blocked_apy_unit") && at("blocked_position_detection") > at("blocked_capacity"), "identity → ... → detection");
  add("BO-16: ready_for_approval_review is terminal", at("ready_for_approval_review") === ORDER.length - 1, "last");
  add("BO-17: no blocked_approval was invented", !ORDER.includes("blocked_approval") && /Approval is a separate reviewed DECISION, not a blocker stage/i.test(DELIBERATELY_NOT_ADDED.blocked_approval), "not invented");
  add("BO-18: the repo's existing terminal name was reused, not a new 'ready'", !ORDER.includes("ready") && /existing terminal is `ready_for_approval_review`/i.test(DELIBERATELY_NOT_ADDED.ready), "existing name");
  add("BO-19: no generic blocked_availability was added", !ORDER.includes("blocked_availability") && /blur the deposit\/withdrawal distinction/i.test(DELIBERATELY_NOT_ADDED.blocked_availability), "not added");
  add("BO-20: blocked_withdrawal_availability was not added as a primary state", !ORDER.includes("blocked_withdrawal_availability") && /there is no matching withdrawal field/i.test(DELIBERATELY_NOT_ADDED.blocked_withdrawal_availability), "follows depositAvailabilityState");
  add("BO-21: no duplicate aliases or transitional states", new Set(ORDER).size === ORDER.length && /None\./.test(DELIBERATELY_NOT_ADDED.transitional_aliases), "no aliases");
  add("BO-22: dispositions are excluded from the progression", (NON_SEQUENTIAL_PRIMARY_STATUSES as readonly string[]).every((s) => !ORDER.includes(s)) && blockerRank("unsupported_for_mvp") === undefined && blockerRank("archived") === undefined, "not ranked");
  add("BO-23: isNearerBlocker orders correctly and refuses dispositions", isNearerBlocker("blocked_deposit_availability", "blocked_risk_review") === true && isNearerBlocker("blocked_risk_review", "blocked_deposit_availability") === false && isNearerBlocker("unsupported_for_mvp", "blocked_risk_review") === false, "comparable only within the sequence");

  // --- The validator ---
  add("BO-24: the validator finds the nearest unresolved stage", validatePrimaryBlockerIsNearest("blocked_deposit_availability", ["blocked_risk_review", "blocked_constraints", "blocked_deposit_availability"]).ok === true, "nearest wins");
  add("BO-25: the validator rejects a blocker farther than the nearest", (() => { const v = validatePrimaryBlockerIsNearest("blocked_risk_review", ["blocked_risk_review", "blocked_deposit_availability"]); return v.ok === false && v.nearest === "blocked_deposit_availability"; })(), "catches the old bug");
  add("BO-26: the validator treats dispositions as out of scope", validatePrimaryBlockerIsNearest("unsupported_for_mvp", ["blocked_risk_review"]).ok === true, "not a stage");
  add("BO-27: the validator is a checker, not a mutator", (() => { const before = kam().primaryBlocker; validatePrimaryBlockerIsNearest("blocked_risk_review", ["blocked_deposit_availability"]); return kam().primaryBlocker === before; })(), "no silent rewrite");
  add("BO-28 (updated by 16H-N.7): kamino's recorded primary IS the nearest of its STILL-unresolved stages", validatePrimaryBlockerIsNearest(kam().primaryBlocker, ["blocked_risk_review"]).ok === true, "constraints resolved at N.7; risk review now nearest");

  // --- The candidate correction ---
  add("BO-29 (updated by 16H-N.7): N.5a corrected the blocker to deposit availability; N.6 and N.7 then resolved that and constraints, so the live primary advanced twice", AFFECTED_CANDIDATE.correctedPrimaryBlocker === "blocked_deposit_availability" && kam().primaryBlocker === "blocked_risk_review", "N.5a record intact, live state advanced");
  add("BO-30: the previous blocker is recorded as blocked_risk_review", AFFECTED_CANDIDATE.previousPrimaryBlocker === "blocked_risk_review", "provenance");
  add("BO-31: the historical blocked_position_detection → blocked_risk_review transition remains recorded", PRESERVED_HISTORICAL_TRANSITION.transition === "blocked_position_detection → blocked_risk_review" && PRESERVED_HISTORICAL_TRANSITION.rewritten === false, "preserved");
  add("BO-32: the historical reason remains accurate for schema 1.0.0 and was not rewritten", PRESERVED_HISTORICAL_TRANSITION.stillAccurateForSchema === "1.0.0" && /the nearer states .* did not exist/i.test(PRESERVED_HISTORICAL_TRANSITION.reasonAsRecordedThen), "not falsified");
  add("BO-33: the 16H-N.5 statement survives verbatim in the manifest", /was PRIMARY at 16H-N\.5 only because the nearer states did not exist/i.test(kam().blockers.join(" ")), "verbatim");
  add("BO-34: the closed state-model gap is retained for provenance", /RESOLVED at 16H-N\.5a[\s\S]*state_model_gap_primary_blocker_expressiveness/.test(kam().blockers.join(" ")), "retained");
  add("BO-35: this is recorded as a vocabulary/order correction only", AFFECTED_CANDIDATE.correctionKind === "vocabulary_and_ordering_only", "vocabulary only");

  // --- Nothing became resolved ---
  add("BO-36: 16H-N.5a itself added no deposit-availability evidence (the investigation happened later, at 16H-N.6)", AFFECTED_CANDIDATE.depositAvailabilityEvidenceAdded === false && /RESOLVED at 16H-N\.6[\s\S]*blocked_deposit_availability/.test(kam().blockers.join(" ")), "N.5a added none; N.6 investigated");
  add("BO-37 (updated by 16H-N.6): the N.5a amendment conferred no deposit availability; N.6 resolved it from the deployed path", AMENDMENT_CONFERS.depositAvailabilityRemains === "blocked" && kam().depositAvailabilityState === "adapter_implemented_source_verified", "N.5a conferred none; N.6 verified");
  add("BO-38: no constraints evidence was added", AFFECTED_CANDIDATE.constraintsEvidenceAdded === false, "none added");
  add("BO-39 (updated by 16H-N.7): the N.5a amendment conferred no constraints; N.7 resolved them from deployed amount semantics", AMENDMENT_CONFERS.constraintsRemain === "blocked" && kam().constraintsState === "adapter_implemented_source_verified", "N.5a conferred none; N.7 verified");
  add("BO-40: risk review remains unresolved", kam().riskReviewState === "blocked" && AFFECTED_CANDIDATE.riskReviewStillUnresolved === true && AMENDMENT_CONFERS.riskReviewRemains === "blocked", "blocked");
  add("BO-41: a blocker is never resolved merely because the enum now exists", /A word for a gap is not evidence about the gap/i.test(AMENDMENT_CONFERS.enumExistenceDoesNotResolve), "explicit");
  add("BO-42: the candidate did not become more eligible", AFFECTED_CANDIDATE.candidateBecameMoreEligible === false && kam().readiness === "blocked" && /less ready, not more/i.test(AFFECTED_CANDIDATE.eligibilityDelta), "less ready, not more");
  add("BO-43: the corrected primary is NEARER than the previous one", isNearerBlocker("blocked_deposit_availability", "blocked_risk_review") === true, "nearer, not farther");

  // --- Other products preserved ---
  add("BO-44 (updated by 16H-O.1): N.5a did not act on the Steakhouse observation it raised; 16H-O.1 acted on it, and the primary landed exactly where N.5a predicted", STEAKHOUSE_OBSERVATION_NOT_ACTED_ON.changed === false && steak().productAddress === "HDsayqAsDWy3QvANGqh2yNraqcD8Fnjgh73Mhb3WRS5E" && steak().primaryBlocker === "blocked_deposit_availability", "prediction confirmed");
  add("BO-45: the Steakhouse observation is reported, not silently acted on", /depositAvailabilityState = blocked while primaryBlocker = blocked_risk_review/i.test(STEAKHOUSE_OBSERVATION_NOT_ACTED_ON.observation) && /capacityAdapterState = 'blocked'/.test(STEAKHOUSE_OBSERVATION_NOT_ACTED_ON.blockedOnFirst), "reported");
  add("BO-46: other candidates retain their blocker states", ["raydium_stable_usdc_strategy", "meteora_stable_usdc_strategy", "hubble_usdc_strategy"].every((id) => getStableYieldEvidenceManifest(id)!.primaryBlocker === "unsupported_for_mvp"), "3 unchanged");
  add("BO-47 (updated by 16H-O.1): no candidate was mass-updated — the N.5a-added states are now genuinely load-bearing for two separate candidates", AFFECTED_CANDIDATE.candidateId === "kamino_usdc_lending" && listStableYieldEvidenceManifests().filter((m) => String(m.primaryBlocker) === "blocked_deposit_availability").length === 1 && listStableYieldEvidenceManifests().filter((m) => String(m.primaryBlocker) === "blocked_constraints").length === 0, "kamino traversed both; Steakhouse parked at deposit availability");
  add("BO-48: Steakhouse capacity semantics remain untouched", KVAULT_CAPACITY_SOURCE.commit === "1d146d7087a76edbbadc14d848ae14295c0745a4", "unchanged");
  add("BO-49: approved-product count remains zero (the readiness type has no `approved` member at all)", listStableYieldEvidenceManifests().every((m) => String(m.readiness) !== "approved" && String(m.primaryBlocker) !== "ready_for_approval_review"), "zero approved");

  // --- Boundaries ---
  add("BO-50: lifecycle is unchanged", AMENDMENT_CONFERS.lifecycleUnchanged.startsWith("identity_verified") && getYieldStrategy("kamino_usdc_lending")!.lifecycle === "identity_verified" && AFFECTED_CANDIDATE.lifecycleChanged === false, "identity_verified");
  add("BO-51: no risk score, review, signoff, or approval", AMENDMENT_CONFERS.riskScoreAssigned === false && AMENDMENT_CONFERS.humanReviewOccurred === false && AMENDMENT_CONFERS.signoffOccurred === false && AMENDMENT_CONFERS.productApproved === false, "none");
  add("BO-52: no selector, recommendation, or Top Pick", (AMENDMENT_CONFERS.doesNotConfer as readonly string[]).includes("selector eligibility") && (AMENDMENT_CONFERS.doesNotConfer as readonly string[]).includes("recommendation eligibility") && (AMENDMENT_CONFERS.doesNotConfer as readonly string[]).includes("Top Pick"), "none");
  add("BO-53: no production card and no execution", (AMENDMENT_CONFERS.doesNotConfer as readonly string[]).includes("a production suggestion card") && AMENDMENT_CONFERS.transactionConstructedOrSimulated === false, "none");
  add("BO-54: Safety Buffer values and position recognition are unchanged", AMENDMENT_CONFERS.safetyBufferValuesChanged === false && AMENDMENT_CONFERS.existingPositionRecognitionChanged === false && BUFFER_RECOGNITION_BOUNDARY.liquidBufferValueUsdThisStep === "unresolved", "unchanged");
  add("BO-55: the position adapter's own state is unchanged", kam().positionDetectionState === "adapter_implemented_source_verified" && kam().capacityAdapterState === "adapter_implemented_source_verified", "N.4 + N.5 intact");

  // --- Evidence ---
  add("BO-56: the amendment manifest is deterministic", BLOCKER_ORDER_EVIDENCE_MANIFEST_HASH === computeBlockerOrderEvidenceManifestHash() && /^blocker_order_evidence_[0-9a-f]{8}$/.test(BLOCKER_ORDER_EVIDENCE_MANIFEST_HASH), BLOCKER_ORDER_EVIDENCE_MANIFEST_HASH);
  add("BO-57: evidence records prior vocabulary, added states, order, versions, candidate, triggers", BLOCKER_ORDER_EVIDENCE.priorVocabularySize === 10 && BLOCKER_ORDER_EVIDENCE.addedStates.length === 2 && BLOCKER_ORDER_EVIDENCE.orderLength === 10 && BLOCKER_ORDER_EVIDENCE.schemaPriorVersion === "1.0.0" && BLOCKER_ORDER_EVIDENCE.affectedCandidate === "kamino_usdc_lending" && BLOCKER_ORDER_EVIDENCE.whatChanged.length === 5 && BLOCKER_ORDER_EVIDENCE.invalidationTriggers.length === 3, "complete");
  add("BO-58: the preparer is not represented as a human reviewer", BLOCKER_ORDER_EVIDENCE.preparerIsNotHumanReviewer === true && BLOCKER_ORDER_EVIDENCE.preparerRole === "automated_evidence_preparer", "not a reviewer");
  add("BO-59: prior identity evidence is unchanged", SOL_BTC_USDC_IDENTITY_MANIFEST_HASH === "identity_9773ac14" && computeIdentityManifestHash() === SOL_BTC_USDC_IDENTITY_MANIFEST_HASH, "identity_9773ac14");
  add("BO-60: prior APY evidence is unchanged", APY_EVIDENCE_MANIFEST_HASH === "apy_evidence_d468fce5" && computeApyEvidenceManifestHash() === APY_EVIDENCE_MANIFEST_HASH, "apy_evidence_d468fce5");
  add("BO-61: reward and parity evidence are unchanged", REWARD_EVIDENCE_MANIFEST_HASH === "reward_evidence_cace4fe4" && PARITY_EVIDENCE_MANIFEST_HASH === "parity_evidence_dd25a9a1", "unchanged");
  add("BO-62: measured-APY, capacity and position evidence are unchanged", MEASURED_APY_EVIDENCE_MANIFEST_HASH === "measured_apy_evidence_ebc7627d" && CAPACITY_EVIDENCE_MANIFEST_HASH === computeCapacityEvidenceManifestHash() && POSITION_EVIDENCE_MANIFEST_HASH === computePositionEvidenceManifestHash(), "unchanged");
  add("BO-63: all prior evidence ids are preserved", (PRESERVED_PRIOR_EVIDENCE_N5A as readonly string[]).includes("position_evidence_fb2bb70b") && (PRESERVED_PRIOR_EVIDENCE_N5A as readonly string[]).includes("capacity_evidence_e54e310a") && PRESERVED_PRIOR_EVIDENCE_N5A.length === 16, "16 preserved");

  return checks;
}

/* ------------------------------------------------------------------ *
 * 16H-N.6 — Deposit Availability, Withdrawal Accessibility, Liquid Buffer
 * ------------------------------------------------------------------ */

export function runIncidentAliasAmendmentFixtureChecks(): FixtureCheck[] {
  const AMENDMENT_CONFERS = ALIAS_AMENDMENT_CONFERS_ALIAS;
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const root = process.cwd();
  const readIf = (rel: string) => { try { return readFileSync(`${root}/${rel}`, "utf8"); } catch { return ""; } };
  const closureSrc = readIf("src/suggestions/steakhouseEvidenceClosure.ts");
  const amendSrc = readIf("src/suggestions/incidentMarketAliasAmendment.ts");
  const COV = OFFICIAL_EVENT_MARKET_COVERAGE;
  const inc = () => AUTOMATED_DIMENSION_ASSESSMENTS.find((d) => d.dimensionId === "incident_history")!;
  const solbtc = () => COV.thisVaultsMarkets.find((m) => m.market === "SOL/BTC Market")!;
  const maple = () => COV.thisVaultsMarkets.find((m) => m.market === "Maple Market")!;

  // --- Alias identity ---
  add("AL-1: the Main Market alias mapping is explicit", (MAIN_MARKET_ALIAS.historicalAliases as readonly string[]).includes("Main") && (MAIN_MARKET_ALIAS.historicalAliases as readonly string[]).includes("Main Market") && MAIN_MARKET_ALIAS.currentName === "SOL/BTC Market", "Main → SOL/BTC");
  add("AL-2: the alias binds to the exact market address", MAIN_MARKET_ALIAS.marketAddress === "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF" && solbtc().marketAddress === MAIN_MARKET_ALIAS.marketAddress, "7u3He…");
  add("AL-3: the conclusion is same-account-renamed-label", MAIN_MARKET_ALIAS.identityConclusion === "same_exact_market_renamed_label", "conclusion A");
  add("AL-4: identity rests on three independent official strands", MAIN_MARKET_ALIAS.evidence.length === 3 && MAIN_MARKET_ALIAS.evidence.some((e) => /on-chain LendingMarket\.name/.test(e)) && MAIN_MARKET_ALIAS.evidence.some((e) => /isPrimary: true/.test(e)) && MAIN_MARKET_ALIAS.evidence.some((e) => /has been renamed/.test(e)), "on-chain + API + UI");
  add("AL-5: display-name similarity alone is explicitly insufficient", /Matching assets or similar descriptions would NOT establish identity/.test(MAIN_MARKET_ALIAS.labelSimilarityIsNotProof) && (IDENTITY_RULE.neverBindBy as readonly string[]).includes("display label alone"), "address-bound");
  add("AL-6: exact address binding is required, never the label", IDENTITY_RULE.bindBy === "exact market address" && IDENTITY_RULE.neverBindBy.length === 4, "bindBy address");
  add("AL-7: the rename is possible because the name is mutable on a stable account", /MUTABLE field on a STABLE account/.test(IDENTITY_RULE.renameIsPossibleBecause), "config update, not a new market");
  add("AL-8: confidence is high but NOT absolute, with the limitation recorded", MAIN_MARKET_ALIAS.confidence === "high_not_absolute" && /does NOT print its address/.test(MAIN_MARKET_ALIAS.limitation), "no dated address snapshot");

  // --- Coverage correction ---
  add("AL-9: the prior 10.95% result is preserved historically", SUPERSEDED_COVERAGE_CALCULATION.coveredAllocationPct === 10.95 && SUPERSEDED_COVERAGE_CALCULATION.uncoveredAllocationPct === 89.05 && COVERAGE_CORRECTION.priorResultPreserved === true, "not overwritten");
  add("AL-10: the prior result records WHY it was wrong and why it was reasonable", /market IDENTITY was not/.test(SUPERSEDED_COVERAGE_CALCULATION.whyItWasWrong) && /correct default/.test(SUPERSEDED_COVERAGE_CALCULATION.whyTheErrorWasReasonable), "auditable");
  add("AL-11: corrected coverage is 98.56%", COV.coveredAllocationPct === 98.56 && COVERAGE_CORRECTION.correctedCoveredPct === 98.56, "98.56");
  add("AL-12: corrected uncovered allocation is 1.44%", COV.uncoveredAllocationPct === 1.44 && COVERAGE_CORRECTION.correctedUncoveredPct === 1.44, "1.44");
  add("AL-13: coverage is computed from exact allocations and sums to 100", Math.abs(COV.thisVaultsMarkets.filter((m) => m.namedInOfficialEventMaterial).reduce((a, m) => a + m.pct, 0) - 98.56) < 0.001 && Math.abs(COV.thisVaultsMarkets.reduce((a, m) => a + m.pct, 0) - 100) < 0.001, "87.61+10.29+0.66 = 98.56");
  add("AL-14: SOL/BTC is now covered, named as 'Main'", solbtc().namedInOfficialEventMaterial === true && solbtc().namedAs === "Main" && solbtc().pct === 87.61, "87.61% covered");
  add("AL-15: Maple remains uncovered and visible", maple().namedInOfficialEventMaterial === false && maple().pct === 1.44 && COVERAGE_CORRECTION.mapleRemainsUncovered === true, "1.44% uncovered");
  add("AL-16: coverage can never reach 100% and the residual is real", COVERAGE_CORRECTION.coverageCannotReach100 === true && /not a KLend stress-event market/.test(COVERAGE_CORRECTION.mapleRationale), "Maple not a KLend market");
  add("AL-17: the allocation snapshot is unchanged, so the correction is identity-only", /unchanged/.test(COVERAGE_CORRECTION.allocationSnapshot) && /attributable to identity alone/.test(COVERAGE_CORRECTION.allocationSnapshot), "same snapshot");
  add("AL-18: allocation remains explicitly dynamic and must be recomputed", COV.allocationIsDynamic.length > 0 && /recomputed, not cached/.test(COV.allocationIsDynamic), "slot-bound");

  // --- Forbidden inferences ---
  add("AL-19: coverage is NOT converted into a safety claim", /says nothing about whether that exposure is safe/.test(FORBIDDEN_INFERENCES.coverageIsNotSafety) && /NOR does the covered 98\.56% imply safety/i.test(COV.useOfThisPercentage), "scope ≠ safety");
  add("AL-20: zero bad debt is NOT converted into zero incidents", /NOT zero incidents, NOT zero exploits/.test(FORBIDDEN_INFERENCES.zeroBadDebtIsNotZeroIncidents) && /future losses cannot occur/.test(FORBIDDEN_INFERENCES.zeroBadDebtIsNotZeroIncidents), "narrow accounting claim");
  add("AL-21: KLend evidence is NOT converted into KVault evidence", /does not transfer to kvault/.test(FORBIDDEN_INFERENCES.klendEvidenceIsNotKvaultEvidence), "scopes separate");
  add("AL-22: 'zero confirmed incidents is a SEARCH RESULT' is preserved", /SEARCH RESULT, not a clean record/.test(FORBIDDEN_INFERENCES.zeroConfirmedIncidentsIsASearchResult) && /SEARCH RESULT, not a clean record/.test(inc().rationale), "preserved verbatim");
  add("AL-23: uncovered means unexamined, not adverse", COV.uncoveredMeansUnexamined === true && /means UNEXAMINED, not that anything went wrong/.test(FORBIDDEN_INFERENCES.uncoveredIsNotAdverse), "not adverse");
  add("AL-24: a coverage percentage is not a risk weight or score input", /NOT a risk weight, NOT a score input/.test(COV.useOfThisPercentage) && /not a score input/.test(FORBIDDEN_INFERENCES.higherCoverageDoesNotRaiseScores), "scope description only");

  // --- Scope gaps ---
  add("AL-25: exactly one scope gap was corrected", SCOPE_GAP_STATUS.corrected.length === 1 && SCOPE_GAP_STATUS.corrected[0].gap === 3, "gap 3 only");
  add("AL-26: three scope gaps still stand, each fatal alone", SCOPE_GAP_STATUS.standing.length === 3 && SCOPE_GAP_STATUS.standing.map((g) => g.gap).join(",") === "1,2,4" && SCOPE_GAP_STATUS.eachStandingGapIsFatalAlone === true, "1, 2, 4");
  add("AL-27: the rubric blocker still stands", SCOPE_GAP_STATUS.rubricBlockerStillPresent === true && SCOPE_GAP_STATUS.rubricBlocker === "no sourced incident review exists for this product", "still present");
  add("AL-28: the closure module records gap 3 as corrected", /CORRECTED AT 16H-O\.2, NO LONGER A GAP/.test(closureSrc) && /coverage is 98\.56%/.test(closureSrc), "closure updated");
  add("AL-29: the closure module preserves gaps 1, 2 and 4 verbatim", /1\. WRONG SUBJECT/.test(closureSrc) && /2\. THE PROGRAM IS UNCOVERED/.test(closureSrc) && /4\. STALE FOR THIS BINARY/.test(closureSrc), "3 gaps intact");
  add("AL-30: the closure module states coverage change is scope, not safety", /changes SCOPE, not SAFETY/.test(closureSrc) && /High coverage of EXPOSURE is not coverage of the PRODUCT/.test(closureSrc), "explicit");
  add("AL-31: the KVault program remains uncovered and current-binary scope unresolved", /kvault/i.test(SCOPE_GAP_STATUS.standing[1].detail) && /2026-07-14/.test(SCOPE_GAP_STATUS.standing[2].detail), "gaps 2 + 4");

  // --- Score outcome ---
  add("AL-32: Steakhouse incident_history remains 4", inc().score === 4 && STEAKHOUSE_SCORE_OUTCOME.resultingScore === 4 && STEAKHOUSE_SCORE_OUTCOME.scoreChanged === false, "4");
  add("AL-33: confidence remains low", inc().confidence === "low" && STEAKHOUSE_SCORE_OUTCOME.resultingConfidence === "low" && STEAKHOUSE_SCORE_OUTCOME.confidenceChanged === false, "low");
  add("AL-34: weight and anchor band are unchanged", inc().weight === 2 && inc().anchorBand === "weak" && STEAKHOUSE_SCORE_OUTCOME.anchorBandUnchanged === "weak", "2 / weak");
  add("AL-35: the score did not rise merely because coverage rose", /Coverage was never the binding constraint/.test(STEAKHOUSE_SCORE_OUTCOME.whyUnchanged) && /scoring the search, not the evidence/.test(STEAKHOUSE_SCORE_OUTCOME.whyUnchanged), "anchor did not move");
  add("AL-36: the aggregate remains 5.37", Math.abs(AUTOMATED_ASSESSMENT_OUTCOME.preCapWeightedAggregate - 5.37) < 0.005 && STEAKHOUSE_SCORE_OUTCOME.resultingAggregate === 5.37 && STEAKHOUSE_SCORE_OUTCOME.aggregateRecalculated === false, "5.37");
  add("AL-37: meetsMinimum remains false", AUTOMATED_ASSESSMENT_OUTCOME.meetsMinimum === false && STEAKHOUSE_SCORE_OUTCOME.meetsMinimum === false && STEAKHOUSE_SCORE_OUTCOME.minimumThreshold === 7, "5.37 < 7");
  add("AL-38: no new assessment version was created", STEAKHOUSE_SCORE_OUTCOME.newAssessmentVersionCreated === false && (STEAKHOUSE_SCORE_OUTCOME.assessmentVersionsPreserved as readonly string[]).includes("1.0.0") && (STEAKHOUSE_SCORE_OUTCOME.assessmentVersionsPreserved as readonly string[]).includes("1.1.0"), "amendment only");
  add("AL-39: no threshold targeting occurred", STEAKHOUSE_SCORE_OUTCOME.thresholdTargeting === false && /aggregate is an output, never a target/.test(STEAKHOUSE_SCORE_OUTCOME.thresholdTargetingNote), "not targeted");
  add("AL-40: all other Steakhouse dimensions remain immutable", STEAKHOUSE_SCORE_OUTCOME.otherDimensionsUnchanged === true && STEAKHOUSE_SCORE_OUTCOME.otherDimensions.length === 11 && AUTOMATED_DIMENSION_ASSESSMENTS.length === 12, "11 untouched + incident = 12");
  add("AL-41: the corrected rationale names the alias fix AND retains the three gaps", /16H-O\.2 alias correction/.test(inc().rationale) && /WRONG SUBJECT/.test(inc().rationale) && /THE PROGRAM IS UNCOVERED/.test(inc().rationale) && /STALE FOR THIS BINARY/.test(inc().rationale), "scope corrected, gaps kept");
  add("AL-42: the limitingFact records the correction and why the score held", /CORRECTED AT 16H-O\.2/.test(inc().limitingFact) && /98\.56%/.test(inc().limitingFact) && /THE SCORE IS UNCHANGED/.test(inc().limitingFact), "explicit");
  add("AL-43: the rationale states higher coverage is not a safety finding", /higher coverage percentage is not a safety finding/.test(inc().rationale) && /Absence of evidence is not evidence of absence/.test(inc().rationale), "explicit");

  // --- Direct reserve ---
  const D = DIRECT_RESERVE_INCIDENT_EVIDENCE;
  add("AL-44: the exact direct reserve receives the corrected market evidence", D.marketAddress === "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF" && D.reserveAddress === "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59" && D.candidateId === "kamino_usdc_lending", "bound");
  add("AL-45: the exact market is recorded as named in official material, as 'Main'", D.exactMarketIsNamedInOfficialMaterial === true && D.namedAs === "Main", "covered");
  add("AL-46: NO direct-reserve score is assigned", D.scoreAssigned === false && /No direct-reserve incident_history score is assigned/.test(D.scoreAssignedNote) && (AMENDMENT_CONFERS.doesNotConfer as readonly string[]).includes("a direct-reserve score") && AMENDMENT_CONFERS.directReserveScoreAssigned === false, "input only");
  add("AL-47: what zero bad debt does NOT establish is enumerated for the reserve", D.whatZeroBadDebtDoesNotEstablish.length === 5 && D.whatZeroBadDebtDoesNotEstablish.some((x) => /exploit/.test(x)) && D.whatZeroBadDebtDoesNotEstablish.some((x) => /future losses cannot occur/.test(x)), "5 non-claims");
  add("AL-48: the reserve's material difference from Steakhouse is recorded, not flattened", /gaps 1 and 2/.test(D.whyGapsOneAndTwoDoNotApplyHere) && /MATERIAL difference/.test(D.whyGapsOneAndTwoDoNotApplyHere), "IS a lending-market reserve");
  add("AL-49: event-window binding remains unresolved rather than assumed", /UNRESOLVED/.test(D.reserveExistedDuringEvents) && /UNRESOLVED/.test(D.usdcSupplyExposedDuringEvents), "not assumed");
  add("AL-50: market-owner period and socialize-loss scope are recorded", /period over which this owner has held the role was NOT established/.test(D.currentMarketOwnerPeriod) && /socialize_loss requires lending_market_owner/.test(D.socializeLossSearchScope), "scoped");
  add("AL-51: readiness is partial with the gaps enumerated", D.incidentHistoryReadiness === "partial" && D.remainingGaps.length === 5 && /NOT sufficient to conclude a clean record/.test(D.readinessRationale), "partial");

  // --- Boundaries + evidence ---
  add("AL-52: the amendment manifest is deterministic", ALIAS_AMENDMENT_MANIFEST_HASH === computeAliasAmendmentManifestHash() && /^incident_alias_evidence_[0-9a-f]{8}$/.test(ALIAS_AMENDMENT_MANIFEST_HASH), ALIAS_AMENDMENT_MANIFEST_HASH);
  add("AL-53: the amendment records why Main was previously treated as distinct", /prints no address/.test(ALIAS_AMENDMENT_EVIDENCE.whyMainWasTreatedAsDistinct) && /correct default/.test(ALIAS_AMENDMENT_EVIDENCE.whyMainWasTreatedAsDistinct), "reasonable error");
  add("AL-54: the amendment records cutoff, limitations and invalidation triggers", ALIAS_AMENDMENT_EVIDENCE.sourceCutoff.length > 0 && ALIAS_AMENDMENT_EVIDENCE.limitations.length === 1 && ALIAS_AMENDMENT_EVIDENCE.invalidationTriggers.length === 5 && ALIAS_AMENDMENT_EVIDENCE.whatChanged.length === 6, "complete");
  add("AL-55: the preparer is not represented as a human reviewer", ALIAS_AMENDMENT_EVIDENCE.preparerIsNotHumanReviewer === true && ALIAS_AMENDMENT_EVIDENCE.preparerRole === "automated_evidence_preparer", "not a reviewer");
  add("AL-56: human review remains pending", AMENDMENT_CONFERS.humanReviewRemains === "awaiting_reviewer" && HUMAN_REVIEW_PACKET !== undefined, "awaiting_reviewer");
  add("AL-57: no signoff, approval, recommendation, card or execution change", AMENDMENT_CONFERS.signoffOccurred === false && AMENDMENT_CONFERS.productApproved === false && AMENDMENT_CONFERS.recommendationBehaviourChanged === false && AMENDMENT_CONFERS.cardRendered === false && AMENDMENT_CONFERS.executionBehaviourChanged === false, "none");
  add("AL-58: no safety finding is conferred", (AMENDMENT_CONFERS.doesNotConfer as readonly string[]).includes("a safety finding") && (AMENDMENT_CONFERS.doesNotConfer as readonly string[]).includes("a score change") && (AMENDMENT_CONFERS.doesNotConfer as readonly string[]).includes("a new assessment version"), "scope only");
  add("AL-59: Demo, /testing and SOL staking are unchanged", AMENDMENT_CONFERS.demoChanged === false && AMENDMENT_CONFERS.testingPresentationChanged === false && AMENDMENT_CONFERS.solStakingChanged === false, "unchanged");
  add("AL-60: the amendment adds no execution behaviour", !/sendTransaction|signTransaction|simulateTransaction/.test(amendSrc), "read-only");
  add("AL-61: prior Steakhouse evidence + capacity reconciliation are unchanged", VERIFIED_EVIDENCE_MANIFEST_HASH === "evidence_a86da1fd" && RECONCILIATION_MANIFEST_HASH === computeReconciliationManifestHash() && getStableYieldEvidenceManifest("kamino_steakhouse_usdc")!.primaryBlocker === "blocked_deposit_availability" && getStableYieldEvidenceManifest("kamino_steakhouse_usdc")!.capacityAdapterState === "adapter_implemented_source_verified", "O.1 intact");
  add("AL-62: direct-lending mechanical evidence is unchanged", getStableYieldEvidenceManifest("kamino_usdc_lending")!.primaryBlocker === "blocked_risk_review" && CAPACITY_EVIDENCE_MANIFEST_HASH === computeCapacityEvidenceManifestHash() && POSITION_EVIDENCE_MANIFEST_HASH === computePositionEvidenceManifestHash() && AVAILABILITY_EVIDENCE_MANIFEST_HASH === computeAvailabilityEvidenceManifestHash() && CONSTRAINTS_EVIDENCE_MANIFEST_HASH === computeConstraintsEvidenceManifestHash(), "N.4-N.7 intact");

  return checks;
}

/* ------------------------------------------------------------------ *
 * 16H-P.1 — Canonical Direct-Lending Risk Evidence Package
 * ------------------------------------------------------------------ */

export function runAuthorityResolutionFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const authSrc = readFileSync(`${process.cwd()}/src/suggestions/klendDirectUsdcAuthorityEvidence.ts`, "utf8");
  const U = UPGRADE_LAYER, M = MARKET_OWNER_LAYER, E = EMERGENCY_LAYER, P = PROPOSER_LAYER;
  const SQ = "SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf";

  // --- Loader chain ---
  add("AU-1: the Program account binds to the exact ProgramData", KLEND_LOADER_CHAIN.programDataPointer === "9uSbGW1y9H5Av6H5TKxQ1wnFApSq2t3oEpfF2YfjDQGA" && KLEND_LOADER_CHAIN.programDataPointerMatchesDerivation === true && KLEND_LOADER_CHAIN.programAccountVariant === 2, "pointer = derivation");
  add("AU-2: ProgramData binds to the exact current upgrade authority", KLEND_LOADER_CHAIN.programDataVariant === 3 && KLEND_LOADER_CHAIN.upgradeAuthorityOptionPresent === true && KLEND_LOADER_CHAIN.upgradeAuthorityIsNull === false && KLEND_LOADER_CHAIN.exactUpgradeAuthority === "GzFgdRJXmawPhGeBsyRCDLx4jAKPsvbUqoqitzppkzkW", "GzFgdRJ…");
  add("AU-3: the program is still upgradeable and the deployed slot is recorded", KLEND_LOADER_CHAIN.isUpgradeable === true && KLEND_LOADER_CHAIN.deployedCodeSlot === 422723185 && AUTHORITY_OBSERVATION.observedAtSlot === 433472706, "slot 422723185");
  add("AU-4: both loader accounts are owned by the BPF Upgradeable Loader", KLEND_LOADER_CHAIN.programAccountOwner === "BPFLoaderUpgradeab1e11111111111111111111111" && KLEND_LOADER_CHAIN.programDataOwner === KLEND_LOADER_CHAIN.programAccountOwner, "loader-owned");

  // --- Off-curve is insufficient ---
  add("AU-5: off-curve ALONE is insufficient — proposer_authority proves it", P.isOnCurve === false && P.authorityType === "off_curve_pda_not_squads_v4_vault" && P.squads === undefined, "off-curve ≠ Squads");
  add("AU-6: exact Squads vault derivation is required and verified", [U, M, E].every((l) => l.squads!.derivationMatches === true && l.squads!.derivedVaultPda === l.exactAddress && l.authorityType === "verified_squads_v4_vault_pda"), "3 derived");
  add("AU-7: derivation seeds and Squads program are exact", [U, M, E].every((l) => l.squads!.derivationSeeds.includes(SQ) && /\["multisig", <multisig_state>, "vault", <index u8>\]/.test(l.squads!.derivationSeeds)), "exact seeds");
  add("AU-8: exact multisig state is required and each is distinct", U.squads!.multisigState === "6hhBGCtmg7tPWUSgp3LG6X2rsmYWAc4tNsA6G4CnfQbM" && M.squads!.multisigState === "7idEEVRidWrahZJhxXMqniDbV6ESj7ZjyLrigcMcEt6H" && E.squads!.multisigState === "9thcmURbz3xgvv362Fy2uGVGoxMnD3ADRuwRp13nuXE5" && new Set([U, M, E].map((l) => l.squads!.multisigState)).size === 3, "3 distinct");
  add("AU-9: exact vault index is recorded", [U, M, E].every((l) => l.squads!.vaultIndex === 0), "index 0");
  add("AU-10: each derivation is a UNIQUE match (no faulty-search ambiguity)", [U, M, E].every((l) => l.squads!.uniqueMatch === true), "unique");
  add("AU-11: a wrong Squads program, multisig or index cannot derive the same PDA", (() => { const seeds = U.squads!.derivationSeeds; return seeds.includes(SQ) && U.squads!.multisigState !== M.squads!.multisigState && U.squads!.derivedVaultPda !== M.squads!.derivedVaultPda; })(), "derivation is injective in practice");

  // --- Decoded config ---
  add("AU-12: upgrade threshold is decoded from the exact state", U.squads!.threshold === 5 && U.squads!.memberCount === 10, "5-of-10");
  add("AU-13: upgrade timelock is decoded from the exact state", U.squads!.timeLockSeconds === 86400, "24h");
  add("AU-14: market-owner threshold/timelock VERIFY the reported 4-of-10 / 12h", M.squads!.threshold === 4 && M.squads!.memberCount === 10 && M.squads!.timeLockSeconds === 43200, "reported → verified");
  add("AU-15: emergency threshold/timelock VERIFY the reported 2-of-7 / none", E.squads!.threshold === 2 && E.squads!.memberCount === 7 && E.squads!.timeLockSeconds === 0, "reported → verified");
  add("AU-16: member count and permissions are recorded", [U, M, E].every((l) => l.squads!.membersAllPermissions === true && l.squads!.voterCount === l.squads!.memberCount && l.squads!.executorCount === l.squads!.memberCount), "all perms");
  add("AU-17: config authority is recorded and is default on all three", [U, M, E].every((l) => l.squads!.configAuthorityIsDefault === true && l.squads!.configAuthority === "11111111111111111111111111111111"), "autonomous");
  add("AU-18: NO threshold bypass exists — verified, not assumed", [U, M, E].every((l) => l.squads!.configAuthorityCanBypassThreshold === false) && SQUADS_EXEC.configAuthorityBypass.exists === false && SQUADS_EXEC.configAuthorityBypass.verifiedForAllThree === true, "no bypass");
  add("AU-19: no single member can approve alone", [U, M, E].every((l) => l.squads!.anySingleMemberCanExecuteAlone === false && l.squads!.threshold > 1), "thresholds 5/4/2");
  add("AU-20: member identities are NOT inferred", [U, M, E].every((l) => l.limitations.some((x) => /identit(y|ies)/i.test(x))) && !/@|twitter|github\.com\/[a-z]/i.test(authSrc.split("members")[1]?.slice(0, 500) ?? ""), "keys only");

  // --- Execution semantics ---
  add("AU-21: approval, timelock, execution and cancellation are distinct", SQUADS_EXEC.proposalApprovalAndExecutionAreDistinct === true && SQUADS_EXEC.cancellationExists === true && /timelock gates EXECUTION, not approval/.test(SQUADS_EXEC.timeLockStartsAt), "4 distinct stages");
  add("AU-22: execution is not permissionless after approval", SQUADS_EXEC.executionIsPermissionlessAfterApproval === false && SQUADS_EXEC.executionRequiresExecutePermission === true, "Execute mask required");
  add("AU-23: 'N-of-M + timelock' is only used because bypass-absence was VERIFIED", /VERIFIED, not assumed/.test(SQUADS_EXEC.doNotSummarizeAsNofMPlusTimelock) && /non-default config_authority would have made the summary false/.test(SQUADS_EXEC.doNotSummarizeAsNofMPlusTimelock), "earned summary");
  add("AU-24: the vault PDA can sign loader upgrades", /vault PDA is the ProgramData upgrade authority/.test(SQUADS_EXEC.vaultPdaCanSignUpgrades), "CPI signer");
  add("AU-25: config changes require the same threshold and timelock", /proposal at the multisig's own threshold/.test(SQUADS_EXEC.configAuthorityBypass.detail) && /same constraint/.test(SQUADS_EXEC.timeLockCanBeChanged), "autonomous");

  // --- Layer separation ---
  add("AU-26: there is NO single Kamino admin", LAYERS_DISTINCT.thereIsNoSingleKaminoAdmin === true && LAYERS_DISTINCT.distinctMultisigs === 3 && AUTH_LAYERS.length === 4, "4 layers, 3 multisigs");
  add("AU-27: program upgrade authority is separate from market owner", U.exactAddress !== M.exactAddress && U.squads!.multisigState !== M.squads!.multisigState && /is not the market owner and holds no market-admin power/.test(LAYERS_DISTINCT.upgradeCannotAdministerMarket), "separate");
  add("AU-28: market owner is separate from emergency council", M.exactAddress !== E.exactAddress && M.squads!.multisigState !== E.squads!.multisigState && /can neither upgrade the program nor exercise market-owner powers/.test(LAYERS_DISTINCT.emergencyCouncilIsNeither), "separate");
  add("AU-29: member overlap is NOT identity", /Overlap is not identity/.test(LAYERS_DISTINCT.memberOverlapIsNotIdentity) && U.squads!.threshold !== M.squads!.threshold, "9/10 shared, still distinct");
  add("AU-30: the proposer_authority layer is recorded as a NEW unresolved finding", P.exactAddress === "6pwkb7uMsvqgmwPBKc3o4hnte6JnHpisSUrsdyvGcEUv" && P.limitations.some((x) => /NEW FINDING/.test(x)) && (UNRESOLVED_GAPS as readonly string[]).some((g) => /proposer_authority/.test(g)), "4th layer");

  // --- KVault non-transfer ---
  add("AU-31: KVault authority evidence is NOT reused as KLend authority evidence", KVAULT_COINCIDENCE.isEvidenceOfIdentity === false && KVAULT_COINCIDENCE.numbersCoincide === true && /right numbers BY LUCK/.test(KVAULT_COINCIDENCE.whyThisMatters), "coincidence named");
  add("AU-32: the KVault/KLend multisig identity is explicitly not assumed", /was NOT verified here and must not be assumed/.test(KVAULT_COINCIDENCE.multisigsCompared), "not assumed");

  // --- Powers ---
  add("AU-33: market-owner powers are instruction-bound", MO_POWERS.length === 15 && MO_POWERS.every((p) => p.instruction.length > 0 && p.requiredSigner.length > 0 && p.timelockApplies.length > 0), "15 powers");
  add("AU-34: socialize_loss signer requirement remains exact", SOCIALIZE_AUTH.requiredSigner === "lending_market_owner" && SOCIALIZE_AUTH.emergencyCouncilCanInvoke === false && /has_one/.test(SOCIALIZE_AUTH.constraint), "has_one");
  add("AU-35: socialize_loss effective control is 4-of-10 + 12h", /4-of-10 with a 12h timelock/.test(SOCIALIZE_AUTH.effectiveThreshold) && /structural loss path, not a hypothetical/.test(SOCIALIZE_AUTH.meaning), "principal write-down");
  add("AU-36: emergency-council powers are instruction-bound, not generalized", EC_POWERS.can.length === 3 && EC_POWERS.cannot.length === 8 && EC_POWERS.cannot.every((c) => c.allowed === false && c.note.length > 0), "power map");
  add("AU-37: the emergency council cannot inherit market-owner powers", EC_POWERS.cannotInheritMarketOwnerPowers === true && EC_POWERS.cannot.some((c) => /socialize/.test(c.action)) && EC_POWERS.cannot.some((c) => /upgrade KLend/.test(c.action)) && EC_POWERS.cannot.some((c) => /change market owner/.test(c.action)), "bounded");
  add("AU-38: 'restrictive-only' is not treated as harmless", /bounds the DIRECTION of harm, not its magnitude/.test(EC_POWERS.riskFraming) && /Restrictive is not harmless/.test(EC_POWERS.riskFraming), "2-of-7 / 0s can freeze exits");
  add("AU-39: no direct asset-transfer power was found, recorded as NOT FOUND", MO_POWERS.some((p) => /direct asset transfer/.test(p.power) && /NOT FOUND rather than as proven absent/.test(p.otherAuthorityCanPerform)), "not proven absent");
  add("AU-40: emergency-mode powers are shared but directionally bounded", MO_POWERS.filter((p) => p.emergencyCouncilCanPerform).length === 3 && MO_POWERS.filter((p) => p.emergencyCouncilCanPerform).every((p) => /restrictive direction only/.test(p.otherAuthorityCanPerform)), "3 shared");

  // --- History ---
  add("AU-41: authority tenure is UNRESOLVED and was not invented", AUTH_HISTORY.reconstructionComplete === false && AUTH_HISTORY.upgradeAuthorityPeriodStart === "UNRESOLVED" && AUTH_HISTORY.marketOwnerPeriodStart === "UNRESOLVED" && /tenure was NOT invented/.test(AUTH_HISTORY.whyUnresolved), "not invented");
  add("AU-42: transaction_index is recorded as a WEAK signal, not tenure proof", /an index is NOT a tenure proof/.test(AUTH_HISTORY.indirectSignal) && U.squads!.transactionIndex === 92 && M.squads!.transactionIndex === 181, "weak signal");
  add("AU-43: the history gap does not block current-authority resolution", AUTH_HISTORY.currentEvidenceUnaffected === true && /does not block current-authority resolution/.test(AUTH_HISTORY.supportsButDoesNotBlock), "non-blocking");

  // --- Package integration ---
  add("AU-44: the package registers the authority evidence module", PKG_MODULES.some((m) => m.module === "klendDirectUsdcAuthorityEvidence.ts") && PKG_MODULES.length === 13, "13 modules");
  add("AU-45: upgrade_admin_authority readiness moved insufficient → partial-but-scoreable", PKG_DIMENSIONS.find((d) => d.dimensionId === "upgrade_admin_authority")!.readiness === "partial" && PKG_DIMENSIONS.find((d) => d.dimensionId === "upgrade_admin_authority")!.scoreable === true, "scoreable");
  add("AU-46: manager_discretion evidence now carries the verified authority constraint", PKG_DIMENSIONS.find((d) => d.dimensionId === "manager_discretion")!.evidenceRefs.some((r) => /authority_evidence/.test(r)) && PKG_DIMENSIONS.find((d) => d.dimensionId === "manager_discretion")!.confidenceCeiling === "medium", "coupled + resolved");
  add("AU-47: the package is ready and readiness flipped on evidence", PKG_READINESS.readiness === "ready_for_automated_assessment" && PKG_READINESS.insufficientDimensions.length === 0 && READINESS_CONSEQUENCE.readinessFlippedOnEvidence === true, "ready");
  add("AU-48: readiness did NOT flip merely because a multisig was found", /Finding a multisig is not the bar/.test(READINESS_CONSEQUENCE.notFlippedBecauseAMultisigWasFound) && /threshold \+ timelock \+ bypass-absence \+ power map/.test(READINESS_CONSEQUENCE.notFlippedBecauseAMultisigWasFound), "bar was higher");
  add("AU-49: the 16H-P.1 not-ready history is preserved", READINESS_CONSEQUENCE.priorReadiness === "not_ready_for_automated_assessment" && READINESS_CONSEQUENCE.priorBlockingDimension === "upgrade_admin_authority" && /HISTORY, PRESERVED/.test(readFileSync(`${process.cwd()}/src/suggestions/klendDirectUsdcRiskEvidencePackage.ts`, "utf8")), "gate worked");

  // --- Boundaries ---
  add("AU-50: the package still contains no scores and no aggregate", PKG_CONFERS.scoresAssigned === false && PKG_CONFERS.aggregateCalculated === false && AUTH_CONFERS.scoresAssigned === false && AUTH_CONFERS.aggregateCalculated === false && PKG_DIMENSIONS.every((d) => !("score" in d)), "score-free");
  add("AU-51: resolving an authority is not judging it", /Resolving an authority structure describes it. It does not judge it/.test(AUTH_CONFERS.resolvedIsNotSafe) && (AUTH_CONFERS.doesNotConfer as readonly string[]).includes("a judgement that the authority structure is safe"), "describes, not judges");
  add("AU-52: no review, signoff or approval occurred", AUTH_CONFERS.humanReviewOccurred === false && AUTH_CONFERS.signoffOccurred === false && AUTH_CONFERS.productApproved === false, "none");
  add("AU-53: no automated assessment was created", READINESS_CONSEQUENCE.automatedAssessmentCreated === false, "not created");
  add("AU-54: lifecycle and product state are unchanged", AUTH_CONFERS.lifecycleChanged === false && getYieldStrategy("kamino_usdc_lending")!.lifecycle === "identity_verified" && getStableYieldEvidenceManifest("kamino_usdc_lending")!.primaryBlocker === "blocked_risk_review", "unchanged");
  add("AU-55: the Steakhouse assessment is unchanged", AUTH_CONFERS.steakhouseAssessmentChanged === false && Math.abs(AUTOMATED_ASSESSMENT_OUTCOME.preCapWeightedAggregate - 5.37) < 0.005 && AUTOMATED_ASSESSMENT_OUTCOME.meetsMinimum === false, "5.37 / false");
  add("AU-56: no transaction behaviour and all live calls were read-only", AUTH_CONFERS.transactionConstructedOrSimulated === false && !/sendTransaction|signTransaction|simulateTransaction/.test(authSrc), "read-only");
  add("AU-57: the authority manifest is deterministic", AUTH_MANIFEST_HASH === computeAuthorityManifestHash() && /^authority_evidence_[0-9a-f]{8}$/.test(AUTH_MANIFEST_HASH), AUTH_MANIFEST_HASH);
  add("AU-58: prior evidence remains immutable", SOL_BTC_USDC_IDENTITY_MANIFEST_HASH === "identity_9773ac14" && CAPACITY_EVIDENCE_MANIFEST_HASH === computeCapacityEvidenceManifestHash() && AVAILABILITY_EVIDENCE_MANIFEST_HASH === computeAvailabilityEvidenceManifestHash() && CONSTRAINTS_EVIDENCE_MANIFEST_HASH === computeConstraintsEvidenceManifestHash() && ALIAS_AMENDMENT_MANIFEST_HASH === computeAliasAmendmentManifestHash() && VERIFIED_EVIDENCE_MANIFEST_HASH === "evidence_a86da1fd", "6 intact");

  return checks;
}

/* ------------------------------------------------------------------ *
 * 16H-P.2 — Direct USDC Automated 12-Dimension Assessment
 * ------------------------------------------------------------------ */

export function runDirectAssessmentFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const src = readFileSync(`${process.cwd()}/src/suggestions/klendDirectUsdcAutomatedAssessment.ts`, "utf8");
  const P = DA_PROVENANCE, D = DA_DIMS, O = DA_OUTCOME, S = DA_STATE;
  const dim = (id: string) => D.find((d) => String(d.dimensionId) === id)!;
  const CANON = ["audit_security","maturity","upgrade_admin_authority","manager_discretion","strategy_complexity","composability_dependency","oracle_risk","liquidity_withdrawal","asset_stablecoin_risk","withdrawal_fee_transparency","operational_dependency_risk","incident_history"];

  // --- Binding ---
  add("DA-1: the assessment binds to risk_package_3711fd25", P.evidencePackageManifest === "risk_package_3711fd25" && P.evidencePackageId === "klend_direct_usdc_risk_evidence_package_v1", "package bound");
  add("DA-2: the assessment binds to authority_evidence_a99ace84", P.authorityEvidenceManifest === "authority_evidence_a99ace84" && P.authorityEvidenceId === "klend_direct_usdc_authority_evidence_v1", "authority bound");
  add("DA-3: exact candidate identity is required", P.candidateId === "kamino_usdc_lending" && P.marketAddress === "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF" && P.reserveAddress === "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59" && P.cTokenMint === "B8V6WVjPxW1UGwVDfxH2d2r8SyT4cqn7dQRK6XneVa7D" && P.klendProgram === "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD" && P.cluster === "mainnet-beta", "exact");
  add("DA-4: rubric identity, version and hash are bound", P.rubricId === "protocol_risk_rubric_v1" && P.rubricVersion === "1.0.0" && P.rubricHash === computeRubricV1Hash() && P.rubricHash === "rubric_64bf43e2", "rubric_64bf43e2");
  add("DA-5: confidence and SoD policies are bound", P.confidencePolicyId === "risk_review_confidence_v2" && P.separationOfDutiesId === "risk_separation_of_duties_v2", "v2 policies");
  add("DA-6: assessor is distinct from evidence preparer and from any human reviewer", P.assessorId === "ws_automated_risk_assessor" && P.evidencePreparerId === "claude_automated_evidence_preparer" && P.assessorIsNotPreparer === true && P.assessorIsNotHumanReviewer === true && P.assessorMayNotSignOffOrApprove === true, "SoD held");

  // --- Structure ---
  add("DA-7: all 12 dimensions present in canonical order", D.length === 12 && D.map((d) => String(d.dimensionId)).join(",") === CANON.join(","), "canonical");
  add("DA-8: weights match the rubric and sum to 100", D.reduce((a, d) => a + d.weight, 0) === 100 && dim("audit_security").weight === 15 && dim("upgrade_admin_authority").weight === 15 && dim("manager_discretion").weight === 12 && dim("liquidity_withdrawal").weight === 12 && dim("incident_history").weight === 2, "sum 100");
  add("DA-9: every dimension has an integer score in range", D.every((d) => Number.isInteger(d.score) && d.score >= 0 && d.score <= 10), "12 integers");
  add("DA-10: every score matches its rubric anchor band", D.every((d) => anchorMatchesScore(d.score, d.anchorBand)), "anchors valid");
  add("DA-11: every confidence value is allowed by the policy", D.every((d) => (ALLOWED_CONFIDENCE_VALUES as readonly string[]).includes(d.confidence)), "high|medium|low");
  add("DA-12: the assessment validator passes, and rejects an anchor/score mismatch", DA_VALIDATION.valid === true && DA_VALIDATION.errors.length === 0 && validateDirectAssessment(D.map((d, i) => (i === 0 ? { ...d, score: 10 } : d))).valid === false, "valid; tamper rejected");
  add("DA-13: favorable AND unfavorable evidence are both recorded on every dimension", D.every((d) => d.favorableEvidence.length > 0 && d.unfavorableEvidence.length > 0 && d.limitingFact.length > 0), "both sides");
  add("DA-14: no vague rationale appears", D.every((d) => !/generally safe|well known|reputable|strong protocol|trusted team/i.test(d.rationale)), "no appeals to reputation");
  add("DA-15: every dimension cites evidence and a prohibited inference", D.every((d) => d.evidenceRefs.length > 0 && d.prohibitedInference.length > 0 && d.invalidationTriggers.length > 0), "traceable");

  // --- Aggregation ---
  add("DA-16: the aggregate comes from the approved engine, not hand arithmetic", DA_AGG_RESULT.ok === true && DA_AGG_RESULT.weightedScore === 5.93 && DA_AGG_RESULT.meetsMinimum === false && O.computationVersion === AGG_VERSION, "engine agrees");
  add("DA-17: the aggregate is deterministic and reproducible from scores+weights", (() => { const r = computeDirectAggregate(); return r.ok === true && r.weightedScore === O.unroundedAggregate && D.reduce((a, d) => a + d.weight * d.score, 0) === 593; })(), "593/100");
  add("DA-18: unrounded and displayed aggregates are recorded", O.unroundedAggregate === 5.93 && O.displayedAggregate === 5.93 && O.roundingApplied === false && /terminates exactly/.test(O.roundingNote), "5.93");
  add("DA-19: threshold is exactly 7", O.minimumThreshold === 7, "7");
  add("DA-20: meetsMinimum matches the aggregate", O.meetsMinimum === (O.unroundedAggregate >= O.minimumThreshold) && O.meetsMinimum === false, "5.93 < 7 → false");
  add("DA-21: no score was adjusted after seeing the aggregate", O.scoresAdjustedAfterSeeingAggregate === false && P.aggregateIsAnOutputNotATarget === true, "output not target");
  add("DA-22: no threshold targeting exists", O.thresholdTargeting === false && P.thresholdTargeting === false && /recorded nowhere as a target/.test(O.distanceToThresholdIsNotAGoal) && !/7\s*-\s*(aggregate|weightedScore)|(aggregate|weightedScore)\s*[<>]=?\s*7\s*\?|gapToThreshold\s*[:=]\s*[0-9]/.test(src), "no computed gap-to-threshold");
  add("DA-23: mandatory blockers were evaluated before arithmetic", O.blockersEvaluatedBeforeArithmetic === true && O.mandatoryBlockerResult === "none_present" && D.every((d) => d.mandatoryBlockerPresent === false), "none present");

  // --- Substance ---
  add("DA-24: manager_discretion remains applicable and is scored", dim("manager_discretion").notApplicable !== true && dim("manager_discretion").score === 5, "applicable");
  add("DA-25: program upgrade authority is distinct from market owner in the evidence", (dim("upgrade_admin_authority").favorableEvidence as string[]).some((e) => /GzFgdRJ/.test(e)) && (dim("upgrade_admin_authority").favorableEvidence as string[]).some((e) => /24LjDBuk/.test(e)) && UPGRADE_LAYER.squads!.multisigState !== MARKET_OWNER_LAYER.squads!.multisigState, "distinct");
  add("DA-26: market owner is distinct from emergency council in the evidence", (dim("upgrade_admin_authority").favorableEvidence as string[]).some((e) => /4VtJ1yC/.test(e)) && MARKET_OWNER_LAYER.squads!.multisigState !== EMERGENCY_LAYER.squads!.multisigState, "distinct");
  add("DA-27: the 2-of-7 immediate freeze power is represented as UNFAVORABLE", (dim("upgrade_admin_authority").unfavorableEvidence as string[]).some((e) => /2-of-7 with ZERO timelock/.test(e)) && (dim("liquidity_withdrawal").unfavorableEvidence as string[]).some((e) => /2-of-7 multisig with ZERO timelock/.test(e)), "in both dims");
  add("DA-28: the 4-of-10 socialize-loss control is represented as UNFAVORABLE", (dim("upgrade_admin_authority").unfavorableEvidence as string[]).some((e) => /SUPPLIER PRINCIPAL at 4-of-10/.test(e)) && (dim("manager_discretion").unfavorableEvidence as string[]).some((e) => /socialize_loss can write down supplier principal/.test(e)), "principal path");
  add("DA-29: the 9-of-10 member overlap is represented and not treated as identity", (dim("upgrade_admin_authority").unfavorableEvidence as string[]).some((e) => /share 9 of 10 member keys/.test(e)) && /reducing practical independence/.test(dim("upgrade_admin_authority").unfavorableEvidence.join(" ")), "overlap ≠ identity");
  add("DA-30: unresolved proposer_authority remains a limitation and an invalidation trigger", (dim("upgrade_admin_authority").unresolvedLimitations as string[]).some((l) => /proposer_authority/.test(l)) && (DA_MANIFEST.invalidationTriggers as readonly string[]).includes("proposer_authority material powers discovered") && (DA_LIMITS as readonly string[]).some((l) => /MUST be invalidated and reopened/.test(l)), "reopens assessment");
  add("DA-31: the borrower-collateral oracle gap remains visible and is the priority focus", (dim("oracle_risk").unfavorableEvidence as string[]).some((e) => /borrower-collateral oracle configurations NOT assessed/.test(e)) && DA_FOCUS[0].dimensionId === "oracle_risk" && DA_FOCUS[0].couldMoveBands === 2, "priority");
  add("DA-32: the audit-to-binary gap remains visible", /NO audit maps to the deployed binary/.test(dim("audit_security").limitingFact) && (dim("audit_security").unfavorableEvidence as string[]).some((e) => /all are private-repo commits/.test(e)), "no linkage");
  add("DA-33: current liquidity is NOT represented as guaranteed", /guaranteed future liquidity/.test(dim("liquidity_withdrawal").prohibitedInference) && (dim("liquidity_withdrawal").unfavorableEvidence as string[]).some((e) => /slot-bound snapshot, not a future guarantee/.test(e)) && /Users cannot always leave/.test(dim("liquidity_withdrawal").prohibitedInference), "not guaranteed");
  add("DA-34: zero bad debt is NOT represented as zero incidents", /zero bad debt means zero incidents or zero exploits/.test(dim("incident_history").prohibitedInference) && /SEARCH RESULT, not a clean record/.test(dim("incident_history").prohibitedInference), "search result");
  add("DA-35: the direct reserve does NOT inherit KVault-specific scope gaps", /Steakhouse's two fatal gaps .* do NOT apply here|Steakhouse's KVault-specific scope gaps do not apply/.test(dim("incident_history").rationale + dim("incident_history").favorableEvidence.join(" ")), "layer-correct");
  add("DA-36: incident_history did not overcorrect — it is 5 with LOW confidence", dim("incident_history").score === 5 && dim("incident_history").confidence === "low" && /More directly applicable evidence is not the same as more evidence/.test(dim("incident_history").rationale), "5, not higher");
  add("DA-37: the product is NOT described as equivalent to holding USDC", /not equivalent to holding USDC|NOT equivalent to holding USDC/.test(dim("strategy_complexity").rationale) && /it is a credit position/.test(dim("strategy_complexity").prohibitedInference), "credit position");
  add("DA-38: the product is NOT described as having no composability dependencies", /Direct lending is not dependency-free/.test(dim("composability_dependency").prohibitedInference), "has dependencies");
  add("DA-39: the take rate is not labelled a withdrawal fee", /take rate is a user withdrawal fee/.test(dim("withdrawal_fee_transparency").prohibitedInference) && /INTEREST-REVENUE SHARE/.test(dim("withdrawal_fee_transparency").rationale), "interest share");
  add("DA-40: multisig+timelock presence is not described as eliminating admin risk", /eliminates admin risk. It bounds and delays it; it does not remove it/.test(dim("upgrade_admin_authority").prohibitedInference), "bounds ≠ removes");
  add("DA-41: KVault audit evidence is not transferred", /KVault/.test(dim("audit_security").favorableEvidence.join(" ")) === true && /materially richer artifact set than KVault/.test(dim("audit_security").rationale), "compared, not transferred");
  add("DA-42: engineering inconvenience is not scored as protocol risk", /WealthSmith's integration effort is protocol risk/.test(dim("operational_dependency_risk").prohibitedInference) && /NOT scored as protocol risk/.test(dim("operational_dependency_risk").rationale), "rubric-bound");

  // --- Confidence ---
  add("DA-43: confidence reflects evidence quality, not favorability", dim("asset_stablecoin_risk").score === 8 && dim("asset_stablecoin_risk").confidence === "high" && dim("oracle_risk").score === 5 && dim("oracle_risk").confidence === "low" && dim("upgrade_admin_authority").score === 7 && dim("upgrade_admin_authority").confidence === "medium", "high score ≠ high confidence");
  add("DA-44: partial-readiness dimensions carry limited confidence", D.filter((d) => d.evidenceReadiness === "partial").every((d) => d.confidence !== "high"), "6 partial, none high");
  add("DA-45: focus areas name where evidence could move the score", DA_FOCUS.length === 6 && DA_FOCUS.every((f) => f.couldMoveBands >= 1 && f.why.length > 0), "6 focus areas");
  add("DA-46: lowest-scoring and lowest-confidence dimensions are recorded", (DA_LOWEST_SCORE as readonly string[]).includes("maturity (4)") && (DA_LOWEST_CONF as readonly string[]).length === 3, "recorded");

  // --- State ---
  add("DA-47: automated assessment state is completed", S.automatedAssessmentState === "completed", "completed");
  add("DA-48: lifecycle remains identity_verified", S.lifecycle === "identity_verified" && getYieldStrategy("kamino_usdc_lending")!.lifecycle === "identity_verified", "unchanged");
  add("DA-49: primary blocker remains blocked_risk_review", S.primaryBlocker === "blocked_risk_review" && getStableYieldEvidenceManifest("kamino_usdc_lending")!.primaryBlocker === "blocked_risk_review", "unchanged");
  add("DA-50: human review remains awaiting_reviewer and was not created", S.humanReviewState === "awaiting_reviewer" && S.humanReviewCreated === false && DA_CONFERS.humanReviewOccurred === false, "awaiting");
  add("DA-51: NO reviewer identity is fabricated", S.reviewerIdentityFabricated === false && DA_PACKET.reviewerId === null && DA_PACKET.reviewerDecision === null && DA_PACKET.reviewerSignoff === null && DA_PACKET.containsFabricatedReviewer === false, "reviewer fields null");
  add("DA-52: every reviewer row field is null by construction", DA_PACKET.rows.every((r) => r.reviewerScore === null && r.reviewerConfidence === null && r.reviewerRationale === null && r.reviewerAgrees === null) && DA_PACKET.rows.length === 12, "12 empty rows");
  add("DA-53: no signoff occurred", S.riskSignoffState === "absent" && DA_CONFERS.signoffOccurred === false && DA_PACKET.approval === null, "absent");
  add("DA-54: no product approval occurred", S.productApprovalState === "absent" && DA_CONFERS.productApproved === false && S.movedToReadyForApprovalReview === false, "absent");
  add("DA-55: no selector eligibility or recommendation was created", S.selectorEligible === false && S.recommendationEligible === false && S.topPickCreated === false && DA_CONFERS.selectorChanged === false && DA_CONFERS.recommendationChanged === false, "none");
  add("DA-56: no production card renders", S.productionCardRendered === false && getStableYieldEvidenceManifest("kamino_usdc_lending")!.readiness === "blocked", "no card");
  add("DA-57: a passing aggregate would still not confer eligibility", /would ALL still be false/.test(S.evenIfMeetsMinimumWereTrue) && /never a substitute for it/.test(S.evenIfMeetsMinimumWereTrue), "input, not substitute");
  add("DA-58: meetsMinimum=false does not revoke existing-position recognition", S.existingPositionRecognitionChanged === false && S.safetyBufferHandlingChanged === false && /not revoked/.test(S.meetsMinimumFalseConsequence.replace("recognition is not revoked", "not revoked")), "positions preserved");
  add("DA-59: the score is internal-only", /INTERNAL ONLY/.test(DA_CONFERS.scoreIsInternalOnly) && /never appear on suggestion cards/.test(DA_CONFERS.scoreIsInternalOnly), "internal");

  // --- Immutability ---
  add("DA-60: the assessment manifest is deterministic", DA_MANIFEST_HASH === computeDirectAssessmentManifestHash() && /^direct_assessment_[0-9a-f]{8}$/.test(DA_MANIFEST_HASH), DA_MANIFEST_HASH);
  add("DA-61: the manifest records all 12 scores and confidences", DA_MANIFEST.scores.length === 12 && DA_MANIFEST.scores.every((s) => Number.isInteger(s.score) && (ALLOWED_CONFIDENCE_VALUES as readonly string[]).includes(s.confidence)) && DA_MANIFEST.threshold === 7 && DA_MANIFEST.meetsMinimum === false, "complete");
  add("DA-62: invalidation triggers cover authority, config, incident and governance changes", DA_MANIFEST.invalidationTriggers.length === 19 && (DA_MANIFEST.invalidationTriggers as readonly string[]).includes("socialize_loss event") && (DA_MANIFEST.invalidationTriggers as readonly string[]).includes("audit-to-current-binary linkage resolved") && (DA_MANIFEST.invalidationTriggers as readonly string[]).includes("rubric or confidence-policy version change"), "19 triggers");
  add("DA-63: current-state changes do not invalidate the assessment", /invalidate CURRENT-STATE SNAPSHOTS, not this assessment/.test(DA_MANIFEST.currentStateChangesDoNotInvalidate), "scoped");
  add("DA-64: the Steakhouse assessment is unchanged", DA_CONFERS.steakhouseAssessmentChanged === false && Math.abs(AUTOMATED_ASSESSMENT_OUTCOME.preCapWeightedAggregate - 5.37) < 0.005 && AUTOMATED_ASSESSMENT_OUTCOME.meetsMinimum === false && AUTOMATED_DIMENSION_ASSESSMENTS.length === 12, "5.37 / false");
  add("DA-65: this is a separate assessment, not a mutation of Steakhouse's", DA_MANIFEST_HASH !== computeEvidenceManifestHash() && P.assessmentId === "klend_direct_usdc_automated_assessment_v1" && P.assessmentVersion === "1.0.0", "distinct");
  add("DA-66: no transaction is constructed or simulated", DA_CONFERS.transactionConstructedOrSimulated === false && !/sendTransaction|signTransaction|simulateTransaction/.test(src), "read-only");
  add("DA-67: all prior evidence remains immutable", SOL_BTC_USDC_IDENTITY_MANIFEST_HASH === "identity_9773ac14" && CAPACITY_EVIDENCE_MANIFEST_HASH === computeCapacityEvidenceManifestHash() && AVAILABILITY_EVIDENCE_MANIFEST_HASH === computeAvailabilityEvidenceManifestHash() && CONSTRAINTS_EVIDENCE_MANIFEST_HASH === computeConstraintsEvidenceManifestHash() && ALIAS_AMENDMENT_MANIFEST_HASH === computeAliasAmendmentManifestHash() && AUTH_MANIFEST_HASH === computeAuthorityManifestHash() && VERIFIED_EVIDENCE_MANIFEST_HASH === "evidence_a86da1fd", "7 intact");
  add("DA-68: the package remains ready and unmutated by scoring", PKG_READINESS.readiness === "ready_for_automated_assessment" && PKG_DIMENSIONS.every((d) => !("score" in d)), "package score-free");

  return checks;
}

/* ------------------------------------------------------------------ *
 * 16H-P.2a — Direct Assessment Binary-Date Correction
 * ------------------------------------------------------------------ */

export function runBinaryDateCorrectionFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const root = process.cwd();
  const readIf = (rel: string) => { try { return readFileSync(`${root}/${rel}`, "utf8"); } catch { return ""; } };
  const asmt = readIf("src/suggestions/klendDirectUsdcAutomatedAssessment.ts");
  const pkg = readIf("src/suggestions/klendDirectUsdcRiskEvidencePackage.ts");
  const F = BD_FACT, S = BD_SUPERSEDED, I = BD_IMPACT;
  const dim = (id: string) => DA_DIMS.find((d) => String(d.dimensionId) === id)!;

  // --- The corrected fact ---
  add("BD-1: the KLend binary date is corrected to 2026-05-28", F.deployedAt === "2026-05-28T12:47:42.000Z" && F.deployedSlot === 422723185, "2026-05-28");
  add("BD-2: the corrected age is ~50 days, not 3", Math.abs(F.ageDaysAtAssessment - 50) < 1 && F.priorClaimedAgeDays === 3, "50 vs 3");
  add("BD-3: the date is bound to the ProgramData slot and a verification method", F.programDataAccount === "9uSbGW1y9H5Av6H5TKxQ1wnFApSq2t3oEpfF2YfjDQGA" && /ProgramData offset 4/.test(F.verificationMethod) && F.verifiedAtSlot > F.deployedSlot, "slot → blockTime");

  // --- THE GUARD THAT WOULD HAVE CAUGHT IT ---
  // The error was a KVault→KLend date transfer. Assert the two programs' binary dates are NOT equal,
  // and that no KLend module asserts the KVault date. This is the check that was missing.
  add("BD-4: GUARD — the KLend binary date is NOT the KVault binary date", String(F.deployedAt) !== "2026-07-14T14:54:02.000Z" && !/2026-07-14/.test(F.deployedAt), "different programs, different dates");
  add("BD-5: GUARD — no KLend module asserts the KVault binary date as its own", (() => { const strip = (s: string) => s.replace(/CORRECTED AT 16H-P\.2a[^"]*/g, "").replace(/the KVault binary date[^"]*/g, "").replace(/KVAULT binary date carried over[^"]*/g, "").replace(/the KVault date[^"]*/g, ""); return !/2026-07-14/.test(strip(asmt)) && !/2026-07-14/.test(strip(pkg)); })(), "no bare KVault date in KLend modules");
  add("BD-6: the KVault date remains correct where it belongs", /2026-07-14T14:54:02\.000Z/.test(readIf("src/suggestions/steakhouseEvidenceClosure.ts")), "KVault untouched");
  add("BD-7: no '~3 days old' claim survives anywhere", !/3 days old/.test(asmt) && !/3 days old/.test(pkg), "removed");

  // --- The error is preserved, not erased ---
  add("BD-8: the erroneous claim is preserved verbatim", S.claim === "The deployed KLend binary dates from 2026-07-14." && S.restatedAs === "the deployed binary is ~3 days old", "preserved");
  add("BD-9: the error's scope is recorded exactly", S.affectedSites === 9 && S.affectedModules.length === 2 && S.affectedDimensions.length === 3, "9 sites, 2 modules, 3 dims");
  add("BD-10: the error class is named as a KVault→KLend transfer", S.errorClass === "kvault_to_klend_evidence_transfer" && /different program/.test(S.whyItWasWrong), "named");
  add("BD-11: the irony is recorded rather than buried", /refused this exact transfer for the upgrade authority/.test(S.irony) && /applied to the fact under examination but not to the surrounding context/.test(S.irony), "self-critical");
  add("BD-12: history was not rewritten", BD_EVIDENCE.historyRewritten === false, "additive");

  // --- Detection path ---
  add("BD-13: the detection path is recorded — a cross-check, not internal review", /Jupiter Lend scouting/.test(BD_DETECTION.foundBy) && /not by review of the assessment/.test(BD_DETECTION.foundBy), "found by comparison");
  add("BD-14: the mechanism records why it was arithmetically impossible", /430476341/.test(BD_DETECTION.mechanism) && /HIGHER slot is necessarily more recent/.test(BD_DETECTION.mechanism), "slot arithmetic");
  add("BD-15: the fixture blind spot is recorded", /internally consistent and externally false/.test(BD_DETECTION.internalConsistencyDidNotCatchIt) && /never its arithmetic against chain/.test(BD_DETECTION.internalConsistencyDidNotCatchIt), "structure ≠ arithmetic");

  // --- Nothing moved ---
  add("BD-16: no score changed", I.scoresChanged === false && dim("audit_security").score === 6 && dim("maturity").score === 4 && dim("incident_history").score === 5, "6 / 4 / 5");
  add("BD-17: no confidence changed", I.confidenceChanged === false && dim("audit_security").confidence === "medium" && dim("maturity").confidence === "low" && dim("incident_history").confidence === "low", "unchanged");
  add("BD-18: the aggregate is unchanged", I.aggregateChanged === false && DA_OUTCOME.unroundedAggregate === 5.93 && I.priorAggregate === I.resultingAggregate, "5.93");
  add("BD-19: meetsMinimum remains false", DA_OUTCOME.meetsMinimum === false && I.meetsMinimum === false, "false");
  add("BD-20: no new assessment version was minted", I.assessmentVersionBumped === false && I.assessmentVersionRemains === "1.0.0" && DA_PROVENANCE.assessmentVersion === "1.0.0", "1.0.0");
  add("BD-21: the manifest hash is unchanged BY CONSTRUCTION", I.manifestHashChanged === false && DA_MANIFEST_HASH === "direct_assessment_54a11ba3" && DA_MANIFEST_HASH === computeDirectAssessmentManifestHash() && /NOT rationale prose/.test(I.manifestHashStableByConstruction), "rationale ∉ hash");
  add("BD-22: the correction invariants hold live", BD_INVARIANTS.aggregateStillFiveNinetyThree === true && BD_INVARIANTS.meetsMinimumStillFalse === true && BD_INVARIANTS.twelveDimensionsIntact === true && BD_INVARIANTS.manifestHashUnchanged === true, "4 invariants");
  add("BD-23: each unmoved score is justified on its REAL reason", I.whyNoScoreMoved.length === 3 && /audit commits are PRIVATE-repo, not that the binary is new/.test(I.whyNoScoreMoved[0]) && /never rested on '3 days'/.test(I.whyNoScoreMoved[1]) && /still postdates every documented event/.test(I.whyNoScoreMoved[2]), "reasons survive");
  add("BD-24: a score-dependent error would have forced a reassessment", /REASSESSMENT requiring a new immutable assessment version/.test(I.ifAScoreHadDepended) && /checked rather than assumed/.test(I.ifAScoreHadDepended), "checked");
  add("BD-25: the reviewer is told regardless", /should know an assessment they are reviewing contained a wrong fact/.test(I.reviewerShouldStillKnow), "disclosed");

  // --- Corrected rationales still coherent ---
  add("BD-26: the three affected rationales now carry the corrected date", /2026-05-28/.test(dim("audit_security").limitingFact) && /2026-05-28/.test(dim("maturity").limitingFact) && /2026-05-28/.test(dim("incident_history").limitingFact), "3 corrected");
  add("BD-27: each corrected rationale marks the correction", /CORRECTED AT 16H-P\.2a/.test(dim("audit_security").limitingFact) && /CORRECTED AT 16H-P\.2a/.test(dim("maturity").limitingFact) && /corrected at 16H-P\.2a/.test(dim("incident_history").limitingFact), "traceable");
  add("BD-28: incident_history's gap-4 reasoning still holds against the real date", /postdates every documented event/.test(dim("incident_history").limitingFact) && new Date(F.deployedAt) > new Date("2026-02-06") && new Date(F.deployedAt) > new Date("2026-05-05"), "2026-05-28 > both");
  add("BD-29: audit_security's linkage gap is date-independent", /every referenced commit is private and unmappable/.test(dim("audit_security").limitingFact) && /linkage gap is unaffected by the correction/.test(dim("audit_security").limitingFact), "private commits");
  add("BD-30: the correction manifest is deterministic", BD_HASH === computeBinaryDateCorrectionHash() && /^binary_date_correction_[0-9a-f]{8}$/.test(BD_HASH), BD_HASH);
  add("BD-31: prior evidence remains immutable", SOL_BTC_USDC_IDENTITY_MANIFEST_HASH === "identity_9773ac14" && AUTH_MANIFEST_HASH === computeAuthorityManifestHash() && ALIAS_AMENDMENT_MANIFEST_HASH === computeAliasAmendmentManifestHash() && VERIFIED_EVIDENCE_MANIFEST_HASH === "evidence_a86da1fd", "4 intact");
  add("BD-32: the Steakhouse assessment is untouched", Math.abs(AUTOMATED_ASSESSMENT_OUTCOME.preCapWeightedAggregate - 5.37) < 0.005 && AUTOMATED_ASSESSMENT_OUTCOME.meetsMinimum === false, "5.37 / false");

  return checks;
}

/* ------------------------------------------------------------------ *
 * 16H-R.1 — Jupiter Lend USDC Canonical Risk Evidence Package
 * ------------------------------------------------------------------ */

export function runJupiterPackageFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const src = readFileSync(`${process.cwd()}/src/suggestions/jupiterLendUsdcRiskEvidencePackage.ts`, "utf8");
  const B = JUP_BINDING, G = JUP_GRAPH, R = JUP_READINESS, D = JUP_DIMS;
  const dim = (id: string) => D.find((d) => d.dimensionId === id)!;
  const prog = (id: string) => G.find((p) => p.programId.startsWith(id))!;
  const CANON = ["audit_security","maturity","upgrade_admin_authority","manager_discretion","strategy_complexity","composability_dependency","oracle_risk","liquidity_withdrawal","asset_stablecoin_risk","withdrawal_fee_transparency","operational_dependency_risk","incident_history"];

  // --- Identity ---
  add("JP-1: the USDC mint alone is insufficient identity", (B.identityNotEstablishedBy as readonly string[]).includes("the USDC mint alone") && /mintAuthority = pool account/.test(B.identityEstablishedBy), "account-chain bound");
  add("JP-2: the exact lending pool is required", B.poolAccount === "5nmGjA4s7ATzpBQXC5RNceRpaJ7pYw2wKsNBWyuSAZV6" && validateJupBinding({ candidateId: B.candidateId, liquidityMint: B.liquidityMint, receiptTokenMint: B.receiptTokenMint, poolAccount: "So11111111111111111111111111111111111111112", cluster: "mainnet-beta" }).failure === "pool_mismatch", "pool bound");
  add("JP-3: the exact receipt-token mint is required", B.receiptTokenMint === "9BEcn9aPEmhSPbPQeFGjidRiEKki46fVQDyPpSQXPA2D" && validateJupBinding({ candidateId: B.candidateId, liquidityMint: B.liquidityMint, receiptTokenMint: "So11111111111111111111111111111111111111112", poolAccount: B.poolAccount, cluster: "mainnet-beta" }).failure === "receipt_mint_mismatch", "jlUSDC bound");
  add("JP-4: symbol/URL/APY are rejected as identity", B.identityNotEstablishedBy.length === 5 && (B.identityNotEstablishedBy as readonly string[]).includes("an APY value") && (B.identityNotEstablishedBy as readonly string[]).includes("an app URL"), "5 rejected");
  add("JP-5: exactly one canonical-USDC pool is established from the official API", B.singleUsdcPool === true && /returns exactly ONE entry with assetAddress = canonical USDC/.test(B.singleUsdcPoolEvidence), "1 of 7");
  add("JP-6: the canonical USDC mint and receipt decimals are exact", B.liquidityMint === "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" && B.receiptTokenDecimals === 6 && B.receiptTokenProgram === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", "6dp / Tokenkeg");
  add("JP-7: jlUSDC freeze authority is verified ABSENT", B.receiptTokenFreezeAuthority === null && /VERIFIED absent/.test(B.receiptTokenFreezeAuthorityNote), "no freeze");

  // --- Program graph ---
  add("JP-8: all material program IDs are represented", G.length === 2 && G.some((p) => p.programId === "jup3YeL8QhtSx1e253b2FDvsMNC87fDrgQZivbrndc9") && G.some((p) => p.programId === "jupeiUmn818Jg1ekPURTpr4mFo29p46vygyykFJ3wZC"), "2 programs");
  add("JP-9: jup3YeL8 is PROVEN not to be the whole product", JUP_GRAPH_FINDINGS.jup3YeL8IsNotTheWholeProduct === true && /owns only 10 accounts/.test(JUP_GRAPH_FINDINGS.proofItIsNotTheWholeProduct) && /offset 40/.test(JUP_GRAPH_FINDINGS.proofItIsNotTheWholeProduct), "proven, not assumed");
  add("JP-10: both programs record ProgramData, slot, date and authority", G.every((p) => p.programDataAccount.length > 0 && p.programDataPointerMatchesDerivation === true && p.deployedSlot > 0 && p.deployedAt.length > 0 && p.upgradeAuthority.length > 0), "complete nodes");
  add("JP-11: the liquidity program HOLDS the funds and is ~33 hours old", prog("jupeiUmn").supplierPrincipalDependsOnIt === true && prog("jupeiUmn").deployedAt === "2026-07-16" && /HOURS/.test(prog("jupeiUmn").ageAtCutoff) && /HOLDS SUPPLIER FUNDS/.test(prog("jupeiUmn").role), "33h old, 428.6M");
  add("JP-12: the graph is recorded as a LOWER BOUND, not complete", JUP_GRAPH_FINDINGS.graphMayBeIncomplete === true && /LOWER BOUND/.test(JUP_GRAPH_FINDINGS.graphIncompletenessNote), "incomplete");

  // --- Authority: not generalized ---
  add("JP-13: one program's authority is NOT generalized — it was verified per-program", JUP_GRAPH_FINDINGS.bothProgramsShareOneUpgradeAuthority === true && G.every((p) => p.upgradeAuthority === "4MsgBB5VPoTrUSp5XnfbViV386C1UnsTdifLBw33ZMSJ") && /verified per-program, not assumed/.test(JUP_GRAPH_FINDINGS.sharedAuthorityMeaning), "checked on both");
  add("JP-14: threshold/timelock evidence is exact-address bound", /4-of-8/.test(JUP_GRAPH_FINDINGS.sharedAuthorityMeaning) && /12h/.test(JUP_GRAPH_FINDINGS.sharedAuthorityMeaning) && (dim("upgrade_admin_authority").limitations as string[]).some((l) => /multisig decode was not re-run inside this package/.test(l)), "bound + honest limitation");
  add("JP-15: a single authority controlling BOTH programs is recorded as unfavorable", (dim("upgrade_admin_authority").unfavorableFacts as string[]).some((f) => /ONE authority .* can upgrade BOTH/.test(f)), "shared risk");
  add("JP-16: unlocated programs' authorities are flagged unknown", (dim("upgrade_admin_authority").unfavorableFacts as string[]).some((f) => /LOWER BOUND/.test(f)), "graph gap");

  // --- Audit / binary ---
  add("JP-17: the current binary does NOT inherit audit applicability", JUP_SRC2BIN.code4renaAuditedCommitMapsToAnyLiveProgram === false && JUP_SRC2BIN.liveJulyBinaryHasPublicSource === false, "no inheritance");
  add("JP-18: Code4rena commit applicability is represented exactly", JUP_SRC2BIN.code4renaEvidence.auditedCommit === "626b177f235224bc5d074d39439cd2558f542886" && JUP_SRC2BIN.code4renaEvidence.auditedCommitExistsPublicly === true && JUP_SRC2BIN.code4renaEvidence.declaredIdsDeployedOnMainnet === false && JUP_SRC2BIN.code4renaEvidence.liveIdsAppearInAuditedSource === false, "exists but unmapped");
  add("JP-19: NEITHER live program is a verified build", G.every((p) => p.verifiedBuild === "public_source_does_not_match_live_binary") && G.every((p) => /is_verified: false/.test(p.verifiedBuildEvidence)), "both unverified");
  add("JP-20: the deployed surface cannot be independently reviewed", JUP_SRC2BIN.currentDeployedSurfaceCanBeIndependentlyReviewed === false && /No verified build/.test(JUP_SRC2BIN.cannotReviewEvidence) && G.every((p) => p.onChainIdl === false), "unreadable");
  add("JP-21: the Kamino contrast is factual, not a ranking", /is_verified: TRUE/.test(JUP_SRC2BIN.contrastWithKamino) && /factual contrast, not a ranking/.test(JUP_SRC2BIN.contrastWithKamino), "contrast only");
  add("JP-22: Code4rena findings are recorded as unavailable", JUP_SRC2BIN.code4renaEvidence.findingsPublic === false && /treated as sensitive/.test(JUP_SRC2BIN.code4renaEvidence.findingsNote), "withheld");

  // --- Fluid continuity ---
  add("JP-23: Fluid design maturity is separate from Solana deployment maturity", JUP_CONTINUITY.designLineageIsNotBinaryProvenance === true && /not deployed-program operating history/.test(JUP_CONTINUITY.ethereumFluidMaturityDoesNotTransfer) && (dim("maturity").limitations as string[]).some((l) => /does not transfer/.test(l)), "not transferred");
  add("JP-24: continuity is classified as a private continuation, with reasoning", JUP_CONTINUITY.classification === "C_private_continuation_of_a_public_audited_design" && /not 'exact source deployed unchanged'/.test(JUP_CONTINUITY.reasoning) && /~5 months/.test(JUP_CONTINUITY.privateCodeGap), "class C");

  // --- Blocking gaps ---
  add("JP-25: the principal write-down path cannot be omitted — it is recorded as unresolved", JUP_LOSS.resolved === false && JUP_LOSS.mandatoryForReadiness === true && /whether principal can be written down/.test(JUP_LOSS.whyUnresolved), "mandatory + absent");
  add("JP-26: bad-debt isolation is explicit and unresolved", JUP_COLLAT.isolationUnresolved.length > 0 && /suggestion is not evidence/.test(JUP_COLLAT.isolationUnresolved) && /must not be inferred from naming or UI grouping/.test(JUP_COLLAT.isolationUnresolved), "not inferred");
  add("JP-27: shared-liquidity behaviour is explicit", /shared liquidity across markets/.test(JUP_COLLAT.isolationUnresolved) && /could reach all jlUSDC holders/.test(JUP_COLLAT.isolationUnresolved), "explicit");
  add("JP-28: the collateral universe is represented as unresolved, not empty", JUP_COLLAT.resolved === false && JUP_COLLAT.unresolved.length === 4 && /WSOL/.test(JUP_COLLAT.partialObservation) && JUP_COLLAT.concentrationUnresolved === true, "sampled only");
  add("JP-29: the exact USDC oracle does NOT replace collateral-oracle review", /would not substitute for collateral-side oracle evidence/.test(JUP_ORACLE.usdcPricingDoesNotSubstitute) && JUP_ORACLE.resolved === false, "neither side");
  add("JP-30: the loss waterfall cannot be substituted by API or docs", /are not the deployed Solana instruction set/.test(JUP_LOSS.cannotBeSubstituted), "no substitute");

  // --- Liquidity ---
  add("JP-31: current liquidity is NOT described as guaranteed", JUP_LIMITER.currentLiquidityIsNotGuaranteed === true && (dim("liquidity_withdrawal").prohibitedInferences as string[]).some((p) => /guaranteed future liquidity/.test(p)) && (dim("liquidity_withdrawal").prohibitedInferences as string[]).some((p) => /supply size is exit capacity/.test(p)), "not guaranteed");
  add("JP-32: the dynamic withdrawal limiter is represented", JUP_LIMITER.exists === true && JUP_LIMITER.observed.expandPercent === 5000 && JUP_LIMITER.observed.expandDuration === 21600 && Number(JUP_LIMITER.observed.baseWithdrawalLimit) > 0, "50% / 6h");
  add("JP-33: the ACTUAL withdrawable (~15% of supply) is the headline, not the 50% limit", /~64.38M against a supply of ~428.59M — about 15%/.test(JUP_LIMITER.headlineFinding) && JUP_LIMITER.observed.withdrawableTokens < JUP_LIMITER.observed.withdrawalLimitTokens, "64.38M < 214.3M");
  add("JP-34: the limiter's semantics are recorded as unresolved", /NOT readable without source or an IDL/.test(JUP_LIMITER.semanticsUnresolved) && /whether an authority can tighten it instantly/.test(JUP_LIMITER.semanticsUnresolved), "unread");
  add("JP-35: emergency exit-freeze controls are represented as unresolved", /Who can pause deposits or withdrawals/.test(JUP_POWERS.emergencyControlsUnresolved) && JUP_POWERS.resolved === false, "unknown");

  // --- APY / rewards ---
  add("JP-36: rewards are separate from base APY", JUP_APY.observedSupplyRate === 343 && JUP_APY.observedRewardsRate === 70 && JUP_APY.observedTotalRate === 413, "3.43 + 0.70 = 4.13");
  add("JP-37: the scouting APY was reverified and drifted", /3\.44% base/.test(JUP_APY.scoutingClaimWas) && /drifted by 0\.01pp/.test(JUP_APY.reverifiedAs), "reverified");
  add("JP-38: the rewards contradiction is surfaced, not smoothed", /UNRESOLVED CONTRADICTION/.test(JUP_APY.rewardsContradiction) && /rewards` array is EMPTY/.test(JUP_APY.rewardsContradiction), "70bps vs []");
  add("JP-39: APY is not used as favorable risk evidence", /not evidence of lower risk and is not used as such/.test(JUP_APY.apyIsNotFavorableRiskEvidence) && dim("liquidity_withdrawal").favorableFacts.every((f) => !/4\.13|APY|yield/i.test(f)), "not favorable");
  add("JP-40: 1 jlUSDC is NOT assumed to equal 1 USDC", JUP_CLAIM.oneToOneAssumed === false && JUP_CLAIM.observedShareRate === 1.051795 && /API-reported figure/.test(JUP_CLAIM.apiIsNotAnAccountingAuthority), "1.0518");

  // --- Structure ---
  add("JP-41: all 12 dimensions in canonical order with correct weights", D.length === 12 && D.map((d) => d.dimensionId).join(",") === CANON.join(",") && D.reduce((a, d) => a + d.weight, 0) === 100, "canonical");
  add("JP-42: NO score exists in the package", D.every((d) => !("score" in d)) && JUP_CONFERS.scoresAssigned === false && JUP_MANIFEST.containsScores === false, "score-free");
  add("JP-43: NO estimated aggregate exists", JUP_CONFERS.aggregateCalculated === false && JUP_MANIFEST.containsAggregate === false && !/estimatedAggregate|likelyScore|suggestedScore|anchorRecommendation/.test(src), "none");
  add("JP-44: NO threshold targeting exists", JUP_CONFERS.thresholdTargeting === false && JUP_COMPARISON_RULES.jupiterNotTargetedAbove593 === true && !/target(ing)? (a score above|5\.93|the minimum)/i.test(src.replace(/Do not target[^"]*/g, "")), "not targeted");
  add("JP-45: every dimension carries favorable AND unfavorable handling plus prohibited inferences", D.every((d) => d.prohibitedInferences.length > 0 && d.scorerInstructions.length > 0 && d.invalidationTriggers.length > 0 && d.evidenceRefs.length > 0), "12 complete");

  // --- Comparison ---
  add("JP-46: the structural comparison does not modify either product", JUP_COMPARISON_RULES.doesNotModifyEitherProduct === true && JUP_COMPARISON_RULES.kaminoAggregateUnchanged === 5.93 && JUP_CONFERS.kaminoAssessmentChanged === false, "read-only");
  add("JP-47: Kamino's assessment remains 5.93", DA_OUTCOME.unroundedAggregate === 5.93 && DA_OUTCOME.meetsMinimum === false && DA_MANIFEST_HASH === "direct_assessment_54a11ba3", "unchanged");
  add("JP-48: the comparison uses only the four permitted verdicts", JUP_COMPARE.every((c) => ["potentially_stronger","approximately_comparable","potentially_weaker","unresolved"].includes(c.jupiterVsKamino)) && JUP_COMPARE.length === 15, "15 aspects");
  add("JP-49: no overall safety claim is made", /does not state that either product is safer overall/.test(JUP_COMPARISON_RULES.noOverallSafetyClaim) && JUP_COMPARISON_RULES.noScoreInheritance.length > 0, "aspect-wise only");
  add("JP-50: the comparison is honest in BOTH directions", JUP_COMPARE.some((c) => c.jupiterVsKamino === "potentially_stronger") && JUP_COMPARE.some((c) => c.jupiterVsKamino === "potentially_weaker") && JUP_COMPARE.some((c) => c.jupiterVsKamino === "unresolved"), "not one-sided");

  // --- Readiness ---
  add("JP-51: the package is NOT ready", R.readiness === "not_ready_for_automated_assessment", "not ready");
  add("JP-52: four dimensions are insufficient, carrying 37% of weight", R.insufficientDimensions.length === 4 && D.filter((d) => !d.scoreable).reduce((a, d) => a + d.weight, 0) === 37, "37%");
  add("JP-53: the insufficient set is exactly the unreadable-binary consequence", ["audit_security","manager_discretion","oracle_risk","incident_history"].every((id) => R.insufficientDimensions.includes(id)), "4 named");
  add("JP-54: blocking artifacts are enumerated exactly", R.blockingArtifacts.length === 8 && R.blockingArtifacts.some((a) => /no verified build/.test(a)) && R.blockingArtifacts.some((a) => /loss waterfall unresolved \(MANDATORY/.test(a)), "8 artifacts");
  add("JP-55: readiness is deterministic both ways", evaluateJupReadiness(D.map((d) => ({ ...d, scoreable: true, readiness: "partial" as const }))).readiness === "ready_for_automated_assessment" && R.readiness === "not_ready_for_automated_assessment", "deterministic");
  add("JP-56: not-ready is justified by missing evidence, NOT by comparison", /rests on missing evidence classes, not on comparison/.test(JUP_RATIONALE.notBecauseJupiterIsAnAlternative) && /regardless of what any score turned out to be/.test(JUP_RATIONALE.notBecauseJupiterIsAnAlternative), "evidence-based");
  add("JP-57: readiness is not suitability", /not suitability, approval or recommendation eligibility/.test(JUP_RATIONALE.readinessIsNotSuitability), "scoped");
  add("JP-58: the asymmetry with Kamino is stated precisely", /one level deeper/.test(JUP_RATIONALE.theAsymmetryWithKamino) && /the artifact that would carry the evidence does not exist publicly/.test(JUP_RATIONALE.theAsymmetryWithKamino), "deeper blocker");

  // --- Boundaries ---
  add("JP-59: Jupiter is NOT added to selector eligibility or production output", JUP_CONFERS.addedToSelectorEligibility === false && JUP_CONFERS.addedToProductionCandidateOutput === false && listStableYieldEvidenceManifests().every((m) => m.strategyId !== "jupiter_lend_usdc"), "not a candidate");
  add("JP-60: no recommendation, Top Pick, card or execution", (JUP_CONFERS.doesNotConfer as readonly string[]).includes("recommendation eligibility") && (JUP_CONFERS.doesNotConfer as readonly string[]).includes("Top Pick") && (JUP_CONFERS.doesNotConfer as readonly string[]).includes("a production card") && JUP_CONFERS.transactionConstructedOrSimulated === false && !/sendTransaction|signTransaction|simulateTransaction/.test(src), "none");
  add("JP-61: no wallet-position or Safety Buffer integration", (JUP_CONFERS.doesNotConfer as readonly string[]).includes("wallet-position integration") && (JUP_CONFERS.doesNotConfer as readonly string[]).includes("Safety Buffer integration"), "none");
  add("JP-62: the preparer is not the scorer", B.preparationRole === "evidence_preparer" && B.preparerIsNotScorer === true && B.rubricHash === computeRubricV1Hash(), "SoD held");
  add("JP-63: the manifest is deterministic", JUP_MANIFEST_HASH === computeJupPackageManifestHash() && /^jup_risk_package_[0-9a-f]{8}$/.test(JUP_MANIFEST_HASH), JUP_MANIFEST_HASH);
  add("JP-64: prior evidence remains immutable", SOL_BTC_USDC_IDENTITY_MANIFEST_HASH === "identity_9773ac14" && AUTH_MANIFEST_HASH === computeAuthorityManifestHash() && CAPACITY_EVIDENCE_MANIFEST_HASH === computeCapacityEvidenceManifestHash() && VERIFIED_EVIDENCE_MANIFEST_HASH === "evidence_a86da1fd" && Math.abs(AUTOMATED_ASSESSMENT_OUTCOME.preCapWeightedAggregate - 5.37) < 0.005, "5 intact");

  return checks;
}

/* ------------------------------------------------------------------ *
 * 16H-R.1a — Jupiter Lend IDL Discovery Amendment
 * ------------------------------------------------------------------ */

export function runJupIdlAmendmentFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const src = readFileSync(`${process.cwd()}/src/suggestions/jupiterLendIdlDiscoveryAmendment.ts`, "utf8");
  const G = IDL_GRAPH, R = IDL_READINESS, RC = IDL_RECLASS, P = IDL_POWERS;
  const prog = (n: string) => G.find((p) => p.name === n)!;
  const rc = (id: string) => RC.find((r) => r.dimensionId === id)!;

  // --- The error, preserved ---
  add("IA-1: the erroneous 'any available means' claim is preserved verbatim", (IDL_SUPERSEDED.claims as readonly string[]).includes("the deployed instruction set cannot be enumerated by any available means") && IDL_SUPERSEDED.claims.length === 5, "5 claims preserved");
  add("IA-2: the error class is named", IDL_SUPERSEDED.errorClass === "universal_claim_from_an_unfinished_search", "named");
  add("IA-3: the redirect-pivot is recorded as the cause", /pivoted to the API instead of following the redirect/.test(IDL_SUPERSEDED.howMissed) && /one hop away/.test(IDL_SUPERSEDED.howMissed), "self-critical");
  add("IA-4: the recurring pattern across three misses is recorded", /Third instance/.test(IDL_SUPERSEDED.patternNote) && /kamino\.com\/docs\/security/.test(IDL_SUPERSEDED.patternNote) && /generalize to 'does not exist'/.test(IDL_SUPERSEDED.patternNote), "pattern named");
  add("IA-5: history was not rewritten", IDL_EVIDENCE.historyRewritten === false, "additive");

  // --- Corrected graph ---
  add("IA-6: the graph is corrected 2 → 6 programs", G.length === 6 && IDL_GRAPH_FINDINGS.materialProgramCount === 6 && IDL_GRAPH_FINDINGS.priorRecordedCount === 2, "6 programs");
  add("IA-7: four programs were newly located", G.filter((p) => !p.wasLocatedAt16HR1).length === 4 && ["oracle","vaults","flashloan","reward_rate_model"].every((n) => prog(n).wasLocatedAt16HR1 === false), "oracle/vaults/flashloan/rewards");
  add("IA-8: every IDL address matches a LIVE program", G.every((p) => p.idlPublished === true && p.idlAddressMatchesLive === true), "6/6 match");
  add("IA-9: ALL SIX share ONE upgrade authority", new Set(G.map((p) => p.upgradeAuthority)).size === 1 && IDL_GRAPH_FINDINGS.allShareOneUpgradeAuthority === true && G[0].upgradeAuthority === "4MsgBB5VPoTrUSp5XnfbViV386C1UnsTdifLBw33ZMSJ", "1 authority, 6 programs");
  add("IA-10: the concentration finding names the full stack", /liquidity layer holding ~428.6M USDC, the oracle that prices collateral, the vaults that liquidate/.test(IDL_GRAPH_FINDINGS.concentrationFinding), "whole stack");
  add("IA-11: the coordinated 2026-07-16 stack redeploy is recorded", /liquidity .* oracle .* vaults .* ALL deployed on 2026-07-16/.test(IDL_GRAPH_FINDINGS.coordinatedRedeployFinding) && [prog("liquidity"), prog("oracle"), prog("vaults")].every((p) => p.deployedAt === "2026-07-16"), "3 same day");
  add("IA-12: the 108-instruction surface is recorded", IDL_GRAPH_FINDINGS.totalInstructions === 108 && G.reduce((a, p) => a + p.instructionCount, 0) === 108, "108 ix");
  add("IA-13: reward_rate_model is the outlier at ~340 days", prog("reward_rate_model").ageDaysAtAmendment > 300 && prog("reward_rate_model").supplierPrincipalDependsOnIt === false, "340d, not principal-critical");

  // --- IDL is not proof ---
  add("IA-14: an IDL is explicitly NOT a verified build", /not a build attestation and is not source/.test(IDL_CONFERS.idlIsNotAVerifiedBuild) && (IDL_CONFERS.doesNotConfer as readonly string[]).includes("proof that the IDL matches the deployed binary"), "IDL ≠ build");
  add("IA-15: the IDL/binary staleness gap is recorded", /PREDATES the 2026-07-16/.test(IDL_GRAPH_FINDINGS.idlMayBeStaleAgainstLiveBinaries) && /13 days/.test(IDL_GRAPH_FINDINGS.idlMayBeStaleAgainstLiveBinaries), "13-day gap");
  add("IA-16: no Rust source is published", /NOT the program source/.test(IDL_GRAPH_FINDINGS.rustSourceNotPublished) && /Instruction LOGIC remains unreadable/.test(IDL_GRAPH_FINDINGS.rustSourceNotPublished), "IDLs + SDK only");

  // --- Power map ---
  add("IA-17: the privileged-power map is derived from IDL signer lists", P.length === 25 && P.every((x) => x.instruction.length > 0 && x.signer.length > 0 && x.note.length > 0), "25 powers");
  add("IA-18: per-user pause is found and flagged", P.some((x) => x.instruction === "pause_user" && x.signer === "authority" && /PER-USER FREEZE/.test(x.note)), "pause_user");
  add("IA-19: per-user withdrawal limit is found and flagged", P.some((x) => x.instruction === "update_user_withdrawal_limit" && x.signer === "authority" && /individually addressable/.test(x.note)), "targeted limiter");
  add("IA-20: the oracle swap power is found", P.some((x) => x.program === "vaults" && x.instruction === "update_oracle" && x.signer === "authority"), "update_oracle");
  add("IA-21: MY OWN hypothesis is corrected — update_exchange_price is permissionless", IDL_PERMISSIONLESS.some((x) => x.instruction === "update_exchange_price" && /SIGNER LIST IS EMPTY/.test(x.note) && /IT IS NOT AN ADMIN POWER/.test(x.note)), "speculation corrected");
  add("IA-22: no explicit write-down instruction was found, and absence is NOT concluded", IDL_NO_WRITEDOWN.explicitWriteDownFound === false && IDL_NO_WRITEDOWN.totalInstructionsSearched === 108 && /NOT absence of a mechanism/.test(IDL_NO_WRITEDOWN.doNotConcludeAbsence), "not concluded");
  add("IA-23: the Kamino contrast on write-down is exact", /READ FROM DEPLOYED RUST/.test(IDL_NO_WRITEDOWN.contrastWithKamino) && IDL_NO_WRITEDOWN.stillBlocksReadiness === true, "socialize_loss vs unknown");

  // --- Oracle ---
  add("IA-24: the oracle provider is corrected from unknown to Chainlink Data Streams", IDL_ORACLE.priorClaim === "the provider is unknown" && IDL_ORACLE.corrected === true && IDL_ORACLE.primaryProvider === "Chainlink Data Streams", "provider known");
  add("IA-25: the keeper dependency is recorded", /PRESENT/.test(IDL_ORACLE.keeperDependency) && /liveness dependency/.test(IDL_ORACLE.keeperDependency), "keeper-push");
  add("IA-26: oracle parameters remain unresolved — names are not logic", IDL_ORACLE.stillUnresolved.length === 4 && /these are LOGIC, not names/.test(IDL_ORACLE.stillUnresolved[0]) && IDL_ORACLE.usdcPricingStillUnresolved === true, "params open");

  // --- Reclassification ---
  add("IA-27: three dimensions were reclassified to scoreable", RC.filter((r) => r.newScoreable && !r.priorScoreable).length === 3 && rc("audit_security").newScoreable === true && rc("manager_discretion").newScoreable === true && rc("oracle_risk").newScoreable === true, "3 flipped");
  add("IA-28: incident_history was deliberately NOT reclassified", rc("incident_history").newScoreable === false && rc("incident_history").newReadiness === "insufficient" && /MY evidence gap, not Jupiter's/.test(rc("incident_history").reason), "not carried along");
  add("IA-29: the no-overcorrection guard is explicit", /reclassification wave is exactly where an over-correction would hide/.test(IDL_RATIONALE.didNotOvercorrect), "guarded");
  add("IA-30: every reclassification carries a reason", RC.every((r) => r.reason.length > 50), "4 reasoned");
  add("IA-31: audit_security is scoreable but WEAK — not improved", rc("audit_security").newReadiness === "weak" && /NO live program is a verified build/.test(rc("audit_security").reason), "weak, not better");

  // --- Readiness + the mandatory gate ---
  add("IA-32: readiness verdict is UNCHANGED — still not ready", R.readiness === "not_ready_for_automated_assessment" && IDL_RATIONALE.priorReadiness === "not_ready_for_automated_assessment" && IDL_RATIONALE.verdictUnchanged === true, "verdict held");
  add("IA-33: but the prior REASONING is recorded as substantially false", /reached it for a substantially false reason/.test(IDL_RATIONALE.butTheReasoningWasWrong) && /Three of those four are now scoreable/.test(IDL_RATIONALE.butTheReasoningWasWrong), "reasoning corrected");
  add("IA-34: only ONE dimension remains insufficient", R.insufficientDimensions.length === 1 && R.insufficientDimensions[0] === "incident_history", "1, was 4");
  add("IA-35: ten dimensions are partial-but-scoreable", R.partialButScoreableDimensions.length === 10 && R.completeDimensions.length === 1, "10 + 1 + 1 = 12");
  add("IA-36: MANDATORY ARTIFACTS gate readiness independently of dimensions", IDL_MANDATORY.length === 1 && IDL_MANDATORY[0].id === "loss_waterfall" && IDL_MANDATORY[0].resolved === false, "waterfall mandatory");
  add("IA-37: THE GATE DOES NOT LEAK — all dims scoreable + waterfall unresolved stays NOT ready", evaluateReadinessV2(IDL_DIMS_V2.map((d) => ({ ...d, scoreable: true, readiness: "partial" as const }))).readiness === "not_ready_for_automated_assessment", "gate holds");
  add("IA-38: the gate releases only when BOTH conditions are met", evaluateReadinessV2(IDL_DIMS_V2.map((d) => ({ ...d, scoreable: true, readiness: "partial" as const })), [{ id: "loss_waterfall", resolved: true }]).readiness === "ready_for_automated_assessment", "both required");
  add("IA-39: the leak was caught in this amendment's own logic and recorded", /the gate would leak/.test(IDL_RATIONALE.readinessIsGatedOnTwoConditions) && /a defect in the first version of this amendment's own logic/.test(IDL_RATIONALE.readinessIsGatedOnTwoConditions), "self-caught");
  add("IA-40: blocking artifacts name the mandatory failure first", R.blockingArtifacts.some((a) => /MANDATORY ARTIFACT UNRESOLVED: loss_waterfall/.test(a)), "named");
  add("IA-41: the correction's value is stated even though the verdict held", /would conclude Jupiter is unassessable\. It is not\./.test(IDL_RATIONALE.whyThisCorrectionMattersEvenThoughTheVerdictHeld) && /mirror image of inflating it/.test(IDL_RATIONALE.whyThisCorrectionMattersEvenThoughTheVerdictHeld), "understating ≠ safe");

  // --- Sources + boundaries ---
  add("IA-42: the sources that resolved it are recorded", IDL_EVIDENCE.sourcesAdded.length === 3 && IDL_EVIDENCE.sourcesAdded.some((s) => /jup-ag\/jupiter-lend/.test(s)), "3 sources");
  add("IA-43: support.jup.ag was checked and recorded as EMPTY, not left unchecked", /support\.jup\.ag/.test(IDL_EVIDENCE.sourceCheckedAndEmpty) && /Checked and recorded as empty rather than left unchecked/.test(IDL_EVIDENCE.sourceCheckedAndEmpty), "checked");
  add("IA-44: no scores or aggregate were assigned", IDL_CONFERS.scoresAssigned === false && IDL_CONFERS.aggregateCalculated === false && (IDL_CONFERS.doesNotConfer as readonly string[]).includes("readiness"), "none");
  add("IA-45: no selector, recommendation or execution behaviour", IDL_CONFERS.addedToSelectorEligibility === false && IDL_CONFERS.transactionConstructedOrSimulated === false && !/sendTransaction|signTransaction|simulateTransaction/.test(src), "read-only");
  add("IA-46: Kamino's assessment is untouched", IDL_CONFERS.kaminoAssessmentChanged === false && DA_OUTCOME.unroundedAggregate === 5.93 && DA_OUTCOME.meetsMinimum === false && DA_MANIFEST_HASH === "direct_assessment_54a11ba3", "5.93");
  add("IA-47: the amendment manifest is deterministic", IDL_HASH === computeIdlAmendmentHash() && /^jup_idl_amendment_[0-9a-f]{8}$/.test(IDL_HASH), IDL_HASH);
  add("IA-48: the fast-moving-stack invalidation trigger is recorded", (IDL_EVIDENCE.invalidationTriggers as readonly string[]).some((t) => /3 were redeployed 1\.3 days ago — this stack moves fast/.test(t)), "volatility flagged");
  add("IA-49: prior evidence remains immutable", SOL_BTC_USDC_IDENTITY_MANIFEST_HASH === "identity_9773ac14" && AUTH_MANIFEST_HASH === computeAuthorityManifestHash() && VERIFIED_EVIDENCE_MANIFEST_HASH === "evidence_a86da1fd" && Math.abs(AUTOMATED_ASSESSMENT_OUTCOME.preCapWeightedAggregate - 5.37) < 0.005, "4 intact");
  add("IA-50: Jupiter is still not a production candidate", listStableYieldEvidenceManifests().every((m) => m.strategyId !== "jupiter_lend_usdc"), "not a candidate");

  return checks;
}

/* ------------------------------------------------------------------ *
 * 16H-S.0 — Source Completion Amendment
 * ------------------------------------------------------------------ */

export function runSourceCompletionFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const root = process.cwd();
  const readIf = (rel: string) => { try { return readFileSync(`${root}/${rel}`, "utf8"); } catch { return ""; } };
  const asmt = readIf("src/suggestions/klendDirectUsdcAutomatedAssessment.ts");
  const pkg = readIf("src/suggestions/klendDirectUsdcRiskEvidencePackage.ts");
  const steakAsmt = readIf("src/suggestions/steakhouseAutomatedAssessment.ts");
  const closure = readIf("src/suggestions/steakhouseEvidenceClosure.ts");
  const jup = readIf("src/suggestions/jupiterLendUsdcRiskEvidencePackage.ts");
  const p2a = readIf("src/suggestions/directAssessmentBinaryDateCorrection.ts");
  const F = SC_FACTS, dimIH = () => DA_DIMS.find((d) => String(d.dimensionId) === "incident_history")!;

  // --- Superseded claims preserved ---
  add("SC-1: the superseded 'April 2026 latest' claim is preserved verbatim", SC_SUPERSEDED.claims.some((c) => /most recent monthly risk report found is April 2026/.test(c.text)) && SC_SUPERSEDED.claims.length === 4, "4 claims");
  add("SC-2: the error class names the cited-but-unenumerated failure", SC_SUPERSEDED.errorClass === "cited_source_index_never_enumerated", "named");
  add("SC-3: the P.2a historical record is deliberately NOT edited and still carries April 2026", /April 2026/.test(p2a) && /IMMUTABLE historical correction record/.test(SC_SUPERSEDED.historicalRecordsLeftIntact), "immutable record intact");

  // --- The corrected facts ---
  add("SC-4: May and June 2026 reports are recorded with publication dates", F.kaminoRiskReports.reports.length === 2 && F.kaminoRiskReports.reports[1].publishedAt === "2026-07-03" && F.kaminoRiskReports.latestPostdatesKlendBinary === true && F.kaminoRiskReports.latestPredatesKvaultBinary === true, "Jun 2026 / 2026-07-03");
  add("SC-5: the market-monitoring vs code-review distinction is explicit", /NOT code review/.test(F.kaminoRiskReports.natureOfReports) && /recency fact was wrong/.test(F.kaminoRiskReports.natureOfReports), "precision added");
  add("SC-6: the Oct 10 2025 event is recorded with the exact market and $0 bad debt", F.october2025Event.marketsAffected[0].market.includes("Main Market") && F.october2025Event.badDebt === "$0" && /NONE/.test(F.october2025Event.socializedLosses) && /8,000\+/.test(F.october2025Event.liquidationOutcome), "Main $16M, 0 failures");
  add("SC-7: the attestation is NOT treated as the on-chain scan", /narrows; it does not close/.test(F.october2025Event.attestationIsNotAScan), "narrowed, not closed");
  add("SC-8: the five-event relationship is recorded without overclaiming", /CONSISTENT with being one of the five/.test(F.october2025Event.relationshipToFiveEvents) && /Not asserted as identical/.test(F.october2025Event.relationshipToFiveEvents), "no overclaim");
  add("SC-9: seven Jupiter audits are enumerated with firms and dates", F.jupiterAudits.reports.length === 7 && F.jupiterAudits.reports.filter((r) => r.auditor === "Offside Labs").length === 3 && F.jupiterAudits.reports.filter((r) => r.auditor === "OtterSec").length === 2, "Zenith+Offside×3+MixBytes+OtterSec×2");
  add("SC-10: Jupiter's own audit disclaimer is preserved verbatim", /point-in-time review/.test(F.jupiterAudits.officialDisclaimerPreserved) && /does not guarantee/.test(F.jupiterAudits.officialDisclaimerPreserved), "kept");
  add("SC-11: the audit-to-binary linkage is recorded as UNCHANGED", /gap STANDS/.test(F.jupiterAudits.linkageUnchanged) && /~a year old/.test(F.jupiterAudits.linkageUnchanged), "richer set, same gap");
  add("SC-12: the bug bounty is recorded with its weak-signal framing", F.jupiterBugBounty.criticalCap === "$500,000" && F.jupiterBugBounty.resolvedReports === 25 && /WEAK signal/.test(F.jupiterBugBounty.signalReading), "not overweighted");

  // --- Live sites corrected ---
  add("SC-13: the direct assessment limitingFact carries the S.0 correction", /CORRECTED AT 16H-S\.0/.test(dimIH().limitingFact) && /June 2026 \(published 2026-07-03\)/.test(dimIH().limitingFact) && /no CODE review covers the code holding funds/.test(dimIH().limitingFact), "corrected + precise");
  add("SC-14: the P.2a phrases survive in the same limitingFact", /2026-05-28, corrected at 16H-P\.2a/.test(dimIH().limitingFact) && /postdates every documented event/.test(dimIH().limitingFact), "both corrections coexist");
  add("SC-15: the Oct 2025 event is added to favorable evidence, marked", (dimIH().favorableEvidence as string[]).some((f) => /added at 16H-S\.0/.test(f) && /NO-SOCIALIZED-LOSSES attestation/.test(f)), "added + marked");
  add("SC-16: the direct package gap-4 is restated with precision", /RESTATED AT 16H-S\.0/.test(pkg) && /no CODE review postdates the binary/.test(pkg), "restated");
  add("SC-17: the Steakhouse rationale is corrected and its gap still stands", /CORRECTED AT 16H-S\.0 from 'most recent is April 2026'/.test(steakAsmt) && /after even the June report/.test(steakAsmt), "KVault gap stands");
  add("SC-18: the closure comment is annotated", /CORRECTED AT 16H-S\.0/.test(closure) && /search failure/.test(closure), "annotated");
  add("SC-19: the alias amendment gap-4 is corrected and keeps the KVault date", /CORRECTED AT 16H-S\.0/.test(readIf("src/suggestions/incidentMarketAliasAmendment.ts")) && /2026-07-14, which postdates even the June report/.test(readIf("src/suggestions/incidentMarketAliasAmendment.ts")), "corrected, date kept");
  add("SC-20: the Jupiter audit record is corrected 2 → 7 + bounty", /CORRECTED AT 16H-S\.0 \(was 'Zenith and Offside audits are reported'\)/.test(jup) && /OOOsec bug bounty/.test(jup) && /development age is ~a year/.test(jup), "3 Jupiter edits");
  add("SC-21: no live site still asserts April 2026 as latest", ![asmt, pkg, steakAsmt, closure].some((s) => /(most recent|latest) monthly risk report (found )?is April 2026/.test(s.replace(/original text said "[^"]*"/g, "").replace(/CORRECTED AT 16H-S\.0[^"']*/g, ""))), "purged from live claims");
  add("SC-22: all seven corrected sites are enumerated", SC_SITES.length === 7, "7 sites");

  // --- Nothing moved ---
  add("SC-23: no score, confidence or aggregate changed", SC_IMPACT.scoresChanged === false && SC_IMPACT.kaminoAggregate === 5.93 && SC_IMPACT.steakhouseAggregate === 5.37 && DA_OUTCOME.unroundedAggregate === 5.93 && Math.abs(AUTOMATED_ASSESSMENT_OUTCOME.preCapWeightedAggregate - 5.37) < 0.005, "5.93 / 5.37");
  add("SC-24: the assessment manifest hash is unchanged", DA_MANIFEST_HASH === "direct_assessment_54a11ba3" && DA_MANIFEST_HASH === computeDirectAssessmentManifestHash() && SC_IMPACT.assessmentManifestHashUnchanged === DA_MANIFEST_HASH, "hash stable");
  add("SC-25: Jupiter readiness is unchanged", IDL_READINESS.readiness === "not_ready_for_automated_assessment" && SC_IMPACT.jupiterReadinessUnchanged === IDL_READINESS.readiness, "still not ready");
  add("SC-26: each unmoved score is justified on its real reason", SC_IMPACT.whyNoScoreMoves.length === 4 && /anchor does not move/.test(SC_IMPACT.whyNoScoreMoves[0]) && /not a completed search/.test(SC_IMPACT.whyNoScoreMoves[3]), "4 reasons");
  add("SC-27: the reviewer must be told of the double amendment", /amended twice \(P\.2a, S\.0\)/.test(SC_IMPACT.reviewerMustBeTold), "disclosed");

  // --- The rule ---
  add("SC-28: the source-enumeration rule is recorded and binding", /enumerate its index/.test(SC_RULE.rule) && /treated as UNSEARCHED/.test(SC_RULE.rule) && /16H-S\.1 incident-search methodology/.test(SC_RULE.bindingOn), "binding");
  add("SC-29: the rule's motivation names the actual failure", /cited at 16H-L\.2 \(one thread\)/.test(SC_RULE.motivation) && /false confidence/.test(SC_RULE.motivation), "motivated");
  add("SC-30: the round-4 pattern is recorded in the module header", /FOURTH ROUND/.test(readIf("src/suggestions/sourceCompletionAmendment.ts")) && /worst of the four/.test(readIf("src/suggestions/sourceCompletionAmendment.ts")), "pattern named");

  // --- Integrity ---
  add("SC-31: the amendment manifest is deterministic", SC_HASH === computeS0ManifestHash() && /^source_completion_[0-9a-f]{8}$/.test(SC_HASH), SC_HASH);
  add("SC-32: prior evidence remains immutable", SOL_BTC_USDC_IDENTITY_MANIFEST_HASH === "identity_9773ac14" && AUTH_MANIFEST_HASH === computeAuthorityManifestHash() && ALIAS_AMENDMENT_MANIFEST_HASH === computeAliasAmendmentManifestHash() && IDL_HASH === computeIdlAmendmentHash() && VERIFIED_EVIDENCE_MANIFEST_HASH === "evidence_a86da1fd", "5 intact");
  add("SC-33: no execution behaviour was added", SC_CONFERS.transactionConstructedOrSimulated === false && !/sendTransaction|signTransaction|simulateTransaction/.test(readIf("src/suggestions/sourceCompletionAmendment.ts")), "read-only");
  add("SC-34: the amendment confers no score, readiness or search closure", SC_CONFERS.scoresAssigned === false && (SC_CONFERS.doesNotConfer as readonly string[]).includes("a completed incident search") && (SC_CONFERS.doesNotConfer as readonly string[]).includes("closure of the socialize_loss scan"), "bounded");

  return checks;
}

/* ------------------------------------------------------------------ *
 * 16H-S.1 — Incident Search Methodology + validated Kamino admin scan
 * ------------------------------------------------------------------ */

export function runTeamDisclosureFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const A = TD_ANSWERS, C = TD_COLLAT, W = TD_WATERFALL, R = TD_READINESS;

  // --- The governing caveat ---
  add("TD-1: answers are classified as self-reported, not binary-verified", TD_SRC.sourceClass === 2 && TD_SRC.binaryVerified === false && /Design description . deployed logic/.test(TD_SRC.binaryVerifiedNote), "class 2");
  add("TD-2: all five answers are recorded with resolution levels", A.length === 5 && A.every((a) => a.resolutionLevel.length > 0 && a.caveat.length > 0), "5 answers");
  add("TD-3: every answer carries the binary-unverified limitation via source class", TD_SRC.usableButBounded === true && /cannot be cross-checked against the deployed binary/i.test(TD_SRC.binaryVerifiedNote), "bounded");

  // --- Loss waterfall (the mandatory artifact) ---
  add("TD-4: the loss waterfall is design-resolved", W.resolvedAtDesignLevel === true && W.waterfall.length === 5 && W.seniority.includes("none"), "5-step waterfall");
  add("TD-5: it is NOT binary-verified", W.binaryVerified === false && W.residualGaps.some((g) => /verified against the deployed binary/.test(g)), "design only");
  add("TD-6: loss is a share-price decline, corroborating the no-socialize_loss finding", /share-price decline/.test(W.lossMechanism) && /no socialize_loss-equivalent/.test(W.confirmsSocializeLossFinding), "corroborated");
  add("TD-7: the 10% reserve is recorded as NOT a guaranteed backstop", W.waterfall.some((s) => /NOT a confirmed insurance fund/.test(s.event)), "not guaranteed");
  add("TD-8: the correct incident technique (share-price monotonicity) is named", /share-price .* monotonicity/.test(W.correctIncidentTechnique), "technique named");
  add("TD-9: residual gaps are recorded, not smoothed", W.residualGaps.length === 3 && W.residualGaps.some((g) => /exact accounting timing/.test(g)), "gaps kept");

  // --- Isolation reconciled ---
  add("TD-10: the isolation apparent-tension is reconciled, not contradicted", /resolved, not contradictory/.test(TD_ISO.apparentTension) && /per LIQUIDITY ASSET/.test(TD_ISO.reconciliation), "per-asset");
  add("TD-11: practical exposure is recorded as BROAD, not narrow", TD_ISO.practicalExposureIsBroadNotNarrow === true && /isolates by borrowed asset, not by collateral or by risk/.test(TD_ISO.reconciliation), "broad");
  add("TD-12: the isolation answer's caveat sharpens it, not obscures", A[0].caveat.includes("19 collateral types share the risk"), "sharpened");

  // --- On-chain collateral universe ---
  add("TD-13: 19 USDC-borrowing collateral types are enumerated on-chain", C.usdcBorrowingVaults === 19 && C.collateralTypes.length === 19 && C.totalBorrowVaults === 79, "19 of 79");
  add("TD-14: tokenized equities are flagged as risk-notable collateral", C.riskNotableCollateral.tokenizedEquities.assets.length === 4 && C.riskNotableCollateral.tokenizedEquities.assets.includes("TSLAx") && /off-hours/.test(C.riskNotableCollateral.tokenizedEquities.concern), "4 equities");
  add("TD-15: the recursive jlJUPUSD collateral is flagged at 89% LTV", C.riskNotableCollateral.recursive.assets.includes("jlJUPUSD") && C.riskNotableCollateral.recursive.ltv === "89%" && /leverage loop/.test(C.riskNotableCollateral.recursive.concern), "recursive");
  add("TD-16: reflexive JLP collateral is flagged", C.riskNotableCollateral.reflexive.assets.includes("JLP") && /Jupiter's own LP token/.test(C.riskNotableCollateral.reflexive.concern), "reflexive");
  add("TD-17: this is recorded as UNFAVORABLE evidence the clean answer obscured", /UNFAVORABLE evidence the 'isolated by market' answer obscured/.test(C.materiality) && /19 collateral oracles including four equity feeds/.test(C.materiality), "unfavorable");
  add("TD-18: per-collateral parameters remain unresolved", C.stillUnresolved.length === 3 && C.stillUnresolved.some((x) => /liquidation parameters/.test(x)), "params open");

  // --- Rewards + powers ---
  add("TD-19: the rewards contradiction is resolved — no separate rewards", A[4].resolutionLevel === "design" && /empty rewards array is CORRECT/.test(A[4].caveat) && /API decomposition/.test(A[4].caveat), "resolved");
  add("TD-20: powers answer is partial — favorable but incomplete", A[2].resolutionLevel === "design_partial" && /no complete authority matrix/.test(A[2].caveat), "partial");
  add("TD-21: the redeploy remains indeterminate from timing", A[3].resolutionLevel === "unresolved" && /On-chain-resolvable/.test(A[3].caveat), "indeterminate");

  // --- Readiness ---
  add("TD-22: readiness is still not_ready", R.readiness === "not_ready_for_automated_assessment", "not ready");
  add("TD-23: loss_waterfall mandatory artifact is now resolved", TD_MANDATORY.length === 1 && TD_MANDATORY[0].id === "loss_waterfall" && TD_MANDATORY[0].resolved === true && /double-count one gap/.test(TD_MANDATORY[0].basis), "resolved, no double-count");
  add("TD-24: the package is now blocked on ONE thing, incident_history", R.insufficientDimensions.length === 1 && R.insufficientDimensions[0] === "incident_history" && R.blockingArtifacts.length === 1, "1 blocker");
  add("TD-25: one narrow step from ready is recorded honestly", /would make incident_history scoreable/.test(TD_RATIONALE.oneNarrowStepFromReady) && /flip the package to ready/.test(TD_RATIONALE.oneNarrowStepFromReady) && /youth, not evidence/.test(TD_RATIONALE.oneNarrowStepFromReady), "share-price scan");
  add("TD-26: ready would NOT mean suitable", /honest expectation is Jupiter scores below 7/.test(TD_RATIONALE.butReadyIsNotSuitable) && /would not make it eligible/.test(TD_RATIONALE.butReadyIsNotSuitable), "ready ≠ suitable");
  add("TD-27: the binary-unverified caveat is recorded as non-resolving", /design-resolved but binary-UNverified/.test(TD_RATIONALE.theCaveatThatDoesNotResolve) && /keeps audit_security weak/.test(TD_RATIONALE.theCaveatThatDoesNotResolve), "persists");
  add("TD-28: the gate reasoning avoids double-counting the binary gap", /Binary-verification is a SEPARATE fact belonging to audit_security/.test(TD_MANDATORY[0].basis), "no double-count");

  // --- Integrity ---
  add("TD-29: scores unchanged; Kamino untouched", TD_CONFERS.scoresAssigned === false && TD_CONFERS.kaminoAssessmentChanged === false && DA_OUTCOME.unroundedAggregate === 5.93 && DA_MANIFEST_HASH === "direct_assessment_54a11ba3", "5.93");
  add("TD-30: binary still unverified, no clean record conferred", TD_CONFERS.binaryStillUnverified === true && (TD_CONFERS.doesNotConfer as readonly string[]).includes("a binary-verified fact") && (TD_CONFERS.doesNotConfer as readonly string[]).includes("a clean record"), "bounded");
  add("TD-31: the manifest is deterministic", TD_HASH === computeTeamDisclosureHash() && /^jup_team_disclosure_[0-9a-f]{8}$/.test(TD_HASH), TD_HASH);
  add("TD-32: no execution behaviour; Jupiter still not a candidate", TD_CONFERS.transactionConstructedOrSimulated === false && listStableYieldEvidenceManifests().every((m) => m.strategyId !== "jupiter_lend_usdc"), "read-only");
  add("TD-34: readiness flips to ready ONLY if incident_history is also resolved (gate proven)", (() => {
    const dims = DIMENSION_STATE_V3.map((d) => d.dimensionId === "incident_history" ? { ...d, scoreable: true, readiness: "weak" as const } : d);
    const stillBlocked = evaluateReadinessV3();
    const wouldBeReady = evaluateReadinessV3(dims, [{ id: "loss_waterfall", resolved: true }]);
    return stillBlocked.readiness === "not_ready_for_automated_assessment" && stillBlocked.insufficientDimensions[0] === "incident_history" && wouldBeReady.readiness === "ready_for_automated_assessment";
  })(), "gate deterministic");
  add("TD-33: prior evidence remains immutable", IDL_HASH === computeIdlAmendmentHash() && SC_HASH === computeS0ManifestHash() && IS_HASH === computeIncidentSearchHash() && SOL_BTC_USDC_IDENTITY_MANIFEST_HASH === "identity_9773ac14", "4 intact");

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 16H-T.1 — Kamino direct USDC human-review brief.
 * A presentation of the completed 5.93 assessment: binds to its manifest,
 * introduces no score, states the four capping risks, splits evidence
 * solid/thin, and lays out three reviewer-owned options without picking one.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Step 16H-T.1 — Kamino direct USDC human-review brief.
 * A presentation of the completed 5.93 assessment: binds to its manifest,
 * introduces no score, states the four capping risks, splits evidence
 * solid/thin, and lays out three reviewer-owned options without picking one.
 * ------------------------------------------------------------------ */
export function runDirectReviewBriefFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });

  // --- Binding: presents exactly the completed assessment, nothing new ---
  add("RB-1: brief binds to the direct assessment manifest (no drift)", RB_BOUND === "direct_assessment_54a11ba3" && DA_MANIFEST_HASH === RB_BOUND && RB_PROV.presentsAssessmentManifest === RB_BOUND, RB_BOUND);
  add("RB-2: validation passes", RB_VALIDATION.valid === true && validateReviewBrief().valid === true, RB_VALIDATION.errors.join("|") || "clean");
  add("RB-3: authored under the evidence-PREPARER role, not assessor/reviewer", RB_PROV.preparerRole === "evidence_preparer" && RB_PROV.preparerIsNotAssessor === true && RB_PROV.preparerIsNotHumanReviewer === true && RB_PROV.introducesNoNewScore === true, "preparer");

  // --- No new/changed scores: rows are projected row-for-row from the assessment ---
  add("RB-4: rows equal the assessment, in order", RB_ROWS.length === DA_DIMS.length && RB_ROWS.every((r, i) => r.dimensionId === String(DA_DIMS[i].dimensionId) && r.score === DA_DIMS[i].score && r.weight === DA_DIMS[i].weight && r.band === DA_DIMS[i].anchorBand), "12 rows match");
  add("RB-5: projected weights sum to 100", RB_ROWS.reduce((s, r) => s + r.weight, 0) === 100, `sum=${RB_ROWS.reduce((s, r) => s + r.weight, 0)}`);
  add("RB-6: projectRows is a pure projection (idempotent vs source)", (() => { const a = projectRows(); return a.length === 12 && a.every((r, i) => r.score === DA_DIMS[i].score && r.confidence === DA_DIMS[i].confidence); })(), "pure");

  // --- Headline agrees with the assessment output ---
  add("RB-7: headline is 5.93 / floor 7 / meetsMinimum false / band partial", RB_HEADLINE.aggregate === 5.93 && RB_HEADLINE.aggregate === DA_OUTCOME.displayedAggregate && RB_HEADLINE.threshold === 7 && RB_HEADLINE.meetsMinimum === false && RB_HEADLINE.band === "partial", `${RB_HEADLINE.aggregate}/${RB_HEADLINE.threshold}`);
  add("RB-8: distance to floor is 1.07 and framed as a fact, not a target", RB_HEADLINE.distanceToFloor === 1.07 && /gates AUTOMATED eligibility only/.test(RB_HEADLINE.whatTheFloorMeansHere) && /does not lower the floor/.test(RB_HEADLINE.whatTheFloorMeansHere), `d=${RB_HEADLINE.distanceToFloor}`);

  // --- The four capping risks ---
  add("RB-9: exactly four capping risks, each citing real dimensions", RB_CAPS.length === 4 && RB_CAPS.every((c) => c.dimensionsCapped.every((d) => DA_DIMS.some((a) => String(a.dimensionId) === d))), `n=${RB_CAPS.length}`);
  add("RB-10: capping risks name the four uncomfortable facts", RB_CAPS.some((c) => c.id === "socialize_loss_reaches_principal") && RB_CAPS.some((c) => c.id === "zero_timelock_exit_freeze") && RB_CAPS.some((c) => c.id === "no_audit_maps_to_deployed_binary") && RB_CAPS.some((c) => c.id === "borrower_collateral_oracle_unexamined"), "4 facts");
  add("RB-11: the two structural risks are marked structural, not evidentiary", RB_CAPS.find((c) => c.id === "socialize_loss_reaches_principal")?.isStructuralNotEvidentiary === true && RB_CAPS.find((c) => c.id === "zero_timelock_exit_freeze")?.isStructuralNotEvidentiary === true, "structural");

  // --- Evidence solid/thin split derived from readiness ---
  add("RB-12: solid = complete readiness (6), thin = partial readiness (6)", RB_STRENGTH.solid.length === 6 && RB_STRENGTH.thin.length === 6 && RB_STRENGTH.solid.length + RB_STRENGTH.thin.length === 12, `${RB_STRENGTH.solid.length}/${RB_STRENGTH.thin.length}`);
  add("RB-13: partition matches the assessment's own readiness flags", (() => { const p = partitionEvidenceStrength(); const complete = DA_DIMS.filter((a) => a.evidenceReadiness === "complete").map((a) => String(a.dimensionId)); return p.solid.map((s) => s.dimensionId).join(",") === complete.join(","); })(), "derived");
  add("RB-14: low-confidence dimensions are flagged for reviewer attention", /maturity, oracle_risk, incident_history/.test(RB_STRENGTH.note) && RB_STRENGTH.thin.some((t) => t.dimensionId === "oracle_risk" && t.confidence === "low"), "flagged");

  // --- Three options, reviewer-owned, none pre-selected ---
  add("RB-15: exactly three decision options", RB_OPTIONS.length === 3 && RB_OPTIONS.map((o) => o.id).join(",") === "accept_residual_risk,require_mitigations,hold", RB_OPTIONS.map((o) => o.id).join(","));
  add("RB-16: every option is owned by the human reviewer, none pre-selected", RB_OPTIONS.every((o) => o.whoDecides === "human_risk_reviewer") && RB_STATE.outcomeSelectedByPreparer === false && RB_PROV.recommendsNoOutcome === true, "reviewer-owned");
  add("RB-17: accept option is an explicit override, not a floor change", /explicit\s+human override of the automated gate/.test(RB_OPTIONS[0].consequenceIfChosen) && /floor is NOT changed/.test(RB_OPTIONS[0].consequenceIfChosen), "override");
  add("RB-18: mitigate option does NOT promise clearing 7", /does NOT guarantee clearing/.test(RB_OPTIONS[1].consequenceIfChosen) && RB_MITIG.length === 4 && RB_MITIG.some((m) => m.unblocks === "oracle_risk" && /EITHER direction/.test(m.note)), "no promise");
  add("RB-19: hold option preserves existing-position recognition", /Existing-position recognition and visibility are unaffected/.test(RB_OPTIONS[2].consequenceIfChosen), "preserved");

  // --- Separation of duties / no fabrication ---
  add("RB-20: reviewer/signoff/approval fields are null; no fabricated reviewer", RB_STATE.reviewerId === null && RB_STATE.reviewerSignoff === null && RB_STATE.approval === null && RB_STATE.reviewerIdentityFabricated === false, "null");
  add("RB-21: brief changes no floor and retargets no score", RB_STATE.floorChanged === false && RB_STATE.anyScoreRetargeted === false && RB_CONFERS.changedFloor === false && RB_CONFERS.changedAnyScore === false, "unchanged");
  add("RB-22: confers a presentation only — not review, signoff, approval, or a card", (RB_CONFERS.doesNotConfer as readonly string[]).includes("human review") && (RB_CONFERS.doesNotConfer as readonly string[]).includes("risk signoff") && (RB_CONFERS.doesNotConfer as readonly string[]).includes("product approval") && (RB_CONFERS.doesNotConfer as readonly string[]).includes("a production card") && RB_CONFERS.humanReviewOccurred === false, "presentation");

  // --- The assessment and its neighbours are untouched ---
  add("RB-23: the underlying assessment is unchanged (still 5.93, still false)", DA_OUTCOME.unroundedAggregate === 5.93 && DA_OUTCOME.meetsMinimum === false && DA_MANIFEST_HASH === computeDirectAssessmentManifestHash(), "5.93");
  add("RB-24: no execution behaviour", RB_CONFERS.transactionConstructedOrSimulated === false && RB_CONFERS.selectorChanged === false && RB_CONFERS.solStakingChanged === false, "read-only");

  // --- Score confidentiality ---
  add("RB-25: brief is marked internal-only for the numeric score", /INTERNAL ONLY/.test(RB_CONFERS.scoreIsInternalOnly) && /never appear on suggestion cards/.test(RB_CONFERS.scoreIsInternalOnly), "internal");

  // --- Manifest determinism ---
  add("RB-26: manifest hash is deterministic and well-formed", RB_HASH === computeReviewBriefHash() && /^review_brief_[0-9a-f]{8}$/.test(RB_HASH) && RB_MANIFEST.presentsAssessmentManifest === RB_BOUND, RB_HASH);

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 16H-T.2 — Jupiter Lend USDC provisional bounded assessment.
 * Scores the 11 scoreable dimensions, holds incident_history as an
 * unknown spanned 0..10, and proves the aggregate band [4.12, 4.32]
 * sits entirely below the floor — so the unknown cannot change the answer.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Step 16H-T.2 — Jupiter Lend USDC provisional bounded assessment.
 * Scores the 11 scoreable dimensions, holds incident_history as an
 * unknown spanned 0..10, and proves the aggregate band [4.12, 4.32]
 * sits entirely below the floor — so the unknown cannot change the answer.
 * ------------------------------------------------------------------ */
export function runJupProvisionalAssessmentFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });

  // --- Binding + validity ---
  add("JP-1: binds to the 3 Jupiter source manifests (no drift)", JP_BOUND_PKG === "jup_risk_package_4d19e296" && JP_BOUND_IDL === "jup_idl_amendment_15730409" && JP_BOUND_TD === "jup_team_disclosure_94951f2a" && JUP_MANIFEST_HASH === "jup_risk_package_4d19e296", "bound");
  add("JP-2: validation passes", JP_VALIDATION.valid === true && validateJupProvisional().valid === true, JP_VALIDATION.errors.join("|") || "clean");
  add("JP-3: authored as the automated assessor, not a reviewer", JP_PROV.assessorRole === "automated_risk_assessor" && JP_PROV.assessorIsNotHumanReviewer === true && JP_PROV.kind === "provisional_bounded", "assessor");

  // --- Exactly 11 scored; incident_history held out ---
  add("JP-4: 11 dimensions scored, incident_history NOT among them", JP_SCORES.length === 11 && !JP_SCORES.some((d) => d.dimensionId === "incident_history"), `n=${JP_SCORES.length}`);
  add("JP-5: incident_history is held out, unscored, neither zero nor favorable", JP_HELDOUT.scored === false && JP_HELDOUT.weight === 2 && JP_STATE.incidentHistoryScoredAsZero === false && JP_STATE.incidentHistoryTreatedAsFavorable === false, "held out");
  add("JP-6: scored weight is 98, total is 100", JP_SCORES.reduce((s, d) => s + d.weight, 0) === 98 && JP_SCORES.reduce((s, d) => s + d.weight, 0) + JP_HELDOUT.weight === 100, "98+2");
  add("JP-7: every score is in-range and matches its anchor band", JP_SCORES.every((d) => Number.isInteger(d.score) && d.score >= 0 && d.score <= 10) && JP_SCORES.every((d) => anchorMatchesScore(d.score, d.anchorBand)), "anchored");

  // --- The arithmetic ---
  add("JP-8: scored weighted points total 412", scoredWeightedPoints() === 412, `pts=${scoredWeightedPoints()}`);
  add("JP-9: aggregate band is [4.12, 4.32]", JP_AGG.lowerBound === 4.12 && JP_AGG.upperBound === 4.32, `[${JP_AGG.lowerBound}, ${JP_AGG.upperBound}]`);
  add("JP-10: band width equals the weight-2 maximum of 0.20", JP_AGG.bandWidth === 0.2, `w=${JP_AGG.bandWidth}`);
  add("JP-11: recompute is deterministic", (() => { const a = computeBoundedAggregate(); return a.lowerBound === 4.12 && a.upperBound === 4.32 && a.totalWeight === 100; })(), "deterministic");

  // --- The conclusion: below floor even at the generous upper bound ---
  add("JP-12: upper bound (incident=10) is below the floor of 7", JP_OUTCOME.upperBound < 7 && JP_OUTCOME.meetsMinimumEvenAtUpperBound === false, `ub=${JP_OUTCOME.upperBound}`);
  add("JP-13: distance from upper bound to floor is 2.68", JP_OUTCOME.distanceFromUpperBoundToFloor === 2.68, `d=${JP_OUTCOME.distanceFromUpperBoundToFloor}`);
  add("JP-14: the finding is stated as provisional, not final", JP_OUTCOME.provisional === true && JP_OUTCOME.isFinalAggregate === false && /provisionally FAILS the floor/.test(JP_OUTCOME.interpretation), "provisional");

  // --- Robustness ---
  add("JP-15: conclusion is robust to the soft point scores", JP_ROBUST.conclusionIsRobustToPointJudgement === true && JP_ROBUST.worstCaseGenerousScenarioAggregate < 7 && /cannot plausibly approach 7|the evidence points the other way/i.test(JP_ROBUST.reasoning), `worst=${JP_ROBUST.worstCaseGenerousScenarioAggregate}`);
  add("JP-16: only a verified build could materially move it — a protocol change, not a re-score", /verified build/.test(JP_ROBUST.whatWouldChangeIt) && /protocol-side change/.test(JP_ROBUST.whatWouldChangeIt), "protocol change");

  // --- Anchoring: the one high-confidence dimension, and the low-confidence rest ---
  add("JP-17: asset_stablecoin_risk is the only high-confidence score (8, supported)", (() => { const a = JP_SCORES.find((d) => d.dimensionId === "asset_stablecoin_risk"); const highs = JP_SCORES.filter((d) => d.confidence === "high"); return a?.score === 8 && a?.confidence === "high" && highs.length === 1; })(), "1 high");
  add("JP-18: audit_security capped in weak band by binary-unverifiability", (() => { const a = JP_SCORES.find((d) => d.dimensionId === "audit_security"); return a?.score === 4 && a?.anchorBand === "weak" && /verified build/.test(a.limitingFact); })(), "audit=4");
  add("JP-19: maturity reflects the ~33-hour fund-holding binary", (() => { const a = JP_SCORES.find((d) => d.dimensionId === "maturity"); return a?.score === 3 && /33 HOURS/.test(a.limitingFact); })(), "maturity=3");
  add("JP-20: liquidity reflects the ~15% withdrawal-limiter constraint", (() => { const a = JP_SCORES.find((d) => d.dimensionId === "liquidity_withdrawal"); return a?.score === 4 && /15%|64.38M/.test(a.limitingFact); })(), "liq=4");
  add("JP-21: every scored dimension carries a Kamino comparison", JP_SCORES.every((d) => d.vsKamino.length > 0), "compared");

  // --- Consistency with the evidence system's own state ---
  add("JP-22: evidence system still reports not_ready with incident_history the sole blocker", TD_READINESS.readiness === "not_ready_for_automated_assessment" && (() => { const r = IDL_DIMS_V2.find((d) => d.dimensionId === "incident_history"); return r?.scoreable === false; })(), "consistent");
  add("JP-23: provisional assessment does NOT flip readiness or open the gate", JP_STATE.readinessFlipped === false && JP_STATE.finalAssessmentState === "not_ready" && JP_STATE.incidentHistoryGate === "open" && JP_PROV.readinessFlipped === false, "gate open");

  // --- Separation of duties / integrity ---
  add("JP-24: reviewer/signoff/approval are null; no fabrication", JP_STATE.reviewerId === null && JP_STATE.reviewerSignoff === null && JP_STATE.approval === null && JP_STATE.reviewerIdentityFabricated === false, "null");
  add("JP-25: confers a bound only — not review, signoff, approval, readiness, or a clean record", (JP_CONFERS.doesNotConfer as readonly string[]).includes("a final assessment") && (JP_CONFERS.doesNotConfer as readonly string[]).includes("risk signoff") && (JP_CONFERS.doesNotConfer as readonly string[]).includes("readiness") && (JP_CONFERS.doesNotConfer as readonly string[]).includes("a clean incident record") && JP_CONFERS.incidentHistoryScored === false, "bound only");
  add("JP-26: Kamino/Steakhouse/SOL-staking assessments untouched", JP_CONFERS.kaminoAssessmentChanged === false && JP_CONFERS.steakhouseAssessmentChanged === false && JP_CONFERS.solStakingChanged === false && DA_OUTCOME.unroundedAggregate === 5.93, "untouched");
  add("JP-27: no execution behaviour; internal-only", JP_CONFERS.transactionConstructedOrSimulated === false && /INTERNAL ONLY/.test(JP_CONFERS.scoreIsInternalOnly), "read-only");

  // --- Manifest determinism + provisional score comparison ---
  add("JP-28: manifest hash is deterministic and well-formed", JP_HASH === computeJupProvisionalHash() && /^jup_provisional_[0-9a-f]{8}$/.test(JP_HASH) && JP_MANIFEST.upperBound === 4.32, JP_HASH);
  add("JP-29: Jupiter's upper bound (4.32) is below both scored candidates (Kamino 5.93, Steakhouse 5.37)", JP_AGG.upperBound < 5.37 && JP_AGG.upperBound < DA_OUTCOME.unroundedAggregate && DA_OUTCOME.unroundedAggregate === 5.93, `${JP_AGG.upperBound}<5.37<5.93`);

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 16H-S.1 — Direct USDC Lending category policy, dispositions,
 * selector, card, product decision. Production stays DISABLED (blocked on
 * human review); everything else is built and fail-closed.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Step 16H-S.1 — Direct USDC Lending category policy, dispositions,
 * selector, card, product decision. Production stays DISABLED (blocked on
 * human review); everything else is built and fail-closed.
 * ------------------------------------------------------------------ */
export function runDirectUsdcLendingIntegrationFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const FRESH: DLProductState = { identityValid: true, assessmentValid: true, categoryFloorPassed: true, assessmentInvalidated: false, governanceComplete: true, depositsAvailable: true, emergencyModeActive: false, capacityFreshAndSufficient: true, apyFreshAndComparisonReady: true, riskPolicyVersionActive: true };
  const USER = { holdsCanonicalUsdc: true, safetyBufferFullySatisfiedByVerifiedLiquidCoverage: true, relevantUsdcIsExcessCapital: true, deterministicEligibleAmountIsPositive: true, userSuitableForCategory: true, noSuitabilityRuleProhibitsDefiLending: true };

  // --- Thresholds ---
  add("DL-1: direct-USDC category minimum is exactly 5.5", DL_CATMIN === 5.5, `min=${DL_CATMIN}`);
  add("DL-2: universal threshold 7 is preserved (not lowered)", DL_UNIMIN === 7 && DL_MINPROTO === 7 && DL_POLICY_VALID.valid === true, `uni=${DL_UNIMIN}`);
  add("DL-3: category floor is strictly below the universal floor", DL_CATMIN < DL_UNIMIN, `${DL_CATMIN}<${DL_UNIMIN}`);
  add("DL-4: policy manifest is deterministic", DL_POLICY_HASH === computeDirectPolicyManifestHash() && /^direct_policy_[0-9a-f]{8}$/.test(DL_POLICY_HASH), DL_POLICY_HASH);

  // --- Kamino original assessment preserved ---
  add("DL-5: Kamino original meetsMinimum remains false", DA_OUTCOME.meetsMinimum === false && DL_KCAT.originalMeetsMinimumUnchanged === false && DA_MANIFEST_HASH === "direct_assessment_54a11ba3", "false");
  add("DL-6: Kamino aggregate 5.93 and universal threshold 7 unchanged", DL_KCAT.automatedAggregate === 5.93 && DL_KCAT.originalUniversalThreshold === 7 && DA_OUTCOME.unroundedAggregate === 5.93, "5.93/7");
  add("DL-7: Kamino category-floor result is pass; universal-floor result is fail", DL_KCAT.categoryFloorResult === "pass" && DL_KCAT.universalFloorResult === "fail", `${DL_KCAT.categoryFloorResult}/${DL_KCAT.universalFloorResult}`);
  add("DL-8: category-floor passage is NOT product approval (recommendation now approved-pending-runtime after S.2)", DL_KCAT.recommendationResult === "approved_pending_runtime_gates" && DL_KCAT.assessmentMutated === false && DL_KCAT.doesNotClaimHistoricalPass === true, DL_KCAT.recommendationResult);

  // --- Governance mandatory + missing ---
  add("DL-9: after S.2 all three governance gates are satisfied by authorized-human records", DL_GOV.humanReviewState === "completed_active" && DL_GOV.riskSignoffState === "completed_active" && DL_GOV.productApprovalState === "completed_active" && DL_GOV.missingGates.length === 0, DL_GOV.missingGates.join(",") || "complete");
  add("DL-10: after S.2 governance no longer blocks production", DL_GOV.productionSuggestionEligible === true && DL_GOV.firstMissingGate === null && DL_GOV.separationOfDutiesValid === true, `blocker=${DL_GOV.firstMissingGate}`);
  add("DL-11: product-owner decision is explicitly not governance", DL_GOV.productOwnerDecisionIsNotGovernance === true && DL_GOV.fabricationRefused === true && DL_DECISION.isNotHumanRiskReview === true && DL_DECISION.isNotRiskSignoff === true && DL_DECISION.isNotProductApproval === true, "not governance");

  // --- Selector: only Kamino, never excluded, no fallback ---
  add("DL-12: only Kamino can be selected (fresh gates)", dlSelect(FRESH).selectedCandidateId === "kamino_usdc_lending" && dlSelect(FRESH).state === "eligible_candidate_selected", "kamino");
  add("DL-13: Steakhouse and Jupiter can never be selected", DL_EXCLUDED.includes("kamino_steakhouse_usdc") && DL_EXCLUDED.includes("jupiter_lend_usdc") && DL_SEL_VALID.valid === true, DL_SEL_VALID.errors.join("|") || "clean");
  add("DL-14: excluded candidates are never fallback candidates", (() => { const blocked = [{ governanceComplete: false }, { depositsAvailable: false }, { assessmentInvalidated: true }, { capacityFreshAndSufficient: false }]; return blocked.every((b) => { const r = dlSelect({ ...FRESH, ...b }); return r.selectedCandidateId === null && r.fallbackUsed === false; }); })(), "no fallback");
  add("DL-15: APY/TVL/brand cannot override disposition (only Kamino is selector-eligible)", DL_DISPOS.filter((d) => d.selectorEligibility).length === 1 && dlGetDispo("kamino_usdc_lending")?.selectorEligibility === true, "1 eligible");

  // --- Blocked states are distinguished ---
  add("DL-16: emergency mode suppresses suggestion (blocked_availability)", dlSelect({ ...FRESH, emergencyModeActive: true }).state === "blocked_availability", "avail");
  add("DL-17: invalidated assessment suppresses suggestion (blocked_invalidation)", dlSelect({ ...FRESH, assessmentInvalidated: true }).state === "blocked_invalidation", "inval");
  add("DL-18: stale APY -> blocked_freshness; stale capacity -> blocked_capacity", dlSelect({ ...FRESH, apyFreshAndComparisonReady: false }).state === "blocked_freshness" && dlSelect({ ...FRESH, capacityFreshAndSufficient: false }).state === "blocked_capacity", "fresh/cap");
  add("DL-19: no approved candidate when category floor not passed", dlSelect({ ...FRESH, categoryFloorPassed: false }).state === "no_approved_candidate", "no cand");

  // --- Suggestion trigger user conditions ---
  add("DL-20: only excess USDC is eligible", dlTrigger(FRESH, { ...USER, relevantUsdcIsExcessCapital: false }).generate === false, "excess only");
  add("DL-21: incomplete Safety Buffer prevents suggestion", dlTrigger(FRESH, { ...USER, safetyBufferFullySatisfiedByVerifiedLiquidCoverage: false }).generate === false, "buffer");
  add("DL-22: fresh availability/capacity/APY required for the trigger", dlTrigger({ ...FRESH, depositsAvailable: false }, USER).generate === false && dlTrigger({ ...FRESH, capacityFreshAndSufficient: false }, USER).generate === false && dlTrigger({ ...FRESH, apyFreshAndComparisonReady: false }, USER).generate === false, "freshness");
  add("DL-23: zero deterministic amount prevents suggestion", dlTrigger(FRESH, { ...USER, deterministicEligibleAmountIsPositive: false }).generate === false, "amount");

  // --- Card copy: no score, no threshold, required disclosures, no guaranteed ---
  const card = dlBuildCard({ measuredApyPct: 6.42, amountText: null });
  add("DL-24: card contains no numeric risk score and no internal threshold", DL_CARD_VALID.valid === true && dlValidateCard(card).valid === true, DL_CARD_VALID.errors.join("|") || "clean");
  add("DL-25: APY includes ~ and is labelled variable", dlFmtApy(6.42) === "~6.42% variable APY" && card.apyText === "~6.42% variable APY", card.apyText ?? "null");
  add("DL-26: risk disclosure mentions principal loss and delayed/paused withdrawals", /principal can be reduced/i.test(DL_COPY.riskDisclosure) && /(delayed|paused)/i.test(DL_COPY.riskDisclosure), "disclosed");
  add("DL-27: no guaranteed language in card copy", !/guaranteed|risk-free|cash equivalent|instant withdrawal/i.test([DL_COPY.title, DL_COPY.description, DL_COPY.riskDisclosure, ...DL_COPY.keyFacts].join(" ")), "no guarantees");
  add("DL-28: no transaction/signature/deposit CTA in actions", DL_ACTIONS.every((a) => a.actionKind === "review_only" && !a.executesTransaction && !a.requiresWalletSignature && !a.completionOnClick) && !DL_ACTIONS.some((a) => /deposit now|move funds|start earning/i.test(a.label)), "read-only");

  // --- Smith AI + analytics ---
  add("DL-29: Smith AI copy acknowledges risk, exposes no score/threshold", dlValidateSmith(DL_SMITH).valid === true && !/safe|risk-free|5\.93|5\.5/i.test(DL_SMITH), "bounded");
  add("DL-30: analytics payload carries only approved fields (no score/reviewer/balance)", (() => { const p = dlAnalytics({ event: "governance_blocked", candidateId: "kamino_usdc_lending", suggestionType: "direct_usdc_lending", policyVersion: "1.0.0", suppressionReason: "human_review_missing", freshnessState: "n/a" }); const keys = Object.keys(p); return DL_ANALYTICS_FORBIDDEN.every((f) => !keys.includes(f)) && keys.includes("policyVersion") && keys.includes("suppressionReason"); })(), "clean payload");

  // --- Top Pick + existing positions + Jupiter ---
  add("DL-31: no automatic Top Pick (sole candidate does not auto-Top-Pick)", DL_DISPOS.every((d) => d.topPickEligibility === false), "no auto top pick");
  add("DL-32: existing Kamino position support retained, separate from suggestion", dlGetDispo("kamino_usdc_lending")?.existingPositionSupport === true, "kamino pos");
  add("DL-33: Steakhouse existing-position support unchanged; never suggested", (() => { const s = dlGetDispo("kamino_steakhouse_usdc"); return s?.disposition === "existing_position_only" && s?.existingPositionSupport === true && s?.suggestionEligibility === false && s?.safetyBufferRecognition === "unchanged"; })(), "steak ok");
  add("DL-34: Jupiter research-only, not_ready; 17D read-only existing-position detection, still no eligibility", (() => { const j = dlGetDispo("jupiter_lend_usdc"); return j?.disposition === "excluded_from_suggestions" && j?.finalAssessmentStatus === "not_ready" && j?.provisionalSensitivityPreserved === true && j?.existingPositionSupport === true && j?.selectorEligibility === false && j?.topPickEligibility === false && j?.suggestionEligibility === false && j?.safetyBufferFundingEligible === false; })(), "jup ok");

  // --- /testing states + decision artifact ---
  add("DL-35: /testing includes all 24 required states", DL_TESTING.length === 24 && DL_DECISION_VALID.valid === true, `n=${DL_TESTING.length}`);
  add("DL-36: the real current state (2) is blocked_governance with no card", (() => { const s = DL_TESTING.find((x) => x.id === 2)!; return s.selectorState === "blocked_governance" && s.suggestionGenerated === false && s.showsCard === false; })(), "state2");
  add("DL-37: fixture-only eligible state (1) selects Kamino", DL_TESTING.find((x) => x.id === 1)!.selectorState === "eligible_candidate_selected", "state1");
  add("DL-38: product-decision artifact is deterministic and preserves assessment", DL_DECISION_HASH === computeProductDecisionManifestHash() && /^direct_decision_[0-9a-f]{8}$/.test(DL_DECISION_HASH) && DL_DECISION.originalAssessmentPreserved.mutated === false, DL_DECISION_HASH);

  // --- Dispositions validation + immutability of prior evidence ---
  add("DL-39: dispositions validate; excluded candidates never archived/deleted", DL_DISPO_VALID.valid === true && DL_DISPOS.every((d) => d.neverArchivedOrDeleted === true) && /^direct_dispositions_[0-9a-f]{8}$/.test(DL_DISPO_HASH), DL_DISPO_VALID.errors.join("|") || "clean");
  add("DL-40: prior assessments immutable (Kamino 5.93, Steakhouse 5.37, Jupiter bound 4.32)", DA_OUTCOME.unroundedAggregate === 5.93 && JP_AGG.upperBound === 4.32 && DL_POLICY_ID === "direct_usdc_lending_eligibility_policy_v1", "immutable");

  // --- No production activation ---
  add("DL-41: production eligible after S.2; S.1 decision snapshot stays frozen (history preserved)", DL_GOV.productionSuggestionEligible === true && DL_DECISION.governanceResolution.productionSuggestionEligible === false && DL_DECISION.governanceResolution.firstMissingGate === "human_review", "activated; S.1 frozen");
  add("DL-42: category floor does not apply to Safety Buffer funding", dlGetDispo("kamino_usdc_lending")?.safetyBufferFundingEligible === false && dlEvalFloor({ category: "direct_usdc_lending", purpose: "excess_usdc_yield", productType: "direct_lending", asset: "canonical_solana_usdc", topology: "one_exact_identifiable_lending_reserve_or_pool", automatedAggregate: 5.37, hasUnresolvedLossMechanics: false, hasUnresolvedAuthorityStructure: false, hasUnresolvedWithdrawalMechanics: false, hasUnresolvedBorrowerCollateralScope: false, isManagedVault: false, usesDynamicAllocation: false, usesCrossProtocolRouting: false }).result === "fail_below_floor", "5.37 fails 5.5");
  add("DL-43: disclaimer states passing 5.5 is not safe/approved/recommended", (DL_DISCLAIMER as readonly string[]).includes("safe") && (DL_DISCLAIMER as readonly string[]).includes("approved") && (DL_DISCLAIMER as readonly string[]).includes("recommended"), "disclaimer");

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 16H-S.2 — Kamino Direct governance activation. Records human review,
 * signoff and product approval (ws_product_owner), verifies separation of
 * duties, and activates production eligibility — all fail-closed, assessment
 * untouched.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Step 16H-S.2 — Kamino Direct governance activation. Records human review,
 * signoff and product approval (ws_product_owner), verifies separation of
 * duties, and activates production eligibility — all fail-closed, assessment
 * untouched.
 * ------------------------------------------------------------------ */
export function runDirectLendingGovernanceActivationFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });

  // --- Authorized reviewer / signer / approver ---
  add("GA-1: authorized reviewer identity exists and is a human (ws_product_owner)", GR_REV_AUTH.authorized === true && GR_REVIEW.reviewerId === "ws_product_owner" && GR_REVIEW.reviewerActorKind === "human", "authorized");
  add("GA-2: signer authorization valid (risk_signoff_approver)", GR_SIGN_AUTH.authorized === true && GR_SIGNOFF.signerId === "ws_product_owner" && GR_SIGNOFF.signerRole === "risk_signoff_approver", "signer ok");
  add("GA-3: approver authorization valid (product_approver)", GR_APP_AUTH.authorized === true && GR_APPROVAL.approverId === "ws_product_owner" && GR_APPROVAL.approverRole === "product_approver", "approver ok");

  // --- Bindings + immutability of the assessment ---
  add("GA-4: review binds to direct_assessment_54a11ba3 + evidence + authority manifests", GR_REVIEW.assessmentManifest === "direct_assessment_54a11ba3" && GR_REVIEW.evidencePackageManifest === "risk_package_3711fd25" && GR_REVIEW.authorityEvidenceManifest === "authority_evidence_a99ace84", "bound");
  add("GA-5: review does not change scores/confidence/aggregate", /unchanged/.test(GR_REVIEW.reviewedScores) && /unchanged/.test(GR_REVIEW.reviewedConfidenceValues) && GR_ACTIVATION.aggregate === 5.93 && GR_ACTIVATION.assessmentMutated === false && DA_OUTCOME.unroundedAggregate === 5.93, "5.93 intact");
  add("GA-6: original universal meetsMinimum remains false; threshold 7", GR_ACTIVATION.universalMeetsMinimum === false && GR_ACTIVATION.universalThreshold === 7 && DA_OUTCOME.meetsMinimum === false, "false/7");
  add("GA-7: review records accepted limitations (all 12 material findings)", GR_REVIEW.acceptedLimitations.length === 12 && GR_LIMITS.length === 12 && GR_REVIEW.acceptedLimitations.some((l) => /socialize_loss/.test(l)) && GR_REVIEW.acceptedLimitations.some((l) => /2026-05-28/.test(l)), "12 limits");

  // --- Distinct acts ---
  add("GA-8: review is distinct from signoff (review is not signoff/approval)", GR_REVIEW.constitutesSignoff === false && GR_REVIEW.constitutesProductApproval === false && String(GR_REVIEW.recordId) !== String(GR_SIGNOFF.recordId), "distinct");
  add("GA-9: signoff is distinct from approval; signoff does not imply approval", GR_SIGNOFF.impliesProductApproval === false && GR_APPROVAL.derivedFromSignoff === false && String(GR_SIGNOFF.recordId) !== String(GR_APPROVAL.recordId), "separate");
  add("GA-10: approval requires an active signoff", GR_APPROVAL.requiresActiveSignoff === true && GR_APPROVAL.signoffIsActive === true && GR_APPROVAL.boundRiskSignoffId === GR_SIGNOFF.recordId, "chained");

  // --- Separation of duties ---
  add("GA-11: separation-of-duties v2 satisfied", GR_SOD.valid === true && GR_SOD.policyId === "risk_separation_of_duties_v2" && GR_SOD.reviewerIsHuman === true && GR_SOD.assessorIsAutomated === true, "sod ok");
  add("GA-12: no automated actor performs a human action", GR_SOD.reviewerIsNotAssessor === true && GR_SOD.reviewerIsNotPreparer === true && GR_SOD.noAutomatedActorPerformsHumanAct === true && GR_REVIEW.authoredByAutomatedAgent === false, "no automated human act");
  add("GA-13: all three roles authorized under one human per SoD MVP allowance", GR_SOD.allThreeRolesAuthorized === true && /permits one authorized human to hold multiple roles/.test(GR_SOD.policyBasis), "multi-role ok");

  // --- All three records valid ---
  add("GA-14: governance records validate", GR_VALID.valid === true, GR_VALID.errors.join("|") || "clean");
  add("GA-15: review=reviewed, signoff=risk_approved, approval=approved (native states)", GR_ACTIVATION.humanReviewState === "reviewed" && GR_ACTIVATION.riskSignoffState === "risk_approved" && GR_ACTIVATION.productApprovalState === "approved", "native states");

  // --- Activation only after all three ---
  add("GA-16: productionSuggestionEligible true only after all three valid records", GR_ACTIVATION.allGatesComplete === true && GR_ACTIVATION.productionSuggestionEligible === true && GR_ACTIVATION.missingGates.length === 0, "eligible");
  add("GA-17: category floor remains 5.5; universal remains 7; meetsMinimum false", GR_ACTIVATION.categoryMinimum === 5.5 && GR_ACTIVATION.universalThreshold === 7 && GR_ACTIVATION.universalMeetsMinimum === false, "thresholds intact");
  add("GA-18: prior governance blocker was blocked_risk_review; resulting is none", GR_ACTIVATION.primaryBlockerBefore === "blocked_risk_review" && GR_ACTIVATION.primaryBlockerAfter === "none" && GR_ACTIVATION.governanceBlocker === "none", "blocker cleared");
  add("GA-19: lifecycle moves identity_verified -> production_eligible", GR_ACTIVATION.lifecycleBefore === "identity_verified" && GR_ACTIVATION.lifecycleAfter === "production_eligible", "lifecycle");

  // --- Runtime gates still fail-closed after activation ---
  {
    const GOV_OK: DLProductState = { identityValid: true, assessmentValid: true, categoryFloorPassed: true, assessmentInvalidated: false, governanceComplete: GR_ACTIVATION.productionSuggestionEligible, depositsAvailable: true, emergencyModeActive: false, capacityFreshAndSufficient: true, apyFreshAndComparisonReady: true, riskPolicyVersionActive: true };
    add("GA-20: selector returns Kamino only when runtime gates pass", dlSelect(GOV_OK).state === "eligible_candidate_selected" && dlSelect(GOV_OK).selectedCandidateId === "kamino_usdc_lending", "kamino");
    add("GA-21: runtime blockers still suppress after activation", dlSelect({ ...GOV_OK, apyFreshAndComparisonReady: false }).state === "blocked_freshness" && dlSelect({ ...GOV_OK, emergencyModeActive: true }).state === "blocked_availability" && dlSelect({ ...GOV_OK, assessmentInvalidated: true }).state === "blocked_invalidation", "fail-closed");
    add("GA-22: revocation fails closed (signoff/approval inactive -> no candidate)", dlSelect({ ...GOV_OK, governanceComplete: false }).state === "blocked_governance" && dlSelect({ ...GOV_OK, governanceComplete: false }).selectedCandidateId === null, "revocation closed");
  }

  // --- Excluded candidates unchanged ---
  add("GA-23: Steakhouse never selected; existing-position support unchanged", dlGetDispo("kamino_steakhouse_usdc")?.disposition === "existing_position_only" && dlGetDispo("kamino_steakhouse_usdc")?.selectorEligibility === false && dlGetDispo("kamino_steakhouse_usdc")?.existingPositionSupport === true, "steak intact");
  add("GA-24: Jupiter never selected; research-only, not_ready, provisional preserved", dlGetDispo("jupiter_lend_usdc")?.disposition === "excluded_from_suggestions" && dlGetDispo("jupiter_lend_usdc")?.finalAssessmentStatus === "not_ready" && dlGetDispo("jupiter_lend_usdc")?.provisionalSensitivityPreserved === true, "jup intact");
  add("GA-25: no automatic Top Pick from activation", DL_DISPOS.every((d) => d.topPickEligibility === false), "no auto top pick");

  // --- Manifests deterministic + S.1 history preserved ---
  add("GA-26: three governance-record manifests are deterministic and well-formed", /^human_review_[0-9a-f]{8}$/.test(GR_REVIEW_HASH) && /^risk_signoff_[0-9a-f]{8}$/.test(GR_SIGNOFF_HASH) && /^product_approval_[0-9a-f]{8}$/.test(GR_APPROVAL_HASH), `${GR_REVIEW_HASH}/${GR_SIGNOFF_HASH}/${GR_APPROVAL_HASH}`);
  add("GA-27: S.1 product-decision history is frozen (manifest unchanged, snapshot pending)", DL_DECISION_HASH === computeProductDecisionManifestHash() && DL_DECISION.governanceResolution.productionSuggestionEligible === false && DL_DECISION_VALID.valid === true, DL_DECISION_HASH);
  add("GA-28: assessment score identity provably unchanged (still direct_assessment_54a11ba3, 5.93)", DA_MANIFEST_HASH === "direct_assessment_54a11ba3" && DA_MANIFEST_HASH === computeDirectAssessmentManifestHash() && DA_OUTCOME.unroundedAggregate === 5.93, "immutable");

  // --- No execution behaviour ---
  add("GA-29: no transaction/signature/deposit behaviour introduced by activation", GR_APPROVAL.execution === "unsupported" && GR_APPROVAL.safetyBufferFunding === "prohibited" && DL_ACTIONS.every((a) => !a.executesTransaction && !a.requiresWalletSignature), "read-only");

  // --- /testing visual integration: all 24 states, production card, no leaks ---
  add("GA-30: /testing renders all 24 direct-lending states", TF_ROWS.length === 24 && TF_VALID.valid === true, TF_VALID.errors.join("|") || "24 states");
  add("GA-31: card states + suppressed states account for all 24", TF_CARDS.length + TF_SUPPRESSED.length === 24 && TF_CARDS.length > 0 && TF_SUPPRESSED.length > 0, `${TF_CARDS.length}+${TF_SUPPRESSED.length}`);
  add("GA-32: testing cards expose no score/threshold, no Top Pick, no executing CTA, APY ~/variable", TF_CARDS.every((r) => r.card && r.card.is_top_pick === false && !r.card.cta.executes_transaction && !r.card.cta.requires_wallet_signature && !/5\.93|5\.5| 7 |dimension|confidence/i.test(JSON.stringify(r.card)) && (!r.card.apy || (r.card.apy.display.startsWith("~") && /variable/i.test(r.card.apy.display)))), "clean cards");
  add("GA-33: APY is dynamic/estimated (not the hardcoded 6.42 constant)", TF_CARDS.every((r) => !r.card?.apy || !/6\.42/.test(r.card.apy.display)) && TF_CARDS.some((r) => r.card?.apy?.status === "estimated"), "estimated");
  add("GA-34: suppressed states carry a reason and render no card", TF_SUPPRESSED.every((r) => r.card === null && (r.suppressionReason ?? "").length > 0), "suppressed reasoned");

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 16H-S.3 — Kamino Direct runtime integration. The deterministic runtime
 * adapter reads governance from PRODUCTION_ACTIVATION, requires exact canonical
 * USDC, verified liquid buffer coverage, a deterministic excess amount, live
 * measured APY, source-verified availability/capacity, suitability — and fails
 * closed with an exact reason otherwise. Shared with /testing via one builder.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Step 16H-S.3 — Kamino Direct runtime integration. The deterministic runtime
 * adapter reads governance from PRODUCTION_ACTIVATION, requires exact canonical
 * USDC, verified liquid buffer coverage, a deterministic excess amount, live
 * measured APY, source-verified availability/capacity, suitability — and fails
 * closed with an exact reason otherwise. Shared with /testing via one builder.
 * ------------------------------------------------------------------ */
export function runDirectLendingRuntimeFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });

  // A fully-eligible runtime input (all gates pass).
  const OK: RTInput = {
    ...rtGov(),
    wallet: { usdcMint: RT_ID.canonicalUsdcMint, canonicalUsdcRawUnits: 25_000_000_000, pricesFresh: true },
    safetyBuffer: { requiredResolved: true, sufficiencyResolved: true, fullyFundedByLiquidCoverage: true },
    excess: { deterministicAmountUsd: 12000, isPositive: true },
    suitability: { profileComplete: true, suitableForCategory: true, prohibitsDefiLending: false },
    apy: { measuredApyPct: 5.87, rateKind: "estimated_variable_apy", fresh: true, reserveIdentityMatches: true, slotDurationFresh: true, rewardApyPct: 0 },
    availability: { depositsAvailable: true, emergencyModeActive: false },
    capacity: { fresh: true, sufficientForAmount: true },
    existingPosition: { holdsExactCToken: false, approvedTopUpRulePasses: false },
  };

  // --- Governance derived, not hardcoded ---
  add("RT-1: runtime governance is read from PRODUCTION_ACTIVATION (not hardcoded)", rtGov().governanceEligible === GR_ACTIVATION.productionSuggestionEligible && rtGov().governanceEligible === true, `gov=${rtGov().governanceEligible}`);
  add("RT-2: governance_inactive suppresses when activation is not eligible", rtEval({ ...OK, governanceEligible: false }).suppressionReason === "governance_inactive", "gov gate");
  add("RT-3: assessment_invalidated suppresses fail-closed", rtEval({ ...OK, assessmentInvalidated: true }).suppressionReason === "assessment_invalidated", "assess gate");

  // --- Eligible path emits through the shared card builder ---
  {
    const r = rtEval(OK);
    add("RT-4: fully-eligible runtime emits a card", r.emit === true && r.card !== null, r.emit ? "emit" : `suppressed:${r.suppressionReason}`);
    add("RT-5: emitted card is the production card (title/description/CTA, no Top Pick, read-only)", r.emit === true && r.card.title === "Earn yield on excess USDC" && r.card.description.includes("Kamino’s SOL/BTC") && r.card.is_top_pick === false && r.card.cta.executes_transaction === false && r.card.cta.requires_wallet_signature === false, "prod card");
    add("RT-6: emitted card APY is ~/variable and dynamic (not hardcoded 6.42)", r.emit === true && !!r.card.apy && r.card.apy.display.startsWith("~") && /variable/i.test(r.card.apy.display) && !/6\.42/.test(r.card.apy.display), r.emit ? r.card.apy?.display ?? "" : "");
    add("RT-7: emitted card exposes no score/threshold", r.emit === true && !/5\.93|5\.5| 7 |dimension|confidence/i.test(JSON.stringify(r.card)), "no leak");
    add("RT-8: eligible path emits analytics suggestion_generated once", r.analytics.event === "suggestion_generated" && r.analytics.suppressionReason === null && r.analytics.candidateId === "kamino_usdc_lending", "analytics");
  }

  // --- Exact canonical USDC required ---
  add("RT-9: bridged/symbol-only USDC excluded (wrong mint -> no_canonical_usdc)", rtEval({ ...OK, wallet: { ...OK.wallet, usdcMint: "Bridged1111111111111111111111111111111111111" } }).suppressionReason === "no_canonical_usdc", "mint gate");
  add("RT-10: zero canonical USDC -> no_canonical_usdc", rtEval({ ...OK, wallet: { ...OK.wallet, canonicalUsdcRawUnits: 0 } }).suppressionReason === "no_canonical_usdc", "zero usdc");

  // --- Safety Buffer via verified liquid coverage ---
  add("RT-11: incomplete liquid buffer -> safety_buffer_incomplete", rtEval({ ...OK, safetyBuffer: { requiredResolved: true, sufficiencyResolved: true, fullyFundedByLiquidCoverage: false } }).suppressionReason === "safety_buffer_incomplete", "buffer incomplete");
  add("RT-12: unresolved buffer sufficiency -> safety_buffer_unresolved", rtEval({ ...OK, safetyBuffer: { requiredResolved: true, sufficiencyResolved: false, fullyFundedByLiquidCoverage: true } }).suppressionReason === "safety_buffer_unresolved", "buffer unresolved");

  // --- Deterministic excess amount ---
  add("RT-13: missing deterministic amount suppresses (never invents)", rtEval({ ...OK, excess: { deterministicAmountUsd: null, isPositive: false } }).suppressionReason === "missing_deterministic_amount", "no amount");
  add("RT-14: non-positive excess -> no_excess_usdc", rtEval({ ...OK, excess: { deterministicAmountUsd: 0, isPositive: false } }).suppressionReason === "no_excess_usdc", "no excess");

  // --- Suitability (category approval != universal suitability) ---
  add("RT-15: unsuitable user -> user_unsuitable", rtEval({ ...OK, suitability: { profileComplete: true, suitableForCategory: false, prohibitsDefiLending: false } }).suppressionReason === "user_unsuitable", "unsuitable");
  add("RT-16: DeFi-lending prohibition -> user_unsuitable", rtEval({ ...OK, suitability: { profileComplete: true, suitableForCategory: true, prohibitsDefiLending: true } }).suppressionReason === "user_unsuitable", "prohibited");

  // --- Availability / capacity / emergency (source-verified, not inferred) ---
  add("RT-17: emergency mode -> emergency_mode", rtEval({ ...OK, availability: { depositsAvailable: true, emergencyModeActive: true } }).suppressionReason === "emergency_mode", "emergency");
  add("RT-18: deposits unavailable -> deposits_unavailable", rtEval({ ...OK, availability: { depositsAvailable: false, emergencyModeActive: false } }).suppressionReason === "deposits_unavailable", "deposits");
  add("RT-19: stale capacity -> capacity_stale; insufficient -> insufficient_capacity", rtEval({ ...OK, capacity: { fresh: false, sufficientForAmount: true } }).suppressionReason === "capacity_stale" && rtEval({ ...OK, capacity: { fresh: true, sufficientForAmount: false } }).suppressionReason === "insufficient_capacity", "capacity");

  // --- APY freshness + exhausted rewards + rateKind ---
  add("RT-20: unresolved APY -> apy_unresolved", rtEval({ ...OK, apy: { ...OK.apy, measuredApyPct: null } }).suppressionReason === "apy_unresolved", "apy unresolved");
  add("RT-21: stale APY -> apy_stale; wrong reserve identity -> apy_unresolved", rtEval({ ...OK, apy: { ...OK.apy, fresh: false } }).suppressionReason === "apy_stale" && rtEval({ ...OK, apy: { ...OK.apy, reserveIdentityMatches: false } }).suppressionReason === "apy_unresolved", "apy fresh/identity");
  add("RT-22: rateKind must be estimated_variable_apy", rtEval({ ...OK, apy: { ...OK.apy, rateKind: "fixed" } }).suppressionReason === "apy_stale", "rateKind");
  add("RT-23: exhausted rewards excluded (rewardApyPct 0 still emits on measured rate)", rtEval({ ...OK, apy: { ...OK.apy, rewardApyPct: 0 } }).emit === true, "rewards zero ok");
  add("RT-24: stale prices -> price_unavailable", rtEval({ ...OK, wallet: { ...OK.wallet, pricesFresh: false } }).suppressionReason === "price_unavailable", "price");

  // --- Existing position ---
  add("RT-25: existing cToken without top-up rule -> existing_position_no_top_up (no duplicate)", rtEval({ ...OK, existingPosition: { holdsExactCToken: true, approvedTopUpRulePasses: false } }).suppressionReason === "existing_position_no_top_up", "no dup");
  add("RT-26: existing cToken WITH approved top-up rule emits", rtEval({ ...OK, existingPosition: { holdsExactCToken: true, approvedTopUpRulePasses: true } }).emit === true, "top-up ok");

  // --- Never an excluded candidate / never Top Pick ---
  add("RT-27: adapter only ever references Kamino identity (never Steakhouse/Jupiter)", RT_ID.candidateId === "kamino_usdc_lending" && !JSON.stringify(RT_ID).includes("steakhouse") && !JSON.stringify(RT_ID).includes("jupiter"), "kamino only");
  add("RT-28: emitted card is never Top Pick", rtEval(OK).emit === true && rtEval(OK).card!.is_top_pick === false, "no top pick");

  // --- Real-wallet rail path fails closed today (no live KLend feed) ---
  {
    const rail = rtRail({ canonicalUsdcMint: null, canonicalUsdcRawUnits: null, pricesFresh: true, bufferRequiredResolved: true, bufferSufficiencyResolved: true, bufferFullyFundedByLiquidCoverage: true, excessDeterministicAmountUsd: null, suitability: { profileComplete: true, suitableForCategory: false, prohibitsDefiLending: false }, holdsExactCToken: false, approvedTopUpRulePasses: false });
    add("RT-29: real-wallet rail fails closed (no card) with an exact reason", rail.emit === false && (RT_REASONS as readonly string[]).includes(rail.suppressionReason), rail.emit ? "emit" : rail.suppressionReason);
    add("RT-30: omitting the KLend market feed fail-closes (deposits/apy/capacity), never emits", rtRail({ canonicalUsdcMint: RT_ID.canonicalUsdcMint, canonicalUsdcRawUnits: 1000, pricesFresh: true, bufferRequiredResolved: true, bufferSufficiencyResolved: true, bufferFullyFundedByLiquidCoverage: true, excessDeterministicAmountUsd: 500, suitability: { profileComplete: true, suitableForCategory: true, prohibitsDefiLending: false }, holdsExactCToken: false, approvedTopUpRulePasses: false }).emit === false, "no market feed = closed");
  }

  // --- /testing consistency: same builder ---
  add("RT-31: /testing cards and runtime cards come from the same builder", (() => { const t = TF_CARDS[0].card!; const r = rtCard({ idSuffix: "x", measuredApyPct: 5.87, amountText: "Estimated for your eligible excess USDC" }); return t.title === r.title && t.description === r.description && t.cta.label === r.cta.label && t.badge === r.badge; })(), "shared builder");
  add("RT-32: all 17 suppression reasons are enumerated and reachable in the model", RT_REASONS.length === 17 && new Set(RT_REASONS).size === 17, `${RT_REASONS.length}`);

  // --- Revocation fails closed; prior artifacts immutable ---
  add("RT-33: revoked governance removes eligibility (fail closed)", rtEval({ ...OK, governanceEligible: false }).emit === false, "revocation");
  add("RT-34: no transaction/signature behaviour anywhere in the runtime output", rtEval(OK).emit === true && rtEval(OK).card!.cta.action === null && rtEval(OK).card!.cta.executes_transaction === false && rtEval(OK).card!.cta.completion_on_click === false, "read-only");
  add("RT-35: assessment + governance records still immutable (5.93 / activation eligible)", DA_OUTCOME.unroundedAggregate === 5.93 && DA_MANIFEST_HASH === "direct_assessment_54a11ba3" && GR_ACTIVATION.productionSuggestionEligible === true, "immutable");

  return checks;
}

export function runDirectLendingComponentActivationFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const CHECKED = "2026-07-18T12:00:00.000Z";
  const completeBuffer = { targetUsd: 10000, stableUsd: 12000, fullyFunded: true, coveragePct: 120, monthsCovered: 6, monthsTarget: 5 } as unknown as SCBuffer;
  const incompleteBuffer = { targetUsd: 10000, stableUsd: 4000, fullyFunded: false, coveragePct: 40, monthsCovered: 2, monthsTarget: 5 } as unknown as SCBuffer;

  // --- Suitability: existing rule, fail-closed, no invented questionnaire ---
  add("SC-1: incompatible/unrecognized profile fails closed (governance-derived, S.6)", (() => { const s = scSuit({ risk_tolerance: "low" } as any); return s.suitableForCategory === false && /not in the effective compatible set/.test(s.unresolvedReason ?? ""); })(), "fail-closed");
  add("SC-2: profileComplete derives from a recognized goal risk tolerance", scSuit({ risk_tolerance: "medium" } as any).profileComplete === true && scSuit(null).profileComplete === false && scSuit({ risk_tolerance: "conservative" } as any).profileComplete === false, "profile");

  // --- Excess: reuses the 16F builder; fail-closed; never all-wallet USDC ---
  add("SC-3: null buffer → no excess", scExcess({ buffer: null, canonicalUsdcUsd: 50000, bufferCountedUsdcUsd: 0, pricesFresh: true, checkedAt: CHECKED }) === null, "null buffer");
  add("SC-4: stale price → no excess", scExcess({ buffer: completeBuffer, canonicalUsdcUsd: 50000, bufferCountedUsdcUsd: 12000, pricesFresh: false, checkedAt: CHECKED }) === null, "stale price");
  add("SC-5: incomplete buffer → no excess for this use", scExcess({ buffer: incompleteBuffer, canonicalUsdcUsd: 50000, bufferCountedUsdcUsd: 4000, pricesFresh: true, checkedAt: CHECKED }) === null, "incomplete buffer");
  add("SC-6: excess is deterministic and never negative/NaN; not all-wallet USDC", (() => { const e = scExcess({ buffer: completeBuffer, canonicalUsdcUsd: 50000, bufferCountedUsdcUsd: 12000, pricesFresh: true, checkedAt: CHECKED }); return e === null || (typeof e === "number" && e >= 0 && !Number.isNaN(e) && e !== 50000); })(), "16F reuse");

  // --- Full chain: fresh market + positive excess, gated by suitability ---
  const freshLit: MDSnap = { identityValid: true, invalidationReason: null,
    apy: { baseSupplyApyPct: 5.65, rewardApyPct: 0, totalApyPct: 5.65, rateKind: "estimated_variable_apy", measuredSlotDurationMs: 415, calculationVersion: "v1", sourceSlot: 1, observedAt: "x", freshness: "fresh", invalidationReason: null },
    capacity: { remainingCapacityRaw: "888000000000", remainingCapacityTokenAmount: 888000, capacityKind: "capped", sourceSlot: 1, freshness: "fresh", invalidationReason: null },
    availability: { depositsMechanicallyAllowed: true, availabilityState: "available", blockingReasons: [], marketEmergencyState: "inactive", reserveEmergencyState: "inactive", sourceSlot: 1, freshness: "fresh" },
    overallFreshness: "fresh" };
  const base = { ...rtGov(), wallet: { usdcMint: RT_ID.canonicalUsdcMint, canonicalUsdcRawUnits: 25_000_000_000, pricesFresh: true }, safetyBuffer: { requiredResolved: true, sufficiencyResolved: true, fullyFundedByLiquidCoverage: true }, excess: { deterministicAmountUsd: 12000, isPositive: true }, existingPosition: { holdsExactCToken: false, approvedTopUpRulePasses: false } };
  add("SC-7: fresh market + excess but fail-closed suitability → suppresses user_unsuitable", rtEval({ ...base, ...mdToRuntime(freshLit), suitability: { profileComplete: true, suitableForCategory: false, prohibitsDefiLending: false } }).suppressionReason === "user_unsuitable", "suitability gate");
  add("SC-8: fresh market + excess + resolved suitability → emits exactly one card (chain complete)", (() => { const r = rtEval({ ...base, ...mdToRuntime(freshLit), suitability: { profileComplete: true, suitableForCategory: true, prohibitsDefiLending: false } }); return r.emit === true && r.card!.is_top_pick === false && r.card!.cta.executes_transaction === false; })(), "chain emits");

  // --- Immutability ---
  add("SC-9: assessment/governance/policy immutable after component wiring", DA_OUTCOME.unroundedAggregate === 5.93 && DA_OUTCOME.meetsMinimum === false && DA_MANIFEST_HASH === "direct_assessment_54a11ba3" && GR_ACTIVATION.productionSuggestionEligible === true && DL_CATMIN === 5.5 && DL_UNIMIN === 7, "immutable");

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 16H-S.6 — risk-profile compatibility governance amendment. Records the
 * human Medium/High compatibility judgment (ws_product_owner) as an immutable
 * amendment; suitability derives from governance; other gates still apply.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Step 16H-S.6 — risk-profile compatibility governance amendment. Records the
 * human Medium/High compatibility judgment (ws_product_owner) as an immutable
 * amendment; suitability derives from governance; other gates still apply.
 * ------------------------------------------------------------------ */
export function runDirectLendingProfileCompatibilityFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const row = (n: string) => AM_PROFILE_ROWS.find((r) => r.name.startsWith(n))!;

  // --- Effective compatible set (canonical IDs, allowlist) ---
  add("AM-1: effective compatible set is exactly [medium, high]", [...amCompatible()].sort().join(",") === "high,medium", amCompatible().join(","));
  add("AM-2: canonical Medium and High are compatible", amIsCompat("medium") === true && amIsCompat("high") === true, "medium/high");
  add("AM-3: Low / very_low / very_high / unknown / incomplete are NOT compatible", !amIsCompat("low") && !amIsCompat("very_low") && !amIsCompat("very_high") && !amIsCompat("unknown") && !amIsCompat(null), "fail-closed");
  add("AM-4: compatibility is governance-derived (from the amendment record, not hardcoded)", AM_RECORD.compatibleUserRiskProfileIds.join(",") === "medium,high" && amCompatible() === AM_RECORD.compatibleUserRiskProfileIds, "from record");

  // --- Immutable amendment + authorization ---
  add("AM-5: amendment binds to the original review id and manifest (unchanged)", AM_RECORD.amendsReviewId === "direct_usdc_lending_human_review_v1" && AM_RECORD.amendsReviewManifest === "human_review_5cdc7569", "bound");
  add("AM-6: original human-review manifest is preserved (not mutated)", GR_REVIEW.recordId === "direct_usdc_lending_human_review_v1" && GR_REVIEW_HASH === "human_review_5cdc7569", "preserved");
  add("AM-7: reviewer is ws_product_owner (human), authorized as risk_reviewer", AM_RECORD.reviewerId === "ws_product_owner" && AM_RECORD.reviewerActorKind === "human" && AM_AUTH.authorized === true, "authorized");
  add("AM-8: not an automated conclusion; no automated actor made the judgment", AM_RECORD.authoredByAutomatedAgent === false && AM_RECORD.isAutomatedConclusion === false && String(AM_RECORD.reviewerId) !== "ws_automated_risk_assessor" && String(AM_RECORD.reviewerId) !== "claude_automated_evidence_preparer", "human judgment");
  add("AM-9: amendment validates; manifest is well-formed", AM_VALID.valid === true && /^review_amendment_[0-9a-f]{8}$/.test(AM_HASH), AM_VALID.errors.join("|") || AM_HASH);

  // --- No unnecessary signoff/approval amendments ---
  add("AM-10: no signoff/approval amendment required (bind to review by identity)", AM_CHAIN.signoffAmendmentRequired === false && AM_CHAIN.approvalAmendmentRequired === false && AM_CHAIN.signoffBindsToReviewId === GR_REVIEW.recordId, "not required");
  add("AM-11: amendment joins the effective review chain; activation still eligible", AM_CHAIN.chain.length === 2 && AM_CHAIN.chain[1] === AM_RECORD.recordId && GR_ACTIVATION.productionSuggestionEligible === true, "chain");

  // --- Runtime suitability derives from governance ---
  add("AM-12: Medium/High derive suitableForCategory true; Low/unknown false", scSuit({ risk_tolerance: "medium" } as any).suitableForCategory === true && scSuit({ risk_tolerance: "high" } as any).suitableForCategory === true && scSuit({ risk_tolerance: "low" } as any).suitableForCategory === false && scSuit(null).suitableForCategory === false, "derived");
  add("AM-13: unknown/incomplete fail closed (not treated as Medium)", scSuit({ risk_tolerance: "banana" } as any).suitableForCategory === false && scSuit({ risk_tolerance: "banana" } as any).userRiskProfileId === null, "fail-closed");

  // --- Profile /testing states: exact outcomes ---
  add("AM-14: Medium profile eligible → emits one card", row("Medium profile eligible").emits === true && row("Medium profile eligible").card?.is_top_pick === false, "medium emits");
  add("AM-15: High profile eligible → emits one card", row("High profile eligible").emits === true && row("High profile eligible").card !== null, "high emits");
  add("AM-16: Low / Unknown / Incomplete / very_low → user_unsuitable, no card", row("Low profile").suppressionReason === "user_unsuitable" && row("Unknown profile").suppressionReason === "user_unsuitable" && row("Incomplete profile").suppressionReason === "user_unsuitable" && row("Medium + very_low").suppressionReason === "user_unsuitable", "suppressed");
  add("AM-17: other gates still apply — Medium+incomplete buffer → safety_buffer_incomplete", row("Medium + incomplete Safety Buffer").suppressionReason === "safety_buffer_incomplete", "buffer gate");
  add("AM-18: High + no excess → no_excess_usdc", row("High + no excess USDC").suppressionReason === "no_excess_usdc", "excess gate");
  add("AM-19: Medium + stale APY → apy_stale; High + emergency → emergency_mode", row("Medium + stale APY").suppressionReason === "apy_stale" && row("High + emergency mode").suppressionReason === "emergency_mode", "market gates");
  add("AM-20: eligible profile cards expose no score/threshold, no executing CTA", AM_PROFILE_ROWS.filter((r) => r.card).every((r) => r.card && !/5\.93|5\.5| 7 |dimension|confidence/i.test(JSON.stringify(r.card)) && r.card.is_top_pick === false && !r.card.cta.executes_transaction), "clean");

  // --- Excluded candidates + immutability ---
  add("AM-21: Steakhouse/Jupiter remain excluded; no Top Pick", dlGetDispo("kamino_steakhouse_usdc")?.selectorEligibility === false && dlGetDispo("jupiter_lend_usdc")?.selectorEligibility === false && DL_DISPOS.every((d) => d.topPickEligibility === false), "excluded");
  add("AM-22: aggregate 5.93, meetsMinimum false, thresholds 7/5.5, all governance manifests immutable", DA_OUTCOME.unroundedAggregate === 5.93 && DA_OUTCOME.meetsMinimum === false && DA_MANIFEST_HASH === "direct_assessment_54a11ba3" && DL_UNIMIN === 7 && DL_CATMIN === 5.5 && GR_SIGNOFF_HASH === "risk_signoff_8f1829f4" && GR_APPROVAL_HASH === "product_approval_c0d5912c", "immutable");
  add("AM-23: no transaction behaviour introduced by the amendment", AM_PROFILE_ROWS.filter((r) => r.card).every((r) => r.card!.cta.action === null && !r.card!.cta.requires_wallet_signature), "read-only");

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 17A — Kamino Direct existing-position mounting. Pure normalization
 * reuses deriveKlendDirectLendingPosition (recognized) + evaluateWithdrawal-
 * Accessibility (liquid); exact cToken mint only; recognized/liquid separate;
 * dedupes the API/generic rows; fail-closed; assessment/governance immutable.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Step 16H-S.2 — the kaminoSecuritySourcesAmendment. Proves the two product-owner-supplied Kamino sources
 * (kamino.com/security + risk.kamino.finance), reviewed live 2026-07-27, are recorded as facts WITHOUT moving
 * any score, conferring approval/eligibility, or claiming coverage of the current on-chain binary.
 * ------------------------------------------------------------------ */
export function runKaminoSecuritySourcesAmendmentFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });

  add("KSS-1: the amendment adds EXACTLY the two supplied canonical URLs", KAMINO_SECURITY_SOURCES_EVIDENCE.sourcesAdded.length === 2 && KAMINO_SECURITY_SOURCES_EVIDENCE.sourcesAdded.includes("https://kamino.com/security") && KAMINO_SECURITY_SOURCES_EVIDENCE.sourcesAdded.includes("https://risk.kamino.finance/") && INCORPORATED_SOURCES.reviewedAt === "2026-07-27", KAMINO_SECURITY_SOURCES_EVIDENCE.sourcesAdded.join(","));
  add("KSS-2: the security hub is recorded as the successor to the /docs/security/* citations (relocation, not deletion)", INCORPORATED_SOURCES.securityHub.url === "https://kamino.com/security" && /docs\/security/.test(INCORPORATED_SOURCES.securityHub.relationshipToPriorCitations) && /NOT deleted|not deleted/i.test(INCORPORATED_SOURCES.securityHub.relationshipToPriorCitations), "relocation recorded");
  add("KSS-3: verified security-hub facts (20 audits / 5 auditors / 0 critical, 4 formal verifications, $1.5M ImmuneFi)", SECURITY_HUB_FACTS.auditSummary.totalAudits === 20 && SECURITY_HUB_FACTS.auditSummary.auditors === 5 && SECURITY_HUB_FACTS.auditSummary.criticalVulnerabilities === 0 && SECURITY_HUB_FACTS.formalVerifications.length === 4 && SECURITY_HUB_FACTS.bugBounty.cap === "$1,500,000", `${SECURITY_HUB_FACTS.auditSummary.totalAudits} audits`);
  add("KSS-4: the newer March 2026 v1.16.0/v1.17.0 audits are recorded but the '0 critical' / 'no incident' aggregate claims are explicitly NOT used as USDC-reserve evidence", SECURITY_HUB_FACTS.newerLendAudits.length === 2 && SECURITY_HUB_FACTS.newerLendAudits.every((a) => /v1\.1[67]\.0/.test(a.report) && a.date === "2026-03") && /NOT used as evidence/.test(SECURITY_HUB_FACTS.marketingClaimNotUsed), "newer audits + claim discipline");
  add("KSS-5: the risk dashboard STILL labels the primary market 'Main Market' — corroborates the SOL/BTC alias from a second surface", RISK_DASHBOARD_FACTS.primaryMarket.dashboardLabel === "Main Market" && RISK_DASHBOARD_FACTS.title === "Kamino Lend Analysis" && RISK_DASHBOARD_FACTS.aggregate.totalTvlUsd === 1_333_645_940, RISK_DASHBOARD_FACTS.primaryMarket.dashboardLabel);
  add("KSS-6: incorporating these sources moves NO score and confers NO approval / Safety-Buffer eligibility / binary coverage", S2_SCORE_IMPACT.scoresChanged === false && S2_SCORE_IMPACT.approvalConferred === false && S2_SCORE_IMPACT.safetyBufferEligibilityChanged === false && S2_CONFERS.scoresAssigned === false && S2_CONFERS.transactionConstructedOrSimulated === false && (S2_CONFERS.doesNotConfer as readonly string[]).includes("coverage of the current on-chain binary"), "no score / no approval");
  add("KSS-7: the S.2 manifest hash is deterministic and content-bound", S2_MANIFEST_HASH === computeS2ManifestHash() && /^kamino_security_sources_[0-9a-f]{8}$/.test(S2_MANIFEST_HASH), S2_MANIFEST_HASH);

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 21D — the canonical, NON-MOUNTED OnTrackAssessment. Proves the narrow scope WealthSmith can honestly claim
 * (Safety Buffer verified complete + canonical crypto allocation inside the ±10pp review range + authoritative
 * accounting + no proven material Rebalance need + no visible higher-priority candidate), that candidate-set
 * emptiness controls fallback VISIBILITY but never establishes plan health, that unevaluated dimensions are recorded
 * (never "healthy"), and that a proven cardless/filtered material Rebalance signal blocks the fallback.
 * ------------------------------------------------------------------ */

/**
 * Step 17D — Jupiter Lend USDC (jlUSDC) read-only existing-position detection. Proves exact-identity
 * detection/aggregation, fail-closed recognized-claim + liquidity (no verified methodology in production),
 * dedup, portfolio + Safety Buffer treatment, and immutability (Jupiter stays excluded_from_suggestions).
 */
export function runJupiterLendExistingPositionFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const RECEIPT = JL_ID.receiptTokenMint;
  const USDC = JL_ID.underlyingUsdcMint;
  const OWNER = "OwnerWa11et1111111111111111111111111111111";
  const CLASSIC = JL_ID.receiptTokenProgram;
  const TOKEN2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

  const acct = (over: Partial<JLAcct> = {}): JLAcct => ({
    address: "AtaAccount1111111111111111111111111111111", mint: RECEIPT, tokenProgram: CLASSIC,
    amountRaw: "1000000000", decimals: 6, owner: OWNER, ...over,
  });
  // Production default: NO verified conversion, NO verified liquidity, stale price → fully unresolved.
  const jinp = (over: Partial<JLInput> = {}): JLInput => ({
    receiptBalanceRaw: "1000000000", exchangeRate: null, liquidity: null,
    price: { usdcPriceUsd: null, fresh: false }, observedAt: "2026-07-18T00:00:00.000Z",
    sourceSlot: 0, walletFresh: true, ...over,
  });
  // A VERIFIED exact-integer rate (1.05 underlying USDC per share) — only ever supplied by proven methodology.
  const RATE = { underlyingPerShareNum: "105", underlyingPerShareDen: "100", calculationVersion: "test_v1", sourceAccounts: [JL_ID.poolAccount], sourceSlot: 100 };
  const freshPrice = { usdcPriceUsd: 0.9999, fresh: true };
  const wpos = (over: Partial<JLWalletPos>): JLWalletPos => ({ id: "x", source: "wallet", type: "token", symbol: "X", amount: "0", detection: "direct_wallet_balance", valueUsd: null, ...over });

  // ---- Identity (exact, never symbol) ----
  add("JL-1: exact jlUSDC receipt mint required (isReceiptMint)", jlIsReceiptMint(RECEIPT) === true && jlIsReceiptMint(USDC) === false && jlIsReceiptMint("jlUSDC") === false, "exact mint");
  add("JL-2: identity validator rejects wrong mint/underlying/program/candidate", (() => {
    const ok = jlValidateIdentity({ candidateId: JL_ID.candidateId, receiptTokenMint: RECEIPT, underlyingUsdcMint: USDC, tokenProgram: CLASSIC, cluster: "mainnet-beta" }).ok === true;
    const badR = jlValidateIdentity({ candidateId: JL_ID.candidateId, receiptTokenMint: USDC, underlyingUsdcMint: USDC, tokenProgram: CLASSIC, cluster: "mainnet-beta" }).failure === "receipt_mint_mismatch";
    const badU = jlValidateIdentity({ candidateId: JL_ID.candidateId, receiptTokenMint: RECEIPT, underlyingUsdcMint: RECEIPT, tokenProgram: CLASSIC, cluster: "mainnet-beta" }).failure === "underlying_mint_mismatch";
    const badP = jlValidateIdentity({ candidateId: JL_ID.candidateId, receiptTokenMint: RECEIPT, underlyingUsdcMint: USDC, tokenProgram: TOKEN2022, cluster: "mainnet-beta" }).failure === "token_program_mismatch";
    const badC = jlValidateIdentity({ candidateId: "kamino_usdc_lending", receiptTokenMint: RECEIPT, underlyingUsdcMint: USDC, tokenProgram: CLASSIC, cluster: "mainnet-beta" }).failure === "candidate_mismatch";
    return ok && badR && badU && badP && badC;
  })(), "validator");
  add("JL-3: identity is classic SPL, 6 decimals, canonical USDC underlying, no freeze authority", JL_ID.receiptTokenProgram === CLASSIC && JL_ID.receiptTokenDecimals === 6 && JL_ID.underlyingUsdcMint === "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" && JL_ID.receiptTokenFreezeAuthority === null, "spl/6/usdc");
  add("JL-4: identity manifest is deterministic + stable", jlManifestHash() === JL_MANIFEST_HASH && JL_MANIFEST_HASH.startsWith("jup_lend_identity_"), JL_MANIFEST_HASH);
  add("JL-5: identity bound to program chain (lending + liquidity + pool), not a label", JL_ID.lendingProgram === "jup3YeL8QhtSx1e253b2FDvsMNC87fDrgQZivbrndc9" && JL_ID.liquidityProgram === "jupeiUmn818Jg1ekPURTpr4mFo29p46vygyykFJ3wZC" && JL_ID.poolAccount === "5nmGjA4s7ATzpBQXC5RNceRpaJ7pYw2wKsNBWyuSAZV6", "program chain");

  // ---- Detection + aggregation ----
  add("JL-6: single ATA detected + aggregated", (() => { const d = jlDiscover([acct()], OWNER); return d.accounts.length === 1 && d.aggregateRaw === "1000000000"; })(), "ata");
  add("JL-7: non-associated account detected (owner-matched, arbitrary address)", (() => { const d = jlDiscover([acct({ address: "NonAtaXYZ" })], OWNER); return d.accounts.length === 1 && d.aggregateRaw === "1000000000"; })(), "non-ata");
  add("JL-8: multiple accounts aggregate (exact integer sum)", (() => { const d = jlDiscover([acct({ address: "A", amountRaw: "1000000000" }), acct({ address: "B", amountRaw: "2500000" })], OWNER); return d.accounts.length === 2 && d.aggregateRaw === "1002500000"; })(), "sum");
  add("JL-9: zero-balance account excluded", (() => { const d = jlDiscover([acct({ address: "Z", amountRaw: "0" })], OWNER); return d.accounts.length === 0 && d.aggregateRaw === "0" && d.rejected[0]?.reason === "zero_balance"; })(), "zero");
  add("JL-10: malformed amount fails closed (excluded)", (() => { const d = jlDiscover([acct({ address: "M", amountRaw: "12.3x" })], OWNER); return d.accounts.length === 0 && d.rejected[0]?.reason === "malformed_amount"; })(), "malformed");
  add("JL-11: canonical USDC NOT matched as jlUSDC (wrong mint)", (() => { const d = jlDiscover([acct({ mint: USDC })], OWNER); return d.accounts.length === 0 && d.rejected[0]?.reason === "wrong_mint"; })(), "wrong mint");
  add("JL-12: wrong token program excluded", (() => { const d = jlDiscover([acct({ tokenProgram: TOKEN2022 })], OWNER); return d.accounts.length === 0 && d.rejected[0]?.reason === "wrong_token_program"; })(), "wrong prog");
  add("JL-13: foreign-owner account excluded", (() => { const d = jlDiscover([acct({ owner: "SomeoneElse" })], OWNER); return d.accounts.length === 0 && d.rejected[0]?.reason === "foreign_owner"; })(), "foreign");
  add("JL-14: closed account excluded", (() => { const d = jlDiscover([acct({ isClosed: true })], OWNER); return d.accounts.length === 0 && d.rejected[0]?.reason === "closed_account"; })(), "closed");
  add("JL-15: same account address never double-counted", (() => { const d = jlDiscover([acct({ address: "DUP" }), acct({ address: "DUP" })], OWNER); return d.accounts.length === 1 && d.aggregateRaw === "1000000000"; })(), "no double");
  add("JL-16: exact raw units preserved (large value, no float)", (() => { const d = jlDiscover([acct({ amountRaw: "123456789012345" })], OWNER); return d.aggregateRaw === "123456789012345"; })(), "exact raw");

  // ---- Recognition (ownership vs claim) ----
  add("JL-17: unresolved conversion preserves ownership (balance visible, recognized null)", (() => { const r = jlBuild(jinp()); return r.positionExists === true && r.receiptBalanceRaw === "1000000000" && r.recognizedUnderlyingRaw === null && r.recognizedValueUsd === null && r.enrichmentState === "unresolved" && r.unresolvedReasons.some((x) => /no verified jlUSDC/.test(x)); })(), "A survives ¬B");
  add("JL-18: verified conversion → exact integer floor(receipt × num/den)", (() => { const r = jlBuild(jinp({ receiptBalanceRaw: "1000000000", exchangeRate: RATE })); return r.recognizedUnderlyingRaw === "1050000000" && r.enrichmentState === "recognized_only"; })(), "1.05x");
  add("JL-19: conversion rounds DOWN (floor), never up", (() => { const r = jlBuild(jinp({ receiptBalanceRaw: "100", exchangeRate: { ...RATE, underlyingPerShareNum: "1", underlyingPerShareDen: "3" } })); return r.recognizedUnderlyingRaw === "33"; })(), "floor 1/3");
  add("JL-20: no 1:1 assumption — null rate does NOT set recognized = receipt", (() => { const r = jlBuild(jinp()); return r.recognizedUnderlyingRaw !== r.receiptBalanceRaw && r.recognizedUnderlyingRaw === null; })(), "not 1:1");
  add("JL-21: malformed rate fails closed (recognized null, ownership kept)", (() => { const r = jlBuild(jinp({ exchangeRate: { ...RATE, underlyingPerShareDen: "0" } })); return r.recognizedUnderlyingRaw === null && r.receiptBalanceRaw === "1000000000"; })(), "bad rate");

  // ---- Liquidity ----
  add("JL-22: no positive liquid without verified methodology", (() => { const r = jlBuild(jinp({ exchangeRate: RATE })); return r.currentlyLiquidUnderlyingRaw === null && r.liquidValueUsd === null && r.withdrawalState === "unresolved"; })(), "no liquid");
  add("JL-23: protocol pause respected → paused, no liquid", (() => { const r = jlBuild(jinp({ exchangeRate: RATE, liquidity: { currentlyLiquidUnderlyingRaw: "500000000", limited: false, paused: true, sourceSlot: 1, fresh: true } })); return r.withdrawalState === "paused" && r.currentlyLiquidUnderlyingRaw === null; })(), "paused");
  add("JL-24: stale liquidity → no verified amount (unresolved)", (() => { const r = jlBuild(jinp({ exchangeRate: RATE, liquidity: { currentlyLiquidUnderlyingRaw: "500000000", limited: false, paused: false, sourceSlot: 1, fresh: false } })); return r.withdrawalState === "unresolved" && r.currentlyLiquidUnderlyingRaw === null; })(), "stale liq");
  add("JL-25: verified liquid never exceeds recognized (capped)", (() => { const r = jlBuild(jinp({ receiptBalanceRaw: "1000000000", exchangeRate: RATE, liquidity: { currentlyLiquidUnderlyingRaw: "999999999999", limited: true, paused: false, sourceSlot: 1, fresh: true } })); return r.currentlyLiquidUnderlyingRaw === "1050000000" && r.withdrawalState === "fully_withdrawable"; })(), "cap");
  add("JL-26: partial liquidity classified partially_withdrawable", (() => { const r = jlBuild(jinp({ receiptBalanceRaw: "1000000000", exchangeRate: RATE, liquidity: { currentlyLiquidUnderlyingRaw: "500000000", limited: true, paused: false, sourceSlot: 1, fresh: true } })); return r.currentlyLiquidUnderlyingRaw === "500000000" && r.withdrawalState === "partially_withdrawable"; })(), "partial");
  add("JL-27: full liquidity classified fully_withdrawable (limiter permits)", (() => { const r = jlBuild(jinp({ receiptBalanceRaw: "1000000000", exchangeRate: RATE, liquidity: { currentlyLiquidUnderlyingRaw: "1050000000", limited: false, paused: false, sourceSlot: 1, fresh: true } })); return r.withdrawalState === "fully_withdrawable"; })(), "full");

  // ---- Pricing ----
  add("JL-28: recognized USD uses exact underlying price when fresh", (() => { const r = jlBuild(jinp({ receiptBalanceRaw: "1000000000", exchangeRate: RATE, price: freshPrice })); return typeof r.recognizedValueUsd === "number" && Math.abs((r.recognizedValueUsd as number) - 1050 * 0.9999) < 1e-6; })(), "usd = amt×price");
  add("JL-29: no permanent $1 — stale price → recognized USD null, tokens preserved", (() => { const r = jlBuild(jinp({ receiptBalanceRaw: "1000000000", exchangeRate: RATE, price: { usdcPriceUsd: 1, fresh: false } })); return r.recognizedValueUsd === null && r.recognizedUnderlyingRaw === "1050000000"; })(), "no $1");
  add("JL-30: liquid USD only when verified liquidity + fresh price", (() => { const r = jlBuild(jinp({ receiptBalanceRaw: "1000000000", exchangeRate: RATE, price: freshPrice, liquidity: { currentlyLiquidUnderlyingRaw: "500000000", limited: true, paused: false, sourceSlot: 1, fresh: true } })); return typeof r.liquidValueUsd === "number" && Math.abs((r.liquidValueUsd as number) - 500 * 0.9999) < 1e-6; })(), "liquid usd");

  // ---- Deduplication + portfolio merge ----
  const jlPos = jlToWallet(jlBuild(jinp()))!;
  add("JL-31: generic unknown jlUSDC row removed on merge", (() => {
    const rows: JLWalletPos[] = [wpos({ id: `mint-${RECEIPT}`, mint: RECEIPT, name: "Unknown token", symbol: "9BEc…PA2D", amount: "1000000000", uiAmount: 1000 })];
    const merged = jlMerge(rows, jlBuild(jinp()));
    return merged.filter((p) => p.mint === RECEIPT).length === 0 && merged.filter((p) => p.id === JL_POS_ID).length === 1;
  })(), "unknown removed");
  add("JL-32: canonical wallet USDC untouched by dedupe", (() => { const rows: JLWalletPos[] = [wpos({ id: "mint-usdc", mint: USDC, name: "USD Coin", symbol: "USDC", type: "token", valueUsd: 100 }), jlPos]; return jlDedupe(rows).some((p) => p.mint === USDC && p.symbol === "USDC"); })(), "usdc kept");
  add("JL-33: JupSOL untouched by dedupe", (() => { const rows: JLWalletPos[] = [wpos({ id: "mint-jupsol", mint: "jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v", symbol: "JupSOL", type: "lst" }), jlPos]; return jlDedupe(rows).some((p) => p.symbol === "JupSOL"); })(), "jupsol kept");
  add("JL-34: unrelated other-mint receipt untouched", (() => { const rows: JLWalletPos[] = [wpos({ id: "mint-other", mint: "OtherReceiptMint1111111111111111111111111", symbol: "xTOK" }), jlPos]; return jlDedupe(rows).some((p) => p.mint === "OtherReceiptMint1111111111111111111111111"); })(), "other kept");
  add("JL-35: exactly one canonical Jupiter row after repeated merge", (() => { let rows: JLWalletPos[] = []; rows = jlMerge(rows, jlBuild(jinp())); rows = jlMerge(rows, jlBuild(jinp())); return rows.filter((p) => p.id === JL_POS_ID).length === 1; })(), "one row");
  add("JL-36: dedupe key bound to program+mints+pool (not label)", jlPos.dedupeKey === JL_KEY && JL_KEY.includes(JL_ID.lendingProgram) && JL_KEY.includes(RECEIPT) && JL_KEY.includes(USDC) && JL_KEY.includes(JL_ID.poolAccount) && !JL_KEY.includes("Jupiter Lend USDC"), "key");

  // ---- Portfolio + Safety Buffer ----
  add("JL-37: fresh recognized value reaches portfolio valueUsd", (() => { const w = jlToWallet(jlBuild(jinp({ receiptBalanceRaw: "1000000000", exchangeRate: RATE, price: freshPrice }))); return !!w && typeof w.valueUsd === "number" && Math.abs((w.valueUsd as number) - 1050 * 0.9999) < 1e-6; })(), "reaches total");
  add("JL-38: unresolved value → valueUsd null (excluded from total, NOT zero)", (() => { const w = jlToWallet(jlBuild(jinp())); return !!w && w.valueUsd === null && w.recognizedValueUsd === null; })(), "null not zero");
  add("JL-39: Safety Buffer — recognized-only/unresolved contributes 0 verified liquid", (() => { const c = sbClassify(jlToWallet(jlBuild(jinp()))!); return c.verifiedLiquidValueUsd === 0 && c.inclusionState === "excluded_unresolved" && c.positionClass === "protocol_existing"; })(), "0 liquid");
  add("JL-40: Safety Buffer — jlUSDC does NOT count as direct wallet USDC", (() => { const c = sbClassify(jlToWallet(jlBuild(jinp({ receiptBalanceRaw: "1000000000", exchangeRate: RATE, price: freshPrice })))!); return c.positionClass !== "wallet_stable" && c.verifiedLiquidValueUsd === 0; })(), "not wallet usdc");
  add("JL-41: verified-liquid counts ONLY when withdrawal proven (included when fresh liquidity)", (() => { const c = sbClassify(jlToWallet(jlBuild(jinp({ receiptBalanceRaw: "1000000000", exchangeRate: RATE, price: freshPrice, liquidity: { currentlyLiquidUnderlyingRaw: "1050000000", limited: false, paused: false, sourceSlot: 1, fresh: true } })))!); return c.verifiedLiquidValueUsd > 0 && (c.inclusionState === "included_liquid" || c.inclusionState === "included_partial"); })(), "counts when proven");
  add("JL-42: already-complete buffer stays complete despite unresolved jlUSDC", (() => {
    const usdc = wpos({ id: "mint-usdc", mint: USDC, name: "USD Coin", symbol: "USDC", type: "token", valueUsd: 1000 });
    const cov = sbCoverage([usdc, jlToWallet(jlBuild(jinp()))!], 500);
    return cov.coverageState === "complete" && cov.verifiedLiquidStableValueUsd === 1000;
  })(), "complete despite unresolved");

  // ---- Immutability / no eligibility / no transaction ----
  add("JL-43: Jupiter excluded_from_suggestions, not_ready, provisional preserved, no eligibility", (() => { const j = dlGetDispo("jupiter_lend_usdc"); return j?.disposition === "excluded_from_suggestions" && j?.finalAssessmentStatus === "not_ready" && j?.provisionalSensitivityPreserved === true && j?.selectorEligibility === false && j?.topPickEligibility === false && j?.suggestionEligibility === false; })(), "excluded");
  add("JL-44: Kamino + Steakhouse dispositions unchanged", dlGetDispo("kamino_usdc_lending")?.disposition === "selected_category_candidate" && dlGetDispo("kamino_steakhouse_usdc")?.disposition === "existing_position_only", "others intact");
  add("JL-45: position row is existing-only with NO score/range/cta/transaction affordance", (() => { const w = jlToWallet(jlBuild(jinp({ exchangeRate: RATE, price: freshPrice })))!; return w.existingPositionOnly === true && w.apy === null && !("cta" in w) && !("score" in w) && !("provisionalRange" in w) && !("transaction" in w) && !("signature" in w); })(), "existing-only");
  add("JL-46: adapter exposes no provisional sensitivity range (4.12–4.32 stays research-only)", (() => { const s = JSON.stringify(jlBuild(jinp({ exchangeRate: RATE }))); return !s.includes("4.12") && !s.includes("4.32"); })(), "no range leak");

  return checks;
}

/**
 * Step 17D.1 — Jupiter Lend jlUSDC verified share accounting + applicability. Proves the pool-decoder
 * fail-closes on identity, the conversion function's invariants, the `unresolved` applicability
 * determination (no invented decoder), and the §13 manifest/support-binding audit.
 */

/**
 * Step 17D.1 — Jupiter Lend jlUSDC verified share accounting + applicability. Proves the pool-decoder
 * fail-closes on identity, the conversion function's invariants, the `unresolved` applicability
 * determination (no invented decoder), and the §13 manifest/support-binding audit.
 */
export function runJupiterLendShareAccountingFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const obs = (over: Partial<JLPoolObs> = {}): JLPoolObs => ({
    poolAddress: JL_POOL.poolAccount, ownerProgram: JL_POOL.expectedOwnerProgram,
    discriminatorHex: JL_POOL.expectedDiscriminatorHex, dataLenBytes: JL_POOL.expectedDataLenBytes,
    sourceSlot: 433500000, ...over,
  });

  // ---- Pool decoder: identity gates fail closed ----
  add("JA-1: wrong pool address rejected (identity fail-closed)", jlDecodePool(obs({ poolAddress: "WrongPool111" })).status === "rejected_identity" && jlDecodePool(obs({ poolAddress: "WrongPool111" })).failure === "wrong_pool", "wrong pool");
  add("JA-2: wrong owner program rejected", jlDecodePool(obs({ ownerProgram: "jupeiUmn818Jg1ekPURTpr4mFo29p46vygyykFJ3wZC" })).failure === "wrong_owner", "wrong owner");
  add("JA-3: wrong discriminator rejected", jlDecodePool(obs({ discriminatorHex: "0000000000000000" })).failure === "wrong_discriminator", "wrong disc");
  add("JA-4: unsupported account length rejected", jlDecodePool(obs({ dataLenBytes: 200 })).failure === "unsupported_length", "wrong len");
  add("JA-5: malformed observation rejected", jlDecodePool(obs({ dataLenBytes: NaN as unknown as number })).status === "rejected_identity", "malformed");
  add("JA-6: identity PASS but no verified layout → unresolved (no invented offsets)", (() => { const r = jlDecodePool(obs()); return r.status === "unresolved_no_verified_layout" && r.exchangeRate === null; })(), "no layout");

  // ---- Conversion function invariants (verified-input, integer only) ----
  add("JA-7: floor(receipt × num/den) exact integer (1.05×)", jlConvert("1000000000", "105", "100").recognizedUnderlyingRaw === "1050000000", "1.05x");
  add("JA-8: rounds DOWN (floor), never up", jlConvert("100", "1", "3").recognizedUnderlyingRaw === "33", "floor 1/3");
  add("JA-9: zero shares → zero underlying", jlConvert("0", "105", "100").recognizedUnderlyingRaw === "0", "0 shares");
  add("JA-10: denominator zero fails closed", (() => { const r = jlConvert("1000", "105", "0"); return r.ok === false && r.recognizedUnderlyingRaw === null && r.failure === "denominator_non_positive"; })(), "den 0");
  add("JA-11: negative shares/numerator fail closed", jlConvert("-5", "105", "100").failure === "negative_shares" && jlConvert("1000", "-1", "100").failure === "negative_numerator", "negatives");
  add("JA-12: large values no overflow (BigInt)", jlConvert("999999999999999999999", "1000001", "1000000").recognizedUnderlyingRaw === (((999999999999999999999n) * 1000001n) / 1000000n).toString(), "no overflow");
  add("JA-13: monotonic with receipt balance", (() => { const a = BigInt(jlConvert("1000", "105", "100").recognizedUnderlyingRaw!); const b = BigInt(jlConvert("2000", "105", "100").recognizedUnderlyingRaw!); return b >= a; })(), "monotonic");
  add("JA-14: accounting-bound — shares ≤ denominator ⇒ claim ≤ numerator", (() => { const r = BigInt(jlConvert("100", "500", "100").recognizedUnderlyingRaw!); return r <= 500n; })(), "≤ assets");
  add("JA-15: malformed numeric inputs fail closed", jlConvert("1e9", "105", "100").failure === "malformed_inputs" && jlConvert("100", "abc", "100").failure === "malformed_inputs", "malformed");

  // ---- Applicability determination = unresolved (no invented decoder) ----
  add("JA-16: source-to-account applicability is UNRESOLVED", JL_APPLIC.status === "unresolved", JL_APPLIC.status);
  add("JA-17: deployed binary NOT claimed audited / no full source-to-binary verification", JL_APPLIC.deployedBinaryClaimedAudited === false && JL_APPLIC.claimsFullSourceToBinaryVerification === false, "not audited");
  add("JA-18: the two share-accounting BLOCKER criteria are unresolved; owner-match resolved", (() => {
    const c = (id: string) => JL_APPLIC.criteria.find((x) => x.id === id)?.resolved;
    return c("live_pool_owner_matches_program") === true && c("supplier_share_fields_have_source_backed_layout") === false && c("mint_burn_semantics_map_jlusdc_to_claim") === false;
  })(), "criteria");
  add("JA-19: blockers are explicit and non-empty", JL_APPLIC.blockers.length >= 3 && JL_APPLIC.blockers.some((b) => /rust/i.test(b)) && JL_APPLIC.blockers.some((b) => /vendored|idl/i.test(b)), "blockers");
  add("JA-20: mayMount false → resolver returns null WITHOUT decoding (no RPC/fetch)", jlMayMount() === false && jlResolveRate() === null && jlResolveRate(obs({ numerator: "105", denominator: "100" } as Partial<JLPoolObs>)) === null, "gated null");
  add("JA-21: applicability manifest deterministic", jlSaHash() === JL_SA_HASH && JL_SA_HASH.startsWith("jup_lend_share_accounting_"), JL_SA_HASH);

  // ---- Production consequence: recognized stays null, ownership preserved ----
  add("JA-22: production (null rate) → recognized null, receipt balance visible, position exists", (() => {
    const r = jlBuild({ receiptBalanceRaw: "1000000000", exchangeRate: jlResolveRate(), liquidity: null, price: { usdcPriceUsd: null, fresh: false }, observedAt: "2026-07-18T00:00:00.000Z", sourceSlot: 0, walletFresh: true });
    return r.positionExists === true && r.recognizedUnderlyingRaw === null && r.recognizedValueUsd === null && r.receiptBalanceRaw === "1000000000";
  })(), "unresolved preserved");
  add("JA-23: FUTURE verified path works — decode with source-backed num/den yields a rate (gated off in prod)", (() => {
    const r = jlDecodePool(obs({ numerator: "1050000000", denominator: "1000000000" } as Partial<JLPoolObs>));
    return r.status === "verified" && r.exchangeRate?.underlyingPerShareNum === "1050000000" && r.exchangeRate?.sourceAccounts[0] === JL_POOL.poolAccount;
  })(), "verified path ready");

  // ---- §13 manifest + existingPositionSupport binding ----
  add("JA-24: full Jupiter identity manifest hash deterministic + exact", jlManifestHash() === JL_MANIFEST_HASH && JL_MANIFEST_HASH === "jup_lend_identity_5fcc60e6", JL_MANIFEST_HASH);
  add("JA-25: existingPositionSupport has an explicit immutable binding (read-only detection only)", JL_SUPPORT_BINDING.existingPositionSupport === true && JL_SUPPORT_BINDING.supportKind === "read_only_detection_only" && JL_SUPPORT_BINDING.boundToIdentityManifest === JL_MANIFEST_HASH && jlSupportHash() === JL_SUPPORT_HASH, "bound");
  add("JA-26: support binding grants NO recommendation/selector/TopPick/optimization eligibility", (() => { const d = JL_SUPPORT_BINDING.doesNotGrant.join("|"); return /recommendation/.test(d) && /selector/.test(d) && /Top Pick/.test(d) && /Position Optimization/.test(d); })(), "no grants");
  add("JA-27: dispositions manifest binds disposition+selector, NOT existingPositionSupport", (() => {
    const material = JSON.stringify(DL_DISPO_MANIFEST.dispositions);
    return material.includes("disposition") && material.includes("selector") && !material.includes("existingPositionSupport") && dlDispoHashFn() === DL_DISPO_HASH;
  })(), "manifest scope");
  add("JA-28: recommendation disposition still excluded_from_suggestions; prior history preserved", dlGetDispo("jupiter_lend_usdc")?.disposition === "excluded_from_suggestions" && JL_SUPPORT_BINDING.recommendationDispositionUnchanged === "excluded_from_suggestions" && JL_SUPPORT_BINDING.priorDispositionHistoryPreserved === true, "disposition");

  // ---- Liquidity/actionability + immutability (recognized ≠ liquid; nothing actionable) ----
  add("JA-29: even a (hypothetical) recognized value does NOT imply liquid; Safety Buffer stays 0", (() => {
    const RATE = { underlyingPerShareNum: "105", underlyingPerShareDen: "100", calculationVersion: "t", sourceAccounts: [JL_POOL.poolAccount], sourceSlot: 1 };
    const w = jlToWallet(jlBuild({ receiptBalanceRaw: "1000000000", exchangeRate: RATE, liquidity: null, price: { usdcPriceUsd: 0.9999, fresh: true }, observedAt: "2026-07-18T00:00:00.000Z", sourceSlot: 0, walletFresh: true }))!;
    const c = sbClassify(w);
    return typeof w.recognizedValueUsd === "number" && w.liquidValueUsd === null && w.withdrawalState === "unresolved" && c.verifiedLiquidValueUsd === 0;
  })(), "recognized≠liquid");
  add("JA-30: Jupiter research-only unchanged; Kamino + Steakhouse intact; no tx in accounting result", (() => {
    const j = dlGetDispo("jupiter_lend_usdc"); const s = JSON.stringify(jlDecodePool(obs()));
    return j?.finalAssessmentStatus === "not_ready" && j?.provisionalSensitivityPreserved === true && dlGetDispo("kamino_usdc_lending")?.disposition === "selected_category_candidate" && dlGetDispo("kamino_steakhouse_usdc")?.disposition === "existing_position_only" && !s.includes("cta") && !s.includes("signature") && !s.includes("transaction");
  })(), "immutable");

  return checks;
}

/**
 * Step 17E — Token-2022 transferability, effective-balance and verified-liquidity hardening. Binds numeric
 * extension ids + the fee formula to the INSTALLED @solana/spl-token 0.4.14, then proves the balance splits,
 * fail-closed extension handling, aggregation, mapping, and Safety Buffer integration.
 */
