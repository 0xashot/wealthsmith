# SOL Liquid-Staking Selector Preview Route (Step 13C)

**A dev-only internal preview route so a reviewer can visually verify the future
exact SOL staking recommendation UI — without it ever appearing in real user
flows.** It is not beta-facing and not production-facing. `productionReady = false`;
`PROTOCOL_SELECTION_IMPLEMENTED = false`.

## How to run locally

```
VITE_INTERNAL_SOL_LST_PREVIEW=true npm run dev
```

Then open the route:

```
/internal/sol-lst-preview
```

## Route gating

- **Dev-only:** `isInternalSolLstPreviewRouteEnabled()` is true ONLY when
  `import.meta.env.DEV === true` AND `VITE_INTERNAL_SOL_LST_PREVIEW === "true"`.
- **Not mounted in production user flows:** a production build has `DEV === false`,
  so the route is unreachable. A plain `npm run dev` (no env flag) also does not
  render it.
- Even if reached, `InternalPreviewGate` re-checks the same flag and renders the
  fallback (`MainApp`) otherwise.

## What it renders

Two stacked panels from the copy model (no live selector output):

1. **Disabled/blocked current state** (`getDefaultSolLstSelectorPreview()`).
2. **Future selected-state example** (`getInternalOnlySolLstSelectedPreviewExample()`),
   where **JitoSOL appears only as `INTERNAL_PREVIEW_NOT_LIVE`**.

All action buttons are **disabled** and labeled preview-only. The external
"Open official protocol page" action is disabled and never navigates.

## What it does NOT do

- does not update live suggestions;
- does not enable protocol selection;
- does not enable transactions;
- does not render in Dashboard / Portfolio / Review modal;
- does not use the QA-only score;
- does not call wallet code, the engine, the selector live flow, or fetch.

## Exact copy boundaries

- Use **"Suggested protocol to review"**.
- Always include **"WealthSmith does not move funds for you."**
- Avoid "best", "safest", "guaranteed", "risk-free", and "you should".
