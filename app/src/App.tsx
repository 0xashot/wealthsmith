/**
 * App — minimal local state machine for the Dashboard / Portfolio slices.
 *
 * Modes:  connected | demo | disconnected
 * Connected page (in-app switch, no router/URL): dashboard | portfolio | goal | support
 *
 * Onboarding gate (patterns/onboarding-with-smith-ai.md — Onboarding Visibility
 * Rule): onboarding_active = mode !== "demo" && (disconnected || !goalCompleted).
 * When active it renders the onboarding surface instead of the page. Step 1
 * shows the disconnected onboarding shell; goalCompleted starts true so the
 * connected Dashboard is unchanged.
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
import { useEffect, useRef, useState } from "react";
import DashboardPage from "./pages/DashboardPage";
import PortfolioPage from "./pages/PortfolioPage";
import GoalPage from "./pages/GoalPage";
import SupportPage from "./pages/SupportPage";
import OnboardingExperience from "./pages/OnboardingExperience";
import DemoDashboardPage from "./pages/DemoDashboardPage";
import ToastHost, { type ToastData } from "./components/ToastHost";
import ConnectWalletModal from "./components/ConnectWalletModal";
import { dashboardState } from "./state/dashboardState";
import { initialSavedGoal } from "./state/goalState";
import { isOnboardingActive } from "./state/onboardingState";
import type { SavedGoal } from "./types/goal";
import {
  DEMO_EXIT_TOAST,
  TOAST_ADDRESS_COPIED,
  TOAST_COPY_FAILED,
  ONBOARDING_FINISH_TOAST,
} from "./state/approvedCopy";
import "./styles/dashboard.css";

export type AppMode = "connected" | "demo" | "disconnected";
export type ConnectedPage = "dashboard" | "portfolio" | "goal" | "support";

export default function App() {
  const [mode, setMode] = useState<AppMode>("connected");
  const [activePage, setActivePage] = useState<ConnectedPage>("dashboard");
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  // Local, in-memory saved plan state for the Goal page (Option A: Goal-page
  // scope only — no propagation into Dashboard/derived outputs this slice).
  // Initialized from the approved fixture; persists across nav for the session.
  const [savedGoal, setSavedGoal] = useState<SavedGoal>(initialSavedGoal);
  // Onboarding gate (Onboarding Visibility Rule). The existing connected fixture
  // is a completed plan, so goalCompleted initializes true and the connected
  // Dashboard is unchanged on a normal load. Connecting a wallet does NOT complete
  // onboarding — it flips this to false so onboarding stays visible (Variant 4).
  // Completion (goalCompleted = true from finishing setup) arrives in a later step.
  const [goalCompleted, setGoalCompleted] = useState(true);
  const nextToastId = useRef(1);
  const pageWrapRef = useRef<HTMLDivElement>(null);
  // The element that opened the modal, so focus can return to it on close.
  const connectTriggerRef = useRef<HTMLElement | null>(null);

  // While the Connect Wallet modal is open, take the rest of the page out of the
  // accessibility tree and tab order (native `inert`) so focus stays trapped in
  // the modal and background content is hidden from assistive tech. On close,
  // clear inert first, then return focus to the trigger (focusing while the
  // trigger's ancestor is still inert would be a no-op).
  useEffect(() => {
    if (pageWrapRef.current) pageWrapRef.current.inert = connectModalOpen;
    if (!connectModalOpen && connectTriggerRef.current) {
      connectTriggerRef.current.focus?.();
      connectTriggerRef.current = null;
    }
  }, [connectModalOpen]);

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
    if (id === "dashboard" || id === "portfolio" || id === "goal" || id === "support")
      setActivePage(id);
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

  // Connect Wallet now opens the modal (from disconnected or Demo Mode). The
  // actual stub connection happens on a wallet selection inside the modal.
  // Capture the trigger so focus can return to it on cancel/close.
  const openConnectModal = () => {
    connectTriggerRef.current = document.activeElement as HTMLElement | null;
    setConnectModalOpen(true);
  };
  const closeConnectModal = () => setConnectModalOpen(false);

  // Stub connection succeeded: switch to the approved connected-wallet fixture,
  // land on the Dashboard, and show the approved toast. Switching to connected
  // mode unmounts the demo page, so demo state cannot leak in. No adapter, no
  // signature, no transaction, no fund movement. The trigger is discarded (the
  // page fully re-renders to connected), so focus is not sent to a stale node.
  const handleWalletConnected = () => {
    connectTriggerRef.current = null;
    setConnectModalOpen(false);
    setActivePage("dashboard");
    setMode("connected");
    // Connecting a wallet alone does not complete onboarding: keep onboarding
    // visible (connected + goal incomplete, Variant 4) until goal setup finishes.
    setGoalCompleted(false);
    pushToast(dashboardState.wallet.copy.connected_toast);
  };

  // Wallet menu actions for the connected onboarding surface (Variant 4).
  const copyWalletAddress = async () => {
    try {
      await navigator.clipboard.writeText(dashboardState.wallet.address);
      pushToast(TOAST_ADDRESS_COPIED);
    } catch {
      pushToast(TOAST_COPY_FAILED);
    }
  };
  const disconnectFromOnboarding = () => {
    pushToast(
      dashboardState.transitions.disconnect_wallet.copy.toast,
      dashboardState.transitions.disconnect_wallet.copy.helper
    );
    goDisconnected();
  };

  // Finish Setup (onboarding complete): commit the collected answers into the
  // same local savedGoal state Goal Settings uses, mark onboarding complete so
  // it stops showing (goalCompleted = true), land on the connected Dashboard,
  // and show the approved completion toast. No Dashboard recalculation: the
  // connected fixture outputs (suggestions/Top Pick/Safety Buffer/projections/
  // allocation/protocol) are unchanged (Option A — Goal-page-scoped save).
  const handleOnboardingComplete = (goal: SavedGoal) => {
    setSavedGoal(goal);
    setGoalCompleted(true);
    setActivePage("dashboard");
    pushToast(ONBOARDING_FINISH_TOAST);
  };

  // Onboarding is not optional: shown whenever disconnected, or connected with an
  // incomplete goal. Demo Mode overrides onboarding while active.
  const onboardingActive = isOnboardingActive(mode, goalCompleted);

  let page;
  if (mode === "demo") {
    page = (
      <DemoDashboardPage
        pushToast={pushToast}
        onExitDemo={exitDemo}
        onConnectWallet={openConnectModal}
      />
    );
  } else if (onboardingActive) {
    // Onboarding surface. Disconnected → welcome/entry (Variant 1); connected +
    // goal incomplete → goal-setup steps (Variant 4). It does not recalculate
    // suggestions/Top Pick/Safety Buffer/projections/allocation/protocol decisions.
    page = (
      <OnboardingExperience
        mode={mode === "connected" ? "connected" : "disconnected"}
        onConnectWallet={openConnectModal}
        onTryDemo={goDemo}
        onCopyAddress={copyWalletAddress}
        onDisconnect={disconnectFromOnboarding}
        onComplete={handleOnboardingComplete}
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
  } else if (mode === "connected" && activePage === "goal") {
    page = (
      <GoalPage
        pushToast={pushToast}
        onNavigate={navigate}
        onDisconnect={goDisconnected}
        savedGoal={savedGoal}
        onSaveGoal={setSavedGoal}
      />
    );
  } else if (mode === "connected" && activePage === "support") {
    page = (
      <SupportPage
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
        onConnectWallet={openConnectModal}
        onTryDemo={goDemo}
      />
    );
  }

  return (
    <>
      <div ref={pageWrapRef}>{page}</div>
      {connectModalOpen && (
        <ConnectWalletModal
          onClose={closeConnectModal}
          onConnected={handleWalletConnected}
        />
      )}
      <ToastHost toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
