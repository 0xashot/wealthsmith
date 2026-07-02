# WealthSmith App — Implementation Notes

Implementation lives entirely under `app/`. The source-of-truth folders
(`tokens/`, `assets/`, `components/`, `patterns/`, `rules/`, `content/`,
`examples/`, `templates/`, `checklists/`) are read-only for this app and are
never modified by it.

## Status

- **Step 1 (complete):** Vite + React + TypeScript scaffold, token pipeline,
  base styles, token smoke-test placeholder page.
- **Step 2 (not started):** connected-wallet Dashboard vertical slice.

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
6. **`src/App.tsx` is a temporary token smoke test** — it intentionally
   contains no dashboard UI, no financial values, and no product copy. It
   uses inline styles for the throwaway page only; step 2 components will
   use proper CSS with token variables.

## Commands

```bash
cd app
npm install
npm run tokens   # regenerate tokens.generated.css
npm run dev      # tokens + dev server (port 5173)
npm run build    # tokens + type-check + production build
```
