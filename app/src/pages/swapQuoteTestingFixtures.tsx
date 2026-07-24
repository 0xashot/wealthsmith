/**
 * swapQuoteTestingFixtures — Step 23C. DETERMINISTIC, SANITIZED mocked route-comparison data + a demo block that
 * renders the PRODUCTION `SwapQuoteComparisonSection` across every required state. No live provider call — the
 * /testing gallery must never depend on provider availability. Uses the production component + production
 * presentation so what renders here is exactly what users see in the Review modal.
 */
import type { SwapActionContext, SwapActionReadiness, SwapQuoteComparisonAssessment, SwapQuoteCandidate, SwapProviderId, SwapComparisonStatus, SwapExclusionReason } from "../suggestions/swapQuote/swapQuoteContracts";
import SwapQuoteComparisonSection from "../components/swapQuote/SwapQuoteComparisonSection";

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const WSOL = "So11111111111111111111111111111111111111112";
export const GALLERY_NOW = Date.parse("2026-07-24T00:00:20.000Z");
const QUOTED = "2026-07-24T00:00:08.000Z";
const EXPIRES = "2026-07-24T00:00:50.000Z";

function leg(actionId: string, legId: string, inMint: string, inSym: string, inDec: number, outMint: string, outSym: string, outDec: number, raw: string, idx = 0, total = 1): SwapActionContext {
  return { actionId, suggestionId: actionId, suggestionCategory: "rebalance", legId, legIndex: idx, totalLegs: total, inputAsset: { symbol: inSym, mint: inMint, decimals: inDec }, outputAsset: { symbol: outSym, mint: outMint, decimals: outDec }, inputAmountRaw: raw, inputAmountTokens: "0", inputAmountUsd: null, sourceAvailability: "wallet_transferable", generatedAt: QUOTED };
}

function cand(providerId: SwapProviderId, o: { eligible: boolean; out?: string; pi?: number | null; reasons?: SwapExclusionReason[]; venues?: string[]; liq?: "verified" | "unresolved" | "below_minimum" }): SwapQuoteCandidate {
  const name = providerId === "jupiter" ? "Jupiter" : providerId === "raydium" ? "Raydium" : "Orca";
  return { providerId, providerName: name, executionSurface: providerId, underlyingVenues: o.venues ?? ["Raydium CLMM"], inputMint: USDC, outputMint: WSOL, inputAmountRaw: "15000000", expectedOutputRaw: o.out ? "197901045" : "0", minimumOutputRaw: "196911540", expectedOutputTokens: o.out ?? "0", expectedOutputUsd: o.out ? 14.98 : null, quotedAt: QUOTED, expiresAt: EXPIRES, quoteLatencyMs: 780, priceImpactPct: o.pi ?? null, includedSwapFeeUsd: null, explicitPlatformFeeUsd: null, estimatedNetworkFeeUsd: 0.01, estimatedRentFeeUsd: 0, liquidityAssessment: { status: o.liq ?? "unresolved", minimumRouteLegLiquidityUsd: o.liq === "verified" ? 331643 : null, legs: [] }, freshness: "fresh", eligible: o.eligible, exclusionReasons: o.reasons ?? [] };
}

function mk(status: SwapComparisonStatus, o: { legId: string; selected?: SwapProviderId | null; basis?: SwapQuoteComparisonAssessment["selectionBasis"]; candidates: SwapQuoteCandidate[]; compared: SwapProviderId[]; unavailable: SwapProviderId[]; costUsd?: number | null; costPct?: number | null; out?: string | null; equiv?: boolean; blocking?: string[] }): SwapQuoteComparisonAssessment {
  return { status, actionId: "gallery", legId: o.legId, pairClass: "major", comparedAt: QUOTED, expiresAt: EXPIRES, selectedProviderId: o.selected ?? null, selectionBasis: o.basis ?? null, candidates: o.candidates, comparedProviders: o.compared, unavailableProviders: o.unavailable, estimatedTotalCostUsd: o.costUsd ?? null, estimatedTotalCostPct: o.costPct ?? null, expectedOutputTokens: o.out ?? null, minimumOutputTokens: o.out ? "0.196911" : null, economicallyEquivalent: o.equiv ?? false, warnings: [], blockingReasons: o.blocking ?? [], methodologyVersion: "swap_quote_methodology_1.0.0" };
}

const OUT = "0.197901";
// Single-leg USDC→SOL action used by most cases.
const usdcSolLeg = leg("rb_usdc_sol", "rb_usdc_sol:0", USDC, "USDC", 6, WSOL, "SOL", 9, "15000000");
const usdcSolReady: SwapActionReadiness = { status: "ready", legs: [usdcSolLeg] };

const selected = mk("selected", { legId: usdcSolLeg.legId, selected: "raydium", basis: "lowest_estimated_total_cost", compared: ["jupiter", "raydium", "orca"], unavailable: [], costUsd: 0.03, costPct: 0.09, out: OUT, candidates: [cand("raydium", { eligible: true, out: OUT, pi: 0.02, liq: "verified" }), cand("jupiter", { eligible: true, out: "0.197850", pi: 0.01, liq: "verified", venues: ["Orca Whirlpool"] }), cand("orca", { eligible: true, out: "0.197700", pi: 0.03, liq: "verified", venues: ["Orca Whirlpool"] })] });
const partial = mk("partial_comparison", { legId: usdcSolLeg.legId, selected: "raydium", basis: "only_eligible_route", compared: ["jupiter", "raydium"], unavailable: ["orca"], costUsd: 0.03, costPct: 0.09, out: OUT, candidates: [cand("raydium", { eligible: true, out: OUT, pi: 0.02, liq: "verified" }), cand("jupiter", { eligible: false, out: "0.197850", pi: 0.01, reasons: ["liquidity_unresolved"], venues: ["Quantum"], liq: "unresolved" }), cand("orca", { eligible: false, reasons: ["provider_unavailable"] })] });
const onlyRoute = mk("only_route_available", { legId: usdcSolLeg.legId, selected: "raydium", basis: "only_eligible_route", compared: ["jupiter", "raydium", "orca"], unavailable: [], costUsd: 0.03, costPct: 0.09, out: OUT, candidates: [cand("raydium", { eligible: true, out: OUT, pi: 0.02, liq: "verified" }), cand("jupiter", { eligible: false, out: "0.19", pi: 0.7, reasons: ["price_impact_high"], liq: "verified" }), cand("orca", { eligible: false, reasons: ["liquidity_low"], liq: "below_minimum" })] });
const equivalent = mk("selected", { legId: usdcSolLeg.legId, selected: "jupiter", basis: "economically_equivalent_tiebreak", compared: ["jupiter", "raydium", "orca"], unavailable: [], costUsd: 0.03, costPct: 0.09, out: OUT, equiv: true, candidates: [cand("jupiter", { eligible: true, out: OUT, pi: 0.02, liq: "verified", venues: ["Raydium CLMM"] }), cand("raydium", { eligible: true, out: OUT, pi: 0.02, liq: "verified" }), cand("orca", { eligible: true, out: OUT, pi: 0.02, liq: "verified", venues: ["Orca Whirlpool"] })] });
const noValidRoute = mk("no_valid_route", { legId: usdcSolLeg.legId, selected: null, compared: ["jupiter", "raydium"], unavailable: ["orca"], blocking: ["estimated_cost_high"], candidates: [cand("raydium", { eligible: false, out: "0.19", pi: 0.1, reasons: ["estimated_cost_high"], liq: "verified" }), cand("jupiter", { eligible: false, reasons: ["liquidity_unresolved"], liq: "unresolved" }), cand("orca", { eligible: false, reasons: ["provider_unavailable"] })] });

// Multi-leg plan (two legs, mixed providers, one unresolved).
const legA = leg("rb_plan", "rb_plan:0", USDC, "USDC", 6, WSOL, "SOL", 9, "15000000", 0, 2);
const legB = leg("rb_plan", "rb_plan:1", WSOL, "SOL", 9, USDC, "USDC", 6, "50000000", 1, 2);
const planReady: SwapActionReadiness = { status: "ready", legs: [legA, legB] };
const planAssessments: Record<string, SwapQuoteComparisonAssessment> = {
  [legA.legId]: mk("selected", { legId: legA.legId, selected: "raydium", basis: "lowest_estimated_total_cost", compared: ["jupiter", "raydium", "orca"], unavailable: [], costUsd: 0.03, costPct: 0.09, out: OUT, candidates: [cand("raydium", { eligible: true, out: OUT, pi: 0.02, liq: "verified" }), cand("jupiter", { eligible: true, out: "0.1978", pi: 0.01, liq: "verified" })] }),
  [legB.legId]: mk("no_valid_route", { legId: legB.legId, selected: null, compared: ["raydium"], unavailable: ["jupiter", "orca"], blocking: ["liquidity_low"], candidates: [cand("raydium", { eligible: false, reasons: ["liquidity_low"], liq: "below_minimum" })] }),
};

// Trim exact token → USDC.
const trimLeg = leg("trim", "trim:0", "MintBonk11111111111111111111111111111111111", "BONK", 5, USDC, "USDC", 6, "500000");
const trimReady: SwapActionReadiness = { status: "ready", legs: [trimLeg] };
const trimSelected = mk("selected", { legId: trimLeg.legId, selected: "raydium", basis: "lowest_estimated_total_cost", compared: ["jupiter", "raydium", "orca"], unavailable: [], costUsd: 0.05, costPct: 0.25, out: "5.01", candidates: [cand("raydium", { eligible: true, out: "5.01", pi: 0.2, liq: "verified" }), cand("jupiter", { eligible: true, out: "5.00", pi: 0.2, liq: "verified" })] });

// DCA funded USDC → SOL, plus not-ready / not-required readiness.
const dcaLeg = leg("dca", "dca:0", USDC, "USDC", 6, WSOL, "SOL", 9, "15000000");
const dcaReady: SwapActionReadiness = { status: "ready", legs: [dcaLeg] };
const dcaNotReady: SwapActionReadiness = { status: "not_ready_for_quote", reasons: ["dca_future_contribution_no_onchain_source"] };
const dcaNotRequired: SwapActionReadiness = { status: "not_required", reasons: ["dca_destination_is_source_asset"] };

interface Demo { key: string; label: string; readiness: SwapActionReadiness; presets?: Record<string, SwapQuoteComparisonAssessment>; loading?: boolean; isDca?: boolean }
const DEMOS: Demo[] = [
  { key: "rb-selected", label: "Rebalance · selected (multiple eligible)", readiness: usdcSolReady, presets: { [usdcSolLeg.legId]: selected } },
  { key: "rb-partial", label: "Rebalance · partial comparison (Orca unavailable)", readiness: usdcSolReady, presets: { [usdcSolLeg.legId]: partial } },
  { key: "rb-only", label: "Rebalance · only eligible route", readiness: usdcSolReady, presets: { [usdcSolLeg.legId]: onlyRoute } },
  { key: "rb-equiv", label: "Rebalance · economically equivalent (Jupiter tie-break)", readiness: usdcSolReady, presets: { [usdcSolLeg.legId]: equivalent } },
  { key: "rb-none", label: "Rebalance · no valid route", readiness: usdcSolReady, presets: { [usdcSolLeg.legId]: noValidRoute } },
  { key: "rb-multi", label: "Rebalance · multi-leg (mixed providers, one unresolved)", readiness: planReady, presets: planAssessments },
  { key: "rb-loading", label: "Rebalance · loading", readiness: usdcSolReady, loading: true },
  { key: "trim-selected", label: "Trim · selected route (token → USDC)", readiness: trimReady, presets: { [trimLeg.legId]: trimSelected } },
  { key: "trim-none", label: "Trim · no valid route", readiness: trimReady, presets: { [trimLeg.legId]: mk("no_valid_route", { legId: trimLeg.legId, selected: null, compared: ["raydium"], unavailable: ["jupiter", "orca"], blocking: ["liquidity_low"], candidates: [cand("raydium", { eligible: false, reasons: ["liquidity_low"], liq: "below_minimum" })] }) } },
  { key: "dca-selected", label: "DCA · funded wallet USDC → SOL selected", readiness: dcaReady, isDca: true, presets: { [dcaLeg.legId]: { ...selected, legId: dcaLeg.legId } } },
  { key: "dca-partial", label: "DCA · partial comparison", readiness: dcaReady, isDca: true, presets: { [dcaLeg.legId]: { ...partial, legId: dcaLeg.legId } } },
  { key: "dca-not-ready", label: "DCA · future contribution not ready", readiness: dcaNotReady, isDca: true },
  { key: "dca-not-required", label: "DCA · USDC → USDC not required", readiness: dcaNotRequired, isDca: true },
];

/** Production-component route-comparison states (deterministic mocked sanitized data; no live providers). */
export default function SwapQuoteGalleryStates() {
  return (
    <section className="testing-page__section" aria-label="Suggested route (read-only) — Step 23C">
      <h2 className="testing-page__section-title">Suggested route (read-only) — Step 23C</h2>
      <p className="testing-page__section-note">Production route-comparison component with deterministic mocked sanitized responses. No live provider calls. Rendered as it appears inside the Review modal (after the recommendation).</p>
      <div className="testing-page__grid">
        {DEMOS.map((d) => (
          <div key={d.key} className="testing-page__cell">
            <p className="testing-page__cell-label">{d.label}</p>
            <div className="review-modal review-modal__body" style={{ display: "block" }}>
              <SwapQuoteComparisonSection readiness={d.readiness} enabled isDca={d.isDca} presetAssessments={d.presets} presetLoading={d.loading} nowMs={GALLERY_NOW} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Exposed for in-modal wiring demos (Rebalance/Trim/DCA modals in the gallery). */
export const GALLERY_MODAL_PRESETS = {
  rebalance: { readiness: usdcSolReady, presets: { [usdcSolLeg.legId]: selected } },
  trim: { readiness: trimReady, presets: { [trimLeg.legId]: trimSelected } },
  dca: { readiness: dcaReady, isDca: true, presets: { [dcaLeg.legId]: { ...selected, legId: dcaLeg.legId } } },
};
