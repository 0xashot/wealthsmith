/**
 * SuggestionCard — per components/suggestion-card.md and
 * patterns/suggestion-flow.md.
 *
 * Pure renderer of Suggestion Engine / Top Pick Logic / Protocol Logic output:
 * - Top Pick badge renders only when `is_top_pick === true` (never decided here).
 * - Locked cards render the lock reason and are not actionable.
 * - Protocol names render with their approved icons, never icon-only.
 * - APY renders exactly as provided ("Unavailable" is displayed, not invented).
 *
 * Step 2 scope: CTA click handlers are stubs. The external protocol handoff
 * (open approved URL in new tab, rel="noopener noreferrer") is wired in a
 * later step; no transaction, signature, or completion behavior will ever
 * be attached per rules/protocol-selection-rules.md.
 */
import Badge from "./Badge";
import type { SuggestionCardState } from "../types/dashboard";
import shieldCheckUrl from "../../../assets/icons/ui/shield-check.svg";
import externalLinkUrl from "../../../assets/icons/ui/external-link.svg";
import hubbleUrl from "../../../assets/icons/protocol/hubble.svg";
import jitoUrl from "../../../assets/icons/protocol/jito.svg";
import jupiterUrl from "../../../assets/icons/protocol/jupiter.svg";
import kaminoUrl from "../../../assets/icons/protocol/kamino.svg";
import marinadeUrl from "../../../assets/icons/protocol/marinade.svg";
import meteoraUrl from "../../../assets/icons/protocol/meteora.svg";
import ondoUrl from "../../../assets/icons/protocol/ondo.svg";
import orcaUrl from "../../../assets/icons/protocol/orca.svg";
import raydiumUrl from "../../../assets/icons/protocol/raydium.svg";
import sanctumUrl from "../../../assets/icons/protocol/sanctum.svg";

/**
 * Approved MVP protocol icons (assets/icons/icon-registry.json).
 * Per components/suggestion-card.md (Icons): protocol-tied suggestions —
 * structured data carries a protocol decision with a specific destination —
 * use the approved protocol icon, paired with the visible protocol name.
 */
const PROTOCOL_ICONS: Record<string, string> = {
  hubble: hubbleUrl,
  jito: jitoUrl,
  jupiter: jupiterUrl,
  kamino: kaminoUrl,
  marinade: marinadeUrl,
  meteora: meteoraUrl,
  ondo: ondoUrl,
  orca: orcaUrl,
  raydium: raydiumUrl,
  sanctum: sanctumUrl,
};

/**
 * Generic UI icons — only for suggestions with no protocol identity
 * (generic safety, risk, wallet, or informational suggestions).
 */
const GENERIC_ICONS: Record<string, string> = {
  top_up_safety_buffer: shieldCheckUrl,
};

function resolveCardIcon(card: SuggestionCardState): string | undefined {
  const protocolId = card.protocol_decision?.destination_protocol_id;
  if (protocolId) {
    const icon = PROTOCOL_ICONS[protocolId];
    if (!icon) {
      // Per rules: missing protocol icon is an implementation issue —
      // report it and render the visible protocol name without an
      // unapproved fallback icon.
      console.error(
        `[design-system] Missing approved protocol icon for "${protocolId}". ` +
          "Rendering protocol name without an icon (no fallback is approved for MVP)."
      );
    }
    return icon;
  }
  return GENERIC_ICONS[card.id];
}

const BADGE_TONES: Record<string, "info" | "warning" | "danger" | "success" | "neutral"> = {
  "Top Pick": "info",
  "Risk Reduction": "warning",
  Locked: "neutral",
};

export default function SuggestionCard({ card }: { card: SuggestionCardState }) {
  const isLocked = card.status === "locked";
  const isTopPick = card.is_top_pick === true;
  const isExternalHandoff =
    card.cta.action === "open_external_protocol" &&
    card.protocol_decision?.eligibility_status === "eligible";
  const icon = resolveCardIcon(card);

  const className = [
    "suggestion-card",
    isTopPick && "suggestion-card--top-pick",
    isLocked && "suggestion-card--locked",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article
      id={`suggestion-${card.id}`}
      className={className}
      tabIndex={-1}
      aria-label={card.title}
    >
      <div className="suggestion-card__badges">
        {isTopPick && <Badge label={card.badge} tone="info" />}
        {!isTopPick && card.badge && (
          <Badge label={card.badge} tone={BADGE_TONES[card.badge] ?? "neutral"} />
        )}
      </div>

      <div className="suggestion-card__header">
        {icon && <img src={icon} alt="" width={20} height={20} aria-hidden="true" />}
        <h3 className="suggestion-card__title">{card.title}</h3>
      </div>

      <p className="suggestion-card__description">{card.description}</p>
      <p className="suggestion-card__impact">{card.impact_text}</p>

      {isLocked && card.disabled_reason_text && (
        <p className="suggestion-card__locked-reason">{card.disabled_reason_text}</p>
      )}

      {card.apy && (
        <p className="suggestion-card__apy">
          <span className="suggestion-card__apy-label">APY </span>
          {card.apy.display}
        </p>
      )}

      {isLocked ? (
        <button type="button" className="suggestion-card__cta" disabled>
          {card.cta.label}
        </button>
      ) : isExternalHandoff && card.protocol_decision ? (
        <button
          type="button"
          className="suggestion-card__cta suggestion-card__cta--external"
          aria-label={`${card.protocol_decision.cta_label}. Opens external protocol in a new tab.`}
          // Handoff wiring (approved URL, new tab, noopener noreferrer) lands
          // in a later step. It will never execute a transaction, request a
          // signature, or mark the suggestion complete.
        >
          <span>{card.cta.label}</span>
          <img src={externalLinkUrl} alt="" width={16} height={16} aria-hidden="true" />
        </button>
      ) : (
        <button
          type="button"
          className="suggestion-card__cta"
          // Suggestion detail navigation is implemented in a later step.
        >
          {card.cta.label}
        </button>
      )}
    </article>
  );
}
