/**
 * contributionProductInput — Step 15H UI turn. Maps REAL product state (canonical wallet positions,
 * sourced prices, the canonical Safety Buffer, and the saved goal) into the contribution pipeline
 * input for a given data mode, runs the pipeline, and returns a ready plan-backed suggestion + its
 * review sections. It recalculates nothing (reuses `deriveValueBreakdown` / `deriveStableValue` /
 * the 15H adapters). Real Wallet uses live values only — no fixture fallback; Demo passes explicitly
 * labeled fixture data. Missing/stale data yields no suggestion (never a fake amount or false On Track).
 */
import type { WalletPosition } from "../wallet/walletPosition";
import type { SavedGoal } from "../types/goal";
import type { SafetyBuffer } from "../wallet/walletSummary";
import { deriveValueBreakdown, deriveStableValue } from "../wallet/walletSummary";
import { deriveSolEconomicExposureUsd, buildContributionPortfolioSnapshot } from "./contributionPortfolioAdapter";
import { buildContributionSafetyBufferSnapshot } from "./contributionSafetyBufferGate";
import { buildContributionPriceQuote } from "./contributionPriceAdapter";
import { buildContributionLiquiditySnapshot, buildContributionUsdcPosition } from "./contributionLiquidityAdapter";
import { buildContributionPlanPipeline } from "./contributionPlanPipeline";
import { buildContributionReviewDetailsById } from "./contributionPlanSuggestion";
import type { ContributionPlanSuggestion, ContributionProductDataMode, ContributionPipelineResult } from "./contributionIntegrationTypes";
import type { ContributionPlanReviewDetails } from "./contributionPlanReviewDetails";
import type { ContributionFundingUsdcPosition } from "./contributionFundingTypes";
import type { ContributionPriceQuote as PriceQuote } from "./contributionPricePolicy";

export const CONTRIBUTION_PRODUCT_INPUT_EXISTS = true;

export interface ContributionProductResult {
  suggestion: ContributionPlanSuggestion | null;
  reviewById: Record<string, ContributionPlanReviewDetails>;
  pipeline: ContributionPipelineResult | null;
}

const EMPTY: ContributionProductResult = { suggestion: null, reviewById: {}, pipeline: null };

/** A direct, spendable, wallet-held USDC token balance (never a protocol receipt / delegated / locked). */
function isDirectWalletUsdc(p: WalletPosition): boolean {
  return p.type === "token" && p.symbol === "USDC" && p.name !== "Unknown token" && p.detection === "direct_wallet_balance" && typeof p.valueUsd === "number" && p.valueUsd > 0;
}

/**
 * Derive the plan-backed contribution suggestion from real product state. Returns null when required
 * data is missing/unavailable — the caller then shows no contribution card (unrelated suggestions
 * are unaffected).
 */
export function deriveContributionSuggestion(args: { dataMode: ContributionProductDataMode; positions: WalletPosition[]; pricedAsOf?: number | null; goal?: SavedGoal | null; buffer?: SafetyBuffer | null }): ContributionProductResult {
  const { dataMode, positions, pricedAsOf, goal, buffer } = args;
  if (!goal || pricedAsOf == null || !buffer) return EMPTY;
  const total = deriveValueBreakdown(positions).totalUsd;
  if (total == null || total <= 0) return EMPTY;

  const iso = new Date(pricedAsOf).toISOString();
  if (Number.isNaN(Date.parse(iso))) return EMPTY;
  const isFixture = dataMode === "demo_fixture";

  const portfolio = buildContributionPortfolioSnapshot({ dataMode, snapshotId: `pf-${pricedAsOf}-${Math.round(total)}`, sourcePortfolioVersion: dataMode, calculatedAt: iso, checkedAt: iso, totalPortfolioValueUsd: total, solExposureUsd: deriveSolEconomicExposureUsd(positions), usdcExposureUsd: deriveStableValue(positions), isFixtureData: isFixture });
  if (!portfolio.ok || !portfolio.snapshot) return EMPTY;

  const sbSnapshot = buildContributionSafetyBufferSnapshot({ targetUsd: buffer.targetUsd, stableUsd: buffer.stableUsd, shortfallUsd: Math.max(0, buffer.targetUsd - buffer.stableUsd), fullyFunded: buffer.fullyFunded, targetMonths: buffer.targetMonths, monthsCovered: buffer.monthsCovered, coveragePct: buffer.coveragePct }, { calculatedAt: iso, checkedAt: iso });

  // Sourced SOL price (native / liquid SOL position priceUsd) → canonical quote. Absent → growth blocks.
  const solPos = positions.find((p) => (p.type === "native" || p.symbol === "SOL") && typeof p.priceUsd === "number");
  const priceQuoteByTargetId: Record<string, PriceQuote> = {};
  if (solPos && typeof solPos.priceUsd === "number") {
    const pr = buildContributionPriceQuote({ dataMode, targetId: "sol", priceUsd: solPos.priceUsd, fetchedAt: iso, checkedAt: iso, isFixtureData: isFixture });
    if (pr.quote) priceQuoteByTargetId.sol = pr.quote;
  }

  // Direct wallet USDC → liquid_now (canonical classification). Nothing else is claimed liquid.
  const usdcPositions: ContributionFundingUsdcPosition[] = positions.filter(isDirectWalletUsdc).map((p, i) => buildContributionUsdcPosition({ positionId: p.id || `usdc-${i}`, source: "wallet_balance", liquidityStatus: "liquid_now", valueUsd: p.valueUsd as number, calculatedAt: iso }));
  const liquiditySnapshot = usdcPositions.length > 0 ? buildContributionLiquiditySnapshot({ dataMode, snapshotId: `liq-${pricedAsOf}`, sourcePortfolioVersion: dataMode, calculatedAt: iso, checkedAt: iso, status: "current", usdcPositions, isFixtureData: isFixture }).snapshot : undefined;

  const pipeline = buildContributionPlanPipeline({
    dataMode,
    profile: { monthlySavingGoalUsd: goal.monthly_saving_goal ?? undefined, contributionFrequency: goal.contribution_frequency, goal: goal.financial_goal, riskLevel: goal.risk_tolerance, timeHorizon: goal.timeline },
    portfolioSnapshot: portfolio.snapshot,
    safetyBufferSnapshot: sbSnapshot,
    priceQuoteByTargetId,
    ...(liquiditySnapshot ? { liquiditySnapshot } : {}),
    generatedAt: iso,
    checkedAt: iso,
  });

  const suggestion = pipeline.status === "ready" && pipeline.suggestion ? pipeline.suggestion : null;
  return { suggestion, reviewById: suggestion ? buildContributionReviewDetailsById([suggestion]) : {}, pipeline };
}
