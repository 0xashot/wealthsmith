/**
 * GoalPage — connected Goal Settings per patterns/goal-settings.md.
 *
 * Page shell (Global Nav + wallet pill + Ask Smith AI) around the shared
 * GoalSettings content (prototype note, Edit Mode, the three sections, Save/
 * Discard). The same GoalSettings content is reused in the onboarding tour so the
 * Goal page looks identical in both places.
 *
 * Save-first, no product logic: no Safety Buffer / projection / allocation /
 * suggestion / Top Pick recalculation, no wallet signature, no transaction, no
 * live data. The examples/ fixture is never mutated.
 *
 * Read-only wallet context reuses the connected Dashboard state (Phantom • 6fQ9)
 * for the Global Nav pill. Ask Smith AI is visible on Goal and opens the shared
 * panel with Goal-safe, static, explain-only content (state/goalSmithAi.ts): it
 * does not recalculate the Dashboard, suggestions, Safety Buffer, projections,
 * Top Pick, or protocol decisions, and provides no live AI or investment advice.
 */
import { useRef, useState } from "react";
import { dashboardState as connected } from "../state/dashboardState";
import { goalSmithAiContent } from "../state/goalSmithAi";
import { ASK_SMITH_LABEL_GOAL } from "../state/approvedCopy";
import type { SavedGoal } from "../types/goal";
import GlobalNav from "../components/GlobalNav";
import GoalSettings from "../components/GoalSettings";
import AskSmithAiPanel from "../components/AskSmithAiPanel";

interface Props {
  pushToast: (message: string, helper?: string) => void;
  onNavigate: (id: string) => void;
  onDisconnect: () => void;
  onCopyAddress: (address: string) => void;
  savedGoal: SavedGoal;
  onSaveGoal: (goal: SavedGoal) => void;
}

export default function GoalPage({
  pushToast,
  onNavigate,
  onDisconnect,
  onCopyAddress,
  savedGoal,
  onSaveGoal,
}: Props) {
  const [smithOpen, setSmithOpen] = useState(false);
  const askButtonRef = useRef<HTMLButtonElement>(null);

  const openAskSmithAi = () => setSmithOpen(true);
  const closeAskSmithAi = () => {
    setSmithOpen(false);
    askButtonRef.current?.focus();
  };

  return (
    <div className="app-shell">
      <GlobalNav
        mode="connected"
        nav={connected.global_nav}
        wallet={connected.wallet}
        navLabel={connected.accessibility.global_nav_label}
        walletPillLabel={connected.accessibility.wallet_pill_label}
        askSmithAiLabel={ASK_SMITH_LABEL_GOAL}
        askAvailable={true}
        askButtonRef={askButtonRef}
        activePage="goal"
        onNavigate={onNavigate}
        onCopyAddress={onCopyAddress}
        onDisconnect={onDisconnect}
        onOpenAskSmithAi={openAskSmithAi}
      />

      <div className={"dashboard" + (smithOpen ? "" : " dashboard--single")}>
        <main className="dashboard__main">
          <GoalSettings savedGoal={savedGoal} onSaveGoal={onSaveGoal} pushToast={pushToast} />
        </main>

        {smithOpen && (
          <AskSmithAiPanel content={goalSmithAiContent} onClose={closeAskSmithAi} />
        )}
      </div>
    </div>
  );
}
