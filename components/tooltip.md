# Tooltip

Tooltips provide short contextual explanations for UI elements in WealthSmith.

They help users understand labels, metrics, statuses, badges, estimates, sources, and unfamiliar terms without leaving the current screen.

Tooltips should be brief, helpful, accessible, and non-disruptive.

---

## Purpose

Use tooltips to clarify existing UI.

A tooltip should help users understand:

- What a label means
- How a metric is interpreted
- Why a value is estimated
- Where data comes from
- What a status or badge means
- What an icon represents
- What will happen before the user takes an action

Tooltips should reduce confusion without replacing visible content.

---

## Important Rule

Tooltips explain existing UI.

Tooltips do not hide critical information.

Tooltips must not contain essential warnings, required disclosures, major errors, core instructions, or financial advice that the user must see before acting.

A tooltip can explain:

- Estimated APY
- Safety buffer
- Watch-only wallet
- Missing price
- Data source
- Staked asset
- Top Pick label
- Allocation percentage

A tooltip must not decide:

- Whether a suggestion appears
- Whether a suggestion is Top Pick
- Whether a metric is good or bad
- Which protocol should be selected
- Whether a user should invest
- Whether a user is eligible for an action
- How risk level affects recommendation logic

Those meanings must come from product logic, backend data, or deterministic rules.

---

## When to Use

Use a tooltip when a short explanation helps users understand an existing UI element.

Examples:

- Explain “Safety buffer”
- Explain “Estimated APY”
- Explain “Watch-only”
- Explain “Missing price”
- Explain “Top Pick”
- Explain where a portfolio value comes from
- Explain why a value is estimated
- Explain a compact icon-only control
- Explain a data freshness timestamp

Tooltips can appear near:

- Labels
- Icons
- Badges
- Metrics
- Table headers
- Disabled controls
- Estimated values
- Status indicators

---

## When Not to Use

Do not use a tooltip for:

- Long explanations
- Required warnings
- Critical errors
- Core onboarding instructions
- Terms and legal disclaimers
- Main product copy
- Multi-step guidance
- Financial recommendations
- Content required to complete a task

Use visible helper text, inline alerts, modals, or Smith AI explanations for deeper content.

Do not hide important information only inside a tooltip.

---

## Data Source

Tooltips should render approved explanatory copy.

Expected data may include:

```text
id
triggerLabel
content
placement
tone
size
isInteractive
delay
ariaLabel
```

The exact schema can evolve.

The component should not invent tooltip explanations for financial logic, estimates, risks, or protocol reasoning.

---

## Anatomy

A tooltip can include:

1. Trigger element
2. Tooltip container
3. Tooltip text
4. Optional arrow
5. Optional icon
6. Optional source label
7. Optional keyboard/focus behavior

Required:

- Trigger element
- Tooltip content
- Accessible relationship between trigger and tooltip

Optional:

- Arrow
- Icon
- Source label

Tooltip content should usually be one or two short sentences.

---

## Variants

### Info Tooltip

Use for general explanations.

Examples:

```text
Safety buffer helps cover essential expenses before taking more risk.
```

```text
Watch-only means WealthSmith can view public wallet data but cannot sign transactions.
```

Token guidance:

- Background: `color.surface.card`
- Text: `color.text.primary`
- Border: `color.border.subtle`
- Radius: `radius.surface.sm`
- Shadow: `shadow.overlay.dropdown`
- Typography: `typography.body.sm`
- Z-index: `zIndex.menu.tooltip`

---

### Help Tooltip

Use when explaining how to use a UI control.

Examples:

```text
Paste a public wallet address to track it in read-only mode.
```

```text
Use your average monthly expenses.
```

Rules:

- Keep the explanation practical.
- Do not replace visible labels or helper text.
- If the user needs the information to complete the form, prefer helper text instead.

---

### Data Source Tooltip

Use to explain where data comes from.

Examples:

```text
Based on your connected wallets.
```

```text
Estimated using available protocol data.
```

```text
Updated from indexed wallet balances.
```

Rules:

- Be specific when the source is known.
- Do not imply precision if the data is estimated or incomplete.
- Do not invent data sources.

---

### Estimate Tooltip

Use to clarify estimated values.

Examples:

```text
This value is estimated and may change as prices or APY change.
```

```text
Estimated APY is based on currently available protocol data.
```

Rules:

- Clearly state that the value is estimated.
- Avoid guarantee language.
- Do not hide estimate status only in a tooltip when the estimate affects user trust.

Avoid:

```text
This return is guaranteed.
```

```text
This is risk-free.
```

---

### Risk Tooltip

Use only for brief clarification of visible risk labels.

Examples:

```text
High concentration means one asset makes up a large share of the portfolio.
```

Rules:

- Risk tooltips must not replace visible risk warnings.
- If risk is important to the action, show it inline as visible text.
- Do not create new risk interpretation inside the tooltip.

---

### Disabled Reason Tooltip

Use carefully when explaining why a control is disabled.

Examples:

```text
Connect a wallet before reviewing this suggestion.
```

```text
Enter monthly expenses to calculate your safety buffer target.
```

Rules:

- If the disabled reason is important, show it as visible helper text too.
- Do not make tooltip the only explanation for blocked actions.

---

### Icon Tooltip

Use when an icon needs explanation.

Examples:

```text
Copy address
```

```text
Open Smith AI
```

Rules:

- Icon-only buttons still need accessible labels.
- Tooltip text should match or support the accessible label.
- Do not use tooltip as the only accessible name.

---

## Sizes

### Small

Use for very short labels.

Examples:

```text
Copy address
```

```text
Estimated
```

### Medium

Default tooltip size.

Use for one or two sentence explanations.

### Large

Use rarely.

If tooltip content becomes long, use an inline explanation, popover, modal, or Smith AI explanation instead.

---

## Placement

Tooltips may appear:

- Top
- Right
- Bottom
- Left

Rules:

- Prefer placement that keeps the tooltip visible inside the viewport.
- Avoid covering the trigger when possible.
- Avoid covering critical values or actions.
- Reposition automatically when near screen edges.
- Use consistent spacing from trigger.
- Keep tooltip close to the item it explains.

On mobile, placement may change to keep content readable.

---

## Trigger Behavior

Tooltips may be triggered by:

- Hover
- Focus
- Tap
- Press on mobile where appropriate

Desktop behavior:

- Show on hover for mouse users.
- Show on focus for keyboard users.
- Hide on mouse leave or blur.
- Allow Escape to dismiss where applicable.

Mobile behavior:

- Hover does not exist.
- Use tap, info icon, or inline helper text.
- Do not require long press for important information.
- Avoid tiny trigger targets.

Tooltips should not appear unexpectedly or block the user's work.

---

## States

Tooltips may support these states.

### Hidden

Tooltip is not visible.

### Visible

Tooltip is visible and associated with the trigger.

### Focused

Tooltip is visible because the trigger has keyboard focus.

### Dismissed

Tooltip has been dismissed by Escape, blur, outside tap, or another allowed behavior.

### Disabled

Do not show tooltip if the trigger is disabled and cannot receive focus, unless an accessible wrapper or visible helper text supports it.

---

## Token Usage

Tooltips must use semantic tokens.

Do not hardcode colors, spacing, typography, radius, shadows, motion, or z-index.

### Correct

```text
background: color.surface.card
color: color.text.primary
border: color.border.subtle
font: typography.body.sm
border-radius: radius.surface.sm
box-shadow: shadow.overlay.dropdown
z-index: zIndex.menu.tooltip
motion: motion.surface.fadeIn
```

### Incorrect

```text
background: #121212
color: #FFFFFF
font-size: 12px
border-radius: 8px
box-shadow: 0px 4px 12px rgba(0,0,0,0.2)
z-index: 9999
```

---

## Responsive Behavior

Tooltips should be mobile-first and adaptive.

### Mobile

- Prefer visible helper text for important explanations.
- Use tap-triggered tooltip only for lightweight clarification.
- Ensure trigger target is comfortable to tap.
- Avoid tiny info icons when the explanation is important.
- Tooltip must fit within viewport.
- Tooltip should not block primary actions.
- Dismiss on outside tap or Escape where available.

### Tablet

- Support both tap and pointer behavior where relevant.
- Keep tooltip placement adaptive.

### Desktop

- Support hover and focus.
- Keep tooltip close to trigger.
- Avoid covering important dashboard values.
- Keep tooltip content short.

### Wide

- Do not let tooltip become too wide.
- Keep line length readable.

---

## Accessibility

Tooltips must support accessibility by default.

Requirements:

- Tooltip must be available on keyboard focus, not only hover.
- Trigger must be focusable when tooltip is needed for keyboard users.
- Tooltip text must be associated with the trigger.
- Tooltip must not contain focusable controls unless it behaves as a popover instead.
- Escape should dismiss tooltip where applicable.
- Color must not be the only meaning.
- Text contrast must meet WCAG AA.
- Tooltip content should be readable by screen readers where relevant.
- Tooltip must not hide required instructions.

Recommended relationships:

```text
aria-describedby="tooltip-id"
role="tooltip"
```

Icon-only controls still need their own accessible label.

Example:

```text
aria-label="Copy wallet address"
aria-describedby="copy-address-tooltip"
```

---

## Content Rules

Tooltip copy should follow WealthSmith voice:

- Clear
- Calm
- Trustworthy
- Beginner-friendly
- Specific
- Non-hype
- Brief

Tooltip content should usually be:

- One short phrase
- One sentence
- Two short sentences at most

Good examples:

```text
Estimated APY may change as protocol rates change.
```

```text
Watch-only means WealthSmith can view public wallet data but cannot sign transactions.
```

```text
Safety buffer helps cover essential expenses before taking more risk.
```

Avoid vague tooltip copy:

```text
More info
```

```text
This is important
```

```text
Read this
```

Avoid hype:

```text
This is the best yield.
```

```text
Maximize gains with this option.
```

```text
Guaranteed return.
```

---

## Financial Language Rules

Tooltips must be especially careful with financial language.

Allowed:

```text
Estimated
May change
Based on available data
Current protocol data
Public wallet data
Read-only
```

Avoid:

```text
Guaranteed
Risk-free
Best return
Highest profit
Must buy
Certain outcome
```

A tooltip should clarify uncertainty, not hide it.

---

## Do

- Use tooltips for short contextual explanations.
- Use semantic tokens.
- Keep tooltip copy brief.
- Show tooltips on focus as well as hover.
- Use visible helper text for important instructions.
- Clearly label estimated values.
- Explain watch-only and custody-sensitive states carefully.
- Associate tooltip text with the trigger accessibly.
- Keep financial language calm and precise.

---

## Do Not

- Do not hide critical information only in a tooltip.
- Do not use tooltips for long explanations.
- Do not put financial advice inside tooltips.
- Do not invent reasons, risks, estimates, or data sources.
- Do not rely only on hover.
- Do not use tooltip content as the only accessible label.
- Do not make tooltips interactive unless using a popover pattern.
- Do not hardcode raw visual values.
- Do not use hype-based financial copy.
- Do not imply guaranteed returns, custody, execution, or investment action.
