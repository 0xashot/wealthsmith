/**
 * GlobalNav — renders wallet-connected / disconnected variants per
 * components/global-nav.md and rules/wallet-and-custody-rules.md.
 *
 * Pure renderer: wallet state, nav items, and action visibility all come
 * from page state props. The component decides nothing.
 *
 * Wallet pill menu (components/menu-popover.md, checklist §5.4):
 * - Items: Copy Address (address is available in state) and Disconnect
 *   Wallet only. No Transfer Funds / Export Key / Recover Wallet.
 * - Copying and disconnecting are read-only app-state actions: no funds
 *   move, no signature is requested, no transaction exists.
 * - Keyboard: Escape closes and refocuses the pill, arrows move between
 *   items, outside click closes.
 */
import { useEffect, useRef, useState } from "react";
import type { GlobalNavState, WalletState } from "../types/dashboard";
import {
  CONNECT_WALLET_LABEL,
  WALLET_MENU_COPY_ADDRESS,
  WALLET_MENU_DISCONNECT,
  WALLET_MENU_HELPER,
} from "../state/approvedCopy";
import logoUrl from "../../../assets/logo/wealthsmith-full-lockup.svg";
import phantomIconUrl from "../../../assets/icons/wallet/phantom.svg";

const WALLET_ICONS: Record<string, string> = {
  phantom: phantomIconUrl,
};

interface Props {
  nav: GlobalNavState;
  wallet: WalletState;
  connected: boolean;
  navLabel: string;
  walletPillLabel: string;
  askSmithAiLabel: string;
  askButtonRef: React.RefObject<HTMLButtonElement>;
  onCopyAddress: () => void;
  onDisconnect: () => void;
  onConnectWallet: () => void;
  onOpenAskSmithAi: () => void;
}

export default function GlobalNav({
  nav,
  wallet,
  connected,
  navLabel,
  walletPillLabel,
  askSmithAiLabel,
  askButtonRef,
  onCopyAddress,
  onDisconnect,
  onConnectWallet,
  onOpenAskSmithAi,
}: Props) {
  const { right_actions } = nav;
  const walletIcon = WALLET_ICONS[wallet.provider_id];

  const [menuOpen, setMenuOpen] = useState(false);
  const pillRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // outside click closes the menu (components/menu-popover.md)
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (
        !menuRef.current?.contains(e.target as Node) &&
        !pillRef.current?.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  // focus first menu item on open
  useEffect(() => {
    if (menuOpen) {
      menuRef.current
        ?.querySelector<HTMLButtonElement>('[role="menuitem"]')
        ?.focus();
    }
  }, [menuOpen]);

  const closeMenu = (refocusPill: boolean) => {
    setMenuOpen(false);
    if (refocusPill) pillRef.current?.focus();
  };

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeMenu(true);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const items = [
        ...(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []),
      ];
      if (items.length === 0) return;
      const idx = items.indexOf(document.activeElement as HTMLButtonElement);
      const next =
        e.key === "ArrowDown"
          ? items[(idx + 1) % items.length]
          : items[(idx - 1 + items.length) % items.length];
      next.focus();
    }
  };

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
          {connected && right_actions.wallet_pill.visible && (
            <div className="global-nav__wallet" onKeyDown={onMenuKeyDown}>
              <button
                ref={pillRef}
                type="button"
                className="global-nav__wallet-pill"
                aria-label={walletPillLabel}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
              >
                {walletIcon && (
                  <img src={walletIcon} alt="" width={20} height={20} aria-hidden="true" />
                )}
                <span>{right_actions.wallet_pill.label}</span>
              </button>
              {menuOpen && (
                <div ref={menuRef} className="wallet-menu" role="menu">
                  {wallet.address && (
                    <button
                      type="button"
                      role="menuitem"
                      className="wallet-menu__item"
                      onClick={() => {
                        closeMenu(true);
                        onCopyAddress();
                      }}
                    >
                      {WALLET_MENU_COPY_ADDRESS}
                    </button>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    className="wallet-menu__item wallet-menu__item--destructive"
                    onClick={() => {
                      closeMenu(false);
                      onDisconnect();
                    }}
                  >
                    {WALLET_MENU_DISCONNECT}
                  </button>
                  <p className="wallet-menu__helper">{WALLET_MENU_HELPER}</p>
                </div>
              )}
            </div>
          )}
          {!connected && (
            <button
              type="button"
              className="global-nav__connect"
              onClick={onConnectWallet}
            >
              {CONNECT_WALLET_LABEL}
            </button>
          )}
          {connected && right_actions.ask_smith_ai.visible && (
            <button
              ref={askButtonRef}
              type="button"
              className="global-nav__ask-smith"
              aria-label={askSmithAiLabel}
              onClick={onOpenAskSmithAi}
            >
              {right_actions.ask_smith_ai.label}
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}
