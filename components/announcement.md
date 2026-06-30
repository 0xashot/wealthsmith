# Announcement

Announcements are full-width messages displayed at the top of the WealthSmith interface.

They communicate important global states, product modes, notices, or temporary information that applies to the whole page or app experience.

Example:

```text
You’re in demo mode. Exit Demo
```

Announcements should be clear, calm, visible, accessible, and easy to dismiss when dismissal is allowed.

---

## Purpose

Use announcements to communicate important page-level or app-level information.

An announcement should help users understand:

- They are in demo mode
- The app is using sample data
- A global system notice is active
- A temporary product state exists
- Maintenance or degraded data availability is happening
- A global warning affects the current experience
- A user can take a clear related action

Announcements should be visible without blocking the main interface.

---

## Important Rule

Announcements communicate global UI state.

Announcements do not contain WealthSmith business logic.

An announcement can display:

- Demo mode state
- Info message
- Warning message
- Maintenance message
- System notice
- Action button
- Dismiss button
- Icon
- Link

An announcement must not decide:

- Whether demo mode is active
- Whether a wallet is valid
- Whether portfolio data is accurate
- Whether a user should invest
- Whether a suggestion is Top Pick
- Whether a protocol is recommended
- Whether a user is eligible for an action
- Whether financial risk is acceptable

Those states must come from product logic, backend state, user session state, or parent layout state.

The component should render the announcement state provided to it.

---

## Placement

Announcements appear at the top of the interface.

Required behavior:

- Full-width across the viewport
- Fixed or sticky at the top when product behavior requires persistence
- Above page content
- Above primary app layout
- Below browser chrome
- Respect safe areas on mobile
- Push content down or overlay content based on product layout rules

Preferred behavior:

```text
Top of app
Full-width
Visually prominent
Dismissible only when safe
```

Do not place announcements inside cards, sidebars, tables, or local content sections.

---

## Full-Width Behavior

The announcement should span the full available screen width.

This means:

- Width should be `100%` of viewport or app shell
- Content inside may be centered or constrained
- Background should extend edge to edge
- Message and actions should align within the app layout grid
- The banner should not look like a floating toast or card

The announcement is full-width, not a full-screen modal.

It should not block the entire screen unless product behavior explicitly defines a blocking system state.

---

## When to Use

Use an announcement for global messages.

Examples:

- Demo mode is active
- Sample data is being shown
- Portfolio data is temporarily unavailable
- Some integrations are degraded
- Maintenance is scheduled
- A read-only mode is active
- A beta feature notice applies globally
- A wallet connection issue affects the app
- A product-wide warning needs visibility

Common WealthSmith examples:

```text
You’re in demo mode.
You’re viewing sample portfolio data.
Some prices are currently unavailable.
Portfolio data may be delayed.
Read-only mode is active.
```

---

## When Not to Use

Do not use an announcement for:

- Short success feedback
- Field validation
- Small contextual explanations
- One-row errors
- Local card status
- Tooltip-level information
- Confirmation dialogs
- Destructive action confirmation
- Smith AI chat messages
- Individual suggestion status
- Passive badges

Use:

- `components/toast.md` for temporary action feedback
- `components/input.md` for field validation
- `components/tooltip.md` for short explanations
- `components/modal.md` for confirmations
- `components/badge.md` for passive status labels
- `components/suggestion-card.md` for suggestion-specific status

---

## Data Source

Announcements should render structured state.

Expected data may include:

```text
id
type
title
message
icon
actionLabel
actionType
dismissible
dismissLabel
persistent
placement
status
ariaRole
createdAt
expiresAt
```

The exact schema can evolve.

The component should not invent messages, actions, dismiss behavior, or announcement state.

---

## Anatomy

An announcement can include:

1. Full-width container
2. Content wrapper
3. Optional icon
4. Message
5. Optional title
6. Optional action button
7. Optional link
8. Optional dismiss button
9. Optional status indicator

Required:

- Full-width container
- Message
- Accessible announcement behavior

Optional:

- Icon
- Title
- Action button
- Dismiss button
- Link
- Secondary text

Announcement content should usually be one line on desktop and wrap cleanly on mobile.

---

## Variants

### Demo Mode Announcement

Use when the user is viewing demo mode or sample data.

Example:

```text
You’re in demo mode. Exit Demo
```

Rules:

- Must be clearly visible.
- Should appear at the top of the app.
- Should span the full screen width.
- Should make demo mode obvious.
- Should provide an exit action when available.
- Should not imply the demo data belongs to the user.
- Should not mix real and demo states without clear separation.

Recommended copy:

```text
You’re in demo mode.
```

Recommended action:

```text
Exit Demo
```

Avoid:

```text
This is your portfolio.
Your assets are ready.
Invest from demo.
```

---

### Info Announcement

Use for neutral global information.

Examples:

```text
You’re viewing sample portfolio data.
Portfolio data may be delayed.
Read-only mode is active.
```

Rules:

- Keep message calm and clear.
- Use when the information applies broadly.
- Provide action only when useful.

---

### Warning Announcement

Use when something needs attention but does not fully block use.

Examples:

```text
Some prices are currently unavailable.
Some protocol data may be delayed.
Wallet data is syncing.
```

Rules:

- Use warning tone only when useful.
- Warning must be visible in text, not color alone.
- If the warning affects decisions, show relevant inline context too.
- Do not rely only on the announcement for critical financial risk.

---

### Error Announcement

Use for global errors that affect the app experience.

Examples:

```text
Portfolio data could not be loaded.
Wallet connection is temporarily unavailable.
```

Rules:

- Explain the problem clearly.
- Provide recovery action when possible.
- Do not use vague copy.
- If the error blocks the user, consider a blocking state or modal instead.

Good:

```text
Portfolio data could not be loaded. Try again.
```

Avoid:

```text
Something went wrong.
```

---

### Maintenance Announcement

Use for scheduled or active maintenance.

Examples:

```text
Portfolio updates may be delayed during maintenance.
```

Rules:

- State impact clearly.
- Include time information only when product data provides it.
- Do not invent maintenance timelines.
- Do not hide major outages only in an announcement if the app is unusable.

---

### Beta Announcement

Use for global beta or preview notices.

Examples:

```text
You’re using an early version of WealthSmith.
```

Rules:

- Keep beta language calm.
- Do not use hype.
- Do not imply incomplete features are financial advice.

---

## Actions

Announcements may include one primary action.

Examples:

```text
Exit Demo
Try again
Learn more
Refresh
View details
```

Rules:

- Use one clear action when possible.
- Action must relate directly to the announcement.
- Action behavior belongs outside the component.
- Do not put major financial actions in announcements.
- Do not include buy, sell, swap, stake, or invest actions unless the product explicitly supports that flow and the action is not misleading.

Good:

```text
Exit Demo
Try again
View details
```

Avoid:

```text
Invest now
Buy now
Maximize yield
Get profits
```

---

## Dismiss Behavior

Announcements may be dismissible or persistent.

### Dismissible Announcement

Use when the message is helpful but not required.

Rules:

- Provide clear dismiss button.
- Dismiss button must have accessible label.
- Dismiss state should persist when product behavior supports it.
- Dismiss should not hide required information.

Accessible label:

```text
aria-label="Dismiss announcement"
```

### Persistent Announcement

Use when the message must remain visible.

Examples:

- Demo mode
- Read-only mode
- Major data delay
- System maintenance
- Critical global warning

Rules:

- Do not allow dismissal if hiding the message would mislead the user.
- Demo mode announcement should usually remain visible until demo mode is exited.
- If close is shown for persistent states, it should only minimize or hide non-essential detail while preserving visible state somewhere else.

For demo mode:

```text
Dismiss may be disabled unless another visible demo indicator remains.
```

---

## Demo Mode Rules

Demo mode must be unmistakable.

Rules:

- Announcement appears at the top of the app.
- Announcement spans full width.
- Demo state remains visible while demo mode is active.
- Exit Demo action should be available when product behavior supports it.
- Demo copy must not imply real user assets.
- Demo mode should not be confused with connected wallet state.
- If user connects a real wallet, product logic must clearly separate real and demo states.

Recommended structure:

```text
[Info icon] You’re in demo mode. [Exit Demo] [Dismiss if allowed]
```

Recommended message:

```text
You’re in demo mode.
```

Recommended action:

```text
Exit Demo
```

---

## Sizes

### Compact

Use when the message is short and global.

Example:

```text
You’re in demo mode.
```

Rules:

- Single line on desktop when possible.
- Wrap cleanly on mobile.

### Standard

Default size.

Use for messages with icon, text, action, and dismiss.

### Expanded

Use only when global context needs more detail.

Rules:

- Keep copy short.
- Do not turn announcement into a full article.
- Consider a page, modal, or Smith AI explanation for longer content.

---

## States

Announcements must support these states.

### Visible

Announcement is shown.

### Dismissed

Announcement is hidden because the user dismissed it.

Rules:

- Only allowed when dismissal is safe.
- Persistent states should not disappear fully unless another visible indicator remains.

### Persistent

Announcement stays visible while state is active.

### Loading

Use when an action inside the announcement is in progress.

Example:

```text
Exiting demo…
```

Rules:

- Prevent duplicate actions.
- Preserve message until action resolves.

### Error

Use when announcement action fails.

Example:

```text
Could not exit demo. Try again.
```

Rules:

- Show recovery.
- Do not silently fail.

### Success

Usually do not show success inside the same announcement if the state disappears.

For example:

- Exit Demo succeeds → announcement disappears.
- Refresh succeeds → announcement may disappear or update based on product state.

---

## Token Usage

Announcements must use semantic tokens.

Do not hardcode colors, spacing, typography, radius, shadows, motion, or z-index.

### Correct

```text
background: color.action.primary.background.default
text: color.text.inverse
icon: color.text.inverse
action background: color.action.primary.background.pressed
action text: color.text.inverse
dismiss icon: color.text.inverse
height/padding: spacing.section.padding.mobile or layout-specific spacing
title/message: typography.body.md
z-index: zIndex.feedback.criticalAlert or layout-approved top banner layer
motion: motion.surface.fadeIn
```

Alternative tones:

```text
info background: color.feedback.info.background.solid
warning background: color.feedback.warning.background.solid
danger background: color.feedback.danger.background.solid
success background: color.feedback.success.background.solid
```

### Incorrect

```text
background: #003DFF
color: #FFFFFF
height: 64px
padding: 0 32px
z-index: 9999
transition: 300ms ease
```

---

## Color Usage

Announcement color must support meaning, but color must not be the only signal.

Rules:

- Include readable text.
- Use icon only as support.
- Use semantic colors.
- Ensure WCAG AA contrast.
- Demo mode may use strong brand color when product-approved.
- Warning and danger tones should be used sparingly.
- Do not use alarming colors for normal informational states.

---

## Responsive Behavior

Announcements should be mobile-first.

### Mobile

- Full-width across the screen.
- Respect safe areas.
- Text may wrap to two lines.
- Action may wrap below message if needed.
- Dismiss button must remain tappable.
- Avoid covering mobile navigation.
- Avoid overlapping Smith AI onboarding content.
- If fixed, ensure page content is not hidden behind it.

### Tablet

- Full-width across app shell.
- Content may remain centered.
- Action should stay close to message.

### Desktop

- Full-width across viewport or app shell.
- Message and action may be horizontally centered.
- Dismiss button may be aligned to the far right.
- Content should align with layout grid.

### Wide

- Background remains full-width.
- Inner content may be constrained to max content width.
- Do not stretch message text excessively.

---

## Accessibility

Announcements must support accessibility by default.

Requirements:

- Text must be readable by assistive technologies.
- Important announcements should use live region behavior.
- Dismiss button must be keyboard accessible.
- Action button must be keyboard accessible.
- Focus state must be visible.
- Do not rely on color alone.
- Contrast must meet WCAG AA.
- Announcement should not unexpectedly steal focus unless critical.
- Persistent announcements should not repeatedly announce on every render.
- Icons must not be the only meaning.

Recommended semantics:

```text
role="status"
aria-live="polite"
```

For urgent global errors:

```text
role="alert"
aria-live="assertive"
```

Use assertive announcements sparingly.

---

## Keyboard Behavior

Required keyboard behavior:

```text
Tab: move to action or dismiss button
Enter: activate focused action
Space: activate focused button
Escape: may dismiss only when dismissal is allowed
```

Rules:

- Do not trap focus inside announcement.
- Do not steal focus for routine announcements.
- If action succeeds and announcement disappears, focus should move logically.
- Dismiss should not trigger unrelated actions.

---

## Content Rules

Announcement copy should follow WealthSmith voice:

- Clear
- Calm
- Specific
- Trustworthy
- Beginner-friendly
- Non-hype

Good announcement messages:

```text
You’re in demo mode.
You’re viewing sample portfolio data.
Some prices are currently unavailable.
Portfolio data may be delayed.
Read-only mode is active.
```

Good action labels:

```text
Exit Demo
Try again
View details
Refresh
Learn more
```

Avoid vague copy:

```text
Notice
Important
Something happened
Mode active
```

Avoid hype:

```text
Unlock gains
Profit mode active
Best yield available
Maximize returns now
```

---

## Financial and Wallet Language Rules

Announcement copy must be precise.

Allowed:

```text
Demo mode
Sample data
Read-only
Public wallet data
Estimated
May be delayed
Unavailable
```

Avoid:

```text
Guaranteed
Risk-free
Profit
Best return
Auto-invest
Custody access
Funds secured
```

Do not imply WealthSmith can move funds, sign transactions, or execute financial actions unless the product actually supports that action and the flow clearly explains it.

Do not imply demo data is real user data.

---

## Smith AI Rules

Announcements may coexist with Smith AI.

Rules:

- Announcement should not cover Smith AI input.
- During onboarding, Smith AI remains open.
- Announcement should not replace Smith AI onboarding guidance.
- If demo mode is active during onboarding, demo state should still remain visible.
- Smith AI should not be responsible for making the announcement visible or hidden.

Allowed:

```text
You’re in demo mode.
```

Avoid:

```text
Smith AI recommends demo mode.
```

---

## Implementation Guidance

Use announcement as part of the app shell or layout system.

Recommended structure:

```text
AppShell
  Announcement
  Header / Navigation
  Main Content
  Smith AI Panel
```

Rules:

- Announcement should be rendered above page content.
- Layout should account for announcement height.
- Fixed announcement should not cover content.
- Sticky announcement should remain visible while global state is active.
- Only one top global announcement should be visible at a time unless product behavior defines stacking.

If multiple global announcements exist, parent logic should prioritize them.

The component should not decide priority.

---

## Do

- Use announcements for global app-level messages.
- Make the announcement full-width at the top.
- Use semantic tokens.
- Keep copy short and specific.
- Make demo mode unmistakable.
- Provide Exit Demo action when available.
- Keep persistent messages visible while state is active.
- Use accessible live region behavior.
- Use dismiss only when safe.
- Keep product logic outside the component.

---

## Do Not

- Do not use announcements for local card status.
- Do not use announcements for field validation.
- Do not use announcements for destructive confirmations.
- Do not hide critical information if dismissing would mislead the user.
- Do not make demo mode look like real portfolio state.
- Do not invent announcement priority, state, or copy.
- Do not use arbitrary z-index values like `9999`.
- Do not cover Smith AI input or mobile navigation.
- Do not imply guaranteed returns.
- Do not use hype-based financial copy.
- Do not imply custody, execution, or investment action unless the product actually supports it.
- Do not hardcode raw visual values.
