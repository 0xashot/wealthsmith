/**
 * swapQuoteSecurityGuard — Step 23A. The structural guarantee that WealthSmith stays read-only: NO provider raw
 * payload, and specifically no transaction-bearing field, may cross the normalization boundary. A quote-only
 * comparison never receives, keeps, or emits anything that could be signed or submitted.
 *
 * These forbidden keys are the exact shapes Jupiter/Raydium/Orca (or a swap-BUILD endpoint) would use to return
 * executable data. If any appears in a provider response, normalization MUST reject the candidate rather than
 * silently strip it — a transaction in the payload means the wrong (execution) endpoint was called.
 */

/** Keys that indicate executable/transaction data. Presence in a provider payload is a hard rejection. */
export const FORBIDDEN_TRANSACTION_FIELDS: readonly string[] = [
  "transaction",
  "instructions",
  "instruction",
  "serializedTransaction",
  "swapTransaction",
  "signedTransaction",
  "signatureRequest",
  "signature",
  "signatures",
  "message",
  "versionedTransaction",
  "computeBudgetInstructions",
  "setupInstructions",
  "cleanupInstruction",
] as const;

export interface TransactionFieldScanResult {
  clean: boolean;
  foundFields: string[];
}

/**
 * Deep-scan an arbitrary provider payload for any forbidden transaction field (any depth, arrays included).
 * Returns the fields found (empty when clean). Pure; does not throw. Bounded traversal (cycle-safe).
 */
export function scanForTransactionFields(payload: unknown): TransactionFieldScanResult {
  const found = new Set<string>();
  const seen = new WeakSet<object>();
  const forbidden = new Set(FORBIDDEN_TRANSACTION_FIELDS);

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
 * Assert a raw provider payload carries no transaction data before it is normalized. Throwing here fails the
 * candidate closed (normalization_failed) rather than allowing executable data to leak into the quote layer.
 */
export function assertNoTransactionFields(payload: unknown): void {
  const scan = scanForTransactionFields(payload);
  if (!scan.clean) {
    throw new Error(`swap_quote_forbidden_transaction_field: ${scan.foundFields.sort().join(",")}`);
  }
}
