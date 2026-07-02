# QA Review Checklist

Use this checklist for WealthSmith QA review before approving a screen, flow, component, fixture, or Claude Code-generated implementation.

This checklist is for:

```text
design QA
product QA
engineering QA
Claude Code validation
pre-release review
regression review
```

It is intentionally practical.

Use it to catch unsafe behavior, inconsistent UI states, invented data, copy issues, and logic boundary violations.

---

## Result Legend

```text
[ ] Not checked
[x] Passed
[!] Failed / needs fix
[-] Not applicable
```

Severity:

```text
Critical = blocks release
High = blocks merge unless explicitly accepted
Medium = fix before launch or next sprint
Low = cleanup / polish
```

---

## Required Source Files

Before reviewing, identify the files that govern the QA area.

Minimum:

```text
README.md
rules/README.md
content/README.md
components/README.md
patterns/README.md
examples/README.md
templates/README.md
checklists/README.md
```

Use the specific files for the area being tested.

Examples:

```text
rules/wallet-and-custody-rules.md
rules/suggestion-engine-rules.md
rules/top-pick-rules.md
rules/protocol-selection-rules.md
rules/smith-ai-rules.md
rules/demo-mode-rules.md
rules/loading-state-rules.md
rules/financial-logic-boundaries.md
```

---

# 1. QA Setup

## 1.1 Scenario is clear

- [ ] Scenario name is clear.
- [ ] Route or screen is identified.
- [ ] User mode is identified: real wallet, demo, onboarding, no wallet, or support.
- [ ] Wallet state is identified.
- [ ] Portfolio data state is identified.
- [ ] Suggestion state is identified.
- [ ] Top Pick state is identified.
- [ ] Protocol handoff state is identified when relevant.
- [ ] Smith AI state is identified when relevant.
- [ ] Loading/empty/error/partial/stale state is identified when relevant.

QA note:

```text
Do not review ambiguous states. Ask for or create the correct fixture first.
```

---

## 1.2 Fixture exists

- [ ] QA references a JSON or Markdown fixture.
- [ ] Fixture lives under `examples/` or approved test fixtures.
- [ ] Fixture is synthetic or clearly labeled as sample data.
- [ ] Fixture matches the relevant template.
- [ ] Fixture does not include real private user data.
- [ ] Fixture does not include seed phrases, private keys, passwords, or backup files.

Critical failure:

```text
QA fixture includes wallet secrets or real private user financial data.
```

---

# 2. Source-of-Truth Review

## 2.1 Hierarchy

- [ ] QA follows source-of-truth hierarchy.
- [ ] Rules govern behavior.
- [ ] Content governs copy.
- [ ] Components govern UI contract.
- [ ] Patterns govern page/flow behavior.
- [ ] Tokens govern styling.
- [ ] Assets govern visual files.
- [ ] Examples are treated as fixtures.
- [ ] Templates are treated as structure.

Source-of-truth hierarchy:

```text
rules > content > components > patterns > tokens > assets > examples > templates > checklists
```

Critical failure:

```text
Implementation follows a screenshot/example/template in conflict with rules or approved content.
```

---

# 3. Visual and Layout QA

## 3.1 Tokens

- [ ] UI uses semantic color tokens.
- [ ] UI uses semantic spacing tokens.
- [ ] UI uses semantic typography tokens.
- [ ] UI uses semantic radius tokens.
- [ ] UI uses semantic shadow tokens.
- [ ] UI uses semantic z-index tokens.
- [ ] UI uses semantic motion tokens.
- [ ] No unapproved one-off visual values appear.

High failure:

```text
Raw visual values are hardcoded where semantic tokens should be used.
```

---

## 3.2 Responsive layout

- [ ] Mobile layout follows mobile-first rules.
- [ ] Tablet layout follows approved layout rules.
- [ ] Desktop layout follows approved layout rules.
- [ ] Wide layout follows approved layout rules.
- [ ] Right rail behavior matches breakpoint.
- [ ] Smith AI overlay/side-panel behavior matches breakpoint.
- [ ] Page padding and content width match the design system.

---

## 3.3 Assets

- [ ] Logo uses approved WealthSmith logo asset.
- [ ] Logo is not recolored, stretched, or modified.
- [ ] Token icons use approved paths.
- [ ] Wallet icons use approved paths.
- [ ] Protocol icons use approved paths.
- [ ] Fallback token icon is used only when appropriate.
- [ ] No protocol fallback is used in MVP.
- [ ] Smith AI animation is used only in approved contexts.

---

# 4. Copy QA

## 4.1 Approved copy

- [ ] User-facing copy comes from `content/` where available.
- [ ] Suggestion card copy matches approved structured copy.
- [ ] Wallet copy matches approved wallet copy.
- [ ] Demo Mode copy clearly says sample data.
- [ ] Error/empty/loading copy matches approved states.
- [ ] Smith AI copy follows approved examples.
- [ ] Glossary terms are used consistently.

---

## 4.2 Forbidden copy

- [ ] No “guaranteed” language.
- [ ] No “risk-free” language.
- [ ] No “best investment” language.
- [ ] No pressure language.
- [ ] No shaming language.
- [ ] No “Swap now” for MVP protocol handoff.
- [ ] No “Execute now” for MVP protocol handoff.
- [ ] No “Complete deposit” for MVP protocol handoff.
- [ ] No “funds moved” unless later transaction system truly confirms it.
- [ ] No “WealthSmith controls your wallet.”
- [ ] No “send your seed phrase.”
- [ ] No “send your private key.”

Critical failure:

```text
Copy implies custody, hidden execution, guaranteed returns, or asks for wallet secrets.
```

---

# 5. Wallet Safety QA

## 5.1 Wallet boundaries

- [ ] Wallet connection is read-only for portfolio viewing.
- [ ] Wallet connection does not imply transaction approval.
- [ ] Wallet connection does not move funds.
- [ ] Wallet connection does not give WealthSmith custody.
- [ ] Wallet connection does not give WealthSmith trading permission.
- [ ] Wallet connection does not give WealthSmith staking permission.
- [ ] Wallet connection does not give WealthSmith deposit/withdraw permission.
- [ ] Wallet connection does not give WealthSmith rebalance permission.
- [ ] Wallet connected state is separate from portfolio data loaded state.

Critical failure:

```text
Wallet connection is described as permission to move, trade, stake, deposit, withdraw, or rebalance funds.
```

---

## 5.2 Wallet secrets

- [ ] No screen asks for seed phrase.
- [ ] No modal asks for seed phrase.
- [ ] No error state asks for seed phrase.
- [ ] No support flow asks for seed phrase.
- [ ] No Smith AI response asks for seed phrase.
- [ ] No screen asks for private key.
- [ ] No screen asks for wallet password.
- [ ] No screen asks for wallet backup file.
- [ ] No analytics payload includes wallet secrets.

Critical failure:

```text
Any UI, copy, AI response, prompt, or event asks for or stores wallet secrets.
```

---

## 5.3 Wallet UI

- [ ] Supported wallets are Phantom, Solflare, and Backpack.
- [ ] Unsupported wallets are not shown as supported.
- [ ] Wallet pill appears only when real wallet is connected.
- [ ] Wallet pill is hidden in Demo Mode.
- [ ] Wallet pill uses provider plus short address.
- [ ] Full address is not shown by default in Global Nav.
- [ ] Wallet menu includes Disconnect Wallet.
- [ ] Disconnect does not imply funds are moved or deleted.
- [ ] Wallet errors reassure that funds stay in wallet when relevant.

---

# 6. Demo Mode QA

## 6.1 Demo state

- [ ] `demo_mode = true`.
- [ ] `is_sample_data = true`.
- [ ] Demo banner is visible.
- [ ] Demo banner is outside Global Nav.
- [ ] Demo data is clearly labeled as sample data.
- [ ] Wallet pill is hidden.
- [ ] Real wallet state is not shown.
- [ ] Demo Mode does not request signatures.
- [ ] Demo Mode does not execute transactions.

Critical failure:

```text
Demo data is presented as real wallet data.
```

---

## 6.2 Demo transitions

- [ ] Entering Demo Mode does not connect a wallet.
- [ ] Exiting Demo Mode clears demo-dependent state.
- [ ] Connecting a wallet from Demo Mode clears demo portfolio.
- [ ] Connecting a wallet from Demo Mode clears demo suggestions.
- [ ] Connecting a wallet from Demo Mode clears demo Top Pick.
- [ ] Real wallet mode regenerates real wallet suggestions.
- [ ] Demo Top Pick does not persist into real wallet mode.

Critical failure:

```text
Demo Top Pick or demo suggestions carry into real wallet mode.
```

---

# 7. Portfolio QA

## 7.1 Portfolio values

- [ ] Portfolio total comes from wallet/on-chain/product data or clearly labeled demo data.
- [ ] Liquid Assets values come from approved portfolio data source.
- [ ] Staked Assets values come from approved detection logic.
- [ ] Yield Strategies values come from approved protocol detection logic.
- [ ] Asset categories come from product classification logic.
- [ ] Allocation values come from product logic.
- [ ] Safety Buffer values come from Safety Buffer logic.
- [ ] Projections come from projection logic.
- [ ] UI does not calculate or invent missing values.

---

## 7.2 Portfolio tables

- [ ] Liquid Assets table shows liquid wallet balances only.
- [ ] Plain liquid assets do not show Manage links.
- [ ] Staked Assets table shows supported staking/LST positions only.
- [ ] Yield Strategies table shows supported protocol positions only.
- [ ] Manage links open external protocols in new tabs.
- [ ] Manage links do not execute transactions.
- [ ] Manage links do not request wallet signatures in MVP.
- [ ] Manage links do not mark any action complete.

---

## 7.3 APY and earnings

- [ ] APY displays only when provided by approved source.
- [ ] Estimated earnings display only when calculable from approved data.
- [ ] Missing APY displays `Unavailable`.
- [ ] Missing estimated earnings displays `Unavailable`.
- [ ] APY is labeled estimated when relevant.
- [ ] APY is not described as guaranteed.
- [ ] Yield is not described as risk-free.

Critical failure:

```text
UI or Smith AI invents APY or estimated earnings.
```

---

# 8. Suggestions QA

## 8.1 Suggestion source

- [ ] Suggestions come from Suggestion Engine.
- [ ] Suggestion objects match `templates/suggestion-object-template.json`.
- [ ] Suggestion IDs are stable.
- [ ] Suggestion types are valid.
- [ ] Suggestion categories are valid.
- [ ] Suggestion statuses are valid.
- [ ] Suggestion actionability values are valid.
- [ ] Reason codes are present.
- [ ] Copy is present or mapped through content IDs.
- [ ] UI does not create suggestions.

Critical failure:

```text
UI or Smith AI creates, modifies, or invents suggestions.
```

---

## 8.2 Suggestion rendering

- [ ] Active/actionable suggestions render as actionable.
- [ ] Locked suggestions render locked state.
- [ ] Disabled suggestions render disabled reason.
- [ ] Stale suggestions render stale state.
- [ ] Informational suggestions are not treated as actionable.
- [ ] Completed suggestions are not active.
- [ ] Dismissed suggestions are not active.
- [ ] Expired suggestions are not active.
- [ ] Locked or disabled reason is visible in text.

---

# 9. Top Pick QA

## 9.1 Top Pick source

- [ ] Top Pick comes from Top Pick Logic.
- [ ] Top Pick output matches `templates/top-pick-output-template.json`.
- [ ] UI does not choose Top Pick.
- [ ] Smith AI does not choose Top Pick.
- [ ] Exactly one Top Pick appears when valid actionable suggestions exist.
- [ ] No Top Pick appears when no valid actionable suggestions exist.

Critical failure:

```text
Top Pick is selected by UI, Smith AI, component state, or visual ordering instead of Top Pick Logic.
```

---

## 9.2 Top Pick eligibility

- [ ] Top Pick is active.
- [ ] Top Pick is actionable.
- [ ] Locked suggestions are not Top Pick.
- [ ] Stale suggestions are not active Top Pick.
- [ ] Disabled suggestions are not Top Pick.
- [ ] Completed suggestions are not active Top Pick.
- [ ] Dismissed suggestions are not active Top Pick.
- [ ] Expired suggestions are not active Top Pick.
- [ ] Informational-only suggestions are not Top Pick.

Critical failure:

```text
Locked, stale, disabled, completed, dismissed, expired, or informational-only suggestion appears as Top Pick.
```

---

## 9.3 Safety Buffer override

- [ ] Underfunded Safety Buffer activates buffer priority.
- [ ] Valid buffer action becomes Top Pick.
- [ ] Yield opportunities are locked or deprioritized while buffer is underfunded.
- [ ] Staking/vault/DCA/optimization does not outrank buffer during override.
- [ ] Dashboard alert reflects the Top Pick.
- [ ] Smith AI explains the override but does not claim it chose Top Pick.

Critical failure:

```text
Yield or optimization becomes Top Pick while Safety Buffer override should be active.
```

---

# 10. Protocol Handoff QA

## 10.1 Protocol source

- [ ] Protocol destination comes from Protocol Logic.
- [ ] Protocol decision matches `templates/protocol-decision-template.json`.
- [ ] Protocol URL comes from approved protocol metadata.
- [ ] UI does not guess protocol URL.
- [ ] UI does not choose protocol.
- [ ] Smith AI does not choose protocol.
- [ ] Unsupported protocols are not shown as supported.

Critical failure:

```text
Protocol destination or URL is invented by UI or Smith AI.
```

---

## 10.2 Handoff behavior

- [ ] Handoff type is `external_new_tab`.
- [ ] CTA uses review/manage language.
- [ ] Handoff opens external protocol in a new tab.
- [ ] Handoff does not execute transaction.
- [ ] Handoff does not request wallet signature in MVP.
- [ ] Handoff does not move funds.
- [ ] Handoff does not mark suggestion complete on click.
- [ ] Stale protocol decisions cannot be used for active handoff.
- [ ] Missing protocol URL shows blocked/unavailable state.

Critical failure:

```text
Protocol CTA executes, signs, moves funds, marks complete, or uses guessed URL.
```

---

# 11. Smith AI QA

## 11.1 Context grounding

- [ ] Smith AI receives bounded context.
- [ ] Context matches `templates/smith-ai-context-template.json`.
- [ ] Smith AI response uses provided values only.
- [ ] Smith AI does not invent missing values.
- [ ] Smith AI uses Demo Mode language when in Demo Mode.
- [ ] Smith AI uses unavailable/loading/error language when data is missing.
- [ ] Smith AI references product logic accurately.
- [ ] Smith AI does not expose internal/private implementation details.

---

## 11.2 Smith AI boundaries

- [ ] Smith AI explains suggestions but does not create them.
- [ ] Smith AI explains Top Pick but does not choose/change it.
- [ ] Smith AI explains protocol handoffs but does not choose/change protocol.
- [ ] Smith AI does not invent APY.
- [ ] Smith AI does not invent earnings.
- [ ] Smith AI does not invent balances.
- [ ] Smith AI does not invent projections.
- [ ] Smith AI does not execute actions.
- [ ] Smith AI does not request wallet signatures.
- [ ] Smith AI does not claim funds moved.
- [ ] Smith AI does not ask for seed phrase or private key.
- [ ] Smith AI does not use guaranteed/risk-free language.

Critical failure:

```text
Smith AI invents product logic, claims execution, or asks for wallet secrets.
```

---

# 12. Loading / Empty / Error QA

## 12.1 Loading

- [ ] Loading state does not show fake balances.
- [ ] Loading state does not show fake APY.
- [ ] Loading state does not show fake suggestions.
- [ ] Loading state does not show fake Top Pick.
- [ ] Loading state does not show fake protocol URL.
- [ ] Portfolio loading uses skeletons.
- [ ] Suggestion-building wait uses approved behavior.
- [ ] Smith AI animation is only used in approved contexts.

---

## 12.2 Empty

- [ ] Empty state appears only after data loaded successfully.
- [ ] Empty state does not appear while loading.
- [ ] Empty state does not appear for errors.
- [ ] Empty state does not overclaim wallet is empty.
- [ ] Empty state does not overclaim user has no funds.
- [ ] Empty state does not overclaim no staking/yield exists if unsupported protocols may exist.

---

## 12.3 Error

- [ ] Error state does not imply funds are affected.
- [ ] Error state does not ask for wallet secrets.
- [ ] Error state does not expose raw stack trace.
- [ ] Error state has safe retry/refresh action.
- [ ] Wallet pill remains visible if wallet is still connected and only portfolio loading failed.
- [ ] Partial usable data is not hidden behind full-page error unless page cannot function.

---

## 12.4 Partial, stale, unavailable, locked, blocked

- [ ] Partial state keeps loaded data visible.
- [ ] Missing fields in partial state show `Unavailable`.
- [ ] Stale state is clearly labeled.
- [ ] Stale suggestions are not active Top Pick.
- [ ] Stale protocol decisions are not used for active handoffs.
- [ ] Unavailable values are not estimated.
- [ ] Locked state explains why it is locked.
- [ ] Locked suggestions cannot be Top Pick.
- [ ] Blocked state explains the blocker.

---

# 13. Accessibility QA

## 13.1 General accessibility

- [ ] Page has correct title.
- [ ] Main navigation has label.
- [ ] Buttons have accessible labels.
- [ ] Wallet pill has accessible label.
- [ ] Modals move focus on open.
- [ ] Focus returns to trigger on modal close.
- [ ] Error states are readable in text.
- [ ] Loading states are understandable when long-running.
- [ ] Empty states are readable in text.
- [ ] Disabled/locked reasons are available in text.
- [ ] Color is not the only source of meaning.
- [ ] Icons are not the only source of meaning.

---

## 13.2 Finance/product accessibility

- [ ] Progress bars have accessible labels.
- [ ] Charts have readable labels or summaries.
- [ ] External links say they open in a new tab.
- [ ] Table columns have clear labels.
- [ ] Status badges have text labels.
- [ ] Tooltips are not the only place critical information appears.

High failure:

```text
Important financial state is conveyed only by color, icon, tooltip, or chart visual.
```

---

# 14. Analytics QA

## 14.1 Safe events

- [ ] Events avoid wallet secrets.
- [ ] Events avoid raw sensitive error payloads.
- [ ] Wallet connected event does not include seed phrase or private key.
- [ ] Protocol handoff event says `executes_transaction = false`.
- [ ] Protocol handoff event says `requires_wallet_signature = false`.
- [ ] Protocol handoff event says `marks_suggestion_complete = false`.
- [ ] Wallet disconnect event says `funds_affected = false`.
- [ ] Demo events distinguish sample data from real wallet data.

Critical failure:

```text
Analytics captures wallet secrets or misleading execution flags.
```

---

# 15. Regression QA

Run this after changes to shared components, logic boundaries, or copy.

- [ ] No new raw styling bypasses tokens.
- [ ] No new unapproved copy appears.
- [ ] No component started calculating product logic.
- [ ] No UI layer started choosing suggestions.
- [ ] No UI layer started choosing Top Pick.
- [ ] No UI layer started choosing protocols.
- [ ] No Smith AI response invents missing data.
- [ ] No wallet flow asks for secrets.
- [ ] No MVP handoff executes/signs/completes.
- [ ] No loading/error/empty state shows fake values.
- [ ] No Demo Mode state appears as real wallet state.
- [ ] No unsupported wallet/protocol appears as supported.

---

# 16. Blocking Failures

Any of these block approval:

```text
- Seed phrase/private key/password/backup request appears anywhere.
- UI implies WealthSmith holds, controls, or moves funds.
- Wallet connection implies transaction approval.
- MVP suggestion CTA executes transaction.
- MVP protocol handoff requests wallet signature.
- MVP protocol handoff marks suggestion complete on click.
- UI chooses or invents suggestions.
- UI chooses or invents Top Pick.
- Smith AI chooses or changes Top Pick.
- UI or Smith AI chooses protocol destination.
- UI or Smith AI invents APY or estimated earnings.
- UI or Smith AI invents balances or projections.
- UI or Smith AI invents protocol URL.
- Demo data is shown as real wallet data.
- Unsupported wallet/protocol shown as supported.
- Loading/empty/error state shows fake financial data.
- Analytics captures wallet secrets.
```

---

# 17. QA Result Summary

```yaml
review_result: {pass|fail|blocked}
reviewer: {name}
date: {date}
environment: {local|staging|production|storybook|claude-code}
build_or_commit: {build_id_or_commit_hash}
scenario: {scenario_name}
fixture: {fixture_path}
```

Passed:

```text
- {area}
```

Failed:

```text
- {area}
```

Blocking issues:

```text
- {issue}
```

Required fixes:

```text
- {fix}
```

Notes:

```text
{notes}
```

---

## Claude Code Instructions

When Claude Code uses this checklist:

```text
1. Read the fixture and related source files.
2. Inspect the implementation or generated output.
3. Mark each checklist item pass/fail/not applicable.
4. For failed items, cite the exact source file or rule.
5. Suggest the smallest safe fix.
6. Do not invent missing expected values.
7. Do not mark unchecked items as passed.
```

Claude Code must prioritize:

```text
wallet safety
non-custodial language
no invented financial data
Suggestion Engine boundary
Top Pick Logic boundary
Protocol Logic boundary
Smith AI boundary
Demo Mode sample-data boundary
loading/error/empty no-fake-data boundary
```

---

## Done Criteria

QA passes when:

```text
- All Critical items pass.
- No wallet-secret request exists.
- No custody confusion exists.
- No hidden execution exists.
- No invented financial logic exists.
- No ungrounded Smith AI behavior exists.
- No unsupported MVP wallet/protocol appears as supported.
- Loading, empty, error, partial, stale, unavailable, locked, and blocked states are safe.
- Accessibility checks pass for the reviewed area.
```
