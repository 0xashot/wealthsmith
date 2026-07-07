# Wallet Connection

This pattern defines how WealthSmith users connect, view, and disconnect wallets.

Wallet connection is used to read balances and portfolio positions so WealthSmith can personalize the Dashboard, Portfolio, Onboarding, and Smith AI Suggestions.

For MVP, wallet connection is read-only.

WealthSmith does not custody funds, move funds, execute transactions, or request signatures for basic portfolio viewing.

---

## MVP Connection Is Read-Only (No Signing)

The implemented MVP wallet connection (Solana wallet-adapter: Phantom, Solflare,
Backpack, and Phantom accounts backed by Ledger) is **connection only**:

- Connecting uses the wallet's `connect()` and the returned **publicKey** only. It
  **must not** call `signMessage`, `signTransaction`, or `sendTransaction`, and must
  not request any signature or approval to connect (`autoConnect` is off).
- **Proof-of-wallet ownership via signature is out of scope** for MVP connection.
  Signatures may be requested **only later**, for explicit, clearly-labelled,
  user-approved actions — never as part of connecting.
- **Ledger-backed Phantom accounts** connect through Phantom as normal wallet
  accounts. Because WealthSmith requests no signature on connect, connecting a
  Ledger-backed account requires **no on-device approval** — the connected
  publicKey is used as-is.
- Connection alone does not fetch balances, scan the portfolio, or change any
  Dashboard/Goal/Portfolio fixture — only the wallet pill shows the real
  wallet name + shortened publicKey.

See `app/src/wallet/SolanaWalletProvider.tsx` and `app/src/components/ConnectWalletModal.tsx`.

---

## Read-Only Wallet Portfolio Discovery

After connection, WealthSmith may **read** what the connected wallet holds. This
is discovery only — still no signing, no transactions, no fund movement.

- Wallet reads are **read-only**: the connected `publicKey` is used with RPC reads
  (`getBalance` for native SOL, `getParsedTokenAccountsByOwner` for SPL tokens).
  No `signMessage` / `signTransaction` / `signAllTransactions` / `sendTransaction`,
  and no permission beyond the existing connection — so Ledger-backed Phantom reads
  need no on-device approval.
- **Token balances are separate from protocol positions.** SPL token balances come
  from the wallet's token accounts; protocol positions (e.g. Kamino obligations,
  native Jupiter validator stake) require protocol-specific read logic.
- **LSTs are classified as staked/yield assets when the mint is recognized** — via
  the curated `TOKEN_REGISTRY` (`app/src/wallet/walletPosition.ts`: JupSOL, mSOL,
  bSOL, JitoSOL, plus USDC/USDT/BONK) AND, as a fallback, via **Sanctum's LST list**
  (`app/src/wallet/sanctumLsts.ts`, ~245 LSTs fetched from Sanctum's CDN registry).
  A held Sanctum LST is shown with its real symbol/name (source "Sanctum") and gets
  its APY from the stake-pool math. Mints in neither show as a generic token —
  never inferred as an LST/protocol position.
- **JupSOL** held in the wallet is classified as a Jupiter / JupSOL LST position.
  **Native SOL stake accounts** (SOL delegated directly to a validator) are also
  detected read-only via the Stake program (`getParsedProgramAccounts` filtered by
  the wallet's withdraw authority) and shown as "Staked SOL" with the validator.
- **Orca Whirlpool** LP positions are detected read-only (`app/src/wallet/orcaWhirlpools.ts`):
  a held position NFT → its Position PDA → the Position + Whirlpool accounts are
  decoded on-chain, and Orca's core WASM (`decreaseLiquidityQuote`) converts the
  position's liquidity into the two underlying token amounts. Shown as one row
  (e.g. "SOL/USDC · 0.0087 SOL + 0.7048 USDC") with the pool's fee APR from Orca's
  whirlpool list. **Position bundles** (one NFT → many positions) are expanded via
  the bundle's position bitmap. No high-level SDK (avoids a `@solana/kit` major conflict).
- **Raydium CLMM** LP positions (`app/src/wallet/raydiumClmm.ts`) work the same way:
  a held position NFT → PersonalPositionState PDA → decode + the **same Orca core
  WASM** (Raydium uses identical Uniswap-V3 math) → token amounts; symbols + fee APR
  from Raydium's API, decimals + sqrtPrice on-chain.
- **Raydium classic AMM / CPMM** positions (`app/src/wallet/raydiumAmm.ts`) are
  fungible LP tokens, not NFTs: a held LP token is resolved via Raydium's
  `pools/info/lps` API and valued as `yourLP / totalLpSupply × reserves` for each
  side — API-only, no on-chain decode. Symbols + fee APR from the same response.
- **Meteora DLMM** positions (`app/src/wallet/meteoraDlmm.ts`) are bin-based
  concentrated liquidity; the position is a program account owned by the wallet
  (not a token), so valuing it needs bin math — done via Meteora's official SDK
  (`@meteora-ag/dlmm`, web3.js v1) `getAllLbPairPositionsByUser`, aggregated per
  pair into one row. APY shows "—" (Meteora's DLMM API is unavailable).
- **Meteora DAMM** positions (`app/src/wallet/meteoraDamm.ts`) are fungible LP
  tokens, but Meteora's API has no lookup-by-LP-mint (80k+ pools), so the pool is
  found ON-CHAIN (the Pool account stores `lp_mint` at offset 8) and valued with
  Meteora's `@meteora-ag/dynamic-amm-sdk` (`AmmImpl`, which resolves the dynamic
  vaults) → `yourLP / lpSupply × reserves`. Note: an npm override dedupes
  `@solana/web3.js` (the DAMM SDK pinned an exact version) to avoid a duplicate
  Connection/PublicKey and cross-copy `instanceof` issues.
- **Hubble** USDH borrowing positions (`app/src/wallet/hubble.ts`) are read-only
  CDPs: a user deposits collateral (SOL, mSOL, ETH, BTC, …) and mints USDH, an
  interest-free stablecoin. Detected owner-based via Hubble's official
  `@hubbleprotocol/hubble-sdk` (`getUserLoans`), shown as a "Hubble Loan" borrow
  row — e.g. "13,752.54 USDH debt · 335.5 SOL". The SDK is used (not a raw account
  decode) because the on-chain debt field UNDERSTATES the true debt — liquidation
  losses are redistributed pro-rata across borrowers via the borrowing-market
  state, and the SDK returns that redistribution-adjusted debt. APY shows "—"
  (interest-free borrow, one-time fee, no ongoing borrow APR). USDH itself is a
  recognized token in the registry (`source: "hubble"`; non-yield-bearing, no APY).
- **Jito Restaking** positions are detected read-only (`app/src/wallet/jitoRestaking.ts`):
  Jito vaults are enumerated on-chain and decoded with `@jito-foundation/vault-sdk`
  to build a VRT-mint → underlying map; a held VRT is shown as "Restaked on Jito"
  denominated in its underlying token (e.g. JitoSOL). Restaking-reward APY has no
  clean read source yet → shown as "—".
- **Kamino** lending positions are detected read-only (`app/src/wallet/protocolPositions.ts`):
  the user's obligations are read from Kamino's public REST API, and each
  deposit/borrow reserve's underlying mint is resolved **on-chain** (reserve
  liquidity-mint offset) and mapped to a symbol — e.g. "USDC supplied on Kamino".
  Positions are shown as detected (supplied/borrowed); no USD value or APY is
  invented. See [`docs/kamino-position-detection-plan.md`](../docs/kamino-position-detection-plan.md).
  They are not inferred from unrelated token balances.
- **No USD value and no APY are invented.** `valueUsd`/`apy` stay null until an
  approved pricing/APY source exists.
- Live wallet reads are surfaced in a clearly-marked **read-only "Live Wallet
  Assets"** section, which is the **primary** Portfolio content in real-wallet
  mode. Fetch only when connected; clear + cancel on disconnect; no polling
  (manual refresh).

See `app/src/wallet/useWalletPortfolio.ts` and `app/src/components/LiveWalletAssets.tsx`.

---

## Data Mode Separation (Demo vs Real Wallet vs Disconnected)

The app renders portfolio-shaped content in exactly one of three data modes, and
they must never be mixed. A `portfolioDataSource` flag makes this explicit
(`app/src/state/portfolioDataSource.ts`):

- **`demo_fixture`** — Demo Mode. Sample fixture values, sample suggestions,
  sample Top Pick. Demo Mode banner is visible. This is the only normal-flow mode
  that renders those fixtures.
- **`real_wallet`** — a real wallet is connected. The app shows **live, read-only
  wallet data** and **safe "unavailable" states**. It must **not** render fixture
  Portfolio Value, Safety Buffer, Projected Growth, Allocation, Top Pick, or
  suggestions as the connected wallet's real data.
- **`example_fixture`** — the connected-wallet reference fixture
  (`examples/dashboard/dashboard-connected-wallet-state.json`). For tests /
  storybook / dev reference **only** — never the normal real-wallet flow.

Hard Rule:

```text
If a real wallet is connected, the app must not present dummy/fixture portfolio
data as the user's real wallet data.
```

### Real Connected Wallet Mode behavior

- **Dashboard** shows a live wallet summary (wallet label, assets detected, native
  SOL, SPL token count, recognized LST count, recognized protocols) derived only
  from read-only reads. Portfolio Value shows an unavailable state
  ("Portfolio value needs pricing data before it can be shown.") because pricing
  is not connected. Suggestions show a safe coming-soon state. No fixture value,
  Safety Buffer, projection, allocation, or Top Pick is shown.
- **Portfolio** shows the read-only **Live Wallet Assets** as the primary content.
  Fixture Liquid / Staked / Yield / Deployment sections are **hidden** in
  real-wallet mode (they would present sample balances/APY/Manage handoffs as the
  user's real positions). Manage / review-only protocol handoffs are hidden unless
  they correspond to a detected live position.
- **Ask Smith AI** is available in real-wallet mode with real-wallet-safe explainer
  content (`app/src/state/realWalletSmithAi.ts`) — it explains the read-only
  connection and why some values aren't shown yet, and must not present fixture
  Top Pick / suggestions / positions as the user's real data.
- If a value cannot be computed yet (USD value, APY, allocation, suggestions),
  show a safe unavailable/coming-soon state — never a fixture value.

See `app/src/components/RealWalletSummary.tsx`, `app/src/pages/DashboardPage.tsx`,
and `app/src/pages/PortfolioPage.tsx`.

---

## Purpose

The wallet connection flow should help users:

- Understand why WealthSmith needs a wallet connection
- Choose a supported wallet
- Connect safely in read-only mode
- See connected wallet state in the top navigation
- Disconnect when needed
- Continue onboarding after connection
- Understand that funds stay in their wallet

The experience should be calm, clear, and non-custodial.

---

## Core Product Rule

Connecting a wallet in WealthSmith MVP is for reading wallet and portfolio data.

It is not an execution flow.

```text
Connect wallet = read balances and positions
Do not imply custody
Do not imply automatic execution
Do not imply funds can be moved
Do not request signatures for basic read-only portfolio display
```

Wallet connection allows WealthSmith to personalize:

```text
Dashboard
Portfolio
Safety Buffer
Projected Growth
Suggestions
Smith AI explanations
```

---

## Supported MVP Wallets

Approved MVP wallets:

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

- Use exact approved wallet icons.
- Wallet icon must be paired with wallet name.
- No wallet fallback icon is used for MVP.
- Missing wallet icon is an implementation issue.
- Do not use token fallback icon for wallets.

---

## When to Use

Use this pattern when:

- User clicks `Connect Wallet`.
- User starts onboarding from a no-wallet state.
- User chooses to switch from Demo Mode to real wallet mode.
- User reconnects after disconnecting.
- User opens wallet menu from the wallet pill.
- User disconnects wallet.

Do not use this pattern for:

- Transaction signing
- Swap confirmation
- Staking execution
- Buy/sell flows
- Protocol deposit/withdrawal flows
- Generic account settings
- Demo Mode selection by itself

---

## Entry Points

Wallet connection can be opened from:

```text
Top navigation: Connect Wallet
Onboarding panel: Connect Wallet
Empty portfolio state
Empty suggestions state
Demo Mode exit or switch-to-wallet state
```

Rules:

- `Connect Wallet` should be a primary CTA when no wallet is connected.
- `Try Demo Mode` may appear as a secondary CTA.
- Opening the wallet modal should not reset onboarding.
- Opening the wallet modal should not hide the existing Dashboard context permanently.

---

## Pre-Connection Header State

Before wallet connection:

```text
Try Demo Mode
Connect Wallet
```

Rules:

- `Connect Wallet` is primary.
- `Try Demo Mode` is secondary.
- Do not show wallet pill.
- Do not show personalized real-wallet portfolio values.
- Do not show real-wallet suggestions.
- If demo mode is active, show Demo Mode banner instead.

---

## Connect Wallet Modal

The wallet modal is a centered modal over the current page.

Background page is dimmed.

Example modal:

```text
Connect Your Wallet

We’ll scan your assets in read-only mode to personalize your plan.
Your funds stay in your wallet.

[Phantom]
[Solflare]
[Backpack]
```

Structure:

```text
Modal title
Close button
Read-only explanation
Wallet option list
```

Rules:

- Modal should use `components/modal.md`.
- Wallet rows should use `components/list-item.md` or `components/select-card.md`.
- Close button must be visible and accessible.
- Background content should not be interactable while modal is open.
- Focus should move into modal on open.
- Focus should return to the triggering button on close.
- Escape should close modal unless a wallet provider flow is actively in progress.
- Do not show unsupported wallets.
- Do not show wallet options without visible labels.
- Do not imply funds will move.

---

## Wallet Option Rows

Wallet option row includes:

```text
Wallet icon
Wallet name
Interactive row state
```

Example:

```text
[Phantom icon] Phantom
[Solflare icon] Solflare
[Backpack icon] Backpack
```

Rules:

- Entire row may be clickable.
- Row must be keyboard accessible.
- Hover/focus state should be visible.
- Wallet name must be visible.
- Wallet icon is decorative when visible wallet name exists.
- Do not rely on wallet icon alone.
- Do not show connect status inside the row unless provider state is known.

---

## Wallet Provider Selection

When user selects a wallet:

```text
1. Close or preserve modal depending on provider flow.
2. Start wallet provider connection.
3. Show provider-specific prompt if wallet extension/app requires it.
4. On success, update wallet state.
5. Update top navigation wallet pill.
6. Continue onboarding scan state if onboarding is active.
7. Show toast: Wallet connected.
```

Rules:

- Do not show full Smith AI suggestion loading for wallet provider connection.
- Wallet provider connection is not suggestion generation.
- If connection takes noticeable time, use a subtle pending state on the selected wallet row.
- Do not use `smith-ai-symbol-loop.json` for wallet provider connection.
- Do not mark wallet as connected until connection succeeds.
- Do not advance onboarding progress until connection state is saved.

---

## Connected Wallet State

After successful connection, the top navigation shows wallet pill.

Example:

```text
[Phantom icon] Phantom • 6fQ9
```

Rules:

- Wallet pill appears in top navigation.
- Wallet pill includes wallet icon, provider name, and shortened address.
- Wallet pill does not imply custody.
- Wallet pill does not imply signing.
- Wallet pill does not imply WealthSmith can move funds.
- Wallet pill can open a wallet menu.
- Address shortening should come from utility logic, not ad hoc UI formatting.
- Use consistent truncation format.

Recommended format:

```text
Provider • last4
```

Example:

```text
Phantom • 6fQ9
```

---

## Wallet Connected Toast

After successful connection, show a toast.

Example:

```text
Wallet connected
```

Rules:

- Toast should be short.
- Toast should not replace persistent wallet state.
- Toast should not contain private address details unless necessary.
- Toast should be dismissible.
- Toast should not block onboarding.
- Toast should be announced politely to assistive technologies.

---

## Onboarding After Wallet Connection

If onboarding is active, Smith AI should acknowledge wallet connection and start scanning holdings.

Example:

```text
Perfect — wallet connected.
I’m scanning your holdings and preparing your financial snapshot...
```

Rules:

- Onboarding panel remains open.
- Dashboard remains visible.
- Wallet pill appears in the header.
- Financial Snapshot may stay at $0 while wallet data is still loading.
- Do not show suggestions until required data exists.
- Do not show fake portfolio values while scanning.
- Advance onboarding progress only after wallet connection is saved.
- Continue to wallet data loaded state when balances are available.
- Connecting a wallet alone does not complete onboarding. `onboarding_active` remains true until the required Goal fields are saved (`goal_completed = true`); see `patterns/onboarding-with-smith-ai.md`.

After data loads:

```text
Done. I’ve updated your Financial Snapshot with your real wallet data.
You can already see your current allocation on the left.
Let’s personalize your plan around your goals and comfort with risk.
What’s your main goal right now?
```

---

## Wallet Data Loading

Wallet data may load after provider connection succeeds.

Loading stages:

```text
wallet_connected
wallet_balances_loading
wallet_balances_loaded
protocol_positions_loading
portfolio_ready
partial_data
error
```

Rules:

- Do not use Smith AI animation for basic wallet data loading.
- Use onboarding copy or subtle dashboard loading state.
- Dashboard sections can update progressively.
- Portfolio values should appear only when data is available.
- If balances load but protocol positions do not, show partial data state.
- Do not block onboarding if enough wallet data exists to continue.
- Do not double-count positions while protocol data is loading.

---

## Read-Only Mode

Wallet connection copy must clearly state read-only behavior.

Required concept:

```text
We’ll scan your assets in read-only mode.
Your funds stay in your wallet.
```

Allowed copy:

```text
I only read balances, never move funds.
```

Avoid:

```text
We will manage your funds.
We will move your assets.
We will invest for you.
Authorize WealthSmith to control your wallet.
```

Rules:

- The user should understand WealthSmith can view data but not move funds.
- If a future feature requires signing, that must be presented as a separate action.
- Do not blur read-only connection and transaction approval into one flow.

---

## Signature Rules

For MVP read-only portfolio viewing:

```text
Do not require wallet message signing.
```

Rules:

- Basic connection should not require message signing.
- Portfolio visibility should work through public wallet/account data where possible.
- Suggestion display should not require signing.
- Opening protocol pages should not require signing.
- Clicking `Manage` or suggestion cards should not request signatures.
- Later execution flows may require signatures, but those are separate from wallet connection.

If engineering chooses to require a signature for security or account ownership:

- Explain why.
- Provide Ledger-compatible flow.
- Do not block read-only visibility if product can support watch-only/read-only mode.
- Make signature copy distinct from transaction approval.
- Do not say signing lets WealthSmith move funds unless a transaction is being signed.

---

## Ledger Behavior

Ledger wallets may fail or behave differently when wallet providers require message signing.

MVP principle:

```text
Read-only connection should avoid requiring message signatures.
```

Rules:

- Ledger users should be able to view wallet/portfolio data when possible.
- Do not require message signing just to display public balances.
- If a wallet provider cannot connect Ledger in the normal flow, provide a safe fallback if product supports it.
- Do not ask users to disable security protections.
- Do not imply Ledger funds are unsupported unless confirmed by product scope.
- If signing is required for a future transaction, clearly separate that from read-only connection.
- Error messages should explain what happened and what the user can try next.

Allowed error copy:

```text
We couldn’t complete the wallet connection through this provider.
You can try another wallet, use Demo Mode, or add a read-only address if supported.
```

Avoid:

```text
Your Ledger is broken.
Your funds can’t be read.
Turn off security.
```

---

## Watch-Only / Read-Only Address Support

If product supports adding addresses without wallet connection, this should be visually distinct from connected wallet state.

Possible label:

```text
Watch-only address
```

Rules:

- Watch-only address does not imply wallet ownership.
- Watch-only address does not allow signing.
- Watch-only address can show public balances.
- Watch-only address should not show wallet provider icon unless provider is known.
- Suggestions based on watch-only data should be labeled according to product rules.
- Do not show `Connected` if user only added a watch-only address.

If watch-only address support is not in MVP, do not show this option.

---

## Wallet Menu

Clicking the connected wallet pill opens a small menu.

MVP menu item:

```text
Disconnect Wallet
```

Rules:

- Menu opens from the wallet pill.
- Menu should use `components/menu-popover.md`.
- `Disconnect Wallet` is destructive enough to use warning/error color, but does not delete funds.
- Menu should be keyboard accessible.
- Escape closes the menu.
- Clicking outside closes the menu.
- Do not hide the wallet pill behind the menu.

Example:

```text
Disconnect Wallet
```

---

## Disconnect Wallet

When user chooses `Disconnect Wallet`:

```text
1. Disconnect local wallet session.
2. Clear connected wallet state.
3. Stop using real wallet data for new calculations.
4. Update top navigation back to pre-connection actions.
5. Show toast: Wallet disconnected.
6. Preserve or clear portfolio data according to product privacy/state rules.
```

Rules:

- Disconnecting wallet does not move funds.
- Disconnecting wallet does not affect the wallet itself.
- Disconnecting wallet should not require wallet signature.
- If clearing portfolio data, do so clearly.
- Suggestions based on disconnected wallet should be removed, disabled, or marked stale according to product rules.
- Do not keep presenting disconnected data as current.
- If onboarding is active, return to wallet prompt or allow Demo Mode.

Toast:

```text
Wallet disconnected
```

---

## Wallet Disconnected State

After disconnecting:

Header returns to:

```text
Try Demo Mode
Connect Wallet
```

or, if onboarding context differs:

```text
Connect Wallet
Try Demo Mode
```

Dashboard may show:

```text
Total Portfolio Value: $0
Net Contributions: $0
Safety Buffer empty or saved-plan state
```

Rules:

- Do not show connected wallet pill.
- Do not show wallet-specific suggestions as current.
- Do not show real wallet portfolio values unless product intentionally supports last-known snapshot.
- If last-known data remains visible, clearly label it as stale/disconnected.
- Do not mix disconnected wallet data with Demo Mode.

---

## Demo Mode Relationship

Demo Mode is separate from wallet connection.

Rules:

- Demo Mode does not connect a wallet.
- Demo Mode uses sample data.
- Demo Mode suggestions are sample suggestions.
- Demo Mode banner must remain visible.
- Exiting Demo does not automatically connect a wallet.
- Connecting a wallet from Demo Mode should replace demo data with real data when available.
- Do not mix demo portfolio values with real wallet values.

---

## Error States

Common wallet errors:

```text
User rejected connection
Wallet provider not installed
Wallet provider unavailable
Wallet connection timed out
Network unavailable
Unsupported wallet
Ledger signing issue
Balance fetch failed
Protocol position fetch failed
```

Rules:

- Error copy should be calm and specific.
- Do not blame the user.
- Do not imply funds are at risk unless confirmed.
- Preserve existing onboarding state.
- Offer a next action.
- Allow retry.
- Offer Demo Mode when appropriate.

Examples:

```text
Wallet connection was cancelled.
You can try again or continue in Demo Mode.
```

```text
We couldn’t load balances from this wallet yet.
Try again, switch wallets, or continue in Demo Mode.
```

```text
This wallet is not supported in the MVP.
Use Phantom, Solflare, or Backpack.
```

---

## Loading Rules

Wallet connection should follow loading-delay rules.

```text
0–400ms:
  No loading UI.

400–800ms:
  Subtle pending state on selected wallet row if needed.

800ms+:
  Show explicit inline connecting state.

1.5s+:
  Show explanatory wallet-connection message if still waiting.
```

Rules:

- Do not use Smith AI strategy animation for wallet connection.
- Do not show fake loading if provider returns quickly.
- Do not show loading after the wallet modal closes unless data is still being fetched.
- Keep user oriented.
- If wallet provider opens an external popup, do not duplicate confusing loading states.

---

## Modal Accessibility

Rules:

- Modal must have accessible title.
- Modal should trap focus while open.
- Close button must have accessible label.
- Wallet options must be keyboard selectable.
- Escape closes modal when safe.
- Background content should be inert.
- Screen reader should understand that funds remain in wallet through visible text.
- Wallet icons should be decorative when wallet names are visible.

Example modal labels:

```text
role="dialog"
aria-modal="true"
aria-labelledby="connect-wallet-title"
```

Close button:

```text
aria-label="Close connect wallet dialog"
```

Wallet row:

```text
aria-label="Connect Phantom wallet"
```

---

## Wallet Pill Accessibility

Wallet pill should expose:

```text
Provider name
Shortened address
Menu behavior if clickable
```

Example:

```text
aria-label="Connected wallet: Phantom, address ending 6fQ9. Open wallet menu."
```

If the wallet pill opens a menu:

```text
aria-haspopup="menu"
aria-expanded="false"
```

---

## Data Contract

Example wallet state:

```json
{
  "wallet": {
    "status": "connected",
    "provider": "phantom",
    "provider_label": "Phantom",
    "address": "full_public_address",
    "address_short": "6fQ9",
    "mode": "read_only",
    "is_demo": false,
    "can_sign": false
  }
}
```

Example disconnected state:

```json
{
  "wallet": {
    "status": "disconnected",
    "provider": null,
    "address": null,
    "address_short": null,
    "mode": null,
    "is_demo": false
  }
}
```

Example connection status:

```json
{
  "wallet_connection": {
    "status": "connecting",
    "provider": "phantom",
    "started_at": "timestamp",
    "show_loading_after_ms": 800,
    "error": null
  }
}
```

Example error:

```json
{
  "wallet_connection": {
    "status": "error",
    "provider": "phantom",
    "error_code": "user_rejected",
    "message": "Wallet connection was cancelled."
  }
}
```

---

## Security and Privacy

Rules:

- Do not expose full wallet address unless user intentionally views/copies it.
- Do not store unnecessary wallet data.
- Do not show private keys or seed phrases.
- Never ask for seed phrase.
- Never ask users to paste private keys.
- Never ask users to upload wallet backup files.
- Do not claim WealthSmith has access to funds.
- Do not claim wallet is verified unless verification logic exists.
- Treat public wallet data as user-sensitive in the UI.

Required hard rule:

```text
WealthSmith should never ask for seed phrases or private keys.
```

---

## Copy Rules

Use:

```text
Connect Your Wallet
We’ll scan your assets in read-only mode.
Your funds stay in your wallet.
I only read balances, never move funds.
Wallet connected.
Wallet disconnected.
```

Avoid:

```text
Give WealthSmith access to your funds.
Authorize portfolio management.
Let us control your wallet.
We’ll move your assets.
Your funds are safe with us.
```

---

## Components Used

Primary components:

```text
components/modal.md
components/button.md
components/list-item.md
components/select-card.md
components/menu-popover.md
components/menu-item.md
components/toast.md
components/icon.md
components/logo.md
```

Related patterns:

```text
patterns/onboarding-with-smith-ai.md
patterns/dashboard-layout.md
patterns/portfolio-overview.md
patterns/suggestion-flow.md
patterns/empty-loading-error-states.md
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

- Use approved wallet list.
- Use approved wallet icons.
- Open wallet modal from Connect Wallet CTA.
- Keep modal accessible.
- Use read-only wallet copy.
- Show wallet pill after successful connection.
- Show wallet connected toast.
- Continue onboarding after connection.
- Show disconnect menu from wallet pill.
- Show wallet disconnected toast after disconnect.
- Avoid Smith AI animation for wallet connection.
- Support Demo Mode separately.
- Treat Ledger/message signing carefully.
- Keep wallet state structured.
- Keep wallet connection distinct from transaction signing.

Claude Code must not:

- Ask for seed phrase.
- Ask for private key.
- Invent wallet providers.
- Use wallet icons without labels.
- Use token fallback icon for wallets.
- Require signature for basic read-only portfolio viewing unless product explicitly requires it.
- Execute transactions from wallet connection.
- Request signature from suggestion click.
- Mix Demo Mode and real wallet data.
- Present disconnected data as current.
- Imply custody.
- Imply WealthSmith can move funds.
- Use hype or unsafe wallet copy.

---

## Do

- Make read-only behavior clear.
- Keep wallet options simple.
- Show supported wallets only.
- Use clear wallet pill after connection.
- Let users disconnect.
- Keep Demo Mode separate.
- Preserve onboarding state.
- Handle errors calmly.
- Keep portfolio and suggestions grounded in wallet state.
- Support accessible modal and menu behavior.

---

## Do Not

- Do not ask for seed phrases.
- Do not ask for private keys.
- Do not imply funds move during connection.
- Do not imply connection equals transaction approval.
- Do not force signing for read-only data if avoidable.
- Do not use Smith AI loading animation for wallet connection.
- Do not show fake connected state.
- Do not show broken wallet icons.
- Do not use wallet icon alone as identity.
- Do not mix demo and real data.

---

## Done Criteria

This pattern is implemented correctly when:

- Connect Wallet opens the modal.
- Modal shows Phantom, Solflare, and Backpack.
- Modal explains read-only mode.
- Wallet rows are accessible and labeled.
- Successful connection shows wallet pill.
- Successful connection shows `Wallet connected` toast.
- Onboarding continues into wallet scanning/data loading state.
- Wallet pill opens a menu.
- Wallet menu includes Disconnect Wallet.
- Disconnect clears connected state.
- Disconnect shows `Wallet disconnected` toast.
- Demo Mode remains separate from wallet connection.
- No signatures are required for basic read-only portfolio viewing unless explicitly product-approved.
- Ledger users are not blocked unnecessarily from read-only visibility.
- No transaction executes during connection.
- No custody implication appears anywhere in the flow.
