/**
 * planVerification — Phase 4 (SERVER-ONLY). Running the value check where the RPC actually is.
 *
 * Phase 3 built the check and proved it against mainnet from a script. This runs it in the
 * request path, before a plan is ever offered, and it lives on the server for one reason: in
 * production the browser has no Solana RPC. Every chain read already happens server-side, and
 * shipping an RPC credential to every visitor so they can repeat a check the server can do is a
 * worse trade than having the server do it and say so.
 *
 * FAIL CLOSED, in both directions:
 *   - No RPC configured → no plan. Not "a plan we didn't check" — no plan. The caller degrades
 *     to the handoff, which is the correct behaviour for an environment that cannot verify.
 *   - Simulation says it under-delivers → no plan. Jupiter returns transactions it knows will
 *     fail (observed live), and the right response is to refuse rather than to pass the problem
 *     to someone who is about to approve it.
 *
 * What this does NOT replace: the client still runs structural verification itself, on the exact
 * bytes it holds. See `SwapPlanVerification` for why the split falls where it does.
 */
import { Connection } from "@solana/web3.js";
import {
  lookupTableAddresses,
  tokensToRaw,
  verifyTransactionStructure,
  type ExecutionProviderId,
  type StructuralFailure,
  type ValueFailure,
} from "../../suggestions/swapExecution/executionVerification";
import { simulateAndVerifyValue } from "../../suggestions/swapExecution/executionSimulation";
import { createConnectionSimulationRpc } from "../../suggestions/swapExecution/connectionSimulationRpc";
import type { SimulationRpc } from "../../suggestions/swapExecution/executionSimulation";
import type { SwapPlanVerification } from "../../suggestions/swapExecution/executionContracts";
import type { EnvReader } from "../swapQuote/providerConfig";

/** Server-only RPC. The same variable the quote service uses for Orca — one endpoint, two uses. */
export const EXECUTION_RPC_ENV_KEY = "SOLANA_RPC_URL" as const;

export type PlanVerificationFailure =
  | { stage: "config"; reason: "rpc_not_configured" }
  | { stage: "structural"; reason: StructuralFailure; detail: string | null }
  | { stage: "value"; reason: ValueFailure; detail: string | null }
  | { stage: "terms"; reason: "minimum_unparseable"; detail: string | null };

export type PlanVerificationResult =
  | { ok: true; verification: SwapPlanVerification }
  | { ok: false; failure: PlanVerificationFailure };

export interface VerifyPlanInput {
  unsignedTransaction: string;
  takerPublicKey: string;
  outputMint: string;
  outputDecimals: number;
  /** As it will be displayed. Converted here so the check uses the number the user will see. */
  minimumOutputTokens: string;
  /** Which provider built it — selects the structural rule set. Absent → Jupiter. */
  providerId?: ExecutionProviderId;
  /** The exact input amount requested, in base units. Required for Raydium's rule set. */
  inputAmountRaw?: string;
}

export interface VerifyPlanDeps {
  env: EnvReader;
  /** Injectable for tests; the real path builds one from the configured RPC. */
  rpc?: SimulationRpc;
  now?: () => number;
}

/** Build the simulation RPC from server config, or null when none is configured. */
export function resolveSimulationRpc(env: EnvReader): SimulationRpc | null {
  const url = env(EXECUTION_RPC_ENV_KEY);
  if (typeof url !== "string" || url.length === 0) return null;
  // `confirmed` reads and a simulation only. This Connection never signs and never sends: the
  // plan leaves here unsigned and the signature happens in the user's wallet.
  return createConnectionSimulationRpc(new Connection(url, "confirmed"));
}

/**
 * Verify a freshly built plan. Structural first (pure, cheap, catches gross substitutions),
 * then the simulation.
 *
 * Running structural here as well as on the client is not redundant: it means a transaction that
 * is the wrong shape never reaches a browser at all, and the client's copy of the check is then
 * an independent confirmation rather than the only one.
 */
export async function verifyPlanBeforeOffering(
  input: VerifyPlanInput,
  deps: VerifyPlanDeps,
): Promise<PlanVerificationResult> {
  const promisedMinimumRaw = tokensToRaw(input.minimumOutputTokens, input.outputDecimals);
  if (promisedMinimumRaw == null) {
    return { ok: false, failure: { stage: "terms", reason: "minimum_unparseable", detail: null } };
  }

  // The provider's own rule set. For Raydium the amount in and the minimum out are part of the
  // structure — its swap instruction states both — so they are checked here, before any network.
  const structural = verifyTransactionStructure(input.unsignedTransaction, input.takerPublicKey, {
    providerId: input.providerId ?? "jupiter",
    inputAmountRaw: input.inputAmountRaw,
    minimumOutputRaw: promisedMinimumRaw.toString(),
  });
  if (!structural.ok) {
    return { ok: false, failure: { stage: "structural", reason: structural.reason, detail: structural.detail } };
  }

  const rpc = deps.rpc ?? resolveSimulationRpc(deps.env);
  if (rpc == null) {
    return { ok: false, failure: { stage: "config", reason: "rpc_not_configured" } };
  }

  const value = await simulateAndVerifyValue(
    {
      transaction: structural.transaction,
      takerPublicKey: input.takerPublicKey,
      outputMint: input.outputMint,
      promisedMinimumRaw,
      lookupTableAddresses: lookupTableAddresses(structural.transaction),
    },
    rpc,
  );

  if (!value.ok) {
    return { ok: false, failure: { stage: "value", reason: value.reason, detail: value.detail } };
  }

  const now = deps.now ?? Date.now;
  return {
    ok: true,
    verification: {
      simulatedDeliveredRaw: value.deliveredRaw.toString(),
      checkedMinimumRaw: promisedMinimumRaw.toString(),
      outputDecimals: input.outputDecimals,
      simulatedAt: new Date(now()).toISOString(),
    },
  };
}
