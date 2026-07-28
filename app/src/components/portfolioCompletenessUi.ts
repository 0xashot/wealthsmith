/**
 * portfolioCompletenessUi — Step 17H.2. PURE, deterministic UI selectors over the already-mounted
 * PortfolioCompletenessResult (from deriveRailSuggestions). No recomputation of completeness happens here
 * or in any consuming component — these functions only MAP the mounted result to user-facing copy.
 *
 * They are shared by the production dashboard, position rows, On Track UI, Demo Mode, and the /testing
 * page so every surface renders identically. No Smith AI file is touched. User-facing copy only — never a
 * raw state name, reason code, manifest, score, threshold, account address, or decoder error.
 */
import type { PortfolioCompletenessResult, PositionCompletenessAssessment } from "../wallet/portfolioCompleteness";

/** Approved user-facing completeness copy (verbatim per the task; not governance-scored). */
export const COMPLETENESS_COPY = {
  netWorthTitle: "Some portfolio values could not be verified",
  netWorthBody: "Your detected positions remain visible, but totals and recommendations may be limited until their current value can be confirmed.",
  liquidityBody: "Some positions are included in your portfolio but are not treated as available funds.",
  solExposureBody: "Some staking exposure could not be fully calculated.",
  duplicateTitle: "Some portfolio values could not be verified",
  duplicateBody: "A detected position may be counted more than once, so totals and recommendations are limited until this is resolved.",
  onTrackUnavailable: "On Track status is unavailable while some portfolio data cannot be verified.",
  unresolvedTotal: "—",
  unresolvedTotalAria: "Portfolio total could not be verified",
} as const;

export interface CompletenessWarning {
  /** Stable id so the UI never renders two banners for the same root cause. */
  id: "dedup" | "net_worth" | "liquidity" | "sol_exposure" | "other";
  title: string | null;
  body: string;
}

/**
 * §8 — ONE deterministic primary warning. Priority: (1) invalid dedup / authoritative-value failure →
 * (2) net-worth unresolved (folds in unresolved liabilities, which block net worth) → (3) actionable
 * liquidity unresolved → (4) SOL exposure unresolved → (5) a remaining non-blocking warning. A complete
 * portfolio returns null (no banner). At most one primary warning; Safety Buffer keeps its own component.
 */
export function selectPrimaryCompletenessWarning(r: PortfolioCompletenessResult | null | undefined): CompletenessWarning | null {
  if (!r) return null;
  if (r.deduplicationState === "invalid") return { id: "dedup", title: COMPLETENESS_COPY.duplicateTitle, body: COMPLETENESS_COPY.duplicateBody };
  if (r.netWorthState !== "complete") return { id: "net_worth", title: COMPLETENESS_COPY.netWorthTitle, body: COMPLETENESS_COPY.netWorthBody };
  if (r.liquidityState !== "complete") return { id: "liquidity", title: null, body: COMPLETENESS_COPY.liquidityBody };
  if (r.solExposureState !== "complete") return { id: "sol_exposure", title: null, body: COMPLETENESS_COPY.solExposureBody };
  if (r.warnings.length > 0) return { id: "other", title: null, body: r.warnings[0] };
  return null;
}

/**
 * §3 — the portfolio TOTAL to display. Only an authoritative (complete) net worth shows the recognized
 * value; otherwise "—" (never zero, never the partial recognized value). Returns an accessible label too.
 */
export function portfolioTotalDisplay(r: PortfolioCompletenessResult | null | undefined, formattedRecognized: string): { text: string; authoritative: boolean; ariaLabel?: string } {
  if (r && r.netWorthState === "complete") return { text: formattedRecognized, authoritative: true };
  return { text: COMPLETENESS_COPY.unresolvedTotal, authoritative: false, ariaLabel: COMPLETENESS_COPY.unresolvedTotalAria };
}

/**
 * §4 — the single MOST-SPECIFIC user-facing reason for one position, or null when nothing is unresolved.
 * Debt beats generic value; recognized value may still display while liquidity/exposure is unresolved.
 */
export function positionUnresolvedReason(a: PositionCompletenessAssessment | null | undefined): string | null {
  if (!a) return null;
  if (a.positionClass === "hubble_debt" && a.liabilityState === "unresolved") return "Debt value could not be verified";
  if (a.valueState === "unresolved" || a.valueState === "stale") return "Current value could not be verified";
  // Native SOL stake is always withdrawable (deactivate + withdraw after cooldown), so we
  // never surface an unverified-withdrawal note for it — only protocol lending positions do.
  if (a.liquidityState === "unresolved" && (a.positionClass === "kamino_direct" || a.positionClass === "steakhouse" || a.positionClass === "jupiter_lend")) return "Withdrawal availability could not be verified";
  if (a.transferabilityState === "unresolved") return "Transferability could not be verified";
  if (a.exposureState === "unsupported" || a.exposureState === "unresolved") return "Underlying SOL could not be refreshed";
  if (a.identityState === "unsupported") return "Position type is not fully supported";
  return null;
}

/** Map a position id → its assessment (for row rendering) from the mounted result. */
export function assessmentById(r: PortfolioCompletenessResult | null | undefined, positionId: string): PositionCompletenessAssessment | null {
  if (!r) return null;
  return r.positionAssessments.find((a) => a.positionId === positionId) ?? null;
}

/**
 * §5 — DASHBOARD completeness-visibility helper (NOT the mounted On Track card gate). Step 21F: the mounted
 * On Track card is governed by the canonical `OnTrackAssessment` (Stage B); this reads only the underlying
 * `onTrackState` completeness precondition (net worth + liabilities + buffer resolved) for the dashboard banner.
 */
export function onTrackAvailability(r: PortfolioCompletenessResult | null | undefined): { available: boolean; unavailableReason?: string } {
  return r && r.onTrackState === "complete" ? { available: true } : { available: false, unavailableReason: COMPLETENESS_COPY.onTrackUnavailable };
}

/**
 * §2 — the message the live rail should show in its empty slot, or null to keep the existing generic copy.
 * Returns the approved On-Track-unavailable message ONLY when a completeness result is PRESENT and On Track
 * is blocked/unresolved for a COMPLETENESS reason — never merely because the rail is empty (absent result →
 * null → existing behavior preserved).
 */
export function railOnTrackUnavailableMessage(r: PortfolioCompletenessResult | null | undefined): string | null {
  if (!r) return null;
  return r.onTrackState === "complete" ? null : COMPLETENESS_COPY.onTrackUnavailable;
}

/** True when a position's USD should render as "—" (unknown magnitude) rather than a number. */
export function shouldRenderDashForValue(a: PositionCompletenessAssessment | null | undefined): boolean {
  return !!a && a.valueState === "unresolved" && a.recognizedValueUsd === null;
}

/**
 * Convenience for a production row: the single most-specific completeness note for one position id, or
 * null. Wraps assessmentById + positionUnresolvedReason so a row never duplicates the assessment logic.
 */
export function positionCompletenessNote(r: PortfolioCompletenessResult | null | undefined, positionId: string): string | null {
  return positionUnresolvedReason(assessmentById(r, positionId));
}
