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
  CONNECT_WALLET_SHORT,
  TRY_DEMO_MODE,
  TRY_DEMO_MODE_SHORT,
  WALLET_MENU_DISCONNECT,
  NAV_DISABLED_TOOLTIP,
  NAV_MENU_OPEN,
} from "../state/approvedCopy";
import { useWalletDisplay } from "../wallet/useWalletDisplay";
import ButtonIcon from "./ButtonIcon";
import NavDrawer, { type NavDrawerItem } from "./NavDrawer";
import logoUrl from "../../../assets/logo/wealthsmith-full-lockup.svg";
import symbolUrl from "../../../assets/logo/wealthsmith-symbol.svg";
import menuUrl from "../../../assets/icons/ui/menu.svg";
import sparcleUrl from "../../../assets/icons/ui/sparcle.svg";
import phantomIconUrl from "../../../assets/icons/wallet/phantom.svg";
import solflareIconUrl from "../../../assets/icons/wallet/solflare.svg";
import backpackIconUrl from "../../../assets/icons/wallet/backpack.svg";

const WALLET_ICONS: Record<string, string> = {
  phantom: phantomIconUrl,
  solflare: solflareIconUrl,
  backpack: backpackIconUrl,
};

export type NavMode = "connected" | "demo" | "disconnected";

interface Props {
  mode: NavMode;
  nav: GlobalNavState;
  navLabel: string;
  askSmithAiLabel: string;
  askAvailable: boolean;
  /** True while the Ask Smith AI panel is open → the trigger shows an active state. */
  askActive?: boolean;
  /** connected only */
  wallet?: WalletState;
  walletPillLabel?: string;
  askButtonRef?: React.RefObject<HTMLButtonElement>;
  /** Active page id ("dashboard" | "portfolio"); when set, overrides the
   *  fixture's per-item active flag. */
  activePage?: string;
  /** While onboarding is active, Portfolio/Goal/Support are disabled (Dashboard
   *  stays active) and are not reachable — patterns/dashboard-layout.md
   *  Variants 1 & 4. */
  onboardingActive?: boolean;
  /** In-app page switch (connected only). Dashboard/Portfolio navigate; other
   *  items are no-ops. When undefined, no nav item navigates. */
  onNavigate?: (id: string) => void;
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
  askActive,
  wallet,
  walletPillLabel,
  askButtonRef,
  activePage,
  onboardingActive,
  onNavigate,
  onDisconnect,
  onConnectWallet,
  onTryDemo,
  onOpenAskSmithAi,
}: Props) {
  const showWalletPill = mode === "connected" && !!wallet?.show_wallet_pill;
  const showAskSmithAi = (mode === "connected" || mode === "demo") && askAvailable;
  const showConnectWallet = mode === "disconnected";
  const showTryDemo = mode === "disconnected";

  // Real connected wallet (name + shortened publicKey). When connected it drives
  // the pill label/icon/address; the fixture `wallet` prop only provides the
  // show_wallet_pill flag + structure. Read-only — no signing, no fetching.
  const realWallet = useWalletDisplay();
  const pillIcon =
    WALLET_ICONS[realWallet?.providerId ?? wallet?.provider_id ?? ""] ?? undefined;
  const pillLabel = realWallet?.label ?? nav.right_actions.wallet_pill.label;
  // Mobile pill drops the provider name and shows only the last-4 address.
  const pillShortLabel = realWallet?.addressShort ?? pillLabel;
  const pillAccessibleLabel = realWallet
    ? `Connected wallet: ${realWallet.name}, address ending ${realWallet.addressShort}. Open wallet menu.`
    : walletPillLabel;

  const [menuOpen, setMenuOpen] = useState(false);
  // Mobile nav drawer (<1280px). The trigger is CSS-hidden on desktop, so this
  // never opens there — the desktop bar renders its items inline, unchanged.
  const [navDrawerOpen, setNavDrawerOpen] = useState(false);

  // Per-item active / disabled / navigable state — shared by the desktop inline
  // items and the mobile drawer so both read identically.
  const itemState = (item: { id: string; active: boolean }) => {
    const isActive = activePage ? item.id === activePage : item.active;
    const disabled =
      !!onboardingActive && item.id !== "dashboard" && item.id !== "support" && !isActive;
    const navigable =
      !disabled &&
      !!onNavigate &&
      (item.id === "dashboard" ||
        item.id === "portfolio" ||
        item.id === "goal" ||
        item.id === "support");
    return { isActive, disabled, navigable };
  };
  // Mobile drawer: unavailable items (Portfolio/Goal during onboarding) are hidden
  // rather than shown disabled — the desktop bar still greys them (unchanged).
  const drawerItems: NavDrawerItem[] = nav.nav_items
    .map((item) => {
      const { isActive, disabled, navigable } = itemState(item);
      return { id: item.id, label: item.label, href: item.href, active: isActive, disabled, navigable };
    })
    .filter((d) => !d.disabled);
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
        {/* Mobile-only hamburger (CSS-hidden on desktop) → opens the nav drawer. */}
        <button
          type="button"
          className="global-nav__menu-btn"
          aria-label={NAV_MENU_OPEN}
          aria-haspopup="dialog"
          aria-expanded={navDrawerOpen}
          onClick={() => setNavDrawerOpen(true)}
        >
          <ButtonIcon src={menuUrl} size={24} />
        </button>

        <a
          className="global-nav__logo"
          href="/dashboard"
          aria-label="Go to WealthSmith dashboard"
        >
          {/* Full lockup on desktop; symbol only on mobile (toggled in mobile.css). */}
          <img
            className="global-nav__logo-full"
            src={logoUrl}
            alt={nav.logo.alt}
            width={nav.logo.width_px}
            height={nav.logo.height_px}
          />
          <img
            className="global-nav__logo-symbol"
            src={symbolUrl}
            alt=""
            aria-hidden="true"
            width={32}
            height={32}
          />
        </a>

        <ul className="global-nav__items">
          {nav.nav_items.map((item) => {
            // Shared with the mobile drawer. Onboarding keeps Dashboard + Support
            // enabled; Portfolio/Goal (wallet-specific) are disabled except the
            // active tour tab; Support is always reachable.
            const { isActive, disabled, navigable } = itemState(item);
            return (
              <li key={item.id}>
                <a
                  className={
                    "global-nav__item" +
                    (isActive ? " global-nav__item--active" : "") +
                    (disabled ? " global-nav__item--disabled" : "")
                  }
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  aria-disabled={disabled ? true : undefined}
                  data-tooltip={disabled ? NAV_DISABLED_TOOLTIP : undefined}
                  tabIndex={disabled ? -1 : undefined}
                  onClick={(e) => {
                    // SPA: never trigger a real browser navigation. Only the
                    // in-scope Dashboard/Portfolio items switch pages; Goal /
                    // Support (and demo/disconnected) are safe no-ops. Disabled
                    // onboarding items never navigate.
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
                aria-label={pillAccessibleLabel}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
              >
                {pillIcon && (
                  <img src={pillIcon} alt="" width={20} height={20} aria-hidden="true" />
                )}
                {/* Full "{provider} • {last4}" on desktop; last-4 only on mobile. */}
                <span className="global-nav__wallet-pill-full">{pillLabel}</span>
                <span className="global-nav__wallet-pill-short">{pillShortLabel}</span>
              </button>
              {menuOpen && (
                <div ref={menuRef} className="wallet-menu" role="menu">
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
              {/* Full label on desktop; short "Demo" on mobile (toggled in mobile.css). */}
              <span className="global-nav__cta-full">{TRY_DEMO_MODE}</span>
              <span className="global-nav__cta-short">{TRY_DEMO_MODE_SHORT}</span>
            </button>
          )}
          {showConnectWallet && (
            <button
              type="button"
              className="global-nav__connect"
              onClick={onConnectWallet}
            >
              <span className="global-nav__cta-full">{CONNECT_WALLET_LABEL}</span>
              <span className="global-nav__cta-short">{CONNECT_WALLET_SHORT}</span>
            </button>
          )}
          {showAskSmithAi && (
            <button
              ref={askButtonRef}
              type="button"
              className={
                "global-nav__ask-smith" +
                (askActive ? " global-nav__ask-smith--active" : "")
              }
              aria-label={askSmithAiLabel}
              aria-pressed={askActive}
              onClick={onOpenAskSmithAi}
            >
              <ButtonIcon src={sparcleUrl} size={16} />
              {/* Text label hidden on mobile (icon-only) via mobile.css. */}
              <span className="global-nav__ask-smith-label">
                {nav.right_actions.ask_smith_ai.label}
              </span>
            </button>
          )}
        </div>
      </nav>

      {/* Mobile-only slide-in nav drawer (portaled; opens only when the hamburger,
          which is CSS-hidden on desktop, is tapped). */}
      {navDrawerOpen && (
        <NavDrawer
          navLabel={navLabel}
          items={drawerItems}
          onNavigate={onNavigate}
          onClose={() => setNavDrawerOpen(false)}
        />
      )}
    </header>
  );
}
