/**
 * swapPairRegistry — Step 23A. The APPROVED, versioned major/minor pair classification. Classification is
 * DETERMINISTIC and identity-based (exact mint pair), never inferred from live market cap or trade size. An
 * unrecognized pair fails closed to `unresolved` → `pair_classification_unresolved` (no valid route).
 *
 * Major pairs currently: SOL/USDC and USDC/SOL only (the sole documented highly-liquid product pairs). Direction-
 * agnostic entries are stored once and matched in either order.
 *
 * MINOR, BY RULE: any token SOLD FOR USDC (see SELL_TO_USDC_RULE). This is the one classification that is not an
 * exact pair, and it is deliberately one-directional: it approves leaving a token for USDC, never buying one.
 */
import type { SwapPairClass } from "./swapQuoteContracts";

export const SWAP_PAIR_REGISTRY_VERSION = "swap_pair_registry_1.1.0" as const;

const SOL_MINT = "So11111111111111111111111111111111111111112";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export interface SwapPairEntry {
  pairId: string;
  mintA: string;
  mintB: string;
  /** Major/minor. Direction-agnostic: {A,B} classifies the same as {B,A}. */
  pairClass: Exclude<SwapPairClass, "unresolved">;
  enabled: boolean;
  evidenceSource: string;
}

/** Approved pairs. Add a MINOR entry only with explicit product approval; unknown pairs stay `unresolved`. */
export const SWAP_PAIR_REGISTRY: readonly SwapPairEntry[] = [
  {
    pairId: "sol_usdc",
    mintA: SOL_MINT,
    mintB: USDC_MINT,
    pairClass: "major",
    enabled: true,
    evidenceSource: "Protocol Decision Logic — SOL/USDC is the documented major (highly-liquid) pair.",
  },
] as const;

/**
 * SELL TO USDC — any token → USDC is an approved MINOR pair. Product decision, 2026-11-26 (Trim).
 *
 * WHY A RULE AND NOT A LIST. Trim sells long-tail tokens a wallet already holds, and there is no finite list of
 * those. What makes a sale acceptable is not which token it is but whether THIS sale passes the checks every
 * minor pair already gets — price impact under the limit, total cost under the minor limit, a fresh quote — and
 * then the plan's simulation and the on-chain minimum. A token that cannot really be sold fails those; nothing
 * here vouches for the token.
 *
 * WHY ONE DIRECTION. Selling a held token for USDC can go wrong in two ways — a bad price or a failed swap — and
 * the checks cover both. BUYING an arbitrary token adds a third the checks cannot see: what was bought. So the
 * rule matches on the OUTPUT mint only; USDC → anything stays `unresolved` unless it is in the registry above.
 *
 * It is not tied to a suggestion category: the category is a label the caller sends, and a rule that leaned on
 * it would be decoration. Direction is a fact of the request.
 */
export const SELL_TO_USDC_RULE = {
  ruleId: "sell_to_usdc",
  enabled: true,
  outputMint: USDC_MINT,
  pairClass: "minor" as Exclude<SwapPairClass, "unresolved">,
  evidenceSource: "Product decision 2026-11-26 — Trim: a held token may be sold for USDC when the sale itself passes the minor-pair limits.",
} as const;

/**
 * Classify a swap. The registry's exact pairs first (direction-agnostic), then the sell-to-USDC rule
 * (direction-AWARE). Returns `unresolved` for anything else — the caller must treat `unresolved` as
 * no-valid-route (`pair_classification_unresolved`), never guess.
 */
export function classifySwapPair(inputMint: string, outputMint: string): SwapPairClass {
  if (!inputMint || !outputMint || inputMint === outputMint) return "unresolved";
  for (const e of SWAP_PAIR_REGISTRY) {
    if (!e.enabled) continue;
    const match = (e.mintA === inputMint && e.mintB === outputMint) || (e.mintA === outputMint && e.mintB === inputMint);
    if (match) return e.pairClass;
  }
  if (SELL_TO_USDC_RULE.enabled && outputMint === SELL_TO_USDC_RULE.outputMint) return SELL_TO_USDC_RULE.pairClass;
  return "unresolved";
}
