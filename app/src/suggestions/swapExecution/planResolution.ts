/**
 * planResolution — Phase 4. What a fetched plan means, as a pure function.
 *
 * The hook that owns the confirm step cannot be tested here: the fixture suite is deterministic
 * and offline, with no DOM and no renderer. Rather than settle for scanning the hook's source
 * and calling it covered, the part worth being sure about is lifted out — given a fetch result,
 * which events should the machine receive? — and the hook becomes wiring around it.
 *
 * That is the same split as `executionLifecycle`: the transitions are a pure reducer because a
 * machine you can test without mounting anything is a machine you can reason about. This is the
 * other half, and together they mean the whole confirm flow can be driven end to end in a
 * fixture, with React contributing nothing but the render.
 *
 * Every path ends in a terminal or a `verified` — there is no "and then nothing happens", which
 * is the failure mode that leaves a spinner on screen forever.
 */
import type { ExecutionEvent } from "./executionLifecycle";
import type { SwapExecutionClientResult } from "./swapExecutionClient";
import { tokensToRaw, verifyTransactionStructure, VERIFIABLE_EXECUTION_PROVIDER_IDS, type ExecutionProviderId } from "./executionVerification";

const isVerifiableProvider = (id: string): id is ExecutionProviderId =>
  (VERIFIABLE_EXECUTION_PROVIDER_IDS as readonly string[]).includes(id);
import { assertPlanWasVerified } from "./executionGuard";

export interface PlanResolutionContext {
  takerPublicKey: string;
  nowMs: number;
  /** The provider this plan was requested from. Absent → Jupiter. */
  providerId?: string;
  /** The exact input amount that was requested, in base units. */
  inputAmountRaw?: string;
}

/**
 * Translate a fetch result into the events the machine should receive, in order.
 *
 * An empty array means "do nothing" and is returned for exactly one case — an aborted request,
 * where the user has already left and there is no outcome to report.
 */
export function eventsForPlanResult(
  result: SwapExecutionClientResult,
  ctx: PlanResolutionContext,
): ExecutionEvent[] {
  if (!result.ok) {
    // The user left. Not a failure, and reporting one would put an error in front of someone
    // who closed the sheet on purpose.
    if (result.error === "aborted") return [];

    // A malformed or signature-bearing payload is a verification REFUSAL, not an outage. It
    // never becomes a plan object, so it cannot reach `verifying` — the reducer accepts the
    // refusal from `preparing` for this reason. The distinction survives into the copy, where
    // "we couldn't verify these terms" and "couldn't prepare this swap" say different things.
    if (result.error === "invalid_plan" || result.error === "forbidden_field_in_plan") {
      return [{ type: "verification_failed", detail: result.error }];
    }
    return [{ type: "plan_failed", detail: result.error }];
  }

  const plan = result.plan;
  const received: ExecutionEvent = { type: "plan_received", plan };

  // 0. The plan must be FROM the provider that was asked, FOR the amount that was asked. A plan
  //    from another provider carries other terms than the route the user chose to act on; one for
  //    another amount is not the swap they are looking at.
  const requestedProvider = ctx.providerId ?? "jupiter";
  if (plan.terms.providerId !== requestedProvider) {
    return [received, { type: "verification_failed", detail: "provider_mismatch" }];
  }
  if (ctx.inputAmountRaw != null && plan.terms.inputAmountRaw !== ctx.inputAmountRaw) {
    return [received, { type: "verification_failed", detail: "input_amount_mismatch" }];
  }
  if (!isVerifiableProvider(requestedProvider)) {
    return [received, { type: "verification_failed", detail: "provider_not_verifiable" }];
  }

  // 1. Structural, against the bytes we hold — independent of anything the server claimed about
  //    them. One signer, this wallet as fee payer, and the provider's own rule set: for Jupiter,
  //    allowlisted programs with Jupiter invoked once; for Raydium, the router alone, with one
  //    swap whose amount in and minimum out equal the terms about to be DISPLAYED, to the unit.
  const displayedMinimumRaw = tokensToRaw(plan.terms.minimumOutputTokens, plan.verification.outputDecimals);
  const structural = verifyTransactionStructure(plan.unsignedTransaction, ctx.takerPublicKey, {
    providerId: requestedProvider,
    inputAmountRaw: plan.terms.inputAmountRaw,
    ...(displayedMinimumRaw != null ? { minimumOutputRaw: displayedMinimumRaw.toString() } : {}),
  });
  if (!structural.ok) {
    return [received, { type: "verification_failed", detail: structural.reason }];
  }

  // 2. The server's proof must have been computed against the minimum we are about to display.
  //    The client cannot re-run the simulation without an RPC; it can refuse a proof that
  //    checked a different number, which is the failure that would otherwise read as safety.
  try {
    assertPlanWasVerified(plan);
  } catch (e) {
    return [received, { type: "verification_failed", detail: e instanceof Error ? e.message : "unverified" }];
  }

  // 3. Expired while we were checking. Expired, not ready — and not a failure of anything.
  const expiry = Date.parse(plan.expiresAt);
  if (!Number.isFinite(expiry) || expiry <= ctx.nowMs) {
    return [received, { type: "expire" }];
  }

  return [received, { type: "verified" }];
}
