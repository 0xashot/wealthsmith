# Input

Inputs let users enter, edit, search, or provide information in WealthSmith.

They are used in onboarding, wallet/address flows, settings, filters, forms, search, profile setup, and financial planning fields.

Inputs should feel clear, forgiving, accessible, and trustworthy.

---

## Purpose

Use inputs to collect user-provided information.

An input should help users:

- Understand what information is needed
- Enter the information safely
- See whether the value is valid, invalid, optional, required, loading, or disabled
- Recover from mistakes
- Understand how the value will be used

Inputs should reduce uncertainty and avoid making users feel punished for mistakes.

---

## Important Rule

Inputs collect user data.

Inputs do not interpret financial meaning.

An input can collect:

- Monthly income
- Monthly expenses
- Monthly saving goal
- Wallet address
- Search text
- Token amount
- Percentage
- Email
- Name or label
- Notes or comments

An input must not decide:

- Risk level
- Portfolio health
- Safety buffer coverage
- Suggestion priority
- Top Pick status
- Protocol eligibility
- Token selection
- Whether a user should invest
- Whether a financial decision is good or bad

Validation may check whether input format is valid.

Product logic should interpret what the value means.

---

## When to Use

Use an input when the user needs to provide or edit information.

Examples:

- Enter monthly income
- Enter monthly expenses
- Enter monthly saving goal
- Add wallet address
- Search assets
- Search wallets
- Rename wallet
- Enter allocation target
- Enter amount
- Add note
- Filter portfolio data
- Enter email or account information

---

## When Not to Use

Do not use an input for:

- Static values
- Read-only metrics
- Labels
- Badges
- Buttons
- Suggestions
- Status messages
- Data that the user cannot edit
- Financial interpretation or recommendation output

Use a metric card for read-only numeric values.

Use a suggestion card for recommendations.

Use a button for actions.

Use a badge for status.

---

## Data Source

Inputs should render and update structured form data.

Expected input data may include:

```text
id
name
label
value
placeholder
type
inputMode
required
optional
disabled
readOnly
status
errorMessage
helperText
prefix
suffix
leadingIcon
trailingIcon
isLoading
isValidating
maxLength
min
max
step
autoComplete
```

The exact schema can evolve.

Inputs should not invent default values unless product logic provides them.

---

## Anatomy

An input can include:

1. Field container
2. Label
3. Optional required or optional indicator
4. Input control
5. Optional placeholder
6. Optional leading icon
7. Optional trailing icon
8. Optional prefix
9. Optional suffix
10. Optional clear button
11. Optional copy button
12. Optional loading or validating indicator
13. Helper text
14. Error text
15. Success or validation text

Required:

- Label or accessible label
- Input control

Optional:

- Placeholder
- Helper text
- Error text
- Leading icon
- Trailing icon
- Prefix
- Suffix
- Clear button
- Copy button
- Loading indicator
- Required or optional marker

A placeholder is not a replacement for a label.

---

## Variants

### Text Input

Use for general short text.

Examples:

- Wallet label
- User name
- Search label
- Custom portfolio label

Token guidance:

- Background: `color.surface.card`
- Border: `color.border.strong`
- Text: `color.text.primary`
- Placeholder: `color.text.secondary`
- Radius: `radius.control.md`
- Typography: `typography.body.md`
- Focus: `shadow.control.focus`

---

### Number Input

Use for numeric values.

Examples:

- Monthly income
- Monthly expenses
- Monthly saving goal
- Target amount
- Asset amount

Rules:

- Use numeric keyboard on mobile.
- Do not allow confusing formatting during typing.
- Format the value after input where appropriate.
- Preserve meaningful precision.
- Do not silently change the meaning of the value.

---

### Currency Input

Use for money amounts.

Examples:

- Monthly income
- Monthly expenses
- Monthly savings goal
- Safety buffer target
- Contribution amount

Rules:

- Show currency prefix or context.
- Use readable formatting.
- Avoid excessive decimals.
- Do not show fake default values.
- Do not assume a missing value is zero.
- Keep validation messages clear.

Examples:

```text
$4,000
$1,000
$800
```

The component collects the value.

Product logic decides how it affects planning.

---

### Percentage Input

Use for allocation targets, APY filters, or percentage-based settings when needed.

Examples:

- Target allocation
- Risk tolerance setting if represented numerically
- Custom filter

Rules:

- Show `%` suffix.
- Avoid unnecessary decimals.
- Explain the expected range if needed.
- Do not infer risk meaning from the percentage inside the component.

---

### Search Input

Use for searching or filtering.

Examples:

- Search assets
- Search wallets
- Search protocols
- Search suggestions
- Search settings

Search input may include:

- Leading search icon
- Clear button
- Loading state
- Empty result state outside the input

Rules:

- Use clear placeholder text.
- Keep search behavior outside the input component.
- The input only captures query text.

---

### Wallet Address Input

Use when the user enters a wallet address or watch-only address.

Examples:

- Add Solana address
- Add Bitcoin address
- Add Ethereum address
- Track public wallet

Rules:

- Validate address format only when product logic supports the network.
- Do not imply wallet ownership unless verified.
- Do not imply signing or custody.
- Make watch-only behavior clear when relevant.
- Support paste.
- Support copy when displaying entered address.
- Show clear error messages for invalid format.
- Use monospaced or readable formatting only if defined by product style.

Good helper text:

```text
Paste a public wallet address to track it in read-only mode.
```

Avoid:

```text
Connect this wallet
```

when the flow is only adding a public address.

---

### Textarea

Use for longer free-form text.

Examples:

- Notes
- Feedback
- Support message
- Optional explanation

Rules:

- Use only when multi-line input is needed.
- Show character count when limits matter.
- Avoid using textarea for structured financial data.

---

### Select-Like Input

Use when an input opens a selection menu.

Examples:

- Select goal
- Select risk level
- Select timeframe
- Select wallet
- Select network

Rules:

- Use button or combobox semantics depending on behavior.
- Do not behave like a text input unless the user can type.
- Use clear selected value.
- Support keyboard navigation.
- Keep option selection logic outside the input styling contract.

---

## Sizes

### Small

Use in dense filters, table controls, and compact cards.

Token guidance:

- Typography: `typography.body.sm`
- Padding: `spacing.inline.gap.sm`
- Radius: `radius.control.sm`

---

### Medium

Default input size.

Token guidance:

- Typography: `typography.body.md`
- Padding: `spacing.inline.gap.md`
- Radius: `radius.control.md`

---

### Large

Use in onboarding, major forms, and primary user flows.

Token guidance:

- Typography: `typography.body.md`
- Padding: `spacing.card.gap.md`
- Radius: `radius.control.lg`

---

## States

Inputs must support these states.

### Default

Normal editable input.

### Hover

Show subtle affordance when the input is interactive.

Use:

- `motion.interaction.hover`

### Focus

Focus must be visible and accessible.

Use:

- `shadow.control.focus`
- `color.focus.outline.default`

The label and helper text should remain readable.

### Filled

Use when the input has a value.

Filled state should not reduce readability.

### Disabled

Use when the input cannot be changed.

Disabled inputs should:

- Look unavailable
- Keep content readable if important
- Not receive focus
- Not allow editing
- Include explanation nearby when needed

Token guidance:

- Background: `color.disabled.background.default`
- Text: `color.disabled.text.default`
- Stroke: `color.disabled.stroke.default`

### Read-Only

Use when the value can be seen but not edited.

Read-only is different from disabled.

Examples:

- Wallet address already connected
- Imported value
- System-calculated value shown in a form

Read-only values may allow copy.

### Error

Use when input value is invalid or missing.

Error state should include clear error text.

Good examples:

```text
Enter a valid wallet address.
Monthly expenses must be greater than $0.
This field is required.
```

Avoid vague errors:

```text
Invalid
Wrong
Error
Bad input
```

Use:

- `color.feedback.danger`
- Error text
- Accessible error relationship

Do not rely on red border alone.

### Success

Use only when validation success is useful.

Examples:

- Address format valid
- Email verified
- Value saved

Do not overuse success states.

### Loading

Use when input-related data is loading.

Examples:

- Searching assets
- Loading protocol options
- Fetching wallet metadata

### Validating

Use when the system is checking the value.

Examples:

- Checking wallet address format
- Checking whether an address is supported
- Validating username or label availability

Validating should be visibly different from final success or error.

### Empty

Use when the input has no value.

Placeholder text may help, but the label must still exist.

---

## Token Usage

Inputs must use semantic tokens.

Do not hardcode colors, spacing, typography, radius, shadows, or motion.

### Correct

```text
background: color.surface.card
border: color.border.strong
color: color.text.primary
placeholder: color.text.secondary
padding: spacing.inline.gap.md
font: typography.body.md
border-radius: radius.control.md
focus: shadow.control.focus
transition: motion.interaction.hover
```

### Incorrect

```text
background: #FFFFFF
border: 1px solid #C5C5C5
font-size: 16px
border-radius: 12px
padding: 12px 16px
transition: 180ms ease
```

---

## Icons and Inline Actions

Inputs may include leading or trailing icons.

Examples:

- Search icon
- Wallet icon
- Currency icon
- Clear icon
- Copy icon
- Warning icon
- Success icon
- Loading spinner

Rules:

- Icons must not replace labels.
- Icon-only inline actions need accessible labels.
- Clear buttons should be keyboard accessible.
- Copy buttons should confirm successful copy where appropriate.
- Do not overload one input with too many icons.

Accessible label examples:

```text
aria-label="Clear search"
aria-label="Copy wallet address"
aria-label="Show value"
aria-label="Hide value"
```

---

## Helper Text

Helper text explains what the input is for or how the value will be used.

Good helper text:

```text
Use your average monthly expenses.
Paste a public wallet address to track it in read-only mode.
This helps WealthSmith estimate your safety buffer target.
```

Rules:

- Keep helper text short.
- Use calm, plain language.
- Do not hide critical information only in helper text.
- Do not use helper text for financial advice.

---

## Error Text

Error text should explain the problem and how to fix it.

Good examples:

```text
Enter a valid Solana address.
Monthly income must be greater than $0.
Use numbers only.
This field is required.
```

Avoid:

```text
Invalid
Failed
Wrong
Bad value
```

Error text should be connected to the input for screen readers.

---

## Placeholder Text

Placeholders should show examples, not instructions that disappear.

Good placeholders:

```text
4,000
1,000
Search assets
Paste wallet address
```

Avoid:

```text
Enter your monthly income here because we need it to calculate your plan
```

Do not rely on placeholder text as the only label.

---

## Formatting Rules

### Currency

Display values clearly.

Examples:

```text
$4,000
$1,000
$800
```

Rules:

- Allow natural typing.
- Format after blur or when appropriate.
- Do not assume blank means zero.
- Avoid excessive decimals.

### Percentages

Examples:

```text
25%
6.2%
```

Rules:

- Show `%` suffix.
- Preserve meaningful precision.
- Avoid unnecessary decimals.

### Wallet Addresses

Rules:

- Allow paste.
- Preserve the full address internally.
- Show shortened display only when appropriate.
- Do not alter the stored address without validation.
- Make network expectations clear when needed.

Example shortened display:

```text
7xK...9Pq
```

### Numbers

Rules:

- Use numeric keyboard on mobile.
- Prevent invalid characters when appropriate.
- Allow decimals only when the field supports them.
- Do not silently round during typing.

---

## Responsive Behavior

Inputs should be mobile-first.

### Mobile

- Inputs should usually span full width.
- Labels should remain visible.
- Use appropriate mobile keyboard types.
- Keep touch targets comfortable.
- Avoid side-by-side fields when space is limited.
- Error text should wrap cleanly.
- Prefixes, suffixes, and icons should not crowd the value.

Recommended mobile keyboard behavior:

```text
currency input: numeric keyboard
number input: decimal or numeric keyboard
search input: search keyboard
email input: email keyboard
wallet address input: text keyboard with paste support
```

### Tablet

- Related inputs may sit side by side if labels and values remain readable.
- Keep field groups clear.

### Desktop

- Inputs may use natural width or grid layouts.
- Avoid overly wide fields for short values.
- Search inputs may be wider when searching large sets.

### Wide

- Keep form content within readable widths.
- Do not stretch inputs across unnecessary space.

---

## Accessibility

Inputs must support accessibility by default.

Requirements:

- Every input must have a visible label or accessible label.
- Placeholder is not a label.
- Error text must be associated with the input.
- Required fields must be communicated accessibly.
- Focus state must be visible.
- Disabled and read-only states must be clear.
- Icon-only actions must have accessible labels.
- Input purpose should be clear.
- Color must not be the only error indicator.
- Contrast must meet WCAG AA.
- Reduced motion settings must be respected.

Examples:

```text
aria-label="Search assets"
aria-describedby="monthly-income-helper monthly-income-error"
aria-invalid="true"
aria-busy="true"
```

---

## Content Rules

Input labels should be clear and specific.

Good labels:

```text
Monthly income
Monthly expenses
Monthly saving goal
Wallet address
Search assets
Risk level
Time horizon
```

Avoid vague labels:

```text
Value
Data
Input
Amount here
Thing
```

Use sentence case.

Avoid overly technical language unless the audience expects it.

Good helper copy:

```text
Use your average monthly income after tax.
Paste a public wallet address to track it.
```

Avoid:

```text
Input fiscal inflow variable.
Submit wallet hash.
```

Financial form copy should be calm and explanatory.

Do not pressure users.

Avoid:

```text
Enter more to maximize your gains.
Add your wallet now to unlock profits.
```

---

## Validation Rules

Validation should be clear and predictable.

The input component may display validation state, but validation rules should come from product logic.

Allowed input-level validation examples:

- Required field missing
- Invalid email format
- Invalid number format
- Invalid wallet address format
- Value below minimum
- Value above maximum
- Unsupported characters

Not allowed inside the component:

- Deciding user risk level
- Calculating safety buffer
- Ranking suggestions
- Selecting protocols
- Interpreting portfolio health
- Making financial recommendations

---

## Do

- Use visible labels.
- Use semantic tokens.
- Keep helper text short.
- Show clear error messages.
- Use appropriate mobile keyboards.
- Support paste for wallet address fields.
- Preserve full user-entered values internally.
- Make disabled and read-only states distinct.
- Use accessible labels for icon-only actions.
- Keep product logic outside the input component.

---

## Do Not

- Do not use placeholder text as the only label.
- Do not hardcode raw visual values.
- Do not show fake default values.
- Do not assume blank means zero.
- Do not hide important errors in tooltips only.
- Do not rely on color alone for validation.
- Do not decide financial meaning inside the component.
- Do not invent wallet ownership or connection status.
- Do not imply custody, execution, or investment action.
- Do not use hype-based financial copy.
