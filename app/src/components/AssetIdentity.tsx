/**
 * AssetIdentity — token identity cell for Portfolio tables.
 *
 * Icon + visible name + symbol. Per patterns/portfolio-overview.md the token
 * icon is decorative (aria-hidden) and never the only identifier — the name
 * and symbol are always visible text.
 */
import { resolveTokenIcon } from "../state/iconRegistry";

interface Props {
  iconPath: string;
  name: string;
  symbol: string;
}

export default function AssetIdentity({ iconPath, name, symbol }: Props) {
  const icon = resolveTokenIcon(iconPath);
  return (
    <span className="asset-identity">
      <img
        className="asset-identity__icon"
        src={icon.url}
        alt=""
        width={24}
        height={24}
        aria-hidden="true"
      />
      <span className="asset-identity__text">
        <span className="asset-identity__name">{name}</span>
        <span className="asset-identity__symbol">{symbol}</span>
      </span>
    </span>
  );
}
