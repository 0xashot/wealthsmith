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
import { useSwapExecutionPlan } from "../components/swapExecution/useSwapExecutionPlan";
import { REAL_SWAP_TAKER, REAL_SWAP_TX_SOL_INPUT } from "../suggestions/fixtures/realSwapTransactions";
import type { SwapActionContext } from "../suggestions/swapQuote/swapQuoteContracts";
import type { SwapExecutionPlan } from "../suggestions/swapExecution/executionContracts";
import { useEffect } from "react";
import type { SwapExecutionTerms } from "../suggestions/swapExecution/executionContracts";
import type { ExecutionFailureKey, ExecutionPhase } from "../suggestions/swapExecution/executionLifecycle";

/** Terms taken from a real Jupiter quote (SOL → USDC, 0.01 SOL, 50 bps), so the figures read true. */
const TERMS: SwapExecutionTerms = {
  inputSymbol: "SOL",
  inputMint: "So11111111111111111111111111111111111111112",
  inputAmountRaw: "10000000",
  inputAmountTokens: "0.01",
  outputSymbol: "USDC",
  outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  expectedOutputTokens: "0.726942",
  minimumOutputTokens: "0.723308",
  priceImpactPct: 0.0077,
  slippageBps: 50,
  estimatedTotalCostUsd: 0.011,
  estimatedNetworkFeeUsd: 0.01,
  providerId: "jupiter",
  providerName: "Jupiter",
};

const noop = () => {};

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
function HookDrivenCase({ tamper }: { tamper?: (p: SwapExecutionPlan) => SwapExecutionPlan }) {
  const state = useSwapExecutionPlan({
    action: GALLERY_ACTION,
    takerPublicKey: REAL_SWAP_TAKER,
    slippageBps: 50,
    enabled: true,
    fetcher: async () => ({ ok: true, plan: tamper ? tamper(LIVE_SHAPED_PLAN) : LIVE_SHAPED_PLAN }),
  });

  // The gallery has no user to press anything, so the flow is started on mount.
  useEffect(() => { state.prepare(); }, [state.prepare]);

  return (
    <SwapConfirmSheet
      phase={state.phase}
      terms={state.plan?.terms ?? null}
      failure={state.failure}
      msUntilExpiry={state.msUntilExpiry}
      onCancel={state.cancel}
      onApprove={state.approve}
    />
  );
}

export interface SwapConfirmGalleryCase {
  key: string;
  label: string;
  node: JSX.Element;
}

export const SWAP_CONFIRM_GALLERY_CASES: SwapConfirmGalleryCase[] = [
  {
    key: "hook_real",
    label:
      "REAL HOOK — a genuine mainnet transaction through the real reducer and the real structural check. Reaches Ready; no Approve, because no signer exists until Phase 5.",
    node: <HookDrivenCase />,
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
    key: "preparing",
    label: "Preparing — fetching terms from the execute endpoint",
    node: <SwapConfirmSheet phase={"preparing" as ExecutionPhase} terms={null} failure={null} msUntilExpiry={null} onCancel={noop} />,
  },
  {
    key: "verifying",
    label: "Verifying — terms are shown, the check has not finished, and there is no Approve button yet",
    node: <SwapConfirmSheet phase={"verifying" as ExecutionPhase} terms={TERMS} failure={null} msUntilExpiry={25_000} onCancel={noop} />,
  },
  {
    key: "ready",
    label: "Ready — checked, signer wired (Phase 5). The only state where Approve exists.",
    node: <SwapConfirmSheet phase={"ready" as ExecutionPhase} terms={TERMS} failure={null} msUntilExpiry={18_000} onCancel={noop} onApprove={noop} />,
  },
  {
    key: "ready_no_signer",
    label: "Ready, NO signer — today's real state. Approve is absent rather than disabled.",
    node: <SwapConfirmSheet phase={"ready" as ExecutionPhase} terms={TERMS} failure={null} msUntilExpiry={18_000} onCancel={noop} />,
  },
  {
    key: "ready_absent_figures",
    label: "Ready with unavailable fee / price impact — renders “—”, never a zero",
    node: (
      <SwapConfirmSheet
        phase={"ready" as ExecutionPhase}
        terms={{ ...TERMS, estimatedNetworkFeeUsd: null, priceImpactPct: Number.NaN }}
        failure={null}
        msUntilExpiry={9_000}
        onCancel={noop}
        onApprove={noop}
      />
    ),
  },
  {
    key: "verification_failed",
    label: "Verification refused — the state that justifies the whole step",
    node: <SwapConfirmSheet phase={"failed" as ExecutionPhase} terms={TERMS} failure={"verification_failed" as ExecutionFailureKey} msUntilExpiry={null} onCancel={noop} onRefresh={noop} />,
  },
  {
    key: "expired",
    label: "Expired — the one failure where Refresh is offered, because fresh terms are the remedy",
    node: <SwapConfirmSheet phase={"failed" as ExecutionPhase} terms={TERMS} failure={"expired" as ExecutionFailureKey} msUntilExpiry={0} onCancel={noop} onRefresh={noop} />,
  },
  {
    key: "plan_unavailable",
    label: "Couldn’t prepare — provider outage, or execution switched off",
    node: <SwapConfirmSheet phase={"failed" as ExecutionPhase} terms={null} failure={"plan_unavailable" as ExecutionFailureKey} msUntilExpiry={null} onCancel={noop} onRefresh={noop} />,
  },
  {
    key: "declined",
    label: "Declined in the wallet — a normal outcome, not an error",
    node: <SwapConfirmSheet phase={"failed" as ExecutionPhase} terms={TERMS} failure={"declined" as ExecutionFailureKey} msUntilExpiry={null} onCancel={noop} />,
  },
  {
    key: "submit_failed",
    label: "Not sent — funds stayed in the wallet",
    node: <SwapConfirmSheet phase={"failed" as ExecutionPhase} terms={TERMS} failure={"submit_failed" as ExecutionFailureKey} msUntilExpiry={null} onCancel={noop} />,
  },
  {
    key: "confirm_timeout",
    label: "Still confirming — MUST NOT read as failure; the transaction may still land",
    node: <SwapConfirmSheet phase={"failed" as ExecutionPhase} terms={TERMS} failure={"confirm_timeout" as ExecutionFailureKey} msUntilExpiry={null} onCancel={noop} />,
  },
];
