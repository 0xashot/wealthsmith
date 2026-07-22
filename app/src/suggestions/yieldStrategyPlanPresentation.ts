/**
 * yieldStrategyPlanPresentation — Step 16H-B. Deterministic card + review view models from a Step 16H-A
 * Stable Yield suggestion. FORMATTING ONLY: fixed title/description templates keyed on lane + action
 * mode, formatted amounts/APY/projections from supplied values, canonical disclosures, and a read-only
 * "Review Strategy" CTA intent. It re-evaluates nothing, selects nothing, calculates/infers no
 * amount/APY/capacity/projection, changes no plan id, decides no Top Pick, reorders nothing, and builds
 * no execution/transaction/signature. Fails closed (no view model + a diagnostic) on any contract breach.
 */
import { formatUsd } from "../wallet/walletSummary";
import type { EngineSuggestion } from "./engineTypes";
import type { StableYieldPlanSuggestionMeta, StableYieldSuggestionApyProvenance } from "./yieldStrategyPlanSuggestionTypes";
import {
  YIELD_STRATEGY_PRESENTATION_POLICY_ID,
  YIELD_STRATEGY_PRESENTATION_POLICY_VERSION,
  YIELD_STRATEGY_PRESENTATION_SCHEMA_VERSION,
  type StableYieldApyPresentation,
  type StableYieldCapacityPresentation,
  type StableYieldCardPresentation,
  type StableYieldCtaPresentation,
  type StableYieldPresentationDiagnostic,
  type StableYieldPresentationValidationResult,
  type StableYieldReviewPresentation,
  type StableYieldReviewRow,
} from "./yieldStrategyPlanPresentationTypes";

export const YIELD_STRATEGY_PRESENTATION_EXISTS = true;

/* ------------------------------------------------------------------ *
 * Canonical deterministic copy (approved; no LLM, no component-side concatenation of finance).
 * ------------------------------------------------------------------ */
export const STABLE_YIELD_READ_ONLY_DISCLOSURE = "WealthSmith is providing a read-only recommendation and cannot move your funds.";
export const STABLE_YIELD_EXTERNAL_MANAGEMENT_DISCLOSURE = "You will manage this position yourself, directly with the protocol.";
export const STABLE_YIELD_YIELD_CHANGE_DISCLOSURE = "Yield rates can change over time.";
export const STABLE_YIELD_PROTOCOL_RISK_DISCLOSURE = "This strategy may involve protocol and smart-contract risk.";
export const STABLE_YIELD_APY_UNAVAILABLE_DISPLAY = "APY unavailable";

const CTA: StableYieldCtaPresentation = { label: "Review", intent: "open_stable_yield_review", executesTransaction: false, requiresWalletSignature: false, opensExternalUrl: false, completionOnClick: false };

/** Deterministic title by lane + action mode, naming the selected protocol (no hype, no promises). */
export function stableYieldTitle(lane: "buffer" | "excess", actionMode: "start_new_position" | "add_to_existing_strategy", protocol: string): string {
  if (lane === "excess") return actionMode === "start_new_position" ? `Put Excess USDC on ${protocol}` : `Add to Your ${protocol} Strategy`;
  return actionMode === "start_new_position" ? `Put Buffer Funds on ${protocol}` : `Add to Your ${protocol} Position`;
}

/** Longest product name the card description shows inline; longer names fall back to a generic phrase so the
 *  card never overflows (the full name still appears in the review modal). */
const STABLE_YIELD_CARD_PRODUCT_MAX = 40;
function cardProductName(product: string): string {
  return product.length <= STABLE_YIELD_CARD_PRODUCT_MAX ? product : "selected stable yield";
}

/** Deterministic single-reason card description (amount is shown separately as the card's impact metric). */
function cardDescription(lane: "buffer" | "excess", actionMode: "start_new_position" | "add_to_existing_strategy", product: string): string {
  const p = cardProductName(product);
  if (lane === "excess") {
    return actionMode === "start_new_position"
      ? `Your direct-wallet USDC above the required Safety Buffer is eligible for the ${p} strategy.`
      : `You already hold ${p}. Eligible direct-wallet USDC could be added to your existing position.`;
  }
  return actionMode === "start_new_position"
    ? `Eligible buffer funds could earn yield through the ${p} while keeping your required Safety Buffer covered.`
    : `Eligible buffer funds could be added to your existing ${p} position while keeping your required Safety Buffer covered.`;
}

/** Longest protocol name shown inline in the review summary; longer names fall back to a generic phrase. */
const STABLE_YIELD_REVIEW_PROTOCOL_MAX = 30;
/** Approved official app URLs by protocol (from the yield-strategy registry); read-only handoff only. */
const STABLE_YIELD_PROTOCOL_APP_URLS: Record<string, string> = { kamino: "https://app.kamino.finance" };
/** USD with thousands separators; whole amounts drop the ".00", otherwise cents are kept (e.g. "$1,234.56"). */
function formatUsdTrim(usd: number): string {
  return Number.isInteger(usd)
    ? `$${usd.toLocaleString("en-US")}`
    : `$${usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Deterministic plain-language review summary. */
function reviewSummary(lane: "buffer" | "excess", actionMode: "start_new_position" | "add_to_existing_strategy", amt: string, product: string, protocol: string): string {
  const base = lane === "excess"
    ? `${amt} of your direct-wallet USDC is above your required Safety Buffer.`
    : `${amt} of your direct-wallet USDC is eligible for yield while keeping your required Safety Buffer covered.`;
  const productPhrase = product.length <= STABLE_YIELD_CARD_PRODUCT_MAX ? `${product} position` : "position in the selected stable yield strategy";
  const protocolPhrase = protocol.length <= STABLE_YIELD_REVIEW_PROTOCOL_MAX ? protocol : "the selected protocol";
  const dest = actionMode === "add_to_existing_strategy"
    ? `You can review adding it to your existing ${productPhrase} on ${protocolPhrase}.`
    : `You can review opening a new ${productPhrase} on ${protocolPhrase}.`;
  return `${base} ${dest}`;
}

function positionStatusLabel(status: string): string {
  if (status === "leader_held") return "You currently hold this strategy.";
  if (status === "leader_held_multiple_positions") return "You hold this strategy across multiple accounts.";
  return "No matching position was detected.";
}

/** APY presentation — supplied values only; missing APY → the canonical unavailable state. */
export function stableYieldApyPresentation(apy?: StableYieldSuggestionApyProvenance): StableYieldApyPresentation {
  const val = apy ? apy.netApyPct ?? apy.grossApyPct : undefined;
  if (!apy || typeof val !== "number" || !Number.isFinite(val)) return { state: "unavailable", display: STABLE_YIELD_APY_UNAVAILABLE_DISPLAY };
  const state = apy.provenanceKind === "live_protocol_api" ? "live_protocol_api" : apy.provenanceKind === "approved_fallback" ? "approved_fallback" : "provided";
  return {
    state,
    display: `${val.toFixed(2)}%`,
    ...(apy.sourceLabel ? { sourceLabel: apy.sourceLabel } : {}),
    ...(apy.checkedAt ? { checkedAtNote: `As of ${apy.checkedAt}` } : {}),
    ...(apy.apyDefinition ? { definitionLabel: apy.apyDefinition } : {}),
  };
}

/** Capacity presentation for a READY plan (only two modes are valid; else null → fail closed). */
export function stableYieldCapacityPresentation(mode: string, effectiveProductCapacityUsd: number, effectiveMaximumUsd: number): StableYieldCapacityPresentation | null {
  if (mode === "explicit_remaining_capacity") return { mode: "explicit_remaining_capacity", boundDisplay: formatUsd(effectiveProductCapacityUsd), boundUsd: effectiveProductCapacityUsd, note: "Room remains for new deposits at the source." };
  if (mode === "verified_uncapped") return { mode: "verified_uncapped", boundDisplay: formatUsd(effectiveMaximumUsd), boundUsd: effectiveMaximumUsd, note: "No current product cap; your eligible amount is the limit." };
  return null;
}

export interface StableYieldPlanPresentationResult {
  card: StableYieldCardPresentation | null;
  review: StableYieldReviewPresentation | null;
  diagnostic: StableYieldPresentationDiagnostic;
}

/** Build the deterministic card + review presentation. Fails closed with a diagnostic on any breach. */
export function buildStableYieldPlanPresentation(suggestion: EngineSuggestion | null | undefined): StableYieldPlanPresentationResult {
  const fail = (stage: StableYieldPresentationDiagnostic["failureStage"], reason: string, extra: Partial<StableYieldPresentationDiagnostic> = {}): StableYieldPlanPresentationResult => ({
    card: null,
    review: null,
    diagnostic: { emitted: false, failureStage: stage, failureReason: reason, ctaIntent: "none", containsExecutionIntent: false, ...extra },
  });

  if (!suggestion || typeof suggestion !== "object") return fail("input_missing", "no_suggestion");
  const meta = suggestion.stableYieldPlan;
  if (!meta) return fail("input_missing", "missing_stable_yield_plan_meta", { suggestionId: suggestion.id, missingField: "stableYieldPlan" });

  // Fail-closed structural + presentation checks. (NOT the 16H-A `validateStableYieldPlanSuggestion`,
  // which requires is_top_pick === false — valid for a freshly-built suggestion, but the engine legitimately
  // sets is_top_pick = true after Top Pick, and that post-engine suggestion is exactly what we present.)
  const presV = validateStableYieldPlanPresentationInput(suggestion);
  if (!presV.valid) return fail("validation", presV.errors.join("/"), { suggestionId: suggestion.id, sourcePlanId: meta.sourcePlanId, lane: meta.lane, actionMode: meta.actionMode });

  // Capacity contract: a ready plan may only carry the two supported capacity modes.
  const capacity = stableYieldCapacityPresentation(meta.capacityMode, meta.effectiveProductCapacityUsd, meta.effectiveMaximumUsd);
  if (!capacity) return fail("capacity_contract", `unsupported_capacity_mode:${meta.capacityMode}`, { suggestionId: suggestion.id, sourcePlanId: meta.sourcePlanId, capacityMode: meta.capacityMode });

  const amt = formatUsd(meta.amountUsd);
  const title = stableYieldTitle(meta.lane, meta.actionMode, meta.protocolDisplayName);
  const cardDesc = cardDescription(meta.lane, meta.actionMode, meta.displayName);
  const apy = stableYieldApyPresentation(meta.apy);
  const tag = meta.lane === "buffer" ? "Safety Buffer Yield" : "Excess USDC Yield";
  // Estimated annual income chip: eligible amount × sourced APY. Only when a real APY is available (never
  // invented). Rounded to whole dollars; the APY display keeps its canonical precision.
  const apyVal = meta.apy ? (meta.apy.netApyPct ?? meta.apy.grossApyPct) : undefined;
  const annualIncomeUsd = apy.state !== "unavailable" && typeof apyVal === "number" && Number.isFinite(apyVal) && meta.amountUsd > 0
    ? Math.round((meta.amountUsd * apyVal) / 100)
    : undefined;
  const apyIncomeChip = annualIncomeUsd !== undefined ? `+$${annualIncomeUsd.toLocaleString("en-US")}/year (${apy.display} APY)` : undefined;
  const estimatedEarningsDisplay = annualIncomeUsd !== undefined ? `+$${annualIncomeUsd.toLocaleString("en-US")}/year` : undefined;

  const card: StableYieldCardPresentation = {
    schemaVersion: YIELD_STRATEGY_PRESENTATION_SCHEMA_VERSION,
    policyId: YIELD_STRATEGY_PRESENTATION_POLICY_ID,
    policyVersion: YIELD_STRATEGY_PRESENTATION_POLICY_VERSION,
    presentationType: "stable_yield_plan_card",
    suggestionId: suggestion.id,
    sourcePlanId: meta.sourcePlanId,
    title,
    description: cardDesc,
    tag,
    categoryLabel: "Stable Yield",
    lane: meta.lane,
    actionMode: meta.actionMode,
    amountDisplay: amt,
    amountUsd: meta.amountUsd,
    amountCents: meta.amountCents,
    assetSymbol: "USDC",
    protocolName: meta.protocolDisplayName,
    productDisplayName: meta.displayName,
    apy,
    ...(apyIncomeChip ? { apyIncomeChip } : {}),
    isTopPick: suggestion.is_top_pick === true,
    actionable: true,
    actionKind: "review_only",
    cta: CTA,
    accessibilityLabel: `${title}. ${cardDesc} Read-only recommendation. Review.`,
    readOnly: true,
    externalManagementRequired: true,
  };

  const p = meta.projection;
  const rows: StableYieldReviewRow[] = [
    { label: "Amount to review", valueDisplay: amt, rawUsd: meta.amountUsd },
    { label: "Funding source", valueDisplay: "Direct wallet USDC" },
    { label: "Strategy", valueDisplay: meta.displayName },
    { label: "Protocol", valueDisplay: meta.protocolDisplayName },
    { label: "APY", valueDisplay: apy.display },
    { label: "Wallet USDC before", valueDisplay: formatUsd(p.directLiquidUsdcBeforeUsd), rawUsd: p.directLiquidUsdcBeforeUsd },
    { label: "Wallet USDC after", valueDisplay: formatUsd(p.directLiquidUsdcAfterUsd), rawUsd: p.directLiquidUsdcAfterUsd },
    { label: "Required Safety Buffer", valueDisplay: formatUsd(p.requiredBufferUsd), rawUsd: p.requiredBufferUsd },
    { label: "Eligible buffer before", valueDisplay: formatUsd(p.currentEligibleBufferBeforeUsd), rawUsd: p.currentEligibleBufferBeforeUsd },
    { label: "Eligible buffer after", valueDisplay: formatUsd(p.currentEligibleBufferAfterUsd), rawUsd: p.currentEligibleBufferAfterUsd },
    { label: "Deposit capacity", valueDisplay: capacity.boundDisplay, rawUsd: capacity.boundUsd },
  ];

  const review: StableYieldReviewPresentation = {
    schemaVersion: YIELD_STRATEGY_PRESENTATION_SCHEMA_VERSION,
    policyId: YIELD_STRATEGY_PRESENTATION_POLICY_ID,
    policyVersion: YIELD_STRATEGY_PRESENTATION_POLICY_VERSION,
    presentationType: "stable_yield_plan_review",
    suggestionId: suggestion.id,
    sourcePlanId: meta.sourcePlanId,
    title,
    summary: reviewSummary(meta.lane, meta.actionMode, formatUsdTrim(meta.amountUsd), meta.displayName, meta.protocolDisplayName),
    lane: meta.lane,
    actionMode: meta.actionMode,
    amountDisplay: amt,
    amountUsd: meta.amountUsd,
    amountCents: meta.amountCents,
    fundingSource: "direct_wallet_usdc",
    fundingSourceLabel: "Direct wallet USDC",
    strategyId: meta.strategyId,
    productDisplayName: meta.displayName,
    protocolId: meta.protocolId,
    protocolName: meta.protocolDisplayName,
    productAddress: meta.productAddress,
    apy,
    currentPositionContext: {
      actionMode: meta.actionMode,
      held: meta.actionMode === "add_to_existing_strategy",
      positionStatusLabel: positionStatusLabel(meta.leaderPositionStatus),
    },
    walletUsdcBeforeDisplay: formatUsd(p.directLiquidUsdcBeforeUsd),
    walletUsdcAfterDisplay: formatUsd(p.directLiquidUsdcAfterUsd),
    walletUsdcBeforeUsd: p.directLiquidUsdcBeforeUsd,
    walletUsdcAfterUsd: p.directLiquidUsdcAfterUsd,
    requiredBufferDisplay: formatUsd(p.requiredBufferUsd),
    requiredBufferUsd: p.requiredBufferUsd,
    bufferBeforeDisplay: formatUsd(p.currentEligibleBufferBeforeUsd),
    bufferAfterDisplay: formatUsd(p.currentEligibleBufferAfterUsd),
    bufferBeforeUsd: p.currentEligibleBufferBeforeUsd,
    bufferAfterUsd: p.currentEligibleBufferAfterUsd,
    bufferCoveragePreserved: p.bufferCoveragePreserved,
    walletFloorPreserved: p.walletFloorPreserved,
    capacity,
    effectiveMinimumDisplay: formatUsd(meta.effectiveMinimumUsd),
    effectiveMaximumDisplay: formatUsd(meta.effectiveMaximumUsd),
    policyVersions: { plan: meta.planPolicyVersion, capacity: YIELD_STRATEGY_PRESENTATION_POLICY_VERSION, suggestion: meta.suggestionPolicyVersion, presentation: YIELD_STRATEGY_PRESENTATION_POLICY_VERSION },
    disclosures: [STABLE_YIELD_READ_ONLY_DISCLOSURE, STABLE_YIELD_EXTERNAL_MANAGEMENT_DISCLOSURE, STABLE_YIELD_YIELD_CHANGE_DISCLOSURE, STABLE_YIELD_PROTOCOL_RISK_DISCLOSURE],
    readOnly: true,
    externalManagementRequired: true,
    cta: CTA,
    ...(STABLE_YIELD_PROTOCOL_APP_URLS[meta.protocolId]
      ? { externalLink: { label: `Open ${meta.protocolDisplayName}`, url: STABLE_YIELD_PROTOCOL_APP_URLS[meta.protocolId], opensInNewTab: true, ctaLabel: "Deposit USDC" } }
      : {}),
    ...(estimatedEarningsDisplay ? { estimatedEarningsDisplay } : {}),
    rows,
  };

  return {
    card,
    review,
    diagnostic: {
      emitted: true,
      suggestionId: suggestion.id,
      sourcePlanId: meta.sourcePlanId,
      failureStage: "none",
      lane: meta.lane,
      actionMode: meta.actionMode,
      apyState: apy.state,
      capacityMode: meta.capacityMode,
      ctaIntent: "open_stable_yield_review",
      containsExecutionIntent: false,
    },
  };
}

/** Presentation-specific fail-closed checks beyond the 16H-A structural validator. */
export function validateStableYieldPlanPresentationInput(suggestion: unknown): StableYieldPresentationValidationResult {
  const errors: string[] = [];
  if (!suggestion || typeof suggestion !== "object") return { valid: false, errors: ["not_an_object"] };
  const s = suggestion as EngineSuggestion;
  if (s.category !== "stable_yield") errors.push("wrong_category");
  if (typeof s.id !== "string" || !s.id.startsWith("sy_plan_")) errors.push("wrong_id_prefix");
  if (!Array.isArray(s.reason_codes) || s.reason_codes.length !== 1) errors.push("reason_not_singular");
  if (s.action_kind !== "review_only") errors.push("action_kind_not_review_only");
  if (s.is_actionable !== true) errors.push("not_actionable");
  const m: StableYieldPlanSuggestionMeta | undefined = s.stableYieldPlan;
  if (!m) return { valid: false, errors: [...errors, "missing_meta"] };
  if (!m.sourcePlanId || !s.id.endsWith(m.sourcePlanId)) errors.push("missing_or_mismatched_source_plan_id");
  if (m.lane !== "buffer" && m.lane !== "excess") errors.push("invalid_lane");
  if (m.actionMode !== "start_new_position" && m.actionMode !== "add_to_existing_strategy") errors.push("invalid_action_mode");
  if (!(typeof m.amountUsd === "number" && m.amountUsd > 0)) errors.push("non_positive_amount");
  if (m.amountCents !== Math.round(m.amountUsd * 100)) errors.push("amount_cents_usd_disagree");
  if (m.fundingSource !== "direct_wallet_usdc") errors.push("invalid_funding_source");
  if (!m.strategyId || !m.displayName) errors.push("missing_product_identity");
  if (!m.protocolId || !m.protocolDisplayName) errors.push("missing_protocol_identity");
  if (!m.productAddress) errors.push("missing_product_address");
  const p = m.projection;
  if (!p || typeof p.currentEligibleBufferAfterUsd !== "number" || typeof p.directLiquidUsdcAfterUsd !== "number" || typeof p.requiredBufferUsd !== "number") errors.push("missing_projection_fields");
  else if (p.bufferCoveragePreserved !== true || p.walletFloorPreserved !== true) errors.push("projection_violates_buffer_contract");
  if (m.readOnly !== true) errors.push("read_only_false");
  if (m.externalManagementRequired !== true) errors.push("external_management_false");
  const execOff = m.transactionsEnabled === false && m.transactionBuilt === false && m.executionPrepared === false && m.walletSignatureRequired === false && m.updatesProductOutput === false;
  if (!execOff) errors.push("execution_flag_present");
  // NOTE: the capacity-mode contract is enforced at the dedicated `capacity_contract` stage in
  // buildStableYieldPlanPresentation (a ready suggestion may only carry the two supported modes).
  return { valid: errors.length === 0, errors };
}
