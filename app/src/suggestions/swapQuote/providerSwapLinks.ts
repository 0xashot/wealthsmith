/**
 * providerSwapLinks — Step 23C.2. READ-ONLY external handoff URLs to each provider's OWN swap page, pre-filled
 * with the exact pair (and amount where the provider supports it). These open in a new tab; the user completes
 * the swap on the provider's site. WealthSmith constructs / simulates / signs / submits NOTHING — this is only a
 * link out, exactly like the existing Jito / Kamino / Moonpay handoffs. Native SOL is shown as the wrapped-SOL
 * mint we already quote against.
 */
import type { SwapProviderId, SwapProviderName } from "./swapQuoteContracts";
import { SWAP_PROVIDER_NAME } from "./swapQuoteContracts";

export interface SwapHandoff {
  providerId: SwapProviderId;
  providerName: SwapProviderName;
  /** The provider's own swap page (new tab). Read-only handoff — no transaction is prepared. */
  swapUrl: string;
}

const WSOL = "So11111111111111111111111111111111111111112";
/** Provider swap UIs accept the wrapped-SOL mint; some also accept the "SOL" alias. Keep the exact mint. */
const forProvider = (mint: string) => mint;

/** Build the read-only swap-page URL for a provider + exact pair. Amount is included only where supported. */
export function buildProviderSwapUrl(providerId: SwapProviderId, inputMint: string, outputMint: string, inputAmountTokens?: string | null): string {
  const inMint = forProvider(inputMint);
  const outMint = forProvider(outputMint);
  switch (providerId) {
    case "jupiter":
      return `https://jup.ag/swap/${inMint}-${outMint}`;
    case "raydium": {
      const u = new URL("https://raydium.io/swap/");
      u.searchParams.set("inputMint", inMint === WSOL ? "sol" : inMint);
      u.searchParams.set("outputMint", outMint === WSOL ? "sol" : outMint);
      if (inputAmountTokens && inputAmountTokens !== "0") u.searchParams.set("inputAmount", inputAmountTokens);
      return u.toString();
    }
    case "orca":
    default:
      return "https://www.orca.so/";
  }
}

/** Build the full handoff (label reflects the live selected provider), or null when there is no selected route. */
export function buildSwapHandoff(providerId: SwapProviderId | null, inputMint: string, outputMint: string, inputAmountTokens?: string | null): SwapHandoff | null {
  if (!providerId) return null;
  return { providerId, providerName: SWAP_PROVIDER_NAME[providerId], swapUrl: buildProviderSwapUrl(providerId, inputMint, outputMint, inputAmountTokens) };
}

/**
 * The canonical USDC and wrapped-SOL mints, exported so a suggestion can build its static
 * Jupiter fallback link without re-declaring them.
 */
export const SWAP_LINK_USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const SWAP_LINK_WSOL_MINT = WSOL;

/**
 * The read-only Jupiter fallback handoff for a Rebalance whose live swap-route comparison has not
 * produced a selected provider — Demo Mode, or a degraded/unavailable quote path. It is the SAME
 * kind of link-out as the Jito / Kamino / Moonpay handoffs: Jupiter's own swap page, correct pair,
 * new tab. WealthSmith constructs / simulates / signs / submits NOTHING.
 *
 * When a live route DOES resolve, the modal shows that handoff instead (it names the actually
 * selected provider and carries the quoted amount), so the two never appear together.
 */
export function jupiterRebalanceFallbackLink(direction: "sol_to_usdc" | "usdc_to_sol") {
  const [inMint, outMint] = direction === "sol_to_usdc"
    ? [SWAP_LINK_WSOL_MINT, SWAP_LINK_USDC_MINT]
    : [SWAP_LINK_USDC_MINT, SWAP_LINK_WSOL_MINT];
  return {
    label: "Jupiter",
    ctaLabel: "Swap on Jupiter",
    url: buildProviderSwapUrl("jupiter", inMint, outMint),
    opensInNewTab: true,
    secondaryLabel: "Cancel",
  } as const;
}
