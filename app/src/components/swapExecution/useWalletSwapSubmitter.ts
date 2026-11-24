/**
 * useWalletSwapSubmitter — Phase 5. The wallet adapter, wired to a plan.
 *
 * Everything that DECIDES is in `submitResolution`; this is the one place that talks to a
 * wallet. It is small on purpose, because it is the only code in the product that can move
 * someone's money, and the whole of it should fit on a screen.
 *
 * THE BYTES SUBMITTED ARE THE BYTES VERIFIED. The plan's transaction is deserialized and handed
 * to the adapter unchanged — no blockhash refresh, no re-fetch, no rebuild. A VersionedTransaction
 * is passed through by both registered adapters without `prepareTransaction`, so what the wallet
 * signs is exactly what was simulated and structurally checked. Refreshing the blockhash would
 * produce different bytes and silently void the verification; a stale one simply fails to submit,
 * which is the correct way for this to go wrong.
 *
 * WE NEVER HOLD A SIGNATURE. `sendTransaction` on both adapters calls the wallet's own
 * `signAndSendTransaction`, so the signed transaction exists only inside the wallet and goes to
 * the chain from there. What comes back is a signature string — a receipt, not an authority.
 */
import { useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { VersionedTransaction } from "@solana/web3.js";
import type { SwapExecutionPlan } from "../../suggestions/swapExecution/executionContracts";
import {
  classifyWalletError,
  isUsableSignature,
  type SubmitOutcome,
} from "../../suggestions/swapExecution/submitResolution";

export type SwapPlanSubmitter = (plan: SwapExecutionPlan) => Promise<SubmitOutcome>;

/**
 * Build the submitter, or null when no wallet can submit.
 *
 * Null rather than a function that fails: the confirm sheet renders Approve only when a
 * submitter exists, so an unusable wallet means no button rather than a button that errors.
 */
export function useWalletSwapSubmitter(): SwapPlanSubmitter | null {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();

  const submit = useCallback<SwapPlanSubmitter>(
    async (plan) => {
      if (!connected || publicKey == null) return { kind: "failed", detail: "wallet_disconnected" };

      let transaction: VersionedTransaction;
      try {
        transaction = VersionedTransaction.deserialize(Buffer.from(plan.unsignedTransaction, "base64"));
      } catch {
        // The plan was structurally verified before reaching here, so this is not a normal
        // path; it fails rather than attempting anything with a transaction we cannot read.
        return { kind: "failed", detail: "undecodable_plan" };
      }

      try {
        const signature = await sendTransaction(transaction, connection, {
          // The transaction carries its own blockhash from quote time and must not be rebuilt.
          // `skipPreflight: false` lets the wallet's own simulation refuse an obviously-doomed
          // transaction before the user pays for it — a second opinion, not a substitute for
          // the check we already ran.
          skipPreflight: false,
          maxRetries: 2,
        });
        if (!isUsableSignature(signature)) return { kind: "failed", detail: "no_signature" };
        return { kind: "submitted", signature };
      } catch (error) {
        return classifyWalletError(error);
      }
    },
    [connected, publicKey, sendTransaction, connection],
  );

  return connected && publicKey != null ? submit : null;
}
