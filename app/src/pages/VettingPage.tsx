/**
 * VettingPage — Trust → Vetting. The real, current vetting status of every
 * protocol and product WealthSmith has reviewed: a compact summary table
 * (Protocol / Product / Last vetting date / Security score — no horizontal
 * scroll) where clicking a row opens a detail drawer with the recorded outcome
 * reason and the per-dimension score breakdown (canonical copy in
 * state/vettingState.ts, mirroring the engine's recorded governance conclusions).
 *
 * Available in EVERY mode — connected, disconnected/mid-onboarding, and Demo —
 * because Trust content needs no wallet (same precedent as Strategy Lab). The
 * `mode` prop drives the nav chrome only; the page body is identical everywhere.
 *
 * Numbers are user-facing here by explicit product decision
 * (riskScoreExposurePolicy → VETTING_SECURITY_SCORE_EXCEPTION): this page is the
 * only permitted surface, and the label is always "Security score". The page
 * renders static display copy and imports no scoring module.
 */
import { useRef, useState } from "react";
import { dashboardState as connected } from "../state/dashboardState";
import {
  VETTING_TITLE,
  VETTING_DESCRIPTION,
  VETTING_SCORES_TITLE,
  VETTING_SCORE_ROWS,
  type SecurityScoreRow,
} from "../state/vettingState";
import GlobalNav from "../components/GlobalNav";
import DemoHeader from "../components/DemoHeader";
import PageHeader from "../components/PageHeader";
import AssetIdentity from "../components/AssetIdentity";
import Badge from "../components/Badge";
import VettingDetailDrawer from "../components/VettingDetailDrawer";
import jitoIconUrl from "../../../assets/icons/protocol/jito.svg";
import kaminoIconUrl from "../../../assets/icons/protocol/kamino.svg";
import jupiterIconUrl from "../../../assets/icons/protocol/jupiter.svg";
import marinadeIconUrl from "../../../assets/icons/protocol/marinade.svg";
import sanctumIconUrl from "../../../assets/icons/protocol/sanctum.svg";
import orcaIconUrl from "../../../assets/icons/protocol/orca.svg";
import raydiumIconUrl from "../../../assets/icons/protocol/raydium.svg";
import meteoraIconUrl from "../../../assets/icons/protocol/meteora.svg";
import blazestakeIconUrl from "../../../assets/icons/protocol/blazestake.png";
import solIconUrl from "../../../assets/icons/token/sol.svg";

const PROTOCOL_ICONS: Record<string, string> = {
  blazestake: blazestakeIconUrl,
  jito: jitoIconUrl,
  kamino: kaminoIconUrl,
  jupiter: jupiterIconUrl,
  marinade: marinadeIconUrl,
  sanctum: sanctumIconUrl,
  orca: orcaIconUrl,
  raydium: raydiumIconUrl,
  meteora: meteoraIconUrl,
  sol: solIconUrl,
};

/**
 * Score chip tone: the aggregate reads green above 5 and amber below — a quick sense
 * of where the evidence landed, without implying an approval decision. A tinted chip
 * (components/badge.md) keeps the two bands legible; the number is never colour-only.
 */
const scoreTone = (total: string): "success" | "warning" | "neutral" => {
  const value = Number.parseFloat(total);
  if (!Number.isFinite(value)) return "neutral";
  return value > 5 ? "success" : "warning";
};

interface Props {
  onNavigate: (id: string) => void;
  onDisconnect: () => void;
  /** "connected" (wallet pill), "disconnected" (Connect Wallet / Try Demo), or
   *  "demo" (blue demo banner + demo nav). */
  mode?: "connected" | "disconnected" | "demo";
  /** While onboarding/disconnected, Portfolio & Goal stay gated in the nav. */
  onboardingActive?: boolean;
  onConnectWallet?: () => void;
  onTryDemo?: () => void;
  /** Demo Mode only: exit back to the disconnected app. */
  onExitDemo?: () => void;
}

export default function VettingPage({
  onNavigate,
  onDisconnect,
  mode = "connected",
  onboardingActive,
  onConnectWallet,
  onTryDemo,
  onExitDemo,
}: Props) {
  const isDemo = mode === "demo";
  const isConnected = mode === "connected";
  const [detailRow, setDetailRow] = useState<SecurityScoreRow | null>(null);
  /** The row element that opened the drawer — focus returns here on close. */
  const detailTriggerRef = useRef<HTMLElement | null>(null);

  const openDetail = (row: SecurityScoreRow, trigger: HTMLElement) => {
    detailTriggerRef.current = trigger;
    setDetailRow(row);
  };
  const closeDetail = () => {
    setDetailRow(null);
    detailTriggerRef.current?.focus();
    detailTriggerRef.current = null;
  };

  return (
    <div className="app-shell">
      {isDemo ? (
        <DemoHeader
          activePage="vetting"
          // No Vetting-specific Smith AI content exists yet — no dead trigger.
          askAvailable={false}
          onExitDemo={onExitDemo ?? (() => {})}
          onConnectWallet={onConnectWallet ?? (() => {})}
          onNavigate={onNavigate}
        />
      ) : (
        <GlobalNav
          mode={mode}
          nav={connected.global_nav}
          wallet={isConnected ? connected.wallet : undefined}
          navLabel={connected.accessibility.global_nav_label}
          walletPillLabel={isConnected ? connected.accessibility.wallet_pill_label : undefined}
          askSmithAiLabel={connected.global_nav.right_actions.ask_smith_ai.accessibility_label}
          // No Vetting-specific Smith AI content exists yet — no dead trigger.
          askAvailable={false}
          activePage="vetting"
          onboardingActive={onboardingActive}
          onNavigate={onNavigate}
          onDisconnect={onDisconnect}
          onConnectWallet={onConnectWallet}
          onTryDemo={onTryDemo}
        />
      )}

      <div className="dashboard dashboard--single">
        <main className="dashboard__main">
          <PageHeader header={{ title: VETTING_TITLE, description: VETTING_DESCRIPTION }} />

          {/* Security scores — the recorded per-dimension numbers, one row per
              vetted product, sorted by protocol name. */}
          <section className="dash-section" aria-label={VETTING_SCORES_TITLE}>
            <div className="card">
              {/* Scroll wrapper is a mobile-only safety net — at desktop widths the
                  five fixed columns always fit the card. */}
              <div className="portfolio-table__scroll">
              <table className="portfolio-table vetting-scores-table" aria-label={VETTING_SCORES_TITLE}>
                {/* Fixed 5-column grid — fits the card with no horizontal scroll;
                    the per-dimension detail lives in the row's drawer. */}
                <colgroup>
                  <col style={{ width: "24%" }} />
                  <col style={{ width: "36%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "20%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col" className="portfolio-table__cell portfolio-table__header">Protocol</th>
                    <th scope="col" className="portfolio-table__cell portfolio-table__header">Product</th>
                    <th scope="col" className="portfolio-table__cell portfolio-table__header">Last vetting date</th>
                    <th scope="col" className="portfolio-table__cell portfolio-table__header portfolio-table__cell--right">Security score</th>
                  </tr>
                </thead>
                <tbody>
                  {VETTING_SCORE_ROWS.map((r) => (
                    <tr
                      key={`${r.protocol}-${r.product}`}
                      className="vetting-scores-table__row"
                      tabIndex={0}
                      aria-label={`View vetting details for ${r.protocol} ${r.product}`}
                      onClick={(e) => openDetail(r, e.currentTarget)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openDetail(r, e.currentTarget);
                        }
                      }}
                    >
                      <td className="portfolio-table__cell vetting-scores-table__protocol">
                        <AssetIdentity iconUrl={PROTOCOL_ICONS[r.icon] ?? null} label={r.protocol} />
                      </td>
                      <td className="portfolio-table__cell vetting-scores-table__product">{r.product}</td>
                      <td className="portfolio-table__cell vetting-scores-table__date">{r.vettedOn}</td>
                      <td className="portfolio-table__cell portfolio-table__cell--right">
                        <Badge label={r.total} tone={scoreTone(r.total)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </section>
        </main>
      </div>

      {detailRow && (
        <VettingDetailDrawer
          row={detailRow}
          iconUrl={PROTOCOL_ICONS[detailRow.icon] ?? null}
          onClose={closeDetail}
        />
      )}
    </div>
  );
}
