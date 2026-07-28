/**
 * SupportPage — Support Center per patterns/support-center.md. Available in every
 * non-demo mode: connected (wallet pill) and disconnected / mid-onboarding
 * (Connect Wallet + Try Demo Mode nav; FAQ + Contact Us need no wallet). The
 * `mode` prop drives the nav; Portfolio/Goal stay gated while `onboardingActive`.
 *
 * Renders canonical FAQ content (state/supportFaq.ts) in accessible accordions
 * with local FAQ search, a local-stub Contact Us modal, and a FAQ-backed Ask
 * Smith AI panel. Canonical FAQ content is the source of truth; the UI never
 * invents answers, policy, pricing, or wallet/protocol support.
 *
 * Non-custodial / MVP-safe: no real ticket submission, no email, no network, no
 * live data, no live AI, no wallet signature, no transaction, no fund movement,
 * and never asks for wallet secrets. Reuses the connected Dashboard state
 * (Phantom • 6fQ9) for the Global Nav pill.
 */
import { useEffect, useRef, useState } from "react";
import { dashboardState as connected } from "../state/dashboardState";
import { supportSmithAiContent } from "../state/supportSmithAi";
import { filterFaq } from "../state/supportFaq";
import {
  SUPPORT_PAGE_TITLE,
  SUPPORT_SEARCH_PLACEHOLDER,
  SUPPORT_SEARCH_LABEL,
  SUPPORT_NO_RESULT_TITLE,
  SUPPORT_NO_RESULT_DESC,
  SUPPORT_HELP_CTA_TITLE,
  SUPPORT_HELP_CTA_DESC,
  CONTACT_TITLE,
  CONTACT_SUCCESS_TOAST,
  ASK_SMITH_LABEL_SUPPORT,
} from "../state/approvedCopy";
import GlobalNav from "../components/GlobalNav";
import DemoHeader from "../components/DemoHeader";
import PageHeader from "../components/PageHeader";
import Accordion from "../components/Accordion";
import ContactUsModal from "../components/ContactUsModal";
import AskSmithAiPanel from "../components/AskSmithAiPanel";

interface Props {
  pushToast: (message: string, helper?: string) => void;
  onNavigate: (id: string) => void;
  onDisconnect: () => void;
  /** "connected" (wallet pill), "disconnected" (Connect Wallet / Try Demo), or
   *  "demo" (blue demo banner + demo nav). */
  mode?: "connected" | "disconnected" | "demo";
  /** While onboarding/disconnected, Portfolio & Goal stay gated in the nav. */
  onboardingActive?: boolean;
  onConnectWallet?: () => void;
  onTryDemo?: () => void;
  /** Demo Mode only: exit back to the disconnected app. */
  onExitDemo?: () => void;
}

export default function SupportPage({
  pushToast,
  onNavigate,
  onDisconnect,
  mode = "connected",
  onboardingActive,
  onConnectWallet,
  onTryDemo,
  onExitDemo,
}: Props) {
  const isConnected = mode === "connected";
  const isDemo = mode === "demo";
  const [query, setQuery] = useState("");
  const [contactOpen, setContactOpen] = useState(false);
  const [smithOpen, setSmithOpen] = useState(false);
  const askButtonRef = useRef<HTMLButtonElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const contactTriggerRef = useRef<HTMLElement | null>(null);

  // Take the page out of the a11y tree / tab order while the Contact modal is
  // open; on close, restore focus to the trigger (after inert is cleared).
  useEffect(() => {
    if (bgRef.current) bgRef.current.inert = contactOpen;
    if (!contactOpen && contactTriggerRef.current) {
      contactTriggerRef.current.focus?.();
      contactTriggerRef.current = null;
    }
  }, [contactOpen]);

  const openAskSmithAi = () => setSmithOpen(true);
  const closeAskSmithAi = () => {
    setSmithOpen(false);
    askButtonRef.current?.focus();
  };

  const openContact = () => {
    contactTriggerRef.current = document.activeElement as HTMLElement | null;
    setContactOpen(true);
  };
  const closeContact = () => setContactOpen(false);
  // Local-stub submit: no send, no network — just the approved prototype toast.
  const submitContact = () => {
    setContactOpen(false);
    pushToast(CONTACT_SUCCESS_TOAST);
  };

  const results = filterFaq(query);
  const noResults = query.trim() !== "" && results.length === 0;

  return (
    <div className="app-shell">
      <div ref={bgRef}>
        {isDemo ? (
          <DemoHeader
            activePage="support"
            askButtonRef={askButtonRef}
            askActive={smithOpen}
            onExitDemo={onExitDemo ?? (() => {})}
            onConnectWallet={onConnectWallet ?? (() => {})}
            onNavigate={onNavigate}
            onOpenAskSmithAi={openAskSmithAi}
          />
        ) : (
          <GlobalNav
            mode={mode}
            nav={connected.global_nav}
            wallet={isConnected ? connected.wallet : undefined}
            navLabel={connected.accessibility.global_nav_label}
            walletPillLabel={isConnected ? connected.accessibility.wallet_pill_label : undefined}
            askSmithAiLabel={ASK_SMITH_LABEL_SUPPORT}
            askAvailable={true}
            askButtonRef={askButtonRef}
            activePage="support"
            onboardingActive={onboardingActive}
            onNavigate={onNavigate}
            onDisconnect={onDisconnect}
            onConnectWallet={onConnectWallet}
            onTryDemo={onTryDemo}
            askActive={smithOpen}
            onOpenAskSmithAi={openAskSmithAi}
          />
        )}

        <div className={"dashboard support-dashboard" + (smithOpen ? "" : " dashboard--single")}>
          <main className="dashboard__main support-main">
            <PageHeader header={{ title: SUPPORT_PAGE_TITLE }} />

            <input
              type="search"
              className="goal-input support-search"
              aria-label={SUPPORT_SEARCH_LABEL}
              placeholder={SUPPORT_SEARCH_PLACEHOLDER}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            {noResults ? (
              <section className="card support-no-result" aria-labelledby="support-no-result-title">
                <h2 id="support-no-result-title" className="card__title">
                  {SUPPORT_NO_RESULT_TITLE}
                </h2>
                <p className="card__caption">{SUPPORT_NO_RESULT_DESC}</p>
              </section>
            ) : (
              results.map((cat) => (
                <section key={cat.id} className="support-category" aria-labelledby={`support-cat-${cat.id}`}>
                  <h2 id={`support-cat-${cat.id}`} className="support-category__title">
                    {cat.title}
                  </h2>
                  <Accordion items={cat.items} />
                </section>
              ))
            )}

            {/* "Still need help?" contact CTA — stays available even when search returns no results. */}
            <section className="support-help-cta" aria-labelledby="support-help-cta-title">
              <h2 id="support-help-cta-title" className="support-help-cta__title">
                {SUPPORT_HELP_CTA_TITLE}
              </h2>
              <p className="support-help-cta__desc">{SUPPORT_HELP_CTA_DESC}</p>
              <button type="button" className="goal-btn goal-btn--primary" onClick={openContact}>
                {CONTACT_TITLE}
              </button>
            </section>
          </main>

          {smithOpen && (
            <AskSmithAiPanel
              content={supportSmithAiContent}
              onClose={closeAskSmithAi}
              pushToast={pushToast}
            />
          )}
        </div>
      </div>

      {contactOpen && <ContactUsModal onClose={closeContact} onSubmit={submitContact} />}
    </div>
  );
}
