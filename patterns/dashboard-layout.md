# Dashboard Layout

This pattern defines the WealthSmith Dashboard layout and main authenticated app shell.

It covers how the Dashboard works with:

- Global Nav
- Financial Snapshot
- Safety Buffer
- Projected Growth
- Current vs Recommended Allocation
- Smith AI Suggestions
- Onboarding panel
- Ask Smith AI panel
- Demo Mode banner
- Wallet connected/disconnected states

The Dashboard is the primary WealthSmith home surface.

---

## Purpose

The Dashboard should give users a clear, calm, and actionable view of their financial position.

It should answer:

- What is my portfolio worth?
- Am I protected by enough stablecoin safety buffer?
- How is my plan projected to grow?
- What is WealthSmith suggesting next?
- Why is WealthSmith suggesting it?
- Can I ask Smith AI for help?
- Am I using real wallet data or Demo Mode?

The Dashboard should feel like a trustworthy financial workspace, not a trading terminal.

---

## Core Layout Principle

The Dashboard has three major areas:

```text
Top:
  Global Nav

Left/Main:
  Dashboard content

Right:
  Smith AI surface
```

The right zone can show different Smith AI states:

```text
Smith AI Suggestions
Onboarding
Ask Smith AI
Smith AI Strategy Insights
Loading suggestions
Empty suggestions
Error suggestions
```

The left Dashboard content should remain stable while the right zone changes.

This keeps users oriented.

---

## Main Component Dependency

The official navigation component is:

```text
components/global-nav.md
```

Dashboard Layout must use Global Nav rather than recreating navigation locally.

Global Nav owns reusable nav rendering rules.

Dashboard Layout owns where Global Nav appears in the full page and how it works with Dashboard states.

---

## Global Nav Placement

Global Nav appears at the top of the Dashboard shell.

Required MVP sizing from `components/global-nav.md`:

```text
Outer offset:
  top: 24px
  left: 24px
  right: 24px

Nav container:
  height: 64px
  radius: 16px
  internal horizontal padding: 12px

Logo:
  width: 221px
  height: 32px
```

Rules:

- Do not recreate the Global Nav in Dashboard code.
- Do not duplicate nav business rules in Dashboard layout.
- Use Global Nav props/state to render the correct variant.
- Dashboard page content begins below Global Nav with appropriate layout spacing.
- Demo Mode banner appears above Global Nav and is not part of Global Nav.

---

## Global Nav Variants Used by Dashboard

Dashboard can render all four Global Nav variants.

`onboarding_active` is derived, not set manually:

```text
onboarding_active = mode !== "demo" && (wallet.status === "disconnected" || goal_completed === false)
```

`goal_completed` is true only when all required Goal fields are saved (see `patterns/goal-settings.md` Approved Field Options and `patterns/onboarding-with-smith-ai.md`). Onboarding is always visible while disconnected, remains visible after wallet connection until goal setup is complete, and is hidden only when the wallet is connected and `goal_completed` is true. Demo Mode overrides onboarding while active.

### Variant 1: Onboarding Active, No Wallet Connected

Use when:

```text
onboarding_active = true
wallet.status = disconnected
demo_mode = false
```

Global Nav right actions:

```text
Try Demo Mode
Connect Wallet
```

Nav item behavior:

```text
Dashboard: active/enabled
Portfolio: disabled
Goal: disabled
Support: disabled
```

Dashboard right zone:

```text
Onboarding panel
```

Rules:

- Portfolio, Goal, and Support are disabled.
- Ask Smith AI button is hidden.
- Onboarding panel is the active Smith AI surface.
- Dashboard content shows starter/empty values until wallet/demo data exists.
- Connect Wallet opens wallet modal.
- Try Demo Mode starts demo flow.
- Do not let disabled nav items navigate away from onboarding.

---

### Variant 2: Demo Mode

Use when:

```text
demo_mode = true
wallet.status = disconnected
onboarding_active = false
```

Global Nav right actions:

```text
Ask Smith AI
```

Nav item behavior:

```text
Dashboard: enabled
Portfolio: enabled
Goal: enabled
Support: enabled
```

Dashboard right zone:

```text
Smith AI Suggestions
or
Ask Smith AI panel if opened
```

Rules:

- Demo Mode banner appears above Global Nav.
- No wallet pill appears.
- Demo suggestions are based on sample data.
- Ask Smith AI answers must be grounded in demo/sample state.
- Demo data must not be mixed with real wallet data.

---

### Variant 3: Wallet Connected

Use when:

```text
wallet.status = connected
onboarding_active = false
demo_mode = false
```

Global Nav right actions:

```text
Wallet pill
Ask Smith AI
```

Nav item behavior:

```text
Dashboard: enabled
Portfolio: enabled
Goal: enabled
Support: enabled
```

Dashboard right zone:

```text
Smith AI Suggestions
Smith AI Strategy Insights
Ask Smith AI panel if opened
```

Rules:

- Wallet pill appears before Ask Smith AI.
- Wallet pill opens wallet menu.
- Ask Smith AI opens right-side Ask Smith AI panel.
- All primary nav items are enabled.
- Suggestions are grounded in real wallet + saved plan state.
- Wallet connected state does not imply custody or signing.

#### Real Connected Wallet Dashboard (Live Data)

**ONE Dashboard body across every mode.** The Dashboard main column is the SAME
four cards whether the wallet is connected, not connected, or mid-onboarding —
only the DATA differs by availability. This is `app/src/components/DashboardBody.tsx`,
rendered by the connected + disconnected Dashboard AND the onboarding preview. There
is **no** mode-specific card: no "Wallet connected" card, no "No wallet connected"
card, no "Finish setting up your plan" card, no Refresh button, and no Asset Mix.
The Connect Wallet CTA lives in the global nav. Where a card's inputs don't exist
yet, the **same card shows a polished "unavailable" state** — never an invented or
fixture value.

```text
Dashboard body — the same four cards in every mode (heading above each card):
  Financial Snapshot   → two hero cards:
                           • Total Portfolio Value = sourced USD total (or "—")
                           • Net Contributions = sourced ESTIMATE of net deposits
                             over the last 12 months (or "—")
  Safety Buffer        → stablecoin reserve vs monthly expenses (× 3 months),
                         counting wallet stablecoins + stablecoin protocol
                         positions (e.g. USDC supplied to Kamino); unavailable
                         until prices are loaded AND an expenses input exists
  Projected Growth     → unavailable ("needs pricing and contribution logic")
  Current vs Recommended Allocation
                       → CURRENT mix is live (Crypto vs Stables, by sourced USD +
                         %); the RECOMMENDED target mix is unavailable (needs plan
                         allocation logic) — never an invented target
```

Rules:

- **Portfolio Value** = the **sourced** USD total (sum of priced positions from an
  approved feed — DefiLlama → Jupiter, `tokenPrices.ts`), excluding unpriced
  positions. Falls back to "—" only when nothing is priced. Never the fixture
  $15,500, never invented.
- **Net Contributions** = a sourced ESTIMATE of net deposits − withdrawals over the
  last 12 months (`contributionHistory.ts` + `useNetContributions.ts`): Helius
  parsed tx history, counting only `TRANSFER`-type external legs (deposits +,
  withdrawals −), valued at each transfer's historical price (DefiLlama). Internal
  moves — staking, swaps, LP — are excluded (they don't change net contributions).
  It is labeled an **estimate** ("Estimated net deposits over the last 12 months")
  and falls back to "—" when there's no wallet, the RPC isn't Helius, or history
  can't be read. Never a fabricated figure.
- **Safety Buffer** counts ONLY recognized stablecoins (wallet USDC/USDT/USDH/DAI
  plus stablecoin-only protocol positions like supplied USDC) against the monthly
  expenses the user entered in onboarding (`savedGoal.expenses_monthly`, threaded
  App → DashboardPage/OnboardingExperience → DashboardBody). Volatile assets and
  debt legs never count. Gated on prices loaded (so a $0 reserve is genuinely "no
  stablecoins") + a real expenses input — else the unavailable state, never the
  fixture $800/$3,000.
- **Current vs Recommended Allocation**: the current mix is value-based only from
  sourced prices (Crypto = total − stablecoin value; Stables = stablecoin value);
  the recommended target mix is unavailable until plan logic exists — never invented.
- Projected Growth stays unavailable until pricing + contribution logic exist.
- The connected-wallet fixture (`examples/dashboard/dashboard-connected-wallet-state.json`)
  remains for tests/storybook/dev reference only. Demo Mode keeps its own fixtures.
- Ask Smith AI is available in real-wallet mode, but only with real-wallet-safe
  explainer content (`app/src/state/realWalletSmithAi.ts`): it explains the
  read-only connection and why some values aren't shown yet, and never presents
  fixture Top Pick / suggestions / positions as the user's real data.

See `app/src/components/DashboardBody.tsx` and `patterns/wallet-connection.md`
(Data Mode Separation).

---

### Variant 4: Onboarding Active, Wallet Connected

Use when:

```text
onboarding_active = true
wallet.status = connected
demo_mode = false
```

Global Nav right actions:

```text
Wallet pill
```

Nav item behavior:

```text
Dashboard: active/enabled
Portfolio: disabled
Goal: disabled
Support: disabled
```

Dashboard right zone:

```text
Onboarding panel
```

Rules:

- Portfolio, Goal, and Support are disabled.
- Ask Smith AI button is hidden.
- Try Demo Mode and Connect Wallet are hidden.
- Onboarding panel continues guiding setup.
- Dashboard preview updates as wallet and plan data loads.
- Do not let disabled navigation lose onboarding progress.

---

## Layout Modes

### Mode 1: Dashboard with Smith AI Suggestions Rail

This is the default post-onboarding Dashboard state.

```text
Top:
  Global Nav

Left content:
  Page title: Dashboard
  Alert / recommendation banner
  Financial Snapshot
  Safety Buffer
  Projected Growth
  Current vs Recommended Allocation

Right content:
  Smith AI Suggestions
  Suggestion cards
```

Use this when:

- Onboarding is complete.
- Suggestions are available.
- Ask Smith AI is closed.
- Demo Mode may be off or on.
- User is reviewing Dashboard recommendations.

Rules:

- Suggestions rail remains visible on the right.
- Dashboard content remains scrollable.
- Suggestion cards are stacked.
- Top Pick appears first when actionable suggestions exist.
- Alert banner should sync with the top recommendation.
- Ask Smith AI button opens the chat panel state.
- Suggestion cards follow `patterns/suggestion-flow.md`.

---

### Mode 2: Dashboard with Onboarding Panel Open

This is used when onboarding is active or incomplete.

```text
Top:
  Global Nav

Left content:
  Dashboard preview
  Financial Snapshot
  Safety Buffer
  Projected Growth

Right content:
  Onboarding panel
  Progress bar
  Smith AI message
  Onboarding options / inputs
  Undo
  More menu
```

Use this when:

- User has not completed onboarding.
- User is in guided setup.
- User restarts onboarding.
- User connects a wallet while onboarding is active.

Rules:

- Onboarding panel replaces the suggestions rail.
- Onboarding stays open while setup is incomplete.
- Portfolio, Goal, and Support are disabled in Global Nav.
- Progress bar advances by completed onboarding steps.
- Dashboard preview updates as user provides information.
- Dashboard should not be hidden during onboarding on desktop.
- User can undo the previous onboarding step.
- User can restart onboarding from the More menu.
- Wallet connected state may appear in Global Nav while onboarding remains active.

See:

```text
patterns/onboarding-with-smith-ai.md
components/global-nav.md
```

---

### Mode 3: Dashboard with Ask Smith AI Panel Open

This is used when the user opens Smith AI chat/help from the Dashboard.

```text
Top:
  Global Nav

Left content:
  Dashboard content
  Alert / recommendation banner
  Financial Snapshot
  Safety Buffer
  Projected Growth

Right content:
  Ask Smith AI panel
  Smith response
  Feedback buttons
  Quick actions
  Prompt input
  Safety note
```

Use this when:

- User clicks `Ask Smith AI`.
- User asks about a recommendation.
- User wants help understanding risk, buffer, allocation, or suggestions.
- User wants explanation, not execution.

Rules:

- Ask Smith AI panel replaces the suggestion rail.
- Dashboard remains visible and usable.
- Ask Smith AI can explain existing suggestion data.
- Ask Smith AI must not invent deterministic recommendations.
- Ask Smith AI must not execute actions.
- Quick actions should be grounded in current Dashboard/suggestion state.
- Prompt input stays at the bottom of the panel.
- Close button returns to the previous Dashboard right-zone state.
- Ask Smith AI is hidden while onboarding is active.

---

### Mode 4: Pre-Wallet / Start State

This is the state before wallet connection or Demo Mode.

```text
Top:
  Global Nav

Left content:
  Dashboard preview
  Total Portfolio Value: $0
  Net Contributions: $0
  Safety Buffer empty state
  Projected Growth placeholder

Right content:
  Smith introduction / onboarding start
```

Use this when:

- No wallet is connected.
- Demo Mode is not active.
- User has not completed onboarding.

Rules:

- Connect Wallet is primary.
- Try Demo Mode is secondary.
- Dashboard preview should be visible.
- Empty states should explain what is needed.
- Copy must clearly say WealthSmith only reads balances and never moves funds.
- Do not show personalized suggestions yet.
- Do not show protocol recommendations before required data exists.

---

### Mode 5: Demo Mode

Demo Mode can wrap the Dashboard layout.

```text
Top announcement:
  You’re in demo mode.
  Exit Demo

Global Nav:
  Ask Smith AI button
  No wallet pill

Main layout:
  Dashboard shell
  Demo data
  Demo suggestions
```

Rules:

- Demo Mode banner is rendered through `components/announcement.md`.
- Demo Mode banner is not part of Global Nav.
- Demo Mode must be clearly visible.
- Demo data must not be mixed with real wallet data.
- Exiting Demo should remove demo-specific data and suggestions.
- Demo Mode can show suggestions, Top Pick, locked opportunities, and Dashboard values.
- Demo Mode should never imply sample values are the user’s real wallet data.

---

## Top Navigation Rules

Dashboard Layout uses:

```text
components/global-nav.md
```

Global Nav includes:

```text
WealthSmith full logo
Dashboard
Portfolio
Goal
Support
Try Demo Mode
Connect Wallet
Wallet pill
Ask Smith AI
```

Dashboard Layout should pass state into Global Nav:

```json
{
  "active_page": "dashboard",
  "onboarding_active": true,
  "demo_mode": false,
  "wallet": {
    "status": "connected",
    "provider": "phantom",
    "provider_label": "Phantom",
    "address_short": "6fQ9"
  },
  "smith_ai": {
    "ask_available": false
  }
}
```

Rules:

- Active page comes from router/app state.
- Onboarding state comes from onboarding flow state.
- Wallet state comes from wallet connection state.
- Demo Mode state comes from app mode state.
- Dashboard Layout does not infer these states visually.
- Global Nav renders the correct variant.

---

## Left Dashboard Content

The left Dashboard content is the primary financial overview.

Recommended order:

```text
1. Page title
2. Alert / recommendation banner
3. Financial Snapshot
4. Safety Buffer
5. Projected Growth
6. Current vs Recommended Allocation
```

This order keeps the most important summary and safety information above long-form analytics.

---

## Page Title

Use:

```text
Dashboard
```

Rules:

- Page title should be visible.
- Use semantic page heading.
- Do not hide the title when right panel opens.
- Do not change title based on suggestion state.

---

## Alert / Recommendation Banner

The Dashboard may show a recommendation banner near the top.

Examples:

```text
Rebalance Recommendation
You are 15% overexposed to volatile assets. Swap SOL to USDC to realign with your Medium risk profile.
```

```text
Action Required: Fund Your Safety Buffer
Your portfolio is 34% overexposed to volatile assets while your Safety Buffer is underfunded by $7,000.
Swap BONK to USDC now to secure 3 months of protection.
```

Rules:

- Banner should sync with highest-priority suggestion or Top Pick.
- Banner should be dismissible if product supports it.
- Dismissing the banner does not remove the underlying suggestion.
- Banner should not introduce a separate recommendation not present in structured suggestion data.
- Banner should use calm action language.
- Banner must not imply automatic execution.
- Banner must not imply guaranteed returns.
- Banner should be hidden or replaced by empty state if no recommendation exists.

---

## Financial Snapshot

Financial Snapshot includes high-level metrics.

MVP cards:

```text
Total Portfolio Value
Net Contributions
```

Example:

```text
Total Portfolio Value
$35,000
+2.3% this month
Crypto + Stablecoins
```

```text
Net Contributions
$6,200
Invested over the last 12 months
```

Rules:

- Values must come from product/wallet data.
- UI must not invent portfolio value.
- Trend indicators must come from product logic.
- Net Contributions must come from product data.
- Use `components/metric-card.md`.
- Use number typography from numeric/metric typography tokens.
- If data is unavailable, show empty/loading/partial state, not fake values.

---

## Safety Buffer

Safety Buffer communicates stablecoin reserve coverage.

Example complete state:

```text
Safety Buffer
Stablecoin reserve covering 1–6 months of expenses before any investment actions.

82%  2.8/3 months
[progress bar]
Covered Buffer
```

Example fully funded state:

```text
100%  3/3 months
Covered Buffer
```

Example empty state:

```text
Build your safety net first
Add your monthly expenses and risk tolerance to see your safety buffer target.
```

Rules:

- Safety Buffer calculation comes from product logic.
- Dashboard should update as income/expenses/risk inputs are saved.
- Do not calculate buffer in UI component code.
- Underfunded buffer should influence suggestion priority.
- Use clear month coverage labels.
- Card content order: title, main metric (coverage percent + current-of-target values), progress bar, explanation/error text, then the centered Covered Buffer legend at the bottom.
- The Covered Buffer legend uses the approved dot marker (`assets/icons/chart/chart-dot-marker.svg`) paired with visible text, horizontally centered, placed after the explanation text.
- Do not imply funds are held by WealthSmith.
- Do not imply stablecoin reserves are risk-free.
- Do not hide underfunded state.

---

## Projected Growth

Projected Growth shows modeled plan trajectory.

Example:

```text
Projected Growth
Modeled using your strategy settings over your selected timeline
```

Rules:

- Projection data comes from product logic.
- Use modeled/estimated language.
- Do not use guaranteed language.
- Chart should be readable and accessible.
- The MVP Dashboard Projected Growth chart uses milestone x-axis spacing: visible milestone labels (Year 0, Year 1, Year 3, Year 5) are evenly distributed across the x-axis, and each milestone's data point, value label, and axis label share the same x-position. See `components/chart.md` (Axis Label Positioning).
- Chart legend should have visible labels.
- The legend (approved line marker + series label) is horizontally centered at the bottom of the card content.
- Do not rely on chart color alone.
- If projection data is unavailable, show placeholder or empty state.
- If projection update is fast, do not show loading.
- If projection update takes noticeable time, use subtle loading or skeleton.

Avoid:

```text
Guaranteed growth
You will reach
Profit forecast
```

---

## Current vs Recommended Allocation

This section compares current allocation with WealthSmith’s recommended allocation for the user’s plan.

Example:

```text
Current vs Recommended Allocation
Compare your current asset mix with what WealthSmith recommends for your profile.
```

Rules:

- Current allocation comes from wallet/portfolio data.
- Recommended allocation comes from deterministic product logic.
- UI must not calculate recommended allocation independently.
- Chart should clearly label current vs recommended.
- Use chart markers and legends with visible labels.
- The section description (for example “Recommended allocation is based on your saved plan settings.”) sits directly under the section heading.
- The chart legend sits horizontally centered at the bottom of the card content, below the chart body, using approved dot markers paired with visible text.
- The legend must not appear between the heading and the chart body.
- Do not present recommendation as guaranteed or risk-free.
- If there is not enough data, show an empty or incomplete state.

See `components/chart.md` (Chart Container and Legends) for the shared placement contract.

---

## Right Zone: Smith AI Surface

The right zone is reserved for Smith AI-related surfaces.

Allowed right-zone modes:

```text
smith_ai_suggestions
onboarding
ask_smith_ai
smith_ai_strategy_insights
loading_suggestions
empty_suggestions
error_suggestions
```

Only one right-zone mode should be active at a time.

Rules:

- Do not show Onboarding and Ask Smith AI at the same time.
- Do not show Ask Smith AI and Suggestion rail at the same time.
- Do not show duplicate Smith AI headers.
- Returning from Ask Smith AI should restore the previous right-zone mode.
- Onboarding has priority when onboarding is incomplete.
- Suggestions rail appears after onboarding when suggestions exist.
- Strategy Insights can appear instead of actionable suggestion cards if the product returns insight-style content.

---

## Right Zone Priority Rules

Right-zone mode priority:

```text
1. Onboarding if active/incomplete
2. Ask Smith AI if opened by user and onboarding is not active
3. Loading suggestions if suggestion generation is meaningfully delayed
4. Smith AI Suggestions if actionable suggestions exist
5. Smith AI Strategy Insights if insight results exist
6. Empty suggestions state
7. Error state
```

Rules:

- Onboarding active overrides Ask Smith AI.
- Ask Smith AI button is hidden during active onboarding.
- User-opened Ask Smith AI can temporarily override Suggestions after onboarding.
- Loading suggestions should not appear for fast results.
- Empty state should explain what is missing.
- Error state should keep Dashboard usable.

---

## Smith AI Suggestions Rail

Header example:

```text
Smith AI Suggestions
Personalized based on your plan
```

Rules:

- Use after onboarding when actionable suggestions are available.
- Top Pick card appears first.
- Suggestion cards stack vertically.
- Cards are clickable if actionable and protocol-backed.
- MVP click opens protocol page in a new tab.
- No transaction executes from suggestion card click.
- No wallet signature is requested from suggestion card click.
- Rail should remain scrollable if cards exceed viewport.
- Dashboard left content should remain scrollable independently or safely with the page.

See:

```text
patterns/suggestion-flow.md
components/suggestion-card.md
```

---

## Onboarding Panel

Header:

```text
Onboarding
```

Structure:

```text
Header with Undo and More
Progress bar
Smith symbol
Message
Question/options/input
Actions
```

Rules:

- Appears when onboarding is active.
- Replaces suggestions rail.
- Progress bar advances by completed steps.
- Dashboard preview updates as answers are saved.
- Global Nav disables Portfolio, Goal, and Support.
- Undo reverts previous step when possible.
- More menu includes Restart Onboarding.
- Onboarding should not feel like a generic chat.
- Onboarding state should persist across nav changes.
- The onboarding panel uses the same right-rail sizing/anchoring as the Ask
  Smith AI panel (see `components/sidebar.md` — Panel Sizing and Anchoring):
  on desktop/wide it is sticky with a viewport-aware height, does not collapse
  to content height, does not extend below the viewport, keeps the same bottom
  page padding, and scrolls its body internally when needed.

See:

```text
patterns/onboarding-with-smith-ai.md
components/global-nav.md
```

---

## Ask Smith AI Panel

Header:

```text
Ask Smith AI
```

Structure:

```text
Header with More and Close
Smith response
Feedback actions
Quick actions
Prompt input
Safety note
```

Example response:

```text
Based on your current plan, you’re 8% overweight in volatile assets.
Would you like to rebalance or keep this exposure?
```

Quick actions:

```text
Rebalance now
Review suggested trades
Keep exposure
```

Safety note:

```text
Smith AI can make mistakes. Check important info.
```

Rules:

- Opens when user clicks `Ask Smith AI`.
- Replaces suggestions rail.
- Dashboard remains visible.
- Close returns to prior right-zone mode.
- On desktop/wide, the panel behaves like a persistent assistant sidebar:
  sticky (fixed-like) inside the app shell, fitting inside the viewport so
  its bottom edge never goes below the visible screen. Height is
  `100dvh − panelTopOffset − panelBottomOffset`, where `panelTopOffset`
  accounts for the Global Nav (outer offset + nav height) plus
  `spacing.page.padding.desktop`, and `panelBottomOffset` is
  `spacing.page.padding.desktop`; the sticky `top` uses the same
  `panelTopOffset` so top and bottom spacing stay consistent whether or not
  the page has scrolled. The panel never collapses to content height and
  stays anchored while the main dashboard content scrolls. The container is
  `overflow: hidden` flex-column with `min-height: 0`; the conversation
  area is `flex: 1; min-height: 0; overflow-y: auto`; header and the
  prompts/input footer do not shrink. See `components/sidebar.md`
  (Smith AI Companion Panel — Panel Sizing and Anchoring).
- On mobile/tablet, the panel is an overlay or drawer (not a narrow side
  panel), respects safe-area and bottom padding, and always shows a
  visible close action.
- Quick actions must be grounded in current plan/suggestion state.
- Ask Smith AI may explain suggestions and Dashboard values.
- Ask Smith AI must not invent deterministic suggestions.
- Ask Smith AI must not execute transactions.
- Ask Smith AI must not move funds.
- Ask Smith AI must not ask for wallet signature unless a separate product flow explicitly requires it.
- Ask Smith AI is not available while onboarding is active.

---

## Smith AI Strategy Insights

Header example:

```text
Smith AI Strategy Insights
Aligned with your Medium-risk profile
```

Use when the right zone displays insight cards instead of action cards.

Examples:

```text
Goal Check: Retire Early?
Expense Benchmark
Safety Buffer: 100% Funded
Strategy: Defensive
```

Rules:

- Strategy Insights can be informational.
- They do not need protocol click-through.
- They should be grounded in current plan and product logic.
- Do not present insight cards as executable actions unless they are actionable suggestions.
- Do not invent market posture or risk state in UI code.

---

## Demo Mode Banner

Demo Mode banner appears above Global Nav.

Example:

```text
You’re in demo mode.
Exit Demo
```

Rules:

- Use `components/announcement.md`.
- Banner should be persistent while demo mode is active.
- Exit Demo should be available.
- Demo Mode banner should not hide Global Nav.
- Demo data must not be mixed with real wallet data.
- Demo suggestions must be clearly demo-derived.
- Dismissing demo banner should not hide the fact that Demo Mode is active unless product provides another persistent indicator.

---

## Loading Rules

Dashboard layout follows global loading delay rules.

```text
0–400ms:
  No loading UI.

400–800ms:
  Subtle pending only if needed.

800ms+:
  Explicit loading state.

1.5s+:
  Full explanatory loading with copy.
```

Rules:

- Do not show loading for instant tab switches.
- Do not show loading for immediate field updates.
- Do not show Smith AI animation for wallet connection.
- Do not show Smith AI animation for generic Dashboard refresh.
- Use Smith AI animation only for meaningful Smith AI/suggestion-building waits.
- Use skeletons for chart/card/table loading when needed.
- Avoid flicker by keeping shown loading visible for 500–700ms.

---

## Empty States

Pre-wallet Dashboard:

```text
Total Portfolio Value: $0
Net Contributions: $0
Safety Buffer empty state
Projected Growth placeholder
```

Safety Buffer empty state:

```text
Build your safety net first
Add your monthly expenses and risk tolerance to see your safety buffer target.
```

Suggestions empty state:

```text
No suggestions yet
Complete your plan or connect a wallet to generate personalized suggestions.
```

Rules:

- Empty states should explain what is missing.
- Provide one clear next action.
- Do not show fake values.
- Do not show protocol suggestions without required data.
- Do not confuse empty state with error state.

---

## Toasts

Dashboard can show toast notifications.

Examples:

```text
Wallet connected
Wallet disconnected
Goal settings saved
```

Rules:

- Toasts should be short.
- Toasts should not block the Dashboard.
- Toasts should be dismissible.
- Toasts should not replace persistent state.
- Wallet disconnected toast should not imply funds moved.
- Toasts should be announced politely to assistive technologies.

---

## Responsive Behavior

### Desktop

Desktop layout:

```text
Global Nav full width within page offset
Main content grid:
  Left dashboard content
  Right Smith AI surface
```

Rules:

- Right surface stays visible.
- Left content uses available width.
- Global Nav remains stable.
- Page scroll should be predictable.
- Suggestion rail can scroll if content exceeds viewport.
- Dashboard content can extend below fold.

### Wide

Wide layout:

- Keep content constrained to max width.
- Do not stretch cards excessively.
- Maintain readable line lengths.
- Right rail should remain visually connected to Dashboard.

### Tablet

Tablet layout:

- Right rail may remain side-by-side if width allows.
- Otherwise, Smith AI surface may become drawer/overlay.
- Keep primary dashboard summary visible.
- Avoid cramped two-column metric cards if space is limited.

### Mobile

Mobile layout:

- Use single-column content.
- Smith AI surfaces should become overlay, drawer, or stacked panel.
- Ask Smith AI should not permanently cover critical Dashboard content unless intentionally opened.
- Suggestion cards should be full-width.
- Global Nav compact/mobile behavior should not be invented without product approval.
- Wallet pill may collapse or move into menu only if a mobile nav spec exists.

---

## Spacing and Sizing

Use semantic layout and spacing tokens.

Do not hardcode raw values repeatedly.

Use:

```text
spacing.layout.page.mobile
spacing.layout.page.desktop
spacing.component.card.padding
spacing.stack.section
radius.card
shadow.card
breakpoint.desktop
```

Global Nav explicit MVP values should be mapped to semantic tokens:

```text
size.globalNav.height = 64px
radius.globalNav = 16px
spacing.globalNav.outerOffset = 24px
spacing.globalNav.contentPaddingX = 12px
size.logo.fullLockup.width = 221px
size.logo.fullLockup.height = 32px
```

Rules:

- Page padding follows layout guidelines.
- Cards align to grid.
- Section spacing is consistent.
- Right panel uses the same card language as core surfaces.
- Charts should not overflow their cards.

---

## Data Requirements

Dashboard layout expects structured data.

Example:

```json
{
  "app": {
    "active_page": "dashboard",
    "demo_mode": false
  },
  "wallet": {
    "status": "connected",
    "provider": "phantom",
    "address_short": "6fQ9",
    "mode": "real"
  },
  "onboarding": {
    "active": false,
    "status": "complete"
  },
  "dashboard": {
    "portfolio_value": 35000,
    "portfolio_change_month": 0.023,
    "net_contributions_12m": 6200,
    "safety_buffer": {
      "coverage_percent": 82,
      "covered_months": 2.8,
      "target_months": 3
    },
    "projected_growth": {
      "status": "available",
      "series": []
    }
  },
  "right_panel": {
    "mode": "smith_ai_suggestions"
  }
}
```

Rules:

- Layout renders data.
- Product logic computes data.
- Components should not calculate financial values on their own.
- Missing values require empty/partial/loading/error state.

---

## Related Patterns

Dashboard Layout works with:

```text
patterns/onboarding-with-smith-ai.md
patterns/suggestion-flow.md
patterns/portfolio-overview.md
patterns/wallet-connection.md
patterns/goal-settings.md
patterns/support-center.md
patterns/empty-loading-error-states.md
```

Rules:

- Dashboard Layout should not duplicate full rules from related patterns.
- It should reference the correct pattern for detailed behavior.
- Global app shell rules belong here.
- Specific workflow rules belong in their own pattern files.

---

## Components Used

Primary components:

```text
components/global-nav.md
components/page-header.md
components/card.md
components/metric-card.md
components/progress-bar.md
components/chart.md
components/alert.md
components/announcement.md
components/suggestion-card.md
components/loading-indicator.md
components/skeleton.md
components/toast.md
components/button.md
components/menu-popover.md
components/icon.md
components/logo.md
```

Rules:

- Use `global-nav.md` for navigation.
- Use `announcement.md` for Demo Mode banner.
- Use `suggestion-card.md` for suggestion rail.
- Use `progress-bar.md` for Safety Buffer and onboarding progress.
- Use `chart.md` for Projected Growth and allocation charts.
- Use `alert.md` for top recommendation banner.

---

## Assets Used

Logo:

```text
assets/logo/wealthsmith-full-lockup.svg
assets/logo/wealthsmith-symbol.svg
```

Icons:

```text
assets/icons/ui/
assets/icons/wallet/
assets/icons/protocol/
assets/icons/token/
assets/icons/fallback/fallback-token.svg
```

Animation:

```text
assets/animations/smith-ai-symbol-loop.json
```

Rules:

- Full lockup is rendered by Global Nav.
- Smith symbol is used inside Smith AI surfaces.
- Smith AI animation is used only for meaningful suggestion-building waits.
- Do not invent asset paths.
- Do not show broken images.

---

## Accessibility

Rules:

- Use semantic landmarks.
- Global Nav should be keyboard accessible.
- Active navigation item should be programmatically exposed.
- Disabled onboarding nav items should be programmatically disabled or safely non-interactive.
- Right panel heading should describe current mode.
- Suggestion cards should be keyboard accessible if clickable.
- Ask Smith AI close button should have accessible label.
- More menu should be keyboard accessible.
- Wallet pill should expose provider and shortened address text.
- Charts should include text summaries or accessible labels.
- Alerts should be announced when relevant.
- Toasts should use polite announcement.
- Do not rely on color alone.
- Respect reduced motion.

Example:

```text
nav aria-label="Primary navigation"
```

Example active nav item:

```text
aria-current="page"
```

Example right-panel label:

```text
aria-label="Smith AI Suggestions"
```

Example Ask Smith AI close label:

```text
aria-label="Close Ask Smith AI panel"
```

---

## State Requirements

Dashboard supports these states:

```text
pre_wallet
wallet_connected
wallet_disconnected
demo_mode
onboarding_open
onboarding_complete
suggestions_loading
suggestions_ready
suggestions_empty
suggestions_error
ask_smith_ai_open
strategy_insights_ready
dashboard_partial_data
dashboard_error
```

Every state should define:

```text
Global Nav variant
left content visibility
right panel mode
loading behavior
empty/error behavior
accessibility behavior
```

---

## Security and Wallet Safety

Rules:

- Never ask for seed phrases.
- Never ask for private keys.
- Never imply WealthSmith holds funds.
- Never imply wallet connection moves funds.
- Never imply suggestion clicks execute transactions.
- Never request wallet signature from suggestion card clicks.
- Wallet connection is read-only for MVP.
- Suggestion cards and Manage links open protocol pages in a new tab for MVP.

---

## Claude Code Rules

Claude Code should:

- Use `components/global-nav.md` for top navigation.
- Keep left Dashboard content stable when right panel changes.
- Render only one right-panel mode at a time.
- Use onboarding pattern when onboarding is active.
- Use suggestion-flow pattern when suggestions are shown.
- Use approved assets and registries.
- Use semantic tokens.
- Keep Dashboard usable while Smith AI is open.
- Keep Dashboard usable while suggestions load.
- Use delay rules before showing loading.
- Preserve Demo Mode banner when active.
- Render wallet pill from wallet state.
- Render Ask Smith AI from state only when allowed.
- Disable Portfolio, Goal, and Support during active onboarding.
- Preserve accessible labels and keyboard behavior.

Claude Code must not:

- Recreate Global Nav locally.
- Invent Global Nav variants.
- Invent dashboard financial values.
- Invent suggestion data.
- Invent Top Pick.
- Invent wallet state.
- Mix demo and real data.
- Use Smith AI animation for generic loading.
- Show multiple right panels at once.
- Hide Dashboard content when Ask Smith AI opens on desktop.
- Execute transactions from suggestions.
- Request wallet signature from suggestion card click.
- Hardcode raw layout values repeatedly.
- Recreate logo as text.
- Allow disabled onboarding nav links to navigate.
- Show Ask Smith AI button during active onboarding.

---

## Do

- Use Global Nav as the official top navigation.
- Keep the top navigation stable.
- Use the full WealthSmith lockup in Global Nav.
- Keep Dashboard as the left anchor.
- Use the right zone for Smith AI surfaces.
- Show Suggestions by default after onboarding.
- Replace Suggestions with Onboarding when onboarding is active.
- Replace Suggestions with Ask Smith AI when user opens chat after onboarding.
- Let user close Ask Smith AI and return to previous right-zone state.
- Show Demo Mode clearly above Global Nav.
- Keep copy calm and specific.
- Preserve accessibility.

---

## Do Not

- Do not make Dashboard feel like a chat-only interface.
- Do not hide Financial Snapshot behind Smith AI on desktop.
- Do not show loading for fast state updates.
- Do not use suggestion rail for onboarding questions.
- Do not use Ask Smith AI as deterministic logic.
- Do not show protocol suggestions before data exists.
- Do not use demo values as real values.
- Do not let right rail change active nav unexpectedly.
- Do not use icons without labels for identity.
- Do not imply custody, automatic action, or guaranteed outcomes.
- Do not duplicate Global Nav logic outside `components/global-nav.md`.

---

## Done Criteria

This pattern is implemented correctly when:

- Global Nav is used as the top navigation component.
- Global Nav appears with correct spacing and sizing.
- Top navigation is stable across Dashboard modes.
- Dashboard content remains visible on desktop.
- Smith AI Suggestions rail appears after onboarding when suggestions exist.
- Onboarding panel replaces Suggestions when onboarding is active.
- Active onboarding disables Portfolio, Goal, and Support in Global Nav.
- Ask Smith AI panel replaces Suggestions when opened after onboarding.
- Ask Smith AI is hidden during active onboarding.
- Closing Ask Smith AI restores the prior right-panel mode.
- Demo Mode banner is visible above Global Nav when demo mode is active.
- Wallet pill reflects connected wallet state.
- Pre-wallet state shows Try Demo Mode and Connect Wallet.
- Dashboard sections render structured data.
- Right panel never invents financial logic.
- Loading appears only for meaningful waits.
- Responsive behavior works across mobile, tablet, desktop, and wide.
- Accessibility requirements are met.
