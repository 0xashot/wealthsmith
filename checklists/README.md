# Checklists

This folder contains practical review checklists for WealthSmith implementation, QA, and Claude Code validation.

Checklists help reviewers confirm that the product follows approved rules before code is merged, shipped, or handed off.

They are not product logic.

They are review tools.

---

## Purpose

Use `checklists/` to answer:

```text
Did we follow the rules?
Did we use approved copy?
Did we preserve wallet safety?
Did we avoid invented financial data?
Did Top Pick come from Top Pick Logic?
Did protocol destinations come from Protocol Logic?
Did Smith AI explain without deciding?
Did loading, empty, and error states avoid fake data?
```

---

## Checklist vs Template

Templates define structure.

Checklists verify implementation.

```text
templates/ = how to create a valid object or document
checklists/ = how to review whether implementation is correct
```

Example:

```text
templates/top-pick-output-template.json
```

defines the Top Pick output shape.

```text
checklists/suggestion-top-pick-checklist.md
```

verifies that Top Pick is implemented safely and correctly.

---

## Recommended Folder Contents

```text
checklists/
  README.md
  mvp-implementation-checklist.md
  qa-review-checklist.md
  wallet-safety-checklist.md
  suggestion-top-pick-checklist.md
  protocol-handoff-checklist.md
  smith-ai-safety-checklist.md
```

Optional later:

```text
checklists/
  demo-mode-checklist.md
  portfolio-data-checklist.md
  loading-empty-error-checklist.md
  accessibility-checklist.md
  content-copy-checklist.md
  release-readiness-checklist.md
```

---

## Source-of-Truth Hierarchy

Checklists must follow this hierarchy:

```text
1. rules/
2. content/
3. components/
4. patterns/
5. tokens/
6. assets/
7. examples/
8. templates/
9. checklists/
```

Checklists do not override rules.

If a checklist conflicts with a rule, the rule wins.

If a checklist conflicts with approved copy, content wins.

---

## Core Review Areas

Every implementation review should check:

```text
design tokens
approved assets
component contracts
pattern behavior
wallet safety
non-custodial language
suggestion boundaries
Top Pick boundaries
protocol handoff boundaries
Smith AI boundaries
Demo Mode boundaries
loading/empty/error states
accessibility
analytics safety
```

---

## Minimum PR Review Checklist

For every pull request, confirm:

```text
- No raw visual values were added where semantic tokens should be used.
- No unapproved assets were added.
- No user-facing copy was invented when content exists.
- No component started doing financial logic.
- No UI layer chooses suggestions.
- No UI layer chooses Top Pick.
- No UI layer chooses protocol destinations.
- No Smith AI response invents missing data.
- No wallet flow asks for seed phrase or private key.
- No MVP protocol handoff executes a transaction.
- No loading/error/empty state shows fake financial values.
```

---

## Required Checklists by Area

### Dashboard

Use:

```text
checklists/mvp-implementation-checklist.md
checklists/qa-review-checklist.md
checklists/suggestion-top-pick-checklist.md
checklists/wallet-safety-checklist.md
checklists/smith-ai-safety-checklist.md
```

Also read:

```text
patterns/dashboard-layout.md
examples/dashboard/dashboard-connected-wallet-state.json
templates/page-state-template.json
```

---

### Portfolio

Use:

```text
checklists/mvp-implementation-checklist.md
checklists/qa-review-checklist.md
checklists/wallet-safety-checklist.md
```

Also read:

```text
patterns/portfolio-overview.md
examples/portfolio/portfolio-liquid-assets.json
examples/portfolio/portfolio-staked-assets.json
examples/portfolio/portfolio-yield-strategies.json
```

---

### Suggestions and Top Pick

Use:

```text
checklists/suggestion-top-pick-checklist.md
checklists/protocol-handoff-checklist.md
checklists/smith-ai-safety-checklist.md
```

Also read:

```text
rules/suggestion-engine-rules.md
rules/top-pick-rules.md
examples/suggestions/suggestions-buffer-underfunded.json
examples/top-pick/top-pick-buffer-case.json
templates/suggestion-object-template.json
templates/top-pick-output-template.json
```

---

### Protocol Handoffs

Use:

```text
checklists/protocol-handoff-checklist.md
checklists/wallet-safety-checklist.md
checklists/qa-review-checklist.md
```

Also read:

```text
rules/protocol-selection-rules.md
examples/protocol-handoffs/protocol-jupiter-swap.json
templates/protocol-decision-template.json
```

---

### Wallet Connection

Use:

```text
checklists/wallet-safety-checklist.md
checklists/qa-review-checklist.md
```

Also read:

```text
rules/wallet-and-custody-rules.md
patterns/wallet-connection.md
examples/wallet/wallet-connected-phantom-state.json
templates/wallet-state-template.json
```

---

### Smith AI

Use:

```text
checklists/smith-ai-safety-checklist.md
checklists/suggestion-top-pick-checklist.md
checklists/protocol-handoff-checklist.md
```

Also read:

```text
rules/smith-ai-rules.md
content/smith-ai-copy.md
examples/smith-ai/smith-ai-top-pick-examples.md
templates/smith-ai-context-template.json
```

---

## Checklist Result Format

Each checklist item should be marked:

```text
[ ] Not checked
[x] Passed
[!] Failed / needs fix
[-] Not applicable
```

Use notes when something fails:

```text
Result: [!]
Issue: UI shows “Swap now,” but MVP protocol handoff copy must use “Review on Jupiter.”
Required fix: Replace CTA copy with approved protocol handoff copy and verify no transaction executes.
```

---

## Review Severity

Use this severity scale:

```text
Critical = blocks release
High = blocks merge unless explicitly accepted
Medium = fix before launch or next sprint
Low = cleanup / polish
```

Critical examples:

```text
asks for seed phrase
implies WealthSmith controls funds
executes transaction from MVP suggestion CTA
UI chooses Top Pick
UI invents protocol URL
Smith AI invents APY
Demo data shown as real wallet data
```

---

## Claude Code Usage

When using Claude Code, prompt it with:

```text
Use the relevant checklist in checklists/.
Validate the implementation against rules, content, components, patterns, examples, and templates.
Report each failed item with the exact source file and required fix.
Do not invent missing values or mark unchecked items as passed.
```

Claude Code should:

```text
read source files
inspect implementation
compare against checklist
report pass/fail
identify exact rule violations
suggest safe fixes
```

Claude Code must not:

```text
ignore failed wallet safety checks
ignore Top Pick violations
ignore protocol handoff violations
ignore Smith AI invention
treat screenshots as source of truth
invent expected values
```

---

## Done Criteria

The `checklists/` folder is MVP-ready when it includes:

```text
checklists/README.md
checklists/mvp-implementation-checklist.md
checklists/qa-review-checklist.md
checklists/wallet-safety-checklist.md
checklists/suggestion-top-pick-checklist.md
checklists/protocol-handoff-checklist.md
checklists/smith-ai-safety-checklist.md
```

Each checklist should include:

```text
purpose
source files
review items
critical failures
pass/fail criteria
Claude Code instructions
```

---

## Final Rule

Checklists exist to prevent unsafe or inconsistent implementation.

Use them before:

```text
merging code
shipping MVP
handing work to developers
asking Claude Code to generate UI
approving design QA
approving product QA
```

The goal is simple:

```text
No invented logic.
No custody confusion.
No unsafe wallet flow.
No ungrounded AI.
No hidden execution.
```
