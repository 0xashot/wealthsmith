/**
 * executionGuard — Phase 1. The structural guarantee of the EXECUTION lane.
 *
 * The quote lane's guard (`swapQuoteSecurityGuard.ts`) asserts that NO transaction may cross
 * its boundary. This one asserts the inverse, and more: exactly ONE transaction, no credential
 * of any kind, and complete terms. The two guards are opposites on purpose — a payload that
 * satisfies this one would be rejected by that one, and that is what keeps the quote lane's
 * guarantee provable after execution exists.
 *
 * What stays identical across both lanes: a credential, a signer, a key or an RPC URL is a hard
 * rejection, always, in either direction. Execution relaxes the transaction rule. It relaxes
 * nothing about secrets.
 *
 * Rejections THROW rather than strip. A payload shaped wrongly means the wrong endpoint was
 * called or the response was tampered with, and silently repairing it would hide exactly the
 * event worth noticing.
 */
import type { SwapExecutionPlan, SwapExecutionTerms } from "./executionContracts";

/**
 * Credential-bearing keys. A plan carries an UNSIGNED transaction and nothing that could sign,
 * submit or authenticate it. Copied in spirit from the server sanitizer's forbidden list, and
 * deliberately NOT narrowed for the execution lane — this half of the rule never relaxes.
 */
export const FORBIDDEN_EXECUTION_FIELDS: readonly string[] = [
  "signer",
  "signers",
  "keypair",
  "secretKey",
  "privateKey",
  "apiKey",
  "rpcUrl",
  "endpoint",
  "authorization",
  "accessToken",
  "refreshToken",
  "signature",
  "signatures",
  "signedTransaction",
] as const;

/** Transaction-bearing keys that would indicate MORE than the single plan transaction. */
const MULTI_TRANSACTION_FIELDS: readonly string[] = [
  "transactions",
  "setupTransaction",
  "cleanupTransaction",
  "otherTransactions",
] as const;

export interface ExecutionScanResult {
  clean: boolean;
  foundFields: string[];
}

/** Deep-scan for forbidden fields. Pure, cycle-safe, does not throw. */
export function scanForForbiddenExecutionFields(payload: unknown): ExecutionScanResult {
  const found = new Set<string>();
  const seen = new WeakSet<object>();
  const forbidden = new Set([...FORBIDDEN_EXECUTION_FIELDS, ...MULTI_TRANSACTION_FIELDS]);

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

/** A term is usable only if it is a finite number — NaN and Infinity are not "shown terms". */
function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/** A raw amount must be a non-empty decimal integer string. Precision is not negotiable. */
function isRawAmount(v: unknown): v is string {
  return typeof v === "string" && /^[0-9]+$/.test(v) && v.length > 0;
}

/** A displayed token amount must be a non-empty numeric string (decimals allowed). */
function isTokenAmount(v: unknown): v is string {
  return typeof v === "string" && /^[0-9]+(\.[0-9]+)?$/.test(v) && v.length > 0;
}

/**
 * Every term the user commits to must be present and well-formed before a signature is asked
 * for. A missing term is not a cosmetic gap — the Boundary requires that what is being agreed
 * to can be SHOWN, and a blank cannot be agreed to.
 */
export function scanTermsCompleteness(terms: SwapExecutionTerms | undefined | null): ExecutionScanResult {
  const missing: string[] = [];
  if (terms == null || typeof terms !== "object") return { clean: false, foundFields: ["terms"] };

  if (!terms.inputSymbol) missing.push("inputSymbol");
  if (!terms.inputMint) missing.push("inputMint");
  if (!isRawAmount(terms.inputAmountRaw)) missing.push("inputAmountRaw");
  if (!isTokenAmount(terms.inputAmountTokens)) missing.push("inputAmountTokens");

  if (!terms.outputSymbol) missing.push("outputSymbol");
  if (!terms.outputMint) missing.push("outputMint");
  if (!isTokenAmount(terms.expectedOutputTokens)) missing.push("expectedOutputTokens");
  // The only number the user is guaranteed. Never optional, never estimated.
  if (!isTokenAmount(terms.minimumOutputTokens)) missing.push("minimumOutputTokens");

  if (!isFiniteNumber(terms.priceImpactPct)) missing.push("priceImpactPct");
  if (!isFiniteNumber(terms.slippageBps)) missing.push("slippageBps");
  if (!terms.providerId) missing.push("providerId");

  return { clean: missing.length === 0, foundFields: missing };
}

/**
 * Assert a plan is safe to put in front of a user.
 *
 * Checks, in order: exactly one transaction, no credentials anywhere, complete terms, and a
 * minimum output that is not greater than the expected output (which would mean the two numbers
 * came from different quotes).
 *
 * Throws on failure. The caller treats a throw as "fall back to handoff", never as "try again
 * without the check".
 */
export function assertExecutablePlan(plan: SwapExecutionPlan | undefined | null): void {
  if (plan == null || typeof plan !== "object") {
    throw new Error("swap_execution_plan_missing");
  }

  // Exactly one transaction. Zero means nothing to sign; the scan below catches "more than one".
  if (typeof plan.unsignedTransaction !== "string" || plan.unsignedTransaction.length === 0) {
    throw new Error("swap_execution_no_transaction");
  }

  const scan = scanForForbiddenExecutionFields(plan);
  if (!scan.clean) {
    throw new Error(`swap_execution_forbidden_field: ${scan.foundFields.sort().join(",")}`);
  }

  const terms = scanTermsCompleteness(plan.terms);
  if (!terms.clean) {
    throw new Error(`swap_execution_incomplete_terms: ${terms.foundFields.sort().join(",")}`);
  }

  // A guaranteed minimum above the expectation is incoherent — the two numbers cannot have come
  // from the same quote, and signing against mismatched numbers is exactly what this prevents.
  const expected = Number(plan.terms.expectedOutputTokens);
  const minimum = Number(plan.terms.minimumOutputTokens);
  if (Number.isFinite(expected) && Number.isFinite(minimum) && minimum > expected) {
    throw new Error("swap_execution_minimum_exceeds_expected");
  }
}
