# Select Menu

Select menus let users choose one option from a compact list.

In WealthSmith, select menus may be used for filters, sorting, wallet selection, token selection, network selection, time periods, settings, and compact onboarding choices.

Select menus should be clear, accessible, searchable when needed, and easy to use on mobile.

---

## Purpose

Use select menus when users need to choose one option from a list and the full list does not need to be visible at all times.

A select menu should help users:

- Choose one item from multiple options
- Change a compact setting
- Select a wallet, token, network, protocol, or time period
- Sort or filter displayed information
- Choose a display preference
- Select an onboarding answer when a compact control is appropriate

Select menus should reduce visual clutter while keeping choices understandable.

---

## Important Rule

Select menus display and collect selection state.

Select menus do not contain WealthSmith business logic.

A select menu can display:

- Options
- Selected option
- Placeholder
- Disabled options
- Grouped options
- Searchable options
- Loading state
- Empty state
- Error state
- Helper text

A select menu must not decide:

- Which token is recommended
- Which protocol is best
- Which suggestion is Top Pick
- Which option is financially suitable
- Which wallet is valid beyond provided validation state
- Which network should be preferred
- Which sort order means “best”
- Whether onboarding is complete

Those decisions must come from product logic, backend rules, deterministic rules, or Smith AI orchestration.

The component should render options and selected state provided to it.

---

## When to Use

Use a select menu when:

- Only one option can be selected
- Space is limited
- Options are known and structured
- The selected value should appear in a compact field
- The user does not need to compare all options visually at once

Examples:

```text
Select wallet
Select network
Select token
Sort by
Time period
Risk level
Contribution rhythm
Currency display
Portfolio view
```

Select menus can appear in:

- Onboarding
- Filters
- Settings
- Portfolio views
- Asset detail views
- Wallet flows
- Suggestion details
- Tables
- Modals
- Side panels

---

## When Not to Use

Do not use a select menu for:

- Choosing multiple options
- Complex comparisons
- Important financial decisions that need visible explanation
- Destructive actions
- Primary calls to action
- Long educational choices
- Options that require rich descriptions, metrics, or warnings
- Very short binary on/off settings

Use:

- `components/checkbox.md` for multi-select choices
- `components/toggle.md` for binary on/off settings
- `components/select-card.md` for richer visible choices
- `components/button.md` for actions
- `components/modal.md` for confirmations

---

## Data Source

Select menus should render structured option data.

Expected data may include:

```text
id
name
label
value
selectedValue
placeholder
options
optionGroups
disabled
required
status
helperText
errorMessage
isSearchable
isLoading
isClearable
ariaLabel
```

Option data may include:

```text
id
label
value
description
icon
tokenIcon
badge
disabled
disabledReason
metadata
```

The exact schema can evolve.

The component should not invent options, selected values, disabled states, validation results, or option descriptions.

---

## Anatomy

A select menu can include:

1. Field container
2. Label
3. Optional required or optional indicator
4. Selected value
5. Placeholder
6. Dropdown indicator
7. Optional leading icon
8. Optional selected token icon
9. Optional helper text
10. Optional error text
11. Popover menu
12. Option list
13. Option rows
14. Optional option groups
15. Optional search input
16. Optional empty state
17. Optional loading state

Required:

- Label or accessible label
- Trigger/control
- Selected value or placeholder
- Option list when open
- Visible focus state

Optional:

- Helper text
- Error text
- Search
- Icons
- Token icons
- Badges
- Option descriptions
- Clear action
- Groups

---

## Variants

### Standard Select Menu

Use for simple single-select choices.

Examples:

```text
Monthly
Quarterly
Yearly
```

```text
Low
Medium
High
```

Rules:

- Keep option labels short.
- Use when options are easy to understand without long descriptions.

---

### Searchable Select Menu

Use when the option list is long.

Examples:

- Token selection
- Wallet selection
- Protocol selection
- Network selection when many networks are supported

Rules:

- Search filters visible options.
- Filtering logic belongs outside or in approved UI behavior.
- Search should not create new financial recommendations.
- Empty search state should be clear.

Empty state example:

```text
No tokens found.
```

---

### Token Select Menu

Use when selecting a token or asset.

Examples:

```text
SOL
USDC
BONK
JitoSOL
```

Rules:

- Token icon may be shown.
- Token symbol must be visible.
- Token name may be shown as secondary text.
- Do not rely on token icon alone.
- Use fallback icon behavior when an icon is missing.
- Do not use broken image icons.
- Do not infer token identity from icon alone.
- Do not recommend a token inside the select menu.

Good option:

```text
[Token icon] SOL
Solana
```

Bad option:

```text
[Icon only]
```

---

### Wallet Select Menu

Use when selecting one wallet or tracked address.

Examples:

```text
Phantom
Ledger wallet
Watch-only address
```

Rules:

- Clearly label connected vs watch-only wallets.
- Long wallet addresses should be shortened visually.
- Full address should remain available internally.
- Do not imply custody.
- Do not imply ownership unless product state verifies it.
- Do not imply signing unless the action requires signing.

Good option:

```text
Phantom
Connected wallet
```

```text
8x4...pQ9
Watch-only address
```

---

### Network Select Menu

Use when selecting a supported network.

Examples:

```text
Solana
Ethereum
Bitcoin
```

Rules:

- Show only supported networks provided by product data.
- Do not invent supported networks.
- Do not imply transaction support if the network is view-only.
- Use helper text when network behavior differs.

---

### Sort Select Menu

Use for sorting views.

Examples:

```text
Sort by value
Sort by allocation
Sort by asset name
Sort by updated time
```

Rules:

- Sorting options must be clear.
- Do not label sorting as recommendation ranking unless product logic explicitly supports it.
- Sorting should not imply “best” unless the product has explicitly provided that meaning.

Avoid:

```text
Best first
Highest profit
Safest option
```

Unless those labels are explicitly backed by deterministic product logic and approved copy.

---

### Filter Select Menu

Use for compact single-select filters.

Examples:

```text
All wallets
Connected wallets
Watch-only wallets
```

Rules:

- Filter logic belongs outside the component.
- Selected filter state is displayed by the component.
- Empty filtered states should be handled by the parent view.

---

### Settings Select Menu

Use for user preferences where one option must be selected.

Examples:

```text
Currency display
Default portfolio view
Time period
```

Rules:

- Save behavior belongs outside the component.
- Show loading or error state when saving if needed.
- Do not silently fail.

---

## Option Rows

Option rows may include:

1. Label
2. Optional description
3. Optional icon
4. Optional token icon
5. Optional badge
6. Optional checkmark
7. Optional disabled reason

Rules:

- Label is required.
- Description should be short.
- Icons must support text, not replace it.
- Disabled options should explain why when needed.
- Selected option should be visually and accessibly clear.

Good disabled reason:

```text
Ethereum tracking is not available yet.
```

Avoid vague disabled reason:

```text
Unavailable
```

---

## Token Icons

Select menus may display token icons.

Rules:

- Token symbol must always be visible with the icon.
- Token name should be visible when space allows.
- Token icons are decorative if symbol/name is visible.
- Missing icon should use an approved fallback.
- Broken icons must not appear.
- Do not stretch or distort token icons.
- Do not use icon color as the only identifier.

Fallback examples:

```text
Generic token icon
Token initials
Network-neutral placeholder
```

---

## Placeholder

Use placeholder text when no value has been selected.

Good placeholders:

```text
Select wallet
Select token
Select network
Choose time period
```

Avoid vague placeholders:

```text
Choose
Select
Option
```

Rules:

- Placeholder must not look like a selected value.
- Placeholder should not replace the field label.
- Placeholder should not contain critical instructions.

---

## Sizes

### Small

Use in dense filters, table controls, or compact panels.

Rules:

- Keep text readable.
- Maintain comfortable target size.
- Avoid long option labels.

### Medium

Default select menu size.

Use in forms, onboarding, settings, modals, and dashboards.

### Large

Use when the select menu is a primary form control in onboarding or important flows.

Rules:

- Consider `components/select-card.md` if the choice needs rich explanation.

---

## States

Select menus must support these states.

### Closed

Default state showing selected value or placeholder.

### Open

Menu is visible and options are available.

### Focus

Required for keyboard users.

### Hover

Indicates interactivity for pointer users.

### Selected

Shows the current selected option.

### Disabled

Use when selection is unavailable.

Disabled reason should be clear when not obvious.

### Read-Only

Use when the selected value is shown but cannot currently be changed (for example, a saved setting in a view/read-only form state).

Rules:

- Retain the control shape (trigger and selected value).
- Show the selected value.
- Do not open the menu.
- Use a quieter read-only surface than editable controls; read-only should read as a saved value in a control-shaped container.
- Do not show a focus or active/open ring on click.
- Mute or hide the dropdown indicator (chevron) so it does not imply an interactive dropdown.
- Read-only controls are not keyboard-interactive (not in the tab order) unless product explicitly requires it.
- Read-only is different from disabled: read-only shows a visible saved value that cannot currently be edited; disabled means unavailable.
- Style read-only quieter than the editable/focus state, without the disabled-unavailable treatment.
- Use semantic tokens only.

### Loading

Use while options are loading.

Examples:

```text
Loading wallets…
Loading tokens…
Loading protocols…
```

Do not show fake options while loading.

### Empty

Use when no options are available.

Examples:

```text
No wallets found.
No tokens found.
No networks available.
```

### Error

Use when options cannot be loaded or selected value cannot be saved.

Example:

```text
Could not load wallets. Try again.
```

### Invalid

Use when validation fails.

Example:

```text
Select a wallet to continue.
```

Error text must be associated with the control.

---

## Token Usage

Select menus must use semantic tokens.

Do not hardcode colors, spacing, typography, radius, shadows, motion, or z-index.

### Correct

```text
background: color.surface.card
text: color.text.primary
placeholder: color.text.secondary
border: color.border.strong
focus: shadow.control.focus
label: typography.label.md
value: typography.body.md
helper text: typography.body.sm
error text: color.feedback.danger.text.tint
radius: radius.control.md
popover shadow: shadow.overlay.dropdown
popover z-index: zIndex.menu.dropdown
motion: motion.interaction.hover
```

### Incorrect

```text
background: #FFFFFF
border: 1px solid #999CA0
font-size: 14px
border-radius: 8px
box-shadow: 0px 4px 12px rgba(0,0,0,0.2)
z-index: 9999
```

---

## Placement

Select menu popovers should support adaptive, viewport-aware placement (see `components/menu-popover.md` — Placement).

- Default placement is below the trigger.
- If there is not enough space below, placement may flip above the trigger.
- If neither side fully fits, choose the side with more space and constrain the menu height with internal scrolling.
- Keep the popover aligned to the trigger width and visually connected to the trigger.
- Do not let the popover overflow outside the viewport or force the page to scroll just to reveal the menu.
- Use semantic spacing, radius, border, surface, shadow, and typography tokens.

---

## Responsive Behavior

Select menus should be mobile-first.

### Mobile

- Consider opening as a bottom sheet or full-screen picker for long lists.
- Keep options large enough to tap comfortably.
- Use search for long token or wallet lists.
- Avoid tiny dropdowns.
- Keep selected value readable.
- Prevent option list from going off-screen.
- Do not rely on hover.

### Tablet

- Use dropdown popover or sheet depending on space.
- Keep option list within viewport.
- Support touch and pointer behavior.

### Desktop

- Use dropdown popover for most select menus.
- Support keyboard navigation.
- Keep menu close to trigger.
- Reposition near viewport edges.

### Wide

- Do not make select menus unnecessarily wide.
- Keep option labels readable.
- Keep menu width related to trigger or option content.

---

## Accessibility

Select menus must support accessibility by default.

Requirements:

- Label must be programmatically associated with the control.
- Selected value must be communicated.
- Open/closed state must be communicated.
- Keyboard navigation must be supported.
- Focus must be visible.
- Error and helper text must be associated with the control.
- Disabled options must be communicated.
- Do not rely on color alone.
- Token icons must not be the only identifier.
- Contrast must meet WCAG AA.
- Screen readers must understand available options.

Recommended semantics may vary by implementation:

```text
button + listbox
combobox
select
aria-expanded
aria-controls
aria-activedescendant
aria-describedby
```

Use native select when it provides the best accessibility and styling is not critical.

---

## Keyboard Behavior

Required keyboard behavior for custom select menus:

```text
Tab: move focus to select trigger
Enter: open menu or select highlighted option
Space: open menu or select highlighted option
Arrow Down: move to next option
Arrow Up: move to previous option
Home: move to first option
End: move to last option
Escape: close menu
```

Optional for searchable menus:

```text
Typing: filter options
Backspace: edit search text
```

Rules:

- Focus should remain predictable.
- Selected option should be clear.
- Escape should close without changing value.
- Disabled options should not be selectable.
- Closing menu should return focus to trigger unless product behavior intentionally moves focus.

---

## Validation Rules

Select menu validation belongs outside the component.

The component may display validation state and error messages provided to it.

Allowed field-level validation examples:

- Required selection missing
- Selected option unavailable
- Option list failed to load
- Save failed
- Selection no longer supported

Not allowed inside the select menu component:

- Calculating financial suitability
- Ranking protocols
- Recommending tokens
- Selecting Top Pick
- Determining risk level meaning
- Completing onboarding logic unless state is provided

---

## Content Rules

Select labels and options should follow WealthSmith voice:

- Clear
- Calm
- Specific
- Beginner-friendly
- Non-hype

Good labels:

```text
Wallet
Token
Network
Sort by
Time period
Contribution rhythm
```

Good option labels:

```text
Monthly
Quarterly
All wallets
Connected wallets
Watch-only wallets
Sort by value
Sort by updated time
```

Avoid vague labels:

```text
Choose
Select
Type
Option
```

Avoid hype:

```text
Best profit
Highest gains
Guaranteed return
Risk-free option
```

---

## Financial and Wallet Language Rules

Select menus must use precise financial and wallet language.

Allowed:

```text
Estimated
Watch-only
Connected wallet
Read-only
May change
Public wallet data
Supported network
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

## Do

- Use select menus for compact single selection.
- Use semantic tokens.
- Use token icons with visible token symbols.
- Provide fallback for missing icons.
- Support keyboard navigation.
- Support mobile-friendly sheet behavior when needed.
- Clearly show selected value.
- Clearly label disabled options when needed.
- Use searchable menus for long token, wallet, or protocol lists.
- Keep product logic outside the component.

---

## Do Not

- Do not use select menus for multi-select choices.
- Do not use select menus for destructive actions.
- Do not recommend tokens or protocols inside the component.
- Do not invent options, labels, statuses, or selected values.
- Do not rely on token icons alone.
- Do not show broken icons.
- Do not hide critical warnings inside option descriptions.
- Do not imply guaranteed returns.
- Do not use hype-based financial copy.
- Do not imply custody, execution, or investment action unless the product actually supports it.
- Do not hardcode raw visual values.
