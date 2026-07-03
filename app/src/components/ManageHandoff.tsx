/**
 * ManageHandoff — review-only external protocol handoff for Portfolio tables.
 *
 * Per rules/protocol-selection-rules.md + patterns/portfolio-overview.md (Manage
 * Link Behavior, MVP): when the fixture provides a valid destination URL, Manage
 * is a real anchor that opens the protocol in a new tab
 * (target="_blank" rel="noopener noreferrer") and reports the click upward for
 * an approved toast. It NEVER executes a transaction, requests a wallet
 * signature, moves funds, marks anything complete, or changes row/portfolio
 * state — clicking only navigates and toasts.
 *
 * If no valid URL is provided, Manage stays a disabled button (fixture-approved
 * deferred state); the missing URL is reported by the caller, never invented.
 *
 * The visible label is the fixture's `action.label` (e.g. "Manage on Jito"); the
 * richer accessible name says what opens and where ("Manage JitoSOL on Jito in a
 * new tab"). The external-link icon inherits the link text color (ButtonIcon).
 */
import ButtonIcon from "./ButtonIcon";
import externalLinkUrl from "../../../assets/icons/ui/external-link.svg";

interface Props {
  /** Visible fixture label, e.g. "Manage on Jito". */
  label: string;
  /** Fixture `action.destination_url`; null/invalid → disabled (deferred). */
  href: string | null;
  /** Descriptive accessible name, e.g. "Manage JitoSOL on Jito in a new tab". */
  accessibleName: string;
  /** Reports the handoff click upward (toast only — no state change). */
  onOpen: () => void;
}

export default function ManageHandoff({ label, href, accessibleName, onOpen }: Props) {
  if (!href) {
    return (
      <button type="button" className="portfolio-table__manage" disabled>
        {label}
      </button>
    );
  }

  return (
    <a
      className="portfolio-table__manage"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={accessibleName}
      onClick={onOpen}
    >
      <span>{label}</span>
      <ButtonIcon src={externalLinkUrl} />
    </a>
  );
}
