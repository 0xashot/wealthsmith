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

/** components/smith-ai-initial-loading-state.md — visible + status copy shown with
 *  the first-open Smith AI loading animation (paired copy, per the animation
 *  registry). Calm, non-hype; no live-AI / execution / fund-movement implication. */
export const SMITH_INITIAL_LOADING_LABEL = "Smith AI getting ready";

/**
 * Page-appropriate Ask Smith AI accessible labels. The connected Dashboard
 * fixture's label ("Ask Smith AI about this dashboard") is dashboard-specific,
 * so the other connected pages use their own accurate labels instead of reusing
 * it. Visible button text is unchanged (still "Ask Smith AI"); only the
 * accessible name differs. Dashboard keeps its fixture label; Demo keeps the
 * demo fixture's already demo-aware label.
 */
export const ASK_SMITH_LABEL_PORTFOLIO = "Ask Smith AI about your portfolio";
export const ASK_SMITH_LABEL_GOAL = "Ask Smith AI about your goal settings";
export const ASK_SMITH_LABEL_SUPPORT = "Ask Smith AI about support topics";

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

/* content/wallet-copy.md — Wallet Not Installed / connection-failed / rejected states. */
export const WALLET_NOT_DETECTED_ROW = "Not detected";
export const WALLET_NOT_DETECTED_TITLE = "Wallet not detected";
export const WALLET_NOT_DETECTED_DESC = "Install or open a supported wallet, then try again.";
export const WALLET_CONNECT_FAILED_TITLE = "Wallet connection failed";
export const WALLET_CONNECT_FAILED_DESC =
  "We couldn’t connect to your wallet. Try again or choose another supported wallet.";
export const WALLET_REJECTED_TITLE = "Connection not approved";
export const WALLET_REJECTED_DESC = "You did not approve the connection in your wallet.";
export const WALLET_TRY_AGAIN = "Try Again";

/* Live Wallet Assets — read-only wallet portfolio discovery (patterns/portfolio-overview.md,
 * rules/wallet-and-custody-rules.md). Read-only; no values/APY invented. */
export const LIVE_WALLET_TITLE = "Live Wallet Assets";
export const LIVE_WALLET_DESC =
  "Read-only view of what your connected wallet holds. Balances are read from the blockchain — nothing is moved or signed.";
export const LIVE_WALLET_LOADING = "Reading your wallet…";
export const LIVE_WALLET_ERROR_TITLE = "Couldn’t read your wallet";
export const LIVE_WALLET_ERROR_DESC =
  "We couldn’t read your wallet right now. Try again in a moment.";
export const LIVE_WALLET_EMPTY_TITLE = "No readable assets found";
export const LIVE_WALLET_EMPTY_DESC =
  "This wallet holds no assets we can read yet.";
export const LIVE_WALLET_REFRESH = "Refresh";
export const LIVE_WALLET_NOTE =
  "Read-only wallet view. Amounts are on-chain balances; USD values and APY are sourced from public price/yield feeds where available (else “—”), and no action is taken.";

/* Partial-read warnings + total-failure error (patterns/portfolio-overview.md —
 * Partial Data State / Error States; rules/wallet-and-custody-rules.md — Wallet
 * Error States). Independent reads mean one failure never hides the others. */
export const LIVE_WALLET_WARNING_TOKENS =
  "Token balances couldn’t be read from the current RPC. Native SOL is shown — try refreshing, or set a dedicated Solana RPC to read tokens.";
export const LIVE_WALLET_WARNING_TOKEN2022 =
  "Some Token-2022 assets couldn’t be read from the current RPC.";
export const LIVE_WALLET_ERROR_ALL = "Couldn’t read wallet assets. Try again.";

/* Real Connected Wallet Mode — safe live-data states shown instead of fixture
 * portfolio values when a real wallet is connected (patterns/wallet-connection.md
 * — Data Mode Separation, patterns/dashboard-layout.md — Real Connected Wallet
 * Dashboard, rules/financial-logic-boundaries.md). No fixture values, Top Pick,
 * suggestions, allocation, or USD portfolio value are presented as the user's. */
export const REAL_WALLET_CONNECTED_TITLE = "Wallet connected";
export const REAL_WALLET_CONNECTED_DESC =
  "Live wallet assets are shown below. No funds are moved. WealthSmith is reading wallet data only.";
export const REAL_WALLET_NO_FUNDS_NOTE =
  "No funds are moved. WealthSmith is reading wallet data only.";

/** Wallet summary fact labels (counts / on-chain balances only — not financial logic). */
export const REAL_WALLET_FACT_ASSETS = "Assets detected";
export const REAL_WALLET_FACT_NATIVE_SOL = "Native SOL";
export const REAL_WALLET_FACT_TOKENS = "SPL tokens";
export const REAL_WALLET_FACT_LST = "Staked (LST)";
export const REAL_WALLET_FACT_PROTOCOLS = "Recognized protocols";
export const REAL_WALLET_FACT_NONE = "None detected";

/** Portfolio value: unavailable until pricing exists (no invented USD value). */
export const REAL_WALLET_VALUE_TITLE = "Portfolio Value";
export const REAL_WALLET_VALUE_DESC =
  "Portfolio value needs pricing data before it can be shown.";

/** Suggestions: safe coming-soon state (Suggestion Engine has no live inputs yet). */
export const REAL_WALLET_SUGGESTIONS_TITLE = "Smith AI Suggestions";
export const REAL_WALLET_SUGGESTIONS_DESC =
  "Suggestions are not generated yet for live wallets in this prototype.";

/* ---------- Real Connected Wallet — product layout (live data) ----------
 * The real-wallet Dashboard and Portfolio reuse the SAME product layout as Demo
 * Mode, but every value is a live read-only wallet fact — never a fixture. Where
 * an input (pricing, projection/contribution logic, suggestion inputs) does not
 * exist yet, the SAME card shows a polished "unavailable" state instead of an
 * invented value. No USD value, APY, allocation %, projection, or suggestion is
 * invented (patterns/dashboard-layout.md — Real Connected Wallet Dashboard;
 * patterns/portfolio-overview.md — Real Connected Wallet Mode;
 * rules/financial-logic-boundaries.md). */

/** Unavailable-state copy shown inside product cards when an input is missing. */
export const PRICING_NOT_CONNECTED = "Pricing not connected";
export const ALLOCATION_NEEDS_PRICING = "Value-based allocation needs pricing data.";
export const PROJECTED_GROWTH_NEEDS =
  "Projected Growth needs pricing and contribution logic before it can be shown.";
/* Real-wallet Projected Growth — deterministic estimate + typed unavailable states
 * (rules/financial-logic-boundaries.md — Projected Growth). Modeled assumptions,
 * never expected returns/predictions/guarantees/advice. */
export const PROJECTED_GROWTH_NO_PRICING =
  "Projected Growth needs pricing data before it can be shown.";
export const PROJECTED_GROWTH_NO_CONTRIB =
  "Projected Growth needs a monthly contribution before it can be shown.";
export const PROJECTED_GROWTH_NO_HORIZON =
  "Projected Growth needs a time horizon before it can be shown.";
export const PROJECTED_GROWTH_NO_RISK =
  "Projected Growth needs a risk level before it can be shown.";
export const PROJECTED_GROWTH_ESTIMATE = "Projected Growth is an estimate, not a guarantee.";
export const PROJECTED_GROWTH_PARTIAL =
  "Some holdings aren’t priced yet — this projection covers only your priced assets.";
export const PG_LABEL_STARTING = "Starting value";
export const PG_LABEL_PROJECTED = "Projected value";
export const PG_LABEL_CONTRIBUTIONS = "Total contributions";
export const PG_LABEL_GROWTH = "Estimated growth";
export const PG_MODELED_RETURN_PREFIX = "Modeled annual return";
export const STRATEGY_STEPS_COMING =
  "Strategy Steps will appear after WealthSmith has pricing, portfolio rules, and suggestion inputs connected.";
export const SAFETY_BUFFER_NEEDS = "Safety Buffer needs expense and stablecoin data.";
export const DETECTED_FROM_WALLET = "Detected from your connected wallet.";
export const REAL_WALLET_NONE_DETECTED = "None detected in this wallet.";

/** Financial Snapshot (real wallet) — two hero cards. */
export const FS_TOTAL_VALUE_LABEL = "Total Portfolio Value";
export const FS_TOTAL_VALUE_CAPTION = "Crypto + Stablecoins";
export const FS_NET_CONTRIB_LABEL = "Net Contributions";
export const FS_NET_CONTRIB_DESC = "Net contributions need transaction history.";
/** Shown with a sourced net-contributions estimate. */
export const FS_NET_CONTRIB_ESTIMATE = "Estimated net deposits over the last 12 months";

/** Safety Buffer (real wallet) — stablecoin reserve vs monthly expenses. */
export const SAFETY_BUFFER_CAPTION =
  "Stablecoin reserve covering 1–6 months of expenses before any investment actions.";
export const SAFETY_BUFFER_FUNDED =
  "Fully funded — your stablecoin reserve covers your target.";
export const SAFETY_BUFFER_COVERED_LEGEND = "Covered Buffer";

/** Product section titles (approved product section names — reused live). */
export const DASH_ASSET_MIX_TITLE = "Asset Mix";
export const DASH_ASSET_MIX_CAPTION =
  "Breakdown of detected assets by category. Value-based allocation needs pricing data.";
export const PORT_BALANCE_TITLE = "Balance Overview";
export const PORT_ALLOCATION_TITLE = "Crypto Assets Allocation";
export const PORT_DEPLOYMENT_TITLE = "Assets Deployment Overview";
export const PORT_LIQUID_TITLE = "Liquid Assets";
export const PORT_STAKED_TITLE = "Staked Assets";
export const PORT_YIELD_TITLE = "Yield Strategies";
export const DETECTED_ASSETS_TITLE = "Detected Wallet Assets";

/* Sourced pricing (tokenPrices.ts — DefiLlama primary, Jupiter fallback). USD
 * values come ONLY from these approved feeds, labeled with source + "as of" time;
 * unpriced positions stay "—". Never invented (rules/financial-logic-boundaries.md). */
export const PRICES_AS_OF_PREFIX = "Prices as of";
export const PRICES_SOURCE_NOTE = "Live prices via DefiLlama and Jupiter.";
export const ALLOCATION_BY_VALUE_CAPTION =
  "Allocation by USD value. Excludes positions without a sourced price.";
export const VALUE_EXCLUDES_UNPRICED = "Excludes positions without a sourced price.";
/** Current vs Recommended Allocation — current is live; recommended is unavailable. */
export const ALLOCATION_CURRENT_CAPTION =
  "Your current mix by USD value. A recommended target mix needs your plan's allocation logic.";
export const ALLOCATION_LABEL_CRYPTO = "Crypto";
export const ALLOCATION_LABEL_STABLES = "Stables";
/** Current vs Recommended Allocation — group labels + compare captions. */
export const ALLOCATION_GROUP_CURRENT = "Current";
export const ALLOCATION_GROUP_RECOMMENDED = "Recommended";
export const ALLOCATION_COMPARE_CAPTION =
  "Your live mix vs a risk-based target. Target values apply your saved risk level to your current priced holdings — a modeled target, not advice.";
export const ALLOCATION_NO_RISK =
  "Set your risk level to see a recommended target mix.";
/** Overweight / underweight labels vs the risk-based target (per bucket). */
export const ALLOCATION_DELTA_ON = "On target";
export const ALLOCATION_DELTA_OVER = "Overweight";
export const ALLOCATION_DELTA_UNDER = "Underweight";

/** Additional live-fact / category labels (counts + on-chain balances only). */
export const REAL_WALLET_FACT_STAKE = "Native stake";
export const REAL_WALLET_FACT_PROTOCOL_POSITIONS = "Protocol positions";
export const REAL_WALLET_FACT_STABLES = "Stablecoins";
export const REAL_WALLET_FACT_UNKNOWN = "Unknown tokens";
export const REAL_WALLET_FACT_WALLET_HELD = "Wallet-held assets";

/* ---------- Goal Settings (patterns/goal-settings.md, content) ---------- */

/** patterns/goal-settings.md — page title "Goal" (also global_nav goal item label). */
export const GOAL_PAGE_TITLE = "Goal";

/** patterns/goal-settings.md — Copy Rules / Page Sections (section headings). */
export const GOAL_SECTION_GOAL_RISK = "Goal & Risk Tolerance";
export const GOAL_SECTION_FINANCES = "Finances";
export const GOAL_SECTION_CONTRIBUTION = "Contribution and Timeline";

/** patterns/goal-settings.md — Edit Mode (visible toggle label). */
export const GOAL_EDIT_MODE_LABEL = "Edit Mode";
/** Shown on the disabled Edit Mode toggle (onboarding tour / demo). */
export const GOAL_EDIT_DISABLED_TOOLTIP =
  "Unable to edit your goal during the onboarding or in demo mode.";

/** patterns/goal-settings.md — Field Groups (field labels). */
export const GOAL_FIELD_FINANCIAL_GOAL = "Financial Goal";
export const GOAL_FIELD_RISK = "Risk Tolerance";
export const GOAL_FIELD_INCOME = "Income";
export const GOAL_FIELD_EXPENSES = "Expenses";
export const GOAL_FIELD_SAVING = "Monthly Contribution";
export const GOAL_FIELD_CONTRIBUTION = "Contribution Frequency";
export const GOAL_FIELD_TIMELINE = "Timeline";

/** patterns/goal-settings.md — Copy Rules ("Optional" marker + helper copy). */
export const GOAL_OPTIONAL = "Optional";
export const GOAL_HELPER_INCOME = "Estimate your average monthly income";
export const GOAL_HELPER_EXPENSES = "Estimate your average monthly expenses";
export const GOAL_HELPER_SAVING = "We’ll use this to model your contribution plan";

/** patterns/goal-settings.md — footer actions. */
export const GOAL_SAVE = "Save Changes";
export const GOAL_DISCARD = "Discard Changes";

/** patterns/goal-settings.md — Save Confirmation; also content/empty-error-loading-copy.md + content/ui-copy-rules.md. */
export const GOAL_SAVED_TOAST = "Goal settings saved";

/** Approved prototype-boundary note (Decision C) — visible on the Goal page. */
export const GOAL_PROTOTYPE_NOTE =
  "Saving updates your plan settings here. In this prototype, your Dashboard, " +
  "suggestions, Safety Buffer, and projections are not recalculated.";

/** content/onboarding-copy.md — Field Validation Copy. */
export const GOAL_ERR_REQUIRED_AMOUNT = "Enter an amount to continue.";
export const GOAL_ERR_INVALID_AMOUNT = "Enter a valid amount.";
export const GOAL_ERR_POSITIVE_AMOUNT = "Enter a positive amount.";

/* ---------- Support page (patterns/support-center.md, content/support-faq-content.md) ---------- */

/** patterns/support-center.md — page title / nav label. */
export const SUPPORT_PAGE_TITLE = "Support";

/** patterns/support-center.md — Search Behavior (placeholder) + Accessibility (label). */
export const SUPPORT_SEARCH_PLACEHOLDER = "Search help articles or keywords";
export const SUPPORT_SEARCH_LABEL = "Search support articles";

/** patterns/support-center.md — Empty States (Search No Results). */
export const SUPPORT_NO_RESULT_TITLE = "No help articles found";
export const SUPPORT_NO_RESULT_DESC = "Try another keyword, ask Smith AI, or contact us.";

/* Contact Us modal (patterns/support-center.md — Contact Us Modal + Decisions). */
/** patterns/support-center.md — Contact Us entry point / modal title. */
export const CONTACT_TITLE = "Contact Us";
/** patterns/support-center.md — Contact Us Modal fields + actions. */
export const CONTACT_FIELD_EMAIL = "Your Email";
export const CONTACT_FIELD_DESCRIPTION = "Description";
export const CONTACT_CANCEL = "Cancel";
export const CONTACT_SEND = "Send Message";
/** patterns/support-center.md — Contact Form recommended safety copy. */
export const CONTACT_SAFETY_NOTE = "Do not include seed phrases, private keys, or passwords.";
/** Approved prototype note (Decision A) — visible in the Contact Us modal. */
export const CONTACT_PROTOTYPE_NOTE = "This prototype does not send support messages.";
/** Approved prototype-safe success toast (Decision A — replaces "Message sent"). */
export const CONTACT_SUCCESS_TOAST = "Message saved in this prototype.";
/** patterns/support-center.md — Contact Form Validation copy. */
export const CONTACT_ERR_EMAIL_REQUIRED = "Enter your email so we can reply.";
export const CONTACT_ERR_EMAIL_INVALID = "Enter a valid email address.";
export const CONTACT_ERR_DESC_REQUIRED = "Describe what you need help with.";
/** patterns/support-center.md — Accessibility (modal close button accessible label). */
export const CONTACT_CLOSE_LABEL = "Close Contact Us dialog";

/* ---------- Onboarding (verbatim from content/onboarding-copy.md) ----------
 * Step 1 (disconnected onboarding shell): Welcome + Wallet/Demo entry copy.
 * Option labels for goal fields come from Goal Settings (goalState.ts) per the
 * approved Decision A — not repeated here. Later steps add their own copy. */
/** patterns/onboarding-with-smith-ai.md + dashboard-layout.md — panel heading. */
export const ONBOARDING_PANEL_LABEL = "Onboarding";
/** patterns/onboarding-with-smith-ai.md — Accessibility (progress bar label). */
export const ONBOARDING_PROGRESS_LABEL = "Onboarding progress";
/** onboarding-copy.md — Welcome Step (onboarding.welcome.title). Smith greets first. */
export const ONBOARDING_WELCOME_TITLE =
  "Hi, I’m Smith. I’ll help you set up your WealthSmith plan.";
/** onboarding-copy.md — Welcome Step (onboarding.welcome.description). */
export const ONBOARDING_WELCOME_DESC =
  "Connect your wallet to see wallet-backed portfolio context, or try Demo Mode with sample data.";
/** onboarding-copy.md — Welcome Step (onboarding.welcome.helper). */
export const ONBOARDING_WELCOME_HELPER = "You can update your plan later.";
/** onboarding-copy.md — Welcome Step (Smith AI companion message). */
export const ONBOARDING_WELCOME_COMPANION =
  "Whenever you’re ready, choose how you’d like to start.";
/** onboarding-copy.md — Connected Onboarding Welcome (Chat). Smith acknowledges
 *  the connection safely before the first question — no claim that wallet data
 *  was loaded/analyzed, no claim recommendations already exist. */
export const ONBOARDING_CONNECTED_TITLE = "Great — your wallet is connected.";
export const ONBOARDING_CONNECTED_DESC =
  "Now I’ll ask a few quick questions so WealthSmith can shape your plan around your goals.";
export const ONBOARDING_CONNECTED_COMPANION =
  "It only takes a moment, you stay in control, and nothing is bought, sold, or moved during setup.";
/** onboarding-copy.md — Wallet Entry Step (wallet helper). */
export const ONBOARDING_WALLET_HELPER =
  "WealthSmith reads balances and positions only. Your funds stay in your wallet.";
/** onboarding-copy.md — Wallet Entry Step (demo helper). */
export const ONBOARDING_DEMO_HELPER =
  "Demo Mode uses sample data and does not connect your wallet.";
/** onboarding-copy.md — Wallet Entry Step (security note). */
export const ONBOARDING_SECURITY_NOTE = "Never share your seed phrase or private key.";

/* Connected onboarding preview (wallet connected, goal incomplete) — verbatim
 * from content/onboarding-copy.md (Connected Onboarding Preview). Replaces the
 * disconnected "connect a wallet" copy on the left preview once a wallet is
 * connected; still shows no portfolio values / suggestions / Top Pick. */
export const ONBOARDING_PREVIEW_TITLE = "Finish setting up your plan";
export const ONBOARDING_PREVIEW_DESC =
  "Your wallet is connected. Complete your goal setup to view your WealthSmith dashboard.";
export const ONBOARDING_PREVIEW_METRIC = "Complete goal setup to see this metric.";

/* Conversational typing indicator — verbatim from content/onboarding-copy.md
 * (Typing Indicator Copy) + components/smith-ai-typing-indicator.md. */
export const ONBOARDING_TYPING = "Smith is writing…";
export const ONBOARDING_TYPING_LABEL = "Smith AI is writing.";
/* Chat controls — content/onboarding-copy.md (Chat Controls Copy + Global Labels). */
export const ONBOARDING_SEND = "Send";
export const ONBOARDING_UNDO = "Undo";
export const ONBOARDING_MORE = "More";
export const ONBOARDING_RESTART = "Restart Onboarding";

/* ---- Step 2: goal-setup steps (connected onboarding). Titles/helpers/
 * companion/validation are verbatim from content/onboarding-copy.md. Choice
 * OPTIONS come from Goal Settings (state/goalState.ts, Decision A); the field
 * caption labels below are onboarding presentation only. ---- */
/** onboarding-copy.md — Global Onboarding Labels. */
export const ONBOARDING_CONTINUE = "Continue";
export const ONBOARDING_BACK = "Back";
export const ONBOARDING_SKIP = "Skip for now";

/** Financial Goal step. */
export const ONBOARDING_GOAL_TITLE = "What’s your main goal right now?";
export const ONBOARDING_GOAL_DESC =
  "Choose the answer that feels closest — you can update it later.";
export const ONBOARDING_GOAL_HELPER = "You can update this later.";
export const ONBOARDING_GOAL_COMPANION =
  "This helps WealthSmith frame your plan around what matters most to you.";
export const ONBOARDING_GOAL_LABEL = "Financial Goal";

/** Time Horizon step. */
export const ONBOARDING_HORIZON_TITLE = "How long do you want this plan to look ahead?";
export const ONBOARDING_HORIZON_DESC =
  "This helps WealthSmith frame your plan around your timeline.";
export const ONBOARDING_HORIZON_HELPER =
  "This helps WealthSmith frame your plan around your timeline.";
export const ONBOARDING_HORIZON_COMPANION =
  "Longer timelines and shorter ones can call for different tradeoffs.";
export const ONBOARDING_HORIZON_LABEL = "Time Horizon";

/** Risk Level step. */
export const ONBOARDING_RISK_TITLE = "How much risk are you comfortable with?";
export const ONBOARDING_RISK_DESC =
  "There’s no perfect answer — pick what feels right for you today.";
export const ONBOARDING_RISK_HELPER =
  "There’s no perfect answer. Pick what feels right for your comfort level today.";
export const ONBOARDING_RISK_COMPANION =
  "You can adjust this later if your comfort level changes.";
export const ONBOARDING_RISK_LABEL = "Risk Level";

/** Monthly Income step. */
export const ONBOARDING_INCOME_TITLE = "What’s your monthly income?";
export const ONBOARDING_INCOME_DESC =
  "A rough estimate is fine — this helps show how much room your plan has to work with.";
export const ONBOARDING_INCOME_HELPER =
  "Use your best estimate. You can update it later.";
export const ONBOARDING_INCOME_LABEL = "Monthly Income";
export const ONBOARDING_INCOME_PLACEHOLDER = "4,000";
export const ONBOARDING_INCOME_COMPANION = "You can update it later.";
export const ONBOARDING_INCOME_ERR_MISSING = "Enter your monthly income.";
export const ONBOARDING_INCOME_ERR_INVALID = "Enter a valid monthly income amount.";

/** Monthly Expenses step. */
export const ONBOARDING_EXPENSES_TITLE = "What do you usually spend each month?";
export const ONBOARDING_EXPENSES_DESC =
  "We use this to understand your Safety Buffer before exploring any new ideas.";
export const ONBOARDING_EXPENSES_HELPER =
  "Use an average monthly amount. You can update it later.";
export const ONBOARDING_EXPENSES_LABEL = "Monthly Expenses";
export const ONBOARDING_EXPENSES_PLACEHOLDER = "1,000";
export const ONBOARDING_EXPENSES_COMPANION = "An average month is perfect.";
export const ONBOARDING_EXPENSES_ERR_MISSING = "Enter your monthly expenses.";
export const ONBOARDING_EXPENSES_ERR_INVALID = "Enter a valid monthly expenses amount.";

/** Contribution Rhythm step. */
export const ONBOARDING_CONTRIB_TITLE = "How often do you expect to add money?";
export const ONBOARDING_CONTRIB_DESC =
  "This helps WealthSmith understand your investing rhythm.";
export const ONBOARDING_CONTRIB_HELPER =
  "This helps WealthSmith understand your investing rhythm.";
export const ONBOARDING_CONTRIB_COMPANION =
  "Choose the closest option — it doesn’t set up any automatic deposits.";
export const ONBOARDING_CONTRIB_LABEL = "Contribution Rhythm";

/** Monthly Contribution step (required). */
export const ONBOARDING_SAVING_TITLE = "What’s your monthly contribution?";
export const ONBOARDING_SAVING_DESC = "The amount you plan to invest each month.";
export const ONBOARDING_SAVING_HELPER = "You can update this later.";
export const ONBOARDING_SAVING_LABEL = "Monthly Contribution";
export const ONBOARDING_SAVING_OPTIONAL = "Optional";
export const ONBOARDING_SAVING_PLACEHOLDER = "1,000";
export const ONBOARDING_SAVING_COMPANION =
  "It just helps WealthSmith picture your contributions; nothing is moved or invested automatically.";
export const ONBOARDING_SAVING_ERR_MISSING = "Enter your monthly contribution.";
export const ONBOARDING_SAVING_ERR_INVALID = "Enter a valid monthly contribution amount.";

/** onboarding-copy.md — Field Validation Copy (Negative Amount). */
export const ONBOARDING_ERR_POSITIVE = "Enter a positive amount.";

/* ---- Step 3: Review + Finish. Verbatim from content/onboarding-copy.md
 * (Review Step + Finish / Transition Step). Row labels reuse the step caption
 * constants above (Decision A / user Step-3 field naming). ---- */
export const ONBOARDING_REVIEW_TITLE = "Here’s what I have so far.";
export const ONBOARDING_REVIEW_DESC =
  "Take a look at your answers before I open your dashboard.";
export const ONBOARDING_REVIEW_HELPER = "You can edit any of these later from Goal.";
export const ONBOARDING_REVIEW_COMPANION =
  "You can edit any of these later from Goal settings.";
export const ONBOARDING_FINISH = "Finish Setup";
/** onboarding-copy.md — Finish / Transition Step (Success title), used as the
 *  completion toast. */
export const ONBOARDING_FINISH_TOAST = "Your WealthSmith dashboard is ready";
/** onboarding-copy.md — Finish / Transition Step (completion reassurance helper).
 *  Shown with the completion toast; must not imply funds moved or transactions. */
export const ONBOARDING_FINISH_HELPER =
  "You’ll see your portfolio view next. Nothing has been moved or changed.";
