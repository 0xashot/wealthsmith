/**
 * analytics/events — the ONLY vocabulary the app may send to PostHog.
 *
 * The type union below is the privacy boundary. It exists because the alternative —
 * a free-form `capture(name, props)` — relies on everyone remembering the rule forever.
 * Here, an event carrying a balance, an allocation, a goal figure or a wallet address
 * does not compile.
 *
 * NEVER a property value, in any event, for any reason:
 *   · a USD amount, balance, portfolio total or allocation percentage
 *   · income, monthly expenses, savings target, contribution amount
 *   · a token amount
 *   · a wallet address (or anything else base58 and 32+ chars)
 *
 * Counts, categories, durations and enum-like labels only. The question is always
 * "how many / which kind / how long", never "how much".
 *
 * The single exception is `smith_ai_fallback.question`, which is text the user typed.
 * It is collected because it is the most direct statement of what the product failed to
 * explain — and it is treated like a chat transcript: short retention, and never joined
 * to a wallet.
 */

/** Which wallet a visitor chose in the connect modal. */
export type WalletKind = "phantom" | "solflare" | "backpack" | "other";

/**
 * Map a wallet-adapter display name onto a WalletKind. Anything we do not list
 * collapses to "other" rather than leaking an unbounded string into a property.
 * Note a Ledger connected THROUGH Phantom reports as "phantom" — the hardware
 * device is not visible to the adapter, so Ledger has no kind of its own.
 */
export function walletKind(adapterName: string | undefined | null): WalletKind {
  switch ((adapterName ?? "").toLowerCase()) {
    case "phantom":
      return "phantom";
    case "solflare":
      return "solflare";
    case "backpack":
      return "backpack";
    default:
      return "other";
  }
}

/** Why a connection attempt ended. Mirrors the server's sign-in failure modes. */
export type ConnectFailure =
  | "signature_mismatch"
  | "expired"
  | "invalid_request"
  | "invalid_formatting"
  | "user_rejected"
  | "wallet_not_ready"
  | "timeout"
  | "network"
  | "unknown";

/** How completely a read resolved. Mirrors the portfolio completeness vocabulary. */
export type ReadScope = "total" | "partial";

/** Where a visitor left Demo Mode. */
export type DemoExit = "button" | "connected" | "left";

/** Whether a Smith AI message came from a suggested chip or free text. */
export type MessageKind = "chip" | "free_text";

/** Every page both Demo and the connected app expose in the nav. */
export type AppTab =
  | "dashboard"
  | "portfolio"
  | "goal"
  | "support"
  | "strategy_lab"
  | "vetting";

/**
 * Note there are no parallel `demo_*` names for behaviour that exists in both
 * experiences. Every event carries a `surface` property (disconnected | demo |
 * connected), so "what do people do in Demo Mode?" is a filter on these same events.
 * Only entering and leaving Demo are their own events, because those are transitions
 * rather than behaviour.
 */
export type AnalyticsEvent =
  // ── Demo Mode transitions ───────────────────────────────────────────────────
  | { name: "demo_entered" }
  | { name: "demo_exited"; via: DemoExit }

  // ── Behaviour (read with `surface` to split Demo from connected) ─────────────
  | { name: "tab_viewed"; tab: AppTab }
  | { name: "manual_asset_added"; chain: "btc" | "eth" }
  | { name: "smith_ai_opened" }
  | { name: "smith_ai_message"; kind: MessageKind }

  // ── Wallet funnel ───────────────────────────────────────────────────────────
  | { name: "wallet_modal_opened" }
  | { name: "wallet_selected"; wallet: WalletKind }
  /** Live app only — the prototype connects read-only and asks for no signature. */
  | { name: "wallet_signature_requested"; wallet: WalletKind }
  /** `isNewAccount` is only knowable where sign-in runs, so the prototype omits it. */
  | { name: "wallet_connected"; wallet: WalletKind; isNewAccount?: boolean }
  | { name: "wallet_connect_failed"; wallet: WalletKind; reason: ConnectFailure }
  | { name: "wallet_disconnected" }

  // ── Failures the user can see ───────────────────────────────────────────────
  | { name: "portfolio_read_failed"; scope: ReadScope }
  | { name: "smith_ai_fallback"; question: string }
  /** Live app only — the prototype's Smith AI answers from fixtures and cannot be down. */
  | { name: "smith_ai_unavailable" }

  // ── Did it cause anything ───────────────────────────────────────────────────
  | { name: "suggestion_reviewed"; suggestionId: string; category: string }
  | { name: "suggestion_dismissed"; suggestionId: string }
  | { name: "external_handoff_clicked"; provider: string }
  | { name: "goal_saved"; firstTime: boolean };

export type AnalyticsEventName = AnalyticsEvent["name"];
