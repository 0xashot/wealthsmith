# QA Test Case Template

Use this template to create WealthSmith QA cases for design review, engineering review, Claude Code validation, regression tests, and acceptance criteria.

This is a template.

It is not production logic.

---

## Purpose

This template helps QA confirm that WealthSmith screens, components, patterns, examples, and generated code follow the approved product rules.

QA should check:

```text
UI rendering
copy
state behavior
wallet safety
Demo Mode boundaries
Suggestion Engine boundaries
Top Pick boundaries
Protocol handoff boundaries
Smith AI boundaries
loading/empty/error behavior
accessibility
analytics safety
```

---

## File Path

Save new QA cases as:

```text
tests/{area}/{scenario-name}.md
```

or, if keeping QA docs inside this design system repo:

```text
checklists/{area}/{scenario-name}.md
```

Recommended examples:

```text
checklists/suggestions/safety-buffer-underfunded.md
checklists/top-pick/top-pick-buffer-case.md
checklists/wallet/phantom-connected-state.md
checklists/protocol-handoffs/jupiter-swap-handoff.md
checklists/demo-mode/demo-dashboard-state.md
checklists/portfolio/yield-strategies-table.md
```

---

# QA Test Case: {Scenario Name}

## Metadata

```yaml
id: {qa_case_id}
area: {dashboard|portfolio|wallet|suggestions|top-pick|protocol-handoff|smith-ai|demo-mode|onboarding|support|content|component|pattern}
status: {draft|ready|approved|deprecated}
priority: {critical|high|medium|low}
owner: {owner_name_or_team}
created: {date}
updated: {date}
```

---

## Scenario

Describe the user/product scenario being tested.

```text
{Short explanation of the scenario}
```

Example:

```text
A connected-wallet user has an underfunded Safety Buffer. WealthSmith should show Safety Buffer as the only Top Pick, lock yield opportunities, and avoid transaction execution.
```

---

## Source Files

List all files that govern this QA case.

### Rules

```text
rules/{related-rule}.md
```

### Content

```text
content/{related-content}.md
```

### Components

```text
components/{related-component}.md
```

### Patterns

```text
patterns/{related-pattern}.md
```

### Templates

```text
templates/{related-template}.json
```

### Examples

```text
examples/{related-example}.json
```

---

## Preconditions

The test starts with these assumptions.

```text
- {precondition_1}
- {precondition_2}
- {precondition_3}
```

Example:

```text
- Wallet status is connected.
- Demo Mode is false.
- Portfolio data is ready.
- Suggestion Engine output is ready.
- Top Pick Logic output is ready.
- Protocol Logic output is ready when protocol CTAs appear.
```

---

## Input State

Reference the JSON or Markdown fixture used for the test.

```text
Fixture:
examples/{area}/{fixture-name}.json
```

Required input state:

```json
{
  "mode": "{real_wallet|demo|no_wallet|onboarding}",
  "demo_mode": "{boolean}",
  "wallet_status": "{connected|disconnected|demo|error}",
  "portfolio_status": "{ready|loading|partial|empty|error|stale}",
  "suggestion_status": "{ready|loading|empty|error|stale|not_applicable}",
  "top_pick_status": "{ready|no_valid_top_pick|loading|error|stale|not_applicable}",
  "protocol_decision_status": "{ready|locked|blocked|stale|error|not_applicable}"
}
```

---

## Steps to Test

Use numbered steps.

```text
1. Open {route_or_screen}.
2. Ensure {state_or_fixture} is loaded.
3. Inspect {component_or_area}.
4. Click {CTA_or_interaction}.
5. Verify {expected_result}.
```

Example:

```text
1. Open /dashboard.
2. Load examples/suggestions/suggestions-buffer-underfunded.json.
3. Inspect the right rail suggestion cards.
4. Click Review on the Top Pick.
5. Verify no transaction is executed and no wallet signature is requested.
```

---

## Expected UI

Define exactly what should appear.

```text
- {component} is visible.
- {component} is hidden.
- {badge} appears on {item}.
- {CTA} uses label {label}.
- {state} appears as {loading|empty|error|locked|stale}.
```

Example:

```text
- Safety Buffer suggestion appears first.
- Safety Buffer card has Top Pick badge.
- Exactly one card has Top Pick badge.
- Locked yield card shows Locked badge.
- Review on Jupiter shows external-link affordance.
- Demo banner is hidden in real-wallet mode.
```

---

## Expected Copy

Use exact approved copy where relevant.

```text
Expected visible copy:
- "{approved_copy_1}"
- "{approved_copy_2}"
```

Copy source:

```text
content/{file}.md
```

Content IDs:

```text
- {content_id}
- {content_id}
```

Example:

```text
Expected visible copy:
- "Top Pick"
- "Locked"
- "No action will be taken automatically."
- "Your funds stay in your wallet."
```

---

## Expected Behavior

Define what the product should do.

```text
- {expected_behavior_1}
- {expected_behavior_2}
- {expected_behavior_3}
```

Example:

```text
- The UI renders suggestions from Suggestion Engine output.
- The UI renders Top Pick from Top Pick Logic output.
- The UI renders protocol destinations from Protocol Logic output.
- Clicking an external protocol CTA opens a new tab.
- Clicking an external protocol CTA does not execute a transaction.
- Clicking an external protocol CTA does not request a wallet signature in MVP.
- Clicking an external protocol CTA does not mark the suggestion complete.
```

---

## Forbidden Behavior

List what must not happen.

```text
- {forbidden_behavior_1}
- {forbidden_behavior_2}
- {forbidden_behavior_3}
```

Common forbidden behavior:

```text
- Do not invent balances.
- Do not invent APY.
- Do not invent estimated earnings.
- Do not invent suggestions.
- Do not invent Top Pick.
- Do not invent protocol destinations.
- Do not invent protocol URLs.
- Do not execute transactions.
- Do not request wallet signatures for MVP protocol handoff clicks.
- Do not mark external protocol handoffs complete on click.
- Do not ask for seed phrase or private key.
- Do not imply WealthSmith holds or controls funds.
- Do not present Demo Mode data as real wallet data.
```

---

## State Assertions

Use this table for deterministic state checks.

| Assertion ID | Assertion | Expected |
|---|---|---|
| `{assertion_id}` | `{what_should_be_true}` | `{expected_value}` |

Example:

| Assertion ID | Assertion | Expected |
|---|---|---|
| `single_top_pick` | Exactly one card has `is_top_pick = true`. | `true` |
| `locked_not_top_pick` | Locked suggestions are not Top Pick. | `true` |
| `no_execution` | CTA click does not execute a transaction. | `true` |
| `no_signature` | CTA click does not request wallet signature in MVP. | `true` |
| `no_secret_request` | UI never asks for seed phrase or private key. | `true` |

---

## Component Assertions

Use this table for component-level checks.

| Component | Expected State | Notes |
|---|---|---|
| `{component_name}` | `{visible|hidden|enabled|disabled|loading|empty|error}` | `{notes}` |

Example:

| Component | Expected State | Notes |
|---|---|---|
| `global-nav` | `visible` | Correct variant based on wallet/demo/onboarding state. |
| `suggestion-card` | `visible` | Renders passed suggestion object only. |
| `wallet-pill` | `visible` | Only when real wallet is connected. |
| `demo-banner` | `hidden` | Hidden when demo_mode = false. |
| `smith-ai-panel` | `closed` | Opens only after user action unless onboarding pattern requires it. |

---

## Copy Assertions

Use this table for exact copy checks.

| Copy ID | Expected Copy | Surface |
|---|---|---|
| `{content_id}` | `{expected_copy}` | `{surface}` |

Example:

| Copy ID | Expected Copy | Surface |
|---|---|---|
| `suggestion.badge.top_pick` | `Top Pick` | Suggestion card |
| `suggestion.badge.locked` | `Locked` | Suggestion card |
| `wallet.non_custodial.short` | `Your funds stay in your wallet.` | Wallet/error states |

---

## Wallet and Custody Checks

Required for any wallet, portfolio, protocol, or suggestion QA case.

```text
- Wallet connection is read-only for portfolio viewing.
- Wallet connection does not imply transaction approval.
- Wallet connection does not move funds.
- WealthSmith does not hold or control user funds.
- Disconnecting wallet does not affect funds.
- No seed phrase request appears.
- No private key request appears.
- No wallet password request appears.
- No wallet backup file request appears.
```

Pass criteria:

```text
All wallet and custody checks pass.
```

Fail criteria:

```text
Any UI, copy, Smith AI response, event, or state implies custody, fund movement, transaction execution, or wallet-secret collection.
```

---

## Demo Mode Checks

Required when `demo_mode = true`.

```text
- Demo Mode banner is visible.
- Demo data is clearly labeled as sample data.
- Wallet pill is hidden.
- Real wallet state is not shown.
- Demo suggestions are sample suggestions.
- Demo Top Pick is sample-only.
- Demo Mode does not request signatures.
- Connecting a wallet clears demo-dependent state.
- Demo Top Pick does not persist into real wallet mode.
```

Pass criteria:

```text
Demo Mode is clearly separated from real wallet mode.
```

Fail criteria:

```text
Demo data is presented as real wallet data, or demo state persists after real wallet connection.
```

---

## Suggestion Checks

Required for suggestion QA cases.

```text
- Suggestions come from Suggestion Engine output.
- UI does not invent suggestions.
- UI does not invent reason codes.
- Suggestion copy uses approved content or structured copy fields.
- Suggestion status is rendered correctly.
- Locked suggestions show locked reason.
- Disabled suggestions show disabled reason.
- Stale suggestions show stale state.
- Informational suggestions are not treated as actionable.
```

Pass criteria:

```text
All suggestions render according to structured suggestion objects.
```

Fail criteria:

```text
UI creates, changes, reorders, or explains suggestions in conflict with Suggestion Engine output.
```

---

## Top Pick Checks

Required when Top Pick appears.

```text
- Top Pick comes from Top Pick Logic.
- Exactly one suggestion has Top Pick badge.
- Top Pick is active and actionable.
- Locked suggestions are not Top Pick.
- Stale suggestions are not active Top Pick.
- Disabled suggestions are not Top Pick.
- Completed, dismissed, or expired suggestions are not active Top Pick.
- Informational-only suggestions are not Top Pick.
- Safety Buffer override is respected when active.
- Smith AI explains Top Pick but does not choose or change it.
```

Pass criteria:

```text
Top Pick matches Top Pick Logic output exactly.
```

Fail criteria:

```text
UI, Smith AI, or component logic chooses or changes Top Pick.
```

---

## Protocol Handoff Checks

Required when a protocol CTA or Manage link appears.

```text
- Protocol destination comes from Protocol Logic.
- Protocol URL comes from approved protocol metadata.
- UI does not guess protocol URLs.
- Protocol CTA copy uses approved content.
- MVP handoff opens external protocol in a new tab.
- Handoff does not execute a transaction.
- Handoff does not request wallet signature in MVP.
- Handoff does not move funds.
- Handoff does not mark suggestion complete on click.
- Stale protocol decisions cannot be used for active handoffs.
- Missing protocol URL shows unavailable or blocked state.
```

Pass criteria:

```text
Protocol handoff is external review-only.
```

Fail criteria:

```text
CTA executes, signs, completes, changes balances, or uses a guessed protocol URL.
```

---

## Smith AI Checks

Required when Smith AI is visible or used.

```text
- Smith AI uses the provided context packet.
- Smith AI explains but does not create product logic.
- Smith AI does not choose or change Top Pick.
- Smith AI does not choose or change protocols.
- Smith AI does not invent APY.
- Smith AI does not invent estimated earnings.
- Smith AI does not invent balances.
- Smith AI does not invent suggestions.
- Smith AI does not claim transactions were executed.
- Smith AI does not ask for seed phrase or private key.
- Smith AI uses demo-aware language in Demo Mode.
- Smith AI uses unavailable/loading/error language when data is missing.
```

Pass criteria:

```text
Smith AI response is grounded, safe, and within boundaries.
```

Fail criteria:

```text
Smith AI invents data, overrides deterministic logic, claims execution, or asks for wallet secrets.
```

---

## Loading / Empty / Error Checks

Required when testing non-ready states.

```text
- Loading states do not show fake data.
- Empty states appear only after successful data load with no supported results.
- Error states do not imply funds are affected.
- Partial states keep loaded data visible.
- Stale states are clearly labeled.
- Unavailable values show “Unavailable” instead of guessed values.
- Smith AI animation is used only for approved Smith AI or suggestion-building waits.
- Portfolio/table loading uses skeletons.
- Retry/refresh actions do not execute transactions.
```

Pass criteria:

```text
Non-ready states are safe, clear, and do not invent data.
```

Fail criteria:

```text
Non-ready state shows fake balances, fake APY, fake Top Pick, fake suggestions, or unsafe wallet copy.
```

---

## Accessibility Checks

Required for all UI QA cases.

```text
- Page has correct title.
- Main navigation is labeled.
- Buttons have accessible labels.
- Wallet pill has accessible label.
- External protocol links indicate they open a new tab.
- Icons are not the only source of meaning.
- Progress values have accessible labels.
- Loading states are understandable to assistive technologies when long-running.
- Error states are announced or readable in context.
- Disabled/locked reasons are available in text.
- Focus moves correctly for modals and returns to trigger on close.
```

Pass criteria:

```text
The scenario is usable without relying on color, icons, or visual-only cues.
```

Fail criteria:

```text
Meaning is only conveyed by color/icon, or key actions/states lack accessible labels.
```

---

## Analytics / Event Checks

Use only if analytics exists for this scenario.

Expected event:

```json
{
  "event_name": "{event_name}",
  "payload": {
    "surface": "{surface}",
    "action": "{action}",
    "executes_transaction": false,
    "requires_wallet_signature": false,
    "moves_funds": false
  }
}
```

Analytics must not include:

```text
seed_phrase
private_key
wallet_password
wallet_backup_file
raw_sensitive_error_payload
```

Pass criteria:

```text
Events are safe and match the user action.
```

Fail criteria:

```text
Events include wallet secrets, sensitive payloads, or imply execution that did not happen.
```

---

## Regression Checks

Run these after any implementation change.

```text
- No raw colors, spacing, radii, shadows, or z-index values were introduced where tokens should be used.
- No user-facing copy was invented when content IDs exist.
- No component started doing business logic.
- No UI layer started choosing Top Pick.
- No UI layer started choosing protocol destinations.
- No Smith AI response invented missing data.
- No wallet flow asks for secrets.
- No external handoff executes transactions in MVP.
```

---

## Pass / Fail Criteria

### Pass

The QA case passes when:

```text
- Expected UI matches the fixture and source files.
- Expected copy matches content.
- Expected behavior matches rules.
- Forbidden behavior does not occur.
- Wallet/custody boundaries are preserved.
- Accessibility checks pass.
- Smith AI boundaries pass when applicable.
- Protocol handoff boundaries pass when applicable.
```

### Fail

The QA case fails when:

```text
- UI invents data or logic.
- Copy conflicts with approved content.
- Component behavior conflicts with rules.
- Top Pick is selected outside Top Pick Logic.
- Protocol destination is selected outside Protocol Logic.
- Smith AI invents or overrides product logic.
- Wallet flow asks for secrets.
- Transaction execution is implied or triggered in MVP.
- Demo data is presented as real data.
- Loading/error/empty state shows fake financial values.
```

---

## QA Result

```yaml
result: {pass|fail|blocked}
tested_by: {name}
date: {date}
environment: {local|staging|production|storybook|figma|claude-code}
build_or_commit: {build_id_or_commit_hash}
```

Notes:

```text
{QA notes}
```

Issues found:

```text
- {issue_1}
- {issue_2}
```

Required fixes:

```text
- {fix_1}
- {fix_2}
```

---

## Claude Code QA Instructions

When Claude Code uses this QA template:

```text
1. Read the source files listed in this QA case.
2. Load the referenced fixture.
3. Validate rendered UI against the fixture.
4. Validate copy against content IDs.
5. Validate behavior against rules.
6. Validate no forbidden behavior occurs.
7. Report pass/fail with exact failing fields or rules.
```

Claude Code must not:

```text
- Invent missing source files.
- Invent expected values.
- Invent passing behavior.
- Ignore forbidden behavior.
- Skip wallet/custody checks.
- Skip Top Pick checks when Top Pick appears.
- Skip protocol handoff checks when protocol CTA appears.
- Skip Smith AI checks when Smith AI is involved.
```

---

## Minimal QA Case Skeleton

Use this compact version for quick checks.

```markdown
# QA Test Case: {Scenario}

## Source Files

- rules/{rule}.md
- content/{content}.md
- components/{component}.md
- patterns/{pattern}.md
- examples/{example}.json

## Preconditions

- {precondition}

## Steps

1. {step}
2. {step}

## Expected

- {expected}

## Forbidden

- {forbidden}

## Pass Criteria

- {pass_criteria}

## Result

{pass|fail|blocked}
```

---

## Done Criteria

A QA case is ready when:

```text
- Scenario is clear.
- Source files are listed.
- Preconditions are explicit.
- Input fixture is referenced.
- Steps are testable.
- Expected UI is specific.
- Expected copy is source-backed.
- Expected behavior is rule-backed.
- Forbidden behavior is listed.
- Wallet/custody checks are included when relevant.
- Demo Mode checks are included when relevant.
- Suggestion checks are included when relevant.
- Top Pick checks are included when relevant.
- Protocol handoff checks are included when relevant.
- Smith AI checks are included when relevant.
- Loading/empty/error checks are included when relevant.
- Accessibility checks are included.
- Pass/fail criteria are explicit.
