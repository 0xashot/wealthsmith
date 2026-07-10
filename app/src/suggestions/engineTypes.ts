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
 * MVP scope (implemented in later steps): Top Up Safety Buffer, Rebalance
 * (bucket-level), On Track. Top Pick selection (top-pick-rules.md) comes after
 * the core suggestions and only ever marks `is_top_pick` on engine output.
 */

/**
 * MVP categories. `buffer` and `rebalance` map to the top-pick category
 * priority hierarchy (Buffer Actions > Rebalance > …); `on_track` is
 * informational and never Top Pick.
 *
 * IMPLEMENTED (MVP): buffer, rebalance, on_track.
 * CONTRACTED (Step 9A — types + ordering only, NO trigger logic yet):
 * capital_efficiency, staking, stable_yield, position_optimization. See
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
 * The trailing groups are CONTRACTED for future categories (Step 9A) — declared
 * so future rules can emit them, but no rule produces them yet.
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
  | "unsupported_protocol_review";

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
  selectedStrategyType?: ProtocolStrategyType;
  reasons: ProtocolSelectionReason[];
  /** ISO timestamp of a real evaluation (only when data was actually consulted). */
  evaluatedAt?: string;
  /** Identifiers of the data sources consulted (only when actually consulted). */
  dataSources?: string[];
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
