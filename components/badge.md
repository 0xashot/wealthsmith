# Badge

Badges are compact labels that communicate status, category, priority, state, or classification in WealthSmith.

They help users quickly scan suggestion cards, portfolio cards, metric cards, wallet rows, protocol cards, tables, filters, and alerts.

Badges should be short, readable, calm, and specific.

---

## Purpose

Use badges to label information without interrupting the user.

A badge should help users understand:

- Status
- Category
- Priority
- Completion
- Requirement
- Data quality
- Portfolio classification
- Wallet state
- Suggestion classification

Badges should make information easier to scan, not more confusing.

---

## Important Rule

Badges display status or classification.

Badges do not calculate status, priority, category, or Top Pick.

A badge can display:

- Top Pick
- High priority
- Completed
- Action needed
- Watch-only
- Estimated
- Staked
- Yield
- Missing price
- Safety Buffer
- Diversification

A badge must not decide:

- Which suggestion is Top Pick
- Which priority a suggestion has
- Whether a portfolio item is risky
- Whether a wallet is connected
- Whether data is estimated
- Whether a suggestion is complete
- Whether an action is required

Those values must come from product logic, backend data, or deterministic rules.

The component should render the badge state provided to it.

---

## When to Use

Use a badge when a small label helps users scan or classify information.

Examples:

- Top Pick
- Safety Buffer
- Diversification
- Yield
- Review
- Completed
- Action needed
- Estimated
- Staked
- Watch-only
- Missing price
- Connected
- Syncing
- High priority

Badges can appear in:

- Suggestion cards
- Portfolio cards
- Metric cards
- Wallet rows
- Asset rows
- Protocol cards
- Tables
- Filters
- Modals
- Empty states
- Smith AI context panels

---

## When Not to Use

Do not use badges for:

- Long explanations
- Main actions
- Full error messages
- Paragraph-level helper text
- Buttons
- Navigation items unless they are status counters
- Financial recommendations by themselves
- Content that needs a full sentence

Do not use too many badges in one area.

If everything has a badge, badges stop being useful.

---

## Data Source

Badges should be rendered from structured data.

Expected data may include:

```text
id
label
variant
status
category
priority
tone
size
icon
dismissible
ariaLabel
```

The exact schema can evolve.

The component should not invent badge labels, statuses, categories, or priorities.

---

## Anatomy

A badge can include:

1. Container
2. Label
3. Optional icon
4. Optional dot indicator
5. Optional count
6. Optional dismiss icon

Required:

- Container
- Label or accessible label

Optional:

- Icon
- Dot
- Count
- Dismiss action

A badge label should be understandable without relying on color.

---

## Variants

### Neutral Badge

Use for general classification without strong status meaning.

Examples:

```text
Portfolio
Wallet
Demo
Review
```

Token guidance:

- Background: `color.subdued.neutral.background.default`
- Text: `color.text.secondary`
- Border: `color.border.subtle`
- Radius: `radius.badge.default`
- Typography: `typography.label.sm`

---

### Info Badge

Use for informational labels.

Examples:

```text
Info
Estimated
Read-only
Watch-only
```

Token guidance:

- Background: `color.feedback.info.background.tint`
- Text: `color.feedback.info.text.tint`
- Radius: `radius.badge.default`
- Typography: `typography.label.sm`

---

### Success Badge

Use when something is complete, connected, valid, or resolved.

Examples:

```text
Completed
Connected
Verified
Resolved
```

Token guidance:

- Background: `color.feedback.success.background.tint`
- Text: `color.feedback.success.text.tint`
- Radius: `radius.badge.default`
- Typography: `typography.label.sm`

---

### Warning Badge

Use when something needs attention but is not destructive.

Examples:

```text
Action needed
Missing data
Review
Estimated
Syncing
```

Token guidance:

- Background: `color.feedback.warning.background.tint`
- Text: `color.feedback.warning.text.tint`
- Radius: `radius.badge.default`
- Typography: `typography.label.sm`

Warning badges should include clear text.

Do not rely on yellow or orange alone.

---

### Danger Badge

Use for errors, unsupported states, failed states, or high-risk warnings.

Examples:

```text
Error
Unsupported
Failed
Missing price
High risk
```

Token guidance:

- Background: `color.feedback.danger.background.tint`
- Text: `color.feedback.danger.text.tint`
- Radius: `radius.badge.default`
- Typography: `typography.label.sm`

Use danger badges sparingly.

Do not use danger styling for normal market movement unless product logic marks it as critical.

---

### Top Pick Badge

Use only when a suggestion is marked as Top Pick by deterministic product logic.

Recommended label:

```text
Top Pick
```

Rules:

- The badge may appear only when `isTopPick` is true.
- The badge must not decide Top Pick.
- Only one suggestion should be marked Top Pick in a suggestion set.
- If multiple suggestions are marked Top Pick, that is a data issue outside the badge component.
- Top Pick should feel helpful, not hype-driven.

Allowed:

```text
Top Pick
```

Avoid:

```text
Best Investment
Guaranteed Best
Must Do
Highest Return
Winner
```

Token guidance:

- Background: `color.feedback.info.background.tint`
- Text: `color.feedback.info.text.tint`
- Border: `color.action.primary.background.default` where emphasis is needed
- Radius: `radius.badge.default`
- Typography: `typography.label.sm`

---

### Priority Badge

Use when product logic provides suggestion priority.

Allowed labels:

```text
High priority
Medium priority
Low priority
Action needed
Review when ready
```

Avoid urgency pressure:

```text
Act now
Urgent profit
Limited time
Do immediately
```

Rules:

- The badge displays priority from structured data.
- The badge does not calculate priority.
- Priority should be text-readable and not color-only.

---

### Category Badge

Use to label a suggestion, portfolio group, or content category.

Examples:

```text
Safety Buffer
Diversification
Yield
Stable Assets
Volatile Assets
Wallet
RWA
```

Rules:

- Keep category labels short.
- Use title case when category names are product concepts.
- Do not create new categories in the component.

---

### Portfolio Badge

Use for portfolio and wallet-related states.

Examples:

```text
Connected
Watch-only
Estimated
Staked
Yield
RWA
Missing price
Unsupported
Syncing
```

Rules:

- Make watch-only status clear.
- Clearly label estimated values.
- Do not imply wallet ownership, signing, or custody unless verified by product logic.
- Do not imply yield is guaranteed.

---

### Count Badge

Use for small counts.

Examples:

```text
3
12
99+
```

Use cases:

- Number of connected wallets
- Number of assets
- Number of suggestions
- Notifications
- Filter counts

Rules:

- Keep counts short.
- Use `99+` or approved compact format for large counts.
- Do not show fake counts.
- Do not use count badges for complex metrics.

---

### Dismissible Badge

Use when a badge can be removed by the user.

Examples:

- Active filters
- Selected category
- Selected token
- Selected wallet

Rules:

- Dismiss action must have an accessible label.
- Dismiss must only remove the badge if product logic allows it.
- Do not use dismissible badges for critical warnings.

Accessible label example:

```text
aria-label="Remove Safety Buffer filter"
```

---

## Sizes

### Small

Use in dense rows, tables, compact cards, and inline metadata.

Token guidance:

- Typography: `typography.label.sm`
- Radius: `radius.badge.default`
- Padding: compact spacing from semantic spacing tokens

---

### Medium

Default badge size.

Use in cards, modals, suggestion cards, and portfolio sections.

Token guidance:

- Typography: `typography.label.md`
- Radius: `radius.badge.default`
- Padding: default compact spacing from semantic spacing tokens

---

### Large

Use sparingly for high-visibility labels.

Examples:

- Featured Top Pick module
- Large status block
- Onboarding summary

Rules:

- Do not make badges look like buttons.
- Do not use large badges for dense tables.

---

## States

Badges may support these states.

### Default

Normal visible badge.

### Hover

Use only when the badge is interactive, such as a dismissible filter badge.

Non-interactive badges should not look clickable.

### Focus

Required for interactive badges.

Use:

- `shadow.control.focus`
- `color.focus.outline.default`

### Disabled

Use only for interactive badges that are temporarily unavailable.

Disabled badges should remain readable.

### Loading

Use only when badge status is being loaded or refreshed.

Avoid showing fake badge status while loading.

---

## Token Usage

Badges must use semantic tokens.

Do not hardcode colors, spacing, typography, radius, shadows, or motion.

### Correct

```text
background: color.feedback.info.background.tint
color: color.feedback.info.text.tint
border: color.border.subtle
font: typography.label.sm
border-radius: radius.badge.default
transition: motion.interaction.hover
```

### Incorrect

```text
background: #EAF4FF
color: #003DFF
font-size: 12px
border-radius: 999px
padding: 4px 8px
```

---

## Color Usage

Badges may use color to support meaning, but color must never be the only meaning.

Rules:

- Always include readable text.
- Use icons or dots only as supporting signals.
- Do not rely on green/red alone.
- Do not overuse warning or danger colors.
- Use semantic feedback colors.
- Keep badge contrast WCAG AA compliant.

Example:

Good:

```text
Missing price
```

Bad:

```text
Red badge with no text
```

---

## Icons

Badges may include icons when they improve scanning.

Examples:

- Check icon for completed
- Warning icon for action needed
- Info icon for estimated
- Dot indicator for syncing
- Wallet icon for connected wallet

Rules:

- Icons are optional.
- Icons must not replace text.
- Icons should be visually simple.
- Use semantic icon color matching the badge tone.
- Do not overload badges with multiple icons.

---

## Responsive Behavior

Badges should be mobile-first.

### Mobile

- Keep badge labels short.
- Allow wrapping only when necessary.
- Avoid too many badges in one row.
- Use horizontal scrolling only when product pattern allows it.
- Ensure dismissible badges have comfortable tap targets.

### Tablet

- Badges may sit inline with headings or metadata.
- Keep spacing consistent.

### Desktop

- Badges may appear in card headers, table rows, filters, and side panels.
- Keep alignment consistent across repeated rows.

### Wide

- Do not enlarge badges unnecessarily.
- Keep badges close to the content they label.

---

## Accessibility

Badges must support accessibility by default.

Requirements:

- Badge meaning must be available as text.
- Do not rely on color alone.
- Interactive badges must be keyboard accessible.
- Dismissible badges must have accessible labels.
- Count badges should be understandable in context.
- Badge contrast must meet WCAG AA.
- Icons should not be the only indicator.
- Screen readers should understand important statuses.

Examples:

Visual:

```text
Top Pick
```

Accessible meaning:

```text
Top Pick suggestion
```

Dismissible filter badge:

```text
aria-label="Remove Yield filter"
```

Count badge in context:

```text
3 suggestions
```

---

## Content Rules

Badge labels should be:

- Short
- Specific
- Calm
- Readable
- Non-hype
- Consistent

Use title case for product categories.

Examples:

```text
Safety Buffer
Diversification
Stable Assets
Top Pick
```

Use sentence case for states when appropriate.

Examples:

```text
Action needed
Review when ready
Missing price
```

Good badge labels:

```text
Top Pick
Completed
Action needed
Estimated
Watch-only
Staked
Yield
Missing price
Safety Buffer
```

Avoid:

```text
Best Deal
Guaranteed
Huge Gains
Must Buy
Hot
Moonshot
Urgent Profit
```

Do not use badges to create pressure.

---

## Badge Placement

Badges should appear close to the content they describe.

Common placements:

- Card header
- Next to title
- Above title for Top Pick
- Table cell
- Filter bar
- Metadata row
- Portfolio asset row
- Modal header when status matters

Rules:

- Top Pick badge should be visually discoverable.
- Status badges should not hide important text.
- Do not crowd the card header with too many badges.
- If there are many badges, prioritize the most important ones.

---

## Do

- Use badges for short status or category labels.
- Use semantic tokens.
- Keep labels short.
- Include readable text.
- Pair color with text.
- Use Top Pick only when provided by data.
- Make watch-only, estimated, and missing data states clear.
- Use accessible labels for dismissible badges.
- Keep badge logic outside the component.

---

## Do Not

- Do not calculate status inside the badge.
- Do not determine Top Pick inside the badge.
- Do not invent priority, category, or status.
- Do not rely on color alone.
- Do not use hype-based labels.
- Do not make non-interactive badges look clickable.
- Do not use too many badges in one area.
- Do not imply guaranteed returns.
- Do not imply custody, execution, or investment action.
- Do not hardcode raw visual values.
