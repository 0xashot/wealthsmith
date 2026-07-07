/**
 * RealWalletSummary — the Dashboard main content when a REAL wallet is connected.
 *
 * It reuses the SAME product Dashboard layout as Demo Mode (Financial Snapshot →
 * Safety Buffer → Projected Growth → Asset Mix), but every value is a live,
 * read-only wallet fact — never a fixture. Cards whose inputs don't exist yet
 * (USD pricing, projection/contribution logic, expense+stablecoin Safety Buffer)
 * show a polished "unavailable" state INSIDE the same card, so the page looks like
 * the real product without presenting invented numbers (rules/financial-logic-
 * boundaries.md; patterns/dashboard-layout.md — Real Connected Wallet Dashboard).
 *
 * READ-ONLY: nothing is signed, sent, or moved. It derives NO USD value,
 * allocation %, projection, Safety Buffer amount, or suggestion.
 */
import { useWalletPortfolio } from "../wallet/useWalletPortfolio";
import {
  deriveRealWalletDashboardSummary,
  deriveValueBreakdown,
  formatUsd,
} from "../wallet/walletSummary";
import { dashboardState as s } from "../state/dashboardState";
import RealWalletHeader from "./RealWalletHeader";
import LiveMetricGrid from "./LiveMetricGrid";
import EmptyStateCard from "./EmptyStateCard";
import {
  REAL_WALLET_VALUE_TITLE,
  REAL_WALLET_VALUE_DESC,
  REAL_WALLET_FACT_ASSETS,
  REAL_WALLET_FACT_NATIVE_SOL,
  REAL_WALLET_FACT_TOKENS,
  REAL_WALLET_FACT_LST,
  REAL_WALLET_FACT_PROTOCOLS,
  PRICING_NOT_CONNECTED,
  SAFETY_BUFFER_NEEDS,
  PROJECTED_GROWTH_NEEDS,
  DASH_ASSET_MIX_TITLE,
  DASH_ASSET_MIX_CAPTION,
  ALLOCATION_BY_VALUE_CAPTION,
  VALUE_EXCLUDES_UNPRICED,
  REAL_WALLET_NONE_DETECTED,
  LIVE_WALLET_LOADING,
  LIVE_WALLET_ERROR_TITLE,
  LIVE_WALLET_ERROR_DESC,
} from "../state/approvedCopy";

function formatSol(sol: number | null): string {
  if (sol == null) return "—";
  return `${sol.toLocaleString(undefined, { maximumFractionDigits: 6 })} SOL`;
}

export default function RealWalletSummary() {
  const { status, positions, error, warning, refresh, pricedAsOf } = useWalletPortfolio();
  const summary = deriveRealWalletDashboardSummary(positions);
  const value = deriveValueBreakdown(positions);
  const loading = status === "loading" && positions.length === 0;

  // Portfolio Value: real sourced total when available, else honest unavailable.
  const portfolioValueMetric =
    value.totalUsd != null
      ? {
          label: REAL_WALLET_VALUE_TITLE,
          value: formatUsd(value.totalUsd),
          note: value.anyUnpriced ? VALUE_EXCLUDES_UNPRICED : undefined,
        }
      : {
          label: REAL_WALLET_VALUE_TITLE,
          value: PRICING_NOT_CONNECTED,
          note: REAL_WALLET_VALUE_DESC,
          unavailable: true,
        };

  return (
    <>
      <RealWalletHeader status={status} warning={warning} refresh={refresh} pricedAsOf={pricedAsOf} />

      {loading ? (
        <section className="card empty-card" aria-label={LIVE_WALLET_LOADING}>
          <p className="empty-card__description" role="status">
            {LIVE_WALLET_LOADING}
          </p>
        </section>
      ) : status === "error" ? (
        <EmptyStateCard title={LIVE_WALLET_ERROR_TITLE} description={error ?? LIVE_WALLET_ERROR_DESC} />
      ) : (
        <>
          {/* Financial Snapshot — live counts + native SOL; Portfolio Value is an
              honest unavailable state (no invented USD). */}
          <LiveMetricGrid
            title={s.financial_snapshot.title}
            metrics={[
              portfolioValueMetric,
              { label: REAL_WALLET_FACT_ASSETS, value: String(summary.assetsDetected) },
              { label: REAL_WALLET_FACT_NATIVE_SOL, value: formatSol(summary.nativeSol) },
              { label: REAL_WALLET_FACT_TOKENS, value: String(summary.tokenCount) },
              { label: REAL_WALLET_FACT_LST, value: String(summary.lstCount) },
              { label: REAL_WALLET_FACT_PROTOCOLS, value: String(summary.protocols.length) },
            ]}
          />

          {/* Safety Buffer needs a real (non-fixture) monthly-expenses input plus
              recognized stablecoins; no such expense source flows to the dashboard
              yet, so the card shows a safe unavailable state (never fixture $/$). */}
          <EmptyStateCard title={s.safety_buffer.title} description={SAFETY_BUFFER_NEEDS} />

          {/* Projected Growth — visible for layout parity; unavailable until
              pricing + contribution logic exist. No demo projection numbers. */}
          <EmptyStateCard title={s.projected_growth.title} description={PROJECTED_GROWTH_NEEDS} />

          {/* Asset Mix — value-based allocation when priced (real % of USD value);
              otherwise an honest breakdown by category COUNT. */}
          {value.byCategory.length > 0 ? (
            <LiveMetricGrid
              title={DASH_ASSET_MIX_TITLE}
              caption={ALLOCATION_BY_VALUE_CAPTION}
              metrics={value.byCategory.map((c) => ({
                label: c.label,
                value: `${formatUsd(c.valueUsd)} · ${c.pct.toFixed(1)}%`,
              }))}
            />
          ) : summary.categories.length > 0 ? (
            <LiveMetricGrid
              title={DASH_ASSET_MIX_TITLE}
              caption={DASH_ASSET_MIX_CAPTION}
              metrics={summary.categories.map((c) => ({ label: c.label, value: String(c.count) }))}
            />
          ) : (
            <EmptyStateCard title={DASH_ASSET_MIX_TITLE} description={REAL_WALLET_NONE_DETECTED} />
          )}
        </>
      )}
    </>
  );
}
