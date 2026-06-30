# Dashboard Layout

This pattern defines the WealthSmith dashboard layout across the main app states:

- Dashboard with Smith AI Suggestions rail
- Dashboard with Onboarding panel open
- Dashboard with Ask Smith AI panel open
- Dashboard in pre-wallet / onboarding-start state
- Dashboard in Demo Mode
- Dashboard across responsive breakpoints

The dashboard is the main WealthSmith home surface.

It combines financial snapshot, safety buffer, projected growth, allocation insights, suggestions, and Smith AI guidance.

---

## Purpose

The dashboard should give users a clear, calm, and actionable view of their financial position.

It should answer:

- What is my portfolio worth?
- Am I protected by enough stablecoin safety buffer?
- How is my plan projected to grow?
- What is WealthSmith suggesting next?
- Why is WealthSmith suggesting it?
- Can I ask Smith AI for help?
- Am I in demo mode or using real wallet data?

The dashboard should make WealthSmith feel like a trustworthy financial workspace, not a trading terminal.

---

## Core Layout Principle

The dashboard has two main zones:

```text
Left zone:
  Main dashboard content

Right zone:
  Smith AI surface
```

The right zone can show different Smith AI states:

```text
Smith AI Suggestions
Onboarding
Ask Smith AI
Smith AI Strategy Insights
```

The left zone remains stable while the right zone changes.

This keeps the user oriented.

---

## Layout Modes

### Mode 1: Dashboard with Suggestions Rail

This is the default post-onboarding dashboard state.

```text
Top navigation:
  WealthSmith logo
  Dashboard / Portfolio / Goal / Support
  Wallet pill
  Ask Smith AI button

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
- Onboarding panel is closed.
- The user is reviewing dashboard recommendations.

Rules:

- Suggestions rail remains visible on the right.
- Dashboard content remains scrollable.
- Suggestion cards are stacked.
- Top Pick appears first when actionable suggestions exist.
- Alert banner should sync with the top recommendation.
- Ask Smith AI button opens the chat panel state.

---

### Mode 2: Dashboard with Onboarding Open

This is used when onboarding is active or incomplete.

```text
Top navigation:
  WealthSmith logo
  Dashboard / Portfolio / Goal / Support
  Try Demo Mode + Connect Wallet
  or wallet pill if already connected

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
- User is in the guided setup flow.
- User restarts onboarding.
- User opens onboarding from a current setup state.

Rules:

- Onboarding panel replaces the suggestions rail.
- Onboarding stays open while the user completes setup.
- Progress bar advances by completed onboarding steps.
- Dashboard preview updates as user provides information.
- Dashboard should not be hidden during onboarding on desktop.
- User can undo the previous onboarding step.
- User can restart onboarding from the More menu.
- Opening Portfolio or Goal during onboarding should preserve onboarding state.

---

### Mode 3: Dashboard with Ask Smith AI Open

This is used when the user opens Smith AI chat/help from the dashboard.

```text
Top navigation:
  WealthSmith logo
  Dashboard / Portfolio / Goal / Support
  Wallet pill
  Ask Smith AI button

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
- Quick actions should be grounded in current dashboard/suggestion state.
- Prompt input stays at the bottom of the panel.
- Close button returns to the previous dashboard right-rail state.

---

### Mode 4: Pre-Wallet / Start State

This is the state before wallet connection or demo mode.

```text
Top navigation:
  WealthSmith logo
  Dashboard / Portfolio / Goal / Support
  Try Demo Mode
  Connect Wallet

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
- User has not started or completed onboarding.

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

Demo Mode can wrap the dashboard layout.

```text
Top announcement:
  You’re in demo mode.
  Exit Demo

Main layout:
  Same dashboard shell
  Demo data
  Demo suggestions
```

Rules:

- Demo Mode must be clearly visible.
- Demo data must not be mixed with real wallet data.
- Exiting Demo should remove demo-specific data and suggestions.
- Demo Mode can show suggestions, Top Pick, locked opportunities, and dashboard values.
- Demo Mode should never imply that sample values are the user’s real wallet data.

---

## Top Navigation

The top navigation appears at the top of the app shell.

It includes:

```text
WealthSmith logo
Dashboard
Portfolio
Goal
Support
Wallet pill or start actions
Ask Smith AI button when available
```

### Logo

Use:

```text
assets/logo/wealthsmith-full-lockup.svg
```

Rules:

- Use the full lockup in the expanded top navigation.
- Do not recreate the logo as text.
- Do not recolor, stretch, crop, or decorate the logo.
- Logo may link to Dashboard if product supports it.

### Navigation Tabs

MVP nav items:

```text
Dashboard
Portfolio
Goal
Support
```

Rules:

- Active nav item should be visually clear.
- Active nav item should be exposed programmatically.
- Do not rely on color alone.
- Navigation should remain stable across dashboard modes.
- Onboarding and Ask Smith AI panel changes should not unexpectedly change the active page tab.
- Opening Portfolio or Goal from onboarding should update the active nav tab.

### Wallet / Start Actions

Before wallet or demo:

```text
Try Demo Mode
Connect Wallet
```

After wallet:

```text
[wallet icon] Phantom • 6fQ9
Ask Smith AI
```

Rules:

- Wallet pill shows wallet icon, provider name, and shortened address.
- Wallet pill does not imply custody.
- Wallet pill does not imply signing.
- Wallet pill does not imply WealthSmith can move funds.
- Ask Smith AI appears when Smith AI help is available.
- Ask Smith AI opens the right-side Ask Smith AI panel.

---

## Left Dashboard Content

The left dashboard content is the primary financial overview.

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

The dashboard may show a recommendation banner near the top.

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
- Use metric cards.
- Use number typography from numeric/metric typography tokens.
- If data is unavailable, show empty or loading state, not fake values.

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
- Chart legend should have visible labels.
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
- Do not present recommendation as guaranteed or risk-free.
- If there is not enough data, show an empty or incomplete state.

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
- Undo reverts previous step when possible.
- More menu includes Restart Onboarding.
- Onboarding should not feel like a generic chat.
- Onboarding state should persist across nav changes.

See:

```text
patterns/onboarding-with-smith-ai.md
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
- Quick actions must be grounded in current plan/suggestion state.
- Ask Smith AI may explain suggestions and dashboard values.
- Ask Smith AI must not invent deterministic suggestions.
- Ask Smith AI must not execute transactions.
- Ask Smith AI must not move funds.
- Ask Smith AI must not ask for wallet signature unless a separate product flow explicitly requires it.

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

## Right Zone Priority Rules

Right-zone mode priority:

```text
1. Onboarding if active/incomplete
2. Ask Smith AI if opened by user
3. Loading suggestions if suggestion generation is meaningfully delayed
4. Smith AI Suggestions if actionable suggestions exist
5. Smith AI Strategy Insights if insight results exist
6. Empty suggestions state
7. Error state
```

Rules:

- User-opened Ask Smith AI can temporarily override Suggestions.
- Onboarding should remain visible until completed, dismissed, or explicitly closed.
- Loading suggestions should not appear for fast results.
- Empty state should explain what is missing.
- Error state should keep Dashboard usable.

---

## Loading Rules

Dashboard layout should follow global loading delay rules.

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
```

Rules:

- Toasts should be short.
- Toasts should not block the dashboard.
- Toasts should be dismissible.
- Toasts should not replace persistent state.
- Wallet disconnected toast should not imply funds moved.
- Toasts should be announced politely to assistive technologies.

---

## Demo Mode Banner

Demo Mode banner appears above the main app shell.

Example:

```text
You’re in demo mode.
Exit Demo
```

Rules:

- Banner should be persistent while demo mode is active.
- Exit Demo should be available.
- Demo Mode banner should not hide navigation.
- Demo data must not be mixed with real wallet data.
- Demo suggestions must be clearly demo-derived.
- Dismissing demo banner should not hide the fact that Demo Mode is active unless product provides another persistent indicator.

---

## Responsive Behavior

### Desktop

Desktop layout:

```text
Top nav full width
Main content grid:
  Left dashboard content
  Right Smith AI surface
```

Rules:

- Right surface stays visible.
- Left content uses available width.
- Top nav remains stable.
- Page scroll should be predictable.
- Suggestion rail can scroll if content exceeds viewport.
- Dashboard content can extend below fold.

### Wide

Wide layout:

- Keep content constrained to max width.
- Do not stretch cards excessively.
- Maintain readable line lengths.
- Right rail should remain visually connected to dashboard.

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
- Ask Smith AI should not permanently cover critical dashboard content unless intentionally opened.
- Suggestion cards should be full-width.
- Wallet pill may collapse or move into menu if needed.
- Navigation may become compact.

---

## Spacing and Sizing

Use semantic layout and spacing tokens.

Do not hardcode raw values.

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

Do not use:

```text
32px
1280px
12px radius
#FFFFFF
```

Rules:

- Page padding follows layout guidelines.
- Cards align to grid.
- Section spacing is consistent.
- Right panel uses the same card language as core surfaces.
- Charts should not overflow their cards.

---

## Data Requirements

Dashboard layout expects structured data:

```json
{
  "wallet": {
    "status": "connected",
    "provider": "phantom",
    "address_short": "6fQ9",
    "mode": "real"
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
- Missing values require empty/partial/loading state.

---

## Accessibility

Rules:

- Use semantic landmarks.
- Top nav should be keyboard accessible.
- Active navigation item should be programmatically exposed.
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
top nav actions
left content visibility
right panel mode
loading behavior
empty/error behavior
accessibility behavior
```

---

## Claude Code Rules

Claude Code should:

- Use this pattern for the authenticated Dashboard shell.
- Keep left dashboard content stable when right panel changes.
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
- Render Ask Smith AI from state.
- Preserve accessible labels and keyboard behavior.

Claude Code must not:

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
- Hardcode raw layout values.
- Recreate logo as text.

---

## Do

- Keep the top navigation stable.
- Use the full WealthSmith lockup in the header.
- Keep Dashboard as the left anchor.
- Use the right zone for Smith AI surfaces.
- Show Suggestions by default after onboarding.
- Replace Suggestions with Onboarding when onboarding is active.
- Replace Suggestions with Ask Smith AI when user opens chat.
- Let user close Ask Smith AI and return to previous right-zone state.
- Show Demo Mode clearly.
- Keep copy calm and specific.
- Preserve accessibility.

---

## Do Not

- Do not make Dashboard feel like a chat-only interface.
- Do not hide financial snapshot behind Smith AI on desktop.
- Do not show loading for fast state updates.
- Do not use suggestion rail for onboarding questions.
- Do not use Ask Smith AI as deterministic logic.
- Do not show protocol suggestions before data exists.
- Do not use demo values as real values.
- Do not let right rail change active nav unexpectedly.
- Do not use icons without labels for identity.
- Do not imply custody, automatic action, or guaranteed outcomes.

---

## Done Criteria

This pattern is implemented correctly when:

- Top navigation is stable across Dashboard modes.
- Dashboard content remains visible on desktop.
- Smith AI Suggestions rail appears after onboarding when suggestions exist.
- Onboarding panel replaces Suggestions when onboarding is active.
- Ask Smith AI panel replaces Suggestions when opened.
- Closing Ask Smith AI restores the prior right-panel mode.
- Demo Mode banner is visible when demo mode is active.
- Wallet pill reflects connected wallet state.
- Pre-wallet state shows Try Demo Mode and Connect Wallet.
- Dashboard sections render structured data.
- Right panel never invents financial logic.
- Loading appears only for meaningful waits.
- Responsive behavior works across mobile, tablet, desktop, and wide.
- Accessibility requirements are met.
