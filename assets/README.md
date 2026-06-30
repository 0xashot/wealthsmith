# Assets

This folder contains shared visual resources for the WealthSmith design system.

Assets are production-ready files used by components, patterns, and implementation code.

Assets should be organized, named consistently, and referenced through the appropriate registry files when available.

---

## Purpose

The `assets/` folder stores approved visual and motion files such as:

- Logo assets
- UI icons
- Chart marker icons
- Token icons
- Wallet logos
- Protocol logos
- Fallback token icon
- Product animation assets

Assets help engineers and AI coding tools use the correct files without guessing names, locations, or usage rules.

---

## Folder Structure

Current MVP structure:

```text
assets/
  README.md

  logo/
    README.md
    logo-registry.json
    wealthsmith-full-lockup.svg
    wealthsmith-symbol.svg

  icons/
    README.md
    icon-registry.json

    chart/
      chart-dot-marker.svg
      chart-line-marker.svg

    fallback/
      fallback-token.svg

    protocol/
      hubble.svg
      jito.svg
      jupiter.svg
      kamino.svg
      marinade.svg
      meteora.svg
      ondo.svg
      orca.svg
      raydium.svg
      sanctum.svg

    token/
      bonk.svg
      bsol.svg
      dai.svg
      jitosol.svg
      jto.svg
      jup.svg
      jupsol.svg
      msol.svg
      ray.svg
      sol.svg
      usdc.svg
      usdt.svg

    ui/
      arrow-up.svg
      brush-cleaning.svg
      chart-pie.svg
      check.svg
      chess-knight.svg
      chevron-down.svg
      chevron-left.svg
      chevron-right.svg
      chevron-up.svg
      circle-check.svg
      close.svg
      coins.svg
      external-link.svg
      goal.svg
      house.svg
      info.svg
      log-out.svg
      message-circle.svg
      more.svg
      move-right.svg
      rotate-ccw.svg
      shield-check.svg
      shield.svg
      sparkle.svg
      thumbs-down.svg
      thumbs-up.svg
      trending-down.svg
      trending-up.svg
      undo.svg

    wallet/
      backpack.svg
      phantom.svg
      solflare.svg

  animations/
    README.md
    animation-registry.json
    smith-ai-symbol-loop.json
```

This structure is enough for the MVP.

---

## Asset Registries

Assets that need machine-readable usage rules should have registry files.

Current registries:

```text
assets/logo/logo-registry.json
assets/icons/icon-registry.json
assets/animations/animation-registry.json
```

Registry files help Claude Code and engineers understand:

- Which asset exists
- Where the asset lives
- What the asset is used for
- What the asset must not be used for
- Whether a label is required
- Whether fallback behavior exists
- Whether reduced-motion behavior exists
- Whether the asset should preserve original colors
- Whether the asset should use semantic color tokens
- Which component should render the asset

Do not make implementation code guess asset paths.

---

## Logo Assets

Logo assets live in:

```text
assets/logo/
```

Approved MVP logo files:

```text
wealthsmith-full-lockup.svg
wealthsmith-symbol.svg
```

### Full Lockup

Use:

```text
assets/logo/wealthsmith-full-lockup.svg
```

For:

- Global navigation
- Expanded sidebar
- App shell brand area
- Onboarding/auth entry surfaces when needed

Do not use the full lockup inside Smith AI.

### Symbol

Use:

```text
assets/logo/wealthsmith-symbol.svg
```

For:

- Smith AI
- Collapsed navigation
- Compact product identity
- Favicon/app-icon source when needed
- Static fallback for Smith AI animation when reduced motion is enabled

Rules:

- Do not modify logo assets.
- Do not recreate the wordmark using live text.
- Do not stretch, crop, rotate, recolor, or decorate the logo.
- Do not use logo as a spinner.
- Do not add Demo, Top Pick, warning, or success badges to the logo.
- Do not use logo to imply custody, recommendation, execution, or guaranteed returns.

See:

```text
assets/logo/README.md
assets/logo/logo-registry.json
components/logo.md
```

---

## Icon Assets

Icon assets live in:

```text
assets/icons/
```

Approved MVP icon categories:

```text
ui/
chart/
token/
wallet/
protocol/
fallback/
```

### UI Icons

Use for interface actions, navigation, controls, and product context.

Examples:

```text
close.svg
info.svg
external-link.svg
chart-pie.svg
shield.svg
sparkle.svg
```

Rules:

- UI icons should use semantic icon color tokens.
- UI icons should not be the only source of important meaning.
- Icon-only buttons must have accessible labels.
- UI icons must not be used as token, wallet, or protocol identity icons.

### Chart Icons

Use only for chart legend or chart series markers.

Approved:

```text
chart-dot-marker.svg
chart-line-marker.svg
```

Rules:

- Chart marker icons must always be paired with a visible series label.
- Color should come from chart data or chart series tokens.
- Do not use chart markers as identity icons.

Good:

```text
[chart-dot-marker] Crypto
[chart-dot-marker] Stables
[chart-line-marker] Growth
```

### Token Icons

Use for token/asset identity.

Approved MVP token icons:

```text
bonk.svg
bsol.svg
dai.svg
jitosol.svg
jto.svg
jup.svg
jupsol.svg
msol.svg
ray.svg
sol.svg
usdc.svg
usdt.svg
```

Rules:

- Token icon alone is not enough.
- Always show token symbol or token name next to it.
- Use `fallback-token.svg` if a token icon is missing.
- Never show broken image icons.
- Do not imply a token is recommended because it has an icon.

### Wallet Icons

Use for supported wallet provider identity.

Approved MVP wallet icons:

```text
backpack.svg
phantom.svg
solflare.svg
```

Rules:

- Wallet icons are exact approved assets.
- No wallet fallback is used for MVP.
- Pair wallet icon with wallet name or address context when identity matters.
- Do not imply ownership, custody, or signing.

### Protocol Icons

Use for supported protocol/platform identity.

Approved MVP protocol icons:

```text
hubble.svg
jito.svg
jupiter.svg
kamino.svg
marinade.svg
meteora.svg
ondo.svg
orca.svg
raydium.svg
sanctum.svg
```

Rules:

- Protocol icons are exact approved assets.
- No protocol fallback is used for MVP.
- Pair protocol icon with protocol name when identity matters.
- Do not imply WealthSmith recommends a protocol because the icon appears.
- Recommendation state must come from Protocol Decision Logic.

### Fallback Icon

For MVP, the only fallback icon is:

```text
assets/icons/fallback/fallback-token.svg
```

Use only for missing token icons.

Rules:

- Fallback token icon does not identify the token.
- Always show token symbol/name next to it.
- Do not use fallback token icon alone.
- Do not create wallet, protocol, UI, chart, or status fallback icons for MVP.

See:

```text
assets/icons/README.md
assets/icons/icon-registry.json
components/icon.md
```

---

## Animation Assets

Animation assets live in:

```text
assets/animations/
```

Approved MVP animation:

```text
smith-ai-symbol-loop.json
```

Registry:

```text
assets/animations/animation-registry.json
```

### Smith AI Symbol Loop

Use:

```text
assets/animations/smith-ai-symbol-loop.json
```

For:

- Smith AI loading
- Building suggestions
- Generating strategy insights
- Preparing suggestion context
- Loading Smith AI explanation

Primary UI example:

```text
Building Your Suggestions...
We are checking your plan and wallet balance to find the best next actions.
No action will be taken automatically.
```

Rules:

- Use only for Smith AI or suggestion-building states.
- Always pair with clear loading copy.
- Always include reassurance when relevant.
- Do not use as a generic spinner.
- Do not use for wallet connection.
- Do not use for wallet approval.
- Do not use for portfolio refresh.
- Do not use for saving settings.
- Do not use for chart/table/card loading.
- Do not use as a success, error, or celebration animation.
- Do not imply WealthSmith is taking action automatically.
- Do not imply suggestions are guaranteed or final.
- Do not imply investment execution.

Reduced motion fallback:

```text
assets/logo/wealthsmith-symbol.svg
```

When reduced motion is enabled:

- Do not autoplay the loop.
- Show the static symbol instead.
- Keep the loading copy visible.
- Keep layout dimensions stable where possible.

See:

```text
assets/animations/README.md
assets/animations/animation-registry.json
components/loading-indicator.md
```

---

## SVG Requirements

All SVG assets must be production-ready.

Requirements:

- SVG format
- Has `viewBox`
- Scales cleanly
- No scripts
- No external references
- No embedded tracking
- No unnecessary metadata
- No raster screenshot embedded inside SVG
- Kebab-case filenames
- Stable filenames
- Version controlled

For UI icons:

- Prefer `stroke="currentColor"` or `fill="currentColor"` depending on the icon style.
- Do not hardcode product-state colors inside UI SVG files unless specifically approved.

For logo, token, wallet, and protocol assets:

- Preserve approved asset colors and geometry.
- Do not manually recolor in code unless the asset was designed for that use.

---

## Lottie / JSON Animation Requirements

All animation JSON assets must be production-ready.

Requirements:

- Stable kebab-case filename
- Stored in `assets/animations/`
- No external network dependencies
- No unsafe scripts
- No experimental files in production folders
- Tested with the production Lottie renderer
- Tested on mobile
- Loops cleanly if configured as loop
- Supports reduced-motion fallback
- Paired with accessible loading copy

For MVP, prefer vector-based Lottie JSON when available.

Do not keep temporary names like:

```text
Smith loop.json
Smith loop vector.json
```

Use:

```text
smith-ai-symbol-loop.json
```

---

## Naming Rules

Use stable, descriptive, kebab-case filenames.

Good:

```text
wealthsmith-full-lockup.svg
wealthsmith-symbol.svg
smith-ai-symbol-loop.json
chart-line-marker.svg
chart-dot-marker.svg
external-link.svg
message-circle.svg
fallback-token.svg
phantom.svg
jupiter.svg
usdc.svg
```

Avoid:

```text
logo-final.svg
new-icon.svg
blue-dot.svg
growth-icon.svg
animation.json
loader.json
Smith loop.json
Smith loop vector.json
Screenshot.svg
Untitled.svg
copy 2.svg
```

Do not name reusable assets after temporary colors, one-off screen labels, or specific mockup names.

---

## Accessibility Rules

Assets themselves do not provide full accessibility.

Components must apply accessibility behavior.

General rules:

- Decorative icons should be hidden from assistive technologies.
- Icon-only buttons must have accessible labels.
- Token, wallet, and protocol icons must be paired with visible names/symbols.
- Chart marker icons must be paired with visible series labels.
- Logos that are links must have accessible labels.
- Animations must be paired with accessible loading text.
- Animations must respect reduced motion.
- Do not rely on color alone.
- Do not rely on motion alone.

Examples:

```text
aria-hidden="true"
focusable="false"
```

```text
aria-label="Go to WealthSmith dashboard"
```

```text
aria-label="Refresh portfolio"
```

```text
role="status"
aria-live="polite"
aria-busy="true"
```

---

## What Claude Code Must Do

Claude Code should:

- Use assets from the approved folders.
- Use registry files instead of guessing paths.
- Use semantic tokens for UI icon color and sizing.
- Preserve original colors for token, wallet, protocol, and logo assets.
- Pair token icons with token symbols/names.
- Pair wallet icons with wallet names/address context.
- Pair protocol icons with protocol names.
- Pair chart markers with chart labels.
- Use fallback token icon only for missing token icons.
- Use `smith-ai-symbol-loop.json` only for approved Smith AI/suggestion-building states.
- Use static symbol fallback for reduced motion.
- Avoid broken images.
- Respect component rules from `components/icon.md`, `components/logo.md`, and `components/loading-indicator.md`.

---

## What Claude Code Must Not Do

Claude Code must not:

- Invent asset paths.
- Invent icon names.
- Invent animation names.
- Use screenshots as production assets.
- Use token icons without token labels.
- Use wallet icons to imply ownership or custody.
- Use protocol icons to imply recommendation.
- Use chart markers as identity icons.
- Use Smith AI animation as a generic spinner.
- Use Smith AI animation for wallet connection or portfolio refresh.
- Recreate the WealthSmith wordmark as live text.
- Modify, recolor, stretch, crop, or decorate the logo.
- Add badges to the logo.
- Rely on animation alone.
- Use logo or icons to imply guaranteed returns, custody, execution, safety, or recommendation.
- Hardcode colors or sizes in component code.

---

## Related Files

Logo usage:

```text
components/logo.md
assets/logo/README.md
assets/logo/logo-registry.json
```

Icon usage:

```text
components/icon.md
assets/icons/README.md
assets/icons/icon-registry.json
```

Animation usage:

```text
components/loading-indicator.md
assets/animations/README.md
assets/animations/animation-registry.json
```

Chart usage:

```text
components/chart.md
assets/icons/chart/
```

Token/wallet/protocol display:

```text
components/table.md
components/list-item.md
components/portfolio-card.md
components/select-menu.md
components/select-card.md
```
