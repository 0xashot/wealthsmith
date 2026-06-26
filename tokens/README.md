# Tokens

This folder contains the foundational design tokens for the WealthSmith design system.

Tokens are the source of truth for visual decisions such as color, spacing, typography, breakpoints, radius, shadows, motion, and z-index.

Claude Code and engineers should use these tokens instead of hardcoding visual values.

---

## Token Structure

Tokens are split into two layers:

```text
tokens/
  primitives/
  semantic/
```

---

## 1. Primitive Tokens

Primitive tokens are raw values.

They define the actual values used by the design system, such as:

```text
#003DFF
16px
Manrope
1280px
12px radius
180ms
z-index 700
```

Primitive tokens should not describe product meaning.

Example primitive tokens:

```text
color.brand.blue.600
spacing.4
typography.fontSize.16
radius.lg
shadow.md
motion.duration.base
zIndex.modal
```

### Primitive token files

```text
tokens/primitives/color.json
tokens/primitives/spacing.json
tokens/primitives/typography.json
tokens/primitives/breakpoint.json
tokens/primitives/radius.json
tokens/primitives/shadow.json
tokens/primitives/motion.json
tokens/primitives/z-index.json
```

---

## 2. Semantic Tokens

Semantic tokens map primitive values to UI meaning.

They explain where and why a value should be used.

Example semantic tokens:

```text
color.action.primary.background.default
spacing.page.padding.mobile
typography.body.md
radius.control.md
shadow.card.default
motion.interaction.hover
zIndex.overlay.modal
```

Components should use semantic tokens by default.

### Semantic token files

```text
tokens/semantic/color.json
tokens/semantic/spacing.json
tokens/semantic/typography.json
tokens/semantic/breakpoint.json
tokens/semantic/radius.json
tokens/semantic/shadow.json
tokens/semantic/motion.json
tokens/semantic/z-index.json
```

---

## Usage Rule

Use semantic tokens in components.

Use primitive tokens only when defining semantic tokens.

Do not hardcode raw values directly in components.

### Correct

```text
background: color.action.primary.background.default
padding: spacing.card.padding.md
font: typography.button.md
radius: radius.control.md
shadow: shadow.card.default
```

### Incorrect

```text
background: #003DFF
padding: 24px
font-size: 16px
border-radius: 12px
box-shadow: 0px 2px 4px rgba(0,0,0,0.06)
```

---

## Design Principles

Tokens should support the WealthSmith product principles:

1. Trust first
2. Clarity over cleverness
3. Calm fintech experience
4. Beginner-friendly readability
5. Mobile-first layouts
6. Deterministic UI behavior
7. Accessibility and WCAG AA contrast
8. Explainable product decisions

---

## Naming Convention

Use lowercase, dot-separated names.

Pattern:

```text
category.group.role.state
```

Examples:

```text
color.text.primary
color.action.primary.background.hover
spacing.section.gap.md
typography.metric.primary
radius.surface.md
shadow.overlay.modal
motion.overlay.enter
zIndex.feedback.toast
```

Avoid vague names like:

```text
blue
big
small
niceShadow
mainColor
```

---

## Implementation Guidance for Claude Code

When building WealthSmith UI:

1. Start with semantic tokens.
2. Do not invent new visual values.
3. Do not use raw hex codes, pixel values, shadows, or z-index numbers directly.
4. Use primitive tokens only when creating or updating semantic tokens.
5. Respect mobile-first behavior.
6. Keep financial UI calm, readable, and trustworthy.
7. Use Space Grotesk for metrics and financial numbers.
8. Use Manrope for headings, body text, labels, and general UI copy.
9. Use semantic feedback colors for success, warning, danger, and info states.
10. Use reduced motion behavior when required by user settings.

---

## Completed Token Foundation

The current foundation includes:

```text
color
spacing
typography
breakpoint
radius
shadow
motion
z-index
```

These token files are the foundation for WealthSmith component contracts and UI implementation.
