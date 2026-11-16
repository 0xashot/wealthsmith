# WealthSmith

**Non-custodial portfolio guidance for Solana.**

WealthSmith reads a wallet, explains what's in it, and recommends what to do next — without ever holding funds, requesting a seed phrase, or moving money on the user's behalf.

🔗 **Live app:** [app.wealthsmith.ai](https://app.wealthsmith.ai)

---

## The idea

Most Solana portfolio tools either show you a balance table and stop, or they take custody and act for you. WealthSmith sits deliberately between the two: it does the analysis a financial advisor would do, presents one clear recommendation, and then hands the user off to the protocol to execute it themselves.

The user keeps their keys. We keep the reasoning.

**What it does**

- Connects a wallet read-only and detects live positions — native SOL, SPL and Token-2022 balances, staking, and lending positions
- Computes net contributions and portfolio value against the user's stated goal
- Tracks a **Safety Buffer** — the liquid reserve a user should hold before yield-seeking
- Generates ranked, deterministic suggestions and surfaces exactly one **Top Pick**
- Hands off to the chosen protocol with a prefilled deep link
- Explains any of the above in plain language through **Smith AI**

**What it deliberately does not do**

```
hold user funds            ask for seed phrases
control wallets            ask for private keys
move funds automatically   guarantee returns
execute trades
```

---

## Architecture

The core design constraint is a hard separation between the system that *decides* and the system that *explains*:

```
Suggestion Engine  →  deterministic product logic
Top Pick Logic     →  deterministic ranking, single selection
Protocol Logic     →  deterministic destination selection
Smith AI           →  explanation layer
UI                 →  renderer
```

Which enforces one rule:

> **AI explains. AI does not decide. UI renders. UI does not invent.**

Every recommendation is reproducible from inputs without a model in the loop. The LLM can describe a suggestion and answer questions about it, but it can never originate one, change a ranking, or invent a number. This is what makes the financial logic auditable — and it's why the engine is covered by fixture tests rather than prompt evaluation.

Market data (staking yields, stablecoin yields, market conditions) is fetched offline by refresh scripts and published as static cache artifacts, so the client never depends on a third-party API being up at render time.

---

## What's in this repository

This repo holds the **frontend application and the design system it's built on** — the full client, the suggestion engine, the product rules, and the component contracts. The backend API is a separate private service.

```
app/            React + TypeScript + Vite application
  src/
    suggestions/    deterministic suggestion engine + fixtures
    wallet/         read-only wallet and portfolio reads
    components/     UI components
    state/          application state
  scripts/          market-data refresh and cache publishing

rules/          product behavior rules — the source of truth
content/        approved copy and voice
components/     component contracts
patterns/       page and flow behavior
tokens/         design tokens
assets/         approved visual files
examples/       completed-state references
templates/      reusable object shapes
docs/           design system spec and engineering handoffs
```

**Source-of-truth order.** When documents conflict, `rules/` wins, then `content/`, then `components/`, then `patterns/`, then `tokens/`. Rules define behavior; everything downstream renders it. The full specification is in **[docs/design-system.md](docs/design-system.md)**.

---

## Running it locally

```bash
cd app
npm install
npm run dev
```

The app runs at `http://localhost:5173` and works out of the box in demo mode with no configuration.

**To connect a real wallet**, copy `app/.env.example` to `app/.env.local` and set a dedicated Solana RPC endpoint:

```bash
VITE_SOLANA_RPC_URL=https://your-rpc-provider/...
```

This is needed because keyless public RPC nodes serve `getBalance` but generally refuse `getParsedTokenAccountsByOwner`, so token balances won't read without one. `.env.example` documents every other variable, including which must never be `VITE_`-prefixed and why.

**Other commands**

```bash
npm test          # run the suggestion-engine fixture suite
npm run build     # typecheck and build
npm run tokens    # rebuild design tokens from source
```

---

## Scope

**Wallets:** Phantom · Solflare · Backpack

**Protocols:** Hubble · Jito · Jupiter · Kamino · Marinade · Meteora · Ondo · Orca · Raydium · Sanctum

Support is intentionally narrow. Protocols are added through the rules in [`rules/protocol-selection-rules.md`](rules/protocol-selection-rules.md), not ad hoc in the UI.

---

## Status

The design system and product rules are complete. The application implements live wallet connection, portfolio reads, the suggestion engine, Top Pick selection, protocol handoff, and Smith AI. Execution is out of scope by design — users act in the protocol, not in WealthSmith.

---

## License

Licensed under the [Apache License 2.0](LICENSE).
