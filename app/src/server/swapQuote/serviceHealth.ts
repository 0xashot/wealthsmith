/**
 * serviceHealth — Step 23B.1 (SERVER-ONLY). Startup/readiness assessment that returns a SAFE health state
 * (ready / degraded / unavailable) with NO secret values, full credential URLs, RPC URLs, or headers. It answers:
 * can the service produce a fully-eligible comparison (ready), only a valid partial one (degraded), or none
 * because required price/liquidity evidence cannot be produced (unavailable)?
 */
import type { SwapProviderId } from "../../suggestions/swapQuote/swapQuoteContracts";
import { APPROVED_SWAP_PROVIDER_IDS } from "../../suggestions/swapQuote/swapQuoteContracts";
import { resolveProviderConfig, detectLeakedSwapEnv, type EnvReader } from "./providerConfig";

export type ServiceHealthState = "ready" | "degraded" | "unavailable";

export interface ServiceHealth {
  state: ServiceHealthState;
  /** Per-provider configured flag (never the secret/URL). */
  providers: Record<SwapProviderId, boolean>;
  priceSourceConfigured: boolean;
  liquiditySourceConfigured: boolean;
  /** Safe, non-sensitive reason codes only. */
  reasons: string[];
  checkedAtMs: number;
}

export interface HealthInputs {
  env: EnvReader;
  /** Whether an approved price source is wired (default true — Jupiter Price v3 is a public endpoint). */
  priceSourceConfigured?: boolean;
  /** Whether an approved liquidity source is wired (default true — Raydium pool TVL is a public endpoint). */
  liquiditySourceConfigured?: boolean;
}

export function assessServiceHealth(inputs: HealthInputs): ServiceHealth {
  const checkedAtMs = Date.now();
  const reasons: string[] = [];
  const leaked = detectLeakedSwapEnv(inputs.env);
  const priceSourceConfigured = inputs.priceSourceConfigured ?? true;
  const liquiditySourceConfigured = inputs.liquiditySourceConfigured ?? true;

  const providers = Object.fromEntries(
    APPROVED_SWAP_PROVIDER_IDS.map((pid) => [pid, resolveProviderConfig(pid, inputs.env).configured]),
  ) as Record<SwapProviderId, boolean>;
  const configuredCount = Object.values(providers).filter(Boolean).length;

  if (leaked.length > 0) reasons.push("vite_prefixed_secret_present");
  if (!priceSourceConfigured) reasons.push("price_source_unconfigured");
  if (!liquiditySourceConfigured) reasons.push("liquidity_source_unconfigured");
  for (const pid of APPROVED_SWAP_PROVIDER_IDS) if (!providers[pid]) reasons.push(`${pid}_unconfigured`);

  let state: ServiceHealthState;
  if (leaked.length > 0 || !priceSourceConfigured || !liquiditySourceConfigured || configuredCount === 0) {
    // Required price/liquidity evidence (or every provider) is missing → no comparison can be produced.
    state = "unavailable";
  } else if (configuredCount >= APPROVED_SWAP_PROVIDER_IDS.length) {
    // Price + liquidity + all providers → a fully-eligible comparison is possible.
    state = "ready";
  } else {
    // Price + liquidity + at least one provider → a valid partial comparison is still possible.
    state = "degraded";
  }
  return { state, providers, priceSourceConfigured, liquiditySourceConfigured, reasons, checkedAtMs };
}
