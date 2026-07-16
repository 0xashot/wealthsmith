/**
 * stableYieldProductInput — Step 16H-D. The SHARED, deterministic orchestration boundary that prepares
 * the optional Stable Yield 16G decision passed as the 4th argument to `runSuggestionEngine`. It is the
 * SAME path for Demo Mode and Real Wallet — it only branches on `dataMode` for the DATA SOURCE:
 *
 *   - `real_wallet` → the PRODUCTION pipeline (production registry + empty market data / risk reviews /
 *     capacity). No product is approved and no market/comparison/capacity data source is wired, so the
 *     16G decision is deterministically `no_plan` → no suggestion → no card. That is the correct
 *     production state; the integration is wired, not the (absent) production data.
 *   - `demo_fixture` → the injected DEMO decision (a synthetic approved product, never the production
 *     registry), gated on the demo Safety Buffer being complete.
 *
 * It orchestrates the existing 16E/16F/16G/16H-A/16H-B modules in canonical order — it recreates NO
 * calculation, contains NO React, builds NO transaction/execution, and fails closed (no suggestion +
 * a diagnostic) on anything other than a ready plan.
 */
import type { WalletPosition } from "../wallet/walletPosition";
import type { SavedGoal } from "../types/goal";
import type { SafetyBuffer } from "../wallet/walletSummary";
import type { EngineSuggestion } from "./engineTypes";
import type { YieldStrategyPlanDecision } from "./yieldStrategyPlanTypes";
import type { StableYieldReviewPresentation } from "./yieldStrategyPlanPresentationTypes";
import { listYieldStrategies } from "./yieldStrategyRegistry";
import { buildYieldStrategyEligibilitySet } from "./yieldStrategyEligibility";
import { buildYieldStrategyComparisonSet } from "./yieldStrategyComparison";
import { buildEmptyApprovedYieldStrategyMarketDataSet, buildYieldStrategyMarketDataSet } from "./yieldStrategyMarketData";
import type { YieldStrategyMarketDataInput } from "./yieldStrategyMarketDataTypes";
import { buildKaminoMarketDataInput } from "./stableYieldProductionAdapters";
import type { StableYieldAdapterDiagnostic } from "./stableYieldProductionAdapterTypes";
import { buildYieldStrategyPositionSet } from "./yieldStrategyPositionEngine";
import { buildYieldStrategyEligibleCapitalSnapshot } from "./yieldStrategyEligibleCapital";
import { buildYieldStrategyPlanDecision } from "./yieldStrategyPlan";
import { buildStableYieldPlanSuggestion } from "./yieldStrategyPlanSuggestion";
import { buildStableYieldPlanPresentation } from "./yieldStrategyPlanPresentation";
import { buildDemoStableYieldDecision, DEMO_STABLE_YIELD_APY, DEMO_STABLE_YIELD_CHECKED_AT } from "./demoStableYieldScenario";

export const STABLE_YIELD_PRODUCT_ORCHESTRATION_EXISTS = true;

const PROD_OWNER = "production";

export interface DeriveStableYieldSuggestionInput {
  dataMode: "real_wallet" | "demo_fixture";
  positions: WalletPosition[];
  pricedAsOf?: number | null;
  goal?: SavedGoal | null;
  buffer?: SafetyBuffer | null;
  checkedAt?: string;
}

export interface DeriveStableYieldSuggestionResult {
  suggestion: EngineSuggestion | null;
  decision: YieldStrategyPlanDecision | null;
  reviewById: Record<string, StableYieldReviewPresentation>;
  diagnostic: {
    dataMode: "real_wallet" | "demo_fixture";
    emitted: boolean;
    planStatus: string;
    suppressionStage: string;
    reason: string;
  };
}

/**
 * Step 16H-G — collect canonical PRODUCTION market-data inputs from the adapter layer.
 *
 * `sourceRecords` are already-retrieved, pre-normalized source payloads keyed by strategyId. Stage A
 * (retrieval) is NOT performed here: the 16C contract pins `browserFetched: false`, so the browser may
 * never call a yield-data provider. Records can only arrive from the developer-only Node probe or a
 * future backend job — neither of which feeds runtime today, so the default is none.
 *
 * Every record still runs the full adapter (parse → exact identity → freshness → normalize). Only
 * `planningSafe` output is returned; a rejected record contributes NOTHING (never a partial default).
 * Raw source payloads never reach the planner — only canonical `YieldStrategyMarketDataInput`s do.
 */
export function buildProductionStableYieldMarketInputs(args: { checkedAt: string; sourceRecords?: Record<string, unknown> }): {
  inputs: YieldStrategyMarketDataInput[];
  diagnostics: StableYieldAdapterDiagnostic[];
} {
  const { checkedAt, sourceRecords } = args;
  const inputs: YieldStrategyMarketDataInput[] = [];
  const diagnostics: StableYieldAdapterDiagnostic[] = [];

  for (const entry of listYieldStrategies()) {
    const raw = sourceRecords?.[entry.strategyId];
    if (raw === undefined) continue; // No record supplied → nothing to adapt. Never a synthesized default.
    // Only Kamino has an implemented source adapter; other protocols document no exact product at all.
    if (entry.protocolId !== "kamino") continue;
    const result = buildKaminoMarketDataInput({ entry, raw, checkedAt });
    diagnostics.push(result.diagnostic);
    if (result.diagnostic.planningSafe && result.output) inputs.push(result.output);
  }
  return { inputs, diagnostics };
}

/**
 * The PRODUCTION Stable Yield decision — runs the real 16E→16G layers over the production registry,
 * now fed by the Step 16H-G adapter layer via the canonical 16C join.
 *
 * Today this still resolves to `no_plan`, for a documented reason: every registry entry is
 * `documentation_required` with `address: undefined`, so (a) no source record can be bound to an exact
 * product and (b) the 16C join only builds a real snapshot for an APPROVED entry with a documented
 * address. Approval is Step 16H-H's job, not this layer's. Never Demo data.
 */
function buildProductionStableYieldDecision(checkedAt: string, sourceRecords?: Record<string, unknown>): YieldStrategyPlanDecision {
  const registry = listYieldStrategies();
  const { inputs } = buildProductionStableYieldMarketInputs({ checkedAt, sourceRecords });
  // The canonical registry↔market join. With no inputs this is equivalent to the empty-approved set,
  // but it is now the REAL join, so a future approved product + adapter record flows through unchanged.
  const marketDataSet = inputs.length > 0 ? buildYieldStrategyMarketDataSet({ checkedAt, inputs }) : buildEmptyApprovedYieldStrategyMarketDataSet(checkedAt);
  const eligibilitySet = buildYieldStrategyEligibilitySet({ registry, marketDataSet, riskReviews: [], checkedAt });
  const comparisonSet = buildYieldStrategyComparisonSet({ eligibilitySet, marketDataSet, riskReviews: [], checkedAt });
  const positionSet = buildYieldStrategyPositionSet({ ownerAddress: PROD_OWNER, checkedAt, positions: [] });
  const capitalSnapshot = buildYieldStrategyEligibleCapitalSnapshot({
    ownerAddress: PROD_OWNER,
    canonicalSafetyBuffer: { requiredBufferUsd: 0, bufferComplete: false, directWalletEligibleBufferUsd: 0, available: false },
    directWalletLiquiditySnapshot: { directLiquidUsdcUsd: 0, available: false },
    positionSet,
    checkedAt,
  });
  return buildYieldStrategyPlanDecision({ ownerAddress: PROD_OWNER, checkedAt, registry, eligibilitySet, comparisonSet, capitalSnapshot, productCapacitySet: [] });
}

/**
 * Prepare the optional Stable Yield suggestion for `runSuggestionEngine`'s 4th param. Returns `null`
 * (with a diagnostic) for every non-ready outcome. Never throws for a normal `no_plan`.
 */
export function deriveStableYieldPlanSuggestion(input: DeriveStableYieldSuggestionInput): DeriveStableYieldSuggestionResult {
  const checkedAt = input.checkedAt ?? (input.dataMode === "demo_fixture" ? DEMO_STABLE_YIELD_CHECKED_AT : (input.pricedAsOf ? new Date(input.pricedAsOf).toISOString() : new Date().toISOString()));
  const generatedAt = input.pricedAsOf ?? Date.now();

  let decision: YieldStrategyPlanDecision;
  let apyProvenance: typeof DEMO_STABLE_YIELD_APY | undefined;
  if (input.dataMode === "demo_fixture") {
    // Demo shows the Stable Yield card only when its Safety Buffer is complete (consistent with the
    // engine's buffer override); otherwise no demo Stable Yield suggestion is prepared.
    if (input.buffer?.fullyFunded !== true) {
      return { suggestion: null, decision: null, reviewById: {}, diagnostic: { dataMode: input.dataMode, emitted: false, planStatus: "not_evaluated", suppressionStage: "upstream", reason: "demo_buffer_incomplete" } };
    }
    decision = buildDemoStableYieldDecision(checkedAt);
    apyProvenance = DEMO_STABLE_YIELD_APY;
  } else {
    decision = buildProductionStableYieldDecision(checkedAt);
  }

  const built = buildStableYieldPlanSuggestion(decision, { generatedAt, ...(apyProvenance ? { apyProvenance } : {}) });
  const reviewById: Record<string, StableYieldReviewPresentation> = {};
  if (built.suggestion) {
    const pres = buildStableYieldPlanPresentation(built.suggestion);
    if (!pres.review || !pres.card) {
      // Fail closed: a suggestion that cannot present is not surfaced.
      return { suggestion: null, decision, reviewById: {}, diagnostic: { dataMode: input.dataMode, emitted: false, planStatus: decision.status, suppressionStage: "presentation", reason: pres.diagnostic.failureReason ?? "presentation_failed" } };
    }
    reviewById[built.suggestion.id] = pres.review;
  }

  return {
    suggestion: built.suggestion,
    decision,
    reviewById,
    diagnostic: { dataMode: input.dataMode, emitted: built.diagnostic.emitted, planStatus: decision.status, suppressionStage: built.diagnostic.suppressionStage, reason: built.diagnostic.reason },
  };
}
