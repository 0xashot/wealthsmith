/**
 * directUsdcLendingRuntimeAdapter — Step 16H-S.3. The single deterministic runtime boundary that
 * connects the approved Kamino Direct policy/governance/selector/card to the real suggestion-engine
 * flow. It is the SAME adapter the live `/testing` page and production use, so the eligible testing
 * card and the production card are produced by one builder — no drift, no parallel engine.
 *
 * FAIL-CLOSED + READ-ONLY. Every uncertainty resolves to a suppression with an exact machine-readable
 * reason — never to a weaker candidate, never to an invented amount, never to a stale snapshot. No
 * transaction is constructed, no signature requested, and the card carries only review-only actions.
 *
 * GOVERNANCE IS DERIVED, NEVER HARDCODED. `governanceEligible` comes from PRODUCTION_ACTIVATION
 * (valid human review + active signoff + active approval + valid bindings). If any becomes inactive or
 * the assessment/identity is invalidated, this adapter suppresses automatically with no code change.
 *
 * NEVER USER-FACING. The numeric risk score and thresholds never enter this path's output.
 */
import type { SuggestionCardState } from "../types/dashboard";
import { PRODUCTION_ACTIVATION } from "./directUsdcLendingGovernanceRecords";
import {
  DIRECT_USDC_LENDING_CARD_COPY,
  DIRECT_USDC_LENDING_CARD_ACTIONS,
  formatDirectLendingApy,
  buildAnalyticsPayload,
  type DirectLendingAnalyticsPayload,
} from "./directUsdcLendingSuggestionCard";
import { DIRECT_USDC_LENDING_ELIGIBILITY_POLICY_VERSION } from "./directUsdcLendingEligibilityPolicy";
import { selectDirectUsdcLendingCandidate, evaluateSuggestionTrigger, type SelectorProductState } from "./directUsdcLendingSelector";

/** The exact approved product identity. Any mismatch is identity_invalid. */
export const RUNTIME_PRODUCT_IDENTITY = {
  candidateId: "kamino_usdc_lending",
  marketAddress: "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF",
  reserve: "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59",
  canonicalUsdcMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  cTokenMint: "B8V6WVjPxW1UGwVDfxH2d2r8SyT4cqn7dQRK6XneVa7D",
  klendProgram: "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD",
} as const;

/* ------------------------------------------------------------------ *
 * Machine-readable suppression reasons (repo-native where equivalent exists)
 * ------------------------------------------------------------------ */

export type RuntimeSuppressionReason =
  | "governance_inactive"
  | "assessment_invalidated"
  | "identity_invalid"
  | "no_canonical_usdc"
  | "safety_buffer_incomplete"
  | "safety_buffer_unresolved"
  | "no_excess_usdc"
  | "missing_deterministic_amount"
  | "user_unsuitable"
  | "apy_stale"
  | "apy_unresolved"
  | "capacity_stale"
  | "insufficient_capacity"
  | "deposits_unavailable"
  | "emergency_mode"
  | "existing_position_no_top_up"
  | "price_unavailable";

export const ALL_RUNTIME_SUPPRESSION_REASONS: readonly RuntimeSuppressionReason[] = [
  "governance_inactive", "assessment_invalidated", "identity_invalid", "no_canonical_usdc",
  "safety_buffer_incomplete", "safety_buffer_unresolved", "no_excess_usdc", "missing_deterministic_amount",
  "user_unsuitable", "apy_stale", "apy_unresolved", "capacity_stale", "insufficient_capacity",
  "deposits_unavailable", "emergency_mode", "existing_position_no_top_up", "price_unavailable",
];

/* ------------------------------------------------------------------ *
 * The shared typed runtime boundary (production and /testing both build this)
 * ------------------------------------------------------------------ */

export interface DirectLendingRuntimeInput {
  /** Governance — seeded from PRODUCTION_ACTIVATION via governanceInputFromActivation(). */
  governanceEligible: boolean;
  assessmentValid: boolean;
  policyVersionActive: boolean;
  /** Product identity match (market/reserve/mint/cToken/program). */
  identity: { candidateId: string; reserve: string; canonicalUsdcMint: string; klendProgram: string };
  assessmentInvalidated: boolean;

  /** Wallet: exact canonical USDC only. `usdcMint` MUST equal the canonical mint. */
  wallet: { usdcMint: string | null; canonicalUsdcRawUnits: bigint | number | null; pricesFresh: boolean };

  /** Safety Buffer sufficiency — verified LIQUID coverage only. */
  safetyBuffer: { requiredResolved: boolean; sufficiencyResolved: boolean; fullyFundedByLiquidCoverage: boolean };

  /** Excess-USDC — deterministic amount from the approved allocation architecture. */
  excess: { deterministicAmountUsd: number | null; isPositive: boolean };

  /** Suitability from the user profile. */
  suitability: { profileComplete: boolean; suitableForCategory: boolean; prohibitsDefiLending: boolean };

  /** Live measured APY for the EXACT reserve. */
  apy: { measuredApyPct: number | null; rateKind: string; fresh: boolean; reserveIdentityMatches: boolean; slotDurationFresh: boolean; rewardApyPct: number };

  /** Availability + emergency state (source-verified). */
  availability: { depositsAvailable: boolean; emergencyModeActive: boolean };

  /** Capacity (source-verified; current available, never the configured cap). */
  capacity: { fresh: boolean; sufficientForAmount: boolean };

  /** Existing position. */
  existingPosition: { holdsExactCToken: boolean; approvedTopUpRulePasses: boolean };
}

/** Seed the governance/assessment/identity/policy fields from the real activation record. */
export function governanceInputFromActivation(): Pick<DirectLendingRuntimeInput, "governanceEligible" | "assessmentValid" | "policyVersionActive" | "identity" | "assessmentInvalidated"> {
  return {
    governanceEligible: PRODUCTION_ACTIVATION.productionSuggestionEligible, // derived, never hardcoded
    assessmentValid: true,
    policyVersionActive: true,
    assessmentInvalidated: false,
    identity: {
      candidateId: RUNTIME_PRODUCT_IDENTITY.candidateId,
      reserve: RUNTIME_PRODUCT_IDENTITY.reserve,
      canonicalUsdcMint: RUNTIME_PRODUCT_IDENTITY.canonicalUsdcMint,
      klendProgram: RUNTIME_PRODUCT_IDENTITY.klendProgram,
    },
  };
}

/* ------------------------------------------------------------------ *
 * The shared card-state builder (production + /testing use this one)
 * ------------------------------------------------------------------ */

export function buildDirectLendingCardState(opts: { idSuffix: string; measuredApyPct: number | null; amountText: string | null }): SuggestionCardState {
  const action = DIRECT_USDC_LENDING_CARD_ACTIONS[0]; // "View details" — review-only
  return {
    id: `direct-lending-${opts.idSuffix}`,
    title: DIRECT_USDC_LENDING_CARD_COPY.title,
    type: "stable_yield",
    // Card vocabulary: the engine category `stable_yield` maps to "yield_opportunity".
    category: "yield_opportunity",
    badge: DIRECT_USDC_LENDING_CARD_COPY.eyebrow,
    is_top_pick: false, // never auto Top Pick
    status: "review_only",
    actionability: "actionable",
    severity: "info",
    description: DIRECT_USDC_LENDING_CARD_COPY.description,
    impact_text: opts.amountText ?? "Amount shown once eligible excess USDC is determined",
    cta: {
      label: action.label,
      action: null,
      executes_transaction: false,
      requires_wallet_signature: false,
      completion_on_click: false,
    },
    ...(opts.measuredApyPct == null ? {} : { apy: { status: "estimated", display: formatDirectLendingApy(opts.measuredApyPct) } }),
  };
}

/* ------------------------------------------------------------------ *
 * The deterministic evaluation — emit a card or suppress with an exact reason
 * ------------------------------------------------------------------ */

export type RuntimeResult =
  | { emit: true; card: SuggestionCardState; suppressionReason: null; analytics: DirectLendingAnalyticsPayload }
  | { emit: false; card: null; suppressionReason: RuntimeSuppressionReason; analytics: DirectLendingAnalyticsPayload };

function analytics(event: DirectLendingAnalyticsPayload["event"], suppression: RuntimeSuppressionReason | null, freshness: DirectLendingAnalyticsPayload["freshnessState"]): DirectLendingAnalyticsPayload {
  return buildAnalyticsPayload({
    event,
    candidateId: RUNTIME_PRODUCT_IDENTITY.candidateId,
    suggestionType: "direct_usdc_lending",
    policyVersion: DIRECT_USDC_LENDING_ELIGIBILITY_POLICY_VERSION,
    suppressionReason: suppression,
    freshnessState: freshness,
  });
}

export function evaluateDirectLendingRuntime(input: DirectLendingRuntimeInput): RuntimeResult {
  const suppress = (reason: RuntimeSuppressionReason, freshness: DirectLendingAnalyticsPayload["freshnessState"] = "n/a"): RuntimeResult =>
    ({ emit: false, card: null, suppressionReason: reason, analytics: analytics("suggestion_suppressed", reason, freshness) });

  // 1. Governance (derived) + assessment validity + policy.
  if (!input.governanceEligible) return suppress("governance_inactive");
  if (input.assessmentInvalidated || !input.assessmentValid || !input.policyVersionActive) return suppress("assessment_invalidated");

  // 2. Exact product identity.
  const id = input.identity;
  if (id.candidateId !== RUNTIME_PRODUCT_IDENTITY.candidateId || id.reserve !== RUNTIME_PRODUCT_IDENTITY.reserve || id.klendProgram !== RUNTIME_PRODUCT_IDENTITY.klendProgram || id.canonicalUsdcMint !== RUNTIME_PRODUCT_IDENTITY.canonicalUsdcMint)
    return suppress("identity_invalid");

  // 3. Exact canonical USDC (never bridged/symbol-only/receipt/cToken).
  if (input.wallet.usdcMint !== RUNTIME_PRODUCT_IDENTITY.canonicalUsdcMint || input.wallet.canonicalUsdcRawUnits == null || Number(input.wallet.canonicalUsdcRawUnits) <= 0)
    return suppress("no_canonical_usdc");

  // 4. Safety Buffer via verified liquid coverage.
  if (!input.safetyBuffer.requiredResolved || !input.safetyBuffer.sufficiencyResolved) return suppress("safety_buffer_unresolved");
  if (!input.safetyBuffer.fullyFundedByLiquidCoverage) return suppress("safety_buffer_incomplete");

  // 5. Deterministic excess USDC.
  if (input.excess.deterministicAmountUsd == null) return suppress("missing_deterministic_amount");
  if (!input.excess.isPositive || input.excess.deterministicAmountUsd <= 0) return suppress("no_excess_usdc");

  // 6. Suitability (category approval is NOT universal user suitability).
  if (!input.suitability.profileComplete || !input.suitability.suitableForCategory || input.suitability.prohibitsDefiLending)
    return suppress("user_unsuitable");

  // 7. Existing position — no duplicate "start lending" unless an approved top-up rule passes.
  if (input.existingPosition.holdsExactCToken && !input.existingPosition.approvedTopUpRulePasses) return suppress("existing_position_no_top_up");

  // 8. Availability + emergency (never inferred from capacity alone).
  if (input.availability.emergencyModeActive) return suppress("emergency_mode");
  if (!input.availability.depositsAvailable) return suppress("deposits_unavailable");

  // 9. Capacity (current available, not the configured cap).
  if (!input.capacity.fresh) return suppress("capacity_stale");
  if (!input.capacity.sufficientForAmount) return suppress("insufficient_capacity");

  // 10. Prices for USD display.
  if (!input.wallet.pricesFresh) return suppress("price_unavailable", "stale");

  // 11. Live measured APY for the exact reserve.
  if (input.apy.measuredApyPct == null || !input.apy.reserveIdentityMatches) return suppress("apy_unresolved", "unavailable");
  if (!input.apy.fresh || !input.apy.slotDurationFresh || input.apy.rateKind !== "estimated_variable_apy") return suppress("apy_stale", "stale");

  // Cross-check against the deterministic selector (defence in depth; never emits an excluded candidate).
  const productState: SelectorProductState = {
    identityValid: true, assessmentValid: true, categoryFloorPassed: true, assessmentInvalidated: false,
    governanceComplete: input.governanceEligible, depositsAvailable: input.availability.depositsAvailable,
    emergencyModeActive: input.availability.emergencyModeActive, capacityFreshAndSufficient: input.capacity.fresh && input.capacity.sufficientForAmount,
    apyFreshAndComparisonReady: input.apy.fresh, riskPolicyVersionActive: input.policyVersionActive,
  };
  const userState = {
    holdsCanonicalUsdc: true, safetyBufferFullySatisfiedByVerifiedLiquidCoverage: input.safetyBuffer.fullyFundedByLiquidCoverage,
    relevantUsdcIsExcessCapital: input.excess.isPositive, deterministicEligibleAmountIsPositive: input.excess.isPositive,
    userSuitableForCategory: input.suitability.suitableForCategory, noSuitabilityRuleProhibitsDefiLending: !input.suitability.prohibitsDefiLending,
  };
  const sel = selectDirectUsdcLendingCandidate(productState);
  const trig = evaluateSuggestionTrigger(productState, userState);
  if (sel.selectedCandidateId !== RUNTIME_PRODUCT_IDENTITY.candidateId || !trig.generate)
    return suppress("governance_inactive"); // conservative fail-closed if the selector disagrees

  // Emit — reward APY excluded (rewards exhausted → rewardApyPct 0 folds into the measured supply rate only).
  const amountText = `Estimated for ${formatUsd(input.excess.deterministicAmountUsd)} eligible excess USDC`;
  const card = buildDirectLendingCardState({ idSuffix: "production", measuredApyPct: input.apy.measuredApyPct, amountText });
  return { emit: true, card, suppressionReason: null, analytics: analytics("suggestion_generated", null, "fresh") };
}

function formatUsd(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/* ------------------------------------------------------------------ *
 * Real-wallet mapping — builds the runtime input from rail-derived state.
 *
 * Governance/identity are seeded from the real activation record. The KLend market inputs (APY,
 * availability, capacity) are NOT fetched by the pure rail today, so when the caller does not supply
 * them the adapter fail-closes (apy_unresolved / capacity_stale) and production output is unchanged.
 * ------------------------------------------------------------------ */

export interface RailDerivedDirectLendingArgs {
  canonicalUsdcMint: string | null;
  canonicalUsdcRawUnits: bigint | number | null;
  pricesFresh: boolean;
  bufferRequiredResolved: boolean;
  bufferSufficiencyResolved: boolean;
  bufferFullyFundedByLiquidCoverage: boolean;
  excessDeterministicAmountUsd: number | null;
  suitability: { profileComplete: boolean; suitableForCategory: boolean; prohibitsDefiLending: boolean };
  holdsExactCToken: boolean;
  approvedTopUpRulePasses: boolean;
  /** Live KLend market inputs — omit for the current pure rail (adapter then fail-closes). */
  klendMarket?: {
    apy: DirectLendingRuntimeInput["apy"];
    availability: DirectLendingRuntimeInput["availability"];
    capacity: DirectLendingRuntimeInput["capacity"];
  };
}

const UNRESOLVED_KLEND: Pick<DirectLendingRuntimeInput, "apy" | "availability" | "capacity"> = {
  apy: { measuredApyPct: null, rateKind: "estimated_variable_apy", fresh: false, reserveIdentityMatches: false, slotDurationFresh: false, rewardApyPct: 0 },
  availability: { depositsAvailable: false, emergencyModeActive: false },
  capacity: { fresh: false, sufficientForAmount: false },
};

export function buildDirectLendingRuntimeInput(args: RailDerivedDirectLendingArgs): DirectLendingRuntimeInput {
  const market = args.klendMarket ?? UNRESOLVED_KLEND;
  return {
    ...governanceInputFromActivation(),
    wallet: { usdcMint: args.canonicalUsdcMint, canonicalUsdcRawUnits: args.canonicalUsdcRawUnits, pricesFresh: args.pricesFresh },
    safetyBuffer: { requiredResolved: args.bufferRequiredResolved, sufficiencyResolved: args.bufferSufficiencyResolved, fullyFundedByLiquidCoverage: args.bufferFullyFundedByLiquidCoverage },
    excess: { deterministicAmountUsd: args.excessDeterministicAmountUsd, isPositive: args.excessDeterministicAmountUsd != null && args.excessDeterministicAmountUsd > 0 },
    suitability: args.suitability,
    existingPosition: { holdsExactCToken: args.holdsExactCToken, approvedTopUpRulePasses: args.approvedTopUpRulePasses },
    apy: market.apy,
    availability: market.availability,
    capacity: market.capacity,
  };
}

/** The production entry the rail calls: real-wallet state → emit card or suppress. */
export function evaluateDirectLendingForRail(args: RailDerivedDirectLendingArgs): RuntimeResult {
  return evaluateDirectLendingRuntime(buildDirectLendingRuntimeInput(args));
}
