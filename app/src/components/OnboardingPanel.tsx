/**
 * OnboardingPanel — the persistent Smith AI onboarding companion panel
 * (right zone) per patterns/onboarding-with-smith-ai.md and dashboard-layout.md
 * (Mode 2 / Variant 1). Step 1 scope: the disconnected welcome + wallet/demo
 * entry only. Later steps add the goal-setup questions, review, and finish.
 *
 * Explain-only, non-custodial: all copy is approved (content/onboarding-copy.md);
 * the Smith message is static (no live AI). Connect Wallet opens the existing
 * wallet modal and Try Demo Mode enters the existing Demo Mode — nothing here
 * connects a wallet, signs, moves funds, requests secrets, or invents values.
 */
import OnboardingProgress from "./OnboardingProgress";
import smithSymbolUrl from "../../../assets/logo/wealthsmith-symbol.svg";
import {
  ONBOARDING_PANEL_LABEL,
  ONBOARDING_WELCOME_TITLE,
  ONBOARDING_WELCOME_DESC,
  ONBOARDING_WELCOME_HELPER,
  ONBOARDING_WELCOME_COMPANION,
  ONBOARDING_WALLET_HELPER,
  ONBOARDING_DEMO_HELPER,
  ONBOARDING_SECURITY_NOTE,
  CONNECT_WALLET_LABEL,
  TRY_DEMO_MODE,
} from "../state/approvedCopy";
import { ONBOARDING_TOTAL_STEPS } from "../state/onboardingState";

interface Props {
  /** Opens the existing Connect Wallet modal (App-owned). */
  onConnectWallet: () => void;
  /** Enters the existing Demo Mode (App-owned). */
  onTryDemo: () => void;
}

export default function OnboardingPanel({ onConnectWallet, onTryDemo }: Props) {
  return (
    <aside className="suggestion-rail onboarding-panel" aria-label={ONBOARDING_PANEL_LABEL}>
      <div className="card onboarding-panel__card">
        <h2 className="onboarding-panel__title">{ONBOARDING_PANEL_LABEL}</h2>

        <OnboardingProgress current={1} total={ONBOARDING_TOTAL_STEPS} />

        <div className="onboarding-panel__body">
          <img
            className="onboarding-panel__symbol"
            src={smithSymbolUrl}
            alt=""
            width={40}
            height={40}
            aria-hidden="true"
          />
          <h3 className="onboarding-panel__welcome-title">{ONBOARDING_WELCOME_TITLE}</h3>
          <p className="onboarding-panel__desc">{ONBOARDING_WELCOME_DESC}</p>
          {/* Smith AI companion message region — static, explain-only. */}
          <p className="onboarding-panel__companion" role="status" aria-live="polite">
            {ONBOARDING_WELCOME_COMPANION}
          </p>
          <p className="onboarding-panel__helper">{ONBOARDING_WELCOME_HELPER}</p>
        </div>

        <div className="onboarding-panel__actions">
          <button
            type="button"
            className="goal-btn goal-btn--primary"
            onClick={onConnectWallet}
          >
            {CONNECT_WALLET_LABEL}
          </button>
          <button
            type="button"
            className="goal-btn goal-btn--secondary"
            onClick={onTryDemo}
          >
            {TRY_DEMO_MODE}
          </button>
        </div>

        <p className="onboarding-panel__note">{ONBOARDING_WALLET_HELPER}</p>
        <p className="onboarding-panel__note">{ONBOARDING_DEMO_HELPER}</p>
        <p className="onboarding-panel__security">{ONBOARDING_SECURITY_NOTE}</p>
      </div>
    </aside>
  );
}
