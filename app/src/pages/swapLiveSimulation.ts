/**
 * swapLiveSimulation — stand-ins for the edges of the LIVE swap flow, for the walkthrough.
 *
 * The walkthrough's Demo Mode shows every ending of the confirm sheet as a resting state. It
 * cannot show the flow MOVING, because Demo Mode bypasses the plan hook, the wallet and the
 * submitter — and that is where the first real swap attempt broke (2026-11-26): pressing Swap
 * requested nothing, the footer changed owners while a quote loaded, and the route display aged
 * out under the reader. None of it was visible anywhere but production.
 *
 * This supplies a `SwapExecutionSeam` so the walkthrough can run the live branch for real — the
 * same hook, reducer, verification and sheet a connected wallet gets — with a pretend wallet and
 * a pretend server that answer after realistic delays. Press Swap and watch it go.
 *
 * NOTHING HERE CAN MOVE MONEY. The "wallet" is a function that waits and returns a sample
 * signature; it never sees a real adapter. The transaction in the plan is a captured, unsigned
 * one that has never been and cannot be submitted (see realSwapTransactions.ts). No request
 * leaves the page: the plan and the confirmation are computed here.
 */
import type { SwapExecutionSeam } from "../components/swapExecution/swapExecutionSeam";
import type { SwapQuoteFetcher } from "../suggestions/swapQuote/swapQuoteClient";
import type { SwapExecutionPlan } from "../suggestions/swapExecution/executionContracts";
import { SWAP_EXECUTION_CONTRACTS_VERSION } from "../suggestions/swapExecution/executionContracts";
import { demoConfirmTerms } from "../suggestions/swapExecution/demoConfirmTerms";
import { DEMO_SIGNATURE } from "../suggestions/swapExecution/demoOutcomes";
import { tokensToRaw } from "../suggestions/swapQuote/swapAmountMath";
import { REAL_SWAP_TAKER, REAL_SWAP_TX } from "../suggestions/fixtures/realSwapTransactions";

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Roughly what production takes, so waits are seen at their real length. */
export const SIM_QUOTE_DELAY_MS = 900;
export const SIM_PLAN_DELAY_MS = 1_500;
export const SIM_WALLET_DELAY_MS = 1_400;
export const SIM_CONFIRM_POLLS_BEFORE_LANDING = 2;

export interface LiveSimulationOptions {
  /** The offline quote source the walkthrough already uses; the plan's terms come from it. */
  quoteFetcher: SwapQuoteFetcher;
  /** False simulates a session whose wallet cannot sign (disconnected, or another account). */
  walletConnected: boolean;
}

/** The quote source, slowed to a realistic round trip so the Review button's wait is visible. */
export function slowedQuoteFetcher(inner: SwapQuoteFetcher): SwapQuoteFetcher {
  return async (action, opts) => {
    await wait(SIM_QUOTE_DELAY_MS);
    return inner(action, opts);
  };
}

/**
 * A quote source whose FIRST answer goes stale almost at once, so pressing Swap a moment later
 * meets an expired comparison and has to re-run it — the `refreshFirst` path.
 */
export function shortLivedFirstQuoteFetcher(inner: SwapQuoteFetcher, lifeMs = 2_500): SwapQuoteFetcher {
  let calls = 0;
  return async (action, opts) => {
    const result = await inner(action, opts);
    calls += 1;
    if (calls > 1 || !result.ok) return result;
    return { ok: true, assessment: { ...result.assessment, expiresAt: new Date(Date.now() + lifeMs).toISOString() } };
  };
}

/**
 * A quote source that finds no route within limits — the review's banner, with Close and Check
 * Again. With `blockedCalls` it relents after that many answers, so Check Again can be seen
 * FINDING a route: opening a review asks twice (the first request and its one retry), so 2
 * leaves the review blocked on open and lets the first Check Again succeed.
 */
export function noRouteQuoteFetcher(inner: SwapQuoteFetcher, blockedCalls = Number.POSITIVE_INFINITY): SwapQuoteFetcher {
  let calls = 0;
  return async (action, opts) => {
    const result = await inner(action, opts);
    calls += 1;
    if (!result.ok || calls > blockedCalls) return result;
    return {
      ok: true,
      assessment: {
        ...result.assessment,
        status: "no_valid_route",
        selectedProviderId: null,
        selectionBasis: null,
        expiresAt: null,
        expectedOutputTokens: null,
        minimumOutputTokens: null,
        blockingReasons: ["estimated_cost_high"],
        candidates: result.assessment.candidates.map((c) => ({ ...c, eligible: false, exclusionReasons: ["estimated_cost_high"] })),
      },
    };
  };
}

export function buildLiveSimulationSeam(options: LiveSimulationOptions): SwapExecutionSeam {
  let polls = 0;
  let delivered: string | null = null;
  return {
    takerPublicKey: options.walletConnected ? REAL_SWAP_TAKER : null,

    planFetcher: async (request) => {
      await wait(SIM_PLAN_DELAY_MS);
      const quote = await options.quoteFetcher(request.action, { slippageBps: request.slippageBps });
      const terms = quote.ok ? demoConfirmTerms(request.action, quote.assessment, request.slippageBps) : null;
      const decimals = request.action.outputAsset.decimals;
      const minimumRaw = terms?.minimumOutputTokens != null ? tokensToRaw(terms.minimumOutputTokens, decimals) : null;
      const expectedRaw = terms?.expectedOutputTokens != null ? tokensToRaw(terms.expectedOutputTokens, decimals) : null;
      if (terms == null || minimumRaw == null || expectedRaw == null) return { ok: false, error: "unavailable" };
      delivered = expectedRaw;
      polls = 0;
      const now = Date.now();
      const plan: SwapExecutionPlan = {
        planId: `sim_${now}`,
        actionId: request.action.actionId,
        legId: request.action.legId,
        unsignedTransaction: REAL_SWAP_TX,
        terms,
        verification: {
          simulatedDeliveredRaw: expectedRaw,
          checkedMinimumRaw: minimumRaw,
          outputDecimals: decimals,
          simulatedAt: new Date(now).toISOString(),
        },
        lastValidBlockHeight: null,
        expiresAt: new Date(now + 25_000).toISOString(),
        quotedAt: new Date(now).toISOString(),
        contractsVersion: SWAP_EXECUTION_CONTRACTS_VERSION,
      };
      return { ok: true, plan };
    },

    // The pretend wallet: it "opens", waits as long as a person takes to press Approve, and
    // returns a sample signature. It is handed the plan and does nothing with it.
    submit: async () => {
      await wait(SIM_WALLET_DELAY_MS);
      return { kind: "submitted", signature: DEMO_SIGNATURE };
    },

    confirmationFetcher: async () => {
      polls += 1;
      if (polls <= SIM_CONFIRM_POLLS_BEFORE_LANDING) return { ok: true, state: "pending" };
      return { ok: true, state: "confirmed", deliveredRaw: delivered, feeLamports: "19000", feeUsd: 0.001345 };
    },
  };
}
