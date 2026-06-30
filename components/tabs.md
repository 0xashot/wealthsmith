# Tabs

Tabs organize related views into a small set of sibling sections.

In WealthSmith, tabs may be used for portfolio views, wallet details, asset details, suggestion categories, activity sections, settings groups, protocol details, and Smith AI-related panels.

Tabs should help users switch between related content without losing context.

---

## Purpose

Use tabs when several related views belong at the same level and users need to switch between them quickly.

A tabs component should help users:

- Move between related sections
- Compare nearby views
- Keep page context stable
- Reduce page length
- Avoid unnecessary navigation
- Understand which section is currently active

Tabs should organize content, not hide important decisions.

---

## Naming

Use the file name:

```text
components/tabs.md
```

Reason:

- `Tabs` describes the complete component system.
- A single clickable item inside the system is a `tab`.
- The component includes tab list, tab items, active state, keyboard behavior, and tab panels.

---

## Important Rule

Tabs control view switching.

Tabs do not contain WealthSmith business logic.

A tabs component can display:

- Tab labels
- Active state
- Disabled state
- Count
- Badge
- Icon
- Loading state
- Associated tab panel

A tabs component must not decide:

- Which suggestion is Top Pick
- Which portfolio view is best
- Which token is recommended
- Which protocol is recommended
- Which tab should contain a suggestion
- Whether a user should invest
- Whether a wallet is valid beyond provided state
- Whether onboarding is complete

Those decisions must come from product logic, backend rules, deterministic rules, or parent state.

The component should render tabs, active state, counts, badges, and disabled states provided to it.

---

## When to Use

Use tabs when users need to switch between related sections.

Examples:

- Portfolio / Assets / Yield
- Overview / Holdings / Activity
- Connected wallets / Watch-only addresses
- Suggestions / Completed / Dismissed
- Details / Risk / Protocols
- Settings / Notifications / Privacy
- All / Stable Assets / Volatile Assets
- Active / Completed
- Smith AI conversation / Context, if product behavior supports it

Tabs can appear in:

- Dashboard sections
- Portfolio pages
- Wallet detail pages
- Asset detail pages
- Suggestion pages
- Settings pages
- Modals
- Side panels
- Smith AI panel sections

---

## When Not to Use

Do not use tabs for:

- Primary app navigation across unrelated destinations
- Sequential onboarding steps
- Long multi-step forms
- Hidden critical warnings
- Actions
- Filters with many values
- Large comparisons requiring tables
- Content users need to see at the same time
- Single-section pages

Use:

- `components/sidebar.md` for primary app navigation
- `components/chip.md` for quick filters
- `components/select-menu.md` for compact section choice
- `components/table.md` for row comparison
- `components/progress-bar.md` for step progress
- `patterns/onboarding-with-smith-ai.md` for onboarding flow when added

---

## Data Source

Tabs should render structured tab data.

Expected data may include:

```text
id
label
value
active
disabled
disabledReason
count
badge
icon
panelId
ariaLabel
isLoading
```

The exact schema can evolve.

The component should not invent labels, counts, badges, active states, disabled states, or tab panel content.

---

## Anatomy

Tabs can include:

1. Tab list container
2. Individual tab item
3. Tab label
4. Optional icon
5. Optional count
6. Optional badge
7. Active indicator
8. Optional disabled state
9. Associated tab panel
10. Optional overflow behavior on small screens

Required:

- Tab list
- At least two tabs
- Active tab
- Associated panel
- Visible focus state

Optional:

- Count
- Badge
- Icon
- Scroll controls
- Overflow menu
- Loading state
- Disabled state

Tabs should remain understandable without relying on color alone.

---

## Variants

### Standard Tabs

Use for normal page or card section switching.

Examples:

```text
Overview
Assets
Yield
```

Rules:

- Keep labels short.
- Use when sections are siblings.
- Active tab must be clearly visible.
- Associated panel should update immediately.

---

### Dashboard Tabs

Use for switching dashboard sections or summarized views.

Examples:

```text
Portfolio
Suggestions
Activity
```

Rules:

- Do not replace primary navigation.
- Keep dashboard tabs near the content they affect.
- Do not hide urgent or important information in an inactive tab without another visible signal.

---

### Portfolio Tabs

Use for portfolio-related views.

Examples:

```text
Overview
Assets
Wallets
Yield
```

Rules:

- Portfolio values and counts must come from structured data.
- Tabs must not calculate holdings, allocation, APY, or risk.
- Use counts only when they help scanning.

Example:

```text
Assets 12
Wallets 3
Yield 2
```

---

### Suggestion Tabs

Use for grouping suggestions.

Examples:

```text
Active
Completed
Dismissed
```

```text
All
Safety Buffer
Diversification
Yield
```

Rules:

- Suggestion grouping must come from Suggestion Engine or product state.
- Tabs must not decide priority, category, Top Pick, or completion.
- Do not hide the Top Pick in a way that makes it hard to find.
- If an important suggestion is outside the active tab, parent view should provide appropriate visibility.

---

### Settings Tabs

Use for settings sections.

Examples:

```text
Profile
Wallets
Notifications
Preferences
```

Rules:

- Keep settings grouping predictable.
- Do not use tabs for destructive or sensitive actions that need confirmation.
- Preserve unsaved state carefully when switching tabs.

---

### Pill Tabs

Use for compact, chip-like tab switching.

Examples:

```text
All
Connected
Watch-only
```

Rules:

- Use when sections are simple.
- Do not confuse pill tabs with filter chips.
- Active state must be clear.
- If users can select multiple values, use chips or checkboxes instead.

---

### Icon Tabs

Use only when icons improve recognition.

Examples:

- Compact mobile sections
- Space-constrained panels
- Familiar app sections

Rules:

- Icons must not replace labels unless there is an accessible label.
- Use visible labels whenever possible.
- Icon-only tabs require accessible names.
- Do not rely on icon meaning alone.

---

### Scrollable Tabs

Use when tab list is wider than available space.

Examples:

- Mobile category tabs
- Many suggestion categories
- Asset category tabs

Rules:

- Horizontal scroll should be discoverable.
- Active tab should remain visible.
- Do not use too many tabs.
- Consider `components/select-menu.md` if the list becomes long.
- Avoid hiding critical tabs off-screen without indication.

---

## Tab Panels

Each tab should control one associated panel.

Rules:

- Panel content must match the active tab.
- Inactive panels may be hidden or unmounted depending on implementation.
- Preserve user-entered state when appropriate.
- Do not reset forms unexpectedly.
- Loading state should be handled per panel when needed.
- Empty and error states should be shown inside the panel.

Tab panel examples:

```text
Overview panel
Assets panel
Wallets panel
Yield panel
```

---

## Counts and Badges

Tabs may include counts or badges.

Examples:

```text
Assets 12
Wallets 3
Action needed
New
```

Rules:

- Counts must come from structured data.
- Badges must use `components/badge.md`.
- Do not invent counts.
- Do not show fake counts while loading.
- Keep counts visually secondary.
- Do not overload tab labels.

Good:

```text
Suggestions 4
```

Avoid:

```text
Suggestions lots
```

---

## Sizes

### Small

Use inside cards, modals, compact panels, and sidebars.

Rules:

- Keep labels short.
- Maintain accessible tap or click target.

### Medium

Default tab size.

Use on dashboard sections, portfolio pages, wallet pages, and suggestion pages.

### Large

Use for important top-level page sections when tabs are central to the page.

Rules:

- Do not make tabs look like primary app navigation if they only affect local content.

---

## States

Tabs must support these states.

### Default

Inactive, enabled tab.

### Active

Currently selected tab.

Rules:

- Must be visually clear.
- Must be communicated accessibly.
- Should not rely on color alone.

### Hover

Indicates interactivity for pointer users.

### Focus

Required for keyboard users.

### Pressed

Optional tactile state.

### Disabled

Use when a tab is visible but unavailable.

Rules:

- Disabled reason should be available when useful.
- Disabled tabs should not be selectable.
- Do not hide unavailable sections if visibility helps users understand product limits.

### Loading

Use when tab count or panel content is loading.

Rules:

- Do not show fake counts.
- Keep active tab state stable.

### Error

Error should usually appear inside the tab panel.

Example:

```text
Could not load assets.
```

---

## Token Usage

Tabs must use semantic tokens.

Do not hardcode colors, spacing, typography, radius, shadows, motion, or z-index.

### Correct

```text
tab text: color.text.secondary
active text: color.text.primary
active indicator: color.action.primary.background.default
hover background: color.subdued.neutral.background.hover
selected background: color.selection.background.default
border: color.border.subtle
label: typography.label.md
radius: radius.control.md
focus: shadow.control.focus
motion: motion.interaction.hover
```

### Incorrect

```text
color: #003DFF
font-size: 14px
border-bottom: 2px solid #003DFF
border-radius: 8px
transition: 200ms ease
```

---

## Responsive Behavior

Tabs should be mobile-first.

### Mobile

- Use horizontal scrolling when labels are short and there are several tabs.
- Keep active tab visible.
- Keep tap targets comfortable.
- Do not force tabs into tiny widths.
- Avoid too many tabs.
- Consider select menu behavior when the list is long.
- Do not hide important warnings in inactive panels only.

### Tablet

- Tabs may be scrollable or full-width depending on count.
- Keep labels readable.
- Keep tab panels close to the tab list.

### Desktop

- Tabs may be inline.
- Use consistent spacing.
- Keep tab list aligned with the content it controls.
- Avoid stretching tabs unnecessarily.

### Wide

- Do not over-stretch tabs across the page.
- Keep tab list close to related content.
- Keep line length and panel width readable.

---

## Accessibility

Tabs must support accessibility by default.

Requirements:

- Use proper tab semantics where custom tabs are implemented.
- Active tab must be communicated.
- Tab panel must be associated with active tab.
- Keyboard navigation must be supported.
- Focus state must be visible.
- Disabled state must be communicated.
- Counts and badges must be readable.
- Do not rely on color alone.
- Contrast must meet WCAG AA.
- Icon-only tabs need accessible labels.

Recommended semantics:

```text
role="tablist"
role="tab"
role="tabpanel"
aria-selected="true"
aria-controls="panel-id"
aria-labelledby="tab-id"
```

Use native links or buttons when appropriate.

---

## Keyboard Behavior

Recommended keyboard behavior:

```text
Tab: move focus into or out of the tab list
Arrow Right: move to next tab
Arrow Left: move to previous tab
Home: move to first tab
End: move to last tab
Enter: activate focused tab where manual activation is used
Space: activate focused tab where manual activation is used
```

Rules:

- Disabled tabs should not activate.
- Focus should remain predictable.
- Active panel should update clearly.
- For automatic activation, avoid slow-loading panels that cause lag during arrow navigation.
- For slow panels, use manual activation with Enter or Space.

---

## Content Rules

Tab labels should follow WealthSmith voice:

- Clear
- Short
- Specific
- Calm
- Non-hype

Good labels:

```text
Overview
Assets
Wallets
Yield
Active
Completed
Dismissed
Settings
Notifications
```

Avoid vague labels:

```text
Info
Stuff
Data
More
Other
```

Avoid hype:

```text
Best gains
Profit mode
Guaranteed yield
Moonshot
```

Tab labels should usually be one to two words.

---

## Financial and Wallet Language Rules

Tab copy must be precise.

Allowed:

```text
Assets
Wallets
Yield
Estimated
Watch-only
Connected
Activity
Suggestions
```

Avoid:

```text
Guaranteed
Risk-free
Best return
Profit mode
Auto-invest
```

Do not imply WealthSmith can move funds, sign transactions, or execute financial actions unless the product actually supports that action and the flow clearly explains it.

---

## Smith AI Rules

Tabs may appear inside Smith AI or near Smith AI context, but they must not control Smith AI reasoning.

Allowed Smith AI-related tabs:

```text
Chat
Context
Sources
```

Rules:

- Smith AI tab labels must be clear.
- Tabs may switch assistant panel sections.
- Tabs do not generate Smith AI responses.
- During onboarding, Smith AI remains open.
- Do not hide required onboarding guidance inside an inactive tab.

---

## Validation and State Rules

Tab state belongs outside the component.

Tabs may display:

- Active state
- Disabled state
- Count
- Badge
- Loading state
- Error state in panel

Tabs must not decide:

- Which tab should be active by product strategy
- Which suggestions belong in a category
- Which suggestions are completed
- Which tokens are recommended
- Which protocols are ranked
- Whether a financial action should proceed

---

## Do

- Use tabs for sibling sections.
- Use semantic tokens.
- Keep tab labels short.
- Show active state clearly.
- Support keyboard navigation.
- Associate tabs with panels accessibly.
- Use counts only from structured data.
- Use badges only when useful.
- Use scrollable tabs carefully on mobile.
- Keep product logic outside the component.

---

## Do Not

- Do not use tabs for unrelated primary navigation.
- Do not use tabs for sequential onboarding steps.
- Do not hide critical warnings in inactive tabs only.
- Do not invent labels, counts, badges, or active states.
- Do not calculate suggestion categories or portfolio values inside tabs.
- Do not rely on color alone.
- Do not use icon-only tabs without accessible labels.
- Do not use hype-based financial copy.
- Do not imply guaranteed returns.
- Do not imply custody, execution, or investment action unless the product actually supports it.
- Do not hardcode raw visual values.
