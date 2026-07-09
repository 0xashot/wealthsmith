/**
 * engineInputs — canonical INPUT contract of the deterministic Suggestion
 * Engine MVP (Step 2: contracts only, no logic, no adapter yet).
 *
 * Every field is a value the app ALREADY derives from sourced data (Step 1
 * audit): live read-only positions (useWalletPortfolio), sourced pricing
 * (tokenPrices), value breakdown + Safety Buffer (walletSummary), the approved
 * risk-based target allocation (recommendedAllocation), and the saved plan
 * (SavedGoal). The engine consumes this snapshot and must not fetch, price,
 * or invent anything itself.
 *
 * Null/false fields mean "honestly unavailable" — the engine responds with
 * blocked/unavailable output (engineTypes.SuggestionEngineResult), never a
 * guessed value. Demo fixtures are NEVER adapted into these inputs; Demo Mode
 * has its own sample suggestions (rules/demo-mode-rules.md).
 *
 * An input adapter (app state → SuggestionEngineInputs) is a later step.
 */
import type { WalletPosition } from "../wallet/walletPosition";
import type { SafetyBuffer } from "../wallet/walletSummary";

/**
 * Safety Buffer inputs — ALREADY DERIVED before the engine runs, by the
 * existing approved Safety Buffer logic (walletSummary.deriveSafetyBuffer).
 * The buffer target is RISK-BASED product logic owned by that derivation; the
 * engine consumes targetMonths / targetUsd / shortfallUsd as given and must
 * not define or recompute the target.
 *
 * Extends the exported SafetyBuffer shape (stableUsd, targetUsd, targetMonths,
 * coveragePct, monthsCovered, fullyFunded) with the explicit shortfall the
 * buffer suggestion sizes against (targetUsd − stableUsd, floored at 0;
 * computed by the adapter, not the UI) and the risk context it was derived from.
 */
export interface SafetyBufferInputs extends Readonly<SafetyBuffer> {
  /** The target is supplied by approved risk-based product logic. */
  targetRule: "risk_based";
  /** Saved risk level the target was derived from (SavedGoal.risk_tolerance). */
  riskTolerance: string | null;
  shortfallUsd: number;
}

/**
 * Bucket-level allocation snapshot (MVP is bucket-level by approved product
 * decision). Current values come from the same derivations the Dashboard and
 * Portfolio already render; recommended/target values come from
 * deriveRecommendedAllocation (approved risk matrix); deltas mirror
 * AllocationDeltas (current − target; positive = overweight).
 */
export interface AllocationInputs {
  currentCryptoPct: number | null;
  currentStablesPct: number | null;
  currentCryptoUsd: number | null;
  currentStablesUsd: number | null;
  recommendedCryptoPct: number | null;
  recommendedStablesPct: number | null;
  cryptoDeltaPct: number | null;
  stablesDeltaPct: number | null;
}

/** Saved-plan inputs (SavedGoal keys; monthly_saving_goal stays nullable). */
export interface GoalInputs {
  riskTolerance: string | null;
  monthlyExpenses: number | null;
  /** SavedGoal.monthly_saving_goal — never coerced to 0 when unset. */
  monthlyContribution: number | null;
  timeline: string | null;
  financialGoal: string | null;
}

/**
 * Explicit data-quality flags so engine rules read as guard clauses instead of
 * re-deriving availability. Each flag is computed by the adapter from the raw
 * fields above (e.g. hasPricing = pricedAsOf != null && value.totalUsd != null).
 */
export interface EngineDataQuality {
  hasWalletData: boolean;
  hasPricing: boolean;
  hasPartialPricing: boolean;
  hasGoal: boolean;
  hasMonthlyExpenses: boolean;
  hasRiskTolerance: boolean;
  hasAllocation: boolean;
}

export interface SuggestionEngineInputs {
  /** Live read-only positions (never demo fixtures). */
  positions: WalletPosition[];
  /** When sourced prices were applied (ms epoch); null/undefined = not priced. */
  pricedAsOf?: number | null;

  /** Priced portfolio value (walletSummary.deriveValueBreakdown). */
  value: {
    /** Sum of SOURCED position values only; null when nothing is priced. */
    totalUsd: number | null;
    /** True when any real holding has no sourced price (partial pricing). */
    anyUnpriced: boolean;
  };

  /** Null when monthly expenses are unknown or prices haven't loaded. */
  safetyBuffer: SafetyBufferInputs | null;

  /** Null when allocation is unavailable (no priced value). */
  allocation: AllocationInputs | null;

  goal: GoalInputs;

  dataQuality: EngineDataQuality;
}
