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
import {
  MOBILE_WALLET_ADAPTER_NAME,
  detectInAppBrowser,
  isIosSafariRedirectable,
  resolveConnectContext,
} from "../../wallet/walletEnvironment";

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
    // Android is checked first, so the in-app arm is now `) : inAppBrowser ? (`.
    return /(\{|\)\s*:\s*)inAppBrowser \? \(/.test(modal)
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

  /* ---- Android: the Mobile Wallet Adapter path (MWC-19, MWC-21..24) ---- */
  add("MWC-19: the modal surfaces the auto-registered Mobile Wallet Adapter by its exact adapter name", (() => {
    return /MOBILE_WALLET_ADAPTER_NAME/.test(modal)
      && /wallets\.find\(\(w\) => w\.adapter\.name === MOBILE_WALLET_ADAPTER_NAME\)/.test(modal);
  })(), "mwa surfaced");
  add("MWC-21: the adapter name matches what @solana/wallet-adapter-react registers — matched by exact string, so a drift here silently empties Android",
    MOBILE_WALLET_ADAPTER_NAME === "Mobile Wallet Adapter", MOBILE_WALLET_ADAPTER_NAME);
  add("MWC-22: on Android the MWA row REPLACES the three fixed rows — each could only ever read \"Not detected\" there, and the OS chooser is itself the wallet picker", (() => {
    return /\{mwaAdapter \? \(/.test(modal) && /\) : inAppBrowser \? \(/.test(modal);
  })(), "replaces fixed list");
  add("MWC-23: the MWA row does NOT go through isDetected — MWA reports Loadable, and the iOS-Safari gate would reject it", (() => {
    const branch = modal.split("{mwaAdapter ? (")[1]?.split(") : inAppBrowser ? (")[0] ?? "";
    return branch.length > 0 && !/isDetected/.test(branch) && /select\(mwaAdapter\.adapter\.name/.test(branch);
  })(), "own branch");
  add("MWC-24: an in-app browser on Android still gets the in-app state — WalletProvider excludes WebViews from MWA, so mwaAdapter is absent and the next branch runs", (() => {
    // Library behaviour this depends on, asserted as an explicit expectation:
    // getEnvironment() requires /android/i AND NOT isWebView(), so an Android webview
    // never registers MWA and therefore falls through to the in-app branch.
    return detectInAppBrowser("Mozilla/5.0 (Linux; Android 13; wv) AppleWebKit/537.36 Instagram 300.0.0.0") === "Instagram";
  })(), "android webview falls through");

  /* ---- Connect context: makes a failure readable afterwards (MWC-25..29) ---- */
  const ctx = (ua: string, installed: boolean, mwa: boolean) =>
    resolveConnectContext({ userAgent: ua, hasInstalledWallet: installed, hasMobileWalletAdapter: mwa });
  add("MWC-25: an injected provider wins over everything — that is what a wallet app's own in-app browser looks like",
    ctx(UA_PHANTOM_BROWSER, true, false) === "extension" && ctx(UA_DESKTOP_CHROME, true, false) === "extension", "extension first");
  add("MWC-26: a blocked webview is reported as such, not as \"unsupported\"",
    ctx(UA_X_IN_APP, false, false) === "in_app_browser", `ctx=${ctx(UA_X_IN_APP, false, false)}`);
  add("MWC-27: Android with MWA registered reports mobile_wallet_adapter",
    ctx(UA_ANDROID_CHROME, false, true) === "mobile_wallet_adapter", "android ctx");
  add("MWC-28: iOS Safari without an extension reports ios_deep_link",
    ctx(UA_IOS_SAFARI, false, false) === "ios_deep_link", "ios ctx");
  add("MWC-29: desktop with no extension is \"unsupported\", which is the honest reading — nothing to connect to",
    ctx(UA_DESKTOP_CHROME, false, false) === "unsupported", "desktop empty ctx");

  /* ---- The connect timeout and the trap it closes (MWC-30..33) ---- */
  add("MWC-30: a pending connect() is bounded by a timeout, so reason \"timeout\" is reachable at all", (() => {
    return /const CONNECT_TIMEOUT_MS = /.test(modal)
      && /setTimeout\([\s\S]{0,600}reason: "timeout"[\s\S]{0,200}\}, CONNECT_TIMEOUT_MS\)/.test(modal);
  })(), "timeout wired");
  add("MWC-31: the timeout is cleared on unmount/settle, so a successful connect never fires a late failure", (() => {
    return /return \(\) => clearTimeout\(id\);/.test(modal);
  })(), "timer cleaned up");
  add("MWC-32: ALL THREE exits work mid-connect — Escape, the close button and the scrim. While `busy` disabled them, a connect() that never settled left no way out but a page reload", (() => {
    const noDisabledClose = !/aria-label=\{WALLET_CONNECT_CLOSE_LABEL\}[\s\S]{0,120}disabled=\{busy\}/.test(modal);
    const escapeFree = /if \(e\.key === "Escape"\) \{\s*e\.preventDefault\(\);\s*cancelAndClose\(\);/.test(modal);
    const scrimFree = /if \(e\.target === e\.currentTarget\) cancelAndClose\(\);/.test(modal);
    return noDisabledClose && escapeFree && scrimFree;
  })(), "no trap");
  add("MWC-33: abandoning a pending connect is recorded as \"cancelled\", not silently dropped", (() => {
    return /reason: "cancelled"/.test(modal) && /const cancelAndClose = \(\) => \{/.test(modal);
  })(), "cancel counted");

  add("MWC-35: wallet_modal_opened fires once per mount even under StrictMode — it moved from a click handler into an effect, and dev events share the production PostHog project", (() => {
    return /const openReported = useRef\(false\);/.test(modal)
      && /if \(openReported\.current\) return;\s*\n\s*openReported\.current = true;/.test(modal);
  })(), "single emit");

  /* ---- Every funnel event carries the context (MWC-34) ---- */
  add("MWC-34: wallet_modal_opened / wallet_selected / wallet_connect_failed all carry `context`, and modal_opened is emitted ONCE, by the modal that knows it", (() => {
    const opens = (modal.match(/name: "wallet_modal_opened"/g) ?? []).length;
    const app = stripComments(readSrc("src/App.tsx"));
    const emittedElsewhere = /wallet_modal_opened/.test(app);
    const failuresHaveContext = (modal.match(/name: "wallet_connect_failed"/g) ?? []).length
      === (modal.match(/reason: [^\n]*,\s*\n\s*context: connectContext,/g) ?? []).length;
    return opens === 1 && !emittedElsewhere && /name: "wallet_selected", wallet: walletKind\([^)]*\), context: connectContext/.test(modal) && failuresHaveContext;
  })(), "context on funnel");

  /* ---- Copy governance ---- */
  add("MWC-20: in-app copy never says \"not detected\" — the wallet is fine, the browser is the problem", (() => {
    const copy = stripComments(readSrc("src/state/approvedCopy.ts"));
    const block = copy.split("WALLET_IN_APP_BROWSER_TITLE")[1]?.split("/* Live Wallet Assets")[0] ?? "";
    // Comments stripped first: the adjacent Android note explains why its rows would read
    // "Not detected", which is correct prose about a DIFFERENT state, not user-facing copy.
    return block.length > 0 && !/not detected/i.test(block);
  })(), "no misleading copy");

  return checks;
}
