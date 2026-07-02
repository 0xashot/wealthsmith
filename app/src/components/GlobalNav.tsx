/**
 * GlobalNav — renders the wallet-connected variant per components/global-nav.md.
 *
 * Pure renderer: wallet state, nav items, and action visibility all come from
 * page state props. The component decides nothing.
 *
 * Step 2 scope: wallet pill menu (disconnect) and Ask Smith AI panel are NOT
 * wired yet — both render per spec but their click handlers are stubs.
 */
import type { GlobalNavState, WalletState } from "../types/dashboard";
import logoUrl from "../../../assets/logo/wealthsmith-full-lockup.svg";
import phantomIconUrl from "../../../assets/icons/wallet/phantom.svg";

const WALLET_ICONS: Record<string, string> = {
  phantom: phantomIconUrl,
};

interface Props {
  nav: GlobalNavState;
  wallet: WalletState;
  navLabel: string;
  walletPillLabel: string;
  askSmithAiLabel: string;
}

export default function GlobalNav({
  nav,
  wallet,
  navLabel,
  walletPillLabel,
  askSmithAiLabel,
}: Props) {
  const { right_actions } = nav;
  const walletIcon = WALLET_ICONS[wallet.provider_id];

  return (
    <header className="global-nav-wrap">
      <nav className="global-nav" aria-label={navLabel}>
        <a
          className="global-nav__logo"
          href="/dashboard"
          aria-label="Go to WealthSmith dashboard"
        >
          <img
            src={logoUrl}
            alt={nav.logo.alt}
            width={nav.logo.width_px}
            height={nav.logo.height_px}
          />
        </a>

        <ul className="global-nav__items">
          {nav.nav_items.map((item) => (
            <li key={item.id}>
              <a
                className={
                  "global-nav__item" +
                  (item.active ? " global-nav__item--active" : "")
                }
                href={item.href}
                aria-current={item.active ? "page" : undefined}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="global-nav__actions">
          {right_actions.wallet_pill.visible && (
            <button
              type="button"
              className="global-nav__wallet-pill"
              aria-label={walletPillLabel}
              aria-haspopup="menu"
              aria-expanded={false}
              // Wallet menu (Disconnect Wallet) is implemented in a later step.
            >
              {walletIcon && (
                <img src={walletIcon} alt="" width={20} height={20} aria-hidden="true" />
              )}
              <span>{right_actions.wallet_pill.label}</span>
            </button>
          )}
          {right_actions.ask_smith_ai.visible && (
            <button
              type="button"
              className="global-nav__ask-smith"
              aria-label={askSmithAiLabel}
              // Ask Smith AI panel is implemented in a later step.
            >
              {right_actions.ask_smith_ai.label}
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}
