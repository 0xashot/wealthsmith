/**
 * directUsdcLendingProductDecision — Step 16H-S.1. The versioned product-decision evidence artifact
 * recording the product-owner decision, and the deterministic 24-state `/testing` dataset (each state
 * derived by running the real selector/trigger, so it cannot drift from behaviour).
 *
 * THIS ARTIFACT IS NOT GOVERNANCE. It records a product-owner DECISION — preferred candidate, policy
 * direction, exclusions — with the original assessment results preserved and the governance gates that
 * remain required. It is explicitly NOT a human risk review, NOT a risk signoff, and NOT a product
 * approval. It fabricates none of them.
 */
import {
  DIRECT_USDC_LENDING_CATEGORY,
  DIRECT_USDC_LENDING_CATEGORY_MINIMUM,
  UNIVERSAL_MINIMUM,
  DIRECT_USDC_LENDING_POLICY_MANIFEST_HASH,
} from "./directUsdcLendingEligibilityPolicy";
import {
  CANDIDATE_DISPOSITIONS,
  KAMINO_CATEGORY_EVALUATION,
  DISPOSITIONS_MANIFEST_HASH,
} from "./directUsdcLendingDispositions";
import { DIRECT_ASSESSMENT_MANIFEST_HASH } from "./klendDirectUsdcAutomatedAssessment";
import {
  selectDirectUsdcLendingCandidate,
  evaluateSuggestionTrigger,
  type SelectorProductState,
  type SelectorResultState,
} from "./directUsdcLendingSelector";

export const DIRECT_USDC_LENDING_PRODUCT_DECISION_ID = "direct_usdc_lending_product_decision_v1" as const;
export const DIRECT_USDC_LENDING_PRODUCT_DECISION_VERSION = "1.0.0" as const;

/* ------------------------------------------------------------------ *
 * 1. The decision artifact
 * ------------------------------------------------------------------ */

export const DIRECT_USDC_LENDING_PRODUCT_DECISION = {
  decisionId: DIRECT_USDC_LENDING_PRODUCT_DECISION_ID,
  decisionVersion: DIRECT_USDC_LENDING_PRODUCT_DECISION_VERSION,
  preparerId: "claude_automated_evidence_preparer",
  preparerRole: "evidence_preparer",
  timestamp: "2026-07-17T14:00:00.000Z",

  productOwnerDecision:
    "Introduce a category-specific direct-USDC-lending policy with a 5.5 category floor for excess_usdc_yield; " +
    "select Kamino Direct as the sole eligible candidate; exclude Steakhouse (existing-position only) and Jupiter (research-only).",
  selectedCategory: DIRECT_USDC_LENDING_CATEGORY,
  categoryThreshold: DIRECT_USDC_LENDING_CATEGORY_MINIMUM,
  universalThresholdPreserved: UNIVERSAL_MINIMUM,
  selectedCandidateId: "kamino_usdc_lending",
  excludedCandidateIds: ["kamino_steakhouse_usdc", "jupiter_lend_usdc"],

  dispositionReasons: CANDIDATE_DISPOSITIONS.map((d) => ({ candidateId: d.candidateId, disposition: d.disposition, reasons: d.reasons })),

  originalAssessmentPreserved: {
    assessmentManifest: DIRECT_ASSESSMENT_MANIFEST_HASH,
    aggregate: KAMINO_CATEGORY_EVALUATION.automatedAggregate,       // 5.93
    universalThreshold: KAMINO_CATEGORY_EVALUATION.originalUniversalThreshold, // 7
    meetsMinimum: KAMINO_CATEGORY_EVALUATION.originalMeetsMinimumUnchanged,    // false
    mutated: false,
    doesNotClaimHistoricalPass: true,
  },
  categoryFloorResult: KAMINO_CATEGORY_EVALUATION.categoryFloorResult,   // pass
  universalFloorResult: KAMINO_CATEGORY_EVALUATION.universalFloorResult, // fail

  governanceGatesStillRequired: ["human_review", "risk_signoff", "separate_product_approval"],
  // FROZEN S.1-time snapshot — this artifact is history. At S.1, governance was pending. The three
  // gates were later satisfied by authorized-human records in 16H-S.2 (see directUsdcLendingGovernanceRecords).
  // This snapshot is NOT rewritten so the S.1 decision manifest stays immutable.
  governanceResolution: {
    missingGates: ["human_review", "risk_signoff", "product_approval"],
    firstMissingGate: "human_review",
    productionSuggestionEligible: false,
  },
  supersededByActivation: "direct_usdc_lending_production_activation (16H-S.2) records the completed human review, signoff and approval that satisfy these gates.",

  safetyBufferExclusion: "Direct USDC lending is NOT eligible to fund the Safety Buffer.",
  excessUsdcOnlyRule: "Only USDC classified as excess capital, after the Safety Buffer is fully satisfied by verified liquid coverage, is eligible.",
  executionBehavior: "none — read-only MVP; no transaction, signature, or deposit CTA",

  isNotHumanRiskReview: true,
  isNotRiskSignoff: true,
  isNotProductApproval: true,

  supersession: "Superseded only by a v2 product decision or a rubric/policy version change. A completed governance record does not supersede this artifact; it unblocks production alongside it.",
  invalidationTriggers: [
    "KLend program / ProgramData / upgrade-authority change",
    "market-owner / emergency-council / threshold / timelock / multisig membership change",
    "proposer_authority gains material powers",
    "reserve identity / oracle configuration / collateral eligibility change",
    "socialize_loss / material bad debt / material exploit or incident",
    "new audit evidence materially changes the assessment",
    "withdrawal-mechanics / fee-mechanics / emergency-behavior change",
    "rubric / confidence-policy / category-eligibility-policy version change",
    "human signoff or product approval expires or is revoked",
  ],
  boundManifests: {
    policy: DIRECT_USDC_LENDING_POLICY_MANIFEST_HASH,
    dispositions: DISPOSITIONS_MANIFEST_HASH,
    assessment: DIRECT_ASSESSMENT_MANIFEST_HASH,
  },
} as const;

export function computeProductDecisionManifestHash(m: typeof DIRECT_USDC_LENDING_PRODUCT_DECISION = DIRECT_USDC_LENDING_PRODUCT_DECISION): string {
  const material = JSON.stringify({
    id: m.decisionId, v: m.decisionVersion, sel: m.selectedCandidateId, exc: m.excludedCandidateIds,
    ct: m.categoryThreshold, ut: m.universalThresholdPreserved, cf: m.categoryFloorResult, uf: m.universalFloorResult,
    mm: m.originalAssessmentPreserved.meetsMinimum, mg: m.governanceResolution.missingGates, bm: m.boundManifests,
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < material.length; i++) { h ^= material.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `direct_decision_${h.toString(16).padStart(8, "0")}`;
}

export const DIRECT_USDC_LENDING_PRODUCT_DECISION_MANIFEST_HASH = computeProductDecisionManifestHash();

/* ------------------------------------------------------------------ *
 * 2. The 24 `/testing` states — derived from the real selector/trigger
 * ------------------------------------------------------------------ */

const FRESH: SelectorProductState = {
  identityValid: true, assessmentValid: true, categoryFloorPassed: true, assessmentInvalidated: false,
  governanceComplete: true, depositsAvailable: true, emergencyModeActive: false,
  capacityFreshAndSufficient: true, apyFreshAndComparisonReady: true, riskPolicyVersionActive: true,
};
const FRESH_USER = {
  holdsCanonicalUsdc: true, safetyBufferFullySatisfiedByVerifiedLiquidCoverage: true,
  relevantUsdcIsExcessCapital: true, deterministicEligibleAmountIsPositive: true,
  userSuitableForCategory: true, noSuitabilityRuleProhibitsDefiLending: true,
};
/** The REAL current production state: governance incomplete. */
const CURRENT: SelectorProductState = { ...FRESH, governanceComplete: false };

export interface TestingState {
  id: number;
  name: string;
  selectorState: SelectorResultState;
  suggestionGenerated: boolean;
  showsCard: boolean;
  notes: string;
}

export const DIRECT_LENDING_TESTING_STATES: TestingState[] = [
  { id: 1, name: "Eligible Kamino suggestion", ...derive(FRESH, FRESH_USER), notes: "all gates pass (fixture-only; production still governance-gated)" },
  { id: 2, name: "Governance pending", ...derive(CURRENT, FRESH_USER), notes: "the real current state — blocked_governance" },
  { id: 3, name: "Human review missing", ...derive({ ...FRESH, governanceComplete: false }, FRESH_USER), notes: "first missing gate: human_review" },
  { id: 4, name: "Risk signoff missing", ...derive({ ...FRESH, governanceComplete: false }, FRESH_USER), notes: "signoff absent" },
  { id: 5, name: "Product approval missing", ...derive({ ...FRESH, governanceComplete: false }, FRESH_USER), notes: "approval absent" },
  { id: 6, name: "Safety Buffer incomplete", ...derive(FRESH, { ...FRESH_USER, safetyBufferFullySatisfiedByVerifiedLiquidCoverage: false }), notes: "user gate blocks" },
  { id: 7, name: "No excess USDC", ...derive(FRESH, { ...FRESH_USER, relevantUsdcIsExcessCapital: false }), notes: "user gate blocks" },
  { id: 8, name: "APY stale", ...derive({ ...FRESH, apyFreshAndComparisonReady: false }, FRESH_USER), notes: "blocked_freshness" },
  { id: 9, name: "Capacity stale", ...derive({ ...FRESH, capacityFreshAndSufficient: false }, FRESH_USER), notes: "blocked_capacity" },
  { id: 10, name: "Deposit availability blocked", ...derive({ ...FRESH, depositsAvailable: false }, FRESH_USER), notes: "blocked_availability" },
  { id: 11, name: "Emergency mode active", ...derive({ ...FRESH, emergencyModeActive: true }, FRESH_USER), notes: "blocked_availability" },
  { id: 12, name: "Assessment invalidated", ...derive({ ...FRESH, assessmentInvalidated: true }, FRESH_USER), notes: "blocked_invalidation" },
  { id: 13, name: "Existing Kamino position", ...derive(CURRENT, FRESH_USER), notes: "position view is separate; no new suggestion here" },
  { id: 14, name: "Existing Steakhouse position, no suggestion", ...derive(CURRENT, FRESH_USER), notes: "Steakhouse visible; never suggested/fallback" },
  { id: 15, name: "Jupiter excluded", ...derive(CURRENT, FRESH_USER), notes: "Jupiter never selectable" },
  { id: 16, name: "No approved direct-lending candidate", ...derive({ ...FRESH, categoryFloorPassed: false }, FRESH_USER), notes: "no_approved_candidate" },
  { id: 17, name: "Kamino eligible but no deterministic amount", ...derive(FRESH, { ...FRESH_USER, deterministicEligibleAmountIsPositive: false }), notes: "show without amount in /testing; production blocked" },
  { id: 18, name: "Kamino suggestion without Top Pick", ...derive(FRESH, FRESH_USER), notes: "no auto Top Pick even as sole candidate" },
  { id: 19, name: "Risk disclosure expanded", ...derive(FRESH, FRESH_USER), notes: "detail points visible" },
  { id: 20, name: "Variable APY tooltip", ...derive(FRESH, FRESH_USER), notes: "~x.xx% variable APY" },
  { id: 21, name: "Partial current withdrawal liquidity", ...derive(FRESH, FRESH_USER), notes: "copy: withdrawals depend on available liquidity" },
  { id: 22, name: "Withdrawals currently unavailable", ...derive({ ...FRESH, depositsAvailable: false }, FRESH_USER), notes: "blocked_availability; existing position still viewable" },
  { id: 23, name: "USDC price unavailable", ...derive(FRESH, { ...FRESH_USER, deterministicEligibleAmountIsPositive: false }), notes: "no USD amount shown" },
  { id: 24, name: "Demo mode behavior", ...derive(CURRENT, FRESH_USER), notes: "Demo unchanged; no live suggestion introduced" },
];

function derive(product: SelectorProductState, user: typeof FRESH_USER): { selectorState: SelectorResultState; suggestionGenerated: boolean; showsCard: boolean } {
  const sel = selectDirectUsdcLendingCandidate(product);
  const trig = evaluateSuggestionTrigger(product, user);
  return { selectorState: sel.state, suggestionGenerated: trig.generate, showsCard: trig.generate };
}

/* ------------------------------------------------------------------ *
 * 3. Validation
 * ------------------------------------------------------------------ */

export function validateProductDecision(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const d = DIRECT_USDC_LENDING_PRODUCT_DECISION;
  if (d.isNotHumanRiskReview !== true || d.isNotRiskSignoff !== true || d.isNotProductApproval !== true)
    errors.push("decision must declare it is not review/signoff/approval");
  if (d.originalAssessmentPreserved.meetsMinimum !== false) errors.push("original meetsMinimum must remain false");
  if (d.originalAssessmentPreserved.universalThreshold !== 7) errors.push("universal threshold must remain 7");
  if (d.governanceResolution.productionSuggestionEligible !== false) errors.push("production must be disabled");
  if (DIRECT_LENDING_TESTING_STATES.length !== 24) errors.push(`expected 24 testing states, got ${DIRECT_LENDING_TESTING_STATES.length}`);
  // Only the pure-fresh states generate a suggestion; the real current state never does.
  const s2 = DIRECT_LENDING_TESTING_STATES.find((s) => s.id === 2)!;
  if (s2.suggestionGenerated !== false || s2.selectorState !== "blocked_governance") errors.push("state 2 must be blocked_governance with no suggestion");
  const s1 = DIRECT_LENDING_TESTING_STATES.find((s) => s.id === 1)!;
  if (s1.selectorState !== "eligible_candidate_selected") errors.push("state 1 must be eligible_candidate_selected (fixture-only)");
  return { valid: errors.length === 0, errors };
}

export const PRODUCT_DECISION_VALIDATION = validateProductDecision();
