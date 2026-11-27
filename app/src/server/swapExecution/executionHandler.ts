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
import { buildRaydiumSwapTransaction, type RaydiumSwapContext } from "./raydiumSwapClient";
import { VERIFIABLE_EXECUTION_PROVIDER_IDS, type ExecutionProviderId } from "../../suggestions/swapExecution/executionVerification";
import { sanitizeExecutionPlan } from "./executionSanitizer";
import { classifySwapPair } from "../../suggestions/swapQuote/swapPairRegistry";
import { SWAP_COST_THRESHOLDS } from "../../suggestions/swapQuote/swapQuotePolicy";
import { verifyPlanBeforeOffering, type VerifyPlanDeps } from "./planVerification";
import { priceTerms } from "./termsPricing";
import type { PriceSource } from "../swapQuote/priceSnapshot";
import type { SwapExecutionPlan } from "../../suggestions/swapExecution/executionContracts";
import type { EnvReader } from "../swapQuote/providerConfig";

export const SWAP_EXECUTION_ENABLED_KEY = "SWAP_EXECUTION_ENABLED" as const;

/**
 * PER-PROVIDER OFF SWITCH. A comma-separated list of providers this server must not build for,
 * e.g. `SWAP_EXECUTION_DISABLED_PROVIDERS=raydium`. Unset → none disabled. It answers 503, which
 * the client already treats as "couldn't prepare this swap". Like the main kill switch it takes
 * an env change and a restart — no deploy — so one provider can be taken out without the other.
 */
export const SWAP_EXECUTION_DISABLED_PROVIDERS_KEY = "SWAP_EXECUTION_DISABLED_PROVIDERS" as const;

export function disabledExecutionProviders(env: EnvReader): string[] {
  return (env(SWAP_EXECUTION_DISABLED_PROVIDERS_KEY) ?? "").split(",").map((s) => s.trim().toLowerCase()).filter((s) => s.length > 0);
}

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
  /** Which provider to build with — the one whose route won the comparison. Absent → Jupiter. */
  providerId?: unknown;
}

const isExecutionProvider = (v: unknown): v is ExecutionProviderId =>
  typeof v === "string" && (VERIFIABLE_EXECUTION_PROVIDER_IDS as readonly string[]).includes(v);

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
  if (!PUBKEY_RE.test(b.inputMint) || !PUBKEY_RE.test(b.outputMint)) return "invalid_mints";
  if (b.inputMint === b.outputMint) return "invalid_mints";
  // ONLY PAIRS THE QUOTE LAYER WOULD COMPARE. This lane used to build a transaction for any two
  // mints at all — the review never asked for one, because it only offers Swap on a compared
  // route, but nothing here enforced that. The same classification the quote route uses now
  // gates both: SOL ↔ USDC, and any token sold FOR USDC. Buying an arbitrary token is refused.
  if (classifySwapPair(b.inputMint, b.outputMint) === "unresolved") return "pair_not_approved";
  if (typeof b.inputSymbol !== "string" || typeof b.outputSymbol !== "string") return "invalid_assets";
  if (typeof b.inputDecimals !== "number" || !Number.isInteger(b.inputDecimals)) return "invalid_decimals";
  if (typeof b.outputDecimals !== "number" || !Number.isInteger(b.outputDecimals)) return "invalid_decimals";
  if (typeof b.inputAmountRaw !== "string" || !/^[1-9][0-9]*$/.test(b.inputAmountRaw)) return "invalid_amount";
  if (typeof b.slippageBps !== "number" || !Number.isInteger(b.slippageBps) || b.slippageBps < 1 || b.slippageBps > 500) {
    // An unbounded slippage parameter is a way to authorise a loss the user never saw. 5% is the ceiling.
    return "invalid_slippage";
  }
  if (typeof b.takerPublicKey !== "string" || !PUBKEY_RE.test(b.takerPublicKey)) return "invalid_taker";
  // A provider we cannot build AND verify for is refused by name — never silently swapped for
  // another, which would hand back terms from a route the user was not shown.
  if (b.providerId !== undefined && !isExecutionProvider(b.providerId)) return "provider_not_supported";
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
   * What the Raydium builder needs beyond a fetch: its quote endpoint and a way to read the
   * taker's input token account from the chain. Absent → Raydium plans are unavailable (503),
   * exactly as an environment with no RPC offers no plan at all.
   */
  raydium?: Pick<RaydiumSwapContext, "quoteEndpoint" | "findInputTokenAccount" | "priorityFeeUrl">;
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

    // THE PROVIDER THAT WON IS THE PROVIDER THAT BUILDS. Never a fallback to another: a plan from
    // a different provider would be terms the user was not shown under a route name they did not see.
    const providerId: ExecutionProviderId = isExecutionProvider(b.providerId) ? b.providerId : "jupiter";
    if (disabledExecutionProviders(deps.env).includes(providerId)) {
      return { status: 503, body: { error: "unavailable" } };
    }
    if (providerId === "raydium" && deps.raydium == null) {
      return { status: 503, body: { error: "unavailable" } };
    }

    const swapRequest = {
      inputMint: b.inputMint as string,
      outputMint: b.outputMint as string,
      inputAmountRaw: b.inputAmountRaw as string,
      slippageBps: b.slippageBps as number,
      userPublicKey: b.takerPublicKey as string,
      inputSymbol: b.inputSymbol as string,
      outputSymbol: b.outputSymbol as string,
      inputDecimals: b.inputDecimals as number,
      outputDecimals: b.outputDecimals as number,
    };
    const built = providerId === "raydium"
      ? await buildRaydiumSwapTransaction(swapRequest, { ...(deps.raydium as NonNullable<typeof deps.raydium>), fetchImpl: deps.fetchImpl, now })
      : await buildJupiterSwapTransaction(swapRequest, context);

    if (built.kind === "no_route") return { status: 422, body: { error: "no_route" } };
    if (built.kind === "unavailable") {
      // The provider's reason is deliberately NOT echoed: it is provider detail, and the client
      // has one correct response to all of them — fall back to the handoff.
      return { status: 503, body: { error: "unavailable" } };
    }

    // THE PRICE-IMPACT CEILING HOLDS HERE TOO, on the plan's OWN quote.
    //
    // The route comparison refuses a quote at or above the ceiling — but the plan is built from
    // a fresh quote seconds later, and for a thinly traded token the impact moves. Observed on
    // 2026-11-26: a token's comparison was refused at 0.55% while this lane would still have
    // built the same sale. The review never asks for a refused route, so this is not a path the
    // product takes; it is the ceiling being true of what is signed, not only of what was
    // compared. An impact we cannot read is refused the same way — unknown is not "low".
    if (!Number.isFinite(built.terms.priceImpactPct) || built.terms.priceImpactPct >= SWAP_COST_THRESHOLDS.maxPriceImpactPctExclusive) {
      return { status: 422, body: { error: "price_impact_high" } };
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
        providerId,
        inputAmountRaw: b.inputAmountRaw as string,
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
