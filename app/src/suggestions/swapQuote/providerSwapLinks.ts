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
