/**
 * swapExecutionSeam — the one place the live confirm flow's outside world can be substituted.
 *
 * WHY THIS EXISTS. The live flow had never been run end to end before its first real swap
 * attempt, because running it needed a connected wallet and a server — so the only way to see
 * it was production. That attempt found that pressing Swap requested nothing at all. Demo Mode
 * could not have shown it: Demo Mode deliberately bypasses the plan hook, the wallet and the
 * submitter, which is exactly the code that was broken.
 *
 * With a seam provided, `SwapExecutionSection` runs its LIVE branch — the real hook, the real
 * state machine, the real sheet — against a stand-in wallet key, plan service, submitter and
 * confirmation reader. Nothing about the flow is simulated except its edges.
 *
 * WHAT IT IS NOT. It is not a way to reach a real wallet: when a seam is present the wallet
 * adapter's key and submitter are not used at all, so a surface that provides one CANNOT submit
 * a real transaction. Only the swap walkthrough provides it (fixture SWXE-21), and no product
 * page may.
 */
import { createContext } from "react";
import type { SwapPlanSubmitter } from "./useSwapExecutionPlan";
import type { fetchSwapExecutionPlan } from "../../suggestions/swapExecution/swapExecutionClient";
import type { fetchConfirmationState } from "../../suggestions/swapExecution/confirmationPolling";

export interface SwapExecutionSeam {
  /** The stand-in wallet's key. Null simulates "no wallet here can sign". */
  takerPublicKey: string | null;
  /** Stands in for the wallet. Never the real adapter's submitter. */
  submit: SwapPlanSubmitter;
  /** Stands in for POST /api/swap-execute. */
  planFetcher: typeof fetchSwapExecutionPlan;
  /** Stands in for GET /api/swap-execute/status. */
  confirmationFetcher: typeof fetchConfirmationState;
  /**
   * Stands in for reopening the wallet link. Resolves true when the stand-in wallet is usable
   * afterwards (the provider of the seam then supplies a non-null `takerPublicKey`), false when
   * the attempt was refused. Absent simulates a session with no wallet to reconnect to.
   */
  reconnect?: () => Promise<boolean>;
}

export const SwapExecutionSeamContext = createContext<SwapExecutionSeam | null>(null);
