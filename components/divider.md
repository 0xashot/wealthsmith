# Divider

Dividers separate related or unrelated content groups using subtle visual lines or spacing.

In WealthSmith, dividers may appear between sections, cards, list rows, table groups, sidebar groups, menu groups, form groups, modal sections, and page header areas.

Dividers should clarify structure without adding visual noise.

---

## Purpose

Use dividers to create clear separation between nearby content.

A divider should help users understand:

- Where one section ends and another begins
- Which items belong together
- Which actions are grouped
- Where a header, footer, list, or form section changes
- How dense content is organized

Dividers should support layout hierarchy, not become the hierarchy.

---

## Important Rule

Dividers separate content.

Dividers do not contain WealthSmith business logic.

A divider can display:

- Horizontal line
- Vertical line
- Section separator
- Row separator
- Menu separator
- Sidebar group separator
- Optional label when approved
- Spacing between groups

A divider must not decide:

- Which section should appear
- Which content is important
- Which suggestion is Top Pick
- Which portfolio item is risky
- Whether a user should invest
- Whether a wallet is valid
- Whether a protocol is recommended
- Whether content should be hidden or shown

Those decisions must come from product logic, layout rules, parent components, or page patterns.

The divider should render only the visual separation requested by the parent layout.

---

## When to Use

Use a divider when content needs subtle separation.

Examples:

- Between sidebar navigation groups
- Between menu groups
- Between list items
- Between table sections
- Between card header and body
- Between modal body and footer
- Between form groups
- Between page header and page content
- Between alert content and alert actions, when needed
- Between wallet/account actions and destructive actions
- Between chart card sections
- Between suggestion detail sections

Dividers can appear in:

- Cards
- Modals
- Tables
- Lists
- Sidebars
- Menus
- Forms
- Page headers
- Drawers
- Settings pages
- Smith AI panels

---

## When Not to Use

Do not use a divider for:

- Primary visual hierarchy
- Decorative lines
- Replacing spacing
- Replacing headings
- Separating every small element
- Creating strong emphasis
- Showing status or risk
- Indicating selection
- Indicating progress
- Communicating errors or warnings

Use:

- `components/badge.md` for status labels
- `components/alert.md` for persistent warnings or messages
- `components/progress-bar.md` for measurable progress
- `components/tabs.md` for section switching
- Spacing tokens when separation can be handled by layout alone

If spacing is enough, do not add a divider.

---

## Data Source

Dividers usually do not need data.

Expected configuration may include:

```text
orientation
variant
spacing
label
tone
inset
decorative
```

The exact schema can evolve.

The component should not invent labels, section names, grouping, or hierarchy.

---

## Anatomy

A divider can include:

1. Separator line
2. Optional spacing above
3. Optional spacing below
4. Optional label
5. Optional inset
6. Optional orientation

Required:

- Visual separator or spacing rule

Optional:

- Label
- Inset
- Vertical orientation
- Group spacing

Dividers should usually be decorative and not announced by screen readers unless they communicate meaningful structure.

---

## Variants

### Horizontal Divider

Use to separate stacked content.

Examples:

- Card header and body
- Modal body and footer
- List groups
- Settings groups
- Sidebar groups

Rules:

- Use subtle border color.
- Use one-pixel visual weight unless product style defines otherwise.
- Do not overuse.
- Prefer spacing when a line is unnecessary.

---

### Vertical Divider

Use to separate inline content groups.

Examples:

- Header actions
- Toolbar groups
- Metric groups
- Desktop navigation sections

Rules:

- Use sparingly.
- Avoid vertical dividers on cramped mobile layouts.
- Keep height visually aligned with related content.
- Do not use vertical divider as decoration.

---

### Inset Divider

Use when divider should align with content rather than full container edge.

Examples:

- List item separator after leading icon
- Sidebar group separator
- Table-like mobile rows

Rules:

- Inset must align with content grid.
- Do not invent arbitrary inset values.
- Use spacing tokens.

---

### Full-Width Divider

Use when the divider separates major sections across the full container width.

Examples:

- Page header to content
- Modal header/body separator
- Card sections where full separation is needed

Rules:

- Keep line subtle.
- Use full container width, not full viewport unless parent layout requires it.
- Do not make full-width divider look like an announcement or border-heavy frame.

---

### Menu Divider

Use inside menu popovers to separate action groups.

Examples:

```text
View details
Copy address
---
Remove wallet
```

Rules:

- Use `components/menu-popover.md` grouping behavior.
- Use divider before destructive actions when grouped with safe actions.
- Keep spacing compact.
- Divider should not be focusable.

---

### Sidebar Divider

Use between sidebar navigation groups or footer/account area.

Rules:

- Keep subtle.
- Use spacing with the divider.
- Do not divide every navigation item.
- Use group labels when hierarchy needs text.

---

### Form Divider

Use between form sections only when spacing or headings are not enough.

Examples:

- Profile details
- Wallet preferences
- Notification settings

Rules:

- Do not use divider between every input.
- Use headings and spacing first.
- Divider may separate major form groups.

---

### Labeled Divider

Use only when a label clarifies a separation.

Examples:

```text
or
Advanced settings
```

Rules:

- Use sparingly.
- Label must be short.
- Label must not replace a real heading when the section needs one.
- Do not use labeled dividers for financial advice or status.

Common use:

```text
or
```

Example:

```text
Connect wallet
--- or ---
Add watch-only address
```

---

## Sizes and Weight

Dividers should usually be subtle.

Recommended visual weights:

```text
default: 1px visual line
strong: only when major separation is needed
none: spacing-only divider
```

Rules:

- Do not create heavy borders without reason.
- Do not use thick lines as decoration.
- Use stronger separation only for major layout boundaries.
- Use border tokens, not raw pixel/color values.

---

## Spacing

Dividers should include consistent spacing.

Examples:

```text
compact: small menu/list separation
default: section or card separation
comfortable: larger page section separation
```

Rules:

- Use semantic spacing tokens.
- Do not use arbitrary margins.
- Keep spacing symmetrical unless layout requires otherwise.
- Use spacing alone when a line is unnecessary.

---

## States

Dividers are usually stateless.

Allowed states:

### Default

Subtle separator.

### Strong

More visible separator for major layout separation.

### Muted

Low-emphasis separator.

### Hidden

Divider not rendered at a breakpoint or in a specific layout.

Rules:

- Dividers should not have hover, focus, selected, loading, or error states.
- Dividers should not be interactive.
- If a divider appears interactive, the design is wrong.

---

## Token Usage

Dividers must use semantic tokens.

Do not hardcode colors, spacing, radius, shadows, motion, or z-index.

### Correct

```text
line color: color.border.subtle
strong line color: color.border.strong
spacing compact: spacing.stack.gap.sm
spacing default: spacing.stack.gap.md
spacing comfortable: spacing.section.gap.md
label text: typography.label.sm
label color: color.text.secondary
```

### Incorrect

```text
border-top: 1px solid #C5C5C5
margin: 24px 0
height: 1px
background: #999CA0
```

---

## Responsive Behavior

Dividers should be mobile-first.

### Mobile

- Use fewer dividers.
- Prefer spacing when possible.
- Avoid vertical dividers in cramped layouts.
- Make list and card separators subtle.
- Do not create dense line-heavy screens.

### Tablet

- Dividers may separate columns or groups when useful.
- Keep spacing consistent.

### Desktop

- Dividers may separate sidebars, toolbars, card sections, and page content.
- Vertical dividers may be used when space allows.

### Wide

- Do not stretch dividers beyond the content they separate unless parent layout requires it.
- Keep alignment with the layout grid.

---

## Accessibility

Dividers are usually decorative.

Requirements:

- Decorative dividers should be hidden from assistive technologies.
- Meaningful separators should use appropriate semantics only when they help navigation.
- Dividers must not be focusable.
- Dividers must not be announced as content unless they communicate meaningful structure.
- Do not rely on dividers alone to communicate important grouping.
- Use headings, labels, or landmarks when structure matters.

Recommended decorative behavior:

```text
aria-hidden="true"
```

For meaningful separators:

```text
role="separator"
```

Use `role="separator"` only when it adds value.

---

## Content Rules

Dividers usually contain no text.

When using a labeled divider, label copy should be:

- Short
- Clear
- Neutral
- Non-hype

Allowed examples:

```text
or
Advanced
Optional
```

Avoid:

```text
Best choice
Profit mode
Guaranteed
Important
```

Do not use divider labels to communicate financial status, warnings, or recommendations.

---

## Financial and Wallet Language Rules

Dividers should not contain financial or wallet logic.

Allowed labeled divider:

```text
or
```

Allowed layout usage:

```text
Connect wallet
or
Add watch-only address
```

Avoid divider labels like:

```text
Best investment
Safe choice
Profit option
Risk-free path
```

Do not imply WealthSmith can move funds, sign transactions, or execute financial actions through divider language.

---

## Implementation Guidance

Use dividers as layout primitives.

Recommended usage:

```text
Card header
Divider
Card body
```

```text
Safe menu actions
Divider
Destructive menu actions
```

```text
Settings group
Divider
Next settings group
```

Rules:

- Parent component decides where divider appears.
- Divider component should not inspect children or infer grouping.
- Divider should not create margins that conflict with parent layout.
- Prefer parent-controlled spacing where possible.

---

## Do

- Use dividers to clarify content grouping.
- Use semantic tokens.
- Keep dividers subtle.
- Prefer spacing when a line is unnecessary.
- Use full-width or inset dividers intentionally.
- Hide decorative dividers from assistive technologies.
- Use menu dividers before destructive action groups when helpful.
- Keep dividers non-interactive.
- Keep product logic outside the component.

---

## Do Not

- Do not overuse dividers.
- Do not use dividers as decoration.
- Do not use dividers to communicate status, risk, or progress.
- Do not make dividers interactive.
- Do not rely on dividers alone for meaningful structure.
- Do not invent section grouping inside the divider component.
- Do not use arbitrary margins, colors, or border values.
- Do not use hype-based divider labels.
- Do not imply guaranteed returns.
- Do not imply custody, execution, or investment action.
- Do not hardcode raw visual values.
