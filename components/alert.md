# Alert

Alerts are persistent inline messages that communicate important contextual information inside a page, card, section, modal, or panel.

In WealthSmith, alerts may be used for recommendations, warnings, errors, info messages, missing data, estimated values, wallet states, demo/sample context, and recoverable issues.

Alerts should be visible, calm, specific, accessible, and easy to act on when an action is provided.

---

## Purpose

Use alerts to communicate important contextual information that should remain visible until the user understands it, resolves it, dismisses it, or leaves the related context.

An alert should help users understand:

- A recommendation needs attention
- A portfolio condition has been detected
- Some data is missing or unavailable
- A wallet or integration state affects the page
- A user action failed and recovery is possible
- A warning applies to the current section
- A non-blocking issue needs visibility
- A specific context needs explanation

Alerts should provide persistent context, not temporary feedback.

---

## Alert vs Toast vs Announcement vs Modal

Alerts are different from other message components.

### Alert

Use for persistent inline messages inside page content.

Examples:

```text
You are 15% overexposed to volatile assets.
Some prices are unavailable.
This wallet is tracked in read-only mode.
```

### Toast

Use for temporary feedback after an action.

Examples:

```text
Address copied.
Settings saved.
Could not refresh data.
```

Use `components/toast.md`.

### Announcement

Use for global, full-width top-of-app messages.

Examples:

```text
You’re in demo mode.
```

Use `components/announcement.md`.

### Modal

Use for blocking confirmations or focused decisions.

Examples:

```text
Remove wallet?
Discard changes?
```

Use `components/modal.md`.

---

## Important Rule

Alerts display contextual information.

Alerts do not contain WealthSmith business logic.

An alert can display:

- Info message
- Warning message
- Error message
- Success message
- Recommendation message
- Title
- Body
- Icon
- Action
- Close button
- Status
- Dismissed state

An alert must not decide:

- Which recommendation appears
- Which suggestion is Top Pick
- Whether a portfolio is overexposed
- Whether a user should swap tokens
- Whether risk level is appropriate
- Whether safety buffer coverage is sufficient
- Whether a protocol is recommended
- Whether a wallet is valid beyond provided state
- Whether a user should invest

Those decisions must come from Suggestion Engine, product logic, backend state, deterministic rules, or parent layout state.

The alert should render alert data provided to it.

---

## When to Use

Use an alert when information should stay visible in context.

Examples:

- Recommendation summary inside dashboard
- Warning inside a portfolio section
- Missing price notice inside asset list
- Read-only wallet notice inside wallet page
- Estimated APY notice inside yield section
- Error inside a card or modal
- Success state after a persistent setup action
- Data delay notice inside portfolio view
- Safety buffer warning inside suggestion detail
- Inline explanation for a blocked action

Alerts can appear in:

- Dashboard
- Portfolio overview
- Suggestion pages
- Suggestion detail views
- Wallet pages
- Asset detail pages
- Tables
- Cards
- Modals
- Side panels
- Smith AI context areas
- Onboarding sections

---

## When Not to Use

Do not use an alert for:

- Temporary action feedback
- Full-width global app mode
- Blocking confirmation
- Small helper text
- Tooltip-level explanations
- Passive labels
- Main calls to action
- Chat messages
- Long educational content
- Hidden legal or risk disclosure

Use:

- `components/toast.md` for temporary feedback
- `components/announcement.md` for global top banners
- `components/modal.md` for blocking decisions
- `components/tooltip.md` for small explanations
- `components/badge.md` for passive status labels
- Smith AI for longer explanations

Do not hide critical information in a dismissible alert unless another persistent indicator remains.

---

## Data Source

Alerts should render structured alert data.

Expected data may include:

```text
id
type
tone
title
message
icon
actionLabel
actionType
dismissible
dismissLabel
status
source
createdAt
updatedAt
ariaRole
```

The exact schema can evolve.

The component should not invent alert messages, recommendation reasons, status, action labels, or dismiss behavior.

---

## Anatomy

An alert can include:

1. Alert container
2. Leading icon
3. Title
4. Body message
5. Optional action button
6. Optional link
7. Optional close button
8. Optional badge
9. Optional supporting metadata
10. Optional progress or loading indicator

Required:

- Container
- Message or title
- Accessible alert semantics where appropriate

Optional:

- Icon
- Title
- Body
- Action
- Close button
- Badge
- Metadata
- Link

Alert content should be clear without relying on icon or color alone.

---

## Variants

### Info Alert

Use for neutral contextual information.

Examples:

```text
This wallet is tracked in read-only mode.
Estimated values may change as prices update.
```

Rules:

- Use calm explanatory language.
- Keep message concise.
- Use when context matters but does not require urgent action.

---

### Success Alert

Use for persistent success or completion state.

Examples:

```text
Your wallet is connected.
Portfolio setup is complete.
```

Rules:

- Use success sparingly.
- Do not over-celebrate financial states.
- Do not imply future outcomes are guaranteed.

Avoid:

```text
You’re guaranteed to be safe now.
```

---

### Warning Alert

Use when something needs attention but does not fully block use.

Examples:

```text
Some prices are unavailable.
Portfolio data may be stale.
You are overexposed to volatile assets.
```

Rules:

- Warning must be clear in text.
- Do not rely on color alone.
- Use action where recovery is possible.
- If warning affects a financial decision, make it visible inline and not only in tooltip.

---

### Error Alert

Use for persistent errors inside a specific context.

Examples:

```text
Could not load portfolio data.
Wallet connection failed.
Could not fetch protocol data.
```

Rules:

- Explain what failed.
- Provide recovery when useful.
- Avoid technical jargon.
- Do not use vague error copy when better copy is available.

Good:

```text
Could not load portfolio data. Try again.
```

Avoid:

```text
Something went wrong.
```

---

### Recommendation Alert

Use for a short recommendation or recommendation-related callout that has already been generated by product logic.

Example:

```text
Rebalance Recommendation
You are 15% overexposed to volatile assets. Swap SOL to USDC to realign with your Medium risk profile.
```

Rules:

- Recommendation content must come from Suggestion Engine or deterministic product logic.
- Alert must not generate the recommendation.
- Alert must not decide whether the user is overexposed.
- Alert must not choose token swap details.
- Alert must not decide whether the action is suitable.
- If action execution is not supported, use review/explain language instead of execution language.
- Use calm, explainable, non-hype copy.
- Include Smith AI explanation action where supported.

Safer action labels:

```text
Review recommendation
Ask Smith AI
View details
```

Avoid:

```text
Swap now
Buy now
Maximize gains
```

unless the product explicitly supports execution and the flow clearly explains it.

---

### Dismissible Alert

Use when a user can safely hide the alert.

Rules:

- Close button must be accessible.
- Dismiss action must not hide required information.
- Dismissed state must be handled by parent/product state.
- For recommendation alerts, dismissal behavior should come from Suggestion Engine or product state.
- Persistent global states should use `components/announcement.md`, not a dismissible alert.

Accessible label:

```text
aria-label="Dismiss alert"
```

---

### Action Alert

Use when an alert includes a related action.

Examples:

```text
Try again
Review recommendation
View details
Ask Smith AI
Refresh data
```

Rules:

- Action must directly relate to the alert.
- Use one primary action where possible.
- Action behavior belongs outside the alert component.
- Do not put major financial execution actions directly in alerts unless the product explicitly supports execution and the flow is safe.
- Destructive actions should not happen directly from an alert without confirmation.

---

### Inline Data Alert

Use inside portfolio, asset, wallet, or protocol sections.

Examples:

```text
Some token prices are unavailable.
APY data is estimated and may change.
This address is watch-only.
```

Rules:

- Keep message close to affected content.
- Use visible text, not only icon.
- Use alerts only when the message is important enough to persist.

---

### Compact Alert

Use inside dense cards or panels.

Rules:

- Keep title optional.
- Keep body short.
- Use icon only when helpful.
- Avoid long paragraphs.
- Do not use compact alerts for critical warnings that need full explanation.

---

## Recommendation Alert Rules

Recommendation alerts need extra care.

Allowed:

```text
Rebalance Recommendation
You are 15% overexposed to volatile assets.
Review recommendation
Ask Smith AI
```

Avoid:

```text
Guaranteed improvement
Best investment
Swap now for profit
You must rebalance
```

Rules:

- Recommendation logic belongs outside the alert.
- Use structured recommendation copy from content rules.
- Do not invent token names, percentages, risk profiles, or swap instructions.
- Do not imply execution if WealthSmith only provides suggestions.
- Do not present recommendations as guaranteed outcomes.
- Do not hide risk notes if the action is meaningful.

If the alert includes a direct action, make sure the product supports that action.

For MVP suggestion-only behavior, prefer:

```text
Review recommendation
```

instead of:

```text
Swap now
```

---

## Actions

Alerts may include one or more actions, but one primary action is preferred.

Examples:

```text
Review recommendation
Ask Smith AI
View details
Try again
Refresh data
Dismiss
```

Rules:

- Actions should be short.
- Actions should be specific.
- Use `components/button.md`.
- Use secondary/tertiary style for non-primary actions.
- Destructive actions should open confirmation modal.
- Avoid financial execution labels unless supported.

Good:

```text
Review recommendation
Ask Smith AI
Try again
View details
```

Avoid:

```text
Invest now
Buy now
Swap now
Maximize yield
Proceed
```

---

## Close Button

Alerts may include a close button when dismissible.

Rules:

- Use icon-only button from `components/button.md`.
- Close button must have accessible label.
- Close button should not conflict with alert actions.
- Dismiss behavior belongs outside the component.
- Do not show close button if dismissal is not allowed.

Accessible label:

```text
aria-label="Dismiss alert"
```

---

## Icons

Alerts may include a leading icon.

Examples:

- Info icon
- Warning icon
- Error icon
- Success icon
- Sparkle or assistant icon for recommendation callout
- Wallet icon
- Data icon

Rules:

- Icon supports meaning but does not replace text.
- Icon color must use semantic tokens.
- Icon must not be the only indicator.
- Recommendation icon should not make financial advice feel magical or guaranteed.
- Do not use overly playful icons for serious financial states.

---

## Sizes

### Compact

Use inside cards, modals, or side panels.

Rules:

- Short body.
- Optional title.
- One action maximum.

### Standard

Default alert size.

Use for page sections, dashboards, and recommendation callouts.

Rules:

- Supports icon, title, body, action, and close button.

### Prominent

Use when the alert is important inside a page section.

Examples:

- Rebalance recommendation
- Safety buffer warning
- Major missing data state

Rules:

- Use sparingly.
- Do not make prominent alerts look like global announcements.
- If it applies globally, use `components/announcement.md`.

---

## States

Alerts must support these states.

### Visible

Alert is displayed.

### Dismissed

Alert has been dismissed by user or product state.

Rules:

- Only allowed when dismissal is safe.
- Dismissed state belongs outside the component.

### Loading

Use when alert action is in progress.

Examples:

```text
Refreshing data…
Loading details…
```

Rules:

- Prevent duplicate actions.
- Do not show fake completion.

### Error

Use when alert action fails.

Example:

```text
Could not refresh data. Try again.
```

### Resolved

Use when alert issue has been resolved and product behavior keeps a success message visible.

Example:

```text
Portfolio data refreshed.
```

Often, resolved alerts may disappear instead.

---

## Token Usage

Alerts must use semantic tokens.

Do not hardcode colors, spacing, typography, radius, shadows, motion, or z-index.

### Correct

```text
background: color.surface.card
text: color.text.primary
secondary text: color.text.secondary
border: color.border.subtle
info icon: color.feedback.info.text.tint
success icon: color.feedback.success.text.tint
warning icon: color.feedback.warning.text.tint
danger icon: color.feedback.danger.text.tint
title: typography.heading.sm
body: typography.body.md
radius: radius.surface.lg
shadow: shadow.surface.raised
padding: spacing.card.padding.md
gap: spacing.card.gap.md
motion: motion.surface.fadeIn
```

### Incorrect

```text
background: #FFFFFF
border: 1px solid #C5C5C5
border-radius: 24px
box-shadow: 0px 16px 40px rgba(0,0,0,0.12)
padding: 24px
font-size: 16px
```

---

## Color Usage

Alert color must support meaning, but color must not be the only signal.

Rules:

- Include readable title or message.
- Use semantic color tokens.
- Use icons only as support.
- Use warning and danger tones intentionally.
- Keep contrast WCAG AA compliant.
- Do not make normal market changes look like critical errors unless product logic says so.
- Recommendation alert tone should be calm and trustworthy.

---

## Responsive Behavior

Alerts should be mobile-first.

### Mobile

- Use full available content width.
- Stack icon, text, and actions when needed.
- Keep close button reachable.
- Keep text readable.
- Avoid overly long single-line messages.
- Actions may stack below body text.
- Do not cover mobile navigation or Smith AI input.

### Tablet

- Alert may use horizontal layout.
- Keep icon and text aligned.
- Preserve readable text width.

### Desktop

- Alert may use horizontal layout with icon, text, action, and close button.
- Keep action visually connected to message.
- Avoid stretching text too wide.

### Wide

- Keep alert content constrained.
- Do not let one-line alerts span unreadably across the entire viewport unless they are announcements.
- If full-width top placement is needed, use `components/announcement.md`.

---

## Accessibility

Alerts must support accessibility by default.

Requirements:

- Alert text must be available to assistive technologies.
- Use appropriate role based on urgency.
- Do not rely on color alone.
- Icons must not be the only meaning.
- Action buttons must be keyboard accessible.
- Close button must be keyboard accessible.
- Focus state must be visible.
- Contrast must meet WCAG AA.
- Alerts should not steal focus unless critical.
- Dismissal must be clear.

Recommended roles:

```text
role="status"
aria-live="polite"
```

For important errors:

```text
role="alert"
aria-live="assertive"
```

Use assertive behavior sparingly.

If the alert is already visible when the page loads, it may not need repeated live announcement.

---

## Keyboard Behavior

Required keyboard behavior:

```text
Tab: move to action or close button
Enter: activate focused action
Space: activate focused button
Escape: may dismiss only when dismissal is allowed
```

Rules:

- Do not trap focus inside alert.
- Do not steal focus for routine alerts.
- If an alert appears due to user action and contains recovery, ensure recovery action is reachable.
- If alert is dismissed, focus should move logically.

---

## Content Rules

Alert copy should follow WealthSmith voice:

- Clear
- Calm
- Specific
- Trustworthy
- Beginner-friendly
- Non-hype
- Recovery-oriented when something failed

Good alert titles:

```text
Rebalance Recommendation
Portfolio data unavailable
Wallet is read-only
Estimated APY
Some prices are unavailable
```

Good alert body copy:

```text
You are 15% overexposed to volatile assets.
This wallet is tracked in read-only mode. WealthSmith cannot sign transactions from it.
Some token prices are unavailable, so portfolio value may be incomplete.
Estimated APY may change as protocol rates update.
```

Avoid vague copy:

```text
Important
Notice
Something happened
Warning
```

Avoid hype:

```text
Unlock gains
Best profit opportunity
Guaranteed yield
Must swap now
```

---

## Financial and Wallet Language Rules

Alert copy must be precise.

Allowed:

```text
Estimated
May change
Read-only
Watch-only
Public wallet data
Overexposed
Review recommendation
Unavailable
Data may be delayed
```

Avoid:

```text
Guaranteed
Risk-free
Best return
Profit mode
Auto-invest
Custody access
Funds secured
```

Do not imply WealthSmith can move funds, sign transactions, or execute financial actions unless the product actually supports that action and the flow clearly explains it.

Do not imply recommendations guarantee better outcomes.

---

## Smith AI Rules

Alerts may include Smith AI actions.

Allowed:

```text
Ask Smith AI
Explain with Smith AI
```

Rules:

- Alert may open Smith AI.
- Alert does not generate Smith AI reasoning.
- Parent state should pass structured context to Smith AI.
- During onboarding, Smith AI remains open.
- Do not use Smith AI actions as a substitute for visible required warnings.

Avoid:

```text
Ask AI what to buy
Let AI maximize returns
```

---

## Validation and State Rules

Alert state belongs outside the component.

The alert may display:

- Type
- Tone
- Title
- Message
- Icon
- Action
- Close button
- Loading state
- Error state
- Dismissed state

The alert must not decide:

- Whether an alert should appear
- Which recommendation is shown
- Whether exposure is too high
- Whether a user should rebalance
- Whether a swap should happen
- Whether a protocol is best
- Whether a financial action should proceed

---

## Do

- Use alerts for persistent inline contextual messages.
- Use semantic tokens.
- Keep alert copy clear and calm.
- Use visible text with icons.
- Use close button only when dismissal is safe.
- Use action buttons only when directly related.
- Keep recommendation logic outside the alert.
- Use recommendation alerts only from structured product data.
- Make financial and wallet language precise.
- Make alerts accessible.

---

## Do Not

- Do not use alerts for temporary feedback that belongs in a toast.
- Do not use alerts for global demo mode banners that belong in announcements.
- Do not use alerts for blocking confirmations that belong in modals.
- Do not hide critical warnings in dismissible alerts only.
- Do not generate financial recommendations inside alerts.
- Do not invent percentages, token names, risk states, or actions.
- Do not rely on icon or color alone.
- Do not use hype-based financial copy.
- Do not imply guaranteed returns.
- Do not imply custody, execution, or investment action unless the product actually supports it.
- Do not hardcode raw visual values.
