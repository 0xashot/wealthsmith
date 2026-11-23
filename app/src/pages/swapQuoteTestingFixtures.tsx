/**
 * swapQuoteTestingFixtures — Step 23C. DETERMINISTIC, SANITIZED mocked route-comparison data + a demo block that
 * renders the PRODUCTION `SwapQuoteComparisonSection` across every required state. No live provider call — the
 * /testing gallery must never depend on provider availability. Uses the production component + production
 * presentation so what renders here is exactly what users see in the Review modal.
 */
import type { SwapActionContext, SwapActionReadiness, SwapQuoteComparisonAssessment, SwapQuoteCandidate, SwapProviderId, SwapComparisonStatus, SwapExclusionReason } from "../suggestions/swapQuote/swapQuoteContracts";
import SwapQuoteComparisonSection from "../components/swapQuote/SwapQuoteComparisonSection";
import { computeSwapCostBreakdown } from "../suggestions/swapQuote/swapCostMethodology";

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const WSOL = "So11111111111111111111111111111111111111112";
export const GALLERY_NOW = Date.parse("2026-07-24T00:00:20.000Z");
const QUOTED = "2026-07-24T00:00:08.000Z";
const EXPIRES = "2026-07-24T00:00:50.000Z";

/* Gallery prices + economics. SOL matches rebalanceTestingFixtures' SOL_PRICE (250) so the
 * route section agrees with the Rebalance card above it in the modal. Every figure below —
 * candidate outputs, minimum out, estimated total cost $ and % — is DERIVED from each leg's
 * own notional through these constants and the PRODUCTION cost methodology. The presets used
 * to hardcode `$0.03 · 0.09%` (authored for a ~$15 swap), which then rendered unchanged under
 * the gallery's $605 Rebalance card. */
const GALLERY_PRICE_USD: Record<string, number> = { [USDC]: 1, [WSOL]: 250, MintBonk11111111111111111111111111111111111: 0.00002 };
const GALLERY_POOL_FEE_PCT = 0.05; // reflected in expectedOutput (methodology §2)
const GALLERY_SLIPPAGE_PCT = 0.5;  // minimum-out protection, never a cost
const GALLERY_NETWORK_FEE_USD = 0.01;

/** Whole-token decimal string (≤6 dp, trailing zeros trimmed). */
const tokensText = (n: number): string => n.toLocaleString("en-US", { maximumFractionDigits: 6, useGrouping: false });
const rawFromTokens = (n: number, decimals: number): string => BigInt(Math.max(0, Math.round(n * 10 ** decimals))).toString();

function leg(actionId: string, legId: string, inMint: string, inSym: string, inDec: number, outMint: string, outSym: string, outDec: number, raw: string, idx = 0, total = 1): SwapActionContext {
  // The leg carries its REAL notional; everything downstream derives from it.
  const tokens = Number(BigInt(raw)) / 10 ** inDec;
  const price = GALLERY_PRICE_USD[inMint];
  return { actionId, suggestionId: actionId, suggestionCategory: "rebalance", legId, legIndex: idx, totalLegs: total, inputAsset: { symbol: inSym, mint: inMint, decimals: inDec }, outputAsset: { symbol: outSym, mint: outMint, decimals: outDec }, inputAmountRaw: raw, inputAmountTokens: tokensText(tokens), inputAmountUsd: price != null ? tokens * price : null, sourceAvailability: "wallet_transferable", generatedAt: QUOTED };
}

/**
 * One provider candidate, derived from the LEG's notional:
 *   outputUsd = inputUsd × (1 − (poolFee + priceImpact)/100) × factor
 * `factor` (≤1, default 1) degrades a candidate slightly so providers rank distinctly.
 * `noQuote: true` = the provider returned nothing (excluded candidates with no figures).
 */
function cand(l: SwapActionContext, providerId: SwapProviderId, o: { eligible: boolean; pi?: number | null; factor?: number; noQuote?: boolean; reasons?: SwapExclusionReason[]; venues?: string[]; liq?: "verified" | "unresolved" | "below_minimum" }): SwapQuoteCandidate {
  const name = providerId === "jupiter" ? "Jupiter" : providerId === "raydium" ? "Raydium" : "Orca";
  const inUsd = l.inputAmountUsd ?? 0;
  const outPrice = GALLERY_PRICE_USD[l.outputAsset.mint] ?? 1;
  const hasQuote = !o.noQuote && inUsd > 0;
  const outUsd = hasQuote ? inUsd * (1 - (GALLERY_POOL_FEE_PCT + (o.pi ?? 0)) / 100) * (o.factor ?? 1) : null;
  const outTokens = outUsd != null ? outUsd / outPrice : 0;
  const minTokens = outTokens * (1 - GALLERY_SLIPPAGE_PCT / 100);
  return { providerId, providerName: name, executionSurface: providerId, underlyingVenues: o.venues ?? ["Raydium CLMM"], inputMint: l.inputAsset.mint, outputMint: l.outputAsset.mint, inputAmountRaw: l.inputAmountRaw, expectedOutputRaw: rawFromTokens(outTokens, l.outputAsset.decimals), minimumOutputRaw: rawFromTokens(minTokens, l.outputAsset.decimals), expectedOutputTokens: hasQuote ? tokensText(outTokens) : "0", expectedOutputUsd: outUsd, quotedAt: QUOTED, expiresAt: EXPIRES, quoteLatencyMs: 780, priceImpactPct: o.pi ?? null, includedSwapFeeUsd: outUsd != null ? (inUsd * GALLERY_POOL_FEE_PCT) / 100 : null, explicitPlatformFeeUsd: null, estimatedNetworkFeeUsd: GALLERY_NETWORK_FEE_USD, estimatedRentFeeUsd: 0, liquidityAssessment: { status: o.liq ?? "unresolved", minimumRouteLegLiquidityUsd: o.liq === "verified" ? 331643 : null, legs: [] }, freshness: "fresh", eligible: o.eligible, exclusionReasons: o.reasons ?? [] };
}

function mk(status: SwapComparisonStatus, l: SwapActionContext, o: { selected?: SwapProviderId | null; basis?: SwapQuoteComparisonAssessment["selectionBasis"]; candidates: SwapQuoteCandidate[]; compared: SwapProviderId[]; unavailable: SwapProviderId[]; equiv?: boolean; blocking?: string[] }): SwapQuoteComparisonAssessment {
  // Cost + outputs come from the SELECTED candidate through the production
  // methodology — the preset states no dollar or percent of its own.
  const sel = o.selected ? o.candidates.find((c) => c.providerId === o.selected) ?? null : null;
  const cost = sel ? computeSwapCostBreakdown(sel, l.inputAmountUsd) : null;
  const minTokens = sel && sel.expectedOutputUsd != null ? (sel.expectedOutputUsd / (GALLERY_PRICE_USD[l.outputAsset.mint] ?? 1)) * (1 - GALLERY_SLIPPAGE_PCT / 100) : null;
  return { status, actionId: "gallery", legId: l.legId, pairClass: "major", comparedAt: QUOTED, expiresAt: EXPIRES, selectedProviderId: o.selected ?? null, selectionBasis: o.basis ?? null, decidedBy: o.selected ? "net_output" : null, candidates: o.candidates, comparedProviders: o.compared, unavailableProviders: o.unavailable, estimatedTotalCostUsd: cost?.estimatedTotalCostUsd ?? null, estimatedTotalCostPct: cost?.estimatedTotalCostPct ?? null, expectedOutputTokens: sel?.expectedOutputTokens ?? null, minimumOutputTokens: minTokens != null ? tokensText(minTokens) : null, economicallyEquivalent: o.equiv ?? false, warnings: [], blockingReasons: o.blocking ?? [], methodologyVersion: "swap_quote_methodology_1.0.0" };
}

// Single-leg USDC→SOL action used by most cases — sized to the gallery's $605 Rebalance card.
const usdcSolLeg = leg("rb_usdc_sol", "rb_usdc_sol:0", USDC, "USDC", 6, WSOL, "SOL", 9, "605000000");
const usdcSolReady: SwapActionReadiness = { status: "ready", legs: [usdcSolLeg] };

const selected = mk("selected", usdcSolLeg, { selected: "raydium", basis: "lowest_estimated_total_cost", compared: ["jupiter", "raydium", "orca"], unavailable: [], candidates: [cand(usdcSolLeg, "raydium", { eligible: true, pi: 0.02, liq: "verified" }), cand(usdcSolLeg, "jupiter", { eligible: true, pi: 0.01, factor: 0.9997, liq: "verified", venues: ["Orca Whirlpool"] }), cand(usdcSolLeg, "orca", { eligible: true, pi: 0.03, factor: 0.999, liq: "verified", venues: ["Orca Whirlpool"] })] });
const partial = mk("partial_comparison", usdcSolLeg, { selected: "raydium", basis: "only_eligible_route", compared: ["jupiter", "raydium"], unavailable: ["orca"], candidates: [cand(usdcSolLeg, "raydium", { eligible: true, pi: 0.02, liq: "verified" }), cand(usdcSolLeg, "jupiter", { eligible: false, pi: 0.01, factor: 0.9997, reasons: ["liquidity_unresolved"], venues: ["Quantum"], liq: "unresolved" }), cand(usdcSolLeg, "orca", { eligible: false, noQuote: true, reasons: ["provider_unavailable"] })] });
const onlyRoute = mk("only_route_available", usdcSolLeg, { selected: "raydium", basis: "only_eligible_route", compared: ["jupiter", "raydium", "orca"], unavailable: [], candidates: [cand(usdcSolLeg, "raydium", { eligible: true, pi: 0.02, liq: "verified" }), cand(usdcSolLeg, "jupiter", { eligible: false, pi: 0.7, factor: 0.96, reasons: ["price_impact_high"], liq: "verified" }), cand(usdcSolLeg, "orca", { eligible: false, noQuote: true, reasons: ["liquidity_low"], liq: "below_minimum" })] });
const equivalent = mk("selected", usdcSolLeg, { selected: "jupiter", basis: "narrow_margin", compared: ["jupiter", "raydium", "orca"], unavailable: [], equiv: true, candidates: [cand(usdcSolLeg, "jupiter", { eligible: true, pi: 0.02, liq: "verified", venues: ["Raydium CLMM"] }), cand(usdcSolLeg, "raydium", { eligible: true, pi: 0.02, liq: "verified" }), cand(usdcSolLeg, "orca", { eligible: true, pi: 0.02, liq: "verified", venues: ["Orca Whirlpool"] })] });
const noValidRoute = mk("no_valid_route", usdcSolLeg, { selected: null, compared: ["jupiter", "raydium"], unavailable: ["orca"], blocking: ["estimated_cost_high"], candidates: [cand(usdcSolLeg, "raydium", { eligible: false, pi: 0.1, factor: 0.97, reasons: ["estimated_cost_high"], liq: "verified" }), cand(usdcSolLeg, "jupiter", { eligible: false, noQuote: true, reasons: ["liquidity_unresolved"], liq: "unresolved" }), cand(usdcSolLeg, "orca", { eligible: false, noQuote: true, reasons: ["provider_unavailable"] })] });

// Multi-leg plan (two legs, mixed providers, one unresolved).
const legA = leg("rb_plan", "rb_plan:0", USDC, "USDC", 6, WSOL, "SOL", 9, "605000000", 0, 2);
const legB = leg("rb_plan", "rb_plan:1", WSOL, "SOL", 9, USDC, "USDC", 6, "50000000", 1, 2);
const planReady: SwapActionReadiness = { status: "ready", legs: [legA, legB] };
const planAssessments: Record<string, SwapQuoteComparisonAssessment> = {
  [legA.legId]: mk("selected", legA, { selected: "raydium", basis: "lowest_estimated_total_cost", compared: ["jupiter", "raydium", "orca"], unavailable: [], candidates: [cand(legA, "raydium", { eligible: true, pi: 0.02, liq: "verified" }), cand(legA, "jupiter", { eligible: true, pi: 0.01, factor: 0.9995, liq: "verified" })] }),
  [legB.legId]: mk("no_valid_route", legB, { selected: null, compared: ["raydium"], unavailable: ["jupiter", "orca"], blocking: ["liquidity_low"], candidates: [cand(legB, "raydium", { eligible: false, noQuote: true, reasons: ["liquidity_low"], liq: "below_minimum" })] }),
};

// Trim exact token → USDC — sized to the gallery's $300 Trim card (15,000,000 BONK @ $0.00002).
const trimLeg = leg("trim", "trim:0", "MintBonk11111111111111111111111111111111111", "BONK", 5, USDC, "USDC", 6, "1500000000000");
const trimReady: SwapActionReadiness = { status: "ready", legs: [trimLeg] };
const trimSelected = mk("selected", trimLeg, { selected: "raydium", basis: "lowest_estimated_total_cost", compared: ["jupiter", "raydium", "orca"], unavailable: [], candidates: [cand(trimLeg, "raydium", { eligible: true, pi: 0.2, liq: "verified" }), cand(trimLeg, "jupiter", { eligible: true, pi: 0.2, factor: 0.998, liq: "verified" })] });

// DCA funded USDC → SOL, plus not-ready / not-required readiness.
const dcaLeg = leg("dca", "dca:0", USDC, "USDC", 6, WSOL, "SOL", 9, "605000000");
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
  { key: "trim-none", label: "Trim · no valid route", readiness: trimReady, presets: { [trimLeg.legId]: mk("no_valid_route", trimLeg, { selected: null, compared: ["raydium"], unavailable: ["jupiter", "orca"], blocking: ["liquidity_low"], candidates: [cand(trimLeg, "raydium", { eligible: false, noQuote: true, reasons: ["liquidity_low"], liq: "below_minimum" })] }) } },
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
