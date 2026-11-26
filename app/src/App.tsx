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
import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import DashboardPage from "./pages/DashboardPage";
import PortfolioPage from "./pages/PortfolioPage";
import GoalPage from "./pages/GoalPage";
import SupportPage from "./pages/SupportPage";
import StrategyLabPage from "./pages/StrategyLabPage";
import VettingPage from "./pages/VettingPage";
import OnboardingExperience from "./pages/OnboardingExperience";
import DemoDashboardPage from "./pages/DemoDashboardPage";
import DemoPortfolioPage from "./pages/DemoPortfolioPage";
import ToastHost, { type ToastData } from "./components/ToastHost";
import ConnectWalletModal from "./components/ConnectWalletModal";
import ConfirmDialog from "./components/ConfirmDialog";
import { dashboardState } from "./state/dashboardState";
import { initialSavedGoal } from "./state/goalState";
import { DEMO_GOAL } from "./suggestions/demoContributionScenario";
import { isOnboardingActive, buildSavedGoal, type OnboardingAnswers } from "./state/onboardingState";
import type { SavedGoal } from "./types/goal";
import type { TourStage } from "./pages/OnboardingExperience";
import {
  DEMO_EXIT_TOAST,
  ONBOARDING_FINISH_TOAST,
  GOAL_DISCARD,
  GOAL_DISCARD_CONFIRM_TITLE,
  GOAL_DISCARD_CONFIRM_BODY,
  GOAL_DISCARD_CONFIRM_CANCEL,
} from "./state/approvedCopy";
import {
  isInternalSolLstPreviewRouteEnabled,
  INTERNAL_SOL_LST_PREVIEW_ROUTE_PATH,
} from "./components/internal/internalPreviewFlags";
import InternalPreviewGate from "./components/internal/InternalPreviewGate";
import SolLstSelectorPreview from "./components/internal/SolLstSelectorPreview";
import {
  getDefaultSolLstSelectorPreview,
  getInternalOnlySolLstSelectedPreviewExample,
} from "./suggestions/protocolSolLiquidStakingSelectorPreview";
/**
 * Step 16H-K.2 — the internal `/testing` gallery is LAZY, and its gate lives in its own
 * dependency-free module (`internalTestingRoute`). Previously `App.tsx` imported the gate FROM the
 * fixture module, which dragged the fixtures — including internal numeric risk-score values — into the
 * main production chunk even though the route was never reachable. Now the main chunk is clean.
 *
 * A public build never registers the route (`isTestingPageEnabled()` is false), so it never requests
 * this chunk. Rollup still EMITS the chunk as a static asset: the try/catch in the gate defeats static
 * analysis, and a bare `import.meta.env` literal would crash the Node fixtures runner, which has no
 * such object. Excluding the chunk outright would need a build-time alias/plugin — deliberately out of
 * scope, since the requirement is that the route is unreachable, not that the score is a secret.
 */
const TestingPage = lazy(() => import("./pages/TestingPage"));
const PortfolioTestingPage = lazy(() => import("./pages/PortfolioTestingPage"));
const SwapWalkthroughPage = lazy(() => import("./pages/SwapWalkthroughPage"));
import { isTestingPageEnabled, TESTING_PAGE_ROUTE, PORTFOLIO_TESTING_PAGE_ROUTE, SWAP_WALKTHROUGH_ROUTE } from "./pages/internalTestingRoute";
import "./styles/dashboard.css";
// Mobile/tablet overrides (< 1280px) — loaded last so it wins; every rule is
// scoped inside a max-width media query, so the desktop design is never affected.
import "./styles/mobile.css";

export type AppMode = "connected" | "demo" | "disconnected";
export type ConnectedPage = "dashboard" | "portfolio" | "goal" | "support" | "strategy_lab" | "vetting";

/**
 * DEV-ONLY guarded preview route. Reachable ONLY in a local dev build with
 * VITE_INTERNAL_SOL_LST_PREVIEW="true" AND the exact internal path. In every normal
 * flow (production, plain `npm run dev`, any other path) this is false and the app
 * renders exactly as before. It calls no hooks, so it wraps MainApp cleanly.
 */
export default function App() {
  // HIDDEN, fixture-only QA surface (Step 13H). Reachable ONLY by opening
  // `/testing` directly AND only when the route is enabled (local dev, or a
  // staging build with VITE_ENABLE_TESTING_PAGE="true"). Never linked in nav.
  // Renders no wallet UI and mutates no live/Demo state. Disabled → normal app.
  if (
    isTestingPageEnabled() &&
    typeof window !== "undefined" &&
    window.location.pathname === TESTING_PAGE_ROUTE
  ) {
    return (
      <Suspense fallback={null}>
        <TestingPage />
      </Suspense>
    );
  }
  // Internal Portfolio empty/loading-states design surface — same build-time gate.
  if (
    isTestingPageEnabled() &&
    typeof window !== "undefined" &&
    window.location.pathname === PORTFOLIO_TESTING_PAGE_ROUTE
  ) {
    return (
      <Suspense fallback={null}>
        <PortfolioTestingPage />
      </Suspense>
    );
  }
  // The swap confirm flow, driven rather than pictured. Same build-time gate.
  if (
    isTestingPageEnabled() &&
    typeof window !== "undefined" &&
    window.location.pathname === SWAP_WALKTHROUGH_ROUTE
  ) {
    return (
      <Suspense fallback={null}>
        <SwapWalkthroughPage />
      </Suspense>
    );
  }
  if (
    isInternalSolLstPreviewRouteEnabled() &&
    typeof window !== "undefined" &&
    window.location.pathname === INTERNAL_SOL_LST_PREVIEW_ROUTE_PATH
  ) {
    return (
      <InternalPreviewGate fallback={<MainApp />}>
        <main style={{ minHeight: "100vh", padding: "24px 0" }}>
          <SolLstSelectorPreview preview={getDefaultSolLstSelectorPreview()} />
          <SolLstSelectorPreview preview={getInternalOnlySolLstSelectedPreviewExample()} showFixturePanel />
        </main>
      </InternalPreviewGate>
    );
  }
  return <MainApp />;
}

function MainApp() {
  // Real wallet-adapter state drives connected/disconnected. No signing, no reads.
  const { connected, publicKey, disconnect, select } = useWallet();
  const walletConnected = connected && !!publicKey;

  const [activePage, setActivePage] = useState<ConnectedPage>("dashboard");
  // Unsaved-Goal-edits guard: block navigation away until the user confirms discarding.
  const [goalDirty, setGoalDirty] = useState(false);
  const [pendingNav, setPendingNav] = useState<ConnectedPage | null>(null);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  // Local, in-memory saved plan state for the Goal page (Option A: Goal-page
  // scope only — no propagation into Dashboard/derived outputs this slice).
  const [savedGoal, setSavedGoal] = useState<SavedGoal>(initialSavedGoal);
  // Demo Mode is independent of the wallet (sample data). The demo Goal page edits
  // this sample goal locally so it never touches the user's real savedGoal.
  const [demoGoal, setDemoGoal] = useState<SavedGoal>(DEMO_GOAL);
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

  const pushToast = (message: string, helper?: string, variant: ToastData["variant"] = "success") => {
    const id = nextToastId.current++;
    setToasts((prev) => [...prev, { id, message, helper, variant }]);
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
      // Deselect the adapter on EVERY disconnect (app menu OR the extension side). The wallet-adapter
      // keeps the last wallet "selected" after a disconnect, so a later reconnect would call
      // select(sameWallet) — a no-op that never re-drives the connect flow, leaving the Connect modal
      // stuck on "Connecting…". Deselecting makes the next connect start fresh, like the first one.
      select(null);
      // No helper line ("Your funds stay in your wallet.") — the confirmation alone is enough.
      pushToast(dashboardState.transitions.disconnect_wallet.copy.toast);
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
    if (id !== "dashboard" && id !== "portfolio" && id !== "goal" && id !== "support" && id !== "strategy_lab" && id !== "vetting") return;
    // Leaving the Goal page with unsaved edits → confirm discarding first.
    if (activePage === "goal" && id !== "goal" && goalDirty) {
      setPendingNav(id);
      return;
    }
    setActivePage(id);
  };

  // Demo Mode page switch — Dashboard / Portfolio / Goal / Support are all
  // available in Demo (sample data), matching the connected nav.
  const demoNavigate = (id: string) => {
    if (id === "dashboard" || id === "portfolio" || id === "goal" || id === "support" || id === "strategy_lab" || id === "vetting") {
      setActivePage(id);
    }
  };

  // Disconnect the REAL wallet (wallet menu / page). The transition effect handles the toast,
  // returning to the Dashboard, and deselecting the adapter. No fake connected state is preserved.
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
  // `onConnected` is supplied by a caller that wants to carry on afterwards (the swap review
  // reopening its suggestion). `unknown`, because this is also used directly as a click handler
  // and is then handed the click event — only a function counts.
  const afterConnectRef = useRef<(() => void) | null>(null);
  const openConnectModal = (onConnected?: unknown) => {
    connectTriggerRef.current = document.activeElement as HTMLElement | null;
    afterConnectRef.current = typeof onConnected === "function" ? (onConnected as () => void) : null;
    setConnectModalOpen(true);
  };
  const closeConnectModal = () => setConnectModalOpen(false);
  // The dialog has closed. Tell whoever asked — but only if it left a wallet connected: a
  // dialog that was dismissed has nothing to carry on from.
  useEffect(() => {
    if (connectModalOpen) return;
    const resume = afterConnectRef.current;
    afterConnectRef.current = null;
    if (resume && walletConnected) resume();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectModalOpen]);

  // Finish Setup (onboarding complete): commit the collected answers into the same
  // local savedGoal state Goal Settings uses, mark onboarding complete, land on the
  // Dashboard, and toast. No Dashboard recalculation (Option A — Goal-page-scoped).
  const handleOnboardingComplete = (goal: SavedGoal) => {
    setSavedGoal(goal);
    setGoalCompleted(true);
    setActivePage("dashboard");
    setTourStage(null);
    setTourGoal(null);
    pushToast(ONBOARDING_FINISH_TOAST);
  };

  // Start the guided tour: keep the onboarding layout (and its sidebar) in place.
  const startOnboardingTour = (answers: OnboardingAnswers) => {
    setTourGoal(buildSavedGoal(answers));
    setTourStage("portfolio");
  };

  const onboardingActive = isOnboardingActive(mode, goalCompleted);

  let page;
  if (mode === "demo") {
    page =
      activePage === "portfolio" ? (
        <DemoPortfolioPage
          pushToast={pushToast}
          onExitDemo={exitDemo}
          onConnectWallet={openConnectModal}
          onNavigate={demoNavigate}
          goal={demoGoal}
        />
      ) : activePage === "goal" ? (
        <GoalPage
          mode="demo"
          pushToast={pushToast}
          onNavigate={demoNavigate}
          onDisconnect={disconnectWallet}
          onExitDemo={exitDemo}
          onConnectWallet={openConnectModal}
          savedGoal={demoGoal}
          onSaveGoal={setDemoGoal}
        />
      ) : activePage === "strategy_lab" ? (
        <StrategyLabPage
          mode="demo"
          pushToast={pushToast}
          onNavigate={demoNavigate}
          onDisconnect={disconnectWallet}
          onExitDemo={exitDemo}
          onConnectWallet={openConnectModal}
        />
      ) : activePage === "vetting" ? (
        <VettingPage
          mode="demo"
          onNavigate={demoNavigate}
          onDisconnect={disconnectWallet}
          onExitDemo={exitDemo}
          onConnectWallet={openConnectModal}
        />
      ) : activePage === "support" ? (
        <SupportPage
          mode="demo"
          pushToast={pushToast}
          onNavigate={demoNavigate}
          onDisconnect={disconnectWallet}
          onExitDemo={exitDemo}
          onConnectWallet={openConnectModal}
        />
      ) : (
        <DemoDashboardPage
          pushToast={pushToast}
          onExitDemo={exitDemo}
          onConnectWallet={openConnectModal}
          onNavigate={demoNavigate}
          activePage={activePage}
          goal={demoGoal}
        />
      );
  } else if (activePage === "strategy_lab") {
    // Strategy Lab (Trust) is available in every non-demo mode, including
    // disconnected / mid-onboarding — trust content needs no wallet. Same
    // precedence as Support so it is reachable from the disconnected nav.
    page = (
      <StrategyLabPage
        mode={mode === "connected" ? "connected" : "disconnected"}
        pushToast={pushToast}
        onboardingActive={onboardingActive}
        onNavigate={navigate}
        onDisconnect={disconnectWallet}
        onConnectWallet={openConnectModal}
        onTryDemo={goDemo}
      />
    );
  } else if (activePage === "vetting") {
    // Vetting (Trust) — same precedence as Strategy Lab: available in every
    // non-demo mode, including disconnected / mid-onboarding.
    page = (
      <VettingPage
        mode={mode === "connected" ? "connected" : "disconnected"}
        onboardingActive={onboardingActive}
        onNavigate={navigate}
        onDisconnect={disconnectWallet}
        onConnectWallet={openConnectModal}
        onTryDemo={goDemo}
      />
    );
  } else if (activePage === "support") {
    // Support is available in every non-demo mode, including disconnected /
    // mid-onboarding (FAQ + Contact Us need no wallet). Takes precedence over the
    // onboarding gate so it is reachable from the disconnected landing nav.
    page = (
      <SupportPage
        mode={mode === "connected" ? "connected" : "disconnected"}
        onboardingActive={onboardingActive}
        pushToast={pushToast}
        onNavigate={navigate}
        onDisconnect={disconnectWallet}
        onConnectWallet={openConnectModal}
        onTryDemo={goDemo}
      />
    );
  } else if (onboardingActive) {
    page = (
      <OnboardingExperience
        mode={mode === "connected" ? "connected" : "disconnected"}
        onConnectWallet={openConnectModal}
        onTryDemo={goDemo}
        onNavigate={navigate}
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
        onConnectWallet={openConnectModal}
        savedGoal={savedGoal}
      />
    );
  } else if (mode === "connected" && activePage === "goal") {
    page = (
      <GoalPage
        pushToast={pushToast}
        onNavigate={navigate}
        onDisconnect={disconnectWallet}
        savedGoal={savedGoal}
        onSaveGoal={setSavedGoal}
        onDirtyChange={setGoalDirty}
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
        goal={savedGoal}
      />
    );
  }

  return (
    <>
      <div ref={pageWrapRef}>{page}</div>
      {connectModalOpen && <ConnectWalletModal onClose={closeConnectModal} />}
      {pendingNav && (
        <ConfirmDialog
          title={GOAL_DISCARD_CONFIRM_TITLE}
          body={GOAL_DISCARD_CONFIRM_BODY}
          cancelLabel={GOAL_DISCARD_CONFIRM_CANCEL}
          confirmLabel={GOAL_DISCARD}
          danger
          onCancel={() => setPendingNav(null)}
          onConfirm={() => {
            setGoalDirty(false);
            setActivePage(pendingNav);
            setPendingNav(null);
          }}
        />
      )}
      <ToastHost toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
