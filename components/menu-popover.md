# Menu Popover

Menu popovers are temporary floating containers that show compact actions, choices, or contextual options.

In WealthSmith, menu popovers may be used for overflow actions, wallet actions, asset row actions, table controls, filters, sorting, account menus, navigation shortcuts, and Smith AI contextual actions.

Menu popovers should be predictable, accessible, lightweight, and easy to dismiss.

---

## Purpose

Use menu popovers to reveal secondary actions or compact choices without navigating away from the current screen.

A menu popover should help users:

- Access row actions
- Open overflow actions
- Choose compact filters
- Choose sort options
- Open contextual help
- Copy values
- Rename or remove items
- Open Smith AI actions
- Select from a short action list

Menu popovers should keep the primary interface clean while keeping actions discoverable.

---

## Important Rule

Menu popovers display a container for menu items.

Menu popovers do not contain WealthSmith business logic.

A menu popover can display:

- Menu items
- Menu sections
- Dividers
- Group labels
- Selected states
- Disabled states
- Destructive menu items
- Loading or empty states
- Short helper text
- Keyboard focus behavior

A menu popover must not decide:

- Which actions are financially suitable
- Which suggestion is Top Pick
- Which token is recommended
- Which protocol is recommended
- Whether a wallet is valid beyond provided state
- Whether a destructive action is allowed
- Whether a user should invest
- Whether Smith AI should generate a recommendation

Those decisions must come from product logic, backend rules, deterministic rules, or parent state.

The popover should render menu items and states provided to it.

---

## Relationship to Menu Item

`components/menu-popover.md` defines the container and interaction behavior.

`components/menu-item.md` defines the individual rows inside the menu.

Use them together.

Example structure:

```text
Menu trigger
Menu popover
  Menu section
    Menu item
    Menu item
  Divider
  Menu section
    Destructive menu item
```

The popover manages:

- Opening
- Closing
- Placement
- Focus
- Keyboard navigation
- Outside click behavior
- Viewport collision
- Z-index
- Grouping

The menu item manages:

- Row label
- Row icon
- Row state
- Row action
- Row destructive style

---

## When to Use

Use a menu popover when actions or options are secondary and compact.

Examples:

- Asset row overflow menu
- Wallet row overflow menu
- Table sort menu
- Table filter menu
- Account menu
- Suggestion card overflow menu
- Copy address menu
- More actions menu
- Smith AI contextual menu
- Time period menu
- Export menu, if supported

Menu popovers can appear in:

- Tables
- List items
- Cards
- Sidebars
- Modals
- Headers
- Toolbars
- Filter bars
- Smith AI panels

---

## When Not to Use

Do not use a menu popover for:

- Primary actions
- Full forms
- Long explanations
- Critical warnings
- Destructive confirmations
- Large option comparisons
- Full onboarding steps
- Long token lists that need search
- Complex financial decisions
- Content that must remain visible

Use:

- `components/button.md` for primary actions
- `components/modal.md` for confirmations
- `components/select-menu.md` for selectable compact lists
- `components/select-card.md` for rich choices
- `components/table.md` for structured comparison
- `components/sidebar.md` for persistent navigation or Smith AI
- `components/tooltip.md` for short explanations

---

## Data Source

Menu popovers should render structured menu data.

Expected data may include:

```text
id
triggerLabel
triggerIcon
placement
open
sections
items
selectedItemId
disabled
loading
emptyMessage
onOpen
onClose
onSelect
ariaLabel
```

Section data may include:

```text
id
label
items
dividerBefore
dividerAfter
```

Item data should follow `components/menu-item.md`.

The exact schema can evolve.

The component should not invent actions, labels, disabled states, destructive states, or selected states.

---

## Anatomy

A menu popover can include:

1. Trigger
2. Popover container
3. Optional section label
4. Menu item list
5. Menu items
6. Optional dividers
7. Optional helper text
8. Optional empty state
9. Optional loading state
10. Optional footer action
11. Optional arrow, if product style supports it

Required:

- Trigger or controlled open state
- Popover container
- At least one menu item, empty state, or loading state
- Focus behavior
- Dismiss behavior

Optional:

- Section labels
- Dividers
- Icons inside menu items
- Badges inside menu items
- Short helper text
- Search field only for special menu patterns
- Footer action

---

## Variants

### Standard Menu Popover

Use for normal compact action lists.

Examples:

```text
View details
Copy address
Refresh data
```

Rules:

- Keep actions short.
- Avoid long descriptions.
- Use menu items from `components/menu-item.md`.
- Close after selection unless the menu supports multi-select.

---

### Overflow Menu Popover

Use when there are more actions than can fit in the visible UI.

Examples:

- Asset row overflow
- Wallet row overflow
- Suggestion card overflow
- Table row overflow

Rules:

- Trigger is often an icon-only button.
- Trigger must have an accessible label.
- Menu should open near the trigger.
- Destructive actions should be grouped or separated.

Accessible trigger labels:

```text
Open asset actions
Open wallet actions
Open suggestion actions
Open row actions
```

Avoid:

```text
More
Menu
Options
```

when a more specific label is possible.

---

### Filter Menu Popover

Use for compact filter controls.

Examples:

```text
Wallet type
Asset type
Status
Suggestion category
```

Rules:

- Filter state belongs outside the popover.
- Use checkbox or radio menu items when needed.
- Keep selected filters visible elsewhere when useful.
- Active filters may be represented with `components/chip.md`.

---

### Sort Menu Popover

Use for sort controls.

Examples:

```text
Sort by value
Sort by allocation
Sort by updated time
Sort by asset name
```

Rules:

- Selected sort option must be visible and accessible.
- Sorting logic belongs outside the popover.
- Do not imply recommendation ranking unless product logic explicitly supports it.
- Avoid labels like “Best first” unless approved by deterministic logic and copy rules.

---

### Account Menu Popover

Use for account, profile, or app-level actions.

Examples:

```text
Settings
Support
Sign out
```

Rules:

- Keep account actions predictable.
- Destructive or sensitive actions should be clearly separated.
- Do not mix wallet financial actions with general account actions unless context is clear.

---

### Wallet Action Popover

Use for wallet-specific actions.

Examples:

```text
View wallet
Copy address
Rename wallet
Remove wallet
```

Rules:

- Make connected vs watch-only behavior clear where relevant.
- Remove/disconnect actions should use destructive menu item styling.
- Important remove/disconnect actions should open a confirmation modal.
- Do not imply custody or signing unless supported by wallet state.

---

### Asset Action Popover

Use for asset-specific actions.

Examples:

```text
View asset
Copy token address
Open in explorer
Ask Smith AI
```

Rules:

- Asset actions must come from structured data.
- Do not add buy/sell/swap/stake actions unless the product supports execution.
- Do not imply recommendation or execution through menu labels.

---

### Suggestion Action Popover

Use for suggestion-related secondary actions.

Examples:

```text
View details
Ask Smith AI
Dismiss suggestion
```

Rules:

- Suggestion actions must come from Suggestion Engine or product state.
- Popover must not decide suggestion status or priority.
- Dismiss actions should be clear and may require confirmation depending on product behavior.

---

### Smith AI Context Menu Popover

Use for contextual assistant actions.

Examples:

```text
Explain this metric
Explain this suggestion
Ask Smith AI
```

Rules:

- Menu action may open Smith AI.
- Menu does not generate Smith AI reasoning.
- Context passed to Smith AI must be structured by parent state.
- During onboarding, Smith AI is already open and should remain open.

---

### Multi-Select Menu Popover

Use when a menu controls multiple selected options.

Examples:

```text
Connected wallets
Watch-only wallets
Staked assets
Estimated values
```

Rules:

- Use checkbox menu items.
- Menu may stay open after selecting an item.
- Selected state must be visible and accessible.
- Apply behavior belongs outside the popover.

---

## Placement

Menu popovers may appear:

- Bottom-start
- Bottom-end
- Top-start
- Top-end
- Right-start
- Left-start

Rules:

- Prefer placement close to the trigger.
- Keep the popover inside the viewport.
- Reposition automatically near screen edges.
- Avoid covering the trigger when possible.
- Avoid covering critical content or primary actions.
- Use consistent alignment for repeated menus.
- Menu should not appear detached from its trigger.

On mobile, placement may change into a sheet-style menu.

---

## Opening Behavior

Menu popovers may open from:

- Button click
- Icon button click
- Keyboard activation
- Controlled state from parent component

Rules:

- Trigger must be accessible.
- Focus should move into the menu when it opens.
- Open state must be clearly controlled.
- Opening one menu should usually close other open menus in the same context.
- Menu should not open unexpectedly.

---

## Closing Behavior

Menu popovers may close when:

- User selects an item
- User presses Escape
- User clicks or taps outside
- Trigger is clicked again
- User tabs away, depending on implementation
- Parent context changes
- User scrolls a container where keeping the popover open would be confusing

Rules:

- Single-action menus usually close after selection.
- Multi-select menus may remain open after selection.
- Closing should return focus to the trigger unless focus intentionally moves elsewhere.
- Destructive actions should not execute simply by closing.
- Outside click should close the menu but not trigger unrelated actions.

---

## Focus Management

Menu popovers must manage focus accessibly.

Rules:

- Move focus into the menu when it opens.
- Keep focus within the menu while using arrow-key navigation.
- Return focus to the trigger when the menu closes.
- Keep focus visible.
- Do not focus disabled items unless the menu pattern intentionally allows disabled items to be announced.
- Do not let background interactions accidentally activate while menu is open.

For simple menus, focus may start on:

- First enabled item
- Selected item
- Current active item

For destructive menus, do not place initial focus on a destructive item unless it is the only meaningful item and the action is safe.

---

## Keyboard Behavior

Required keyboard behavior:

```text
Enter: open menu from trigger or activate focused item
Space: open menu from trigger or activate focused item
Arrow Down: move to next enabled item
Arrow Up: move to previous enabled item
Home: move to first enabled item
End: move to last enabled item
Escape: close menu and return focus to trigger
Tab: leave menu or close menu according to product behavior
Shift + Tab: move backward or close menu according to product behavior
```

Optional behavior:

```text
Typing: typeahead search within visible items
Arrow Right: open submenu where supported
Arrow Left: close submenu where supported
```

Rules:

- Disabled items should not activate.
- Keyboard behavior should match chosen ARIA pattern.
- Multi-select menu items should not close the menu unless product behavior says so.
- Destructive actions should not trigger accidentally through default focus.

---

## States

Menu popovers must support these states.

### Closed

Popover is hidden.

### Open

Popover is visible.

### Loading

Use while menu items are loading.

Example:

```text
Loading actions…
```

Rules:

- Do not show fake actions while loading.
- Keep menu size stable when possible.

### Empty

Use when no menu items are available.

Example:

```text
No actions available.
```

Rules:

- Empty state should be clear.
- Do not show an empty floating container without explanation.

### Error

Use when menu actions or options fail to load.

Example:

```text
Could not load actions.
```

Rules:

- Provide retry if appropriate.
- Do not invent fallback actions.

### Disabled

Popover trigger may be disabled when no actions are available.

Rules:

- Disabled reason should be clear if not obvious.
- Consider hiding the trigger if no actions are possible and the absence is not confusing.

### Nested

Use when submenu behavior is supported.

Rules:

- Avoid deep nesting.
- Ensure keyboard behavior is accessible.
- On mobile, prefer drill-in panels or sheets.

---

## Token Usage

Menu popovers must use semantic tokens.

Do not hardcode colors, spacing, typography, radius, shadows, motion, or z-index.

### Correct

```text
background: color.surface.card
border: color.border.subtle
text: color.text.primary
secondary text: color.text.secondary
radius: radius.surface.md
shadow: shadow.overlay.dropdown
z-index: zIndex.menu.dropdown
padding: spacing.card.padding.sm
gap: spacing.stack.gap.xs
motion: motion.overlay.enter
```

### Incorrect

```text
background: #FFFFFF
border: 1px solid #C5C5C5
border-radius: 12px
box-shadow: 0px 8px 24px rgba(0,0,0,0.12)
z-index: 9999
padding: 8px
transition: 200ms ease
```

---

## Overlay and Z-Index

Menu popovers usually do not need a page scrim.

Rules:

- Use `zIndex.menu.dropdown` for menu popovers.
- Use `zIndex.menu.tooltip` for tooltips.
- Use `zIndex.overlay.modal` for modals.
- Do not use arbitrary values like `9999`.
- Popovers should appear above cards and tables.
- Popovers should not appear above modals unless intentionally rendered inside the modal context.
- If a menu is opened inside a modal, keep it within the modal stacking context.

---

## Responsive Behavior

Menu popovers should be mobile-first.

### Mobile

- Consider bottom sheet behavior for longer menus.
- Use comfortable tap targets.
- Avoid tiny icon-only triggers when possible.
- Keep destructive actions separated.
- Ensure the menu fits within the viewport.
- Avoid hover-only behavior.
- Use full-width or sheet menu if popover placement becomes awkward.

### Tablet

- Support both touch and pointer behavior.
- Use popover or sheet depending on available space.
- Keep placement inside viewport.

### Desktop

- Use floating popover near the trigger.
- Support hover only for visual states, not opening.
- Support keyboard navigation.
- Keep menus compact.

### Wide

- Do not stretch popovers unnecessarily.
- Keep menu width readable and related to content.
- Keep popover close to its trigger.

---

## Accessibility

Menu popovers must support accessibility by default.

Requirements:

- Trigger must be keyboard accessible.
- Trigger must communicate expanded/collapsed state.
- Menu must have accessible semantics.
- Menu items must be keyboard navigable.
- Focus must move predictably on open and close.
- Escape must close the menu.
- Disabled items must be communicated.
- Selected items must be communicated.
- Destructive actions must be clear in text.
- Do not rely on color alone.
- Contrast must meet WCAG AA.
- Icons must not be the only label.

Recommended trigger semantics:

```text
aria-haspopup="menu"
aria-expanded="true"
aria-controls="menu-id"
```

Recommended menu semantics:

```text
role="menu"
role="menuitem"
role="menuitemcheckbox"
role="menuitemradio"
```

Use native elements when they provide better accessibility.

---

## Trigger Rules

Menu triggers should be clear.

Allowed triggers:

- Button
- Icon button
- Table row action button
- Card overflow button
- Filter button
- Sort button
- Account button

Rules:

- Use `components/button.md`.
- Icon-only triggers require accessible labels.
- Trigger should not be too small.
- Trigger should indicate menu behavior when useful.
- Trigger label should be specific.

Good accessible labels:

```text
Open wallet actions
Open asset actions
Open suggestion actions
Open sort menu
Open filter menu
Open account menu
```

Avoid:

```text
More
Options
Menu
```

when a more specific label is possible.

---

## Destructive Action Rules

Menu popovers may contain destructive menu items, but they should not perform major destructive actions without confirmation.

Examples:

```text
Remove wallet
Disconnect wallet
Delete address
Discard changes
```

Rules:

- Destructive items should use `components/menu-item.md` destructive state.
- Important destructive actions should open `components/modal.md`.
- Do not place destructive items at the top unless the menu is specifically about removal.
- Use a divider before destructive items when grouped with safe actions.
- Do not use vague destructive labels.
- Do not default focus to destructive actions.

Good:

```text
Remove wallet
```

Bad:

```text
Delete
```

---

## Smith AI Menu Rules

Menu popovers may include Smith AI actions.

Examples:

```text
Ask Smith AI
Explain this suggestion
Explain this metric
```

Rules:

- Menu action may open Smith AI.
- Menu popover does not generate the answer.
- Parent context should pass structured context to Smith AI.
- During onboarding, Smith AI is already open and should remain open.
- Do not use Smith AI menu labels that imply guaranteed advice.

Avoid:

```text
Ask AI what to buy
Find best investment
Maximize gains
```

---

## Content Rules

Menu popover copy should follow WealthSmith voice:

- Clear
- Calm
- Specific
- Beginner-friendly
- Non-hype

Good labels:

```text
View details
Copy address
Rename wallet
Remove wallet
Refresh data
Sort by value
Filter by wallet
Ask Smith AI
Explain this metric
```

Good empty state:

```text
No actions available.
```

Good error state:

```text
Could not load actions.
```

Avoid vague labels:

```text
Action
Proceed
Confirm
Thing
Do it
```

Avoid hype:

```text
Best profit
Guaranteed return
Maximize gains
Risk-free option
```

---

## Financial and Wallet Language Rules

Menu popover content must be precise.

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

## Validation and State Rules

Menu popover state belongs outside the component.

The menu popover may display:

- Open state
- Closed state
- Loading state
- Empty state
- Error state
- Menu sections
- Menu items
- Selected states
- Disabled states
- Destructive states

The menu popover must not decide:

- Whether an action is allowed
- Whether a wallet can be removed
- Whether a token is recommended
- Whether a protocol is best
- Whether a suggestion is high priority
- Whether a financial action should proceed

---

## Do

- Use menu popovers for compact secondary actions and choices.
- Use semantic tokens.
- Use menu items from `components/menu-item.md`.
- Keep menu labels short and specific.
- Manage focus correctly.
- Support keyboard navigation.
- Close predictably.
- Keep destructive actions clear and separated.
- Use confirmation modals for important destructive actions.
- Keep product logic outside the component.

---

## Do Not

- Do not use menu popovers for primary actions that should be visible.
- Do not use menu popovers for long forms or critical warnings.
- Do not hide important financial information inside menus.
- Do not invent actions, labels, disabled states, or destructive states.
- Do not allow destructive actions to trigger accidentally.
- Do not rely on hover to open menus.
- Do not use arbitrary z-index values like `9999`.
- Do not imply guaranteed returns.
- Do not use hype-based financial copy.
- Do not imply custody, execution, or investment action unless the product actually supports it.
- Do not hardcode raw visual values.
