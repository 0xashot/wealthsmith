# Toast

Toasts are temporary messages that confirm the result of an action or communicate lightweight status feedback.

In WealthSmith, toasts may be used after saving settings, copying addresses, connecting wallets, adding watch-only addresses, refreshing data, dismissing suggestions, or handling non-blocking errors.

Toasts should be brief, calm, accessible, and easy to understand.

---

## Purpose

Use toasts to provide short feedback after an action or background state change.

A toast should help users understand:

- An action succeeded
- An action failed
- Something is in progress
- Something was copied
- A lightweight warning needs attention
- A temporary status changed
- A retry is available

Toasts should confirm what happened without interrupting the main workflow.

---

## Important Rule

Toasts communicate feedback.

Toasts do not contain WealthSmith business logic.

A toast can display:

- Success message
- Error message
- Warning message
- Info message
- Loading message
- Retry action
- Undo action
- Dismiss action

A toast must not decide:

- Whether a suggestion is Top Pick
- Whether a user should invest
- Whether a protocol is recommended
- Whether a wallet is valid beyond provided state
- Whether portfolio data is correct
- Whether financial risk is acceptable
- Whether an action should be allowed
- Whether Smith AI should generate advice

Those decisions must come from product logic, backend rules, deterministic rules, or parent state.

The toast should render the message, tone, and action provided to it.

---

## When to Use

Use a toast for short, non-blocking feedback.

Examples:

```text
Address copied.
Wallet connected.
Watch-only address added.
Settings saved.
Suggestion dismissed.
Portfolio data refreshed.
Could not refresh data.
Could not copy address.
```

Toasts can appear after:

- Copying a wallet address
- Saving settings
- Adding a watch-only address
- Connecting or disconnecting a wallet
- Refreshing portfolio data
- Dismissing a suggestion
- Applying filters
- Updating a preference
- Loading Smith AI context
- Failing a non-blocking action

---

## When Not to Use

Do not use a toast for:

- Critical warnings
- Required disclosures
- Long explanations
- Blocking errors
- Destructive confirmations
- Financial advice
- Main onboarding instructions
- Validation errors that belong near a form field
- Information the user must read before acting

Use:

- `components/modal.md` for confirmations and blocking decisions
- `components/input.md` for field validation
- `components/tooltip.md` for short explanations
- `components/sidebar.md` for Smith AI panel behavior
- Visible inline alerts or page states for important persistent messages

Do not hide important information inside a temporary toast.

---

## Data Source

Toasts should render structured feedback data.

Expected data may include:

```text
id
type
title
message
status
duration
dismissible
actionLabel
actionType
ariaRole
createdAt
```

The exact schema can evolve.

The component should not invent messages, statuses, action labels, retry behavior, or undo behavior.

---

## Anatomy

A toast can include:

1. Container
2. Optional icon
3. Title or message
4. Optional supporting text
5. Optional action button
6. Optional dismiss button
7. Optional progress/loading indicator

Required:

- Container
- Message or title
- Accessible announcement behavior

Optional:

- Icon
- Supporting text
- Action
- Dismiss button
- Loading indicator
- Undo action
- Retry action

Toast content should usually be one short sentence.

---

## Variants

### Success Toast

Use when an action completes successfully.

Examples:

```text
Address copied.
Settings saved.
Wallet connected.
Watch-only address added.
Suggestion dismissed.
```

Rules:

- Keep success messages brief.
- Do not over-celebrate financial actions.
- Do not use hype.
- Do not imply financial gain.

Token guidance:

- Background: `color.surface.card`
- Text: `color.text.primary`
- Icon: `color.feedback.success.text.tint`
- Border: `color.feedback.success.background.solid` where emphasis is needed
- Shadow: `shadow.overlay.dropdown`
- Radius: `radius.surface.md`

---

### Error Toast

Use when a non-blocking action fails.

Examples:

```text
Could not copy address.
Could not save settings.
Could not refresh portfolio data.
Wallet connection failed.
```

Rules:

- Explain what failed.
- Provide retry when useful.
- Avoid blame.
- Keep message specific.
- Do not hide blocking errors only in toasts.

Good:

```text
Could not refresh portfolio data. Try again.
```

Avoid:

```text
Something went wrong.
```

unless no better error is available.

---

### Warning Toast

Use for lightweight warning states that do not block the user.

Examples:

```text
Some prices are unavailable.
Portfolio data may be stale.
Estimated APY may have changed.
```

Rules:

- Use sparingly.
- Warning should be clear and calm.
- If the warning affects a decision, show it inline too.
- Do not rely on toast alone for important risk or estimate warnings.

---

### Info Toast

Use for neutral status feedback.

Examples:

```text
Portfolio refresh started.
Filters cleared.
Smith AI context updated.
```

Rules:

- Keep message neutral.
- Use for lightweight status changes.
- Do not use info toasts for required instructions.

---

### Loading Toast

Use when an action is in progress and feedback is useful.

Examples:

```text
Refreshing portfolio data…
Connecting wallet…
Saving settings…
```

Rules:

- Show loading only when action may take noticeable time.
- Replace with success or error when finished.
- Do not leave loading toasts stuck.
- Do not show fake success before completion.

---

### Undo Toast

Use when a reversible action is completed.

Examples:

```text
Suggestion dismissed.
Undo
```

Rules:

- Undo action must be supported by product logic.
- Do not show Undo if the action cannot be undone.
- Keep undo duration long enough to be usable.
- Destructive actions may still require confirmation before the action.

---

### Retry Toast

Use when an action fails and can be retried.

Examples:

```text
Could not refresh portfolio data.
Try again
```

Rules:

- Retry must perform the same failed action.
- Retry should not duplicate side effects.
- Do not show retry for actions that require a different fix.

---

## Placement

Toasts should appear in a consistent location.

Recommended placement:

- Desktop: bottom-right or top-right depending on product shell
- Mobile: bottom area above navigation or safe area
- Tablet: bottom or top edge depending on layout
- Inside modals: avoid global toast placement if it becomes disconnected from the modal action

Rules:

- Toasts should not cover primary actions.
- Toasts should not cover Smith AI input when Smith AI is open.
- Toasts should not cover mobile navigation.
- Toasts should respect safe areas.
- Multiple toasts should stack predictably.
- Do not place toasts where they look like permanent content.

---

## Duration

Toasts should dismiss automatically unless the message requires user action.

Recommended behavior:

```text
Success: short duration
Info: short duration
Warning: medium duration
Error: longer duration or manual dismiss when action is needed
Loading: remains until resolved
Undo: remains long enough for user to act
```

Rules:

- Users must have time to read the message.
- Toasts with actions should stay visible long enough to use.
- Critical messages should not auto-dismiss as toasts.
- Manual dismiss should be available for longer toasts.

Avoid very fast disappearance.

---

## Stacking

When multiple toasts appear:

- Stack them consistently.
- Limit the number shown at once.
- Prioritize newest or most important based on product behavior.
- Avoid overwhelming the user.
- Collapse or queue repeated messages when needed.

Repeated examples:

```text
Address copied.
Address copied.
Address copied.
```

Better:

```text
Address copied.
```

Do not spam duplicate toasts.

---

## Actions

Toasts may include one short action.

Examples:

```text
Try again
Undo
View
Open
```

Rules:

- Use one action maximum in most cases.
- Action label should be short.
- Action must be safe and clear.
- Do not put major financial actions inside a toast.
- Do not put destructive actions inside a toast.
- Use `components/button.md` style for toast action where applicable.

Allowed:

```text
Try again
Undo
View details
```

Avoid:

```text
Invest now
Buy now
Confirm removal
Approve transaction
```

---

## Dismiss Behavior

Toasts may auto-dismiss or be manually dismissed.

Rules:

- Dismiss button must have an accessible label.
- Manual dismiss should be available for error and warning toasts.
- Dismissing a toast should not cancel the underlying action unless explicitly designed.
- Loading toast should resolve into success or error.

Accessible label:

```text
aria-label="Dismiss notification"
```

---

## States

Toasts must support these states.

### Entering

Toast is appearing.

### Visible

Toast is readable and active.

### Exiting

Toast is dismissing.

### Dismissed

Toast is removed.

### Loading

Toast action is in progress.

### Paused

Toast timer may pause on hover, focus, or interaction.

Rules:

- Pause timer when user focuses the toast or hovers over it if actions are present.
- Respect reduced motion.
- Do not animate aggressively.

---

## Token Usage

Toasts must use semantic tokens.

Do not hardcode colors, spacing, typography, radius, shadows, motion, or z-index.

### Correct

```text
background: color.surface.card
text: color.text.primary
secondary text: color.text.secondary
success icon: color.feedback.success.text.tint
warning icon: color.feedback.warning.text.tint
danger icon: color.feedback.danger.text.tint
border: color.border.subtle
radius: radius.surface.md
shadow: shadow.overlay.dropdown
z-index: zIndex.feedback.toast
title: typography.label.md
message: typography.body.sm
motion: motion.feedback.success
```

### Incorrect

```text
background: #FFFFFF
color: #121212
border-radius: 12px
box-shadow: 0px 8px 24px rgba(0,0,0,0.12)
z-index: 9999
transition: 300ms ease
```

---

## Responsive Behavior

Toasts should be mobile-first.

### Mobile

- Keep toast width within screen bounds.
- Respect safe areas.
- Avoid covering bottom navigation or Smith AI input.
- Keep text short.
- Use one action maximum.
- Stack minimally.
- Tap targets must be comfortable.

### Tablet

- Place toasts where they do not cover important controls.
- Keep width readable.

### Desktop

- Use consistent corner placement.
- Stack toasts predictably.
- Avoid covering side panels or Smith AI.

### Wide

- Do not place toast too far from the user’s working area.
- Keep toast width constrained.

---

## Accessibility

Toasts must support accessibility by default.

Requirements:

- Announce important feedback to assistive technologies.
- Use appropriate live region behavior.
- Do not move keyboard focus to toast unless the toast requires immediate interaction.
- Toast actions must be keyboard accessible.
- Dismiss button must be keyboard accessible.
- Text contrast must meet WCAG AA.
- Do not rely on color alone.
- Pause auto-dismiss when focused or interacted with.
- Respect reduced motion.

Recommended live-region behavior:

```text
role="status" for success or info
role="alert" for important errors
aria-live="polite" for non-urgent feedback
aria-live="assertive" only for urgent non-blocking errors
```

Use assertive announcements sparingly.

---

## Keyboard Behavior

Required keyboard behavior:

```text
Tab: move to toast action or dismiss button when focusable
Enter: activate focused action
Space: activate focused button
Escape: may dismiss focused toast where supported
```

Rules:

- Do not trap focus inside toast.
- Do not steal focus from the user's current task for routine feedback.
- Toast actions should be reachable if the user tabs to them.
- After action or dismissal, focus should remain logical.

---

## Content Rules

Toast copy should follow WealthSmith voice:

- Clear
- Calm
- Specific
- Brief
- Non-hype
- Recovery-oriented for errors

Good success messages:

```text
Address copied.
Settings saved.
Wallet connected.
Watch-only address added.
```

Good error messages:

```text
Could not copy address.
Could not save settings. Try again.
Could not refresh portfolio data.
Wallet connection failed.
```

Good warning messages:

```text
Some prices are unavailable.
Portfolio data may be stale.
Estimated APY may have changed.
```

Avoid vague messages:

```text
Done.
Error.
Failed.
Something happened.
```

Avoid hype:

```text
You’re ready to make gains.
Profit unlocked.
Best yield found.
```

Toast messages should usually be under 80 characters when possible.

---

## Financial and Wallet Language Rules

Toast copy must be precise.

Allowed:

```text
Address copied.
Wallet connected.
Watch-only address added.
Portfolio data refreshed.
Estimated values updated.
```

Avoid:

```text
Funds connected.
Assets secured.
Profit unlocked.
Guaranteed return saved.
Investment completed.
```

Do not imply WealthSmith can move funds, sign transactions, or execute financial actions unless the product actually supports that action and the flow clearly explains it.

Do not imply that connecting or adding a wallet gives WealthSmith custody.

---

## Error Message Rules

Error toasts should explain the failed action and recovery path when possible.

Good:

```text
Could not refresh portfolio data. Try again.
```

```text
Wallet connection failed. Check your wallet and try again.
```

```text
Could not add address. Check the address and try again.
```

Avoid:

```text
Error 500.
Invalid.
Something went wrong.
```

Technical details should usually be logged or shown in developer/admin surfaces, not user-facing toasts.

---

## Undo Rules

Undo toasts should be used only when the action is reversible.

Good:

```text
Suggestion dismissed.
Undo
```

```text
Filter cleared.
Undo
```

Avoid undo for:

- Irreversible deletion
- Wallet disconnection if reconnection is required
- Financial transaction execution
- Actions that already triggered external effects
- Anything product logic cannot safely reverse

---

## Smith AI Toast Rules

Toasts may reference Smith AI only for UI feedback.

Allowed:

```text
Smith AI opened.
Smith AI context updated.
Could not load Smith AI. Try again.
```

Rules:

- Toasts do not contain Smith AI reasoning.
- Toasts should not summarize financial advice.
- During onboarding, Smith AI remains open and should not rely on toasts for required guidance.

Avoid:

```text
Smith AI found the best investment.
Smith AI guarantees this option.
```

---

## Validation and State Rules

Toast state belongs outside the component.

The toast may display:

- Message
- Tone
- Loading state
- Success state
- Error state
- Warning state
- Action
- Dismiss behavior

The toast must not decide:

- Whether an action succeeded
- Whether an action failed
- Whether an action is allowed
- Whether a suggestion is correct
- Whether a user should invest
- Whether a protocol is recommended
- Whether portfolio data is accurate

Those states must be passed to the component.

---

## Do

- Use toasts for short non-blocking feedback.
- Use semantic tokens.
- Keep messages brief and specific.
- Use calm success and error language.
- Provide retry or undo only when supported.
- Respect safe areas on mobile.
- Avoid covering Smith AI input or navigation.
- Announce feedback accessibly.
- Pause auto-dismiss when focused.
- Keep product logic outside the component.

---

## Do Not

- Do not use toasts for critical warnings or required disclosures.
- Do not hide important financial information in a toast.
- Do not use toasts for destructive confirmations.
- Do not put major financial actions inside toast actions.
- Do not invent success, error, or loading states.
- Do not spam duplicate toasts.
- Do not use vague messages like “Error” when better copy is available.
- Do not imply guaranteed returns.
- Do not use hype-based financial copy.
- Do not imply custody, execution, or investment action unless the product actually supports it.
- Do not hardcode raw visual values.
