# Loading Indicator

Loading indicators communicate that an action, request, or process is actively running.

In WealthSmith, loading indicators may appear while connecting wallets, refreshing portfolio data, saving settings, adding watch-only addresses, loading Smith AI, fetching protocol data, or submitting forms.

Loading indicators should be calm, clear, accessible, and specific about what is happening when the context matters.

---

## Purpose

Use loading indicators when the user needs to know that a process is in progress.

A loading indicator should help users understand:

- The app is working
- An action is being processed
- A request has not failed
- The user should wait before repeating the action
- The process may take a moment
- A specific action is loading, saving, connecting, refreshing, or generating

Loading indicators should reduce uncertainty without adding noise.

---

## Loading Indicator vs Skeleton

Loading indicators and skeletons are different.

### Loading Indicator

Use when a process or action is running.

Examples:

```text
Connecting wallet…
Saving settings…
Refreshing portfolio…
Loading Smith AI…
Generating explanation…
```

### Skeleton

Use when content is loading and the final layout is known.

Examples:

```text
Portfolio cards loading
Asset table rows loading
Chart loading
Suggestion cards loading
Metric cards loading
```

Use `components/skeleton.md` for content placeholders once available.

Use this component for action-level, process-level, and inline loading.

---

## Important Rule

Loading indicators display process state.

Loading indicators do not contain WealthSmith business logic.

A loading indicator can display:

- Spinner
- Progress-like activity indicator
- Loading text
- Button loading state
- Inline loading state
- Full-page loading state
- Smith AI thinking state
- Wallet connection progress
- Refresh progress
- Saving state

A loading indicator must not decide:

- Whether an action is allowed
- Whether wallet connection should succeed
- Whether a signature is required
- Whether portfolio data is valid
- Whether Smith AI should answer
- Whether a recommendation should appear
- Whether a protocol is selected
- Whether a user should invest
- Whether onboarding is complete

Those states must come from product logic, backend state, wallet state, Smith AI orchestration, or parent component state.

The component should render the loading state provided to it.

---

## When to Use

Use a loading indicator when an action or process is active.

Examples:

- Connecting wallet
- Waiting for wallet approval
- Signing request, if supported
- Adding watch-only address
- Saving settings
- Refreshing portfolio
- Fetching prices
- Fetching protocol data
- Loading Smith AI
- Generating Smith AI explanation
- Submitting onboarding step
- Loading app shell
- Retrying a failed request
- Copying or exporting data, if the process is not instant

Loading indicators can appear in:

- Buttons
- Inputs
- Modals
- Alerts
- Toasts
- Empty states
- Page headers
- Sidebars
- Smith AI panel
- Wallet connection flows
- Full-page app initialization
- Inline rows or cards

---

## When Not to Use

Do not use a loading indicator for:

- Content placeholders where skeleton is better
- Determinate progress toward a known target
- Instant actions that complete immediately
- Field validation messages that are already complete
- Empty states
- Error states
- Long-running tasks without explanation
- Decorative motion

Use:

- `components/skeleton.md` for content loading layouts
- `components/progress-bar.md` for measurable progress
- `components/empty-state.md` when loaded content is empty
- `components/alert.md` for persistent errors or warnings
- `components/toast.md` for temporary feedback

Do not show indefinite loading when the process has failed or timed out.

---

## Data Source

Loading indicators should render structured loading state.

Expected data may include:

```text
id
type
label
description
size
status
isLoading
isBlocking
duration
ariaLabel
ariaLive
context
```

The exact schema can evolve.

The component should not invent labels, process state, completion state, or timing.

---

## Anatomy

A loading indicator can include:

1. Visual indicator
2. Optional loading label
3. Optional description
4. Optional container
5. Optional cancel action
6. Optional retry state after failure
7. Optional accessible live region

Required:

- Visual indicator or loading text
- Accessible loading label or context

Optional:

- Description
- Container
- Cancel action
- Status text
- Timeout/error handoff
- Inline placement

Loading indicator meaning should not rely on motion alone.

---

## Variants

### Spinner

Use for small or medium process loading.

Examples:

```text
Loading…
Saving…
Refreshing…
```

Rules:

- Use sparingly.
- Pair with text when the context is not obvious.
- Do not use spinner alone for long or important processes.
- Respect reduced motion.

---

### Inline Loading Indicator

Use inside a row, card, table cell, section, or compact UI area.

Examples:

```text
Refreshing price…
Loading APY…
Checking address…
```

Rules:

- Keep text short.
- Preserve layout where possible.
- Avoid replacing important content with vague loading.
- Use skeleton instead if many content blocks are loading.

---

### Button Loading Indicator

Use when a button action is in progress.

Examples:

```text
Saving…
Connecting…
Adding…
Refreshing…
```

Rules:

- Prevent duplicate submissions when needed.
- Preserve button width where possible.
- Replace or accompany label with loading text.
- Do not use only spinner if the action is not obvious.
- Button should remain accessible.
- Use `components/button.md`.

Good labels:

```text
Saving…
Connecting…
Adding address…
Refreshing…
```

Avoid:

```text
Loading…
```

when a more specific label is available.

---

### Full-Page Loading Indicator

Use when the app or page cannot render meaningful content yet.

Examples:

```text
Loading WealthSmith…
Loading your workspace…
```

Rules:

- Use sparingly.
- Prefer skeletons if page layout is known.
- Provide app-level context.
- Do not leave user on full-page loading indefinitely.
- Move to error state if loading fails.

---

### Modal Loading Indicator

Use when modal content or modal action is loading.

Examples:

```text
Connecting wallet…
Saving changes…
Removing wallet…
```

Rules:

- Keep modal content stable where possible.
- Prevent duplicate primary actions.
- Allow cancel only when it is safe.
- Do not close modal until outcome is known unless parent behavior intentionally does so.
- Use clear recovery if action fails.

---

### Wallet Connection Loading Indicator

Use during wallet connection flows.

Examples:

```text
Connecting wallet…
Waiting for wallet approval…
Opening wallet…
```

Rules:

- Be precise about what is happening.
- Do not imply custody.
- Do not imply funds are moving.
- Do not show signing language unless the action actually requires signing.
- If Ledger or wallet approval is needed, parent logic should provide appropriate message.
- If connection fails, transition to error state.

Allowed:

```text
Connecting wallet…
Waiting for wallet approval…
```

Avoid:

```text
Accessing your funds…
Securing your assets…
Moving funds…
```

---

### Watch-Only Address Loading Indicator

Use when adding or validating a public address.

Examples:

```text
Checking address…
Adding watch-only address…
Loading public wallet data…
```

Rules:

- Make read-only behavior clear when needed.
- Do not imply ownership.
- Do not imply signing.
- Do not imply custody.

Good:

```text
Loading public wallet data…
```

Avoid:

```text
Connecting to your funds…
```

---

### Portfolio Refresh Loading Indicator

Use when portfolio or price data is refreshing.

Examples:

```text
Refreshing portfolio…
Updating prices…
Fetching protocol data…
```

Rules:

- Do not show fake refreshed values.
- Keep stale values visible if product behavior supports stale-while-refresh.
- Use stale label if data may be outdated.
- Move to error state if refresh fails.

---

### Smith AI Loading Indicator

Use when Smith AI is loading, thinking, or generating.

Examples:

```text
Smith AI is thinking…
Generating explanation…
Loading context…
```

Rules:

- Keep tone calm.
- Do not imply finality or guaranteed correctness.
- Do not use magical language.
- During onboarding, Smith AI remains open.
- Loading indicator does not generate Smith AI reasoning.
- Parent Smith AI orchestration controls the state.

Allowed:

```text
Smith AI is thinking…
Generating explanation…
Loading context…
```

Avoid:

```text
Finding the best investment…
Guaranteeing the answer…
AI magic in progress…
```

---

### Determinate Loading Indicator

Use only when progress is measurable but a full progress bar is not necessary.

Examples:

```text
3 of 6 sources loaded
```

Rules:

- Use `components/progress-bar.md` if visual progress toward a known target is useful.
- Do not invent progress counts.
- Do not show fake progress.

---

## Sizes

### Small

Use inside buttons, inputs, table cells, and compact rows.

Rules:

- Pair with accessible label.
- Do not rely on tiny spinner alone.

### Medium

Default size.

Use inside cards, modals, alerts, and sections.

### Large

Use for page-level loading or major process loading.

Rules:

- Use with clear text.
- Do not use large spinner for short actions.
- Consider skeletons for full page content loading.

---

## States

Loading indicators may support these states.

### Loading

Process is active.

### Blocking

Process prevents the user from continuing.

Examples:

```text
Submitting onboarding step…
Connecting wallet…
```

Rules:

- Explain what is happening.
- Prevent duplicate actions.
- Avoid trapping user without explanation.

### Non-Blocking

Process runs while user can continue.

Examples:

```text
Refreshing portfolio…
Updating prices…
```

Rules:

- Do not block unrelated UI.
- Preserve existing content when possible.

### Timeout

Process has taken longer than expected.

Example:

```text
This is taking longer than expected.
```

Rules:

- Show recovery path where useful.
- Do not spin indefinitely without explanation.
- Parent logic decides timeout.

### Error Handoff

Process failed and UI moves from loading to error.

Examples:

```text
Could not connect wallet.
Could not refresh portfolio.
```

Rules:

- Use `components/alert.md` or parent error state.
- Do not keep spinner visible after failure.

### Success Handoff

Process completed and UI moves to success or updated state.

Examples:

```text
Wallet connected.
Settings saved.
```

Rules:

- Use `components/toast.md` for temporary success when appropriate.
- Do not over-celebrate financial states.

---

## Token Usage

Loading indicators must use semantic tokens.

Do not hardcode colors, spacing, typography, radius, shadows, motion, or z-index.

### Correct

```text
indicator color: color.action.primary.background.default
text: color.text.primary
secondary text: color.text.secondary
label: typography.body.sm
description: typography.body.sm
gap: spacing.inline.gap.sm
container gap: spacing.stack.gap.sm
motion: motion.loading.spinner
reduced motion: motion.reducedMotion.default
```

If `motion.loading.spinner` is not yet defined, use the approved motion token closest to loading behavior and define component-level motion later.

### Incorrect

```text
color: #003DFF
font-size: 14px
gap: 8px
animation: spin 1s linear infinite
```

---

## Motion

Loading indicators usually rely on motion, so reduced motion support is required.

Rules:

- Respect reduced motion settings.
- Avoid aggressive spinning or pulsing.
- Do not animate large areas.
- Keep animation calm and predictable.
- Use non-motion text fallback where possible.
- Do not use loading animation as decoration.

Reduced motion behavior:

```text
Show static indicator plus loading text.
```

---

## Responsive Behavior

Loading indicators should be mobile-first.

### Mobile

- Keep loading text short.
- Avoid blocking full screen unless necessary.
- Use comfortable spacing.
- Do not cover mobile navigation.
- Do not cover Smith AI input.
- Keep modal loading states readable.

### Tablet

- Use inline or section-level loading where possible.
- Avoid unnecessary full-page loading.

### Desktop

- Use button, inline, section, or page-level loading depending on scope.
- Avoid large spinners for small actions.
- Keep loading state visually connected to the affected area.

### Wide

- Do not stretch loading containers unnecessarily.
- Keep loading state close to the content or action it belongs to.

---

## Accessibility

Loading indicators must support accessibility by default.

Requirements:

- Loading state must be available to assistive technologies.
- Use clear accessible labels.
- Do not rely on animation alone.
- Respect reduced motion.
- Do not steal focus for routine loading states.
- Blocking loading states should be communicated.
- Buttons in loading state should communicate busy state.
- Do not trap keyboard users without explanation.
- Contrast must meet WCAG AA.

Recommended attributes:

```text
aria-busy="true"
aria-live="polite"
role="status"
```

For button loading:

```text
aria-busy="true"
disabled or aria-disabled="true"
```

Use assertive announcements only for urgent state changes.

---

## Keyboard Behavior

Loading indicators are usually not interactive.

Rules:

- Do not place focus on a spinner.
- If a cancel action exists, it must be keyboard accessible.
- If loading disables a button, focus behavior should remain logical.
- Do not remove focused elements abruptly unless product behavior handles focus recovery.
- If loading occurs after submit, keep focus stable or move focus intentionally to the next state.

---

## Content Rules

Loading copy should follow WealthSmith voice:

- Clear
- Calm
- Specific
- Brief
- Non-hype

Good loading labels:

```text
Loading…
Saving…
Connecting wallet…
Waiting for wallet approval…
Adding watch-only address…
Refreshing portfolio…
Fetching protocol data…
Smith AI is thinking…
Generating explanation…
```

Better than generic loading:

```text
Refreshing portfolio…
```

instead of:

```text
Loading…
```

Avoid vague or hype-based loading labels:

```text
Working magic…
Finding profits…
Optimizing wealth…
Guaranteeing results…
```

---

## Financial and Wallet Language Rules

Loading copy must be precise.

Allowed:

```text
Connecting wallet
Waiting for wallet approval
Loading public wallet data
Refreshing portfolio
Fetching protocol data
Updating estimated values
Generating explanation
```

Avoid:

```text
Accessing your funds
Moving your assets
Securing your money
Guaranteeing returns
Finding best investment
Profit loading
```

Do not imply WealthSmith can move funds, sign transactions, or execute financial actions unless the product actually supports that action and the flow clearly explains it.

Do not imply wallet connection gives WealthSmith custody.

---

## Smith AI Rules

Smith AI loading indicators should be calm and trustworthy.

Allowed:

```text
Smith AI is thinking…
Generating explanation…
Loading context…
```

Rules:

- Loading indicator does not generate Smith AI content.
- Smith AI orchestration controls loading state.
- During onboarding, Smith AI remains open.
- Do not use loading text that implies financial certainty.
- Do not hide required onboarding instructions behind loading state.

Avoid:

```text
Smith AI is finding the best investment…
Smith AI is guaranteeing your answer…
```

---

## Wallet and Ledger Rules

Wallet loading indicators should account for external wallet approval states.

Allowed messages:

```text
Opening wallet…
Waiting for wallet approval…
Check your wallet to continue.
Connecting wallet…
```

Rules:

- Only mention signing if the flow actually requires signing.
- Only mention Ledger if parent wallet state identifies Ledger context.
- Do not imply the app can force wallet approval.
- Do not imply custody.
- If approval does not appear, parent error/help flow should explain recovery.

---

## Validation and State Rules

Loading state belongs outside the component.

The loading indicator may display:

- Loading state
- Blocking state
- Non-blocking state
- Label
- Description
- Size
- Context
- Timeout state
- Error handoff

The loading indicator must not decide:

- Whether loading should start
- Whether loading has completed
- Whether action succeeded
- Whether action failed
- Whether wallet approval is required
- Whether Smith AI should answer
- Whether portfolio data is valid
- Whether a financial action should proceed

---

## Do

- Use loading indicators for active processes and actions.
- Use skeletons for content placeholders.
- Use semantic tokens.
- Keep loading copy specific.
- Pair spinners with text when context matters.
- Prevent duplicate submissions when needed.
- Respect reduced motion.
- Communicate loading state accessibly.
- Use precise wallet and Smith AI language.
- Move to success, error, or updated state when loading finishes.
- Keep product logic outside the component.

---

## Do Not

- Do not show indefinite loading after failure.
- Do not use loading indicators for empty states.
- Do not use spinners where skeletons are better.
- Do not show fake progress.
- Do not rely on animation alone.
- Do not use hype-based loading copy.
- Do not imply guaranteed returns.
- Do not imply custody, execution, or investment action unless the product actually supports it.
- Do not invent loading state or completion state.
- Do not hardcode raw visual values.
