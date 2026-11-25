# For Vahan — swap confirm step: two things

## 1. The branch is on `main`

The execution lane is merged and pushed to `main` on the GitHub repo
(`0xashot/wealthsmith`). If you couldn't see `msp-execution-boundary` earlier,
that's why — it's no longer a branch, it's in `main`.

## 2. `/api/swap-execute/status` needs two new inputs and three new outputs

The confirm step now reports what a swap **actually did**, read from the landed
transaction rather than from the quote. That needs a small change to the status
endpoint. Everything is additive — the client treats missing fields as "couldn't
read it" and degrades to copy that says so, so nothing breaks before you deploy.

### Request — two optional query params

```
GET /api/swap-execute/status?signature=<sig>&owner=<takerPubkey>&mint=<outputMint>
```

`owner` and `mint` are public values already on the user's screen. Both or
neither: a balance delta needs an account and a mint to read it on.

### Response — three new fields

```json
{
  "state": "confirmed" | "pending" | "failed",
  "deliveredRaw": "30606060750",
  "feeLamports": "75000",
  "feeUsd": 0.0138
}
```

- **`deliveredRaw`** — base units the taker actually received. From the landed
  transaction's `meta.postTokenBalances` minus `meta.preTokenBalances`, matched
  on `owner` + `mint`. **The delta, not the balance** — the user may already have
  held some of the output token. Null when it can't be read.
- **`feeLamports`** — `meta.fee` from the same `getTransaction` call. Read for
  **both** landed states: a reverted swap moves no tokens and still charges a
  fee, and that's the screen that has to report it.
- **`feeUsd`** — the fee priced in USD, from the same Jupiter price source the
  terms use. Null when unpriced.

### Notes

- One `getTransaction` yields both figures; don't make it two round trips.
- Use **BigInt** for the balance delta. A double loses base units above 2^53 —
  about 9 billion USDC, or 9 million SOL in lamports.
- A failed read must never change `state`. The swap landed either way, and
  losing the outcome because a figure was unreadable is the tail wagging the dog.
- Only read `deliveredRaw` when `state === "confirmed"`. A revert has no delta.

My implementation is in `app/src/server/swapExecution/confirmationStatus.ts`
(`deliveredFromBalances`, `getLandedFacts`, `feeUsdFrom`) — the pure parts are
covered by fixtures SWXD-1 through SWXD-9 if you want to port the tests too.

### Ship this together with the frontend change

The two go together. If the new confirm step lands in your frontend before this
endpoint change is live, the success screen reads "Your swap succeeded. We
couldn't load the exact USDC amount received. View the transaction on Solscan
for details." and the revert screen says "A network fee was charged." with no
figure.

Those are reviewed, intentional states — the client degrades rather than
breaking, and it will never substitute the quote's estimate for the delivered
amount, because the estimate is a prediction made before the swap and slippage
means it is almost never what arrived. But they are the fallback, not the
intended screen. Deploy both and nobody sees them.

Nothing is urgent on its own: none of this is in production yet, and the current
confirm step is unaffected until you port the frontend side.
