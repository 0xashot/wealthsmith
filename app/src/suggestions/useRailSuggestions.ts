/**
 * useRailSuggestions — the SINGLE real-wallet Suggestion Engine entry point for
 * the UI. Both the Dashboard (DashboardBody) and the Portfolio
 * (RealWalletPortfolio) call this hook with their own already-read wallet data,
 * so Dashboard and Portfolio show identical deterministic suggestions for the
 * same wallet + saved goal — no per-page suggestion logic, ranking, Top Pick, or
 * ordering is duplicated.
 *
 * `deriveRailSuggestions` is the pure computation: from live positions +
 * pricedAsOf + savedGoal it derives the priced value, the RISK-BASED Safety
 * Buffer, and the bucket-level allocation (all via the existing approved
 * helpers), runs `runSuggestionEngine`, and maps the result with
 * `toSuggestionCards` — recalculating no pricing, buffer target, allocation
 * target, or Top Pick. The hook wraps it with a signature-gated lift so the
 * consuming page's setState only fires when a value-bearing display field
 * changes (never a render loop, never a stale amount).
 *
 * Never uses demo data — real-wallet positions only.
 */
import { useEffect, useRef } from "react";
import type { WalletPosition } from "../wallet/walletPosition";
import type { SavedGoal } from "../types/goal";
import type { SuggestionCardState } from "../types/dashboard";
import {
  deriveValueBreakdown,
  deriveStableValue,
  deriveSafetyBuffer,
} from "../wallet/walletSummary";
import {
  deriveRecommendedAllocation,
  deriveAllocationDeltas,
} from "../wallet/recommendedAllocation";
import { getSafetyBufferTargetMonths } from "../wallet/safetyBufferTarget";
import { buildSuggestionEngineInputs } from "./engineInputAdapter";
import { runSuggestionEngine } from "./engine";
import { toSuggestionCards, warningsToNotice } from "./toSuggestionCard";

/** Engine cards + partial-pricing notice for the right rail (engine order). */
export interface RailSuggestionsData {
  cards: SuggestionCardState[];
  notice?: string;
  /** True when the engine produced at least one card. */
  available: boolean;
}

/** The lifted rail payload (adds the live-read loading flag). */
export interface RailSuggestions extends RailSuggestionsData {
  loading: boolean;
}

/**
 * Pure: live wallet data + saved goal → engine cards. All inputs are derived
 * here via the approved helpers; the engine recalculates nothing.
 */
export function deriveRailSuggestions(args: {
  positions: WalletPosition[];
  pricedAsOf?: number | null;
  goal?: SavedGoal | null;
}): RailSuggestionsData {
  const { positions, pricedAsOf, goal } = args;

  const value = deriveValueBreakdown(positions);

  // Risk-based Safety Buffer (only once priced, so a 0 reserve is real).
  const bufferTargetMonths = getSafetyBufferTargetMonths(goal?.risk_tolerance);
  const buffer =
    pricedAsOf != null
      ? deriveSafetyBuffer(positions, goal?.expenses_monthly, bufferTargetMonths)
      : null;

  // Current + recommended allocation (bucket-level), from sourced value only.
  const total = value.totalUsd ?? 0;
  const stableUsd = deriveStableValue(positions);
  const cryptoUsd = Math.max(0, total - stableUsd);
  const cryptoPct = total > 0 ? (cryptoUsd / total) * 100 : 0;
  const stablePct = total > 0 ? (stableUsd / total) * 100 : 0;
  const showAllocation = value.totalUsd != null && total > 0;
  const recommended = deriveRecommendedAllocation({
    riskTolerance: goal?.risk_tolerance,
    totalPricedUsd: showAllocation ? total : null,
  });
  const deltas =
    showAllocation && recommended
      ? deriveAllocationDeltas({
          current: { cryptoUsd, stableUsd, cryptoPct, stablePct },
          recommended,
        })
      : null;
  const allocationInput =
    showAllocation && recommended && deltas
      ? {
          currentCryptoPct: cryptoPct,
          currentStablesPct: stablePct,
          currentCryptoUsd: cryptoUsd,
          currentStablesUsd: stableUsd,
          recommendedCryptoPct: recommended.cryptoPct,
          recommendedStablesPct: recommended.stablePct,
          cryptoDeltaPct: deltas.cryptoDeltaPct,
          stablesDeltaPct: deltas.stableDeltaPct,
        }
      : null;

  const engineResult = runSuggestionEngine(
    buildSuggestionEngineInputs({
      positions,
      pricedAsOf,
      savedGoal: goal ?? null,
      value: { totalUsd: value.totalUsd, anyUnpriced: value.anyUnpriced },
      safetyBuffer: buffer,
      allocation: allocationInput,
    }),
    pricedAsOf ?? 0
  );
  const cards = toSuggestionCards(engineResult.suggestions);
  return {
    cards,
    notice: warningsToNotice(engineResult.warnings),
    available: cards.length > 0,
  };
}

/**
 * Derive + lift the rail payload to the page. `onSuggestions` fires only when a
 * value-bearing display field changes (signature-gated) so the parent setState
 * never loops and the rail never shows a stale value.
 */
export function useRailSuggestions(args: {
  positions: WalletPosition[];
  pricedAsOf?: number | null;
  goal?: SavedGoal | null;
  loading: boolean;
  onSuggestions?: (data: RailSuggestions) => void;
}): void {
  const { positions, pricedAsOf, goal, loading, onSuggestions } = args;
  const { cards, notice, available } = deriveRailSuggestions({ positions, pricedAsOf, goal });

  const signature = JSON.stringify({
    cards: cards.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      impact_text: c.impact_text,
      is_top_pick: c.is_top_pick,
      status: c.status,
      actionability: c.actionability,
      disabled_reason_text: c.disabled_reason_text ?? "",
      cta: c.cta.label,
    })),
    notice: notice ?? "",
    loading,
  });
  const lastSignature = useRef<string | null>(null);
  useEffect(() => {
    if (!onSuggestions) return;
    if (signature === lastSignature.current) return;
    lastSignature.current = signature;
    onSuggestions({ cards, notice, available, loading });
    // Signature gates the update; card objects are intentionally omitted from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, onSuggestions]);
}
