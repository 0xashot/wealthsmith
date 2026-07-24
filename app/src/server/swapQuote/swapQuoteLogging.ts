/**
 * swapQuoteLogging — Step 23B (SERVER-ONLY). Safe structured telemetry for a comparison. It records ONLY
 * non-sensitive operational facts (provider id, comparison id, status, latency, exclusion codes, selected
 * provider, policy version). It NEVER records a raw provider payload, header, credential, RPC URL, user profile,
 * income/expenses/risk, full holdings, or transaction content. The browser emits nothing in Step 23B.
 */
import type { SwapProviderId, SwapExclusionReason, SwapComparisonStatus } from "../../suggestions/swapQuote/swapQuoteContracts";

export interface ProviderTelemetry {
  providerId: SwapProviderId;
  outcome: "success" | "no_route" | "timeout" | "unavailable" | "malformed" | "normalization_failed" | "blocked_transaction";
  latencyMs: number;
  eligible: boolean;
  exclusionReasons: SwapExclusionReason[];
}

export interface ComparisonTelemetry {
  comparisonId: string;
  /** A safe, non-reversible identifier for the action key (never the amounts/profile). */
  actionKeyHash: string;
  status: SwapComparisonStatus;
  selectedProviderId: SwapProviderId | null;
  providers: ProviderTelemetry[];
  policyVersion: string;
  comparedAtMs: number;
}

/** A telemetry sink (default: no-op). Injectable so tests can assert emitted, sanitized events. */
export type TelemetrySink = (event: ComparisonTelemetry) => void;
export const noopTelemetrySink: TelemetrySink = () => {};

/** Deterministic non-reversible hash of an action key (FNV-1a; no secrets, no node:crypto dependency). */
export function safeActionKeyHash(key: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `k_${h.toString(16).padStart(8, "0")}`;
}

/** Assert a telemetry event carries no forbidden content (defensive; the shape already excludes sensitive data). */
export function isTelemetrySafe(event: ComparisonTelemetry): boolean {
  const blob = JSON.stringify(event).toLowerCase();
  return !/(secretkey|privatekey|apikey|authorization|bearer|rpcurl|rpc_url|income|expenses|risktolerance|swaptransaction|serializedtransaction|instructions)/.test(blob);
}
