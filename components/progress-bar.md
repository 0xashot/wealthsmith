# Progress Bar

Progress bars communicate completion, loading, or measurable progress toward a known target.

In WealthSmith, progress bars may be used for onboarding progress, data loading, safety buffer coverage display, portfolio setup completion, wallet sync progress, and other clear progress states.

Progress bars should be calm, readable, accessible, and precise about what is being measured.

---

## Purpose

Use progress bars to show progress toward a known amount, step, or target.

A progress bar should help users understand:

- How much of something is complete
- Whether a process is loading
- Whether a target is partially covered
- How far the user is in onboarding
- Whether wallet or portfolio data is syncing
- Whether a setup task is complete or incomplete

Progress bars should make progress easier to understand at a glance.

---

## Important Rule

Progress bars display progress values.

Progress bars do not calculate WealthSmith business logic.

A progress bar can display:

- Current value
- Maximum value
- Percentage
- Step progress
- Loading state
- Completion state
- Label
- Helper text
- Status text
- Error state

A progress bar must not decide:

- Safety buffer target
- Safety buffer coverage
- Portfolio health
- Risk level
- Suggestion priority
- Top Pick status
- Onboarding completion logic
- Wallet sync validity
- Protocol eligibility
- Whether a user should invest

Those values must come from product logic, backend data, deterministic rules, or parent state.

The component should render progress values provided to it.

Do not invent percentages or completion states.

---

## When to Use

Use a progress bar when progress is measurable and useful.

Examples:

- Onboarding progress
- Safety buffer coverage
- Portfolio setup completion
- Wallet sync progress
- Data import progress
- Profile completion
- Goal progress
- Upload or processing progress, if supported
- Loading long-running background tasks

Progress bars can appear in:

- Onboarding
- Portfolio dashboard
- Suggestion cards
- Metric cards
- Modals
- Side panels
- Wallet connection flows
- Smith AI onboarding flows
- Empty states
- Setup checklists

---

## When Not to Use

Do not use a progress bar for:

- Unknown progress
- Short loading states
- Simple button loading
- Passive status labels
- Financial recommendations
- Risk scoring without clear explanation
- Decorative visuals
- Values that are not actually measurable
- Progress that may mislead users

Use:

- `components/toast.md` for short feedback
- `components/badge.md` for status labels
- `components/metric-card.md` for single values
- `components/skeleton` or loading state where exact progress is unknown
- Inline text when progress needs explanation

Do not use progress bars to make uncertain financial data look precise.

---

## Data Source

Progress bars should render structured progress data.

Expected data may include:

```text
id
label
value
max
percentage
status
helperText
showValue
showPercentage
indeterminate
steps
currentStep
completedSteps
errorMessage
ariaLabel
```

The exact schema can evolve.

The component should not invent labels, values, percentages, targets, steps, or completion states.

---

## Anatomy

A progress bar can include:

1. Container
2. Label
3. Optional current value
4. Optional target value
5. Optional percentage text
6. Track
7. Fill
8. Optional step markers
9. Optional helper text
10. Optional status text
11. Optional error text

Required:

- Track
- Fill or indeterminate indicator
- Accessible progress value or status
- Label or accessible label

Optional:

- Visible label
- Value text
- Percentage text
- Helper text
- Step labels
- Status badge
- Error message

Progress meaning should be understandable without relying on color alone.

---

## Variants

### Determinate Progress Bar

Use when progress value is known.

Examples:

```text
27% covered
3 of 5 steps complete
$800 of $3,000 covered
```

Rules:

- Value and max must come from product data.
- Percentage must be based on provided data.
- Do not calculate financial targets inside the component.
- Show visible text when progress affects user decisions.

---

### Indeterminate Progress Bar

Use when a process is active but exact progress is unknown.

Examples:

```text
Loading portfolio data…
Syncing wallet…
Fetching protocol data…
```

Rules:

- Use only when progress cannot be measured.
- Do not show fake percentages.
- Include a clear status label when useful.
- Replace with success, error, or determinate progress when data is available.

---

### Onboarding Progress Bar

Use during onboarding to show progress through setup.

Examples:

```text
Step 2 of 5
40% complete
```

Rules:

- Onboarding completion state must come from onboarding logic.
- Progress bar must not decide whether onboarding is complete.
- During onboarding, Smith AI remains open as the guide.
- Progress should support the Smith AI-led flow, not replace it.
- Step labels should be clear and beginner-friendly.

Good:

```text
Step 2 of 5
```

Avoid:

```text
Almost rich
```

---

### Safety Buffer Progress Bar

Use to display safety buffer coverage when product logic provides the values.

Examples:

```text
$800 of $3,000 covered
27% covered
```

Rules:

- Safety buffer target must come from deterministic product logic.
- Covered amount must come from structured portfolio data.
- Component must not decide which assets count as buffer assets.
- Component must not calculate or prioritize suggestions.
- Label coverage clearly.
- Do not make the bar feel like investment performance.

Good label:

```text
Safety buffer coverage
```

Good helper text:

```text
Stable assets cover part of your target buffer.
```

Avoid:

```text
Profit progress
```

---

### Goal Progress Bar

Use when product logic provides a goal target and current value.

Examples:

```text
$1,200 of $5,000 saved
24% complete
```

Rules:

- Goal target and current value must come from data.
- Do not imply guaranteed progress.
- Do not calculate savings recommendations inside the component.

---

### Setup Completion Progress Bar

Use for product setup or profile completeness.

Examples:

```text
Portfolio setup 60% complete
```

Rules:

- Completion criteria must come from product logic.
- Component only displays provided progress.
- Do not use setup completion to imply financial readiness.

---

### Sync Progress Bar

Use for wallet, data, or integration sync when progress is available.

Examples:

```text
Syncing wallet data…
4 of 6 sources updated
```

Rules:

- Show exact progress only when known.
- Use indeterminate state when unknown.
- Show error state if sync fails.
- Do not show portfolio data as current until product data says it is current.

---

### Segmented Progress Bar

Use for step-based progress.

Examples:

```text
Onboarding steps
Setup checklist
Multi-step review
```

Rules:

- Use only when steps are known.
- Completed steps must come from state.
- Keep step labels short.
- Do not use segmented progress for continuous financial values.

---

## Sizes

### Small

Use in compact cards, tables, and side panels.

Rules:

- Pair with visible text when meaning matters.
- Do not make the bar too thin to understand.

### Medium

Default progress bar size.

Use in cards, onboarding, modals, and dashboard sections.

### Large

Use when progress is central to the section.

Examples:

- Onboarding progress
- Safety buffer coverage module
- Setup completion

Rules:

- Large bars should include visible label and value text.
- Do not make large progress bars decorative.

---

## States

Progress bars must support these states.

### Empty

Progress value is zero.

Examples:

```text
0% complete
No stable assets counted yet
```

Rules:

- Empty state should not look broken.
- Explain what zero means when needed.

### In Progress

Progress is above zero and below complete.

### Complete

Progress has reached the provided target.

Examples:

```text
Complete
100% covered
```

Rules:

- Completion must come from product logic or provided values.
- Do not over-celebrate financial completion.
- Avoid implying future safety is guaranteed.

### Over Target

Use when value exceeds max and product behavior supports it.

Examples:

```text
110% covered
```

Rules:

- Decide whether to cap visual fill at 100% based on product behavior.
- Show text if over-target value matters.
- Do not distort the bar beyond readable range.

### Loading

Use when progress data is loading.

Rules:

- Use skeleton or indeterminate state.
- Do not show fake values.

### Error

Use when progress data fails to load.

Example:

```text
Could not load progress.
```

Rules:

- Show recovery when useful.
- Do not show stale progress as current without label.

### Stale

Use when progress may be outdated.

Example:

```text
Updated 2 hours ago
```

Rules:

- Stale state must come from data.
- Do not silently show stale values as current.

### Disabled

Use rarely, when progress is unavailable due to disabled context.

---

## Value Formatting

Progress bars may show values, percentages, fractions, or step counts.

### Percentage

Examples:

```text
27%
60%
100%
```

Rules:

- Use whole percentages unless precision matters.
- Do not show excessive decimals.
- Do not show fake precision.

### Value of Target

Examples:

```text
$800 of $3,000
3 of 5 steps
4 of 6 sources
```

Rules:

- Include units where useful.
- Keep formatting consistent.
- Use clear target language.

### Financial Values

Examples:

```text
$800 of $3,000 covered
```

Rules:

- Financial values must come from structured data.
- Do not calculate target or covered amount inside component.
- Do not use `$0` for unavailable values.
- Clearly label estimated values when applicable.

---

## Token Usage

Progress bars must use semantic tokens.

Do not hardcode colors, spacing, typography, radius, shadows, motion, or z-index.

### Correct

```text
track background: color.subdued.neutral.background.default
fill background: color.action.primary.background.default
success fill: color.feedback.success.background.solid
warning fill: color.feedback.warning.background.solid
danger fill: color.feedback.danger.background.solid
label: typography.label.md
value: typography.metric.compact
helper text: typography.body.sm
text: color.text.primary
secondary text: color.text.secondary
radius: radius.control.pill
motion: motion.data.valueChange
```

### Incorrect

```text
background: #E5E5E5
fill: #003DFF
height: 8px
border-radius: 999px
font-size: 14px
transition: width 300ms ease
```

---

## Color Usage

Progress bar color may support status, but it must not be the only meaning.

Rules:

- Use visible labels and values.
- Do not rely on green, yellow, or red alone.
- Use status colors only when product logic provides status.
- Default progress should use primary action color.
- Warning or danger color should be used sparingly and intentionally.
- Do not color normal market movement as danger unless product logic provides that state.

Examples:

Good:

```text
Safety buffer coverage: 27%
```

Bad:

```text
Red progress bar with no label
```

---

## Responsive Behavior

Progress bars should be mobile-first.

### Mobile

- Keep labels readable.
- Use stacked label/value layout when needed.
- Do not make bars too thin.
- Avoid very long helper text.
- Keep progress near the content it describes.
- Ensure Smith AI onboarding layout leaves progress visible.

### Tablet

- Progress bars may sit inline with values when space allows.
- Keep label/value association clear.

### Desktop

- Use horizontal layout when readable.
- Keep progress bar width connected to the content it measures.
- Avoid stretching across very wide containers unnecessarily.

### Wide

- Keep max width readable.
- Do not make progress bars overly long.
- Pair with labels or values for context.

---

## Accessibility

Progress bars must support accessibility by default.

Requirements:

- Provide accessible label.
- Communicate current value.
- Communicate max value where relevant.
- Communicate indeterminate state when value is unknown.
- Do not rely on color alone.
- Contrast must meet WCAG AA.
- Visible text should explain important progress.
- Screen readers should understand progress meaning.
- Reduced motion should be respected.

Recommended semantics:

```text
role="progressbar"
aria-valuemin="0"
aria-valuemax="100"
aria-valuenow="27"
aria-label="Safety buffer coverage"
```

For value text:

```text
aria-valuetext="$800 of $3,000 covered"
```

For indeterminate progress:

```text
role="progressbar"
aria-label="Syncing wallet data"
```

Omit `aria-valuenow` when progress is indeterminate.

---

## Motion

Progress motion should be calm and useful.

Rules:

- Animate value changes subtly when helpful.
- Do not use dramatic or distracting movement.
- Do not animate indefinitely unless showing indeterminate loading.
- Respect reduced motion settings.
- Avoid motion that makes financial progress feel gamified.

Use:

```text
motion.data.valueChange
motion.reducedMotion.default
```

---

## Content Rules

Progress bar copy should follow WealthSmith voice:

- Clear
- Calm
- Specific
- Beginner-friendly
- Non-hype

Good labels:

```text
Onboarding progress
Safety buffer coverage
Portfolio setup
Wallet sync
Data refresh
```

Good value text:

```text
$800 of $3,000 covered
3 of 5 steps complete
27% covered
```

Good helper text:

```text
Stable assets cover part of your target buffer.
```

Avoid vague labels:

```text
Progress
Status
Loading
```

when more specific copy is available.

Avoid hype:

```text
Profit progress
Wealth unlocked
Guaranteed safety
Max gains
```

---

## Financial and Wallet Language Rules

Progress bar copy must be precise.

Allowed:

```text
Covered
Complete
Estimated
May change
Public wallet data
Updated
Syncing
```

Avoid:

```text
Guaranteed
Risk-free
Best return
Profit progress
Auto-invest
Custody access
```

Do not imply WealthSmith can move funds, sign transactions, or execute financial actions unless the product actually supports that action and the flow clearly explains it.

Do not imply that safety buffer coverage guarantees financial safety.

---

## Smith AI and Onboarding Rules

Progress bars may appear during Smith AI-led onboarding.

Rules:

- During onboarding, Smith AI remains open.
- Progress bar may show onboarding step progress.
- Progress value must come from onboarding state.
- Progress bar should support Smith AI guidance, not replace it.
- Do not hide required onboarding instructions behind the progress bar.
- Do not let progress bar decide whether onboarding is complete.

Example:

```text
Step 2 of 5
Smith AI is guiding setup.
```

---

## Validation and State Rules

Progress state belongs outside the component.

The progress bar may display:

- Value
- Max
- Percentage
- Step count
- Loading state
- Error state
- Complete state
- Stale state
- Helper text

The progress bar must not decide:

- Whether a target is correct
- Whether a value counts toward a target
- Whether progress is financially good or bad
- Whether a suggestion should appear
- Whether onboarding is complete
- Whether a wallet sync is valid
- Whether a financial action should proceed

---

## Do

- Use progress bars for measurable progress.
- Use semantic tokens.
- Show visible labels for important progress.
- Use accessible progress semantics.
- Clearly label estimated or stale data.
- Use indeterminate state when progress is unknown.
- Keep onboarding progress compatible with Smith AI.
- Keep financial calculations outside the component.
- Respect reduced motion.

---

## Do Not

- Do not invent progress values or percentages.
- Do not calculate safety buffer coverage inside the component.
- Do not use progress bars for unknown progress unless indeterminate.
- Do not use progress bars as decorative financial motivation.
- Do not hide critical warnings in helper text only.
- Do not rely on color alone.
- Do not imply guaranteed returns or guaranteed safety.
- Do not use hype-based financial copy.
- Do not imply custody, execution, or investment action unless the product actually supports it.
- Do not hardcode raw visual values.
