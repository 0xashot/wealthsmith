# Animation Assets

This folder contains approved WealthSmith animation assets.

Animations are product assets used for specific loading, generation, or state-transition moments.

Animations should be used carefully because motion affects trust, accessibility, performance, and perceived product meaning.

---

## Purpose

Use animation assets to communicate that WealthSmith is actively working on a specific process.

Animations should help users understand:

- Something is happening
- The process is temporary
- The app has not failed
- The user should wait
- The state belongs to Smith AI, suggestions, or another approved product context

Animations should support clarity and calmness.

Animations should not make financial results feel magical, guaranteed, or automated.

---

## Folder Structure

Current MVP structure:

```text
assets/animations/
  README.md
  animation-registry.json
  smith-ai-symbol-loop.json
```

Recommended static fallback:

```text
assets/logo/wealthsmith-symbol.svg
```

The static fallback is used when reduced motion is enabled or animation fails to load.

---

## Approved MVP Animation

### Smith AI Symbol Loop

Filename:

```text
smith-ai-symbol-loop.json
```

Path:

```text
assets/animations/smith-ai-symbol-loop.json
```

Type:

```text
Lottie JSON animation
```

Use for:

```text
Smith AI loading
Building suggestions
Generating strategy insights
Preparing suggestion context
```

Primary UI example:

```text
Building Your Suggestions...
We are checking your plan and wallet balance to find the best next actions.
No action will be taken automatically.
```

Rules:

- Use only for Smith AI or suggestion-building states.
- Always pair with clear loading copy.
- Always include reassurance when relevant.
- Do not use as a generic spinner.
- Do not use for wallet connection.
- Do not use for portfolio refresh.
- Do not use for saving settings.
- Do not use for chart/table/card loading.
- Do not imply WealthSmith is taking action automatically.
- Do not imply suggestions are guaranteed or final.
- Do not imply investment execution.

---

## Naming Rules

Use descriptive, kebab-case filenames.

Good:

```text
smith-ai-symbol-loop.json
smith-ai-building-suggestions.json
```

Avoid:

```text
animation.json
loader.json
logo-animation.json
final-loop.json
new-animation.json
Smith loop.json
```

Uploaded source files may have temporary names, but repository files should use stable production names.

Recommended rename:

```text
Smith loop.json -> smith-ai-symbol-loop.json
```

---

## Animation vs Logo

The animated Smith AI symbol uses the WealthSmith/Smith mark, but it is not a logo asset.

Store it in:

```text
assets/animations/
```

not:

```text
assets/logo/
```

Why:

- Logo assets identify the brand.
- Animation assets communicate a temporary process state.
- The same symbol can appear in both, but the file purpose is different.

Use static logo/symbol assets from:

```text
assets/logo/
```

Use animation assets from:

```text
assets/animations/
```

---

## Animation vs Loading Indicator

Animations and loading indicators are related but different.

### Animation Asset

A visual Lottie/JSON file.

Example:

```text
smith-ai-symbol-loop.json
```

### Loading Indicator Component

The UI component that renders loading state, copy, accessibility behavior, reduced-motion behavior, and layout.

See:

```text
components/loading-indicator.md
```

Rules:

- The animation asset does not decide when loading starts.
- The animation asset does not decide when loading ends.
- Parent state controls loading.
- The loading component decides how the animation is displayed.
- The animation must be paired with accessible loading text.

---

## Approved Use Cases

Use `smith-ai-symbol-loop.json` for these MVP states:

```text
Building suggestions
Generating Smith AI strategy insights
Preparing personalized suggestion context
Loading Smith AI recommendation explanation
```

Allowed copy examples:

```text
Building Your Suggestions...
```

```text
Smith AI is preparing your insights...
```

```text
Generating explanation...
```

```text
We are checking your plan and wallet balance to find the best next actions.
```

```text
No action will be taken automatically.
```

---

## Not Approved Use Cases

Do not use `smith-ai-symbol-loop.json` for:

```text
Connecting wallet
Waiting for wallet approval
Refreshing portfolio
Loading chart data
Loading table rows
Saving settings
Adding watch-only address
Submitting a form
Generic app loading
Generic spinner replacement
Success animation
Error animation
Celebration animation
```

Use:

```text
components/loading-indicator.md
components/skeleton.md
components/progress-bar.md
components/toast.md
components/alert.md
```

depending on the state.

---

## Reduced Motion

Animations must respect reduced motion.

When reduced motion is enabled:

- Do not autoplay the loop.
- Show a static fallback instead.
- Use the static WealthSmith symbol.
- Keep loading copy visible.
- Keep the same layout dimensions to avoid layout shift.

Static fallback:

```text
assets/logo/wealthsmith-symbol.svg
```

Recommended behavior:

```text
prefers-reduced-motion: reduce -> render static symbol
```

Do not remove the loading message.

---

## Accessibility Rules

Animations must support accessibility by default.

Requirements:

- Animation should be decorative when loading copy is visible.
- Loading text must be available to assistive technologies.
- Do not rely on motion alone.
- Use `aria-busy` on the loading region when appropriate.
- Use `role="status"` or `aria-live="polite"` when helpful.
- Do not autoplay aggressive motion.
- Respect reduced motion.
- Do not trap focus.
- Do not move focus to the animation.
- Do not expose internal animation layers to screen readers.

Recommended behavior:

```text
Animation: aria-hidden="true"
Loading container: aria-busy="true"
Loading text: role="status"
```

Example accessible label:

```text
Building your suggestions. No action will be taken automatically.
```

---

## Performance Rules

Lottie JSON files must be tested before production use.

Check:

- File size
- Render performance
- Mobile performance
- Battery impact
- Loop smoothness
- Load time
- Fallback behavior
- Compatibility with the chosen Lottie renderer

Rules:

- Keep animation lightweight.
- Avoid unnecessary embedded images when possible.
- Avoid excessive frame count.
- Avoid large canvas sizes unless needed.
- Do not load animation before it is needed.
- Consider lazy-loading animation assets.

The current Smith AI symbol loop is acceptable for MVP if engineering confirms size and rendering performance.

---

## Lottie JSON Rules

Lottie JSON files should be treated as production assets.

Requirements:

- Use stable filenames.
- Store in `assets/animations/`.
- Do not edit JSON manually unless necessary and reviewed.
- Do not store experimental animation files in production paths.
- Do not include external network dependencies.
- Do not use unsafe scripts.
- Test with the production Lottie renderer.
- Confirm the animation loops cleanly.
- Confirm the first frame is acceptable as a static fallback if needed.

---

## Embedded Image Assets

Some Lottie files may contain embedded image assets.

Rules:

- Embedded assets are allowed for MVP when needed.
- Engineering should verify file size and render performance.
- Prefer vector shape layers for future animations if practical.
- Do not reference external image URLs.
- Do not allow broken embedded images.
- Do not use low-resolution embedded images that look blurry at intended size.

---

## Content Rules

Animation must always be paired with clear text.

Good:

```text
Building Your Suggestions...
We are checking your plan and wallet balance to find the best next actions.
No action will be taken automatically.
```

Good:

```text
Smith AI is preparing your insights...
```

Avoid:

```text
Finding the best investment...
Maximizing your returns...
Optimizing profits...
AI magic in progress...
```

Do not use animation copy that implies guaranteed returns, automatic execution, or investment certainty.

---

## Financial and Wallet Language Rules

Animation copy must be precise.

Allowed:

```text
Building suggestions
Preparing insights
Checking your plan
Checking wallet balance
Finding next actions
No action will be taken automatically
```

Avoid:

```text
Investing for you
Executing strategy
Guaranteeing results
Finding the best return
Securing your funds
Moving assets
Auto-investing
```

Do not imply WealthSmith can move funds, sign transactions, or execute financial actions unless the product actually supports that action and the flow clearly explains it.

---

## Smith AI Rules

The Smith AI animation supports Smith AI state.

Rules:

- Animation does not generate Smith AI reasoning.
- Animation does not decide suggestions.
- Animation does not decide Top Pick.
- Animation does not decide wallet validity.
- Animation does not decide risk or safety.
- Parent Smith AI orchestration controls the state.
- Suggestion Engine and deterministic logic produce the structured output.
- Smith AI explains, but does not own deterministic financial logic.

During onboarding, Smith AI remains open.

---

## Demo Mode Rules

The animation may appear in Demo Mode if suggestions are being built from sample data.

Rules:

- Demo Mode must be clearly indicated elsewhere.
- Do not imply demo suggestions are based on the user’s real wallet.
- Do not mix demo and real data without clear labeling.
- The animation should not change for Demo Mode.

Use:

```text
components/announcement.md
```

for Demo Mode visibility.

---

## Implementation Guidance

Recommended component usage:

```text
<LoadingIndicator
  variant="smith-ai"
  animation="smith-ai-symbol-loop"
  title="Building Your Suggestions..."
  description="We are checking your plan and wallet balance to find the best next actions."
  reassurance="No action will be taken automatically"
/>
```

Rules:

- Parent state controls whether this appears.
- Parent state controls when it disappears.
- Animation key should come from `animation-registry.json`.
- Do not import animation by guessed path when registry is available.
- Use static symbol fallback for reduced motion.

---

## Do

- Use this animation for Smith AI/suggestion-building states.
- Store the JSON file in `assets/animations/`.
- Rename source file to `smith-ai-symbol-loop.json`.
- Pair animation with clear loading copy.
- Include “No action will be taken automatically” where relevant.
- Respect reduced motion.
- Use static `wealthsmith-symbol.svg` as fallback.
- Test file size and rendering performance.
- Reference the animation from `animation-registry.json`.

---

## Do Not

- Do not use this animation as a generic spinner.
- Do not use it for wallet connection.
- Do not use it for portfolio refresh.
- Do not use it for table/chart/card loading.
- Do not use it as a success or celebration animation.
- Do not rely on motion alone.
- Do not imply guaranteed returns.
- Do not imply custody or automatic execution.
- Do not imply Smith AI creates deterministic financial logic.
- Do not store animation files in `assets/logo/`.
- Do not keep temporary names like `Smith loop.json` in the repo.
