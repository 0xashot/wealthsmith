/**
 * swapConfirmTestingFixtures — Phase 4. Every state of the confirm sheet, deterministically.
 *
 * The sheet's states are driven by a state machine that normally only reaches them in response
 * to a network call, a chain simulation and a wallet. Waiting for the real sequence to produce
 * each one is how states like `confirm_timeout` go unreviewed until a user finds them, so the
 * gallery renders each directly from props.
 *
 * This is a view of the sheet, NOT a test of the flow: nothing here exercises eligibility,
 * verification or the reducer, all of which are covered by fixtures that run offline. What the
 * gallery is for is the part fixtures cannot check — whether a person reading this would
 * understand what is about to happen to their money.
 *
 * Fixture-only. Nothing here prepares, signs or submits anything.
 */
import SwapConfirmSheet from "../components/swapExecution/SwapConfirmSheet";
import SwapExecutionSection from "../components/swapExecution/SwapExecutionSection";
import { useSwapExecutionPlan } from "../components/swapExecution/useSwapExecutionPlan";
import { REAL_SWAP_TAKER, REAL_SWAP_TX_SOL_INPUT } from "../suggestions/fixtures/realSwapTransactions";
import type { SwapActionContext, SwapQuoteComparisonAssessment } from "../suggestions/swapQuote/swapQuoteContracts";
import type { SwapExecutionPlan } from "../suggestions/swapExecution/executionContracts";
import type { SwapPlanSubmitter } from "../components/swapExecution/useSwapExecutionPlan";
import type { fetchConfirmationState } from "../suggestions/swapExecution/confirmationPolling";
import { useEffect, useState } from "react";
import type { SwapExecutionTerms } from "../suggestions/swapExecution/executionContracts";
import type { ExecutionFailureKey, ExecutionPhase } from "../suggestions/swapExecution/executionLifecycle";

/** Terms taken from a real Jupiter quote (SOL → USDC, 0.01 SOL, 50 bps), so the figures read true. */
const TERMS: SwapExecutionTerms = {
  inputSymbol: "SOL",
  inputMint: "So11111111111111111111111111111111111111112",
  inputAmountRaw: "10000000",
  inputAmountTokens: "0.01",
  inputAmountUsd: 0.7271,
  outputSymbol: "USDC",
  outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  expectedOutputTokens: "0.726942",
  expectedOutputUsd: 0.7268,
  minimumOutputTokens: "0.723308",
  priceImpactPct: 0.0077,
  slippageBps: 50,
  estimatedTotalCostUsd: 0.011,
  estimatedNetworkFeeUsd: 0.01,
  providerId: "jupiter",
  providerName: "Jupiter",
};

const noop = () => {};

/**
 * A REAL finalized mainnet signature, so the Solscan link in the post-approval states actually
 * resolves. A made-up string is not base58 of the right length and silently 404s, which means the
 * one link in this flow the user is most likely to press would be reviewed by looking at it rather
 * than by following it. Public data: a signature is on-chain by definition.
 */
const REAL_FINALIZED_SIGNATURE =
  "3oxRM1QrjMfCTiC2FZW15rXRKzKQomcogEP77C9aBcds9DKCXWwNcZrLwkSKKfYMZxQbzFpeuiTZmiF1gYpKv7r8";

/* ---------------------------------------------------------------------------
 * One case that runs the REAL hook.
 *
 * Everything else here is rendered from props, which shows the sheet but proves
 * nothing about the sequence that reaches each state. This drives the actual
 * hook — the real reducer, the real structural verification against a real
 * mainnet transaction, the real proof check — with only the network stubbed.
 *
 * It is the only place the hook runs in a browser, and the reason the sheet and
 * the machine are reviewed together rather than separately.
 * ------------------------------------------------------------------------- */

/** The SOL → USDC transaction captured from mainnet, with terms that match it. */
const LIVE_SHAPED_PLAN: SwapExecutionPlan = {
  planId: "gallery_plan",
  actionId: "rebalance:gallery",
  legId: "rebalance:gallery:0",
  unsignedTransaction: REAL_SWAP_TX_SOL_INPUT,
  terms: { ...TERMS, expectedOutputTokens: "0.721313", minimumOutputTokens: "0.717707" },
  verification: {
    simulatedDeliveredRaw: "720673",
    checkedMinimumRaw: "717707",
    outputDecimals: 6,
    simulatedAt: new Date().toISOString(),
  },
  lastValidBlockHeight: 320_000_000,
  // Far enough out that the countdown is visible without the case expiring while it is read.
  expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
  quotedAt: new Date().toISOString(),
  contractsVersion: "1.0.0",
};

/**
 * A demo quote for the container case: jupiter selected, a guaranteed floor present.
 *
 * Shaped to satisfy both gates the container applies — the Boundary's offer rules and
 * `demoConfirmTerms`, which refuses to preview a quote with no minimum.
 */
const GALLERY_ASSESSMENT = {
  status: "selected",
  actionId: "rebalance:gallery",
  legId: "rebalance:gallery:0",
  pairClass: "major",
  comparedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
  selectedProviderId: "jupiter",
  selectionBasis: "lowest_estimated_total_cost",
  candidates: [
    {
      providerId: "jupiter",
      providerName: "Jupiter",
      executionSurface: "jupiter",
      underlyingVenues: ["Raydium CLMM"],
      inputMint: TERMS.inputMint,
      outputMint: TERMS.outputMint,
      inputAmountRaw: "10000000",
      expectedOutputRaw: "726942",
      minimumOutputRaw: "723308",
      expectedOutputTokens: "0.726942",
      expectedOutputUsd: 0.7268,
      quotedAt: new Date().toISOString(),
      expiresAt: null,
      quoteLatencyMs: 120,
      priceImpactPct: 0.008,
      includedSwapFeeUsd: null,
      explicitPlatformFeeUsd: null,
      estimatedNetworkFeeUsd: 0.01,
      estimatedRentFeeUsd: 0,
      liquidityAssessment: { status: "verified", minimumRouteLegLiquidityUsd: 320000, legs: [] },
      freshness: "fresh",
      eligible: true,
      exclusionReasons: [],
    },
    // A SECOND eligible candidate, because the Boundary refuses to call one surviving route a
    // comparison — MIN_ELIGIBLE_FOR_COMPARISON. The gate caught this fixture when it had only
    // Jupiter, which is the rule working.
    {
      providerId: "raydium",
      providerName: "Raydium",
      executionSurface: "raydium",
      underlyingVenues: ["Raydium AMM"],
      inputMint: TERMS.inputMint,
      outputMint: TERMS.outputMint,
      inputAmountRaw: "10000000",
      expectedOutputRaw: "726010",
      minimumOutputRaw: "722380",
      expectedOutputTokens: "0.726010",
      expectedOutputUsd: 0.7259,
      quotedAt: new Date().toISOString(),
      expiresAt: null,
      quoteLatencyMs: 310,
      priceImpactPct: 0.009,
      includedSwapFeeUsd: null,
      explicitPlatformFeeUsd: null,
      estimatedNetworkFeeUsd: 0.01,
      estimatedRentFeeUsd: 0,
      liquidityAssessment: { status: "verified", minimumRouteLegLiquidityUsd: 280000, legs: [] },
      freshness: "fresh",
      eligible: true,
      exclusionReasons: [],
    },
  ],
  comparedProviders: ["jupiter", "raydium", "orca"],
  unavailableProviders: [],
  estimatedTotalCostUsd: 0.01,
  estimatedTotalCostPct: 0.01,
  expectedOutputTokens: "0.726942",
  minimumOutputTokens: "0.723308",
  economicallyEquivalent: false,
  warnings: [],
  blockingReasons: [],
  methodologyVersion: "swap_quote_methodology_1.0.0",
} as unknown as SwapQuoteComparisonAssessment;

const GALLERY_ACTION: SwapActionContext = {
  actionId: "rebalance:gallery",
  suggestionId: "gallery",
  suggestionCategory: "rebalance",
  legId: "rebalance:gallery:0",
  legIndex: 0,
  totalLegs: 1,
  inputAsset: { symbol: "SOL", mint: TERMS.inputMint, decimals: 9 },
  outputAsset: { symbol: "USDC", mint: TERMS.outputMint, decimals: 6 },
  inputAmountRaw: "10000000",
  inputAmountTokens: "0.01",
  inputAmountUsd: null,
  sourceAvailability: "wallet_transferable",
  generatedAt: new Date().toISOString(),
};

/**
 * Drives the real hook with a stubbed fetcher. `tamper` lets a case return a plan the checks
 * must refuse, so the refusal path is shown to have been REACHED rather than merely rendered.
 */
function HookDrivenCase({
  tamper,
  submit,
  confirmationFetcher,
  ttlMs,
  fetchDelayMs,
}: {
  tamper?: (p: SwapExecutionPlan) => SwapExecutionPlan;
  submit?: SwapPlanSubmitter;
  /** Stubbed chain read. Without one the sheet would sit in `confirming` for the full 90s deadline. */
  confirmationFetcher?: typeof fetchConfirmationState;
  /**
   * Shortens the plan's life so the auto-refresh is reviewable in seconds rather than in the
   * real 25. Each fetch issues a FRESH expiry, which is what lets the clock restart.
   */
  ttlMs?: number;
  /**
   * Delays each fetch, so the gallery shows what production shows.
   *
   * An instant stub is why a real bug went unseen here: the renewal blanked the terms for the
   * length of the round trip, and with a 0ms fetcher that window was one frame. Production
   * measures 1.0–1.5s for a plan build plus simulation.
   */
  fetchDelayMs?: number;
}) {
  /**
   * MIRRORS THE REAL CONTAINER, which is the point of these cases.
   *
   * In the app, Cancel unmounts the sheet and returns to the review's Continue footer, and
   * giving up closes the review altogether. Wiring Cancel straight to `state.cancel` instead
   * left a dead sheet on screen — terms still showing, Approve gone — which looks like a bug
   * in the sheet and is not a state the product can reach.
   */
  const [dismissed, setDismissed] = useState<null | "cancelled" | "closed">(null);

  const state = useSwapExecutionPlan({
    action: GALLERY_ACTION,
    provider: "jupiter",
    takerPublicKey: REAL_SWAP_TAKER,
    slippageBps: 50,
    enabled: true,
    fetcher: async () => {
      if (fetchDelayMs) await new Promise((r) => setTimeout(r, fetchDelayMs));
      const base =
        ttlMs == null
          ? LIVE_SHAPED_PLAN
          : { ...LIVE_SHAPED_PLAN, expiresAt: new Date(Date.now() + ttlMs).toISOString() };
      return { ok: true, plan: tamper ? tamper(base) : base };
    },
    // A STUB, never the real wallet submitter. A gallery that could submit a real mainnet swap
    // on a real transaction is not a gallery, and one stray click would cost actual money.
    submit,
    confirmationFetcher,
    onGaveUp: () => setDismissed("closed"),
  });

  // The gallery has no user to press anything, so the flow is started on mount.
  useEffect(() => { state.prepare(); }, [state.prepare]);

  if (dismissed) {
    return (
      <p className="modal__intro">
        {dismissed === "closed"
          ? "The host was told to give up: in the app the review closes here and a toast says the terms expired. The gallery has no modal, so the sheet is simply gone."
          : "Cancelled: in the app the sheet unmounts and the review returns to its Continue footer. The suggestion itself is untouched."}{" "}
        <button
          type="button"
          className="review-modal__tertiary-action"
          onClick={() => { setDismissed(null); state.prepare(); }}
        >
          Run it again
        </button>
      </p>
    );
  }

  // The app never mounts the sheet without terms: SwapExecutionSection holds that first wait in
  // the Continue button instead. These cases drive the hook directly, so they would otherwise
  // show an empty card the product cannot produce.
  if (state.plan == null && state.phase !== "failed") {
    return (
      <p className="modal__intro">
        <span className="swap-confirm__spinner" aria-hidden="true" /> Fetching terms — in the app
        the Continue button spins here and the sheet opens once it has something to show.
      </p>
    );
  }

  return (
    <SwapConfirmSheet
      phase={state.phase}
      terms={state.plan?.terms ?? null}
      failure={state.failure}
      signature={state.signature}
      onCancel={() => { state.cancel(); setDismissed("cancelled"); }}
      onApprove={state.approve}
    />
  );
}

export interface SwapConfirmGalleryCase {
  key: string;
  label: string;
  node: JSX.Element;
}

/**
 * The real CONTAINER, not just the sheet.
 *
 * Every other case here renders `SwapConfirmSheet` directly, which leaves the component that
 * decides WHEN to show it — the two-step footer, the first-fetch wait, the demo preview,
 * unmounting on Cancel — with no coverage that runs. Demo Mode is the one path through it that
 * needs no connected wallet, so it is the only one the gallery can honestly exercise.
 *
 * The live path's busy footer stays source-scanned (SWXC-1, SWXC-2): giving the gallery a real
 * wallet submitter is exactly the thing that must never happen here.
 */
function DemoSectionCase() {
  return (
    <SwapExecutionSection
      demo
      action={GALLERY_ACTION}
      assessment={GALLERY_ASSESSMENT}
      nowMs={Date.now()}
      onClose={() => {}}
    />
  );
}

export const SWAP_CONFIRM_GALLERY_CASES: SwapConfirmGalleryCase[] = [
  {
    key: "demo_section_real_container",
    label:
      "REAL CONTAINER (Demo Mode) — the only case you can actually click through. Every other case below is a picture of the sheet; this one runs the real component, so it behaves as the app will. Press Swap to fetch the terms and open the confirm step, then Cancel to come back here. Approve is greyed out because Demo Mode has no wallet.",
    node: <DemoSectionCase />,
  },
  {
    key: "hook_approve_submitted",
    label:
      "REAL HOOK — a genuine mainnet transaction through the real reducer and the real structural check, resting at Ready. Press Approve: signing and submission are one wallet call, so it goes straight to confirming with a signature.",
    node: <HookDrivenCase submit={async () => ({ kind: "submitted", signature: "5xGALLERYsignature" })} />,
  },
  {
    key: "hook_approve_declined",
    label:
      "REAL HOOK + stubbed wallet that DECLINES — press Approve. A decline is a normal outcome and nothing is sent.",
    node: <HookDrivenCase submit={async () => ({ kind: "declined" })} />,
  },
  {
    key: "hook_approve_wallet_error",
    label:
      "REAL HOOK + stubbed wallet that ERRORS — press Approve. This used to hang in `signing` with no way out.",
    node: <HookDrivenCase submit={async () => ({ kind: "failed", detail: "WalletSendTransactionError" })} />,
  },
  {
    key: "hook_auto_refresh",
    label:
      "REAL HOOK, short-lived quote — watch it renew itself and the clock restart, instead of dropping you on “These terms expired”. Each renewal re-fetches and re-checks. Once the allowance is spent the host is told to close the review and show a toast; the gallery has no modal, so it is reported in the line above instead.",
    node: (
      <HookDrivenCase
        ttlMs={3_000}
        fetchDelayMs={1_200}
        submit={async () => ({ kind: "submitted", signature: REAL_FINALIZED_SIGNATURE })}
      />
    ),
  },
  {
    key: "hook_approve_confirmed",
    label:
      "REAL HOOK, all the way to completion — stubbed wallet submits, stubbed confirmation reports it landed. The real reducer and the real polling decision; the one case that reaches the completed screen through the sequence rather than by prop.",
    node: (
      <HookDrivenCase
        submit={async () => ({ kind: "submitted", signature: REAL_FINALIZED_SIGNATURE })}
        confirmationFetcher={async () => ({ ok: true, state: "confirmed" })}
      />
    ),
  },
  {
    key: "hook_approve_reverted",
    label:
      "REAL HOOK — the chain RAN it and it reverted. The one failure confirmation is allowed to report, and distinct from giving up: we know the funds did not move rather than merely not knowing.",
    node: (
      <HookDrivenCase
        submit={async () => ({ kind: "submitted", signature: REAL_FINALIZED_SIGNATURE })}
        confirmationFetcher={async () => ({ ok: true, state: "failed" })}
      />
    ),
  },
  {
    key: "hook_wrong_minimum",
    label:
      "REAL HOOK, tampered — the proof claims a check against a different minimum than the one displayed. Must refuse, and the refusal must be REACHED, not rendered.",
    node: (
      <HookDrivenCase
        tamper={(p) => ({ ...p, verification: { ...p.verification, checkedMinimumRaw: "1" } })}
      />
    ),
  },
  {
    key: "ready",
    label: "Ready — checked, wallet attached. The only state where Approve exists; every other state either has nothing to approve yet or has moved past it.",
    node: <SwapConfirmSheet phase={"ready" as ExecutionPhase} terms={TERMS} failure={null} onCancel={noop} onApprove={noop} />,
  },
  /* ---- After Approve. Every one of these was previously unreachable in the gallery, which is
   *      how the blank status line survived review: the states existed in the machine and
   *      nowhere on screen. Cancel is deliberately absent in all of them. ---- */
  {
    key: "signing",
    label:
      "Awaiting the wallet — the user has pressed Approve and Phantom is open. The button stays where it was and reports from there, so the press visibly registered; no Cancel, because the request is with the wallet now.",
    node: <SwapConfirmSheet phase={"signing" as ExecutionPhase} terms={TERMS} failure={null} onCancel={noop} />,
  },
  {
    key: "submitting",
    label:
      "Submitting — signed and being sent. Shares its label with `confirming` on purpose: the difference between sent and confirmed is ours, not the user's.",
    node: <SwapConfirmSheet phase={"submitting" as ExecutionPhase} terms={TERMS} failure={null} onCancel={noop} />,
  },
  {
    key: "confirming",
    label:
      "Confirming — on-chain, not yet confirmed. NO Solscan link while we are still watching: a link beside a spinner invites the reader to go check manually, in another tab, at the moment they have nothing to decide. It appears the instant we stop — on success, on timeout, or on a revert.",
    node: <SwapConfirmSheet phase={"confirming" as ExecutionPhase} terms={TERMS} failure={null} signature={REAL_FINALIZED_SIGNATURE} onCancel={noop} />,
  },
  {
    key: "confirmed",
    label:
      "Swap complete — and deliberately NO figure for what arrived. Reading the real delivered amount needs a chain read the browser cannot make, and the rule is to omit it rather than repeat the earlier estimate as if it were the outcome.",
    node: <SwapConfirmSheet phase={"confirmed" as ExecutionPhase} terms={TERMS} failure={null} signature={REAL_FINALIZED_SIGNATURE} onCancel={noop} />,
  },
  {
    key: "confirm_timeout_with_signature",
    label:
      "Gave up watching — the ONLY shape a timeout takes. The poll only runs once a signature exists, so a timeout always carries one, and the link is then the only way they can find out what happened. Check nothing here reads as failure: the transaction may still land.",
    node: <SwapConfirmSheet phase={"failed" as ExecutionPhase} terms={TERMS} failure={"confirm_timeout" as ExecutionFailureKey} signature={REAL_FINALIZED_SIGNATURE} onCancel={noop} />,
  },
  {
    key: "demo_mode",
    label:
      "DEMO MODE — Approve is present but unavailable, with the reason on hover and on keyboard focus. The one place this sheet renders an action that cannot be taken: hiding the last step would hide what a demo exists to show. `aria-disabled`, not `disabled`, so the explanation is reachable without a mouse.",
    node: (
      <SwapConfirmSheet
        demo
        phase={"ready" as ExecutionPhase}
        terms={TERMS}
        failure={null}
        onCancel={noop}
        onApprove={noop}
      />
    ),
  },
  {
    key: "ready_unpriced",
    label:
      "Ready, but the price source failed — the USD sub-lines are OMITTED, not shown as “—”. A dash under a token amount reads as a missing term; missing context should be invisible. The swap is unaffected: pricing never blocks a plan.",
    node: (
      <SwapConfirmSheet
        phase={"ready" as ExecutionPhase}
        terms={{ ...TERMS, inputAmountUsd: null, expectedOutputUsd: null }}
        failure={null}
        onCancel={noop}
        onApprove={noop}
      />
    ),
  },
  {
    key: "ready_as_production_returns_it",
    label:
      "Ready, with the terms production returned on 2026-11-24 for 0.01 SOL → USDC, now with the USD sub-lines and the fee the backend change fills in. This is what your first real swap should look like.",
    node: (
      <SwapConfirmSheet
        phase={"ready" as ExecutionPhase}
        terms={{
          ...TERMS,
          expectedOutputTokens: "0.708636",
          expectedOutputUsd: 0.7084,
          inputAmountUsd: 0.7088,
          minimumOutputTokens: "0.705093",
          priceImpactPct: 0.00448661815241882,
          estimatedTotalCostUsd: null,
        }}
        failure={null}
        onCancel={noop}
        onApprove={noop}
      />
    ),
  },
  {
    key: "verification_failed",
    label: "Verification refused — the state that justifies the whole step",
    node: <SwapConfirmSheet phase={"failed" as ExecutionPhase} terms={TERMS} failure={"verification_failed" as ExecutionFailureKey} onCancel={noop} onRefresh={noop} />,
  },
  {
    key: "expired",
    label: "Expired — still reachable, and NOT the ending where the review closes. Seen when the tab was in the background at expiry, or when there is no way to re-quote: the reader was not watching, so the card waits for them rather than a toast firing into an unwatched tab. The one failure offering Refresh, because fresh terms are the remedy.",
    node: <SwapConfirmSheet phase={"failed" as ExecutionPhase} terms={TERMS} failure={"expired" as ExecutionFailureKey} onCancel={noop} onRefresh={noop} />,
  },
  {
    key: "plan_unavailable",
    label: "Couldn’t prepare — provider outage, or execution switched off",
    node: <SwapConfirmSheet phase={"failed" as ExecutionPhase} terms={null} failure={"plan_unavailable" as ExecutionFailureKey} onCancel={noop} onRefresh={noop} />,
  },
  {
    key: "declined",
    label: "Declined in the wallet — a normal outcome, not an error",
    node: <SwapConfirmSheet phase={"failed" as ExecutionPhase} terms={TERMS} failure={"declined" as ExecutionFailureKey} onCancel={noop} />,
  },
  {
    key: "submit_failed",
    label: "Not sent — funds stayed in the wallet",
    node: <SwapConfirmSheet phase={"failed" as ExecutionPhase} terms={TERMS} failure={"submit_failed" as ExecutionFailureKey} onCancel={noop} />,
  },
];
