# Templates

This folder contains reusable implementation templates for WealthSmith.

Templates help engineers and Claude Code create consistent product states, data contracts, examples, QA cases, and implementation artifacts without guessing.

Templates are not production logic.

They are structured starting points.

---

## Purpose

The `templates/` folder answers:

```text
What shape should this object follow?
Which fields are required?
Which fields are forbidden?
Which rules/content/patterns apply?
How should Claude Code structure new states or outputs?
How do we avoid inconsistent data contracts?
```

Templates should make repeated implementation tasks safer and more predictable.

They should be used when creating:

```text
page states
suggestion objects
Top Pick outputs
protocol decisions
Smith AI context payloads
wallet states
Demo Mode states
empty/loading/error states
QA test cases
new component documentation
new pattern documentation
```

---

## Core Rule

Hard Rule:

```text
Templates define structure.
Rules define behavior.
Content defines copy.
Examples show completed states.
```

Templates must not override:

```text
rules/
content/
components/
patterns/
examples/
```

If a template conflicts with a rule, the rule wins.

If a template conflicts with content, content wins.

If a template conflicts with a component spec, the component spec wins.

---

## What Belongs in Templates

Use templates for:

```text
Reusable JSON shapes
Reusable Markdown documentation formats
Implementation skeletons
QA case formats
State object formats
Claude Code task formats
```

Do not use templates for:

```text
Production business logic
Final recommendations
Final protocol decisions
Actual APY values
Real wallet data
Real user data
Design tokens
Screenshots
Canonical copy
```

---

## Recommended Folder Structure

```text
templates/
  README.md

  component-template.md
  pattern-template.md

  page-state-template.json
  suggestion-object-template.json
  top-pick-output-template.json
  protocol-decision-template.json
  smith-ai-context-template.json
  wallet-state-template.json
  demo-mode-state-template.json
  empty-error-loading-state-template.json

  qa-test-case-template.md
```

Optional later:

```text
templates/
  portfolio-position-template.json
  goal-settings-template.json
  onboarding-state-template.json
  protocol-handoff-template.json
  copy-map-template.json
  accessibility-check-template.md
```

---

## Recommended MVP Build Order

Build these first:

```text
1. templates/README.md
2. templates/suggestion-object-template.json
3. templates/top-pick-output-template.json
4. templates/protocol-decision-template.json
5. templates/smith-ai-context-template.json
6. templates/page-state-template.json
7. templates/wallet-state-template.json
8. templates/demo-mode-state-template.json
9. templates/empty-error-loading-state-template.json
10. templates/qa-test-case-template.md
```

Why this order:

```text
Suggestion object, Top Pick output, and Protocol Decision are the highest-risk structures.
Smith AI context prevents ungrounded AI responses.
Page state, wallet state, and demo state keep UI behavior consistent.
Empty/error/loading template prevents fake data and unsafe fallback behavior.
QA template makes implementation review repeatable.
```

---

## Template vs Example

Templates and examples are different.

Template:

```text
A reusable structure with placeholder values.
```

Example:

```text
A completed fixture showing realistic values.
```

Good template:

```json
{
  "id": "{suggestion_id}",
  "type": "{suggestion_type}",
  "status": "{active|locked|disabled|stale}"
}
```

Good example:

```json
{
  "id": "top_up_safety_buffer",
  "type": "fund_safety_buffer",
  "status": "active"
}
```

Rules:

- Templates use placeholders.
- Examples use realistic synthetic values.
- Production uses real product data.
- Do not treat templates as real values.

---

## Placeholder Rules

Use placeholders in templates with braces:

```text
{suggestion_id}
{wallet_provider}
{protocol_id}
{content_id}
{copy_from_content}
{value_from_product_logic}
```

Use explicit placeholder names.

Good:

```text
{destination_protocol_id_from_protocol_logic}
```

Bad:

```text
{thing}
```

Rules:

- Placeholder names should explain source.
- Do not use placeholders that imply guessing.
- For generated data, state the source.
- For forbidden generated data, say `must_not_invent`.

---

## Required Metadata

Every JSON template should include:

```json
{
  "template_metadata": {
    "name": "{template_name}",
    "path": "templates/{file_name}.json",
    "purpose": "{what_this_template_is_for}",
    "source_of_truth": [
      "rules/{related_rule}.md"
    ],
    "related_content": [
      "content/{related_content}.md"
    ],
    "related_components": [
      "components/{component}.md"
    ],
    "related_patterns": [
      "patterns/{pattern}.md"
    ],
    "notes": [
      "This is a template, not production data."
    ]
  }
}
```

Rules:

- Metadata is not user-facing.
- Metadata helps Claude Code understand context.
- Metadata should list source files that govern the template.

---

## Source-of-Truth Hierarchy

When using templates, follow this hierarchy:

```text
1. rules/
2. content/
3. components/
4. patterns/
5. tokens/
6. assets/
7. examples/
8. templates/
```

Templates come last.

They guide structure, not behavior.

---

## Core Templates

### `suggestion-object-template.json`

Purpose:

```text
Standard shape for Suggestion Engine output consumed by UI and Smith AI.
```

Should include:

```text
id
type
category
status
actionability
severity
reason_codes
copy
data
action
protocol_decision
top_pick flags
ui rendering hints
Smith AI explanation constraints
hard rules
```

Used by:

```text
Suggestion rail
Suggestion card
Top Pick Logic
Smith AI context
QA tests
```

---

### `top-pick-output-template.json`

Purpose:

```text
Standard shape for deterministic Top Pick output.
```

Should include:

```text
has_top_pick
top_pick_id
selected suggestion
eligibility results
guardrail results
ranking reason
excluded candidates
copy IDs
QA assertions
```

Used by:

```text
Dashboard alert
Suggestion ordering
Top Pick badge
Smith AI explanation
QA tests
```

---

### `protocol-decision-template.json`

Purpose:

```text
Standard shape for Protocol Logic output.
```

Should include:

```text
suggestion_id
action_type
action_family
destination_protocol_id
destination_label
destination_url
handoff_type
cta_label
eligibility_status
reason_codes
excluded_protocols
stale/error states
hard rules
```

Used by:

```text
Suggestion card CTAs
Portfolio Manage links
Protocol handoffs
Smith AI explanations
QA tests
```

---

### `smith-ai-context-template.json`

Purpose:

```text
Standard context packet passed to Smith AI so it explains without inventing.
```

Should include:

```text
mode
wallet state
demo state
page context
goal context
portfolio context
suggestion context
Top Pick context
protocol decision context
allowed actions
forbidden actions
copy constraints
safety boundaries
```

Used by:

```text
Smith AI panel
Onboarding companion
Suggestion explanations
Support explanations
Demo Mode explanations
```

---

### `page-state-template.json`

Purpose:

```text
Standard shape for page-level state.
```

Should include:

```text
route
page
mode
demo_mode
wallet
global nav
banner
main content
right rail
loading/error/empty states
accessibility
copy IDs
hard rules
```

Used by:

```text
Dashboard
Portfolio
Goal
Support
Onboarding
Demo Mode
```

---

### `wallet-state-template.json`

Purpose:

```text
Standard shape for wallet connection state.
```

Should include:

```text
status
provider
address
short address
wallet pill
connection type
permissions
portfolio loading separation
wallet menu
disconnect flow
message signing state
errors
hard rules
```

Used by:

```text
Connect Wallet modal
Global Nav
Wallet menu
Portfolio loading
Smith AI wallet explanations
```

---

### `demo-mode-state-template.json`

Purpose:

```text
Standard shape for Demo Mode state.
```

Should include:

```text
demo_mode
sample data flag
demo banner
wallet disconnected state
sample goal
sample portfolio
sample suggestions
demo Top Pick
Smith AI demo context
exit demo behavior
connect wallet transition
hard rules
```

Used by:

```text
Demo Mode
Dashboard
Portfolio
Goal
Smith AI
Onboarding
```

---

### `empty-error-loading-state-template.json`

Purpose:

```text
Standard shape for non-ready states.
```

Should include:

```text
state type
scope
copy
CTA
retry behavior
partial data behavior
stale data behavior
skeleton behavior
Smith AI animation rules
forbidden fake data rules
```

Used by:

```text
Dashboard
Portfolio
Suggestions
Wallet
Goal
Support
Smith AI
Contact Us
```

---

### `qa-test-case-template.md`

Purpose:

```text
Standard format for QA and acceptance tests.
```

Should include:

```text
scenario
preconditions
input state
expected UI
expected copy
expected behavior
forbidden behavior
accessibility checks
source files
pass/fail criteria
```

Used by:

```text
Design QA
Engineering QA
Claude Code review
Regression tests
```

---

## Template Quality Checklist

Before adding a template, verify:

```text
Does it have a clear purpose?
Does it list related rules?
Does it list related content?
Does it avoid real user data?
Does it avoid production logic?
Does it use explicit placeholders?
Does it define required and optional fields?
Does it define forbidden behavior?
Does it include hard rules?
Can Claude Code use it without guessing?
```

---

## Data Safety Rules

Templates must never include:

```text
real private keys
seed phrases
wallet backup files
passwords
real user financial data
real wallet addresses presented as real
unapproved protocol URLs
unverified APY values
guaranteed returns
```

Allowed:

```text
placeholder values
synthetic values
sample/demo values clearly labeled
approved content IDs
approved asset paths
approved protocol IDs
approved wallet IDs
```

---

## Wallet and Custody Rules

Templates involving wallets must include:

```text
connection_type
permissions
read-only boundary
funds stay in wallet
no seed/private key request
no automatic execution
```

Required wallet permission shape:

```json
{
  "permissions": {
    "can_read_public_address": true,
    "can_read_supported_balances": true,
    "can_read_supported_positions": true,
    "can_move_funds": false,
    "can_trade": false,
    "can_stake": false,
    "can_deposit": false,
    "can_withdraw": false,
    "can_rebalance": false
  }
}
```

Rules:

- Do not imply wallet connection authorizes transactions.
- Do not imply WealthSmith holds or secures funds.
- Do not request wallet secrets.

---

## Demo Mode Rules

Templates involving Demo Mode must include:

```text
demo_mode: true
is_sample_data: true
wallet.status: disconnected
show_wallet_pill: false
demo banner
sample data labeling
exit demo behavior
connect wallet transition
```

Rules:

- Demo Mode data is sample data.
- Demo suggestions are not real recommendations.
- Demo Top Pick does not persist into real wallet mode.
- Demo Mode does not request signatures.

---

## Suggestion and Top Pick Rules

Templates involving suggestions must include:

```text
reason_codes
status
actionability
severity
is_top_pick
source
copy IDs
hard rules
```

Top Pick constraints:

```text
Exactly one Top Pick when valid actionable suggestions exist.
Locked suggestions cannot be Top Pick.
Stale suggestions cannot be active Top Pick.
Completed/dismissed/expired suggestions cannot be active Top Pick.
Smith AI cannot choose or change Top Pick.
```

---

## Protocol Handoff Rules

Templates involving protocols must include:

```text
destination_protocol_id
destination_label
destination_url
handoff_type
cta_label
eligibility_status
reason_codes
source
```

MVP handoff type:

```text
external_new_tab
```

Required hard rules:

```text
Do not execute transactions.
Do not request wallet signatures for MVP handoff click.
Do not mark suggestion complete on click.
Do not invent protocol URL.
Do not let UI choose protocol.
```

---

## Smith AI Rules

Templates involving Smith AI must include:

```text
context mode
source context
allowed actions
forbidden actions
required phrasing
must_not_say
copy constraints
```

Smith AI must:

```text
explain
clarify
guide
stay grounded
```

Smith AI must not:

```text
create recommendations
choose Top Pick
choose protocol
invent APY
invent balances
invent earnings
execute actions
ask for wallet secrets
```

---

## Accessibility Rules

Templates for UI states should include accessibility where relevant:

```text
page title
aria labels
role
state announcements
button labels
chart labels
progress labels
external link labels
```

Examples:

```json
{
  "accessibility": {
    "page_title": "{page_title}",
    "global_nav_label": "Main navigation",
    "right_rail_label": "{right_rail_label}",
    "external_link_label": "Opens external protocol in a new tab."
  }
}
```

Rules:

- Icons must not be the only source of meaning.
- Progress values need accessible labels.
- External links need clear labels.
- Loading/error states need readable announcements where appropriate.

---

## Copy ID Rules

Templates should reference content IDs where possible.

Good:

```json
{
  "copy": {
    "title": "{copy_from_content}",
    "content_ids": {
      "title": "suggestion.buffer.title",
      "badge": "suggestion.badge.top_pick"
    }
  }
}
```

Bad:

```json
{
  "copy": {
    "title": "some new copy Claude invented"
  }
}
```

Rules:

- Use approved content files.
- Do not invent new user-facing copy in templates.
- If a copy ID is missing, add it to `content/`, not directly to the component.

---

## Claude Code Rules

Claude Code should:

- Use templates when creating new JSON states or Markdown documentation.
- Fill placeholders from approved sources.
- Keep rules/content/components/patterns above templates.
- Preserve required fields.
- Preserve hard rules.
- Use examples as completed references.
- Use content IDs instead of inventing copy.
- Use synthetic data only in examples/tests.

Claude Code must not:

- Treat templates as production logic.
- Treat placeholders as real values.
- Invent financial logic.
- Invent protocol destinations.
- Invent Top Pick.
- Invent APY or estimated earnings.
- Invent wallet support.
- Ask for seed phrases or private keys.
- Remove non-custodial boundaries.
- Remove no-execution boundaries.
- Use screenshots as source of template fields.

---

## Recommended Use in Claude Code Prompts

When asking Claude Code to build from this repo, use:

```text
Use the relevant template from templates/.
Fill it only with data from approved rules, content, examples, or product logic.
Do not invent missing financial values, APY, protocol destinations, wallet permissions, or copy.
If required data is missing, render the correct empty/loading/error/unavailable state.
```
