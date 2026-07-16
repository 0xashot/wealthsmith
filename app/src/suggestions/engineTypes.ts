/**
 * engineTypes — CANONICAL output contract of the deterministic Suggestion
 * Engine MVP (Step 2: contracts only, no logic).
 *
 * This file resolves the schema divergence between the three documented shapes:
 *   - rules/suggestion-engine-rules.md   (suggestion data contract)
 *   - content/suggestion-card-copy.md    (engine → copy input shape)
 *   - app/src/types/dashboard.ts         (SuggestionCardState — UI rendering)
 *
 * EngineSuggestion below is the single canonical ENGINE output. The UI's
 * SuggestionCardState remains a separate RENDERING type; a mapper
 * (engine output → card copy → SuggestionCardState) will be added in a later
 * step. Engine files must never import UI components or demo fixtures
 * (rules/suggestion-engine-rules.md — demo and real suggestions stay separate).
 *
 * The engine is deterministic product logic: same inputs → same output.
 * No AI creates, ranks, or modifies suggestions. Smith AI may EXPLAIN engine
 * output later, using reason codes — it never generates suggestions.
 *
 * Implemented scope: Top Up Safety Buffer, Rebalance (bucket-level), Capital
 * Efficiency, Trim, Staking, Stable Yield, DCA, Position Optimization, and the
 * On Track state. Top Pick selection (top-pick-rules.md) runs after the core
 * suggestions and only ever marks `is_top_pick` on engine output.
 */
import type { SolStakingSelectorPresentation } from "./solStakingSelectorPresentationTypes";
import type { StableYieldPlanSuggestionMeta } from "./yieldStrategyPlanSuggestionTypes";

/**
 * Suggestion categories. All are IMPLEMENTED with trigger logic (Steps 3–9H);
 * `buffer` and `rebalance` head the top-pick priority hierarchy (Buffer Actions
 * > Rebalance > …) and `on_track` is informational and never Top Pick. See
 * CATEGORY_PRIORITY (topPick.ts) for the full ordering.
 */
export type SuggestionCategory =
  | "buffer"
  | "rebalance"
  | "capital_efficiency"
  | "trim"
  | "staking"
  | "stable_yield"
  | "dca"
  | "position_optimization"
  | "on_track";

/**
 * Machine-readable reason codes (rules/suggestion-engine-rules.md — Reason
 * Codes). These are the ONLY reasons the engine may emit; UI/Smith AI must not
 * create new ones. Copy templates and Smith AI explanations key off these.
 *
 * All reason codes are emitted by their category rules (including
 * `duplicate_exposure` — Position Optimization, Step 12A).
 */
export type SuggestionReasonCode =
  // Implemented (MVP)
  | "buffer_low"
  | "crypto_overweight"
  | "crypto_underweight"
  | "portfolio_aligned"
  | "missing_data"
  | "below_min_size"
  | "partial_pricing"
  // capital_efficiency (contracted)
  | "idle_assets"
  | "idle_crypto"
  | "idle_stables"
  | "excess_cash_like_assets"
  // staking (contracted)
  | "idle_sol"
  | "sol_not_staked"
  | "liquid_sol_available"
  // stable_yield (contracted)
  | "stable_excess_above_buffer"
  | "stable_yield_available"
  | "conservative_yield_candidate"
  | "buffer_eligible_stable_yield"
  // stable_yield — plan-backed (Step 16H-A: converted from a Step 16G ready plan; singular per lane)
  | "stable_yield_buffer_lane_ready"
  | "stable_yield_excess_lane_ready"
  // dca (contribution-funded gradual entry)
  | "crypto_underweight_for_dca"
  | "planned_contribution_available"
  | "gradual_entry_candidate"
  // trim (long-tail / non-core liquid token review)
  | "long_tail_exposure"
  | "non_core_token_exposure"
  | "token_concentration_review"
  | "small_position_cleanup"
  | "liquidity_not_evaluated"
  // position_optimization (contracted)
  | "low_yield_position"
  | "missing_apy_data"
  | "duplicate_exposure"
  | "concentration_risk"
  | "unsupported_protocol_review"
  // contribution / plan-backed DCA (Step 15H — deterministic contribution-plan pipeline)
  | "stable_target_underweight"
  | "growth_target_underweight"
  | "stale_price"
  | "unavailable_price"
  | "stale_liquidity"
  | "liquidity_unknown"
  | "explicit_amount_required"
  | "multiple_targets"
  | "invalid_data";

/**
 * What the suggestion offers the user in MVP.
 *  - review_only:    actionable review step; MVP click behavior is at most an
 *                    approved external protocol page in a new tab — NEVER a
 *                    transaction, signature, or fund movement.
 *  - informational:  explains a condition (e.g. On Track); no CTA.
 *  - disabled:       condition exists but action is blocked (e.g. below the
 *                    minimum suggestion size); must say why via reason codes.
 */
export type SuggestionActionKind = "review_only" | "informational" | "disabled";

/**
 * Guardrail evaluation status. `not_evaluated` is the HONEST state for
 * guardrails whose data does not exist in the app yet (cost, liquidity,
 * slippage — no quote/route infrastructure). Never invented, never silently
 * treated as passed.
 */
export type GuardrailStatus =
  | "passed"
  | "failed"
  | "warning"
  | "not_evaluated"
  // The guardrail does not apply to this suggestion (e.g. an informational
  // On Track card proposes no action, so execution guardrails don't apply).
  | "not_applicable";

/**
 * MVP guardrails (top-pick-rules.md — Guardrails). Evaluable today:
 * min_trade_size, buffer_protection, pricing_available, allocation_delta.
 * Not evaluable today (no data source): cost_available, liquidity_available,
 * slippage_available — these must be reported as `not_evaluated`.
 */
export type GuardrailCode =
  | "min_trade_size"
  | "buffer_protection"
  | "pricing_available"
  | "allocation_delta"
  // capital_efficiency: idle assets clear the value/share thresholds.
  | "idle_asset_threshold"
  // trim: which non-core token scope / concentration checks were evaluated.
  | "token_scope"
  // dca: a planned contribution exists and there is an allocation gap to close.
  | "contribution_available"
  | "allocation_gap"
  | "token_selection"
  // staking: a small SOL balance is kept back for network fees.
  | "sol_fee_reserve"
  // position_optimization: which review conditions were evaluated.
  | "position_value_threshold"
  | "apy_data_review"
  | "concentration_review"
  // position_optimization: deployed positions were deterministically grouped by
  // underlying exposure (for duplicate-exposure review).
  | "exposure_grouping"
  // deferred until a deterministic platform-selection rule exists.
  | "protocol_selection"
  | "cost_available"
  | "liquidity_available"
  | "slippage_available";

export interface SuggestionGuardrail {
  code: GuardrailCode;
  status: GuardrailStatus;
  /** Optional structured note (e.g. which threshold failed). Not display copy. */
  message?: string;
}

/**
 * Deterministic ranking scores (top-pick-rules.md — Impact/Urgency/Efficiency,
 * each 0–1). Computed by approved formulas only; the UI never calculates them.
 * `efficiency` is null in MVP (its inputs — cost/liquidity/slippage — are not
 * evaluated), so ties break on impact then urgency.
 */
export interface SuggestionScore {
  impact: number;
  urgency: number;
  efficiency?: number | null;
}

/** A sourced USD amount (e.g. buffer shortfall). Never invented or estimated. */
export interface SuggestionAmount {
  valueUsd: number;
  /** Preformatted display, e.g. "$800". Formatting only — no new meaning. */
  label?: string;
}

/**
 * Asset reference for a suggestion's from/to sides. MVP Rebalance is
 * BUCKET-LEVEL (approved MVP decision): `bucket` is set, `symbol`/`mint` are
 * omitted. Token-level sell/buy selection requires a later approved
 * token-selection rule.
 */
export interface SuggestionAssetRef {
  symbol?: string;
  mint?: string;
  bucket?: "crypto" | "stables";
}

/**
 * Protocol / platform selection (Step 9J — CONTRACTS ONLY). Structured metadata
 * describing whether a suggestion has (or could ever have) a specific protocol
 * chosen to carry it out. Real selection stays `not_evaluated` until reliable,
 * deterministic data sources exist (APY, TVL, risk, liquidity, lockup, fees,
 * route). The engine NEVER invents a protocol, APY, TVL, risk score, audit
 * status, or lockup timing.
 *
 *  - not_evaluated:  selection is RELEVANT but no data source exists yet (e.g.
 *                    staking / stable yield — a protocol WILL be chosen once
 *                    real data is wired in).
 *  - not_applicable: selection does not apply to this suggestion at all (e.g. a
 *                    "review your existing positions / idle assets" card
 *                    proposes no new protocol).
 *  - unavailable:    selection was attempted but no eligible protocol / required
 *                    data was found. RESERVED — not emitted yet.
 *  - selected:       a protocol was deterministically chosen from real data.
 *                    RESERVED — not emitted yet.
 */
export type ProtocolSelectionStatus =
  | "not_evaluated"
  | "not_applicable"
  | "unavailable"
  | "selected";

/** Machine-readable reasons for a protocol-selection status (never display copy). */
export type ProtocolSelectionReason =
  | "missing_apy_data"
  | "missing_tvl_data"
  | "missing_risk_data"
  | "missing_liquidity_data"
  | "missing_lockup_data"
  | "unsupported_asset"
  | "no_eligible_protocol"
  | "selection_not_required"
  | "deterministic_selection_available";

/** Strategy family a selected protocol would implement. */
export type ProtocolStrategyType =
  | "staking"
  | "liquid_staking"
  | "lending"
  | "vault"
  | "lp"
  | "review";

/**
 * Protocol/platform selection record attached to a suggestion. INVARIANT:
 * `selectedProtocolId` / `selectedProtocolName` are present ONLY when
 * `status === "selected"` — the constructors in `protocolSelection.ts` enforce
 * this, and no rule sets `selected` until real data-backed selection exists.
 */
export interface ProtocolSelection {
  status: ProtocolSelectionStatus;
  /** Present ONLY when status === "selected". */
  selectedProtocolId?: string;
  /** Present ONLY when status === "selected". */
  selectedProtocolName?: string;
  /** LST symbol of the selected liquid-staking protocol (only when selected). */
  selectedLstSymbol?: string;
  selectedStrategyType?: ProtocolStrategyType;
  reasons: ProtocolSelectionReason[];
  /**
   * Static protocol-registry candidate IDs (Step 12C). METADATA ONLY — a
   * candidate list is NOT a recommendation and NOT a selection: it is never
   * ranked/scored, never surfaced in the UI, and only present while `status`
   * is `not_evaluated`. Real selection sets `selectedProtocolId/Name` instead.
   */
  candidateProtocolIds?: string[];
  /** ISO timestamp of a real evaluation (only when data was actually consulted). */
  evaluatedAt?: string;
  /** Identifiers of the data sources consulted (only when actually consulted). */
  dataSources?: string[];
}

/**
 * Structured Suggestion Review Details (Step 10A — data model only; NO drawer
 * UI yet). Deterministic explanation of WHY a suggestion fired, WHICH assets/
 * positions are involved, WHAT was measured, WHICH guardrails were (and were
 * not) evaluated, and WHAT WealthSmith will not do. Every string is approved /
 * templated — never AI-generated, never invents APY/TVL/risk/liquidity/
 * slippage/route/protocol data. The card mapper does NOT surface this.
 */
export type ReviewMetricKind =
  | "allocation_pct"
  | "amount_usd"
  | "count"
  | "months"
  | "token_amount"
  | "percent";

export interface ReviewMetric {
  label: string;
  value: string | number;
  unit?: string;
  kind: ReviewMetricKind;
}

export type ReviewAssetRole =
  | "source_asset"
  | "target_bucket"
  | "idle_asset"
  | "long_tail_asset"
  | "stablecoin"
  | "liquid_sol"
  | "buffer_asset"
  | "dca_source";

export interface ReviewAsset {
  symbol: string;
  name?: string;
  valueUsd?: number;
  amount?: number;
  role: ReviewAssetRole;
}

export type ReviewPositionRole =
  | "yield_position"
  | "staked_position"
  | "concentrated_position"
  | "missing_apy_position"
  | "low_yield_position"
  | "duplicate_exposure_position";

export interface ReviewPosition {
  protocol?: string;
  /** Detected position/vault display name (e.g. "Steakhouse USDC"). Never invented. */
  name?: string;
  symbol?: string;
  valueUsd?: number;
  /** Sourced APY only; null means "not reported" — never an invented number. */
  apy?: number | null;
  role: ReviewPositionRole;
  reason?: string;
}

export interface ReviewCalculation {
  label: string;
  /** Short human formula (e.g. "target − current"). Not a computed value. */
  formula?: string;
  currentValue?: number;
  targetValue?: number;
  difference?: number;
  threshold?: number;
  unit?: string;
}

/** Guardrails grouped into drawer-ready, user-facing labels (never raw codes). */
export interface ReviewGuardrailSummary {
  checked: string[];
  notEvaluated: string[];
  notApplicable: string[];
}

export type ReviewLimitationKind =
  | "cost_not_evaluated"
  | "liquidity_not_evaluated"
  | "slippage_not_evaluated"
  | "protocol_not_selected"
  | "review_only";

export interface ReviewLimitation {
  kind: ReviewLimitationKind;
  text: string;
}

export type ReviewSafetyNoteKind =
  | "review_only"
  | "no_transaction"
  | "no_signature"
  | "no_auto_move"
  | "informational"
  | "no_action";

export interface ReviewSafetyNote {
  kind: ReviewSafetyNoteKind;
  text: string;
}

export interface ReviewSummary {
  title: string;
  reason: string;
  categoryLabel: string;
}

export interface SuggestionReviewDetails {
  summary: ReviewSummary;
  metrics: ReviewMetric[];
  involvedAssets: ReviewAsset[];
  involvedPositions: ReviewPosition[];
  calculations: ReviewCalculation[];
  guardrailSummary: ReviewGuardrailSummary;
  limitations: ReviewLimitation[];
  safetyNotes: ReviewSafetyNote[];
  /**
   * Optional protocol-display fields shared by Demo Mode (now) and real wallet
   * mode (later). The real engine never populates them until production selection
   * gates pass; the modal renders them only when present.
   */
  demoLabel?: string;
  protocolSelectionDisplay?: ProtocolSelectionDisplay;
  /**
   * Optional read-only route/liquidity/slippage evaluation (Step 13I). When
   * present, the modal shows a dedicated "Route and execution checks" section and
   * these guardrails are removed from the generic "Not evaluated yet" group.
   */
  routeEvaluation?: RouteEvaluationDisplay;
  /**
   * Optional READ-ONLY external handoff link (Step 13J). Rendered as a user-click
   * anchor (new tab) — never auto-opened, never a transaction/signature/completion.
   */
  externalLink?: ReviewExternalLink;
  /**
   * Optional read-only "Other protocols to review" (Step 14L) — approved alternative
   * candidates (e.g. mSOL) shown for review only. None is the selected protocol or
   * winner; there is no execution path.
   */
  otherProtocolsToReview?: ProtocolReviewCandidateDisplay[];
  /**
   * Optional READ-ONLY dynamic "Top protocol to review right now" (Step 14Y). A display of the
   * current Step 14W comparison leader — never an activation, never changes selectedProtocolId,
   * never the suggestion-engine Top Pick. Rendered only when the display gate is available; may
   * change after each validated market refresh.
   */
  selectorPresentation?: SolStakingSelectorPresentation;
}

/**
 * Shared protocol-selection display shape used by Demo Mode now and real wallet
 * mode later. `marketData` carries verified, sourced values (Demo Mode only in
 * 13F). Real wallet mode must not populate this until production gates pass.
 */
export interface ProtocolSelectionDisplay {
  label: string;
  protocolName: string;
  assetSymbol: string;
  mode: "demo_preview" | "production";
  demoLabel?: string;
  sourceStatusLabel?: string;
  marketData?: {
    tvlUsd: number;
    apyPct: number;
    apy30dPct: number;
    directUnstakeTimeHours: number;
    directUnstakeFeePct: number;
    annualManagementFeePct: number;
    annualManagementFeeAppliesTo: string;
  };
  productionStatus?: {
    // Read-only real-wallet selection MAY be enabled (JitoSOL beta, 13G); the
    // transaction path stays hard-off — this is a review-only recommendation.
    realWalletSelectionEnabled: boolean;
    transactionsEnabled: false;
  };
}

/**
 * Read-only "Route and execution checks" display (Step 13I). Renders route cost,
 * liquidity depth, and slippage as review-only, grouped chips — NEVER an
 * execution-readiness claim. Present only for the approved JitoSOL recommendation
 * (real wallet, Demo preview, and the /testing fixture); other suggestions keep
 * showing these guardrails in the generic "Not evaluated yet" group.
 */
export interface RouteEvaluationDisplayGroup {
  title: string;
  tone: "checked" | "na" | "insufficient";
  items: string[];
}

export interface RouteEvaluationDisplay {
  /** Section heading, e.g. "Route and execution checks". */
  title: string;
  /** Read-only source label, e.g. "Read-only protocol route review". */
  sourceStatusLabel: string;
  groups: RouteEvaluationDisplayGroup[];
  /** Informational, read-only reassurance — never an execution-readiness claim. */
  explanation: string;
}

/**
 * A READ-ONLY external handoff link (Step 13J), e.g. "Open Jito staking page".
 * The modal renders it as a plain anchor the user may click to open the protocol's
 * own page in a new tab. WealthSmith never auto-opens it, executes a transaction,
 * requests a signature, or completes the suggestion — the user chooses to continue.
 */
export interface ReviewExternalLink {
  label: string;
  url: string;
  opensInNewTab: boolean;
}

/**
 * A READ-ONLY "alternative protocol to review" display (Step 14L). Surfaces a
 * protocol that passed evidence + risk-score + read-only review approval as an
 * ALTERNATIVE to review — never the selected protocol or winner. It carries no
 * execution path: `selectedByProtocolLogic` / `currentWinner` /
 * `transactionsEnabled` / `walletSignatureRequired` are always false. The final
 * protocol winner is chosen later by deterministic selection logic (not here).
 */
export interface ProtocolReviewCandidateDisplay {
  protocolId: string;
  protocolName: string;
  assetSymbol: string;

  roleLabel: "Alternative protocol to review" | "Baseline to review";
  reviewState: "approved_for_review_exposure" | "stale_evidence" | "missing_evidence";

  statusLabel: string;
  sourceStatusLabel?: string;

  // Native SOL staking baseline (Step 14T) — set only for the non-LST baseline candidate.
  // LST candidates leave these undefined, so their display is unchanged.
  candidateType?: "native_staking";
  isLiquidStakingToken?: boolean;
  notLstLabel?: string;
  nativeStakeAccountLabel?: string;
  delegatedStakeSol?: number;
  validatorCommissionPct?: number;
  apy30dMethodology?: string;

  marketData?: {
    tvlUsd?: number;
    apyPct?: number;
    apy30dPct?: number;
  };

  mechanics?: {
    unstakeTiming?: string;
    directUnstakeFeePct?: number;
    annualManagementFeePct?: number;
  };

  evidence?: {
    auditSecurity?: string;
    operationalRisk?: string;
    incidentReview?: string;
  };

  riskScore?: number;
  riskScoreStatus: "assigned_for_review";

  approvalStatus: "approved_for_read_only_review";
  approvedForReadOnlyRecommendation: true;
  approvedForReviewExposure: true;

  selectedByProtocolLogic: false;
  currentWinner: false;

  transactionsEnabled: false;
  walletSignatureRequired: false;

  externalReviewLink?: {
    label: string;
    url: string;
    opensNewTab: true;
  };
}

/**
 * Canonical engine suggestion. Copy is referenced by KEY (title_key /
 * description_key into the approved suggestion copy system —
 * content/suggestion-card-copy.md); the engine never emits freeform copy, and
 * numeric display values come from the structured fields.
 */
export interface EngineSuggestion {
  /** Stable ID (rules/suggestion-engine-rules.md — IDs must be stable). */
  id: string;
  category: SuggestionCategory;
  reason_codes: SuggestionReasonCode[];

  /** Keys into the approved copy system — never freeform text. */
  title_key: string;
  description_key: string;

  action_kind: SuggestionActionKind;
  is_actionable: boolean;
  /**
   * Set ONLY by Top Pick Logic (a later step). Exactly one actionable
   * suggestion may carry true; locked/informational/disabled never do.
   * The UI renders this flag and must never set it.
   */
  is_top_pick: boolean;

  /** Sourced amount the suggestion concerns (e.g. buffer shortfall USD). */
  amount?: SuggestionAmount;
  from?: SuggestionAssetRef;
  to?: SuggestionAssetRef;

  /** Allocation delta driving a rebalance (current − target, %-points). */
  delta_percent?: number;
  /** Buffer months of coverage after the suggested action completes. */
  post_buffer_months?: number;

  scores: SuggestionScore;
  guardrails: SuggestionGuardrail[];
  /**
   * Protocol/platform selection metadata (Step 9J). Optional and
   * ENGINE-INTERNAL — the card mapper never surfaces it. Absent is treated as
   * `not_applicable` (protocol choice irrelevant to that suggestion).
   */
  protocolSelection?: ProtocolSelection;
  /**
   * Structured review details (Step 10A). Optional and ENGINE-INTERNAL — the
   * card mapper never surfaces it; the Review drawer (Step 10B) will render it.
   */
  reviewDetails?: SuggestionReviewDetails;
  /**
   * Structured Stable Yield plan metadata (Step 16H-A) — present ONLY on a plan-backed `stable_yield`
   * suggestion converted from a Step 16G ready plan. Read-only + ENGINE-INTERNAL; the card mapper /
   * Smith AI integration are later 16H steps. Carries the exact 16G identity/amount/projection so no
   * downstream layer re-selects or recomputes anything.
   */
  stableYieldPlan?: StableYieldPlanSuggestionMeta;

  engine_version: string;
  /** Input-snapshot time (ms epoch) — supports stale detection on refresh. */
  timestamp: number;
}

/**
 * Full engine run result. When inputs are insufficient to generate ANY
 * suggestion honestly (e.g. no pricing, no goal), the engine returns an empty
 * list with `unavailable_reason` — never an invented fallback suggestion.
 */
export interface SuggestionEngineResult {
  engine_version: string;
  generated_at: number;
  /** Ordered by engine-provided priority; UI renders in this order. */
  suggestions: EngineSuggestion[];
  /** Non-fatal data-quality notes (e.g. partial_pricing). */
  warnings: SuggestionReasonCode[];
  /** Set when no suggestions could be generated at all. */
  unavailable_reason?: SuggestionReasonCode;
}
