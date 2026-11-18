/**
 * Mobile wallet-connect fixtures (MWC).
 *
 * Covers the two mobile contexts the Connect Wallet modal now handles, and pins the
 * third as a known gap. Every user agent below was CAPTURED FROM PRODUCTION ANALYTICS
 * on 2026-11-18 — these are real visitors, not invented strings. That matters: the X
 * in-app UA is the reason the adapter's own iOS check fails, and no hand-written sample
 * would have shown that.
 *
 * Background — zero wallet connections had ever completed in production. The modal
 * treated only readyState `Installed` as connectable, but on iOS Safari the adapters
 * report `Loadable` (there is no extension to detect) and `connect()` is what performs
 * the universal-link redirect. So the deep-link path was never once attempted.
 */
import { readFileSync } from "node:fs";
import type { FixtureCheck } from "./fixtureCheck";
import { detectInAppBrowser, isIosSafariRedirectable } from "../../wallet/walletEnvironment";

/* Captured 2026-11-18 from PostHog `$raw_user_agent` on app.wealthsmith.ai. */
const UA_IOS_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.6.1 Mobile/23G83 Safari/604.1";
const UA_X_IN_APP =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 27_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/24B156 Twitter for iPhone/12.43";
const UA_ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Mobile Safari/537.36";
const UA_DESKTOP_CHROME =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
/* Phantom's own in-app browser — a provider IS injected here and connecting works. */
const UA_PHANTOM_BROWSER =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/23G83 Safari/604.1 Phantom/25.10.0";

export function runMobileWalletConnectFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const readSrc = (rel: string) => { try { return readFileSync(`${process.cwd()}/${rel}`, "utf8"); } catch { return ""; } };
  const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  /* ---- iOS Safari: the redirectable context ---- */
  add("MWC-1: real iOS Safari UA is redirectable — adapters report Loadable there and connect() deep-links",
    isIosSafariRedirectable(UA_IOS_SAFARI), "ios safari redirectable");
  add("MWC-2: desktop Chrome is NOT redirectable — Loadable must stay excluded on desktop, where it is Solflare's web fallback, not an extension",
    !isIosSafariRedirectable(UA_DESKTOP_CHROME), "desktop excluded");
  add("MWC-3: Android Chrome is NOT redirectable — the Phantom adapter's redirect is iOS-only, so Loadable must not be honoured there",
    !isIosSafariRedirectable(UA_ANDROID_CHROME), "android excluded");
  add("MWC-4: the X in-app UA is NOT redirectable — it carries no \"Safari\" token, which is exactly why the adapter refuses to redirect from it",
    !isIosSafariRedirectable(UA_X_IN_APP) && !/safari/i.test(UA_X_IN_APP), "no safari token");
  add("MWC-5: a missing/empty UA is not redirectable (fails closed in SSR and the fixtures runner)",
    !isIosSafariRedirectable(""), "fails closed");

  /* ---- In-app browser detection ---- */
  add("MWC-6: the X in-app browser is detected and labelled \"X\"",
    detectInAppBrowser(UA_X_IN_APP) === "X", `label=${detectInAppBrowser(UA_X_IN_APP)}`);
  add("MWC-7: real iOS Safari is NOT an in-app browser (must keep the working wallet list)",
    detectInAppBrowser(UA_IOS_SAFARI) === null, "safari not in-app");
  add("MWC-8: desktop Chrome is NOT an in-app browser",
    detectInAppBrowser(UA_DESKTOP_CHROME) === null, "desktop not in-app");
  add("MWC-9: Android Chrome is NOT an in-app browser — it is a real browser that simply lacks a supported connect path",
    detectInAppBrowser(UA_ANDROID_CHROME) === null, "android not in-app");
  add("MWC-10: Phantom's OWN in-app browser is never flagged — it injects a provider and connects normally, so blocking it would break the one mobile context that already worked",
    detectInAppBrowser(UA_PHANTOM_BROWSER) === null, "wallet browser exempt");
  add("MWC-11: other embedded webviews are detected (Instagram, Facebook, TikTok, LinkedIn)", (() => {
    const cases: Array<[string, string]> = [
      ["Mozilla/5.0 (iPhone) Instagram 300.0.0.0 (iPhone14,2; iOS 18_7)", "Instagram"],
      ["Mozilla/5.0 (iPhone) [FBAN/FBIOS;FBAV/450.0.0.0]", "Facebook"],
      ["Mozilla/5.0 (Linux; Android 13) musical_ly_32.5.3 TikTok", "TikTok"],
      ["Mozilla/5.0 (iPhone) LinkedInApp/9.30.1", "LinkedIn"],
    ];
    return cases.every(([ua, label]) => detectInAppBrowser(ua) === label);
  })(), "common webviews");
  add("MWC-12: an empty UA is not an in-app browser (no false state in SSR)",
    detectInAppBrowser("") === null, "empty ua");

  /* ---- Wiring: the modal must actually use the above ---- */
  const modal = stripComments(readSrc("src/components/ConnectWalletModal.tsx"));
  add("MWC-13: isDetected accepts Loadable ONLY behind the iOS-Safari gate — never unconditionally, which would regress desktop Solflare", (() => {
    const gatedLoadable = /iosRedirectable && readyState === WalletReadyState\.Loadable/.test(modal);
    const installedStillCounts = /readyState === WalletReadyState\.Installed\) return true/.test(modal);
    // No bare `=== WalletReadyState.Loadable` outside the gated expression.
    const bareLoadable = (modal.match(/WalletReadyState\.Loadable/g) ?? []).length === 1;
    return gatedLoadable && installedStillCounts && bareLoadable;
  })(), "loadable gated to ios");
  add("MWC-14: the gate comes from walletEnvironment, not an inline UA regex in the component", (() => {
    const importsHelpers = /from "\.\.\/wallet\/walletEnvironment"/.test(modal)
      && /isIosSafariRedirectable/.test(modal) && /detectInAppBrowser/.test(modal);
    const noInlineSniff = !/iphone|ipad/i.test(modal.replace(/walletEnvironment/g, ""));
    return importsHelpers && noInlineSniff;
  })(), "detection centralised");
  add("MWC-15: inside an in-app browser the modal renders the In-App Browser state INSTEAD of the wallet list (no rows that cannot succeed)", (() => {
    return /\{inAppBrowser \? \(/.test(modal)
      && /wallet-in-app-browser/.test(modal)
      && /WALLET_IN_APP_BROWSER_TITLE/.test(modal);
  })(), "list replaced");
  add("MWC-16: the in-app state offers Copy Link, NOT a fake \"Open in Safari\" button — a webview cannot reliably escape itself, and a button that silently fails is worse than none", (() => {
    return /WALLET_IN_APP_COPY_LINK/.test(modal) && !/x-safari-https|openInSafari/i.test(modal);
  })(), "copy link only");
  add("MWC-17: the copy action has a clipboard fallback, so it never leaves the button claiming success it did not achieve", (() => {
    return /navigator\.clipboard\.writeText/.test(modal) && /execCommand\("copy"\)/.test(modal) && /if \(ok\) done\(\)/.test(modal);
  })(), "fallback present");
  add("MWC-18: the in-app state keeps initial focus (firstOptionRef moves to the copy button, since no wallet row renders)",
    /ref=\{firstOptionRef\}[\s\S]{0,400}wallet-in-app-browser__action|className="wallet-in-app-browser__action"[\s\S]{0,400}ref=\{firstOptionRef\}/.test(modal)
    || /ref=\{firstOptionRef\}/.test(modal.split("wallet-in-app-browser")[1] ?? ""), "focus preserved");

  /* ---- Known gap, pinned deliberately ---- */
  add("MWC-19: Android remains unsupported and is NOT papered over — WalletProvider auto-registers the Mobile Wallet Adapter but the modal renders a fixed list, so MWA is never surfaced", (() => {
    const fixedList = /const WALLET_OPTIONS = \[/.test(modal) && /WALLET_OPTIONS\.map/.test(modal);
    const noMwa = !/MobileWalletAdapter|SolanaMobileWalletAdapterWalletName/.test(modal);
    return fixedList && noMwa;
  })(), "android gap pinned");

  /* ---- Copy governance ---- */
  add("MWC-20: in-app copy never says \"not detected\" — the wallet is fine, the browser is the problem", (() => {
    const copy = readSrc("src/state/approvedCopy.ts");
    const block = copy.split("WALLET_IN_APP_BROWSER_TITLE")[1]?.split("/* Live Wallet Assets")[0] ?? "";
    return block.length > 0 && !/not detected/i.test(block);
  })(), "no misleading copy");

  return checks;
}
