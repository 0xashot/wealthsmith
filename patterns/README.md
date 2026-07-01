# Patterns

Patterns describe how WealthSmith components, assets, tokens, content rules, and product logic work together across full product experiences.

Components are reusable UI building blocks.

Patterns are reusable product flows and screen-level behaviors.

Use patterns to help engineers and AI coding tools build WealthSmith screens consistently without guessing how pieces should connect.

---

## Purpose

The `patterns/` folder documents repeatable WealthSmith experiences such as:

- Dashboard layout
- Onboarding with Smith AI
- Suggestion generation and display
- Portfolio overview
- Wallet connection
- Goal settings
- Support center
- Empty, loading, partial, stale, and error states

Patterns should explain:

- Which components are used
- Which assets are used
- Which product logic controls the flow
- Which copy rules apply
- Which states must be supported
- Which accessibility rules matter
- What Claude Code must not invent

Patterns do not replace product logic.

Patterns describe how deterministic logic is rendered and explained.

---

## Core Principle

WealthSmith has three distinct layers:

```text
Suggestion Engine = deterministic Brain
Protocol Logic = protocol/platform selection
Top Pick Logic = one highest-priority suggestion
Smith AI = explanatory Voice
UI = Renderer
```

Patterns must preserve this separation.

The UI should render structured data.

Smith AI should explain structured data.

The Suggestion Engine should produce deterministic recommendations, priorities, rankings, and Top Pick.

Claude Code must not move business logic into components or patterns.

---

## MVP Pattern Structure

Current MVP pattern folder:

```text
patterns/
  README.md
  dashboard-layout.md
  onboarding-with-smith-ai.md
  suggestion-flow.md
  portfolio-overview.md
  wallet-connection.md
  goal-settings.md
  support-center.md
  empty-loading-error-states.md
```

This is the MVP-ready pattern set.

Future pattern files can be added only when the product introduces a repeated experience that needs shared implementation guidance.

---

## Pattern Files

### Dashboard Layout

File:

```text
patterns/dashboard-layout.md
```

Purpose:

Defines the authenticated WealthSmith app shell and dashboard layout across the major right-panel states.

Covers:

```text
Global Nav
Dashboard content
Smith AI Suggestions rail
Onboarding panel
Ask Smith AI panel
Demo Mode banner
Wallet pill
Pre-wallet state
Responsive behavior
```

Important rules:

- Dashboard remains the left anchor on desktop.
- Right panel shows exactly one Smith AI surface at a time.
- Onboarding replaces suggestions when onboarding is active.
- Ask Smith AI replaces suggestions when opened.
- Demo Mode banner stays clearly visible.
- Dashboard does not invent financial values.

Primary component:

```text
components/global-nav.md
```

---

### Onboarding with Smith AI

File:

```text
patterns/onboarding-with-smith-ai.md
```

Purpose:

Defines how onboarding works with Smith AI visible as a continuous guided companion.

Covers:

```text
Wallet connection prompt
Demo Mode prompt
Goal selection
Time horizon
Risk tolerance
Income
Expenses
Contribution rhythm
Contribution amount
Review summary
Live dashboard updates
Onboarding progress bar
Undo
Restart onboarding
```

Important rules:

- Smith AI remains open during onboarding.
- During active onboarding, Portfolio, Goal, and Support are disabled in Global Nav.
- Smith AI explains each step, but does not own deterministic product logic.
- Onboarding collects structured user inputs.
- Dashboard and Portfolio update only from product logic.
- Loading appears only for meaningful waits.
- No action is taken automatically.

---

### Suggestion Flow

File:

```text
patterns/suggestion-flow.md
```

Purpose:

Defines how suggestions are built, loaded, ranked, displayed, explained, and opened.

Covers:

```text
Smith AI Suggestions rail
Smith AI Strategy Insights
Top Pick
Dashboard alert sync
Safety Buffer priority
Locked suggestions
Demo Mode suggestions
Actionable protocol card click behavior
Loading behavior
```

Important rules:

- Suggestion Engine decides suggestions.
- Top Pick Logic selects exactly one Top Pick.
- Protocol Logic selects protocol/platform destination.
- Smith AI explains suggestions, but does not invent recommendation logic.
- MVP suggestion cards open the relevant protocol page in a new tab.
- Suggestion card click is a handoff, not execution.
- No transaction executes from a suggestion card.
- No wallet signature is requested from a suggestion card click.
- Loading is skipped when suggestions are ready quickly.

---

### Portfolio Overview

File:

```text
patterns/portfolio-overview.md
```

Purpose:

Defines how wallet balances, token holdings, staked assets, yield strategies, and allocation are displayed.

Covers:

```text
Balance Overview
Crypto Assets Allocation
Asset Deployment Overview
Liquid Assets table
Staked Assets table
Yield Strategies table
Manage links
Right-side Smith AI Suggestions rail
```

Important rules:

- Portfolio values come from wallet/protocol/price data.
- UI does not invent balances, APY, earnings, or positions.
- Token icons must be paired with token symbols/names.
- Missing token icons use fallback token icon.
- Missing protocol/wallet icons are implementation issues.
- Staked assets and yield strategies are clearly labeled.
- Manage links open protocol pages in a new tab for MVP.
- Portfolio page is read-only for MVP.

---

### Wallet Connection

File:

```text
patterns/wallet-connection.md
```

Purpose:

Defines how users connect supported wallets and how wallet-related states are displayed.

Covers:

```text
Connect Wallet modal
Phantom / Solflare / Backpack wallet options
Read-only wallet copy
Wallet connected state
Wallet pill
Wallet menu
Disconnect Wallet
Wallet connected/disconnected toasts
Ledger/message-signing considerations
Demo Mode relationship
```

Important rules:

- Supported MVP wallets are Phantom, Solflare, and Backpack.
- Wallet connection is read-only for MVP.
- Wallet connection does not imply custody.
- Wallet connection does not imply funds can move.
- Basic portfolio viewing should not require signatures if avoidable.
- Wallet pill format is `{Provider} • {short address}`.
- Demo Mode is separate from real wallet data.
- Never ask for seed phrases or private keys.

---

### Goal Settings

File:

```text
patterns/goal-settings.md
```

Purpose:

Defines the Goal page where users review and edit the structured plan inputs that personalize WealthSmith.

Covers:

```text
Goal page layout
View Mode
Edit Mode
Financial Goal
Risk Tolerance
Income
Expenses
Monthly Saving Goal
Contribution Frequency
Timeline
Save Changes
Discard Changes
Validation
Derived refresh behavior
```

Important rules:

- Goal page edits update structured plan state.
- Monthly Saving Goal is optional.
- Income and Expenses affect Safety Buffer and saving potential through product logic.
- Risk Tolerance affects recommendations and projected assumptions through product logic.
- Timeline affects Projected Growth through product logic.
- Contribution Frequency affects projection cadence through product logic.
- Save-first behavior is preferred for MVP.
- Dashboard, Safety Buffer, Projected Growth, and Suggestions refresh only from product logic after save.
- No wallet signature is requested.
- No transaction is implied.

---

### Support Center

File:

```text
patterns/support-center.md
```

Purpose:

Defines the Support page with FAQ search, canonical help content, Ask Smith AI support help, and Contact Us.

Covers:

```text
Support page layout
FAQ search
FAQ sections
Accordion FAQ items
Contact Us modal
Email field
Description field
Send Message
Cancel
Ask Smith AI on Support page
Security and privacy rules
```

Important rules:

- FAQ answers are canonical support content.
- Smith AI can explain support topics, but should not invent policy, pricing, wallet support, protocol support, or security claims.
- Contact Us is for human/support follow-up.
- Contact form does not ask for wallet secrets.
- Never ask for seed phrases or private keys.
- Support page should not imply custody, automatic execution, or guaranteed outcomes.

---

### Empty, Loading, and Error States

File:

```text
patterns/empty-loading-error-states.md
```

Purpose:

Defines how WealthSmith handles missing data, loading, partial data, failure, stale data, disconnected state, unsupported assets, and recovery.

Covers:

```text
Empty states
Loading states
Partial data states
Error states
Disconnected states
Stale data states
Demo Mode states
Unsupported asset/protocol states
Missing icon states
Retry and recovery
```

Important rules:

- Do not show loading for fast updates.
- Use skeletons for known content shapes.
- Use Smith AI animation only for meaningful suggestion-building waits.
- Do not show fake data.
- Do not show broken icons.
- Do not blame the user.
- Keep Dashboard and Portfolio usable when one section fails.
- Use calm, recoverable copy.

---

## Relationship to Components

Patterns use components.

Patterns do not redefine components.

Example:

```text
patterns/dashboard-layout.md
  uses:
    components/global-nav.md
    components/card.md
    components/metric-card.md
    components/chart.md
    components/suggestion-card.md
```

Example:

```text
patterns/support-center.md
  uses:
    components/global-nav.md
    components/input.md
    components/accordion.md
    components/modal.md
    components/button.md
```

If a reusable visual element is needed across multiple patterns, create or update a component.

If a full flow or screen behavior repeats across the app, create or update a pattern.

---

## Key Shared Components

These components are especially important for patterns:

```text
components/global-nav.md
components/suggestion-card.md
components/loading-indicator.md
components/progress-bar.md
components/table.md
components/chart.md
components/modal.md
components/accordion.md
components/input.md
components/button.md
components/toast.md
components/alert.md
components/announcement.md
```

### Global Nav

The official app navigation component is:

```text
components/global-nav.md
```

Used by:

```text
Dashboard
Portfolio
Goal
Support
Onboarding
Demo Mode
Ask Smith AI states
Wallet connected/disconnected states
```

Important rules:

- Height: 64px.
- Radius: 16px.
- Outer offset: 24px from top, left, and right.
- Internal horizontal padding: 12px.
- Logo: 221px × 32px.
- During active onboarding, Portfolio, Goal, and Support are disabled.
- Global Nav renders state; it does not own app logic.

---

## Relationship to Tokens

Patterns must reference semantic tokens, not raw values.

Use:

```text
color.background.page
color.text.primary
spacing.layout.page.mobile
spacing.layout.page.desktop
breakpoint.desktop
radius.card
shadow.card
z-index.overlay
```

Do not use:

```text
#FFFFFF
32px
1280px
12px radius
999 z-index
```

Exception:

Some product-level specs are documented explicitly in component docs, such as Global Nav sizing. Those values should still be mapped into semantic tokens during implementation.

---

## Relationship to Assets

Patterns may reference approved assets.

Examples:

```text
assets/logo/wealthsmith-full-lockup.svg
assets/logo/wealthsmith-symbol.svg
assets/animations/smith-ai-symbol-loop.json
assets/icons/fallback/fallback-token.svg
assets/icons/wallet/phantom.svg
assets/icons/protocol/jupiter.svg
```

Rules:

- Use registry files instead of guessing asset paths.
- Do not invent icon names.
- Do not invent animation names.
- Do not use the Smith AI animation as a generic spinner.
- Respect reduced motion.
- Always pair token, wallet, and protocol icons with visible names/symbols when identity matters.
- Never show broken images.

---

## Relationship to Content

Patterns must follow WealthSmith content rules.

Voice:

- Calm
- Clear
- Trustworthy
- Beginner-friendly
- Non-hype
- Non-custodial
- Explainable

Avoid:

```text
Guaranteed returns
Best investment
Risk-free
Maximize profits
We will invest for you
Funds are safe
AI found the perfect strategy
```

Use:

```text
Suggested next action
Estimated yield
Based on your current plan
No action will be taken automatically
You stay in control
Your funds stay in your wallet
```

---

## Relationship to Product Logic

Patterns must not invent product logic.

Do not calculate:

```text
Top Pick
Suggestion ranking
Safety Buffer coverage
Token priority
Protocol choice
Yield strategy selection
Risk suitability
Portfolio values
APY
Estimated earnings
Projected Growth
Current vs Recommended Allocation
```

These must come from structured backend/product logic.

Patterns only define:

```text
Where the result appears
How it is presented
Which component renders it
How Smith AI explains it
Which states must be supported
What the UI must not invent
```

---

## Required Pattern Structure

Each pattern file should generally include:

```text
# Pattern Name

## Purpose
## When to Use
## Product Logic Source
## Components Used
## Assets Used
## Layout Behavior
## States
## Copy Rules
## Accessibility
## Claude Code Rules
## Do
## Do Not
## Done Criteria
```

Some patterns may add extra sections when needed:

```text
## Mobile Behavior
## Desktop Behavior
## Demo Mode
## Ledger Behavior
## Reduced Motion
## Data Requirements
## Save / Discard Behavior
## Contact Form Behavior
```

---

## State Requirements

Patterns should define all relevant states.

Common states:

```text
default
empty
loading
success
error
partial
stale
disabled
blocked
locked
demo
read-only
connected
disconnected
refreshing
saving
editing
view
```

States must be explicit.

Do not infer state from visuals alone.

---

## Loading Rules

All patterns follow the same loading-delay rule.

```text
0–400ms:
  No loading UI.
  Update directly.

400–800ms:
  Subtle pending only if needed.

800ms+:
  Explicit loading state.

1.5s+:
  Full explanatory loading with copy when useful.
```

Rules:

- Do not show loading for instant updates.
- Do not flash loading states.
- Use skeletons for known layouts.
- Use Smith AI animation only for meaningful Smith AI/suggestion-building waits.
- Do not use Smith AI animation for wallet connection, Contact Us submission, table loading, chart loading, or generic refresh.
- Respect reduced motion.

---

## Accessibility Requirements

Patterns must support accessibility at the flow level.

Rules:

- Preserve keyboard navigation.
- Do not trap focus unless using a modal.
- Use semantic headings.
- Keep loading text readable by assistive technologies.
- Respect reduced motion.
- Do not rely on color alone.
- Ensure mobile tap targets are usable.
- Do not hide critical financial information behind hover-only interactions.
- Modals must manage focus.
- Accordions must expose expanded/collapsed state.
- New-tab behavior must be announced for protocol handoffs.

---

## Responsive Requirements

Patterns must follow WealthSmith breakpoints:

```text
mobile: 320–767
tablet: 768–1279
desktop: 1280–1727
wide: 1728+
```

General rules:

- Mobile-first.
- Avoid horizontal scrolling unless displaying intentional data tables.
- Keep important actions reachable.
- Smith AI overlay/drawer/stacked behavior on mobile/tablet.
- Smith AI side panel/rail on desktop/wide.
- Use layout tokens for spacing and max width.
- Global Nav compact behavior should not be invented without product approval.

---

## Security and Wallet Safety Rules

Hard rules:

```text
Never ask for seed phrases.
Never ask for private keys.
Never ask users to upload wallet backup files.
Never imply WealthSmith holds user funds.
Never imply connecting a wallet moves funds.
Never imply suggestions execute automatically.
Never request signatures for basic read-only portfolio viewing if avoidable.
```

Wallet connection is read-only for MVP.

Suggestion card and Manage link clicks open protocol pages in new tabs for MVP.

They do not execute transactions.

---

## Claude Code Rules

Claude Code should:

- Use pattern docs before implementing full flows.
- Use component docs before implementing reusable elements.
- Use token docs before styling.
- Use asset registries before referencing visual files.
- Render structured data from product logic.
- Keep Smith AI explanatory.
- Keep Suggestion Engine deterministic.
- Support all documented states.
- Preserve accessibility and reduced-motion behavior.
- Keep demo and real wallet data separate.
- Keep wallet connection read-only.
- Open protocol handoffs in new tabs for MVP.

Claude Code must not:

- Invent financial logic.
- Invent Top Pick logic.
- Invent suggestion ranking.
- Invent protocol selection.
- Invent token eligibility.
- Invent APY or estimated earnings.
- Invent asset paths.
- Invent support policy or pricing.
- Invent wallet/protocol support.
- Invent copy that implies guaranteed returns.
- Move business rules into UI components.
- Use Smith AI as the source of deterministic recommendations.
- Ask for seed phrases or private keys.
- Mix demo and real data.

---

## MVP Build Order

Recommended order:

```text
1. components/global-nav.md
2. patterns/dashboard-layout.md
3. patterns/onboarding-with-smith-ai.md
4. patterns/suggestion-flow.md
5. patterns/portfolio-overview.md
6. patterns/wallet-connection.md
7. patterns/goal-settings.md
8. patterns/support-center.md
9. patterns/empty-loading-error-states.md
```

This order matches the product dependency chain:

```text
Navigation shell
Dashboard shell
Onboarding
Suggestions
Portfolio
Wallet connection
Goal editing
Support/help
Non-happy-path states
```
