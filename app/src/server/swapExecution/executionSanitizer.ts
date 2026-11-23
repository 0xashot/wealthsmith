/**
 * executionSanitizer — Phase 2 (SERVER-ONLY). The final gate before a PLAN leaves the server.
 *
 * `server/swapQuote/responseSanitizer.ts` rejects any output carrying a transaction. This one
 * requires exactly one and rejects everything else that sanitizer rejects. The asymmetry is the
 * entire point: the quote endpoint's guarantee did not loosen when execution arrived, because
 * execution got its own endpoint with its own gate.
 *
 * Identical across both: credentials, signers, keys, RPC URLs and raw provider payloads never
 * leave the server. Execution relaxed the transaction rule and nothing else.
 *
 * This sanitizer BUILDS the outgoing object from known fields rather than deleting unwanted ones
 * from the provider's. Allowlisting is the only approach that survives a provider adding a field
 * nobody anticipated — and Jupiter adding, say, a `simulationError` or a signer hint should not
 * become our users' problem.
 */
import { scanForForbiddenServerFields } from "../swapQuote/responseSanitizer";
import {
  assertExecutablePlan,
  scanForForbiddenExecutionFields,
} from "../../suggestions/swapExecution/executionGuard";
import type { SwapExecutionPlan } from "../../suggestions/swapExecution/executionContracts";

/**
 * Server fields that must never reach the client even in the execution lane.
 *
 * Deliberately reuses the quote server's forbidden set, minus the single transaction field this
 * lane exists to carry. Everything else — `signer`, `secretKey`, `rpcUrl`, `sendTransaction` —
 * stays forbidden, and `blockhash`/`recentBlockhash` stay forbidden as loose fields because the
 * plan carries its expiry through `lastValidBlockHeight`, not through a raw blockhash the client
 * might be tempted to reuse.
 */
export const EXECUTION_ALLOWED_TRANSACTION_FIELD = "swapTransaction" as const;

/**
 * Build the client-facing plan from validated parts. Nothing from the provider's response is
 * passed through by reference — every field is named here or it does not travel.
 */
export function sanitizeExecutionPlan(input: {
  planId: string;
  actionId: string;
  legId: string;
  unsignedTransaction: string;
  terms: SwapExecutionPlan["terms"];
  lastValidBlockHeight: number | null;
  expiresAt: string;
  quotedAt: string;
}): SwapExecutionPlan {
  const plan: SwapExecutionPlan = {
    planId: input.planId,
    actionId: input.actionId,
    legId: input.legId,
    unsignedTransaction: input.unsignedTransaction,
    terms: {
      inputSymbol: input.terms.inputSymbol,
      inputMint: input.terms.inputMint,
      inputAmountRaw: input.terms.inputAmountRaw,
      inputAmountTokens: input.terms.inputAmountTokens,
      outputSymbol: input.terms.outputSymbol,
      outputMint: input.terms.outputMint,
      expectedOutputTokens: input.terms.expectedOutputTokens,
      minimumOutputTokens: input.terms.minimumOutputTokens,
      priceImpactPct: input.terms.priceImpactPct,
      slippageBps: input.terms.slippageBps,
      estimatedTotalCostUsd: input.terms.estimatedTotalCostUsd,
      estimatedNetworkFeeUsd: input.terms.estimatedNetworkFeeUsd,
      providerId: input.terms.providerId,
      providerName: input.terms.providerName,
    },
    lastValidBlockHeight: input.lastValidBlockHeight,
    expiresAt: input.expiresAt,
    quotedAt: input.quotedAt,
    contractsVersion: "1.0.0",
  };

  // 1. The execution lane's own guard: exactly one transaction, no credentials, complete terms.
  assertExecutablePlan(plan);

  // 2. The quote server's forbidden set, applied to everything EXCEPT the one allowed field.
  //    Checking the whole plan with that scanner would trip on the transaction we are shipping
  //    on purpose, so the transaction is held out and the remainder is scanned unchanged — the
  //    rule is not weakened, its single intended exception is named.
  const { unsignedTransaction: _held, ...rest } = plan;
  const serverScan = scanForForbiddenServerFields(rest);
  if (!serverScan.clean) {
    throw new Error(`swap_execution_sanitize_forbidden_field: ${serverScan.foundFields.sort().join(",")}`);
  }

  const execScan = scanForForbiddenExecutionFields(rest);
  if (!execScan.clean) {
    throw new Error(`swap_execution_sanitize_credential: ${execScan.foundFields.sort().join(",")}`);
  }

  return plan;
}
