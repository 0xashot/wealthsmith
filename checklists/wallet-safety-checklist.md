# Wallet Safety Checklist

Use this checklist whenever implementing or reviewing WealthSmith wallet connection, wallet UI, wallet copy, portfolio loading after connection, protocol handoffs, Demo Mode wallet separation, Smith AI wallet explanations, analytics, or support flows.

This checklist is focused on one thing:

```text
Prevent custody confusion and unsafe wallet behavior.
```

WealthSmith is non-custodial.

Wallet connection is for read-only portfolio viewing in MVP.

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
rules/wallet-and-custody-rules.md
rules/financial-logic-boundaries.md
rules/demo-mode-rules.md
rules/protocol-selection-rules.md
rules/smith-ai-rules.md
rules/loading-state-rules.md
content/wallet-copy.md
content/demo-mode-copy.md
content/smith-ai-copy.md
content/empty-error-loading-copy.md
patterns/wallet-connection.md
patterns/portfolio-overview.md
patterns/suggestion-flow.md
components/global-nav.md
components/modal.md
components/menu-popover.md
components/menu-item.md
components/toast.md
templates/wallet-state-template.json
templates/page-state-template.json
templates/demo-mode-state-template.json
templates/empty-error-loading-state-template.json
examples/wallet/wallet-connected-phantom-state.json
examples/dashboard/dashboard-connected-wallet-state.json
examples/dashboard/dashboard-demo-state.json
```

---

# 1. Core Wallet Safety

## 1.1 Non-custodial boundary

- [ ] UI clearly treats WealthSmith as non-custodial.
- [ ] Copy does not imply WealthSmith holds user funds.
- [ ] Copy does not imply WealthSmith controls user wallets.
- [ ] Copy does not imply WealthSmith secures user funds.
- [ ] Copy does not imply WealthSmith can recover funds.
- [ ] Copy does not imply WealthSmith can reverse transactions.
- [ ] Copy does not imply WealthSmith can move assets.
- [ ] Copy does not imply WealthSmith can trade, swap, stake, unstake, deposit, withdraw, or rebalance in MVP.
- [ ] Wallet-related error states reassure users when relevant: `Your funds stay in your wallet.`

Critical failure:

```text
Any UI, copy, Smith AI response, support response, or event implies WealthSmith holds, controls, secures, moves, or can recover user funds.
```

---

## 1.2 Required safe language

Use this language when relevant:

```text
Your funds stay in your wallet.
No action will be taken automatically.
WealthSmith reads supported wallet data.
Connecting a wallet does not give WealthSmith permission to move funds.
```

Checklist:

- [ ] Wallet connection copy explains read-only viewing.
- [ ] Portfolio error copy reassures that funds stay in the wallet.
- [ ] Protocol handoff copy says review/manage, not execute.
- [ ] Smith AI wallet answers include non-custodial boundaries.
- [ ] Support content never asks for wallet secrets.

---

# 2. Wallet Secrets

## 2.1 Never ask for secrets

- [ ] UI never asks for seed phrase.
- [ ] UI never asks for private key.
- [ ] UI never asks for wallet password.
- [ ] UI never asks for wallet backup file.
- [ ] UI never asks user to upload a wallet backup file.
- [ ] Smith AI never asks for seed phrase.
- [ ] Smith AI never asks for private key.
- [ ] Smith AI never asks for wallet password.
- [ ] Smith AI never asks for wallet backup file.
- [ ] Support flow never asks for seed phrase/private key/password/backup file.
- [ ] Error messages never suggest pasting wallet secrets.
- [ ] Analytics never captures wallet secrets.

Critical failure:

```text
Any request for seed phrase, private key, wallet password, or wallet backup file appears anywhere.
```

---

## 2.2 Forbidden fields

No state, fixture, event, or context packet should include:

```text
seed_phrase
private_key
wallet_password
wallet_backup_file
mnemonic
secret_key
recovery_phrase
```

Checklist:

- [ ] Wallet state does not include forbidden fields.
- [ ] Page state does not include forbidden fields.
- [ ] Smith AI context does not include forbidden fields.
- [ ] Analytics payloads do not include forbidden fields.
- [ ] QA fixtures do not include forbidden fields.
- [ ] Examples do not include forbidden fields.
- [ ] Logs do not include forbidden fields.

Critical failure:

```text
Forbidden wallet-secret field appears in app state, fixtures, events, logs, prompts, or Smith AI context.
```

---

# 3. Supported Wallets

## 3.1 MVP wallet support

Supported MVP wallets:

```text
Phantom
Solflare
Backpack
```

Checklist:

- [ ] Connect Wallet modal shows Phantom.
- [ ] Connect Wallet modal shows Solflare.
- [ ] Connect Wallet modal shows Backpack.
- [ ] Wallet icons use approved assets.
- [ ] Unsupported wallets are not shown as supported.
- [ ] Unknown wallets are handled safely.
- [ ] Unsupported wallet state provides safe copy.
- [ ] Unsupported wallet copy does not ask for secrets.

Source files:

```text
assets/icons/icon-registry.json
templates/wallet-state-template.json
patterns/wallet-connection.md
```

High failure:

```text
Unsupported wallet is shown as supported MVP wallet.
```

---

## 3.2 Wallet install and rejection states

- [ ] Wallet not installed state is clear.
- [ ] User rejected connection state is not presented as a security issue.
- [ ] Connection failed state does not imply funds are affected.
- [ ] Retry action is safe.
- [ ] Choose another wallet action is safe.
- [ ] Error state does not ask for secrets.
- [ ] Error state does not suggest exporting keys.

---

# 4. Read-Only Connection

## 4.1 Connection meaning

- [ ] Wallet connection is read-only for portfolio viewing.
- [ ] Wallet connection only reads public address and supported wallet/protocol data.
- [ ] Wallet connection does not authorize transactions.
- [ ] Wallet connection does not move funds.
- [ ] Wallet connection does not trade.
- [ ] Wallet connection does not swap.
- [ ] Wallet connection does not stake.
- [ ] Wallet connection does not unstake.
- [ ] Wallet connection does not deposit.
- [ ] Wallet connection does not withdraw.
- [ ] Wallet connection does not rebalance.
- [ ] Wallet connection does not grant WealthSmith custody.

Critical failure:

```text
Wallet connection is presented as permission to execute financial actions.
```

---

## 4.2 Wallet permission flags

For MVP read-only wallet state, these must be false:

```text
can_move_funds
can_trade
can_swap
can_stake
can_unstake
can_deposit
can_withdraw
can_rebalance
can_export_keys
```

Checklist:

- [ ] Wallet state sets fund movement permissions to false.
- [ ] UI does not expose fund movement actions.
- [ ] Smith AI does not describe fund movement permissions.
- [ ] Analytics does not log wallet connection as transaction authorization.

Critical failure:

```text
Read-only wallet state contains fund movement permission set to true.
```

---

# 5. Wallet Connection Flow

## 5.1 Connect Wallet modal

- [ ] Modal title is clear: `Connect Wallet`.
- [ ] Modal explains read-only behavior.
- [ ] Modal shows only supported MVP wallets.
- [ ] Modal uses approved wallet icons.
- [ ] Modal does not ask for seed phrase.
- [ ] Modal does not ask for private key.
- [ ] Modal does not ask user to paste address as secret.
- [ ] Modal does not say WealthSmith will secure funds.
- [ ] Modal does not imply connecting wallet executes transaction.
- [ ] Modal has accessible labels.

Source files:

```text
patterns/wallet-connection.md
templates/wallet-state-template.json
content/wallet-copy.md
components/modal.md
```

---

## 5.2 Connection states

- [ ] `disconnected` state shows Connect Wallet CTA.
- [ ] `connecting` state uses safe loading copy.
- [ ] `awaiting_user_approval` state clearly points to wallet provider approval.
- [ ] `connected` state shows wallet pill.
- [ ] `rejected` state says connection was canceled.
- [ ] `failed` state offers safe retry.
- [ ] `unsupported` state offers supported wallet options.
- [ ] No connection state asks for secrets.
- [ ] No connection state implies funds moved.

---

## 5.3 Connection success

After successful connection:

- [ ] Wallet status is connected.
- [ ] Wallet pill appears.
- [ ] Connect Wallet CTA hides.
- [ ] Try Demo Mode CTA hides.
- [ ] Portfolio data loads separately.
- [ ] Suggestion generation waits for required product data.
- [ ] Connected toast does not imply portfolio is ready.
- [ ] Connected toast does not imply transaction approval.
- [ ] Connected toast does not imply funds moved.

Correct:

```text
Wallet connected
```

Incorrect:

```text
Transaction approved
Funds connected
Funds secured by WealthSmith
Portfolio fully analyzed
```

Critical failure:

```text
Connection success is described as transaction approval or fund movement.
```

---

# 6. Wallet Pill and Menu

## 6.1 Wallet pill

- [ ] Wallet pill appears only when real wallet is connected.
- [ ] Wallet pill is hidden in Demo Mode.
- [ ] Wallet pill displays provider plus short address.
- [ ] Wallet pill does not show full address by default in Global Nav.
- [ ] Wallet pill uses approved wallet provider icon.
- [ ] Wallet pill has accessible label.
- [ ] Wallet pill opens wallet menu.
- [ ] Wallet pill remains visible if portfolio data fails but wallet remains connected.

Critical failure:

```text
Wallet pill appears in Demo Mode.
```

---

## 6.2 Wallet menu

Allowed menu items:

```text
Copy Address
Disconnect Wallet
```

Checklist:

- [ ] Wallet menu opens from wallet pill.
- [ ] Wallet menu shows connected provider.
- [ ] Wallet menu shows short address or copy address option.
- [ ] Copy Address action is safe.
- [ ] Disconnect Wallet action is present.
- [ ] Wallet menu includes non-custodial helper text when appropriate.
- [ ] Wallet menu is keyboard accessible.

Forbidden menu items:

```text
Transfer Funds
Export Private Key
Export Seed Phrase
Recover Wallet
Stake All
Swap Now
Withdraw
Rebalance
```

Critical failure:

```text
Wallet menu exposes wallet-secret export or unsupported fund movement actions.
```

---

# 7. Disconnect Flow

## 7.1 Disconnect behavior

- [ ] Disconnect removes app wallet connection.
- [ ] Disconnect hides wallet pill.
- [ ] Disconnect clears wallet-dependent portfolio data.
- [ ] Disconnect clears wallet-dependent suggestions.
- [ ] Disconnect clears wallet-dependent Top Pick.
- [ ] Disconnect clears wallet-dependent protocol decisions.
- [ ] Disconnect clears real wallet Smith AI context.
- [ ] Disconnect does not affect funds.
- [ ] Disconnect does not imply wallet assets are deleted.
- [ ] Disconnect does not imply account deletion unless separate account auth exists.

Correct:

```text
Wallet disconnected
Your funds stay in your wallet.
```

Incorrect:

```text
Funds disconnected
Assets removed
Wallet deleted
```

Critical failure:

```text
Disconnect flow implies funds or wallet assets are deleted, moved, or changed.
```

---

# 8. Portfolio Loading After Wallet Connection

## 8.1 State separation

- [ ] Wallet connected state is separate from portfolio data readiness.
- [ ] Wallet pill can be visible while portfolio data loads.
- [ ] Portfolio loading state does not show fake balances.
- [ ] Portfolio partial state shows loaded data and labels missing data.
- [ ] Portfolio error state does not disconnect wallet unless wallet connection actually failed.
- [ ] Portfolio error state does not imply funds are affected.
- [ ] Portfolio empty state appears only after successful load.
- [ ] Empty state does not overclaim wallet is empty when unsupported assets may exist.

Source files:

```text
patterns/portfolio-overview.md
patterns/empty-loading-error-states.md
templates/empty-error-loading-state-template.json
```

Critical failure:

```text
Portfolio loading shows fake balances or portfolio error implies funds are affected.
```

---

## 8.2 Supported data language

- [ ] Copy says supported assets/positions when scope is limited.
- [ ] Empty state avoids saying user has no funds.
- [ ] Empty state avoids saying wallet is empty unless fully verified.
- [ ] Unsupported assets/protocols are handled safely.
- [ ] Missing APY or earnings shows `Unavailable`.

Correct:

```text
WealthSmith did not find supported assets in this wallet.
```

Incorrect:

```text
Your wallet is empty.
```

---

# 9. Demo Mode Wallet Separation

## 9.1 Demo Mode wallet rules

- [ ] Demo Mode does not connect a real wallet.
- [ ] Demo Mode sets wallet status to demo/disconnected.
- [ ] Demo Mode hides wallet pill.
- [ ] Demo Mode shows Demo banner.
- [ ] Demo data is labeled sample data.
- [ ] Demo Mode does not request signatures.
- [ ] Demo Mode does not show real wallet address.
- [ ] Demo Mode does not imply real wallet personalization.

Critical failure:

```text
Demo Mode shows wallet pill or presents sample data as real wallet data.
```

---

## 9.2 Connect Wallet from Demo Mode

- [ ] Connect Wallet opens wallet connection flow.
- [ ] Successful wallet connection exits Demo Mode.
- [ ] Successful wallet connection clears demo portfolio.
- [ ] Successful wallet connection clears demo suggestions.
- [ ] Successful wallet connection clears demo Top Pick.
- [ ] Successful wallet connection regenerates real wallet state.
- [ ] Demo Top Pick does not persist into connected-wallet mode.

Critical failure:

```text
Demo Top Pick or demo suggestions carry into real wallet mode.
```

---

# 10. Ledger and Message Signing

## 10.1 Ledger-safe handling

- [ ] Ledger/message-signing errors are handled as connection limitations, not user failure.
- [ ] Copy does not blame the user.
- [ ] Copy does not ask for seed phrase/private key as workaround.
- [ ] Copy does not ask user to export wallet.
- [ ] If read-only signatureless connection is supported, UI offers safe path.
- [ ] If message signing is required, error explains limitation calmly.
- [ ] Transaction signing is not required for MVP protocol handoff clicks.
- [ ] Basic portfolio viewing should avoid message signing when product supports it.

Source files:

```text
templates/wallet-state-template.json
patterns/wallet-connection.md
content/wallet-copy.md
```

Critical failure:

```text
Ledger issue leads to request for seed phrase, private key, export key, or unsafe workaround.
```

---

# 11. Protocol Handoff Wallet Safety

## 11.1 MVP handoff boundaries

- [ ] Protocol handoff opens external protocol in new tab.
- [ ] Protocol handoff uses approved protocol decision.
- [ ] Protocol handoff does not execute transaction.
- [ ] Protocol handoff does not request wallet signature in MVP.
- [ ] Protocol handoff does not move funds.
- [ ] Protocol handoff does not mark suggestion complete on click.
- [ ] Protocol handoff copy says review/manage, not execute.
- [ ] Missing protocol URL shows blocked/unavailable state.
- [ ] Stale protocol decision cannot be used for active handoff.

Correct CTA examples:

```text
Review on Jupiter
Manage on Kamino
```

Forbidden CTA examples:

```text
Swap Now
Deposit Now
Execute Trade
Complete Transaction
```

Critical failure:

```text
MVP protocol CTA executes, requests signature, moves funds, or marks completion.
```

---

# 12. Smith AI Wallet Safety

## 12.1 Allowed wallet explanations

Smith AI may explain:

```text
what connecting a wallet means
read-only portfolio viewing
why wallet pill appears
why wallet pill is hidden in Demo Mode
why portfolio data may still be loading
what disconnecting does
supported MVP wallets
why seed phrase/private key should never be shared
Ledger/message-signing limitation when present in state
```

Checklist:

- [ ] Smith AI explains wallet connection as read-only.
- [ ] Smith AI says funds stay in wallet when relevant.
- [ ] Smith AI says WealthSmith does not get permission to move funds.
- [ ] Smith AI does not claim wallet connection means transaction approval.
- [ ] Smith AI does not offer unsupported wallet actions.
- [ ] Smith AI does not ask for secrets.

---

## 12.2 Forbidden Smith AI wallet behavior

- [ ] Smith AI does not ask for seed phrase.
- [ ] Smith AI does not ask for private key.
- [ ] Smith AI does not ask for wallet password.
- [ ] Smith AI does not ask for wallet backup file.
- [ ] Smith AI does not say WealthSmith controls wallet.
- [ ] Smith AI does not say WealthSmith can move funds.
- [ ] Smith AI does not say wallet connection authorizes transactions.
- [ ] Smith AI does not say transaction submitted unless transaction system exists and confirms it.
- [ ] Smith AI does not invent wallet balances.
- [ ] Smith AI does not invent wallet permissions.

Critical failure:

```text
Smith AI creates custody confusion, asks for secrets, or claims execution.
```

---

# 13. Support and Contact Safety

## 13.1 Support flow

- [ ] Support page does not ask for seed phrase.
- [ ] Contact Us form does not ask for private key.
- [ ] Support copy does not promise fund recovery.
- [ ] Support copy does not promise transaction reversal.
- [ ] Support copy does not ask user to export wallet.
- [ ] Support copy routes wallet security concerns to safe instructions.
- [ ] Smith AI support answers preserve non-custodial boundaries.

Critical failure:

```text
Support flow asks for secrets or promises fund recovery/reversal.
```

---

# 14. Error States

## 14.1 Wallet errors

- [ ] User rejected connection is shown as canceled, not dangerous.
- [ ] Wallet not installed state is clear.
- [ ] Unsupported wallet state lists supported wallets.
- [ ] Connection failed state has safe retry.
- [ ] Unsupported network state is clear.
- [ ] Ledger/message-signing limitation is calm and safe.
- [ ] No wallet error asks for secrets.
- [ ] No wallet error implies funds moved.
- [ ] No wallet error implies funds are at risk because of WealthSmith.

---

## 14.2 Portfolio errors after connection

- [ ] Portfolio load error does not hide wallet pill if wallet remains connected.
- [ ] Portfolio load error says funds stay in wallet.
- [ ] Portfolio load error offers Retry/Refresh.
- [ ] Portfolio load error does not ask user to reconnect unless wallet connection failed.
- [ ] Portfolio load error does not show fake balances.
- [ ] Portfolio load error does not imply assets are missing or lost.

---

# 15. Analytics and Logs

## 15.1 Safe analytics

- [ ] Wallet connect started event does not include secrets.
- [ ] Wallet connected event does not include secrets.
- [ ] Wallet connection failed event does not include secrets.
- [ ] Wallet disconnected event says funds affected = false.
- [ ] Protocol handoff event says executes transaction = false.
- [ ] Protocol handoff event says requires wallet signature = false.
- [ ] Protocol handoff event says marks suggestion complete = false.
- [ ] Error logs do not include wallet secrets.
- [ ] Smith AI context logs do not include wallet secrets.
- [ ] Full wallet address is handled according to privacy/logging rules.

Critical failure:

```text
Analytics or logs capture seed phrase, private key, wallet password, backup file, or misleading execution flags.
```

---

# 16. Accessibility

## 16.1 Wallet accessibility

- [ ] Connect Wallet button has accessible label.
- [ ] Connect Wallet modal has accessible title.
- [ ] Wallet provider options have text labels.
- [ ] Wallet pill has accessible label.
- [ ] Wallet menu has accessible label.
- [ ] Copy Address has accessible label.
- [ ] Disconnect Wallet has accessible label.
- [ ] Error messages are readable in text.
- [ ] Loading connection state is announced when long-running.
- [ ] Wallet provider icons are not the only source of meaning.
- [ ] Focus moves into modal and returns on close.

High failure:

```text
Wallet state/action is conveyed only through icon, color, or visual position.
```

---

# 17. Blocking Failures

Any of these block release or merge:

```text
- Seed phrase/private key/password/backup request appears anywhere.
- Wallet state contains seed phrase/private key/password/backup field.
- UI implies WealthSmith holds funds.
- UI implies WealthSmith controls wallet.
- UI implies WealthSmith can recover funds.
- UI implies Wallet connection authorizes transactions.
- UI exposes Transfer, Export Key, Recover Wallet, Swap Now, Stake All, Withdraw, or Rebalance from wallet menu.
- Read-only wallet state sets fund movement permissions to true.
- Demo Mode shows wallet pill.
- Demo Mode presents sample data as real wallet data.
- Portfolio loading shows fake balances.
- Portfolio error implies funds are affected.
- MVP protocol handoff executes transaction.
- MVP protocol handoff requests wallet signature.
- MVP protocol handoff marks suggestion complete on click.
- Smith AI asks for secrets.
- Smith AI claims WealthSmith can move funds.
- Support flow asks for secrets or promises fund recovery.
- Analytics captures wallet secrets.
```

---

# 18. Review Summary

```yaml
review_result: {pass|fail|blocked}
reviewer: {name}
date: {date}
environment: {local|staging|production|storybook|claude-code}
build_or_commit: {build_id_or_commit_hash}
wallet_area_reviewed: {connect_modal|wallet_pill|wallet_menu|portfolio_loading|demo_mode|protocol_handoff|smith_ai|support|analytics}
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
Inspect the implementation, state, copy, events, and Smith AI prompts/responses.
Mark each item pass/fail/not applicable.
For failed items, cite the exact conflicting rule or file.
Suggest the smallest safe fix.
Do not invent missing expected values.
Do not mark unchecked wallet safety items as passed.
```

Claude Code must prioritize:

```text
no wallet secrets
no custody confusion
read-only connection boundary
Demo Mode wallet separation
protocol handoff no-execution boundary
Smith AI wallet safety
safe error and analytics behavior
```

---

## Done Criteria

Wallet safety passes when:

```text
- No Critical item fails.
- No wallet secret is requested or stored.
- Wallet connection is clearly read-only.
- WealthSmith is clearly non-custodial.
- Demo Mode has no wallet pill.
- Protocol handoffs are review-only.
- Smith AI stays within wallet safety boundaries.
- Error states reassure users without implying custody or fund risk.
- Analytics and logs do not capture secrets.
