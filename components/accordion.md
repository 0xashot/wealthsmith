# Accordion

Accordions reveal and hide sections of related content.

In WealthSmith, accordions may be used for FAQ sections, pricing/free-tier explanations, onboarding help, wallet connection help, educational content, settings support, risk explanations, and safety buffer explanations.

Accordions should make dense content easier to scan without hiding critical information users must see.

---

## Purpose

Use accordions when users need to scan a list of questions or topics and open only the sections they care about.

An accordion should help users:

- Scan related questions
- Expand one section for more detail
- Reduce page length
- Keep educational content organized
- Reveal supporting information without leaving the page
- Understand wallet, onboarding, pricing, risk, or product concepts

Accordions should organize existing content, not create new logic.

---

## Important Rule

Accordions reveal existing content.

Accordions do not generate answers, product logic, recommendations, or financial advice.

An accordion can display:

- Question
- Section title
- Answer
- Educational explanation
- Help content
- Supporting text
- Links
- Inline components
- Expanded state
- Collapsed state

An accordion must not decide:

- Which recommendation appears
- Which suggestion is Top Pick
- Whether a user should invest
- Whether a wallet is valid
- Whether a risk level is appropriate
- Whether safety buffer coverage is sufficient
- Whether onboarding is complete
- Whether a protocol is recommended
- Whether a token is suitable

Those decisions must come from product logic, backend rules, deterministic rules, content rules, or parent state.

The component should render accordion items and open state provided to it.

---

## When to Use

Use an accordion when content is related, scannable, and not all sections need to be visible at once.

Examples:

- FAQ questions
- Free tier details
- Demo mode explanation
- Wallet connection help
- Watch-only address explanation
- Safety buffer education
- Risk profile explanations
- Settings help
- Onboarding help
- Protocol explanation sections
- Pricing feature explanations
- Support articles in compact form

Accordions can appear in:

- FAQ pages
- Pricing pages
- Onboarding
- Settings
- Help centers
- Wallet connection flows
- Demo mode pages
- Educational sections
- Smith AI support/context panels
- Modals, only when content is short and controlled

---

## When Not to Use

Do not use an accordion for:

- Critical warnings
- Required disclosures
- Main onboarding steps
- Primary actions
- Form validation
- Short helper text
- Tooltip-level explanations
- Data tables
- Content users need to compare side by side
- Important financial risk notes that must always be visible
- Content that should be indexed as a full article or page

Use:

- `components/alert.md` for persistent contextual warnings
- `components/announcement.md` for global top banners
- `components/tooltip.md` for very short explanations
- `components/modal.md` for focused decisions
- `components/tabs.md` for sibling views
- `components/table.md` for structured comparison

Do not hide information that users must see before acting.

---

## Data Source

Accordions should render structured item data.

Expected data may include:

```text
id
title
content
isOpen
disabled
disabledReason
icon
badge
defaultOpen
allowMultipleOpen
ariaLabel
```

The exact schema can evolve.

The component should not invent titles, answers, content, open state, badges, or disabled reasons.

---

## Anatomy

An accordion can include:

1. Accordion group container
2. Accordion item
3. Header button
4. Title or question
5. Optional icon
6. Optional badge
7. Chevron or expand/collapse indicator
8. Content panel
9. Body text
10. Optional links or actions
11. Optional divider

Required:

- Accordion item
- Header button
- Title or question
- Expand/collapse indicator
- Content panel
- Accessible expanded/collapsed state

Optional:

- Icon
- Badge
- Description
- Link
- Action
- Divider
- Disabled state

The entire header should usually be clickable or tappable.

---

## Variants

### FAQ Accordion

Use for question-and-answer sections.

Examples:

```text
What does the Free Tier include?
Can I try the personalized plan without connecting my crypto wallet?
How does Demo Mode work?
```

Rules:

- Question should be clear and specific.
- Answer should be concise.
- Avoid vague questions like “More info?”
- Keep answers beginner-friendly.
- Do not use accordion answers to invent product behavior.

---

### Help Accordion

Use for educational or support content.

Examples:

```text
Why connect a wallet?
What is a watch-only address?
What does estimated APY mean?
```

Rules:

- Use calm educational language.
- Keep explanations short enough for inline reading.
- Link to longer content when needed.
- Do not hide critical warnings inside help accordions.

---

### Settings Accordion

Use for grouped settings explanations.

Examples:

```text
Wallet settings
Display preferences
Notification preferences
```

Rules:

- Do not hide active settings if users need to adjust them directly.
- Keep controls accessible if placed inside panels.
- Preserve form state when collapsing and expanding.

---

### Onboarding Explanation Accordion

Use carefully during onboarding.

Examples:

```text
Why do we ask for monthly expenses?
What is a risk level?
Can I continue without connecting a wallet?
```

Rules:

- During onboarding, Smith AI remains open as the guide.
- Accordion may provide optional supporting explanations.
- Do not hide required onboarding instructions inside collapsed panels.
- Do not use accordions as the main step navigation.
- Smith AI should not depend on accordion state to continue.

---

### Pricing / Plan Accordion

Use for plan and feature details.

Examples:

```text
What does the Free Tier include?
What is included in Pro?
Can I use WealthSmith without a wallet?
```

Rules:

- Plan details must come from product/pricing source of truth.
- Do not invent feature limits.
- Do not use misleading upgrade pressure.
- Keep copy clear and factual.

---

### Risk Education Accordion

Use for educational content about risk, diversification, buffer, or estimates.

Examples:

```text
What does overexposed mean?
What is a safety buffer?
Why are some values estimated?
```

Rules:

- Content must be educational, not individualized financial advice.
- Do not hide important risk notes users must see before action.
- Recommendation logic must stay outside the accordion.
- Use Smith AI for deeper explanation when supported.

---

### Compact Accordion

Use inside cards, side panels, or modals.

Rules:

- Keep header short.
- Keep content short.
- Avoid nesting many accordions.
- Do not use compact accordions for important warnings.

---

## Open Behavior

Accordions may support either single-open or multiple-open behavior.

### Single-Open Accordion

Only one item can be open at a time.

Use when:

- Content is long
- Page should stay compact
- Items are mutually related
- User is likely reading one answer at a time

Rules:

- Opening one item closes the previously open item.
- Open state belongs to parent state.

### Multiple-Open Accordion

Multiple items can be open at the same time.

Use when:

- Users may compare several answers
- Content sections are short
- Users may want to keep multiple references open

Rules:

- Each item controls its own open state.
- Parent state still owns open/closed state if controlled.

---

## Default Open State

Accordions may have one or more items open by default when product behavior provides that state.

Rules:

- Do not open items by default without reason.
- Important content should usually be visible without relying on default-open accordion.
- Default open state must come from parent/product state.
- Do not default-open content to create artificial urgency.

---

## Collapsed State

Collapsed accordion item should show:

- Title or question
- Chevron or expand indicator
- Optional icon or badge
- Clear hover/focus state when interactive

Rules:

- Content panel is hidden visually and accessibly unless implementation intentionally keeps it available.
- Title must still communicate what the content contains.
- Collapsed item should not look disabled.

---

## Expanded State

Expanded accordion item should show:

- Title or question
- Chevron or collapse indicator
- Content panel
- Body text
- Optional links/actions

Rules:

- Expanded state must be visually clear.
- Content should be close to the header.
- Header should still be clickable to collapse when allowed.
- Content should not unexpectedly shift focus unless product behavior requires it.

---

## Disabled State

Use disabled accordion items rarely.

Examples:

```text
Feature details unavailable
Coming soon
```

Rules:

- Disabled reason should be clear when useful.
- Disabled item should remain readable.
- Disabled item should not expand.
- Do not hide important unavailable information without explanation.

---

## Nested Accordions

Avoid nested accordions.

Rules:

- Nested accordions increase complexity.
- Use a page, tabs, or section headings for deeper content.
- If nesting is unavoidable, keep labels very clear and keyboard behavior predictable.

---

## Chevron and Icons

Accordions usually include a chevron or expand/collapse icon.

Rules:

- Chevron must visually indicate expanded/collapsed state.
- Chevron rotation should be subtle.
- Icon must not be the only indicator of state.
- Header text must remain clear.
- Icon-only headers are not allowed.

Examples:

```text
Chevron down = collapsed
Chevron up = expanded
```

---

## Actions Inside Accordion Content

Accordion panels may contain links or lightweight actions.

Examples:

```text
Learn more
Ask Smith AI
Connect wallet
Exit Demo
```

Rules:

- Actions must directly relate to the content.
- Use `components/button.md` for actions.
- Do not place destructive actions inside accordion content without confirmation.
- Do not place major financial execution actions inside FAQ content.
- If content opens Smith AI, pass structured context from parent state.

Allowed:

```text
Ask Smith AI
View details
Learn more
```

Avoid:

```text
Invest now
Swap now
Maximize yield
```

unless the product explicitly supports execution and the flow is safe.

---

## Sizes

### Compact

Use in cards, modals, and side panels.

Rules:

- Short title.
- Short content.
- Minimal padding.
- Avoid long paragraphs.

### Standard

Default accordion size.

Use for FAQ pages, help pages, pricing pages, and page sections.

### Prominent

Use when accordion questions are primary page content.

Rules:

- Use sparingly.
- Do not make accordions look like alerts or cards unless visual style intentionally uses card containers.
- Keep expanded content readable.

---

## States

Accordions must support these states.

### Collapsed

Item is closed.

### Expanded

Item is open.

### Hover

Indicates interactivity for pointer users.

### Focus

Required for keyboard users.

### Disabled

Item cannot be opened.

### Loading

Use when accordion content is loading.

Examples:

```text
Loading answer…
```

Rules:

- Do not show fake content.
- Preserve layout if possible.

### Error

Use when content fails to load.

Example:

```text
Could not load this answer.
```

Rules:

- Provide retry if appropriate.
- Do not invent fallback content.

---

## Token Usage

Accordions must use semantic tokens.

Do not hardcode colors, spacing, typography, radius, shadows, motion, or z-index.

### Correct

```text
background: color.surface.card
text: color.text.primary
secondary text: color.text.secondary
border: color.border.subtle
active border: color.action.primary.background.default
header title: typography.heading.sm
body text: typography.body.md
radius: radius.surface.lg
shadow: shadow.card.default
padding: spacing.card.padding.md
gap: spacing.stack.gap.md
focus: shadow.control.focus
motion: motion.surface.fadeIn
```

### Incorrect

```text
background: #FFFFFF
border: 1px solid #003DFF
border-radius: 24px
padding: 24px
font-size: 20px
transition: 300ms ease
```

---

## Color Usage

Accordion color should support state but not be the only signal.

Rules:

- Use visible title text.
- Use chevron state.
- Use border or background changes carefully.
- Expanded state may use stronger border when helpful.
- Do not use warning or danger colors unless the content state requires it.
- Ensure WCAG AA contrast.

---

## Motion

Accordion motion should be subtle and optional.

Allowed motion:

- Chevron rotation
- Content height expansion
- Fade in content
- Small spacing transition

Rules:

- Keep motion fast and calm.
- Respect reduced motion.
- Do not animate large content dramatically.
- Avoid motion that makes educational content feel gamified.

Use:

```text
motion.surface.fadeIn
motion.interaction.hover
motion.reducedMotion.default
```

---

## Responsive Behavior

Accordions should be mobile-first.

### Mobile

- Header should be easy to tap.
- Content should wrap naturally.
- Avoid tiny chevrons.
- Use full-width accordion items.
- Avoid long unbroken text.
- Keep action buttons stacked when needed.
- Do not hide required onboarding instructions in collapsed sections.

### Tablet

- Accordions may use card-style containers.
- Keep content width readable.
- Keep spacing consistent.

### Desktop

- Accordions may be full-width within content column.
- Avoid stretching text too wide.
- Keep expanded content aligned with header.
- Use hover only as a visual state.

### Wide

- Constrain inner content width when needed.
- Do not let FAQ answers span unreadably across the screen.

---

## Accessibility

Accordions must support accessibility by default.

Requirements:

- Header must be a button or equivalent accessible control.
- Expanded/collapsed state must be communicated.
- Header button must be keyboard accessible.
- Focus state must be visible.
- Content panel must be associated with header.
- Do not rely on color alone.
- Contrast must meet WCAG AA.
- Icons must not be the only meaning.
- Reduced motion must be respected.
- Content order must be logical for screen readers.

Recommended semantics:

```text
button
aria-expanded="true"
aria-controls="accordion-panel-id"
id="accordion-header-id"
```

Panel:

```text
id="accordion-panel-id"
aria-labelledby="accordion-header-id"
```

Use heading structure where appropriate.

---

## Keyboard Behavior

Required keyboard behavior:

```text
Tab: move focus to accordion header
Enter: expand or collapse focused item
Space: expand or collapse focused item
Shift + Tab: move focus backward
```

Optional behavior for accordion groups:

```text
Arrow Down: move to next accordion header
Arrow Up: move to previous accordion header
Home: move to first accordion header
End: move to last accordion header
```

Rules:

- Keyboard behavior should remain predictable.
- Disabled items should not expand.
- Focus should not jump unexpectedly when an item opens or closes.
- If content contains interactive elements, they should be reachable after expansion.

---

## Content Rules

Accordion copy should follow WealthSmith voice:

- Clear
- Calm
- Specific
- Beginner-friendly
- Non-hype
- Educational when needed

Good question titles:

```text
What does the Free Tier include?
Can I try WealthSmith without connecting a wallet?
How does Demo Mode work?
What is a watch-only address?
Why are some values estimated?
```

Good answer style:

```text
Yes. Demo Mode lets you explore WealthSmith with sample data before connecting a wallet.
```

```text
A watch-only address lets WealthSmith view public wallet data. It cannot sign transactions or move funds.
```

Avoid vague titles:

```text
More info
Details
Question
Important
```

Avoid hype:

```text
How can I unlock huge profits?
How do I get guaranteed returns?
```

---

## Financial and Wallet Language Rules

Accordion content must be precise.

Allowed:

```text
Demo Mode
Sample data
Read-only
Watch-only
Public wallet data
Estimated
May change
Connected wallet
```

Avoid:

```text
Guaranteed
Risk-free
Best return
Profit mode
Auto-invest
Custody access
Funds secured
```

Do not imply WealthSmith can move funds, sign transactions, or execute financial actions unless the product actually supports that action and the flow clearly explains it.

Do not imply demo data is real user data.

Do not present educational FAQ content as individualized financial advice.

---

## Smith AI Rules

Accordions may include Smith AI support actions.

Allowed:

```text
Ask Smith AI
Explain with Smith AI
```

Rules:

- Accordion does not generate Smith AI responses.
- Parent state should pass structured context.
- During onboarding, Smith AI remains open.
- Accordion content should support Smith AI onboarding, not replace required guidance.
- Do not hide required onboarding instructions inside collapsed accordion panels.

Avoid:

```text
Ask AI what to buy
Let AI maximize returns
```

---

## Validation and State Rules

Accordion state belongs outside the component.

The accordion may display:

- Open state
- Closed state
- Disabled state
- Loading state
- Error state
- Title
- Content
- Icon
- Badge
- Action

The accordion must not decide:

- Which content should exist
- Which answer is correct
- Whether a recommendation should appear
- Whether a risk warning applies
- Whether onboarding is complete
- Whether a wallet state is valid
- Whether a financial action should proceed

---

## Do

- Use accordions for FAQ and expandable educational content.
- Use semantic tokens.
- Make the header a real button.
- Communicate expanded/collapsed state accessibly.
- Keep questions clear.
- Keep answers concise.
- Use accordions to reduce page length.
- Keep critical information visible outside collapsed panels.
- Respect reduced motion.
- Keep product logic outside the component.

---

## Do Not

- Do not hide critical warnings or required disclosures only inside accordions.
- Do not use accordions for primary navigation.
- Do not use accordions for sequential onboarding steps.
- Do not generate answers inside the component.
- Do not invent product behavior, pricing details, recommendations, or financial logic.
- Do not rely on chevron or color alone.
- Do not use vague question titles.
- Do not use hype-based financial copy.
- Do not imply guaranteed returns.
- Do not imply custody, execution, or investment action unless the product actually supports it.
- Do not hardcode raw visual values.
