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
import closeUrl from "../../../assets/icons/ui/close.svg";
import type {
  ReviewAssetRole,
  ReviewMetric,
  ReviewPositionRole,
  SuggestionReviewDetails,
} from "../suggestions/engineTypes";

interface Props {
  details: SuggestionReviewDetails;
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

export default function SuggestionReviewModal({ details, isTopPick, onClose }: Props) {
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
          <p id={reasonId} className="modal__intro">
            {summary.reason}
          </p>

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

          {limitations.length > 0 && (
            <section className="review-modal__section" aria-label="What is not evaluated yet">
              <h3 className="review-modal__section-title">Not evaluated yet</h3>
              <ul className="review-modal__bullets">
                {limitations.map((l) => (
                  <li key={l.kind}>{l.text}</li>
                ))}
              </ul>
            </section>
          )}

          {safetyNotes.length > 0 && (
            <section className="review-modal__section review-modal__safety" aria-label="Safety">
              <h3 className="review-modal__section-title">Safety</h3>
              <ul className="review-modal__safety-notes">
                {safetyNotes.map((n) => (
                  <li key={n.kind}>{n.text}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
