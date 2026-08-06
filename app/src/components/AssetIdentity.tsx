/**
 * AssetIdentity — THE asset identity cell for every table that names a token:
 * Liquid Assets, Staked Assets / Yield Strategies, Manually Added Assets, and the
 * Review modal's involved/excluded asset tables.
 *
 * Icon + primary label (optionally a read-only external page link) + optional
 * secondary line + optional data-quality note. Per patterns/portfolio-overview.md
 * the icon is decorative (aria-hidden) and never the only identifier — the label
 * is always visible text. A link is always a NEW-TAB, read-only page (Solscan /
 * the asset's own chain explorer); it never implies the asset can be moved.
 *
 * Callers resolve the icon themselves (registry lookup + their own fallback
 * policy) and pass the finished URL — this component never invents an icon.
 */
interface Props {
  /** Fully resolved icon URL; null renders the text alone (no invented icon). */
  iconUrl: string | null;
  /** Primary label — the symbol or name the row is identified by. */
  label: string;
  /** Read-only external page (block explorer). Renders the label as a new-tab link. */
  href?: string;
  /** Secondary line under the label (full name, protocol, or venue). */
  sub?: string;
  /** Data-quality note (e.g. "price unavailable"), announced as a note. */
  note?: string;
}

export default function AssetIdentity({ iconUrl, label, href, sub, note }: Props) {
  return (
    <span className="asset-identity">
      {iconUrl && (
        <img
          className="asset-identity__icon"
          src={iconUrl}
          alt=""
          width={24}
          height={24}
          aria-hidden="true"
        />
      )}
      <span className="asset-identity__text">
        {href ? (
          <a className="deploy-table__asset-link" href={href} target="_blank" rel="noopener noreferrer">
            {label}
          </a>
        ) : (
          <span className="asset-identity__name">{label}</span>
        )}
        {sub && <span className="asset-identity__symbol">{sub}</span>}
        {note && (
          <span className="asset-identity__note" role="note">
            {note}
          </span>
        )}
      </span>
    </span>
  );
}
