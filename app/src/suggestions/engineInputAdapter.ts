/**
 * engineInputAdapter — deterministic adapter from existing live app data to the
 * canonical SuggestionEngineInputs snapshot.
 *
 * The adapter does NOT read wallets, fetch prices, or derive product values —
 * every argument is something the app already computed from sourced data:
 * positions + pricedAsOf (useWalletPortfolio), the value breakdown
 * (deriveValueBreakdown), the RISK-BASED Safety Buffer (deriveSafetyBuffer with
 * getSafetyBufferTargetMonths — the engine never calculates targetMonths), the
 * saved plan (SavedGoal), and optionally the bucket-level allocation snapshot.
 * The only arithmetic here is the explicit buffer shortfall
 * (targetUsd − stableUsd, floored at 0) and the boolean data-quality flags.
 *
 * Demo fixtures must never be adapted into these inputs — real-wallet data only
 * (rules/suggestion-engine-rules.md — demo and real suggestions stay separate).
 */
import type { WalletPosition } from "../wallet/walletPosition";
import type { SafetyBuffer, ValueBreakdown } from "../wallet/walletSummary";
import type { SavedGoal } from "../types/goal";
import type {
  SuggestionEngineInputs,
  SafetyBufferInputs,
  AllocationInputs,
} from "./engineInputs";

export interface EngineAdapterArgs {
  /** Live read-only positions (never demo fixtures). */
  positions: WalletPosition[];
  /** When sourced prices were applied (ms epoch); null/undefined = not priced. */
  pricedAsOf?: number | null;
  /** Saved plan from onboarding/Goal Settings. */
  savedGoal?: SavedGoal | null;
  /** deriveValueBreakdown(positions) — priced total + partial-pricing flag. */
  value: Pick<ValueBreakdown, "totalUsd" | "anyUnpriced">;
  /**
   * deriveSafetyBuffer(positions, expenses, getSafetyBufferTargetMonths(risk))
   * — the ALREADY-DERIVED risk-based buffer, or null when unavailable.
   */
  safetyBuffer: SafetyBuffer | null;
  /** Bucket-level allocation snapshot when already available (later steps). */
  allocation?: AllocationInputs | null;
}

/** Empty string / undefined → null (SavedGoal option IDs are non-empty strings). */
function idOrNull(v: string | undefined): string | null {
  return v ? v : null;
}

/** Positive finite number → itself; anything else → null. */
function usdOrNull(v: number | null | undefined): number | null {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
}

export function buildSuggestionEngineInputs(args: EngineAdapterArgs): SuggestionEngineInputs {
  const { positions, pricedAsOf, savedGoal, value, safetyBuffer, allocation } = args;

  const riskTolerance = idOrNull(savedGoal?.risk_tolerance);
  const monthlyExpenses = usdOrNull(savedGoal?.expenses_monthly);

  const safetyBufferInputs: SafetyBufferInputs | null = safetyBuffer
    ? {
        ...safetyBuffer,
        targetRule: "risk_based",
        riskTolerance,
        shortfallUsd: Math.max(0, safetyBuffer.targetUsd - safetyBuffer.stableUsd),
      }
    : null;

  const hasPricing = pricedAsOf != null && value.totalUsd != null;

  return {
    positions,
    pricedAsOf: pricedAsOf ?? null,
    value: {
      totalUsd: value.totalUsd,
      anyUnpriced: value.anyUnpriced,
    },
    safetyBuffer: safetyBufferInputs,
    allocation: allocation ?? null,
    goal: {
      riskTolerance,
      monthlyExpenses,
      monthlyContribution: usdOrNull(savedGoal?.monthly_saving_goal),
      timeline: idOrNull(savedGoal?.timeline),
      financialGoal: idOrNull(savedGoal?.financial_goal),
    },
    dataQuality: {
      hasWalletData: positions.length > 0,
      hasPricing,
      hasPartialPricing: value.anyUnpriced,
      hasGoal: savedGoal != null,
      hasMonthlyExpenses: monthlyExpenses != null,
      hasRiskTolerance: riskTolerance != null,
      hasAllocation: allocation != null,
    },
  };
}
