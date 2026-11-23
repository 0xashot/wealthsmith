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
 * PHASE BOUNDARY. This hook stops at `ready`. Signing and submission are Phase 5: `approve` is
 * exposed only when a signer is supplied, so a sheet mounted without one cannot stall in
 * `signing` waiting for a wallet that was never wired.
 */
import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import type { SwapActionContext } from "../../suggestions/swapQuote/swapQuoteContracts";
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

/** Injected by Phase 5. Absent in Phase 4, which is why `approve` is then undefined. */
export type SwapPlanSigner = (plan: SwapExecutionPlan) => void;

export interface UseSwapExecutionPlanOptions {
  action: SwapActionContext;
  /** The connected wallet. Null when no wallet is connected — the hook then does nothing. */
  takerPublicKey: string | null;
  slippageBps: number;
  /** True while the confirm step is open. Going false cancels anything in flight. */
  enabled: boolean;
  /** Phase 5. When absent, `approve` is undefined and the flow cannot leave `ready`. */
  signer?: SwapPlanSigner;
  fetcher?: typeof fetchSwapExecutionPlan;
  fetchOptions?: FetchSwapExecutionPlanOptions;
  /** Injectable clock, for the gallery and for fixtures. */
  nowMs?: () => number;
}

export interface UseSwapExecutionPlanState {
  phase: ExecutionPhase;
  plan: SwapExecutionPlan | null;
  failure: ExecutionFailureKey | null;
  busy: boolean;
  terminal: boolean;
  /** Milliseconds until the plan's terms expire; null when there is no live plan. */
  msUntilExpiry: number | null;
  /** Start (or restart) the flow with a freshly quoted plan. */
  prepare: () => void;
  /** Abandon before submission. Always available, always free. */
  cancel: () => void;
  /** Phase 5 only. Undefined until a signer is wired — never a no-op button. */
  approve: (() => void) | undefined;
}

export function useSwapExecutionPlan(opts: UseSwapExecutionPlanOptions): UseSwapExecutionPlanState {
  const { action, takerPublicKey, slippageBps, enabled, signer } = opts;
  const [state, dispatch] = useReducer(executionReducer, initialExecutionState);
  const now = opts.nowMs ?? (() => Date.now());
  const fetcher = opts.fetcher ?? fetchSwapExecutionPlan;

  // Each attempt gets a generation. A reply from an abandoned attempt must not resurrect a flow
  // the user already left — the reducer ignores unknown transitions, but a late `plan_received`
  // arriving during a NEW attempt would otherwise be accepted as that attempt's plan.
  const generationRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

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
  const expiresAtMs = state.plan ? Date.parse(state.plan.expiresAt) : NaN;
  useEffect(() => {
    if (!Number.isFinite(expiresAtMs)) return;
    if (isExecutionTerminal(state.phase)) return;
    const remaining = expiresAtMs - now();
    if (remaining <= 0) {
      dispatch({ type: "expire" });
      return;
    }
    const id = window.setTimeout(() => dispatch({ type: "expire" }), remaining);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAtMs, state.phase]);

  // Abort on unmount. A fetch outliving the component is a plan nobody will ever look at.
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const approve = useMemo(() => {
    if (signer == null) return undefined;
    return () => {
      // `sign` is accepted only from `ready`; the reducer drops it everywhere else, so this
      // cannot start a signature early however it is called.
      if (state.phase !== "ready" || state.plan == null) return;
      dispatch({ type: "sign" });
      signer(state.plan);
    };
  }, [signer, state.phase, state.plan]);

  return {
    phase: state.phase,
    plan: state.plan,
    failure: state.failure,
    busy: isExecutionBusy(state.phase),
    terminal: isExecutionTerminal(state.phase),
    msUntilExpiry: Number.isFinite(expiresAtMs) ? Math.max(0, expiresAtMs - now()) : null,
    prepare,
    cancel,
    approve,
  };
}
