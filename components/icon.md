# Icon

Icons are small visual symbols that support meaning, navigation, status, actions, assets, tokens, protocols, and wallet-related UI.

In WealthSmith, icons may appear in buttons, menus, inputs, cards, tables, charts, badges, alerts, empty states, wallet rows, token rows, protocol rows, sidebars, and Smith AI interfaces.

Icons should clarify the interface, not replace readable text.

---

## Purpose

Use icons to support recognition and reduce visual scanning effort.

An icon should help users understand:

- A common action
- A navigation item
- A token or asset
- A protocol or platform
- A wallet or address
- A status or feedback state
- A section type
- An empty/loading/error context
- An external link or utility action

Icons should support meaning, not be the only source of meaning.

---

## Important Rule

Icons support meaning.

Icons are never the only source of meaning when the meaning is important.

An icon can display:

- UI action symbol
- Navigation symbol
- Token icon
- Protocol icon
- Wallet icon
- Status icon
- Empty state icon
- Decorative symbol
- Loading/supporting symbol

An icon must not decide:

- Which token is recommended
- Which protocol is recommended
- Whether a wallet is valid
- Whether a token is supported
- Whether a suggestion should appear
- Whether a user should invest
- Whether a status is success, warning, or error
- Whether an action is available
- Whether Smith AI should answer

Those decisions must come from product logic, backend data, deterministic rules, parent state, or component props.

The icon component should render the icon requested by parent state.

---

## SVG Storage Rule

Do not store full SVG code in `components/icon.md`.

This file defines icon usage rules.

Actual SVG files should live in:

```text
assets/icons/
```

Recommended structure:

```text
assets/icons/ui/
assets/icons/token/
assets/icons/protocol/
assets/icons/wallet/
assets/icons/status/
assets/icons/brand/
```

Recommended registry:

```text
assets/icons/icon-registry.json
```

The registry should map approved icon names to asset paths, category, default size, fallback, and accessibility requirements.

Example registry shape:

```json
{
  "wallet": {
    "category": "ui",
    "path": "assets/icons/ui/wallet.svg",
    "defaultSize": "md",
    "meaning": "Wallet connection or wallet section"
  },
  "sol": {
    "category": "token",
    "path": "assets/icons/token/sol.svg",
    "fallback": "assets/icons/token/fallback-token.svg",
    "labelRequired": true
  }
}
```

---

## Icon Categories

### UI Icons

Use for product actions and navigation.

Examples:

```text
wallet
search
chevron-down
chevron-up
info
alert
check
close
refresh
settings
external-link
copy
filter
sort
more-horizontal
menu
arrow-left
arrow-right
```

Rules:

- Use for common interface actions.
- Meaning must be clear from surrounding label or accessible label.
- Use consistent icon for repeated actions.
- Do not use multiple icons for the same action without reason.

---

### Token Icons

Use for crypto assets and tokens.

Examples:

```text
SOL
USDC
BONK
BTC
ETH
```

Rules:

- Token icon alone is not enough.
- Always show token symbol or token name near the icon.
- Use fallback token icon when asset icon is missing.
- Never show broken images.
- Do not infer token identity from icon alone.
- Do not recommend tokens through icon emphasis.
- Do not use token icon color as the only token identifier.

Good:

```text
[icon] SOL
[icon] USDC
```

Bad:

```text
[icon only]
```

---

### Protocol Icons

Use for protocols, platforms, or DeFi venues.

Examples:

```text
Kamino
Jupiter
Orca
Hubble
Marinade
Jito
```

Rules:

- Protocol icon alone is not enough.
- Always show protocol name near the icon when the protocol identity matters.
- Use fallback protocol icon when protocol icon is missing.
- Never show broken images.
- Do not infer protocol recommendation from icon.
- Do not use protocol icon to imply endorsement unless product logic explicitly marks it.

---

### Wallet Icons

Use for wallet providers and wallet states.

Examples:

```text
Phantom
Solflare
Backpack
Ledger
Wallet
Watch-only address
```

Rules:

- Wallet icon should be paired with wallet/provider name when identity matters.
- Use fallback wallet icon when provider icon is missing.
- Do not imply wallet ownership from icon alone.
- Do not imply custody.
- Do not imply signing unless the action actually requires signing.
- Watch-only address icon must not look like a connected/custodial wallet.

---

### Status Icons

Use for success, info, warning, error, blocked, and pending states.

Examples:

```text
check
info
alert
warning
error
clock
spinner
```

Rules:

- Status icon must be paired with text or accessible label.
- Do not rely on color alone.
- Use semantic feedback tokens.
- Do not show warning/error icons unless parent state provides that status.
- Do not invent status.

---

### Navigation Icons

Use in sidebar, menus, tabs, or nav items.

Examples:

```text
dashboard
portfolio
suggestions
wallets
settings
help
```

Rules:

- Navigation icons should support labels.
- Do not use icon-only navigation unless labels are available through tooltip and accessible names.
- Active state must not rely only on icon color.

---

### Decorative Icons

Use for visual support only.

Examples:

```text
empty state illustration icon
subtle background icon
section support icon
```

Rules:

- Decorative icons should be hidden from assistive technologies.
- Decorative icons must not carry required meaning.
- Keep decorative icons calm and non-distracting.
- Avoid overly playful visuals in financial contexts.

---

## When to Use

Use icons when they improve recognition or scanning.

Examples:

- Button leading icon
- Icon-only button with accessible label
- Input search icon
- Wallet connection row
- Token table row
- Protocol row
- Status badge
- Alert icon
- Empty state icon
- Sidebar navigation
- Menu item icon
- External link indicator
- Copy action
- Refresh action
- Chart legend support
- Smith AI trigger

---

## When Not to Use

Do not use icons when they add clutter or ambiguity.

Avoid icons for:

- Dense text paragraphs
- Every table cell
- Every badge
- Pure decoration on critical financial flows
- Complex concepts that need explanation
- Status without text
- Token identity without symbol/name
- Protocol identity without name
- Actions without accessible labels

Use text when icon meaning is unclear.

---

## Data Source

Icon usage should render from structured data or approved component props.

Expected icon data may include:

```text
name
category
label
title
description
size
color
decorative
fallback
ariaLabel
```

Token/protocol icon data may include:

```text
symbol
name
iconPath
fallbackIconPath
labelRequired
```

The exact schema can evolve.

The component should not invent icon names, token symbols, protocol identities, or fallback behavior.

---

## Anatomy

An icon can include:

1. SVG or icon asset
2. Optional visible label outside the icon
3. Optional accessible label
4. Optional fallback asset
5. Optional decorative state
6. Optional size
7. Optional color token

Required:

- Approved icon asset or approved fallback
- Accessible behavior
- Consistent sizing

Optional:

- Visible label
- Accessible label
- Tooltip when icon-only
- Status text
- Fallback state

---

## Icon Sizes

Icons should use approved size tokens.

Recommended sizes:

```text
xs: 12px
sm: 16px
md: 20px
lg: 24px
xl: 32px
```

Usage:

```text
xs: dense metadata or tiny status support
sm: input icons, compact menu icons
md: default UI icons
lg: card/header/action icons
xl: empty state or prominent section icons
```

Rules:

- Do not invent arbitrary icon sizes.
- Use consistent sizes inside repeated components.
- Do not make icons larger than the text hierarchy requires.
- Touch targets are controlled by parent components, not icon size alone.

---

## Stroke and Fill

UI icons should use a consistent visual style.

Rules:

- UI icons should generally use the approved stroke/fill system.
- Do not mix outline and filled styles randomly.
- Token and protocol icons may use brand-provided SVG colors.
- UI icon color should usually come from semantic color tokens.
- Do not recolor token/protocol icons unless brand rules allow it.
- Do not distort SVG proportions.
- Do not stretch icons.

Recommended UI icon behavior:

```text
stroke: currentColor
fill: none or currentColor depending on icon set
```

Token/protocol behavior:

```text
Use original asset colors unless product rules require neutral fallback.
```

---

## Color Usage

Icons must use semantic color tokens.

### UI Icons

Use semantic tokens such as:

```text
color.icon.default
color.icon.subtle
color.icon.disabled
color.action.primary.background.default
color.feedback.success.icon
color.feedback.warning.icon
color.feedback.error.icon
```

If dedicated icon semantic tokens do not exist yet, use the closest approved text/action/feedback token.

### Token and Protocol Icons

Use original SVG where appropriate.

Rules:

- Do not recolor official token/protocol icons unless required.
- Keep label text visible.
- Do not rely on icon color alone.
- Use fallback icons when official icon is missing.

### Status Icons

Use feedback tokens only when status is provided by parent state.

Examples:

```text
success: color.feedback.success.icon
warning: color.feedback.warning.icon
error: color.feedback.error.icon
info: color.feedback.info.icon
```

---

## Fallback Behavior

Icons must fail safely.

### Missing UI Icon

If a requested UI icon does not exist:

- Use approved generic fallback only if appropriate.
- Otherwise render no icon and preserve layout.
- Never show broken image.
- Log/report missing icon in development.

### Missing Token Icon

Use:

```text
assets/icons/token/fallback-token.svg
```

Rules:

- Still show token symbol/name.
- Do not hide token row.
- Do not show broken image.
- Do not guess token identity from similar icon.

### Missing Protocol Icon

Use:

```text
assets/icons/protocol/fallback-protocol.svg
```

Rules:

- Still show protocol name.
- Do not hide protocol row.
- Do not imply unsupported protocol unless parent state says so.

### Missing Wallet Icon

Use:

```text
assets/icons/wallet/fallback-wallet.svg
```

Rules:

- Still show wallet/provider name or address label.
- Do not imply ownership or connection from fallback icon.

---

## Icon-Only Buttons

Icon-only buttons must be accessible.

Examples:

```text
Close
Refresh
Copy
Open menu
Search
Ask Smith AI
```

Rules:

- Use `components/button.md` icon-button variant.
- Provide accessible label.
- Provide tooltip when helpful.
- Hit target must meet touch target requirements.
- Do not rely on icon alone.
- Disabled state must be clear.
- Loading state should use `components/loading-indicator.md`.

Good accessible labels:

```text
Close dialog
Refresh portfolio
Copy wallet address
Open actions menu
Ask Smith AI
```

Bad:

```text
Button
Icon
Click
```

---

## Icons in Buttons

Icons may appear before or after button labels.

Rules:

- Leading icon supports action category.
- Trailing icon may show external link, chevron, or continuation.
- Do not use icons that conflict with action meaning.
- Button text remains primary.
- Icon-only button must have accessible label.
- Button icons inherit the button text/foreground color by default
  (`currentColor`), unless a component spec explicitly overrides them.
- Enabled buttons: the icon matches the button text color (e.g. the action
  color). Disabled/locked/unavailable buttons: the icon uses the disabled
  foreground color.
- The external-link trailing icon on a protocol handoff CTA indicates the
  external destination and uses the CTA's primary action color while
  enabled. See `components/suggestion-card.md` (Icons) and
  `components/button.md` (Button Icons).
- An icon asset with a fixed fill/stroke must be applied so it follows the
  button color (via `currentColor` or a mask); do not leave it as its raw
  file color.

Examples:

```text
[wallet] Connect wallet
Refresh [refresh]
Learn more [external-link]
```

---

## Icons in Inputs

Icons may appear inside inputs.

Examples:

```text
search icon in search field
wallet icon in address field
error icon in invalid field
```

Rules:

- Input icons should not replace labels.
- Decorative input icons should be hidden from screen readers.
- Error icons must be paired with error text.
- Icons should not reduce text readability.
- Use `components/input.md` rules.

---

## Icons in Tables and Lists

Icons may appear in rows to support identity or status.

Examples:

```text
Token icon + token symbol
Protocol icon + protocol name
Wallet icon + wallet label
Status icon + status text
```

Rules:

- Do not use icon-only identity.
- Always show readable symbol/name when identity matters.
- Use fallback icons.
- Keep row height consistent.
- Do not let missing icons shift layout unexpectedly.

---

## Icons in Charts

Icons should be used carefully in charts.

Allowed:

- Legend support icon
- Token icon near legend label
- Protocol icon near label

Rules:

- Chart must remain readable without icons.
- Do not use icons as the only chart labels.
- Token/protocol icons in legends still need text.
- Missing icons should fall back safely.
- Do not overcrowd charts with icons.

Use `components/chart.md` for chart behavior.

---

## Icons in Alerts and Empty States

Icons may support alerts and empty states.

Rules:

- Icon should match the message type.
- Icon must not be the only signal.
- Warning/error must include text.
- Empty state icon should be calm and supportive.
- Do not use playful or gamified visuals for serious financial states.

Use:

```text
components/alert.md
components/empty-state.md
```

---

## Icons in Smith AI

Icons may represent Smith AI entry points or assistant context.

Rules:

- Smith AI icon should not imply autonomous execution.
- Smith AI icon should not imply guaranteed correctness.
- Use label such as `Ask Smith AI` when possible.
- During onboarding, Smith AI remains open.
- Do not use icon-only Smith AI actions unless accessible label and tooltip exist.

Avoid:

```text
AI will pick the best investment
```

---

## States

Icons may support these visual states.

### Default

Standard icon state.

### Hover

Controlled by parent interactive component.

### Active

Controlled by parent interactive component.

### Selected

Controlled by parent interactive component.

### Disabled

Use disabled token.

### Loading

Use loading indicator, not a static icon pretending to load.

### Error / Warning / Success

Use status icon only when parent state provides that status.

Rules:

- Icon component does not determine state.
- Parent component controls state.

---

## Token Usage

Icons must use semantic tokens.

Do not hardcode color, size, spacing, stroke, fill, or opacity values.

### Correct

```text
size: icon.size.md
color: color.icon.default
disabled: color.icon.disabled
success: color.feedback.success.icon
warning: color.feedback.warning.icon
error: color.feedback.error.icon
gap with label: spacing.inline.gap.sm
```

If `icon.size.*` tokens do not exist yet, define them in component tokens or map to approved sizing tokens.

### Incorrect

```text
width: 20px
height: 20px
color: #121212
stroke: #003DFF
margin-right: 8px
opacity: 0.4
```

---

## Responsive Behavior

Icons should be responsive to context, not arbitrary breakpoints.

### Mobile

- Do not rely on icon-only navigation unless accessible labels are available.
- Use comfortable touch targets through parent components.
- Avoid tiny status icons without text.
- Token/protocol rows must show text labels.
- Avoid overcrowding page headers with icons.

### Tablet

- Icons may support labels and grouped actions.
- Keep size consistent.

### Desktop

- Icons may appear in sidebars, menus, page headers, tables, and chart legends.
- Hover states are allowed when parent component supports them.

### Wide

- Do not increase icon size only because the viewport is wide.
- Preserve alignment with text and grid.

---

## Accessibility

Icons must support accessibility by default.

Requirements:

- Decorative icons should be hidden from assistive technologies.
- Meaningful icons need accessible labels or nearby text.
- Icon-only buttons must have accessible labels.
- Do not rely on color alone.
- Status icons must be paired with status text.
- Token and protocol icons must be paired with symbol/name.
- Contrast must meet WCAG AA when icon conveys meaning.
- Icons must not be focusable unless the icon itself is part of an interactive control.
- SVGs should not create duplicate announcements.

Recommended decorative SVG:

```text
aria-hidden="true"
focusable="false"
```

Recommended icon-only button:

```text
aria-label="Refresh portfolio"
```

Recommended meaningful icon with visible text:

```text
Icon aria-hidden="true"
Visible text: Refresh portfolio
```

---

## Keyboard Behavior

Icons themselves are usually not interactive.

Rules:

- Do not make standalone icons focusable.
- Parent button/link/menu item handles keyboard behavior.
- Icon-only buttons must follow `components/button.md`.
- Menu icons must follow `components/menu-item.md`.
- Do not trap focus on SVG elements.
- Do not create keyboard-only hidden actions through icons.

---

## Asset Quality Rules

SVG assets should be clean and implementation-ready.

Rules:

- SVG viewBox must be present.
- SVG should scale cleanly.
- Remove unnecessary metadata.
- Avoid embedded raster images unless required.
- Avoid hardcoded colors for UI icons.
- Preserve official colors for token/protocol icons unless product rules say otherwise.
- Use consistent naming.
- Use kebab-case filenames.
- Do not include unsafe scripts or external references inside SVG files.
- Do not use low-quality or blurry icons.

Good filenames:

```text
chevron-down.svg
external-link.svg
fallback-token.svg
phantom.svg
jupiter.svg
sol.svg
```

Avoid:

```text
Icon Final 2.svg
newicon.svg
blue-wallet-copy.svg
```

---

## Naming Rules

Icon names should be stable and descriptive.

Rules:

- Use kebab-case.
- Use action-oriented names for actions.
- Use product/provider/token symbol names for known assets.
- Avoid duplicate names.
- Avoid visual-only names when meaning matters.

Good:

```text
wallet
watch-only
chevron-down
external-link
copy
refresh
fallback-token
fallback-protocol
```

Avoid:

```text
blue-circle
nice-arrow
icon-1
new-wallet
```

---

## Icon Registry Rules

Use `assets/icons/icon-registry.json` to make icons machine-readable.

Recommended fields:

```text
name
category
path
fallback
defaultSize
labelRequired
decorativeAllowed
meaning
```

Rules:

- Registry should include only approved icons.
- Token/protocol icons should define fallback.
- Icons that require labels should set `labelRequired: true`.
- Claude Code should use registry names rather than guessing file paths.
- New icons should be added to registry when added to assets.

---

## Content Rules

Icon labels and accessible names should follow WealthSmith voice:

- Clear
- Specific
- Calm
- Action-oriented
- Non-hype

Good labels:

```text
Connect wallet
Refresh portfolio
Copy wallet address
Open actions menu
Ask Smith AI
View details
```

Avoid:

```text
Profit
Magic
Boost
Best investment
Guaranteed
```

---

## Financial and Wallet Language Rules

Icon usage must be precise.

Allowed:

```text
Wallet
Watch-only
Read-only
Public address
Refresh portfolio
Copy address
External link
Estimated
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

Do not use icons or labels to imply WealthSmith can move funds, sign transactions, or execute financial actions unless the product actually supports that action and the flow clearly explains it.

Do not imply wallet connection gives WealthSmith custody.

Do not imply demo data is real user data.

---

## Validation and State Rules

Icon selection belongs outside the icon component.

The icon component may display:

- Requested icon
- Fallback icon
- Size
- Color token
- Decorative state
- Accessible label

The icon component must not decide:

- Which token is detected
- Which protocol is detected
- Which wallet provider is connected
- Whether state is success/warning/error
- Whether action is available
- Whether a token or protocol is recommended
- Whether a financial action should proceed

---

## Do

- Use icons to support meaning.
- Pair important icons with readable text.
- Use approved SVG assets from `assets/icons/`.
- Use fallback icons for missing token/protocol/wallet icons.
- Use semantic color and size tokens.
- Keep icon naming stable.
- Hide decorative icons from assistive technologies.
- Provide accessible labels for icon-only buttons.
- Keep token/protocol labels visible.
- Keep product logic outside the icon component.

---

## Do Not

- Do not store full SVG code in `components/icon.md`.
- Do not use icons as the only source of important meaning.
- Do not show token icons without token symbol/name.
- Do not show protocol icons without protocol name when identity matters.
- Do not show broken images.
- Do not invent icon names or asset paths.
- Do not use random icon sizes or raw colors.
- Do not make icons focusable unless they are part of an interactive control.
- Do not imply recommendation, custody, execution, or financial action through icons.
- Do not use hype-based icon labels.
- Do not hardcode raw visual values.
