/**
 * DemoHeader — the sticky Demo Mode header (blue "demo mode" banner + Global Nav
 * in demo mode) shared by every Demo page (Dashboard / Portfolio / Goal / Support)
 * so they carry the identical top chrome. The banner is the ONLY thing that marks
 * Demo Mode apart from the connected app; the nav has no wallet pill (there is no
 * real wallet) and offers Ask Smith AI + the in-app page switch.
 */
import { demoDashboardState as d } from "../state/demoDashboardState";
import DemoBanner from "./DemoBanner";
import GlobalNav from "./GlobalNav";

interface Props {
  activePage: string;
  /** Override for pages with no Smith AI content (e.g. Vetting) — no dead trigger. */
  askAvailable?: boolean;
  askButtonRef?: React.RefObject<HTMLButtonElement>;
  askActive?: boolean;
  onExitDemo: () => void;
  onConnectWallet: () => void;
  onNavigate?: (id: string) => void;
  onOpenAskSmithAi?: () => void;
}

export default function DemoHeader({
  activePage,
  askAvailable = d.smith_ai.available,
  askButtonRef,
  askActive,
  onExitDemo,
  onConnectWallet,
  onNavigate,
  onOpenAskSmithAi,
}: Props) {
  return (
    <div className="demo-header">
      <DemoBanner banner={d.demo_banner} onExit={onExitDemo} onConnect={onConnectWallet} />
      <GlobalNav
        mode="demo"
        nav={d.global_nav}
        navLabel={d.accessibility.global_nav_label}
        askSmithAiLabel={d.accessibility.ask_smith_ai_label}
        askAvailable={askAvailable}
        askButtonRef={askButtonRef}
        activePage={activePage}
        onNavigate={onNavigate}
        askActive={askActive}
        onOpenAskSmithAi={onOpenAskSmithAi}
      />
    </div>
  );
}
