/**
 * GlobalNav — mode-driven top navigation per components/global-nav.md and
 * rules/wallet-and-custody-rules.md. Pure renderer; decides nothing.
 *
 * Right actions by mode:
 * - connected:    wallet pill (menu) + Ask Smith AI
 * - demo:         Ask Smith AI only (no wallet pill; the Connect Wallet CTA
 *                 lives in the demo banner outside the nav)
 * - disconnected: Connect Wallet + Try Demo Mode (no wallet pill)
 *
 * Wallet pill menu (components/menu-popover.md, checklist §5.4): Copy Address
 * + Disconnect Wallet only. Copying and disconnecting are read-only app-state
 * actions — no funds move, no signature, no transaction.
 */
import { useEffect, useRef, useState } from "react";
import type { GlobalNavState, WalletState } from "../types/dashboard";
import {
  CONNECT_WALLET_LABEL,
  TRY_DEMO_MODE,
  WALLET_MENU_COPY_ADDRESS,
  WALLET_MENU_DISCONNECT,
  WALLET_MENU_HELPER,
} from "../state/approvedCopy";
import logoUrl from "../../../assets/logo/wealthsmith-full-lockup.svg";
import phantomIconUrl from "../../../assets/icons/wallet/phantom.svg";

const WALLET_ICONS: Record<string, string> = {
  phantom: phantomIconUrl,
};

export type NavMode = "connected" | "demo" | "disconnected";

interface Props {
  mode: NavMode;
  nav: GlobalNavState;
  navLabel: string;
  askSmithAiLabel: string;
  askAvailable: boolean;
  /** connected only */
  wallet?: WalletState;
  walletPillLabel?: string;
  askButtonRef?: React.RefObject<HTMLButtonElement>;
  /** Active page id ("dashboard" | "portfolio"); when set, overrides the
   *  fixture's per-item active flag. */
  activePage?: string;
  /** In-app page switch (connected only). Dashboard/Portfolio navigate; other
   *  items are no-ops. When undefined, no nav item navigates. */
  onNavigate?: (id: string) => void;
  onCopyAddress?: () => void;
  onDisconnect?: () => void;
  onConnectWallet?: () => void;
  onTryDemo?: () => void;
  onOpenAskSmithAi?: () => void;
}

export default function GlobalNav({
  mode,
  nav,
  navLabel,
  askSmithAiLabel,
  askAvailable,
  wallet,
  walletPillLabel,
  askButtonRef,
  activePage,
  onNavigate,
  onCopyAddress,
  onDisconnect,
  onConnectWallet,
  onTryDemo,
  onOpenAskSmithAi,
}: Props) {
  const showWalletPill = mode === "connected" && !!wallet?.show_wallet_pill;
  const showAskSmithAi = (mode === "connected" || mode === "demo") && askAvailable;
  const showConnectWallet = mode === "disconnected";
  const showTryDemo = mode === "disconnected";
  const walletIcon = wallet ? WALLET_ICONS[wallet.provider_id] : undefined;

  const [menuOpen, setMenuOpen] = useState(false);
  const pillRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (menuOpen) {
      menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
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
          {nav.nav_items.map((item) => {
            const isActive = activePage ? item.id === activePage : item.active;
            const navigable =
              !!onNavigate &&
              (item.id === "dashboard" ||
                item.id === "portfolio" ||
                item.id === "goal" ||
                item.id === "support");
            return (
              <li key={item.id}>
                <a
                  className={
                    "global-nav__item" + (isActive ? " global-nav__item--active" : "")
                  }
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  onClick={(e) => {
                    // SPA: never trigger a real browser navigation. Only the
                    // in-scope Dashboard/Portfolio items switch pages; Goal /
                    // Support (and demo/disconnected) are safe no-ops.
                    e.preventDefault();
                    if (navigable) onNavigate!(item.id);
                  }}
                >
                  {item.label}
                </a>
              </li>
            );
          })}
        </ul>

        <div className="global-nav__actions">
          {showWalletPill && wallet && (
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
                <span>{nav.right_actions.wallet_pill.label}</span>
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
                        onCopyAddress?.();
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
                      onDisconnect?.();
                    }}
                  >
                    {WALLET_MENU_DISCONNECT}
                  </button>
                  <p className="wallet-menu__helper">{WALLET_MENU_HELPER}</p>
                </div>
              )}
            </div>
          )}
          {showTryDemo && (
            <button
              type="button"
              className="global-nav__try-demo"
              onClick={onTryDemo}
            >
              {TRY_DEMO_MODE}
            </button>
          )}
          {showConnectWallet && (
            <button
              type="button"
              className="global-nav__connect"
              onClick={onConnectWallet}
            >
              {CONNECT_WALLET_LABEL}
            </button>
          )}
          {showAskSmithAi && (
            <button
              ref={askButtonRef}
              type="button"
              className="global-nav__ask-smith"
              aria-label={askSmithAiLabel}
              onClick={onOpenAskSmithAi}
            >
              {nav.right_actions.ask_smith_ai.label}
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}
