# Button

Buttons let users take actions in WealthSmith.

They should be clear, accessible, predictable, and visually consistent across onboarding, wallet connection, portfolio views, suggestions, modals, settings, and Smith AI surfaces.

---

## Purpose

Use buttons for actions the user can intentionally trigger.

Buttons should communicate:

- What action will happen
- Whether the action is primary, secondary, or low-emphasis
- Whether the action is available, disabled, loading, or destructive
- Whether the action changes data, opens a flow, confirms a decision, or dismisses a surface

---

## When to Use

Use a button when the user needs to:

- Continue to the next step
- Connect a wallet
- Open a modal or panel
- Confirm a choice
- Save a change
- Apply a filter
- Start an action
- Retry after an error
- Dismiss or cancel a flow
- View details about a suggestion, portfolio item, or protocol

Examples:

- Connect wallet
- Continue
- Save changes
- Review suggestion
- View details
- Try again
- Dismiss

---

## When Not to Use

Do not use a button for:

- Static labels
- Navigation links that behave like normal links
- Long explanatory copy
- Pure status indicators
- Non-interactive badges
- Financial logic or recommendation decisions

Do not use a button to imply that WealthSmith is taking custody of user funds unless that action is explicitly supported and clearly explained.

Do not use vague labels like:

- Click here
- Submit
- Do it
- Proceed
- Okay

Use specific labels instead.

---

## Anatomy

A button can include:

1. Container
2. Label
3. Optional leading icon
4. Optional trailing icon
5. Optional icon-only layout
6. Optional loading indicator

Required for standard text buttons:

- Container
- Label

Required for icon-only buttons:

- Container
- Icon
- Accessible label

Optional:

- Leading icon
- Trailing icon
- Loading indicator

A button label should remain readable and specific even without icons.

Icon-only buttons must have an accessible label because they do not have visible text.

### Button Icons

Rules:

- Leading and trailing button icons inherit the button's text/foreground
  color by default (as if `currentColor`), unless a component spec
  explicitly overrides them.
- In the enabled state, the icon matches the button's text color (e.g. the
  action color for secondary/link-style buttons).
- In the disabled, locked, or unavailable state, the icon uses the disabled
  foreground color, matching the disabled label.
- Hover, focus, and active states keep the icon color synchronized with the
  button text color.
- Do not hardcode raw icon colors on button icons; use the inherited
  semantic color. An icon asset with a fixed fill/stroke must be applied so
  it follows the button color (e.g. via `currentColor` or a mask), not left
  as its raw file color.
- The icon stays supportive; the visible text label communicates the action.

### Button-Styled Links

A link element may be used when the action navigates to a URL (for example
an external protocol handoff), but it must be styled as a WealthSmith
button, not an inline text link.

Rules:

- Button-styled links must not use browser-default underlined link styling
  (`text-decoration: none`).
- They use the same container, color, border, radius, and state tokens as
  the matching button variant.
- Distinct from the `Link Button` variant below, which is intentionally
  text-like; button-styled links look like buttons.

---

## Variants

### Primary

Use for the main action on a screen, card, modal, or flow.

Examples:

- Connect wallet
- Continue
- Save changes
- Review suggestion

Token guidance:

- Background: `color.action.primary.background.default`
- Hover background: `color.action.primary.background.hover`
- Pressed background: `color.action.primary.background.pressed`
- Text: `color.action.primary.text.default`
- Radius: `radius.control.md`
- Typography: `typography.button.md`
- Motion: `motion.interaction.hover`

Use only one primary button per focused decision area.

---

### Secondary

Use for important supporting actions that should not compete with the primary action.

Examples:

- Learn more
- View details
- Add another wallet
- Back

Token guidance:

- Border: `color.action.secondary.stroke.default`
- Text: `color.action.secondary.text.default`
- Hover background: `color.action.secondary.background.hover`
- Pressed background: `color.action.secondary.background.pressed`
- Radius: `radius.control.md`
- Typography: `typography.button.md`
- Motion: `motion.interaction.hover`

---

### Tertiary

Use for low-emphasis actions, inline actions, or secondary utilities.

Examples:

- Cancel
- Dismiss
- Edit
- Clear
- Skip for now

Token guidance:

- Text: `color.action.tertiary.text.default`
- Hover background: `color.action.tertiary.background.hover`
- Pressed background: `color.action.tertiary.background.pressed`
- Radius: `radius.control.md`
- Typography: `typography.button.md`
- Motion: `motion.interaction.hover`

---

### Destructive

Use only when the action removes, deletes, disconnects, resets, or discards something.

Examples:

- Remove wallet
- Delete address
- Reset settings
- Disconnect

Token guidance:

- Background: `color.feedback.danger.background.solid`
- Text: `color.feedback.danger.text.onSolid`
- Hover and pressed states should remain clearly destructive
- Radius: `radius.control.md`
- Typography: `typography.button.md`

Destructive buttons should be used carefully and usually require confirmation for irreversible actions.

---

### Link Button

Use for text-like actions inside compact areas.

Examples:

- Learn more
- See details
- Manage wallets
- View source

Token guidance:

- Text: `color.action.link.default`
- Typography: `typography.button.sm`
- Hover should provide visible affordance
- Do not rely on color alone for accessibility

Use an actual link element when the action navigates to a URL.

---

### Icon Button

Use icon-only buttons for compact utility actions where the icon is familiar and space is limited.

Examples:

- Close modal
- Open Smith AI
- Copy wallet address
- Remove wallet
- Open menu
- Expand row
- Collapse row
- Refresh data
- Edit item

Icon buttons must include an accessible label.

Examples:

```text
aria-label="Close"
aria-label="Open Smith AI"
aria-label="Copy wallet address"
aria-label="Remove wallet"
```

Icon buttons should not rely on the icon alone when the action is unusual, high-risk, destructive, or financial.

Use a text button instead when the action needs explanation.

Token guidance:

- Radius: `radius.control.md` or `radius.control.pill`
- Typography: not required unless paired with visible text
- Background: use the relevant button variant token
- Icon color: use the matching semantic text or action color
- Focus: `shadow.control.focus`
- Motion: `motion.interaction.hover`

Icon-only buttons should have a comfortable touch target on mobile.

Icon-only destructive actions should be avoided unless the action is obvious and has confirmation where needed.

---

## Sizes

### Small

Use for compact actions in cards, tables, filters, and dense layouts.

Recommended usage:

- Asset rows
- Table rows
- Compact cards
- Inline controls

Token guidance:

- Typography: `typography.button.sm`
- Horizontal padding: `spacing.inline.gap.md`
- Vertical padding: `spacing.inline.gap.sm`
- Radius: `radius.control.sm`

---

### Medium

Default button size.

Recommended usage:

- Forms
- Modals
- Suggestion cards
- Standard dashboard actions

Token guidance:

- Typography: `typography.button.md`
- Horizontal padding: `spacing.card.gap.lg`
- Vertical padding: `spacing.inline.gap.md`
- Radius: `radius.control.md`

---

### Large

Use for high-emphasis actions in onboarding, empty states, and major flows.

Recommended usage:

- Connect wallet
- Continue onboarding
- Start portfolio review

Token guidance:

- Typography: `typography.button.md`
- Horizontal padding: `spacing.card.padding.md`
- Vertical padding: `spacing.card.gap.md`
- Radius: `radius.control.lg`

---

### Icon Size

Icon buttons should support compact, default, and large sizes.

Recommended usage:

- Compact: table rows, dense cards, chip controls
- Default: modals, wallet rows, dashboard cards
- Large: floating triggers, Smith AI entry points, mobile touch targets

Icon-only buttons must keep a comfortable tap target on mobile even when the icon itself is small.

---

## States

Buttons must define these states:

### Default

The normal interactive state.

### Hover

Shows that the button is interactive.

Use:

- `motion.interaction.hover`

### Pressed

Shows that the button is actively being pressed.

Use:

- `motion.interaction.press`

### Focus

Shows keyboard focus.

Use:

- `shadow.control.focus`
- `color.focus.outline.default`

Focus must be visible and must not rely on color alone.

### Disabled

Use when the action is temporarily unavailable.

Disabled buttons should:

- Look unavailable
- Remain readable
- Avoid tooltips as the only explanation
- Include helper text nearby when the reason is not obvious

Token guidance:

- Background: `color.disabled.background.default`
- Text: `color.disabled.text.default`
- Stroke: `color.disabled.stroke.default`

### Loading

Use when the action has been triggered and the system is processing.

Loading buttons should:

- Prevent duplicate submission
- Keep the button width stable when possible
- Show a spinner or progress indicator
- Keep or preserve the action label when possible

Examples:

- Connecting wallet
- Saving changes
- Loading suggestion details

Icon-only loading buttons should preserve the accessible label and expose loading status where relevant.

### Error

Use only when the button itself is part of a failed action state.

Prefer showing the error message near the related field, card, or flow instead of changing only the button.

---

## Token Usage

Buttons must use semantic tokens.

Do not hardcode colors, spacing, typography, radius, shadows, or motion.

### Correct

```text
background: color.action.primary.background.default
color: color.action.primary.text.default
font: typography.button.md
border-radius: radius.control.md
box-shadow: shadow.control.default
transition: motion.interaction.hover
```

### Incorrect

```text
background: #003DFF
color: #FFFFFF
font-size: 16px
border-radius: 12px
transition: 180ms ease
```

---

## Responsive Behavior

Buttons should be mobile-first.

### Mobile

- Primary buttons may stretch full width in onboarding, modals, and main flows.
- Button groups should stack vertically when horizontal space is limited.
- Touch targets must be large enough for comfortable tapping.
- Avoid placing too many actions side by side.
- Icon-only buttons must remain easy to tap.

### Tablet

- Buttons may remain inline when space allows.
- Important actions should remain visually grouped.
- Icon buttons may appear in card headers, tables, and side panels.

### Desktop

- Buttons may use natural width.
- Primary and secondary actions may sit side by side.
- Avoid oversized buttons in dense dashboard areas.
- Icon buttons may be used for compact utilities when the action is clear.

### Wide

- Keep buttons aligned with their content area.
- Do not stretch buttons across overly wide containers unless the layout requires it.

---

## Accessibility

Buttons must support:

- Keyboard focus
- Enter and Space activation
- Visible focus indicator
- Disabled state semantics
- Loading state semantics
- Screen reader labels when icon-only
- Sufficient color contrast
- Reduced motion settings

Icon-only buttons must include an accessible label.

Examples:

```text
aria-label="Close"
aria-label="Open Smith AI"
aria-label="Copy wallet address"
aria-label="Remove wallet"
```

Loading buttons should communicate progress where relevant.

Example:

```text
aria-busy="true"
```

Disabled buttons should use real disabled behavior when the action cannot be triggered.

Do not rely on icon shape alone for important or risky actions.

---

## Content Rules

Button labels should be:

- Short
- Specific
- Action-oriented
- Calm
- Beginner-friendly

Use verbs when possible.

Good examples:

```text
Connect wallet
Continue
Save changes
Review suggestion
View details
Add wallet
Try again
Dismiss
```

Avoid:

```text
Click here
Submit
Proceed
Do it
Okay
Yes
No
```

Use “Continue” only when the next step is obvious from context.

Use “Review suggestion” instead of “Invest now” when WealthSmith is presenting a recommendation.

Use “View details” when the user needs more explanation before acting.

Avoid hype or pressure language.

Do not use:

```text
Maximize gains
Get rich
Buy now
Best investment
Guaranteed return
```

Icon-only buttons do not have visible labels, but their accessible labels should follow the same rules.

Good accessible labels:

```text
Close modal
Open Smith AI
Copy wallet address
Remove wallet
Refresh portfolio
```

Avoid vague accessible labels:

```text
Icon
Button
Action
Menu button
```

---

## Do

- Use one primary button per focused decision area.
- Use semantic tokens.
- Keep labels specific.
- Show loading state after action is triggered.
- Preserve readable contrast.
- Make focus states visible.
- Stack button groups on small screens when needed.
- Use destructive styling only for destructive actions.
- Use icon-only buttons only when the action is familiar and space is limited.
- Provide accessible labels for all icon-only buttons.

---

## Do Not

- Do not hardcode raw visual values.
- Do not use buttons for static labels.
- Do not make every action primary.
- Do not use vague labels.
- Do not rely only on icons for unusual or risky actions.
- Do not use icon-only buttons without accessible labels.
- Do not hide disabled reasons when the reason is important.
- Do not put WealthSmith recommendation logic inside the button.
- Do not use hype-based financial copy.
- Do not imply custody, execution, or investment action unless the product actually supports it.
