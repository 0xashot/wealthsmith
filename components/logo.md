# Logo

The logo represents the WealthSmith brand across the product interface.

In WealthSmith, the logo may appear in the app shell, sidebar, onboarding, loading screens, authentication screens, empty states, email templates, documents, and marketing-adjacent product surfaces.

The logo should be used consistently, clearly, and without modification.

---

## Purpose

Use the logo to identify WealthSmith.

The logo should help users understand:

- They are inside WealthSmith
- The page or flow belongs to WealthSmith
- A branded product surface is official
- The app shell, onboarding, or loading state belongs to WealthSmith

The logo should support trust and orientation without overwhelming the UI.

---

## Important Rule

Logo displays brand identity.

Logo does not contain WealthSmith business logic.

A logo can display:

- Full logo
- Wordmark
- Symbol
- App icon
- Favicon
- Monochrome logo
- Light-background logo
- Dark-background logo
- Compact logo
- Loading-screen logo

A logo must not decide:

- Current route
- Current app state
- Whether a user is logged in
- Whether a wallet is connected
- Whether demo mode is active
- Whether Smith AI is open
- Whether a financial action is available
- Whether a suggestion should appear

Those decisions must come from routing, app shell, product state, or parent layout.

The logo component should render the requested approved logo variant.

---

## Asset Storage Rule

Do not store full SVG code in `components/logo.md`.

This file defines logo usage rules.

Actual logo assets should live in:

```text
assets/logo/
```

Recommended structure:

```text
assets/logo/
  wealthsmith-logo.svg
  wealthsmith-logo-dark.svg
  wealthsmith-logo-light.svg
  wealthsmith-wordmark.svg
  wealthsmith-symbol.svg
  wealthsmith-symbol-dark.svg
  wealthsmith-symbol-light.svg
  favicon.svg
  app-icon.svg
```

Optional registry:

```text
assets/logo/logo-registry.json
```

The registry should map approved logo variants to paths, usage, background compatibility, and minimum size.

Example registry shape:

```json
{
  "logo": {
    "path": "assets/logo/wealthsmith-logo.svg",
    "usage": "Default full logo on light surfaces",
    "minWidth": "120px"
  },
  "symbol": {
    "path": "assets/logo/wealthsmith-symbol.svg",
    "usage": "Compact app shell, favicon, collapsed sidebar",
    "minSize": "24px"
  }
}
```

---

## Logo Variants

### Full Logo

Use when enough horizontal space exists.

Examples:

- Desktop sidebar
- Auth screen
- Onboarding welcome screen
- Loading screen
- Help/footer areas

Rules:

- Preferred brand mark when space allows.
- Do not use in cramped spaces.
- Keep clear space around the logo.
- Do not pair with another visible WealthSmith text label unless needed.

---

### Wordmark

Use when text identity is needed but symbol is not required.

Examples:

- Header brand area
- Documents
- Email templates
- Compact branded surfaces

Rules:

- Use only approved wordmark asset.
- Do not recreate the wordmark with typed text.
- Do not change font, letter spacing, or weight.
- Do not place wordmark in a crowded control group.

---

### Symbol

Use when space is limited or the product is already identifiable.

Examples:

- Collapsed sidebar
- Mobile app shell
- Favicon
- App icon
- Compact loading state
- Small product badge

Rules:

- Use only approved symbol asset.
- Do not use symbol alone where users may not know the brand.
- Pair with accessible label when used as a link or button.
- Do not treat symbol as an action icon.

---

### App Icon

Use for app-level identity.

Examples:

- Browser/PWA icon
- Mobile install icon
- App launcher
- Splash surface

Rules:

- Use approved app icon asset.
- Do not use arbitrary cropped logo.
- App icon must remain legible at small sizes.
- Follow platform export requirements separately.

---

### Favicon

Use for browser tab identity.

Rules:

- Use approved favicon asset.
- Must remain recognizable at very small size.
- Do not use full wordmark as favicon if it becomes unreadable.
- Prefer symbol-based favicon.

---

### Monochrome Logo

Use only when full-color logo cannot be used.

Examples:

- Dark surfaces
- Light surfaces requiring single-color logo
- Print-like export surfaces

Rules:

- Use approved monochrome asset.
- Do not manually recolor the logo.
- Ensure contrast meets accessibility expectations.
- Do not use monochrome logo as decoration.

---

## When to Use

Use the logo on major product identity surfaces.

Examples:

- App shell
- Sidebar header
- Login/sign-in screen
- Onboarding entry
- Loading screen
- Demo mode welcome screen, if needed
- Help center/product support
- Email templates, if built later
- Exported reports, if built later

---

## When Not to Use

Do not use the logo:

- Inside every card
- Inside every modal
- As a decorative background pattern
- As a status icon
- As a button icon for non-brand actions
- As a replacement for page title
- As a replacement for Smith AI identity
- Inside financial charts
- Inside suggestion cards unless brand context is explicitly needed
- As a loading spinner

Use:

- `components/icon.md` for UI/action icons
- `components/page-header.md` for page titles
- `components/sidebar.md` for app navigation identity
- `components/loading-indicator.md` for loading
- `components/skeleton.md` for content placeholders

---

## Data Source

Logo usage should render from approved variant props.

Expected data may include:

```text
variant
size
theme
href
ariaLabel
decorative
placement
```

The exact schema can evolve.

The component should not invent logo assets, variants, paths, themes, or brand colors.

---

## Anatomy

A logo can include:

1. Logo asset
2. Optional link wrapper
3. Optional accessible label
4. Optional hidden text label
5. Optional container

Required:

- Approved logo asset
- Correct accessible behavior
- Correct size
- Correct background compatibility

Optional:

- Link to dashboard/home
- Hidden accessible text
- Container alignment

The logo should remain clear and undistorted.

---

## Placement

### Sidebar

Use logo in the sidebar header.

Rules:

- Full logo may be used in expanded sidebar.
- Symbol may be used in collapsed sidebar.
- Do not crowd logo with navigation items.
- Keep enough spacing below logo.
- If logo links to dashboard, provide accessible label.

Good accessible label:

```text
Go to WealthSmith dashboard
```

---

### App Header

Use logo only if app shell requires a top header.

Rules:

- Avoid duplicating logo if sidebar already shows it clearly.
- On mobile, symbol or compact logo may be enough.
- Logo should not compete with page title.

---

### Onboarding

Use logo on welcome or setup surfaces.

Rules:

- Use logo to establish product identity.
- Do not overuse logo on every onboarding step.
- During onboarding, Smith AI remains open where product design requires it.
- Logo should not replace step title or explanation.

---

### Loading Screen

Use logo on app initialization only when appropriate.

Rules:

- Use logo as brand identity.
- Use `components/loading-indicator.md` for loading motion.
- Do not animate logo aggressively.
- Do not use logo as spinner.
- Provide accessible loading text if the screen is blocking.

---

### Empty State

Use logo rarely in empty states.

Rules:

- Prefer contextual icons from `components/icon.md`.
- Do not use logo as a generic empty state icon.
- Logo may appear only when the empty state is brand-level, such as first-run or welcome context.

---

### Documents / Exports

If WealthSmith later supports exported reports, the logo may appear in document headers.

Rules:

- Use approved asset.
- Keep size modest.
- Do not distort or recolor.
- Do not imply guaranteed outcomes in branded reports.

---

## Sizing

Logo sizing should use approved tokens or explicit approved brand sizes.

Recommended product sizes:

```text
symbol.sm: 24px
symbol.md: 32px
symbol.lg: 40px
logo.sm: 96px width
logo.md: 120px width
logo.lg: 160px width
```

Rules:

- Do not invent arbitrary logo sizes.
- Do not stretch logo horizontally or vertically.
- Preserve aspect ratio.
- Use SVG for scalable quality.
- Keep minimum size readable.
- Use symbol instead of shrinking full logo too much.

If dedicated logo size tokens do not exist yet, define them as component-level tokens later.

---

## Clear Space

Maintain clear space around the logo.

Rules:

- Do not place logo too close to text, buttons, cards, or edges.
- Use spacing tokens for margin/padding.
- Do not overlap logo with announcements, badges, or controls.
- Do not place logo in dense data tables.
- Do not place logo inside chart areas.

Recommended clear space:

```text
At least spacing.inline.gap.md around compact symbol.
At least spacing.stack.gap.md around full logo.
```

---

## Color and Theme

Logo variant must match background.

### Light Surfaces

Use the default or dark-text logo variant.

### Dark Surfaces

Use the light logo variant.

### Brand/Colored Surfaces

Use approved contrast-safe logo variant.

Rules:

- Do not manually recolor logo.
- Do not apply gradients to logo.
- Do not change opacity unless approved.
- Do not place logo on low-contrast backgrounds.
- Use approved variants only.
- Test contrast visually.

---

## Background Rules

Logo must remain readable on its background.

Rules:

- Avoid busy backgrounds.
- Avoid placing logo over charts or illustrations.
- Avoid placing logo over photo-like textures.
- Avoid low-contrast surfaces.
- Use approved clear container when needed.
- Do not add random shadows or outlines to force readability.

---

## Interaction

Logo may be interactive when it links to a main destination.

Common behavior:

```text
Click logo -> Dashboard/Home
```

Rules:

- Interactive logo must be keyboard accessible.
- Interactive logo must have accessible label.
- Hover/focus state should be subtle.
- Do not make the logo open unrelated menus.
- Do not make logo trigger financial actions.
- Do not make logo toggle Smith AI.

If logo is decorative, it should not be focusable.

---

## States

Logo should have very few states.

Allowed states:

### Default

Standard logo display.

### Hover

Only when logo is an interactive link.

### Focus

Required when logo is interactive.

### Disabled

Avoid disabled logo state. Logo should usually not be disabled.

### Loading

Logo may appear near loading indicator, but logo itself should not become the loading indicator.

Rules:

- Do not use success, warning, or error logo states.
- Do not recolor logo based on financial status.
- Do not animate logo based on portfolio or suggestion state.

---

## Token Usage

Logo placement should use semantic tokens.

Do not hardcode spacing, backgrounds, focus rings, or layout values.

### Correct

```text
container background: color.surface.page
clear space: spacing.stack.gap.md
inline gap: spacing.inline.gap.md
focus: shadow.control.focus
```

Logo SVG colors should come from approved logo assets, not from component styling.

### Incorrect

```text
margin: 24px
background: #FFFFFF
box-shadow: 0 0 8px blue
filter: hue-rotate(90deg)
opacity: 0.5
```

---

## Responsive Behavior

Logo should adapt to available space.

### Mobile

- Use symbol or compact logo when space is limited.
- Avoid full logo if it crowds navigation or page title.
- Keep tap target comfortable when logo is interactive.
- Do not duplicate logo if onboarding/app shell already provides context.

### Tablet

- Full logo may be used if layout supports it.
- Symbol may be used in compact sidebars.

### Desktop

- Full logo may appear in sidebar or auth/onboarding surfaces.
- Collapsed sidebar may use symbol.
- Keep logo aligned to grid.

### Wide

- Do not enlarge logo just because viewport is wide.
- Keep logo proportional and modest.

---

## Accessibility

Logo must support accessibility by default.

Requirements:

- Interactive logo needs accessible label.
- Decorative logo should not create duplicate screen-reader announcements.
- Logo image must have appropriate alt text if rendered as image.
- SVG should not expose unnecessary internal paths to screen readers.
- Focus state must be visible when interactive.
- Do not rely on logo as the only page identity.
- Page title should still exist as text.

Recommended interactive logo:

```text
aria-label="Go to WealthSmith dashboard"
```

Recommended decorative logo:

```text
aria-hidden="true"
```

Recommended image alt text:

```text
WealthSmith
```

If visible text already says WealthSmith next to the symbol, the symbol can be decorative.

---

## Keyboard Behavior

Logo is not usually keyboard interactive unless it is a link.

Rules:

- If logo is a link, it must be reachable with Tab.
- Enter activates the link.
- Focus ring must be visible.
- Do not trap focus.
- Do not make individual SVG paths focusable.
- Do not make decorative logos focusable.

---

## Asset Quality Rules

Logo assets must be clean and production-ready.

Rules:

- Use SVG for primary logo assets.
- Preserve viewBox.
- Preserve aspect ratio.
- Remove unnecessary metadata.
- Do not include scripts or external references.
- Do not embed low-quality raster images inside SVG.
- Export favicon/app icon variants separately when needed.
- Use predictable kebab-case filenames.
- Keep official brand geometry intact.

Good filenames:

```text
wealthsmith-logo.svg
wealthsmith-wordmark.svg
wealthsmith-symbol.svg
wealthsmith-logo-light.svg
wealthsmith-logo-dark.svg
favicon.svg
app-icon.svg
```

Avoid:

```text
Logo final.svg
logo-new-copy.svg
wsblue2.svg
Untitled.svg
```

---

## Modification Rules

Do not modify the logo.

Do not:

- Stretch
- Crop
- Rotate
- Add shadows
- Add outlines
- Add gradients
- Change colors
- Change typography
- Recreate wordmark in text
- Place inside another shape
- Add badges
- Add emojis
- Add financial status color
- Use as chart marker
- Use as spinner
- Use low-contrast variant
- Combine with token/protocol logos

The logo must remain official and consistent.

---

## Logo and Smith AI

Logo and Smith AI identity are different.

Rules:

- WealthSmith logo identifies the product.
- Smith AI icon/avatar identifies assistant functionality.
- Do not use WealthSmith logo as Smith AI avatar unless product brand explicitly requires it.
- Do not use Smith AI icon as the main WealthSmith logo.
- During onboarding, both can appear, but they should serve different purposes.

---

## Demo Mode Rules

When Demo Mode is active:

- Logo remains standard.
- Demo state should be shown through `components/announcement.md` and optional badge, not through logo changes.
- Do not add “Demo” badge directly to the logo.
- Do not recolor logo for demo mode.
- Do not imply demo data is real user data.

---

## Financial and Wallet Language Rules

Logo usage should not imply financial outcomes.

Avoid logo pairings or labels such as:

```text
Guaranteed growth
Best returns
Risk-free wealth
Profit mode
Custody secured
```

Do not use logo placement to imply WealthSmith has custody of user funds.

Do not use logo as a trust seal for protocols, tokens, or investments.

---

## Validation and State Rules

Logo selection belongs outside the logo component.

The logo component may display:

- Requested logo variant
- Requested size
- Requested theme
- Optional link behavior
- Accessible label
- Decorative state

The logo component must not decide:

- Current page route
- Current product mode
- Whether demo mode is active
- Whether wallet is connected
- Whether user is onboarded
- Whether financial data is valid
- Whether Smith AI is open
- Whether a financial action should proceed

---

## Do

- Use approved logo assets from `assets/logo/`.
- Use full logo when space allows.
- Use symbol when space is compact.
- Preserve aspect ratio.
- Maintain clear space.
- Use correct light/dark variant.
- Provide accessible label when logo is interactive.
- Hide decorative logo from assistive technologies when appropriate.
- Keep logo usage consistent.
- Keep product logic outside the logo component.

---

## Do Not

- Do not store full SVG code in `components/logo.md`.
- Do not recreate the wordmark using live text.
- Do not stretch, crop, recolor, rotate, or decorate the logo.
- Do not use logo as a spinner.
- Do not use logo as a status indicator.
- Do not use logo as Smith AI avatar unless explicitly approved.
- Do not place logo inside every card or chart.
- Do not place logo on low-contrast backgrounds.
- Do not add Demo, Top Pick, warning, or success badges directly to the logo.
- Do not imply recommendation, custody, execution, or guaranteed returns through logo usage.
- Do not hardcode raw visual values.
