/**
 * DemoDashboardPage — Demo Mode Dashboard shell per rules/demo-mode-rules.md
 * and patterns/dashboard-layout.md (Mode 5).
 *
 * STEP 2 SCOPE: state-machine + shell only. This renders the persistent Demo
 * banner (outside Global Nav), the demo Global Nav variant (no wallet pill,
 * Ask Smith AI visible), the demo page header, and a working demo-aware Ask
 * Smith AI panel. The demo left-content cards, charts, and suggestion cards
 * are rendered in the next step; the rail currently shows its approved header
 * only.
 *
 * Sample data only. No wallet pill. No transactions, signatures, or fund
 * movement. Demo state does not persist into connected mode (App clears it by
 * switching modes).
 */
import { useRef, useState } from "react";
import { demoDashboardState as d } from "../state/demoDashboardState";
import { demoSmithAiContent } from "../state/demoSmithAi";
import GlobalNav from "../components/GlobalNav";
import DemoBanner from "../components/DemoBanner";
import PageHeader from "../components/PageHeader";
import AskSmithAiPanel from "../components/AskSmithAiPanel";

type RightRailMode = "suggestions" | "ask_smith_ai";

interface Props {
  onExitDemo: () => void;
  onConnectWallet: () => void;
}

export default function DemoDashboardPage({ onExitDemo, onConnectWallet }: Props) {
  const [railMode, setRailMode] = useState<RightRailMode>("suggestions");
  const askButtonRef = useRef<HTMLButtonElement>(null);

  const openAskSmithAi = () => setRailMode("ask_smith_ai");
  const closeAskSmithAi = () => {
    setRailMode("suggestions");
    askButtonRef.current?.focus();
  };

  return (
    <div className="app-shell">
      <DemoBanner banner={d.demo_banner} onExit={onExitDemo} onConnect={onConnectWallet} />

      <GlobalNav
        mode="demo"
        nav={d.global_nav}
        navLabel={d.accessibility.global_nav_label}
        askSmithAiLabel={d.accessibility.ask_smith_ai_label}
        askAvailable={d.smith_ai.available}
        askButtonRef={askButtonRef}
        onOpenAskSmithAi={openAskSmithAi}
      />

      <div className="dashboard">
        <main className="dashboard__main">
          <PageHeader header={d.page_header} />
          {/* Step 3: demo Financial Snapshot, Safety Buffer, charts, alert. */}
        </main>

        {railMode === "ask_smith_ai" ? (
          <AskSmithAiPanel content={demoSmithAiContent} onClose={closeAskSmithAi} />
        ) : (
          <aside className="suggestion-rail" aria-label={d.accessibility.right_rail_label}>
            <div className="suggestion-rail__header">
              <h2 className="suggestion-rail__title">{d.right_rail.title}</h2>
              <p className="suggestion-rail__description">{d.right_rail.description}</p>
            </div>
            {/* Step 3: demo suggestion cards (Top Pick, Jupiter handoff, locked). */}
          </aside>
        )}
      </div>
    </div>
  );
}
