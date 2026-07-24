/**
 * httpHandler — Step 23B (SERVER-ONLY). A framework-agnostic request handler for the request-time swap-quote
 * endpoint. It strictly validates a small, safe request (approved category, mint format, integer positive raw
 * amount, approved slippage, no arbitrary provider/RPC URL, no wallet-private field), builds the immutable
 * `SwapActionContext`, runs the orchestrator, and returns ONLY a sanitized `SwapQuoteComparisonAssessment`. It
 * never returns a raw provider response, header, credential, transaction, instruction, or internal stack trace.
 */
import type { SwapActionContext, SwapQuoteComparisonAssessment, SuggestionSwapCategory } from "../../suggestions/swapQuote/swapQuoteContracts";
import { classifySwapPair } from "../../suggestions/swapQuote/swapPairRegistry";
import { isRawIntegerString } from "../../suggestions/swapQuote/swapAmountMath";
import { collectSwapQuoteSnapshot, type SwapQuoteOrchestratorOptions } from "./swapQuoteOrchestrator";
import { scanForForbiddenServerFields } from "./responseSanitizer";

const MINT_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const MAX_RAW_LEN = 40;
const APPROVED_CATEGORIES: readonly SuggestionSwapCategory[] = ["rebalance", "trim", "dca"];
const MIN_SLIPPAGE_BPS = 1;
const MAX_SLIPPAGE_BPS = 300;

export interface SwapQuoteHttpRequest {
  method?: string;
  category: string;
  suggestionId: string;
  inputMint: string;
  outputMint: string;
  inputSymbol?: string;
  outputSymbol?: string;
  inputDecimals: number;
  outputDecimals: number;
  inputAmountRaw: string;
  slippageBps: number;
}

export type SwapQuoteHttpResponse =
  | { status: 200; body: SwapQuoteComparisonAssessment }
  | { status: 400 | 405 | 422 | 500; body: { error: string } };

function validate(req: SwapQuoteHttpRequest): string | null {
  if (req.method && req.method.toUpperCase() !== "POST") return "method_not_allowed";
  // Reject any wallet-private / arbitrary-URL / credential field smuggled into the request.
  const scan = scanForForbiddenServerFields(req);
  if (!scan.clean) return "forbidden_request_field";
  if (typeof (req as unknown as Record<string, unknown>).rpcUrl === "string" || typeof (req as unknown as Record<string, unknown>).providerUrl === "string") return "arbitrary_url_not_allowed";
  if (!APPROVED_CATEGORIES.includes(req.category as SuggestionSwapCategory)) return "invalid_category";
  if (!MINT_RE.test(req.inputMint) || !MINT_RE.test(req.outputMint)) return "invalid_mint";
  if (req.inputMint === req.outputMint) return "same_mint";
  if (!isRawIntegerString(req.inputAmountRaw) || req.inputAmountRaw.length > MAX_RAW_LEN) return "invalid_amount";
  if (BigInt(req.inputAmountRaw) <= 0n) return "non_positive_amount";
  if (!Number.isInteger(req.inputDecimals) || req.inputDecimals < 0 || req.inputDecimals > 18) return "invalid_input_decimals";
  if (!Number.isInteger(req.outputDecimals) || req.outputDecimals < 0 || req.outputDecimals > 18) return "invalid_output_decimals";
  if (!Number.isInteger(req.slippageBps) || req.slippageBps < MIN_SLIPPAGE_BPS || req.slippageBps > MAX_SLIPPAGE_BPS) return "invalid_slippage";
  if (classifySwapPair(req.inputMint, req.outputMint) === "unresolved") return "pair_not_approved";
  return null;
}

/** Create the request-time handler bound to server-side orchestrator deps (price/liquidity sources, cache, etc.). */
export function createSwapQuoteHandler(deps: Omit<SwapQuoteOrchestratorOptions, "slippageBps"> & { now?: () => number }) {
  return async function handleSwapQuoteRequest(req: SwapQuoteHttpRequest): Promise<SwapQuoteHttpResponse> {
    const err = validate(req);
    if (err === "method_not_allowed") return { status: 405, body: { error: err } };
    if (err) return { status: err === "pair_not_approved" ? 422 : 400, body: { error: err } };

    const now = deps.now ?? (() => Date.now());
    const action: SwapActionContext = {
      actionId: `${req.category}:${req.suggestionId}`,
      suggestionId: req.suggestionId,
      suggestionCategory: req.category as SuggestionSwapCategory,
      legId: `${req.category}:${req.suggestionId}:0`,
      legIndex: 0,
      totalLegs: 1,
      inputAsset: { symbol: req.inputSymbol ?? "IN", mint: req.inputMint, decimals: req.inputDecimals },
      outputAsset: { symbol: req.outputSymbol ?? "OUT", mint: req.outputMint, decimals: req.outputDecimals },
      inputAmountRaw: req.inputAmountRaw,
      inputAmountTokens: "0",
      inputAmountUsd: null,
      sourceAvailability: "wallet_transferable",
      generatedAt: new Date(now()).toISOString(),
    };
    try {
      const assessment = await collectSwapQuoteSnapshot(action, { ...deps, slippageBps: req.slippageBps });
      return { status: 200, body: assessment };
    } catch {
      // Never expose an internal stack trace / raw error.
      return { status: 500, body: { error: "comparison_failed" } };
    }
  };
}
