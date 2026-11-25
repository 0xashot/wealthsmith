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

/**
 * The secondary slot is USUALLY a dismissal, and occasionally a read-only link — a finished
 * swap offers "View on Solscan" there, beside a Done that is the primary action. Same
 * no-transaction guarantee as the primary external link: it opens a block explorer, nothing
 * more. Expressed as a variant rather than another boolean for the same reason the primary is.
 */
export type ModalSecondaryAction =
  | { kind: "button"; label: string; onClick: () => void }
  | { kind: "external-link"; label: string; href: string; ariaLabel: string; newTab?: boolean };

interface Props {
  /** Secondary (dismissive) action label. Ignored when `secondary` is given. */
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** The secondary slot as an explicit variant, for the cases a plain dismissal does not fit. */
  secondary?: ModalSecondaryAction;
  primary: ModalPrimaryAction;
}

export default function ModalActionsFooter({ secondaryLabel = "Cancel", onSecondary, secondary, primary }: Props) {
  const secondaryAction: ModalSecondaryAction =
    secondary ?? { kind: "button", label: secondaryLabel, onClick: onSecondary ?? (() => {}) };
  return (
    <div className="review-modal__footer review-modal__footer--actions">
      {secondaryAction.kind === "external-link" ? (
        <a
          className="review-modal__tertiary-action review-modal__tertiary-action--link"
          href={secondaryAction.href}
          {...(secondaryAction.newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          aria-label={secondaryAction.ariaLabel}
        >
          <span>{secondaryAction.label}</span>
          <ButtonIcon src={externalLinkUrl} />
        </a>
      ) : (
        <button type="button" className="review-modal__tertiary-action" onClick={secondaryAction.onClick}>
          {secondaryAction.label}
        </button>
      )}
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
