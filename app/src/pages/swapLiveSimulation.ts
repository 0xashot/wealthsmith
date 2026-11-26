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
import { demoAssessment } from "../suggestions/swapQuote/demoSwapQuote";
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
  /**
   * Stands in for reopening the wallet link — what a signed-in session needs after a page
   * refresh. The walkthrough flips `walletConnected` when it resolves true. Absent simulates a
   * session with no wallet to reconnect to.
   */
  reconnect?: () => Promise<boolean>;
  /**
   * Per-token faults, for a Trim's sequence. Each fires ONCE for its mint, so the summary's
   * Try Again can be seen succeeding: `failPlanOnce` — the plan cannot be prepared;
   * `declineOnce` — the pretend wallet declines the approval.
   */
  failPlanOnce?: string[];
  declineOnce?: string[];
}

/** Roughly how long a trusted wallet takes to answer a connect request. */
export const SIM_RECONNECT_DELAY_MS = 1_200;
export const simWait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

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

/**
 * Pretend quotes for a Trim's tokens — a token → USDC sale, per mint:
 *   default          a normal comparison, the in-app route selected
 *   `singleRoute`    one eligible route only (the others found none) — offered, and disclosed
 *   `blocked`        every route refused on price impact — no sale can be offered
 * Derived from the action like the demo quotes are, so the figures agree with the amounts.
 */
export function trimSimQuoteFetcher(shape: { singleRoute?: string[]; blocked?: string[] }): SwapQuoteFetcher {
  return async (action) => {
    const built = demoAssessment(action, Date.now());
    if (!built) return { ok: false, error: "unavailable" };
    const mint = action.inputAsset.mint;
    if (shape.blocked?.includes(mint)) {
      return {
        ok: true,
        assessment: {
          ...built,
          status: "no_valid_route",
          pairClass: "minor",
          selectedProviderId: null,
          selectionBasis: null,
          expiresAt: null,
          expectedOutputTokens: null,
          minimumOutputTokens: null,
          blockingReasons: ["price_impact_high"],
          candidates: built.candidates.map((c) => ({ ...c, eligible: false, priceImpactPct: 1.02, exclusionReasons: ["price_impact_high"] })),
        },
      };
    }
    if (shape.singleRoute?.includes(mint)) {
      return {
        ok: true,
        assessment: {
          ...built,
          status: "only_route_available",
          pairClass: "minor",
          selectionBasis: "only_eligible_route",
          candidates: built.candidates.map((c) => (c.providerId === "jupiter" ? c : { ...c, eligible: false, exclusionReasons: ["no_route"] })),
          comparedProviders: ["jupiter"],
        } as typeof built,
      };
    }
    return { ok: true, assessment: { ...built, pairClass: "minor" } };
  };
}

export function buildLiveSimulationSeam(options: LiveSimulationOptions): SwapExecutionSeam {
  let polls = 0;
  let delivered: string | null = null;
  const planFaults = new Set(options.failPlanOnce ?? []);
  const declines = new Set(options.declineOnce ?? []);
  let currentMint: string | null = null;
  return {
    takerPublicKey: options.walletConnected ? REAL_SWAP_TAKER : null,
    reconnect: options.reconnect,

    planFetcher: async (request) => {
      await wait(SIM_PLAN_DELAY_MS);
      currentMint = request.action.inputAsset.mint;
      if (planFaults.delete(currentMint)) return { ok: false, error: "unavailable" };
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
      if (currentMint != null && declines.delete(currentMint)) return { kind: "declined" };
      return { kind: "submitted", signature: DEMO_SIGNATURE };
    },

    confirmationFetcher: async () => {
      polls += 1;
      if (polls <= SIM_CONFIRM_POLLS_BEFORE_LANDING) return { ok: true, state: "pending" };
      return { ok: true, state: "confirmed", deliveredRaw: delivered, feeLamports: "19000", feeUsd: 0.001345 };
    },
  };
}
