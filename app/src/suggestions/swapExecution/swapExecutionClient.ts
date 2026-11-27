/**
 * swapExecutionClient — Phase 4. The BROWSER-SAFE client for the execution lane.
 *
 * The mirror of `swapQuote/swapQuoteClient.ts`, and deliberately a separate file rather than a
 * mode on it: the quote client's job is to prove no transaction crosses its boundary, and this
 * one's is to carry exactly one. Sharing code would mean sharing the validation, and then
 * neither guarantee would be provable on its own.
 *
 * It talks ONLY to the WealthSmith endpoint (`/api/swap-execute`). It never calls Jupiter
 * directly, never receives a credential or an RPC URL, and never signs or submits. What it
 * returns is an unsigned transaction plus the terms it was built from — both still unverified.
 *
 * VALIDATION IS NOT VERIFICATION. A plan that passes everything here has only been shown to be
 * well-SHAPED. Whether the transaction actually performs the terms is decided by
 * `executionVerification`, against the chain, before any signature is requested. Returning
 * `ok: true` from this file means "the server gave us something plausible", never "this is safe
 * to sign", and the hook that calls it moves to `verifying` rather than `ready` for that reason.
 */
import type { SwapExecutionPlan, SwapExecutionRequest } from "./executionContracts";
import { assertExecutablePlan, scanForForbiddenExecutionFields } from "./executionGuard";

/**
 * Why a plan could not be obtained.
 *
 * `disabled` is kept distinct from `unavailable` even though the user-facing outcome is the same
 * handoff: one means the kill switch is off and nothing is wrong, the other means something
 * failed. Collapsing them would make a deliberate operational state indistinguishable from an
 * outage in our own analytics.
 */
export type SwapExecutionClientError =
  | "disabled"
  | "unavailable"
  | "no_route"
  | "rejected_request"
  | "invalid_plan"
  | "forbidden_field_in_plan"
  | "aborted"
  | "http_error";

export type SwapExecutionClientResult =
  | { ok: true; plan: SwapExecutionPlan }
  | { ok: false; error: SwapExecutionClientError };

export interface FetchSwapExecutionPlanOptions {
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  apiBase?: string;
}

/**
 * Resolve the API base. Empty (same-origin) in dev → the Vite proxy forwards `/api/swap-execute`.
 *
 * The exact `import.meta.env.KEY` form matters: a cast, an alias or a parenthesised read makes
 * Vite inline the WHOLE build env into the public bundle. That is not a style preference — it is
 * the bug that put a backend credential in production, and the shape of this expression is what
 * prevents it. See the comment in `swapQuoteClient.resolveApiBase`.
 */
export function resolveExecutionApiBase(): string {
  try {
    const base = import.meta.env.VITE_SWAP_EXECUTE_API_BASE as string | undefined;
    return typeof base === "string" ? base.replace(/\/$/, "") : "";
  } catch {
    return "";
  }
}

/**
 * Validate a plan's shape. Returns the specific failure rather than a boolean, because
 * "malformed" and "carried something it must never carry" are different events: the first is a
 * bug, the second is worth investigating.
 */
export function validateExecutionPlan(body: unknown): SwapExecutionClientError | null {
  if (body == null || typeof body !== "object") return "invalid_plan";

  // Defense in depth. The server sanitizes; this checks anyway, because the one time it matters
  // is the time the server did not. `unsignedTransaction` is required here and so is not in the
  // forbidden set — but `signature`, `signedTransaction` and every credential key still are.
  if (!scanForForbiddenExecutionFields(body).clean) return "forbidden_field_in_plan";

  // The lane's own structural guarantee: exactly one transaction, complete terms, a minimum that
  // does not exceed the expected output. Throws by design — it is the same assertion the server
  // applied before responding, re-run on what actually arrived.
  try {
    assertExecutablePlan(body as SwapExecutionPlan);
  } catch {
    return "invalid_plan";
  }

  const p = body as SwapExecutionPlan;
  if (!Number.isFinite(Date.parse(p.expiresAt))) return "invalid_plan";
  return null;
}

/**
 * Request an unsigned plan for one action leg.
 *
 * Posts only the leg's immutable identity, the amount, the slippage and the taker's PUBLIC key.
 * Never a private field, never a provider URL, never a previously displayed quote — the server
 * re-quotes, because a quote the user saw thirty seconds ago is not the one they would sign.
 */
export async function fetchSwapExecutionPlan(
  request: SwapExecutionRequest,
  opts: FetchSwapExecutionPlanOptions = {},
): Promise<SwapExecutionClientResult> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const base = opts.apiBase ?? resolveExecutionApiBase();
  const { action, takerPublicKey, slippageBps } = request;

  const body = {
    actionId: action.actionId,
    legId: action.legId,
    inputMint: action.inputAsset.mint,
    outputMint: action.outputAsset.mint,
    inputSymbol: action.inputAsset.symbol,
    outputSymbol: action.outputAsset.symbol,
    inputDecimals: action.inputAsset.decimals,
    outputDecimals: action.outputAsset.decimals,
    inputAmountRaw: action.inputAmountRaw,
    slippageBps,
    takerPublicKey,
    // Which provider to build with: the one whose route won. Omitted → the server's default (Jupiter).
    ...(typeof request.providerId === "string" && request.providerId.length > 0 ? { providerId: request.providerId } : {}),
  };

  let res: Response;
  try {
    res = await fetchImpl(`${base}/api/swap-execute`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: opts.signal,
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") return { ok: false, error: "aborted" };
    return { ok: false, error: "unavailable" };
  }

  // 503 covers both the kill switch and a provider outage; the body distinguishes them. Read it
  // before deciding, so an operator turning execution off does not look like Jupiter failing.
  if (res.status === 503) {
    const reason = await safeErrorField(res);
    return { ok: false, error: reason === "execution_disabled" ? "disabled" : "unavailable" };
  }
  if (res.status === 422) return { ok: false, error: "no_route" };
  // A 4xx means we sent something the server was right to refuse — our bug, not the user's, and
  // not an outage. Kept separate so it cannot hide inside the handoff-on-unavailable path.
  if (res.status >= 400 && res.status < 500) return { ok: false, error: "rejected_request" };
  if (!res.ok) return { ok: false, error: "http_error" };

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return { ok: false, error: "invalid_plan" };
  }

  const failure = validateExecutionPlan(json);
  if (failure) return { ok: false, error: failure };
  return { ok: true, plan: json as SwapExecutionPlan };
}

/** Read `error` from a JSON body without throwing, and without letting its content reach the UI. */
async function safeErrorField(res: Response): Promise<string | null> {
  try {
    const j = (await res.json()) as { error?: unknown };
    return typeof j?.error === "string" ? j.error : null;
  } catch {
    return null;
  }
}
