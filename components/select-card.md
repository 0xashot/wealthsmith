# Select Card

Select cards let users choose from visually richer options than a standard select menu.

In WealthSmith, select cards may be used for onboarding choices, wallet connection methods, portfolio preferences, risk-level selection, goal selection, contribution rhythm, protocol/detail previews, and other choices that benefit from explanation.

Select cards should make choices clear, comparable, accessible, and trustworthy.

---

## Purpose

Use select cards when users need to choose one or more options and each option needs more context than a short label.

A select card should help users understand:

- What the option means
- Why the option exists
- What changes when the option is selected
- Whether the option is available
- Whether the option is recommended by product logic
- Whether the option is connected, watch-only, estimated, or unavailable

Select cards are useful when visual clarity matters more than compactness.

---

## Important Rule

Select cards display selectable options.

Select cards do not contain WealthSmith business logic.

A select card can display:

- Option label
- Option description
- Selected state
- Disabled state
- Icon
- Token icon
- Wallet icon
- Badge
- Helper text
- Supporting metric
- Availability state
- Product-provided recommended state

A select card must not decide:

- Which option is recommended
- Which suggestion is Top Pick
- Which goal is best for the user
- Which risk level is appropriate
- Which token is suitable
- Which wallet method should be preferred
- Which protocol should be selected
- Whether the user should invest
- Whether onboarding is complete

Those decisions must come from product logic, deterministic rules, backend data, or Smith AI orchestration.

The component should render option state provided to it.

---

## When to Use

Use select cards when the choice benefits from visible explanation.

Examples:

- Goal selection
- Risk level selection
- Time horizon selection
- Contribution rhythm selection
- Wallet connection method
- Connected wallet vs watch-only address
- Portfolio view mode
- Asset category selection
- Protocol option preview
- Suggestion review option
- Onboarding preference selection

Use select cards when users need to compare options without opening a menu.

---

## When Not to Use

Do not use select cards for:

- Very long option lists
- Dense tables
- Simple compact filters
- Binary on/off settings
- Destructive actions
- Primary calls to action
- Options with no meaningful explanation
- Searchable token lists with many tokens
- Large protocol lists where a table is better

Use:

- `components/select-menu.md` for compact single selection
- `components/checkbox.md` for simple multi-select
- `components/toggle.md` for binary settings
- `components/table.md` for comparing many rows
- `components/button.md` for actions
- `components/modal.md` for confirmations

---

## Selection Modes

Select cards may support one of two modes.

### Single Select

Use when only one option can be selected.

Examples:

```text
Goal
Risk level
Time horizon
Contribution rhythm
Default wallet
Portfolio view
```

Rules:

- Only one card can be selected at a time.
- Selecting a new card deselects the previous card.
- Selected state must be visually and accessibly clear.
- Use radio-group semantics where appropriate.

### Multi Select

Use when multiple options can be selected independently.

Examples:

```text
Asset categories
Wallets to include
Suggestion categories
Notification topics
```

Rules:

- Multiple cards can be selected.
- Each selected card must be clear.
- Use checkbox semantics where appropriate.
- Avoid multi-select cards when a simple checkbox group is enough.

---

## Data Source

Select cards should render structured option data.

Expected data may include:

```text
id
name
label
value
description
selected
disabled
disabledReason
recommended
badge
icon
tokenIcon
walletIcon
supportingMetric
helperText
status
selectionMode
ariaLabel
```

The exact schema can evolve.

The component should not invent options, selected states, recommendation states, descriptions, metrics, or disabled reasons.

---

## Anatomy

A select card can include:

1. Card container
2. Selection indicator
3. Title
4. Description
5. Optional icon
6. Optional token icon
7. Optional wallet icon
8. Optional badge
9. Optional supporting metric
10. Optional helper text
11. Optional disabled reason
12. Optional status label
13. Optional checkmark or radio indicator

Required:

- Container
- Label or title
- Selected and unselected states
- Focus state
- Accessible name

Optional:

- Description
- Icon
- Token icon
- Badge
- Supporting metric
- Helper text
- Disabled reason
- Status label

The entire card should usually be clickable or tappable.

---

## Variants

### Standard Select Card

Use for general choices.

Examples:

```text
Build Long-Term Wealth
Preserve Capital
Generate Yield
```

Rules:

- Use a clear title.
- Add description when the option needs explanation.
- Keep card height consistent within a group.

---

### Onboarding Select Card

Use during onboarding choices.

Examples:

```text
Build Long-Term Wealth
Medium risk
5 years
Monthly contributions
```

Rules:

- Make options beginner-friendly.
- Explain what each option means.
- Keep Smith AI context compatible.
- Do not let the card determine user suitability.
- During onboarding, Smith AI remains open as the guide.

Example:

```text
Medium risk
Balanced growth with some exposure to volatility.
```

Avoid:

```text
Best choice for you
Guaranteed growth
```

---

### Goal Select Card

Use when selecting user goals.

Examples:

```text
Build Long-Term Wealth
Preserve Capital
Generate Yield
Diversify Portfolio
```

Rules:

- Goal labels should be product-approved.
- Descriptions should be educational, not advisory.
- The card must not decide which goal is best.

---

### Risk Level Select Card

Use when selecting risk level.

Examples:

```text
Low risk
Medium risk
High risk
```

Rules:

- Explain risk level in plain language.
- Do not pressure users toward higher risk.
- Do not imply guaranteed outcomes.
- Do not interpret suitability inside the component.

Good description:

```text
A balanced approach with some exposure to market volatility.
```

Avoid:

```text
Best returns with manageable risk.
```

---

### Wallet Method Select Card

Use when choosing how to add or connect a wallet.

Examples:

```text
Connect wallet
Add watch-only address
Import public address
```

Rules:

- Clearly distinguish connected wallets from watch-only addresses.
- Do not imply custody.
- Do not imply signing unless the method requires signing.
- Make read-only behavior clear.

Good descriptions:

```text
Connect a wallet to view your portfolio. WealthSmith does not take custody of your funds.
```

```text
Paste a public address to track it in read-only mode.
```

Avoid:

```text
Give WealthSmith access to your funds.
```

---

### Token Select Card

Use when choosing from a small set of tokens or asset categories.

Examples:

```text
SOL
USDC
Stable Assets
Volatile Assets
```

Rules:

- Token icon may be shown.
- Token symbol or asset category must be visible.
- Token name may appear as secondary text.
- Do not rely on token icon alone.
- Do not recommend a token inside the card unless product logic provides a recommended state.

Good:

```text
[Token icon] SOL
Solana
```

Bad:

```text
[Icon only]
```

---

### Protocol Select Card

Use when choosing from a small number of product-provided protocol options.

Examples:

```text
Kamino
Jupiter
Orca
```

Rules:

- Protocol options must come from protocol decision logic.
- Select card must not rank protocols.
- If a protocol is marked recommended, that state must be provided by product logic.
- Show estimates as estimates.
- Do not imply APY is guaranteed.

Good metric label:

```text
Est. APY
```

Avoid:

```text
Guaranteed return
Best profit
```

---

### Recommended Select Card

Use only when product logic marks an option as recommended.

Allowed badge:

```text
Recommended
```

Rules:

- The card must not decide recommendation state.
- Recommendation must not be hype-based.
- Recommended state should be explainable elsewhere if needed.
- Avoid visually forcing the user to choose the recommended option.

Avoid:

```text
Best
Guaranteed
Must choose
Highest profit
```

---

### Disabled Select Card

Use when an option is visible but unavailable.

Examples:

```text
Ethereum tracking
Unavailable yet
```

Rules:

- Explain why the option is disabled when useful.
- Disabled card should remain readable.
- Disabled card should not be selectable.
- Do not hide unavailable product direction if it helps users understand roadmap or limits.

---

## Token Icons

Select cards may display token icons or asset icons.

Rules:

- Icons are optional supporting visuals.
- Token symbol or asset name must be visible.
- Icons must not replace readable labels.
- Use fallback icon behavior when missing.
- Do not show broken icons.
- Do not stretch or distort icons.
- Do not infer token identity from icon alone.

Fallback examples:

```text
Generic token icon
Token initials
Network-neutral placeholder
```

Token icon usage should align with `assets/` rules when asset documentation is added.

---

## Badges

Select cards may include badges.

Examples:

```text
Recommended
Connected
Watch-only
Estimated
Unavailable
Popular
```

Rules:

- Use `components/badge.md`.
- Badge state must be provided by data.
- Badge must not calculate recommendation, status, or availability.
- Avoid too many badges per card.
- Use calm labels only.

---

## Supporting Metrics

Select cards may include a small supporting metric when useful.

Examples:

```text
Est. APY: 6.2%
Balance: 12.45 SOL
Wallet value: $5,500
```

Rules:

- Metrics must come from structured data.
- Clearly label estimates.
- Do not calculate metrics inside the card.
- Do not imply guaranteed returns.
- Do not use metrics to create pressure.

---

## Sizes

### Small

Use for compact option groups.

Examples:

- Display preference
- Simple filter choice
- Compact settings option

Rules:

- Keep content minimal.
- Avoid long descriptions.

### Medium

Default select card size.

Use for onboarding, wallet method selection, goals, risk levels, and settings.

### Large

Use for important choices with more context.

Examples:

- Goal selection
- Wallet method selection
- Protocol preview

Rules:

- Do not overload the card.
- Keep explanations concise.
- Consider a detail modal if more explanation is needed.

---

## States

Select cards must support these states.

### Unselected

Default state.

### Selected

Selected state must be visually and accessibly clear.

Use more than color to communicate selection.

Examples:

- Border emphasis
- Checkmark
- Selected label
- Background change

### Hover

Indicates interactivity for pointer users.

### Focus

Required for keyboard users.

Use visible focus styling.

### Pressed

Optional tactile state for click/tap.

### Disabled

Use when option is unavailable.

Disabled reason should be shown when useful.

### Loading

Use when option details are loading.

Do not show fake metrics, labels, or badges while loading.

### Error

Use when option data fails to load.

Example:

```text
Could not load this option.
```

### Recommended

Use only when provided by product logic.

Recommended state should not override user choice.

---

## Token Usage

Select cards must use semantic tokens.

Do not hardcode colors, spacing, typography, radius, shadows, motion, or z-index.

### Correct

```text
background: color.surface.card
selected background: color.selection.background.default
border: color.border.subtle
selected border: color.action.primary.background.default
title: typography.heading.sm
description: typography.body.sm
metric: typography.metric.compact
radius: radius.surface.md
shadow: shadow.card.default
hover shadow: shadow.card.hover
focus: shadow.control.focus
motion: motion.interaction.hover
```

### Incorrect

```text
background: #FFFFFF
border: 2px solid #003DFF
font-size: 14px
border-radius: 16px
box-shadow: 0px 4px 12px rgba(0,0,0,0.08)
transition: 200ms ease
```

---

## Responsive Behavior

Select cards should be mobile-first.

### Mobile

- Stack cards vertically.
- Make the full card tappable.
- Keep tap targets comfortable.
- Keep titles and descriptions readable.
- Avoid dense multi-column layouts.
- Keep selected state obvious.
- Avoid long descriptions that make cards hard to scan.

### Tablet

- Cards may use one or two columns.
- Keep card heights consistent in a group.
- Avoid overly wide cards.

### Desktop

- Cards may use grid layouts.
- Use consistent spacing.
- Keep group alignment stable.
- Allow comparison without excessive scrolling.

### Wide

- Do not stretch cards unnecessarily.
- Keep card widths readable.
- Use max-width constraints where appropriate.

---

## Accessibility

Select cards must support accessibility by default.

Requirements:

- Entire card should be keyboard accessible.
- Selection state must be communicated to screen readers.
- Use radio-group semantics for single select where appropriate.
- Use checkbox semantics for multi-select where appropriate.
- Label must be programmatically associated.
- Focus state must be visible.
- Disabled state must be communicated.
- Do not rely on color alone.
- Icons must not be the only label.
- Contrast must meet WCAG AA.
- Supporting descriptions should be associated where useful.

Recommended single-select semantics:

```text
role="radiogroup"
role="radio"
aria-checked="true"
```

Recommended multi-select semantics:

```text
input type="checkbox"
aria-checked="true"
```

Use native controls visually enhanced as cards when possible.

---

## Keyboard Behavior

Required behavior for single-select card groups:

```text
Tab: move focus into the group
Arrow keys: move between options where radio-group behavior is used
Space: select focused option
Enter: select focused option where supported
```

Required behavior for multi-select cards:

```text
Tab: move between cards
Space: toggle focused card
Enter: toggle focused card where supported
```

Rules:

- Focus should remain predictable.
- Disabled cards should not be selectable.
- Selected state should update clearly.
- Keyboard behavior should match the semantic pattern used.

---

## Content Rules

Select card copy should follow WealthSmith voice:

- Clear
- Calm
- Specific
- Beginner-friendly
- Non-hype
- Educational when needed

Good titles:

```text
Build Long-Term Wealth
Medium risk
Connect wallet
Add watch-only address
Monthly
```

Good descriptions:

```text
A balanced approach with some exposure to market volatility.
```

```text
Paste a public address to track it in read-only mode.
```

```text
Contribute on a regular monthly schedule.
```

Avoid vague labels:

```text
Option 1
Choice A
Recommended thing
```

Avoid hype:

```text
Best profit
Guaranteed return
Risk-free yield
Must choose
Moonshot
```

---

## Financial and Wallet Language Rules

Select cards must use precise financial and wallet language.

Allowed:

```text
Estimated
May change
Public wallet data
Read-only
Connected wallet
Watch-only address
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

## Validation Rules

Select card validation belongs outside the component.

The select card component may display:

- Required selection missing
- Option unavailable
- Disabled reason
- Error state
- Helper text
- Selected state

The select card component must not decide:

- Which option is suitable
- Which risk level is correct
- Which goal is best
- Which protocol is best
- Which token is recommended
- Whether onboarding is complete
- Whether a financial action should proceed

---

## Do

- Use select cards for rich visible choices.
- Use semantic tokens.
- Make the entire card clickable or tappable.
- Show selected state clearly.
- Support keyboard selection.
- Use token icons only with visible token labels.
- Use badges from structured data.
- Keep explanations short.
- Keep Smith AI onboarding compatible.
- Keep business logic outside the component.

---

## Do Not

- Do not use select cards for very long lists.
- Do not use select cards for destructive actions.
- Do not recommend options inside the component.
- Do not invent selected, recommended, disabled, or metric states.
- Do not rely on color alone.
- Do not rely on icons alone.
- Do not show broken token icons.
- Do not imply guaranteed returns.
- Do not use hype-based financial copy.
- Do not imply custody, execution, or investment action unless the product actually supports it.
- Do not hardcode raw visual values.
