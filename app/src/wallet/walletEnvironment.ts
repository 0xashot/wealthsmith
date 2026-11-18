/**
 * walletEnvironment — pure, user-agent-derived facts about where the app is running,
 * used by ConnectWalletModal to decide what a wallet row can actually do.
 *
 * Pure string predicates, no `navigator` access and no React: the caller passes the UA,
 * so fixtures exercise real captured user agents instead of mocking a browser.
 *
 * WHY THIS EXISTS — the three mobile contexts behave differently and only one of them
 * worked before:
 *
 *   iOS Safari        The wallet adapters report readyState `Loadable`, NOT `Installed`
 *                     (there is no extension to detect), and `connect()` then redirects
 *                     to the wallet's universal link. The modal used to treat anything
 *                     other than `Installed` as "not detected" and opened the wallet's
 *                     marketing page instead, so the deep link was never once attempted.
 *
 *   In-app browsers   A webview embedded in another app (X, Instagram, …). The adapter
 *                     refuses to redirect here by design: its own iOS check requires
 *                     "safari" in the UA and these webviews omit it. Even if it tried,
 *                     the round trip would usually fail — the host app may tear the
 *                     webview down, losing the pending connection. These users need to
 *                     move to a real browser; there is no in-place fix.
 *
 *   Android           Neither path applies. `WalletProvider` auto-registers the Solana
 *                     Mobile Wallet Adapter, but the modal renders a fixed wallet list
 *                     and never shows it. Out of scope here and still unsupported.
 */

/** Wallet apps whose OWN in-app browser injects a provider — connecting there works
 *  normally, so they must never be treated as a blocked in-app browser. */
const WALLET_BROWSER_SIGNATURE = /phantom|solflare|backpack/i;

/**
 * Host apps whose embedded webview cannot complete a wallet connection.
 * Matched against the raw UA; the label is shown to the user, so it is the app's
 * everyday name rather than its UA token.
 */
const IN_APP_BROWSER_SIGNATURES: ReadonlyArray<readonly [RegExp, string]> = [
  // "Twitter for iPhone/12.43" — still the UA token on X's iOS app.
  [/Twitter for (?:iPhone|iPad|Android)/i, "X"],
  [/FBAN\/|FBAV\/|FB_IAB\//i, "Facebook"],
  [/FBAN\/MessengerForiOS|Messenger(?:LiteFor)?iOS/i, "Messenger"],
  [/Instagram/i, "Instagram"],
  [/LinkedInApp/i, "LinkedIn"],
  [/Snapchat/i, "Snapchat"],
  [/musical_ly|Bytedance|TikTok/i, "TikTok"],
  [/\bLine\//i, "LINE"],
  [/Telegram/i, "Telegram"],
  [/\bDiscord\b/i, "Discord"],
  [/\bReddit\b/i, "Reddit"],
  [/\bPinterest\b/i, "Pinterest"],
  [/\bSlack\b/i, "Slack"],
];

/**
 * True when the wallet adapters will report `Loadable` and `connect()` will redirect to
 * the wallet's universal link.
 *
 * Deliberately mirrors `isIosAndRedirectable()` in @solana/wallet-adapter-base
 * (iPhone/iPad AND "safari" in the UA) so detection and connect never disagree: a row
 * must not invite a tap that the adapter will then refuse. If that upstream check
 * changes, this must change with it.
 */
export function isIosSafariRedirectable(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  const isIos = ua.includes("iphone") || ua.includes("ipad");
  return isIos && ua.includes("safari");
}

/**
 * The host app's display name when running inside its embedded webview, else null.
 *
 * Returns null for wallet apps' own browsers (Phantom, Solflare, Backpack): those inject
 * a provider and connect normally, so flagging them would break the one mobile context
 * that already worked.
 */
export function detectInAppBrowser(userAgent: string): string | null {
  if (!userAgent || WALLET_BROWSER_SIGNATURE.test(userAgent)) return null;
  for (const [pattern, label] of IN_APP_BROWSER_SIGNATURES) {
    if (pattern.test(userAgent)) return label;
  }
  return null;
}

/** The current UA, or "" where there is no navigator (SSR, the Node fixtures runner). */
export function currentUserAgent(): string {
  return typeof navigator !== "undefined" && typeof navigator.userAgent === "string"
    ? navigator.userAgent
    : "";
}

/**
 * The display name `@solana/wallet-adapter-react` gives the auto-registered Solana Mobile
 * Wallet Adapter. Matched by exact name because that is the only handle the hook exposes.
 *
 * `WalletProvider` injects it only when `getEnvironment()` returns MOBILE_WEB: an Android
 * UA, not a WebView, and no extension adapter already `Installed`. So its mere presence in
 * `wallets` is the authoritative "this is Android, in a real browser" signal — better than
 * sniffing the UA ourselves, because it also accounts for the cases the library excludes.
 *
 * Note it reports readyState `Loadable`, never `Installed`, so the iOS-Safari gate in
 * ConnectWalletModal deliberately does not pick it up. Android needs its own branch.
 */
export const MOBILE_WALLET_ADAPTER_NAME = "Mobile Wallet Adapter";

/**
 * Whether a connection is possible here at all, and by what mechanism.
 *
 * Attached to the wallet funnel events. Without it a `wallet_not_ready` failure is
 * unreadable: it cannot distinguish "desktop visitor with no extension installed" from
 * "iPhone visitor we were refusing to deep-link" from "inside X's webview, where nothing
 * can work". Those are three different product problems and they looked identical in the
 * data — which is why zero production connections went undiagnosed for as long as it did.
 */
export type ConnectContext =
  /** A provider is injected: desktop extension, or a wallet app's own in-app browser. */
  | "extension"
  /** iOS Safari: no provider, but connect() redirects to the wallet's universal link. */
  | "ios_deep_link"
  /** Android, real browser: the Solana Mobile Wallet Adapter is available. */
  | "mobile_wallet_adapter"
  /** Inside another app's webview (X, Instagram, …). Nothing can complete here. */
  | "in_app_browser"
  /** None of the above — e.g. a desktop browser with no extension, or iOS in a non-Safari shell. */
  | "unsupported";

/**
 * Resolve the context from facts the modal already holds. Order is deliberate:
 * an injected provider wins over everything (it is what a wallet's own in-app browser
 * looks like), then a blocked webview, then the two mobile mechanisms.
 */
export function resolveConnectContext(input: {
  userAgent: string;
  /** Any approved wallet reporting readyState `Installed`. */
  hasInstalledWallet: boolean;
  /** The Mobile Wallet Adapter is present in `wallets` (Android, real browser). */
  hasMobileWalletAdapter: boolean;
}): ConnectContext {
  if (input.hasInstalledWallet) return "extension";
  if (detectInAppBrowser(input.userAgent) !== null) return "in_app_browser";
  if (input.hasMobileWalletAdapter) return "mobile_wallet_adapter";
  if (isIosSafariRedirectable(input.userAgent)) return "ios_deep_link";
  return "unsupported";
}
