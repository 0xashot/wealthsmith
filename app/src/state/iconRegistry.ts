/**
 * Icon resolver for Portfolio tables.
 *
 * Token icons come from assets/icons/token/*. A fixture row provides an
 * approved icon path (e.g. "assets/icons/token/sol.svg"); we resolve it to the
 * bundled asset URL by filename. Per assets/icons/README.md + patterns/
 * portfolio-overview.md: a missing token icon falls back to
 * assets/icons/fallback/fallback-token.svg (the visible symbol/name still
 * identifies the token) and is reported — never invented.
 */
import fallbackTokenUrl from "../../../assets/icons/fallback/fallback-token.svg";

// SVG is the default token-icon format; PNG is allowed for logos that only exist as raster art (e.g. WIF).
const tokenIcons = import.meta.glob(
  "../../../assets/icons/token/*.{svg,png}",
  { eager: true, query: "?url", import: "default" }
) as Record<string, string>;

const protocolIcons = import.meta.glob(
  "../../../assets/icons/protocol/*.svg",
  { eager: true, query: "?url", import: "default" }
) as Record<string, string>;

export interface ResolvedIcon {
  url: string;
  fallback: boolean;
}

/** Resolve a fixture token-icon path (matched by filename) to a bundled URL. */
export function resolveTokenIcon(fixturePath: string): ResolvedIcon {
  const file = fixturePath.split("/").pop();
  const entry = Object.entries(tokenIcons).find(([p]) => p.endsWith(`/${file}`));
  if (entry) return { url: entry[1], fallback: false };
  console.error(
    `[design-system] Missing approved token icon "${fixturePath}"; ` +
      "using fallback-token.svg (symbol/name still identifies the token)."
  );
  return { url: fallbackTokenUrl, fallback: true };
}

/**
 * Resolve a fixture protocol-icon path (matched by filename) to a bundled URL.
 *
 * Per patterns/portfolio-overview.md + the fixture hard rules there is NO
 * protocol fallback for MVP: a missing approved protocol icon is an
 * implementation issue. We return `null` (the visible protocol name still
 * identifies it) and report — we never invent an icon or reuse the token
 * fallback for a protocol.
 */
export function resolveProtocolIcon(fixturePath: string): string | null {
  const file = fixturePath.split("/").pop();
  const entry = Object.entries(protocolIcons).find(([p]) => p.endsWith(`/${file}`));
  if (entry) return entry[1];
  console.error(
    `[design-system] Missing approved protocol icon "${fixturePath}"; ` +
      "rendering the protocol name text only (no protocol fallback icon in MVP)."
  );
  return null;
}
