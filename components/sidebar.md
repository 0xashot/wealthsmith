# Sidebar

Sidebars provide persistent or temporary navigation, context, and assistant surfaces in WealthSmith.

They are used for app navigation, dashboard structure, secondary panels, mobile drawers, and the Smith AI companion panel.

Sidebars should feel stable, calm, responsive, and easy to open or close.

---

## Purpose

Use sidebars to support navigation, context, or companion assistance without forcing users away from the current page.

A sidebar should help users:

- Move between major product areas
- Access key sections of the app
- View contextual assistance
- Open or close Smith AI
- Review related context without losing page state
- Use the product on mobile, tablet, desktop, and wide screens

Sidebars should improve orientation, not compete with primary content.

---

## Important Rule

Sidebars control layout, navigation, and panel behavior.

Sidebars do not contain WealthSmith business logic.

A sidebar can display:

- Navigation links
- Wallet/account controls
- Page sections
- Smith AI entry point
- Smith AI panel shell
- Contextual assistant area
- Status indicators
- Secondary actions

A sidebar must not decide:

- Which suggestion appears
- Which suggestion is Top Pick
- How portfolio health is calculated
- How safety buffer is calculated
- Which protocol is selected
- Which token is recommended
- How Smith AI reasons
- What Smith AI should answer
- Whether a user should invest

Business logic belongs in `rules/`, backend logic, or Smith AI orchestration.

The sidebar should render provided navigation, state, and panel content.

---

## Sidebar Types

WealthSmith supports these sidebar types:

1. App navigation sidebar
2. Mobile navigation drawer
3. Smith AI companion panel
4. Contextual side panel
5. Onboarding Smith AI panel

Each type can share layout rules, but their behavior is different.

---

## App Navigation Sidebar

Use the app navigation sidebar for primary WealthSmith navigation.

Examples:

- Dashboard
- Portfolio
- Suggestions
- Wallets
- Settings
- Smith AI entry point

Rules:

- Navigation should be predictable.
- Active item should be clearly shown.
- Icons must not replace labels unless the sidebar is intentionally collapsed.
- Collapsed navigation must provide accessible labels.
- Navigation state should not change product logic.

---

## Mobile Navigation Drawer

Use a mobile drawer when there is not enough space for persistent navigation.

Rules:

- Opens over the page content.
- Uses overlay/scrim when needed.
- Closes through close button, Escape, outside tap where safe, or selecting a destination.
- Must trap focus while open.
- Must return focus to the trigger on close.
- Must not conflict with Smith AI panel behavior.

Token guidance:

- Scrim: `color.overlay.scrim`
- Drawer z-index: `zIndex.overlay.drawer`
- Shadow: `shadow.overlay.drawer`
- Motion: `motion.navigation.open`

---

## Smith AI Companion Panel

Smith AI should behave like a companion assistant panel.

The intended behavior is similar to a modern productivity app assistant panel: it can appear beside the main workspace, disappear when dismissed, and reopen from a visible trigger.

This panel should feel like a helpful teammate, not a blocking modal.

### Default Behavior

Smith AI should be:

- Toggleable
- Easy to open
- Easy to close
- Context-aware when product context is provided
- Non-blocking outside of onboarding
- Persistent when the user chooses to keep it open on desktop
- Overlay-based on smaller screens

### Open / Close Behavior

Smith AI can appear when:

- User clicks the Smith AI trigger
- User asks to explain a suggestion
- User opens contextual help
- User enters onboarding
- Product logic opens it for a guided flow

Smith AI can disappear when:

- User closes the panel
- User navigates away from a context where it is no longer relevant
- User completes a non-required assistant interaction
- User switches to a layout where the panel collapses into a trigger

Rules:

- Closing Smith AI should not erase the main page state.
- Reopening Smith AI should preserve useful recent context where product behavior supports it.
- Smith AI should not block dashboard use unless the current flow requires it.
- Smith AI should not replace visible required instructions.

---

## Onboarding Smith AI Panel

During onboarding, Smith AI should be always open.

Onboarding is guided by Smith AI, so the assistant panel is part of the main onboarding layout, not an optional helper.

Rules:

- Smith AI remains visible during onboarding.
- The user should not accidentally close Smith AI during required onboarding steps.
- If a close control exists, it should either be hidden or replaced with a minimize behavior that keeps onboarding guidance accessible.
- Smith AI should guide the user through onboarding questions and explanations.
- Main onboarding content and Smith AI should stay visually connected.
- On mobile, Smith AI may become a full-screen or step-based assistant layout.
- On tablet, Smith AI may use an overlay or split layout depending on available space.
- On desktop and wide screens, Smith AI should appear as a persistent side panel.

Onboarding Smith AI must still not invent product logic.

It should collect or explain structured onboarding data, while product logic interprets that data.

---

## Contextual Side Panel

Use contextual side panels for secondary information that supports the current page.

Examples:

- Suggestion details
- Portfolio item details
- Wallet details
- Protocol details
- Help content
- Explanation panel

Rules:

- Side panel should not replace the main page unless screen size requires it.
- Side panel should preserve page context.
- Side panel should be closable unless part of a required flow.
- Side panel should not contain unrelated content.

---

## When to Use

Use a sidebar or side panel when users need persistent or contextual access to secondary content.

Examples:

- App navigation
- Smith AI
- Suggestion explanation
- Wallet details
- Portfolio context
- Settings navigation
- Mobile menu
- Onboarding assistant

---

## When Not to Use

Do not use a sidebar for:

- One-time alerts
- Toast messages
- Small confirmations
- Short errors
- Full-screen dashboards on mobile when content would be cramped
- Long-form documents that need their own page
- Critical blocking decisions that need a modal
- Business logic or recommendation decisions

Use `components/modal.md` for focused confirmations.

Use `components/tooltip.md` for small explanations.

Use a page or pattern for large workflows.

---

## Anatomy

A sidebar can include:

1. Container
2. Header
3. Optional logo or product mark
4. Optional title
5. Navigation list
6. Active item indicator
7. Optional section groups
8. Optional badges or status labels
9. Optional footer
10. Optional user/account area
11. Optional Smith AI trigger
12. Optional close or collapse control
13. Optional resize or pin control where supported
14. Optional overlay scrim on small screens

Required for navigation sidebar:

- Container
- Navigation items
- Active item state

Required for Smith AI panel:

- Container
- Smith AI header or accessible label
- Assistant content area
- Open and close behavior outside onboarding
- Persistent behavior during onboarding

Optional:

- Icons
- Badges
- Footer actions
- Account controls
- Collapse behavior
- Context header

---

## Variants

### Persistent Sidebar

Use on desktop and wide layouts when navigation should remain visible.

Examples:

- Main app navigation
- Desktop dashboard layout

Rules:

- Does not cover main content.
- Main content should account for sidebar width.
- Active navigation item should be clear.
- Should not create horizontal overflow.
- Can be collapsible if product behavior supports it.

Token guidance:

- Background: `color.surface.card`
- Border: `color.border.subtle`
- Shadow: `shadow.navigation.sidebar`
- Z-index: `zIndex.navigation.primary`

---

### Collapsed Sidebar

Use when horizontal space is limited but navigation should remain available.

Rules:

- Icons may be shown without visible text.
- Each item must have an accessible label.
- Tooltip may explain icons on desktop.
- Active item must remain clear.
- Do not use collapsed sidebar on mobile when a drawer would be clearer.

---

### Overlay Drawer

Use on mobile and sometimes tablet.

Rules:

- Covers part or all of the screen.
- Uses scrim where appropriate.
- Traps focus while open.
- Closes safely.
- Returns focus to trigger.
- Should not fight with modals.

Token guidance:

- Background: `color.surface.card`
- Scrim: `color.overlay.scrim`
- Shadow: `shadow.overlay.drawer`
- Z-index: `zIndex.overlay.drawer`
- Motion: `motion.navigation.open`

---

### Smith AI Desktop Panel

Use for Smith AI on desktop and wide layouts.

Rules:

- Appears on the side of the main workspace.
- Can be opened and closed by the user outside onboarding.
- Can remain persistent if the user keeps it open.
- Should not cover important content unless the layout intentionally uses overlay mode.
- Should receive structured context from the current page.
- Should not make product decisions inside the panel shell.

Recommended behavior:

```text
Closed state: visible Smith AI trigger
Open state: side panel appears beside workspace
Dismissed state: panel disappears and trigger remains available
```

Token guidance:

- Background: `color.surface.card`
- Border: `color.border.subtle`
- Shadow: `shadow.overlay.drawer` or `shadow.navigation.sidebar`
- Z-index: `zIndex.smithAI.panel`
- Motion: `motion.overlay.enter`

---

### Smith AI Mobile Panel

Use for Smith AI on mobile.

Rules:

- Opens as overlay, sheet, or full-screen assistant view.
- Should be easy to close outside onboarding.
- During onboarding, should remain part of the required flow.
- Must not make the main UI unusable unless intentionally full-screen.
- Must preserve page or onboarding context when possible.

---

### Onboarding Assistant Panel

Use during onboarding.

Rules:

- Always open.
- Treated as part of the onboarding layout.
- Should not be dismissed accidentally.
- Guides the onboarding flow.
- Can ask questions, explain fields, and show next steps.
- Product logic still interprets answers and calculates outputs.

Token guidance:

- Background: `color.surface.card`
- Border: `color.border.subtle`
- Radius: `radius.surface.md` or layout-specific panel radius
- Shadow: `shadow.surface.raised`
- Typography: `typography.body.md`

---

## Sizes

### Navigation Sidebar Width

Use consistent widths defined by implementation.

Recommended behavior:

- Collapsed: icon-only width
- Default: standard navigation width
- Wide: only when navigation labels or account content need more space

Do not make navigation wider than needed.

### Smith AI Panel Width

Smith AI should be wide enough for readable assistant content.

Rules:

- Keep text line length readable.
- Do not make the panel so narrow that responses become hard to read.
- Do not make the panel so wide that it dominates the workspace.
- On desktop, main content and Smith AI should coexist.
- On mobile, use overlay or full-screen behavior.

### Mobile Drawer Width

Rules:

- Drawer may use most of the screen width.
- Full-screen drawer is allowed when content needs it.
- Touch targets must remain comfortable.

---

## States

Sidebars may support these states.

### Closed

Sidebar or panel is not visible.

Closed state should preserve an accessible trigger where users can reopen it.

### Open

Sidebar or panel is visible.

### Collapsed

Sidebar is visible in reduced-width mode.

Collapsed items must remain accessible.

### Pinned

Panel remains visible across navigation where product behavior supports it.

### Unpinned

Panel can close automatically or return to trigger-only state.

### Loading

Use when sidebar content is loading.

Examples:

- Loading navigation state
- Loading Smith AI context
- Loading wallet list

Do not show fake navigation or fake assistant content.

### Error

Use when panel content fails to load.

Example:

```text
Could not load Smith AI. Try again.
```

### Active Item

Use for current navigation destination.

Active state should not rely on color alone.

### Disabled Item

Use for unavailable navigation or actions.

Disabled reason should be clear when needed.

### Onboarding Locked Open

Use during onboarding when Smith AI must remain open.

Rules:

- Close action should be hidden, disabled with explanation, or changed to minimize while preserving guidance.
- The user should always have access to onboarding guidance.

---

## Token Usage

Sidebars must use semantic tokens.

Do not hardcode colors, spacing, typography, radius, shadows, motion, or z-index.

### Correct

```text
background: color.surface.card
border: color.border.subtle
text: color.text.primary
secondary text: color.text.secondary
active background: color.selection.background.default
padding: spacing.sidebar.padding.default
gap: spacing.sidebar.gap.default
shadow: shadow.navigation.sidebar
z-index: zIndex.navigation.primary
motion: motion.navigation.open
```

### Incorrect

```text
background: #FFFFFF
border-right: 1px solid #C5C5C5
padding: 24px
box-shadow: 0px 2px 4px rgba(0,0,0,0.06)
z-index: 9999
transition: 300ms ease
```

---

## Responsive Behavior

Sidebars must follow WealthSmith breakpoint behavior.

### Mobile

- App navigation should use drawer or bottom/navigation pattern where appropriate.
- Smith AI should open as overlay, sheet, or full-screen assistant.
- Onboarding Smith AI should remain visible as part of the flow.
- Avoid persistent sidebars that squeeze main content.
- Use comfortable tap targets.
- Trap focus in overlay drawers.
- Return focus on close.

### Tablet

- Navigation may use adaptive drawer or collapsed sidebar.
- Smith AI should usually open as overlay panel.
- Onboarding may use split layout if space allows, otherwise assistant-led stacked flow.
- Avoid crowding content with too many side panels.

### Desktop

- Navigation may be persistent.
- Smith AI may appear as a toggleable companion side panel.
- Smith AI may disappear when closed and reopen from a trigger.
- Main content should resize or adapt when Smith AI is open.
- Onboarding Smith AI should remain open.

### Wide

- Navigation may remain persistent.
- Smith AI may remain open without covering main content.
- Keep both main content and assistant panel within readable widths.
- Do not stretch panels unnecessarily.

---

## Smith AI Behavior Rules

Smith AI panel behavior should be consistent across the product.

### Outside Onboarding

Smith AI should be optional and toggleable.

Rules:

- Show a clear Smith AI trigger.
- Open the panel when the trigger is activated.
- Close the panel when the user dismisses it.
- Keep a visible way to reopen the panel.
- Preserve useful context when possible.
- Do not force the panel open unless product logic has a clear reason.

### During Onboarding

Smith AI should be always open.

Rules:

- Treat Smith AI as the guide for onboarding.
- Do not allow accidental dismissal.
- Keep assistant guidance visible.
- Use Smith AI to ask questions and explain why fields matter.
- Product logic interprets answers outside the panel component.

### Context Passing

Smith AI panel may receive structured context.

Examples:

```text
currentPage
selectedSuggestionId
selectedWalletId
selectedAssetSymbol
onboardingStep
portfolioSummary
```

Rules:

- The panel shell passes context.
- The panel shell does not generate reasoning.
- Smith AI response behavior belongs in Smith AI logic and prompt orchestration.

---

## Navigation Items

Navigation items may include:

- Icon
- Label
- Active state
- Badge
- Disabled state
- Secondary label
- Tooltip for collapsed state

Examples:

```text
Dashboard
Portfolio
Suggestions
Wallets
Settings
Smith AI
```

Rules:

- Labels should be short.
- Icons must not replace accessible labels.
- Active item must be visually and accessibly clear.
- Disabled items should explain why if not obvious.
- Navigation should not use hype language.

---

## Overlay and Z-Index

Sidebar overlays must use approved z-index tokens.

Rules:

- Navigation sidebar: `zIndex.navigation.primary`
- Mobile drawer: `zIndex.overlay.drawer`
- Smith AI panel: `zIndex.smithAI.panel`
- Scrim: `zIndex.overlay.scrim`
- Tooltip inside sidebar: `zIndex.menu.tooltip`

Do not use arbitrary values like `9999`.

Drawers and modals must not conflict.

When modal and sidebar are both present, modal should take priority unless product behavior explicitly says otherwise.

---

## Motion

Sidebar motion should be calm and predictable.

Use:

- `motion.navigation.open`
- `motion.navigation.close`
- `motion.overlay.enter`
- `motion.overlay.exit`
- `motion.reducedMotion.default`

Rules:

- Avoid dramatic animation.
- Do not animate large panels when reduced motion is enabled.
- Keep open and close transitions fast enough to feel responsive.
- Do not delay interaction unnecessarily.

---

## Accessibility

Sidebars must support accessibility by default.

Requirements:

- Navigation must use appropriate navigation semantics.
- Active item must be communicated accessibly.
- Collapsed icon-only items must have accessible labels.
- Drawers must trap focus while open.
- Drawers must return focus on close.
- Escape should close overlay drawers where safe.
- Smith AI trigger must be keyboard accessible.
- Smith AI panel must have an accessible label.
- Close buttons must have accessible labels.
- Do not rely on color alone.
- Contrast must meet WCAG AA.
- Reduced motion must be respected.

Recommended labels:

```text
aria-label="Main navigation"
aria-label="Open Smith AI"
aria-label="Close Smith AI"
aria-label="Open menu"
aria-label="Close menu"
```

---

## Keyboard Behavior

Required keyboard behavior for overlay sidebars:

```text
Tab: move to next focusable element inside panel
Shift + Tab: move to previous focusable element inside panel
Escape: close panel when safe
Enter: activate focused item
Space: activate focused button
```

For onboarding Smith AI:

- Escape should not close required onboarding guidance unless product behavior provides another way to keep guidance accessible.
- Focus should move logically between onboarding content and Smith AI guidance.

---

## Content Rules

Sidebar copy should follow WealthSmith voice:

- Clear
- Calm
- Trustworthy
- Beginner-friendly
- Specific
- Non-hype

Good navigation labels:

```text
Dashboard
Portfolio
Suggestions
Wallets
Settings
Smith AI
```

Good Smith AI trigger labels:

```text
Ask Smith AI
Open Smith AI
Explain with Smith AI
```

Good onboarding text:

```text
Smith AI will guide you through setup.
```

Avoid:

```text
Unlock profits
Maximize gains
AI magic
Get rich
Best investment
```

Sidebar labels should be short and easy to scan.

---

## Do

- Use sidebars for navigation, context, and Smith AI companion behavior.
- Use semantic tokens.
- Make Smith AI toggleable outside onboarding.
- Keep Smith AI always open during onboarding.
- Keep navigation predictable.
- Use overlay drawers on mobile.
- Trap focus in overlay drawers.
- Return focus when closing drawers or panels.
- Use accessible labels for icon-only items.
- Keep business logic outside sidebars.
- Use approved z-index tokens.

---

## Do Not

- Do not hardcode raw visual values.
- Do not use arbitrary z-index values like `9999`.
- Do not put recommendation logic inside the sidebar.
- Do not make Smith AI calculate product decisions inside the panel shell.
- Do not let mobile sidebars squeeze the main content.
- Do not allow onboarding Smith AI to be accidentally dismissed.
- Do not rely on icons alone.
- Do not rely on color alone for active state.
- Do not use hype-based financial copy.
- Do not imply custody, execution, or investment action unless the product actually supports it.
