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
 * External protocol handoff (rules/protocol-selection-rules.md, MVP):
 * the CTA is a plain anchor to the fixture's Protocol Logic URL, opening in
 * a new tab with rel="noopener noreferrer". Clicking it only navigates and
 * reports the event upward for a toast — it never executes a transaction,
 * never requests a wallet signature, and never marks the suggestion
 * complete (the card's state is untouched by the click).
 */
import Badge from "./Badge";
import ButtonIcon from "./ButtonIcon";
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
 * (generic safety, risk, wallet, or informational suggestions). Keyed by
 * category so it works for both connected and demo ids (e.g. the demo buffer
 * suggestion id is `demo_top_up_safety_buffer`).
 */
const GENERIC_ICONS_BY_CATEGORY: Record<string, string> = {
  safety_buffer: shieldCheckUrl,
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
  return GENERIC_ICONS_BY_CATEGORY[card.category];
}

const BADGE_TONES: Record<string, "info" | "warning" | "danger" | "success" | "neutral"> = {
  "Top Pick": "info",
  "Risk Reduction": "warning",
  Locked: "neutral",
};

interface Props {
  card: SuggestionCardState;
  /** Reports an external handoff click upward (toast only — no state change). */
  onExternalHandoff?: (card: SuggestionCardState) => void;
  /**
   * Non-external, non-locked "Review" click. Navigates to the suggestion's
   * on-dashboard detail area (read-only): no execution, no signature, no
   * completion, no Top Pick change.
   */
  onReview?: (card: SuggestionCardState) => void;
}

export default function SuggestionCard({ card, onExternalHandoff, onReview }: Props) {
  const isLocked = card.status === "locked";
  // A below-minimum engine suggestion maps to status "disabled": render it the
  // same non-actionable way as a locked card (dimmed, disabled button, reason
  // text) so it never looks executable.
  const nonActionable = isLocked || card.status === "disabled";
  const isTopPick = card.is_top_pick === true;
  // Connected uses "eligible"; demo uses "eligible_for_demo_handoff" — both
  // are review-only external handoffs. Locked cards never reach here.
  const eligibility = card.protocol_decision?.eligibility_status;
  const isExternalHandoff =
    card.cta.action === "open_external_protocol" &&
    (eligibility === "eligible" || eligibility === "eligible_for_demo_handoff");
  const icon = resolveCardIcon(card);

  const className = [
    "suggestion-card",
    isTopPick && "suggestion-card--top-pick",
    nonActionable && "suggestion-card--locked",
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
        {card.demoLabel && <Badge label={card.demoLabel} tone="warning" />}
      </div>

      <div className="suggestion-card__header">
        {icon && <img src={icon} alt="" width={20} height={20} aria-hidden="true" />}
        <h3 className="suggestion-card__title">{card.title}</h3>
      </div>

      <p className="suggestion-card__description">{card.description}</p>
      <p className="suggestion-card__impact">{card.impact_text}</p>

      {/* Optional protocol display (Demo Mode now; real wallet later once gates pass). */}
      {card.protocolName && (
        <p className="suggestion-card__protocol">
          <span className="suggestion-card__protocol-label">
            {card.suggestedProtocolLabel ?? "Suggested protocol to review"}:{" "}
          </span>
          <span className="suggestion-card__protocol-name">
            {card.protocolName}
            {card.lstSymbol ? ` · ${card.lstSymbol}` : ""}
          </span>
        </p>
      )}

      {nonActionable && card.disabled_reason_text && (
        <p className="suggestion-card__locked-reason">{card.disabled_reason_text}</p>
      )}

      {card.apy && (
        <p className="suggestion-card__apy">
          <span className="suggestion-card__apy-label">APY </span>
          {card.apy.display}
        </p>
      )}

      {nonActionable ? (
        <button type="button" className="suggestion-card__cta" disabled>
          {card.cta.label}
        </button>
      ) : isExternalHandoff && card.protocol_decision ? (
        <a
          className="suggestion-card__cta suggestion-card__cta--external"
          href={card.protocol_decision.destination_url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${card.protocol_decision.cta_label}. Opens external protocol in a new tab.`}
          onClick={() => onExternalHandoff?.(card)}
        >
          <span>{card.cta.label}</span>
          <ButtonIcon src={externalLinkUrl} />
        </a>
      ) : card.cta.label ? (
        // Informational cards (On Track) have an empty CTA label → no button.
        <button
          type="button"
          className="suggestion-card__cta"
          onClick={() => onReview?.(card)}
        >
          {card.cta.label}
        </button>
      ) : null}
    </article>
  );
}
