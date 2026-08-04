/**
 * OnboardingExperience — the onboarding surface per patterns/onboarding-with-smith-ai.md
 * and patterns/dashboard-layout.md.
 *
 *  - Variant 1 (disconnected): Smith intro / wallet + Demo entry.
 *  - Variant 4 (connected + goal incomplete): the scripted Smith AI conversation
 *    in the sidebar, with a starter/empty Dashboard preview in the main column.
 *  - Tour (transcript items 20–22): after the plan summary the layout stays the
 *    same — the Onboarding sidebar remains open in place — while the MAIN column
 *    swaps to the Portfolio view (tourStage "portfolio") or a read-only Goal
 *    summary (tourStage "goal"). The sidebar shows the tour step + quick actions.
 *
 * In every variant Portfolio / Goal / Support are disabled in the Global Nav and
 * the global Ask Smith AI button is hidden — the onboarding companion is the only
 * Smith surface.
 *
 * Non-custodial / prototype: read-only wallet connection, no signatures, no
 * transactions, no fund movement, no live AI. The Portfolio tour shows the REAL
 * connected-wallet Portfolio (same live read-only component as the standalone
 * Portfolio page), and the Goal tour previews the collected plan.
 */
import { dashboardState as s } from "../state/dashboardState";
import { portfolioState as p } from "../state/portfolioState";
import GlobalNav from "../components/GlobalNav";
import PageHeader from "../components/PageHeader";
import DashboardBody from "../components/DashboardBody";
import RealWalletPortfolio from "../components/RealWalletPortfolio";
import GoalSettings from "../components/GoalSettings";
import OnboardingPanel from "../components/OnboardingPanel";
import logoUrl from "../../../assets/logo/wealthsmith-full-lockup.svg";
import type { SavedGoal } from "../types/goal";
import type { OnboardingAnswers } from "../state/onboardingState";

export type TourStage = null | "portfolio" | "goal";

interface Props {
  mode: "disconnected" | "connected";
  onConnectWallet: () => void;
  /** Try Demo Mode entry — the Global Nav (desktop) and, on mobile, inside the
   *  full-screen onboarding panel. */
  onTryDemo: () => void;
  /** In-app nav switch — only Support is reachable from here (FAQ/contact need no
   *  wallet); Portfolio/Goal stay gated during onboarding. */
  onNavigate?: (id: string) => void;
  /** Connected phase: wallet menu actions. */
  onDisconnect: () => void;
  /** Finish Setup: commit answers + complete onboarding (connected phase). */
  onComplete: (savedGoal: SavedGoal) => void;
  /** Start the end-of-onboarding Portfolio/Goal tour with the collected answers. */
  onTour: (answers: OnboardingAnswers) => void;
  /** Tour stage (null outside the tour) + stage control + previewed plan. */
  tourStage: TourStage;
  tourGoal: SavedGoal | null;
  onSetTourStage: (stage: TourStage) => void;
  /** Goal-tour: commit edits to the previewed plan + toast host. */
  onSaveTourGoal: (goal: SavedGoal) => void;
  pushToast: (message: string, helper?: string) => void;
}

export default function OnboardingExperience({
  mode,
  onConnectWallet,
  onTryDemo,
  onNavigate,
  onDisconnect,
  onComplete,
  onTour,
  tourStage,
  tourGoal,
  onSetTourStage,
  onSaveTourGoal,
  pushToast,
}: Props) {
  const connected = mode === "connected";

  // Main column: Portfolio view / read-only Goal summary during the tour, else
  // the shared Dashboard body preview. The sidebar (OnboardingPanel) is unchanged.
  let mainColumn;
  if (connected && tourStage === "portfolio") {
    // Real connected-wallet Portfolio (same component + live read as the standalone
    // Portfolio page) — the tour previews the user's ACTUAL holdings, not fixtures.
    mainColumn = (
      <>
        <PageHeader header={p.page_header} />
        <RealWalletPortfolio pushToast={pushToast} goal={tourGoal ?? undefined} />
      </>
    );
  } else if (connected && tourStage === "goal" && tourGoal) {
    // The real Goal Settings content (same as the standalone Goal page), previewing
    // the collected plan. Edits commit to the previewed plan (onSaveTourGoal).
    mainColumn = (
      <GoalSettings
        savedGoal={tourGoal}
        onSaveGoal={onSaveTourGoal}
        pushToast={pushToast}
        editingDisabled
      />
    );
  } else {
    // Same Dashboard body as the connected + disconnected Dashboard, so the layout
    // is identical across onboarding / connected / not-connected. Live data
    // populates what it can; the rest shows safe unavailable states. No "finish
    // setting up" / "connect wallet" card — the onboarding panel drives that.
    mainColumn = (
      <>
        <PageHeader header={{ ...s.page_header, description: undefined }} />
        <DashboardBody />
      </>
    );
  }

  return (
    <div className="app-shell">
      <GlobalNav
        mode={mode}
        nav={s.global_nav}
        wallet={connected ? s.wallet : undefined}
        navLabel={s.accessibility.global_nav_label}
        walletPillLabel={connected ? s.accessibility.wallet_pill_label : undefined}
        askSmithAiLabel={s.global_nav.right_actions.ask_smith_ai.accessibility_label}
        askAvailable={false}
        activePage={connected && tourStage ? tourStage : "dashboard"}
        onboardingActive
        onNavigate={onNavigate}
        onConnectWallet={onConnectWallet}
        onTryDemo={onTryDemo}
        onDisconnect={onDisconnect}
      />

      <div className="dashboard">
        <main className="dashboard__main">{mainColumn}</main>

        {/* Mobile-only wrapper: on mobile it becomes a full-screen takeover with a
            branded top bar above the onboarding card, on a slightly darker ground.
            On desktop it is `display: contents` and the top bar is hidden, so the
            panel stays the plain grid sidebar (unchanged). */}
        <div className="onboarding-mobile-shell">
          <header className="onboarding-mobile-topbar">
            <img
              className="onboarding-mobile-topbar__logo"
              src={logoUrl}
              alt="WealthSmith"
              width={221}
              height={32}
            />
          </header>
          <OnboardingPanel
            mode={mode}
            onConnectWallet={onConnectWallet}
            onTryDemo={onTryDemo}
            onDisconnect={onDisconnect}
            onComplete={onComplete}
            onTour={onTour}
            tourStage={tourStage}
            tourGoal={tourGoal}
            onSetTourStage={onSetTourStage}
          />
        </div>
      </div>
    </div>
  );
}
