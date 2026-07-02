# WealthSmith App — Implementation Notes

Implementation lives entirely under `app/`. The source-of-truth folders
(`tokens/`, `assets/`, `components/`, `patterns/`, `rules/`, `content/`,
`examples/`, `templates/`, `checklists/`) are read-only for this app and are
never modified by it.

## Status

- **Step 1 (complete):** Vite + React + TypeScript scaffold, token pipeline,
  base styles, token smoke-test placeholder page.
- **Step 2 (complete):** connected-wallet Dashboard shell — Global Nav
  (wallet-connected variant), page header, alert banner, Financial Snapshot,
  Safety Buffer, Projected Growth, Current vs Recommended Allocation, and the
  Smith AI Suggestions rail, all rendered from
  `examples/dashboard/dashboard-connected-wallet-state.json`.
- **Step 2.1 (complete):** aligned to the design-system clarification pass:
  - Chart axis/category/legend labels use `typography.chart.label`; plot
    value labels use `typography.chart.value` (metric typography removed
    from charts per components/chart.md Label Typography).
  - Chart cards: description sits directly under the heading; allocation
    legend moved to the bottom of the card content.
  - Global Nav active indicator is a bottom-edge bar aligned to the item's
    horizontal bounds (nav items stretch to bar height on desktop); the
    text underline was removed. 2px bar thickness is a documented
    spec-level value (no indicator-size token exists).
  - Suggestion card icons are data-driven per suggestion-card.md (Icons):
    cards whose `protocol_decision.destination_protocol_id` names a
    destination use the approved protocol icon (BONK card → Jupiter,
    locked yield card → Kamino); generic UI icons only for cards with no
    protocol identity (Safety Buffer Top Pick → shield-check). A missing
    protocol icon logs a console error and renders the protocol name with
    no unapproved fallback.
- **Step 2.2 (complete):** chart legend markers and axis alignment per the
  clarified components/chart.md (Legend Markers, Axis Label Positioning):
  - All chart legends use the approved marker assets
    (`assets/icons/chart/chart-line-marker.svg` for the line series,
    `chart-dot-marker.svg` for allocation/progress legends), paired with
    visible text labels. The ad-hoc CSS swatches were removed.
  - The approved marker SVGs ship with a fixed `#0A0A0A` fill, so
    `LegendMarker` applies them as CSS masks tinted with chart series
    color tokens ("color should come from chart series tokens",
    assets/icons/README.md). Asset files are untouched. Note: masking
    renders the line marker as a solid silhouette (the white dot-center
    knockout in the source asset cannot survive an alpha mask).
  - Projected Growth uses milestone x-spacing per components/chart.md
    (Axis Label Positioning): `x = milestoneIndex / (milestoneCount − 1)`,
    so Year 0/1/3/5 sit at 0%/33.3%/66.7%/100% with equal visual gaps.
    One shared coordinate function positions the data point, value label,
    and axis label (the continuous-time formula is documented in chart.md
    for continuous-time charts only and is not used here). All labels use
    `textAnchor="middle"`; 32px plot side-padding prevents edge clipping
    without breaking point alignment.
  - All chart legends (`.chart-legend`) are horizontally centered at the
    bottom of the card content with markers vertically aligned to labels;
    the Safety Buffer card order is title → metric → progress bar →
    explanation text → centered Covered Buffer legend
    (patterns/dashboard-layout.md).
  - Legend labels: "Contributions" comes from the fixture series label
    (chart.md: legend labels must match data labels — the clarification's
    "Growth" example maps to this fixture's line series). "Covered Buffer"
    comes from the patterns/dashboard-layout.md Safety Buffer example; its
    marker color matches the progress fill (danger while underfunded).
    The allocation legend entries are the chart's actual series
    (Current / Recommended); Crypto and Stables are row group labels in
    this horizontal-bar layout, not legend series.
  - Legend marker size is 16px, consistent with the app's documented raw
    icon sizing (no `icon.size.*` tokens exist).
- **Step 3 (not started):** interactions — protocol handoff clicks
  (external new tab, `rel="noopener noreferrer"`), wallet menu / disconnect,
  Ask Smith AI panel, toasts.

### Step 2 intentional stubs

These render per spec but have no behavior yet (explicitly deferred):

- Wallet pill: renders provider + short address with `aria-haspopup="menu"`,
  but the menu (Disconnect Wallet) is not wired.
- Ask Smith AI button: renders per Global Nav variant 3, click is a no-op.
- Top Pick card CTA "Review" (`open_suggestion_detail`): no detail surface
  exists yet; button is a no-op.
- "Review on Jupiter" CTA: renders with external-link affordance and a
  new-tab accessible label, but does not open the protocol URL yet.
- Portfolio / Goal / Support nav links point at their fixture routes; those
  pages are out of slice scope (the SPA serves the Dashboard for any route).

## Token pipeline

`npm run tokens` (auto-runs before `dev` and `build`) executes
`scripts/build-tokens.mjs`, which:

1. Reads `../tokens/primitives/*.json` (resolution only) and
   `../tokens/semantic/*.json` (emitted).
2. Resolves Tokens Studio `{path}` references — against primitives first,
   then other semantic tokens, with a cycle guard. The build fails
   (exit code 1) on any unresolved reference.
3. Writes `src/styles/tokens.generated.css` (gitignored) containing one
   `:root` CSS custom property per semantic token.

Current output: 234 semantic tokens → 370 CSS custom properties, 0 warnings.

### CSS variable naming convention (mechanical, not invented)

Semantic token paths map 1:1 to variable names: dots → hyphens, camelCase
preserved.

| Token | CSS variable |
|---|---|
| `color.action.primary.background.default` | `--color-action-primary-background-default` |
| `spacing.card.padding.md` | `--spacing-card-padding-md` |
| `typography.body.md` (composite) | `--typography-body-md-font-family`, `-font-size`, `-font-weight`, `-line-height`, `-letter-spacing`, plus `-font` shorthand |
| `shadow.card.default` (boxShadow object) | `--shadow-card-default` (composed `x y blur spread color`) |
| `motion.interaction.hover` (composite) | `--motion-interaction-hover-duration`, `-easing`, `-property` |

## Assumptions and deviations log

1. **Fonts load from Google Fonts CDN** (Manrope, Space Grotesk — the two
   families defined in `tokens/primitives/typography.json`). The repo ships
   no font files under `assets/`. If fonts must be self-hosted, that needs a
   product decision (font files would have to be added outside `app/` or
   vendored into `app/`).
2. **Feedback color naming mismatch:** component specs reference shorthand
   names like `color.feedback.info` / `color.feedback.warning`, but the
   actual semantic tokens are granular:
   `color.feedback.{info|success|warning|danger}.background.{solid|tint}` and
   `.text.{onSolid|tint}`. Per approval constraint 4 (existing tokens only),
   the app maps spec intents to the granular tokens. No shorthand aliases
   were created.
3. **Global Nav explicit sizing:** `components/global-nav.md` recommends
   token names (`size.globalNav.height`, `radius.globalNav`, …) that do not
   exist in `tokens/semantic/`. Per constraint 4, step 2 will use the
   component-spec explicit values (height 64px, radius 16px, outer offset
   24px, content padding-x 12px, logo 221×32) directly and record them here.
   Note: `radius.xl` = 16px happens to match the nav radius, but no semantic
   nav-radius token exists, so the spec value is used as specified.
4. **Media queries:** breakpoint tokens are emitted as CSS variables for
   reference, but CSS custom properties cannot be used inside `@media`
   conditions. Step 2 will use the breakpoint values from
   `tokens/semantic/breakpoint.json` (mobile 320–767, tablet 768–1279,
   desktop 1280–1727, wide 1728+) as literal values in media queries, which
   is the approved system, not an invention.
5. **Approved assets** will be referenced from `../assets/` (served
   read-only via Vite `server.fs.allow`), never copied or modified.
6. ~~`src/App.tsx` is a temporary token smoke test~~ — replaced in step 2 by
   the Dashboard page.
7. **`spacing.control.*` padding tokens do not exist.** Component specs
   reference control padding only abstractly; buttons, nav items, badges,
   and pills map to the closest existing semantic tokens:
   `spacing.inline.gap.sm` (8px) for control padding-y,
   `spacing.inline.gap.md` (16px) for control padding-x,
   `spacing.inline.gap.xs` (4px) for badge padding-y. No new token names
   were created.
8. **Missing tokens with documented substitutes:**
   `color.icon.default` → icons render as approved SVG assets unmodified
   (never recolored); `color.surface.page` → `color.surface.main`;
   `zIndex.navigation.fixed` → `zIndex.navigation.primary`.
9. **Alert severity styling:** the fixture alert (severity `critical`)
   uses `color.feedback.danger.*` tokens with the state carried in text
   (title + description), never color alone. No badge copy was added
   beyond fixture-provided strings.
10. **Number presentation:** chart/allocation labels format the fixture's
    raw numbers for display only (`$7,500` via locale formatting, percents
    to at most one decimal). No values are computed or altered in meaning.
11. **Global Nav below desktop:** components/global-nav.md defines no mobile
    variant and forbids inventing hamburger behavior. Below 1280px the nav
    keeps all items visible in the same order and simply wraps
    (`flex-wrap`, `min-height: 64px`); at desktop it is fixed at 64px with
    no wrapping per spec. Revisit when a mobile nav spec exists.
12. **Fixture source for the rail is the dashboard fixture (3 cards).**
    `examples/suggestions/suggestions-buffer-underfunded.json` (4 cards,
    adds a strategy insight) remains the per-card contract/QA reference;
    the page-level fixture declares `suggestions_count: 3` and is treated
    as the page source of truth.

## Commands

```bash
cd app
npm install
npm run tokens   # regenerate tokens.generated.css
npm run dev      # tokens + dev server (port 5173)
npm run build    # tokens + type-check + production build
```
