/**
 * contributionLiquidityAdapter — Step 15H. Wraps CANONICALLY-CLASSIFIED USDC positions into the
 * Step 15F `ContributionFundingLiquiditySnapshot`. It never infers liquidity from a token symbol,
 * protocol name, or source type alone — the caller must supply the canonical `liquidityStatus`. Only
 * `liquid_now` counts as available now. Real Wallet uses only real positions (no fixture liquid
 * USDC); Demo's fixture liquid-now classification lives only in demo_fixture mode.
 */
import type { ContributionFundingLiquiditySnapshot, ContributionFundingLiquidityStatus, ContributionFundingUsdcPosition, ContributionFundingUsdcPositionSource } from "./contributionFundingTypes";
import type { ContributionProductDataMode, ContributionPipelineBlocker } from "./contributionIntegrationTypes";

export const CONTRIBUTION_LIQUIDITY_ADAPTER_EXISTS = true;

/** A canonically-classified USDC position. `liquidityStatus` is REQUIRED (never inferred here). */
export function buildContributionUsdcPosition(input: { positionId: string; source: ContributionFundingUsdcPositionSource; liquidityStatus: ContributionFundingLiquidityStatus; valueUsd: number; calculatedAt: string }): ContributionFundingUsdcPosition {
  return { positionId: input.positionId, source: input.source, liquidityStatus: input.liquidityStatus, valueUsd: input.valueUsd, calculatedAt: input.calculatedAt, canonicalClassificationUsed: true, notes: [] };
}

export interface BuildLiquiditySnapshotOptions {
  dataMode: ContributionProductDataMode;
  snapshotId: string;
  sourcePortfolioVersion: string;
  calculatedAt: string;
  checkedAt: string;
  status: "current" | "stale" | "invalid";
  usdcPositions: ContributionFundingUsdcPosition[];
  /** True when positions came from a Demo/example fixture. Forbidden in real_wallet mode. */
  isFixtureData?: boolean;
}

export interface LiquidityAdapterResult {
  ok: boolean;
  snapshot?: ContributionFundingLiquiditySnapshot;
  blocker?: ContributionPipelineBlocker;
}

/** Build the 15F liquidity snapshot. Fails closed; fixture data is rejected in real_wallet mode. */
export function buildContributionLiquiditySnapshot(opts: BuildLiquiditySnapshotOptions): LiquidityAdapterResult {
  if (opts.dataMode === "real_wallet" && opts.isFixtureData === true) return { ok: false, blocker: "real_wallet_fixture_fallback_forbidden" };
  if (!opts.snapshotId || !opts.sourcePortfolioVersion) return { ok: false, blocker: "liquidity_snapshot_invalid" };
  const snapshot: ContributionFundingLiquiditySnapshot = {
    snapshotId: opts.snapshotId,
    calculatedAt: opts.calculatedAt,
    checkedAt: opts.checkedAt,
    sourcePortfolioVersion: opts.sourcePortfolioVersion,
    status: opts.status,
    usdcPositions: opts.usdcPositions,
    canonicalLiquidityClassificationUsed: true,
    notes: [`dataMode:${opts.dataMode}`],
  };
  return { ok: true, snapshot };
}

/**
 * Demo-only helper: a direct Demo wallet USDC balance classified `liquid_now`. This fixture
 * classification must NEVER be used in real_wallet mode (the pipeline enforces the guard).
 */
export function demoLiquidUsdcPosition(positionId: string, valueUsd: number, calculatedAt: string): ContributionFundingUsdcPosition {
  return buildContributionUsdcPosition({ positionId, source: "wallet_balance", liquidityStatus: "liquid_now", valueUsd, calculatedAt });
}
