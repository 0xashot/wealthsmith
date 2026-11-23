/**
 * executionContracts — Phase 1. The shapes of the EXECUTION lane.
 *
 * This is a second lane beside the quote lane, not an extension of it. The quote lane's
 * guarantee ("a transaction in this payload is a bug") stays intact and provable; this lane
 * carries exactly one transaction and asserts the opposite. Two lanes, two contracts, two
 * guards — which is why enabling execution does not weaken anything that already exists.
 *
 * Governed by `rules/wallet-and-custody-rules.md` → Execution Boundary. Custody is unaffected:
 * nothing here ever holds a key. A plan is an UNSIGNED transaction plus the exact terms the
 * user is agreeing to; the signature happens in the user's own wallet, once, per transaction.
 *
 * Nothing in this file is mounted. No component imports it yet.
 */
import type { SwapActionContext, SwapProviderId } from "../swapQuote/swapQuoteContracts";

export const SWAP_EXECUTION_CONTRACTS_VERSION = "1.0.0" as const;

/**
 * Why a quote is not executable. Absence of a reason is the ONLY thing that makes a
 * suggestion executable — executability is never inferred from the protocol id.
 */
export type ExecutionBlockReason =
  /** Protocol Logic did not mark this handoff `in_app_confirm`. The default, and the fallback. */
  | "not_in_app_confirm"
  /** The comparison did not resolve to a single selected route. */
  | "no_selected_route"
  /** More than one leg. The Boundary allows one transaction doing one thing. */
  | "multi_leg"
  /** A term the user would be committing to is missing or not a finite number. */
  | "terms_incomplete"
  /** The quote has expired, or expires too soon to sign against honestly. */
  | "quote_expired"
  /** The route's liquidity was never verified. */
  | "liquidity_unverified"
  /** The provider is not one we can construct a complete transaction for. */
  | "provider_not_executable";

/**
 * The exact terms the user is agreeing to, shown before any signature is requested.
 *
 * `minimumOutputTokens` is the load-bearing one and is never optional: it is the only number
 * in this object the user is actually guaranteed. Everything else is an expectation.
 */
export interface SwapExecutionTerms {
  inputSymbol: string;
  inputMint: string;
  /** Exact integer amount in base units. Strings, never numbers — precision is not negotiable. */
  inputAmountRaw: string;
  /** Human-readable input amount, already decimal-adjusted. */
  inputAmountTokens: string;

  outputSymbol: string;
  outputMint: string;
  expectedOutputTokens: string;
  /** What the user is guaranteed at the configured slippage. Never null, never estimated. */
  minimumOutputTokens: string;

  priceImpactPct: number;
  slippageBps: number;
  estimatedTotalCostUsd: number | null;
  estimatedNetworkFeeUsd: number | null;

  /** Who executes. Shown to the user — they are entitled to know whose route this is. */
  providerId: SwapProviderId;
  providerName: string;
}

/**
 * An unsigned transaction plus the terms it encodes.
 *
 * The transaction is base64 and stays opaque to this layer. It is decoded and VERIFIED against
 * these terms in Phase 3, before signing — showing terms is not the same as having checked them,
 * and only the check makes the confirm screen honest.
 */
export interface SwapExecutionPlan {
  planId: string;
  actionId: string;
  legId: string;

  /** Base64 VersionedTransaction from the provider. Exactly one, never an array. */
  unsignedTransaction: string;

  terms: SwapExecutionTerms;

  /**
   * The blockhash this transaction was built against, and when it dies. A plan that outlives
   * its blockhash is not a slow plan, it is an invalid one.
   */
  lastValidBlockHeight: number | null;
  expiresAt: string;

  /** When the terms were quoted — NOT when the rail last showed a comparison. */
  quotedAt: string;
  contractsVersion: typeof SWAP_EXECUTION_CONTRACTS_VERSION;
}

/**
 * The request that produces a plan. It carries the action, not a previously displayed quote:
 * the server re-quotes at execution time, because a quote the user saw thirty seconds ago is
 * not the quote they would be signing.
 */
export interface SwapExecutionRequest {
  action: SwapActionContext;
  /** The wallet that will sign and receive. A public key — never a secret, never a signer. */
  takerPublicKey: string;
  slippageBps: number;
}

/** Where a plan ended up. `expired` is deliberately NOT a failure — nothing was submitted. */
export type SwapExecutionOutcome =
  | "confirmed"
  | "declined"
  | "expired"
  | "submit_failed"
  | "confirm_timeout"
  | "verification_failed";

export interface SwapExecutionResult {
  planId: string;
  outcome: SwapExecutionOutcome;
  /** Present only once the transaction has actually landed. */
  signature: string | null;
  /** Approved, non-blaming copy key — never a raw provider or RPC error string. */
  failureReasonKey: string | null;
}
