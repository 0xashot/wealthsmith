# Card

Cards are reusable containers that group related information and actions in WealthSmith.

They help users scan portfolio data, suggestions, wallet details, protocol options, metrics, and dashboard modules in a structured way.

This is the base card contract. Product-specific cards such as suggestion cards, portfolio cards, metric cards, wallet cards, and protocol cards should build on top of this contract.

---

## Purpose

Use cards to group related content into a clear, scannable surface.

Cards should help users understand:

- What the content is about
- Why it matters
- What state it is in
- What action, if any, is available
- How the information relates to the surrounding page

Cards should make complex financial information feel organized, calm, and approachable.

---

## When to Use

Use a card when content needs to be visually grouped.

Examples:

- Portfolio summary
- Asset group
- Suggestion preview
- Metric block
- Wallet summary
- Protocol option
- Empty state
- Educational explanation
- Settings section
- Onboarding step
- Smith AI context block

Cards are useful when content includes:

- A title
- Supporting text
- Metrics
- Status
- Actions
- Metadata
- Icons
- Charts
- Related items

---

## When Not to Use

Do not use a card when:

- Content is only a single inline label
- A simple list row is enough
- The surface adds unnecessary visual weight
- The content does not need grouping
- The UI becomes too nested or crowded
- The card would contain unrelated topics

Do not use cards to hide business logic.

A card can show a suggestion, but it must not decide:

- Which suggestion appears
- Which suggestion is the Top Pick
- How portfolio health is calculated
- How safety buffer is calculated
- Which protocol should be selected
- How Smith AI explains the recommendation

That logic belongs in `rules/`.

---

## Anatomy

A card can include:

1. Container
2. Header
3. Optional icon or visual marker
4. Optional badge or status indicator
5. Title
6. Supporting text
7. Body content
8. Optional metric or data area
9. Optional chart or visualization
10. Optional footer
11. Optional actions
12. Optional metadata

Required:

- Container
- Main content

Optional:

- Header
- Title
- Description
- Icon
- Badge
- Status
- Metric
- Chart
- Footer
- Actions
- Metadata

Cards should not require every anatomy part. Keep the structure appropriate to the content.

---

## Variants

### Default Card

Use for standard grouped content.

Examples:

- Dashboard module
- Settings section
- Portfolio block
- Educational note

Token guidance:

- Background: `color.surface.card`
- Border: `color.border.subtle`
- Radius: `radius.surface.md`
- Shadow: `shadow.card.default`
- Padding: `spacing.card.padding.md`

---

### Flat Card

Use when the card should group content without strong elevation.

Examples:

- Dense dashboard sections
- Nested content blocks
- Secondary modules

Token guidance:

- Background: `color.surface.card`
- Border: `color.border.subtle`
- Radius: `radius.surface.md`
- Shadow: `shadow.surface.flat`
- Padding: `spacing.card.padding.md`

---

### Interactive Card

Use when the entire card is clickable or selectable.

Examples:

- Selectable wallet card
- Selectable protocol option
- Suggestion preview that opens details
- Asset card that opens an asset page

Token guidance:

- Background: `color.surface.card`
- Border: `color.border.subtle`
- Hover shadow: `shadow.card.hover`
- Selected shadow: `shadow.card.selected`
- Radius: `radius.surface.md`
- Motion: `motion.interaction.hover`

Interactive cards must have a visible focus state.

---

### Elevated Card

Use for high-emphasis content that should stand out.

Examples:

- Featured dashboard module
- Primary portfolio summary
- Important suggestion summary
- Key onboarding panel

Token guidance:

- Background: `color.surface.card`
- Border: `color.border.subtle`
- Radius: `radius.surface.lg`
- Shadow: `shadow.surface.prominent`
- Padding: `spacing.card.padding.lg`

Use elevated cards sparingly.

---

### Status Card

Use when the card communicates a clear state.

Examples:

- Warning state
- Success state
- Error state
- Info state
- Empty state

Token guidance:

- Info: `color.feedback.info`
- Success: `color.feedback.success`
- Warning: `color.feedback.warning`
- Danger: `color.feedback.danger`

Status cards should use color plus text. Do not rely on color alone.

---

## Sizes

### Small

Use for compact cards in dense layouts.

Examples:

- Small metric cards
- Wallet rows
- Compact asset cards
- Secondary dashboard modules

Token guidance:

- Padding: `spacing.card.padding.sm`
- Gap: `spacing.card.gap.sm`
- Radius: `radius.surface.sm`

---

### Medium

Default card size.

Examples:

- Standard dashboard modules
- Portfolio sections
- Suggestion previews
- Settings blocks

Token guidance:

- Padding: `spacing.card.padding.md`
- Gap: `spacing.card.gap.md`
- Radius: `radius.surface.md`

---

### Large

Use for prominent cards with richer content.

Examples:

- Portfolio summary
- Onboarding panel
- Main suggestion module
- Educational explanation block

Token guidance:

- Padding: `spacing.card.padding.lg`
- Gap: `spacing.card.gap.lg`
- Radius: `radius.surface.lg`

---

## States

Cards may support these states depending on usage.

### Default

Normal card state.

### Hover

Used for interactive cards.

Hover should show subtle feedback.

Use:

- `motion.interaction.hover`
- `shadow.card.hover`

### Pressed

Used when the card is actively pressed or selected.

Use:

- `motion.interaction.press`

### Focus

Required for interactive cards.

Focus must be visible for keyboard users.

Use:

- `shadow.control.focus`
- `color.focus.outline.default`

### Selected

Use when the card is selected in a group.

Examples:

- Selected wallet
- Selected protocol
- Selected filter option
- Selected onboarding choice

Selected cards should communicate selection with more than color.

Use:

- Border
- Badge
- Check icon
- State text
- Background tint where appropriate

### Disabled

Use when the card or its action is unavailable.

Disabled cards should:

- Remain readable
- Avoid implying the action is available
- Explain why the card is disabled when the reason is important

### Loading

Use when card content is being fetched or calculated.

Loading cards may use:

- Skeleton placeholders
- Loading text
- Disabled actions
- Preserved layout size to prevent layout shift

### Error

Use when the card content failed to load or could not be calculated.

Error cards should explain:

- What happened
- Whether the user can retry
- What action is available

Use calm, specific language.

---

## Token Usage

Cards must use semantic tokens.

Do not hardcode colors, spacing, typography, radius, shadows, or motion.

### Correct

```text
background: color.surface.card
border: color.border.subtle
padding: spacing.card.padding.md
gap: spacing.card.gap.md
border-radius: radius.surface.md
box-shadow: shadow.card.default
transition: motion.interaction.hover
```

### Incorrect

```text
background: #F9FAFB
padding: 24px
border-radius: 12px
box-shadow: 0px 2px 4px rgba(0,0,0,0.06)
transition: 180ms ease
```

---

## Responsive Behavior

Cards should be mobile-first.

### Mobile

- Cards should usually stack vertically.
- Avoid multiple dense columns.
- Use readable padding.
- Actions may stack vertically when needed.
- Avoid horizontal overflow.
- Tables inside cards should become stacked rows or scroll carefully.

### Tablet

- Cards may appear in one or two columns.
- Related cards may sit side by side if content remains readable.
- Keep consistent gaps between cards.

### Desktop

- Cards may use multi-column layouts.
- Dashboard cards should align to the grid.
- Avoid overly wide text lines inside cards.
- Important cards may span multiple columns.

### Wide

- Keep cards within readable max content widths.
- Do not stretch card content unnecessarily.
- Use spacious but controlled layout rhythm.

---

## Accessibility

Cards must support accessibility by default.

For static cards:

- Use semantic HTML structure.
- Keep headings in logical order.
- Ensure readable contrast.
- Do not rely on color alone for meaning.

For interactive cards:

- Make keyboard focus visible.
- Use correct interactive semantics.
- Support Enter and Space when behaving like a button.
- Use links when the card navigates.
- Use buttons when the card triggers an action.
- Avoid nesting multiple conflicting interactive targets.

For status cards:

- Communicate status with text, not only color.
- Use icons or labels where helpful.
- Ensure screen readers can understand the status.

---

## Content Rules

Card content should be:

- Clear
- Calm
- Scannable
- Specific
- Beginner-friendly
- Non-hype
- Useful without overexplaining

Card titles should be short and descriptive.

Good examples:

```text
Portfolio summary
Safety buffer
Connected wallets
Top suggestion
Protocol details
Estimated earnings
```

Avoid vague titles:

```text
Info
Details
Data
Stuff
Important
```

Card body copy should explain what the user needs to know without overwhelming them.

For financial content:

- Avoid hype
- Avoid guarantees
- Avoid pressure language
- Explain risk or uncertainty where relevant
- Do not invent recommendation logic

Avoid:

```text
Guaranteed return
Best investment
Maximize gains
Risk-free yield
Buy now
```

---

## Actions

Cards may include actions.

Examples:

- View details
- Review suggestion
- Add wallet
- Connect wallet
- Try again
- Dismiss
- Learn more

Action rules:

- Use one primary action when possible.
- Keep secondary actions lower emphasis.
- Do not overload cards with too many actions.
- Use button rules from `components/button.md`.
- Actions should be related to the card content.

A card should not contain unrelated actions.

---

## Do

- Use cards to group related content.
- Use semantic tokens.
- Keep card content scannable.
- Use consistent padding and gaps.
- Make interactive cards keyboard accessible.
- Communicate selected and status states clearly.
- Keep product-specific decision logic out of the card.
- Use clear titles and calm explanatory copy.
- Build product-specific cards on top of this base card contract.

---

## Do Not

- Do not hardcode raw visual values.
- Do not use cards for every piece of content.
- Do not over-nest cards.
- Do not make static cards look clickable.
- Do not rely on color alone for status.
- Do not put recommendation logic inside cards.
- Do not make the entire card clickable when it contains conflicting nested actions.
- Do not use hype-based financial language.
- Do not imply custody, execution, or investment action unless the product actually supports it.
