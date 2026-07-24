/**
 * swapPairRegistry — Step 23A. The APPROVED, versioned major/minor pair classification. Classification is
 * DETERMINISTIC and identity-based (exact mint pair), never inferred from live market cap or trade size. An
 * unrecognized pair fails closed to `unresolved` → `pair_classification_unresolved` (no valid route).
 *
 * Major pairs currently: SOL/USDC and USDC/SOL only (the sole documented highly-liquid product pairs). Minor
 * pairs: other approved supported-token pairs (none enabled yet — additions require review). Direction-agnostic
 * entries are stored once and matched in either order.
 */
import type { SwapPairClass } from "./swapQuoteContracts";

export const SWAP_PAIR_REGISTRY_VERSION = "swap_pair_registry_1.0.0" as const;

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
 * Classify an exact mint pair. Direction-agnostic. Returns `unresolved` for any pair not in an enabled registry
 * entry — the caller must treat `unresolved` as no-valid-route (`pair_classification_unresolved`), never guess.
 */
export function classifySwapPair(inputMint: string, outputMint: string): SwapPairClass {
  if (!inputMint || !outputMint || inputMint === outputMint) return "unresolved";
  for (const e of SWAP_PAIR_REGISTRY) {
    if (!e.enabled) continue;
    const match = (e.mintA === inputMint && e.mintB === outputMint) || (e.mintA === outputMint && e.mintB === inputMint);
    if (match) return e.pairClass;
  }
  return "unresolved";
}
