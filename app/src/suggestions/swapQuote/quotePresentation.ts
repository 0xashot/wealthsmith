/**
 * quotePresentation — Step 23C. PURE mapping from a sanitized `SwapQuoteComparisonAssessment` (or a not-ready /
 * not-required readiness) into a deterministic, honest view model for the read-only "Suggested route" UI. No
 * fetching, no React. It never claims "guaranteed", "cheapest across all platforms" when a provider failed, or
 * "executable depth" — liquidity is a pool-TVL PROXY. Exclusion codes map to user-readable copy; raw enums,
 * payloads, pool ids beyond a concise label, and internal identifiers never surface.
 */
import type { SwapQuoteComparisonAssessment, SwapQuoteCandidate, SwapProviderId, SwapExclusionReason } from "./swapQuoteContracts";
import { SWAP_PROVIDER_NAME } from "./swapQuoteContracts";

export type QuoteViewKind =
  | "loading" | "selected" | "partial" | "only_route" | "equivalent"
  | "no_valid_route" | "not_ready_for_quote" | "not_required" | "unavailable" | "expired";

export interface QuoteMetric { label: string; value: string }
export interface QuoteAlternative { provider: SwapProviderId; providerName: string; eligible: boolean; expectedOutput: string | null; totalCost: string | null; priceImpact: string | null; reasonCopy: string | null }
export interface QuoteView {
  kind: QuoteViewKind;
  heading: string;
  /** The selected execution surface (provider) id, for the logo + accessible name. Null when no route selected. */
  selectedProviderId: SwapProviderId | null;
  providerLabel: string | null;
  body: string | null;
  disclosure: string | null;
  metrics: QuoteMetric[];
  comparedProviderNames: string[];
  unavailableProviderNames: string[];
  alternatives: QuoteAlternative[];
  liquidityProxyNote: string | null;
  showRefresh: boolean;
  /** Present only for a partial state — the honest count of providers actually compared. */
  incompleteComparison: boolean;
  /** Underlying venues of the selected route (execution surface stays separate from these). */
  selectedVenues: string[];
  /** True when compared routes share an underlying venue (overlap disclosure). */
  venueOverlap: boolean;
}

/** User-readable copy for each exclusion reason (never the raw enum). */
export const EXCLUSION_REASON_COPY: Record<SwapExclusionReason, string> = {
  provider_unavailable: "The provider was unavailable.",
  no_route: "No route was available for this pair.",
  quote_timeout: "The provider did not respond in time.",
  quote_stale: "The quote was no longer fresh.",
  quote_expired: "The quote had expired.",
  pair_mismatch: "The quote did not match the exact asset pair.",
  amount_mismatch: "The quote did not match the exact amount.",
  output_unresolved: "The expected output could not be determined.",
  price_impact_unresolved: "Price impact could not be verified.",
  price_impact_high: "Estimated price impact exceeded WealthSmith’s limit.",
  liquidity_unresolved: "Pool liquidity could not be verified.",
  liquidity_low: "Pool liquidity was below WealthSmith’s minimum.",
  total_cost_unresolved: "Estimated total cost could not be determined.",
  estimated_cost_high: "Estimated total cost exceeded WealthSmith’s limit.",
  blocked_intermediate_asset: "The route used an unsupported intermediate asset.",
  blocked_underlying_venue: "The route used an unsupported venue.",
  rfq_not_approved: "The route type is not currently supported.",
  normalization_failed: "The provider response could not be read safely.",
};

const LIQUIDITY_PROXY_NOTE = "WealthSmith uses fresh pool-level TVL as a liquidity proxy. It does not guarantee the amount that can be executed at the displayed price.";
const BASE_DISCLOSURE = "WealthSmith compared current read-only quotes using the same asset pair and amount. Final output may change before you act. No transaction has been prepared.";
const PARTIAL_DISCLOSURE = "WealthSmith could not verify every supported platform for this comparison.";

const names = (ids: readonly SwapProviderId[]) => ids.map((p) => SWAP_PROVIDER_NAME[p]);
const usd = (n: number | null) => (n == null ? null : `$${(Math.round(n * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const pct = (n: number | null) => (n == null ? null : `${(Math.round(n * 1000) / 1000).toLocaleString("en-US", { maximumFractionDigits: 3 })}%`);

/** "12 seconds ago" style relative time. */
function relativeTime(fromMs: number, nowMs: number): string {
  const s = Math.max(0, Math.round((nowMs - fromMs) / 1000));
  if (s < 60) return `${s} second${s === 1 ? "" : "s"} ago`;
  const m = Math.round(s / 60);
  return `${m} minute${m === 1 ? "" : "s"} ago`;
}

function selectedMetrics(a: SwapQuoteComparisonAssessment, nowMs: number): QuoteMetric[] {
  const sel = a.candidates.find((c) => c.providerId === a.selectedProviderId) ?? null;
  const m: QuoteMetric[] = [];
  const cu = usd(a.estimatedTotalCostUsd);
  const cp = pct(a.estimatedTotalCostPct);
  if (cu || cp) m.push({ label: "Estimated total cost", value: [cu, cp ? `· ${cp}` : null].filter(Boolean).join(" ") });
  if (a.expectedOutputTokens) m.push({ label: "Estimated output", value: a.expectedOutputTokens });
  if (a.minimumOutputTokens) m.push({ label: "Minimum output", value: a.minimumOutputTokens });
  if (sel && sel.priceImpactPct != null) m.push({ label: "Price impact", value: pct(sel.priceImpactPct) as string });
  if (sel) m.push({ label: "Quote updated", value: relativeTime(Date.parse(sel.quotedAt) || nowMs, nowMs) });
  if (a.expiresAt) m.push({ label: "Quote expires", value: relativeTime(nowMs, Date.parse(a.expiresAt)) === "0 seconds ago" ? "soon" : `in ${relativeTime(nowMs, Date.parse(a.expiresAt)).replace(" ago", "")}` });
  if (sel && sel.liquidityAssessment.status === "verified") m.push({ label: "Pool liquidity evidence", value: "Verified (pool TVL proxy)" });
  return m;
}

function alternativesOf(a: SwapQuoteComparisonAssessment): QuoteAlternative[] {
  return a.candidates.map((c: SwapQuoteCandidate) => ({
    provider: c.providerId,
    providerName: c.providerName,
    eligible: c.eligible,
    expectedOutput: c.expectedOutputTokens && c.expectedOutputTokens !== "0" ? c.expectedOutputTokens : null,
    totalCost: null,
    priceImpact: c.priceImpactPct != null ? pct(c.priceImpactPct) : null,
    reasonCopy: c.eligible ? null : (c.exclusionReasons.map((r) => EXCLUSION_REASON_COPY[r]).find(Boolean) ?? null),
  }));
}

export interface PresentOptions { nowMs?: number; expired?: boolean }

/** Map an assessment to the view model. `expired` forces the expired state (checked by the caller against expiresAt). */
export function presentSwapQuote(a: SwapQuoteComparisonAssessment, opts: PresentOptions = {}): QuoteView {
  const nowMs = opts.nowMs ?? Date.now();
  const comparedProviderNames = names(a.comparedProviders);
  const unavailableProviderNames = names(a.unavailableProviders);
  const alternatives = alternativesOf(a);
  const eligibleCount = a.candidates.filter((c) => c.eligible).length;
  const selName = a.selectedProviderId ? SWAP_PROVIDER_NAME[a.selectedProviderId] : null;
  const selectedVenues = (a.candidates.find((c) => c.providerId === a.selectedProviderId)?.underlyingVenues) ?? [];
  const base = { selectedProviderId: a.selectedProviderId, comparedProviderNames, unavailableProviderNames, alternatives, liquidityProxyNote: LIQUIDITY_PROXY_NOTE, incompleteComparison: false, selectedVenues, venueOverlap: hasVenueOverlap(a) };

  if (opts.expired || (a.expiresAt != null && Date.parse(a.expiresAt) <= nowMs && (a.status === "selected" || a.status === "partial_comparison" || a.status === "only_route_available"))) {
    return { kind: "expired", heading: "Route comparison is unavailable right now", providerLabel: null, body: "Your financial suggestion is unchanged. You can try the comparison again later.", disclosure: null, metrics: [], showRefresh: true, ...base };
  }

  switch (a.status) {
    case "selected": {
      if (a.economicallyEquivalent) {
        return { kind: "equivalent", heading: "Suggested route", providerLabel: `${selName} — Similar estimated cost`, body: "The eligible routes were economically similar, so WealthSmith applied its deterministic platform tie-break.", disclosure: BASE_DISCLOSURE, metrics: selectedMetrics(a, nowMs), showRefresh: true, ...base };
      }
      return { kind: "selected", heading: "Suggested route", providerLabel: `${selName} — Lowest estimated total cost`, body: null, disclosure: BASE_DISCLOSURE, metrics: selectedMetrics(a, nowMs), showRefresh: true, ...base };
    }
    case "partial_comparison": {
      const label = eligibleCount <= 1 ? `${selName} — Only eligible route found` : `${selName} — Lowest cost among verified routes`;
      return { kind: "partial", heading: "Suggested route", providerLabel: label, body: null, disclosure: PARTIAL_DISCLOSURE, metrics: selectedMetrics(a, nowMs), showRefresh: true, ...base, incompleteComparison: true };
    }
    case "only_route_available":
      return { kind: "only_route", heading: "Suggested route", providerLabel: `${selName} — Only eligible route found`, body: "WealthSmith found one route that met the current cost, liquidity, price-impact, and freshness requirements.", disclosure: "Because no second eligible route was available, WealthSmith could not verify that this was the lowest-cost option.", metrics: selectedMetrics(a, nowMs), showRefresh: true, ...base };
    case "no_valid_route":
      return { kind: "no_valid_route", heading: "No route currently meets WealthSmith’s limits", providerLabel: null, body: "WealthSmith compared available read-only quotes, but none met the current cost, liquidity, price-impact, and freshness requirements. You can review the suggestion again later.", disclosure: null, metrics: [], showRefresh: true, ...base, liquidityProxyNote: null };
    case "not_ready_for_quote":
      return { kind: "not_ready_for_quote", heading: "Route comparison not available yet", providerLabel: null, body: "WealthSmith needs an exact transferable source asset and amount before comparing routes.", disclosure: null, metrics: [], showRefresh: false, ...base, alternatives: [], comparedProviderNames: [], unavailableProviderNames: [], liquidityProxyNote: null };
    case "not_required":
      return { kind: "not_required", heading: "No swap route needed", providerLabel: null, body: "No swap route is needed for this contribution.", disclosure: null, metrics: [], showRefresh: false, ...base, alternatives: [], comparedProviderNames: [], unavailableProviderNames: [], liquidityProxyNote: null };
    default:
      return { kind: "unavailable", heading: "Route comparison is unavailable right now", providerLabel: null, body: "Your financial suggestion is unchanged. You can try the comparison again later.", disclosure: null, metrics: [], showRefresh: true, ...base, liquidityProxyNote: null };
  }
}

/** DCA-specific not-ready copy (used when the contribution is not yet funded). */
export const DCA_NOT_READY_BODY = "Route comparison will be available once the contribution is present in your wallet and its source asset and amount are known.";

/** The loading view (shown while the request is in flight). */
export const LOADING_VIEW: Pick<QuoteView, "kind" | "heading" | "body" | "disclosure"> = {
  kind: "loading",
  heading: "Comparing available routes",
  body: "WealthSmith is checking read-only quotes for the same asset pair and amount across supported platforms.",
  disclosure: "No transaction is being prepared.",
};

const EMPTY_VIEW_BASE = { selectedProviderId: null, providerLabel: null, metrics: [] as QuoteMetric[], comparedProviderNames: [] as string[], unavailableProviderNames: [] as string[], alternatives: [] as QuoteAlternative[], liquidityProxyNote: null, incompleteComparison: false, selectedVenues: [] as string[], venueOverlap: false };

/** Two-step (withdraw-first) not-ready copy — the funds are verified on Kamino but not in the wallet yet. */
export const WITHDRAW_FIRST_NOT_READY_BODY = "Withdraw the USDC from Kamino first. Once it arrives in your wallet, WealthSmith can compare swap routes for the exact amount.";

/** The not-ready view (exact action identity unavailable). DCA gets the funded-contribution-specific copy;
 * a Kamino-sourced Rebalance (requiresPriorWithdrawal) gets the withdraw-first copy. */
export function notReadyView(isDca = false, reasons: string[] = []): QuoteView {
  const body = reasons.includes("usdc_source_requires_prior_withdrawal") ? WITHDRAW_FIRST_NOT_READY_BODY
    : isDca ? DCA_NOT_READY_BODY : "WealthSmith needs an exact transferable source asset and amount before comparing routes.";
  return { kind: "not_ready_for_quote", heading: "Route comparison not available yet", body, disclosure: null, showRefresh: false, ...EMPTY_VIEW_BASE };
}
/** The not-required view (no swap needed). */
export function notRequiredView(): QuoteView {
  return { kind: "not_required", heading: "No swap route needed", body: "No swap route is needed for this contribution.", disclosure: null, showRefresh: false, ...EMPTY_VIEW_BASE };
}
/** The service/error/unavailable view (with a safe refresh). */
export function unavailableView(): QuoteView {
  return { kind: "unavailable", heading: "Route comparison is unavailable right now", body: "Your financial suggestion is unchanged. You can try the comparison again later.", disclosure: null, showRefresh: true, ...EMPTY_VIEW_BASE };
}

/** True for the eligible-result kinds (rendered by SwapQuoteSelectedState). */
export function isEligibleResultKind(kind: QuoteViewKind): boolean {
  return kind === "selected" || kind === "partial" || kind === "only_route" || kind === "equivalent";
}

/** Whether two routes share an underlying venue (for the overlap disclosure). */
export function hasVenueOverlap(a: SwapQuoteComparisonAssessment): boolean {
  const seen = new Set<string>();
  for (const c of a.candidates) {
    for (const v of c.underlyingVenues) {
      if (seen.has(v)) return true;
      seen.add(v);
    }
  }
  return false;
}
export const VENUE_OVERLAP_NOTE = "Some compared routes use the same underlying liquidity venue.";
