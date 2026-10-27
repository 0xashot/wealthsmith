/**
 * VettingDetailDrawer — right-side drawer opened by clicking a row on the
 * Trust → Vetting Security-scores table. Shows the full recorded detail for one
 * vetted product: the aggregate Security score, vetting date, the recorded
 * outcome reason, and the per-dimension score breakdown (with each dimension's
 * plain-language explanation). The approval outcome is deliberately not shown.
 *
 * Display copy only (state/vettingState.ts) — imports no scoring module.
 * Closes on backdrop click, Escape, or the close button; focus lands on the
 * close button on open, and the page restores focus to the source row.
 */
import { useEffect, useRef, useState } from "react";
import type { SecurityScoreRow } from "../state/vettingState";
import {
  SECURITY_SCORE_DIMENSIONS,
  VETTING_DRAWER_SCORE_LABEL,
  VETTING_DRAWER_DATE_LABEL,
  VETTING_DRAWER_BREAKDOWN_TITLE,
  VETTING_DRAWER_NO_BREAKDOWN,
  VETTING_DRAWER_WHY_LABEL,
  VETTING_DRAWER_HELD_LABEL,
} from "../state/vettingState";
import { VETTING_SCORE_DETAILS } from "../state/vettingScoreDetails";
import AssetIdentity from "./AssetIdentity";
import ButtonIcon from "./ButtonIcon";
import InfoPopover from "./InfoPopover";
import ButtonIconChevron from "./ButtonIcon";
import { useScrollLock } from "./useScrollLock";
import closeUrl from "../../../assets/icons/ui/close.svg";
import chevronDownUrl from "../../../assets/icons/ui/chevron-down.svg";

/**
 * Renders approved copy that may carry **double-asterisk** emphasis. Splitting on the
 * marker keeps this to plain text + <strong> — no markdown parser, no HTML injection.
 */
function EmphasisText({ text }: { text: string }) {
  return (
    <>
      {text.split("**").map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part))}
    </>
  );
}

/** Progress-bar tone per score — mirrors the rubric's anchor bands: supported
 *  (7–10) reads secure/green, partial (5–6) medium/yellow, weak and below (0–4)
 *  not secure/red. Never the only signal — the numeric score sits beside it. */
const barToneForScore = (score: number): "success" | "warning" | "danger" =>
  score >= 7 ? "success" : score >= 5 ? "warning" : "danger";

interface Props {
  row: SecurityScoreRow;
  /** Resolved protocol icon URL (the page owns the icon map). */
  iconUrl: string | null;
  onClose: () => void;
}

export default function VettingDetailDrawer({ row, iconUrl, onClose }: Props) {
  useScrollLock();
  const closeRef = useRef<HTMLButtonElement>(null);
  /** Which dimension rows are expanded to show the recorded score reasoning. */
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  const hasBreakdown = Object.keys(row.scores).length > 0;
  const details = VETTING_SCORE_DETAILS[`${row.protocol}|${row.product}`] ?? {};
  const toggle = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  return (
    <div
      className="vetting-drawer__backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${row.protocol} ${row.product} vetting details`}
        className="vetting-drawer"
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
      >
        <header className="vetting-drawer__header">
          <AssetIdentity iconUrl={iconUrl} label={row.protocol} sub={row.product} />
          <button ref={closeRef} type="button" className="vetting-drawer__close" aria-label="Close details" onClick={onClose}>
            <ButtonIcon src={closeUrl} />
          </button>
        </header>

        {/* Score / date summary — the approval outcome is deliberately not shown. */}
        <div className="vetting-drawer__meta">
          <span className="vetting-drawer__meta-item">
            <span className="vetting-drawer__meta-label">{VETTING_DRAWER_SCORE_LABEL}</span>
            <span className="vetting-drawer__meta-value">{row.total}</span>
          </span>
          <span className="vetting-drawer__meta-item">
            <span className="vetting-drawer__meta-label">{VETTING_DRAWER_DATE_LABEL}</span>
            <span className="vetting-drawer__meta-value">{row.vettedOn}</span>
          </span>
        </div>

        {/* The recorded outcome reason, when one exists — plain text, no heading. */}
        {row.resultReason && <p className="vetting-drawer__text">{row.resultReason}</p>}

        {/* Per-dimension breakdown, or the honest absence of one. */}
        <section className="vetting-drawer__section" aria-label={VETTING_DRAWER_BREAKDOWN_TITLE}>
          <h3 className="vetting-drawer__section-title">{VETTING_DRAWER_BREAKDOWN_TITLE}</h3>
          {hasBreakdown ? (
            <ul className="vetting-drawer__dims">
              {SECURITY_SCORE_DIMENSIONS.map((d) => {
                const v = row.scores[d.id];
                const numeric = typeof v === "number" ? v : null;
                const detail = details[d.id];
                const expandable = Boolean(detail?.why || detail?.held);
                const isOpen = expandable && Boolean(expanded[d.id]);
                return (
                  <li key={d.id} className={"vetting-drawer__dim" + (expandable ? " vetting-drawer__dim--expandable" : "")}>
                    {/* The whole header + bar toggles the reasoning; clicks on the
                        info icon (its own popover) are excluded. */}
                    <div
                      className="vetting-drawer__dim-toggle"
                      {...(expandable
                        ? {
                            role: "button" as const,
                            tabIndex: 0,
                            "aria-expanded": isOpen,
                            "aria-label": `${d.label} score reasoning`,
                            onClick: (e: React.MouseEvent) => {
                              if ((e.target as HTMLElement).closest(".info-popover")) return;
                              toggle(d.id);
                            },
                            onKeyDown: (e: React.KeyboardEvent) => {
                              if ((e.target as HTMLElement).closest(".info-popover")) return;
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                toggle(d.id);
                              }
                            },
                          }
                        : {})}
                    >
                      <div className="vetting-drawer__dim-head">
                        <span className="vetting-drawer__dim-label">
                          {d.label}
                          {d.info && (
                            // Viewport-fixed: the drawer scrolls, so an absolute
                            // popover would clip at its edge.
                            <InfoPopover label={`What ${d.label} means`} strategy="fixed">
                              <p className="info-popover__text">{d.info}</p>
                            </InfoPopover>
                          )}
                        </span>
                        <span className="vetting-drawer__dim-score">
                          {v === undefined ? "—" : v}
                          {expandable && (
                            <span className={"vetting-drawer__dim-chevron" + (isOpen ? " vetting-drawer__dim-chevron--open" : "")}>
                              <ButtonIconChevron src={chevronDownUrl} size={14} />
                            </span>
                          )}
                        </span>
                      </div>
                      {/* Score as a 0–10 bar, colored by security band; "?" and
                          unscored dimensions render an empty track. */}
                      <div
                        className="progress vetting-drawer__dim-bar"
                        role="img"
                        aria-label={numeric !== null ? `${d.label}: ${numeric} out of 10` : `${d.label}: not scored`}
                      >
                        {numeric !== null && (
                          <div
                            className={`progress__fill progress__fill--${barToneForScore(numeric)}`}
                            style={{ width: `${numeric * 10}%` }}
                          />
                        )}
                      </div>
                    </div>
                    {isOpen && detail && (
                      <div className="vetting-drawer__dim-detail">
                        {detail.why && (
                          <p className="vetting-drawer__dim-detail-text">
                            <strong>{VETTING_DRAWER_WHY_LABEL}:</strong> <EmphasisText text={detail.why} />
                          </p>
                        )}
                        {detail.held && (
                          <p className="vetting-drawer__dim-detail-text">
                            <strong>{VETTING_DRAWER_HELD_LABEL}:</strong> <EmphasisText text={detail.held} />
                          </p>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="vetting-drawer__text">{VETTING_DRAWER_NO_BREAKDOWN}</p>
          )}
        </section>
      </div>
    </div>
  );
}
