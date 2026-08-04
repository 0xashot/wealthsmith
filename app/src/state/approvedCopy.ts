/**
 * Approved copy used by step 3 interactions.
 *
 * Every string below is quoted verbatim from a design-system source of
 * truth (cited per constant). Nothing here is invented copy — per
 * content/ui-copy-rules.md and README.md ("Do not invent copy if approved
 * copy exists").
 */

/* ---------- Wallet menu (content/wallet-copy.md) ---------- */

/** content/wallet-copy.md — Wallet Menu Copy, the only menu item. */
export const WALLET_MENU_DISCONNECT = "Disconnect Wallet";

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
/** Shortened Global Nav CTA label shown ONLY on mobile (<1280px). */
export const CONNECT_WALLET_SHORT = "Connect";

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
/** Short hover/focus tooltip on the Ask Smith AI close control. */
export const SMITH_CLOSE_TOOLTIP = "Close";

/** Ask Smith AI header "More" menu — mirrors the onboarding More menu. Clear
 *  History resets the conversation to Smith's opener; Send Feedback is an
 *  explain-only affordance (no message is sent, matching the prototype). */
export const SMITH_MORE = "More";
export const SMITH_CLEAR_HISTORY = "Clear History";
export const SMITH_SEND_FEEDBACK = "Send Feedback";

/** Per-message like/dislike tooltips + accessible labels. */
export const SMITH_FEEDBACK_HELPFUL = "Helpful";
export const SMITH_FEEDBACK_NOT_HELPFUL = "Not helpful";

/** Send Feedback sub-page (opened from the More menu or a message thumb).
 *  Explain-only: nothing is sent — matching the prototype's non-sending Contact Us. */
export const SMITH_FEEDBACK_BACK = "Back";
export const SMITH_FEEDBACK_SUBTITLE = "Tell us what’s on your mind";
export const SMITH_FEEDBACK_RATING_LABEL = "Was Smith AI helpful?";
export const SMITH_FEEDBACK_MESSAGE_LABEL = "Message";
export const SMITH_FEEDBACK_MESSAGE_ERROR = "Tell us what you’d like to share";
export const SMITH_FEEDBACK_NOTE = "WealthSmith doesn’t use your data to train AI models.";
export const SMITH_FEEDBACK_SENT_TOAST = "Feedback sent";

/** Clear History confirmation (destructive) + its success toast. */
export const SMITH_CLEAR_CONFIRM_TITLE = "Clear Smith AI History?";
export const SMITH_CLEAR_CONFIRM_BODY =
  "This will remove your Smith AI history and you won’t be able to restore it.";
export const SMITH_CLEAR_CONFIRM_CANCEL = "Cancel";
export const SMITH_HISTORY_CLEARED_TOAST = "History cleared";

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
/** Shortened Global Nav CTA label shown ONLY on mobile (<1280px). */
export const TRY_DEMO_MODE_SHORT = "Demo";

/** Hover tooltip on the disabled Portfolio / Goal / Support nav items (disconnected / onboarding). */
export const NAV_DISABLED_TOOLTIP =
  "Available once your wallet is connected and onboarding is complete.";

/** Mobile Global Nav — hamburger button + slide-in nav drawer. */
export const NAV_MENU_OPEN = "Open menu";
export const NAV_MENU_CLOSE = "Close menu";
export const NAV_MENU_TITLE = "Menu";

/** dashboard-demo-state.json demo_banner.title (also announcement.md) */
export const DEMO_BANNER_TITLE = "You’re in demo mode.";

/** dashboard-demo-state.json demo_banner.description */
export const DEMO_BANNER_DESCRIPTION =
  "This is a sample portfolio. Connect your wallet to personalize WealthSmith with your real portfolio.";

/** dashboard-demo-state.json demo_banner.actions[0].label */
export const DEMO_BANNER_EXIT = "Exit Demo";

/** Shortened banner exit label used only on mobile (< 1280px). */
export const DEMO_BANNER_EXIT_SHORT = "Exit";

/** dashboard-demo-state.json demo_banner.actions[1].label */
export const DEMO_BANNER_CONNECT = "Connect Wallet";

/** Shortened banner connect label used only on mobile (< 1280px). */
export const DEMO_BANNER_CONNECT_SHORT = "Connect";

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

/** Legal note shown under the wallet list; the two labels link out (new tab). */
export const WALLET_CONNECT_TERMS_LABEL = "Terms of Service";
export const WALLET_CONNECT_TERMS_URL = "https://wealthsmith.ai/terms.html";
export const WALLET_CONNECT_PRIVACY_LABEL = "Privacy Policy";
export const WALLET_CONNECT_PRIVACY_URL = "https://wealthsmith.ai/privacy.html";

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
/* Detailed, numbers-rich buffer body for a definite (non-range, non-plan) shortfall.
 * {current}/{coveredMonths}/{targetMonths} come from the canonical Safety Buffer
 * assessment — never invented. Both month values are BARE NUMBERS here (the
 * sentence supplies the unit), unlike the metric cards which carry their own.
 * The hyphenated "{targetMonths}-month target" reads correctly at EVERY value
 * ("0.4 of your 1-month target", "4 of your 6-month target") and matches the
 * near-target variant's existing "your {months}-month Safety Buffer target".
 *
 * One sentence, one comparison: where you are against where you're aiming. The
 * "add {shortfall}" instruction lives in the card's action line ("Add $2,000 to
 * your Safety Buffer."), and the target DOLLAR figure is the modal's "Target"
 * metric — repeating either here just said the same thing twice. */
export const SUGGESTION_BUFFER_SHORTFALL_DETAIL =
  "You have {current} in your Safety Buffer, covering {coveredMonths} of your {targetMonths}-month target.";
/* Range shortfall (some stablecoin value is still being verified): {current} confirmed + {beingVerified} pending
 * against {target}; the confirmed minimum to add now is {shortfall}, and {additional} more may be needed later. */
export const SUGGESTION_BUFFER_RANGE_DETAIL =
  "You have {current} confirmed in your Safety Buffer, and another {beingVerified} is still being verified. Your target is {target}. Add at least {shortfall} now; depending on the verification result, you may need another {additional} later.";
/* Small definite gap where the covered months round to the target months — the "enough to cover N months / target
 * N months" phrasing would read as funded, so state the gap directly. {shortfall}/{months} from the assessment. */
export const SUGGESTION_BUFFER_NEARTARGET_DETAIL =
  "You’re {shortfall} short of your {months}-month Safety Buffer target. Add {shortfall} in USDC to fully fund it before investing further.";
/* Below-minimum informational gap ("nearly funded"): the exact remaining gap is too small for a separate top-up. */
export const SUGGESTION_BUFFER_NEARLY_FUNDED_DETAIL =
  "You’re {shortfall} short of your Safety Buffer target. The remaining gap is too small for a separate top-up, so you can cover it with your next contribution.";
/* Plan-backed shortfall where the next planned contribution FULLY covers the gap → complete it via that contribution. */
export const SUGGESTION_BUFFER_PLAN_DETAIL =
  "Your Safety Buffer is {shortfall} below target. Direct your next planned contribution to USDC to fully fund it before investing further.";
/* A frozen (not transferable) stablecoin is excluded from the eligible reserve:
 * {verified} + a count-aware clause about the excluded holding(s).
 *
 * States the eligible position and WHY it is lower than expected — nothing else.
 * The amount to add is the card's action line ("Add $2,000 to your Safety
 * Buffer.") and the modal's emphasized "Amount to add" card; the target is the
 * modal's "Target" card. Repeating either here said the same thing twice. */
export const SUGGESTION_BUFFER_FROZEN_DETAIL =
  "You have {verified} in eligible stablecoins. {frozenClause}";
export const SUGGESTION_BUFFER_FROZEN_ONE =
  "One stablecoin holding is frozen and can’t be used as a liquid reserve, so it isn’t counted.";
export const SUGGESTION_BUFFER_FROZEN_MANY =
  "{n} stablecoin holdings are frozen and can’t be used as a liquid reserve, so they aren’t counted.";
/* Step 21C — canonical Safety Buffer state copy. Honest, review-only, and never treats unresolved value as zero,
 * never presents a plan amount as the total gap, and never implies immediate transfer capability. */
export const SUGGESTION_BUFFER_RANGE_DESCRIPTION =
  "Your stablecoin reserve is below target. Additional stablecoin value is still being verified and may reduce the remaining gap.";
export const SUGGESTION_BUFFER_PLAN_DESCRIPTION =
  "Part of your next contribution is allocated to your Safety Buffer. The confirmed gap after this contribution is shown separately.";
/* Plan-backed PARTIAL: the next contribution reduces but does not close the confirmed gap — direct it to USDC and
 * state plainly that the remaining amount still needs adding afterward. {shortfall} is the confirmed gap (Amount needed). */
export const SUGGESTION_BUFFER_PLAN_PARTIAL_DETAIL =
  "Your Safety Buffer is {shortfall} below target. Use your next contribution toward USDC to reduce the gap. You’ll still need to add the remaining amount afterward.";
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
/* Review-Goal CTA on the Goal Check / Expense Benchmark cards — opens the Goal page (in-app view switch). */
export const SUGGESTION_ON_TRACK_REVIEW_GOAL_CTA = "Review Goal";
/* Market-conditions strategy card. Informational stance only — deliberately avoids Fear/Greed sentiment labels and
 * buy/sell timing language (consistent with the Rebalance/DCA market disclosures). Values are representative. */
export const SUGGESTION_ON_TRACK_MARKET_TITLE = "Strategy: Defensive";
export const SUGGESTION_ON_TRACK_MARKET_DESCRIPTION =
  "Market conditions favor a more defensive stance right now, so you’re holding 40% in stables. This is informational — not a buy or sell recommendation.";
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
/* 24J — richer selected-protocol body naming the eligible amount, the estimated (real, sourced) APY, and the kept
 * operating reserve. Set as a descriptionOverride once a protocol + its APY are known. Never a promised return.
 * {amount}=eligible SOL, {protocol}=selected name, {apy}=sourced APY %, {reserve}=fee reserve SOL. */
export const SUGGESTION_STAKING_SELECTED_DETAIL =
  "You have {amount} SOL available to stake. Stake it through {protocol} to earn an estimated {apy}% APY, while keeping {reserve} SOL available for wallet activity.";
/* Step 24A — dedicated JUP Staking suggestion (Staking category, separate card from SOL staking). Read-only
 * review; no fixed-return promise, no external execution CTA. `{amount}` is the formatted transferable JUP. */
export const SUGGESTION_JUP_STAKING_TITLE = "Stake JUP on Jupiter";
export const SUGGESTION_JUP_STAKING_DESCRIPTION =
  "Stake {amount} JUP with Jupiter to become eligible for variable quarterly rewards. Your JUP will be locked and requires a 7-day unstaking period.";
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
/* Position-specific card/modal copy when exactly ONE deployed position is flagged and its protocol has a
 * known display name — clearer than the generic wording. `{protocol}` / `{amount}` / `{share}` / `{count}`
 * are interpolated from real assessment data (never invented). Still review-only; no exit/switch/withdraw. */
export const SUGGESTION_PO_NAMED_TITLE = "Review Your {protocol} Position";
export const SUGGESTION_PO_NAMED_IMPACT = "Review {amount} in {protocol}";
export const SUGGESTION_PO_MULTI_IMPACT = "Review {amount} across {count} positions";
export const SUGGESTION_PO_NAMED_CONCENTRATION = "Your {protocol} position represents {share}% of your portfolio. Review whether you’re comfortable keeping this much in a single yield position.";
export const SUGGESTION_PO_NAMED_LOW_YIELD = "Your {protocol} position has a verified APY below the review threshold. Review whether its current yield still fits your plan.";
export const SUGGESTION_PO_NAMED_MISSING_APY = "We couldn’t verify a current APY for your {protocol} position. Review the latest yield information before relying on it.";
export const SUGGESTION_PO_NAMED_SHARED = "Your {protocol} position shares underlying exposure with other holdings. Review your combined exposure to the same asset.";
/* Low-yield single position — a "Compare" treatment naming the held asset + its actual sourced APY. {kind} is
 * "staking " for LST/native-stake positions, "" otherwise (never claims "staking" for a non-staking position). */
export const SUGGESTION_PO_LOW_TITLE = "Compare Your {asset} Yield";
export const SUGGESTION_PO_LOW_IMPACT = "Compare {amount} in {asset}";
export const SUGGESTION_PO_LOW_DESCRIPTION = "Your {asset} position currently earns {apy}% APY. Similar vetted {kind}options may offer a higher yield, so it may be worth comparing alternatives.";
/* Detailed modal-body explanation for a single concentrated position — shows the real numbers behind the flag.
 * {protocol}/{value}/{gross}/{share}/{threshold}/{pp} come from the assessment (position value, gross assets,
 * its share, the concentration threshold, and points above it). Never invented. */
export const SUGGESTION_PO_NAMED_CONCENTRATION_DETAIL = "Your {protocol} position is worth {value} out of your {gross} portfolio, so it represents {share}% of your assets. WealthSmith flags a single position when it reaches {threshold}% or more, so this position is {pp} percentage points above the review threshold.";
/* One position flagged for BOTH concentration AND missing APY → a combined body naming the held asset + its share. */
export const SUGGESTION_PO_CONCENTRATION_MISSING = "Your {asset} position represents {share}% of your portfolio, and we couldn’t verify its current APY. Review whether you’re comfortable with this level of concentration and check the latest yield information.";
/* Shared-underlying-exposure copy: multiple positions linked to ONE underlying asset (e.g. JitoSOL + mSOL → SOL).
 * {asset}/{members}/{linkword}/{share}/{amount}/{count} come from the exposure group + its members. Never invented. */
export const SUGGESTION_PO_SHARED_TITLE = "Review Your {asset} Exposure";
export const SUGGESTION_PO_SHARED_DESCRIPTION = "Your {members} positions are {linkword} linked to {asset}. Together, they represent {share}% of your portfolio. Review whether this matches your intended {asset} allocation.";
export const SUGGESTION_PO_SHARED_IMPACT = "Review {amount} across {count} {asset} positions";
/* When shared exposure fires ALONGSIDE other issues (concentration / missing APY / low yield), the heading stays
 * generic ("Review Yield Positions") and the body is assembled from these fragments over real assessment values. */
export const SUGGESTION_PO_MULTI_LEAD = "Your {members} positions represent {share}% of your portfolio.";
export const SUGGESTION_PO_MULTI_CONC = " {asset} alone accounts for {share}%";
export const SUGGESTION_PO_MULTI_CONC_APY = ", and we couldn’t verify its current APY";
export const SUGGESTION_PO_MULTI_REVIEW = " Review {both} positions to assess your {asset} exposure";
export const SUGGESTION_PO_MULTI_YIELD_MISSING = " and check the latest yield information";
export const SUGGESTION_PO_MULTI_YIELD_LOW = " and compare their current yields";
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
/* 24J — plain-language Trim card/modal body. Single form names the one non-core asset + its portfolio share;
 * the multi form aggregates. {asset}=symbol, {share}=portfolio %, {amount}=whole-dollar total. Review-only. */
export const SUGGESTION_TRIM_SINGLE_DESCRIPTION = "{asset} represents {share}% of your portfolio. Swap ${amount} to USDC to reduce non-core exposure.";
/* Single non-core asset that is currently frozen / non-transferable — never implies it can be moved; points the user to
 * check the position's status. {asset}=symbol, {share}=portfolio %. Uses a curly apostrophe to match codebase style. */
export const SUGGESTION_TRIM_FROZEN_SINGLE_DESCRIPTION = "{asset} represents {share}% of your portfolio, but the token is currently frozen and can’t be transferred. Review the position and check its status before taking action.";
export const SUGGESTION_TRIM_MULTI_DESCRIPTION = "Your non-core assets represent {share}% of your portfolio. Swap ${amount} to USDC to reduce non-core exposure.";
/* Small-position case (several tiny non-core holdings, below the aggregate-share threshold). {count}=spelled-out
 * number of small positions, {amount}=whole-dollar combined total. Framed as simplification, review-only. */
export const SUGGESTION_TRIM_SMALL_DESCRIPTION = "You have {count} small non-core positions worth ${amount} in total. Consider swapping them to USDC to simplify your portfolio.";
/* All-three-triggers case: one concentrated non-core asset plus several small ones. Breaks the aggregate share into the
 * concentrated leader + the combined smaller positions. {count}=total non-core (capitalized), {aggShare}=aggregate %,
 * {concAsset}=leader symbol, {concShare}=leader %, {smallCount}=spelled-out small count, {smallShare}=combined small %. */
export const SUGGESTION_TRIM_ALLTHREE_DESCRIPTION = "{count} non-core assets represent {aggShare}% of your portfolio. {concAsset} alone accounts for {concShare}%, while {smallCount} smaller positions add another {smallShare}%. Consider swapping them to USDC to reduce non-core exposure and simplify your portfolio.";
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
export const SUGGESTIONS_RAIL_DESC = "Personalized based on your plan.";
export const SUGGESTIONS_LOADING = "Preparing your suggestions…";
/** Loading card label — paired with the animated Smith AI symbol (like the
 *  first-open "Smith AI getting ready" beat). */
export const SUGGESTIONS_PREPARING = "Preparing your personalized suggestions";
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
/** Projected Growth empty state (no plan / disconnected): shown under the illustrative disabled chart. */
export const PROJECTED_GROWTH_EMPTY_PROMPT =
  "Set your goal and timeline so Smith AI can generate a personalized projection.";
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
/** Trailing period for the Total Portfolio Value trend badge (value-weighted 24h change). */
export const FS_CHANGE_PERIOD = "today";
export const FS_NET_CONTRIB_LABEL = "Net Contributions";
/** Net-contributions caption — same for the sourced value and the $0 empty state. */
export const FS_NET_CONTRIB_ESTIMATE = "Invested over the last 12 months";
/** Net Contributions info icon — why manually added assets are not counted here. */
export const FS_NET_CONTRIB_INFO_ARIA = "About Net Contributions";
export const FS_NET_CONTRIB_MANUAL_NOTE =
  "Bitcoin and Ethereum are added manually, so we don\u2019t know when they were invested. " +
  "They count toward your Total Portfolio Value but are not included here.";

/** Projected Growth (real wallet) — section caption under the title. */
export const PG_CAPTION = "Modeled using your strategy settings over your selected timeline";

/** Safety Buffer (real wallet) — stablecoin reserve vs monthly expenses. */
export const SAFETY_BUFFER_CAPTION =
  "Stablecoin reserve covering 1–6 months of expenses before any investment actions.";
export const SAFETY_BUFFER_COVERED_LEGEND = "Covered Buffer";

/** Product section titles (approved product section names — reused live). */
export const DASH_ASSET_MIX_TITLE = "Asset Mix";
export const DASH_ASSET_MIX_CAPTION =
  "Breakdown of detected assets by category. Value-based allocation needs pricing data.";
export const PORT_BALANCE_TITLE = "Balance Overview";
export const PORT_ALLOCATION_TITLE = "Crypto Assets Allocation";
/** Donut empty-state descriptions (shown under the $0 ring when nothing is priced yet). */
export const PORT_BALANCE_EMPTY = "Your split between crypto and stablecoins will appear here.";
export const PORT_ALLOCATION_EMPTY = "Here you will see your portfolio breakdown.";
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
/** Allocation empty state (disconnected / no plan): shown under the disabled illustrative bars. */
export const ALLOCATION_EMPTY_PROMPT = "Add your goal and risk to view your ideal portfolio mix.";
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
/* Target-allocation methodology tooltip — ONE sentence for every case (connected, disconnected, and stale/excluded
 * market data). "the latest available market conditions" is honest across states: the engine uses the freshest market
 * reading that passes its freshness gate, and none when no fresh reading is available. Keeps the planning-only
 * disclaimer. (The per-state allocation CARD captions below — current / market-excluded / loading / unavailable —
 * remain state-aware; this replaces only the tooltip's prior state-aware copy.) */
export const ALLOCATION_METHODOLOGY =
  "Recommended allocation is based on your risk tolerance, timeline, financial goal, cash flow, and the latest available market conditions. For planning only, not financial advice.";
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
/** Shown on the disabled Edit Mode toggle during the onboarding tour (Demo Mode's
 *  Goal page is editable, so it is no longer mentioned). */
export const GOAL_EDIT_DISABLED_TOOLTIP =
  "Unable to edit your goal during the onboarding.";

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
/** Discard-confirmation dialog (unsaved Goal edits: Discard click or navigating away). */
export const GOAL_DISCARD_CONFIRM_TITLE = "Discard Changes?";
export const GOAL_DISCARD_CONFIRM_BODY =
  "You have unsaved changes. Are you sure you want to discard them?";
export const GOAL_DISCARD_CONFIRM_CANCEL = "Cancel";

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

/** Support page — "still need help" contact CTA (below the FAQ). */
export const SUPPORT_HELP_CTA_TITLE = "Still need help?";
export const SUPPORT_HELP_CTA_DESC =
  "We’re happy to assist — get in touch and we’ll get back within 24 hours.";

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
export const CONTACT_SUCCESS_TOAST = "Message sent";
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
 *  completion toast. No description. */
export const ONBOARDING_FINISH_TOAST = "Onboarding completed";


/* ---------- Portfolio: External Holdings (manually added BTC/ETH) ---------- */

/** Portfolio section heading (peer of "Asset Deployment Overview"). */
export const EXT_HOLDINGS_SECTION_TITLE = "External Holdings";
/** Card title. */
export const EXT_MANUAL_TITLE = "Manually Added Assets";
/** Card caption. */
export const EXT_MANUAL_CAPTION =
  "Bitcoin and Ethereum held outside your connected Solana wallet.";
/** Per-row action label. */
export const EXT_ADD_LABEL = "Add";

/* ---------- External Holdings: Add manual asset modal ---------- */

/** Modal headings, one per addable chain. */
export const EXT_ADD_BTC_TITLE = "Add Bitcoin";
export const EXT_ADD_ETH_TITLE = "Add Ethereum";
/** Same dialog, reopened on an already-added asset to update the amount. */
export const EXT_MANAGE_BTC_TITLE = "Manage Bitcoin";
export const EXT_MANAGE_ETH_TITLE = "Manage Ethereum";

/** Amount field labels. */
export const EXT_BTC_AMOUNT_LABEL = "Bitcoin amount";
export const EXT_ETH_AMOUNT_LABEL = "Ethereum amount";

/** Neutral numeric placeholder shared by both amount fields. */
export const EXT_AMOUNT_PLACEHOLDER = "0.00";

/** Modal action labels. */
export const EXT_CANCEL_LABEL = "Cancel";
export const EXT_CONFIRM_LABEL = "Confirm";
export const EXT_CLOSE_LABEL = "Close";

/** Precision error: each chain has its own decimal limit (BTC 8, ETH 18). */
export const extDecimalsError = (chainName: string, decimals: number) =>
  `${chainName} supports up to ${decimals} decimal places.`;
/** Row action once an amount has been added. */
export const EXT_MANAGE_LABEL = "Manage";
/** Confirmation toast after an amount is added, e.g. "BTC added". */
export const extAddedToast = (symbol: string) => `${symbol} added`;
