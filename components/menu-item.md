# Menu Item

Menu items are compact interactive rows inside menus, popovers, dropdowns, navigation groups, overflow menus, and command-style action lists.

In WealthSmith, menu items may be used for wallet actions, table row actions, navigation shortcuts, filter menus, account menus, asset actions, suggestion actions, and Smith AI contextual menus.

Menu items should be short, predictable, accessible, and easy to scan.

---

## Purpose

Use menu items when users need to choose an action, destination, or compact option from a menu.

A menu item should help users:

- Trigger a contextual action
- Navigate to a related screen
- Select a compact menu option
- Open a detail view
- Copy information
- Remove or disconnect an item
- Choose from a small action list
- Access secondary actions without cluttering the main UI

Menu items should keep secondary actions organized.

---

## Menu Item vs List Item

Menu items and list items are different.

### Menu Item

A menu item is compact and action-oriented.

Use menu items inside:

```text
Dropdown menus
Overflow menus
Context menus
Account menus
Navigation menus
Command menus
```

Examples:

```text
View details
Copy address
Rename wallet
Remove wallet
Open Smith AI
```

### List Item

A list item displays structured row content.

Use list items for:

```text
Asset rows
Wallet rows
Suggestion rows
Protocol rows
Settings rows
Search results
```

Use `components/list-item.md` for richer row content.

Use this component for compact menu actions or menu choices.

---

## Important Rule

Menu items display actions, destinations, or compact options.

Menu items do not contain WealthSmith business logic.

A menu item can display:

- Action label
- Navigation label
- Selected state
- Active state
- Disabled state
- Destructive state
- Icon
- Shortcut
- Badge
- Helper text
- Submenu indicator

A menu item must not decide:

- Which action is financially suitable
- Which suggestion is Top Pick
- Which protocol is recommended
- Which token is recommended
- Whether a wallet is valid beyond provided state
- Whether a destructive action should be allowed
- Whether a user should invest
- Whether Smith AI should generate a recommendation

Those decisions must come from product logic, backend rules, deterministic rules, or parent state.

The component should render menu item state provided to it.

---

## When to Use

Use a menu item when the action or option belongs in a compact menu.

Examples:

- View details
- Copy wallet address
- Rename wallet
- Remove wallet
- Refresh data
- Open Smith AI
- Explain with Smith AI
- Sort by value
- Filter by wallet
- Change time period
- Export data, if supported
- Disconnect wallet
- Add watch-only address

Menu items can appear in:

- Menu popovers
- Overflow menus
- Dropdown menus
- Account menus
- Sidebar navigation groups
- Table row action menus
- Asset row action menus
- Wallet action menus
- Suggestion action menus
- Smith AI contextual menus

---

## When Not to Use

Do not use a menu item for:

- Primary page actions
- Full suggestion cards
- Asset rows with metrics
- Long descriptions
- Critical confirmations
- Form fields
- Large selectable cards
- Passive badges or statuses
- Rich educational content

Use:

- `components/button.md` for visible primary actions
- `components/list-item.md` for structured rows
- `components/select-card.md` for rich choices
- `components/modal.md` for confirmations
- `components/badge.md` for passive statuses
- `components/menu-popover.md` for the menu container

---

## Data Source

Menu items should render structured data.

Expected data may include:

```text
id
label
description
value
type
icon
tokenIcon
walletIcon
badge
selected
active
disabled
disabledReason
destructive
shortcut
hasSubmenu
href
ariaLabel
role
onSelect
```

The exact schema can evolve.

The component should not invent labels, actions, icons, selected states, disabled reasons, or destructive state.

---

## Anatomy

A menu item can include:

1. Container
2. Label
3. Optional leading icon
4. Optional token icon
5. Optional wallet icon
6. Optional description
7. Optional badge
8. Optional selected indicator
9. Optional keyboard shortcut
10. Optional trailing icon
11. Optional submenu indicator
12. Optional destructive state
13. Optional disabled reason

Required:

- Container
- Label or accessible label
- Interactive state when clickable

Optional:

- Icon
- Badge
- Description
- Shortcut
- Selected indicator
- Submenu indicator
- Disabled reason

Menu items should remain understandable without relying on color or icon alone.

---

## Variants

### Standard Menu Item

Use for normal menu actions.

Examples:

```text
View details
Copy address
Refresh data
Open Smith AI
```

Rules:

- Use concise action labels.
- Use leading icons only when they improve scanning.
- Do not overload with descriptions.

---

### Navigation Menu Item

Use when the item navigates to another screen or section.

Examples:

```text
Dashboard
Portfolio
Suggestions
Wallets
Settings
```

Rules:

- Active page should be clear.
- Use `aria-current` where appropriate.
- Do not use destructive styling for navigation.
- Navigation logic belongs outside the component.

---

### Selected Menu Item

Use when a menu item represents a selected option.

Examples:

```text
Monthly
Sort by value
Connected wallets
```

Rules:

- Selected state must be visible and accessible.
- Use a checkmark or selected indicator where appropriate.
- Do not rely on color alone.
- Selection state must come from parent data.

---

### Checkbox Menu Item

Use when multiple menu options can be selected.

Examples:

```text
Connected wallets
Watch-only wallets
Staked assets
Missing prices
```

Rules:

- Use checkbox semantics.
- State must be provided by parent logic.
- Do not calculate filter state inside the item.
- Keep labels short.

---

### Radio Menu Item

Use when one option in a menu group can be selected.

Examples:

```text
Sort by value
Sort by allocation
Sort by updated time
```

Rules:

- Use radio semantics.
- Only one item in the group should be selected.
- Selection state must come from parent logic.

---

### Destructive Menu Item

Use for destructive or removing actions.

Examples:

```text
Remove wallet
Delete address
Disconnect wallet
Discard changes
```

Rules:

- Destructive label must be specific.
- Destructive styling should be clear but not alarming.
- Important destructive actions should trigger confirmation with `components/modal.md`.
- Do not place destructive action too close to common safe actions without spacing or grouping.
- Do not use vague labels like “Delete” without context.

Good:

```text
Remove wallet
Disconnect wallet
Delete address
```

Avoid:

```text
Delete
Confirm
Proceed
Do it
```

---

### Disabled Menu Item

Use when an action or option is unavailable.

Examples:

```text
Export data
Unavailable
```

Rules:

- Disabled item should not be clickable.
- Disabled reason should be available when useful.
- Do not hide important unavailable actions when seeing them helps the user understand product limits.
- Disabled state must come from parent logic.

Good disabled reason:

```text
Connect a wallet first.
```

Avoid:

```text
Unavailable
```

when the reason matters.

---

### Submenu Item

Use when selecting the item opens another menu.

Examples:

```text
Sort by
Filter by
Move to
```

Rules:

- Show a clear submenu indicator.
- Support keyboard navigation.
- Avoid deep submenu nesting.
- On mobile, prefer sheet or drill-in menu behavior.

---

### Token Menu Item

Use when a menu item represents a token or asset.

Examples:

```text
[Token icon] SOL
[Token icon] USDC
```

Rules:

- Token symbol must be visible.
- Token name may be shown as secondary text.
- Token icon must not replace text.
- Use fallback icon behavior when an icon is missing.
- Do not show broken icons.
- Do not recommend a token inside the menu item.

---

### Wallet Menu Item

Use when a menu item represents a wallet or tracked address.

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

- Clearly distinguish connected and watch-only wallets.
- Do not imply custody.
- Do not imply signing unless wallet state supports it.
- Shorten long addresses visually but preserve the full value internally.

---

## Icons

Menu items may include icons.

Rules:

- Icons are optional.
- Icons must support text, not replace it.
- Icons should be simple and familiar.
- Icons should use semantic color.
- Destructive icons should match destructive tone.
- Do not use icons as the only label.
- Do not show broken token, wallet, or protocol icons.

Icon examples:

```text
Copy
Edit
Remove
Refresh
Open
External link
Check
Chevron
Wallet
Token
Smith AI
```

---

## Badges

Menu items may include small badges when useful.

Examples:

```text
New
Beta
Connected
Watch-only
```

Rules:

- Use `components/badge.md`.
- Badge state must come from structured data.
- Avoid crowding compact menus with too many badges.
- Do not use badges as the only status explanation when status affects user trust.

---

## Shortcuts

Menu items may show keyboard shortcuts where supported.

Examples:

```text
Cmd K
Ctrl K
Esc
```

Rules:

- Shortcut display must reflect actual supported behavior.
- Do not show fake shortcuts.
- Keep shortcut text visually secondary.
- Shortcuts must not replace the label.

---

## Sizes

### Compact

Use in dense dropdowns and overflow menus.

Rules:

- Keep labels short.
- Use minimal descriptions.
- Maintain accessible click/tap target.

### Default

Use for most menu popovers.

Rules:

- Supports icon, label, and optional shortcut or badge.

### Comfortable

Use for mobile menus, touch interfaces, or menus with descriptions.

Rules:

- Larger tap target.
- Better spacing for touch.
- Use descriptions only when needed.

---

## States

Menu items must support these states.

### Default

Normal interactive item.

### Hover

Indicates interactivity for pointer users.

### Focus

Required for keyboard users.

### Active

Use when the item is currently active or represents the current page.

### Selected

Use when item represents a selected option.

### Pressed

Optional tactile state.

### Disabled

Item is unavailable and not interactive.

### Destructive

Item performs a destructive or removing action.

### Loading

Use rarely.

Examples:

- Action is in progress
- Menu option is saving

Rules:

- Prevent duplicate action.
- Do not show fake completion.

### Error

Errors are usually shown outside the menu item, through a toast, inline message, or parent view.

Example:

```text
Could not remove wallet.
```

---

## Token Usage

Menu items must use semantic tokens.

Do not hardcode colors, spacing, typography, radius, shadows, motion, or z-index.

### Correct

```text
background: transparent
hover background: color.subdued.neutral.background.hover
active background: color.selection.background.default
text: color.text.primary
secondary text: color.text.secondary
disabled text: color.disabled.text.default
destructive text: color.feedback.danger.text.tint
label: typography.body.sm
description: typography.body.sm
radius: radius.control.sm
focus: shadow.control.focus
motion: motion.interaction.hover
```

### Incorrect

```text
background: #FFFFFF
hover background: #F2F2F2
font-size: 14px
color: #DC2626
border-radius: 8px
transition: 200ms ease
```

---

## Responsive Behavior

Menu items should be mobile-first.

### Mobile

- Use comfortable tap targets.
- Avoid tiny icons.
- Avoid dense menus with many items.
- Use sheets or full-screen menus for long lists.
- Use clear grouping when actions differ in severity.
- Destructive items should not be easy to tap accidentally.

### Tablet

- Support both touch and pointer behavior.
- Keep menu placement inside viewport.

### Desktop

- Support hover and keyboard focus.
- Keep menu item height consistent.
- Use shortcuts only where supported.
- Use icons sparingly for scanning.

### Wide

- Do not stretch menu items unnecessarily.
- Keep menu width readable and compact.

---

## Accessibility

Menu items must support accessibility by default.

Requirements:

- Use correct semantics for menu, menuitem, option, checkbox, or radio behavior.
- Keyboard navigation must be supported by the menu container.
- Focus state must be visible.
- Disabled state must be communicated.
- Selected or active state must be communicated.
- Destructive action must be clear in text.
- Icons must not be the only label.
- Token icons must not be the only identifier.
- Do not rely on color alone.
- Contrast must meet WCAG AA.

Recommended semantics depend on usage:

```text
role="menuitem"
role="menuitemcheckbox"
role="menuitemradio"
aria-checked="true"
aria-disabled="true"
aria-current="page"
```

Use native elements where possible.

---

## Keyboard Behavior

Menu item keyboard behavior is usually managed by `components/menu-popover.md`.

Expected behavior:

```text
Arrow Down: move to next item
Arrow Up: move to previous item
Home: move to first item
End: move to last item
Enter: activate item
Space: activate or select item
Escape: close menu
Tab: leave menu according to product behavior
```

Rules:

- Disabled items should not be activated.
- Focus should remain predictable.
- Destructive actions should not trigger accidentally.
- Submenus should support right/left arrow behavior where implemented.

---

## Content Rules

Menu item labels should follow WealthSmith voice:

- Clear
- Short
- Specific
- Calm
- Non-hype

Good action labels:

```text
View details
Copy address
Rename wallet
Remove wallet
Refresh data
Open Smith AI
Explain with Smith AI
```

Good navigation labels:

```text
Dashboard
Portfolio
Suggestions
Wallets
Settings
```

Avoid vague labels:

```text
Action
Proceed
Confirm
More
Thing
```

Avoid hype:

```text
Maximize profit
Best yield
Guaranteed return
Moonshot
Risk-free
```

---

## Financial and Wallet Language Rules

Menu item copy must be precise.

Allowed:

```text
Copy address
Connect wallet
Add watch-only address
Remove wallet
View details
Estimated
Read-only
Public wallet data
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

## Destructive Action Rules

Destructive menu items require extra care.

Examples:

```text
Remove wallet
Disconnect wallet
Delete address
Discard changes
```

Rules:

- Use destructive styling.
- Label must include the object when possible.
- Important destructive actions should open a confirmation modal.
- Do not use destructive action as default focused item.
- Do not place destructive item in a position where accidental selection is likely.
- Explain consequences in the confirmation flow, not inside a tiny menu item.

---

## Validation and State Rules

Menu item state belongs outside the component.

The menu item may display:

- Active state
- Selected state
- Disabled state
- Destructive state
- Loading state
- Badge
- Icon
- Shortcut

The menu item must not decide:

- Whether an action is allowed
- Whether a wallet can be removed
- Whether a token is recommended
- Whether a protocol is best
- Whether a suggestion is high priority
- Whether a financial action should proceed

---

## Do

- Use menu items for compact actions, destinations, and menu choices.
- Use semantic tokens.
- Keep labels short and specific.
- Use destructive styling for destructive actions.
- Use confirmation modals for important destructive actions.
- Use icons only as support.
- Support selected and disabled states accessibly.
- Keep product logic outside the component.

---

## Do Not

- Do not use menu items for full structured rows.
- Do not use menu items for primary page actions when a visible button is better.
- Do not hide critical warnings inside menu items.
- Do not invent disabled, selected, destructive, or active states.
- Do not rely on icons alone.
- Do not show broken token or wallet icons.
- Do not use vague labels like “Proceed” for risky actions.
- Do not imply guaranteed returns.
- Do not use hype-based financial copy.
- Do not imply custody, execution, or investment action unless the product actually supports it.
- Do not hardcode raw visual values.
