# List Item

List items display one structured row of information inside a list, menu, table-like section, card, drawer, modal, or side panel.

In WealthSmith, list items may represent assets, wallets, suggestions, protocols, settings, actions, notifications, onboarding steps, search results, and Smith AI context items.

List items should be scannable, consistent, accessible, and easy to act on.

---

## Purpose

Use list items to present repeated pieces of structured information.

A list item should help users understand:

- What the item is
- Its current status
- Its most important supporting detail
- Whether it is selectable or clickable
- Whether it has actions
- Whether it is connected, watch-only, estimated, stale, unavailable, or completed

List items should make repeated content easier to scan.

---

## Important Rule

List items display structured row data.

List items do not contain WealthSmith business logic.

A list item can display:

- Asset name
- Token icon
- Wallet name
- Wallet address
- Protocol name
- Suggestion title
- Status badge
- Supporting metric
- Description
- Timestamp
- Action button
- Selection state
- Disabled state

A list item must not decide:

- Portfolio value
- Token price
- Allocation percentage
- Risk status
- APY
- Estimated earnings
- Suggestion priority
- Top Pick status
- Protocol ranking
- Which token or protocol is recommended
- Whether a user should invest

Those values must come from backend data, product logic, deterministic rules, or Smith AI orchestration.

The component should render the data and state provided to it.

Do not invent missing values.

---

## When to Use

Use a list item when repeated content needs a compact row format.

Examples:

- Asset list row
- Wallet list row
- Suggestion list row
- Protocol list row
- Settings row
- Action row
- Notification row
- Search result row
- Onboarding step row
- Smith AI reference item
- Menu-like row with more content than a menu item

List items can appear in:

- Portfolio cards
- Wallet pages
- Suggestion pages
- Sidebars
- Drawers
- Modals
- Tables on mobile
- Search results
- Settings
- Onboarding summaries

---

## When Not to Use

Do not use a list item for:

- Full comparison tables with many columns
- Rich selectable options that need larger explanations
- Passive status labels
- Primary call-to-action buttons
- Long educational content
- Full suggestion cards
- Dense financial comparison requiring column alignment

Use:

- `components/table.md` for structured comparison
- `components/select-card.md` for rich choices
- `components/badge.md` for passive labels
- `components/button.md` for actions
- `components/suggestion-card.md` for full suggestion presentation
- `components/portfolio-card.md` for portfolio summary cards

---

## Data Source

List items should render structured data.

Expected data may include:

```text
id
type
title
subtitle
description
icon
tokenIcon
walletIcon
protocolIcon
assetSymbol
assetName
walletName
walletAddress
network
protocol
primaryValue
secondaryValue
metric
badge
status
selected
disabled
disabledReason
isLoading
isUnavailable
isEstimated
updatedAt
actions
href
ariaLabel
```

The exact schema can evolve.

The component should not invent labels, icons, statuses, values, addresses, metrics, or actions.

---

## Anatomy

A list item can include:

1. Container
2. Leading visual
3. Primary label
4. Secondary label
5. Optional description
6. Optional token icon
7. Optional wallet icon
8. Optional protocol icon
9. Optional badge
10. Optional primary metric
11. Optional secondary metric
12. Optional timestamp
13. Optional selection control
14. Optional trailing icon
15. Optional action button
16. Optional menu trigger
17. Optional divider

Required:

- Container
- Primary label or accessible label

Optional:

- Leading icon
- Token icon
- Supporting text
- Badge
- Metric
- Action
- Selection state
- Divider

The list item should remain understandable without relying on icon or color alone.

---

## Variants

### Standard List Item

Use for general rows.

Examples:

```text
Settings item
Navigation-adjacent row
Simple content row
```

Rules:

- Keep content concise.
- Use clear primary and secondary text.
- Avoid unnecessary badges or icons.

---

### Asset List Item

Use for asset or token rows.

Examples:

```text
SOL
Solana
12.45 SOL
$5,500
```

Rules:

- Token icon may be shown.
- Token symbol must be visible.
- Token name may be shown as secondary text.
- Do not rely on token icon alone.
- Show missing price or unavailable values clearly.
- Do not calculate token value inside the component.

Good layout:

```text
[Token icon] SOL
Solana
12.45 SOL
$5,500
```

Bad layout:

```text
[Icon only]
```

---

### Wallet List Item

Use for connected wallets or watch-only addresses.

Examples:

```text
Phantom
Connected wallet
```

```text
8x4...pQ9
Watch-only address
```

Rules:

- Clearly distinguish connected wallets from watch-only addresses.
- Do not imply custody.
- Do not imply signing unless the wallet state supports it.
- Long addresses should be shortened visually but preserved internally.
- Provide copy action where useful.

---

### Protocol List Item

Use for protocol, staking, yield, or position rows.

Examples:

```text
Kamino
USDC lending position
Est. APY 6.2%
```

Rules:

- Clearly label estimated APY or earnings.
- Do not imply APY is guaranteed.
- Protocol status must come from structured data.
- Do not rank protocols inside the component.

---

### Suggestion List Item

Use for compact suggestion rows.

Examples:

```text
Build your safety buffer
Action needed
Stable assets cover 27% of target.
```

Rules:

- Suggestion data must come from Suggestion Engine.
- The list item must not decide Top Pick, priority, category, or reason.
- Use `components/badge.md` for status or category.
- Use `components/suggestion-card.md` for full suggestion display.

---

### Settings List Item

Use in settings pages or account/preferences panels.

Examples:

```text
Show estimated values
Estimated values may change as prices update.
```

Rules:

- May include toggle, select menu, or action.
- Settings behavior belongs outside the list item.
- Keep helper text close to the setting.

---

### Action List Item

Use when a list row triggers an action or navigation.

Examples:

```text
Add wallet
Connect wallet
Open Smith AI
View details
```

Rules:

- Action must be clear.
- Use trailing icon only as a support.
- Destructive actions should be visually distinct and may require confirmation.
- Do not use list items to hide financial execution actions.

---

### Selectable List Item

Use when the item can be selected.

Examples:

- Select a wallet
- Select an asset
- Select a protocol option
- Select a filter item

Rules:

- Selected state must be visible and accessible.
- Use checkbox or radio semantics where appropriate.
- Do not rely on color alone.
- Selection logic belongs outside the component.

---

### Loading List Item

Use while row data is loading.

Rules:

- Use skeleton or loading state.
- Preserve layout where possible.
- Do not show fake values.
- Do not show fake icons or badges.

---

### Empty-State List Item

Use for a single row explaining an empty section only when a full empty-state component is unnecessary.

Examples:

```text
No wallets connected.
No assets found.
No suggestions yet.
```

Rules:

- Keep message clear.
- Provide next action where useful.
- Do not use empty list items for major onboarding or page-level empty states.

---

## Token Icons

List items may contain token icons, asset icons, wallet icons, protocol icons, and network icons.

Rules:

- Icons are optional supporting visuals.
- Token symbol or item label must be visible.
- Icons must not replace readable text.
- Use fallback icon behavior when an icon is missing.
- Do not show broken image icons.
- Do not stretch or distort icons.
- Preserve icon aspect ratio.
- Do not infer identity from icon alone.
- Decorative icons may use empty alt text if visible text identifies the item.

Fallback examples:

```text
Generic token icon
Token initials
Network-neutral placeholder
Generic wallet icon
Generic protocol icon
```

---

## Badges

List items may include badges for status or classification.

Examples:

```text
Connected
Watch-only
Estimated
Missing price
Staked
Yield
Action needed
Completed
```

Rules:

- Use `components/badge.md`.
- Badge state must come from structured data.
- Badge must not calculate status, priority, or category.
- Avoid too many badges in one row.

---

## Metrics

List items may include one or two compact metrics.

Examples:

```text
$5,500
12.45 SOL
27%
Est. APY 6.2%
```

Rules:

- Metrics must come from structured data.
- Use consistent alignment in repeated lists.
- Clearly label estimates.
- Do not show fake `$0` for missing prices.
- Do not calculate values inside the component.

---

## Actions

List items may include actions.

Examples:

```text
View details
Copy address
Remove wallet
Open
Refresh
```

Rules:

- Use `components/button.md` for buttons.
- Use `components/menu-popover.md` for overflow actions.
- Icon-only actions need accessible labels.
- Destructive actions should be clear and may require confirmation.
- Do not show execution actions unless the product supports them.

Accessible label examples:

```text
aria-label="Copy wallet address"
aria-label="View SOL details"
aria-label="Remove wallet"
```

---

## Sizes

### Compact

Use in dense sidebars, dropdowns, or small cards.

Rules:

- Keep content minimal.
- Avoid long descriptions.
- Maintain accessible tap/click targets.

### Default

Use for most lists.

Rules:

- Supports leading visual, title, subtitle, metric, and action.

### Comfortable

Use in mobile lists, onboarding, and important settings.

Rules:

- More vertical spacing.
- Better for touch interaction.
- Useful when helper text is included.

---

## States

List items must support these states where relevant.

### Default

Normal visible item.

### Hover

Use for interactive rows on pointer devices.

Non-interactive rows should not look clickable.

### Focus

Required for keyboard users when item or action is interactive.

### Pressed

Optional tactile state for clickable rows.

### Selected

Use when item is selected.

Selected state must use more than color when possible.

### Active

Use when item represents the current page or active context.

### Disabled

Use when item is visible but unavailable.

Disabled reason should be shown when useful.

### Loading

Use while item data is loading.

Do not show fake values.

### Error

Use when item data or action fails.

Example:

```text
Could not load this wallet.
```

### Stale

Use when item data may be outdated.

Example:

```text
Updated 2 hours ago
```

### Unavailable

Use when a value cannot be shown.

Examples:

```text
Price unavailable
APY unavailable
Protocol data unavailable
```

---

## Token Usage

List items must use semantic tokens.

Do not hardcode colors, spacing, typography, radius, shadows, motion, or z-index.

### Correct

```text
background: color.surface.card
hover background: color.subdued.neutral.background.hover
selected background: color.selection.background.default
text: color.text.primary
secondary text: color.text.secondary
border: color.border.subtle
title: typography.body.md
subtitle: typography.body.sm
metric: typography.metric.compact
radius: radius.surface.sm
focus: shadow.control.focus
motion: motion.interaction.hover
```

### Incorrect

```text
background: #FFFFFF
hover background: #F5F5F5
font-size: 14px
border-bottom: 1px solid #C5C5C5
border-radius: 8px
transition: 200ms ease
```

---

## Responsive Behavior

List items should be mobile-first.

### Mobile

- Use comfortable spacing.
- Make interactive rows easy to tap.
- Stack secondary values when needed.
- Keep token icons and labels visible.
- Avoid cramming too many metrics into one row.
- Move extra actions into overflow menu when needed.
- Keep destructive actions clear.

### Tablet

- List items may use two-column internal layout when readable.
- Keep row height consistent.

### Desktop

- List items may show more supporting values.
- Align repeated metrics consistently.
- Use hover states only for interactive rows.

### Wide

- Do not stretch text lines unnecessarily.
- Keep row content visually connected.
- Avoid overly long rows without grouping.

---

## Accessibility

List items must support accessibility by default.

Requirements:

- Use semantic list structure when items are part of a list.
- Interactive rows must be keyboard accessible.
- Do not nest conflicting interactive controls.
- Visible focus state required.
- Selected and active states must be communicated.
- Disabled state must be communicated.
- Token icons must not be the only identifier.
- Do not rely on color alone.
- Contrast must meet WCAG AA.
- Row actions must have accessible labels.
- Long addresses should have accessible full-value support when needed.

Recommended structure:

```text
ul / li
button
a
aria-current
aria-selected
aria-disabled
```

Use the semantic pattern that matches the interaction.

---

## Keyboard Behavior

Keyboard behavior depends on list item type.

### Clickable Row

```text
Tab: move focus to row
Enter: activate row
Space: activate row when button semantics are used
```

### Row With Actions

```text
Tab: move through interactive controls
Enter: activate focused control
Space: activate focused button
```

### Selectable Row

```text
Tab: move focus to item or selection control
Space: select or toggle
Arrow keys: move between options when radio/listbox behavior is used
```

Rules:

- Focus order should be logical.
- Avoid making both the row and nested controls fight for the same click.
- If the row has multiple actions, prefer explicit buttons or overflow menu.

---

## Content Rules

List item copy should follow WealthSmith voice:

- Clear
- Calm
- Specific
- Beginner-friendly
- Non-hype

Good labels:

```text
SOL
Solana
Phantom
Watch-only address
Build your safety buffer
Show estimated values
```

Good unavailable copy:

```text
Price unavailable
APY unavailable
Could not load wallet data
```

Avoid vague labels:

```text
Item
Data
Option
Thing
```

Avoid hype:

```text
Best profit
Huge gains
Guaranteed yield
Risk-free
```

---

## Financial and Wallet Language Rules

List item copy must be precise.

Allowed:

```text
Estimated
May change
Public wallet data
Read-only
Connected wallet
Watch-only address
Staked
Yield
Missing price
```

Avoid:

```text
Guaranteed
Risk-free
Best return
Profit mode
Auto-invest
Custody access
```

Do not imply WealthSmith can move funds, sign transactions, or execute financial actions unless the product actually supports that action and the flow clearly explains it.

---

## Validation and State Rules

List item state belongs outside the component.

The list item may display:

- Selected state
- Active state
- Disabled state
- Loading state
- Error state
- Unavailable state
- Status badge
- Metrics
- Actions

The list item must not decide:

- Whether the item should be selected
- Whether a wallet is valid
- Whether an asset is risky
- Whether a protocol is best
- Whether a suggestion is high priority
- Whether a financial action should proceed

---

## Do

- Use list items for repeated structured rows.
- Use semantic tokens.
- Use token icons with visible labels.
- Provide icon fallbacks.
- Keep rows scannable.
- Show unavailable data clearly.
- Align repeated metrics consistently.
- Use accessible row actions.
- Keep product logic outside the component.
- Use badges for status labels.

---

## Do Not

- Do not calculate financial values inside the list item.
- Do not invent icons, labels, values, statuses, or actions.
- Do not rely on token icons alone.
- Do not show broken icons.
- Do not make non-interactive rows look clickable.
- Do not hide important warnings in secondary text only.
- Do not imply guaranteed returns.
- Do not use hype-based financial copy.
- Do not imply custody, execution, or investment action unless the product actually supports it.
- Do not hardcode raw visual values.
