# Checkbox

Checkboxes allow users to select one or more options from a set, confirm a preference, or acknowledge a clearly stated condition.

In WealthSmith, checkboxes may be used in onboarding, settings, filters, wallet/address flows, acknowledgements, and preference selection.

Checkboxes should be clear, accessible, and never misleading.

---

## Purpose

Use checkboxes when users can make independent selections.

A checkbox should help users:

- Select one or more options
- Enable or disable a preference
- Confirm an acknowledgement
- Apply filters
- Choose categories
- Select assets, wallets, or protocols in a list
- Confirm they understand a non-critical condition

Checkboxes should make choices explicit.

---

## Important Rule

Checkboxes collect or display selection state.

Checkboxes do not contain WealthSmith business logic.

A checkbox can display:

- Selected state
- Unselected state
- Indeterminate state
- Disabled state
- Error state
- Helper text
- Requirement text
- Acknowledgement text

A checkbox must not decide:

- Whether a user should invest
- Whether an asset is suitable
- Whether a suggestion is shown
- Whether a suggestion is Top Pick
- Whether a risk level is appropriate
- Whether a protocol is eligible
- Whether a wallet is valid beyond provided validation state
- Whether onboarding is complete beyond provided completion state

Those decisions must come from product logic, backend rules, or deterministic validation.

The component should render the state provided to it.

---

## When to Use

Use a checkbox when each option can be selected independently.

Examples:

- Select multiple asset categories
- Select multiple wallets
- Select several filters
- Confirm “I understand this is read-only”
- Confirm “Show estimated values”
- Enable optional notifications
- Mark onboarding sub-steps as complete when state is provided
- Select rows in a table
- Select multiple suggestions for review, if supported

Use checkboxes when users can choose more than one option.

---

## When Not to Use

Do not use checkboxes for:

- Choosing only one option from a group
- Primary on/off settings that need immediate toggle behavior
- Navigation
- Actions
- Confirming critical financial execution by itself
- Hiding important risk disclosure
- Replacing visible explanations
- Complex multi-step decisions

Use `components/toggle.md` for immediate on/off settings.

Use `components/select-card.md` for richer choice cards.

Use `components/select-menu.md` for compact single selection.

Use a confirmation modal for important destructive or financial actions.

---

## Data Source

Checkboxes should render structured state.

Expected data may include:

```text
id
name
label
checked
indeterminate
disabled
required
status
errorMessage
helperText
value
groupName
ariaLabel
```

The exact schema can evolve.

The component should not invent labels, selected states, requirement states, or validation results.

---

## Anatomy

A checkbox can include:

1. Checkbox control
2. Checkmark or mixed-state icon
3. Label
4. Optional helper text
5. Optional error text
6. Optional required indicator
7. Optional badge or status label
8. Optional group label
9. Optional row or list-item container

Required:

- Checkbox control
- Label or accessible label
- Visible focus state

Optional:

- Helper text
- Error text
- Required indicator
- Indeterminate state
- Description
- Badge

The clickable area should include both the control and label.

---

## Variants

### Standard Checkbox

Use for normal independent selection.

Examples:

```text
Stable assets
Volatile assets
RWA
Yield positions
```

Rules:

- Use when multiple options can be selected.
- Keep labels short.
- Use helper text only when needed.

---

### Checkbox Group

Use when several related checkboxes belong together.

Examples:

```text
Asset types
Wallets to include
Suggestion categories
Notification preferences
```

Rules:

- Group must have a visible group label.
- Each checkbox must have a clear label.
- Helper text may explain the group.
- Error text should appear at group level when the group has validation.

---

### Indeterminate Checkbox

Use when a parent checkbox represents a partial selection.

Examples:

- Some wallets selected
- Some assets selected
- Some rows selected in a table

Rules:

- Indeterminate state must be provided by data.
- Component must not calculate partial selection unless explicitly passed the child states as UI behavior.
- Indeterminate should be visually distinct from checked.
- Screen reader state must communicate mixed state.

Accessible state:

```text
aria-checked="mixed"
```

---

### Row Checkbox

Use inside tables or list rows.

Examples:

- Select asset row
- Select wallet row
- Select suggestion row

Rules:

- Preserve row accessibility.
- Do not make the entire row ambiguous if row also has navigation.
- Avoid conflicting click targets.
- Keep checkbox target comfortable.

---

### Acknowledgement Checkbox

Use when the user must acknowledge a clearly stated condition.

Examples:

```text
I understand this address is tracked in read-only mode.
I understand estimated APY may change.
```

Rules:

- Use for clear acknowledgement, not hidden disclosure.
- Text must be visible and specific.
- Do not use checkbox as the only risk explanation.
- Critical or legal disclosures need dedicated product/legal review.
- Financial execution should not rely only on a checkbox.

Avoid vague acknowledgement:

```text
I agree
I understand
Confirm
```

Better:

```text
I understand this removes the wallet from WealthSmith but does not affect the wallet itself.
```

---

### Filter Checkbox

Use for filter panels or menus.

Examples:

```text
Connected wallets
Watch-only wallets
Estimated values
Missing prices
Staked assets
Yield positions
```

Rules:

- Filtering logic belongs outside the component.
- Checkbox displays selected filter state only.
- Active filters may also use `components/chip.md`.

---

## Sizes

### Small

Use in dense tables or compact lists.

Rules:

- Maintain accessible tap/click target.
- Do not make label text smaller than allowed body minimum.

### Medium

Default checkbox size.

Use in forms, settings, onboarding, filters, and normal lists.

### Large

Use sparingly for high-emphasis onboarding or large touch layouts.

Rules:

- Large checkbox should not look like a button.
- Consider `components/select-card.md` for rich selections.

---

## States

Checkboxes must support these states.

### Unchecked

Default unselected state.

### Checked

Selected state.

### Indeterminate

Mixed or partial selection state.

### Hover

Indicates interactivity for pointer users.

### Focus

Required for keyboard users.

Use visible focus styling.

### Disabled

Use when the option is unavailable.

Rules:

- Disabled reason should be clear if not obvious.
- Disabled checkbox should remain readable.
- Do not hide unavailable but important options without explanation.

### Error

Use when validation fails.

Examples:

```text
Select at least one wallet.
Confirm that you understand this is read-only.
```

Rules:

- Error message should be specific.
- Error should not rely only on color.
- Checkbox must be associated with error text.

### Loading

Use rarely.

Examples:

- Loading checkbox options
- Updating preference state

Rules:

- Do not show fake selected states while loading.
- Preserve previous state when updating if appropriate.

---

## Token Usage

Checkboxes must use semantic tokens.

Do not hardcode colors, spacing, typography, radius, shadows, or motion.

### Correct

```text
label: typography.body.sm
helper text: typography.body.sm
text: color.text.primary
secondary text: color.text.secondary
border: color.border.strong
checked background: color.action.primary.background.default
checked icon: color.text.inverse
focus: shadow.control.focus
error text: color.feedback.danger.text.tint
radius: radius.control.sm
motion: motion.interaction.hover
```

### Incorrect

```text
font-size: 14px
border: 1px solid #999CA0
background: #003DFF
border-radius: 4px
transition: 200ms ease
```

---

## Responsive Behavior

Checkboxes should be mobile-first.

### Mobile

- Keep tap targets comfortable.
- Make label area clickable.
- Avoid dense checkbox lists without grouping.
- Use stacked layout.
- Keep helper and error text readable.
- Avoid tiny checkboxes.

### Tablet

- Checkbox groups may use one or two columns when readable.
- Preserve grouping and label clarity.

### Desktop

- Checkbox groups may be inline or grid-based when options are short.
- Keep alignment consistent.
- Use row checkboxes carefully in tables.

### Wide

- Do not stretch checkbox groups unnecessarily.
- Keep labels close to controls.

---

## Accessibility

Checkboxes must support accessibility by default.

Requirements:

- Native checkbox behavior or equivalent accessible behavior.
- Label must be programmatically associated with checkbox.
- Keyboard support with Space.
- Visible focus state.
- Screen reader support for checked, unchecked, disabled, required, and indeterminate states.
- Error text associated with checkbox or group.
- Do not rely on color alone.
- Contrast must meet WCAG AA.
- Clickable/tappable label area.
- Grouped checkboxes should have group semantics.

Recommended semantics:

```text
input type="checkbox"
aria-describedby="helper-or-error-id"
aria-invalid="true"
aria-required="true"
```

For groups:

```text
fieldset
legend
```

For indeterminate:

```text
aria-checked="mixed"
```

---

## Keyboard Behavior

Required keyboard behavior:

```text
Tab: move focus to checkbox
Space: toggle checkbox
Shift + Tab: move focus backward
```

Rules:

- Enter should not be required for checkbox toggle.
- Focus should remain predictable.
- Disabled checkboxes should not be focusable unless product behavior requires explanatory focus.

---

## Content Rules

Checkbox labels should follow WealthSmith voice:

- Clear
- Calm
- Specific
- Beginner-friendly
- Non-hype

Good labels:

```text
Include connected wallets
Include watch-only wallets
Show estimated values
Stable assets
Yield positions
```

Good acknowledgement text:

```text
I understand this address is tracked in read-only mode.
```

```text
I understand estimated APY may change.
```

Avoid vague labels:

```text
Yes
Confirm
Option 1
Accept
Agree
```

Avoid hype:

```text
Show best profit opportunities
Unlock maximum yield
I accept guaranteed returns
```

---

## Financial and Wallet Language Rules

Checkbox copy must be precise.

Allowed:

```text
Read-only
Estimated
May change
Public wallet data
Connected wallet
Watch-only wallet
```

Avoid:

```text
Guaranteed
Risk-free
Best return
Free money
Profit
Custody access
```

Do not imply WealthSmith can move funds, sign transactions, or execute financial actions unless the product actually supports that action and the flow clearly explains it.

---

## Validation Rules

Checkbox validation belongs outside the component.

The checkbox component may display validation state and error messages provided to it.

Allowed field-level validation examples:

- Required acknowledgement not checked
- At least one option must be selected
- Option unavailable
- Selection limit reached

Not allowed inside the checkbox component:

- Calculating risk tolerance
- Determining investment suitability
- Ranking protocols
- Deciding suggestion eligibility
- Completing onboarding logic unless state is provided

---

## Do

- Use checkboxes for independent multi-select choices.
- Use semantic tokens.
- Make label and control clickable.
- Use group labels for checkbox groups.
- Support indeterminate state.
- Use visible focus states.
- Associate helper and error text accessibly.
- Keep acknowledgement labels specific.
- Keep business logic outside the component.

---

## Do Not

- Do not use checkboxes for single-choice decisions.
- Do not hide critical warnings only behind a checkbox.
- Do not rely on a checkbox alone for financial execution confirmation.
- Do not calculate product logic inside the component.
- Do not invent checked states or validation states.
- Do not use vague labels like “Agree” without context.
- Do not use hype-based financial copy.
- Do not imply guaranteed returns.
- Do not imply custody, execution, or investment action unless the product actually supports it.
- Do not hardcode raw visual values.
