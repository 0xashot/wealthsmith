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

/* ---------- Goal Settings (patterns/goal-settings.md, content) ---------- */

/** patterns/goal-settings.md — page title "Goal" (also global_nav goal item label). */
export const GOAL_PAGE_TITLE = "Goal";

/** patterns/goal-settings.md — Copy Rules / Page Sections (section headings). */
export const GOAL_SECTION_GOAL_RISK = "Goal & Risk Tolerance";
export const GOAL_SECTION_FINANCES = "Finances";
export const GOAL_SECTION_CONTRIBUTION = "Contribution and Timeline";

/** patterns/goal-settings.md — Edit Mode (visible toggle label). */
export const GOAL_EDIT_MODE_LABEL = "Edit Mode";

/** patterns/goal-settings.md — Field Groups (field labels). */
export const GOAL_FIELD_FINANCIAL_GOAL = "Financial Goal";
export const GOAL_FIELD_RISK = "Risk Tolerance";
export const GOAL_FIELD_INCOME = "Income";
export const GOAL_FIELD_EXPENSES = "Expenses";
export const GOAL_FIELD_SAVING = "Monthly Saving Goal";
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
/** onboarding-copy.md — Welcome Step (onboarding.welcome.title). */
export const ONBOARDING_WELCOME_TITLE = "Build your WealthSmith plan";
/** onboarding-copy.md — Welcome Step (onboarding.welcome.description). */
export const ONBOARDING_WELCOME_DESC =
  "Answer a few questions so WealthSmith can personalize your dashboard and suggestions.";
/** onboarding-copy.md — Welcome Step (onboarding.welcome.helper). */
export const ONBOARDING_WELCOME_HELPER = "You can update these settings later.";
/** onboarding-copy.md — Welcome Step (Smith AI companion message). */
export const ONBOARDING_WELCOME_COMPANION =
  "I’ll help you set up your plan step by step. WealthSmith uses these answers to personalize your dashboard and suggestions.";
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

/* ---- Step 2: goal-setup steps (connected onboarding). Titles/helpers/
 * companion/validation are verbatim from content/onboarding-copy.md. Choice
 * OPTIONS come from Goal Settings (state/goalState.ts, Decision A); the field
 * caption labels below are onboarding presentation only. ---- */
/** onboarding-copy.md — Global Onboarding Labels. */
export const ONBOARDING_CONTINUE = "Continue";
export const ONBOARDING_BACK = "Back";
export const ONBOARDING_SKIP = "Skip for now";

/** Financial Goal step. */
export const ONBOARDING_GOAL_TITLE = "What is your financial goal?";
export const ONBOARDING_GOAL_DESC =
  "Choose the goal that best matches what you want WealthSmith to help you plan for.";
export const ONBOARDING_GOAL_HELPER = "You can update this later.";
export const ONBOARDING_GOAL_COMPANION =
  "Your goal helps WealthSmith frame suggestions around what you care about most, like long-term growth, stability, or yield.";
export const ONBOARDING_GOAL_LABEL = "Financial Goal";

/** Time Horizon step. */
export const ONBOARDING_HORIZON_TITLE = "What is your time horizon?";
export const ONBOARDING_HORIZON_DESC = "How long do you expect this plan to run?";
export const ONBOARDING_HORIZON_HELPER =
  "This helps WealthSmith model Projected Growth and prioritize suggestions.";
export const ONBOARDING_HORIZON_COMPANION =
  "Time horizon helps WealthSmith understand whether your plan is short-term or long-term. Longer timelines can usually tolerate different tradeoffs than short timelines.";
export const ONBOARDING_HORIZON_LABEL = "Time Horizon";

/** Risk Level step. */
export const ONBOARDING_RISK_TITLE = "What risk level feels right for this plan?";
export const ONBOARDING_RISK_DESC = "Choose how much volatility you are comfortable with.";
export const ONBOARDING_RISK_HELPER =
  "Risk tolerance helps WealthSmith compare your current portfolio with your target allocation.";
export const ONBOARDING_RISK_COMPANION =
  "Risk tolerance helps WealthSmith understand how much volatility may fit your plan. You can adjust this later if your comfort level changes.";
export const ONBOARDING_RISK_LABEL = "Risk Level";

/** Monthly Income step. */
export const ONBOARDING_INCOME_TITLE = "What is your average monthly income?";
export const ONBOARDING_INCOME_DESC = "Enter your approximate monthly income.";
export const ONBOARDING_INCOME_HELPER =
  "This helps WealthSmith understand your plan inputs. You can update it later.";
export const ONBOARDING_INCOME_LABEL = "Monthly Income";
export const ONBOARDING_INCOME_PLACEHOLDER = "4,000";
export const ONBOARDING_INCOME_COMPANION =
  "Income helps WealthSmith understand your planning context. Use your best estimate; you can update it later.";
export const ONBOARDING_INCOME_ERR_MISSING = "Enter your monthly income.";
export const ONBOARDING_INCOME_ERR_INVALID = "Enter a valid monthly income amount.";

/** Monthly Expenses step. */
export const ONBOARDING_EXPENSES_TITLE = "What are your average monthly expenses?";
export const ONBOARDING_EXPENSES_DESC = "Enter your approximate monthly expenses.";
export const ONBOARDING_EXPENSES_HELPER =
  "This helps WealthSmith calculate your Safety Buffer target.";
export const ONBOARDING_EXPENSES_LABEL = "Monthly Expenses";
export const ONBOARDING_EXPENSES_PLACEHOLDER = "1,000";
export const ONBOARDING_EXPENSES_COMPANION =
  "Expenses help WealthSmith estimate your Safety Buffer target. Use an average monthly amount that feels realistic.";
export const ONBOARDING_EXPENSES_ERR_MISSING = "Enter your monthly expenses.";
export const ONBOARDING_EXPENSES_ERR_INVALID = "Enter a valid monthly expenses amount.";

/** Contribution Rhythm step. */
export const ONBOARDING_CONTRIB_TITLE = "How often do you plan to contribute?";
export const ONBOARDING_CONTRIB_DESC =
  "Choose how often you expect to add funds to this plan.";
export const ONBOARDING_CONTRIB_HELPER =
  "This helps WealthSmith model contributions over time.";
export const ONBOARDING_CONTRIB_COMPANION =
  "Contribution frequency helps WealthSmith model your plan. Choose the closest option; it does not create automatic deposits.";
export const ONBOARDING_CONTRIB_LABEL = "Contribution Rhythm";

/** Monthly Saving Goal step (optional). */
export const ONBOARDING_SAVING_TITLE = "What is your monthly saving goal?";
export const ONBOARDING_SAVING_DESC = "Enter the amount you hope to set aside each month.";
export const ONBOARDING_SAVING_HELPER =
  "This is optional and helps WealthSmith model your contribution plan.";
export const ONBOARDING_SAVING_LABEL = "Monthly Saving Goal";
export const ONBOARDING_SAVING_OPTIONAL = "Optional";
export const ONBOARDING_SAVING_PLACEHOLDER = "1,000";
export const ONBOARDING_SAVING_COMPANION =
  "Monthly Saving Goal is optional. It helps WealthSmith model contributions, but it does not mean WealthSmith will move or invest funds automatically.";
export const ONBOARDING_SAVING_ERR_INVALID =
  "Monthly saving goal must be a positive amount if entered.";

/** onboarding-copy.md — Field Validation Copy (Negative Amount). */
export const ONBOARDING_ERR_POSITIVE = "Enter a positive amount.";

/* ---- Step 3: Review + Finish. Verbatim from content/onboarding-copy.md
 * (Review Step + Finish / Transition Step). Row labels reuse the step caption
 * constants above (Decision A / user Step-3 field naming). ---- */
export const ONBOARDING_REVIEW_TITLE = "Review your plan";
export const ONBOARDING_REVIEW_DESC =
  "Check your answers before WealthSmith prepares your dashboard.";
export const ONBOARDING_REVIEW_HELPER = "You can edit these settings later from Goal.";
export const ONBOARDING_REVIEW_COMPANION =
  "Review your plan inputs before finishing setup. WealthSmith will use saved values to prepare your dashboard and suggestions.";
export const ONBOARDING_FINISH = "Finish Setup";
/** onboarding-copy.md — Finish / Transition Step (Success title), used as the
 *  completion toast (no dedicated finish-toast copy exists; this is the safest
 *  approved completion string). */
export const ONBOARDING_FINISH_TOAST = "Your WealthSmith dashboard is ready";
