/**
 * App — minimal 3-mode local state machine for the Dashboard slices.
 *
 *   connected    → DashboardPage (wallet-connected)
 *   disconnected → DashboardPage (safe no-wallet state)
 *   demo         → DemoDashboardPage (sample data, demo banner, no wallet pill)
 *
 * This is a local fixture-driven state machine only: no real wallet adapters,
 * no live Smith AI, no routing. Transitions:
 *   connected → disconnected (Disconnect)     connected ← disconnected (Connect Wallet)
 *   disconnected → demo (Try Demo Mode)        demo → disconnected (Exit Demo)
 *   demo → connected (Connect Wallet, slice stub — clears demo by switching)
 *
 * Toasts are owned here so they persist across mode switches (e.g. Exit Demo).
 */
import { useRef, useState } from "react";
import DashboardPage from "./pages/DashboardPage";
import DemoDashboardPage from "./pages/DemoDashboardPage";
import ToastHost, { type ToastData } from "./components/ToastHost";
import { dashboardState } from "./state/dashboardState";
import { DEMO_EXIT_TOAST } from "./state/approvedCopy";
import "./styles/dashboard.css";

export type AppMode = "connected" | "demo" | "disconnected";

export default function App() {
  const [mode, setMode] = useState<AppMode>("connected");
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const nextToastId = useRef(1);

  const pushToast = (message: string, helper?: string) => {
    const id = nextToastId.current++;
    setToasts((prev) => [...prev, { id, message, helper }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  };

  const dismissToast = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  // Exit Demo → safe disconnected state, with the approved demo-exit toast.
  const exitDemo = () => {
    pushToast(DEMO_EXIT_TOAST);
    setMode("disconnected");
  };

  // Connect Wallet from Demo Mode → connected fixture state (slice stub).
  // Switching modes clears demo state; demo never persists into connected.
  const connectFromDemo = () => {
    pushToast(dashboardState.wallet.copy.connected_toast);
    setMode("connected");
  };

  return (
    <>
      {mode === "demo" ? (
        <DemoDashboardPage onExitDemo={exitDemo} onConnectWallet={connectFromDemo} />
      ) : (
        <DashboardPage
          mode={mode}
          pushToast={pushToast}
          onDisconnect={() => setMode("disconnected")}
          onConnectWallet={() => setMode("connected")}
          onTryDemo={() => setMode("demo")}
        />
      )}
      <ToastHost toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
