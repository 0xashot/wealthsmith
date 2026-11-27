/**
 * providerConfig — Step 23B (SERVER-ONLY). The versioned provider ENDPOINT/SDK registry + secret resolution.
 * Endpoints and adapter versions live here (not scattered through adapters). Secrets are read from server-only
 * env vars following the repo convention (plain names, NEVER `VITE_`-prefixed — a `VITE_` swap secret is a leak
 * and is rejected). A missing secret marks THAT provider unavailable; it never crashes the comparison and never
 * triggers a client-side fallback. Secret VALUES never appear in the returned config (only a `configured` flag).
 */
import type { SwapProviderId } from "../../suggestions/swapQuote/swapQuoteContracts";
import type { ProviderRuntimeConfig } from "./providerContracts";

export const SWAP_PROVIDER_CONFIG_VERSION = "swap_provider_config_1.0.0" as const;

/** Per-provider adapter versions (bump when an adapter's request/normalization behavior changes). */
export const SWAP_ADAPTER_VERSIONS: Record<SwapProviderId, string> = {
  // 23B.1: pinned to the current Jupiter Swap API host (api.jup.ag/swap/v1/quote). The historical
  // quote-api.jup.ag/v6 host is retired — do not use it.
  jupiter: "jupiter_quote_adapter_1.1.0",
  // 23C §1: price-impact unit corrected to percentage points (heuristic removed) — behavior change → version bump.
  raydium: "raydium_quote_adapter_1.1.0",
  orca: "orca_quote_adapter_1.0.0",
};

/**
 * Default public quote endpoints (quote-only paths). These are documented, read-only quote surfaces; the actual
 * host may be overridden by a server-only env var. Orca has no HTTP quote endpoint — it reads on-chain Whirlpool
 * state via an approved server-only RPC.
 */
export const SWAP_PROVIDER_ENDPOINTS = {
  // One key covers every Jupiter API we call (quotes, swap build, prices, token listings). It is
  // OPTIONAL: without it the same requests are made keyless, at Jupiter's anonymous rate limit.
  jupiter: { quoteEndpoint: "https://api.jup.ag/swap/v1/quote", envKey: "JUPITER_API_KEY", envUrlKey: "JUPITER_QUOTE_URL", requiresSecret: false },
  raydium: { quoteEndpoint: "https://transaction-v1.raydium.io/compute/swap-base-in", envKey: "RAYDIUM_QUOTE_API_KEY", envUrlKey: "RAYDIUM_QUOTE_URL", requiresSecret: false },
  orca: { quoteEndpoint: null as string | null, envKey: "SOLANA_RPC_URL", envUrlKey: "SOLANA_RPC_URL", requiresSecret: true },
} as const;

/** Env keys that would leak a swap secret into the browser bundle. Their presence is a hard misconfiguration. */
export const FORBIDDEN_SWAP_ENV_KEYS: readonly string[] = [
  "VITE_JUPITER_QUOTE_API_KEY",
  "VITE_JUPITER_API_KEY",
  "VITE_RAYDIUM_QUOTE_API_KEY",
  "VITE_SOLANA_RPC_URL",
  "VITE_SWAP_RPC_URL",
] as const;

export type EnvReader = (key: string) => string | undefined;

/** Detect any forbidden `VITE_`-prefixed swap secret in the environment (a leak the caller must refuse to run under). */
export function detectLeakedSwapEnv(env: EnvReader): string[] {
  return FORBIDDEN_SWAP_ENV_KEYS.filter((k) => {
    const v = env(k);
    return typeof v === "string" && v.length > 0;
  });
}

/**
 * Resolve one provider's runtime config from the server env. Never returns the secret value — only whether the
 * provider is `configured`. A provider that requires a secret but has none is `configured: false` (→ unavailable).
 */
export function resolveProviderConfig(providerId: SwapProviderId, env: EnvReader): ProviderRuntimeConfig {
  const spec = SWAP_PROVIDER_ENDPOINTS[providerId];
  const missing: string[] = [];
  const secretPresent = typeof env(spec.envKey) === "string" && (env(spec.envKey) as string).length > 0;
  const urlOverride = env(spec.envUrlKey);

  const rpcEndpoint = providerId === "orca" ? (urlOverride ?? null) : null;
  const quoteEndpoint = providerId === "orca" ? null : (urlOverride ?? spec.quoteEndpoint);

  if (spec.requiresSecret && !secretPresent) missing.push(`${spec.envKey}_not_set`);
  if (providerId === "orca" && !rpcEndpoint) missing.push("orca_rpc_endpoint_not_set");

  return {
    providerId,
    adapterVersion: SWAP_ADAPTER_VERSIONS[providerId],
    quoteEndpoint,
    rpcEndpoint,
    configured: missing.length === 0,
    missingConfigReasons: missing,
  };
}

/** The default env reader for a Node server context (never used in the browser). */
export const nodeEnvReader: EnvReader = (key) => (typeof process !== "undefined" ? process.env?.[key] : undefined);
