# Global Nav

The Global Nav is the primary navigation component used across the WealthSmith app.

It appears at the top of Dashboard, Portfolio, Goal, Support, Onboarding, Demo Mode, and Smith AI states.

The Global Nav provides:

- WealthSmith brand identity
- Primary app navigation
- Wallet connection state
- Demo/connect actions
- Ask Smith AI access
- Wallet menu access

---

## Purpose

Use Global Nav to keep users oriented across the app.

It should clearly answer:

- Where am I?
- Which main page is active?
- Am I connected to a wallet?
- Am I in an onboarding state?
- Can I try Demo Mode?
- Can I connect a wallet?
- Can I ask Smith AI?

Global Nav is a renderer of app state.

It does not decide wallet status, onboarding status, active page, demo status, or Smith AI availability.

---

## Component Name

```text
GlobalNav
```

Recommended file:

```text
components/global-nav.md
```

---

## Required Structure

```text
GlobalNav
  Outer placement wrapper
  Nav container
    Logo
    Primary navigation
    Right actions
      Try Demo Mode
      Connect Wallet
      Wallet pill
      Ask Smith AI
```

---

## Visual Specs

Use these MVP sizing rules:

```text
Outer page offset:
  top: 24px
  left: 24px
  right: 24px

Nav container:
  height: 64px
  border radius: 16px
  horizontal content padding: 12px

Logo:
  width: 221px
  height: 32px
```

Rules:

- Nav height is fixed at 64px on desktop.
- Nav container radius is 16px.
- Nav sits 24px from top, left, and right of the app viewport/content shell.
- Content inside the nav has 12px horizontal padding.
- Logo uses the full WealthSmith lockup.
- Logo must not be recreated as live text.
- Use semantic tokens that map to these values where available.
- Do not hardcode these values in multiple places; define them through component/layout tokens if implementation supports it.

Recommended token mapping:

```text
globalNav.height -> 64px
globalNav.radius -> 16px
globalNav.outerOffset -> 24px
globalNav.contentPaddingX -> 12px
globalNav.logo.width -> 221px
globalNav.logo.height -> 32px
```

---

## Logo

Use:

```text
assets/logo/wealthsmith-full-lockup.svg
```

Required size:

```text
width: 221px
height: 32px
```

Rules:

- Use the approved full lockup.
- Do not recreate the logo with text.
- Do not stretch, crop, recolor, rotate, or decorate the logo.
- Logo may navigate to Dashboard if product supports it.
- Logo should have accessible label when used as a link.

Accessible label:

```text
Go to WealthSmith dashboard
```

---

## Primary Navigation Items

MVP nav items:

```text
Dashboard
Portfolio
Goal
Support
```

Rules:

- Active item is visually highlighted.
- Active item has a bottom-edge indicator (see Active State), not a text underline.
- Inactive items remain visible.
- Disabled items remain visible but cannot be clicked.
- Do not remove nav items when disabled.
- Do not rely on color alone for active state.
- Do not change nav order between states.

Recommended item structure:

```json
{
  "id": "dashboard",
  "label": "Dashboard",
  "href": "/dashboard",
  "is_active": true,
  "is_disabled": false
}
```

---

## Active State

The active nav state reflects the current page.

Examples:

```text
Dashboard active on Dashboard page
Portfolio active on Portfolio page
Goal active on Goal page
Support active on Support page
```

Rules:

- Active page state comes from router/app state.
- Component does not infer active state from URL text by itself unless routing layer provides it.
- Active item should expose `aria-current="page"`.
- The active blue indicator sits at the bottom edge of the nav item / nav bar area.
- The active indicator must not sit directly under the text label (no text underline).
- The indicator aligns with the nav item's horizontal bounds, anchored to the bottom edge.
- Dashboard remains the selected/active item while the Dashboard page is active.

---

## Disabled State During Onboarding

When onboarding is active, these nav items should be disabled:

```text
Portfolio
Goal
Support
```

Dashboard remains available/active.

Reason:

```text
During onboarding, the user should stay focused on setup until the required baseline plan is complete.
```

Rules:

- Disabled items remain visible.
- Disabled items do not navigate.
- Disabled items should have disabled visual treatment.
- Disabled items should be programmatically disabled or use safe click prevention.
- Disabled items should not show hover states that imply clickability.
- Do not hide disabled nav items.
- Do not let disabled nav items change onboarding state.
- Do not lose onboarding progress.

Accessible disabled item example:

```text
aria-disabled="true"
tabindex="-1"
```

Optional tooltip/copy if needed:

```text
Complete onboarding to open this page.
```

---

## Right Actions

The right side of Global Nav changes by state.

Possible right-side elements:

```text
Try Demo Mode
Connect Wallet
Wallet pill
Ask Smith AI
```

Only show actions that match the current app state.

---

## State Variants

### Variant 1: Onboarding Active, No Wallet Connected

Use when:

```text
onboarding_active = true
wallet.status = disconnected
demo_mode = false
```

Right actions:

```text
Try Demo Mode
Connect Wallet
```

Primary nav:

```text
Dashboard: active/enabled
Portfolio: disabled
Goal: disabled
Support: disabled
```

Visual example:

```text
[logo] Dashboard Portfolio Goal Support                 [Try Demo Mode] [Connect Wallet]
```

Rules:

- Connect Wallet is primary.
- Try Demo Mode is secondary.
- Portfolio, Goal, and Support are disabled.
- Ask Smith AI button is not shown in this variant.
- Onboarding panel handles Smith AI guidance.
- Do not allow users to navigate away from onboarding-required pages through disabled nav.

---

### Variant 2: Demo Mode

Use when:

```text
demo_mode = true
wallet.status = disconnected
onboarding_active = false
```

Right actions:

```text
Ask Smith AI
```

Primary nav:

```text
Dashboard: enabled
Portfolio: enabled
Goal: enabled
Support: enabled
```

Visual example:

```text
[logo] Dashboard Portfolio Goal Support                                  [Ask Smith AI]
```

Rules:

- Demo Mode banner is not part of Global Nav.
- Demo Mode banner should appear above the app shell through `components/announcement.md`.
- Do not show wallet pill.
- Do not show Connect Wallet in this variant unless product intentionally offers a switch-to-real-wallet CTA elsewhere.
- Ask Smith AI is allowed in Demo Mode, but answers must be grounded in demo/sample data.
- Demo data must not be mixed with real wallet data.

---

### Variant 3: Wallet Connected

Use when:

```text
wallet.status = connected
onboarding_active = false
demo_mode = false
```

Right actions:

```text
Wallet pill
Ask Smith AI
```

Primary nav:

```text
Dashboard: enabled
Portfolio: enabled
Goal: enabled
Support: enabled
```

Visual example:

```text
[logo] Dashboard Portfolio Goal Support                  [Phantom • 6fQ9] [Ask Smith AI]
```

Rules:

- Wallet pill appears before Ask Smith AI.
- Wallet pill opens wallet menu.
- Ask Smith AI opens the Smith AI panel.
- All primary nav items are enabled.
- Wallet connected state does not imply custody.
- Wallet connected state does not imply signing.

---

### Variant 4: Onboarding Active, Wallet Connected

Use when:

```text
onboarding_active = true
wallet.status = connected
demo_mode = false
```

Right actions:

```text
Wallet pill
```

Primary nav:

```text
Dashboard: active/enabled
Portfolio: disabled
Goal: disabled
Support: disabled
```

Visual example:

```text
[logo] Dashboard Portfolio Goal Support                              [Phantom • 6fQ9]
```

Rules:

- Portfolio, Goal, and Support are disabled.
- Wallet pill is visible.
- Ask Smith AI button is not shown.
- Onboarding panel is the active Smith AI surface.
- Do not show Connect Wallet because wallet is already connected.
- Do not show Try Demo Mode because real wallet onboarding is active.
- Do not let disabled navigation break onboarding progress.

---

## Wallet Pill

Wallet pill displays connected wallet state.

Example:

```text
[wallet icon] Phantom • 6fQ9
```

Required content:

```text
Wallet icon
Wallet provider name
Short address
```

Rules:

- Use approved wallet icon.
- Wallet name must be visible.
- Short address must be visible.
- Wallet icon alone is not enough.
- Wallet pill opens wallet menu when clicked.
- Wallet pill does not imply custody.
- Wallet pill does not imply WealthSmith can move funds.
- Wallet pill does not imply the user signed a transaction.
- Wallet pill should not expose the full wallet address by default.

Approved wallet icons:

```text
assets/icons/wallet/phantom.svg
assets/icons/wallet/solflare.svg
assets/icons/wallet/backpack.svg
```

Accessible label example:

```text
Connected wallet: Phantom, address ending 6fQ9. Open wallet menu.
```

---

## Wallet Menu

When wallet pill is clicked, show a menu.

MVP menu item:

```text
Disconnect Wallet
```

Rules:

- Menu is triggered by wallet pill.
- Menu uses `components/menu-popover.md`.
- Disconnect action uses clear destructive styling.
- Disconnecting wallet does not move funds.
- Disconnecting wallet does not require a signature.
- Menu must be keyboard accessible.
- Escape closes menu.
- Clicking outside closes menu.

See:

```text
patterns/wallet-connection.md
```

---

## Try Demo Mode Button

Use in:

```text
Onboarding active, no wallet connected
Pre-wallet start state
```

Rules:

- Secondary button style.
- Starts Demo Mode or demo onboarding.
- Does not connect a wallet.
- Does not use real wallet data.
- Demo Mode banner appears outside Global Nav.
- Do not show Try Demo Mode after wallet is connected during onboarding.

---

## Connect Wallet Button

Use in:

```text
Onboarding active, no wallet connected
Pre-wallet start state
```

Rules:

- Primary button style.
- Opens Connect Wallet modal.
- Does not execute transactions.
- Does not request signatures for basic read-only portfolio viewing if avoidable.
- Does not imply custody.
- Do not show Connect Wallet when wallet is already connected.

See:

```text
patterns/wallet-connection.md
```

---

## Ask Smith AI Button

Use when Smith AI chat/help is available and onboarding is not actively occupying the right panel.

Examples:

```text
Demo Mode
Wallet connected, onboarding complete
Support page
Dashboard with suggestions
Portfolio page
Goal page
```

Rules:

- Opens Ask Smith AI panel.
- Does not execute actions.
- Does not change deterministic recommendations by itself.
- Should not be shown while onboarding panel is active.
- Onboarding panel is already a Smith AI-guided surface.
- Ask Smith AI button should have icon + text.
- Button label should be visible.

Label:

```text
Ask Smith AI
```

Accessible label:

```text
Open Ask Smith AI
```

---

## Demo Mode Banner Is Separate

The Demo Mode banner is not part of Global Nav.

Use:

```text
components/announcement.md
```

Example:

```text
You’re in demo mode.
Exit Demo
```

Rules:

- Demo Mode banner appears above Global Nav.
- Global Nav responds to demo state but does not render the banner itself.
- Do not hide Demo Mode state entirely inside Global Nav.
- Demo Mode must remain clearly visible.

---

## Component Props

Recommended props:

```json
{
  "active_page": "dashboard",
  "onboarding_active": false,
  "demo_mode": false,
  "wallet": {
    "status": "connected",
    "provider": "phantom",
    "provider_label": "Phantom",
    "icon": "assets/icons/wallet/phantom.svg",
    "address_short": "6fQ9"
  },
  "smith_ai": {
    "ask_available": true
  },
  "actions": {
    "on_try_demo": "function",
    "on_connect_wallet": "function",
    "on_open_ask_smith_ai": "function",
    "on_open_wallet_menu": "function"
  }
}
```

Rules:

- Component renders from props.
- Component does not fetch wallet state.
- Component does not decide onboarding state.
- Component does not decide demo state.
- Component does not open protocol URLs.
- Component does not execute wallet actions directly.

---

## State Logic

Recommended rendering logic:

```text
if onboarding_active and wallet disconnected:
  show Try Demo Mode + Connect Wallet
  disable Portfolio, Goal, Support
  hide Ask Smith AI

if demo_mode and not onboarding_active:
  show Ask Smith AI
  hide wallet pill
  enable nav items

if wallet connected and not onboarding_active:
  show wallet pill + Ask Smith AI
  enable nav items

if onboarding_active and wallet connected:
  show wallet pill
  disable Portfolio, Goal, Support
  hide Ask Smith AI
  hide Try Demo Mode
  hide Connect Wallet
```

Rules:

- Onboarding active has priority over Ask Smith AI.
- Wallet connected has priority over Connect Wallet.
- Demo Mode and real wallet mode must not be mixed.
- Disabled nav behavior is explicit, not inferred from visual styling.

---

## Layout Behavior

Desktop:

```text
Logo left
Nav links after logo
Right actions aligned right
```

Rules:

- Nav container height remains 64px.
- Logo remains 221px × 32px.
- Right actions align center vertically.
- Nav content should not wrap on desktop.
- Keep nav readable at desktop widths.

Tablet:

- Keep full nav if space allows.
- If space is constrained, reduce gaps before hiding labels.
- Do not shrink logo below readable size without approved responsive spec.
- Right actions may stack or compress only if designed.

Mobile:

- Global Nav may need compact variant in future.
- MVP mobile behavior should be defined by layout guidelines before implementation.
- Do not invent hamburger/mobile behavior unless product approves it.
- If mobile nav is needed, preserve the same states and accessibility rules.

---

## Styling Rules

Use semantic tokens for implementation.

Visual requirements to map into tokens:

```text
height: 64px
radius: 16px
outer top/left/right offset: 24px
content horizontal padding: 12px
logo: 221px × 32px
```

Recommended semantic tokens:

```text
size.globalNav.height
radius.globalNav
spacing.globalNav.outerOffset
spacing.globalNav.contentPaddingX
size.logo.fullLockup.width
size.logo.fullLockup.height
```

Rules:

- Do not duplicate raw values across components.
- Do not hardcode colors.
- Use semantic text, border, background, and focus tokens.
- Disabled nav state should meet accessibility contrast requirements.
- Focus rings must be visible.

---

## Accessibility

Rules:

- Use semantic `<nav>` landmark.
- Provide accessible label for the nav region.
- Active item uses `aria-current="page"`.
- Disabled nav items use appropriate disabled semantics.
- Wallet pill has descriptive accessible label.
- Ask Smith AI button has accessible label.
- Logo link has accessible label.
- Menu trigger exposes expanded/collapsed state.
- Keyboard users can reach all enabled actions.
- Disabled links should not trap focus.
- Do not rely on color alone for active/disabled state.
- Focus order follows visual order.

Example:

```text
nav aria-label="Primary navigation"
```

Active item:

```text
aria-current="page"
```

Wallet menu trigger:

```text
aria-haspopup="menu"
aria-expanded="false"
```

---

## Content Rules

Use exact nav labels:

```text
Dashboard
Portfolio
Goal
Support
Try Demo Mode
Connect Wallet
Ask Smith AI
```

Wallet pill format:

```text
{Wallet Provider} • {short address}
```

Example:

```text
Phantom • 6fQ9
```

Rules:

- Do not rename primary nav labels without product decision.
- Do not shorten `Ask Smith AI` to icon-only on desktop.
- Do not show full wallet address in nav by default.
- Do not use hype language in nav actions.

---

## Relationship to Patterns

Used by:

```text
patterns/dashboard-layout.md
patterns/onboarding-with-smith-ai.md
patterns/suggestion-flow.md
patterns/portfolio-overview.md
patterns/wallet-connection.md
patterns/goal-settings.md
patterns/support-center.md
```

Responsibilities:

```text
GlobalNav component:
  renders nav state

Dashboard Layout pattern:
  decides placement in app shell

Wallet Connection pattern:
  defines wallet modal/menu/disconnect behavior

Onboarding pattern:
  defines when onboarding is active and nav should disable non-dashboard tabs

Demo Mode pattern/state:
  defines demo banner outside nav
```

---

## Do

- Use approved full logo asset.
- Keep nav height at 64px.
- Use 16px radius.
- Keep 24px outer offset.
- Keep 12px internal horizontal padding.
- Show active page state.
- Disable Portfolio, Goal, and Support during onboarding.
- Show the correct right actions for each state.
- Show wallet name and short address when connected.
- Keep Ask Smith AI hidden during active onboarding.
- Keep Demo Mode banner separate.
- Use semantic tokens where possible.

---

## Do Not

- Do not recreate the logo with text.
- Do not invent nav items.
- Do not change nav order.
- Do not hide disabled onboarding nav items.
- Do not allow Portfolio, Goal, or Support navigation during active onboarding.
- Do not show Ask Smith AI while onboarding panel is active.
- Do not show Connect Wallet when wallet is already connected.
- Do not show wallet pill in Demo Mode unless a real wallet is connected and product explicitly supports mixed state.
- Do not mix Demo Mode and real wallet data.
- Do not imply wallet connection means custody.
- Do not imply wallet connection means signing.
- Do not make icon-only desktop nav actions.

---

## Done Criteria

This component is implemented correctly when:

- Global Nav appears consistently across app pages.
- Container height is 64px.
- Container radius is 16px.
- Container sits 24px from top/left/right.
- Internal horizontal padding is 12px.
- Logo renders at 221px × 32px.
- Dashboard, Portfolio, Goal, Support are present in order.
- Active nav item is visually and programmatically clear.
- Onboarding active disables Portfolio, Goal, and Support.
- Onboarding active without wallet shows Try Demo Mode + Connect Wallet.
- Demo Mode shows Ask Smith AI and no wallet pill.
- Wallet connected shows wallet pill + Ask Smith AI.
- Onboarding active with wallet shows wallet pill only.
- Wallet pill opens wallet menu.
- Ask Smith AI opens Smith AI panel when available.
- Component renders from state and does not own business logic.
- Accessibility requirements are met.
