# Icon Assets

This folder contains the approved WealthSmith MVP icon assets and usage metadata.

Icons should be referenced through approved filenames or `icon-registry.json`.

Do not invent icon names, paths, meanings, colors, or fallback behavior.

---

## MVP Icon Set

This is the complete MVP icon set.

```text
assets/icons/
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
```

This is enough for the MVP.

Do not add more icon categories unless the product needs them.

---

## Required Rename Before Locking

The chart line marker should be named:

```text
chart-line-marker.svg
```

If the current file is named:

```text
chart-marker.svg
```

rename it to:

```text
chart-line-marker.svg
```

Reason:

```text
chart-line-marker.svg
```

is specific and describes the icon’s role: a line-series marker in chart legends.

---

## Icon Categories

### UI Icons

UI icons are general product interface icons.

Use them for:

- Actions
- Navigation
- Controls
- Feedback
- Product context
- Chart-related UI entry points

Examples:

```text
refresh
close
external-link
info
goal
chart-pie
shield
sparkle
```

Rules:

- UI icons must use semantic icon color tokens.
- UI icons should not be the only source of important meaning.
- Icon-only buttons must have accessible labels.
- UI icons must not be used as token, wallet, or protocol identity icons.

`chart-pie.svg` belongs in `assets/icons/ui/` because it is a UI icon for allocation/chart contexts, not a chart legend marker.

---

### Chart Icons

Chart icons are only for chart legend markers or chart series markers.

Approved chart icons:

```text
chart-dot-marker.svg
chart-line-marker.svg
```

Rules:

- Chart marker icons are not identity icons.
- Always pair them with visible series labels.
- Color should come from chart data or chart series tokens.
- Do not name them after one data category.

Good:

```text
[chart-dot-marker] Crypto
[chart-dot-marker] Stables
[chart-line-marker] Growth
```

Bad:

```text
crypto-icon.svg
stables-icon.svg
growth-icon.svg
legend-icon.svg
```

---

### Token Icons

Token icons identify crypto assets.

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
- Use `assets/icons/fallback/fallback-token.svg` if a token icon is missing.
- Never show broken images.
- Do not infer token identity from icon alone.
- Do not imply a token is recommended because it has an icon.

Good:

```text
[sol icon] SOL
[usdc icon] USDC
[fallback-token icon] UNKNOWN
```

Bad:

```text
[icon only]
```

---

### Token Fallback Icon

For MVP, the only fallback icon is:

```text
assets/icons/fallback/fallback-token.svg
```

Use it when:

- A supported token has no uploaded token icon yet.
- A token icon fails to load.
- A token appears from wallet data but does not have a known icon.

Rules:

- The fallback token icon does not identify the token.
- Visible token symbol/name must still appear.
- Do not hide a token row because the icon is missing.
- Do not show broken image icons.
- Do not guess a token icon from a similar-looking token.

Do not create wallet, protocol, UI, chart, or status fallback icons for MVP.

---

### Wallet Icons

Wallet icons identify supported wallet providers.

Approved MVP wallet icons:

```text
backpack.svg
phantom.svg
solflare.svg
```

Rules:

- Wallet logos are approved exact assets.
- No wallet fallback icon is needed for MVP.
- Wallet icon alone is not enough when identity matters.
- Pair wallet icon with wallet name or address context.
- Do not imply ownership.
- Do not imply custody.
- Do not imply signing unless the flow actually requires signing.
- If a wallet logo is missing, treat it as an implementation issue and show text without a broken image.

---

### Protocol Icons

Protocol icons identify supported protocols or platforms.

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

- Protocol logos are approved exact assets.
- No protocol fallback icon is needed for MVP.
- Protocol icon alone is not enough when identity matters.
- Pair protocol icon with protocol name.
- Suggestion cards tied to a specific protocol destination use that protocol's icon; generic UI icons are only for suggestions without a protocol identity. See `components/suggestion-card.md` (Icons).
- Do not imply WealthSmith recommends a protocol because the icon appears.
- Recommendation state must come from Protocol Decision Logic.
- If a protocol logo is missing, treat it as an implementation issue and show text without a broken image.

---

## Status Icons

Do not create a separate `status/` folder for MVP.

Some UI icons can be status-capable when parent state provides the status.

Examples:

```text
circle-check.svg -> success / completed
check.svg -> selected / completed
info.svg -> info
shield-check.svg -> protected / verified context
close.svg -> close / dismiss / error context
trending-up.svg -> positive trend context
trending-down.svg -> negative trend context
```

Rules:

- Status icon does not decide status.
- Parent state must explicitly provide success, warning, error, completed, blocked, or info state.
- Do not use a status-capable icon to imply safety, verification, or recommendation unless product state provides that meaning.

---

## SVG Quality Rules

All SVG icons must be production-ready.

Requirements:

- SVG format
- Includes `viewBox`
- Scales cleanly
- No scripts
- No external references
- No embedded tracking
- No unnecessary metadata
- No raster screenshot embedded inside SVG
- Kebab-case filenames
- Consistent visual style for UI icons

For UI icons:

- Prefer `stroke="currentColor"` or `fill="currentColor"` depending on icon style.
- Do not hardcode product-state colors inside UI SVG files unless specifically approved.

For token, wallet, and protocol logos:

- Preserve official brand colors unless product rules say otherwise.

---

## Accessibility Rules

Decorative icons:

```text
aria-hidden="true"
focusable="false"
```

Icon-only buttons:

```text
aria-label="Refresh portfolio"
```

Meaningful icons with visible text:

```text
Icon aria-hidden="true"
Visible text: Refresh portfolio
```

Rules:

- Do not rely on color alone.
- Do not use icon-only identity for tokens, wallets, or protocols.
- Do not expose meaningless SVG paths to screen readers.
- Icons should not be focusable unless the parent control is interactive.

---

## Color Rules

UI icons should use semantic color tokens.

Examples:

```text
color.icon.default
color.icon.subtle
color.icon.disabled
color.feedback.success.icon
color.feedback.warning.icon
color.feedback.error.icon
```

Chart marker icons should receive color from chart series tokens.

Examples:

```text
Crypto -> color.chart.series.1
Stables -> color.chart.series.3
Growth -> color.chart.series.1
```

Token, wallet, and protocol icons should preserve their approved brand colors.

Do not hardcode colors in component code.

---

## Do

- Use approved SVG icons from this folder.
- Keep icons categorized by purpose.
- Use `icon-registry.json` for machine-readable references.
- Pair important icons with visible text.
- Use `assets/icons/fallback/fallback-token.svg` only for missing token icons.
- Use semantic color tokens for UI icons.
- Keep chart marker icons separate from UI icons.
- Keep `chart-pie.svg` in `assets/icons/ui/`.
- Treat missing wallet/protocol icons as implementation issues.

---

## Do Not

- Do not invent icon paths.
- Do not use screenshots as final icons.
- Do not show broken images.
- Do not use token icons without token symbols/names.
- Do not use wallet icons to imply ownership or custody.
- Do not use protocol icons to imply recommendation.
- Do not use chart markers as identity icons.
- Do not create wallet/protocol fallback icons for MVP.
- Do not create a separate status folder for MVP.
- Do not hardcode icon colors or sizes in component code.
- Do not imply recommendation, custody, execution, or guaranteed returns through icon usage.
