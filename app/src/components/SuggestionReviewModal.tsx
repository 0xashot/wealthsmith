/**
 * SuggestionReviewModal — renders a real-wallet suggestion's engine-owned
 * `reviewDetails` (Step 10A) in an accessible modal (Step 10B). It ONLY renders
 * structured data the engine already produced:
 *  - it never generates suggestions, runs AI, or invents APY/TVL/risk/liquidity/
 *    slippage/route/protocol data;
 *  - it never executes a transaction, requests a signature, moves funds, or
 *    hands off to a protocol — it is read-only;
 *  - it shows guardrails as friendly grouped labels, never raw internal codes.
 *
 * Reuses the shared `.modal` / `.modal-scrim` pattern (see ConnectWalletModal)
 * for consistent dialog semantics, focus handling, and theming.
 */
import { useEffect, useId, useRef } from "react";
import ButtonIcon from "./ButtonIcon";
import Badge from "./Badge";
import SolStakingLeaderExplanation from "./SolStakingLeaderExplanation";
import closeUrl from "../../../assets/icons/ui/close.svg";
import externalLinkUrl from "../../../assets/icons/ui/external-link.svg";
import { resolveTokenIcon, resolveProtocolIcon } from "../state/iconRegistry";
import fallbackTokenUrl from "../../../assets/icons/fallback/fallback-token.svg";
import type {
  ReviewMetric,
  SuggestionReviewDetails,
} from "../suggestions/engineTypes";
import type { ContributionPlanReviewDetails } from "../suggestions/contributionPlanReviewDetails";
import type { StableYieldReviewPresentation } from "../suggestions/yieldStrategyPlanPresentationTypes";

interface Props {
  /** The engine review details (existing suggestion families). Optional when `contributionReview` is set. */
  details?: SuggestionReviewDetails;
  /** Step 15H — plan-backed contribution review sections. When present, the modal renders these. */
  contributionReview?: ContributionPlanReviewDetails;
  /** Step 16H-C — deterministic Stable Yield review presentation. When present, the modal renders it. */
  stableYieldReview?: StableYieldReviewPresentation;
  isTopPick: boolean;
  onClose: () => void;
}

/** Whole-dollar USD, e.g. "$8,176". No fake precision. */
const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
/** At most one decimal, trailing ".0" trimmed. */
const num1 = (n: number) => {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
};
/** Token amount with thousands separators (portfolio-style), up to 6 decimals. */
const tokenAmount = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 6 });

/** Format a metric value using its kind/unit — never invents precision. */
function formatMetric(m: ReviewMetric): string {
  if (typeof m.value === "string") return m.value;
  switch (m.kind) {
    case "amount_usd":
      return usd(m.value);
    case "allocation_pct":
    case "percent":
      return `${num1(m.value)}%`;
    case "months":
      return `${num1(m.value)} months`;
    case "token_amount":
      return `${num1(m.value)}${m.unit ? ` ${m.unit}` : ""}`;
    case "count":
      return String(m.value);
    default:
      return `${m.value}${m.unit ? ` ${m.unit}` : ""}`;
  }
}

/** Format a calculation number by unit (USD / % / raw). */
function formatCalcValue(v: number, unit?: string): string {
  if (unit === "USD") return usd(v);
  if (unit === "%") return `${num1(v)}%`;
  return `${num1(v)}${unit ? ` ${unit}` : ""}`;
}

export default function SuggestionReviewModal({ details, contributionReview, stableYieldReview, isTopPick, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const reasonId = useId();

  // Focus the close button on open; restore focus + unlock scroll on close.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  // Escape to close + simple focus trap on Tab.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables || focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  // Step 16H-C — plan-backed Stable Yield review. Renders the deterministic Step 16H-B review view
  // model through the SAME shared modal shell (no new modal, no recalculation, no execution). The React
  // layer never computes an amount/APY/projection — it only places already-formatted strings into rows.
  if (stableYieldReview) {
    const r = stableYieldReview;
    // Whole amounts drop the ".00" (e.g. "$500"); cents are kept ("$1,234.56").
    const amtCompact = Number.isInteger(r.amountUsd)
      ? `$${r.amountUsd.toLocaleString("en-US")}`
      : `$${r.amountUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const whyBody = r.lane === "excess"
      ? `${amtCompact} of your direct-wallet USDC is above your required Safety Buffer, so you can review allocating it to this strategy.`
      : `${amtCompact} of your buffer-eligible USDC could earn yield while keeping your required Safety Buffer covered. You can review allocating it to this strategy.`;
    // "Suggested protocol to review" — only data-backed cards. Kamino lending has no TVL / 30-day APY / unstake
    // timing / fees (staking-only), and those are never invented; add them here only if real data appears.
    const protocolCards: [string, string][] = [
      ["Protocol", r.protocolName],
      ["Current APY", r.apy.display],
    ];
    const keyMetricCards: [string, string][] = [
      ["USDC", `${r.amountUsd.toLocaleString("en-US", { maximumFractionDigits: 2 })} USDC`],
      ["USDC Value", r.amountDisplay],
      ...(r.estimatedEarningsDisplay ? [["Estimated earnings", r.estimatedEarningsDisplay] as [string, string]] : []),
    ];
    const ext = r.externalLink;
    return (
      <div className="modal-scrim" onClick={onClose}>
        <div ref={dialogRef} className="modal review-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={reasonId} onKeyDown={onKeyDown} onClick={(e) => e.stopPropagation()}>
          <div className="modal__header">
            <div className="review-modal__heading">
              <div className="review-modal__eyebrow">
                {isTopPick && <Badge label="Top Pick" tone="info" />}
              </div>
              <h2 id={titleId} className="modal__title">{r.title}</h2>
            </div>
            <button ref={closeRef} type="button" className="modal__close" aria-label="Close review details" onClick={onClose}>
              <ButtonIcon src={closeUrl} size={18} />
            </button>
          </div>
          <div className="review-modal__body">
            <section className="review-modal__section" aria-label="Why this fits your plan">
              <h3 className="review-modal__section-title">Why this fits your plan</h3>
              <p id={reasonId} className="modal__intro">{whyBody}</p>
            </section>
            <section className="review-modal__section" aria-label="Suggested protocol to review">
              <h3 className="review-modal__section-title">Suggested protocol to review</h3>
              <dl className="review-modal__metrics">
                {protocolCards.map(([label, value]) => (
                  <div key={label} className="review-modal__metric">
                    <dt className="review-modal__metric-label">{label}</dt>
                    <dd className="review-modal__metric-value">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section className="review-modal__section" aria-label="Key metrics">
              <h3 className="review-modal__section-title">Key metrics</h3>
              <dl className="review-modal__metrics">
                {keyMetricCards.map(([label, value]) => (
                  <div key={label} className="review-modal__metric">
                    <dt className="review-modal__metric-label">{label}</dt>
                    <dd className="review-modal__metric-value">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section className="review-modal__section" aria-label="Involved assets">
              <h3 className="review-modal__section-title">Involved assets</h3>
              <div className="portfolio-table__scroll">
                <table className="portfolio-table">
                  <thead>
                    <tr>
                      <th scope="col" className="portfolio-table__cell portfolio-table__header">Asset</th>
                      <th scope="col" className="portfolio-table__cell portfolio-table__header portfolio-table__cell--right">Amount</th>
                      <th scope="col" className="portfolio-table__cell portfolio-table__header portfolio-table__cell--right">USD Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="portfolio-table__cell">
                        <span className="asset-identity">
                          <img className="asset-identity__icon" src={resolveTokenIcon("assets/icons/token/usdc.svg").url} alt="" width={24} height={24} aria-hidden="true" />
                          <a className="deploy-table__asset-link" href="https://solscan.io/token/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" target="_blank" rel="noopener noreferrer">USDC</a>
                        </span>
                      </td>
                      <td className="portfolio-table__cell portfolio-table__cell--right"><span className="portfolio-table__value">{tokenAmount(r.amountUsd)}</span></td>
                      <td className="portfolio-table__cell portfolio-table__cell--right"><span className="portfolio-table__value">{usd(r.amountUsd)}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
          {ext && (
            <div className="review-modal__footer review-modal__footer--actions">
              <button type="button" className="review-modal__tertiary-action" onClick={onClose}>Cancel</button>
              <a
                className="review-modal__primary-action"
                href={ext.url}
                {...(ext.opensInNewTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                aria-label={`${ext.ctaLabel}. Opens the protocol page in a new tab. No transaction is created.`}
              >
                <span>{ext.ctaLabel}</span>
                <ButtonIcon src={externalLinkUrl} />
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Step 15H — plan-backed contribution review. Renders the deterministic engine sections through the
  // SAME shared modal shell (no new modal component, no recalculation). Read-only; Close only.
  if (contributionReview) {
    const cr = contributionReview;
    return (
      <div className="modal-scrim" onClick={onClose}>
        <div ref={dialogRef} className="modal review-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={reasonId} onKeyDown={onKeyDown} onClick={(e) => e.stopPropagation()}>
          <div className="modal__header">
            <div className="review-modal__heading">
              <div className="review-modal__eyebrow">
                {isTopPick && <Badge label="Top Pick" tone="info" />}
              </div>
              <h2 id={titleId} className="modal__title">{cr.title}</h2>
            </div>
            <button ref={closeRef} type="button" className="modal__close" aria-label="Close review details" onClick={onClose}>
              <ButtonIcon src={closeUrl} size={18} />
            </button>
          </div>
          <div className="review-modal__body">
            <section className="review-modal__section" aria-label="Why this fits your plan">
              <h3 className="review-modal__section-title">Why this fits your plan</h3>
              <p id={reasonId} className="modal__intro">{cr.whySection.body}</p>
            </section>
            {cr.keyMetrics.length > 0 && (
              <section className="review-modal__section" aria-label="Key metrics">
                <h3 className="review-modal__section-title">Key metrics</h3>
                <dl className="review-modal__metrics">
                  {cr.keyMetrics.map((m, i) => (
                    <div key={`${m.label}-${i}`} className="review-modal__metric">
                      <dt className="review-modal__metric-label">{m.label}</dt>
                      <dd className="review-modal__metric-value">{m.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!details) return null;
  const { summary, metrics, involvedAssets, involvedPositions, calculations, guardrailSummary } = details;

  const guardrailGroups: {
    title: string;
    tone: "checked" | "pending" | "na";
    hint?: string;
    items: string[];
  }[] = [
    { title: "Checked", tone: "checked" as const, items: guardrailSummary.checked },
    {
      title: "Not evaluated yet",
      tone: "pending" as const,
      hint: "These need market data WealthSmith doesn't have yet — they are not failures.",
      items: guardrailSummary.notEvaluated,
    },
    { title: "Not applicable", tone: "na" as const, items: guardrailSummary.notApplicable },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal review-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={reasonId}
        onKeyDown={onKeyDown}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__header">
          <div className="review-modal__heading">
            <div className="review-modal__eyebrow">
              {isTopPick && <Badge label="Top Pick" tone="info" />}
            </div>
            <h2 id={titleId} className="modal__title">
              {summary.title}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="modal__close"
            aria-label="Close review details"
            onClick={onClose}
          >
            <ButtonIcon src={closeUrl} size={18} />
          </button>
        </div>

        <div className="review-modal__body">
          {details.demoLabel && (
            <div className="review-modal__demo-badge">
              <Badge label={details.demoLabel} tone="warning" />
            </div>
          )}
          <p id={reasonId} className="modal__intro">
            {summary.reason}
          </p>

          {details.protocolSelectionDisplay && (
            /* Presented like the Key metrics grid: one card per protocol data point (Protocol + market data). */
            <section className="review-modal__section" aria-label="Suggested protocol">
              <h3 className="review-modal__section-title">{details.protocolSelectionDisplay.label}</h3>
              <dl className="review-modal__metrics">
                {(() => {
                  const disp = details.protocolSelectionDisplay;
                  const md = disp.marketData;
                  const cards: [string, string][] = [
                    ["Protocol", `${disp.protocolName}${disp.assetSymbol ? ` · ${disp.assetSymbol}` : ""}`],
                  ];
                  if (md) {
                    cards.push(
                      ["TVL", `$${(md.tvlUsd / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 2 })}M`],
                      ["Current APY", `${md.apyPct}%`],
                      ["30-day APY", `${md.apy30dPct}%`],
                      ["Direct unstake", `~${md.directUnstakeTimeHours} hours`],
                      ["Direct unstake fee", `${md.directUnstakeFeePct}%`],
                      ["Annual management fee", `${md.annualManagementFeePct}% on ${md.annualManagementFeeAppliesTo}`],
                    );
                  }
                  return cards.map(([label, value]) => (
                    <div key={label} className="review-modal__metric">
                      <dt className="review-modal__metric-label">{label}</dt>
                      <dd className="review-modal__metric-value">{value}</dd>
                    </div>
                  ));
                })()}
              </dl>
            </section>
          )}

          {metrics.length > 0 && (
            <section className="review-modal__section" aria-label="Key metrics">
              <h3 className="review-modal__section-title">Key metrics</h3>
              <dl className="review-modal__metrics">
                {metrics.map((m) => (
                  <div key={m.label} className="review-modal__metric">
                    <dt className="review-modal__metric-label">{m.label}</dt>
                    <dd className="review-modal__metric-value">{formatMetric(m)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {involvedAssets.length > 0 && (
            /* Every review modal presents involved assets like the Portfolio "Liquid Assets" table: a header
               row (Asset / Amount / USD Value) then a token icon + a symbol linking to the read-only Solscan
               token page (when a mint is known). Read-only identity only — never implies the asset can move. */
            <section className="review-modal__section" aria-label="Involved assets">
              <h3 className="review-modal__section-title">Involved assets</h3>
              <div className="portfolio-table__scroll">
                <table className="portfolio-table">
                  <thead>
                    <tr>
                      <th scope="col" className="portfolio-table__cell portfolio-table__header">Asset</th>
                      <th scope="col" className="portfolio-table__cell portfolio-table__header portfolio-table__cell--right">Amount</th>
                      <th scope="col" className="portfolio-table__cell portfolio-table__header portfolio-table__cell--right">USD Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {involvedAssets.map((a, i) => {
                      const iconUrl = a.icon ? resolveTokenIcon(a.icon).url : fallbackTokenUrl;
                      const url = a.mint ? `https://solscan.io/token/${a.mint}` : undefined;
                      return (
                        <tr key={`${a.symbol}-${i}`}>
                          <td className="portfolio-table__cell">
                            <span className="asset-identity">
                              <img className="asset-identity__icon" src={iconUrl} alt="" width={24} height={24} aria-hidden="true" />
                              {url ? (
                                <a className="deploy-table__asset-link" href={url} target="_blank" rel="noopener noreferrer">{a.symbol}</a>
                              ) : (
                                <span className="asset-identity__name">{a.symbol}</span>
                              )}
                            </span>
                          </td>
                          <td className="portfolio-table__cell portfolio-table__cell--right">
                            <span className="portfolio-table__value">{typeof a.amount === "number" ? tokenAmount(a.amount) : "—"}</span>
                          </td>
                          <td className="portfolio-table__cell portfolio-table__cell--right">
                            <span className="portfolio-table__value">{typeof a.valueUsd === "number" ? usd(a.valueUsd) : "—"}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {involvedPositions.length > 0 && (
            /* Rendered like the Portfolio "Involved assets"/"Staked Assets" table: Protocol (logo + name
               linking to the protocol page) / APY / USD Value / a review-only "Manage" handoff (new tab). */
            <section className="review-modal__section" aria-label="Involved positions">
              <h3 className="review-modal__section-title">Involved positions</h3>
              <div className="portfolio-table__scroll">
                <table className="portfolio-table">
                  <thead>
                    <tr>
                      <th scope="col" className="portfolio-table__cell portfolio-table__header">Protocol</th>
                      <th scope="col" className="portfolio-table__cell portfolio-table__header portfolio-table__cell--right">APY</th>
                      <th scope="col" className="portfolio-table__cell portfolio-table__header portfolio-table__cell--right">USD Value</th>
                      <th scope="col" className="portfolio-table__cell portfolio-table__header portfolio-table__cell--right"><span className="sr-only">Manage</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {involvedPositions.map((p, i) => {
                      // Approved protocol logo only — resolveProtocolIcon returns null (render nothing) when missing.
                      const protocolIcon = p.iconPath ? resolveProtocolIcon(p.iconPath) : null;
                      const name = p.reviewLink?.label ?? p.protocol ?? p.name ?? p.symbol ?? "Position";
                      const url = p.reviewLink?.url;
                      return (
                        <tr key={`${p.protocol ?? "pos"}-${i}`}>
                          <td className="portfolio-table__cell">
                            <span className="asset-identity">
                              {protocolIcon && <img className="asset-identity__icon" src={protocolIcon} alt="" width={24} height={24} aria-hidden="true" />}
                              {url ? (
                                <a className="deploy-table__asset-link" href={url} target="_blank" rel="noopener noreferrer">{name}</a>
                              ) : (
                                <span className="asset-identity__name">{name}</span>
                              )}
                            </span>
                          </td>
                          <td className="portfolio-table__cell portfolio-table__cell--right">
                            <span className="portfolio-table__value">{typeof p.apy === "number" ? `${num1(p.apy)}%` : "—"}</span>
                          </td>
                          <td className="portfolio-table__cell portfolio-table__cell--right">
                            <span className="portfolio-table__value">{typeof p.valueUsd === "number" ? usd(p.valueUsd) : "—"}</span>
                          </td>
                          <td className="portfolio-table__cell portfolio-table__cell--right">
                            {url && (
                              <a
                                className="portfolio-table__manage"
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Manage on ${name} in a new tab. No transaction is created.`}
                              >
                                <span>Manage</span>
                                <ButtonIcon src={externalLinkUrl} />
                              </a>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {calculations.length > 0 && (
            <section className="review-modal__section" aria-label="How this was calculated">
              <h3 className="review-modal__section-title">How this was calculated</h3>
              <ul className="review-modal__list">
                {calculations.map((c, i) => (
                  <li key={`${c.label}-${i}`} className="review-modal__calc">
                    <span className="review-modal__calc-label">{c.label}</span>
                    {c.formula && <span className="review-modal__calc-formula">{c.formula}</span>}
                    <span className="review-modal__calc-values">
                      {typeof c.currentValue === "number" && (
                        <span>Current {formatCalcValue(c.currentValue, c.unit)}</span>
                      )}
                      {typeof c.targetValue === "number" && (
                        <span>Target {formatCalcValue(c.targetValue, c.unit)}</span>
                      )}
                      {typeof c.difference === "number" && (
                        <span>Difference {formatCalcValue(c.difference, c.unit)}</span>
                      )}
                      {typeof c.threshold === "number" && (
                        <span>Threshold {formatCalcValue(c.threshold, c.unit)}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {guardrailGroups.length > 0 && (
            <section className="review-modal__section" aria-label="Guardrails">
              <h3 className="review-modal__section-title">Guardrails</h3>
              <div className="review-modal__guardrails">
                {guardrailGroups.map((g) => (
                  <div
                    key={g.title}
                    className={`review-modal__guardrail-group review-modal__guardrail-group--${g.tone}`}
                  >
                    <p className="review-modal__guardrail-title">{g.title}</p>
                    {g.hint && <p className="review-modal__guardrail-hint">{g.hint}</p>}
                    <ul className="review-modal__chips">
                      {g.items.map((item) => (
                        <li key={item} className="review-modal__chip">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          {details.routeEvaluation && (
            <section className="review-modal__section" aria-label="Route and execution checks">
              <h3 className="review-modal__section-title">{details.routeEvaluation.title}</h3>
              <p className="review-modal__source-status">{details.routeEvaluation.sourceStatusLabel}</p>
              <div className="review-modal__guardrails">
                {details.routeEvaluation.groups.map((g) => (
                  <div
                    key={g.title}
                    className={`review-modal__guardrail-group review-modal__guardrail-group--${
                      g.tone === "checked" ? "checked" : g.tone === "na" ? "na" : "pending"
                    }`}
                  >
                    <p className="review-modal__guardrail-title">{g.title}</p>
                    <ul className="review-modal__chips">
                      {g.items.map((item) => (
                        <li key={item} className="review-modal__chip">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <p className="review-modal__guardrail-hint">{details.routeEvaluation.explanation}</p>
            </section>
          )}

          {/* The generic "Not evaluated yet" limitations block and the "Safety" review-only notes block were
              removed from every review modal by request — the page/card already frame these as read-only. */}

          {/* READ-ONLY external handoff (Step 13J) moved to the sticky modal footer below. */}

          {/* READ-ONLY dynamic "Current comparison" (Step 14Y/14Z) — the current Step 14W leader
              plus the deterministic "Why this protocol currently leads" analysis. Not activation,
              not the engine Top Pick, and never changes the selected protocol. */}
          {details.selectorPresentation && (
            <SolStakingLeaderExplanation presentation={details.selectorPresentation} />
          )}

          {/* READ-ONLY "Other protocols to review" (Step 14L). Approved alternative
              candidates shown for review only — never the selected protocol/winner,
              and never an execution path. */}
          {details.otherProtocolsToReview && details.otherProtocolsToReview.length > 0 && (
            <section className="review-modal__section review-modal__alternatives" aria-label="Other protocols to review">
              <h3 className="review-modal__section-title">Other protocols to review</h3>
              {details.protocolSelectionDisplay && (
                <p className="review-modal__alt-selected">
                  Currently selected protocol: {details.protocolSelectionDisplay.protocolName}
                  {details.protocolSelectionDisplay.assetSymbol ? ` · ${details.protocolSelectionDisplay.assetSymbol}` : ""}
                </p>
              )}
              {details.otherProtocolsToReview.map((c) => (
                <div key={c.protocolId} className="review-modal__alt-card">
                  <p className="review-modal__alt-name">
                    {c.protocolName}
                    {c.assetSymbol ? ` · ${c.assetSymbol}` : ""}
                  </p>
                  <p className="review-modal__alt-role">{c.roleLabel} — {c.statusLabel}</p>
                  {c.candidateType === "native_staking" && (c.notLstLabel || c.nativeStakeAccountLabel) && (
                    <p className="review-modal__alt-note">{[c.notLstLabel, c.nativeStakeAccountLabel].filter(Boolean).join(" · ")}</p>
                  )}
                  {/*
                    Step 16H-K.1 — the numeric Risk Suitability Score is INTERNAL ONLY, by explicit
                    product-owner decision. It previously rendered here as "Risk score: X.XX / 10
                    (assigned for review)", which exposed the aggregate, the scale, and an internal
                    review state to users. Users get approved qualitative disclosures instead (see
                    `riskScoreExposurePolicy.ts`); the score itself drives eligibility/comparison
                    internally and is never shown. An exposure-scan fixture keeps it out.
                  */}
                  {c.marketData && (
                    <dl className="review-modal__market">
                      {typeof c.delegatedStakeSol === "number" && (
                        <div className="review-modal__market-row"><dt>Delegated stake</dt><dd>{`${c.delegatedStakeSol.toLocaleString("en-US", { maximumFractionDigits: 2 })} SOL`}</dd></div>
                      )}
                      {typeof c.marketData.tvlUsd === "number" && (
                        <div className="review-modal__market-row"><dt>TVL</dt><dd>{`$${(c.marketData.tvlUsd / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 2 })}M`}</dd></div>
                      )}
                      {typeof c.marketData.apyPct === "number" && (
                        <div className="review-modal__market-row"><dt>Current APY</dt><dd>{`${c.marketData.apyPct}%`}</dd></div>
                      )}
                      {typeof c.marketData.apy30dPct === "number" && (
                        <div className="review-modal__market-row"><dt>30-day APY</dt><dd>{`${c.marketData.apy30dPct}%`}</dd></div>
                      )}
                      {c.mechanics?.unstakeTiming && (
                        <div className="review-modal__market-row"><dt>Unstake timing</dt><dd>{c.mechanics.unstakeTiming}</dd></div>
                      )}
                      {typeof c.mechanics?.directUnstakeFeePct === "number" && (
                        <div className="review-modal__market-row"><dt>Direct unstake fee</dt><dd>{`${c.mechanics.directUnstakeFeePct}%`}</dd></div>
                      )}
                      {typeof c.mechanics?.annualManagementFeePct === "number" && (
                        <div className="review-modal__market-row"><dt>Annual management fee</dt><dd>{`${c.mechanics.annualManagementFeePct}% on rewards`}</dd></div>
                      )}
                      {typeof c.validatorCommissionPct === "number" && (
                        <div className="review-modal__market-row"><dt>Validator commission</dt><dd>{`${c.validatorCommissionPct}%`}</dd></div>
                      )}
                    </dl>
                  )}
                  {c.apy30dMethodology && (
                    <p className="review-modal__alt-note">{c.apy30dMethodology}</p>
                  )}
                  {c.evidence && (c.evidence.auditSecurity || c.evidence.operationalRisk || c.evidence.incidentReview) && (
                    <ul className="review-modal__bullets">
                      {c.evidence.auditSecurity && <li>Audit &amp; security: {c.evidence.auditSecurity}</li>}
                      {c.evidence.operationalRisk && <li>Operational risk: {c.evidence.operationalRisk}</li>}
                      {c.evidence.incidentReview && <li>Incident review: {c.evidence.incidentReview}</li>}
                    </ul>
                  )}
                  <p className="review-modal__alt-status">Not selected by protocol logic yet.</p>
                  <p className="review-modal__alt-note">Final protocol selection will happen later through deterministic WealthSmith protocol logic.</p>
                  <p className="review-modal__alt-note">Review only — WealthSmith will not move funds for you.</p>
                  {c.externalReviewLink && (
                    <a
                      className="review-modal__external"
                      href={c.externalReviewLink.url}
                      {...(c.externalReviewLink.opensNewTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      aria-label={`${c.externalReviewLink.label}. Opens the protocol page in a new tab. No transaction is created.`}
                    >
                      <span>{c.externalReviewLink.label}</span>
                      <ButtonIcon src={externalLinkUrl} />
                    </a>
                  )}
                </div>
              ))}
            </section>
          )}
        </div>
        {/* Sticky footer — shown only when a read-only protocol link is available. Cancel closes the modal;
            the primary button opens the protocol's own page in a new tab (no in-app transaction/signature). */}
        {details.externalLink && (
          <div className="review-modal__footer review-modal__footer--actions">
            <button type="button" className="review-modal__tertiary-action" onClick={onClose}>
              Cancel
            </button>
            <a
              className="review-modal__primary-action"
              href={details.externalLink.url}
              {...(details.externalLink.opensInNewTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              aria-label={`${details.externalLink.ctaLabel ?? details.externalLink.label}. Opens the protocol page in a new tab. No transaction is created.`}
            >
              <span>{details.externalLink.ctaLabel ?? details.externalLink.label}</span>
              <ButtonIcon src={externalLinkUrl} />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
