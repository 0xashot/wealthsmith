/**
 * useWalletReconnect — reopen the browser's link to the wallet, on request.
 *
 * WHY THIS EXISTS. A session and a wallet link are two things. The session ("Phantom • Cu9L" in
 * the header) is restored after a page refresh; the wallet adapter's live connection is not —
 * auto-connect is off on purpose, because a silent reconnect on load was reconnecting stale
 * wallets. So after any refresh someone looks connected and nothing can sign. The first real
 * swap attempt met exactly that: a greyed Swap under a header saying the wallet was connected.
 *
 * This opens the link when the reader ASKS for something that needs it — pressing Swap — rather
 * than on load. It is the wallet's own connect call: no signature, no transaction, and for a
 * site the wallet already trusts usually no prompt either.
 *
 * It does NOT decide whether the wallet it reaches is the right one. That is `walletReady` in
 * `SwapExecutionSection` (the connected key must be the session's key). This only reports how
 * the attempt ended.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState, type WalletName } from "@solana/wallet-adapter-base";
import type { SwapExecutionSeam } from "./swapExecutionSeam";

export type WalletReconnectStatus = "idle" | "connecting" | "connected" | "failed";

export interface WalletReconnect {
  /** A wallet is known for this session and installed here, so a reconnect can be attempted. */
  canReconnect: boolean;
  status: WalletReconnectStatus;
  /** Start an attempt. A no-op while one is in flight or when none is possible. */
  reconnect: () => void;
}

/**
 * @param preferredWalletName The wallet this SESSION signed in with, when the host knows it.
 *   Null falls back to the adapter's own selected wallet.
 * @param seam The walkthrough's stand-ins. With one present the real adapter is never called.
 */
export function useWalletReconnect(
  preferredWalletName: string | null,
  seam: SwapExecutionSeam | null,
): WalletReconnect {
  const { wallets, wallet, select, connect, disconnect, connected, connecting } = useWallet();
  const [status, setStatus] = useState<WalletReconnectStatus>("idle");
  const [pendingName, setPendingName] = useState<string | null>(null);
  // One connect() per attempt: the effect below re-runs as the adapter's flags move.
  const firedRef = useRef(false);
  const mountedRef = useRef(true);
  // Set on mount as well as cleared on unmount: Strict Mode mounts, unmounts and mounts again,
  // and a ref only ever cleared would read "unmounted" for the rest of the component's life —
  // every attempt's outcome would then be dropped and the button would spin until the cap.
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const name = preferredWalletName ?? wallet?.adapter.name ?? null;
  const installed =
    name != null &&
    wallets.some(
      (w) =>
        w.adapter.name === name &&
        (w.readyState === WalletReadyState.Installed || w.readyState === WalletReadyState.Loadable),
    );
  const canReconnect = seam ? seam.reconnect != null : installed;

  const reconnect = useCallback(() => {
    if (status === "connecting") return;
    if (seam) {
      if (!seam.reconnect) return;
      setStatus("connecting");
      seam.reconnect().then(
        (ok) => { if (mountedRef.current) setStatus(ok ? "connected" : "failed"); },
        () => { if (mountedRef.current) setStatus("failed"); },
      );
      return;
    }
    if (!installed || name == null) return;
    firedRef.current = false;
    setStatus("connecting");
    // A wallet that is connected and still not usable is on a different account from the
    // session's. Reconnecting has to start from disconnected, or connect() is a no-op.
    const start = () => { if (mountedRef.current) setPendingName(name); };
    if (connected) disconnect().then(start, start);
    else start();
  }, [status, seam, installed, name, connected, disconnect]);

  // Select, then connect — the same two steps, in the same order, as the Connect Wallet dialog.
  // `select` only records the choice; `connect` can run once the adapter reflects it.
  useEffect(() => {
    if (pendingName == null) return;
    if (wallet?.adapter.name !== pendingName) {
      // Also covers a host that deselects the adapter after the disconnect above.
      select(pendingName as WalletName);
      return;
    }
    if (connected) {
      setPendingName(null);
      setStatus("connected");
      return;
    }
    if (connecting || firedRef.current) return;
    firedRef.current = true;
    connect().catch(() => {
      if (!mountedRef.current) return;
      setPendingName(null);
      setStatus("failed");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingName, wallet, connected, connecting]);

  return { canReconnect, status, reconnect };
}
