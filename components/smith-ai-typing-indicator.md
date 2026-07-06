# Smith AI Typing Indicator

A small "Smith is writing…" indicator shown for a brief, deterministic moment
while a Smith AI surface prepares/reveals its next message (for example between
onboarding questions). It gives a conversational feel without implying live AI.

---

## Purpose

Communicate a short "Smith AI is writing" beat before the next scripted Smith AI
message appears.

It is **not** a generic loading spinner and is **not** a page loader.

> Distinct from the **first‑open** Smith AI loading state (a centered 64×64
> `smith-ai-symbol-loop.json` "Smith AI getting ready" moment shown once per
> session before Onboarding / a Smith AI panel reveals its content) — see
> [`components/smith-ai-initial-loading-state.md`](./smith-ai-initial-loading-state.md).
> Do not mix the two: this typing indicator is the per‑message writing beat.

---

## When to Use

- Between onboarding questions, after the user continues, before the next Smith AI
  message is revealed.
- Other Smith AI surfaces when Smith AI is preparing/revealing a message.

## When Not to Use

- Generic page/route loading.
- Wallet connection, wallet approval, portfolio refresh, saving settings, table or
  chart loading (see the animation registry `notForUse` list).
- Anywhere it would imply live AI computation for a scripted/deterministic flow.
- As a permanent or long-running state.

---

## Anatomy

```text
[ 32×32 Smith AI animated logo ]  Smith is writing…  • • •
```

- Animated logo (left), fixed at **32×32px**.
- Short visible text: **"Smith is writing…"**.
- Typing dots (three dots that pulse/bounce in sequence), sitting near the text
  or inside the assistant message bubble — subtle, not distracting, decorative
  (`aria-hidden`), color from semantic tokens.

## Conversational onboarding — no chat bubbles (scoped)

Onboarding Smith AI messages use a Gemini-style assistant layout, **not** chat
bubbles:

- The Smith AI symbol sits on the left where the assistant message starts.
- The message text renders **directly on the panel surface** — no bubble, no
  bordered container, no gray/blue background, no container shadow.

In the current onboarding chat the writing cue is the **typewriter itself** — the
whole approved message for the step is written out one character at a time — and
the assistant avatar is a **static `sparcle.svg` icon in `color.action.primary`**.
The Smith logo and the looping `smith-ai-symbol-loop.json` animation are **not**
used in onboarding.

- No bubble; the message text renders on the panel surface using a single type
  token and `color.text.primary`.
- While writing, expose an accessible status: **"Smith AI is writing."**
  (`role="status"` + `aria-live="polite"`, visually hidden is acceptable).
- Reduced motion: no typewriter — show the full message immediately (the avatar is
  static regardless).

The looping animated logo remains available for other Smith AI surfaces
(suggestion-building / insight-generation waits, per the animation registry); it
is simply not used for the onboarding chat.

This applies to onboarding Smith AI messages only for now. It does **not** replace
the static Smith icon globally, does **not** make Smith AI live or generative, and
the flow remains scripted and deterministic. Under reduced motion: static icon and
message shown directly, no looping animation, no character streaming. User replies
use Choice Chips (`components/choice-chip.md`); do not create user chat bubbles.

---

## Asset

- Uses the existing approved animation asset **only**:

```text
assets/animations/smith-ai-symbol-loop.json
```

- This is the Smith AI animated logo (Lottie vector loop). Do not create, import,
  or substitute any other animation asset.
- Rendered at **exactly 32×32px**. Do not stretch or crop (preserve aspect ratio;
  the source is square).
- Approved use per `assets/animations/animation-registry.json` (Smith AI
  writing/preparing/revealing a message); this indicator adds the onboarding
  message-reveal moment to that approved family.

---

## Behavior

- Duration is short and deterministic (~400–700ms). The flow is scripted, so the
  indicator is a UI beat, not a real computation wait.
- It must never block critical actions indefinitely; Back / Continue / Skip /
  Finish and validation remain available and are not hidden behind the animation.
- Do not imply live AI computation. The onboarding conversation is deterministic
  and source-of-truth-driven; there is no AI API call.
- One indicator at a time; it is replaced by the revealed message.

---

## Reduced Motion

- When `prefers-reduced-motion: reduce` is enabled, show the **static** Smith
  symbol (`assets/logo/wealthsmith-symbol.svg`) at 32×32 instead of the looping
  animation — no continuous animation (consistent with `rules/smith-ai-rules.md`).
- The brief writing beat may remain, but nothing loops or moves for reduced-motion
  users.

---

## Accessibility

- Container uses `role="status"` (polite live region).
- Accessible label: **"Smith AI is writing."**
- The animated/static logo is decorative (`aria-hidden`); meaning comes from the
  accessible label and visible text.
- Must not trap focus or steal focus.

---

## Token Usage

- Text: `typography.body.sm` (or the surrounding message text scale), `color.text.secondary`.
- Spacing: tokenized inline gap between the logo and text.
- No shadows; no raw values.
- The animated logo size (32×32) is a fixed asset dimension (documented raw value,
  like other fixed asset sizes), not a color/spacing token.

---

## Do

- Use the approved `smith-ai-symbol-loop.json` asset at 32×32.
- Keep the beat short and deterministic.
- Provide the reduced-motion static fallback.
- Keep actions and validation available.

## Do Not

- Do not use it as a generic spinner or page loader.
- Do not import a different animation asset.
- Do not stretch/crop the logo or change its 32×32 size in this context.
- Do not imply live AI for a scripted flow.
- Do not block the user indefinitely.

---

## Done Criteria

- Renders `smith-ai-symbol-loop.json` at exactly 32×32 during Smith AI writing
  moments only.
- Shows "Smith is writing…" with the accessible label "Smith AI is writing."
- Falls back to the static Smith symbol under reduced motion.
- Never blocks Back / Continue / validation; short, deterministic duration.
