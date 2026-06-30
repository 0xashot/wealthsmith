# Components

This folder contains WealthSmith component contracts.

Each file defines how a reusable UI component should behave, what data it can display, what states it supports, how it should use tokens, and what it must not decide.

Components are implementation contracts for engineers and AI coding tools.

They are not business logic documents.

---

## Purpose

The component layer defines reusable UI building blocks for WealthSmith.

Components should help the product stay:

- Consistent
- Accessible
- Mobile-first
- Token-driven
- Financially precise
- Easy to implement
- Easy to test
- Safe for AI-assisted coding

Components should make UI behavior predictable without embedding WealthSmith recommendation logic.

---

## Core Principle

Components render structured data and state.

Components do not create WealthSmith business logic.

A component may display:

- Data provided to it
- State provided to it
- Actions provided to it
- Labels provided to it
- Visual hierarchy defined by tokens
- Loading, empty, disabled, error, and success states

A component must not decide:

- Which suggestion appears
- Which suggestion is Top Pick
- Which token is recommended
- Which protocol is recommended
- Whether a user should invest
- Whether a wallet is valid
- Whether a risk level is appropriate
- Whether safety buffer coverage is enough
- Whether onboarding is complete
- Whether Smith AI should generate an answer
- Whether a financial action should proceed

Those decisions belong in:

```text
rules/
content/
patterns/
backend logic
Suggestion Engine
Protocol Decision Logic
Token Selection Logic
Smith AI orchestration
parent application state
```

---

## Folder Role

The `components/` folder answers:

```text
How should this UI component look and behave?
```

It does not answer:

```text
What should WealthSmith recommend?
Why was this suggestion triggered?
Which protocol should be selected?
Which token should be preferred?
What should Smith AI reason?
```

Those answers belong outside the component layer.

---

## Final MVP Component Set

The MVP component foundation includes:

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
divider.md
empty-state.md
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

These files are enough for the WealthSmith MVP component layer.

---

## Optional Components Later

These are not required for the MVP unless the product UI grows:

```text
avatar.md
breadcrumb.md
date-picker.md
stepper.md
file-upload.md
command-menu.md
pagination-advanced.md
data-grid.md
```

Do not generate optional components until there is a real product need.

---

## Component Categories

### Foundation Components

Reusable UI primitives.

```text
button.md
card.md
input.md
badge.md
tooltip.md
divider.md
icon.md
logo.md
loading-indicator.md
skeleton.md
```

### Selection Components

Used for choosing, filtering, or toggling options.

```text
checkbox.md
toggle.md
chip.md
select-card.md
select-menu.md
tabs.md
```

### Layout and Navigation Components

Used for page structure and navigation.

```text
sidebar.md
page-header.md
accordion.md
menu-popover.md
menu-item.md
pagination.md
```

### Feedback Components

Used to communicate state or outcomes.

```text
alert.md
announcement.md
toast.md
empty-state.md
progress-bar.md
loading-indicator.md
skeleton.md
```

### Data Display Components

Used to show portfolio, suggestion, table, metric, chart, and list data.

```text
table.md
chart.md
metric-card.md
portfolio-card.md
suggestion-card.md
list-item.md
pagination.md
```

### Overlay Components

Used for temporary focused UI.

```text
modal.md
menu-popover.md
tooltip.md
```

---

## Required Component Contract Structure

Each component file should define:

```text
Purpose
Important Rule
When to Use
When Not to Use
Data Source
Anatomy
Variants
States
Token Usage
Responsive Behavior
Accessibility
Keyboard Behavior, if interactive
Content Rules
Financial and Wallet Language Rules
Smith AI Rules, if relevant
Demo Mode Rules, if relevant
Validation and State Rules
Do
Do Not
```

Not every section needs to be equally long, but every component should make its responsibility clear.

---

## Token Usage Rule

Components must use semantic tokens.

They should not hardcode:

- Hex colors
- Pixel spacing
- Font sizes
- Border radius values
- Shadow values
- Z-index values
- Motion durations
- Arbitrary breakpoints

Correct:

```text
color.text.primary
color.surface.card
color.border.subtle
spacing.card.padding.md
spacing.inline.gap.sm
typography.body.md
radius.surface.lg
shadow.card.default
motion.surface.fadeIn
```

Incorrect:

```text
#003DFF
24px
16px
border-radius: 12px
box-shadow: 0 4px 12px rgba(...)
z-index: 9999
transition: 300ms ease
```

If a component needs a value that does not exist yet, add or request the correct token instead of hardcoding the value.

---

## Primitive vs Semantic Tokens

Components should use semantic tokens.

Primitive tokens are raw values.

Semantic tokens describe meaning.

Correct component usage:

```text
color.action.primary.background.default
spacing.page.padding.mobile
typography.heading.md
radius.surface.lg
```

Incorrect component usage:

```text
color.brand.blue.600
spacing.6
fontSize.16
radius.lg
```

Primitive tokens should usually be referenced only by semantic tokens.

---

## Component Logic Rule

Components may handle local UI behavior.

Examples:

- Open/closed visual state
- Hover state
- Focus state
- Pressed state
- Disabled rendering
- Loading rendering
- Empty rendering
- Keyboard interaction
- Responsive layout

Components must not handle product decisions.

Examples of forbidden component logic:

```text
Calculate safety buffer coverage
Choose Top Pick
Rank suggestions
Select protocol
Recommend token
Infer risk level
Generate Smith AI answer
Decide wallet ownership
Decide if user should invest
Invent projected values
Invent APY
Invent portfolio balances
```

---

## Data Source Rule

Components should render data passed to them.

Examples:

```text
title
description
status
metrics
actions
items
rows
columns
values
labels
isLoading
isDisabled
isTopPick
updatedAt
```

A component should not fetch product data unless explicitly designed as a connected container.

For the design system, assume components are mostly presentational.

---

## Copy Rule

Components should not invent financial copy.

Components may display approved copy passed to them.

Copy should come from:

```text
content/
rules/
Suggestion Engine output
backend data
parent state
approved templates
```

Components should not generate:

- Recommendation reasons
- Financial advice
- Risk explanations
- Protocol reasons
- Token selection reasons
- Smith AI responses
- Personalized investment language

---

## Financial Language Rule

WealthSmith UI must be precise and calm.

Allowed language:

```text
estimated
projected
modeled
may change
read-only
public wallet data
watch-only address
connected wallet
suggestion
review
allocation
coverage
```

Avoid language like:

```text
guaranteed
risk-free
best return
profit
win
moon
get rich
auto-invest
custody access
funds secured
```

Do not imply WealthSmith can move funds, sign transactions, or execute financial actions unless the product actually supports that action and the flow clearly explains it.

---

## Wallet Language Rule

Wallet-related components must be especially precise.

Allowed:

```text
Connect wallet
Add watch-only address
Read-only
Public address
Waiting for wallet approval
Loading public wallet data
Refresh portfolio
```

Avoid:

```text
Give WealthSmith access to your funds
Securing your money
Moving your assets
Controlling your wallet
Guaranteed safe
```

Wallet connection does not imply custody.

Watch-only address does not imply ownership.

Signing should only be mentioned when the flow actually requires signing.

---

## Token and Protocol Icon Rule

Token and protocol icons must not be the only source of identity.

Correct:

```text
[icon] SOL
[icon] USDC
[icon] Kamino
[icon] Jupiter
```

Incorrect:

```text
[icon only]
```

Rules:

- Always show token symbol or token name near token icons.
- Always show protocol name near protocol icons when identity matters.
- Use fallback icons when assets are missing.
- Never show broken images.
- Do not infer recommendation from icon prominence.

See:

```text
icon.md
```

---

## Logo Rule

Logo usage is controlled by:

```text
logo.md
```

Actual logo assets should live in:

```text
assets/logo/
```

Do not store full SVG logo code in component docs.

Do not modify, recolor, stretch, crop, or decorate the logo.

Logo does not communicate product state, demo state, financial status, or recommendation status.

---

## Loading, Skeleton, and Empty State Rule

These states must stay separate.

### Loading Indicator

Use for active processes.

```text
Connecting wallet…
Saving settings…
Refreshing portfolio…
Smith AI is thinking…
```

See:

```text
loading-indicator.md
```

### Skeleton

Use for content placeholders when layout is known.

```text
Metric card loading
Chart loading
Table rows loading
Suggestion card loading
```

See:

```text
skeleton.md
```

### Empty State

Use when data loaded successfully but there is nothing to show.

```text
No wallet connected
No assets found
No suggestions yet
No chart data available
```

See:

```text
empty-state.md
```

Do not show empty states while data is still loading.

Do not show skeletons after a request fails.

Do not show fake financial values during loading.

---

## Chart Rule

Charts visualize structured data.

Charts do not calculate:

- Projected growth
- Allocation
- Recommended allocation
- Portfolio value
- Safety buffer coverage
- APY
- Token prices
- Protocol ranking

Chart data must be passed in.

Projected or modeled data must be labeled clearly.

Charts must not imply guaranteed outcomes.

See:

```text
chart.md
```

---

## Pagination Rule

Pagination helps users navigate large tables and lists.

Use pagination for:

```text
asset tables
wallet lists
protocol positions
yield positions
staked assets
suggestion history
activity history
search results
filtered results
```

Avoid infinite scroll for important financial tables.

Use Load More for simpler mobile lists.

See:

```text
pagination.md
```

---

## Smith AI Rule

Smith AI is the voice and explanation layer.

Components may provide:

- Ask Smith AI action
- Explain with Smith AI action
- Smith AI loading state
- Smith AI panel trigger
- Smith AI context display

Components must not generate Smith AI reasoning.

Smith AI should not replace visible product instructions, risk labels, chart labels, or empty state explanations.

During onboarding, Smith AI remains open.

---

## Demo Mode Rule

Demo Mode must be clearly indicated.

Use:

```text
announcement.md
```

for global demo mode visibility.

Components may display demo data only when parent state provides demo data.

Components must not mix demo and real data without clear labeling.

Components must not imply demo data belongs to the user.

---

## Accessibility Requirements

All components must support accessibility by default.

Required practices:

- Use semantic HTML where possible.
- Provide visible focus states.
- Ensure WCAG AA contrast.
- Support keyboard interaction.
- Provide accessible labels for icon-only buttons.
- Do not rely on color alone.
- Hide decorative icons from assistive technologies.
- Use ARIA only when native semantics are not enough.
- Respect reduced motion.
- Keep text readable at mobile sizes.
- Make loading, error, and disabled states clear.
- Ensure important financial values are available as text.

Component-specific accessibility rules are defined inside each component file.

---

## Responsive Requirements

Components must be mobile-first.

Required breakpoints:

```text
mobile: 320–767px
tablet: 768–1279px
desktop: 1280–1727px
wide: 1728px+
```

General rules:

- Start with mobile layout.
- Use page padding tokens.
- Avoid cramped tap targets.
- Stack actions on mobile when needed.
- Avoid dense page numbers on mobile pagination.
- Keep charts readable on mobile.
- Keep tables responsive.
- Use side panels differently on mobile and desktop.
- Keep Smith AI behavior consistent with onboarding rules.

See token files for exact breakpoint and spacing definitions.

---

## State Requirements

Components should support relevant states.

Common states:

```text
default
hover
focus
active
selected
disabled
loading
empty
error
success
warning
expanded
collapsed
checked
unchecked
indeterminate
open
closed
```

A component should only support states that make sense for that component.

A divider should not have hover state.

A logo should not have warning state.

A chart should not invent projection state.

A suggestion card can display `isTopPick`, but it must not decide Top Pick.

---

## Action Rules

Actions should be explicit and safe.

Good actions:

```text
Review suggestion
View details
Ask Smith AI
Connect wallet
Add watch-only address
Refresh
Clear filters
Try Demo Mode
```

Avoid unless product execution flow supports it:

```text
Invest now
Buy now
Swap now
Start earning
Maximize yield
```

For MVP, many actions should lead to review or explanation, not direct execution.

---

## Claude Code Implementation Rules

When using Claude Code or another AI coding tool, instruct it to:

```text
Use semantic tokens only.
Do not hardcode visual values.
Implement only the component behavior described in the component file.
Do not add business logic.
Do not invent financial copy.
Do not invent APY, token prices, balances, projections, or rankings.
Do not infer Top Pick.
Do not generate Smith AI reasoning.
Use provided props/data only.
Follow accessibility requirements.
Follow mobile-first responsive behavior.
```

Bad Claude Code behavior to reject:

```text
Hardcoded hex colors
Random px spacing
Invented financial recommendations
Fake chart values
Fake APY
Fake token icons without fallback
Broken image icons
Button labels like “Invest now” without product support
Components calculating suggestion logic
Ignoring mobile layout
Ignoring keyboard accessibility
```

---

## Recommended Component Implementation Pattern

Components should be built as controlled/presentational components when possible.

Recommended structure:

```text
Component receives props
Component renders UI
Parent owns data and state
Parent handles actions
Rules/content decide financial logic
```

Example:

```text
SuggestionCard receives isTopPick
SuggestionCard does not calculate isTopPick
```

```text
Chart receives series data
Chart does not calculate projection
```

```text
Pagination receives currentPage and totalItems
Pagination does not fetch data by itself
```

```text
Icon receives name/path
Icon does not infer token identity
```

---

## Cross-Component Dependencies

Some components depend on others.

Examples:

```text
page-header.md may use button.md, badge.md, tabs.md, menu-popover.md
table.md may use pagination.md, skeleton.md, empty-state.md
chart.md may use tooltip.md, empty-state.md, skeleton.md
suggestion-card.md may use card.md, badge.md, button.md, metric-card.md
portfolio-card.md may use card.md, metric-card.md, icon.md
menu-popover.md uses menu-item.md and divider.md
empty-state.md may use button.md and icon.md
alert.md may use button.md and icon.md
```

Dependency rule:

A component may compose other components, but should not absorb their full responsibilities.
