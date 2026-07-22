/**
 * yieldStrategyPlanPresentationTypes — Step 16H-B. The versioned, deterministic PRESENTATION contracts
 * for a Step 16H-A Stable Yield suggestion: a compact card view model and a fuller review view model.
 * These define EXACTLY what future UI components may render. FORMATTING only — no financial calculation,
 * no re-evaluation, no product/lane/amount/APY/capacity inference, no execution/transaction/signature.
 * The Step 16H-A suggestion + its `stableYieldPlan` metadata are the sole source of truth.
 */
export const YIELD_STRATEGY_PRESENTATION_SCHEMA_VERSION = "1.0.0";
export const YIELD_STRATEGY_PRESENTATION_POLICY_ID = "yield_strategy_presentation_v1";
export const YIELD_STRATEGY_PRESENTATION_POLICY_VERSION = "1.0.0";

/** APY presentation state — never inferred; "provided" = present without a declared source class. */
export type StableYieldApyPresentationState = "live_protocol_api" | "approved_fallback" | "provided" | "unavailable";

export interface StableYieldApyPresentation {
  state: StableYieldApyPresentationState;
  /** Formatted APY (e.g. "5.20%") or the canonical unavailable string. */
  display: string;
  /** Present only when supplied upstream. */
  sourceLabel?: string;
  /** Present only when supplied upstream (kept for the review surface, not forced onto the card). */
  checkedAtNote?: string;
  definitionLabel?: string;
}

/** Capacity presentation — only the two modes a READY plan may carry. Never renders "unlimited". */
export type StableYieldCapacityPresentationMode = "explicit_remaining_capacity" | "verified_uncapped";

export interface StableYieldCapacityPresentation {
  mode: StableYieldCapacityPresentationMode;
  boundDisplay: string;
  boundUsd: number;
  note: string;
}

/** Read-only, non-execution CTA. `intent` identifies a FUTURE internal review surface — never a URL. */
export interface StableYieldCtaPresentation {
  label: "Review";
  intent: "open_stable_yield_review";
  executesTransaction: false;
  requiresWalletSignature: false;
  opensExternalUrl: false;
  completionOnClick: false;
}

export interface StableYieldCardPresentation {
  schemaVersion: "1.0.0";
  policyId: string;
  policyVersion: "1.0.0";
  presentationType: "stable_yield_plan_card";

  suggestionId: string;
  sourcePlanId: string;

  title: string;
  description: string;
  tag: string;
  categoryLabel: "Stable Yield";

  lane: "buffer" | "excess";
  actionMode: "start_new_position" | "add_to_existing_strategy";

  amountDisplay: string;
  amountUsd: number;
  amountCents: number;
  assetSymbol: "USDC";

  protocolName: string;
  productDisplayName: string;

  apy: StableYieldApyPresentation;
  /** Estimated annual income chip label (e.g. "+$170/year (5.20% APY)"); absent when APY is unavailable. */
  apyIncomeChip?: string;

  isTopPick: boolean;
  actionable: true;
  actionKind: "review_only";
  cta: StableYieldCtaPresentation;
  accessibilityLabel: string;

  readOnly: true;
  externalManagementRequired: true;
}

export interface StableYieldReviewRow {
  label: string;
  valueDisplay: string;
  rawUsd?: number;
}

export interface StableYieldReviewPresentation {
  schemaVersion: "1.0.0";
  policyId: string;
  policyVersion: "1.0.0";
  presentationType: "stable_yield_plan_review";

  suggestionId: string;
  sourcePlanId: string;

  title: string;
  summary: string;

  lane: "buffer" | "excess";
  actionMode: "start_new_position" | "add_to_existing_strategy";

  amountDisplay: string;
  amountUsd: number;
  amountCents: number;

  fundingSource: "direct_wallet_usdc";
  fundingSourceLabel: string;

  strategyId: string;
  productDisplayName: string;
  protocolId: string;
  protocolName: string;
  productAddress: string;

  apy: StableYieldApyPresentation;

  currentPositionContext: {
    actionMode: "start_new_position" | "add_to_existing_strategy";
    held: boolean;
    positionStatusLabel: string;
  };

  walletUsdcBeforeDisplay: string;
  walletUsdcAfterDisplay: string;
  walletUsdcBeforeUsd: number;
  walletUsdcAfterUsd: number;

  requiredBufferDisplay: string;
  requiredBufferUsd: number;
  bufferBeforeDisplay: string;
  bufferAfterDisplay: string;
  bufferBeforeUsd: number;
  bufferAfterUsd: number;
  bufferCoveragePreserved: boolean;
  walletFloorPreserved: boolean;

  capacity: StableYieldCapacityPresentation;

  effectiveMinimumDisplay: string;
  effectiveMaximumDisplay: string;

  policyVersions: { plan: string; capacity: string; suggestion: string; presentation: string };

  disclosures: string[];
  readOnly: true;
  externalManagementRequired: true;

  cta: StableYieldCtaPresentation;

  /** Read-only handoff to the protocol's own app (approved official URL); absent for an unknown protocol. */
  externalLink?: { label: string; url: string; opensInNewTab: boolean; ctaLabel: string };
  /** Estimated annual income (amount × sourced APY), e.g. "+$34/year"; absent when APY is unavailable. */
  estimatedEarningsDisplay?: string;

  rows: StableYieldReviewRow[];
}

export type StableYieldPresentationFailureStage = "input_missing" | "validation" | "capacity_contract" | "none";

export interface StableYieldPresentationDiagnostic {
  emitted: boolean;
  suggestionId?: string;
  sourcePlanId?: string;
  failureStage: StableYieldPresentationFailureStage;
  failureReason?: string;
  missingField?: string;
  invalidField?: string;
  lane?: "buffer" | "excess";
  actionMode?: "start_new_position" | "add_to_existing_strategy";
  apyState?: StableYieldApyPresentationState;
  capacityMode?: string;
  ctaIntent: "open_stable_yield_review" | "none";
  containsExecutionIntent: false;
}

export interface StableYieldPresentationValidationResult {
  valid: boolean;
  errors: string[];
}
