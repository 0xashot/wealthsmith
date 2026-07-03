/**
 * ProtocolIdentity — protocol identity cell for Portfolio tables.
 *
 * Protocol icon + visible protocol name. Per patterns/portfolio-overview.md the
 * icon is decorative (aria-hidden) and never the only identifier — the name is
 * always visible text. There is no protocol fallback icon in MVP: if the
 * approved icon is missing, resolveProtocolIcon returns null (reported) and only
 * the name renders. No icon is ever invented.
 */
import { resolveProtocolIcon } from "../state/iconRegistry";

interface Props {
  iconPath: string;
  name: string;
}

export default function ProtocolIdentity({ iconPath, name }: Props) {
  const iconUrl = resolveProtocolIcon(iconPath);
  return (
    <span className="protocol-identity">
      {iconUrl && (
        <img
          className="protocol-identity__icon"
          src={iconUrl}
          alt=""
          width={20}
          height={20}
          aria-hidden="true"
        />
      )}
      <span className="protocol-identity__name">{name}</span>
    </span>
  );
}
