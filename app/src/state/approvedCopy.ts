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

/* Suggestion Engine copy (content/suggestion-card-copy.md) — approved template
 * strings resolved from the engine's title_key / description_key. The engine
 * emits KEYS only; this map is for the card copy mapper (later step). */
export const SUGGESTION_BUFFER_TITLE = "Top Up Your Safety Buffer";
export const SUGGESTION_BUFFER_DESCRIPTION =
  "Your stablecoin reserve is below target. Add funds to fully cover your Safety Buffer before investing further.";
/* Step 21C — canonical Safety Buffer state copy. Honest, review-only, and never treats unresolved value as zero,
 * never presents a plan amount as the total gap, and never implies immediate transfer capability. */
export const SUGGESTION_BUFFER_RANGE_DESCRIPTION =
  "Your stablecoin reserve is below target. Additional stablecoin value is still being verified and may reduce the remaining gap.";
export const SUGGESTION_BUFFER_PLAN_DESCRIPTION =
  "Part of your next contribution is allocated to your Safety Buffer. The confirmed gap after this contribution is shown separately.";
export const SUGGESTION_BUFFER_NEARLY_FUNDED_TITLE = "Safety Buffer Is Nearly Funded";
export const SUGGESTION_BUFFER_NEARLY_FUNDED_DESCRIPTION =
  "The remaining gap is below the current action threshold.";
export const SUGGESTION_BUFFER_UNRESOLVED_TITLE = "Verify Your Safety Buffer";
export const SUGGESTION_BUFFER_UNRESOLVED_DESCRIPTION =
  "Some stablecoin value has not yet been verified as available, so your exact Safety Buffer gap is still unknown.";
export const SUGGESTION_BUFFER_TARGET_UNAVAILABLE_TITLE = "Complete Safety Buffer Setup";
export const SUGGESTION_BUFFER_TARGET_UNAVAILABLE_DESCRIPTION =
  "Add the missing financial details so we can calculate your Safety Buffer target.";
export const SUGGESTION_BUFFER_COVERAGE_UNAVAILABLE_TITLE = "Safety Buffer Coverage Is Unavailable";
export const SUGGESTION_BUFFER_COVERAGE_UNAVAILABLE_DESCRIPTION =
  "We could not verify enough portfolio data to calculate your current Safety Buffer coverage.";
export const SUGGESTION_REBALANCE_TITLE = "Rebalance Your Allocation";
export const SUGGESTION_REBALANCE_OVERWEIGHT_DESCRIPTION =
  "Your crypto allocation is above your target. Review whether you want to move part of it toward stablecoins.";
export const SUGGESTION_REBALANCE_UNDERWEIGHT_DESCRIPTION =
  "Your crypto allocation is below your target. Review whether you want to move excess stablecoins toward crypto exposure.";
/* Step 18D — phase-one stables→crypto copy: names the verified USDC source, the SOL destination, and the
 * protected Safety Buffer; distinguishes full vs partial correction. Review-only; no execution/guarantee. */
export const SUGGESTION_REBALANCE_STABLES_FULL_DESCRIPTION =
  "Your stablecoin allocation is above target. Consider moving part of your verified excess USDC into SOL while keeping your Safety Buffer fully covered.";
export const SUGGESTION_REBALANCE_STABLES_PARTIAL_DESCRIPTION =
  "Your stablecoin allocation is above target. Use verified excess USDC to partially close the gap in your SOL allocation while keeping your Safety Buffer covered.";
/* Step 18F — phase-one crypto→stables copy: names the direct-wallet SOL source, the USDC destination, and
 * the protected 0.1 SOL operating reserve; distinguishes full vs partial correction. Review-only; no
 * execution/guarantee, no received-USDC amount, no route/slippage. Dynamic amounts live in supporting data. */
export const SUGGESTION_REBALANCE_CRYPTO_FULL_DESCRIPTION =
  "Your crypto allocation is above target. Consider moving part of your direct-wallet SOL into USDC while keeping 0.1 SOL available for wallet activity.";
export const SUGGESTION_REBALANCE_CRYPTO_PARTIAL_DESCRIPTION =
  "Your crypto allocation is above target. Available direct-wallet SOL could partially close the gap in your stablecoin allocation while keeping 0.1 SOL available for wallet operations.";
/* Step 21E — the On Track claim is NARROWED to match the exact evaluated scope (Safety Buffer verified complete +
 * canonical crypto allocation inside the ±10pp review range). It must never imply overall plan/portfolio health,
 * goal/contribution progress, "no changes needed", or that unevaluated dimensions are healthy. */
export const SUGGESTION_ON_TRACK_TITLE = "Your Safety Buffer and Allocation Are Within Range";
export const SUGGESTION_ON_TRACK_DESCRIPTION =
  "Your Safety Buffer is fully funded, and your crypto allocation is within the current review range.";
/* Step 21H — On Track multi-card informational set (shown together only when the narrow On Track scope is
 * verified). Cards 1 & 2 are review PROMPTS (they invite the user to re-check inputs WealthSmith cannot verify),
 * card 3 states only the verified Safety Buffer completeness. {placeholders} are interpolated from real inputs;
 * a card is omitted (fail closed) when its value is unknown — never a placeholder or invented figure. */
export const SUGGESTION_ON_TRACK_GOAL_TITLE = "Goal Check: {goal}?";
export const SUGGESTION_ON_TRACK_GOAL_DESCRIPTION =
  "Your plan is set for a {horizon} horizon. If that has changed, we can recalibrate your risk level.";
export const SUGGESTION_ON_TRACK_EXPENSE_TITLE = "Expense Benchmark";
export const SUGGESTION_ON_TRACK_EXPENSE_DESCRIPTION =
  "Your plan assumes {expenses}/mo in expenses. Is this still accurate, or has your cost of living shifted?";
export const SUGGESTION_ON_TRACK_BUFFER_TITLE = "Safety Buffer: 100% Funded";
export const SUGGESTION_ON_TRACK_BUFFER_DESCRIPTION =
  "You have {months} months of expenses secured in USDC. This protects your growth assets from market volatility.";
export const SUGGESTION_ON_TRACK_BUFFER_CHIP = "Protected";
/* Copy for the full suggestion category set. Non-advisory, non-promissory,
 * non-transactional. */
export const SUGGESTION_CAPITAL_EFFICIENCY_TITLE = "Review Idle Assets";
export const SUGGESTION_CAPITAL_EFFICIENCY_DESCRIPTION =
  "Some assets are not currently contributing to your plan and may be worth reviewing.";
export const SUGGESTION_STAKING_TITLE = "Put Idle SOL to Work";
export const SUGGESTION_STAKING_DESCRIPTION =
  "You have liquid SOL that may be eligible for staking or liquid staking.";
/* When a protocol is selected (e.g. the JitoSOL read-only beta), the card names it. `{protocol}` is replaced
 * with the selected protocol name in the card mapper; the generic copy above is the no-protocol fallback. */
export const SUGGESTION_STAKING_SELECTED_TITLE = "Stake SOL on {protocol}";
export const SUGGESTION_STAKING_SELECTED_DESCRIPTION =
  "You have liquid SOL that could earn staking rewards through {protocol}.";
/* Step 24A — dedicated JUP Staking suggestion (Staking category, separate card from SOL staking). Read-only
 * review; no fixed-return promise, no external execution CTA. `{amount}` is the formatted transferable JUP. */
export const SUGGESTION_JUP_STAKING_TITLE = "Stake Your JUP";
export const SUGGESTION_JUP_STAKING_DESCRIPTION =
  "Your JUP is currently unstaked and eligible for Jupiter staking rewards.";
export const SUGGESTION_JUP_STAKING_ACTION = "Stake {amount} JUP";
export const SUGGESTION_JUP_STAKING_REWARDS_VARIABLE =
  "Rewards are variable and depend on the current Jupiter staking program.";
export const SUGGESTION_JUP_STAKING_WHY_JUPITER =
  "Jupiter is the only approved JUP staking product currently supported by WealthSmith.";
export const SUGGESTION_STABLE_YIELD_TITLE = "Put Stablecoins to Work";
export const SUGGESTION_STABLE_YIELD_DESCRIPTION =
  "You have liquid stablecoins that may be eligible for conservative yield options while still supporting your Safety Buffer.";
export const SUGGESTION_POSITION_OPTIMIZATION_TITLE = "Review Yield Positions";
/* Step 20C — neutral description covering ALL trigger families (incl. shared underlying exposure). Never
 * implies a position is defective, and never an instruction to exit/switch/withdraw. */
export const SUGGESTION_POSITION_OPTIMIZATION_DESCRIPTION =
  "Some positions may be worth reviewing because of lower yields, concentration, or overlapping exposure to the same assets.";
/* Step 20C — review-oriented trigger wording + per-position reasons + APY display labels + limitations. */
export const SUGGESTION_PO_REASON_MISSING_APY = "Current APY data could not be verified for one or more supported positions. Review the flagged positions and confirm the latest yield information.";
export const SUGGESTION_PO_REASON_LOW_YIELD = "One or more positions have a verified, comparable APY below the review threshold. Review them to compare their current yield with other eligible options.";
export const SUGGESTION_PO_REASON_CONCENTRATION = "A single deployed position makes up a large share of your portfolio. Review it to assess its yield and concentration.";
export const SUGGESTION_PO_REASON_SHARED = "Multiple positions have exposure to the same underlying asset. Review them to understand your combined exposure and concentration.";
export const SUGGESTION_PO_POS_MISSING_APY = "Current APY data unavailable";
export const SUGGESTION_PO_POS_LOW_YIELD = "Fresh comparable APY below review threshold";
export const SUGGESTION_PO_POS_CONCENTRATION = "High single-position share";
export const SUGGESTION_PO_POS_SHARED = "Shared underlying exposure";
export const SUGGESTION_PO_APY_FRESHNESS_UNVERIFIED = "APY freshness unverified";
export const SUGGESTION_PO_APY_UNAVAILABLE = "Current APY unavailable";
export const SUGGESTION_PO_APY_STALE = "APY may be stale";
export const SUGGESTION_PO_APY_NO_COMPARISON = "Yield comparison not available";
export const SUGGESTION_PO_APY_NOT_APPLICABLE = "Not applicable";
export const SUGGESTION_PO_APY_UNRESOLVED = "Unable to verify";
export const SUGGESTION_PO_LIMIT_FRESHNESS = "APY freshness could not be verified for some positions.";
export const SUGGESTION_PO_LIMIT_NO_COMPARISON = "Yield comparison is not available for some position types.";
export const SUGGESTION_PO_LIMIT_EXPOSURE = "Shared-exposure grouping could not be evaluated for some positions.";
export const SUGGESTION_DCA_TITLE = "Review a DCA Plan";
export const SUGGESTION_DCA_DESCRIPTION =
  "Your crypto allocation is below target. You may be able to use future contributions to build exposure gradually.";
export const SUGGESTION_TRIM_TITLE = "Review Long-Tail Assets";
export const SUGGESTION_TRIM_DESCRIPTION =
  "Some non-core assets make up a meaningful share of your portfolio and may be worth reviewing.";
/* Step 19C — review-oriented Trim wording (never an instruction to sell/remove/consolidate). Trigger
 * explanations + transferability limitations for the canonical Trim review details. */
export const SUGGESTION_TRIM_REASON_AGGREGATE = "Non-core assets make up a meaningful share of your portfolio and may be worth reviewing.";
export const SUGGESTION_TRIM_REASON_CONCENTRATION = "A non-core token represents a meaningful share of your portfolio.";
export const SUGGESTION_TRIM_REASON_SMALL = "Several small non-core positions add complexity worth reviewing.";
export const SUGGESTION_TRIM_EXPLAIN_AGGREGATE = "Non-core holdings collectively exceed the review threshold.";
export const SUGGESTION_TRIM_EXPLAIN_CONCENTRATION = "One or more non-core holdings represent at least 10% of gross portfolio assets.";
export const SUGGESTION_TRIM_EXPLAIN_SMALL = "At least three non-core holdings are valued at $50 or less and total at least $100.";
export const SUGGESTION_TRIM_LIMIT_TRANSFER_UNAVAILABLE =
  "Some of these assets are not currently transferable. They are included because their market value affects portfolio concentration, not because WealthSmith determined they can be moved.";
export const SUGGESTION_TRIM_LIMIT_TRANSFER_UNRESOLVED =
  "Transferability could not be verified for some of these assets. WealthSmith has not treated them as available for an action.";
export const SUGGESTION_TRIM_LIMIT_TRANSFER_BOTH =
  "Some of these assets are not currently transferable and others could not be verified. They are included because their market value affects portfolio concentration — WealthSmith has not determined that any of them can be moved.";
export const SUGGESTIONS_UNAVAILABLE =
  "Strategy Steps need wallet value, goal settings, Safety Buffer, and allocation data before they can be shown.";
export const SUGGESTIONS_PARTIAL_PRICING =
  "Some assets are not priced yet, so suggestions may be incomplete.";
/** Real-wallet suggestion rail: header sub-copy + loading state. */
export const SUGGESTIONS_RAIL_DESC = "Based on your live wallet and saved plan.";
export const SUGGESTIONS_LOADING = "Preparing your suggestions…";
export const SUGGESTION_COPY: Record<string, string> = {
  "suggestion.buffer.title": SUGGESTION_BUFFER_TITLE,
  "suggestion.buffer.description": SUGGESTION_BUFFER_DESCRIPTION,
  "suggestion.buffer.range.description": SUGGESTION_BUFFER_RANGE_DESCRIPTION,
  "suggestion.buffer.plan.description": SUGGESTION_BUFFER_PLAN_DESCRIPTION,
  "suggestion.buffer.nearly_funded.title": SUGGESTION_BUFFER_NEARLY_FUNDED_TITLE,
  "suggestion.buffer.nearly_funded.description": SUGGESTION_BUFFER_NEARLY_FUNDED_DESCRIPTION,
  "suggestion.buffer.unresolved.title": SUGGESTION_BUFFER_UNRESOLVED_TITLE,
  "suggestion.buffer.unresolved.description": SUGGESTION_BUFFER_UNRESOLVED_DESCRIPTION,
  "suggestion.buffer.target_unavailable.title": SUGGESTION_BUFFER_TARGET_UNAVAILABLE_TITLE,
  "suggestion.buffer.target_unavailable.description": SUGGESTION_BUFFER_TARGET_UNAVAILABLE_DESCRIPTION,
  "suggestion.buffer.coverage_unavailable.title": SUGGESTION_BUFFER_COVERAGE_UNAVAILABLE_TITLE,
  "suggestion.buffer.coverage_unavailable.description": SUGGESTION_BUFFER_COVERAGE_UNAVAILABLE_DESCRIPTION,
  "suggestion.rebalance.title": SUGGESTION_REBALANCE_TITLE,
  "suggestion.rebalance.crypto_overweight.description":
    SUGGESTION_REBALANCE_OVERWEIGHT_DESCRIPTION,
  "suggestion.rebalance.crypto_underweight.description":
    SUGGESTION_REBALANCE_UNDERWEIGHT_DESCRIPTION,
  "suggestion.rebalance.stables_to_crypto.full.description":
    SUGGESTION_REBALANCE_STABLES_FULL_DESCRIPTION,
  "suggestion.rebalance.stables_to_crypto.partial.description":
    SUGGESTION_REBALANCE_STABLES_PARTIAL_DESCRIPTION,
  "suggestion.rebalance.crypto_to_stables.full.description":
    SUGGESTION_REBALANCE_CRYPTO_FULL_DESCRIPTION,
  "suggestion.rebalance.crypto_to_stables.partial.description":
    SUGGESTION_REBALANCE_CRYPTO_PARTIAL_DESCRIPTION,
  "suggestion.on_track.title": SUGGESTION_ON_TRACK_TITLE,
  "suggestion.on_track.description": SUGGESTION_ON_TRACK_DESCRIPTION,
  // Contracted (Step 9A) — future categories, no trigger logic yet.
  "suggestion.capital_efficiency.title": SUGGESTION_CAPITAL_EFFICIENCY_TITLE,
  "suggestion.capital_efficiency.description": SUGGESTION_CAPITAL_EFFICIENCY_DESCRIPTION,
  "suggestion.staking.title": SUGGESTION_STAKING_TITLE,
  "suggestion.staking.description": SUGGESTION_STAKING_DESCRIPTION,
  // Step 24A — dedicated JUP staking card (Staking category).
  "suggestion.jup_staking.title": SUGGESTION_JUP_STAKING_TITLE,
  "suggestion.jup_staking.description": SUGGESTION_JUP_STAKING_DESCRIPTION,
  "suggestion.stable_yield.title": SUGGESTION_STABLE_YIELD_TITLE,
  "suggestion.stable_yield.description": SUGGESTION_STABLE_YIELD_DESCRIPTION,
  "suggestion.position_optimization.title": SUGGESTION_POSITION_OPTIMIZATION_TITLE,
  "suggestion.position_optimization.description":
    SUGGESTION_POSITION_OPTIMIZATION_DESCRIPTION,
  "suggestion.dca.title": SUGGESTION_DCA_TITLE,
  "suggestion.dca.description": SUGGESTION_DCA_DESCRIPTION,
  "suggestion.trim.title": SUGGESTION_TRIM_TITLE,
  "suggestion.trim.description": SUGGESTION_TRIM_DESCRIPTION,
};

/** Smith AI Suggestions rail title + the Ask Smith AI explainer for when/how
 *  real-wallet suggestions appear (they are now live from the engine). */
export const REAL_WALLET_SUGGESTIONS_TITLE = "Smith AI Suggestions";
export const REAL_WALLET_SUGGESTIONS_DESC =
  "Suggestions appear once your wallet value, goal settings, Safety Buffer, and allocation data are available. They are generated by WealthSmith’s deterministic Suggestion Engine and shown in the Smith AI Suggestions section.";

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
/* Projected Growth "how it's calculated" info popover (real-wallet dashboard).
   Values are injected from the projection result; nothing here is hardcoded. */
export const PG_INFO_ARIA = "How Projected Growth is calculated";
export const PG_INFO_INTRO =
  "This projection starts with your current priced wallet value and adds your planned monthly contribution over your selected timeline.";
export const PG_INFO_RETURN_PREFIX = "We use a";
export const PG_INFO_RETURN_MIDDLE = "modeled annual return because your risk level is";
export const PG_INFO_OVER = "Over this period:";
export const PG_INFO_CONTRIB_LABEL = "Planned contributions";
export const PG_INFO_GROWTH_LABEL = "Estimated growth";
export const PG_INFO_VALUE_LABEL = "Projected value";
export const PG_INFO_FOOTER = "This is a planning estimate, not a guarantee.";
/* Projected Growth info popover when no projection yet (e.g. wallet not connected). */
export const PG_INFO_UNAVAILABLE_INTRO =
  "Projected Growth shows a planning estimate based on your wallet value, monthly contribution, timeline, and selected risk level.";
export const PG_INFO_UNAVAILABLE_CONNECT =
  "Connect a wallet and complete your goal setup to see your projection.";
/** Approved buffer empty-state copy (patterns/dashboard-layout.md) — the target
 * is risk-based, so risk tolerance is a required input alongside expenses. */
export const SAFETY_BUFFER_NEEDS =
  "Add your monthly expenses and risk tolerance to see your safety buffer target.";
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
export const PORT_DEPLOYMENT_TITLE = "Asset Deployment Overview";
export const PORT_LIQUID_TITLE = "Liquid Assets";
export const PORT_LIQUID_CAPTION =
  "Assets sitting in connected wallet, not earning passive income.";
export const PORT_STAKED_TITLE = "Staked Assets";
export const PORT_STAKED_CAPTION = "Earning yield via trusted staking protocols.";
export const PORT_YIELD_TITLE = "Yield Strategies";
export const PORT_YIELD_CAPTION =
  "Assets deployed in yield-generating strategies and vaults.";
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
  "Your live mix vs your target allocation. Your target is based on your risk tolerance, timeline, financial goal, cash flow, and current market conditions — a modeled target, not advice.";
export const ALLOCATION_NO_RISK =
  "Set your risk level to see a recommended target mix.";
/* Step 22F (slice 5) — canonical target-state captions for the allocation summary. No market score/band/attribution. */
export const ALLOCATION_TARGET_CURRENT = "All target-allocation inputs are current.";
export const ALLOCATION_MARKET_EXCLUDED = "Market data was excluded from this calculation.";
export const ALLOCATION_TARGET_LOADING = "Your recommended target allocation is loading.";
export const ALLOCATION_TARGET_UNAVAILABLE = "Your recommended target allocation is currently unavailable.";
/* Step 22F (slice 6) — informational Market Conditions surface. Informational only; no buy/sell/emotional/timing language. */
export const MARKET_CONDITIONS_HEADING = "Market conditions";
export const MARKET_CONDITIONS_SCOPE = "Broad crypto-market sentiment";
export const MARKET_CONDITIONS_SOURCE = "Data source: CoinMarketCap";
export const MARKET_CONDITIONS_AS_OF_PREFIX = "As of";
export const MARKET_CONDITIONS_EXPLANATION =
  "This input represents 10% of your target-allocation calculation and does not directly create buy or sell recommendations.";
export const MARKET_CONDITIONS_LOADING = "Loading market conditions…";
export const MARKET_CONDITIONS_UNAVAILABLE_PRIMARY = "Data unavailable";
export const MARKET_CONDITIONS_UNAVAILABLE_SIMPLE = "Market data is currently unavailable.";
export const MARKET_CONDITIONS_EXCLUDED =
  "The market component was excluded, and the remaining profile factors were renormalized.";
export const MARKET_CONDITIONS_STALE = "Market data is outside its approved freshness window.";
/* Step 22F (slice 6.1) — STATE-AWARE target-allocation methodology copy. The methodology sentence must match the
 * canonical target state: a full target may cite current market conditions; a degraded target must say market data
 * was excluded (never both); unavailable/blocked make no five-factor completion claim; loading/unresolved make no
 * inclusion/exclusion claim. */
export const ALLOCATION_METHODOLOGY_FULL =
  "Your target allocation is based on your risk tolerance, timeline, financial goal, cash flow, and current market conditions. For planning only, not financial advice.";
export const ALLOCATION_METHODOLOGY_DEGRADED =
  "Your target allocation uses your risk tolerance, timeline, financial goal, and cash flow. Market data was excluded because it was unavailable or outside its approved freshness window. For planning only, not financial advice.";
export const ALLOCATION_METHODOLOGY_LOADING = "Your target allocation is being calculated.";
/**
 * Derive the allocation methodology popover copy from the CANONICAL target state (never from score presence or a
 * recomputed confidence). `state` is `RailTargetSummary.state`: full | degraded_market_excluded | unavailable |
 * blocked | unresolved | loading.
 */
export function deriveAllocationMethodologyCopy(state: string): string {
  switch (state) {
    case "full":
      return ALLOCATION_METHODOLOGY_FULL;
    case "degraded_market_excluded":
      return ALLOCATION_METHODOLOGY_DEGRADED;
    case "loading":
    case "unresolved":
      return ALLOCATION_METHODOLOGY_LOADING;
    default: // unavailable | blocked → no five-factor completion claim
      return ALLOCATION_TARGET_UNAVAILABLE;
  }
}
/* Current vs Recommended Allocation "how it works" info popover. */
export const ALLOCATION_INFO_ARIA =
  "How Current vs Recommended Allocation is calculated";
export const ALLOCATION_INFO_TEXT =
  "Your current allocation compared with your target allocation. Your target is based on your risk tolerance, timeline, financial goal, cash flow, and current market conditions — for planning only, not financial advice.";
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
