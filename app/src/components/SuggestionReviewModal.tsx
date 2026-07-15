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
import type {
  ReviewAssetRole,
  ReviewMetric,
  ReviewPositionRole,
  SuggestionReviewDetails,
} from "../suggestions/engineTypes";
import type { ContributionPlanReviewDetails } from "../suggestions/contributionPlanReviewDetails";

interface Props {
  /** The engine review details (existing suggestion families). Optional when `contributionReview` is set. */
  details?: SuggestionReviewDetails;
  /** Step 15H — plan-backed contribution review sections. When present, the modal renders these. */
  contributionReview?: ContributionPlanReviewDetails;
  isTopPick: boolean;
  onClose: () => void;
}

const ASSET_ROLE_LABELS: Record<ReviewAssetRole, string> = {
  source_asset: "Source",
  target_bucket: "Target",
  idle_asset: "Idle asset",
  long_tail_asset: "Long-tail asset",
  stablecoin: "Stablecoin",
  liquid_sol: "Liquid SOL",
  buffer_asset: "Buffer asset",
  dca_source: "Contribution source",
};

const POSITION_ROLE_LABELS: Record<ReviewPositionRole, string> = {
  yield_position: "Yield position",
  staked_position: "Staked position",
  concentrated_position: "Concentrated position",
  missing_apy_position: "Missing APY data",
  low_yield_position: "Low reported APY",
  duplicate_exposure_position: "Similar exposure",
};

/** Whole-dollar USD, e.g. "$8,176". No fake precision. */
const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
/** At most one decimal, trailing ".0" trimmed. */
const num1 = (n: number) => {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
};

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

export default function SuggestionReviewModal({ details, contributionReview, isTopPick, onClose }: Props) {
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

  // Step 15H — plan-backed contribution review. Renders the deterministic engine sections through the
  // SAME shared modal shell (no new modal component, no recalculation). Read-only; Close only.
  if (contributionReview) {
    const cr = contributionReview;
    const rowList = (rows: { label: string; value: string }[], label: string) => (
      <dl className="review-modal__rows" aria-label={label}>
        {rows.map((r, i) => (
          <div key={`${r.label}-${i}`} className="review-modal__row">
            <dt>{r.label}</dt>
            <dd>{r.value}</dd>
          </div>
        ))}
      </dl>
    );
    return (
      <div className="modal-scrim" onClick={onClose}>
        <div ref={dialogRef} className="modal review-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={reasonId} onKeyDown={onKeyDown} onClick={(e) => e.stopPropagation()}>
          <div className="modal__header">
            <div className="review-modal__heading">
              <div className="review-modal__eyebrow">
                <p className="review-modal__category">Contribution plan</p>
                {isTopPick && <Badge label="Top Pick" tone="info" />}
              </div>
              <h2 id={titleId} className="modal__title">{cr.title}</h2>
            </div>
            <button ref={closeRef} type="button" className="modal__close" aria-label="Close review details" onClick={onClose}>
              <ButtonIcon src={closeUrl} size={18} />
            </button>
          </div>
          <div className="review-modal__body">
            {cr.summaryRows.length > 0 && (
              <section className="review-modal__section" aria-label="Summary">{rowList(cr.summaryRows, "Summary")}</section>
            )}
            <section className="review-modal__section" aria-label={cr.whySection.title}>
              <h3 className="review-modal__section-title">{cr.whySection.title}</h3>
              <p id={reasonId} className="modal__intro">{cr.whySection.body}</p>
            </section>
            {cr.cadenceSection && (
              <section className="review-modal__section" aria-label={cr.cadenceSection.title}>
                <h3 className="review-modal__section-title">{cr.cadenceSection.title}</h3>
                {rowList(cr.cadenceSection.rows, cr.cadenceSection.title)}
              </section>
            )}
            {cr.scheduleSection && (
              <section className="review-modal__section" aria-label={cr.scheduleSection.title}>
                <h3 className="review-modal__section-title">{cr.scheduleSection.title}</h3>
                <ol className="review-modal__schedule">
                  {cr.scheduleSection.steps.map((s, i) => (
                    <li key={`${s.label}-${i}`} className="review-modal__schedule-step">
                      <span className="review-modal__schedule-when">{s.label}</span>
                      <span className="review-modal__schedule-amount">{s.amount}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}
            {cr.allocationSection && (
              <section className="review-modal__section" aria-label={cr.allocationSection.title}>
                <h3 className="review-modal__section-title">{cr.allocationSection.title}</h3>
                {rowList(cr.allocationSection.rows, cr.allocationSection.title)}
              </section>
            )}
            <section className="review-modal__section" aria-label={cr.safetyBufferSection.title}>
              <h3 className="review-modal__section-title">{cr.safetyBufferSection.title}</h3>
              {rowList(cr.safetyBufferSection.rows, cr.safetyBufferSection.title)}
            </section>
            <section className="review-modal__section" aria-label={cr.fundingSection.title}>
              <h3 className="review-modal__section-title">{cr.fundingSection.title}</h3>
              {rowList(cr.fundingSection.rows, cr.fundingSection.title)}
            </section>
            {cr.alternativeSourceSection && (
              <section className="review-modal__section" aria-label={cr.alternativeSourceSection.title}>
                <h3 className="review-modal__section-title">{cr.alternativeSourceSection.title}</h3>
                {rowList(cr.alternativeSourceSection.rows, cr.alternativeSourceSection.title)}
              </section>
            )}
            {cr.unallocatedSection && (
              <section className="review-modal__section" aria-label={cr.unallocatedSection.title}>
                <h3 className="review-modal__section-title">{cr.unallocatedSection.title}</h3>
                {rowList(cr.unallocatedSection.rows, cr.unallocatedSection.title)}
              </section>
            )}
            <section className="review-modal__section review-modal__safety" aria-label="Read-only notice">
              <p className="review-modal__readonly-notice">{cr.readOnlyNotice}</p>
            </section>
          </div>
          <div className="review-modal__footer">
            <button type="button" className="review-modal__close-action" onClick={onClose}>{cr.closeLabel}</button>
          </div>
        </div>
      </div>
    );
  }

  if (!details) return null;
  const { summary, metrics, involvedAssets, involvedPositions, calculations, guardrailSummary, limitations, safetyNotes } = details;

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
              <p className="review-modal__category">{summary.categoryLabel}</p>
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
            <section className="review-modal__section" aria-label="Suggested protocol">
              <p className="review-modal__section-title">{details.protocolSelectionDisplay.label}</p>
              <p className="review-modal__protocol">
                {details.protocolSelectionDisplay.protocolName}
                {details.protocolSelectionDisplay.assetSymbol ? ` · ${details.protocolSelectionDisplay.assetSymbol}` : ""}
              </p>
              {details.protocolSelectionDisplay.sourceStatusLabel && (
                <p className="review-modal__source-status">{details.protocolSelectionDisplay.sourceStatusLabel}</p>
              )}
              {details.protocolSelectionDisplay.marketData && (
                <dl className="review-modal__market">
                  {(() => {
                    const md = details.protocolSelectionDisplay.marketData;
                    const rows: [string, string][] = [
                      ["TVL", `$${(md.tvlUsd / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 2 })}M`],
                      ["Current APY", `${md.apyPct}%`],
                      ["30-day APY", `${md.apy30dPct}%`],
                      ["Direct unstake", `~${md.directUnstakeTimeHours} hours`],
                      ["Direct unstake fee", `${md.directUnstakeFeePct}%`],
                      ["Annual management fee", `${md.annualManagementFeePct}% on ${md.annualManagementFeeAppliesTo}`],
                    ];
                    return rows.map(([label, value]) => (
                      <div key={label} className="review-modal__market-row">
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ));
                  })()}
                </dl>
              )}
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
            <section className="review-modal__section" aria-label="Involved assets">
              <h3 className="review-modal__section-title">Involved assets</h3>
              <ul className="review-modal__list">
                {involvedAssets.map((a, i) => (
                  <li key={`${a.symbol}-${i}`} className="review-modal__row">
                    <span className="review-modal__row-main">
                      <span className="review-modal__row-symbol">{a.symbol}</span>
                      {a.name && a.name !== a.symbol && (
                        <span className="review-modal__row-sub">{a.name}</span>
                      )}
                    </span>
                    <span className="review-modal__row-meta">
                      {typeof a.amount === "number" && (
                        <span>{num1(a.amount)}</span>
                      )}
                      {typeof a.valueUsd === "number" && <span>{usd(a.valueUsd)}</span>}
                      <span className="review-modal__tag">{ASSET_ROLE_LABELS[a.role]}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {involvedPositions.length > 0 && (
            <section className="review-modal__section" aria-label="Involved positions">
              <h3 className="review-modal__section-title">Involved positions</h3>
              <ul className="review-modal__list">
                {involvedPositions.map((p, i) => {
                  const main = p.protocol ?? p.name ?? p.symbol ?? "Position";
                  const asset =
                    p.name && p.name !== main
                      ? p.name
                      : p.symbol && p.symbol !== main
                        ? p.symbol
                        : undefined;
                  return (
                    <li key={`${p.symbol ?? "pos"}-${i}`} className="review-modal__row">
                      <span className="review-modal__row-main">
                        <span className="review-modal__row-symbol">{main}</span>
                        {asset && <span className="review-modal__row-sub">{asset}</span>}
                        {p.reason && <span className="review-modal__row-sub">{p.reason}</span>}
                      </span>
                      <span className="review-modal__row-meta">
                        {typeof p.apy === "number" && <span>{num1(p.apy)}% APY</span>}
                        {typeof p.valueUsd === "number" && <span>{usd(p.valueUsd)}</span>}
                        <span className="review-modal__tag">{POSITION_ROLE_LABELS[p.role]}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
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

          {limitations.length > 0 && (
            <section className="review-modal__section" aria-label="What is not evaluated yet">
              <h3 className="review-modal__section-title">Not evaluated yet</h3>
              <ul className="review-modal__bullets">
                {limitations.map((l, i) => (
                  <li key={`${l.kind}-${i}`}>{l.text}</li>
                ))}
              </ul>
            </section>
          )}

          {safetyNotes.length > 0 && (
            <section className="review-modal__section review-modal__safety" aria-label="Safety">
              <h3 className="review-modal__section-title">Safety</h3>
              <ul className="review-modal__safety-notes">
                {safetyNotes.map((n, i) => (
                  <li key={`${n.kind}-${i}`}>{n.text}</li>
                ))}
              </ul>
            </section>
          )}

          {/* READ-ONLY external handoff (Step 13J). A plain anchor the user may
              click to open the protocol's own page in a new tab. WealthSmith never
              auto-opens it, executes a transaction, requests a signature, or marks
              the suggestion complete — clicking only navigates. */}
          {details.externalLink && (
            <a
              className="review-modal__external"
              href={details.externalLink.url}
              {...(details.externalLink.opensInNewTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              aria-label={`${details.externalLink.label}. Opens the protocol page in a new tab. No transaction is created.`}
            >
              <span>{details.externalLink.label}</span>
              <ButtonIcon src={externalLinkUrl} />
            </a>
          )}

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
                  {typeof c.riskScore === "number" && (
                    <p className="review-modal__alt-score">Risk score: {c.riskScore.toFixed(2)} / 10 (assigned for review)</p>
                  )}
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
      </div>
    </div>
  );
}
