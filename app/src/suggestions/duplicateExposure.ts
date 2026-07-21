/**
 * duplicateExposure — deterministic single-position underlying-exposure classification
 * (`getUnderlyingExposureGroup`). It maps a DEPLOYED position (native stake / LST / protocol) to a coarse
 * exposure bucket (SOL / stablecoin / exact token) from detected structured fields only (type, exact symbol,
 * mint, legs) — never from vague names.
 *
 * Consumers (Step 20D): the contribution portfolio adapter (SOL-exposure detection for allocation) and the
 * staking/DCA duplicate-suppression fixtures. Position Optimization does NOT use this file — its canonical
 * shared-underlying-exposure grouping lives in `positionOptimizationAssessment.ts` (exact mint + token program).
 * The pre-canonical `findDuplicateExposureGroups` / `DuplicateExposureGroup` / `exposureGroupLabel` helpers were
 * deleted with the legacy Position Optimization rule (Step 20D).
 *
 * Pure and honest: uncertain positions return `null` (never grouped); it never invents value, APY, risk, or a
 * protocol, and never implies sell/swap/unwind.
 */
import type { WalletPosition } from "../wallet/walletPosition";
import { lookupMint } from "../wallet/walletPosition";
import { STABLE_SYMBOLS } from "../wallet/walletSummary";

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

