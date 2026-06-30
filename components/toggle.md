# Toggle

Toggles let users turn a single setting on or off.

In WealthSmith, toggles may be used for preferences, visibility settings, notification settings, display options, and optional product behavior.

Toggles should be clear, immediate, accessible, and easy to understand.

---

## Purpose

Use toggles when a setting has two possible states:

- On
- Off

A toggle should help users control:

- Preferences
- Display settings
- Optional visibility
- Notification settings
- Privacy-related options
- Dashboard display choices
- Assistant behavior preferences where supported

Toggles should feel simple and predictable.

---

## Important Rule

Toggles control a binary setting.

Toggles do not contain WealthSmith business logic.

A toggle can display:

- On state
- Off state
- Disabled state
- Loading state
- Error state
- Label
- Helper text
- Current setting state

A toggle must not decide:

- Whether a user should invest
- Whether a suggestion appears
- Whether a suggestion is Top Pick
- Whether a wallet is eligible
- Whether a protocol is suitable
- Whether risk is acceptable
- Whether onboarding is complete
- Whether estimated values are reliable
- Whether Smith AI should generate a recommendation

Those decisions must come from product logic, backend rules, deterministic rules, or user preferences provided to the component.

The component should render and update the toggle state provided to it.

---

## When to Use

Use a toggle when a setting is binary and changes immediately or near-immediately.

Examples:

```text
Show estimated values
Include watch-only wallets
Enable notifications
Show small balances
Use compact view
Keep Smith AI open on desktop
Include staked assets
```

Use toggles when:

- The setting is independent
- The result is easy to understand
- The user does not need to submit a form to apply the change
- The setting can be turned on and off

---

## When Not to Use

Do not use toggles for:

- Choosing one option from many
- Selecting multiple options
- Confirming destructive actions
- Confirming financial execution
- Accepting critical disclosures
- Navigation
- Primary call-to-action buttons
- Settings that need explanation before activation
- Irreversible actions

Use:

- `components/checkbox.md` for multi-select choices or acknowledgements
- `components/select-menu.md` for choosing one item from a list
- `components/button.md` for actions
- `components/modal.md` for confirmations
- `components/select-card.md` for richer choice selection

---

## Data Source

Toggles should render structured state.

Expected data may include:

```text
id
name
label
checked
disabled
required
status
helperText
errorMessage
loading
ariaLabel
onChange
```

The exact schema can evolve.

The component should not invent labels, setting states, disabled states, or validation results.

---

## Anatomy

A toggle can include:

1. Toggle control
2. Thumb
3. Track
4. Label
5. Optional helper text
6. Optional status text
7. Optional error text
8. Optional loading indicator
9. Optional icon where needed

Required:

- Toggle control
- Label or accessible label
- Visible on/off state
- Visible focus state

Optional:

- Helper text
- Status text
- Error text
- Loading state
- Icon

The clickable area should include both the control and label where appropriate.

---

## Variants

### Standard Toggle

Use for normal settings.

Examples:

```text
Show estimated values
Include watch-only wallets
Use compact view
```

Rules:

- Use when the setting has clear on/off meaning.
- Keep label short.
- Use helper text if the setting affects displayed data.

---

### Settings Toggle

Use inside settings screens or preferences panels.

Examples:

```text
Enable email notifications
Keep Smith AI open on desktop
Show small balances
```

Rules:

- Label should describe the enabled state.
- Helper text should clarify impact when needed.
- Changes may save immediately or show loading state while saving.

Good label:

```text
Show small balances
```

Avoid:

```text
Small balances
```

---

### Display Toggle

Use when changing how information appears.

Examples:

```text
Show estimated values
Include staked assets
Hide zero balances
Use compact view
```

Rules:

- The toggle controls presentation only.
- It must not calculate or reinterpret values.
- If values are hidden, user should understand what changed.

---

### Data-Inclusion Toggle

Use when the user controls whether certain data is included in a view.

Examples:

```text
Include watch-only wallets
Include staked assets
Show unavailable prices
```

Rules:

- Product logic decides what data belongs to each category.
- Toggle only controls inclusion state.
- Do not imply ownership or custody.

---

### Smith AI Preference Toggle

Use for optional Smith AI display behavior outside onboarding.

Examples:

```text
Keep Smith AI open on desktop
Show Smith AI suggestions
```

Rules:

- Outside onboarding, Smith AI may be toggleable.
- During onboarding, Smith AI must remain open regardless of this toggle.
- The toggle must not control Smith AI reasoning.
- The toggle only controls UI preference where product behavior supports it.

Important:

```text
During onboarding, Smith AI is always open.
```

---

## Sizes

### Small

Use only in dense settings, tables, or compact rows.

Rules:

- Maintain accessible tap target.
- Label text must remain readable.

### Medium

Default toggle size.

Use in settings, onboarding preferences, filters, and dashboard display options.

### Large

Use sparingly.

Consider `components/select-card.md` when the choice needs richer explanation.

---

## States

Toggles must support these states.

### Off

The setting is disabled.

### On

The setting is enabled.

### Hover

Indicates interactivity for pointer users.

### Focus

Required for keyboard users.

Use visible focus styling.

### Disabled

Use when the setting is unavailable.

Rules:

- Disabled reason should be clear if not obvious.
- Disabled toggle should remain readable.
- Do not hide important unavailable options.

### Loading

Use while a setting update is being saved or applied.

Examples:

- Saving notification setting
- Updating display preference
- Applying wallet inclusion preference

Rules:

- Prevent rapid repeated changes if needed.
- Preserve previous state until update succeeds, unless optimistic UI is intentionally supported.
- Do not show fake success while loading.

### Error

Use when the setting fails to update.

Example:

```text
Could not update this setting. Try again.
```

Rules:

- Show clear recovery.
- Preserve or restore correct state.
- Do not leave state visually inconsistent with actual saved value.

---

## Token Usage

Toggles must use semantic tokens.

Do not hardcode colors, spacing, typography, radius, shadows, or motion.

### Correct

```text
label: typography.body.sm
helper text: typography.body.sm
track off: color.disabled.background.default
track on: color.action.primary.background.default
thumb: color.surface.card
text: color.text.primary
secondary text: color.text.secondary
focus: shadow.control.focus
radius: radius.control.pill
motion: motion.interaction.hover
```

### Incorrect

```text
background: #003DFF
border-radius: 999px
font-size: 14px
transition: 200ms ease
box-shadow: 0 0 0 4px rgba(0,0,255,0.2)
```

---

## Responsive Behavior

Toggles should be mobile-first.

### Mobile

- Keep tap targets comfortable.
- Make the label area tappable where appropriate.
- Use stacked label and helper text when needed.
- Avoid tiny toggles.
- Avoid placing too many toggles in a cramped area.

### Tablet

- Toggles may appear in settings rows or filter panels.
- Preserve spacing between label and control.

### Desktop

- Toggles may appear in settings pages, side panels, tables, or filters.
- Align toggles consistently in repeated rows.
- Keep helper text close to the label.

### Wide

- Do not stretch toggle rows unnecessarily.
- Keep label, helper text, and control visually connected.

---

## Accessibility

Toggles must support accessibility by default.

Requirements:

- Use native checkbox semantics styled as a switch, or accessible switch behavior.
- Label must be programmatically associated with the toggle.
- Keyboard support required.
- Visible focus state required.
- Screen readers must understand on/off state.
- Disabled, loading, and error states must be communicated where relevant.
- Do not rely on color alone.
- Contrast must meet WCAG AA.
- Label area should be clickable/tappable where appropriate.

Recommended semantics:

```text
role="switch"
aria-checked="true"
aria-describedby="helper-or-error-id"
```

Native checkbox styled as switch is also acceptable when accessibility is preserved.

---

## Keyboard Behavior

Required keyboard behavior:

```text
Tab: move focus to toggle
Space: toggle on/off
Shift + Tab: move focus backward
```

Optional behavior:

```text
Enter: may toggle if implementation supports it consistently
```

Rules:

- Focus should remain predictable.
- Disabled toggles should not be interactive.
- Loading toggles should prevent duplicate updates when needed.

---

## Content Rules

Toggle labels should describe the enabled state.

Good labels:

```text
Show estimated values
Include watch-only wallets
Include staked assets
Hide zero balances
Use compact view
Keep Smith AI open on desktop
Enable notifications
```

Avoid vague labels:

```text
On
Off
Yes
No
Estimated
Watch-only
AI
```

Good helper text:

```text
Estimated values may change as prices or protocol data update.
```

```text
Watch-only wallets use public address data and cannot sign transactions.
```

```text
During onboarding, Smith AI stays open to guide setup.
```

Avoid hype:

```text
Turn on to unlock more profit.
```

```text
Enable for the best returns.
```

---

## Financial and Wallet Language Rules

Toggle copy must be precise.

Allowed:

```text
Estimated
May change
Public wallet data
Read-only
Connected wallet
Watch-only wallet
Display preference
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

## Validation and Save Behavior

Toggle validation and persistence belong outside the component.

The toggle component may display:

- Current state
- Loading state
- Error state
- Disabled state
- Helper text
- Retry action where supported

The toggle component must not decide:

- Whether the setting is allowed
- Whether the user is eligible
- Whether turning it on is financially appropriate
- Whether the state should override onboarding logic

Important onboarding rule:

```text
Smith AI remains open during onboarding even if a user preference would normally allow closing it.
```

---

## Do

- Use toggles for clear binary settings.
- Use semantic tokens.
- Make the label clear.
- Describe the enabled state.
- Support keyboard interaction.
- Communicate on/off state accessibly.
- Show loading and error states when settings are saved.
- Use precise wallet and estimate language.
- Keep Smith AI always open during onboarding.
- Keep product logic outside the component.

---

## Do Not

- Do not use toggles for destructive actions.
- Do not use toggles for financial execution.
- Do not use toggles for multi-select options.
- Do not use toggles when the setting needs a submit button.
- Do not hide critical warnings behind a toggle.
- Do not calculate product logic inside the component.
- Do not invent setting states.
- Do not use vague labels like “On” or “AI”.
- Do not use hype-based financial copy.
- Do not imply guaranteed returns.
- Do not imply custody, execution, or investment action unless the product actually supports it.
- Do not hardcode raw visual values.
