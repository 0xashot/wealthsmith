/**
 * executionHandler — Phase 2 (SERVER-ONLY). `POST /api/swap-execute`.
 *
 * A separate handler from `swapQuote/httpHandler.ts`, deliberately. The quote route keeps its
 * own validation, its own sanitizer and its own guarantee; this one cannot weaken them because
 * it does not share a line of code with them.
 *
 * It returns an UNSIGNED transaction and the terms it was built from. It never signs, never
 * submits, never sees a private key, and never takes an RPC URL from the caller.
 *
 * KILL SWITCH. `SWAP_EXECUTION_ENABLED` must be explicitly "true". Anything else — unset,
 * empty, "1", "yes" — disables execution and returns 503, which the client already treats as
 * `unavailable` and degrades to a handoff. Execution can therefore be turned off by an env
 * change and a restart, with no deploy and no code change. Defaulting to OFF is the point: a
 * fresh environment that forgot to configure this does not quietly start executing swaps.
 */
import { buildJupiterSwapTransaction, type JupiterSwapContext } from "./jupiterSwapClient";
import { sanitizeExecutionPlan } from "./executionSanitizer";
import { verifyPlanBeforeOffering, type VerifyPlanDeps } from "./planVerification";
import { priceTerms } from "./termsPricing";
import type { PriceSource } from "../swapQuote/priceSnapshot";
import type { SwapExecutionPlan } from "../../suggestions/swapExecution/executionContracts";
import type { EnvReader } from "../swapQuote/providerConfig";

export const SWAP_EXECUTION_ENABLED_KEY = "SWAP_EXECUTION_ENABLED" as const;

/** How long a plan is offered before it must be rebuilt. Shorter than a blockhash's life on
 *  purpose: the user needs time to read and approve INSIDE this window, not at the end of it. */
export const PLAN_TTL_MS = 25_000;

export interface SwapExecuteHttpRequest {
  method?: string;
  body?: unknown;
}

export type SwapExecuteHttpResponse =
  | { status: 200; body: SwapExecutionPlan }
  | { status: 400 | 405 | 422 | 503; body: { error: string } };

/** Base58, 32–44 chars. Shape only — proving it is a real account is the chain's job, not ours. */
const PUBKEY_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

interface ExecuteBody {
  actionId?: unknown;
  legId?: unknown;
  inputMint?: unknown;
  outputMint?: unknown;
  inputSymbol?: unknown;
  outputSymbol?: unknown;
  inputDecimals?: unknown;
  outputDecimals?: unknown;
  inputAmountRaw?: unknown;
  slippageBps?: unknown;
  takerPublicKey?: unknown;
}

function validate(req: SwapExecuteHttpRequest): string | null {
  if (req.method && req.method.toUpperCase() !== "POST") return "method_not_allowed";
  const b = (req.body ?? {}) as ExecuteBody & Record<string, unknown>;

  // The caller never chooses where we connect. Same rule as the quote route.
  if (typeof b.rpcUrl === "string" || typeof b.providerUrl === "string" || typeof b.quoteEndpoint === "string") {
    return "arbitrary_url_not_allowed";
  }
  // A caller supplying anything signer-shaped is either confused or hostile; both deserve a refusal.
  if ("signer" in b || "secretKey" in b || "privateKey" in b || "keypair" in b) {
    return "credential_in_request";
  }

  if (typeof b.actionId !== "string" || b.actionId.length === 0) return "invalid_action";
  if (typeof b.legId !== "string" || b.legId.length === 0) return "invalid_action";
  if (typeof b.inputMint !== "string" || typeof b.outputMint !== "string") return "invalid_mints";
  if (b.inputMint === b.outputMint) return "invalid_mints";
  if (typeof b.inputSymbol !== "string" || typeof b.outputSymbol !== "string") return "invalid_assets";
  if (typeof b.inputDecimals !== "number" || !Number.isInteger(b.inputDecimals)) return "invalid_decimals";
  if (typeof b.outputDecimals !== "number" || !Number.isInteger(b.outputDecimals)) return "invalid_decimals";
  if (typeof b.inputAmountRaw !== "string" || !/^[1-9][0-9]*$/.test(b.inputAmountRaw)) return "invalid_amount";
  if (typeof b.slippageBps !== "number" || !Number.isInteger(b.slippageBps) || b.slippageBps < 1 || b.slippageBps > 500) {
    // An unbounded slippage parameter is a way to authorise a loss the user never saw. 5% is the ceiling.
    return "invalid_slippage";
  }
  if (typeof b.takerPublicKey !== "string" || !PUBKEY_RE.test(b.takerPublicKey)) return "invalid_taker";
  return null;
}

export function isExecutionEnabled(env: EnvReader): boolean {
  return env(SWAP_EXECUTION_ENABLED_KEY) === "true";
}

export function createSwapExecuteHandler(deps: {
  quoteEndpoint: string;
  env: EnvReader;
  fetchImpl?: typeof fetch;
  now?: () => number;
  planId?: () => string;
  /** Injectable simulation RPC. The real path builds one from SOLANA_RPC_URL. */
  simulationRpc?: VerifyPlanDeps["rpc"];
  /**
   * Prices the two USD sub-lines. OPTIONAL on purpose: without it both render "—" and everything
   * else about the plan is identical, so a deployment that cannot price mints still executes.
   */
  priceSource?: PriceSource;
}) {
  return async function handleSwapExecuteRequest(
    req: SwapExecuteHttpRequest,
  ): Promise<SwapExecuteHttpResponse> {
    // Kill switch first — before validation, before any provider call. A disabled environment
    // should do no work and reveal nothing about what it would have done.
    if (!isExecutionEnabled(deps.env)) {
      return { status: 503, body: { error: "execution_disabled" } };
    }

    const err = validate(req);
    if (err === "method_not_allowed") return { status: 405, body: { error: err } };
    if (err) return { status: 400, body: { error: err } };

    const b = req.body as Required<ExecuteBody> & Record<string, unknown>;
    const now = deps.now ?? Date.now;

    const context: JupiterSwapContext = {
      quoteEndpoint: deps.quoteEndpoint,
      fetchImpl: deps.fetchImpl,
      now,
    };

    const built = await buildJupiterSwapTransaction(
      {
        inputMint: b.inputMint as string,
        outputMint: b.outputMint as string,
        inputAmountRaw: b.inputAmountRaw as string,
        slippageBps: b.slippageBps as number,
        userPublicKey: b.takerPublicKey as string,
        inputSymbol: b.inputSymbol as string,
        outputSymbol: b.outputSymbol as string,
        inputDecimals: b.inputDecimals as number,
        outputDecimals: b.outputDecimals as number,
      },
      context,
    );

    if (built.kind === "no_route") return { status: 422, body: { error: "no_route" } };
    if (built.kind === "unavailable") {
      // The provider's reason is deliberately NOT echoed: it is provider detail, and the client
      // has one correct response to all of them — fall back to the handoff.
      return { status: 503, body: { error: "unavailable" } };
    }

    // VERIFY BEFORE OFFERING. A plan is not offered until a simulation says it delivers at
    // least the minimum it promises. An environment with no RPC cannot establish that, so it
    // offers nothing — "unverified" is not a state a plan is allowed to be in.
    const verified = await verifyPlanBeforeOffering(
      {
        unsignedTransaction: built.unsignedTransaction,
        takerPublicKey: b.takerPublicKey as string,
        outputMint: b.outputMint as string,
        outputDecimals: b.outputDecimals as number,
        minimumOutputTokens: built.terms.minimumOutputTokens,
      },
      { env: deps.env, rpc: deps.simulationRpc, now },
    );

    if (!verified.ok) {
      // The stage is NOT echoed to the client. A caller learning that structural verification
      // failed, versus the simulation, versus no RPC, learns about our internals and about the
      // provider's output; the one correct client response to all of them is the handoff.
      // Operators get the detail from logs, not from the response body.
      return { status: 503, body: { error: "unavailable" } };
    }

    // Decoration, and the LAST thing done — after verification, so a slow or broken price source
    // can never stand between a verified plan and the user. It returns the terms unchanged on any
    // failure, so there is nothing to handle here.
    const pricedTerms = deps.priceSource
      ? await priceTerms(built.terms, { source: deps.priceSource, now })
      : built.terms;

    try {
      const plan = sanitizeExecutionPlan({
        planId: (deps.planId ?? (() => `plan_${now()}`))(),
        actionId: b.actionId as string,
        legId: b.legId as string,
        unsignedTransaction: built.unsignedTransaction,
        terms: pricedTerms,
        verification: verified.verification,
        lastValidBlockHeight: built.lastValidBlockHeight,
        expiresAt: new Date(now() + PLAN_TTL_MS).toISOString(),
        quotedAt: built.quotedAt,
      });
      return { status: 200, body: plan };
    } catch {
      // A plan that fails its own guard is never repaired and never shipped. The client sees the
      // same `unavailable` it sees for a provider outage, and hands off.
      return { status: 503, body: { error: "unavailable" } };
    }
  };
}
