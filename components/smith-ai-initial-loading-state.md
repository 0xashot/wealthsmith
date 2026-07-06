# Smith AI Initial Loading State

A short, premium "Smith is preparing / connecting" moment shown the **first time**
Onboarding or a Smith AI panel opens in a session, before its scripted/approved
content appears. It uses the approved `smith-ai-symbol-loop.json` animation.

It is **not** a generic app loader, and it does **not** imply live AI computation,
wallet scanning, network calls, or real data loading. It is a deterministic,
time‑bounded visual transition before **scripted, fixture‑backed** content.

---

## When to Use

- **Onboarding, first open in a session** — before the onboarding panel content
  (Smith greeting / scripted questions) is revealed.
- **A Smith AI panel, first open in a session** — before the Ask Smith AI panel
  content is revealed.

It shows **once per session** for each surface (Onboarding and Smith AI have
independent first‑open flags). It may only reappear if the whole app/session is
reset (page reload) — not on every step, not on Back/Continue, and not when a
panel is simply reopened in the same session.

## When Not to Use

- Not a generic spinner, page/route loader, or skeleton.
- Not for wallet connection/approval, portfolio refresh, saving settings, table/
  chart/card loading (see `assets/animations/animation-registry.json` → `notForUse`).
- Not on every onboarding step (that is the typing indicator — see below).
- Never as a permanent or long‑running state; it must always reveal content.

---

## Anatomy

```text
        [ 64×64 Smith AI symbol animation ]
             Smith AI getting ready
```

- Approved asset: **`assets/animations/smith-ai-symbol-loop.json`**.
- Size: **exactly 64×64px**.
- **Centered** horizontally and vertically in the Onboarding / Smith AI card body.
- Paired calm label: **"Smith AI getting ready"** (required — the animation
  registry mandates loading copy be paired with the animation).
- The panel/card shell (header) stays visible so the user sees where content will
  appear. **No chat bubble, no bordered loading container, no generic spinner, no
  extra skeleton.** Colors/spacing come from semantic tokens only.

---

## Timing

- The animation **plays through to the end at least once**; its completion event
  reveals the content (the asset is ~4.07s at 30fps, played once, `loop = false`).
- A timer set **beyond** the asset length is only a non‑blocking safety net — it
  never cuts the play‑through short, and it guarantees the state can never block
  indefinitely (e.g. if the completion event does not fire in a throttled tab).
- Reduced motion has no animation to play, so it reveals after a brief static beat.
- Timers are cleaned up on unmount; the reveal fires exactly once.

## Difference from the Typing / Writing State

- **Initial loading state** = 64×64 centered animation + label, **first open only**.
- **Typing / writing state** = the existing onboarding step transition (the
  typewriter itself + the small assistant‑position avatar). See
  `components/smith-ai-typing-indicator.md`.
- Do **not** mix the two, and do not change the writing/typing avatar rule.

---

## Reduced Motion

Respect `prefers-reduced-motion`:

- Do **not** loop the animation.
- Show the static registry fallback symbol (`assets/logo/wealthsmith-symbol.svg`)
  at 64×64px with the same label, for a brief beat, then reveal — or reveal
  content immediately.
- Keep the same layout dimensions to avoid layout shift. Avoid motion‑heavy
  transitions.

---

## Accessibility

- Container exposes a polite status: `role="status"`, `aria-live="polite"`,
  `aria-busy="true"`, with the visible label as its accessible text (do not rely
  on motion alone).
- The animation/symbol is decorative (`aria-hidden="true"`).
- **Do not move focus** to the loading state and do not trap focus. Normal panel
  focus behavior resumes after content is revealed (the Smith AI panel keeps its
  Close button focusable during loading).

---

## Implementation

- Reusable component: `app/src/components/SmithInitialLoadingState.tsx`
  (props: `size = 64`, `onComplete`, `label`).
- The Lottie player (`SmithLoopLottie.tsx`) is **lazy‑loaded** so `lottie-web` is
  only fetched when the animation actually plays (never for reduced‑motion users,
  and not in the main bundle).
- Session first‑open flags live in `app/src/state/sessionFlags.ts`
  (`onboardingIntroShown`, `smithAiIntroShown`).
- No new animation asset, no hardcoded colors, semantic tokens for spacing/type.

## Related

- `assets/animations/animation-registry.json` — `smith-ai-symbol-loop` (`approvedUse`
  includes `smith-ai-loading`; reduced‑motion `static-fallback`).
- `components/smith-ai-typing-indicator.md` — the distinct typing/writing state.
- `patterns/onboarding-with-smith-ai.md`, `rules/smith-ai-rules.md`.
