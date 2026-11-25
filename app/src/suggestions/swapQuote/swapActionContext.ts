/**
 * swapActionContext — Step 23A. The BOUNDARY adapters between the Suggestion Engine and the quote layer. Each
 * function reads ALREADY-DECIDED, immutable fields from a production assessment (Rebalance / Trim / DCA) and
 * produces a `SwapActionReadiness` — either exact quote-ready `SwapActionContext` legs, or a `not_ready_for_quote`
 * / `not_required` verdict with reasons. These adapters NEVER change an amount, source, destination, or
 * eligibility; they only translate an already-decided action into the exact-in request shape.
 *
 * Critical rules honored here:
 *   • never infer a mint from a symbol — mints come from the exact registry;
 *   • never assume USDC is the source of a FUTURE contribution — only an on-chain funding asset is quote-ready;
 *   • never quote a protocol-held / locked asset as wallet-transferable;
 *   • never invent an amount, never quote an abstract bucket;
 *   • raw request amounts are integer-safe (BigInt / usdToRaw floor) — never float.
 */
import type { SwapActionContext, SwapActionReadiness, SwapAsset, SuggestionSwapCategory } from "./swapQuoteContracts";
import { usdToRaw, rawToTokens, isRawIntegerString } from "./swapAmountMath";

/** Exact canonical assets used by the current action set (mints + decimals from the approved registry). */
export const SWAP_USDC: SwapAsset = { symbol: "USDC", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", decimals: 6 };
export const SWAP_WSOL: SwapAsset = { symbol: "SOL", mint: "So11111111111111111111111111111111111111112", decimals: 9 };

/**
 * EXPLICIT native-SOL → Wrapped-SOL quote-boundary mapping. The Rebalance assessment identifies the source as
 * direct-wallet NATIVE SOL (identity `native_sol`, sentinel `SOL_NATIVE`); a swap quote request must use the
 * on-chain **Wrapped SOL** mint (`So111…112`). Native SOL and Wrapped SOL share 9 decimals and a 1:1 raw
 * (lamport) unit, so the exact `technicallyAvailableLamports` is used unchanged as the request amount. This is
 * the single sanctioned place that mapping happens; the display symbol stays "SOL".
 */
export const NATIVE_SOL_QUOTE_ASSET: SwapAsset = SWAP_WSOL;

function makeLeg(args: {
  actionId: string;
  suggestionId: string;
  category: SuggestionSwapCategory;
  legIndex: number;
  totalLegs: number;
  input: SwapAsset;
  output: SwapAsset;
  inputAmountRaw: string;
  inputAmountUsd: number | null;
  generatedAt: string;
  legKey?: string;
}): SwapActionContext {
  return {
    actionId: args.actionId,
    suggestionId: args.suggestionId,
    suggestionCategory: args.category,
    legId: `${args.actionId}:${args.legKey ?? args.legIndex}`,
    legIndex: args.legIndex,
    totalLegs: args.totalLegs,
    inputAsset: args.input,
    outputAsset: args.output,
    inputAmountRaw: args.inputAmountRaw,
    inputAmountTokens: rawToTokens(args.inputAmountRaw, args.input.decimals) ?? "0",
    inputAmountUsd: args.inputAmountUsd,
    sourceAvailability: "wallet_transferable",
    generatedAt: args.generatedAt,
  };
}

/* ------------------------------------------------------------------ *
 * Rebalance. The mounted production card is `stables_to_crypto` sized from verified excess DIRECT-WALLET USDC
 * (RebalanceUsdcSource) → SOL. The non-mounted `crypto_to_stables` direction has an exact native-SOL source
 * (lamports) → USDC. Both are single-leg here (one aggregated source per direction).
 * ------------------------------------------------------------------ */
export interface RebalanceSwapActionInput {
  actionId: string;
  suggestionId: string;
  generatedAt: string;
  direction: "stables_to_crypto" | "crypto_to_stables" | "within_threshold" | "unresolved";
  /**
   * How much the allocation is actually out by, in USD — `assessment.requiredCorrectionUsd`.
   *
   * THE AMOUNT TO SWAP IS THE SMALLER OF THIS AND WHAT IS AVAILABLE, which is exactly what
   * `rebalanceSuggestion` computes for the figure on the card:
   *
   *     suggestedAmountUsd = Math.min(requiredCorrectionUsd, availableValueUsd)
   *
   * Without it this adapter swapped everything available. On a wallet holding 600 SOL where
   * the correction was $30,628, the card read "Swap $30,628 of excess SOL" and the confirm
   * sheet asked to approve 599.9 SOL — $89,985, nearly three times as much. The on-chain
   * minimum check would have protected that faithfully, because a minimum guards the price of
   * a swap and not its size.
   */
  requiredCorrectionUsd: number;
  /** stables_to_crypto: verified excess wallet USDC (USD) + a fresh USDC unit price for exact raw conversion. */
  usdcSource?: { verifiedExcessValueUsd: number; selectionState: string; usdcUnitPriceUsd: number | null; requiresPriorWithdrawal?: boolean };
  /** crypto_to_stables: exact native-SOL raw lamports available + a fresh SOL price for the USD estimate. */
  nativeSolSource?: { technicallyAvailableLamports: number | null; sourceEligibilityState: string; solUnitPriceUsd: number | null };
}

export function buildRebalanceSwapAction(input: RebalanceSwapActionInput): SwapActionReadiness {
  if (input.direction === "within_threshold") return { status: "not_required", reasons: ["rebalance_within_threshold"] };
  if (input.direction === "unresolved") return { status: "not_ready_for_quote", reasons: ["rebalance_direction_unresolved"] };

  if (input.direction === "stables_to_crypto") {
    const s = input.usdcSource;
    if (!s || s.selectionState !== "selected") return { status: "not_ready_for_quote", reasons: ["usdc_source_not_selected"] };
    // Kamino-sourced two-step Rebalance: the funds are verified withdrawable but
    // NOT in the wallet yet. A quote must never pretend they are — the modal's
    // primary action is the withdrawal handoff; the swap becomes quotable through
    // the normal direct-wallet path once the USDC arrives.
    if (s.requiresPriorWithdrawal === true) return { status: "not_ready_for_quote", reasons: ["usdc_source_requires_prior_withdrawal"] };
    if (s.usdcUnitPriceUsd == null) return { status: "not_ready_for_quote", reasons: ["usdc_price_unresolved"] };
    // The correction, or everything available if that is less — never more than either.
    const amountUsd = Math.min(input.requiredCorrectionUsd, s.verifiedExcessValueUsd);
    if (!(amountUsd > 0)) return { status: "not_ready_for_quote", reasons: ["usdc_amount_unresolved"] };
    const raw = usdToRaw(amountUsd, s.usdcUnitPriceUsd, SWAP_USDC.decimals);
    if (raw == null || raw === "0") return { status: "not_ready_for_quote", reasons: ["usdc_amount_unresolved"] };
    return { status: "ready", legs: [makeLeg({ actionId: input.actionId, suggestionId: input.suggestionId, category: "rebalance", legIndex: 0, totalLegs: 1, input: SWAP_USDC, output: SWAP_WSOL, inputAmountRaw: raw, inputAmountUsd: amountUsd, generatedAt: input.generatedAt, legKey: "usdc_to_sol" })] };
  }

  // crypto_to_stables — exact native SOL lamports → USDC. The 0.1 SOL operating reserve is owned by the Rebalance
  // assessment: `technicallyAvailableLamports` is ALREADY net of it. This adapter never recomputes the reserve
  // and never quotes more than that canonical source capacity — it uses the value verbatim (mapped to wSOL).
  const s = input.nativeSolSource;
  if (!s || s.sourceEligibilityState !== "eligible" || s.technicallyAvailableLamports == null || s.technicallyAvailableLamports <= 0) {
    return { status: "not_ready_for_quote", reasons: ["native_sol_source_not_eligible"] };
  }
  // WITHOUT A PRICE the correction cannot be expressed in lamports, so there is no way to size
  // this to the recommendation. Refuse rather than fall back to "all of it": an unpriced swap
  // of the whole position is the failure this guard exists to prevent.
  if (s.solUnitPriceUsd == null || !(s.solUnitPriceUsd > 0)) {
    return { status: "not_ready_for_quote", reasons: ["native_sol_price_unresolved"] };
  }
  const availableLamports = Math.floor(s.technicallyAvailableLamports);
  const availableUsd = (availableLamports / 1_000_000_000) * s.solUnitPriceUsd;
  // The correction, or everything available if that is less. The reserve is already out of
  // `technicallyAvailableLamports`, so capping here can only ever reduce the amount further.
  const amountUsd = Math.min(input.requiredCorrectionUsd, availableUsd);
  if (!(amountUsd > 0)) return { status: "not_ready_for_quote", reasons: ["native_sol_amount_unresolved"] };
  const lamports = Math.min(
    availableLamports,
    Math.floor((amountUsd / s.solUnitPriceUsd) * 1_000_000_000),
  );
  if (lamports <= 0) return { status: "not_ready_for_quote", reasons: ["native_sol_amount_unresolved"] };
  const raw = BigInt(lamports).toString();
  const usd = (lamports / 1_000_000_000) * s.solUnitPriceUsd;
  return { status: "ready", legs: [makeLeg({ actionId: input.actionId, suggestionId: input.suggestionId, category: "rebalance", legIndex: 0, totalLegs: 1, input: NATIVE_SOL_QUOTE_ASSET, output: SWAP_USDC, inputAmountRaw: raw, inputAmountUsd: usd, generatedAt: input.generatedAt, legKey: "sol_to_usdc" })] };
}

/* ------------------------------------------------------------------ *
 * Trim. Each transferable, eligible, non-core direct-wallet holding → USDC becomes ONE independent leg, using
 * the holding's EXACT raw balance (already integer-safe). Non-transferable / unresolved holdings are excluded.
 * ------------------------------------------------------------------ */
export interface TrimHoldingInput {
  holdingId: string;
  mint: string | null;
  decimals: number | null;
  rawBalance: string;
  uiAmount: number | null;
  recognizedValueUsd: number | null;
  symbol: string;
  reviewEligibilityState: string; // "eligible" is quote-ready
  actionabilityState: string; // "transferable" is quote-ready
  coreAssetState: string; // "non_core" only
}
export interface TrimSwapActionInput {
  actionId: string;
  suggestionId: string;
  generatedAt: string;
  holdings: TrimHoldingInput[];
}

export function buildTrimSwapAction(input: TrimSwapActionInput): SwapActionReadiness {
  const quotable = input.holdings.filter(
    (h) => h.reviewEligibilityState === "eligible" && h.actionabilityState === "transferable" && h.coreAssetState === "non_core" && h.mint != null && h.decimals != null && isRawIntegerString(h.rawBalance) && BigInt(h.rawBalance) > 0n,
  );
  if (quotable.length === 0) {
    const anyUnavailable = input.holdings.some((h) => h.actionabilityState === "unavailable");
    return { status: "not_ready_for_quote", reasons: [anyUnavailable ? "trim_source_unavailable" : "trim_no_transferable_holding"] };
  }
  const legs: SwapActionContext[] = quotable.map((h, i) =>
    makeLeg({
      actionId: input.actionId,
      suggestionId: input.suggestionId,
      category: "trim",
      legIndex: i,
      totalLegs: quotable.length,
      input: { symbol: h.symbol, mint: h.mint as string, decimals: h.decimals as number },
      output: SWAP_USDC,
      inputAmountRaw: h.rawBalance,
      inputAmountUsd: h.recognizedValueUsd,
      generatedAt: input.generatedAt,
      legKey: h.holdingId,
    }),
  );
  return { status: "ready", legs };
}

/* ------------------------------------------------------------------ *
 * DCA. Quote-ready ONLY when an EXACT on-chain funding asset exists (staged excess wallet USDC → target). A
 * future recurring/stable contribution with no on-chain source → not_ready_for_quote. Directing USDC to USDC
 * (no conversion) → not_required.
 * ------------------------------------------------------------------ */
export interface DcaSwapActionInput {
  actionId: string;
  suggestionId: string;
  generatedAt: string;
  planKind: string; // "staged_excess_usdc_dca" | "recurring_dca" | "stable_contribution" | ...
  /** Present ONLY when an on-chain funding asset exists (e.g. staged excess wallet USDC). */
  sourceAssetId?: string;
  sourceUnitPriceUsd?: number | null;
  targetAssetId: string; // registry asset id (mint) of the destination
  targetSymbol: string;
  targetDecimals: number;
  amountUsd: number;
}

export function buildDcaSwapAction(input: DcaSwapActionInput): SwapActionReadiness {
  // No on-chain funding asset (future contribution) → not ready. Never assume USDC.
  if (input.planKind !== "staged_excess_usdc_dca" || !input.sourceAssetId) {
    return { status: "not_ready_for_quote", reasons: ["dca_future_contribution_no_onchain_source"] };
  }
  // Staged excess USDC is the source.
  if (input.sourceAssetId !== SWAP_USDC.mint && input.sourceAssetId !== "usdc") {
    return { status: "not_ready_for_quote", reasons: ["dca_source_asset_unsupported"] };
  }
  // No conversion required (USDC → USDC).
  if (input.targetAssetId === SWAP_USDC.mint || input.targetAssetId === "usdc") {
    return { status: "not_required", reasons: ["dca_destination_is_source_asset"] };
  }
  if (input.sourceUnitPriceUsd == null) return { status: "not_ready_for_quote", reasons: ["usdc_price_unresolved"] };
  const raw = usdToRaw(input.amountUsd, input.sourceUnitPriceUsd, SWAP_USDC.decimals);
  if (raw == null || raw === "0") return { status: "not_ready_for_quote", reasons: ["dca_amount_unresolved"] };
  const output: SwapAsset = { symbol: input.targetSymbol, mint: input.targetAssetId, decimals: input.targetDecimals };
  return { status: "ready", legs: [makeLeg({ actionId: input.actionId, suggestionId: input.suggestionId, category: "dca", legIndex: 0, totalLegs: 1, input: SWAP_USDC, output, inputAmountRaw: raw, inputAmountUsd: input.amountUsd, generatedAt: input.generatedAt, legKey: "usdc_to_target" })] };
}
