/**
 * duplicateExposure — deterministic grouping of EXISTING deployed positions by
 * their underlying exposure, so Position Optimization can flag when multiple
 * positions represent similar exposure (reason `duplicate_exposure`).
 *
 * Pure and honest: it groups ONLY from detected structured fields (type, exact
 * symbol, mint, legs) — never from vague names — and never invents value,
 * APY, risk, or a protocol. Uncertain positions return `null` (never grouped).
 * This is review-only: it says positions "share similar exposure", never that a
 * position is bad/unsafe and never sell/swap/unwind.
 */
import type { WalletPosition } from "../wallet/walletPosition";
import { lookupMint } from "../wallet/walletPosition";
import { STABLE_SYMBOLS } from "../wallet/walletSummary";
import {
  MIN_DUPLICATE_EXPOSURE_POSITION_USD,
  MIN_DUPLICATE_EXPOSURE_GROUP_USD,
  DUPLICATE_EXPOSURE_PORTFOLIO_SHARE_THRESHOLD,
} from "./engineThresholds";

/** Underlying exposure group key. `TOKEN:` is followed by a mint or exact symbol. */
export type ExposureGroup = "SOL_EXPOSURE" | "STABLE_EXPOSURE" | `TOKEN:${string}`;

/**
 * Known SOL LST symbols (normalized uppercase). Native stake and `type: "lst"`
 * also map to SOL exposure. Liquid wallet SOL/WSOL is deliberately NOT here —
 * that is handled by the Staking rule, not duplicate exposure.
 */
const SOL_LST_SYMBOLS = new Set(["JUPSOL", "MSOL", "JITOSOL", "BSOL", "JSOL", "INF", "DSOL"]);

function isStableMint(mint: string): boolean {
  const sym = lookupMint(mint)?.symbol;
  return sym != null && STABLE_SYMBOLS.has(sym);
}

/**
 * The underlying exposure group for a DEPLOYED position, or null when uncertain.
 * Only `lst` / `stake` / `protocol` positions are grouped.
 */
export function getUnderlyingExposureGroup(p: WalletPosition): ExposureGroup | null {
  if (p.type !== "lst" && p.type !== "stake" && p.type !== "protocol") return null;
  const sym = (p.symbol ?? "").toUpperCase();

  // SOL exposure: native stake, any recognized LST, or a known SOL LST symbol.
  if (p.type === "stake" || p.type === "lst") return "SOL_EXPOSURE";
  if (SOL_LST_SYMBOLS.has(sym)) return "SOL_EXPOSURE";

  // From here the position is a `protocol` position.
  // Stablecoin exposure: a stable-symbol position, or one whose legs are ALL
  // recognized stablecoins with no debt leg (no volatile LP leg).
  if (STABLE_SYMBOLS.has(sym)) return "STABLE_EXPOSURE";
  if (p.legs && p.legs.length > 0) {
    const noDebt = p.legs.every((l) => l.side !== "debt");
    if (noDebt && p.legs.every((l) => isStableMint(l.mint))) return "STABLE_EXPOSURE";
    // A single non-debt underlying leg → group by that token's mint.
    const longLegs = p.legs.filter((l) => l.side !== "debt");
    if (noDebt && longLegs.length === 1) return `TOKEN:${longLegs[0].mint}`;
    // Mixed / volatile / debt legs → uncertain.
    return null;
  }

  // Single-underlying protocol position: prefer mint, fall back to exact symbol.
  if (p.mint) return `TOKEN:${p.mint}`;
  if (sym) return `TOKEN:${sym}`;
  return null;
}

/** User-facing label for an exposure group (never a raw group key). */
export function exposureGroupLabel(group: ExposureGroup): string {
  if (group === "SOL_EXPOSURE") return "SOL exposure";
  if (group === "STABLE_EXPOSURE") return "Stablecoin exposure";
  return "Shared token exposure";
}

export interface DuplicateExposureGroup {
  group: ExposureGroup;
  label: string;
  positions: WalletPosition[];
  combinedUsd: number;
}

/**
 * Find deployed-position groups that qualify as duplicate exposure: at least two
 * priced positions (each ≥ the per-position minimum) whose combined value clears
 * both the group-dollar minimum and the portfolio-share threshold. Deterministic
 * given the input order; never invents value.
 */
export function findDuplicateExposureGroups(
  positions: WalletPosition[],
  totalPricedUsd: number
): DuplicateExposureGroup[] {
  if (totalPricedUsd <= 0) return [];
  const buckets = new Map<string, WalletPosition[]>();

  for (const p of positions) {
    if (p.type !== "lst" && p.type !== "stake" && p.type !== "protocol") continue;
    if (typeof p.valueUsd !== "number" || p.valueUsd <= 0) continue;
    if (!p.symbol) continue;
    // Ignore dust positions below the per-position minimum.
    if (p.valueUsd < MIN_DUPLICATE_EXPOSURE_POSITION_USD) continue;
    const group = getUnderlyingExposureGroup(p);
    if (!group) continue;
    const arr = buckets.get(group) ?? [];
    arr.push(p);
    buckets.set(group, arr);
  }

  const out: DuplicateExposureGroup[] = [];
  for (const [group, arr] of buckets) {
    if (arr.length < 2) continue;
    const combinedUsd = arr.reduce((s, p) => s + (p.valueUsd as number), 0);
    if (combinedUsd < MIN_DUPLICATE_EXPOSURE_GROUP_USD) continue;
    if (combinedUsd / totalPricedUsd < DUPLICATE_EXPOSURE_PORTFOLIO_SHARE_THRESHOLD) continue;
    out.push({
      group: group as ExposureGroup,
      label: exposureGroupLabel(group as ExposureGroup),
      positions: arr,
      combinedUsd,
    });
  }
  return out;
}
