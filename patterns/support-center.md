# Support Center

This pattern defines the WealthSmith Support page.

The Support page gives users a structured place to search FAQ content, read canonical help answers, ask Smith AI for contextual explanations, and contact the WealthSmith team when they need human support.

Support must be calm, clear, safe, and privacy-aware.

---

## Purpose

The Support page should help users:

- Find answers to common WealthSmith questions.
- Understand wallet connection and read-only behavior.
- Learn what WealthSmith supports in the MVP.
- Understand Demo Mode.
- Understand non-custodial behavior.
- Contact the team if FAQ and Smith AI are not enough.
- Ask Smith AI for contextual explanation without replacing canonical support content.

Support should reduce confusion without creating legal, financial, or security risk.

---

## Core Product Rule

FAQ content is canonical.

Smith AI can explain support topics, but it must not invent policy, pricing, wallet support, protocol support, security behavior, or product capabilities.

```text
FAQ / support content = canonical source
Smith AI = contextual explanation layer
Contact Us = human/support follow-up
UI = renderer
```

The Support page must not invent:

- Supported wallets
- Supported chains
- Supported protocols
- Pricing / free-tier terms
- Security guarantees
- Custody claims
- Execution capabilities
- Future roadmap promises
- Legal/financial advice

---

## When to Use

Use this pattern when:

- User opens the Support nav tab.
- User searches help articles or FAQ content.
- User expands FAQ answers.
- User asks Smith AI a support-related question.
- User opens Contact Us.
- User submits a support message.
- User needs wallet/privacy/non-custodial clarification.

Do not use this pattern for:

- In-app transaction execution
- Wallet signing flows
- Strategy suggestion rendering
- Onboarding questions
- Goal editing
- Portfolio position tables
- Marketing landing pages

---

## Primary Layout

Desktop layout:

```text
Top navigation:
  WealthSmith logo
  Dashboard / Portfolio / Goal / Support
  Wallet pill
  Ask Smith AI button

Left content:
  Page title: Support
  Search input
  FAQ sections
  Accordion items
  Contact Us entry point

Right content:
  Ask Smith AI panel when open
```

Rules:

- Support nav item is active.
- FAQ content is the main left-side content.
- Ask Smith AI can appear on the right.
- Contact Us opens as a modal.
- Page remains readable with or without Ask Smith AI open.
- Search should filter FAQ/help content, not hallucinate new answers.

---

## Page Sections

Recommended MVP sections:

```text
Getting Started
Wallet
Demo Mode
Suggestions
Safety Buffer
Portfolio
Account / Billing
Contact Us
```

Initial FAQ examples from product screens:

```text
Getting Started
  What is WealthSmith?
  Which blockchain and assets does WealthSmith support?
  What does the Free Tier include?
  Can I try the personalized plan without connecting my crypto wallet?

Wallet
  Is WealthSmith custodial? Do you hold my crypto or private keys?
  What permissions does WealthSmith request when I connect my wallet?
  Which wallets does WealthSmith support?
  What happens if I don’t want to connect my wallet?
```

Rules:

- FAQ categories should be stable.
- Answers should be maintained as content, not hardcoded into arbitrary components.
- FAQ content should use approved canonical answers where available.
- Do not generate support answers dynamically unless Smith AI clearly labels them as explanation.

---

## Search Behavior

Search input placeholder:

```text
Search help articles or keywords
```

Rules:

- Search should filter FAQ/help content.
- Search should search titles and answer content.
- Search results should preserve category context when useful.
- Empty search should show default FAQ sections.
- No-result state should offer Contact Us and Ask Smith AI.
- Search should not call Smith AI unless the user explicitly asks Smith AI.
- Search should not invent answers.
- Search should debounce input.
- Do not show loading for fast local filtering.

No-result example:

```text
No help articles found
Try another keyword, ask Smith AI, or contact us.
```

---

## FAQ Accordion Behavior

FAQ items use accordion behavior.

Closed item:

```text
What is WealthSmith?
[chevron-down]
```

Open item:

```text
Can I try the personalized plan without connecting my crypto wallet?
[chevron-up]

Yes. WealthSmith supports Demo Mode so you can preview a personalized plan and see how Smith AI insights work without connecting a wallet.
```

Rules:

- Accordion title must be visible.
- Expanded answer must appear directly under the title.
- Use one or many expanded items depending on product choice.
- Expanded FAQ card should be visually clear.
- Chevron icon should reflect expanded/collapsed state.
- Do not rely on icon alone to communicate state.
- FAQ answer text should be canonical.
- FAQ answer should not contain unsupported claims.

---

## Canonical FAQ Content Rules

FAQ answers must be reviewed and treated as product content.

Rules:

- Keep answers concise.
- Use beginner-friendly language.
- Avoid hype.
- Avoid guarantees.
- Avoid legal/financial advice.
- Avoid unsupported roadmap promises.
- Avoid broad security claims.
- Avoid implying custody or execution.
- Never ask for private keys or seed phrases.
- When product scope changes, update FAQ content and support rules together.

Good support language:

```text
WealthSmith reads wallet balances and positions so it can personalize your dashboard and suggestions.
Your funds stay in your wallet.
```

Avoid:

```text
Your funds are completely safe.
We guarantee returns.
We manage your portfolio for you.
Send us your seed phrase so we can help.
```

---

## FAQ Content Source

Recommended content structure:

```json
{
  "category": "wallet",
  "items": [
    {
      "id": "is-wealthsmith-custodial",
      "question": "Is WealthSmith custodial? Do you hold my crypto or private keys?",
      "answer": "No. WealthSmith is non-custodial. We do not hold your crypto or private keys. Wallet connection is used to read balances and positions so we can personalize your plan."
    }
  ]
}
```

Rules:

- FAQ IDs should be stable.
- Questions should be user-facing.
- Answers should be canonical.
- UI renders the content.
- Smith AI may cite or summarize canonical content but should not replace it.

---

## Important FAQ Topics

The Support page should include canonical answers for these MVP topics:

```text
What is WealthSmith?
Which blockchain and assets does WealthSmith support?
What does the Free Tier include?
Can I try without connecting a wallet?
What is Demo Mode?
Is WealthSmith custodial?
Do you hold my crypto or private keys?
What permissions are requested when I connect my wallet?
Which wallets are supported?
What happens if I do not connect a wallet?
How are suggestions generated?
Does WealthSmith execute transactions automatically?
What is the Safety Buffer?
What is Top Pick?
How does WealthSmith handle staked assets and yield strategies?
How do I contact support?
```

Rules:

- If an answer depends on pricing, supported assets, protocol availability, or roadmap, it must come from canonical content.
- Do not let Smith AI invent these answers from memory.
- Do not include outdated support information.

---

## Contact Us Entry Point

Support page should provide a way to contact the team.

Possible entry points:

```text
Contact Us button
No-result search state
FAQ footer
Ask Smith AI fallback
```

Rules:

- Contact Us opens a modal.
- Contact Us should not require wallet connection.
- Contact Us should not ask for seed phrases, private keys, or sensitive wallet secrets.
- Contact Us should not be used to request transaction execution.
- Contact form should be short.

---

## Contact Us Modal

Modal structure:

```text
Contact Us

Your Email
[input]

Description
[textarea]

Cancel
Send Message
```

Rules:

- Modal should use `components/modal.md`.
- Background page is dimmed.
- Focus moves into modal when opened.
- Focus returns to trigger after close.
- Close button must be visible and accessible.
- Cancel closes modal without sending.
- Send Message validates the form and submits.
- Do not show full-page loading for submission.
- Use button-level pending state if needed.
- Show success or error toast after submission.

---

## Contact Form Fields

Required fields:

```text
Your Email
Description
```

Rules:

- Email must be valid format.
- Description must not be empty.
- Description should support multi-line text.
- Do not require wallet address.
- Do not require connected wallet.
- Do not request private keys, seed phrases, or wallet backup files.
- If user includes sensitive secrets, product should avoid storing/displaying them where possible and should warn users not to share secrets.

Recommended helper/safety copy:

```text
Do not include seed phrases, private keys, or passwords.
```

---

## Contact Form Validation

Good validation copy:

```text
Enter your email so we can reply.
```

```text
Describe what you need help with.
```

```text
Enter a valid email address.
```

Avoid:

```text
Invalid.
Wrong.
Bad email.
```

Rules:

- Validation appears near field.
- Do not clear user’s message on validation error.
- Do not blame user.
- Keep modal open on validation error.

---

## Contact Form Submission

When user clicks Send Message:

```text
1. Validate email and description.
2. Submit support request.
3. Show button-level pending state if needed.
4. On success, close modal and show toast.
5. On error, keep modal open and show recoverable error.
```

Success toast:

```text
Message sent
```

Error copy:

```text
We couldn’t send your message right now.
Your message is still here. Try again in a moment.
```

Rules:

- Do not show loading for fast submission.
- Do not lose typed message on error.
- Do not include wallet data automatically unless product explicitly says so and user consents.
- Do not send private keys or seed phrases.

---

## Ask Smith AI on Support Page

The Support page may show Ask Smith AI on the right.

Header:

```text
Ask Smith AI
```

Panel may include:

```text
Smith response
Feedback actions
Quick actions
Prompt input
Safety note
```

Safety note:

```text
Smith AI can make mistakes. Check important info.
```

Rules:

- Ask Smith AI can explain FAQ topics.
- Ask Smith AI can help users find relevant support articles.
- Ask Smith AI can summarize canonical FAQ answers.
- Ask Smith AI should not invent policy or pricing.
- Ask Smith AI should not claim unsupported wallet/protocol support.
- Ask Smith AI should not provide seed phrase/private-key handling instructions beyond “never share them.”
- Ask Smith AI should not execute account actions.
- Ask Smith AI should direct to Contact Us when human follow-up is needed.

---

## FAQ vs Smith AI

FAQ content and Smith AI have different roles.

```text
FAQ = canonical product answer
Smith AI = contextual explanation and navigation help
Contact Us = human/support follow-up
```

Rules:

- If FAQ and Smith AI disagree, FAQ/canonical content wins.
- Smith AI should prefer retrieval from support content when answering support questions.
- Smith AI should say when it is unsure.
- Smith AI should route to Contact Us for account-specific or unresolved issues.
- Smith AI should not replace product support policy.

---

## Quick Actions in Ask Smith AI

Quick actions should be contextual and safe.

Examples:

```text
Rebalance now
Review suggested trades
Keep exposure
```

On Support page, better support quick actions may include:

```text
Explain wallet connection
Show supported wallets
Contact support
Explain Demo Mode
```

Rules:

- Quick actions must be grounded in available state or support content.
- Quick actions must not execute transactions.
- Quick actions must not request wallet signatures.
- Quick actions must not override FAQ content.
- If a quick action relates to financial suggestions, it should reference existing Suggestion Engine data.

---

## Security and Privacy Rules

Hard rules:

```text
Never ask for seed phrases.
Never ask for private keys.
Never ask users to upload wallet backup files.
Never ask users to share passwords.
Never imply WealthSmith can recover a private wallet.
Never imply WealthSmith holds user funds.
```

Contact/support copy should remind users:

```text
Do not include seed phrases, private keys, or passwords.
```

Rules:

- Treat email and support description as user-sensitive.
- Do not expose wallet addresses unnecessarily.
- Do not attach wallet data to support request without product-approved consent.
- Do not show private support messages in public/shared views.

---

## Wallet Support Content Rules

Wallet FAQ should reinforce:

```text
WealthSmith is non-custodial.
Wallet connection is used to read balances and positions.
Funds stay in the user’s wallet.
For MVP, supported wallets are Phantom, Solflare, and Backpack.
Basic portfolio viewing should not require transaction signing.
```

Rules:

- Do not imply WealthSmith can move funds.
- Do not imply connecting wallet approves trades.
- Do not imply wallet provider support beyond MVP list.
- Do not ask users to disable security protections.
- Ledger behavior should be handled carefully and not overpromised.

---

## Demo Mode Support Content Rules

Demo Mode FAQ should explain:

```text
Demo Mode lets users explore WealthSmith with sample data.
Demo Mode does not use real wallet data.
Demo suggestions are sample suggestions.
Users can exit Demo Mode and connect a wallet.
```

Rules:

- Do not call demo data personalized real wallet data.
- Do not mix demo and real states.
- Demo Mode answers should match product UI labels.

---

## Suggestion Support Content Rules

Suggestion FAQ should explain:

```text
Suggestions are generated from structured product logic.
Smith AI explains suggestions.
Top Pick is selected by deterministic Top Pick Logic.
No action is taken automatically.
MVP suggestion clicks open protocol pages in new tabs.
```

Rules:

- Do not imply Smith AI invents financial logic.
- Do not imply WealthSmith executes transactions.
- Do not imply guaranteed returns.
- Do not imply APY is guaranteed.
- Do not imply protocol suggestions are endorsements beyond product logic.

---

## Loading Behavior

Support page loading should be lightweight.

Rules:

- Do not show loading for fast local FAQ search.
- Do not show loading for opening/closing accordions.
- Do not show Smith AI animation for FAQ loading.
- Use subtle pending state for Contact Us submission if needed.
- Use skeletons only if FAQ content is fetched remotely and takes noticeable time.
- Use Ask Smith AI loading only inside the Ask Smith AI panel if response generation takes noticeable time.
- Do not use `smith-ai-symbol-loop.json` for Contact Us form submission.

---

## Empty States

### Search No Results

```text
No help articles found
Try another keyword, ask Smith AI, or contact us.
```

Rules:

- Keep search term visible.
- Offer a next action.
- Do not invent results.

### No FAQ Content

```text
Support content is unavailable right now.
You can still contact us.
```

Rules:

- Provide Contact Us.
- Do not show fake FAQ items.
- Keep Ask Smith AI available only if it can answer from reliable sources.

---

## Error States

### FAQ Load Error

```text
We couldn’t load support articles right now.
Try refreshing, or contact us.
```

### Contact Submission Error

```text
We couldn’t send your message right now.
Your message is still here. Try again in a moment.
```

### Smith AI Support Error

```text
I couldn’t answer that right now.
You can search support articles or contact us.
```

Rules:

- Keep the page usable.
- Do not clear user input on error.
- Do not blame the user.
- Do not imply wallet/funds are affected.

---

## Data Contract

FAQ category example:

```json
{
  "id": "wallet",
  "title": "Wallet",
  "items": [
    {
      "id": "custodial-private-keys",
      "question": "Is WealthSmith custodial? Do you hold my crypto or private keys?",
      "answer": "No. WealthSmith is non-custodial. We do not hold your crypto or private keys. Wallet connection is used to read balances and positions so we can personalize your plan.",
      "tags": ["wallet", "custody", "private keys", "security"]
    }
  ]
}
```

Support search state:

```json
{
  "support_search": {
    "query": "wallet",
    "status": "ready",
    "result_count": 4
  }
}
```

Contact form state:

```json
{
  "contact_form": {
    "email": "",
    "description": "",
    "status": "idle",
    "errors": {}
  }
}
```

Contact submission state:

```json
{
  "contact_submission": {
    "status": "submitting",
    "show_loading_after_ms": 800,
    "error": null
  }
}
```

---

## Components Used

Primary components:

```text
components/input.md
components/accordion.md
components/modal.md
components/button.md
components/card.md
components/toast.md
components/alert.md
components/menu-popover.md
components/icon.md
components/loading-indicator.md
```

Related patterns:

```text
patterns/dashboard-layout.md
patterns/wallet-connection.md
patterns/suggestion-flow.md
patterns/empty-loading-error-states.md
```

Assets:

```text
assets/logo/wealthsmith-full-lockup.svg
assets/logo/wealthsmith-symbol.svg
assets/icons/ui/chevron-down.svg
assets/icons/ui/chevron-up.svg
assets/icons/ui/close.svg
assets/icons/ui/more.svg
assets/icons/ui/info.svg
```

---

## Accessibility

Rules:

- Page title should be semantic heading.
- FAQ section headings should be semantic headings.
- Search input must have accessible label.
- Accordion buttons must expose expanded/collapsed state.
- Accordion content should be associated with its trigger.
- Contact Us modal must use dialog semantics.
- Modal must trap focus while open.
- Close button must have accessible label.
- Form fields must have visible labels.
- Validation errors must be associated with fields.
- Toasts should be announced politely.
- Ask Smith AI panel close button must have accessible label.
- Do not rely on chevron icon alone.
- Do not rely on color alone.
- Respect reduced motion.

Accordion example:

```text
aria-expanded="true"
aria-controls="faq-demo-mode-answer"
```

Modal example:

```text
role="dialog"
aria-modal="true"
aria-labelledby="contact-us-title"
```

Search label:

```text
aria-label="Search support articles"
```

---

## Responsive Behavior

### Desktop

- FAQ/search content on the left.
- Ask Smith AI panel on the right when open.
- Contact Us modal centered.
- Top navigation remains stable.

### Tablet

- Ask Smith AI may become drawer or stacked panel.
- FAQ items remain full-width.
- Contact modal remains centered or near full-width with margins.

### Mobile

- Single-column layout.
- Search input full-width.
- FAQ accordions full-width.
- Ask Smith AI opens as overlay/drawer.
- Contact modal becomes full-width sheet or modal with safe margins.
- Buttons should be easy to tap.
- Avoid hover-only interactions.

---

## Copy Rules

Use:

```text
Support
Search help articles or keywords
Getting Started
Wallet
Contact Us
Your Email
Description
Cancel
Send Message
Smith AI can make mistakes. Check important info.
```

Avoid:

```text
Guaranteed support response
We can recover your wallet
Send your private key
Your funds are safe with us
We execute trades for you
```

FAQ answer tone:

- Clear
- Direct
- Beginner-friendly
- Non-custodial
- Non-hype
- Specific to product capability

---

## Claude Code Rules

Claude Code should:

- Render FAQ content from structured content data.
- Use canonical answers.
- Filter FAQ content locally when available.
- Use accordion component for FAQ items.
- Use Contact Us modal for support messages.
- Validate email and description.
- Preserve form input on error.
- Keep Ask Smith AI separate from canonical FAQ content.
- Route uncertain/user-specific support questions to Contact Us.
- Keep wallet/private-key safety rules hardcoded as constraints.
- Use approved components and icons.
- Preserve accessibility.

Claude Code must not:

- Invent FAQ answers.
- Invent pricing or free-tier details.
- Invent supported wallets, chains, protocols, or assets.
- Ask for seed phrases.
- Ask for private keys.
- Ask for wallet backup files.
- Claim WealthSmith can recover a wallet.
- Claim WealthSmith holds funds.
- Claim WealthSmith executes transactions automatically.
- Use Smith AI as canonical support policy.
- Clear contact form input on submission error.
- Use Smith AI animation for Contact Us submission.
- Hide Contact Us when FAQ search returns no results.

---

## Do

- Keep FAQ answers canonical.
- Make search simple and predictable.
- Let users expand/collapse FAQ answers.
- Provide Contact Us for unresolved issues.
- Keep Contact Us form short.
- Warn users not to share secrets.
- Let Smith AI explain support content.
- Route uncertain topics to Contact Us.
- Keep Support page usable with Ask Smith AI open.
- Preserve accessibility.

---

## Do Not

- Do not make Support a generic chatbot only.
- Do not let Smith AI invent policy.
- Do not ask users for sensitive wallet secrets.
- Do not imply custody.
- Do not imply automatic execution.
- Do not overpromise support response or roadmap.
- Do not show fake FAQ results.
- Do not hide contact path.
- Do not mix canonical FAQ content with unverified generated content.

---

## Done Criteria

This pattern is implemented correctly when:

- Support nav item opens the Support page.
- Search input filters help content.
- FAQ sections render canonical content.
- Accordions expand and collapse accessibly.
- Contact Us opens a modal.
- Contact form validates email and description.
- Contact submission has success and error states.
- Contact form never asks for seed phrase or private key.
- Ask Smith AI can open on Support page.
- Smith AI explains but does not replace canonical FAQ content.
- No unsupported policy/pricing/wallet/protocol claims are invented.
- Support page works across desktop, tablet, and mobile.
- Accessibility requirements are met.
