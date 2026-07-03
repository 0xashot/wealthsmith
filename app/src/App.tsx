/**
 * App — minimal local state machine for the Dashboard / Portfolio slices.
 *
 * Modes:  connected | demo | disconnected
 * Connected page (in-app switch, no router/URL): dashboard | portfolio
 *
 * Fixture-driven only: no real wallet adapters, no live Smith AI, no routing.
 * Transitions:
 *   connected → disconnected (Disconnect)     connected ← disconnected (Connect Wallet)
 *   disconnected → demo (Try Demo Mode)        demo → disconnected (Exit Demo)
 *   demo → connected (Connect Wallet, slice stub — clears demo by switching)
 *   Dashboard ⇄ Portfolio (Global Nav, connected only)
 *
 * Toasts are owned here so they persist across mode switches.
 */
import { useRef, useState } from "react";
import DashboardPage from "./pages/DashboardPage";
import PortfolioPage from "./pages/PortfolioPage";
import DemoDashboardPage from "./pages/DemoDashboardPage";
import ToastHost, { type ToastData } from "./components/ToastHost";
import { dashboardState } from "./state/dashboardState";
import { DEMO_EXIT_TOAST } from "./state/approvedCopy";
import "./styles/dashboard.css";

export type AppMode = "connected" | "demo" | "disconnected";
export type ConnectedPage = "dashboard" | "portfolio";

export default function App() {
  const [mode, setMode] = useState<AppMode>("connected");
  const [activePage, setActivePage] = useState<ConnectedPage>("dashboard");
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

  // In-app page switch (connected only).
  const navigate = (id: string) => {
    if (id === "dashboard" || id === "portfolio") setActivePage(id);
  };

  // Transitions always land on the Dashboard page so a mode change never
  // leaves a stale Portfolio view.
  const goDisconnected = () => {
    setActivePage("dashboard");
    setMode("disconnected");
  };
  const goDemo = () => {
    setActivePage("dashboard");
    setMode("demo");
  };
  const exitDemo = () => {
    pushToast(DEMO_EXIT_TOAST);
    setActivePage("dashboard");
    setMode("disconnected");
  };
  const connectFromDemo = () => {
    pushToast(dashboardState.wallet.copy.connected_toast);
    setActivePage("dashboard");
    setMode("connected");
  };

  let page;
  if (mode === "demo") {
    page = (
      <DemoDashboardPage
        pushToast={pushToast}
        onExitDemo={exitDemo}
        onConnectWallet={connectFromDemo}
      />
    );
  } else if (mode === "connected" && activePage === "portfolio") {
    page = (
      <PortfolioPage
        pushToast={pushToast}
        onNavigate={navigate}
        onDisconnect={goDisconnected}
      />
    );
  } else {
    page = (
      <DashboardPage
        mode={mode}
        pushToast={pushToast}
        activePage={mode === "connected" ? activePage : undefined}
        onNavigate={mode === "connected" ? navigate : undefined}
        onDisconnect={goDisconnected}
        onConnectWallet={() => setMode("connected")}
        onTryDemo={goDemo}
      />
    );
  }

  return (
    <>
      {page}
      <ToastHost toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
