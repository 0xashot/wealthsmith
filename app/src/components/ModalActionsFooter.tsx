/**
 * ModalActionsFooter — the Review modal's sticky action row: a dismissive
 * secondary button ("Cancel") plus ONE primary action.
 *
 * The primary action is an explicit variant, never a boolean soup:
 *  - `external-link` — a READ-ONLY handoff to a provider/protocol page. Renders
 *    as an anchor with the external-link icon; the ariaLabel must state the
 *    no-transaction guarantee (the copy differs per family, so the caller owns
 *    the exact sentence).
 *  - `button` — an in-app action (e.g. acknowledging an observation). No icon.
 *
 * This footer never executes a transaction, requests a signature, or moves
 * funds — an external link only opens the provider's own page.
 */
import ButtonIcon from "./ButtonIcon";
import externalLinkUrl from "../../../assets/icons/ui/external-link.svg";

export type ModalPrimaryAction =
  | {
      kind: "external-link";
      label: string;
      href: string;
      /** Full accessible sentence incl. the new-tab + no-transaction guarantee. */
      ariaLabel: string;
      /** Open in a new tab (rel=noopener). Callers pass their contract's flag. */
      newTab?: boolean;
    }
  | {
      kind: "button";
      label: string;
      onClick: () => void;
      ariaLabel?: string;
    };

interface Props {
  /** Secondary (dismissive) action label. */
  secondaryLabel?: string;
  onSecondary: () => void;
  primary: ModalPrimaryAction;
}

export default function ModalActionsFooter({ secondaryLabel = "Cancel", onSecondary, primary }: Props) {
  return (
    <div className="review-modal__footer review-modal__footer--actions">
      <button type="button" className="review-modal__tertiary-action" onClick={onSecondary}>
        {secondaryLabel}
      </button>
      {primary.kind === "external-link" ? (
        <a
          className="review-modal__primary-action"
          href={primary.href}
          {...(primary.newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          aria-label={primary.ariaLabel}
        >
          <span>{primary.label}</span>
          <ButtonIcon src={externalLinkUrl} />
        </a>
      ) : (
        <button
          type="button"
          className="review-modal__primary-action"
          onClick={primary.onClick}
          {...(primary.ariaLabel ? { "aria-label": primary.ariaLabel } : {})}
        >
          <span>{primary.label}</span>
        </button>
      )}
    </div>
  );
}
