/**
 * Support FAQ — canonical content (source of truth: content/support-faq-content.md).
 *
 * Questions and answers are transcribed VERBATIM from the approved FAQ content
 * (the recommended Content-ID set). The UI only renders this content; it never
 * generates, edits, or invents support answers. Supported wallet/protocol lists
 * match product metadata exactly. `tags` are search aids drawn from the file's
 * approved Search Keywords (not user-facing copy).
 */

/** A block of a FAQ answer: a paragraph, or a bulleted list (both verbatim). */
export type FaqBlock = string | { list: string[] };

export interface FaqItem {
  /** Stable content ID from content/support-faq-content.md (Content IDs). */
  id: string;
  question: string;
  answer: FaqBlock[];
  tags: string[];
}

export interface FaqCategory {
  id: string;
  title: string;
  items: FaqItem[];
}

export const SUPPORT_FAQ: FaqCategory[] = [
  {
    id: "getting_started",
    title: "Getting Started",
    items: [
      {
        id: "faq.getting_started.what_is_wealthsmith",
        question: "What is WealthSmith?",
        answer: [
          "WealthSmith helps users understand their crypto portfolio, goal progress, and suggested next actions.",
          "It combines portfolio data, goal inputs, and deterministic product logic to show insights such as Safety Buffer, Projected Growth, Current vs Recommended Allocation, and Smith AI Suggestions.",
          "WealthSmith is designed to explain what it shows and why.",
          "It does not automatically move funds or execute trades for users.",
        ],
        tags: ["wealthsmith", "portfolio", "suggestions", "smith ai"],
      },
      {
        id: "faq.getting_started.does_wealthsmith_trade",
        question: "Does WealthSmith make trades for me?",
        answer: [
          "No.",
          "In the MVP, WealthSmith shows suggestions and external protocol handoffs.",
          "When a suggestion has a protocol destination, WealthSmith opens the relevant protocol page in a new tab so you can review the action externally.",
          "WealthSmith does not execute trades, stake tokens, deposit funds, withdraw funds, or move assets for you.",
        ],
        tags: ["trade", "protocol", "suggestions"],
      },
    ],
  },
  {
    id: "wallet",
    title: "Wallet",
    items: [
      {
        id: "faq.wallet.why_connect",
        question: "Why connect a wallet?",
        answer: [
          "Connecting a wallet lets WealthSmith read supported balances and positions so it can personalize your Dashboard, Portfolio, and Suggestions.",
          "Your funds stay in your wallet.",
          "Wallet connection does not mean WealthSmith can move your funds.",
        ],
        tags: ["wallet", "connect wallet"],
      },
      {
        id: "faq.wallet.supported_wallets",
        question: "Which wallets are supported in MVP?",
        answer: [
          "Supported MVP wallets:",
          { list: ["Phantom", "Solflare", "Backpack"] },
        ],
        tags: ["wallet", "phantom", "solflare", "backpack"],
      },
      {
        id: "faq.wallet.read_only",
        question: "What does read-only wallet connection mean?",
        answer: [
          "Read-only means WealthSmith uses public wallet and supported protocol data to show your portfolio and suggestions.",
          "It does not give WealthSmith permission to move funds.",
          "It does not mean WealthSmith can trade, stake, deposit, withdraw, or rebalance for you.",
        ],
        tags: ["wallet", "read-only"],
      },
      {
        id: "faq.wallet.seed_phrase",
        question: "Does WealthSmith ask for my seed phrase or private key?",
        answer: [
          "No.",
          "WealthSmith will never ask for your seed phrase, private key, password, or wallet backup file.",
          "Never share these with anyone.",
          "If a support request asks for them, it is not a valid WealthSmith request.",
        ],
        tags: ["seed phrase", "private key", "wallet"],
      },
      {
        id: "faq.wallet.message_signing",
        question: "What is message signing?",
        answer: [
          "A message signature can be used to confirm wallet ownership.",
          "A message signature is not a transaction and should not move funds.",
          "If the product asks for a message signature, the UI should explain why.",
          "WealthSmith should avoid blocking basic read-only portfolio viewing when possible.",
        ],
        tags: ["message signing", "transaction signing", "wallet"],
      },
    ],
  },
  {
    id: "demo",
    title: "Demo Mode",
    items: [
      {
        id: "faq.demo.what_is_demo",
        question: "What is Demo Mode?",
        answer: [
          "Demo Mode lets you explore WealthSmith with sample data before connecting a wallet.",
          "It shows a sample portfolio, sample suggestions, and sample Smith AI explanations.",
          "Demo Mode does not use your real wallet data.",
        ],
        tags: ["demo mode", "try demo"],
      },
      {
        id: "faq.demo.personalized",
        question: "Is Demo Mode personalized?",
        answer: [
          "No.",
          "Demo Mode uses sample data.",
          "It is designed to show how WealthSmith works, not to give real wallet recommendations.",
        ],
        tags: ["demo mode"],
      },
      {
        id: "faq.demo.exit",
        question: "What happens when I exit Demo Mode?",
        answer: [
          "Exiting Demo Mode clears the sample portfolio, sample suggestions, demo Top Pick, and demo Smith AI context.",
          "You can then connect a wallet or start Demo Mode again.",
          "Exiting Demo Mode does not delete real wallet data or move funds.",
        ],
        tags: ["demo mode", "exit demo"],
      },
    ],
  },
  {
    id: "safety_buffer",
    title: "Safety Buffer",
    items: [
      {
        id: "faq.safety_buffer.what_is",
        question: "What is Safety Buffer?",
        answer: [
          "Safety Buffer is the stablecoin reserve WealthSmith uses to help prioritize protection before additional risk or yield opportunities.",
          "It compares available stablecoin reserves with the user’s target months of expenses.",
        ],
        tags: ["safety buffer"],
      },
      {
        id: "faq.safety_buffer.why_priority",
        question: "Why does WealthSmith prioritize Safety Buffer?",
        answer: [
          "WealthSmith prioritizes Safety Buffer because it represents the baseline reserve for the user’s plan.",
          "When the Safety Buffer is below target, WealthSmith may prioritize stablecoin reserve actions and lock additional yield or risk-taking suggestions until the buffer is funded.",
        ],
        tags: ["safety buffer"],
      },
    ],
  },
  {
    id: "suggestions",
    title: "Suggestions",
    items: [
      {
        id: "faq.suggestions.how_generated",
        question: "How are suggestions generated?",
        answer: [
          "Suggestions are generated by WealthSmith’s deterministic Suggestion Engine.",
          "The Suggestion Engine uses structured inputs such as goal settings, wallet data, portfolio composition, Safety Buffer status, token data, and protocol-related data.",
          "Smith AI explains suggestions, but it does not create them.",
        ],
        tags: ["suggestions", "smith ai"],
      },
      {
        id: "faq.suggestions.locked",
        question: "Why is a suggestion locked?",
        answer: [
          "A suggestion may be locked when another product rule has higher priority.",
          "For example, yield opportunities may be locked until your Safety Buffer is fully funded.",
          "Locked suggestions are not active recommendations.",
        ],
        tags: ["suggestions", "safety buffer"],
      },
    ],
  },
  {
    id: "top_pick",
    title: "Top Pick",
    items: [
      {
        id: "faq.top_pick.what_is",
        question: "What is Top Pick?",
        answer: [
          "Top Pick is the one actionable suggestion WealthSmith marks as the highest-priority next step for the current state.",
          "It is selected by deterministic Top Pick Logic.",
        ],
        tags: ["top pick"],
      },
      {
        id: "faq.top_pick.how_selected",
        question: "How is Top Pick selected?",
        answer: [
          "Top Pick is selected using product logic based on suggestion eligibility, priority category, impact, urgency, efficiency, and guardrails.",
          "Safety Buffer can override other priorities when it is underfunded.",
          "Smith AI does not select Top Pick.",
        ],
        tags: ["top pick", "safety buffer"],
      },
    ],
  },
  {
    id: "smith_ai",
    title: "Smith AI",
    items: [
      {
        id: "faq.smith_ai.what_is",
        question: "What is Smith AI?",
        answer: [
          "Smith AI is WealthSmith’s explanation and guidance assistant.",
          "It helps users understand dashboard data, suggestions, Top Pick, Safety Buffer, Demo Mode, wallet connection, and support topics.",
        ],
        tags: ["smith ai"],
      },
      {
        id: "faq.smith_ai.can_do",
        question: "What can Smith AI do?",
        answer: [
          "Smith AI can:",
          {
            list: [
              "Explain product concepts",
              "Explain suggestions",
              "Explain why a suggestion is Top Pick",
              "Explain locked states",
              "Explain wallet connection",
              "Explain Demo Mode",
              "Help with onboarding",
              "Help users understand Goal settings",
              "Summarize canonical FAQ answers",
              "Route users to Contact Us",
            ],
          },
        ],
        tags: ["smith ai"],
      },
      {
        id: "faq.smith_ai.cannot_do",
        question: "What can Smith AI not do?",
        answer: [
          "Smith AI cannot:",
          {
            list: [
              "Create recommendations",
              "Choose Top Pick",
              "Choose protocols",
              "Invent APY",
              "Invent estimated earnings",
              "Invent wallet balances",
              "Execute transactions",
              "Move funds",
              "Request wallet signatures from chat",
              "Hold funds",
              "Recover wallets",
              "Guarantee returns",
            ],
          },
        ],
        tags: ["smith ai"],
      },
    ],
  },
  {
    id: "portfolio",
    title: "Portfolio",
    items: [
      {
        id: "faq.portfolio.what_shows",
        question: "What does Portfolio show?",
        answer: [
          "Portfolio shows supported wallet and protocol positions.",
          "It may include:",
          {
            list: [
              "Balance Overview",
              "Crypto Assets Allocation",
              "Liquid Assets",
              "Staked Assets",
              "Yield Strategies",
              "Asset Deployment Overview",
            ],
          },
          "Exact sections depend on loaded wallet and protocol data.",
        ],
        tags: ["portfolio", "liquid assets", "staked assets", "yield strategies"],
      },
    ],
  },
  {
    id: "protocols",
    title: "Protocols",
    items: [
      {
        id: "faq.protocols.supported",
        question: "Which protocols are supported in MVP?",
        answer: [
          "Approved MVP protocol set:",
          {
            list: [
              "Hubble",
              "Jito",
              "Jupiter",
              "Kamino",
              "Marinade",
              "Meteora",
              "Ondo",
              "Orca",
              "Raydium",
              "Sanctum",
            ],
          },
        ],
        tags: ["protocol", "jupiter", "kamino", "jito", "marinade", "sanctum", "orca", "raydium", "meteora", "hubble", "ondo"],
      },
      {
        id: "faq.protocols.handoff",
        question: "What is a protocol handoff?",
        answer: [
          "A protocol handoff opens an approved external protocol page in a new tab so the user can review an action externally.",
          "It is not transaction execution.",
          "It does not move funds.",
          "It does not mark the suggestion complete.",
        ],
        tags: ["protocol", "handoff"],
      },
    ],
  },
  {
    id: "security",
    title: "Security",
    items: [
      {
        id: "faq.security.non_custodial",
        question: "Is WealthSmith custodial?",
        answer: [
          "No.",
          "WealthSmith is non-custodial.",
          "Your funds stay in your wallet.",
          "WealthSmith does not hold your crypto, seed phrase, private keys, or wallet backup files.",
        ],
        tags: ["security", "custody", "non-custodial", "seed phrase", "private key"],
      },
      {
        id: "faq.security.never_share",
        question: "What should I never share?",
        answer: [
          "Never share:",
          {
            list: [
              "Seed phrase",
              "Private key",
              "Wallet password",
              "Wallet backup file",
              "Recovery phrase",
            ],
          },
          "WealthSmith will never ask for these.",
        ],
        tags: ["security", "seed phrase", "private key"],
      },
    ],
  },
  {
    id: "contact",
    title: "Contact Us",
    items: [
      {
        id: "faq.contact.how_to",
        question: "How do I contact support?",
        answer: [
          "Use the Contact Us form in the Support page.",
          "Provide your email and a description of the issue.",
          "Do not include seed phrases, private keys, passwords, or wallet backup files.",
        ],
        tags: ["contact support"],
      },
    ],
  },
];

/** Flatten a FAQ answer to plain text for searching. */
function answerText(item: FaqItem): string {
  return item.answer
    .map((b) => (typeof b === "string" ? b : b.list.join(" ")))
    .join(" ");
}

/**
 * Local, case-insensitive filter over question + answer text + tags. Returns
 * categories with only their matching items (empty categories dropped). An empty
 * query returns the full FAQ. No results are ever invented.
 */
export function filterFaq(query: string): FaqCategory[] {
  const q = query.trim().toLowerCase();
  if (q === "") return SUPPORT_FAQ;
  return SUPPORT_FAQ.map((cat) => ({
    ...cat,
    items: cat.items.filter((item) => {
      const haystack = (
        item.question +
        " " +
        answerText(item) +
        " " +
        item.tags.join(" ")
      ).toLowerCase();
      return haystack.includes(q);
    }),
  })).filter((cat) => cat.items.length > 0);
}
