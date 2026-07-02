# MVP Implementation Checklist

Use this checklist before merging or approving WealthSmith MVP implementation work.

This checklist is for:

```text
engineering PR review
Claude Code validation
design QA
product QA
implementation handoff
pre-launch review
```

It verifies that the implementation follows the approved WealthSmith design system, product behavior rules, copy, examples, and templates.

---

## Result Legend

Use this format for each item:

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

Before using this checklist, review:

```text
README.md
tokens/README.md
assets/README.md
components/README.md
patterns/README.md
rules/README.md
content/README.md
examples/README.md
templates/README.md
checklists/README.md
```

Core rules:

```text
rules/financial-logic-boundaries.md
rules/wallet-and-custody-rules.md
rules/suggestion-engine-rules.md
rules/top-pick-rules.md
rules/protocol-selection-rules.md
rules/smith-ai-rules.md
rules/demo-mode-rules.md
rules/loading-state-rules.md
```

---

# 1. Repo Usage

## 1.1 Source-of-truth hierarchy

- [ ] Implementation follows the hierarchy: `rules > content > components > patterns > tokens > assets > examples > templates`.
- [ ] Rules are treated as behavior source of truth.
- [ ] Content files are treated as copy source of truth.
- [ ] Component specs are treated as UI contract source of truth.
- [ ] Pattern files are used for page and flow behavior.
- [ ] Examples are used as completed fixtures, not production logic.
- [ ] Templates are used as structure, not source of behavior.

Critical failure:

```text
Implementation follows examples or screenshots in conflict with rules.
```

---

## 1.2 No invented product logic

- [ ] UI does not invent balances.
- [ ] UI does not invent prices.
- [ ] UI does not invent APY.
- [ ] UI does not invent estimated earnings.
- [ ] UI does not invent projections.
- [ ] UI does not invent allocation targets.
- [ ] UI does not invent Safety Buffer values.
- [ ] UI does not invent suggestions.
- [ ] UI does not invent Top Pick.
- [ ] UI does not invent reason codes.
- [ ] UI does not invent protocol destinations.
- [ ] UI does not invent protocol URLs.
- [ ] UI does not invent routes, slippage, or trade size.
- [ ] UI does not invent wallet permissions.

Critical failure:

```text
Any financial value, suggestion, Top Pick, protocol URL, APY, or wallet permission is fabricated by UI or AI.
```

---

# 2. Tokens and Visual System

## 2.1 Semantic token usage

- [ ] Components use semantic tokens instead of raw colors.
- [ ] Components use semantic spacing tokens instead of raw spacing.
- [ ] Components use semantic typography tokens.
- [ ] Components use semantic radius tokens.
- [ ] Components use semantic shadow tokens.
- [ ] Components use semantic z-index tokens.
- [ ] Components use semantic motion tokens.
- [ ] No one-off visual values were introduced.

High failure:

```text
Hardcoded raw colors, spacing, radii, shadows, typography, or z-index values appear where tokens should be used.
```

---

## 2.2 Layout system

- [ ] Mobile-first layout is respected.
- [ ] Breakpoints match the approved system.
- [ ] 8px grid is respected.
- [ ] Page padding follows approved breakpoints.
- [ ] Dashboard and Portfolio layouts match approved patterns.
- [ ] Smith AI overlays on mobile/tablet.
- [ ] Smith AI uses side panel behavior on desktop/wide.

Source files:

```text
patterns/dashboard-layout.md
patterns/portfolio-overview.md
patterns/onboarding-with-smith-ai.md
tokens/semantic/breakpoint.json
tokens/semantic/spacing.json
```

---

# 3. Assets

## 3.1 Logo

- [ ] Full lockup logo uses `assets/logo/wealthsmith-full-lockup.svg`.
- [ ] Symbol logo uses `assets/logo/wealthsmith-symbol.svg`.
- [ ] Logo dimensions match approved usage.
- [ ] Logo is not recolored.
- [ ] Logo is not stretched.
- [ ] Logo is not modified.

High failure:

```text
Logo is edited, recolored, stretched, or replaced with unapproved asset.
```

---

## 3.2 Icons

- [ ] Icons come from `assets/icons/icon-registry.json`.
- [ ] Wallet icons use approved Phantom, Solflare, Backpack assets.
- [ ] Protocol icons use approved MVP protocol assets.
- [ ] Token icons use approved token assets.
- [ ] Fallback token icon is used only when token icon is unavailable.
- [ ] No protocol fallback icon is used in MVP.
- [ ] Icons are not the only source of meaning.

Source files:

```text
assets/icons/README.md
assets/icons/icon-registry.json
components/icon.md
```

---

## 3.3 Animation

- [ ] Smith AI animation uses `assets/animations/smith-ai-symbol-loop.json`.
- [ ] Smith AI animation is used only for Smith AI response waits or approved suggestion-building waits.
- [ ] Smith AI animation is not used for wallet connection.
- [ ] Smith AI animation is not used for portfolio table loading.
- [ ] Smith AI animation is not used for generic page loading.
- [ ] Smith AI animation is not used for button loading.

High failure:

```text
Smith AI animation is used as a generic spinner.
```

---

# 4. Components

## 4.1 Component boundaries

- [ ] Components render passed props/state.
- [ ] Components do not fetch wallet data.
- [ ] Components do not calculate Safety Buffer.
- [ ] Components do not generate suggestions.
- [ ] Components do not choose Top Pick.
- [ ] Components do not choose protocols.
- [ ] Components do not invent copy.
- [ ] Components do not invent balances, APY, earnings, or projections.

Critical failure:

```text
Component contains financial/product decision logic that belongs in Product Logic, Suggestion Engine, Top Pick Logic, or Protocol Logic.
```

---

## 4.2 Global Nav

- [ ] Global Nav uses the correct variant.
- [ ] Wallet connected state shows wallet pill.
- [ ] Demo Mode does not show wallet pill.
- [ ] Demo Mode banner is outside Global Nav.
- [ ] Try Demo Mode is hidden when a real wallet is connected.
- [ ] Connect Wallet CTA is hidden when wallet is already connected.
- [ ] Ask Smith AI visibility follows onboarding/demo/wallet rules.
- [ ] Nav items match enabled/disabled state.
- [ ] Full logo lockup uses approved asset and sizing.

Source files:

```text
components/global-nav.md
patterns/dashboard-layout.md
examples/dashboard/dashboard-connected-wallet-state.json
examples/dashboard/dashboard-demo-state.json
```

Critical failure:

```text
Demo Mode shows a wallet pill, or connected-wallet state shows Demo Mode banner.
```

---

## 4.3 Suggestion Card

- [ ] Suggestion card renders structured suggestion object.
- [ ] Top Pick badge renders only when `is_top_pick = true`.
- [ ] Locked badge renders only for locked suggestions.
- [ ] Disabled/locked reason is visible in text.
- [ ] CTA label comes from suggestion/protocol/content state.
- [ ] Protocol handoff CTA shows external-link affordance.
- [ ] Suggestion card click does not execute a transaction.
- [ ] Suggestion card click does not request wallet signature in MVP.
- [ ] External handoff click does not mark suggestion complete.

Source files:

```text
components/suggestion-card.md
templates/suggestion-object-template.json
examples/suggestions/suggestions-buffer-underfunded.json
```

---

## 4.4 Portfolio components

- [ ] Portfolio cards render provided values only.
- [ ] Liquid Assets table renders supported liquid wallet balances only.
- [ ] Staked Assets table renders supported staked/LST positions only.
- [ ] Yield Strategies table renders supported protocol positions only.
- [ ] APY displays only when provided by approved source.
- [ ] Missing APY displays `Unavailable`.
- [ ] Missing estimated earnings displays `Unavailable`.
- [ ] Manage links open external protocols only.
- [ ] Manage links do not execute transactions.
- [ ] Manage links do not request wallet signatures in MVP.

Source files:

```text
patterns/portfolio-overview.md
examples/portfolio/portfolio-liquid-assets.json
examples/portfolio/portfolio-staked-assets.json
examples/portfolio/portfolio-yield-strategies.json
```

---

# 5. Wallet Implementation

## 5.1 Supported wallets

- [ ] MVP wallet options are Phantom, Solflare, and Backpack.
- [ ] Unsupported wallets are not shown as supported.
- [ ] Wallet provider icons are approved assets.
- [ ] Wallet state follows `templates/wallet-state-template.json`.

Source files:

```text
rules/wallet-and-custody-rules.md
patterns/wallet-connection.md
templates/wallet-state-template.json
examples/wallet/wallet-connected-phantom-state.json
```

---

## 5.2 Read-only connection

- [ ] Wallet connection is read-only for portfolio viewing.
- [ ] Wallet connection does not imply transaction approval.
- [ ] Wallet connection does not move funds.
- [ ] Wallet connection does not grant trading permission.
- [ ] Wallet connection does not grant staking permission.
- [ ] Wallet connection does not grant deposit/withdraw permission.
- [ ] Wallet connection does not grant rebalance permission.
- [ ] Wallet connected state is separate from portfolio data readiness.

Critical failure:

```text
Wallet connection copy or state implies WealthSmith can move, trade, stake, deposit, withdraw, or rebalance funds.
```

---

## 5.3 Wallet safety

- [ ] No UI asks for seed phrase.
- [ ] No UI asks for private key.
- [ ] No UI asks for wallet password.
- [ ] No UI asks for wallet backup file.
- [ ] No Smith AI response asks for wallet secrets.
- [ ] No analytics event includes wallet secrets.
- [ ] Wallet copy includes non-custodial safety language where relevant.
- [ ] Error states say funds stay in wallet when wallet/portfolio related.

Critical failure:

```text
Any UI, copy, prompt, event, or AI response asks for seed phrase, private key, password, or backup file.
```

---

## 5.4 Wallet pill and menu

- [ ] Wallet pill shows provider plus short address.
- [ ] Full wallet address is not shown by default in Global Nav.
- [ ] Wallet pill opens wallet menu.
- [ ] Wallet menu contains Disconnect Wallet.
- [ ] Wallet menu may contain Copy Address.
- [ ] Wallet menu does not contain Transfer Funds.
- [ ] Wallet menu does not contain Export Key.
- [ ] Wallet menu does not contain Recover Wallet.
- [ ] Disconnect clears wallet-dependent app state.
- [ ] Disconnect does not imply funds are deleted or moved.

---

# 6. Demo Mode

## 6.1 Demo state

- [ ] Demo Mode sets `demo_mode = true`.
- [ ] Demo Mode sets `is_sample_data = true`.
- [ ] Demo banner is visible.
- [ ] Demo banner sits outside Global Nav.
- [ ] Demo data is clearly labeled as sample data.
- [ ] Wallet pill is hidden.
- [ ] Real wallet state is not shown.
- [ ] Demo Mode does not request signatures.
- [ ] Demo Mode does not execute transactions.

Source files:

```text
rules/demo-mode-rules.md
content/demo-mode-copy.md
templates/demo-mode-state-template.json
examples/demo-mode/demo-dashboard-state.json
examples/dashboard/dashboard-demo-state.json
```

Critical failure:

```text
Demo data is presented as real wallet data.
```

---

## 6.2 Demo to real wallet transition

- [ ] Connect Wallet from Demo Mode opens wallet flow.
- [ ] Successful wallet connection clears demo portfolio.
- [ ] Successful wallet connection clears demo suggestions.
- [ ] Successful wallet connection clears demo Top Pick.
- [ ] Real wallet suggestions are regenerated from real wallet state.
- [ ] Demo Top Pick does not persist into real wallet mode.

Critical failure:

```text
Demo suggestions or Demo Top Pick carry into connected-wallet mode.
```

---

# 7. Suggestions

## 7.1 Suggestion Engine output

- [ ] Suggestions come from Suggestion Engine output.
- [ ] Suggestion objects follow `templates/suggestion-object-template.json`.
- [ ] Suggestions include required fields.
- [ ] Suggestions include reason codes.
- [ ] Suggestions include status and actionability.
- [ ] Suggestions include copy or content IDs.
- [ ] Suggestions include protocol decisions when needed.
- [ ] UI does not create suggestions.
- [ ] UI does not invent reason codes.
- [ ] UI does not invent missing values.

Source files:

```text
rules/suggestion-engine-rules.md
templates/suggestion-object-template.json
examples/suggestions/suggestions-buffer-underfunded.json
```

---

## 7.2 Suggestion states

- [ ] Active suggestions render as actionable only when valid.
- [ ] Locked suggestions render as locked.
- [ ] Disabled suggestions render disabled reason.
- [ ] Stale suggestions render stale state.
- [ ] Informational suggestions are not treated as actionable.
- [ ] Completed/dismissed/expired suggestions are not active.
- [ ] Locked suggestions do not show active external handoff unless explicitly allowed.
- [ ] Missing APY or earnings displays `Unavailable`.

Critical failure:

```text
Locked, stale, disabled, or informational suggestion is treated as active actionable suggestion.
```

---

# 8. Top Pick

## 8.1 Top Pick source

- [ ] Top Pick comes from Top Pick Logic.
- [ ] Top Pick output follows `templates/top-pick-output-template.json`.
- [ ] UI does not choose Top Pick.
- [ ] Smith AI does not choose Top Pick.
- [ ] Exactly one Top Pick appears when valid actionable suggestions exist.
- [ ] No Top Pick appears when no valid actionable suggestion exists.

Source files:

```text
rules/top-pick-rules.md
templates/top-pick-output-template.json
examples/top-pick/top-pick-buffer-case.json
examples/smith-ai/smith-ai-top-pick-examples.md
```

Critical failure:

```text
UI or Smith AI chooses, changes, or invents Top Pick.
```

---

## 8.2 Top Pick eligibility

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
Locked, stale, disabled, completed, dismissed, expired, or informational-only suggestion is Top Pick.
```

---

## 8.3 Safety Buffer override

- [ ] Safety Buffer underfunding activates buffer priority.
- [ ] Buffer action becomes Top Pick when valid and actionable.
- [ ] Yield suggestions are locked or deprioritized while buffer is underfunded.
- [ ] Staking/vault/DCA/optimization suggestions do not outrank buffer while override is active.
- [ ] Dashboard alert reflects Top Pick.
- [ ] Smith AI explains Safety Buffer override without claiming it chose Top Pick.

Critical failure:

```text
Yield or optimization action becomes Top Pick while Safety Buffer is underfunded and buffer action is valid.
```

---

# 9. Protocol Handoffs

## 9.1 Protocol Logic source

- [ ] Protocol destination comes from Protocol Logic.
- [ ] Protocol decision follows `templates/protocol-decision-template.json`.
- [ ] Protocol URL comes from approved protocol metadata.
- [ ] UI does not guess protocol URL.
- [ ] UI does not choose protocol.
- [ ] Smith AI does not choose protocol.
- [ ] Unsupported protocols are not shown as supported.

Source files:

```text
rules/protocol-selection-rules.md
templates/protocol-decision-template.json
examples/protocol-handoffs/protocol-jupiter-swap.json
```

Critical failure:

```text
UI or Smith AI invents protocol destination or URL.
```

---

## 9.2 MVP handoff behavior

- [ ] Handoff type is `external_new_tab`.
- [ ] CTA copy uses review/manage language.
- [ ] Handoff opens external protocol in a new tab.
- [ ] Handoff does not execute transaction.
- [ ] Handoff does not request wallet signature in MVP.
- [ ] Handoff does not move funds.
- [ ] Handoff does not mark suggestion complete on click.
- [ ] Stale protocol decisions cannot be used for active handoff.
- [ ] Missing protocol URL shows unavailable/blocked state.

Critical failure:

```text
Protocol CTA executes, requests signature, moves funds, marks completion, or uses a guessed URL.
```

---

# 10. Smith AI

## 10.1 Smith AI context

- [ ] Smith AI receives bounded context.
- [ ] Smith AI context follows `templates/smith-ai-context-template.json`.
- [ ] Smith AI uses visible/product-provided state.
- [ ] Smith AI does not invent missing context.
- [ ] Smith AI uses demo-aware context in Demo Mode.
- [ ] Smith AI uses unavailable/loading/error language when data is missing.

Source files:

```text
rules/smith-ai-rules.md
content/smith-ai-copy.md
templates/smith-ai-context-template.json
examples/smith-ai/smith-ai-top-pick-examples.md
```

---

## 10.2 Smith AI boundaries

- [ ] Smith AI explains suggestions but does not create them.
- [ ] Smith AI explains Top Pick but does not choose it.
- [ ] Smith AI explains protocols but does not choose them.
- [ ] Smith AI does not invent APY.
- [ ] Smith AI does not invent estimated earnings.
- [ ] Smith AI does not invent balances.
- [ ] Smith AI does not invent projections.
- [ ] Smith AI does not claim funds moved.
- [ ] Smith AI does not claim transactions were submitted.
- [ ] Smith AI does not request wallet signatures.
- [ ] Smith AI does not ask for seed phrase or private key.
- [ ] Smith AI avoids guaranteed/risk-free language.

Critical failure:

```text
Smith AI invents product logic, claims execution, or asks for wallet secrets.
```

---

# 11. Loading, Empty, Error, Partial, Stale

## 11.1 Non-ready state contract

- [ ] Non-ready states follow `templates/empty-error-loading-state-template.json`.
- [ ] Loading states do not show fake data.
- [ ] Empty states appear only after successful data load.
- [ ] Error states do not imply funds are affected.
- [ ] Partial states keep loaded data visible.
- [ ] Stale states are clearly labeled.
- [ ] Unavailable values display `Unavailable`.
- [ ] Locked states explain why they are locked.
- [ ] Blocked states explain the blocker.

Source files:

```text
rules/loading-state-rules.md
patterns/empty-loading-error-states.md
templates/empty-error-loading-state-template.json
content/empty-error-loading-copy.md
```

Critical failure:

```text
Loading, empty, error, partial, stale, unavailable, locked, or blocked state shows fake financial values or hides critical safety context.
```

---

## 11.2 Portfolio and suggestion loading

- [ ] Portfolio loading uses skeletons.
- [ ] Portfolio loading does not show fake balances.
- [ ] Suggestion loading does not show fake suggestions.
- [ ] Top Pick loading does not show fake Top Pick.
- [ ] Protocol loading does not show fake URL.
- [ ] Smith AI animation is used only for approved Smith AI/suggestion-building waits.

---

# 12. Copy and Content

## 12.1 Approved copy

- [ ] User-facing copy comes from `content/` where available.
- [ ] Suggestion copy matches structured suggestion copy.
- [ ] Wallet safety copy matches approved wallet copy.
- [ ] Demo Mode copy clearly says sample data.
- [ ] Error/empty/loading copy matches approved states.
- [ ] Smith AI copy follows approved examples and constraints.

Source files:

```text
content/ui-copy-rules.md
content/wallet-copy.md
content/demo-mode-copy.md
content/suggestion-card-copy.md
content/smith-ai-copy.md
content/empty-error-loading-copy.md
content/glossary.md
```

---

## 12.2 Forbidden copy

- [ ] No “guaranteed” language.
- [ ] No “risk-free” language.
- [ ] No “best investment” language.
- [ ] No shame/pressure language.
- [ ] No “Swap now” for MVP protocol handoff.
- [ ] No “Complete transaction” for MVP handoff.
- [ ] No “funds moved” unless a real transaction system later confirms it.
- [ ] No “WealthSmith controls your wallet.”
- [ ] No “send your seed phrase.”
- [ ] No “send your private key.”

Critical failure:

```text
Copy creates custody confusion, implies execution, or asks for wallet secrets.
```

---

# 13. Accessibility

## 13.1 Required accessibility checks

- [ ] Page title is correct.
- [ ] Main navigation is labeled.
- [ ] Wallet pill has accessible label.
- [ ] Buttons have accessible labels.
- [ ] External protocol links say they open in a new tab.
- [ ] Icons are not the only source of meaning.
- [ ] Progress values have accessible labels.
- [ ] Charts have readable labels/summaries.
- [ ] Error states are readable without visual-only cues.
- [ ] Locked/disabled reasons are available in text.
- [ ] Modals manage focus correctly.
- [ ] Color is not the only source of meaning.

High failure:

```text
Critical state or action is understandable only through color, icon, or visual position.
```

---

# 14. Analytics and Events

## 14.1 Safe event payloads

- [ ] Events do not include seed phrase.
- [ ] Events do not include private key.
- [ ] Events do not include wallet password.
- [ ] Events do not include wallet backup file.
- [ ] Events do not include raw sensitive error payloads.
- [ ] Protocol handoff event says `executes_transaction = false`.
- [ ] Protocol handoff event says `requires_wallet_signature = false`.
- [ ] Protocol handoff event says `marks_suggestion_complete = false`.
- [ ] Wallet disconnect event says `funds_affected = false`.

Critical failure:

```text
Analytics captures wallet secrets, sensitive payloads, or misleading execution flags.
```

---

# 15. MVP Supported Scope

## 15.1 Wallet support

- [ ] Phantom supported.
- [ ] Solflare supported.
- [ ] Backpack supported.
- [ ] Unsupported wallets are not presented as supported.

---

## 15.2 Protocol support

- [ ] Hubble supported where product logic says eligible.
- [ ] Jito supported where product logic says eligible.
- [ ] Jupiter supported where product logic says eligible.
- [ ] Kamino supported where product logic says eligible.
- [ ] Marinade supported where product logic says eligible.
- [ ] Meteora supported where product logic says eligible.
- [ ] Ondo supported where product logic says eligible.
- [ ] Orca supported where product logic says eligible.
- [ ] Raydium supported where product logic says eligible.
- [ ] Sanctum supported where product logic says eligible.
- [ ] BlazeStake is not shown as MVP-supported.

Critical failure:

```text
Unsupported wallet or protocol appears as supported MVP option.
```

---

# 16. Page-Level MVP Checks

## 16.1 Dashboard

- [ ] Dashboard uses approved layout pattern.
- [ ] Global Nav variant matches mode.
- [ ] Demo banner appears only in Demo Mode.
- [ ] Financial Snapshot values come from product/demo data.
- [ ] Safety Buffer values come from Safety Buffer logic.
- [ ] Projected Growth values come from projection logic.
- [ ] Allocation values come from allocation logic.
- [ ] Right rail follows priority order.
- [ ] Suggestions come from Suggestion Engine.
- [ ] Top Pick comes from Top Pick Logic.
- [ ] Smith AI opens with bounded context.

---

## 16.2 Portfolio

- [ ] Portfolio overview uses approved pattern.
- [ ] Liquid Assets, Staked Assets, and Yield Strategies are separated.
- [ ] Plain liquid balances do not show Manage links.
- [ ] Staked/yield protocol positions may show Manage links.
- [ ] Manage links are external review-only.
- [ ] APY and earnings are unavailable when not provided.
- [ ] Portfolio errors do not imply funds are affected.

---

## 16.3 Goal

- [ ] Goal page uses approved goal-settings pattern.
- [ ] Saved values come from goal settings.
- [ ] Missing fields show correct missing/empty state.
- [ ] Editing goal does not move funds.
- [ ] Goal changes trigger recalculation through product logic, not UI guessing.

---

## 16.4 Support

- [ ] Support content comes from approved FAQ/content files.
- [ ] Contact Us does not ask for seed phrase or private key.
- [ ] Smith AI support answers preserve wallet safety boundaries.
- [ ] Support flow does not promise fund recovery or transaction reversal.

---

# 17. Merge Blocking Failures

Any of these should block merge/release:

```text
- Seed phrase/private key/password/backup request appears anywhere.
- UI implies WealthSmith holds or controls funds.
- Wallet connection implies transaction approval.
- MVP suggestion CTA executes a transaction.
- MVP protocol handoff requests wallet signature.
- External protocol handoff marks suggestion complete on click.
- UI chooses Top Pick.
- Smith AI chooses or changes Top Pick.
- UI or Smith AI chooses protocol destination.
- UI invents APY, earnings, balances, suggestions, Top Pick, or protocol URL.
- Demo data is shown as real wallet data.
- Unsupported wallet/protocol shown as MVP-supported.
- Loading/error/empty state shows fake financial values.
- Analytics captures wallet secrets or sensitive payloads.
```

---

# 18. Final Review Summary

Use this section at the end of a review.

```yaml
review_result: {pass|fail|blocked}
reviewer: {name}
date: {date}
environment: {local|staging|production|storybook|claude-code}
build_or_commit: {build_id_or_commit_hash}
```

Passed sections:

```text
- {section}
```

Failed sections:

```text
- {section}
```

Blocking issues:

```text
- {issue}
```

Required fixes:

```text
- {fix}
```

---

## Claude Code Instructions

When Claude Code uses this checklist:

```text
Read this checklist and the source files it references.
Inspect the implementation or generated files.
Mark each item pass/fail/not applicable.
For failed items, cite the exact rule/content/component/pattern/example/template conflict.
Suggest the smallest safe fix.
Do not invent missing values.
Do not mark an item as passed without evidence.
```

Claude Code must especially verify:

```text
wallet safety
non-custodial copy
Suggestion Engine boundary
Top Pick Logic boundary
Protocol Logic boundary
Smith AI boundary
Demo Mode boundary
loading/error/empty no-fake-data rule
```

---

## Done Criteria

MVP implementation is ready when:

```text
- All Critical items pass.
- All High items pass or are explicitly accepted by product/design/engineering.
- No wallet-secret request exists.
- No custody confusion exists.
- No hidden execution exists.
- No invented financial logic exists.
- No ungrounded Smith AI behavior exists.
- No unsupported MVP wallet/protocol appears as supported.
```
