/**
 * App — local state machine for the Dashboard / Portfolio slices, now driven by a
 * REAL Solana wallet connection (wallet-adapter) for connected/disconnected state.
 *
 * Modes:  connected | demo | disconnected
 *   - connected     = a real wallet is connected (useWallet().connected + publicKey)
 *   - demo          = Demo Mode active (independent of wallet)
 *   - disconnected  = no wallet, not demo
 * Connected page (in-app switch, no router/URL): dashboard | portfolio | goal | support
 *
 * Onboarding gate (patterns/onboarding-with-smith-ai.md — Onboarding Visibility
 * Rule): onboarding_active = mode !== "demo" && (disconnected || !goalCompleted).
 * On load there is no wallet → disconnected onboarding. Connecting a wallet does
 * NOT complete onboarding (goalCompleted is unchanged), so onboarding stays
 * visible until Finish Setup. No Dashboard recalculation from the real wallet:
 * connected Dashboard/Portfolio/Goal/Support stay fixture-backed; only the wallet
 * pill shows the real name + shortened publicKey. READ-ONLY: no balance fetch, no
 * signing, no transactions.
 */
import { useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
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
import { isOnboardingActive, buildSavedGoal, type OnboardingAnswers } from "./state/onboardingState";
import type { SavedGoal } from "./types/goal";
import type { TourStage } from "./pages/OnboardingExperience";
import {
  DEMO_EXIT_TOAST,
  TOAST_ADDRESS_COPIED,
  TOAST_COPY_FAILED,
  ONBOARDING_FINISH_TOAST,
  ONBOARDING_FINISH_HELPER,
} from "./state/approvedCopy";
import "./styles/dashboard.css";

export type AppMode = "connected" | "demo" | "disconnected";
export type ConnectedPage = "dashboard" | "portfolio" | "goal" | "support";

export default function App() {
  // Real wallet-adapter state drives connected/disconnected. No signing, no reads.
  const { connected, publicKey, disconnect } = useWallet();
  const walletConnected = connected && !!publicKey;

  const [activePage, setActivePage] = useState<ConnectedPage>("dashboard");
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  // Local, in-memory saved plan state for the Goal page (Option A: Goal-page
  // scope only — no propagation into Dashboard/derived outputs this slice).
  const [savedGoal, setSavedGoal] = useState<SavedGoal>(initialSavedGoal);
  // Demo Mode is independent of the wallet (sample data).
  const [demoActive, setDemoActive] = useState(false);
  // Onboarding gate. Starts incomplete so the first real wallet connection lands
  // in onboarding (Variant 4). Finish Setup sets it true and it persists for the
  // session (reconnecting after finishing goes straight to the Dashboard).
  const [goalCompleted, setGoalCompleted] = useState(false);
  // End-of-onboarding guided tour (transcript items 20–22).
  const [tourStage, setTourStage] = useState<TourStage>(null);
  const [tourGoal, setTourGoal] = useState<SavedGoal | null>(null);
  const nextToastId = useRef(1);
  const pageWrapRef = useRef<HTMLDivElement>(null);
  // The element that opened the modal, so focus can return to it on close.
  const connectTriggerRef = useRef<HTMLElement | null>(null);

  const mode: AppMode = demoActive ? "demo" : walletConnected ? "connected" : "disconnected";

  const pushToast = (message: string, helper?: string) => {
    const id = nextToastId.current++;
    setToasts((prev) => [...prev, { id, message, helper }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  };

  const dismissToast = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  // React to real wallet connect/disconnect transitions (menu, or the extension
  // side). Connecting leaves Demo Mode, lands on the Dashboard, closes the modal,
  // and announces — but does NOT complete onboarding (goalCompleted unchanged).
  const prevConnected = useRef(walletConnected);
  useEffect(() => {
    const was = prevConnected.current;
    prevConnected.current = walletConnected;
    if (!was && walletConnected) {
      setDemoActive(false);
      setActivePage("dashboard");
      setConnectModalOpen(false);
      connectTriggerRef.current = null;
      pushToast(dashboardState.wallet.copy.connected_toast);
    } else if (was && !walletConnected) {
      setActivePage("dashboard");
      pushToast(
        dashboardState.transitions.disconnect_wallet.copy.toast,
        dashboardState.transitions.disconnect_wallet.copy.helper
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletConnected]);

  // While the Connect Wallet modal is open, take the rest of the page out of the
  // accessibility tree and tab order (native `inert`). On close, clear inert first,
  // then return focus to the trigger.
  useEffect(() => {
    if (pageWrapRef.current) pageWrapRef.current.inert = connectModalOpen;
    if (!connectModalOpen && connectTriggerRef.current) {
      connectTriggerRef.current.focus?.();
      connectTriggerRef.current = null;
    }
  }, [connectModalOpen]);

  // In-app page switch (connected only).
  const navigate = (id: string) => {
    if (id === "dashboard" || id === "portfolio" || id === "goal" || id === "support")
      setActivePage(id);
  };

  // Disconnect the REAL wallet (wallet menu / page). The transition effect handles
  // the toast + returning to the Dashboard. No fake connected state is preserved.
  const disconnectWallet = () => {
    void disconnect();
  };

  const goDemo = () => {
    setActivePage("dashboard");
    setDemoActive(true);
  };
  const exitDemo = () => {
    setDemoActive(false);
    setActivePage("dashboard");
    pushToast(DEMO_EXIT_TOAST);
  };

  // Connect Wallet opens the modal (from disconnected or Demo Mode); the real
  // connection happens on a wallet selection inside the modal.
  const openConnectModal = () => {
    connectTriggerRef.current = document.activeElement as HTMLElement | null;
    setConnectModalOpen(true);
  };
  const closeConnectModal = () => setConnectModalOpen(false);

  // Copy the REAL connected address (passed up from the Global Nav pill menu).
  const copyWalletAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      pushToast(TOAST_ADDRESS_COPIED);
    } catch {
      pushToast(TOAST_COPY_FAILED);
    }
  };

  // Finish Setup (onboarding complete): commit the collected answers into the same
  // local savedGoal state Goal Settings uses, mark onboarding complete, land on the
  // Dashboard, and toast. No Dashboard recalculation (Option A — Goal-page-scoped).
  const handleOnboardingComplete = (goal: SavedGoal) => {
    setSavedGoal(goal);
    setGoalCompleted(true);
    setActivePage("dashboard");
    setTourStage(null);
    setTourGoal(null);
    pushToast(ONBOARDING_FINISH_TOAST, ONBOARDING_FINISH_HELPER);
  };

  // Start the guided tour: keep the onboarding layout (and its sidebar) in place.
  const startOnboardingTour = (answers: OnboardingAnswers) => {
    setTourGoal(buildSavedGoal(answers));
    setTourStage("portfolio");
  };

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
    page = (
      <OnboardingExperience
        mode={mode === "connected" ? "connected" : "disconnected"}
        onConnectWallet={openConnectModal}
        onTryDemo={goDemo}
        onCopyAddress={copyWalletAddress}
        onDisconnect={disconnectWallet}
        onComplete={handleOnboardingComplete}
        onTour={startOnboardingTour}
        tourStage={tourStage}
        tourGoal={tourGoal}
        onSetTourStage={setTourStage}
        onSaveTourGoal={setTourGoal}
        pushToast={pushToast}
      />
    );
  } else if (mode === "connected" && activePage === "portfolio") {
    page = (
      <PortfolioPage
        pushToast={pushToast}
        onNavigate={navigate}
        onDisconnect={disconnectWallet}
        onCopyAddress={copyWalletAddress}
      />
    );
  } else if (mode === "connected" && activePage === "goal") {
    page = (
      <GoalPage
        pushToast={pushToast}
        onNavigate={navigate}
        onDisconnect={disconnectWallet}
        onCopyAddress={copyWalletAddress}
        savedGoal={savedGoal}
        onSaveGoal={setSavedGoal}
      />
    );
  } else if (mode === "connected" && activePage === "support") {
    page = (
      <SupportPage
        pushToast={pushToast}
        onNavigate={navigate}
        onDisconnect={disconnectWallet}
        onCopyAddress={copyWalletAddress}
      />
    );
  } else {
    page = (
      <DashboardPage
        mode={mode}
        pushToast={pushToast}
        activePage={mode === "connected" ? activePage : undefined}
        onNavigate={mode === "connected" ? navigate : undefined}
        onDisconnect={disconnectWallet}
        onConnectWallet={openConnectModal}
        onTryDemo={goDemo}
        onCopyAddress={copyWalletAddress}
        monthlyExpenses={savedGoal.expenses_monthly}
      />
    );
  }

  return (
    <>
      <div ref={pageWrapRef}>{page}</div>
      {connectModalOpen && <ConnectWalletModal onClose={closeConnectModal} />}
      <ToastHost toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
