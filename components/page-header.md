# Page Header

Page headers introduce the current page or major view.

In WealthSmith, page headers may appear on the dashboard, portfolio pages, wallet pages, suggestion pages, settings, onboarding summaries, protocol pages, and educational/help pages.

A page header should clearly tell users where they are, what the page is about, and what primary actions are available.

---

## Purpose

Use a page header at the top of a page or major view.

A page header should help users understand:

- Current page context
- Page title
- Page description
- Primary page action
- Secondary page actions
- Current wallet or portfolio context
- Data freshness or mode, when relevant
- Smith AI support entry point, when relevant
- Optional tabs or filters connected to the page

Page headers should create orientation and structure without containing business logic.

---

## Important Rule

Page headers display page context and actions.

Page headers do not contain WealthSmith business logic.

A page header can display:

- Page title
- Subtitle or description
- Breadcrumb
- Metadata
- Wallet context
- Portfolio context
- Primary action
- Secondary actions
- Smith AI trigger
- Refresh action
- Tabs
- Status badge
- Demo/read-only context label
- Updated timestamp

A page header must not decide:

- Which recommendation appears
- Which suggestion is Top Pick
- Whether a user should invest
- Whether a wallet is valid
- Whether portfolio data is correct
- Whether safety buffer coverage is enough
- Whether a protocol is recommended
- Whether onboarding is complete
- Whether demo mode is active
- Whether Smith AI should generate an answer

Those decisions must come from product state, backend state, routing, wallet state, Suggestion Engine, deterministic rules, or parent layout.

The page header should render the title, context, actions, and state provided to it.

---

## Page Header vs App Header

Page header and app header are different.

### Page Header

Introduces a specific page or view.

Examples:

```text
Dashboard
Portfolio
Suggestions
Wallets
Settings
```

### App Header

Global navigation or app shell area.

Examples:

```text
Logo
Main navigation
Account menu
Global wallet button
Global Smith AI toggle
```

Use `components/sidebar.md` and app shell patterns for global navigation.

Use this component for page-level orientation.

---

## When to Use

Use a page header when a page or major view needs a clear title and context.

Examples:

- Dashboard
- Portfolio Overview
- Wallets
- Suggestions
- Suggestion Detail
- Settings
- Profile
- Demo Mode page
- Onboarding summary
- Asset Detail
- Protocol Detail
- Yield Positions
- Staked Assets
- Help / FAQ
- Pricing / Plan page

Page headers can appear in:

- Main content area
- Dashboard layout
- Portfolio pages
- Settings pages
- Modal-like full-page flows
- Onboarding completion summary
- Smith AI-supported pages

---

## When Not to Use

Do not use a page header for:

- Small cards
- Menu groups
- Toasts
- Tooltips
- Simple modal titles
- Inline alerts
- Table row headings
- Accordion item titles
- Component-level labels
- Global announcements

Use:

- `components/card.md` for card headers
- `components/modal.md` for modal headers
- `components/announcement.md` for global top banners
- `components/alert.md` for inline warnings/info
- `components/tabs.md` for switching sibling views
- `components/sidebar.md` for navigation/sidebar structure

Do not duplicate a page header inside every section.

---

## Data Source

Page headers should render structured page data.

Expected data may include:

```text
id
title
description
breadcrumb
metadata
status
mode
walletContext
portfolioContext
primaryAction
secondaryActions
overflowActions
smithAIAction
refreshAction
tabs
updatedAt
isLoading
ariaLabel
```

Action data may include:

```text
label
type
icon
href
disabled
loading
ariaLabel
```

The exact schema can evolve.

The component should not invent page titles, descriptions, actions, status, wallet state, or data freshness.

---

## Anatomy

A page header can include:

1. Container
2. Optional breadcrumb
3. Title
4. Optional description
5. Optional status badge
6. Optional metadata
7. Optional wallet/portfolio context
8. Optional primary action
9. Optional secondary actions
10. Optional overflow menu
11. Optional Smith AI trigger
12. Optional refresh action
13. Optional tabs
14. Optional divider below header

Required:

- Title

Recommended:

- Description for complex pages
- Primary action when one clear next action exists
- Updated timestamp when data freshness matters

Optional:

- Breadcrumb
- Status badge
- Metadata
- Wallet context
- Tabs
- Smith AI trigger
- Refresh action
- Overflow actions
- Divider

The title should remain visible and readable at all breakpoints.

---

## Variants

### Standard Page Header

Use for most pages.

Examples:

```text
Portfolio
Suggestions
Settings
```

Rules:

- Include clear title.
- Include description when context helps.
- Include page-level actions only.
- Do not overcrowd with metrics or detailed content.

---

### Dashboard Page Header

Use for the main dashboard.

Example:

```text
Dashboard
Track your portfolio, safety buffer, and suggestions in one place.
```

Possible actions:

```text
Connect wallet
Add watch-only address
Ask Smith AI
Refresh
```

Rules:

- Keep header calm and focused.
- Do not show too many actions.
- Do not place all dashboard metrics inside the header.
- Use cards below for metrics and suggestions.

---

### Portfolio Page Header

Use for portfolio overview or wallet/asset pages.

Examples:

```text
Portfolio
Wallets
Asset Detail
```

Possible metadata:

```text
Updated 2 minutes ago
Demo Mode
Read-only
```

Possible actions:

```text
Connect wallet
Add watch-only address
Refresh
```

Rules:

- Data freshness can be shown when available.
- Wallet mode can be shown when relevant.
- Do not calculate portfolio value in the header.
- Portfolio metrics should use `components/metric-card.md`.

---

### Suggestions Page Header

Use for suggestion overview or detail pages.

Examples:

```text
Suggestions
Review personalized suggestions based on your goals and portfolio.
```

Possible actions:

```text
Ask Smith AI
Refresh suggestions
```

Rules:

- Do not decide or generate suggestions.
- Do not decide Top Pick.
- Do not show recommendation logic inside the header.
- Use `components/suggestion-card.md` for suggestion content.

---

### Suggestion Detail Header

Use for a single suggestion detail page.

Possible content:

```text
Build your safety buffer
Stable assets do not fully cover your target buffer.
```

Optional metadata:

```text
Top Pick
High priority
Safety Buffer
```

Rules:

- Title, reason, status, and badges must come from Suggestion Engine output.
- Header may display badges but must not calculate them.
- Do not invent action labels.
- Do not include execution actions unless the product supports them.

---

### Settings Page Header

Use for settings pages.

Examples:

```text
Settings
Manage your preferences and connected wallets.
```

Rules:

- Keep actions minimal.
- Use sections below for settings groups.
- Do not place forms directly inside the page header unless extremely simple.

---

### Onboarding Page Header

Use for onboarding screens or onboarding summary.

Examples:

```text
Set up your plan
Tell WealthSmith about your goals so suggestions can be more relevant.
```

Rules:

- During onboarding, Smith AI remains open.
- Header should support the onboarding step but not replace step content.
- Do not hide required onboarding instructions in page header actions.
- Do not decide onboarding completion inside the header.

---

### Help / FAQ Page Header

Use for education, support, or FAQ pages.

Examples:

```text
Help
Find answers about wallets, Demo Mode, and suggestions.
```

Rules:

- Keep copy beginner-friendly.
- Use `components/accordion.md` for FAQ content below.
- Do not turn FAQ header into marketing copy.

---

### Compact Page Header

Use in constrained layouts, side panels, or narrow views.

Rules:

- Keep title short.
- Use one action maximum when possible.
- Move secondary actions into overflow menu.
- Do not compress text below readable size.

---

## Breadcrumb

Use breadcrumb only when navigation depth is meaningful.

Examples:

```text
Portfolio / Wallets / Phantom
Suggestions / Build your safety buffer
Settings / Wallets
```

Rules:

- Breadcrumb should reflect navigation hierarchy.
- Breadcrumb should not replace the page title.
- Keep breadcrumb short.
- Do not show breadcrumb on shallow pages where it adds noise.
- Breadcrumb links must be keyboard accessible.
- Current page may be plain text.

---

## Title

The title is required.

Rules:

- Title must be clear and specific.
- Use sentence case or product-approved title style consistently.
- Avoid overly long page titles.
- Do not include changing data in the title unless parent state provides it.
- Do not use hype.

Good titles:

```text
Dashboard
Portfolio
Suggestions
Wallets
Settings
Safety Buffer
Projected Growth
```

Avoid:

```text
Your path to guaranteed wealth
Profit center
Best investments
```

---

## Description

Use description when the page needs context.

Rules:

- Keep description short.
- Explain what the page does.
- Do not include long educational content.
- Do not present financial advice.
- Do not duplicate alert content.

Good descriptions:

```text
Track your portfolio, safety buffer, and suggestions in one place.
```

```text
Review suggestions based on your goals and connected portfolio data.
```

```text
Manage connected wallets, watch-only addresses, and preferences.
```

Avoid:

```text
Maximize your returns with the best opportunities.
```

---

## Metadata

Page headers may show metadata when useful.

Examples:

```text
Updated 2 minutes ago
Demo Mode
Read-only
3 wallets connected
```

Rules:

- Metadata must come from parent state.
- Do not calculate metadata inside the header.
- Do not show stale data as current.
- Use subtle text or badge components.
- Keep metadata short.

Use `components/badge.md` for status badges when needed.

---

## Actions

Page headers may include primary, secondary, and overflow actions.

Examples:

```text
Connect wallet
Add watch-only address
Refresh
Ask Smith AI
View details
Export
Clear filters
```

Rules:

- Use `components/button.md`.
- Prefer one primary action.
- Use secondary actions sparingly.
- Move extra actions into `components/menu-popover.md`.
- Actions must directly relate to the page.
- Do not place financial execution actions in the header unless the product supports them and the flow is safe.
- Do not pressure users.

Good action labels:

```text
Connect wallet
Add watch-only address
Refresh
Ask Smith AI
```

Avoid:

```text
Invest now
Buy now
Start earning
Maximize yield
```

unless supported by product execution flow and approved copy.

---

## Wallet Actions

Wallet-related page headers may include wallet actions.

Allowed:

```text
Connect wallet
Add watch-only address
Refresh portfolio
```

Rules:

- Do not imply custody.
- Do not imply WealthSmith can move funds.
- Do not mention signing unless the action actually requires signing.
- Watch-only must be clearly read-only when context requires it.

Good description:

```text
Connect a wallet or add a public address in read-only mode.
```

Avoid:

```text
Give WealthSmith access to your funds.
```

---

## Smith AI Trigger

Page headers may include a Smith AI trigger.

Examples:

```text
Ask Smith AI
Explain this page
```

Rules:

- Smith AI trigger opens or focuses Smith AI.
- Page header does not generate Smith AI content.
- Parent state should pass structured page context.
- During onboarding, Smith AI remains open.
- Smith AI action should not replace visible page guidance.
- Avoid using Smith AI as the only explanation of important financial context.

Good:

```text
Ask Smith AI
```

Avoid:

```text
Ask AI what to buy
```

---

## Refresh Action

Page headers may include refresh action when data freshness matters.

Examples:

```text
Refresh portfolio
Refresh suggestions
Refresh prices
```

Rules:

- Refresh state must come from parent state.
- Use `components/loading-indicator.md` for active refresh.
- Do not refresh automatically because the header decides to.
- Do not show fake updated timestamps.
- If refresh fails, use `components/alert.md` or toast depending on scope.

---

## Tabs in Page Header

Some page headers may include tabs directly below the title/action row.

Examples:

```text
Portfolio: Overview / Assets / Wallets / Yield
Suggestions: Active / Completed / Dismissed
Settings: Profile / Wallets / Preferences
```

Rules:

- Use `components/tabs.md`.
- Tabs switch sibling views within the page.
- Page header does not decide tab content.
- Active tab state comes from routing or parent state.
- On mobile, tabs may become scrollable or move below actions.

---

## Status Badges

Use badges to communicate compact page-level status.

Examples:

```text
Demo Mode
Read-only
Top Pick
High priority
Estimated
```

Rules:

- Use `components/badge.md`.
- Badge state must come from product data.
- Page header must not calculate badge status.
- Keep badges short.
- Do not use badges as the only explanation of important state.

---

## Layout

Page headers should support a flexible layout.

Recommended desktop layout:

```text
Breadcrumb
Title + actions
Description + metadata
Optional tabs
```

Recommended mobile layout:

```text
Breadcrumb
Title
Description
Metadata
Actions
Optional tabs
```

Rules:

- Keep title and main action visible.
- Stack actions on mobile when needed.
- Move secondary actions into overflow on small screens.
- Avoid overcrowding the header.
- Keep content aligned to page grid.
- Do not place large charts, tables, or cards inside the page header.

---

## Sizes

### Compact

Use for constrained views or secondary pages.

Rules:

- Title only or title + one action.
- Description optional.
- Actions limited.

### Standard

Default page header.

Rules:

- Title, description, optional metadata, actions.

### Prominent

Use for important landing/dashboard pages.

Rules:

- Larger title.
- Clear description.
- One primary action.
- Do not become a marketing hero section.

---

## States

Page headers may support these states.

### Default

Page context is loaded.

### Loading

Some page context is loading.

Rules:

- Use `components/skeleton.md` for title/metadata if page content is loading and layout is known.
- Use `components/loading-indicator.md` for active refresh/action.
- Do not show fake titles or metadata.

### Empty Context

Page exists but no data is available.

Rules:

- Page header remains visible.
- Empty content area should use `components/empty-state.md`.
- Header should not replace the empty state.

### Error Context

Page-level data failed to load.

Rules:

- Header may remain visible if routing context is known.
- Use `components/alert.md` for error messaging.
- Do not show stale metadata unless clearly labeled.

### Demo Mode

Page is displaying sample data.

Rules:

- Demo Mode must be visibly indicated, usually with `components/announcement.md`.
- Header may also show a Demo Mode badge when useful.
- Do not imply demo data is real user data.

### Read-Only / Watch-Only

Page is displaying public address data.

Rules:

- Label read-only state when relevant.
- Do not imply ownership.
- Do not imply signing or custody.

---

## Token Usage

Page headers must use semantic tokens.

Do not hardcode colors, spacing, typography, radius, shadows, motion, or z-index.

### Correct

```text
title: typography.heading.xl
description: typography.body.md
metadata: typography.body.sm
breadcrumb: typography.label.sm
title color: color.text.primary
description color: color.text.secondary
metadata color: color.text.secondary
background: color.surface.page
gap: spacing.stack.gap.md
actions gap: spacing.inline.gap.sm
padding mobile: spacing.page.padding.mobile
padding desktop: spacing.page.padding.desktop
divider: color.border.subtle
```

### Incorrect

```text
font-size: 24px
color: #121212
padding: 32px
gap: 16px
border-bottom: 1px solid #C5C5C5
```

---

## Responsive Behavior

Page headers should be mobile-first.

### Mobile

- Stack title, description, metadata, and actions.
- Keep title readable.
- Use one primary action when possible.
- Move secondary actions into overflow menu.
- Actions may become full-width if needed.
- Tabs may scroll horizontally.
- Avoid large empty vertical space.
- Keep Smith AI trigger accessible without crowding page title.

### Tablet

- Use two-column title/action layout when space allows.
- Keep description aligned under title.
- Tabs may sit below header row.

### Desktop

- Title/description on the left.
- Actions on the right.
- Metadata near description or title.
- Tabs below title/action row when used.
- Keep aligned to page grid.

### Wide

- Constrain content to page max width.
- Do not stretch text across the screen.
- Keep actions close to header content.

---

## Accessibility

Page headers must support accessibility by default.

Requirements:

- Page title should usually render as the page `h1`.
- Only one primary `h1` should exist per page.
- Breadcrumb links must be keyboard accessible.
- Action buttons must be keyboard accessible.
- Focus states must be visible.
- Do not rely on color alone.
- Badges must not be the only explanation of important state.
- Loading/refresh state must be communicated accessibly.
- Contrast must meet WCAG AA.
- On route change, focus management should be handled by routing/page shell.

Recommended structure:

```text
header
  nav aria-label="Breadcrumb"
  h1
  description
  actions
```

Use accessible labels for icon-only actions.

---

## Keyboard Behavior

Page header controls must support keyboard interaction.

Rules:

- Buttons follow `components/button.md`.
- Menus follow `components/menu-popover.md`.
- Tabs follow `components/tabs.md`.
- Breadcrumb links are reachable by keyboard.
- Refresh and Smith AI actions must have visible focus.
- Do not trap focus inside the page header.
- Do not automatically move focus to the header unless routing behavior requires it.

---

## Content Rules

Page header copy should follow WealthSmith voice:

- Clear
- Calm
- Specific
- Beginner-friendly
- Non-hype
- Contextual
- Action-oriented when useful

Good titles:

```text
Dashboard
Portfolio
Suggestions
Wallets
Settings
```

Good descriptions:

```text
Track your portfolio, safety buffer, and suggestions in one place.
```

```text
Review suggestions based on your goals and connected portfolio data.
```

```text
Manage connected wallets, watch-only addresses, and preferences.
```

Good actions:

```text
Connect wallet
Add watch-only address
Refresh
Ask Smith AI
```

Avoid:

```text
Maximize wealth
Unlock profits
Guaranteed growth
Best investment plan
```

---

## Financial and Wallet Language Rules

Page header copy must be precise.

Allowed:

```text
Connected wallet
Watch-only address
Read-only
Public wallet data
Demo Mode
Sample data
Estimated
Updated
Suggestions
Projected
```

Avoid:

```text
Guaranteed
Risk-free
Profit
Best return
Auto-invest
Custody access
Funds secured
```

Do not imply WealthSmith can move funds, sign transactions, or execute financial actions unless the product actually supports that action and the flow clearly explains it.

Do not imply wallet connection gives WealthSmith custody.

Do not imply demo data is real user data.

---

## Smith AI Rules

Page headers may include Smith AI access.

Rules:

- Page header can open or focus Smith AI.
- Page header does not generate Smith AI responses.
- Parent state passes page context to Smith AI.
- During onboarding, Smith AI remains open.
- Smith AI trigger should not replace required page explanations.
- Avoid copy that asks AI to decide investments.

Allowed:

```text
Ask Smith AI
Explain this page
```

Avoid:

```text
Ask AI what to buy
Find best investment
```

---

## Demo Mode Rules

When Demo Mode is active:

- Global demo state should be shown with `components/announcement.md`.
- Page header may also show a compact Demo Mode badge if helpful.
- Page copy must not imply demo data belongs to the user.
- Actions should clearly distinguish between demo exploration and real wallet connection.

Allowed actions:

```text
Exit Demo
Connect wallet
```

Rules:

- Do not mix demo and real portfolio context without clear labeling.
- Do not show demo metadata as real portfolio metadata.

---

## Validation and State Rules

Page header state belongs outside the component.

The page header may display:

- Title
- Description
- Breadcrumb
- Metadata
- Status badge
- Actions
- Smith AI trigger
- Refresh state
- Tabs
- Loading state

The page header must not decide:

- Current route
- Which page data is valid
- Whether user has suggestions
- Whether portfolio is healthy
- Whether a wallet should connect
- Whether a recommendation should exist
- Whether a financial action should proceed
- Whether Smith AI should answer

---

## Do

- Use page headers to orient users.
- Use the page title as the page `h1`.
- Use semantic tokens.
- Keep title and actions clear.
- Prefer one primary action.
- Move extra actions into overflow menus.
- Use badges and metadata only when product state provides them.
- Use tabs below the header when switching sibling page views.
- Keep wallet, demo, and Smith AI language precise.
- Keep business logic outside the component.

---

## Do Not

- Do not use page headers inside every small section.
- Do not place charts, tables, or large cards inside the page header.
- Do not overcrowd with too many actions.
- Do not invent titles, metadata, badges, or actions.
- Do not calculate portfolio or suggestion state inside the header.
- Do not use hype-based financial copy.
- Do not imply guaranteed returns.
- Do not imply custody, execution, or investment action unless the product actually supports it.
- Do not imply demo data is real user data.
- Do not hardcode raw visual values.
