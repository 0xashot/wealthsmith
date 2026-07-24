/**
 * responseSanitizer — Step 23B (SERVER-ONLY). The final gate before an assessment leaves the server. It extends
 * the Step-23A transaction-field scan with server-side execution/credential terms and asserts the sanitized
 * output carries NONE of them. A transaction-bearing result is REJECTED (thrown), never silently stripped, so a
 * mis-called execution endpoint can never leak past the boundary. Also strips any accidental non-contract keys.
 */
import { FORBIDDEN_TRANSACTION_FIELDS, scanForTransactionFields } from "../../suggestions/swapQuote/swapQuoteSecurityGuard";
import type { SwapQuoteComparisonAssessment } from "../../suggestions/swapQuote/swapQuoteContracts";

/** The extended forbidden set for server output: transaction fields + execution/credential terms. */
export const SWAP_FORBIDDEN_SERVER_FIELDS: readonly string[] = [
  ...FORBIDDEN_TRANSACTION_FIELDS,
  "execute",
  "sendTransaction",
  "simulateTransaction",
  "recentBlockhash",
  "blockhash",
  "signer",
  "signers",
  "keypair",
  "secretKey",
  "privateKey",
  "apiKey",
  "authorization",
  "rpcUrl",
  "rpcEndpoint",
];

export interface SanitizeScanResult {
  clean: boolean;
  foundFields: string[];
}

/** Deep-scan any value for the extended forbidden server field set (cycle-safe). */
export function scanForForbiddenServerFields(payload: unknown): SanitizeScanResult {
  const found = new Set<string>();
  const seen = new WeakSet<object>();
  const forbidden = new Set(SWAP_FORBIDDEN_SERVER_FIELDS);
  const walk = (node: unknown): void => {
    if (node === null || typeof node !== "object") return;
    if (seen.has(node as object)) return;
    seen.add(node as object);
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    for (const key of Object.keys(node as Record<string, unknown>)) {
      if (forbidden.has(key)) found.add(key);
      walk((node as Record<string, unknown>)[key]);
    }
  };
  walk(payload);
  return { clean: found.size === 0, foundFields: [...found] };
}

/**
 * Assert a comparison assessment is safe to leave the server. Throws when any forbidden field is present
 * (transaction-bearing → reject, never strip). Returns the assessment unchanged when clean.
 */
export function sanitizeAssessment(assessment: SwapQuoteComparisonAssessment): SwapQuoteComparisonAssessment {
  // First the base transaction scan (Step-23A), then the extended server scan.
  const txScan = scanForTransactionFields(assessment);
  if (!txScan.clean) throw new Error(`swap_quote_sanitize_transaction_field: ${txScan.foundFields.sort().join(",")}`);
  const scan = scanForForbiddenServerFields(assessment);
  if (!scan.clean) throw new Error(`swap_quote_sanitize_forbidden_field: ${scan.foundFields.sort().join(",")}`);
  return assessment;
}
