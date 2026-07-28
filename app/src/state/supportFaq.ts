/**
 * Support FAQ — canonical content (source of truth: content/support-faq-content.md).
 *
 * The UI only renders this content; it never generates, edits, or invents support
 * answers at runtime. Some entries are transcribed from the approved FAQ content and
 * others are prototype-authored to match product behavior. Supported wallet/protocol
 * lists match product metadata. `tags` are search aids (not user-facing copy).
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
          "In the MVP, WealthSmith shows suggestions and points you to the relevant external protocol.",
          "When a suggestion has a protocol destination, WealthSmith opens that protocol’s page in a new tab so you can review and complete the action there yourself.",
          "WealthSmith does not execute trades, stake tokens, deposit funds, withdraw funds, or move assets for you.",
        ],
        tags: ["trade", "protocol", "suggestions"],
      },
      {
        id: "faq.getting_started.blockchain_assets",
        question: "Which blockchain and assets does WealthSmith support?",
        answer: [
          "WealthSmith runs on Solana.",
          "It reads the assets in your connected Solana wallet: native SOL, recognized stablecoins (such as USDC and USDT), liquid staking tokens (such as mSOL and jitoSOL), and recognized DeFi positions like staking and lending.",
          "Values and yields are shown only when they can be sourced from an approved price or data feed; anything that cannot be verified is shown as “—” rather than an invented number.",
          "Support is limited to the assets and protocols WealthSmith recognizes in the MVP.",
        ],
        tags: ["solana", "assets", "sol", "stablecoins", "tokens", "blockchain"],
      },
      {
        id: "faq.getting_started.sustainable_plans",
        question: "How does WealthSmith ensure plans are sustainable?",
        answer: [
          "WealthSmith is Safety-Buffer-first: before suggesting any yield or investment action, it checks that you hold an adequate stablecoin reserve to cover your monthly expenses.",
          "Plans are built from your own inputs — income, expenses, contribution amount and frequency, risk tolerance, timeline, and goal — not from generic assumptions.",
          "Yield opportunities stay locked until your Safety Buffer is funded, so a plan never relies on deploying funds you may need for essentials.",
          "Every figure shown is sourced or deterministically derived from your inputs, so a plan reflects your real situation.",
        ],
        tags: ["sustainable", "safety buffer", "plan", "deterministic"],
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
    id: "goal",
    title: "Goal",
    items: [
      {
        id: "faq.goal.goal_based_planning",
        question: "What is Goal-Based Planning?",
        answer: [
          "Goal-Based Planning means your plan is built around a financial goal you choose, rather than generic advice.",
          "You set a goal, a risk tolerance, and a timeline, and provide cash-flow inputs such as income, expenses, and contributions.",
          "WealthSmith uses these to shape your Safety Buffer target, your recommended allocation, and your Projected Growth.",
          "The plan is designed to explain how each input affects what you see.",
        ],
        tags: ["goal", "planning", "risk", "timeline"],
      },
      {
        id: "faq.goal.goal_types",
        question: "What types of financial goals can I set?",
        answer: [
          "On the Goal page you can choose the goal that best matches your intent:",
          {
            list: [
              "Retire Early",
              "Build Long-Term Wealth",
              "Generate Passive Income",
              "Save For Big Purchase",
              "Not Sure Yet",
            ],
          },
          "Your goal, together with your risk tolerance and timeline, drives the recommended allocation and projections.",
          "You can update your goal at any time.",
        ],
        tags: ["goal", "retire", "passive income", "wealth"],
      },
      {
        id: "faq.goal.goal_influence",
        question: "How does my goal choice influence my portfolio?",
        answer: [
          "Your goal, risk tolerance, and timeline together determine your recommended crypto-vs-stablecoin allocation.",
          "A more conservative goal or lower risk tolerance shifts the target toward stablecoins; a growth-focused goal with a longer timeline allows more crypto exposure.",
          "The same inputs also shape your Safety Buffer target and your Projected Growth.",
          "WealthSmith shows your current mix against the recommendation so you can see the difference.",
        ],
        tags: ["goal", "allocation", "risk", "portfolio"],
      },
      {
        id: "faq.goal.change_goal",
        question: "What happens if I change my goal or timeline?",
        answer: [
          "Editing your goal, timeline, or cash-flow inputs updates your saved plan.",
          "Your Safety Buffer target, recommended allocation, and Projected Growth are recalculated from the new inputs.",
          "Nothing is moved or traded when you save — only what WealthSmith shows changes, never your wallet.",
          "You can review and change these settings on the Goal page whenever you like.",
        ],
        tags: ["goal", "timeline", "edit", "plan"],
      },
    ],
  },
  {
    id: "projected_growth",
    title: "Projected Growth",
    items: [
      {
        id: "faq.projected_growth.how_calculated",
        question: "How is my Projected Growth calculated and displayed?",
        answer: [
          "Projected Growth is a deterministic, modeled estimate — not a prediction or a guarantee.",
          "It starts from your current priced portfolio value and projects forward using your saved plan: contribution amount and frequency, timeline, and a growth rate mapped from your risk tolerance.",
          "It is displayed as a line chart over your selected timeline with milestone values; hovering a point shows the projected value and the gain from today.",
          "It appears only when the inputs can be sourced; without a plan or a priced value, it shows a subdued placeholder instead of invented numbers.",
        ],
        tags: ["projected growth", "projection", "chart", "estimate"],
      },
      {
        id: "faq.projected_growth.variables",
        question: "What variables affect the projected outcome?",
        answer: [
          "The projection is shaped by:",
          {
            list: [
              "Your starting portfolio value (from sourced prices)",
              "Your contribution amount and how often you contribute",
              "Your timeline (how far out the projection runs)",
              "Your risk tolerance, which maps to the modeled growth rate",
            ],
          },
          "Because it is modeled from these inputs, the same inputs always produce the same projection.",
          "It is an estimate to help planning; real results will differ.",
        ],
        tags: ["projected growth", "variables", "risk", "contributions"],
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
        id: "faq.suggestions.cost_effective",
        question: "How does the system ensure recommended actions are cost-effective?",
        answer: [
          "Before surfacing an action, WealthSmith compares eligible options and accounts for costs such as transaction fees and price impact.",
          "For swaps and rebalances it evaluates routes and only recommends an action when the benefit is clear after costs; if the lowest-cost option cannot be verified, it says so rather than guessing.",
          "Suggestions are sized to your situation, so it avoids actions too small to be worthwhile after fees.",
          "Every figure is sourced — no invented APY, fees, or savings.",
        ],
        tags: ["cost", "fees", "price impact", "swap", "suggestions"],
      },
      {
        id: "faq.suggestions.when_rebalance",
        question: "When does the system recommend rebalancing actions?",
        answer: [
          "WealthSmith compares your current allocation (crypto vs stablecoins, by value) with the recommended allocation derived from your risk tolerance, timeline, goal, cash flow, and the latest available market conditions.",
          "When your actual mix has drifted meaningfully from the target, it may suggest a rebalance to bring it back in line.",
          "Rebalancing is only suggested once foundational rules are satisfied — for example, your Safety Buffer must be funded first.",
          "It shows the current vs recommended values so you can see why.",
        ],
        tags: ["rebalance", "allocation", "drift", "suggestions"],
      },
      {
        id: "faq.suggestions.rebalance_token_selection",
        question: "How are tokens selected for selling or buying during rebalancing?",
        answer: [
          "Rebalancing works from the value gap between your current allocation and the recommended target.",
          "To reduce an over-weighted category it favors trimming the positions contributing most to that over-weight; to increase an under-weighted one it directs new contributions or reallocation toward it.",
          "It only acts on recognized, priced, verifiably transferable positions — never assets it cannot value or confirm.",
          "WealthSmith prepares and explains the action; it never executes the trade for you — you review and complete it yourself on the protocol’s own page.",
        ],
        tags: ["rebalance", "trim", "buy", "sell", "tokens"],
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
              "Explain why a suggestion is on hold",
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
        question: "What can’t Smith AI do?",
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
      {
        id: "faq.smith_ai.xai",
        question: "What is Explainable AI (XAI)?",
        answer: [
          "Explainable AI means the system can show the reasoning behind what it presents, not just an output.",
          "In WealthSmith, every insight — Safety Buffer, Projected Growth, allocation, and suggestions — comes with the inputs and logic that produced it.",
          "Smith AI’s role is to explain what you see and why, in plain language.",
          "It does not make decisions or hide its reasoning behind a black box.",
        ],
        tags: ["xai", "explainable", "transparency", "smith ai"],
      },
      {
        id: "faq.smith_ai.glass_box",
        question: "What is the “Glass Box” approach to AI?",
        answer: [
          "A “Glass Box” is the opposite of a “black box”: you can see inside it.",
          "WealthSmith’s insights are produced by deterministic product logic, and Smith AI explains each one using the same sourced data — so the reasoning is transparent and reproducible.",
          "The same inputs always produce the same result, which you can inspect.",
          "Nothing is invented, and no recommendation is generated by Smith AI itself.",
        ],
        tags: ["glass box", "black box", "transparency", "deterministic"],
      },
      {
        id: "faq.smith_ai.privacy",
        question: "Are conversations with Smith AI private?",
        answer: [
          "In this prototype, Smith AI answers from WealthSmith’s built-in help content and the data already on your screen.",
          "Conversations are not used to trade, move funds, or take any action on your behalf.",
          "Smith AI never asks for your seed phrase, private keys, or passwords, and WealthSmith stays non-custodial and read-only.",
          "As this is a prototype, avoid sharing sensitive personal information you would not want kept locally.",
        ],
        tags: ["privacy", "conversation", "smith ai", "security"],
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
        id: "faq.protocols.vetting",
        question: "How are yield protocols (staking/vaults) vetted?",
        answer: [
          "WealthSmith only surfaces yield options from protocols it has vetted, using sourced data — not marketing figures.",
          "Vetting considers factors such as the protocol’s track record and security posture, how withdrawable the position is, and whether current and trailing APY can be verified from approved feeds.",
          "Each candidate carries a reviewed risk score, and options that fall below the minimum bar are not recommended.",
          "APY, TVL, and risk inputs come from approved sources; anything that cannot be verified is excluded rather than estimated.",
        ],
        tags: ["vetting", "risk score", "apy", "staking", "vault", "protocol"],
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
        id: "faq.security.wallet_connection_security",
        question: "How does WealthSmith ensure my security since it connects to my wallet?",
        answer: [
          "The connection is read-only: WealthSmith uses public wallet and protocol data to show your portfolio and suggestions.",
          "It does not request transaction signatures just to view your portfolio, and it can never move your funds — you review and approve any action yourself on the protocol’s own page.",
          "WealthSmith will never ask for your seed phrase, private key, recovery phrase, wallet password, or backup file.",
        ],
        tags: ["security", "read-only", "non-custodial", "wallet", "connection"],
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
