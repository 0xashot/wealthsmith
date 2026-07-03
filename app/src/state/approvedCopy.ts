/**
 * Approved copy used by step 3 interactions.
 *
 * Every string below is quoted verbatim from a design-system source of
 * truth (cited per constant). Nothing here is invented copy — per
 * content/ui-copy-rules.md and README.md ("Do not invent copy if approved
 * copy exists").
 */

/* ---------- Wallet menu (content/wallet-copy.md, checklist §5.4) ---------- */

/** checklists/mvp-implementation-checklist.md §5.4: "Wallet menu may contain Copy Address." */
export const WALLET_MENU_COPY_ADDRESS = "Copy Address";

/** content/wallet-copy.md — Wallet Menu Copy, approved menu item */
export const WALLET_MENU_DISCONNECT = "Disconnect Wallet";

/** content/wallet-copy.md — Wallet Menu Copy, optional wallet menu helper */
export const WALLET_MENU_HELPER = "Your funds stay in your wallet.";

/* ---------- Toasts (components/toast.md examples; fixture copies) ---------- */

/** components/toast.md — approved toast example */
export const TOAST_ADDRESS_COPIED = "Address copied.";

/** components/toast.md — approved toast example */
export const TOAST_COPY_FAILED = "Could not copy address.";

/* ---------- Disconnected dashboard states ---------- */

/** content/wallet-copy.md — Wallet Disconnected Copy, empty state title */
export const DISCONNECTED_TITLE = "No wallet connected";

/** rules/wallet-and-custody-rules.md — Wallet Disconnected State, example empty copy */
export const DISCONNECTED_DESCRIPTION =
  "Connect your wallet to personalize your portfolio and suggestions.";

/** rules/wallet-and-custody-rules.md — same example, second line */
export const DISCONNECTED_HELPER = "Your funds stay in your wallet.";

/** components/global-nav.md / content — approved CTA label */
export const CONNECT_WALLET_LABEL = "Connect Wallet";

/** patterns/dashboard-layout.md — Suggestions empty state */
export const SUGGESTIONS_EMPTY_TITLE = "No suggestions yet";
export const SUGGESTIONS_EMPTY_DESCRIPTION =
  "Complete your plan or connect a wallet to generate personalized suggestions.";

/** components/metric-card.md — Unavailable state example */
export const METRIC_UNAVAILABLE = "Connect a wallet to see this metric.";

/** components/metric-card.md — Missing Values, preferred meaningful empty state */
export const METRIC_NOT_AVAILABLE = "Not available";

/** components/chart.md — Empty State examples */
export const GROWTH_EMPTY = "No projected growth data available.";
export const ALLOCATION_EMPTY = "Connect a wallet to view allocation.";

/* ---------- Smith AI panel (content/smith-ai-copy.md; patterns) ---------- */

/** content/smith-ai-copy.md — Safety Note, approved */
export const SMITH_SAFETY_NOTE = "Smith AI can make mistakes. Check important info.";

/** content/smith-ai-copy.md — uncertainty template with its approved example next step */
export const SMITH_FALLBACK =
  "I don’t have enough product information to answer that confidently. Check the Support page or contact us for help.";

/** patterns/dashboard-layout.md — accessibility example */
export const SMITH_CLOSE_LABEL = "Close Ask Smith AI panel";

/* ---------- Demo Mode (verbatim from demo fixtures / demo-mode-rules.md) ---------- */

/** components/global-nav.md / rules/demo-mode-rules.md — primary CTA */
export const TRY_DEMO_MODE = "Try Demo Mode";

/** dashboard-demo-state.json demo_banner.title (also announcement.md) */
export const DEMO_BANNER_TITLE = "You’re in demo mode.";

/** dashboard-demo-state.json demo_banner.description */
export const DEMO_BANNER_DESCRIPTION =
  "This is a sample portfolio. Connect your wallet to personalize WealthSmith with your real portfolio.";

/** dashboard-demo-state.json demo_banner.actions[0].label */
export const DEMO_BANNER_EXIT = "Exit Demo";

/** dashboard-demo-state.json demo_banner.actions[1].label */
export const DEMO_BANNER_CONNECT = "Connect Wallet";

/** dashboard-demo-state.json demo_banner.accessibility.label */
export const DEMO_BANNER_ARIA = "Demo Mode is active. This is a sample portfolio.";

/** dashboard-demo-state.json state_transitions.exit_demo.copy.toast */
export const DEMO_EXIT_TOAST = "Exited Demo Mode";

/**
 * protocol-jupiter-swap.json toast_after_click.message (same approved string
 * the connected slice uses via state_transitions.open_protocol_handoff).
 */
export const PROTOCOL_OPENED_TOAST = "Opened protocol in a new tab";

/* ---------- Connect Wallet modal (content/wallet-copy.md) ---------- */

/** content/wallet-copy.md — Connect Wallet Modal, modal title (also `wallet.connect.modal_title`). */
export const WALLET_CONNECT_MODAL_TITLE = "Connect Wallet";

/** content/wallet-copy.md — Connect Wallet Modal, intro copy (`wallet.connect.intro`). */
export const WALLET_CONNECT_INTRO = "Choose a wallet to continue.";

/** content/wallet-copy.md — Connect Wallet Modal, safety helper (`wallet.connect.helper`). */
export const WALLET_CONNECT_HELPER =
  "WealthSmith reads balances and positions only. Your funds stay in your wallet.";

/** content/wallet-copy.md — Connect Wallet Modal, security note (`wallet.security.seed_phrase`). */
export const WALLET_CONNECT_SECURITY_NOTE = "Never share your seed phrase or private key.";

/** content/wallet-copy.md — Wallet Connection Loading, button/modal pending (`wallet.loading.connecting`). */
export const WALLET_CONNECTING = "Connecting...";

/** patterns/wallet-connection.md — Modal Accessibility, close button accessible label. */
export const WALLET_CONNECT_CLOSE_LABEL = "Close connect wallet dialog";
