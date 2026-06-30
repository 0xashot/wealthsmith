# Chip

Chips are compact interactive elements used for filters, selected values, quick choices, and removable selections.

In WealthSmith, chips may be used for active filters, selected wallets, selected assets, selected tokens, categories, time periods, onboarding choices, and quick refinements.

Chips should be clear, lightweight, accessible, and easy to remove or toggle.

---

## Purpose

Use chips to show or control a compact user selection.

A chip should help users:

- See active filters
- Remove selected filters
- Toggle quick filters
- Display selected values
- Represent selected tokens, wallets, or categories
- Refine lists, tables, suggestions, or portfolio views
- Make lightweight choices without opening a larger control

Chips should make selected state visible and easy to change.

---

## Chip vs Badge

Chips and badges are not the same.

### Chip

A chip is interactive.

Use chips for:

```text
Active filters
Selected values
Removable choices
Toggleable options
Quick refinements
```

Examples:

```text
Stable Assets ×
Watch-only ×
SOL ×
High priority ×
```

### Badge

A badge is usually passive.

Use badges for:

```text
Status
Category
Priority
Classification
State labels
```

Examples:

```text
Top Pick
Completed
Estimated
Missing price
```

Use `components/badge.md` for passive status labels.

Use this component when the user can interact with the element.

---

## Important Rule

Chips display or control user-selected UI state.

Chips do not contain WealthSmith business logic.

A chip can display:

- Selected filter
- Selected token
- Selected wallet
- Selected category
- Selected time period
- Toggle state
- Removable state
- Disabled state

A chip must not decide:

- Which suggestion is Top Pick
- Which filter should be active by default
- Which token is recommended
- Which wallet is valid beyond provided validation state
- Which protocol is best
- Whether a value is risky
- Whether the user should invest
- Whether onboarding is complete

Those decisions must come from product logic, backend rules, deterministic rules, or user state.

The component should render chip state provided to it.

---

## When to Use

Use chips when a compact interactive selection improves clarity.

Examples:

- Active filters above a table
- Selected token in a token picker
- Selected wallet in a wallet filter
- Selected asset category
- Suggestion category filters
- Quick filter row
- Onboarding answer summary
- Selected networks
- Selected protocol categories
- Selected time period

Chips can appear in:

- Portfolio overview
- Asset tables
- Filter bars
- Search results
- Wallet pages
- Suggestion pages
- Settings
- Onboarding summaries
- Smith AI contextual panels

---

## When Not to Use

Do not use chips for:

- Passive status labels
- Critical warnings
- Full error messages
- Primary actions
- Long explanations
- Destructive confirmations
- Complex selections that need descriptions
- Dense data tables where labels would crowd rows

Use:

- `components/badge.md` for passive statuses
- `components/button.md` for actions
- `components/select-card.md` for rich choices
- `components/select-menu.md` for compact single selection
- `components/checkbox.md` for simple multi-select lists
- `components/modal.md` for confirmations

---

## Data Source

Chips should render structured state.

Expected data may include:

```text
id
label
value
selected
disabled
removable
variant
icon
tokenIcon
walletIcon
count
ariaLabel
removeAriaLabel
onClick
onRemove
```

The exact schema can evolve.

The component should not invent labels, selected states, default filters, counts, token identities, or disabled reasons.

---

## Anatomy

A chip can include:

1. Container
2. Label
3. Optional leading icon
4. Optional token icon
5. Optional wallet icon
6. Optional count
7. Optional selected indicator
8. Optional remove button
9. Optional disabled state

Required:

- Container
- Label or accessible label
- Visible focus state when interactive

Optional:

- Icon
- Token icon
- Count
- Remove control
- Selected indicator

The chip label should be understandable without relying on color.

---

## Variants

### Filter Chip

Use for active filters.

Examples:

```text
Stable Assets ×
Watch-only ×
Missing price ×
Yield positions ×
```

Rules:

- Shows selected filters.
- Usually removable.
- Removing the chip clears that filter.
- Filtering logic belongs outside the chip.
- Use clear labels that match filter names.

---

### Toggle Chip

Use for quick on/off filters or lightweight selections.

Examples:

```text
All
Connected
Watch-only
Estimated
Staked
Yield
```

Rules:

- Selected state must be visible.
- Toggle behavior belongs to parent state.
- Do not use toggle chips for critical settings.
- Do not use toggle chips when a full toggle switch would be clearer.

---

### Choice Chip

Use for compact single or multi-choice groups.

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

- Use only when options are simple.
- For choices needing explanation, use `components/select-card.md`.
- For long lists, use `components/select-menu.md`.

---

### Removable Chip

Use when a selected value can be removed.

Examples:

```text
SOL ×
USDC ×
Phantom ×
Safety Buffer ×
```

Rules:

- Remove control must have an accessible label.
- Remove target must be easy to tap or click.
- Removing a chip should only update the relevant selection.
- Do not use removable chips for critical warnings.

Accessible label example:

```text
aria-label="Remove SOL filter"
```

---

### Token Chip

Use for selected tokens or asset filters.

Examples:

```text
[Token icon] SOL ×
[Token icon] USDC ×
```

Rules:

- Token icon may be shown.
- Token symbol must be visible.
- Token name may be included when useful.
- Do not rely on token icon alone.
- Use fallback icon behavior when the icon is missing.
- Do not show broken image icons.
- Do not infer token identity from icon alone.

Good:

```text
[Token icon] SOL
```

Bad:

```text
[Icon only]
```

---

### Wallet Chip

Use for selected wallets or wallet filters.

Examples:

```text
Phantom ×
Ledger wallet ×
8x4...pQ9 ×
```

Rules:

- Clearly label watch-only wallet chips when relevant.
- Do not imply custody.
- Do not imply signing unless wallet state supports it.
- Long addresses should be shortened visually but preserved internally.

---

### Count Chip

Use when a compact selection includes a count.

Examples:

```text
Wallets 3
Assets 12
Suggestions 4
```

Rules:

- Count must come from structured data.
- Do not show fake counts.
- Keep counts short.
- Use count chips only when count helps scanning.

---

### Disabled Chip

Use when a chip is visible but not currently interactive.

Examples:

```text
Ethereum
Unavailable
```

Rules:

- Disabled chip should remain readable.
- Disabled reason should be clear when useful.
- Disabled chip should not be removable or toggleable unless product behavior supports it.

---

## Sizes

### Small

Use in dense filter bars, table controls, and compact metadata rows.

Rules:

- Maintain accessible tap/click targets.
- Keep label readable.

### Medium

Default chip size.

Use in dashboards, filters, settings, modals, and onboarding summaries.

### Large

Use sparingly for prominent quick choices.

Rules:

- If the chip begins to feel like a card, use `components/select-card.md`.

---

## States

Chips must support these states.

### Default

Visible chip, not selected or only representing a neutral value.

### Selected

Selected chip state.

Selected state must use more than color when possible.

### Hover

Indicates interactivity for pointer users.

### Focus

Required for keyboard users.

Use visible focus styling.

### Pressed

Optional tactile state for click/tap.

### Disabled

Chip is visible but unavailable.

### Removable

Chip has a remove control.

### Loading

Use rarely.

Examples:

- Applying filter
- Removing selected value
- Loading token metadata

Do not show fake token icons, labels, or counts while loading.

### Error

Use when chip action fails.

Example:

```text
Could not remove this filter.
```

Error should usually be handled by the parent view or toast, not inside the chip alone.

---

## Token Usage

Chips must use semantic tokens.

Do not hardcode colors, spacing, typography, radius, shadows, motion, or z-index.

### Correct

```text
background: color.subdued.neutral.background.default
selected background: color.selection.background.default
text: color.text.primary
secondary text: color.text.secondary
border: color.border.subtle
selected border: color.action.primary.background.default
font: typography.label.sm
radius: radius.control.pill
focus: shadow.control.focus
motion: motion.interaction.hover
```

### Incorrect

```text
background: #F2F2F2
color: #121212
border: 1px solid #C5C5C5
border-radius: 999px
padding: 4px 8px
transition: 200ms ease
```

---

## Token Icons

Chips may include token icons.

Rules:

- Token symbol must be visible.
- Icon must support the label, not replace it.
- Missing icons should use approved fallback behavior.
- Broken icons must not appear.
- Icons should be consistently sized.
- Icons should preserve aspect ratio.
- Token identity must come from structured data, not from icon alone.

Fallback examples:

```text
Generic token icon
Token initials
Network-neutral placeholder
```

---

## Remove Control

Removable chips must have a clear remove control.

Rules:

- Remove control must be keyboard accessible.
- Remove control must have an accessible label.
- Remove control should not be too small on mobile.
- Remove should not accidentally trigger the main chip action.
- Removing should be reversible where product behavior supports it.

Good accessible labels:

```text
aria-label="Remove Stable Assets filter"
aria-label="Remove SOL"
aria-label="Remove Phantom wallet filter"
```

Avoid vague labels:

```text
aria-label="Remove"
aria-label="Close"
```

---

## Responsive Behavior

Chips should be mobile-first.

### Mobile

- Chips may wrap to multiple lines.
- Horizontal scrolling is acceptable for filter rows if product pattern supports it.
- Touch targets must be comfortable.
- Remove controls must be easy to tap.
- Avoid long chip labels.
- Avoid overcrowding the screen with too many chips.

### Tablet

- Chips may wrap or scroll depending on layout.
- Keep spacing consistent.

### Desktop

- Chips may appear in filter bars, table controls, and settings panels.
- Use consistent spacing and alignment.
- Keep chip rows visually connected to the content they affect.

### Wide

- Do not stretch chips.
- Keep chips close to the controls or content they modify.

---

## Accessibility

Chips must support accessibility by default.

Requirements:

- Interactive chips must be keyboard accessible.
- Selected state must be communicated.
- Remove controls must have accessible labels.
- Token icons must not be the only identifier.
- Do not rely on color alone.
- Contrast must meet WCAG AA.
- Focus state must be visible.
- Chip groups should have accessible group labels when needed.
- Disabled state must be communicated.

Recommended semantics depend on chip behavior:

For toggle chips:

```text
button
aria-pressed="true"
```

For removable chips:

```text
button aria-label="Remove SOL filter"
```

For choice groups:

```text
radiogroup / radio
checkbox group / checkbox
```

Use the semantic pattern that matches the interaction.

---

## Keyboard Behavior

Required keyboard behavior depends on chip type.

### Toggle Chip

```text
Tab: move focus to chip
Space: toggle chip
Enter: toggle chip
```

### Removable Chip

```text
Tab: move focus to remove control
Space: remove chip
Enter: remove chip
```

### Choice Chip Group

```text
Tab: move focus into group
Arrow keys: move between options where radio behavior is used
Space: select or toggle focused chip
Enter: select or toggle focused chip where supported
```

Rules:

- Focus should remain predictable.
- Removing a chip should move focus to the next logical element.
- Disabled chips should not be interactive.

---

## Content Rules

Chip labels should follow WealthSmith voice:

- Clear
- Short
- Specific
- Calm
- Non-hype

Good chip labels:

```text
Stable Assets
Watch-only
SOL
USDC
Yield
Estimated
Safety Buffer
Monthly
```

Avoid vague labels:

```text
Option
Filter
Thing
Selected
```

Avoid hype:

```text
Best profit
Huge yield
Guaranteed
Moonshot
Risk-free
```

Chip labels should usually be one to three words.

---

## Financial and Wallet Language Rules

Chip copy must be precise.

Allowed:

```text
Estimated
Watch-only
Read-only
Connected
Staked
Yield
Missing price
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

Chip state belongs outside the component.

The chip component may display:

- Selected state
- Disabled state
- Removable state
- Loading state
- Count
- Token icon
- Wallet icon

The chip component must not decide:

- Which filters are active by default
- Which tokens are recommended
- Which wallets are valid
- Which categories apply
- Which suggestions appear
- Which protocol is selected
- Whether a financial action should proceed

---

## Do

- Use chips for active filters, selected values, and quick choices.
- Use semantic tokens.
- Use chips when interaction is lightweight.
- Use badges instead for passive status labels.
- Include visible text with token icons.
- Provide fallback icons.
- Make removable chips accessible.
- Keep labels short.
- Keep product logic outside the component.

---

## Do Not

- Do not use chips for passive statuses when a badge is more appropriate.
- Do not use chips for destructive confirmations.
- Do not hide critical warnings inside chips.
- Do not recommend tokens, protocols, or actions inside the component.
- Do not invent selected states, labels, icons, or counts.
- Do not rely on token icons alone.
- Do not show broken icons.
- Do not use vague labels.
- Do not imply guaranteed returns.
- Do not use hype-based financial copy.
- Do not imply custody, execution, or investment action unless the product actually supports it.
- Do not hardcode raw visual values.
