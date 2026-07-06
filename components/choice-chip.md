# Choice Chip

Choice Chips are compact, conversational, selectable options — the quick tappable
answers seen in assistant-guided flows (similar to Gemini / ChatGPT suggested
replies).

In WealthSmith they are used for guided onboarding questions, Smith AI suggested
prompts, and lightweight support topic shortcuts.

Choice Chips are a specialization of the base Chip (`components/chip.md`, "Choice
Chip" variant) tuned for conversational, one-question-at-a-time flows. This file
is the source of truth for that conversational usage; the base `chip.md` remains
the source of truth for filter / removable / token / wallet / count chips. When
they conflict for conversational choice groups, this file governs.

---

## Purpose

A Choice Chip is a compact single-select or multi-select option used inside
assistant-guided flows, onboarding questions, suggested replies, and lightweight
filtering.

It should help users:

- Answer one guided question quickly.
- Pick from a small, finite, approved set of options.
- Move through a conversational flow without opening a larger control.

### Primary MVP use

```text
Onboarding guided choice questions
Smith AI suggested prompts
Support topic shortcuts
```

### Not a replacement for

```text
SelectMenu in settings / editing surfaces (components/select-menu.md)
Primary buttons (components/button.md)
Protocol handoff CTAs
Form submit buttons
Transaction / action buttons
```

---

## Important Product Rule

Choice Chips are UI presentation controls only.

```text
Choice Chips do not change WealthSmith financial logic.
They must use approved copy and canonical IDs from the owning flow.
```

- Chips display predefined approved options only.
- Chips may map to canonical option IDs from the owning field (for example the
  Goal Settings option IDs `retire_early`, `build_long_term_wealth`, …).
- Chips do not invent or transform values.
- Chips do not make financial decisions.
- Chips do not select tokens, protocols, Top Pick, or actions unless that mapping
  is explicitly predefined by the owning flow.
- Chips do not execute transactions.
- Chips do not request wallet signatures.
- Chips do not mutate wallet, portfolio, suggestion, protocol, or dashboard state
  by themselves. Selection is reported to the parent, which owns the state.

---

## When to Use

- The user is answering one guided question at a time.
- The available answers are short, approved, and finite.
- The flow is assistant-like and conversational speed / feel matters.
- The options benefit from being immediately visible (no dropdown).

## When Not to Use

- Editing structured settings or reviewing saved values → `components/select-menu.md`.
- Options need descriptions or comparison → `components/select-card.md`.
- There are many options (long lists) → `components/select-menu.md`.
- The control submits, navigates, opens a modal, or starts a protocol handoff →
  `components/button.md`.
- Passive status labels → `components/badge.md`.

---

## Anatomy

```text
Choice Chip
  Container (pill)
  Label (approved text)
  Optional leading icon (16–20px, currentColor) — not required for MVP
  Selected indicator (border + weight/background, never color alone)

Choice Chip Group
  Accessible group label (the question)
  Chips (wrap across rows)
  Group validation error message (below the group)
```

Required: container, visible label, visible focus state, non-color-only selected
state.

---

## Variants

### Single-select

One chip selected at a time (radio-group semantics). Use for onboarding choice
questions such as Financial Goal, Risk Level, Time Horizon, Contribution Rhythm.

### Multi-select

Zero or more chips selected (checkbox-group semantics). Use for lightweight
filtering or "select all that apply" questions.

### Suggested prompt

A chip that triggers a predefined prompt or action (button semantics). Use for
Smith AI suggested prompts and Support topic shortcuts. Selecting it sends an
approved, predefined prompt — it does not free-type or invent a query.

### State variants

`Default` · `Hover` · `Focus` · `Active/pressed` · `Selected` · `Disabled` ·
`Error group state`.

---

## States

- **Default** — neutral surface, subtle border, primary text; not selected.
- **Hover** — subtle primary-soft surface (pointer affordance only; never
  hover-only meaning).
- **Focus** — visible focus ring (`shadow.control.focus`).
- **Active/pressed** — slightly stronger primary-soft surface.
- **Selected** — primary-tinted surface + primary/action border + primary/action
  text (and medium weight); state is conveyed by border + background + weight,
  never color alone.
- **Disabled** — muted surface, disabled text, muted border; not interactive and
  removed from or clearly unavailable in the tab order.
- **Error group** — the chip group shows a single error message below the group
  (same pattern as other form controls). Do not turn every chip red; the error
  applies to the whole group, not each option.

---

## Design Specs

- **Shape:** pill / fully rounded — `radius.control.pill` (999px).
- **Height:** 44px minimum on desktop; never below 40px. There is no control-height
  token today; height is achieved by label line-height + vertical padding, with a
  documented `min-height` if needed (see Token Usage → Missing tokens).
  - **Conversational quick-reply exception (Smith AI chat):** quick-reply chips
    in the Smith AI **onboarding chat** and the **Ask Smith AI conversation** are
    compact — max height **32px on desktop** and **40px on mobile** — to read as
    chat reply options rather than form controls. This overrides the 44px/40px
    minimum for those conversational contexts only.
- **Horizontal padding:** 20–24px depending on label length → `spacing.inline.gap.lg`
  (24px). (20px is not a discrete token; 24px is the standard.)
- **Vertical padding:** 10–12px → `spacing.card.gap.sm` (12px).
- **Gap between chips:** 12px horizontal and 12px vertical → `spacing.card.gap.sm`
  (12px) via `flex-wrap` row + column gap.
- **Text size:** body / action-label size, not caption — `typography.body.md`
  (16px) default; a selected chip may use `typography.button.md` (16px, 600) for
  emphasis so the size does not shift.
- **Font:** the same UI font as buttons and form controls (Manrope, via the
  typography tokens above).
- **Font weight:** regular by default; medium/semibold allowed for the selected
  state (matching buttons/controls).
- **Icon (optional, not required for MVP):** 16–20px, inherits `currentColor`,
  paired with a visible label (never icon-only).
- **Default background:** `color.subdued.neutral.background.default` (neutral/card
  surface; consistent with `chip.md`).
- **Default border:** `color.border.subtle`.
- **Default text:** `color.text.primary`.
- **Selected background:** `color.selection.background.default` (subtle primary tint).
- **Selected border:** `color.action.primary.background.default`.
- **Selected text:** `color.action.secondary.text.default` (primary/action text).
- **Hover background:** `color.action.secondary.background.hover` (primary-soft).
- **Hover border:** `color.action.secondary.stroke.default` or a stronger neutral.
- **Focus:** `shadow.control.focus`.
- **Active/pressed:** `color.action.secondary.background.pressed`.
- **Disabled background:** `color.subdued.neutral.background.default` (or
  `color.disabled.background.default` for a stronger fill).
- **Disabled text:** `color.text.disabled` (or `color.text.secondary`).
- **Disabled border:** `color.border.subtle` (muted).
- **Error group message:** standard form error text — `color.feedback.danger.text.tint`.
- **Shadow:** none by default (`shadow.control.default` is `none`); Choice Chips do
  not use shadows.
- Chips are **not full-width** by default and must **not** truncate onboarding
  choices; long labels stay readable and may wrap only if necessary.
- Chips wrap naturally across rows; the group must not create horizontal overflow.
- Must work inside narrow right-side panels (~320–380px) and on mobile.

---

## Responsive Behavior

- **Desktop / wide:** chips wrap in rows inside the panel/card; do not stretch.
- **Tablet / mobile:** chips still wrap; no horizontal scrolling by default.
- Minimum tap target stays at least 40px high.
- Use `flex-wrap` with tokenized row/column gaps (`spacing.card.gap.sm`).
- The chip group must not create horizontal overflow inside a ~320–380px panel.

---

## Accessibility

- **Single-select group:** radio-group semantics (`role="radiogroup"` with
  `role="radio"` + `aria-checked`, or native radios), roving arrow-key navigation.
- **Multi-select group:** checkbox semantics (`role`/native checkbox +
  `aria-checked`).
- **Suggested prompt chips:** may be plain `button`s when they trigger a
  predefined prompt/action.
- Each chip must expose its selected / checked / pressed state programmatically.
- Keyboard users must be able to select chips (Tab into the group; Arrow keys move
  between radios; Space/Enter select or toggle the focused chip).
- Focus state must be visible (`shadow.control.focus`).
- Disabled chips are skipped in the tab order or clearly marked unavailable.
- The chip group must have an accessible label (the question text).
- Validation errors use the same error-message pattern as other form controls
  (a single message below the group, associated to the group).
- Selected state must not rely on color alone — border, weight, and background
  also indicate state.
- Labels must be readable at normal zoom and 200% zoom.
- Do not rely on hover-only affordances.

---

## Usage Guidance

- Use Choice Chips when the user is answering one guided question at a time.
- Use Choice Chips when the answers are short, approved, and finite.
- Use Choice Chips in assistant-like flows where speed and conversational feel
  matter.
- Use `SelectMenu` instead when editing structured settings, reviewing saved
  values, or when there are too many options.
- Use `button` instead when the control submits, navigates, opens a modal, or
  starts a handoff.

---

## Examples

### 1. Onboarding Financial Goal (single-select)

Canonical option IDs from `patterns/goal-settings.md` (Approved Field Options):

```text
Retire Early             (retire_early)
Build Long-Term Wealth   (build_long_term_wealth)
Generate Passive Income  (generate_passive_income)
Save For Big Purchase    (save_for_big_purchase)
Not Sure Yet             (not_sure_yet)
```

### 2. Smith AI suggested prompts (suggested-prompt / button)

```text
Why this Top Pick?
How is my Safety Buffer calculated?
What does read-only mean?
Why is this action disabled?
```

Each chip sends a predefined, approved prompt; it does not free-type or invent a
query, and Smith AI answers remain explain-only per `rules/smith-ai-rules.md`.

### 3. Support shortcuts (suggested-prompt / button)

```text
Wallet safety
Suggestions
Demo Mode
Contact support
```

---

## Token Usage

Choice Chips must use semantic tokens (no raw values).

```text
radius:            radius.control.pill
default bg:        color.subdued.neutral.background.default
default border:    color.border.subtle
default text:      color.text.primary
hover bg:          color.action.secondary.background.hover
pressed bg:        color.action.secondary.background.pressed
selected bg:       color.selection.background.default
selected border:   color.action.primary.background.default
selected text:     color.action.secondary.text.default
disabled bg:       color.subdued.neutral.background.default (or color.disabled.background.default)
disabled text:     color.text.disabled
focus:             shadow.control.focus
label font:        typography.body.md (selected: typography.button.md)
gap:               spacing.card.gap.sm (12px)
padding-x:         spacing.inline.gap.lg (24px)
padding-y:         spacing.card.gap.sm (12px)
error text:        color.feedback.danger.text.tint
motion:            motion.interaction.hover
```

### Missing / gap tokens (flag for implementation)

- **No control-height token.** There is no `size.control.*` height token, so the
  44px-desktop / 40px-minimum target cannot be a pure token. Achieve it via
  label line-height + vertical padding, and add a documented `min-height` (a raw
  value exception like the Global Nav `height: 64px`) or introduce a
  `size.control.minHeight` token during implementation.
- **No 20px / 10px spacing tokens.** The spacing scale is 4 / 8 / 12 / 16 / 24 /
  32 / 48. Horizontal padding uses `spacing.inline.gap.lg` (24px) and vertical
  padding uses `spacing.card.gap.sm` (12px); exact 20px / 10px are not tokenized
  (not blocking — the token values sit within the specified ranges).
- **No dedicated control-padding token** (a pre-existing repo gap): chip padding
  maps to the closest gap tokens above, consistent with how buttons/nav/badges map
  control padding today.

---

## Relationship to Product Logic

Choice Chips render options and report selection. They never decide which option
is recommended, which is Top Pick, which token/protocol is best, or whether
onboarding is complete — those come from product logic and user state.

```text
Suggestion Engine = deterministic Brain
Top Pick Logic    = one Top Pick
Protocol Logic    = protocol selection
Smith AI          = explanatory Voice
Choice Chip       = UI rendering + selection report
```

---

## Do

- Use Choice Chips for short, approved, finite guided answers.
- Use canonical option IDs and approved labels from the owning flow.
- Use semantic tokens.
- Keep selected state visible with border + background + weight (not color alone).
- Keep chips wrapping; keep tap targets ≥ 40px.
- Keep product logic and state in the parent.

## Do Not

- Do not use Choice Chips to submit, navigate, open modals, or start handoffs.
- Do not use Choice Chips for structured editing/review (use SelectMenu).
- Do not invent options, IDs, labels, or selected state.
- Do not select tokens, protocols, Top Pick, or actions unless predefined.
- Do not execute transactions or request wallet signatures.
- Do not mutate wallet/portfolio/suggestion/protocol/dashboard state in the chip.
- Do not rely on color alone, hover-only affordances, or truncated onboarding
  labels.
- Do not add shadows or hardcode raw visual values.

---

## Done Criteria

Choice Chips are implemented correctly when:

- Options come from the owning flow's approved copy and canonical IDs.
- Single-select uses radio semantics; multi-select uses checkbox semantics;
  suggested-prompt chips are buttons for predefined prompts.
- Selected/checked/pressed state is exposed and not color-only.
- The group has an accessible label and a single form-style error message.
- Chips are pill-shaped, ≥ 40px tall (44px desktop target), wrap without
  horizontal overflow, and work in a ~320–380px panel and on mobile.
- Only semantic tokens are used; no financial logic lives in the component.
