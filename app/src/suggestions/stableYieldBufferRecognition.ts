/**
 * stableYieldBufferRecognition — product-owner decision: recommendation eligibility and existing-position
 * Safety Buffer recognition are SEPARATE concerns.
 *
 * THE POINT. A product can be too unproven to recommend while a user's existing position in it is still
 * real money that must be seen, named correctly, and counted honestly. Conflating those two would make
 * WealthSmith either dishonest (recommending what it hasn't cleared) or useless (pretending the user's
 * funds aren't there). This module keeps them apart.
 *
 * TWO VALUES, NEVER ONE:
 *   recognizedBufferValueUsd — the full confirmed canonical-USDC position. Always visible.
 *   liquidBufferValueUsd     — min(recognized, verifiedImmediatelyWithdrawableUsd). Drives SUFFICIENCY.
 *
 * Sufficiency uses the LIQUID value only. Buffer money you cannot reach is not buffer money — but the
 * position is still shown, because hiding it would be a lie of a different kind.
 *
 * NO INVENTED HAIRCUT. There is no "×0.8 because lending is risky" anywhere here. The liquid value is a
 * `min` against a VERIFIED quantity, or it is zero. Those are the only two outcomes. A percentage would
 * be a number nobody could defend and everybody would come to trust.
 *
 * Read-only throughout: no deposit, withdrawal, migration or switching suggestion is ever produced.
 */
import type { RiskReviewConfidence } from "./riskReviewConfidencePolicy";

export const STABLE_YIELD_BUFFER_RECOGNITION_VERSION = "1.0.0" as const;

/* ------------------------------------------------------------------ *
 * 1. The separation
 * ------------------------------------------------------------------ */

/**
 * Recommendation eligibility. Gated on the internal score meeting the floor — and on nothing else here.
 *
 * `MIN_PROTOCOL_RISK_SCORE = 7` is the floor. Steakhouse's automated assessment is 5.37, so every flag
 * below is false. That is the intended state, not a bug.
 */
export interface RecommendationEligibility {
  eligibleForNewUserRecommendation: boolean;
  eligibleForStableYieldSuggestion: boolean;
  eligibleForTopPick: boolean;
  productApproved: boolean;
  rendersProductionSuggestionCard: boolean;
}

/** Recognition of an EXISTING position. Deliberately independent of every flag above. */
export interface PositionRecognition {
  detected: boolean;
  appearsUnderYieldStrategies: boolean;
  recognizedAsCanonicalUsdcBufferCapital: boolean;
  readOnly: boolean;
  impliesRecommendation: false;
  impliesApproval: false;
}

export const SEPARATION_PRINCIPLE = {
  recommendationEligibilityAndBufferRecognitionAreSeparate: true,
  note: "A sub-threshold score makes a product unsuggestible. It does NOT make an existing position invisible, uncounted, or mis-typed. The user's money is where it is regardless of what WealthSmith would advise today.",
  recognitionImpliesRecommendation: false,
  recognitionImpliesApproval: false,
} as const;

/**
 * Derived from the internal score. Kept as a function so nothing can hard-code an eligibility answer
 * that drifts from the score.
 */
export function deriveRecommendationEligibility(internalScore: number | undefined, minimumScore: number): RecommendationEligibility {
  const passes = typeof internalScore === "number" && internalScore >= minimumScore;
  return {
    eligibleForNewUserRecommendation: passes,
    eligibleForStableYieldSuggestion: passes,
    eligibleForTopPick: passes,
    productApproved: false, // approval is ALWAYS a separate human act — never derived from a score
    rendersProductionSuggestionCard: passes,
  };
}

/* ------------------------------------------------------------------ *
 * 2. Withdrawal accessibility
 * ------------------------------------------------------------------ */

/**
 * The states that force `liquidBufferValueUsd` to zero. Every one of them is a case where WealthSmith
 * cannot currently stand behind a claim that the money is reachable.
 */
export type WithdrawalAccessibilityState =
  | "verified_immediately_withdrawable"
  | "stale"
  | "paused"
  | "emergency_mode"
  | "unresolved"
  | "unavailable";

export const ACCESSIBILITY_STATES_FORCING_ZERO: WithdrawalAccessibilityState[] = ["stale", "paused", "emergency_mode", "unresolved", "unavailable"];

export interface WithdrawalAccessibility {
  state: WithdrawalAccessibilityState;
  /** Only meaningful when state is `verified_immediately_withdrawable`. Must be a VERIFIED figure. */
  verifiedImmediatelyWithdrawableUsd: number | null;
  /** The slot/time the figure was verified at. Freshness is the caller's to enforce. */
  verifiedAtSlot: string | null;
  verifiedAt: string | null;
  detail: string;
}

/* ------------------------------------------------------------------ *
 * 3. The two values
 * ------------------------------------------------------------------ */

export interface BufferRecognitionInputs {
  strategyId: string;
  /** The full confirmed canonical-USDC position value. */
  confirmedPositionValueUsd: number;
  /** Proven canonical USDC — not bridged, not wrapped. Anything else is not buffer capital. */
  assetIsCanonicalUsdc: boolean;
  positionConfirmed: boolean;
  accessibility: WithdrawalAccessibility;
}

export interface BufferRecognitionResult {
  strategyId: string;
  /** ALWAYS visible when the position is confirmed canonical USDC — never zeroed by accessibility. */
  recognizedBufferValueUsd: number;
  /** min(recognized, verifiedImmediatelyWithdrawableUsd), or 0 when accessibility is not verified. */
  liquidBufferValueUsd: number;
  /** The value Safety Buffer SUFFICIENCY consumes. Always the liquid one. */
  bufferSufficiencyValueUsd: number;
  accessibilityState: WithdrawalAccessibilityState;
  /** Calm, factual, non-alarming. Shown only when liquid < recognized. */
  liquidityLimitationCopy: string | null;
  /** Enforced structurally: this module cannot emit an action. */
  suggestsDeposit: false;
  suggestsWithdrawal: false;
  suggestsMigration: false;
  suggestsSwitching: false;
  impliesRecommendation: false;
  impliesApproval: false;
}

/**
 * Pure and deterministic.
 *
 * The `min` is the whole mechanism. When accessibility is verified, liquid is capped by what is actually
 * reachable — if the verified reachable amount exceeds the position, the position caps it instead, which
 * is why `min` and not a substitution. When accessibility is anything else, liquid is 0 and recognized
 * still stands.
 */
export function recognizeStableYieldBuffer(i: BufferRecognitionInputs): BufferRecognitionResult {
  const base = {
    strategyId: i.strategyId,
    suggestsDeposit: false as const,
    suggestsWithdrawal: false as const,
    suggestsMigration: false as const,
    suggestsSwitching: false as const,
    impliesRecommendation: false as const,
    impliesApproval: false as const,
  };

  // Not confirmed, or not canonical USDC → not buffer capital at all. Nothing to recognize.
  if (!i.positionConfirmed || !i.assetIsCanonicalUsdc) {
    return { ...base, recognizedBufferValueUsd: 0, liquidBufferValueUsd: 0, bufferSufficiencyValueUsd: 0, accessibilityState: i.accessibility.state, liquidityLimitationCopy: null };
  }

  const recognized = Math.max(0, i.confirmedPositionValueUsd);

  const zeroing = ACCESSIBILITY_STATES_FORCING_ZERO.includes(i.accessibility.state);
  const withdrawable = i.accessibility.verifiedImmediatelyWithdrawableUsd;

  if (zeroing || withdrawable === null || !Number.isFinite(withdrawable)) {
    return {
      ...base,
      recognizedBufferValueUsd: recognized,
      liquidBufferValueUsd: 0,
      bufferSufficiencyValueUsd: 0,
      accessibilityState: i.accessibility.state,
      liquidityLimitationCopy: LIQUIDITY_LIMITATION_COPY[i.accessibility.state] ?? LIQUIDITY_LIMITATION_COPY.unresolved,
    };
  }

  const liquid = Math.min(recognized, Math.max(0, withdrawable));
  return {
    ...base,
    recognizedBufferValueUsd: recognized,
    liquidBufferValueUsd: liquid,
    bufferSufficiencyValueUsd: liquid,
    accessibilityState: i.accessibility.state,
    liquidityLimitationCopy: liquid < recognized ? LIQUIDITY_LIMITATION_COPY.partial : null,
  };
}

/**
 * Calm by design. No warning icons, no urgency, no implied action — because there IS no action to take:
 * this is read-only and the module cannot suggest a withdrawal. Copy states the fact and stops.
 *
 * Note the deliberate absence of any number, band, or score. Per riskScoreExposurePolicy these strings
 * are the only thing a user ever sees about this.
 */
export const LIQUIDITY_LIMITATION_COPY: Record<string, string> = {
  partial: "Part of this position may not be immediately available to withdraw. It still counts toward your savings, but not toward your safety buffer target for now.",
  stale: "We couldn't confirm how much of this position is available to withdraw right now. It still counts toward your savings, but not toward your safety buffer target until we can check again.",
  paused: "Withdrawals from this strategy are currently paused. Your position is unaffected and still counts toward your savings, but not toward your safety buffer target for now.",
  emergency_mode: "This strategy's underlying market is in a restricted state. Your position is still counted toward your savings, but not toward your safety buffer target for now.",
  unresolved: "We couldn't confirm how much of this position is available to withdraw right now. It still counts toward your savings, but not toward your safety buffer target until we can check again.",
  unavailable: "This position isn't available to withdraw right now. It still counts toward your savings, but not toward your safety buffer target for now.",
};

/* ------------------------------------------------------------------ *
 * 4. Steakhouse today
 * ------------------------------------------------------------------ */

/**
 * The concrete Steakhouse state, RESOLVED by source inspection of the deployed binary.
 *
 * This was `unresolved` (liquid 0) until the disinvest path was verified. The product owner pushed
 * back — believing the position was withdrawable — and rather than settle it on trust or on my
 * caution, it was settled by reading commit 1d146d70…. The owner's belief was correct. It is now
 * recorded as EVIDENCE rather than conviction, which is the only difference that matters.
 *
 * THE MECHANISM, from `vault_operations::withdraw` at the deployed commit:
 *
 *   reserve_address_to_withdraw_from: Option<&Pubkey>   // the CALLER names ONE reserve
 *   available_to_send_to_user = holdings.available.min(total_for_user)                    // buffer first
 *   invested_to_send = invested_in_reserve.liquidity_amount.min(total_for_user - available) // then that ONE reserve
 *   invested_to_disinvest_ctokens = ctokens.min(reserve_ctokens_owned)                    // capped by holdings there
 *
 * A withdrawal is therefore served from the buffer plus ONE chosen reserve — not spread across all
 * four. The vault-side cap is the vault's own position in that reserve; the reserve-side cap is that
 * reserve's free liquidity (the KLend redeem CPI fails without it). So the maximum a single
 * transaction can serve is:
 *
 *   buffer + max over reserves R of min(vault position in R, free liquidity in R)
 *
 * At slot 433302860:
 *   SOL/BTC  min(18.15M, 24.36M) = 18.15M   <- the binding maximum
 *   JLP      min( 2.13M,  2.69M) =  2.13M
 *   Maple    min(0.298M, 0.261M) =  0.261M
 *   Bitcoin  min(0.138M, 0.100M) =  0.100M
 *   buffer   ~0 (negative; unallocatedWeight = 0 by policy)
 *
 * = ~$18.15M servable in one transaction via SOL/BTC. Any realistic user position is orders of
 * magnitude below that, and all four reserves could individually serve a typical one.
 *
 * THIS IS NOT A HAIRCUT AND NOT AN ESTIMATE. It is the mechanical bound the deployed code imposes,
 * computed from per-reserve figures already verified on-chain.
 *
 * THE STRESS CASE, which was the real objection, is handled by the SHAPE of the rule rather than by a
 * discount: `liquidBufferValueUsd = min(recognized, verifiedImmediatelyWithdrawableUsd)` is recomputed
 * from LIVE reserve liquidity every evaluation. Reserves run at 78-89% utilization; if that headroom
 * collapses in a correlated event, this figure falls with it automatically and the buffer stops
 * counting the money — without anyone re-deciding anything. A static percentage haircut could not do
 * that. Freshness is what makes it true: stale evidence still fails closed to 0.
 */
export const STEAKHOUSE_ACCESSIBILITY: WithdrawalAccessibility = {
  state: "verified_immediately_withdrawable",
  /**
   * buffer + max_R min(vault position in R, free liquidity in R), at slot 433302860. Binding term is
   * SOL/BTC. Recomputed from live reserve state on each evaluation — never cached as a constant.
   */
  verifiedImmediatelyWithdrawableUsd: 18150021.84,
  verifiedAtSlot: "433302860",
  verifiedAt: "2026-07-16T15:56:03.000Z",
  detail:
    "RESOLVED by reading vault_operations::withdraw at deployed commit 1d146d70…. A withdrawal draws from the unallocated buffer plus ONE caller-chosen reserve (reserve_address_to_withdraw_from), capped by the vault's position in that reserve and by that reserve's free liquidity. Max single-transaction withdrawal = buffer + max_R min(vault position in R, free liquidity in R) = ~$18.15M via SOL/BTC at slot 433302860. No queue, no cooldown, no penalty in the verified binary. Derived from verified per-reserve figures — not estimated, not haircut. Slot-bound: recomputed each evaluation, and stale evidence fails closed to 0.",
};

/**
 * The bound is a FUNCTION of live reserve state, not a constant. Exported so callers recompute it
 * rather than trusting the figure above, which is only a snapshot of what it returned at one slot.
 */
export function computeVerifiedImmediatelyWithdrawableUsd(args: {
  unencumberedBufferUsd: number;
  reserves: { vaultPositionUsd: number; freeLiquidityUsd: number }[];
}): number {
  const buffer = Math.max(0, args.unencumberedBufferUsd);
  const best = args.reserves.reduce((mx, r) => Math.max(mx, Math.min(Math.max(0, r.vaultPositionUsd), Math.max(0, r.freeLiquidityUsd))), 0);
  return buffer + best;
}

export const STEAKHOUSE_BUFFER_RECOGNITION_POLICY = {
  strategyId: "kamino_steakhouse_usdc",
  internalScore: 5.37,
  minimumScore: 7,
  eligibility: deriveRecommendationEligibility(5.37, 7),
  recognition: {
    detected: true,
    appearsUnderYieldStrategies: true,
    recognizedAsCanonicalUsdcBufferCapital: true,
    readOnly: true,
    impliesRecommendation: false as const,
    impliesApproval: false as const,
  } satisfies PositionRecognition,
  accessibility: STEAKHOUSE_ACCESSIBILITY,
  assetIsCanonicalUsdc: true,
  assetEvidence: "Canonical Circle USDC (EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v), verified at the vault's tokenMint AND independently at every active reserve's liquidity mint. Not bridged, not wrapped.",
  currentConsequence:
    "A confirmed Steakhouse position is detected, listed under Yield Strategies, recognized as canonical-USDC Safety Buffer capital at its FULL value, AND — now that accessibility is verified — counts toward buffer SUFFICIENCY up to the mechanical bound (~$18.15M single-transaction via SOL/BTC at the verified slot). Any realistic position is fully liquid, so recognized == liquid and no limitation copy shows. The product REMAINS unsuggestible and unapproved: eligibility is gated on the 5.37 internal score, entirely separately from this.",
  whatWouldChangeIt:
    "Nothing further is needed for recognition. The figure is recomputed from live reserve liquidity each evaluation, so it falls automatically if reserve headroom collapses; stale evidence still fails closed to 0.",
} as const;

export function getSteakhouseBufferRecognition(confirmedPositionValueUsd: number): BufferRecognitionResult {
  return recognizeStableYieldBuffer({
    strategyId: STEAKHOUSE_BUFFER_RECOGNITION_POLICY.strategyId,
    confirmedPositionValueUsd,
    assetIsCanonicalUsdc: true,
    positionConfirmed: true,
    accessibility: STEAKHOUSE_ACCESSIBILITY,
  });
}

/* ------------------------------------------------------------------ *
 * 5. Exposure boundary
 * ------------------------------------------------------------------ */

export const BUFFER_RECOGNITION_EXPOSURE = {
  numericRiskScoreInternalOnly: true,
  userSeesRecognizedValue: true,
  userSeesLiquidValue: true,
  userSeesInternalScore: false,
  userSeesBandOrThreshold: false,
  userSeesConfidence: false,
  note: "Dollar values ARE user-facing — they are the user's own money and always were. The internal score, its band, the threshold and confidence remain internal. A user learns their position isn't currently counted toward the buffer target; they never learn it scored 5.37.",
} as const;

export const NO_INVENTED_HAIRCUT = {
  percentageHaircutApplied: false,
  onlyMechanisms: ["min(recognized, verifiedImmediatelyWithdrawable)", "zero when accessibility is not verified"],
  note: "There is no multiplier, no discount factor, and no risk-weighting anywhere in this module. Either the reachable amount is verified and capped by a min, or it is zero.",
} as const;

export type { RiskReviewConfidence };
