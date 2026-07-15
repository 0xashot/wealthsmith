/**
 * contributionPortfolioAdapter — Step 15H. Converts canonical portfolio data into the Step 15D
 * `ContributionPortfolioAllocationSnapshot`. It REUSES the canonical total priced USD denominator
 * (`deriveValueBreakdown`), the canonical stable exposure (`deriveStableValue`), and the canonical
 * SOL economic-exposure grouping (`duplicateExposure` + wallet types) — counting native stake and
 * supported LSTs exactly once, never double-counting a receipt token and its underlying, and never
 * inventing a USD value. Unknown/unsupported value (e.g. BONK) stays in the denominator, unassigned.
 * Real Wallet uses only real positions (no fixture fallback); Demo uses the Demo fixture only.
 */
import type { WalletPosition } from "../wallet/walletPosition";
import { deriveValueBreakdown, deriveStableValue } from "../wallet/walletSummary";
import { getUnderlyingExposureGroup } from "./duplicateExposure";
import { getInvestmentTarget } from "./investmentTargetRegistry";
import type { ContributionPortfolioAllocationSnapshot, ContributionPortfolioTargetExposure } from "./contributionAllocationGapTypes";
import type { ContributionProductDataMode, ContributionPipelineBlocker } from "./contributionIntegrationTypes";

export const CONTRIBUTION_PORTFOLIO_ADAPTER_EXISTS = true;
const VAL_TOL = 1e-6;
const finiteNonNeg = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0;
const SOL_LIQUID_SYMBOLS = new Set(["SOL", "WSOL"]);

/** True when a position IS SOL economic exposure (native, native stake, an LST, or SOL-grouped protocol). */
function isSolEconomicExposure(p: WalletPosition): boolean {
  if (p.type === "native" || p.type === "stake" || p.type === "lst") return true;
  if (p.type === "token" && SOL_LIQUID_SYMBOLS.has(p.symbol)) return true;
  return getUnderlyingExposureGroup(p) === "SOL_EXPOSURE";
}

/** Canonical SOL economic exposure — each position counted once (no receipt/underlying double count). */
export function deriveSolEconomicExposureUsd(positions: WalletPosition[]): number {
  let sum = 0;
  for (const p of positions) if (typeof p.valueUsd === "number" && p.valueUsd > 0 && isSolEconomicExposure(p)) sum += p.valueUsd;
  return sum;
}

/** Canonical USDC/stable exposure (reuses `deriveStableValue`). */
export function deriveUsdcExposureUsd(positions: WalletPosition[]): number {
  return deriveStableValue(positions);
}

export interface BuildPortfolioSnapshotOptions {
  dataMode: ContributionProductDataMode;
  snapshotId: string;
  sourcePortfolioVersion: string;
  calculatedAt: string;
  checkedAt: string;
  totalPortfolioValueUsd: number;
  solExposureUsd: number;
  usdcExposureUsd: number;
  valuationStatus?: "current" | "stale" | "invalid";
  /** True when the values came from a Demo/example fixture. Forbidden in real_wallet mode. */
  isFixtureData?: boolean;
}

export interface PortfolioAdapterResult {
  ok: boolean;
  snapshot?: ContributionPortfolioAllocationSnapshot;
  blocker?: ContributionPipelineBlocker;
}

/** Build the 15D snapshot from canonical aggregate exposures. Fails closed; fixture data is rejected in real_wallet. */
export function buildContributionPortfolioSnapshot(opts: BuildPortfolioSnapshotOptions): PortfolioAdapterResult {
  if (opts.dataMode === "real_wallet" && opts.isFixtureData === true) return { ok: false, blocker: "real_wallet_fixture_fallback_forbidden" };
  if (!opts.snapshotId || !opts.sourcePortfolioVersion) return { ok: false, blocker: "portfolio_snapshot_invalid" };
  if (!finiteNonNeg(opts.totalPortfolioValueUsd) || opts.totalPortfolioValueUsd <= 0) return { ok: false, blocker: "portfolio_total_unavailable" };
  if (!finiteNonNeg(opts.solExposureUsd) || !finiteNonNeg(opts.usdcExposureUsd)) return { ok: false, blocker: "target_exposure_unavailable" };
  if (opts.solExposureUsd + opts.usdcExposureUsd > opts.totalPortfolioValueUsd + VAL_TOL) return { ok: false, blocker: "portfolio_snapshot_invalid" };

  const usdcAssetId = getInvestmentTarget("usdc")!.assetId;
  const solAssetId = getInvestmentTarget("sol")!.assetId;
  const mk = (targetId: string, assetId: string, valueUsd: number): ContributionPortfolioTargetExposure => ({ targetId, assetId, valueUsd, holdingSources: ["connected_wallet"], valuationReady: true, notes: [] });

  const snapshot: ContributionPortfolioAllocationSnapshot = {
    snapshotId: opts.snapshotId,
    calculatedAt: opts.calculatedAt,
    checkedAt: opts.checkedAt,
    sourcePortfolioVersion: opts.sourcePortfolioVersion,
    totalPortfolioValueUsd: opts.totalPortfolioValueUsd,
    // Only mapped targets are listed; unknown/non-target value stays implicit in the total.
    targetExposures: [mk("usdc", usdcAssetId, opts.usdcExposureUsd), mk("sol", solAssetId, opts.solExposureUsd)],
    valuationStatus: opts.valuationStatus ?? "current",
    notes: [`dataMode:${opts.dataMode}`],
  };
  return { ok: true, snapshot };
}

/** Convenience: build the snapshot directly from canonical wallet positions. */
export function buildContributionPortfolioSnapshotFromPositions(positions: WalletPosition[], opts: Omit<BuildPortfolioSnapshotOptions, "totalPortfolioValueUsd" | "solExposureUsd" | "usdcExposureUsd">): PortfolioAdapterResult {
  const total = deriveValueBreakdown(positions).totalUsd;
  if (!finiteNonNeg(total) || (total as number) <= 0) return { ok: false, blocker: "portfolio_total_unavailable" };
  return buildContributionPortfolioSnapshot({ ...opts, totalPortfolioValueUsd: total as number, solExposureUsd: deriveSolEconomicExposureUsd(positions), usdcExposureUsd: deriveUsdcExposureUsd(positions) });
}

export interface PortfolioAdapterDiagnostics {
  dataMode: string;
  snapshotId: string;
  totalPortfolioValueUsd: number;
  solExposureUsd: number;
  usdcExposureUsd: number;
  unmappedOtherValueUsd: number;
}

export function getContributionPortfolioAdapterDiagnostics(snapshot: ContributionPortfolioAllocationSnapshot): PortfolioAdapterDiagnostics {
  const sol = snapshot.targetExposures.find((e) => e.targetId === "sol")?.valueUsd ?? 0;
  const usdc = snapshot.targetExposures.find((e) => e.targetId === "usdc")?.valueUsd ?? 0;
  return { dataMode: (snapshot.notes[0] ?? "").replace("dataMode:", ""), snapshotId: snapshot.snapshotId, totalPortfolioValueUsd: snapshot.totalPortfolioValueUsd, solExposureUsd: sol, usdcExposureUsd: usdc, unmappedOtherValueUsd: snapshot.totalPortfolioValueUsd - sol - usdc };
}
