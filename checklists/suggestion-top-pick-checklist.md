# Suggestion and Top Pick Checklist

Use this checklist whenever implementing or reviewing WealthSmith suggestions, suggestion cards, right rail suggestions, dashboard alerts, Top Pick, Safety Buffer override, Smith AI explanations of suggestions, or protocol CTA behavior attached to suggestions.

This checklist protects the core product boundary:

```text
Suggestion Engine decides what.
Top Pick Logic decides what matters most.
Protocol Logic decides where.
Smith AI explains.
UI renders.
```

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

## Source Files

Review these before using this checklist:

```text
rules/suggestion-engine-rules.md
rules/top-pick-rules.md
rules/protocol-selection-rules.md
rules/financial-logic-boundaries.md
rules/wallet-and-custody-rules.md
rules/smith-ai-rules.md
rules/demo-mode-rules.md
rules/loading-state-rules.md

content/suggestion-card-copy.md
content/smith-ai-copy.md
content/wallet-copy.md
content/demo-mode-copy.md
content/empty-error-loading-copy.md

components/suggestion-card.md
components/alert.md
components/button.md
components/badge.md
components/card.md
components/tooltip.md

patterns/suggestion-flow.md
patterns/dashboard-layout.md
patterns/portfolio-overview.md
patterns/empty-loading-error-states.md

templates/suggestion-object-template.json
templates/top-pick-output-template.json
templates/protocol-decision-template.json
templates/smith-ai-context-template.json
templates/empty-error-loading-state-template.json

examples/suggestions/suggestions-buffer-underfunded.json
examples/top-pick/top-pick-buffer-case.json
examples/demo-mode/demo-suggestions.json
examples/protocol-handoffs/protocol-jupiter-swap.json
examples/smith-ai/smith-ai-top-pick-examples.md
```

---

# 1. Core Product Boundary

## 1.1 Responsibility separation

- [ ] Suggestion Engine decides suggestions.
- [ ] Top Pick Logic decides Top Pick.
- [ ] Protocol Logic decides protocol destination.
- [ ] Smith AI explains suggestions and Top Pick.
- [ ] UI renders structured state.
- [ ] Components render props/state only.
- [ ] UI does not create suggestions.
- [ ] UI does not choose Top Pick.
- [ ] UI does not choose protocol.
- [ ] Smith AI does not create suggestions.
- [ ] Smith AI does not choose Top Pick.
- [ ] Smith AI does not choose protocol.

Critical failure:

```text
UI, component code, or Smith AI creates, ranks, chooses, changes, or overrides suggestions, Top Pick, or protocol destination.
```

---

## 1.2 No invented suggestion data

- [ ] UI does not invent suggestion IDs.
- [ ] UI does not invent suggestion types.
- [ ] UI does not invent suggestion categories.
- [ ] UI does not invent reason codes.
- [ ] UI does not invent severity.
- [ ] UI does not invent actionability.
- [ ] UI does not invent Safety Buffer values.
- [ ] UI does not invent APY.
- [ ] UI does not invent estimated earnings.
- [ ] UI does not invent portfolio values.
- [ ] UI does not invent protocol destinations.
- [ ] UI does not invent protocol URLs.
- [ ] UI does not invent CTA labels when approved copy exists.
- [ ] Smith AI does not invent any missing suggestion data.

Critical failure:

```text
Any suggestion card, dashboard alert, Smith AI response, or protocol CTA displays invented financial/product data.
```

---

# 2. Suggestion Object Contract

## 2.1 Required fields

Each suggestion must follow:

```text
templates/suggestion-object-template.json
```

Checklist:

- [ ] Suggestion has stable `id`.
- [ ] Suggestion has valid `type`.
- [ ] Suggestion has valid `category`.
- [ ] Suggestion has valid `status`.
- [ ] Suggestion has valid `actionability`.
- [ ] Suggestion has severity or priority indicator when required.
- [ ] Suggestion has reason codes.
- [ ] Suggestion has copy or content IDs.
- [ ] Suggestion has data object when values are displayed.
- [ ] Suggestion has action object when CTA is shown.
- [ ] Suggestion has protocol decision reference when protocol CTA is shown.
- [ ] Suggestion has Top Pick flags.
- [ ] Suggestion has locked/disabled/stale details when relevant.
- [ ] Suggestion has Smith AI explanation context or constraints when relevant.

High failure:

```text
Suggestion renders without required fields or with fields invented by UI fallback logic.
```

---

## 2.2 Valid suggestion status

Allowed statuses:

```text
active
locked
disabled
stale
completed
dismissed
expired
```

Checklist:

- [ ] Active suggestions render as active only when valid.
- [ ] Locked suggestions render locked state.
- [ ] Disabled suggestions render disabled reason.
- [ ] Stale suggestions render stale state.
- [ ] Completed suggestions are not shown as active.
- [ ] Dismissed suggestions are not shown as active.
- [ ] Expired suggestions are not shown as active.
- [ ] Unknown status falls back to safe unavailable/blocked state.

Critical failure:

```text
Locked, disabled, stale, completed, dismissed, or expired suggestion is treated as active actionable suggestion.
```

---

## 2.3 Valid actionability

Allowed actionability values:

```text
actionable
locked
disabled
informational
unavailable
```

Checklist:

- [ ] `actionable` suggestions may show active CTA only if guardrails pass.
- [ ] `locked` suggestions show locked badge and reason.
- [ ] `disabled` suggestions show disabled reason.
- [ ] `informational` suggestions do not show execution-style CTAs.
- [ ] `unavailable` suggestions show unavailable state.
- [ ] Unknown actionability falls back to safe disabled/unavailable state.

Critical failure:

```text
Informational, locked, disabled, or unavailable suggestion is treated as actionable.
```

---

# 3. Suggestion Card Rendering

## 3.1 Card content

- [ ] Card title comes from suggestion copy/content.
- [ ] Card description comes from suggestion copy/content.
- [ ] Card reason text comes from reason codes or approved copy.
- [ ] Card values come from suggestion data.
- [ ] Card does not calculate missing values.
- [ ] Card does not invent missing APY.
- [ ] Card does not invent estimated earnings.
- [ ] Card does not invent portfolio impact.
- [ ] Card does not invent risk text.
- [ ] Card uses approved badges.
- [ ] Card uses approved icons.

Source file:

```text
components/suggestion-card.md
```

---

## 3.2 Card badges

- [ ] Top Pick badge appears only when `is_top_pick = true`.
- [ ] Locked badge appears only when suggestion is locked.
- [ ] Disabled state appears only when suggestion is disabled.
- [ ] Stale state appears only when suggestion is stale.
- [ ] Informational state is visually distinct from actionable state.
- [ ] Badge text is readable and not icon-only.
- [ ] Badge copy comes from approved content or structured suggestion copy.

Critical failure:

```text
Top Pick badge appears because of visual ordering, UI state, or local component logic rather than Top Pick output.
```

---

## 3.3 Card CTAs

- [ ] CTA appears only when suggestion/action state allows it.
- [ ] CTA label comes from suggestion action, protocol decision, or approved content.
- [ ] Locked suggestion CTA is disabled or replaced with locked explanation.
- [ ] Disabled suggestion CTA is disabled or hidden with explanation.
- [ ] Stale suggestion CTA requires refresh before active handoff.
- [ ] Informational suggestion CTA does not imply execution.
- [ ] Protocol CTA uses review/manage language.
- [ ] CTA does not execute transaction in MVP.
- [ ] CTA does not request wallet signature in MVP.
- [ ] CTA does not move funds.
- [ ] CTA does not mark suggestion complete on click.

Critical failure:

```text
Suggestion CTA executes, signs, moves funds, or marks completion in MVP.
```

---

# 4. Suggestion Ordering

## 4.1 Source of order

- [ ] Suggestion order comes from product output or approved ranking metadata.
- [ ] UI does not reorder suggestions by visual preference.
- [ ] UI does not put highest APY first unless product logic says so.
- [ ] UI does not put protocol-sponsored options first.
- [ ] UI does not rank suggestions alphabetically unless product logic says so.
- [ ] UI does not rank by card height, icon, or local state.
- [ ] Top Pick visual placement matches Top Pick output and pattern rules.

High failure:

```text
UI reorders suggestions in conflict with Suggestion Engine or Top Pick Logic.
```

---

## 4.2 Right rail order

- [ ] Right rail follows approved priority.
- [ ] Top Pick is clearly visible.
- [ ] Locked/informational cards do not outrank active Top Pick.
- [ ] Safety Buffer alert/card appears as priority when override is active.
- [ ] Loading state does not show fake suggestion order.
- [ ] Empty state appears only when suggestion output is ready and empty.

Source file:

```text
patterns/suggestion-flow.md
```

---

# 5. Top Pick Output Contract

## 5.1 Required Top Pick output

Top Pick must follow:

```text
templates/top-pick-output-template.json
```

Checklist:

- [ ] Top Pick output includes `has_top_pick`.
- [ ] Top Pick output includes `top_pick_id` when `has_top_pick = true`.
- [ ] Top Pick output includes reason codes.
- [ ] Top Pick output includes priority category.
- [ ] Top Pick output includes selection trace or decision explanation when required.
- [ ] Top Pick output includes no-top-pick reason when `has_top_pick = false`.
- [ ] UI reads Top Pick output instead of deriving Top Pick locally.
- [ ] Smith AI receives Top Pick context instead of deriving Top Pick.

Critical failure:

```text
Top Pick appears without valid Top Pick Logic output.
```

---

## 5.2 Exactly one Top Pick

- [ ] Exactly one Top Pick appears when valid actionable suggestions exist.
- [ ] Zero Top Picks appear when no valid actionable suggestion exists.
- [ ] Multiple cards do not show Top Pick badge.
- [ ] Top Pick badge does not appear in stale/no-valid state.
- [ ] Demo Mode Top Pick is sample-only and separated from real wallet Top Pick.

Critical failure:

```text
Multiple Top Picks appear, or Top Pick appears when no valid actionable suggestion exists.
```

---

# 6. Top Pick Eligibility

## 6.1 Eligible Top Pick

Top Pick must be:

```text
active
actionable
guardrails_passed
not stale
not locked
not disabled
not completed
not dismissed
not expired
not informational-only
```

Checklist:

- [ ] Top Pick is active.
- [ ] Top Pick is actionable.
- [ ] Top Pick passed guardrails.
- [ ] Top Pick is not stale.
- [ ] Top Pick is not locked.
- [ ] Top Pick is not disabled.
- [ ] Top Pick is not completed.
- [ ] Top Pick is not dismissed.
- [ ] Top Pick is not expired.
- [ ] Top Pick is not informational-only.

Critical failure:

```text
Ineligible suggestion appears as Top Pick.
```

---

## 6.2 Excluded Top Pick states

These must never be active Top Pick:

```text
locked
disabled
stale
completed
dismissed
expired
informational-only
unavailable
blocked
```

Checklist:

- [ ] Locked suggestion cannot be Top Pick.
- [ ] Disabled suggestion cannot be Top Pick.
- [ ] Stale suggestion cannot be active Top Pick.
- [ ] Completed suggestion cannot be active Top Pick.
- [ ] Dismissed suggestion cannot be active Top Pick.
- [ ] Expired suggestion cannot be active Top Pick.
- [ ] Informational-only suggestion cannot be Top Pick.
- [ ] Unavailable suggestion cannot be Top Pick.
- [ ] Blocked suggestion cannot be Top Pick.

Critical failure:

```text
Excluded suggestion state is labeled Top Pick.
```

---

# 7. Priority Categories

## 7.1 Category priority

Approved priority order:

```text
1. Safety Buffer actions
2. Rebalance actions
3. Capital efficiency actions
4. Optimization actions
```

Checklist:

- [ ] Priority category is present in Top Pick output.
- [ ] Safety Buffer actions outrank lower categories when applicable.
- [ ] Rebalance actions outrank capital efficiency and optimization when applicable.
- [ ] Capital efficiency outranks optimization when applicable.
- [ ] Optimization does not outrank higher priority valid actions.
- [ ] UI does not override category priority.

Critical failure:

```text
Lower-priority category becomes Top Pick in conflict with Top Pick Logic or Safety Buffer override.
```

---

## 7.2 Ranking within category

Ranking within a category should come from product logic.

Checklist:

- [ ] Impact score comes from product logic.
- [ ] Urgency score comes from product logic.
- [ ] Efficiency score comes from product logic.
- [ ] UI does not calculate scores.
- [ ] UI does not change rank based on visual order.
- [ ] Smith AI does not calculate scores.

High failure:

```text
UI or Smith AI calculates or changes ranking scores.
```

---

# 8. Safety Buffer Override

## 8.1 Override activation

Safety Buffer override applies when the user’s Safety Buffer is below required target and a valid buffer action exists.

Checklist:

- [ ] Safety Buffer target comes from product logic.
- [ ] Current buffer value comes from product logic.
- [ ] Buffer gap comes from product logic.
- [ ] Coverage percentage comes from product logic.
- [ ] Underfunded state activates buffer priority.
- [ ] Valid buffer funding action becomes Top Pick.
- [ ] Dashboard alert reflects buffer priority.
- [ ] Smith AI explains buffer priority using provided values only.

Critical failure:

```text
Safety Buffer values are calculated locally in UI or invented by Smith AI.
```

---

## 8.2 Override effect

When override is active:

- [ ] Buffer action is Top Pick when valid/actionable.
- [ ] Yield suggestions are locked or deprioritized.
- [ ] Staking suggestions do not outrank buffer action.
- [ ] Vault suggestions do not outrank buffer action.
- [ ] DCA suggestions do not outrank buffer action.
- [ ] Optimization suggestions do not outrank buffer action.
- [ ] UI explains locked yield with buffer reason.
- [ ] Smith AI explains that buffer comes first without claiming it chose the Top Pick.

Critical failure:

```text
Yield, staking, vault, DCA, or optimization suggestion becomes Top Pick while valid Safety Buffer override is active.
```

---

## 8.3 Buffer-funded state

When Safety Buffer is satisfied:

- [ ] Buffer override is inactive.
- [ ] Buffer action is not forced as Top Pick.
- [ ] Yield or optimization suggestions may become eligible only if product logic says so.
- [ ] UI does not keep old buffer Top Pick after buffer is funded.
- [ ] Smith AI does not explain old buffer priority after state changes.

High failure:

```text
Stale Safety Buffer priority persists after buffer state changes.
```

---

# 9. Guardrails

## 9.1 Guardrail checks

Guardrails may include:

```text
minimum trade size
cost threshold
liquidity validity
slippage threshold
supported asset
supported action
supported protocol
Safety Buffer preservation
fresh data
```

Checklist:

- [ ] Guardrail results come from product logic.
- [ ] Suggestion cannot be actionable if required guardrails fail.
- [ ] Top Pick cannot be selected if required guardrails fail.
- [ ] Failed guardrail reason is visible when relevant.
- [ ] UI does not bypass guardrails.
- [ ] Smith AI does not bypass guardrails.
- [ ] Protocol handoff does not open when guardrails block it.

Critical failure:

```text
Suggestion is actionable or Top Pick despite failed required guardrail.
```

---

## 9.2 Known MVP thresholds

Known thresholds from product rules:

```text
minimum trade: $50
rebalance delta: +/-10%
idle capital: >= $250
underweight core asset: >= 5%
slippage rejection: > 0.5%
```

Checklist:

- [ ] Thresholds are owned by product logic, not UI.
- [ ] UI does not hardcode thresholds unless explicitly approved by engineering/product architecture.
- [ ] Smith AI explains thresholds only when provided in context.
- [ ] Missing threshold data is not invented.

High failure:

```text
UI or Smith AI hardcodes or invents thresholds outside approved logic.
```

---

# 10. Locked, Disabled, Stale, Unavailable

## 10.1 Locked suggestions

- [ ] Locked suggestions show Locked badge.
- [ ] Locked suggestions include reason.
- [ ] Locked suggestions include unlock condition when available.
- [ ] Locked suggestions do not show active CTA.
- [ ] Locked suggestions cannot be Top Pick.
- [ ] Locked yield due to Safety Buffer explains buffer requirement.
- [ ] Smith AI explains locked state using provided reason only.

Critical failure:

```text
Locked suggestion appears as Top Pick or opens active transaction/protocol handoff.
```

---

## 10.2 Disabled suggestions

- [ ] Disabled suggestions show disabled state.
- [ ] Disabled reason is visible.
- [ ] Disabled CTA is hidden or disabled.
- [ ] Disabled suggestions cannot be Top Pick.
- [ ] Disabled suggestions do not open protocol handoff.
- [ ] Smith AI does not tell user to complete disabled action.

---

## 10.3 Stale suggestions

- [ ] Stale suggestions are clearly labeled.
- [ ] Stale suggestions require refresh before review.
- [ ] Stale suggestions cannot be active Top Pick.
- [ ] Stale protocol decisions cannot be used.
- [ ] Previous data may show only when labeled stale.
- [ ] Smith AI says data needs refresh.

Critical failure:

```text
Stale suggestion remains active Top Pick or uses stale protocol handoff.
```

---

## 10.4 Unavailable values

- [ ] Missing APY displays `Unavailable`.
- [ ] Missing earnings displays `Unavailable`.
- [ ] Missing protocol URL displays blocked/unavailable state.
- [ ] Missing price displays unavailable/partial state.
- [ ] UI does not estimate unavailable values.
- [ ] Smith AI does not estimate unavailable values.

Critical failure:

```text
Unavailable value is guessed or fabricated.
```

---

# 11. Protocol CTAs on Suggestions

## 11.1 Protocol decision source

- [ ] Suggestion uses Protocol Logic output when protocol CTA is present.
- [ ] Protocol decision follows `templates/protocol-decision-template.json`.
- [ ] Protocol destination is approved MVP protocol.
- [ ] Protocol URL is approved.
- [ ] UI does not guess protocol URL.
- [ ] UI does not choose protocol destination.
- [ ] Smith AI does not choose protocol destination.

Critical failure:

```text
Protocol destination or URL is invented.
```

---

## 11.2 CTA behavior

- [ ] CTA label uses review/manage language.
- [ ] CTA opens external protocol in new tab.
- [ ] CTA does not execute transaction.
- [ ] CTA does not request wallet signature in MVP.
- [ ] CTA does not move funds.
- [ ] CTA does not mark suggestion complete.
- [ ] CTA includes external-link affordance/accessibility label.
- [ ] Locked/stale/blocked protocol CTA is disabled or unavailable.

Correct CTA examples:

```text
Review on Jupiter
Manage on Kamino
Review details
```

Forbidden CTA examples:

```text
Swap Now
Deposit Now
Stake Now
Execute Trade
Complete Transaction
```

Critical failure:

```text
Suggestion CTA executes, signs, moves funds, marks complete, or uses execution-style copy in MVP.
```

---

# 12. Dashboard Alert and Top Pick Sync

## 12.1 Alert sync

- [ ] Dashboard alert reflects current Top Pick or highest-priority required state.
- [ ] Dashboard alert does not invent a separate recommendation.
- [ ] Dashboard alert updates when Top Pick changes.
- [ ] Dashboard alert clears when no longer applicable.
- [ ] Dashboard alert does not conflict with suggestion list.
- [ ] Dashboard alert does not show stale Top Pick.

High failure:

```text
Dashboard alert conflicts with Top Pick output.
```

---

## 12.2 Right rail sync

- [ ] Right rail Top Pick matches Top Pick output.
- [ ] Right rail ordering matches suggestion output/ranking rules.
- [ ] Right rail loading does not show fake suggestions.
- [ ] Right rail empty state appears only when suggestion output is ready and empty.
- [ ] Right rail locked cards show reason.
- [ ] Smith AI panel does not alter suggestion ordering.

---

# 13. Demo Mode Suggestions

## 13.1 Demo suggestion state

- [ ] Demo suggestions are labeled sample/demo where appropriate.
- [ ] Demo suggestions follow same object shape as real suggestions.
- [ ] Demo Top Pick is sample-only.
- [ ] Demo Top Pick does not persist into real wallet mode.
- [ ] Demo suggestion CTAs do not execute transactions.
- [ ] Demo suggestion CTAs do not request wallet signatures.
- [ ] Demo data is not presented as real wallet data.
- [ ] Smith AI uses demo-aware language.

Critical failure:

```text
Demo suggestions or Demo Top Pick are presented as real personalized recommendations.
```

---

## 13.2 Demo to real wallet

- [ ] Connecting a real wallet clears demo suggestions.
- [ ] Connecting a real wallet clears demo Top Pick.
- [ ] Real wallet suggestions regenerate from real wallet data.
- [ ] Real wallet Top Pick comes from real Top Pick Logic output.
- [ ] No demo reason codes persist into real wallet context.

Critical failure:

```text
Demo Top Pick carries into real wallet mode.
```

---

# 14. Smith AI Suggestion and Top Pick Explanations

## 14.1 Allowed explanations

Smith AI may explain:

```text
what a suggestion means
why a suggestion appears
why a suggestion is locked
why Safety Buffer is prioritized
why a card is Top Pick
why there is no Top Pick
what Review on Jupiter means
what Manage on Kamino means
why data is unavailable
why suggestion state is stale
```

Checklist:

- [ ] Smith AI explanation uses provided suggestion context.
- [ ] Smith AI explanation uses provided Top Pick context.
- [ ] Smith AI explanation uses provided protocol context.
- [ ] Smith AI explanation uses approved copy style.
- [ ] Smith AI explanation is demo-aware in Demo Mode.
- [ ] Smith AI explanation is clear that it did not choose Top Pick.

---

## 14.2 Forbidden explanations

- [ ] Smith AI does not say “I chose this Top Pick.”
- [ ] Smith AI does not choose a different Top Pick.
- [ ] Smith AI does not tell user to ignore deterministic logic as a new recommendation.
- [ ] Smith AI does not invent APY.
- [ ] Smith AI does not invent earnings.
- [ ] Smith AI does not invent balance changes.
- [ ] Smith AI does not invent risk score.
- [ ] Smith AI does not invent protocol route.
- [ ] Smith AI does not claim transaction was submitted.
- [ ] Smith AI does not ask for wallet signature.
- [ ] Smith AI does not ask for seed phrase/private key.
- [ ] Smith AI does not use guaranteed/risk-free language.

Critical failure:

```text
Smith AI invents suggestion data, changes Top Pick, chooses protocol, or claims execution.
```

---

# 15. Copy and Tone

## 15.1 Approved tone

- [ ] Copy is calm.
- [ ] Copy is clear.
- [ ] Copy is beginner-friendly.
- [ ] Copy is not hype-driven.
- [ ] Copy does not shame holdings.
- [ ] Copy does not pressure user.
- [ ] Copy avoids guaranteed outcomes.
- [ ] Copy avoids financial-advisor style certainty.
- [ ] Copy uses approved suggestion-card phrasing.

---

## 15.2 Required safety copy

When relevant:

- [ ] `No action will be taken automatically.`
- [ ] `Your funds stay in your wallet.`
- [ ] `Review on {Protocol}` for external review CTAs.
- [ ] `Unavailable` for missing APY/earnings/data.
- [ ] Demo Mode says sample data.

Critical failure:

```text
Suggestion or Top Pick copy implies automatic execution, guaranteed return, or custody.
```

---

# 16. Accessibility

## 16.1 Suggestion accessibility

- [ ] Suggestion card title is readable.
- [ ] Badge text is readable.
- [ ] Top Pick badge is not icon-only.
- [ ] Locked/disabled/stale reasons are available in text.
- [ ] CTA labels are accessible.
- [ ] External protocol links identify new-tab behavior.
- [ ] Card status is not conveyed by color alone.
- [ ] Values have text labels.
- [ ] Tooltips are not the only place critical information appears.
- [ ] Keyboard navigation reaches card CTA.
- [ ] Focus state is visible.

High failure:

```text
Top Pick, locked state, or protocol handoff meaning is conveyed only by color/icon/tooltip.
```

---

# 17. Analytics

## 17.1 Suggestion events

- [ ] Suggestion impression event uses suggestion ID.
- [ ] Top Pick impression event uses Top Pick ID from logic.
- [ ] CTA click event does not imply execution.
- [ ] Protocol handoff event says `executes_transaction = false`.
- [ ] Protocol handoff event says `requires_wallet_signature = false`.
- [ ] Protocol handoff event says `marks_suggestion_complete = false`.
- [ ] Dismiss/completion events occur only when product supports them.
- [ ] Events do not include wallet secrets.
- [ ] Events do not include raw sensitive state.

Critical failure:

```text
Analytics claims a transaction executed or suggestion completed from external handoff click.
```

---

# 18. Regression Checks

Run after any change to suggestion logic, Top Pick, cards, right rail, dashboard alert, protocol CTA, or Smith AI.

- [ ] No new component logic creates suggestions.
- [ ] No new component logic chooses Top Pick.
- [ ] No new component logic chooses protocol.
- [ ] No new UI copy implies execution.
- [ ] No new Top Pick appears without Top Pick output.
- [ ] No locked suggestion can become Top Pick.
- [ ] No stale suggestion can stay active Top Pick.
- [ ] No missing APY is estimated.
- [ ] No protocol URL is guessed.
- [ ] No Demo Top Pick persists into real wallet mode.
- [ ] No Smith AI response invents suggestion data.
- [ ] No external handoff executes/signs/completes.

---

# 19. Blocking Failures

Any of these block release or merge:

```text
- UI creates suggestions.
- UI chooses or changes Top Pick.
- UI chooses or invents protocol destination.
- Smith AI creates suggestions.
- Smith AI chooses or changes Top Pick.
- Smith AI chooses or invents protocol destination.
- More than one Top Pick appears.
- Top Pick appears when no valid actionable suggestion exists.
- Locked suggestion is Top Pick.
- Disabled suggestion is Top Pick.
- Stale suggestion is active Top Pick.
- Completed/dismissed/expired suggestion is active Top Pick.
- Informational-only suggestion is Top Pick.
- Safety Buffer override is ignored.
- Yield/optimization outranks valid Safety Buffer action while buffer is underfunded.
- Suggestion CTA executes transaction.
- Suggestion CTA requests wallet signature in MVP.
- Suggestion CTA moves funds.
- Suggestion CTA marks complete on external handoff click.
- APY or estimated earnings is invented.
- Protocol URL is invented.
- Demo Top Pick persists into real wallet mode.
- Smith AI claims transaction execution.
- Smith AI asks for seed phrase or private key.
```

---

# 20. Review Summary

```yaml
review_result: {pass|fail|blocked}
reviewer: {name}
date: {date}
environment: {local|staging|production|storybook|claude-code}
build_or_commit: {build_id_or_commit_hash}
area_reviewed: {suggestion-card|right-rail|dashboard-alert|top-pick|safety-buffer|protocol-cta|smith-ai|demo-mode}
fixture: {fixture_path}
```

Passed:

```text
- {item}
```

Failed:

```text
- {item}
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
Read this checklist and all referenced source files.
Inspect the implementation, fixtures, UI state, copy, events, and Smith AI prompts/responses.
Mark each item pass/fail/not applicable.
For failed items, cite the exact conflicting rule or source file.
Suggest the smallest safe fix.
Do not invent missing values.
Do not mark unchecked suggestion or Top Pick items as passed.
```

Claude Code must prioritize:

```text
Suggestion Engine boundary
Top Pick Logic boundary
Protocol Logic boundary
Safety Buffer override
locked/stale/disabled exclusions
no invented APY/earnings/balances
MVP handoff no-execution behavior
Smith AI explanation-only behavior
Demo Mode sample-data boundary
```

---

## Done Criteria

Suggestion and Top Pick implementation passes when:

```text
- No Critical item fails.
- Suggestions come only from Suggestion Engine.
- Top Pick comes only from Top Pick Logic.
- Protocol destinations come only from Protocol Logic.
- Exactly one valid Top Pick appears when appropriate.
- Safety Buffer override is respected.
- Locked, disabled, stale, completed, dismissed, expired, unavailable, blocked, and informational-only suggestions cannot be active Top Pick.
- Suggestion CTAs are MVP-safe and review-only when external.
- Smith AI explains but does not decide.
- No APY, earnings, balances, suggestions, Top Pick, or protocol URL is invented.
