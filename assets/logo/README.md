# Logo Assets

This folder contains approved WealthSmith logo assets and usage metadata.

Logo assets should be referenced by components and implementation code through approved filenames or `logo-registry.json`.

Do not recreate the logo using text.

Do not modify, recolor, stretch, crop, rotate, or decorate the logo.

---

## Approved Logo Cases

WealthSmith currently has two approved in-product logo cases.

```text
1. Logo on global navigation
2. Logo in Smith AI
```

---

## Folder Structure

Use this structure:

```text
assets/logo/
  README.md
  logo-registry.json
  wealthsmith-full-lockup.svg
  wealthsmith-symbol.svg
```

Optional future variants:

```text
wealthsmith-full-lockup-light.svg
wealthsmith-full-lockup-dark.svg
wealthsmith-symbol-light.svg
wealthsmith-symbol-dark.svg
favicon.svg
app-icon.svg
```

Do not add variants until they are needed and approved.

---

## Case 1: Logo on Global Navigation

Use the full WealthSmith lockup in the global navigation when space allows.

Asset:

```text
assets/logo/wealthsmith-full-lockup.svg
```

Use for:

- Desktop global navigation
- Expanded sidebar
- App shell brand area
- Authentication or onboarding entry screens, if needed

Rules:

- Use the full lockup: symbol + `wealthsmith` wordmark.
- Keep the wordmark readable.
- Preserve aspect ratio.
- Do not recreate `wealthsmith` using live text.
- Do not separate the symbol from the wordmark in this variant.
- Do not use this full lockup in cramped spaces.
- Do not use this as a chart, status, or action icon.
- If global navigation is collapsed, use the symbol variant instead.

Recommended sizing:

```text
desktop expanded nav: 160–220px wide
tablet expanded nav: 140–180px wide
mobile/top nav: use only when space allows
collapsed nav: use symbol, not full lockup
```

Accessibility:

If the logo is a home/dashboard link, use:

```text
aria-label="Go to WealthSmith dashboard"
```

If the logo is decorative because the page already has text identity nearby, use:

```text
aria-hidden="true"
```

---

## Case 2: Logo in Smith AI

Use the WealthSmith symbol only inside Smith AI.

Asset:

```text
assets/logo/wealthsmith-symbol.svg
```

Use for:

- Smith AI header
- Smith AI avatar/icon area
- Smith AI collapsed trigger, if product design uses the symbol
- Smith AI loading or context identity, if needed

Rules:

- Use symbol only, not full wordmark.
- Pair with readable text such as `Smith AI` when identity matters.
- Do not use the full WealthSmith lockup inside Smith AI messages.
- Do not use the symbol as a generic assistant magic icon.
- Do not animate the logo aggressively.
- Do not use the symbol as a spinner.
- Do not imply Smith AI can execute financial actions.
- Do not imply Smith AI guarantees answers or investment outcomes.

Recommended sizing:

```text
Smith AI header: 28–36px
Smith AI avatar/trigger: 32–40px
compact Smith AI surfaces: 24–32px
```

Accessibility:

If paired with visible `Smith AI` text, the symbol can be decorative:

```text
aria-hidden="true"
```

If icon-only, provide:

```text
aria-label="Open Smith AI"
```

or:

```text
aria-label="Smith AI"
```

depending on interaction.

---

## Logo vs Smith AI Identity

The WealthSmith logo identifies the product.

The Smith AI surface uses the WealthSmith symbol as an approved assistant identity mark.

Rules:

- Full WealthSmith lockup = global product identity.
- WealthSmith symbol = compact product/Smith AI mark.
- Smith AI should still be labeled with text when needed.
- Do not let the symbol imply autonomous execution.
- Do not use the symbol to imply financial certainty.

Good:

```text
[symbol] Smith AI
```

Bad:

```text
[symbol only] with no accessible label
```

---

## Asset Requirements

Logo SVG files must be production-ready.

Requirements:

- SVG format
- Includes `viewBox`
- Scales cleanly
- Preserves aspect ratio
- No scripts
- No external references
- No embedded tracking
- No unnecessary metadata
- No raster screenshot embedded inside SVG
- Uses approved brand geometry
- Uses approved brand colors
- Kebab-case filenames

Do not use screenshots as final logo assets.

The uploaded PNG screenshots can be used as visual references only.

Final implementation should use exported SVG assets.

---

## Naming Rules

Use stable asset names.

Approved current filenames:

```text
wealthsmith-full-lockup.svg
wealthsmith-symbol.svg
```

Avoid:

```text
logo.svg
logo-final.svg
logo-new.svg
wealthsmith2.svg
Untitled.svg
Screenshot-logo.svg
```

---

## Background Usage

Current approved assets are intended for light UI surfaces.

If dark surfaces are needed later, add approved light/dark variants.

Rules:

- Do not manually invert or recolor logo in code.
- Do not place logo on low-contrast backgrounds.
- Do not add shadows or outlines to force contrast.
- Use a different approved asset variant instead.

---

## Clear Space

Maintain clear space around the logo.

Recommended clear space:

```text
full lockup: at least spacing.stack.gap.md around logo
symbol: at least spacing.inline.gap.md around symbol
```

Rules:

- Do not crowd with nav items.
- Do not place badges on the logo.
- Do not place status indicators directly on the logo.
- Do not overlap the logo with announcements or controls.

---

## Interaction Rules

Logo may be interactive only when it acts as a navigation link.

Allowed interaction:

```text
Click logo -> Dashboard/Home
```

Rules:

- Interactive logo must be keyboard accessible.
- Interactive logo must have visible focus state.
- Interactive logo must have accessible label.
- Logo must not open unrelated menus.
- Logo must not trigger Smith AI unless it is specifically the Smith AI symbol trigger.
- Logo must not trigger financial actions.

---

## Do

- Use the full lockup in global navigation when space allows.
- Use the symbol in Smith AI.
- Use approved SVG assets.
- Preserve aspect ratio.
- Use accessible labels for interactive logo usage.
- Keep the logo clear, readable, and consistent.
- Reference assets through `logo-registry.json`.

---

## Do Not

- Do not store full SVG code in documentation files.
- Do not use PNG screenshots as final production logos.
- Do not recreate the wordmark with text.
- Do not stretch, crop, recolor, rotate, or decorate the logo.
- Do not use the full lockup inside Smith AI.
- Do not use the symbol without visible text or accessible label when identity matters.
- Do not use logo as a spinner.
- Do not add Demo, Top Pick, warning, or success badges to the logo.
- Do not imply recommendation, custody, execution, or guaranteed returns through logo usage.
