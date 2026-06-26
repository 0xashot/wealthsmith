# Metric Card

Metric cards display important financial or product metrics in WealthSmith.

They help users quickly understand portfolio value, safety buffer coverage, allocation, exposure, estimated earnings, APY, progress, and other key numbers.

This component extends the base card contract in `components/card.md`.

---

## Purpose

Use metric cards to present one primary metric with supporting context.

A metric card should help users understand:

- What the number represents
- Whether the number is current, estimated, incomplete, or unavailable
- Whether the number is positive, neutral, warning, or risk-related
- What supporting context matters
- Whether an action or detail view is available

Metric cards should make financial data feel clear, calm, and trustworthy.

---

## Important Rule

Metric cards display data.

Metric cards do not calculate product logic.

The card must not determine:

- Portfolio value
- Safety buffer coverage
- Risk score
- Token allocation
- Estimated yield
- APY
- Suggestion priority
- Top Pick status
- Protocol selection
- Whether a metric is good or bad

Those values and interpretations must come from product logic, backend data, or deterministic rules.

The component should render structured data provided to it.

Do not invent missing numbers.

Do not infer financial meaning in the frontend unless the rule is explicitly documented.

---

## When to Use

Use a metric card when showing a key number or progress indicator.

Examples:

- Portfolio value
- Monthly savings goal
- Safety buffer coverage
- Stablecoin allocation
- Volatile asset exposure
- Estimated annual earnings
- Average APY
- Number of connected wallets
- Idle assets
- Staked assets
- RWA allocation
- Portfolio change
- Risk exposure
- Goal progress

Metric cards can appear in:

- Dashboard
- Portfolio overview
- Suggestion context
- Wallet view
- Asset detail page
- Protocol detail page
- Smith AI context panel
- Onboarding summary
- Settings or account overview

---

## When Not to Use

Do not use a metric card for:

- Long explanations
- Multi-row tables
- Full protocol comparisons
- Chat messages
- Generic static content
- Suggestions with actions and reasons
- Full asset lists
- Complex charts that need their own component

Use `components/suggestion-card.md` for recommendations.

Use table or list components for many rows of comparable data.

---

## Data Source

Metric cards should be rendered from structured data.

Expected data may include:

```text
id
label
value
formattedValue
unit
currency
changeValue
changePercent
changeDirection
status
description
helperText
source
isEstimated
isLoading
isUnavailable
updatedAt
actionLabel
actionType
```

The exact schema can evolve.

The component should not invent missing values, labels, change percentages, or statuses.

---

## Anatomy

A metric card can include:

1. Container
2. Label
3. Primary value
4. Optional unit or currency
5. Optional change indicator
6. Optional status indicator
7. Optional description or helper text
8. Optional progress indicator
9. Optional chart sparkline
10. Optional source or timestamp
11. Optional action
12. Optional tooltip or info icon

Required:

- Container
- Label
- Primary value or unavailable state

Optional:

- Unit
- Change indicator
- Status
- Description
- Helper text
- Progress
- Sparkline
- Timestamp
- Action
- Tooltip

Keep metric cards focused. One card should not compete with itself by showing too many unrelated numbers.

---

## Layout

Recommended structure:

```text
Label

Primary value

Supporting context or change indicator

Optional helper text / timestamp / action
```

For compact cards:

```text
Label
Value
```

For richer cards:

```text
Label
Primary value + unit
Change / status
Supporting explanation
Optional action
```

Do not overload metric cards with unrelated details.

---

## Variants

### Primary Metric Card

Use for the most important metric in a section.

Examples:

- Total portfolio value
- Safety buffer coverage
- Monthly savings progress

Token guidance:

- Background: `color.surface.card`
- Border: `color.border.subtle`
- Radius: `radius.surface.lg`
- Shadow: `shadow.card.default`
- Padding: `spacing.card.padding.lg`
- Label typography: `typography.label.md`
- Value typography: `typography.metric.primary`
- Body typography: `typography.body.sm`

Use primary metric cards sparingly.

---

### Secondary Metric Card

Use for supporting metrics in dashboard grids.

Examples:

- Stablecoin allocation
- Idle assets
- Estimated earnings
- Connected wallets

Token guidance:

- Background: `color.surface.card`
- Border: `color.border.subtle`
- Radius: `radius.surface.md`
- Shadow: `shadow.card.default`
- Padding: `spacing.card.padding.md`
- Label typography: `typography.label.md`
- Value typography: `typography.metric.secondary`
- Body typography: `typography.body.sm`

---

### Compact Metric Card

Use in dense layouts, side panels, tables, and small dashboard modules.

Examples:

- APY value
- Asset count
- Allocation percentage
- Small progress metric

Token guidance:

- Background: `color.surface.card`
- Border: `color.border.subtle`
- Radius: `radius.surface.sm`
- Shadow: `shadow.surface.flat`
- Padding: `spacing.card.padding.sm`
- Label typography: `typography.label.sm`
- Value typography: `typography.metric.compact`

---

### Progress Metric Card

Use when the metric represents progress toward a target.

Examples:

- Safety buffer coverage
- Monthly savings goal
- Goal progress
- Stable asset target

May include:

- Current value
- Target value
- Percentage
- Progress bar
- Helper text

Progress rules:

- Use values from structured data.
- Do not calculate progress in the component unless explicitly provided as a presentation-only value.
- Do not show 100% unless the data says the target is fully met.
- Include labels so progress is not communicated by color alone.

---

### Estimated Metric Card

Use when the number is an estimate.

Examples:

- Estimated annual earnings
- Estimated APY
- Estimated monthly yield
- Projected progress

Estimated metric cards must clearly indicate that the value is estimated.

Allowed labels:

```text
Estimated
Est.
Approx.
```

Avoid:

```text
Guaranteed
Fixed
Risk-free
Certain
```

Estimated values must not imply guaranteed returns.

---

### Status Metric Card

Use when the metric has a clear status provided by product logic.

Examples:

- Healthy
- Needs review
- Action needed
- Completed
- Missing data

Status should use both text and visual styling.

Do not rely on color alone.

---

## States

Metric cards may support these states.

### Default

Metric is available and shown normally.

### Loading

Use when metric data is being fetched, calculated, or refreshed.

Loading state may use:

- Skeleton value
- Loading label
- Preserved layout size
- Disabled actions

Do not show fake placeholder values like `$0` unless the real value is zero.

### Unavailable

Use when the metric cannot be shown.

Examples:

- Wallet not connected
- Data source unavailable
- Required onboarding field missing
- Asset price unavailable
- Protocol data unavailable

Unavailable state should explain what is missing when useful.

Example:

```text
Connect a wallet to see this metric.
```

### Error

Use when the metric failed to load.

Error state should explain what happened and offer recovery where possible.

Example:

```text
Could not load this metric. Try again.
```

### Stale

Use when the data may be outdated.

Example:

```text
Updated 2 hours ago
```

Do not silently present stale data as current when freshness matters.

### Positive

Use when product logic marks the metric as positive.

Examples:

- Goal reached
- Buffer covered
- Suggestion completed

Do not treat all green numbers as positive by default. Context matters.

### Warning

Use when product logic marks the metric as needing attention.

Examples:

- Safety buffer below target
- High concentration
- Missing required data

Warning state should include text explaining the concern.

### Danger

Use when product logic marks the metric as critical or high risk.

Use sparingly.

Do not overuse danger styling for normal crypto volatility unless the product logic explicitly marks it as critical.

---

## Number Formatting

Metric cards must format numbers consistently.

### Currency

Use currency formatting for money values.

Examples:

```text
$5,500
$800
$1,200.50
```

Large values may use compact formatting when appropriate.

Examples:

```text
$12.4K
$1.2M
```

Do not over-compact values when precision matters.

---

### Percentages

Use percentages for allocation, APY, progress, and change.

Examples:

```text
27%
6.2%
-4.8%
```

Keep decimal precision consistent with the product context.

Do not show unnecessary decimals.

Prefer:

```text
27%
6.2%
```

Avoid:

```text
27.0000%
6.23456789%
```

---

### Crypto Amounts

Crypto token amounts may need more precision than currency.

Examples:

```text
12.45 SOL
0.038 BTC
1,250 USDC
```

Rules:

- Preserve meaningful precision.
- Avoid excessive decimals.
- Do not round tiny balances to zero unless shown as `<0.01`.
- Pair token amount with fiat value when helpful.

---

### Change Values

Change indicators should include context.

Examples:

```text
+3.2% this month
-$120 today
+0.4 SOL since last update
```

Do not show a change value without a timeframe when it could be misleading.

---

### Missing Values

Do not show fake values for missing data.

Avoid:

```text
$0
0%
N/A
--
```

Unless the design system explicitly defines the fallback.

Prefer meaningful empty states:

```text
Not available
Connect wallet
Missing data
Price unavailable
```

---

## Token Usage

Metric cards must use semantic tokens.

Do not hardcode colors, spacing, typography, radius, shadows, or motion.

### Correct

```text
background: color.surface.card
border: color.border.subtle
padding: spacing.card.padding.md
gap: spacing.card.gap.md
label: typography.label.md
value: typography.metric.secondary
body: typography.body.sm
radius: radius.surface.md
shadow: shadow.card.default
```

### Incorrect

```text
background: #F9FAFB
padding: 24px
font-size: 24px
font-family: Space Grotesk
border-radius: 12px
box-shadow: 0px 2px 4px rgba(0,0,0,0.06)
```

---

## Color Usage

Use color carefully in metric cards.

Colors may indicate:

- Positive status
- Warning status
- Danger status
- Info status
- Disabled or unavailable status

Rules:

- Do not rely on color alone.
- Pair status color with text, icon, or label.
- Do not make every positive number green.
- Do not make every negative number red.
- Interpret status based on product logic.

Example:

A lower spending number may be positive.

A lower safety buffer number may be negative.

The component must not infer this by itself.

---

## Actions

Metric cards may include a small action when useful.

Examples:

```text
View details
Review
Connect wallet
Add funds
Learn more
```

Action rules:

- Use `components/button.md`.
- Keep actions secondary unless the metric card is part of a primary flow.
- Do not overload a metric card with multiple actions.
- Action labels should be specific.

Avoid:

```text
Invest now
Buy now
Maximize gains
Get rich
```

---

## Tooltips and Helper Text

Metric cards may include helper text or a tooltip when the metric needs explanation.

Examples:

```text
Includes connected Solana wallets.
Estimated based on current APY.
Updated from available protocol data.
```

Rules:

- Keep helper text short.
- Explain assumptions clearly.
- Do not hide critical risk information only in a tooltip.
- Use `components/tooltip.md` when available.

---

## Responsive Behavior

Metric cards should be mobile-first.

### Mobile

- Cards should stack vertically.
- Avoid dense metric grids.
- Keep values readable.
- Avoid truncating important numbers.
- Use compact helper text.
- Actions may stack below the metric.

### Tablet

- Metric cards may use two-column grids.
- Related metrics may appear side by side.
- Keep spacing consistent.

### Desktop

- Metric cards may use dashboard grids.
- Primary metrics may span more columns.
- Compact metrics may appear in rows or side panels.

### Wide

- Keep metric cards within readable dashboard layouts.
- Avoid stretching values across overly wide containers.
- Use grid alignment for consistency.

---

## Accessibility

Metric cards must support accessibility by default.

Requirements:

- Use clear labels for all metrics.
- Do not rely on color alone to show positive, warning, or danger status.
- Ensure numeric values are readable by screen readers.
- Use accessible text for abbreviations when needed.
- Keep contrast WCAG AA compliant.
- Communicate loading, unavailable, stale, and error states clearly.
- Respect reduced motion settings.

Examples:

Visual:

```text
$5.5K
```

Accessible label where useful:

```text
Portfolio value: 5,500 dollars
```

Visual:

```text
6.2% APY
```

Accessible explanation where useful:

```text
Estimated annual percentage yield: 6.2 percent
```

---

## Content Rules

Metric card copy should follow WealthSmith voice:

- Clear
- Calm
- Trustworthy
- Beginner-friendly
- Specific
- Non-hype
- Explainable

Metric labels should be short and descriptive.

Good labels:

```text
Portfolio value
Safety buffer
Stable assets
Estimated earnings
Idle assets
Connected wallets
Monthly progress
```

Avoid vague labels:

```text
Value
Data
Stats
Thing
Performance
```

Helper text should explain the meaning or source of the metric.

Good helper text:

```text
Based on your connected wallets.
Estimated using current protocol APY.
Your safety buffer target is based on monthly expenses.
```

Avoid hype:

```text
You are earning big.
This is the best yield.
Guaranteed returns.
Maximize your wealth now.
```

---

## Do

- Use metric cards for one clear metric.
- Use semantic tokens.
- Use Space Grotesk for financial numbers.
- Use clear labels.
- Show estimated values as estimated.
- Show unavailable states instead of fake numbers.
- Include timeframe for change values.
- Use status colors only when supported by product logic.
- Pair status color with text or icons.
- Keep business logic outside the component.

---

## Do Not

- Do not calculate financial logic inside the metric card.
- Do not invent missing values.
- Do not show `$0` for missing data.
- Do not imply estimates are guaranteed.
- Do not overuse green and red.
- Do not rely on color alone.
- Do not hardcode raw visual values.
- Do not overload one card with unrelated metrics.
- Do not use hype-based financial language.
- Do not imply custody, execution, or investment action unless the product actually supports it.
