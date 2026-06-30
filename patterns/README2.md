# Patterns

Patterns describe how WealthSmith components, assets, tokens, content rules, and product logic work together across full product experiences.

Components are reusable UI building blocks.

Patterns are reusable product flows and screen-level behaviors.

Use patterns to help engineers and AI coding tools build WealthSmith screens consistently without guessing how pieces should connect.

---

## Purpose

The `patterns/` folder documents repeatable WealthSmith experiences such as:

- Onboarding with Smith AI
- Wallet connection
- Dashboard layout
- Suggestion generation
- Suggestion ranking and Top Pick display
- Portfolio overview
- Empty, loading, and error states

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
Smith AI = explanatory Voice
UI = Renderer
```

Patterns must preserve this separation.

The UI should render structured data.

Smith AI should explain structured data.

The Suggestion Engine should produce deterministic recommendations, priorities, rankings, and Top Pick.

Claude Code must not move business logic into components or patterns.

---

## Folder Structure

Recommended MVP pattern structure:

```text
patterns/
  README.md
  onboarding-with-smith-ai.md
  dashboard-layout.md
  wallet-connection.md
  suggestion-flow.md
  portfolio-overview.md
  empty-loading-error-states.md
```

This is enough for the MVP.

Future pattern files can be added only when the product introduces a repeated experience that needs shared implementation guidance.

---

## Pattern Files

### Onboarding with Smith AI

File:

```text
patterns/onboarding-with-smith-ai.md
```

Purpose:

Defines how onboarding works with Smith AI visible as a continuous guided companion.

Important rules:

- Smith AI remains open during onboarding.
- Smith AI explains each step, but does not own deterministic product logic.
- Onboarding must collect structured user inputs.
- Demo Mode must be clearly labeled when used.
- Users must understand that WealthSmith is non-custodial and no action is taken automatically.

---

### Dashboard Layout

File:

```text
patterns/dashboard-layout.md
```

Purpose:

Defines the main authenticated WealthSmith layout across mobile, tablet, desktop, and wide screens.

Important rules:

- Mobile-first layout.
- Smith AI appears as overlay on mobile/tablet.
- Smith AI appears as side panel on desktop/wide.
- Navigation, portfolio overview, suggestions, and Smith AI must not compete for priority.
- Layout must follow breakpoint and spacing tokens.

---

### Wallet Connection

File:

```text
patterns/wallet-connection.md
```

Purpose:

Defines how users connect supported wallets and how wallet-related states are displayed.

Important rules:

- Wallet connection does not imply custody.
- Wallet icon does not imply ownership by itself.
- Ledger constraints must be handled carefully.
- Read-only wallet/address tracking should be visually distinct from connected wallet state.
- Do not imply signing unless the flow actually requires signing.

---

### Suggestion Flow

File:

```text
patterns/suggestion-flow.md
```

Purpose:

Defines how suggestions are built, loaded, ranked, displayed, explained, and refreshed.

Important rules:

- Suggestion Engine decides suggestions.
- Top Pick Logic decides the single Top Pick.
- Safety Buffer override must be respected.
- Smith AI explains suggestions, but does not invent new recommendation logic.
- Suggestion cards render structured data and copy templates.
- Loading state may use `smith-ai-symbol-loop.json`.

---

### Portfolio Overview

File:

```text
patterns/portfolio-overview.md
```

Purpose:

Defines how wallet balances, token holdings, staked assets, yield strategies, and allocation are displayed.

Important rules:

- Portfolio values must come from connected data sources.
- Components must not calculate unsupported balances.
- Token icons must be paired with token symbols/names.
- Missing token icons use fallback token icon.
- Missing protocol/wallet icons are implementation issues.
- Staked assets and yield strategies must be clearly labeled.

---

### Empty, Loading, and Error States

File:

```text
patterns/empty-loading-error-states.md
```

Purpose:

Defines how WealthSmith handles missing data, loading, failure, and partial states.

Important rules:

- Empty states should explain what is missing and what the user can do next.
- Loading states should be specific, not generic.
- Errors should be calm, useful, and recoverable.
- Do not blame the user.
- Do not imply financial loss unless confirmed.
- Reduced motion must be respected.

---

## Relationship to Components

Patterns use components.

Patterns do not redefine components.

Example:

```text
patterns/suggestion-flow.md
  uses:
    components/suggestion-card.md
    components/loading-indicator.md
    components/alert.md
    components/toast.md
    components/badge.md
```

If a reusable visual element is needed across multiple patterns, create or update a component.

If a full flow or screen behavior repeats across the app, create or update a pattern.

---

## Relationship to Tokens

Patterns must reference semantic tokens, not raw values.

Use:

```text
color.background.page
color.text.primary
spacing.layout.page.mobile
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

Component docs define exact token usage.

Pattern docs define where those components appear and how they behave together.

---

## Relationship to Assets

Patterns may reference approved assets.

Examples:

```text
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
```

---

## Relationship to Product Logic

Patterns must not invent product logic.

Do not calculate:

- Top Pick
- Suggestion ranking
- Safety Buffer coverage
- Token priority
- Protocol choice
- Yield strategy selection
- Risk suitability
- Portfolio values
- APY
- Estimated earnings

These must come from structured backend/product logic.

Patterns only define:

- Where the result appears
- How it is presented
- Which component renders it
- How Smith AI explains it
- Which states must be supported

---

## Required Pattern Structure

Each pattern file should follow this structure:

```text
# Pattern Name

## Purpose
## When to Use
## User Goal
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
```

Some patterns may add extra sections when needed, such as:

```text
## Mobile Behavior
## Desktop Behavior
## Demo Mode
## Ledger Behavior
## Reduced Motion
## Data Requirements
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
disabled
blocked
demo
read-only
connected
disconnected
refreshing
```

States must be explicit.

Do not infer state from visuals alone.

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
- Smith AI overlay on mobile/tablet.
- Smith AI side panel on desktop/wide.
- Use layout tokens for spacing and max width.

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

Claude Code must not:

- Invent financial logic.
- Invent Top Pick logic.
- Invent suggestion ranking.
- Invent protocol selection.
- Invent token eligibility.
- Invent APY or estimated earnings.
- Invent asset paths.
- Invent copy that implies guaranteed returns.
- Move business rules into UI components.
- Use Smith AI as the source of deterministic recommendations.

---

## MVP Build Order

Recommended order:

```text
1. patterns/README.md
2. patterns/onboarding-with-smith-ai.md
3. patterns/suggestion-flow.md
4. patterns/wallet-connection.md
5. patterns/dashboard-layout.md
6. patterns/portfolio-overview.md
7. patterns/empty-loading-error-states.md
```

Start with onboarding and suggestion flow because they define the most important WealthSmith experience:

```text
User gives context
WealthSmith builds suggestions
Smith AI explains
User stays in control
```
