# Wallet and Custody Rules

This rule file defines WealthSmith’s wallet, custody, signature, wallet safety, and private-key boundaries.

These rules protect user trust.

They must be followed across Wallet Connection, Global Nav, Dashboard, Portfolio, Suggestions, Support, Smith AI, and Contact Us.

---

## Purpose

WealthSmith is a read-first, non-custodial planning and suggestion product.

Wallet connection is used to personalize the user’s dashboard, portfolio, safety buffer, and suggestions.

Wallet connection must never feel like handing control of funds to WealthSmith.

---

## Core Hard Rules

Hard Rule:

```text
WealthSmith must never ask for seed phrases.
WealthSmith must never ask for private keys.
WealthSmith must never ask users to upload wallet backup files.
WealthSmith must never imply it can recover a private wallet.
WealthSmith must never imply it holds user funds.
WealthSmith must never imply wallet connection moves funds.
```

Hard Rule:

```text
Connecting a wallet is not a transaction.
Connecting a wallet does not give WealthSmith custody.
Connecting a wallet does not authorize WealthSmith to move funds.
```

---

## Product Position

WealthSmith is:

```text
Non-custodial
Read-first
User-controlled
Suggestion-based
Handoff by default, execution-assisting where the full transaction can be shown
```

WealthSmith is not:

```text
A custodian
A wallet recovery service
A broker
An exchange
A portfolio manager with execution authority
An executor of anything the user has not approved transaction-by-transaction
```

The last two lines are different rules and must not be collapsed.

**Execution authority** — deciding and acting for the user — is permanently out of
scope. It is what makes something a manager, and WealthSmith never acquires it.

**Transaction execution** — constructing a transaction the user then approves in
their own wallet — was out of scope *for MVP only*. MSP allows it, bounded by the
Execution Boundary below. Custody is unaffected either way: the key never leaves
the user's wallet and nothing moves without their per-transaction signature.

---

## Supported MVP Wallets

Supported MVP wallets:

```text
Phantom
Solflare
Backpack
```

Approved wallet icons:

```text
assets/icons/wallet/phantom.svg
assets/icons/wallet/solflare.svg
assets/icons/wallet/backpack.svg
```

Rules:

- Do not invent supported wallets.
- Do not claim support for wallets that are not approved.
- Do not show unsupported wallet options in the MVP connection modal.
- Do not show broken wallet icons.
- Wallet icons must be paired with visible wallet names.
- Wallet support copy should match the canonical support content.

---

## Wallet Connection Purpose

Wallet connection is used to read:

```text
Public wallet address
Token balances
Relevant token accounts
Staked assets
Yield strategy positions
Protocol positions
Portfolio composition
```

Wallet connection may be used to personalize:

```text
Dashboard
Portfolio
Safety Buffer
Projected Growth
Current vs Recommended Allocation
Smith AI Suggestions
Strategy Insights
```

Rules:

- Wallet connection should be framed as read-only.
- Do not imply funds move during wallet connection.
- Do not imply WealthSmith controls the wallet.
- Do not imply wallet connection means approval of suggestions.
- Do not imply wallet connection means a transaction was signed.

---

## Connect Wallet Copy

Use:

```text
Connect Wallet
```

Helpful copy:

```text
Connect your wallet so WealthSmith can read balances and positions to personalize your dashboard and suggestions.
Your funds stay in your wallet.
```

Allowed:

```text
Read-only connection
Your funds stay in your wallet
No action will be taken automatically
You stay in control
```

Avoid:

```text
Give WealthSmith access to your funds
Authorize WealthSmith to manage your wallet
Secure your funds with WealthSmith
We will rebalance for you
```

Hard Rule:

```text
Wallet connection copy must not imply custody or execution.
```

---

## Connect Wallet Modal

The Connect Wallet modal should show approved wallet options.

Recommended structure:

```text
Connect Wallet

Choose a wallet to continue.

Phantom
Solflare
Backpack

WealthSmith reads balances and positions only.
Your funds stay in your wallet.
```

Rules:

- Wallet options must be explicit.
- Each option should include wallet icon and wallet name.
- Do not use wallet icon alone.
- Include read-only reassurance.
- Include non-custodial reassurance.
- Do not ask for seed phrase/private key.
- Do not ask users to paste wallet secrets.
- Do not ask users to upload backup files.
- Cancel/close should be available.

---

## Read-First MSP Rule

Hard Rule:

```text
Wallet connection is read-only. Execution is a separate, explicitly approved act.
```

This is unchanged from MVP in substance — what expired is the idea that read-only
was a property of the *product*. It is a property of **connection**. Connecting
reads; it never authorizes. Nothing below weakens that.

Read-only means WealthSmith can use wallet/public/protocol data to display portfolio and suggestions.

Connecting a wallet does not, by itself, authorize any of:

```text
Move funds
Swap tokens
Stake tokens
Deposit assets
Withdraw assets
Claim rewards
Sign transactions automatically
Approve transactions automatically
```

The last two are permanent. "Automatically" is the operative word: WealthSmith
never signs, never pre-approves, and never carries an approval from one
transaction to the next. Every transaction is approved on its own, in the user's
own wallet, after its exact terms have been shown.

Rules:

- Portfolio viewing must not require transaction signing.
- Suggestion viewing must not require transaction signing.
- Goal editing must not require transaction signing.
- Support/Contact Us must not require wallet connection.
- Suggestion clicks open protocol pages, except where the Execution Boundary
  below explicitly allows an in-app confirm step.
- Manage links open protocol pages; they never execute.
- **Wallet connection itself requires no signature.** Connecting must not call
  `signMessage` / `signTransaction` / `sendTransaction`; it uses only the wallet's
  `connect()` and the returned publicKey. Proof-of-ownership via signature is out
  of scope for connection, permanently — not an MVP convenience. Ledger-backed
  Phantom accounts therefore connect with no on-device approval. Any signature is
  reserved for an explicit, user-approved action — never for connecting.

---

## Signature Boundaries

Standing goal:

```text
Never require a wallet signature to look at anything.
```

Viewing and executing are separate acts and stay separate. This did not expire
with MVP; execution makes the separation more important, not less.

Hard Rule:

```text
Do not request transaction signatures for viewing Dashboard, Portfolio, Goal, Support, or Suggestions.
```

Message signing:

- May be used only if product explicitly requires ownership verification or account linking.
- Should not be required for basic portfolio visibility if it creates wallet/Ledger failures.
- Must be clearly explained before request.
- Must not imply a transaction.
- Must not be confused with transaction approval.

Transaction signing:

- Never used for protocol handoffs.
- Never used for goal settings.
- Never used for contact support.
- Never used for a suggestion card click itself. A card click opens a review; only
  an explicit confirm step inside that review may request a signature.
- Belongs solely to execution flows that satisfy the Execution Boundary below.

---

## Execution Boundary

This section is what MSP added. It is deliberately narrow.

Hard Rule:

```text
WealthSmith may construct a transaction only when it can show the user its exact
terms before they approve it. Everything else is a handoff.
```

A suggestion may become executable in-app only if ALL of the following hold:

- WealthSmith can construct the complete transaction itself — no step is left to
  be finished elsewhere.
- Every term the user is committing to can be shown before signing: what is sold,
  what is received, the minimum received after slippage, price impact, and fees.
- The transaction does one thing. No bundling, no batching, no "while we're here".
- It is approved on its own, in the user's wallet, immediately before submission.
- The user can decline at every point, and declining costs them nothing.

**Scope at the time of writing: token swaps only.** Deposits, lending, staking,
unstaking, claiming and withdrawals remain handoffs. They are not excluded because
they are dangerous — they are excluded because WealthSmith cannot yet show their
full terms honestly, which is the actual test above.

Expanding this scope is a product decision requiring the same test, protocol by
protocol. "We already execute swaps" is not an argument for executing anything
else.

Hard Rule:

```text
No automatic execution, ever. No scheduled execution. No recurring execution.
No approval that outlives the transaction it was given for.
```

This holds regardless of how convenient the alternative would be, and regardless
of what the user asks for. An approval that covers future actions is execution
authority, which WealthSmith does not take.

---

## Message Signing Copy

If message signing is ever required, copy must be clear.

Use:

```text
Sign this message to confirm wallet ownership.
This is not a transaction and will not move funds.
```

Avoid:

```text
Approve transaction
Authorize funds
Grant access to assets
```

Rules:

- Explain why signing is needed.
- Explain that no funds move.
- Do not use message signing when wallet connection alone is sufficient.
- Provide fallback or skip path when possible.
- Handle Ledger and hardware-wallet limitations carefully.

---

## Ledger and Hardware Wallet Rules

Hardware wallets, including Ledger, may have different signing behavior.

Known consideration:

```text
Message signing and transaction signing are different flows.
Ledger may not show or approve certain message-signing requests in the same way browser wallets do.
```

Rules:

- Do not assume Ledger can approve every message-signing flow.
- Do not block read-only portfolio viewing on message signing if avoidable.
- Do not ask users to disable security protections casually.
- Do not tell users to expose private keys or seed phrases.
- Do not blame the user or hardware wallet.
- Provide a safe fallback when message signing fails.
- Engineering should distinguish message-signing failures from transaction-signing failures.
- If ownership verification is required later, create a Ledger-compatible path.

Good copy:

```text
We couldn’t verify this wallet with message signing.
You may still be able to view supported public wallet data, or try another wallet connection method.
```

Avoid:

```text
Disable security and try again.
Export your private key.
Your Ledger is not supported.
```

---

## Wallet Connected State

When a wallet is connected, show a wallet pill.

Format:

```text
{Wallet Provider} • {short address}
```

Example:

```text
Phantom • 6fQ9
```

Rules:

- Wallet provider name must be visible.
- Short address must be visible.
- Wallet icon may appear but cannot be the only identity.
- Do not show the full address by default in Global Nav.
- Wallet connected state should be persistent across app pages.
- Wallet connected state does not imply custody.
- Wallet connected state does not imply execution permission.

Accessible label example:

```text
Connected wallet: Phantom, address ending 6fQ9. Open wallet menu.
```

---

## Wallet Menu

Wallet pill opens a wallet menu.

MVP menu item:

```text
Disconnect Wallet
```

Rules:

- Wallet menu must be keyboard accessible.
- Escape closes the menu.
- Clicking outside closes the menu.
- Disconnect should be clear.
- Disconnect does not move funds.
- Disconnect does not require a wallet signature.
- Disconnect removes the wallet connection from WealthSmith session/app state.
- Disconnect should clear real wallet portfolio/suggestion state or return to safe disconnected state.
- Disconnect should not delete user goal settings unless product explicitly says so.

Toast:

```text
Wallet disconnected
```

---

## Disconnect Wallet

Disconnecting wallet means:

```text
WealthSmith no longer reads that wallet for the current session/app state.
```

Disconnecting wallet does not mean:

```text
Funds moved
Assets sold
Positions closed
Wallet deleted
Blockchain permissions revoked everywhere
```

Rules:

- Use calm copy.
- Do not imply funds are affected.
- Do not request signature.
- After disconnect, hide wallet pill.
- After disconnect, hide real wallet portfolio values.
- After disconnect, avoid showing real-wallet suggestions as active.
- User may enter Demo Mode after disconnect if product supports it.

---

## Wallet Disconnected State

When disconnected:

```text
No wallet pill
Connect Wallet CTA may appear
Try Demo Mode CTA may appear if supported
Portfolio and suggestions may show empty/pre-wallet states
```

Rules:

- Do not show stale real wallet values as active data.
- If cached data is shown, clearly mark it stale or unavailable.
- Do not show personalized real-wallet suggestions without wallet data unless saved product logic supports it.
- Provide clear next action.

Example empty copy:

```text
Connect your wallet to personalize your portfolio and suggestions.
Your funds stay in your wallet.
```

---

## Demo Mode Separation

Hard Rule:

```text
Demo Mode data must never be mixed with real wallet data.
```

Demo Mode:

```text
Uses sample portfolio data
Uses sample suggestions
Shows Demo Mode banner
Does not use real wallet balances
Does not show wallet pill
```

Wallet Connected Mode:

```text
Uses real wallet/public/protocol data
Shows wallet pill
Does not show Demo Mode banner
Does not use demo suggestions
```

Rules:

- Exiting Demo Mode should clear demo-specific portfolio and suggestion state.
- Connecting a wallet should not silently merge demo and real state.
- Smith AI must know whether it is explaining demo data or real wallet data.
- Demo Mode suggestions must not persist as real-wallet recommendations.

Hard Rule:

```text
If a real wallet is connected, the app must not present dummy/fixture portfolio
data as the user's real wallet data.
```

- Real connected wallet mode uses live read-only wallet reads (see
  patterns/wallet-connection.md — Read-Only Wallet Portfolio Discovery + Data Mode
  Separation).
- Prototype/reference fixtures (Demo Mode fixtures, the connected-wallet example
  fixture, portfolio example fixtures) may be used for demo/dev/tests only — not
  as the connected wallet's real holdings, value, allocation, Top Pick, or
  suggestions.
- If a value cannot be computed for a real wallet yet (USD value, APY, allocation,
  suggestions), show a safe unavailable/coming-soon state instead of a fixture
  value.

---

## Global Nav Wallet Rules

Global Nav uses wallet/app state.

Four MVP variants:

```text
1. Onboarding active, no wallet connected:
   Show Try Demo Mode + Connect Wallet.
   Disable Portfolio, Goal, Support.

2. Demo Mode:
   Show Ask Smith AI.
   Do not show wallet pill.

3. Wallet connected:
   Show Wallet pill + Ask Smith AI.

4. Onboarding active, wallet connected:
   Show Wallet pill only.
   Disable Portfolio, Goal, Support.
```

Rules:

- Do not show Connect Wallet when wallet is already connected.
- Do not show wallet pill in Demo Mode unless product explicitly supports mixed state, which MVP does not.
- Do not show Ask Smith AI during active onboarding.
- Onboarding active disables Portfolio, Goal, and Support.
- Wallet state is passed into Global Nav; Global Nav does not fetch wallet state itself.

See:

```text
components/global-nav.md
```

---

## Portfolio Rules

Portfolio data should come from wallet/protocol/price data.

Portfolio may show:

```text
Liquid Assets
Staked Assets
Yield Strategies
Balance Overview
Crypto Assets Allocation
Asset Deployment Overview
```

Rules:

- Do not invent positions.
- Do not classify positions locally without approved portfolio logic.
- Do not treat every token account as liquid.
- Do not treat every stablecoin as Safety Buffer.
- Do not hide unknown/unsupported assets silently.
- Manage links open protocol pages in a new tab.
- Manage links never execute transactions.
- Manage links never request signatures.
- A Manage link is not an execution surface, and does not become one when the
  underlying protocol becomes executable elsewhere in the product.

---

## Suggestion and Handoff Rules

Default suggestion behavior:

```text
Suggestion card click opens a review. The review hands off to an approved
protocol page, unless the suggestion satisfies the Execution Boundary.
```

Hard Rule:

```text
A suggestion card click never executes a transaction.
A suggestion card click never requests a wallet signature.
```

That rule did not expire with MVP and is not weakened by execution. What changed
is what the *review* may offer, not what the card click does. The click opens a
review; the review may offer a confirm step; the confirm step may request one
signature. Three deliberate acts, never collapsed into one.

Rules:

- Suggestion card click opens a review, never an action.
- For a handoff suggestion, the user reviews and acts on the external protocol.
- Use approved protocol URL from metadata/Protocol Logic.
- Build a transaction payload only inside a review that satisfies the Execution
  Boundary, and only for the leg the user is looking at.
- Never auto-submit anything: no swap, stake, deposit, withdrawal or claim.
- Do not imply clicking a suggestion completes the action.
- A failed or declined execution leaves the suggestion exactly as it was. It never
  half-completes, and it never reports success it did not get.

Good copy:

```text
Open protocol
Review on Jupiter
Manage on Kamino
Review swap
Confirm swap
Approve in your wallet
```

Never:

```text
We’ll rebalance for you
We’ll handle it
Set it and forget it
Automatic rebalancing
```

The distinction is agency, not formality. "Confirm swap" is allowed because the
user is the one confirming. "We’ll rebalance for you" stays forbidden at every
stage of the product, because it describes execution authority WealthSmith does
not have and will not take.

---

## Contact Us and Support Safety

Support and Contact Us must never ask for secrets.

Hard Rule:

```text
Contact forms must not ask for seed phrases, private keys, passwords, or wallet backup files.
```

Contact form fields:

```text
Email
Description
```

Recommended safety helper:

```text
Do not include seed phrases, private keys, or passwords.
```

Rules:

- Contact Us should not require wallet connection.
- Contact Us should not automatically attach wallet secrets.
- If wallet address/context is attached in future, user consent should be explicit.
- Smith AI should route account-specific issues to Contact Us without asking for secrets.

---

## Smith AI Wallet Safety

Smith AI may explain:

```text
How wallet connection works
What read-only means
Why a wallet is needed for personalization
How Demo Mode differs from real wallet data
What supported wallets are
Why message signing may be requested if applicable
What to do if connection fails
```

Smith AI must not:

```text
Ask for seed phrases
Ask for private keys
Ask users to upload wallet backup files
Tell users to export private keys
Claim WealthSmith holds funds
Claim WealthSmith can recover wallets
Claim a wallet connection moves funds
Claim a suggestion click executes a trade
Invent supported wallets
Invent protocol support
```

Good Smith AI response:

```text
WealthSmith uses your wallet address to read balances and positions. Your funds stay in your wallet, and no action is taken automatically.
```

Unsafe response:

```text
Send me your seed phrase and I’ll check the wallet.
```

---

## Custody Copy Rules

Use:

```text
Non-custodial
Read-only
Your funds stay in your wallet
No action will be taken automatically
You stay in control
Open protocol to review
```

Avoid:

```text
We keep your assets safe
We manage your funds
We protect your wallet
We’ll execute this for you
Authorize WealthSmith to move funds
Guaranteed safety
```

Hard Rule:

```text
Do not use copy that implies WealthSmith holds, safeguards, manages, controls, or can recover user funds.
```

---

## Wallet Error States

Wallet errors should be calm and specific.

Possible errors:

```text
Wallet not found
Connection rejected
Connection failed
Network mismatch
Message signing failed
Unsupported wallet
Read data failed
Protocol data failed
```

Rules:

- Do not blame the user.
- Do not imply funds are at risk.
- Do not ask for private keys as workaround.
- Preserve clear next action.
- Distinguish connection failure from signing failure.
- Distinguish wallet connection from portfolio data loading.

Good copy:

```text
We couldn’t connect to Phantom.
Check that your wallet is unlocked and try again.
```

```text
We couldn’t load all wallet positions.
Some portfolio sections may be incomplete.
```

```text
Message signing was not completed.
No funds moved.
```

Avoid:

```text
Wallet unsafe.
Your funds may be lost.
Export your private key and try again.
```

---

## Wallet Loading Rules

Wallet connection loading should be lightweight.

Rules:

- Do not show Smith AI animation for wallet connection.
- Use button-level pending state or modal loading.
- Do not show full-screen loading for connection unless necessary.
- Do not show fake wallet data while connecting.
- Do not show real wallet values until data is loaded.
- If wallet connects but portfolio data is still loading, show connected state and portfolio loading separately.

---

## Data Contract

Wallet state example:

```json
{
  "wallet": {
    "status": "connected",
    "provider": "phantom",
    "provider_label": "Phantom",
    "address": "6fQ9...abcd",
    "address_short": "6fQ9",
    "mode": "real"
  }
}
```

Disconnected state:

```json
{
  "wallet": {
    "status": "disconnected",
    "provider": null,
    "provider_label": null,
    "address": null,
    "address_short": null,
    "mode": null
  }
}
```

Connection error:

```json
{
  "wallet_connection": {
    "status": "error",
    "error_code": "message_signing_failed",
    "message": "Message signing was not completed."
  }
}
```

Rules:

- UI renders wallet state.
- Wallet logic owns wallet state.
- Components do not infer wallet state from visible text.
- Demo Mode should not reuse real wallet state.

---

## Security Checklist

Before shipping wallet-related UI, check:

```text
Does it avoid asking for seed phrase?
Does it avoid asking for private keys?
Does it avoid asking for wallet backup files?
Does it clearly say funds stay in wallet?
Does it avoid implying custody?
Does it avoid implying execution?
Does it separate connection from signing?
Does it avoid signatures for read-only views if possible?
Does it handle Ledger/hardware wallets safely?
Does it separate demo and real wallet data?
Does disconnect avoid implying funds moved?
Does Contact Us avoid asking for secrets?
Does Smith AI follow wallet safety rules?
```

---

## Claude Code Rules

Claude Code should:

- Use approved wallet list.
- Use approved wallet icons.
- Render wallet state from structured props.
- Keep wallet connection read-only, and execution separate from connection.
- Separate wallet connection from message signing.
- Separate message signing from transaction signing.
- Avoid signatures for basic portfolio viewing if possible.
- Show wallet pill only when wallet is connected.
- Show short wallet address, not full address, in Global Nav.
- Use Demo Mode banner for demo state.
- Clear or mark stale real wallet data after disconnect.
- Open protocol pages for handoffs; execute only within the Execution Boundary.
- Preserve accessibility for wallet modal, wallet pill, and wallet menu.

Claude Code must not:

- Ask for seed phrases.
- Ask for private keys.
- Ask for wallet backup files.
- Invent supported wallets.
- Invent wallet state.
- Invent protocol execution.
- Require wallet signatures for display components.
- Treat wallet connection as custody.
- Treat a suggestion click as a transaction, or a review as an approval.
- Mix demo and real data.
- Use Smith AI animation for wallet connection.
- Hide wallet errors without recovery.
- Tell Ledger users to expose secrets.

---

## Do

- Say WealthSmith is non-custodial.
- Say funds stay in the user’s wallet.
- Make wallet connection feel read-only.
- Use approved wallet icons and names.
- Show wallet provider + short address when connected.
- Keep Demo Mode separate.
- Keep suggestion clicks as reviews — never as actions.
- Handle connection failures calmly.
- Protect users from sharing secrets.
- Keep Smith AI within safe wallet explanations.

---

## Do Not

- Do not ask for seed phrases.
- Do not ask for private keys.
- Do not ask users to upload wallet backup files.
- Do not imply WealthSmith holds funds.
- Do not imply WealthSmith can recover wallets.
- Do not imply wallet connection moves funds.
- Do not imply suggestion clicks execute trades.
- Do not require signatures for read-only views unless explicitly approved.
- Do not mix demo and real data.
- Do not invent supported wallets.
- Do not blame users for wallet failures.
- Do not show stale real wallet values as active data after disconnect.

---

## Done Criteria

This rule is followed when:

- Wallet connection copy is read-only and non-custodial.
- Supported wallets are Phantom, Solflare, and Backpack.
- Wallet icons and names are visible.
- No UI asks for seed phrases or private keys.
- Contact Us does not ask for wallet secrets.
- Wallet pill shows provider and short address.
- Disconnect does not imply funds moved.
- Portfolio viewing does not require transaction signing.
- Suggestion clicks open a review; handoff reviews link to approved protocol pages in new tabs.
- Suggestion clicks do not execute transactions.
- Suggestion clicks do not request signatures.
- Any signature request comes from an explicit confirm step, never from a card.
- Demo Mode and real wallet state are separate.
- Smith AI explains wallet behavior safely.
- Ledger/hardware-wallet issues are handled without unsafe instructions.
