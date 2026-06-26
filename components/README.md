# Components

This folder defines reusable UI component contracts for the WealthSmith design system.

Component contracts explain how components should be structured, styled, used, and implemented across the product.

They are written for designers, engineers, product managers, and AI coding assistants such as Claude Code.

---

## Purpose

Components turn design tokens into reusable interface building blocks.

A component contract should define:

- What the component is for
- When to use it
- When not to use it
- Anatomy and structure
- Variants
- Sizes
- States
- Token usage
- Accessibility requirements
- Responsive behavior
- Content rules
- Do and do not examples

---

## Component Rule

Components describe UI behavior and visual structure.

Components must not contain WealthSmith business logic.

Business logic belongs in:

```text
rules/
```

Content and copy rules belong in:

```text
content/
```

Design tokens belong in:

```text
tokens/
```

Patterns and page-level flows belong in:

```text
patterns/
```

---

## Correct Component Responsibility

A component can define:

```text
Button variants
Card spacing
Input error state
Modal layout
Tooltip behavior
Table row density
Suggestion card visual structure
Portfolio card anatomy
Metric card typography
```

A component should not define:

```text
Which suggestion should appear
Which suggestion is the Top Pick
How safety buffer is calculated
Which token should be recommended
Which protocol should be selected
How risk level changes product logic
How Smith AI explains a recommendation
```

---

## Token Usage

Components should use semantic tokens by default.

Use tokens from:

```text
tokens/semantic/
```

Do not hardcode raw values.

### Correct

```text
background: color.surface.card
padding: spacing.card.padding.md
font: typography.body.md
radius: radius.surface.md
shadow: shadow.card.default
```

### Incorrect

```text
background: #F9FAFB
padding: 24px
font-size: 16px
border-radius: 12px
box-shadow: 0px 2px 4px rgba(0,0,0,0.06)
```

Primitive tokens should only be used when defining or updating semantic tokens.

---

## Required Component Contract Structure

Each component file should follow this structure:

```text
# Component Name

## Purpose

## When to Use

## When Not to Use

## Anatomy

## Variants

## Sizes

## States

## Token Usage

## Responsive Behavior

## Accessibility

## Content Rules

## Do

## Do Not
```

Use this structure consistently so humans and AI coding assistants can understand every component the same way.

---

## Core Components

The initial WealthSmith component set should include:

```text
button.md
card.md
input.md
modal.md
badge.md
tooltip.md
table.md
sidebar.md
suggestion-card.md
portfolio-card.md
metric-card.md
```

---

## Component Categories

### Base Components

Base components are small reusable UI elements.

Examples:

```text
button
input
badge
tooltip
modal
card
table
```

### Product Components

Product components are specific to WealthSmith product screens.

Examples:

```text
suggestion-card
portfolio-card
metric-card
wallet-card
asset-row
protocol-card
```

Product components may reference WealthSmith concepts, but they still must not contain decision logic.

---

## Accessibility Rules

All components must support accessibility by default.

Every component should define:

- Keyboard behavior
- Focus state
- Screen reader behavior where relevant
- Disabled state behavior
- Error state behavior where relevant
- Color contrast expectations
- Reduced motion expectations where relevant

Do not rely on color alone to communicate meaning.

Use labels, icons, helper text, or state text when needed.

---

## Responsive Rules

Components should be mobile-first.

A component contract should explain how the component behaves on:

```text
mobile
tablet
desktop
wide
```

Examples:

```text
Cards stack on mobile.
Tables may become stacked cards on mobile.
Smith AI panels become overlays on mobile and tablet.
Modals should fit small screens without horizontal scrolling.
```

---

## Content Rules

Component copy should follow WealthSmith voice:

```text
clear
calm
trustworthy
beginner-friendly
specific
non-hype
```

Buttons should use short action labels.

Errors should explain what happened and how to recover.

Tooltips should be brief and educational.

Components should not invent financial advice, recommendation logic, or protocol reasoning.

---

## Implementation Guidance for Claude Code

When building components:

1. Read `tokens/README.md` first.
2. Use semantic tokens only.
3. Follow the component contract structure.
4. Do not invent visual values.
5. Do not place business logic inside components.
6. Do not place long-form product copy inside components unless the component contract requires it.
7. Keep components reusable.
8. Keep product-specific logic in `rules/`.
9. Keep copy systems in `content/`.
10. Keep page-level compositions in `patterns/`.

---

## Review Checklist

Before a component is approved, confirm:

- It uses semantic tokens.
- It has clear variants.
- It has clear states.
- It explains responsive behavior.
- It includes accessibility requirements.
- It does not hardcode visual values.
- It does not contain business logic.
- It follows WealthSmith tone and product principles.
