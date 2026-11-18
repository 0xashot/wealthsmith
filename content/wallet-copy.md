# Wallet Copy

This file defines approved WealthSmith copy for wallet-related user experiences.

It covers:

```text
Connect Wallet
Supported wallets
Wallet connected state
Wallet disconnected state
Wallet menu
Read-only wallet connection
Non-custodial explanations
Seed phrase/private key safety
Message signing
Transaction signing
Hardware wallet / Ledger-safe copy
Wallet errors
Demo Mode vs wallet mode
```

Wallet copy is a trust-critical part of WealthSmith.

It must be clear, precise, and safe.

---

## Purpose

Wallet copy should help users understand:

```text
Why WealthSmith asks them to connect a wallet
What WealthSmith reads
What WealthSmith does not do
Whether funds move
Whether a signature is a transaction
What happens after connection
What happens after disconnection
How Demo Mode differs from wallet mode
What information they must never share
```

Wallet copy must reinforce:

```text
Non-custodial
Read-only for MVP portfolio viewing
No automatic execution
No seed phrase/private key requests
User remains in control
```

---

## Core Hard Rules

Hard Rule:

```text
WealthSmith must never ask for seed phrases, private keys, passwords, or wallet backup files.
```

Hard Rule:

```text
Wallet copy must not imply WealthSmith holds, controls, protects, secures, moves, trades, stakes, deposits, withdraws, or rebalances user funds.
```

Hard Rule:

```text
Wallet connection copy must clearly distinguish read-only connection from transaction execution.
```

Hard Rule:

```text
In MVP, suggestion card clicks and protocol handoffs must not imply wallet signatures or in-app transactions.
```

---

## Core Wallet Message

Approved baseline copy:

```text
Connect your wallet so WealthSmith can read balances and positions.
Your funds stay in your wallet.
```

Short version:

```text
WealthSmith reads balances and positions only. Your funds stay in your wallet.
```

Security warning:

```text
Never share your seed phrase or private key.
```

Expanded security warning:

```text
Never share your seed phrase, private key, password, or wallet backup file. WealthSmith will not ask for them.
```

---

## Supported Wallets

Approved MVP wallet labels:

```text
Phantom
Solflare
Backpack
```

Rules:

- Use these names consistently.
- Do not invent supported wallets.
- Do not show unsupported wallet names as active options.
- If a wallet is unsupported, use unsupported wallet copy.
- Keep wallet support aligned with wallet metadata and product logic.

---

## Connect Wallet CTA

Approved primary CTA:

```text
Connect Wallet
```

Approved alternate CTA when pre-wallet state also supports Demo Mode:

```text
Connect Wallet
```

```text
Try Demo Mode
```

Rules:

- Use `Connect Wallet`, not `Authorize Wallet`.
- Do not use `Give Access`.
- Do not use `Start Investing`.
- Do not use `Secure Wallet`.
- Do not imply funds move.
- Do not imply WealthSmith receives control of the wallet.

Avoid:

```text
Authorize Funds
Manage Assets
Give WealthSmith Access
Secure Your Assets
Start Earning
```

---

## Connect Wallet Modal

> Implementation note: the connect modal renders only the **title**, the **wallet
> options**, and the **close** control. The intro, safety helper, and security
> note below are NOT shown in the modal (removed per product decision); they
> remain approved wallet copy for other surfaces. The modal still never asks for a
> seed phrase, private key, password, recovery phrase, or backup file.

Modal title:

```text
Connect Wallet
```

Intro copy:

```text
Choose a wallet to continue.
```

Safety helper:

```text
WealthSmith reads balances and positions only.
Your funds stay in your wallet.
```

Security note:

```text
Never share your seed phrase or private key.
```

Wallet option labels:

```text
Phantom
Solflare
Backpack
```

Rules:

- Keep the safety helper visible.
- Do not hide seed phrase/private key warning in a tooltip.
- Do not imply wallet connection signs a transaction.
- Do not imply wallet connection moves assets.
- Do not ask for wallet secrets.

---

## Wallet Connection Loading

Button/modal pending:

```text
Connecting...
```

Wallet approval helper:

```text
Approve the connection in your wallet.
```

After connection while data loads:

```text
Loading wallet positions...
```

Rules:

- Do not use Smith AI animation for wallet connection.
- Do not show wallet pill until connection is confirmed.
- Do not show fake wallet data while connecting.
- Do not imply funds are moving.
- Do not say “securing assets.”

Avoid:

```text
Moving assets...
Securing your funds...
Authorizing trades...
Executing...
```

---

## Wallet Connected Copy

Toast:

```text
Wallet connected
```

Optional helper:

```text
WealthSmith is loading supported balances and positions.
```

Wallet pill format:

```text
{wallet_provider} • {short_address}
```

Example:

```text
Phantom • 6fQ9
```

Accessible label example:

```text
Connected wallet: Phantom, address ending 6fQ9. Open wallet menu.
```

Rules:

- Show provider and shortened address.
- Do not show full address by default in Global Nav.
- Do not imply connection completed portfolio loading.
- Keep portfolio loading separate if positions are still loading.
- Do not say funds are “secured.”

---

## Wallet Menu Copy

Approved menu item:

```text
Disconnect Wallet
```

Optional wallet menu helper:

```text
Your funds stay in your wallet.
```

Rules:

- Keep wallet menu simple for MVP.
- Do not add unsupported actions.
- Do not use `Log Out` unless product account state supports it.
- Do not imply disconnecting affects funds.

Avoid:

```text
Transfer Funds
Manage Assets
Recover Wallet
Export Key
```

---

## Wallet Disconnected Copy

Toast:

```text
Wallet disconnected
```

Optional helper:

```text
Your funds stay in your wallet.
```

Empty state title:

```text
No wallet connected
```

Empty state description:

```text
Connect your wallet or try Demo Mode to explore WealthSmith.
```

Rules:

- Disconnecting a wallet does not move funds.
- Disconnecting should clear or hide wallet-dependent real data safely.
- Disconnecting should not clear Demo Mode unless product state says so.
- Do not imply a wallet transaction happened.

---

## Read-Only Copy

Approved explanation:

```text
Read-only means WealthSmith can use public wallet and supported protocol data to show your portfolio and suggestions. It does not give WealthSmith permission to move funds.
```

Short version:

```text
WealthSmith reads supported wallet data. It cannot move funds from a read-only connection.
```

Rules:

- Use read-only copy when explaining wallet connection.
- Use “supported” when referring to balances/positions.
- Do not imply WealthSmith sees every possible asset/protocol unless support coverage confirms it.
- Do not imply read-only is a blockchain permission if the technical mechanism differs; explain user-facing behavior.

---

## Non-Custodial Copy

Approved explanation:

```text
WealthSmith is non-custodial. Your funds stay in your wallet, and WealthSmith does not hold your crypto or private keys.
```

Short version:

```text
Your funds stay in your wallet.
```

Rules:

- Use “non-custodial” with plain explanation.
- Do not say WealthSmith protects or secures funds.
- Do not say funds are safe with WealthSmith.
- Do not imply WealthSmith can recover a wallet.

Avoid:

```text
Your funds are safe with us.
WealthSmith protects your assets.
WealthSmith secures your crypto.
```

---

## Seed Phrase and Private Key Safety

Approved direct warning:

```text
Never share your seed phrase or private key.
```

Expanded:

```text
Never share your seed phrase, private key, password, recovery phrase, or wallet backup file. WealthSmith will not ask for them.
```

Contact Us warning:

```text
Do not include seed phrases, private keys, passwords, or wallet backup files.
```

Smith AI/support response:

```text
No. Never share your private key or seed phrase. WealthSmith will not ask for them.
```

Rules:

- Be direct.
- Do not soften this warning too much.
- Do not ask users to paste wallet secrets for troubleshooting.
- Do not create any UI field that collects wallet secrets.
- Do not instruct users to export private keys.

---

## Message Signing Copy

Use only if the product flow requires message signing.

Approved title:

```text
Confirm Wallet Ownership
```

Approved explanation:

```text
Sign this message to confirm wallet ownership.
This is not a transaction and will not move funds.
```

Short helper:

```text
This message signature does not move funds.
```

Failure title:

```text
Signature not completed
```

Failure description:

```text
The message signature was not completed. No funds moved.
```

Rules:

- Explain why signing is requested.
- Clearly say message signing is not a transaction.
- Clearly say no funds move.
- Do not call message signing “safe” in an absolute way.
- Do not request a signature from Smith AI chat.
- Do not confuse message signing with transaction signing.

---

## Transaction Signing Copy

In MVP, suggestion cards and protocol handoffs do not request transaction signatures inside WealthSmith.

Approved explanation if user asks:

```text
A transaction signature can approve an on-chain action. WealthSmith MVP suggestion cards do not execute transactions or request transaction signatures.
```

Rules:

- Do not show transaction signing UI unless the product actually supports an execution flow.
- Do not imply a protocol handoff is a WealthSmith transaction.
- Do not imply clicking a suggestion signs or submits a transaction.
- Do not say a transaction is complete unless confirmed by product logic.

---

## Hardware Wallet / Ledger Copy

Approved general explanation:

```text
Some hardware wallets handle message signing differently.
```

Expanded:

```text
Some hardware wallets handle message signing differently. If message signing fails, no funds moved.
```

Ledger-safe support helper:

```text
If the issue continues, contact support with your wallet provider, device type, and the error message. Do not include seed phrases, private keys, passwords, or wallet backup files.
```

Rules:

- Do not tell users to expose secrets.
- Do not ask users to disable security protections casually.
- Do not imply Ledger/hardware wallet funds are affected by a connection failure.
- Do not overpromise compatibility unless product metadata confirms it.
- If basic portfolio viewing can avoid message signing, wallet copy should not block users unnecessarily.

---

## Wallet Error Copy

### Wallet Connection Failed

Title:

```text
Wallet connection failed
```

Description:

```text
We couldn’t connect to your wallet. Try again or choose another supported wallet.
```

Primary action:

```text
Try Again
```

Rules:

- Do not blame the user.
- Do not imply funds are affected.
- Do not ask for seed phrase/private key.

---

### Wallet Rejected Connection

Title:

```text
Connection not approved
```

Description:

```text
You did not approve the connection in your wallet.
```

Primary action:

```text
Try Again
```

Rules:

- Keep neutral.
- Do not say failure.
- Do not imply a transaction was rejected.

---

### Wallet Not Installed

Title:

```text
Wallet not detected
```

Description:

```text
Install or open a supported wallet, then try again.
```

Supported wallet helper:

```text
Supported wallets: Phantom, Solflare, Backpack.
```

Connect modal behavior: a wallet is "detected" when the row can actually start a
connection. That is true in two cases:

1. adapter readyState `Installed` — a browser extension injected a provider (desktop,
   and wallet apps' own in-app browsers); or
2. adapter readyState `Loadable` **on iOS Safari only** — there is no extension to
   detect, but `connect()` redirects to the wallet's universal link. The iOS-Safari
   condition deliberately mirrors `isIosAndRedirectable()` in
   `@solana/wallet-adapter-base`, so a row never invites a tap the adapter refuses.

`Loadable` stays excluded everywhere else: on desktop it is Solflare's web-wallet
fallback, which must not masquerade as an installed extension.

A wallet that is not detected shows the "Not detected" row status, and **clicking it
opens that wallet's official page in a new tab** (`target="_blank"`,
`rel="noopener noreferrer"`) — there is no error state for the not-detected case, and
it never fake-connects.

History: until 2026-11-18 only `Installed` counted. Because iOS Safari reports
`Loadable`, every iPhone visitor was told "Wallet not detected" and sent to a marketing
page, so the deep-link path was never once attempted in production — zero wallet
connections had ever completed there.

---

### Mobile Wallet Adapter (Android)

Shown **instead of** the three fixed wallet rows when `@solana/wallet-adapter-react`
has auto-registered the Solana Mobile Wallet Adapter — which it does only on Android,
in a real browser, with no provider already injected.

The three named rows are replaced rather than joined, for two reasons: on Android each
could only ever report "Not detected", and the OS wallet chooser that MWA opens *is*
the wallet picker, so listing wallets first would ask the same question twice.

Label + hint:

```text
Connect a wallet app
Choose from the wallet apps installed on your phone.
```

Rules:

- The row names the action, not a wallet — WealthSmith cannot know which wallet the
  chooser will offer, and must not appear to favour one.
- Analytics record this as `wallet: "other"`: the adapter is always named "Mobile
  Wallet Adapter" and the OS never tells the page which wallet won. Read it with
  `context === "mobile_wallet_adapter"`.
- It does not go through the `Installed` / `Loadable` detection above. MWA reports
  `Loadable`, which the iOS-Safari gate would reject.

---

### In-App Browser

Shown **instead of** the wallet list when the page is running inside another app's
embedded webview (X, Instagram, Facebook, TikTok, LinkedIn, …), where a wallet
connection cannot complete at all: the adapter will not redirect (its iOS check
requires `safari` in the UA, which these webviews omit), and the host app may tear the
webview down mid-handoff.

Title:

```text
Open in your browser to connect
```

Description (`{app}` is the host app's everyday name, e.g. "X"):

```text
{app}’s built-in browser can’t open wallet apps. Open this page in Safari or Chrome, then connect your wallet there.
```

Action + hint:

```text
Copy Link
You can also use this app’s menu and choose “Open in browser”.
```

Rules:

- Never say "not detected" here — the wallet is fine; the browser is the problem.
- The action is **Copy Link**, not "Open in Safari": a webview cannot reliably escape
  itself, and a button that silently does nothing is worse than no button.
- A wallet app's own in-app browser (Phantom, Solflare, Backpack) is **never** treated
  as a blocked in-app browser — it injects a provider and connects normally.
- Android is out of scope for this state: it is a real browser, and gets the Mobile
  Wallet Adapter row below. (An Android *webview* does reach this state — the library
  excludes webviews from MWA, so it falls through to here.)

Approved Wallet Sites (official pages, the only approved wallet URLs):

```text
Phantom  — https://phantom.app/
Solflare — https://solflare.com/
Backpack — https://backpack.app/
```

Rules:

- Only the approved wallet sites above may be linked; do not link other URLs.
- Do not promote one wallet as best.
- Do not invent wallet install instructions.

---

### Unsupported Wallet

Title:

```text
Wallet not supported
```

Description:

```text
Use Phantom, Solflare, or Backpack to connect to WealthSmith.
```

Rules:

- Keep wallet list aligned with product metadata.
- Do not claim future support unless roadmap/product content approves it.

---

### Wrong Network

Title:

```text
Unsupported network
```

Description:

```text
WealthSmith MVP supports Solana wallet data.
```

Rules:

- Use only if product detects wrong/unsupported network.
- Do not imply Ethereum/Bitcoin tracking unless product flow explicitly supports it.
- Do not suggest wrapped assets as a workaround.

---

### Wallet Data Failed

Title:

```text
We couldn’t load wallet data
```

Description:

```text
Try again in a moment. Your funds stay in your wallet.
```

Primary action:

```text
Retry
```

Rules:

- Use non-custodial reassurance when useful.
- Do not imply wallet is unsafe.
- Do not show fake balances.

---

### Portfolio Positions Failed

Title:

```text
Some wallet positions are unavailable
```

Description:

```text
WealthSmith loaded part of your portfolio, but some positions could not be checked.
```

Primary action:

```text
Refresh
```

Rules:

- Keep available data visible.
- Do not hide partial state.
- Do not say the wallet is empty if only some integrations failed.

---

### Message Signature Failed

Title:

```text
Signature not completed
```

Description:

```text
The message signature was not completed. No funds moved.
```

Primary action:

```text
Try Again
```

Rules:

- Use only for message-signing failure.
- Do not call it transaction failure unless it was a transaction.
- Do not imply user funds are affected.

---

## Wallet Success Copy

### Connection Success

Toast:

```text
Wallet connected
```

Optional helper:

```text
Loading supported balances and positions...
```

### Disconnection Success

Toast:

```text
Wallet disconnected
```

### Copy Address

Toast:

```text
Address copied
```

Rules:

- Keep success copy short.
- Do not imply more than happened.
- Do not say portfolio loaded until portfolio data is loaded.
- Do not say action completed unless action completed.

---

## Wallet and Demo Mode Copy

Demo Mode wallet state:

```text
wallet.status = disconnected
demo_mode = true
```

Demo banner:

```text
You’re in demo mode.
```

Demo helper:

```text
Connect your wallet to personalize WealthSmith with your real portfolio.
```

Rules:

- Do not show wallet pill in Demo Mode.
- Do not say demo data is the user’s wallet.
- Do not imply Demo Mode connected a wallet.
- If user connects wallet from Demo Mode, clear demo data before showing real wallet data.
- Demo suggestions must not use real-wallet wallet copy.

---

## Wallet and Suggestions Copy

Suggestion card CTA copy should not imply wallet execution.

Use:

```text
Review on {protocol}
Open protocol
Manage on {protocol}
```

Safety helper:

```text
No action will be taken automatically.
```

Protocol handoff explanation:

```text
Opening the protocol lets you review the action externally. WealthSmith does not execute the transaction or move funds for you.
```

Rules:

- Do not use `Swap now`, `Stake now`, or `Deposit now` in MVP suggestion cards.
- Do not imply clicking a suggestion signs a transaction.
- Do not mark suggestions completed after opening protocol.
- Do not say funds moved.

---

## Wallet and Smith AI Copy

Smith AI may explain wallet connection.

Approved response:

```text
Wallet connection lets WealthSmith read supported balances and positions so it can personalize your dashboard and suggestions. Your funds stay in your wallet.
```

Smith AI may explain read-only:

```text
Read-only means WealthSmith can use public wallet and supported protocol data to show your portfolio and suggestions. It does not give WealthSmith permission to move funds.
```

Smith AI must warn:

```text
Never share your seed phrase or private key. WealthSmith will not ask for them.
```

Rules:

- Smith AI must not request signatures from chat.
- Smith AI must not ask for wallet secrets.
- Smith AI must not say it can recover wallets.
- Smith AI must not imply it can move funds.

---

## Wallet and Support Copy

Support Contact Us helper:

```text
Describe the wallet issue. Do not include seed phrases, private keys, passwords, or wallet backup files.
```

Useful support details:

```text
Wallet provider
Device type
Browser
Page where the issue happened
Error message
Whether Demo Mode was active
```

Rules:

- Encourage useful non-secret details.
- Never request secrets.
- Do not promise wallet recovery.
- Do not promise funds can be recovered.
- Do not ask users to attach wallet backup files.

---

## Wallet and Portfolio Copy

Portfolio loading after wallet connection:

```text
Loading wallet positions...
```

Portfolio partial:

```text
Some wallet positions are unavailable.
```

Portfolio empty:

```text
No supported assets found.
```

Portfolio error:

```text
We couldn’t load portfolio data.
Try again in a moment. Your funds stay in your wallet.
```

Rules:

- Use “supported” when scope matters.
- Do not say wallet is empty unless confirmed.
- Do not show unsupported assets as fully classified.
- Do not invent balances, APY, or positions.

---

## Wallet Address Display

Default short address format:

```text
6fQ9
```

Wallet pill format:

```text
Phantom • 6fQ9
```

Expanded copy if needed:

```text
Address ending 6fQ9
```

Rules:

- Do not show full address in primary nav by default.
- Full address may be available in wallet details if product supports it.
- Always preserve readable provider name.
- Copy address should show `Address copied`.

---

## Approved Copy Map

Recommended content IDs:

```json
{
  "wallet.connect.cta": "Connect Wallet",
  "wallet.connect.modal_title": "Connect Wallet",
  "wallet.connect.intro": "Choose a wallet to continue.",
  "wallet.connect.helper": "WealthSmith reads balances and positions only. Your funds stay in your wallet.",
  "wallet.security.seed_phrase": "Never share your seed phrase or private key.",
  "wallet.connected.toast": "Wallet connected",
  "wallet.disconnected.toast": "Wallet disconnected",
  "wallet.menu.disconnect": "Disconnect Wallet",
  "wallet.loading.connecting": "Connecting...",
  "wallet.loading.positions": "Loading wallet positions...",
  "wallet.error.connection_failed.title": "Wallet connection failed",
  "wallet.error.connection_failed.description": "We couldn’t connect to your wallet. Try again or choose another supported wallet.",
  "wallet.error.unsupported.title": "Wallet not supported",
  "wallet.error.unsupported.description": "Use Phantom, Solflare, or Backpack to connect to WealthSmith.",
  "wallet.signature.title": "Confirm Wallet Ownership",
  "wallet.signature.helper": "Sign this message to confirm wallet ownership. This is not a transaction and will not move funds.",
  "wallet.signature.failed.title": "Signature not completed",
  "wallet.signature.failed.description": "The message signature was not completed. No funds moved.",
  "wallet.read_only.explanation": "Read-only means WealthSmith can use public wallet and supported protocol data to show your portfolio and suggestions. It does not give WealthSmith permission to move funds.",
  "wallet.non_custodial.explanation": "WealthSmith is non-custodial. Your funds stay in your wallet, and WealthSmith does not hold your crypto or private keys."
}
```

Rules:

- Use stable IDs for implementation.
- Do not duplicate conflicting wallet copy.
- Keep wallet copy aligned across UI, FAQ, Smith AI, and Support.

---

## Approved Wallet Copy Snippets

### Connect wallet intro

```text
Connect your wallet so WealthSmith can read balances and positions.
Your funds stay in your wallet.
```

### Read-only helper

```text
WealthSmith reads supported wallet data. It cannot move funds from a read-only connection.
```

### Non-custodial helper

```text
WealthSmith is non-custodial. Your funds stay in your wallet.
```

### Seed phrase warning

```text
Never share your seed phrase or private key.
```

### Message signing helper

```text
Sign this message to confirm wallet ownership.
This is not a transaction and will not move funds.
```

### Protocol handoff helper

```text
You’ll review this externally. WealthSmith does not execute the transaction or move funds for you.
```

---

## Forbidden Wallet Copy

Never use:

```text
Authorize WealthSmith to manage your assets
Give WealthSmith access to your funds
Secure your assets with WealthSmith
Your funds are safe with us
We protect your funds
We will move your funds
We will rebalance your wallet
Trade from WealthSmith
Send your seed phrase
Send your private key
Upload your wallet backup
Export your private key
Signature required to move forward
This signature is always safe
```

Use safer alternatives:

```text
Connect your wallet
Your funds stay in your wallet
Read balances and positions
No action will be taken automatically
Sign this message to confirm wallet ownership
This is not a transaction and will not move funds
Never share your seed phrase or private key
```

---

## QA Checklist

Before shipping wallet copy, verify:

```text
Does copy clearly say funds stay in the user’s wallet?
Does copy avoid custody claims?
Does copy avoid execution claims?
Does copy avoid guaranteed safety claims?
Does copy avoid seed phrase/private key requests?
Does Connect Wallet copy explain read-only behavior?
Does message-signing copy say it is not a transaction?
Does failure copy say no funds moved where appropriate?
Does wallet error copy avoid blaming the user?
Does wallet disconnected copy avoid implying funds moved?
Does Demo Mode avoid showing wallet-connected copy?
Does Smith AI wallet copy avoid asking for secrets?
Does Contact Us wallet copy warn not to include secrets?
Does supported wallet copy list only approved MVP wallets?
```

---

## Related Files

Rules:

```text
rules/wallet-and-custody-rules.md
rules/smith-ai-rules.md
rules/demo-mode-rules.md
rules/protocol-selection-rules.md
rules/loading-state-rules.md
```

Content:

```text
content/voice-and-tone.md
content/ui-copy-rules.md
content/support-faq-content.md
content/smith-ai-copy.md
content/empty-error-loading-copy.md
content/demo-mode-copy.md
```

Components:

```text
components/global-nav.md
components/modal.md
components/button.md
components/toast.md
components/menu-popover.md
components/menu-item.md
```

Patterns:

```text
patterns/wallet-connection.md
patterns/dashboard-layout.md
patterns/portfolio-overview.md
patterns/suggestion-flow.md
patterns/support-center.md
```

Assets:

```text
assets/icons/wallet/phantom.svg
assets/icons/wallet/solflare.svg
assets/icons/wallet/backpack.svg
```

---

## Claude Code Rules

Claude Code should:

- Use approved wallet labels and copy IDs.
- Use `Connect Wallet` as the primary CTA.
- Show read-only/non-custodial helper copy in wallet flows.
- Show seed phrase/private key warning in Connect Wallet and Contact Us contexts.
- Use supported wallet names only.
- Show wallet pill as `{provider} • {short_address}`.
- Use `Disconnect Wallet` for wallet menu.
- Use wallet-specific loading/error copy.
- Keep wallet connection separate from portfolio loading.
- Keep Demo Mode and real wallet mode separate.
- Use message-signing copy only if message signing is required.
- Use protocol handoff copy that avoids execution language.

Claude Code must not:

- Ask for seed phrases or private keys.
- Ask for wallet backup files.
- Invent supported wallets.
- Imply WealthSmith controls funds.
- Imply WealthSmith protects funds.
- Imply wallet connection executes transactions.
- Imply suggestion clicks request signatures in MVP.
- Use Smith AI animation for wallet connection.
- Show wallet pill in Demo Mode.
- Treat wallet connected as portfolio fully loaded.
- Show fake wallet balances while loading.
- Use unsupported wallet icons or labels.

---

## Do

- Say funds stay in wallet.
- Say WealthSmith reads balances and positions.
- Say connection is read-only for portfolio viewing.
- Say no action is automatic.
- Say message signing is not a transaction when relevant.
- Warn users never to share seed phrase/private key.
- Keep wallet errors calm and recoverable.
- Keep supported wallet labels consistent.
- Keep Demo Mode separate from wallet mode.

---

## Do Not

- Do not imply custody.
- Do not imply execution.
- Do not imply guaranteed safety.
- Do not ask for secrets.
- Do not request signatures from chat.
- Do not confuse message signing with transaction signing.
- Do not show fake wallet data.
- Do not blame users for wallet errors.
- Do not show wallet pill in Demo Mode.
- Do not invent wallet support.

---

## Done Criteria

Wallet copy is implemented correctly when:

- Connect Wallet copy explains read-only/non-custodial behavior.
- Supported wallets are listed as Phantom, Solflare, and Backpack.
- Wallet connected/disconnected states have approved copy.
- Wallet pill uses provider + shortened address.
- Wallet menu uses Disconnect Wallet.
- Message signing copy clearly says it is not a transaction and will not move funds.
- Wallet errors are calm and recoverable.
- Contact Us warns users not to include secrets.
- Demo Mode does not show wallet-connected copy.
- Protocol handoff copy does not imply transaction execution.
- No wallet copy asks for seed phrase, private key, password, or wallet backup file.
- No wallet copy implies WealthSmith holds, protects, manages, moves, trades, stakes, deposits, withdraws, or rebalances user funds.
