/**
 * orcaWhirlpoolRegistry — Step 23B (SERVER-ONLY). The APPROVED, versioned Whirlpool address registry per exact
 * mint pair. Orca quotes are read from these approved pools only — the adapter never scans arbitrary pools. An
 * unknown pair resolves to null → no route (never a guess). Addresses are the canonical mainnet Whirlpools; a
 * real deployment may override them via config review.
 */
export const ORCA_WHIRLPOOL_REGISTRY_VERSION = "orca_whirlpool_registry_1.0.0" as const;

const SOL_MINT = "So11111111111111111111111111111111111111112";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export interface ApprovedWhirlpool {
  whirlpoolId: string;
  mintA: string;
  mintB: string;
  tickSpacing: number;
  enabled: boolean;
}

/** Approved SOL/USDC Whirlpool (mainnet). Direction-agnostic on the pair. */
export const ORCA_APPROVED_WHIRLPOOLS: readonly ApprovedWhirlpool[] = [
  { whirlpoolId: "HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ", mintA: SOL_MINT, mintB: USDC_MINT, tickSpacing: 4, enabled: true },
];

/** Resolve the approved Whirlpool for an exact mint pair (either direction), or null when none is approved. */
export function resolveApprovedWhirlpool(inputMint: string, outputMint: string): ApprovedWhirlpool | null {
  for (const w of ORCA_APPROVED_WHIRLPOOLS) {
    if (!w.enabled) continue;
    if ((w.mintA === inputMint && w.mintB === outputMint) || (w.mintA === outputMint && w.mintB === inputMint)) return w;
  }
  return null;
}
