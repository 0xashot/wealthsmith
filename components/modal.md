# Modal

Modals are temporary overlay surfaces that focus the user's attention on a specific task, decision, confirmation, or piece of important information.

In WealthSmith, modals may be used for wallet connection, suggestion details, confirmations, settings changes, errors, onboarding steps, and important review flows.

Modals should feel calm, clear, accessible, and easy to exit.

---

## Purpose

Use modals to interrupt the current page only when focused attention is needed.

A modal should help users:

- Complete a short focused task
- Review important information
- Confirm a meaningful action
- Understand an error or blocking state
- Make a decision without losing page context
- Safely cancel or close the flow

Modals should reduce complexity, not create more of it.

---

## Important Rule

Modals manage presentation and interaction focus.

Modals do not contain WealthSmith business logic.

A modal can display:

- Wallet connection options
- Suggestion details
- Confirmation text
- Form fields
- Error messages
- Warning messages
- Review content
- Action buttons

A modal must not decide:

- Which suggestion is shown
- Which suggestion is the Top Pick
- How safety buffer is calculated
- Which protocol should be selected
- Whether an investment action is suitable
- Whether a user should proceed financially
- Whether wallet data is valid beyond provided validation state

Business logic belongs in `rules/` or product/backend logic.

The modal should render structured data and actions provided to it.

---

## When to Use

Use a modal when the user needs focused attention for a contained task.

Examples:

- Connect wallet
- Add wallet address
- Review suggestion details
- Confirm remove wallet
- Confirm reset settings
- Show important blocking error
- Show onboarding step
- Confirm unsaved changes
- Explain a complex requirement
- Display protocol details before an action

Use modals for decisions that should not be missed.

---

## When Not to Use

Do not use a modal for:

- Routine page content
- Long educational documents
- Full dashboards
- Large portfolio tables
- Chat conversations
- Replacing normal page navigation
- Minor status messages
- Toast-level feedback
- Content that users need to compare side by side

Avoid modal overuse.

If the content is long or complex, use a page, drawer, sheet, or dedicated detail view instead.

---

## Anatomy

A modal can include:

1. Overlay scrim
2. Dialog container
3. Header
4. Title
5. Optional subtitle or description
6. Optional close button
7. Body content
8. Optional icon or status indicator
9. Optional form fields
10. Optional warning or helper text
11. Footer
12. Primary action
13. Secondary action
14. Optional destructive action

Required:

- Overlay or modal presentation layer
- Dialog container
- Title or accessible label
- Body content
- Close or cancel path unless the flow intentionally blocks exit
- Keyboard focus management

Optional:

- Description
- Close icon button
- Footer
- Actions
- Status icon
- Form fields
- Helper text
- Error text

---

## Variants

### Standard Modal

Use for focused tasks or information.

Examples:

- Add wallet address
- Edit wallet label
- Review details
- Change settings

Token guidance:

- Background: `color.surface.card`
- Scrim: `color.overlay.scrim`
- Radius: `radius.modal.default`
- Shadow: `shadow.overlay.modal`
- Padding: `spacing.modal.padding.desktop`
- Gap: `spacing.modal.gap.default`
- Z-index: `zIndex.overlay.modal`
- Motion: `motion.overlay.enter`

---

### Confirmation Modal

Use when the user must confirm an action.

Examples:

- Remove wallet
- Disconnect wallet
- Reset settings
- Dismiss important suggestion
- Leave flow with unsaved changes

Rules:

- Title should clearly state what is being confirmed.
- Body should explain the consequence.
- Primary action should be specific.
- Secondary action should allow canceling.
- Destructive confirmations should use destructive styling.

Good title examples:

```text
Remove wallet?
Discard changes?
Reset settings?
```

Avoid vague titles:

```text
Are you sure?
Confirm
Warning
```

---

### Destructive Confirmation Modal

Use for actions that remove, disconnect, delete, reset, or discard something.

Examples:

- Remove wallet
- Delete address
- Reset preferences
- Discard onboarding data

Rules:

- Explain what will happen.
- Explain whether the action can be undone.
- Use clear destructive button label.
- Do not use hype, pressure, or fear language.
- Destructive action should not be the only available action.

Good action labels:

```text
Remove wallet
Delete address
Reset settings
Discard changes
```

Avoid:

```text
Yes
Confirm
Do it
Proceed
```

---

### Wallet Connection Modal

Use for wallet connection or wallet selection flows.

Examples:

- Connect Phantom
- Connect Solflare
- Connect Backpack
- Add watch-only address
- Select wallet method

Rules:

- Do not imply custody.
- Do not imply funds will move.
- Clearly separate connected wallet flows from watch-only address flows.
- Explain if signing is required.
- Explain if the action is read-only.
- Provide error and retry states.

Good helper text:

```text
Connect a wallet to view your portfolio. WealthSmith does not take custody of your funds.
```

Watch-only helper text:

```text
Paste a public address to track it in read-only mode.
```

---

### Suggestion Detail Modal

Use when a suggestion card opens more detail.

Examples:

- Why this suggestion appears
- Supporting metrics
- Requirements
- Risk notes
- Next steps

Rules:

- Display suggestion details from structured data.
- Do not generate recommendation logic inside the modal.
- Do not calculate Top Pick or priority inside the modal.
- Keep explanation calm and scannable.
- Provide a clear way to ask Smith AI if supported.

---

### Form Modal

Use when a small form is required inside a modal.

Examples:

- Add wallet label
- Add address
- Edit profile field
- Set monthly savings goal

Rules:

- Keep forms short.
- Use `components/input.md`.
- Show validation clearly.
- Keep submit and cancel actions visible.
- Avoid long multi-step forms inside modals.

---

### Blocking Modal

Use only when the user must address something before continuing.

Examples:

- Critical error
- Required account action
- Unsupported wallet state
- Required confirmation

Rules:

- Use sparingly.
- Explain why the user is blocked.
- Provide a clear next action.
- Avoid trapping users without explanation.

---

### Sheet

Use sheet behavior on mobile when a full modal would feel cramped.

Examples:

- Wallet connection options
- Filters
- Short forms
- Selection menus

Rules:

- On mobile, modals may become bottom sheets or full-screen sheets.
- Sheets should use the same accessibility and focus rules as modals.
- Sheets should not hide critical actions below unreachable areas.

---

## Sizes

### Small

Use for short confirmations and simple messages.

Examples:

- Remove wallet confirmation
- Discard changes
- Short error message

Token guidance:

- Max width: compact modal width from layout implementation
- Padding: `spacing.modal.padding.desktop`
- Radius: `radius.modal.default`

---

### Medium

Default modal size.

Examples:

- Wallet connection
- Add address
- Review suggestion details
- Edit settings

Token guidance:

- Padding: `spacing.modal.padding.desktop`
- Gap: `spacing.modal.gap.default`
- Radius: `radius.modal.default`

---

### Large

Use for richer review flows or detail content.

Examples:

- Detailed suggestion review
- Protocol detail preview
- Multi-section explanation

Rules:

- Use large modals sparingly.
- If content becomes too long, use a page or drawer instead.
- Keep max width readable.

---

### Full-Screen Mobile

Use on mobile when content needs more space.

Examples:

- Wallet connection list
- Multi-field form
- Detailed suggestion review

Rules:

- Keep header and close action accessible.
- Prevent horizontal overflow.
- Keep primary action visible when appropriate.
- Do not trap content behind mobile browser chrome.

---

## States

Modals must support these states.

### Default

Modal is open and ready for interaction.

### Loading

Use when modal content is loading.

Examples:

- Loading wallet options
- Loading suggestion details
- Fetching protocol data

Loading state should:

- Preserve layout where possible
- Avoid fake values
- Communicate that content is loading

### Submitting

Use when the user has triggered the primary action.

Examples:

- Saving changes
- Connecting wallet
- Removing wallet
- Adding address

Submitting state should:

- Prevent duplicate submission
- Show loading feedback
- Keep cancel behavior intentional
- Avoid closing until action outcome is known unless product logic says otherwise

### Error

Use when the modal action fails.

Examples:

- Wallet connection failed
- Address validation failed
- Save failed
- Data load failed

Error state should:

- Explain what happened
- Show how to recover
- Keep user-entered data when possible
- Provide retry when appropriate

### Success

Use when the action completes and confirmation is needed.

Examples:

- Address added
- Wallet renamed
- Settings saved

Success should be calm and brief.

Do not over-celebrate financial actions.

### Disabled

Use for unavailable actions inside the modal.

Disabled reasons should be clear when not obvious.

---

## Overlay and Scrim

Modals should use an overlay scrim to separate the modal from page content.

Token guidance:

- Scrim color: `color.overlay.scrim`
- Z-index: `zIndex.overlay.scrim`
- Modal z-index: `zIndex.overlay.modal`
- Motion: `motion.overlay.scrim`

Rules:

- Scrim should not make text behind the modal feel interactive.
- Clicking outside may close the modal only when dismissal is safe.
- Destructive or important confirmation modals should not rely only on outside click for cancellation.
- Scrim should not hide critical system messages that must remain visible.

---

## Close Behavior

Every non-blocking modal should have a clear close or cancel path.

Allowed close methods:

- Close icon button
- Cancel button
- Escape key
- Safe outside click
- Back action where applicable

Rules:

- Close icon buttons need accessible labels.
- Escape should close non-blocking modals.
- Do not close on outside click if the user may lose unsaved work.
- Confirm before closing if there are unsaved changes.
- Do not trap the user without explanation.

Accessible label example:

```text
aria-label="Close modal"
```

---

## Focus Management

Modals must manage focus accessibly.

Rules:

- Move focus into the modal when it opens.
- Trap keyboard focus inside the modal while open.
- Return focus to the triggering element when the modal closes.
- Focus the first meaningful interactive element or modal title.
- Keep focus visible.
- Support Escape key close when safe.
- Prevent background content from being reachable by keyboard while modal is open.

Do not rely only on visual overlay to block background interaction.

---

## Keyboard Behavior

Required keyboard behavior:

```text
Tab: move to next focusable element inside modal
Shift + Tab: move to previous focusable element inside modal
Escape: close modal when safe
Enter: activate focused button or submit when appropriate
Space: activate focused button
```

For destructive confirmations:

- Enter should not accidentally trigger destructive action unless focus is clearly on that button.
- Default focus should usually start on cancel or modal title, not destructive action.

---

## Token Usage

Modals must use semantic tokens.

Do not hardcode colors, spacing, typography, radius, shadows, motion, or z-index.

### Correct

```text
background: color.surface.card
scrim: color.overlay.scrim
padding: spacing.modal.padding.desktop
gap: spacing.modal.gap.default
title: typography.heading.lg
body: typography.body.md
radius: radius.modal.default
shadow: shadow.overlay.modal
z-index: zIndex.overlay.modal
motion: motion.overlay.enter
```

### Incorrect

```text
background: #FFFFFF
padding: 32px
border-radius: 24px
box-shadow: 0px 16px 40px rgba(0,0,0,0.14)
z-index: 9999
transition: 300ms ease
```

---

## Responsive Behavior

Modals should be mobile-first.

### Mobile

- Use full-width, bottom sheet, or full-screen modal behavior where appropriate.
- Keep content readable.
- Avoid horizontal overflow.
- Keep close action visible.
- Stack actions vertically when needed.
- Ensure touch targets are comfortable.
- Avoid modals that are taller than the usable screen without proper scrolling.

### Tablet

- Use centered modal or sheet depending on content.
- Keep max width readable.
- Keep action area visible.

### Desktop

- Use centered dialog for focused tasks.
- Use natural width, not full screen, unless content requires it.
- Keep body text line length readable.
- Use footer actions aligned consistently.

### Wide

- Do not stretch modals unnecessarily.
- Keep modal content constrained.
- Use large layouts only when the content needs it.

---

## Accessibility

Modals must support accessibility by default.

Requirements:

- Use correct dialog semantics.
- Provide accessible modal title.
- Associate description text where useful.
- Trap focus while open.
- Return focus on close.
- Support keyboard navigation.
- Support Escape close when safe.
- Hide or disable background content from assistive technologies when modal is open.
- Use visible focus states.
- Do not rely on color alone.
- Ensure WCAG AA contrast.
- Respect reduced motion settings.

Recommended semantics:

```text
role="dialog"
aria-modal="true"
aria-labelledby="modal-title"
aria-describedby="modal-description"
```

For destructive confirmations, make the consequence clear in text.

---

## Content Rules

Modal copy should follow WealthSmith voice:

- Clear
- Calm
- Trustworthy
- Beginner-friendly
- Specific
- Non-hype
- Explainable

Modal titles should be short and direct.

Good titles:

```text
Connect wallet
Add wallet address
Review suggestion
Remove wallet?
Discard changes?
```

Avoid vague titles:

```text
Important
Attention
Confirm
Action
Notice
```

Descriptions should explain what the user needs to know.

Good description:

```text
Connect a wallet to view your portfolio. WealthSmith does not take custody of your funds.
```

Avoid:

```text
Connect now to unlock profits.
```

For destructive modals, state the consequence clearly.

Good description:

```text
This removes the wallet from WealthSmith. It does not move funds or affect the wallet itself.
```

Avoid:

```text
Are you sure you want to proceed?
```

---

## Actions

Modals usually have a primary and secondary action.

Examples:

```text
Connect wallet
Add address
Save changes
Remove wallet
Cancel
Dismiss
Try again
```

Action rules:

- Use `components/button.md`.
- Use one primary action.
- Use secondary action for cancel or back.
- Use destructive styling for destructive actions.
- Keep action labels specific.
- Do not use vague labels like “OK” or “Submit” unless context is very clear.
- Do not imply financial execution unless the product supports it.

Button order should be consistent across the product.

Destructive action should not be visually ambiguous.

---

## Wallet and Custody Language

Wallet-related modals must be precise.

Allowed language:

```text
Connect a wallet to view your portfolio.
WealthSmith does not take custody of your funds.
Paste a public address to track it in read-only mode.
This removes the wallet from WealthSmith. It does not affect the wallet itself.
```

Avoid:

```text
Give WealthSmith access to your funds.
Deposit your wallet.
Transfer your assets.
Invest now.
```

Do not imply custody, execution, or signing unless the action actually does that.

---

## Reduced Motion

Modals should respect reduced motion settings.

When reduced motion is enabled:

- Avoid transform-heavy animations.
- Use instant or minimal opacity changes.
- Do not animate large modal movement.
- Keep focus behavior unchanged.

Use:

```text
motion.reducedMotion.default
```

---

## Do

- Use modals for focused tasks or important decisions.
- Use semantic tokens.
- Keep modals short and clear.
- Provide a clear close or cancel path.
- Trap focus while modal is open.
- Return focus after close.
- Use specific action labels.
- Use destructive confirmations for destructive actions.
- Make wallet custody language precise.
- Keep business logic outside the modal.

---

## Do Not

- Do not hardcode raw visual values.
- Do not use z-index values like `9999`.
- Do not use modals for routine page content.
- Do not trap users without explanation.
- Do not hide close controls unless the flow is intentionally blocking.
- Do not close on outside click when unsaved work could be lost.
- Do not put recommendation logic inside modals.
- Do not calculate financial values inside modals.
- Do not use hype-based financial copy.
- Do not imply custody, execution, or investment action unless the product actually supports it.
