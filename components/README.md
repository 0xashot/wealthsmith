# Components

Components are reusable UI building blocks for the WealthSmith design system.

They define how individual interface elements should look, behave, and respond to product state.

Components should be predictable, composable, accessible, and token-driven.

---

## Purpose

The `components/` folder gives engineers and AI coding tools clear implementation guidance for reusable WealthSmith UI elements.

Each component file should define:

- Purpose
- Usage
- Variants
- States
- Props / data expectations
- Accessibility
- Token usage
- Do / Do Not rules
- Relationship to product logic

Components should not contain financial business logic.

They render structured product state.

---

## Core Rule

Components are renderers.

They should not decide WealthSmith financial behavior.

```text
Suggestion Engine = deterministic Brain
Protocol Logic = protocol selection
Top Pick Logic = one Top Pick
Smith AI = explanatory Voice
Components = UI rendering
```

Components must not invent:

- Suggestions
- Top Pick
- APY
- Estimated earnings
- Portfolio values
- Safety Buffer coverage
- Protocol selection
- Token eligibility
- Wallet ownership
- Transaction status

---

## Current MVP Component Inventory

### App Shell / Navigation

```text
global-nav.md
page-header.md
sidebar.md
tabs.md
```

### Core Actions

```text
button.md
toggle.md
checkbox.md
chip.md
badge.md
pagination.md
```

### Forms and Selection

```text
input.md
select-menu.md
select-card.md
choice-chip.md
```

### Containers and Surfaces

```text
card.md
metric-card.md
portfolio-card.md
modal.md
accordion.md
divider.md
```

### Feedback and Status

```text
alert.md
announcement.md
toast.md
tooltip.md
loading-indicator.md
skeleton.md
empty-state.md
progress-bar.md
```

### Data Display

```text
chart.md
table.md
list-item.md
suggestion-card.md
```

### Menus

```text
menu-popover.md
menu-item.md
```

### Brand and Assets

```text
logo.md
icon.md
```

---

## Key Components

### `global-nav.md`

Defines the main WealthSmith top navigation.

Used across:

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

Covers:

```text
Logo placement
Dashboard / Portfolio / Goal / Support nav items
Active page state
Disabled nav state during onboarding
Try Demo Mode
Connect Wallet
Wallet pill
Ask Smith AI
Wallet menu trigger
```

Important rules:

- Height is 64px.
- Radius is 16px.
- Outer offset is 24px from top, left, and right.
- Internal horizontal padding is 12px.
- Logo is 221px × 32px.
- During active onboarding, Portfolio, Goal, and Support are disabled.
- Component renders from app state and does not own business logic.

### `suggestion-card.md`

Defines suggestion card rendering.

Rules:

- Renders structured Suggestion Engine output.
- Does not decide Top Pick.
- Does not sort suggestions.
- Does not invent APY or estimated value.
- MVP click opens relevant protocol page in a new tab.
- No transaction execution.

### `loading-indicator.md`

Defines loading UI.

Rules:

- Do not show loading for fast updates.
- Use Smith AI animation only for meaningful Smith AI/suggestion-building waits.
- Use skeletons for known content shapes.
- Respect reduced motion.

### `progress-bar.md`

Defines linear progress and coverage bars.

Used for:

```text
Onboarding progress
Safety Buffer coverage
```

Rules:

- Progress value comes from product state.
- Component does not calculate onboarding completion or buffer coverage.
- Accessible progress values are required.

### `table.md`

Defines financial/data table behavior.

Used for:

```text
Liquid Assets
Staked Assets
Yield Strategies
```

Rules:

- Tables render normalized data.
- Tables do not calculate balances, APY, or earnings.
- Token/protocol names must be visible.
- Manage links open protocol pages in a new tab for MVP.

### `chart.md`

Defines chart rendering behavior.

Used for:

```text
Projected Growth
Balance Overview
Crypto Assets Allocation
Current vs Recommended Allocation
```

Rules:

- Chart data comes from product logic.
- Use visible legends and labels.
- Do not rely on color alone.
- Chart markers use approved chart icons where relevant.

### `global-nav.md`, `logo.md`, and `icon.md`

These three components define the main asset-facing UI contract:

```text
global-nav.md
  Renders the app shell navigation and full WealthSmith lockup.

logo.md
  Defines approved logo usage.

icon.md
  Defines UI, token, wallet, protocol, chart, and fallback icon usage.
```

Rules:

- Do not recreate the logo as text.
- Do not invent asset paths.
- Do not show broken icons.
- Do not use icons as the only source of important meaning.

---

## Full Component List

```text
accordion.md
alert.md
announcement.md
badge.md
button.md
card.md
chart.md
checkbox.md
chip.md
choice-chip.md
divider.md
empty-state.md
global-nav.md
icon.md
input.md
list-item.md
loading-indicator.md
logo.md
menu-item.md
menu-popover.md
metric-card.md
modal.md
page-header.md
pagination.md
portfolio-card.md
progress-bar.md
select-card.md
select-menu.md
sidebar.md
skeleton.md
suggestion-card.md
table.md
tabs.md
toast.md
toggle.md
tooltip.md
```

---

## Component vs Pattern

Components define reusable UI elements.

Patterns define how multiple components work together in product flows.

Example:

```text
components/global-nav.md
  Defines the reusable nav component.

patterns/dashboard-layout.md
  Defines where the nav appears and how it works with Dashboard + Smith AI surfaces.

patterns/wallet-connection.md
  Defines what happens when Connect Wallet or wallet pill actions are used.
```

Do not put full workflow rules inside components unless they are necessary for safe rendering.

Do not put reusable component styling only inside patterns.

---

## Required Component File Structure

Each component file should generally include:

```text
# Component Name

## Purpose
## When to Use
## Anatomy
## Variants
## States
## Props / Data
## Behavior
## Accessibility
## Token Usage
## Do
## Do Not
## Done Criteria
```

Some components may add specific sections when needed:

```text
## Asset Usage
## Loading Rules
## Error States
## Responsive Behavior
## Financial Logic Boundaries
```

---

## Token Usage Rules

Components must use semantic tokens.

Use:

```text
color.background.surface
color.text.primary
color.text.secondary
color.border.default
spacing.component.card.padding
radius.card
shadow.card
```

Do not use raw values directly inside component implementation unless the value is first represented as a semantic/design token.

Special case:

The Global Nav currently has explicit MVP specs:

```text
height: 64px
radius: 16px
outer offset: 24px
internal horizontal padding: 12px
logo: 221px × 32px
```

These should be mapped into semantic tokens during implementation.

---

## Asset Usage Rules

Components should reference approved assets through asset docs and registries.

Logo:

```text
assets/logo/logo-registry.json
assets/logo/wealthsmith-full-lockup.svg
assets/logo/wealthsmith-symbol.svg
```

Icons:

```text
assets/icons/icon-registry.json
assets/icons/
```

Animations:

```text
assets/animations/animation-registry.json
assets/animations/smith-ai-symbol-loop.json
```

Rules:

- Do not invent asset paths.
- Do not invent icon names.
- Do not show broken images.
- Do not use screenshots as production assets.
- Do not use Smith AI animation as generic loading.

---

## Accessibility Rules

All components must support accessibility.

General rules:

- Visible labels for controls.
- Accessible names for icon-only actions.
- Keyboard access for interactive elements.
- Focus state must be visible.
- Do not rely on color alone.
- Do not hide critical information behind hover-only UI.
- Respect reduced motion.
- Use semantic HTML where possible.
- Loading and error states must be announced appropriately.

---

## Financial Safety Rules

Components must not use unsafe financial language or behavior.

Do not imply:

```text
Guaranteed returns
Risk-free yield
WealthSmith custody
Automatic execution
Transaction approval
Protocol endorsement beyond product logic
```

Components should use structured content and product-approved copy.

---

## Claude Code Rules

Claude Code should:

- Read component docs before implementing UI.
- Use semantic tokens.
- Use approved assets.
- Render from structured props/state.
- Keep business logic outside components.
- Use patterns for full flows.
- Preserve accessibility.
- Support empty/loading/error states.
- Avoid loading flicker.
- Keep financial copy calm and precise.

Claude Code must not:

- Invent financial values.
- Invent recommendations.
- Invent Top Pick.
- Invent APY.
- Invent protocol URLs.
- Invent wallet state.
- Hardcode raw colors/spacing when tokens exist.
- Use broken or guessed asset paths.
- Mix demo and real data.
- Execute transactions from UI components.
- Ask for wallet signatures from display components.

---
