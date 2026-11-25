/**
 * useSwapExecutionPlan — Phase 4. The hook that drives a confirm step.
 *
 * All transitions live in `executionLifecycle`'s pure reducer; this adds only the IO and the
 * timers. That split is why the guarantee survives contact with React: the rule that a signature
 * can only be requested from `ready`, and that `ready` is reachable only through `verifying`, is
 * enforced by a function with no hooks in it, which a re-render cannot route around.
 *
 * THE VERIFY STEP, AND WHAT IT ACTUALLY CHECKS HERE.
 *
 * The server simulated the transaction before offering the plan and attached the proof. This
 * hook does NOT take that on trust. It independently:
 *
 *   1. decodes the transaction and verifies its structure — one signer, the connected wallet as
 *      fee payer, only allowlisted programs, Jupiter invoked exactly once — against the exact
 *      bytes it holds, and
 *   2. confirms the server's proof was computed against the minimum this component is about to
 *      display, not some other number.
 *
 * Both are pure and need no RPC, which is the whole reason the work divides this way. What the
 * hook cannot do in a browser is re-run the simulation; what it can do is refuse anything whose
 * shape or arithmetic disagrees with what it is about to show a person.
 *
 * Those two checks live in `planResolution.eventsForPlanResult`, not here. The fixture suite has
 * no DOM, so logic kept inside a hook could only ever be source-scanned; lifted out, the whole
 * confirm flow is driven end to end in fixtures and this file is wiring.
 *
 * SUBMISSION. `approve` exists only when a submitter does, so a sheet mounted without a wallet
 * cannot stall in `signing` waiting for one that was never wired. The submitter signs AND sends
 * through the wallet's own infrastructure — see `submitResolution` for why that falls out of how
 * the adapters already work, and what it means for custody.
 */
import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import type { SwapActionContext, SwapProviderId } from "../../suggestions/swapQuote/swapQuoteContracts";
import type { SwapExecutionPlan } from "../../suggestions/swapExecution/executionContracts";
import {
  executionReducer,
  initialExecutionState,
  isExecutionBusy,
  isExecutionTerminal,
  type ExecutionFailureKey,
  type ExecutionPhase,
} from "../../suggestions/swapExecution/executionLifecycle";
import {
  fetchSwapExecutionPlan,
  type FetchSwapExecutionPlanOptions,
} from "../../suggestions/swapExecution/swapExecutionClient";
import { eventsForPlanResult } from "../../suggestions/swapExecution/planResolution";
import { decideOnExpiry } from "../../suggestions/swapExecution/quoteRefresh";
import { eventsForSubmitOutcome, type SubmitOutcome } from "../../suggestions/swapExecution/submitResolution";
import {
  swapEventForTransition,
  type SwapExecutionEmitter,
} from "../../suggestions/swapExecution/swapExecutionEvents";
import {
  CONFIRMATION_POLL_INTERVAL_MS,
  decideFromConfirmation,
  fetchConfirmationState,
  needsFigureBackfill,
  FIGURE_BACKFILL_ATTEMPTS,
  FIGURE_BACKFILL_INTERVAL_MS,
  hasPassedDeadline,
  timeoutEvent,
  type FetchConfirmationOptions,
} from "../../suggestions/swapExecution/confirmationPolling";

/**
 * Submits a plan through the user's wallet. Null when no wallet can — `approve` is then
 * undefined and the sheet renders no button, rather than one that fails when pressed.
 */
export type SwapPlanSubmitter = (plan: SwapExecutionPlan) => Promise<SubmitOutcome>;

export interface UseSwapExecutionPlanOptions {
  action: SwapActionContext;
  /** The connected wallet. Null when no wallet is connected — the hook then does nothing. */
  takerPublicKey: string | null;
  slippageBps: number;
  /** True while the confirm step is open. Going false cancels anything in flight. */
  enabled: boolean;
  /** When absent, `approve` is undefined and the flow cannot leave `ready`. */
  submit?: SwapPlanSubmitter | null;
  fetcher?: typeof fetchSwapExecutionPlan;
  fetchOptions?: FetchSwapExecutionPlanOptions;
  /** The selected provider, for the funnel. Known from the assessment before a plan exists. */
  provider: SwapProviderId;
  /** Receives funnel events. Absent means none are emitted — never a reason to misbehave. */
  emit?: SwapExecutionEmitter;
  /** Injectable confirmation reader, for the gallery and for fixtures. */
  confirmationFetcher?: typeof fetchConfirmationState;
  /**
   * Called once the quote has spent its whole refresh allowance in front of a visible reader
   * and still has no decision. The host closes the review and says so; see `ExpiryDecision`.
   * Absent leaves the expired card in place, which is also what every other expiry does.
   */
  onGaveUp?: () => void;
  confirmationOptions?: FetchConfirmationOptions;
  /** Injectable clock, for the gallery and for fixtures. */
  nowMs?: () => number;
}

export interface UseSwapExecutionPlanState {
  phase: ExecutionPhase;
  plan: SwapExecutionPlan | null;
  /** Present once the wallet has submitted. Kept through a timeout — it is the user's only record. */
  signature: string | null;
  /** Base units actually received, once the chain read produced one. Null until then, and null
   *  whenever it could not be read — the success screen omits the figure rather than guess. */
  deliveredRaw: string | null;
  /** What the chain charged, for either landed outcome. The revert screen states it as fact. */
  feeLamports: string | null;
  feeUsd: number | null;
  failure: ExecutionFailureKey | null;
  busy: boolean;
  terminal: boolean;
  /** Start (or restart) the flow with a freshly quoted plan. */
  prepare: () => void;
  /** Abandon before submission. Always available, always free. */
  cancel: () => void;
  /** Undefined unless a wallet can submit — never a no-op button. */
  approve: (() => void) | undefined;
}

export function useSwapExecutionPlan(opts: UseSwapExecutionPlanOptions): UseSwapExecutionPlanState {
  const { action, takerPublicKey, slippageBps, enabled, submit, provider } = opts;
  const [state, dispatch] = useReducer(executionReducer, initialExecutionState);
  const now = opts.nowMs ?? (() => Date.now());
  const fetcher = opts.fetcher ?? fetchSwapExecutionPlan;

  // Each attempt gets a generation. A reply from an abandoned attempt must not resurrect a flow
  // the user already left — the reducer ignores unknown transitions, but a late `plan_received`
  // arriving during a NEW attempt would otherwise be accepted as that attempt's plan.
  const generationRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  // The plan, readable from inside the confirmation effect without making it a dependency.
  // That effect is keyed on the SIGNATURE on purpose — re-running it would restart the
  // deadline and re-poll a transaction already being watched — so it reads the plan through a
  // ref rather than closing over a value that was current when the watch began.
  const planRef = useRef(state.plan);
  planRef.current = state.plan;

  // Identity of the thing being approved. A change to any of it invalidates a plan in flight:
  // the terms on screen would no longer describe what the user asked for.
  const requestKey = `${action.legId}|${action.inputAmountRaw}|${slippageBps}|${takerPublicKey ?? ""}`;

  const prepare = useCallback(() => {
    if (!enabled || takerPublicKey == null) return;
    const generation = ++generationRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    dispatch({ type: "prepare" });

    void (async () => {
      const result = await fetcher(
        { action, takerPublicKey, slippageBps },
        { ...opts.fetchOptions, signal: controller.signal },
      );
      if (generation !== generationRef.current) return;

      // Every decision about what this result MEANS lives in `eventsForPlanResult`, which is
      // pure and fixtured. This loop only delivers what it decided — so the behaviour under
      // test and the behaviour in the browser are the same code, not two readings of it.
      for (const event of eventsForPlanResult(result, { takerPublicKey, nowMs: now() })) {
        if (generation !== generationRef.current) return;
        dispatch(event);
      }
    })();
    // `opts` is intentionally not a dependency: only the request's identity should restart a flow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, takerPublicKey, requestKey]);

  const cancel = useCallback(() => {
    generationRef.current += 1;
    abortRef.current?.abort();
    dispatch({ type: "cancel" });
  }, []);

  // Closing the sheet, changing the action, or disconnecting cancels anything in flight. Nothing
  // is submitted at this stage, so abandoning costs the user nothing.
  useEffect(() => {
    if (enabled) return;
    generationRef.current += 1;
    abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, requestKey]);

  // Expiry. A single timer rather than a ticking countdown: the reducer refuses `expire` after
  // submission, so a timer that fires late cannot claim a submitted transaction failed.
  //
  // At zero the flow either renews itself or expires, and `decideOnExpiry` owns that choice —
  // see it for why a refresh is capped and why nothing past `ready` may be replaced. Counting
  // the renewals in a ref rather than in the reducer keeps them out of the state machine: a
  // renewed plan is a NEW plan reached through the ordinary `prepare` path, not a new phase.
  const autoRefreshCountRef = useRef(0);

  // A new request is a new flow, and gets its full allowance back.
  useEffect(() => {
    autoRefreshCountRef.current = 0;
  }, [requestKey, enabled]);

  const expiresAtMs = state.plan ? Date.parse(state.plan.expiresAt) : NaN;

  // No per-second tick. One existed briefly to animate the countdown; with the countdown gone
  // there is nothing on screen that changes between `ready` and expiry, and re-rendering every
  // second to update a figure nobody is shown would be pure waste.

  useEffect(() => {
    if (!Number.isFinite(expiresAtMs)) return;
    if (isExecutionTerminal(state.phase)) return;
    // NOTHING EXPIRES WHILE A FETCH IS IN FLIGHT. A renewal keeps the outgoing plan on screen,
    // so its `expiresAt` is already in the past the moment the renewal starts — and without
    // this the timer fires instantly, decides `preparing` is not a refreshable phase, and
    // expires the flow it was in the middle of renewing. The incoming plan brings its own
    // expiry; until it arrives there is nothing here worth timing.
    if (state.phase === "preparing") return;

    const onExpiry = () => {
      const decision = decideOnExpiry({
        phase: state.phase,
        autoRefreshCount: autoRefreshCountRef.current,
        // Read at the moment the timer fires, not when it was set: the reader may have switched
        // tabs during the 25 seconds, which is exactly the case worth not spending a refresh on.
        documentHidden: typeof document !== "undefined" && document.hidden,
        canPrepare: enabled && takerPublicKey != null,
      });
      if (decision === "auto_refresh") {
        autoRefreshCountRef.current += 1;
        prepare();
        return;
      }
      // The machine reaches `failed`/`expired` either way. `expire_and_close` additionally
      // tells the host to take the review away, and it is the HOST's job rather than the
      // hook's: a hook that closed its own container would be deciding the page's layout from
      // inside a state machine, and the sheet still has to render the expired card for every
      // other expiry. Without a handler nothing closes and the old behaviour stands.
      dispatch({ type: "expire" });
      if (decision === "expire_and_close") opts.onGaveUp?.();
    };

    const remaining = expiresAtMs - now();
    if (remaining <= 0) {
      onExpiry();
      return;
    }
    const id = window.setTimeout(onExpiry, remaining);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAtMs, state.phase, enabled, takerPublicKey, prepare]);

  // Watch a submitted transaction until it lands or we give up.
  //
  // Driven by the signature rather than by the phase alone, so a re-render cannot restart the
  // clock: the deadline belongs to the transaction, not to the component. Stopping is NOT a
  // failure of the transaction — `confirm_timeout` keeps the signature, and the copy says the
  // swap may still complete.
  const confirmationFetcher = opts.confirmationFetcher ?? fetchConfirmationState;
  const watchedSignature = state.phase === "confirming" ? state.signature : null;
  useEffect(() => {
    if (watchedSignature == null) return;
    const startedAt = now();
    const controller = new AbortController();
    // Where to read what arrived. The plan's own output mint, never a symbol or a guess, and
    // the taker we submitted for — so the figure the success screen shows is the delta on the
    // exact account and mint these terms promised. Captured once so the poll and the backfill
    // can never ask about different accounts.
    const deliveryRef = {
      current:
        takerPublicKey != null && planRef.current != null
          ? { owner: takerPublicKey, mint: planRef.current.terms.outputMint }
          : null,
    };
    let stopped = false;
    let cancelled = false;
    let timer: number | undefined;
    let backfillTimer: number | undefined;

    const tick = async () => {
      if (stopped) return;
      const result = await confirmationFetcher(watchedSignature, {
        ...opts.confirmationOptions,
        // Where to read what arrived. The plan's own output mint, never a symbol or a guess,
        // and the taker we submitted for — so the figure the success screen shows is the
        // delta on the exact account and mint these terms promised.
        delivery: deliveryRef.current,
        signal: controller.signal,
      });
      if (stopped) return;
      const decision = decideFromConfirmation(result);
      if (decision.action === "stop") {
        stopped = true;
        for (const event of decision.events) dispatch(event);
        // THE OUTCOME IS SETTLED; THE NUMBERS MAY NOT BE. A transaction is reported as
        // landed by `getSignatureStatuses` seconds before `getTransaction` can return it,
        // and this poll asks at the worst instant — the moment it first sees a terminal
        // state, after which it stops. Observed in production: the fee on a freshly landed
        // swap read as null for five seconds, then appeared and matched the chain exactly.
        //
        // So the outcome is dispatched above without waiting, and the figures get a few
        // attempts of their own. Nothing here can change what already happened: the only
        // event this can produce is `figures`, which the reducer accepts in a settled phase
        // and which fills a field only while that field is still null.
        if (needsFigureBackfill(result)) void backfill();
        return;
      }
      // Check the deadline AFTER the read, so a transaction that confirmed on the last attempt
      // is reported as confirmed rather than as a timeout we happened to reach first.
      if (hasPassedDeadline(startedAt, now())) {
        stopped = true;
        dispatch(timeoutEvent());
        return;
      }
      timer = window.setTimeout(() => void tick(), CONFIRMATION_POLL_INTERVAL_MS);
    };
    /**
     * Ask again, a few times, only for the figures.
     *
     * Bounded and silent: if they never arrive the screens already say so — the success
     * state omits the amount and points at Solscan, the revert states that a fee was
     * charged without naming it. Better a late number than a wrong one, and better no
     * number than the quote's estimate.
     */
    const backfill = async () => {
      for (let attempt = 0; attempt < FIGURE_BACKFILL_ATTEMPTS; attempt += 1) {
        await new Promise((resolve) => { backfillTimer = window.setTimeout(resolve, FIGURE_BACKFILL_INTERVAL_MS); });
        if (cancelled) return;
        const again = await confirmationFetcher(watchedSignature, {
          ...opts.confirmationOptions,
          delivery: deliveryRef.current,
          signal: controller.signal,
        });
        if (cancelled) return;
        if (!again.ok) continue;
        if (again.feeLamports == null && again.deliveredRaw == null) continue;
        dispatch({
          type: "figures",
          deliveredRaw: again.deliveredRaw ?? null,
          feeLamports: again.feeLamports ?? null,
          feeUsd: again.feeUsd ?? null,
        });
        return;
      }
    };

    void tick();

    return () => {
      stopped = true;
      cancelled = true;
      controller.abort();
      if (timer != null) window.clearTimeout(timer);
      if (backfillTimer != null) window.clearTimeout(backfillTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedSignature]);

  // The funnel, driven by the machine's transitions rather than by calls scattered through the
  // handlers. A state the flow reaches reports itself, and one it cannot reach reports nothing,
  // so the funnel cannot drift out of step with the behaviour it claims to measure.
  const emit = opts.emit;
  const previousPhaseRef = useRef<ExecutionPhase>(state.phase);
  const approvedAtRef = useRef<number | null>(null);
  useEffect(() => {
    const previous = previousPhaseRef.current;
    previousPhaseRef.current = state.phase;
    if (previous === state.phase) return;
    if (state.phase === "signing") approvedAtRef.current = now();
    if (emit == null) return;
    const event = swapEventForTransition(previous, state.phase, {
      // From the assessment, supplied by the caller: at `preparing` there is no plan yet, so
      // the plan's own terms cannot answer this.
      provider,
      category: action.suggestionCategory,
      failure: state.failure,
      sinceApprovalMs: approvedAtRef.current == null ? null : now() - approvedAtRef.current,
      // Incremented before `prepare()` is called, so by the time this transition is observed a
      // renewal already shows here. Reset with the rest of the flow when the request changes.
      renewal: autoRefreshCountRef.current > 0,
    });
    if (event) emit(event);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.failure]);

  // Abort on unmount. A fetch outliving the component is a plan nobody will ever look at.
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const approve = useMemo(() => {
    if (submit == null) return undefined;
    return () => {
      // `sign` is accepted only from `ready`; the reducer drops it everywhere else, so this
      // cannot start a signature early however it is called.
      if (state.phase !== "ready" || state.plan == null) return;
      const plan = state.plan;
      const generation = generationRef.current;
      dispatch({ type: "sign" });

      void (async () => {
        const outcome = await submit(plan);
        // A submitted transaction is NOT discarded on a stale generation. Everything before
        // this point can be abandoned freely; once the wallet has sent it, the signature is the
        // only record the user has, and dropping it because they clicked elsewhere would lose
        // the one thing we owe them.
        if (generation !== generationRef.current && outcome.kind !== "submitted") return;
        for (const event of eventsForSubmitOutcome(outcome)) dispatch(event);
      })();
    };
  }, [submit, state.phase, state.plan]);

  return {
    phase: state.phase,
    plan: state.plan,
    signature: state.signature,
    failure: state.failure,
    deliveredRaw: state.deliveredRaw,
    feeLamports: state.feeLamports,
    feeUsd: state.feeUsd,
    busy: isExecutionBusy(state.phase),
    terminal: isExecutionTerminal(state.phase),
    prepare,
    cancel,
    approve,
  };
}
