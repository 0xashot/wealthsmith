// Internal-only preview component. Not mounted in live user flows.
//
// Renders ONLY from the passed preview-result prop (the copy model). It imports no
// selector live flow, calls no wallet code, no engine, and never fetches or
// navigates to real protocol pages. All action buttons are disabled (preview-only).
import type { SolLstSelectorPreviewResult } from "../../suggestions/protocolSolLiquidStakingSelectorPreview";
import "./solLstSelectorPreview.css";

interface SolLstSelectorPreviewProps {
  preview: SolLstSelectorPreviewResult;
}

export default function SolLstSelectorPreview({ preview }: SolLstSelectorPreviewProps) {
  const { status, copy } = preview;
  const selected = copy.selectedProtocolName != null;

  return (
    <section className="internal-sol-lst-preview" aria-label="Internal SOL staking preview (not live)">
      <div className="internal-sol-lst-preview__card" data-status={status}>
        <p className="internal-sol-lst-preview__badge">Internal preview · Not live</p>
        <p className="internal-sol-lst-preview__eyebrow">{copy.eyebrow}</p>
        <h2 className="internal-sol-lst-preview__title">{copy.title}</h2>
        <p className="internal-sol-lst-preview__desc">{copy.description}</p>

        {copy.suggestedProtocolLabel != null && (
          <div className="internal-sol-lst-preview__suggested">
            <span className="internal-sol-lst-preview__suggested-label">{copy.suggestedProtocolLabel}</span>
            {selected ? (
              <span className="internal-sol-lst-preview__suggested-value">
                {copy.selectedProtocolName}
                {copy.selectedLstSymbol != null ? ` · ${copy.selectedLstSymbol}` : ""}
              </span>
            ) : (
              <span className="internal-sol-lst-preview__suggested-value internal-sol-lst-preview__suggested-value--none">
                None — nothing selected
              </span>
            )}
          </div>
        )}

        {copy.eligibleAmountLabel != null && (
          <p className="internal-sol-lst-preview__amount">{copy.eligibleAmountLabel}</p>
        )}

        {copy.whySelected.length > 0 && (
          <div className="internal-sol-lst-preview__section">
            <p className="internal-sol-lst-preview__section-title">Why (preview)</p>
            <ul className="internal-sol-lst-preview__list">
              {copy.whySelected.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>
        )}

        {copy.blockers.length > 0 && (
          <div className="internal-sol-lst-preview__section">
            <p className="internal-sol-lst-preview__section-title">Blocked by</p>
            <ul className="internal-sol-lst-preview__list internal-sol-lst-preview__list--blockers">
              {copy.blockers.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>
        )}

        {copy.safetyNotes.length > 0 && (
          <div className="internal-sol-lst-preview__section internal-sol-lst-preview__safety">
            {copy.safetyNotes.map((line, i) => (
              <p key={i} className="internal-sol-lst-preview__safety-note">{line}</p>
            ))}
          </div>
        )}

        <div className="internal-sol-lst-preview__actions">
          {copy.primaryActionLabel != null && (
            <button type="button" className="internal-sol-lst-preview__btn" disabled aria-disabled="true">
              {copy.primaryActionLabel} <span className="internal-sol-lst-preview__btn-tag">(preview-only)</span>
            </button>
          )}
          {copy.secondaryActionLabel != null && (
            <button type="button" className="internal-sol-lst-preview__btn internal-sol-lst-preview__btn--secondary" disabled aria-disabled="true">
              {copy.secondaryActionLabel}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
